/**
 * tm_ylaikaisyys.js — TalentMaster™  v3
 * RAE-analyysi + Biologinen ikä (Mirwald 2002) — yhdistetty signaalikortti VP-näkymään
 *
 * ════════════════════════════════════════════════════════════
 * KAKSI SIGNAALIPOLKUA:
 *
 *  1. RAE (Relative Age Effect) — kaikille pelaajille aina
 *     Vaatii: syntymapaivamaara (Firestore Timestamp)
 *     Kertoo: onko joukkueessa syntymäkuukausivinouma (Q1 vs Q4)
 *
 *  2. Biologinen ikä (Mirwald 2002) — vain mitatuille pelaajille
 *     Vaatii: biologinenIka.mirwald (pituus + istumapituus + paino)
 *     Kertoo: onko yksittäinen pelaaja biologisesti kehityksessä jäljessä
 *     + Palloliiton poikkeuslupaehdon tarkistus
 *
 * Nämä eivät ole vaihtoehtoisia — ne mittaavat eri asioita.
 * RAE = ryhmätason rakenteellinen vinouma
 * Mirwald = yksilötason kehitysasteen poikkeama
 *
 * ════════════════════════════════════════════════════════════
 * INTEGROINTI VP_v17:ään:
 *
 *   1. <script src="tm_ylaikaisyys.js"></script> ennen </body>
 *   2. <div id="tm-ylaikaisyys-kortti"></div> KPI-korttien sekaan
 *   3. tmYlaikaisyysAlusta(kaikki_pelaajat) kun Firestore-data ladattu
 *
 * FIRESTORE-KENTÄT per pelaaja-dokumentti:
 *   syntymapaivamaara : Timestamp  — täysi päivämäärä (pakollinen RAE:lle)
 *   syntymavuosi      : number     — esim. 2012
 *   joukkue           : string     — esim. "KPV U14"
 *   etunimi           : string
 *   sukunimi          : string
 *   sukupuoli         : string     — "P" tai "T"
 *   biologinenIka     : object     — { krono, mirwald: { pituus, istumapituus, paino } }
 *   fleiProsentti     : number     — 0–100 (harjoitettavuusindeksi, FLEI)
 *   yhteenveto.fleiProsentti : number — vaihtoehtoinen sijainti kartoitusdatassa
 * ════════════════════════════════════════════════════════════
 */

/* ════════════════════════════════════════════
   APUVÄLINEET — päivämäärä ja Timestamp
════════════════════════════════════════════ */

/**
 * Muuntaa Firestore Timestampin tai minkä tahansa päivämäärä-arvon
 * tavalliseksi JS Date-objektiksi.
 *
 * Firestore palauttaa Timestamp-objektin jolla on .toDate()-metodi.
 * Tuontikoodissa voi myös esiintyä valmiiksi muunnettuja Date-objekteja
 * tai ISO-merkkijonoja — käsitellään kaikki tapaukset.
 */
function tmTimestampToDate(arvo) {
  if (!arvo) return null;
  if (typeof arvo.toDate === 'function') return arvo.toDate(); // Firestore Timestamp
  if (arvo instanceof Date) return arvo;
  var d = new Date(arvo);
  return isNaN(d.getTime()) ? null : d;
}

/**
 * Palauttaa syntymäkuukauden (1–12) pelaajan syntymapaivamaara-kentästä.
 * Tätä käytetään sekä RAE-kvartaalin määritykseen että Palloliiton
 * kuukausittaiseen kynnysarvolookupiin.
 */
function tmSyntymakuukausi(pelaaja) {
  var d = tmTimestampToDate(pelaaja.syntymapaivamaara);
  if (!d) return null;
  return d.getMonth() + 1; // getMonth() on 0-pohjainen → +1
}

/* ════════════════════════════════════════════
   OSA 1 — RAE-ANALYYSI
════════════════════════════════════════════ */

/**
 * Palauttaa RAE-kvartaalin (1–4) syntymäkuukauden perusteella.
 *
 * Suomen Palloliiton kausi alkaa kalenterivuoden alusta,
 * joten kvartaalijako noudattaa kalenterivuotta:
 *   Q1 = tammikuu–maaliskuu   (kuukaudet 1–3)
 *   Q2 = huhtikuu–kesäkuu     (kuukaudet 4–6)
 *   Q3 = heinäkuu–syyskuu     (kuukaudet 7–9)
 *   Q4 = lokakuu–joulukuu     (kuukaudet 10–12)
 *
 * Q1-syntyneet ovat joukkueensa vanhimpia — RAE-etu on suurimmillaan.
 * Q4-syntyneet ovat nuorimpia — RAE-haitta on suurimmillaan.
 */
function tmRaeKvartaali(syntymakuukausi) {
  if (!syntymakuukausi) return null;
  if (syntymakuukausi <= 3)  return 1;
  if (syntymakuukausi <= 6)  return 2;
  if (syntymakuukausi <= 9)  return 3;
  return 4;
}

