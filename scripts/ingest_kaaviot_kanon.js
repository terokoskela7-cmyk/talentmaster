#!/usr/bin/env node
/**
 * Erä F — KANONISEN KAAVIOKIRJASTON INGEST (dry-run-first, idempotentti)
 * ────────────────────────────────────────────────────────────────────────────
 * Kanoninen /kaaviot/{avain} oli TYHJÄ: valmentaja avasi taktiikkataulun ilman yhtään mallia.
 * Tämä vie lib/tm_kaavio_kanon_data.js:n piirretyt speksit sinne.
 *
 * MUOTO:  /kaaviot/{spec.avain} = { spec: <§3-spec>, kanoninen: true }
 *   Doc-id = avain → uudelleenajo PÄIVITTÄÄ saman dokumentin, ei duplikoi (idempotentti upsert).
 *   EI review-objektia: kanoniset ovat read-only viitteitä, eivät review-silmukassa. Pankki
 *   merkitsee ne kanonisiksi latausvaiheessa, ja seuran override samalla avaimella voittaa.
 *
 * VALIDOINTI: jokainen spec ajetaan validoiKaavio():n läpi (§6-portti, SAMA funktio kuin
 * editorissa). Yksikin virhe → EI KIRJOITETA MITÄÄN. Puolittainen kirjasto olisi pahempi kuin
 * tyhjä: valmentaja ei tiedä mikä puuttuu ja miksi.
 *
 * AJO:
 *   Dry-run (oletus, EI kirjoita):   node scripts/ingest_kaaviot_kanon.js
 *   Apply  (KIRJOITTAA):             node scripts/ingest_kaaviot_kanon.js --apply
 *   Emulaattoria vasten:             FIRESTORE_EMULATOR_HOST=localhost:8080 node scripts/ingest_kaaviot_kanon.js --apply
 *
 * AUTENTIKOINTI: firebase CLI:n login-token (sama kuvio kuin migrate_luotu_a5.js) — ei erillistä
 * service accountia. ⚠ KIRJOITUS VAATII SUPER_ADMIN-OIKEUDET: rules sallii /kaaviot-kirjoituksen
 * vain onSuperAdmin():lle. Emulaattoriajo ohittaa autentikoinnin (ei tokenia, ei sääntöjä).
 */
const https = require('https');
const http = require('http');
const path = require('path');
const os = require('os');
const { execSync } = require('child_process');

const PROJECT_ID = 'talentmaster-pilot';
const DRY_RUN = !process.argv.includes('--apply');
const EMU = process.env.FIRESTORE_EMULATOR_HOST || null;
const BASE = `/v1/projects/${PROJECT_ID}/databases/(default)/documents`;

const { TM_KAAVIO_KANON } = require(path.join(__dirname, '..', 'lib', 'tm_kaavio_kanon_data.js'));
const V = require(path.join(__dirname, '..', 'lib', 'tm_kaavio_validate.js'));

// ── Access token firebase CLI:n login-tokenista. Emulaattoriajossa ei tarvita. ──
function haeAccessToken() {
  if (EMU) return 'owner';
  const ftPath = path.join(os.homedir(), '.config', 'configstore', 'firebase-tools.json');
  try { execSync('firebase projects:list', { stdio: 'ignore' }); } catch (_) { /* refresh best-effort */ }
  delete require.cache[require.resolve(ftPath)];
  const ft = require(ftPath);
  if (!ft.tokens || !ft.tokens.access_token) throw new Error('Ei access_tokenia — aja ensin: firebase login');
  return ft.tokens.access_token;
}

