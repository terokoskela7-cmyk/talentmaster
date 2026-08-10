/**
 * TalentMaster™ — R-selitteet: arviointitaksonomian kuvaukset + D5-roll-up
 * (1) Taksonomia-eheys: jokaisella 57 attribuutilla kuvaus_fi (ei tyhjiä), uniikit avaimet.
 * (2) laskeD5Taso (VP_v25) puhtaana: D5-attribuutit → keskiarvo; ei attribuutteja → null; olemassa oleva d5_taso voittaa.
 */
import { describe, it, expect, beforeAll } from 'vitest';
import { readFileSync } from 'fs';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';
import { createRequire } from 'module';

const require = createRequire(import.meta.url);
const __dir = dirname(fileURLToPath(import.meta.url));
const LIB = require('../lib/tm_arviointi_taksonomia.js');

describe('taksonomia-eheys — kuvaus_fi kaikilla attribuuteilla', () => {
  it('57 attribuuttia, jokaisella ei-tyhjä kuvaus_fi', () => {
    expect(LIB.ARVIOINTI_TAKSONOMIA.length).toBe(57);
    LIB.ARVIOINTI_TAKSONOMIA.forEach((it) => {
      expect(typeof it.kuvaus_fi, it.avain).toBe('string');
      expect(it.kuvaus_fi.trim().length, it.avain).toBeGreaterThan(0);
    });
  });
  it('avaimet uniikkeja', () => {
    const avaimet = LIB.ARVIOINTI_TAKSONOMIA.map((i) => i.avain);
    expect(new Set(avaimet).size).toBe(avaimet.length);
  });
  it('kuvaus luettavissa helperin kautta (tmTaksonomiaByAvain)', () => {
    expect(LIB.tmTaksonomiaByAvain('balance').kuvaus_fi).toMatch(/tasapaino/i);
    expect(LIB.tmTaksonomiaByAvain('social_interaction').kuvaus_fi.length).toBeGreaterThan(0);
  });
  it('D5-dimissä vain sosiaaliset attribuutit (roll-upin lähde)', () => {
    const d5 = LIB.tmTaksonomiaDim('D5').map((i) => i.avain).sort();
    expect(d5).toEqual(['social_interaction', 'team_role']);
  });
});

describe('laskeD5Taso — D5-roll-up (VP_v25, dim-keskiarvopattern)', () => {
  let laskeD5Taso;
  beforeAll(() => {
    const lines = readFileSync(join(__dir, '..', 'TalentMaster_VP_v25.html'), 'utf8').split('\n');
    const s = lines.findIndex((l) => l.includes('function laskeD5Taso(p)'));
    let e = s + 1; while (e < lines.length && !lines[e].includes('function _d2Lahde(p)')) e++;
    if (s < 0) throw new Error('laskeD5Taso ei löytynyt');
    // tmTaksonomiaDim injektoidaan libistä (sama globaali kuin selaimessa)
    laskeD5Taso = new Function('tmTaksonomiaDim', lines.slice(s, e).join('\n') + '\n return laskeD5Taso;')(LIB.tmTaksonomiaDim);
  });

  it('koostaa keskiarvon D5-havaituista (Topias 4/4 → 4)', () => {
    expect(laskeD5Taso({ arviointi_havaittu: { social_interaction: 4, team_role: 4 } })).toBe(4);
    expect(laskeD5Taso({ arviointi_havaittu: { social_interaction: 4, team_role: 3 } })).toBe(3.5);
  });
  it('olemassa oleva d5_taso VOITTAA (ei regressiota)', () => {
    expect(laskeD5Taso({ d5_taso: 2.7, arviointi_havaittu: { social_interaction: 5 } })).toBe(2.7);
  });
  it('vain D5-dimin attribuutit lasketaan (ei D4:n versatility)', () => {
    // versatility on D4 taksonomiassa → ei vaikuta D5-keskiarvoon
    expect(laskeD5Taso({ arviointi_havaittu: { social_interaction: 4, versatility: 1 } })).toBe(4);
  });
  it('ei D5-arvioita → null (empty ≠ 0)', () => {
    expect(laskeD5Taso({ arviointi_havaittu: { speed: 5 } })).toBeNull();
    expect(laskeD5Taso({ arviointi_havaittu: {} })).toBeNull();
    expect(laskeD5Taso({})).toBeNull();
    expect(laskeD5Taso(null)).toBeNull();
  });
});
