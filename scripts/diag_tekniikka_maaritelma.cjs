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

/* ── lopulliset päätökset (Tero 10.10.2026) ── */
const RAJA = { tki: 40, tsiMarginaali: 0.3, vanhaKk: 15, osuus: 1 / 3, minMitattu: 5, puolet: 1 / 2, otosPieniAlle: 8 };

const ms = (t) => (t && t.toDate ? t.toDate().getTime() : (t ? Date.parse(t) : NaN));
const kk = (t, nyt) => { const m = ms(t); return isNaN(m) ? null : (nyt - m) / (30.44 * DAY); };
const spMN = (p) => (p.sukupuoli === 'N' || p.sukupuoli === 'T' ? 'N' : 'M');

/* TSI-viite = SM-pallo taso 3 − SM-juoksu taso 3 (EERIKKILA_NORMIT, eerikkilaNormiarvo = taso-3-kynnys). Ikä 10–19 numerona, 20+ → 'M'/'N' (aikuiset); alle 10 → ei viitettä. */
function tsiViite(ika, sp) {
  if (ika == null || ika < 10) return null;
  const k = ika >= 20 ? sp : ika, a = E.eerikkilaNormiarvo('sm_pallo', k, sp), b = E.eerikkilaNormiarvo('sm_juoksu', k, sp);
  return a == null || b == null ? null : Math.round((a - b) * 100) / 100;
}

/* Prototyyppi: ketju TKI → TSI, mittarikohtainen vanhuus (15 kk). Vanha mittari ei luokittele (`vanhat`). */
function tekniikkaMittari(p, nyt) {
  const vanhat = [];
  if (p.tki_viimeisin != null) {
    const a = kk(p.tki_pvm, nyt);
    if (a != null && a >= RAJA.vanhaKk) vanhat.push('TKI');
    else return { mittari: 'TKI', arvo: p.tki_viimeisin, heikko: p.tki_viimeisin < RAJA.tki, syy: 'alle ikätason', vanhat };
  }
  if (p.tsi_viimeisin != null) {
    const a = kk(p.tsi_pvm, nyt);
    if (a != null && a >= RAJA.vanhaKk) vanhat.push('TSI');
    else {
      const sp = spMN(p), ika = E.normiIka(p.syntymaVuosi, p.tsi_pvm || null, p.joukkue), viite = tsiViite(ika, sp);
      if (viite != null) return { mittari: 'TSI', arvo: p.tsi_viimeisin, heikko: p.tsi_viimeisin >= viite + RAJA.tsiMarginaali, syy: 'pallo hidastaa suunnanmuutoksissa', vanhat };
      vanhat.push('TSI ilman viitettä (ikä ' + ika + ')');
    }
  }
  return { mittari: null, vanhat };
}
function ehdotettuLuokka(pelaajat, nyt) {
  const M = pelaajat.map((p) => tekniikkaMittari(p, nyt)), mit = M.filter((m) => m.mittari), heikot = mit.filter((m) => m.heikko), lahteet = {};
  mit.forEach((m) => { lahteet[m.mittari] = (lahteet[m.mittari] || 0) + 1; });
  const vanhoja = M.filter((m) => !m.mittari && m.vanhat.length).length;
  const syyTKI = heikot.filter((m) => m.mittari === 'TKI').length, syyTSI = heikot.length - syyTKI;
  const kehityskohde = (mit.length >= RAJA.minMitattu && heikot.length / mit.length >= RAJA.osuus) || (pelaajat.length > 0 && heikot.length / pelaajat.length >= RAJA.puolet);
  return { yht: pelaajat.length, mitattu: mit.length, heikkoja: heikot.length, vanhoja, lahteet,
    luokka: kehityskohde ? 'KEHITYSKOHDE' : (mit.length >= RAJA.minMitattu ? 'ok' : (mit.length === 0 ? 'ei tekniikkadataa' : 'ei luokkaa (' + mit.length + ' mitattua)')),
    otosPieni: (kehityskohde || mit.length >= RAJA.minMitattu) && mit.length < RAJA.otosPieniAlle,
    syy: kehityskohde ? (syyTKI >= syyTSI ? 'alle ikätason' : 'pallo hidastaa suunnanmuutoksissa') : null };
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
    uusiKehityskohde: rivit.filter((r) => r.u.luokka === 'KEHITYSKOHDE').length, ok: rivit.filter((r) => r.u.luokka === 'ok').length,
    eiLuokkaa: rivit.filter((r) => /^ei /.test(r.u.luokka)).length, joistaEiMitattuaLainkaan: rivit.filter((r) => r.u.luokka === 'ei tekniikkadataa').length, otosPieni: rivit.filter((r) => r.u.otosPieni).length };
  console.log('\n══ ' + nimi + ' ══');
  console.log('joukkue'.padEnd(34) + 'pel.'.padEnd(5) + 'HUOMIO nyt'.padEnd(26) + 'EHDOTUS nyt'.padEnd(26) + 'UUSI: mitattu/heikkoja/vanhoja → luokka [lähteet] syy');
  rivit.forEach((r) => console.log(String(r.joukkue).slice(0, 33).padEnd(34) + String(r.pelaajia).padEnd(5) + r.n.huomio.padEnd(26) + r.n.ehdotus.padEnd(26) + r.u.mitattu + '/' + r.u.heikkoja + '/' + r.u.vanhoja + ' → ' + r.u.luokka + (r.u.otosPieni ? ' [otos pieni]' : '') + ' ' + JSON.stringify(r.u.lahteet) + (r.u.syy ? ' · ' + r.u.syy : '')));
  console.log('YHTEENSÄ ' + JSON.stringify(yht));
  return yht;
}

