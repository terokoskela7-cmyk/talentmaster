/**
 * TalentMaster™ — Firebase Configuration
 * ────────────────────────────────────────
 * TÄRKEÄÄ: Lisää tämä tiedosto .gitignoreen JOS käytät eri avaimia
 * eri ympäristöissä (dev/staging/prod).
 *
 * GitHub Pages -rajoitus (Senior Arkkitehdin huomio):
 * ─────────────────────────────────────────────────────
 * GitHub Pages on staattinen hosting — ei serveripuolta.
 * Firebase API key TÄYTYY olla clientissä.
 *
 * Tämä EI ole tietoturvariski jos:
 *   ✅ Firestore Security Rules on konfiguroitu oikein (tehty)
 *   ✅ Firebase Console > API restrictions on asetettu (TEHTÄVÄ)
 *   ✅ Allowed domains rajoitettu: terokoskela7-cmyk.github.io
 *
 * Oikea ratkaisu = Domain Restriction, ei key piilotus.
 * Katso: console.firebase.google.com → Project Settings → API key
 *
 * Paikallinen kehitys: kopioi .env.local -tiedosto (ei versionhallintaan)
 * Tuotanto: tämä config.js riittää kun Domain Restriction on päällä
 */

const TM_CONFIG = {
  firebase: {
    apiKey:            'AIzaSyAp471lOIntzP33p9bIW3y4KbeEyBt5kIo',
    authDomain:        'talentmaster-pilot.firebaseapp.com',
    projectId:         'talentmaster-pilot',
    storageBucket:     'talentmaster-pilot.firebasestorage.app',
    messagingSenderId: '872561784446',
    appId:             '1:872561784446:web:05c4c7996dfd46ddd14a2f',
  },

  // Super Admin tunnistetaan ajonaikaisesti Firestoresta (admins/{uid} exists) + custom claims —
  // ei hardcoded UID:tä täällä (turvallisuushygienia 2026-07-01; grep-varmistettu 0 lukijaa).

  // Ympäristö
  env:    'production',
  region: 'europe-west1',
};

// CommonJS (functions/index.js) tai globaali (HTML-tiedostot)
if (typeof module !== 'undefined' && module.exports) {
  module.exports = TM_CONFIG;
} else {
  window.TM_CONFIG = TM_CONFIG;
}
