/* ══════════════════════════════════════════════════════════════════════════
   tm_aktiivisuus.js — JAETTU toimihenkilöaktiivisuuden LUKU (aikaMs · paiviaKirjautumisesta)

   Projekti 03 (PR C): sovellusten kirjoituspiste POISTETTU. `seurat/{sid}/kayttajat/{uid}.viimeisinKirjautuminen`
   kirjoitetaan palvelimella (functions/kirjautumisaika.js, yöajo 3.30 Helsinki, Auth lastSignInTime) — mikään sovellus ei kirjoita sitä
   avauksessa. Vartija: tests/avauskirjoitukset_vartija.test.js. Lukijat (VP laskeVAI n4, Seuranta) käyttävät tämän moduulin lukufunktioita.

   NIMI ON camelCase `viimeisinKirjautuminen`. ÄLÄ vaihda kirjoitusasua (VP lukee camelCasea).
   Vartija: tests/kirjautumisaikaleima.test.js kieltää snake-muodon koodissa.
   ══════════════════════════════════════════════════════════════════════════ */
(function (global) {
  'use strict';

  var VERSIO = '1.0.0';

  /**
   * Aikaleima → ms. Firestore Timestamp | Date | ISO-string | null.
   * §7.23: serverTimestamp palauttaa Timestamp-objektin, ei ISO-stringiä.
   */
  function aikaMs(v) {
    try {
      if (!v) return null;
      if (typeof v.toDate === 'function') return v.toDate().getTime();
      if (v instanceof Date) return v.getTime();
      var ms = new Date(v).getTime();
      return isNaN(ms) ? null : ms;
    } catch (e) { return null; }
  }

  /**
   * Päiviä viimeisimmästä kirjautumisesta, tai **null jos dataa ei ole**.
   *
   * TYHJÄ ≠ 0 (kriittinen): kenttä täyttyy vasta kun käyttäjä kirjautuu uuden
   * koodin jälkeen — migraatiota ei ole. Ennen sitä näytä "ei dataa", ÄLÄ
   * "0 pv sitten" eikä punaista hälytystä, muuten koko pilotin baseline
   * näyttäisi katastrofilta juuri koulutusviikolla.
   */
  function paiviaKirjautumisesta(v, nytMs) {
    var ms = aikaMs(v);
    if (!ms) return null;
    var nyt = (typeof nytMs === 'number') ? nytMs : Date.now();
    return Math.max(0, Math.floor((nyt - ms) / 86400000));
  }

  var API = {
    VERSIO: VERSIO,
    KENTTA: 'viimeisinKirjautuminen',
    aikaMs: aikaMs,
    paiviaKirjautumisesta: paiviaKirjautumisesta
  };

  global.tmAktiivisuus = API;
  if (typeof module !== 'undefined' && module.exports) module.exports = API;
})(typeof window !== 'undefined' ? window : globalThis);
