/* TalentMaster — tm_palaute_konteksti.js : VP Raportointi → Harjoittelun laatu, palautteen konteksti. PUHDAS (ei DOM, ei Firestorea).
   · valitseNostot(a, opts)        — 1–3 nostoa arvioinnista palautteen pohjaksi (heikoimmat + yksi vahvuus; malli B: itsereflektion kehityskohde)
   · edellinenArviointi(lista, a)  — saman valmentajan (valmentajaUid) edellinen arviointi samalla mallilla (A/B)
   · edellinenKonteksti(...)       — edellinen + ka + muutos
   · muutosSuunta(nyt, ed)         — 'ylos' | 'alas' | 'sama' | null (puuttuva arvo)
   · palauteMaarat(docs)           — jaettujen palautteiden {yht, aani} listariville
   Teksti/käännös tehdään VP:ssä (vpT); tämä palauttaa vain rakenteen. */
(function (root) {
  'use strict';

  var AVAIMET = { palloliitto: ['a1', 'a2', 'a3', 'a4', 'a5', 'a6', 'a7'], valmennustaidot: ['b1', 'b2', 'b3', 'b4', 'b5', 'b6', 'b7'] };
  var PCT = { a2: 1, a6: 1 };

  function _num(x) { return (x != null && x !== '' && !isNaN(Number(x))) ? Number(x) : null; }
  function _r1(x) { return Math.round(x * 10) / 10; }
  function mallinAvaimet(malli) { return malli === 'valmennustaidot' ? AVAIMET.valmennustaidot : AVAIMET.palloliitto; }
  // Kriteerin asteikon yläraja: A 0–10 (a2/a6 prosentteja 0–100), B 1–5. Vertailu normalisoidaan tällä.
  function maxArvo(malli, avain) { return (malli !== 'valmennustaidot' && PCT[avain]) ? 100 : (malli === 'valmennustaidot' ? 5 : 10); }

  /**
   * @param {object} a  arviointi {malli, vastaukset, reflektio?}
   * @param {{ref?:object, kehityskohdeMalliB?:boolean}} opts  ref = vertailuarvot per avain (A: kansallinen_ka[ikavaihe], B: seura_tavoite_b)
   * @returns {{heikot:Array, vahvuus:object|null, kehityskohde:string|null, onRef:boolean}}
   *   nosto = {avain, arvo, ref, delta, max}; heikot enintään 2 (B: 1 jos kehityskohde on) → yhteensä ≤ 3
   */
  function valitseNostot(a, opts) {
    a = a || {}; opts = opts || {};
    var malli = a.malli === 'valmennustaidot' ? 'valmennustaidot' : 'palloliitto';
    var ref = opts.ref || {};
    var vast = a.vastaukset || {};
    var rivit = [];
    mallinAvaimet(malli).forEach(function (k) {
      var v = _num(vast[k]); if (v == null) return;
      var r = _num(ref[k]);
      var max = maxArvo(malli, k);
      rivit.push({ avain: k, arvo: v, ref: r, delta: r == null ? null : _r1(v - r), norm: r == null ? null : (v - r) / max, max: max });
    });
    var onRef = rivit.some(function (x) { return x.ref != null; });
    var kehityskohde = null;
    if (malli === 'valmennustaidot' && a.reflektio && a.reflektio.kehityskohde) kehityskohde = String(a.reflektio.kehityskohde).trim() || null;
    var heikkoMaara = kehityskohde ? 1 : 2;
    var heikot, vahvuus = null;
    if (onRef) {
      var vertailtavat = rivit.filter(function (x) { return x.norm != null; });
      heikot = vertailtavat.filter(function (x) { return x.norm < 0; }).sort(function (x, y) { return x.norm - y.norm; }).slice(0, heikkoMaara);
      var v0 = vertailtavat.filter(function (x) { return x.norm > 0; }).sort(function (x, y) { return y.norm - x.norm; })[0];
      vahvuus = v0 || null;
    } else {
      // Ei vertailuarvoa (esim. B ilman seuran tavoitetasoa): suhteellinen — selvästi heikoin / vahvin saman arvioinnin sisällä (ero ≥ 20 % asteikosta)
      var norm = function (x) { return x.arvo / x.max; };
      var jarj = rivit.slice().sort(function (x, y) { return norm(x) - norm(y); });
      var huippu = jarj.length ? norm(jarj[jarj.length - 1]) : 0;
      heikot = jarj.slice(0, heikkoMaara).filter(function (x) { return huippu - norm(x) >= 0.2; });
      vahvuus = (jarj.length >= 2 && huippu - norm(jarj[0]) >= 0.2) ? jarj[jarj.length - 1] : null;
    }
    // Älä nosta samaa kriteeriä sekä heikoksi että vahvuudeksi
    if (vahvuus && heikot.some(function (x) { return x.avain === vahvuus.avain; })) vahvuus = null;
    return { heikot: heikot, vahvuus: vahvuus, kehityskohde: kehityskohde, onRef: onRef };
  }

  function _luotuMs(x) {
    var l = x && x.luotu; if (!l) return 0;
    if (typeof l.toMillis === 'function') return l.toMillis();
    if (typeof l.seconds === 'number') return l.seconds * 1000;
    var t = Date.parse(l); return isNaN(t) ? 0 : t;
  }

  /** Saman valmentajan (valmentajaUid) edellinen arviointi samalla mallilla; ei löydy → null. Edellinen = pvm aiempi (tai sama pvm ja aiemmin luotu). */
  function edellinenArviointi(lista, a) {
    if (!a || !a.valmentajaUid || !a.pvm) return null;
    var pvm = String(a.pvm).slice(0, 10), ms = _luotuMs(a);
    var koht = (lista || []).filter(function (x) {
      if (!x || x._id === a._id || x.valmentajaUid !== a.valmentajaUid || x.malli !== a.malli || !x.pvm || x.poistettu) return false;
      var xp = String(x.pvm).slice(0, 10);
      return xp < pvm || (xp === pvm && _luotuMs(x) < ms);
    });
    koht.sort(function (x, y) {
      var xp = String(x.pvm).slice(0, 10), yp = String(y.pvm).slice(0, 10);
      return xp !== yp ? (yp < xp ? -1 : 1) : _luotuMs(y) - _luotuMs(x);
    });
    return koht[0] || null;
  }

  function muutosSuunta(nyt, ed) {
    var n = _num(nyt), e = _num(ed);
    if (n == null || e == null) return null;
    return n > e ? 'ylos' : n < e ? 'alas' : 'sama';
  }

  /** kaFn(a) → arvioinnin kokonaisluku (A: ka 0–10, B: indeksi 1–5). Palauttaa {edellinen, ka, kaEd, muutos(=ka−kaEd, 1 des.)} tai {edellinen:null}. */
  function edellinenKonteksti(lista, a, kaFn) {
    var ed = edellinenArviointi(lista, a);
    if (!ed) return { edellinen: null };
    var ka = _num(kaFn(a)), kaEd = _num(kaFn(ed));
    return { edellinen: ed, ka: ka, kaEd: kaEd, muutos: (ka != null && kaEd != null) ? _r1(ka - kaEd) : null };
  }

  /** Jaetut palautteet listariville: yht = kaikki, aani = ne joilla on audio_url. */
  function palauteMaarat(docs) {
    var d = docs || [];
    return { yht: d.length, aani: d.filter(function (p) { return p && p.audio_url; }).length };
  }

  var API = { valitseNostot: valitseNostot, edellinenArviointi: edellinenArviointi, edellinenKonteksti: edellinenKonteksti, muutosSuunta: muutosSuunta, palauteMaarat: palauteMaarat, maxArvo: maxArvo, mallinAvaimet: mallinAvaimet };
  if (typeof module !== 'undefined' && module.exports) module.exports = API;
  if (root) root.TM_PALAUTE_KONTEKSTI = API;
})(typeof window !== 'undefined' ? window : null);