async function kpv() {
  if (require.main !== module) throw new Error('käsittelee tuotantodataa — aja suoraan');
  const admin = require(path.join(__dirname, '..', 'functions', 'node_modules', 'firebase-admin'));
  admin.initializeApp({ projectId: 'talentmaster-pilot' });
  const db = admin.firestore(), seura = (process.argv.find((a) => a.indexOf('--seura=') === 0) || '--seura=kpv').split('=')[1];
  const [ps, js] = await Promise.all([db.collection('seurat').doc(seura).collection('pelaajat').get(), db.collection('seurat').doc(seura).collection('joukkueet').get()]);
  const KENTAT = ['joukkueet', 'joukkue', 'syntymaVuosi', 'sukupuoli', 'tki_viimeisin', 'tki_pvm', 'tsi_viimeisin', 'tsi_pvm', 'hh_viimeisin', 'hh_pvm', 'hh_taso', 'd1_taso', 'd2_taso', 'd2_lahde', 'd2_pvm', 'sm_pallo_viimeisin', 'sm_pallo_taso', 'tki_merkki'];
  const pelaajat = ps.docs.map((d) => { const x = d.data(), o = { id: d.id }; KENTAT.forEach((k) => { if (x[k] !== undefined) o[k] = x[k]; }); return o; });   // vain mittarikentät — ei nimiä
  const docs = js.docs.map((d) => ({ id: d.id, nimi: d.data().nimi || d.id }));
  console.log('seura ' + seura + ': ' + pelaajat.length + ' pelaajaa, ' + docs.length + ' joukkuetta (vain luku)');
  const tilasto = {}; pelaajat.forEach((p) => { const m = tekniikkaMittari(p, Date.now()); const k = m.mittari ? m.mittari : (m.vanhat.length ? 'ei tuoretta (' + m.vanhat[0] + ')' : 'ei mittausta'); tilasto[k] = (tilasto[k] || 0) + 1; });
  console.log('pelaajia mittarin mukaan: ' + JSON.stringify(tilasto));
  const d2l = {}; pelaajat.forEach((p) => { if (p.d2_taso != null) { const k = p.d2_lahde || '(ei lähdettä)'; d2l[k] = (d2l[k] || 0) + 1; } });
  console.log('d2_taso lähteen mukaan: ' + JSON.stringify(d2l) + ' · sm_juoksu/sm_pallo_taso: ' + pelaajat.filter((p) => p.sm_pallo_taso != null).length + ' pelaajalla');
  raportti(seura.toUpperCase() + ' (oikea data)', pelaajat, docs, Date.now());
}


