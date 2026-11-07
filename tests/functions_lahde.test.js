/* Rivikattojen purku F1 — functions/index.js:n lähde siirtomoduuleineen (scripts/functions_lahde.js).
   Vartioi: (1) jokainen siirtomoduuli on olemassa ja index.js lataa sen, (2) runko() löytää käsittelijän kummassakin muodossa,
   (3) yksikään testi ei lue raakaa functions/index.js:ää ja viittaa siirrettyyn käsittelijään (vartija tyhjenisi hiljaa siirron jälkeen),
   (4) sisältövartija (PM 7.11.): raakaa index.js:ää tekstinä lukeva testi ei sisällä literaalia, joka osuu siirrettyyn koodiin
       mutta ei enää index.js:ään — myös ilman käsittelijän nimeä (F2: admin_auditloki). */
import { describe, it, expect } from 'vitest';
import { readFileSync, readdirSync, existsSync } from 'fs';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';
import { createRequire } from 'module';

const require = createRequire(import.meta.url);
const JUURI = join(dirname(fileURLToPath(import.meta.url)), '..');
const { SIIRTOMODUULIT, lueFunctionsLahde, runko, siirretytOsumat, LUKEE_INDEXIN } = require('../scripts/functions_lahde.js');
const INDEX = readFileSync(join(JUURI, 'functions', 'index.js'), 'utf8');

