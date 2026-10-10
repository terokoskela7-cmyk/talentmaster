/* Anonymisoidut fixturet "yksi totuus näkymissä" -kytkentätesteille (ei nimiä). KPV P13 (16: 4 tuoretta / 8 vanhaa / 4 ei dataa; #3 ja #11: TKI alle rajan mutta tallennettu d2_taso korkea),
   KPV P12 (14: 9 tuoretta, joista 5 kehityskohdetta / 5 vanhaa), SJK P15 (20: SM-pohjainen, osa §28-neutraloituja, vanhoja, päivä tuntematon, yksi ilman dataa; stale d2_taso/d1_taso). */
'use strict';
const NYT = Date.UTC(2026, 9, 12, 12);
const TUORE = '2026-03-10', MUISTUTUS = '2025-08-20', VANHA = '2024-08-15';
const jk = [{ id: 'kpv_u13', nimi: 'P13' }, { id: 'kpv_u12', nimi: 'P12' }, { id: 'sjk_p15', nimi: 'P15' }];
const base = (id, joukkue, jid, vuosi) => ({ id, joukkue, joukkueet: [jid], syntymaVuosi: vuosi, sukupuoli: 'M' });

function p13() {
  const tki = { 1: [52, TUORE], 3: [38, TUORE], 7: [47, MUISTUTUS], 11: [34, TUORE], 2: [44, VANHA], 4: [51, VANHA], 5: [39, VANHA], 6: [48, VANHA], 8: [55, VANHA], 9: [42, VANHA], 10: [36, VANHA], 12: [46, VANHA] };
  const out = [];
  for (let i = 1; i <= 16; i++) {
    const p = base('p13_' + i, 'P13', 'kpv_u13', 2013);
    if (tki[i]) { p.tki_viimeisin = tki[i][0]; p.tki_pvm = tki[i][1]; p.d2_taso = 3 + (i % 2) * 0.5; p.d2_lahde = 'tk'; p.d2_pvm = tki[i][1]; }   // d2_taso ≥ 3 kaikilla → vanha Master: 12/16, ei kehityskohteita
    out.push(p);
  }
  out[2].d2_taso = 3.5; out[10].d2_taso = 4;   // #3 ja #11 (TKI 38 / 34) — Masterin popup (taso < 3) ei merkinnyt
  return out;
}
function p12() {
  const tki = [[30, TUORE], [33, TUORE], [35, TUORE], [37, TUORE], [38, TUORE], [45, TUORE], [50, TUORE], [60, TUORE], [48, TUORE], [41, VANHA], [52, VANHA], [43, VANHA], [39, VANHA], [47, VANHA]];
  return tki.map((x, i) => Object.assign(base('p12_' + (i + 1), 'P12', 'kpv_u12', 2014), { tki_viimeisin: x[0], tki_pvm: x[1], d2_taso: 3.5, d2_lahde: 'tk', d2_pvm: x[1] }));
}
function sjkP15() {
  const out = [], SM = (pallo, juoksu, pvm) => ({ sm_pallo_viimeisin: pallo, sm_juoksu_viimeisin: juoksu, tsi_pvm: pvm, tsi_recalc: true, d2_taso: 3, d2_lahde: 'sm_pallo', d2_taso_recalc: true, d2_pvm: pvm });
  const HH = (cmj, mas, pvm) => ({ hh_viimeisin: { cmj: cmj, mas: mas }, hh_pvm: pvm, d1_taso: 2.5, d1_pvm: pvm });
  for (let i = 1; i <= 20; i++) {
    const p = base('sjk_' + i, 'P15', 'sjk_p15', 2011);
    if (i <= 4) Object.assign(p, SM(9.5, 8.5, TUORE), HH(25, 10, TUORE));              // §28-neutraali SM (pallo 1, juoksu 1) + D1 neutraali (PHV tuntematon)
    else if (i <= 10) Object.assign(p, SM(9, 7.75, TUORE), HH(40, 17, TUORE));          // SM ok + D1 ok
    else if (i <= 12) Object.assign(p, SM(9.5, 7.75, TUORE), HH(40, 17, TUORE));        // SM kehityskohde (pallo alle ikätason)
    else if (i <= 15) Object.assign(p, SM(9, 7.75, '2024-05-01'), HH(40, 17, '2024-05-01'));   // vanha
    else if (i <= 17) Object.assign(p, SM(9, 7.75, ''));                                // päivä tuntematon
    out.push(p);
  }
  return out;   // #18–#20 ei dataa (#20 vain nimi)
}
module.exports = { NYT, jk, p13, p12, sjkP15, TUORE, MUISTUTUS, VANHA };
