/**
 * Sukupuoli pelaajadokumenttiin (KPV 7.10.2026: 126/126 ilman, Seura-tuonti ei kirjoittanut): lib, Seura-tuonti, Excel_Tuonti (historiapohja), backfill-skriptin päättely. CLAUDE.md §7.12: "M"/"N".
 */
import { describe, it, expect } from 'vitest';
import { readFileSync } from 'fs';
import { createRequire } from 'module';
import { lataaSivu } from './helpers/sivu_ajuri.mjs';
const require = createRequire(import.meta.url);
const S = require('../lib/tm_sukupuoli.js');
const lue = (f) => readFileSync(new URL('../' + f, import.meta.url), 'utf8');

describe('lib/tm_sukupuoli.js', () => {
  it('P/M/poika → M; T/N/tyttö → N (kirjainkoko, ääkköset, välilyönnit); tunnistamaton/tyhjä → null (EI oletusta)', () => {
    for (const v of ['P', 'p', 'M', ' m ', 'poika', 'Pojat', 'mies']) expect(S.tmSukupuoliMN(v), String(v)).toBe('M');
    for (const v of ['T', 't', 'N', 'tyttö', 'TYTTÖ', 'Tytöt', 'nainen']) expect(S.tmSukupuoliMN(v), String(v)).toBe('N');
    for (const v of ['', '  ', null, undefined, 'x', 'muu', 'PT', 1, 'MN']) expect(S.tmSukupuoliMN(v), String(v)).toBeNull();
  });
  it('päättely testituloksista: yksimielinen → M/N; ristiriita → null + syy; ei tuloksia → null; tunnistamattomat ohitetaan', () => {
    expect(S.tmSukupuoliTuloksista(['N', 'N', 'T'])).toMatchObject({ sukupuoli: 'N', syy: 'ok', N: 3 }); expect(S.tmSukupuoliTuloksista(['M', 'P', undefined, ''])).toMatchObject({ sukupuoli: 'M', syy: 'ok' });
    expect(S.tmSukupuoliTuloksista(['M', 'N'])).toMatchObject({ sukupuoli: null, syy: 'ristiriita', M: 1, N: 1 }); expect(S.tmSukupuoliTuloksista(['P', 'T', 'T'])).toMatchObject({ sukupuoli: null, syy: 'ristiriita' });
    for (const a of [[], [null, '', 'x'], undefined]) expect(S.tmSukupuoliTuloksista(a)).toMatchObject({ sukupuoli: null, syy: 'ei_tuloksia' });
  });
});

function seuraYmp(rivit) {
  const set = []; const el = () => ({ style: {}, classList: { add() {}, remove() {} }, appendChild() {}, querySelector: () => null, set textContent(v) {}, disabled: false });
  const kok = () => { const mk = () => ({ doc: mk, collection: mk, where: mk, limit: mk, get: async () => ({ empty: true, docs: [], size: 0 }), set: async (d) => { set.push(d); }, id: 'id' }); return mk(); };
  const c = lataaSivu('TalentMaster_Seura.html', { auth: { currentUser: { uid: 'u1' } }, db: { collection: () => kok() }, tila: { seuraId: 'kpv', seuraNimi: 'KPV', seuraKieli: 'fi', rooli: 'vp', kayttaja: { uid: 'u1' } }, toast() {}, URL, setTimeout: (f) => { f(); return 0; }, firebase: { firestore: { FieldValue: { serverTimestamp: () => 'TS', arrayUnion: (...a) => a } } } });
  c._excelData = rivit; c.document = Object.assign({}, c.document, { getElementById: () => el(), createElement: () => ({ style: {}, classList: { add() {}, remove() {} }, remove() {}, appendChild() {}, setAttribute() {}, set innerHTML(v) {} }), body: { appendChild() {}, style: {} } });
  return { c, set };
}
describe('Seura.ajaExcelTuonti kirjoittaa sukupuolen (M/N), puuttuva → ei kenttää', () => {
  const R = (n, sukupuoli) => ({ etunimi: n, sukunimi: 'X', syntymaVuosi: 2013, joukkue: 'KPV U13', palloId: null, huoltajaEmail: 'a@b.fi', sukupuoli });
  it('M ja N kirjoitetaan pelaajadokumenttiin; null/undefined → kenttää EI ole (ei oletusta)', async () => {
    const e = seuraYmp([R('Poika', 'M'), R('Tytto', 'N'), R('Tuntematon', null), R('Puuttuu', undefined)]); await e.c.ajaExcelTuonti(false);
    const by = Object.fromEntries(e.set.filter((d) => d.etunimi).map((d) => [d.etunimi, d])); expect(by.Poika.sukupuoli).toBe('M'); expect(by.Tytto.sukupuoli).toBe('N'); expect('sukupuoli' in by.Tuntematon).toBe(false); expect('sukupuoli' in by.Puuttuu).toBe(false);
  });
  it('Excel-parsinta: sarake Sukupuoli luetaan etsiSarake-haulla ja muunnetaan tmSukupuoliMN:llä; skripti ladataan', () => {
    const src = lue('TalentMaster_Seura.html'); expect(src).toContain("const iSukup    = etsiSarake('Sukupuoli', 'sukupuoli');"); expect(src).toContain('sukupuoli:     iSukup >= 0 ? TM_SUKUPUOLI.tmSukupuoliMN(r[iSukup]) : null,'); expect(src).toContain('<script src="lib/tm_sukupuoli.js?v=1"></script>');
  });
});

