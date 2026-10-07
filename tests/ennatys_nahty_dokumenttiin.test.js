/**
 * Ennätysjuhlan nähty-merkki pelaajadokumenttiin (Rules v3.45; ennätyskorjaus K3:n jälkeen). Ongelma: "Uusi oma ennätys" -ilmoitus toistui, koska nähty-merkki oli vain localStorage:ssa
 * (uusi laite, selain, yksityinen tila, tyhjentyvä PWA-muisti). Korjaus: p.ennatys_nahty { avain: 'YYYY-MM-DD' } + localStorage välimuistina.
 * Funktiot PURETAAN SIVULTA ja AJETAAN (vm). Rules-emulaattoritestit: tests/rules/firestore.rules.test.js ("v3.45 · ennatys_nahty").
 */
import { describe, it, expect } from 'vitest';
import { readFileSync } from 'fs';
import { createRequire } from 'module';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';
import vm from 'vm';
const require = createRequire(import.meta.url);
const juuri = join(dirname(fileURLToPath(import.meta.url)), '..');
const lue = (f) => readFileSync(join(juuri, f), 'utf8');
const LANG = require('../lib/tm_lang.js');
const P7 = lue('TalentMaster_Pelaaja_v7.html');
function pura(src, tunniste) { const i = src.indexOf(tunniste); if (i < 0) throw new Error('ei löydy: ' + tunniste); let d = 0; for (let k = src.indexOf('{', i); k < src.length; k++) { if (src[k] === '{') d++; else if (src[k] === '}' && !--d) return src.slice(i, k + 1); } throw new Error('ei sulkeva: ' + tunniste); }
class FieldPath { constructor(...segs) { this.segs = segs; } }
const PID = 'topias', SID = 'kpv';
const ENN = (lisa) => Object.assign({ lin30m: { paras: 4.0, pvm: '2026-10-03', alusta: 'tuntematon', edellinen: 5.9 } }, lisa);
function muistiLS(alku) { const m = Object.assign({}, alku || {}); return { m, getItem: (k) => (k in m ? m[k] : null), setItem: (k, v) => { m[k] = String(v); } }; }
function laite({ doc, ls = muistiLS(), db = true, demo = false, kirjoitusVirhe = false, lsEstetty = false } = {}) {
  const body = [], log = { updates: [], warn: [] };
  const el = () => ({ classList: { add() {}, remove() {} }, remove() {}, set innerHTML(v) { this._h = v; }, get innerHTML() { return this._h; } });
  const document = { getElementById: (id) => body.find((e) => e.id === id) || null, createElement: el, body: { appendChild: (e) => body.push(e) } };
  const node = (path) => ({ collection: (c) => node(path + '/' + c), doc: (d) => node(path + '/' + d), update: async (...args) => { log.updates.push({ path, args }); if (kirjoitusVirhe) throw Object.assign(new Error('x'), { code: 'permission-denied' }); } });
  const estetty = { getItem: () => { throw new Error('SecurityError'); }, setItem: () => { throw new Error('SecurityError'); } };
  const win = { _p7Pelaaja: { seuraId: SID, pelaajaId: PID }, _auth: null, TM_ENNATYKSET: require('../lib/tm_ennatykset.js') };
  if (db) win._db = { collection: (c) => node(c) };
  const ctx = { _pelaaja: JSON.parse(JSON.stringify(doc)), _isDemoUser: demo, window: win, document, localStorage: lsEstetty ? estetty : ls, requestAnimationFrame: (f) => f(), setTimeout: () => 0,
    JSON, Object, String, Number, Math, Promise, Array, console: { warn: (...a) => log.warn.push(a.join(' ')) }, _ENN_NAHTY_MAX: 190, t: LANG.t, firebase: { firestore: { FieldPath } } };
  vm.createContext(ctx);
  vm.runInContext(['function _thEsc(', 'function _kkEnnatysTiedot(', 'function _ennRivit(', 'function _ennUudetNakematta(', 'function _ennLuku(', 'function _ennArvoTxt(', 'function _ennNahtyYhdista(', 'function _ennNahtyPolku(', 'function _ennNahtyDokiin(', 'function _naytaUusiEnnatys('].map((x) => pura(P7, x)).join('\n')
    + '\nthis.nayta = _naytaUusiEnnatys; this.yhdista = _ennNahtyYhdista;', ctx);
  return { ctx, body, log, ls };
}
const virta = () => new Promise((r) => setTimeout(r, 0));
const kentat = (u) => u.args.filter((_, i) => i % 2 === 0).map((fp) => fp.segs.join('/'));
const arvot = (u) => u.args.filter((_, i) => i % 2 === 1);
const DOC = (lisa) => Object.assign({ id: PID, seuraId: SID, etunimi: 'Topias', ennatykset: ENN() }, lisa || {});

