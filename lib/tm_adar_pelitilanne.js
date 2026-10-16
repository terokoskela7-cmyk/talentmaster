/* ════════════════════════════════════════════════════════════════════════
   tm_adar_pelitilanne.js — ADAR-havainnon PELITILANNE (vaihe · paine · otos) + arvion LUOTETTAVUUS.
   Brief: .briefit/CODE_BRIEF_PELIALY_PELITILANNE.md (Vaihe 1). PURE: ei Firestorea, ei DOMia, ei Date.now():ta (nowMs annetaan) — §34.

   ⚠ VAIHE 1 = VAIN KIRJAUS + NÄKYVYYS. Tämä lib EI muuta konsensuslaskentaa (yht, dimKonsensus, tmAdarBand, Kartta A, "uusin per valmentaja").
     Painotus kontekstin/pelivaiheen mukaan on Vaihe 2 (Teron päätös datan perusteella). Luotettavuus on VALMENTAJAN työkalu: ei pelaajalle eikä huoltajalle (§7.22).

   Tallennusmuoto (havainnot/{id}.pelitilanne): { vaihe: [0–2 avainta], paine: avain|null, otos: avain|null } tai null. ASCII-avaimet, EI käännetä.
   API: tmPelitilanneTalletus(raw, porras) · tmPelitilanneKentat(porras) · tmPelitilanneVaihe(lista, avain) · tmPelitilanneYhteenveto(konteksti, pt, tr)
        tmAdarPelitilanneKentat(havainnot) · tmAdarLuotettavuus(havainnot, kons, nowMs) · tmAdarLuotettavuusTuore(pk, nowMs) · tmAdarLuotettavuusRivit(pk, nowMs, tr) · tmAdarLuotettavuusHTML(pk, nowMs, tr, esc)
   Dual-export: module.exports || window.
════════════════════════════════════════════════════════════════════════ */
(function (root) {
  'use strict';

  var VAIHEET = ['hyokkays', 'puolustus', 'siirtyma_hyok', 'siirtyma_puol', 'erikois'];
  var PAINEET = ['matala', 'kohtalainen', 'kova'];
  var OTOKSET = ['1_2', '3_5', '6plus'];
  var KONTEKSTIT = ['harjoitus', 'pienpeli', 'ottelu'];
  var VAIHE_MAX = 2;               // enintään 2 vaihetta / havainto

  /* ── LUOTETTAVUUDEN KYNNYKSET — säädä täältä (yksi paikka) ───────────────────────────────── */
  var LUOT_ARVIOIJIA_MIN = 2;      // yksi_arvioija: arvioijia < tämä
  var LUOT_VANHA_PV = 90;          // vanha: uusin havainto yli näin monta päivää vanha
  var LUOT_PIENI_OSUUS = 0.5;      // pieni_otos: YLI tämä osuus TUNNETUISTA otoksista on '1_2' (tuntematon = vanha data, ei vaikuta)
  var LUOT_PIENI_TUNNETTUJA_MIN = 3; // pieni_otos arvioidaan vasta kun tunnettuja otoksia on vähintään näin monta
  var LUOT_KOHTALAINEN_MAX = 2;    // syitä 0 → vahva · 1..tämä → kohtalainen · enemmän → ohut
  var LUOT_SYYT = ['yksi_arvioija', 'vain_harjoitus', 'pieni_otos', 'vanha', 'hajonta'];

  function _ms(luotu) {
    if (luotu == null) return 0;
    if (typeof luotu === 'number') return luotu;
    if (typeof luotu === 'string') { var t = Date.parse(luotu); return isNaN(t) ? 0 : t; }
    if (typeof luotu.toMillis === 'function') return luotu.toMillis();
    if (luotu.seconds != null) return luotu.seconds * 1000;
    if (luotu instanceof Date) return luotu.getTime();
    return 0;
  }
  function _on(lista, v) { return lista.indexOf(v) >= 0; }
  function _sijoita(teksti, n) { return String(teksti).replace('{n}', n); }
  function _T(avain, tr) {
    var X = (typeof module !== 'undefined' && module.exports && typeof require === 'function') ? require('./tm_adar_tekstit.js') : root.TM_ADAR_TEKSTIT;
    return X ? X.tmAdarT(avain, tr) : avain;
  }

  /* ── KIRJAUS ──────────────────────────────────────────────────────────────────────────── */
  /** Mitkä kentät näkyvät portaalla (porras ratkaisee, ei ikä): 1 → otos · 2 → + vaihe · 3–4 → + paine. */
  function tmPelitilanneKentat(porras) {
    var p = Number(porras) || 1;
    return { otos: true, vaihe: p >= 2, paine: p >= 3 };
  }

  /** Vaihe-chipin napautus: toinen napautus poistaa; kolmas valinta vaihtaa VANHIMMAN pois. */
  function tmPelitilanneVaihe(lista, avain) {
    var l = (Array.isArray(lista) ? lista : []).filter(function (v) { return _on(VAIHEET, v); });
    if (!_on(VAIHEET, avain)) return l;
    var i = l.indexOf(avain);
    if (i >= 0) { l.splice(i, 1); return l; }
    l.push(avain);
    while (l.length > VAIHE_MAX) l.shift();
    return l;
  }

  /** Tallennettava arvo: vain portaalla NÄKYVÄT kentät, vain sallitut avaimet; ei mitään → null (ei tyhjää mappia). */
  function tmPelitilanneTalletus(raw, porras) {
    if (!raw || typeof raw !== 'object') return null;
    var nak = tmPelitilanneKentat(porras);
    var vaihe = [];
    if (nak.vaihe && Array.isArray(raw.vaihe)) {
      raw.vaihe.forEach(function (v) { if (_on(VAIHEET, v) && !_on(vaihe, v)) vaihe.push(v); });
      vaihe = vaihe.slice(-VAIHE_MAX);
    }
    var paine = (nak.paine && _on(PAINEET, raw.paine)) ? raw.paine : null;
    var otos = (nak.otos && _on(OTOKSET, raw.otos)) ? raw.otos : null;
    if (!vaihe.length && paine == null && otos == null) return null;
    return { vaihe: vaihe, paine: paine, otos: otos };
  }

  /** Ok-näkymän rivi: "Ottelu · Siirtymä puolustukseen · Kova paine · 3–5 tilannetta". Ei pelitilannetta → ''. */
  function tmPelitilanneYhteenveto(konteksti, pt, tr) {
    if (!pt) return '';
    var osat = [];
    if (_on(KONTEKSTIT, konteksti)) osat.push(_T('adar_konteksti_' + konteksti, tr));
    (pt.vaihe || []).forEach(function (v) { if (_on(VAIHEET, v)) osat.push(_T('adar_pt_vaihe_' + v, tr)); });
    if (_on(PAINEET, pt.paine)) osat.push(_T('adar_pt_paine_' + pt.paine, tr));
    if (_on(OTOKSET, pt.otos)) osat.push(_T('adar_pt_otos_' + pt.otos, tr));
    return osat.join(' · ');
  }

  /** Pikakortin suljettu Pelitilanne-rivi: "Pelitilanne: 3–5 · Puolustus · Kova paine" (vain portaalla näkyvät kentät). Ei valintoja → pelkkä otsikko.
      Otos lyhyenä numeromuotona (kielineutraali), vaihe ja paine olemassa olevista adar_pt_*-teksteistä. */
  var OTOS_LYHYT = { '1_2': '1–2', '3_5': '3–5', '6plus': '6+' };
  function tmPelitilanneTiivis(raw, porras, tr) {
    var otsikko = _T('adar_pt_otsikko', tr), pt = tmPelitilanneTalletus(raw, porras);
    if (!pt) return otsikko;
    var osat = [];
    if (pt.otos) osat.push(OTOS_LYHYT[pt.otos]);
    pt.vaihe.forEach(function (v) { osat.push(_T('adar_pt_vaihe_' + v, tr)); });
    if (pt.paine) osat.push(_T('adar_pt_paine_' + pt.paine, tr));
    return otsikko + ': ' + osat.join(' · ');
  }

  /* ── JAKAUMAT (pelaajan pikakentät) ───────────────────────────────────────────────────── */
  function _pt(h) { return tmPelitilanneTalletus(h && h.pelitilanne, 4); }   // portti 4 = kaikki kentät sallittu; vain avainten validointi

  /** havainnot = jo suodatettu (ei peruttuja, pisteet). Palauttaa vain UUDET kentät. */
  function tmAdarPelitilanneKentat(havainnot) {
    var lista = Array.isArray(havainnot) ? havainnot : [];
    var vaihe = {}, otos = { '1_2': 0, '3_5': 0, '6plus': 0, tuntematon: 0 }, peli = 0;
    VAIHEET.forEach(function (v) { vaihe[v] = 0; });
    lista.forEach(function (h) {
      var pt = _pt(h);
      if (pt) pt.vaihe.forEach(function (v) { vaihe[v]++; });
      otos[(pt && pt.otos) ? pt.otos : 'tuntematon']++;
      if (h && (h.konteksti === 'ottelu' || h.konteksti === 'pienpeli')) peli++;
    });
    return {
      adar_vaihe_jakauma: vaihe,
      adar_otos_jakauma: otos,
      adar_ottelupohja: lista.length ? Math.round(peli / lista.length * 100) / 100 : 0
    };
  }

  /* ── LUOTETTAVUUS ─────────────────────────────────────────────────────────────────────── */
  function _taso(syyt) { return syyt.length === 0 ? 'vahva' : (syyt.length <= LUOT_KOHTALAINEN_MAX ? 'kohtalainen' : 'ohut'); }
  function _vanha(uusinMs, nowMs) { return !!(uusinMs && nowMs != null && (nowMs - uusinMs) / 86400000 > LUOT_VANHA_PV); }

  /** havainnot = suodatettu lista (ei peruttuja); kons = tmAdarKonsensus-tulos; nowMs valinnainen (puuttuu → `vanha` ei arvioida). */
  function tmAdarLuotettavuus(havainnot, kons, nowMs) {
    var lista = Array.isArray(havainnot) ? havainnot : [], k = kons || {}, syyt = [];
    if ((k.arvioijia || 0) < LUOT_ARVIOIJIA_MIN) syyt.push('yksi_arvioija');
    if (!lista.some(function (h) { return h && (h.konteksti === 'ottelu' || h.konteksti === 'pienpeli'); })) syyt.push('vain_harjoitus');
    if (lista.length) {
      /* Tuntematon otos (vanha data, pelitilanne null) ei vaikuta tasoon ollenkaan: vain tunnetut lasketaan. */
      var tunnetut = lista.filter(function (h) { var pt = _pt(h); return pt && pt.otos; });
      var pieni = tunnetut.filter(function (h) { return _pt(h).otos === '1_2'; }).length;
      if (tunnetut.length >= LUOT_PIENI_TUNNETTUJA_MIN && pieni / tunnetut.length > LUOT_PIENI_OSUUS) syyt.push('pieni_otos');
    }
    var uusin = 0; lista.forEach(function (h) { var m = _ms(h && h.luotu); if (m > uusin) uusin = m; });
    if (_vanha(uusin, nowMs)) syyt.push('vanha');
    if (k.yhtenevyysTaso === 'matala') syyt.push('hajonta');
    return { taso: _taso(syyt), syyt: syyt };
  }

  /** Lukunäkymä: tallennettu luotettavuus, mutta `vanha` arvioidaan TÄMÄN HETKEN mukaan adar_pvm:stä (tallennettu arvo vanhenisi levyllä). */
  function tmAdarLuotettavuusTuore(pk, nowMs) {
    var l = pk && pk.adar_luotettavuus;
    if (!l || !Array.isArray(l.syyt)) return null;
    var syyt = l.syyt.filter(function (s) { return s !== 'vanha' && _on(LUOT_SYYT, s); });
    if (_vanha(_ms(pk.adar_pvm), nowMs)) syyt.push('vanha');
    syyt.sort(function (a, b) { return LUOT_SYYT.indexOf(a) - LUOT_SYYT.indexOf(b); });
    return { taso: _taso(syyt), syyt: syyt };
  }

  /** Valmis näyttömalli Master/VP:lle (HTML vain renderöi). null → ei dataa (vanha pelaaja ilman kenttiä: ei näytetä mitään). */
  function tmAdarLuotettavuusRivit(pk, nowMs, tr) {
    var l = tmAdarLuotettavuusTuore(pk, nowMs);
    if (!l) return null;
    var tj = pk.adar_tilanne_jakauma || {}, vj = pk.adar_vaihe_jakauma || {};
    var kons = ['ottelu', 'pienpeli', 'harjoitus'].filter(function (k) { return tj[k] > 0; })
      .map(function (k) { return _sijoita(_T('adar_jak_' + k, tr), tj[k]); });
    var siirt = (vj.siirtyma_hyok || 0) + (vj.siirtyma_puol || 0);
    var vaih = [['siirtymat', siirt], ['hyokkays', vj.hyokkays || 0], ['puolustus', vj.puolustus || 0], ['erikois', vj.erikois || 0]]
      .filter(function (x) { return x[1] > 0; })
      .sort(function (a, b) { return b[1] - a[1]; })
      .map(function (x) { return _sijoita(_T('adar_jak_' + x[0], tr), x[1]); });
    return {
      taso: l.taso, tasoTeksti: _T('adar_luot_taso_' + l.taso, tr),
      syyTekstit: l.syyt.map(function (s) { return _T('adar_luot_syy_' + s, tr); }),
      jakauma: kons.join(' · ') + (kons.length && vaih.length ? ' | ' : '') + vaih.join(' · '),
      otsikko: _T('adar_luot_perustuu', tr),
      huomio: l.taso === 'ohut' ? _T('adar_luot_huomio', tr) : ''
    };
  }

  /** Peliälykortin lohko (Master + VP jakavat): merkki + syyt + jakaumarivi. esc = kutsujan HTML-escape. '' kun kenttiä ei vielä ole (vanha pelaaja).
      Sävy kehittävä: väri ei ole punainen, "ohut" kertoo vain että arvio tarvitsee lisää havaintoja. */
  function tmAdarLuotettavuusHTML(pk, nowMs, tr, esc) {
    var r = tmAdarLuotettavuusRivit(pk, nowMs, tr);
    if (!r) return '';
    var e = (typeof esc === 'function') ? esc : function (x) { return String(x); };
    var vari = { vahva: 'var(--teal)', kohtalainen: 'var(--ink2)', ohut: 'var(--amber)' }[r.taso];
    return '<div class="adar-luot" style="grid-column:1/-1;margin-top:8px;padding:9px 11px;border:.5px solid var(--border,rgba(128,128,128,.25));border-radius:8px">'
      + '<div style="font-size:11px;font-weight:600;color:' + vari + '">' + e(r.tasoTeksti) + '</div>'
      + (r.syyTekstit.length ? '<ul style="margin:4px 0 0 16px;padding:0;font-size:11px;color:var(--ink2)">' + r.syyTekstit.map(function (t) { return '<li>' + e(t) + '</li>'; }).join('') + '</ul>' : '')
      + (r.jakauma ? '<div style="font-size:10.5px;color:var(--ink3);margin-top:6px">' + e(r.otsikko) + ': ' + e(r.jakauma) + '</div>' : '')
      + (r.huomio ? '<div style="font-size:10.5px;color:var(--ink3);margin-top:4px">' + e(r.huomio) + '</div>' : '')
      + '</div>';
  }

  var API = {
    VAIHEET: VAIHEET, PAINEET: PAINEET, OTOKSET: OTOKSET, VAIHE_MAX: VAIHE_MAX,
    LUOT: { ARVIOIJIA_MIN: LUOT_ARVIOIJIA_MIN, VANHA_PV: LUOT_VANHA_PV, PIENI_OSUUS: LUOT_PIENI_OSUUS, KOHTALAINEN_MAX: LUOT_KOHTALAINEN_MAX, SYYT: LUOT_SYYT },
    tmPelitilanneKentat: tmPelitilanneKentat, tmPelitilanneVaihe: tmPelitilanneVaihe, tmPelitilanneTalletus: tmPelitilanneTalletus,
    tmPelitilanneYhteenveto: tmPelitilanneYhteenveto, tmPelitilanneTiivis: tmPelitilanneTiivis, tmAdarPelitilanneKentat: tmAdarPelitilanneKentat,
    tmAdarLuotettavuus: tmAdarLuotettavuus, tmAdarLuotettavuusTuore: tmAdarLuotettavuusTuore, tmAdarLuotettavuusRivit: tmAdarLuotettavuusRivit, tmAdarLuotettavuusHTML: tmAdarLuotettavuusHTML
  };
  if (typeof module !== 'undefined' && module.exports) module.exports = API;
  if (root) { Object.keys(API).forEach(function (k) { if (k.indexOf('tm') === 0) root[k] = API[k]; }); root.TM_ADAR_PELITILANNE = API; }
})(typeof window !== 'undefined' ? window : (typeof globalThis !== 'undefined' ? globalThis : this));
