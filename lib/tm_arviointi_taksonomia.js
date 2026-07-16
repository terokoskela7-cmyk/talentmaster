// tm_arviointi_taksonomia.js — Palloliiton Player Development Card -taksonomia (KANONINEN, kansallinen standardi).
// Lähde: docs/PALLOLIITTO_PELAAJAKORTTI_TAKSONOMIA.md §3. ÄLÄ keksi omia kohteita — käytä Palloliiton.
// Puhdas data + avainhelperit (EI Firebase/DOM/normiriippuvuutta). Mitattu 1–5 lasketaan näkymässä (eerikkilaTaso/tkLajiTaso).
//
// Item: { avain (vakio), nimi_fi, nimi_en, dim ('D1'..'D5'), kategoria, mitattavissa:bool, mitta? }
//   mitattavissa:true → arvo TM-testistä (mitta kertoo mistä): { tyyppi:'d1osa', avain } (laskeD1Osaindeksit-avain)
//                       tai { tyyppi:'tklaji', laji } (tkLajiTaso-laji, tk_lajit_viimeisin[laji+'_s']).
//   mitattavissa:false → havaittu (VP/valmentaja/scout 1–5 tai ADAR). §7.22: aikuisten työkalu.

// Arviointiasteikko 1–5 (ikäryhmäsuhteutettu, identtinen TM-mitatun kanssa). §7.22: koodi = aikuisnäkymä.
var TM_ARVIOINTI_ASTEIKKO = {
  1: { koodi: 'P',  en: 'Poor',      fi: 'Kehityskohde' },
  2: { koodi: 'A',  en: 'Average',   fi: 'Vaatii työtä' },
  3: { koodi: 'G',  en: 'Good',      fi: 'Osaa' },
  4: { koodi: 'VG', en: 'Very good',  fi: 'Vahvuus' },
  5: { koodi: 'E',  en: 'Excellent', fi: 'Erinomainen' }
};

var TM_DIMENSIOT = {
  D1: { nimi_fi: 'Fyysinen',    nimi_en: 'Physical' },
  D2: { nimi_fi: 'Tekninen',    nimi_en: 'Technical' },
  D3: { nimi_fi: 'Psyykkinen',  nimi_en: 'Psychological' },
  D4: { nimi_fi: 'Peliäly',     nimi_en: 'Football sense' },
  D5: { nimi_fi: 'Sosiaalinen', nimi_en: 'Social' }
};

