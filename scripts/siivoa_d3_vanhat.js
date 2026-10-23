#!/usr/bin/env node
/* siivoa_d3_vanhat.js — Tietoturva vaihe 1 / PR 2a: poistaa vanhat D3-A-kentät pelaajadokumentista, kun sama tieto on jo `sisainen/tiedot`:issa.
 *
 * Poistettavat kentät (lib/tm_sisainen.js RYHMAT.d3): d3_viimeisin, d3_taso, d3_pvm, d3_varmuus, d3_vp_pvm  (valmentajan, VP:n ja kalibraation D3).
 * EI POISTETA: d3_itsearvio (pelaajan oma osa, B) eikä mitään muuta kenttää.
 * EHTO per kenttä: poistetaan VAIN jos `sisainen/tiedot` on olemassa, sen `seuraId` == seura JA sama kenttä on siellä SYVÄSTI SAMA (kanoninen JSON). Muuten kenttä JÄÄ ja se lasketaan:
 *   sisainen_puuttuu (ei sisainen-dokumenttia / ei seuraId / kenttä puuttuu sieltä) · eroaa (molemmissa, mutta arvo eri — esim. vanha Master kirjoitti vanhaan kenttään myöhemmin; ratkaistaan käsin).
 * LISÄTURVA (ei tietoa katoa): jos poistettavassa d3_viimeisin:ssä on pelaajan oma osa (pisteet[dim].pelaaja) eikä pelaajalla ole d3_itsearvio:ta, se kirjoitetaan samalla päivityksellä d3_itsearvio:ksi
 *   (muoto lib/tm_d3_itsearvio.js tmD3ItsearvioOlio) — muuten pelaajan oma itsearvio katoaisi pelaaja-apista (se lukee vanhan kentän varalla).
 * IDEMPOTENTTI: uusi ajo löytää 0 poistettavaa. TULOSTE: vain lukumäärät per seura (ei nimiä, ei dokumentti-id:itä; --listaa-id tulostaa vain dokumentti-id:t jäljelle jäävistä).
 *
 * AJO (Teron kaista; gcloud ADC, EI palveluavainta). EI AJETA ennen kuin Rules v3.67 on deployattu ja PM on kuitannut dry-runin:
 *   Dry-run (OLETUS, ei kirjoita):                    node scripts/siivoa_d3_vanhat.js            [--seura=<id>] [--listaa-id]
 *   Kirjoitus (vasta dry-run-tarkistuksen jälkeen):   node scripts/siivoa_d3_vanhat.js --kirjoita [--seura=<id>]   (+ kirjoita KIRJOITA vahvistukseksi; --kylla ohittaa kysymyksen)
 */
'use strict';

const S = require('../lib/tm_sisainen.js'), D3 = require('../lib/tm_d3_itsearvio.js');
const KENTAT = S.RYHMAT.d3.kentat.slice();   // d3_viimeisin, d3_taso, d3_pvm, d3_varmuus, d3_vp_pvm (yksi lähde: sisainen-rekisteri)
const onArvo = (v) => v !== undefined && v !== null;
const kanon = (x) => JSON.stringify(x, (k, v) => (v && typeof v === 'object' && !Array.isArray(v)) ? Object.keys(v).sort().reduce((o, a) => { o[a] = v[a]; return o; }, {}) : v);
const sama = (a, b) => kanon(a) === kanon(b);

/* PURE: mitä tälle pelaajalle tehtäisiin? → { luokka, poista:[kentät], jata:{sisainen_puuttuu:[…], eroaa:[…]}, itsearvio:{…}|null }
   luokka: 'ei_d3' (ei vanhoja kenttiä) | 'poista' (kaikki löytyneet vanhat kentät poistetaan) | 'osittain' (osa poistetaan, osa jää) | 'jatetaan' (mitään ei voi poistaa) */
