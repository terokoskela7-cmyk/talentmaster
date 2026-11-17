/* L6 (KYLMA_AVAUS_DIAGNOOSI §9.4 vaihe 1) — Masterin inline-pääskripti irrotetaan DEPLOYSSA tiedostoon (scripts/versiotiiviste.js), repossa lähde pysyy inline.
   Vartioi: irrotus ei hukkaa tavuakaan (yhdistämällä takaisin = alkuperäinen), ?v = irrotetun tiedoston tiiviste, idempotentti, js kääntyy, pienet/muut sivut eivät koske. */
import { describe, it, expect } from 'vitest';
import { readFileSync, mkdtempSync, mkdirSync, cpSync, readdirSync, statSync, existsSync, rmSync } from 'fs';
import { createRequire } from 'module';
import { createHash } from 'crypto';
import { tmpdir } from 'os';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';
import vm from 'vm';
const require = createRequire(import.meta.url);
const JUURI = join(dirname(fileURLToPath(import.meta.url)), '..');
const VT = require('../scripts/versiotiiviste.js');
const MASTER = 'TalentMaster_Master_v16.html';
const sha8 = (s) => createHash('sha256').update(String(s).replace(/\r\n/g, '\n')).digest('hex').slice(0, 8);
const ISO = 'x'.repeat(50000);

describe('irrotaPaaskripti (yksikkö)', () => {
  const sivu = (js, ennen) => '<html><body>' + (ennen || '') + '<script>\n' + js + '</script>\n</body></html>';
  it('isoin viimeinen paljas script → src+defer; js ilman alun rivinvaihtoa; muu HTML ennallaan', () => {
    const r = VT.irrotaPaaskripti(sivu('var a=1;' + ISO), 'm.js');
    expect(r.js).toBe('var a=1;' + ISO); expect(r.html).toBe('<html><body><script src="m.js" defer></script>\n</body></html>');
  });
  it('ei irroteta: pieni script, väli </script>…</body> ei tyhjä, src-script, ei </body>', () => {
    expect(VT.irrotaPaaskripti(sivu('var a=1;'), 'm.js')).toBeNull();
    expect(VT.irrotaPaaskripti(sivu(ISO).replace('</body>', '<p>x</p></body>'), 'm.js')).toBeNull();
    expect(VT.irrotaPaaskripti('<body><script src="a.js">' + ISO + '</script></body>', 'm.js')).toBeNull();
    expect(VT.irrotaPaaskripti('<script>' + ISO + '</script>', 'm.js')).toBeNull();
  });
  it('vain taulukon sivut: Master on, muut eivät', () => { expect(Object.keys(VT.PAASKRIPTI)).toEqual([MASTER]); });
});

describe('Masterin julkaisu — oikea sivu', () => {
  const r = VT.laske(JUURI), html = readFileSync(join(JUURI, MASTER), 'utf8');
  const ulos = r.tiedostot[MASTER], js = r.tiedostot['tm_master_main.js'];
  it('laske ei raportoi virheitä Masterista; irrotettu tiedosto ja sivu syntyvät', () => {
    expect(r.virheet.filter((v) => v.indexOf(MASTER) >= 0 || v.indexOf('tm_master_main') >= 0)).toEqual([]);
    expect(typeof js).toBe('string'); expect(js.length).toBeGreaterThan(500000); expect(ulos).toContain('<script src="tm_master_main.js?v=' + sha8(js) + '" defer></script>');
    expect(r.raportti.sivut[MASTER]['tm_master_main.js']).toBe(sha8(js));
  });
  it('EI HUKKAA: takaisin inline-muotoon yhdistettynä = repon alkuperäinen HTML (tavu tavulta)', () => {
    const takaisin = ulos.replace('<script src="tm_master_main.js?v=' + sha8(js) + '" defer></script>', '<script>\n' + js + '</script>');
    // muut ?v-lisäykset pois: vertaa ilman ?v=…-osia
    const norm = (s) => s.replace(/\?v=[0-9a-f]{8}/g, '');
    expect(norm(takaisin)).toBe(norm(html));
  });
  it('js kääntyy (syntaksi) ja alkaa \'use strict\'-direktiivillä; sivulla ei jää isoa inline-skriptiä', () => {
    expect(() => new vm.Script(js, { filename: 'tm_master_main.js' })).not.toThrow(); expect(js.trimStart().startsWith("'use strict';")).toBe(true);
    const inl = [...ulos.matchAll(/<script>([\s\S]*?)<\/script>/g)].map((m) => m[1].length); expect(Math.max(0, ...inl)).toBeLessThan(20000);
  });
  it('repon lähde ennallaan: inline-pääskripti on repossa, tiedostoa ei', () => {
    expect(html).not.toContain('tm_master_main.js'); expect(existsSync(join(JUURI, 'tm_master_main.js'))).toBe(false);
    expect(VT.tarkistaRepo(JUURI)).toEqual([]);
  });
  it('kirjoita levylle (tmp-kopio) → tarkistaJulkaisu ok ja toinen ajo ei muuta mitään (idempotentti)', () => {
    const T = mkdtempSync(join(tmpdir(), 'l6_')); try {
      for (const f of readdirSync(JUURI)) if (statSync(join(JUURI, f)).isFile()) cpSync(join(JUURI, f), join(T, f));
      cpSync(join(JUURI, 'lib'), join(T, 'lib'), { recursive: true }); mkdirSync(join(T, 'docs')); for (const f of readdirSync(join(JUURI, 'docs'))) if (/\.js$/.test(f)) cpSync(join(JUURI, 'docs', f), join(T, 'docs', f));
      if (existsSync(join(JUURI, 'seura'))) cpSync(join(JUURI, 'seura'), join(T, 'seura'), { recursive: true });
      const a = VT.kirjoita(T); expect(a.ongelmat).toEqual([]); expect(a.ok).toBe(true);
      expect(readFileSync(join(T, 'tm_master_main.js'), 'utf8')).toBe(js);
      const b = VT.laske(T); expect(b.virheet).toEqual([]); expect(Object.keys(b.tiedostot).filter((k) => !/^sw_/.test(k))).toEqual([]);   // ei uutta irrotusta eikä muutoksia
      expect(VT.tarkistaJulkaisu(T)).toEqual([]);
    } finally { rmSync(T, { recursive: true, force: true }); }
  });
});
