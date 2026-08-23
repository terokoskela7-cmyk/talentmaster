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
let _tm_kieli = localStorage.getItem('tm_kieli') || 'fi';

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
  if (tallenna) localStorage.setItem('tm_kieli', _tm_kieli);
  console.log(`[TM Lang] Kieli asetettu: ${_tm_kieli}`);
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
      <a href="${linkki}" style="background:#3EC9A7;color:#000;padding:14px 32px;
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
    <h2 style="color:#3EC9A7;">${k.tervetuloa_otsikko}</h2>
    <p>${kieli === 'sv' ? 'Hej' : kieli === 'en' ? 'Hi' : 'Hei'} ${etunimi || ''},</p>
    <p>${teksti}</p>
    <div style="text-align:center;margin:24px 0;">
      <a href="${resetLinkki}" style="background:#3EC9A7;color:#000;padding:12px 28px;
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
