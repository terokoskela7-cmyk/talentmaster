/* K4e kohta 1 · Profiili → kortti "Psyykkinen (D3)" + D3-arviomodaali sivulla (lib/tm_d3_kortti.js). Unit: kalibraatioero ja ⚠ (pariteetti renderD3VertailuHTML:n kanssa), tyhjätila, datalähde (uusi paikka → varalla vanha),
   laskennan pariteetti Masterin _tallennaD3:n kanssa (oikea funktio vm:ssä), sijoitus Fyysisen jälkeen, §7.22 (vain henkilökunta). Chrome: lippu päällä → kortti, "Päivitä arvio" avaa modaalin, tallennus päivittää kortin. Rules: viitataan tests/rules/sisainen.rules.test.js. */
import { describe, it, expect } from 'vitest';
import { readFileSync, mkdirSync } from 'fs';
import { join } from 'path';
import { createRequire } from 'module';
import vm from 'vm';
import { TOPIAS } from './helpers/k4a_fixturet.mjs';
import { pura } from './helpers/master_pinfo.mjs';
import { kaynnista, selainKaynnista, CHROME, JUURI, PELAAJAT } from './helpers/kt_sivu.mjs';
const require = createRequire(import.meta.url);
const lue = (f) => readFileSync(new URL('../' + f, import.meta.url), 'utf8');
const K = require('../lib/tm_d3_kortti.js'), D3 = require('../lib/tm_d3_itsearvio.js'), S = require('../lib/tm_sisainen.js'), N = require('../lib/tm_eerikkila_normit.js');
const TC = require('../lib/tm_todistekortit.js'), TH = require('../lib/tm_todistekortit_html.js'), L = require('../lib/tm_naytto_lohkot.js');
const esc = (s) => String(s == null ? '' : s).replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
const DIMS = ['inner_drive', 'coachability', 'resilience', 'focus', 'emotional_control'];
const pist = (o) => { const x = {}; Object.keys(o).forEach((k) => { x[k] = {}; ['pelaaja', 'valmentaja', 'vp'].forEach((a, i) => { if (o[k][i] != null) x[k][a] = o[k][i]; }); }); return x; };   // { dim: [pel, val, vp] }
const pelaaja = (d3, extra) => Object.assign({ id: 'p1', etunimi: 'Aatu', d3_viimeisin: { pisteet: pist(d3), pvm: '2026-10-12', lahteet: ['valmentaja', 'pelaaja'] } }, extra || {});
const rivi = (m, k) => m.rivit.find((r) => r.avain === k);

describe('K4e · D3-kortin malli: kalibraatioero ja ⚠', () => {
  it('kuilu = max − min (pelaaja / valmentaja / VP); ⚠ kun ≥ 1,5 — ei ⚠ kun eroa alle 1,5 tai vain yksi lähde', () => {
    const m = K.tmD3KorttiMalli(pelaaja({ resilience: [2, 4, 4], focus: [3, 4, null], inner_drive: [4, null, null], coachability: [5, 3, 4], emotional_control: [null, 3, 4] }), { nimi: 'Aatu' });
    expect(rivi(m, 'resilience')).toMatchObject({ pel: 2, val: 4, vp: 4, kuilu: 2, varo: true }); expect(rivi(m, 'focus').varo).toBe(false);
    expect(rivi(m, 'inner_drive')).toMatchObject({ kuilu: 0, varo: false }); expect(rivi(m, 'coachability').varo).toBe(true); expect(m.varoja).toBe(2);
  });
  it('PARITEETTI: ⚠-säännön kanssa sama kuin Masterin D3-kalibraatio (renderD3VertailuHTML) — satunnaisilla arvoilla', () => {
    let siemen = 7; const r = () => (siemen = (siemen * 9301 + 49297) % 233280) / 233280, arvo = () => (r() < 0.25 ? null : 1 + Math.floor(r() * 5));
    for (let i = 0; i < 300; i++) {
      const d = {}; DIMS.forEach((k) => { d[k] = [arvo(), arvo(), arvo()]; });
      const vertailu = N.renderD3VertailuHTML(pist(d)), rivit = vertailu.split('<div style="display:flex;align-items:center;gap:6px;padding:3px 0;font-size:11px">').slice(1).map((x) => x.indexOf('⚠') >= 0);
      const m = K.tmD3KorttiMalli(pelaaja(d), {}); expect(m.rivit.map((x) => x.varo), JSON.stringify(d)).toEqual(rivit);
    }
  });
  it('lause: pelaaja selvästi valmentajia matalammaksi → "ota puheeksi kehityskeskustelussa" (max 2 lausetta, nimi + ulottuvuus)', () => {
    const m = K.tmD3KorttiMalli(pelaaja({ resilience: [2, 4, 4], focus: [3, 3, null] }), { nimi: 'Aatu' }); expect(m.lause.avain).toBe('d3k_lause_matalampi');
    const fi = K.FI, teksti = fi.d3k_lause_matalampi.replace('{nimi}', 'Aatu').replace('{aihe}', 'Sinnikkyys');
    expect(m.lause.par).toEqual({ nimi: 'Aatu', aihe: 'Sinnikkyys' }); expect(teksti).toContain('matalammaksi'); expect(teksti).toContain('kehityskeskustelussa'); expect(teksti.split(/(?<=\.)\s+/).length).toBeLessThanOrEqual(2);
  });
  it('lause: korkeampi · valmentajat keskenään · linjassa · vain yksi lähde', () => {
    expect(K.tmD3KorttiMalli(pelaaja({ focus: [5, 3, null] }), {}).lause.avain).toBe('d3k_lause_korkeampi');
    expect(K.tmD3KorttiMalli(pelaaja({ focus: [null, 2, 4] }), {}).lause.avain).toBe('d3k_lause_valm_vp');
    expect(K.tmD3KorttiMalli(pelaaja({ focus: [3, 4, null] }), {}).lause.avain).toBe('d3k_lause_linjassa');
    expect(K.tmD3KorttiMalli(pelaaja({ focus: [3, null, null] }), {}).lause.avain).toBe('d3k_lause_vain_pelaaja'); expect(K.tmD3KorttiMalli(pelaaja({ focus: [null, 4, null] }), {}).lause.avain).toBe('d3k_lause_vain_valmentaja');
  });
});

