#!/usr/bin/env node
/**
 * huoltajaEmail → lowercase -migraatio (dry-run-first, idempotentti).
 * Firebase Auth -tokenin email on aina lowercase. CF haeLapsiHuoltajalle tekee
 * exact-match-kyselyn (where huoltajaEmail == email) → vaatii että tallennettu
 * huoltajaEmail on myös lowercase. Tämä normalisoi mixed-case-arvot.
 * (Linkin kautta tultaessa Rules lower-casaa molemmat → tämä koskee vain email-loginia.)
 *
 *   Dry-run:  node scripts/migrate_huoltajaEmail_lc.js
 *   Apply:    node scripts/migrate_huoltajaEmail_lc.js --apply
 *
 * Auth: firebase login -token (refreshataan ajamalla firebase).
 */
'use strict';
const https = require('https');
const os = require('os');
const path = require('path');
const { execSync } = require('child_process');

const PROJECT_ID = 'talentmaster-pilot';
const DRY_RUN = !process.argv.includes('--apply');
const BASE = `/v1/projects/${PROJECT_ID}/databases/(default)/documents`;

function token() {
  const ftPath = path.join(os.homedir(), '.config', 'configstore', 'firebase-tools.json');
  try { execSync('firebase projects:list', { stdio: 'ignore' }); } catch (_) {}
  delete require.cache[require.resolve(ftPath)];
  return require(ftPath).tokens.access_token;
}
const AT = token();

function api(method, urlPath, body) {
  return new Promise((res, rej) => {
    const payload = body ? JSON.stringify(body) : null;
    const opts = { method, hostname: 'firestore.googleapis.com', path: urlPath,
      headers: { Authorization: 'Bearer ' + AT, 'Content-Type': 'application/json' } };
    if (payload) opts.headers['Content-Length'] = Buffer.byteLength(payload);
    const r = https.request(opts, (resp) => { let d = ''; resp.on('data', c => d += c);
      resp.on('end', () => { let j; try { j = JSON.parse(d); } catch (e) { return rej(new Error(d.slice(0, 200))); }
        if (resp.statusCode >= 400) return rej(new Error(resp.statusCode + ' ' + JSON.stringify(j.error || j).slice(0, 200)));
        res(j); }); });
    r.on('error', rej); if (payload) r.write(payload); r.end();
  });
}

(async () => {
  console.log('═══ huoltajaEmail→lowercase  ·  ' + (DRY_RUN ? 'DRY-RUN' : 'APPLY') + '  ·  ' + PROJECT_ID + ' ═══');
  const rows = await api('POST', BASE + ':runQuery', {
    structuredQuery: { from: [{ collectionId: 'pelaajat', allDescendants: true }] },
  });
  const docs = (rows || []).filter(x => x.document).map(x => x.document);
  let muutettavia = 0, virhe = 0; const naytteet = [];
  let writes = [];
  async function commit() { if (writes.length) { await api('POST', BASE + ':commit', { writes }); writes = []; } }

  for (const doc of docs) {
    const f = (doc.fields || {}).huoltajaEmail;
    const e = f && f.stringValue;
    if (!e) continue;
    const lc = e.toLowerCase();
    if (lc === e) continue;            // jo lowercase → skip (idempotentti)
    muutettavia++;
    if (naytteet.length < 6) naytteet.push(e + '  →  ' + lc);
    if (!DRY_RUN) {
      writes.push({ update: { name: doc.name, fields: { huoltajaEmail: { stringValue: lc } } },
        updateMask: { fieldPaths: ['huoltajaEmail'] }, currentDocument: { exists: true } });
      if (writes.length >= 450) await commit();
    }
  }
  if (!DRY_RUN) await commit();

  console.log('skannattu=' + docs.length + '  muutettavia=' + muutettavia + '  virhe=' + virhe);
  if (naytteet.length) { console.log('näytteet:'); naytteet.forEach(s => console.log('  ' + s)); }
  console.log(DRY_RUN ? 'DRY-RUN — ei kirjoitettu. Aja --apply.' : 'APPLY valmis.');
})().catch(e => { console.error('FATAL:', e.message); process.exit(1); });
