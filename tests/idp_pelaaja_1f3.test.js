/* Vaihe 1 / PR 1f-3 — Pelaaja_v7 (P7): tavoitteen lataus (dual-read seuraa lippua) + sitoumuksen kirjoitus (idp_kausi + idp_pelaaja).
   OIKEA sivukoodi vm-hiekkalaatikossa + muistinvarainen Firestore. Lippu pois = täsmälleen vanha käytös, ei lisäkyselyä. */
import { describe, it, expect, afterEach } from 'vitest';
import { readFileSync } from 'fs';
import { createRequire } from 'module';
import vm from 'vm';
import { fakeDb } from './_fakeFirestore.mjs';
const require = createRequire(import.meta.url);
const lue = (f) => readFileSync(new URL('../' + f, import.meta.url), 'utf8');
const D = require('../lib/tm_idp_pelaaja_dok.js'), I = require('../lib/tm_idp.js');
const SRC = lue('TalentMaster_Pelaaja_v7.html');
afterEach(() => { D.LIPPU.kirjoitus = false; });
const PK = 'seurat/s1/pelaajat/p1', VUOSI = '2027';
const viipale = (a) => { const i = SRC.indexOf(a); if (i < 0) throw new Error('puuttuu: ' + a); return SRC.slice(i, SRC.indexOf('\n}\n', i) + 3); };
const T = (o) => Object.assign({ status: 'aktiivinen', luotu: 'A', fokus: { nimi: 'Kiihdytys' }, tavoitearvo: 1.9, lahto: { arvo: 2.1 }, perustelu: { teksti: 'taso 2/5', pelilause: 'Pelissä tarvitaan' }, pelaajan_tavoite: 'Juoksen nopeammin' }, o || {});

function ymp(db) {
  const win = { _db: db, TM_IDP_PELAAJA_DOK: D, _auth: null, _p7Tavoite: null, _p7Sitoumus: null };
  const c = Object.assign({}, I, { console, Promise, JSON, Object, Array, String, Date, Number, Error, window: win, _ladattu: { idp: false }, _pelaaja: { id: 'p1', seuraId: 's1' }, idpKausivuosi: () => VUOSI,
    _tab: 'x', _sc: 'main', draw() {}, localStorage: { setItem() {} }, alert() {}, T: (x) => x, document: { getElementById: () => null },
    _p7SitoumusRekisteri: () => ({ rekisteri: 'a' }), _p7FokusNimi: () => 'Kiihdytys', _p7JaksoAlkoi: () => '2027-01-01', _p7Vanhentunut: () => false, _p7Tavoite: null });
  vm.createContext(c);
  vm.runInContext(viipale('async function _p7LataaTavoite') + viipale('async function _tallennaSitoumus') + '\nthis.lataa = _p7LataaTavoite; this.sit = _tallennaSitoumus;', c);
  return { c, win };
}
function laskuri(db) { const lue = []; const alku = db.collection; db.collection = (p) => { const r = alku(p); return r; }; return lue; }

