/* Seuran pelaajaluvun jako (Vaihe 0 B.6 #1): KPI-lataus tallettaa pelaajasnapin, ja SEURAAVA lista-/Kehitystilanne-lataus käyttää sen kertaalleen (TTL 20 s, vain sama seura)
   → ei toista koko seuran pelaajalukua. Kertakäyttöinen + tyhjennys kirjoituspoluissa (tmPelaajatEsiTyhjenna) → ei vanhentunutta listaa muokkauksen jälkeen; jokainen KPI-lataus uusii sen. */
(function (g) {
  'use strict';
  var esi = null, kesken = {};
  function talleta(sid, snap) { esi = { sid: sid, t: Date.now(), snap: snap }; }
  function tyhjenna() { esi = null; kesken = {}; }
  function ota(sid) { var e = esi; esi = null; return e && e.sid === sid && (Date.now() - e.t) < 20000 ? e.snap : null; }
  function lue(db, sid) { return ota(sid) || db.collection('seurat').doc(sid).collection('pelaajat').get(); }
  /* KPI-lukija (Yhteenveto renderöidään käynnistyksessä kahdesti: kirjautuminen + joukkueet-onSnapshot → 2 KPI-latausta). Ei kuluta:
     tuore (<10 s) snap tai jo käynnissä oleva luku jaetaan, muuten luetaan ja talletetaan → lista/Kehitystilanne ottaa sen kertaalleen. */
  function lueKpi(db, sid) {
    if (esi && esi.sid === sid && (Date.now() - esi.t) < 10000) return Promise.resolve(esi.snap);
    if (kesken[sid]) return kesken[sid];
    var l = db.collection('seurat').doc(sid).collection('pelaajat').get().then(function (snap) { if (kesken[sid] === l) { delete kesken[sid]; talleta(sid, snap); } return snap; }, function (e) { if (kesken[sid] === l) delete kesken[sid]; throw e; });   // tyhjennä() kesken luvun → vanhentunutta ei talleteta
    kesken[sid] = l; return l;
  }
  g.tmLuePelaajatKpi = lueKpi;
  g.tmPelaajatEsiTalleta = talleta; g.tmPelaajatEsiTyhjenna = tyhjenna; g.tmPelaajatEsiOta = ota; g.tmLuePelaajatSnap = lue;
  if (typeof module !== 'undefined' && module.exports) module.exports = { lueKpi: lueKpi, talleta: talleta, tyhjenna: tyhjenna, ota: ota, lue: lue };
})(typeof window !== 'undefined' ? window : globalThis);
