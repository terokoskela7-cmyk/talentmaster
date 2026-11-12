import { describe, it, expect } from 'vitest';
import fs from 'fs';
import path from 'path';
const juuri = path.resolve(__dirname, '..');
const html = fs.readFileSync(path.join(juuri, 'TalentMaster_Seura.html'), 'utf8');

describe('Seura: pelaajaluvun jako (B.6 #1)', () => {
  it('pelaajat-kokoelman koko-luku on vain kahdessa paikassa: KPI-lataus ja tmLuePelaajatSnap', () => {
    const n = (html.match(/collection\('pelaajat'\)\s*\.get\(\)/g) || []).length;
    expect(n).toBe(2);
  });
  it('lista ja Kehitystilanne käyttävät jaettua lukua', () => {
    expect(html).toMatch(/const snap = await tmLuePelaajatSnap\(tila\.seuraId\)/);
    expect(html).toMatch(/tmLuePelaajatSnap\(sid\),/);
  });
  it('kertakäyttöinen esilataus: ota() tyhjentää, vanha (>20 s) ja vieras seura hylätään (sandbox)', () => {
    const m = html.match(/var _tmPelaajatEsi = null;[\s\S]*?function tmPelaajatEsiOta\(sid\) \{[\s\S]*?\n\}/);
    expect(m).toBeTruthy();
    const f = new Function(m[0] + '; return { talleta: tmPelaajatEsiTalleta, ota: tmPelaajatEsiOta, tyhjenna: tmPelaajatEsiTyhjenna };')();
    f.talleta('a', { n: 1 });
    expect(f.ota('a')).toEqual({ n: 1 });
    expect(f.ota('a')).toBeNull();                 // kertakäyttöinen
    f.talleta('a', { n: 2 }); expect(f.ota('b')).toBeNull();   // vieras seura
    f.talleta('a', { n: 3 }); f.tyhjenna(); expect(f.ota('a')).toBeNull();   // kirjoituspolku tyhjentää
  });
  it('kirjoituspolut tyhjentävät esilatauksen', () => {
    for (const f of ['seura/seura_kutsut.js', 'seura/seura_pelaajahallinta.js', 'seura/seura_hallinta.js', 'seura/seura_tuonti.js']) {
      expect(fs.readFileSync(path.join(juuri, f), 'utf8'), f).toMatch(/tmPelaajatEsiTyhjenna/);
    }
    expect(html).toMatch(/tmPelaajatEsiTyhjenna\(\);\s*\n\s*await db\.collection\('seurat'\)\.doc\(tila\.seuraId\)\.collection\('pelaajat'\)\.doc\(pid\)\.update/);
  });
});
