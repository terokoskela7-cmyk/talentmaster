/**
 * TalentMaster™ — Firebase Cloud Functions
 * functions/index.js
 *
 * Päivitetty: 2026-06-04
 * Sähköpostiratkaisu: SendGrid HTTP API (ei Nodemailer, ei SMTP)
 * SendGrid-avaimet: GitHub-repo-Secretit → .env (CI) → process.env. EI Secret Manager runWith.
 */
const functions = require('firebase-functions');
const admin     = require('firebase-admin');
const https     = require('https');
if (!admin.apps.length) {
  admin.initializeApp();
}
const db   = admin.firestore();
const auth = admin.auth();
// ─────────────────────────────────────────────────────────────────────────────
// APUFUNKTIO: Lähetä sähköposti SendGridin HTTP API:n kautta
// ─────────────────────────────────────────────────────────────────────────────
async function lahetaSahkoposti({ to, subject, html, fromName }) {
  const apiKey    = process.env.SENDGRID_API_KEY;
  const fromEmail = process.env.SENDGRID_FROM_EMAIL;
  console.log('[SendGrid] SENDGRID_API_KEY:', apiKey
    ? 'SG.' + apiKey.substring(3, 8) + '***' : 'PUUTTUU');
  console.log('[SendGrid] SENDGRID_FROM_EMAIL:', fromEmail || 'PUUTTUU');
  if (!apiKey || !fromEmail) {
    throw new Error(
      'SendGrid-credentiaalit puuttuvat. ' +
      'SENDGRID_API_KEY=' + (apiKey ? 'OK' : 'TYHJÄ') + ' ' +
      'SENDGRID_FROM_EMAIL=' + (fromEmail ? 'OK' : 'TYHJÄ')
    );
  }
  const payload = JSON.stringify({
    personalizations: [{ to: [{ email: to }] }],
    from: { email: fromEmail, name: fromName || 'TalentMaster™' },
    subject,
    content: [{ type: 'text/html', value: html }],
    tracking_settings: {
      click_tracking: { enable: true },
      open_tracking:  { enable: true },
    },
  });
  return new Promise((resolve, reject) => {
    const req = https.request(
      {
        hostname: 'api.sendgrid.com',
        path:     '/v3/mail/send',
        method:   'POST',
        headers: {
          'Authorization':  `Bearer ${apiKey}`,
          'Content-Type':   'application/json',
          'Content-Length': Buffer.byteLength(payload),
        },
      },
      (res) => {
        let body = '';
        res.on('data', chunk => { body += chunk; });
        res.on('end', () => {
          if (res.statusCode === 202) {
            console.log('[SendGrid] Lähetetty onnistuneesti:', to);
            resolve({ ok: true });
          } else {
            console.error('[SendGrid] Virhe:', res.statusCode, body);
            reject(new Error(`SendGrid palautti ${res.statusCode}: ${body}`));
          }
        });
      }
    );
    req.on('error', reject);
    req.write(payload);
    req.end();
  });
}
// ─────────────────────────────────────────────────────────────────────────────
// APUFUNKTIO: Hae joukkueen näyttönimi tunnuksesta
// ─────────────────────────────────────────────────────────────────────────────
async function haeJoukkueNimi(seuraId, joukkueTunnus) {
  if (!joukkueTunnus) return '';
  try {
    const snap = await db
      .collection('seurat').doc(seuraId)
      .collection('joukkueet').doc(joukkueTunnus)
      .get();
    if (snap.exists) {
      const d = snap.data();
      return d.nimi || d.joukkueNimi || joukkueTunnus;
    }
  } catch (e) {
    console.warn('[haeJoukkueNimi] Haku epäonnistui:', e.message);
  }
  return joukkueTunnus
    .replace(/_/g, ' ')
    .replace(/\b\w/g, c => c.toUpperCase());
}
// ─────────────────────────────────────────────────────────────────────────────
// APUFUNKTIO: Tarkista oikeus
// ─────────────────────────────────────────────────────────────────────────────
async function tarkistaOikeus(kutsujaUid, kohdeSeuraId) {
  const adminDoc  = await db.collection('admins').doc(kutsujaUid).get();
  const adminData = adminDoc.exists ? adminDoc.data() : null;
  const onSuperAdmin = adminData && (
    adminData.superAdmin === true ||
    adminData.rooli === 'super_admin' ||
    adminData.rooli === 'superadmin'
  );
  if (onSuperAdmin) return { sallittu: true, rooli: 'superadmin' };
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
// APUFUNKTIO: Hae tai luo Auth-käyttäjä huoltajalle
//
// MIKSI TÄMÄ TARVITAAN:
// generatePasswordResetLink() vaatii että käyttäjä on jo olemassa Firebase
// Authissa. Suostumuslomakkeen kautta tuleva huoltaja ei ole vielä Auth-
// käyttäjä — kukaan ei ole kutsunut luoKayttaja()-funktiota heidän puolestaan.
// Ratkaisu: tarkistetaan ensin getUserByEmail(). Jos käyttäjä löytyy,
// käytetään sitä. Jos ei löydy, luodaan uusi Auth-käyttäjä automaattisesti.
// Huoltaja asettaa oman salasanansa reset-linkin kautta — väliaikaista
// salasanaa ei koskaan näytetä kenellekään.
// ─────────────────────────────────────────────────────────────────────────────
async function haeOrLuoHuoltajaAuth(hEmail, etunimi, sukunimi) {
  try {
    const olemassa = await auth.getUserByEmail(hEmail);
    console.log('[haeOrLuoHuoltajaAuth] Käyttäjä löytyi:', hEmail);
    return olemassa;
  } catch (e) {
    // auth/user-not-found on odotettua — kaikki muut virheet nostetaan eteenpäin
    if (e.errorInfo && e.errorInfo.code !== 'auth/user-not-found') throw e;
  }
  // Luodaan Auth-tili — väliaikainen salasana on tekninen pakko,
  // käyttäjä ei koskaan näe sitä vaan asettaa oman reset-linkin kautta
  const valiaikainenSalasana = 'TM_' + Math.random().toString(36).slice(2, 10).toUpperCase();
  const uusiKayttaja = await auth.createUser({
    email:         hEmail,
    password:      valiaikainenSalasana,
    displayName:   [etunimi, sukunimi].filter(Boolean).join(' ') || hEmail,
    emailVerified: false,
    disabled:      false,
  });
  console.log('[haeOrLuoHuoltajaAuth] Uusi käyttäjä luotu:', hEmail, uusiKayttaja.uid);
  return uusiKayttaja;
}
// ─────────────────────────────────────────────────────────────────────────────
// SÄHKÖPOSTIPOHJAT
// ─────────────────────────────────────────────────────────────────────────────
function pohjaHeader(seuraNimi) {
  return `
    <div style="font-family:Arial,sans-serif;max-width:600px;margin:0 auto;padding:20px;">
      <div style="background:#06090F;padding:24px;border-radius:12px;margin-bottom:24px;">
        <h1 style="color:#3EC9A7;margin:0;font-size:22px;">TalentMaster™</h1>
        <p style="color:#aaa;margin:4px 0 0;font-size:13px;">${seuraNimi}</p>
      </div>`;
}
function pohjaFooter(seuraNimi) {
  return `
      <hr style="border:none;border-top:1px solid #eee;margin:24px 0;">
      <p style="font-size:11px;color:#bbb;text-align:center;">
        TalentMaster™ — Jalkapallon talenttiarviointijärjestelmä<br>
        ${seuraNimi}
      </p>
    </div>`;
}
function pohjaRekisteriKutsu({ seuraNimi, pelaajaNimi, joukkueNimi, linkki }) {
  return pohjaHeader(seuraNimi) + `
    <p style="font-size:16px;color:#333;">Hei,</p>
    <p style="font-size:15px;color:#333;line-height:1.6;">
      <strong>${seuraNimi}</strong> kutsuu teidät rekisteröimään
      <strong>${pelaajaNimi}</strong> TalentMaster-järjestelmään
      ${joukkueNimi ? `joukkueeseen <strong>${joukkueNimi}</strong>` : ''}.
    </p>
    <div style="text-align:center;margin:32px 0;">
      <a href="${linkki}"
        style="background:#3EC9A7;color:#000;padding:14px 32px;
        border-radius:8px;text-decoration:none;font-weight:bold;font-size:16px;
        display:inline-block;">
        Rekisteröidy ja anna suostumus →
      </a>
    </div>
    <p style="font-size:12px;color:#999;text-align:center;">
      Linkki on henkilökohtainen — älkää jakako eteenpäin.
    </p>` + pohjaFooter(seuraNimi);
}
function pohjaPelaajaSivu({
  seuraNimi, pelaajaNimi, joukkueNimi,
  salasanaLinkki, vanhempiLinkki, pelaajaLinkki, hEmail
}) {
  const salasanaOsio = salasanaLinkki ? `
    <div style="background:#f0fdf8;border:2px solid #3EC9A7;border-radius:12px;
                padding:20px;margin:24px 0;">
      <p style="margin:0 0 8px;font-size:15px;font-weight:bold;color:#1a1a1a;">
        ① Aseta ensin salasanasi
      </p>
      <p style="margin:0 0 16px;font-size:14px;color:#444;line-height:1.5;">
        Klikkaa linkkiä ja luo oma salasana. <strong>Linkki vanhenee 1 tunnissa.</strong>
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
    <p style="font-size:14px;color:#555;font-weight:bold;margin:24px 0 8px;">
      ② Kun salasana on asetettu, pääset sivuille:
    </p>` : `
    <p style="font-size:14px;color:#555;margin:16px 0;">
      Kirjautukaa sivuille osoitteella <strong>${hEmail}</strong>.
    </p>`;
  return pohjaHeader(seuraNimi) + `
    <p style="font-size:16px;color:#333;">Hei,</p>
    <p style="font-size:15px;color:#333;line-height:1.6;">
      <strong>${pelaajaNimi}</strong> on nyt rekisteröity TalentMaster-järjestelmään
      ${joukkueNimi ? `joukkueeseen <strong>${joukkueNimi}</strong>` : ''}.
    </p>
    ${salasanaOsio}
    <div style="text-align:center;margin:24px 0;display:flex;
                flex-direction:column;gap:12px;align-items:center;">
      <a href="${vanhempiLinkki}"
        style="background:#3EC9A7;color:#000;padding:16px 36px;
        border-radius:8px;text-decoration:none;font-weight:bold;
        font-size:16px;display:inline-block;width:280px;">
        👨‍👩‍👦 Vanhemman sivu →
      </a>
      <a href="${pelaajaLinkki}"
        style="background:#1A2235;color:#3EC9A7;padding:14px 36px;
        border:1px solid #3EC9A7;border-radius:8px;text-decoration:none;
        font-weight:bold;font-size:15px;display:inline-block;width:280px;">
        ⚽ Pelaajan oma sivu →
      </a>
    </div>` + pohjaFooter(seuraNimi);
}
function pohjaSalasanaAsetus({ etunimi, rooli, resetLinkki }) {
  return `
    <div style="font-family:Arial,sans-serif;max-width:600px;margin:0 auto;padding:20px;">
      <h2 style="color:#3EC9A7;">Tervetuloa TalentMasteriin!</h2>
      <p>Hei ${etunimi || ''},</p>
      <p>Sinut on lisätty järjestelmään roolilla <strong>${rooli}</strong>.</p>
      <p>Aseta oma salasanasi klikkaamalla alla olevaa linkkiä:</p>
      <div style="text-align:center;margin:24px 0;">
        <a href="${resetLinkki}"
          style="background:#3EC9A7;color:#000;padding:12px 28px;
          border-radius:8px;text-decoration:none;font-weight:bold;">
          Aseta salasana →
        </a>
      </div>
      <p style="color:#999;font-size:12px;">Linkki on voimassa 1 tunnin.</p>
    </div>`;
}
// ─────────────────────────────────────────────────────────────────────────────
// lahetaRekisteriKutsu
// ─────────────────────────────────────────────────────────────────────────────
exports.lahetaRekisteriKutsu = functions
  .region('europe-west1')
  // SENDGRID_API_KEY luetaan process.env:stä — CI injektoi sen .env:hen GitHub-repo-Secretistä
  // (deploy_functions.yml), kuten ANTHROPIC/OPENAI. EI runWith({secrets}): GitHub Actions -SA:lta
  // puuttuu secretmanager.versions.get → deploy-aikainen Secret Manager -validointi kaatuu (403).
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
    const joukkueNimi = seuraId
      ? await haeJoukkueNimi(seuraId, joukkue)
      : (joukkue || '').replace(/_/g, ' ').replace(/\b\w/g, c => c.toUpperCase());
    try {
      await lahetaSahkoposti({
        to: hEmail,
        subject: `${seuraNimi} — Rekisteröintikutsu TalentMaster-järjestelmään`,
        fromName: seuraNimi,
        html: pohjaRekisteriKutsu({ seuraNimi, pelaajaNimi, joukkueNimi, linkki }),
      });
      await db.collection('audit').add({
        toiminto: 'rekisterikutsu_lahetetty',
        hEmail, pelaajaNimi, seura: seuraNimi,
        tekija_uid: context.auth.uid,
        aikaleima: admin.firestore.FieldValue.serverTimestamp(),
      }).catch(() => {});
      return { ok: true, viesti: `Kutsu lähetetty: ${hEmail}` };
    } catch (e) {
      console.error('lahetaRekisteriKutsu virhe:', e.message);
      throw new functions.https.HttpsError('internal', `Lähetys epäonnistui: ${e.message}`);
    }
  });
