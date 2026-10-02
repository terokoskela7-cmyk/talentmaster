/* ════════════════════════════════════════════════════════════════════════
   tm_mittarit.js — Seurakehitysdashboardin (Kehitystilanne v0) mittarikirjasto. PUHTAAT FUNKTIOT.
   Brief: "CODE BRIEF: Seurakehitysdashboard v0" (Claude Docs, 2.10.2026) — laskentasäännöt, lukittu ydin.

   EI Firestorea, EI DOM:ia, EI seurakohtaisia ehtoja eikä seuraId-literaaleja. Kaikki seurakohtainen tulee
   datasta (kehitysasetukset, seuratuki, seuradokumentti). Palloliiton vertailutasot: lib/tm_kehikot.js.
   Dual-export: module.exports (Node/Vitest) + window.TM_MITTARIT. Lisäksi globaalit HIDDEN_GEM_FLEI,
   laskeD2Taso ja laskeHiddenGem (siirretty VP_v25:stä 2.10.2026, toiminta ennallaan — VP kutsuu niitä nimellä).

   KÄSITTEET (ei sekoiteta):
     · kehitysvauhti   = tmKaariSuunta (lib/tm_kehityskaari.js, pelaajakortti) — EI muutettu tässä
     · SWC             = pienin merkityksellinen muutos: oliko muutos todellinen (K1, testikohtainen)
     · ikätaso         = H-H-tason muutos mittaushetken iällä: kehittyykö odotettua nopeammin (K1b)
   ════════════════════════════════════════════════════════════════════════ */
