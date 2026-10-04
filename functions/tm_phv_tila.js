/* ════════════════════════════════════════════════════════════════════════
   tm_phv_tila.js — PHV-tilan YKSI lukusääntö (PR C, PHV-sanaston yhtenäistys 4.10.2026)

   KANONINEN SANASTO (Mirwald 2002, lib/tm_bioika.js — EI muita merkityksiä):
     PRE  = ennen kasvupyrähdystä (offset < −1,0 v)
     LAH  = lähestyy kasvupyrähdystä (−1,0 … −0,5)
     PH   = kasvupyrähdyksessä — kuormarajoitin (−0,5 … +0,5)
     POST = kasvupyrähdyksen jälkeen (+0,5 … +1,0)
     AN   = jälki-PHV, yli vuosi kasvupyrähdyksen jälkeen (> +1,0)
   Vanhaa lomake-/tuontisanastoa (jossa AN tarkoitti päinvastaista) EI tueta lukijoissa.

   SÄÄNTÖ 3 (Teron päätös): PHV-tila on voimassa VAIN mittauslähteestä. Lukijat näkevät vain
   pelaajadokumentin, joten mittauslähde = pikakenttä `biologinenIka_viimeisin` (Testaus_v9:n
   kasvumittaus kirjoittaa sen samassa batchissa kuin phv_tila:n ja biologinen_ika-dokumentin).
   Ilman sitä tila on 'tuntematon' — myös silloin kun `phv_tila`-kentässä on lomakkeelta tai
   tuonnista tullut arvo. Mittaus voittaa: jos phv_tila ja mittauksen koodi eroavat, mittaus pätee.

   'tuntematon' EI ole tallennettava koodi — kirjoittajat kirjoittavat vain kanonisia koodeja.

   KUORMASUOJA (Teron päätös B, 4.10.2026): mittaamaton ('tuntematon') saa varovaisimman kuorman (S2-katto,
   sama raja kuin PH, ilman PH-varoitustekstiä) VAIN kalenteri-ikäikkunassa, jossa kasvupyrähdys on todennäköinen:
   pojat 12–15 v, tytöt 10–13 v (PHV_IKKUNA_POJAT / PHV_IKKUNA_TYTOT). Ikkunan ulkopuolella normaali ikävaiheen
   kuorma. Mitattu PH ja lomakkeelta ilmoitettu PH: varovaisin kuorma iästä riippumatta (ennallaan).
   tmPhvKuormaTila(doc) → 'PH' | 'tuntematon' (= varovainen, ei PH-tekstiä) | kanoninen koodi | null (normaali).
   Henkilökunnalle: "ilmoitettu, ei mitattu" (tmPhvIlmoitettuPH) ja "PHV ei mitattu" (tmPhvEiMitattu) — lapselle ei mitään.

   Dual-export: module.exports (Node/Vitest) + globaalit (selain, <script src>).
   functions/tm_phv_tila.js on IDENTTINEN kopio (deploy pakkaa vain functions/) — testi vartioi.
   ════════════════════════════════════════════════════════════════════════ */
