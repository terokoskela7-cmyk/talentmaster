#!/usr/bin/env node
/**
 * PIN-törmäystarkistus (READ-ONLY — ei kirjoita mitään)
 * ────────────────────────────────────────────────────────────────────────────
 * Tausta: Pelaaja_v7 `_kirjauduPinilla` hakee PINin kiinteässä seurajärjestyksessä
 *   SEURAT = ['kpv','fcl','palloiirot','yvies','sjk','grifk','vifk']
 * ja ottaa ENSIMMÄISEN osuman (`where('pin','==',pin).limit(1)`, seura kerrallaan).
 * `vahvistaSuostumus`-CF generoi PINin uniikiksi VAIN seuran sisällä → cross-club-
 * törmäys on mahdollinen. Tällöin myöhemmän seuran lapsi kirjautuu omalla oikealla
 * PINillään aiemmin tarkistetun seuran pelaajaan.
 *
 * Tämä skripti:
 *   1. Lukee jokaisen pilottiseuran pelaajien PINit.
 *   2. Etsii (a) seuran sisäiset duplikaatit, (b) cross-club-törmäykset.
 *   3. Mallintaa loginin ratkaisun (voittaja = pienin SEURAT-indeksi) ja listaa
 *      "varjoon jäävät" pelaajat — erityisesti SJK-lapset jotka reitittyvät pois.
 *
 * AJO:  node scripts/check_pin_collisions.js
 * AUTENTIKOINTI: firebase CLI:n login-token (kuten migrate_luotu_a5.js).
 */
'use strict';
const https = require('https');
const os = require('os');
const path = require('path');
const { execSync } = require('child_process');

const PROJECT_ID = 'talentmaster-pilot';
const BASE = `/v1/projects/${PROJECT_ID}/databases/(default)/documents`;

// Loginin tarkistusjärjestys (Pelaaja_v7:3213) — indeksi ratkaisee voittajan.
const SEURAT = ['kpv', 'fcl', 'palloiirot', 'yvies', 'sjk', 'grifk', 'vifk'];
// Lisäseurat jotka EIVÄT ole loginin listalla (törmäys niihin ei vaikuta reititykseen,
// mutta raportoidaan tiedoksi — login ei löydä näiden pelaajia lainkaan).
const LISASEURAT = ['hjk', 'sibbovargarna', 'eps'];

function haeAccessToken() {
  const ftPath = path.join(os.homedir(), '.config', 'configstore', 'firebase-tools.json');
  try { execSync('firebase projects:list', { stdio: 'ignore' }); } catch (_) { /* refresh best-effort */ }
  delete require.cache[require.resolve(ftPath)];
  const ft = require(ftPath);
  if (!ft.tokens || !ft.tokens.access_token) {
    throw new Error('Ei access_tokenia — aja ensin: firebase login');
  }
  return ft.tokens.access_token;
}
const AT = haeAccessToken();

function api(method, urlPath, body) {
  return new Promise((res, rej) => {
    const payload = body ? JSON.stringify(body) : null;
    const opts = {
      method, hostname: 'firestore.googleapis.com', path: urlPath,
      headers: { 'Authorization': 'Bearer ' + AT, 'Content-Type': 'application/json' },
    };
    if (payload) opts.headers['Content-Length'] = Buffer.byteLength(payload);
    const r = https.request(opts, (resp) => {
      let d = ''; resp.on('data', c => d += c);
      resp.on('end', () => {
        let j; try { j = JSON.parse(d); } catch (e) { return rej(new Error(d.slice(0, 300))); }
        if (resp.statusCode >= 400) return rej(new Error(resp.statusCode + ' ' + JSON.stringify(j.error || j).slice(0, 300)));
        res(j);
      });
    });
    r.on('error', rej);
    if (payload) r.write(payload);
    r.end();
  });
}

// Lue seuran pelaajat (vain tarvittavat kentät). Palauttaa [{id, pin, nimi, joukkue}].
async function lueSeuranPelaajat(seura) {
  const rows = await api('POST', `${BASE}/seurat/${seura}:runQuery`, {
    structuredQuery: {
      from: [{ collectionId: 'pelaajat' }],
      select: { fields: ['pin', 'etunimi', 'sukunimi', 'joukkue'].map(f => ({ fieldPath: f })) },
    },
  });
  return (rows || []).filter(x => x.document).map(x => {
    const f = x.document.fields || {};
    const s = (k) => (f[k] && (f[k].stringValue ?? f[k].integerValue)) || '';
    const pinRaw = f.pin ? (f.pin.stringValue ?? f.pin.integerValue) : null;
    return {
      id: x.document.name.split('/').pop(),
      pin: pinRaw != null ? String(pinRaw) : null,
      nimi: ((s('etunimi') + ' ' + s('sukunimi')).trim()) || '(nimetön)',
      joukkue: s('joukkue'),
    };
  });
}

