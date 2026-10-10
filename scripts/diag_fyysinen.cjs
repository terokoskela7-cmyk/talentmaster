#!/usr/bin/env node
/* diag_fyysinen.cjs — KUIVA, VAIN LUKU. docs/KARKI_JA_YKSILOLLINEN_KARTOITUS.md: H-H-fyysisen heikkouden NYKYISET säännöt vs. ehdotettu jaettu määritelmä (lib/tm_fyysinen.js, prototyyppi vain tässä).
 * Nykyinen huomio "Fyysiset testit alle ikätason" = laskeJoukkuePoikkeamat alle_normin/profiilipoikkeama (osa-alueen joukkue-ka < 3) + poikkeamaPortti (§28);
 * nykyinen ehdotus "Yksilöllinen ohjelma" = VP_v25 TP_SIGNAALIT hh_taso_alhainen (≥ 2 pelaajaa tallennettu hh_taso < 2,5).
 * Uusi: pelaaja = kehityskohde, kun ≥ 1 H-H-fyysinen testi on tasolla 1 (raakatuloksesta, normiIka(testipäivä), sukupuoli M/N); §28: PRE/LAH/tuntematon + kypsyysgated testi → neutraali.
 * Ajo: node scripts/diag_fyysinen.cjs                 fixturet (ei H-H-dataa → nollat)
 *      node scripts/diag_fyysinen.cjs seura sjk|kpv|…   oikea data, VAIN .get() (gcloud ADC), ei nimiä
 *      node scripts/diag_fyysinen.cjs ika <seura>       tallennettujen hh_taso/d1_taso ikäperusteen tarkistus (normiIka vs. joukkuenimen ikä) */