/**
 * Laskee RAE-analyysin pelaajataulukosta.
 *
 * Palauttaa objektin joka sisältää:
 *   kvartaalit    — { Q1, Q2, Q3, Q4 } lukumäärät
 *   prosentit     — { Q1, Q2, Q3, Q4 } prosentteina (0–100)
 *   q1q4suhde     — Q1-lukumäärä / Q4-lukumäärä (null jos Q4 = 0)
 *   vinoumaAste   — 'tasainen' | 'huomio' | 'vahva' | 'kriittinen'
 *   mitattu       — kuinka monelta syntymäkuukausi löytyi
 *   yhteensa      — pelaajia yhteensä analyysissa
 *
 * FLEI-talenttiryhmäanalyysi (pelaajat joiden FLEI >= 75):
 *   talenttiKvartaalit — sama rakenne talenttiryhmälle
 *   talenttiProsentit  — sama rakenne talenttiryhmälle
 *   talenttiMaara      — talenttiryhmän koko
 *   talenttiVinoumaAste — onko vinouma pahempi talenttiryhmässä
 */
function tmLaskeRae(pelaajat) {
  var kv = { 1: 0, 2: 0, 3: 0, 4: 0 };
  var kvTalentti = { 1: 0, 2: 0, 3: 0, 4: 0 };
  var mitattu = 0;
  var talenttiMaara = 0;

  pelaajat.forEach(function(p) {
    var kk = tmSyntymakuukausi(p);
    var q  = tmRaeKvartaali(kk);
    if (!q) return; // syntymäkuukausi puuttuu — ohita

    mitattu++;
    kv[q]++;

    // Talenttiryhmä = FLEI >= 75 (löytyy joko suoraan tai yhteenveto-objektista)
    var flei = p.fleiProsentti
      || (p.yhteenveto && p.yhteenveto.fleiProsentti)
      || null;
    if (flei !== null && flei >= 75) {
      talenttiMaara++;
      kvTalentti[q]++;
    }
  });

  // Lasketaan prosentit — suojataan nollajako
  function prosentit(kvObj, n) {
    if (n === 0) return { 1: 0, 2: 0, 3: 0, 4: 0 };
    return {
      1: Math.round(kvObj[1] / n * 100),
      2: Math.round(kvObj[2] / n * 100),
      3: Math.round(kvObj[3] / n * 100),
      4: Math.round(kvObj[4] / n * 100)
    };
  }

  var pct    = prosentit(kv, mitattu);
  var pctTal = prosentit(kvTalentti, talenttiMaara);

  // Q1/Q4-suhde: mitä korkeampi, sitä vakavampi vinouma
  var q1q4suhde = kv[4] > 0 ? Math.round(kv[1] / kv[4] * 10) / 10 : null;

  // Vinouma-aste perustuu Q1-osuuteen:
  // Tasapainoisessa populaatiossa Q1 ≈ 25%.
  // Tutkimuskirjallisuudessa (Cobley et al. 2009) 35%+ on jo selkeä signaali.
  function vinoumaAste(q1pct) {
    if (q1pct <= 30) return 'tasainen';
    if (q1pct <= 40) return 'huomio';
    if (q1pct <= 50) return 'vahva';
    return 'kriittinen';
  }

  return {
    kvartaalit:          kv,
    prosentit:           pct,
    q1q4suhde:           q1q4suhde,
    vinoumaAste:         vinoumaAste(pct[1]),
    mitattu:             mitattu,
    yhteensa:            pelaajat.length,
    talenttiKvartaalit:  kvTalentti,
    talenttiProsentit:   pctTal,
    talenttiMaara:       talenttiMaara,
    talenttiVinoumaAste: vinoumaAste(pctTal[1])
  };
}

/* ════════════════════════════════════════════
   OSA 2 — MIRWALD 2002 + PALLOLIITON SÄÄNTÖ
════════════════════════════════════════════ */

/**
 * Laskee Mirwald 2002 -kaavan mukaisen maturity offset -arvon.
 * Kertoo kuinka monta vuotta pelaaja on PHV-huipustaan:
 *   negatiivinen → ennen huippua (Pre-PHV / Varhainen)
 *   ~0           → huipun lähellä (PHV-huippu)
 *   positiivinen → huippu ohitettu (Post-PHV)
 *
 * Lähde: Mirwald RL et al. (2002). Med Sci Sports Exerc, 34(4), 689–694.
 */
