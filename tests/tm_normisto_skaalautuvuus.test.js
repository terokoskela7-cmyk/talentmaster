/* PR 3b · palvelinyhteensopivuus: libit Nodessa ilman window/DOM + suorituskyky 2 000 pelaajalla ja 80 joukkueella (docs/NORMISTO_JA_SEURAN_LINJA.md §6). */
import { describe, it, expect } from 'vitest';
import { createRequire } from 'module';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';
import { execFileSync } from 'child_process';
const require = createRequire(import.meta.url);
const juuri = join(dirname(fileURLToPath(import.meta.url)), '..');
const TK = require('../lib/tm_tekniikka.js'), FY = require('../lib/tm_fyysinen.js');
const NYT = Date.UTC(2026, 9, 10, 12), PV = '2026-09-15';

describe('palvelinyhteensopivuus: Node ilman window/DOM', () => {
  it('normisto-, joukkuesääntö-, tekniikka- ja fyysinen-lib puhtaassa Node-prosessissa (window/document puuttuvat; Node 26:n oma navigator ei ole selainriippuvuus), myös seuran asetuksilla', () => {
    const koodi = `
      for (const g of ['window', 'document', 'self']) if (typeof globalThis[g] !== 'undefined') throw new Error('selainglobaali ' + g);
      const NO = require('./lib/tm_normisto.js'), S = require('./lib/tm_joukkuesaanto.js'), TK = require('./lib/tm_tekniikka.js'), FY = require('./lib/tm_fyysinen.js');
      const p = { id: 'a', syntymaVuosi: 2012, sukupuoli: 'M', joukkue: 'P14', joukkueet: ['j'], tki_viimeisin: 45, tki_pvm: '2026-09-15', hh_viimeisin: { kasirata: 99 }, hh_pvm: '2026-09-15', biologinenIka_viimeisin: { phv_tila_koodi: 'POST' } };
      const nyt = Date.UTC(2026, 9, 10, 12), docs = [{ id: 'j', nimi: 'P14' }], a = { rajat: { TKI: 50 } };
      console.log(JSON.stringify([TK.tmTekniikkaMittari(p, nyt).kehityskohde, TK.tmTekniikkaMittari(p, nyt, { asetukset: a }).kehityskohde, FY.tmFyysinenPelaaja(p, nyt).tila, TK.tmTekniikkaYhteenveto([p], docs, nyt).joukkueita, FY.tmFyysinenYhteenveto([p], docs, nyt).joukkueita, S.tmJoukkueSaanto({ yht: 6, mitattu: 6, kehityskohteita: 2 }).luokka, NO.tmNormistoRatkaise(a).rajat.TKI.lahde]));`;
    expect(JSON.parse(execFileSync(process.execPath, ['-e', koodi], { cwd: juuri, encoding: 'utf8' }).trim())).toEqual([false, true, 'kehityskohde', 1, 1, 'kehityskohde', 'seura']);
  });
  it('libeissä ei window/document/localStorage-viittauksia koodissa (vain dual-export-vartija typeof window)', () => {
    const fs = require('fs'); for (const f of ['lib/tm_normisto.js', 'lib/tm_joukkuesaanto.js', 'lib/tm_tekniikka.js', 'lib/tm_fyysinen.js']) { const s = fs.readFileSync(join(juuri, f), 'utf8').replace(/\/\*[\s\S]*?\*\//g, '').replace(/\/\/.*$/gm, ''); expect(s, f).not.toMatch(/document\.|localStorage|navigator\.|window\.(?!TM_|tm)/); }
  });
});

describe('suorituskyky: 2 000 pelaajaa, 80 joukkuetta', () => {
  const J = Array.from({ length: 80 }, (_, i) => ({ id: 'j' + i, nimi: (i % 2 ? 'T' : 'P') + (9 + (i % 8)) + ' Joukkue' + i }));
  const P = Array.from({ length: 2000 }, (_, i) => { const j = i % 80; return { id: 'p' + i, syntymaVuosi: 2012 - (j % 4), sukupuoli: j % 2 ? 'N' : 'M', joukkue: J[j].nimi, joukkueet: [J[j].id], tki_viimeisin: 20 + (i * 7) % 60, tki_pvm: PV, sm_pallo_viimeisin: 8 + (i % 5) * 0.3, sm_juoksu_viimeisin: 6.5 + (i % 4) * 0.2, tsi_pvm: PV,
    hh_viimeisin: { lin30m: 4.3 + (i % 9) * 0.15, cmj: 20 + (i % 15), kasirata: 12 + (i % 11), mas: 11 + (i % 6) }, hh_pvm: PV, biologinenIka_viimeisin: i % 3 ? { phv_tila_koodi: ['PRE', 'LAH', 'PH', 'POST'][i % 4] } : undefined }; });
  it('tekniikka- ja fyysinen yhteenveto yhteensä < 200 ms (aika raportoidaan: PERF-rivi)', () => {
    TK.tmTekniikkaYhteenveto(P, J, NYT); FY.tmFyysinenYhteenveto(P, J, NYT);   // lämmittely
    const t0 = process.hrtime.bigint(); const a = TK.tmTekniikkaYhteenveto(P, J, NYT), b = FY.tmFyysinenYhteenveto(P, J, NYT); const ms = Number(process.hrtime.bigint() - t0) / 1e6;
    console.log('PERF 2000 pelaajaa x 80 joukkuetta: tekniikka+fyysinen ' + ms.toFixed(1) + ' ms'); expect(a.joukkueita).toBe(80); expect(b.joukkueita).toBe(80); expect(ms).toBeLessThan(200);
  });
  it('seuran asetukset eivät hidasta merkittävästi (< 300 ms)', () => {
    const A = { rajat: { TKI: 45, FYS_TASO_RAJA: 2 }, testit: ['lin30m', 'cmj', 'kasirata'] }, t0 = process.hrtime.bigint(); TK.tmTekniikkaYhteenveto(P, J, NYT, { asetukset: A }); FY.tmFyysinenYhteenveto(P, J, NYT, { asetukset: A });
    const ms = Number(process.hrtime.bigint() - t0) / 1e6; console.log('PERF seuran asetuksilla ' + ms.toFixed(1) + ' ms'); expect(ms).toBeLessThan(300);
  });
});
