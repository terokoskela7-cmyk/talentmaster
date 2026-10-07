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
    expect(src).toContain("const SEURA = arg('seura') || 'kpv', APPLY = argv.includes('--apply');"); expect(src).toContain('if (!APPLY) {'); expect(src).toContain('tmSukupuoliTuloksista('); expect(src).toContain("x.syy === 'ristiriita'"); expect(src).toContain("if (s === 'M' || s === 'N') { ohitettu++; continue; }");
    expect(src).toContain('admin.applicationDefault()'); expect(src).not.toMatch(/serviceAccount|\.json'\)/); expect(src.indexOf('batch.update(')).toBeGreaterThan(src.indexOf('if (!APPLY)'));
  });
});