var ARVIOINTI_TAKSONOMIA = [
  // ── D1 Fyysinen ──
  { avain: 'acceleration', nimi_fi: 'Kiihdytys', nimi_en: 'Acceleration', dim: 'D1', kategoria: 'liike', mitattavissa: true, mitta: { tyyppi: 'd1osa', avain: 'kiihdytys' } },
  { avain: 'speed', nimi_fi: 'Nopeus', nimi_en: 'Speed', dim: 'D1', kategoria: 'liike', mitattavissa: true, mitta: { tyyppi: 'd1osa', avain: 'maksinopeus' } },
  { avain: 'balance', nimi_fi: 'Tasapaino', nimi_en: 'Balance', dim: 'D1', kategoria: 'liike', mitattavissa: false },
  { avain: 'mobility', nimi_fi: 'Ketteryys', nimi_en: 'Mobility', dim: 'D1', kategoria: 'liike', mitattavissa: true, mitta: { tyyppi: 'd1osa', avain: 'ketteryys' } },
  { avain: 'endurance', nimi_fi: 'Kestävyys', nimi_en: 'Endurance', dim: 'D1', kategoria: 'kunto', mitattavissa: true, mitta: { tyyppi: 'd1osa', avain: 'aerobinen' } },
  { avain: 'power', nimi_fi: 'Voima', nimi_en: 'Power', dim: 'D1', kategoria: 'kunto', mitattavissa: true, mitta: { tyyppi: 'd1osa', avain: 'voima' } },
  { avain: 'physical_presence', nimi_fi: 'Fyysinen läsnäolo', nimi_en: 'Physical presence', dim: 'D1', kategoria: 'kunto', mitattavissa: false },
  { avain: 'courage', nimi_fi: 'Rohkeus', nimi_en: 'Courage', dim: 'D1', kategoria: 'kunto', mitattavissa: false },

  // ── D2 Tekninen ──
  { avain: 'ball_control', nimi_fi: 'Pallonhallinta', nimi_en: 'Ball control', dim: 'D2', kategoria: 'pallonhallinta', mitattavissa: false },
  { avain: 'dribbling', nimi_fi: 'Kuljetus ahtaassa', nimi_en: 'Dribbling in tight areas', dim: 'D2', kategoria: 'pallonhallinta', mitattavissa: true, mitta: { tyyppi: 'tklaji', laji: 'pujottelu' } },
  { avain: 'running_with_ball', nimi_fi: 'Kuljetus tilaan', nimi_en: 'Running with the ball', dim: 'D2', kategoria: 'pallonhallinta', mitattavissa: false },
  { avain: 'ball_protection', nimi_fi: 'Pallon suojaus', nimi_en: 'Ball protection', dim: 'D2', kategoria: 'pallonhallinta', mitattavissa: false },
  { avain: 'link_up', nimi_fi: 'Yhteispeli', nimi_en: 'Link-up play', dim: 'D2', kategoria: 'pallonhallinta', mitattavissa: false },
  { avain: 'short_passing', nimi_fi: 'Lyhyt syöttö', nimi_en: 'Short passing', dim: 'D2', kategoria: 'syotto', mitattavissa: true, mitta: { tyyppi: 'tklaji', laji: 'syotto' } },
  { avain: 'long_passing', nimi_fi: 'Pitkä syöttö', nimi_en: 'Long passing', dim: 'D2', kategoria: 'syotto', mitattavissa: false },
  { avain: 'passing_variety', nimi_fi: 'Syöttövalikoima', nimi_en: 'Passing variety', dim: 'D2', kategoria: 'syotto', mitattavissa: false },
  { avain: 'hide_pass', nimi_fi: 'Syötön piilotus', nimi_en: 'Ability to hide the pass', dim: 'D2', kategoria: 'syotto', mitattavissa: false },
  { avain: 'ball_striking', nimi_fi: 'Pallonkäsittely', nimi_en: 'Ball striking', dim: 'D2', kategoria: 'syotto', mitattavissa: true, mitta: { tyyppi: 'tklaji', laji: 'ponnauttelu' } },
  { avain: 'finishing', nimi_fi: 'Viimeistely', nimi_en: 'Finishing', dim: 'D2', kategoria: 'viimeistely', mitattavissa: true, mitta: { tyyppi: 'tklaji', laji: 'kuljetus_laukaus' } },
  { avain: 'shooting_accuracy', nimi_fi: 'Laukauksen tarkkuus', nimi_en: 'Shooting accuracy', dim: 'D2', kategoria: 'viimeistely', mitattavissa: false },
  { avain: 'shooting_power', nimi_fi: 'Laukauksen voima', nimi_en: 'Shooting power', dim: 'D2', kategoria: 'viimeistely', mitattavissa: false },
  { avain: 'shooting_quickness', nimi_fi: 'Laukauksen nopeus', nimi_en: 'Shooting quickness', dim: 'D2', kategoria: 'viimeistely', mitattavissa: false },
  { avain: 'shooting_efficiency', nimi_fi: 'Laukaustehokkuus', nimi_en: 'Shooting efficiency', dim: 'D2', kategoria: 'viimeistely', mitattavissa: false },
  { avain: 'shooting_variety', nimi_fi: 'Laukausvalikoima', nimi_en: 'Shooting variety', dim: 'D2', kategoria: 'viimeistely', mitattavissa: false },
  { avain: 'heading', nimi_fi: 'Pääpeli', nimi_en: 'Heading', dim: 'D2', kategoria: 'viimeistely', mitattavissa: false },
  { avain: 'weaker_foot', nimi_fi: 'Heikompi jalka', nimi_en: 'Weaker foot', dim: 'D2', kategoria: 'viimeistely', mitattavissa: false },

  // ── D3 Psyykkinen ──
  { avain: 'scoring_drive', nimi_fi: 'Maalinteon halu', nimi_en: 'Scoring drive', dim: 'D3', kategoria: 'kilpailullisuus', mitattavissa: false },
  { avain: 'attitude', nimi_fi: 'Asenne', nimi_en: 'Attitude', dim: 'D3', kategoria: 'kilpailullisuus', mitattavissa: false },
  { avain: 'work_ethic', nimi_fi: 'Työmoraali', nimi_en: 'Work ethic', dim: 'D3', kategoria: 'kilpailullisuus', mitattavissa: false },
  { avain: 'consistency', nimi_fi: 'Tasaisuus', nimi_en: 'Consistency', dim: 'D3', kategoria: 'kilpailullisuus', mitattavissa: false },
  { avain: 'leadership', nimi_fi: 'Johtajuus', nimi_en: 'Leadership', dim: 'D3', kategoria: 'psykologia', mitattavissa: false },
  { avain: 'communication', nimi_fi: 'Kommunikaatio', nimi_en: 'Communication', dim: 'D3', kategoria: 'psykologia', mitattavissa: false },
  { avain: 'confidence', nimi_fi: 'Itseluottamus', nimi_en: 'Confidence', dim: 'D3', kategoria: 'psykologia', mitattavissa: false },
  { avain: 'body_language', nimi_fi: 'Kehonkieli', nimi_en: 'Body language', dim: 'D3', kategoria: 'psykologia', mitattavissa: false },
  { avain: 'training_load', nimi_fi: 'Kuorman sieto', nimi_en: 'Ability to take on training load', dim: 'D3', kategoria: 'harjoitusasenne', mitattavissa: false },
  { avain: 'desire_improve', nimi_fi: 'Kehittymisen halu', nimi_en: 'Desire to be better by training', dim: 'D3', kategoria: 'harjoitusasenne', mitattavissa: false },
  { avain: 'inner_motivation', nimi_fi: 'Sisäinen motivaatio', nimi_en: 'Inner motivation', dim: 'D3', kategoria: 'harjoitusasenne', mitattavissa: false },
  { avain: 'learning_ability', nimi_fi: 'Oppimiskyky', nimi_en: 'Learning ability', dim: 'D3', kategoria: 'harjoitusasenne', mitattavissa: false },

  // ── D4 Peliäly (Football sense + Defensive) ──
  { avain: 'vision', nimi_fi: 'Näkemys', nimi_en: 'Vision', dim: 'D4', kategoria: 'football_sense', mitattavissa: false },
  { avain: 'decision_making', nimi_fi: 'Päätöksenteko', nimi_en: 'Decision making', dim: 'D4', kategoria: 'football_sense', mitattavissa: false },
  { avain: 'anticipation', nimi_fi: 'Ennakointi', nimi_en: 'Anticipation', dim: 'D4', kategoria: 'football_sense', mitattavissa: false },
  { avain: 'positioning', nimi_fi: 'Sijoittuminen', nimi_en: 'Positioning', dim: 'D4', kategoria: 'football_sense', mitattavissa: false },
  { avain: 'play_under_pressure', nimi_fi: 'Peli paineessa', nimi_en: 'Play under pressure', dim: 'D4', kategoria: 'football_sense', mitattavissa: false },
  { avain: 'timing', nimi_fi: 'Ajoitus', nimi_en: 'Timing', dim: 'D4', kategoria: 'football_sense', mitattavissa: false },
  { avain: 'versatility', nimi_fi: 'Monipuolisuus', nimi_en: 'Versatility', dim: 'D4', kategoria: 'football_sense', mitattavissa: false },
  { avain: 'defending_1v1', nimi_fi: '1v1-puolustaminen', nimi_en: '1v1 defending', dim: 'D4', kategoria: 'puolustus', mitattavissa: false },
  { avain: 'defensive_heading', nimi_fi: 'Puolustuspääpeli', nimi_en: 'Defensive heading', dim: 'D4', kategoria: 'puolustus', mitattavissa: false },
  { avain: 'clearing_crosses', nimi_fi: 'Keskitysten torjunta', nimi_en: 'Clearing crosses', dim: 'D4', kategoria: 'puolustus', mitattavissa: false },
  { avain: 'tackling', nimi_fi: 'Riistot', nimi_en: 'Ability to tackle', dim: 'D4', kategoria: 'puolustus', mitattavissa: false },
  { avain: 'blocking_shots', nimi_fi: 'Blokit', nimi_en: 'Blocking shots', dim: 'D4', kategoria: 'puolustus', mitattavissa: false },
  { avain: 'defensive_reliability', nimi_fi: 'Puolustusvarmuus', nimi_en: 'Defensive reliability', dim: 'D4', kategoria: 'puolustus', mitattavissa: false },
  { avain: 'defensive_anticipation', nimi_fi: 'Puolustusennakointi', nimi_en: 'Defensive anticipation', dim: 'D4', kategoria: 'puolustus', mitattavissa: false },
  { avain: 'defensive_positioning', nimi_fi: 'Puolustussijoittuminen', nimi_en: 'Defensive positioning', dim: 'D4', kategoria: 'puolustus', mitattavissa: false },
  { avain: 'pressing', nimi_fi: 'Prässi', nimi_en: 'Pressing', dim: 'D4', kategoria: 'puolustus', mitattavissa: false },
  { avain: 'resilience', nimi_fi: 'Sinnikkyys', nimi_en: 'Resilience', dim: 'D4', kategoria: 'puolustus', mitattavissa: false },

  // ── D5 Sosiaalinen (Leadership/Communication jaettu D3:n kanssa → tässä joukkuerooli + vuorovaikutus) ──
  { avain: 'team_role', nimi_fi: 'Joukkuerooli', nimi_en: 'Team role', dim: 'D5', kategoria: 'sosiaalinen', mitattavissa: false },
  { avain: 'social_interaction', nimi_fi: 'Vuorovaikutus', nimi_en: 'Interaction', dim: 'D5', kategoria: 'sosiaalinen', mitattavissa: false }
];