function api(method, urlPath, body) {
  const AT = api._at || (api._at = haeAccessToken());
  return new Promise((res, rej) => {
    const payload = body ? JSON.stringify(body) : null;
    const [emuHost, emuPort] = (EMU || '').split(':');
    const opts = EMU
      ? { method, hostname: emuHost, port: Number(emuPort), path: urlPath, headers: { 'Content-Type': 'application/json', 'Authorization': 'Bearer owner' } }
      : { method, hostname: 'firestore.googleapis.com', path: urlPath, headers: { 'Authorization': 'Bearer ' + AT, 'Content-Type': 'application/json' } };
    if (payload) opts.headers['Content-Length'] = Buffer.byteLength(payload);
    const mod = EMU ? http : https;
    const r = mod.request(opts, (resp) => {
      let d = ''; resp.on('data', (c) => d += c);
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

/* JS-arvo → Firestore REST Value. Pidetään suppeana tarkoituksella: spec on puhdasta dataa
   (string/number/boolean/array/object), eikä tänne saa livahtaa Timestampeja tai referenssejä. */
function arvo(v) {
  if (v === null || v === undefined) return { nullValue: null };
  if (typeof v === 'boolean') return { booleanValue: v };
  if (typeof v === 'number') return Number.isInteger(v) ? { integerValue: String(v) } : { doubleValue: v };
  if (typeof v === 'string') return { stringValue: v };
  if (Array.isArray(v)) return { arrayValue: { values: v.map(arvo) } };
  if (typeof v === 'object') return { mapValue: { fields: kentat(v) } };
  throw new Error('tuntematon arvotyyppi: ' + typeof v);
}
function kentat(o) {
  const f = {};
  Object.keys(o).forEach((k) => { f[k] = arvo(o[k]); });
  return f;
}

async function main() {
  console.log('\n═══  KANONISEN KAAVIOKIRJASTON INGEST  ·  projekti ' + PROJECT_ID
    + (EMU ? '  ·  EMULAATTORI ' + EMU : '') + '  ═══');
  console.log(DRY_RUN ? '\n🔍 DRY-RUN — ei kirjoiteta mitään. Aja --apply kun luvut näyttävät oikeilta.\n'
                      : '\n✍  APPLY — kirjoitetaan.\n');

  // ── 1) VALIDOINTI ENNEN MITÄÄN KIRJOITUSTA ───────────────────────────────────
  const avaimet = {};
  const virheet = [];
  TM_KAAVIO_KANON.forEach((spec) => {
    const r = V.validoiKaavio(spec);
    if (r.E.length) virheet.push(spec.avain + ': ' + r.E.join(' · '));
    if (avaimet[spec.avain]) virheet.push(spec.avain + ': DUPLIKAATTI avain');
    avaimet[spec.avain] = 1;
  });
  console.log('  speksejä: ' + TM_KAAVIO_KANON.length + '  ·  uniikkeja avaimia: ' + Object.keys(avaimet).length);
  if (virheet.length) {
    console.error('\n❌ VALIDOINTI HYLKÄSI — EI KIRJOITETA MITÄÄN:');
    virheet.forEach((v) => console.error('   · ' + v));
    process.exit(1);
  }
  console.log('  ✅ kaikki läpäisivät §6-validaattorin\n');

  // ── 2) UPSERT ────────────────────────────────────────────────────────────────
  let kirjoitettu = 0;
  for (const spec of TM_KAAVIO_KANON) {
    const polku = BASE + '/kaaviot/' + encodeURIComponent(spec.avain);
    if (DRY_RUN) { console.log('   [dry] ' + spec.avain + '  ' + (spec.pelaajat || []).length + ' pelaajaa, '
      + (spec.liikkeet || []).length + ' liikettä, ' + (spec.selitteet || []).length + ' selitettä'); continue; }
    // PATCH ilman updateMask = koko dokumentin korvaus → idempotentti upsert samalla doc-id:llä.
    await api('PATCH', polku, { fields: kentat({ spec: spec, kanoninen: true }) });
    kirjoitettu++;
    console.log('   ✓ ' + spec.avain);
  }

  console.log('\n═══  ' + (DRY_RUN ? 'DRY-RUN VALMIS — mitään ei kirjoitettu' : 'VALMIS — kirjoitettu ' + kirjoitettu + ' dokumenttia') + '  ═══');
  if (DRY_RUN) console.log('     Kirjoita: node scripts/ingest_kaaviot_kanon.js --apply\n');
  else console.log('     Avaa taktiikkataulu → kanoniset kaaviot näkyvät pankissa.\n');
}

main().catch((e) => { console.error('\n❌ ' + e.message); process.exit(1); });
