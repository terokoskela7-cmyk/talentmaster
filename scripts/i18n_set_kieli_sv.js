#!/usr/bin/env node
/**
 * i18n V0 — aseta seurat/{id}.kieli = 'sv' ruotsinkielisille seuroille (data-fix, §11 kielivalinta-lähde).
 *
 * IDEMPOTENTTI: hakee doc → jos kieli jo 'sv', ohittaa; muuten PATCH updateMask=['kieli'] (ei kosketa muihin kenttiin).
 * Uudet ruotsiseurat → lisää RUOTSISEURAT-listaan. Sama skripti palvelee tulevat sv-seurat.
 *
 * Ajo (kuivaajo oletus, listaa muutokset):   node scripts/i18n_set_kieli_sv.js
 * Kirjoitus:                                  node scripts/i18n_set_kieli_sv.js --apply
 * Auth: firebase CLI login-token (sama kuvio kuin scripts/backfill_rae.js). Aja tarvittaessa: firebase login
 */
const https = require('https');
const os = require('os');
const path = require('path');
const { execSync } = require('child_process');

const PROJECT_ID = 'talentmaster-pilot';
const RUOTSISEURAT = ['sibbovargarna', 'vifk', 'grifk', 'eif'];
const DRY_RUN = !process.argv.includes('--apply');
const BASE = `/v1/projects/${PROJECT_ID}/databases/(default)/documents`;

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

async function nykyKieli(seuraId) {
  try {
    const doc = await api('GET', BASE + '/seurat/' + seuraId);
    const f = (doc.fields && doc.fields.kieli) || null;
    return f && 'stringValue' in f ? f.stringValue : null;
  } catch (e) {
    if (String(e.message).startsWith('404')) return '__PUUTTUU__';   // seuradoc ei löytynyt
    throw e;
  }
}

// V4-A3 reitti 1: kieli denormalisoidaan pelaajadokeille (Pelaaja anon + Vanhempi huoltaja lukevat
// pelaajadokin, EIVÄT seuradokia — rules onOmaSeura). Listaa seuran pelaajat (sivutus) → kieli-kenttä.
async function listaaPelaajat(seuraId) {
  const docs = [];
  let pageToken = null;
  do {
    const q = 'pageSize=300' + (pageToken ? '&pageToken=' + encodeURIComponent(pageToken) : '');
    const r = await api('GET', BASE + '/seurat/' + seuraId + '/pelaajat?' + q);
    (r.documents || []).forEach((d) => docs.push(d));
    pageToken = r.nextPageToken || null;
  } while (pageToken);
  return docs;
}

// Idempotentti: kirjoittaa kieli='sv' vain niille pelaajadokeille joissa ei ole jo 'sv'. Ei kosketa muihin kenttiin.
async function asetaPelaajienKieli(seuraId, kieli, t) {
  const pelaajat = await listaaPelaajat(seuraId);
  let asetettu = 0, joOk = 0;
  for (const d of pelaajat) {
    const nyt = (d.fields && d.fields.kieli && 'stringValue' in d.fields.kieli) ? d.fields.kieli.stringValue : null;
    if (nyt === kieli) { joOk++; continue; }
    if (!DRY_RUN) {
      const pid = d.name.split('/').pop();
      await api('PATCH', BASE + '/seurat/' + seuraId + '/pelaajat/' + pid + '?updateMask.fieldPaths=kieli',
        { fields: { kieli: { stringValue: kieli } } });
    }
    asetettu++;
  }
  t.pelaajaAsetettu += asetettu; t.pelaajaJoOk += joOk;
  console.log(`     pelaajat: ${DRY_RUN ? 'asetettaisiin' : 'asetettu'} ${asetettu} · jo-ok ${joOk} (yht ${pelaajat.length})`);
}

(async () => {
  console.log(`i18n kieli='sv' -migraatio · projekti ${PROJECT_ID} · ${DRY_RUN ? 'KUIVAAJO (ei kirjoiteta)' : 'KIRJOITUS (--apply)'}`);
  const t = { asetettu: 0, joOk: 0, puuttuu: 0, virhe: 0, pelaajaAsetettu: 0, pelaajaJoOk: 0 };
  for (const seuraId of RUOTSISEURAT) {
    try {
      const nyt = await nykyKieli(seuraId);
      if (nyt === '__PUUTTUU__') { t.puuttuu++; console.warn(`  ⚠ ${seuraId}: seuradokumenttia ei löytynyt — ohitetaan`); continue; }
      // 1) seuradokin kieli (idempotentti)
      if (nyt === 'sv') { t.joOk++; console.log(`  ✓ ${seuraId}: seura.kieli jo 'sv' (idempotentti skip)`); }
      else {
        console.log(`  → ${seuraId}: seura.kieli ${nyt ? `'${nyt}'` : '(ei asetettu)'} → 'sv'` + (DRY_RUN ? '  [kuivaajo]' : ''));
        if (!DRY_RUN) { await api('PATCH', BASE + '/seurat/' + seuraId + '?updateMask.fieldPaths=kieli', { fields: { kieli: { stringValue: 'sv' } } }); t.asetettu++; }
      }
      // 2) V4-A3 reitti 1: kieli myös pelaajadokeille (idempotentti) — aina, myös kun seura.kieli oli jo 'sv'
      await asetaPelaajienKieli(seuraId, 'sv', t);
    } catch (e) { t.virhe++; console.error(`  ✗ ${seuraId}: ${e.message}`); }
  }
  console.log(`\nYhteenveto seurat: ${DRY_RUN ? 'asetettaisiin' : 'asetettu'} ${DRY_RUN ? RUOTSISEURAT.length - t.joOk - t.puuttuu - t.virhe : t.asetettu} · jo-ok ${t.joOk} · puuttuu ${t.puuttuu} · virhe ${t.virhe}`);
  console.log(`Yhteenveto pelaajat: ${DRY_RUN ? 'asetettaisiin' : 'asetettu'} ${t.pelaajaAsetettu} · jo-ok ${t.pelaajaJoOk}`);
  if (DRY_RUN) console.log('Aja kirjoitus: node scripts/i18n_set_kieli_sv.js --apply');
})();
