/* Masterin Kausi-näkymän (renderSeason + _avaaKausiPelaajat) ajo vm-sandboxissa oikeilla libeillä (kytkentätesti: kortti, popup, banneri, kattavuus). Ei Firebasea. */
'use strict';
const fs = require('fs'), path = require('path'), vm = require('vm');
const juuri = path.join(__dirname, '..', '..'), lue = (f) => fs.readFileSync(path.join(juuri, f), 'utf8');
function funktio(src, alku) { const i = src.indexOf(alku); if (i < 0) throw new Error('ei löydy ' + alku); let d = 0; for (let j = src.indexOf('{', i); j < src.length; j++) { if (src[j] === '{') d++; else if (src[j] === '}' && --d === 0) return src.slice(i, j + 1); } throw new Error('ei sulje ' + alku); }
const LIBIT = ['tm_pvm.js', 'tm_viikko.js', 'tm_phv_tila.js', 'tm_idp.js', 'tm_eerikkila_normit.js', 'tm_normisto.js', 'tm_testipaiva.js', 'tm_joukkue.js', 'tm_joukkuesaanto.js', 'tm_tekniikka.js', 'tm_fyysinen.js', 'tm_koti_luvut.js', 'tm_nakyma_ryhmat.js'];

function luo(P, nytMs) {
  const el = {}, modaalit = [];
  const mk = (id) => ({ id, innerHTML: '', textContent: '', style: {}, classList: { add() {}, remove() {}, contains: () => false }, remove() {}, appendChild() {}, onclick: null, value: '' });
  const doc = { getElementById: (id) => (el[id] = el[id] || mk(id)), createElement: () => { const e = mk('x'); modaalit.push(e); return e; }, body: { appendChild(e) { e.__liitetty = true; } }, addEventListener() {}, querySelector: () => null, querySelectorAll: () => [] };
  const sb = { console: { log() {}, warn() {}, error() {} }, document: doc, Date, Math, JSON, Object, Array, String, Number, Set, Map, isNaN, parseFloat, parseInt, setTimeout: () => 0 };
  sb.window = sb; vm.createContext(sb);
  LIBIT.forEach((f) => { try { vm.runInContext(lue('lib/' + f), sb, { filename: f }); } catch (e) { throw new Error(f + ': ' + e.message); } });
  Object.assign(sb, { _demo: false, _seuraId: 'x', _pelaajatData: P, masterT: (x) => x, _tmHenkiloNimi: (p) => p.id, _devIkaSp: (p) => ({ ika: p.syntymaVuosi ? new Date(nytMs).getFullYear() - p.syntymaVuosi : null, sp: p.sukupuoli === 'N' ? 'N' : 'M' }), _mSelBtn: () => '', pickPlayer() {}, setWs() {}, toast() {} });
  sb.Date = class extends Date { constructor(...a) { super(...(a.length ? a : [nytMs])); } static now() { return nytMs; } };
  const MA = lue('TalentMaster_Master_v16.html');
  ['_mSeasonLuvut', '_avaaKausiPelaajat = function', 'renderSeason'].forEach((n) => { const a = n.indexOf('=') > 0 ? 'window.' + n : 'function ' + n; vm.runInContext(n === '_avaaKausiPelaajat = function' ? funktio(MA, a) .replace(/^window\./, 'window.') + ';' : funktio(MA, a), sb); });
  return { sb, el, modaalit, kausi() { for (let i = 0; i < 25; i++) { try { sb.renderSeason(); break; } catch (e) { const m = /^(\w+) is not defined/.exec(e.message); if (!m || i === 24) throw e; sb[m[1]] = []; } } return { pulse: doc.getElementById('seasonPulse').innerHTML, hist: doc.getElementById('seasonHist').innerHTML }; }, popup(dim) { modaalit.length = 0; sb._avaaKausiPelaajat(dim); const m = modaalit.filter((e) => e.__liitetty).pop() || modaalit[modaalit.length - 1]; return m ? m.innerHTML : ''; } };
}
module.exports = { luo, funktio, LIBIT };
