#!/usr/bin/env node
'use strict';
/* mittaa_monitoring.js — projekti 06 PR 3: Cloud Monitoring -luvut jälkikäteen (VAIHE0 3.1 kohta 2 ja 3.2). VAIN staging (lukko.js), vain luku. Viive: aja muutaman minuutin kuluttua mittauksesta.
 *   ! node scripts/kuorma/mittaa_monitoring.js --projekti=talentmaster-staging --tulos=mittaus_tulokset/sivut.json        lisää JSONiin firestore.googleapis.com/document/read_count (laskutusta vastaava totuus) mittausikkunalta
 *   ! node scripts/kuorma/mittaa_monitoring.js --projekti=talentmaster-staging --funktiot=mittaus_tulokset/funktiot.json lisää funktioille cloudfunctions.googleapis.com/function/user_memory_bytes (p99-huippu) ajoikkunoilta
 * Pääsy: gcloud ADC -token (ei levylle, ei tulosteeseen). Staging on eristetty → read_count-ero ikkunassa on ajon oma. */
const fs = require('fs'), https = require('https'), { spawnSync } = require('child_process');
const L = require('./lukko.js');

function lueArgv(argv) { const o = { projekti: undefined, tulos: undefined, funktiot: undefined, tuntematon: [] }; (argv || []).forEach((a) => { if (a.indexOf('--projekti=') === 0) o.projekti = a.slice(11); else if (a.indexOf('--tulos=') === 0) o.tulos = a.slice(8); else if (a.indexOf('--funktiot=') === 0) o.funktiot = a.slice(11); else o.tuntematon.push(a); }); return o; }
const polku = (projekti, suodatin, alku, loppu, aligner) => '/v3/projects/' + projekti + '/timeSeries?' + new URLSearchParams({ filter: suodatin, 'interval.startTime': alku, 'interval.endTime': loppu, 'aggregation.alignmentPeriod': '60s', 'aggregation.perSeriesAligner': aligner }).toString();
/** Summaa kaikkien aikasarjojen pisteet (int64/double) → luku. */
function summaa(vastaus) { let s = 0; ((vastaus && vastaus.timeSeries) || []).forEach((ts) => (ts.points || []).forEach((p) => { s += +(p.value.int64Value != null ? p.value.int64Value : (p.value.doubleValue || 0)); })); return s; }
function huippu(vastaus) { let m = null; ((vastaus && vastaus.timeSeries) || []).forEach((ts) => (ts.points || []).forEach((p) => { const v = +(p.value.doubleValue != null ? p.value.doubleValue : p.value.int64Value || 0); if (m == null || v > m) m = v; })); return m; }
function haeHttps(token, p) { return new Promise((res, rej) => { https.get({ host: 'monitoring.googleapis.com', path: p, headers: { Authorization: 'Bearer ' + token } }, (r) => { let b = ''; r.on('data', (c) => (b += c)); r.on('end', () => { if (r.statusCode !== 200) return rej(new Error('Monitoring HTTP ' + r.statusCode)); try { res(JSON.parse(b)); } catch (e) { rej(e); } }); }).on('error', rej); }); }

async function main(argv, deps) {
  const d = deps || {}, kirjaa = d.kirjaa || ((r) => console.log(r)), virhe = d.virhe || ((r) => console.error(r)), a = lueArgv(argv);
  if (a.tuntematon.length || (!a.tulos && !a.funktiot)) { virhe('Anna --tulos=<sivut.json> ja/tai --funktiot=<funktiot.json>.'); return 2; }
  const lukko = L.tarkistaLukko({ projekti: a.projekti, env: d.env || process.env, adc: ('adc' in d) ? d.adc : L.lueAdcQuotaProjekti(d.env || process.env) });
  if (!lukko.ok) { virhe('LUKKO: ' + lukko.virhe); return 1; }
  if (!/^talentmaster-staging(-x)?$/.test(lukko.projekti)) { virhe('LUKKO: vain staging.'); return 1; }
  const token = d.token ? await d.token() : (() => { const r = spawnSync('gcloud', ['auth', 'application-default', 'print-access-token'], { encoding: 'utf8' }); return r.status === 0 ? r.stdout.trim() : null; })();
  if (!token) { virhe('ADC-tokenia ei saatu (gcloud auth application-default login).'); return 1; }
  const hae = d.hae || ((p) => haeHttps(token, p));
  if (a.tulos) {
    const j = JSON.parse(fs.readFileSync(a.tulos, 'utf8')), r = await hae(polku(lukko.projekti, 'metric.type="firestore.googleapis.com/document/read_count"', j.meta.aika, j.meta.loppu, 'ALIGN_SUM'));
    j.monitoring = { read_count: summaa(r), ikkuna: [j.meta.aika, j.meta.loppu], metriikka: 'firestore.googleapis.com/document/read_count' }; fs.writeFileSync(a.tulos, JSON.stringify(j, null, 2) + '\n');
    const instrum = j.mittaukset.reduce((s, m) => s + m.kylma.concat(m.lampimat).reduce((x, y) => x + (y.yht || 0), 0), 0);
    kirjaa('read_count ikkunassa: ' + j.monitoring.read_count + ' · instrumentoitu summa (kaikki avaukset): ' + instrum + ' · ero ' + (instrum ? Math.round((j.monitoring.read_count / instrum - 1) * 100) + ' %' : '–') + ' (Monitoringissa myös kirjautumisen ym. taustaluvut)');
  }
  if (a.funktiot) {
    const j = JSON.parse(fs.readFileSync(a.funktiot, 'utf8'));
    for (const f of j.funktiot) {
      const ikkuna = f.ajot.filter((x) => x.alku && x.loppu); if (!ikkuna.length) continue;
      const alku = ikkuna.map((x) => x.alku).sort()[0], loppu = ikkuna.map((x) => x.loppu).sort().slice(-1)[0];
      const r = await hae(polku(lukko.projekti, 'metric.type="cloudfunctions.googleapis.com/function/user_memory_bytes" AND resource.labels.function_name="' + f.nimi + '"', alku, loppu, 'ALIGN_PERCENTILE_99')), b = huippu(r);
      f.huippumuisti_mb = b != null ? Math.round(b / 1048576 * 10) / 10 : null; kirjaa('  ' + f.nimi + ': huippumuisti (p99) ' + (f.huippumuisti_mb != null ? f.huippumuisti_mb + ' MB' : 'ei dataa') + (f.maaritys ? ' / ' + f.maaritys.muisti_mb + ' MB' : ''));
    }
    fs.writeFileSync(a.funktiot, JSON.stringify(j, null, 2) + '\n');
  }
  kirjaa('Valmis.'); return 0;
}
if (require.main === module) main(process.argv.slice(2)).then((c) => process.exit(c)).catch((e) => { console.error('Virhe: ' + String(e && e.message || e).split('\n')[0]); process.exit(2); });
module.exports = { main, lueArgv, summaa, huippu, polku };
