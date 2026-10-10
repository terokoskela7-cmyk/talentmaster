#!/usr/bin/env node
/* diag_tekniikka_maaritelma.cjs — KUIVA, VAIN LUKU. docs/TEKNIIKKA_MAARITELMA.md:n luvut: miltä "tekniikka heikko" näyttää NYKYISILLÄ säännöillä
 * ja EHDOTETULLA jaetulla säännöllä (prototyyppi vain tässä tiedostossa — EI lib/-toteutusta, päätös Terolla).
 *
 * Ajo:
 *   node scripts/diag_tekniikka_maaritelma.cjs                 demo-fixturet (pilotti · kypsa · kuormitus), offline
 *   node scripts/diag_tekniikka_maaritelma.cjs kpv              KPV:n oikea data, VAIN .get() (gcloud ADC, EI SA-avainta); tulosteessa EI nimiä,
 *                                                               vain joukkueen nimi ja lukumäärät
 *
 * Nykyiset säännöt (kartoitus docs/TEKNIIKKA_MAARITELMA.md §1):
 *   HUOMIO  "Tekniikka alle ikätason"  = laskeJoukkuePoikkeamat → alle_normin/tekniikka: joukkueen D2-keskiarvo (tmJoukkueD2, minN 1) < 3
 *   EHDOTUS "Tekniikkaharjoittelua"    = VP_v25 TP_SIGNAALIT tki_alhainen: ≥ 2 pelaajaa, joilla tki_viimeisin < 40
 * Ehdotettu sääntö (§2): ketju TKI → TSI → Eerikkilä-tekniikkataso per pelaaja; raja TKI < 40 · TSI > 1,5 s · taso < 3,0;
 *   joukkue = tmPelaajanJoukkueet; "alle ikätason" kun ≥ 1/3 mitatuista heikkoja ja mitattuja ≥ 5; yli 12 kk vanha mittaus ei ole mittaus. */
'use strict';
const path = require('path');
const E = require('../lib/tm_eerikkila_normit.js');
const JK = require('../lib/tm_joukkue.js');
const DAY = 86400000;

/* ── ehdotetut vakiot ── */
const RAJA = { tki: 40, tsi: 1.5, taso: 3.0, osuus: 1 / 3, minMitattu: 5, vanhaKk: 12 };

const ms = (t) => (t && t.toDate ? t.toDate().getTime() : (t ? Date.parse(t) : NaN));
const kk = (t, nyt) => { const m = ms(t); return isNaN(m) ? null : (nyt - m) / (30.44 * DAY); };
const spMN = (p) => (p.sukupuoli === 'N' || p.sukupuoli === 'T' ? 'N' : 'M');

/* Prototyyppi: yhden pelaajan tekniikkamittari ketjulla. → { mittari, arvo, heikko, ikaKk, vanha } | null (ei mittausta) */
function tekniikkaMittari(p, nyt) {
  const sp = spMN(p), hhIka = E.normiIka(p.syntymaVuosi, p.hh_pvm || p.d2_pvm || null);
  let r = null;
  if (p.tki_viimeisin != null) r = { mittari: 'TKI', arvo: p.tki_viimeisin, heikko: p.tki_viimeisin < RAJA.tki, ikaKk: kk(p.tki_pvm, nyt) };
  else if (p.tsi_viimeisin != null) r = { mittari: 'TSI', arvo: p.tsi_viimeisin, heikko: p.tsi_viimeisin > RAJA.tsi, ikaKk: kk(p.sm_pvm || p.hh_pvm, nyt) };
  else {
    const hh = hhIka != null ? E.laskeD2HH(p.hh_viimeisin, hhIka, sp) : null;
    if (hh) r = { mittari: 'EERIKKILÄ', arvo: hh.taso, heikko: hh.taso < RAJA.taso, ikaKk: kk(p.hh_pvm, nyt) };
    else if (p.d2_taso != null && p.d2_lahde) r = { mittari: 'EERIKKILÄ', arvo: p.d2_taso, heikko: p.d2_taso < RAJA.taso, ikaKk: kk(p.d2_pvm, nyt) };
  }
  if (!r) return null;
  r.vanha = r.ikaKk != null && r.ikaKk >= RAJA.vanhaKk;
  return r;
}
function ehdotettuLuokka(pelaajat, nyt) {
  const M = pelaajat.map((p) => tekniikkaMittari(p, nyt)).filter(Boolean), tuoreet = M.filter((m) => !m.vanha);
  const heikkoja = tuoreet.filter((m) => m.heikko).length, lahteet = {};
  tuoreet.forEach((m) => { lahteet[m.mittari] = (lahteet[m.mittari] || 0) + 1; });
  const ikat = M.map((m) => m.ikaKk).filter((x) => x != null).sort((a, b) => a - b);
  return { yht: pelaajat.length, mitattu: tuoreet.length, vanhoja: M.length - tuoreet.length, heikkoja, lahteet,
    vanhinKk: ikat.length ? Math.round(ikat[ikat.length - 1]) : null,
    luokka: tuoreet.length < RAJA.minMitattu ? 'ei luokkaa (alle ' + RAJA.minMitattu + ' mitattua)' : (heikkoja / tuoreet.length >= RAJA.osuus ? 'ALLE IKÄTASON' : 'ok') };
}

