/**
 * TalentMaster™ — Kansainvälistäminen (i18n)
 * tm_lang.js
 *
 * Käyttö: lisää tämä tiedosto sivulle ennen muita skriptejä:
 *   <script src="tm_lang.js"></script>
 *
 * Kielivalinta:
 *   1. seurat/{id}.kieli -kentästä (sv / en / fi)
 *   2. localStorage['tm_kieli'] -asetuksesta (käyttäjän manuaalinen valinta)
 *   3. Oletuksena 'fi'
 *
 * Haku: t('avain.alain') — palauttaa oikean kielen tekstin
 * Fallback-järjestys: sv → en → fi (puuttuva käännös ei hajota)
 *
 * Avainkäytäntö: snake_case, kategoria.avain
 * Esim: t('nav.yhteenveto'), t('joukkueet.lisaa'), t('auth.kirjaudu')
 */

// ─────────────────────────────────────────────────────────────────
// KÄÄNNÖSTAULUKKO
// ─────────────────────────────────────────────────────────────────
const TM_LANG = {

  // ── SUOMI (referenssikieli) ────────────────────────────────────
  fi: {

    // Yleiset
    yleiset: {
      sovellus_nimi:    'TalentMaster™',
      tallenna:         'Tallenna',
      peruuta:          'Peruuta',
      sulje:            'Sulje',
      poista:           'Poista',
      muokkaa:          'Muokkaa',
      lataa:            'Lataa',
      laheta:           'Lähetä',
      hae:              'Hae',
      lisaa:            'Lisää',
      valmis:           'Valmis',
      latautuu:         'Ladataan...',
      virhe:            'Virhe',
      onnistui:         'Onnistui',
      pakollinen:       'pakollinen kenttä',
      vahvista_poisto:  'Haluatko varmasti poistaa?',
      ei_tietoja:       'Ei tietoja',
      kaikki:           'Kaikki',
      takaisin:         'Takaisin',
      aloita:           'Aloita',
      valmistaudu:      'Valmistaudu',
      tauko:            'Tauko',
      jatka:            'Jatka',
      takaisin_kotiin:  'Takaisin kotiin',
      ilm_tapahtuma: 'tapahtuma',
      ilm_klo: 'klo {aika}',
      ilm_peruttu: 'Peruttu: {nimi}',
      ilm_muutos: 'Muutos: {nimi}',
    },

    // Kirjautuminen
    auth: {
      sahkoposti:           'Sähköposti',
      salasana:             'Salasana',
      kirjaudu:             'Kirjaudu sisään',
      kirjaudu_ulos:        'Kirjaudu ulos',
      kirjautuu:            'Kirjaudutaan...',
      ladataan_seuran_tiedot: 'Ladataan seuran tietoja...',
      valitse_seura:        '— Valitse seura —',
      kirjautumisvirhe:     'Kirjautuminen epäonnistui — tarkista sähköposti ja salasana',
      ei_oikeuksia:         'Tämä näkymä on seuran hallinnolle. Valmentajat kirjautuvat valmentajan näkymään.',
      seura_ei_loydy:       'Seuraa ei löydy. Ota yhteyttä TalentMaster-ylläpitoon.',
      latausvirhe:          'Latausvirhe — päivitä sivu.',
    },

    // Navigaatio
    nav: {
      hallinta:         'HALLINTA',
      yhteenveto:       'Yhteenveto',
      kehitystilanne:   'Kehitystilanne',
      pelaajat:         'Pelaajat',
      joukkueet:        'Joukkueet',
      organisaatio:     'ORGANISAATIO',
      henkilosto:       'Henkilöstö',
      sopimukset:       'Sopimukset',
      toiminnot:        'TOIMINNOT',
      rekisterointi:    'Rekisteröintikutsu',
      tuo_excel:        'Tuo Excel',
      massakutsu:       'Massakutsu',
      navigoi:          'NAVIGOI',
      vp_dashboard:     'VP Dashboard',
      valmentaja:       'Valmentaja v9',
      tanaan:           'Tänään',
      mina:             'Minä',
      meista:           'Meistä',
      koti:             'Koti',
      viikko:           'Viikko',
      viestit:          'Viestit',
      kortti:           'Kortti',
      asetukset:        'Asetukset',
      suostumuslomake:  'Suostumuslomake',
    },

    // Seura
    seura: {
      seura:            'Seura',
      paketti:          'Paketti',
      perustaso:        'Perustaso',
      kehitystaso:      'Kehitystaso',
      huipputaso:       'Huipputaso',
      aktiivinen:       'Aktiivinen',
      ei_aktiivinen:    'Ei aktiivinen',
      lataa_excel_pohja: 'Lataa Excel-pohja',
      tuo_pelaajat_excelista: 'Tuo pelaajat Excelistä',
      excel_pohja_ladattu: 'Excel-pohja ladattu – {n} joukkuetta Asetukset-välilehdellä',
      excel_tuo_nappi: 'Minulla on täytetty Excel → Tuo järjestelmään',
      excel_ohje_otsikko: 'Tuo pelaajat Excelistä',
      excel_ohje_kuvaus: 'Seuraa kolmea vaihetta – koko prosessi kestää alle 10 minuuttia.',
      excel_v1_otsikko: 'Vaihe 1 – Lataa pohja',
      excel_v1_teksti: 'Paina Lataa Excel-pohja. Seuran joukkueet ovat valmiina Asetukset-välilehdellä, ja Esimerkki-välilehdellä näet mallirivit.',
      excel_v1_tagi_asetukset: 'Asetukset-välilehti',
      excel_v1_tagi_esimerkki: 'Esimerkki-välilehti',
      excel_v2_otsikko: 'Vaihe 2 – Täytä pelaajat',
      excel_v2_teksti: 'Täytä Pelaajat-välilehdelle jokaiselle pelaajalle etunimi, sukunimi, syntymävuosi, joukkue (kopioi nimi Asetukset-välilehdeltä) ja huoltajan sähköposti. Nämä ovat pakollisia. PalloID on vapaaehtoinen.',
      excel_tagi_syntymavuosi: 'Syntymävuosi *',
      excel_tagi_joukkue: 'Joukkue *',
      excel_v3_otsikko: 'Vaihe 3 – Tuo ja tarkista',
      excel_v3_teksti: 'Paina Minulla on täytetty Excel → Tuo järjestelmään. Tarkista esikatselu: punaiset rivit eivät tuonnissa mene läpi. Valitse Tuo vain, jos haluat lähettää kutsut myöhemmin, tai Tuo + lähetä kutsut, jolloin huoltajat saavat suostumuspyynnön sähköpostiin heti.',
      excel_v3_tagi_esikatselu: 'Esikatselu',
      excel_v3_tagi_tuo: 'Tuo vain / Tuo + kutsut',
      kortit_tulosta: 'Tulosta kortit',
      kortit_yhteenveto: '{x} pelaajakorttia, {y} suostumuskorttia, {z} ilman huoltajan sähköpostia.',
      kortit_ei_emailia: '{n} pelaajalta puuttuu huoltajan sähköposti – lisää se pelaajakortille.',
      kortti_skannaa_pin: 'Skannaa ja syötä PIN', kortti_ei_kaytossa: 'Ei käytössä – sovi käyttöönotosta TalentMasterin kanssa',   // L1c (PM 3.11.)
      suostumuskortti_teksti: 'Näytä tämä vanhemmallesi. Kun huoltaja antaa luvan (2 min), hän saa tunnuksesi sähköpostiin.',
      suostumuskortti_ala: 'Huoltajan lupa · TalentMaster',
      kortit_otsikko: 'Kortit',
      kortit_valmistellaan: 'Valmistellaan kortteja…',
      kortit_luodaan: 'Luodaan suostumuskortteja… {x}/{n}',
      kortit_qr: 'Luodaan QR-koodeja…',
      kortit_ponnahdus_estetty: 'Selain esti tulostusikkunan. Salli ponnahdusikkunat tälle sivulle ja paina uudelleen.',
      kortit_tulosta_nappi: 'Tulosta',
      kortit_peruuta: 'Peruuta',
      kortit_virhe: 'Korttien teko epäonnistui',
      kortit_ei_tulostettavaa: 'Ei tulostettavia kortteja',
      uusinta_vahvistus: 'Suostumus on jo annettu {pvm}. Lähetetäänkö huoltajalle suostumuksen uusimispyyntö?',
    },

    // Joukkueet
    joukkueet: {
      seuran_joukkueet: 'Seuran joukkueet',
      lisaa:            'Lisää joukkue',
      joukkue:          'JOUKKUE',
      ikatyokka:        'IKÄLUOKKA',
      vuosi:            'VUOSI',
      id:               'ID',
      toiminnot:        'TOIMINNOT',
      kutsu:            'Kutsu',
      lisaa_modal_otsikko: 'Lisää joukkue',
      lisaa_modal_kuvaus:  'Joukkueen tiedot tallennetaan Firestoreen ja ne näkyvät heti valmentajille.',
      joukkueen_nimi:   'JOUKKUEEN NIMI',
      ikaluokka_kentta: 'IKÄLUOKKA',
      joukkue_id:       'JOUKKUE-ID',
      joukkue_id_hint:  'Pieni kirjain, ei välejä (esim. kpv_u15)',
      syntymavuosi:     'VUOSI (SYNTYMÄVUOSI)',
      tallenna:         'Tallenna joukkue',
      poistettu:        'Joukkue poistettu',
      lisatty:          'Joukkue lisätty!',
      pakollinen_virhe: 'Nimi, ikäluokka ja ID ovat pakollisia.',
      seura_ei_ladattu: 'Seura ei ole ladattu. Kirjaudu ulos ja uudelleen sisään.',
    },

    // Pelaajat
    pelaajat: {
      seuran_pelaajat:  'Seuran pelaajat',
      hae_pelaajia:     'Hae pelaajia...',
      nimi:             'NIMI',
      joukkue:          'JOUKKUE',
      tila:             'TILA',
      aktiivinen:       'Aktiivinen',
      odottaa:          'Odottaa suostumusta',
      kutsu_lahetetty:  'Kutsu lähetetty',
      ei_pelaajia:      'Ei pelaajia tässä joukkueessa',
      kaikki_joukkueet: 'Kaikki joukkueet',
    },

    // Mittarit (julkiset termit, §14) — raaka "FLEI" → kontekstikohtainen
    mittarit: {
      kehon_valmius:        'Kehon valmius',
      valmius:              'Valmius',
      kehon_valmiusindeksi: 'kehon valmiusindeksi',
      // §7.22 — pelaajalle EI lukua vaan tila. Kynnykset 70/40 = samat kuin värikoodaus.
      valmiustila_valmis:   'Valmis treenaamaan',
      valmiustila_kehittyy: 'Kehittyy',
      valmiustila_huolto:   'Tarvitsee huoltoa',
      valmiustila_ei_dataa: 'Ei mitattu vielä',
    },

    // Kortti-välilehti (§7.22 + §58: aggregaatti-OVR vain Showcaselle, muille laadullinen tila)
    kortti: {
      otsikko:       'Kortti',
      tilastot:      'TILASTOT',
      streak:        'Streak',
      pv:            'pv',
      osa_aluetta:   'osa-aluetta',
      kasvaa:        'Kortti kasvaa kehittymisesi mukana.',
      seuraava_taso: 'Seuraava taso',
    },

    // Kaavio (erä D1) — hyväksytty teknis-taktinen piirros pelaajan konseptikortilla (§7.22)
    kaavio: {
      otsikko: 'Miltä se näyttää kentällä',
      saate:   'Valmentajasi piirsi tämän sinua varten.',
      kuittaa: 'Ymmärsin tämän',
      kuitattu: 'Ymmärretty',
      kuittaus_epaonnistui: 'Kuittaus ei mennyt perille — yritä hetken päästä.',
    },

    // Konseptikortti (Vaihe 4b) — CHROME. Sisältö tulee curriculum-kaanonista (sv-sidecar; ei en-lähdettä).
    konseptikortti: {
      eyebrow:           'Minä ja pallo · tämän hetken fokus',
      milloin_nakyy:     'Milloin tämä näkyy',
      miksi_auttaa:      'Miksi se auttaa',
      mieti_pelissa:     'Mieti tätä pelissä',
      kokeile:           'Kokeile tätä',
      valmentaja_katsoo: 'Valmentajasi katsoo samaa juttua.',
      vaihe_leikkija:    'Leikkijän vaihe',
      vaihe_rakentaja:   'Rakentajan vaihe',
      vaihe_pelipaikka:  'Pelipaikan vaihe',
    },

    // Rekisteröintikutsu
    rekisterointi: {
      otsikko:            'Lähetä rekisteröintikutsu',
      kuvaus:             'Kutsu pelaaja liittymään TalentMasteriin. Huoltaja saa sähköpostin, jossa on linkki suostumuslomakkeeseen.',
      pelaajan_etunimi:   'Pelaajan etunimi',
      pelaajan_sukunimi:  'Pelaajan sukunimi',
      huoltajan_sahkoposti: 'Huoltajan sähköposti',
      valitse_joukkue:    '— Valitse joukkue —',
      joukkue:            'Joukkue',
      laheta_nappi:       'Lähetä rekisteröintikutsu',
      lahetetaan:         'Lähetetään...',
      onnistui:           'Kutsu lähetetty!',
      virhe:              'Lähetys epäonnistui',
      pakollinen_virhe:   'Täytä kaikki pakolliset kentät.',
    },

    // Henkilöstö
    henkilosto: {
      otsikko:            'Seuran henkilöstö',
      lisaa:              'Lisää henkilö',
      nimi:               'NIMI',
      sahkoposti:         'SÄHKÖPOSTI',
      rooli:              'ROOLI',
      joukkue:            'JOUKKUE',
      toiminnot:          'TOIMINNOT',
      ei_henkilostoa:     'Ei henkilöstöä',
      roolit: {
        vp:                     'Valmennuspäällikkö',
        valmentaja:             'Valmentaja',
        talenttivalmentaja:     'Talenttivalmentaja',
        fysiikkavalmentaja:     'Fysiikkavalmentaja',
        fysioterapeutti:        'Fysioterapeutti',
        testivastaava:          'Testivastaava',
        seurasihteeri:          'Seurasihteeri',
        urheilutoimenjohtaja:   'Urheilutoimenjohtaja',
      },
    },

    // Yhteenveto / tervetuloa
    yhteenveto: {
      tervetuloa_otsikko:   'Seuranne',
      tervetuloa_teksti:    'Järjestelmä on valmis. Alla olevat kolme vaihetta käynnistävät seuran toiminnan — ensimmäiset pelaajat rekisteröityinä ja valmentajat kirjautuneet sisään.',
      vaihe:                'vaihetta valmis',
      vaihe_1_otsikko:      'Lisää joukkueet',
      vaihe_1_kuvaus:       'Luo seuran joukkueet — tämä aktivoi pelaajien rekisteröinnin ja valmentajien kutsumisen.',
      vaihe_1_nappi:        'Siirry Joukkueet-välilehdelle',
      vaihe_2_otsikko:      'Rekisteröi pelaajat',
      vaihe_2_kuvaus:       'Lataa Excel-rekisteripohja, täytä pelaajien tiedot ja lähetä massakutsu huoltajille suostumuslomakkeen kera.',
      vaihe_2_nappi:        'Lataa rekisteripohja',
      vaihe_3_otsikko:      'Kutsu valmentajat',
      vaihe_3_kuvaus:       'Lisää valmentajat järjestelmään ja anna heille pääsy joukkueensa tietoihin.',
      vaihe_3_nappi:        'Lisää henkilöstöä',
    },

    // Sähköpostipohjat (functions/index.js käyttää)
    email: {
      rekisteriKutsu_aihe:    '{seura} — Rekisteröintikutsu TalentMaster-järjestelmään',
      rekisteriKutsu_teksti:  '{seura} kutsuu teidät rekisteröimään {pelaaja} TalentMaster-järjestelmään',
      rekisteriKutsu_nappi:   'Rekisteröidy ja anna suostumus →',
      rekisteriKutsu_huom:    'Linkki on henkilökohtainen — älkää jakako eteenpäin.',
      tervetuloa_aihe:        'TalentMaster™ — Tervetuloa! Aseta salasanasi',
      tervetuloa_otsikko:     'Tervetuloa TalentMasteriin!',
      tervetuloa_teksti:      'Sinut on lisätty järjestelmään roolilla {rooli}.',
      tervetuloa_nappi:       'Aseta salasana →',
      tervetuloa_linkki_huom: 'Linkki on voimassa 1 tunnin.',
      pelaajaSivu_aihe:       '{pelaaja} — Tervetuloa TalentMasteriin! Aseta ensin salasanasi',
      pelaajaSivu_aseta_salasana: '① Aseta ensin salasanasi',
      pelaajaSivu_salasana_ohje:  'Klikkaa linkkiä ja luo oma salasana. Linkki vanhenee 1 tunnissa.',
      pelaajaSivu_salasana_nappi: 'Aseta salasana →',
      pelaajaSivu_sivut_teksti:   '② Kun salasana on asetettu, pääset sivuille:',
      pelaajaSivu_vanhempi_nappi: '👨‍👩‍👦 Vanhemman sivu →',
      pelaajaSivu_pelaaja_nappi:  '⚽ Pelaajan oma sivu →',
    },

    // Suostumuslomake
    suostumus: {
      otsikko:          'Rekisteröityminen ja suostumus',
      kuvaus:           'Täytä huoltajan tiedot ja anna suostumus pelaajan tietojen käsittelyyn.',
      huoltajan_nimi:   'Huoltajan nimi',
      huoltajan_email:  'Huoltajan sähköposti',
      anna_suostumus:   'Annan suostumukseni',
      laheta:           'Lähetä',
      kiitos:           'Kiitos! Suostumus vastaanotettu.',
      // V0.5 — suostumuslomakkeen kytkentäavaimet (docs/I18N_SUOSTUMUS_KAANNOKSET.md; fi = normalisoitu ä/ö)
      info_otsikko:       'Mitä tämä tarkoittaa käytännössä?',
      info_teksti:        'Seura seuraa lapsesi fyysistä kehitystä kauden aikana. Tulokset tallennetaan TalentMaster-järjestelmään, josta valmentaja ja sinä huoltajana voitte seurata kehitystä. Tiedot ovat luottamuksellisia.',
      ryhma_pakolliset:   'Pakolliset',
      ryhma_testaus:      'Testaaminen ja kehitysseuranta',
      ryhma_jakaminen:    'Tietojen jakaminen',
      badge_pakollinen:   'PAKOLLINEN',
      badge_vapaaehtoinen:'VAPAAEHTOINEN',
      c1_otsikko:         'Tietojen tallentaminen rekisteriin',
      c1_teksti:          'Lapseni nimi, syntymäaika, seura ja yhteystiedot tallennetaan TalentMaster-kehitysjärjestelmään seuran käyttöön.',
      c2_otsikko:         'Tietosuojaseloste luettu',
      c2_teksti_alku:     'Olen tutustunut',
      c2_linkki:          'TalentMaster-tietosuojaselosteeseen',
      c2_teksti_loppu:    '. Tiedän että minulla on oikeus nähdä, oikaista ja poistaa lapseni tiedot milloin tahansa.',
      c3_otsikko:         'Fyysinen testaaminen ja kehitysseuranta',
      c3_teksti:          'Annan luvan mitata lapseni fyysistä kehitystä ja tallentaa tulokset järjestelmään.',
      c4_otsikko:         'Biologisen iän arviointi',
      c4_teksti:          'Annan luvan arvioida lapseni kasvun vaihetta kehomittausten avulla (pituus, paino, istumapituus). Tätä käytetään harjoituskuorman mitoittamiseen turvallisesti.',
      c5_otsikko:         'Kehitystiedot seuran valmentajille',
      c5_teksti:          'Lapseni testitulokset jaetaan seuran muille valmentajille.',
      c6_otsikko:         'Anonymisoitu data palvelun kehittämiseen',
      c6_teksti:          'Lapseni tunnisteetonta dataa voidaan käyttää TalentMaster-palvelun kehittämiseen.',
      nappi_takaisin:     'Takaisin',
      nappi_vahvista:     'Vahvista ja lähetä',
      onnistui_otsikko:   'Rekisteröinti onnistui!',
      onnistui_teksti:    'Tiedot on tallennettu TalentMaster-rekisteriin.',
      qr_info_otsikko: 'Lupa pelaajan tunnuksiin',
      qr_info_teksti: 'Täytä lapsen tiedot ja oma sähköpostiosoitteesi. Käytä samaa sähköpostia, jonka annoit seuralle.',
      email_ristiriita: 'Sähköposti ei vastaa seuran tietoja. Käytä osoitetta, jonka annoit seuralle, tai ota yhteys joukkueenjohtajaan.',
      syn_paiva: 'Päivä',
      syn_kuukausi: 'Kuukausi',
      syn_vuosi: 'Vuosi',
      syn_tarkista: 'Tarkista syntymäaika',
      pyyda_uusi_kutsu: 'Pyydä seuralta uusi kutsu. Tästä linkistä puuttuu pelaajan tunniste, joten lomaketta ei voi lähettää.',
      uusinta_selite: 'Suostumus annettu {pvm} — tällä lomakkeella uusit sen.',
      // Sibbo-reititys 15.10.2026: lomakkeen dynaamiset viestit ja kuitti (aiemmin kovakoodattu; fi-teksti ennallaan)
      kutsu_alku: 'Kutsu',
      kutsu_seuralta: 'seuralta',
      esitaytetty_info: 'Seura on esitäyttänyt osan tiedoista puolestasi. Tarkista tiedot ja täydennä puuttuvat kentät.',
      virhe_huoltaja_kaikki: 'Täytä huoltajan etunimi, sukunimi ja sähköposti',
      pituus_varoitus: 'Tarkistathan vanhemman pituusmittauksen (epätavallinen arvo) — tallennetaan silti',
      virhe_huoltaja_nimi: 'Täytä huoltajan etunimi ja sukunimi',
      virhe_antaja_puuttuu: 'Suostumuksen antajan nimi puuttuu',
      virhe_nimi_pituus: 'Tarkista nimi: enintään 100 merkkiä, ei merkkejä < tai >',
      virhe_huoltaja_nimi_pituus: 'Tarkista huoltajan nimi: enintään 100 merkkiä, ei merkkejä < tai >',
      kuitti_tunnus: 'Rekisteröintitunnus',
      kuitti_nimi: 'Nimi',
      kuitti_seura: 'Seura',
      kuitti_joukkue: 'Joukkue',
      kuitti_ika: 'Ikä',
      kuitti_vuotta: 'vuotta',
      kuitti_raportit: 'Raportit lähetetään',
      kuitti_suostumukset: 'Suostumukset',
      kuitti_hyvaksytty: 'kpl hyväksytty',
      kuitti_aikaleima: 'Aikaleima',
      kuitti_tallennettu: 'Tallennettu',
      kuitti_rekisteriin: 'TalentMaster-rekisteriin',
      kuitti_tila: 'Tila',
      kuitti_odottaa: 'Odottaa synkronointia',
      tunnukset_lahetetty: 'Tunnukset lähetetty sähköpostiisi',
      lahetys_alku: 'Lähetimme salasanalinkin ja pelaajan PIN-koodin',
      osoitteeseen: 'osoitteeseen',
      sahkopostiisi: 'sähköpostiisi',
      lahetys_loppu: '. Avaa viesti ja aseta salasanasi.',
      linkki_7pv: 'Linkki on voimassa 7 päivää',
      linkki_7pv_loppu: '— voit avata sen vaikka vasta illalla.',
      linkki_1h: 'Linkki on voimassa 1 tunnin.',
      linkki_vanhene: 'Jos se ehtii vanheta, avaa',
      linkki_vanhemman_sivu: 'vanhemman sivu',
      linkki_unohdin: 'ja valitse ”Unohdin salasanan” — saat uuden linkin.',
      salasana_asetettu: 'Salasanan asetettuasi pääset vanhemman näkymään — kirjaudu samalla sähköpostiosoitteella ja uudella salasanalla.',
      sahkoposti_ei_lahtenyt: 'Sähköposti ei lähtenyt',
      tallennettu_lahetys_alku: 'Suostumus on tallennettu, mutta tunnusten lähetys',
      lahetys_virhe_loppu: 'epäonnistui.',
      pyyda_seuraa: 'Pyydä seuraa lähettämään tunnukset uudelleen',
      seuran_hallinta_ohje: '(seuran hallinta → pelaaja → lähetä pelaajasivulinkki).',
      kutsu_toinen_lapsi: 'Tämä kutsulinkki koskee toista pelaajaa. Jos rekisteröit eri lasta, pyydä seuralta hänelle oma kutsu.',
      kutsu_kaytetty: 'Tämä kutsulinkki on jo käytetty tai korvattu uudemmalla. Käytä seuran uusinta kutsua tai pyydä seuralta uusi.',
      suostumus_jo_annettu: 'Suostumus on jo annettu tälle pelaajalle. Jos haluat muuttaa suostumusta, pyydä seuralta uusi kutsu.',
      kutsu_ristiriita: 'Tämä kutsulinkki koskee toista pelaajaa. Pyydä seuralta oikea kutsu.',
      tallennus_virhe: 'Tallennus epäonnistui:',
      virhe_pakolliset: 'Täytä pakolliset kentät (merkitty *)',
      tallennetaan: 'Tallennetaan...',
      // Sibbo 1.11. vaihe 1: lomakkeen staattinen markup (aiemmin kovakoodattu; fi-teksti ennallaan)
      rek_sivun_otsikko: 'TalentMaster - Rekisteröinti',
      rek_alaotsikko: 'Rekisteröinti ja Tietosuojasuostumus',
      rek_vaihe_perustiedot: 'Perustiedot',
      rek_vaihe_suostumus: 'Suostumus',
      rek_vaihe_valmis: 'Valmis',
      rek_pelaajan_tiedot: 'Pelaajan tiedot',
      rek_etunimi: 'Etunimi',
      rek_esim_mikael: 'esim. Mikael',
      rek_sukunimi: 'Sukunimi',
      rek_esim_korhonen: 'esim. Korhonen',
      rek_syntymaaika: 'Syntymäaika',
      rek_sukupuoli: 'Sukupuoli',
      rek_valitse: '-- valitse --',
      rek_poika_mies: 'Poika / Mies',
      rek_tytto_nainen: 'Tyttö / Nainen',
      rek_muu_en_halua: 'Muu / En halua kertoa',
      rek_sahkoposti_yli18: 'Sähköposti (yli 18v)',
      rek_email_esim: 'oma.osoite@email.fi',
      rek_raportit_tahan: 'Raportit toimitetaan tähän -- alle 18v käytetään huoltajan osoitetta',
      rek_huoltajan_tiedot: 'Huoltajan tiedot',
      rek_alaikainen_otsikko: 'Alaikäinen pelaaja -- huoltajan tiedot vaaditaan',
      rek_alaikainen_teksti: 'GDPR edellyttää huoltajan suostumusta alle 18-vuotiaan tietojen käsittelyyn.',
      rek_huoltajan_etunimi: 'Huoltajan etunimi',
      rek_esim_pekka: 'esim. Pekka',
      rek_huoltajan_sukunimi: 'Huoltajan sukunimi',
      rek_huoltajan_sahkoposti: 'Huoltajan sähköposti',
      rek_huoltaja_email_esim: 'huoltaja@email.fi',
      rek_raportit_osoitteeseen: 'Raportit lähetetään tähän osoitteeseen',
      rek_huoltajan_puhelin: 'Huoltajan puhelin',
      rek_esim_u15: 'esim. U15',
      rek_esim_kpv: 'esim. KPV',
      rek_palloid_selite: '(Palloliiton pelaajatunnus)',
      rek_esim_palloid: 'esim. 34650191',
      rek_palloid_hint: 'PalloID löytyy Palloliiton pelaajasivulta. Jätä tyhjäksi jos ei tiedossa.',
      rek_bi_otsikko: 'Biologisen iän arviointi (vapaaehtoinen)',
      rek_bi_miksi: 'Miksi tätä kysytään?',
      rek_bi_info: 'Vanhempien pituustiedot mahdollistavat biologisen iän arvioinnin myöhemmin. Vapaaehtoinen. Tiedot ovat luottamuksellisia eikä niitä jaeta kolmansille osapuolille.',
      rek_isan_pituus: 'Isän pituus (cm)',
      rek_esim_179: 'esim. 179',
      rek_ei_tiedossa: 'Ei tiedossa',
      rek_aidin_pituus: 'Äidin pituus (cm)',
      rek_esim_166: 'esim. 166',
      rek_adoptoitu: 'Pelaaja on adoptoitu tai biologisten vanhempien tietoja ei ole saatavilla',
      rek_nappi_seuraava: 'Seuraava',
      rek_suostumukset_otsikko: 'Suostumukset',
      rek_seuraavat_askeleet: 'Seuraavat askeleet',
      rek_valmentaja_yhteys: 'Valmentaja ottaa yhteyttä ja sopii ensimmäisen testausajankohdan.',
      rek_ts_otsikko: 'TIETOSUOJASELOSTE',
      rek_ts_sulje: 'Sulje',
      rek_ts_rekisterinpitaja_otsikko: 'Rekisterinpitäjä:',
      rek_ts_tarkoitus_teksti: 'Jalkapalloilijoiden pelaajakehityspalvelujen tuottaminen.',
      rek_ts_tarkoitus_otsikko: 'Käsittelyn tarkoitus:',
      rek_ts_sailytysaika_teksti: 'Asiakassuhteen päättymiseen + 2 vuotta.',
      rek_ts_sailytysaika_otsikko: 'Säilytysaika:',
      rek_ts_sijainti_teksti: 'Tiedot tallennetaan EU:ssa (Google Cloud, europe-west1). Tekoälyavustaja toimii EU:ssa (AWS, Tukholma). Sähköposti-ilmoitukset lähetetään SendGrid-palvelun kautta, jolloin vastaanottajan sähköpostiosoite käsitellään Yhdysvalloissa EU:n vakiosopimuslausekkeiden ja EU–US Data Privacy Frameworkin perusteella.',
      rek_ts_sijainti_otsikko: 'Tietojen sijainti:',
      rek_ts_oikeutesi_teksti: 'Sinulla on oikeus nähdä kaikki lapsestasi tallennetut tiedot, pyytää niiden oikaisua tai poistoa milloin tahansa.',
      rek_ts_oikeutesi_otsikko: 'Oikeutesi:',
      rek_ts_yhteydenotot_otsikko: 'Yhteydenotot:',
      rek_ts_sailytysaika_90pv: 'Suostumuksen peruutuksen jälkeen tiedot poistetaan 90 päivän kuluessa.',
      rek_ts_koko_otsikko: 'Koko tietosuojaseloste:',
    },
    // V1-A — Pelaaja_v7 i18n (migroitu STR; DE pudotettu; xpHint EI migroitu §7.22 (ei renderöity, XP-kieli kielletty))
    // PR F (4.10.2026) — §22-testialustat (lib/tm_alusta.js -koodit). sv: odotuslistalla (Gemini)
    alusta: {
      mondo_yleisurheilualusta:  'Mondo / yleisurheilualusta',
      keinonurmi_3g:             'Keinonurmi (3G)',
      keinonurmi_4g5g:           'Keinonurmi (4G/5G)',
      keinonurmi_hiekka:         'Keinonurmi (hiekka / 2G)',
      luonnonnurmi_kuiva:        'Luonnonnurmi — kuiva',
      luonnonnurmi_marka:        'Luonnonnurmi — märkä',
      sisahalli_puu:             'Sisähalli — puulattia',
      sisahalli_kumi:            'Sisähalli — kumi/tartan',
      muu:                       'Muu',
      keinonurmi:                'Keinonurmi (tyyppi ei tiedossa)',
      luonnonnurmi:              'Luonnonnurmi',
      sisahalli:                 'Sisähalli',
      tuntematon:                'Alusta ei tiedossa',
    },
    pelaaja: {
      takautuva_linkki:       '+ Lisää mennyt päivä',
      takautuva_otsikko:      'Lisää mennyt päivä',
      takautuva_pvm:          'Päivämäärä',
      takautuva_mita:         'Mitä teit?',
      takautuva_jalkapallo:   'Jalkapallo',
      takautuva_muu:          'Muu urheilu',
      takautuva_lepo:         'Lepopäivä',
      takautuva_kesto:        'Kesto',
      takautuva_tallenna:     '✓ Lisää päivä',
      takautuva_val_pvm:      'Valitse päivä',
      takautuva_val_mita:     'Valitse mitä teit',
      takautuva_val_kesto:    'Valitse kesto',
      streak_0:               'Aloita tänään — ensimmäinen askel on tärkein.',
      streak_1_6:             '🔥 {n} päivän putki — jatka huomenna!',
      streak_7_13:            '🔥 {n} päivää — olet jo sitoutunut.',
      streak_14:              '🔥 {n} päivää — olet jo poikkeuksellinen.',
      sig_piilohelmi:         'Piilohelmi',
      sig_phv:                'PHV — kevennä kuormaa',
      sig_putki:              '{n} pv putki',
      fiilis_kysymys:         'Miltä sinusta tuntuu?',
      kieli:                  'Kieli',
      fiilis_vasynyt:         'Väsynyt',
      fiilis_vahan_vasynyt:   'Vähän väsynyt',
      fiilis_mahtavaa:        'Mahtavaa',
      nain_teet:              'Näin teet',
      pallo_joka_paiva:       'Pallo joka päivä',
      kirjaa_tehdyksi:        'Kirjaa tehdyksi',
      rae_q4_otsikko:         'Sinulle',
      rae_q4_teksti:          'Olet ikäluokkasi nuorimpia — pelaat usein vanhempia vastaan, ja se on etu pitkällä tähtäimellä. Moni huippu on ollut samassa tilanteessa. Kehosi kasvaa vielä. Keskity tekemiseen, älä vertailuun.',
      tervetuloa_takaisin:    'Tervetuloa takaisin',
      streak:                 '🔥 Aloita putki tänään.',
      aloita_5min:            'Aloita · 5 min',
      paivan_ohjelma:         'Päivän henkilökohtainen ohjelma',
      muuta_tanaan:           'Muuta tänään',
      unohtuiko_pin:          'Unohtuiko PIN?',
      syota_pin:              'Syötä PIN',
      syota_pin_koodisi:      'Syötä PIN-koodisi',
      ei_yhteytta_kirjaus:    'Ei yhteyttä – kirjausta ei tallennettu. Kirjaa uudelleen, kun verkko palaa.',
      kirjaudu_palloidlla:    'Kirjaudu PalloID:llä',
      talla_viikolla:         'Tällä viikolla',
      paivan_putki:           'päivän putki',
      jatka_nuoli:            'Jatka →',
      kirjaudu_sahkopostilla: 'Kirjaudu sähköpostilla',
      pin_vaara:              'Väärä PIN',
      // V1-A2 syvänäkymät — aloitusopas / oma treeni / haasteet / meistä (§7.22: ei tasolukuja/XP/vertailua)
      ohita:                  'Ohita',
      th_terve_leikkija:      'Moikka',
      th_terve_rakentaja:     'Hei',
      th_terve_showcase:      'Tervetuloa',
      th_k1_leikkija:         'Yksi kiva juttu jonka voit tehdä tänään. Kokeile — 10 min riittää!',
      th_k1_rakentaja:        'Yksi juttu jonka voit tehdä tänään. Kokeile — 10 min riittää!',
      th_k1_showcase:         'Yksi juttu jonka voit tehdä tänään. Kokeile — 10 min riittää.',
      th_k2_leikkija:         'Sinun oma korttisi ja juttusi. Se kasvaa kun treenaat ja pelaat.',
      th_k2_rakentaja:        'Sinun oma korttisi ja juttusi. Se kasvaa kun treenaat.',
      th_k2_showcase:         'Oma korttisi ja juttusi. Se kasvaa kun treenaat.',
      th_k3:                  'Paina kun haluat kertoa valmentajalle miltä tuntuu.',
      th_alota_leikkija:      'Aloitetaan! 🚀',
      th_alota_rakentaja:     'Aloitetaan!',
      th_alota_showcase:      'Aloitetaan',
      th_kortti_fiilis:       'Fiilis-nappi',
      va_oma_treeni:          'Oma treeni',
      va_mita_teit:           'Mitä teit tänään?',
      va_info:                'Pihapelit, kaverien kanssa pelailu ja oma treeni lasketaan. Valmentaja näkee mitä teit — ei tarvitse olla täydellistä.',
      va_q1:                  '1. Minkälaista treeniä?',
      va_q2:                  '2. Paljonko aikaa?',
      va_q3:                  '3. Miltä tuntui?',
      va_kaverit:             'Kaverit (ei pakollinen)',
      va_minuuttia:           'minuuttia',
      va_kirjaa_treeni:       'Kirjaa treeni',
      va_valmentaja_nakee:    'Valmentaja näkee kirjauksen koosteessa.',
      va_t_pihapeli:          'Pihapeli',
      va_t_pihapeli_s:        '2v2, 3v3, maalikisa',
      va_t_kaveri:            'Kaverin kanssa',
      va_t_kaveri_s:          'Syöttelyä, laukauksia',
      va_t_keho:              'Oma keho',
      va_t_keho_s:            'Juoksu, kuntopiiri',
      va_t_pallo:             'Pallo yksin',
      va_t_pallo_s:           'Pomputtelu, tekniikka',
      va_t_muu:               'Jotain muuta',
      va_t_muu_s:             'Uinti, tanssi, rullat',
      va_fiilis_kevyt:        'Kevyt',
      va_fiilis_ok:           'OK',
      va_fiilis_hyva:         'Hyvä',
      va_fiilis_tiukka:       'Tiukka',
      va_fiilis_taysilla:     'Täysillä',
      vad_kirjattu:           'Kirjattu',
      vad_hyvaa_tyota:        'Hyvää työtä.',
      vad_liekki_pysyy:       'Liekki pysyy.',
      ha_haasteet:            'Haasteet',
      ha_kuka_uskaltaa:       'Kuka uskaltaa?',
      ha_tab_teema:           'Viikon teema',
      ha_tab_kaverit:         'Kaverit',
      ha_tab_omat:            'Omat',
      me_sisalto_tulossa:     'Sisältö tulossa',
      me_kuvaus:              'Joukkue, valmentajat, viestit, kalenteri — Vaihe B3.',
      ulos:                   'Ulos',
      pin4_vihje:             'Vanha 4-numeroinen PIN? Paina OK',
      // KORTTI 1c — oma ennätys -juhlaviesti (§7.22: vain itsevertailu). sv: odotuslistalla (Gemini)
      ennatys_uusi:           '🏅 Uusi oma ennätys: {testi} {arvo}! Voitit itsesi.',
      ennatys_otsikko:        'Uusi oma ennätys',
      ennatys_kortissa:       'Löydät sen Ennätykset-kortilta.',
      ennatys_jes:            'Jes!',
      ilm_tanaan:             'Tänään',
      ilm_huomenna:           'Huomenna',
      tk_mitali:              'Tekniikkakilpailu {pvm} · {merkki}',
      tk_mitali_ilman_pvm:    'Tekniikkakilpailu · {merkki}',
      tk_merkki_kulta:        'kultamerkki',
      tk_merkki_hopea:        'hopeamerkki',
      tk_merkki_pronssi:      'pronssimerkki',
      laji_oma_paras:         'oma paras {arvo}',
      laji_viimeisin:         'viimeisin tulos {arvo}',
      kirjautuminen_epaonnistui: 'Kirjautuminen epäonnistui.',
      joukkuetreeni_tanaan: 'Joukkuetreeni tänään?',
      oma_kehityskorttisi: 'Oma kehityskorttisi',
      avaa_kortti: 'Avaa kortti →',
      tulossa: 'TULOSSA',
      joukkuetreenit: 'JOUKKUETREENIT',
      oma_paikka_joukkueessa: 'OMA PAIKKA JOUKKUEESSA',
      pelipaikka: 'Pelipaikka',
      omatoiminen_tama_viikko: 'OMATOIMINEN · TÄMÄ VIIKKO',
      jokainen_kotona_tehty_harjoite_tuk: 'Jokainen kotona tehty harjoite tukee joukkueen yhteistä kehitystä. Valmentaja näkee kirjauksesi.',
      taman_paivan_s_harjoite_kohdistuu: 'Tämän päivän S-harjoite kohdistuu sinne.',
      cmj_testi: 'CMJ-TESTI',
      mittaa_reaktiivivoiman_kehittymist: 'Mittaa reaktiivivoiman kehittymistä — tulokset näkyvät valmentajalle.',
      tulos_puuttuu_odottaa_testia: 'TULOS PUUTTUU · ODOTTAA TESTIÄ',
      ei_viela: 'Ei vielä',
      tarkea_vaihe_kerro_valmentajallesi: 'Tärkeä vaihe — kerro valmentajallesi',
      ennen_kasvupyrahdysta: 'Ennen kasvupyrähdystä',
      kasvupyrahdyksen_jalkeen: 'Kasvupyrähdyksen jälkeen',
      kehitysvaihe: 'Kehitysvaihe',
      arvio_kasvumittauksesta: 'Arvio kasvumittauksesta',
      poikkeuslupa_voi_olla_mahdollinen: '✅ Poikkeuslupa voi olla mahdollinen — juttele valmentajan ja perheen kanssa',
      biologinen_ika: 'Biologinen ikä',
      tulossa_myohemmin: 'Tulossa myöhemmin',
      syotto_h_h_testi: 'Syöttö (H-H-testi)',
      mita_isompi_luku_sita_pidempaan: 'Mitä isompi luku, sitä pidempään jaksat juosta kovaa pelissä.',
      harjoitteluvyohykkeesi_tanaan: 'Harjoitteluvyöhykkeesi tänään',
      harjoitteluvyohykkeet: 'Harjoitteluvyöhykkeet',
      kehitys_80_90: '🟡 Kehitys (80–90 %):',
      vahvuutesi: 'Vahvuutesi:',
      olet_tassa_karkitasoa_hieno_juttu: 'Olet tässä kärkitasoa — hieno juttu!',
      tama_on_vahvin_lajisi_pida: 'Tämä on vahvin lajisi — pidä siitä kiinni!',
      nyt: 'Nyt:',
      nyt_on_paras_ika_oppia: '🔥 Nyt on paras ikä oppia uusia temppuja pallon kanssa!',
      tama_vie_sinua_kohti_tavoitettasi: 'Tämä vie sinua kohti tavoitettasi:',
      tama_vie_kohti_tavoitettasi: 'Tämä vie kohti tavoitettasi:',
      tama_vie_sinua_kohti_tavoitettasi_2: 'Tämä vie sinua kohti tavoitettasi: vauhtia pallon kanssa',
      vauhti_pallo: 'Vauhti &amp; pallo',
      tavoite: '→ Tavoite:',
      pallo_mukaan_vauhtiin: 'Pallo mukaan vauhtiin',
      kehityit_viime_kerrasta_hienoa: '📈 Kehityit viime kerrasta — hienoa!',
      nopeustestit_tulossa_silloin_naet: '⚽ Nopeustestit tulossa — silloin näet tuloksesi!',
      sina_olet_harjoitellut_naita_pallo: '⚽ Sinä olet harjoitellut näitä pallotaitoja H-H-testissä!',
      tekniikkakisassa_naet_viela_enemma: '⚽ Tekniikkakisassa näet vielä enemmän!',
      mittaukset_tulossa_silloin_naet_tu: '⚽ Mittaukset tulossa — silloin näet tuloksesi täällä!',
      tulossa_2: 'Tulossa',
      tulossa_pian_ilmoitukset_jaa_linkk: 'Tulossa pian — ilmoitukset, jaa linkki vanhemmalle.',
      nayta_opas_uudelleen: '📘 Näytä opas uudelleen',
      kirjaudu_ulos: 'KIRJAUDU ULOS',
      ilmoitukset: '🔔 Ilmoitukset',
      valinta_ei_tallentunut_yrita_uudel: 'Valinta ei tallentunut — yritä uudelleen.',
      ladataan_aikataulua: 'Ladataan aikataulua…',
      seuran_aikataulu: '📅 Seuran aikataulu',
      sinun_tavoite: '🎯 Sinun tavoite',
      kausitavoite_tulossa: 'Kausitavoite tulossa',
      sina_ja_valmentajasi_asetatte_pian: 'Sinä ja valmentajasi asetatte pian yhteisen tavoitteen — sitten näet oman matkasi tästä.',
      sinun_matkasi: 'Sinun matkasi',
      mita_tama_on: 'Mitä tämä on',
      ei_tasolukuja_ei_arvosanoja_ei: 'Ei tasolukuja, ei arvosanoja, ei vertailua — vain sinun matkasi.',
      miten_sina_koet_itsesi: 'Miten sinä koet itsesi?',
      tama_ei_ole_testi_eika: '⭐ Tämä ei ole testi eikä arvosana — vain sinun oma fiiliksesi. Rehellinen vastaus auttaa eniten.',
      tama_arvio_on_edelliselta_jaksolta: 'Tämä arvio on edelliseltä jaksolta. Se näkyy yhä — käy katsomassa tuntuuko jokin kohta nyt erilaiselta ja päivitä halutessasi.',
      paivita_arvioni: 'Päivitä arvioni',
      valmis: 'Valmis! 🎉',
      kiitos_tallensin_sinun_ajatuksesi: 'Kiitos! 🎉 Tallensin sinun ajatuksesi. Tämä auttaa valmentajaa tukemaan sinua.',
      vaikeinta_juuri_nyt: 'Vaikeinta juuri nyt',
      viime_jaksolla_onnistui: 'Viime jaksolla onnistui',
      oma_tavoitteeni: 'Oma tavoitteeni',
      mika_tuntuu_nyt_vaikealta: 'Mikä tuntuu nyt vaikealta?',
      missa_onnistuit_viime_jaksolla: 'Missä onnistuit viime jaksolla?',
      mita_sina_haluat: 'Mitä sinä haluat?',
      sinun_aanesi_sitoumus: '🤝 Sinun äänesi & sitoumus',
      kun_sinulle_asetetaan_jaksofokus_v: 'Kun sinulle asetetaan jaksofokus, voit sitoutua siihen täällä ja kertoa oman näkemyksesi. 💚',
      uusi_jakso_alkoi_sitoudu_tahan: 'Uusi jakso alkoi — sitoudu tähän',
      kerro_rehellisesti_se_auttaa_enite: 'Kerro rehellisesti, se auttaa eniten.',
      sitouduit_jaksoon: 'Sitouduit jaksoon',
      sitoudun_tahan_jaksoon: 'Sitoudun tähän jaksoon 💚',
      sinun_sanasi_sinun_sitoumuksesi_va: 'Sinun sanasi, sinun sitoumuksesi — valmentaja näkee ja tukee.',
      kiitos_sitoumuksesi_on_tallennettu: 'Kiitos! 💚 Sitoumuksesi on tallennettu.',
      kiitos_sitouduit_jaksoon_valmentaj: 'Kiitos! 💚 Sitouduit jaksoon. Valmentaja näkee sanasi ja vahvistaa.',
      sitoumusta_ei_juuri_nyt_saatu: 'Sitoumusta ei juuri nyt saatu tallennettua — yritä hetken päästä uudelleen.',
      liekki_palaa: 'Liekki palaa',
      liekki_syttyy: 'Liekki syttyy',
      hienoa_etta_palasit: 'Hienoa että palasit!',
      aloita_putki_tanaan: 'Aloita putki tänään',
      ei_ennatyksia_viela_tee_testi: 'Ei ennätyksiä vielä — tee testi, niin voitat itsesi!',
      oma_paras: 'Oma paras',
      voita_oma_itsesi_jokainen_parannus: 'Voita oma itsesi — jokainen parannus on voitto.',
      miksi_tama_kortti: 'Miksi tämä kortti?',
      kortti_kehittyy_matkalla_napautus: 'Kortti kehittyy matkalla · napautus avaa flip-kortin',
      kehityskaari_2: '🗺 Kehityskaari',
      korttikokoelma: '🏆 Korttikokoelma',
      putki_kaynnissa_hienoa: 'Putki käynnissä — hienoa!',
      sinun_matka: 'Sinun matka',
      kausitavoite_jaksofokus: 'Kausitavoite &amp; jaksofokus',
      tavoite_jaksofokus: 'Tavoite &amp; jaksofokus',
      taman_jakson_kotiharjoitteet: 'Tämän jakson kotiharjoitteet',
      taidot_keho: 'Taidot &amp; keho',
      tekniikka_fyysinen_keho: 'Tekniikka · fyysinen · keho',
      tekniikka_vauhti_mas_kehitysvaihe: 'Tekniikka · vauhti · MAS · kehitysvaihe',
      fiilis_hyvinvointi: 'Fiilis &amp; hyvinvointi',
      itsearvio_tehty: 'Itsearvio tehty',
      itsearvio_tekematta: 'Itsearvio tekemättä',
      streak_testit_ennatykset: 'Streak · testit · ennätykset',
      liekki_testihistoria_ennatykset: 'Liekki · testihistoria · ennätykset',
      kieli_ilmoitukset_ulos: 'Kieli · ilmoitukset · ulos',
      profiili_opas_kirjaudu_ulos: 'Profiili · opas · kirjaudu ulos',
      tanaan_kotona: 'Tänään · kotona',
      tanaan_yksi_asia: 'Tänään yksi asia',
      paivan_kaksi_asiaa: 'Päivän kaksi asiaa',
      paivan_ohjelma_2: 'Päivän ohjelma',
      t_tekniikka_d_aktivointi: 'T = tekniikka · D = aktivointi',
      yksi_harjoite_tanaan_pida_putki: 'Yksi harjoite tänään — pidä putki elossa.',
      miksi_tanaan_tama: 'Miksi tänään tämä?',
      harjoitevideo_tulossa: 'Harjoitevideo tulossa',
      viikon_liekki_auennut: 'Viikon liekki auennut!',
      katso_kokoelma: 'Katso kokoelma →',
      valmentajalle: 'Valmentajalle',
      kirjaus_tallennettu_nakyy_valmenta: 'Kirjaus tallennettu — näkyy valmentajallesi',
      t_10003_luettu: '&#10003; Luettu',
      uusi: 'Uusi',
      ulos_2: 'ULOS',
      synttari_sprint: '🎂 Synttäri-sprint',
      t_10m_10_kertaa_nopein_kierros: '10m × 10 kertaa — nopein kierros voittaa!',
      taitohaaste: '🎁 Taitohaaste',
      pallonkasittely_3_min_kokeile_uutt: 'Pallonkäsittely 3 min — kokeile uutta temppu',
      lempiharjoitteesi_5_minuuttia_tays: 'Lempiharjoitteesi 5 minuuttia täysillä',
      kehittyva_pelaaja_ei_pida_taukoa: 'Kehittyvä pelaaja ei pidä taukoa — mutta saa itse valita miten.',
      bonustehtava_tanaan: '🎁 Bonustehtävä tänään',
      kirjaus_ei_tallentunut_kirjaudu_uu: 'Kirjaus ei tallentunut — kirjaudu uudelleen PIN-koodilla.',
      tama_harjoite_on_jo_kirjattu: 'Tämä harjoite on jo kirjattu tänään.',
      kirjausta_ei_voitu_tallentaa_kirja: 'Kirjausta ei voitu tallentaa — kirjaudu uudelleen PIN-koodilla.',
      tehty_jo: '✓ Tehty jo',
      kirjoita_ensin_palloid: 'Kirjoita ensin PalloID.',
      seura_avaa: 'Seura avaa',
      tekniikkamestari: '🥇 Tekniikkamestari',
      tekniikka_kehittyi: '↗ Tekniikka kehittyi',
      seura_avaa_myohemmin_ei_sinusta: '🤝 Seura avaa myöhemmin — ei sinusta kiinni',
      tulossa_valmentaja_mittaa: '⏳ Tulossa — valmentaja mittaa',
      kasvuvaiheessa_vahvistuu_kun_keho: '🌱 Kasvuvaiheessa — vahvistuu kun keho kehittyy',
      vahvuutesi_2: '⭐ Vahvuutesi:',
      seuraava_askel_2: '🎯 Seuraava askel:',
      tassa_nyt: 'Tässä nyt',
      seuraava: 'Seuraava',
      vahvuutesi_vievat_eteenpain_kortti: 'Vahvuutesi vievät eteenpäin — kortti kirkastuu kun kehityt.',
      minun_tavoitteeni: 'Minun tavoitteeni',
      kosketa_ja_kirjoita_oma_tavoittees: 'Kosketa ja kirjoita oma tavoitteesi',
      oma_matkasi_seuraava_askel: 'Oma matkasi &amp; seuraava askel',
      numero_kertoo_missa_olet_juuri: 'Numero kertoo missä olet juuri nyt. Vahvuutesi vievät eteenpäin — kortti kirkastuu kun kehityt.',
      tassa_osa_alueesi_ja_seuraava: 'Tässä osa-alueesi ja seuraava askel — sinun matkasi, ei vertailu muihin.',
      lukitut_osa_alueet_paa_joukkue: 'Lukitut osa-alueet (Pää · Joukkue) avautuvat kun seurasi ottaa työkalut käyttöön — ei sinusta kiinni.',
      oma_tavoitteesi_esim_opin_syottama: 'Oma tavoitteesi (esim. "Opin syöttämään molemmilla jaloilla"):',
      fiilis_tallennettu: 'Fiilis tallennettu.',
      fiiliksen_tallennus_ei_onnistunut: 'Fiiliksen tallennus ei onnistunut — kirjaudu uudelleen PIN-koodilla.',
      ok_ei_joukkuetreenia: 'OK — ei joukkuetreeniä.',
      kuormituksen_tallennus_ei_onnistun: 'Kuormituksen tallennus ei onnistunut.',
      t_5_min_vapaata_liiketta_pallolla: '5 min vapaata liikettä — pallolla tai ilman',
      lammittely_valmistelee_hermostoa_j: 'Lämmittely valmistelee hermostoa ja faskiat harjoitukseen.',
      kuinka_raskas_harjoitus_oli: 'Kuinka raskas harjoitus oli?',
      phv_kasvupyrahdys_kuorma_max_60: 'PHV-kasvupyrähdys — kuorma max 60%',
      ei_adar_arviota_viela_valmentaja: 'Ei ADAR-arviota vielä — valmentaja kirjaa havaintonsa harjoituksessa.',
      skannaat_kentan_ennen_kosketusta: 'Skannaat kentän ennen kosketusta',
      teet_oikean_ratkaisun_oikeaan_aika: 'Teet oikean ratkaisun oikeaan aikaan',
      palaat_peliin_nopeasti_virheen_jal: 'Palaat peliin nopeasti virheen jälkeen',
      uusi_taito: '🌱 Uusi taito:',
      olet_jo_alkanut_lukea_pelia: 'Olet jo alkanut lukea peliä — hieno merkki tulevaisuudelle!',
      uusi_2: 'UUSI',
      valmentajaltasi: 'Valmentajaltasi',
      tarkista_sahkoposti: 'Tarkista sähköposti.',
      todella_raskas: 'Todella raskas',
      kuinka_raskas_treeni_oli: 'Kuinka raskas treeni oli?',
      kesto_min: 'Kesto (min)',
      kehon_jousitusvoima_cmj: 'Kehon jousitusvoima (CMJ)',
      lahestyy_kasvupyrahdysta: 'Lähestyy kasvupyrähdystä 🔶',
      kasvupyrahdys_on_takana: 'Kasvupyrähdys on takana',
      kevyt_alle: '🟢 Kevyt: alle',
      huippu_95_105: '🔴 Huippu (95–105 %):',
      pida_vauhti_ylla: 'Pidä vauhti yllä.',
      paasetko_paikalle: 'Pääsetkö paikalle?',
      matkasi_latautuu: 'Matkasi latautuu…',
      miksi_se_auttaa: 'Miksi se auttaa:',
      mieti: 'Mieti:',
      alkoi: '📍 Alkoi',
      paivita_vastaukseni: 'Päivitä vastaukseni',
      rovio_palaa: 'Rovio palaa!',
      ennatykset: '🏅 Ennätykset',
      lepopaiva_kuuluu_kasvuun: 'Lepopäivä kuuluu kasvuun',
      tee_kotona: 'Tee kotona',
      milta_sinusta_tuntuu: 'Miltä sinusta tuntuu',
      kolme_lyhytta_tehtavaa: 'Kolme lyhyttä tehtävää.',
      syntymapaiva_t: '⭐ Syntymäpäivä-T',
      tehty_hyva_tyo: '✓ Tehty — hyvä työ!',
      miksi: 'Miksi?',
      kohti_sharp: 'Kohti Sharp',
      kohti_omaa_parastasi: 'Kohti omaa parastasi',
      mitattu: 'Mitattu ✓',
      hyvaa_syntymapaivaa_2: '🎂 Hyvää syntymäpäivää!',
      liikeleikki_lammittely: 'Liikeleikki-lämmittely',
      hermostollinen_aktivointi: 'Hermostollinen aktivointi',
      toteutat_ratkaisun_paineessa: 'Toteutat ratkaisun paineessa',
      kehittyva_pelinakemys: 'Kehittyvä pelinäkemys',
      vahvin: 'Vahvin:',
      mita_opit: 'Mitä opit:',
      merkitse_luetuksi_8594: 'Merkitse luetuksi &#8594;',
      sopiva: 'Sopiva',
      raskas: 'Raskas',
      helppo: 'Helppo',
      kylla: 'Kyllä',
      ei: 'Ei',
      kuormitus_rpe_1_10: 'Kuormitus (RPE 1–10)',
      esim_60: 'esim. 60',
      keskushyokkaaja: 'Keskushyökkääjä',
      hyokkaaja: 'Hyökkääjä',
      hyokkaava_keskik: 'Hyökkäävä keskik.',
      keskikentta: 'Keskikenttä',
      keskuspuolustaja: 'Keskuspuolustaja',
      laitapuolustaja: 'Laitapuolustaja',
      laitahyokkaaja: 'Laitahyökkääjä',
      maalivahti: 'Maalivahti',
      puolustaja: 'Puolustaja',
      kasvupyrahdyksessa: 'Kasvupyrähdyksessä ⚠️',
      kasvuvaihe: 'Kasvuvaihe',
      pujottelu_h_h_testi: 'Pujottelu (H-H-testi)',
      juoksumoottori: 'Juoksumoottori',
      aerobinen_kapasiteetti: 'Aerobinen kapasiteetti',
      kehittava: '🟡 Kehittävä:',
      kova_yli: '🔴 Kova: yli',
      hyva_kehityssuunta: 'hyvä kehityssuunta',
      perus_65_75: '🟢 Perus (65–75 %):',
      tavoite_2: 'Tavoite:',
      matka_tavoite_s_s_hyvalla: 'Matka {tavoite}: {s} s — hyvällä tiellä! 💪',
      paransit_kokonaisaikaasi_n_sekunti: '📈 Paransit kokonaisaikaasi {n} sekuntia viime kerrasta!',
      kokonaistuloksesi_on_parantunut_n: 'Kokonaistuloksesi on parantunut {n} s 🚀',
      pelaaja: 'Pelaaja',
      haluan_kehittya_myos_omalla_ajalla: 'Haluan kehittyä myös omalla ajalla',
      kuuntelen_ohjeita_ja_kokeilen_niit: 'Kuuntelen ohjeita ja kokeilen niitä',
      jatkan_vaikka_epaonnistun: 'Jatkan vaikka epäonnistun',
      pysyn_mukana_koko_treenin: 'Pysyn mukana koko treenin',
      pysyn_rauhallisena_kun_arsyttaa: 'Pysyn rauhallisena kun ärsyttää',
      harvoin: 'Harvoin',
      joskus: 'Joskus',
      aika_usein: 'Aika usein',
      usein: 'Usein',
      melkein_aina: 'Melkein aina',
      kotipaita: 'Kotipaita',
      vieraspaita: 'Vieraspaita',
      saavu: 'Saavu',
      kartta: 'Kartta',
      kimppakyyti: 'Kimppakyyti',
      klo: 'klo',
      tavoitteesi: 'Tavoitteesi',
      nimi_jaksolle: '{nimi} -jaksolle',
      edelliselle_jaksolle: 'edelliselle jaksolle',
      edellinen_sitoumuksesi_jakso_on_ar: 'Edellinen sitoumuksesi ({jakso}) on arkistoitu talteen. Tämä on uusi jakso — vastaa uudestaan omin sanoin.',
      omin_sanoin: 'Omin sanoin…',
      valmentaja_vahvisti_pvm: '· valmentaja vahvisti {pvm}',
      odottaa_valmentajan_vahvistusta: '· odottaa valmentajan vahvistusta',
      seura_avaa_2: 'seura avaa',
      tulossa_4: 'tulossa',
      ovr_n_osa_aluetta: 'OVR · {n} osa-aluetta',
      kehittyy: 'kehittyy',
      a_b_mitattu: '{a} / {b} mitattu',
      kortti_rakentuu: 'Kortti rakentuu',
      n_osa_aluetta_avattu_hieno: '{n} osa-aluetta avattu · hieno alku',
      monipuolinen: '🔥 Monipuolinen',
      n_v: '{n} v',
      n_osa_aluetta_nousi: '{n} osa-aluetta nousi',
      tana_jaksona_alueet_hienoa_tyota: 'tänä jaksona — {alueet}. Hienoa työtä!',
      idoli: 'idoli',
      miksi_n: 'Miksi {n}?',
      odottaa_seuraa: 'odottaa seuraa',
      aukeaa_kun_seurasi_ottaa_tyokalun: 'aukeaa kun seurasi ottaa työkalun käyttöön. Ei sinusta kiinni, eikä pienennä kehityskaartasi.',
      idoli_2: '★ Idoli',
      legenda: '★ Legenda',
      kuin_idoli: 'Kuin {idoli}',
      lukittu: 'Lukittu',
      harvinainen: '◆ Harvinainen',
      merkki: '● Merkki',
      n_pv: '{n} pv',
      paluu: 'paluu',
      yksi_treeni_riittaa_aloittamaan: 'Yksi treeni riittää aloittamaan.',
      lepo_ja_paluu_ovat_osa: 'lepo ja paluu ovat osa treeniä. Hyvä että pidät huolta itsestäsi.',
      sinulla_on_tehtavaa: 'Sinulla on tehtävää',
      fokus_nimi: 'Fokus: {nimi}',
      kotiharjoitteet: 'Kotiharjoitteet',
      edistyminen: 'Edistyminen',
      tehtava_n_m: 'Tehtävä {n} / {m}',
      jaljella: 'jäljellä',
      n_paivan_liekki: '{n} päivän liekki',
      n_pv_streak: '{n} pv streak',
      valmentaja: 'Valmentaja',
      uusi_3: 'uusi',
      viesti: 'viesti',
      pelihavainto: 'pelihavainto',
      aiemmat: 'Aiemmat',
      n_uutta: '{n} uutta',
      vanhempi: 'Vanhempi',
      vauhti_lineaariset_askeleet: 'Vauhti · lineaariset askeleet',
      aja_taydella_vauhdilla_10m_toista: 'Aja täydellä vauhdilla 10m — toista 6×',
      lahto_cmj_hypyt: 'Lähtö · CMJ-hypyt',
      syva_mutka_rajahtava_ylos_3: 'Syvä mutka — räjähtävä ylös · 3 sarjaa · 8 toistoa',
      hallinta_single_leg_squat: 'Hallinta · single leg squat',
      tasapaino_hitaasti_alas_ja_ylos: 'Tasapaino — hitaasti alas ja ylös · kumpikin jalka 10×',
      tehdaan_ensin_mittauksia: 'Tehdään ensin mittauksia.',
      mittaa_lisaa_ulottuvuuksia: 'Mittaa lisää ulottuvuuksia.',
      ensimmainen_treeni: 'Ensimmäinen treeni',
      kirjaa_ensimmainen_treenisi: 'Kirjaa ensimmäinen treenisi.',
      t_7_paivan_liekki: '7 päivän liekki',
      treenaa_7_paivaa_putkeen: 'Treenaa 7 päivää putkeen.',
      t_14_paivan_liekki: '14 päivän liekki',
      jatka_putkea_14_paivaan: 'Jatka putkea 14 päivään.',
      synttarisankari: 'Synttärisankari',
      avautuu_synttaripaivanasi: 'Avautuu synttäripäivänäsi.',
      ensimmainen_mittaus: 'Ensimmäinen mittaus',
      tulee_kun_ensimmainen_mittaus_tehd: 'Tulee kun ensimmäinen mittaus tehdään.',
      oma_ennatys: 'Oma ennätys',
      voita_oma_aiempi_tuloksesi: 'Voita oma aiempi tuloksesi.',
      kuljetus: 'Kuljetus',
      tee_kuljetustesti: 'Tee kuljetustesti.',
      tee_syottotesti: 'Tee syöttötesti.',
      tee_pujottelutesti: 'Tee pujottelutesti.',
      ponnautus: 'Ponnautus',
      tee_ponnautustesti: 'Tee ponnautustesti.',
      tekniikka_legenda: 'Tekniikka-legenda',
      tekniikan_kulta: 'Tekniikan kulta',
      tekn_kulta: 'tekn. kulta →',
      nopeus_legenda: 'Nopeus-legenda',
      huippunopeus: 'Huippunopeus',
      t_30_m_huipputaso: '30 m huipputaso →',
      idolikortti: 'Idolikortti',
      oma_idoli: 'Oma idoli',
      varhaiskehittaja: 'Varhaiskehittäjä',
      varhaiskehitys: 'Varhaiskehitys',
      tekniikkamitali_u8_12: 'tekniikkamitali U8–12 →',
      tehty_hyva_tyo_nimi: '✓ Tehty — hyvä työ, {nimi}!',
      liian_monta_yritysta_yrita_myohemm: 'Liian monta yritystä. Yritä myöhemmin.',
      valmentaja_reagoi_kirjaukseesi: 'Valmentaja reagoi kirjaukseesi',
      uusi_viesti_valmentajalta: 'Uusi viesti valmentajalta',
      uusi_haaste_nimi_lta: 'Uusi haaste {nimi}:lta',
      etupuoli: 'Etupuoli',
      kasvaa: 'Kasvaa',
      voima: 'Voima',
      tekniikka: 'Tekniikka',
      paa: 'Pää',
      pelialy: 'Peliäly',
      varhainen: 'varhainen',
      rohkea_joka_paikassa: 'rohkea joka paikassa',
      varhaiskehittaja_2: '⚡ Varhaiskehittäjä',
      n_pv_putki_2: '🔥 {n} pv putki',
      seuraava_askel_valmentajan_kanssa: 'seuraava askel valmentajan kanssa',
      vahva_alue_pida_ylla: 'vahva alue — pidä yllä!',
      kokeilee_kaikkia_paikkoja: 'kokeilee kaikkia paikkoja',
      onnea: 'Onnea!',
      pelaa_joka_paikassa: 'pelaa joka paikassa',
      unelma: 'Unelma',
      kuin_b_idoli_b_teema: 'Kuin <b>{idoli}</b> — {teema}',
      aloitit: 'Aloitit',
      n_os: '{n} os.',
      hieno_alku_nimi_joka_treeni: 'Hieno alku, {nimi}! Joka treeni avaa korttiasi lisää.',
      hieno_alku_joka_treeni_avaa: 'Hieno alku! Joka treeni avaa korttiasi lisää.',
      erikoismerkit: 'Erikoismerkit',
      kuormitus_n_kirjattu: 'Kuormitus {n} kirjattu.',
      dynaaminen_venyttely: 'Dynaaminen venyttely',
      jalan_heilautukset_lonkan_kierto_a: 'Jalan heilautukset + lonkan kierto + askelkyykky-kävely',
      a_skip_b_skip_seinakiihdytys: 'A-skip + B-skip + seinäkiihdytys — 3×15 m',
      haastava: 'Haastava',
      rpe_n_kirjattu: 'RPE {n} kirjattu ✓',
      rakentuu: 'Rakentuu',
      vahva_pelinakemys: 'Vahva pelinäkemys',
      pelinakemys_rakentuu: 'Pelinäkemys rakentuu',
      porras_n: 'Porras {n}',
      hieno_juttu_pida_siita_kiinni: 'hieno juttu, pidä siitä kiinni!',
      harjoittelussa: 'harjoittelussa',
      ikatasosi_yli: '🌟 Ikätasosi yli:',
      hyvaa_syntymapaivaa_n_v: 'Hyvää syntymäpäivää, {n}v!',
      hyvaa_syntymapaivaa_3: 'Hyvää syntymäpäivää!',
      tanaan_on_sinun_paivasi_nimi: 'Tänään on sinun päiväsi, {nimi}.',
      lisaa_sovellus_kotinaytolle: '📲 Lisää {sovellus} kotinäytölle',
      tunnus_tai_pin_on_vaarin: 'Tunnus tai PIN on väärin.',
      huoltajasi_ei_ole_viela_antanut: 'Huoltajasi ei ole vielä antanut lupaa. Pyydä vanhempaasi skannaamaan kortin QR-koodi.', ika_alle_10: 'Pelaajan sovellus on käytössä 10 vuoden iästä alkaen. Huoltajasi seuraa harjoitteluasi Vanhemman sivulla.', suostumus_peruttu: 'Huoltajasi on perunut luvan TalentMasterin käyttöön. Voit kysyä asiasta huoltajaltasi.',   // 8–9 v -esto (PM päätös 8)
      kirjautuminen_ei_juuri_nyt_onnistu: 'Kirjautuminen ei juuri nyt onnistu. Yritä hetken päästä uudelleen.',
      pv_paivan_putki_jatka_tanaan: '🔥 {pv} päivän putki — jatka tänään!',
      hienoa_teit_tanaan_hyvaa_tyota: 'Hienoa! Teit tänään hyvää työtä.',
      takaketju_sai_hyvan_arsykkeen_lopp: 'Takaketju sai hyvän ärsykkeen. Loppupeli kiittää.',
      posterior_chain_kuormitettu_palaut: 'Posterior chain kuormitettu. Palautuminen määrittää adaptaation.',
      nopeus: 'Nopeus',
      kiihdytys: 'Kiihdytys',
      ponnistusvoima: 'Ponnistusvoima',
      vauhti_pallon_kanssa: 'Vauhti pallon kanssa',
      b_nimi_b_on_vahvuutesi: '⭐ <b>{nimi}</b> on vahvuutesi!',
      huippuvauhtia: 'Huippuvauhtia!',
      vauhtisi_on_mitattu_hienoa_tyota: '⚽ Vauhtisi on mitattu — hienoa työtä!',
      aly: 'ÄLY',
      adar_nimi_pelaaja_a: 'Havainnointi',
      adar_nimi_pelaaja_d: 'Päätöksenteko',
      adar_nimi_pelaaja_ac: 'Toteutus',
      adar_nimi_pelaaja_r: 'Reagointi',
      haptic_valmistaudu: 'Valmistaudu · {n}',   // erä 92 (sv: PM, scripts/i18n_vie_sv_era92.cjs)
    },
    // V1-B — Vanhempi_v2 (perhe-pinta, §7.22: vahvuus ensin, ei vertailua/uhkaa/tasolukuja)
    huoltajakutsu: {
      avataan: 'Avataan linkkiä…',
      ohjataan: 'Ohjataan salasanan asettamiseen…',
      vanhentunut_otsikko: 'Linkki on vanhentunut',
      vanhentunut_ohje: 'Voit pyytää uuden linkin. Se lähetetään seuran rekisteriin tallennettuun huoltajan sähköpostiosoitteeseen.',
      laheta_uusi: 'Lähetä uusi linkki',
      lahetetty: 'Lähetimme uuden linkin osoitteeseen {osoite}. Linkki on voimassa 7 päivää.',
      odota: 'Uusi linkki lähetettiin juuri. Odota hetki, ennen kuin pyydät uuden.',
      raja: 'Uusia linkkejä on pyydetty tänään jo useita kertoja. Yritä huomenna tai ota yhteyttä seuraasi.',
      kaytetty_otsikko: 'Tunnus on jo käytössä',
      kaytetty_ohje: 'Olet jo ottanut tunnuksen käyttöön. Kirjaudu vanhemman sivulle. Jos unohdit salasanan, valitse kirjautumisessa "Unohdin salasanani".',
      kirjaudu: 'Siirry kirjautumaan',
      ei_loydy_otsikko: 'Linkki ei kelpaa',
      ei_loydy_ohje: 'Linkki on virheellinen. Avaa vanhemman sivu ja valitse "Unohdin salasanani", niin saat uuden linkin.',
      virhe: 'Jokin meni pieleen. Yritä hetken kuluttua uudelleen.', ei_kaytossa: 'Ei käytössä – sovi käyttöönotosta TalentMasterin kanssa',   // L1c (PM 3.11.)
    },
    vanhempi: {
      kortti_matka_otsikko: '{gen} matka',
      huoltaja_otsikko: '{gen} huoltaja',
      toast_treeni_kirjattu: 'Treeni kirjattu',
      toast_pallo_ok: ' · pallo ✓',
      toast_kehu_lahetetty: 'Kehu lähetetty!',
      toast_kopioi_pin: 'Kopioi PIN manuaalisesti',
      toast_kirjauduttu_ulos: 'Kirjauduttu ulos',
      toast_valmentaja_reagoi: 'Valmentaja {emoji} reagoi',
      toast_kirjasi_treenin: '{nimi} kirjasi treenin',
      mark_luetuiksi: 'Merkitse luetuiksi',
      ilm_tanaan: 'Tänään',
      ilm_huomenna: 'Huomenna',
      tulevat_tapahtumat: 'Tulevat tapahtumat',
      vinkki_otsikko_u12: 'Vinkki vanhemmille',
      vinkki_otsikko_u15: 'Muistathan',
      vinkki_otsikko_rooli: 'Roolisi',
      tek_miten_tukea: 'Miten tukea kotona',
      kortti_jaa_otsikko: 'Jaa kortti',
      kortti_jaa_nappi: 'JAA',
      aset_yksityisyys: 'Yksityisyys',
      aset_hallitsee_dataa: '{nimi} hallitsee dataa',
      aset_lue_gdpr: 'Lue GDPR-selvitys',
      aset_kirjaudu_ulos: 'Kirjaudu ulos',
      tyyppi_treeni: 'treeni',
      tapahtuma_nimeton: 'Tapahtuma',
      hero_tervetuloa_app:    '{nimi} — tervetuloa TalentMasteriin',
      koti_kehityskaari_otsikko: 'Kehityskaari',
      aika_h_sitten:          '{n} h sitten',
      aika_pv_sitten:         '{n} pv sitten',
      src_kirjasit: 'Kirjasit',
      src_joukkue: 'Joukkue',
      src_omatoimi: 'Omatoimi',
      hero_tervetuloa: 'Tervetuloa',
      vinkki_u12: 'Pikkuiselle on tänään hyvä päivä levätä. Katso lempeästi, että hän ei treenaa kolmatta päivää putkeen.',
      vinkki_u15: 'Nuori alkaa ottaa vastuuta itse. Ei tarvitse kysyä joka päivä — viesti kannattaa säästää viikon lopuksi.',
      vinkki_u19: 'Hän on lähes aikuinen pelaaja. Rooli muuttuu: olet läsnä, mutta et ohjaaja. Kuukausikooste riittää — älä häiritse arkea.',
      kirjaa_otsikko: 'Vanhempi kirjaa',
      kirjaa_kuinka_kauan: 'Kuinka kauan?',
      kirjaa_sanasi: 'Sanasi',
      kirjaa_valinnainen: '(valinnainen)',
      kirjaa_toast_virhe: 'Kirjausta ei voitu tallentaa — avaa linkki uudelleen seuran viestistä.',
      tek_profiili: 'Tekniikkaprofiili',
      tek_mitattu: 'Mitattu {pvm}',
      tek_seuraava_askel: 'Seuraava askel:',
      tek_nyt_tavoite: 'Nyt: {x} s → Tavoite: {y} s',
      tek_matka: 'Matka {mitali}: {gap} s 💪',
      mm_kulta: 'kultaan',
      mm_hopea: 'hopeaan',
      mm_pronssi: 'pronssiin',
      merkki_kohti_pronssi: 'Kohti pronssia',
      merkki_kohti_hopea: 'Kohti hopeaa',
      merkki_kohti_kulta: 'Kohti kultaa',
      merkki_parempi: 'Parempi kuin viime kerralla',
      kortti_kausipassi: 'Kausipassi',
      ilmoitukset: 'Ilmoitukset',
      ilm1_l: 'Valmentajan viesti',
      ilm1_s: 'Heti kun saapuu',
      ilm2_l: 'Päivittäinen kirjaus',
      ilm2_s: 'Muistutus illalla 20:30',
      ilm3_l: 'Viikkokooste',
      ilm3_s: 'Sunnuntaina klo 18',
      ilm4_l: 'Kuukausikooste sähköpostilla',
      ilm4_s: 'Ensimmäinen pv',
      ilm5_l: 'Loukkaantuminen',
      ilm5_s: 'Heti kun valmentaja kirjaa',
      toast_reset_linkki: 'Palautuslinkki lähetetty sähköpostiisi!',
      toast_ei_lasta: 'Tunnukseesi ei ole liitetty lasta. Ota yhteyttä seuraan.',
      lapsi_valitse: 'Valitse lapsi',
      toast_lapsi_haku_virhe: 'Lapsen haku epäonnistui — tarkista verkkoyhteys ja yritä uudelleen.',
      toast_kehu_virhe: 'Kehu ei lähtenyt — tarkista yhteys',
      toast_pin_kopioitu: 'PIN kopioitu leikepöydälle',
      toast_uusi_viesti: 'Valmentajalta uusi viesti',
      osat_pisin: '{n} minuuttia — pisin tänä viikkona',
      osat_minuuttia: '{n} minuuttia',
      osat_kirjaus_n: 'Tämä on jo {n}. kirjaus tällä viikolla.',
      osat_ensimmainen: 'Ensimmäinen kirjaus tänä viikkona.',
      osat_hyvaa_tyota: 'Hyvää työtä tänään.',
      mikro_ulkoilu: 'Oma-aloitteinen ulkoilu — ei pyyntiä.',
      mikro_sosiaalinen: 'Sosiaalinen treeni kavereiden kanssa. Tärkeintä tässä iässä.',
      mikro_bola: 'Bola Siempre: aamuharjoite ennen koulua. Maailman huippujen tapa.',
      mikro_valitunti: 'Välituntimikrosykli — yksi kosketushetki päivän keskellä.',
      aika_juuri_nyt: 'juuri nyt',
      aika_min_sitten: '{n} min sitten',
      aika_tunnin_sitten: 'tunnin sitten',
      aika_tanaan: 'tänään',
      hero_tyhja: 'Kun {gen} treenit alkavat näkyä, näet ne tässä.',
      synttari_tanaan: '🎂 Tänään on {gen} {n}. syntymäpäivä! Muistitko onnitella?',
      synttari_viikolla: '🎂 {gen} {n}. syntymäpäivä on tällä viikolla — muistathan onnitella!',
      rsvp_tulossa: '✓ Tulossa',
      rsvp_estynyt: '✕ Estynyt',
      pwa_ios: 'Napauta Jaa-kuvaketta ja valitse "Lisää Kotivalikkoon".',
      pwa_muu: 'Aina yhden napautuksen päässä.',
      pwa_lisaa: '📲 Lisää {appNimi} kotinäytölle',
      pwa_vanhempi_sivu: 'vanhemman sivu',
      login_otsikko: 'KIRJAUDU SISÄÄN',
      login_lataus: 'Kirjaudutaan...',
      login_ohje: 'Ensimmäisellä kerralla tarkista sähköpostisi kutsulinkkiä varten.',
      login_syota: 'Syötä sähköposti ja salasana.',
      login_vaara_salasana: 'Väärä salasana.',
      login_ei_sahkopostia: 'Sähköpostia ei löydy.',
      login_tarkista_sahkoposti: 'Tarkista sähköpostiosoite.',
      login_liikaa: 'Liian monta yritystä — odota hetki.',
      login_vaara_tunnus: 'Väärä sähköposti tai salasana.',
      login_epaonnistui: 'Kirjautuminen epäonnistui. Tarkista yhteys.',
      login_kirjoita_email: 'Kirjoita ensin sähköpostiosoite ylös.',
      login_ei_jarjestelmassa: 'Sähköpostia ei löydy järjestelmästä.',
      viim_tapahtumat: 'Viimeisimmät tapahtumat',
      valmentaja_reagoi: 'Valmentaja {emoji} reagoi kirjaukseen',
      paaseeko_paikalle: 'Pääseekö {nimi} paikalle?',
      ei_tapahtumia: 'Ei merkittyjä tapahtumia — valmentaja lisää ne kalenteriin.',
      vahvista_sahkoposti: 'Vahvista sähköpostisi, niin näet lapsen kalenterin',
      vahvista_sahkoposti_yleinen: 'Vahvista sähköpostisi, niin näet lapsesi tiedot',
      vahvista_sahkoposti_ohje: 'Lähetimme osoitteeseesi vahvistuslinkin. Avaa viesti ja paina linkkiä — jos se on vanhentunut, pyydä uusi alla.',
      laheta_vahvistus_uudelleen: 'Lähetä linkki uudelleen',
      olen_vahvistanut: 'Olen vahvistanut — päivitä',
      vahvistus_lahetetty: 'Linkki lähetetty sähköpostiisi.',
      vahvistus_odota: 'Linkki lähetettiin juuri — odota hetki ennen uutta pyyntöä.',
      vahvistus_ei_viela: 'Osoitetta ei ole vielä vahvistettu.',
      vahvistus_ei_onnistunut: 'Linkin lähetys ei onnistunut. Yritä hetken kuluttua uudelleen.',
      kalenteri_ei_latautunut: 'Kalenteria ei saatu ladattua.',
      yrita_uudelleen: 'Yritä uudelleen',
      koti_kehitys: 'Kehitys',
      koti_viikossa: 'Mitä viikossa tapahtui',
      koti_kehityskaari_tyhja: 'Kehityskaari ja kuukausikooste näkyvät kun seuran data on kirjattu.',
      koti_treenitiedot_tyhja: 'Treenitiedot näkyvät kun valmentaja kirjaa harjoituksia.',
      koti_valmentaja_tyhja: 'Valmentajan viesti näkyy tässä kun valmentaja on kirjannut.',
      viikko_tama: 'Tämä viikko',
      viikko_mita_teki: 'Mitä {nimi} teki',
      tyyppi_T: 'Pallotreeni',
      tyyppi_D: 'Kehonhuolto',
      tyyppi_S: 'Lihaskunto',
      tyyppi_P: 'Peli',
      tyyppi_vapaa: 'Omaehtoinen',
      tyyppi_pihapeli: 'Pihapeli',
      tyyppi_pallo: 'Leikkiä pallolla',
      tyyppi_jalkapallo: 'Jalkapallotreeni',
      tyyppi_muu_urheilu: 'Muu urheilu',
      tyyppi_lepo: 'Lepopäivä',
      tyyppi_harjoitus: 'Harjoitus',
      akt_pihapeli_l: 'Pihapeli',
      akt_pihapeli_s: 'Naapureiden kanssa',
      akt_pallo_l: 'Leikkiä pallolla',
      akt_pallo_s: 'Jalalla, kädellä, seinää vasten',
      akt_pyora_l: 'Pyöräili',
      akt_pyora_s: 'Koulumatka tai pidempi',
      akt_uinti_l: 'Uintia',
      akt_uinti_s: 'Uimahallissa tai rannalla',
      akt_metsa_l: 'Metsässä tai mäessä',
      akt_metsa_s: 'Luova liike, kiipeily',
      akt_tanssi_l: 'Tanssia tai jumppaa',
      akt_tanssi_s: 'Musiikki, rytmi, liike',
      akt_muu_l:              'Jokin muu',
      akt_muu_s:              'Hiihto, luistelu...',
      kirjaa_fii_iloinen: 'Iloinen',
      kirjaa_fii_innoissaan: 'Innoissaan',
      kirjaa_fii_vasynyt: 'Väsynyt',
      kirjaa_fii_loukkasi: 'Loukkasi',
      kirjaa_mita_teki_nimi: 'Mitä {nimi} teki?',
      kirjaa_ohje_u12: 'Voit valita useamman. Valmentaja näkee että sinä kirjasit — alle 13-vuotiaan puolesta kirjaaminen on ok.',
      kirjaa_mita_teki: 'Mitä teki?',
      kirjaa_valitse_kaikki: '(valitse kaikki sopivat)',
      kirjaa_milta_vaikutti: 'Miltä vaikutti?',
      kirjaa_placeholder: 'Esim. \'Lähti ulos itsestään, tuli kotiin hikisenä ja tyytyväisenä.\'',
      kirjaa_pallohuom: 'Huom: Pallokosketus puuttuu tänään. Bola Sempre — pallo joka päivä, edes 5 min!',
      kirjaa_laheta_otsikko: 'KIRJAA JA LÄHETÄ',
      kirjaa_laheta_alaselite: 'Valitse tyyppi · aika · fiilis',
      kirjaa_naytto_info: 'Kirjaus näkyy valmentajan viikkokoosteessa. Streakit lasketaan myös vanhemman kirjauksista.',
      kirjaa_virhe_oikeus: 'Kirjaus ei tallentunut — vanhemman kirjausoikeus puuttuu. Ota yhteyttä seuraan.',
      kirjaa_virhe_verkko: 'Kirjaus ei tallentunut — tarkista verkkoyhteys ja yritä uudelleen.',
      valm_viestit: 'Viestit',
      valm_info_u19: 'Kuukausikooste lähetetään lisäksi sähköpostilla. Pelaaja-valmentaja-kommunikaatio kulkee suoraan ilman välikäsiä.',
      valm_info_muu: 'Jos haluat keskustella jostain konkreettisesta, ota yhteyttä suoraan — älä kommentoi lapselle.',
      laji_ponnauttelu: 'Ponnauttelu',
      laji_syotto: 'Syöttö',
      laji_pujottelu: 'Pujottelu',
      laji_kuljetus_laukaus: 'Kuljetus-laukaus',
      laji_pituuspotku: 'Pituuspotku',
      tuki_syotto: 'Syöttötarkkuus kehittyy leikinomaisella toistolla — 10 min pihapeliä seinää tai sinua vasten riittää. Kehu yrittämistä, älä aikaa.',
      tuki_pujottelu: 'Pujottelu vaatii pallotuntumaa — kartioiksi käyvät kengät tai pullot. Tee siitä leikki, älä suoritus.',
      tuki_ponnauttelu: 'Ponnauttelu on kärsivällisyyslaji — ennätykset tulevat aaltoina. Juhlikaa pieniä onnistumisia yhdessä.',
      tuki_kuljetus: 'Kuljetus ja laukaus kehittyvät vapaassa pelissä parhaiten — pihapelit ja vapaa pallottelu ovat arvokkainta harjoitusta.',
      tuki_potku: 'Potkuvoima kasvaa kehon mukana — tekniikka ratkaisee. Pitkät syötöt pihalla ovat hyvä yhteisharjoitus.',
      tek_mittaukset_tulossa: '⚽ Mittaukset tulossa — täältä näet sitten {gen} vahvuudet ja miten voit tukea harjoittelua.',
      tek_vahvuus: 'Vahvuus:',
      tek_vahvin_laji: 'Tämä on {gen} vahvin laji!',
      tek_pieni_parannus: 'Pieni parannus joka treenissä riittää.',
      tek_tarkeinta: 'Tärkeintä: kehu yrittämistä ja harjoittelua, ei tulosta. Kiinnostus kantaa pidemmälle kuin paine.',
      kortti_kausi: 'Kausi',
      kortti_kortti: 'Kortti',
      kortti_treeneja: 'Treenejä',
      kortti_kausi_yks: 'kausi',
      kortti_mita_tarkoittaa: 'Mitä tarkoittaa?',
      kortti_selite_stage: 'Stage on pelaajan kasvuvaihe: leikkijä (U8–U12) → rakentaja (U13–U15) → showcase (U16–U17) → ammattilainen (U18+).',
      kortti_isovanhemmille: 'Isovanhemmille, kummitädille...',
      aset_pin_ohje: 'Pelaajan PIN-koodi — {nimi} kirjautuu tällä omaan näkymäänsä',
      aset_pin_puuttuu: 'PIN-koodia ei ole vielä asetettu. Ota yhteyttä seuraan saadaksesi pelaajan PIN-koodin.',
      aset_rooli_u12: 'Agentti — voit kirjata puolesta',
      aset_rooli_u15: 'Tuki — näet kaiken, et kirjaa',
      aset_rooli_u19: 'Vieras — kuukausikooste',
      aset_rooli_selite_u12: 'Alle 13-vuotiaalla GDPR edellyttää huoltajan roolia. Saat näkyvyyden kaikkeen ja voit kirjata puolesta.',
      aset_rooli_selite_u15: 'Nuori ottaa vastuuta. Sinä tuet — et hallitse. {nimi} voi halutessaan piilottaa yksityiskohtia.',
      aset_rooli_selite_u19: '{nimi} hallitsee omaa dataansa. Sinulle lähtee viikoittainen/kuukausittainen kooste — ei reaaliaikaa.',
      aset_muistutus: 'Päivittäinen kirjaus · Muistutus illalla 20:30',
      aset_kooste: 'Kuukausikooste sähköpostilla · Ensimmäinen pv',
      aset_gdpr_u12: 'Alaikäisen tietoja käsittelet sinä. Oikeus korjata tai poistaa kuuluu teille molemmille.',
      aset_gdpr_u15: 'Yli 13-vuotiaalla on lain mukaan oma tietosuojaoikeus. {nimi} voi piilottaa sinulta asioita, jotka ovat hänestä henkilökohtaisia.',
      aset_gdpr_u19: '{nimi} päättää mitä jaetaan vanhemmille, seuralle ja ulkopuolisille. Tietoja ei jaeta ilman hänen lupaansa.',
      perhe_kirjautuminen:    'Perhe · Huoltajan sisäänkirjautuminen',
      kieli:                  'Kieli',
      tervetulo_hei:          'Hei! 👋',
      tervetulo_johdanto:     'Olet osa lapsesi kehitystiimiä. Roolisi on tukea ja kannustaa — sovellus hoitaa mittaamisen.',
      tervetulo_kehu:         'Lähetä ensimmäinen kehu',
      tervetulo_kortti:       'Katso kortti + "miten tukea kotona"',
      tervetulo_viestit:      'Lue valmentajan viestit',
      tervetulo_kirjaa:       'Kirjaa treeni',
      kultainen_otsikko:      'Kultainen sääntö:',
      kultainen_teksti:       'Kehu yrittämistä, älä tulosta. Vertaa lasta vain häneen itseensä — ei kavereihin.',
      nain_mukana:            'Näin olet mukana',
      selva:                  'Selvä!',
      ohita:                  'Ohita',
      asetukset_alaotsikko:   'Mitä näen ja miten',
      pelaajan_kirjautuminen: 'Pelaajan kirjautuminen', suostumus_otsikko: 'Suostumus', suostumus_annettu_pvm: 'Suostumus annettu {pvm}', suostumus_ei_annettu: 'Suostumusta ei ole vielä annettu.', suostumus_peru: 'Peru suostumus', suostumus_peru_selite: 'Kun perut suostumuksen, {nimi} ei voi enää kirjautua TalentMasteriin eikä uutta tietoa kerry. Seuran jo tallentamat tiedot säilyvät; voit pyytää niiden poistoa seuralta. Saat kuittauksen sähköpostiisi.', suostumus_peru_vahvista: 'Vahvista peruminen', suostumus_peruuta: 'Takaisin', suostumus_peruttu_pvm: 'Suostumus peruttu {pvm}', suostumus_peruttu_ohje: 'Jos haluat antaa suostumuksen uudelleen, pyydä seuralta uusi kutsu. Tietojen poistoa voit pyytää seuralta.', suostumus_peruttu_koti: 'Suostumus on peruttu', suostumus_peruttu_toast: 'Suostumus peruttu.', suostumus_peru_virhe: 'Peruminen ei onnistunut. Yritä uudelleen tai ota yhteyttä seuraan.',   // B9 (erä 94)
      kirj_ohje:              '{nimi} kirjautuu omaan näkymäänsä PalloID:llä ja PIN-koodilla.',
      kirj_palloid_puuttuu:   'PalloID puuttuu, pyydä seuraa lisäämään se.',
      kirj_jaa_linkki:        'Jaa linkki pelaajalle',
      kirj_avaa_sivu:         'Avaa pelaajan sivu',
      kirj_jakoteksti:        '{gen} TalentMaster: avaa linkki ja syötä PIN-koodisi.',
      toast_linkki_kopioitu:  'Linkki kopioitu — lähetä se lapselle',
      toast_kopioitu:         'Kopioitu leikepöydälle',
      toast_kopioi_kasin:     'Kopioi käsin',
      ikavaihe_v:             '{a}–{b} v',
      kopioi:                 'Kopioi',
      lapsen_ikaryhma:        'Lapsen ikäryhmä · vaikuttaa näkymään',
      // V1-B2 syväsisältö — nimi NOMINATIIVISSA (ei suomen taivutusta → robusti i18n, kestää mielivaltaiset nimet)
      koti_otsikko:           '{nimi} · viikko',
      koti_otsikko_u19:       '{nimi} · kooste',
      kirjaa_puolesta:        'Kirjaa lapsen puolesta',
      kirjaa_puolesta_selite: 'Pihapeli, sovellus ei auki, syntymäpäivä...',
      tama_viikko:            'Tämä viikko',
      treenitiedot_tyhja:     'Treenitiedot näkyvät kun valmentaja kirjaa harjoituksia.',
      kehu_hienoa:            'Hienoa!',
      kehu_upea:              'Upea treeni!',
      kehu_lahetetty:         'Kehu lähetetty',
      nayta_opas:             'Näytä opas uudelleen',
      mita_teki:              'Mitä {nimi} teki',
      valmentajalta:          'Valmentajalta',
      tekniikkaprofiili:      'Tekniikkaprofiili',
      tp_vahvuus:             'Vahvuus:',
      tp_seuraava_askel:      'Seuraava askel:',
      tp_mitattu:             'Mitattu',
      tp_tyhja:               '⚽ Mittaukset tulossa — täältä näet vahvuudet ja miten voit tukea harjoittelua.',
      tp_vahvin:              'Tämä on vahvin laji!',
      matka_otsikko:          '{nimi} · matka',
      jaa_kortti:             'Jaa kortti',
      fiilis_iloinen:         'Iloinen',
      fiilis_innoissaan:      'Innoissaan',
      fiilis_vasynyt:         'Väsynyt',
      fiilis_loukkasi:        'Loukkasi',
      tt_kehu_ensimmainen:    'Lähetä ensimmäinen kehu',
      tt_katso_kortti:        'Katso kortti + "miten tukea kotona"',
      tt_lue_viestit:         'Lue valmentajan viestit',
      tt_kirjaa_treeni:       'Kirjaa treeni',
      // KORTTI 1c — omat ennätykset vanhemmalle (neutraali, ei tasolukuja). sv: odotuslistalla (Gemini)
      enn_otsikko:            'Omat ennätykset',
      enn_selite:             'Oma paras — vertailu vain omiin aiempiin tuloksiin.',
      enn_uusi:               'Uusi oma ennätys',
      enn_t_lin5m:            '5 m kiri',
      enn_t_lin10m:           '10 m kiri',
      enn_t_lin30m:           '30 m kiri',
      enn_t_cmj:              'Kevennyshyppy',
      enn_t_mas:              'Kestävyys',
      enn_t_kasirata:         'Ketteryys',
      enn_t_sm_juoksu:        'SM-juoksu',
      enn_t_sm_pallo:         'SM-pallo',
      enn_t_flei:             'Kehon valmius',
      tunnukset_saat_seuran_toimistosta: 'Tunnukset saat seuran toimistosta.',
      unohtuiko_salasana: 'Unohtuiko salasana?',
      fiilis_n_5: 'fiilis {n}/5',
      vanhempi: 'vanhempi',
      valmentaja: 'valmentaja',
      nimi_pelasi_pihalla_aika: '{nimi} pelasi pihalla {aika}',
      nimi_harjoitteli_kaverin_kanssa_ai: '{nimi} harjoitteli kaverin kanssa {aika}',
      nimi_teki_aamuharjoitteen_aika: '{nimi} teki aamuharjoitteen {aika}',
      nimi_treenasi_valitunnilla_aika: '{nimi} treenasi välitunnilla {aika}',
      nimi_teki_iltatreenin_aika: '{nimi} teki iltatreenin {aika}',
      nimi_harjoitteli_itsekseen_aika: '{nimi} harjoitteli itsekseen {aika}',
      nimi_treenasi_aika: '{nimi} treenasi {aika}',
      nimi_teki_kehonhuollon_aika: '{nimi} teki kehonhuollon {aika}',
      nimi_teki_lihaskuntoharjoitteen_ai: '{nimi} teki lihaskuntoharjoitteen {aika}',
      nimi_pelasi_aika: '{nimi} pelasi {aika}',
      nimi_treenasi_jalkapalloa_aika: '{nimi} treenasi jalkapalloa {aika}',
      nimi_urheili_aika: '{nimi} urheili {aika}',
      nimi_piti_lepopaivan_aika: '{nimi} piti lepopäivän {aika}',
    },
  },

  // @@KIELIPAKETIT@@ sv → lib/tm_lang_sv.js · en → lib/tm_lang_en.js (scripts/lang_lahde.cjs yhdistää/jakaa vanhaa yksitiedostoista tekstiä käyttäville työkaluille)
};

