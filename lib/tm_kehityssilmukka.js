/* ════════════════════════════════════════════════════════════════════════
   tm_kehityssilmukka.js — R6.1a: suljetun kehityssilmukan YHTEINEN kirjoitusydin (PURE, EI Firestore/DOM).
   Yksi kirjoituspiste per käsite; VP:n ja Masterin ohut adapteri kirjoittaa palautetun muutoksen KERRALLA (update/batch).
   Aiemmin: jaksofokukselle 13 kirjoituskohtaa (VP 8 + Master 5), joista vain Master arkistoi (tmJaksonVaihto) ja VP omalla rinnakkaisella logiikalla.
   · tmAsetaJaksofokus   — jakson ASETUS/VAIHTO: arkistointi AINA tmJaksonVaihto:n kautta (ei rinnakkaista logiikkaa): eri jakso → edellinen
                           jaksofokus_historiaan (sulkutapa:'korvattu'), sama jakso → alkoi säilyy, ei arkistoa. Linkki kauteen/välitavoitteeseen valinnainen.
   · tmSuljeJakso        — jakson SULKU (arvioitu): historiarivi sulkutapa:'suljettu', uusi jaksofokus tai null. Ei kaksoisarkistointia.
   · tmKirjaaKatselmus   — R6.2a: katselmus yhteen paikkaan (reviewit/{pvm} + review_viimeisin_*), kummallekin polulle sama tietue.
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

  // Prototyyppisaastesuojaus: dot-polun ja sisäkkäisten avainten osat.
  function _vaarallinen(k) { return k === '__proto__' || k === 'constructor' || k === 'prototype'; }
  // Firestore update() kaatuu undefined-arvoihin (myös sisäkkäisissä objekteissa/taulukoissa); sisäkkäiset __proto__/constructor/prototype-avaimet hylätään myös.
  function _onUndefined(v) {
    if (v === undefined) return true;
    if (v && typeof v === 'object') return Object.keys(v).some(function (k) { return _vaarallinen(k) || _onUndefined(v[k]); });
    return false;
  }
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
    var uusi = _linkita(uusiJf || {}, opts.linkki);
    if (!uusi.alkoi) uusi = Object.assign({}, uusi, { alkoi: nyt });   // uudelta jaksolta puuttuu alkoi → nyt (sama jakso: vanha alkoi säilyy tmJaksonVaihto:ssa)
    var v = _J().tmJaksonVaihto(pelaaja && pelaaja.jaksofokus, uusi, nyt);
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
    if (uusi && !uusi.alkoi) uusi = Object.assign({}, uusi, { alkoi: nyt });   // uudelta jaksolta puuttuu alkoi → nyt
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
      osat.forEach(function (o) { if (_vaarallinen(o)) throw new Error('tmPaivitaJaksofokus: kielletty avain "' + o + '"'); });
      if (_onUndefined(osa[avain])) throw new Error('tmPaivitaJaksofokus: arvo "' + avain + '" sisältää undefined (Firestore update hylkäisi) tai kielletyn avaimen');
      if (IDENTITEETTI[osat[0]]) throw new Error('tmPaivitaJaksofokus: identiteettikenttää "' + osat[0] + '" ei muuteta osapäivityksellä (käytä tmAsetaJaksofokus)');
      polut['jaksofokus.' + avain] = osa[avain];
      var kohde = paikallinen;
      for (var i = 0; i < osat.length - 1; i++) { if (kohde[osat[i]] == null || typeof kohde[osat[i]] !== 'object') kohde[osat[i]] = {}; kohde = kohde[osat[i]]; }
      kohde[osat[osat.length - 1]] = osa[avain];
    });
    return { polut: polut, jaksofokus: paikallinen };
  }

  /**
   * R6.2a — KATSELMUS YHTEEN PAIKKAAN. tmKirjaaKatselmus(pelaaja, katselmus) → kirjoitussuunnitelma
   *   { reviewitPvm, reviewitData, pikakentat }  (adapteri: batch.set(reviewit/{pvm}, data, {merge:true}) + batch.set(pelaajaDoc, pikakentat, {merge:true}))
   * Sama tietue KUMMALLEKIN polulle: MDT-/bulk-merkintä (tyyppi 'mdr') ja cockpitin "Kirjaa kehityskeskustelu" (tyyppi 'kehityskeskustelu') kirjoittavat
   * reviewit/{pvm} + pikakentät review_viimeisin_pvm/-tyyppi → katselmusrytmi (laskeReviewKadenssi lukee vain näitä) nollautuu molemmista.
   * Ennen: cockpit-polku ei kirjoittanut review_viimeisin_pvm:ää → "katselmus myöhässä" jäi näkyviin keskustelun jälkeenkin.
   *   katselmus: { tyyppi, pvm 'YYYY-MM-DD' (paikallinen päivä, adapteri: tmPaivaIso), tekija_uid, tekija_rooli, paatos, idp_paivitetty, ikavaihe, arvio, tagit? }
   *   · reviewit/{pvm} kirjoitetaan merge:lla → saman päivän toinen katselmus (esim. MDT + cockpit) EI pyyhi ensimmäisen kenttiä (§11 additiivinen)
   *   · pikakentät eivät VANHENE: aiempaa myöhäisempi review_viimeisin_pvm säilyy (jälkikäteen kirjattu vanha katselmus ei palauta rytmiä taaksepäin)
   *   · review_tagit pikakenttään (+ tagit reviewit-dokkiin, aggregoitava) vain jos tagit annettu (cockpit; sanitointi on adapterin/sanaston asia)
   *   Aikaleimat/pvm ISO-merkkijonoja; undefined-kentät karsitaan (Firestore hylkää). Virheellinen pvm → heittää (ei kirjoiteta väärälle päivälle).
   */
  function tmKirjaaKatselmus(pelaaja, katselmus) {
    katselmus = katselmus || {};
    var pvm = katselmus.pvm;
    if (typeof pvm !== 'string' || !/^\d{4}-\d{2}-\d{2}$/.test(pvm)) throw new Error('tmKirjaaKatselmus: pvm (YYYY-MM-DD) vaaditaan');
    var tyyppi = katselmus.tyyppi;
    if (typeof tyyppi !== 'string' || !tyyppi) throw new Error('tmKirjaaKatselmus: tyyppi vaaditaan');
    var data = {};
    Object.keys(katselmus).forEach(function (k) { if (katselmus[k] !== undefined) data[k] = katselmus[k]; });   // tagit mukana myös reviewit-dokissa (aggregoitava)
    var pk = {};
    var edellinen = pelaaja && pelaaja.review_viimeisin_pvm;
    var edellinenIso = (typeof edellinen === 'string') ? edellinen.slice(0, 10) : null;
    if (!(edellinenIso && /^\d{4}-\d{2}-\d{2}$/.test(edellinenIso) && edellinenIso > pvm)) { pk.review_viimeisin_pvm = pvm; pk.review_viimeisin_tyyppi = tyyppi; }
    if (Array.isArray(katselmus.tagit)) pk.review_tagit = katselmus.tagit.slice();
    return { reviewitPvm: pvm, reviewitData: data, pikakentat: pk };
  }

  var API = { tmAsetaJaksofokus: tmAsetaJaksofokus, tmSuljeJakso: tmSuljeJakso, tmPaivitaJaksofokus: tmPaivitaJaksofokus, tmKirjaaKatselmus: tmKirjaaKatselmus };
  if (typeof module !== 'undefined' && module.exports) module.exports = API;
  else root.TM_KEHITYSSILMUKKA = API;
})(typeof window !== 'undefined' ? window : this);
