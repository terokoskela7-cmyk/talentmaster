/* tm_xt.js — UHKA-ARVO (Expected Threat, xT) TAKTIIKKATAULULLE JA PELIHAVAINNOLLE.
   PUHDAS: ei DOMia, ei Firestorea, ei globaalia tilaa → yksikkötestattava nodessa (vitest).

   MITÄ xT ON. Kenttä jaetaan 12 × 8 ruutuun. Jokaisella ruudulla on arvo = todennäköisyys, että
   joukkue tekee maalin seuraavien pallotapahtumien aikana, kun pallo on tässä ruudussa. Syötön
   tai kuljetuksen arvo = kohderuudun arvo − lähtöruudun arvo. Näin myös maaliin johtamaton
   eteneminen saa arvon — juuri se, mitä pelkkä maali-/syöttötilasto ei näe.

   LÄHDE. Karun Singh (2018) "Introducing Expected Threat", avoin 12×8-ruudukko open_xt_12x8_v1
   (https://karun.in/blog/expected-threat.html). Arvot on laskettu aikuisten huippufutiksen
   tapahtumadatasta. ⚠ JUNIORIVARAUS: ruudukko kertoo hyvin MIKÄ alue on vaarallinen, mutta
   pienkenttäpeleissä (5v5–8v8) absoluuttiset arvot ovat suuntaa-antavia → xtPelimuotoHuomio().

   KOORDINAATISTO = TAKTIIKKATAULUN §1 (tm_kaavio_render.js): Opta 100×100, origo ylävasen,
   x = leveys (0 vasen … 100 oikea), y = pituus. spec.suunta 'ylos' (oletus) = vastustajan maali
   y≈0 → eteneminen = 100 − y. 'alas' = vastustajan maali y≈100 → eteneminen = y.
   ÄLÄ käytä tässä pikseleitä — muunnos pikseleiksi kuuluu kerros-libille (tm_xt_kerros.js).

   ESITYS. Raaka xT on pieni luku (0,006 … 0,257). Valmentajalle näytetään UHKAPISTEET = xT × 100
   (0,6 … 25,7) yhdellä desimaalilla. Laskenta tehdään aina raakana; skaalaus vain esityksessä.

   EI TUOMITSEVAA KIELTÄ (§ "asiantuntija päättää"). Taaksepäin syöttö voi olla oikea ratkaisu,
   joten luokat ovat 'etenee' | 'yllapitaa' | 'palauttaa' — kuvaus, ei arvosana. */

/* 8 riviä (leveys, rivi 0 = vasen laita) × 12 saraketta (pituus, sarake 0 = oma pääty,
   sarake 11 = vastustajan maalin edusta). Ruudukko on symmetrinen laitojen suhteen. */
var XT_RUUDUKKO = [
  [0.00638303, 0.00779616, 0.00844854, 0.00977659, 0.01126267, 0.01248344, 0.01473596, 0.0174506, 0.02122129, 0.02756312, 0.03485072, 0.0379259],
  [0.00750072, 0.00878589, 0.00942382, 0.0105949, 0.01214719, 0.0138454, 0.01611813, 0.01870347, 0.02401521, 0.02953272, 0.04066992, 0.04647721],
  [0.0088799, 0.00977745, 0.01001304, 0.01110462, 0.01269174, 0.01429128, 0.01685596, 0.01935132, 0.0241224, 0.02855202, 0.05491138, 0.06442595],
  [0.00941056, 0.01082722, 0.01016549, 0.01132376, 0.01262646, 0.01484598, 0.01689528, 0.0199707, 0.02385149, 0.03511326, 0.10805102, 0.25745362],
  [0.00941056, 0.01082722, 0.01016549, 0.01132376, 0.01262646, 0.01484598, 0.01689528, 0.0199707, 0.02385149, 0.03511326, 0.10805102, 0.25745362],
  [0.0088799, 0.00977745, 0.01001304, 0.01110462, 0.01269174, 0.01429128, 0.01685596, 0.01935132, 0.0241224, 0.02855202, 0.05491138, 0.06442595],
  [0.00750072, 0.00878589, 0.00942382, 0.0105949, 0.01214719, 0.0138454, 0.01611813, 0.01870347, 0.02401521, 0.02953272, 0.04066992, 0.04647721],
  [0.00638303, 0.00779616, 0.00844854, 0.00977659, 0.01126267, 0.01248344, 0.01473596, 0.0174506, 0.02122129, 0.02756312, 0.03485072, 0.0379259]
];
var XT_RIVIT = 8, XT_SARAKKEET = 12;
var XT_LAHDE = 'Karun Singh 2018, open_xt_12x8_v1';
var XT_MIN = 0.00638303, XT_MAX = 0.25745362;

