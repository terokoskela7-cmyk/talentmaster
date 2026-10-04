/* ════════════════════════════════════════════════════════════════════════
   tm_kehityssilmukka.js — R6.1a: suljetun kehityssilmukan YHTEINEN kirjoitusydin (PURE, EI Firestore/DOM).
   Yksi kirjoituspiste per käsite; VP:n ja Masterin ohut adapteri kirjoittaa palautetun muutoksen KERRALLA (update/batch).
   Aiemmin: jaksofokukselle 13 kirjoituskohtaa (VP 8 + Master 5), joista vain Master arkistoi (tmJaksonVaihto) ja VP omalla rinnakkaisella logiikalla.
   · tmAsetaJaksofokus   — jakson ASETUS/VAIHTO: arkistointi AINA tmJaksonVaihto:n kautta (ei rinnakkaista logiikkaa): eri jakso → edellinen
                           jaksofokus_historiaan (sulkutapa:'korvattu'), sama jakso → alkoi säilyy, ei arkistoa. Linkki kauteen/välitavoitteeseen valinnainen.
   · tmSuljeJakso        — jakson SULKU (arvioitu): historiarivi sulkutapa:'suljettu', uusi jaksofokus tai null. Ei kaksoisarkistointia.
   · tmPaivitaJaksofokus — SAMAN jakson osamuutos (osa_arviot, tavoitteet…): dot-path-päivitys (EI syvämergeä); identiteettikentät kiellettyjä.
   Palautus = kirjoitussuunnitelma { jaksofokus | polut, historiaLisays[] } → adapteri: update({jaksofokus, jaksofokus_historia: arrayUnion(...rivit)}).
   §11: vain additiivista (uudet kentät sulkutapa/linkki; historia vain arrayUnion). Aikaleimat ISO-merkkijonoja (§7.6, ei serverTimestamp taulukossa).
   Riippuu lib/tm_jaksokooste.js:stä (TM_JAKSOKOOSTE; Node: require). Dual-export: module.exports || window.TM_KEHITYSSILMUKKA.
════════════════════════════════════════════════════════════════════════ */
(function (root) {
  'use strict';

  function _J() {
    var J = (typeof module !== 'undefined' && module.exports && typeof require === 'function') ? require('./tm_jaksokooste.js') : root.TM_JAKSOKOOSTE;
    if (!J || typeof J.tmJaksonVaihto !== 'function') throw new Error('tm_kehityssilmukka: tm_jaksokooste.js (tmJaksonVaihto) puuttuu');
    return J;
  }
  function _iso(nytISO) { return nytISO || new Date().toISOString(); }

  // Identiteettikentät: jakson vaihto kuuluu tmAsetaJaksofokus:lle, EI osapäivitykselle.
  var IDENTITEETTI = { konsepti_avain: 1, konsepti_nimi: 1, konsepti_koodi: 1, domeeni: 1, alkoi: 1, ohjelma: 1 };
  // Arkistorivin ydinkentät, joita lisakentat (snapshotit) EI saa ylikirjoittaa.
  var YDIN = { domeeni: 1, konsepti_avain: 1, konsepti_nimi: 1, alkoi: 1, paattyi: 1, suljettu: 1, sulkutapa: 1 };

  function _lisaa(rivi, lisakentat) {
    Object.keys(lisakentat || {}).forEach(function (k) { if (!YDIN[k] && lisakentat[k] !== undefined) rivi[k] = lisakentat[k]; });
    return rivi;
  }
  function _linkita(jf, linkki) {
    if (!linkki || typeof linkki !== 'object') return jf;
    var ulos = Object.assign({}, jf);
    if (linkki.tavoite_alue != null) ulos.tavoite_alue = linkki.tavoite_alue;
    if (linkki.valitavoite_idx != null) ulos.valitavoite_idx = linkki.valitavoite_idx;
    if (linkki.oma_jakso === true) ulos.oma_jakso = true;
    return ulos;
  }

  /**
   * tmAsetaJaksofokus(pelaaja, uusiJf, opts) → { jaksofokus, historiaLisays:[rivi], arkisto, sama }
   *   opts: { nytISO, tulos (arkistorivin tulos; oletus null, VP: 'vaihdettu'), lisakentat (esim. sitoumus_snapshot/d3_snapshot), linkki }
   *   Arkistointi VAIN tmJaksonVaihto:n kautta (sama jakso ⇒ historiaLisays [] ja alkoi säilyy).
   */
  function tmAsetaJaksofokus(pelaaja, uusiJf, opts) {
    opts = opts || {};
    var nyt = _iso(opts.nytISO);
    var v = _J().tmJaksonVaihto(pelaaja && pelaaja.jaksofokus, _linkita(uusiJf || {}, opts.linkki), nyt);
    var rivi = null;
    if (v.arkisto) {
      rivi = _lisaa(Object.assign({}, v.arkisto), opts.lisakentat);
      if (opts.tulos !== undefined) rivi.tulos = opts.tulos;
    }
    return { jaksofokus: v.jaksofokus, historiaLisays: rivi ? [rivi] : [], arkisto: rivi, sama: v.sama };
  }

  /**
   * tmSuljeJakso(pelaaja, sulku, opts) → { jaksofokus: uusiJf|null, historiaLisays:[rivi] }
   *   sulku: { alkoi?, loppu?, harjoituksia, lasnaolo, arvio_itse, arvio_valmentaja, arvio_vp, arvioija_rooli, kalibraatio_ero, delta_mitattu, ohjelma, media, tulos, uusi? }
   *   Rivi: sulkutapa:'suljettu', alkoi = sulku.alkoi || jaksofokus.alkoi, paattyi = sulku.loppu || nyt, suljettu = nyt. Uusi jaksofokus ei arkistoi uudelleen.
   *   Ei aktiivista jaksoa → heittää (ei fabrikoida suljettua jaksoa).
   */
  function tmSuljeJakso(pelaaja, sulku, opts) {
    opts = opts || {}; sulku = sulku || {};
    var jf = pelaaja && pelaaja.jaksofokus;
    if (!jf || !(jf.konsepti_avain || jf.konsepti_nimi || jf.ohjelma)) throw new Error('tmSuljeJakso: ei aktiivista jaksoa');
    var J = _J(), nyt = _iso(opts.nytISO);
    var uusi = sulku.uusi || null;
    var rivi = J.tmHistoriaEntry({
      domeeni: jf.domeeni || J.DOMEENI_OLETUS, konsepti_avain: jf.konsepti_avain, konsepti_nimi: jf.konsepti_nimi,
      alkoi: sulku.alkoi || jf.alkoi, paattyi: sulku.loppu || nyt,
      harjoituksia: sulku.harjoituksia, lasnaolo: sulku.lasnaolo,
      arvio_ennen: sulku.arvio_ennen, arvio_jalkeen: sulku.arvio_jalkeen, arvio_itse: sulku.arvio_itse, arvio_valmentaja: sulku.arvio_valmentaja, arvio_vp: sulku.arvio_vp,
      arvioija_rooli: sulku.arvioija_rooli, kalibraatio_ero: sulku.kalibraatio_ero, delta_mitattu: sulku.delta_mitattu,
      ohjelma: sulku.ohjelma !== undefined ? sulku.ohjelma : (jf.ohjelma || null), media: sulku.media, tulos: sulku.tulos,
      lahde_seuraava: uusi ? (uusi.lahde || null) : null, suljettu: nyt
    });
    rivi.sulkutapa = 'suljettu';
    _lisaa(rivi, opts.lisakentat);
    return { jaksofokus: uusi, historiaLisays: [rivi] };
  }

  /**
   * tmPaivitaJaksofokus(pelaaja, osa) → { polut:{ 'jaksofokus.<kenttä>': arvo }, jaksofokus: paikallinen kopio }
   *   Saman jakson osamuutos dot-polkuina (Firestore update({...polut}) → vain nämä alikentät; muu jaksofokus koskematon, ei syvämergeä).
   *   osa: { osa_arviot: {...} } tai sisäkkäinen dot-avain { 'osa_arviot.<koodi>': 3 }. Identiteetti (avain/nimi/domeeni/alkoi/ohjelma) kielletty → heittää.
   *   Ei aktiivista jaksoa → heittää (ei luoda haamujaksoa).
   */
  function tmPaivitaJaksofokus(pelaaja, osa) {
    var jf = pelaaja && pelaaja.jaksofokus;
    if (!jf || typeof jf !== 'object' || !(jf.konsepti_avain || jf.konsepti_nimi || jf.ohjelma)) throw new Error('tmPaivitaJaksofokus: ei aktiivista jaksoa');
    var polut = {}, paikallinen = JSON.parse(JSON.stringify(jf));
    Object.keys(osa || {}).forEach(function (avain) {
      var osat = avain.split('.');
      if (IDENTITEETTI[osat[0]]) throw new Error('tmPaivitaJaksofokus: identiteettikenttää "' + osat[0] + '" ei muuteta osapäivityksellä (käytä tmAsetaJaksofokus)');
      polut['jaksofokus.' + avain] = osa[avain];
      var kohde = paikallinen;
      for (var i = 0; i < osat.length - 1; i++) { if (kohde[osat[i]] == null || typeof kohde[osat[i]] !== 'object') kohde[osat[i]] = {}; kohde = kohde[osat[i]]; }
      kohde[osat[osat.length - 1]] = osa[avain];
    });
    return { polut: polut, jaksofokus: paikallinen };
  }

  var API = { tmAsetaJaksofokus: tmAsetaJaksofokus, tmSuljeJakso: tmSuljeJakso, tmPaivitaJaksofokus: tmPaivitaJaksofokus };
  if (typeof module !== 'undefined' && module.exports) module.exports = API;
  else root.TM_KEHITYSSILMUKKA = API;
})(typeof window !== 'undefined' ? window : this);