function tmMirwaldOffset(m) {
  if (!m || !m.pituus || !m.istumapituus || !m.paino || !m.ika || !m.sukupuoli) return null;
  var jalka = m.pituus - m.istumapituus; // seisomapituus - istumapituus = jalkojen pituus
  if (m.sukupuoli === 'P') {
    return -9.236
      + 0.0002708 * (jalka * m.istumapituus)
      - 0.001663  * (m.ika * jalka)
      + 0.007216  * (m.ika * m.istumapituus)
      + 0.02292   * (m.paino / m.pituus * 100);
  } else {
    return -9.376
      + 0.0001882 * (jalka * m.istumapituus)
      + 0.0022    * (m.ika * jalka)
      + 0.005841  * (m.ika * m.istumapituus)
      - 0.002658  * (m.ika * m.paino)
      + 0.07693   * (m.paino / m.pituus * 100);
  }
}

/** PHV-ikä = kronologinen ikä − maturity offset */
function tmLaskePhvIka(kronoIka, offset) {
  if (kronoIka === null || offset === null) return null;
  return kronoIka - offset;
}

/** Muuntaa maturity offset VP_v17:n PHV-tila-termistöön */
function tmOffsetToPhvTila(offset) {
  if (offset === null) return 'Ei tiedossa';
  if (offset < -1.0) return 'Varhainen';
  if (offset <= 0.5) return 'PHV-huippu';
  return 'Post-PHV';
}

/**
 * Palloliiton kuukausittaiset kynnysarvot (APHV − 0.75 v / syntymäkuukausi).
 * Jos Mirwald-PHV-ikä >= kynnys → poikkeuslupa haettavissa Palloliitolta.
 * Lähde: Suomen Palloliitto.
 */
var TM_KYNNYS = {
  P: { 1:14.9667, 2:14.8833, 3:14.80, 4:14.7167, 5:14.6333, 6:14.55,
       7:14.4667, 8:14.3833, 9:14.30, 10:14.2167, 11:14.1333, 12:14.05 },
  T: { 1:13.0667, 2:12.9833, 3:12.90, 4:12.8167, 5:12.7333, 6:12.65,
       7:12.5667, 8:12.4833, 9:12.40, 10:12.3167, 11:12.2333, 12:12.15 }
};

function tmTarkistaPoikkeuslupa(phvIka, sukupuoli, syntymakuukausi) {
  var sukup = (sukupuoli || '').toUpperCase() === 'T' ? 'T' : 'P';
  var kk = parseInt(syntymakuukausi);
  if (!phvIka || isNaN(kk) || kk < 1 || kk > 12) return { poikkeuslupa: false, kynnys: null, erotus: null };
  var kynnys = TM_KYNNYS[sukup][kk];
  return { poikkeuslupa: phvIka >= kynnys, kynnys: kynnys, erotus: Math.round((phvIka - kynnys) * 100) / 100 };
}

/**
 * Laskee biologisen kehityssignaalin yhdelle pelaajalle.
 * AKTIVOITUU VAIN jos biologinenIka.mirwald-mittaukset löytyvät Firestoresta.
 * Ilman mittauksia palautetaan { signaali: false } — nämä pelaajat kuuluvat
 * pelkästään RAE-analyysiin.
 */
function tmLaskeBioSignaali(pelaaja) {
  var tulos = { signaali: false, phvTila: null, phvIka: null, phvOffset: null,
                poikkeuslupa: false, kynnys: null, kynnyserotus: null, kuvaus: '' };

  // Vain mitatut pelaajat — ei kronologinen-tasoa ilman mittauksia
  var mirwData = pelaaja.biologinenIka && pelaaja.biologinenIka.mirwald;
  var kronoIka = pelaaja.biologinenIka && pelaaja.biologinenIka.krono;
  if (!mirwData || !kronoIka) return tulos;

  var offset = tmMirwaldOffset({
    pituus: mirwData.pituus, istumapituus: mirwData.istumapituus,
    paino: mirwData.paino, ika: kronoIka,
    sukupuoli: pelaaja.sukupuoli || 'P'
  });
  if (offset === null) return tulos;

  var phvIka = tmLaskePhvIka(kronoIka, offset);
  tulos.phvIka    = Math.round(phvIka * 100) / 100;
  tulos.phvOffset = Math.round(offset * 100) / 100;
  tulos.phvTila   = tmOffsetToPhvTila(offset);

  // Tarkistetaan poikkeuslupa syntymäkuukausella
  var kk = tmSyntymakuukausi(pelaaja);
  if (kk) {
    var pl = tmTarkistaPoikkeuslupa(phvIka, pelaaja.sukupuoli, kk);
    tulos.poikkeuslupa = pl.poikkeuslupa;
    tulos.kynnys       = pl.kynnys;
    tulos.kynnyserotus = pl.erotus;
  }

  // Signaalin määritys — vain biologinen ja poikkeuslupatasot
  if (tulos.poikkeuslupa) {
    tulos.signaali = 'poikkeuslupa';
    tulos.kuvaus = 'PHV-ikä ' + tulos.phvIka + ' v ≥ Palloliiton kynnys ' + tulos.kynnys +
      ' (syntymäkk ' + (kk || '?') + '). Poikkeuslupa haettavissa.';
  } else if (tulos.phvTila === 'Varhainen' || tulos.phvTila === 'PHV-huippu') {
    tulos.signaali = 'biologinen';
    tulos.kuvaus = 'PHV-tila: ' + tulos.phvTila + ' (offset ' + tulos.phvOffset + ' v). ' +
      'Biologinen kehitys jäljessä kronologista ikää.';
  }

  return tulos;
}