/* Luokkarajat UHKAPISTEINÄ (xT×100). Valittu niin, että laidalta laidalle -siirto samalla
   korkeudella (~0) on 'yllapitaa' ja yhden ruudun eteneminen hyökkäyskolmanneksessa on 'etenee'. */
var XT_RAJA_ETENEE = 0.5, XT_RAJA_PALAUTTAA = -0.5;

/* Pallotapahtumat, joille xT antaa arvon. 'juoksu' on pallottomana liikkeenä POTENTIAALI
   (paljonko uhkaa syntyisi jos pallo tulisi perille) — raportoidaan, mutta ei summata
   pelaajan luomaan uhkaan. 'laukaus' ei kuulu xT:hen (siihen on xG) → arvo null. */
var XT_PALLOTAPAHTUMAT = ['syotto', 'kuljetus'];

function _xtKlamppi(v, lo, hi) { return Math.max(lo, Math.min(hi, v)); }
function _xtLuku(v) { return typeof v === 'number' && isFinite(v); }

/* Kaavion piste → ruutu {rivi, sarake}. Reunapisteet (100) kuuluvat viimeiseen ruutuun. */
function xtRuutu(x, y, suunta) {
  if (!_xtLuku(x) || !_xtLuku(y)) return null;
  var eteneminen = (suunta === 'alas') ? y : 100 - y;
  var sarake = Math.floor(_xtKlamppi(eteneminen, 0, 100) / 100 * XT_SARAKKEET);
  var rivi = Math.floor(_xtKlamppi(x, 0, 100) / 100 * XT_RIVIT);
  return { rivi: Math.min(XT_RIVIT - 1, rivi), sarake: Math.min(XT_SARAKKEET - 1, sarake) };
}

/* ── PIENKENTTÄPROFIILI (5v5, 8v8) ────────────────────────────────────────────────────────
   Ongelma: kaavion koordinaatit ovat 0–100 KENTÄN SUHTEEN. 11v11-ruudukko suoraan käytettynä
   väittäisi 8v8:n keskiympyrän olevan yhtä kaukana maalista kuin 11v11:n keskiympyrä (52 m), vaikka
   se on 30 m päässä. Pienellä kentällä laukaisuetäisyys saavutetaan heti keskiviivan jälkeen.
   Ratkaisu (metrimuunnos): piste muutetaan METREIKSI pienkentällä (etäisyys vastustajan maaliviivaan
   + sivuttaissiirto keskilinjasta) ja uhka luetaan 11v11-ruudukosta SAMASTA METRIETÄISYYDESTÄ.
   Seuraus: maaliuhka nousee pienkentällä selvästi aiemmin keskiviivan jälkeen, ja oma pääty ei koskaan
   ole yhtä "turvallinen" kuin 11v11:n oma pääty (koko kenttä on laukaisuetäisyyden sisällä).
   Kenttäkoot: Palloliiton/piirien suositus 5v5 ≈ 30 × 40 m, 8v8 ≈ 40 × 60 m, maali 5 × 2 m.
   ⚠ JOHDETTU PROFIILI: arvot ovat 11v11-datasta johdettuja, ei nuorten omasta datasta. Pienempää maalia
   (5 m vs 7,32 m) ei vielä korjata. Oma nuorten ruudukko (XT_KAYTTOONOTTO Vaihe 4) korvaa tämän. */
var XT_KENTTA_11 = { pituus: 105, leveys: 68 };
var XT_KENTTAKOOT = {
  '5v5': { pituus: 40, leveys: 30 },
  '8v8': { pituus: 60, leveys: 40 }
};

