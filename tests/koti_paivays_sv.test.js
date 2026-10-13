/* Kodin otsikkorivin päiväys: sv "tisdag 13 oktober" (pienellä, ei pistettä, ei pilkkua; jaettu tmPvmFmt), fi ennallaan "Tiistai, 13. lokakuuta". */
import { describe, it, expect } from 'vitest';
import { readFileSync } from 'fs';
import { createRequire } from 'module';
import vm from 'vm';
const require = createRequire(import.meta.url);
const P = require('../lib/tm_paiva_otsikko.js'), LANG = require('../lib/tm_lang.js');
const MASTER = readFileSync(new URL('../TalentMaster_Master_v16.html', import.meta.url), 'utf8');
const T = new Date(2026, 9, 13);   // tiistai 13.10.2026
describe('tmPaivaOtsikko', () => {
  it('sv: "tisdag 13 oktober" — viikonpäivä pienellä, ei pistettä päivän perässä, ei pilkkua', () => {
    const s = P.tmPaivaOtsikko(T, 'sv', (x) => x); expect(s).toBe('tisdag 13 oktober'); expect(s).not.toMatch(/[.,]/); expect(s[0]).toBe(s[0].toLowerCase());
    expect(P.tmPaivaOtsikko(new Date(2026, 0, 1), 'sv')).toBe('torsdag 1 januari'); expect(P.tmPaivaOtsikko(new Date(2026, 4, 3), 'sv')).toBe('söndag 3 maj');
  });
  it('sv käyttää samaa jaettua päiväyslibiä (tm_lang tmPvmFmt): sama kuukausi- ja viikonpäivänimi kuin tmPvmFmt', () => {
    const r = LANG.tmPvmFmt(T, { weekday: 'long', day: 'numeric', month: 'long' }, 'sv'); expect(P.tmPaivaOtsikko(T, 'sv').toLowerCase()).toBe(r.toLowerCase().replace(/[.,]/g, ''));
  });
  it('fi: ennallaan "Tiistai, 13. lokakuuta" (iso alkukirjain, pilkku, piste); t() reitti säilyy', () => {
    expect(P.tmPaivaOtsikko(T, 'fi', (x) => x)).toBe('Tiistai, 13. lokakuuta'); expect(P.tmPaivaOtsikko(T, 'fi', (x) => x.toUpperCase())).toBe('TIISTAI, 13. LOKAKUUTA'); expect(P.tmPaivaOtsikko(T, undefined)).toBe('Tiistai, 13. lokakuuta');
  });
  it('Master _setDate: käyttää libiä kielellä tmNykyinenKieli() + viikkonumero jää perään', () => {
    const a = MASTER.indexOf('function _setDate() {'), f = MASTER.slice(a, MASTER.indexOf('\n}\n', a) + 3);
    for (const [kieli, odotus] of [['sv', 'tisdag 13 oktober · V 42'], ['fi', 'Tiistai, 13. lokakuuta · V 42']]) {
      const el = { textContent: '' }, ctx = { Date: class extends Date { constructor(...a) { super(...(a.length ? a : [2026, 9, 13])); } }, document: { getElementById: () => el }, window: { TM_PAIVA_OTSIKKO: P }, tmNykyinenKieli: () => kieli, masterT: (x) => (x === 'VIIKKO' ? 'V' : x), _getVk: () => 42 };
      vm.createContext(ctx); vm.runInContext(f + '\n_setDate();', ctx); expect(el.textContent).toBe(odotus);
    }
  });
});
