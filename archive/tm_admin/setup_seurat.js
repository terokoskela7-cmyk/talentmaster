/**
 * tm_admin/setup_seurat.js — TalentMaster™
 * Seuran alustus Firestoreen
 * Päivitetty: 2026-03-27
 *
 * KÄYTTÖ (GitHub Actions tai paikallinen Node.js):
 *   node setup_seurat.js
 *
 * MITÄ TEKEE:
 *   1. Luo tai päivittää seurat/{seuraId}-dokumentin uudella rakenteella
 *   2. Luo oletusrakenteet alikokoelmille (joukkueet-placeholder)
 *   3. Tulostaa ohjeet seuraaviksi manuaalisiksi vaiheiksi
 *
 * VAATIMUKSET:
 *   - FIREBASE_SERVICE_ACCOUNT ympäristömuuttuja (GitHub Secret)
 *   - firebase-admin npm-paketti
 *
 * ROOLIARKKITEHTUURI (kolme kerrosta):
 *   Hallintakerros : Super Admin, Seuran Admin, VP (varamies)
 *   Johtamiskerros : VP (operatiivinen + strateginen), UTJ (vain strateginen)
 *   Kenttäkerros   : valmentaja, testivastaava, talenttivalmentaja,
 *                    fysiikkavalmentaja, fysioterapeutti
 */

const admin = require('firebase-admin');

// ── Firebase-alustus ──────────────────────────────────────────────────────────
// Käytetään GitHub Secretistä tulevaa service account -avainta.
// Ei koskaan committata serviceAccountKey.json-tiedostoa repoon.
let serviceAccount;
if (process.env.FIREBASE_SERVICE_ACCOUNT) {
  serviceAccount = JSON.parse(process.env.FIREBASE_SERVICE_ACCOUNT);
} else {
  // Paikallinen kehitys — tiedosto pitää olla paikallisesti mutta
  // se on .gitignore:ssa eikä koskaan mene GitHubiin
  try {
    serviceAccount = require('./serviceAccountKey.json');
  } catch (e) {
    console.error('VIRHE: FIREBASE_SERVICE_ACCOUNT puuttuu eikä serviceAccountKey.json löydy');
    process.exit(1);
  }
}

if (!admin.apps.length) {
  admin.initializeApp({
    credential: admin.credential.cert(serviceAccount)
  });
}

const db = admin.firestore();

// ── Pilottiseurojen konfiguraatio ─────────────────────────────────────────────
// Tänne lisätään kaikki pilottiseurat. Jokaisella seuralla on:
//   - seuraId    : Firestoren dokumentti-ID (lyhyt, ei välilyöntejä)
//   - nimi       : Näyttönimi VP-dashboardissa
//   - vp_email   : VP:n sähköposti — linkitetään uid:iin myöhemmin
//   - admin_email: Seuran Admin (sihteeri/TJ) — null jos sama kuin VP
//   - utj_email  : UTJ — null jos seurassa ei ole UTJ:tä (VP kattaa strategisen)
//   - paketti    : "perustaso" | "kehitystaso" | "huipputaso"
//   - kaupunki   : Seuran kotipaikka
//
// UID:t täydennetään automaattisesti kun käyttäjät kirjautuvat
// ensimmäistä kertaa — skripti jättää ne null:ksi jos ei tiedetä.

