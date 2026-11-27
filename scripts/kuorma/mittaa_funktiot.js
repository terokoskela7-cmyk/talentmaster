#!/usr/bin/env node
'use strict';
/* mittaa_funktiot.js — projekti 06 PR 3: ajastettujen funktioiden mittaus stagingissa (VAIHE0 3.2, P11: kesto < 270 s 40 seuralla). Tero ajaa KÄSIN; VAIN staging (lukko.js).
 *   ! node scripts/kuorma/mittaa_funktiot.js --projekti=talentmaster-staging --profiili=savu_taysi               KUIVA-AJO (oletus): tulostaa suunnitelman ja gcloud-komennot
 *   ! node scripts/kuorma/mittaa_funktiot.js --projekti=talentmaster-staging --profiili=savu_taysi --aja         ajaa: Cloud Scheduler -job (gcloud scheduler jobs run) × 3 / funktio → lukee keston Cloud Loggingista
 * Valinnat: --funktiot=a,b (oletus: laskeSeuranKooste, laskeSeuranKoosteMa, valvontaPaivittain, valvontaViikko, kirjautumisaikaYo) · --kaikki (+ laskutusKuukausi, kalenteriTasoSynkka, notif*) · --toistot=3 · --ulos=mittaus_tulokset/funktiot.json · --odotus=15 (min / ajo).
 * Funktiolista on KIINTEÄ sallintalista (ei vapaata nimeä komentoon). Sähköposti estetty stagingissa (PR 0 -vartija). Ajo 1 = mahdollisesti kylmäkäynnistys (merkitään `ensimmainen`); jos haluat varmasti kylmän, odota ≥ 15 min viime kutsusta.
 * Muisti: mittaa_monitoring.js --funktiot=<tämä JSON> lukee user_memory_bytes -huipun ajoikkunoista jälkikäteen. */
const fs = require('fs'), path = require('path'), { spawnSync } = require('child_process');
const M = require('./mittaus_lib.js');
const L = require('./lukko.js');
const A = require('./aineisto.js');

const OLETUS = ['laskeSeuranKooste', 'laskeSeuranKoosteMa', 'valvontaPaivittain', 'valvontaViikko', 'kirjautumisaikaYo'];   // tasoHaeMaatcheck on KOMMENTOITU POIS functions/index.js:ssä (rivit 765–784) → ei deployattu, ei mitata
const LISAT = ['laskutusKuukausi', 'kalenteriTasoSynkka', 'notifReviewEraantyy', 'notifKoosteEmail', 'notifTapahtumaMuistutus'];
const SALLITUT = OLETUS.concat(LISAT);
/* Määritetty muisti ja aikaraja functions/index.js:stä (runWith) — raportin vertailuun; tarkista jos index.js muuttuu (testi vartioi). */
const MAARITYS = { laskeSeuranKooste: { aikaraja_s: 540, muisti_mb: 512 }, laskeSeuranKoosteMa: { aikaraja_s: 540, muisti_mb: 512 }, laskutusKuukausi: { aikaraja_s: 540, muisti_mb: 512 }, kirjautumisaikaYo: { aikaraja_s: 300, muisti_mb: 256 }, valvontaPaivittain: { aikaraja_s: 540, muisti_mb: 1024 }, valvontaViikko: { aikaraja_s: 540, muisti_mb: 1024 },
  kalenteriTasoSynkka: { aikaraja_s: 60, muisti_mb: 256 }, notifReviewEraantyy: { aikaraja_s: 60, muisti_mb: 256 }, notifKoosteEmail: { aikaraja_s: 60, muisti_mb: 256 }, notifTapahtumaMuistutus: { aikaraja_s: 60, muisti_mb: 256 } };   // 4 viimeistä: gen1-oletus (runWith puuttuu)
