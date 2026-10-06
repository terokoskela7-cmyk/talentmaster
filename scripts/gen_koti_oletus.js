'use strict';
/* Generoi lib/tm_koti_oletus.js harjoitelogiikka_v4.js:n TM-oletusharjoitteista (D16: seura ensin, TM varalla). Käyttö: node scripts/gen_koti_oletus.js [--tarkista]
   --tarkista: ei kirjoita, poistuu virhekoodilla jos tiedosto on eri kuin generoitu (testi tests/koti_oletus.test.js ajaa saman vertailun). */
const fs = require('fs'), path = require('path');
const H = require('../harjoitelogiikka_v4.js');
const KENTAT = ['nimi', 'kesto', 'ohje_leikkija', 'ohje_rakentaja', 'ohje_showcase'];
function poimi(h) { const o = {}; KENTAT.forEach(function (k) { if (typeof h[k] === 'string' && h[k]) o[k] = h[k]; }); return (o.nimi && (o.ohje_leikkija || o.ohje_rakentaja || o.ohje_showcase)) ? o : null; }
function kerää() {
  const ulos = {}, lisaa = function (kohde, h) { const o = poimi(h); if (!o) return; ulos[kohde] = ulos[kohde] || []; if (!ulos[kohde].some(function (x) { return x.nimi === o.nimi; })) ulos[kohde].push(o); };
  Object.keys(H.T_KOHDE_PANKKI || {}).forEach(function (k) { (H.T_KOHDE_PANKKI[k] || []).forEach(function (h) { lisaa(h.kehityskohde || k, h); }); });
  const T = (H.PANKKI && H.PANKKI.T) || {};
  Object.keys(T).forEach(function (persona) { const kohde = H.T_MESOSYKLI_KOHDE[persona]; if (!kohde) return; Object.keys(T[persona]).filter(function (k) { return /^vk\d+$/.test(k); }).sort().forEach(function (vk) { lisaa(kohde, T[persona][vk]); }); });
  return ulos;
}
function sisalto() {
  return '/* ════════════════════════════════════════════════════════════════════════\n   tm_koti_oletus.js — TM:n OLETUSKOTIHARJOITTEET kohteittain (D16: seuran sisältö ensin, TM varalla; V1 jakson aloitus). GENEROITU: node scripts/gen_koti_oletus.js — älä muokkaa käsin.\n'
    + '   Lähde: harjoitelogiikka_v4.js (T_KOHDE_PANKKI + PANKKI.T mesosyklit). Testi tests/koti_oletus.test.js vartioi ajautumisen. Muoto: { kehityskohde: [{nimi, kesto, ohje_leikkija, ohje_rakentaja, ohje_showcase}] }.\n'
    + '   Dual-export: module.exports || window.TM_KOTI_OLETUS.\n════════════════════════════════════════════════════════════════════════ */\n(function (root) {\n  \'use strict\';\n  var DATA = ' + JSON.stringify(kerää(), null, 1) + ';\n  if (typeof module !== \'undefined\' && module.exports) module.exports = DATA; else root.TM_KOTI_OLETUS = DATA;\n})(typeof window !== \'undefined\' ? window : this);\n';
}
module.exports = { kerää, sisalto };
if (require.main === module) {
  const kohde = path.join(__dirname, '..', 'lib', 'tm_koti_oletus.js'), uusi = sisalto();
  if (process.argv.includes('--tarkista')) { const vanha = fs.existsSync(kohde) ? fs.readFileSync(kohde, 'utf8') : ''; if (vanha !== uusi) { console.error('lib/tm_koti_oletus.js ei vastaa generoitua — aja node scripts/gen_koti_oletus.js'); process.exit(1); } console.log('OK'); }
  else { fs.writeFileSync(kohde, uusi); console.log('kirjoitettu', kohde); }
}
