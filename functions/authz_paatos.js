// Pure authz-päätös seuran kayttajat-dokumentin roolista (#71, Sibbo-bugi 2026-06-29).
// EI firebase-riippuvuuksia → unit-testattava (functions/index.js itse alustaa admin SDK:n → ei importattavissa Vitestiin).
// tarkistaOikeus kutsuu tätä Firestore-haun jälkeen. Behavior identtinen spec-inline-version kanssa:
//   sallittu IFF aktiivinen !== false JA rooli ∈ sallitut.
const SALLITUT_KAYTTAJA_ROOLIT = ['vp', 'urheilutoimenjohtaja', 'seurasihteeri'];   // #72: 'seura_admin' poistettu (0 käyttäjää, ei §4-taksonomiassa)

// Palauttaa sallitun roolin (string) tai null. VP mukana: seuralla voi olla useita VP:itä, mutta
// seurat/{id}.vp_uid osoittaa vain yhteen → ilman tätä 2. VP ei saa kutsu-/reset-/muistutusoikeuksia.
// Deaktivoitu käyttäjä (aktiivinen === false) ei saa oikeuksia.
function kayttajaRooliSallittu(kayttajaData) {
  if (!kayttajaData) return null;
  if (kayttajaData.aktiivinen === false) return null;
  return SALLITUT_KAYTTAJA_ROOLIT.includes(kayttajaData.rooli) ? kayttajaData.rooli : null;
}

module.exports = { kayttajaRooliSallittu, SALLITUT_KAYTTAJA_ROOLIT };
