/* P5 (12.11.2026): sv/en-sanakirjat ladataan laiskasti. Vartijat: (1) loader fi-tilassa ei lataa mitään ja stubit = identiteetti; (2) ei-fi → paketit HTML-järjestyksessä peräkkäin, kerran, virhe ei kaada;
   (3) Kehitystyöpöytä ei lataa sanakirjoja staattisesti (text/plain-merkintä) ja sivu odottaa lataus ennen renderiä; (4) fi-stubit täsmäävät oikeiden funktioiden fi-tulokseen. */
import { describe, it, expect } from 'vitest';
import { readFileSync } from 'fs';
import { createRequire } from 'module';
import vm from 'vm';
const require = createRequire(import.meta.url);
const LOADER = readFileSync(new URL('../lib/tm_kieli_paketit.js', import.meta.url), 'utf8');
const HTML = readFileSync(new URL('../TalentMaster_Kehitystyopoyta.html', import.meta.url), 'utf8');
const PAKETIT = ['lib/tm_lib_i18n.js', 'lib/tm_i18n_common.js', 'lib/tm_master_i18n.js', 'lib/tm_teknistaktiset_sv.js'];

function ymparisto(opts) {
  const lisatty = [], sandbox = { console: { warn() {} }, Promise, localStorage: { getItem: () => (opts && opts.ls) || null } };
  const els = PAKETIT.map((p) => ({ getAttribute: () => p }));
  sandbox.document = { readyState: 'complete', head: { appendChild(el) { lisatty.push(el.src); setTimeout(() => (opts && opts.virhe === el.src ? el.onerror() : el.onload()), 1); } }, createElement: () => ({}), querySelectorAll: () => els, addEventListener() {} };
  sandbox.window = sandbox; vm.createContext(sandbox); vm.runInContext(LOADER, sandbox);
  return { w: sandbox, lisatty };
}

