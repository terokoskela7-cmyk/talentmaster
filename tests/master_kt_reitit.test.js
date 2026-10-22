/* Kehitystyöpöytä-reitit (lippu kehitystyopoyta_v2): KAIKKI pelaajan avaukset Masterissa ja VP:ssä kulkevat yhden sisäänkäynnin kautta.
   Master: _mAvaaPelaaja (lippu päällä / pois / lukematta / _demo / luku epäonnistuu) · renderDev ei piirrä vanhaa näkymää passiivisesti · Pelaajat-otsikko · grep-portti.
   VP: _avaaPerPelaajaPikakatsaus odottaa lipun (ei kilpailua vanhaan modaaliin). Runtime vm-hiekkalaatikossa oikeilla funktioilla + Chrome (Playwright) oikealla Masterilla. */
import { describe, it, expect } from 'vitest';
import { readFileSync, existsSync } from 'fs';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';
import { createRequire } from 'module';
import vm from 'vm';
import { pura } from './helpers/master_pinfo.mjs';
import { sivu } from './helpers/kalenteri_sivu.mjs';
const require = createRequire(import.meta.url);
const JUURI = join(dirname(fileURLToPath(import.meta.url)), '..');
const MA = readFileSync(join(JUURI, 'TalentMaster_Master_v16.html'), 'utf8'), VP = readFileSync(join(JUURI, 'TalentMaster_VP_v25.html'), 'utf8');
const KS = require('../lib/tm_kt_sivu.js');
const ilmanKomm = (x) => x.replace(/\/\*[\s\S]*?\*\//g, '').replace(/\/\/.*$/gm, '');
const odota = () => new Promise((r) => setTimeout(r, 0));

/* Masterin oikeat funktiot; tynkien nimet = tuotannon muuttujat (ReferenceError ei peity). */
const NIMET = ['_mKtSivuTieto', '_mKtSivuPaatos', '_mAvaaPelaaja', '_mAvaaD3', '_mAvaaPelaajaVanha', 'pickPlayer'];
function master(o) {
  o = o || {}; const kutsut = [], ctx = {
    console: { warn() {}, log() {} }, Promise, Boolean, _demo: !!o.demo, _seuraId: o.seura === undefined ? 'sjk' : o.seura, TM_KT_SIVU: KS, location: { href: '' },
    _mJjLataaLiput: () => (o.liputVirhe ? Promise.reject(new Error('x')) : Promise.resolve({ kehitystyopoyta_v2: o.lippuLuettuArvo === true })),
    renderDev: (pid, vanha) => kutsut.push(['renderDev', pid, vanha]), _avaaD3Arvio: (p) => kutsut.push(['d3', p]), _avaaPelaajaraportti: (p) => kutsut.push(['raportti', p]),
    _ktKaynnista: () => Promise.resolve(), _ktAvaa: () => false, _ktLippu: false, _ktLippuLuettu: true };
  ctx.window = ctx; ctx._tmKtSivu = o.lippu; ctx._mDevVanha = o.vanha; ctx._kutsut = kutsut; vm.createContext(ctx);
  vm.runInContext(NIMET.filter((n) => n !== 'pickPlayer').map((n) => pura(MA, 'function ' + n + '(')).join('\n') + '\n' + pura(MA, 'function pickPlayer(') + '\nthis._f={' + NIMET.join(',') + '};', ctx);
  return ctx;
}

describe('Master · _mAvaaPelaaja', () => {
  it('lippu päällä → #pelaaja/{pid}/tanaan; vanhaan renderDev:iin ei mennä', () => {
    const c = master({ lippu: true }); c._f._mAvaaPelaaja('p2'); expect(c.location.href).toBe('TalentMaster_Kehitystyopoyta.html#pelaaja/p2/tanaan'); expect(c._kutsut).toEqual([]);
  });
  it('pickPlayer (≈15 onclick-merkkijonoa) on sama sisäänkäynti; välilehti-parametri ja virheellinen välilehti → tanaan', () => {
    const c = master({ lippu: true }); c._f.pickPlayer('p3'); expect(c.location.href).toBe('TalentMaster_Kehitystyopoyta.html#pelaaja/p3/tanaan');
    c._f._mAvaaPelaaja('p3', 'polku'); expect(c.location.href).toMatch(/#pelaaja\/p3\/polku$/); c._f._mAvaaPelaaja('p3', 'ei_ole'); expect(c.location.href).toMatch(/#pelaaja\/p3\/tanaan$/);
  });
  it('lippu pois → entinen logiikka: renderDev(pid, vanha=true); ei navigointia', () => {
    const c = master({ lippu: false }); c._f._mAvaaPelaaja('p2'); expect(c.location.href).toBe(''); expect(c._kutsut).toEqual([['renderDev', 'p2', true]]);
  });
  it('lippu LUKEMATTA → odottaa _mJjLataaLiput-lupauksen: päällä → sivu, ei välähdystä vanhaan näkymään', async () => {
    const c = master({ lippu: undefined, lippuLuettuArvo: true }); c._f._mAvaaPelaaja('p2'); expect(c.location.href).toBe(''); expect(c._kutsut).toEqual([]);
    await odota(); await odota(); expect(c.location.href).toBe('TalentMaster_Kehitystyopoyta.html#pelaaja/p2/tanaan'); expect(c._kutsut).toEqual([]); expect(c._tmKtSivu).toBe(true);
  });
  it('lippu LUKEMATTA ja pois → vanha näkymä luennan jälkeen; luku epäonnistuu → vanha (ei jumita)', async () => {
    const a = master({ lippu: undefined, lippuLuettuArvo: false }); a._f._mAvaaPelaaja('p2'); await odota(); await odota(); expect(a._kutsut).toEqual([['renderDev', 'p2', true]]); expect(a.location.href).toBe('');
    const b = master({ lippu: undefined, liputVirhe: true }); b._f._mAvaaPelaaja('p2'); await odota(); await odota(); expect(b._kutsut).toEqual([['renderDev', 'p2', true]]); expect(b._tmKtSivu).toBe(false);
  });
  it('_demo ja seuraton → aina vanha (lippua ei käytetä)', () => {
    const d = master({ lippu: true, demo: true }); d._f._mAvaaPelaaja('p2'); expect(d.location.href).toBe(''); expect(d._kutsut).toEqual([['renderDev', 'p2', true]]);
    const e = master({ lippu: true, seura: '' }); e._f._mAvaaPelaaja('p2'); expect(e.location.href).toBe('');
  });
  it('V-KOTI "Arvioi" (d3): lippu päällä → Profiili; pois → D3-arviomodaali ennallaan', () => {
    const on = master({ lippu: true }); on._f._mAvaaD3('p2'); expect(on.location.href).toMatch(/#pelaaja\/p2\/profiili$/); expect(on._kutsut).toEqual([]);
    const off = master({ lippu: false }); off._f._mAvaaD3('p2'); expect(off._kutsut).toEqual([['d3', 'p2']]); expect(off.location.href).toBe('');
  });
});

describe('Master · lähdevartijat', () => {
  it('V-KOTI: pelaaja → _mAvaaPelaaja, d3 → _mAvaaD3 (ei suoraa renderDev/_avaaD3Arvio)', () => {
    expect(MA).toContain(`case 'pelaaja': return "_mAvaaPelaaja('" + a + "')"; case 'd3': return "_mAvaaD3('" + a + "')";`); expect(MA).not.toContain(`"setWs('dev');renderDev('"`);
  });
  it('GREP-PORTTI: renderDev(pid …) -kutsuja pelaajan avaamiseen ei ole muualla kuin _mAvaaPelaajaVanha / _ktVanhaAvaa (+ renderDevin oma uudelleenpiirto)', () => {
    let s = ilmanKomm(MA);
    for (const f of ['function _mAvaaPelaajaVanha(', 'function _ktVanhaAvaa(', 'function renderDev(']) s = s.replace(pura(s, f), '');
    const ulkopuolella = [...s.matchAll(/renderDev\(([^)]*)\)/g)].map((m) => m[0]).filter((x) => x !== 'renderDev()');
    expect(ulkopuolella).toEqual([]);   // sallittu: pelkkä renderDev() (passiivinen lista) — pelaaja-argumentti vain vartioiduissa funktioissa
  });
  it('J4-rivi (_mJaAvaa) kulkee uuden reitin kautta; "Pelaajaraportti + tavoitteet" -nappi on vanhan näkymän nappi ja pysyy ennallaan (Näyttö-sillan kohde, ei silmukkaa)', () => {
    expect(pura(MA, 'window._mJaAvaa = function')).toContain(`_mKtSivuTieto() === true`); expect(MA).toContain(`<button onclick="_avaaPelaajaraportti(\\'' + p.id`);
  });
  it('kaikki Masterin pelaajan avaus-onclickit käyttävät pickPlayeria (ei suoraa _activePelaaja-asetusta/renderDev-merkkijonoa)', () => {
    expect([...MA.matchAll(/renderDev\\?\(\\?['"]/g)]).toHaveLength(0);
  });
});

describe('Master · renderDev ei piirrä vanhaa pelaajanäkymää passiivisesti', () => {
  function dev(o) {
    const k = [], el = (id) => ({ id, innerHTML: 'x', setAttribute() {}, removeAttribute() {}, textContent: '' }), h = { id: 'devOtsikko', attrs: { 'data-i18n-lista': 'Pelaajat', 'data-i18n-vanha': 'Pelaajan elämäkerta' }, textContent: 'Pelaajan elämäkerta', getAttribute(a) { return this.attrs[a]; }, setAttribute(a, v) { this.attrs[a] = v; } }, v = { attrs: {}, setAttribute(a, x) { this.attrs[a] = x; }, removeAttribute(a) { delete this.attrs[a]; } };
    const ctx = { console: { warn() {} }, Promise, _demo: false, _seuraId: 'sjk', _joukkue: 'U13', _devFetchKey: null, _activePelaaja: 'p1', _pelaajatData: [{ id: 'p1' }, { id: 'p2' }], TM_KT_SIVU: KS, _tmKtSivu: o.lippu, window: null,
      document: { getElementById: (id) => (id === 'devOtsikko' ? h : el(id)), querySelector: () => v }, masterT: (x) => x, _mJjLataaLiput: () => Promise.resolve({ kehitystyopoyta_v2: o.lippuLuettuArvo === true }),
      _renderPlayerPickerFirestore: () => k.push('lista'), _renderPinfoFirestore: () => k.push('pinfo'), _renderTimeline: (x) => k.push('aikajana:' + (x ? 'p' : 'tyhja')), _renderNarrative: () => k.push('narratiivi'),
      _renderPlayerPicker: () => k.push('demo-lista'), _renderPinfo: () => {}, DEMO: { pelaajat: { teemu: {} } }, _lataaPelaajat: () => {} };
    ctx.window = ctx; vm.createContext(ctx); vm.runInContext(pura(MA, 'function _mKtSivuTieto(') + pura(MA, 'function _mKtSivuPaatos(') + pura(MA, 'function _mDevLista(') + pura(MA, 'function renderDev(') + '\nthis._f={renderDev,_mDevLista};', ctx);
    return { ctx, k, h, v };
  }
  it('lippu päällä: vain lista, ei pinfo/narratiivi/aikajana-sisältöä; otsikko "Pelaajat"; data-lista asetettu', () => {
    const { ctx, k, h, v } = dev({ lippu: true }); ctx._f.renderDev();
    expect(k).toEqual(['lista', 'aikajana:tyhja']); expect(h.textContent).toBe('Pelaajat'); expect(h.attrs['data-i18n']).toBe('Pelaajat'); expect(v.attrs['data-lista']).toBe('1');
  });
  it('lippu pois: entinen näkymä täsmälleen (lista + pinfo + aikajana + narratiivi), otsikko "Pelaajan elämäkerta"', () => {
    const { ctx, k, h, v } = dev({ lippu: false }); ctx._f.renderDev(); expect(k).toEqual(['lista', 'pinfo', 'aikajana:p', 'narratiivi']); expect(h.textContent).toBe('Pelaajan elämäkerta'); expect(v.attrs['data-lista']).toBeUndefined();
  });
  it('tietoinen vanha näkymä (renderDev(pid, true)) piirtää pinfon myös lipun ollessa päällä', () => {
    const { ctx, k, v } = dev({ lippu: true }); ctx._f.renderDev('p2', true); expect(k).toContain('pinfo'); expect(ctx._activePelaaja).toBe('p2'); expect(v.attrs['data-lista']).toBeUndefined();
  });
  it('lippu lukematta: ei vanhaa välähdystä; lippu selviää → piirtää uudelleen (päällä: vain lista, pois: vanha)', async () => {
    const a = dev({ lippu: undefined, lippuLuettuArvo: true }); a.ctx._f.renderDev(); expect(a.k).not.toContain('pinfo'); await odota(); await odota(); expect(a.k).not.toContain('pinfo'); expect(a.h.textContent).toBe('Pelaajat');
    const b = dev({ lippu: undefined, lippuLuettuArvo: false }); b.ctx._f.renderDev(); expect(b.k).not.toContain('pinfo'); await odota(); await odota(); expect(b.k).toContain('pinfo'); expect(b.h.textContent).toBe('Pelaajan elämäkerta');
  });
  it('Pelaajat-otsikko käyttää olemassa olevaa avainta (sv: Spelare) — uutta käännösavainta ei tarvita', () => {
    expect(require('../lib/tm_i18n_common.js')).toBeTruthy(); expect(readFileSync(join(JUURI, 'lib/tm_i18n_common.js'), 'utf8')).toContain(`'Pelaajat': 'Spelare'`);
  });
});

describe('VP · pelaajan avaus odottaa lipun', () => {
  function vp(o) {
    const k = [], ctx = { console: { warn() {} }, Promise, _isDemoMode: !!o.demo, _seuraId: 'sjk', TM_KT_SIVU: KS, location: { href: '' }, _ktLippu: false, _ktSivuLippu: o.lippu, _jsvPelaajat: [{ id: 'p1' }, { id: 'p2' }], _ktS: {},
      _vpLataaLiput: () => Promise.resolve({ kehitystyopoyta_v2: o.luettu === true }), toast() {} };
    ctx.window = ctx; vm.createContext(ctx);
    const ava = pura(VP, 'window._ktAvaa = function') , idx = pura(VP, 'window._ktAvaaIdx = function'), alku = VP.indexOf('window._avaaPerPelaajaPikakatsaus = function(idx, joukkueNimi) {'), loppu = VP.indexOf("  const lista = window._jsvPelaajat || [];", alku);
    vm.runInContext(ava + ';\n' + idx + ';\n' + VP.slice(alku, loppu) + '  k.push("VANHA-MODAALI");\n};', Object.assign(ctx, { k }));
    return ctx;
  }
  it('lippu päällä → sivu; lippu pois → vanha modaali (ennallaan)', () => {
    const on = vp({ lippu: true }); on._avaaPerPelaajaPikakatsaus(1, 'U13'); expect(on.location.href).toMatch(/#pelaaja\/p2\/tanaan$/); expect(on.k).toEqual([]);
    const off = vp({ lippu: false }); off._avaaPerPelaajaPikakatsaus(1, 'U13'); expect(off.location.href).toBe(''); expect(off.k).toEqual(['VANHA-MODAALI']);
  });
  it('lippu LUKEMATTA: odottaa; päällä → sivu (ei vanhaa modaalia), pois → vanha modaali', async () => {
    const on = vp({ lippu: undefined, luettu: true }); on._avaaPerPelaajaPikakatsaus(0, 'U13'); expect(on.k).toEqual([]); await odota(); await odota(); await odota();
    expect(on.location.href).toMatch(/#pelaaja\/p1\/tanaan$/); expect(on.k).toEqual([]); expect(on._ktSivuLippu).toBe(true);
    const off = vp({ lippu: undefined, luettu: false }); off._avaaPerPelaajaPikakatsaus(0, 'U13'); await odota(); await odota(); await odota(); expect(off.k).toEqual(['VANHA-MODAALI']); expect(off.location.href).toBe('');
  });
  it('_isDemoMode → ei lipun odotusta, vanha modaali heti', () => { const d = vp({ lippu: undefined, demo: true }); d._avaaPerPelaajaPikakatsaus(0, 'U13'); expect(d.k).toEqual(['VANHA-MODAALI']); });
});

const CHROME = [process.env.TM_CHROME_PATH, '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome', '/usr/bin/google-chrome', '/usr/bin/chromium'].filter(Boolean).find((p) => existsSync(p));
describe.skipIf(!(process.env.TM_CHROME_TESTS !== '0' && CHROME))('Master · Chrome: Pelaajat-lista ja V-KOTI-linkki lipulla', () => {
  const dokit = (lippu) => ({ 'seurat/demo': { nimi: 'Demo FC' }, 'seurat/demo/liput/julkiset': { kentta: false, kehitystyopoyta_v2: lippu } });
  async function aja(lippu, toiminto) {
    const { chromium } = require('playwright-core'), selain = await chromium.launch({ executablePath: CHROME, args: ['--no-sandbox', '--allow-file-access-from-files'] });
    try {
      const p = await (await selain.newContext({ viewport: { width: 1280, height: 900 } })).newPage(); await p.goto('file://' + sivu(MA, JUURI, { dokit: dokit(lippu), pohjat: false }));
      await p.waitForSelector('#probe-out', { state: 'attached', timeout: 20000 });
      await p.evaluate(() => { window._tmKtSivu = undefined; setWs('dev'); renderDev(); }); await p.waitForTimeout(400);
      const tila = await p.evaluate(() => ({ otsikko: document.getElementById('devOtsikko').textContent.trim(), pinfo: document.getElementById('pinfoCard').innerHTML.trim().length, pillit: document.querySelectorAll('#playerPicker .player-pill').length, lista: document.querySelector('.ws-view[data-view="dev"]').hasAttribute('data-lista'), nakyvaPinfo: document.getElementById('pinfoCard').offsetHeight }));
      const nav = p.waitForURL(/Kehitystyopoyta\.html#pelaaja\/p2\/tanaan/, { timeout: 4000 }).then(() => true, () => false);
      if (toiminto === 'pilli') await p.locator('#playerPicker .player-pill').nth(1).click(); else await p.evaluate(() => eval("_mAvaaPelaaja('p2')"));
      return { tila, naviguoi: await nav };
    } finally { await selain.close(); }
  }
  it('lippu päällä: Pelaajat = otsikko "Pelaajat" + lista (4 pilliä), ei pinfoa; pillin klikkaus → #pelaaja/p2/tanaan', async () => {
    const r = await aja(true, 'pilli'); expect(r.tila).toMatchObject({ otsikko: 'Pelaajat', pinfo: 0, pillit: 4, lista: true, nakyvaPinfo: 0 }); expect(r.naviguoi).toBe(true);
  }, 60000);
  it('lippu päällä: V-KOTI-pelaajalinkin toiminto (_mAvaaPelaaja) → #pelaaja/p2/tanaan', async () => { expect((await aja(true, 'koti')).naviguoi).toBe(true); }, 60000);
  it('lippu pois: vanha näkymä ennallaan (otsikko "Pelaajan elämäkerta", pinfo piirretty), ei navigointia', async () => {
    const r = await aja(false, 'pilli'); expect(r.tila).toMatchObject({ otsikko: 'Pelaajan elämäkerta', lista: false }); expect(r.tila.pinfo).toBeGreaterThan(0); expect(r.naviguoi).toBe(false);
  }, 60000);
});
