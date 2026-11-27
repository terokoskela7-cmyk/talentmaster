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

/* PELAAJA (PM 27.11.2026): DEPLOY-muoto — pääskripti (tm_pelaaja_main.js) + P6 (tm_pelaaja_p6.js) irrotettu, kaikki skriptit defer, odotustilan tynkä (versiotiiviste.js LOHKOT_ULOS + LYKKAYS).
   → { html, dir }: html viittaa irrotettuihin tiedostoihin file://-poluilla (?v poistettu, kuten Masterin deployHtml); `<base href>` = juuri, jotta lib/…-polut toimivat file://-osoitteesta. */
export function deployPelaaja(juuri) {
  const VT = require('../../scripts/versiotiiviste.js'), r = VT.laske(juuri), T = fs.mkdtempSync(path.join(os.tmpdir(), 'tm_deploy_pel_'));
  let html = r.tiedostot['TalentMaster_Pelaaja_v7.html'];
  for (const n of ['tm_pelaaja_main.js', 'tm_pelaaja_p6.js']) {
    fs.writeFileSync(path.join(T, n), r.tiedostot[n]);
    html = html.replace(new RegExp('<script src="' + n.replace('.', '\\.') + '\\?v=[0-9a-f]{8}" defer>'), '<script src="file://' + path.join(T, n) + '" defer>');
  }
  return { html: html.replace(/\?v=[0-9a-f]{8}/g, ''), dir: T, raportti: r.raportti };
}