// ─────────────────────────────────────────────────────────────────────────────
// lahetaHuoltajaKutsu
// ─────────────────────────────────────────────────────────────────────────────
exports.lahetaHuoltajaKutsu = functions
  .region('europe-west1')
  .https.onCall(async (data, context) => {
    if (!context.auth) {
      throw new functions.https.HttpsError('unauthenticated', 'Kirjaudu ensin.');
    }
    const { huoltajaEmail, pelaajaId, seuraId, pelaajaNimi } = data;
    if (!huoltajaEmail || !pelaajaId || !seuraId) {
      throw new functions.https.HttpsError('invalid-argument',
        'huoltajaEmail, pelaajaId ja seuraId ovat pakollisia.');
    }
    const suostumusLinkki =
      `https://terokoskela7-cmyk.github.io/talentmaster/` +
      `TalentMaster_Rekisterointi_Suostumus.html` +
      `?seura=${seuraId}&pelaaja=${pelaajaId}`;
    await db.collection('seurat').doc(seuraId)
      .collection('kutsut').add({
        tyyppi: 'huoltaja_suostumus', huoltajaEmail, pelaajaId,
        pelaajaNimi: pelaajaNimi || '', linkki: suostumusLinkki,
        tila: 'lahetetty',
        lahetetty: admin.firestore.FieldValue.serverTimestamp(),
        lahettaja_uid: context.auth.uid,
      });
    return { ok: true, linkki: suostumusLinkki };
  });
