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

const functions = require('firebase-functions');
const admin     = require('firebase-admin');

admin.initializeApp();

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
