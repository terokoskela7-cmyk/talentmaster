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
 * Firestore-kirjoitus → Cloud Function triggeröityy
 *   → setCustomUserClaims() asettaa JWT-tokeniin:
 *     { seuraId, rooli, joukkue }
 *   → Käyttäjän seuraava kirjautuminen (tai token-refresh)
 *     hakee uudet claims automaattisesti
 *
 * DEPLOY:
 *   cd functions && npm install
 *   firebase deploy --only functions
 *
 * VAATII: Firebase Blaze plan + firebase-admin + firebase-functions
 *
 * FUNKTIOT:
 *   1. asetaClaimsUudelle         — uusi käyttäjä luodaan Firestoreen
 *   2. paivitaClaimsRoolimuutoksessa — rooli tai joukkue muuttuu
 *   3. asetaSupeAdminClaims       — super-admin tunnuksen claims
 *   4. luoKayttaja                — callable: VP luo uuden käyttäjän
 *   5. lahetaRekisteriKutsu       — callable: VP lähettää huoltajalle kutsusähköpostin
 */

const functions  = require('firebase-functions');
const admin      = require('firebase-admin');
const nodemailer = require('nodemailer');

admin.initializeApp();

// ─────────────────────────────────────────────────────────────────
// GMAIL-TRANSPORT — Nodemailer
//
// Käytetään Firebase Functions params -APIa (uusi tapa).
// Arvot haetaan ympäristömuuttujista jotka asetetaan
// GitHub Secretseissä tai Firebase Consolessa:
//   firebase functions:secrets:set GMAIL_EMAIL
//   firebase functions:secrets:set GMAIL_APP_PASSWORD
// ─────────────────────────────────────────────────────────────────
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

  const claims = {
    rooli:   rooli,
    seuraId: seuraId || data.seuraId || null,
  };

  // Rakennetaan joukkueet-lista molemmista lähteistä.
  // data.joukkueet on uusi taulukkomuoto (["u14", "u12"]).
  // data.joukkue  on vanha yksittäinen merkkijono ("u14").
  // Tuetaan molempia jotta vanha data ei hajoa.
  const joukkueetLista =
    Array.isArray(data.joukkueet) && data.joukkueet.length > 0
      ? data.joukkueet
      : data.joukkue ? [data.joukkue] : [];

  switch (rooli) {
    case 'valmentaja':
    case 'testivastaava':
    case 'fysiikkavalmentaja':
    case 'fysioterapeutti':
      // Näillä rooleilla joukkue(et) rajaavat mitä pelaajia näkee.
      claims.joukkue   = joukkueetLista[0] || null;
      claims.joukkueet = joukkueetLista;
      break;

    case 'talenttivalmentaja':
      // Talenttivalmentaja näkee kaikki seuran pelaajat.
      claims.joukkue   = null;
      claims.joukkueet = [];
      break;

    case 'vp':
    case 'seurasihteeri':
    case 'urheilutoimenjohtaja':
      // Seura-tason roolit näkevät koko seuran.
      claims.joukkue   = null;
      claims.joukkueet = [];
      break;

    case 'superadmin':
    case 'super_admin':
      // Super-admin näkee kaiken.
      claims.seuraId   = null;
      claims.joukkue   = null;
      claims.joukkueet = [];
      claims.superAdmin = true;
      break;

    default:
      claims.joukkue   = joukkueetLista[0] || null;
      claims.joukkueet = joukkueetLista;
  }

  return claims;
}

// ─────────────────────────────────────────────────────────────────
// TRIGGER 1: Uusi käyttäjä luodaan
// Polku: seurat/{seuraId}/kayttajat/{uid}
// ─────────────────────────────────────────────────────────────────
exports.asetaClaimsUudelle = functions
  .region('europe-west1')
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

      await snap.ref.update({
        claimsAsetettu:   true,
        claimsPaivitetty: admin.firestore.FieldValue.serverTimestamp(),
      });
    } catch (virhe) {
      functions.logger.error('Claims-asetus epäonnistui', { uid, virhe: virhe.message });

      await snap.ref.update({
        claimsAsetettu: false,
        claimsVirhe:    virhe.message,
      });
    }
  });

