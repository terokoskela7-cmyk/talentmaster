/**
 * ?v-bumppiportti: jos Pelaaja_v7:n / Vanhempi_v2:n lataaman skriptin SISÄLTÖ muuttuu mutta ?v ei, SW tarjoaa vanhaa (#855). Vertaa sisältöhajautusta tallennettuun listaan (tests/fixtures/lib_versiot.json).
 * Päivitys: bumppaa ?v → node scripts/lib_versiot.js --kirjoita → commitoi lista.
 */
import { describe, it, expect } from 'vitest';
import { createRequire } from 'module';
import { mkdtempSync, mkdirSync, writeFileSync, rmSync } from 'fs';
import { tmpdir } from 'os';
import { join } from 'path';
const require = createRequire(import.meta.url);
const LV = require('../scripts/lib_versiot.js');

describe('PORTTI: todellinen repo vs tests/fixtures/lib_versiot.json', () => {
  it('jokaisen sivun paikallinen skripti: hash + ?v täsmää listaan (muuttui_ilman_bumppia = punainen; muu ero = lista vanhentunut)', () => {
    const ero = LV.vertaa(LV.lueLista(), LV.laske());
    const pahat = ero.filter((e) => e.tyyppi === 'muuttui_ilman_bumppia'), muut = ero.filter((e) => e.tyyppi !== 'muuttui_ilman_bumppia');
    expect(pahat.map((e) => e.viesti), 'sisältö muuttui ilman ?v-bumppia (SW tarjoaisi vanhaa)').toEqual([]);
    expect(muut.map((e) => e.viesti), 'lista vanhentunut').toEqual([]);
  });
  it('lista kattaa kaikki sivut ja sisältää lib/*.js-lataukset ?v:llä; ei tyhjiä hasheja; jokaisella lib-lataukselle on ?v', () => {
    const lista = LV.lueLista(); expect(new Set(lista.map((x) => x.sivu))).toEqual(new Set(LV.SIVUT));
    for (const x of lista) { expect(x.hash, x.tiedosto).toMatch(/^[0-9a-f]{64}$/); if (/^lib\//.test(x.tiedosto)) expect(x.v, x.tiedosto + ' (' + x.sivu + ') ilman ?v:tä').not.toBeNull(); }
    expect(lista.some((x) => x.tiedosto === 'lib/tm_tanaan_kentta.js' && x.sivu === 'TalentMaster_Pelaaja_v7.html')).toBe(true); expect(lista.some((x) => x.tiedosto === 'lib/tm_kentta.js' && x.sivu === 'TalentMaster_Vanhempi_v2.html')).toBe(true);
  });
});

describe('portin logiikka (synteettinen repo)', () => {
  const rakenna = (tiedostot, html) => { const d = mkdtempSync(join(tmpdir(), 'libv-')); mkdirSync(join(d, 'lib')); for (const [n, s] of Object.entries(tiedostot)) writeFileSync(join(d, n), s); writeFileSync(join(d, 'sivu.html'), html); return d; };
  const HTML = (a, b) => '<script src="lib/a.js?v=' + a + '"></script>\n<script src="lib/b.js' + (b ? '?v=' + b : '') + '"></script><script src="https://cdn.example.com/x.js?v=9"></script><script src="//cdn.example.com/y.js"></script><script src="./tm-bus.js?v=3"></script>';
  it('skriptit(): vain paikalliset; ?v tai null; ./ poistuu; http(s)/protokolla-suhteelliset ohitetaan', () => {
    expect(LV.skriptit(HTML(1, null))).toEqual([{ tiedosto: 'lib/a.js', v: '1' }, { tiedosto: 'lib/b.js', v: null }, { tiedosto: 'tm-bus.js', v: '3' }]);
    expect(LV.skriptit('<script src="lib/c.js?x=1&v=7#h"></script><script>inline()</script>')).toEqual([{ tiedosto: 'lib/c.js', v: '7' }]);
  });
  it('hajautus: sama sisältö + CRLF/LF → sama; eri sisältö → eri', () => { expect(LV.hajautus('a\r\nb')).toBe(LV.hajautus('a\nb')); expect(LV.hajautus('a')).not.toBe(LV.hajautus('b')); });
  it('SISÄLTÖ MUUTTUU, ?v EI → muuttui_ilman_bumppia (punainen); sisältö + ?v bumpattu → vain "vanhentunut" (lista kirjoitettava uudelleen); ei muutosta → tyhjä', () => {
    const d = rakenna({ 'lib/a.js': 'A1', 'lib/b.js': 'B1', 'tm-bus.js': 'T' }, HTML(1, 2)); try {
      const lista = LV.laske(d, ['sivu.html']); expect(LV.vertaa(lista, LV.laske(d, ['sivu.html']))).toEqual([]);
      writeFileSync(join(d, 'lib/a.js'), 'A2'); const e1 = LV.vertaa(lista, LV.laske(d, ['sivu.html'])); expect(e1).toHaveLength(1); expect(e1[0]).toMatchObject({ tyyppi: 'muuttui_ilman_bumppia', tiedosto: 'lib/a.js' }); expect(e1[0].viesti).toMatch(/sisältö muuttui mutta \?v ei/);
      writeFileSync(join(d, 'sivu.html'), HTML(2, 2)); const e2 = LV.vertaa(lista, LV.laske(d, ['sivu.html'])); expect(e2.map((e) => e.tyyppi)).toEqual(['vanhentunut']);   // bumpattu → ei punainen, mutta lista pitää kirjoittaa
      const uusi = LV.laske(d, ['sivu.html']); writeFileSync(join(d, 'lib/a.js'), 'A3'); expect(LV.vertaa(uusi, LV.laske(d, ['sivu.html'])).map((e) => e.tyyppi)).toEqual(['muuttui_ilman_bumppia']);   // uudelleenkirjoitettu lista vartioi seuraavaa muutosta
    } finally { rmSync(d, { recursive: true, force: true }); }
  });
  it('?v puuttuu kokonaan + sisältö muuttuu → punainen (null === null); uusi lataus / poistunut lataus / puuttuva tiedosto huomataan', () => {
    const d = rakenna({ 'lib/a.js': 'A1', 'lib/b.js': 'B1', 'tm-bus.js': 'T' }, HTML(1, null)); try {
      const lista = LV.laske(d, ['sivu.html']); writeFileSync(join(d, 'lib/b.js'), 'B2'); expect(LV.vertaa(lista, LV.laske(d, ['sivu.html'])).map((e) => e.tyyppi + ':' + e.tiedosto)).toEqual(['muuttui_ilman_bumppia:lib/b.js']);
      writeFileSync(join(d, 'sivu.html'), HTML(1, null) + '<script src="lib/uusi.js?v=1"></script>'); writeFileSync(join(d, 'lib/uusi.js'), 'U'); expect(LV.vertaa(lista, LV.laske(d, ['sivu.html'])).some((e) => e.tyyppi === 'vanhentunut' && e.tiedosto === 'lib/uusi.js')).toBe(true);
      writeFileSync(join(d, 'sivu.html'), '<script src="lib/a.js?v=1"></script>'); expect(LV.vertaa(lista, LV.laske(d, ['sivu.html'])).filter((e) => /ei enää ladata/.test(e.viesti)).map((e) => e.tiedosto).sort()).toEqual(['lib/b.js', 'tm-bus.js']);
      writeFileSync(join(d, 'sivu.html'), '<script src="lib/puuttuva.js?v=1"></script>'); expect(LV.vertaa(lista, LV.laske(d, ['sivu.html'])).some((e) => e.tyyppi === 'puuttuu')).toBe(true);
    } finally { rmSync(d, { recursive: true, force: true }); }
  });
  it('sama tiedosto eri sivuilla eri ?v:llä käsitellään erikseen (avain sivu + tiedosto)', () => {
    const d = rakenna({ 'lib/a.js': 'A', 'lib/b.js': 'B', 'tm-bus.js': 'T' }, HTML(1, 2)); writeFileSync(join(d, 'toinen.html'), HTML(5, 2)); try {
      const lista = LV.laske(d, ['sivu.html', 'toinen.html']); expect(lista.filter((x) => x.tiedosto === 'lib/a.js').map((x) => x.v)).toEqual(['1', '5']); writeFileSync(join(d, 'lib/a.js'), 'A!'); writeFileSync(join(d, 'toinen.html'), HTML(6, 2));
      expect(LV.vertaa(lista, LV.laske(d, ['sivu.html', 'toinen.html'])).map((e) => e.sivu + ':' + e.tyyppi)).toEqual(['sivu.html:muuttui_ilman_bumppia', 'toinen.html:vanhentunut']);
    } finally { rmSync(d, { recursive: true, force: true }); }
  });
});