// ─────────────────────────────────────────────────────────────────
// KÄÄNNÖSFUNKTIOT
// ─────────────────────────────────────────────────────────────────

/**
 * Aktiivinen kieli — asetetaan kirjautumisen yhteydessä.
 * Prioriteetti: 1) seura-dokumentin kieli, 2) localStorage, 3) 'fi'
 */
// Node-turva: localStorage puuttuu Vitestissä/SSR:ssä → no-op-varjo (i18n ei kaadu; selain käyttää oikeaa).
var _tmLS = (typeof localStorage !== 'undefined') ? localStorage : { getItem: function () { return null; }, setItem: function () {} };
let _tm_kieli = _tmLS.getItem('tm_kieli') || 'fi';

/**
 * Aseta aktiivinen kieli. Kutsutaan kirjautumisen yhteydessä
 * kun seura-dokumentista on luettu kieli-kenttä.
 *
 * @param {string} kieli - 'fi' | 'sv' | 'en'
 * @param {boolean} tallenna - tallenna localStorage:een (oletus true)
 */
function tmAsetaKieli(kieli, tallenna = true) {
  const tuetut = ['fi', 'sv', 'en'];
  _tm_kieli = tuetut.includes(kieli) ? kieli : 'fi';
  if (tallenna) _tmLS.setItem('tm_kieli', _tm_kieli);
  console.log(`[TM Lang] Kieli asetettu: ${_tm_kieli}`);
  try { if (typeof document !== 'undefined' && !tmLangValmis()) tmLangLataa(); } catch (e) { /* moottori vielä evaluoitumassa → sivu kutsuu draw()-portin kautta */ }   // paketin lataus alkaa heti (ei vasta draw():ssa) → toastit ym. ehtivät sv:ksi
}

