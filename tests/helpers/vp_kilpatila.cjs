/* VP:n seuranvaihdon kilpatilanne (projekti 03): vm-sandboxit, jotka ajavat VP:n funktioita, tarvitsevat sukupolvitunnisteen, latauksen seuran
   (_pelaajatSeura …) ja kaksi vartija-apuria. Apurit puretaan VP:n OIKEASTA lähteestä (ei tynkiä), jotta testit ajavat tuotannon vartijan. */
const fs = require('fs'), path = require('path'), vm = require('vm');
const VP = fs.readFileSync(path.join(__dirname, '..', '..', 'TalentMaster_VP_v25.html'), 'utf8');
function pura(tunniste) {
  const i = VP.indexOf(tunniste); if (i < 0) throw new Error('ei löydy: ' + tunniste);
  let syv = 0;
  for (let k = VP.indexOf('{', i); k < VP.length; k++) { if (VP[k] === '{') syv++; else if (VP[k] === '}') { syv--; if (!syv) return VP.slice(i, k + 1); } }
  throw new Error('sulkeet');
}
const APURIT = pura('function _vpLatausVanhentunut(') + '\n' + pura('function _vpKirjoitusEstetty(');
/* alusta(ctx): kutsutaan createContextin JÄLKEEN. Lataus-seurat = sandboxin _seuraId (= "lataus on valmis ja kuuluu nykyiseen seuraan"). */
function alusta(ctx) {
  vm.runInContext('var _vpLatausSukupolvi = 0; var _pelaajatSeura = _seuraId, _toimenpiteetSeura = _seuraId, _seurantaKuittauksetSeura = _seuraId;\n' + APURIT, ctx);
  return ctx;
}
module.exports = { alusta };