// ─────────────────────────────────────────────────────────────────────────────
// luoKayttaja
// ─────────────────────────────────────────────────────────────────────────────
exports.luoKayttaja = functions
  .region('europe-west1')
  .https.onCall(async (data, context) => {
    if (!context.auth) {
      throw new functions.https.HttpsError('unauthenticated', 'Kirjaudu sisään.');
    }
    const kutsujaUid = context.auth.uid;
    const { email, rooli, seuraId, etunimi, sukunimi, joukkue, joukkueNimi } = data;
    if (!email || !email.includes('@')) {
      throw new functions.https.HttpsError('invalid-argument', 'Virheellinen sähköposti.');
    }
    if (!rooli)   throw new functions.https.HttpsError('invalid-argument', 'Rooli pakollinen.');
    if (!seuraId) throw new functions.https.HttpsError('invalid-argument', 'Seura pakollinen.');
    const oikeus = await tarkistaOikeus(kutsujaUid, seuraId);
    if (!oikeus.sallittu) {
      throw new functions.https.HttpsError('permission-denied',
        `Ei oikeuksia seuralle "${seuraId}".`);
    }
    // ── KORJAUS 2026-04-06: sama henkilö voi toimia useassa roolissa ──────────
    // Aikaisempi koodi heitti 'already-exists'-virheen jos sähköposti löytyi jo
    // Authista. Tämä kaatoi prosessin tilanteessa jossa esim. henkilö on ensin
    // rekisteröitynyt huoltajana ja hänet yritetään myöhemmin lisätä VP:ksi.
    //
    // Ratkaisu: sama logiikka kuin haeOrLuoHuoltajaAuth()-funktiossa.
    // Jos email löytyy → käytetään olemassaolevaa UID:tä ja päivitetään vain
    // rooli/seura Firestoreen. Jos ei löydy → luodaan uusi tili normaalisti.
    // Molemmissa tapauksissa lähetetään salasanalinkki (vanhat käyttäjät saavat
    // linkin joka ohjaa heidät uuteen rooliin).
    let uid;
    let onOlemassaOleva = false;
    try {
      const olemassaOleva = await auth.getUserByEmail(email);
      // Käyttäjä löytyi — käytetään hänen UID:tään, ei luoda uutta tiliä
      uid = olemassaOleva.uid;
      onOlemassaOleva = true;
      console.log(`[luoKayttaja] ${email} löytyi jo Authista (uid: ${uid}) — lisätään rooli ${rooli} seuralle ${seuraId}`);
    } catch (e) {
      // auth/user-not-found on normaali tapaus — luodaan uusi tili
      if (e.errorInfo && e.errorInfo.code !== 'auth/user-not-found') {
        throw new functions.https.HttpsError('internal', `Auth-haku epäonnistui: ${e.message}`);
      }
      const valiaikainenSalasana = 'TM_' + Math.random().toString(36).slice(2, 10).toUpperCase();
      try {
        const uusiKayttaja = await auth.createUser({
          email, password: valiaikainenSalasana,
          displayName: etunimi && sukunimi ? `${etunimi} ${sukunimi}` : (etunimi || email),
          emailVerified: false, disabled: false,
        });
        uid = uusiKayttaja.uid;
        console.log(`[luoKayttaja] Uusi Auth-tili luotu: ${email} (uid: ${uid})`);
      } catch (createErr) {
        throw new functions.https.HttpsError('internal', `Auth-luonti epäonnistui: ${createErr.message}`);
      }
    }
    const nyt = admin.firestore.FieldValue.serverTimestamp();
    try {
      await db.collection('seurat').doc(seuraId)
        .collection('kayttajat').doc(uid).set({
          uid, email, etunimi: etunimi || '', sukunimi: sukunimi || '',
          nimi: etunimi && sukunimi ? `${etunimi} ${sukunimi}` : (etunimi || email),
          rooli, seuraId,
          joukkue: joukkue || null, joukkueNimi: joukkueNimi || null,
          joukkueet: joukkue ? [joukkue] : [],
          aktiivinen: true, luotu: nyt, luonut_uid: kutsujaUid,
        });
      if (rooli === 'vp') {
        const seuraDoc = await db.collection('seurat').doc(seuraId).get();
        if (seuraDoc.exists && !seuraDoc.data().vp_uid) {
          await db.collection('seurat').doc(seuraId)
            .update({ vp_uid: uid, vp_email: email });
        }
      }
    } catch (e) {
      // Rollback: poistetaan Auth-tili VAIN jos se luotiin juuri nyt.
      // Olemassaolevaa käyttäjää ei koskaan poisteta — hänellä voi olla
      // muita rooleja muissa seuroissa.
      if (!onOlemassaOleva) {
        await auth.deleteUser(uid).catch(() => {});
      }
      throw new functions.https.HttpsError('internal', `Firestore-kirjoitus epäonnistui: ${e.message}`);
    }

    // ── CUSTOM CLAIMS ──────────────────────────────────────────────────────────
    // Asetetaan rooli ja seuraId JWT-tokeniin jotta Firestore Rules tunnistaa
    // käyttäjän ilman erillistä Firestore-hakua. Ilman tätä valmentaja/VP ei
    // pääse Firestore-dataan koska Rules lukee request.auth.token.rooli:a.
    //
    // TÄRKEÄÄ: Käyttäjän täytyy kirjautua ulos ja uudelleen sisään (tai päivittää
    // token) ennen kuin uudet claims astuvat voimaan selaimessa. Salasanalinkin
    // kautta kirjautuminen hoitaa tämän automaattisesti — linkki pakottaa uuden
    // tokenin, joten valmentajan ensimmäinen kirjautuminen toimii heti oikein.
    try {
      await auth.setCustomUserClaims(uid, {
        rooli:   rooli,
        seuraId: seuraId,
      });
      console.log(`[luoKayttaja] Custom claims asetettu: ${email} → rooli=${rooli}, seuraId=${seuraId}`);
    } catch (e) {
      // Claims-virhe ei estä käyttäjän luontia — lokitetaan mutta jatketaan
      console.warn('[luoKayttaja] Custom claims -asetus epäonnistui:', e.message);
    }

    // ── SALASANALINKKI + SÄHKÖPOSTI (ERIYTETTY) ────────────────────────────────
    // Linkki generoidaan AINA ja palautetaan clientille — myös silloin kun
    // sähköpostilähetys epäonnistuu (esim. SendGrid "Maximum credits exceeded").
    // Näin kutsuja voi jakaa kirjautumislinkin manuaalisesti (sähköposti/
    // WhatsApp/kopioi) eikä uusi käyttäjä jää koskaan ilman pääsyä.
    let resetLinkki = null;
    let emailSent   = false;
    let emailError  = null;
    try {
      const roolitusUrl = {
        valmentaja:           'TalentMaster_Master_v16.html',
        talenttivalmentaja:   'TalentMaster_Master_v16.html',
        fysiikkavalmentaja:   'TalentMaster_Master_v16.html',
        fysioterapeutti:      'TalentMaster_Master_v16.html',
        testivastaava:        'TalentMaster_Master_v16.html',
        vp:                   'TalentMaster_Seura.html',
        seurasihteeri:        'TalentMaster_Seura.html',
        urheilutoimenjohtaja: 'TalentMaster_Seura.html',
      };
      const kohdeSimu = roolitusUrl[rooli] || 'TalentMaster_Seura.html';
      const kohdeUrl  = `https://terokoskela7-cmyk.github.io/talentmaster/${kohdeSimu}`;
      resetLinkki = await auth.generatePasswordResetLink(email, {
        url: kohdeUrl,
        handleCodeInApp: false,
      });
    } catch (e) {
      console.warn('[luoKayttaja] Salasanalinkin generointi epäonnistui:', e.message);
      emailError = e.message;
    }
    // Sähköposti lähetetään vain jos linkki saatiin — virhe ei kaada luontia.
    if (resetLinkki) {
      try {
        await lahetaSahkoposti({
          to: email,
          subject: 'TalentMaster™ — Tervetuloa! Aseta salasanasi',
          fromName: 'TalentMaster™',
          html: pohjaSalasanaAsetus({ etunimi, rooli, resetLinkki }),
        });
        emailSent = true;
      } catch (e) {
        emailError = e.message;
        console.warn('[luoKayttaja] Sähköposti epäonnistui:', e.message);
      }
    }
    await db.collection('audit').add({
      toiminto: 'kayttaja_luotu', kohde_uid: uid, kohde_email: email,
      kohde_rooli: rooli, seuraId, tekija_uid: kutsujaUid, aikaleima: nyt,
    }).catch(() => {});
    return {
      uid,
      email,
      rooli,
      etunimi: etunimi || '',
      resetLinkki,                      // backward compat (Admin/Seura lukevat tätä)
      passwordResetLink: resetLinkki,   // sama linkki — AINA mukana jakamista varten
      emailSent,                        // true/false
      emailError,                       // virheen syy jos sähköposti ei lähtenyt
      viesti: `${etunimi || email} lisätty onnistuneesti.`,
    };
  });

// ─────────────────────────────────────────────────────────────────────────────
// vaihdaKayttajanRooli — vaihtaa olemassa olevan käyttäjän roolin TURVALLISESTI:
// Firestore.update + setCustomUserClaims + revokeRefreshTokens. Korjaa bugin jossa
// pelkkä Firestore-kentän muutos jätti Rules-oikeudet vanhaan rooliin (Rules lukee
// request.auth.token.rooli -claimia, ei Firestore-kenttää).
// HUOM: kayttajat on alikokoelma seurat/{seuraId}/kayttajat/{uid} (EI top-level).
// ─────────────────────────────────────────────────────────────────────────────
const SALLITUT_ROOLIT_VAIHTO = ['vp', 'valmentaja', 'talenttivalmentaja', 'seura_admin'];
exports.vaihdaKayttajanRooli = functions
  .region('europe-west1')
  .https.onCall(async (data, context) => {
    if (!context.auth) {
      throw new functions.https.HttpsError('unauthenticated', 'Kirjaudu sisään.');
    }
    const kutsujaUid = context.auth.uid;
    const { uid, seuraId, uusiRooli } = data;
    if (!uid)     throw new functions.https.HttpsError('invalid-argument', 'uid pakollinen.');
    if (!seuraId) throw new functions.https.HttpsError('invalid-argument', 'seuraId pakollinen.');
    if (!SALLITUT_ROOLIT_VAIHTO.includes(uusiRooli)) {
      throw new functions.https.HttpsError('invalid-argument', `Virheellinen rooli: ${uusiRooli}`);
    }

    // 1. Oikeustarkistus — vain SA, VP tai seura_admin (sama tarkistaOikeus kuin muualla)
    const oikeus = await tarkistaOikeus(kutsujaUid, seuraId);
    if (!oikeus.sallittu) {
      throw new functions.https.HttpsError('permission-denied', `Ei oikeuksia seuralle "${seuraId}".`);
    }

    // 2. Varmista että kohdekäyttäjä kuuluu seuraId:hen
    const kRef = db.collection('seurat').doc(seuraId).collection('kayttajat').doc(uid);
    const kDoc = await kRef.get();
    if (!kDoc.exists) {
      throw new functions.https.HttpsError('not-found', `Käyttäjää ${uid} ei löydy seurasta ${seuraId}.`);
    }
    if (kDoc.data().seuraId && kDoc.data().seuraId !== seuraId) {
      throw new functions.https.HttpsError('permission-denied', 'Käyttäjän seuraId ei täsmää parametriin.');
    }

    // 3. Firestore-rooli
    await kRef.update({ rooli: uusiRooli });

    // 4. Custom claims — PUUTTUVA PALA: pitää tokenin ja Firestore-dokumentin synkrona
    await auth.setCustomUserClaims(uid, { rooli: uusiRooli, seuraId: seuraId });

    // 5. vp_uid-hallinta (hyväksytty kompromissi)
    const sRef = db.collection('seurat').doc(seuraId);
    if (uusiRooli === 'vp') {
      await sRef.update({ vp_uid: uid });
    } else {
      const sDoc = await sRef.get();
      if (sDoc.exists && sDoc.data().vp_uid === uid) {
        await sRef.update({ vp_uid: null });
      }
      // muuten: stale vp_uid jätetään koskematta (tietoinen kompromissi — ei demota toista VP:tä)
    }

    // 6. Mitätöi vanhat refresh-tokenit. HUOM: aktiivinen sessio kestää ~1h ellei client
    //    pakota refreshiä → OSA 3 (defensiivinen claims-vs-Firestore-tarkistus) on välttämätön pari.
    await auth.revokeRefreshTokens(uid);

    console.log(`[vaihdaKayttajanRooli] ${uid} → ${uusiRooli} (seura ${seuraId}): Firestore+claims+revoke OK`);
    return {
      ok: true,
      uusiRooli,
      huomio: 'Käyttäjän tulee kirjautua uudelleen oikeuksien aktivoimiseksi'
    };
  });

