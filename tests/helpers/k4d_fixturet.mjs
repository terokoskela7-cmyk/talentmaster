/* K4d · Fyysinen-kortin profiilitulkinta: fixturet (kuvat + testit). Keksityt nimet (Demo FC, Demo U13, 13 v poika).
   Tasot 13-v pojan Eerikkilä-normeilla: 30 m 4,4 s = 4 · 4,7 = 2 · 4,8 = 2 · CMJ 28 = 2 · 30 = 3 · 34 = 4 · kasirata 7,0 s = 2 · 7,1 = 1. */
const PERUS = { syntymaVuosi: 2013, sukupuoli: 'M', joukkue: 'Demo U13', joukkueet: ['demo_u13'], pelipaikka: 'KK' };
const POST = { phv_tila_koodi: 'POST', phv_ika: 13.1, maturity_offset: 1.2, pvm: '2026-10-04', kasvutahti_cm_v: 4.2 };
const hh = (v) => ({ hh_pvm: '2026-10-04', hh_viimeisin: v, hh_historia: [Object.assign({ pvm: '2026-10-04' }, v)] });

/* Voima: CMJ 28 (taso 2) + 30 m 4,8 s (taso 2); kasvu mitattu (POST) */
export const VOIMA = Object.assign({ id: 'k4d_voima', etunimi: 'Voitto', sukunimi: 'Esimerkki' }, PERUS, hh({ lin30m: 4.8, cmj: 28, kasirata: 7.0 }), { biologinenIka_viimeisin: POST, phv_tila: 'POST' });
/* Juoksu: CMJ 34 (taso 4) + 30 m 4,7 s (taso 2); kasvua ei mitattu (tuntematon) → juoksu saa näkyä */
export const JUOKSU = Object.assign({ id: 'k4d_juoksu', etunimi: 'Jukka', sukunimi: 'Esimerkki' }, PERUS, hh({ lin30m: 4.7, cmj: 34, kasirata: 7.0 }));
/* Suunnanmuutos: 30 m 4,4 s (taso 4) + kasirata 7,1 s (taso 1) + CMJ 30 (taso 3); kasvua ei mitattu */
export const SUUNNANMUUTOS = Object.assign({ id: 'k4d_suunta', etunimi: 'Suvi', sukunimi: 'Esimerkki' }, PERUS, { sukupuoli: 'M' }, hh({ lin30m: 4.4, cmj: 30, kasirata: 7.1 }));
export const K4D_PELAAJAT = [VOIMA, JUOKSU, SUUNNANMUUTOS];