describe('K4e · tyhjätila ja datalähde (uusi paikka → varalla vanha)', () => {
  it('tyhjätila: ei arvoja → tyhja, "Ei vielä D3-arviota." + painike "Tee arvio" (vain kirjoitusoikeudella)', () => {
    const m = K.tmD3KorttiMalli({ id: 'p1', etunimi: 'Aatu' }, {}); expect(m.tyhja).toBe(true);
    const h = K.tmD3KorttiHTML(m, { esc, pid: 'p1', voiKirjoittaa: true }); expect(h).toContain('Ei vielä D3-arviota.'); expect(h).toContain('Tee arvio'); expect(h).not.toContain('tc-d3-taulu');
    expect(K.tmD3KorttiHTML(m, { esc, pid: 'p1', voiKirjoittaa: false })).not.toContain('<button');
  });
  it('uusi paikka: sisainen/tiedot voittaa vanhan pelaajakentän; pelaajan d3_itsearvio = PEL', () => {
    const vanha = { id: 'p1', etunimi: 'Aatu', d3_viimeisin: { pisteet: pist({ resilience: [null, 2, null] }), pvm: '2026-09-01', lahteet: ['valmentaja'] }, d3_itsearvio: { pisteet: { resilience: 5 }, pvm: '2026-10-10' } };
    const sis = { seuraId: 's', d3_viimeisin: { pisteet: pist({ resilience: [null, 4, 3] }), pvm: '2026-10-12', lahteet: ['valmentaja'] } };
    const m = K.tmD3KorttiMalli(S.tmSisainenYhdista(vanha, sis), {}); expect(rivi(m, 'resilience')).toMatchObject({ pel: 5, val: 4, vp: 3 }); expect(m.pvm).toBe('2026-10-12');
  });
  it('varalla vanha: ei sisainen-dokumenttia → vanhat d3_*-kentät; vain d3_itsearvio → PEL ilman kaatumista; syöte ennallaan', () => {
    const vanha = pelaaja({ focus: [3, 4, null] }), kopio = JSON.stringify(vanha); const m = K.tmD3KorttiMalli(S.tmSisainenYhdista(vanha, null), {}); expect(rivi(m, 'focus')).toMatchObject({ pel: 3, val: 4 }); expect(JSON.stringify(vanha)).toBe(kopio);
    const vainItse = K.tmD3KorttiMalli({ id: 'p1', d3_itsearvio: { pisteet: { focus: 2 }, pvm: '2026-10-10' } }, {}); expect(vainItse.tyhja).toBe(false); expect(rivi(vainItse, 'focus')).toMatchObject({ pel: 2, val: null }); expect(vainItse.pvm).toBe('2026-10-10');
  });
});

