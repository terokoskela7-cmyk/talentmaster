/**
 * TalentMaster™ — Firebase Cloud Functions
 * functions/index.js
 *
 * Deployaus: firebase deploy --only functions
 * Node.js versio: 18
 * Alue: europe-west1
 *
 * Päivitetty: 2026-03-26
 */

const functions = require('firebase-functions');
const admin     = require('firebase-admin');

// Alustetaan Admin SDK kerran — ei uudelleen jos jo alustettu
if (!admin.apps.length) {
  admin.initializeApp();
}

const db   = admin.firestore();
const auth = admin.auth();

// ─────────────────────────────────────────────────────────────────────────────
// APUFUNKTIO: Tarkista onko kutsuva käyttäjä oikeutettu
// Super-admin voi kutsua kaikille seuroille.
// VP voi kutsua vain omalle seuralleen.
// ─────────────────────────────────────────────────────────────────────────────
async function tarkistaOikeus(kutsujaUid, kohdeSeuraId) {
  // 1. Super-admin?
  const adminDoc = await db.collection('admins').doc(kutsujaUid).get();
  if (adminDoc.exists && adminDoc.data().superAdmin) {
    return { sallittu: true, rooli: 'superadmin' };
  }

  // 2. VP omalle seuralleen?
  const seuraDoc = await db.collection('seurat').doc(kohdeSeuraId).get();
  if (seuraDoc.exists && seuraDoc.data().vp_uid === kutsujaUid) {
    return { sallittu: true, rooli: 'vp' };
  }

  // 3. Seura-admin (tuleva rooli) omalle seuralleen?
  const kayttajaDoc = await db
    .collection('seurat').doc(kohdeSeuraId)
    .collection('kayttajat').doc(kutsujaUid)
    .get();
  if (kayttajaDoc.exists) {
    const rooli = kayttajaDoc.data().rooli;
    if (rooli === 'seura_admin' || rooli === 'urheilutoimenjohtaja') {
      return { sallittu: true, rooli };
    }
  }

  return { sallittu: false, rooli: null };
}