const REGION = 'europe-west1';   // funktioiden (1st gen) alue → Cloud Logging -suodatin
const SCHEDULER_ALUE = 'us-central1';   // Firebasen luomat Scheduler-jobit asuvat us-central1:ssä (ei funktion alueella; kuten tuotannossa)
/** gcloudin stderr:n 3 ensimmäistä riviä virheviestiin (diagnoosi: väärä nimi/sijainti/oikeus). */
const stderrAlku = (r) => { const t = r && r.stderr ? String(r.stderr).split('\n').map((x) => x.trim()).filter(Boolean).slice(0, 3) : []; return t.length ? '\n      gcloud: ' + t.join('\n      gcloud: ') : ''; };
const jobNimi = (fn) => 'firebase-schedule-' + fn + '-' + REGION;   // nimen pääte = FUNKTION alue (europe-west1); jobin SIJAINTI (--location) on SCHEDULER_ALUE

function lueArgv(argv) {
  const o = { projekti: undefined, profiili: undefined, aja: false, kaikki: false, funktiot: undefined, toistot: 3, ulos: 'mittaus_tulokset/funktiot.json', odotus: 15, tuntematon: [] };
  (argv || []).forEach((a) => {
    if (a === '--aja') o.aja = true; else if (a === '--kaikki') o.kaikki = true; else if (a.indexOf('--projekti=') === 0) o.projekti = a.slice(11); else if (a.indexOf('--profiili=') === 0) o.profiili = a.slice(11);
    else if (a.indexOf('--funktiot=') === 0) o.funktiot = a.slice(11).split(','); else if (a.indexOf('--toistot=') === 0) o.toistot = +a.slice(10); else if (a.indexOf('--ulos=') === 0) o.ulos = a.slice(7); else if (a.indexOf('--odotus=') === 0) o.odotus = +a.slice(9); else o.tuntematon.push(a);
  });
  return o;
}
/** Komentorivit (argumenttitaulukot) — koottu VAIN sallintalistan nimistä ja lukon hyväksymästä projektista. */
function komennot(projekti, fn, alkuIso) {
  if (SALLITUT.indexOf(fn) < 0) throw new Error('Funktio ei ole sallintalistalla.');
  if (!/^talentmaster-staging(-x)?$/.test(projekti)) throw new Error('Vain staging.');
  const suodatin = 'resource.type="cloud_function" AND resource.labels.function_name="' + fn + '" AND timestamp>="' + alkuIso + '" AND textPayload:"Function execution took"';
  return { aja: ['gcloud', ['scheduler', 'jobs', 'run', jobNimi(fn), '--location=' + SCHEDULER_ALUE, '--project=' + projekti]], loki: ['gcloud', ['logging', 'read', suodatin, '--project=' + projekti, '--format=json', '--order=asc', '--limit=5']] };
}
const nuku = (ms) => new Promise((r) => setTimeout(r, ms));

