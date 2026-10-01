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

/* Vaihe 0 / PR 3 — callable-tunnisteen luokitus. Anonyymi kirjautuminen onnistuu Authissa niin kauan
   kuin Anonymous-provider on päällä, joten pelkkä `context.auth` EI riitä. Palauttaa:
     'pelaaja'      — palvelintoken (pelaajaKirjaudu): { rooli:'pelaaja', pelaajaSeuraId, pelaajaId }
     'solo_lapsi'   — palvelintoken (soloLapsiKirjaudu)
     'anonyymi'     — sign_in_provider 'anonymous'
     'kayttaja'     — muu kirjautunut (henkilökunta / vanhempi); oikeus tarkistetaan erikseen
     null           — ei kirjautumista */
function tunnisteTyyppi(auth) {
  if (!auth) return null;
  const tk = auth.token || {};
  if (tk.firebase && tk.firebase.sign_in_provider === 'anonymous') return 'anonyymi';
  if (tk.rooli === 'pelaaja') return 'pelaaja';
  if (tk.rooli === 'solo_lapsi') return 'solo_lapsi';
  return 'kayttaja';
}

/* kuittaaKaavioYmmarretty: kuka saa kuitata pelaajan puolesta?
     'ok'            — pelaajatoken, jonka seura+pelaaja täsmää pyyntöön (identiteetti tokenista)
     'henkilokunta'  — muu kirjautunut → kutsuja tarkistaa tarkistaOikeus(uid, seuraId)
     'evatty'        — anonyymi, Solo-lapsi, toisen pelaajan puolesta, ei kirjautumista */
function kuittausPaatos(auth, seuraId, pelaajaId) {
  const t = tunnisteTyyppi(auth);
  if (t === 'pelaaja') {
    const tk = auth.token;
    return (tk.pelaajaSeuraId === seuraId && tk.pelaajaId === pelaajaId) ? 'ok' : 'evatty';
  }
  if (t === 'kayttaja') return 'henkilokunta';
  return 'evatty';
}

module.exports = { kayttajaRooliSallittu, SALLITUT_KAYTTAJA_ROOLIT, tunnisteTyyppi, kuittausPaatos };
