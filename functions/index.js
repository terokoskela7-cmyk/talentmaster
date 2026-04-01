require('dotenv').config();
/**
 * TalentMaster™ — Firebase Cloud Functions
 * functions/index.js
 *
 * Päivitetty: 2026-03-28
 * Lisätty: lahetaRekisteriKutsu (Nodemailer + Gmail)
 */

const functions = require('firebase-functions');
const admin     = require('firebase-admin');
const nodemailer = require('nodemailer');

if (!admin.apps.length) {
  admin.initializeApp();
}

const db   = admin.firestore();
const auth = admin.auth();

// Gmail-transporter — App Password ympäristömuuttujasta
// Asetetaan: firebase functions:config:set gmail.email="..." gmail.password="..."
function luoTransporter() {
  const email    = process.env.GMAIL_EMAIL;
  const password = process.env.GMAIL_APP_PASSWORD;
  // Diagnostiikka — ei tulosta salasanaa
  console.log('[Nodemailer] GMAIL_EMAIL:', email ? email.substring(0,5) + '***' : 'PUUTTUU');
  console.log('[Nodemailer] GMAIL_APP_PASSWORD:', password ? '*** (' + password.length + ' merkkiä)' : 'PUUTTUU');
  if (!email || !password) {
    throw new Error('Gmail-credentiaalit puuttuvat. GMAIL_EMAIL=' + (email?'OK':'TYHJÄ') + ' GMAIL_APP_PASSWORD=' + (password?'OK':'TYHJÄ'));
  }
  return nodemailer.createTransport({
    host: 'smtp.gmail.com',
    port: 465,
    secure: true,
    auth: { user: email, pass: password },
  });
}

// ─────────────────────────────────────────────────────────────────────────────
// APUFUNKTIO: Tarkista oikeus
// ─────────────────────────────────────────────────────────────────────────────
async function tarkistaOikeus(kutsujaUid, kohdeSeuraId) {
  const adminDoc = await db.collection('admins').doc(kutsujaUid).get();
  // Tuetaan kaikkia super-admin-kenttämuotoja:
  //   superAdmin: true   (camelCase, vanha rakenne)
  //   rooli: 'super_admin'   (underscore, uusi rakenne)
  //   rooli: 'superadmin'    (yhteen kirjoitettu)
  // Tämä korjaa 403-virheen kun Admin-sivu kutsuu luoKayttaja-funktiota.
  const adminData = adminDoc.exists ? adminDoc.data() : null;
  const onSuperAdmin = adminData && (
    adminData.superAdmin === true ||
    adminData.rooli === 'super_admin' ||
    adminData.rooli === 'superadmin'
  );
  console.log('[tarkistaOikeus] uid:', kutsujaUid,
    '| seura:', kohdeSeuraId,
    '| adminDoc.exists:', adminDoc.exists,
    '| isSuperAdmin:', onSuperAdmin);
  if (onSuperAdmin) {
    return { sallittu: true, rooli: 'superadmin' };
  }
  const seuraDoc = await db.collection('seurat').doc(kohdeSeuraId).get();
  if (seuraDoc.exists && seuraDoc.data().vp_uid === kutsujaUid) {
    return { sallittu: true, rooli: 'vp' };
  }
  const kayttajaDoc = await db
    .collection('seurat').doc(kohdeSeuraId)
    .collection('kayttajat').doc(kutsujaUid).get();
  if (kayttajaDoc.exists) {
    const rooli = kayttajaDoc.data().rooli;
    if (['seura_admin','urheilutoimenjohtaja','seurasihteeri'].includes(rooli)) {
      return { sallittu: true, rooli };
    }
  }
  return { sallittu: false, rooli: null };
}

