/* Seuran pelaajaluvun jako (Vaihe 0 B.6 #1): KPI-lataus tallettaa pelaajasnapin, ja SEURAAVA lista-/Kehitystilanne-lataus käyttää sen kertaalleen (TTL 20 s, vain sama seura)
   → ei toista koko seuran pelaajalukua. Kertakäyttöinen + tyhjennys kirjoituspoluissa (tmPelaajatEsiTyhjenna) → ei vanhentunutta listaa muokkauksen jälkeen; jokainen KPI-lataus uusii sen. */
(function (g) {
  'use strict';
  var esi = null;
  function talleta(sid, snap) { esi = { sid: sid, t: Date.now(), snap: snap }; }
  function tyhjenna() { esi = null; }
  function ota(sid) { var e = esi; esi = null; return e && e.sid === sid && (Date.now() - e.t) < 20000 ? e.snap : null; }
  function lue(db, sid) { return ota(sid) || db.collection('seurat').doc(sid).collection('pelaajat').get(); }
  g.tmPelaajatEsiTalleta = talleta; g.tmPelaajatEsiTyhjenna = tyhjenna; g.tmPelaajatEsiOta = ota; g.tmLuePelaajatSnap = lue;
  if (typeof module !== 'undefined' && module.exports) module.exports = { talleta: talleta, tyhjenna: tyhjenna, ota: ota, lue: lue };
})(typeof window !== 'undefined' ? window : globalThis);
