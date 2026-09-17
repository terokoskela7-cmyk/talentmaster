#!/usr/bin/env node
/**
 * Vajaiden kayttaja-dokumenttien RAPORTTI (read-only — EI POISTA MITÄÄN)
 * ────────────────────────────────────────────────────────────────────────────
 * Pilottilöydös: henkilöstölistassa näkyi nimenä Firebase-UID. Näyttökorjaus (henkiloNimi /
 * _tmHenkiloNimi) piilottaa oireen, mutta VAJAA DOKUMENTTI JÄÄ. Tämä raportoi ne.
 *
 * ⚠ TÄMÄ EI POISTA EIKÄ MUOKKAA. Sokkopoisto voisi viedä kesken olevan kutsun tai oikean
 * käyttäjän jolta vain puuttuu profiilikenttiä. Raportti → ihmiskatselmus → vasta sitten toimi.
 *
 * SORMENJÄLKI: raportti listaa MITKÄ kentät dokumentilla ON. Se kertoo kirjoittajan:
 *   · email+etunimi+sukunimi+rooli+claimsAsetettu  → normaali kutsu (Seura.html luoKayttaja-flow)
 *   · VAIN claimsAsetettu                          → luoKayttaja-CF:n claims-merge ilman
 *                                                    client-kirjoitusta (functions/index.js ~611)
 *   · etunimi/sukunimi/puhelin/joukkueet, EI email → henkilön muokkaus set(merge) dokille jota
 *                                                    ei ollut (Seura.html hallitseHenkilo)
 *   · muu                                          → tuntematon polku, tutki erikseen
 *
 * AJO (kaikki seurat):        node scripts/raportoi_vajaat_kayttajat.js
 *     (yksi seura):           node scripts/raportoi_vajaat_kayttajat.js --seura=kpv
 *     (emulaattoria vasten):  FIRESTORE_EMULATOR_HOST=localhost:8080 node scripts/...
 *
 * AUTENTIKOINTI: firebase CLI:n login-token (sama kuvio kuin migrate_luotu_a5.js).
 * TIETOSUOJA: tulostaa doc-id:n ja KENTTIEN NIMET, ei kenttien arvoja — paitsi rooli/aktiivinen,
 * jotka tarvitaan katselmukseen. Sähköpostia tai nimeä ei tulosteta.
 */
const https = require('https');
const http = require('http');
const path = require('path');
const os = require('os');
const { execSync } = require('child_process');

const PROJECT_ID = 'talentmaster-pilot';
const EMU = process.env.FIRESTORE_EMULATOR_HOST || null;
const BASE = `/v1/projects/${PROJECT_ID}/databases/(default)/documents`;
const VAIN_SEURA = (process.argv.find((a) => a.startsWith('--seura=')) || '').split('=')[1] || null;

function haeAccessToken() {
  if (EMU) return 'owner';
  const ftPath = path.join(os.homedir(), '.config', 'configstore', 'firebase-tools.json');
  try { execSync('firebase projects:list', { stdio: 'ignore' }); } catch (_) { /* refresh best-effort */ }
  delete require.cache[require.resolve(ftPath)];
  const ft = require(ftPath);
  if (!ft.tokens || !ft.tokens.access_token) throw new Error('Ei access_tokenia — aja ensin: firebase login');
  return ft.tokens.access_token;
}
function api(method, urlPath) {
  const AT = api._at || (api._at = haeAccessToken());
  return new Promise((res, rej) => {
    const [h, p2] = (EMU || '').split(':');
    const opts = EMU
      ? { method, hostname: h, port: Number(p2), path: urlPath, headers: { Authorization: 'Bearer owner' } }
      : { method, hostname: 'firestore.googleapis.com', path: urlPath, headers: { Authorization: 'Bearer ' + AT } };
    const mod = EMU ? http : https;
    const r = mod.request(opts, (resp) => {
      let d = ''; resp.on('data', (c) => d += c);
      resp.on('end', () => {
        let j; try { j = JSON.parse(d); } catch (e) { return rej(new Error(d.slice(0, 300))); }
        if (resp.statusCode >= 400) return rej(new Error(resp.statusCode + ' ' + JSON.stringify(j.error || j).slice(0, 200)));
        res(j);
      });
    });
    r.on('error', rej); r.end();
  });
}
const arvo = (v) => (v && ('stringValue' in v ? v.stringValue
  : 'booleanValue' in v ? v.booleanValue
  : 'integerValue' in v ? Number(v.integerValue) : undefined));

