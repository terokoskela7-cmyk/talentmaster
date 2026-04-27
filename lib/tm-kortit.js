/* ═══════════════════════════════════════════════════════════════════
   TalentMaster — Keräilykortit (Cards)
   
   Pelaaja ansaitsee kortteja tekemällä mikrosyklejä ja viikkoteemoja.
   Kolme korttityyppiä:
   
   1. IDOLIKORTIT (7 + 1 OMA)
      Ansaitaan tekemällä viikko ≥5/7 päivänä aamu+ilta-mikrosyklejä.
      3 tasoa per idoli: Sininen-perus → Hopea (3×) → Kulta (6× + extra)
      → Legenda-skin (kulta + tiesitkö-rotaatio "legenda" 7 päivänä)
      → Suomalainen-skin (kulta + "suomi" 7 päivänä)
      = 7 idolia × 5 versiota = 35 mahdollista korttia
   
   2. SAAVUTUSKORTIT (~15 special)
      Yllätyspalkinnot pitkän aikavälin sitkeydestä, monipuolisuudesta,
      sisukkaasta sitoutumisesta. EI ostettavissa, ei satunnaisia.
   
   3. OMA KORTTI (1 kasvava)
      Pelaajan oma identiteetti. OVR ja statit kasvavat oikeasta
      tekemisestä. Skinit avautuvat saavutusten myötä.
   
   Riippuu: lib/tm-microcycles.js (IDOLIT, NIMIKKO_VIIKOT)
   
   localStorage-avain: 'tm.kortit.v1'
   ═══════════════════════════════════════════════════════════════════ */

