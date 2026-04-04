/**
 * TalentMaster™ — Firebase Cloud Functions
 * functions/index.js
 *
 * Päivitetty: 2026-04-02
 * Sähköpostiratkaisu: SendGrid HTTP API (ei Nodemailer, ei SMTP)
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
    try {
      const olemassa = await auth.getUserByEmail(email);
      if (olemassa) throw new functions.https.HttpsError('already-exists',
        `${email} on jo käytössä.`);
    } catch (e) {
      if (e.code === 'already-exists') throw e;
      if (e.errorInfo && e.errorInfo.code !== 'auth/user-not-found') throw e;
    }
    const valiaikainenSalasana = 'TM_' + Math.random().toString(36).slice(2, 10).toUpperCase();
    let uusiKayttaja;
    try {
      uusiKayttaja = await auth.createUser({
        email, password: valiaikainenSalasana,
        displayName: etunimi && sukunimi ? `${etunimi} ${sukunimi}` : (etunimi || email),
        emailVerified: false, disabled: false,
      });
    } catch (e) {
      throw new functions.https.HttpsError('internal', `Auth-luonti epäonnistui: ${e.message}`);
    }
    const uid = uusiKayttaja.uid;
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
      await auth.deleteUser(uid).catch(() => {});
      throw new functions.https.HttpsError('internal', `Firestore-kirjoitus epäonnistui: ${e.message}`);
    }let resetLinkki = null;
try {
  // Ohjataan oikeaan näkymään roolin mukaan salasanan asetuksen jälkeen
  const roolitusUrl = {
    valmentaja:           'TalentMaster_Master_v7.html',
    talenttivalmentaja:   'TalentMaster_Master_v7.html',
    fysiikkavalmentaja:   'TalentMaster_Master_v7.html',
    fysioterapeutti:      'TalentMaster_Master_v7.html',
    testivastaava:        'TalentMaster_Master_v7.html',
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
  await lahetaSahkoposti({
    to: email,
    subject: 'TalentMaster™ — Tervetuloa! Aseta salasanasi',
    fromName: 'TalentMaster™',
    html: pohjaSalasanaAsetus({ etunimi, rooli, resetLinkki }),
  });
} catch (e) {
  console.warn('[luoKayttaja] Salasanasähköposti epäonnistui:', e.message);
}
      await lahetaSahkoposti({
        to: email,
        subject: 'TalentMaster™ — Tervetuloa! Aseta salasanasi',
        fromName: 'TalentMaster™',
        html: pohjaSalasanaAsetus({ etunimi, rooli, resetLinkki }),
      });
    } catch (e) {
      console.warn('[luoKayttaja] Salasanasähköposti epäonnistui:', e.message);
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
    const pelaajaLinkki = `${baseUrl}/TalentMaster_Pelaaja_v1.html` +
      `?pelaajaId=${pelaajaId}&seuraId=${seuraId}` +
      `&etunimi=${encodeURIComponent(etunimi||'')}&sukunimi=${encodeURIComponent(sukunimi||'')}`;
    const vanhempiLinkki = `${baseUrl}/TalentMaster_Vanhempi.html` +
      `?pelaajaId=${pelaajaId}&seuraId=${seuraId}` +
      `&etunimi=${encodeURIComponent(etunimi||'')}&sukunimi=${encodeURIComponent(sukunimi||'')}`;
    let salasanaLinkki = null;
    try {
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
// TASO-INTEGRAATIO — Palloliiton tulospalvelu
//
// Kaksi funktiota:
//   tasoHaeMaatcheck      — Cron joka päivä klo 06:00, kaikki seurat joilla avain
//   tasoHaeSeuranOttelut  — HTTP callable, VP triggeröi heti Seura.html:stä
//
// Setup per seura (kerran):
//   1. VP kirjautuu taso.palloliitto.fi pääkäyttäjänä
//   2. Valikko → Rajapinta → hyväksy käyttöehdot → kopioi avain
//   3. VP tallentaa avaimen + club_id:n Seura.html:n asetuksissa
//   4. Ottelut päivittyvät automaattisesti joka päivä
//
// Firestore:
//   seurat/{id}/taso_api_key   — salainen avain
//   seurat/{id}/taso_club_id   — Palloliiton seura-numero (esim. "2970")
//   seurat/{id}/tapahtumat/taso_{match_id}  — ottelut (lahde: "taso")
// ─────────────────────────────────────────────────────────────────────────────

const TASO_BASE = 'https://spl.torneopal.fi/taso/rest';

/**
 * Hakee JSON-datan TASO REST-rajapinnasta
 */
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

/**
 * Muuntaa TASO-ottelun TalentMaster-tapahtumaksi
 * Käyttää taso_{match_id}:tä dokumentti-ID:nä → upsert toimii
 */
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
    pvm,
    aika:           kello,
    kotiJoukkue:    koti,
    vierasJoukkue:  vieras,
    kentta:         ottelu.venue_name || null,
    sarja:          ottelu.category_name || null,
    tulos,
    tila: tulos ? 'valmis'
        : (pvm && pvm < tanaan) ? 'pelattu'
        : 'suunniteltu',
    seuraId,
    paivitetty: admin.firestore.FieldValue.serverTimestamp(),
  };
}

/**
 * Hakee ja tallentaa yhden seuran kaikki ottelut TASO:sta Firestoreen
 * Palauttaa tallennettujen otteluiden lukumäärän
 */