/* ── TSI-jakauma (vain luku): node scripts/diag_tekniikka_maaritelma.cjs tsi sjk ── */
async function tsiJakauma(seura) {
  if (require.main !== module) throw new Error('käsittelee tuotantodataa — aja suoraan');
  const admin = require(path.join(__dirname, '..', 'functions', 'node_modules', 'firebase-admin'));
  admin.initializeApp({ projectId: 'talentmaster-pilot' });
  const db = admin.firestore();
  const ps = await db.collection('seurat').doc(seura).collection('pelaajat').get();
  const rivit = ps.docs.map((d) => d.data()).filter((x) => x.tsi_viimeisin != null).map((x) => {
    const pvm = x.tsi_pvm || x.hh_pvm || null, ika = E.normiIka(x.syntymaVuosi, pvm, x.joukkue);
    return { tsi: Number(x.tsi_viimeisin), ika, sp: spMN(x), pvm: pvm ? String(pvm).slice(0, 10) : null, recalc: !!x.tsi_recalc, tki: x.tki_viimeisin != null };
  }).filter((r) => isFinite(r.tsi));
  const q = (a, f) => { const b = a.slice().sort((x, y) => x - y), i = (b.length - 1) * f, lo = Math.floor(i), hi = Math.ceil(i); return Math.round((b[lo] + (b[hi] - b[lo]) * (i - lo)) * 100) / 100; };
  console.log('seura ' + seura + ': pelaajia ' + ps.size + ', TSI-arvoja ' + rivit.length + ' (' + rivit.filter((r) => r.recalc).length + ' recalc-kirjoittamaa)');
  const pvmLkm = {}; rivit.forEach((r) => { pvmLkm[r.pvm] = (pvmLkm[r.pvm] || 0) + 1; });
  console.log('tsi_pvm-jakauma (päivä: kpl): ' + JSON.stringify(Object.keys(pvmLkm).sort().reduce((o, k) => (o[k] = pvmLkm[k], o), {})));
  const kokoTaulu = (nimi, R) => { console.log('\n' + nimi); console.log('ikä'.padEnd(6) + 'n'.padEnd(5) + 'min'.padEnd(7) + 'p25'.padEnd(7) + 'p50'.padEnd(7) + 'p67'.padEnd(7) + 'p75'.padEnd(7) + 'p90'.padEnd(7) + 'max'.padEnd(7) + '>1,5 s  <0   TKI:ssa'); const ikat = [...new Set(R.map((r) => r.ika))].sort((a, b) => (a == null) - (b == null) || a - b);
    ikat.forEach((i) => { const A = R.filter((r) => r.ika === i), v = A.map((r) => r.tsi); console.log(String(i == null ? '?' : i).padEnd(6) + String(A.length).padEnd(5) + q(v, 0).toString().padEnd(7) + q(v, .25).toString().padEnd(7) + q(v, .5).toString().padEnd(7) + q(v, .667).toString().padEnd(7) + q(v, .75).toString().padEnd(7) + q(v, .9).toString().padEnd(7) + q(v, 1).toString().padEnd(7) + (Math.round(100 * v.filter((x) => x > 1.5).length / v.length) + ' %').padEnd(8) + String(v.filter((x) => x < 0).length).padEnd(5) + A.filter((r) => r.tki).length); });
    const v = R.map((r) => r.tsi); console.log('yht'.padEnd(6) + String(R.length).padEnd(5) + [0, .25, .5, .667, .75, .9, 1].map((f) => q(v, f).toString().padEnd(7)).join('') + (Math.round(100 * v.filter((x) => x > 1.5).length / v.length) + ' %').padEnd(8)); };
  console.log('\nVERTAILU VIITTEESEEN (ikä × sukupuoli): n · viite (taso 3 − taso 3) · raja (+0,3) · p50 · rajan ylittäviä');
  [...new Set(rivit.map((r) => r.ika + '|' + r.sp))].sort().forEach((k) => { const [i, sp] = k.split('|'), A = rivit.filter((r) => r.ika == i && r.sp === sp), v = tsiViite(+i, sp), raja = v == null ? null : Math.round((v + RAJA.tsiMarginaali) * 100) / 100;
    console.log((sp === 'M' ? 'P' : 'T') + i + '  n=' + A.length + '  viite ' + v + '  raja ' + raja + '  p50 ' + q(A.map((r) => r.tsi), .5) + '  ylittää ' + A.filter((r) => v != null && r.tsi >= v + RAJA.tsiMarginaali).length); });
  kokoTaulu('KAIKKI (ikäluokittain)', rivit);
  kokoTaulu('POJAT (M)', rivit.filter((r) => r.sp === 'M'));
  kokoTaulu('TYTÖT (N)', rivit.filter((r) => r.sp === 'N'));
}

if (process.argv[2] === 'viite') {
  console.log('ikä   POJAT: pallo  juoksu  viite  raja(+0,3) | TYTÖT: pallo  juoksu  viite  raja(+0,3)');
  [10, 11, 12, 13, 14, 15, 16, 17, 18, 19, 20].forEach((i) => { const c = ['M', 'N'].map((sp) => { const k = i >= 20 ? sp : i, a = E.eerikkilaNormiarvo('sm_pallo', k, sp), b = E.eerikkilaNormiarvo('sm_juoksu', k, sp); return [a, b, tsiViite(i, sp).toFixed(2), (tsiViite(i, sp) + RAJA.tsiMarginaali).toFixed(2)].join('  '); }); console.log((i >= 20 ? 'M/N' : String(i)).padEnd(6) + c.join('   |   ')); });
} else if (process.argv[2] === 'tsi') tsiJakauma(process.argv[3] || 'sjk').then(() => process.exit(0), (e) => { console.error(e); process.exit(1); });
else if (process.argv[2] === 'kpv') kpv().then(() => process.exit(0), (e) => { console.error(e); process.exit(1); });
else {
  const F = require('../tests/helpers/vp_fixture.cjs'), nyt = Date.UTC(2026, 9, 10, 12);
  ['pilotti', 'kypsa', 'kuormitus'].forEach((n) => { const d = F.lataa(n, nyt); raportti('fixture ' + n, d.pelaajat, d.joukkueDocs, nyt); });
}
module.exports = { RAJA, tekniikkaMittari, ehdotettuLuokka };
