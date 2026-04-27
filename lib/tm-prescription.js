/* ═══════════════════════════════════════════════════════════════════
   TalentMaster — Ohjelma-geneattori (Prescription)
   
   Kaksi pääkäyttötapaa:
   
   1. generoimPreHarkka(joukkue, optiot) — VALMENTAJALLE
      30 min ennen jalkapalloharjoitusta, aggregoitu joukkueelle
      Rakenne: 5 min lämmittely + 15 min pääketju + 7 min toissijainen + 3 min pelillinen
      Lähde: Master v9:n 70/30-logiikka + jaksorakenne
      
   2. generoimYksilo(pelaaja, optiot) — PELAAJALLE
      Viikko-ohjelma jokaiselle päivälle (T/D/S/P + laskeutuminen)
      Lähde: harjoitelogiikka_v4_2.js — generoimViikoOhjelma
   
   Molemmat hyödyntävät:
   - lib/tm-methodology.js (KETJUT, STAGES, JAKSOT, MESOSYKLIT)
   - lib/tm-profile.js (laskeEfektiivinenStage, laskeKetjuProfiili)
   ═══════════════════════════════════════════════════════════════════ */

(function(root) {
  'use strict';

  var M  = root.TM && root.TM.metodologia;
  var P  = root.TM && root.TM.profile;
  var MC = root.TM && root.TM.microcycles;
  if (!M || !P) {
    console.warn('[tm-prescription] tm-methodology.js + tm-profile.js pitää ladata ensin');
  }
  if (!MC) {
    console.warn('[tm-prescription] tm-microcycles.js puuttuu — mikrosyklit ohitetaan');
  }

  // ═══════════════════════════════════════════════════════════════════
  // HARJOITEPANKKI — Ketju × Stage → konkreettinen harjoite
  // Yksinkertaistettu versio Master v9:n HARJOITE_KIRJASTO:sta +
  // harjoitelogiikka_v4_2.js:n PANKKI.D:stä. Tämä on MINIMI joka
  // tarvitaan pre-harkan generointiin — laajennetaan myöhemmin.
  // ═══════════════════════════════════════════════════════════════════
  var PANKKI = {
    SBL: {
      aktivointi: {
        nimi: 'Naruhypyt + pohjeeksentrinen',
        ohje_leikkija: 'Hypi narulla 15 sekuntia — varpaat maahan! Sitten nouse varpaille 10 kertaa.',
        ohje_rakentaja: 'Naruhypyt 3×15s päkiäkontaktilla. Pohjeeksentrinen tolpan reunalla 3×10.',
        ohje_showcase: 'Naruhypyt 3×15s rytmi edellä. Pohjeeksentrinen 3×10 hallitusti. SBL aktivoitu.',
        kesto: '5 min', yt: 'KNO_XZBS5jk',
        phv_ohje: 'Naruhypyt 2×10s kevyesti. Eksentrinen pois.'
      },
      S1: { nimi: 'Reaktiolähtö — pallo maahan', ohje: 'Heitä pallo maahan, lähde sprintille kun pomppaa. 5×3 × 15m. Palautus kävellen.', kesto: '8 min', phv_ohje: '3 lähtöä 70%. Takaketju herkkä.' },
      S2: { nimi: '5-loikka + mittaus', ohje: '5-loikka 3× — mittaa matka. Sitten 3×30m sprintti. Kirjaa tulokset.', kesto: '10 min', phv_ohje: 'Vain loikat 2×3 kevyesti.' },
      S3: { nimi: 'Reaktiolähtö + pallonhallinta', ohje: 'Pallo 5m eteen — räjähtävä lähtö, vastaanota, kuljeta 15m. 6×.', kesto: '12 min', phv_ohje: '4 toistoa 70%.' },
      S4: { nimi: '5-loikka + Nordic curl', ohje: '5-loikka 3× maksimi. Nordic curl 3×5 eksentrinen hallitusti.', kesto: '12 min', phv_ohje: 'Nordic curl pois.' },
      S5: { nimi: 'Sprint + pallo + laukaus', ohje: 'Pallo 5m → sprint → vastaanota → kuljeta 15m → laukaus maaliin. 6× + mittaus.', kesto: '15 min', phv_ohje: '4 toistoa 70%.' }
    },
    SFL: {
      aktivointi: {
        nimi: 'Hip flexor + askelkyykky-kävely',
        ohje_leikkija: 'Polvi maahan, toinen jalka eteen. Kallista eteen 30s. Vaihda. Sitten iso askelkävely 10 askelta.',
        ohje_rakentaja: 'Hip flexor 90/90 2×30s per puoli. Askelkyykky-kävely 2×10m.',
        ohje_showcase: 'Hip flexor 2×45s. Askelkyykky-kävely 2×10m. SFL: lonkankoukistaja → quadriceps.',
        kesto: '5 min', yt: 'UcGAOOBMYMU',
        phv_ohje: 'Vain 90/90-venytys 3×30s. Ei kyykkyä.'
      },
      S1: { nimi: 'Kyykkyhyppy pehmeä', ohje: 'Kyykkyhyppy 3×8 — pehmeä laskeutuminen, ei kolahdusta.', kesto: '8 min', phv_ohje: '2×5 kevyesti.' },
      S2: { nimi: 'Kyykkyhyppy toistot', ohje: 'Kyykkyhyppy 3×8 + elastinen rytmi — alas→ylös ilman pysähdystä.', kesto: '10 min', phv_ohje: '2×5 60% teholla.' },
      S3: { nimi: 'Etuketjun laskeutuminen', ohje: 'Kyykkyhyppy 5×3 elastisesti. Nopea alas = nopea ylös.', kesto: '12 min', phv_ohje: 'Max Stage — seuraa kipua.' },
      S4: { nimi: 'Drop jump + 90° rotaatio', ohje: 'Hyppää ylös → laskeudu 90° käännyneenä. 5 per suunta × 3.', kesto: '12 min', phv_ohje: 'Ei rotaatiota — suoraan 3×5.' },
      S5: { nimi: 'Sprint + potku', ohje: 'Sprint 15m → pallo → maaliin. Mittaa laukaustarkkuus.', kesto: '15 min', phv_ohje: '70% teholla 4×.' }
    },
    LL: {
      aktivointi: {
        nimi: 'Clamshell + sivulankku',
        ohje_leikkija: 'Kyljellä, polvet yhteen. Avaa yläpolvi ylös 12× per puoli. Sivulankku 20s per puoli.',
        ohje_rakentaja: 'Clamshell 2×12 per puoli. Sivulankku 2×20s per puoli.',
        ohje_showcase: 'Clamshell 2×12 gluteus medius aktivaatiolla. Sivulankku 2×20s. LL = ACL-suojaus.',
        kesto: '5 min', yt: 'p5UANxnGByc',
        phv_ohje: 'Normaali — isometriset ovat turvallisia.'
      },
      S1: { nimi: 'Sivuhyppely + luisteluaskeleet', ohje: 'Sivulle yhdellä 8× per jalka. Luisteluaskel 2×20m.', kesto: '8 min', phv_ohje: '2×5 per puoli.' },
      S2: { nimi: 'T-rata hidas', ohje: 'T-rata 4 kartiolla — tekniikka edellä. 4× palautuksella.', kesto: '10 min', phv_ohje: 'Normaali, ei maksiminopeus.' },
      S3: { nimi: 'T-rata ajalla + reaktio-SM', ohje: 'T-rata 4× ajalla. Reaktio-SM partnerin osoittamana 6× per puoli.', kesto: '12 min', phv_ohje: 'Normaali.' },
      S4: { nimi: 'YJ-laskeutuminen sivulle + pito', ohje: 'Sivuhyppy yhdellä → kyykky → pito 2s. 5×3 per jalka. Polvi linjassa!', kesto: '12 min', phv_ohje: 'Pelkkä sivuaskel — ei hyppyä. 3×5.' },
      S5: { nimi: 'Reaktiivinen YJ-loikka + 1v1', ohje: 'YJ-sivuloikka ilman pitoa 3×8. Sitten 1v1 5×5m, 3×2 min.', kesto: '15 min', phv_ohje: 'Hidas 3×6, ei 1v1.' }
    },
    DIAG: {
      aktivointi: {
        nimi: 'Seinäsyöttö — molemmat jalat',
        ohje_leikkija: 'Lähetä pallo seinälle oikealla — ota vasemmalla. 20 per jalka.',
        ohje_rakentaja: 'Seinäsyöttö vuorojaloilla 3×20. 1 kosketus per jalka.',
        ohje_showcase: 'Seinäsyöttö 3×20 + ponnauttelu 3×1 min. DIAG: syöttö +13% Liikanen 2025.',
        kesto: '5 min', yt: 'FGhd77TRdC4',
        phv_ohje: 'Normaali — pallolliset tekniikkaharjoitteet aina turvallisia.'
      },
      S1: { nimi: 'Seinäsyöttö yksi kosketus', ohje: 'Seinäsyöttö 3×2 min, 1 kosketus. Pallo pysyy lähellä.', kesto: '8 min', phv_ohje: 'Normaali.' },
      S2: { nimi: 'Seinäsyöttö + ponnauttelu', ohje: 'Seinäsyöttö 3×20 + ponnauttelu 3×1 min. Laske toistot.', kesto: '10 min', phv_ohje: 'Normaali.' },
      S3: { nimi: 'Skannausrutiini', ohje: 'Seinäsyöttö + katse ylös ennen vastaanottoa, nimeä 3 asiaa. 3×2 min.', kesto: '12 min', phv_ohje: 'Normaali — PHV:n paras harjoite.' },
      S4: { nimi: 'Syöttö + vastaanotto + avaus', ohje: 'Kaverin kanssa: syöttö → vastaanotto auki vastustajasta → syöttö takaisin. 20 min.', kesto: '12 min', phv_ohje: 'Normaali.' },
      S5: { nimi: 'Läpisyöttö + SM + laukaus', ohje: 'Pelimäisesti: SM-pallo → vastaanotto → läpisyöttö ulkojalalla → laukaus.', kesto: '15 min', phv_ohje: 'Normaali.' }
    },
    DFL: {
      aktivointi: {
        nimi: '360° hengitys + cat-cow + dead bug',
        ohje_leikkija: 'Nelinkontin: kissa-lehmä 8×. Selällään: dead bug 8× per puoli hitaasti.',
        ohje_rakentaja: '360° palleahengitys 3×5. Dead bug 3×5 per puoli. Cat-cow 3×8.',
        ohje_showcase: '360° hengitys 3×5. Dead bug 3×5. Cat-cow 3×8. DFL: pallea + core.',
        kesto: '5 min', yt: 'kqnua4rHVIA',
        phv_ohje: 'Paras valinta PHV:ssä — kaikki turvallisia.'
      },
      S1: { nimi: 'Lankku + bird dog', ohje: 'Lankku 3×20s. Bird dog 3×8 per puoli.', kesto: '8 min', phv_ohje: 'Normaali, pidennä kestoa.' },
      S2: { nimi: 'Lankku + sivulankku + bird dog', ohje: 'Lankku 3×30s. Sivulankku 3×20s per puoli. Bird dog 3×8.', kesto: '10 min', phv_ohje: 'Normaali.' },
      S3: { nimi: 'Karhukävely + tasapaino', ohje: 'Karhukävely 2×10m. YJ-seisonta silmät kiinni 3×25s.', kesto: '12 min', phv_ohje: 'Paras PHV-harjoite.' },
      S4: { nimi: 'Eläinrata + tasapainolauta', ohje: 'Karhukävely + hämähäkki + matokävely 2×10m kutakin. Tasapainolauta 3×30s.', kesto: '12 min', phv_ohje: 'Normaali.' },
      S5: { nimi: 'Pistoolikyykky + BOSU', ohje: 'Pistoolikyykky avustettuna 3×5 per jalka. BOSU + pallon käsittely.', kesto: '15 min', phv_ohje: 'Ei pistoolikyykkyä — bird dog + tasapaino.' }
    }
  };

  // Pelillinen kytkentä — ADAR (peliäly)
  var PELILLINEN_KYTKENTA = [
    { nimi: '3v3 katse ylös', ohje: 'Pieni alue, sääntö: nimeä 1 asia ennen kosketusta. 3 min.' },
    { nimi: '1v1 skannaus', ohje: 'Ennen pallon vastaanottoa katso ylös ja kerro numero jonka partneri näyttää.' },
    { nimi: 'Syöttöympyrä', ohje: '4 pelaajaa, 1 keskellä. Syötä, liiku, huuda nimen ennen syöttöä.' },
    { nimi: 'Rondo 4v1', ohje: 'Pieni alue, 1 kosketus. Keskellä vaihtuu häviäjä.' }
  ];

  // ═══════════════════════════════════════════════════════════════════
  // APURIT
  // ═══════════════════════════════════════════════════════════════════
  function _valitseOhje(harj, kielitaso) {
    if (!harj) return null;
    if (kielitaso === 'leikkija' && harj.ohje_leikkija) return harj.ohje_leikkija;
    if (kielitaso === 'rakentaja' && harj.ohje_rakentaja) return harj.ohje_rakentaja;
    if (kielitaso === 'showcase' && harj.ohje_showcase) return harj.ohje_showcase;
    return harj.ohje || harj.ohje_rakentaja || harj.ohje_leikkija || harj.ohje_showcase;
  }

  function _haeStageHarjoite(ketju, stage) {
    var pool = PANKKI[ketju];
    if (!pool) return null;
    return pool['S' + stage] || pool['S' + Math.max(1, stage - 1)] || pool['S2'] || null;
  }

  function _haeAktivointi(ketju) {
    return (PANKKI[ketju] || {}).aktivointi || null;
  }

  // ═══════════════════════════════════════════════════════════════════
  // VALMENTAJA — 30 min pre-harkka
  //
  // Input:
  //   joukkue = { pelaajat: [...], nimi: 'U15 Seura' }
  //   optiot  = { paiva: Date, yhteiskielitaso: 'rakentaja' }
  //
  // Rakenne:
  //   5 min  · Yhteinen aktivointi (DFL — hengitys + core)
  //   15 min · Pääketju (joukkueen vahvin → 70%)
  //   7 min  · Toissijainen (joukkueen heikoin → 30% kohdennettu)
  //   3 min  · Pelillinen kytkentä (ADAR)
  //
  // HUOM: 70/30 = vahvin/heikoin, Master v9:n alkuperäinen logiikka.
  //       Vahvuuksia rakennetaan, heikkouksia kohdennetaan.
  // ═══════════════════════════════════════════════════════════════════
  function generoimPreHarkka(joukkue, optiot) {
    optiot = optiot || {};
    var paiva = optiot.paiva || new Date();
    var pelaajat = (joukkue && joukkue.pelaajat) || [];

    var ketjuData = P.laskeJoukkuenKetjut(pelaajat);
    var heikoin = ketjuData.length > 0 ? ketjuData[0] : null;
    var vahvin  = ketjuData.length > 1 ? ketjuData[ketjuData.length - 1] : null;

    var jakso = M._laskeJakso(paiva);
    var mesosykli = M._laskeMesosykli(paiva);

    // Joukkueen iän ja PHV-tilan oletus (kaikki samanikäisiä)
    var ep = pelaajat[0] || {};
    var ika = ep.ika || 14;
    if (!ep.ika && ep.syntymaaika) {
      var sa = ep.syntymaaika.toDate ? ep.syntymaaika.toDate() : new Date(ep.syntymaaika);
      ika = Math.floor((Date.now() - sa.getTime()) / (365.25 * 24 * 3600 * 1000));
    }
    var phvOsuus = pelaajat.filter(function(p) { return p.phv_tila === 'PH'; }).length;
    var phvRajoitus = phvOsuus >= 3; // 3+ PHV-pelaajaa → koko joukkue varovammin
    var phvTila = phvRajoitus ? 'PH' : 'AN';
    var kielitaso = optiot.yhteiskielitaso || (ika <= 12 ? 'leikkija' : ika <= 15 ? 'rakentaja' : 'showcase');

    // Efektiiviset Stagee
    var stage70 = P.laskeEfektiivinenStage(vahvin ? vahvin.ka : 0, phvTila, ika, jakso);
    var stage30 = P.laskeEfektiivinenStage(heikoin ? heikoin.ka : 0, phvTila, ika, jakso);

    // Valitse harjoitteet
    var aktivointiKetju = heikoin ? heikoin.ketju : 'DFL'; // aktivointi tukee heikointa
    var akt = _haeAktivointi(aktivointiKetju) || _haeAktivointi('DFL');
    var vahvuus = vahvin ? _haeStageHarjoite(vahvin.ketju, stage70.stage) : _haeStageHarjoite('DFL', 1);
    var kohdistettu = heikoin ? _haeStageHarjoite(heikoin.ketju, stage30.stage) : _haeStageHarjoite('LL', 2);

    // Yksilöllinen 30%-muistutus
    var yhteenveto = P.rakenna30ProsenttiYhteenveto(pelaajat);

    // Pelillinen kytkentä — mesosyklin mukaan tai random
    var vko = M._viikonNumero(paiva);
    var pelillinen = PELILLINEN_KYTKENTA[vko % PELILLINEN_KYTKENTA.length];

    // Pre-harkka blokit
    var blokit = [
      {
        vaihe: 'aktivointi',
        tyyppi: 'AKTIVOINTI',
        kesto: 5,
        aikaAlku: '0:00', aikaLoppu: '5:00',
        otsikko: 'Yhteinen aktivointi · 5 min',
        alaotsikko: 'Valmistaa koko joukkueen — etenkin ' + (heikoin ? heikoin.nimi.toLowerCase() : 'heikointa ketjua'),
        ketju: aktivointiKetju,
        ketjuNimi: (M.KETJUT[aktivointiKetju] || {}).nimi || aktivointiKetju,
        ketjuEmoji: (M.KETJUT[aktivointiKetju] || {}).emoji || '',
        stage: 1,
        nimi: akt ? akt.nimi : 'Yleinen aktivointi',
        ohje: akt ? _valitseOhje(akt, kielitaso) : 'Hengitys + cat-cow + dynaaminen venytys',
        yt: akt ? akt.yt : null,
        phv_muistutus: phvRajoitus ? (akt && akt.phv_ohje) : null
      },
      {
        vaihe: 'vahvuus70',
        tyyppi: '70% VAHVUUS',
        kesto: 15,
        aikaAlku: '5:00', aikaLoppu: '20:00',
        otsikko: '70% · Vahvuusharjoite · 15 min',
        alaotsikko: vahvin
          ? 'Joukkueen vahvin: ' + vahvin.emoji + ' ' + vahvin.nimi + ' · ka ' + vahvin.ka + 'p · pidetään terävänä'
          : 'Ei testidataa — oletus DFL',
        ketju: vahvin ? vahvin.ketju : 'DFL',
        ketjuNimi: vahvin ? vahvin.nimi : 'Hallintaketju',
        ketjuEmoji: vahvin ? vahvin.emoji : '🏗️',
        stage: stage70.stage,
        stagePeruste: stage70.perusteKielella,
        stageRajattu: stage70.rajattu,
        nimi: vahvuus ? vahvuus.nimi : 'Valitse harjoite',
        ohje: phvRajoitus && vahvuus && vahvuus.phv_ohje ? vahvuus.phv_ohje : (vahvuus ? vahvuus.ohje : ''),
        phv_muistutus: phvRajoitus ? '⚠️ ' + phvOsuus + ' PHV-pelaajaa joukkueessa — intensiteetti 70%' : null
      },
      {
        vaihe: 'kohdistettu30',
        tyyppi: '30% KOHDENNETTU',
        kesto: 7,
        aikaAlku: '20:00', aikaLoppu: '27:00',
        otsikko: '30% · Heikoimman ketjun kohdistus · 7 min',
        alaotsikko: heikoin
          ? 'Joukkueen heikoin: ' + heikoin.emoji + ' ' + heikoin.nimi + ' · ka ' + heikoin.ka + 'p · nostetaan'
          : 'Ei testidataa',
        ketju: heikoin ? heikoin.ketju : 'LL',
        ketjuNimi: heikoin ? heikoin.nimi : 'Sivuketju',
        ketjuEmoji: heikoin ? heikoin.emoji : '↔️',
        stage: stage30.stage,
        stagePeruste: stage30.perusteKielella,
        stageRajattu: stage30.rajattu,
        nimi: kohdistettu ? kohdistettu.nimi : 'Valitse harjoite',
        ohje: phvRajoitus && kohdistettu && kohdistettu.phv_ohje ? kohdistettu.phv_ohje : (kohdistettu ? kohdistettu.ohje : ''),
        yksilokohtaiset: yhteenveto, // kuka tarvitsee mitä
        phv_muistutus: phvRajoitus ? '⚠️ PHV — seuraa intensiteettiä, ei maksimia' : null
      },
      {
        vaihe: 'pelillinen',
        tyyppi: 'PELILLINEN KYTKENTÄ',
        kesto: 3,
        aikaAlku: '27:00', aikaLoppu: '30:00',
        otsikko: 'Pelillinen kytkentä · 3 min',
        alaotsikko: 'ADAR — peliäly liittyy liikkeeseen',
        ketju: 'PIG',
        ketjuNimi: 'Peliäly',
        ketjuEmoji: '🧠',
        nimi: pelillinen.nimi,
        ohje: pelillinen.ohje
      }
    ];

    return {
      joukkue: joukkue ? joukkue.nimi : 'Joukkue',
      paiva: paiva,
      kielitaso: kielitaso,
      ika: ika,
      pelaajaLkm: pelaajat.length,
      phvLkm: phvOsuus,
      phvRajoitus: phvRajoitus,
      jakso: jakso,
      mesosykli: mesosykli,
      ketjuAnalyysi: {
        jarjestys: ketjuData,
        heikoin: heikoin,
        vahvin: vahvin
      },
      blokit: blokit,
      kokonaiskesto: blokit.reduce(function(s, b) { return s + b.kesto; }, 0)
    };
  }

  // ═══════════════════════════════════════════════════════════════════
  // PELAAJA — yksilöohjelma 7 päivälle
  //
  // Yksinkertaistettu versio harjoitelogiikka_v4_2.js:n
  // generoimViikoOhjelma:sta — käyttää samaa jakso/stage-logiikkaa
  // kuin pre-harkka.
  //
  // Input:
  //   pelaaja = { etunimi, ika, phv_tila, flei_ketjut, ... }
  //   optiot  = { joukkuePaivat: [1, 4], paiva: Date }
  // ═══════════════════════════════════════════════════════════════════
  function generoimYksilo(pelaaja, optiot) {
    optiot = optiot || {};
    var joukkuePaivat = optiot.joukkuePaivat || [1, 4]; // Ti + Pe
    var paiva = optiot.paiva || new Date();

    var prof = P.koostaProfiili(pelaaja, paiva);
    var PAIVAT = ['ma', 'ti', 'ke', 'to', 'pe', 'la', 'su'];
    var PAIVAT_PITKA = ['Maanantai','Tiistai','Keskiviikko','Torstai','Perjantai','Lauantai','Sunnuntai'];

    // Viikon alkupäivä (maanantai) → mikrosyklejä varten lasketaan jokaiselle päivälle oma pvm
    var viikonMa = new Date(paiva);
    var paivaIdxNyt = (paiva.getDay() + 6) % 7; // ma=0
    viikonMa.setDate(viikonMa.getDate() - paivaIdxNyt);

    // Viikon teema (sama koko viikon ajan — vk1..vk8 rotaatio)
    var viikkoTeema = MC ? MC.laskeViikkoTeema(viikonMa) : null;

    // Mikrosyklien optiot — pelaajan profiilista
    var mcOptiot = {
      efektiivinenStage: prof.stageKohdistettu ? prof.stageKohdistettu.stage : 2,
      kielitaso: prof.kielitaso,
      tiesitko_painotus: optiot.tiesitko_painotus || 'rotaatio',
      oma_valinta_idoli: optiot.oma_valinta_idoli || null  // vk8 "OMA"
    };

    var viikko = {};

    PAIVAT.forEach(function(pv, idx) {
      var onJoukkue = joukkuePaivat.indexOf(idx) !== -1;
      var onLepo = idx === 6; // sunnuntai
      var blokit = [];

      // Päivän pvm (mikrosyklin laskemiseen — laskeViikkoTeema palauttaa
      // saman lopputuloksen kaikille saman viikon päiville, mutta
      // generoiPaivanMikrosyklit voi sisäisesti tehdä päiväkohtaista variaatiota)
      var paivanPvm = new Date(viikonMa);
      paivanPvm.setDate(paivanPvm.getDate() + idx);

      // ── Mikrosyklit — generoidaan kaikille paitsi suodatetaan tyypeittäin
      var mikrosyklit = [];
      if (MC) {
        var kaikki = MC.generoiPaivanMikrosyklit(paivanPvm, mcOptiot) || [];
        if (onLepo) {
          // Lepopäivä → vain aamu + ilta (välitunti pois — koulupäivääkään ei ole)
          mikrosyklit = kaikki.filter(function(m) {
            return m.tyyppi === 'aamu' || m.tyyppi === 'ilta';
          });
        } else {
          mikrosyklit = kaikki;
        }
      }

      // T — joka päivä 15 min tekniikka (kaikille)
      blokit.push({
        tyyppi: 'T',
        otsikko: 'Päivittäinen pallokosketus · 15 min',
        nimi: prof.mesosykli.teema + ' — ' + prof.mesosykli.alue,
        ohje: 'Tämän kuukauden teema: ' + prof.mesosykli.kuvaus,
        ketju: 'DIAG',
        pakollinen: true
      });

      if (onJoukkue) {
        blokit.push({
          tyyppi: 'JOUKKUE',
          otsikko: 'Joukkueharjoitus · 60–90 min',
          nimi: 'Joukkueen yhteisharjoitus',
          ohje: 'Valmentajan suunnittelema. Keskity siihen.',
          ketju: null
        });
        viikko[pv] = {
          paivaIdx: idx, nimi: PAIVAT_PITKA[idx], tyyppi: 'joukkue',
          mikrosyklit: mikrosyklit, blokit: blokit
        };
        return;
      }

      if (onLepo) {
        viikko[pv] = {
          paivaIdx: idx, nimi: PAIVAT_PITKA[idx], tyyppi: 'lepo',
          mikrosyklit: mikrosyklit, blokit: blokit,
          viesti: 'Lepo on harjoittelua. Aamu + ilta-mikrosykli riittää tänään.'
        };
        return;
      }

      // D — joka arkipäivä (ei joukkueharjoituksissa): aktivointi heikoimmalle
      if (prof.ketjut.heikoin) {
        var akt = _haeAktivointi(prof.ketjut.heikoin);
        if (akt) {
          blokit.push({
            tyyppi: 'D',
            otsikko: 'Päivittäinen ketju-aktivointi · 5 min',
            nimi: akt.nimi,
            ohje: prof.phvTila === 'PH' && akt.phv_ohje ? akt.phv_ohje : _valitseOhje(akt, prof.kielitaso),
            ketju: prof.ketjut.heikoin
          });
        }
      }

      // S — keskiviikko/lauantai: kohdistettu harjoite
      if ((idx === 2 || idx === 5) && prof.ketjut.heikoin) {
        var s = _haeStageHarjoite(prof.ketjut.heikoin, prof.stageKohdistettu.stage);
        if (s) {
          blokit.push({
            tyyppi: 'S',
            otsikko: 'Kohdennettu harjoite · ' + s.kesto,
            nimi: s.nimi,
            ohje: prof.phvTila === 'PH' && s.phv_ohje ? s.phv_ohje : s.ohje,
            ketju: prof.ketjut.heikoin,
            stage: prof.stageKohdistettu.stage,
            stagePeruste: prof.stageKohdistettu.perusteKielella
          });
        }
      }

      // P — pitkän aikavälin kehitys (U15+, maanantai)
      if (idx === 0 && prof.ika >= 15 && prof.ketjut.vahvin) {
        var vahv = _haeStageHarjoite(prof.ketjut.vahvin, prof.stageVahvuus.stage);
        if (vahv) {
          blokit.push({
            tyyppi: 'P',
            otsikko: 'Pitkän aikavälin kehitys · ' + vahv.kesto,
            nimi: vahv.nimi,
            ohje: prof.phvTila === 'PH' && vahv.phv_ohje ? vahv.phv_ohje : vahv.ohje,
            ketju: prof.ketjut.vahvin,
            stage: prof.stageVahvuus.stage,
            stagePeruste: prof.stageVahvuus.perusteKielella
          });
        }
      }

      viikko[pv] = {
        paivaIdx: idx,
        nimi: PAIVAT_PITKA[idx],
        tyyppi: blokit.some(function(b) { return b.tyyppi === 'S'; }) ? 'kohdistettu'
              : blokit.some(function(b) { return b.tyyppi === 'P'; }) ? 'kehitys'
              : 'perus',
        mikrosyklit: mikrosyklit,
        blokit: blokit
      };
    });

    // Viikon mikrosyklit (yhteenveto)
    var viikonKosketukset = 0;
    if (MC) {
      Object.keys(viikko).forEach(function(pv) {
        viikonKosketukset += MC.arvioiKosketukset(viikko[pv].mikrosyklit || []);
      });
    }

    return {
      pelaaja: pelaaja.etunimi || 'Pelaaja',
      ika: prof.ika,
      phvTila: prof.phvTila,
      kielitaso: prof.kielitaso,
      ketjut: prof.ketjut,
      jakso: prof.jakso,
      mesosykli: prof.mesosykli,
      stageKohdistettu: prof.stageKohdistettu,
      stageVahvuus: prof.stageVahvuus,
      viikkoTeema: viikkoTeema,           // { vk, idoli, idoliNimi, teema, ketju, jakso }
      viikonKosketukset: viikonKosketukset, // arvio yhteensä viikossa
      viikko: viikko
    };
  }

  // ═══════════════════════════════════════════════════════════════════
  // EXPORTIT
  // ═══════════════════════════════════════════════════════════════════
  var TM = root.TM || (root.TM = {});
  TM.prescription = {
    generoimPreHarkka: generoimPreHarkka,
    generoimYksilo: generoimYksilo,
    PANKKI: PANKKI,
    PELILLINEN_KYTKENTA: PELILLINEN_KYTKENTA,
    VERSIO: '1.1.0'
  };

})(typeof window !== 'undefined' ? window : this);
