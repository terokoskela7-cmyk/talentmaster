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
const crypto    = require('crypto');
const { kayttajaRooliSallittu, kayttajaRooliClaimeista, tunnisteTyyppi, kuittausPaatos } = require('./authz_paatos');   // pure authz-päätös (#71, PR 3, testattava)
const { keraaPelaajanManifesti, rakennaAuditPayload, OMA_KIRJAUS_PSEUDONYMISOINTI } = require('./gdpr_locator');   // GDPR RTBF/export -locator (#96)
const { kaavioKohdistuuServer } = require('./kaavio_policy');   // kaavion kohdistus (peili lib/tm_kaavio_policy.js)
const auditloki = require('./auditloki');   // haeAuditLoki: suodattimet + sivutus (SA)
const pelaajapin = require('./pelaajapin');
const { rakennaSendGridPayload } = require('./sahkoposti_payload');   // SendGrid-seuranta pois (§39)
const huoltajaemail = require('./huoltajaemail');   // Rules v3.33: huoltajaEmail vain palvelimella
const suostumuskortit = require('./suostumuskortit');   // PR B: QR-suostumuskortit   // PR 4: PIN vain palvelimella (asetaPelaajanPin / luoPinitSeuralle)
const suostumusTarkistus = require('./suostumus_tarkistus');
const { suostumusAnnettu, suostumusTilaKutsunJalkeen } = require('./suostumus');   // kanoninen suostumusehto (1.10.2026)   // sisarusbugi: lomake vs tunnisteen pelaaja
const valmennusapuri = require('./valmennusapuri');
const { onPaikkamerkkiOsoite } = require('./paikkamerkki');   // paikkamerkkidomainien esto (1.10.2026)
const pelaajakirjautuminen = require('./pelaajakirjautuminen');   // Vaihe 0 / PR 1: PalloID + PIN → custom token           // Valmennusapuri-pilotti (Vaihe 2): ohjeistus+tietopohja palvelimella
if (!admin.apps.length) {
  admin.initializeApp();
}
const db   = admin.firestore();
const auth = admin.auth();