describe('tm_kieli_paketit: laiska kielipakettilataus (P5)', () => {
  it('fi: ei lataa mitään; stubit identiteettejä; oikeat tiedostot ylikirjoittavat stubit', async () => {
    const { w, lisatty } = ymparisto();
    expect(await w.tmKieliPaketit.lataa('fi')).toBe(false); expect(await w.tmKieliPaketit.lataa(null)).toBe(false); expect(lisatty).toEqual([]);
    expect(w.masterT('Tallenna')).toBe('Tallenna'); expect(w.tmI18nResolve('x', {})).toBe('x'); expect(w.tmLibT('kt_a')).toBeUndefined(); expect(w.tmLibPohjat('a', 'b')).toBeNull(); expect(() => { w.masterLokalisoi(); w.tmLokalisoiCommon(); }).not.toThrow();
  });
  it('sv: kaikki paketit HTML-järjestyksessä, kerran; toinen kutsu samaan lupaukseen', async () => {
    const { w, lisatty } = ymparisto();
    const a = w.tmKieliPaketit.lataa('sv'), b = w.tmKieliPaketit.lataa('sv'); expect(a).toBe(b); expect(await a).toBe(true); expect(lisatty).toEqual(PAKETIT);
  });
  it('lataus epäonnistuu → false (ei heitä), sivu jää fi:ksi', async () => {
    const { w } = ymparisto({ virhe: 'lib/tm_master_i18n.js' }); expect(await w.tmKieliPaketit.lataa('sv')).toBe(false); expect(w.masterT('Tallenna')).toBe('Tallenna');
  });
  it('localStorage tm_kieli=sv → lataus alkaa heti (eräkäynnistys)', async () => {
    const { lisatty } = ymparisto({ ls: 'sv' }); await new Promise((r) => setTimeout(r, 30)); expect(lisatty.length).toBe(PAKETIT.length);
  });
  it('fi-stubit = oikeiden funktioiden fi-tulos (masterT, tmI18nResolve, tmLibT, tmLibPohjat)', () => {
    const M = require('../lib/tm_master_i18n.js'), C = require('../lib/tm_i18n_common.js'), L = require('../lib/tm_lib_i18n.js');
    const { w } = ymparisto();
    ['Tallenna', 'Ladataan joukkuetta...', 'jokin tuntematon teksti', 'kt_aloita_otsikko'].forEach((k) => { expect(w.masterT(k)).toBe(M.masterT(k)); expect(w.tmLibT(k)).toBe(L.tmLibT(k, 'fi')); });
    expect(w.tmLibPohjat('a', 'b')).toBe(L.tmLibPohjat('a', 'b', 'fi')); expect(C).toBeTruthy();
  });
  it('Kehitystyöpöytä: sanakirjat vain text/plain-merkittyinä (ei staattista latausta), ennen renderiä odotetaan lataus', () => {
    PAKETIT.forEach((p) => {
      expect(HTML).toContain('<script type="text/plain" data-tm-kielipaketti src="' + p + '"></script>');
      expect(HTML).not.toMatch(new RegExp('<script src="' + p.replace(/\./g, '\\.') + '"'));
    });
    expect(HTML.indexOf('lib/tm_kieli_paketit.js')).toBeLessThan(HTML.indexOf('data-tm-kielipaketti'));
    expect(HTML).toMatch(/await window\.tmKieliPaketit\.lataa\(_kieli\(\)\);[^\n]*\n\s*if \(typeof masterLokalisoi === 'function'\) masterLokalisoi\(\);/);
    expect(HTML).toMatch(/_auth\.onAuthStateChanged\(function \(user\) \{[\s\S]{0,300}tmKieliPaketit\.lataa\(_kieli\(\)\)/);
  });
});

describe('tm_kieli_paketit: arvona välitetty stub (L1-regressio: nav-lib saa t: masterT ennen latausta)', () => {
  it('ennen latausta talteen otettu masterT/tmLibT delegoi oikeaan funktioon sv-latauksen jälkeen; fi pysyy identiteettinä; ei-latautunut → stub', async () => {
    const sb = { console: { warn() {} }, Promise, localStorage: { getItem: () => null } };
    sb.document = { readyState: 'complete', head: { appendChild(el) { setTimeout(() => { if (/master_i18n/.test(el.src)) { sb.masterT = function (fi) { return 'sv:' + fi; }; sb.tmLibT = function () { return 'svlib'; }; } el.onload(); }, 1); } }, createElement: () => ({}), querySelectorAll: () => [{ getAttribute: () => 'lib/tm_master_i18n.js' }] };
    sb.window = sb; vm.createContext(sb); vm.runInContext(LOADER, sb);
    const talteen = sb.masterT, talteenLib = sb.tmLibT;   // kuten t: masterT navigaation asennuksessa
    expect(talteen('Koti')).toBe('Koti'); expect(talteenLib('x')).toBeUndefined();
    expect(await sb.tmKieliPaketit.lataa('sv')).toBe(true);
    expect(talteen('Koti')).toBe('sv:Koti'); expect(talteenLib('x')).toBe('svlib'); expect(sb.masterT('Koti')).toBe('sv:Koti');
  });
});

describe('tm_kieli_paketit.valmis(): synkroninen "sanakirjat paikallaan" (a2-flake 20.11.2026)', () => {
  const MASTER = readFileSync(new URL('../TalentMaster_Master_v16.html', import.meta.url), 'utf8');
  it('fi → aina true; sv → false kunnes lataus on ratkennut, sitten true', async () => {
    const { w } = ymparisto(); w.tmNykyinenKieli = () => 'fi'; expect(w.tmKieliPaketit.valmis()).toBe(true);
    w.tmNykyinenKieli = () => 'sv'; expect(w.tmKieliPaketit.valmis()).toBe(false);
    const lupaus = w.tmKieliPaketit.valmiit(); expect(w.tmKieliPaketit.valmis()).toBe(false);   // lataus käynnissä → ei vielä valmis (tässä ikkuna jossa TM_TT_SV puuttui)
    await lupaus; expect(w.tmKieliPaketit.valmis()).toBe(true);
  });
  it('epäonnistunut lataus ratkaisee myös (fi-fallback) → valmis() true, ei ikuista odotusta eikä uudelleenpiirtosilmukkaa', async () => {
    const { w } = ymparisto({ virhe: 'lib/tm_teknistaktiset_sv.js' }); w.tmNykyinenKieli = () => 'sv';
    expect(await w.tmKieliPaketit.valmiit()).toBe(false); expect(w.tmKieliPaketit.valmis()).toBe(true);
  });
  it('en → sama kuin sv; kielenvaihto fi→sv ennen latausta → false', async () => {
    const { w } = ymparisto(); w.tmNykyinenKieli = () => 'en'; expect(w.tmKieliPaketit.valmis()).toBe(false); await w.tmKieliPaketit.lataa('en'); expect(w.tmKieliPaketit.valmis()).toBe(true);
  });
  it('Master _ktNayta piirtää vasta kun paketit ovat paikallaan (valmis → muuten valmiit().then(_ktNayta)) — ensimmäinen lause funktiossa', () => {
    const i = MASTER.indexOf('function _ktNayta() {'); expect(i).toBeGreaterThan(-1);
    const alku = MASTER.slice(i, i + 700); expect(alku).toContain('tmKieliPaketit.valmis()'); expect(alku).toContain('valmiit().then(function () { _ktNayta(); })');
    expect(alku.indexOf('valmis()')).toBeLessThan(alku.indexOf('_ktAsetaHTML'));
  });
});
