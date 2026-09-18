// tm_arviointi_taksonomia.js — Palloliiton Player Development Card -taksonomia (KANONINEN, kansallinen standardi).
// Lähde: docs/PALLOLIITTO_PELAAJAKORTTI_TAKSONOMIA.md §3. ÄLÄ keksi omia kohteita — käytä Palloliiton.
// Puhdas data + avainhelperit (EI Firebase/DOM/normiriippuvuutta). Mitattu 1–5 lasketaan näkymässä (eerikkilaTaso/tkLajiTaso).
//
// Item: { avain (vakio), nimi_fi, nimi_en, nimi_sv, dim ('D1'..'D5'), kategoria, mitattavissa:bool, mitta? }
//   nimi_* = puhdasta dataa; KIELIVALINTA TEHDÄÄN NÄKYMÄSSÄ (VP `_taksNimi`), ei täällä (tiedosto pysyy DOM-/kielineutraalina).
//   mitattavissa:true → arvo TM-testistä (mitta kertoo mistä): { tyyppi:'d1osa', avain } (laskeD1Osaindeksit-avain)
//                       tai { tyyppi:'tklaji', laji } (tkLajiTaso-laji, tk_lajit_viimeisin[laji+'_s']).
//   mitattavissa:false → havaittu (VP/valmentaja/scout 1–5 tai ADAR). §7.22: aikuisten työkalu.

// Arviointiasteikko 1–5 (ikäryhmäsuhteutettu, identtinen TM-mitatun kanssa). §7.22: koodi = aikuisnäkymä.
var TM_ARVIOINTI_ASTEIKKO = {
  1: { koodi: 'P',  en: 'Poor',      fi: 'Kehityskohde',  sv: 'Utvecklingsområde' },
  2: { koodi: 'A',  en: 'Average',   fi: 'Vaatii työtä',  sv: 'Kräver arbete' },
  3: { koodi: 'G',  en: 'Good',      fi: 'Osaa',          sv: 'Behärskar' },
  4: { koodi: 'VG', en: 'Very good',  fi: 'Vahvuus',      sv: 'Styrka' },
  5: { koodi: 'E',  en: 'Excellent', fi: 'Erinomainen',   sv: 'Utmärkt' }
};

var TM_DIMENSIOT = {
  D1: { nimi_fi: 'Fyysinen',    nimi_en: 'Physical',       nimi_sv: 'Fysisk' },
  D2: { nimi_fi: 'Tekninen',    nimi_en: 'Technical',      nimi_sv: 'Teknisk' },
  D3: { nimi_fi: 'Psyykkinen',  nimi_en: 'Psychological',  nimi_sv: 'Psykisk' },
  D4: { nimi_fi: 'Peliäly',     nimi_en: 'Football sense', nimi_sv: 'Spelintelligens' },
  D5: { nimi_fi: 'Sosiaalinen', nimi_en: 'Social',         nimi_sv: 'Social' }
};