/**
 * V0 — keskitetty kieli-init. Prioriteetti: käyttäjän EKSPLISIITTINEN valinta (localStorage['tm_kieli'],
 * kielivaihtokytkin) → seuran kieli (seurat/{id}.kieli) → 'fi'. Seuran kieltä EI persistoida (session-kohtainen)
 * → käyttäjän manuaalinen override säilyy laitteella. Palauttaa aktiivisen kielen. Kutsutaan kun seura-doc luettu.
 * HUOM (suunnitelman sisäinen ristiriita r15 seura-ensin vs r34 kytkin-override): tulkinta = eksplisiittinen
 * käyttäjävalinta voittaa seuran oletuksen (ruotsiseuran suomenkielinen voi vaihtaa fi:hin). Dokumentoitu PR:ssä.
 */
function tmKieliInitSeura(seuraKieli) {
  var manual = _tmLS.getItem('tm_kieli');
  if (manual) { tmAsetaKieli(manual, false); return _tm_kieli; }
  if (seuraKieli) { tmAsetaKieli(seuraKieli, false); return _tm_kieli; }
  tmAsetaKieli('fi', false); return _tm_kieli;
}

/**
 * Hae käännetty teksti avaimella.
 * Fallback-järjestys: valittu kieli → en → fi
 *
 * Avain voi olla:
 *   - 'kategoria.avain'          esim. 'nav.yhteenveto'
 *   - 'kategoria.alakategoria.avain'  esim. 'henkilosto.roolit.vp'
 *
 * Muuttujien korvaus: käytä {muuttuja} syntaksia
 *   t('email.rekisteriKutsu_teksti', { seura: 'VIFK', pelaaja: 'Mikael' })
 *
 * @param {string} avain
 * @param {Object} muuttujat - valinnainen {avain: arvo} -kartta
 * @returns {string}
 */
