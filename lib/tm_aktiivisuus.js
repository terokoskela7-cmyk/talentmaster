/* ══════════════════════════════════════════════════════════════════════════
   tm_aktiivisuus.js — JAETTU toimihenkilöaktiivisuuden kirjoituspiste

   MIKSI LIB: `viimeisinKirjautuminen` tarvitaan KAIKISSA toimihenkilöapeissa
   (VP · Master · Seura · Testaus · Pelihavainto/ADAR · UTJ). Inline-kopio per
   appi on sama driftirakenne joka tuotti `lasnaolo_n`-aukon: Master kasvatti,
   VP ei, eikä kukaan huomannut. Yksi kirjoituspiste, yksi vartija.

   JUURISYY jonka tämä korjaa (verifioitu mainista 20.9.2026):
   `viimeisinKirjautuminen` oli koodipohjassa VAIN lukuna — VP_v25 `laskeVAI`
   n4 (Kontakti, paino 0.15) luki sen, mutta mikään ei kirjoittanut. Seuraus:
   n4 = 0 jokaisella valmentajalla → VAI+ jopa 15 p liian matala + punainen
   "Ei kirjautunut 30pv" jokaisella kortilla, myös aktiivisimmalla.

   NIMI ON camelCase `viimeisinKirjautuminen`. docs/PILOTIN_TILA_SPEC.md ehdotti
   aikanaan snake_case-muunnelmaa — sen käyttö jättäisi VP:n VAI+:n rikki, koska
   VP on tuotannossa ja lukee camelCasea. ÄLÄ vaihda kirjoitusasua.
   Vartija: tests/kirjautumisaikaleima.test.js kieltää snake-muodon koodissa.

   RULES: EI muutosta. Oman uid:n `kayttajat`-dokin update, `rooli`/`seuraId` ei
   muutu → sääntö 928 sallii (sama polku kuin `_tmLaskuri`).
   GDPR: aikaleima, ei sisältöä. Kertoo MILLOIN, ei mitä.
   ══════════════════════════════════════════════════════════════════════════ */
(function (global) {
  'use strict';

  var VERSIO = '1.0.0';

  /* Kirjoitetaan KERRAN per selainsessio, ei joka sivulatauksella.
     Mittarin tarkkuus on päivätasoa (30 pv -ikkuna) → 1 write/sessio riittää.
     sessionStorage, ei localStorage: uusi sessio = uusi kirjautuminen. */
  var AVAIN = 'tm_kirjautuminen_merkitty_';

  function _jo(uid) {
    try { return global.sessionStorage.getItem(AVAIN + uid) === '1'; } catch (e) { return false; }
  }
  function _merkitse(uid) {
    try { global.sessionStorage.setItem(AVAIN + uid, '1'); } catch (e) { /* private mode → kirjoitetaan uudelleen, ei haittaa */ }
  }

  /**
   * Merkitsee toimihenkilön kirjautumisen omaan kayttajat-dokkiin.
   *
   * @param {object} db       Firestore-instanssi (compat)
   * @param {string} seuraId  seuran id — SA:lla ei ole → kutsu ohitetaan
   * @param {string} uid      kirjautuneen oma uid (EI koskaan toisen)
   * @param {object} [opt]    { pakota: true } ohittaa sessiovahdin (testit)
   * @returns {Promise} aina resolvoituva — EI saa kaataa kirjautumista
   */
  function merkitseKirjautuminen(db, seuraId, uid, opt) {
    try {
      if (!db || !seuraId || !uid) return Promise.resolve(false);
      if (seuraId === 'demo' || uid === 'demo') return Promise.resolve(false);
      if (!(opt && opt.pakota) && _jo(uid)) return Promise.resolve(false);
      _merkitse(uid);
      return db.collection('seurat').doc(seuraId).collection('kayttajat').doc(uid)
        .update({ viimeisinKirjautuminen: global.firebase.firestore.FieldValue.serverTimestamp() })
        .then(function () { return true; })
        .catch(function () { return false; });   // best-effort: ei dokkia / ei oikeutta → hiljaa
    } catch (e) { return Promise.resolve(false); }
  }

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
    merkitseKirjautuminen: merkitseKirjautuminen,
    aikaMs: aikaMs,
    paiviaKirjautumisesta: paiviaKirjautumisesta
  };

  global.tmAktiivisuus = API;
  /* HTML onclick/inline näkee vain window-globaalit (§7.17) — lisäksi lyhyt alias. */
  global.tmMerkitseKirjautuminen = merkitseKirjautuminen;
  if (typeof module !== 'undefined' && module.exports) module.exports = API;
})(typeof window !== 'undefined' ? window : globalThis);
