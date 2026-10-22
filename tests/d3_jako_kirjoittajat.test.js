/* Vaihe 1 / PR 1d — D3-jako: kuka kirjoittaa mitä minne. Pelaaja_v7 kirjoittaa VAIN d3_itsearvio; Master ja VP kirjoittavat KAHTEEN paikkaan (sisainen/tiedot + vanha kenttä);
   pelaaja-/vanhempi-app ei lataa tm_sisainen.js:ää; vanha data ilman sisainen-dokumenttia toimii. Runtime-ajo vm-hiekkalaatikossa (ei pelkkä regex). */
import { describe, it, expect } from 'vitest';
import { readFileSync } from 'fs';
import { createRequire } from 'module';
import vm from 'vm';
const require = createRequire(import.meta.url);
const lue = (f) => readFileSync(new URL('../' + f, import.meta.url), 'utf8');
const P7 = lue('TalentMaster_Pelaaja_v7.html'), MA = lue('TalentMaster_Master_v16.html'), VP = lue('TalentMaster_VP_v25.html'), KT = lue('TalentMaster_Kehitystyopoyta.html');
const S = require('../lib/tm_sisainen.js'), D = require('../lib/tm_d3_itsearvio.js');

const ilmanKomm = (x) => x.replace(/\/\*[\s\S]*?\*\//g, '').replace(/\/\/.*$/gm, '');
function funktio(src, alku, loppu) { const a = src.indexOf(alku); expect(a, alku).toBeGreaterThan(-1); const b = src.indexOf(loppu, a); expect(b, loppu).toBeGreaterThan(a); return src.slice(a, b); }

/* Kirjoituksia tallentava db-tynkä (batch + yksittäinen set). */
function fakeDb() {
  const kirj = []; const ref = (p) => ({ _path: p, set: (d, o) => { kirj.push({ polku: p, data: d, opts: o }); return Promise.resolve(); }, collection: (c) => ({ doc: (id) => ref(p + '/' + c + '/' + id) }) });
  return { kirj, collection: (c) => ({ doc: (id) => ({ collection: (c2) => ({ doc: (id2) => ref(c + '/' + id + '/' + c2 + '/' + id2) }) }) }),
    batch: () => { const b = []; return { set: (r, d, o) => b.push({ polku: r._path, data: d, opts: o }), commit: () => { b.forEach((x) => kirj.push(x)); return Promise.resolve(); } }; } };
}

describe('Pelaaja_v7 — kirjoittaa VAIN d3_itsearvio', () => {
  const t = funktio(P7, 'async function _tallennaItsearvio()', 'window.rMinaItsearvio = rMinaItsearvio');
  it('lähde: kirjoitus kulkee tmD3ItsearvioKirjoitus-libin kautta; ei d3_viimeisin/d3_taso/d3_pvm/d3_varmuus -kirjoitusta', () => {
    expect(t).toContain('tmD3ItsearvioKirjoitus'); expect(ilmanKomm(t)).not.toMatch(/d3_viimeisin|d3_taso|d3_pvm|d3_varmuus|d3Varmuus|valmentaja/);
  });
  it('RUNTIME: tallennus kirjoittaa täsmälleen { d3_itsearvio } eikä sisällä valmentajan pisteitä, vaikka vanhassa datassa niitä on', async () => {
    const d = fakeDb(), ctx = { _minaD3: { inner_drive: 4, focus: 2 }, _pelaaja: { id: 'p1', seuraId: 'sjk', d3_viimeisin: { pisteet: { resilience: { pelaaja: 3, valmentaja: 5, avg: 4, vp: 1 } } }, d3_taso: 4.2 },
      _paivaIso: () => '2026-10-22', _p7JaksoAlkoi: () => '2026-09-01', alert: () => {}, T: (k) => k, draw: () => {}, TM_D3_ITSEARVIO: D, console, window: null };
    ctx.window = { _db: d, TM_D3_ITSEARVIO: D }; vm.createContext(ctx); vm.runInContext(t + '\n;this.f=_tallennaItsearvio;', ctx); await ctx.f();
    expect(d.kirj).toHaveLength(1); expect(d.kirj[0].polku).toBe('seurat/sjk/pelaajat/p1'); expect(Object.keys(d.kirj[0].data)).toEqual(['d3_itsearvio']);
    expect(d.kirj[0].data.d3_itsearvio).toEqual({ pisteet: { resilience: 3, inner_drive: 4, focus: 2 }, pvm: '2026-10-22', jakso_alkoi: '2026-09-01' });
    expect(JSON.stringify(d.kirj[0].data)).not.toMatch(/valmentaja|"vp"|avg/);
    expect(ctx._pelaaja.d3_taso).toBe(4.2);   // paikallista A-arvoa ei kosketa
  });
  it('§7.22 — itsearviolomake ja PSY-kortti lukevat vain pelaajan omaa (ei d3_taso, ei .valmentaja/.avg, ei vertailua)', () => {
    const lomake = funktio(P7, 'function rMinaItsearvio()', 'function _minaD3Valitse');
    expect(lomake).toContain('tmD3ItsearvioPisteet'); expect(ilmanKomm(lomake)).not.toMatch(/d3_viimeisin\.pisteet|\.valmentaja|\.avg/);
    const kortti = funktio(P7, 'function _fcKorttiData(p)', 'function naytaFcOverlay');
    expect(kortti).toContain('tmD3ItsearvioKa(p)'); expect(ilmanKomm(kortti)).not.toMatch(/d3_taso|d3_viimeisin/);
  });
  it('toimintopiste-merkki (iaDone) lukee vain omaa itsearviota', () => { expect(P7).toContain('Object.keys(window.TM_D3_ITSEARVIO.tmD3ItsearvioPisteet(p)).length > 0'); expect(P7).not.toMatch(/Object\.values\(p\.d3_viimeisin\.pisteet\)/); });
});

describe('pelaaja-/vanhempi-/rekisteröinti-/Solo-app EI lataa tm_sisainen.js:ää; Pelaaja lataa tm_d3_itsearvio.js:n', () => {
  for (const f of ['TalentMaster_Pelaaja_v7.html', 'TalentMaster_Vanhempi_v2.html', 'TalentMaster_Rekisterointi_Suostumus.html', 'TalentMaster_Solo_Koti.html', 'TalentMaster_Solo_Profiili.html', 'TalentMaster_Solo_Lupa.html', 'TalentMaster_Player_Home.html', 'sw_pelaaja.js', 'sw_vanhempi.js'])
    it(f, () => { expect(lue(f)).not.toMatch(/lib\/tm_sisainen\.js|TM_SISAINEN/); });
  it('Pelaaja_v7 lataa tm_d3_itsearvio.js ja SW-allowlist + cache-nosto sisältävät sen', () => {
    expect(P7).toMatch(/<script src="lib\/tm_d3_itsearvio\.js\?v=\d+"><\/script>/); const sw = lue('sw_pelaaja.js'); expect(sw).toContain('/lib/tm_d3_itsearvio.js'); expect(sw).toMatch(/const CACHE = 'tm-pelaaja-v15[2-9]|const CACHE = 'tm-pelaaja-v1[6-9]\d/);
  });
});

describe('staff-sivut: libit ladataan oikeassa järjestyksessä (d3 ennen sisainen); yhdistys latauksessa', () => {
  for (const [nimi, src] of [['Master', MA], ['VP', VP], ['Kehitystyöpöytä', KT]])
    it(nimi, () => {
      const a = src.indexOf('lib/tm_d3_itsearvio.js'), b = src.indexOf('lib/tm_sisainen.js'); expect(a).toBeGreaterThan(-1); expect(b).toBeGreaterThan(a);
      expect(src).toMatch(/lib\/tm_d3_itsearvio\.js\?v=\d+/); expect(src).toMatch(/lib\/tm_sisainen\.js\?v=\d+/); expect(src).toContain('tmSisainenLataaJaYhdista');
    });
});

describe('Master _tallennaD3 ja VP _tallennaVpD3 — DUAL-WRITE (sisainen/tiedot + vanha kenttä)', () => {
  const mSrc = funktio(MA, 'async function _tallennaD3(pid)', 'window._avaaD3Arvio = _avaaD3Arvio');
  const vSrc = funktio(VP, 'window._tallennaVpD3 = async function(pid)', 'function renderValmentajat()');
  it('lähde: ei suoraa pelaajadokumentin set({ d3_… }) -kirjoitusta, vaan tmSisainenKirjoita', () => {
    [mSrc, vSrc].forEach((s) => { expect(s).toContain('TM_SISAINEN.tmSisainenKirjoita'); expect(s).not.toMatch(/\.set\(\s*\{\s*d3_/); });
  });
  it('RUNTIME Master: kaksi paikkaa; payload sama; seuraId sisainen:ssä; valmentajan pisteet sisainen:ssä; pelaajan itsearvio (merge) mukana', async () => {
    const d = fakeDb(), p = { id: 'p1', d3_itsearvio: { pisteet: { focus: 5 }, pvm: '2026-10-20' }, d3_viimeisin: null };
    const ctx = { _pelaajatData: [p], _D3_DIMS: D.DIMS.map((k) => ({ key: k })), _d3Vastaukset: { focus: 3 }, toast: () => {}, masterT: (x) => x, _laskeD3Avg: D.tmD3Avg, tmPaivaIso: () => '2026-10-22', d3Varmuus: D.tmD3Varmuus,
      _db: d, _seuraId: 'sjk', window: { TM_SISAINEN: S }, _activePelaaja: null, _renderPinfoFirestore: () => {}, document: { getElementById: () => null }, console };
    vm.createContext(ctx); vm.runInContext(mSrc + '\n;this.f=_tallennaD3;', ctx);
    Object.assign(p, S.tmSisainenYhdista(p, null)); await ctx.f('p1');
    const polut = d.kirj.map((k) => k.polku); expect(polut).toEqual(['seurat/sjk/pelaajat/p1', 'seurat/sjk/pelaajat/p1/sisainen/tiedot']);
    const [vanha, uusi] = d.kirj.map((k) => k.data); expect(uusi.seuraId).toBe('sjk');
    ['d3_viimeisin', 'd3_taso', 'd3_pvm', 'd3_varmuus'].forEach((k) => expect(uusi[k]).toEqual(vanha[k]));
    expect(uusi.d3_viimeisin.pisteet.focus).toEqual({ valmentaja: 3, pelaaja: 5, avg: 4 }); expect(uusi.d3_varmuus).toBe('trianguloitu');
  });
  it('RUNTIME VP: d3_viimeisin + d3_vp_pvm molempiin; ei d3_taso/d3_varmuus; valmentajan ja pelaajan osat säilyvät', async () => {
    const d = fakeDb(), p = { id: 'p1', d3_viimeisin: { pisteet: { focus: { valmentaja: 3, pelaaja: 4, avg: 3.5 } }, lahteet: ['valmentaja', 'pelaaja'], pvm: '2026-10-01' } };
    const ctx = { _vpSeurantaOnJohto: () => true, _vpD3PelaajaById: () => p, D3_DIMS: D.DIMS.map((k) => ({ key: k })), _vpD3Vastaukset: { focus: 5 }, toast: () => {}, vpT: (x) => x, tmPaivaIso: () => '2026-10-22',
      db: d, _seuraId: 'sjk', TM_SISAINEN: S, document: { getElementById: () => null }, renderKotiVP: () => {}, window: {}, console };
    ctx.window = ctx; vm.createContext(ctx); vm.runInContext(vSrc.replace('window._tallennaVpD3 =', 'this.f =') , ctx);
    await ctx.f('p1');
    expect(d.kirj.map((k) => k.polku)).toEqual(['seurat/sjk/pelaajat/p1', 'seurat/sjk/pelaajat/p1/sisainen/tiedot']);
    const [vanha, uusi] = d.kirj.map((k) => k.data);
    expect(Object.keys(vanha).sort()).toEqual(['d3_viimeisin', 'd3_vp_pvm']); expect(Object.keys(uusi).sort()).toEqual(['d3_viimeisin', 'd3_vp_pvm', 'paivitetty', 'seuraId']);
    expect(uusi.d3_viimeisin.pisteet.focus).toEqual({ valmentaja: 3, pelaaja: 4, avg: 3.5, vp: 5 });
  });
});

describe('vanha data ilman sisainen-dokumenttia toimii (vanha Master / ennen migraatiota)', () => {
  it('yhdistys ilman sisainen:ä palauttaa vanhan pelaajakentän; staff-lukijat (kuilu, itsearvio-ehdotus) saavat saman datan kuin ennen', () => {
    const p = { id: 'p', d3_viimeisin: { pisteet: { focus: { valmentaja: 2, vp: 5, pelaaja: 2 } }, pvm: '2026-10-10' }, d3_taso: 2, d3_varmuus: 'trianguloitu' };
    expect(S.tmSisainenYhdista(p, null)).toEqual(p);
  });
  it('ilman tm_d3_itsearvio.js:ää (vanha sivu) yhdistys ei kaadu', () => {
    const src = readFileSync(new URL('../lib/tm_sisainen.js', import.meta.url), 'utf8'); const ctx = { window: {}, console }; vm.createContext(ctx);
    vm.runInContext(src.replace(/require\('\.\/tm_d3_itsearvio\.js'\)/, 'null'), ctx); const m = ctx.window.TM_SISAINEN;
    expect(m.tmSisainenYhdista({ id: 'p', d3_taso: 1 }, { d3_taso: 4 }).d3_taso).toBe(4);
  });
});
