#!/usr/bin/env node
/**
 * A5 step 3 — luotu-kentän migraatio (dry-run-first, idempotentti, REST-pohjainen)
 * ────────────────────────────────────────────────────────────────────────────
 * Konvertoi olemassa olevan datan luotu-kentät Timestampeiksi, jotta
 * orderBy('luotu')/where-kyselyt näkevät kaikki dokumentit. Heterogeeninen:
 *
 *   havainnot.luotu : ISO-string → Timestamp                       (puuttuva → skip, ei pvm-lähdettä)
 *   kehut.luotu     : ISO-string → Timestamp
 *   kirjaukset.luotu: PUUTTUVA → Timestamp(new Date(docId=pvm))    (tai ISO-string → Timestamp)
 *
 * Idempotentti: skippaa jo-Timestampit → turvallinen ajaa uudelleen.
 * collectionGroup (allDescendants) → kattaa kaikki alikokoelmat + seuratason.
 * Kirjoitus :commit-batcheissa ≤450 (Firestore-raja 500).
 *
 * AJO:
 *   Dry-run (oletus, EI kirjoita):   node scripts/migrate_luotu_a5.js
 *   Apply (KIRJOITTAA):              node scripts/migrate_luotu_a5.js --apply
 *
 * AUTENTIKOINTI: käyttää firebase CLI:n login-tokenia automaattisesti (sinä olet
 * jo `firebase login`:ssa). Skripti refreshaa access_tokenin ajamalla `firebase`
 * kerran. Ei service accountia eikä gcloud ADC:tä tarvita.
 *
 * ⚠ Aja DRY-RUN ensin. Aja --apply vasta kun luvut näyttävät oikeilta.
 *   Vasta migraation jälkeen Rules-vartija (step 4) on turvallista deployata.
 */
'use strict';
const https = require('https');
const os = require('os');
const path = require('path');
const { execSync } = require('child_process');

const PROJECT_ID = 'talentmaster-pilot';
const DRY_RUN = !process.argv.includes('--apply');
const BATCH_LIMIT = 450;
const BASE = `/v1/projects/${PROJECT_ID}/databases/(default)/documents`;