// ── Helperit (puhtaat) ──
function tmTaksonomiaDim(dim) { return ARVIOINTI_TAKSONOMIA.filter(function (i) { return i.dim === dim; }); }
function tmTaksonomiaByAvain(avain) { for (var i = 0; i < ARVIOINTI_TAKSONOMIA.length; i++) { if (ARVIOINTI_TAKSONOMIA[i].avain === avain) return ARVIOINTI_TAKSONOMIA[i]; } return null; }
function tmTaksonomiaMitattavat() { return ARVIOINTI_TAKSONOMIA.filter(function (i) { return i.mitattavissa; }); }
function tmTaksonomiaHavaittavat() { return ARVIOINTI_TAKSONOMIA.filter(function (i) { return !i.mitattavissa; }); }

// Mitattu → taksonomia-avain -mäppäys (testId/laji → avain). Käänteinen (mitta-kentästä) → näkymän kytkentä + testi.
// Palauttaa { d1osa: {osaindeksiAvain: taksonomiaAvain}, tklaji: {laji: taksonomiaAvain} }.
function tmMitattuMappaus() {
  var out = { d1osa: {}, tklaji: {} };
  tmTaksonomiaMitattavat().forEach(function (i) {
    if (!i.mitta) return;
    if (i.mitta.tyyppi === 'd1osa') out.d1osa[i.mitta.avain] = i.avain;
    else if (i.mitta.tyyppi === 'tklaji') out.tklaji[i.mitta.laji] = i.avain;
  });
  return out;
}