(function(root) {
  'use strict';

  var MC = root.TM && root.TM.microcycles;
  if (!MC) {
    console.warn('[tm-kortit] tm-microcycles.js pitää ladata ensin');
  }

  var STORAGE = 'tm.kortit.v1';

  // ═══════════════════════════════════════════════════════════════════
  // KORTTITYYPIT — harvinaisuusasteet
  // ═══════════════════════════════════════════════════════════════════
  var TASOT = {
    sininen:    { koodi: 'sininen',    nimi: 'Nouseva',  vari: '#4A7ED9', glow: 'blue',   harvinaisuus: 1 },
    teal:       { koodi: 'teal',       nimi: 'Lahjakas', vari: '#3EC9A7', glow: 'teal',   harvinaisuus: 2 },
    hopea:      { koodi: 'hopea',      nimi: 'Tähti',    vari: '#B4C8DC', glow: 'silver', harvinaisuus: 3 },
    kulta:      { koodi: 'kulta',      nimi: 'Legenda',  vari: '#F5B700', glow: 'gold',   harvinaisuus: 4 },
    legenda:    { koodi: 'legenda',    nimi: 'Legenda-skin',  vari: '#E5C158', glow: 'gold',   harvinaisuus: 5 },
    suomalainen:{ koodi: 'suomalainen',nimi: 'Suomi-skin',    vari: '#003580', glow: 'blue',   harvinaisuus: 6 } // sini-valk
  };

  // ═══════════════════════════════════════════════════════════════════
  // IDOLIKORTTIEN MÄÄRITTELY
  // 7 idolia × 5 tasoa + OMA-vk8-kortti × 5 tasoa = 40 mahdollista
  //
  // Ansaintaehdot — viikon päätyttyä laskenta:
  //   sininen       :  ≥5/7 aamu+ilta  (1× viikko)
  //   teal          :  ≥6/7 aamu+ilta + ≥4/5 välitunti arkena
  //   hopea         :  3× sama idoliviikko (3 makrosykliä)
  //   kulta         :  6× sama idoliviikko + 1 extra-haaste täytetty
  //   legenda-skin  :  kulta + viikko jolla tiesitkö-painotus = 'legenda'
  //   suomalainen   :  kulta + viikko jolla tiesitkö-painotus = 'suomi'
  //                    HUOM: harvinaisin → kannustaa suomalaiseen identiteettiin
  // ═══════════════════════════════════════════════════════════════════
  function _rakennaIdolikortit() {
    if (!MC || !MC.IDOLIT) return [];
    var kortit = [];
    Object.keys(MC.IDOLIT).forEach(function(koodi) {
      var idoli = MC.IDOLIT[koodi];
      var viikko = MC.NIMIKKO_VIIKOT.find(function(v) { return v.idoli === koodi; });
      ['sininen', 'teal', 'hopea', 'kulta', 'legenda', 'suomalainen'].forEach(function(tasoKoodi, i) {
        if (tasoKoodi === 'teal') return; // teal varattu saavutuskorteille
        kortit.push({
          id: 'idoli.' + koodi + '.' + tasoKoodi,
          tyyppi: 'idoli',
          idoli: koodi,
          taso: tasoKoodi,
          // Näytöllä
          nimi: tasoKoodi === 'legenda' ? idoli.legenda.nimi
              : tasoKoodi === 'suomalainen' ? idoli.suomalainen.nimi
              : idoli.etunimi + ' ' + idoli.sukunimi,
          alaotsikko: tasoKoodi === 'legenda' ? 'Legenda — ' + idoli.legenda.seura
                    : tasoKoodi === 'suomalainen' ? 'Suomalainen — ' + idoli.suomalainen.seura
                    : idoli.seura,
          ydintaito: idoli.ydintaito,
          tagline: idoli.tagline,
          ketju: viikko ? viikko.ketju : null,
          teema: viikko ? viikko.teema : null,
          vk: viikko ? viikko.vk : null,
          ovr: tasoKoodi === 'sininen' ? 78
             : tasoKoodi === 'hopea' ? 84
             : tasoKoodi === 'kulta' ? 90
             : tasoKoodi === 'legenda' ? 93
             : tasoKoodi === 'suomalainen' ? 95 : 78,
          vari: idoli.vari,
          vastavari: idoli.vastavari,
          ehto: _ehtoTeksti('idoli', tasoKoodi, idoli)
        });
      });
    });
    // OMA-kortit (vk8 valinnan kautta) — yksi sininen + yksi kulta
    kortit.push({
      id: 'idoli.OMA.sininen',
      tyyppi: 'idoli', idoli: 'OMA', taso: 'sininen',
      nimi: 'Oma valinta',
      alaotsikko: 'vk8 — Pelaajan signature',
      ydintaito: 'oma_signature',
      tagline: 'Sinun viikko, sinun valinta',
      ketju: null, teema: 'Oma valinta', vk: 8,
      ovr: 80, vari: '#A855F7', vastavari: '#FFFFFF',
      ehto: 'Tee vk8 (Oma valinta) ≥5/7 päivänä yhdellä idolilla'
    });
    kortit.push({
      id: 'idoli.OMA.kulta',
      tyyppi: 'idoli', idoli: 'OMA', taso: 'kulta',
      nimi: 'Oma signature — Mestari',
      alaotsikko: 'vk8 × 3 — Pelaaja-mestari',
      ydintaito: 'oma_signature',
      tagline: 'Olet löytänyt sinun pelin',
      ketju: null, teema: 'Oma valinta', vk: 8,
      ovr: 92, vari: '#A855F7', vastavari: '#FFFFFF',
      ehto: 'Tee vk8 kolme kertaa eri idolilla'
    });
    return kortit;
  }

  function _ehtoTeksti(tyyppi, taso, idoli) {
    var nimi = idoli ? (idoli.etunimi + ' ' + idoli.sukunimi) : '';
    if (taso === 'sininen')     return 'Tee ' + nimi + ' -viikko ≥5/7 päivänä (aamu + ilta)';
    if (taso === 'hopea')       return 'Tee ' + nimi + ' -viikko 3 kertaa';
    if (taso === 'kulta')       return 'Tee ' + nimi + ' -viikko 6 kertaa + extra-haaste';
    if (taso === 'legenda')     return 'Saavuta kulta-' + nimi + ', sitten 7 päivää tiesitkö-tasolla "Legenda"';
    if (taso === 'suomalainen') return 'Saavuta kulta-' + nimi + ', sitten 7 päivää tiesitkö-tasolla "Suomi" — harvinaisin';
    return '';
  }

  // ═══════════════════════════════════════════════════════════════════
  // SAAVUTUSKORTIT — special / yllätyspalkinnot
  // ═══════════════════════════════════════════════════════════════════
  var SAAVUTUKSET = [
    { id: 'saav.aamuvirtaaja',   nimi: 'Aamuvirtaaja',     emoji: '🌅',
      taso: 'teal',  ovr: 82,
      tagline: 'Aamu on voitettu ennen koulua',
      ehto: '30 päivää putkeen aamumikrosyklejä',
      progressi: { tyyppi: 'aamu_putki', tavoite: 30 } },

    { id: 'saav.yovalvoja',      nimi: 'Yövalvoja',        emoji: '🦉',
      taso: 'teal',  ovr: 82,
      tagline: 'Iltarituaali ennen klo 22',
      ehto: '30 päivää putkeen iltarituaaleja klo 22 mennessä',
      progressi: { tyyppi: 'ilta_putki', tavoite: 30 } },

    { id: 'saav.makrosykli',     nimi: 'Makrosykli täysi', emoji: '🔥',
      taso: 'kulta', ovr: 91,
      tagline: '8 viikkoa, 8 idolia, 0 ohitettua',
      ehto: 'Kaikki 8 viikkoa täytetty 5/7+ samalla makrosyklillä',
      progressi: { tyyppi: 'makrosykli_taysi', tavoite: 1 } },

    { id: 'saav.omavalinta',     nimi: 'Oma valinta — Mestari', emoji: '🎯',
      taso: 'hopea', ovr: 88,
      tagline: 'Eri idoli, sama sitoutuminen',
      ehto: 'Tee vk8 kolme kertaa eri idolilla',
      progressi: { tyyppi: 'vk8_eri_idoleita', tavoite: 3 } },

    { id: 'saav.yhdistaja',      nimi: 'Yhdistäjä',         emoji: '👫',
      taso: 'kulta', ovr: 90,
      tagline: 'Kaksi idolia, yksi peli',
      ehto: 'Stage 4–5: yhdistä 2 idolia vk8:lla',
      progressi: { tyyppi: 'vk8_yhdistys', tavoite: 1 } },

    { id: 'saav.kansainvalinen', nimi: 'Kansainvälinen',    emoji: '🌍',
      taso: 'hopea', ovr: 86,
      tagline: 'Nyky, legenda, suomi — kaikki yhdellä viikolla',
      ehto: 'Yhdellä viikolla kaikki 3 tiesitkö-tasoa rotatoituna (ma–ke nyky, to–pe legenda, la–su suomi)',
      progressi: { tyyppi: 'tiesitko_rotaatio', tavoite: 1 } },

    { id: 'saav.sitkeys',        nimi: 'Sitkeys-rekisteri', emoji: '🏥',
      taso: 'kulta', ovr: 92,
      tagline: 'PHV ei pysäyttänyt sinua',
      ehto: 'PHV-tilassa täytä viikko 5/7+',
      progressi: { tyyppi: 'phv_taysi_viikko', tavoite: 1 } },

    { id: 'saav.aikainen',       nimi: 'Aikainen herääjä',  emoji: '⏰',
      taso: 'sininen', ovr: 76,
      tagline: 'Klo 7 mennessä, 7 päivää',
      ehto: 'Tee aamumikrosykli ennen klo 7 — 7 päivänä',
      progressi: { tyyppi: 'aamu_aikainen', tavoite: 7 } },

    { id: 'saav.koulupaiva',     nimi: 'Koulupäivä-pro',    emoji: '🥪',
      taso: 'sininen', ovr: 76,
      tagline: 'Välituntinetti — 20 kertaa',
      ehto: 'Tee 20 välituntimikrosykliä',
      progressi: { tyyppi: 'valitunti', tavoite: 20 } },

    { id: 'saav.viikonloppu',    nimi: 'Viikonloppu-soturi', emoji: '🛡️',
      taso: 'teal',  ovr: 82,
      tagline: 'Lauantai ja sunnuntai — silti tehty',
      ehto: '5 viikonloppua täytettynä putkeen (la + su mikrosyklit)',
      progressi: { tyyppi: 'viikonloppu_putki', tavoite: 5 } },

    { id: 'saav.idolikerho',     nimi: 'Idolikerho',        emoji: '⭐',
      taso: 'hopea', ovr: 86,
      tagline: 'Kaikki 7 idoliviikkoa nähty',
      ehto: 'Saavuta kaikki 7 sininen-tason idolikorttia',
      progressi: { tyyppi: 'idolit_kaikki_sininen', tavoite: 7 } },

    { id: 'saav.kultainen',      nimi: 'Kultainen kausi',   emoji: '👑',
      taso: 'kulta', ovr: 94,
      tagline: 'Kultaa kaikilta idoleilta',
      ehto: 'Saavuta kaikki 7 kulta-tason idolikorttia',
      progressi: { tyyppi: 'idolit_kaikki_kulta', tavoite: 7 } },

    { id: 'saav.suomi',          nimi: 'Sinivalkoinen',     emoji: '🇫🇮',
      taso: 'suomalainen', ovr: 96,
      tagline: 'Suomalainen reitti löydetty',
      ehto: 'Saavuta 3 suomalainen-skin -korttia',
      progressi: { tyyppi: 'idolit_suomalainen', tavoite: 3 } },

    { id: 'saav.menetelma',      nimi: '90-päivän tutkija', emoji: '📚',
      taso: 'teal', ovr: 84,
      tagline: '5BX peruste lapsuudesta — täydellisesti dokumentoitu',
      ehto: '90 päivää aamu+ilta-mikrosyklejä (ei tarvitse putki)',
      progressi: { tyyppi: 'paivia_yhteensa', tavoite: 90 } },

    { id: 'saav.adhd',           nimi: 'Reaktiomestari',    emoji: '⚡',
      taso: 'hopea', ovr: 87,
      tagline: 'Skannaus + reaktio — viikko ilman katoa',
      ehto: 'Bellingham- tai Trent-viikko 5/5 päivänä peräkkäin (ei välipäivää)',
      progressi: { tyyppi: 'skannaus_putki', tavoite: 1 } }
  ].map(function(s) {
    s.tyyppi = 'saavutus';
    var tasoData = TASOT[s.taso] || TASOT.sininen;
    s.vari = tasoData.vari;
    return s;
  });

  // ═══════════════════════════════════════════════════════════════════
  // OMA KORTTI — pelaajan kasvava identiteetti
  // ═══════════════════════════════════════════════════════════════════
  function rakennaOmaKortti(pelaaja, tila) {
    pelaaja = pelaaja || {};
    tila = tila || {};
    var statit = laskeOmatStatit(pelaaja, tila);
    var taso = laskeOmaTaso(statit.OVR);
    var skinit = laskeOmatSkinit(tila);
    return {
      id: 'oma',
      tyyppi: 'oma',
      nimi: pelaaja.etunimi || 'Pelaaja',
      sukunimi: pelaaja.sukunimi || '',
      seura: pelaaja.seura || 'TalentMaster',
      ika: pelaaja.ika || 13,
      pos: pelaaja.pelipaikka || 'KK',
      ovr: statit.OVR,
      stats: statit.stats,
      taso: taso.koodi,
      vari: skinit.vari,
      vastavari: '#FFFFFF',
      tagline: skinit.tagline,
      saavutuksia: tila.ansaitut ? tila.ansaitut.length : 0,
      mikrosyklejaYht: tila.mikrosyklejaYht || 0,
      pisinPutki: tila.pisinPutki || 0
    };
  }

  function laskeOmatStatit(pelaaja, tila) {
    var perus = 60;
    // Jokainen täytetty viikko = +0.5 OVR (max +20 = 40 viikkoa)
    var viikot = (tila.viikkohistoria || []).length;
    var viikkoBonus = Math.min(20, viikot * 0.5);
    // Ansaitut kortit nostavat
    var korttibonus = Math.min(15, (tila.ansaitut || []).length * 0.4);
    var OVR = Math.round(perus + viikkoBonus + korttibonus);

    // Statit ketju-painotuksien mukaan jos saatavilla
    var k = pelaaja.flei_ketjut || {};
    return {
      OVR: OVR,
      stats: [
        { label: 'Tekniikka', arvo: Math.round((k.DIAG || 60) + viikkoBonus * 0.5) },
        { label: 'Liike',     arvo: Math.round(((k.SBL || 0) + (k.SFL || 0)) / 2 + viikkoBonus * 0.4 || 60) },
        { label: 'Sitkeys',   arvo: Math.min(99, 50 + viikot * 1.2 + (tila.pisinPutki || 0) * 0.5) | 0 }
      ]
    };
  }

  function laskeOmaTaso(ovr) {
    if (ovr >= 90) return TASOT.kulta;
    if (ovr >= 80) return TASOT.hopea;
    if (ovr >= 72) return TASOT.teal;
    return TASOT.sininen;
  }

  function laskeOmatSkinit(tila) {
    var ansaitut = tila.ansaitut || [];
    // Onko saavuttanut suomalainen-kortin → suomi-väritys
    if (ansaitut.indexOf('saav.suomi') !== -1) {
      return { vari: '#003580', tagline: 'Sinivalkoinen polku' };
    }
    // Onko kultainen kausi → kulta
    if (ansaitut.indexOf('saav.kultainen') !== -1) {
      return { vari: '#F5B700', tagline: 'Kultainen kausi täytetty' };
    }
    // Onko makrosykli täysi → tagline päivittyy
    if (ansaitut.indexOf('saav.makrosykli') !== -1) {
      return { vari: '#3EC9A7', tagline: '8 viikkoa täynnä' };
    }
    if (ansaitut.length >= 5) {
      return { vari: '#3EC9A7', tagline: 'Kerääjä' };
    }
    if (ansaitut.length >= 1) {
      return { vari: '#4A7ED9', tagline: 'Matka alkanut' };
    }
    return { vari: '#666666', tagline: 'Vasta-alkaja — täytä ensimmäinen viikko' };
  }

  // ═══════════════════════════════════════════════════════════════════
  // TILANHALLINTA — localStorage
  //
  // Rakenne:
  // {
  //   ansaitut: ['idoli.bellingham.sininen', 'saav.aamuvirtaaja', ...],
  //   ansaintapaivat: { 'idoli.bellingham.sininen': '2025-09-21', ... },
  //   viikkohistoria: [
  //     { vk: 36, idoli: 'bellingham', taysiPaivat: 6, valituntiArkena: 4,
  //       tiesitkoPainotus: 'rotaatio', phv: false }
  //   ],
  //   putket: { aamu: 12, ilta: 18, viikonloppu: 2 },
  //   pisinPutki: 18,
  //   mikrosyklejaYht: 142,
  //   omaKorttiSkin: 'auto'
  // }
  // ═══════════════════════════════════════════════════════════════════
  function lataaTila() {
    try {
      var raw = root.localStorage && root.localStorage.getItem(STORAGE);
      if (!raw) return _tyhjaTila();
      var t = JSON.parse(raw);
      return Object.assign(_tyhjaTila(), t);
    } catch (e) {
      return _tyhjaTila();
    }
  }

  function tallennaTila(tila) {
    try {
      if (root.localStorage) root.localStorage.setItem(STORAGE, JSON.stringify(tila));
    } catch (e) {}
  }

  function _tyhjaTila() {
    return {
      ansaitut: [],
      ansaintapaivat: {},
      viikkohistoria: [],
      putket: { aamu: 0, ilta: 0, viikonloppu: 0, aamu_aikainen: 0 },
      pisinPutki: 0,
      mikrosyklejaYht: 0,
      valituntejaYht: 0,
      omaKorttiSkin: 'auto'
    };
  }

  // ═══════════════════════════════════════════════════════════════════
  // ANSAINTALOGIIKKA — kutsutaan kun viikko valmistuu tai mikrosykli tehty
  // ═══════════════════════════════════════════════════════════════════
  
  // Päivitä viikon päätyttyä — palauttaa uudet ansaitut kortit
  function paataViikko(viikkoData) {
    // viikkoData = { vk, idoli, taysiPaivat, valituntiArkena, tiesitkoPainotus, phv }
    var tila = lataaTila();
    var uudet = [];

    // Kirjaa viikko
    tila.viikkohistoria.push(viikkoData);

    // Tarkasta idolikorttien saavuttaminen
    if (viikkoData.taysiPaivat >= 5 && viikkoData.idoli && viikkoData.idoli !== 'OMA') {
      // Sininen
      var sininenId = 'idoli.' + viikkoData.idoli + '.sininen';
      if (tila.ansaitut.indexOf(sininenId) === -1) {
        _ansaitse(tila, sininenId);
        uudet.push(sininenId);
      }

      // Laske kuinka monta kertaa tämä idoli on tehty
      var sammaIdoliKerrat = tila.viikkohistoria.filter(function(v) {
        return v.idoli === viikkoData.idoli && v.taysiPaivat >= 5;
      }).length;

      // Hopea — 3 kertaa
      if (sammaIdoliKerrat >= 3) {
        var hopeaId = 'idoli.' + viikkoData.idoli + '.hopea';
        if (tila.ansaitut.indexOf(hopeaId) === -1) {
          _ansaitse(tila, hopeaId);
          uudet.push(hopeaId);
        }
      }

      // Kulta — 6 kertaa + 7/7 viikko
      var taydellinenViikko = sammaIdoliKerrat >= 6 && viikkoData.taysiPaivat === 7;
      if (taydellinenViikko) {
        var kultaId = 'idoli.' + viikkoData.idoli + '.kulta';
        if (tila.ansaitut.indexOf(kultaId) === -1) {
          _ansaitse(tila, kultaId);
          uudet.push(kultaId);
        }
      }

      // Legenda-skin — kulta + tiesitkö='legenda' 7 päivää
      var onKulta = tila.ansaitut.indexOf('idoli.' + viikkoData.idoli + '.kulta') !== -1;
      if (onKulta && viikkoData.tiesitkoPainotus === 'legenda' && viikkoData.taysiPaivat === 7) {
        var legId = 'idoli.' + viikkoData.idoli + '.legenda';
        if (tila.ansaitut.indexOf(legId) === -1) {
          _ansaitse(tila, legId);
          uudet.push(legId);
        }
      }

      // Suomalainen-skin — kulta + tiesitkö='suomi' 7 päivää (HARVINAISIN)
      if (onKulta && viikkoData.tiesitkoPainotus === 'suomi' && viikkoData.taysiPaivat === 7) {
        var suoId = 'idoli.' + viikkoData.idoli + '.suomalainen';
        if (tila.ansaitut.indexOf(suoId) === -1) {
          _ansaitse(tila, suoId);
          uudet.push(suoId);
        }
      }
    }

    // OMA-kortti vk8
    if (viikkoData.idoli === 'OMA' && viikkoData.taysiPaivat >= 5) {
      var omaSinId = 'idoli.OMA.sininen';
      if (tila.ansaitut.indexOf(omaSinId) === -1) {
        _ansaitse(tila, omaSinId);
        uudet.push(omaSinId);
      }
    }

    // Tarkasta kaikki saavutuskortit
    SAAVUTUKSET.forEach(function(s) {
      if (tila.ansaitut.indexOf(s.id) !== -1) return;
      if (_saavutusTayttyy(s, tila)) {
        _ansaitse(tila, s.id);
        uudet.push(s.id);
      }
    });

    tallennaTila(tila);
    return { tila: tila, uudet: uudet };
  }

  // Päivittäinen mikrosyklin kuittaus — putket ja yhteenlaskut
  function kuittaaMikrosykli(tyyppi, optiot) {
    optiot = optiot || {};
    var tila = lataaTila();
    var paiva = optiot.paiva || _tanaanISO();
    var aikaTunti = optiot.aikaTunti != null ? optiot.aikaTunti : new Date().getHours();
    var uudet = [];

    tila.mikrosyklejaYht++;

    if (tyyppi === 'aamu') {
      // Onko jatkoa edelliselle päivälle?
      var eilen = _eilenISO(paiva);
      if (tila.putket.aamu_paiva === eilen || tila.putket.aamu_paiva === paiva) {
        if (tila.putket.aamu_paiva !== paiva) tila.putket.aamu++;
      } else {
        tila.putket.aamu = 1;
      }
      tila.putket.aamu_paiva = paiva;

      if (aikaTunti < 7) {
        if (tila.putket.aamu_aikainen_paiva === eilen || tila.putket.aamu_aikainen_paiva === paiva) {
          if (tila.putket.aamu_aikainen_paiva !== paiva) tila.putket.aamu_aikainen++;
        } else {
          tila.putket.aamu_aikainen = 1;
        }
        tila.putket.aamu_aikainen_paiva = paiva;
      }
    }
    else if (tyyppi === 'ilta') {
      var eilenI = _eilenISO(paiva);
      if (tila.putket.ilta_paiva === eilenI || tila.putket.ilta_paiva === paiva) {
        if (tila.putket.ilta_paiva !== paiva) tila.putket.ilta++;
      } else {
        tila.putket.ilta = 1;
      }
      tila.putket.ilta_paiva = paiva;
    }
    else if (tyyppi === 'valitunti') {
      tila.valituntejaYht++;
    }

    // Päivitä pisin putki
    tila.pisinPutki = Math.max(tila.pisinPutki, tila.putket.aamu, tila.putket.ilta);

    // Tarkasta saavutuksia jotka eivät vaadi viikkoa
    SAAVUTUKSET.forEach(function(s) {
      if (tila.ansaitut.indexOf(s.id) !== -1) return;
      if (_saavutusTayttyy(s, tila)) {
        _ansaitse(tila, s.id);
        uudet.push(s.id);
      }
    });

    tallennaTila(tila);
    return { tila: tila, uudet: uudet };
  }

  function _saavutusTayttyy(s, tila) {
    var p = s.progressi || {};
    switch (p.tyyppi) {
      case 'aamu_putki':       return tila.putket.aamu >= p.tavoite;
      case 'ilta_putki':       return tila.putket.ilta >= p.tavoite;
      case 'aamu_aikainen':    return tila.putket.aamu_aikainen >= p.tavoite;
      case 'valitunti':        return tila.valituntejaYht >= p.tavoite;
      case 'paivia_yhteensa':  return Math.floor(tila.mikrosyklejaYht / 2) >= p.tavoite; // ~aamu+ilta = 1 päivä
      case 'makrosykli_taysi':
        return _onMakrosykliTaysi(tila);
      case 'idolit_kaikki_sininen':
        return _idolitTasolla(tila, 'sininen') >= p.tavoite;
      case 'idolit_kaikki_kulta':
        return _idolitTasolla(tila, 'kulta') >= p.tavoite;
      case 'idolit_suomalainen':
        return _idolitTasolla(tila, 'suomalainen') >= p.tavoite;
      case 'vk8_eri_idoleita':
        var vk8viikot = tila.viikkohistoria.filter(function(v) { return v.idoli === 'OMA' && v.taysiPaivat >= 5; });
        var eriIdoleita = {};
        vk8viikot.forEach(function(v) { if (v.omaIdoli) eriIdoleita[v.omaIdoli] = true; });
        return Object.keys(eriIdoleita).length >= p.tavoite;
      case 'vk8_yhdistys':
        return tila.viikkohistoria.some(function(v) { return v.idoli === 'OMA' && v.yhdistetty && v.taysiPaivat >= 5; });
      case 'tiesitko_rotaatio':
        return tila.viikkohistoria.some(function(v) { return v.tiesitkoPainotus === 'rotaatio' && v.taysiPaivat >= 5; });
      case 'phv_taysi_viikko':
        return tila.viikkohistoria.some(function(v) { return v.phv && v.taysiPaivat >= 5; });
      case 'viikonloppu_putki':
        return _viikonloppuPutki(tila) >= p.tavoite;
      case 'skannaus_putki':
        return tila.viikkohistoria.some(function(v) {
          return (v.idoli === 'bellingham' || v.idoli === 'trent') && v.taysiPaivatPutki >= 5;
        });
      default:
        return false;
    }
  }

  function _idolitTasolla(tila, taso) {
    return tila.ansaitut.filter(function(id) {
      return id.indexOf('idoli.') === 0 && id.indexOf('.OMA.') === -1 && id.lastIndexOf('.' + taso) === id.length - taso.length - 1;
    }).length;
  }

  function _onMakrosykliTaysi(tila) {
    // Etsi 8 peräkkäistä viikkoa joissa kaikissa taysiPaivat >= 5
    if (!tila.viikkohistoria || tila.viikkohistoria.length < 8) return false;
    var jarjestetty = tila.viikkohistoria.slice().sort(function(a, b) { return a.vk - b.vk; });
    for (var i = 0; i <= jarjestetty.length - 8; i++) {
      var taysi = true;
      for (var j = 0; j < 8; j++) {
        var v = jarjestetty[i + j];
        if (v.taysiPaivat < 5) { taysi = false; break; }
        if (j > 0 && v.vk !== jarjestetty[i + j - 1].vk + 1) { taysi = false; break; }
      }
      if (taysi) return true;
    }
    return false;
  }

  function _viikonloppuPutki(tila) {
    var p = 0, max = 0;
    tila.viikkohistoria.forEach(function(v) {
      if (v.viikonloppuTaynna) { p++; max = Math.max(max, p); } else { p = 0; }
    });
    return max;
  }

  function _ansaitse(tila, korttiId) {
    tila.ansaitut.push(korttiId);
    tila.ansaintapaivat[korttiId] = _tanaanISO();
  }

  function _tanaanISO() { return new Date().toISOString().slice(0, 10); }
  function _eilenISO(paiva) {
    var d = new Date(paiva);
    d.setDate(d.getDate() - 1);
    return d.toISOString().slice(0, 10);
  }

  // ═══════════════════════════════════════════════════════════════════
  // KYSELYT — UI-näkymä käyttää
  // ═══════════════════════════════════════════════════════════════════
  function haeKaikkiKortit() {
    return _rakennaIdolikortit().concat(SAAVUTUKSET);
  }

  function haeKortti(id) {
    return haeKaikkiKortit().find(function(k) { return k.id === id; });
  }

  function haeAlbumi(pelaaja) {
    var tila = lataaTila();
    var kaikki = haeKaikkiKortit();
    var oma = rakennaOmaKortti(pelaaja, tila);
    return {
      oma: oma,
      idolikortit: kaikki.filter(function(k) { return k.tyyppi === 'idoli'; }).map(function(k) {
        k.ansaittu = tila.ansaitut.indexOf(k.id) !== -1;
        k.ansaintapaiva = tila.ansaintapaivat[k.id] || null;
        return k;
      }),
      saavutukset: kaikki.filter(function(k) { return k.tyyppi === 'saavutus'; }).map(function(k) {
        k.ansaittu = tila.ansaitut.indexOf(k.id) !== -1;
        k.ansaintapaiva = tila.ansaintapaivat[k.id] || null;
        k.edistys = _laskeEdistys(k, tila);
        return k;
      }),
      yhteenveto: {
        ansaittuja: tila.ansaitut.length,
        kaikki: kaikki.length + 1, // +oma
        idoleita: tila.ansaitut.filter(function(id) { return id.indexOf('idoli.') === 0; }).length,
        saavutuksia: tila.ansaitut.filter(function(id) { return id.indexOf('saav.') === 0; }).length,
        pisinPutki: tila.pisinPutki,
        mikrosyklejaYht: tila.mikrosyklejaYht
      }
    };
  }

  function _laskeEdistys(s, tila) {
    var p = s.progressi || {};
    var arvo = 0;
    switch (p.tyyppi) {
      case 'aamu_putki':       arvo = tila.putket.aamu; break;
      case 'ilta_putki':       arvo = tila.putket.ilta; break;
      case 'aamu_aikainen':    arvo = tila.putket.aamu_aikainen; break;
      case 'valitunti':        arvo = tila.valituntejaYht; break;
      case 'paivia_yhteensa':  arvo = Math.floor(tila.mikrosyklejaYht / 2); break;
      case 'idolit_kaikki_sininen': arvo = _idolitTasolla(tila, 'sininen'); break;
      case 'idolit_kaikki_kulta':   arvo = _idolitTasolla(tila, 'kulta'); break;
      case 'idolit_suomalainen':    arvo = _idolitTasolla(tila, 'suomalainen'); break;
      case 'viikonloppu_putki':     arvo = _viikonloppuPutki(tila); break;
      default: arvo = 0;
    }
    return { arvo: arvo, tavoite: p.tavoite || 1, prosentti: Math.min(100, Math.round((arvo / (p.tavoite || 1)) * 100)) };
  }

  // ═══════════════════════════════════════════════════════════════════
  // DEMO/TEST — täytä testitila simuloituun pisteeseen
  // ═══════════════════════════════════════════════════════════════════
  function _testitayte() {
    var tila = _tyhjaTila();
    tila.viikkohistoria = [
      { vk: 36, idoli: 'bellingham', taysiPaivat: 6, valituntiArkena: 5, tiesitkoPainotus: 'rotaatio', phv: false },
      { vk: 37, idoli: 'pedri',      taysiPaivat: 7, valituntiArkena: 5, tiesitkoPainotus: 'nyky',     phv: false },
      { vk: 38, idoli: 'vinicius',   taysiPaivat: 5, valituntiArkena: 4, tiesitkoPainotus: 'nyky',     phv: false },
      { vk: 39, idoli: 'yamal',      taysiPaivat: 6, valituntiArkena: 5, tiesitkoPainotus: 'legenda', phv: false }
    ];
    tila.putket.aamu = 14;
    tila.putket.ilta = 21;
    tila.putket.aamu_aikainen = 8;
    tila.pisinPutki = 21;
    tila.mikrosyklejaYht = 60;
    tila.valituntejaYht = 22;
    // Aja viikkojen läpi simuloimaan ansaintaa
    tila.viikkohistoria.forEach(function(v) {
      if (v.taysiPaivat >= 5) {
        var id = 'idoli.' + v.idoli + '.sininen';
        if (tila.ansaitut.indexOf(id) === -1) {
          tila.ansaitut.push(id);
          tila.ansaintapaivat[id] = _tanaanISO();
        }
      }
    });
    // Jotkin saavutukset
    SAAVUTUKSET.forEach(function(s) {
      if (_saavutusTayttyy(s, tila) && tila.ansaitut.indexOf(s.id) === -1) {
        tila.ansaitut.push(s.id);
        tila.ansaintapaivat[s.id] = _tanaanISO();
      }
    });
    tallennaTila(tila);
    return tila;
  }

  function _tyhjenna() {
    try { root.localStorage && root.localStorage.removeItem(STORAGE); } catch (e) {}
  }

  // ═══════════════════════════════════════════════════════════════════
  // EXPORTIT
  // ═══════════════════════════════════════════════════════════════════
  var TM = root.TM || (root.TM = {});
  TM.kortit = {
    TASOT: TASOT,
    SAAVUTUKSET: SAAVUTUKSET,
    haeKaikkiKortit: haeKaikkiKortit,
    haeKortti: haeKortti,
    haeAlbumi: haeAlbumi,
    rakennaOmaKortti: rakennaOmaKortti,
    paataViikko: paataViikko,
    kuittaaMikrosykli: kuittaaMikrosykli,
    lataaTila: lataaTila,
    tallennaTila: tallennaTila,
    _testitayte: _testitayte,
    _tyhjenna: _tyhjenna,
    VERSIO: '1.0.0'
  };

})(typeof window !== 'undefined' ? window : this);
