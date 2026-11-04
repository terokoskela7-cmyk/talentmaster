/* QG-1c · VP → Läge oikean datan tiloissa (PM 2.11.2026, .briefit/CODE_BRIEF_LAATUPORTIT_QG.md "LISÄYS 2.11.").
   (1) Bugit: huomiorivin meta ei toista samaa osaa ("9/14 uppmätta · 9/14 uppmätta") eikä näytä ryhmään siirtyneen asian määrää; iso luku ja yksikkö
       erotetaan välilyönnillä ("2talenttia" → "2 talenttia"), mutta murtoluku pysyy kiinni ("5/180 syntymäaikaa").
   (2) Tunnistin: lähdekoodin kääntämättömät t()-literaalit (sv_t_literaalit.mjs) — myös paikkamerkilliset mallit — ovat korpuksessa.
   (3) Fixture: Läge-muunnelma (dokitLage) on synteettinen ja sisältää haarat (vanha · alaraja · laskeva · profiili · kypsyys · talentit · syntymäajat osittain · ehdotukset 1/N).
   Selainosuus (vartija löytää PM:n listan): tests/qg1c_vp_lage_selain.test.js. */
import { describe, it, expect } from 'vitest';
import { createRequire } from 'module';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';
import { tLiteraalit } from '../tools/i18n/sv_t_literaalit.mjs';
import { dokitLage, dokit } from '../tools/i18n/sv_fixtuuri.mjs';
import { readFileSync } from 'fs';
const require = createRequire(import.meta.url);
const TT = require('../lib/tm_vp_tilanne.js'), F = require('./helpers/vp_fixture.cjs');
const JUURI = join(dirname(fileURLToPath(import.meta.url)), '..'), NYT = Date.UTC(2026, 9, 12, 7, 0);
const teksti = (h) => h.replace(/<[^>]+>/g, ' ').replace(/&quot;/g, '"').replace(/\s+/g, ' '), t = (x) => x;
const piirra = (muokkaa) => { const m = TT.tmTilanneMalli(F.lataa('kypsa', NYT).syote); muokkaa(m); return TT.tmTilanneHTML(m, { t, fn: {}, auki: { huomiot: true } }); };
const rivi = (kinds, o) => Object.assign({ tyyppi: 'joukkue', joukkue: 'P14 Demo', tunniste: 'P14', kinds, n: kinds.length, w: true, jarj: 1, mitattuMs: NYT - 120 * 86400000, kk: 4, phv: false, vuosi: 2026 }, o);
const MAARA = { mitattu: 9, yht: 14, otosPieni: false, seuranRaja: false };

describe('QG-1c · huomiorivin meta: sama osa vain kerran', () => {
  it('tekniikka + profiili, sama 9/14 molemmilla → "9/14 mitattu" kerran (PM: "9/14 uppmätta · 9/14 uppmätta")', () => {
    const x = teksti(piirra((m) => { m.huomiot = [rivi(['tekniikka', 'profiili'], { tek: Object.assign({ syy: 'alle_ikatason' }, MAARA), fy: Object.assign({ syyt: [] }, MAARA) })]; }));
    expect(x).toContain('testattu 4 kk sitten · 9/14 mitattu'); expect(x.match(/9\/14 mitattu/g)).toHaveLength(1);
  });
  it('profiili yksin (tekniikka siirtyi ryhmäriviin) → vain fyysisten määrä, ei tekniikan', () => {
    const x = teksti(piirra((m) => { m.huomiot = [rivi(['profiili'], { tek: { mitattu: 6, yht: 14 }, fy: Object.assign({ syyt: [] }, MAARA) })]; }));
    expect(x).toContain('9/14 mitattu'); expect(x).not.toContain('6/14 mitattu');
  });
  it('eri määrät molemmille asioille säilyvät (fyysinen + tekniikka)', () => {
    const x = teksti(piirra((m) => { m.huomiot = [rivi(['tekniikka', 'fyysinen'], { tek: { mitattu: 6, yht: 14 }, fy: Object.assign({ syyt: [] }, MAARA) })]; }));
    expect(x).toContain('9/14 mitattu'); expect(x).toContain('6/14 mitattu');
  });
});

describe('QG-1c · iso luku ja yksikkö', () => {
  const h = TT.tmTilanneHTML(Object.assign(TT.tmTilanneMalli(F.lataa('kypsa', NYT).syote), { talentit: { n: 2, ehdokkaita: 4, odottaa: 6 } }), { t, fn: {} });
  it('"2 talenttia" (välilyönti ennen <small>), ei "2talenttia"', () => {
    expect(h).toMatch(/>2 <small>talenttia · 4 ehdokasta<\/small>/);
    expect(h.replace(/<[^>]+>/g, '')).not.toMatch(/\dtalenttia/);
  });
  it('murtoluku pysyy kiinni: "/{y} yli 12 kk vanha", "/{yht} syntymäaikaa"', () => {
    expect(h).toMatch(/>\d+<small>\/\d+ yli 12 kk vanha<\/small>/); expect(h).toMatch(/>\d+<small>\/\d+ syntymäaikaa<\/small>/);
  });
});