/* Pelimuodon profiili: {malli, pituus, leveys, pienkentta}. null = xT ei käytössä (esim. 3v3). */
function xtProfiili(pelimuoto) {
  var m = /^(\d+)v(\d+)$/.exec(pelimuoto || '');
  if (!m || +m[1] >= 11) return { malli: 'singh_12x8_v1', pituus: 105, leveys: 68, pienkentta: false };
  var k = XT_KENTTAKOOT[m[1] + 'v' + m[2]];
  if (!k) return null;
  return { malli: 'singh_12x8_v1+pienkentta_m_v1', pituus: k.pituus, leveys: k.leveys, pienkentta: true };
}

/* Pienkentän piste → 11v11-ruudukon koordinaatti (x 0–100 leveys, eteneminen 0–100). */
function _xtMetrimuunnos(x, eteneminen, prof) {
  var etMaaliin = (1 - eteneminen / 100) * prof.pituus;                 // m vastustajan maaliviivaan
  var sivulle = (x / 100 - 0.5) * prof.leveys;                          // m keskilinjasta
  return {
    x: _xtKlamppi(50 + sivulle / XT_KENTTA_11.leveys * 100, 0, 100),
    eteneminen: _xtKlamppi(100 * (1 - etMaaliin / XT_KENTTA_11.pituus), 0, 100)
  };
}

/* Raaka xT pisteessä. pelimuoto valinnainen: puuttuu tai 11v11 → suora ruudukko (ennallaan). */
function xtArvo(x, y, suunta, pelimuoto) {
  if (!_xtLuku(x) || !_xtLuku(y)) return null;
  var prof = xtProfiili(pelimuoto);
  if (prof === null) return null;
  if (!prof.pienkentta) {
    var r = xtRuutu(x, y, suunta);
    return r ? XT_RUUDUKKO[r.rivi][r.sarake] : null;
  }
  var et = (suunta === 'alas') ? y : 100 - y;
  var k = _xtMetrimuunnos(_xtKlamppi(x, 0, 100), _xtKlamppi(et, 0, 100), prof);
  var sarake = Math.min(XT_SARAKKEET - 1, Math.floor(k.eteneminen / 100 * XT_SARAKKEET));
  var rivi = Math.min(XT_RIVIT - 1, Math.floor(k.x / 100 * XT_RIVIT));
  return XT_RUUDUKKO[rivi][sarake];
}

/* ── KÄÄNTEINEN UHKA: MENETYSRISKI ────────────────────────────────────────────────────────
   Kun pallo menetetään pisteessä P, vastustaja saa pallon juuri siinä. Menetyksen riski = xT
   VASTUSTAJAN näkökulmasta samassa pisteessä (= sama piste, käänteinen hyökkäyssuunta).
   Omalla puolella rangaistusalueen edustalla riski on suurin, vastustajan päädyssä pieni.
   Tarkoitus on OPETTAA tasapainoa ja riskienhallintaa, ei rangaista: riskivyöhyke kertoo
   MISSÄ menetys maksaa eniten, joten rakentelussa ja pallollisena omassa päässä valitaan varmemmin.
   Rajat UHKAPISTEINÄ (vastustajan xT×100): korkea ≥ 5 (oma rangaistusalue ja sen edusta),
   kohonnut ≥ 2 (oma puolustuskolmannes), muuten matala. */
var XT_RISKI_KORKEA = 5, XT_RISKI_KOHONNUT = 2;

function xtMenetysriski(x, y, suunta, pelimuoto) {
  var vastaSuunta = (suunta === 'alas') ? 'ylos' : 'alas';
  var raaka = xtArvo(x, y, vastaSuunta, pelimuoto);
  if (raaka == null) return null;
  var p = xtPisteet(raaka);
  return { raaka: raaka, pisteet: p, taso: p >= XT_RISKI_KORKEA ? 'korkea' : (p >= XT_RISKI_KOHONNUT ? 'kohonnut' : 'matala') };
}

/* Riskinäkymä on oletuksena käytössä 11v11-vaiheessa (tasapainon ja riskienhallinnan opetus).
   Pienkentillä riskien korostaminen voi ohjata pelaamaan varman päälle juuri kun rohkeutta haetaan,
   joten siellä se on valinnainen näkymä (valmentaja kytkee itse). */
