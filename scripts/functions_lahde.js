'use strict';
/**
 * Rivikattojen purku F1 — functions/index.js:n LÄHDE siirtomoduuleineen (vrt. scripts/kuoren_lahde.js Seuralle).
 *
 * Lähdevartijat ja vm-ajotestit purkavat käsittelijöitä functions/index.js:n tekstistä. Kun käsittelijä siirretään moduuliin
 * (index.js:ään jää ohut exports.X = functions.region(...)...https.onCall(moduuli.X)), testit lukevat tämän kautta, jotta
 * siirretty koodi pysyy vartioinnin piirissä eikä vartija tyhjene hiljaa.
 *
 *   lueFunctionsLahde(juuri) → index.js + jokainen SIIRTOMODUULI (tässä järjestyksessä, rivinvaihdolla erotettuna)
 *   runko(lahde, nimi)       → käsittelijän runko kummassa tahansa muodossa:
 *                              index.js: 'exports.X = functions … .https.onCall(async (data, context) => { … \n  });'
 *                              moduuli:  'exports.X = (async (data, context) => { … \n  });'
 *                              Molemmat asettavat vm-kontekstissa exports.X = käsittelijä (index-muoto ketju-tyngällä region/runWith/https.onCall).
 */
const fs = require('fs');
const path = require('path');

const SIIRTOMODUULIT = ['functions/kayttajahallinta.js'];

function lueFunctionsLahde(juuri) {
  const j = juuri || path.join(__dirname, '..');
  return [fs.readFileSync(path.join(j, 'functions', 'index.js'), 'utf8')]
    .concat(SIIRTOMODUULIT.map((m) => fs.readFileSync(path.join(j, m), 'utf8'))).join('\n');
}

function runko(lahde, nimi, ilmanLoppua) {
  let i = lahde.indexOf('exports.' + nimi + ' = (async (data, context) => {');
  if (i < 0) i = lahde.indexOf('exports.' + nimi + ' = functions');
  if (i < 0) throw new Error('käsittelijää ei löydy: ' + nimi);
  const j = lahde.indexOf('\n  });', i);
  return lahde.slice(i, ilmanLoppua ? j : j + 6);
}

module.exports = { SIIRTOMODUULIT, lueFunctionsLahde, runko };
