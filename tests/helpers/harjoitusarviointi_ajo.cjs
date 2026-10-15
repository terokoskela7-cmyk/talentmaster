'use strict';
/* Harjoitusarviointilomake (lib/tm_harjoitusarviointi.js) ajettuna vm-hiekkalaatikossa minimaalisella DOM-tynkällä: palauttaa renderöidyn #haInner-HTML:n kokoonpanoittain.
   Käyttö: ajaa(lähdekoodi, { t?, tilat }) → { [nimi]: html }. Ei selainta, ei Firebasea. Tynkä on nimetty kuten tuotannon muuttujat (document, window). */
const vm = require('vm');
const KOKOONPANOT = {
  a_lapsuus: { joukkueet: ['U12', 'U13'], valmentajat: [{ uid: 'a', nimi: 'Ville' }], konteksti: { joukkue: 'U12', valmentaja: 'Ville', valmentajaUid: 'a', ikavaihe: 'lapsuus' } },
  a_nuoruus: { joukkueet: ['U12', 'U13'], valmentajat: [{ uid: 'a', nimi: 'Ville' }], konteksti: { joukkue: 'U14', valmentaja: 'Ville', valmentajaUid: 'a', ikavaihe: 'nuoruus' } },
  b_itsearvio: { malliLukko: 'valmennustaidot', tapaLukko: true, otsikko: 'Itsearvio', konteksti: { joukkue: 'U12', valmentaja: 'Ville', valmentajaUid: 'a', arviointitapa: 'itsearvio' } },
  b_havainnointi: { valmentajat: [{ uid: 'a', nimi: 'Ville' }], joukkueet: ['U12'], konteksti: { joukkue: 'U12', arviointitapa: 'havainnointi' }, malliLukko: 'valmennustaidot' },
  ilman_listoja: { config: { q7_kysymys: 'Oma kysymys' }, konteksti: { joukkue: '' } },
  a_toggle_kylla: { joukkueet: ['U12'], konteksti: { joukkue: 'U12' }, jalkeen: '_haSetA8(true)' },
};
function ajaa(src, opts) {
  opts = opts || {}; const ulos = {};
  for (const [nimi, kok] of Object.entries(KOKOONPANOT)) {
    const inner = { innerHTML: '' };
    const doc = { getElementById: (id) => (id === 'haInner' ? inner : null), createElement: () => ({ style: {}, set innerHTML(v) { this._h = v; }, get innerHTML() { return this._h; }, remove() {} }), body: { appendChild() {} } };
    const ctx = { document: doc, console, toast() {}, alert() {}, normiIka: undefined }; ctx.window = ctx; vm.createContext(ctx);
    vm.runInContext(src, ctx);
    const o = Object.assign({}, kok); delete o.jalkeen; if (opts.t) o.t = opts.t;
    ctx.TM_HARJOITUS.avaa(o);
    if (kok.jalkeen) vm.runInContext(kok.jalkeen, ctx);
    ulos[nimi] = inner.innerHTML;
  }
  return ulos;
}
module.exports = { ajaa, KOKOONPANOT };
