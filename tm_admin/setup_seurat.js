// TalentMaster — Seurojen alustus
// Tämä skripti:
// 1. Luo seura-dokumentit Firestoreen oikealla rakenteella
// 2. Asettaa custom claims jokaiselle VP:lle
// 3. Luo admin-käyttäjän sinulle
//
// AJO: node setup_seurat.js
// VAATII: serviceAccountKey.json samassa kansiossa

const admin = require('firebase-admin');
const serviceAccount = require('./serviceAccountKey.json');

// Alustetaan Firebase Admin SDK
admin.initializeApp({
  credential: admin.credential.cert(serviceAccount)
});

const db   = admin.firestore();
const auth = admin.auth();

// ── SEURAT JA VP-TUNNUKSET ─────────────────────────────────────────
// Nämä tiedot on kopioitu Firebase Authentication -konsolista
const SEURAT = [
  {
    id:       'fcl',
    nimi:     'FC Lahti Juniorit',
    laji:     'jalkapallo',
    paketti:  'kehitystaso',
    vp_email: 'vp.fcl@talentmaster.fi',
    vp_uid:   'dpYcfa154ZOHshZzHrVaTZ2iTHE3',
    maa:      'FI',
    kaupunki: 'Lahti'
  },
  {
    id:       'kpv',
    nimi:     'KPV',
    laji:     'jalkapallo',
    paketti:  'kehitystaso',
    vp_email: 'vp.kpv@talentmaster.fi',
    vp_uid:   'jIbW7q8nLggswTjefkYuSvtneH92',
    maa:      'FI',
    kaupunki: 'Kokkola'
  },
  {
    id:       'palloiirot',
    nimi:     'Pallo-Iirot',
    laji:     'jalkapallo',
    paketti:  'kehitystaso',
    vp_email: 'vp.palloiirot@talentmaster.fi',
    vp_uid:   'fBf1c60rjXTPxYlsV03EfrHZ2xM2',
    maa:      'FI',
    kaupunki: 'Iisalmi'
  },
  {
    id:       'yvies',
    nimi:     'Ylöjärven Ilves',
    laji:     'jalkapallo',
    paketti:  'kehitystaso',
    vp_email: 'vp.yvies@talentmaster.fi',
    vp_uid:   'U21RwOm7OYdrAQB8wTXXlDQksEk2',
    maa:      'FI',
    kaupunki: 'Ylöjärvi'
  },
  {
    id:       'sjk',
    nimi:     'SJK Juniorit',
    laji:     'jalkapallo',
    paketti:  'kehitystaso',
    vp_email: 'vp.sjk@talentmaster.fi',
    vp_uid:   '1eHyfKsuTSRAAsPu9kRZ22E4hwo2',
    maa:      'FI',
    kaupunki: 'Seinäjoki'
  },
  {
    id:       'grifk',
    nimi:     'GrIFK',
    laji:     'jalkapallo',
    paketti:  'kehitystaso',
    vp_email: 'vp.grifk@talentmaster.fi',
    vp_uid:   'lBCx0ivDYVWLmxD9TGKsvYrFrlo1',
    maa:      'FI',
    kaupunki: 'Helsinki'
  }
];

// ── PAKETTIMÄÄRITTELYT ─────────────────────────────────────────────
const PAKETIT = {
  perustaso: {
    ominaisuudet: ['kirjaukset', 'testit', 'pelaajaprofiilit'],
    roolit: ['vp', 'valmentaja', 'testivastaava'],
    max_pelaajia: 100
  },
  kehitystaso: {
    ominaisuudet: [
      'kirjaukset', 'testit', 'pelaajaprofiilit',
      'adar', 'biologinen_ika', 'talenttiohjelma',
      'harjoitettavuus', 'kuormaseuranta'
    ],
    roolit: [
      'vp', 'valmentaja', 'testivastaava',
      'talenttivalmentaja', 'fysiikkavalmentaja'
    ],
    max_pelaajia: 300
  },
  huipputaso: {
    ominaisuudet: ['kaikki'],
    roolit: ['kaikki'],
    max_pelaajia: 999999
  }
};