function xtRiskiOletuksena(pelimuoto) {
  var m = /^(\d+)v(\d+)$/.exec(pelimuoto || '');
  return !m || +m[1] >= 11;
}

/* Raaka xT → uhkapisteet (×100, 1 desimaali). */
function xtPisteet(raaka) { return _xtLuku(raaka) ? Math.round(raaka * 1000) / 10 : null; }

/* Uhkapisteiden näyttömuoto: suomalainen desimaalipilkku, etumerkki muutoksille. */
function xtMuotoile(pisteet, etumerkki) {
  if (!_xtLuku(pisteet)) return '—';
  var s = Math.abs(pisteet).toFixed(1).replace('.', ',');
  if (!etumerkki) return (pisteet < 0 ? '−' : '') + s;
  if (pisteet > 0) return '+' + s;
  if (pisteet < 0) return '−' + s;
  return '±0,0';
}

function xtLuokka(pisteet) {
  if (!_xtLuku(pisteet)) return null;
  if (pisteet >= XT_RAJA_ETENEE) return 'etenee';
  if (pisteet <= XT_RAJA_PALAUTTAA) return 'palauttaa';
  return 'yllapitaa';
}

/* Yksi liike: {tyyppi, from:{x,y}, to:{x,y}} (koordinaatit jo resolvoituna).
   Palauttaa { tyyppi, alku, loppu, muutos (raaka), pisteet (×100), luokka, laskettava }.
   laskettava = kuuluuko pelaajan luomaan uhkaan (vain onnistunut syöttö/kuljetus). */
function xtLiikeArvo(liike, suunta, pelimuoto) {
  if (!liike || !liike.from || !liike.to) return null;
  var alku = xtArvo(liike.from.x, liike.from.y, suunta, pelimuoto);
  var loppu = xtArvo(liike.to.x, liike.to.y, suunta, pelimuoto);
  if (alku == null || loppu == null) return null;
  if (liike.tyyppi === 'laukaus') {
    return { tyyppi: 'laukaus', alku: alku, loppu: null, muutos: null, pisteet: null, luokka: null, laskettava: false };
  }
  var muutos = loppu - alku;
  var pisteet = xtPisteet(muutos);
  return {
    tyyppi: liike.tyyppi, alku: alku, loppu: loppu, muutos: muutos, pisteet: pisteet,
    luokka: xtLuokka(pisteet),
    laskettava: XT_PALLOTAPAHTUMAT.indexOf(liike.tyyppi) >= 0
  };
}

/* Resolvoi taktiikkataulun liikkeen päätepisteen: {ref} → pelaajan (x,y), muuten {x,y}.
   Orpo viite → null (validaattori hylkää nämä jo tallennuksessa; tässä vain ei kaaduta). */
function _xtResolvoi(spec, paa) {
  if (!paa) return null;
  if (paa.ref) {
    var p = (spec.pelaajat || []).find(function (q) { return q.id === paa.ref; });
    return p ? { x: p.x, y: p.y } : null;
  }
  return (_xtLuku(paa.x) && _xtLuku(paa.y)) ? { x: paa.x, y: paa.y } : null;
}

/* KOKO KAAVIO. Palauttaa liikkeet arvoineen (spec-järjestyksessä = piirtojärjestys) + yhteenvedon.
   Vastustajan liikkeet ovat mukana (tekijä='vastustaja'), mutta EIVÄT summaan: summa kertoo
   paljonko OMA joukkue kuvatussa tilanteessa etenee uhkaan. */
