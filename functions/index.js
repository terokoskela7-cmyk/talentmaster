/**
 * TalentMaster™ — Firebase Cloud Functions
 * Projekti: talentmaster-pilot (Blaze plan)
 *
 * Tämä tiedosto hoitaa Custom Claims -asetuksen automaattisesti
 * kaikille käyttäjärooleille. Kun VP luo uuden valmentajan
 * Admin-näkymässä (tai kun super-admin luo VP:n), Firebase
 * kirjoittaa Firestoreen kayttajat-dokumentin, ja nämä
 * funktiot reagoivat siihen välittömästi.
 *
 * ARKKITEHTUURI:
 *   Firestore-kirjoitus → Cloud Function triggeröityy
 *     → setCustomUserClaims() asettaa JWT-tokeniin:
 *         { seuraId, rooli, joukkue }
 *     → Käyttäjän seuraava kirjautuminen (tai token-refresh)
 *       hakee uudet claims automaattisesti
 *
 * DEPLOY:
 *   cd functions && npm install
 *   firebase deploy --only functions
 *
 * VAATII: Firebase Blaze plan + firebase-admin + firebase-functions
 */

const functions  = require('firebase-functions');
const { defineString } = require('firebase-functions/params');
const admin      = require('firebase-admin');
const nodemailer = require('nodemailer');

admin.initializeApp();

// ─────────────────────────────────────────────────────────────────
// GMAIL-TRANSPORT — Nodemailer
//
// Käytetään Firebase Functions params -APIa (uusi tapa).
// Arvot haetaan ympäristömuuttujista jotka asetetaan
// GitHub Secretseissä: GMAIL_EMAIL ja GMAIL_APP_PASSWORD
// ─────────────────────────────────────────────────────────────────

// Määritellään parametrit — haetaan process.env:stä
// joka toimii sekä GitHub Actionsissa että Firebase Consolessa
function luoGmailTransport() {
  const email = process.env.GMAIL_EMAIL;
  const pass  = process.env.GMAIL_APP_PASSWORD;

  if (!email || !pass) {
    functions.logger.warn('Gmail-konfiguraatio puuttuu — sähköpostit eivät toimi');
    return null;
  }

  return nodemailer.createTransport({
    service: 'gmail',
    auth: { user: email, pass },
  });
}

// ─────────────────────────────────────────────────────────────────
// APUFUNKTIO: claims-objektin rakentaminen roolin perusteella
//
// Tämä on yhteinen logiikka kaikille triggereille.
// Claims tallennetaan JWT-tokeniin, joten pidä ne pienenä —
// maksimikoko on 1000 tavua. Käytä vain kenttiä joita
// tarvitaan Security Rules -tarkistuksiin ja UI-logiikkaan.
// ─────────────────────────────────────────────────────────────────
function rakennaClaims(data, seuraId) {
  const rooli = data.rooli || 'valmentaja';

  // Kaikille rooleille yhteiset kentät
  const claims = {
    rooli:    rooli,
    seuraId:  seuraId || data.seuraId || null,
  };

  // Roolitärkeyttä vaativat lisäkentät
  switch (rooli) {
    case 'valmentaja':
    case 'testivastaava':
    case 'talenttivalmentaja':
    case 'fysiikkavalmentaja':
    case 'fysioterapeutti':
      // Valmentajatasoilla joukkue rajaa näkyvyyttä
      claims.joukkue = data.joukkue || null;
      break;

    case 'vp':
    case 'seurasihteeri':
    case 'urheilutoimenjohtaja':
      // Seura-tason roolit näkevät koko seuran — ei joukkuerajausta
      claims.joukkue = null;
      break;

    case 'superadmin':
      // Super-admin näkee kaiken — ei seura- eikä joukkuerajausta
      claims.seuraId  = null;
      claims.joukkue  = null;
      claims.superAdmin = true;
      break;

    default:
      claims.joukkue = data.joukkue || null;
  }

  return claims;
}

