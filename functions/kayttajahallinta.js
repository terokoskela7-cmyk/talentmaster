'use strict';
/**
 * Käyttäjähallinta (henkilökunta) — siirretty functions/index.js:stä SELLAISENAAN (rivikattojen purku F1, 6.11.2026).
 *   luoKayttaja · vaihdaKayttajanRooli · lahetaResetLinkki · vaihdaKayttajanSahkoposti · deaktivioiKayttaja · aktivoiKayttaja · poistaKayttaja
 *   + niiden apufunktiot (_authEiLoydy, poistaKirjautumisoikeus, vapautaVpUid, tarkistaKayttajaToimenpide) ja SALLITUT_ROOLIT_VAIHTO.
 * Vienti, region, runWith ja secrets pysyvät index.js:ssä (exports.X = functions.region(...)...https.onCall(kayttajahallinta.X));
 * vedos functions/test/fixtures/viennit.json todentaa, ettei julkaistava pinta muutu.
 * Riippuvuudet, jotka jäävät index.js:ään (db, auth, tarkistaOikeus, onSuperAdminUid, …), annetaan kytke()-kutsulla latauksessa;
 * siksi siirretty koodi on tiedoston ylätasolla samassa sisennyksessä kuin index.js:ssä (siirtotarkistus vertaa rivit sellaisinaan).
 */
const functions = require('firebase-functions/v1');
const sahkopostinVaihto = require('./sahkopostin_vaihto');
const admin     = require('firebase-admin');
let db, auth, tarkistaOikeus, onSuperAdminUid, estaPaikkamerkkiOsoite, uusiValiaikainenSalasana, lahetaSahkoposti, pohjaSalasanaAsetus, TM_BASE_URL;
/** index.js kutsuu kerran latauksessa, ennen kuin yksikään käsittelijä ajetaan. */
function kytke(d) { ({ db, auth, tarkistaOikeus, onSuperAdminUid, estaPaikkamerkkiOsoite, uusiValiaikainenSalasana, lahetaSahkoposti, pohjaSalasanaAsetus, TM_BASE_URL } = d); }
exports.kytke = kytke;

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
// luoKayttaja
// ─────────────────────────────────────────────────────────────────────────────
exports.luoKayttaja = (async (data, context) => {
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
exports.vaihdaKayttajanRooli = (async (data, context) => {
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
// lahetaResetLinkki — generoi salasanan reset-linkin OLEMASSA OLEVALLE henkilöstölle.
// Authz: kutsuja = super_admin TAI kohdeseuran johto (tarkistaOikeus) JA kohde-email
// kuuluu kyseisen seuran kayttajat-kokoelmaan. Ei kirjoita dataa eikä lähetä sähköpostia
// — palauttaa vain linkin jaettavaksi (📧/💬/📋). generatePasswordResetLink ei muuta salasanaa.
// ─────────────────────────────────────────────────────────────────────────────
exports.lahetaResetLinkki = (async (data, context) => {
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
// vaihdaKayttajanSahkoposti — vaihtaa henkilökunnan kirjautumisosoitteen SAMALLA UID:llä (data säilyy). Authz tässä (SA tai seuran johto, ei oma/SA-tunnus), ydin: ./sahkopostin_vaihto.js.
// Rules v3.84: client ei kirjoita kayttajat.email-kenttää.
exports.vaihdaKayttajanSahkoposti = (async (data, context) => {
    const { kohdeUid, seuraId, uusiEmail } = data || {};
    const uusi = typeof uusiEmail === 'string' ? uusiEmail.trim().toLowerCase() : '';
    sahkopostinVaihto.tarkistaOsoite(uusi, functions.https.HttpsError); estaPaikkamerkkiOsoite(uusi);
    const { kRef, kDoc } = await tarkistaKayttajaToimenpide(context, kohdeUid, seuraId, false);
    return sahkopostinVaihto.suorita({ db, auth, admin, HttpsError: functions.https.HttpsError, sallitutRoolit: SALLITUT_ROOLIT_VAIHTO, authEiLoydy: _authEiLoydy, kRef, kDoc, kohdeUid, seuraId, uusi, tekijaUid: context.auth.uid });
  });

// ─────────────────────────────────────────────────────────────────────────────
// deaktivioiKayttaja
// ─────────────────────────────────────────────────────────────────────────────
exports.deaktivioiKayttaja = (async (data, context) => {
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
exports.aktivoiKayttaja = (async (data, context) => {
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
exports.poistaKayttaja = (async (data, context) => {
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
exports.SALLITUT_ROOLIT_VAIHTO = SALLITUT_ROOLIT_VAIHTO;