// ─────────────────────────────────────────────────────────────────────────────
// KANONINEN LINKKIBASE (V4). Frontendillä on location.href (vrt. Seura.html
// _rekBaseUrl), CF:llä ei → backendin generoimat käyttäjälinkit tarvitsevat
// vakion. YKSI määritelmä; aiemmin sama URL oli kovakoodattuna kahdeksassa
// kohdassa (suostumus · reset · continue · muistutus · SOLO).
//
// ⚠ EI projektialipolkua. Pages oli Project Pages ja tarjoili muodosta
// <kayttaja>.github.io/<repo>/Sivu.html; custom domain tarjoilee JUURESTA
// (talentmasterid.com/Sivu.html). Repo-segmentin jättäminen tuottaisi 404:n —
// tämä ei siis ole pelkkä host-swap. (Kirjoitettu tässä ilman kirjaimellista
// vanhaa polkua, jotta portin grep pysyy nollassa myös kommenttien osalta.)
//
// Env-override esim. stagingia varten; oletus = tuotannon custom domain.
// ─────────────────────────────────────────────────────────────────────────────
const TM_BASE_URL = (process.env.TM_BASE_URL || 'https://talentmasterid.com').replace(/\/+$/, '');
// ─────────────────────────────────────────────────────────────────────────────
// APUFUNKTIO: Lähetä sähköposti SendGridin HTTP API:n kautta
// ─────────────────────────────────────────────────────────────────────────────
async function lahetaSahkoposti({ to, subject, html, fromName }) {
  const apiKey    = process.env.SENDGRID_API_KEY;
  // Ei salainen → oletus koodissa: CI-deploy (deploy-functions.yml) ei luo functions/.env-tiedostoa,
  // joten ilman oletusta lähettäjä oli tyhjä ja jokainen lähetys kaatui "SendGrid-credentiaalit puuttuvat".
  const fromEmail = process.env.SENDGRID_FROM_EMAIL || 'noreply@talentmasterid.com';
  // Avaimesta EI lokiteta mitään osaa — vain OK/PUUTTUU (vartija: tests/functions_ei_avaimia_lokiin.test.js).
  const avainTila = apiKey ? 'OK' : 'PUUTTUU';
  console.log('[SendGrid] SENDGRID_API_KEY:', avainTila);
  console.log('[SendGrid] SENDGRID_FROM_EMAIL:', fromEmail || 'PUUTTUU');
  if (!apiKey || !fromEmail) {
    throw new Error(
      'SendGrid-credentiaalit puuttuvat. ' +
      'SENDGRID_API_KEY=' + (apiKey ? 'OK' : 'TYHJÄ') + ' ' +
      'SENDGRID_FROM_EMAIL=' + (fromEmail ? 'OK' : 'TYHJÄ')
    );
  }
  // Seuranta (klikki/avaus/tilaus/GA) POIS — perustelu functions/sahkoposti_payload.js (§39 + salasanatoken).
  // ÄLÄ lisää tracking_settings-kenttää tähän; vartija tests/sendgrid_seuranta_pois.test.js.
  const payload = JSON.stringify(rakennaSendGridPayload({ to, fromEmail, fromName, subject, html }));
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
// Seuran nimi AINA palvelimelta (seurat/{seuraId}.nimi) — selaimen `seura`-arvoon ei luoteta
// (muuten seuran tunnuksella voi lähettää viestin toisen seuran nimissä).
async function haeSeuraNimi(seuraId) {
  try {
    const snap = await db.collection('seurat').doc(seuraId).get();
    const nimi = snap.exists ? String((snap.data() || {}).nimi || '').trim() : '';
    if (nimi) return nimi;
  } catch (e) {
    console.warn('[haeSeuraNimi] Haku epäonnistui:', e.message);
  }
  return seuraId;
}
// ─────────────────────────────────────────────────────────────────────────────
// APUFUNKTIO: Tarkista oikeus
// ─────────────────────────────────────────────────────────────────────────────
async function tarkistaOikeus(kutsujaUid, kohdeSeuraId, token) {   // token (context.auth.token) valinnainen: VP tunnistetaan myös claimeista (korjaus-PR 2)
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
  const kayttajaData = kayttajaDoc.exists ? kayttajaDoc.data() : null;
  if (kayttajaDoc.exists) {
    // VP mukaan: seuralla voi olla useita VP:itä, mutta vp_uid osoittaa vain yhteen (rivi 111).
    // Ilman tätä seuran 2. VP ei saa kutsu-/reset-/muistutusoikeuksia. (Sibbo-bugi 2026-06-29.)
    // Pure päätös (testattava) eristetty → ./authz_paatos (deaktivoitu vp = ei oikeuksia).
    const sallittuRooli = kayttajaRooliSallittu(kayttajaDoc.data());
    if (sallittuRooli) {
      return { sallittu: true, rooli: sallittuRooli };
    }
  }
  /* Korjaus-PR 2: ei vp_uid-osumaa eikä sallittua kayttajat-dokumenttia → custom claimit (rooli + seuraId; palvelimen asettamat). Dokumentti ratkaisee jos se on olemassa
     (deaktivoitu / alennettu rooli → ei oikeuksia); vain puuttuva dokumentti (kesken jäänyt luoKayttaja, vapautettu vp_uid) → claimi. */
  const claimRooli = kayttajaRooliClaimeista(token, kohdeSeuraId, kayttajaData);
  if (claimRooli) return { sallittu: true, rooli: claimRooli };
  return { sallittu: false, rooli: null };
}
// ─────────────────────────────────────────────────────────────────────────────
// APUFUNKTIOT: henkilökunnan pääsyn hallinta (P0 1.10.2026)
// Deaktivointi tehtiin ennen selaimesta (kayttajat.aktiivinen=false), mutta Rules lukevat oikeudet
// CLAIMEISTA eikä aktiivinen-kenttää tarkisteta → deaktivoitu käyttäjä säilytti pääsynsä. Nyt pääsy
// poistetaan Authista: disabled + claimit tyhjäksi + refresh-tokenit mitätöity.
// ─────────────────────────────────────────────────────────────────────────────
async function onSuperAdminUid(uid) {
  if (!uid) return false;
  const d = await db.collection('admins').doc(uid).get();
  const x = d.exists ? (d.data() || {}) : null;
  return !!(x && (x.superAdmin === true || x.rooli === 'super_admin' || x.rooli === 'superadmin'));
}
const _authEiLoydy = (e) => !!(e && (e.code === 'auth/user-not-found' || (e.errorInfo && e.errorInfo.code === 'auth/user-not-found')));
async function poistaKirjautumisoikeus(uid) {
  try {
    await auth.updateUser(uid, { disabled: true });
    await auth.setCustomUserClaims(uid, {});
    await auth.revokeRefreshTokens(uid);
    return { authOlemassa: true };
  } catch (e) {
    if (_authEiLoydy(e)) return { authOlemassa: false };
    throw e;
  }
}
/* tarkistaOikeus myöntää oikeudet seuran vp_uid-kentän perusteella tarkistamatta aktiivinen-kenttää →
   deaktivoitu/poistettu VP vapautetaan vp_uid:stä. */
async function vapautaVpUid(seuraId, uid) {
  const sRef = db.collection('seurat').doc(seuraId);
  const sDoc = await sRef.get();
  if (sDoc.exists && sDoc.get('vp_uid') === uid) await sRef.update({ vp_uid: null });
}
/* Yhteinen tarkistus deaktivoinnille/aktivoinnille/poistolle: kutsuja = SA tai seuran johto (tarkistaOikeus),
   kohde on seuran kayttajat-dokumentti, johto ei kohdista SA:han eikä itseensä. Palauttaa { oikeus, kRef, kDoc }. */
async function tarkistaKayttajaToimenpide(context, kohdeUid, seuraId, vainSA) {
  if (!context.auth) throw new functions.https.HttpsError('unauthenticated', 'Kirjaudu ensin.');
  if (!kohdeUid || !seuraId) throw new functions.https.HttpsError('invalid-argument', 'kohdeUid ja seuraId pakollisia.');
  const oikeus = await tarkistaOikeus(context.auth.uid, seuraId, context.auth.token);
  if (!oikeus.sallittu || (vainSA && oikeus.rooli !== 'superadmin')) {
    throw new functions.https.HttpsError('permission-denied', 'Ei oikeutta tähän käyttäjään.');
  }
  if (kohdeUid === context.auth.uid) {
    throw new functions.https.HttpsError('failed-precondition', 'Omaa tunnusta ei voi muuttaa tällä toiminnolla.');
  }
  if (await onSuperAdminUid(kohdeUid)) {
    throw new functions.https.HttpsError('permission-denied', 'Super-adminin tunnusta ei voi muuttaa tällä toiminnolla.');
  }
  const kRef = db.collection('seurat').doc(seuraId).collection('kayttajat').doc(kohdeUid);
  const kDoc = await kRef.get();
  if (!kDoc.exists) throw new functions.https.HttpsError('not-found', 'Käyttäjää ei löydy tästä seurasta.');
  if (kDoc.get('seuraId') && kDoc.get('seuraId') !== seuraId) {
    throw new functions.https.HttpsError('permission-denied', 'Käyttäjän seura ei täsmää.');
  }
  return { oikeus, kRef, kDoc };
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
/* Väliaikainen salasana uudelle Auth-tilille (luoKayttaja, haeOrLuoHuoltajaAuth). Kukaan ei näe sitä — käyttäjä
   asettaa oman salasanan reset-linkillä — mutta se on voimassa siihen asti. Math.random (8 merkkiä [0-9A-Z]) ei
   ole kryptografinen → crypto.randomBytes, 144 bittiä. */
function uusiValiaikainenSalasana() {
  return 'TM_' + crypto.randomBytes(18).toString('base64url');
}
/* Paikkamerkkiosoite (talentmaster.fi, example.com …) → hylätään ennen kuin Auth-tiliä haetaan tai luodaan. */
function estaPaikkamerkkiOsoite(email) {
  if (onPaikkamerkkiOsoite(email)) {
    throw new functions.https.HttpsError('failed-precondition', 'paikkamerkki_osoite',
      { syy: 'paikkamerkki_osoite', viesti: 'Esimerkkiosoite – korvaa oikealla sähköpostiosoitteella.' });
  }
}
async function haeOrLuoHuoltajaAuth(hEmail, etunimi, sukunimi) {
  estaPaikkamerkkiOsoite(hEmail);
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
  const valiaikainenSalasana = uusiValiaikainenSalasana();
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
const { pohjaHeader, pohjaFooter, pohjaRekisteriKutsu, pohjaMuistutus, pohjaPelaajaSivu, pohjaSalasanaAsetus, pohjaSuostumusLinkki, pohjaSoloLupa } = require('./sahkoposti_pohjat');
const { otsikkoPuhdas, rakennaKutsuLinkki } = require('./sahkoposti_turva');
const { muodostaPalauteNotif } = require('./palaute_notif');
const { huomisenRajat } = require('./helsinki_paiva');
const { muistutusPaatos, muutosPaatos, kirjoitaNotif } = require('./kalenteri_notif');   // V2 P0.4: kiinteät dokumenttitunnisteet + tapahtuma_alkaa
// ─────────────────────────────────────────────────────────────────────────────
// lahetaRekisteriKutsu
// ─────────────────────────────────────────────────────────────────────────────
exports.lahetaRekisteriKutsu = functions
  .region('europe-west1')
  .runWith({ secrets: ['SENDGRID_API_KEY'] })
  // SENDGRID_API_KEY: Secret Manager (runWith yllä) → process.env. SENDGRID_FROM_EMAIL: oletus koodissa (lahetaSahkoposti).
  // (deploy_functions.yml), kuten ANTHROPIC/OPENAI. EI runWith({secrets}): GitHub Actions -SA:lta
  // puuttuu secretmanager.versions.get → deploy-aikainen Secret Manager -validointi kaatuu (403).
  .https.onCall(async (data, context) => {
    if (!context.auth) {
      throw new functions.https.HttpsError('unauthenticated', 'Kirjaudu ensin.');
    }
    const { hEmail, linkki: linkkiSelain, etunimi, sukunimi, joukkue } = data;
    if (!hEmail || !linkkiSelain) {
      throw new functions.https.HttpsError('invalid-argument', 'hEmail ja linkki ovat pakollisia.');
    }
    /* Vaihe 0 / PR 3: pelkkä context.auth EI riitä — anonyymi (julkinen avain) lähetti seuran nimissä
       sähköpostia mielivaltaisella linkillä. Vain seuran johto / SA (tarkistaOikeus). seuraId datasta
       tai henkilökunnan tokenista (vanha Seura-sivu ei lähettänyt sitä). */
    const seuraId = String(data.seuraId || (context.auth.token && context.auth.token.seuraId) || '').trim();
    if (!seuraId || !(await tarkistaOikeus(context.auth.uid, seuraId, context.auth.token)).sallittu) {
      throw new functions.https.HttpsError('permission-denied', 'Ei oikeutta lähettää kutsuja tämän seuran nimissä.');
    }
    estaPaikkamerkkiOsoite(hEmail);   // ei kutsua eikä audit-riviä esimerkkiosoitteeseen
    const pelaajaNimi = [etunimi, sukunimi].filter(Boolean).join(' ') || 'pelaaja';
    // Seuran nimi palvelimelta (viesti, fromName, linkki) — selaimen `seura` ohitetaan.
    const seuraNimi   = await haeSeuraNimi(seuraId);
    // Selaimen linkkiä EI käytetä sellaisenaan: palvelin rakentaa TM_BASE_URL + sallitut parametrit
    // (seuraId ja seura ylikirjoitetaan tarkistetuilla / palvelimen arvoilla).
    let linkki;
    try { linkki = rakennaKutsuLinkki(linkkiSelain, TM_BASE_URL, { seuraId, seura: seuraNimi }); }
    catch (e) { throw new functions.https.HttpsError('invalid-argument', 'Virheellinen kutsulinkki.'); }
    // Sisarusbugi: audit-riville AINA pelaajaId (datasta tai linkin pelaajaId-parametrista).
    let pelaajaIdKutsu = data.pelaajaId ? String(data.pelaajaId) : null;
    if (!pelaajaIdKutsu) { try { pelaajaIdKutsu = new URL(String(linkki)).searchParams.get('pelaajaId'); } catch (e) { pelaajaIdKutsu = null; } }
    const joukkueNimi = await haeJoukkueNimi(seuraId, joukkue);
    try {
      await lahetaSahkoposti({
        to: hEmail,
        subject: `${seuraNimi} — Rekisteröintikutsu TalentMaster-järjestelmään`,
        fromName: seuraNimi,
        html: pohjaRekisteriKutsu({ seuraNimi, pelaajaNimi, joukkueNimi, linkki }),
      });
      await db.collection('audit').add({
        toiminto: 'rekisterikutsu_lahetetty', severity: 'info',
        hEmail, pelaajaNimi, seura: seuraNimi, seuraId, pelaajaId: pelaajaIdKutsu,
        tekija_uid: context.auth.uid,
        aikaleima: admin.firestore.FieldValue.serverTimestamp(),
      }).catch(() => {});
      // Rules v3.33: suostumusTila → 'odottaa' VAIN palvelimella (ennen Seura-sivu kirjoitti selaimesta).
      // Annettua ei koskaan alenneta. Epäonnistuminen ei kaada jo lähetettyä kutsua.
      if (pelaajaIdKutsu) {
        try {
          const pRef = db.collection('seurat').doc(seuraId).collection('pelaajat').doc(String(pelaajaIdKutsu));
          const pSnap = await pRef.get();
          const paiv = pSnap.exists ? suostumusTilaKutsunJalkeen(pSnap.data() || {}) : null;
          if (paiv) await pRef.update(Object.assign(paiv, { muokattu: admin.firestore.FieldValue.serverTimestamp() }));
        } catch (e) { console.error('[lahetaRekisteriKutsu] suostumusTila-päivitys:', e.message); }
      }
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
    const oikeus = await tarkistaOikeus(context.auth.uid, seuraId, context.auth.token);
    if (!oikeus.sallittu) {
      throw new functions.https.HttpsError('permission-denied', 'Ei oikeutta tähän seuraan.');
    }
    const dry = !!kuivaAjo;
    const seuraDoc = await db.collection('seurat').doc(seuraId).get();
    const seuraNimi = (seuraDoc.exists && seuraDoc.data().nimi) || seuraId;
    const baseUrl = TM_BASE_URL;

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
    // Vaihe 0 / PR 3: vain seuran johto / SA — anonyymi loi kutsuja minkä tahansa seuran alle.
    if (!(await tarkistaOikeus(context.auth.uid, seuraId, context.auth.token)).sallittu) {
      throw new functions.https.HttpsError('permission-denied', 'Ei oikeutta tähän seuraan.');
    }
    estaPaikkamerkkiOsoite(huoltajaEmail);   // ei kutsudokumenttia esimerkkiosoitteelle
    const suostumusLinkki =
      `${TM_BASE_URL}/` +
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
    const { email, rooli, seuraId, etunimi, sukunimi, joukkue, joukkueNimi,
            joukkueet: joukkueetIn, joukkueetNimet: joukkueetNimetIn, joukkueNimet: joukkueNimetVanha,
            suuntakoodi, puhelin } = data || {};
    if (!email || !email.includes('@')) {
      throw new functions.https.HttpsError('invalid-argument', 'Virheellinen sähköposti.');
    }
    estaPaikkamerkkiOsoite(email);
    if (!rooli)   throw new functions.https.HttpsError('invalid-argument', 'Rooli pakollinen.');
    if (!seuraId) throw new functions.https.HttpsError('invalid-argument', 'Seura pakollinen.');
    const oikeus = await tarkistaOikeus(kutsujaUid, seuraId, context.auth && context.auth.token);
    if (!oikeus.sallittu) {
      throw new functions.https.HttpsError('permission-denied',
        `Ei oikeuksia seuralle "${seuraId}".`);
    }
    /* HOTFIX 1.10.2026 — oikeuksien korotus: rooli meni tarkistamatta claimeihin, ja Rules pitää claimia
       rooli:'super_admin'/'superadmin' super-adminina → seuran johto pystyi tekemään kenestä tahansa (myös
       itsestään, olemassa olevan sähköpostin kautta) super-adminin. Nyt vain seuran henkilöstöroolit. */
    if (!SALLITUT_ROOLIT_VAIHTO.includes(rooli)) {
      await db.collection('audit').add({
        toiminto: 'kayttaja_rooli_estetty', severity: 'alert', yritetty_rooli: String(rooli).slice(0, 40),
        seuraId, tekija_uid: kutsujaUid, lahde: 'luoKayttaja',
        aikaleima: admin.firestore.FieldValue.serverTimestamp(),
      }).catch(() => {});
      throw new functions.https.HttpsError('invalid-argument', `Virheellinen rooli: ${String(rooli).slice(0, 40)}`);
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
      /* Haamuvalmentaja (1.10.2026): SA-tunnukselle EI luoda seuran kayttajat-dokumenttia eikä sen claimeja
         ylikirjoiteta seuraroolilla. SA näkee kaiken ilman seurajäsenyyttä. */
      if (await onSuperAdminUid(uid)) {
        throw new functions.https.HttpsError('failed-precondition', 'sa_tunnus',
          { syy: 'sa_tunnus', viesti: 'Super-admin-tunnusta ei lisätä seuran henkilöstöön.' });
      }
      /* Toisen seuran käyttäjä (1.10.2026): claimeissa on yksi seuraId, ja Rules avaavat datan sen mukaan
         (onOmaSeura). Ylikirjoitus siirtäisi henkilön hiljaa tähän seuraan ja katkaisisi pääsyn hänen omaan
         seuraansa. Estetään ennen kirjoituksia → ei puolivalmista tilaa (dokumentti ilman claimeja). */
      const vanhaSeura = (olemassaOleva.customClaims || {}).seuraId;
      if (vanhaSeura && vanhaSeura !== seuraId) {
        await db.collection('audit').add({
          toiminto: 'kayttaja_toisen_seuran_estetty', severity: 'alert', kohde_uid: uid, kohde_email: email,
          seuraId, toinen_seuraId: vanhaSeura, tekija_uid: kutsujaUid, lahde: 'luoKayttaja',
          aikaleima: admin.firestore.FieldValue.serverTimestamp(),
        }).catch(() => {});
        throw new functions.https.HttpsError('failed-precondition', 'toisen_seuran_kayttaja',
          { syy: 'toisen_seuran_kayttaja',
            viesti: 'Tämä sähköposti on jo toisen seuran henkilöstössä. Sama tunnus voi toimia vain yhdessä seurassa — käytä eri sähköpostia tai ota yhteyttä TalentMaster-tukeen.' });
      }
      console.log(`[luoKayttaja] ${email} löytyi jo Authista (uid: ${uid}) — lisätään rooli ${rooli} seuralle ${seuraId}`);
    } catch (e) {
      if (e instanceof functions.https.HttpsError) throw e;
      // auth/user-not-found on normaali tapaus — luodaan uusi tili
      if (e.errorInfo && e.errorInfo.code !== 'auth/user-not-found') {
        throw new functions.https.HttpsError('internal', `Auth-haku epäonnistui: ${e.message}`);
      }
      const valiaikainenSalasana = uusiValiaikainenSalasana();
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
    /* Kayttajat-dokumentti luodaan VAIN täällä (Rules v3.32: selaimen create estetty). Seura-sivun kutsu
       välittää joukkueet[] + nimet + puhelimen, jotka se ennen kirjoitti selaimesta perään.
       Kanoninen kenttä on joukkueetNimet (Seura-muokkaus kirjoittaa ja Master lukee sitä). #693 kirjoitti
       väärällä nimellä joukkueNimet → otetaan vastaan molemmat, kirjoitetaan vain kanoninen. */
    const nimetIn = Array.isArray(joukkueetNimetIn) ? joukkueetNimetIn : joukkueNimetVanha;
    const jIds = Array.isArray(joukkueetIn) ? joukkueetIn.filter((x) => typeof x === 'string' && x).slice(0, 30)
      : (joukkue ? [joukkue] : []);
    const jNimet = Array.isArray(nimetIn) ? nimetIn.map((x) => String(x || '').slice(0, 80)).slice(0, 30)
      : (joukkueNimi ? [joukkueNimi] : []);
    try {
      await db.collection('seurat').doc(seuraId)
        .collection('kayttajat').doc(uid).set({
          uid, email, etunimi: etunimi || '', sukunimi: sukunimi || '',
          nimi: etunimi && sukunimi ? `${etunimi} ${sukunimi}` : (etunimi || email),
          rooli, seuraId,
          joukkue: joukkue || jIds[0] || null, joukkueNimi: joukkueNimi || jNimet[0] || null,
          joukkueet: jIds, joukkueetNimet: jNimet,
          suuntakoodi: String(suuntakoodi || '+358').slice(0, 6),
          puhelin: String(puhelin || '').replace(/[^\d]/g, '').slice(0, 15),
          aktiivinen: true, luotu: nyt, kutsuttu: nyt, luonut_uid: kutsujaUid,
          kutsuja: (context.auth.token && context.auth.token.email) || '',
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
      const kohdeUrl  = `${TM_BASE_URL}/${kohdeSimu}`;
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
      toiminto: 'kayttaja_luotu', severity: 'info', kohde_uid: uid, kohde_email: email,
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
const SALLITUT_ROOLIT_VAIHTO = ['vp', 'valmentaja', 'talenttivalmentaja', 'urheilutoimenjohtaja', 'seurasihteeri', 'testivastaava',
  'fysiikkavalmentaja', 'fysioterapeutti'];   // P0: Adminin roolivalikon roolit (Admin käyttää nyt tätä callablea)
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
    const oikeus = await tarkistaOikeus(kutsujaUid, seuraId, context.auth && context.auth.token);
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
    // P0: johto ei vaihda omaa eikä super-adminin roolia; deaktivoidulle ei palauteta claimeja roolinvaihdolla.
    if (oikeus.rooli !== 'superadmin' && uid === kutsujaUid) {
      throw new functions.https.HttpsError('failed-precondition', 'Omaa roolia ei voi vaihtaa.');
    }
    if (await onSuperAdminUid(uid)) {
      throw new functions.https.HttpsError('permission-denied', 'Super-adminin roolia ei voi vaihtaa.');
    }
    if (kDoc.data().aktiivinen === false) {
      throw new functions.https.HttpsError('failed-precondition', 'Käyttäjä on deaktivoitu — aktivoi ensin.');
    }
    const vanhaRooli = kDoc.data().rooli || null;

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

    await db.collection('audit').add({
      toiminto: 'rooli_vaihdettu', severity: 'info', kohde_uid: uid, seuraId,
      vanha_rooli: vanhaRooli, uusi_rooli: uusiRooli, tekija_uid: kutsujaUid,
      aikaleima: admin.firestore.FieldValue.serverTimestamp(),
    }).catch(() => {});
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
    const oikeus = await tarkistaOikeus(kutsujaUid, seuraId, context.auth && context.auth.token);
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
      toiminto: 'testipvm_korjattu', severity: 'info',
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
    const oikeus = await tarkistaOikeus(context.auth.uid, seuraId, context.auth.token);
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
      const kohdeUrl = `${TM_BASE_URL}/TalentMaster_Seura.html`;
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
    const { kohdeUid, seuraId } = data || {};
    const { kRef } = await tarkistaKayttajaToimenpide(context, kohdeUid, seuraId, false);
    const { authOlemassa } = await poistaKirjautumisoikeus(kohdeUid);
    await vapautaVpUid(seuraId, kohdeUid);
    await kRef.update({
      aktiivinen: false,
      deaktivoitu: admin.firestore.FieldValue.serverTimestamp(),
      deaktivoija_uid: context.auth.uid,
      claimsAsetettu: false,
    });
    await db.collection('audit').add({
      toiminto: 'kayttaja_deaktivoitu', severity: 'info', kohde_uid: kohdeUid,
      seuraId, tekija_uid: context.auth.uid, auth_olemassa: authOlemassa,
      aikaleima: admin.firestore.FieldValue.serverTimestamp(),
    }).catch(() => {});
    return { ok: true, viesti: 'Käyttäjä deaktivoitu: kirjautuminen estetty ja oikeudet poistettu.' };
  });

/* aktivoiKayttaja (P0): SA tai seuran johto. Auth käyttöön, claimit Firestoren rooli + seuraId -kentistä. */
exports.aktivoiKayttaja = functions
  .region('europe-west1')
  .https.onCall(async (data, context) => {
    const { kohdeUid, seuraId } = data || {};
    const { kRef, kDoc } = await tarkistaKayttajaToimenpide(context, kohdeUid, seuraId, false);
    const rooli = kDoc.get('rooli');
    if (!rooli) throw new functions.https.HttpsError('failed-precondition', 'Käyttäjällä ei ole roolia — aseta rooli ensin.');
    // HOTFIX 1.10.2026: dokumentin rooli palautetaan claimeihin vain, jos se on seuran henkilöstörooli (ei super_admin)
    if (!SALLITUT_ROOLIT_VAIHTO.includes(rooli)) {
      throw new functions.https.HttpsError('failed-precondition', `Rooli "${String(rooli).slice(0, 40)}" ei ole sallittu seuraroolina.`);
    }
    try {
      await auth.updateUser(kohdeUid, { disabled: false });
    } catch (e) {
      if (_authEiLoydy(e)) throw new functions.https.HttpsError('not-found', 'Käyttäjän kirjautumistiliä ei ole — luo käyttäjä uudelleen.');
      throw e;
    }
    await auth.setCustomUserClaims(kohdeUid, { rooli, seuraId });
    if (rooli === 'vp') {   // palauta seuran vp_uid vain jos se on tyhjä (ei syrjäytetä toista VP:tä)
      const sRef = db.collection('seurat').doc(seuraId);
      const sDoc = await sRef.get();
      if (sDoc.exists && !sDoc.get('vp_uid')) await sRef.update({ vp_uid: kohdeUid });
    }
    await kRef.update({
      aktiivinen: true,
      aktivoitu: admin.firestore.FieldValue.serverTimestamp(),
      aktivoija_uid: context.auth.uid,
      claimsAsetettu: true,
    });
    await db.collection('audit').add({
      toiminto: 'kayttaja_aktivoitu', severity: 'info', kohde_uid: kohdeUid, rooli,
      seuraId, tekija_uid: context.auth.uid,
      aikaleima: admin.firestore.FieldValue.serverTimestamp(),
    }).catch(() => {});
    return { ok: true, viesti: 'Käyttäjä aktivoitu. Hän voi kirjautua uudelleen.' };
  });

/* poistaKayttaja (P0): VAIN SA. Ensin pääsy pois (kuten deaktivointi), sitten Auth-tili ja kayttajat-dokumentti. */
exports.poistaKayttaja = functions
  .region('europe-west1')
  .https.onCall(async (data, context) => {
    const { kohdeUid, seuraId } = data || {};
    const { kRef } = await tarkistaKayttajaToimenpide(context, kohdeUid, seuraId, true);
    const { authOlemassa } = await poistaKirjautumisoikeus(kohdeUid);
    await vapautaVpUid(seuraId, kohdeUid);
    if (authOlemassa) {
      try { await auth.deleteUser(kohdeUid); } catch (e) { if (!_authEiLoydy(e)) throw e; }
    }
    await kRef.delete();
    await db.collection('audit').add({
      toiminto: 'kayttaja_poistettu', severity: 'warn', kohde_uid: kohdeUid,
      seuraId, tekija_uid: context.auth.uid, auth_olemassa: authOlemassa,
      aikaleima: admin.firestore.FieldValue.serverTimestamp(),
    }).catch(() => {});
    return { ok: true, viesti: 'Käyttäjä poistettu pysyvästi.' };
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
    /* Vaihe 0 / PR 3 — KRIITTINEN: funktiossa EI ollut kirjautumistarkistusta, ja se PALAUTTI
       salasanan asetuslinkin kutsujalle → kuka tahansa sai reset-linkin mille tahansa tilille
       (myös henkilökunnan: haeOrLuoHuoltajaAuth palauttaa olemassa olevan käyttäjän).
       Nyt: vain seuran johto / SA, hEmail = pelaajan tallennettu huoltajaEmail, eikä linkkiä
       palauteta (se menee vain huoltajan sähköpostiin). */
    if (!context.auth) {
      throw new functions.https.HttpsError('unauthenticated', 'Kirjaudu ensin.');
    }
    const { hEmail, pelaajaId, seuraId, etunimi, sukunimi, joukkue } = data || {};
    if (!hEmail || !pelaajaId || !seuraId) {
      throw new functions.https.HttpsError('invalid-argument',
        'hEmail, pelaajaId ja seuraId ovat pakollisia.');
    }
    // Paikkamerkki ennen kaikkea muuta: alla haeOrLuoHuoltajaAuth-virhe niellään ja sähköposti lähtisi silti.
    estaPaikkamerkkiOsoite(hEmail);
    if (!(await tarkistaOikeus(context.auth.uid, seuraId, context.auth.token)).sallittu) {
      throw new functions.https.HttpsError('permission-denied', 'Ei oikeutta tähän seuraan.');
    }
    const pelSnap = await db.collection('seurat').doc(seuraId).collection('pelaajat').doc(pelaajaId).get();
    const tallennettu = pelSnap.exists ? String(pelSnap.get('huoltajaEmail') || '').trim().toLowerCase() : '';
    if (!tallennettu || tallennettu !== String(hEmail).trim().toLowerCase()) {
      throw new functions.https.HttpsError('failed-precondition',
        'Sähköposti ei vastaa pelaajan tallennettua huoltajasähköpostia. Tallenna huoltajan sähköposti ensin.');
    }
    const pelaajaNimi = [etunimi, sukunimi].filter(Boolean).join(' ') || 'pelaaja';
    const seuraNimi   = await haeSeuraNimi(seuraId);   // palvelimelta, ei selaimen `seura`-arvoa
    const joukkueNimi = await haeJoukkueNimi(seuraId, joukkue);
    const baseUrl = TM_BASE_URL;
    // PR 4: henkilökohtainen linkki ?p=&seura= (Pelaaja_v7 → pelkkä PIN-näppäimistö), ei nimiä URL:iin.
    const pelaajaLinkki = `${baseUrl}/TalentMaster_Pelaaja_v7.html` +
      `?p=${encodeURIComponent(pelaajaId)}&seura=${encodeURIComponent(seuraId)}`;
    const pd = pelSnap.data() || {};
    // Suostumus ennen kirjautumista (1.10.2026): ilman suostumusta PIN ei toimi → ei sähköpostiin.
    const pinNyt = (suostumusAnnettu(pd) && pd.pin != null && /^(\d{4}|\d{6})$/.test(String(pd.pin))) ? String(pd.pin) : null;
    const palloIdNyt = pelaajakirjautuminen.pelaajanPalloId(pd);
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
          salasanaLinkki, vanhempiLinkki, pelaajaLinkki, hEmail, palloId: palloIdNyt, pin: pinNyt,
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
      return { ok: true, linkki: pelaajaLinkki, salasanaLinkkiLahetetty: !!salasanaLinkki };
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
// Lisäksi luo/hakee huoltajan Auth-tilin ja LÄHETTÄÄ salasanan asetuslinkin + pelaajan PIN:in
// huoltajan sähköpostiin (url PAKOLLINEN, muuten 500, ks. §13). PR 3b: linkkiä/PIN:iä EI palauteta.
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
            syntyma, sukupuoli, suostumukset, suostumusMap, antajaRooli, aikaleima, etunimi } = data || {};
    if (!seuraId || !pelaajaId || !hEmail) {
      throw new functions.https.HttpsError('invalid-argument',
        'seuraId, pelaajaId ja hEmail ovat pakollisia.');
    }
    /* Suostumuksen antajan nimi pakollinen (1.10.2026): lomakkeen huoltajakortti ei näkynyt koskaan, joten
       alaikäisten suostumuksista puuttui antaja. Kanoninen kenttä = suostumus.antaja (EI enää suostumuksenAntaja;
       lukijat käyttävät sitä vain vanhan datan varalla). */
    const antajaNimi = String(antaja == null ? '' : antaja).replace(/\s+/g, ' ').trim();
    if (!antajaNimi) {
      throw new functions.https.HttpsError('invalid-argument', 'antaja_puuttuu', { syy: 'antaja_puuttuu' });
    }
    /* P1 (1.10.2026): julkiselta lomakkeelta tuleva vapaa teksti näytetään henkilökunnan sivuilla → ei HTML:ää,
       enintään 100 merkkiä. Hylätään (ei siivota hiljaa), jotta lomake voi pyytää korjausta. */
    if (antajaNimi.length > 100 || /[<>]/.test(antajaNimi)) {
      throw new functions.https.HttpsError('invalid-argument', 'antaja_virheellinen', { syy: 'antaja_virheellinen' });
    }
    // Syvyyssuojaus (Sibbo-korjaus): mikä tahansa odottamaton poikkeus → spesifi, lokitettu
    // viesti, ei paljasta "internal":ia vanhemmalle. HttpsError-koodit menevät läpi sellaisenaan.
    try {
    const hEmailNorm = String(hEmail).trim().toLowerCase();

    // 2. Varmenna huoltajan sähköposti Admin SDK:lla pelaajadokumentista
    const pelRef = db.collection('seurat').doc(seuraId)
      .collection('pelaajat').doc(pelaajaId);
    let snap;
    try {
      snap = await pelRef.get();
    } catch (e) {
      throw new functions.https.HttpsError('unavailable',
        'Pelaajan tietojen luku epäonnistui, yritä hetken kuluttua uudelleen.');
    }
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
      // syy-koodi lomakkeelle (QR-kortti, 1.10.2026): selkeä ohje, EI tallennettua osoitetta.
      throw new functions.https.HttpsError('permission-denied',
        'Huoltajan sähköposti ei täsmää pelaajan tietoihin.', { syy: 'email_ristiriita' });
    }

    /* 2b. Sisarusbugi (30.9.2026): sähköposti täsmää myös SISARUKSELLE (sama huoltaja). Lomakkeen etunimi ja
       syntymävuosi verrataan tunnisteen osoittamaan pelaajaan ENNEN kirjoituksia (salliva täsmäys,
       functions/suostumus_tarkistus.js). Hylätään vain, jos MOLEMMAT eroavat → ei kirjoituksia, audit (warn,
       ei nimiä), failed-precondition 'pelaaja_ristiriita'. Yksittäinen poikkeama → hyväksytään + lomake_poikkeama. */
    const kohde = suostumusTarkistus.tarkistaSuostumusKohde(snap.data() || {}, { etunimi, syntyma, sukupuoli });
    if (kohde.ristiriita) {
      await db.collection('audit').add({
        toiminto: 'suostumus_estetty_pelaaja_ristiriita', severity: 'warn',
        pelaajaId, seuraId, syyt: kohde.syyt,
        aikaleima: admin.firestore.FieldValue.serverTimestamp(),
      }).catch(() => {});
      throw new functions.https.HttpsError('failed-precondition', 'pelaaja_ristiriita', { syy: 'pelaaja_ristiriita' });
    }

    /* 2c. Avoimet kutsut (1.10.2026): käytetty tai korvattu kutsu EI saa ylikirjoittaa annettua suostumusta.
       - kutsuId annettu ja kutsu löytyy: kutsun on oltava avoin (odottaa/lahetetty/luotu) ja samalle pelaajalle.
       - ei (löytyvää) kutsua = vanha tunnisteeton linkki: hylätään, jos suostumus on jo annettu.
       Uusi kutsu ("Lähetä uudelleen") on avoin → uusi suostumus sallitaan sen kautta. Ei kirjoituksia ennen tätä. */
    const AVOIMET_KUTSUTILAT = ['odottaa', 'lahetetty', 'luotu'];
    const joAnnettu = suostumusAnnettu(snap.data());
    let kutsuRef = null;
    let kutsuTyyppi = null;   // 'qr_kortti' → suostumus.lahde + audit (PR B)
    if (kutsuId) {
      const kr = db.collection('seurat').doc(seuraId).collection('kutsut').doc(String(kutsuId));
      const ks = await kr.get();
      if (ks.exists) {
        kutsuRef = kr;
        const kd = ks.data() || {};
        kutsuTyyppi = kd.tyyppi || null;
        if (kd.pelaajaId && kd.pelaajaId !== pelaajaId) {
          await db.collection('audit').add({ toiminto: 'suostumus_estetty_kutsu_ristiriita', severity: 'warn', pelaajaId, seuraId,
            kutsuId: String(kutsuId), aikaleima: admin.firestore.FieldValue.serverTimestamp() }).catch(() => {});
          throw new functions.https.HttpsError('failed-precondition', 'kutsu_ristiriita', { syy: 'kutsu_ristiriita' });
        }
        if (!AVOIMET_KUTSUTILAT.includes(kd.tila || 'odottaa')) {
          await db.collection('audit').add({ toiminto: 'suostumus_estetty_kutsu_kaytetty', severity: 'warn', pelaajaId, seuraId,
            kutsuId: String(kutsuId), kutsun_tila: String(kd.tila || ''), aikaleima: admin.firestore.FieldValue.serverTimestamp() }).catch(() => {});
          throw new functions.https.HttpsError('failed-precondition', 'kutsu_kaytetty', { syy: 'kutsu_kaytetty' });
        }
      }
    }
    if (!kutsuRef && joAnnettu) {
      await db.collection('audit').add({ toiminto: 'suostumus_estetty_jo_annettu', severity: 'info', pelaajaId, seuraId,
        kutsuId_annettu: !!kutsuId, aikaleima: admin.firestore.FieldValue.serverTimestamp() }).catch(() => {});
      throw new functions.https.HttpsError('failed-precondition', 'suostumus_jo_annettu', { syy: 'suostumus_jo_annettu' });
    }

    // 3. Merkitse suostumus annetuksi + kirjoita ei-arkaluonteiset aux-kentät palvelinpuolella.
    const TS = admin.firestore.FieldValue.serverTimestamp();
    // P1: lomakkeen muut merkkijonot/rakenteet siivotaan (julkinen lomake → näkyy henkilökunnan sivuilla).
    const SUOSTUMUS_AVAIMET = ['rekisteri', 'tietosuoja', 'testaaminen', 'biologinen_ika', 'valmentajajako', 'anon_data'];
    const puhdasTeksti = (v, max) => (v == null || v === '') ? null : String(v).replace(/[<>]/g, '').slice(0, max);
    const pituusNumero = (v) => { const n = typeof v === 'number' ? v : parseFloat(v); return (isFinite(n) && n >= 100 && n <= 250) ? n : null; };
    const puhdasSuostumusMap = (suostumusMap && typeof suostumusMap === 'object' && !Array.isArray(suostumusMap))
      ? SUOSTUMUS_AVAIMET.reduce((o, k) => { if (k in suostumusMap) o[k] = suostumusMap[k] === true; return o; }, {})
      : null;
    const paivitys = {
      suostumusTila:    'annettu',
      suostumusAnnettu: TS,
      tila:             'aktiivinen',
      muokattu:         TS,
    };
    /* Tyhjä = "ei muutosta" (1.10.2026): valinnainen kenttä kirjoitetaan VAIN kun lomakkeella on arvo —
       tyhjä lomakekenttä ei nollaa tallennettua arvoa (sama periaate kuin syntymäajan täytössä). */
    const teksti = puhdasTeksti(suostumusTeksti, 500);
    if (teksti != null) paivitys.suostumusTeksti = teksti;
    if (bioPituudet && typeof bioPituudet === 'object') {
      const isa = pituusNumero(bioPituudet.isa_pituus_cm), aiti = pituusNumero(bioPituudet.aiti_pituus_cm);
      if (isa != null) paivitys.isa_pituus_cm = isa;
      if (aiti != null) paivitys.aiti_pituus_cm = aiti;
      if (isa != null || aiti != null) {
        const pvm = puhdasTeksti(bioPituudet.vanhempi_pituus_pvm, 40);
        if (pvm != null) paivitys.vanhempi_pituus_pvm = pvm;
      }
      // puuttuu-lippu lopputilasta (tallennettu + uusi), ei pelkästä lomakkeesta
      const isaLopuksi = isa != null ? isa : (snap.get('isa_pituus_cm') != null ? snap.get('isa_pituus_cm') : null);
      const aitiLopuksi = aiti != null ? aiti : (snap.get('aiti_pituus_cm') != null ? snap.get('aiti_pituus_cm') : null);
      paivitys.vanhempi_pituus_puuttuu = (isaLopuksi == null || aitiLopuksi == null);
    }

    // huoltajaEmail — vahvistus että varmennettu osoite tallentuu pelaajaprofiiliin
    paivitys.huoltajaEmail = hEmailNorm;

    /* syntymäaika + sukupuoli (sisarusbugi 30.9.2026): suostumus saa VAIN TÄYTTÄÄ tyhjän kentän — ei koskaan
       ylikirjoittaa olemassa olevaa eri arvolla (muutos tehdään Seura-sivulla henkilökunnan toimesta).
       Date.UTC() (§7 #11), vain validi 1990–2025; sukupuoli P/T → M/N (§7 #12). */
    const tt = kohde.tayttoKentat;
    if (tt.syntymaPaiva) paivitys.syntymaaika = admin.firestore.Timestamp.fromDate(tt.syntymaPaiva);
    if (tt.syntymaVuosi) paivitys.syntymaVuosi = tt.syntymaVuosi;
    if (tt.sukupuoli) paivitys.sukupuoli = tt.sukupuoli;

    // suostumukset — array kaikista hyväksytyistä suostumuksista + täysi suostumus-objekti
    // (sama rakenne kuin uusi-rekisteröinti-haaran .set(), §14: raakadata talteen).
    if (Array.isArray(suostumukset)) paivitys.suostumukset = suostumukset.filter((x) => SUOSTUMUS_AVAIMET.includes(x));
    paivitys.suostumus = {
      ...(kutsuTyyppi === 'qr_kortti' ? { lahde: 'qr_kortti' } : {}),
      annettu:     TS,
      antaja:      antajaNimi,
      antajaRooli: antajaRooli === 'itse' ? 'itse' : (antajaRooli ? 'huoltaja' : null),
      versio:      '2026-v1',
      hyvaksytyt:  puhdasSuostumusMap,
      aikaleima:   puhdasTeksti(aikaleima, 40),
    };

    // PIN: käytä olemassa olevaa validia (idempotentti; sama logiikka kuin Seura.html luoPelaajaPIN). UUDEN PIN:in generointi (Firestore-kyselyt)
    // siirretty kriittisen update-kirjoituksen JÄLKEEN best-effortiksi (Sibbo-korjaus) — ei-kriittinen
    // PIN-haku ei saa enää kaataa pelaajan aktivointia.
    // PR 4: olemassa oleva 4- tai 6-numeroinen PIN kelpaa sellaisenaan (ei kirjoiteta uudelleen).
    let pin = (snap.get('pin') && /^(\d{4}|\d{6})$/.test(String(snap.get('pin')))) ? String(snap.get('pin')) : null;

    try {
      await pelRef.update(paivitys);
    } catch (e) {
      throw new functions.https.HttpsError('internal',
        `Suostumuksen tallennus epäonnistui: ${e.message}`);
    }

    // PIN-generointi best-effort — pelaaja on jo aktivoitu yllä, tämä ei saa kaataa mitään (Sibbo-korjaus).
    // PR 4: 6-numeroinen PIN samalla apufunktiolla kuin asetaPelaajanPin (hajautus + selväkielinen samassa
    // erässä, lukitukset nollataan). Yksilöllisyyttä seuran sisällä ei enää tarvita (kirjautumisessa aina
    // PalloID tai linkki mukana).
    if (!pin) {
      try {
        const uusi = pelaajapin.generoiPin();
        const b = db.batch();
        pelaajapin.lisaaPinKirjoitukset(db, b, { seuraId, pelaajaId, data: snap.data() || {}, pin: uusi, lahde: 'vahvistaSuostumus', TS });
        await b.commit();
        pin = uusi;
      } catch (e) {
        pin = null;
        console.warn('[vahvistaSuostumus] PIN-generointi epäonnistui (ei-kriittinen):', e.message);
      }
    }

    // 3b. Merkitse kutsu hyväksytyksi ja saman pelaajan MUUT avoimet kutsut korvatuiksi (best-effort —
    //     kutsujen tila ei saa kaataa jo tallennettua suostumusta). Korvattu kutsu ei enää kelpaa (2c).
    if (kutsuRef) {
      try {
        await kutsuRef.update({ tila: 'hyvaksytty', hyvaksyttyPvm: TS, pelaajaId, muokattu: TS });
      } catch (e) {
        console.warn('[vahvistaSuostumus] kutsut-update epäonnistui:', e.message);
      }
    }
    try {
      const muut = await db.collection('seurat').doc(seuraId).collection('kutsut').where('pelaajaId', '==', pelaajaId).get();
      const b = db.batch();
      let n = 0;
      muut.docs.forEach((d) => {
        if (kutsuRef && d.id === kutsuRef.id) return;
        if (!AVOIMET_KUTSUTILAT.includes((d.data() || {}).tila || 'odottaa')) return;
        b.update(d.ref, { tila: 'korvattu', korvattu: TS, korvattu_kutsulla: kutsuRef ? kutsuRef.id : null, muokattu: TS });
        n++;
      });
      if (n) await b.commit();
    } catch (e) {
      console.warn('[vahvistaSuostumus] muiden kutsujen korvaus epäonnistui:', e.message);
    }

    // Onboarding-integriteetti B1 — suostumus annettu (best-effort). Autentikoimaton sivu → uid usein null,
    // siksi kirjataan hEmail jäljitettävyyttä varten (antajan nimeä EI audit-riville, vain antajaNimi_annettu).
    db.collection('audit').add({
      // Sisarusbugi: yksittäinen poikkeama (etunimi TAI vuosi) hyväksytään, mutta kirjataan warn-tasolla,
      // jotta seura voi tarkistaa tiedot jälkikäteen (esim. kaksoset samalla kutsulinkillä).
      toiminto: 'suostumus_annettu', severity: kohde.poikkeama.length ? 'warn' : 'info',
      pelaajaId, seuraId, hEmail: hEmailNorm, antajaNimi_annettu: !!antajaNimi,   // ei nimeä audit-riville
      lomakeEtunimi_tasmasi: kohde.etunimiTasmasi,   // true/false/null (ei nimeä)
      lomake_poikkeama: kohde.poikkeama,             // [] | ['etunimi'] | ['vuosi']
      tekija_uid: (context.auth && context.auth.uid) || null,
      aikaleima: admin.firestore.FieldValue.serverTimestamp(),
      ...(kutsuTyyppi === 'qr_kortti' ? { lahde: 'qr_kortti' } : {}),   // QR-suostumuskortti (PR B)
    }).catch(() => {});

    // 4. + 5. Luo/hae huoltajan Auth-tili ja generoi salasanan asetuslinkki.
    // Suostumus on jo tallennettu — linkin generoinnin epäonnistuminen ei saa
    // hukata sitä (graceful: emailLahetetty:false → sivu ohjaa pyytämään seuralta uuden linkin).
    try {
      const etunimi  = snap.get('etunimi')  || '';
      const sukunimi = snap.get('sukunimi') || '';
      await haeOrLuoHuoltajaAuth(hEmailNorm, etunimi, sukunimi);
      const baseUrl = TM_BASE_URL;
      const continueUrl = `${baseUrl}/TalentMaster_Vanhempi_v2.html` +
        `?pelaajaId=${encodeURIComponent(pelaajaId)}&seuraId=${encodeURIComponent(seuraId)}`;
      const passwordResetLink = await auth.generatePasswordResetLink(hEmailNorm, {
        url: continueUrl,
        handleCodeInApp: false,
      });
      // 6. Lähetä salasanalinkki sähköpostiin (best-effort §13). EI kaadeta suostumusta jos lähetys
      //    epäonnistuu — suostumus on jo tallennettu yllä; seura lähettää linkin uudelleen (Seura.html).
      let emailLahetetty = false, emailVirhe = null;
      try {
        const lapsiNimi = String(snap.get('etunimi') || '').trim();
        await lahetaSahkoposti({
          to: hEmailNorm,
          subject: 'Aseta TalentMaster-salasanasi',
          fromName: 'TalentMaster',
          html: pohjaSuostumusLinkki({ lapsiNimi, resetLinkki: passwordResetLink, pin }),
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
      /* Vaihe 0 / PR 3b: salasanalinkkiä ja PIN:iä EI palauteta kutsujalle. Funktio toimii ilman
         kirjautumista, ja seuraId + pelaajaId + huoltajaEmail olivat anonyymisti luettavissa v3.28:aan
         asti → vastauksesta sai huoltajan tilin ja lapsen PIN:in. Nyt ne menevät VAIN tallennettuun
         huoltajaEmailiin (tarkistettu yllä). Epäonnistunut lähetys → seura lähettää uudelleen. */
      return { ok: true, emailLahetetty, emailVirhe };
    } catch (e) {
      console.warn('[vahvistaSuostumus] Reset-linkki epäonnistui:', e.message);
      return { ok: true, emailLahetetty: false, linkkiVirhe: e.message };
    }
    } catch (_wrapErr) {
      if (_wrapErr instanceof functions.https.HttpsError) throw _wrapErr;
      console.error('[vahvistaSuostumus] odottamaton virhe:', _wrapErr);
      throw new functions.https.HttpsError('internal',
        'Palvelinvirhe: ' + ((_wrapErr && _wrapErr.message) || _wrapErr));
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
    /* Suodattimet + sivutus (functions/auditloki.js): toiminto + aikaväli Firestore-kyselynä,
       seura / taso / kirjautumisrivit palvelimella sivutetun skannauksen yli (ei katoavia rivejä).
       Kursori `seuraava` → `jalkeen` seuraavalla kutsulla. */
    const s = auditloki.normalisoiSuodatin(data);
    const { rivit, seuraava, skannattu } = await auditloki.haeAuditRivit(db, s);
    return { ok: true, rivit, n: rivit.length, seuraava, skannattu };
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
    const oikeus = await tarkistaOikeus(context.auth.uid, seuraId, context.auth.token);
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
// AI PROXY — SULJETTU
// ============================================================
// Suljettu 2.10.2026 — EU:n ulkopuolinen siirto. Korvaaja: EU-tekoälyreitti (suunnitteilla).
// Aiempi toteutus (OpenAI / Anthropic / Gemini -reititys, Whisper) poistettu: yksikään pyyntö ei lähde
// EU:n ulkopuolisille tekoälyrajapinnoille. Export jää toistaiseksi, jotta vanhat selainversiot saavat
// selkeän 410:n eivätkä 404:ää. Ei runWith({secrets}) → mitään avainta ei bindata tähän funktioon.
// Valmennusapuri (Bedrock EU) on erillinen funktio eikä kulje tämän kautta.
exports.aiProxy = functions
  .region('europe-west1')
  .https.onRequest((req, res) => {
    res.status(410).json({ virhe: 'ai_pois_kaytosta' });
  });

// ─────────────────────────────────────────────────────────────────────────────
// haeLapsiHuoltajalle — resolvoi vanhemman lapsi/lapset autentikoidusta emailista.
// Vanhempi-appi kutsuu tätä loginin jälkeen kun linkkiä (?seura=&uid=) ei ole.
// Client EI voi tehdä tätä: Rules estävät cross-seura-haun eikä huoltajalla ole
// seuraId-claimia. Admin SDK ohittaa Rulesit. Turvallinen: palauttaa VAIN ne lapset
// joiden huoltajaEmail == kutsujan autentikoitu (Firebase Auth lowercasaa) email.
// Vaatii collectionGroup-indeksin pelaajat.huoltajaEmail (firestore.indexes.json).
// ─────────────────────────────────────────────────────────────────────────────
/* Lapsenvaihdin (1.10.2026): deterministinen järjestys — vanhin ensin (syntymaVuosi nouseva), sitten etunimi.
   Ilman järjestystä "ensimmäinen lapsi" oli satunnainen. Puuttuva syntymävuosi → loppuun. */
function jarjestaHuoltajanLapset(lapset) {
  return lapset.slice().sort((a, b) => {
    const ya = a.syntymaVuosi == null ? Infinity : a.syntymaVuosi;
    const yb = b.syntymaVuosi == null ? Infinity : b.syntymaVuosi;
    if (ya !== yb) return ya - yb;
    return String(a.etunimi).localeCompare(String(b.etunimi), 'fi') || String(a.uid).localeCompare(String(b.uid));
  });
}
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
      const lapset = jarjestaHuoltajanLapset(snap.docs
        // collectionGroup osuu myös juuritason pelaajat/{palloID}-kokoelmaan → vain seurat/{sid}/pelaajat
        .filter((d) => d.ref.parent.parent && d.ref.parent.parent.parent && d.ref.parent.parent.parent.id === 'seurat')
        .map((d) => {
          const x = d.data();
          const vuosi = (x.syntymaVuosi == null || x.syntymaVuosi === '') ? NaN : Number(x.syntymaVuosi);
          return {
            seura:       d.ref.parent.parent.id,
            uid:         d.id,
            etunimi:     x.etunimi  || '',
            sukunimi:    x.sukunimi || '',
            joukkueNimi: x.joukkueNimi || x.joukkue || '',
            syntymaVuosi: Number.isFinite(vuosi) ? vuosi : null,
          };
        }));
      return { found: lapset.length > 0, lapset };
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
      // Antajan etunimi PALVELIMELTA (kayttajat/{tekija_uid}.etunimi), ei selaimelta; puuttuu → rooli selkokielellä.
      let tekijaEtunimi = '', tekijaRooli = palaute.tekija_rooli || '';
      if (palaute.tekija_uid) {
        try {
          const tk = await db.collection('seurat').doc(sid).collection('kayttajat').doc(palaute.tekija_uid).get();
          if (tk.exists) { const d = tk.data() || {}; tekijaEtunimi = d.etunimi || ''; tekijaRooli = d.rooli || tekijaRooli; }
        } catch (e) { console.warn('[notifPalauteJaettu] tekijän haku epäonnistui:', e.message); }
      }
      const viesti = muodostaPalauteNotif({
        tekijaEtunimi, tekijaRooli, onAani: !!palaute.audio_url, pvm: arv.pvm, joukkue: arv.joukkue,
      });
      await db.collection('seurat').doc(sid).collection('kayttajat').doc(valmentajaUid).collection('notifikaatiot').add({
        tyyppi: 'palaute',
        teksti: viesti.teksti,
        tekija_etunimi: viesti.tekija_etunimi,   // rakenteiset kentät: käännös (sv) ei vaadi tekstin jäsentämistä
        onAani: viesti.onAani,
        joukkue: viesti.joukkue,
        pvm: viesti.pvm,
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
    const appUrl = `${TM_BASE_URL}/`;
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
const SOLO_BASE_URL = TM_BASE_URL;
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

// soloLupapyyntoEmail — lapsi (anon/kirjautumaton) loi lupapyynnon → CF lähettää vanhemmalle magic-linkin.
/* PR 4 · Solo-lupapyynnön token: päädokumentissa vain SHA-256 (token_hash). Vanhoissa pyynnöissä
   selväkielinen `token`. Palauttaa kelpaavan tokenin tai null. */
function soloTokenHash(token) {
  return require('crypto').createHash('sha256').update('tm-solo-lupa:' + String(token)).digest('hex');
}
function soloLupaToken(d, annettu) {
  if (!d) return null;
  if (d.token_hash) return (annettu && soloTokenHash(annettu) === d.token_hash) ? String(annettu) : null;
  if (d.token) return (annettu == null || String(annettu) === d.token) ? String(d.token) : null;   // vanha pyyntö
  return null;
}

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
    /* PR 4: uusi lupapyyntö tallentaa vain token_hash:n (tulos/{token} ei saa olla luettavissa päädokumentista).
       Lapsen laite antaa tokenin tässä kutsussa → tarkistetaan hashia vasten. Vanha pyyntö: d.token. */
    const token = soloLupaToken(d, data && data.token);
    if (!token) throw new functions.https.HttpsError('permission-denied', 'Virheellinen vahvistustunnus.');
    const linkki = SOLO_BASE_URL + '/TalentMaster_Solo_Lupa.html?r=' + encodeURIComponent(requestId) + '&t=' + encodeURIComponent(token);
    try {
      await lahetaSahkoposti({
        to: email,
        subject: 'Lapsesi pyytää lupaa — TalentMaster Player™',
        fromName: 'TalentMaster Player',
        html: pohjaSoloLupa({ child_etunimi: d.child_etunimi, linkki }),
      });
      await ref.set({ email_lahetetty_pvm: admin.firestore.FieldValue.serverTimestamp() }, { merge: true }).catch(() => {});
      await db.collection('audit').add({
        toiminto: 'solo_lupapyynto_email', severity: 'info', requestId, parent_email: email,
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
    if (!soloLupaToken(d, token)) throw new functions.https.HttpsError('permission-denied', 'Virheellinen vahvistustunnus.');
    const tulosRef = ref.collection('tulos').doc(String(token));
    // Idempotentti: jo hyväksytty → palauta olemassa olevat tiedot (tulos/{token}, vanha pyyntö päädokista).
    if (d.status === 'hyvaksytty' && d.playerId) {
      const t = await tulosRef.get();
      const td = t.exists ? (t.data() || {}) : {};
      const ex = await db.collection('players').doc(d.playerId).get();
      return { playerId: d.playerId, child_pin: td.child_pin || d.child_pin || null,
        playerCode: td.playerCode || (ex.exists ? (ex.data().playerCode || null) : null) };
    }
    if (d.status !== 'odottaa') throw new functions.https.HttpsError('failed-precondition', 'Pyyntö on jo käsitelty.');

    const TS = admin.firestore.FieldValue.serverTimestamp();
    const playerRef = db.collection('players').doc();
    const playerId = playerRef.id;
    const code = await soloVaraaPlayerCode(uid, playerId);
    const child_pin = pelaajapin.generoiPin();   // PR 4: 6 numeroa, crypto.randomInt, ei triviaaleja

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
    // PR 4: hajautus heti (soloLapsiKirjaudu käyttää sitä; selväkielinen child_pin jää jakamista varten).
    batch.set(db.collection('_soloPin').doc(playerId), { hash: pelaajakirjautuminen.hajautaPin(child_pin), luotu: TS, lahde: 'soloHyvaksyLupa' });
    /* PR 4: tulos (PIN + koodi) ALIDOKUMENTTIIN tulos/{token}. Päädokumentti on get:if true -luettava pelkällä
       requestId:llä, joten siinä ei saa olla PIN:iä eikä koodia. Token on vain lapsen laitteella ja
       vanhemman linkissä (päädokissa vain token_hash). Vanhan pyynnön selväkielinen token poistetaan. */
    batch.set(tulosRef, { playerId, playerCode: code, child_pin, luotu: TS });
    batch.set(ref, { status: 'hyvaksytty', playerId, hyvaksyja_uid: uid, hyvaksytty_pvm: TS,
      token: admin.firestore.FieldValue.delete(), token_hash: soloTokenHash(token) }, { merge: true });
    await batch.commit();

    await db.collection('audit').add({ toiminto: 'solo_lupa_hyvaksytty', severity: 'info', requestId, playerId, hyvaksyja_uid: uid, aikaleima: TS }).catch(() => {});
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
    const oikeus = await tarkistaOikeus(context.auth.uid, seuraId, context.auth.token);
    if (!oikeus.sallittu) {
      throw new functions.https.HttpsError('permission-denied',
        `Ei oikeuksia seuralle "${seuraId}". RTBF vaatii SA:n tai seuran johdon (vp/seurasihteeri/UTJ).`);
    }

    const manifesti = await keraaPelaajanManifesti(db, seuraId, pelaajaId);

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
    // 2b) Pseudonymisointi: seuran omien tavoitteiden kirjaukset jäävät (seuran tilasto), pelaajaId JA huomio
    //     tyhjennetään (vapaassa huomiossa voi olla pelaajan nimi)
    const nollattavat = (manifesti.ristiviitteet.omat_kirjaukset || []).map((x) => x.ref).filter(Boolean);
    for (let i = 0; i < nollattavat.length; i += 400) {
      const batch = db.batch();
      nollattavat.slice(i, i + 400).forEach((r) => batch.update(r, OMA_KIRJAUS_PSEUDONYMISOINTI));
      await batch.commit();
    }
    // 2c) Kausikuvat: poista pelaajan rivi pelaajat[]-listasta transaktiossa (muut rivit ja kentät säilyvät)
    for (const kk of (manifesti.ristiviitteet.kausikuvat || [])) {
      if (!kk.ref) continue;
      await db.runTransaction(async (tx) => {
        const s = await tx.get(kk.ref);
        if (!s.exists) return;
        const lista = Array.isArray(s.data().pelaajat) ? s.data().pelaajat : [];
        const uusi = lista.filter((p) => !(p && p.id === pelaajaId));
        if (uusi.length !== lista.length) tx.update(kk.ref, { pelaajat: uusi });
      });
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
      /* Prefiksi EI riitä: kuvat kirjoitettiin polkuun `havainnot/pre_<aikaleima>/…`, ei
         havainnon id:n alle, joten per-havainto-prefiksi ei löytänyt niitä ja GDPR-poisto jätti
         ne Storageen. Poistetaan siksi myös media[]-kentästä johdetut objektipolut. */
      for (const polku of (manifesti.storagePolut || [])) {
        await bucket.file(polku).delete().catch((e) => {
          if (e && e.code === 404) return;   // jo poistettu — ei virhe
          mediaPoistettu = false;
          console.warn('[poistaPelaajaGDPR] Storage polku ' + polku + ': ' + e.message);
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
    const oikeus = await tarkistaOikeus(context.auth.uid, seuraId, context.auth.token);
    if (!oikeus.sallittu) {
      throw new functions.https.HttpsError('permission-denied', `Ei oikeuksia seuralle "${seuraId}".`);
    }
    // TODO: huoltajan oma-export (rekisteröidyn/edustajan pyyntö, Art. 15/20) — oma authz-haara, myöhempi laajennus.

    const manifesti = await keraaPelaajanManifesti(db, seuraId, pelaajaId);
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
      omat_kirjaukset: dataMap(manifesti.ristiviitteet.omat_kirjaukset),
      kausikuvat: dataMap(manifesti.ristiviitteet.kausikuvat),   // vain pelaajan oma rivi per kausi (locator)
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

// ═══════════════════════════════════════════════════════════════════════════
// P7-c.4a — KULUTTAJA-KALENTERINOTIFIT (NOTIFIKAATIOT_JA_MOBIILI.md §B, T5–T6).
// CF (admin SDK) kirjoittaa seurat/{sid}/pelaajat/{pid}/notifikaatiot; pelaaja/vanhempi lukee + merkitsee luetuksi.
// ⚠️ Roster-kohdennus NORMALISOIDULLA slug-täsmäyksellä (kuin _p7EvKuuluu c.1-fix) + pelaajat_id — tapahtuman
// joukkue on slug ("kpv_u13"), pelaajan joukkue näyttönimi ("KPV U13") mutta joukkueet[] slug → normalisoi molemmat.
// GDPR: notifin teksti = tapahtuman nimi/aika/paikka; EI terveys-/poissaolosyytä.
// ═══════════════════════════════════════════════════════════════════════════
function _c4Norm(s) { return String(s == null ? '' : s).toLowerCase().replace(/[\s_]+/g, ''); }

async function _c4Roster(sid, ev) {
  const eKeys = new Set([ev.joukkue].concat(ev.joukkueet || []).filter(Boolean).map(_c4Norm));
  const pids = new Set(ev.pelaajat_id || []);
  const snap = await db.collection('seurat').doc(sid).collection('pelaajat').get();
  const roster = [];
  snap.forEach(function (doc) {
    const p = doc.data() || {};
    if (pids.has(doc.id)) { roster.push(Object.assign({ id: doc.id }, p)); return; }
    const pKeys = [p.joukkue, p.joukkueId].concat(p.joukkueet || []).filter(Boolean).map(_c4Norm);
    if (pKeys.some(function (k) { return eKeys.has(k); })) roster.push(Object.assign({ id: doc.id }, p));
  });
  return roster;
}

// Opt-out (per käyttäjä / per tyyppi). Oletus päällä. Hiljaiset tunnit koskevat push/email (c.4b/c) — in-app
// kirjoitetaan aina (badge), joten hiljaiset tunnit eivät pudota in-app-notifia.
function _c4OptOut(p, tyyppi) {
  const a = (p && p.notif_asetukset && p.notif_asetukset.inapp) || {};
  if (a.enabled === false) return true;
  if (a.tyypit && a.tyypit[tyyppi] === false) return true;
  return false;
}

// T5 · Tuleva tapahtuma -muistutus — joka päivä klo 17 (Europe/Helsinki) → huomisen tapahtumat rosterille.
exports.notifTapahtumaMuistutus = functions
  .region('europe-west1')
  .pubsub.schedule('0 17 * * *')
  .timeZone('Europe/Helsinki')
  .onRun(async () => {
    // "Huominen" = Europe/Helsinki-vuorokausi (ajoympäristö on UTC → getDate() olisi UTC-päivä). Ks. helsinki_paiva.js.
    const rajat = huomisenRajat(new Date());
    const alku = admin.firestore.Timestamp.fromDate(rajat.alku);
    const loppu = admin.firestore.Timestamp.fromDate(rajat.loppu);
    const seurat = await db.collection('seurat').get();
    for (const s of seurat.docs) {
      const sid = s.id;
      const kal = await db.collection('seurat').doc(sid).collection('kalenteri')
        .where('alkaa', '>=', alku).where('alkaa', '<=', loppu).get().catch(function () { return { docs: [] }; });
      for (const evDoc of kal.docs) {
        const e = evDoc.data() || {};
        if (e.poistettu) continue;
        const roster = await _c4Roster(sid, e);
        if (!roster.length) continue;
        const paatos = muistutusPaatos(e);
        const notifCol = (pid) => db.collection('seurat').doc(sid).collection('pelaajat').doc(pid).collection('notifikaatiot');
        for (const p of roster) {
          if (_c4OptOut(p, 'muistutus')) continue;
          await kirjoitaNotif(notifCol(p.id), paatos, evDoc.id, admin.firestore.FieldValue).catch(function (err) { console.warn('[c4 muistutus]', err && err.message); });
        }
      }
    }
    return null;
  });

// T6 · Tapahtuma peruttu / muuttunut — onUpdate: poistettu:true TAI alkaa/paikka muuttuu → notif rosterille.
exports.notifKalenteriMuutos = functions
  .region('europe-west1')
  .firestore.document('seurat/{sid}/kalenteri/{tapahtumaId}')
  .onUpdate(async (change, context) => {
    const before = change.before.data() || {};
    const after = change.after.data() || {};
    const sid = context.params.sid;
    const evId = context.params.tapahtumaId;
    const paatos = muutosPaatos(before, after, new Date());   // vartija: päättymiseen, ei alkuun (koko päivän + kesken oleva ilmoitetaan)
    if (!paatos) return null;
    const roster = await _c4Roster(sid, after);
    const notifCol = (pid) => db.collection('seurat').doc(sid).collection('pelaajat').doc(pid).collection('notifikaatiot');
    for (const p of roster) {
      if (_c4OptOut(p, paatos.tyyppi)) continue;
      await kirjoitaNotif(notifCol(p.id), paatos, evId, admin.firestore.FieldValue).catch(function (err) { console.warn('[c4 muutos]', err && err.message); });
    }
    return null;
  });


// ─────────────────────────────────────────────────────────────────────────────
// KAAVIO ERÄ D2 — pelaajan "ymmärretty"-kuittaus.
//
// MIKSI CLOUD FUNCTION: `review.ymmarretty` asuu VP:n omistamalla kaavio-dokumentilla, ja
// firestore.rules EI salli pelaajan kirjoittaa kaavioon (update on valmentaja/johto/SA, lisäksi
// optimistinen versiolukko). Admin SDK ohittaa säännöt → tämä on ainoa tapa kirjata kuittaus
// ilman että kaavio-dokumentti avataan pelaajan kirjoituksille.
//
// IDENTITEETTI (Vaihe 0 / PR 3): VERIFIOITU palvelintokenista. Pelaaja kirjautuu pelaajaKirjaudu-
// funktiolla (custom token { rooli:'pelaaja', pelaajaSeuraId, pelaajaId }); pyynnön seura+pelaaja
// on täsmättävä tokeniin (authz_paatos.kuittausPaatos). Henkilökunta: tarkistaOikeus. Anonyymi ja
// Solo-lapsi → permission-denied. (Ennen PR 3:a identiteetti oli asserted: anonyymi PIN-istunto.)
// Kuittaus on silti pehmeä sitoutumissignaali, EI compliance-portti.
//
// MITÄ CF SILTI TAKAA (tämä on sen arvo, ei identiteetti):
//   1. KIRJOITUSEHEYS — kiinteä dot-path `review.ymmarretty.<pid>`; mitään muuta kenttää ei voi
//      koskea riippumatta siitä mitä client lähettää. Ei versiobumppia, ei spec-clobberausta.
//   2. ESIEHDOT — kaavion on oltava olemassa ja HYVÄKSYTTY; pelaajan on oltava olemassa;
//      kaavion on KOHDISTUTTAVA pelaajaan. Väärinkäyttöpinta kaventuu kohdistuviin kaavioihin.
exports.kuittaaKaavioYmmarretty = functions
  .region('europe-west1')
  .https.onCall(async (data, context) => {
    if (!context.auth) throw new functions.https.HttpsError('unauthenticated', 'Kirjaudu ensin.');
    const seuraId   = String((data && data.seuraId) || '').trim();
    const kaavioId  = String((data && data.kaavioId) || '').trim();
    const pelaajaId = String((data && data.pelaajaId) || '').trim();
    if (!seuraId || !kaavioId || !pelaajaId)
      throw new functions.https.HttpsError('invalid-argument', 'seuraId, kaavioId ja pelaajaId ovat pakollisia.');
    /* Vaihe 0 / PR 3: pelkkä context.auth EI riitä (anonyymi kirjautuminen onnistuu, kunnes provider
       suljetaan). Pelaajatoken: identiteetti TOKENISTA, vain oma kaavio. Henkilökunta: tarkistaOikeus.
       Anonyymi / Solo-lapsi / toisen pelaajan puolesta → permission-denied. */
    const paatos = kuittausPaatos(context.auth, seuraId, pelaajaId);
    if (paatos === 'evatty')
      throw new functions.https.HttpsError('permission-denied', 'Pelaaja voi kuitata vain oman kaavionsa.');
    if (paatos === 'henkilokunta' && !(await tarkistaOikeus(context.auth.uid, seuraId, context.auth.token)).sallittu)
      throw new functions.https.HttpsError('permission-denied', 'Ei oikeutta tähän seuraan.');

    const ref = db.collection('seurat').doc(seuraId).collection('kaaviot').doc(kaavioId);
    const snap = await ref.get();
    if (!snap.exists) throw new functions.https.HttpsError('not-found', 'Kaaviota ei löytynyt.');
    const doc = snap.data() || {};
    const review = doc.review || {};
    if (review.status !== 'hyvaksytty')
      throw new functions.https.HttpsError('failed-precondition', 'Kaavio ei ole hyväksytty.');

    const pelSnap = await db.collection('seurat').doc(seuraId).collection('pelaajat').doc(pelaajaId).get();
    if (!pelSnap.exists) throw new functions.https.HttpsError('not-found', 'Pelaajaa ei löytynyt.');
    const pel = pelSnap.data() || {};
    const joukkueet = Array.isArray(pel.joukkueet) ? pel.joukkueet.slice() : [];
    if (pel.joukkue && joukkueet.indexOf(pel.joukkue) < 0) joukkueet.push(pel.joukkue);   // §18: molemmat rakenteet

    if (!kaavioKohdistuuServer(Object.assign({ seuraId: seuraId }, doc), { seuraId: seuraId, joukkueet: joukkueet, pelaajaId: pelaajaId }))
      throw new functions.https.HttpsError('permission-denied', 'Kaavio ei kohdistu pelaajaan.');

    // Kiinteä polku — clientin data ei voi laajentaa kirjoitusta. Idempotentti: uusi kuittaus
    // korvaa aikaleiman, ei luo duplikaattia.
    await ref.update({ ['review.ymmarretty.' + pelaajaId]: admin.firestore.FieldValue.serverTimestamp() });
    return { ok: true };
  });

// ============================================================
// VALMENNUSAPURI — pilotti (Vaihe 2, 2026-09)
// Valmentajan kysymys → ohjeistus + tietopohja (Cloud Storage, EI repossa) → Claude (Vertex AI EU).
// Logiikka ja perustelut: functions/valmennusapuri.js · testit: functions/test/valmennusapuri.test.js
// Pääsy: SA aina + valmennusapuri_pilotti/{uid}. Loki: valmennusapuri_loki (ei client-pääsyä).
// Client: firebase.app().functions('europe-west1').httpsCallable('valmennusapuri', { timeout: 120000 })
// ANTHROPIC_API_KEY bindataan vain VALMENNUSAPURI_PROVIDER=anthropic -kehitysreittiä varten.
// AWS_BEDROCK_* bindataan Plan B -reittiä varten (VALMENNUSAPURI_PROVIDER=bedrock, Bedrock EU).
// ============================================================
exports.valmennusapuri = functions
  .region('europe-west1')
  .runWith({ timeoutSeconds: 240, memory: '512MB',
    secrets: ['ANTHROPIC_API_KEY', 'AWS_BEDROCK_ACCESS_KEY_ID', 'AWS_BEDROCK_SECRET_ACCESS_KEY'] })
  .https.onCall(valmennusapuri.kasittelija(admin, functions));


// ============================================================
// H1 — ARVIOINTIKERTA → KOOSTE (§26 pikakentta)
// Miksi CF eika client: kooste lasketaan KAIKISTA kerroista, mutta SISAISET (Palloliiton
// jakamattomat) on suodatettava pois — client ei niita edes nae. Lisaksi yksi laskentapaikka
// estaa client-driftin (ADAR-replikaatio §26 on juuri se ongelma jota ei toisteta).
// Brief: docs/CODE_BRIEF_ARVIOINTI_HISTORIA_MONIARVIOIJA.md §2.2
// HUOM: tm_arviointi_historia.js on TARKKA KOPIO lib/-versiosta (deploy pakkaa vain functions/).
//       tests/arviointi_kerrat_kirjoitus.test.js (ryhmä 10) punertaa, jos kopiot eroavat.
// ============================================================
const AH = require('./tm_arviointi_historia.js');

exports.arviointikertaOnWrite = functions
  .region('europe-west1')
  .runWith({ timeoutSeconds: 60, memory: '256MB' })
  .firestore.document('seurat/{seuraId}/pelaajat/{pelaajaId}/arviointikerrat/{kertaId}')
  .onWrite(async (change, context) => {
    const { seuraId, pelaajaId } = context.params;
    const pelaajaRef = admin.firestore()
      .collection('seurat').doc(seuraId).collection('pelaajat').doc(pelaajaId);
    try {
      const raja = new Date(Date.now() - AH.IKKUNA_PV * 86400000).toISOString();
      const snap = await pelaajaRef.collection('arviointikerrat').where('pvm', '>=', raja).get();
      const kaikki = [];
      snap.forEach((d) => kaikki.push(d.data()));
      // Pelaajadoc on seuran luettavissa → vain jaetut kerrat saavat vaikuttaa pikakenttaan.
      const jaetut = AH.tmAhSeuralle(kaikki);
      const kooste = AH.tmAhKooste(jaetut, Date.now());

      // Potentiaali: mediaani arvioijien viimeisimmista (sama ikkuna, samat suodattimet).
      // Review 2: potentiaali luetaan arvioijan uusimmasta kerrasta JOSSA on potentiaali
      // (sitä ei anneta joka kerralla) — sama logiikka kuin kohteilla, jaetussa libissä.
      const potKooste = AH.tmAhPotentiaaliKooste(jaetut, Date.now());

      /* Review 6: `set(..., {merge:true})` YHDISTÄÄ sisäkkäiset mapit, joten 12 kk ikkunasta
         pudonnut kohde jäisi pikakenttään ikuisesti. mergeFields korvaa nimetyt kentät
         kokonaan ja jättää muun pelaajadokin koskematta. */
      await pelaajaRef.set({
        arviointi_kooste: kooste,
        potentiaali_kooste: potKooste,
        arviointi_kooste_pvm: new Date().toISOString(),
      }, { mergeFields: ['arviointi_kooste', 'potentiaali_kooste', 'arviointi_kooste_pvm'] });
    } catch (e) {
      console.error('[arviointikertaOnWrite]', seuraId, pelaajaId, e && e.message);
    }
    return null;
  });

// ============================================================
// D-2 — pelaaja valitsi ydinvahvuutensa → viesti henkilökunnalle (seurat/{id}/viestit). EI sähköpostia, EI pushia.
// Vastaanottajat: vastuuhenkilö (muuten joukkueen valmentajat + talenttivalmentaja); VP ja UTJ aina. Tunniste valinta_{pid}_{jaksoavain}_{uid};
// uusi valinta päivittää saman dokumentin (luettu:false, set-merge). nakyvyys 'henkilokunta' (v3.39).
// RAJAUS: funktio EI kirjoita pelaajadokumenttiin eikä jaksofokukseen — vain `viestit`-kokoelmaan (functions/test/valinta_viesti_handler.test.js lukitsee).
// Päätöslogiikka: functions/valinta_viesti.js (PURE).
// ============================================================
const valintaViesti = require('./valinta_viesti');
exports.notifValintaOdottaa = functions
  .region('europe-west1')
  .runWith({ timeoutSeconds: 60, memory: '256MB' })
  .firestore.document('seurat/{seuraId}/pelaajat/{pelaajaId}')
  .onUpdate(async (change, context) => {
    const { seuraId, pelaajaId } = context.params;
    const before = change.before.data() || {};
    const after = change.after.data() || {};
    const paatos = valintaViesti.valintaPaatos(before, after);
    if (!paatos) return null;
    try {
      const seuraRef = db.collection('seurat').doc(seuraId);
      const [seuraSnap, kSnap] = await Promise.all([seuraRef.get(), seuraRef.collection('kayttajat').get()]);
      const seura = seuraSnap.exists ? (seuraSnap.data() || {}) : {};
      const kayttajat = [];
      kSnap.forEach((d) => { const k = d.data() || {}; kayttajat.push({ uid: d.id, rooli: k.rooli, joukkueet: k.joukkueet, aktiivinen: k.aktiivinen, nimi: [k.etunimi, k.sukunimi].filter(Boolean).join(' ') || k.nimi || '' }); });
      const saajat = valintaViesti.vastaanottajat(after, kayttajat, seura);
      const viestit = valintaViesti.rakennaViestit(pelaajaId, after, paatos, saajat, kayttajat);
      for (const v of viestit) {
        await seuraRef.collection('viestit').doc(v.id).set(
          Object.assign({}, v.data, { aika: admin.firestore.FieldValue.serverTimestamp() }), { merge: true });
      }
    } catch (e) {
      console.error('[notifValintaOdottaa]', seuraId, pelaajaId, e && e.message);
    }
    return null;
  });

// ============================================================
// PELAAJAN KIRJAUTUMINEN — Vaihe 0 / PR 1 (CODE_BRIEF_PELAAJAN_TUNNISTUS v2)
// { liittoTunnus (PalloID), pin } → custom token { rooli:'pelaaja', pelaajaSeuraId, pelaajaId }.
// App Check PAKOLLINEN (uusi funktio → ei katkosta olemassa oleville). Lukitus tunnuskohtaisesti
// (5 väärää → 15 min) + IP-katto; laskurit `_kirjautumisyritykset` (vain Admin SDK, Rules deny-all).
// Logiikka + perustelut: functions/pelaajakirjautuminen.js · testit: tests/pelaajakirjautuminen.test.js
// Client: firebase.app().functions('europe-west1').httpsCallable('pelaajaKirjaudu')
// ============================================================
exports.pelaajaKirjaudu = functions
  .region('europe-west1')
  .runWith({ enforceAppCheck: true })
  .https.onCall(pelaajakirjautuminen.luoKasittelija({
    db, auth,
    FieldValue: admin.firestore.FieldValue,
    HttpsError: functions.https.HttpsError,
    audit: (toiminto, tiedot) => db.collection('audit').add(Object.assign({
      toiminto, aikaleima: admin.firestore.FieldValue.serverTimestamp(),
    }, tiedot)).catch(() => {}),
  }));

/* Vaihe 0 / PR 2b — Solo-lapsen kirjautuminen { playerCode, pin } → custom token
   { rooli:'solo_lapsi', soloPlayerId }. Sama ydin kuin pelaajaKirjaudu (lukitus, IP-katto,
   näennäinen scrypt, hajautus deny-all-kokoelmaan `_soloPin`, child_pin-siirtymä). */
exports.soloLapsiKirjaudu = functions
  .region('europe-west1')
  .runWith({ enforceAppCheck: true })
  .https.onCall(pelaajakirjautuminen.luoSoloKasittelija({
    db, auth,
    FieldValue: admin.firestore.FieldValue,
    HttpsError: functions.https.HttpsError,
    audit: (toiminto, tiedot) => db.collection('audit').add(Object.assign({
      toiminto, aikaleima: admin.firestore.FieldValue.serverTimestamp(),
    }, tiedot)).catch(() => {}),
  }));

/* Vaihe 0 / PR 4 — PIN asetetaan VAIN palvelimella (functions/pelaajapin.js). Hajautus + selväkielinen
   kopio samassa erässä, lukitukset nollataan. Oikeus: johto/SA koko seura, joukkueen valmentaja oma
   joukkue (Teron päätös 30.9.2026). PIN:iä ei kirjoiteta audit-lokiin. */
const pinDeps = {
  db, tarkistaOikeus,
  FieldValue: admin.firestore.FieldValue,
  HttpsError: functions.https.HttpsError,
  audit: (toiminto, tiedot) => db.collection('audit').add(Object.assign({
    toiminto, aikaleima: admin.firestore.FieldValue.serverTimestamp(),
  }, tiedot)).catch(() => {}),
};
exports.asetaPelaajanPin = functions
  .region('europe-west1')
  .runWith({ enforceAppCheck: true })
  .https.onCall(pelaajapin.luoAsetaPelaajanPin(pinDeps));
/* PR B (1.10.2026) — QR-suostumuskortit: kutsu luodaan palvelimella (functions/suostumuskortit.js). */
exports.luoSuostumusKortit = functions
  .region('europe-west1')
  .runWith({ enforceAppCheck: true, timeoutSeconds: 120 })
  .https.onCall(suostumuskortit.luoKasittelija(pinDeps));
/* Rules v3.33 (2.10.2026) — huoltajaEmail vain palvelimella (functions/huoltajaemail.js). */
exports.asetaHuoltajaEmail = functions
  .region('europe-west1')
  .runWith({ enforceAppCheck: true })
  .https.onCall(huoltajaemail.luoKasittelija(pinDeps));
exports.luoPinitSeuralle = functions
  .region('europe-west1')
  .runWith({ enforceAppCheck: true, timeoutSeconds: 300 })
  .https.onCall(pelaajapin.luoLuoPinitSeuralle(pinDeps));

/* ═══ Seuran pulssi S1 (docs/CODE_BRIEF_S1_SEURAN_PULSSI.md; kaista Tero) ═══
   Viikkokooste palvelimella: vain lukumääriä joukkueittain (kooste/{vvvv-Www} + kooste_joukkue/{jid}_{vvvv-Www}), ei nimiä eikä pelaaja-ID:itä. Laskenta: tm_seuran_kooste.js
   (jaettu lib/-kopio, tmJaksoTila = sama funktio kuin työpöydällä). Kirjoittaa VAIN kooste-dokumentit (Admin SDK; Rules: client ei kirjoita).
   · laskeSeuranKooste    su 21:00 Europe/Helsinki — kuluva viikko        · laskeSeuranKoosteMa  ma 06:00 — edellinen viikko uudelleen (sunnuntain klo 21–24 vastaukset mukaan; sama set → idempotentti)
   · paivitaSeuranKooste  callable (johto/SA oma seura, App Check) — kuluvan viikon "Päivitä nyt".  Takaisinlaskenta (3 vk, arvio:true): scripts/kooste_takaisinlasku.js (Tero ajaa). */
const seuranKooste = require('./seuran_kooste');
const _koosteDeps = { db, FieldValue: admin.firestore.FieldValue, FieldPath: admin.firestore.FieldPath, HttpsError: functions.https.HttpsError, tarkistaOikeus };
exports.laskeSeuranKooste = functions
  .region('europe-west1')
  .runWith({ timeoutSeconds: 540, memory: '512MB' })
  .pubsub.schedule('0 21 * * 0')
  .timeZone('Europe/Helsinki')
  .onRun(seuranKooste.ajastettuKasittelija(_koosteDeps, 'sunnuntai'));
exports.laskeSeuranKoosteMa = functions
  .region('europe-west1')
  .runWith({ timeoutSeconds: 540, memory: '512MB' })
  .pubsub.schedule('0 6 * * 1')
  .timeZone('Europe/Helsinki')
  .onRun(seuranKooste.ajastettuKasittelija(_koosteDeps, 'maanantai'));
exports.paivitaSeuranKooste = functions
  .region('europe-west1')
  .runWith({ enforceAppCheck: true, timeoutSeconds: 120, memory: '512MB' })
  .https.onCall(seuranKooste.paivitaKasittelija(_koosteDeps));