describe('_ennNahtyYhdista — kaksi lähdettä, myöhempi pvm voittaa', () => {
  it('dokumentti + välimuisti; huono data ohitetaan', () => {
    const f = laite({ doc: DOC() }).ctx.yhdista;
    expect(f({ a: '2026-10-01', b: '2026-09-01' }, { a: '2026-10-05', c: '2026-08-01T10:00:00Z' })).toEqual({ a: '2026-10-05', b: '2026-09-01', c: '2026-08-01' });
    expect(f(null, undefined)).toEqual({}); expect(f({ a: 5, b: '' }, 'x')).toEqual({});
  });
});

describe('Pelaaja_v7 · ennätysjuhla: nähty-merkki pelaajadokumentissa', () => {
  it('SAMA ENNÄTYS EI JUHLI TOISELLA LAITTEELLA: tyhjä localStorage, mutta dokumentissa on merkki → ei juhlaa eikä kirjoitusta', async () => {
    const e = laite({ doc: DOC({ ennatys_nahty: { lin30m: '2026-10-03' } }), ls: muistiLS() }); e.ctx.nayta(); await virta();
    expect(e.body).toHaveLength(0); expect(e.log.updates).toEqual([]);   // dokumentissa jo kaikki → ei turhaa kirjoitusta
  });
  it('ENSIMMÄINEN LAITE: juhlii kerran; kirjoittaa VAIN ennatys_nahty.<avain> = pvm (FieldPath) omaan dokumenttiin; localStorage-välimuisti päivittyy; toinen laite tuoreella dokumentilla ei juhli', async () => {
    const a = laite({ doc: DOC() }); a.ctx.nayta(); await virta();
    expect(a.body).toHaveLength(1); expect(a.body[0].innerHTML).toContain('30 m kiri 4.0 s');
    expect(a.log.updates).toHaveLength(1); const u = a.log.updates[0];
    expect(u.path).toBe('seurat/kpv/pelaajat/topias'); expect(kentat(u)).toEqual(['ennatys_nahty/lin30m']); expect(arvot(u)).toEqual(['2026-10-03']);
    expect(JSON.parse(a.ls.m['tm_ennatys_nahty_topias'])).toEqual({ lin30m: '2026-10-03' }); expect(a.ctx._pelaaja.ennatys_nahty).toEqual({ lin30m: '2026-10-03' });
    const b = laite({ doc: DOC({ ennatys_nahty: { lin30m: '2026-10-03' } }) }); b.ctx.nayta(); await virta(); expect(b.body).toHaveLength(0);
    const sama = laite({ doc: a.ctx._pelaaja, ls: a.ls }); sama.ctx.nayta(); expect(sama.body, 'sama laite uudelleen').toHaveLength(0);
  });
  it('uusi parannus juhlii kerran: kirjoitetaan vain uusi avain; vanha merkki ei juhli eikä kirjoiteta uudelleen', async () => {
    const doc = DOC({ ennatys_nahty: { lin30m: '2026-10-03', cmj: '2026-09-01' }, ennatykset: ENN({ lin30m: { paras: 3.9, pvm: '2026-11-01', alusta: 'tuntematon', edellinen: 4.0 }, cmj: { paras: 30, pvm: '2026-09-01', edellinen: 28 } }) });
    const e = laite({ doc }); e.ctx.nayta(); await virta();
    expect(e.body).toHaveLength(1); expect(e.body[0].innerHTML).toContain('30 m kiri 3.9 s'); expect(e.body[0].innerHTML).not.toContain('Kevennyshyppy');
    expect(e.log.updates).toHaveLength(1); expect(kentat(e.log.updates[0])).toEqual(['ennatys_nahty/lin30m']); expect(arvot(e.log.updates[0])).toEqual(['2026-11-01']);
    e.body.length = 0; e.ctx.nayta(); expect(e.body, 'sama istunto').toHaveLength(0);
  });
  it('SIIRTYMÄ: vanha localStorage-merkki viedään dokumenttiin ilman juhlaa (uusi laite ei sen jälkeen juhli)', async () => {
    const e = laite({ doc: DOC(), ls: muistiLS({ tm_ennatys_nahty_topias: JSON.stringify({ lin30m: '2026-10-03' }) }) }); e.ctx.nayta(); await virta();
    expect(e.body).toHaveLength(0); expect(e.log.updates).toHaveLength(1); expect(kentat(e.log.updates[0])).toEqual(['ennatys_nahty/lin30m']); expect(arvot(e.log.updates[0])).toEqual(['2026-10-03']);
  });
  it('1. mittaus (ei edellistä) → ei juhlaa, merkitään nähdyksi hiljaa myös dokumenttiin', async () => {
    const e = laite({ doc: DOC({ ennatykset: { lin30m: { paras: 5.9, pvm: '2026-09-01', alusta: 'tuntematon' } } }) }); e.ctx.nayta(); await virta();
    expect(e.body).toHaveLength(0); expect(kentat(e.log.updates[0])).toEqual(['ennatys_nahty/lin30m']); expect(arvot(e.log.updates[0])).toEqual(['2026-09-01']);
  });
  it('alustarivin avain (testi@alusta) toimii FieldPath:illa — avain säilyy yhtenä segmenttinä (ei pistenotaatiota), nähty-merkki per alustarivi', async () => {
    globalThis.TM_ALUSTA = require('../lib/tm_alusta.js');
    const E = require('../lib/tm_ennatykset.js'), MONDO = 'mondo_yleisurheilualusta', HALLI = 'sisahalli_puu';
    const r1 = E.paivitaEnnatykset({}, [{ testi: 'lin30m', arvo: 4.5, pvm: '2026-10-01', alusta: MONDO }]), r2 = E.paivitaEnnatykset(r1.ennatykset, [{ testi: 'lin30m', arvo: 4.2, pvm: '2026-10-05', alusta: HALLI }], null, r1.ennatykset_alustat);
    const e = laite({ doc: DOC({ ennatykset: r2.ennatykset, ennatykset_alustat: r2.ennatykset_alustat }) }); e.ctx.nayta(); await virta();
    expect(e.log.updates).toHaveLength(1); const k = kentat(e.log.updates[0]);
    expect(k.length).toBeGreaterThan(0); expect(k.every((x) => x.startsWith('ennatys_nahty/'))).toBe(true);
    expect(e.log.updates[0].args.filter((_, i) => i % 2 === 0).every((fp) => fp instanceof FieldPath && fp.segs.length === 2 && fp.segs[0] === 'ennatys_nahty')).toBe(true);
    expect(k.some((x) => x.includes('@'))).toBe(true);   // alustarivi: 'testi@alusta'
  });
  it('localStorage estetty: dokumentti kantaa merkin → juhlii kerran (ei toistu); ilman tietokantaa ei näytetä (vanha varmuus)', async () => {
    const a = laite({ doc: DOC(), lsEstetty: true }); expect(() => a.ctx.nayta()).not.toThrow(); await virta();
    expect(a.body).toHaveLength(1); expect(a.log.updates).toHaveLength(1);
    const b = laite({ doc: a.ctx._pelaaja, lsEstetty: true }); b.ctx.nayta(); expect(b.body, 'uusi yksityinen istunto').toHaveLength(0);
    const c = laite({ doc: DOC(), lsEstetty: true, db: false }); expect(() => c.ctx.nayta()).not.toThrow(); expect(c.body).toHaveLength(0);
  });
  it('kirjoitusvirhe ei kaada eikä estä juhlaa (best effort); virhe lokiin; seuraava avaus yrittää uudelleen (dokumentissa ei ole merkkiä)', async () => {
    const e = laite({ doc: DOC(), kirjoitusVirhe: true }); expect(() => e.ctx.nayta()).not.toThrow(); await virta(); await virta();
    expect(e.body).toHaveLength(1); expect(e.log.warn.some((w) => /nähty-merkki dokumenttiin/.test(w) && /permission-denied/.test(w))).toBe(true);
    const uusi = laite({ doc: DOC(), ls: e.ls, kirjoitusVirhe: false }); uusi.ctx.nayta(); await virta();   // dokumentti ilman merkkiä + välimuistissa merkki → siirtymä kirjoittaa, ei juhlaa
    expect(uusi.body).toHaveLength(0); expect(uusi.log.updates).toHaveLength(1);
  });
  it('demo-käyttäjä ja tervetulo-overlay: ei juhlaa eikä kirjoitusta', async () => {
    const d = laite({ doc: DOC(), demo: true }); d.ctx.nayta(); await virta(); expect(d.body).toHaveLength(0); expect(d.log.updates).toEqual([]);
    const t = laite({ doc: DOC() }); t.body.push({ id: 'tervetuloOv' }); t.ctx.nayta(); await virta(); expect(t.body).toHaveLength(1); expect(t.log.updates).toEqual([]);
  });
  it('ei kirjoitusta muuhun kuin ennatys_nahty-kenttään: lähteessä ei muita update-kohteita nähty-merkin polussa', () => {
    const blokki = P7.slice(P7.indexOf('function _ennNahtyDokiin('), P7.indexOf('window._suljeEnnatys'));
    expect(blokki).toMatch(/new firebase\.firestore\.FieldPath\('ennatys_nahty', k\)/); expect(blokki.match(/\.update\b/g) || []).toHaveLength(1); expect(blokki).not.toMatch(/\.set\(|collection\('kirjaukset'\)|jaksofokus|merge/);
  });
});