function suunnittele(pelaaja, sisainen, sid) {
  const p = pelaaja || {}, s = sisainen || null, seuraOk = !!s && s.seuraId === sid;
  const loydetyt = KENTAT.filter((k) => onArvo(p[k]));
  if (!loydetyt.length) return { luokka: 'ei_d3', poista: [], jata: { sisainen_puuttuu: [], eroaa: [] }, itsearvio: null };
  const poista = [], jata = { sisainen_puuttuu: [], eroaa: [] };
  for (const k of loydetyt) {
    if (!seuraOk || !onArvo(s[k])) jata.sisainen_puuttuu.push(k);
    else if (!sama(p[k], s[k])) jata.eroaa.push(k);
    else poista.push(k);
  }
  let itsearvio = null;
  if (poista.indexOf('d3_viimeisin') >= 0 && !p.d3_itsearvio) {   // pelaajan oma osa talteen ennen kuin vanha kenttä poistuu
    const vanha = p.d3_viimeisin && p.d3_viimeisin.pisteet, annetut = {};
    D3.DIMS.forEach((d) => { if (vanha && vanha[d] && typeof vanha[d] === 'object' && vanha[d].pelaaja != null) annetut[d] = vanha[d].pelaaja; });
    const pvm = [p.d3_viimeisin && p.d3_viimeisin.pvm, p.d3_pvm].filter((x) => typeof x === 'string' && /^\d{4}-\d{2}-\d{2}/.test(x)).map((x) => x.slice(0, 10))[0];
    try { itsearvio = pvm ? D3.tmD3ItsearvioOlio(annetut, {}, { pvm: pvm, jaksoAlkoi: (p.d3_viimeisin && p.d3_viimeisin.jakso_alkoi) || null }) : null; } catch (e) { itsearvio = null; }
  }
  const jaaJaljelle = jata.sisainen_puuttuu.length + jata.eroaa.length;
  return { luokka: !poista.length ? 'jatetaan' : jaaJaljelle ? 'osittain' : 'poista', poista, jata, itsearvio };
}

/* Ajo injektoidulla db:llä (testattavissa fake-Firestorella). deps: { db, kirjoita, seura, loki(fn), BATCH, DELETE (FieldValue.delete()-sentinel), listaaId } → yhteenveto */
async function aja(deps) {
  const db = deps.db, loki = deps.loki || (() => {}), BATCH = deps.BATCH || 400, DELETE = deps.DELETE;
  if (deps.kirjoita && DELETE === undefined) throw new Error('siivoa_d3_vanhat: DELETE-sentinel puuttuu (kirjoitus ilman FieldValue.delete()-arvoa)');
  const seurat = deps.seura ? [deps.seura] : (await db.collection('seurat').get()).docs.map((d) => d.id);
  const yht = { seuraa: seurat.length, pelaajia: 0, ei_d3: 0, poista: 0, osittain: 0, jatetaan: 0, kenttia_poistetaan: 0, jaa_sisainen_puuttuu: 0, jaa_eroaa: 0, itsearvio_siirretaan: 0, kirjoitettu: 0, kentat: {} };
  KENTAT.forEach((k) => { yht.kentat[k] = 0; });
  const kirj = [], idt = [];
  for (const sid of seurat) {
    const snap = await db.collection('seurat').doc(sid).collection('pelaajat').get();
    const r = { ei_d3: 0, poista: 0, osittain: 0, jatetaan: 0, kenttia: 0, puuttuu: 0, eroaa: 0, itsearvio: 0 };
    for (const d of snap.docs) {
      const ss = await d.ref.collection('sisainen').doc('tiedot').get();
      const pl = suunnittele(d.data() || {}, ss.exists ? ss.data() : null, sid);
      r[pl.luokka]++; r.kenttia += pl.poista.length; r.puuttuu += pl.jata.sisainen_puuttuu.length; r.eroaa += pl.jata.eroaa.length; if (pl.poista.length && pl.itsearvio) r.itsearvio++;
      pl.poista.forEach((k) => { yht.kentat[k]++; });
      if (pl.poista.length) kirj.push({ ref: d.ref, poista: pl.poista, itsearvio: pl.itsearvio });
      if (deps.listaaId && (pl.jata.sisainen_puuttuu.length || pl.jata.eroaa.length)) idt.push(sid + '/' + d.id + ' (' + [pl.jata.sisainen_puuttuu.length ? 'sisainen_puuttuu:' + pl.jata.sisainen_puuttuu.join(',') : '', pl.jata.eroaa.length ? 'eroaa:' + pl.jata.eroaa.join(',') : ''].filter(Boolean).join(' ') + ')');
    }
    yht.pelaajia += snap.docs.length; ['ei_d3', 'poista', 'osittain', 'jatetaan'].forEach((k) => { yht[k] += r[k]; }); yht.kenttia_poistetaan += r.kenttia; yht.jaa_sisainen_puuttuu += r.puuttuu; yht.jaa_eroaa += r.eroaa; yht.itsearvio_siirretaan += r.itsearvio;
    loki('[' + sid + '] pelaajia ' + snap.docs.length + ' · ei vanhaa D3:a ' + r.ei_d3 + ' · poistetaan kokonaan ' + r.poista + ' · osittain ' + r.osittain + ' · ei voi poistaa ' + r.jatetaan + ' · kenttiä poistetaan ' + r.kenttia + ' · jää (sisainen puuttuu) ' + r.puuttuu + ' · jää (eroaa) ' + r.eroaa + ' · itsearvio talteen ' + r.itsearvio);
  }
  if (idt.length) idt.forEach((x) => loki('  jää: ' + x));
  if (deps.kirjoita) {
    for (let i = 0; i < kirj.length; i += BATCH) {
      const b = db.batch();
      kirj.slice(i, i + BATCH).forEach((k) => { const u = {}; k.poista.forEach((f) => { u[f] = DELETE; }); if (k.itsearvio) u.d3_itsearvio = k.itsearvio; b.update(k.ref, u); });
      await b.commit(); yht.kirjoitettu += Math.min(BATCH, kirj.length - i);
    }
  }
  return yht;
}

