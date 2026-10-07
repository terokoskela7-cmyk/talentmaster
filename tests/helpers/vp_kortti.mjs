/* Apuri (ei testi): ajaa VP_v25:n OIKEAN pelaajakortin avauksen (_avaaPerPelaajaPikakatsaus) vm:ssä (sivun top-level-määrittelyt + libit) ja palauttaa modaalin HTML:n.
   Snapshot-vertailu V4b-1:ssä: lippu pois → vanha kortti täsmälleen ennallaan funktioiden erottamisen jälkeen. */
import { lataaSivu } from './sivu_ajuri.mjs';
export function renderVpKortti(p, extra) {
  const ctx = lataaSivu('TalentMaster_VP_v25.html', Object.assign({ _seuraId: '', _isDemoMode: true, _ktLippu: false, _jsvPelaajat: [p], _currentWs: 'x', _vpRooli: 'vp', _vpSA: false, db: { collection: () => { throw new Error('luku!'); } } }, extra || {}));
  ctx.window._jsvPelaajat = [p]; ctx.window._ktLippu = false;
  let html = null; const w = { set innerHTML(v) { html = v; }, get firstChild() { return w; }, addEventListener() {}, querySelector: () => null, querySelectorAll: () => [], remove() {}, style: {}, classList: { add() {}, remove() {}, toggle() {} } };
  ctx.document = Object.assign({}, ctx.document, { getElementById: () => null, createElement: () => w, querySelector: () => null, body: { appendChild() {}, style: {} } });
  ctx._avaaPerPelaajaPikakatsaus(0, p.joukkue || 'KPV U13');
  return html;
}
export const VP_PELAAJAT = {
  tyhja: { id: 'v0', etunimi: 'Tyhjä', sukunimi: 'Pelaaja', syntymaVuosi: 2013, joukkue: 'KPV U13', sukupuoli: 'M' },
  minimi: { id: 'v1', etunimi: 'Topias', sukunimi: 'K', syntymaVuosi: 2013, joukkue: 'KPV U13', sukupuoli: 'M', flei_viimeisin: 62, hh_taso: 3 },
  rikas: { id: 'v2', etunimi: 'Rikas', sukunimi: 'Data', syntymaVuosi: 2012, joukkue: 'KPV U13', sukupuoli: 'M', pelipaikka: 'KK', hh_taso: 4, hh_taso_edellinen: 3, hh_pvm: '2026-09-20', hh_viimeisin: { lin5m: 1.1, lin30m: 4.8, cmj: 28, sj: 25, mas: 4.1, syotto: 14, pujottelu: 15 },
    tki_viimeisin: 58, tki_edellinen: 51, tki_merkki: 'hopea', tki_pvm: '2026-09-21', tsi_viimeisin: 0.7, flei_viimeisin: 71, sbl: 2.2, sfl: 2.4, ll: 2.1, diag: 2.3, dfl: 2.0, phv_tila: 'LAH',
    biologinenIka_viimeisin: { maturity_offset: -1.2, phv_ika: 13.8, pvm: '2026-10-04', kasvutahti_cm_v: 6.1 }, testipaivat: { fyysinen_hh: '2026-09-20', tki: '2026-09-21' }, signaali: 'xfactor',
    adar_viimeisin: { a: 2.4, d: 2.1, ac: 1.6, r: 2.8, yht: 2.2 }, adar_havaintoja: 4, d3_taso: 3.4 },
  phvPH: { id: 'v3', etunimi: 'Ph', sukunimi: 'Pelaaja', syntymaVuosi: 2012, joukkue: 'KPV U13', sukupuoli: 'N', phv_tila: 'PH', hh_taso: 2, tki_viimeisin: 35 },
};
