/* ════════════════════════════════════════════════════════════════════════
   tm_ohjelma.js — Vaihe 7.2a: fysiikkaohjelmakirjasto PURE-ydin.
   Deterministinen: validoi · versioi · esitäytä templaatista. EI analytiikkaa (7.2b),
   EI AI:ta (7.2c). Rakentuu V7:n ohjelma-slotin (§2c) päälle; moottoria EI muuteta.
   GDPR Art. 9 -vahti (§8): kuvaus/harjoitteet = harjoitussisältöä, EI diagnooseja.
   PURE (EI Firestore/DOM). Dual-export: module.exports (Vitest) || window.TM_OHJELMA_LIB. §34.
════════════════════════════════════════════════════════════════════════ */
(function (root) {
  'use strict';

  var TYYPIT = { nopeus_voima: 1, perusvoima: 1, kuntoutus: 1, nopeus: 1, liikkuvuus: 1, muu: 1 };

  // Vaihe-rakennepohjat (STRUKTUURI, ei kopioitua sisältöä §9): nopeus_voima=Everton-3-porras · kuntoutus=HPP-3-vaihe.
  var VAIHE_POHJAT = {
    nopeus_voima: [
      { vaihe: 'Valmistava', viikot: '1–2', intensiteetti: '60–70 %', nimi: '', ohje: '', mittari: '', harjoitteet: [] },
      { vaihe: 'Kehittävä', viikot: '3–4', intensiteetti: '75–85 %', nimi: '', ohje: '', mittari: '', harjoitteet: [] },
      { vaihe: 'Huipentava', viikot: '5–6', intensiteetti: '90–100 %', nimi: '', ohje: '', mittari: '', harjoitteet: [] }
    ],
    kuntoutus: [
      { vaihe: 'Akuutti', viikot: '1–2', intensiteetti: 'kevyt', nimi: '', ohje: '', mittari: '', harjoitteet: [] },
      { vaihe: 'Subakuutti', viikot: '3–5', intensiteetti: 'kohtalainen', nimi: '', ohje: '', mittari: '', harjoitteet: [] },
      { vaihe: 'Krooninen', viikot: '6–8', intensiteetti: 'progressiivinen', nimi: '', ohje: '', mittari: 'paluukriteerit (RTP)', harjoitteet: [] }
    ]
  };

  // GDPR Art. 9 -kuvio: selkeät diagnoosi-/vammatermit joiden EI kuulu harjoitusohjelman kuvaukseen (→ terveys/).
  // Sanavartaloita (taivutus huomioitu, esim. revähdys → revähdyksen → vartalo "revähd").
  var DIAGNOOSI_RE = /(diagnoosi|revähd|repeäm|ruptuura|rasitusmurtum|murtum|leikkau|operoit|eturistiside|takaristiside|nivelside|rustovauri|niveltulehdus|tulehdus|nyrjähd|venähd|acl-|mcl-)/i;

  function _diagnoosiKuvio(teksti) { return DIAGNOOSI_RE.test(String(teksti || '')); }

  // tmOhjelmaValidoi(o) → {ok, virheet[]}. Pakolliset kentät · intensiteetti-järki (%-vaiheille) · GDPR-vahti.
  function tmOhjelmaValidoi(o) {
    var virheet = [];
    if (!o || typeof o !== 'object') return { ok: false, virheet: ['Ohjelma puuttuu'] };
    if (!o.nimi || !String(o.nimi).trim()) virheet.push('Nimi puuttuu');
    if (!o.tyyppi || !TYYPIT[o.tyyppi]) virheet.push('Tyyppi virheellinen');
    if (!Array.isArray(o.vaiheet) || !o.vaiheet.length) virheet.push('Vähintään yksi vaihe vaaditaan');
    // Intensiteetti-järki: vain %-arvoille (kuntoutus käyttää sanallista → ohitetaan). Nouseva progressio.
    var prevHi = -1;
    (o.vaiheet || []).forEach(function (v, i) {
      if (!v || typeof v !== 'object') { virheet.push('Vaihe ' + (i + 1) + ': virheellinen'); return; }
      if (!String(v.nimi || '').trim()) virheet.push('Vaihe ' + (i + 1) + ': nimi puuttuu');
      var m = String(v.intensiteetti || '').match(/(\d+)\s*[-–]\s*(\d+)\s*%|(\d+)\s*%/);
      if (m) {
        var lo = (m[1] != null) ? +m[1] : +m[3];
        var hi = (m[2] != null) ? +m[2] : +m[3];
        if (lo < 0 || hi > 100 || lo > hi) virheet.push('Vaihe ' + (i + 1) + ': intensiteetti epälooginen (' + v.intensiteetti + ')');
        else { if (lo < prevHi) virheet.push('Vaihe ' + (i + 1) + ': intensiteetti laskee edellisestä (progressio rikki)'); prevHi = hi; }
      }
    });
    // GDPR-vahti (§8): diagnoosikuvio kuvauksessa / vaiheiden ohjeissa / harjoitteissa.
    var teksti = String(o.kuvaus || '') + ' ' + (o.vaiheet || []).map(function (v) {
      return (v ? v.ohje || '' : '') + ' ' + (v && Array.isArray(v.harjoitteet) ? v.harjoitteet.join(' ') : '');
    }).join(' ');
    if (_diagnoosiKuvio(teksti)) virheet.push('Ohjelma sisältää mahdollisen diagnoosin/terveystiedon — kuvaa vain harjoitussisältö (GDPR Art. 9; vamma-/terveystieto kuuluu terveys/-osioon)');
    return { ok: virheet.length === 0, virheet: virheet };
  }

  // tmOhjelmaVersioi(vanha, muutokset) → uusi versio-objekti. Muokkaus = UUSI doc (versio+1), ei ylikirjoita.
  // edellinen_versio_id = vanha.id (lineage). laatija-tiedot säilyvät ellei muutoksissa. paivitetty/luotu = kutsuja leimaa (PURE).
  function tmOhjelmaVersioi(vanha, muutokset) {
    vanha = vanha || {}; muutokset = muutokset || {};
    var uusi = {};
    ['nimi', 'tyyppi', 'kuvaus', 'kesto_vk', 'vaiheet', 'laatija_uid', 'laatija_rooli', 'luotu'].forEach(function (k) {
      uusi[k] = (k in muutokset) ? muutokset[k] : vanha[k];
    });
    uusi.versio = (typeof vanha.versio === 'number' ? vanha.versio : 1) + 1;
    uusi.edellinen_versio_id = vanha.id || vanha.edellinen_versio_id || null;
    uusi.arkistoitu = false;
    uusi.paivitetty = (muutokset.paivitetty != null) ? muutokset.paivitetty : null;
    return uusi;
  }

  // V7-templaatin haku (SSOT-reuse §2): Node → require tm_fyysteemat; selain → window.TM_FYYSTEEMAT_LIB.
  function _v7Templaatti(tyyppi) {
    var lib = null;
    if (typeof module !== 'undefined' && module.exports) { try { lib = require('./tm_fyysteemat.js'); } catch (e) { lib = null; } }
    if (!lib && typeof window !== 'undefined') lib = window.TM_FYYSTEEMAT_LIB;
    return (lib && typeof lib.tmOhjelmaTemplaatti === 'function') ? lib.tmOhjelmaTemplaatti(tyyppi) : null;
  }

  // tmOhjelmaTemplaatista(tyyppi) → esitäytetty ohjelma-luonnos (versio 1). Lainaa V7:n tmOhjelmaTemplaatti +
  // vaihe-rakennepohjan (Everton/HPP-struktuuri). null jos tuntematon tyyppi.
  function tmOhjelmaTemplaatista(tyyppi) {
    if (!tyyppi || !TYYPIT[tyyppi]) return null;
    var t = _v7Templaatti(tyyppi);
    var vaiheet = (VAIHE_POHJAT[tyyppi] || [{ vaihe: 'Vaihe 1', viikot: '1–4', intensiteetti: '', nimi: '', ohje: '', mittari: '', harjoitteet: [] }]).map(function (v) {
      return { vaihe: v.vaihe, viikot: v.viikot, intensiteetti: v.intensiteetti, nimi: v.nimi, ohje: v.ohje, mittari: v.mittari, harjoitteet: v.harjoitteet.slice() };
    });
    return {
      nimi: t ? t.nimi : '', tyyppi: tyyppi, kuvaus: t ? t.kuvaus : '', kesto_vk: t ? t.kesto_vk : 4,
      vaiheet: vaiheet, versio: 1, edellinen_versio_id: null, arkistoitu: false, lahde_templaatti: t ? t.lahde : null
    };
  }

  var API = {
    TYYPIT: TYYPIT, VAIHE_POHJAT: VAIHE_POHJAT,
    tmOhjelmaValidoi: tmOhjelmaValidoi,
    tmOhjelmaVersioi: tmOhjelmaVersioi,
    tmOhjelmaTemplaatista: tmOhjelmaTemplaatista
  };
  if (typeof module !== 'undefined' && module.exports) module.exports = API;
  else root.TM_OHJELMA_LIB = API;
})(typeof window !== 'undefined' ? window : this);