/* ════════════════════════════════════════════
   OSA 3 — CSS
════════════════════════════════════════════ */

var TM_YLI_CSS = `
  #tm-ylaikaisyys-kortti { margin: 20px 0; font-family: 'DM Sans', sans-serif; }

  /* ── Pääkortti ── */
  .tmyli-kortti {
    background: #0C1018;
    border: 1px solid rgba(232,238,248,.07);
    border-radius: 10px;
    overflow: hidden;
  }

  /* ── Yläpalkki: kaksi KPI-lukua vierekkäin ── */
  .tmyli-ylapalkki {
    display: grid;
    grid-template-columns: 1fr 1fr;
    border-bottom: 1px solid rgba(232,238,248,.07);
  }
  .tmyli-kpi {
    padding: 18px 22px;
    cursor: pointer;
    transition: background .2s;
    position: relative;
  }
  .tmyli-kpi:first-child {
    border-right: 1px solid rgba(232,238,248,.07);
  }
  .tmyli-kpi:hover { background: rgba(255,255,255,.02); }
  .tmyli-kpi.aktiivinen { background: rgba(255,255,255,.03); }
  .tmyli-kpi.aktiivinen::after {
    content: '';
    position: absolute;
    bottom: 0; left: 0; right: 0;
    height: 2px;
    background: var(--tm-kpi-vari, #E0A040);
    border-radius: 0;
  }

  .tmyli-kpi-label {
    font-size: 10px; font-weight: 600; letter-spacing: 1.8px;
    text-transform: uppercase; color: rgba(232,238,248,.35);
    margin-bottom: 4px;
  }
  .tmyli-kpi-luku {
    font-size: 28px; font-weight: 700; line-height: 1;
    color: #E0A040;
  }
  .tmyli-kpi-luku.teal  { color: #3EC9A7; }
  .tmyli-kpi-luku.sininen { color: #4A7ED9; }
  .tmyli-kpi-luku.punainen { color: #D96060; }
  .tmyli-kpi-sub {
    font-size: 12px; color: rgba(232,238,248,.38); margin-top: 4px;
  }
  .tmyli-chevron {
    font-size: 13px; color: rgba(232,238,248,.2);
    float: right; margin-top: 4px;
    transition: transform .2s;
  }
  .tmyli-kpi.aktiivinen .tmyli-chevron { transform: rotate(180deg); }

  /* ── Osastoalueet ── */
  .tmyli-osasto { display: none; }
  .tmyli-osasto.auki { display: block; }

  /* ── RAE-palkisto ── */
  .tmyli-rae-wrap { padding: 18px 22px 20px; }
  .tmyli-rae-otsikko {
    font-size: 11px; font-weight: 600; letter-spacing: 1.5px;
    text-transform: uppercase; color: rgba(232,238,248,.28);
    margin-bottom: 14px;
  }
  .tmyli-rae-palkit { display: flex; gap: 10px; align-items: flex-end; height: 80px; margin-bottom: 8px; }
  .tmyli-rae-palkki-wrap { flex: 1; display: flex; flex-direction: column; align-items: center; gap: 5px; }
  .tmyli-rae-palkki {
    width: 100%; border-radius: 4px 4px 0 0;
    transition: opacity .2s;
    min-height: 4px;
  }
  .tmyli-rae-palkki.harmaa  { background: rgba(232,238,248,.2); }
  .tmyli-rae-palkki.keltainen { background: #E0A040; }
  .tmyli-rae-palkki.punainen  { background: #D96060; }
  .tmyli-rae-palkki.teal      { background: #3EC9A7; }
  .tmyli-rae-q { font-size: 11px; font-weight: 600; color: rgba(232,238,248,.4); }
  .tmyli-rae-pct { font-size: 12px; color: rgba(232,238,248,.6); }
  .tmyli-rae-pct.iso { color: #E0A040; font-weight: 600; }
  .tmyli-rae-pct.pieni { color: #3EC9A7; font-weight: 600; }

  /* Referenssiviiva 25 % */
  .tmyli-rae-ref {
    position: relative; height: 1px;
    background: rgba(232,238,248,.08); margin: 0 0 6px;
  }
  .tmyli-rae-ref::before {
    content: '25%';
    position: absolute; right: 0; top: -9px;
    font-size: 10px; color: rgba(232,238,248,.2);
  }

  /* Talenttirivi RAE-vertailuksi */
  .tmyli-rae-talentti {
    margin-top: 14px; padding-top: 14px;
    border-top: 1px solid rgba(232,238,248,.06);
  }
  .tmyli-rae-talentti-label {
    font-size: 11px; color: rgba(232,238,248,.3); margin-bottom: 10px;
  }
  .tmyli-rae-talentti-palkit { display: flex; gap: 10px; }
  .tmyli-rae-talentti-palkki-wrap { flex: 1; text-align: center; }
  .tmyli-rae-talentti-palkki {
    height: 6px; border-radius: 3px; margin: 0 auto 4px;
  }

  /* ── Status-rivi vinoumalle ── */
  .tmyli-rae-status {
    margin-top: 12px; padding: 9px 12px; border-radius: 6px;
    font-size: 12px; line-height: 1.5;
  }
  .tmyli-rae-status.tasainen  { background: rgba(62,201,167,.08); color: #3EC9A7; }
  .tmyli-rae-status.huomio    { background: rgba(224,160,64,.08);  color: #E0A040; }
  .tmyli-rae-status.vahva     { background: rgba(217,96,96,.08);   color: #D96060; }
  .tmyli-rae-status.kriittinen{ background: rgba(217,96,96,.14);   color: #D96060; font-weight: 600; }

  /* ── Biologinen ikä -lista ── */
  .tmyli-bio-wrap { padding: 6px 0 2px; }
  .tmyli-bio-otsikko {
    display: grid; grid-template-columns: 1fr 120px 170px;
    gap: 8px; padding: 9px 22px;
    font-size: 10px; font-weight: 600; letter-spacing: 1.4px;
    text-transform: uppercase; color: rgba(232,238,248,.25);
    border-bottom: 1px solid rgba(232,238,248,.05);
    background: #0a0e16;
  }
  .tmyli-bio-rivi {
    display: grid; grid-template-columns: 1fr 120px 170px;
    gap: 8px; padding: 11px 22px; align-items: center;
    border-bottom: 1px solid rgba(232,238,248,.04);
    transition: background .15s;
  }
  .tmyli-bio-rivi:last-child { border-bottom: none; }
  .tmyli-bio-rivi:hover { background: rgba(255,255,255,.02); }
  .tmyli-bio-nimi    { font-size: 14px; font-weight: 500; color: rgba(232,238,248,.88); }
  .tmyli-bio-joukkue { font-size: 12px; color: rgba(232,238,248,.35); margin-top: 1px; }
  .tmyli-bio-phv     { font-size: 12px; color: rgba(232,238,248,.38); }

  .tmyli-badge {
    font-size: 11px; font-weight: 600; letter-spacing: .4px;
    padding: 3px 9px; border-radius: 20px;
    white-space: nowrap; display: inline-block;
  }
  .tmyli-badge.poikkeuslupa { background: rgba(62,201,167,.12); color: #3EC9A7; border: 1px solid rgba(62,201,167,.2); }
  .tmyli-badge.biologinen   { background: rgba(74,126,217,.12); color: #4A7ED9; border: 1px solid rgba(74,126,217,.2); }

  .tmyli-bio-tyhja {
    padding: 20px 22px; font-size: 13px;
    color: rgba(232,238,248,.28); text-align: center; font-style: italic;
  }

  /* ── Alaselite ── */
  .tmyli-selite {
    padding: 10px 22px 13px; font-size: 12px; line-height: 1.65;
    color: rgba(232,238,248,.28); border-top: 1px solid rgba(232,238,248,.05);
    background: #080b10;
  }
  .tmyli-selite strong { color: rgba(232,238,248,.45); }
`;

