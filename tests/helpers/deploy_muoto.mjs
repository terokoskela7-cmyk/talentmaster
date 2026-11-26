/* Masterin DEPLOY-muoto selaintesteihin: scripts/versiotiiviste.js laske() → pääskripti irrotettu tm_master_main.js:ään, head-lohkot tm_master_alku.js:ään, KAIKKI skriptilataukset defer (kuten staging/tuotanto).
   Repon inline-muoto ei paljasta deferin aiheuttamia järjestysvikoja (esim. laiskojen porttien asennus ennen pääskriptiä, 26.11.2026). Käyttö: sivu(html, JUURI, { deploy: true }) (kalenteri_sivu.mjs) tai deployHtml(JUURI). */
import fs from 'fs'; import os from 'os'; import path from 'path'; import { createRequire } from 'module';
const require = createRequire(import.meta.url);
export function deployHtml(juuri, sivuTiedosto = 'TalentMaster_Master_v16.html') {
  const VT = require('../../scripts/versiotiiviste.js'), r = VT.laske(juuri), T = fs.mkdtempSync(path.join(os.tmpdir(), 'tm_deploy_'));
  fs.writeFileSync(path.join(T, 'tm_master_main.js'), r.tiedostot['tm_master_main.js']);
  fs.writeFileSync(path.join(T, 'tm_master_alku.js'), r.tiedostot['tm_master_alku.js'].replace(/\?v=[0-9a-f]{8}/g, ''));
  return r.tiedostot[sivuTiedosto]
    .replace(/<script src="tm_master_main\.js\?v=[0-9a-f]{8}" defer>/, '<script src="file://' + path.join(T, 'tm_master_main.js') + '" defer>')
    .replace(/<script src="tm_master_alku\.js\?v=[0-9a-f]{8}" defer>/, '<script src="file://' + path.join(T, 'tm_master_alku.js') + '" defer>');
}
/** harnessin probe-skripti on viimeinen inline-skripti → DOMContentLoadediin (deferatut skriptit on silloin ajettu; inline-muodossa sama hetki). */
export function probeDclHun(html) {
  const i = html.lastIndexOf('<script>'), j = html.lastIndexOf('</script>');
  return html.slice(0, i) + '<script>document.addEventListener("DOMContentLoaded",function(){' + html.slice(i + 8, j) + '});</script>' + html.slice(j + 9);
}