function t(avain, muuttujat = {}) {
  // Hae teksti aktiivisella kielellä, fallback en → fi
  let teksti = _haeTeksti(avain, _tm_kieli)
    ?? _haeTeksti(avain, 'en')
    ?? _haeTeksti(avain, 'fi')
    ?? avain; // viimeinen fallback: palauta avain itse (näkyvä puuttuva käännös)

  // Korvaa muuttujat {muuttuja} → arvo
  if (muuttujat && typeof muuttujat === 'object') {
    Object.entries(muuttujat).forEach(([k, v]) => {
      teksti = teksti.replace(new RegExp(`\\{${k}\\}`, 'g'), v ?? '');
    });
  }

  return teksti;
}

/**
 * Sisäinen apufunktio — hakee arvon syvästä objektista pistenotaatiolla.
 * Esim. 'henkilosto.roolit.vp' → TM_LANG.fi.henkilosto.roolit.vp
 */
function _haeTeksti(avain, kieli) {
  const kielihaarukka = TM_LANG[kieli];
  if (!kielihaarukka) return null;
  const osat = avain.split('.');
  let kohde = kielihaarukka;
  for (const osa of osat) {
    if (kohde == null || typeof kohde !== 'object') return null;
    kohde = kohde[osa];
  }
  return typeof kohde === 'string' ? kohde : null;
}