// ─────────────────────────────────────────────────────────────────────────────
// lahetaRekisteriKutsu — Lähettää rekisteröintikutsun huoltajalle
// Kutsutaan Seura-näkymän "Lähetä sähköpostilla" -napista
// ─────────────────────────────────────────────────────────────────────────────
exports.lahetaRekisteriKutsu = functions
  .region('europe-west1')
  .https.onCall(async (data, context) => {

    if (!context.auth) {
      throw new functions.https.HttpsError('unauthenticated', 'Kirjaudu ensin.');
    }

    const { hEmail, linkki, seura, etunimi, sukunimi, joukkue } = data;

    if (!hEmail || !linkki) {
      throw new functions.https.HttpsError('invalid-argument', 'hEmail ja linkki ovat pakollisia.');
    }

    const pelaajaNimi = [etunimi, sukunimi].filter(Boolean).join(' ') || 'pelaaja';
    const seuraNimi   = seura || 'TalentMaster-seura';
    const joukkueNimi = joukkue || '';

    try {
      const transporter = luoTransporter();
      const fromEmail   = process.env.GMAIL_EMAIL;

      await transporter.sendMail({
        from:    `"${seuraNimi}" <${fromEmail}>`,
        to:      hEmail,
        subject: `${seuraNimi} — Rekisteröintikutsu TalentMaster-järjestelmään`,
        html: `
          <div style="font-family:Arial,sans-serif;max-width:600px;margin:0 auto;padding:20px;">
            <div style="background:#06090F;padding:24px;border-radius:12px;margin-bottom:24px;">
              <h1 style="color:#3EC9A7;margin:0;font-size:22px;">TalentMaster™</h1>
              <p style="color:#aaa;margin:4px 0 0;font-size:13px;">${seuraNimi}</p>
            </div>

            <p style="font-size:16px;color:#333;">Hei,</p>

            <p style="font-size:15px;color:#333;line-height:1.6;">
              <strong>${seuraNimi}</strong> kutsuu teidät rekisteröimään
              <strong>${pelaajaNimi}</strong> TalentMaster-järjestelmään
              ${joukkueNimi ? `joukkueeseen <strong>${joukkueNimi}</strong>` : ''}.
            </p>

            <p style="font-size:14px;color:#555;line-height:1.6;">
              Rekisteröityminen on nopeaa — täytätte pelaajan tiedot ja annatte
              GDPR-suostumuksen tietojen käsittelyyn. Tämän jälkeen pelaaja
              aktivoituu järjestelmässä ja valmennustiimi voi seurata kehitystä.
            </p>

            <div style="text-align:center;margin:32px 0;">
              <a href="${linkki}"
                style="background:#3EC9A7;color:#000;padding:14px 32px;
                border-radius:8px;text-decoration:none;font-weight:bold;
                font-size:16px;display:inline-block;">
                Rekisteröidy ja anna suostumus →
              </a>
            </div>

            <p style="font-size:12px;color:#999;text-align:center;line-height:1.5;">
              Linkki on henkilökohtainen — älkää jakako eteenpäin.<br>
              Jos teillä on kysyttävää, ottakaa yhteyttä seuraan.
            </p>

            <hr style="border:none;border-top:1px solid #eee;margin:24px 0;">
            <p style="font-size:11px;color:#bbb;text-align:center;">
              TalentMaster™ — Jalkapallon talenttiarviointijärjestelmä<br>
              ${seuraNimi}
            </p>
          </div>
        `,
      });

      // Tallennetaan lähetys Firestoreen audit-trailille
      await db.collection('audit').add({
        toiminto:    'rekisterikutsu_lahetetty',
        hEmail,
        pelaajaNimi,
        seura:       seuraNimi,
        tekija_uid:  context.auth.uid,
        aikaleima:   admin.firestore.FieldValue.serverTimestamp(),
      }).catch(() => {});

      return { ok: true, viesti: `Kutsu lähetetty: ${hEmail}` };

    } catch (e) {
      console.error('Sähköpostilähetys epäonnistui:', e.message);
      throw new functions.https.HttpsError('internal', `Lähetys epäonnistui: ${e.message}`);
    }
  });

// ─────────────────────────────────────────────────────────────────────────────
// lahetaHuoltajaKutsu — Vanha funktio (yhteensopivuus)
// ─────────────────────────────────────────────────────────────────────────────
exports.lahetaHuoltajaKutsu = functions
  .region('europe-west1')
  .https.onCall(async (data, context) => {

    if (!context.auth) {
      throw new functions.https.HttpsError('unauthenticated', 'Kirjaudu ensin.');
    }

    const { huoltajaEmail, pelaajaId, seuraId, pelaajaNimi } = data;

    if (!huoltajaEmail || !pelaajaId || !seuraId) {
      throw new functions.https.HttpsError('invalid-argument', 'huoltajaEmail, pelaajaId ja seuraId ovat pakollisia.');
    }

    const suostumusLinkki =
      `https://terokoskela7-cmyk.github.io/talentmaster/` +
      `TalentMaster_Rekisterointi_Suostumus.html` +
      `?seura=${seuraId}&pelaaja=${pelaajaId}`;

    await db.collection('seurat').doc(seuraId)
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

    return { ok: true, linkki: suostumusLinkki, viesti: `Kutsu tallennettu: ${huoltajaEmail}` };
  });

