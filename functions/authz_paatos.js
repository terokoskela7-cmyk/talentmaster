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

/* Korjaus-PR 2 (VP-periaate 5.10.2026): VP tunnistetaan myös CUSTOM CLAIMEISTA (rooli + seuraId), kun seura.vp_uid on tyhjä/osoittaa muualle JA seuran kayttajat-dokumenttia
   ei ole (esim. epäonnistunut/kesken jäänyt luoKayttaja: claimit asetettu, dokumentti puuttuu; vp_uid vapautettu deaktivoinnissa). Päätös:
     · token.seuraId === seuraId ja token.rooli ∈ SALLITUT_KAYTTAJA_ROOLIT (vp/utj/seurasihteeri), ei anonyymi
     · kayttajat-dokumentti on TOTUUS jos se on olemassa: aktiivinen === false → EI oikeuksia (claimi voi elää ≤ 1 h tokenissa); dokumentin rooli ei sallittu (esim. alennettu
       valmentajaksi) → EI oikeuksia (vanhentunut claimi ei nosta). Claimit asettaa vain palvelin (luoKayttaja/vaihdaKayttajanRooli) → luotettavia. Palauttaa roolin tai null. */
function kayttajaRooliClaimeista(token, seuraId, kayttajaData) {
  if (!token || !seuraId || token.seuraId !== seuraId) return null;
  if (token.firebase && token.firebase.sign_in_provider === 'anonymous') return null;
  if (!SALLITUT_KAYTTAJA_ROOLIT.includes(token.rooli)) return null;
  if (kayttajaData) return kayttajaRooliSallittu(kayttajaData) === token.rooli ? token.rooli : null;   // dokumentti ratkaisee (aktiivinen + rooli täsmää claimiin)
  return token.rooli;                                                                                   // dokumenttia ei ole → claimi
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

module.exports = { kayttajaRooliSallittu, kayttajaRooliClaimeista, SALLITUT_KAYTTAJA_ROOLIT, tunnisteTyyppi, kuittausPaatos };