describe('Excel_Tuonti (historiapohja): sukupuoli testituloksesta pelaajadokumenttiin samassa batchissa, ei ylikirjoitusta', () => {
  it('profiiliUpdate.sukupuoli vain kun rivillä on tunnistettava sukupuoli JA pelaajadokista puuttuu; sama batch.set(pelaajaRef, profiiliUpdate)', () => {
    const src = lue('TalentMaster_Excel_Tuonti.html'), i = src.indexOf('const _spR = TM_SUKUPUOLI.tmSukupuoliMN(p.sukupuoli)'); expect(i).toBeGreaterThan(0);
    const rivi = src.slice(i, src.indexOf('\n', i)); expect(rivi).toContain("if (_spR && !TM_SUKUPUOLI.tmSukupuoliMN(p._firestoreData && p._firestoreData.sukupuoli)) profiiliUpdate.sukupuoli = _spR;");
    expect(src.indexOf('batch.set(pelaajaRef, profiiliUpdate, { merge: true })')).toBeGreaterThan(i); expect(src.indexOf('if (p._loytyyFirestoresta === true) {')).toBeLessThan(i);   // vain kun PalloID löytyi
    expect(src).toContain('<script src="lib/tm_sukupuoli.js?v=1"></script>');
  });
  it('päättelylogiikka (sama kuin rivillä): ei kirjoiteta jos dokissa jo on; kirjoitetaan jos puuttuu', () => {
    const paivita = (rivi, fd) => { const u = {}; const sp = S.tmSukupuoliMN(rivi); if (sp && !S.tmSukupuoliMN(fd && fd.sukupuoli)) u.sukupuoli = sp; return u; };
    expect(paivita('T', {})).toEqual({ sukupuoli: 'N' }); expect(paivita('P', undefined)).toEqual({ sukupuoli: 'M' }); expect(paivita('T', { sukupuoli: 'M' })).toEqual({}); expect(paivita('', {})).toEqual({}); expect(paivita('?', {})).toEqual({});
  });
});