async function main() {
  const path = require('path'), readline = require('readline');
  let admin; try { admin = require(path.join(__dirname, '..', 'functions', 'node_modules', 'firebase-admin')); } catch (e) { admin = require('firebase-admin'); }
  const argv = process.argv.slice(2), KIRJOITA = argv.includes('--kirjoita'), KYLLA = argv.includes('--kylla'), LISTAA = argv.includes('--listaa-id');
  const seura = (argv.find((a) => a.indexOf('--seura=') === 0) || '').split('=')[1] || null;
  admin.initializeApp({ projectId: 'talentmaster-pilot', credential: admin.credential.applicationDefault() });   // gcloud ADC
  const db = admin.firestore();
  console.log('=== Vanhat D3-kentät pois pelaajadokumentista · ' + (KIRJOITA ? 'KIRJOITUS (vaatii vahvistuksen)' : 'DRY-RUN (ei kirjoita)') + ' ===');
  if (KIRJOITA && !KYLLA) {
    const rl = readline.createInterface({ input: process.stdin, output: process.stdout });
    const vastaus = await new Promise((res) => rl.question('Kirjoita KIRJOITA vahvistukseksi: ', res)); rl.close();
    if (vastaus.trim() !== 'KIRJOITA') { console.log('Peruttu — mitään ei kirjoitettu.'); return; }
  }
  const y = await aja({ db, kirjoita: KIRJOITA, seura, listaaId: LISTAA, DELETE: admin.firestore.FieldValue.delete(), loki: console.log });
  console.log('YHTEENVETO', JSON.stringify(y));
  if (!KIRJOITA) console.log('DRY-RUN — mitään ei kirjoitettu. Kirjoitus: --kirjoita (vasta kun PM on kuitannut tämän tulosteen)');
}

if (require.main === module) main().catch((e) => { console.error('VIRHE:', e && e.message ? e.message : e); process.exit(1); });
else if (!(typeof process !== 'undefined' && process.env && process.env.VITEST)) throw new Error('scripts/siivoa_d3_vanhat.js käsittelee tuotantodataa — aja suoraan: node scripts/siivoa_d3_vanhat.js (ei require/import)');
module.exports = { KENTAT, suunnittele, aja };
