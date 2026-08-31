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
    },
    // V1-A — Pelaaja_v7 i18n (migroitu STR; DE pudotettu; xpHint EI migroitu §7.22 (ei renderöity, XP-kieli kielletty))
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
    },
    // V1-B — Vanhempi_v2 (perhe-pinta, §7.22: vahvuus ensin, ei vertailua/uhkaa/tasolukuja)
    vanhempi: {
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
      pelaajan_kirjautuminen: 'Pelaajan kirjautuminen',
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
    },
  },

  // ── RUOTSI ────────────────────────────────────────────────────
  sv: {

    yleiset: {
      sovellus_nimi:    'TalentMaster™',
      tallenna:         'Spara',
      peruuta:          'Avbryt',
      sulje:            'Stäng',
      poista:           'Ta bort',
      muokkaa:          'Redigera',
      lataa:            'Ladda ned',
      laheta:           'Skicka',
      hae:              'Sök',
      lisaa:            'Lägg till',
      valmis:           'Klar',
      latautuu:         'Laddar...',
      virhe:            'Fel',
      onnistui:         'Lyckades',
      pakollinen:       'obligatoriskt fält',
      vahvista_poisto:  'Vill du verkligen ta bort?',
      ei_tietoja:       'Inga uppgifter',
      kaikki:           'Alla',
      takaisin:         'Tillbaka',
      aloita:           'Starta',
      valmistaudu:      'Gör dig redo',
      tauko:            'Paus',
      jatka:            'Fortsätt',
      takaisin_kotiin:  'Till startsidan',
    },

    auth: {
      sahkoposti:           'E-post',
      salasana:             'Lösenord',
      kirjaudu:             'Logga in',
      kirjaudu_ulos:        'Logga ut',
      kirjautuu:            'Loggar in...',
      ladataan_seuran_tiedot: 'Laddar klubbens uppgifter...',
      valitse_seura:        '— Välj klubb —',
      kirjautumisvirhe:     'Inloggningen misslyckades — kontrollera e-post och lösenord',
      ei_oikeuksia:         'Den här vyn är för klubbadministration. Tränare loggar in i tränarens vy.',
      seura_ei_loydy:       'Klubben hittades inte. Kontakta TalentMaster-support.',
      latausvirhe:          'Laddningsfel — uppdatera sidan.',
    },

    nav: {
      hallinta:         'ADMINISTRATION',
      yhteenveto:       'Översikt',
      kehitystilanne:   'Utvecklingsläge',
      pelaajat:         'Spelare',
      joukkueet:        'Lag',
      organisaatio:     'ORGANISATION',
      henkilosto:       'Personal',
      sopimukset:       'Avtal',
      toiminnot:        'FUNKTIONER',
      rekisterointi:    'Registreringsinbjudan',
      tuo_excel:        'Importera Excel',
      massakutsu:       'Massinbjudan',
      navigoi:          'NAVIGERA',
      vp_dashboard:     'VP-panel',
      valmentaja:       'Tränare v9',
      tanaan:           'Idag',
      mina:             'Jag',
      meista:           'Om oss',
      koti:             'Hem',
      viikko:           'Vecka',
      viestit:          'Meddelanden',
      kortti:           'Kort',
      asetukset:        'Inställningar',
      suostumuslomake:  'Samtyckesformulär',
    },

    seura: {
      seura:            'Klubb',
      paketti:          'Paket',
      perustaso:        'Basterbjudande',
      kehitystaso:      'Utvecklingserbjudande',
      huipputaso:       'Eliterbjudande',
      aktiivinen:       'Aktiv',
      ei_aktiivinen:    'Inaktiv',
    },

    joukkueet: {
      seuran_joukkueet: 'Klubbens lag',
      lisaa:            'Lägg till lag',
      joukkue:          'LAG',
      ikatyokka:        'ÅLDERSGRUPP',
      vuosi:            'ÅR',
      id:               'ID',
      toiminnot:        'ÅTGÄRDER',
      kutsu:            'Bjud in',
      lisaa_modal_otsikko: 'Lägg till lag',
      lisaa_modal_kuvaus:  'Lagets uppgifter sparas i Firestore och syns direkt för tränare.',
      joukkueen_nimi:   'LAGETS NAMN',
      ikaluokka_kentta: 'ÅLDERSGRUPP',
      joukkue_id:       'LAG-ID',
      joukkue_id_hint:  'Gemener, inga mellanslag (t.ex. vifk_p13)',
      syntymavuosi:     'ÅR (FÖDELSEÅR)',
      tallenna:         'Spara lag',
      poistettu:        'Laget togs bort',
      lisatty:          'Laget lades till!',
      pakollinen_virhe: 'Namn, åldersgrupp och ID är obligatoriska.',
      seura_ei_ladattu: 'Klubben är inte laddad. Logga ut och logga in igen.',
    },

    pelaajat: {
      seuran_pelaajat:  'Klubbens spelare',
      hae_pelaajia:     'Sök spelare...',
      nimi:             'NAMN',
      joukkue:          'LAG',
      tila:             'STATUS',
      aktiivinen:       'Aktiv',
      odottaa:          'Väntar på samtycke',
      kutsu_lahetetty:  'Inbjudan skickad',
      ei_pelaajia:      'Inga spelare i detta lag',
      kaikki_joukkueet: 'Alla lag',
    },

    // Mätare (publika termer, §14)
    mittarit: {
      kehon_valmius:        'Kroppslig beredskap',
      valmius:              'Beredskap',
      kehon_valmiusindeksi: 'kroppslig beredskapsindex',
    },

    rekisterointi: {
      otsikko:            'Skicka registreringsinbjudan',
      kuvaus:             'Bjud in en spelare att gå med i TalentMaster. Vårdnadshavaren får ett e-postmeddelande med en länk till samtyckesformuläret.',
      pelaajan_etunimi:   'Spelarens förnamn',
      pelaajan_sukunimi:  'Spelarens efternamn',
      huoltajan_sahkoposti: 'Vårdnadshavarens e-post',
      valitse_joukkue:    '— Välj lag —',
      joukkue:            'Lag',
      laheta_nappi:       'Skicka registreringsinbjudan',
      lahetetaan:         'Skickar...',
      onnistui:           'Inbjudan skickad!',
      virhe:              'Utskicket misslyckades',
      pakollinen_virhe:   'Fyll i alla obligatoriska fält.',
    },

    henkilosto: {
      otsikko:            'Klubbens personal',
      lisaa:              'Lägg till person',
      nimi:               'NAMN',
      sahkoposti:         'E-POST',
      rooli:              'ROLL',
      joukkue:            'LAG',
      toiminnot:          'ÅTGÄRDER',
      ei_henkilostoa:     'Ingen personal',
      roolit: {
        vp:                     'Träningschef',
        valmentaja:             'Tränare',
        talenttivalmentaja:     'Talangtränare',
        fysiikkavalmentaja:     'Fysträner',
        fysioterapeutti:        'Fysioterapeut',
        testivastaava:          'Testansvarig',
        seurasihteeri:          'Klubbsekreterare',
        urheilutoimenjohtaja:   'Idrottschef',
      },
    },

    yhteenveto: {
      tervetuloa_otsikko:   'Er klubb',
      tervetuloa_teksti:    'Systemet är redo. Nedan tre steg startar upp klubbens verksamhet — de första spelarna registrerade och tränare inloggade.',
      vaihe:                'steg klara',
      vaihe_1_otsikko:      'Lägg till lag',
      vaihe_1_kuvaus:       'Skapa klubbens lag — detta aktiverar spelarregistrering och tränarinbjudningar.',
      vaihe_1_nappi:        'Gå till Lag-fliken',
      vaihe_2_otsikko:      'Registrera spelare',
      vaihe_2_kuvaus:       'Ladda ned Excel-mallen, fyll i spelaruppgifter och skicka massinbjudan till vårdnadshavare med samtyckesformulär.',
      vaihe_2_nappi:        'Ladda ned registermall',
      vaihe_3_otsikko:      'Bjud in tränare',
      vaihe_3_kuvaus:       'Lägg till tränare i systemet och ge dem åtkomst till lagets uppgifter.',
      vaihe_3_nappi:        'Lägg till personal',
    },

    email: {
      rekisteriKutsu_aihe:    '{seura} — Registreringsinbjudan till TalentMaster',
      rekisteriKutsu_teksti:  '{seura} bjuder in er att registrera {pelaaja} i TalentMaster',
      rekisteriKutsu_nappi:   'Registrera dig och ge samtycke →',
      rekisteriKutsu_huom:    'Länken är personlig — dela den inte vidare.',
      tervetuloa_aihe:        'TalentMaster™ — Välkommen! Ange ditt lösenord',
      tervetuloa_otsikko:     'Välkommen till TalentMaster!',
      tervetuloa_teksti:      'Du har lagts till i systemet med rollen {rooli}.',
      tervetuloa_nappi:       'Ange lösenord →',
      tervetuloa_linkki_huom: 'Länken är giltig i 1 timme.',
      pelaajaSivu_aihe:       '{pelaaja} — Välkommen till TalentMaster! Ange ditt lösenord först',
      pelaajaSivu_aseta_salasana: '① Ange ditt lösenord först',
      pelaajaSivu_salasana_ohje:  'Klicka på länken och skapa ditt eget lösenord. Länken går ut om 1 timme.',
      pelaajaSivu_salasana_nappi: 'Ange lösenord →',
      pelaajaSivu_sivut_teksti:   '② När lösenordet är angivet kan du komma åt sidorna:',
      pelaajaSivu_vanhempi_nappi: '👨‍👩‍👦 Föräldersida →',
      pelaajaSivu_pelaaja_nappi:  '⚽ Spelarens egen sida →',
    },

    suostumus: {
      otsikko:          'Registrering och samtycke',
      kuvaus:           'Fyll i vårdnadshavarens uppgifter och ge samtycke till behandling av spelarens uppgifter.',
      huoltajan_nimi:   'Vårdnadshavarens namn',
      huoltajan_email:  'Vårdnadshavarens e-post',
      anna_suostumus:   'Jag ger mitt samtycke',
      laheta:           'Skicka',
      kiitos:           'Tack! Samtycket mottaget.',
      // V0.5 LUONNOS — juristi/Tero vahvistaa ennen EIF-liveä (docs/I18N_SUOSTUMUS_KAANNOKSET.md)
      info_otsikko:       'Vad betyder detta i praktiken?',
      info_teksti:        'Föreningen följer ditt barns fysiska utveckling under säsongen. Resultaten sparas i TalentMaster-systemet, där tränaren och du som vårdnadshavare kan följa utvecklingen. Uppgifterna är konfidentiella.',
      ryhma_pakolliset:   'Obligatoriska',
      ryhma_testaus:      'Testning och utvecklingsuppföljning',
      ryhma_jakaminen:    'Delning av uppgifter',
      badge_pakollinen:   'OBLIGATORISK',
      badge_vapaaehtoinen:'FRIVILLIG',
      c1_otsikko:         'Lagring av uppgifter i registret',
      c1_teksti:          'Mitt barns namn, födelsedatum, förening och kontaktuppgifter sparas i TalentMaster-utvecklingssystemet för föreningens bruk.',
      c2_otsikko:         'Dataskyddsbeskrivning läst',
      c2_teksti_alku:     'Jag har tagit del av',
      c2_linkki:          'TalentMasters dataskyddsbeskrivning',
      c2_teksti_loppu:    '. Jag vet att jag har rätt att se, rätta och radera mitt barns uppgifter när som helst.',
      c3_otsikko:         'Fysisk testning och utvecklingsuppföljning',
      c3_teksti:          'Jag ger tillstånd att mäta mitt barns fysiska utveckling och lagra resultaten i systemet.',
      c4_otsikko:         'Bedömning av biologisk ålder',
      c4_teksti:          'Jag ger tillstånd att bedöma mitt barns tillväxtfas med hjälp av kroppsmätningar (längd, vikt, sitthöjd). Detta används för att dimensionera träningsbelastningen på ett tryggt sätt.',
      c5_otsikko:         'Utvecklingsuppgifter till föreningens tränare',
      c5_teksti:          'Mitt barns testresultat delas med föreningens övriga tränare.',
      c6_otsikko:         'Anonymiserad data för utveckling av tjänsten',
      c6_teksti:          'Mitt barns avidentifierade data kan användas för att utveckla TalentMaster-tjänsten.',
      nappi_takaisin:     'Tillbaka',
      nappi_vahvista:     'Bekräfta och skicka',
      onnistui_otsikko:   'Registreringen lyckades!',
      onnistui_teksti:    'Uppgifterna har sparats i TalentMaster-registret.',
    },
    // V1-A — Pelaaja_v7 (sv käännökset; tuotantoon, iteroidaan seurojen palautteella)
    pelaaja: {
      takautuva_linkki:       '+ Lägg till en tidigare dag',
      takautuva_otsikko:      'Lägg till en tidigare dag',
      takautuva_pvm:          'Datum',
      takautuva_mita:         'Vad gjorde du?',
      takautuva_jalkapallo:   'Fotboll',
      takautuva_muu:          'Annan idrott',
      takautuva_lepo:         'Vilodag',
      takautuva_kesto:        'Längd',
      takautuva_tallenna:     '✓ Lägg till dag',
      takautuva_val_pvm:      'Välj ett datum',
      takautuva_val_mita:     'Välj vad du gjorde',
      takautuva_val_kesto:    'Välj längd',
      streak_0:               'Börja idag — det första steget är viktigast.',
      streak_1_6:             '🔥 {n} dagars svit — fortsätt imorgon!',
      streak_7_13:            '🔥 {n} dagar — du är redan hängiven.',
      streak_14:              '🔥 {n} dagar — du är redan exceptionell.',
      sig_piilohelmi:         'Dold pärla',
      sig_phv:                'PHV — lätta på belastningen',
      sig_putki:              '{n} dagars svit',
      fiilis_kysymys:         'Hur känns det?',
      fiilis_vahan_vasynyt:   'Lite trött',
      fiilis_mahtavaa:        'Toppen',
      nain_teet:              'Så här gör du',
      pallo_joka_paiva:       'Bollen varje dag',
      kirjaa_tehdyksi:        'Markera som gjort',
      rae_q4_otsikko:         'Till dig',
      rae_q4_teksti:          'Du är bland de yngsta i din åldersklass — du spelar ofta mot äldre, och det är en fördel på lång sikt. Många toppspelare har varit i samma situation. Din kropp växer fortfarande. Fokusera på ditt eget görande, inte på att jämföra dig.',
      tervetuloa_takaisin:    'Välkommen tillbaka',
      streak:                 '🔥 Börja din serie idag.',
      aloita_5min:            'Starta · 5 min',
      paivan_ohjelma:         'Dagens personliga program',
      muuta_tanaan:           'Övrigt idag',
      unohtuiko_pin:          'Glömt PIN?',
      syota_pin:              'Ange PIN',
      talla_viikolla:         'Denna vecka',
      paivan_putki:           'dagens serie',
      jatka_nuoli:            'Fortsätt →',
      kirjaudu_sahkopostilla: 'Logga in med e-post',
      pin_vaara:              'Fel PIN',
      // V1-A2 (sv; tuotantoon, iteroidaan)
      ohita:                  'Hoppa över',
      th_terve_leikkija:      'Hej',
      th_terve_rakentaja:     'Hej',
      th_terve_showcase:      'Välkommen',
      th_k1_leikkija:         'En rolig grej du kan göra idag. Testa — 10 min räcker!',
      th_k1_rakentaja:        'En grej du kan göra idag. Testa — 10 min räcker!',
      th_k1_showcase:         'En grej du kan göra idag. Testa — 10 min räcker.',
      th_k2_leikkija:         'Ditt eget kort och dina grejer. Det växer när du tränar och spelar.',
      th_k2_rakentaja:        'Ditt eget kort och dina grejer. Det växer när du tränar.',
      th_k2_showcase:         'Ditt eget kort och dina grejer. Det växer när du tränar.',
      th_k3:                  'Tryck när du vill berätta för tränaren hur det känns.',
      th_alota_leikkija:      'Nu kör vi! 🚀',
      th_alota_rakentaja:     'Nu kör vi!',
      th_alota_showcase:      'Nu kör vi',
      th_kortti_fiilis:       'Känsla-knapp',
      va_oma_treeni:          'Egen träning',
      va_mita_teit:           'Vad gjorde du idag?',
      va_info:                'Gårdsspel, spel med kompisar och egen träning räknas. Tränaren ser vad du gjorde — det behöver inte vara perfekt.',
      va_q1:                  '1. Vilken sorts träning?',
      va_q2:                  '2. Hur mycket tid?',
      va_q3:                  '3. Hur kändes det?',
      va_kaverit:             'Kompisar (inte obligatoriskt)',
      va_minuuttia:           'minuter',
      va_kirjaa_treeni:       'Registrera träning',
      va_valmentaja_nakee:    'Tränaren ser registreringen i sammanställningen.',
      va_t_pihapeli:          'Gårdsspel',
      va_t_pihapeli_s:        '2v2, 3v3, måltävling',
      va_t_kaveri:            'Med en kompis',
      va_t_kaveri_s:          'Passningar, skott',
      va_t_keho:              'Egen kropp',
      va_t_keho_s:            'Löpning, cirkelträning',
      va_t_pallo:             'Boll ensam',
      va_t_pallo_s:           'Nickar, teknik',
      va_t_muu:               'Något annat',
      va_t_muu_s:             'Simning, dans, rullskridskor',
      va_fiilis_kevyt:        'Lätt',
      va_fiilis_ok:           'OK',
      va_fiilis_hyva:         'Bra',
      va_fiilis_tiukka:       'Tufft',
      va_fiilis_taysilla:     'För fullt',
      vad_kirjattu:           'Registrerat',
      vad_hyvaa_tyota:        'Bra jobbat.',
      vad_liekki_pysyy:       'Lågan brinner vidare.',
      ha_haasteet:            'Utmaningar',
      ha_kuka_uskaltaa:       'Vem vågar?',
      ha_tab_teema:           'Veckans tema',
      ha_tab_kaverit:         'Kompisar',
      ha_tab_omat:            'Egna',
      me_sisalto_tulossa:     'Innehåll kommer',
      me_kuvaus:              'Lag, tränare, meddelanden, kalender — Fas B3.',
      ulos:                   'Ut',
    },
    // V1-B — Vanhempi_v2 (sv käännökset; tuotantoon, iteroidaan seurojen palautteella)
    vanhempi: {
      perhe_kirjautuminen:    'Familj · Vårdnadshavarens inloggning',
      kieli:                  'Språk',
      tervetulo_hei:          'Hej! 👋',
      tervetulo_johdanto:     'Du är en del av ditt barns utvecklingsteam. Din roll är att stödja och uppmuntra — appen sköter mätningen.',
      tervetulo_kehu:         'Skicka första berömmet',
      tervetulo_kortti:       'Se kortet + "hur du stödjer hemma"',
      tervetulo_viestit:      'Läs tränarens meddelanden',
      tervetulo_kirjaa:       'Logga en träning',
      kultainen_otsikko:      'Gyllene regeln:',
      kultainen_teksti:       'Beröm ansträngningen, inte resultatet. Jämför barnet bara med sig självt — inte med kompisar.',
      nain_mukana:            'Så här är du med',
      selva:                  'Klart!',
      ohita:                  'Hoppa över',
      asetukset_alaotsikko:   'Vad jag ser och hur',
      pelaajan_kirjautuminen: 'Spelarens inloggning',
      kopioi:                 'Kopiera',
      lapsen_ikaryhma:        'Barnets åldersgrupp · påverkar vyn',
      // V1-B2 (sv)
      koti_otsikko:           '{nimi} · vecka',
      koti_otsikko_u19:       '{nimi} · sammanfattning',
      kirjaa_puolesta:        'Registrera för barnet',
      kirjaa_puolesta_selite: 'Gårdsspel, appen inte öppen, födelsedag...',
      tama_viikko:            'Denna vecka',
      treenitiedot_tyhja:     'Träningsuppgifterna visas när tränaren registrerar övningar.',
      kehu_hienoa:            'Bra jobbat!',
      kehu_upea:              'Toppenträning!',
      kehu_lahetetty:         'Beröm skickat',
      nayta_opas:             'Visa guiden igen',
      mita_teki:              'Vad {nimi} gjorde',
      valmentajalta:          'Från tränaren',
      tekniikkaprofiili:      'Teknikprofil',
      tp_vahvuus:             'Styrka:',
      tp_seuraava_askel:      'Nästa steg:',
      tp_mitattu:             'Mätt',
      tp_tyhja:               '⚽ Mätningar på väg — här ser du styrkorna och hur du kan stödja träningen.',
      tp_vahvin:              'Detta är den starkaste grenen!',
      matka_otsikko:          '{nimi} · resa',
      jaa_kortti:             'Dela kortet',
      fiilis_iloinen:         'Glad',
      fiilis_innoissaan:      'Taggad',
      fiilis_vasynyt:         'Trött',
      fiilis_loukkasi:        'Skadade sig',
      tt_kehu_ensimmainen:    'Skicka första berömmet',
      tt_katso_kortti:        'Se kortet + "hur du stöttar hemma"',
      tt_lue_viestit:         'Läs tränarens meddelanden',
      tt_kirjaa_treeni:       'Registrera träning',
    },
  },

  // ── ENGLANTI ──────────────────────────────────────────────────
  en: {

    yleiset: {
      sovellus_nimi:    'TalentMaster™',
      tallenna:         'Save',
      peruuta:          'Cancel',
      sulje:            'Close',
      poista:           'Delete',
      muokkaa:          'Edit',
      lataa:            'Download',
      laheta:           'Send',
      hae:              'Search',
      lisaa:            'Add',
      valmis:           'Done',
      latautuu:         'Loading...',
      virhe:            'Error',
      onnistui:         'Success',
      pakollinen:       'required field',
      vahvista_poisto:  'Are you sure you want to delete?',
      ei_tietoja:       'No data',
      kaikki:           'All',
      takaisin:         'Back',
      aloita:           'Start',
      valmistaudu:      'Get ready',
      tauko:            'Pause',
      jatka:            'Resume',
      takaisin_kotiin:  'Back home',
    },

    auth: {
      sahkoposti:           'Email',
      salasana:             'Password',
      kirjaudu:             'Sign in',
      kirjaudu_ulos:        'Sign out',
      kirjautuu:            'Signing in...',
      ladataan_seuran_tiedot: 'Loading club data...',
      valitse_seura:        '— Select club —',
      kirjautumisvirhe:     'Sign-in failed — check your email and password',
      ei_oikeuksia:         'This view is for club administration. Coaches sign in through the coach view.',
      seura_ei_loydy:       'Club not found. Contact TalentMaster support.',
      latausvirhe:          'Loading error — please refresh the page.',
    },

    nav: {
      hallinta:         'MANAGEMENT',
      yhteenveto:       'Overview',
      kehitystilanne:   'Development',
      pelaajat:         'Players',
      joukkueet:        'Teams',
      organisaatio:     'ORGANISATION',
      henkilosto:       'Staff',
      sopimukset:       'Agreements',
      toiminnot:        'FUNCTIONS',
      rekisterointi:    'Registration invite',
      tuo_excel:        'Import Excel',
      massakutsu:       'Bulk invite',
      navigoi:          'NAVIGATE',
      vp_dashboard:     'VP Dashboard',
      valmentaja:       'Coach v9',
      tanaan:           'Today',
      mina:             'Me',
      meista:           'About us',
      koti:             'Home',
      viikko:           'Week',
      viestit:          'Messages',
      kortti:           'Card',
      asetukset:        'Settings',
      suostumuslomake:  'Consent form',
    },

    seura: {
      seura:            'Club',
      paketti:          'Plan',
      perustaso:        'Basic',
      kehitystaso:      'Development',
      huipputaso:       'Elite',
      aktiivinen:       'Active',
      ei_aktiivinen:    'Inactive',
    },

    joukkueet: {
      seuran_joukkueet: 'Club teams',
      lisaa:            'Add team',
      joukkue:          'TEAM',
      ikatyokka:        'AGE GROUP',
      vuosi:            'YEAR',
      id:               'ID',
      toiminnot:        'ACTIONS',
      kutsu:            'Invite',
      lisaa_modal_otsikko: 'Add team',
      lisaa_modal_kuvaus:  'Team data is saved to Firestore and immediately visible to coaches.',
      joukkueen_nimi:   'TEAM NAME',
      ikaluokka_kentta: 'AGE GROUP',
      joukkue_id:       'TEAM ID',
      joukkue_id_hint:  'Lowercase, no spaces (e.g. vifk_p13)',
      syntymavuosi:     'YEAR (BIRTH YEAR)',
      tallenna:         'Save team',
      poistettu:        'Team deleted',
      lisatty:          'Team added!',
      pakollinen_virhe: 'Name, age group and ID are required.',
      seura_ei_ladattu: 'Club not loaded. Sign out and sign in again.',
    },

    pelaajat: {
      seuran_pelaajat:  'Club players',
      hae_pelaajia:     'Search players...',
      nimi:             'NAME',
      joukkue:          'TEAM',
      tila:             'STATUS',
      aktiivinen:       'Active',
      odottaa:          'Awaiting consent',
      kutsu_lahetetty:  'Invite sent',
      ei_pelaajia:      'No players in this team',
      kaikki_joukkueet: 'All teams',
    },

    // Metrics (public terms, §14)
    mittarit: {
      kehon_valmius:        'Readiness',
      valmius:              'Readiness',
      kehon_valmiusindeksi: 'physical readiness index',
    },

    rekisterointi: {
      otsikko:            'Send registration invite',
      kuvaus:             'Invite a player to join TalentMaster. The guardian will receive an email with a link to the consent form.',
      pelaajan_etunimi:   'Player\'s first name',
      pelaajan_sukunimi:  'Player\'s last name',
      huoltajan_sahkoposti: 'Guardian\'s email',
      valitse_joukkue:    '— Select team —',
      joukkue:            'Team',
      laheta_nappi:       'Send registration invite',
      lahetetaan:         'Sending...',
      onnistui:           'Invite sent!',
      virhe:              'Sending failed',
      pakollinen_virhe:   'Please fill in all required fields.',
    },

    henkilosto: {
      otsikko:            'Club staff',
      lisaa:              'Add person',
      nimi:               'NAME',
      sahkoposti:         'EMAIL',
      rooli:              'ROLE',
      joukkue:            'TEAM',
      toiminnot:          'ACTIONS',
      ei_henkilostoa:     'No staff',
      roolit: {
        vp:                     'Head of Coaching',
        valmentaja:             'Coach',
        talenttivalmentaja:     'Talent Coach',
        fysiikkavalmentaja:     'Fitness Coach',
        fysioterapeutti:        'Physiotherapist',
        testivastaava:          'Testing Officer',
        seurasihteeri:          'Club Secretary',
        urheilutoimenjohtaja:   'Director of Sport',
      },
    },

    yhteenveto: {
      tervetuloa_otsikko:   'Your club',
      tervetuloa_teksti:    'The system is ready. The three steps below will launch the club\'s operations — first players registered and coaches signed in.',
      vaihe:                'steps complete',
      vaihe_1_otsikko:      'Add teams',
      vaihe_1_kuvaus:       'Create the club\'s teams — this activates player registration and coach invitations.',
      vaihe_1_nappi:        'Go to Teams tab',
      vaihe_2_otsikko:      'Register players',
      vaihe_2_kuvaus:       'Download the Excel template, fill in player details and send a bulk invite to guardians with the consent form.',
      vaihe_2_nappi:        'Download template',
      vaihe_3_otsikko:      'Invite coaches',
      vaihe_3_kuvaus:       'Add coaches to the system and give them access to their team\'s information.',
      vaihe_3_nappi:        'Add staff',
    },

    email: {
      rekisteriKutsu_aihe:    '{seura} — Registration invite to TalentMaster',
      rekisteriKutsu_teksti:  '{seura} invites you to register {pelaaja} in TalentMaster',
      rekisteriKutsu_nappi:   'Register and give consent →',
      rekisteriKutsu_huom:    'This link is personal — please do not share it.',
      tervetuloa_aihe:        'TalentMaster™ — Welcome! Set your password',
      tervetuloa_otsikko:     'Welcome to TalentMaster!',
      tervetuloa_teksti:      'You have been added to the system with the role {rooli}.',
      tervetuloa_nappi:       'Set password →',
      tervetuloa_linkki_huom: 'The link is valid for 1 hour.',
      pelaajaSivu_aihe:       '{pelaaja} — Welcome to TalentMaster! Set your password first',
      pelaajaSivu_aseta_salasana: '① Set your password first',
      pelaajaSivu_salasana_ohje:  'Click the link and create your own password. The link expires in 1 hour.',
      pelaajaSivu_salasana_nappi: 'Set password →',
      pelaajaSivu_sivut_teksti:   '② Once the password is set, you can access the pages:',
      pelaajaSivu_vanhempi_nappi: '👨‍👩‍👦 Parent page →',
      pelaajaSivu_pelaaja_nappi:  '⚽ Player\'s own page →',
    },

    suostumus: {
      otsikko:          'Registration and consent',
      kuvaus:           'Fill in the guardian\'s details and give consent to the processing of the player\'s data.',
      huoltajan_nimi:   'Guardian\'s name',
      huoltajan_email:  'Guardian\'s email',
      anna_suostumus:   'I give my consent',
      laheta:           'Submit',
      kiitos:           'Thank you! Consent received.',
      // V0.5 DRAFT — legal review before production (docs/I18N_SUOSTUMUS_KAANNOKSET.md)
      info_otsikko:       'What does this mean in practice?',
      info_teksti:        'The club monitors your child\'s physical development during the season. Results are stored in the TalentMaster system, where the coach and you as guardian can follow the progress. The information is confidential.',
      ryhma_pakolliset:   'Required',
      ryhma_testaus:      'Testing and development monitoring',
      ryhma_jakaminen:    'Data sharing',
      badge_pakollinen:   'REQUIRED',
      badge_vapaaehtoinen:'OPTIONAL',
      c1_otsikko:         'Storing data in the register',
      c1_teksti:          'My child\'s name, date of birth, club and contact details are stored in the TalentMaster development system for the club\'s use.',
      c2_otsikko:         'Privacy policy read',
      c2_teksti_alku:     'I have read the',
      c2_linkki:          'TalentMaster privacy policy',
      c2_teksti_loppu:    '. I know that I have the right to view, correct and delete my child\'s data at any time.',
      c3_otsikko:         'Physical testing and development monitoring',
      c3_teksti:          'I give permission to measure my child\'s physical development and store the results in the system.',
      c4_otsikko:         'Biological age assessment',
      c4_teksti:          'I give permission to assess my child\'s growth phase using body measurements (height, weight, sitting height). This is used to size the training load safely.',
      c5_otsikko:         'Development data to the club\'s coaches',
      c5_teksti:          'My child\'s test results are shared with the club\'s other coaches.',
      c6_otsikko:         'Anonymised data for service development',
      c6_teksti:          'My child\'s de-identified data may be used to develop the TalentMaster service.',
      nappi_takaisin:     'Back',
      nappi_vahvista:     'Confirm and send',
      onnistui_otsikko:   'Registration successful!',
      onnistui_teksti:    'The information has been saved to the TalentMaster register.',
    },
    // V1-A — Pelaaja_v7 (en)
    pelaaja: {
      takautuva_linkki:       '+ Add a past day',
      takautuva_otsikko:      'Add a past day',
      takautuva_pvm:          'Date',
      takautuva_mita:         'What did you do?',
      takautuva_jalkapallo:   'Football',
      takautuva_muu:          'Other sport',
      takautuva_lepo:         'Rest day',
      takautuva_kesto:        'Duration',
      takautuva_tallenna:     '✓ Add day',
      takautuva_val_pvm:      'Choose a date',
      takautuva_val_mita:     'Choose what you did',
      takautuva_val_kesto:    'Choose duration',
      streak_0:               'Start today — the first step matters most.',
      streak_1_6:             '🔥 {n}-day streak — keep going tomorrow!',
      streak_7_13:            '🔥 {n} days — you are already committed.',
      streak_14:              '🔥 {n} days — you are already exceptional.',
      sig_piilohelmi:         'Hidden gem',
      sig_phv:                'PHV — ease the load',
      sig_putki:              '{n}-day streak',
      fiilis_kysymys:         'How do you feel?',
      fiilis_vahan_vasynyt:   'A bit tired',
      fiilis_mahtavaa:        'Great',
      nain_teet:              'How to',
      pallo_joka_paiva:       'The ball every day',
      kirjaa_tehdyksi:        'Mark as done',
      rae_q4_otsikko:         'For you',
      rae_q4_teksti:          'You are among the youngest in your age group — you often play against older players, and that is an advantage in the long run. Many top players have been in the same spot. Your body is still growing. Focus on your own effort, not on comparing yourself.',
      tervetuloa_takaisin:    'Welcome back',
      streak:                 '🔥 Start your streak today.',
      aloita_5min:            'Start · 5 min',
      paivan_ohjelma:         'Your personal program today',
      muuta_tanaan:           'Other today',
      unohtuiko_pin:          'Forgot PIN?',
      syota_pin:              'Enter PIN',
      talla_viikolla:         'This week',
      paivan_putki:           'day streak',
      jatka_nuoli:            'Continue →',
      kirjaudu_sahkopostilla: 'Log in with email',
      pin_vaara:              'Wrong PIN',
      // V1-A2 (en)
      ohita:                  'Skip',
      th_terve_leikkija:      'Hey',
      th_terve_rakentaja:     'Hi',
      th_terve_showcase:      'Welcome',
      th_k1_leikkija:         'One fun thing you can do today. Try it — 10 min is enough!',
      th_k1_rakentaja:        'One thing you can do today. Try it — 10 min is enough!',
      th_k1_showcase:         'One thing you can do today. Try it — 10 min is enough.',
      th_k2_leikkija:         'Your own card and your stuff. It grows when you train and play.',
      th_k2_rakentaja:        'Your own card and your stuff. It grows when you train.',
      th_k2_showcase:         'Your own card and your stuff. It grows when you train.',
      th_k3:                  'Tap when you want to tell the coach how it feels.',
      th_alota_leikkija:      'Let\'s go! 🚀',
      th_alota_rakentaja:     'Let\'s go!',
      th_alota_showcase:      'Let\'s go',
      th_kortti_fiilis:       'Mood button',
      va_oma_treeni:          'Own training',
      va_mita_teit:           'What did you do today?',
      va_info:                'Backyard games, playing with friends and your own training all count. The coach sees what you did — it doesn\'t have to be perfect.',
      va_q1:                  '1. What kind of training?',
      va_q2:                  '2. How much time?',
      va_q3:                  '3. How did it feel?',
      va_kaverit:             'Friends (not required)',
      va_minuuttia:           'minutes',
      va_kirjaa_treeni:       'Log training',
      va_valmentaja_nakee:    'The coach sees the entry in the summary.',
      va_t_pihapeli:          'Backyard game',
      va_t_pihapeli_s:        '2v2, 3v3, goal contest',
      va_t_kaveri:            'With a friend',
      va_t_kaveri_s:          'Passing, shooting',
      va_t_keho:              'Own body',
      va_t_keho_s:            'Running, circuit',
      va_t_pallo:             'Ball alone',
      va_t_pallo_s:           'Juggling, technique',
      va_t_muu:               'Something else',
      va_t_muu_s:             'Swimming, dancing, skating',
      va_fiilis_kevyt:        'Light',
      va_fiilis_ok:           'OK',
      va_fiilis_hyva:         'Good',
      va_fiilis_tiukka:       'Tough',
      va_fiilis_taysilla:     'All out',
      vad_kirjattu:           'Logged',
      vad_hyvaa_tyota:        'Good work.',
      vad_liekki_pysyy:       'The flame stays lit.',
      ha_haasteet:            'Challenges',
      ha_kuka_uskaltaa:       'Who dares?',
      ha_tab_teema:           'Week\'s theme',
      ha_tab_kaverit:         'Friends',
      ha_tab_omat:            'Own',
      me_sisalto_tulossa:     'Content coming',
      me_kuvaus:              'Team, coaches, messages, calendar — Phase B3.',
      ulos:                   'Out',
    },
    // V1-B — Vanhempi_v2 (en)
    vanhempi: {
      perhe_kirjautuminen:    'Family · Guardian sign-in',
      kieli:                  'Language',
      tervetulo_hei:          'Hi! 👋',
      tervetulo_johdanto:     'You are part of your child\'s development team. Your role is to support and encourage — the app handles the measuring.',
      tervetulo_kehu:         'Send the first praise',
      tervetulo_kortti:       'View the card + "how to support at home"',
      tervetulo_viestit:      'Read the coach\'s messages',
      tervetulo_kirjaa:       'Log a training',
      kultainen_otsikko:      'Golden rule:',
      kultainen_teksti:       'Praise effort, not results. Compare the child only to themselves — not to friends.',
      nain_mukana:            'This is how you take part',
      selva:                  'Got it!',
      ohita:                  'Skip',
      asetukset_alaotsikko:   'What I see and how',
      pelaajan_kirjautuminen: 'Player login',
      kopioi:                 'Copy',
      lapsen_ikaryhma:        'Child\'s age group · affects the view',
      // V1-B2 (en)
      koti_otsikko:           '{nimi} · week',
      koti_otsikko_u19:       '{nimi} · summary',
      kirjaa_puolesta:        'Log for your child',
      kirjaa_puolesta_selite: 'Backyard play, app not open, birthday...',
      tama_viikko:            'This week',
      treenitiedot_tyhja:     'Training info appears once the coach logs sessions.',
      kehu_hienoa:            'Great!',
      kehu_upea:              'Great session!',
      kehu_lahetetty:         'Praise sent',
      nayta_opas:             'Show guide again',
      mita_teki:              'What {nimi} did',
      valmentajalta:          'From the coach',
      tekniikkaprofiili:      'Technique profile',
      tp_vahvuus:             'Strength:',
      tp_seuraava_askel:      'Next step:',
      tp_mitattu:             'Measured',
      tp_tyhja:               '⚽ Measurements coming — here you\'ll see the strengths and how to support training.',
      tp_vahvin:              'This is the strongest skill!',
      matka_otsikko:          '{nimi} · journey',
      jaa_kortti:             'Share the card',
      fiilis_iloinen:         'Happy',
      fiilis_innoissaan:      'Excited',
      fiilis_vasynyt:         'Tired',
      fiilis_loukkasi:        'Got hurt',
      tt_kehu_ensimmainen:    'Send the first praise',
      tt_katso_kortti:        'View the card + "how to support at home"',
      tt_lue_viestit:         'Read the coach\'s messages',
      tt_kirjaa_treeni:       'Log a session',
    },
  },
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
 * Palauta kaikki tuetut kielet.
 * @returns {string[]}
 */
function tmTuetutKielet() {
  return Object.keys(TM_LANG);
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
// EXPORTIT — selain-globaalit (inline-handlerit + classic-scriptit) + Vitest (module.exports)
// ─────────────────────────────────────────────────────────────────
if (typeof window !== 'undefined') {
  window.TM_LANG = TM_LANG;
  window.t = t;
  window.tmAsetaKieli = tmAsetaKieli;
  window.tmKieliInitSeura = tmKieliInitSeura;
  window.tmNykyinenKieli = tmNykyinenKieli;
  window.tmTuetutKielet = tmTuetutKielet;
  window.tmRooli = tmRooli;
  window.tmEmailRekisteriKutsu = tmEmailRekisteriKutsu;
  window.tmEmailTervetuloa = tmEmailTervetuloa;
}
if (typeof module !== 'undefined' && module.exports) {
  module.exports = { TM_LANG, t, tmAsetaKieli, tmKieliInitSeura, tmNykyinenKieli, tmTuetutKielet, tmRooli, tmEmailRekisteriKutsu, tmEmailTervetuloa };
}
