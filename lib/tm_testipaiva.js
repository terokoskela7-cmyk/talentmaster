/* ════════════════════════════════════════════════════════════════════════
   tm_testipaiva.js — TESTIPÄIVÄN LÄHDE: yksi sääntö työkaluille (kirjoitus) ja näkymille/libeille (luku). PURE. Dual-export: module.exports + window.TM_TESTIPAIVA.
   Periaate: testipäivä on joko OIKEA tai näkyvästi ARVIO (kausi). Ei hiljaista varapäivää: ei kiinteää päivää, ei "tänään".
   KIRJOITUS  tmTestipaiva({pvm, teksti, kausi}) → { pvm: 'YYYY-MM-DD'|null, arvio: bool, lahde: 'oikea'|'arvio'|'tuntematon', kausi }
       oikea päivä (ISO) → oikea · kausiteksti ("syksy 2025", "2025-syksy") TAI vain kausi → arvio, kauden keskipäivä (syksy → 15.10., kevät → 15.4., talvi → 15.1.) · muuten tuntematon (pvm null → pikakenttäparia EI kirjoiteta).
       Pikakenttäpari: <x>_viimeisin + <x>_pvm (+ <x>_pvm_arvio: true vain arviolle; oikealla päivällä kenttä poistetaan) → tmPvmKentat(kentta, tp, poisto).
   LUKU       tmPaivaLahde(p, kentta, opts) → { iso, lahde: 'oikea'|'arvio'|'tuntematon', kausi }
       tuloksen päivä = tulosdokumentin pvm (opts.tulosPvm, opts.tulosArvio) → muuten pikakentän <x>_pvm jos oikea päivä → muuten arvio (<x>_pvm_arvio tai kausiteksti pvm-kentässä) → muuten "tuntematon" (ei tuore, ei kehityskohde).
   tmPaivaVaroitus(syy, tieto) → console.warn + Sentry (kerran per syy): EI hiljaista oletusta.
   ════════════════════════════════════════════════════════════════════════ */
(function (root) {
  'use strict';
  var KAUSI_PAIVA = { kevat: '04-15', syksy: '10-15', talvi: '01-15' };
  var KAUSI_NIMI = { kevat: 'kevät', syksy: 'syksy', talvi: 'talvi' };

  function _iso(x) {
    var d = null;
    if (x && typeof x.toDate === 'function') { try { d = x.toDate(); } catch (e) { return null; } }
    else if (x instanceof Date) d = x;
    else if (x && typeof x === 'object' && typeof x.seconds === 'number') d = new Date(x.seconds * 1000);
    if (d) return isNaN(d.getTime()) ? null : d.getFullYear() + '-' + String(d.getMonth() + 1).padStart(2, '0') + '-' + String(d.getDate()).padStart(2, '0');
    var m = String(x == null ? '' : x).trim().match(/^(\d{4})-(\d{2})-(\d{2})(?:$|[T ])/);
    if (!m) return null;
    var y = +m[1], mo = +m[2], da = +m[3], t = new Date(Date.UTC(y, mo - 1, da));
    return t.getUTCFullYear() === y && t.getUTCMonth() === mo - 1 && t.getUTCDate() === da ? m[1] + '-' + m[2] + '-' + m[3] : null;
  }
  /* "2025-syksy" / "syksy 2025" / "Kevät 2026" / "2022-talvi" → { vuosi, kausi: 'syksy'|'kevat'|'talvi' } */
  function _kausi(s) {
    var t = String(s == null ? '' : s).toLowerCase(), v = t.match(/(20\d{2})/), k = /kev[aä]t/.test(t) ? 'kevat' : /syksy/.test(t) ? 'syksy' : /talvi/.test(t) ? 'talvi' : null;
    return v && k ? { vuosi: v[1], kausi: k } : null;
  }
  function tmKausiPvm(s) { var k = _kausi(s); return k ? { pvm: k.vuosi + '-' + KAUSI_PAIVA[k.kausi], arvio: true, kausi: KAUSI_NIMI[k.kausi] + ' ' + k.vuosi } : null; }

  function tmTestipaiva(o) {
    o = o || {};
    var oikea = _iso(o.pvm);
    if (oikea) return { pvm: oikea, arvio: false, lahde: 'oikea', kausi: null };
    var k = tmKausiPvm(o.teksti) || tmKausiPvm(o.pvm) || tmKausiPvm(o.kausi);
    if (k) return { pvm: k.pvm, arvio: true, lahde: 'arvio', kausi: k.kausi };
    return { pvm: null, arvio: false, lahde: 'tuntematon', kausi: null };
  }
  /* Pikakenttäparin päivä-osa: <x>_pvm + merkintä. poisto = Firestore FieldValue.delete() (oikea päivä poistaa vanhan arviomerkin). */
  function tmPvmKentat(kentta, tp, poisto) {
    var u = {}; if (!tp || !tp.pvm) return u;
    u[kentta + '_pvm'] = tp.pvm;
    if (tp.arvio) u[kentta + '_pvm_arvio'] = true; else if (poisto !== undefined) u[kentta + '_pvm_arvio'] = poisto;
    return u;
  }

  /* arviopäivä (kauden keskipäivä) → kausi-nimi: 15.10. → "syksy 2025", 15.4. → "kevät 2026", 15.1. → "talvi 2022"; muu päivä → null */
  function _kausiIsosta(iso) { var mmdd = iso.slice(5), k = null; Object.keys(KAUSI_PAIVA).forEach(function (x) { if (KAUSI_PAIVA[x] === mmdd) k = x; }); return k ? KAUSI_NIMI[k] + ' ' + iso.slice(0, 4) : null; }

  function tmPaivaLahde(p, kentta, opts) {
    opts = opts || {}; p = p || {};
    var tulos = _iso(opts.tulosPvm);
    if (tulos) return { iso: tulos, lahde: opts.tulosArvio ? 'arvio' : 'oikea', kausi: null };
    var raw = p[kentta + '_pvm'], oikea = _iso(raw);
    if (oikea) return p[kentta + '_pvm_arvio'] === true ? { iso: oikea, lahde: 'arvio', kausi: _kausiIsosta(oikea) } : { iso: oikea, lahde: 'oikea', kausi: null };
    var k = tmKausiPvm(raw);
    if (k) return { iso: k.pvm, lahde: 'arvio', kausi: k.kausi };
    return { iso: null, lahde: 'tuntematon', kausi: null };
  }

  var _varoitetut = {};
  function tmPaivaVaroitus(syy, tieto) {
    if (_varoitetut[syy]) return; _varoitetut[syy] = 1;
    var v = '[tm_testipaiva] ' + syy + (tieto ? ' · ' + tieto : '');
    try { if (typeof console !== 'undefined' && console.warn) console.warn(v); if (root && root.Sentry && typeof root.Sentry.captureMessage === 'function') root.Sentry.captureMessage(v, 'warning'); } catch (e) { /* ei heitä */ }
  }

  var API = { tmKausiPvm: tmKausiPvm, tmTestipaiva: tmTestipaiva, tmPvmKentat: tmPvmKentat, tmPaivaLahde: tmPaivaLahde, tmPaivaVaroitus: tmPaivaVaroitus };
  if (typeof module !== 'undefined' && module.exports) module.exports = API;
  if (root) root.TM_TESTIPAIVA = API;
})(typeof window !== 'undefined' ? window : null);