// ─────────────────────────────────────────────────────────────────────────────
// luoKayttaja — Luo uusi käyttäjätili
// ─────────────────────────────────────────────────────────────────────────────
exports.luoKayttaja = functions
  .region('europe-west1')
  .https.onCall(async (data, context) => {

    if (!context.auth) {
      throw new functions.https.HttpsError('unauthenticated', 'Kirjaudu sisään ennen käyttäjän luomista.');
    }

    const kutsujaUid = context.auth.uid;
    const { email, rooli, seuraId, etunimi, sukunimi, joukkue, joukkueNimi } = data;

    if (!email || !email.includes('@')) {
      throw new functions.https.HttpsError('invalid-argument', 'Virheellinen sähköpostiosoite.');
    }
    if (!rooli)   throw new functions.https.HttpsError('invalid-argument', 'Rooli on pakollinen.');
    if (!seuraId) throw new functions.https.HttpsError('invalid-argument', 'Seura on pakollinen.');

    // Logataan kriittiset parametrit — näkyy Cloud Loggingissa heti
    console.log('[luoKayttaja] Kutsu vastaanotettu:',
      '| kutsujaUid:', kutsujaUid,
      '| seuraId:', seuraId,
      '| rooli:', rooli,
      '| email:', email);

    const oikeus = await tarkistaOikeus(kutsujaUid, seuraId);
    console.log('[luoKayttaja] tarkistaOikeus tulos:', JSON.stringify(oikeus));

    if (!oikeus.sallittu) {
      // Tarkka virheviesti helpottaa debuggausta Cloud Loggingissa
      console.error('[luoKayttaja] HYLÄTTY — ei oikeuksia.',
        '| seuraId:', seuraId,
        '| kutsujaUid:', kutsujaUid,
        '| oikeus:', JSON.stringify(oikeus));
      throw new functions.https.HttpsError('permission-denied',
        `Ei oikeuksia lisätä käyttäjiä seuralle "${seuraId}". ` +
        `Tarkista että olet super-admin tai VP tässä seurassa.`);
    }

    try {
      const olemassaOleva = await auth.getUserByEmail(email);
      if (olemassaOleva) {
        throw new functions.https.HttpsError('already-exists',
          `Sähköposti ${email} on jo käytössä. Voit lähettää salasananvaihtosähköpostin käyttäjälistasta.`);
      }
    } catch (e) {
      if (e.code === 'already-exists') throw e;
      if (e.errorInfo && e.errorInfo.code !== 'auth/user-not-found') throw e;
    }

    const valiaikainenSalasana = 'TM_' + Math.random().toString(36).slice(2, 10).toUpperCase();

    let uusiKayttaja;
    try {
      uusiKayttaja = await auth.createUser({
        email,
        password:      valiaikainenSalasana,
        displayName:   etunimi && sukunimi ? `${etunimi} ${sukunimi}` : (etunimi || email),
        emailVerified: false,
        disabled:      false,
      });
    } catch (e) {
      throw new functions.https.HttpsError('internal', `Auth-tilin luominen epäonnistui: ${e.message}`);
    }

    const uid = uusiKayttaja.uid;
    const nyt = admin.firestore.FieldValue.serverTimestamp();

    const kayttajaData = {
      uid, email,
      etunimi:     etunimi  || '',
      sukunimi:    sukunimi || '',
      nimi:        etunimi && sukunimi ? `${etunimi} ${sukunimi}` : (etunimi || email),
      rooli, seuraId,
      joukkue:     joukkue     || null,
      joukkueNimi: joukkueNimi || null,
      joukkueet:   joukkue ? [joukkue] : [],
      aktiivinen:  true,
      luotu:       nyt,
      luonut_uid:  kutsujaUid,
    };

    try {
      await db.collection('seurat').doc(seuraId)
        .collection('kayttajat').doc(uid).set(kayttajaData);

      if (rooli === 'vp') {
        const seuraDoc = await db.collection('seurat').doc(seuraId).get();
        if (seuraDoc.exists && !seuraDoc.data().vp_uid) {
          await db.collection('seurat').doc(seuraId).update({ vp_uid: uid, vp_email: email });
        }
      }
    } catch (e) {
      await auth.deleteUser(uid).catch(() => {});
      throw new functions.https.HttpsError('internal', `Firestore-kirjoitus epäonnistui: ${e.message}`);
    }

    let resetLinkki = null;
    try {
      resetLinkki = await auth.generatePasswordResetLink(email, {
        url: 'https://terokoskela7-cmyk.github.io/talentmaster/TalentMaster_Seura.html',
        handleCodeInApp: false,
      });

      // Lähetetään salasanaviesti sähköpostilla
      const transporter = luoTransporter();
      const fromEmail   = process.env.GMAIL_EMAIL;
      await transporter.sendMail({
        from:    `"TalentMaster" <${fromEmail}>`,
        to:      email,
        subject: 'TalentMaster™ — Tervetuloa! Aseta salasanasi',
        html: `
          <div style="font-family:Arial,sans-serif;max-width:600px;margin:0 auto;padding:20px;">
            <h2 style="color:#3EC9A7;">Tervetuloa TalentMasteriin!</h2>
            <p>Hei ${etunimi || ''},</p>
            <p>Sinut on lisätty TalentMaster-järjestelmään roolilla <strong>${rooli}</strong>.</p>
            <p>Aseta oma salasanasi klikkaamalla alla olevaa linkkiä:</p>
            <div style="text-align:center;margin:24px 0;">
              <a href="${resetLinkki}"
                style="background:#3EC9A7;color:#000;padding:12px 28px;
                border-radius:8px;text-decoration:none;font-weight:bold;">
                Aseta salasana →
              </a>
            </div>
            <p style="color:#999;font-size:12px;">Linkki on voimassa 1 tunnin.</p>
          </div>
        `,
      });
    } catch (e) {
      // Tämä ei kaada käyttäjän luomista — kirjataan vain varoitus
      console.warn('[luoKayttaja] Salasanalinkki/sähköposti epäonnistui:',
        e.message,
        '| email:', email,
        '| Tarkista Gmail App Password: firebase functions:config:get gmail');
    }

    await db.collection('audit').add({
      toiminto: 'kayttaja_luotu', kohde_uid: uid, kohde_email: email,
      kohde_rooli: rooli, seuraId, tekija_uid: kutsujaUid, aikaleima: nyt,
    }).catch(() => {});

    return { uid, email, resetLinkki, viesti: `${etunimi || email} lisätty onnistuneesti.` };
  });