describe('K4e · laskennan pariteetti Masterin _tallennaD3:n kanssa (oikea funktio vm:ssä)', () => {
  const MA = lue('TalentMaster_Master_v16.html');
  function masterTallenna(p, vastaukset) {
    const kirj = []; const ctx = { console: { warn() {} }, _pelaajatData: [p], _D3_DIMS: DIMS.map((k) => ({ key: k })), _d3Vastaukset: Object.assign({}, vastaukset), toast() {}, masterT: (x) => x, tmPaivaIso: () => '2026-10-23', _db: {}, _seuraId: 's', _activePelaaja: null,
      d3Varmuus: N.d3Varmuus, _renderPinfoFirestore() {}, document: { getElementById: () => null }, window: { TM_SISAINEN: { tmSisainenKirjoita: async (db, sid, pid, payload) => { kirj.push(payload); } } } };
    vm.createContext(ctx); vm.runInContext(pura(MA, 'function _laskeD3Avg(') + '\n' + pura(MA, 'async function _tallennaD3(') + '\nthis._f=_tallennaD3;', ctx);
    return ctx._f(p.id).then(() => kirj[0]);
  }
  it('sama d3_viimeisin / d3_taso / d3_pvm / d3_varmuus kuin Master tallentaisi (tyhjä, vain pelaaja, trianguloitu, VP-osa säilyy)', async () => {
    const tapaukset = [[{ id: 'p1' }, { focus: 4 }], [pelaaja({ focus: [3, null, null] }), { focus: 5, resilience: 2 }], [pelaaja({ focus: [3, 4, 2], resilience: [2, null, 4] }), { resilience: 3 }], [pelaaja({ inner_drive: [null, 4, null] }), { coachability: 1, focus: 5, emotional_control: 3 }]];
    for (const [p, v] of tapaukset) {
      const m = await masterTallenna(JSON.parse(JSON.stringify(p)), v), o = K.tmD3ArvioKokoa(JSON.parse(JSON.stringify(p)), v, { pvm: '2026-10-23' });
      expect(o, JSON.stringify([p, v])).toEqual(m);
    }
  });
  it('ilman arvoja ei kirjoiteta (null)', () => { expect(K.tmD3ArvioKokoa(pelaaja({ focus: [3, 4, null] }), {}, { pvm: '2026-10-23' })).toBeNull(); });
});

