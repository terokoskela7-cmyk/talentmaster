/* ════════════════════════════════════════════════════════════════════════
   tm_toimenpide_signaalit.js — automaattiset toimenpide-ehdotukset: KUUSI signaalia + ehdotuksen deterministinen dokumentti-id.
   Avauskirjoitukset palvelimelle, PR B (.briefit/projektit/03-avauskirjoitukset-palvelimelle/VAIHE0.md §2, PM 8.11.2026 P3, P4 + id-korjaus).
   Signaalit on siirretty VP:n inline-`TP_SIGNAALIT`:stä SANASTA SANAAN; ainoat erot: jäsenyys (`_pOnJoukkueessa`), kello (`Date.now()`) ja
   `window.TM_FYSINEN` / `window.TM_TEKNIIKKA` injektoidaan ctx:llä (palvelimella ei ole window:ta). Kopioiden yhtäläisyys: tests/functions_jaettu_lib.test.js; toiminta: tests/toimenpide_ehdotukset_palvelin.test.js.
   YKSI määritelmä: fyysinen/tekniikka = sama funktio kuin Tilanteen huomio (lib/tm_fyysinen.js, lib/tm_tekniikka.js). Dedup-säännöt (D134) = tm_koti_luvut.js (EI kopioida).
   ctx = { nytMs, onJoukkueessa(p, joukkueNimi), fysinen: TM_FYSINEN, tekniikka: TM_TEKNIIKKA }
   Dual-export: module.exports + window.TM_TOIMENPIDE_SIGNAALIT.
   ════════════════════════════════════════════════════════════════════════ */
