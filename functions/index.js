/**
 * TalentMaster™ — Firebase Cloud Functions
 * functions/index.js
 *
 * Päivitetty: 2026-06-04
 * Sähköpostiratkaisu: SendGrid HTTP API (ei Nodemailer, ei SMTP)
 * API-avaimet (SENDGRID_API_KEY/OPENAI_API_KEY/ANTHROPIC_API_KEY): Secret Manager + runWith({secrets}) → process.env (2026-06-23 migraatio).
 * SENDGRID_FROM_EMAIL EI ole salainen → tavallinen env-var (functions/.env, committattu).
 */
// firebase-functions v6 breaking change: 1st-gen API (region/runWith/https.onCall/pubsub.schedule/
// firestore.document) ei ole enää root-exportissa → tuotava /v1:stä. Pidetään 1st-gen (v2-migraatio = oma vaihe).
const functions = require('firebase-functions/v1');
const admin     = require('firebase-admin');
const https     = require('https');
const { kayttajaRooliSallittu } = require('./authz_paatos');   // pure authz-päätös (#71, testattava)
const { keraaPelaajanManifesti, rakennaAuditPayload } = require('./gdpr_locator');   // GDPR RTBF/export -locator (#96)
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
    // VP mukaan: seuralla voi olla useita VP:itä, mutta vp_uid osoittaa vain yhteen (rivi 111).
    // Ilman tätä seuran 2. VP ei saa kutsu-/reset-/muistutusoikeuksia. (Sibbo-bugi 2026-06-29.)
    // Pure päätös (testattava) eristetty → ./authz_paatos (deaktivoitu vp = ei oikeuksia).
    const sallittuRooli = kayttajaRooliSallittu(kayttajaDoc.data());
    if (sallittuRooli) {
      return { sallittu: true, rooli: sallittuRooli };
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
        <h1 style="color:#28B090;margin:0;font-size:22px;">TalentMaster™</h1>
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
        style="background:#28B090;color:#000;padding:14px 32px;
        border-radius:8px;text-decoration:none;font-weight:bold;font-size:16px;
        display:inline-block;">
        Rekisteröidy ja anna suostumus →
      </a>
    </div>
    <p style="font-size:12px;color:#999;text-align:center;">
      Linkki on henkilökohtainen — älkää jakako eteenpäin.
    </p>` + pohjaFooter(seuraNimi);
}
// Lempeä muistutus (nudge) — EI painostava (alaikäiset/GDPR). Reuse pohjaRekisteriKutsu-rakenne.
function pohjaMuistutus({ seuraNimi, pelaajaNimi, linkki }) {
  return pohjaHeader(seuraNimi) + `
    <p style="font-size:16px;color:#333;">Hei,</p>
    <p style="font-size:15px;color:#333;line-height:1.6;">
      <strong>${seuraNimi}</strong> odottaa vielä rekisteröitymistänne
      ${pelaajaNimi ? `(<strong>${pelaajaNimi}</strong>)` : ''} TalentMasteriin.
      Lähetämme linkin uudelleen siltä varalta, että aiempi viesti jäi huomaamatta.
    </p>
    <p style="font-size:15px;color:#333;line-height:1.6;">
      Ei kiirettä — voitte rekisteröityä silloin kun teille sopii.
    </p>
    <div style="text-align:center;margin:32px 0;">
      <a href="${linkki}"
        style="background:#28B090;color:#000;padding:14px 32px;
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
    <div style="background:#f0fdf8;border:2px solid #28B090;border-radius:12px;
                padding:20px;margin:24px 0;">
      <p style="margin:0 0 8px;font-size:15px;font-weight:bold;color:#1a1a1a;">
        ① Aseta ensin salasanasi
      </p>
      <p style="margin:0 0 16px;font-size:14px;color:#444;line-height:1.5;">
        Klikkaa linkkiä ja luo oma salasana. <strong>Linkki vanhenee 1 tunnissa.</strong>
      </p>
      <div style="text-align:center;">
        <a href="${salasanaLinkki}"
          style="background:#28B090;color:#000;padding:14px 32px;
          border-radius:8px;text-decoration:none;font-weight:bold;
          font-size:16px;display:inline-block;">
          Aseta salasana →
        </a>
      </div>
      <p style="margin:12px 0 0;font-size:13px;color:#555;line-height:1.5;">
        Jos linkki ehti vanhentua, ei hätää — käytä Vanhemman sivun "Unohtuiko salasana?" -toimintoa.
      </p>
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
        style="background:#28B090;color:#000;padding:16px 36px;
        border-radius:8px;text-decoration:none;font-weight:bold;
        font-size:16px;display:inline-block;width:280px;">
        👨‍👩‍👦 Vanhemman sivu →
      </a>
      <a href="${pelaajaLinkki}"
        style="background:#1A2235;color:#28B090;padding:14px 36px;
        border:1px solid #28B090;border-radius:8px;text-decoration:none;
        font-weight:bold;font-size:15px;display:inline-block;width:280px;">
        ⚽ Pelaajan oma sivu →
      </a>
    </div>
    <p style="font-size:13px;color:#555;line-height:1.5;margin:4px 0 16px;text-align:center;">
      ⚽ Pelaaja kirjautuu omalla PIN-koodillaan. PIN näkyy Vanhemman sivulla kirjautumisen jälkeen.
    </p>
    <p style="font-size:13px;color:#555;line-height:1.6;margin:20px 0 0;">
      💡 Lisää sivut puhelimen kotinäytölle (selaimen valikosta "Lisää aloitusnäytölle"), niin ne ovat aina tallessa.
      Osoitteen voi aina palauttaa mieleen: <strong>talentmasterid.com</strong>
    </p>` + pohjaFooter(seuraNimi);
}
function pohjaSalasanaAsetus({ etunimi, rooli, resetLinkki }) {
  return `
    <div style="font-family:Arial,sans-serif;max-width:600px;margin:0 auto;padding:20px;">
      <h2 style="color:#28B090;">Tervetuloa TalentMasteriin!</h2>
      <p>Hei ${etunimi || ''},</p>
      <p>Sinut on lisätty järjestelmään roolilla <strong>${rooli}</strong>.</p>
      <p>Aseta oma salasanasi klikkaamalla alla olevaa linkkiä:</p>
      <div style="text-align:center;margin:24px 0;">
        <a href="${resetLinkki}"
          style="background:#28B090;color:#000;padding:12px 28px;
          border-radius:8px;text-decoration:none;font-weight:bold;">
          Aseta salasana →
        </a>
      </div>
      <p style="color:#999;font-size:12px;">Linkki on voimassa 1 tunnin.</p>
    </div>`;
}
// Suostumus-flow: huoltajan salasanalinkki perhepintaan (§16/§7.22 — ei tasoja/lukuja/vertailua).
function pohjaSuostumusLinkki({ lapsiNimi, resetLinkki }) {
  return `
    <div style="font-family:Arial,sans-serif;max-width:600px;margin:0 auto;padding:20px;">
      <h2 style="color:#28B090;">Tervetuloa TalentMasteriin!</h2>
      <p>Hei,</p>
      <p>Kiitos suostumuksesta${lapsiNimi ? ` — ${lapsiNimi} on nyt mukana TalentMasterissa.` : '.'}</p>
      <p>Aseta TalentMaster-salasanasi alla olevasta linkist&auml;:</p>
      <div style="text-align:center;margin:24px 0;">
        <a href="${resetLinkki}"
          style="background:#28B090;color:#000;padding:12px 28px;
          border-radius:8px;text-decoration:none;font-weight:bold;">
          Aseta salasana &rarr;
        </a>
      </div>
      <p style="font-size:14px;color:#333;line-height:1.6;">
        Salasanan asetettuasi p&auml;&auml;set vanhemman n&auml;kym&auml;&auml;n &mdash; kirjaudu t&auml;ll&auml; s&auml;hk&ouml;postiosoitteella ja uudella salasanalla.
      </p>
      <p style="color:#999;font-size:12px;">Jos painike ei toimi, kopioi t&auml;m&auml; osoite selaimeen:<br>${resetLinkki}</p>
    </div>`;
}
// ─────────────────────────────────────────────────────────────────────────────
// lahetaRekisteriKutsu
// ─────────────────────────────────────────────────────────────────────────────
exports.lahetaRekisteriKutsu = functions
  .region('europe-west1')
  .runWith({ secrets: ['SENDGRID_API_KEY'] })
  // SENDGRID_API_KEY: Secret Manager (runWith yllä) → process.env. SENDGRID_FROM_EMAIL committattu .env:hen.
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
// lahetaMuistutukset — nudge (kutsumuistutus odottaville). Operaattorin käynnistämä,
// frekvenssikatto (MIN_DAYS=5 / MAX_KPL=3), vain server-side luettuihin (korjattuihin) osoitteisiin.
// ─────────────────────────────────────────────────────────────────────────────
const MUISTUTUS_MIN_DAYS = 5;
const MUISTUTUS_MAX_KPL  = 3;
exports.lahetaMuistutukset = functions
  .region('europe-west1')
  .runWith({ secrets: ['SENDGRID_API_KEY'] })
  .https.onCall(async (data, context) => {
    if (!context.auth) {
      throw new functions.https.HttpsError('unauthenticated', 'Kirjaudu ensin.');
    }
    const { seuraId, pelaajaId, kuivaAjo } = data || {};
    if (!seuraId) {
      throw new functions.https.HttpsError('invalid-argument', 'seuraId on pakollinen.');
    }
    // authz — sama kuin lahetaHuoltajaKutsu (SA/VP/seurasihteeri/UTJ oma seura)
    const oikeus = await tarkistaOikeus(context.auth.uid, seuraId);
    if (!oikeus.sallittu) {
      throw new functions.https.HttpsError('permission-denied', 'Ei oikeutta tähän seuraan.');
    }
    const dry = !!kuivaAjo;
    const seuraDoc = await db.collection('seurat').doc(seuraId).get();
    const seuraNimi = (seuraDoc.exists && seuraDoc.data().nimi) || seuraId;
    const baseUrl = 'https://terokoskela7-cmyk.github.io/talentmaster';

    // Kohde: yksittäinen pelaaja TAI kaikki odottavat
    let docs;
    if (pelaajaId) {
      const d = await db.collection('seurat').doc(seuraId).collection('pelaajat').doc(pelaajaId).get();
      docs = d.exists ? [d] : [];
    } else {
      const snap = await db.collection('seurat').doc(seuraId).collection('pelaajat')
        .where('suostumusTila', '==', 'odottaa').get();
      docs = snap.docs;
    }

    const MS_PER_DAY = 86400000;
    const nyt = Date.now();
    const lahetettavat = [];
    const ohitettu = [];
    for (const d of docs) {
      const p = d.data();
      const etunimi = p.etunimi || '';
      const hEmail = String(p.huoltajaEmail || '').trim();   // server-side luettu = vain korjattu osoite
      if (!hEmail) { ohitettu.push({ pelaajaId: d.id, etunimi, syy: 'ei_emailia' }); continue; }
      const mPvm = p.muistutus_pvm;
      if (mPvm) {
        const ms = mPvm.toDate ? mPvm.toDate().getTime() : (mPvm.seconds ? mPvm.seconds * 1000 : new Date(mPvm).getTime());
        if (ms && (nyt - ms) < MUISTUTUS_MIN_DAYS * MS_PER_DAY) { ohitettu.push({ pelaajaId: d.id, etunimi, syy: 'liian_pian' }); continue; }
      }
      if ((p.muistutus_kpl || 0) >= MUISTUTUS_MAX_KPL) { ohitettu.push({ pelaajaId: d.id, etunimi, syy: 'max_saavutettu' }); continue; }
      lahetettavat.push({ ref: d.ref, pelaajaId: d.id, etunimi, hEmail, pelaajaNimi: [p.etunimi, p.sukunimi].filter(Boolean).join(' ') || 'pelaaja' });
    }

    if (dry) {
      return { ok: true, kuivaAjo: true, lahetetty: lahetettavat.length,
        lahetettavat: lahetettavat.map(x => ({ pelaajaId: x.pelaajaId, etunimi: x.etunimi })),
        ohitettu, yhteensa: docs.length };
    }

    let lahetetty = 0;
    for (const x of lahetettavat) {
      const linkki = `${baseUrl}/TalentMaster_Rekisterointi_Suostumus.html?seura=${seuraId}&pelaaja=${x.pelaajaId}`;
      try {
        await lahetaSahkoposti({
          to: x.hEmail,
          subject: 'Muistutus: rekisteröityminen TalentMasteriin',
          fromName: seuraNimi,
          html: pohjaMuistutus({ seuraNimi, pelaajaNimi: x.pelaajaNimi, linkki }),
        });
        await x.ref.update({
          muistutus_pvm: admin.firestore.FieldValue.serverTimestamp(),
          muistutus_kpl: admin.firestore.FieldValue.increment(1),
        });
        db.collection('audit').add({
          toiminto: 'muistutus_lahetetty', severity: 'info',
          pelaajaId: x.pelaajaId, seuraId, hEmail: x.hEmail,
          tekija_uid: context.auth.uid,
          aikaleima: admin.firestore.FieldValue.serverTimestamp(),
        }).catch(() => {});
        lahetetty++;
      } catch (e) {
        ohitettu.push({ pelaajaId: x.pelaajaId, etunimi: x.etunimi, syy: 'lahetys_epaonnistui' });
      }
    }
    return { ok: true, kuivaAjo: false, lahetetty, ohitettu, yhteensa: docs.length };
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
    // Onboarding-integriteetti B1 — audit (best-effort, ei saa kaataa operaatiota)
    db.collection('audit').add({
      toiminto: 'huoltajakutsu_lahetetty', severity: 'info',
      pelaajaId, seuraId, hEmail: huoltajaEmail,
      tekija_uid: (context.auth && context.auth.uid) || null,
      aikaleima: admin.firestore.FieldValue.serverTimestamp(),
    }).catch(() => {});
    return { ok: true, linkki: suostumusLinkki };
  });
// ─────────────────────────────────────────────────────────────────────────────
// luoKayttaja
// ─────────────────────────────────────────────────────────────────────────────
exports.luoKayttaja = functions
  .region('europe-west1')
  .runWith({ secrets: ['SENDGRID_API_KEY'] })
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
      // Lippu kayttajat-dokumenttiin → UI näyttää ✓ heti (ei odota tokenin uusiutumista)
      await db.collection('seurat').doc(seuraId).collection('kayttajat').doc(uid)
        .set({ claimsAsetettu: true }, { merge: true });
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
const SALLITUT_ROOLIT_VAIHTO = ['vp', 'valmentaja', 'talenttivalmentaja', 'urheilutoimenjohtaja', 'seurasihteeri', 'testivastaava'];
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

    // 1. Oikeustarkistus — vain SA, VP, UTJ tai seurasihteeri (sama tarkistaOikeus kuin muualla)
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
    // Lippu kayttajat-dokumenttiin → roolinvaihto näkyy ✓ heti (ei odota tokenin uusiutumista)
    await kRef.set({ claimsAsetettu: true }, { merge: true });

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
// korjaaJoukkueenTestipvm — bulk-korjaa joukkueen testipäivä (väärin tuotu historiadata).
// Authz palvelimella (Admin SDK ohittaa client-Rulesin, joten toimii myös VP/seurasihteerille
// joilla ei ole client-pelaajat-update-oikeutta): super-admin / vp / seurasihteeri / UTJ /
// johto (tarkistaOikeus) TAI testivastaava. Päivittää pvm-pikakentät joukkueen pelaajille,
// VAIN kentät jotka pelaajalla jo on (ei luo uutta tsi_pvm:ää TSI-testaamattomalle). Audit-jälki.
// data: { seuraId, joukkue, testityyppi: 'hh'|'tki'|'flei', uusiPvm: 'YYYY-MM-DD', vanhaPvm? }
// ─────────────────────────────────────────────────────────────────────────────
exports.korjaaJoukkueenTestipvm = functions
  .region('europe-west1')
  .https.onCall(async (data, context) => {
    if (!context.auth) {
      throw new functions.https.HttpsError('unauthenticated', 'Kirjaudu ensin.');
    }
    const { seuraId, joukkue, testityyppi, uusiPvm, vanhaPvm } = data;
    if (!seuraId || !joukkue || !testityyppi || !uusiPvm) {
      throw new functions.https.HttpsError('invalid-argument',
        'seuraId, joukkue, testityyppi ja uusiPvm ovat pakollisia.');
    }
    if (!/^\d{4}-\d{2}-\d{2}$/.test(uusiPvm)) {
      throw new functions.https.HttpsError('invalid-argument', 'uusiPvm muodossa YYYY-MM-DD.');
    }
    // Testityyppi → pvm-pikakentät (H-H = fyysinen testisessio sisältää myös TSI:n SM-testit).
    const KENTAT = { hh: ['hh_pvm', 'tsi_pvm'], tki: ['tki_pvm'], flei: ['flei_pvm'] };
    const kentat = KENTAT[testityyppi];
    if (!kentat) {
      throw new functions.https.HttpsError('invalid-argument', `Virheellinen testityyppi: ${testityyppi}`);
    }

    const kutsujaUid = context.auth.uid;
    // 1. Auktorisointi — tarkistaOikeus (super-admin/vp/seurasihteeri/UTJ) + testivastaava.
    const oikeus = await tarkistaOikeus(kutsujaUid, seuraId);
    let sallittu = oikeus.sallittu, rooli = oikeus.rooli;
    if (!sallittu) {
      const kd = await db.collection('seurat').doc(seuraId).collection('kayttajat').doc(kutsujaUid).get();
      if (kd.exists && kd.data().rooli === 'testivastaava') { sallittu = true; rooli = 'testivastaava'; }
    }
    if (!sallittu) {
      throw new functions.https.HttpsError('permission-denied', `Ei oikeuksia seuralle "${seuraId}".`);
    }

    // 2. Hae seuran pelaajat, suodata joukkue case-insensitively (sama logiikka kuin VP/Master).
    const snap = await db.collection('seurat').doc(seuraId).collection('pelaajat').get();
    const jLow = String(joukkue).toLowerCase().trim();
    const jId = jLow.replace(/\s+/g, '_');
    const kohteet = [];
    snap.forEach(function (doc) {
      const d = doc.data();
      const jk = String(d.joukkue || d.joukkueNimi || '').toLowerCase().trim();
      const arr = Array.isArray(d.joukkueet) ? d.joukkueet.map(function (x) { return String(x).toLowerCase().trim(); }) : [];
      if (jk !== jLow && arr.indexOf(jLow) < 0 && arr.indexOf(jId) < 0) return;
      // Vain pelaajat joilla on jokin korjattava kenttä (testattu tässä sessiossa).
      const omatKentat = kentat.filter(function (k) { return d[k] != null && d[k] !== ''; });
      if (!omatKentat.length) return;
      // Valinnainen vanhaPvm-suodatin: korjaa vain jos nykyinen pvm == vanhaPvm.
      if (vanhaPvm && !omatKentat.some(function (k) { return d[k] === vanhaPvm; })) return;
      kohteet.push({ ref: doc.ref, kentat: omatKentat });
    });

    if (kohteet.length === 0) {
      return { ok: true, paivitetty: 0, viesti: 'Ei korjattavia pelaajia.' };
    }

    // 3. Batch-päivitys (chunk 400, raja 500/batch).
    let paivitetty = 0;
    for (let i = 0; i < kohteet.length; i += 400) {
      const era = kohteet.slice(i, i + 400);
      const batch = db.batch();
      era.forEach(function (item) {
        const upd = {};
        item.kentat.forEach(function (k) { upd[k] = uusiPvm; });
        batch.update(item.ref, upd);
      });
      await batch.commit();
      paivitetty += era.length;
    }

    // 4. Audit-jälki.
    await db.collection('audit').add({
      toiminto: 'testipvm_korjattu',
      seuraId, joukkue, testityyppi, kentat, uusiPvm, vanhaPvm: vanhaPvm || null,
      paivitetty, tekija_uid: kutsujaUid, tekija_rooli: rooli,
      aikaleima: admin.firestore.FieldValue.serverTimestamp(),
    }).catch(function () {});

    console.log(`[korjaaJoukkueenTestipvm] ${seuraId}/${joukkue} ${testityyppi} → ${uusiPvm}: ${paivitetty} pelaajaa (${rooli})`);
    return { ok: true, paivitetty, kentat };
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
  .runWith({ secrets: ['SENDGRID_API_KEY'] })
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
  .runWith({ secrets: ['SENDGRID_API_KEY'] })   // §13: salasanalinkki-email → SENDGRID_API_KEY Secret Managerista process.env:iin
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
      // Onboarding-integriteetti B1 — väärä-lapsi-yritys (email-ristiriita) → HÄLYTYS. Best-effort ENNEN throwia.
      db.collection('audit').add({
        toiminto: 'suostumus_estetty_email_ristiriita', severity: 'alert',
        pelaajaId, seuraId, yritettyEmail: hEmailNorm,
        aikaleima: admin.firestore.FieldValue.serverTimestamp(),
      }).catch(() => {});
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

    // Onboarding-integriteetti B1 — suostumus annettu (best-effort). Autentikoimaton sivu → uid usein null,
    // siksi kirjataan antaja + hEmail jäljitettävyyttä varten.
    db.collection('audit').add({
      toiminto: 'suostumus_annettu', severity: 'info',
      pelaajaId, seuraId, hEmail: hEmailNorm, antaja: antaja || null,
      tekija_uid: (context.auth && context.auth.uid) || null,
      aikaleima: admin.firestore.FieldValue.serverTimestamp(),
    }).catch(() => {});

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
      // 6. Lähetä salasanalinkki sähköpostiin (best-effort §13). EI kaadeta suostumusta jos lähetys
      //    epäonnistuu — passwordResetLink palautetaan yhä (QR-varapolku säilyy). Suostumus on jo tallennettu yllä.
      let emailLahetetty = false, emailVirhe = null;
      try {
        const lapsiNimi = String(snap.get('etunimi') || '').trim();
        await lahetaSahkoposti({
          to: hEmailNorm,
          subject: 'Aseta TalentMaster-salasanasi',
          fromName: 'TalentMaster',
          html: pohjaSuostumusLinkki({ lapsiNimi, resetLinkki: passwordResetLink }),
        });
        emailLahetetty = true;
        db.collection('audit').add({
          toiminto: 'suostumuslinkki_lahetetty', severity: 'info',
          pelaajaId, seuraId, hEmail: hEmailNorm,
          aikaleima: admin.firestore.FieldValue.serverTimestamp(),
        }).catch(() => {});
      } catch (mailErr) {
        emailVirhe = String((mailErr && mailErr.message) || mailErr || 'tuntematon');
        console.warn('[vahvistaSuostumus] Salasanalinkki-email epäonnistui:', emailVirhe);
        db.collection('audit').add({
          toiminto: 'suostumuslinkki_epaonnistui', severity: 'warn',
          pelaajaId, seuraId, hEmail: hEmailNorm, virhe: emailVirhe.slice(0, 200),
          aikaleima: admin.firestore.FieldValue.serverTimestamp(),
        }).catch(() => {});
      }
      return { ok: true, passwordResetLink, pin, emailLahetetty, emailVirhe };
    } catch (e) {
      console.warn('[vahvistaSuostumus] Reset-linkki epäonnistui:', e.message);
      return { ok: true, passwordResetLink: null, linkkiVirhe: e.message, pin };
    }
  });
// ─────────────────────────────────────────────────────────────────────────────
// haeAuditLoki — SA-only audit-loki-lukija (Admin "Audit-loki / Hälytykset" -näkymä).
// Audit pysyy EI-client-luettavana (Rules); SA lukee VAIN tämän callable-CF:n kautta.
// ─────────────────────────────────────────────────────────────────────────────
exports.haeAuditLoki = functions
  .region('europe-west1')
  .https.onCall(async (data, context) => {
    if (!context.auth) {
      throw new functions.https.HttpsError('unauthenticated', 'Kirjaudu sisään.');
    }
    // SA-gate (sama onSuperAdmin-pattern kuin tarkistaOikeus)
    const adminDoc = await db.collection('admins').doc(context.auth.uid).get();
    const ad = adminDoc.exists ? adminDoc.data() : null;
    const onSA = ad && (ad.superAdmin === true || ad.rooli === 'super_admin' || ad.rooli === 'superadmin');
    if (!onSA) {
      throw new functions.https.HttpsError('permission-denied', 'Vain super-admin.');
    }
    const limit = Math.min(Math.max(parseInt((data && data.limit) || 100, 10) || 100, 1), 500);
    const severity = (data && data.severity) ? String(data.severity) : null;
    // orderBy(aikaleima desc) = yksikenttäinen auto-indeksi (ei composite-indeksiä tarvita).
    // severity suodatetaan tässä CF:ssä haetun ikkunan yli → EI vaadi audit-composite-indeksiä eikä index-deployta.
    const hakuLimit = severity ? Math.max(limit, 300) : limit;
    const snap = await db.collection('audit').orderBy('aikaleima', 'desc').limit(hakuLimit).get();
    let rivit = snap.docs.map((d) => {
      const x = d.data();
      const ts = (x.aikaleima && x.aikaleima.toDate) ? x.aikaleima.toDate().toISOString() : null;
      return { id: d.id, ...x, aikaleima: ts };
    });
    if (severity) rivit = rivit.filter((r) => r.severity === severity);
    return { ok: true, rivit: rivit.slice(0, limit), n: rivit.length };
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
    // API-avaimet Secret Managerissa (runWith) — process.env.X lukee ajonaikaisesti. Ei .env-plaintextia.
    secrets:        ['OPENAI_API_KEY', 'ANTHROPIC_API_KEY'],   // GEMINI_API_KEY pois: secret puuttuu + gemini-taskit ei käytössä
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

// ─────────────────────────────────────────────────────────────────────────────
// haeLapsiHuoltajalle — resolvoi vanhemman lapsi/lapset autentikoidusta emailista.
// Vanhempi-appi kutsuu tätä loginin jälkeen kun linkkiä (?seura=&uid=) ei ole.
// Client EI voi tehdä tätä: Rules estävät cross-seura-haun eikä huoltajalla ole
// seuraId-claimia. Admin SDK ohittaa Rulesit. Turvallinen: palauttaa VAIN ne lapset
// joiden huoltajaEmail == kutsujan autentikoitu (Firebase Auth lowercasaa) email.
// Vaatii collectionGroup-indeksin pelaajat.huoltajaEmail (firestore.indexes.json).
// ─────────────────────────────────────────────────────────────────────────────
exports.haeLapsiHuoltajalle = functions
  .region('europe-west1')
  .https.onCall(async (data, context) => {
    if (!context.auth || !context.auth.token.email) {
      throw new functions.https.HttpsError('unauthenticated', 'Kirjautuminen vaaditaan.');
    }
    // Firebase Auth -tokenin email on jo lowercase; data normalisoitu samaan (migraatio).
    const email = String(context.auth.token.email).toLowerCase().trim();
    try {
      const snap = await admin.firestore()
        .collectionGroup('pelaajat')
        .where('huoltajaEmail', '==', email)
        .limit(10)
        .get();
      if (snap.empty) {
        return { found: false, lapset: [] };
      }
      const lapset = snap.docs.map((d) => ({
        seura:    d.ref.parent.parent.id,
        uid:      d.id,
        etunimi:  d.data().etunimi  || '',
        sukunimi: d.data().sukunimi || '',
      }));
      return { found: true, lapset };
    } catch (e) {
      console.error('[haeLapsiHuoltajalle]', email, e.message);
      throw new functions.https.HttpsError('internal', 'Lapsen haku epäonnistui.');
    }
  });

// ═══════════════════════════════════════════════════════════════════════════
// N1 NOTIFIKAATIOT (docs/NOTIFIKAATIOT_JA_MOBIILI.md §B) — in-app notifit.
// Kirjoitus admin-SDK:lla (ohittaa Rules); client lukee vain omat notifit (Rules §12).
// §21-pattern: Firestore-trigger → CF (T1) + ajastettu CF (T2). Region europe-west1.
// ═══════════════════════════════════════════════════════════════════════════
function _notifPvmMs(d) {
  if (d == null) return null;
  if (typeof d === 'number') return d;
  if (typeof d === 'object' && typeof d.toDate === 'function') { try { return d.toDate().getTime(); } catch (e) { return null; } }
  const m = String(d).match(/^(\d{4})-(\d{1,2})-(\d{1,2})/);
  if (m) return new Date(+m[1], +m[2] - 1, +m[3]).getTime();
  const t = Date.parse(String(d));
  return isNaN(t) ? null : t;
}
function _notifIka(p) {
  const y = new Date().getFullYear();
  if (p.syntymaVuosi != null) { const a = y - Number(p.syntymaVuosi); if (a >= 5 && a <= 25) return a; }
  const mm = String(p.joukkue || '').match(/\b[PTU]\s?(\d{1,2})\b/i);
  if (mm) { const a = Number(mm[1]); if (a >= 5 && a <= 25) return a; }
  return null;
}

// T1 — uutta jaettua palautetta → notif valmentajalle (ohita jos tekijä == valmentaja itse)
exports.notifPalauteJaettu = functions
  .region('europe-west1')
  .firestore.document('seurat/{sid}/harjoitusarvioinnit/{aid}/palaute_jaettu/{pid}')
  .onCreate(async (snap, context) => {
    const { sid, aid } = context.params;
    const palaute = snap.data() || {};
    try {
      const arvSnap = await db.collection('seurat').doc(sid).collection('harjoitusarvioinnit').doc(aid).get();
      if (!arvSnap.exists) return null;
      const arv = arvSnap.data() || {};
      const valmentajaUid = arv.valmentajaUid;
      if (!valmentajaUid) return null;
      if (palaute.tekija_uid && palaute.tekija_uid === valmentajaUid) return null;   // oma palaute → ei notifia
      await db.collection('seurat').doc(sid).collection('kayttajat').doc(valmentajaUid).collection('notifikaatiot').add({
        tyyppi: 'palaute',
        teksti: 'Sait uutta palautetta harjoitusarvioinnistasi' + (arv.joukkue ? ' (' + arv.joukkue + ')' : '') + '.',
        linkki: { nakyma: 'palaute', aid: aid },
        luotu: admin.firestore.FieldValue.serverTimestamp(),
        luettu: false
      });
    } catch (e) { console.error('[notifPalauteJaettu]', sid, aid, e.message); }
    return null;
  });

// T2 — review erääntyy ≤7 pv tai myöhässä → notif seuran VP:lle. Ikäkaista 42 pv (≥12) / 84 pv (9–11).
// Dedupe: ei uutta notifia jos samasta pelaajasta on jo lukematon review-notif.
exports.notifReviewEraantyy = functions
  .region('europe-west1')
  .pubsub.schedule('every day 06:00')
  .timeZone('Europe/Helsinki')
  .onRun(async () => {
    const nyt = Date.now(), PV = 86400000;
    const seurat = await db.collection('seurat').get();
    for (const seuraDoc of seurat.docs) {
      const sid = seuraDoc.id;
      try {
        const pelaajatSnap = await db.collection('seurat').doc(sid).collection('pelaajat').get();
        const eraantyvat = [];
        pelaajatSnap.forEach((pd) => {
          const p = pd.data();
          const viim = _notifPvmMs(p.review_viimeisin_pvm);
          if (viim == null) return;
          const ika = _notifIka(p);
          const kaista = (ika != null && ika >= 12) ? 42 : 84;   // §B: ≥12 → 42 pv · 9–11 → 84 pv
          const paivia = Math.floor((viim + kaista * PV - nyt) / PV);
          if (paivia <= 7) eraantyvat.push({ id: pd.id, nimi: ((p.etunimi || '') + ' ' + (p.sukunimi || '')).trim() || pd.id, joukkue: p.joukkue || '', paivia });
        });
        if (!eraantyvat.length) continue;
        const vpSnap = await db.collection('seurat').doc(sid).collection('kayttajat').where('rooli', '==', 'vp').get();
        if (vpSnap.empty) continue;
        for (const vp of vpSnap.docs) {
          const notifCol = db.collection('seurat').doc(sid).collection('kayttajat').doc(vp.id).collection('notifikaatiot');
          const unreadSnap = await notifCol.where('tyyppi', '==', 'review').get();   // single eq → ei komposiitti-indeksiä; luettu suodatetaan clientissä
          const jo = new Set(unreadSnap.docs.filter((d) => d.data().luettu === false).map((d) => d.data().pelaajaId));
          for (const e of eraantyvat) {
            if (jo.has(e.id)) continue;   // dedupe
            await notifCol.add({
              tyyppi: 'review',
              pelaajaId: e.id,
              teksti: (e.paivia < 0 ? 'Review myöhässä' : 'Review erääntyy ' + e.paivia + ' pv') + ': ' + e.nimi + (e.joukkue ? ' (' + e.joukkue + ')' : '') + '.',
              linkki: { nakyma: 'reviewit', pelaajaId: e.id },
              luotu: admin.firestore.FieldValue.serverTimestamp(),
              luettu: false
            });
          }
        }
      } catch (e) { console.error('[notifReviewEraantyy]', sid, e.message); }
    }
    return null;
  });

// T3 / N1.5 — VP teki B-havainnoinnin valmentajalle, jolta puuttuu itsearvio → muistuta valmentajaa.
// Sulkee kalibraatiosilmukan (2.2: itsearvio + havainnointi samasta harjoituksesta → pari). §B2.
exports.notifTeeItsearvio = functions
  .region('europe-west1')
  .firestore.document('seurat/{sid}/harjoitusarvioinnit/{aid}')
  .onCreate(async (snap, context) => {
    const { sid } = context.params;
    const arv = snap.data() || {};
    try {
      if (arv.malli !== 'valmennustaidot' || arv.arviointitapa !== 'havainnointi') return null;   // vain B-havainnointi
      const valmentajaUid = arv.valmentajaUid;
      if (!valmentajaUid) return null;
      const joukkue = arv.joukkue || '', pvmMs = _notifPvmMs(arv.pvm), PV = 86400000;
      if (pvmMs == null) return null;
      const lc = (x) => String(x == null ? '' : x).toLowerCase().trim();
      // Onko valmentajalla jo itsearvio samasta harjoituksesta (B, itsearvio, sama joukkue, ±2 pv)?
      const omat = await db.collection('seurat').doc(sid).collection('harjoitusarvioinnit').where('valmentajaUid', '==', valmentajaUid).get();   // single eq → ei komposiittia
      const onItsearvio = omat.docs.some((d) => {
        const a = d.data();
        if (a.malli !== 'valmennustaidot' || a.arviointitapa !== 'itsearvio' || lc(a.joukkue) !== lc(joukkue)) return false;
        const m = _notifPvmMs(a.pvm);
        return m != null && Math.abs(m - pvmMs) <= 2 * PV;
      });
      if (onItsearvio) return null;   // pari jo olemassa → ei muistutusta
      const notifCol = db.collection('seurat').doc(sid).collection('kayttajat').doc(valmentajaUid).collection('notifikaatiot');
      // Dedupe: lukematon tee_itsearvio samasta harjoituksesta (pvm/joukkue)?
      const jo = await notifCol.where('tyyppi', '==', 'tee_itsearvio').get();
      const dup = jo.docs.some((d) => { const n = d.data(); return n.luettu === false && lc(n.joukkue) === lc(joukkue) && _notifPvmMs(n.pvm) != null && Math.abs(_notifPvmMs(n.pvm) - pvmMs) <= 2 * PV; });
      if (dup) return null;
      await notifCol.add({
        tyyppi: 'tee_itsearvio',
        teksti: 'Tee itsearvio harjoituksesta' + (joukkue ? ' (' + joukkue + ')' : '') + ' — saatte kalibraation.',
        joukkue: joukkue, pvm: arv.pvm || null,
        linkki: { nakyma: 'itsearvio' },
        luotu: admin.firestore.FieldValue.serverTimestamp(),
        luettu: false
      });
    } catch (e) { console.error('[notifTeeItsearvio]', sid, e.message); }
    return null;
  });

// N2 — sähköpostikooste (NOTIFIKAATIOT_JA_MOBIILI.md §B3). Ajastettu CF: kerää lukemattomat notifit
// per käyttäjä (edellisen koosteen jälkeen) → yksi kooste-email LUKUMÄÄRINÄ (EI PII:tä §33 B2).
// Transport: olemassa oleva lahetaSahkoposti (SendGrid, sama kuin kutsuissa). Opt-out: notif_asetukset.email.enabled===false.
exports.notifKoosteEmail = functions
  .region('europe-west1')
  .runWith({ secrets: ['SENDGRID_API_KEY'] })
  .pubsub.schedule('every day 07:00')
  .timeZone('Europe/Helsinki')
  .onRun(async () => {
    const nyt = Date.now(), PV = 86400000, nowIso = new Date(nyt).toISOString();
    const appUrl = 'https://terokoskela7-cmyk.github.io/talentmaster/';
    const seurat = await db.collection('seurat').get();
    for (const seuraDoc of seurat.docs) {
      const sid = seuraDoc.id, seuraNimi = (seuraDoc.data() || {}).nimi || sid;
      try {
        const kayttajat = await db.collection('seurat').doc(sid).collection('kayttajat').get();
        for (const kd of kayttajat.docs) {
          const u = kd.data() || {};
          if (!u.email) continue;
          const as = (u.notif_asetukset && u.notif_asetukset.email) || {};
          if (as.enabled === false) continue;   // opt-out (oletus päällä)
          const kadenssi = as.kadenssi || 'paivittain';
          const viimDigest = _notifPvmMs(u.notif_digest_pvm);
          if (kadenssi === 'viikoittain' && viimDigest != null && (nyt - viimDigest) < 6.5 * PV) continue;   // frekvenssikatto: ~1/vk
          // Lukemattomat notifit edellisen koosteen jälkeen (single eq → ei komposiittia; luotu-suodatus clientissä)
          const notifSnap = await db.collection('seurat').doc(sid).collection('kayttajat').doc(kd.id).collection('notifikaatiot').where('luettu', '==', false).get();
          const uudet = notifSnap.docs.map((d) => d.data()).filter((n) => {
            if (viimDigest == null) return true;
            const m = (n.luotu && n.luotu.toDate) ? n.luotu.toDate().getTime() : null;
            return m == null || m > viimDigest;
          });
          if (!uudet.length) continue;
          // Kooste LUKUMÄÄRINÄ — EI pelaajien nimiä/sisältöä runkoon (PII-suoja)
          const lkm = {};
          uudet.forEach((n) => { lkm[n.tyyppi] = (lkm[n.tyyppi] || 0) + 1; });
          const osat = [];
          if (lkm.palaute) osat.push(lkm.palaute + (lkm.palaute === 1 ? ' uusi palaute' : ' uutta palautetta'));
          if (lkm.review) osat.push(lkm.review + (lkm.review === 1 ? ' review erääntyy' : ' reviewiä erääntyy/myöhässä'));
          if (lkm.tee_itsearvio) osat.push('tee itsearvio' + (lkm.tee_itsearvio > 1 ? ' (' + lkm.tee_itsearvio + ')' : ''));
          const muut = Object.keys(lkm).filter((k) => ['palaute', 'review', 'tee_itsearvio'].indexOf(k) < 0).reduce((s, k) => s + lkm[k], 0);
          if (muut) osat.push(muut + ' muuta ilmoitusta');
          if (!osat.length) continue;
          const kooste = osat.join(' · ');
          const html = '<div style="font-family:Arial,Helvetica,sans-serif;color:#111;max-width:520px;margin:0 auto;padding:8px">'
            + '<h2 style="color:#1D9E75;margin:0 0 4px">TalentMaster™</h2>'
            + '<p style="color:#555;margin:0 0 16px">Uusia ilmoituksia · ' + seuraNimi + '</p>'
            + '<p style="font-size:16px;font-weight:bold;color:#111">' + kooste + '</p>'
            + '<p style="margin:18px 0"><a href="' + appUrl + '" style="background:#1D9E75;color:#fff;padding:11px 20px;border-radius:8px;text-decoration:none;display:inline-block">Avaa sovellus</a></p>'
            + '<hr style="border:none;border-top:1px solid #ddd;margin:20px 0">'
            + '<p style="font-size:12px;color:#888;line-height:1.5">Et halua koosteita? Kirjaudu sovellukseen → 🔔 → Ilmoitusasetukset → poista sähköposti käytöstä. Tämä on työhön liittyvä koonti omista ilmoituksistasi (ei pelaajatietoja).</p>'
            + '</div>';
          await lahetaSahkoposti({ to: u.email, subject: 'TalentMaster™ — uusia ilmoituksia (' + uudet.length + ')', html, fromName: 'TalentMaster™ · ' + seuraNimi });
          await db.collection('seurat').doc(sid).collection('kayttajat').doc(kd.id).update({ notif_digest_pvm: nowIso });
        }
      } catch (e) { console.error('[notifKoosteEmail]', sid, e.message); }
    }
    return null;
  });

// ═══════════════════════════════════════════════════════════════════════════
// SOLO PLAYER™ Polku B — lupapyyntö-email + hyväksyntä (SOLO_P0_TIETOMALLI_SPEC §9)
// Klubin vahvistaSuostumus-malli: hyväksyntä VAIN CF:ssä (Admin SDK). europe-west1.
// ═══════════════════════════════════════════════════════════════════════════
const SOLO_BASE_URL = 'https://terokoskela7-cmyk.github.io/talentmaster';
const SOLO_ALPHABET = 'ABCDEFGHJKMNPQRSTUVWXYZ23456789';   // pl. 0/O/1/I/L (sama kuin lib/tm_solo_data.js)
function soloGeneroiPlayerCode() {
  let s = '';
  for (let i = 0; i < 6; i++) s += SOLO_ALPHABET[Math.floor(Math.random() * SOLO_ALPHABET.length)];
  return 'TMP-' + s;
}
async function soloVaraaPlayerCode(parent_uid, playerId) {
  for (let i = 0; i < 6; i++) {
    const code = soloGeneroiPlayerCode();
    const ref = db.collection('playerCodes').doc(code);
    const snap = await ref.get();
    if (!snap.exists) {
      await ref.set({ playerId, parent_uid, luotu: admin.firestore.FieldValue.serverTimestamp() });
      return code;
    }
  }
  throw new functions.https.HttpsError('internal', 'PlayerCode-varaus epäonnistui (5 törmäystä).');
}
function pohjaSoloLupa({ child_etunimi, linkki }) {
  return '<div style="font-family:Arial,sans-serif;max-width:480px;margin:0 auto;color:#1a1a1a">'
    + '<h2 style="color:#0a0f1e">TalentMaster Player™</h2>'
    + '<p><b>' + (child_etunimi || 'Lapsesi') + '</b> haluaa aloittaa TalentMaster Playerin käytön ja pyytää sinulta lupaa.</p>'
    + '<p>Olet lapsesi laillinen huoltaja. Lapsen harjoitusdatan käsittely vaatii suostumuksesi (GDPR Art. 8). '
    + 'Avaa alla oleva linkki, niin näet lapsen tiedot ja voit antaa luvan.</p>'
    + '<p style="text-align:center;margin:28px 0"><a href="' + linkki + '" style="background:#00d4aa;color:#fff;padding:13px 26px;border-radius:10px;text-decoration:none;font-weight:bold">Tarkista ja anna lupa →</a></p>'
    + '<p style="font-size:12px;color:#666">Jos et tunnista tätä pyyntöä, voit jättää viestin huomiotta — mitään ei tallenneta ilman lupaasi.</p>'
    + '</div>';
}

// soloLupapyyntoEmail — lapsi (anon/kirjautumaton) loi lupapyynnon → CF lähettää vanhemmalle magic-linkin.
exports.soloLupapyyntoEmail = functions
  .region('europe-west1')
  .runWith({ secrets: ['SENDGRID_API_KEY'] })
  .https.onCall(async (data) => {
    const { requestId } = data || {};
    if (!requestId) throw new functions.https.HttpsError('invalid-argument', 'requestId on pakollinen.');
    const ref = db.collection('lupapyynnot').doc(requestId);
    const snap = await ref.get();
    if (!snap.exists) throw new functions.https.HttpsError('not-found', 'Lupapyyntöä ei löytynyt.');
    const d = snap.data();
    if (d.status !== 'odottaa') throw new functions.https.HttpsError('failed-precondition', 'Pyyntö on jo käsitelty.');
    const email = String(d.parent_email || '').trim().toLowerCase();
    if (!/.+@.+\..+/.test(email)) throw new functions.https.HttpsError('invalid-argument', 'Virheellinen sähköpostiosoite.');
    // Rate-limit: ei uutta lähetystä jos viimeisestä < 2 min.
    if (d.email_lahetetty_pvm && d.email_lahetetty_pvm.toMillis && (Date.now() - d.email_lahetetty_pvm.toMillis()) < 120000) {
      return { ok: true, viesti: 'Linkki lähetettiin juuri — tarkista sähköpostisi.' };
    }
    const linkki = SOLO_BASE_URL + '/TalentMaster_Solo_Lupa.html?r=' + encodeURIComponent(requestId) + '&t=' + encodeURIComponent(d.token || '');
    try {
      await lahetaSahkoposti({
        to: email,
        subject: 'Lapsesi pyytää lupaa — TalentMaster Player™',
        fromName: 'TalentMaster Player',
        html: pohjaSoloLupa({ child_etunimi: d.child_etunimi, linkki }),
      });
      await ref.set({ email_lahetetty_pvm: admin.firestore.FieldValue.serverTimestamp() }, { merge: true }).catch(() => {});
      await db.collection('audit').add({
        toiminto: 'solo_lupapyynto_email', requestId, parent_email: email,
        aikaleima: admin.firestore.FieldValue.serverTimestamp(),
      }).catch(() => {});
      return { ok: true };
    } catch (e) {
      console.error('[soloLupapyyntoEmail]', e.message);
      throw new functions.https.HttpsError('internal', 'Lähetys epäonnistui: ' + e.message);
    }
  });

// soloHyvaksyLupa — VANHEMPI (kirjautunut) hyväksyy magic-linkillä. Luo parents+players+suostumukset+
// child_pin(4num)+playerCode (Admin SDK) + päivittää lupapyynnot. Hyväksyntä VAIN täällä (§9-invariantti).
exports.soloHyvaksyLupa = functions
  .region('europe-west1')
  .https.onCall(async (data, context) => {
    if (!context.auth) throw new functions.https.HttpsError('unauthenticated', 'Kirjaudu ensin vanhempana.');
    const { requestId, token, benchmark } = data || {};
    if (!requestId || !token) throw new functions.https.HttpsError('invalid-argument', 'requestId + token ovat pakollisia.');
    const uid = context.auth.uid;
    const email = String((context.auth.token && context.auth.token.email) || '').trim().toLowerCase();
    const ref = db.collection('lupapyynnot').doc(requestId);
    const snap = await ref.get();
    if (!snap.exists) throw new functions.https.HttpsError('not-found', 'Lupapyyntöä ei löytynyt.');
    const d = snap.data();
    if (d.token !== token) throw new functions.https.HttpsError('permission-denied', 'Virheellinen vahvistustunnus.');
    // Idempotentti: jo hyväksytty → palauta olemassa olevat tiedot.
    if (d.status === 'hyvaksytty' && d.playerId) {
      const ex = await db.collection('players').doc(d.playerId).get();
      return { playerId: d.playerId, child_pin: d.child_pin || null, playerCode: ex.exists ? (ex.data().playerCode || null) : null };
    }
    if (d.status !== 'odottaa') throw new functions.https.HttpsError('failed-precondition', 'Pyyntö on jo käsitelty.');

    const TS = admin.firestore.FieldValue.serverTimestamp();
    const playerRef = db.collection('players').doc();
    const playerId = playerRef.id;
    const code = await soloVaraaPlayerCode(uid, playerId);
    const child_pin = String(Math.floor(1000 + Math.random() * 9000));

    const batch = db.batch();
    batch.set(db.collection('parents').doc(uid), {
      email, nimi: null, luotu: TS, paivitetty: TS,
      lapset: admin.firestore.FieldValue.arrayUnion(playerId),
      entitlement: { status: 'free', stripe_customer_id: null, current_period_end: null },
      suostumus_versio: 'v1', hyvaksytyt_ehdot: { tos: true, privacy: true, pvm: TS },
    }, { merge: true });
    batch.set(playerRef, {
      playerId, parent_uid: uid, playerCode: code, seuraId: null,
      nimi: d.child_etunimi || null, synVuosi: d.synVuosi || null, synKuukausi: d.synKuukausi || null,
      kortti_taso: 'starter', child_pin, lahde: 'polku_b', luotu: TS, paivitetty: TS,
    });
    batch.set(playerRef.collection('suostumukset').doc('perus'), { ok: true, tyyppi: 'perus', antaja_uid: uid, antaja_email: email, versio: 'v1', pvm: TS });
    if (benchmark === true) batch.set(playerRef.collection('suostumukset').doc('benchmark'), { ok: true, tyyppi: 'benchmark', antaja_uid: uid, antaja_email: email, versio: 'v1', pvm: TS });
    batch.set(ref, { status: 'hyvaksytty', playerId, child_pin, hyvaksyja_uid: uid, hyvaksytty_pvm: TS }, { merge: true });
    await batch.commit();

    await db.collection('audit').add({ toiminto: 'solo_lupa_hyvaksytty', requestId, playerId, hyvaksyja_uid: uid, aikaleima: TS }).catch(() => {});
    return { playerId, playerCode: code, child_pin };
  });

// ═════════════════════════════════════════════════════════════════════════════
// GDPR (#96) — RTBF + datan export. Spec: docs/GDPR_TEKNIIKKA_SPEC.md.
// Jaettu locator: ./gdpr_locator (enumeroi KAIKKI sijainnit §11). Authz: tarkistaOikeus → SA TAI seuran
// johto (vp/seurasihteeri/UTJ) — EI valmentaja (tarkistaOikeus ei myönnä valmentajalle). Admin SDK ohittaa Rules.
// Seura = rekisterinpitäjä, TalentMaster = käsittelijä → toimet ovat seuran (tai SA:n sen puolesta) käynnistämiä.
// ═════════════════════════════════════════════════════════════════════════════

// ── RTBF: poistaPelaajaGDPR (GDPR Art. 17) — PERUUTTAMATON, kaksivaiheinen ───────
// Params: { seuraId, pelaajaId, dryRun=true, vahvistus=false }
// dryRun=true (OLETUS) → palauttaa manifestin lukumäärät (poistettaisiin), EI kirjoita.
// dryRun=false JA vahvistus=true → kova poisto: recursiveDelete(pääDoc+alikokoelmat) + ristiviite-docit +
//   Solo + Storage-media + Auth-tili. Audit gdpr_rtbf/alert (lukumäärät, EI henkilösisältöä). Idempotentti.
exports.poistaPelaajaGDPR = functions
  .region('europe-west1')
  .https.onCall(async (data, context) => {
    if (!context.auth) {
      throw new functions.https.HttpsError('unauthenticated', 'Kirjaudu sisään.');
    }
    const seuraId   = data && data.seuraId;
    const pelaajaId = data && data.pelaajaId;
    const dryRun    = !(data && data.dryRun === false);     // OLETUS true (turvallinen)
    const vahvistus = !!(data && data.vahvistus === true);
    if (!seuraId || !pelaajaId) {
      throw new functions.https.HttpsError('invalid-argument', 'seuraId ja pelaajaId pakollisia.');
    }
    const oikeus = await tarkistaOikeus(context.auth.uid, seuraId);
    if (!oikeus.sallittu) {
      throw new functions.https.HttpsError('permission-denied',
        `Ei oikeuksia seuralle "${seuraId}". RTBF vaatii SA:n tai seuran johdon (vp/seurasihteeri/UTJ).`);
    }

    const FieldPath = admin.firestore.FieldPath;
    const manifesti = await keraaPelaajanManifesti(db, seuraId, pelaajaId, { FieldPath });

    // Idempotenssi: pääDoc poissa → ei mitään poistettavaa (no-op + audit kovassa ajossa).
    if (!manifesti.loytyi) {
      if (!dryRun && vahvistus) {
        await db.collection('audit').add(Object.assign(
          rakennaAuditPayload({ tyyppi: 'gdpr_rtbf_noop', severity: 'alert', seuraId, pelaajaId,
            requesterUid: context.auth.uid, rooli: oikeus.rooli, lukumaarat: manifesti.lukumaarat, varoitukset: manifesti.varoitukset }),
          { aikaleima: admin.firestore.FieldValue.serverTimestamp() },
        )).catch(() => {});
        console.log(`[poistaPelaajaGDPR] NO-OP (jo poistettu) ${seuraId}/${pelaajaId} requester=${context.auth.uid}`);
      }
      return { dryRun, loytyi: false, jo_poistettu: true, poistettaisiin: manifesti.lukumaarat };
    }

    // dryRun=true (oletus): esikatselu, EI kirjoita.
    if (dryRun) {
      return {
        dryRun: true, loytyi: true, palloID: manifesti.palloID,
        poistettaisiin: manifesti.lukumaarat,
        varoituksia: manifesti.varoitukset.length, varoitukset: manifesti.varoitukset,
      };
    }
    if (!vahvistus) {
      throw new functions.https.HttpsError('failed-precondition',
        'Kova poisto vaatii vahvistus:true. Aja ensin dryRun-esikatselu.');
    }

    console.log(`[poistaPelaajaGDPR] ALOITA ${seuraId}/${pelaajaId} requester=${context.auth.uid} rooli=${oikeus.rooli} lukumäärät=${JSON.stringify(manifesti.lukumaarat)}`);

    // 1) pääDoc + KAIKKI alikokoelmat (recursiveDelete)
    await db.recursiveDelete(manifesti.paaDoc.ref);
    // 2) ristiviite-docit (eri puu, ei katoa recursiveDeletellä) — batcheina (max 400/erä)
    const ristiRefit = [];
    (manifesti.ristiviitteet.lasnaolo || []).forEach((x) => { if (x.ref) ristiRefit.push(x.ref); });
    (manifesti.ristiviitteet.testitapahtuma_tulokset || []).forEach((x) => { if (x.ref) ristiRefit.push(x.ref); });
    (manifesti.ristiviitteet.palloID_viitteet || []).forEach((x) => { if (x.ref) ristiRefit.push(x.ref); });
    for (let i = 0; i < ristiRefit.length; i += 400) {
      const era = ristiRefit.slice(i, i + 400);
      const batch = db.batch();
      era.forEach((r) => batch.delete(r));
      await batch.commit();
    }
    // 3) Solo (litteä pelaajat/{palloID} + alikokoelmat)
    if (manifesti.soloRef) await db.recursiveDelete(manifesti.soloRef);
    // 4) Storage-media (per havainto -prefiksit; ei poista muiden pelaajien mediaa)
    let mediaPoistettu = true;
    try {
      const bucket = admin.storage().bucket();
      for (const prefix of (manifesti.storagePrefiksit || [])) {
        await bucket.deleteFiles({ prefix }).catch((e) => {
          mediaPoistettu = false;
          console.warn('[poistaPelaajaGDPR] Storage prefix ' + prefix + ': ' + e.message);
        });
      }
    } catch (e) {
      mediaPoistettu = false;
      console.warn('[poistaPelaajaGDPR] Storage: ' + e.message);
    }
    // 5) Auth (anonyymi PIN-tili uid==pelaajaId)
    let authPoistettu = false;
    try {
      await admin.auth().deleteUser(pelaajaId);
      authPoistettu = true;
    } catch (e) {
      if (!(e.errorInfo && e.errorInfo.code === 'auth/user-not-found')) {
        console.warn('[poistaPelaajaGDPR] deleteUser: ' + e.message);
      }
    }
    // 6) Audit (gdpr_rtbf / alert) — lukumäärät, EI henkilösisältöä
    await db.collection('audit').add(Object.assign(
      rakennaAuditPayload({ tyyppi: 'gdpr_rtbf', severity: 'alert', seuraId, pelaajaId,
        requesterUid: context.auth.uid, rooli: oikeus.rooli, lukumaarat: manifesti.lukumaarat, varoitukset: manifesti.varoitukset }),
      { media_poistettu: mediaPoistettu, auth_poistettu: authPoistettu, aikaleima: admin.firestore.FieldValue.serverTimestamp() },
    )).catch(() => {});

    console.log(`[poistaPelaajaGDPR] VALMIS ${seuraId}/${pelaajaId} media=${mediaPoistettu} auth=${authPoistettu}`);
    return {
      dryRun: false, poistettu: manifesti.lukumaarat,
      media_poistettu: mediaPoistettu, auth_poistettu: authPoistettu,
      varoituksia: manifesti.varoitukset.length,
    };
  });

// ── EXPORT: viePelaajanDataGDPR (GDPR Art. 20, koneluettava) ─────────────────────
// Params: { seuraId, pelaajaId, muoto='json' }. Kerää manifesti → lukee kaiken → JSON Storageen →
// signed URL (24 h). Audit gdpr_export/info. Huoltajan oma-export = TODO (erillinen authz-haara).
exports.viePelaajanDataGDPR = functions
  .region('europe-west1')
  .https.onCall(async (data, context) => {
    if (!context.auth) {
      throw new functions.https.HttpsError('unauthenticated', 'Kirjaudu sisään.');
    }
    const seuraId   = data && data.seuraId;
    const pelaajaId = data && data.pelaajaId;
    const muoto     = (data && data.muoto) ? String(data.muoto) : 'json';   // TODO: csv myöhemmin
    if (!seuraId || !pelaajaId) {
      throw new functions.https.HttpsError('invalid-argument', 'seuraId ja pelaajaId pakollisia.');
    }
    const oikeus = await tarkistaOikeus(context.auth.uid, seuraId);
    if (!oikeus.sallittu) {
      throw new functions.https.HttpsError('permission-denied', `Ei oikeuksia seuralle "${seuraId}".`);
    }
    // TODO: huoltajan oma-export (rekisteröidyn/edustajan pyyntö, Art. 15/20) — oma authz-haara, myöhempi laajennus.

    const FieldPath = admin.firestore.FieldPath;
    const manifesti = await keraaPelaajanManifesti(db, seuraId, pelaajaId, { FieldPath });
    if (!manifesti.loytyi) {
      throw new functions.https.HttpsError('not-found', 'Pelaajaa ei löydy.');
    }

    const dataMap = (arr) => (arr || []).map((x) => Object.assign({ _id: x.id }, x.data));
    const soloAli = manifesti.solo
      ? Object.keys(manifesti.solo.alikokoelmat).reduce((o, k) => { o[k] = dataMap(manifesti.solo.alikokoelmat[k]); return o; }, {})
      : null;
    const vienti = {
      _meta: { standardi: 'GDPR Art. 20 (koneluettava)', luotu: new Date().toISOString(),
        seuraId, pelaajaId, palloID: manifesti.palloID, viejaUid: context.auth.uid, lukumaarat: manifesti.lukumaarat },
      pelaaja: Object.assign({ _id: manifesti.paaDoc.id }, manifesti.paaDoc.data),
      havainnot: dataMap(manifesti.alikokoelmat.havainnot),
      kirjaukset: dataMap(manifesti.alikokoelmat.kirjaukset),
      testitulokset: dataMap(manifesti.alikokoelmat.testitulokset),
      biologinen_ika: dataMap(manifesti.alikokoelmat.biologinen_ika),
      pelidata: dataMap(manifesti.alikokoelmat.pelidata),
      kehut: dataMap(manifesti.alikokoelmat.kehut),
      lasnaolo: dataMap(manifesti.ristiviitteet.lasnaolo),
      testitapahtuma_tulokset: dataMap(manifesti.ristiviitteet.testitapahtuma_tulokset),
      palloID_viitteet: dataMap(manifesti.ristiviitteet.palloID_viitteet),
      solo: manifesti.solo ? Object.assign({ _id: manifesti.solo.id }, manifesti.solo.data, { _alikokoelmat: soloAli }) : null,
      media: manifesti.media,
    };

    // Toimitus: JSON Storageen + signed URL (24 h). Iso data → ei inline.
    const ts    = new Date().toISOString().replace(/[:.]/g, '-');
    const polku = `gdpr_exports/${seuraId}/${pelaajaId}_${ts}.json`;
    let url = null;
    let vanhenee = null;
    try {
      const bucket = admin.storage().bucket();
      const file   = bucket.file(polku);
      await file.save(JSON.stringify(vienti, null, 2), { contentType: 'application/json', resumable: false });
      const expires = Date.now() + 24 * 60 * 60 * 1000;
      const [signed] = await file.getSignedUrl({ action: 'read', expires });
      url = signed;
      vanhenee = new Date(expires).toISOString();
    } catch (e) {
      throw new functions.https.HttpsError('internal',
        `Export-tiedoston kirjoitus/allekirjoitus epäonnistui: ${e.message}`);
    }

    await db.collection('audit').add(Object.assign(
      rakennaAuditPayload({ tyyppi: 'gdpr_export', severity: 'info', seuraId, pelaajaId,
        requesterUid: context.auth.uid, rooli: oikeus.rooli, lukumaarat: manifesti.lukumaarat, varoitukset: manifesti.varoitukset }),
      { muoto, polku, aikaleima: admin.firestore.FieldValue.serverTimestamp() },
    )).catch(() => {});

    console.log(`[viePelaajanDataGDPR] ${seuraId}/${pelaajaId} → ${polku} (${muoto})`);
    return { url, vanhenee, muoto, lukumaarat: manifesti.lukumaarat, varoituksia: manifesti.varoitukset.length };
  });