/**
 * Palauta nykyinen kieli.
 * @returns {'fi'|'sv'|'en'}
 */
function tmNykyinenKieli() {
  return _tm_kieli;
}

/**
 * Päivämäärä-locale kielen mukaan — toLocaleDateString/Intl-kutsuille (ei kovakoodattua 'fi-FI'). fi → 'fi-FI' (ennallaan), sv → 'sv-FI' (suomenruotsalainen
 * numeromuoto 5.10.), en → 'en-GB'. Tuntematon/puuttuva kieli → nykyinen kieli.
 * @param {string} [kieli]
 * @returns {string}
 */
function tmPvmLocale(kieli) {
  var k = kieli || tmNykyinenKieli();
  return k === 'sv' ? 'sv-FI' : k === 'en' ? 'en-GB' : 'fi-FI';
}

/**
 * Muotoile päivämäärä nykyisellä (tai annetulla) kielellä: d.toLocaleDateString(tmPvmLocale(kieli), muoto).
 * @param {Date} d
 * @param {Object} [muoto] Intl-optiot (esim. {weekday:'short', day:'numeric', month:'numeric'})
 * @param {string} [kieli]
 * @returns {string}
 */
function tmPvmFmt(d, muoto, kieli) {
  return d.toLocaleDateString(tmPvmLocale(kieli), muoto);
}

