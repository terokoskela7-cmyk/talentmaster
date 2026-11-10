#!/usr/bin/env node
/* valvonta_aja.js — Projekti 07 / PR 2: erottelun valvonnan KÄSIAJURI. VAIN LUKU, gcloud ADC (ei SA-avainta), tulostaa VAIN lukumäärät, seura-id:t, kokoelmien ja kenttien NIMET.
 * Tero ajaa:  ! node scripts/valvonta_aja.js [--projekti=talentmaster-pilot] [--nyt=2026-11-11T08:00:00Z] [--kaikki] [--raaka] [--sallitut-luonnos]
 *   (ADC: gcloud auth application-default login)
 *
 * Tekee saman kuin PR 3:n ajastettu funktio (sama lukukerros functions/valvonta_luku.js ja sama logiikka lib/tm_valvonta.js), mutta ei kirjoita mitään: ei audit-riviä, ei sähköpostia.
 *  · Oletuksena ohitetaan demo-seurat (P10: demo, demo-fc, qg_savu) ja sovelletaan functions/valvonta_sallitut.json (P11). --kaikki = ei ohituksia, --raaka = ei sallittujen listaa.
 *  · --sallitut-luonnos: tulostaa JSON-luonnoksen nykyisistä poikkeamista sallittujen listaa varten (perustelu jätetty tyhjäksi → PM kirjoittaa; tyhjä perustelu ei läpäise validointia).
 *
 * BASELINE-AJOSSA LUE ENSIN "Kenttävahti (F1)" -OSIO: jos kokoelmassa on dokumentteja mutta alle 50 %:lla on oletettu joukkuekenttä, VAROITUS kertoo kokoelman ja osuuden,
 * ja vieressä näkyvät kokoelman todelliset joukkue-nimiset kentät. Tällöin E1a/E1b-nolla ei todista mitään ja inventaario (lib/tm_valvonta.js VIITEKENTAT +
 * docs/VALVONTA_KENTTAINVENTAARIO.md) korjataan löydettyjen kenttien mukaan. */
'use strict';
if (require.main !== module) throw new Error('käsittelee tuotantodataa — aja suoraan: node scripts/valvonta_aja.js');
const path = require('path');
const fs = require('fs');
const V = require(path.join(__dirname, '..', 'lib', 'tm_valvonta.js'));
const R = require(path.join(__dirname, '..', 'lib', 'tm_valvonta_raportti.js'));
const L = require(path.join(__dirname, '..', 'functions', 'valvonta_luku.js'));

function sallitut() {
  const j = JSON.parse(fs.readFileSync(path.join(__dirname, '..', 'functions', 'valvonta_sallitut.json'), 'utf8')), virheet = V.tmVSallitutVirheet(j.rivit);
  if (virheet.length) throw new Error('functions/valvonta_sallitut.json virheellinen: ' + virheet.join('; '));
  return j.rivit;
}
const MERKKI = { virhe: 'ERROR', varoitus: 'WARN ', ok: 'INFO ' };
const pad = (s, n) => String(s).padEnd(n), lpad = (s, n) => String(s).padStart(n);