// ─────────────────────────────────────────────────────────────────────────────
// deaktivioiKayttaja
// ─────────────────────────────────────────────────────────────────────────────
exports.deaktivioiKayttaja = functions
  .region('europe-west1')
  .https.onCall(async (data, context) => {

    if (!context.auth) {
      throw new functions.https.HttpsError('unauthenticated', 'Kirjaudu ensin.');
    }

    const { kohdeUid, seuraId } = data;
    if (!kohdeUid || !seuraId) {
      throw new functions.https.HttpsError('invalid-argument', 'kohdeUid ja seuraId ovat pakollisia.');
    }

    const oikeus = await tarkistaOikeus(context.auth.uid, seuraId);
    if (!oikeus.sallittu) {
      throw new functions.https.HttpsError('permission-denied', 'Ei oikeutta deaktivoida käyttäjiä.');
    }

    await auth.updateUser(kohdeUid, { disabled: true });
    await db.collection('seurat').doc(seuraId)
      .collection('kayttajat').doc(kohdeUid)
      .update({
        aktiivinen: false,
        deaktivoitu: admin.firestore.FieldValue.serverTimestamp(),
        deaktivoija_uid: context.auth.uid,
      });

    await db.collection('audit').add({
      toiminto: 'kayttaja_deaktivoitu', kohde_uid: kohdeUid,
      seuraId, tekija_uid: context.auth.uid,
      aikaleima: admin.firestore.FieldValue.serverTimestamp(),
    }).catch(() => {});

    return { ok: true, viesti: 'Käyttäjä deaktivoitu.' };
  });