// ─────────────────────────────────────────────────────────────────────────────
// lahetaResetLinkki — generoi salasanan reset-linkin OLEMASSA OLEVALLE henkilöstölle.
// Authz: kutsuja = super_admin TAI kohdeseuran johto (tarkistaOikeus) JA kohde-email
// kuuluu kyseisen seuran kayttajat-kokoelmaan. Ei kirjoita dataa eikä lähetä sähköpostia
// — palauttaa vain linkin jaettavaksi (📧/💬/📋). generatePasswordResetLink ei muuta salasanaa.
// ─────────────────────────────────────────────────────────────────────────────
exports.lahetaResetLinkki = functions
  .region('europe-west1')
  .https.onCall(async (data, context) => {
    if (!context.auth) {
      throw new functions.https.HttpsError('unauthenticated', 'Kirjaudu sisään.');
    }
    const { email, seuraId } = data;
    if (!email || !email.includes('@')) {
      throw new functions.https.HttpsError('invalid-argument', 'Virheellinen sähköposti.');
    }
    if (!seuraId) {
      throw new functions.https.HttpsError('invalid-argument', 'Seura pakollinen.');
    }
    // 1) Kutsujalla oltava oikeus tähän seuraan (SA tai seuran johto)
    const oikeus = await tarkistaOikeus(context.auth.uid, seuraId);
    if (!oikeus.sallittu) {
      throw new functions.https.HttpsError('permission-denied',
        `Ei oikeuksia seuralle "${seuraId}".`);
    }
    // 2) Kohde-email kuuluttava tämän seuran henkilöstöön (estää mielivaltaiset resetit)
    const kSnap = await db.collection('seurat').doc(seuraId)
      .collection('kayttajat').where('email', '==', email).limit(1).get();
    if (kSnap.empty) {
      throw new functions.https.HttpsError('permission-denied',
        'Sähköposti ei kuulu tämän seuran henkilöstöön.');
    }
    // 3) Generoi reset-linkki (ei muuta salasanaa, ei kirjoita dataa, ei lähetä sähköpostia)
    // actionCodeSettings vaatii validin continue-url:n (kuten luoKayttaja) — muuten 500.
    try {
      const kohdeUrl = 'https://terokoskela7-cmyk.github.io/talentmaster/TalentMaster_Seura.html';
      const resetLinkki = await auth.generatePasswordResetLink(email, { url: kohdeUrl, handleCodeInApp: false });
      return { passwordResetLink: resetLinkki, resetLinkki: resetLinkki, email: email };
    } catch (e) {
      throw new functions.https.HttpsError('internal',
        `Reset-linkin generointi epäonnistui: ${e.message}`);
    }
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
      throw new functions.https.HttpsError('invalid-argument', 'kohdeUid ja seuraId pakollisia.');
    }
    const oikeus = await tarkistaOikeus(context.auth.uid, seuraId);
    if (!oikeus.sallittu) {
      throw new functions.https.HttpsError('permission-denied', 'Ei oikeutta deaktivoida.');
    }
    await auth.updateUser(kohdeUid, { disabled: true });
    await db.collection('seurat').doc(seuraId)
      .collection('kayttajat').doc(kohdeUid).update({
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
// MUUTOS: lisätty haeOrLuoHuoltajaAuth()-kutsu ennen generatePasswordResetLink().
// Aiemmin funktio epäonnistui äänettömästi jos huoltajalla ei ollut Auth-tiliä,
// jolloin salasanaLinkki jäi null:ksi ja sähköposti lähtee ilman salasanaosiota.
// Nyt Auth-tili luodaan automaattisesti jos sitä ei vielä ole.
// ─────────────────────────────────────────────────────────────────────────────
exports.lahetaPelaajaSivuLinkki = functions
  .region('europe-west1')
  .https.onCall(async (data, context) => {
    const { hEmail, pelaajaId, seuraId, etunimi, sukunimi, seura, joukkue } = data;
    if (!hEmail || !pelaajaId || !seuraId) {
      throw new functions.https.HttpsError('invalid-argument',
        'hEmail, pelaajaId ja seuraId ovat pakollisia.');
    }
    const pelaajaNimi = [etunimi, sukunimi].filter(Boolean).join(' ') || 'pelaaja';
    const seuraNimi   = seura || 'TalentMaster-seura';
    const joukkueNimi = await haeJoukkueNimi(seuraId, joukkue);
    const baseUrl = 'https://terokoskela7-cmyk.github.io/talentmaster';
    const pelaajaLinkki = `${baseUrl}/TalentMaster_Pelaaja_v7.html` +
      `?pelaajaId=${pelaajaId}&seuraId=${seuraId}` +
      `&etunimi=${encodeURIComponent(etunimi||'')}&sukunimi=${encodeURIComponent(sukunimi||'')}`;
    const vanhempiLinkki = `${baseUrl}/TalentMaster_Vanhempi_v2.html` +
      `?pelaajaId=${pelaajaId}&seuraId=${seuraId}` +
      `&etunimi=${encodeURIComponent(etunimi||'')}&sukunimi=${encodeURIComponent(sukunimi||'')}`;
    let salasanaLinkki = null;
    try {
      // MUUTOS: varmistetaan että Auth-tili on olemassa ennen reset-linkin generointia.
      // haeOrLuoHuoltajaAuth() palauttaa olemassaolevan tai luo uuden käyttäjän.
      await haeOrLuoHuoltajaAuth(hEmail, etunimi, sukunimi);
      salasanaLinkki = await auth.generatePasswordResetLink(hEmail, {
        url: vanhempiLinkki,
        handleCodeInApp: false,
      });
    } catch (e) {
      console.warn('[lahetaPelaajaSivuLinkki] Salasanalinkki epäonnistui:', e.message);
    }
    try {
      await lahetaSahkoposti({
        to: hEmail,
        subject: `${etunimi ? etunimi + ' — ' : ''}Tervetuloa TalentMasteriin! Aseta ensin salasanasi`,
        fromName: seuraNimi,
        html: pohjaPelaajaSivu({
          seuraNimi, pelaajaNimi, joukkueNimi,
          salasanaLinkki, vanhempiLinkki, pelaajaLinkki, hEmail,
        }),
      });
      await db.collection('seurat').doc(seuraId)
        .collection('pelaajat').doc(pelaajaId)
        .update({
          pelaajaLinkki,
          pelaajaLinkLahetetty: admin.firestore.FieldValue.serverTimestamp(),
          salasanaLinkLahetetty: salasanaLinkki
            ? admin.firestore.FieldValue.serverTimestamp() : null,
        }).catch(() => {});
      return { ok: true, linkki: pelaajaLinkki, salasanaLinkki };
    } catch (e) {
      console.error('lahetaPelaajaSivuLinkki virhe:', e.message);
      throw new functions.https.HttpsError('internal', `Lähetys epäonnistui: ${e.message}`);
    }
  });
// ─────────────────────────────────────────────────────────────────────────────
// vahvistaSuostumus — huoltajan suostumuksen palvelinvarmennettu vahvistus
//
// MIKSI CF: suostumustilan ('annettu') merkitseminen on turvakriittinen — sitä
// ei saa voida tehdä suoralla selainkirjoituksella. Tämä funktio varmistaa
// Admin SDK:lla että kutsuja todella on pelaajaan liitetty huoltaja (hEmail ===
// tallennettu huoltajaEmail) ennen kuin suostumus merkitään. Kirjoittaa palvelinpuolella
// KAIKKI kutsuflow'n kirjoitukset (suostumusTila + aux-kentät tila/antaja/bio-pituudet +
// kutsut→'hyvaksytty'), koska sivu on autentikoimaton eikä saa kirjoittaa Firestoreen suoraan.
// Lisäksi luo/hakee huoltajan Auth-tilin ja palauttaa salasanan asetuslinkin (sama kaava kuin
// lahetaPelaajaSivuLinkki / lahetaResetLinkki — url PAKOLLINEN, muuten 500, ks. §13).
// Käytössä: TalentMaster_Rekisterointi_Suostumus.html (kutsuflow).
// ─────────────────────────────────────────────────────────────────────────────
exports.vahvistaSuostumus = functions
  .region('europe-west1')
  // Ei sähköpostia vielä (ks. TODO) → ei SendGrid-riippuvuutta. Kun lähetys siirretään tänne,
  // SENDGRID_API_KEY tulee process.env:stä .env:n kautta (CI-injektio), kuten lahetaRekisteriKutsu.
  .https.onCall(async (data, context) => {
    // antaja/bioPituudet/kutsuId + syntyma/sukupuoli/suostumukset/suostumusMap/antajaRooli/aikaleima:
    // ei-arkaluonteiset kentät jotka lomake kirjoitti ennen suoraan client-puolelta — siirretty tänne,
    // koska Rekisterointi_Suostumus.html on autentikoimaton ja Rules estää sen suorat update-kirjoitukset.
    const { seuraId, pelaajaId, hEmail, suostumusTeksti, antaja, bioPituudet, kutsuId,
            syntyma, sukupuoli, suostumukset, suostumusMap, antajaRooli, aikaleima } = data || {};
    if (!seuraId || !pelaajaId || !hEmail) {
      throw new functions.https.HttpsError('invalid-argument',
        'seuraId, pelaajaId ja hEmail ovat pakollisia.');
    }
    const hEmailNorm = String(hEmail).trim().toLowerCase();

    // 2. Varmenna huoltajan sähköposti Admin SDK:lla pelaajadokumentista
    const pelRef = db.collection('seurat').doc(seuraId)
      .collection('pelaajat').doc(pelaajaId);
    const snap = await pelRef.get();
    if (!snap.exists) {
      throw new functions.https.HttpsError('not-found', 'Pelaajaa ei löytynyt.');
    }
    const tallennettuEmail = String(snap.get('huoltajaEmail') || '').trim().toLowerCase();
    if (!tallennettuEmail || tallennettuEmail !== hEmailNorm) {
      throw new functions.https.HttpsError('permission-denied',
        'Huoltajan sähköposti ei täsmää pelaajan tietoihin.');
    }

    // 3. Merkitse suostumus annetuksi + kirjoita ei-arkaluonteiset aux-kentät palvelinpuolella.
    const TS = admin.firestore.FieldValue.serverTimestamp();
    const paivitys = {
      suostumusTila:    'annettu',
      suostumusAnnettu: TS,
      suostumusTeksti:  suostumusTeksti || null,
      tila:             'aktiivinen',
      muokattu:         TS,
    };
    if (antaja) paivitys.suostumuksenAntaja = String(antaja);
    if (bioPituudet && typeof bioPituudet === 'object') {
      paivitys.isa_pituus_cm           = (bioPituudet.isa_pituus_cm  != null) ? bioPituudet.isa_pituus_cm  : null;
      paivitys.aiti_pituus_cm          = (bioPituudet.aiti_pituus_cm != null) ? bioPituudet.aiti_pituus_cm : null;
      paivitys.vanhempi_pituus_puuttuu = !!bioPituudet.vanhempi_pituus_puuttuu;
      paivitys.vanhempi_pituus_pvm     = bioPituudet.vanhempi_pituus_pvm || null;
    }

    // huoltajaEmail — vahvistus että varmennettu osoite tallentuu pelaajaprofiiliin
    paivitys.huoltajaEmail = hEmailNorm;

    // syntymäaika lomakkeen/URL:n ISO-päivästä (YYYY-MM-DD) → Timestamp + syntymaVuosi.
    // syntymapaiva Date.UTC():llä (§7 #11), vain validi 1990–2025.
    if (syntyma && /^\d{4}-\d{2}-\d{2}$/.test(String(syntyma))) {
      const osat = String(syntyma).split('-');
      const yy = parseInt(osat[0], 10), mm = parseInt(osat[1], 10), dd = parseInt(osat[2], 10);
      if (yy >= 1990 && yy <= 2025) {
        paivitys.syntymaaika  = admin.firestore.Timestamp.fromDate(new Date(Date.UTC(yy, mm - 1, dd)));
        paivitys.syntymaVuosi = yy;
      }
    }

    // sukupuoli — normalisoi P/T → M/N (§7 #12). Kirjoitetaan vain jos tunnistettu arvo.
    if (sukupuoli) {
      const sp = String(sukupuoli).trim().toUpperCase();
      const norm = (sp === 'P' || sp === 'M') ? 'M' : (sp === 'T' || sp === 'N') ? 'N' : null;
      if (norm) paivitys.sukupuoli = norm;
    }

    // suostumukset — array kaikista hyväksytyistä suostumuksista + täysi suostumus-objekti
    // (sama rakenne kuin uusi-rekisteröinti-haaran .set(), §14: raakadata talteen).
    if (Array.isArray(suostumukset)) paivitys.suostumukset = suostumukset;
    paivitys.suostumus = {
      annettu:     TS,
      antaja:      antaja ? String(antaja) : null,
      antajaRooli: antajaRooli || null,
      versio:      '2026-v1',
      hyvaksytyt:  (suostumusMap && typeof suostumusMap === 'object') ? suostumusMap : null,
      aikaleima:   aikaleima || null,
    };

    // PIN — 4-numeroinen, uniikki seurassa (sama logiikka kuin Seura.html luoPelaajaPIN +
    // duplikaattitarkistus). Idempotentti: älä vaihda jos pelaajalla on jo validi PIN.
    let pin = (snap.get('pin') && /^\d{4}$/.test(String(snap.get('pin')))) ? String(snap.get('pin')) : null;
    if (!pin) {
      const pelaajatCol = db.collection('seurat').doc(seuraId).collection('pelaajat');
      for (let yritys = 0; yritys < 20 && !pin; yritys++) {
        const ehdokas = String(Math.floor(1000 + Math.random() * 9000));
        const kaytossa = await pelaajatCol.where('pin', '==', ehdokas).limit(1).get();
        if (kaytossa.empty || kaytossa.docs[0].id === pelaajaId) pin = ehdokas;
      }
      if (pin) paivitys.pin = pin;
    }

    try {
      await pelRef.update(paivitys);
    } catch (e) {
      throw new functions.https.HttpsError('internal',
        `Suostumuksen tallennus epäonnistui: ${e.message}`);
    }

    // 3b. Merkitse kutsu hyväksytyksi (best-effort — puuttuva kutsut-doc ei saa kaataa suostumusta)
    if (kutsuId) {
      try {
        await db.collection('seurat').doc(seuraId).collection('kutsut').doc(String(kutsuId))
          .update({ tila: 'hyvaksytty', hyvaksyttyPvm: TS, pelaajaId, muokattu: TS });
      } catch (e) {
        console.warn('[vahvistaSuostumus] kutsut-update epäonnistui:', e.message);
      }
    }

    // 4. + 5. Luo/hae huoltajan Auth-tili ja generoi salasanan asetuslinkki.
    // Suostumus on jo tallennettu — linkin generoinnin epäonnistuminen ei saa
    // hukata sitä, joten linkki palautetaan null:ina virhetilanteessa (graceful).
    //
    // TODO: Kun SendGrid korjattu: siirrä sähköpostilähetys tähän best-effort
    // try/catch -lohkoon, poista QR UI:sta.
    try {
      const etunimi  = snap.get('etunimi')  || '';
      const sukunimi = snap.get('sukunimi') || '';
      await haeOrLuoHuoltajaAuth(hEmailNorm, etunimi, sukunimi);
      const baseUrl = 'https://terokoskela7-cmyk.github.io/talentmaster';
      const continueUrl = `${baseUrl}/TalentMaster_Vanhempi_v2.html` +
        `?pelaajaId=${encodeURIComponent(pelaajaId)}&seuraId=${encodeURIComponent(seuraId)}`;
      const passwordResetLink = await auth.generatePasswordResetLink(hEmailNorm, {
        url: continueUrl,
        handleCodeInApp: false,
      });
      return { ok: true, passwordResetLink, pin };
    } catch (e) {
      console.warn('[vahvistaSuostumus] Reset-linkki epäonnistui:', e.message);
      return { ok: true, passwordResetLink: null, linkkiVirhe: e.message, pin };
    }
  });
// ─────────────────────────────────────────────────────────────────────────────
// TASO-INTEGRAATIO — Palloliiton tulospalvelu
// ─────────────────────────────────────────────────────────────────────────────
const TASO_BASE = 'https://spl.torneopal.fi/taso/rest';
async function tasoHae(endpoint, params, apiKey) {
  const qs  = new URLSearchParams({ api_key: apiKey, ...params }).toString();
  const url = `${TASO_BASE}/${endpoint}?${qs}`;
  return new Promise((resolve, reject) => {
    https.get(url, (res) => {
      let data = '';
      res.on('data', chunk => data += chunk);
      res.on('end', () => {
        try {
          const parsed = JSON.parse(data);
          if (parsed.error) {
            reject(new Error(`TASO API virhe: ${parsed.error}`));
          } else {
            resolve(parsed);
          }
        } catch (e) {
          reject(new Error(`TASO vastaus ei ole JSON: ${data.substring(0, 200)}`));
        }
      });
    }).on('error', reject);
  });
}
function tasoOtteluTapahtumaksi(ottelu, seuraId) {
  const pvm   = ottelu.match_time ? ottelu.match_time.substring(0, 10) : null;
  const kello = ottelu.match_time ? ottelu.match_time.substring(11, 16) : null;
  const koti  = ottelu.home_team_name || '';
  const vieras = ottelu.away_team_name || '';
  const tulos = (ottelu.home_goals != null && ottelu.away_goals != null)
    ? `${ottelu.home_goals}–${ottelu.away_goals}` : null;
  const tanaan = new Date().toISOString().substring(0, 10);
  return {
    tyyppi:         'ottelu',
    lahde:          'taso',
    taso_ottelu_id: String(ottelu.match_id),
    nimi:           `${koti} – ${vieras}`,
    pvm, aika: kello,
    kotiJoukkue: koti, vierasJoukkue: vieras,
    kentta: ottelu.venue_name || null,
    sarja:  ottelu.category_name || null,
    tulos,
    tila: tulos ? 'valmis' : (pvm && pvm < tanaan) ? 'pelattu' : 'suunniteltu',
    seuraId,
    paivitetty: admin.firestore.FieldValue.serverTimestamp(),
  };
}
async function paivitaSeuranOttelut(seuraId, apiKey, clubId) {
  console.log(`[TASO] Seura: ${seuraId}, club_id: ${clubId}`);
  const nyt   = new Date();
  const vuosi = nyt.getFullYear();
  const kausi = nyt.getMonth() < 7 ? `${vuosi-1}-${vuosi}` : `${vuosi}-${vuosi+1}`;
  let ottelut = [];
  try {
    const klubiData = await tasoHae('getClub', { club_id: clubId, season_id: kausi }, apiKey);
    const joukkueet = klubiData.teams || [];
    for (const joukkue of joukkueet) {
      try {
        const matchData = await tasoHae('getMatches', {
          team_id: joukkue.team_id, season_id: kausi,
        }, apiKey);
        ottelut = ottelut.concat((matchData.matches || []).map(o => ({
          ...o, _joukkueNimi: joukkue.team_name || joukkue.name,
        })));
        await new Promise(r => setTimeout(r, 150));
      } catch (e) {
        console.warn(`[TASO] Joukkue ${joukkue.team_id} epäonnistui:`, e.message);
      }
    }
  } catch (e) {
    console.warn('[TASO] getClub epäonnistui, fallback:', e.message);
    const matchData = await tasoHae('getMatches', { club_id: clubId, season_id: kausi }, apiKey);
    ottelut = matchData.matches || [];
  }
  if (ottelut.length === 0) return 0;
  const tapahtumatRef = db.collection('seurat').doc(seuraId).collection('tapahtumat');
  for (let i = 0; i < ottelut.length; i += 400) {
    const batch = db.batch();
    for (const ottelu of ottelut.slice(i, i+400)) {
      batch.set(tapahtumatRef.doc(`taso_${ottelu.match_id}`),
        tasoOtteluTapahtumaksi(ottelu, seuraId), { merge: true });
    }
    await batch.commit();
  }
  await db.collection('seurat').doc(seuraId).update({
    taso_viimeisin_haku: admin.firestore.FieldValue.serverTimestamp(),
    taso_ottelut_lkm: ottelut.length,
  });
  return ottelut.length;
}
// tasoHaeMaatcheck — VÄLIAIKAISESTI POISTETTU KÄYTÖSTÄ
// Vaatii cloudscheduler.jobs.update -oikeuden Service Accountille.
// Lisää IAM-konsolissa: Cloud Scheduler Admin -rooli SA:lle.
// Käytä manuaalisesti: tasoHaeSeuranOttelut (HTTP callable VP:n kautta)
/*
exports.tasoHaeMaatcheck = functions
  .region('europe-west1')
  .pubsub.schedule('0 6 * * *')
  .timeZone('Europe/Helsinki')
  .onRun(async () => {
    const seuratSnap = await db.collection('seurat').where('taso_api_key', '!=', '').get();
    if (seuratSnap.empty) return null;
    for (const doc of seuratSnap.docs) {
      const d = doc.data();
      if (!d.taso_api_key || !d.taso_club_id) continue;
      try {
        await paivitaSeuranOttelut(doc.id, d.taso_api_key, d.taso_club_id);
      } catch (e) {
        console.error(`[TASO] Virhe ${doc.id}:`, e.message);
      }
    }
    return null;
  });
*/
exports.tasoHaeSeuranOttelut = functions
  .region('europe-west1')
  .https.onCall(async (data, context) => {
    if (!context.auth) {
      throw new functions.https.HttpsError('unauthenticated', 'Kirjautuminen vaaditaan.');
    }
    const { seuraId } = data;
    if (!seuraId) throw new functions.https.HttpsError('invalid-argument', 'seuraId puuttuu.');
    const oikeus = await tarkistaOikeus(context.auth.uid, seuraId);
    if (!oikeus.sallittu) {
      throw new functions.https.HttpsError('permission-denied', 'Ei oikeuksia tähän seuraan.');
    }
    const seuraDoc  = await db.collection('seurat').doc(seuraId).get();
    const seuraData = seuraDoc.data() || {};
    if (!seuraData.taso_api_key || !seuraData.taso_club_id) {
      throw new functions.https.HttpsError('failed-precondition',
        'TASO API-avain tai Club ID puuttuu. Aseta ne Seura-asetuksissa.');
    }
    const lkm = await paivitaSeuranOttelut(seuraId, seuraData.taso_api_key, seuraData.taso_club_id);
    return { ok: true, ottelut: lkm, seuraId };
  });
// ============================================================
// AI PROXY — TalentMaster Provider-Agnostic AI Gateway
// ============================================================
// LIITÄ TÄMÄ functions/index.js:n LOPPUUN olemassaolevien
// exports-funktioiden perään. Ei korvaa mitään olemassaolevaa.
//
// Tarvitaan:
//   firebase functions:secrets:set ANTHROPIC_API_KEY
//   firebase functions:secrets:set OPENAI_API_KEY      (myöhemmin)
//   firebase functions:secrets:set GEMINI_API_KEY       (myöhemmin)
//
// Deploy:
//   firebase deploy --only functions:aiProxy
// ============================================================

// ----------------------------------------------------------
// PROVIDER-REITITYS
// Jokainen tehtävätyyppi on sidottu tiettyyn provideriin.
// Vaihto tapahtuu tässä tiedostossa — frontend ei muutu.
// ----------------------------------------------------------
const PROVIDER_MAP = {
  player_narrative:  'anthropic',
  coach_insight:     'anthropic',
  game_vision:       'openai',
  voice_transcribe:  'openai',
  flei_diagnosis:    'anthropic',
  streak_nudge:      'gemini',
  parent_summary:    'anthropic',
  drill_suggest:     'gemini',
  return_welcome:    'anthropic',
  weekly_story:      'anthropic',
};

// ----------------------------------------------------------
// SYSTEM PROMPTS
// Kirjoitettu monikielisiksi — TalentMaster laajenee Pohjoismaihin
// ja Eurooppaan. Tuetut kielet: fi, sv, en, no, da, de, fr, nl, pl, es
// ----------------------------------------------------------
const AI_SYSTEM_PROMPTS = {

  default: `Olet TalentMasterin AI-avustaja. Vastaat aina lyhyesti,
kannustavasti ja käyttäjän kielellä. Et koskaan mainitse
AI-providerin nimeä tai teknologiaa. Käytät kieltä: {{language}}.`,

  player_narrative: `Olet urheilijan kehityskumppani. Kirjoitat lyhyitä,
henkilökohtaisia narratiiveja jotka peilaavat pelaajan omia tekoja takaisin
hänelle. Et koskaan arvioi heikkouksia suoraan. Et vertaa muihin pelaajiin.
Käytät aina pelaajan omaa kieltä (fi/sv/en/no/da/de/fr/nl/pl/es).
Maksimipituus: 5 lausetta.`,

  weekly_story: `Olet tarinankertoija joka muuttaa urheilutilastot inhimillisiksi
tarinoiksi. Viikkonarratiivi on aina positiivinen tai neutraali — ei koskaan
syyllistävä. Rakenne: 1) viikon paras hetki, 2) rytmin kuvaus,
3) eteenpäin katsova lause. Käytät pelaajan kieltä. Maksimi 5 lausetta.`,

  return_welcome: `Olet lempeä paluun vastaanottaja. Pelaaja palaa tauolta —
et koskaan mainitse poissaoloaikaa negatiivisesti tai kysy miksi hän oli poissa.
Fokus on aina nykyhetkessä ja tulevassa. Viittaat viimeiseen kirjaukseen
positiivisesti. Maksimi 3 lausetta. Käytät pelaajan kieltä (fi/sv/en/no/da/de).`,

  flei_diagnosis: `Olet FLEI-metodologian asiantuntija (5 ketjua: SBL/SFL/LL/DIAG/DFL).
Analysoit ketjujen tasapainon ja tunnistat heikoimmman ketjun S-training kohteeksi.
Et koskaan esitä heikkoa ketjua rangaistuksena — se on seuraavan luvun alku.
Vastaus on aina rakentava ja suuntaa eteenpäin. Käytät pelaajan kieltä.`,

  streak_nudge: `Olet micro-copy-kirjoittaja joka tuottaa lyhyitä,
energisiä kannustusviestejä. Viesti on maksimissaan 12 sanaa.
Et koskaan käytä sanoja 'muista', 'sinun täytyy' tai 'putkesi katkesi'.
Käytät pelaajan kieltä (fi/sv/en/no/da/de/fr/nl/pl/es).`,

  parent_summary: `Olet vanhemmalle kirjoittava viestijä. Käytät lämmintä,
positiivista kieltä. Kerrot lapsen viikon tarinan — et tilastoja.
Rakenne: 1) mitä lapsi teki, 2) yksi positiivinen havainto,
3) lyhyt eteenpäin katsova lause. Maksimi 4 lausetta.
GDPR-tietoinen: et paljasta muiden pelaajien tietoja.
Käytät vanhemman kieltä (fi/sv/en/no/da/de/fr/nl/pl/es).`,

  coach_insight: `Olet pedagoginen analyytikko joka tukee valmentajan työtä.
Analysoit joukkueen kollektiivista tilaa — et yksittäistä pelaajaa.
Nostat esiin ryhmätason kehityskohteita rakentavasti.
Et koskaan nimeä yksittäistä pelaajaa heikkona.
Käytät valmentajan kieltä (fi/sv/en/no/da/de/fr/nl/pl/es).`,

  drill_suggest: `Olet harjoitesuunnittelija joka tuntee FLEI-metodologian
ja ikäryhmäkohtaisen pedagogiikan. Ehdotat aina 3 harjoitetta jotka
kohdistuvat heikoimman ketjun vahvistamiseen. Harjoitteet ovat
konkreettisia, ajallisesti rajattuja ja ikäryhmälle sopivia.
Et selitä miksi ketju on heikko — vain miten sitä vahvistetaan.
Käytät valmentajan kieltä (fi/sv/en/no/da/de/fr/nl/pl/es).`,

  game_vision: `Olet pelivision analyytikko joka tunnistaa pelaajan liikkeen,
asemoinnin ja teknisen suorituksen videoframesta tai kuvasta.
Palautteesi on aina rakentava ja konkreettinen. Maksimi 4 lausetta.
Käytät pelaajan kieltä (fi/sv/en/no/da/de/fr/nl/pl/es).`,
};

// ----------------------------------------------------------
// TUETUT KIELET — pohjoismaiseen ja eurooppalaiseen laajentumiseen
// ----------------------------------------------------------
const SUPPORTED_LANGUAGES = new Set(['fi','sv','en','no','da','de','fr','nl','pl','es']);

function _validateLanguage(lang) {
  return SUPPORTED_LANGUAGES.has(lang) ? lang : 'fi';
}

// ----------------------------------------------------------
// PROVIDER-KONFIGURAATIOT
// API-avaimet tulevat Firebase Secrets Managerista — ei koskaan koodissa.
// Aseta: firebase functions:secrets:set ANTHROPIC_API_KEY
// ----------------------------------------------------------
function _buildProviderConfig(providerName, task, data) {

  // Hae system prompt ja korvaa kieliholdit
  const lang = _validateLanguage(data.language || 'fi');
  const systemPrompt = (AI_SYSTEM_PROMPTS[task] || AI_SYSTEM_PROMPTS.default)
    .replace('{{language}}', lang);

  if (providerName === 'anthropic') {
    return {
      url: 'https://api.anthropic.com/v1/messages',
      headers: {
        'Content-Type':       'application/json',
        'x-api-key':          process.env.ANTHROPIC_API_KEY,
        'anthropic-version':  '2023-06-01'
      },
      body: {
        // claude-sonnet-4-5: kustannustehokas, riittävä narratiiveille
        // Älä vaihda claude-opus:een ilman budjettihyväksyntää
        model:      'claude-sonnet-4-5',
        max_tokens: 1024,
        system:     systemPrompt,
        messages:   [{ role: 'user', content: JSON.stringify(data) }]
      },
      extractText: (res) => (res.content && res.content[0] && res.content[0].text) || ''
    };
  }

  if (providerName === 'openai') {
    // Whisper-transkriptio käsitellään erikseen (_handleWhisper)
    return {
      url: 'https://api.openai.com/v1/chat/completions',
      headers: {
        'Content-Type':  'application/json',
        'Authorization': 'Bearer ' + process.env.OPENAI_API_KEY
      },
      body: {
        model:      task === 'game_vision' ? 'gpt-4o' : 'gpt-4o-mini',
        max_tokens: 1024,
        messages: [
          { role: 'system', content: systemPrompt },
          { role: 'user',   content: task === 'game_vision'
            ? [
                { type: 'image_url', image_url: { url: 'data:image/jpeg;base64,' + data.image } },
                { type: 'text',      text:       JSON.stringify({ position: data.playerPosition, drill: data.drillType }) }
              ]
            : JSON.stringify(data)
          }
        ]
      },
      extractText: (res) => (res.choices && res.choices[0] && res.choices[0].message && res.choices[0].message.content) || ''
    };
  }

  if (providerName === 'gemini') {
    return {
      url: 'https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent?key=' + process.env.GEMINI_API_KEY,
      headers: { 'Content-Type': 'application/json' },
      body: {
        contents: [{ parts: [
          { text: systemPrompt },
          { text: JSON.stringify(data) }
        ]}],
        generationConfig: { maxOutputTokens: 1024, temperature: 0.7 }
      },
      extractText: (res) => {
        try { return res.candidates[0].content.parts[0].text || ''; }
        catch(e) { return ''; }
      }
    };
  }

  throw new Error('Tuntematon provider: ' + providerName);
}

// ----------------------------------------------------------
// WHISPER-TRANSKRIPTIO — erillinen käsittely multipart/form-data
// ----------------------------------------------------------
async function _handleWhisper(data) {
  const nodeFetch = require('node-fetch');
  const FormData  = require('form-data');
  const lang = _validateLanguage(data.language);

  const audioBuffer = Buffer.from(data.audio, 'base64');
  const form = new FormData();
  form.append('file',            audioBuffer, { filename: 'audio.webm', contentType: data.mimeType || 'audio/webm' });
  form.append('model',           'whisper-1');
  form.append('language',        lang);
  form.append('response_format', 'text');

  const res = await nodeFetch('https://api.openai.com/v1/audio/transcriptions', {
    method:  'POST',
    headers: { 'Authorization': 'Bearer ' + process.env.OPENAI_API_KEY, ...form.getHeaders() },
    body:    form
  });

  if (!res.ok) throw new Error('Whisper virhe: ' + await res.text());
  return { text: await res.text(), language: lang };
}

// ----------------------------------------------------------
// RATE LIMITING — per UID, Firestore-pohjainen
// Estää väärinkäytön ilman kolmannen osapuolen palvelua.
// 20 kutsua / minuutti / käyttäjä — riittää kaikille realistisille käyttötapauksille.
// ----------------------------------------------------------
async function _checkRateLimit(uid, task) {
  const db        = admin.firestore();
  const windowMs  = 60000; // 1 minuutti
  const maxCalls  = 20;
  const ref       = db.collection('_rateLimits').doc(uid + '_' + task);

  return db.runTransaction(async (tx) => {
    const doc = await tx.get(ref);
    const now = Date.now();

    if (!doc.exists) {
      tx.set(ref, { count: 1, windowStart: now, uid, task });
      return true;
    }

    const { count, windowStart } = doc.data();

    if (now - windowStart > windowMs) {
      // Ikkuna vanhentunut — nollaa laskuri
      tx.update(ref, { count: 1, windowStart: now });
      return true;
    }

    if (count >= maxCalls) throw new Error('RATE_LIMIT_EXCEEDED');
    tx.update(ref, { count: count + 1 });
    return true;
  });
}

// ----------------------------------------------------------
// AUDIT LOG — GDPR-compliant minimaalinen loki
// Ei tallenneta: promptin sisältöä, API-vastauksen tekstiä
// ----------------------------------------------------------
async function _auditLog(uid, task, provider, durationMs, success) {
  try {
    await admin.firestore().collection('_aiAudit').add({
      uid, task, provider, durationMs, success,
      ts: admin.firestore.FieldValue.serverTimestamp()
    });
  } catch (e) {
    // Auditointi ei saa kaataa pääkutsua
    console.warn('[aiProxy] auditLog epäonnistui:', e.message);
  }
}

// ----------------------------------------------------------
// PÄÄFUNKTIO — Cloud Function HTTP endpoint
// region: europe-west1 (kaikki TM-funktiot samalla alueella)
// ----------------------------------------------------------
exports.aiProxy = functions
  .region('europe-west1')
  .runWith({
    timeoutSeconds: 30,
    memory:         '256MB',
    // Firebase Secrets Manager — API-avaimet turvallisesti
    // Vaatii: firebase functions:secrets:set ANTHROPIC_API_KEY
    // ANTHROPIC_API_KEY luetaan process.env:stä .env-tiedoston kautta (kuten SENDGRID).
    // secrets-lista poistettu — Firebase CLI:n sisäinen validointi vaati oikeuksia
    // jotka eivät ole käytettävissä GitHub Actions -ympäristössä.
  })
  .https.onRequest(async (req, res) => {

    // --------------------------------------------------
    // CORS — sallitaan vain TalentMaster-domainit
    // GitHub Pages on lisätty kehitysvaihetta varten.
    // Poista terokoskela7-cmyk.github.io ennen tuotantolaajennusta.
    // --------------------------------------------------
    const allowedOrigins = [
      // Kehitys
      'https://terokoskela7-cmyk.github.io', // GitHub Pages — nykyinen frontend
      'http://localhost:3000',
      'http://localhost:5000',               // Firebase emulator
      // Tuotanto — Suomi
      'https://talentmaster.fi',
      'https://app.talentmaster.fi',
      // Pohjoismainen laajennus
      'https://talentmaster.se',             // Ruotsi
      'https://talentmaster.no',             // Norja
      'https://talentmaster.dk',             // Tanska
      // Eurooppalainen laajennus
      'https://talentmaster.de',             // Saksa
      'https://talentmaster.eu',             // EU-fallback
    ];

    const origin = req.headers.origin;
    if (allowedOrigins.includes(origin)) {
      res.set('Access-Control-Allow-Origin',  origin);
    }
    res.set('Access-Control-Allow-Methods',  'POST, OPTIONS');
    res.set('Access-Control-Allow-Headers',  'Content-Type, Authorization, X-TM-Version, X-TM-UID');

    if (req.method === 'OPTIONS') { res.status(204).send(''); return; }
    if (req.method !== 'POST')    { res.status(405).json({ code: 'METHOD_NOT_ALLOWED' }); return; }

    const startTime   = Date.now();
    let uid           = null;
    let providerName  = null;

    try {
      // --------------------------------------------------
      // 1. AUTENTIKAATIO — Firebase ID-token pakollinen
      // --------------------------------------------------
      const authHeader = req.headers.authorization || '';
      if (!authHeader.startsWith('Bearer ')) {
        res.status(401).json({ code: 'UNAUTHORIZED', message: 'Bearer-token puuttuu' });
        return;
      }

      const token    = authHeader.slice(7);
      const decoded  = await admin.auth().verifyIdToken(token);
      uid            = decoded.uid;

      // --------------------------------------------------
      // 2. PAYLOAD-VALIDOINTI
      // --------------------------------------------------
      const { task, data } = req.body;

      if (!task || typeof task !== 'string') {
        res.status(400).json({ code: 'INVALID_TASK', message: 'task puuttuu' });
        return;
      }

      providerName = PROVIDER_MAP[task];
      if (!providerName) {
        res.status(400).json({ code: 'UNKNOWN_TASK', message: 'Tuntematon tehtävätyyppi: ' + task });
        return;
      }

      // --------------------------------------------------
      // 3. RATE LIMITING
      // --------------------------------------------------
      await _checkRateLimit(uid, task);

      // --------------------------------------------------
      // 4. AI-KUTSU — whisper erikoistapaus
      // --------------------------------------------------
      let aiResult;

      if (task === 'voice_transcribe') {
        aiResult = await _handleWhisper(data);
      }

  // ═══════════════════════════════════════════════════════════════════════
  // ADAR VISION NARRATIIVI — GPT-4o Vision analysoi havaintokuvan
  // Periaate: AI kirjoittaa narratiivin, ei pisteytä. Ihminen hyväksyy.
  // Input:  { tyyppi, kuva: {base64, mime}, konteksti, ohje }
  // Output: { narratiivi }
  // ═══════════════════════════════════════════════════════════════════════
  if (task === 'adar_vision_narratiivi') {
    const kuva      = body.kuva;
    const konteksti = (body.konteksti || '').slice(0, 800);
    const ohje      = (body.ohje      || '').slice(0, 600);

    if (!kuva || !kuva.base64 || !kuva.mime) {
      return res.status(400).json({ code: 'MISSING_IMAGE', message: 'kuva.base64 ja kuva.mime vaaditaan' });
    }

    const sallitutMimet = ['image/jpeg','image/jpg','image/png','image/webp'];
    if (!sallitutMimet.includes(kuva.mime)) {
      return res.status(400).json({ code: 'INVALID_MIME', message: 'Sallitut tyypit: jpeg/jpg/png/webp' });
    }

    // Jos OPENAI_API_KEY puuttuu — graceful fallback, ei kaada tallennusta
    const openaiKey = process.env.OPENAI_API_KEY;
    if (!openaiKey) {
      console.warn('[ADAR Vision] OPENAI_API_KEY puuttuu — palautetaan tyhjä narratiivi');
      return res.status(200).json({ narratiivi: '', huomio: 'AI-avain puuttuu' });
    }

    // System-prompt: ohjaa AI:n kirjoittamaan havaintonarratiivi, ei arvosanoja
    const systemPrompt = [
      'Olet jalkapallovalmentajan kenttaapuri TalentMaster-alustassa.',
      'Tehtavasi: analysoi valmentajan lahettama kuva ja kirjoita lyhyt (2-3 lausetta)',
      'havaintonarratiiivi suomeksi valmentajan aanella.',
      'ALA anna numeroarvosanoja tai pisteytyksia — kirjoita havaintona, ei arviona.',
      'ALA tee diagnooseja yhdesta kuvasta.',
      'KERRO rehellisesti jos kuvasta ei voi tehda ADAR-arviota.',
      'Narratiivi menee valmentajalle ensin — pelaaja ei nae sita ennen hyvaksynta.'
    ].join(' ');

    const userPrompt = (ohje || 'Analysoi kuva ja kirjoita lyhyt havaintonarratiiivi.') +
                       (konteksti ? ' KONTEKSTI: ' + konteksti : '');

    try {
      const openaiResp = await fetch('https://api.openai.com/v1/chat/completions', {
        method:  'POST',
        headers: { 'Authorization': 'Bearer ' + openaiKey, 'Content-Type': 'application/json' },
        body: JSON.stringify({
          model:       'gpt-4o',   // gpt-4o tukee vision-pyyntoja
          max_tokens:  300,         // ~3 lausetta riittaa
          temperature: 0.4,         // matala = johdonmukaisempi tulos
          messages: [
            { role: 'system', content: systemPrompt },
            { role: 'user', content: [
              // Kuva base64-muodossa — GPT-4o Vision API-muoto
              { type: 'image_url', image_url: {
                  url:    'data:' + kuva.mime + ';base64,' + kuva.base64,
                  detail: 'low'   // 'low' = 85 tokenia/kuva, riittaa havaintoanalyysiin
              }},
              { type: 'text', text: userPrompt }
            ]}
          ]
        })
      });

      if (!openaiResp.ok) {
        const err = await openaiResp.text();
        console.error('[ADAR Vision] OpenAI virhe:', openaiResp.status, err.slice(0, 200));
        return res.status(200).json({ narratiivi: '', huomio: 'AI-palvelu ei tavoitettavissa' });
      }

      const data       = await openaiResp.json();
      const narratiivi = data.choices?.[0]?.message?.content?.trim() || '';
      const tokenit    = data.usage?.total_tokens || 0;
      console.log('[ADAR Vision] OK — ' + tokenit + ' tok, ' + narratiivi.length + ' merkk');

      return res.status(200).json({ narratiivi });

    } catch (e) {
      console.error('[ADAR Vision] Catch:', e.message);
      return res.status(200).json({ narratiivi: '', huomio: 'AI-yhteys epaonnistui' });
    }
  }
 else {
        const nodeFetch = require('node-fetch');
        const cfg       = _buildProviderConfig(providerName, task, data);
        const aiRes     = await nodeFetch(cfg.url, {
          method:  'POST',
          headers: cfg.headers,
          body:    JSON.stringify(cfg.body)
        });

        if (!aiRes.ok) {
          const errBody = await aiRes.text();
          console.error('[aiProxy] Provider error:', aiRes.status, errBody);
          throw new Error('Provider virhe ' + aiRes.status);
        }

        const aiJson = await aiRes.json();
        const text   = cfg.extractText(aiJson);

        if (!text) throw new Error('Provider palautti tyhjän vastauksen');

        aiResult = { text };
      }

      // --------------------------------------------------
      // 5. AUDIT LOG + VASTAUS
      // --------------------------------------------------
      const durationMs = Date.now() - startTime;
      await _auditLog(uid, task, providerName, durationMs, true);

      res.status(200).json({
        ...aiResult,
        _meta: { task, provider: providerName, durationMs }
        // Huom: provider palautetaan vain meta-kentässä kehitystyötä varten.
        // UI ei koskaan näytä tätä käyttäjälle.
      });

    } catch (err) {
      const durationMs = Date.now() - startTime;

      if (uid) await _auditLog(uid, req.body && req.body.task, providerName, durationMs, false);

      console.error('[aiProxy] Virhe:', err.message);

      if (err.message === 'RATE_LIMIT_EXCEEDED') {
        res.status(429).json({ code: 'RATE_LIMIT_EXCEEDED', message: 'Liian monta kutsua — odota hetki' });
        return;
      }

      res.status(500).json({
        code:    'AI_ERROR',
        message: 'Palvelu ei ole juuri nyt käytettävissä'
        // Ei paljasteta teknistä virheviestiä käyttäjälle
      });
    }
  });