describe('QG-1c · tunnistin: kääntämättömät t()-literaalit korpukseen', () => {
  const TL = tLiteraalit(JUURI, () => false), kok = new Set(TL.kokonaiset.map((x) => x.teksti)), malli = (s) => TL.mallit.some((m) => m.re.test(s.toLowerCase()));
  it('PM:n lista (VP Läge) on literaaleina tai malleina', () => {
    for (const s of ['Onko mitattu tällä kaudella?', 'Kausi on alussa.', 'Tärkein asia on, että joukkueet aloittavat jaksonsa.']) expect(kok.has(s), s).toBe(true);   // objektikarttojen arvot (KL, EH_AIHE, aukkoRivi) löytää osaheuristiikka → selaintesti
    for (const s of ['kooste mån 06.00', 'Fyysiset testit asteikon alarajalla · 4 joukkuetta', 'viimeksi 2025 · ei tasoarviota', 'Individuellt program 2 joukkueelle', '/15 yli 12 kk vanha', 'talenttia · 4 ehdokasta', '6 odottaa mittausta.', '/180 syntymäaikaa', 'testattu 4 kk sitten']) expect(malli(s), s).toBe(true);
  });
  it('avaintyyliset (tm_lang-avaimet) ja kartassa olevat ohitetaan; pelkät paikkamerkit eivät ole malli', () => {
    expect([...kok].some((s) => /^[a-z0-9_.]+$/i.test(s))).toBe(false);
    expect(TL.mallit.some((m) => m.re.test('mitä tahansa · 3'))).toBe(false);
    const T2 = tLiteraalit(JUURI, (s) => s === 'Kausi on alussa.'); expect(T2.kokonaiset.map((x) => x.teksti)).not.toContain('Kausi on alussa.');
  });
});

describe('QG-1c · Läge-muunnelma fixturessa', () => {
  const D = dokitLage(), json = JSON.stringify(D), pel = Object.entries(D).filter(([k]) => /\/pelaajat\/ql_/.test(k)).map(([, v]) => v);
  it('synteettinen: vain qgfx, sähköpostit @example.test, perusfixture ennallaan', () => {
    expect(Object.keys(D).every((k) => k.startsWith('seurat/qgfx'))).toBe(true);
    for (const m of json.match(/[\w.+-]+@[\w.-]+/g) || []) expect(m).toMatch(/@example\.test$/);
    for (const [k, v] of Object.entries(dokit())) if (!/\/kooste\//.test(k)) expect(D[k], k).toEqual(v);
  });
  it('haarat: vanha (2025) · tuore · TKI laskee · ei biologista ikää · talentit · syntymäaika osalla · ehdotus 1 ja 2 joukkueelle · jakso 1/7', () => {
    expect(pel.some((p) => p.hh_pvm.startsWith('2025'))).toBe(true); expect(pel.some((p) => p.hh_pvm.startsWith('2026'))).toBe(true);
    expect(pel.some((p) => p.tki_viimeisin - p.tki_edellinen <= -10)).toBe(true); expect(pel.every((p) => !p.biologinenIka_viimeisin)).toBe(true);
    expect(pel.filter((p) => p.talenttiOhjelma).length).toBe(2); const sa = pel.filter((p) => p.syntymaaika).length; expect(sa).toBeGreaterThan(0); expect(sa).toBeLessThan(pel.length);
    const e = Object.entries(D).filter(([k]) => /\/toimenpiteet\//.test(k)).map(([, v]) => v.joukkueet.length).sort(); expect(e).toEqual([1, 2]);
    expect(Object.keys(D['seurat/qgfx/kooste/2026-W42'].joukkueet)).toHaveLength(7);
  });
  it('läpiajo ajaa Läge-muunnelman fixtuuriosassa (Tilanne + kaikki listat auki)', () => {
    const L = readFileSync(join(JUURI, 'tools/i18n/sv_lapiajo.mjs'), 'utf8'), r = L.split('\n').find((x) => x.startsWith('  fx_vp_lage: {'));   // sv_lapiajo.mjs käynnistää selaimen tuotaessa → luetaan lähteenä
    expect(r).toContain("fx: ['vp', null, 'lage']"); expect(r).toContain("NAV('setWs', ['tilanne'])"); expect(r).toContain("nimi: 'tilanne_kaikki'");
    expect(L).toContain("fxKonfiguraatio(fx[0], fx[1], fx[2])"); expect(L).toMatch(/FX_SOVELLUKSET = Object\.keys\(SOVELLUKSET\)\.filter\(\(k\) => k\.startsWith\('fx_'\)\)/);
  });
});
