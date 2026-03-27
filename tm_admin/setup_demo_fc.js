// ══════════════════════════════════════════════════════════════════════
// TalentMaster™ — Demo FC Setup Script
// Luo demo-seuran, 3 pelaajaa, kartoitukset ja VP-käyttäjän Firestoreen
// Ajo: node tm_admin/setup_demo_fc.js
// Vaatii: FIREBASE_SERVICE_ACCOUNT -ympäristömuuttuja tai serviceAccountKey.json
// ══════════════════════════════════════════════════════════════════════

const admin = require('firebase-admin');

// Alustetaan Firebase Admin SDK
// Secret voi olla joko suora JSON-string tai base64-enkoodattu — kokeillaan molemmat
let serviceAccount;
const raw = process.env.FIREBASE_SERVICE_ACCOUNT;
if (raw) {
  try {
    // Kokeillaan ensin suoraan JSON-parsinta (GitHub tallentaa usein näin)
    serviceAccount = JSON.parse(raw);
    console.log('[AUTH] Service account: suora JSON ✅');
  } catch (e1) {
    try {
      // Jos ei onnistu, kokeillaan base64-dekoodaus
      serviceAccount = JSON.parse(Buffer.from(raw, 'base64').toString('utf8'));
      console.log('[AUTH] Service account: base64 decoded ✅');
    } catch (e2) {
      console.error('[AUTH] Service account parsinta epäonnistui.');
      console.error('  Suora JSON-virhe:', e1.message);
      console.error('  Base64-virhe:', e2.message);
      console.error('  Secretin ensimmäiset 20 merkkiä:', raw.substring(0, 20));
      process.exit(1);
    }
  }
} else {
  // Lokaalikehitys: käytä tiedostoa (ei commitoida!)
  serviceAccount = require('./serviceAccountKey.json');
}

admin.initializeApp({
  credential: admin.credential.cert(serviceAccount)
});

const db   = admin.firestore();
const auth = admin.auth();

// ══════════════════════════════════════════════════════════════════════
// PÄÄFUNKTIO
// ══════════════════════════════════════════════════════════════════════