async function paivitaSeuranOttelut(seuraId, apiKey, clubId) {
  console.log(`[TASO] Seura: ${seuraId}, club_id: ${clubId}`);

  const nyt    = new Date();
  const vuosi  = nyt.getFullYear();
  const kausi  = nyt.getMonth() < 7
    ? `${vuosi - 1}-${vuosi}`
    : `${vuosi}-${vuosi + 1}`;

  let ottelut = [];

  try {
    // Hae seuran joukkueet
    const klubiData = await tasoHae('getClub', { club_id: clubId, season_id: kausi }, apiKey);
    const joukkueet = klubiData.teams || [];
    console.log(`[TASO] ${joukkueet.length} joukkuetta`);

    for (const joukkue of joukkueet) {
      try {
        const matchData = await tasoHae('getMatches', {
          team_id: joukkue.team_id,
          season_id: kausi,
        }, apiKey);
        const jOttelut = (matchData.matches || []).map(o => ({
          ...o,
          _joukkueNimi: joukkue.team_name || joukkue.name,
        }));
        ottelut = ottelut.concat(jOttelut);
        console.log(`[TASO] ${joukkue.team_name}: ${jOttelut.length} ottelua`);
        // Pieni viive ettei ylikuormiteta APIa
        await new Promise(r => setTimeout(r, 150));
      } catch (e) {
        console.warn(`[TASO] Joukkue ${joukkue.team_id} epäonnistui:`, e.message);
      }
    }
  } catch (e) {
    // Fallback: hae suoraan club_id:llä
    console.warn('[TASO] getClub epäonnistui, fallback club_id:llä:', e.message);
    const matchData = await tasoHae('getMatches', { club_id: clubId, season_id: kausi }, apiKey);
    ottelut = matchData.matches || [];
  }

  if (ottelut.length === 0) {
    console.log(`[TASO] Ei otteluja seuralle ${seuraId}`);
    return 0;
  }

  // Batch upsert Firestoreen — max 500 per batch
  const tapahtumatRef = db.collection('seurat').doc(seuraId).collection('tapahtumat');
  const BATCH_KOKO = 400;

  for (let i = 0; i < ottelut.length; i += BATCH_KOKO) {
    const erä   = ottelut.slice(i, i + BATCH_KOKO);
    const batch = db.batch();
    for (const ottelu of erä) {
      const docId  = `taso_${ottelu.match_id}`;
      const docRef = tapahtumatRef.doc(docId);
      batch.set(docRef, tasoOtteluTapahtumaksi(ottelu, seuraId), { merge: true });
    }
    await batch.commit();
  }

  // Päivitä viimeisin haku -tieto seuradokumenttiin
  await db.collection('seurat').doc(seuraId).update({
    taso_viimeisin_haku: admin.firestore.FieldValue.serverTimestamp(),
    taso_ottelut_lkm:   ottelut.length,
  });

  console.log(`[TASO] Tallennettu ${ottelut.length} ottelua seuralle ${seuraId}`);
  return ottelut.length;
}

/**
 * tasoHaeMaatcheck
 * Cron: joka päivä klo 06:00 Suomen aikaa
 * Hakee ottelut kaikille seuroille joilla on taso_api_key
 */
exports.tasoHaeMaatcheck = functions
  .region('europe-west1')
  .pubsub.schedule('0 6 * * *')
  .timeZone('Europe/Helsinki')
  .onRun(async () => {
    console.log('[TASO] Päivittäinen haku käynnistyy...');

    const seuratSnap = await db.collection('seurat')
      .where('taso_api_key', '!=', '')
      .get();

    if (seuratSnap.empty) {
      console.log('[TASO] Ei seuroja TASO-avaimella. VP asettaa avaimen Seura.html:ssä.');
      return null;
    }

    const tulokset = [];
    for (const doc of seuratSnap.docs) {
      const d = doc.data();
      if (!d.taso_api_key || !d.taso_club_id) continue;
      try {
        const lkm = await paivitaSeuranOttelut(doc.id, d.taso_api_key, d.taso_club_id);
        tulokset.push({ seura: doc.id, ottelut: lkm, ok: true });
      } catch (e) {
        console.error(`[TASO] Virhe ${doc.id}:`, e.message);
        tulokset.push({ seura: doc.id, virhe: e.message, ok: false });
      }
    }

    console.log('[TASO] Valmis:', JSON.stringify(tulokset));
    return null;
  });

/**
 * tasoHaeSeuranOttelut
 * HTTP callable — VP painaa "Hae ottelut nyt" Seura.html:ssä
 * Vaatii autentikoinnin
 */
exports.tasoHaeSeuranOttelut = functions
  .region('europe-west1')
  .https.onCall(async (data, context) => {
    if (!context.auth) {
      throw new functions.https.HttpsError('unauthenticated', 'Kirjautuminen vaaditaan.');
    }

    const { seuraId } = data;
    if (!seuraId) {
      throw new functions.https.HttpsError('invalid-argument', 'seuraId puuttuu.');
    }

    // Tarkista oikeus — super-admin tai seuran VP/admin
    const oikeus = await tarkistaOikeus(context.auth.uid, seuraId);
    if (!oikeus.sallittu) {
      throw new functions.https.HttpsError('permission-denied', 'Ei oikeuksia tähän seuraan.');
    }

    // Hae TASO-asetukset
    const seuraDoc  = await db.collection('seurat').doc(seuraId).get();
    const seuraData = seuraDoc.data() || {};

    if (!seuraData.taso_api_key || !seuraData.taso_club_id) {
      throw new functions.https.HttpsError(
        'failed-precondition',
        'TASO API-avain tai Club ID puuttuu. Aseta ne Seura-asetuksissa.'
      );
    }

    const lkm = await paivitaSeuranOttelut(seuraId, seuraData.taso_api_key, seuraData.taso_club_id);

    return { ok: true, ottelut: lkm, seuraId };
  });
