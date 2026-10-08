/* ════════════════════════════════════════════════════════════════════════
   tm_adar_tekstit.js — ADAR Pikakortin (TalentMaster_ADAR_Pikakortti.html) KAIKKI ulottuvuustekstit yhdessä FI-kartassa (sv-läpiajo PR 4; ent. PH_TEKSTIT sivun sisällä).
   Avain = polku (adar_A_q, adar_A_d1, adar_A_tip2, adar_A_v1 …), arvo = suomen oletus. sv-reitti: JAETTU kirjastokartta lib/tm_lib_i18n.js (tmLibT; kuten muut libit, päätös A) —
   Gemini täyttää (docs/i18n/sv_kaannoserae_2.json, osio lib.tm_adar_tekstit). Puuttuva käännös → suomi (sama kuin ennen). Code EI kirjoita ruotsia (CLAUDE.md §0).
   Nimet (Havainnointi · Päätös · Toteutus · Palautuminen) EIVÄT ole täällä: ne tulevat nimikanonista lib/tm_pelialy_yksilo.js TM_ADAR_NIMET / tmAdarNimet (yksi nimikanoni).
   API: tmAdarT(avain, tr) → teksti · tmAdarKortti(dim, tr) → { q, d:{1,2,3}, tip:{1,2,3}, valinnat:[[teksti, lippu], …] } · tmAdarIkavaihe(ika, tr) → Leikkijä | Rakentaja | Showcase.
   tr = kutsujan kääntäjä (selaimessa tmLibT). Dual-export: module.exports || window.TM_ADAR_TEKSTIT.
════════════════════════════════════════════════════════════════════════ */
(function (root) {
  'use strict';
  var FI = {
    adar_A_q: 'Katsooko ylös ennen kuin saa pallon, ja mitä hän näkee?',
    adar_A_d1: 'Katsoo palloa koko ajan, ei nosta päätä.',
    adar_A_d2: 'Katsoo ylös osassa tilanteista, ei vielä johdonmukaisesti.',
    adar_A_d3: 'Skannaa systemaattisesti ja lukee tilanteen ennakoivasti.',
    adar_A_tip1: 'Kysy: "Mihin sinä katsot ennen kuin saat pallon?"',
    adar_A_tip2: 'Pienpeliin bonuspiste, jos katsoo ylös ennen vastaanottoa.',
    adar_A_tip3: 'Haasta: 3v3 pienessä tilassa, vähemmän aikaa.',
    adar_A_v1: 'Katsoo ylös', adar_A_v2: 'Lukee pelaajat', adar_A_v3: 'Reagoi ennakoivasti', adar_A_v4: 'Pallokeskeinen',
    adar_D_q: 'Kuinka nopeasti ja oikein hän ratkaisee?',
    adar_D_d1: 'Epäröi yli 2 s tai valitsee toistuvasti väärin.',
    adar_D_d2: 'Ratkaisee 1–2 sekunnissa, oikein yli puolet tilanteista.',
    adar_D_d3: 'Ratkaisee alle sekunnissa ja johdonmukaisesti oikein.',
    adar_D_tip1: 'Hidas päätös voi olla kokemusta, ei kykyä. Anna yksi selkeä vaihtoehto kerrallaan.',
    adar_D_tip2: 'Rajoita aikaa: kaksi kosketusta pienpelissä.',
    adar_D_tip3: 'Lisää vaihtoehtoja: kolmas suunta, vastustajan paine.',
    adar_D_v1: 'Nopea (< 1 s)', adar_D_v2: 'Oikea valinta', adar_D_v3: 'Epäröi (> 2 s)', adar_D_v4: 'Toistuva väärä valinta',
    adar_Act_q: 'Toteutuuko suunniteltu liike paineessa?',
    adar_Act_d1: 'Tekninen laatu romahtaa paineessa selvästi.',
    adar_Act_d2: 'Laatu vaihtelee paineessa, ei vielä luotettava.',
    adar_Act_d3: 'Laatu säilyy kovimmassakin paineessa.',
    adar_Act_tip1: 'Jos testeissä tekniikka on hyvä, se ei vielä siirry peliin: lisää painetta asteittain.',
    adar_Act_tip2: 'Toistoja puolipaineessa ennen täyttä painetta.',
    adar_Act_tip3: 'Kovempi vastustaja tai pienempi tila.',
    adar_Act_v1: 'Laatu säilyy paineessa', adar_Act_v2: 'Hyvä ensikosketus', adar_Act_v3: 'Laatu laskee paineessa', adar_Act_v4: 'Kiirehtii',
    adar_R_q: 'Palautuuko virheestä vai jähmettyykö?',
    adar_R_d1: 'Jähmettyy yli 15 s virheen jälkeen.',
    adar_R_d2: 'Palautuu 10–15 sekunnissa, joskus jähmettyy isoista virheistä.',
    adar_R_d3: 'Palautuu alle 10 sekunnissa; virhe ei vaikuta seuraavaan.',
    adar_R_tip1: 'Älä kommentoi virhettä heti. Tuo takaisin peliin kysymällä.',
    adar_R_tip2: 'Sovi yhteinen palautumisele, esim. taputus ja seuraava tehtävä.',
    adar_R_tip3: 'Anna rooli, jossa virheitä väistämättä tulee.',
    adar_R_v1: 'Palautuu nopeasti', adar_R_v2: 'Tukee joukkuetoveria', adar_R_v3: 'Jähmettyy', adar_R_v4: 'Luovuttaa tilanteen',
    adar_piste_1: 'Kehitettävää', adar_piste_2: 'Kehittyvä', adar_piste_3: 'Hallitsee',
    adar_konteksti_harjoitus: 'Harjoitus', adar_konteksti_pienpeli: 'Pienpeli', adar_konteksti_ottelu: 'Ottelu',
    adar_verbi_a: 'havainnoi', adar_verbi_d: 'ratkaisee', adar_verbi_ac: 'toteuttaa', adar_verbi_r: 'palautuu virheistä',
    adar_partitiivi_d: 'päätöstä', adar_partitiivi_ac: 'toteutusta', adar_partitiivi_r: 'palautumista',
    adar_ikavaihe_leikkija: 'Leikkijä', adar_ikavaihe_rakentaja: 'Rakentaja', adar_ikavaihe_showcase: 'Showcase'
  };
  /* Rakenne, jota EI käännetä: valintojen "heikkous"-liput (0/1) ulottuvuuksittain, järjestys = v1..v4. */
  var VALINTA_LIPUT = { A: [0, 0, 0, 1], D: [0, 0, 1, 1], Act: [0, 0, 1, 1], R: [0, 0, 1, 1] };
  var IKAVAIHE_RAJAT = [[12, 'leikkija'], [15, 'rakentaja'], [999, 'showcase']];

  function tmAdarT(avain, tr) {
    var v; try { v = (typeof tr === 'function') ? tr(avain) : undefined; } catch (e) { v = undefined; }
    return (typeof v === 'string' && v && v !== avain) ? v : FI[avain];
  }
  function tmAdarKortti(dim, tr) {
    if (!VALINTA_LIPUT[dim]) return null;
    var o = { q: tmAdarT('adar_' + dim + '_q', tr), d: {}, tip: {}, valinnat: [] };
    [1, 2, 3].forEach(function (n) { o.d[n] = tmAdarT('adar_' + dim + '_d' + n, tr); o.tip[n] = tmAdarT('adar_' + dim + '_tip' + n, tr); });
    VALINTA_LIPUT[dim].forEach(function (lippu, i) { o.valinnat.push([tmAdarT('adar_' + dim + '_v' + (i + 1), tr), lippu]); });
    return o;
  }
  function tmAdarIkavaihe(ika, tr) {
    for (var i = 0; i < IKAVAIHE_RAJAT.length; i++) if (ika <= IKAVAIHE_RAJAT[i][0]) return tmAdarT('adar_ikavaihe_' + IKAVAIHE_RAJAT[i][1], tr);
    return tmAdarT('adar_ikavaihe_showcase', tr);
  }
  var API = { FI: FI, VALINTA_LIPUT: VALINTA_LIPUT, IKAVAIHE_RAJAT: IKAVAIHE_RAJAT, tmAdarT: tmAdarT, tmAdarKortti: tmAdarKortti, tmAdarIkavaihe: tmAdarIkavaihe };
  if (typeof module !== 'undefined' && module.exports) module.exports = API; else root.TM_ADAR_TEKSTIT = API;
})(typeof window !== 'undefined' ? window : this);
