#!/usr/bin/env node
/**
 * RAE-pikakentän backfill — syntymäkvartaali (rae_kvartaali) pelaajadokumentteihin.
 * ────────────────────────────────────────────────────────────────────────────
 * Per pilottiseura: pelaajat joilla on `syntymaaika` mutta puuttuu/tyhjä
 * `rae_kvartaali` → laske kanoninen raeKvartaali(syntymaaika) (lib, Q1 tammi–maalis
 * … Q4 loka–joulu) → kirjoita rae_kvartaali-pikakenttä merge-setillä (updateMask).
 *
 * Idempotentti: jo asetetut (ei-tyhjä rae_kvartaali) skipataan → turvallinen ajaa
 * uudelleen (apply jälkeen "päivitettäisiin" pitäisi olla 0). EI muuta mitään muuta
 * kenttää (updateMask:['rae_kvartaali']).
 *
 * AJO:
 *   Dry-run (oletus, EI kirjoita):   node scripts/backfill_rae.js
 *   Apply (KIRJOITTAA):              node scripts/backfill_rae.js --apply
 *
 * AUTENTIKOINTI: firebase CLI:n login-token (sama kuin migrate_luotu_a5.js).
 * ⚠ Aja DRY-RUN ensin ja kuittauta luvut ennen --apply:tä.
 */
'use strict';
const https = require('https');
const os = require('os');
const path = require('path');
const { execSync } = require('child_process');
const { raeKvartaali } = require('../lib/tm_eerikkila_normit.js');

const PROJECT_ID = 'talentmaster-pilot';
const SEURAT = ['sjk', 'sibbovargarna', 'grifk', 'palloiirot', 'kpv'];
const DRY_RUN = !process.argv.includes('--apply');
const BATCH_LIMIT = 450;
const BASE = `/v1/projects/${PROJECT_ID}/databases/(default)/documents`;

// ── Access token firebase CLI:n login-tokenista (refresh best-effort) ─
function haeAccessToken() {
  const ftPath = path.join(os.homedir(), '.config', 'configstore', 'firebase-tools.json');
  try { execSync('firebase projects:list', { stdio: 'ignore' }); } catch (_) { /* refresh best-effort */ }
  delete require.cache[require.resolve(ftPath)];
  const ft = require(ftPath);
  if (!ft.tokens || !ft.tokens.access_token) throw new Error('Ei access_tokenia — aja ensin: firebase login');
  if (ft.tokens.expires_at && ft.tokens.expires_at < Date.now() + 60000) {
    console.warn('⚠ access_token vanhenemassa — aja `firebase login:list` ja yritä uudelleen.');
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

// Pelaajat yhden seuran alikokoelmasta (runQuery parent = seurat/{seuraId})
async function pelaajatSeurasta(seuraId) {
  const rows = await api('POST', BASE + '/seurat/' + seuraId + ':runQuery', {
    structuredQuery: { from: [{ collectionId: 'pelaajat' }] },
  });
  return (rows || []).filter(x => x.document).map(x => x.document);
}

// REST-fieldin arvo merkkijonona (stringValue tai timestampValue ISO). Muu → null.
function strVal(f) {
  if (!f) return null;
  if ('stringValue' in f) return f.stringValue;
  if ('timestampValue' in f) return f.timestampValue;
  return null;
}

async function commitBatch(writes) { await api('POST', BASE + ':commit', { writes }); }

async function backfillSeura(seuraId) {
  const docs = await pelaajatSeurasta(seuraId);
  const t = { skannattu: docs.length, paivita: 0, joOk: 0, eiSynt: 0, virhe: 0 };
  const naytteet = [];
  let writes = [], commitit = 0;

  for (const doc of docs) {
    const fields = doc.fields || {};
    const synt = strVal(fields.syntymaaika);
    const rae = strVal(fields.rae_kvartaali);
    if (rae && rae.trim()) { t.joOk++; continue; }            // jo asetettu → idempotentti skip
    if (!synt) { t.eiSynt++; continue; }                       // ei syntymäaikaa
    const q = raeKvartaali(synt);
    if (!q) { t.virhe++; console.warn('  ⚠ virheellinen syntymaaika  ' + doc.name.split('/documents/').pop() + ' : ' + synt); continue; }
    t.paivita++;
    if (naytteet.length < 4) naytteet.push(doc.name.split('/').pop() + '  ' + synt + ' → ' + q);
    if (!DRY_RUN) {
      writes.push({
        update: { name: doc.name, fields: { rae_kvartaali: { stringValue: q } } },
        updateMask: { fieldPaths: ['rae_kvartaali'] },
        currentDocument: { exists: true },
      });
      if (writes.length >= BATCH_LIMIT) { await commitBatch(writes); commitit++; writes = []; }
    }
  }
  if (!DRY_RUN && writes.length) { await commitBatch(writes); commitit++; }

  console.log('\n── ' + seuraId + ' ──');
  console.log('  pelaajia=' + t.skannattu + '  ·  päivitettäisiin=' + t.paivita + '  ·  jo OK=' + t.joOk +
              '  ·  ei syntymäaikaa=' + t.eiSynt + (t.virhe ? '  ·  virheellinen pvm=' + t.virhe : '') +
              (DRY_RUN ? '' : '  (commitit=' + commitit + ')'));
  if (naytteet.length) { console.log('  näytteet (max 4):'); naytteet.forEach(s => console.log('    ' + s)); }
  return t;
}

(async () => {
  console.log('═══ RAE-backfill (rae_kvartaali)  ·  ' + (DRY_RUN ? 'DRY-RUN (ei kirjoita)' : 'APPLY (KIRJOITTAA)') +
              '  ·  projekti ' + PROJECT_ID + ' ═══');
  const tulokset = [];
  for (const s of SEURAT) {
    try { tulokset.push(await backfillSeura(s)); }
    catch (e) { console.warn('\n── ' + s + ' ──\n  ⚠ ohitettu: ' + (e && e.message ? e.message : e)); }
  }
  const yht = tulokset.reduce((a, t) => ({
    skannattu: a.skannattu + t.skannattu, paivita: a.paivita + t.paivita,
    joOk: a.joOk + t.joOk, eiSynt: a.eiSynt + t.eiSynt, virhe: a.virhe + t.virhe,
  }), { skannattu: 0, paivita: 0, joOk: 0, eiSynt: 0, virhe: 0 });

  console.log('\n═══ YHTEENSÄ  pelaajia=' + yht.skannattu + '  ·  päivitettäisiin=' + yht.paivita +
              '  ·  jo OK=' + yht.joOk + '  ·  ei syntymäaikaa=' + yht.eiSynt +
              (yht.virhe ? '  ·  virheellinen pvm=' + yht.virhe : '') + ' ═══');
  if (DRY_RUN) console.log('DRY-RUN — mitään EI kirjoitettu. Kuittauta luvut, sitten:  node scripts/backfill_rae.js --apply');
  else console.log('APPLY valmis. Aja dry-run uudelleen → päivitettäisiin pitäisi olla 0 (idempotentti).');
  process.exit(yht.virhe > 0 ? 2 : 0);
})().catch((e) => { console.error('FATAL:', e && e.message ? e.message : e); process.exit(1); });
