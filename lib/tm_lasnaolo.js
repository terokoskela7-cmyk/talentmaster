/* ════════════════════════════════════════════════════════════════════════
   tm_lasnaolo.js — K35-6e · läsnäolon oletus "kaikki paikalla" ja yhteenvedon teksti (Tero 11.10.: lähtökohtaisesti kaikki ovat läsnä). PURE; Masterin läsnäolonäkymä vain kytkee.
   · tmLasnaoloEsivalinta(roster, olemassa, t) → { state:{pid:{tila,syy,saatavuus}}, esivalittu:boolean }  (t = käännösfunktio, avain = fi-teksti)
       Merkitsemätön tapahtuma (olemassa-lasnaolijat ilman yhtään tilaa) → kaikki 'paikalla' ESIVALITTUNA (esivalittu:true); valmentaja muuttaa poikkeukset ja KUITTAA tallennuksella.
       Jo merkitty (≥ 1 tila) → ei muuteta: merkityt säilyvät, merkitsemättömät jäävät tyhjiksi (esivalinta vain merkitsemättömälle tapahtumalle).
       Poikkeus: pelaajan ennakkoilmoitus saatavuus 'estynyt' (lasnaolijat-dokki) → esivalinta 'poissa', syy t('ilmoitti estyneeksi') — ettei poissaolija jää vahingossa paikalle merkittynä (D189). 'tulossa' → paikalla.
       EI tallenna mitään — jakson kooste ei saa näyttää läsnäoloa pitämättömistä harjoituksista; tallennus vain valmentajan kuittauksella (Tallenna läsnäolo).
   · tmLasnaoloYhteenveto(state, t) → { paikalla, myohassa, poissa, merkitsematta, n, teksti:'16/16 paikalla · 1 myöhässä · 2 poissa' } — tekstit t():n kautta (avaimet 'paikalla' / 'myöhässä' / 'poissa'), ei kovakoodattua suomea
   · tmLasnaoloKooste(state) → { paikalla, myohassa, poissa, merkitsematta } (sama muoto kuin tapahtuman lasnaolo_kooste)
   Myöhemmin (ei tässä): valmentajan Tänään -muistutus (D142).
   Dual-export: module.exports || window.TM_LASNAOLO.
════════════════════════════════════════════════════════════════════════ */
(function (root) {
  'use strict';
  var TILAT = ['paikalla', 'myohassa', 'poissa'];
  function _tila(x) { return x && TILAT.indexOf(x.tila) >= 0 ? x.tila : null; }
  function _tt(t) { return typeof t === 'function' ? t : function (x) { return x; }; }
  function tmLasnaoloEsivalinta(roster, olemassa, t) {
    var T = _tt(t);
    roster = Array.isArray(roster) ? roster : []; olemassa = olemassa || {};
    var merkitty = roster.some(function (p) { return _tila(olemassa[p.id]); }) || Object.keys(olemassa).some(function (k) { return _tila(olemassa[k]); });
    var state = {}; roster.forEach(function (p) { var ex = olemassa[p.id]; var estynyt = !merkitty && ex && ex.saatavuus === 'estynyt';
      state[p.id] = { tila: merkitty ? _tila(ex) : (estynyt ? 'poissa' : 'paikalla'), syy: estynyt ? T('ilmoitti estyneeksi') : ((ex && ex.syy) || ''), saatavuus: (ex && ex.saatavuus) || null }; });
    return { state: state, esivalittu: !merkitty && roster.length > 0 };
  }
  function tmLasnaoloKooste(state) {
    var k = { paikalla: 0, myohassa: 0, poissa: 0, merkitsematta: 0 };
    Object.keys(state || {}).forEach(function (pid) { var t = _tila(state[pid]); if (t) k[t]++; else k.merkitsematta++; }); return k;
  }
  function tmLasnaoloYhteenveto(state, t) {
    var T = _tt(t), k = tmLasnaoloKooste(state), n = k.paikalla + k.myohassa + k.poissa + k.merkitsematta;
    return { paikalla: k.paikalla, myohassa: k.myohassa, poissa: k.poissa, merkitsematta: k.merkitsematta, n: n, teksti: k.paikalla + '/' + n + ' ' + T('paikalla') + (k.myohassa ? ' · ' + k.myohassa + ' ' + T('myöhässä') : '') + (k.poissa ? ' · ' + k.poissa + ' ' + T('poissa') : '') };
  }
  var API = { tmLasnaoloEsivalinta: tmLasnaoloEsivalinta, tmLasnaoloKooste: tmLasnaoloKooste, tmLasnaoloYhteenveto: tmLasnaoloYhteenveto, TILAT: TILAT };
  if (typeof module !== 'undefined' && module.exports) module.exports = API; else if (root) root.TM_LASNAOLO = API;
})(typeof window !== 'undefined' ? window : null);