describe('K4e · HTML, sijoitus ja rajaukset', () => {
  const malli = (p, extra) => { const isp = L.tmNayttoDevIkaSp(p); const c = Object.assign({ nyt: new Date('2026-10-19T12:00:00'), ika: isp.ika, sp: isp.sp, perTestTasot: N.perTestTasot, jaksoTila: 'ei_jaksoa', esc, pid: p.id }, extra || {}); return { m: TC.tmTodisteMalli(p, c), c }; };
  it('kortti tulee Fyysinen-kortin JÄLKEEN samassa ruudukossa (ei duplikaattia), ⚠-rivi + painike', () => {
    const d3 = K.tmD3KorttiHTML(K.tmD3KorttiMalli(pelaaja({ resilience: [2, 4, 4] }), { nimi: 'Aatu' }), { esc, pid: 'p1', voiKirjoittaa: true });
    const { m, c } = malli(TOPIAS); const h = TH.tmTodisteHTML(m, Object.assign({}, c, { jalkeen: { fyysinen: d3 } })).kortitHTML;
    const avaimet = [...h.matchAll(/data-tc-kortti="([a-z0-9_]+)"/g)].map((x) => x[1]); expect(avaimet.filter((a) => a === 'd3')).toHaveLength(1);
    if (avaimet.indexOf('fyysinen') >= 0) expect(avaimet.indexOf('d3')).toBe(avaimet.indexOf('fyysinen') + 1);
    expect(h).toContain('⚠'); expect(h).toContain('data-tc-toiminto="d3_arvio"'); expect(h).toContain('Päivitä arvio');
  });
  it('kohdekortti puuttuu → lisäkortti ruudukon loppuun; ilman c.jalkeen tulos on entinen', () => {
    const { m, c } = malli(TOPIAS), ilman = TH.tmTodisteHTML(m, c).kortitHTML; expect(TH.tmTodisteHTML(m, Object.assign({}, c, { jalkeen: {} })).kortitHTML).toBe(ilman);
    const h = TH.tmTodisteHTML(m, Object.assign({}, c, { jalkeen: { ei_ole: '<i data-x></i>' } })).kortitHTML; expect(h.indexOf('<i data-x></i>')).toBeGreaterThan(h.lastIndexOf('data-tc-kortti='));
  });
  it('modaali: 5 ulottuvuutta × 1–5, esivalinta (aria-pressed) ja tallenna; ei hex-värejä libissä', () => {
    const h = K.tmD3ArvioHTML(pelaaja({}), { focus: 4 }, { esc, pid: 'p1', nimi: 'Aatu', dims: L.D3_DIMS });
    expect((h.match(/class="tc-d3m-n/g) || []).length).toBe(25); expect(h).toMatch(/data-dim="focus" data-n="4" aria-pressed="true"/); expect(h).toContain('_tallennaD3'); expect(lue('lib/tm_d3_kortti.js')).not.toMatch(/#[0-9a-fA-F]{3,6}\b/);
  });
  it('§7.22: pelaaja-, vanhempi-, ADAR- ja Seura-sivut eivät lataa korttia; lib ei kirjoita Firestoreen', () => {
    ['TalentMaster_Pelaaja_v7.html', 'TalentMaster_Vanhempi_v2.html', 'TalentMaster_ADAR_Pikakortti.html'].forEach((f) => expect(lue(f), f).not.toContain('tm_d3_kortti'));
    expect(lue('lib/tm_d3_kortti.js')).not.toMatch(/\.collection\(|\.set\(|\.update\(|firebase/); expect(lue('TalentMaster_Kehitystyopoyta.html')).toMatch(/lib\/tm_d3_kortti\.js\?v=\d+/);
  });
  it('sivu: _avaaD3Arvio ei ole enää silta Masteriin; toimi d3_arvio kutsuu sitä; tallennus dual-write (tmSisainenKirjoita) vain kirjoitusoikeudella', () => {
    const S2 = lue('TalentMaster_Kehitystyopoyta.html');
    expect(S2).not.toMatch(/\['_avaaPelaajaraportti'[^\]]*'_avaaD3Arvio'/); expect(S2).toContain("if (avain === 'd3_arvio') return window._avaaD3Arvio(pid);");
    const t = pura(S2, 'window._tallennaD3 = async function'); expect(t).toContain('_voiKirjoittaa(p)'); expect(t).toContain('tmSisainenKirjoita(_db, _seuraId, pid, o)'); expect(t).toContain("toast(TT('d3k_virhe'))");
  });
});

describe.skipIf(!(process.env.TM_CHROME_TESTS !== '0' && CHROME))('K4e · Chrome: D3-kortti Profiilissa (lippu päällä)', () => {
  const D3P = Object.assign({}, PELAAJAT[1], { d3_viimeisin: { pisteet: pist({ resilience: [2, 4, 4], focus: [3, 4, null], inner_drive: [4, 3, null] }), pvm: '2026-10-12', lahteet: ['valmentaja', 'pelaaja'] } });
  const PEL = PELAAJAT.map((p) => (p.id === 'p2' ? D3P : p)), PEL_TYHJA = PELAAJAT;
  const KUVAT = join(JUORI(), 'docs', 'ui-kuvat', 'k4e');
  function JUORI() { return JUURI; }
  const SUODATA = (v) => v.filter((e) => !/sentry|integrity|Failed to load resource|net::ERR/i.test(e));
  const avaa = (selain, o) => kaynnista(selain, Object.assign({ rooli: 'valmentaja', hash: '#pelaaja/p2/profiili', pelaajat: PEL }, o || {}));
  const odota = async (p) => { await p.waitForSelector('[data-tc-kortti="d3"]', { timeout: 15000 }); };
  const auki = async (p) => { const d = p.locator('details.tc-k[data-tc-kortti="d3"]'); if (!(await d.evaluate((e) => e.open))) await d.locator('> summary').click(); };
  it('kortti näkyy Fyysisen jälkeen: 5 riviä, ⚠ sinnikkyydellä, lause + päivämäärä; "Päivitä arvio" → modaali → tallennus päivittää kortin ja kirjoittaa VAIN sisainen/tiedot:iin (PR 2a)', async () => {
    const selain = await selainKaynnista(); try {
      const { sk, p, virheet } = await avaa(selain); await odota(p); await auki(p);
      const avaimet = await p.$$eval('[data-tc-kortti]', (e) => e.map((x) => x.getAttribute('data-tc-kortti'))); if (avaimet.indexOf('fyysinen') >= 0) expect(avaimet.indexOf('d3')).toBe(avaimet.indexOf('fyysinen') + 1);
      const k = p.locator('[data-tc-kortti="d3"]'); expect(await k.locator('.tc-eb').first().innerText()).toBe('Psyykkinen (D3)'); expect(await k.locator('[data-d3-rivi]').count()).toBe(5);
      expect(await k.locator('[data-d3-rivi="resilience"] .tc-d3-varo').innerText()).toBe('⚠'); expect(await k.locator('[data-d3-rivi="focus"] .tc-d3-varo').innerText()).toBe('');
      expect(await k.locator('.tc-lause').innerText()).toContain('selvästi valmentajia matalammaksi'); expect(await k.innerText()).toContain('Arvioitu 12.10.2026');
      expect(await p.evaluate(() => document.documentElement.scrollWidth <= document.documentElement.clientWidth)).toBe(true);
      await k.locator('[data-tc-toiminto="d3_arvio"]').click(); await p.waitForSelector('#d3Modal .tc-d3m-n', { timeout: 5000 }); expect(await p.locator('#d3Modal .tc-d3m-n').count()).toBe(25);
      expect(await p.locator('#d3Modal [data-dim="resilience"][data-n="4"]').getAttribute('aria-pressed')).toBe('true');   // esivalinta = nykyinen valmentajan arvio
      await p.locator('#d3Modal [data-dim="resilience"][data-n="2"]').click(); await p.locator('#d3Modal .tc-d3m-tallenna').click();
      await p.waitForFunction(() => window.__kirj && window.__kirj.length > 0, null, { timeout: 8000 }); await p.waitForSelector('#d3Modal', { state: 'detached', timeout: 5000 });
      const kirj = await p.evaluate(() => window.__kirj), erat = await p.evaluate(() => window.__batch || []); expect(erat).toHaveLength(0);   // PR 2a: ei batchia (ei dual-writea)
      expect(kirj.map((x) => x.path)).toEqual(['seurat/demo/pelaajat/p2/sisainen/tiedot']);   // D3 VAIN sisainen/tiedot:iin; pelaajadokumenttiin ei kirjoiteta
      const sis = kirj[0].set; expect(sis.seuraId).toBe('demo'); expect(sis.d3_viimeisin.pisteet.resilience).toMatchObject({ valmentaja: 2, vp: 4, pelaaja: 2 }); expect(Object.keys(sis).sort()).toEqual(['d3_pvm', 'd3_taso', 'd3_varmuus', 'd3_viimeisin', 'paivitetty', 'seuraId']);
      await auki(p);
      expect(await p.locator('[data-tc-kortti="d3"] [data-d3-rivi="resilience"]').innerText()).toMatch(/2\s+2\s+4/);   // PEL 2 · VAL 2 (uusi) · VP 4
      expect(await p.locator('[data-tc-kortti="d3"] [data-d3-rivi="resilience"] .tc-d3-varo').innerText()).toBe('⚠');   // PEL 2 vs VP 4: ero 2
      expect(SUODATA(virheet)).toEqual([]); await sk.close();
    } finally { await selain.close(); }
  }, 120000);
  it('tyhjätila ("Ei vielä D3-arviota." + "Tee arvio") ja 390 px: ei vaakavieritystä', async () => {
    const selain = await selainKaynnista(); try {
      const { sk, p, virheet } = await avaa(selain, { pelaajat: PEL_TYHJA, leveys: 390 }); await odota(p); await auki(p);
      const k = p.locator('[data-tc-kortti="d3"]'); expect(await k.innerText()).toContain('Ei vielä D3-arviota.'); expect(await k.locator('[data-tc-toiminto="d3_arvio"]').innerText()).toBe('Tee arvio');
      expect(await p.evaluate(() => document.documentElement.scrollWidth <= document.documentElement.clientWidth)).toBe(true); expect(SUODATA(virheet)).toEqual([]); await sk.close();
    } finally { await selain.close(); }
  }, 120000);
  it('KUVAT 1280 vaalea + 390 tumma (TM_KUVAT=1)', async () => {
    if (!process.env.TM_KUVAT) return; mkdirSync(KUVAT, { recursive: true });
    const selain = await selainKaynnista(); try {
      for (const [leveys, teema] of [[1280, 'light'], [390, 'dark']]) {
        const { sk, p } = await avaa(selain, { leveys, teema, korkeus: 900 }); await odota(p); await p.waitForTimeout(800); await auki(p);
        await p.addStyleTag({ content: '#nvSide,[class*="nv-"],[id^="nv"]{display:none!important}.kt-ot{position:static!important}' });
        await p.locator('[data-tc-kortti="d3"]').screenshot({ path: join(KUVAT, 'd3-kortti-' + leveys + '-' + (teema === 'light' ? 'vaalea' : 'tumma') + '.png') });
        await p.locator('[data-tc-toiminto="d3_arvio"]').click(); await p.waitForSelector('#d3Modal .tc-d3m-n'); await p.screenshot({ path: join(KUVAT, 'd3-modaali-' + leveys + '-' + (teema === 'light' ? 'vaalea' : 'tumma') + '.png') });
        await sk.close();
      }
    } finally { await selain.close(); }
  }, 180000);
});
