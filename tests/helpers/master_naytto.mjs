/* Apuri (ei testi): ajaa Master_v16:n Näyttö-renderöijät (_ktNayttoHTML, _mMitaOsattavaHTML) vm:ssä oikeilla libeillä → K2-baseline (Master ennallaan lohkojen siirron jälkeen).
   Baseline luodaan VANHASTA koodista: TM_SIVU_JUURI=<origin/main-kopio> node tests/helpers/master_naytto.mjs > tests/fixtures/k2_master_naytto_baseline.json */
import { lataaSivu } from './sivu_ajuri.mjs';
import { PINFO_PELAAJAT } from './master_pinfo.mjs';
export function renderNaytto(p) {
  const c = lataaSivu('TalentMaster_Master_v16.html', { masterT: (x) => x, _testitapahtumat: [{ tila: 'suljettu' }], _superAdmin: false, _uid: 'u1', _joukkue: 'KPV U13', _rooli: 'valmentaja', _seuraId: 'kpv',
    _prVoiNahda: () => true, _D3_DIMS: [{ key: 'inner_drive', nimi: 'Sisäinen draivi' }], tmPaivaIso: () => '2026-10-07', _db: { collection: () => { throw new Error('luku!'); } } });
  const kopio = () => JSON.parse(JSON.stringify(p));
  return { naytto: c._ktNayttoHTML(kopio()), kasvu: c._ktKasvuHTML(kopio()), mita: c._mMitaOsattavaHTML(kopio()), stats: c._mStatsHTML(c._mPinfoOsat(kopio()).stats) };
}
export const NAYTTO_PELAAJAT = Object.assign({}, PINFO_PELAAJAT, {
  kasvu: { id: 'k', etunimi: 'K', sukunimi: 'X', syntymaVuosi: 2013, joukkue: 'KPV U13', pelipaikka: 'KK', biologinenIka_viimeisin: { maturity_offset: -1.2, phv_ika: 13.8, pvm: '2026-10-04', kasvutahti_cm_v: 6.1 }, jaksofokus: { konsepti_avain: 'y_h1' } } });
if (process.argv[1] && process.argv[1].endsWith('master_naytto.mjs')) {
  const out = {}; for (const k of Object.keys(NAYTTO_PELAAJAT)) out[k] = renderNaytto(NAYTTO_PELAAJAT[k]);
  process.stdout.write(JSON.stringify(out, null, 1) + '\n');
}
