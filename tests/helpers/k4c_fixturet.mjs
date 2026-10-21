/* K4c · Kaikki mittaukset -sheetin fixturet (selaintestit + kuvat). Keksityt nimet (Demo FC, Demo U13); datan muoto vastaa pikakenttiä (hh_*, tki_*, adar_*, d3_*, flei_*, sm_*). Nyt-aika tulee harnessista (2026-10-19).
   Topias-tyyppinen kaksi mittausta 30 m (alle 2 kk) = K4a:n TOPIAS; tässä lisäksi pitkä historia (kausi-suodatin, kehitysvauhti), arvioijakohtaiset ADAR-pisteet ja psyykkinen arvio. */
import { TOPIAS, SJK, VAHAN, VANHA } from './k4a_fixturet.mjs';
const PERUS = { syntymaVuosi: 2013, sukupuoli: 'M', joukkue: 'Demo U13', joukkueet: ['demo_u13'], pelipaikka: 'KK' };

/* Pitkä historia: 30 m kolme mittausta (yksi viime kaudelta), CMJ, TK-testit kaksi kertaa, kehon valmius kolme kertaa, kasvu mitattu. Arvioijat: u1 (testikäyttäjä, arvioinut tässä kuussa) + kaksi muuta. */
export const TOPIAS_PITKA = Object.assign({ id: 'k4c_pitka', etunimi: 'Topi', sukunimi: 'Pitkä' }, PERUS, {
  hh_pvm: '2026-10-04', hh_viimeisin: { lin30m: 3.08, cmj: 34, kasirata: 8.4 },
  hh_historia: [{ pvm: '2025-09-10', lin30m: 3.31, cmj: 30, kasirata: 8.9 }, { pvm: '2026-04-12', lin30m: 3.17, cmj: 33, kasirata: 8.6 }, { pvm: '2026-10-04', lin30m: 3.08, cmj: 34, kasirata: 8.4 }],
  tki_pvm: '2026-10-04', tki_viimeisin: 40, tk_lajit_viimeisin: { kuljetus_laukaus_s: 13.5, pujottelu_s: 23.9, ponnauttelu_s: 31.8, syotto_s: 44.1 },
  tki_historia: [{ pvm: '2026-04-12', kuljetus_laukaus_s: 14.6, pujottelu_s: 25.2, ponnauttelu_s: 33.1, syotto_s: 47.3 }, { pvm: '2026-10-04', kuljetus_laukaus_s: 13.5, pujottelu_s: 23.9, ponnauttelu_s: 31.8, syotto_s: 44.1 }],
  adar_viimeisin: { a: 2.5, d: 2, ac: 2, r: 2, yht: 2.1, pvm: '2026-10-12' }, adar_edellinen: { a: 2, d: 2, ac: 1.5, r: 2 }, adar_havaintoja: 7, adar_arvioijia: 3,
  adar_arvioijat: [{ uid: 'u1', nimi: 'Testi Valmentaja', rooli: 'valmentaja', pisteet: { a: 2.5, d: 2, ac: 2, r: 2 }, pvm: '2026-10-12' }, { uid: 'u7', nimi: 'Veera Virta', rooli: 'valmentaja', pisteet: { a: 3, d: 2, ac: 2, r: 2 }, pvm: '2026-10-05' }, { uid: 'u8', nimi: 'Ville Peltola', rooli: 'vp', pisteet: { a: 2, d: 2, ac: 2, r: 2 }, pvm: '2026-09-20' }],
  d3_viimeisin: { pvm: '2026-09-30', pisteet: { inner_drive: { valmentaja: 4, pelaaja: 5, avg: 4.5 }, coachability: { valmentaja: 3, vp: 3, pelaaja: 4, avg: 3.3 }, resilience: { valmentaja: 3, pelaaja: 3, avg: 3 }, focus: { valmentaja: 2, pelaaja: 3, avg: 2.5 }, emotional_control: { valmentaja: 2, vp: 3, pelaaja: 4, avg: 3 } } },
  flei_viimeisin: 62, flei_pvm: '2026-10-04', flei_historia: [{ pvm: '2025-09-10', flei: 51 }, { pvm: '2026-04-12', flei: 57 }, { pvm: '2026-10-04', flei: 62 }],
  flei_ketjut: { SBL: 66, SFL: 64, LL: 60, DIAG: 33, DFL: 62 },
  biologinenIka_viimeisin: { phv_tila_koodi: 'LAH', phv_ika: 13.6, maturity_offset: -0.6, pvm: '2026-09-02', kasvutahti_cm_v: 6.8 }, phv_tila: 'LAH',
  jaksofokus: { konsepti_avain: 'y_h4', konsepti_nimi: 'Harhauttaminen', alkoi: new Date(Date.parse('2026-10-19T09:00:00+03:00') - 16 * 86400000).toISOString(), kesto_vk: 6, lahde: 'valmentaja', domeeni: 'teknis_taktinen' } });

/* Sibbo-tyyppinen: ketteryys (käsirata) + 30 m, kaksi mittausta kolmen kuukauden välein; ei TK-testejä, ei Peliä */
export const SIBBO = Object.assign({ id: 'k4c_sibbo', etunimi: 'Sipi', sukunimi: 'Sibbo' }, PERUS, {
  syntymaVuosi: 2012, hh_pvm: '2026-09-20', hh_viimeisin: { kasirata: 8.1, lin30m: 4.55 }, hh_historia: [{ pvm: '2026-06-10', kasirata: 8.5, lin30m: 4.7 }, { pvm: '2026-09-20', kasirata: 8.1, lin30m: 4.55 }] });

/* Tyhjä pelaaja: ei mittauksia, ei havaintoja */
export const TYHJA = Object.assign({ id: 'k4c_tyhja', etunimi: 'Tyyne', sukunimi: 'Tyhjä' }, PERUS, { sukupuoli: 'N', syntymaVuosi: 2014 });

/* Vanha data: kaikki mittaukset yli 6 kk vanhoja */
export { TOPIAS, SJK, VAHAN, VANHA };
export const K4C_PELAAJAT = [TOPIAS, SJK, VAHAN, VANHA, TOPIAS_PITKA, SIBBO, TYHJA];