(async () => {
  console.log('PIN-törmäystarkistus · projekti', PROJECT_ID, '· READ-ONLY\n');

  const kaikki = {}; // seura -> [pelaaja]
  for (const seura of [...SEURAT, ...LISASEURAT]) {
    try {
      kaikki[seura] = await lueSeuranPelaajat(seura);
    } catch (e) {
      console.warn(`  ⚠ ${seura}: lukeminen epäonnistui (${e.message.slice(0, 80)})`);
      kaikki[seura] = [];
    }
  }

  // Yhteenveto + PIN-kattavuus
  console.log('── Seurakohtainen kattavuus ──');
  for (const seura of [...SEURAT, ...LISASEURAT]) {
    const arr = kaikki[seura] || [];
    const withPin = arr.filter(p => /^\d{4}$/.test(p.pin || ''));
    const loginIdx = SEURAT.indexOf(seura);
    const tag = loginIdx >= 0 ? `login#${loginIdx}` : 'EI loginissa';
    console.log(`  ${seura.padEnd(14)} ${String(arr.length).padStart(3)} pelaajaa · ${String(withPin.length).padStart(3)} PINillä · ${tag}`);
  }

  // ── 1. Seuran sisäiset duplikaatit ──
  console.log('\n── 1. Seuran sisäiset PIN-duplikaatit (CF:n pitäisi estää) ──');
  let sisaisia = 0;
  for (const seura of [...SEURAT, ...LISASEURAT]) {
    const byPin = {};
    for (const p of (kaikki[seura] || [])) {
      if (!/^\d{4}$/.test(p.pin || '')) continue;
      (byPin[p.pin] = byPin[p.pin] || []).push(p);
    }
    for (const [pin, ps] of Object.entries(byPin)) {
      if (ps.length > 1) {
        sisaisia++;
        console.log(`  ⚠ ${seura} PIN ${pin}: ${ps.map(p => `${p.nimi} [${p.joukkue}]`).join('  ·  ')}`);
      }
    }
  }
  if (!sisaisia) console.log('  ✓ Ei seuran sisäisiä duplikaatteja.');

  // ── 2. Cross-club-törmäykset + login-reititys ──
  console.log('\n── 2. Cross-club-törmäykset (login ratkaisee seurajärjestyksessä) ──');
  const pinMap = {}; // pin -> [{seura, idx, ...pelaaja}]
  for (const seura of SEURAT) {
    const idx = SEURAT.indexOf(seura);
    for (const p of (kaikki[seura] || [])) {
      if (!/^\d{4}$/.test(p.pin || '')) continue;
      (pinMap[p.pin] = pinMap[p.pin] || []).push({ seura, idx, ...p });
    }
  }

  const sjkVarjossa = []; // SJK-lapset jotka reitittyvät pois omasta profiilistaan
  const muutVarjossa = [];
  let crossPineja = 0;

  for (const [pin, holders] of Object.entries(pinMap)) {
    const seurat = new Set(holders.map(h => h.seura));
    if (seurat.size < 2) continue; // törmäys vain jos ≥2 eri seuraa
    crossPineja++;
    holders.sort((a, b) => a.idx - b.idx);
    const voittaja = holders[0];
    const havitut = holders.slice(1);
    console.log(`\n  PIN ${pin}:`);
    console.log(`    ✅ LOGIN VIE → ${voittaja.seura.toUpperCase()} · ${voittaja.nimi} [${voittaja.joukkue}]`);
    for (const h of havitut) {
      console.log(`    ❌ varjoon  → ${h.seura.toUpperCase()} · ${h.nimi} [${h.joukkue}]  (ei pääse omaan profiiliinsa)`);
      const rec = { pin, ...h, vieMihin: voittaja };
      if (h.seura === 'sjk') sjkVarjossa.push(rec); else muutVarjossa.push(rec);
    }
  }
  if (!crossPineja) console.log('  ✓ Ei cross-club-törmäyksiä loginin seurojen kesken.');

  // ── 3. Loppupäätelmä — SJK-fokus ──
  console.log('\n════════════════════════════════════════════════════════════');
  console.log('YHTEENVETO');
  console.log('════════════════════════════════════════════════════════════');
  console.log(`  Seuran sisäiset duplikaatit : ${sisaisia}`);
  console.log(`  Cross-club-törmäys-PINit    : ${crossPineja}`);
  console.log(`  SJK-lapsia varjossa         : ${sjkVarjossa.length}  ← KRIITTINEN (oma PIN vie väärään seuraan)`);
  console.log(`  Muita seuroja varjossa      : ${muutVarjossa.length}`);
  if (sjkVarjossa.length) {
    console.log('\n  🔴 KORJATTAVAT SJK-PELAAJAT (PIN vaihdettava):');
    for (const r of sjkVarjossa) {
      console.log(`     • ${r.nimi} [${r.joukkue}] · PIN ${r.pin} · vie tällä hetkellä → ${r.vieMihin.seura.toUpperCase()}/${r.vieMihin.nimi}`);
    }
  }
  console.log('');
})().catch(e => { console.error('VIRHE:', e.message); process.exit(1); });
