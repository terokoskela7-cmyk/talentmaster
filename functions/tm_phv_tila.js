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

   KUORMASUOJA: 'tuntematon' saa varovaisimman kuorman (sama raja kuin PH), mutta ilman
   PH-varoitustekstiä (tmPhvKuormaVarovainen). Henkilökunnan näkymät voivat näyttää lomakkeelta
   ilmoitetun PH:n muodossa "ilmoitettu, ei mitattu" (tmPhvIlmoitettuPH) — lapselle ei.

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

  // Kuormarajoitin: PH TAI tuntematon → varovaisin kuorma. PH-varoitusteksti vain kun tila === 'PH'.
  function tmPhvKuormaVarovainen(doc) {
    var t = tmPhvTila(doc);
    return t === 'PH' || t === 'tuntematon';
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
    tmPhvKuormaVarovainen: tmPhvKuormaVarovainen,
    tmPhvIlmoitettuPH: tmPhvIlmoitettuPH,
    tmPhvTuontiKoodi: tmPhvTuontiKoodi
  };
  if (typeof module !== 'undefined' && module.exports) module.exports = API;
  if (root) {
    root.TM_PHV = API;
    root.tmPhvTila = tmPhvTila;
    root.tmPhvKoodi = tmPhvKoodi;
    root.tmPhvKuormaVarovainen = tmPhvKuormaVarovainen;
    root.tmPhvIlmoitettuPH = tmPhvIlmoitettuPH;
    root.tmPhvTuontiKoodi = tmPhvTuontiKoodi;
  }
})(typeof window !== 'undefined' ? window : null);