/**
 * Palauta kaikki tuetut kielet.
 * @returns {string[]}
 */
function tmTuetutKielet() {
  return ['fi', 'sv', 'en'];   // kiinteä: sv/en-haarukat ovat erillisiä paketteja (tm_lang_sv.js/_en.js) → Object.keys(TM_LANG) olisi pelkkä ['fi'] ennen pakettia (kielivalitsin näyttää aina fi/sv/en)
}

/**
 * Roolimerkkijono käännetyllä kielellä.
 * @param {string} rooli - esim. 'vp', 'valmentaja'
 * @returns {string}
 */
function tmRooli(rooli) {
  return t(`henkilosto.roolit.${rooli}`) || rooli;
}

// ─────────────────────────────────────────────────────────────────
// SÄHKÖPOSTIPOHJAT (functions/index.js integrointia varten)
// ─────────────────────────────────────────────────────────────────
// Nämä funktiot palauttavat HTML-merkkijonot sähköpostipohjille.
// Kutsutaan functions/index.js:stä kun kieli on tiedossa seurasta.

/**
 * Luo rekisteröintikutsun HTML sähköpostiin.
 * @param {Object} params
 * @param {string} params.kieli - 'fi'|'sv'|'en'
 * @param {string} params.seuraNimi
 * @param {string} params.pelaajaNimi
 * @param {string} params.joukkueNimi
 * @param {string} params.linkki
 */