describe('P7 _p7LataaTavoite', () => {
  it('lippu pois (peruutus): lukee vain idp_kausi (ei idp_pelaaja-kyselyä); raaka tavoite kuten ennen', async () => {
    D.LIPPU.kirjoitus = false;
    const { db } = fakeDb({ [PK + '/idp_kausi/' + VUOSI]: { tavoitteet: [T()], pelaaja_sitoumus: { s: 'kausi' } }, [PK + '/idp_pelaaja/' + VUOSI]: { tavoitteet: [T({ pelaajan_tavoite: 'EI' })] } });
    const luetut = []; const alku = db.collection; db.collection = (p) => { const r = alku(p); const cd = r.doc; r.doc = (id) => { const d = cd(id); const g = d.get; d.get = () => { luetut.push(p + '/' + id); return g(); }; return d; }; return r; };
    const { c, win } = ymp(db); await c.lataa();
    expect(win._p7Tavoite.pelaajan_tavoite).toBe('Juoksen nopeammin'); expect(win._p7Sitoumus).toEqual({ s: 'kausi' });
    expect(luetut.join()).not.toMatch(/idp_pelaaja/);
  });
  it('lippu päällä: idp_pelaaja voittaa (puhdistettu, ei lukuja) ja sitoumus sieltä', async () => {
    D.LIPPU.kirjoitus = true;
    const puhdas = D.tmIdpPelaajaTavoitteet([T({ pelaajan_tavoite: 'Puhdas' })]);
    const { db } = fakeDb({ [PK + '/idp_kausi/' + VUOSI]: { tavoitteet: [T()], pelaaja_sitoumus: { s: 'kausi' } }, [PK + '/idp_pelaaja/' + VUOSI]: { tavoitteet: puhdas, pelaaja_sitoumus: { s: 'pelaaja' } } });
    const { c, win } = ymp(db); await c.lataa();
    expect(win._p7Tavoite.pelaajan_tavoite).toBe('Puhdas'); expect(win._p7Tavoite.tavoitearvo).toBeUndefined(); expect(win._p7Tavoite.lahto).toBeUndefined(); expect(win._p7Sitoumus).toEqual({ s: 'pelaaja' });
  });
  it('lippu päällä, idp_pelaaja puuttuu → varalle idp_kausi; lukuvirhe idp_pelaaja:sta → idp_kausi', async () => {
    D.LIPPU.kirjoitus = true;
    const { db } = fakeDb({ [PK + '/idp_kausi/' + VUOSI]: { tavoitteet: [T()] } });
    const { c, win } = ymp(db); await c.lataa(); expect(win._p7Tavoite.pelaajan_tavoite).toBe('Juoksen nopeammin');
    const { db: db2 } = fakeDb({ [PK + '/idp_kausi/' + VUOSI]: { tavoitteet: [T()] } }); const alku = db2.collection;
    db2.collection = (p) => { const r = alku(p); if (/idp_pelaaja$/.test(p)) r.doc = () => ({ get: async () => { throw Object.assign(new Error('x'), { code: 'permission-denied' }); } }); return r; };
    const k = ymp(db2); await k.c.lataa(); expect(k.win._p7Tavoite.pelaajan_tavoite).toBe('Juoksen nopeammin');
  });
  it('vuodenvaihde lippu päällä: kuluvassa vuodessa ei voimassa olevaa → edellisen vuoden idp_pelaaja', async () => {
    D.LIPPU.kirjoitus = true;
    const { db } = fakeDb({ [PK + '/idp_pelaaja/2026']: { tavoitteet: D.tmIdpPelaajaTavoitteet([T({ pelaajan_tavoite: 'Viime' })]) } });
    const { c, win } = ymp(db); await c.lataa(); expect(win._p7Tavoite.pelaajan_tavoite).toBe('Viime');
  });
});

describe('P7 _tallennaSitoumus', () => {
  it('lippu pois (peruutus): vain idp_kausi (kuten ennen), ei idp_pelaaja:a', async () => {
    D.LIPPU.kirjoitus = false;
    const { db, D: docs } = fakeDb({ [PK]: {} }); const { c } = ymp(db); await c.sit();
    expect(docs.get(PK + '/idp_kausi/' + VUOSI).pelaaja_sitoumus.rekisteri).toBe('a'); expect([...docs.keys()].some((k) => /idp_pelaaja/.test(k))).toBe(false);
  });
  it('lippu päällä: idp_kausi + idp_pelaaja samassa batchissa; idp_pelaaja:n tavoitteet säilyvät', async () => {
    D.LIPPU.kirjoitus = true;
    const { db, D: docs, loki } = fakeDb({ [PK]: {}, [PK + '/idp_pelaaja/' + VUOSI]: { tavoitteet: [{ status: 'aktiivinen' }] } }); const { c } = ymp(db); await c.sit();
    expect(docs.get(PK + '/idp_kausi/' + VUOSI).pelaaja_sitoumus.rekisteri).toBe('a'); const p = docs.get(PK + '/idp_pelaaja/' + VUOSI);
    expect(p.pelaaja_sitoumus.rekisteri).toBe('a'); expect(p.tavoitteet).toEqual([{ status: 'aktiivinen' }]); expect(loki.commits).toBe(1);
  });
  it('lippu päällä, Rules v3.71 puuttuu (permission-denied batchissa) → sitoumus tallentuu idp_kausi:in', async () => {
    D.LIPPU.kirjoitus = true; const { db, D: docs } = fakeDb({ [PK]: {} }); const alkuB = db.batch; let n = 0;
    db.batch = () => { const b = alkuB(); const c0 = b.commit; b.commit = async () => { if (n++ === 0) throw Object.assign(new Error('x'), { code: 'permission-denied' }); return c0(); }; return b; };
    const { c } = ymp(db); await c.sit(); expect(docs.get(PK + '/idp_kausi/' + VUOSI).pelaaja_sitoumus.rekisteri).toBe('a');
  });
});

describe('kytkentä', () => {
  it('P7 lataa dok-libin ennen käyttöä; SW allowlist + cache-bumppi; Vanhempi ei kosketa', () => {
    const h = SRC; expect(h).toMatch(/tm_idp_pelaaja_dok\.js\?v=\d+"/); expect(h).toMatch(/tm_idp_pelaaja_dok\.js\?v=\d+"><\/script>[^\n]*\n<script src="lib\/tm_idp_pelaaja\.js/);
    const sw = lue('sw_pelaaja.js'); expect(sw).toContain("/lib/tm_idp_pelaaja_dok.js"); expect(sw).toContain("tm-pelaaja-v158");
    expect(lue('TalentMaster_Vanhempi_v2.html')).not.toContain('idp_pelaaja');
  });
});