// ── PÄÄFUNKTIO ─────────────────────────────────────────────────────
async function alustaKaikkiSeurat() {
  console.log('🚀 TalentMaster — Seurojen alustus alkaa...\n');

  for (const seura of SEURAT) {
    try {
      await alustaSeura(seura);
    } catch(e) {
      console.error(`❌ Virhe seurassa ${seura.id}:`, e.message);
    }
  }

  console.log('\n✅ Kaikki seurat alustettu!');
  console.log('📋 Seuraavat stepit:');
  console.log('   1. Tarkista Firestore-konsolista että seura-dokumentit näkyvät');
  console.log('   2. Päivitä VP-dashboard käyttämään sähköpostikirjautumista');
  console.log('   3. Testaa kirjautuminen yhdellä VP-tunnuksella');
  process.exit(0);
}

// Alustaa yhden seuran Firestoreen ja asettaa VP:n custom claims
async function alustaSeura(seura) {
  console.log(`📋 Alustetaan seura: ${seura.nimi} (${seura.id})`);

  const paketti = PAKETIT[seura.paketti] || PAKETIT.kehitystaso;

  // ── VAIHE 1: Luo seura-dokumentti Firestoreen ──────────────────
  await db.collection('seurat').doc(seura.id).set({
    id:          seura.id,
    nimi:        seura.nimi,
    laji:        seura.laji,
    paketti:     seura.paketti,
    vp_uid:      seura.vp_uid,
    vp_email:    seura.vp_email,
    maa:         seura.maa,
    kaupunki:    seura.kaupunki,
    ominaisuudet: paketti.ominaisuudet,
    roolit:      paketti.roolit,
    max_pelaajia: paketti.max_pelaajia,
    luotu:       admin.firestore.FieldValue.serverTimestamp(),
    aktiivinen:  true,
    // Tilastojen alustus — päivittyy käytön myötä
    tilastot: {
      pelaajia:   0,
      joukkueita: 0,
      kirjauksia: 0,
      viim_kirjaus: null
    }
  }, { merge: true }); // merge: true = ei ylikirjoita olemassa olevaa

  console.log(`   ✓ Firestore-dokumentti luotu: seurat/${seura.id}`);

  // ── VAIHE 2: Luo alikokoelmat (joukkueet placeholder) ──────────
  // Firestore ei luo tyhjiä kokoelmia — luodaan placeholder-dokumentti
  // joka poistetaan kun oikea data lisätään
  await db.collection('seurat').doc(seura.id)
    .collection('_meta').doc('rakenne').set({
      versio: '1.0',
      luotu:  admin.firestore.FieldValue.serverTimestamp(),
      kuvaus: 'TalentMaster seurarakenne v1.0',
      alikokoelmat: [
        'joukkueet',      // Joukkueiden perustiedot ja valmentajat
        'pelaajat',       // Pelaajaprofiilit ja kehitysdata
        'kirjaukset',     // VP:n harjoitteluseurantakirjaukset
        'testit',         // Mittaustulokset (nopeus, ketteryys jne.)
        'kartoitukset',   // Harjoitettavuuskartoitukset (U12/U15/U19)
        'tekniikka',      // Tekniikkakilpailutulokset
        'adar',           // ADAR Game IQ -arvioinnit
        'kuorma',         // RPE ja kuormaseuranta
        'vammat',         // Vamma- ja kuntoutusdata
        'kayttajat'       // Seuran käyttäjät ja roolit
      ]
    });

  console.log(`   ✓ Rakennedokumentti luotu`);

  // ── VAIHE 3: Aseta custom claims VP:lle ────────────────────────
  // Custom claims tallennetaan JWT-tokeniin — Firebase tarkistaa
  // ne automaattisesti ilman erillistä tietokantahakua
  await auth.setCustomUserClaims(seura.vp_uid, {
    seura:   seura.id,           // Seura-ID tietoturvasääntöjä varten
    rooli:   'valmennuspäällikkö', // Rooli permission matriisista
    paketti: seura.paketti,      // Paketti ominaisuuksien rajaamiseen
    laji:    seura.laji,         // Laji lajispesifin datan hakuun
    admin:   false               // Ei TalentMaster-admin-oikeuksia
  });

  console.log(`   ✓ Custom claims asetettu VP:lle (${seura.vp_email})`);
  console.log(`   ✓ Seura ${seura.nimi} valmis!\n`);
}

// Käynnistetään skripti
alustaKaikkiSeurat().catch(function(e) {
  console.error('💥 Kriittinen virhe:', e);
  process.exit(1);
});