function tmYlaikaisyysInjektoiCSS() {
  if (document.getElementById('tm-yli-style')) return;
  var s = document.createElement('style');
  s.id = 'tm-yli-style';
  s.textContent = TM_YLI_CSS;
  document.head.appendChild(s);
}

/* ════════════════════════════════════════════
   OSA 4 — UI-RENDERÖINTI
════════════════════════════════════════════ */

/**
 * Piirtää RAE-palkiston. Korkeus skaalataan suhteessa suurimpaan arvoon
 * niin että palkit täyttävät käytettävissä olevan tilan — pienin palkki
 * näkyy silti selkeästi (min-height CSS:ssä).
 */
function tmRaeHtml(rae) {
  var max  = Math.max(rae.prosentit[1], rae.prosentit[2], rae.prosentit[3], rae.prosentit[4], 1);

  // Väri per kvartaali: Q1 korostuu jos vinouma on selkeä, Q4 korostuu teal-värinä
  function palkkinVari(q, pct) {
    if (q === 1 && pct > 35) return 'punainen';
    if (q === 1 && pct > 28) return 'keltainen';
    if (q === 4 && pct < 20) return 'teal';  // Q4 aliedustettu
    return 'harmaa';
  }
  function pctKlass(q, pct) {
    if (q === 1 && pct > 35) return ' iso';
    if (q === 4 && pct < 18) return ' pieni';
    return '';
  }

  var h = '<div class="tmyli-rae-wrap">';
  h += '<div class="tmyli-rae-otsikko">Syntymäkuukausijakauma (n=' + rae.mitattu + ')</div>';
  h += '<div class="tmyli-rae-palkit">';

  [1, 2, 3, 4].forEach(function(q) {
    var pct    = rae.prosentit[q];
    var korkeus = Math.round(pct / max * 72); // max 72px
    var vari   = palkkinVari(q, pct);
    h += '<div class="tmyli-rae-palkki-wrap">';
    h += '<div class="tmyli-rae-pct' + pctKlass(q, pct) + '">' + pct + '%</div>';
    h += '<div class="tmyli-rae-palkki ' + vari + '" style="height:' + korkeus + 'px"></div>';
    h += '<div class="tmyli-rae-q">Q' + q + '</div>';
    h += '<div style="font-size:11px;color:rgba(232,238,248,.25);">' + rae.kvartaalit[q] + '</div>';
    h += '</div>';
  });
  h += '</div>';

  // Q1/Q4-suhdeluku ja vinouma-selite
  var statusTeksti = {
    tasainen:   'Jakauma tasainen — ei merkittävää RAE-vinoumaa.',
    huomio:     'Lievä RAE-vinouma. Q1-syntyneitä hieman yliedustettuna.',
    vahva:      'Selkeä RAE-vinouma. Q1-syntyneitä merkittävästi yliedustettuna.',
    kriittinen: 'Kriittinen RAE-vinouma. Yli puolet pelaajista Q1-syntyneitä — talenttiarvio vääristynyt.'
  }[rae.vinoumaAste] || '';

  if (rae.q1q4suhde !== null) {
    statusTeksti += ' Q1/Q4-suhde: ' + rae.q1q4suhde + (rae.q1q4suhde > 2 ? ' ⚠️' : '');
  }
  h += '<div class="tmyli-rae-status ' + rae.vinoumaAste + '">' + statusTeksti + '</div>';

  // Talenttiryhmän RAE — näytetään vain jos FLEI-dataa löytyy
  if (rae.talenttiMaara >= 3) {
    var maxT = Math.max(rae.talenttiProsentit[1], rae.talenttiProsentit[2],
                        rae.talenttiProsentit[3], rae.talenttiProsentit[4], 1);
    h += '<div class="tmyli-rae-talentti">';
    h += '<div class="tmyli-rae-talentti-label">FLEI ≥ 75 — talenttiryhmä (n=' + rae.talenttiMaara + ')</div>';
    h += '<div class="tmyli-rae-talentti-palkit">';
    [1, 2, 3, 4].forEach(function(q) {
      var pct = rae.talenttiProsentit[q];
      var leveys = Math.round(pct / maxT * 100);
      var vari = q === 1 && pct > 35 ? '#D96060' : q === 4 ? '#3EC9A7' : 'rgba(232,238,248,.2)';
      h += '<div class="tmyli-rae-talentti-palkki-wrap">';
      h += '<div class="tmyli-rae-talentti-palkki" style="width:' + leveys + '%;background:' + vari + '"></div>';
      h += '<div style="font-size:11px;color:rgba(232,238,248,.35)">Q' + q + ' ' + pct + '%</div>';
      h += '</div>';
    });
    h += '</div>';

    // Vertailu: onko talenttiryhmän vinouma pahempi kuin koko joukkueen?
    var q1ero = rae.talenttiProsentit[1] - rae.prosentit[1];
    if (Math.abs(q1ero) >= 5) {
      var merkki = q1ero > 0 ? '+' : '';
      var viesti = q1ero > 0
        ? 'Talenttiryhmässä Q1-painotus on ' + merkki + q1ero + '% vahvempi kuin koko joukkueessa — arviointiin vaikuttaa biologinen etu, ei pelkästään taito.'
        : 'Talenttiryhmässä Q4-syntyneitä suhteessa enemmän — hyvä merkki tasapuolisesta arvioinnista.';
      h += '<div class="tmyli-rae-status ' + (q1ero > 5 ? 'huomio' : 'tasainen') + '" style="margin-top:10px">' + viesti + '</div>';
    }
    h += '</div>';
  }

  h += '<div class="tmyli-selite"><strong>RAE:</strong> Q1 = tammi–maaliskuu, Q4 = loka–joulukuu. ' +
    'Tasapainoisessa ryhmässä jokainen kvartaali ≈ 25 %. Merkittävä Q1-ylipaino viittaa siihen, ' +
    'että biologinen kehitysetu vaikuttaa valintaan enemmän kuin varsinainen lahjakkuus.</div>';

  h += '</div>'; // .tmyli-rae-wrap
  return h;
}