/** Raportti tekstinä (puhdas: testattavissa). aineisto = kerayAineisto-tulos, tulokset = tmVAjaKaikki-tulos. */
function muotoile(aineisto, tulokset, opts) {
  const ohi = opts.ohitetut, rivit = [];
  const mukana = aineisto.seurat.filter((s) => ohi.indexOf(s.sid) < 0);
  rivit.push('# Valvonta · käsiajo (vain luku) · ' + opts.projekti + ' · ' + new Date(aineisto.nytMs).toISOString());
  rivit.push('seuroja luettu ' + aineisto.seurat.length + ' · tarkistettu ' + mukana.length + ' · ohitettu (P10) ' + (ohi.length ? ohi.join(', ') : 'ei yhtään') + ' · lukuvirheitä ' + aineisto.virheet.length + ' · audit-estoja (7 pv) ' + aineisto.auditRivit.length);
  aineisto.virheet.forEach((v) => rivit.push('LUKUVIRHE seura=' + v.seura + ' koodi=' + v.koodi));

  rivit.push('', '## Tarkistukset (vain rivit, joissa lkm > 0 tai taso ≠ ok)');
  const huomattavat = tulokset.filter((t) => t.lkm > 0 || t.taso !== 'ok').sort((a, b) => (a.seura < b.seura ? -1 : a.seura > b.seura ? 1 : (a.koodi < b.koodi ? -1 : a.koodi > b.koodi ? 1 : (a.kokoelma < b.kokoelma ? -1 : 1))));
  if (!huomattavat.length) rivit.push('(ei poikkeamia)');
  huomattavat.forEach((t) => rivit.push(MERKKI[t.taso] + ' ' + pad(t.koodi, 4) + ' ' + pad(t.seura, 18) + ' ' + pad(t.kokoelma, 22) + ' ' + lpad(t.lkm, 7) + (t.koodi !== 'M1' && t.kokonais != null ? ' / ' + t.kokonais : '')
    + (t.koodi === 'M1' ? ' tavua (suurin dokumentti; ' + t.kokonais + ' dok)' : '') + (t.koodi === 'F1' ? (t.taso === 'varoitus' ? ' (kenttä puuttuu; osuus ' : ' (osa ilman kenttää; osuus ') + t.osuus + ' %)' : '') + (t.sallittu ? ' [sallittu ≤ ' + t.sallittuMax + ']' : '') + (t.ylittaaSallitun ? ' [YLITTÄÄ sallitun ' + t.sallittuMax + ']' : '')));

  rivit.push('', '## Kenttävahti (F1): oletetut joukkuekentät kokoelmittain, kaikki tarkistetut seurat yhteensä (dok = dokumentit, joilta joukkueviite odotetaan; kalenterissa vain harjoitukset ja ottelut)');
  rivit.push(pad('kokoelma', 22) + lpad('dok', 8) + lpad('osuus', 9) + '  oletetut kentät (% dokumenteista)  ·  löydetyt joukkue-nimiset kentät (%)  ·  arvio');
  Object.keys(V.VIITEKENTAT).forEach((kok) => {
    const docs = [].concat(...mukana.map((s) => s.kokoelmat[kok] || []));
    if (!docs.length) { rivit.push(pad(kok, 22) + lpad(0, 8) + lpad('–', 9) + '  (kokoelmassa ei dokumentteja — ei vartioitavaa)'); return; }
    const f = V.tmVKenttavahti('x', kok, docs);
    if (!f) { rivit.push(pad(kok, 22) + lpad(docs.length, 8) + lpad('–', 9) + '  (ei dokumentteja, joilta joukkueviite odotetaan — ei vartioitavaa)'); return; }
    const loydetyt = V.tmVJoukkuekentat(docs), odotetut = V.VIITEKENTAT[kok];
    const odotettuTeksti = odotetut.map((k) => k + ' ' + f.kentat[k]).join(', '), loydettyTeksti = Object.keys(loydetyt).map((k) => k + ' ' + loydetyt[k]).join(', ') || '–';
    const ylimaaraiset = Object.keys(loydetyt).filter((k) => odotetut.indexOf(k) < 0 && loydetyt[k] >= 5);
    const arvio = f.taso === 'varoitus' ? '‼ VAROITUS: kenttä puuttuu (' + kok + ', osuus ' + f.osuus + ' %)' : 'OK';
    rivit.push(pad(kok, 22) + lpad(f.kokonais, 8) + lpad(f.osuus + ' %', 9) + '  ' + odotettuTeksti + '  ·  ' + loydettyTeksti + '  ·  ' + arvio);
    if (ylimaaraiset.length) rivit.push('    → LISÄÄ INVENTAARIOON? ' + kok + ': ' + ylimaaraiset.join(', ') + ' (esiintyy datassa, ei VIITEKENTAT-listalla)');
  });

  rivit.push('', '## K3-syöte: kokoelmien koko seuroittain (tallennetaan edelliseksi ajoksi PR 3:ssa)');
  mukana.forEach((s) => { const k = V.tmVKasvuLuvut(s.kokoelmat); rivit.push(pad(s.sid, 18) + Object.keys(k).map((n) => n + ' ' + k[n]).join(' · ')); });

  const virheita = tulokset.filter((t) => t.taso === 'virhe').length, varoituksia = tulokset.filter((t) => t.taso === 'varoitus').length;
  rivit.push('', 'YHTEENVETO: ERROR ' + virheita + ' · WARN ' + varoituksia + ' · tarkistusrivejä ' + tulokset.length + (aineisto.virheet.length ? ' · LUKUVIRHEITÄ ' + aineisto.virheet.length + ' (seurat pois aineistosta)' : ''));
  return rivit.join('\n') + '\n';
}
/** Luonnos sallittujen listaksi nykyisistä poikkeamista (perustelu tyhjä → ei läpäise validointia ennen kuin PM täyttää). */
function luonnos(tulokset, nytMs) {
  const paiva = new Date(nytMs).toISOString().slice(0, 10);
  return JSON.stringify(tulokset.filter((t) => t.lkm > 0 && t.taso !== 'ok').map((t) => ({ seura: t.seura, koodi: t.koodi, kokoelma: t.kokoelma, enimmaismaara: t.lkm, perustelu: '', paiva })), null, 2) + '\n';
}

async function ajaMain() {
  const admin = require(path.join(__dirname, '..', 'functions', 'node_modules', 'firebase-admin'));
  const argv = process.argv.slice(2), arg = (n, d) => { const o = argv.find((a) => a.indexOf('--' + n + '=') === 0); return o ? o.split('=').slice(1).join('=') : d; }, lippu = (n) => argv.indexOf('--' + n) >= 0;
  const projekti = arg('projekti', 'talentmaster-pilot'), nyt = arg('nyt', null), nytMs = nyt ? Date.parse(nyt) : Date.now();
  if (isNaN(nytMs)) throw new Error('--nyt: ei kelpaa ISO-ajaksi');
  admin.initializeApp({ projectId: projekti });
  const t0 = Date.now(), aineisto = await L.kerayAineisto(admin.firestore(), { nytMs });
  const ohitetut = lippu('kaikki') ? [] : V.OHITETUT_SEURAT;
  const tulokset = V.tmVAjaKaikki({ seurat: aineisto.seurat, auditRivit: aineisto.auditRivit, nytMs, ohitetut, sallitut: lippu('raaka') ? null : sallitut() });
  const ulos = lippu('sallitut-luonnos') ? luonnos(tulokset, nytMs) : muotoile(aineisto, tulokset, { ohitetut, projekti });
  const pii = R.tmVOnkoPii(ulos, []);   // viimeinen vartija: tuloste ei saa sisältää sähköpostiosoitetta
  if (!pii.ok) throw new Error('tuloste hylätty: PII-vartija (' + pii.rikkomukset.map((r) => r.tyyppi).join(',') + ')');
  process.stdout.write(ulos);
  console.error('kesto ' + Math.round((Date.now() - t0) / 100) / 10 + ' s');
}

if (require.main === module) ajaMain().catch((e) => { console.error('Virhe: ' + R.tmVTurvallinenVirhe(e).koodi); process.exit(2); });