// ─────────────────────────────────────────────────────────────────
// TRIGGER 2: Käyttäjän rooli tai joukkue muuttuu
// Polku: seurat/{seuraId}/kayttajat/{uid}
// ─────────────────────────────────────────────────────────────────
exports.paivitaClaimsRoolimuutoksessa = functions
  .region('europe-west1')
  .firestore
  .document('seurat/{seuraId}/kayttajat/{uid}')
  .onUpdate(async (change, context) => {
    const ennen   = change.before.data();
    const jalkeen = change.after.data();
    const uid     = context.params.uid;
    const seuraId = context.params.seuraId;

    const muuttui =
      ennen.rooli    !== jalkeen.rooli    ||
      ennen.joukkue  !== jalkeen.joukkue  ||
      JSON.stringify(ennen.joukkueet) !== JSON.stringify(jalkeen.joukkueet) ||
      ennen.aktiivinen !== jalkeen.aktiivinen;

    if (!muuttui) {
      functions.logger.debug('Ei oikeusmuutosta — ohitetaan', { uid });
      return null;
    }

    functions.logger.info('Rooli/joukkue muuttui — päivitetään claims', {
      uid, seuraId,
      ennen:   { rooli: ennen.rooli,   joukkue: ennen.joukkue },
      jalkeen: { rooli: jalkeen.rooli, joukkue: jalkeen.joukkue },
    });

    // Deaktivoitu käyttäjä — poistetaan claims kokonaan
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
        claimsAsetettu:       true,
        claimsPaivitetty:     admin.firestore.FieldValue.serverTimestamp(),
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
// Polku: admins/{uid}
// ─────────────────────────────────────────────────────────────────
exports.asetaSupeAdminClaims = functions
  .region('europe-west1')
  .firestore
  .document('admins/{uid}')
  .onWrite(async (change, context) => {
    const uid  = context.params.uid;
    const data = change.after.exists ? change.after.data() : null;

    if (!data) {
      try {
        await admin.auth().setCustomUserClaims(uid, {});
        functions.logger.info('Super-admin poistettu — claims tyhjennetty', { uid });
      } catch (virhe) {
        functions.logger.error('Super-admin claims -poisto epäonnistui', { uid });
      }
      return null;
    }

    if (!data.superAdmin) {
      functions.logger.warn('admins/-dokumentti ilman superAdmin:true — ohitetaan', { uid });
      return null;
    }

    const claims = {
      rooli:      'superadmin',
      superAdmin: true,
      seuraId:    null,
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
// CALLABLE FUNCTION 4: luoKayttaja
//
// Kutsutaan Admin-näkymän selaimesta kun VP luo uuden käyttäjän.
// Tekee kolme asiaa atomisesti:
//   1. Luo Firebase Auth -tilin
//   2. Kirjoittaa Firestore kayttajat-dokumentin
//      → triggeröi asetaClaimsUudelle automaattisesti
//   3. Lähettää salasananvaihtosähköpostin Gmaililla
// ─────────────────────────────────────────────────────────────────
exports.luoKayttaja = functions
  .region('europe-west1')
  .https.onCall(async (data, context) => {

    if (!context.auth) {
      throw new functions.https.HttpsError(
        'unauthenticated',
        'Kirjaudu sisään ennen käyttäjän luontia.'
      );
    }

    const kutsujaClaims  = context.auth.token;
    const sallitutRoolit = ['vp', 'superadmin', 'seurasihteeri', 'urheilutoimenjohtaja'];

    if (!sallitutRoolit.includes(kutsujaClaims.rooli)) {
      throw new functions.https.HttpsError(
        'permission-denied',
        'Sinulla ei ole oikeutta luoda käyttäjiä.'
      );
    }

    const kohdeSeura = data.seuraId;

    if (kutsujaClaims.rooli !== 'superadmin' && kutsujaClaims.seuraId !== kohdeSeura) {
      throw new functions.https.HttpsError(
        'permission-denied',
        'Voit luoda käyttäjiä vain omaan seuraan.'
      );
    }

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
      throw new functions.https.HttpsError('invalid-argument', `Tuntematon rooli: ${rooli}`);
    }

    functions.logger.info('Luodaan uusi käyttäjä', {
      email, rooli, seuraId: kohdeSeura, joukkue, kutsuja: context.auth.uid,
    });

    try {
      // Vaihe 1: Luo Firebase Auth -tili väliaikaisella salasanalla
      const valiaikainenSalasana =
        Math.random().toString(36).slice(-10) +
        Math.random().toString(36).toUpperCase().slice(-4) + '!9';

      const authUser = await admin.auth().createUser({
        email,
        password:       valiaikainenSalasana,
        emailVerified:  false,
        displayName:    etunimi && sukunimi ? `${etunimi} ${sukunimi}` : email,
      });

      const uid = authUser.uid;
      functions.logger.info('Auth-tili luotu', { uid, email });

      // Vaihe 2: Kirjoita Firestore-dokumentti
      // (triggeröi asetaClaimsUudelle automaattisesti)
      await admin.firestore()
        .collection('seurat').doc(kohdeSeura)
        .collection('kayttajat').doc(uid)
        .set({
          uid, email, rooli,
          seuraId:       kohdeSeura,
          joukkue:       joukkue     || null,
          joukkueNimi:   joukkueNimi || joukkue || null,
          etunimi:       etunimi     || null,
          sukunimi:      sukunimi    || null,
          aktiivinen:    true,
          luotu:         admin.firestore.FieldValue.serverTimestamp(),
          luojaUid:      context.auth.uid,
          claimsAsetettu: false,
        });

      functions.logger.info('Firestore-dokumentti luotu', { uid });

      // Vaihe 3: Generoi salasananvaihtolinkki (voimassa 1h)
      const resetLinkki = await admin.auth().generatePasswordResetLink(email, {
        url: 'https://terokoskela7-cmyk.github.io/talentmaster/TalentMaster_Master_v8.html',
      });

      // Vaihe 4: Lähetä sähköposti Gmaililla
      let seuraNimiEmail = kohdeSeura;
      try {
        const seuraDoc = await admin.firestore()
          .collection('seurat').doc(kohdeSeura).get();
        if (seuraDoc.exists) seuraNimiEmail = seuraDoc.data().nimi || kohdeSeura;
      } catch (e) { /* ei kriittinen */ }

      const rooliNimet = {
        valmentaja: 'Valmentaja', vp: 'Valmennuspäällikkö',
        testivastaava: 'Testivastaava', talenttivalmentaja: 'Talenttivalmentaja',
        fysiikkavalmentaja: 'Fysiikkavalmentaja', fysioterapeutti: 'Fysioterapeutti',
        seurasihteeri: 'Seurasihteeri', urheilutoimenjohtaja: 'Urheilutoimenjohtaja',
      };

      const koko_nimi   = etunimi && sukunimi ? `${etunimi} ${sukunimi}` : (etunimi || email.split('@')[0]);
      const rooliNimi   = rooliNimet[rooli] || rooli;
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
  style="background:#0C1018;border:1px solid rgba(255,255,255,.08);
  border-radius:12px;overflow:hidden;">
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
        Paina alla olevaa nappia asettaaksesi salasanasi. Linkki on voimassa 1 tunnin.
      </p>
      <table cellpadding="0" cellspacing="0" style="margin:0 0 28px;">
        <tr>
          <td style="background:#4A7ED9;border-radius:8px;">
            <a href="${resetLinkki}"
              style="display:inline-block;padding:14px 32px;font-size:14px;
              font-weight:600;color:#fff;text-decoration:none;">
              Aseta salasana ja kirjaudu →
            </a>
          </td>
        </tr>
      </table>
      <p style="font-size:12px;color:rgba(232,238,248,.3);margin:0;line-height:1.6;">
        Jos nappi ei toimi:<br>
        <a href="${resetLinkki}" style="color:#4A7ED9;word-break:break-all;">
          ${resetLinkki}
        </a>
      </p>
    </td>
  </tr>
  <tr>
    <td style="padding:20px 40px;border-top:1px solid rgba(255,255,255,.07);">
      <p style="font-size:11px;color:rgba(232,238,248,.2);margin:0;">
        TalentMaster™ — Jalkapallon kehitysalusta<br>
        Tämä viesti on lähetetty automaattisesti. Älä vastaa tähän sähköpostiin.
      </p>
    </td>
  </tr>
</table>
</td></tr></table>
</body>
</html>`,
          });
          sahkopostiLahetetty = true;
          functions.logger.info('Gmail-sähköposti lähetetty', { email });
        } catch (mailVirhe) {
          functions.logger.error('Gmail-lähetys epäonnistui', { email, virhe: mailVirhe.message });
        }
      }

      return {
        ok: true,
        uid,
        email,
        resetLinkki,
        sahkopostiLahetetty,
        viesti: sahkopostiLahetetty
          ? `Käyttäjä ${email} luotu. Kutsu lähetetty sähköpostitse.`
          : `Käyttäjä ${email} luotu. Kopioi kutsu linkki alla.`,
      };

    } catch (virhe) {
      functions.logger.error('Käyttäjänluonti epäonnistui', { email, virhe: virhe.message });

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

// ─────────────────────────────────────────────────────────────────
// CALLABLE FUNCTION 5: lahetaRekisteriKutsu   ← UUSI
//
// Kutsutaan TalentMaster_Seura.html:stä kun VP tai sihteeri
// painaa "Lähetä sähköpostilla" kutsumodalissa.
//
// HUOMIO sähköpostikonfliktin osalta:
//   Huoltajan sähköposti on pelkkä yhteystieto — ei Firebase Auth
//   -tunnus. Tämä funktio ei KOSKAAN kutsu createUser():a huoltajalle.
//   Sama osoite voi siis olla sekä valmentajan Auth-tunnuksena että
//   huoltajan yhteystietona täysin ongelmattomasti, koska ne ovat
//   eri kokoelmissa eri merkityksissä.
// ─────────────────────────────────────────────────────────────────
exports.lahetaRekisteriKutsu = functions
  .region('europe-west1')
  .https.onCall(async (data, context) => {

    // Autentikointi: kutsuja täytyy olla kirjautunut
    if (!context.auth) {
      throw new functions.https.HttpsError(
        'unauthenticated',
        'Kirjaudu sisään ennen kutsun lähettämistä.'
      );
    }

    // Autorisaatio: vain seuran hallinto voi lähettää kutsuja
    const kutsujaClaims  = context.auth.token;
    const sallitutRoolit = ['vp', 'superadmin', 'seurasihteeri', 'urheilutoimenjohtaja'];

    if (!sallitutRoolit.includes(kutsujaClaims.rooli)) {
      throw new functions.https.HttpsError(
        'permission-denied',
        'Sinulla ei ole oikeutta lähettää kutsuja.'
      );
    }

    // Validointi
    const { hEmail, linkki, seura, etunimi, sukunimi, joukkue, seuraId } = data;

    if (!hEmail || !linkki) {
      throw new functions.https.HttpsError(
        'invalid-argument',
        'Huoltajan sähköposti ja kutsulinkkki ovat pakollisia.'
      );
    }

    functions.logger.info('Lähetetään rekisterikutsu', {
      hEmail, seura, joukkue, kutsuja: context.auth.uid,
    });

    // Gmail-transport
    const transport = luoGmailTransport();
    if (!transport) {
      throw new functions.https.HttpsError(
        'internal',
        'Sähköpostipalvelu ei ole käytettävissä. Tarkista Gmail-asetukset Firebase Consolessa.'
      );
    }

    const pelaajanNimi   = etunimi && sukunimi ? `${etunimi} ${sukunimi}` : (etunimi || 'pelaajanne');
    const seuraNimiTeksti = seura || 'seuran';

    try {
      await transport.sendMail({
        from:    '"TalentMaster™" <talentmasterid@gmail.com>',
        to:      hEmail,
        subject: `Rekisteröintikutsu — ${pelaajanNimi} / ${seuraNimiTeksti}`,
        html: `
<!DOCTYPE html>
<html lang="fi">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width,initial-scale=1">
</head>
<body style="margin:0;padding:0;background:#f4f6fa;font-family:'Segoe UI',Arial,sans-serif;">
<table width="100%" cellpadding="0" cellspacing="0"
  style="background:#f4f6fa;padding:40px 20px;">
<tr><td align="center">
<table width="560" cellpadding="0" cellspacing="0"
  style="background:#ffffff;border-radius:12px;overflow:hidden;
  box-shadow:0 2px 8px rgba(0,0,0,.08);">

  <!-- Header -->
  <tr>
    <td style="background:#1E3A5F;padding:28px 40px;">
      <span style="font-size:20px;font-weight:900;color:#ffffff;letter-spacing:-.5px;">
        Talent<span style="color:#3EC9A7;">Master</span>™
      </span>
      <span style="display:block;font-size:11px;font-weight:600;letter-spacing:2px;
        text-transform:uppercase;color:rgba(255,255,255,.5);margin-top:4px;">
        ${seuraNimiTeksti}
      </span>
    </td>
  </tr>

  <!-- Body -->
  <tr>
    <td style="padding:36px 40px;">
      <p style="font-size:16px;font-weight:600;color:#1E3A5F;margin:0 0 16px;">
        Hyvä huoltaja,
      </p>
      <p style="font-size:14px;color:#444;margin:0 0 16px;line-height:1.7;">
        ${seuraNimiTeksti} käyttää TalentMaster™-kehitysseurantajärjestelmää
        pelaajien yksilölliseen kehitykseen. Pyydämme sinua rekisteröimään
        <strong>${pelaajanNimi}</strong>${joukkue ? ` (${joukkue})` : ''}
        järjestelmään ja antamaan suostumuksen pelaajadatan käsittelyyn.
      </p>
      <p style="font-size:14px;color:#444;margin:0 0 28px;line-height:1.7;">
        Rekisteröinti kestää noin <strong>2 minuuttia</strong> ja sisältää
        pelaajan perustiedot sekä GDPR-suostumuksen.
      </p>

      <!-- CTA-nappi -->
      <table cellpadding="0" cellspacing="0" style="margin:0 0 28px;">
        <tr>
          <td style="background:#4A7ED9;border-radius:8px;">
            <a href="${linkki}"
              style="display:inline-block;padding:14px 32px;font-size:14px;
              font-weight:600;color:#fff;text-decoration:none;">
              Rekisteröi pelaaja →
            </a>
          </td>
        </tr>
      </table>

      <!-- Roskapostihuomio — kriittinen käytettävyyden kannalta -->
      <div style="background:#FFF8E7;border-left:3px solid #E0A040;
        border-radius:0 6px 6px 0;padding:12px 16px;margin-bottom:24px;">
        <p style="font-size:12px;color:#7A5800;margin:0;line-height:1.6;">
          📬 <strong>Jos et löydä tätä viestiä,</strong> tarkista myös
          <strong>roskaposti- tai Promootiot-kansio</strong>
          — automaattiset viestit päätyvät sinne usein.
        </p>
      </div>

      <p style="font-size:12px;color:#999;margin:0;line-height:1.6;">
        Jos nappi ei toimi, kopioi tämä osoite selaimeen:<br>
        <a href="${linkki}" style="color:#4A7ED9;word-break:break-all;font-size:11px;">
          ${linkki}
        </a>
      </p>
    </td>
  </tr>

  <!-- Footer -->
  <tr>
    <td style="padding:20px 40px;background:#f9fafb;border-top:1px solid #eee;">
      <p style="font-size:11px;color:#aaa;margin:0;line-height:1.6;">
        TalentMaster™ — Jalkapallon kehitysalusta<br>
        Tämä viesti on lähetetty automaattisesti ${seuraNimiTeksti}:n toimesta.
        Älä vastaa tähän viestiin.
      </p>
    </td>
  </tr>
</table>
</td></tr></table>
</body>
</html>`,
      });

      functions.logger.info('Rekisterikutsu lähetetty', { hEmail });

    } catch (mailVirhe) {
      functions.logger.error('Sähköpostilähetys epäonnistui', {
        hEmail, virhe: mailVirhe.message,
      });
      throw new functions.https.HttpsError(
        'internal',
        'Sähköpostilähetys epäonnistui: ' + mailVirhe.message
      );
    }

    // Tallennetaan kutsu Firestoreen seurantaa ja muistutuslogiikkaa varten.
    // Tämä mahdollistaa myöhemmin: "Kutsu lähetetty 7 pv sitten, ei vastattu"
    try {
      const kohdeSeura = seuraId || kutsujaClaims.seuraId;
      if (kohdeSeura) {
        await admin.firestore()
          .collection('seurat').doc(kohdeSeura)
          .collection('kutsut').add({
            hEmail,
            pelaajanNimi,
            joukkue:       joukkue || null,
            linkki,
            lahetetty:     admin.firestore.FieldValue.serverTimestamp(),
            tila:          'lahetetty',
            lahettajaUid:  context.auth.uid,
            lahettajaEmail: context.auth.token.email || null,
          });
      }
    } catch (e) {
      // Ei kriittinen — sähköposti meni jo perille
      functions.logger.warn('Kutsulokin tallennus epäonnistui', { virhe: e.message });
    }

    return {
      ok:    true,
      viesti: `Kutsu lähetetty osoitteeseen ${hEmail}`,
    };
  });

// ─────────────────────────────────────────────────────────────────
// 6. lahetaHuoltajaKutsu — Excel-massakutsun sähköpostilähetys
//
// Kutsuja: tm_import.js (Seura-näkymän Excel-tuontiprosessi)
// Data:    { seuraId, etunimi, sukunimi, hEmail, joukkue, joukkueNimi }
//
// Tämä on massakutsun vastaava lahetaRekisteriKutsu-funktiolle.
// Rakentaa kutsulinkki itse seuraId:n ja pelaajan tietojen perusteella
// jotta tm_import.js ei tarvitse tuntea linkkirakennetta.
// Käyttää samaa Gmail-transportia ja HTML-sähköpostipohjaa.
// ─────────────────────────────────────────────────────────────────
exports.lahetaHuoltajaKutsu = functions
  .region('europe-west1')
  .https.onCall(async (data, context) => {

    // ── Autentikointi ────────────────────────────────────────────
    if (!context.auth) {
      throw new functions.https.HttpsError(
        'unauthenticated',
        'Kirjaudu sisään ennen kutsun lähettämistä.'
      );
    }

    // ── Autorisaatio ─────────────────────────────────────────────
    const claims = context.auth.token;
    const sallitut = ['vp', 'superadmin', 'super_admin', 'seurasihteeri', 'urheilutoimenjohtaja'];
    if (!sallitut.includes(claims.rooli)) {
      throw new functions.https.HttpsError(
        'permission-denied',
        'Sinulla ei ole oikeutta lähettää massakutsuja.'
      );
    }

    // ── Validointi ───────────────────────────────────────────────
    const { seuraId, etunimi, sukunimi, hEmail, joukkue, joukkueNimi } = data;
    if (!hEmail || !seuraId || !etunimi) {
      throw new functions.https.HttpsError(
        'invalid-argument',
        'Pakolliset kentät puuttuvat: hEmail, seuraId, etunimi.'
      );
    }

    // ── Rakenna kutsulinkkki ─────────────────────────────────────
    // Sama rakenne kuin manuaalisessa lahetaRekisteriKutsu-funktiossa.
    // Suostumuslomake hakee tiedot URL-parametreista.
    const pohjaUrl = 'https://terokoskela7-cmyk.github.io/talentmaster/TalentMaster_Rekisterointi_Suostumus.html';
    const linkki = `${pohjaUrl}?seuraId=${encodeURIComponent(seuraId)}`
      + `&joukkue=${encodeURIComponent(joukkue || '')}`
      + `&joukkueNimi=${encodeURIComponent(joukkueNimi || joukkue || '')}`
      + `&etunimi=${encodeURIComponent(etunimi)}`
      + `&sukunimi=${encodeURIComponent(sukunimi || '')}`
      + `&hEmail=${encodeURIComponent(hEmail)}`;

    functions.logger.info('Massakutsu — lähetetään', {
      hEmail, seuraId, joukkue, kutsuja: context.auth.uid
    });

    // ── Hae seuran nimi Firestoresta viestiin ────────────────────
    let seuraNimi = seuraId;
    try {
      const seuraDoc = await admin.firestore()
        .collection('seurat').doc(seuraId).get();
      if (seuraDoc.exists) seuraNimi = seuraDoc.data().nimi || seuraId;
    } catch (_) { /* Ei kriittinen — käytetään seuraId:tä */ }

    const pelaajanNimi = `${etunimi} ${sukunimi || ''}`.trim();
    const joukkueTeksti = joukkueNimi || joukkue || '';

    // ── Gmail-transport ──────────────────────────────────────────
    const transport = luoGmailTransport();
    if (!transport) {
      throw new functions.https.HttpsError(
        'internal',
        'Sähköpostipalvelu ei ole käytettävissä. Tarkista Gmail-asetukset.'
      );
    }

    // ── Lähetä sähköposti ────────────────────────────────────────
    // Käytetään samaa HTML-pohjaa kuin lahetaRekisteriKutsu-funktiossa.
    try {
      await transport.sendMail({
        from:    '"TalentMaster™" <talentmasterid@gmail.com>',
        to:      hEmail,
        subject: `Rekisteröintikutsu — ${pelaajanNimi} / ${seuraNimi}`,
        html: `
<!DOCTYPE html>
<html lang="fi">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width,initial-scale=1">
</head>
<body style="margin:0;padding:0;background:#f4f6fa;font-family:'Segoe UI',Arial,sans-serif;">
<table width="100%" cellpadding="0" cellspacing="0"
  style="background:#f4f6fa;padding:40px 20px;">
<tr><td align="center">
<table width="560" cellpadding="0" cellspacing="0"
  style="background:#ffffff;border-radius:12px;overflow:hidden;
  box-shadow:0 2px 8px rgba(0,0,0,.08);">

  <tr>
    <td style="background:#1E3A5F;padding:28px 40px;">
      <span style="font-size:20px;font-weight:900;color:#ffffff;letter-spacing:-.5px;">
        Talent<span style="color:#3EC9A7;">Master</span>™
      </span>
      <span style="display:block;font-size:11px;font-weight:600;letter-spacing:2px;
        text-transform:uppercase;color:rgba(255,255,255,.5);margin-top:4px;">
        ${seuraNimi}
      </span>
    </td>
  </tr>

  <tr>
    <td style="padding:36px 40px;">
      <p style="font-size:16px;font-weight:600;color:#1E3A5F;margin:0 0 16px;">
        Hyvä huoltaja,
      </p>
      <p style="font-size:14px;color:#444;margin:0 0 16px;line-height:1.7;">
        ${seuraNimi} käyttää TalentMaster™-kehitysseurantajärjestelmää
        pelaajien yksilölliseen kehitykseen. Pyydämme sinua rekisteröimään
        <strong>${pelaajanNimi}</strong>${joukkueTeksti ? ` (${joukkueTeksti})` : ''}
        järjestelmään ja antamaan suostumuksen pelaajadatan käsittelyyn.
      </p>
      <p style="font-size:14px;color:#444;margin:0 0 28px;line-height:1.7;">
        Rekisteröinti kestää noin <strong>2 minuuttia</strong> ja sisältää
        pelaajan perustiedot sekä GDPR-suostumuksen.
      </p>

      <table cellpadding="0" cellspacing="0" style="margin:0 0 28px;">
        <tr>
          <td style="background:#4A7ED9;border-radius:8px;">
            <a href="${linkki}"
              style="display:inline-block;padding:14px 32px;font-size:14px;
              font-weight:600;color:#fff;text-decoration:none;">
              Rekisteröi pelaaja →
            </a>
          </td>
        </tr>
      </table>

      <div style="background:#FFF8E7;border-left:3px solid #E0A040;
        border-radius:0 6px 6px 0;padding:12px 16px;margin-bottom:24px;">
        <p style="font-size:12px;color:#7A5800;margin:0;line-height:1.6;">
          📬 <strong>Jos et löydä tätä viestiä,</strong> tarkista myös
          <strong>roskaposti- tai Promootiot-kansio</strong>.
        </p>
      </div>

      <p style="font-size:12px;color:#999;margin:0;line-height:1.6;">
        Jos nappi ei toimi, kopioi tämä osoite selaimeen:<br>
        <a href="${linkki}" style="color:#4A7ED9;word-break:break-all;font-size:11px;">
          ${linkki}
        </a>
      </p>
    </td>
  </tr>

  <tr>
    <td style="padding:20px 40px;background:#f9fafb;border-top:1px solid #eee;">
      <p style="font-size:11px;color:#aaa;margin:0;line-height:1.6;">
        TalentMaster™ — Jalkapallon kehitysalusta<br>
        Tämä viesti on lähetetty automaattisesti ${seuraNimi}:n toimesta.
        Älä vastaa tähän viestiin.
      </p>
    </td>
  </tr>
</table>
</td></tr></table>
</body>
</html>`,
      });

      functions.logger.info('Massakutsu lähetetty', { hEmail });

    } catch (mailVirhe) {
      functions.logger.error('Massakutsun lähetys epäonnistui', {
        hEmail, virhe: mailVirhe.message,
      });
      throw new functions.https.HttpsError(
        'internal',
        'Sähköpostilähetys epäonnistui: ' + mailVirhe.message
      );
    }

    // ── Tallenna Firestoreen (kutsut-kokoelma) ───────────────────
    // Sama rakenne kuin lahetaRekisteriKutsu — mahdollistaa
    // myöhemmin "Kutsu lähetetty 7 pv sitten" -muistutukset.
    try {
      await admin.firestore()
        .collection('seurat').doc(seuraId)
        .collection('kutsut').add({
          hEmail,
          pelaajanNimi,
          joukkue:        joukkue || null,
          joukkueNimi:    joukkueNimi || joukkue || null,
          linkki,
          lahetetty:      admin.firestore.FieldValue.serverTimestamp(),
          tila:           'lahetetty',
          lahde:          'excel_massakutsu',
          lahettajaUid:   context.auth.uid,
          lahettajaEmail: context.auth.token.email || null,
        });
    } catch (e) {
      // Ei kriittinen — sähköposti meni jo perille
      functions.logger.warn('Massakutsun Firestore-kirjaus epäonnistui', {
        virhe: e.message
      });
    }

    return {
      ok:     true,
      viesti: `Kutsu lähetetty osoitteeseen ${hEmail}`,
    };
  });