// ─────────────────────────────────────────────────────────────────
// TRIGGER 1: Uusi käyttäjä luodaan
//
// Polku: seurat/{seuraId}/kayttajat/{uid}
//
// Tämä triggeröityy kun VP tai super-admin luo uuden käyttäjän
// Admin-näkymässä. Asettaa claims välittömästi joten käyttäjä
// saa oikeat oikeudet heti ensimmäisellä kirjautumisella.
// ─────────────────────────────────────────────────────────────────
exports.asetaClaimsUudelle = functions
  .region('europe-west1')           // Sama region kuin Firestore
  .firestore
  .document('seurat/{seuraId}/kayttajat/{uid}')
  .onCreate(async (snap, context) => {
    const data    = snap.data();
    const uid     = context.params.uid;
    const seuraId = context.params.seuraId;

    functions.logger.info('Uusi kayttaja luotu', { uid, seuraId, rooli: data.rooli });

    const claims = rakennaClaims(data, seuraId);

    try {
      await admin.auth().setCustomUserClaims(uid, claims);
      functions.logger.info('Claims asetettu onnistuneesti', { uid, claims });

      // Merkitään Firestoreen että claims on asetettu ja milloin.
      // Tätä voidaan käyttää admin-näkymässä diagnostiikkaan.
      await snap.ref.update({
        claimsAsetettu:   true,
        claimsPaivitetty: admin.firestore.FieldValue.serverTimestamp(),
      });

    } catch (virhe) {
      functions.logger.error('Claims-asetus epäonnistui', { uid, virhe: virhe.message });
      // Tallennetaan virhe Firestoreen jotta VP näkee sen admin-näkymässä
      await snap.ref.update({
        claimsAsetettu: false,
        claimsVirhe:    virhe.message,
      });
    }
  });

// ─────────────────────────────────────────────────────────────────
// TRIGGER 2: Käyttäjän rooli tai joukkue muuttuu
//
// Polku: seurat/{seuraId}/kayttajat/{uid}
//
// Tämä triggeröityy kun VP:
//   - Siirtää valmentajan toiseen joukkueeseen
//   - Muuttaa valmentajan roolia (esim. valmentaja → testivastaava)
//   - Aktivoi tai deaktivoi käyttäjän
//
// TÄRKEÄ YKSITYISKOHTA: Käyttäjä tarvitsee token-refreshin
// jotta uudet claims astuvat voimaan. Kirjoitamme
// tokenRefreshTarvitaan: true -kentän Firestoreen — frontend
// tarkistaa tämän kirjautuessa ja kutsuu getIdToken(true)
// pakottaakseen tuoreen tokenin.
// ─────────────────────────────────────────────────────────────────
exports.paivitaClaimsRoolimuutoksessa = functions
  .region('europe-west1')
  .firestore
  .document('seurat/{seuraId}/kayttajat/{uid}')
  .onUpdate(async (change, context) => {
    const ennen  = change.before.data();
    const jalkeen = change.after.data();
    const uid     = context.params.uid;
    const seuraId = context.params.seuraId;

    // Tarkistetaan onko jokin oikeuksiin vaikuttava kenttä muuttunut.
    // Ei triggeröidä turhaan jos vain muistiinpanot muuttuivat.
    const muuttui =
      ennen.rooli    !== jalkeen.rooli    ||
      ennen.joukkue  !== jalkeen.joukkue  ||
      ennen.aktiivinen !== jalkeen.aktiivinen;

    if (!muuttui) {
      functions.logger.debug('Ei oikeusmuutosta — ohitetaan', { uid });
      return null;
    }

    functions.logger.info('Rooli/joukkue muuttui — päivitetään claims', {
      uid, seuraId,
      ennen:  { rooli: ennen.rooli,   joukkue: ennen.joukkue },
      jalkeen: { rooli: jalkeen.rooli, joukkue: jalkeen.joukkue },
    });

    // Jos käyttäjä deaktivoitu — poistetaan claims kokonaan
    if (jalkeen.aktiivinen === false) {
      try {
        await admin.auth().setCustomUserClaims(uid, {});
        functions.logger.info('Kayttaja deaktivoitu — claims poistettu', { uid });
        await change.after.ref.update({
          claimsAsetettu:   false,
          claimsPaivitetty: admin.firestore.FieldValue.serverTimestamp(),
        });
      } catch (virhe) {
        functions.logger.error('Claims-poisto epäonnistui', { uid, virhe: virhe.message });
      }
      return null;
    }

    const claims = rakennaClaims(jalkeen, seuraId);

    try {
      await admin.auth().setCustomUserClaims(uid, claims);
      functions.logger.info('Claims päivitetty', { uid, claims });

      await change.after.ref.update({
        claimsAsetettu:      true,
        claimsPaivitetty:    admin.firestore.FieldValue.serverTimestamp(),
        // Frontend tarkistaa tämän — jos true, pakotetaan token-refresh
        tokenRefreshTarvitaan: true,
      });

    } catch (virhe) {
      functions.logger.error('Claims-päivitys epäonnistui', { uid, virhe: virhe.message });
      await change.after.ref.update({
        claimsAsetettu: false,
        claimsVirhe:    virhe.message,
      });
    }

    return null;
  });