(function (root) {
  'use strict';

  /* Automaattiset signaalit (joukkue, kaikki pelaajat) → {joukkue, signaali, teksti} tai null */
  var TP_SIGNAALIT = [
    /* TUNNISTE `hh_taso_alhainen` SÄILYY (historia, dedup D134, sv-käännökset), mutta se kattaa nyt KOKO fyysisen ketjun = "fyysiset testit kehityskohteena"
       (lib/tm_fyysinen.js: raakatulokset, normiIka, §28; docs/KARKI_JA_YKSILOLLINEN_KARTOITUS.md). YKSI määritelmä: sama funktio kuin Tilanteen huomio — älä lisää tähän omaa mittaria tai rajaa. */
    { id: 'hh_taso_alhainen', tarkista: function (j, pp, ctx) {
        const r = ctx.fysinen ? ctx.fysinen.tmFyysinenJoukkueLuokka(pp.filter(function (p) { return ctx.onJoukkueessa(p, j); }), ctx.nytMs, { joukkueNimi: j }) : null;
        return (r && r.luokka === 'kehityskohde') ? { joukkue: j, signaali: 'hh_taso_alhainen',
          teksti: j + ' — fyysiset testit kehityskohteena: ' + r.kehityskohteita + ' pelaajaa. Aloita yksilöllinen harjoitusohjelma.' } : null;   // kiinteä häntä + {n} (kääntyy näyttöhetkellä, ks. TP_TOIMENPIDE_HANNAT)
      } },
    { id: 'suunta_lasku', tarkista: function (j, pp, ctx) {
        const l = pp.filter(function (p) { return ctx.onJoukkueessa(p, j) && p.hh_taso != null && p.hh_taso_edellinen != null && (p.hh_taso - p.hh_taso_edellinen) < -0.3; });
        return l.length >= 2 ? { joukkue: j, signaali: 'suunta_lasku',
          teksti: j + ' — H-H taso laskussa ' + l.length + ' pelaajalla. Tarkista kuormitus.' } : null;
      } },
    { id: 'tkk_puuttuu', tarkista: function (j, pp, ctx) {
        const kaikki = pp.filter(function (p) { return ctx.onJoukkueessa(p, j); });
        const ilman = kaikki.filter(function (p) { return p.tki_viimeisin == null; });
        return (kaikki.length > 0 && ilman.length === kaikki.length) ? { joukkue: j, signaali: 'tkk_puuttuu',
          teksti: j + ' — tekniikkamittaukset puuttuvat kaikilta pelaajilta. Suunnittele tekniikkakilpailu.' } : null;
      } },
    // TKI-pohjaiset toimenpiteet — antavat TKI-only-seuroille (esim. Sibbo) konstruktiivisen "mitä tehdä",
    // samalla tavalla kuin H-H-data tuottaa toimenpiteitä SJK:lle. Tasapainottaa kriittiset signaalit toiminnalla.
    /* TUNNISTE `tki_alhainen` SÄILYY (historia, dedup D134, sv-käännökset), mutta se kattaa nyt KOKO tekniikkaketjun TKI → SM-tasot = "tekniikka kehityskohteena"
       (lib/tm_tekniikka.js, docs/TEKNIIKKA_MAARITELMA.md). YKSI määritelmä: sama funktio kuin Tilanteen huomio ja Kodin pulssi — älä lisää tähän omaa mittaria tai rajaa. */
    { id: 'tki_alhainen', tarkista: function (j, pp, ctx) {
        const r = ctx.tekniikka ? ctx.tekniikka.tmTekniikkaJoukkueLuokka(pp.filter(function (p) { return ctx.onJoukkueessa(p, j); }), ctx.nytMs, { joukkueNimi: j }) : null;
        return (r && r.luokka === 'kehityskohde') ? { joukkue: j, signaali: 'tki_alhainen',
          teksti: j + ' — tekniikka kehityskohteena: ' + r.kehityskohteita + (r.syy === 'pallo_hidastaa' ? ' pelaajaa, pallo hidastaa suunnanmuutoksissa' : ' pelaajaa alle ikätason') + '. Fokusoi tekniikkaharjoittelu.' } : null;   // kiinteä häntä + {n} (kääntyy näyttöhetkellä, ks. TP_TOIMENPIDE_HANNAT)
      } },
    { id: 'tki_lahella_merkkia', tarkista: function (j, pp, ctx) {
        const a = pp.filter(function (p) { return ctx.onJoukkueessa(p, j) && p.tki_viimeisin != null && p.tki_viimeisin >= 35 && p.tki_viimeisin < 55 && !p.tki_merkki; });
        return a.length >= 2 ? { joukkue: j, signaali: 'tki_lahella_merkkia',
          teksti: j + ' — ' + a.length + ' pelaajaa lähellä pronssia (TKI 35–54). Kohdenna omatoimiharjoittelu — merkki on saavutettavissa seuraavassa kilpailussa.' } : null;
      } },
    { id: 'flei_kartoitus_puuttuu', tarkista: function (j, pp, ctx) {
        const kaikki = pp.filter(function (p) { return ctx.onJoukkueessa(p, j); });
        const ilman = kaikki.filter(function (p) { return p.flei_viimeisin == null; });
        return (kaikki.length >= 3 && ilman.length === kaikki.length) ? { joukkue: j, signaali: 'flei_kartoitus_puuttuu',
          teksti: j + ' — harjoitettavuuskartoitus (kehon valmius) tekemättä. Varaa kartoituspäivä, jotta harjoittelua voi yksilöllistää.' } : null;
      } }
  ];

  /* Joukkuenimet pelaajista (VP:n generoimToimenpideEhdotukset-silmukka): jäsenyys ctx:ltä, fallback 'Tuntematon'. */
  function joukkueNimet(pelaajat, jasenNimet) {
    var nimet = [];
    pelaajat.forEach(function (p) { var n = jasenNimet(p); (n.length ? n : ['Tuntematon']).forEach(function (j) { if (nimet.indexOf(j) < 0) nimet.push(j); }); });
    return nimet;
  }

  /* Laskee kaikki ehdotukset → [{joukkue, signaali, teksti}] ILMAN dedupia. Dedup (D134 ehdotusEste) tehdään kutsujalla, jotta tässä ei ole I/O:ta.
     ctx.jasenNimet(p) → pelaajan joukkuenimet (VP: _pJNimet). este = tm_koti_luvut.ehdotusEste(avoimet, nytMs) (valinnainen) → estetyt jätetään pois,
     ja sama silmukka pitää saman kierroksen sisäiset tuplat poissa kuten VP:ssä. */
  function laskeEhdotukset(pelaajat, ctx, este, LU) {
    var ulos = [];
    joukkueNimet(pelaajat, ctx.jasenNimet).forEach(function (j) {
      TP_SIGNAALIT.forEach(function (sig) {
        var r = sig.tarkista(j, pelaajat, ctx);
        if (!r) return;
        if (este && LU) { if (LU.ehdotusEstetty(este, r)) return; LU.ehdotusEsteLisaa(este, r); }
        ulos.push(r);
      });
    });
    return ulos;
  }

  var API = { TP_SIGNAALIT: TP_SIGNAALIT, joukkueNimet: joukkueNimet, laskeEhdotukset: laskeEhdotukset };
  if (typeof module !== 'undefined' && module.exports) module.exports = API; else if (root) root.TM_TOIMENPIDE_SIGNAALIT = API;
})(typeof window !== 'undefined' ? window : (typeof globalThis !== 'undefined' ? globalThis : this));