function xtKaavioAnalyysi(spec) {
  var s = spec || {};
  var suunta = s.suunta || 'ylos';
  var liikkeet = [];
  (s.liikkeet || []).forEach(function (li) {
    var from = _xtResolvoi(s, li.from), to = _xtResolvoi(s, li.to);
    if (!from || !to) return;
    var tekijaP = li.from && li.from.ref ? (s.pelaajat || []).find(function (q) { return q.id === li.from.ref; }) : null;
    var tekija = tekijaP && tekijaP.joukkue === 'vastustaja' ? 'vastustaja' : 'oma';
    var a = xtLiikeArvo({ tyyppi: li.tyyppi, from: from, to: to }, suunta, s.pelimuoto);
    if (!a) return;
    a.id = li.id; a.tekijaId = tekijaP ? tekijaP.id : null; a.tekija = tekija;
    a.from = from; a.to = to;
    liikkeet.push(a);
  });
  var omat = liikkeet.filter(function (a) { return a.tekija === 'oma' && a.laskettava; });
  var summa = omat.reduce(function (acc, a) { return acc + a.muutos; }, 0);
  var paras = omat.reduce(function (best, a) { return (!best || a.muutos > best.muutos) ? a : best; }, null);
  var juoksut = liikkeet.filter(function (a) { return a.tekija === 'oma' && a.tyyppi === 'juoksu'; });
  var juoksuPotentiaali = juoksut.reduce(function (acc, a) { return acc + Math.max(0, a.muutos); }, 0);
  return {
    suunta: suunta,
    pelimuoto: s.pelimuoto || '11v11',
    malli: (xtProfiili(s.pelimuoto) || {}).malli || null,
    liikkeet: liikkeet,
    yhteensa: { muutos: summa, pisteet: xtPisteet(summa), pallotapahtumia: omat.length },
    paras: paras,
    juoksuPotentiaali: { muutos: juoksuPotentiaali, pisteet: xtPisteet(juoksuPotentiaali), juoksuja: juoksut.length },
    huomio: xtPelimuotoHuomio(s.pelimuoto)
  };
}

/* PELIHAVAINTO. tapahtumat = [{ pelaajaId, tyyppi:'syotto'|'kuljetus'|'laukaus',
   from:{x,y}, to:{x,y}, onnistui:boolean }], suunta kuten kaaviossa.
   Pelaajakohtainen yhteenveto:
     luotu      = onnistuneiden syöttöjen/kuljetusten ΔxT-summa (standardi xT-hyvitys)
     yritetty   = KAIKKIEN yritysten ΔxT-summa → kertoo rohkeudesta, vaikka pallo menetettiin
     eteenpain  = onnistuneista osuus, joka 'etenee'
     menetykset = epäonnistuneet syötöt/kuljetukset; menetyspiste = `to` (mihin pallo päätyi) tai
                  eksplisiittinen `menetys:{x,y}`. Kustakin menetysriski (käänteinen uhka) ja vyöhyke.
   Epäonnistunutta EI vähennetä luodusta. Juniorityössä rohkea yritys on tavoite, ei virhe;
   yritetty vs. luotu -ero näyttää riskinoton erikseen ilman rangaistusta. */
function xtHavaintoYhteenveto(tapahtumat, suunta, pelimuoto) {
  var per = {};
  (tapahtumat || []).forEach(function (t, i) {
    if (!t || !t.pelaajaId) return;
    var a = xtLiikeArvo(t, suunta, pelimuoto);
    if (!a) return;
    var P = per[t.pelaajaId] || (per[t.pelaajaId] = {
      pelaajaId: t.pelaajaId, toimintoja: 0, onnistuneita: 0, laukauksia: 0,
      luotu: 0, yritetty: 0, eteenpain: 0, paras: null,
      menetykset: 0, riskimenetykset: 0, menetysriski: 0
    });
    if (t.tyyppi === 'laukaus') { P.laukauksia++; return; }
    if (!a.laskettava) return;
    P.toimintoja++;
    P.yritetty += a.muutos;
    if (t.onnistui !== false) {
      P.onnistuneita++;
      P.luotu += a.muutos;
      if (a.luokka === 'etenee') P.eteenpain++;
      if (!P.paras || a.muutos > P.paras.muutos) P.paras = { indeksi: i, tyyppi: t.tyyppi, muutos: a.muutos, pisteet: a.pisteet };
    } else {
      var mp = xtMenetyspiste(t);
      var mr = mp ? xtMenetysriski(mp.x, mp.y, suunta, pelimuoto) : null;
      P.menetykset++;
      if (mr) { P.menetysriski += mr.raaka; if (mr.taso === 'korkea') P.riskimenetykset++; }
    }
  });
  return Object.keys(per).map(function (k) {
    var P = per[k];
    return {
      pelaajaId: P.pelaajaId,
      toimintoja: P.toimintoja,
      onnistuneita: P.onnistuneita,
      laukauksia: P.laukauksia,
      onnistumisprosentti: P.toimintoja ? Math.round(P.onnistuneita / P.toimintoja * 100) : null,
      luotu: { muutos: P.luotu, pisteet: xtPisteet(P.luotu) },
      yritetty: { muutos: P.yritetty, pisteet: xtPisteet(P.yritetty) },
      eteenpainOsuus: P.onnistuneita ? Math.round(P.eteenpain / P.onnistuneita * 100) : null,
      paras: P.paras,
      menetykset: P.menetykset,
      riskimenetykset: P.riskimenetykset,
      menetysriski: { muutos: P.menetysriski, pisteet: xtPisteet(P.menetysriski) }
    };
  }).sort(function (a, b) { return b.luotu.muutos - a.luotu.muutos; });
}