// kuvaus_fi (R-selitteet): valmentajakielinen selite per attribuutti ("mitä tässä katsotaan"). Lähde:
// docs/ARVIOINTI_TAKSONOMIA_KUVAUKSET.md (FA Player Scouting Template 2026 + valmentajakieli). Näytetään ⓘ-vihjeenä
// arviointi-UI:ssa. Asteikko aina ikäluokkaan verrattuna (1 Heikko … 5 Erinomainen). Sisältöä, ei dataa (ei Firestoressa).
var ARVIOINTI_TAKSONOMIA = [
  // ── D1 Fyysinen ──
  { avain: 'acceleration', nimi_fi: 'Kiihdytys', nimi_en: 'Acceleration', nimi_sv: 'Acceleration', dim: 'D1', kategoria: 'liike', mitattavissa: true, mitta: { tyyppi: 'd1osa', avain: 'kiihdytys' }, kuvaus_fi: 'Ensimmäiset askeleet: kyky karata irti tai saada kiinni.' },
  { avain: 'speed', nimi_fi: 'Nopeus', nimi_en: 'Speed', nimi_sv: 'Hastighet', dim: 'D1', kategoria: 'liike', mitattavissa: true, mitta: { tyyppi: 'd1osa', avain: 'maksinopeus' }, kuvaus_fi: 'Huippunopeus täydellä juoksulla.' },
  { avain: 'balance', nimi_fi: 'Tasapaino', nimi_en: 'Balance', nimi_sv: 'Balans', dim: 'D1', kategoria: 'liike', mitattavissa: false, kuvaus_fi: 'Kehonhallinta ja tasapaino liikkeessä, käännöksissä ja kontaktissa.' },
  { avain: 'mobility', nimi_fi: 'Ketteryys', nimi_en: 'Mobility', nimi_sv: 'Smidighet', dim: 'D1', kategoria: 'liike', mitattavissa: true, mitta: { tyyppi: 'd1osa', avain: 'ketteryys' }, kuvaus_fi: 'Nopeat suunnanmuutokset ja jalkatyö ahtaassa tilassa.' },
  { avain: 'endurance', nimi_fi: 'Kestävyys', nimi_en: 'Endurance', nimi_sv: 'Uthållighet', dim: 'D1', kategoria: 'kunto', mitattavissa: true, mitta: { tyyppi: 'd1osa', avain: 'aerobinen' }, kuvaus_fi: 'Kyky toistaa korkean intensiteetin suorituksia koko ottelun ajan.' },
  { avain: 'power', nimi_fi: 'Voima', nimi_en: 'Power', nimi_sv: 'Styrka', dim: 'D1', kategoria: 'kunto', mitattavissa: true, mitta: { tyyppi: 'd1osa', avain: 'voima' }, kuvaus_fi: 'Vahvuus taklauksessa ja taklattuna; kaksinkamppailujen kesto.' },
  { avain: 'physical_presence', nimi_fi: 'Fyysinen läsnäolo', nimi_en: 'Physical presence', nimi_sv: 'Fysisk närvaro', dim: 'D1', kategoria: 'kunto', mitattavissa: false, kuvaus_fi: 'Kehon käyttö tilan ottamiseen ja pitämiseen.' },
  { avain: 'courage', nimi_fi: 'Rohkeus', nimi_en: 'Courage', nimi_sv: 'Mod', dim: 'D1', kategoria: 'kunto', mitattavissa: false, kuvaus_fi: 'Uskallus mennä kaksinkamppailuun ja ottaa kontakti pelkäämättä.' },

  // ── D2 Tekninen ──
  { avain: 'ball_control', nimi_fi: 'Pallonhallinta', nimi_en: 'Ball control', nimi_sv: 'Bollkontroll', dim: 'D2', kategoria: 'pallonhallinta', mitattavissa: false, kuvaus_fi: 'Ensikosketus, vastaanotto ja kääntyminen.' },
  { avain: 'dribbling', nimi_fi: 'Kuljetus ahtaassa', nimi_en: 'Dribbling in tight areas', nimi_sv: 'Bollföring på trång yta', dim: 'D2', kategoria: 'pallonhallinta', mitattavissa: true, mitta: { tyyppi: 'tklaji', laji: 'pujottelu' }, kuvaus_fi: 'Pallonhallinta ja harhautukset ahtaassa tilassa.' },
  { avain: 'running_with_ball', nimi_fi: 'Kuljetus tilaan', nimi_en: 'Running with the ball', nimi_sv: 'Bollföring i öppen yta', dim: 'D2', kategoria: 'pallonhallinta', mitattavissa: false, kuvaus_fi: 'Pallon kuljettaminen vauhdilla avoimeen tilaan.' },
  { avain: 'ball_protection', nimi_fi: 'Pallon suojaus', nimi_en: 'Ball protection', nimi_sv: 'Bollskydd', dim: 'D2', kategoria: 'pallonhallinta', mitattavissa: false, kuvaus_fi: 'Pallon suojaaminen keholla paineen alla.' },
  { avain: 'link_up', nimi_fi: 'Yhteispeli', nimi_en: 'Link-up play', nimi_sv: 'Samspel', dim: 'D2', kategoria: 'pallonhallinta', mitattavissa: false, kuvaus_fi: 'Seinät, kolmiot ja yhdistelmäpeli kanssapelaajan kanssa.' },
  { avain: 'short_passing', nimi_fi: 'Lyhyt syöttö', nimi_en: 'Short passing', nimi_sv: 'Kort passning', dim: 'D2', kategoria: 'syotto', mitattavissa: true, mitta: { tyyppi: 'tklaji', laji: 'syotto' }, kuvaus_fi: 'Tarkkuus ja ajoitus lyhyissä syötöissä.' },
  { avain: 'long_passing', nimi_fi: 'Pitkä syöttö', nimi_en: 'Long passing', nimi_sv: 'Lång passning', dim: 'D2', kategoria: 'syotto', mitattavissa: false, kuvaus_fi: 'Pitkän ja suunnanvaihtosyötön tarkkuus.' },
  { avain: 'passing_variety', nimi_fi: 'Syöttövalikoima', nimi_en: 'Passing variety', nimi_sv: 'Passningsregister', dim: 'D2', kategoria: 'syotto', mitattavissa: false, kuvaus_fi: 'Erityyppisten syöttöjen kirjo tilanteen mukaan.' },
  { avain: 'hide_pass', nimi_fi: 'Syötön piilotus', nimi_en: 'Ability to hide the pass', nimi_sv: 'Dölja passningen', dim: 'D2', kategoria: 'syotto', mitattavissa: false, kuvaus_fi: 'Syötön naamiointi ja ajoitus.' },
  { avain: 'ball_striking', nimi_fi: 'Pallonkäsittely', nimi_en: 'Ball striking', nimi_sv: 'Bollbehandling', dim: 'D2', kategoria: 'syotto', mitattavissa: true, mitta: { tyyppi: 'tklaji', laji: 'ponnauttelu' }, kuvaus_fi: 'Yleinen pallon käsittelyvarmuus ja lyöntitekniikka.' },
  { avain: 'finishing', nimi_fi: 'Viimeistely', nimi_en: 'Finishing', nimi_sv: 'Avslut', dim: 'D2', kategoria: 'viimeistely', mitattavissa: true, mitta: { tyyppi: 'tklaji', laji: 'kuljetus_laukaus' }, kuvaus_fi: 'Maalintekotehokkuus maalipaikoista.' },
  { avain: 'shooting_accuracy', nimi_fi: 'Laukauksen tarkkuus', nimi_en: 'Shooting accuracy', nimi_sv: 'Skottprecision', dim: 'D2', kategoria: 'viimeistely', mitattavissa: false, kuvaus_fi: 'Laukauksen osuvuus maaliin.' },
  { avain: 'shooting_power', nimi_fi: 'Laukauksen voima', nimi_en: 'Shooting power', nimi_sv: 'Skottstyrka', dim: 'D2', kategoria: 'viimeistely', mitattavissa: false, kuvaus_fi: 'Laukauksen voima ja pallon nopeus.' },
  { avain: 'shooting_quickness', nimi_fi: 'Laukauksen nopeus', nimi_en: 'Shooting quickness', nimi_sv: 'Skottsnabbhet', dim: 'D2', kategoria: 'viimeistely', mitattavissa: false, kuvaus_fi: 'Laukauksen irrotusnopeus paineessa.' },
  { avain: 'shooting_efficiency', nimi_fi: 'Laukaustehokkuus', nimi_en: 'Shooting efficiency', nimi_sv: 'Skotteffektivitet', dim: 'D2', kategoria: 'viimeistely', mitattavissa: false, kuvaus_fi: 'Maalit suhteessa laukauksiin.' },
  { avain: 'shooting_variety', nimi_fi: 'Laukausvalikoima', nimi_en: 'Shooting variety', nimi_sv: 'Skottregister', dim: 'D2', kategoria: 'viimeistely', mitattavissa: false, kuvaus_fi: 'Erilaiset laukaustyypit tilanteen mukaan.' },
  { avain: 'heading', nimi_fi: 'Pääpeli', nimi_en: 'Heading', nimi_sv: 'Nickspel', dim: 'D2', kategoria: 'viimeistely', mitattavissa: false, kuvaus_fi: 'Pallo-ohjaus ja maalinteko päällä.' },
  { avain: 'weaker_foot', nimi_fi: 'Heikompi jalka', nimi_en: 'Weaker foot', nimi_sv: 'Svagare fot', dim: 'D2', kategoria: 'viimeistely', mitattavissa: false, kuvaus_fi: 'Heikomman jalan käyttövarmuus.' },

  // ── D3 Psyykkinen ──
  { avain: 'scoring_drive', nimi_fi: 'Maalinteon halu', nimi_en: 'Scoring drive', nimi_sv: 'Målvilja', dim: 'D3', kategoria: 'kilpailullisuus', mitattavissa: false, kuvaus_fi: 'Valmius taistella, mennä maalille ja maksaa hinta maaleista.' },
  { avain: 'attitude', nimi_fi: 'Asenne', nimi_en: 'Attitude', nimi_sv: 'Attityd', dim: 'D3', kategoria: 'kilpailullisuus', mitattavissa: false, kuvaus_fi: 'Kypsyystaso ja suhtautuminen: hyvin kehittynyt vai ei.' },
  { avain: 'work_ethic', nimi_fi: 'Työmoraali', nimi_en: 'Work ethic', nimi_sv: 'Arbetsmoral', dim: 'D3', kategoria: 'kilpailullisuus', mitattavissa: false, kuvaus_fi: 'Kova, pitkäjänteinen työ; tekee enemmän kuin pyydetään.' },
  { avain: 'consistency', nimi_fi: 'Tasaisuus', nimi_en: 'Consistency', nimi_sv: 'Jämnhet', dim: 'D3', kategoria: 'kilpailullisuus', mitattavissa: false, kuvaus_fi: 'Suoritustason tasaisuus ottelusta toiseen.' },
  { avain: 'leadership', nimi_fi: 'Johtajuus', nimi_en: 'Leadership', nimi_sv: 'Ledarskap', dim: 'D3', kategoria: 'psykologia', mitattavissa: false, kuvaus_fi: 'Kenttäjohtajuus; levittää voittamisen mentaliteettia.' },
  { avain: 'communication', nimi_fi: 'Kommunikaatio', nimi_en: 'Communication', nimi_sv: 'Kommunikation', dim: 'D3', kategoria: 'psykologia', mitattavissa: false, kuvaus_fi: 'Kypsä kommunikaatio pelaajien ja valmentajien kanssa.' },
  { avain: 'confidence', nimi_fi: 'Itseluottamus', nimi_en: 'Confidence', nimi_sv: 'Självförtroende', dim: 'D3', kategoria: 'psykologia', mitattavissa: false, kuvaus_fi: 'Usko omaan tekemiseen paineen alla.' },
  { avain: 'body_language', nimi_fi: 'Kehonkieli', nimi_en: 'Body language', nimi_sv: 'Kroppsspråk', dim: 'D3', kategoria: 'psykologia', mitattavissa: false, kuvaus_fi: 'Ryhti ja reagointi vastoinkäymisiin.' },
  { avain: 'training_load', nimi_fi: 'Kuorman sieto', nimi_en: 'Ability to take on training load', nimi_sv: 'Belastningstålighet', dim: 'D3', kategoria: 'harjoitusasenne', mitattavissa: false, kuvaus_fi: 'Kyky kestää harjoituskuorma.' },
  { avain: 'desire_improve', nimi_fi: 'Kehittymisen halu', nimi_en: 'Desire to be better by training', nimi_sv: 'Utvecklingsvilja', dim: 'D3', kategoria: 'harjoitusasenne', mitattavissa: false, kuvaus_fi: 'Halu kehittyä harjoittelemalla.' },
  { avain: 'inner_motivation', nimi_fi: 'Sisäinen motivaatio', nimi_en: 'Inner motivation', nimi_sv: 'Inre motivation', dim: 'D3', kategoria: 'harjoitusasenne', mitattavissa: false, kuvaus_fi: 'Oma-aloitteinen tekemisen palo.' },
  { avain: 'learning_ability', nimi_fi: 'Oppimiskyky', nimi_en: 'Learning ability', nimi_sv: 'Inlärningsförmåga', dim: 'D3', kategoria: 'harjoitusasenne', mitattavissa: false, kuvaus_fi: 'Kyky ottaa ohjeet vastaan ja soveltaa niitä.' },

  // ── D4 Peliäly (Football sense + Defensive) ──
  { avain: 'vision', nimi_fi: 'Näkemys', nimi_en: 'Vision', nimi_sv: 'Spelsyn', dim: 'D4', kategoria: 'football_sense', mitattavissa: false, kuvaus_fi: 'Näkee syöttömahdollisuudet, lyhyet ja pitkät.' },
  { avain: 'decision_making', nimi_fi: 'Päätöksenteko', nimi_en: 'Decision making', nimi_sv: 'Beslutsfattande', dim: 'D4', kategoria: 'football_sense', mitattavissa: false, kuvaus_fi: 'Oikeat valinnat oikeaan aikaan.' },
  { avain: 'anticipation', nimi_fi: 'Ennakointi', nimi_en: 'Anticipation', nimi_sv: 'Förutseende', dim: 'D4', kategoria: 'football_sense', mitattavissa: false, kuvaus_fi: 'Proaktiivisuus: lukee tilanteen etukäteen.' },
  { avain: 'positioning', nimi_fi: 'Sijoittuminen', nimi_en: 'Positioning', nimi_sv: 'Positionering', dim: 'D4', kategoria: 'football_sense', mitattavissa: false, kuvaus_fi: 'Oikea paikka sekä hyökätessä että puolustaessa.' },
  { avain: 'play_under_pressure', nimi_fi: 'Peli paineessa', nimi_en: 'Play under pressure', nimi_sv: 'Spel under press', dim: 'D4', kategoria: 'football_sense', mitattavissa: false, kuvaus_fi: 'Rauhallisuus ja oikeat ratkaisut paineen alla.' },
  { avain: 'timing', nimi_fi: 'Ajoitus', nimi_en: 'Timing', nimi_sv: 'Timing', dim: 'D4', kategoria: 'football_sense', mitattavissa: false, kuvaus_fi: 'Liikkeiden ja juoksujen ajoitus.' },
  { avain: 'versatility', nimi_fi: 'Monipuolisuus', nimi_en: 'Versatility', nimi_sv: 'Mångsidighet', dim: 'D4', kategoria: 'football_sense', mitattavissa: false, kuvaus_fi: 'Kyky pelata useassa roolissa tai pelipaikassa.' },
  { avain: 'defending_1v1', nimi_fi: '1v1-puolustaminen', nimi_en: '1v1 defending', nimi_sv: '1v1-försvar', dim: 'D4', kategoria: 'puolustus', mitattavissa: false, kuvaus_fi: 'Yksi vastaan yksi -puolustustilanteiden hallinta.' },
  { avain: 'defensive_heading', nimi_fi: 'Puolustuspääpeli', nimi_en: 'Defensive heading', nimi_sv: 'Nickspel i försvar', dim: 'D4', kategoria: 'puolustus', mitattavissa: false, kuvaus_fi: 'Ilmatilan hallinta ja pallon puhdistaminen päällä puolustaessa.' },
  { avain: 'clearing_crosses', nimi_fi: 'Keskitysten torjunta', nimi_en: 'Clearing crosses', nimi_sv: 'Bryta inlägg', dim: 'D4', kategoria: 'puolustus', mitattavissa: false, kuvaus_fi: 'Keskitysten katkaisu ja ilmatilan hallinta.' },
  { avain: 'tackling', nimi_fi: 'Riistot', nimi_en: 'Ability to tackle', nimi_sv: 'Brytningar', dim: 'D4', kategoria: 'puolustus', mitattavissa: false, kuvaus_fi: 'Ajoitus ja tekniikka pallon riistossa.' },
  { avain: 'blocking_shots', nimi_fi: 'Blokit', nimi_en: 'Blocking shots', nimi_sv: 'Blockeringar', dim: 'D4', kategoria: 'puolustus', mitattavissa: false, kuvaus_fi: 'Kehon asettaminen laukausten eteen.' },
  { avain: 'defensive_reliability', nimi_fi: 'Puolustusvarmuus', nimi_en: 'Defensive reliability', nimi_sv: 'Försvarssäkerhet', dim: 'D4', kategoria: 'puolustus', mitattavissa: false, kuvaus_fi: 'Yleinen luotettavuus puolustustehtävissä.' },
  { avain: 'defensive_anticipation', nimi_fi: 'Puolustusennakointi', nimi_en: 'Defensive anticipation', nimi_sv: 'Förutseende i försvar', dim: 'D4', kategoria: 'puolustus', mitattavissa: false, kuvaus_fi: 'Vaaran ennakointi ja hyökkäysten katkaisu ennalta.' },
  { avain: 'defensive_positioning', nimi_fi: 'Puolustussijoittuminen', nimi_en: 'Defensive positioning', nimi_sv: 'Positionering i försvar', dim: 'D4', kategoria: 'puolustus', mitattavissa: false, kuvaus_fi: 'Takana olevien tilojen kattaminen ja oikea puolustusasema.' },
  { avain: 'pressing', nimi_fi: 'Prässi', nimi_en: 'Pressing', nimi_sv: 'Press', dim: 'D4', kategoria: 'puolustus', mitattavissa: false, kuvaus_fi: 'Prässin intensiteetti ja ajoitus pallon riistämiseksi.' },
  { avain: 'resilience', nimi_fi: 'Sinnikkyys', nimi_en: 'Resilience', nimi_sv: 'Motståndskraft', dim: 'D4', kategoria: 'puolustus', mitattavissa: false, kuvaus_fi: 'Sinnikkyys ja palautuminen vastoinkäymisistä.' },

  // ── D5 Sosiaalinen (Leadership/Communication jaettu D3:n kanssa → tässä joukkuerooli + vuorovaikutus) ──
  { avain: 'team_role', nimi_fi: 'Joukkuerooli', nimi_en: 'Team role', nimi_sv: 'Lagroll', dim: 'D5', kategoria: 'sosiaalinen', mitattavissa: false, kuvaus_fi: 'Oman roolin ymmärtäminen ja täyttäminen joukkueessa.' },
  { avain: 'social_interaction', nimi_fi: 'Vuorovaikutus', nimi_en: 'Interaction', nimi_sv: 'Interaktion', dim: 'D5', kategoria: 'sosiaalinen', mitattavissa: false, kuvaus_fi: 'Suhteet joukkueessa; yhteistyö myös kentän ulkopuolella.' }
];

