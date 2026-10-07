/* Apuri (ei testi): ajaa Master_v16:n pelaajakortin renderöijän vm:ssä oikeilla libeillä — snapshot-vertailuun (V4b-1: lippu pois → vanha kortti täsmälleen ennallaan funktioiden erottamisen jälkeen). */
import { readFileSync, existsSync } from 'fs';
import { dirname, join } from 'path';
import { fileURLToPath } from 'url';
import vm from 'vm';
const juuri = join(dirname(fileURLToPath(import.meta.url)), '..', '..');
export const MASTER = readFileSync(join(juuri, 'TalentMaster_Master_v16.html'), 'utf8');
export function pura(src, tunniste) { const i = src.indexOf(tunniste); if (i < 0) throw new Error('ei löydy: ' + tunniste); let d = 0; for (let k = src.indexOf('{', i); k < src.length; k++) { if (src[k] === '{') d++; else if (src[k] === '}' && !--d) return src.slice(i, k + 1); } throw new Error('ei sulkeva'); }
export function libitLadattu(src) {
  const KIINTEA = new Date('2026-10-08T10:00:00Z').getTime(); class KDate extends Date { constructor(...a) { if (a.length) super(...a); else super(KIINTEA); } static now() { return KIINTEA; } }   // deterministinen kello (ikä, vk)
  const ctx = { console: { warn() {}, log() {}, error() {} }, setTimeout: () => 0, clearTimeout() {}, Date: KDate, Math, JSON, Object, Array, String, Number, Promise, RegExp, Error, isFinite, isNaN, parseFloat, parseInt, Map, Set, Symbol };
  ctx.window = ctx; ctx.self = ctx; ctx.globalThis = ctx; ctx.document = { getElementById: () => null, createElement: () => ({}) }; ctx.localStorage = { getItem: () => null, setItem() {} }; ctx.navigator = { onLine: true };
  vm.createContext(ctx);
  const skriptit = [...src.matchAll(/<script src="(lib\/[^"?]+)(?:\?[^"]*)?"><\/script>/g)].map((m) => m[1]);
  for (const s of skriptit) { const p = join(juuri, s); if (!existsSync(p)) continue; try { vm.runInContext(readFileSync(p, 'utf8') + '\n;', ctx, { filename: s }); } catch (e) { /* kuten selaimessa: yksittäisen libin virhe ei kaada muita */ } }
  return ctx;
}

const APU = ['function _tkiMerkkiM(', 'function _tkLajiNimi(', 'function _pvmFiM(', 'function _devIkaSp(', 'function _deltaBadge(', 'function _mEsc(', 'function _mSelBtn(', 'function _ttKorttiHTML(', 'function _mPinfoOsat(', 'function _mStatsHTML(', 'function _renderPinfoFirestore('];
/** Ajaa sivun OIKEAN _renderPinfoFirestore-funktion (+ apurit) oikeilla libeillä; palauttaa #pinfoCard.innerHTML-merkkijonon. extra: ylikirjoitettavat globaalit. */
export function renderPinfo(p, extra) {
  const ctx = libitLadattu(MASTER);
  Object.assign(ctx, { masterT: (x) => x, _testitapahtumat: [{ tila: 'suljettu' }, { tila: 'auki' }], _superAdmin: false, _uid: 'u1', _joukkue: 'KPV U13', _rooli: 'valmentaja', _ktLippu: false, tmPaivaIso: () => '2026-10-08', _mJaksoNapitHTML: () => '<!--JN-->', _ktPaivita() {}, _prVoiNahda: () => true,
    _D3_DIMS: [{ key: 'inner_drive', nimi: 'Sisäinen draivi' }, { key: 'focus', nimi: 'Keskittyminen' }], _avaaD3Arvio() {} }, extra || {});
  let out = null; ctx.document = { getElementById: (id) => (id === 'pinfoCard' ? { set innerHTML(v) { out = v; } } : (id === '_mMitaCard' ? null : null)), createElement: () => ({}) };
  vm.runInContext(APU.map((x) => pura(MASTER, x)).join('\n') + '\nthis._r=_renderPinfoFirestore;', ctx); ctx._r(p); return out;
}
export const PINFO_PELAAJAT = {
  tyhja: { id: 'p0', etunimi: 'Tyhjä', sukunimi: 'Pelaaja', syntymaVuosi: 2013, joukkue: 'KPV U13' },
  minimi: { id: 'p1', etunimi: 'Topias', sukunimi: 'K', syntymaVuosi: 2013, joukkue: 'KPV U13', flei_viimeisin: 62, hh_taso: 3 },
  rikas: { id: 'p2', etunimi: 'Rikas', sukunimi: 'Data', syntymaVuosi: 2012, joukkue: 'KPV U13', pelipaikka: 'KK', hh_taso: 4, hh_taso_edellinen: 3, hh_pvm: '2026-09-20', tki_viimeisin: 58, tki_edellinen: 51, tki_merkki: 'hopea', tki_pvm: '2026-09-21', tki_vahvuus: 'syotto', tki_kehityskohde: 'pujottelu',
    flei_viimeisin: 71, phv_tila: 'PH', talenttiTaso: 'laajennettu', tekninen_varhaiskehitys: { merkki: 'kulta', ika: 10 }, streak: 5, sbl: 2.2, sfl: 2.4, ll: 2.1, diag: 2.3, dfl: 2.0,
    adar_viimeisin: { a: 2.4, d: 2.1, ac: 1.6, r: 2.8, yht: 2.2 }, adar_havaintoja: 4, havainto_porras: 2,
    adar_arvioijat: [{ nimi: 'Veera V', rooli: 'valmentaja', pisteet: { a: 2, d: 2, ac: 1, r: 3 } }, { nimi: 'Ville P', rooli: 'vp', pisteet: { a: 3, d: 2, ac: 2, r: 3 } }], adar_arvioijia: 2, adar_yhtenevyys_taso: 'korkea',
    hh_historia: [{ pvm: '2025-09-20', hh_taso: 2 }, { pvm: '2026-09-20', hh_taso: 4 }], tki_historia: [{ pvm: '2025-09-20', tki: 44 }, { pvm: '2026-09-21', tki: 58 }],
    d3_taso: 3.4, d3_viimeisin: { pisteet: { inner_drive: { avg: 4, valmentaja: 4, pelaaja: 4 }, focus: { avg: 2.5, valmentaja: 3 } } } },
  phvIlmoitettu: { id: 'p3', etunimi: 'Ilmoitettu', sukunimi: 'Ph', syntymaVuosi: 2012, joukkue: 'KPV U13', phv_ilmoitettu_ph: true, tsi_viimeisin: 0.8 },
  eiMitattu: { id: 'p4', etunimi: 'Ei', sukunimi: 'Mitattu', syntymaVuosi: 2013, joukkue: 'KPV U13', phv_ei_mitattu: true, tsi_viimeisin: -0.2, tki_viimeisin: 40 },
  ristiinLukko: { id: 'p5', etunimi: 'Lukko', sukunimi: 'Pelaaja', syntymaVuosi: 2012, joukkue: 'KPV U13', adar_viimeisin: { a: 2, d: 2 }, adar_havaintoja: 1, adar_arvioijat: [{ nimi: 'Muu', rooli: 'valmentaja', uid: 'u9', pisteet: { a: 2 }, aika: Date.parse('2026-10-07') }], adar_arvioijia: 1 },
};