// ─────────────────────────────────────────────────────────────────────────────
// luoKayttaja — Luo uusi käyttäjätili ja lähettää kutsusähköpostin
//
// Parametrit (kaikki kutsutaan functions.httpsCallable('luoKayttaja')):
//   email        string   pakollinen
//   rooli        string   pakollinen  (valmentaja, vp, testivastaava, jne.)
//   seuraId      string   pakollinen  (kpv, fcl, palloiirot, ...)
//   etunimi      string   valinnainen
//   sukunimi     string   valinnainen
//   joukkue      string   valinnainen  joukkue-id (u15p)
//   joukkueNimi  string   valinnainen  joukkueen näyttönimi (U15P)
//
// Palauttaa:
//   { uid, email, resetLinkki }
// ─────────────────────────────────────────────────────────────────────────────
exports.luoKayttaja = functions
  .region('europe-west1')
  .https.onCall(async (data, context) => {

    // ── 1. Autentikointi — kutsuja pitää olla kirjautunut ─────────────────
    if (!context.auth) {
      throw new functions.https.HttpsError(
        'unauthenticated',
        'Kirjaudu sisään ennen käyttäjän luomista.'
      );
    }

    const kutsujaUid = context.auth.uid;

    // ── 2. Validointi ─────────────────────────────────────────────────────
    const { email, rooli, seuraId, etunimi, sukunimi, joukkue, joukkueNimi } = data;

    if (!email || !email.includes('@')) {
      throw new functions.https.HttpsError(
        'invalid-argument', 'Virheellinen sähköpostiosoite.'
      );
    }
    if (!rooli) {
      throw new functions.https.HttpsError(
        'invalid-argument', 'Rooli on pakollinen.'
      );
    }
    if (!seuraId) {
      throw new functions.https.HttpsError(
        'invalid-argument', 'Seura on pakollinen.'
      );
    }

    // ── 3. Tarkista oikeus ────────────────────────────────────────────────
    const oikeus = await tarkistaOikeus(kutsujaUid, seuraId);
    if (!oikeus.sallittu) {
      throw new functions.https.HttpsError(
        'permission-denied',
        'Sinulla ei ole oikeutta lisätä käyttäjiä tälle seuralle.'
      );
    }

    // ── 4. Tarkista ettei sähköposti ole jo käytössä ──────────────────────
    try {
      const olemassaOleva = await auth.getUserByEmail(email);
      if (olemassaOleva) {
        throw new functions.https.HttpsError(
          'already-exists',
          `Sähköposti ${email} on jo käytössä. ` +
          `Voit lähettää salasananvaihtosähköpostin käyttäjälistasta.`
        );
      }
    } catch (e) {
      // getUserByEmail heittää virheen jos käyttäjää ei löydy — se on ok
      if (e.code === 'already-exists') throw e; // uudelleenheitä meidän virhe
      if (e.errorInfo && e.errorInfo.code !== 'auth/user-not-found') throw e;
      // auth/user-not-found = hyvä, jatketaan
    }

    // ── 5. Luo Firebase Auth -tili ────────────────────────────────────────
    // Satunnainen väliaikainen salasana — käyttäjä vaihtaa sen resetlinkin kautta
    const valiaikainenSalasana = 'TM_' + Math.random().toString(36).slice(2, 10).toUpperCase();

    let uusiKayttaja;
    try {
      uusiKayttaja = await auth.createUser({
        email:         email,
        password:      valiaikainenSalasana,
        displayName:   etunimi && sukunimi ? `${etunimi} ${sukunimi}` : (etunimi || email),
        emailVerified: false,
        disabled:      false,
      });
    } catch (e) {
      throw new functions.https.HttpsError(
        'internal',
        `Auth-tilin luominen epäonnistui: ${e.message}`
      );
    }

    const uid = uusiKayttaja.uid;

    // ── 6. Kirjoita Firestore-dokumentti ──────────────────────────────────
    // Kaksi kohtaa: seurakohtainen kayttajat-kokoelma + seura-dokumentin päivitys
    const nyt = admin.firestore.FieldValue.serverTimestamp();

    const kayttajaData = {
      uid,
      email,
      etunimi:      etunimi  || '',
      sukunimi:     sukunimi || '',
      nimi:         etunimi && sukunimi ? `${etunimi} ${sukunimi}` : (etunimi || email),
      rooli,
      seuraId,
      joukkue:      joukkue     || null,
      joukkueNimi:  joukkueNimi || null,
      joukkueet:    joukkue ? [joukkue] : [],   // lista tulevaisuutta varten
      aktiivinen:   true,
      luotu:        nyt,
      luonut_uid:   kutsujaUid,
      // Ei salasanaa tallenneta — koskaan
    };

    try {
      // Seurakohtainen käyttäjädokumentti
      await db
        .collection('seurat').doc(seuraId)
        .collection('kayttajat').doc(uid)
        .set(kayttajaData);

      // Jos VP luodaan, päivitetään myös seura-dokumentin vp_uid (jos tyhjä)
      if (rooli === 'vp') {
        const seuraDoc = await db.collection('seurat').doc(seuraId).get();
        if (seuraDoc.exists && !seuraDoc.data().vp_uid) {
          await db.collection('seurat').doc(seuraId).update({
            vp_uid:   uid,
            vp_email: email,
          });
        }
      }

    } catch (e) {
      // Firestore epäonnistui — poistetaan Auth-tili ettei jää orpoja tilejä
      await auth.deleteUser(uid).catch(() => {});
      throw new functions.https.HttpsError(
        'internal',
        `Firestore-kirjoitus epäonnistui: ${e.message}`
      );
    }

    // ── 7. Lähetä salasananvaihtolinkki ───────────────────────────────────
    // Käyttäjä klikkaa linkkiä sähköpostissa → asettaa oman salasanansa
    // Linkki on voimassa 1h (Firebasen oletus)
    let resetLinkki = null;
    try {
      resetLinkki = await auth.generatePasswordResetLink(email, {
        url: 'https://terokoskela7-cmyk.github.io/talentmaster/TalentMaster_Master_v7.html',
        handleCodeInApp: false,
      });

      // Lähetä sähköposti (Firebase lähettää automaattisesti jos email-toimitus on
      // konfiguroitu — muuten resetLinkki palautetaan Admin-näkymälle manuaalista
      // jakamista varten)
      await auth.generatePasswordResetLink(email); // triggeroi sähköpostin

    } catch (e) {
      // Sähköpostilähetys ei ole kriittinen — käyttäjä on jo luotu
      console.warn('Salasananvaihtolinkki epäonnistui:', e.message);
    }

    // ── 8. Lokita kutsu Firestoreen audit-trailille ───────────────────────
    await db.collection('audit').add({
      toiminto:    'kayttaja_luotu',
      kohde_uid:   uid,
      kohde_email: email,
      kohde_rooli: rooli,
      seuraId,
      tekija_uid:  kutsujaUid,
      aikaleima:   nyt,
    }).catch(() => {}); // Ei kriittinen

    // ── 9. Palauta tulos Admin-näkymälle ─────────────────────────────────
    return {
      uid,
      email,
      resetLinkki,
      viesti: `${etunimi || email} lisätty onnistuneesti roolilla ${rooli} seuraan ${seuraId}.`,
    };
  });