// ─────────────────────────────────────────────────────────────────────────────
// lahetaPelaajaSivuLinkki — Lähettää pelaajalle/huoltajalle linkin omalle sivulle
// Kutsutaan rekisteröintilomakkeesta suostumuksen tallennuksen jälkeen
// ─────────────────────────────────────────────────────────────────────────────
exports.lahetaPelaajaSivuLinkki = functions
  .region('europe-west1')
  .https.onCall(async (data, context) => {

    const { hEmail, pelaajaId, seuraId, etunimi, sukunimi, seura, joukkue } = data;

    if (!hEmail || !pelaajaId || !seuraId) {
      throw new functions.https.HttpsError('invalid-argument', 'hEmail, pelaajaId ja seuraId ovat pakollisia.');
    }

    const pelaajaNimi = [etunimi, sukunimi].filter(Boolean).join(' ') || 'pelaaja';
    const seuraNimi   = seura || 'TalentMaster-seura';
    const joukkueNimi = joukkue || '';

    // Rakennetaan linkki pelaajan omalle sivulle
    const baseUrl = 'https://terokoskela7-cmyk.github.io/talentmaster';
    const pelaajaLinkki = `${baseUrl}/TalentMaster_Pelaaja_v2.html` +
      `?pelaajaId=${pelaajaId}&seuraId=${seuraId}` +
      `&etunimi=${encodeURIComponent(etunimi||'')}&sukunimi=${encodeURIComponent(sukunimi||'')}`;

    try {
      const transporter = luoTransporter();
      const fromEmail   = process.env.GMAIL_EMAIL;

      await transporter.sendMail({
        from:    `"${seuraNimi}" <${fromEmail}>`,
        to:      hEmail,
        subject: `${etunimi ? etunimi + ' — ' : ''}Pelaajan kehityssivu TalentMasterissa`,
        html: `
          <div style="font-family:Arial,sans-serif;max-width:600px;margin:0 auto;padding:20px;">
            <div style="background:#06090F;padding:24px;border-radius:12px;margin-bottom:24px;">
              <h1 style="color:#3EC9A7;margin:0;font-size:22px;">TalentMaster™</h1>
              <p style="color:#aaa;margin:4px 0 0;font-size:13px;">${seuraNimi}</p>
            </div>

            <p style="font-size:16px;color:#333;">Hei,</p>

            <p style="font-size:15px;color:#333;line-height:1.6;">
              <strong>${pelaajaNimi}</strong> on nyt rekisteröity TalentMaster-järjestelmään
              ${joukkueNimi ? `joukkueeseen <strong>${joukkueNimi}</strong>` : ''}.
              Tästä eteenpäin voitte seurata kehitystä omalla sivulla.
            </p>

            <div style="background:#f8f9fa;border-radius:12px;padding:20px;margin:24px 0;border-left:4px solid #3EC9A7;">
              <h3 style="margin:0 0 8px;color:#333;font-size:15px;">📊 Mitä näette pelaajan sivulla?</h3>
              <ul style="margin:0;padding-left:20px;color:#555;font-size:14px;line-height:1.8;">
                <li>Harjoitettavuus (FLEI) — kehon valmius harjoitteluun</li>
                <li>Viisi kehitysdimensiota (fyysinen, tekninen, psyykkinen...)</li>
                <li>Harjoitus- ja kartoitushistoria</li>
                <li>Yksilölliset kehityskohteet ja vahvuudet</li>
              </ul>
            </div>

            <div style="text-align:center;margin:32px 0;">
              <a href="${pelaajaLinkki}"
                style="background:#3EC9A7;color:#000;padding:16px 36px;
                border-radius:8px;text-decoration:none;font-weight:bold;
                font-size:16px;display:inline-block;">
                Avaa ${etunimi||'pelaajan'} kehityssivu →
              </a>
            </div>

            <p style="font-size:13px;color:#666;line-height:1.6;">
              Kirjautukaa sivulle tällä sähköpostiosoitteella (<strong>${hEmail}</strong>).
              Jos ette ole vielä luoneet salasanaa, käyttäkää "Unohditko salasanan?" -linkkiä.
            </p>

            <hr style="border:none;border-top:1px solid #eee;margin:24px 0;">
            <p style="font-size:11px;color:#bbb;text-align:center;">
              TalentMaster™ — Jalkapallon talenttiarviointijärjestelmä<br>
              ${seuraNimi}
            </p>
          </div>
        `,
      });

      // Päivitä pelaajan tila Firestoreen
      await db.collection('seurat').doc(seuraId)
        .collection('pelaajat').doc(pelaajaId)
        .update({
          pelaajaLinkki,
          pelaajaLinkLahetetty: admin.firestore.FieldValue.serverTimestamp(),
        }).catch(() => {});

      return { ok: true, linkki: pelaajaLinkki };

    } catch (e) {
      console.error('lahetaPelaajaSivuLinkki virhe:', e.message);
      throw new functions.https.HttpsError('internal', `Lähetys epäonnistui: ${e.message}`);
    }
  });
