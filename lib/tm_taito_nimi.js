/* tm_taito_nimi.js — taidon nimi pelaajan kielellä (sv-aukot P7, kohta 8; PM 28.10.2026).
   Tavoitteen fokus.nimi / idp_fokus.nimi on TALLENNETTU fi-teksti. Pelaajan appi ei lataa koko taksonomiaa
   (tm_arviointi_taksonomia.js asettaa juuriglobaaleja, joita tm_tukitavoitteet poimisi → muuttaisi Tämän tueksi -laskentaa),
   joten tässä on vain nimiparit: avain = taksonomian nimi_fi, arvo = taksonomian nimi_sv.
   GENEROITU taksonomiasta — älä muokkaa käsin; vartija tests/sv_aukot_p7.test.js vaatii täsmälleen saman parijoukon.
   Sääntö: sv-kielellä tunnettu nimi → nimi_sv; tuntematon (valmentajan oma) nimi → sellaisenaan. Sama malli kuin ip_pl_-lauseissa.
   Dual-export: module.exports || window.TM_TAITO_NIMI (+ window.tmTaitoNimi). */
(function (root) {
  'use strict';
  var SV = {
    "Kiihdytys": "Acceleration",
    "Nopeus": "Hastighet",
    "Tasapaino": "Balans",
    "Ketteryys": "Smidighet",
    "Kestävyys": "Uthållighet",
    "Voima": "Styrka",
    "Fyysinen läsnäolo": "Fysisk närvaro",
    "Rohkeus": "Mod",
    "Pallonhallinta": "Bollkontroll",
    "Kuljetus ahtaassa": "Bollföring på trång yta",
    "Kuljetus tilaan": "Bollföring i öppen yta",
    "Pallon suojaus": "Bollskydd",
    "Yhteispeli": "Samspel",
    "Lyhyt syöttö": "Kort passning",
    "Pitkä syöttö": "Lång passning",
    "Syöttövalikoima": "Passningsregister",
    "Syötön piilotus": "Dölja passningen",
    "Pallonkäsittely": "Bollbehandling",
    "Viimeistely": "Avslut",
    "Laukauksen tarkkuus": "Skottprecision",
    "Laukauksen voima": "Skottstyrka",
    "Laukauksen nopeus": "Skottsnabbhet",
    "Laukaustehokkuus": "Skotteffektivitet",
    "Laukausvalikoima": "Skottregister",
    "Pääpeli": "Nickspel",
    "Heikompi jalka": "Svagare fot",
    "Maalinteon halu": "Målvilja",
    "Asenne": "Attityd",
    "Työmoraali": "Arbetsmoral",
    "Tasaisuus": "Jämnhet",
    "Johtajuus": "Ledarskap",
    "Kommunikaatio": "Kommunikation",
    "Itseluottamus": "Självförtroende",
    "Kehonkieli": "Kroppsspråk",
    "Kuorman sieto": "Belastningstålighet",
    "Kehittymisen halu": "Utvecklingsvilja",
    "Sisäinen motivaatio": "Inre motivation",
    "Oppimiskyky": "Inlärningsförmåga",
    "Näkemys": "Spelsyn",
    "Päätöksenteko": "Beslutsfattande",
    "Ennakointi": "Förutseende",
    "Sijoittuminen": "Positionering",
    "Peli paineessa": "Spel under press",
    "Ajoitus": "Timing",
    "Monipuolisuus": "Mångsidighet",
    "1v1-puolustaminen": "1v1-försvar",
    "Puolustuspääpeli": "Nickspel i försvar",
    "Keskitysten torjunta": "Bryta inlägg",
    "Riistot": "Brytningar",
    "Blokit": "Blockeringar",
    "Puolustusvarmuus": "Försvarssäkerhet",
    "Puolustusennakointi": "Förutseende i försvar",
    "Puolustussijoittuminen": "Positionering i försvar",
    "Prässi": "Press",
    "Sinnikkyys": "Motståndskraft",
    "Joukkuerooli": "Lagroll",
    "Vuorovaikutus": "Interaktion"
  };
  function tmTaitoNimi(nimi, kieli) {
    if (kieli !== 'sv' || typeof nimi !== 'string') return nimi;
    var s = SV[nimi.trim()];
    return (typeof s === 'string' && s) ? s : nimi;
  }
  var API = { SV: SV, tmTaitoNimi: tmTaitoNimi };
  if (typeof module !== 'undefined' && module.exports) module.exports = API;
  else { root.TM_TAITO_NIMI = API; root.tmTaitoNimi = tmTaitoNimi; }
})(typeof window !== 'undefined' ? window : this);
