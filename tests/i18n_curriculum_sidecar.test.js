/**
 * i18n · teknis-taktisen curriculumin SV-SIDECAR (lib/tm_teknistaktiset_sv.js).
 *
 * REGRESSIOPORTTI GENEROINNILLE. lib/tm_teknistaktiset.js on generoitu (docs/data/parse_oma_versio.py);
 * sidecar EI ole — se säilyy regeneroinnin yli. Riski ei siis ole ylikirjoitus vaan HILJAINEN VANHENEMINEN:
 * jos curriculum regeneroidaan ja avaimia tulee lisää tai ne muuttuvat, puuttuva sv-avain ei kaadu vaan
 * putoaa fi-fallbackiin — eli suomea ruotsinkielisessä näkymässä ilman virheilmoitusta. Tämä testi pakottaa
 * sidecarin ja curriculumin avainjoukot yhteneviksi: regenerointi joka muuttaa avaimia punaa tämän portin.
 *
 * (a) jokaiselle irrotettavalle fi-avaimelle on sv-vastine  (b) yksikään sv-arvo ei ole fi:n kanssa
 * identtinen = fi-jäänne  (c) ei ei-latinalaisia merkkejä (LLM-putken artefaktit).
 */
import { describe, it, expect } from 'vitest';
import { readFileSync } from 'fs';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';
import { createRequire } from 'module';

const __dir = dirname(fileURLToPath(import.meta.url));
const require = createRequire(import.meta.url);
const juuri = join(__dir, '..');
const P = require('../scripts/i18n_curriculum.cjs');
const { TM_TT_SV } = require('../lib/tm_teknistaktiset_sv.js');

const FI = P.irrota().avaimet;
const SIDECAR = join(juuri, 'lib', 'tm_teknistaktiset_sv.js');

describe('sidecar · kattavuus (a)', () => {
  it('jokaiselle fi-curriculum-avaimelle on sv-vastine', () => {
    const puuttuu = Object.keys(FI).filter((k) => typeof TM_TT_SV[k] !== 'string' || !TM_TT_SV[k].trim());
    expect(puuttuu).toEqual([]);
  });
  it('ei orpoja sv-avaimia (sidecar ei sisällä avaimia joita curriculumissa ei ole)', () => {
    const orvot = Object.keys(TM_TT_SV).filter((k) => !(k in FI));
    expect(orvot).toEqual([]);
  });
  it('avainmäärä täsmää irrotukseen', () => {
    expect(Object.keys(TM_TT_SV).length).toBe(Object.keys(FI).length);
    expect(Object.keys(FI).length).toBeGreaterThan(1000);
  });
});

describe('sidecar · fi-jäänne (b)', () => {
  it('yksikään sv-arvo ei ole identtinen fi-lähteen kanssa', () => {
    const jaanteet = Object.keys(FI).filter((k) => TM_TT_SV[k].trim() === FI[k].trim());
    expect(jaanteet).toEqual([]);
  });
});

describe('sidecar · merkistö (c)', () => {
  it('ei ei-latinalaisia merkkejä (kyrilliset/CJK/arabialaiset = LLM-artefakti)', () => {
    const eiLatina = new RegExp('[^\\u0000-\\u024F\\u2000-\\u206F\\u20A0-\\u20BF\\u2190-\\u21FF\\u2200-\\u22FF\\u2600-\\u27BF]');
    const rikki = Object.keys(TM_TT_SV)
      .filter((k) => eiLatina.test(TM_TT_SV[k]))
      .map((k) => k + ' -> ' + TM_TT_SV[k].slice(0, 60));
    expect(rikki).toEqual([]);
  });
  it('ei käännösputken sitaattiartefakteja ([cite:...] tms.)', () => {
    const rikki = Object.keys(TM_TT_SV).filter((k) => /\[cite[:\]]|\[\d+\]\s*$/.test(TM_TT_SV[k]));
    expect(rikki).toEqual([]);
  });
});

describe('sidecar · lib pysyy kielineutraalina', () => {
  it('generoitu lib/tm_teknistaktiset.js ei sisällä _sv-kenttiä (sv asuu vain sidecarissa)', () => {
    expect(readFileSync(P.LIB, 'utf8')).not.toMatch(/\b(nimi|pelitilanne|teksti|kysymykset|painotus|pelaaja_miksi|konseptipeli|teema|painopisteet|pelipaikka|tasot)_sv\b/);
  });
  it('sidecar on koneellisesti tuotettu tästä lähteestä (regenerointi antaa saman tuloksen)', () => {
    const sv = JSON.parse(readFileSync(join(juuri, 'docs', 'i18n', 'curriculum_kaannettava.sv.MASTER.json'), 'utf8'));
    expect(readFileSync(SIDECAR, 'utf8')).toBe(P.sidecarSisalto(sv, FI, {}));
  });
});
