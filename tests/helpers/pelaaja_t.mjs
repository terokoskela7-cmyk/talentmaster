/* Testiapu: Pelaaja_v7:n T(avain) (= t(_TMAP[k] || 'pelaaja.' + k)) fi-kielellä, kun sivun funktioita ajetaan vm-/new Function -hiekkalaatikossa ilman sivun omaa T:tä.
   Käyttö: import { PEL_APU } from './helpers/pelaaja_t.mjs';  Object.assign(sandbox, PEL_APU);   (fi-teksti tm_lang.js:stä; puuttuva avain → avain itse, kuten t()) */
import { createRequire } from 'module';
const L = createRequire(import.meta.url)('../../lib/tm_lang.js');
export function T(k, muuttujat) { L.tmAsetaKieli('fi', false); return L.t(/^[a-z_]+\./.test(k) ? k : 'pelaaja.' + k, muuttujat); }
export function _pt(k, muuttujat) { L.tmAsetaKieli('fi', false); return L.t(k, muuttujat); }
/* Kaikki sivun reitittimet kerralla: ...PEL_APU hiekkalaatikon globaaleihin (T, varjostuksenkestävä alias _pT, t-alias _pt) */
export const PEL_APU = { T, _pT: T, _pt };
/* Lähdetason väitteet (toContain 'suomenkielinen teksti') jäävät voimaan reititetyssä lähteessä: T('avain') / _pT / t('ryhmä.avain') → fi-teksti. */
export function laajennaT(src) {
  const sijoita = (kokonainen, kutsu, avain) => {
    L.tmAsetaKieli('fi', false);
    const a = kutsu.startsWith('t') || kutsu === '_pt' ? avain : (/^[a-z_]+\./.test(avain) ? avain : 'pelaaja.' + avain);
    const v = L.t(a); return v === a ? kokonainen : JSON.stringify(v);   // lainausmerkit → lauseke pysyy ajettavana
  };
  return src.replace(/\b(_pT|_pt|T|t)\('([a-zA-Z0-9_.]+)'\)/g, (m, k, a) => sijoita(m, k, a));
}
