/* ════════════════════════════════════════════════════════════════════════
   tm_kalenteri_tyypit.js — K35-1 · YKSI kalenterin tyyppirekisteri (D186; docs/CODE_BRIEF_35_KALENTERI.md).
   PURE (ei Firebasea, ei DOMia). Korvaa vaiheittain: VP_v25 KALENTERI_TYYPIT, Master_v16 `tyypit` + _calEvtTyyli,
   Pelaaja_v7 _P7_TT ja Vanhempi_v2 _VANH_TT (vartija tests/kalenteri_yksi_rekisteri.test.js: uusia karttoja ei HTML:ään).
   · Ei emojeja eikä hex-värejä: `merkki` on tyyliluokka ('harj'|'ott'|'test'|'pal'|'tauko'|'muu'), värit tulevat tokeneista näkymässä (D169).
   · `kerros` = D131: 'valmennus' (harjoitukset, ottelut, testit) · 'silmukka' (jaksot, katselmus, IDP) · 'asiat' (palaverit, VP:n omat) · 'tauko'.
   · `vainHenkilokunta` = TM_RYHMAT.HK_TYYPIT (yksi lähde; testi pitää ne samoina).
   · `nimiAvain` = i18n-avain (kal_tyyppi_<avain>); `nimi` = suomenkielinen oletus. sv tulee Geminin kautta.
   · ALIAKSET: vanhat tai muiden sovellusten nimet → kanoninen avain (tauko/loma → seuran_tauko, D193).
   · K35-2: tmKalTyypitRoolille(johto) (seuran_tauko vain johdolle, D171) · tmKalMerkkiTyyli(merkki) → { vari: 'var(--token)', katkoviiva } (D169, ei hex-arvoja) · tmKalSelite(johto) → yksi rivi per merkki rekisteristä
   API: tmKalTyyppiAvain(x) · tmKalTyyppi(x) · tmKalTyypit() · tmKalPikavalinnat() · tmKalVainHenkilokunta(x) · tmKalTyypitRoolille · tmKalMerkkiTyyli · tmKalSelite · TYYPIT · ALIAKSET · JARJESTYS
   Dual-export: module.exports || window.TM_KALENTERI_TYYPIT. Kopio functions/-kansioon ensimmäisessä palvelinkäytössä (kaista Tero).
════════════════════════════════════════════════════════════════════════ */
(function (root) {
  'use strict';
  var TYYPIT = {
    harjoitus:             { nimi: 'Harjoitus',             kerros: 'valmennus', merkki: 'harj',  pika: 1 },
    ottelu:                { nimi: 'Ottelu',                kerros: 'valmennus', merkki: 'ott',   pika: 2 },
    testitapahtuma:        { nimi: 'Testitapahtuma',        kerros: 'valmennus', merkki: 'test',  pika: 3 },
    valmentajapalaveri:    { nimi: 'Valmentajapalaveri',    kerros: 'asiat',     merkki: 'pal',   pika: 4 },
    muu:                   { nimi: 'Muu',                   kerros: 'asiat',     merkki: 'muu',   pika: 5 },
    talenttileiri:         { nimi: 'Talenttileiri',         kerros: 'valmennus', merkki: 'harj',  pika: 0 },
    jaksopalaveri:         { nimi: 'Jaksopalaveri',         kerros: 'silmukka',  merkki: 'pal',   pika: 0 },
    idp_seuranta:          { nimi: 'IDP-seuranta',          kerros: 'silmukka',  merkki: 'pal',   pika: 0 },
    tiimipalaveri:         { nimi: 'Tiimipalaveri',         kerros: 'asiat',     merkki: 'pal',   pika: 0 },
    mentorointitapaaminen: { nimi: 'Mentorointitapaaminen', kerros: 'asiat',     merkki: 'pal',   pika: 0 },
    kalibraatiopaja:       { nimi: 'Kalibraatiopaja',       kerros: 'asiat',     merkki: 'pal',   pika: 0 },
    seuran_tauko:          { nimi: 'Seuran tauko',          kerros: 'tauko',     merkki: 'tauko', pika: 0 }
  };
  /* Järjestys valitsimissa: pikavalinnat ensin (D185), sitten loput. */
  var JARJESTYS = ['harjoitus', 'ottelu', 'testitapahtuma', 'valmentajapalaveri', 'muu', 'talenttileiri', 'jaksopalaveri', 'idp_seuranta', 'tiimipalaveri', 'mentorointitapaaminen', 'kalibraatiopaja', 'seuran_tauko'];
  /* Sama joukko kuin TM_RYHMAT.HK_TYYPIT (tests/k35_1_kalenteri_libit.test.js pitää ne samoina); 'kokous' on vanha alias. */
  var HK = ['jaksopalaveri', 'valmentajapalaveri', 'tiimipalaveri', 'kokous', 'kalibraatiopaja', 'mentorointitapaaminen'];
  var ALIAKSET = { treeni: 'harjoitus', joukkueharjoitus: 'harjoitus', peli: 'ottelu', testi: 'testitapahtuma', kasvumittaus: 'testitapahtuma',
    kokous: 'valmentajapalaveri', mentorointi: 'mentorointitapaaminen', tauko: 'seuran_tauko', loma: 'seuran_tauko' };

  function tmKalTyyppiAvain(x) {
    var k = String(x == null ? '' : x).trim().toLowerCase();
    if (Object.prototype.hasOwnProperty.call(TYYPIT, k)) return k;
    if (Object.prototype.hasOwnProperty.call(ALIAKSET, k)) return ALIAKSET[k];
    return 'muu';
  }
  function tmKalTyyppi(x) {
    var a = tmKalTyyppiAvain(x), t = TYYPIT[a];
    return { avain: a, nimi: t.nimi, nimiAvain: 'kal_tyyppi_' + a, kerros: t.kerros, merkki: t.merkki, pikavalinta: t.pika > 0, vainHenkilokunta: HK.indexOf(a) >= 0 };
  }
  function tmKalTyypit() { return JARJESTYS.map(tmKalTyyppi); }
  function tmKalPikavalinnat() { return JARJESTYS.filter(function (a) { return TYYPIT[a].pika > 0; }).sort(function (a, b) { return TYYPIT[a].pika - TYYPIT[b].pika; }).map(tmKalTyyppi); }
  function tmKalVainHenkilokunta(x) {
    var raaka = String(x == null ? '' : x).trim().toLowerCase();
    return HK.indexOf(raaka) >= 0 || HK.indexOf(tmKalTyyppiAvain(raaka)) >= 0;
  }

  /* K35-2 (D171, D186): johto näkee kaikki 12; muut kaikki paitsi seuran_tauko (tauon luo VP). Pikavalinnat ensin (JARJESTYS). */
  function tmKalTyypitRoolille(johto) { return tmKalTyypit().filter(function (t) { return johto || t.avain !== 'seuran_tauko'; }); }
  /* Merkki → värit TOKENEISTA (D169; ei hex-arvoja): harj → teal · ott → ink · test → teal · pal → ink3 katkoviiva · tauko → ink3 · muu → ink2 */
  var MERKKI_TYYLI = { harj: { vari: 'var(--teal)', katkoviiva: false }, ott: { vari: 'var(--ink)', katkoviiva: false }, test: { vari: 'var(--teal)', katkoviiva: false }, pal: { vari: 'var(--ink3)', katkoviiva: true }, tauko: { vari: 'var(--ink3)', katkoviiva: false }, muu: { vari: 'var(--ink2)', katkoviiva: false } };
  function tmKalMerkkiTyyli(merkki) { var s = MERKKI_TYYLI[merkki] || MERKKI_TYYLI.muu; return { vari: s.vari, katkoviiva: s.katkoviiva }; }
  /* Selite rekisteristä: ensimmäinen näkyvä tyyppi per merkki (rekisterin järjestyksessä) */
  function tmKalSelite(johto) { var nahty = {}, ulos = []; tmKalTyypitRoolille(johto).forEach(function (t) { if (nahty[t.merkki]) return; nahty[t.merkki] = 1; ulos.push(Object.assign({ tyyli: tmKalMerkkiTyyli(t.merkki) }, t)); }); return ulos; }

  var API = { tmKalTyypitRoolille: tmKalTyypitRoolille, tmKalMerkkiTyyli: tmKalMerkkiTyyli, tmKalSelite: tmKalSelite, TYYPIT: TYYPIT, ALIAKSET: ALIAKSET, JARJESTYS: JARJESTYS, HK_TYYPIT: HK, tmKalTyyppiAvain: tmKalTyyppiAvain, tmKalTyyppi: tmKalTyyppi, tmKalTyypit: tmKalTyypit, tmKalPikavalinnat: tmKalPikavalinnat, tmKalVainHenkilokunta: tmKalVainHenkilokunta };
  if (typeof module !== 'undefined' && module.exports) module.exports = API; else if (root) root.TM_KALENTERI_TYYPIT = API;
})(typeof window !== 'undefined' ? window : null);