const PILOTTISEURAT = [
  {
    seuraId:     'fcl',
    nimi:        'FC Lahti Juniorit',
    kaupunki:    'Lahti',
    paketti:     'kehitystaso',
    vp_email:    'vp.fcl@talentmaster.fi',
    vp_uid:      'dpYcfa154ZOHshZzHrVaTZ2iTHE3',
    admin_email: null,   // VP toimii myös adminina
    admin_uid:   null,
    utj_email:   null,   // Ei UTJ:tä — VP kattaa strategisen tason
    utj_uid:     null,
  },
  {
    seuraId:     'kpv',
    nimi:        'KPV',
    kaupunki:    'Kokkola',
    paketti:     'kehitystaso',
    vp_email:    'vp.kpv@talentmaster.fi',
    vp_uid:      'jIbW7q8nLggswTjefkYuSvtneH92',
    admin_email: null,
    admin_uid:   null,
    utj_email:   null,
    utj_uid:     null,
  },
  {
    seuraId:     'palloiirot',
    nimi:        'Pallo-Iirot',
    kaupunki:    'Iisalmi',
    paketti:     'perustaso',
    vp_email:    'vp.palloiirot@talentmaster.fi',
    vp_uid:      'fBf1c60rjXTPxYlsV03EfrHZ2xM2',
    admin_email: null,
    admin_uid:   null,
    utj_email:   null,
    utj_uid:     null,
  },
  {
    seuraId:     'yvies',
    nimi:        'Ylöjärven Ilves',
    kaupunki:    'Ylöjärvi',
    paketti:     'perustaso',
    vp_email:    'vp.yvies@talentmaster.fi',
    vp_uid:      'U21RwOm7OYdrAQB8wTXXlDQksEk2',
    admin_email: null,
    admin_uid:   null,
    utj_email:   null,
    utj_uid:     null,
  },
  {
    seuraId:     'sjk',
    nimi:        'SJK Juniorit',
    kaupunki:    'Seinäjoki',
    paketti:     'kehitystaso',
    vp_email:    'vp.sjk@talentmaster.fi',
    vp_uid:      '1eHyfKsuTSRAAsPu9kRZ22E4hwo2',
    admin_email: null,
    admin_uid:   null,
    utj_email:   null,
    utj_uid:     null,
  },
  {
    seuraId:     'grifk',
    nimi:        'GrIFK',
    kaupunki:    'Helsinki',
    paketti:     'perustaso',
    vp_email:    'vp.grifk@talentmaster.fi',
    vp_uid:      'lBCx0ivDYVWLmxD9TGKsvYrFrlo1',
    admin_email: null,
    admin_uid:   null,
    utj_email:   null,
    utj_uid:     null,
  },
  {
    seuraId:     'hjk',
    nimi:        'HJK Juniorit',
    kaupunki:    'Helsinki',
    paketti:     'huipputaso',
    vp_email:    null,   // Ei vielä nimetty
    vp_uid:      null,
    admin_email: null,
    admin_uid:   null,
    utj_email:   null,
    utj_uid:     null,
  },
];

// ── Pakettien ominaisuudet ────────────────────────────────────────────────────
// Määrittää mitä ominaisuuksia ja rooleja kukin paketti sisältää.
// Käytetään seuradokumentin ominaisuudet-kentässä — VP-näkymä
// tarkistaa tästä mitä tabeja ja toimintoja näytetään.

const PAKETIT = {
  perustaso: {
    maxPelaajia:  100,
    roolit: [
      'vp', 'seuran_admin', 'valmentaja', 'testivastaava',
      'pelaaja', 'huoltaja'
    ],
    ominaisuudet: [
      'pelaajaprofiilit',
      'harjoitettavuuskartoitus',
      'hh_testit',
      'testitapahtumat',
      'rae_analyysi'
    ]
  },
  kehitystaso: {
    maxPelaajia:  300,
    roolit: [
      'vp', 'utj', 'seuran_admin', 'valmentaja', 'testivastaava',
      'talenttivalmentaja', 'fysiikkavalmentaja',
      'pelaaja', 'huoltaja'
    ],
    ominaisuudet: [
      'pelaajaprofiilit',
      'harjoitettavuuskartoitus',
      'hh_testit',
      'testitapahtumat',
      'rae_analyysi',
      'biologinen_ika',        // Mirwald + Khamis-Roche
      'talenttiohjelma',       // IDP laajennettu + talenttikortti
      'adar_game_iq',          // Kognitiivinen arviointi
      'tekniikkakilpailut',
      'utj_raportointi'        // Strateginen koontinäkymä
    ]
  },
  huipputaso: {
    maxPelaajia:  -1,   // Rajaton
    roolit: [
      'vp', 'utj', 'seuran_admin', 'valmentaja', 'testivastaava',
      'talenttivalmentaja', 'fysiikkavalmentaja', 'fysioterapeutti',
      'pelaaja', 'huoltaja'
    ],
    ominaisuudet: [
      'pelaajaprofiilit',
      'harjoitettavuuskartoitus',
      'hh_testit',
      'testitapahtumat',
      'rae_analyysi',
      'biologinen_ika',
      'talenttiohjelma',
      'adar_game_iq',
      'tekniikkakilpailut',
      'utj_raportointi',
      'vammadata',             // Kuntoutusdata — fysioterapeutti
      'kuormaseuranta',        // RPE-seuranta
      'hallitusraportointi'    // Aggregoitu raportointinäkymä
    ]
  }
};

// ── Pääfunktio: yhden seuran alustus ─────────────────────────────────────────