// ── Pääteemat (dim + kategoria → navigoitava teema; johdettu taksonomiasta) ──
var _KATEGORIA_NIMI = {
  liike: 'Liike', kunto: 'Kunto & fyysinen peli',
  pallonhallinta: 'Pallonhallinta', syotto: 'Syöttö', viimeistely: 'Viimeistely',
  kilpailullisuus: 'Kilpailullisuus', psykologia: 'Psykologia', harjoitusasenne: 'Harjoitusasenne',
  football_sense: 'Peliäly', puolustus: 'Puolustustaidot', sosiaalinen: 'Sosiaalinen'
};
function tmKategoriaNimi(k) { return _KATEGORIA_NIMI[k] || (k ? (k.charAt(0).toUpperCase() + k.slice(1)) : k); }
// Teema-avain = dim + '_' + kategoria (esim. 'D1_liike'). Palauttaa uniikit teemat taksonomian järjestyksessä.
function tmTeemat(taksonomia) {
  taksonomia = taksonomia || ARVIOINTI_TAKSONOMIA;
  var seen = {}, out = [];
  taksonomia.forEach(function (i) {
    var avain = i.dim + '_' + i.kategoria;
    if (!seen[avain]) { seen[avain] = { avain: avain, dim: i.dim, kategoria: i.kategoria, nimi: i.dim + ' · ' + tmKategoriaNimi(i.kategoria), n: 0 }; out.push(seen[avain]); }
    seen[avain].n++;
  });
  return out;
}
function tmTeemaKohteet(teemaAvain, taksonomia) {
  taksonomia = taksonomia || ARVIOINTI_TAKSONOMIA;
  return taksonomia.filter(function (i) { return (i.dim + '_' + i.kategoria) === teemaAvain; });
}

