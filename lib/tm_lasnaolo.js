/* ════════════════════════════════════════════════════════════════════════
   tm_lasnaolo.js — K35-6e · läsnäolon oletus "kaikki paikalla" ja yhteenvedon teksti (Tero 11.10.: lähtökohtaisesti kaikki ovat läsnä). PURE; Masterin läsnäolonäkymä vain kytkee.
   · tmLasnaoloEsivalinta(roster, olemassa) → { state:{pid:{tila,syy,saatavuus}}, esivalittu:boolean }
       Merkitsemätön tapahtuma (olemassa-lasnaolijat ilman yhtään tilaa) → kaikki 'paikalla' ESIVALITTUNA (esivalittu:true); valmentaja muuttaa poikkeukset ja KUITTAA tallennuksella.
       Jo merkitty (≥ 1 tila) → ei muuteta: merkityt säilyvät, merkitsemättömät jäävät tyhjiksi (esivalinta vain merkitsemättömälle tapahtumalle).
       EI tallenna mitään — jakson kooste ei saa näyttää läsnäoloa pitämättömistä harjoituksista; tallennus vain valmentajan kuittauksella (Tallenna läsnäolo).
   · tmLasnaoloYhteenveto(state) → { paikalla, myohassa, poissa, merkitsematta, n, teksti:'16/16 paikalla' }
   · tmLasnaoloKooste(state) → { paikalla, myohassa, poissa, merkitsematta } (sama muoto kuin tapahtuman lasnaolo_kooste)
   Myöhemmin (ei tässä): RSVP "estynyt" esivalintana poissa (D189), valmentajan Tänään -muistutus (D142).
   Dual-export: module.exports || window.TM_LASNAOLO.
════════════════════════════════════════════════════════════════════════ */
(function (root) {
  'use strict';
  var TILAT = ['paikalla', 'myohassa', 'poissa'];
  function _tila(x) { return x && TILAT.indexOf(x.tila) >= 0 ? x.tila : null; }
  function tmLasnaoloEsivalinta(roster, olemassa) {
    roster = Array.isArray(roster) ? roster : []; olemassa = olemassa || {};
    var merkitty = roster.some(function (p) { return _tila(olemassa[p.id]); }) || Object.keys(olemassa).some(function (k) { return _tila(olemassa[k]); });
    var state = {}; roster.forEach(function (p) { var ex = olemassa[p.id]; state[p.id] = { tila: merkitty ? _tila(ex) : 'paikalla', syy: (ex && ex.syy) || '', saatavuus: (ex && ex.saatavuus) || null }; });
    return { state: state, esivalittu: !merkitty && roster.length > 0 };
  }
  function tmLasnaoloKooste(state) {
    var k = { paikalla: 0, myohassa: 0, poissa: 0, merkitsematta: 0 };
    Object.keys(state || {}).forEach(function (pid) { var t = _tila(state[pid]); if (t) k[t]++; else k.merkitsematta++; }); return k;
  }
  function tmLasnaoloYhteenveto(state) {
    var k = tmLasnaoloKooste(state), n = k.paikalla + k.myohassa + k.poissa + k.merkitsematta;
    return { paikalla: k.paikalla, myohassa: k.myohassa, poissa: k.poissa, merkitsematta: k.merkitsematta, n: n, teksti: k.paikalla + '/' + n + ' paikalla' };
  }
  var API = { tmLasnaoloEsivalinta: tmLasnaoloEsivalinta, tmLasnaoloKooste: tmLasnaoloKooste, tmLasnaoloYhteenveto: tmLasnaoloYhteenveto, TILAT: TILAT };
  if (typeof module !== 'undefined' && module.exports) module.exports = API; else if (root) root.TM_LASNAOLO = API;
})(typeof window !== 'undefined' ? window : null);