function tmEmailRekisteriKutsu({ kieli = 'fi', seuraNimi, pelaajaNimi, joukkueNimi, linkki }) {
  const k = TM_LANG[kieli]?.email || TM_LANG.fi.email;
  const teksti = (TM_LANG[kieli]?.email?.rekisteriKutsu_teksti || TM_LANG.fi.email.rekisteriKutsu_teksti)
    .replace('{seura}', seuraNimi)
    .replace('{pelaaja}', pelaajaNimi);
  const joukkueLause = joukkueNimi
    ? (kieli === 'sv' ? `i laget <strong>${joukkueNimi}</strong>`
       : kieli === 'en' ? `to team <strong>${joukkueNimi}</strong>`
       : `joukkueeseen <strong>${joukkueNimi}</strong>`)
    : '';
  return `
    <p>${teksti} ${joukkueLause}.</p>
    <div style="text-align:center;margin:32px 0;">
      <a href="${linkki}" style="background:#28B090;color:#000;padding:14px 32px;
         border-radius:8px;text-decoration:none;font-weight:bold;font-size:16px;display:inline-block;">
        ${k.rekisteriKutsu_nappi}
      </a>
    </div>
    <p style="font-size:12px;color:#999;text-align:center;">${k.rekisteriKutsu_huom}</p>`;
}