// ── Arviointikehykset (kv-avoimuus): taksonomia + asteikko kehyskohtaisia. Palloliitto = oletusstandardi (§0). ──
// Eri maa/liitto voi lisätä oman kehyksen (nimi/asteikko/taksonomia) ilman muun koodin muutosta. UI hakee kehysavaimella.
// ── 2c: ADAR → havaittu peliäly (D4). Johdetaan render-ajassa pikakentästä adar_viimeisin (§26: EI uutta kirjoitusta). ──
// ADAR-dimensio (assess/decide/act/reassess) → havaittu D4-taksonomia-avain.
// Yksi ADAR-arvo voi ruokkia useaa havaittua kohdetta (assess = pelin luku → sekä ennakointi että näkemys).
var ADAR_HAVAITTU_MAP = {
  a:  ['anticipation', 'vision'],       // Assess  → Ennakointi + Näkemys
  d:  ['decision_making'],              // Decide  → Päätöksenteko
  ac: ['play_under_pressure'],          // Act     → Peli paineessa (toteutus pelitilanteessa)
  r:  ['positioning']                   // Reassess→ Sijoittuminen
};
// P3 — ADAR-ikäportti (§7 LUKITTU: kolmiportainen ikävaiheittain, sama kuin kortin PELI-välilehti).
// U8–12 (Leikkijä) → vain Assess (a) · U13–15 (Rakentaja) → Assess+Decide+Act (a,d,ac) · U16+ (Showcase) → kaikki.
// ika==null → kaikki (ettei tuntematon ikä piilota dataa). Palauttaa sallitut ADAR-dimit dims-järjestyksessä.
function tmAdarIkaTier(ika) {
  if (ika == null || ika >= 16) return ['a', 'd', 'ac', 'r'];
  if (ika >= 13) return ['a', 'd', 'ac'];
  return ['a'];
}
// adar_viimeisin → { <avain>: {arvo(1–3), lahde:'adar', pvm} }. null jos ei ADAR-dataa.
// I1 (§7 LUKITTU): ADAR pysyy 1–3-asteikolla (pikakortti-kaanon). EI muunnosta 1–5:een. arvo ≤2 = kehityskohde
// (IDP-kandidaatti), arvo 3 = hallitsee. Poistettu P1:n 1–5-oletukset; poikkeava >3-data (vanha 1–5/1–10) capataan 3:een.
// P3 valinnainen opts (taaksepäin-yhteensopiva — ilman opts:ia käytös ennallaan):
//   opts.ika → suodata ADAR-dimit tmAdarIkaTier:llä (ikäportti) · opts.sallitut → eksplisiittinen sallittu-taulukko
//   opts.adarMap → aktiivisen kehyksen ADAR-mäppäys (oletus globaali ADAR_HAVAITTU_MAP; kehys-pluggability).
function tmAdarHavaittu(adarViimeisin, opts) {
  if (!adarViimeisin) return null;
  opts = opts || {};
  var map = opts.adarMap || ADAR_HAVAITTU_MAP;
  var sallitut = opts.sallitut || (opts.ika !== undefined ? tmAdarIkaTier(opts.ika) : ['a', 'd', 'ac', 'r']);
  var norm = function (v) { if (v == null) return null; return Math.max(1, Math.min(3, Math.round(v))); };
  var pvm = adarViimeisin.pvm || null;
  var out = {};
  sallitut.forEach(function (k) {
    var arvo = norm(adarViimeisin[k]);
    if (arvo == null) return;
    (map[k] || []).forEach(function (avain) {
      out[avain] = { arvo: arvo, lahde: 'adar', pvm: pvm };
    });
  });
  return Object.keys(out).length ? out : null;
}

