/**
 * TalentMaster™ — Firebase Cloud Functions
 * functions/index.js
 *
 * Päivitetty: 2026-04-02
 * Muutokset:
 *   1. lahetaPelaajaSivuLinkki — lisätty generatePasswordResetLink + nappi sähköpostiin
 *   2. lahetaPelaajaSivuLinkki — joukkueNimi haetaan Firestoresta tunnuksen sijaan
 *   3. lahetaRekisteriKutsu    — joukkueNimi haetaan Firestoresta tunnuksen sijaan
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
function luoTransporter() {
  const email    = process.env.GMAIL_EMAIL;
  const password = process.env.GMAIL_APP_PASSWORD;
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
// APUFUNKTIO: Hae joukkueen näyttönimi tunnuksesta
// Esim. "kpv_u13" → "KPV U13"
// Palauttaa tunnuksen sellaisenaan jos dokumenttia ei löydy.
// ─────────────────────────────────────────────────────────────────────────────
async function haeJoukkueNimi(seuraId, joukkueTunnus) {
  if (!joukkueTunnus) return '';
  try {
    const snap = await db
      .collection('seurat').doc(seuraId)
      .collection('joukkueet').doc(joukkueTunnus)
      .get();
    // Firestore-dokumentissa kentät voivat olla "nimi" tai "joukkueNimi"
    if (snap.exists) {
      const d = snap.data();
      return d.nimi || d.joukkueNimi || joukkueTunnus;
    }
  } catch (e) {
    console.warn('[haeJoukkueNimi] Haku epäonnistui:', e.message);
  }
  // Fallback: muunna tunnus luettavaksi (kpv_u13 → KPV U13)
  return joukkueTunnus
    .replace(/_/g, ' ')
    .replace(/\b\w/g, c => c.toUpperCase());
}

// ─────────────────────────────────────────────────────────────────────────────
// APUFUNKTIO: Tarkista oikeus
// ─────────────────────────────────────────────────────────────────────────────
async function tarkistaOikeus(kutsujaUid, kohdeSeuraId) {
  const adminDoc = await db.collection('admins').doc(kutsujaUid).get();
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
// MUUTOS: joukkueNimi haetaan nyt Firestoresta tunnuksen sijaan
// ─────────────────────────────────────────────────────────────────────────────
exports.lahetaRekisteriKutsu = functions
  .region('europe-west1')
  .https.onCall(async (data, context) => {

    if (!context.auth) {
      throw new functions.https.HttpsError('unauthenticated', 'Kirjaudu ensin.');
    }

    const { hEmail, linkki, seura, seuraId, etunimi, sukunimi, joukkue } = data;

    if (!hEmail || !linkki) {
      throw new functions.https.HttpsError('invalid-argument', 'hEmail ja linkki ovat pakollisia.');
    }

    const pelaajaNimi = [etunimi, sukunimi].filter(Boolean).join(' ') || 'pelaaja';
    const seuraNimi   = seura || 'TalentMaster-seura';

    // KORJAUS: Haetaan näyttönimi Firestoresta jos seuraId on saatavilla
    // Jos ei, muunnetaan tunnus luettavaksi (kpv_u13 → KPV U13)
    const joukkueNimi = seuraId
      ? await haeJoukkueNimi(seuraId, joukkue)
      : (joukkue || '').replace(/_/g, ' ').replace(/\b\w/g, c => c.toUpperCase());

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
// luoKayttaja — Luo uusi käyttäjätili (ei muutoksia)
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

    console.log('[luoKayttaja] Kutsu vastaanotettu:',
      '| kutsujaUid:', kutsujaUid,
      '| seuraId:', seuraId,
      '| rooli:', rooli,
      '| email:', email);

    const oikeus = await tarkistaOikeus(kutsujaUid, seuraId);
    console.log('[luoKayttaja] tarkistaOikeus tulos:', JSON.stringify(oikeus));

    if (!oikeus.sallittu) {
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
          `Sähköposti ${email} on jo käytössä.`);
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
      console.warn('[luoKayttaja] Salasanalinkki/sähköposti epäonnistui:', e.message);
    }

    await db.collection('audit').add({
      toiminto: 'kayttaja_luotu', kohde_uid: uid, kohde_email: email,
      kohde_rooli: rooli, seuraId, tekija_uid: kutsujaUid, aikaleima: nyt,
    }).catch(() => {});

    return { uid, email, resetLinkki, viesti: `${etunimi || email} lisätty onnistuneesti.` };
  });

// ─────────────────────────────────────────────────────────────────────────────
// deaktivioiKayttaja (ei muutoksia)
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
// lahetaPelaajaSivuLinkki
//
// MUUTOS 1 (password reset):
//   Generoidaan Firebase password reset -linkki ja lisätään se sähköpostiin
//   ensimmäisenä toimintakehotuksena. Huoltaja asettaa salasanan ennen kuin
//   avaa pelaajan tai vanhemman sivun.
//
// MUUTOS 2 (joukkueNimi):
//   joukkueNimi haetaan Firestoresta haeJoukkueNimi()-apufunktiolla.
//   Tunnus "kpv_u13" näkyy sähköpostissa muodossa "KPV U13".
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

    // MUUTOS 2: Haetaan joukkueen näyttönimi Firestoresta
    const joukkueNimi = await haeJoukkueNimi(seuraId, joukkue);

    // Linkit pelaajan ja vanhemman sivuille
    const baseUrl = 'https://terokoskela7-cmyk.github.io/talentmaster';
    const pelaajaLinkki = `${baseUrl}/TalentMaster_Pelaaja_v1.html` +
      `?pelaajaId=${pelaajaId}&seuraId=${seuraId}` +
      `&etunimi=${encodeURIComponent(etunimi||'')}&sukunimi=${encodeURIComponent(sukunimi||'')}`;
    const vanhempiLinkki = `${baseUrl}/TalentMaster_Vanhempi.html` +
      `?pelaajaId=${pelaajaId}&seuraId=${seuraId}` +
      `&etunimi=${encodeURIComponent(etunimi||'')}&sukunimi=${encodeURIComponent(sukunimi||'')}`;

    // MUUTOS 1: Generoidaan salasanan asetuksen linkki
    // Tämä on Firebase Auth -toiminto joka ohjaa huoltajan asettamaan
    // oman salasanansa — sen jälkeen kaikki kirjautumiset toimivat normaalisti.
    let salasanaLinkki = null;
    try {
      salasanaLinkki = await auth.generatePasswordResetLink(hEmail, {
        // continueUrl: mihin Firebase ohjaa salasanan asettamisen jälkeen
        // Ohjataan suoraan vanhemman sivulle — huoltaja päätyy oikeaan paikkaan
        url: vanhempiLinkki,
        handleCodeInApp: false,
      });
      console.log('[lahetaPelaajaSivuLinkki] Salasanalinkki generoitu:', hEmail);
    } catch (e) {
      // Jos käyttäjää ei löydy Firebase Authista, linkki ei onnistu.
      // Tämä voi tapahtua jos rekisteröintilomake luo tunnuksen myöhemmin.
      // Ei kaada funktiota — lähetetään sähköposti ilman salasanalinkkiä.
      console.warn('[lahetaPelaajaSivuLinkki] Salasanalinkin generointi epäonnistui:',
        e.message, '| hEmail:', hEmail);
    }

    try {
      const transporter = luoTransporter();
      const fromEmail   = process.env.GMAIL_EMAIL;

      await transporter.sendMail({
        from:    `"${seuraNimi}" <${fromEmail}>`,
        to:      hEmail,
        subject: `${etunimi ? etunimi + ' — ' : ''}Tervetuloa TalentMasteriin! Aseta ensin salasanasi`,
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
            </p>

            ${salasanaLinkki ? `
            <!-- VAIHE 1: Salasanan asetus — näkyy ensin, kehystetty selkeästi -->
            <div style="background:#f0fdf8;border:2px solid #3EC9A7;border-radius:12px;
                        padding:20px;margin:24px 0;">
              <p style="margin:0 0 8px;font-size:15px;font-weight:bold;color:#1a1a1a;">
                ① Aseta ensin salasanasi
              </p>
              <p style="margin:0 0 16px;font-size:14px;color:#444;line-height:1.5;">
                Klikkaa alla olevaa linkkiä ja luo oma salasana.
                Sen jälkeen pääset kirjautumaan pelaajan ja vanhemman sivuille.
                <strong>Linkki vanhenee 1 tunnissa.</strong>
              </p>
              <div style="text-align:center;">
                <a href="${salasanaLinkki}"
                  style="background:#3EC9A7;color:#000;padding:14px 32px;
                  border-radius:8px;text-decoration:none;font-weight:bold;
                  font-size:16px;display:inline-block;">
                  Aseta salasana →
                </a>
              </div>
            </div>

            <!-- VAIHE 2: Sivulinkit — näytetään salasanan asettamisen jälkeen -->
            <p style="font-size:14px;color:#555;font-weight:bold;margin:24px 0 8px;">
              ② Kun salasana on asetettu, pääset sivuille:
            </p>
            ` : `
            <!-- Fallback jos salasanalinkin generointi epäonnistui -->
            <p style="font-size:14px;color:#555;margin:16px 0;">
              Kirjautukaa sivuille sähköpostiosoitteella
              <strong>${hEmail}</strong> ja valitsemalla "Unohditko salasanan?".
            </p>
            `}

            <div style="background:#f8f9fa;border-radius:12px;padding:20px;margin:16px 0;border-left:4px solid #3EC9A7;">
              <h3 style="margin:0 0 8px;color:#333;font-size:15px;">📊 Mitä näette pelaajan sivulla?</h3>
              <ul style="margin:0;padding-left:20px;color:#555;font-size:14px;line-height:1.8;">
                <li>Harjoitettavuus (FLEI) — kehon valmius harjoitteluun</li>
                <li>Viisi kehitysdimensiota (fyysinen, tekninen, psyykkinen...)</li>
                <li>Harjoitus- ja kartoitushistoria</li>
                <li>Yksilölliset kehityskohteet ja vahvuudet</li>
              </ul>
            </div>

            <div style="text-align:center;margin:24px 0;display:flex;flex-direction:column;gap:12px;align-items:center;">
              <a href="${vanhempiLinkki}"
                style="background:#3EC9A7;color:#000;padding:16px 36px;
                border-radius:8px;text-decoration:none;font-weight:bold;
                font-size:16px;display:inline-block;width:280px;">
                👨‍👩‍👦 Vanhemman sivu →
              </a>
              <a href="${pelaajaLinkki}"
                style="background:#1A2235;color:#3EC9A7;padding:14px 36px;
                border:1px solid #3EC9A7;
                border-radius:8px;text-decoration:none;font-weight:bold;
                font-size:15px;display:inline-block;width:280px;">
                ⚽ Pelaajan oma sivu →
              </a>
            </div>

            <p style="font-size:12px;color:#999;text-align:center;">
              Tallentakaa molemmat sivut puhelimeen — ne päivittyvät automaattisesti.
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
          salasanaLinkLahetetty: salasanaLinkki
            ? admin.firestore.FieldValue.serverTimestamp()
            : null,
        }).catch(() => {});

      return { ok: true, linkki: pelaajaLinkki, salasanaLinkki };

    } catch (e) {
      console.error('lahetaPelaajaSivuLinkki virhe:', e.message);
      throw new functions.https.HttpsError('internal', `Lähetys epäonnistui: ${e.message}`);
    }
  });
