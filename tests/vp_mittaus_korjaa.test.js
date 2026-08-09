/**
 * TalentMaster™ — E2.3: _vpMittausKorjaaArvo + _vpMittausOnkoKomposiitti (TalentMaster_VP_v25.html)
 * Arvon muodon säilytys korjauksessa: objekti → päivitä tulos/paras · skalaari → korvaa · komposiitti → null.
 * Funktiot ovat VP_v25.html:ssä inline → poimitaan lähteestä (puhtaita, ei DOM/Firestore).
 */
import { describe, it, expect, beforeAll } from 'vitest';
import { readFileSync } from 'fs';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

const __dir = dirname(fileURLToPath(import.meta.url));

let _vpMittausKorjaaArvo, _vpMittausOnkoKomposiitti;
beforeAll(() => {
  const lines = readFileSync(join(__dir, '..', 'TalentMaster_VP_v25.html'), 'utf8').split('\n');
  const s = lines.findIndex(l => l.includes('function _vpMittausOnkoKomposiitti'));
  const e = lines.findIndex(l => l.includes('window._vpMittausKorjaaArvo = _vpMittausKorjaaArvo;'));
  if (s < 0 || e < 0) throw new Error('lohkoa ei löytynyt');
  const api = eval('(function(){ var window = {};\n' + lines.slice(s, e + 1).join('\n') + '\n return { _vpMittausKorjaaArvo, _vpMittausOnkoKomposiitti }; })()');
  _vpMittausKorjaaArvo = api._vpMittausKorjaaArvo;
  _vpMittausOnkoKomposiitti = api._vpMittausOnkoKomposiitti;
});

describe('_vpMittausOnkoKomposiitti', () => {
  it('raaka/rangaistukset/ennenaikaiset → komposiitti', () => {
    expect(_vpMittausOnkoKomposiitti({ raaka: 22, rangaistukset: [5] })).toBe(true);
    expect(_vpMittausOnkoKomposiitti({ ennenaikaiset: 1 })).toBe(true);
    expect(_vpMittausOnkoKomposiitti({ rangaistukset: [] })).toBe(true);
  });
  it('skalaari ja tulos/paras-objekti → ei komposiitti', () => {
    expect(_vpMittausOnkoKomposiitti(4.35)).toBe(false);
    expect(_vpMittausOnkoKomposiitti({ paras: 38 })).toBe(false);
    expect(_vpMittausOnkoKomposiitti({ tulos: 12 })).toBe(false);
    expect(_vpMittausOnkoKomposiitti(null)).toBe(false);
  });
});

describe('_vpMittausKorjaaArvo — arvon muodon säilytys', () => {
  it('skalaari → korvataan uudella numerolla', () => {
    expect(_vpMittausKorjaaArvo(4.35, 4.20)).toBe(4.20);
    expect(_vpMittausKorjaaArvo('4.35', 4.20)).toBe(4.20);
  });

  it('objekti {tulos} → päivittää tuloksen, säilyttää muut kentät', () => {
    expect(_vpMittausKorjaaArvo({ tulos: 12, paras: 12, y1: 13 }, 11)).toEqual({ tulos: 11, paras: 12, y1: 13 });
  });

  it('objekti {paras} (ei tulosta) → päivittää parhaan', () => {
    expect(_vpMittausKorjaaArvo({ paras: 38, y1: 37, y2: 38 }, 40)).toEqual({ paras: 40, y1: 37, y2: 38 });
  });

  it('komposiitti (raaka/rangaistukset/ennenaikaiset) → null (ei tallenneta)', () => {
    expect(_vpMittausKorjaaArvo({ raaka: 22, rangaistukset: [5], tulos: 17 }, 16)).toBeNull();
    expect(_vpMittausKorjaaArvo({ ennenaikaiset: 1, paras: 30 }, 25)).toBeNull();
  });

  it('ei mutatoi alkuperäistä objektia', () => {
    const alku = { tulos: 12, paras: 12 };
    _vpMittausKorjaaArvo(alku, 5);
    expect(alku).toEqual({ tulos: 12, paras: 12 });
  });
});