var ARVIOINTI_KEHYS_OLETUS = 'palloliitto';
var ARVIOINTI_KEHYKSET = {
  // adarMap kehyksen sisällä → kv-kehykset voivat määritellä oman ADAR-mäppäyksensä tai jättää pois.
  palloliitto: { avain: 'palloliitto', nimi: 'Palloliitto', asteikko: TM_ARVIOINTI_ASTEIKKO, taksonomia: ARVIOINTI_TAKSONOMIA, adarMap: ADAR_HAVAITTU_MAP }
  // muu_liitto: { avain, nimi, asteikko:{...}, taksonomia:[...], adarMap:{...} }  ← rakenne auki, ei vielä toteutettuja
};
function tmKehys(avain) { return ARVIOINTI_KEHYKSET[avain] || ARVIOINTI_KEHYKSET[ARVIOINTI_KEHYS_OLETUS]; }
function tmKehysTaksonomia(avain) { return tmKehys(avain).taksonomia; }

if (typeof module !== 'undefined' && module.exports) {
  module.exports = {
    ARVIOINTI_TAKSONOMIA: ARVIOINTI_TAKSONOMIA,
    TM_ARVIOINTI_ASTEIKKO: TM_ARVIOINTI_ASTEIKKO,
    TM_DIMENSIOT: TM_DIMENSIOT,
    tmTaksonomiaDim: tmTaksonomiaDim,
    tmTaksonomiaByAvain: tmTaksonomiaByAvain,
    tmTaksonomiaMitattavat: tmTaksonomiaMitattavat,
    tmTaksonomiaHavaittavat: tmTaksonomiaHavaittavat,
    tmMitattuMappaus: tmMitattuMappaus,
    tmKategoriaNimi: tmKategoriaNimi,
    tmTeemat: tmTeemat,
    tmTeemaKohteet: tmTeemaKohteet,
    ARVIOINTI_KEHYKSET: ARVIOINTI_KEHYKSET,
    ARVIOINTI_KEHYS_OLETUS: ARVIOINTI_KEHYS_OLETUS,
    tmKehys: tmKehys,
    tmKehysTaksonomia: tmKehysTaksonomia,
    ADAR_HAVAITTU_MAP: ADAR_HAVAITTU_MAP,
    tmAdarHavaittu: tmAdarHavaittu,
    tmAdarIkaTier: tmAdarIkaTier
  };
}
