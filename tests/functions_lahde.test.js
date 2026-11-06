/* Rivikattojen purku F1 — functions/index.js:n lähde siirtomoduuleineen (scripts/functions_lahde.js).
   Vartioi: (1) jokainen siirtomoduuli on olemassa ja index.js lataa sen, (2) runko() löytää käsittelijän kummassakin muodossa,
   (3) yksikään testi ei lue raakaa functions/index.js:ää ja viittaa siirrettyyn käsittelijään (vartija tyhjenisi hiljaa siirron jälkeen). */
import { describe, it, expect } from 'vitest';
import { readFileSync, readdirSync, existsSync } from 'fs';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';
import { createRequire } from 'module';

const require = createRequire(import.meta.url);
const JUURI = join(dirname(fileURLToPath(import.meta.url)), '..');
const { SIIRTOMODUULIT, lueFunctionsLahde, runko } = require('../scripts/functions_lahde.js');
const INDEX = readFileSync(join(JUURI, 'functions', 'index.js'), 'utf8');

const siirretyt = SIIRTOMODUULIT.flatMap((m) => [...readFileSync(join(JUURI, m), 'utf8').matchAll(/^exports\.(\w+) = \(async \(data, context\) => \{$/gm)].map((x) => ({ m, nimi: x[1] })));

describe('F1 · functions-lähde siirtomoduuleineen', () => {
  it('jokainen siirtomoduuli on olemassa, index.js lataa sen ja vie sen käsittelijät ohuina vienteinä', () => {
    expect(SIIRTOMODUULIT).toContain('functions/kayttajahallinta.js');
    for (const m of SIIRTOMODUULIT) {
      expect(existsSync(join(JUURI, m)), m).toBe(true);
      const nimi = m.replace(/^functions\//, '').replace(/\.js$/, '');
      expect(INDEX, m).toContain("require('./" + nimi + "')");
    }
    expect(siirretyt.map((x) => x.nimi).sort()).toEqual(['aktivoiKayttaja', 'deaktivioiKayttaja', 'lahetaResetLinkki', 'luoKayttaja', 'poistaKayttaja', 'vaihdaKayttajanRooli']);
    for (const { nimi } of siirretyt) {
      expect(INDEX, nimi).toMatch(new RegExp('exports\\.' + nimi + ' = functions\\n(?:  \\.[a-zA-Z]+\\([^\\n]*\\)\\n)*  \\.https\\.onCall\\(kayttajahallinta\\.' + nimi + '\\);'));
      expect(INDEX, nimi + ': runko ei saa jäädä index.js:ään').not.toContain('exports.' + nimi + ' = functions\n  .region(\'europe-west1\')\n  .https.onCall(async');
    }
  });
  it('runko() löytää käsittelijän sekä moduuli- että index-muodossa', () => {
    const L = lueFunctionsLahde(JUURI);
    expect(runko(L, 'luoKayttaja')).toMatch(/^exports\.luoKayttaja = \(async \(data, context\) => \{[\s\S]*estaPaikkamerkkiOsoite\(email\);[\s\S]*\n {2}\}\);$/);
    expect(runko(L, 'lahetaRekisteriKutsu')).toMatch(/^exports\.lahetaRekisteriKutsu = functions\n/);
    expect(() => runko(L, 'eiOlemassa')).toThrow(/eiOlemassa/);
  });
  it('vartija: testit eivät lue raakaa functions/index.js:ää siirrettyjen käsittelijöiden osalta (käytä lueFunctionsLahde)', () => {
    const nimet = siirretyt.map((x) => x.nimi).concat(['SALLITUT_ROOLIT_VAIHTO', 'tarkistaKayttajaToimenpide', 'poistaKirjautumisoikeus', 'vapautaVpUid']);
    const rikkojat = [];
    for (const f of readdirSync(join(JUURI, 'tests')).filter((x) => /\.test\.(js|mjs)$/.test(x) && x !== 'functions_lahde.test.js')) {
      const s = readFileSync(join(JUURI, 'tests', f), 'utf8');
      if (/lueFunctionsLahde/.test(s) || !/functions\/index\.js|'functions', 'index\.js'/.test(s)) continue;
      const osumat = nimet.filter((n) => s.includes(n));
      if (osumat.length) rikkojat.push(f + ': ' + osumat.join(', '));
    }
    expect(rikkojat).toEqual([]);
  });
});
