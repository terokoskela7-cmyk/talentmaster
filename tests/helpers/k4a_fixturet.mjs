/* K4a · Profiili-välilehden fixturet (selaintestit + kuvat). Keksityt nimet (Demo FC, joukkue Demo U13); datan muoto vastaa pikakenttiä (hh_*, tki_*, tk_lajit_viimeisin, sm_*, adar_*, d3_*, flei_*).
   Nyt-aika tulee harnessista (tests/helpers/kt_sivu.mjs: 2026-10-19). */
const NYT = Date.parse('2026-10-19T09:00:00+03:00');
const ALKOI = new Date(NYT - 16 * 86400000).toISOString();
const PERUS = { syntymaVuosi: 2013, sukupuoli: 'M', joukkue: 'Demo U13', joukkueet: ['demo_u13'], pelipaikka: 'KK' };

/* Topias-tyyppinen (KPV P13): TK-testit (kuljetus-laukaus 13,5 · pujottelu 23,9 · ponnauttelu 31,8 · syöttö 44,1), H-H 30 m (3,17 → 3,08 alle 2 kk) + CMJ 34, ADAR-peli, kehon valmius 62 %, kasvua ei mitattu, jakso: Harhauttaminen */
export const TOPIAS = Object.assign({ id: 'k4a_topias', etunimi: 'Topi', sukunimi: 'Esimerkki' }, PERUS, {
  jaksofokus: { konsepti_avain: 'y_h4', konsepti_nimi: 'Harhauttaminen', alkoi: ALKOI, kesto_vk: 6, lahde: 'valmentaja', domeeni: 'teknis_taktinen' },
  hh_pvm: '2026-10-04', hh_viimeisin: { lin30m: 3.08, cmj: 34 }, hh_historia: [{ pvm: '2026-09-04', lin30m: 3.17, cmj: 34 }, { pvm: '2026-10-04', lin30m: 3.08, cmj: 34 }],
  tki_pvm: '2026-10-04', tki_viimeisin: 40, tk_lajit_viimeisin: { kuljetus_laukaus_s: 13.5, pujottelu_s: 23.9, ponnauttelu_s: 31.8, syotto_s: 44.1 },
  adar_viimeisin: { a: 2.5, d: 2, ac: 2, r: 2, yht: 2.1, pvm: '2026-09-28' }, adar_edellinen: { a: 2, d: 2, ac: 2, r: 2 }, adar_havaintoja: 7, adar_arvioijat: [{ nimi: 'Veera V', rooli: 'valmentaja' }, { nimi: 'Ville P', rooli: 'vp' }], adar_arvioijia: 2,
  d3_taso: 2.8, d3_viimeisin: { pvm: '2026-09-30', pisteet: { coachability: { avg: 2.5, valmentaja: 2.5, pelaaja: 2.5 }, emotional_control: { avg: 3, valmentaja: 2, pelaaja: 4 } } },
  flei_viimeisin: 62, flei_pvm: '2026-10-04' });

/* SJK-tyyppinen: seuran oma testistö — 10 m, 30 m, CMJ + pallo- ja juoksurata (ei TK-testejä, ei kasvua, ei kehon valmiutta) */
export const SJK = Object.assign({ id: 'k4a_sjk', etunimi: 'Sampo', sukunimi: 'Esimerkki' }, PERUS, {
  syntymaVuosi: 2012, joukkue: 'Demo U13',
  hh_pvm: '2026-09-12', hh_viimeisin: { lin10m: 1.95, lin30m: 4.62, cmj: 30 }, sm_juoksu_viimeisin: 8.9, sm_pallo_viimeisin: 11.2 });

/* Vähän dataa: ei mittauksia, yksi pelihavainto */
export const VAHAN = Object.assign({ id: 'k4a_vahan', etunimi: 'Venla', sukunimi: 'Esimerkki' }, PERUS, {
  syntymaVuosi: 2014, sukupuoli: 'N', adar_viimeisin: { a: 2, d: 1, ac: 1, r: 2, yht: 1.5, pvm: '2026-10-12' }, adar_havaintoja: 1 });

/* Vanha data: kaikki mittaukset yli 6 kk vanhoja (ainoa toiminto "Päivitä mittaus") + PHV mitattu (POST) */
export const VANHA = Object.assign({ id: 'k4a_vanha', etunimi: 'Veikko', sukunimi: 'Esimerkki' }, PERUS, {
  syntymaVuosi: 2012, hh_pvm: '2026-02-10', hh_viimeisin: { lin30m: 4.7, cmj: 29 }, tki_pvm: '2026-02-10', tk_lajit_viimeisin: { syotto_s: 40, pujottelu_s: 30 }, flei_viimeisin: 55, flei_pvm: '2026-02-10',
  biologinenIka_viimeisin: { phv_tila_koodi: 'POST', phv_ika: 13.1, maturity_offset: 1.2, pvm: '2026-02-10', kasvutahti_cm_v: 4.2 }, phv_tila: 'POST' });

export const K4A_PELAAJAT = [TOPIAS, SJK, VAHAN, VANHA];