/* Nykyiset säännöt samoilla pelaajilla */
function nykyinen(pelaajat, ika, spTP) {
  const pk = E.laskeJoukkuePoikkeamat(pelaajat, ika, spTP === 'T' ? 'N' : 'M');
  const t = pk.find((x) => x.tyyppi === 'alle_normin' && x.osaAlue === 'tekniikka');
  const tki40 = pelaajat.filter((p) => p.tki_viimeisin != null && p.tki_viimeisin < 40).length;
  return { huomio: t ? 'KYLLÄ (D2-ka ' + t.arvo + ', ' + t.vakavuus + ')' : 'ei', ehdotus: tki40 >= 2 ? 'KYLLÄ (' + tki40 + ' pelaajaa TKI<40)' : 'ei (' + tki40 + ')', huomioB: !!t, ehdotusB: tki40 >= 2 };
}
const ikaSp = (nimi) => { const s = String(nimi || ''), a = s.match(/\b[PTU]?\s?(\d{1,2})\b/i) || s.match(/(\d{1,2})/), b = s.match(/\b([PT])\s?\d/i); return { ika: a ? parseInt(a[1] || a[0], 10) : null, sp: b && b[1].toUpperCase() === 'T' ? 'T' : 'P' }; };

function raportti(nimi, pelaajat, joukkueDocs, nyt) {
  const per = {}; joukkueDocs.forEach((d) => { per[d.id] = []; });
  pelaajat.forEach((p) => JK.tmPelaajanJoukkueet(p, joukkueDocs).forEach((id) => { if (per[id]) per[id].push(p); }));
  const rivit = joukkueDocs.map((d) => { const pp = per[d.id], is = ikaSp(d.nimi), n = nykyinen(pp, is.ika, is.sp), u = ehdotettuLuokka(pp, nyt); return { joukkue: d.nimi, pelaajia: pp.length, n, u }; }).filter((r) => r.pelaajia > 0);
  const yht = { joukkueita: rivit.length, huomioNyt: rivit.filter((r) => r.n.huomioB).length, ehdotusNyt: rivit.filter((r) => r.n.ehdotusB).length,
    uusiAlle: rivit.filter((r) => r.u.luokka === 'ALLE IKÄTASON').length, uusiEiLuokkaa: rivit.filter((r) => /^ei luokkaa/.test(r.u.luokka)).length, uusiOk: rivit.filter((r) => r.u.luokka === 'ok').length };
  console.log('\n══ ' + nimi + ' ══');
  console.log('joukkue'.padEnd(34) + 'pel.'.padEnd(5) + 'HUOMIO nyt'.padEnd(26) + 'EHDOTUS nyt'.padEnd(26) + 'UUSI: mitattu/heikkoja (vanhoja) → luokka   [lähteet, vanhin kk]');
  rivit.forEach((r) => console.log(String(r.joukkue).slice(0, 33).padEnd(34) + String(r.pelaajia).padEnd(5) + r.n.huomio.padEnd(26) + r.n.ehdotus.padEnd(26) + r.u.mitattu + '/' + r.u.heikkoja + ' (' + r.u.vanhoja + ') → ' + r.u.luokka + '   ' + JSON.stringify(r.u.lahteet) + (r.u.vanhinKk != null ? ' ' + r.u.vanhinKk + ' kk' : '')));
  console.log('YHTEENSÄ ' + JSON.stringify(yht));
  return yht;
}

async function kpv() {
  if (require.main !== module) throw new Error('käsittelee tuotantodataa — aja suoraan');
  const admin = require(path.join(__dirname, '..', 'functions', 'node_modules', 'firebase-admin'));
  admin.initializeApp({ projectId: 'talentmaster-pilot' });
  const db = admin.firestore(), seura = (process.argv.find((a) => a.indexOf('--seura=') === 0) || '--seura=kpv').split('=')[1];
  const [ps, js] = await Promise.all([db.collection('seurat').doc(seura).collection('pelaajat').get(), db.collection('seurat').doc(seura).collection('joukkueet').get()]);
  const KENTAT = ['joukkueet', 'joukkue', 'syntymaVuosi', 'sukupuoli', 'tki_viimeisin', 'tki_pvm', 'tsi_viimeisin', 'hh_viimeisin', 'hh_pvm', 'hh_taso', 'd1_taso', 'd2_taso', 'd2_lahde', 'd2_pvm', 'sm_pallo_viimeisin', 'tki_merkki'];
  const pelaajat = ps.docs.map((d) => { const x = d.data(), o = { id: d.id }; KENTAT.forEach((k) => { if (x[k] !== undefined) o[k] = x[k]; }); return o; });   // vain mittarikentät — ei nimiä
  const docs = js.docs.map((d) => ({ id: d.id, nimi: d.data().nimi || d.id }));
  console.log('seura ' + seura + ': ' + pelaajat.length + ' pelaajaa, ' + docs.length + ' joukkuetta (vain luku)');
  const tilasto = {}; pelaajat.forEach((p) => { const m = tekniikkaMittari(p, Date.now()); const k = m ? m.mittari + (m.vanha ? ' (vanha)' : '') : 'ei mittausta'; tilasto[k] = (tilasto[k] || 0) + 1; });
  console.log('pelaajia mittarin mukaan: ' + JSON.stringify(tilasto));
  raportti('KPV (oikea data)', pelaajat, docs, Date.now());
}

if (process.argv[2] === 'kpv') kpv().then(() => process.exit(0), (e) => { console.error(e); process.exit(1); });
else {
  const F = require('../tests/helpers/vp_fixture.cjs'), nyt = Date.UTC(2026, 9, 10, 12);
  ['pilotti', 'kypsa', 'kuormitus'].forEach((n) => { const d = F.lataa(n, nyt); raportti('fixture ' + n, d.pelaajat, d.joukkueDocs, nyt); });
}
module.exports = { RAJA, tekniikkaMittari, ehdotettuLuokka };