/**
 * Piirtää biologinen ikä -listan (vain Mirwald-mitatut pelaajat).
 */
function tmBioHtml(bioSignaalit) {
  var h = '<div class="tmyli-bio-wrap">';

  if (bioSignaalit.length === 0) {
    h += '<div class="tmyli-bio-tyhja">Ei Mirwald-mittauksia. ' +
      'Mittaukset kerätään harjoitettavuuskartoituksen yhteydessä ' +
      '(pituus + istumapituus + paino).</div>';
  } else {
    h += '<div class="tmyli-bio-otsikko">' +
      '<span>Pelaaja / Joukkue</span><span>PHV-tila</span><span>Signaali</span></div>';

    bioSignaalit.forEach(function(item) {
      var p = item.p;
      var t = item.t;
      var phvNayta = (t.phvTila || '—');
      if (t.phvIka)    phvNayta += ' (' + t.phvIka + ' v)';
      if (t.phvOffset) phvNayta += ' · offset ' + (t.phvOffset > 0 ? '+' : '') + t.phvOffset;

      var badgeTeksti = t.signaali === 'poikkeuslupa' ? 'Poikkeuslupa mahd.' : 'Bio-signaali';
      var badgeKlass  = t.signaali === 'poikkeuslupa' ? 'poikkeuslupa' : 'biologinen';

      h += '<div class="tmyli-bio-rivi" title="' + (t.kuvaus || '').replace(/"/g,'&quot;') + '">' +
        '<div><div class="tmyli-bio-nimi">' + (p.etunimi || '') + ' ' + (p.sukunimi || '') + '</div>' +
        '<div class="tmyli-bio-joukkue">' + (p.joukkue || '') + '</div></div>' +
        '<div class="tmyli-bio-phv">' + phvNayta + '</div>' +
        '<span class="tmyli-badge ' + badgeKlass + '">' + badgeTeksti + '</span>' +
        '</div>';
    });
  }

  h += '<div class="tmyli-selite"><strong>Biologinen ikä (Mirwald 2002):</strong> ' +
    'Aktivoituu kun harjoitettavuuskartoituksesta löytyy pituus + istumapituus + paino. ' +
    '<strong>Poikkeuslupa</strong> = PHV-ikä ≥ Palloliiton kuukausittainen kynnysarvo — ' +
    'VP voi hakea lupaa Palloliitolta nuorempaan ikäryhmään siirtymiseksi (tuleva 2027-sääntö).' +
    '</div>';

  h += '</div>'; // .tmyli-bio-wrap
  return h;
}

/**
 * Päärenderi — kokoaa koko kortin ja kirjoittaa DOM:iin.
 */
function tmRenderYlaikaisyysKortti(pelaajat, kohde) {
  kohde = kohde || 'tm-ylaikaisyys-kortti';
  var el = document.getElementById(kohde);
  if (!el) return;
  tmYlaikaisyysInjektoiCSS();

  // ── RAE-laskenta ──
  var rae = tmLaskeRae(pelaajat);

  // ── Bio-signaalit (vain mitatut) ──
  var bioSignaalit = pelaajat
    .map(function(p) { return { p: p, t: tmLaskeBioSignaali(p) }; })
    .filter(function(x) { return x.t.signaali !== false; });

  var poikkeusLkm = bioSignaalit.filter(function(x) { return x.t.signaali === 'poikkeuslupa'; }).length;
  var bioMitattu  = pelaajat.filter(function(p) {
    return p.biologinenIka && p.biologinenIka.mirwald;
  }).length;

  // ── RAE KPI-luku ──
  var raeLukuTeksti, raeLukuKlass, raeSubTeksti;
  if (rae.mitattu === 0) {
    raeLukuTeksti = '—'; raeLukuKlass = ''; raeSubTeksti = 'Ei syntymäpäivämiä';
  } else {
    raeLukuTeksti = rae.q1q4suhde !== null ? rae.q1q4suhde + 'x' : rae.prosentit[1] + '%';
    raeLukuKlass  = rae.vinoumaAste === 'kriittinen' ? 'punainen' :
                    rae.vinoumaAste === 'vahva'      ? 'punainen' :
                    rae.vinoumaAste === 'huomio'     ? '' :   // amber on default
                    'teal';
    raeSubTeksti  = { tasainen: 'Q1/Q4 — tasainen jakauma', huomio: 'Q1/Q4 — lievä vinouma',
                      vahva: 'Q1/Q4 — selkeä vinouma', kriittinen: 'Q1/Q4 — kriittinen vinouma'
                    }[rae.vinoumaAste];
  }

  // ── Bio KPI-luku ──
  var bioLukuKlass = poikkeusLkm > 0 ? 'teal' : bioSignaalit.length > 0 ? 'sininen' : '';
  var bioSubTeksti = bioMitattu === 0
    ? 'Mittauksia ei vielä'
    : poikkeusLkm > 0
      ? poikkeusLkm + ' poikkeuslupakelpoista'
      : bioMitattu + ' pelaajaa mitattu';

  var html = '<div class="tmyli-kortti">';

  // ── Yläpalkki kahdella KPI-luvulla ──
  html += '<div class="tmyli-ylapalkki">';

  // RAE-nappi
  html += '<div class="tmyli-kpi aktiivinen" style="--tm-kpi-vari:#E0A040" onclick="tmYliToggle(this,\'rae\')">' +
    '<div class="tmyli-kpi-label">RAE — syntymäkuukausivinouma</div>' +
    '<div class="tmyli-kpi-luku ' + raeLukuKlass + '">' + raeLukuTeksti +
    '<span class="tmyli-chevron">▾</span></div>' +
    '<div class="tmyli-kpi-sub">' + raeSubTeksti + '</div>' +
    '</div>';

  // Bio-nappi
  html += '<div class="tmyli-kpi" style="--tm-kpi-vari:#3EC9A7" onclick="tmYliToggle(this,\'bio\')">' +
    '<div class="tmyli-kpi-label">Biologinen ikä (Mirwald)</div>' +
    '<div class="tmyli-kpi-luku ' + bioLukuKlass + '">' + bioSignaalit.length +
    '<span class="tmyli-chevron">▾</span></div>' +
    '<div class="tmyli-kpi-sub">' + bioSubTeksti + '</div>' +
    '</div>';

  html += '</div>'; // .tmyli-ylapalkki

  // ── RAE-osasto (oletuksena auki) ──
  html += '<div class="tmyli-osasto auki" id="tmyli-osasto-rae">' + tmRaeHtml(rae) + '</div>';

  // ── Bio-osasto (oletuksena kiinni) ──
  html += '<div class="tmyli-osasto" id="tmyli-osasto-bio">' + tmBioHtml(bioSignaalit) + '</div>';

  html += '</div>'; // .tmyli-kortti

  el.innerHTML = html;
}

/** Toggle: klikkaus vaihtaa aktiiviosen osastoa */
function tmYliToggle(kpiEl, osasto) {
  var kortti = kpiEl.closest('.tmyli-kortti');
  if (!kortti) return;

  kortti.querySelectorAll('.tmyli-kpi').forEach(function(k) { k.classList.remove('aktiivinen'); });
  kortti.querySelectorAll('.tmyli-osasto').forEach(function(o) { o.classList.remove('auki'); });

  kpiEl.classList.add('aktiivinen');
  var oEl = kortti.querySelector('#tmyli-osasto-' + osasto);
  if (oEl) oEl.classList.add('auki');
}

/* ════════════════════════════════════════════
   JULKINEN API
════════════════════════════════════════════ */

/**
 * Pääkutsu VP_v17:stä.
 *
 *   var kaikki = [];
 *   snapshot.forEach(function(doc) { kaikki.push(doc.data()); });
 *   tmYlaikaisyysAlusta(kaikki);
 */
function tmYlaikaisyysAlusta(pelaajat, kohde) {
  if (!Array.isArray(pelaajat)) {
    console.warn('[tm_ylaikaisyys] pelaajat-parametri ei ole taulukko'); return;
  }
  tmRenderYlaikaisyysKortti(pelaajat, kohde);
}

/**
 * Laske yksittäisen pelaajan Mirwald-tulos Excel-tuonnin yhteydessä.
 * Palauttaa objektin joka tallennetaan Firestoreen biologinenIka-kenttään.
 *
 *   var bioDoc = tmLaskeMirwaldPelaajaDoc(
 *     { pituus: 162, istumapituus: 85, paino: 48, sukupuoli: 'P' },
 *     new Date('2012-04-15')
 *   );
 *   pelaajaRef.update({ biologinenIka: bioDoc });
 */
function tmLaskeMirwaldPelaajaDoc(mittaukset, syntymapvm, testipvm) {
  testipvm = testipvm || new Date();
  var kronoIka = (testipvm - syntymapvm) / (1000 * 60 * 60 * 24 * 365.25);
  var offset   = tmMirwaldOffset({
    pituus: mittaukset.pituus, istumapituus: mittaukset.istumapituus,
    paino: mittaukset.paino, ika: kronoIka, sukupuoli: mittaukset.sukupuoli || 'P'
  });
  if (offset === null) return null;
  return {
    laskentamenetelma: 'mirwald2002',
    krono:          Math.round(kronoIka * 100) / 100,
    bio:            Math.round((kronoIka + offset) * 100) / 100,
    maturityOffset: Math.round(offset * 100) / 100,
    phvIka:         Math.round(tmLaskePhvIka(kronoIka, offset) * 100) / 100,
    phvTila:        tmOffsetToPhvTila(offset),
    mirwald:        mittaukset,
    laskettuPvm:    testipvm.toISOString().slice(0, 10)
  };
}