async function main(argv, deps) {
  const d = deps || {}, kirjaa = d.kirjaa || ((r) => console.log(r)), virhe = d.virhe || ((r) => console.error(r)), a = lueArgv(argv), suorita = d.suorita || ((c, args) => spawnSync(c, args, { encoding: 'utf8', timeout: 120000 })), odota = d.odota || nuku, nyt = d.nyt || (() => new Date());
  if (a.tuntematon.length) { virhe('Tuntematon valinta (' + a.tuntematon.length + ' kpl).'); return 2; }
  const lukko = L.tarkistaLukko({ projekti: a.projekti, env: d.env || process.env, adc: ('adc' in d) ? d.adc : L.lueAdcQuotaProjekti(d.env || process.env) });
  if (!lukko.ok) { virhe('LUKKO: ' + lukko.virhe); return 1; }
  if (lukko.projekti === L.EMULAATTORI || !/^talentmaster-staging(-x)?$/.test(lukko.projekti)) { virhe('LUKKO: funktiomittaus vain stagingiin.'); return 1; }
  const lista = a.funktiot || (a.kaikki ? SALLITUT : OLETUS);
  if (lista.some((f) => SALLITUT.indexOf(f) < 0) || !(a.toistot >= 1 && a.toistot <= 10) || !(a.odotus >= 1 && a.odotus <= 60)) { virhe('Virheellinen --funktiot / --toistot / --odotus.'); return 2; }
  let meta = { seuroja: null, pelaajia: null };
  if (a.profiili) { const p = A.PROFIILIT[a.profiili]; if (!p) { virhe('Tuntematon --profiili.'); return 2; } const l = A.laskeSeuroittain(p, 1); meta = { seuroja: l.seurat.length, pelaajia: l.m.pelaajat }; }
  kirjaa('FUNKTIOMITTAUS ' + (a.aja ? '(AJAA)' : '(KUIVA-AJO, ei suorita)') + ' · projekti ' + lukko.projekti + ' · ' + lista.length + ' funktiota × ' + a.toistot + ' ajoa' + (meta.pelaajia ? ' · aineisto ' + meta.seuroja + ' seuraa / ' + meta.pelaajia + ' pelaajaa' : ''));
  if (!a.aja) { lista.forEach((f) => { const k = komennot(lukko.projekti, f, '<ajon alku>'); kirjaa('  ' + f + ': ' + k.aja[0] + ' ' + k.aja[1].join(' ')); }); kirjaa('Kuiva-ajo valmis. Aja lisäämällä --aja (jokainen funktio ×' + a.toistot + ', odotus enintään ' + a.odotus + ' min/ajo).'); return 0; }
  const tulos = { meta: Object.assign({ aika: nyt().toISOString(), projekti: lukko.projekti, toistot: a.toistot, profiili: a.profiili || null }, meta), funktiot: [] };
  for (const fn of lista) {
    const ajot = [];
    for (let i = 1; i <= a.toistot; i++) {
      const alku = nyt(), k = komennot(lukko.projekti, fn, alku.toISOString()), r = suorita(k.aja[0], k.aja[1]);
      if (!r || r.status !== 0) { virhe('  ' + fn + ' ajo ' + i + ': scheduler jobs run epäonnistui (' + (r && r.status) + ') — onko job olemassa ja ADC voimassa?' + stderrAlku(r)); ajot.push({ ajo: i, virhe: 'scheduler' }); continue; }
      let rivi = null; const raja = alku.getTime() + a.odotus * 60000;
      while (!rivi && nyt().getTime() < raja) {
        await odota(d.kysely_ms != null ? d.kysely_ms : 15000);
        const lr = suorita(k.loki[0], k.loki[1]); let json = []; try { json = JSON.parse((lr && lr.stdout) || '[]'); } catch (e) { json = []; }
        rivi = M.parsiFunktioLoki(json)[0] || null; if (rivi && !rivi.aika) rivi.aika = nyt().toISOString();
      }
      const loppu = nyt(); ajot.push(rivi ? { ajo: i, ensimmainen: i === 1, ms: rivi.ms, tila: rivi.tila, alku: alku.toISOString(), loppu: loppu.toISOString() } : { ajo: i, virhe: 'aikakatkaisu (lokirivi puuttuu ' + a.odotus + ' min)' });
      kirjaa('  ' + fn + ' · ajo ' + i + '/' + a.toistot + ': ' + (rivi ? (rivi.ms / 1000).toFixed(1) + ' s' + (rivi.tila && !/^(ok|200)$/.test(rivi.tila) ? ' · tila ' + rivi.tila : '') : 'ei lokiriviä'));
    }
    const kestot = ajot.filter((x) => x.ms != null).map((x) => x.ms / 1000);
    tulos.funktiot.push({ nimi: fn, maaritys: MAARITYS[fn] || null, ajot, kesto_s: M.tilasto(kestot) });
  }
  fs.mkdirSync(path.dirname(a.ulos), { recursive: true }); fs.writeFileSync(a.ulos, JSON.stringify(tulos, null, 2) + '\n'); kirjaa('Valmis · ' + a.ulos + ' · seuraava: mittaa_monitoring.js --funktiot=' + a.ulos + ' → mittaus_raportti.js'); return 0;
}
if (require.main === module) main(process.argv.slice(2)).then((c) => process.exit(c)).catch((e) => { console.error('Virhe: ' + String(e && e.message || e).split('\n')[0]); process.exit(2); });
module.exports = { main, lueArgv, komennot, jobNimi, OLETUS, LISAT, SALLITUT, MAARITYS };
