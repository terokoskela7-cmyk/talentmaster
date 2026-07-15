/* ════════════════════════════════════════════════════════════════════════
   tm_jaksofokus.js — Vaihe 4c: VP:n jaksofokus-oversight PURE-ydin (VP_v25).
   Aggregoi jaksofokus-pikakentät (§26) → kattavuus, jaksot (aktiivinen/umpeutunut),
   teemakeskittymä (konseptijakauma → ryhmäharjoite-signaali), lähdejakauma.
   UI inline VP_v25:ssä; tämä = testattava ydin (EI Firestore-lukuja, EI DOM:ia).
   Dual-export: module.exports (Vitest) || window.TM_JAKSOFOKUS (selain). §4 · §26 · §37.
════════════════════════════════════════════════════════════════════════ */
(function (root) {
  'use strict';

  var DAY_MS = 86400000;
  var RYHMA_KYNNYS = 3;   // ≥3 pelaajaa samassa konseptissa → ryhmäharjoite-CTA (§3.2)

  function _nowMs(nyt) {
    if (nyt == null) return Date.now();
    if (nyt instanceof Date) return nyt.getTime();
    if (typeof nyt === 'string') return new Date(nyt).getTime();
    return nyt;
  }

  // Onko pelaajalla aktiivinen/asetettu jaksofokus (konsepti valittu).
  function tmJfOnFokus(p) {
    return !!(p && p.jaksofokus && p.jaksofokus.konsepti_avain);
  }

  // IDP-kortti 1a (domeeni-fix) — vaihtuuko aktiivisen jaksofokuksen DOMEENI uuden fokuksen myötä?
  // true = uusi fokus on ERI domeenia (mikä tahansa nelikulmamallin domeeni-vaihto: fyysinen · teknis_taktinen ·
  // psyykkinen · sosiaalinen) kuin aktiivinen → aktiivinen pitää ARKISTOIDA ennen ylikirjoitusta (ei hiljaista
  // klobberia — "Emil-törmäys": eri domeenien jaksot eivät saa hukata toisiaan samasta yhdestä slotista).
  // Sama domeeni = normaali muokkaus (ei arkistoa). Predikaatti on domeeni-agnostinen (!==) → toimii sellaisenaan
  // useammalla arvolla (JF-1). Tagittomaton vanha jf tulkitaan 'teknis_taktinen'-domeeniksi (fallback kuin §Vaihe7).
  function tmJfVaihtaaDomeenin(jf, uusiDomeeni) {
    if (!jf || !jf.konsepti_avain || !uusiDomeeni) return false;
    return (jf.domeeni || 'teknis_taktinen') !== uusiDomeeni;
  }

  // ── JF-1 NELIKULMAMALLI — 4 domeenia (täsmää 5D-arviointiin) + seed-yksilökonseptit ──────────────────
  // Fyysinen (D1, TM_FYYSTEEMAT-lib) ja teknis_taktinen (D2/D4, tm_teknistaktiset-lib) tuovat konseptinsa omista
  // kirjastoistaan; henkiselle (D3) ja sosiaaliselle (D5) seed-yksilökonseptit ovat tässä (laajennettavissa
  // datana ilman koodia). REUNAEHTO: D3/D5 = KEHITYSKONSEPTEJA, ei kliinistä/terveystietoa (ei GDPR Art. 9).
  var TM_JF_DOMEENIT = [
    { avain: 'fyysinen',        ikoni: '🏃', nimi: 'Fyysinen',        dim: 'D1' },
    { avain: 'teknis_taktinen', ikoni: '⚽', nimi: 'Teknis-taktinen', dim: 'D2/D4' },
    { avain: 'psyykkinen',      ikoni: '🧠', nimi: 'Henkinen',        dim: 'D3' },
    { avain: 'sosiaalinen',     ikoni: '🤝', nimi: 'Sosiaalinen',     dim: 'D5' }
  ];

  // Seed-yksilökonseptit (kehitystaso, EI kliininen). avaimet = arviointitaksonomian (tm_arviointi_taksonomia.js)
  // D3/D5-kohdat → sama sanasto per ulottuvuus (arvion heikkous ≤2 mäppäytyy suoraan jaksofokus-konseptiin). koodit
  // poistettu (writer käyttää k.koodi || null). cue = Rakentaja-ääni: avaava kysymys, ei käsky. Ks. docs/CODE_OHJE_IDP_P0_SANASTO.md.
  var TM_JF_KONSEPTIT = {
    // ── D3 Psyykkinen (Henkinen) — avaimet = taksonomia D3 (kilpailullisuus · psykologia · harjoitusasenne).
    //    Johtajuus/Kommunikaatio ovat D3 (kolmiomittaus itse×valmentaja×VP); Pelin lukeminen on D4 → ei täällä. ──
    psyykkinen: [
      { avain: 'scoring_drive',    nimi: 'Maalinteon halu',     kuvaus: 'Haluaa tehdä ja luoda maaleja, hakee ratkaisua paikasta.',        cue: 'Missä paikassa uskot tekeväsi eniten maaleja?' },
      { avain: 'attitude',         nimi: 'Asenne',              kuvaus: 'Suhtautuminen harjoitteluun ja peliin — ryhti ja sinnikkyys.',    cue: 'Mikä sai sinut yrittämään kovemmin viime pelissä?' },
      { avain: 'work_ethic',       nimi: 'Työmoraali',          kuvaus: 'Tekee työn loppuun myös kun on rankkaa.',                        cue: 'Milloin teit enemmän kuin oli pakko?' },
      { avain: 'consistency',      nimi: 'Tasaisuus',           kuvaus: 'Suoritustaso pysyy samana pelistä toiseen.',                     cue: 'Mikä auttaa sinua onnistumaan joka kerta samoin?' },
      { avain: 'leadership',       nimi: 'Johtajuus',           kuvaus: 'Ottaa vastuuta, näyttää suuntaa ja kannustaa joukkuetta.',       cue: 'Miten autoit joukkuettasi viime pelissä?' },
      { avain: 'communication',    nimi: 'Kommunikaatio',       kuvaus: 'Ohjaa ja tukee pelikavereita äänellä ja elekielellä.',           cue: 'Mitä sanoit kaverille ennen ratkaisua?' },
      { avain: 'confidence',       nimi: 'Itseluottamus',       kuvaus: 'Uskoo omiin ratkaisuihinsa myös paineessa.',                     cue: 'Milloin viimeksi uskalsit yrittää vaikeaa ratkaisua?' },
      { avain: 'body_language',    nimi: 'Kehonkieli',          kuvaus: 'Ryhti ja eleet viestivät valmiutta ja rohkeutta.',               cue: 'Miltä kehosi näyttää, kun peli sujuu parhaiten?' },
      { avain: 'training_load',    nimi: 'Kuorman sieto',       kuvaus: 'Jaksaa harjoitella ja palautuu kuormituksesta.',                 cue: 'Mikä auttaa sinua palautumaan kovan viikon jälkeen?' },
      { avain: 'desire_improve',   nimi: 'Kehittymisen halu',   kuvaus: 'Haluaa tulla paremmaksi ja hakee palautetta.',                   cue: 'Mitä haluaisit oppia seuraavaksi?' },
      { avain: 'inner_motivation', nimi: 'Sisäinen motivaatio', kuvaus: 'Tekee itsensä vuoksi, ei vain ulkoisesta paineesta.',            cue: 'Miksi haluat kehittyä juuri tässä?' },
      { avain: 'learning_ability', nimi: 'Oppimiskyky',         kuvaus: 'Ottaa ohjeen vastaan ja soveltaa sen peliin nopeasti.',          cue: 'Mitä opit viime harjoituksesta?' }
    ],
    // ── D5 Sosiaalinen — avaimet = taksonomia D5 (kaksi kohtaa; malli on tämä, ei keksitä lisää). ──
    sosiaalinen: [
      { avain: 'team_role',          nimi: 'Joukkuerooli',  kuvaus: 'Tuntee roolinsa joukkueessa ja täyttää sen.',            cue: 'Mikä on tärkein tehtäväsi joukkueessa?' },
      { avain: 'social_interaction', nimi: 'Vuorovaikutus', kuvaus: 'Toimii rakentavasti kavereiden ja valmentajien kanssa.', cue: 'Miten sait kaverin mukaan viime harjoituksessa?' }
    ]
  };

  // Domeeni-metadata avaimella (ikoni/nimi/dim) — UI-labelit yhdestä lähteestä.
  function tmJfDomeeni(avain) {
    for (var i = 0; i < TM_JF_DOMEENIT.length; i++) if (TM_JF_DOMEENIT[i].avain === avain) return TM_JF_DOMEENIT[i];
    return null;
  }
  // Yksilökonseptit domeenille (psyykkinen/sosiaalinen). [] jos ei seed-kirjastoa (fyysinen/teknis = omat libinsä).
  function tmJfKonseptit(domeeni) { return TM_JF_KONSEPTIT[domeeni] ? TM_JF_KONSEPTIT[domeeni].slice() : []; }
  // Yksittäinen konsepti domeeni+avain (tai koodi). null jos ei löydy.
  function tmJfKonsepti(domeeni, avainTaiKoodi) {
    var lista = TM_JF_KONSEPTIT[domeeni] || [], a = String(avainTaiKoodi || '');
    for (var i = 0; i < lista.length; i++) if (lista[i].avain === a || lista[i].koodi === a) return lista[i];
    return null;
  }

  // ── JF-2 LINKITETYT KONSEPTIT (yli alueiden) — pääfokus + korkeintaan LINKIT_MAX tukikonseptia ─────────
  var LINKIT_MAX = 3;   // "korkeintaan ~3" (§JF-2)
  // Puhdista linkitetyt-taulukko: vain validit {domeeni, konsepti_avain, konsepti_nimi}, dedup (domeeni+avain), cap.
  function tmJfNormLinkit(linkit) {
    if (!Array.isArray(linkit)) return [];
    var ulos = [], nahty = {};
    for (var i = 0; i < linkit.length && ulos.length < LINKIT_MAX; i++) {
      var l = linkit[i];
      if (!l || !l.domeeni || !l.konsepti_avain) continue;
      var avain = l.domeeni + '::' + l.konsepti_avain;
      if (nahty[avain]) continue;
      nahty[avain] = 1;
      ulos.push({ domeeni: l.domeeni, konsepti_avain: l.konsepti_avain, konsepti_nimi: l.konsepti_nimi || l.konsepti_avain });
    }
    return ulos;
  }
  // Lisää linkki: palauttaa UUDEN taulukon (cap LINKIT_MAX, dedup domeeni+avain). Invalidi/duplikaatti/täysi → ennallaan.
  function tmJfLisaaLinkki(linkit, uusi) {
    var pohja = tmJfNormLinkit(linkit);
    if (!uusi || !uusi.domeeni || !uusi.konsepti_avain) return pohja;
    if (pohja.length >= LINKIT_MAX) return pohja;
    if (pohja.some(function (l) { return l.domeeni === uusi.domeeni && l.konsepti_avain === uusi.konsepti_avain; })) return pohja;
    return pohja.concat([{ domeeni: uusi.domeeni, konsepti_avain: uusi.konsepti_avain, konsepti_nimi: uusi.konsepti_nimi || uusi.konsepti_avain }]);
  }

  // Umpeutunut = jakso alkoi + kesto_vk*7 pv < nyt. Ei alkoi-pvm:ää → EI umpeutunut (ei tietoa).
  // jf = jaksofokus-objekti (ei koko pelaaja). nyt: ms | Date | ISO | null(=now).
  function tmJfUmpeutunut(jf, nyt) {
    if (!jf || !jf.konsepti_avain || !jf.alkoi) return false;
    var alkoi = new Date(jf.alkoi).getTime();
    if (isNaN(alkoi)) return false;
    var vk = jf.kesto_vk || 4;
    return (alkoi + vk * 7 * DAY_MS) < _nowMs(nyt);
  }

  // Kattavuus: montako pelaajaa jolla jaksofokus. { katettu, yht, pct(0–100), ilman }.
  function tmJfKattavuus(pelaajat) {
    var yht = (pelaajat || []).length;
    var katettu = (pelaajat || []).filter(tmJfOnFokus).length;
    return { katettu: katettu, yht: yht, pct: yht ? Math.round(katettu / yht * 100) : 0, ilman: yht - katettu };
  }

  // Teemakeskittymä: konsepti → montako pelaajaa (laskeva). [{ avain, nimi, count, ryhma(bool) }].
  // ryhma = count >= RYHMA_KYNNYS (ryhmäharjoite kannattaa).
  function tmJfTeemakeskittyma(pelaajat) {
    var map = {};
    (pelaajat || []).forEach(function (p) {
      if (!tmJfOnFokus(p)) return;
      var jf = p.jaksofokus;
      var avain = jf.konsepti_avain;
      if (!map[avain]) map[avain] = { avain: avain, nimi: jf.konsepti_nimi || avain, count: 0 };
      map[avain].count += 1;
    });
    return Object.keys(map).map(function (k) {
      var t = map[k]; t.ryhma = t.count >= RYHMA_KYNNYS; return t;
    }).sort(function (a, b) { return b.count - a.count || String(a.nimi).localeCompare(String(b.nimi)); });
  }

  // Jaksot: { aktiiviset, umpeutuneet } (vain fokuksen omaavista).
  function tmJfJaksot(pelaajat, nyt) {
    var aktiiviset = 0, umpeutuneet = 0;
    (pelaajat || []).forEach(function (p) {
      if (!tmJfOnFokus(p)) return;
      if (tmJfUmpeutunut(p.jaksofokus, nyt)) umpeutuneet += 1; else aktiiviset += 1;
    });
    return { aktiiviset: aktiiviset, umpeutuneet: umpeutuneet };
  }

  // Lähdejakauma: kuka asetti fokuksen. { valmentaja, vp, talenttivalmentaja, muu }.
  function tmJfLahdejakauma(pelaajat) {
    var j = { valmentaja: 0, vp: 0, talenttivalmentaja: 0, muu: 0 };
    (pelaajat || []).forEach(function (p) {
      if (!tmJfOnFokus(p)) return;
      var l = p.jaksofokus.lahde;
      if (l === 'valmentaja' || l === 'vp' || l === 'talenttivalmentaja') j[l] += 1; else j.muu += 1;
    });
    return j;
  }

  // Talentit erikseen (VP-erityisvastuu §37): { katettu, yht, ilman }.
  function tmJfTalentit(pelaajat) {
    var tal = (pelaajat || []).filter(function (p) { return p && p.talenttiOhjelma === true; });
    var katettu = tal.filter(tmJfOnFokus).length;
    return { katettu: katettu, yht: tal.length, ilman: tal.length - katettu };
  }

  // Koko KPI-kooste yhdellä kutsulla (VP KPI-nauha).
  function tmJfKooste(pelaajat, nyt) {
    return {
      kattavuus: tmJfKattavuus(pelaajat),
      jaksot: tmJfJaksot(pelaajat, nyt),
      talentit: tmJfTalentit(pelaajat),
      lahde: tmJfLahdejakauma(pelaajat),
      teemat: tmJfTeemakeskittyma(pelaajat)
    };
  }

  var API = {
    tmJfOnFokus: tmJfOnFokus,
    tmJfVaihtaaDomeenin: tmJfVaihtaaDomeenin,
    tmJfUmpeutunut: tmJfUmpeutunut,
    tmJfKattavuus: tmJfKattavuus,
    tmJfTeemakeskittyma: tmJfTeemakeskittyma,
    tmJfJaksot: tmJfJaksot,
    tmJfLahdejakauma: tmJfLahdejakauma,
    tmJfTalentit: tmJfTalentit,
    tmJfKooste: tmJfKooste,
    tmJfDomeeni: tmJfDomeeni,
    tmJfKonseptit: tmJfKonseptit,
    tmJfKonsepti: tmJfKonsepti,
    tmJfNormLinkit: tmJfNormLinkit,
    tmJfLisaaLinkki: tmJfLisaaLinkki,
    TM_JF_DOMEENIT: TM_JF_DOMEENIT,
    TM_JF_KONSEPTIT: TM_JF_KONSEPTIT,
    LINKIT_MAX: LINKIT_MAX,
    RYHMA_KYNNYS: RYHMA_KYNNYS
  };

  if (typeof module !== 'undefined' && module.exports) module.exports = API;
  else root.TM_JAKSOFOKUS = API;
})(typeof window !== 'undefined' ? window : this);
