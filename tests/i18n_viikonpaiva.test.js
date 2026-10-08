/* Viikonpäivän lyhenne kielen mukaan (Pelaaja _p7Vkopv, Vanhempi _vanhVkopv): fi = alkuperäinen taulukko TAVUTARKASTI (Su Ma Ti Ke To Pe La), sv/en Intl-pohjaisesti. */
import { describe, it, expect } from 'vitest';
import { readFileSync } from 'fs';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';
import vm from 'vm';

const juuri = join(dirname(fileURLToPath(import.meta.url)), '..');
function lataa(sivu, taulu, fn) {
  const src = readFileSync(join(juuri, sivu), 'utf8');
  const a = src.indexOf('const ' + taulu + ' = ['); const lause = src.slice(a, src.indexOf('\n', a));
  const f = src.indexOf('function ' + fn + '('); let d = 0, runko = '';
  for (let k = src.indexOf('{', f); k < src.length; k++) { if (src[k] === '{') d++; else if (src[k] === '}') { d--; if (!d) { runko = src.slice(f, k + 1); break; } } }
  return (kieli) => { const sb = { tmNykyinenKieli: () => kieli, Date, String }; vm.createContext(sb); vm.runInContext(lause + '\n' + runko, sb); return (n) => vm.runInContext(fn + '(' + n + ')', sb); };
}
describe.each([['TalentMaster_Pelaaja_v7.html', '_P7_VKOPV', '_p7Vkopv'], ['TalentMaster_Vanhempi_v2.html', '_VANH_VKOPV', '_vanhVkopv']])('%s %s', (sivu, taulu, fn) => {
  const aja = lataa(sivu, taulu, fn);
  it('fi: Su Ma Ti Ke To Pe La (kuten ennen)', () => { const v = aja('fi'); expect([0, 1, 2, 3, 4, 5, 6].map(v)).toEqual(['Su', 'Ma', 'Ti', 'Ke', 'To', 'Pe', 'La']); });
  it('sv: ei suomalaisia lyhenteitä (Intl sv-SE, isolla alkukirjaimella)', () => {
    const v = aja('sv'); const arr = [0, 1, 2, 3, 4, 5, 6].map(v);
    expect(arr.length).toBe(7); expect(new Set(arr).size).toBe(7);
    arr.forEach((s) => expect(s).toMatch(/^[A-ZÅÄÖ][a-zåäö]+$/));
    expect(arr).not.toContain('Ma'); expect(arr).not.toContain('Su');
  });
  it('en: Sun Mon … (en-GB)', () => { expect([0, 1, 2, 3, 4, 5, 6].map(aja('en'))).toEqual(['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat']); });
});
