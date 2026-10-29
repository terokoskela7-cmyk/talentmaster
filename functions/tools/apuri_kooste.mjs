#!/usr/bin/env node
/**
 * Valmennusapurin kustannuskooste (K1a, CODE_BRIEF_K1_APURI_KUSTANNUS 29.10.2026). VAIN LUKU.
 *
 * Lukee `valmennusapuri_loki`-kokoelman aikaväliltä ja tulostaa koosteen: kysymykset, syötetokenien mediaani,
 * $/kysymys, kesto, välimuistin osuus, osiohaun syyt, mallitaso sekä seurakohtaiset summat.
 * EI KOSKAAN tulosta kysymyksiä eikä vastauksia: kysely hakee `select()`:llä vain numerokentät, joten tekstit
 * eivät edes tule koneelle.
 *
 * Tunnistus: gcloud ADC (ei avaintiedostoa).
 *   gcloud auth application-default login
 *   node functions/tools/apuri_kooste.mjs --alku 2026-10-01 [--loppu 2026-11-01] [--rooli valmennusapuri|hp] [--json]
 * Oletus: viimeiset 7 päivää. --projekti talentmaster-pilot (oletus).
 *
 * Vanhoilla lokiriveillä ei ole `hintaArvioUsd`:tä → arvio lasketaan tokeneista oletushinnoilla (merkitään "arvio").
 */
import { createRequire } from 'node:module';
import { pathToFileURL } from 'node:url';

const require = createRequire(import.meta.url);
const admin = require('firebase-admin');
const { hintaArvio } = require('../valmennusapuri_osiot.js');
const { asetukset } = require('../valmennusapuri.js');

export const KENTAT = ['aika', 'rooli', 'seuraId', 'tokenit', 'hintaArvioUsd', 'kestoMs', 'malliTaso', 'varamalli', 'osioSyy',
  'aihe', 'tietopohjaMerkit', 'malli', 'stopReason', 'palaute.arvio', 'vmTtl'];

export function argumentit(argv) {
  const a = {};
  for (let i = 0; i < argv.length; i++) {
    if (!argv[i].startsWith('--')) continue;
    const k = argv[i].slice(2), seur = argv[i + 1];
    if (seur === undefined || seur.startsWith('--')) a[k] = true; else { a[k] = seur; i++; }
  }
  return a;
}

const mediaani = (l) => {
  if (!l.length) return null;
  const s = l.slice().sort((x, y) => x - y), k = Math.floor(s.length / 2);
  return s.length % 2 ? s[k] : (s[k - 1] + s[k]) / 2;
};
const summa = (l) => l.reduce((s, x) => s + x, 0);
const pyor = (x, d) => (x == null ? null : Math.round(x * Math.pow(10, d)) / Math.pow(10, d));

/** Puhdas: lokirivit → kooste (yksikkötestattava; ei tekstikenttiä). */
export function koosta(rivit, hinnat) {
  const ryhma = {}, seurat = {};
  let arvioituja = 0;
  rivit.forEach((r) => {
    const t = r.tokenit || {};
    const syoteYht = (t.syote || 0) + (t.valimuistiLuettu || 0) + (t.valimuistiKirjoitettu || 0);
    let usd = typeof r.hintaArvioUsd === 'number' ? r.hintaArvioUsd : null;
    if (usd === null) { usd = hintaArvio(t, hinnat[r.malliTaso === 'kevyt' ? 'kevyt' : 'perus']); arvioituja++; }
    const avain = (r.rooli || 'valmennusapuri');
    const g = ryhma[avain] || (ryhma[avain] = { n: 0, syote: [], usd: [], kesto: [], luettu: 0, kaikkiSyote: 0, syyt: {}, tasot: {}, varamalli: 0, katkesi: 0, hyva: 0, huono: 0 });
    g.n++;
    g.syote.push(syoteYht);
    g.usd.push(usd);
    if (typeof r.kestoMs === 'number') g.kesto.push(r.kestoMs);
    g.luettu += t.valimuistiLuettu || 0;
    g.kaikkiSyote += syoteYht;
    const syy = r.osioSyy || (r.aihe ? 'aihe:' + r.aihe : 'ei tietoa');
    g.syyt[syy] = (g.syyt[syy] || 0) + 1;
    const taso = r.malliTaso || 'perus';
    g.tasot[taso] = (g.tasot[taso] || 0) + 1;
    if (r.varamalli) g.varamalli++;
    if (r.stopReason === 'max_tokens') g.katkesi++;
    const arvio = r.palaute && r.palaute.arvio;
    if (arvio === 'hyva') g.hyva++; else if (arvio === 'huono') g.huono++;
    const s = r.seuraId || '(ei seuraa / SA)';
    const sg = seurat[s] || (seurat[s] = { n: 0, usd: 0 });
    sg.n++;
    sg.usd += usd;
  });
  const roolit = {};
  Object.keys(ryhma).forEach((k) => {
    const g = ryhma[k];
    roolit[k] = {
      kysymyksia: g.n,
      syoteTokenitMediaani: mediaani(g.syote),
      usdPerKysymysMediaani: pyor(mediaani(g.usd), 4),
      usdPerKysymysKa: pyor(summa(g.usd) / g.n, 4),
      usdYhteensa: pyor(summa(g.usd), 2),
      kestoSMediaani: g.kesto.length ? pyor(mediaani(g.kesto) / 1000, 1) : null,
      valimuistiOsuus: g.kaikkiSyote ? pyor(g.luettu / g.kaikkiSyote, 2) : null,
      osiohaunSyyt: g.syyt,
      malliTasot: g.tasot,
      varamalliin: g.varamalli,
      katkenneita: g.katkesi,
      palaute: { hyva: g.hyva, huono: g.huono },
    };
  });
  const seuraLista = Object.keys(seurat).sort().map((s) => ({ seura: s, kysymyksia: seurat[s].n, usd: pyor(seurat[s].usd, 2) }));
  return { kysymyksia: rivit.length, hintaArvioitu: arvioituja, roolit, seurat: seuraLista };
}

