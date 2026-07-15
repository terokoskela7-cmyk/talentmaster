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

  // Seed-yksilökonseptit (kehitystaso, EI kliininen). koodi H*/S* · cue = valmentajan avaava kysymys (ei käsky).
  var TM_JF_KONSEPTIT = {
    psyykkinen: [
      { avain: 'rohkeus',            koodi: 'H1', nimi: 'Rohkeus',            kuvaus: 'Uskaltaa vaatia palloa ja yrittää ratkaisuja myös paineessa.',   cue: 'Milloin viimeksi vaadit palloa vaikeassa paikassa?' },
      { avain: 'keskittyminen',      koodi: 'H2', nimi: 'Keskittyminen',      kuvaus: 'Pysyy pelissä mukana koko suorituksen ajan, palautuu virheestä.',  cue: 'Mikä auttaa sinua palaamaan peliin virheen jälkeen?' },
      { avain: 'tunteiden_hallinta', koodi: 'H3', nimi: 'Tunteiden hallinta', kuvaus: 'Säätelee vireystilaa — ei lamaannu eikä ylikuumene.',              cue: 'Miltä keho tuntuu, kun onnistut parhaiten?' },
      { avain: 'pelin_lukeminen',    koodi: 'H4', nimi: 'Pelin lukeminen',    kuvaus: 'Ennakoi seuraavan tilanteen ja tekee päätöksen ajoissa.',          cue: 'Mitä näit ennen kuin ratkaisit tilanteen?' }
    ],
    sosiaalinen: [
      { avain: 'johtajuus',      koodi: 'S1', nimi: 'Johtajuus',      kuvaus: 'Ottaa vastuuta, kannustaa ja näyttää suuntaa joukkueelle.',       cue: 'Miten autoit kaveria viime pelissä?' },
      { avain: 'kommunikaatio',  koodi: 'S2', nimi: 'Kommunikaatio',  kuvaus: 'Ohjaa ja tukee pelikavereita äänellä ja elekielellä.',           cue: 'Mitä sanoit kaverille ennen syöttöä?' },
      { avain: 'joukkuepeli',    koodi: 'S3', nimi: 'Joukkuepeli',    kuvaus: 'Tekee työtä joukkueen hyväksi — myös ilman palloa.',             cue: 'Milloin autoit joukkuetta ilman palloa?' },
      { avain: 'ammattimaisuus', koodi: 'S4', nimi: 'Ammattimaisuus', kuvaus: 'Asenne, valmistautuminen ja rutiinit kunnossa harjoituksesta peliin.', cue: 'Mikä rutiini auttaa sinua valmistautumaan?' }
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
    TM_JF_DOMEENIT: TM_JF_DOMEENIT,
    TM_JF_KONSEPTIT: TM_JF_KONSEPTIT,
    RYHMA_KYNNYS: RYHMA_KYNNYS
  };

  if (typeof module !== 'undefined' && module.exports) module.exports = API;
  else root.TM_JAKSOFOKUS = API;
})(typeof window !== 'undefined' ? window : this);