// ── Helperit (puhtaat) ──
// Mittauslähde-avain (mitta.avain / mitta.laji) näytetään attribuuttirivin lähdeviitteenä ("Acceleration · kiihdytys").
// fi-näyttö = avain sellaisenaan (ei erillistä fi-nimeä) → sv-kartta vain kääntää sen. sv KONFORMI LUKITTUUN
// GLOSSAARIIN (tm_i18n_common: Pujottelu→Slalom · Syöttö→Passning · Ponnauttelu→Jonglering · Kuljetus-laukaus→Föring
// och skott) — pienaakkosin, koska näyttömuoto on pieni lähdeviite. Puuttuva avain/kieli → avain (ei tyhjää).
var _MITTA_LAHDE_SV = {
  kiihdytys: 'acceleration', maksinopeus: 'maxhastighet', ketteryys: 'smidighet', aerobinen: 'uthållighet', voima: 'styrka',
  pujottelu: 'slalom', syotto: 'passning', ponnauttelu: 'jonglering', kuljetus_laukaus: 'föring och skott',
  suunnanmuutos: 'riktningsförändring'   // V8e: D1-osaindeksi (laskeD1Osaindeksit) — ei taksonomia-attribuuttia, näkyy fyysteemojen perusteessa
};
function tmMittaLahdeNimi(avain, kieli) {
  if (kieli === 'sv' && _MITTA_LAHDE_SV[avain]) return _MITTA_LAHDE_SV[avain];
  return avain || '';
}

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
// Kategoria-nimet sv (V8c): sama datapuhtaus kuin nimi_sv — kielivalinta tehdään näkymässä (VP _taksTeemaNimi),
// tämä tiedosto pysyy kielineutraalina datana. Puuttuva kieli/avain → fi (tmKategoriaNimi-fallback).
var _KATEGORIA_NIMI_SV = {
  liike: 'Rörelse', kunto: 'Kondition & fysiskt spel',
  pallonhallinta: 'Bollkontroll', syotto: 'Passning', viimeistely: 'Avslut',
  kilpailullisuus: 'Tävlingsinstinkt', psykologia: 'Psykologi', harjoitusasenne: 'Träningsattityd',
  football_sense: 'Spelintelligens', puolustus: 'Försvarsfärdigheter', sosiaalinen: 'Social'
};
// kieli valinnainen (oletus fi) — taaksepäin-yhteensopiva: tmKategoriaNimi(k) käyttäytyy kuten ennen.
function tmKategoriaNimi(k, kieli) {
  if (kieli === 'sv' && _KATEGORIA_NIMI_SV[k]) return _KATEGORIA_NIMI_SV[k];
  return _KATEGORIA_NIMI[k] || (k ? (k.charAt(0).toUpperCase() + k.slice(1)) : k);
}
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
    tmMittaLahdeNimi: tmMittaLahdeNimi,
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