/* Moduulin tiedostonimi ja muuttuja, jolla index.js lataa sen (F1: kayttajahallinta, F2: suostumusVahvistus). */
const tiedosto = (m) => m.replace(/^functions\//, '').replace(/\.js$/, '');
const muuttuja = (m) => (INDEX.match(new RegExp("^const (\\w+) = require\\('\\./" + tiedosto(m) + "'\\);$", 'm')) || [])[1];
const siirretyt = SIIRTOMODUULIT.flatMap((m) => [...readFileSync(join(JUURI, m), 'utf8').matchAll(/^exports\.(\w+) = \(async \(data, context\) => \{$/gm)].map((x) => ({ m, nimi: x[1] })));

describe('F1 · functions-lähde siirtomoduuleineen', () => {
  it('jokainen siirtomoduuli on olemassa, index.js lataa sen ja vie sen käsittelijät ohuina vienteinä', () => {
    expect(SIIRTOMODUULIT).toEqual(['functions/kayttajahallinta.js', 'functions/suostumus_vahvistus.js']);
    for (const m of SIIRTOMODUULIT) {
      expect(existsSync(join(JUURI, m)), m).toBe(true);
      expect(INDEX, m).toMatch(new RegExp("^const \\w+ = require\\('\\./" + tiedosto(m) + "'\\);$", 'm'));
    }
    expect(siirretyt.map((x) => x.nimi).sort()).toEqual(['aktivoiKayttaja', 'deaktivioiKayttaja', 'lahetaResetLinkki', 'luoKayttaja', 'poistaKayttaja', 'vahvistaSuostumus', 'vaihdaKayttajanRooli']);
    for (const { m, nimi } of siirretyt) {
      expect(INDEX, nimi).toMatch(new RegExp('exports\\.' + nimi + ' = functions\\n(?:  \\.[a-zA-Z]+\\([^\\n]*\\)[^\\n]*\\n)*  \\.https\\.onCall\\(' + muuttuja(m) + '\\.' + nimi + '\\);'));
      expect(INDEX, nimi + ': runko ei saa jäädä index.js:ään').not.toContain('exports.' + nimi + ' = functions\n  .region(\'europe-west1\')\n  .https.onCall(async');
    }
  });
  it('runko() löytää käsittelijän sekä moduuli- että index-muodossa', () => {
    const L = lueFunctionsLahde(JUURI);
    expect(runko(L, 'luoKayttaja')).toMatch(/^exports\.luoKayttaja = \(async \(data, context\) => \{[\s\S]*estaPaikkamerkkiOsoite\(email\);[\s\S]*\n {2}\}\);$/);
    expect(runko(L, 'lahetaRekisteriKutsu')).toMatch(/^exports\.lahetaRekisteriKutsu = functions\n/);
    expect(runko(L, 'vahvistaSuostumus')).toMatch(/^exports\.vahvistaSuostumus = \(async \(data, context\) => \{[\s\S]*antaja_puuttuu[\s\S]*\n {2}\}\);$/);
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

  /* (4) Sisältövartija. Literaali = merkkijono, template ilman ${} tai regex (acorn); tunnisteet ja polut ohitetaan.
     SALLITUT: literaali osuu siirrettyyn koodiin, mutta testi käyttää sitä TOISEEN lähteeseen tai rajattuun lohkoon,
     mitä staattinen tarkistus ei näe. Jokainen rivi perustellaan, ja lista ei saa vanhentua (literaali on yhä tiedostossa). */
  const SALLITUT = [
    { f: 'tests/adar_tietosuoja.test.js', literaali: "'valmentaja'", miksi: 'storage.rules-lohko, ei functions' },
    { f: 'tests/huoltajan_vahvistus_selain.test.js', literaali: '/console\\.\\w+\\([^)]*\\bemail\\b/', miksi: 'haeLapsiHuoltajalle-lohko (index.js), ei koko tiedosto' },
    { f: 'tests/suostumus_kovennus_v333.test.js', literaali: 'const paivitys = {', miksi: 'Seuran tallennaMusokkausPelaaja-lohko, ei functions' },
  ];
  const INDEX_TEKSTI = INDEX;
  const MODUULIT = SIIRTOMODUULIT.map((m) => [m, readFileSync(join(JUURI, m), 'utf8')]);
  const tekstilukijat = () => ['tests', 'functions/test'].flatMap((d) => readdirSync(join(JUURI, d)).filter((x) => /\.(js|mjs)$/.test(x)).map((x) => d + '/' + x))
    .filter((f) => f !== 'tests/functions_lahde.test.js')
    .map((f) => [f, readFileSync(join(JUURI, f), 'utf8')])
    .filter(([, s]) => !/lueFunctionsLahde/.test(s) && LUKEE_INDEXIN.test(s));

  it('sisältövartija: index.js:ää tekstinä lukevat testit eivät etsi siirrettyä koodia (myös ilman käsittelijän nimeä)', () => {
    const lukijat = tekstilukijat();
    expect(lukijat.length).toBeGreaterThan(20);   // EI VACUOUS: raakaa index.js:ää lukevia testejä on yhä kymmeniä
    const rikkojat = lukijat.flatMap(([f, s]) => siirretytOsumat(s, { index: INDEX_TEKSTI, moduulit: MODUULIT })
      .filter((o) => !SALLITUT.some((x) => x.f === f && x.literaali === o.literaali))
      .map((o) => f + ': ' + o.literaali + '  (löytyy ' + o.moduuli + ':sta, ei index.js:stä → käytä lueFunctionsLahde)'));
    expect(rikkojat).toEqual([]);
  });

  it('sisältövartija: SALLITUT-lista ei vanhene (jokainen poikkeus osuu yhä)', () => {
    for (const x of SALLITUT) {
      const s = readFileSync(join(JUURI, x.f), 'utf8');
      expect(siirretytOsumat(s, { index: INDEX_TEKSTI, moduulit: MODUULIT }).map((o) => o.literaali), x.f).toContain(x.literaali);
    }
  });

  it('sisältövartija kaatuu tahalliseen rikkojaan (F2:n admin_auditloki-tapaus) eikä hälytä index.js:ssä olevasta tekstistä', () => {
    const rikkoja = [
      "import { readFileSync } from 'fs';",
      "const CF = readFileSync('functions/index.js', 'utf8');",
      "expect(CF).toMatch(/toiminto: 'suostumus_annettu', severity: kohde\\.poikkeama\\.length \\? 'warn' : 'info'/);",
      "expect(CF).not.toContain('kirjBatch.update(pelRef, tmSisainen.tmSisainenRiisu(paivitys))');",
      "expect(CF).toContain(`estaPaikkamerkkiOsoite(email);`);",
    ].join('\n');
    expect(LUKEE_INDEXIN.test(rikkoja)).toBe(true);
    const o = siirretytOsumat(rikkoja, { index: INDEX_TEKSTI, moduulit: MODUULIT });
    expect(o.map((x) => x.moduuli)).toEqual(['functions/suostumus_vahvistus.js', 'functions/suostumus_vahvistus.js', 'functions/kayttajahallinta.js']);
    /* Kontrolli: index.js:ssä yhä oleva teksti, tunnisteet ja 'use strict' eivät hälytä. */
    const puhdas = "'use strict';\nconst CF = lue('functions/index.js');\nexpect(CF).toContain(\"const suostumusVahvistus = require('./suostumus_vahvistus');\");\nexpect(CF).toContain('vahvistaSuostumus');";
    expect(siirretytOsumat(puhdas, { index: INDEX_TEKSTI, moduulit: MODUULIT })).toEqual([]);
  });
});
