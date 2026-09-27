/* ════════════════════════════════════════════════════════════════════════
   tm_arviointi_historia.js — Arviointihistoria + useampi arvioija (H1, PURE).
   Brief: docs/CODE_BRIEF_ARVIOINTI_HISTORIA_MONIARVIOIJA.md

   Periaatteet joita nämä funktiot toteuttavat (brief §1):
   - Append-only: kerta on arvioijan oma tapahtuma; mitään ei korvata.
   - Hajonta lasketaan KUNKIN ARVIOIJAN VIIMEISIMMÄSTÄ arvosta liukuvassa 12 kk
     ikkunassa — ei kausirajalla (kausi vaihtuisi kesken ja vertailu tyhjenisi).
   - "Ero ei ole virhe": hajonta kertoo keskustelunaiheen (≥ 1,5, sama raja kuin
     D3-kalibraatio), EI oikeaa arvoa.
   - Puuttuva avain = EI NÄHTY. 'NA' = EI SOVELLU. Kumpikaan ei laske trendiin,
     mutta vain 'NA' on näytettävä tieto.
   EI Firestorea, EI DOM:ia, EI kirjoitusta. Dual-export: module.exports || window.
════════════════════════════════════════════════════════════════════════ */
(function (root) {
  'use strict';

  var ERO_KESKUSTELUNAIHE = 1.5;     // sama raja kuin D3-kalibraatio (brief §1.5)
  var IKKUNA_PV = 365;               // liukuva 12 kk (brief §2.2)
  var TRENDI_MIN_KERTAA = 3;         // ohut otos -portti (brief §4.1)
  var TRENDI_MIN_JAKSOA = 2;
  var AIKAERO_PV = 60;               // "miksi erot" -tekijä (brief §4.2)

  var AIKAVYOHYKE = 'Europe/Helsinki';

  /* Paikallinen kalenteripäivä. UTC:llä Suomessa klo 00–03 tehty arvio olisi mennyt edelliselle
     päivälle (ja 1.1. yöllä edelliselle kaudelle) — kerta-id ja kausi ovat molemmat päiväsidottuja,
     joten ero näkyisi käyttäjälle väärinä kertoina. (review 7) */
  function _paikallinenPvm(ms, aikavyohyke) {
    try {
      var f = new Intl.DateTimeFormat('sv-SE', {
        timeZone: aikavyohyke || AIKAVYOHYKE, year: 'numeric', month: '2-digit', day: '2-digit',
      });
      return f.format(new Date(ms));   // sv-SE → 'YYYY-MM-DD'
    } catch (e) {
      return new Date(ms).toISOString().slice(0, 10);   // graceful: ympäristö ilman Intl-tz-dataa
    }
  }

  function _ms(pvm) {
    if (pvm == null) return NaN;
    if (typeof pvm === 'number') return pvm;
    var t = Date.parse(String(pvm));
    return isNaN(t) ? NaN : t;
  }

  /** Numeerinen arvo vai ei: 'NA' ja puuttuva eivät laske (brief §8). */
  function _luku(v) {
    return (typeof v === 'number' && isFinite(v)) ? v : null;
  }

  function _kohdeArvo(kerta, avain) {
    var k = kerta && kerta.kohteet && kerta.kohteet[avain];
    return k ? _luku(k.arvo) : null;
  }

  function _mediaani(arvot) {
    if (!arvot || !arvot.length) return null;
    var s = arvot.slice().sort(function (a, b) { return a - b; });
    var m = Math.floor(s.length / 2);
    return (s.length % 2) ? s[m] : Math.round((s[m - 1] + s[m]) / 2 * 100) / 100;
  }

  /* ── KAUSI ───────────────────────────────────────────────────────────────
     Suomi = kalenterivuosi (Tero 27.9.2026). Eurooppalainen heinä–kesä on eri
     sykli, joten malli on seurakohtainen eikä kovakoodattu. */
  function tmKausi(pvm, kausimalli, aikavyohyke) {
    var t = _ms(pvm);
    if (isNaN(t)) return null;
    var osat = _paikallinenPvm(t, aikavyohyke).split('-');
    var y = parseInt(osat[0], 10), kk = parseInt(osat[1], 10);   // 1–12
    if (String(kausimalli || 'kalenteri') !== 'heina_kesa') return String(y);
    var alku = (kk >= 7) ? y : (y - 1);   // heinäkuu aloittaa kauden
    return String(alku) + '-' + String((alku + 1) % 100).padStart(2, '0');
  }

  /** Kausimalli seuran konfiguraatiosta; puuttuu → maasta (FI → kalenteri). */
  function tmKausimalli(seura) {
    if (seura && seura.kausimalli) return String(seura.kausimalli);
    var maa = String((seura && seura.maa) || 'FI').toUpperCase();
    return (maa === 'FI' || maa === 'FIN') ? 'kalenteri' : 'heina_kesa';
  }

  /** Puolivuotisjakso: kevät (tammi–kesä) · syksy (heinä–joulu). */
  function tmAhJakso(pvm, aikavyohyke) {
    var t = _ms(pvm);
    if (isNaN(t)) return null;
    var osat = _paikallinenPvm(t, aikavyohyke).split('-');
    return osat[0] + (parseInt(osat[1], 10) >= 7 ? '-S' : '-K');
  }

  /* ── KERRAN TUNNISTE ─────────────────────────────────────────────────────
     Sama arvioija + sama päivä + sama konteksti = SAMA kerta (kohteet kertyvät
     samaan dociin). Eri arvioija tai eri päivä = ERI kerta — tämä on se
     invariantti, joka esti vanhaa mallia hukkaamasta toisen arvioijan arvion. */
  function tmAhKertaId(pvm, arvioijaUid, kontekstiTyyppi, erotin) {
    var t = _ms(pvm);
    var pv = isNaN(t) ? 'tuntematon' : _paikallinenPvm(t);
    var u = String(arvioijaUid || 'tuntematon').replace(/[^\w-]/g, '_');
    var k = String(kontekstiTyyppi || 'kooste').replace(/[^\w-]/g, '_');
    /* Turnauspäivänä kaksi ottelua samalla kontekstityypillä olisi mennyt SAMAAN kertaan, ja
       jälkimmäisen konteksti olisi ylikirjoittanut ensimmäisen (review 7). Erotin = ottelun
       tunniste tai kuvaus, kun sellainen on annettu. */
    var e = erotin ? String(erotin).trim().toLowerCase().replace(/[^\w-]/g, '_').slice(0, 24) : '';
    return pv + '_' + u + '_' + k + (e ? '_' + e : '');
  }

  /* ── KERRAN PAYLOAD (jaettu sovelluksen ja Rules-testin kesken) ─────────
     Review-löydös 1: sovellus lähetti `luotu`-kentän JOKAISELLA kirjoituksella, ja Rules
     vaatii updatessa `request.resource.data.luotu == resource.data.luotu` → 2. klikkaus
     samaan kertaan hylättiin. Testit eivät nähneet sitä, koska kirjoitustesti käytti tynkää
     ja Rules-testi omaa payloadiaan. Siksi payload rakennetaan NYT yhdessä paikassa:
     `luotu` EI kuulu siihen (sen lisää vain luontipolku), ja Rules-testi käyttää samaa
     funktiota kuin sovellus — ne eivät voi enää erkaantua. */
  function tmAhKertaPayload(s) {
    var a = (s && s.arvioija) || {};
    var k = (s && s.konteksti) || {};
    var out = {
      kehys: s.kehys || 'palloliitto',
      kausi: s.kausi || null,
      pvm: s.pvm || null,
      palloId: s.palloId || null,
      seuraId_arviohetkella: s.seuraId || null,
      nakyvyys: (s.nakyvyys === 'sisainen') ? 'sisainen' : 'seuralle',
      arvioija_uid: a.uid || null,
      arvioija_nimi: a.nimi || null,
      arvioija_rooli: a.rooli || null,
      arvioija_org: (a.org === 'palloliitto') ? 'palloliitto' : 'seura',
      konteksti: {
        tyyppi: k.tyyppi || 'kooste', kuvaus: k.kuvaus || null,
        taso_ottelu_id: k.taso_ottelu_id || null, pelipaikka: k.pelipaikka || null,
        minuutit: (k.minuutit == null ? null : k.minuutit),
        vastustajataso: k.vastustajataso || null,
      },
      kohteet: s.kohteet || {},
      paivitetty: s.aikaleima != null ? s.aikaleima : null,
    };
    /* Review D: `potentiaali: null` merge-setissä YLIKIRJOITTI saman kerran aiemmin
       tallennetun potentiaalin jokaisella kohdeklikkauksella. Kenttä kirjoitetaan vain
       kun sille on arvo; sama koskee tilannekuvaa (ei tyhjennetä jälkikäteen). */
    if (s.tilannekuva) out.tilannekuva = s.tilannekuva;
    if (s.potentiaali) out.potentiaali = s.potentiaali;
    return out;
  }

  /** Vain seuralle jaetut kerrat (pikakentät/kooste, brief §2.2). */
  function tmAhSeuralle(kerrat) {
    return (kerrat || []).filter(function (k) { return k && k.nakyvyys !== 'sisainen'; });
  }

  /** Vain seuran omien arvioijien kerrat — IDP-silta ei saa kääntyä ulkopuolisesta arviosta. */
  function tmAhSeuranOmat(kerrat) {
    return (kerrat || []).filter(function (k) { return k && k.arvioija_org !== 'palloliitto'; });
  }

  /* ── VIIMEISIMMÄT PER ARVIOIJA (liukuva ikkuna) ─────────────────────────── */
  function tmAhViimeisimmat(kerrat, nytMs, ikkunaPv) {
    var raja = (nytMs == null ? Date.now() : nytMs) - (ikkunaPv == null ? IKKUNA_PV : ikkunaPv) * 86400000;
    var out = {};
    (kerrat || []).forEach(function (k) {
      var t = _ms(k && k.pvm);
      if (isNaN(t) || t < raja) return;
      var uid = String((k && k.arvioija_uid) || '');
      if (!uid) return;
      var edellinen = out[uid];
      if (!edellinen || _ms(edellinen.pvm) < t) out[uid] = k;
    });
    return out;
  }

  /* ── VIIMEISIN PER KOHDE ─────────────────────────────────────────────────
     Review-löydös 2: klikkaa-ja-tallentuu -mallissa kerta sisältää VAIN sillä kerralla
     arvioidut kohteet (puuttuva = ei nähty). Jos katsotaan vain arvioijan viimeisintä
     KERTAA, hänen aiempi arvionsa toisesta kohteesta katoaa — ja juuri se hävitti
     arvioijien välisen eron, joka on koko näkymän tarkoitus. Siksi haetaan kunkin
     arvioijan uusin merkintä TÄLLE KOHTEELLE 12 kk ikkunassa.
     'NA' (ei sovellu) tuoreimpana → arvioija jää pois tästä kohteesta. */
  function tmAhViimeisinPerKohde(kerrat, avain, nytMs, ikkunaPv) {
    var raja = (nytMs == null ? Date.now() : nytMs) - (ikkunaPv == null ? IKKUNA_PV : ikkunaPv) * 86400000;
    var paras = {};
    (kerrat || []).forEach(function (k) {
      var kohde = k && k.kohteet && k.kohteet[avain];
      if (!kohde || kohde.arvo == null) return;      // puuttuva = ei nähty
      var ms = _ms(k.pvm);
      if (isNaN(ms) || ms < raja) return;
      var uid = String((k && k.arvioija_uid) || '');
      if (!uid) return;
      if (!paras[uid] || paras[uid].ms < ms) paras[uid] = { ms: ms, arvo: _luku(kohde.arvo), kerta: k };
    });
    var out = {};
    Object.keys(paras).forEach(function (uid) {
      if (paras[uid].arvo != null) out[uid] = paras[uid];   // 'NA' tuoreimpana → pois
    });
    return out;
  }

  /* ── HAJONTA (yksi kohde) ────────────────────────────────────────────────
     Ottaa vastaan joko tmAhViimeisinPerKohde-tuloksen (suositeltu) tai vanhan
     kerta-per-arvioija -kartan; kumpikin luetaan samalla tavalla. */
  function tmAhHajonta(viimeisimmat, avain) {
    var arvot = [];
    Object.keys(viimeisimmat || {}).forEach(function (uid) {
      var rivi = viimeisimmat[uid];
      var v = (rivi && typeof rivi.arvo === 'number') ? rivi.arvo : _kohdeArvo(rivi && rivi.kerta ? rivi.kerta : rivi, avain);
      if (v != null) arvot.push(v);
    });
    if (!arvot.length) return { n: 0, arvioijia: 0, min: null, max: null, ero: null, mediaani: null, keskustelunaihe: false };
    var min = Math.min.apply(null, arvot), max = Math.max.apply(null, arvot);
    var ero = Math.round((max - min) * 100) / 100;
    return {
      n: arvot.length, arvioijia: arvot.length, min: min, max: max, ero: ero,
      mediaani: _mediaani(arvot),
      keskustelunaihe: ero >= ERO_KESKUSTELUNAIHE,
    };
  }

  /* ── SARJA + PUOLIVUOTISMEDIAANIT (trendikaavio) ─────────────────────── */
  function tmAhSarja(kerrat, avain) {
    var pisteet = [];
    (kerrat || []).forEach(function (k) {
      var v = _kohdeArvo(k, avain);
      if (v == null) return;
      var t = _ms(k.pvm);
      if (isNaN(t)) return;
      pisteet.push({ pvm: k.pvm, ms: t, arvo: v, arvioija_uid: k.arvioija_uid || null, jakso: tmAhJakso(k.pvm) });
    });
    pisteet.sort(function (a, b) { return a.ms - b.ms; });
    var ryhmat = {}, jarjestys = [];
    pisteet.forEach(function (p) {
      if (!ryhmat[p.jakso]) { ryhmat[p.jakso] = []; jarjestys.push(p.jakso); }
      ryhmat[p.jakso].push(p.arvo);
    });
    var mediaanit = jarjestys.map(function (j) {
      return { jakso: j, mediaani: _mediaani(ryhmat[j]), n: ryhmat[j].length };
    });
    return { pisteet: pisteet, mediaanit: mediaanit };
  }

  /* ── TRENDI ──────────────────────────────────────────────────────────────
     Ohut otos -portti: < 3 kertaa TAI < 2 jaksoa → ei trendiä (ei ennustetta,
     ei regressiota). Muutos = ensimmäisen ja viimeisen jaksomediaanin erotus.
     §1.4: tasainen 3 = kehittyy ikätovereiden tahtia — tulkinta kuuluu UI:hin. */
  function tmAhTrendi(kerrat, avain) {
    var s = tmAhSarja(kerrat, avain);
    var n = s.pisteet.length, jaksoja = s.mediaanit.length;
    var ohut = (n < TRENDI_MIN_KERTAA) || (jaksoja < TRENDI_MIN_JAKSOA);
    var eka = jaksoja ? s.mediaanit[0].mediaani : null;
    var vika = jaksoja ? s.mediaanit[jaksoja - 1].mediaani : null;
    return {
      ohut: ohut, n: n, jaksoja: jaksoja, eka: eka, vika: vika,
      d: (ohut || eka == null || vika == null) ? null : Math.round((vika - eka) * 100) / 100,
      mediaanit: s.mediaanit, pisteet: s.pisteet,
    };
  }

  /* ── KOOSTE (pikakenttä, sama funktio CF:ssä ja clientissä) ─────────────── */
  function tmAhKooste(kerrat, nytMs) {
    var raja = (nytMs == null ? Date.now() : nytMs) - IKKUNA_PV * 86400000;
    var avaimet = {};
    (kerrat || []).forEach(function (k) {
      var ms = _ms(k && k.pvm);
      if (isNaN(ms) || ms < raja) return;
      Object.keys((k && k.kohteet) || {}).forEach(function (a) { avaimet[a] = true; });
    });
    var out = {};
    Object.keys(avaimet).forEach(function (avain) {
      var viim = tmAhViimeisinPerKohde(kerrat, avain, nytMs);
      var h = tmAhHajonta(viim, avain);
      if (!h.n) return;
      var uusin = null, uusinMs = -Infinity;
      Object.keys(viim).forEach(function (uid) {
        if (viim[uid].ms > uusinMs) { uusinMs = viim[uid].ms; uusin = { arvo: viim[uid].arvo, pvm: viim[uid].kerta.pvm }; }
      });
      out[avain] = {
        viimeisin: uusin ? uusin.arvo : null,
        mediaani: h.mediaani, n: h.n, arvioijia: h.arvioijia,
        min: h.min, max: h.max, ero: h.ero, keskustelunaihe: h.keskustelunaihe,
        pvm: uusin ? uusin.pvm : null,
      };
    });
    return out;
  }

  /* ── "MIKSI ARVIOT EROAVAT?" ─────────────────────────────────────────────
     Sääntöpohjainen ja johdettu VAIN tallennetuista kentistä. Ei AI:ta, ei
     päätelmää siitä kuka on oikeassa (brief §4.2). Tekijä syntyy vain kun
     kenttä on molemmilla — puuttuva tieto ei ole ero. */
  function tmAhKontekstierot(kerrat, avain) {
    var viim = tmAhViimeisinPerKohde(kerrat, avain, arguments.length > 2 ? arguments[2] : null);
    var mukana = Object.keys(viim).map(function (uid) { return viim[uid].kerta; });
    if (mukana.length < 2) return [];
    var out = [];
    var arvot = function (haku) {
      var s = {};
      mukana.forEach(function (k) { var v = haku(k); if (v != null && v !== '') s[String(v)] = true; });
      return Object.keys(s);
    };
    var kaikillaOn = function (haku) {
      return mukana.every(function (k) { var v = haku(k); return v != null && v !== ''; });
    };

    var pelipaikka = function (k) { return k.konteksti && k.konteksti.pelipaikka; };
    if (kaikillaOn(pelipaikka) && arvot(pelipaikka).length > 1) {
      out.push({ tekija: 'pelipaikka', teksti: 'Eri pelipaikka: ' + arvot(pelipaikka).join(' · ') });
    }
    var vastustaja = function (k) { return k.konteksti && k.konteksti.vastustajataso; };
    if (kaikillaOn(vastustaja) && arvot(vastustaja).length > 1) {
      out.push({ tekija: 'vastustajataso', teksti: 'Eri vastustajataso: ' + arvot(vastustaja).join(' · ') });
    }
    var tilanne = function (k) { return k.konteksti && k.konteksti.tyyppi; };
    if (kaikillaOn(tilanne) && arvot(tilanne).length > 1) {
      out.push({ tekija: 'tilanne', teksti: 'Eri tilanne: ' + arvot(tilanne).join(' · ') });
    }
    var ajat = mukana.map(function (k) { return _ms(k.pvm); }).filter(function (t) { return !isNaN(t); });
    if (ajat.length === mukana.length) {
      var ero = Math.round((Math.max.apply(null, ajat) - Math.min.apply(null, ajat)) / 86400000);
      if (ero > AIKAERO_PV) out.push({ tekija: 'aikaero', teksti: 'Arviot ' + ero + ' päivän välein' });
    }
    var naytto = function (k) { return k.naytto && k.naytto.merkintoja; };
    if (kaikillaOn(naytto) && arvot(naytto).length > 1) {
      var maarat = mukana.map(function (k) { return k.naytto.merkintoja; });
      out.push({ tekija: 'naytto', teksti: 'Eri määrä näyttöä: ' + Math.min.apply(null, maarat) + '–' + Math.max.apply(null, maarat) + ' merkintää' });
    }
    // §28: kasvupyrähdyksen lähellä havaittu fyysisyys luetaan kehitysvaihetta vasten
    var herkka = mukana.filter(function (k) {
      var t = k.tilannekuva && k.tilannekuva.phv_tila;
      return t === 'LAH' || t === 'PH';
    });
    if (herkka.length) {
      out.push({ tekija: 'kypsyys', teksti: 'Kasvupyrähdys käynnissä tai lähellä — fyysinen ja kontaktipeli luetaan kehitysvaihetta vasten' });
    }
    return out;
  }

  /* Potentiaali: arvioijan uusin kerta JOSSA on potentiaali — ei vain uusin kerta
     (sama löydös 2 kuin kohteilla: potentiaalia ei anneta joka kerralla). */
  function tmAhPotentiaaliKooste(kerrat, nytMs) {
    var raja = (nytMs == null ? Date.now() : nytMs) - IKKUNA_PV * 86400000;
    var paras = {};
    (kerrat || []).forEach(function (k) {
      var pot = k && k.potentiaali;
      if (!pot || typeof pot.tahdet !== 'number') return;
      var ms = _ms(k.pvm);
      if (isNaN(ms) || ms < raja) return;
      var uid = String(k.arvioija_uid || '');
      if (!uid) return;
      if (!paras[uid] || paras[uid].ms < ms) paras[uid] = { ms: ms, pot: pot };
    });
    var uidit = Object.keys(paras);
    if (!uidit.length) return null;
    var tahdet = uidit.map(function (u) { return paras[u].pot.tahdet; });
    var uusin = uidit.reduce(function (a, b) { return paras[a].ms >= paras[b].ms ? a : b; });
    return {
      tahdet_mediaani: _mediaani(tahdet), arvioijia: uidit.length, n: uidit.length,
      varmuus_viimeisin: paras[uusin].pot.varmuus || null,
    };
  }

  /** Varmuuden oletus: alle 14-vuotiaalla potentiaaliarvio on tutkimusten mukaan
      epäluotettava → 'alustava', ellei arvioija muuta valitse (brief §4.3). */
  function tmAhVarmuusOletus(ika) {
    return (ika != null && ika < 14) ? 'alustava' : 'kohtalainen';
  }

  var api = {
    tmAhKertaPayload: tmAhKertaPayload,
    tmAhViimeisinPerKohde: tmAhViimeisinPerKohde,
    tmAhPotentiaaliKooste: tmAhPotentiaaliKooste,
    tmAhVarmuusOletus: tmAhVarmuusOletus,
    tmKausi: tmKausi, tmKausimalli: tmKausimalli, tmAhJakso: tmAhJakso,
    tmAhKertaId: tmAhKertaId, tmAhSeuralle: tmAhSeuralle, tmAhSeuranOmat: tmAhSeuranOmat,
    tmAhViimeisimmat: tmAhViimeisimmat, tmAhHajonta: tmAhHajonta, tmAhSarja: tmAhSarja,
    tmAhTrendi: tmAhTrendi, tmAhKooste: tmAhKooste, tmAhKontekstierot: tmAhKontekstierot,
    ERO_KESKUSTELUNAIHE: ERO_KESKUSTELUNAIHE, IKKUNA_PV: IKKUNA_PV,
  };

  if (typeof module !== 'undefined' && module.exports) module.exports = api;
  if (typeof window !== 'undefined') {
    Object.keys(api).forEach(function (k) { root[k] = api[k]; });
    root.TM_ARVIOINTI_HISTORIA = api;
  }
})(typeof window !== 'undefined' ? window : this);