function tulosta(k, alku, loppu) {
  console.log('Valmennusapuri ' + alku + ' – ' + loppu + ': ' + k.kysymyksia + ' kysymystä' +
    (k.hintaArvioitu ? ' (' + k.hintaArvioitu + ':n hinta arvioitu tokeneista oletushinnoilla)' : ''));
  Object.keys(k.roolit).forEach((r) => {
    const g = k.roolit[r];
    console.log('\n' + r + ': ' + g.kysymyksia + ' kysymystä');
    console.log('  syötetokenit (mediaani)  ' + g.syoteTokenitMediaani);
    console.log('  $/kysymys mediaani / ka  ' + g.usdPerKysymysMediaani + ' / ' + g.usdPerKysymysKa + '   yhteensä ' + g.usdYhteensa + ' $');
    console.log('  kesto (mediaani)         ' + g.kestoSMediaani + ' s');
    console.log('  välimuistista luettu     ' + (g.valimuistiOsuus == null ? '–' : Math.round(g.valimuistiOsuus * 100) + ' %') + ' syötteestä');
    console.log('  osiohaku / aihe          ' + JSON.stringify(g.osiohaunSyyt));
    console.log('  mallitaso                ' + JSON.stringify(g.malliTasot) + (g.varamalliin ? '  (varamalliin ' + g.varamalliin + ')' : ''));
    console.log('  katkenneita / palaute    ' + g.katkenneita + ' / 👍 ' + g.palaute.hyva + ' 👎 ' + g.palaute.huono);
  });
  console.log('\nSeurat:');
  k.seurat.forEach((s) => console.log('  ' + s.seura.padEnd(20) + String(s.kysymyksia).padStart(5) + ' kysymystä  ' + s.usd + ' $'));
}

async function main() {
  const a = argumentit(process.argv.slice(2));
  const nyt = new Date();
  const alku = typeof a.alku === 'string' ? a.alku : new Date(nyt.getTime() - 7 * 864e5).toISOString().slice(0, 10);
  const loppu = typeof a.loppu === 'string' ? a.loppu : new Date(nyt.getTime() + 864e5).toISOString().slice(0, 10);
  if (!/^\d{4}-\d{2}-\d{2}$/.test(alku) || !/^\d{4}-\d{2}-\d{2}$/.test(loppu)) throw new Error('--alku ja --loppu muodossa VVVV-KK-PP');
  admin.initializeApp({ credential: admin.credential.applicationDefault(), projectId: a.projekti || 'talentmaster-pilot' });
  // `aika` on ISO-merkkijono → merkkijonoväli toimii. select(): vain numero- ja luokkakentät, ei kysymystä eikä vastausta.
  const snap = await admin.firestore().collection('valmennusapuri_loki')
    .where('aika', '>=', alku).where('aika', '<', loppu).select(...KENTAT).get();
  let rivit = snap.docs.map((d) => d.data());
  if (typeof a.rooli === 'string') rivit = rivit.filter((r) => (r.rooli || 'valmennusapuri') === a.rooli);
  const k = koosta(rivit, asetukset(process.env).hinnat);
  if (a.json) console.log(JSON.stringify(Object.assign({ alku, loppu }, k), null, 2)); else tulosta(k, alku, loppu);
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  main().catch((e) => { console.error('Virhe:', e.message); process.exit(1); });
}