/* Menetyspiste: eksplisiittinen `menetys:{x,y}` voittaa, muuten `to` (mihin pallo päätyi). */
function xtMenetyspiste(t) {
  if (!t) return null;
  if (t.menetys && _xtLuku(t.menetys.x) && _xtLuku(t.menetys.y)) return t.menetys;
  return (t.to && _xtLuku(t.to.x) && _xtLuku(t.to.y)) ? t.to : null;
}

/* Pelimuodon huomio näkyviin. Palauttaa tekstin tai null (11v11). */
function xtPelimuotoHuomio(pelimuoto) {
  var m = /^(\d+)v(\d+)$/.exec(pelimuoto || '');
  if (!m || +m[1] >= 11) return null;
  var prof = xtProfiili(pelimuoto);
  if (!prof) return 'Uhka-arvoa ei lasketa ' + pelimuoto + '-pelissä.';
  return 'Pienkenttäprofiili ' + pelimuoto + ' (' + prof.leveys + ' × ' + prof.pituus + ' m): arvot johdettu 11v11-datasta metrietäisyyden mukaan. Suuntaa-antava, kunnes nuorten oma ruudukko valmistuu.';
}

/* Uhkakartan normalisoitu voimakkuus 0..1 (logaritminen, koska arvot ovat hyvin vinossa:
   maalin edusta on ~40× omaa päätyä). Kerros-lib käyttää tätä läpinäkyvyyteen. */
function xtVoimakkuus(raaka) {
  if (!_xtLuku(raaka) || raaka <= 0) return 0;
  var lo = Math.log(XT_MIN), hi = Math.log(XT_MAX);
  return _xtKlamppi((Math.log(raaka) - lo) / (hi - lo), 0, 1);
}

var TM_XT = {
  XT_RUUDUKKO: XT_RUUDUKKO, XT_RIVIT: XT_RIVIT, XT_SARAKKEET: XT_SARAKKEET, XT_LAHDE: XT_LAHDE,
  XT_RAJA_ETENEE: XT_RAJA_ETENEE, XT_RAJA_PALAUTTAA: XT_RAJA_PALAUTTAA,
  xtRuutu: xtRuutu, xtArvo: xtArvo, xtPisteet: xtPisteet, xtMuotoile: xtMuotoile, xtLuokka: xtLuokka,
  xtLiikeArvo: xtLiikeArvo, xtKaavioAnalyysi: xtKaavioAnalyysi, xtHavaintoYhteenveto: xtHavaintoYhteenveto,
  xtPelimuotoHuomio: xtPelimuotoHuomio, xtVoimakkuus: xtVoimakkuus,
  XT_KENTTAKOOT: XT_KENTTAKOOT, XT_RISKI_KORKEA: XT_RISKI_KORKEA, XT_RISKI_KOHONNUT: XT_RISKI_KOHONNUT,
  xtProfiili: xtProfiili, xtMenetysriski: xtMenetysriski, xtMenetyspiste: xtMenetyspiste, xtRiskiOletuksena: xtRiskiOletuksena
};
if (typeof module !== 'undefined' && module.exports) module.exports = TM_XT;
if (typeof window !== 'undefined') { for (var _xtk in TM_XT) { try { window[_xtk] = TM_XT[_xtk]; } catch (e) {} } window.TM_XT = TM_XT; }