async function setupDemoFC() {
  console.log('\n═══════════════════════════════════════════');
  console.log('  TalentMaster™ — Demo FC Setup');
  console.log('═══════════════════════════════════════════\n');

  // ── VAIHE 1: Luo tai hae VP-käyttäjä ─────────────────────────────
  console.log('1/5 Luodaan VP-käyttäjä...');
  let vpUser;
  try {
    vpUser = await auth.getUserByEmail('vp.demo@talentmaster.fi');
    console.log('   → Käyttäjä löytyi jo:', vpUser.uid);
  } catch (e) {
    vpUser = await auth.createUser({
      email:    'vp.demo@talentmaster.fi',
      password: 'TM_Demo_2026!',
      displayName: 'Demo VP'
    });
    console.log('   → Luotu:', vpUser.uid);
  }

  // Asetetaan custom claim jotta VP-dashboard tunnistaa seuran
  await auth.setCustomUserClaims(vpUser.uid, {
    rooli:   'vp',
    seuraId: 'demo-fc'
  });
  console.log('   → Custom claim asetettu (rooli: vp, seuraId: demo-fc)');

  // ── VAIHE 2: Luo seura-dokumentti ────────────────────────────────
  console.log('\n2/5 Luodaan seura demo-fc...');
  await db.collection('seurat').doc('demo-fc').set({
    id:         'demo-fc',
    nimi:       'Demo FC',
    laji:       'jalkapallo',
    paketti:    'kehitystaso',
    kaupunki:   'Tampere',
    maa:        'FI',
    aktiivinen: true,
    vp_email:   'vp.demo@talentmaster.fi',
    vp_uid:     vpUser.uid,
    max_pelaajia: 300,
    tilastot: { pelaajia: 3, joukkueita: 1, kartoituksia: 3 },
    identiteetti: {
      ydinlause: 'Kehitämme nopeita, älykkäitä ja taitavia pelaajia',
      prioriteettiketjut: ['SBL', 'SL', 'DFL']
    },
    luotu: admin.firestore.FieldValue.serverTimestamp()
  }, { merge: true });
  console.log('   → demo-fc luotu ✅');

  // ── VAIHE 3: Kolme pelaajaa ───────────────────────────────────────
  console.log('\n3/5 Luodaan pelaajat...');

  const pelaajat = [
    {
      id: 'demo-p001',
      nimi: 'Aleksi Virtanen',
      sukupuoli: 'poika',
      syntymavuosi: 2012,
      ika: 13,
      joukkue: 'Demo U13',
      positio: 'KHK',
      PHV_vaihe: 'pre-PHV',
      RAE_kvartiili: 'Q2',
      FLEI_pct: 84,
      flei_viimeisin: { pct: 84, taso: 'hyvä', pvm: '2026-02-15', ikaluokka: 'U15' },
      ketjupisteet: { SBL:2.7, SFL:2.4, LL:1.5, SL:2.5, DFL:2.3, FL:2.1, heikoin:'LL', vahvin:'SBL' },
      TSI: 0.22,
      ADAR_pisteet: 10,
      IDP_taso: 'laajennettu',
      X_Factor_signaali: true,
      X_Factor_tyyppi: 'Tekniikka-XF',
      profiilityyppi: 'Railgun',
      profiili_mastery: 'Sharp',
      D1_fyysinen: 34, D2_tekninen: 21, D3_psykologinen: 13,
      D4_kognitiivinen: 9, D5_sosiaalinen: 8, D_yhteensa: 85,
      kotitehtava_streak: 12
    },
    {
      id: 'demo-p002',
      nimi: 'Eeli Korhonen',
      sukupuoli: 'poika',
      syntymavuosi: 2012,
      ika: 13,
      joukkue: 'Demo U13',
      positio: 'KP',
      PHV_vaihe: 'PHV-huippu',
      PHV_varoitus: true,
      PHV_kuormarajoitin: 'max 60%',
      RAE_kvartiili: 'Q3',
      FLEI_pct: 58,
      flei_viimeisin: { pct: 58, taso: 'prioriteetti', pvm: '2026-02-15', ikaluokka: 'U15' },
      ketjupisteet: { SBL:1.8, SFL:1.5, LL:1.3, SL:1.6, DFL:1.2, FL:1.5, heikoin:'DFL', vahvin:'SBL' },
      TSI: 0.48,
      ADAR_pisteet: 7,
      IDP_taso: 'perus',
      X_Factor_signaali: false,
      profiilityyppi: null,
      profiili_mastery: null,
      D1_fyysinen: 24, D2_tekninen: 16, D3_psykologinen: 11,
      D4_kognitiivinen: 7, D5_sosiaalinen: 7, D_yhteensa: 65,
      kotitehtava_streak: 3
    },
    {
      id: 'demo-p003',
      nimi: 'Matias Leinonen',
      sukupuoli: 'poika',
      syntymavuosi: 2013,
      ika: 12,
      joukkue: 'Demo U13',
      positio: 'HYK',
      PHV_vaihe: 'pre-PHV',
      RAE_kvartiili: 'Q4',
      FLEI_pct: 71,
      flei_viimeisin: { pct: 71, taso: 'kehitys', pvm: '2026-02-15', ikaluokka: 'U12' },
      ketjupisteet: { SBL:2.2, SFL:2.0, LL:1.8, SL:2.3, DFL:1.9, FL:2.0, heikoin:'LL', vahvin:'SL' },
      TSI: 0.31,
      ADAR_pisteet: 8,
      IDP_taso: 'perus',
      X_Factor_signaali: false,
      profiilityyppi: null,
      profiili_mastery: null,
      D1_fyysinen: 28, D2_tekninen: 18, D3_psykologinen: 12,
      D4_kognitiivinen: 8, D5_sosiaalinen: 7, D_yhteensa: 73,
      kotitehtava_streak: 7,
      RAE_huomio: 'Q4-pelaaja — biologinen ikä +6kk korjaus'
    }
  ];

  for (const p of pelaajat) {
    const { id, ...data } = p;
    await db.collection('seurat').doc('demo-fc')
      .collection('pelaajat').doc(id)
      .set({ palloID: id, ...data }, { merge: true });
    console.log(`   → ${p.nimi} (${id}) ✅`);
  }

  // ── VAIHE 4: Kartoitukset ─────────────────────────────────────────
  console.log('\n4/5 Luodaan kartoitukset...');

  const krt = [
    // Aleksi Virtanen — U15, FLEI 84%, heikoin LL
    {
      id: 'demo-krt-001',
      pelaajaId: 'demo-p001',
      nimi: 'Aleksi Virtanen',
      sukupuoli: 'poika', ika: 13,
      joukkue: 'Demo U13',
      ikäluokka: 'U15',
      phvTila: 'pre-PHV',
      kausi: '2026-kevät',
      testauspvm: admin.firestore.Timestamp.fromDate(new Date('2026-02-15')),
      arvioija: 'Valmentaja Mikko Laakso',
      seuraId: 'demo-fc',
      luotu: admin.firestore.FieldValue.serverTimestamp(),
      yhteenveto: { pisteetYhteensa:25, pisteetMaksimi:30, fleiProsentti:84, fleiTaso:'hyvä', kuormaRajoitin:false },
      ketjupisteet_yhteenveto: { SBL:2.7, SFL:2.4, LL:1.5, SL:2.5, DFL:2.3, FL:2.1, heikoin:'LL', vahvin:'SBL' },
      auto_ohjelma: {
        heikoin_ketju: 'LL',
        aktivointi: 'Clamshell 2×12 + Lateral hip circle 2×10 + SL wall hold 2×20s',
        taso1_harjoite: 'Lateral band walk 3×15 + SL squat tuella 3×6',
        kenttacue: '3 askeleella jarrutus — polvilinja ei murru. Jarrutus LL:n kautta, ei polvesta.',
        klinikka_trigger: false,
        PHV_kuormaperiaate: 'Eksentrinen ensin — 20-30 min max',
        ikaluokka: 'U15'
      },
      u12: null,
      u15: {
        pistoolikyykky:   { tulos:7,    pisteet:2, huomio:'',                      fascia_linja:'LL'  },
        etunojapunnerrus: { tulos:22,   pisteet:3, huomio:'',                      fascia_linja:'FL'  },
        leuanveto:        { tulos:8,    pisteet:3, huomio:'',                      fascia_linja:'FL'  },
        testi4_valinta:   'jalkojenNosto',
        testi4_tulos:     { tulos:12,   pisteet:2, huomio:'',                      fascia_linja:'DFL' },
        lantionnosto:     { tulos:35,   pisteet:2, huomio:'',                      fascia_linja:'SBL' },
        testi6_valinta:   'naruhypyt30s',
        testi6_tulos:     { tulos:65,   pisteet:3, huomio:'',                      fascia_linja:'SBL' },
        slr:              { tulos:null, pisteet:3, huomio:'OK molemmin puolin',    fascia_linja:'SBL' },
        thomasTesti:      { tulos:null, pisteet:2, huomio:'vasen hieman kireys',   fascia_linja:'SFL' },
        pituushyppy:      { tulos:2.15, pisteet:3, huomio:'',                      fascia_linja:'SBL' },
        loikka5:          { tulos:10.8, pisteet:2, huomio:'',                      fascia_linja:'SBL' }
      },
      u19: null
    },
    // Eeli Korhonen — PHV-huippu, FLEI 58%, klinikka-trigger
    {
      id: 'demo-krt-002',
      pelaajaId: 'demo-p002',
      nimi: 'Eeli Korhonen',
      sukupuoli: 'poika', ika: 13,
      joukkue: 'Demo U13',
      ikäluokka: 'U15',
      phvTila: 'PHV-huippu',
      kausi: '2026-kevät',
      testauspvm: admin.firestore.Timestamp.fromDate(new Date('2026-02-15')),
      arvioija: 'Valmentaja Mikko Laakso',
      seuraId: 'demo-fc',
      luotu: admin.firestore.FieldValue.serverTimestamp(),
      yhteenveto: { pisteetYhteensa:17, pisteetMaksimi:30, fleiProsentti:58, fleiTaso:'prioriteetti', kuormaRajoitin:true },
      ketjupisteet_yhteenveto: { SBL:1.8, SFL:1.5, LL:1.3, SL:1.6, DFL:1.2, FL:1.5, heikoin:'DFL', vahvin:'SBL' },
      auto_ohjelma: {
        heikoin_ketju: 'DFL',
        aktivointi: '360° palleahengitys 3×5 min + Dead bug taso 1 3×5/puoli',
        taso1_harjoite: 'Plank 2×20s + Dead bug polvi 3×5/puoli',
        kenttacue: 'Hengitä ympäri kylkiä — ei rintaan ylös. Skannaus ennen palloa.',
        klinikka_trigger: true,
        klinikka_toimet: 'DFL-mobilisointi, pallea aktivointi, thorax mob',
        PHV_kuormaperiaate: 'MAX 60% kuorma — PHV-kriittinen! SLR-flossing pakollinen',
        ikaluokka: 'U15'
      },
      u12: null,
      u15: {
        pistoolikyykky:   { tulos:4,    pisteet:1, huomio:'vasen heiluu',         fascia_linja:'LL'  },
        etunojapunnerrus: { tulos:14,   pisteet:1, huomio:'selkä pyöristyy',      fascia_linja:'FL'  },
        leuanveto:        { tulos:4,    pisteet:1, huomio:'',                     fascia_linja:'FL'  },
        testi4_valinta:   'jalkojenNosto',
        testi4_tulos:     { tulos:7,    pisteet:1, huomio:'lantio kallistuu',     fascia_linja:'DFL' },
        lantionnosto:     { tulos:28,   pisteet:1, huomio:'',                     fascia_linja:'SBL' },
        testi6_valinta:   'naruhypyt30s',
        testi6_tulos:     { tulos:54,   pisteet:2, huomio:'',                     fascia_linja:'SBL' },
        slr:              { tulos:null, pisteet:2, huomio:'kireys oikealla',      fascia_linja:'SBL' },
        thomasTesti:      { tulos:null, pisteet:1, huomio:'molemmin puolin kireys', fascia_linja:'SFL' },
        pituushyppy:      { tulos:1.88, pisteet:2, huomio:'PHV — älä vertaa',    fascia_linja:'SBL' },
        loikka5:          { tulos:9.4,  pisteet:1, huomio:'PHV — epäsymmetria',  fascia_linja:'SBL' }
      },
      u19: null
    },
    // Matias Leinonen — U12, FLEI 71%, Q4-pelaaja
    {
      id: 'demo-krt-003',
      pelaajaId: 'demo-p003',
      nimi: 'Matias Leinonen',
      sukupuoli: 'poika', ika: 12,
      joukkue: 'Demo U13',
      ikäluokka: 'U12',
      phvTila: 'pre-PHV',
      kausi: '2026-kevät',
      testauspvm: admin.firestore.Timestamp.fromDate(new Date('2026-02-15')),
      arvioija: 'Valmentaja Mikko Laakso',
      seuraId: 'demo-fc',
      luotu: admin.firestore.FieldValue.serverTimestamp(),
      yhteenveto: { pisteetYhteensa:19, pisteetMaksimi:27, fleiProsentti:71, fleiTaso:'kehitys', kuormaRajoitin:false },
      ketjupisteet_yhteenveto: { SBL:2.2, SFL:2.0, LL:1.8, SL:2.3, DFL:1.9, FL:2.0, heikoin:'LL', vahvin:'SL' },
      auto_ohjelma: {
        heikoin_ketju: 'LL',
        aktivointi: 'Clamshell 2×12 + Lateral hip circle 2×10 + SL wall hold 2×20s',
        taso1_harjoite: 'Lateral band walk 3×15 + SL squat tuella 3×6',
        kenttacue: '3 askeleella jarrutus — polvilinja ei murru',
        klinikka_trigger: false,
        PHV_kuormaperiaate: 'Kehonpaino — liikemallit ensin, max 20 min/sessio',
        ikaluokka: 'U12'
      },
      u12: {
        valakyykky:        { tulos:null, pisteet:2, huomio:'pieni kallistus oik',  fascia_linja:'DFL' },
        luistelijanKyykky: { tulos:null, pisteet:2, huomio:'',                     fascia_linja:'LL'  },
        askelkyykky:       { tulos:null, pisteet:2, huomio:'hyvä',                 fascia_linja:'SFL' },
        hyvaaHuomenta:     { tulos:null, pisteet:3, huomio:'erinomainen',          fascia_linja:'SBL' },
        etunojapunnerrus:  { tulos:null, pisteet:2, huomio:'',                     fascia_linja:'FL'  },
        lankku60s:         { tulos:42,   pisteet:2, huomio:'',                     fascia_linja:'DFL' },
        naruhypyt15s:      { tulos:29,   pisteet:2, huomio:'',                     fascia_linja:'SBL' },
        pituushyppy:       { tulos:1.82, pisteet:2, huomio:'',                     fascia_linja:'SBL' },
        loikka5:           { tulos:9.1,  pisteet:2, huomio:'',                     fascia_linja:'SBL' }
      },
      u15: null,
      u19: null
    }
  ];

  for (const k of krt) {
    const { id, ...data } = k;
    await db.collection('seurat').doc('demo-fc')
      .collection('kartoitukset').doc(id)
      .set(data, { merge: true });
    console.log(`   → ${k.nimi} (${id}) ✅`);
  }

  // ── VAIHE 5: Valmentajan havainto ────────────────────────────────
  console.log('\n5/5 Luodaan valmentajan havainto...');
  await db.collection('seurat').doc('demo-fc')
    .collection('kirjaukset').doc('demo-hav-001')
    .set({
      tyyppi: 'kenttahavainto',
      pelaajaId: 'demo-p001',
      pelaajanNimi: 'Aleksi Virtanen',
      joukkue: 'Demo U13',
      valmentaja: 'Mikko Laakso',
      pvm: admin.firestore.Timestamp.fromDate(new Date('2026-03-25')),
      havaintoTyyppi: 'vahvistus',
      teksti: 'Skannaus parantunut selvästi — katse ylös ennen vastaanottoa. Paineessa palaa vielä vanhaan malliin. Tarvitsee nopeita tilanteita joissa pitää skannata.',
      ADAR_pisteet: 10,
      harjoitusRPE: 7,
      luotu: admin.firestore.FieldValue.serverTimestamp()
    }, { merge: true });
  console.log('   → Havainto luotu ✅');

  // ── YHTEENVETO ────────────────────────────────────────────────────
  console.log('\n═══════════════════════════════════════════');
  console.log('  Demo FC — Setup valmis!');
  console.log('═══════════════════════════════════════════');
  console.log('\nKirjautumistiedot:');
  console.log('  Email:    vp.demo@talentmaster.fi');
  console.log('  Salasana: TM_Demo_2026!');
  console.log('\nIDP-kortti suoraan URL:lla:');
  console.log('  Aleksi: ?seuraId=demo-fc&pelaajaId=demo-p001');
  console.log('  Eeli:   ?seuraId=demo-fc&pelaajaId=demo-p002');
  console.log('  Matias: ?seuraId=demo-fc&pelaajaId=demo-p003');
  console.log('\nFirestore-polku: seurat/demo-fc/');
  console.log('  pelaajat/ — 3 kpl');
  console.log('  kartoitukset/ — 3 kpl');
  console.log('  kirjaukset/ — 1 kpl (valmentajan havainto)');

  process.exit(0);
}

setupDemoFC().catch(err => {
  console.error('\n❌ Virhe:', err.message);
  process.exit(1);
});