(function (root) {
  'use strict';

  /* ── Hidden Gem (siirretty VP_v25:stä SELLAISENAAN) ─────────────────────── */
  var HIDDEN_GEM_FLEI = 65;
  function laskeD2Taso(p) {
    // D2 = per-laji Eerikkilä-keskiarvo (d2_taso, kanoninen 1–5) ENSIN — vastaa per-laji-erittelyä.
    // TKI (0–99 kokonaisaikaindeksi) EI määrää D2:ta: lineaarinen TKI/20 ei vastaa per-laji-asteikkoa
    // (Topias: TKI 34 → 1.7 ristiriidassa per-laji-tasojen 2/5/4/5 kanssa). TKI näkyy edelleen omana indeksinään.
    if (p.d2_taso != null) return p.d2_taso;
    if (p.tki_viimeisin != null) return Math.round((p.tki_viimeisin / 20) * 10) / 10;  // fallback jos d2_taso puuttuu
    return null;
  }
  function laskeHiddenGem(p) {
    const d1 = (p.hh_taso != null) ? p.hh_taso : null;
    const d2 = laskeD2Taso(p);
    const dCrit = (d1 != null && d2 != null && d2 >= 3.5 && d1 <= 2.5 && (d2 - d1) >= 1.0);
    const prePhv = (p.phv_tila === 'PRE' || p.phv_tila === 'LAH');
    const tv = p.tekninen_varhaiskehitys;
    const mitali = !!(tv && (tv.merkki === 'kulta' || tv.merkki === 'hopea'));
    let taso = null;
    if (dCrit) { taso = mitali ? 'eliitti' : prePhv ? 'vahvistettu' : 'ehdokas'; }
    const fleiHG = ((p.flei_viimeisin || 0) >= HIDDEN_GEM_FLEI) && p.talenttiOhjelma !== true;
    return { taso: taso, dHG: !!taso, fleiHG: fleiHG, kimpale: (!!taso && fleiHG), mitali: mitali, prePhv: prePhv, d1: d1, d2: d2 };
  }

  /* ── Lukittu ydin ──────────────────────────────────────────────────────── */
  var MIN_N = 5;                     // alle viiden ryhmän prosenttia EI näytetä → "liian pieni ryhmä"
  var VERTAILU_MIN_PV = 56;          // vertailupari: väli vähintään 8 viikkoa …
  var VERTAILU_MAX_KK = 15;          // … ja enintään 15 kuukautta
  var PITKA_VALI_KK = 9;             // yli 9 kk → merkintä "pitkä testiväli" (koulutusmateriaali P5)
  var IKATASO_RAJA = 0.5;            // K1b: Δ ≥ +0,5 nopeammin / ≤ −0,5 hitaammin (sama raja kuin idpJumissa)
  var ARVIO_RAJA = 0.5;              // K3: arvion muutos ≥ ±0,5 asteikolla 1–5 (oletus, sama raja kuin K1b)

  /* SWC_KERROIN — YKSI nimetty vakio (päätetty 2.10.2026, ALUSTAVA kunnes vahvistetaan).
     OLETUS: lib/tm_eerikkila_normit.js:n tasorajat t2–t5 vastaavat ikäluokan persentiilejä P20/P40/P60/P80.
     Normaalijakaumassa P20→P80 = 2 × 0,8416 ≈ 1,6832 keskihajontaa, joten SD ≈ |t5 − t2| / 1,6832 ja
     SWC = 0,2 × SD (Hopkins: pienin merkityksellinen muutos) = 0,2 / 1,6832 × |t5 − t2| ≈ 0,119 × |t5 − t2|.
     Esim. P14 pojat 30 m: |4,17 − 4,57| = 0,40 s → SWC ≈ 0,048 s; CMJ: |38,1 − 30,7| = 7,4 cm → SWC ≈ 0,88 cm.
     Normilähteet eivät kerro tasorajojen tilastollista merkitystä → luvun tila näytetään "Alustava". */
  var SWC_KERROIN = 0.2 / 1.6832;
  var SWC_TILA = 'alustava';
  var SEURA_SWC_MIN_N = 10;          // varaskaala 0,2 × seuran hajonta vaatii ≥ 10 mittausta

  /* Testit (K1). Suunta on testin ominaisuus. mas tallennetaan km/h, normi on m/s (×3,6). */
  var TESTIT = {
    lin10m:    { nimi: '10 m',            eerikkila: 'nopeus_10m', pienempi: true,  rooli: 'avain' },
    lin30m:    { nimi: '30 m',            eerikkila: 'nopeus_30m', pienempi: true,  rooli: 'avain' },
    cmj:       { nimi: 'CMJ',             eerikkila: 'hyppy_cj',   pienempi: false, rooli: 'avain' },
    mas:       { nimi: 'MAS',             eerikkila: 'mas',        pienempi: false, rooli: 'avain', kmh: true },
    lin5m:     { nimi: '5 m',             eerikkila: 'nopeus_5m',  pienempi: true,  rooli: 'diagnostiikka' },
    sm_juoksu: { nimi: 'SM ilman palloa', eerikkila: 'sm_juoksu',  pienempi: true,  rooli: 'diagnostiikka' },
    sm_pallo:  { nimi: 'SM pallolla',     eerikkila: 'sm_pallo',   pienempi: true,  rooli: 'diagnostiikka' },
    kasirata:  { nimi: 'Kasirata',        eerikkila: 'kasirata',   pienempi: true,  rooli: 'muu' },
  };
  var AVAINTESTIT = ['lin10m', 'lin30m', 'cmj', 'mas'];
  var DIAGNOSTIIKKA = ['lin5m', 'sm_juoksu', 'sm_pallo'];

  /* K1-tila: kolmiportainen koulutusmateriaalin mukaan. Ilman CV:tä vain ylos / vaihtelu / alas. */
  var TILAT = {
    vahva_ylos: '↑', mahd_ylos: '↗', vaihtelu: '→', mahd_alas: '↘', vahva_alas: '↓', ei_vertailukelpoinen: '–',
  };

  /* ── Riippuvuudet (lib/tm_eerikkila_normit.js) — selaimessa globaali, Nodessa require ──────── */
  var _EN = null;
  function _eerikkila() {
    if (_EN) return _EN;
    if (typeof EERIKKILA_NORMIT !== 'undefined' && typeof normiIka === 'function') {
      _EN = { EERIKKILA_NORMIT: EERIKKILA_NORMIT, normiIka: normiIka,
        laskeHHTaso: (typeof laskeHHTaso === 'function') ? laskeHHTaso : null };
    } else if (typeof require === 'function') {
      try { _EN = require('./tm_eerikkila_normit.js'); } catch (e) { _EN = null; }
    }
    return _EN;
  }

  /* ── Päivämäärät ───────────────────────────────────────────────────────── */
  function _pvm(x) {
    if (x == null || x === '') return null;
    if (x instanceof Date) return isNaN(x.getTime()) ? null : x;
    if (typeof x.toDate === 'function') return x.toDate();
    if (typeof x.seconds === 'number') return new Date(x.seconds * 1000);
    if (typeof x._seconds === 'number') return new Date(x._seconds * 1000);
    var m = String(x).match(/^(\d{4})-(\d{2})-(\d{2})/);
    if (m) return new Date(Date.UTC(+m[1], +m[2] - 1, +m[3]));
    var d = new Date(x); return isNaN(d.getTime()) ? null : d;
  }
  function _iso(d) { d = _pvm(d); return d ? d.toISOString().slice(0, 10) : null; }
  function pvmFi(x) {   // pp.kk.vvvv (datan tuoreuden invariantti)
    var d = _pvm(x); if (!d) return null;
    var p = function (n) { return (n < 10 ? '0' : '') + n; };
    return p(d.getUTCDate()) + '.' + p(d.getUTCMonth() + 1) + '.' + d.getUTCFullYear();
  }
  function _paivaa(a, b) { return Math.round((_pvm(b) - _pvm(a)) / 864e5); }
  function _lisaaKk(d, kk) { d = _pvm(d); var x = new Date(d.getTime()); x.setUTCMonth(x.getUTCMonth() + kk); return x; }
  /* Jakso: kevät 1.1.–30.6. · syksy 1.7.–31.12. */
  function jakso(x) { var d = _pvm(x); if (!d) return null; return { vuosi: d.getUTCFullYear(), jakso: d.getUTCMonth() < 6 ? 'kevat' : 'syksy' }; }
  function jaksonRajat(vuosi, j) {
    return j === 'kevat' ? { alku: vuosi + '-01-01', loppu: vuosi + '-06-30' }
      : j === 'syksy' ? { alku: vuosi + '-07-01', loppu: vuosi + '-12-31' }
      : { alku: vuosi + '-01-01', loppu: vuosi + '-12-31' };
  }
  function onValilla(x, alku, loppu) { var s = _iso(x); return !!s && (!alku || s >= alku) && (!loppu || s <= loppu); }

  /* ── Osuudet (lukittu ydin: N < 5 → ei prosenttia; "ei arvioitu" ≠ 0) ─────────────────────── */
  function osuus(osoittaja, nimittaja) {
    if (!nimittaja) return { arvo: null, n: osoittaja || 0, N: 0, tila: 'ei_dataa' };
    if (nimittaja < MIN_N) return { arvo: null, n: osoittaja, N: nimittaja, tila: 'liian_pieni' };
    return { arvo: Math.round(osoittaja / nimittaja * 1000) / 10, n: osoittaja, N: nimittaja, tila: 'ok' };
  }
  function keskiarvo(arvot) {
    var v = (arvot || []).filter(function (x) { return typeof x === 'number' && isFinite(x); });
    if (!v.length) return null;
    return v.reduce(function (a, b) { return a + b; }, 0) / v.length;
  }

  /* ── SWC ───────────────────────────────────────────────────────────────── */
  function _sukupuoli(sp) { var s = String(sp || '').toUpperCase(); return (s === 'M' || s === 'P') ? 'pojat' : (s === 'N' || s === 'T') ? 'tytot' : null; }
  function _normiRivi(testi, ika, sp) {
    var t = TESTIT[testi], E = _eerikkila(); if (!t || !E || ika == null) return null;
    var n = E.EERIKKILA_NORMIT[t.eerikkila], ryhma = _sukupuoli(sp);
    if (!n || !ryhma || !n[ryhma]) return null;
    var avain = ika > 19 ? (ryhma === 'pojat' ? 'M' : 'N') : Math.round(ika);
    var r = n[ryhma][avain];
    return (Array.isArray(r) && r.length === 4) ? r : null;
  }
  /* SWC normista testin tallennusyksikössä (mas km/h). null = ei normia → varaskaala. */
  function swcNormista(testi, ika, sp) {
    var r = _normiRivi(testi, ika, sp); if (!r) return null;
    var swc = Math.abs(r[3] - r[0]) * SWC_KERROIN;
    if (TESTIT[testi].kmh) swc *= 3.6;
    return swc;
  }
  /* Varaskaala: 0,2 × seuran saman sukupuolen ja syntymävuoden hajonta (≥ 10 mittausta), muuten koko ikävaihe.
     Kutsuja antaa arvojoukot; tämä valitsee ensimmäisen riittävän. */
  function swcSeurasta(arvojoukot) {
    for (var i = 0; i < (arvojoukot || []).length; i++) {
      var v = (arvojoukot[i] || []).filter(function (x) { return typeof x === 'number' && isFinite(x); });
      if (v.length >= SEURA_SWC_MIN_N) {
        var ka = keskiarvo(v), sd = Math.sqrt(v.reduce(function (a, x) { return a + (x - ka) * (x - ka); }, 0) / (v.length - 1));
        return 0.2 * sd;
      }
    }
    return null;
  }

  /* ── PHV mittaushetkellä: lähin biologinen_ika-dokumentti testipäivänä tai ennen ───────────── */
  function phvPisteelle(bioDocs, testiPvm) {
    var raja = _iso(testiPvm); if (!raja) return null;
    var paras = null;
    (bioDocs || []).forEach(function (b) {
      var p = _iso(b && (b.mittauspaiva || b.pvm || b.id));   // biologinen_ika: mittauspaiva (= doc-id, tm_bioika.js)
      if (!p || p > raja) return;
      if (!paras || p > paras.pvm) paras = { pvm: p, koodi: b.phv_tila_koodi || b.phv_tila || null };
    });
    return paras ? paras.koodi : null;
  }

  /* ── Vertailupari (K1/K1b): KAKSI VIIMEISINTÄ pistettä, joissa testillä on arvo ─────────────── */
  function vertailupari(historia, arvoFn) {
    var pisteet = (historia || []).filter(function (h) { return h && _pvm(h.pvm) && typeof arvoFn(h) === 'number' && isFinite(arvoFn(h)); })
      .slice().sort(function (a, b) { return _iso(a.pvm) < _iso(b.pvm) ? -1 : _iso(a.pvm) > _iso(b.pvm) ? 1 : 0; });
    if (pisteet.length < 2) return { ok: false, syy: 'ei_paria', b: pisteet[pisteet.length - 1] || null };
    var a = pisteet[pisteet.length - 2], b = pisteet[pisteet.length - 1];
    var valiPv = _paivaa(a.pvm, b.pvm);
    var pitka = _pvm(b.pvm) > _lisaaKk(a.pvm, PITKA_VALI_KK);
    if (valiPv < VERTAILU_MIN_PV) return { ok: false, syy: 'liian_lyhyt', a: a, b: b, valiPv: valiPv };
    if (_pvm(b.pvm) > _lisaaKk(a.pvm, VERTAILU_MAX_KK)) return { ok: false, syy: 'liian_pitka', a: a, b: b, valiPv: valiPv };
    return { ok: true, a: a, b: b, valiPv: valiPv, pitkaVali: pitka };
  }

  /* ── K1: testikohtainen kehitystila ────────────────────────────────────────
     o = { historia (hh_historia[]), testi, sukupuoli 'M'/'N', syntymaVuosi, joukkue?, bioDocs?, cv? (suhteellinen,
           esim. 0.015), swcSeura? (varaskaala kutsujalta) }
     → { tila, symboli, syy?, muutos, swc, swcLahde, valiPv, pitkaVali, pvmA, pvmB, phvA, phvB } */
  function k1Tila(o) {
    var t = TESTIT[o.testi]; if (!t) return { tila: 'ei_vertailukelpoinen', syy: 'tuntematon_testi' };
    var pari = vertailupari(o.historia, function (h) { return h[o.testi]; });
    var pohja = { testi: o.testi, pvmB: pari.b ? _iso(pari.b.pvm) : null };
    if (!pari.ok) return Object.assign(pohja, { tila: 'ei_vertailukelpoinen', symboli: TILAT.ei_vertailukelpoinen, syy: pari.syy,
      pvmA: pari.a ? _iso(pari.a.pvm) : null, valiPv: pari.valiPv == null ? null : pari.valiPv });
    var phvA = phvPisteelle(o.bioDocs, pari.a.pvm), phvB = phvPisteelle(o.bioDocs, pari.b.pvm);
    var yhteiset = { pvmA: _iso(pari.a.pvm), pvmB: _iso(pari.b.pvm), valiPv: pari.valiPv, pitkaVali: pari.pitkaVali,
      phvA: phvA, phvB: phvB, arvoA: pari.a[o.testi], arvoB: pari.b[o.testi] };
    if (phvA === 'PH' || phvB === 'PH') return Object.assign(pohja, yhteiset, { tila: 'ei_vertailukelpoinen', symboli: TILAT.ei_vertailukelpoinen, syy: 'kasvupyrahdys' });
    var E = _eerikkila();
    var ika = E ? E.normiIka(o.syntymaVuosi, yhteiset.pvmB, o.joukkue) : null;
    var swc = swcNormista(o.testi, ika, o.sukupuoli), lahde = 'normi';
    if (swc == null) { swc = (typeof o.swcSeura === 'number') ? o.swcSeura : null; lahde = swc == null ? null : 'seura'; }
    var raaka = yhteiset.arvoB - yhteiset.arvoA;
    var parannus = t.pienempi ? -raaka : raaka;   // > 0 = parempi
    if (swc == null) return Object.assign(pohja, yhteiset, { tila: 'ei_vertailukelpoinen', symboli: TILAT.ei_vertailukelpoinen, syy: 'ei_swc', muutos: raaka });
    var cvRaja = (typeof o.cv === 'number' && o.cv > 0) ? o.cv * Math.abs(yhteiset.arvoA) : null;
    var tila;
    if (Math.abs(parannus) < swc) tila = 'vaihtelu';
    else if (cvRaja == null) tila = parannus > 0 ? 'vahva_ylos' : 'vahva_alas';   // ilman CV:tä ↑ / → / ↓
    else if (Math.abs(parannus) >= cvRaja) tila = parannus > 0 ? 'vahva_ylos' : 'vahva_alas';
    else tila = parannus > 0 ? 'mahd_ylos' : 'mahd_alas';
    return Object.assign(pohja, yhteiset, { tila: tila, symboli: TILAT[tila], muutos: raaka, swc: swc, swcLahde: lahde, swcTila: SWC_TILA, cvKaytetty: cvRaja != null });
  }

  /* Pelaajataso (päätetty 2.10.): kehittyy, kun ≥ puolet MITATUISTA avaintesteistä on ↑ eikä yksikään ↓.
     Ei mitattuja → null ("ei vielä dataa", ei 0). */
  function pelaajaKehittyy(tilat) {
    var mitatut = (tilat || []).filter(function (x) { return x && x.tila && x.tila !== 'ei_vertailukelpoinen'; });
    if (!mitatut.length) return null;
    var ylos = mitatut.filter(function (x) { return x.tila === 'vahva_ylos'; }).length;
    var alas = mitatut.filter(function (x) { return x.tila === 'vahva_alas'; }).length;
    return ylos * 2 >= mitatut.length && alas === 0;
  }

  /* Laskentatyyppi A — kehitysosuus: ↑ / (↑ + → + ↓). ↗/↘ näytetään erikseen, ei-vertailukelpoiset eivät ole nimittäjässä. */
  function kehitysosuus(tilat) {
    var lk = { vahva_ylos: 0, mahd_ylos: 0, vaihtelu: 0, mahd_alas: 0, vahva_alas: 0, ei_vertailukelpoinen: 0 };
    (tilat || []).forEach(function (x) { if (x && lk[x.tila] != null) lk[x.tila]++; });
    var nim = lk.vahva_ylos + lk.vaihtelu + lk.vahva_alas;
    return Object.assign({ jakauma: lk }, osuus(lk.vahva_ylos, nim));
  }

  /* ── K1b: kehitys ikätasoon nähden (päätetty 2.10.: normi luetaan tarkalla iällä interpoloimalla) ────────
     Uusia viitekäyriä ei keksitä: lib/tm_eerikkila_normit.js:n tasorajat luetaan halutulla iällä vierekkäisten
     ikäluokkien välillä → tammikuun ikäluokan vaihto ei enää laske tasoa. Taso on JATKUVA luku (vain K1b:ssä)
     testeistä 30 m, CMJ, MAS. Ikäluokan k normi vastaa tarkkaa ikää k − 0,5 (ikäluokka = ikä vuoden lopussa).
       · vertailu 'kalenteri' (oletus): tarkka ikä mittauspäivänä
       · vertailu 'kehitysvaihe' (arvio): biologinen ikä = tyypillinen PHV-ikä sukupuolittain + maturity_offset
         lähimmästä kypsyysmittauksesta (≤ 180 pv testipäivästä); puuttuu → kalenteri-ikä (pelaajaa ei suljeta pois)
     Normitaulukon ulkopuolinen ikä → lähin ikäluokka + merkintä (rajattu). PH-sääntö (ei vertailukelpoinen) ennallaan. */
  var K1B_TESTIT = [['lin30m', 'nopeus_30m', true, false], ['cmj', 'hyppy_cj', false, false], ['mas', 'mas', false, true]];
  var TYYPILLINEN_PHV_IKA = { pojat: 13.8, tytot: 11.9 };   // populaatiokeskiarvot (Malina ym. 2004; Mirwald 2002) — ARVIO
  var KYPSYYS_MAX_PV = 180;
  function _tarkkaIka(p, pvm) {
    var d = _pvm(pvm); if (!d) return null;
    var s = _pvm(p.syntymaaika);
    if (!s && p.syntymaVuosi) s = new Date(Date.UTC(p.syntymaVuosi, 6, 1));   // vain vuosi → oletus 1.7.
    return s ? (d - s) / (365.25 * 864e5) : null;
  }
  function _rajatIalla(eer, sp, luokkaIka) {
    var E = _eerikkila(), ryhma = _sukupuoli(sp); if (!E || !ryhma) return null;
    var t = E.EERIKKILA_NORMIT[eer] && E.EERIKKILA_NORMIT[eer][ryhma]; if (!t) return null;
    var rajattu = luokkaIka < 10 || luokkaIka > 19, a = Math.max(10, Math.min(19, luokkaIka));
    var lo = Math.floor(a), hi = Math.min(19, lo + 1), w = a - lo;
    if (!t[lo] || !t[hi]) return null;
    // EERIKKILA_NORMIT-taulukko on järjestyksessä [t5, t4, t3, t2] (paras ensin) → käännetään muotoon [t2, t3, t4, t5]
    return { rajat: t[lo].map(function (x, i) { return x + (t[hi][i] - x) * w; }).reverse(), rajattu: rajattu };
  }
  /* Jatkuva taso 1–5: rajat [t2,t3,t4,t5] = tasojen 2,3,4,5 alarajat; lineaarinen välillä, alle t2 jatkettu välillä t2–t3. */
  function jatkuvaTaso(arvo, rajat, pienempi) {
    var v = pienempi ? -arvo : arvo, r = rajat.map(function (x) { return pienempi ? -x : x; });
    if (v >= r[3]) return 5;
    for (var i = 2; i >= 0; i--) if (v >= r[i]) return 2 + i + (v - r[i]) / (r[i + 1] - r[i]);
    return Math.max(1, 2 - (r[0] - v) / (r[1] - r[0]));
  }
  function k1bTasoPisteelle(h, ika, sp) {
    if (ika == null) return null;
    var tasot = [], rajattu = false;
    K1B_TESTIT.forEach(function (t) {
      var arvo = h[t[0]]; if (typeof arvo !== 'number' || !isFinite(arvo)) return;
      var r = _rajatIalla(t[1], sp, ika + 0.5); if (!r) return;
      rajattu = rajattu || r.rajattu;
      tasot.push(jatkuvaTaso(t[3] ? arvo / 3.6 : arvo, r.rajat, t[2]));
    });
    return tasot.length ? { taso: keskiarvo(tasot), rajattu: rajattu } : null;
  }
  function _kypsyysOffset(bioDocs, pvm) {
    var d = _pvm(pvm), paras = null;
    (bioDocs || []).forEach(function (b) {
      var bp = _pvm(b && (b.mittauspaiva || b.pvm || b.id)); if (!bp || typeof b.maturity_offset !== 'number') return;
      var ero = Math.abs(bp - d) / 864e5; if (ero > KYPSYYS_MAX_PV) return;
      if (!paras || ero < paras.ero) paras = { ero: ero, offset: b.maturity_offset };
    });
    return paras ? paras.offset : null;
  }
  /* o = { historia, sukupuoli, syntymaVuosi, syntymaaika, bioDocs, vertailu:'kalenteri'|'kehitysvaihe' } */
  function k1bTila(o) {
    var bio = o.vertailu === 'kehitysvaihe', kalVara = false, rajattu = false;
    var tasot = (o.historia || []).map(function (h) {
      if (!h) return null;
      var ika = _tarkkaIka(o, h.pvm);
      if (bio) {
        var off = _kypsyysOffset(o.bioDocs, h.pvm), phv = TYYPILLINEN_PHV_IKA[_sukupuoli(o.sukupuoli)];
        if (off != null && phv) ika = phv + off; else kalVara = true;
      }
      var t = k1bTasoPisteelle(h, ika, o.sukupuoli);
      if (t && t.rajattu) rajattu = true;
      return t ? { pvm: h.pvm, taso: t.taso } : null;
    }).filter(Boolean);
    var pari = vertailupari(tasot, function (h) { return h.taso; });
    var lisa = { vertailu: bio ? 'kehitysvaihe' : 'kalenteri', kalenteriVara: bio && kalVara, rajattu: rajattu };
    if (!pari.ok) return Object.assign({ tila: 'ei_vertailukelpoinen', syy: pari.syy, pvmB: pari.b ? _iso(pari.b.pvm) : null }, lisa);
    var phvA = phvPisteelle(o.bioDocs, pari.a.pvm), phvB = phvPisteelle(o.bioDocs, pari.b.pvm);
    var d = Math.round((pari.b.taso - pari.a.taso) * 100) / 100;
    var r = Object.assign({ delta: d, tasoA: Math.round(pari.a.taso * 100) / 100, tasoB: Math.round(pari.b.taso * 100) / 100,
      pvmA: _iso(pari.a.pvm), pvmB: _iso(pari.b.pvm), valiPv: pari.valiPv, pitkaVali: pari.pitkaVali, tilaMerkinta: 'alustava' }, lisa);
    if (phvA === 'PH' || phvB === 'PH') return Object.assign(r, { tila: 'ei_vertailukelpoinen', syy: 'kasvupyrahdys' });
    return Object.assign(r, { tila: d >= IKATASO_RAJA ? 'nopeammin' : d <= -IKATASO_RAJA ? 'hitaammin' : 'tahdissa' });
  }
  /* Vaadittu vauhti (näyttöön): normin tasorajan muutos vuodessa pelaajan tasolla, esim. 30 m tason 3 pitäminen. */
  function vaadittuVauhti(testi, ika, sp, taso) {
    var t = K1B_TESTIT.find(function (x) { return x[0] === testi; }); if (!t || ika == null) return null;
    var a = _rajatIalla(t[1], sp, ika + 0.5), b = _rajatIalla(t[1], sp, ika + 1.5); if (!a || !b) return null;
    var i = Math.max(0, Math.min(3, Math.round((taso || 3) - 2)));
    var v = b.rajat[i] - a.rajat[i]; return t[3] ? v * 3.6 : v;
  }

  /* ── Laskentatyypit B–F ─────────────────────────────────────────────────── */
  function tavoitetasoOsuus(arvot, raja, pienempiParempi) {     // B
    var v = (arvot || []).filter(function (x) { return typeof x === 'number' && isFinite(x); });
    return osuus(v.filter(function (x) { return pienempiParempi ? x <= raja : x >= raja; }).length, v.length);
  }
  function maaraVsTavoite(maara, tavoite) {                     // C
    return { arvo: maara == null ? null : maara, tavoite: tavoite == null ? null : tavoite };
  }
  function asteikonKeskiarvo(arvot) {                           // D
    var v = (arvot || []).filter(function (x) { return typeof x === 'number' && isFinite(x); });
    return { arvo: v.length ? Math.round(keskiarvo(v) * 10) / 10 : null, N: v.length };
  }
  function vaatimusTayttyy(arvo) {                              // F: true / false / null (= puuttuu)
    return arvo === true ? true : arvo === false ? false : null;
  }

  /* ── Lohko 1: tavoitteen tila ────────────────────────────────────────────
     o = { toteuma, tavoite, tyyppi: 'maara' (kertyy vuoden mittaan → lineaarinen ennuste) | 'taso' (osuus/keskiarvo:
           ennuste = toteuma), pienempiParempi?, kasinKirjattava?, nyt (pvm), vuosi }
     → { tila: 'tayttynyt'|'raiteilla'|'riskissa'|'puuttuu', ennuste } */
  function ennuste31_12(toteuma, nyt, vuosi) {
    if (typeof toteuma !== 'number') return null;
    var d = _pvm(nyt), alku = Date.UTC(vuosi, 0, 1), loppu = Date.UTC(vuosi, 11, 31, 23, 59, 59);
    if (!d) return null;
    var kulunut = Math.min(1, Math.max(0, (d.getTime() - alku) / (loppu - alku)));
    if (kulunut <= 0) return null;
    return Math.round(toteuma / kulunut * 10) / 10;
  }
  function tavoitteenTila(o) {
    if (o.toteuma == null || (o.kasinKirjattava && o.toteuma === undefined)) return { tila: 'puuttuu', ennuste: null };
    if (o.tavoite == null) return { tila: null, ennuste: null };
    var parempi = function (a, b) { return o.pienempiParempi ? a <= b : a >= b; };
    if (typeof o.toteuma === 'boolean') return { tila: o.toteuma === true ? 'tayttynyt' : 'riskissa', ennuste: null };
    if (parempi(o.toteuma, o.tavoite)) return { tila: 'tayttynyt', ennuste: o.tyyppi === 'maara' ? ennuste31_12(o.toteuma, o.nyt, o.vuosi) : o.toteuma };
    var e = o.tyyppi === 'maara' ? ennuste31_12(o.toteuma, o.nyt, o.vuosi) : o.toteuma;
    return { tila: (e != null && parempi(e, o.tavoite)) ? 'raiteilla' : 'riskissa', ennuste: e };
  }

  var API = {
    MIN_N: MIN_N, VERTAILU_MIN_PV: VERTAILU_MIN_PV, VERTAILU_MAX_KK: VERTAILU_MAX_KK, PITKA_VALI_KK: PITKA_VALI_KK,
    IKATASO_RAJA: IKATASO_RAJA, ARVIO_RAJA: ARVIO_RAJA, SWC_KERROIN: SWC_KERROIN, SWC_TILA: SWC_TILA,
    TESTIT: TESTIT, AVAINTESTIT: AVAINTESTIT, DIAGNOSTIIKKA: DIAGNOSTIIKKA, TILAT: TILAT,
    HIDDEN_GEM_FLEI: HIDDEN_GEM_FLEI, laskeD2Taso: laskeD2Taso, laskeHiddenGem: laskeHiddenGem,
    pvmFi: pvmFi, jakso: jakso, jaksonRajat: jaksonRajat, onValilla: onValilla,
    osuus: osuus, keskiarvo: keskiarvo,
    swcNormista: swcNormista, swcSeurasta: swcSeurasta, phvPisteelle: phvPisteelle, vertailupari: vertailupari,
    k1Tila: k1Tila, pelaajaKehittyy: pelaajaKehittyy, kehitysosuus: kehitysosuus,
    k1bTila: k1bTila, jatkuvaTaso: jatkuvaTaso, k1bTasoPisteelle: k1bTasoPisteelle, vaadittuVauhti: vaadittuVauhti, TYYPILLINEN_PHV_IKA: TYYPILLINEN_PHV_IKA,
    tavoitetasoOsuus: tavoitetasoOsuus, maaraVsTavoite: maaraVsTavoite, asteikonKeskiarvo: asteikonKeskiarvo,
    vaatimusTayttyy: vaatimusTayttyy, ennuste31_12: ennuste31_12, tavoitteenTila: tavoitteenTila,
  };
  if (typeof module !== 'undefined' && module.exports) module.exports = API;
  if (root) {
    root.TM_MITTARIT = API;
    // VP_v25 kutsuu näitä nimellä (siirretty sieltä 2.10.2026)
    root.HIDDEN_GEM_FLEI = HIDDEN_GEM_FLEI; root.laskeD2Taso = laskeD2Taso; root.laskeHiddenGem = laskeHiddenGem;
  }
})(typeof window !== 'undefined' ? window : null);
