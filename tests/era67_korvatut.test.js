import { describe, it, expect } from 'vitest';
import { KARTTA, MONITULKINTA, S67 } from './helpers/era67_korvatut.mjs';
describe('erä 67 -apukartta vanhoille eratesteille', () => {
  it('yksiselitteinen: sama vanha sv ei saa kahta eri uutta arvoa', () => { expect(MONITULKINTA).toEqual([]); expect(KARTTA.size).toBeGreaterThan(50); });
  it('S67 päästää muut arvot läpi ja korvaa vanhan termin', () => { expect(S67('Ei muutosta')).toBe('Ei muutosta'); for (const [vanha, uusi] of KARTTA) { expect(S67(vanha)).toBe(uusi); expect(/fotbollsutvecklar/i.test(uusi)).toBe(false); } });
});
