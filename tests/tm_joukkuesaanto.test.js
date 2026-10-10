/* lib/tm_joukkuesaanto.js — YKSI joukkuesääntö (tekniikka + fyysinen). Rajatapaukset kokonaisluvuilla. */
import { describe, it, expect } from 'vitest';
import { createRequire } from 'module';
const require = createRequire(import.meta.url);
const S = require('../lib/tm_joukkuesaanto.js'), T = require('../lib/tm_tekniikka.js'), F = require('../lib/tm_fyysinen.js');
const s = (yht, mitattu, k) => S.tmJoukkueSaanto({ yht, mitattu, kehityskohteita: k });

describe('tmJoukkueSaanto', () => {
  it('kolmasosa: 5/15 riittää (yhtäsuuruus), 4/15 ja 5/16 eivät; vaatii ≥ 5 mitattua', () => {
    expect(s(15, 15, 5).luokka).toBe('kehityskohde'); expect(s(15, 15, 4).luokka).toBe('ok'); expect(s(16, 16, 5).luokka).toBe('ok'); expect(s(18, 18, 6).luokka).toBe('kehityskohde');
    expect(s(5, 5, 2).luokka).toBe('kehityskohde'); expect(s(5, 5, 1).luokka).toBe('ok'); expect(s(9, 4, 4).luokka).toBe('ei_luokkaa');
  });
  it('puolen ehto: ≥ 1/2 KAIKISTA pelaajista, vaikka mitattuja < 5', () => {
    expect(s(4, 2, 2).luokka).toBe('kehityskohde'); expect(s(5, 2, 2).luokka).toBe('ei_luokkaa'); expect(s(8, 4, 4).luokka).toBe('kehityskohde'); expect(s(9, 4, 4).luokka).toBe('ei_luokkaa');
  });
  it('otos pieni (7 / 8), ilman luokkaa ei merkintää; eiMitattua', () => {
    expect(s(10, 7, 3)).toMatchObject({ luokka: 'kehityskohde', otosPieni: true }); expect(s(10, 8, 3)).toMatchObject({ otosPieni: false });
    expect(s(10, 7, 0)).toMatchObject({ luokka: 'ok', otosPieni: true }); expect(s(10, 3, 0)).toMatchObject({ luokka: 'ei_luokkaa', otosPieni: false, eiMitattua: false });
    expect(s(6, 0, 0)).toMatchObject({ luokka: 'ei_luokkaa', eiMitattua: true }); expect(s(0, 0, 0)).toMatchObject({ luokka: 'ei_luokkaa', eiMitattua: true, kehityskohde: false });
  });
  it('kelvottomat syötteet (null, negatiivinen, NaN, merkkijono) eivät kaada eivätkä anna kehityskohdetta', () => {
    expect(S.tmJoukkueSaanto().kehityskohde).toBe(false); expect(s(-3, NaN, -1).kehityskohde).toBe(false); expect(S.tmJoukkueSaanto({ yht: '10', mitattu: '10', kehityskohteita: '4' }).luokka).toBe('kehityskohde');
  });
  it('sama sääntö tekniikalla ja fyysisellä: sama (yht, mitattu, k) → sama luokka (taulukko)', () => {
    const DOCS = [{ id: 'j', nimi: 'SJK P14' }];
    const tkiP = (v) => ({ id: 'a' + Math.random(), joukkueet: ['j'], syntymaVuosi: 2013, sukupuoli: 'M', joukkue: 'P13', tki_viimeisin: v, tki_pvm: '2026-05-01' });
    const fyP = (heikko) => ({ id: 'b' + Math.random(), joukkueet: ['j'], syntymaVuosi: 2012, sukupuoli: 'M', joukkue: 'P14', hh_pvm: '2026-06-01', hh_viimeisin: { kasirata: heikko ? 99 : 1 } });   // 99 s = taso 1; 1 s = taso 5
    const NYT = Date.UTC(2026, 9, 10, 12);
    for (const [yht, k, ei] of [[15, 5, 0], [15, 4, 0], [16, 5, 0], [8, 4, 0], [9, 4, 0], [5, 2, 0], [7, 3, 0], [10, 3, 2], [6, 3, 3], [12, 0, 0]]) {
      const m = yht - ei, a = Array.from({ length: k }, () => tkiP(10)).concat(Array.from({ length: m - k }, () => tkiP(70)), Array.from({ length: ei }, () => ({ id: 'e' + Math.random(), joukkueet: ['j'], syntymaVuosi: 2012, sukupuoli: 'M', joukkue: 'P14' })));
      const b = Array.from({ length: k }, () => fyP(true)).concat(Array.from({ length: m - k }, () => fyP(false)), Array.from({ length: ei }, () => ({ id: 'e' + Math.random(), joukkueet: ['j'], syntymaVuosi: 2012, sukupuoli: 'M', joukkue: 'P14' })));
      const x = T.tmJoukkueTekniikka(a, DOCS, 'j', NYT), y = F.tmJoukkueFyysinen(b, DOCS, 'j', NYT), z = s(yht, m, k);
      expect([x.luokka, y.luokka], `${yht}/${m}/${k}`).toEqual([z.luokka, z.luokka]); expect([x.otosPieni, y.otosPieni]).toEqual([z.otosPieni, z.otosPieni]);
    }
  });
  it('vartija: tm_tekniikka ja tm_fyysinen eivät sisällä omaa 1/3- tai 1/2-sääntöä', () => {
    const fs = require('fs'), strip = (f) => fs.readFileSync(require('path').join(__dirname, '..', f), 'utf8').replace(/\/\*[\s\S]*?\*\//g, '').replace(/\/\/.*$/gm, '');
    for (const f of ['lib/tm_tekniikka.js', 'lib/tm_fyysinen.js']) { const k = strip(f); expect(k, f).toContain('tmJoukkueSaanto'); expect(k, f).not.toMatch(/3 \* kehit|2 \* kehit|>= 5/); }
  });
});