// ── Access token firebase CLI:n login-tokenista (refreshataan ajamalla firebase) ─
function haeAccessToken() {
  const ftPath = path.join(os.homedir(), '.config', 'configstore', 'firebase-tools.json');
  try { execSync('firebase projects:list', { stdio: 'ignore' }); } catch (_) { /* refresh best-effort */ }
  delete require.cache[require.resolve(ftPath)];
  const ft = require(ftPath);
  if (!ft.tokens || !ft.tokens.access_token) {
    throw new Error('Ei access_tokenia — aja ensin: firebase login');
  }
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

async function collectionGroupDocs(collectionId) {
  const rows = await api('POST', BASE + ':runQuery', {
    structuredQuery: { from: [{ collectionId, allDescendants: true }] },
  });
  return (rows || []).filter(x => x.document).map(x => x.document);
}

// ── Konversiosuunnitelma per dokumentti ─────────────────────────────────────
// Palauttaa { action:'convert'|'skip'|'error', tsIso?, syy? }
function isoLuotu(luotuField) {
  return luotuField && 'stringValue' in luotuField ? luotuField.stringValue : null;
}
function onTimestamp(luotuField) {
  return luotuField && 'timestampValue' in luotuField;
}
function suunnitteleIso(doc) {
  const f = (doc.fields || {}).luotu;
  if (onTimestamp(f)) return { action: 'skip', syy: 'jo-timestamp' };
  const s = isoLuotu(f);
  if (s != null) {
    const d = new Date(s);
    if (isNaN(d.getTime())) return { action: 'error', syy: 'virheellinen ISO: ' + s };
    return { action: 'convert', tsIso: d.toISOString() };
  }
  return { action: 'skip', syy: 'luotu puuttuu (ei pvm-lähdettä → ei migroida)' };
}
function suunnitteleKirjaus(doc) {
  const f = (doc.fields || {}).luotu;
  if (onTimestamp(f)) return { action: 'skip', syy: 'jo-timestamp' };
  const s = isoLuotu(f);
  if (s != null) {
    const d = new Date(s);
    if (isNaN(d.getTime())) return { action: 'error', syy: 'virheellinen ISO: ' + s };
    return { action: 'convert', tsIso: d.toISOString() };
  }
  // luotu puuttuu → backfill doc-ID:stä (pvm 'YYYY-MM-DD'), sama johto kuin writer-fix
  const docId = doc.name.split('/').pop();
  const d = new Date(docId);
  if (isNaN(d.getTime())) return { action: 'error', syy: 'doc-ID ei ole validi pvm: ' + docId };
  return { action: 'convert', tsIso: d.toISOString() };
}

async function commitBatch(writes) {
  await api('POST', BASE + ':commit', { writes });
}

async function migroi(collectionId, suunnittele) {
  console.log('\n── ' + collectionId + ' ──');
  const docs = await collectionGroupDocs(collectionId);
  const t = { skannattu: docs.length, konvertoi: 0, skip: 0, virhe: 0 };
  const naytteet = [];
  let writes = [];
  let commitit = 0;

  for (const doc of docs) {
    const p = suunnittele(doc);
    if (p.action === 'convert') {
      t.konvertoi++;
      if (naytteet.length < 4) naytteet.push(doc.name.split('/documents/').pop() + '  →  ' + p.tsIso);
      if (!DRY_RUN) {
        writes.push({
          update: { name: doc.name, fields: { luotu: { timestampValue: p.tsIso } } },
          updateMask: { fieldPaths: ['luotu'] },
          currentDocument: { exists: true },
        });
        if (writes.length >= BATCH_LIMIT) { await commitBatch(writes); commitit++; writes = []; }
      }
    } else if (p.action === 'error') {
      t.virhe++; console.warn('  ⚠ VIRHE  ' + doc.name.split('/documents/').pop() + ' : ' + p.syy);
    } else {
      t.skip++;
    }
  }
  if (!DRY_RUN && writes.length) { await commitBatch(writes); commitit++; }

  console.log('  skannattu=' + t.skannattu + '  konvertoi=' + t.konvertoi +
              '  skip=' + t.skip + '  virhe=' + t.virhe + (DRY_RUN ? '' : '  (commitit=' + commitit + ')'));
  if (naytteet.length) { console.log('  näytteet (max 4):'); naytteet.forEach(s => console.log('    ' + s)); }
  return t;
}

(async () => {
  console.log('═══ luotu-migraatio  ·  ' + (DRY_RUN ? 'DRY-RUN (ei kirjoita)' : 'APPLY (KIRJOITTAA)') +
              '  ·  projekti ' + PROJECT_ID + ' ═══');
  const tulokset = [];
  tulokset.push(await migroi('havainnot', suunnitteleIso));
  tulokset.push(await migroi('kehut', suunnitteleIso));
  tulokset.push(await migroi('kirjaukset', suunnitteleKirjaus));

  const yht = tulokset.reduce((a, t) => ({
    skannattu: a.skannattu + t.skannattu, konvertoi: a.konvertoi + t.konvertoi,
    skip: a.skip + t.skip, virhe: a.virhe + t.virhe,
  }), { skannattu: 0, konvertoi: 0, skip: 0, virhe: 0 });

  console.log('\n═══ YHTEENSÄ  skannattu=' + yht.skannattu + '  konvertoi=' + yht.konvertoi +
              '  skip=' + yht.skip + '  virhe=' + yht.virhe + ' ═══');
  if (DRY_RUN) console.log('DRY-RUN — mitään EI kirjoitettu. Aja sitten:  node scripts/migrate_luotu_a5.js --apply');
  else console.log('APPLY valmis. Aja dry-run uudelleen → konvertoi pitäisi olla 0 (idempotentti).');
  process.exit(yht.virhe > 0 ? 2 : 0);
})().catch((e) => { console.error('FATAL:', e && e.message ? e.message : e); process.exit(1); });