(function (root) {
  'use strict';

  var PHV_KANONISET = ['PRE', 'LAH', 'PH', 'POST', 'AN'];

  function _onKanoninen(k) { return typeof k === 'string' && PHV_KANONISET.indexOf(k) >= 0; }

  function _onMittaus(doc) {
    var bio = doc && doc.biologinenIka_viimeisin;
    return !!(bio && typeof bio === 'object');
  }

  // Pelaajadokumentti → 'PRE'|'LAH'|'PH'|'POST'|'AN'|'tuntematon'.
  function tmPhvTila(doc) {
    if (!doc || typeof doc !== 'object' || !_onMittaus(doc)) return 'tuntematon';
    var mitattu = doc.biologinenIka_viimeisin.phv_tila_koodi;
    if (_onKanoninen(mitattu)) return mitattu;
    if (_onKanoninen(doc.phv_tila)) return doc.phv_tila;   // vanha mittausdokki ilman koodia → pikakenttä
    return 'tuntematon';
  }

  // Sama kuin tmPhvTila, mutta 'tuntematon' → null (lukijat, joissa "ei tietoa" = null/falsy).
  function tmPhvKoodi(doc) {
    var t = tmPhvTila(doc);
    return t === 'tuntematon' ? null : t;
  }

  // Kalenteri-ikäikkunat, joissa mittaamaton pelaaja saa varovaisimman kuorman (päätös B). Rajat mukaan lukien.
  var PHV_IKKUNA_POJAT = { min: 12, max: 15 };
  var PHV_IKKUNA_TYTOT = { min: 10, max: 13 };

  // Kalenteri-ikä (vuosi − syntymävuosi; varalla valmis `ika`-kenttä) — sama kuin muu ikävaihe-logiikka. null jos ei tiedossa.
  function _kalenteriIka(doc, nyt) {
    var v = (nyt instanceof Date ? nyt : new Date()).getFullYear();
    var sv = doc && doc.syntymaVuosi;
    if (sv == null && doc && doc.syntymaaika) {
      var sa = doc.syntymaaika, d = (sa && typeof sa.toDate === 'function') ? sa.toDate() : (sa && sa.seconds ? new Date(sa.seconds * 1000) : new Date(sa));
      if (d && !isNaN(d.getTime())) sv = d.getFullYear();
    }
    var n = Number(sv);
    if (sv != null && !isNaN(n)) return v - n;
    var ik = doc && doc.ika;   // laskentaobjektit (tm-profile / tm-prescription) kantavat valmiin iän
    return (ik != null && !isNaN(Number(ik))) ? Number(ik) : null;
  }
  // Onko pelaaja ikäikkunassa? Sukupuoli 'M' → pojat, 'N' → tytöt, tuntematon → yhdistetty 10–15 (varovainen).
  // Ikä tuntematon → true (ei voida sulkea pois kasvupyrähdystä → varovainen).
  function tmPhvIkkunassa(doc, nyt) {
    var ika = _kalenteriIka(doc, nyt);
    if (ika == null) return true;
    var sp = String((doc && doc.sukupuoli) || '').toUpperCase();
    var r = sp === 'M' || sp === 'P' ? PHV_IKKUNA_POJAT : (sp === 'N' || sp === 'T') ? PHV_IKKUNA_TYTOT
      : { min: PHV_IKKUNA_TYTOT.min, max: PHV_IKKUNA_POJAT.max };
    return ika >= r.min && ika <= r.max;
  }

  // Kuormarajoittimen tila: 'PH' (mitattu → PH-teksti) | 'tuntematon' (varovainen ilman PH-tekstiä: ilmoitettu PH tai
  // mittaamaton ikäikkunassa) | mitattu kanoninen koodi | null (mittaamaton ikkunan ulkopuolella → normaali kuorma).
  function tmPhvKuormaTila(doc, nyt) {
    var t = tmPhvTila(doc);
    if (t !== 'tuntematon') return t;
    if (tmPhvIlmoitettuPH(doc)) return 'tuntematon';
    return tmPhvIkkunassa(doc, nyt) ? 'tuntematon' : null;
  }
  function tmPhvKuormaVarovainen(doc, nyt) {
    var k = tmPhvKuormaTila(doc, nyt);
    return k === 'PH' || k === 'tuntematon';
  }
  // Henkilökunnalle "PHV ei mitattu": mittaamaton ikäikkunassa (saa varovaisen kuorman ilman PH-merkintää).
  function tmPhvEiMitattu(doc, nyt) {
    return !!doc && tmPhvTila(doc) === 'tuntematon' && !tmPhvIlmoitettuPH(doc) && tmPhvIkkunassa(doc, nyt);
  }

  // Henkilökunnalle: PH merkitty (lomake/tuonti) mutta EI mitattu → "ilmoitettu, ei mitattu".
  // PH tarkoittaa kasvupyrähdystä molemmissa sanastoissa, joten merkintä on yksiselitteinen.
  function tmPhvIlmoitettuPH(doc) {
    return !!doc && tmPhvTila(doc) === 'tuntematon' && doc.phv_tila === 'PH';
  }

  // ── Kirjoittajat: lomakkeen/Excel-solun arvo → kanoninen koodi ──────────────────────────
  // Käyttäjälle näytetään selkokieliset valinnat; tuonti muuntaa ne koodiksi.
  var PHV_VALINNAT = [
    { koodi: 'PRE',  teksti: 'Ennen kasvupyrähdystä' },
    { koodi: 'PH',   teksti: 'Kasvupyrähdyksessä' },
    { koodi: 'POST', teksti: 'Kasvupyrähdyksen jälkeen' }
  ];
  var _SELKOKIELI = {
    'ennen kasvupyrähdystä': 'PRE',
    'lähestyy kasvupyrähdystä': 'LAH',
    'kasvupyrähdyksessä': 'PH',
    'kasvupyrähdyksen jälkeen': 'POST',
    'yli vuosi kasvupyrähdyksen jälkeen': 'AN'
  };

  // → { koodi: 'PRE'|'LAH'|'PH'|'POST'|'AN'|null, ongelma: null|'moniselitteinen'|'tuntematon', huom: string|null }
  // 'AN'-solu on MONISELITTEINEN (vanhassa pohjassa AN = ennen kasvua, Mirwaldissa jälki-PHV) → ei tulkita hiljaa.
  // 'VA' (vanha pohja: "kasvu ohitse") → POST (hyväksytty muunnos).
  function tmPhvTuontiKoodi(arvo) {
    if (arvo == null) return { koodi: null, ongelma: null, huom: null };
    var raaka = String(arvo).trim();
    if (raaka === '' || raaka === '—' || raaka === '-') return { koodi: null, ongelma: null, huom: null };
    var iso = raaka.toUpperCase();
    if (iso === 'AN') return { koodi: null, ongelma: 'moniselitteinen', huom: null };
    if (iso === 'VA') return { koodi: 'POST', ongelma: null, huom: 'VA tulkittu: kasvupyrähdyksen jälkeen (POST)' };
    if (iso === 'PRE' || iso === 'LAH' || iso === 'PH' || iso === 'POST') return { koodi: iso, ongelma: null, huom: null };
    var pieni = raaka.toLowerCase().replace(/\s+/g, ' ').replace(/[.!]+$/, '');
    if (_SELKOKIELI[pieni]) return { koodi: _SELKOKIELI[pieni], ongelma: null, huom: null };
    return { koodi: null, ongelma: 'tuntematon', huom: null };
  }

  var API = {
    PHV_KANONISET: PHV_KANONISET,
    PHV_VALINNAT: PHV_VALINNAT,
    tmPhvTila: tmPhvTila,
    tmPhvKoodi: tmPhvKoodi,
    PHV_IKKUNA_POJAT: PHV_IKKUNA_POJAT,
    PHV_IKKUNA_TYTOT: PHV_IKKUNA_TYTOT,
    tmPhvIkkunassa: tmPhvIkkunassa,
    tmPhvKuormaTila: tmPhvKuormaTila,
    tmPhvKuormaVarovainen: tmPhvKuormaVarovainen,
    tmPhvEiMitattu: tmPhvEiMitattu,
    tmPhvIlmoitettuPH: tmPhvIlmoitettuPH,
    tmPhvTuontiKoodi: tmPhvTuontiKoodi
  };
  if (typeof module !== 'undefined' && module.exports) module.exports = API;
  if (root) {
    root.TM_PHV = API;
    root.tmPhvTila = tmPhvTila;
    root.tmPhvKoodi = tmPhvKoodi;
    root.tmPhvKuormaVarovainen = tmPhvKuormaVarovainen;
    root.tmPhvKuormaTila = tmPhvKuormaTila;
    root.tmPhvEiMitattu = tmPhvEiMitattu;
    root.tmPhvIlmoitettuPH = tmPhvIlmoitettuPH;
    root.tmPhvTuontiKoodi = tmPhvTuontiKoodi;
  }
})(typeof window !== 'undefined' ? window : null);
