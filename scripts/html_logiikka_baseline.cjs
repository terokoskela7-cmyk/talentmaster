#!/usr/bin/env node
/* html_logiikka_baseline.cjs — laskee tasoihin, rajoihin ja normeihin liittyvän logiikan esiintymät TalentMaster_*.html-tiedostoissa (nykyinen laina = sallittu lista).
   Vartija tests/lib_vartijat.test.js: esiintymien määrä EI saa kasvaa; uusi logiikka kuuluu lib/-tiedostoihin (CLAUDE.md "Kolmen kerroksen malli").
   Ajo: node scripts/html_logiikka_baseline.cjs [--kirjoita] → tests/fixtures/html_logiikka_baseline.json (kirjoita vain kun määrä PIENENEE, esim. logiikka siirretty libiin). */
'use strict';
const fs = require('fs'), path = require('path'), juuri = path.join(__dirname, '..');
const KUVIOT = {
  normitaulu: /EERIKKILA_NORMIT|NORMIREKISTERI|HH_TESTI_MAP/g,
  normihaku: /\beerikkilaTaso\s*\(|\beerikkilaNormiarvo\s*\(/g,
  tkiRaja: /\btki(?:_viimeisin)?\s*(?:<|<=|>=|>)\s*\d{2}\b|\bTKI\s*(?:<|<=|>=|>)\s*\d{2}\b/g,
  tasoRaja: /\b(?:hh_taso|d1_taso|d2_taso|\.taso|_taso)\s*(?:<|<=|>=|>)\s*[1-5](?:\.\d)?\b/g,
  tasoKonversio: /\btki[A-Za-z_]*\s*\/\s*20\b/g,
  /* YKSI TOTUUS: ei kovakoodattuja vanhuusrajoja ("12 kk", "15 kk") eikä tasorajoja tekstissä ("taso < 3", "taso ≥ 3") — raja tulee normistosta/libistä; lista saa vain pienentyä */
  vanhuusRaja: /\b(?:12|15)\s*kk\b|\bkk\s*(?:>|>=)\s*(?:12|15)\b/g,
  tasoTeksti: /\btaso\s*(?:<|≥|>=|<=|≤)\s*[1-5]\b/g
};
function laske() {
  const ulos = {};
  fs.readdirSync(juuri).filter((f) => /^TalentMaster_.*\.html$/.test(f)).sort().forEach((f) => {
    const s = fs.readFileSync(path.join(juuri, f), 'utf8'), o = {}; Object.keys(KUVIOT).forEach((k) => { o[k] = (s.match(KUVIOT[k]) || []).length; }); ulos[f] = o;
  });
  return ulos;
}
module.exports = { laske, KUVIOT };
if (require.main === module) {
  const nyt = laske(), kohde = path.join(juuri, 'tests', 'fixtures', 'html_logiikka_baseline.json');
  if (process.argv.includes('--kirjoita')) { fs.writeFileSync(kohde, JSON.stringify(nyt, null, 2) + '\n'); console.log('Kirjoitettu ' + kohde); } else console.log(JSON.stringify(nyt, null, 2));
}
