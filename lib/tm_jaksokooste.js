/* ════════════════════════════════════════════════════════════════════════
   tm_jaksokooste.js — Vaihe 6: jakson sulku (meso-sykli) PURE-ydin.
   GENEERINEN jaksosyklimoottori (§8): teknis_taktinen ensimmäisenä ilmentymänä,
   domeeniagnostinen (fyysinen/psyykkinen myöhemmin). Laskee jakson PROSESSIN (§0):
   teemaharjoitukset (4d treeniteema) + läsnäolo (K2) + kalibraation (itse vs aikuis).
   Vaikutus = PEHMEÄ (§28: hidas kehitys = normaali); delta VAIN aidosta mittauksesta (§29).
   PURE (EI Firestore/DOM). Dual-export: module.exports (Vitest) || window.TM_JAKSOKOOSTE.
════════════════════════════════════════════════════════════════════════ */
(function (root) {
  'use strict';

  var DOMEENI_OLETUS = 'teknis_taktinen';   // §8: geneerinen moottori; muut domeenit → sama koodi, eri tagi

  function _valilla(pvm, alku, loppu) {
    if (!pvm) return false;
    var p = String(pvm).slice(0, 10);
    if (alku && p < String(alku).slice(0, 10)) return false;
    if (loppu && p > String(loppu).slice(0, 10)) return false;
    return true;
  }

  // Jakson prosessi: montako teemaharjoitusta (treeniteema.avain === konsepti_avain) osui jaksoväliin
  // JA oliko pelaaja läsnä. tapahtumat: [{treeniteema:{avain,pelaajat_id}, pvm, pelaajat_id, lasnaolo:{pid:tila}}].
  // pelaajaId annettu → tapahtuman on koskettava pelaajaa (tyhjä pelaajat_id = koko joukkue). läsnä = paikalla|myohassa.
  // → { harjoituksia, lasnaolo: { paikalla, yhteensa, tiedossa } }. 0-harjoitusta = jakso ei toteutunut treeneissä (§0).
  function tmJaksonHarjoitukset(tapahtumat, konseptiAvain, alkoi, loppu, pelaajaId) {
    var harjoituksia = 0, paikalla = 0, tiedossa = 0;
    (tapahtumat || []).forEach(function (t) {
      var tt = t && t.treeniteema;
      var avain = tt ? tt.avain : (t ? t.avain : null);
      if (!avain || avain !== konseptiAvain) return;
      if (!_valilla(t.pvm, alkoi, loppu)) return;
      if (pelaajaId) {
        var pid = t.pelaajat_id || (tt && tt.pelaajat_id) || [];
        if (pid.length && pid.indexOf(pelaajaId) < 0) return;   // kohdistettu muille → ei tälle pelaajalle
      }
      harjoituksia++;
      if (pelaajaId && t.lasnaolo && Object.prototype.hasOwnProperty.call(t.lasnaolo, pelaajaId)) {
        tiedossa++;
        var s = t.lasnaolo[pelaajaId];
        if (s === 'paikalla' || s === 'myohassa') paikalla++;
      }
    });
    return { harjoituksia: harjoituksia, lasnaolo: { paikalla: paikalla, yhteensa: harjoituksia, tiedossa: tiedossa } };
  }

  // Kalibraatio = |itsearvio − aikuisarvio| (itsetuntemussignaali §37). null jos jompikumpi puuttuu.
  function tmKalibraatio(itse, aikuis) {
    if (typeof itse !== 'number' || typeof aikuis !== 'number') return null;
    return Math.abs(itse - aikuis);
  }

  // Delta VAIN aidosta mittauksesta (§29): ennen+jalkeen numeroita JA onMittaus tosi → {ennen,jalkeen,muutos}. Muuten null.
  // Käänteinen (pienempi=parempi, esim. TKI-aika) → muutos negatiivinen = parani.
  function tmJaksoDelta(ennen, jalkeen, onMittaus) {
    if (!onMittaus || typeof ennen !== 'number' || typeof jalkeen !== 'number') return null;
    return { ennen: ennen, jalkeen: jalkeen, muutos: Math.round((jalkeen - ennen) * 100) / 100 };
  }

  // Rakenna historia-entry (append jaksofokus_historia[], §26 pikakenttä-array). aikaISO pakollinen (ei serverTimestamp arrayssa).
  function tmHistoriaEntry(o) {
    o = o || {};
    return {
      domeeni: o.domeeni || DOMEENI_OLETUS,
      konsepti_avain: o.konsepti_avain || null,
      konsepti_nimi: o.konsepti_nimi || null,
      alkoi: o.alkoi || null,
      paattyi: o.paattyi || null,
      harjoituksia: o.harjoituksia || 0,
      lasnaolo: o.lasnaolo || null,
      arvio_ennen: (o.arvio_ennen != null ? o.arvio_ennen : null),
      arvio_jalkeen: (o.arvio_jalkeen != null ? o.arvio_jalkeen : null),
      arvio_itse: (o.arvio_itse != null ? o.arvio_itse : null),
      arvio_valmentaja: (o.arvio_valmentaja != null ? o.arvio_valmentaja : null),
      arvio_vp: (o.arvio_vp != null ? o.arvio_vp : null),
      kalibraatio_ero: (o.kalibraatio_ero != null ? o.kalibraatio_ero : null),
      delta_mitattu: o.delta_mitattu || null,
      media: Array.isArray(o.media) ? o.media : [],
      tulos: o.tulos || null,
      lahde_seuraava: o.lahde_seuraava || null,
      suljettu: o.suljettu || null   // ISO
    };
  }

  var API = {
    DOMEENI_OLETUS: DOMEENI_OLETUS,
    tmJaksonHarjoitukset: tmJaksonHarjoitukset,
    tmKalibraatio: tmKalibraatio,
    tmJaksoDelta: tmJaksoDelta,
    tmHistoriaEntry: tmHistoriaEntry
  };
  if (typeof module !== 'undefined' && module.exports) module.exports = API;
  else root.TM_JAKSOKOOSTE = API;
})(typeof window !== 'undefined' ? window : this);