// ─────────────────────────────────────────────────────────────────
// TRIGGER 3: Super-admin tunnuksen claims
//
// Polku: admins/{uid}
//
// Super-admin tallennetaan eri kokoelmaan kuin seuran käyttäjät
// (admins/ vs seurat/*/kayttajat/). Tarvitaan erillinen trigger.
// ─────────────────────────────────────────────────────────────────
exports.asetaSupeAdminClaims = functions
  .region('europe-west1')
  .firestore
  .document('admins/{uid}')
  .onWrite(async (change, context) => {
    const uid = context.params.uid;

    // onWrite kattaa sekä onCreate että onUpdate
    const data = change.after.exists ? change.after.data() : null;

    if (!data) {
      // Dokumentti poistettu — poistetaan claims
      try {
        await admin.auth().setCustomUserClaims(uid, {});
        functions.logger.info('Super-admin poistettu — claims tyhjennetty', { uid });
      } catch (virhe) {
        functions.logger.error('Super-admin claims -poisto epäonnistui', { uid });
      }
      return null;
    }

    // Varmistetaan että kyseessä on oikeasti super-admin
    if (!data.superAdmin) {
      functions.logger.warn('admins/-dokumentti ilman superAdmin:true — ohitetaan', { uid });
      return null;
    }

    const claims = {
      rooli:      'superadmin',
      superAdmin: true,
      seuraId:    null,   // Super-admin näkee kaiken — ei seurajäykistystä
      joukkue:    null,
    };

    try {
      await admin.auth().setCustomUserClaims(uid, claims);
      functions.logger.info('Super-admin claims asetettu', { uid });

      await change.after.ref.update({
        claimsAsetettu:   true,
        claimsPaivitetty: admin.firestore.FieldValue.serverTimestamp(),
      });

    } catch (virhe) {
      functions.logger.error('Super-admin claims -asetus epäonnistui', { uid, virhe: virhe.message });
    }

    return null;
  });