describe('scripts/backfill_sukupuoli.js (Tero ajaa): dry-run oletus, vain yksimielinen, ei ylikirjoita', () => {
  const src = lue('scripts/backfill_sukupuoli.js');
  it('dry-run oletuksena (--apply vaaditaan kirjoitukseen), käyttää libin päättelyä, ristiriidat ja tyhjät listataan, kirjoitus tarkistaa puuttumisen uudelleen, ADC', () => {
    expect(src).toContain("const SEURA = arg('seura') || 'kpv', APPLY = argv.includes('--apply');"); expect(src).toContain('if (!APPLY) {');  expect(src).toContain('tmSukupuoliSuunnitelma(syote)'); expect(src).toContain("if (s === 'M' || s === 'N') { ohitettu++; continue; }");
    expect(src).toContain('admin.applicationDefault()'); expect(src).not.toMatch(/serviceAccount|\.json'\)/); expect(src.indexOf('batch.update(')).toBeGreaterThan(src.indexOf('if (!APPLY)'));
  });
});

/* ── Selaimen SA-nappi: ydin lib/tm_sukupuoli.js:ssä (sama kuin skripti) ── */
import vm from 'vm';
function funktio(src, alku) { const i = src.indexOf(alku); if (i < 0) throw new Error('ei löydy ' + alku); let d = 0; for (let j = src.indexOf('{', i); j < src.length; j++) { if (src[j] === '{') d++; else if (src[j] === '}') { d--; if (d === 0) return src.slice(i, j + 1); } } throw new Error('ei päättynyt'); }
const PEL = [
  { id: 'a', nimi: 'Aino A', sukupuoli: undefined, tulokset: ['N', 'T', 'N'] }, { id: 'b', nimi: 'Eero B', tulokset: ['M'] }, { id: 'c', nimi: 'Risti C', tulokset: ['M', 'N'] },
  { id: 'd', nimi: 'Tyhjä D', tulokset: [] }, { id: 'e', nimi: 'Valmis E', sukupuoli: 'M', tulokset: ['N'] }, { id: 'f', nimi: 'Epäselvä F', tulokset: ['?', ''] }
];
describe('tmSukupuoliSuunnitelma + raportti (jaettu ydin)', () => {
  it('kirjoita vain puuttuville ja yksimielisille; jo asetettua ei kosketa (vaikka tulokset ovat eri mieltä); ristiriidat + ilman tuloksia nimillä', () => {
    const s = S.tmSukupuoliSuunnitelma(PEL); expect(s).toMatchObject({ yht: 6, jo: 1 }); expect(s.kirjoita.map((k) => [k.id, k.sukupuoli])).toEqual([['a', 'N'], ['b', 'M']]);
    expect(s.ristiriidat).toEqual([{ id: 'c', nimi: 'Risti C', M: 1, N: 1 }]); expect(s.eiTuloksia.map((x) => x.nimi)).toEqual(['Tyhjä D', 'Epäselvä F']);
    const r = S.tmSukupuoliRaportti(s); expect(r).toContain('Kirjoitettaisiin: 2 (M 1, N 1)'); expect(r).toContain('Risti C (M:1 N:1)'); expect(r).toContain('· Tyhjä D'); expect(r).toContain('· Epäselvä F');
    expect(S.tmSukupuoliSuunnitelma(undefined)).toMatchObject({ yht: 0, kirjoita: [] });
  });
  it('lopputulosraportti: kirjoitettu / ohitettu / pysähdys', () => {
    const s = S.tmSukupuoliSuunnitelma(PEL); const r = S.tmSukupuoliRaportti(s, { kirjoitettu: 1, ohitettu: 1, seis: { syy: 'permission-denied' } });
    expect(r).toContain('KIRJOITETTU: 1 · OHITETTU (asetettu välillä): 1'); expect(r).toContain('PYSÄHDYS: permission-denied'); expect(S.tmSukupuoliRaportti(s, { kirjoitettu: 2, ohitettu: 0, seis: null })).not.toContain('PYSÄHDYS');
  });
});
describe('tmSukupuoliKirjoita: erät, ohitus, pysähtyy ensimmäiseen oikeusvirheeseen (#874-malli)', () => {
  const lista = (n) => Array.from({ length: n }, (_, i) => ({ id: 'p' + i, sukupuoli: i % 2 ? 'N' : 'M' }));
  const io = (o = {}) => { const log = { erat: [], tarkistettu: 0 }; return { log, io: { ASETETTU: async (id) => (o.asetettu || []).includes(id), ERA: async (era) => { if (o.kaada && log.erat.length + 1 === o.kaada) throw Object.assign(new Error('x'), { code: 'permission-denied' }); log.erat.push(era.map((p) => p.id)); }, SEIS: (e) => { log.tarkistettu++; if (o.eiKayttajaa && log.erat.length >= o.eiKayttajaa && !e) return { syy: 'ei_kirjautunut' }; return e && e.code === 'permission-denied' ? { syy: 'permission-denied' } : null; } } }; };
  it('kaikki kirjoitetaan 200 erissä; ohitetaan jo asetetut (tarkistus ennen kirjoitusta)', async () => {
    const a = io({ asetettu: ['p1'] }); const t = await S.tmSukupuoliKirjoita(lista(450), a.io); expect(t).toEqual({ kirjoitettu: 449, ohitettu: 1, seis: null }); expect(a.log.erat.map((e) => e.length)).toEqual([199, 200, 50]); expect(a.log.erat.flat()).not.toContain('p1');
  });
  it('permission-denied toisessa erässä → pysähtyy, ei kolmatta erää, raportoi montako ehti', async () => {
    const a = io({ kaada: 2 }); const t = await S.tmSukupuoliKirjoita(lista(450), a.io); expect(t).toEqual({ kirjoitettu: 200, ohitettu: 0, seis: { syy: 'permission-denied' } }); expect(a.log.erat).toHaveLength(1);
  });
  it('currentUser null ennen seuraavaa erää → pysähtyy ennen kirjoitusta; muu virhe heitetään (ei hiljaa)', async () => {
    const a = io({ eiKayttajaa: 1 }); expect(await S.tmSukupuoliKirjoita(lista(450), a.io)).toEqual({ kirjoitettu: 200, ohitettu: 0, seis: { syy: 'ei_kirjautunut' } });
    const muu = { ASETETTU: async () => false, ERA: async () => { throw Object.assign(new Error('verkko'), { code: 'unavailable' }); }, SEIS: () => null }; await expect(S.tmSukupuoliKirjoita(lista(3), muu)).rejects.toThrow('verkko');
    expect(await S.tmSukupuoliKirjoita([], io().io)).toEqual({ kirjoitettu: 0, ohitettu: 0, seis: null });
  });
});
describe('Excel_Tuonti: SA-nappi "Täydennä sukupuoli testituloksista" (sivun oikea koodi vm:ssä)', () => {
  const src = lue('TalentMaster_Excel_Tuonti.html');
  function aja({ pelaajat, kirjoitusOk = true, vahvista = true, kaada = false }) {
    const kirj = { batch: [], updates: [], modalit: [], toast: [] };
    const doc = (id) => ({ get: async () => ({ exists: !!pelaajat[id], data: () => pelaajat[id] || {} }), update: null, collection: () => ({ get: async () => ({ docs: (pelaajat[id].__tulokset || []).map((x) => ({ data: () => ({ sukupuoli: x }) })) }) }), id });
    const pelCol = Object.assign((id) => doc(id), { get: async () => ({ docs: Object.keys(pelaajat).map((id) => ({ id, data: () => pelaajat[id] })) }), doc });
    const db = { collection: () => ({ doc: () => ({ collection: () => ({ get: pelCol.get, doc: pelCol.doc }) }) }), batch: () => { const ops = []; return { update: (r, d) => ops.push([r.id, d]), commit: async () => { if (kaada) throw Object.assign(new Error('x'), { code: 'permission-denied' }); kirj.batch.push(ops); } }; } };
    let kerta = 0;
    const sb = { superAdmin: true, seuraId: 'kpv', seuraNimi: 'KPV', db, TM_SUKUPUOLI: S, TM_ISTUNTO: require('../lib/tm_istunto.js'), firebase: { auth: () => ({ currentUser: { uid: 'u' } }) }, document: { getElementById: () => null }, console: { error() {} }, Promise, Object, Array, Math,
      toast: (t, k) => kirj.toast.push([t, k]), _sukupuoliRaporttiModal: async (o, t, nappi) => { kirj.modalit.push([o, t, nappi]); kerta++; return kerta === 1 ? vahvista : false; } };
    vm.createContext(sb); vm.runInContext(funktio(src, 'async function _adminTaydennaSukupuoli()') + '\nthis.__f=_adminTaydennaSukupuoli;', sb);
    return { sb, kirj };
  }
  const P = () => ({ a: { etunimi: 'Aino', sukunimi: 'A', __tulokset: ['N', 'N'] }, b: { etunimi: 'Eero', sukunimi: 'B', __tulokset: ['M'] }, c: { etunimi: 'Risti', sukunimi: 'C', __tulokset: ['M', 'N'] }, d: { etunimi: 'Tyhjä', sukunimi: 'D', __tulokset: [] }, e: { etunimi: 'Valmis', sukunimi: 'E', sukupuoli: 'M', __tulokset: ['N'] } });
  it('kuiva-ajo näyttää luvut + ristiriidat + tyhjät NIMILLÄ ja "Kirjoita 2 pelaajalle"; vahvistus → vain sukupuoli-kenttä puuttuville yksimielisille; raportti lopuksi', async () => {
    const e = aja({ pelaajat: P() }); await e.sb.__f();
    const [o1, t1, n1] = e.kirj.modalit[0]; expect(o1).toContain('KUIVA-AJO'); expect(t1).toContain('Kirjoitettaisiin: 2'); expect(t1).toContain('Risti C'); expect(t1).toContain('Tyhjä D'); expect(n1).toBe('Kirjoita 2 pelaajalle');
    expect(e.kirj.batch).toHaveLength(1); expect(e.kirj.batch[0]).toEqual([['a', { sukupuoli: 'N' }], ['b', { sukupuoli: 'M' }]]);   // VAIN sukupuoli; c, d, e ei kosketa
    const [o2, t2] = e.kirj.modalit[1]; expect(o2).toContain('RAPORTTI'); expect(t2).toContain('KIRJOITETTU: 2 · OHITETTU (asetettu välillä): 0'); expect(e.kirj.toast.at(-1)).toEqual(['Sukupuoli täydennetty: 2 pelaajalle', 'ok']);
  });
  it('Peruuta kuiva-ajon jälkeen → EI kirjoitusta; ei kirjoitettavaa → ei Kirjoita-nappia', async () => {
    const e = aja({ pelaajat: P(), vahvista: false }); await e.sb.__f(); expect(e.kirj.batch).toEqual([]); expect(e.kirj.modalit).toHaveLength(1);
    const tyhja = aja({ pelaajat: { x: { etunimi: 'X', sukunimi: 'Y', sukupuoli: 'N', __tulokset: [] } } }); await tyhja.sb.__f(); expect(tyhja.kirj.modalit[0][2]).toBeNull(); expect(tyhja.kirj.batch).toEqual([]);
  });
  it('permission-denied kirjoituksessa → pysähtyy, raportti kertoo pysäytyksen, toast virheenä', async () => {
    const e = aja({ pelaajat: P(), kaada: true }); await e.sb.__f(); expect(e.kirj.modalit[1][1]).toContain('PYSÄHDYS: permission-denied'); expect(e.kirj.toast.at(-1)[1]).toBe('err');
  });
  it('lähdevartijat: nappi vain SA:lle recalc-nappien vieressä; skripti käyttää samaa ydintä', () => {
    expect(src).toContain("sbtn.id = 'sa-sukupuoli'"); expect(src.indexOf("sbtn.id = 'sa-sukupuoli'")).toBeGreaterThan(src.indexOf("rbtn2.id = 'sa-recalc-ika'")); expect(src).toContain('sbtn.onclick = _adminTaydennaSukupuoli;'); expect(funktio(src, 'async function _adminTaydennaSukupuoli()')).toContain("if (!superAdmin) { toast('Vain Super Admin', 'err'); return; }");
    expect(lue('scripts/backfill_sukupuoli.js')).toContain('tmSukupuoliSuunnitelma(syote)'); expect(lue('scripts/backfill_sukupuoli.js')).not.toContain('tmSukupuoliTuloksista(');
  });
});