async function alustaSeura(seuraKonfig) {
  const {
    seuraId, nimi, kaupunki, paketti,
    vp_email, vp_uid,
    admin_email, admin_uid,
    utj_email, utj_uid
  } = seuraKonfig;

  const pakettitiedot = PAKETIT[paketti] || PAKETIT.perustaso;
  const nyt = admin.firestore.FieldValue.serverTimestamp();

  // ── Seuradokumentti ────────────────────────────────────────────
  // set() merge:true päivittää olemassa olevan dokumentin
  // muuttamatta kenttiä joita ei mainita — turvallinen myös
  // uudelleenajossa.
  const seuranData = {
    id:      seuraId,
    nimi:    nimi,
    laji:    'jalkapallo',
    paketti: paketti,
    kaupunki: kaupunki || '',
    aktiivinen: true,

    // ── Hallintakerros ──────────────────────────────────────────
    // admin_uid on null jos erillistä Adminia ei ole —
    // kirjautumislogiikka antaa VP:lle admin-oikeudet automaattisesti
    admin_uid:   admin_uid   || null,
    admin_email: admin_email || null,
    vp_uid:      vp_uid      || null,
    vp_email:    vp_email    || null,

    // ── Johtamiskerros ──────────────────────────────────────────
    // utj_uid on null jos UTJ:tä ei ole — VP kattaa strategisen tason
    utj_uid:     utj_uid     || null,
    utj_email:   utj_email   || null,

    // ── Pakettitiedot ───────────────────────────────────────────
    roolit:         pakettitiedot.roolit,
    ominaisuudet:   pakettitiedot.ominaisuudet,
    max_pelaajia:   pakettitiedot.maxPelaajia,

    // ── Aggregoidut tilastot ────────────────────────────────────
    // Päivitetään automaattisesti kun tapahtumia merkitään valmiiksi.
    // UTJ- ja hallitusraportointi lukee nämä — ei lasketa lennossa.
    tilastot: {
      pelaajia:            0,
      joukkueita:          0,
      kartoituksia:        0,
      testattuMirwald:     0,
      testattuHH:          0,
      aktiivisiaIdp:       0,
      viimeisinTapahtuma:  null,
      kausi:               '2026'
    },

    paivitetty: nyt,
  };

  // Luodaan kentät jotka asetetaan vain kerran (ei ylikirjoiteta päivityksessä)
  const seuranRef = db.collection('seurat').doc(seuraId);
  const olemassaoleva = await seuranRef.get();

  if (!olemassaoleva.exists) {
    seuranData.luotu = nyt;
    console.log(`  → Luodaan uusi seura: ${seuraId}`);
  } else {
    console.log(`  → Päivitetään olemassa oleva seura: ${seuraId}`);
  }

  await seuranRef.set(seuranData, { merge: true });
  console.log(`  ✅ ${nimi} (${seuraId}) — ${paketti}`);

  // ── VP:n kayttajat-dokumentti ──────────────────────────────────
  // VP tallennetaan myös kayttajat-alikokoelmaan jotta Security Rules
  // löytää hänet johdonmukaisesti. Tämä mahdollistaa sen, että
  // onSeuranJasen()-funktio toimii myös VP:lle.
  if (vp_uid) {
    await seuranRef.collection('kayttajat').doc(vp_uid).set({
      uid:        vp_uid,
      email:      vp_email,
      rooli:      'vp',
      joukkueet:  [],   // VP näkee kaikki joukkueet — tyhjä lista = ei rajoitusta
      paketti:    paketti,
      aktiivinen: true,
      luotu:      nyt,
      kutsunutUid: 'system'
    }, { merge: true });
    console.log(`  ✅ VP kirjattu kayttajat-kokoelmaan: ${vp_email}`);
  }

  // ── UTJ:n kayttajat-dokumentti (jos on nimetty) ────────────────
  if (utj_uid) {
    await seuranRef.collection('kayttajat').doc(utj_uid).set({
      uid:        utj_uid,
      email:      utj_email,
      rooli:      'utj',
      joukkueet:  [],   // UTJ näkee kaikki joukkueet seuratasolla
      paketti:    paketti,
      aktiivinen: true,
      luotu:      nyt,
      kutsunutUid: 'system'
    }, { merge: true });
    console.log(`  ✅ UTJ kirjattu kayttajat-kokoelmaan: ${utj_email}`);
  }

  // ── Seuran Admin -dokumentti (jos erillinen Admin nimetty) ────
  if (admin_uid && admin_uid !== vp_uid) {
    await seuranRef.collection('kayttajat').doc(admin_uid).set({
      uid:        admin_uid,
      email:      admin_email,
      rooli:      'seuran_admin',
      joukkueet:  [],
      paketti:    paketti,
      aktiivinen: true,
      luotu:      nyt,
      kutsunutUid: 'system'
    }, { merge: true });
    console.log(`  ✅ Seuran Admin kirjattu: ${admin_email}`);
  }

  return seuraId;
}

