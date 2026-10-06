/* ════════════════════════════════════════════════════════════════════════
   tm_harjoitepankki.js — T1 (docs/CODE_BRIEF_T1_HARJOITEPANKKI_TUONTI.md; design 14 D29): seuran harjoitepankin normalisointi + haku (PURE; ei Firebasea, ei DOMia).
   Seuran aineisto EI ole repossa — tämä lib sisältää vain jäsennyssäännöt (testit käyttävät keksittyjä fixtureja).
   · tmHarjoiteParsiAlue(teksti)        → { alue_m:{pituus, leveys}|null, alue_tyyppi:'mitta'|'koko'|'osa'|null, alue_teksti }   pituus = pidempi sivu; alue "10 x 20", "28x18m", "25-30m x 18-22m" (väli → keskiarvo), "koko kenttä" → alue_m null + 'koko'
   · tmHarjoiteParsiPelaajat(teksti)    → { pelaajamaara:{min,max}|null, pelaajamaara_teksti }   "6 pelaajaa", "8 (3v3+2mv)", "4v4+mv", "6–8 pelaajaa"; "koko ryhmä" / "2+ ryhmää" → null (teksti säilyy)
   · tmHarjoiteParsiIka(ika)            → { ika_min, ika_max, ika_teksti }   KPV-ikäkaistat ("alle 8","8–9",…) JA Palloliiton tasokoodit ("G6","F9","G7-F8"); null = ei rajaa
   · tmHarjoiteParsiKesto(teksti)       → { kesto_min, kesto_teksti }   "15 min", "15–20 min" (keskiarvo); "1–2 min / kierros" → null (teksti säilyy)
   · tmHarjoiteParsiVuosikello(jaksot)  → [{ vuosi, jaksot[] }]   objektit TAI "Vuosi 1: 1, 4, 9"
   · tmHarjoiteNormalisoi(rivi, lahdeMuoto, opts) → { id, data, jasentymattomat[] }   lahdeMuoto 'kpv' | 'pallo_iirot'; opts { tarkistaja, pvm, seuraNimi }
   · tmHarjoiteHaku(pankki, ehto)       → D29: koko ±30 % rajaa · pelikonteksti rajaa (jos annettu) · painopiste nostaa · ikä suodattaa; arkistoidut ja ei-hyväksytyt pois
   Kohdeskeema additiivinen: nykyiset nimi/lahde/tyyppi/tila/kaytto/versio/lahde_viite säilyvät (Rules v3.40–42); lisäkentät pelikonteksti, painopiste, laatutekija, rakenne, maalinteko, pelaajamaara, alue_*, …
   Dual-export: module.exports || window.TM_HARJOITEPANKKI.
════════════════════════════════════════════════════════════════════════ */
(function (root) {
  'use strict';
  var KOKO_MIN = { pituus: 60, leveys: 40 };   // "koko kenttä" -harjoite osuu vain jos annettu alue ≥ 60 × 40 m
  var KOKO_TOLERANSSI = 0.30;

  function _s(v) { return v == null ? '' : String(v).trim(); }
  function _tyhjaNull(v) { var s = _s(v); return s ? s : null; }
  function _luku(v) { var n = Number(String(v).replace(',', '.')); return isFinite(n) ? n : null; }
  function _kesk(a, b) { var x = _luku(a), y = b == null || b === '' ? null : _luku(b); return y == null ? x : (x + y) / 2; }
  function _pyorista(n) { return Math.round(n * 10) / 10; }
  function _norm(s) { return _s(s).toLowerCase().normalize ? _s(s).toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '').replace(/\s+/g, ' ') : _s(s).toLowerCase(); }

  // ── alue ──────────────────────────────────────────────────────────────────────────────────
  function tmHarjoiteParsiAlue(teksti) {
    var orig = _tyhjaNull(teksti), s = _s(teksti).toLowerCase();
    if (!orig) return { alue_m: null, alue_tyyppi: null, alue_teksti: null };
    if (/koko\s*kentt/.test(s)) return { alue_m: null, alue_tyyppi: 'koko', alue_teksti: orig };
    var m = /(\d+(?:[.,]\d+)?)(?:\s*[-–]\s*(\d+(?:[.,]\d+)?))?\s*(?:m\b)?\s*[x×]\s*(\d+(?:[.,]\d+)?)(?:\s*[-–]\s*(\d+(?:[.,]\d+)?))?/.exec(s);
    if (m) {
      var a = _kesk(m[1], m[2]), b = _kesk(m[3], m[4]);
      if (a > 0 && b > 0) return { alue_m: { pituus: _pyorista(Math.max(a, b)), leveys: _pyorista(Math.min(a, b)) }, alue_tyyppi: 'mitta', alue_teksti: orig };
    }
    if (/rangaistusalue|kolmannes|puolikas|puolet|neljännes|puoli\s*kentt/.test(s)) return { alue_m: null, alue_tyyppi: 'osa', alue_teksti: orig };
    return { alue_m: null, alue_tyyppi: null, alue_teksti: orig };   // jäsentymätön → raportoidaan
  }

  // ── pelaajamäärä ─────────────────────────────────────────────────────────────────────────
  function tmHarjoiteParsiPelaajat(teksti) {
    var orig = _tyhjaNull(teksti), s = _s(teksti).toLowerCase();
    if (!orig) return { pelaajamaara: null, pelaajamaara_teksti: null };
    var m = /^(\d+)(?:\s*[-–]\s*(\d+))?\s*(?:pelaaja\w*)?\s*(?:\(|$)/.exec(s);
    if (m) { var lo = +m[1], hi = m[2] ? +m[2] : lo; if (lo >= 1 && hi >= lo) return { pelaajamaara: { min: lo, max: hi }, pelaajamaara_teksti: orig }; }
    var v = /(\d+)\s*v\s*(\d+)(?:\s*\+\s*(\d*)\s*mv)?/.exec(s);   // 4v4 / 4v4+mv / 3v3+2mv
    if (v) { var summa = +v[1] + +v[2], onMv = /\+\s*\d*\s*mv/.test(s), mvLkm = v[3] ? +v[3] : 0; return { pelaajamaara: { min: summa + mvLkm, max: summa + (mvLkm || (onMv ? 1 : 0)) }, pelaajamaara_teksti: orig }; }
    return { pelaajamaara: null, pelaajamaara_teksti: orig };
  }

  // ── ikä ──────────────────────────────────────────────────────────────────────────────────
  var KPV_KAISTAT = { 'alle 8': { min: null, max: 7 }, '8-9': { min: 8, max: 9 }, '10-11': { min: 10, max: 11 }, '12-13': { min: 12, max: 13 }, '14-15': { min: 14, max: 15 }, '16-19': { min: 16, max: 19 } };
  function _ikaOsa(t) {
    var s = _s(t).toLowerCase().replace(/[–—]/g, '-').replace(/\s+/g, ' ');
    if (KPV_KAISTAT[s]) return KPV_KAISTAT[s];
    var koodit = s.toUpperCase().match(/[A-Z]\s*(\d{1,2})/g);   // Palloliiton tasokoodi: kirjain + ikä (G6 = 6 v, F9 = 9 v, B17 = 17 v)
    if (koodit && /^[A-Z]\s*\d{1,2}(?:\s*[-–]\s*[A-Z]\s*\d{1,2})*$/i.test(s.replace(/\s*[-–]\s*/g, '-'))) {
      var ik = koodit.map(function (k) { return +/(\d+)/.exec(k)[1]; }); return { min: Math.min.apply(null, ik), max: Math.max.apply(null, ik) };
    }
    return null;
  }
  function tmHarjoiteParsiIka(ika) {
    var lista = Array.isArray(ika) ? ika : (_s(ika) ? [ika] : []);
    if (!lista.length) return { ika_min: null, ika_max: null, ika_teksti: null };
    var min = Infinity, max = -Infinity, avoinAlas = false, tunnistamaton = false;
    lista.forEach(function (x) { var o = _ikaOsa(x); if (!o) { tunnistamaton = true; return; } if (o.min == null) avoinAlas = true; else min = Math.min(min, o.min); max = Math.max(max, o.max); });
    var teksti = lista.map(_s).join(', ');
    if (tunnistamaton || max === -Infinity) return { ika_min: null, ika_max: null, ika_teksti: teksti, _jasentymaton: true };
    return { ika_min: avoinAlas || min === Infinity ? null : min, ika_max: max, ika_teksti: teksti };
  }

  // ── kesto ────────────────────────────────────────────────────────────────────────────────
  function tmHarjoiteParsiKesto(teksti) {
    var orig = _tyhjaNull(teksti), m = /^\s*(\d+)(?:\s*[-–]\s*(\d+))?\s*min\s*$/i.exec(_s(teksti));
    if (!orig) return { kesto_min: null, kesto_teksti: null };
    return m ? { kesto_min: Math.round(_kesk(m[1], m[2])), kesto_teksti: orig } : { kesto_min: null, kesto_teksti: orig };
  }

  // ── vuosikello ──────────────────────────────────────────────────────────────────────────
  function tmHarjoiteParsiVuosikello(jaksot) {
    var out = [];
    (Array.isArray(jaksot) ? jaksot : (_s(jaksot) ? [jaksot] : [])).forEach(function (x) {
      if (x && typeof x === 'object') { var v = _luku(x.vuosi), js = (Array.isArray(x.jaksot) ? x.jaksot : []).map(_luku).filter(function (n) { return n != null; }); if (v != null && js.length) out.push({ vuosi: v, jaksot: js }); return; }
      var m = /vuosi\s*(\d+)\s*:\s*([\d,\s]+)/i.exec(_s(x)); if (m) { var jj = m[2].split(',').map(function (n) { return _luku(n.trim()); }).filter(function (n) { return n != null; }); if (jj.length) out.push({ vuosi: +m[1], jaksot: jj }); }
    });
    return out;
  }

  // ── normalisointi ─────────────────────────────────────────────────────────────────────────
  function _tasot(t) { return (Array.isArray(t) ? t : []).filter(function (x) { return x && typeof x === 'object'; }).map(function (x) { return { taso: _tyhjaNull(x.taso), ohje: _tyhjaNull(x.ohje), mittari: _tyhjaNull(x.mittari) }; }); }
  function _kolmasOsapuoli(rivi) { return /soccertutor/i.test(_s(rivi.huom) + ' ' + _s(rivi.lahde)); }

  function tmHarjoiteNormalisoi(rivi, lahdeMuoto, opts) {
    rivi = rivi || {}; opts = opts || {}; var jas = [], id = _s(rivi.id);
    if (!id) throw new Error('tm_harjoitepankki: id puuttuu (lähteen id vaaditaan, jotta uudelleenajo ei tuplaa)');
    var nimi = _tyhjaNull(rivi.nimi); if (!nimi) throw new Error('tm_harjoitepankki: nimi puuttuu (' + id + ')');
    var alue = tmHarjoiteParsiAlue(rivi.kentta != null ? rivi.kentta : rivi.alue), pel = tmHarjoiteParsiPelaajat(rivi.pelaajat != null ? rivi.pelaajat : rivi.pelaajamaara), ika = tmHarjoiteParsiIka(rivi.ika != null ? rivi.ika : rivi.ikavaihe), kesto = tmHarjoiteParsiKesto(rivi.kesto);
    if (alue.alue_teksti && !alue.alue_m && !alue.alue_tyyppi) jas.push('alue: "' + alue.alue_teksti + '"');
    if (pel.pelaajamaara_teksti && !pel.pelaajamaara && !/koko\s*ryhm|ryhm/i.test(pel.pelaajamaara_teksti)) jas.push('pelaajamäärä: "' + pel.pelaajamaara_teksti + '"');
    if (ika._jasentymaton) jas.push('ikä: "' + ika.ika_teksti + '"');
    if (kesto.kesto_teksti && kesto.kesto_min == null) jas.push('kesto: "' + kesto.kesto_teksti + '"');
    var kolmas = (lahdeMuoto === 'kpv' && _kolmasOsapuoli(rivi)) || rivi.kolmas_osapuoli === true;
    var tila = kolmas ? 'luonnos' : (opts.tila || 'hyvaksytty');
    var d = {
      nimi: nimi, lahde: 'seura', tyyppi: 'T', tila: tila, kaytto: rivi.kaytto === 'koti' ? 'koti' : 'joukkue', kehityskohde: null, ketju: null, kotiin_sopiva: false,   // vanhat kentät ennallaan (Rules v3.40–42); joukkueharjoite ei koskaan pelaajalle
      lahde_viite: _tyhjaNull(rivi.lahde_viite != null ? rivi.lahde_viite : rivi.lahde),
      pelikonteksti: _tyhjaNull(rivi.pelikonteksti != null ? rivi.pelikonteksti : rivi.teema), painopiste: _tyhjaNull(rivi.painopiste), laatutekija: _tyhjaNull(rivi.laatutekija),
      rakenne: _tyhjaNull(rivi.rakenne != null ? rivi.rakenne : rivi.tyyppi), maalinteko: _tyhjaNull(rivi.maalinteko),
      pelaajamaara: pel.pelaajamaara, pelaajamaara_teksti: pel.pelaajamaara_teksti, alue_m: alue.alue_m, alue_tyyppi: alue.alue_tyyppi, alue_teksti: alue.alue_teksti, kesto_min: kesto.kesto_min, kesto_teksti: kesto.kesto_teksti,
      tavoite: _tyhjaNull(rivi.tavoite), jarjestely: _tyhjaNull(rivi.jarjestely), kulku: _tyhjaNull(rivi.kulku), valmennuspisteet: _tyhjaNull(rivi.valmennuspisteet), helpota: _tyhjaNull(rivi.helpota), vaikeuta: _tyhjaNull(rivi.vaikeuta),
      saannot: _tyhjaNull(rivi.saannot), kysymykset: (Array.isArray(rivi.kysymykset) ? rivi.kysymykset : []).map(_s).filter(Boolean), tasot: _tasot(rivi.tasot),
      ika_min: ika.ika_min, ika_max: ika.ika_max, ika_teksti: ika.ika_teksti, vuosikello: tmHarjoiteParsiVuosikello(rivi.jaksot != null ? rivi.jaksot : rivi.vuosikello),
      tags: (Array.isArray(rivi.tags) ? rivi.tags : []).map(_s).filter(Boolean), kuva_url: null, huom: _tyhjaNull(rivi.huom), lahde_pankki: _tyhjaNull(rivi.pankki), ryhma: _tyhjaNull(rivi.ryhma), intensiteetti: _tyhjaNull(rivi.intensiteetti),
      laatija_rooli: 'tuonti'
    };
    if (kolmas) d.kolmas_osapuoli = true;
    if (tila === 'hyvaksytty') { d.tarkistettu_pvm = opts.pvm || null; d.tarkistaja = opts.tarkistaja || null; }
    if (typeof rivi.jako_lupa === 'boolean') d.jako_lupa = rivi.jako_lupa;   // Pallo-Iirot YLEINEN_KIRJASTO; kopiointia TM:n yleiseen kirjastoon EI tehdä tässä
    return { id: id, data: d, jasentymattomat: jas };
  }

  // ── haku (D29) ───────────────────────────────────────────────────────────────────────────
  function _ala(a) { return a && a.pituus > 0 && a.leveys > 0 ? a.pituus * a.leveys : null; }
  function _riittaaKokoKentalle(a) { return !!a && a.pituus >= KOKO_MIN.pituus && a.leveys >= KOKO_MIN.leveys; }
  // ehto: { alue_m:{pituus,leveys}|null, pelikonteksti, painopiste, ika (vuosina) } → hyväksytyt, ei arkistoidut; pisteytys: painopiste +2, tarkka koko +1 (lähellä annettua alaa)
  function tmHarjoiteHaku(pankki, ehto) {
    ehto = ehto || {}; var haettuAla = _ala(ehto.alue_m), konteksti = ehto.pelikonteksti ? _norm(ehto.pelikonteksti) : null, paino = ehto.painopiste ? _norm(ehto.painopiste) : null, ika = ehto.ika != null ? Number(ehto.ika) : null;
    var tulos = [];
    (Array.isArray(pankki) ? pankki : []).forEach(function (h) {
      if (!h || h.arkistoitu === true || h.tila !== 'hyvaksytty') return;
      if (konteksti && _norm(h.pelikonteksti) !== konteksti) return;   // konteksti ratkaisee
      if (ika != null && isFinite(ika)) { if (h.ika_min != null && ika < h.ika_min) return; if (h.ika_max != null && ika > h.ika_max) return; }
      var pisteet = 0;
      if (haettuAla != null || ehto.alue_m) {
        if (h.alue_tyyppi === 'koko') { if (!_riittaaKokoKentalle(ehto.alue_m)) return; }   // koko kenttä vain kun alue ≥ 60 × 40
        else { var ala = _ala(h.alue_m); if (ala == null || haettuAla == null || Math.abs(ala - haettuAla) > KOKO_TOLERANSSI * haettuAla) return; pisteet += 1 - Math.abs(ala - haettuAla) / (KOKO_TOLERANSSI * haettuAla) * 0.5; }   // tarkempi koko hieman ylös
      }
      if (paino && h.painopiste && _norm(h.painopiste) === paino) pisteet += 2;   // painopiste ratkaisee järjestyksen
      tulos.push({ h: h, p: pisteet });
    });
    return tulos.sort(function (a, b) { return (b.p - a.p) || String(a.h.nimi).localeCompare(String(b.h.nimi)); }).map(function (x) { return x.h; });
  }

  var API = { tmHarjoiteParsiAlue: tmHarjoiteParsiAlue, tmHarjoiteParsiPelaajat: tmHarjoiteParsiPelaajat, tmHarjoiteParsiIka: tmHarjoiteParsiIka, tmHarjoiteParsiKesto: tmHarjoiteParsiKesto, tmHarjoiteParsiVuosikello: tmHarjoiteParsiVuosikello,
    tmHarjoiteNormalisoi: tmHarjoiteNormalisoi, tmHarjoiteHaku: tmHarjoiteHaku, KOKO_MIN: KOKO_MIN, KOKO_TOLERANSSI: KOKO_TOLERANSSI };
  if (typeof module !== 'undefined' && module.exports) module.exports = API; else root.TM_HARJOITEPANKKI = API;
})(typeof window !== 'undefined' ? window : this);
