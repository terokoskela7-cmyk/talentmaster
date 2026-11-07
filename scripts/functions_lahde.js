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

const SIIRTOMODUULIT = ['functions/kayttajahallinta.js', 'functions/suostumus_vahvistus.js'];

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

/**
 * Sisältövartija (PM 7.11.2026, F2:n opetus): testi, joka lukee RAAKAA functions/index.js:ää, ei saa etsiä siirrettyä koodia.
 * Nimivartija ei riitä: admin_auditloki etsi vahvistaSuostumuksen audit-riviä ('suostumus_annettu', severity …) mainitsematta
 * käsittelijän nimeä. Siksi verrataan testin KAIKKIA literaaleja (merkkijono, template ilman ${}, regex):
 * osuma = literaali löytyy jostain siirtomoduulista mutta ei index.js:stä → testi katsoo väärään tiedostoon.
 * Myönteinen tarkistus kaatuisi (CI huomaa), mutta kielteinen (not.toContain / not.toMatch) menisi läpi tyhjällä vertailulla.
 *
 *   siirretytOsumat(testiLahde, { index, moduulit: [[polku, teksti], …] }) → [{ literaali, moduuli }]
 */
const MIN_PITUUS = 10;   // lyhyet merkkijonot ('annettu', 'uid') osuvat kaikkialle eivätkä kerro mitään
function testinLiteraalit(lahde) {
  const acorn = require('acorn');
  const ast = acorn.parse(lahde, { ecmaVersion: 'latest', sourceType: 'module', allowHashBang: true });
  const out = [];
  (function kay(n) {
    if (!n || typeof n.type !== 'string') return;
    if (n.type === 'ExpressionStatement' && n.directive) return;   // 'use strict' ei ole tarkistus
    if (n.type === 'Literal' && n.regex) out.push({ tyyppi: 'regex', arvo: n.regex.pattern, liput: n.regex.flags });
    else if (n.type === 'Literal' && typeof n.value === 'string') out.push({ tyyppi: 'teksti', arvo: n.value });
    else if (n.type === 'TemplateLiteral' && n.expressions.length === 0) out.push({ tyyppi: 'teksti', arvo: n.quasis[0].value.cooked });
    for (const k of Object.keys(n)) {
      if (k === 'loc' || k === 'start' || k === 'end') continue;
      const v = n[k];
      if (Array.isArray(v)) v.forEach(kay); else if (v && typeof v.type === 'string') kay(v);
    }
  })(ast);
  /* Pelkkä tunniste tai polku ('fysioterapeutti', 'TalentMaster_Seura.html') ei ole koodipätkä: se esiintyy missä tahansa
     tiedostossa eikä kerro, mihin testi katsoo. Koodipätkässä on välilyönti tai muu välimerkki. */
  return out.filter((l) => l.arvo.length >= MIN_PITUUS && (l.tyyppi === 'regex' || !/^[\w.\/-]+$/.test(l.arvo)));
}
function siirretytOsumat(testiLahde, { index, moduulit }) {
  const osumat = [];
  for (const l of testinLiteraalit(testiLahde)) {
    let loytyy;
    if (l.tyyppi === 'regex') {
      let re; try { re = new RegExp(l.arvo, l.liput.replace(/[gy]/g, '')); } catch (e) { continue; }
      loytyy = (t) => re.test(t);
    } else loytyy = (t) => t.includes(l.arvo);
    if (loytyy(index)) continue;
    const m = moduulit.find(([, t]) => loytyy(t));
    if (m) osumat.push({ literaali: (l.tyyppi === 'regex' ? '/' + l.arvo + '/' : l.arvo).slice(0, 100), moduuli: m[0] });
  }
  return osumat;
}

/* Lukeeko testi functions/index.js:n TEKSTINÄ? (require('../index') ajaa oikeaa koodia eikä kuulu tähän.) */
const LUKEE_INDEXIN = /functions\/index\.js|'functions', 'index\.js'|readFileSync\([^)]*'index\.js'/;

module.exports = { SIIRTOMODUULIT, lueFunctionsLahde, runko, testinLiteraalit, siirretytOsumat, LUKEE_INDEXIN };
