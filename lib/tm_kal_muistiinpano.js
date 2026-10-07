/* ════════════════════════════════════════════════════════════════════════
   tm_kal_muistiinpano.js — TIETOSUOJA P0 (8.10.2026): kalenteritapahtuman valmentajan muistiinpano EI saa olla tapahtumadokumentissa — pelaaja/huoltaja lukee koko kalenteri-kokoelman (Rules onPelaajanSeura).
   Uusi paikka: seurat/{sid}/kalenteri/{id}/henkilokunta/muistiinpanot = { teksti ≤ 500, paivitetty, muokkaaja_uid } — Rules v3.48: vain oman seuran henkilökunta (pelaaja/huoltaja ei).
   Järjestys: 1) uusi luku (alikokoelma, vanha kenttä varalla) + kirjoitus (alikokoelma, kenttä poistetaan) 2) migraatio (SA-työkalu Excel_Tuonti) 3) vasta sitten Rules-kiristys.
   PURE. · tmMuistiinpanoTeksti(raw) → trimmattu ≤500 | '' · tmMuistiinpanoLuku(t, sub) → teksti (alikokoelma ensin, vanha kenttä varalla) · tmMuistiinpanoSuunnitelma(raw, uid) → { tyhja, sub:{teksti, muokkaaja_uid} | null }
   · tmMuistiinpanoMigraatio(tapahtumat) → { siirrettavat:[{id, teksti}], maara } (vain ei-tyhjät vanhan kentän muistiinpanot; sisältöä ei raportoida, vain määrä)
   · tmMuistiinpanoSiirra(siirrettavat, io, eraKoko) → async { siirretty, ohitettuSub, seis }
   Dual-export: module.exports || window.TM_KAL_MUISTIINPANO.
════════════════════════════════════════════════════════════════════════ */
(function (root) {
  'use strict';
  var MAX = 500;
  function tmMuistiinpanoTeksti(raw) { return typeof raw === 'string' ? raw.trim().slice(0, MAX) : ''; }
  function tmMuistiinpanoLuku(t, sub) { var s = tmMuistiinpanoTeksti(sub && sub.teksti); return s || tmMuistiinpanoTeksti(t && t.muistiinpanot); }
  function tmMuistiinpanoSuunnitelma(raw, uid) { var s = tmMuistiinpanoTeksti(raw); return s ? { tyhja: false, sub: { teksti: s, muokkaaja_uid: uid || null } } : { tyhja: true, sub: null }; }
  function tmMuistiinpanoMigraatio(tapahtumat) {
    var l = []; (Array.isArray(tapahtumat) ? tapahtumat : []).forEach(function (t) { var s = tmMuistiinpanoTeksti(t && t.muistiinpanot); if (t && t.id && s) l.push({ id: t.id, teksti: s }); });
    return { siirrettavat: l, maara: l.length };
  }
  /* Siirto erissä (SA-työkalu). siirrettavat = tmMuistiinpanoMigraatio().siirrettavat; io: { SUB_OLEMASSA(id)→Promise<bool> (alikokoelman dokumentti on jo → EI ylikirjoiteta, vain vanha kenttä poistetaan), ERA([{id, teksti, kirjoitaSub}])→Promise (yksi batch: set sub + update parent {muistiinpanot: delete}), SEIS(virhe|null)→{syy}|null }.
     Pysähtyy ENSIMMÄISEEN istunto-/oikeusvirheeseen (#874-malli); muu virhe heitetään. → { siirretty, ohitettuSub (alikokoelma oli jo, vain kenttä poistettu), seis } */
  async function tmMuistiinpanoSiirra(siirrettavat, io, eraKoko) {
    var koko = eraKoko || 150, tulos = { siirretty: 0, ohitettuSub: 0, seis: null }, l = Array.isArray(siirrettavat) ? siirrettavat : [];
    for (var i = 0; i < l.length; i += koko) {
      var s = io.SEIS(null); if (s) { tulos.seis = s; return tulos; }
      var era = [], ohi = 0;
      for (var k = 0; k < Math.min(koko, l.length - i); k++) { var p = l[i + k], on = await io.SUB_OLEMASSA(p.id); if (on) ohi++; era.push({ id: p.id, teksti: p.teksti, kirjoitaSub: !on }); }
      try { await io.ERA(era); tulos.siirretty += era.length; tulos.ohitettuSub += ohi; }
      catch (e) { var s2 = io.SEIS(e); if (s2) { tulos.seis = s2; return tulos; } throw e; }
    }
    return tulos;
  }
  var API = { tmMuistiinpanoSiirra: tmMuistiinpanoSiirra, MAX: MAX, tmMuistiinpanoTeksti: tmMuistiinpanoTeksti, tmMuistiinpanoLuku: tmMuistiinpanoLuku, tmMuistiinpanoSuunnitelma: tmMuistiinpanoSuunnitelma, tmMuistiinpanoMigraatio: tmMuistiinpanoMigraatio };
  if (typeof module !== 'undefined' && module.exports) module.exports = API; else root.TM_KAL_MUISTIINPANO = API;
})(typeof window !== 'undefined' ? window : this);