/**
 * Luo tervetuloa-sähköpostin HTML (käyttäjän lisääminen).
 */
function tmEmailTervetuloa({ kieli = 'fi', etunimi, rooli, resetLinkki }) {
  const k = TM_LANG[kieli]?.email || TM_LANG.fi.email;
  const roolitekstiKieli = TM_LANG[kieli]?.henkilosto?.roolit?.[rooli] || rooli;
  const teksti = k.tervetuloa_teksti.replace('{rooli}', roolitekstiKieli);
  return `
    <h2 style="color:#28B090;">${k.tervetuloa_otsikko}</h2>
    <p>${kieli === 'sv' ? 'Hej' : kieli === 'en' ? 'Hi' : 'Hei'} ${etunimi || ''},</p>
    <p>${teksti}</p>
    <div style="text-align:center;margin:24px 0;">
      <a href="${resetLinkki}" style="background:#28B090;color:#000;padding:12px 28px;
         border-radius:8px;text-decoration:none;font-weight:bold;">
        ${k.tervetuloa_nappi}
      </a>
    </div>
    <p style="color:#999;font-size:12px;">${k.tervetuloa_linkki_huom}</p>`;
}

// ─────────────────────────────────────────────────────────────────
// KONSOLI-INFO (kehitysaikana)
// ─────────────────────────────────────────────────────────────────
console.log(`[TM Lang] Ladattu. Kielet: ${tmTuetutKielet().join(', ')}. Aktiivinen: ${_tm_kieli}`);

// ─────────────────────────────────────────────────────────────────
// KIELIPAKETIT (erä (a)): sv/en-haarukat ovat erillisiä tiedostoja (lib/tm_lang_sv.js, tm_lang_en.js), joita fi-sivu ei lataa.
// Sivu merkitsee ne `<script type="text/plain" data-tm-kielipaketti src="lib/tm_lang_sv.js">`; tmLangLataa() lisää nykyisen kielen paketin <script>-elementtinä.
// ─────────────────────────────────────────────────────────────────
const _tmLangLupaukset = {}, _tmLangEpaonnistui = {};

/** SYNKRONINEN: onko nykyisen kielen haarukka paikallaan? fi → aina. Epäonnistunut lataus lasketaan valmiiksi (teksti jää suomeksi; ei draw-silmukkaa). */
function tmLangValmis() {
  return _tm_kieli === 'fi' || !!TM_LANG[_tm_kieli] || !!_tmLangEpaonnistui[_tm_kieli];
}

/** Lataa nykyisen kielen paketin (kerran). Promise<boolean>: true = haarukka paikallaan; ei heitä koskaan. */
function tmLangLataa() {
  const k = _tm_kieli;
  if (k === 'fi' || TM_LANG[k]) return Promise.resolve(true);
  if (_tmLangLupaukset[k]) return _tmLangLupaukset[k];
  if (typeof document === 'undefined') return Promise.resolve(false);
  const tagi = document.querySelector('script[data-tm-kielipaketti][src*="tm_lang_' + k + '.js"]');
  if (!tagi) { _tmLangEpaonnistui[k] = true; return Promise.resolve(false); }
  _tmLangLupaukset[k] = new Promise(function (ok) {
    const el = document.createElement('script');
    el.onload = function () { if (!TM_LANG[k] && window.TM_LANG_PAKETIT && window.TM_LANG_PAKETIT[k]) TM_LANG[k] = window.TM_LANG_PAKETIT[k]; ok(!!TM_LANG[k]); };
    el.onerror = function () { _tmLangEpaonnistui[k] = true; ok(false); };
    el.src = tagi.getAttribute('src'); document.head.appendChild(el);
  }).then(function (hyva) { if (!hyva) _tmLangEpaonnistui[k] = true; return hyva; });
  return _tmLangLupaukset[k];
}

// ─────────────────────────────────────────────────────────────────
// EXPORTIT — selain-globaalit (inline-handlerit + classic-scriptit) + Vitest (module.exports)
// ─────────────────────────────────────────────────────────────────
if (typeof window !== 'undefined') {
  window.TM_LANG = TM_LANG;
  if (window.TM_LANG_PAKETIT) { for (const k of Object.keys(window.TM_LANG_PAKETIT)) TM_LANG[k] = window.TM_LANG_PAKETIT[k]; }   // paketti ehti ladata ennen moottoria (defer-järjestys)
  window.t = t;
  window.tmAsetaKieli = tmAsetaKieli;
  window.tmKieliInitSeura = tmKieliInitSeura;
  window.tmNykyinenKieli = tmNykyinenKieli;
  window.tmPvmLocale = tmPvmLocale;
  window.tmPvmFmt = tmPvmFmt;
  window.tmTuetutKielet = tmTuetutKielet;
  window.tmLangValmis = tmLangValmis;
  window.tmLangLataa = tmLangLataa;
  window.tmRooli = tmRooli;
  window.tmEmailRekisteriKutsu = tmEmailRekisteriKutsu;
  window.tmEmailTervetuloa = tmEmailTervetuloa;
}
if (typeof module !== 'undefined' && module.exports) {
  if (typeof require === 'function') { TM_LANG.sv = require('./tm_lang_sv.js'); TM_LANG.en = require('./tm_lang_en.js'); }   // Node: täysi sanakirja kuten ennen jakoa
  module.exports = { TM_LANG, t, tmAsetaKieli, tmKieliInitSeura, tmNykyinenKieli, tmPvmLocale, tmPvmFmt, tmTuetutKielet, tmLangValmis, tmLangLataa, tmRooli, tmEmailRekisteriKutsu, tmEmailTervetuloa };
}