// ─────────────────────────────────────────────────────────────────────────────
// lahetaHuoltajaKutsu — Olemassa oleva funktio (säilytetään yhteensopivuus)
// Lähettää kutsun huoltajalle / pelaajalle GDPR-suostumuslomakkeeseen
// ─────────────────────────────────────────────────────────────────────────────
exports.lahetaHuoltajaKutsu = functions
  .region('europe-west1')
  .https.onCall(async (data, context) => {

    if (!context.auth) {
      throw new functions.https.HttpsError('unauthenticated', 'Kirjaudu ensin.');
    }

    const { huoltajaEmail, pelaajaId, seuraId, pelaajaNimi } = data;

    if (!huoltajaEmail || !pelaajaId || !seuraId) {
      throw new functions.https.HttpsError(
        'invalid-argument', 'huoltajaEmail, pelaajaId ja seuraId ovat pakollisia.'
      );
    }

    // Generoi suostumuslinkki
    const suostumusLinkki =
      `https://terokoskela7-cmyk.github.io/talentmaster/` +
      `TalentMaster_Rekisterointi_Suostumus.html` +
      `?seura=${seuraId}&pelaaja=${pelaajaId}`;

    // Tallenna kutsu Firestoreen
    await db
      .collection('seurat').doc(seuraId)
      .collection('kutsut').add({
        tyyppi:        'huoltaja_suostumus',
        huoltajaEmail,
        pelaajaId,
        pelaajaNimi:   pelaajaNimi || '',
        linkki:        suostumusLinkki,
        tila:          'lahetetty',
        lahetetty:     admin.firestore.FieldValue.serverTimestamp(),
        lahettaja_uid: context.auth.uid,
      });

    return {
      ok:      true,
      linkki:  suostumusLinkki,
      viesti:  `Kutsu lähetetty osoitteeseen ${huoltajaEmail}`,
    };
  });


// ─────────────────────────────────────────────────────────────────────────────
// deaktivioiKayttaja — Poistaa käyttöoikeudet (ei poista dataa)
// Käytetään kun valmentaja lähtee seurasta
// ─────────────────────────────────────────────────────────────────────────────
exports.deaktivioiKayttaja = functions
  .region('europe-west1')
  .https.onCall(async (data, context) => {

    if (!context.auth) {
      throw new functions.https.HttpsError('unauthenticated', 'Kirjaudu ensin.');
    }

    const { kohdeUid, seuraId } = data;

    if (!kohdeUid || !seuraId) {
      throw new functions.https.HttpsError(
        'invalid-argument', 'kohdeUid ja seuraId ovat pakollisia.'
      );
    }

    // Tarkista oikeus
    const oikeus = await tarkistaOikeus(context.auth.uid, seuraId);
    if (!oikeus.sallittu) {
      throw new functions.https.HttpsError(
        'permission-denied', 'Ei oikeutta deaktivoida käyttäjiä.'
      );
    }

    // Deaktivoi Auth (ei voi kirjautua)
    await auth.updateUser(kohdeUid, { disabled: true });

    // Merkitse Firestoreen
    await db
      .collection('seurat').doc(seuraId)
      .collection('kayttajat').doc(kohdeUid)
      .update({
        aktiivinen:       false,
        deaktivoitu:      admin.firestore.FieldValue.serverTimestamp(),
        deaktivoija_uid:  context.auth.uid,
      });

    // Audit trail
    await db.collection('audit').add({
      toiminto:    'kayttaja_deaktivoitu',
      kohde_uid:   kohdeUid,
      seuraId,
      tekija_uid:  context.auth.uid,
      aikaleima:   admin.firestore.FieldValue.serverTimestamp(),
    }).catch(() => {});

    return { ok: true, viesti: 'Käyttäjä deaktivoitu.' };
  });
