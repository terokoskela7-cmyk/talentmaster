/* Erä (a) · tm_lang.js sv/en → kielipaketit: rakenne- ja Node-vartijat (ei selainta). */
import { describe, it, expect } from 'vitest';
import { readFileSync, mkdtempSync, mkdirSync, copyFileSync } from 'fs';
import { join } from 'path';
import { tmpdir } from 'os';
import { createRequire } from 'module';
import vm from 'vm';
import LL from '../scripts/lang_lahde.cjs';
const require = createRequire(import.meta.url), JUURI = join(import.meta.dirname || new URL('.', import.meta.url).pathname, '..');
const lue = (f) => readFileSync(join(JUURI, f), 'utf8');
const lehdet = (o) => Object.values(o).reduce((n, v) => n + (v && typeof v === 'object' ? lehdet(v) : 1), 0);

describe('tm_lang_sv.js / tm_lang_en.js: erotetut paketit', () => {
  it('Node: require(tm_lang.js).TM_LANG sisältää fi/sv/en kuten ennen jakoa; avainjärjestys fi, sv, en', () => {
    const L = require('../lib/tm_lang.js');
    expect(Object.keys(L.TM_LANG)).toEqual(['fi', 'sv', 'en']);
    expect(L.TM_LANG.sv).toBe(require('../lib/tm_lang_sv.js')); expect(L.TM_LANG.en).toBe(require('../lib/tm_lang_en.js'));
    for (const k of ['fi', 'sv', 'en']) expect(lehdet(L.TM_LANG[k]), k + ' avaimia vähintään kuten ennen jakoa (22.11.2026: 1207)').toBeGreaterThanOrEqual(1207);
    expect(L.TM_LANG.sv.yleiset.tallenna).toBe('Spara'); expect(L.TM_LANG.en.yleiset.tallenna).toBe('Save');
    expect(L.tmTuetutKielet()).toEqual(['fi', 'sv', 'en']);
  });
  it('moottoritiedosto ei sisällä sv/en-sanakirjaa (≤ 1600 riviä, ei "sv: {"/"en: {" -lohkoja)', () => {
    const s = lue('lib/tm_lang.js'); expect(s.split('\n').length).toBeLessThan(1600); expect(s).not.toMatch(/\n {2}sv: \{/); expect(s).not.toMatch(/\n {2}en: \{/);
  });
  it('selain (vm): ilman pakettia tmTuetutKielet() = fi/sv/en, t() putoaa suomeen heittämättä; paketin jälkeen sv', () => {
    const sb = { console: { log() {}, warn() {}, error() {} }, localStorage: { getItem: () => null, setItem() {} }, navigator: { language: 'fi' }, document: { documentElement: { setAttribute() {} } } }; sb.window = sb; vm.createContext(sb);
    vm.runInContext(lue('lib/tm_lang.js'), sb);
    expect(sb.window.tmTuetutKielet()).toEqual(['fi', 'sv', 'en']); sb.window.tmAsetaKieli('sv'); expect(sb.window.tmLangValmis()).toBe(false);
    expect(sb.window.t('yleiset.tallenna')).toBe('Tallenna');   // fallback sv → en → fi
    vm.runInContext(lue('lib/tm_lang_sv.js'), sb); expect(sb.window.tmLangValmis()).toBe(true); expect(sb.window.t('yleiset.tallenna')).toBe('Spara');
  });
  it('järjestysriippumaton: paketti ENNEN moottoria (defer-järjestys) → moottori yhdistää TM_LANG_PAKETIT:n', () => {
    const sb = { console: { log() {}, warn() {}, error() {} }, localStorage: { getItem: () => 'sv', setItem() {} }, navigator: { language: 'fi' }, document: { documentElement: { setAttribute() {} } } }; sb.window = sb; vm.createContext(sb);
    vm.runInContext(lue('lib/tm_lang_sv.js'), sb); vm.runInContext(lue('lib/tm_lang.js'), sb);
    expect(sb.window.tmNykyinenKieli()).toBe('sv'); expect(sb.window.tmLangValmis()).toBe(true); expect(sb.window.t('yleiset.tallenna')).toBe('Spara');
  });
  it('sivut: kaikki 10 sivua lataavat paketit; fi-sivuksi säästävät (text/plain) vain Master, Kehitystyöpöytä, Pelaaja_v7, Vanhempi_v2; loput eager (Seura lukee TM_LANG[kieli]:ä annetulla kielellä)', () => {
    const laiskat = ['Master_v16', 'Kehitystyopoyta', 'Pelaaja_v7', 'Vanhempi_v2'], eager = ['ADAR_Pikakortti', 'Huoltajakutsu', 'Pelihavainto_Kentta', 'Rekisterointi_Suostumus', 'Seura', 'VP_v25'];
    for (const n of laiskat) { const h = lue('TalentMaster_' + n + '.html'); for (const k of ['sv', 'en']) { expect(h, n + ' ' + k).toMatch(new RegExp('<script type="text/plain" data-tm-kielipaketti(?: data-tm-kieli="' + k + '")? src="lib/tm_lang_' + k + '\\.js"></script>')); expect(h, n + ' ei eager').not.toContain('<script src="lib/tm_lang_' + k + '.js">'); } }
    for (const n of eager) { const h = lue('TalentMaster_' + n + '.html'); for (const k of ['sv', 'en']) expect(h, n + ' ' + k).toContain('<script src="lib/tm_lang_' + k + '.js"></script>'); expect(h.indexOf('lib/tm_lang.js'), n).toBeLessThan(h.indexOf('lib/tm_lang_sv.js')); }
  });
  it('Pelaaja_v7 + Vanhempi_v2: draw() odottaa paketin; ei-fi-käyttäjälle synkroninen esilataus; document.write ei näytä <script src>-tagilta (versiotiiviste/SW-testit)', () => {
    for (const n of ['Pelaaja_v7', 'Vanhempi_v2']) {
      const h = lue('TalentMaster_' + n + '.html');
      expect(h, n).toMatch(/function draw\(\)\{\n  if \(typeof tmLangValmis === 'function' && !tmLangValmis\(\)\) \{ tmLangLataa\(\)\.then\(function \(\) \{ draw\(\); \}\); return; \}/);
      expect(h, n).toContain("localStorage.getItem('tm_kieli')"); expect(h, n).toContain("document.write('<script src'+");
    }
  });
  it('Master/Kehitystyöpöytä: data-tm-kieli rajaa paketin aktiiviseen kieleen', () => {
    for (const n of ['Master_v16', 'Kehitystyopoyta']) { const h = lue('TalentMaster_' + n + '.html'); expect(h).toContain('data-tm-kieli="sv" src="lib/tm_lang_sv.js"'); expect(h).toContain('data-tm-kieli="en" src="lib/tm_lang_en.js"'); }
  });
  it('SW: Pelaaja/Vanhempi-allowlist ja ADAR-precache kattavat paketit (offline sv/en)', () => {
    for (const f of ['sw_pelaaja.js', 'sw_vanhempi.js']) { const sw = lue(f), onAllowlist = new Function(sw.slice(sw.indexOf('function onAllowlist'), sw.indexOf("self.addEventListener('fetch'")) + ';return onAllowlist;')(); for (const k of ['sv', 'en']) expect(onAllowlist('https://x/lib/tm_lang_' + k + '.js?v=abc'), f + ' ' + k).toBe(true); }
    const adar = lue('sw_adar.js'); expect(adar).toContain("'/lib/tm_lang_sv.js'"); expect(adar).toContain("'/lib/tm_lang_en.js'");
  });
});

describe('scripts/lang_lahde.cjs: vanhan yksitiedostoisen tekstin yhdistäjä (sv-erien vientiskriptit)', () => {
  it('yhdistetty teksti sisältää sv:/en:-lohkot ja kiertotesti kirjoita(lue(x)) palauttaa tiedostot tavu tavulta', () => {
    const y = LL.lue(JUURI); expect(y).toMatch(/\n {2}sv: \{\n\n {4}yleiset: \{/); expect(y).toMatch(/\n {2}en: \{\n\n {4}yleiset: \{/); expect(y).not.toContain('@@KIELIPAKETIT@@');
    const d = mkdtempSync(join(tmpdir(), 'langl-')); mkdirSync(join(d, 'lib')); const F = ['lib/tm_lang.js', 'lib/tm_lang_sv.js', 'lib/tm_lang_en.js']; F.forEach((f) => copyFileSync(join(JUURI, f), join(d, f)));
    LL.kirjoita(d, y); F.forEach((f) => expect(readFileSync(join(d, f), 'utf8') === lue(f), f).toBe(true));
  });
  it('muutos yhdistettyyn tekstiin (uusi sv-rivi) päätyy vain sv-tiedostoon', () => {
    const d = mkdtempSync(join(tmpdir(), 'langl-')); mkdirSync(join(d, 'lib')); ['lib/tm_lang.js', 'lib/tm_lang_sv.js', 'lib/tm_lang_en.js'].forEach((f) => copyFileSync(join(JUURI, f), join(d, f)));
    const y = LL.lue(d), u = y.replace("tallenna:         'Spara',", "tallenna:         'Spara MUUTOS',"); expect(u).not.toBe(y); LL.kirjoita(d, u);
    expect(readFileSync(join(d, 'lib/tm_lang_sv.js'), 'utf8')).toContain("'Spara MUUTOS'"); expect(readFileSync(join(d, 'lib/tm_lang.js'), 'utf8')).toBe(lue('lib/tm_lang.js')); expect(readFileSync(join(d, 'lib/tm_lang_en.js'), 'utf8')).toBe(lue('lib/tm_lang_en.js'));
  });
});