// ─────────────────────────────────────────────────────────────────
// CALLABLE FUNCTION: luoKayttaja
//
// Tätä kutsutaan suoraan Admin-näkymän selaimesta.
// Se eroaa Firestore-triggereistä siten, että se on
// "pyydettävä" funktio — VP painaa nappia, selain kutsuu
// tätä, ja funktio tekee kolme asiaa atomisesti:
//
//   1. Luo Firebase Auth -tilin (createUser)
//   2. Lähettää salasananvaihtosähköpostin uudelle käyttäjälle
//   3. Kirjoittaa Firestore kayttajat-dokumentin
//      → tämä triggeröi asetaClaimsUudelle automaattisesti
//
// TURVALLISUUS: Vain kirjautunut VP tai super-admin voi
// kutsua tätä. Tarkistetaan kutsujän Custom Claims ennen
// mitään toimenpiteitä — jos rooli ei ole "vp" tai
// "superadmin", heitetään permission-denied -virhe.
//
// CALLABLE vs TRIGGER: Trigger reagoi automaattisesti kun
// jotain tapahtuu Firestoressä. Callable-funktio taas
// on kuin API-endpoint jota kutsutaan tietoisesti.
// ─────────────────────────────────────────────────────────────────
exports.luoKayttaja = functions
  .region('europe-west1')
  .https.onCall(async (data, context) => {

    // ── AUTENTIKOINTI: Varmistetaan kutsuja on kirjautunut ──
    if (!context.auth) {
      throw new functions.https.HttpsError(
        'unauthenticated',
        'Kirjaudu sisään ennen käyttäjän luontia.'
      );
    }

    // ── AUTORISAATIO: Vain VP tai super-admin voi luoda käyttäjiä ──
    const kutsujaClaims = context.auth.token;
    const sallitutRoolit = ['vp', 'superadmin', 'seurasihteeri', 'urheilutoimenjohtaja'];

    if (!sallitutRoolit.includes(kutsujaClaims.rooli)) {
      throw new functions.https.HttpsError(
        'permission-denied',
        'Sinulla ei ole oikeutta luoda käyttäjiä.'
      );
    }

    // VP voi luoda käyttäjiä vain omaan seuraan.
    // Super-admin voi luoda käyttäjiä mihin seuraan tahansa.
    const kohdeSeura = data.seuraId;
    if (kutsujaClaims.rooli !== 'superadmin' &&
        kutsujaClaims.seuraId !== kohdeSeura) {
      throw new functions.https.HttpsError(
        'permission-denied',
        'Voit luoda käyttäjiä vain omaan seuraan.'
      );
    }

    // ── VALIDOINTI ──
    const { email, rooli, joukkue, joukkueNimi, etunimi, sukunimi } = data;

    if (!email || !rooli || !kohdeSeura) {
      throw new functions.https.HttpsError(
        'invalid-argument',
        'Sähköposti, rooli ja seura ovat pakollisia.'
      );
    }

    const sallitutUudetRoolit = [
      'valmentaja', 'testivastaava', 'talenttivalmentaja',
      'fysiikkavalmentaja', 'fysioterapeutti',
      'vp', 'seurasihteeri', 'urheilutoimenjohtaja',
    ];

    if (!sallitutUudetRoolit.includes(rooli)) {
      throw new functions.https.HttpsError(
        'invalid-argument',
        `Tuntematon rooli: ${rooli}`
      );
    }

    functions.logger.info('Luodaan uusi käyttäjä', {
      email, rooli, seuraId: kohdeSeura, joukkue,
      kutsuja: context.auth.uid,
    });

    try {
      // ── VAIHE 1: Luo Firebase Auth -tili ──
      // Generoidaan väliaikainen satunnainen salasana.
      // Käyttäjä ei koskaan näe tätä — hän saa heti
      // salasananvaihtosähköpostin jonka kautta asettaa oman.
      const valiaikainenSalasana =
        Math.random().toString(36).slice(-10) +
        Math.random().toString(36).toUpperCase().slice(-4) +
        '!9';

      const authUser = await admin.auth().createUser({
        email:         email,
        password:      valiaikainenSalasana,
        emailVerified: false,
        displayName:   etunimi && sukunimi
                         ? `${etunimi} ${sukunimi}`
                         : email,
      });

      const uid = authUser.uid;
      functions.logger.info('Auth-tili luotu', { uid, email });

      // ── VAIHE 2: Kirjoita Firestore-dokumentti ──
      // Tämä triggeröi asetaClaimsUudelle automaattisesti —
      // ei tarvita manuaalista claims-asetusta tässä.
      const kayttajaDoc = {
        uid,
        email,
        rooli,
        seuraId:      kohdeSeura,
        joukkue:      joukkue      || null,
        joukkueNimi:  joukkueNimi  || joukkue || null,
        etunimi:      etunimi      || null,
        sukunimi:     sukunimi     || null,
        aktiivinen:   true,
        luotu:        admin.firestore.FieldValue.serverTimestamp(),
        luojaUid:     context.auth.uid,
        claimsAsetettu: false,  // Cloud Function päivittää tämän
      };

      await admin.firestore()
        .collection('seurat').doc(kohdeSeura)
        .collection('kayttajat').doc(uid)
        .set(kayttajaDoc);

      functions.logger.info('Firestore-dokumentti luotu', { uid });

      // ── VAIHE 3: Generoi salasananvaihtolinkki ──
      // Linkki on voimassa 1 tunnin. Käyttäjä klikkaa linkkiä
      // ja asettaa oman salasanansa — väliaikaista salasanaa
      // ei tarvita.
      const resetLinkki = await admin.auth()
        .generatePasswordResetLink(email, {
          url: 'https://terokoskela7-cmyk.github.io/talentmaster/TalentMaster_Master_v8.html',
        });

      functions.logger.info('Salasananvaihtolinkki luotu', { email });

      // ── VAIHE 4: Lähetä sähköposti Gmaililla ──
      // Nodemailer + Gmail App Password — luotettava,
      // ei mene roskapostiin kuten Firebasen oma lähetys.
      const etunimiTai = etunimi || email.split('@')[0];
      const koko_nimi  = etunimi && sukunimi ? `${etunimi} ${sukunimi}` : etunimiTai;

      // Haetaan seuran nimi Firestoresta sähköpostia varten
      let seuraNimiEmail = kohdeSeura;
      try {
        const seuraDoc = await admin.firestore()
          .collection('seurat').doc(kohdeSeura).get();
        if (seuraDoc.exists) seuraNimiEmail = seuraDoc.data().nimi || kohdeSeura;
      } catch (e) { /* Ei kriittinen */ }

      const rooliNimet = {
        valmentaja: 'Valmentaja', vp: 'Valmennuspäällikkö',
        testivastaava: 'Testivastaava', talenttivalmentaja: 'Talenttivalmentaja',
        fysiikkavalmentaja: 'Fysiikkavalmentaja', fysioterapeutti: 'Fysioterapeutti',
        seurasihteeri: 'Seurasihteeri', urheilutoimenjohtaja: 'Urheilutoimenjohtaja',
      };
      const rooliNimi = rooliNimet[rooli] || rooli;

      let sahkopostiLahetetty = false;
      const transport = luoGmailTransport();

      if (transport) {
        try {
          await transport.sendMail({
            from:    '"TalentMaster™" <talentmasterid@gmail.com>',
            to:      email,
            subject: `Tervetuloa TalentMaster™ — ${seuraNimiEmail}`,
            html: `
<!DOCTYPE html>
<html lang="fi">
<head><meta charset="UTF-8"></head>
<body style="margin:0;padding:0;background:#06090F;font-family:'Segoe UI',Arial,sans-serif;">
  <table width="100%" cellpadding="0" cellspacing="0" style="background:#06090F;padding:40px 20px;">
    <tr><td align="center">
      <table width="560" cellpadding="0" cellspacing="0"
        style="background:#0C1018;border:1px solid rgba(255,255,255,.08);border-radius:12px;overflow:hidden;">

        <!-- Header -->
        <tr>
          <td style="padding:32px 40px 24px;border-bottom:1px solid rgba(255,255,255,.07);">
            <span style="font-size:22px;font-weight:900;color:#E8EEF8;letter-spacing:-.5px;">
              Talent<span style="color:#3EC9A7;">Master</span>™
            </span>
            <span style="display:block;font-size:11px;font-weight:600;letter-spacing:2px;
              text-transform:uppercase;color:rgba(232,238,248,.35);margin-top:4px;">
              ${seuraNimiEmail}
            </span>
          </td>
        </tr>

        <!-- Body -->
        <tr>
          <td style="padding:32px 40px;">
            <p style="font-size:15px;color:rgba(232,238,248,.65);margin:0 0 20px;">
              Hei ${koko_nimi},
            </p>
            <p style="font-size:15px;color:rgba(232,238,248,.65);margin:0 0 24px;line-height:1.6;">
              Sinut on lisätty <strong style="color:#E8EEF8;">${seuraNimiEmail}</strong>
              TalentMaster-järjestelmään roolilla
              <strong style="color:#3EC9A7;">${rooliNimi}</strong>
              ${joukkueNimi ? `(${joukkueNimi})` : ''}.
            </p>
            <p style="font-size:14px;color:rgba(232,238,248,.45);margin:0 0 28px;">
              Paina alla olevaa nappia asettaaksesi oman salasanasi ja
              kirjautuaksesi järjestelmään. Linkki on voimassa 1 tunnin.
            </p>

            <!-- CTA-nappi -->
            <table cellpadding="0" cellspacing="0" style="margin:0 0 28px;">
              <tr>
                <td style="background:#4A7ED9;border-radius:8px;">
                  <a href="${resetLinkki}"
                    style="display:inline-block;padding:14px 32px;font-size:14px;
                    font-weight:600;color:#fff;text-decoration:none;letter-spacing:.3px;">
                    Aseta salasana ja kirjaudu →
                  </a>
                </td>
              </tr>
            </table>

            <p style="font-size:12px;color:rgba(232,238,248,.3);margin:0;line-height:1.6;">
              Jos nappi ei toimi, kopioi tämä linkki selaimeesi:<br>
              <a href="${resetLinkki}" style="color:#4A7ED9;word-break:break-all;">
                ${resetLinkki}
              </a>
            </p>
          </td>
        </tr>

        <!-- Footer -->
        <tr>
          <td style="padding:20px 40px;border-top:1px solid rgba(255,255,255,.07);">
            <p style="font-size:11px;color:rgba(232,238,248,.2);margin:0;">
              TalentMaster™ — Jalkapallon kehitysalusta<br>
              Tämä viesti on lähetetty automaattisesti. Älä vastaa tähän sähköpostiin.
            </p>
          </td>
        </tr>

      </table>
    </td></tr>
  </table>
</body>
</html>`,
          });
          sahkopostiLahetetty = true;
          functions.logger.info('Gmail-sähköposti lähetetty', { email });
        } catch (mailVirhe) {
          // Sähköpostin lähetys epäonnistui — käyttäjä on silti luotu
          // Palautetaan linkki frontendille varmuudeksi
          functions.logger.error('Gmail-lähetys epäonnistui', {
            email, virhe: mailVirhe.message
          });
        }
      }

      return {
        ok:    true,
        uid,
        email,
        resetLinkki,
        sahkopostiLahetetty,
        viesti: sahkopostiLahetetty
          ? `Käyttäjä ${email} luotu. Kutsu lähetetty sähköpostitse.`
          : `Käyttäjä ${email} luotu. Kopioi kutsu linkki alla.`,
      };

    } catch (virhe) {
      functions.logger.error('Käyttäjänluonti epäonnistui', {
        email, virhe: virhe.message,
      });

      // Muutetaan Firebase Auth -virhekoodit käyttäjäystävällisiksi
      if (virhe.code === 'auth/email-already-exists') {
        throw new functions.https.HttpsError(
          'already-exists',
          `Sähköpostiosoite ${email} on jo käytössä.`
        );
      }

      throw new functions.https.HttpsError(
        'internal',
        `Käyttäjänluonti epäonnistui: ${virhe.message}`
      );
    }
  });