/* VAJAA = ei sähköpostia JA ei roolia. Kumpikin yksin voi olla laillinen (rooliton odottaja,
   tai rooli ilman profiilia), mutta molempien puuttuessa rivi ei kerro kenestä on kyse —
   juuri se tila joka näkyi UID:na. */
function onVajaa(f) {
  return !arvo(f.email) && !arvo(f.rooli);
}
function sormenjalki(kentat) {
  const on = (k) => kentat.indexOf(k) >= 0;
  if (on('email') && on('rooli') && on('claimsAsetettu')) return 'normaali kutsu (täysi)';
  if (kentat.length <= 2 && on('claimsAsetettu')) return 'luoKayttaja-CF claims-merge ilman client-kirjoitusta';
  if ((on('etunimi') || on('puhelin') || on('joukkueet')) && !on('email')) return 'henkilön muokkaus set(merge) dokille jota ei ollut';
  return 'tuntematon polku — tutki';
}

async function main() {
  console.log('\n═══  VAJAAT kayttaja-DOKUMENTIT  ·  projekti ' + PROJECT_ID
    + (EMU ? '  ·  EMULAATTORI' : '') + '  ═══');
  console.log('    READ-ONLY — tämä skripti ei poista eikä muokkaa mitään.\n');

  const seurat = VAIN_SEURA ? [VAIN_SEURA]
    : ((await api('GET', BASE + '/seurat?pageSize=300')).documents || []).map((d) => d.name.split('/').pop());
  let vajaita = 0, yhteensa = 0;

  for (const sid of seurat) {
    let docs = [];
    try { docs = (await api('GET', BASE + '/seurat/' + encodeURIComponent(sid) + '/kayttajat?pageSize=300')).documents || []; }
    catch (e) { console.log('  ' + sid + ': (ei luettavissa — ' + e.message.slice(0, 60) + ')'); continue; }
    yhteensa += docs.length;
    const vajaat = docs.filter((d) => onVajaa(d.fields || {}));
    if (!vajaat.length) { console.log('  ✓ ' + sid + ': ' + docs.length + ' käyttäjää, ei vajaita'); continue; }
    console.log('\n  ⚠ ' + sid + ': ' + vajaat.length + ' / ' + docs.length + ' vajaata');
    vajaat.forEach((d) => {
      const kentat = Object.keys(d.fields || {}).sort();
      vajaita++;
      console.log('     · ' + d.name.split('/').pop());
      console.log('       kentät:      ' + (kentat.join(', ') || '(ei yhtään)'));
      console.log('       aktiivinen:  ' + String(arvo((d.fields || {}).aktiivinen)));
      console.log('       sormenjälki: ' + sormenjalki(kentat));
    });
  }

  console.log('\n═══  ' + vajaita + ' vajaata / ' + yhteensa + ' käyttäjädokumenttia  ═══');
  if (vajaita) {
    console.log('\n  Seuraavat askeleet (IHMISKATSELMUS, ei automaatio):');
    console.log('   1. Tunnista sormenjäljestä mikä polku dokumentin loi.');
    console.log('   2. Jos kyseessä on kesken jäänyt kutsu → viimeistele tai poista Seura-näkymästä.');
    console.log('   3. Jos polku luo vajaita dokumentteja toistuvasti → korjaa se polku.\n');
  } else {
    console.log('     Ei toimenpiteitä.\n');
  }
}
main().catch((e) => { console.error('\n❌ ' + e.message); process.exit(1); });