// ── Apufunktio: uuden valmentajan/käyttäjän lisäys ───────────────────────────
// Tätä kutsutaan kun VP tai Seuran Admin lisää uuden kenttäkerroksen
// käyttäjän järjestelmään. Exportataan jotta voidaan kutsua
// erillisestä skriptistä tai Cloud Functionista.

async function lisaaKayttaja(seuraId, kayttajaData) {
  const {
    uid, email, nimi, rooli, joukkueet, kutsunutUid
  } = kayttajaData;

  // Validointi — estetään tuntemattomat roolit
  const sallitatRoolit = [
    'valmentaja', 'testivastaava', 'talenttivalmentaja',
    'fysiikkavalmentaja', 'fysioterapeutti', 'seuran_admin',
    'vp', 'utj'
  ];
  if (!sallitatRoolit.includes(rooli)) {
    throw new Error(`Tuntematon rooli: ${rooli}. Sallitut: ${sallitatRoolit.join(', ')}`);
  }

  const nyt = admin.firestore.FieldValue.serverTimestamp();

  // Tarkistetaan että seura on olemassa ennen käyttäjän lisäystä
  const seuraRef = db.collection('seurat').doc(seuraId);
  const seura = await seuraRef.get();
  if (!seura.exists) {
    throw new Error(`Seuraa ei löydy: ${seuraId}`);
  }

  const paketti = seura.data().paketti || 'perustaso';

  await seuraRef.collection('kayttajat').doc(uid).set({
    uid:        uid,
    email:      email || '',
    nimi:       nimi  || '',
    rooli:      rooli,
    joukkueet:  joukkueet || [],  // Esim. ['kpv_u14', 'kpv_u12']
    paketti:    paketti,
    aktiivinen: true,
    luotu:      nyt,
    kutsunutUid: kutsunutUid || 'system'
  }, { merge: true });

  console.log(`  ✅ Käyttäjä lisätty: ${email} (${rooli}) → ${seuraId}`);
}

// ── Pääohjelma ────────────────────────────────────────────────────────────────

async function main() {
  console.log('TalentMaster™ — Seurojen alustus');
  console.log('=================================');
  console.log(`Ajetaan: ${new Date().toISOString()}`);
  console.log(`Seurojen määrä: ${PILOTTISEURAT.length}`);
  console.log('');

  const onnistuneet = [];
  const epaonnistuneet = [];

  for (const seura of PILOTTISEURAT) {
    console.log(`\n[${seura.seuraId}] ${seura.nimi}`);
    try {
      await alustaSeura(seura);
      onnistuneet.push(seura.seuraId);
    } catch (e) {
      console.error(`  ❌ VIRHE: ${e.message}`);
      epaonnistuneet.push({ id: seura.seuraId, virhe: e.message });
    }
  }

  // ── Yhteenveto ─────────────────────────────────────────────────
  console.log('\n=================================');
  console.log(`✅ Onnistui:       ${onnistuneet.length}/${PILOTTISEURAT.length}`);
  if (epaonnistuneet.length > 0) {
    console.log(`❌ Epäonnistui:    ${epaonnistuneet.length}`);
    epaonnistuneet.forEach(e => console.log(`   - ${e.id}: ${e.virhe}`));
  }

  // ── Seuraavat manuaaliset askeleet ─────────────────────────────
  console.log('\n─── Seuraavat vaiheet ───────────────────────────────────');
  console.log('1. Vie firestore.rules GitHubiin → tm_admin/firestore.rules');
  console.log('2. Ota uudet säännöt käyttöön Firebase Consolessa:');
  console.log('   Firestore → Rules → kopioi ja julkaise');
  console.log('3. Lisää valmentajat VP-näkymän käyttäjähallinnasta');
  console.log('   (kutsu sähköpostilla → Cloud Function luo tunnuksen)');
  console.log('4. Tarkista seurat Firebase Consolessa:');
  console.log('   https://console.firebase.google.com/project/talentmaster-pilot/firestore');
  console.log('─────────────────────────────────────────────────────────\n');

  process.exit(epaonnistuneet.length > 0 ? 1 : 0);
}

// ── Exportit muita skriptejä varten ──────────────────────────────────────────
// lisaaKayttaja() voidaan kutsua myös VP-näkymän Cloud Functionista
// kun VP kutsuu uuden valmentajan sähköpostilla.
module.exports = { alustaSeura, lisaaKayttaja, PILOTTISEURAT, PAKETIT };

// Ajetaan main() vain kun skripti suoritetaan suoraan
// (ei kun se importataan toiseen skriptiin)
if (require.main === module) {
  main().catch(e => {
    console.error('Kriittinen virhe:', e);
    process.exit(1);
  });
}
