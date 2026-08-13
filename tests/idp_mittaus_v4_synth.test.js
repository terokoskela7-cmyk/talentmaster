/**
 * TalentMaster™ — IDP R2 (pala 2): Mittaus v4 synth "Mitä testit kertovat".
 * Data-johdettu §28-tietoinen tulkinta (d1/d2/tsi/tki_merkki/phv_tila, §26) — ei uutta mittaria.
 * Pattern = §28-invariantti #1 (Hidden Gem PHV-tilakohtainen). Rehellinen tyhjä kun ei riitä dataa.
 */
import { describe, it, expect, beforeAll } from 'vitest';
import { readFileSync } from 'fs';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

const __dir = dirname(fileURLToPath(import.meta.url));
const HTML = readFileSync(join(__dir, '..', 'TalentMaster_VP_v25.html'), 'utf8');

function extract(sig) {
  const lines = HTML.split('\n');
  const s = lines.findIndex((l) => l.includes(sig));
  if (s < 0) throw new Error('ei löytynyt: ' + sig);
  let e = -1;
  for (let i = s + 1; i < lines.length; i++) { if (lines[i] === '}') { e = i; break; } }
  return lines.slice(s, e + 1).join('\n');
}

let S;
beforeAll(() => {
  S = new Function(
    'var _jsvEsc = function(s){return String(s==null?"":s);};\n' +
    extract('function _vpMittausSynthHTML(p, ika, d1, d2, tsi) {') + '\n' +
    'return { synth: _vpMittausSynthHTML };'
  )().synth;
});

describe('synth — tekninen tulkinta', () => {
  it('TKI-merkki (hopea) TAI d2≥3.5 → "ikäluokan kärkeä"', () => {
    expect(S({ tki_merkki: 'hopea' }, 12, null, null, null)).toContain('ikäluokan kärkeä');
    expect(S({}, 12, null, 4, null)).toContain('ikäluokan kärkeä');
  });
  it('d2 keskitaso (3–3.4) → "ikäluokan tasoa" (ei kärkeä)', () => {
    const h = S({}, 12, null, 3, null);
    expect(h).toContain('ikäluokan tasoa');
    expect(h).not.toContain('ikäluokan kärkeä');
  });
});

describe('synth — fyysinen §28-tietoinen', () => {
  it('fyysinen heikko + jälki-PHV (AN) → "juuri oikea ikkuna kehittää"', () => {
    const h = S({ phv_tila: 'AN', tki_merkki: 'hopea' }, 13, 2.5, 4, null);
    expect(h).toContain('jäljessä');
    expect(h).toContain('juuri oikea ikkuna kehittää');
  });
  it('fyysinen heikko + pre-PHV → "biologisesti odotettua, ei kehityskohde" (§28)', () => {
    const h = S({ phv_tila: 'PRE' }, 11, 2, null, null);
    expect(h).toContain('biologisesti odotettua');
    expect(h).not.toContain('juuri oikea ikkuna');
  });
  it('fyysinen heikko + ei PHV → "kypsyys mittaamatta"', () => {
    expect(S({}, 12, 2, null, null)).toContain('kypsyys mittaamatta');
  });
});

describe('synth — TSI (§14: <0.8 = aidosti automatisoitunut)', () => {
  it('TSI < 0.8 → "ei lajitekniikkavajetta"', () => {
    expect(S({}, 12, null, 4, 0.4)).toContain('ei lajitekniikkavajetta');
  });
  it('TSI 0.8–1.5 (vain kohtalainen §14) → EI "automatisoitunut"-kehystä', () => {
    expect(S({}, 12, null, 4, 1.0)).not.toContain('ei lajitekniikkavajetta');
    expect(S({}, 12, null, 4, 1.8)).not.toContain('ei lajitekniikkavajetta');
  });
});

describe('synth — pattern (§28-invariantti #1: Hidden Gem PHV-tilakohtainen)', () => {
  it('tekniikka edellä + fyysinen jäljessä + jälki-PHV → aito kehityskohde (EI jalostamaton timantti)', () => {
    const h = S({ phv_tila: 'AN', tki_merkki: 'hopea' }, 13, 2.5, 4, 0.4);
    expect(h).toContain('mit-synth-pattern');
    expect(h).toContain('aito kehityskohde');
    expect(h).toContain('EI tule automaattisesti');
  });
  it('tekniikka edellä + fyysinen jäljessä + pre-PHV → mahdollinen Hidden Gem', () => {
    const h = S({ phv_tila: 'PRE', tki_merkki: 'kulta' }, 11, 2, 4, null);
    expect(h).toContain('mahdollinen Hidden Gem');
  });
  it('vain tekninen (ei fyysinen heikko) → EI pattern-lohkoa', () => {
    expect(S({ tki_merkki: 'hopea' }, 12, 4, 4, null)).not.toContain('mit-synth-pattern');
  });
});

describe('synth — rehellinen tyhjä', () => {
  it('ei d1 eikä d2 → tyhjä (ei keksitä tulkintaa)', () => {
    expect(S({}, 12, null, null, null)).toBe('');
  });
});

describe('synth — kytkentä tab-1:een (rakenteellinen)', () => {
  it('synth §28-linssin JÄLKEEN, f1:n EDELLÄ', () => {
    const iLinssi = HTML.indexOf('_vpMittausLinssiHTML(p, ika) :');
    const iSynth = HTML.indexOf('_vpMittausSynthHTML(p, ika, d1, d2, tsi) :');
    const iF1 = HTML.indexOf("_mSub('Fyysinen · mitattu') + f1");
    expect(iLinssi).toBeLessThan(iSynth);
    expect(iSynth).toBeLessThan(iF1);
  });
});