'use strict';
const path = require('path');
const E = require('../lib/tm_eerikkila_normit.js'), JK = require('../lib/tm_joukkue.js'), LU = require('../lib/tm_koti_luvut.js'), PHV = require('../lib/tm_phv_tila.js'), TK = require('../lib/tm_tekniikka.js');
const NYT_OLETUS = Date.UTC(2026, 9, 10, 12), VANHA_KK = 15, DAY = 86400000;
/* H-H-fyysiset testit (HH_TESTI_MAP, ei tekniikka: sm_pallo/pujottelu/syotto) → osa-alue (kypsyysvahdin avain: LU.kypsyysEstetty) */
const TESTIT = { lin5m: 'kiihdytys', lin10m: 'kiihdytys', lin30m: 'maksinopeus', cmj: 'voima', mas: 'aerobinen', kasirata: 'ketteryys', sm_juoksu: 'suunnanmuutos' };
const ikaSp = (nimi) => { const s = String(nimi || ''), a = s.match(/\b[PTU]?\s?(\d{1,2})\b/i) || s.match(/(\d{1,2})/), b = s.match(/\b([PT])\s?\d/i); return { ika: a ? parseInt(a[1] || a[0], 10) : null, sp: b && b[1].toUpperCase() === 'T' ? 'N' : 'M' }; };
const taso = (testi, arvo, ika, sp) => {   // raakatuloksesta; ikä < 10 → ei; ≥ 20 → M/N; 0 = ei tasoa
  const v = parseFloat(arvo), m = E.HH_TESTI_MAP[testi]; if (!isFinite(v) || v <= 0 || !m || ika == null || ika < 10 || !sp) return 0;
  return E.eerikkilaTaso(m.kmh ? v / 3.6 : v, m.eerikkila, ika >= 20 ? sp : Math.round(ika), sp);
};
function pelaajaLuokka(p, nyt) {
  const hh = p.hh_viimeisin || {}, pvm = (p.testipaivat && p.testipaivat.fyysinen_hh) || p.hh_pvm, tp = TK.tmTekniikkaPvmTila(pvm, nyt), sp = TK.tmTekniikkaSukupuoli(p);
  const tulos = { tila: 'ei_dataa', syy: null, tasot: {}, neutr: 0 };
  if (!Object.keys(TESTIT).some((t) => hh[t] != null)) { tulos.syy = 'ei_mittausta'; return tulos; }
  if (tp.tila === 'tuntematon') { tulos.syy = 'paiva_tuntematon'; return tulos; }
  if (tp.tila === 'vanha') { tulos.syy = 'vanha'; return tulos; }
  if (!sp) { tulos.syy = 'sukupuoli_puuttuu'; return tulos; }
  const ika = E.normiIka(p.syntymaVuosi, tp.iso, p.joukkue); if (ika == null) { tulos.syy = 'ika_puuttuu'; return tulos; } if (ika < 10) { tulos.syy = 'ika_alle_10'; return tulos; }
  let mitattu = 0, heikkoEste = 0, heikkoOk = 0;
  Object.keys(TESTIT).forEach((t) => { if (hh[t] == null) return; const l = taso(t, hh[t], ika, sp); if (!l) return; tulos.tasot[t] = l; mitattu++;
    if (l === 1) { if (LU.kypsyysEstetty(TESTIT[t], p)) heikkoEste++; else heikkoOk++; } });
  if (!mitattu) { tulos.syy = 'ei_tasoa'; return tulos; }
  tulos.neutr = heikkoEste;
  if (heikkoOk > 0) tulos.tila = 'kehityskohde'; else if (heikkoEste > 0) tulos.tila = 'neutraali'; else tulos.tila = 'ok';
  return tulos;
}
function joukkueLuokka(P, nyt) {
  const R = P.map((p) => pelaajaLuokka(p, nyt)), mit = R.filter((r) => r.tila === 'kehityskohde' || r.tila === 'ok'), k = R.filter((r) => r.tila === 'kehityskohde').length, neutr = R.filter((r) => r.tila === 'neutraali').length;
  const kd = (mit.length >= 5 && 3 * k >= mit.length && k > 0) || (P.length > 0 && k > 0 && 2 * k >= P.length);
  return { yht: P.length, mitattu: mit.length, k, neutr, eiDataa: R.filter((r) => r.tila === 'ei_dataa').length, luokka: kd ? 'KEHITYSKOHDE' : (mit.length >= 5 ? 'ok' : (mit.length === 0 ? 'ei fyysistä dataa' : 'ei luokkaa')), otosPieni: (kd || mit.length >= 5) && mit.length < 8, syyt: R.filter((r) => r.tila === 'ei_dataa').reduce((o, r) => (o[r.syy] = (o[r.syy] || 0) + 1, o), {}) };
}
function raportti(nimi, pelaajat, docs, nyt) {
  const per = {}; docs.forEach((d) => { per[d.id] = []; }); pelaajat.forEach((p) => JK.tmPelaajanJoukkueet(p, docs).forEach((id) => { if (per[id]) per[id].push(p); }));
  const pel = pelaajat.map((p) => pelaajaLuokka(p, nyt)), laske = (t) => pel.filter((r) => r.tila === t).length, phv = {}; pelaajat.forEach((p) => { const k = PHV.tmPhvTila(p); phv[k] = (phv[k] || 0) + 1; });
  console.log('\n══ ' + nimi + ' ══  pelaajia ' + pelaajat.length + ' · PHV-tila ' + JSON.stringify(phv));
  console.log('PELAAJAT uusi: kehityskohde ' + laske('kehityskohde') + ' · ok ' + laske('ok') + ' · §28 neutraali ' + laske('neutraali') + ' · ei dataa ' + laske('ei_dataa') + ' ' + JSON.stringify(pel.filter((r) => r.tila === 'ei_dataa').reduce((o, r) => (o[r.syy] = (o[r.syy] || 0) + 1, o), {})));
  console.log('joukkue'.padEnd(26) + 'pel'.padEnd(4) + 'HUOMIO nyt (fyysinen)'.padEnd(34) + 'EHDOTUS nyt'.padEnd(22) + 'UUSI mitattu/kehit/neutr → luokka');
  const rivit = docs.map((d) => {
    const pp = per[d.id]; if (!pp.length) return null; const is = ikaSp(d.nimi), pk = LU.poikkeamaPortti(E.laskeJoukkuePoikkeamat(pp, is.ika, is.sp), pp);
    const fys = pk.filter((x) => (x.tyyppi === 'alle_normin' || x.tyyppi === 'profiilipoikkeama') && x.osaAlue !== 'tekniikka'), aktiiviset = fys.filter((x) => !x.kypsyysEstetty), alaraja = aktiiviset.some((x) => x.alaraja);
    const huomio = aktiiviset.length && !alaraja, estetty = fys.length && !aktiiviset.length;
    const hh25 = pp.filter((p) => p.hh_taso != null && p.hh_taso < 2.5).length, u = joukkueLuokka(pp, nyt);
    console.log(String(d.nimi).slice(0, 25).padEnd(26) + String(pp.length).padEnd(4) + (huomio ? 'KYLLÄ ' + aktiiviset.map((x) => x.osaAlue).join(',') : (alaraja ? 'alaraja' : (estetty ? 'ei (§28 esti)' : 'ei'))).slice(0, 33).padEnd(34) + (hh25 >= 2 ? 'KYLLÄ (' + hh25 + ')' : 'ei (' + hh25 + ')').padEnd(22) + u.mitattu + '/' + u.k + '/' + u.neutr + ' → ' + u.luokka + (u.otosPieni ? ' [otos pieni]' : ''));
    return { huomio: !!huomio, ehd: hh25 >= 2, u };
  }).filter(Boolean);
  console.log('YHTEENSÄ joukkueita ' + rivit.length + ' · huomio nyt ' + rivit.filter((r) => r.huomio).length + ' · ehdotus nyt ' + rivit.filter((r) => r.ehd).length + ' · UUSI kehityskohde ' + rivit.filter((r) => r.u.luokka === 'KEHITYSKOHDE').length + ' · ok ' + rivit.filter((r) => r.u.luokka === 'ok').length + ' · ilman luokkaa ' + rivit.filter((r) => /^ei /.test(r.u.luokka)).length + ' (ei fyysistä dataa ' + rivit.filter((r) => r.u.luokka === 'ei fyysistä dataa').length + ') · otos pieni ' + rivit.filter((r) => r.u.otosPieni).length);
}
async function lue(id) {
  if (require.main !== module) throw new Error('käsittelee tuotantodataa — aja suoraan');
  const admin = require(path.join(__dirname, '..', 'functions', 'node_modules', 'firebase-admin')); admin.initializeApp({ projectId: 'talentmaster-pilot' });
  const db = admin.firestore(), [ps, js] = await Promise.all([db.collection('seurat').doc(id).collection('pelaajat').get(), db.collection('seurat').doc(id).collection('joukkueet').get()]);
  const K = ['id', 'joukkueet', 'joukkue', 'syntymaVuosi', 'sukupuoli', 'hh_viimeisin', 'hh_pvm', 'hh_taso', 'hh_taso_edellinen', 'd1_taso', 'd1_pvm', 'testipaivat', 'phv_tila', 'biologinenIka_viimeisin', 'd2_taso', 'd2_lahde', 'tki_viimeisin', 'tki_edellinen', 'talenttiOhjelma'];
  return { pel: ps.docs.map((d) => { const x = d.data(), o = { id: d.id }; K.forEach((k) => { if (x[k] !== undefined) o[k] = x[k]; }); if (o.testipaivat && o.testipaivat.fyysinen_hh && o.testipaivat.fyysinen_hh.toDate) o.testipaivat = Object.assign({}, o.testipaivat, { fyysinen_hh: o.testipaivat.fyysinen_hh.toDate().toISOString() }); return o; }), docs: js.docs.map((d) => ({ id: d.id, nimi: d.data().nimi || d.id })) };
}
async function ikaTarkistus(id) {
  const { pel } = await lue(id), nyt = Date.now(); let n = 0, hhT = { sama_normiIka: 0, sama_joukkueIka: 0, molemmat: 0, ei_kumpikaan: 0, ei_laskettavissa: 0 }, d1T = Object.assign({}, hhT), eroIka = 0, pvmPuuttuu = 0, tpvmEro = 0;
  pel.forEach((p) => {
    const hh = p.hh_viimeisin; if (!hh || p.hh_taso == null) return; n++;
    const pvm = p.hh_pvm, sp = TK.tmTekniikkaSukupuoli(p), is = ikaSp(p.joukkue), ikaN = E.normiIka(p.syntymaVuosi, pvm, p.joukkue), ikaJ = is.ika; if (!pvm) pvmPuuttuu++; if (ikaN !== ikaJ) eroIka++;
    const hhT3 = (ika) => (ika == null || !sp) ? null : E.laskeHHTaso({ lin30m: hh.lin30m, hyppy_cj: hh.cmj, mas: hh.mas }, ika, sp), d1T3 = (ika) => { const r = (ika == null || !sp) ? null : E.laskeD1Joustava(hh, ika, sp); return r ? r.taso : null; };
    const luok = (T, tallennettu, a, b) => { if (a == null && b == null) { T.ei_laskettavissa++; return; } const x = a != null && Math.abs(a - tallennettu) < 0.051, y = b != null && Math.abs(b - tallennettu) < 0.051; if (x && y) T.molemmat++; else if (x) T.sama_normiIka++; else if (y) T.sama_joukkueIka++; else T.ei_kumpikaan++; };
    luok(hhT, p.hh_taso, hhT3(ikaN), hhT3(ikaJ)); if (p.d1_taso != null) luok(d1T, p.d1_taso, d1T3(ikaN), d1T3(ikaJ));
    const tpv = p.testipaivat && p.testipaivat.fyysinen_hh; if (tpv && pvm && String(tpv).slice(0, 10) !== String(pvm).slice(0, 10)) tpvmEro++;
  });
  console.log('seura ' + id + ': hh_taso + hh_viimeisin ' + n + ' pelaajalla; hh_pvm puuttuu ' + pvmPuuttuu + '; normiIka(hh_pvm) ≠ joukkuenimen ikä ' + eroIka + '; testipaivat.fyysinen_hh ≠ hh_pvm ' + tpvmEro);
  console.log('  tallennettu hh_taso täsmää raakatuloksesta lasketun kanssa: ' + JSON.stringify(hhT));
  console.log('  tallennettu d1_taso täsmää raakatuloksesta lasketun kanssa: ' + JSON.stringify(d1T));
}
const arg = process.argv[2];
if (arg === 'seura') lue(process.argv[3] || 'sjk').then((x) => { console.log('seura ' + process.argv[3] + ': hh_viimeisin ' + x.pel.filter((p) => p.hh_viimeisin).length + ', testipaivat.fyysinen_hh ' + x.pel.filter((p) => p.testipaivat && p.testipaivat.fyysinen_hh).length); raportti((process.argv[3] || 'sjk').toUpperCase(), x.pel, x.docs, Date.now()); process.exit(0); }, (e) => { console.error(e); process.exit(1); });
else if (arg === 'ika') ikaTarkistus(process.argv[3] || 'sjk').then(() => process.exit(0), (e) => { console.error(e); process.exit(1); });
else { const F = require('../tests/helpers/vp_fixture.cjs'); ['pilotti', 'kypsa', 'kuormitus'].forEach((n) => { const d = F.lataa(n, NYT_OLETUS); raportti('fixture ' + n + ' (EI H-H-dataa pelaajilla)', d.pelaajat, d.joukkueDocs, NYT_OLETUS); }); }
module.exports = { pelaajaLuokka, joukkueLuokka, TESTIT };
