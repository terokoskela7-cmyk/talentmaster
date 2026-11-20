/* ════════════════════════════════════════════════════════════════════════
   tm_paivan_harjoite.js — PÄIVÄN HARJOITE: yksi jaettu apulib kaikille näyttöpaikoille (Pelaaja_v7 Kenttä + Tänään, Solo_Koti, Masterin Resepti, Polku-rivi). PURE. Dual-export: module.exports || window.TM_PAIVAN_HARJOITE.
   Valinta tehdään harjoitelogiikka_v4.js:n valitsePaivanHarjoite(pelaaja, pankki, pvm, seuraPankki, { viikonOsa }) — lähdejärjestys (Tero 20.11.2026): (1) seuran kotiharjoite, joka vastaa jakson konseptia / viikon osaa,
   (2) muuten testidata (TKI → SM → H-H → oletus). Tämä lib vain (a) selvittää viikon osan kirjaimen jaksofokuksesta ja (b) normalisoi tuloksen näytettäväksi, LÄHDE AINA mukana.
   · tmPaivanHarjoiteOsa(jf, raakaOsat, tanaanIso) → 'a'…'e' | null   (sama sääntö kuin Tänään/Polku: lib/tm_viikon_osa.js, valmentajan valinta voittaa)
   · tmPaivanHarjoiteLahde(h)                      → 'seura' | 'tm'   (puuttuva lahde = TM:n oletus; characterization lukitsee TM-polun kentät)
   · tmPaivanHarjoiteNayta(h, ctx)                 → { nimi, ohje, kesto, lahde, lahdeNimi, osa, jaksosta, video_url } | null   ctx: { seuranNimi }; lahdeNimi = seuran nimi (seura) | null (tm → UI:n sanasto "TalentMaster")
   §7.22: ei tasoja, ei vertailua, ei velvoittavaa sävyä; osa vain kirjaimena + nimenä kutsujalta. Ei Firebasea.
════════════════════════════════════════════════════════════════════════ */
(function (root) {
  'use strict';
  function _vo() { try { return (typeof module !== 'undefined' && module.exports && typeof require === 'function') ? require('./tm_viikon_osa.js') : (root && root.TM_VIIKON_OSA); } catch (e) { return root && root.TM_VIIKON_OSA; } }
  function _s(v) { return typeof v === 'string' && v.trim() ? v.trim() : null; }
  function tmPaivanHarjoiteOsa(jf, raakaOsat, tanaanIso) {
    var VO = _vo(); if (!VO || !jf || !jf.konsepti_avain) return null;
    try { var k = VO.tmViikonOsaPelaajalle(jf, raakaOsat, tanaanIso); return typeof k === 'string' && /^[A-Za-z]$/.test(k) ? k.toLowerCase() : null; } catch (e) { return null; }
  }
  function tmPaivanHarjoiteLahde(h) { return h && h.lahde === 'seura' ? 'seura' : 'tm'; }
  function tmPaivanHarjoiteNayta(h, ctx) {
    if (!h || !_s(h.nimi)) return null;
    var lahde = tmPaivanHarjoiteLahde(h);
    return { nimi: h.nimi, ohje: _s(h.ohje), kesto: _s(h.kesto), lahde: lahde, lahdeNimi: lahde === 'seura' ? (_s(ctx && ctx.seuranNimi)) : null, osa: h.jaksosta === true && h.osa ? String(h.osa) : null, jaksosta: h.jaksosta === true, video_url: /^https?:\/\//i.test(String(h.video_url || '')) ? h.video_url : null };
  }
  var API = { tmPaivanHarjoiteOsa: tmPaivanHarjoiteOsa, tmPaivanHarjoiteLahde: tmPaivanHarjoiteLahde, tmPaivanHarjoiteNayta: tmPaivanHarjoiteNayta };
  if (typeof module !== 'undefined' && module.exports) module.exports = API; else if (root) root.TM_PAIVAN_HARJOITE = API;
})(typeof window !== 'undefined' ? window : this);
