/**
 * B: joukkueen teema henkilökunnan näkymiin (VP_v25 + Master_v16): lukee valmennuslinja/teemat (VAIN hyväksytyt) → tmJoukkueenTeema; teemat_luonnos näkyy vain henkilökunnalle merkinnällä "luonnos".
 * Fixture: KPV U13 -testipelaajat ('KPV U13'); ei SJK:n oikeita pelaajia. Lib on PURE: lataus injektoidaan HTML:stä.
 */
import { describe, it, expect } from 'vitest';
import { createRequire } from 'module';
import { readFileSync } from 'fs';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';
import vm from 'vm';
const require = createRequire(import.meta.url);
const L = require('../lib/tm_valmennuslinja.js'), M = require('../lib/tm_jakso_malli.js');
const juuri = join(dirname(fileURLToPath(import.meta.url)), '..');
const lue = (f) => readFileSync(join(juuri, f), 'utf8'), VP = lue('TalentMaster_VP_v25.html'), MA = lue('TalentMaster_Master_v16.html');
const J = (lisa) => Object.assign({ id: 'a', joukkue: 'KPV U13', jakso: 'Jakso 1', alkaa: '2026-11-02', paattyy: '2027-01-17', teema: 'Syöttötaito ja -peli', konsepti: null, tila: 'hyvaksytty' }, lisa || {});
const TEEMAT = { jaksot: [J(), J({ id: 'b', jakso: 'Jakso 2', alkaa: '2027-01-18', paattyy: '2027-02-28', teema: 'Haasta ja riistä' }), J({ id: 'x', joukkue: 'KPV U15', teema: 'Muu joukkue' })], versio: 2 };
const LUONNOS = { jaksot: [J({ id: 'c', teema: 'Luonnosteema', tila: 'luonnos', alkaa: '2027-03-01', paattyy: '2027-04-11' }), J({ id: 'd', joukkue: 'SJK alle 15 v joukkueet, esim.', teema: 'Placeholder', tila: 'luonnos' })] };

const PVM = '2026-11-10';
describe('lib/tm_valmennuslinja (pure)', () => {
  it('kerros: hyväksytty-lohkoon vain tila "hyvaksytty" (luonnos ei pääse sinne vaikka eksyisi teemat-dokkiin); luonnos-lohkoon vain ei-hyväksytyt luonnos-dokista', () => {
    const k = L.tmTeemaKerros({ jaksot: [J(), J({ id: 'v', tila: 'luonnos', teema: 'Vahingossa' })] }, { jaksot: [J({ id: 'w', tila: 'luonnos' }), J({ id: 'y' })] });
    expect(k.hyvaksytty.jaksot.map((r) => r.id)).toEqual(['a']); expect(k.luonnos.jaksot.map((r) => r.id)).toEqual(['w']);
    expect(L.tmTeemaKerros(null, undefined)).toEqual({ hyvaksytty: { jaksot: [] }, luonnos: { jaksot: [] } });
  });
  it('näyttö: nyt + seuraava hyväksytyistä; luonnos VAIN henkilökunnalle (opts.henkilokunta) ja erillisenä; ei henkilökuntaa → luonnosta ei koskaan', () => {
    const k = L.tmTeemaKerros(TEEMAT, LUONNOS);
    expect(L.tmJoukkueenTeemaNaytto('KPV U13', PVM, k, { henkilokunta: true })).toEqual({ nyt: 'Syöttötaito ja -peli', seuraava: 'Haasta ja riistä', luonnos: { nyt: null, seuraava: 'Luonnosteema' } });   // luonnos alkaa 1.3. → seuraava
    expect(L.tmJoukkueenTeemaNaytto('KPV U13', PVM, k, { henkilokunta: false })).toEqual({ nyt: 'Syöttötaito ja -peli', seuraava: 'Haasta ja riistä', luonnos: null });
    expect(L.tmJoukkueenTeemaNaytto('KPV U13', PVM, k)).toMatchObject({ luonnos: null });
    expect(L.tmJoukkueenTeemaNaytto('KPV U13', '2027-03-15', k, { henkilokunta: true })).toMatchObject({ nyt: null, luonnos: { nyt: 'Luonnosteema' } });
  });
  it('NULL-TURVALLINEN (D16): ei linjaa / ei osumaa / väärä joukkue / ei päivää → null; vain luonnos ja ei henkilökuntaa → null; joukkue täsmää tarkasti ("esim."-placeholder ei osu)', () => {
    const k = L.tmTeemaKerros(TEEMAT, LUONNOS);
    for (const x of [[undefined, 'KPV U13', PVM], [null, 'KPV U13', PVM]]) expect(L.tmJoukkueenTeemaNaytto(x[1], x[2], x[0], { henkilokunta: true })).toBeNull();
    expect(L.tmJoukkueenTeemaNaytto('SJK P13', PVM, k, { henkilokunta: true })).toBeNull(); expect(L.tmJoukkueenTeemaNaytto('KPV U13', undefined, k)).toBeNull(); expect(L.tmJoukkueenTeemaNaytto('', PVM, k)).toBeNull();
    expect(L.tmJoukkueenTeemaNaytto('KPV U13', '2030-01-01', k, { henkilokunta: true })).toBeNull();
    expect(L.tmJoukkueenTeemaNaytto('KPV U13', '2027-03-15', L.tmTeemaKerros(null, LUONNOS), {})).toBeNull();
    expect(L.tmJoukkueenTeemaNaytto('SJK alle 15 v joukkueet, esim.', PVM, k, { henkilokunta: true })).toMatchObject({ nyt: null, luonnos: { nyt: 'Placeholder' } });   // täsmää vain jos joukkue-merkkijono on identtinen
  });
  it('HTML: "Joukkueen teema: X · seuraavaksi Y · luonnos: Z"; luonnos <i data-teema-luonnos>; escape; ei hex-värejä; tyhjä → ""; tekstit t():n läpi', () => {
    const k = L.tmTeemaKerros(TEEMAT, LUONNOS), h = L.tmTeemaRiviHTML(L.tmJoukkueenTeemaNaytto('KPV U13', PVM, k, { henkilokunta: true }), { t: (x) => x });
    expect(h).toContain('Joukkueen teema:'); expect(h).toContain('Syöttötaito ja -peli'); expect(h).toContain('seuraavaksi Haasta ja riistä'); expect(h).toContain('<i data-teema-luonnos>luonnos: Luonnosteema</i>'); expect(h).not.toMatch(/#[0-9a-fA-F]{3,6}\b|rgb\(/);
    expect(L.tmTeemaRiviHTML(null)).toBe(''); expect(L.tmTeemaRiviHTML({ nyt: null, seuraava: null, luonnos: null })).toBe('');
    const x = L.tmTeemaRiviHTML({ nyt: '<img onerror=1>', seuraava: null, luonnos: null }); expect(x).not.toContain('<img'); expect(L.tmTeemaRiviHTML({ nyt: 'A', seuraava: null, luonnos: null }, { t: (k2) => '«' + k2 + '»' })).toContain('«Joukkueen teema»');
    expect(M.tmTarkistaJaksoData({ teema: 'x' })).toEqual([]);
  });
  it('lähde: lib ei lue Firestorea; Pelaaja_v7 ja Vanhempi_v2 eivät lataa libiä (henkilökunnan tieto)', () => {
    const koodi = lue('lib/tm_valmennuslinja.js').replace(/\/\*[\s\S]*?\*\//g, '').split('\n').map((l) => l.replace(/\/\/.*$/, '')).join('\n'); expect(koodi).not.toMatch(/firebase|firestore|collection\(|fetch\(|https?:\/\//i);
    ['TalentMaster_Pelaaja_v7.html', 'TalentMaster_Vanhempi_v2.html'].forEach((f) => expect(lue(f), f).not.toMatch(/tm_valmennuslinja|TM_VALMENNUSLINJA/)); expect(VP).toContain('lib/tm_valmennuslinja.js?v=1'); expect(MA).toContain('lib/tm_valmennuslinja.js?v=1');
  });
});

function pura(H, t) { const i = H.indexOf(t); expect(i, t).toBeGreaterThan(-1); let d = 0; for (let k = H.indexOf('{', i); k < H.length; k++) { if (H[k] === '{') d++; else if (H[k] === '}') { d--; if (!d) return H.slice(i, k + 1); } } throw new Error('sulkeet'); }
function ymp(sovellus, { demo = false, dokit = { teemat: TEEMAT, teemat_luonnos: LUONNOS }, kaada = [] } = {}) {
  const lokit = { luetut: [], renderit: 0 };
  const db = { collection: () => ({ doc: () => ({ collection: (c) => ({ doc: (id) => ({ get: async () => { lokit.luetut.push(c + '/' + id); if (kaada.indexOf(id) >= 0) throw new Error('permission-denied'); const d = dokit[id]; return { exists: !!d, data: () => d }; } }) }) }) }) };
  const c = { db, _db: db, _seuraId: 'kpv', _isDemoMode: demo, _demo: demo, vpT: (x) => x, masterT: (x) => x, tmPaivaIso: () => PVM, console: { warn() {} }, Promise, Object, Array,
    window: {}, _vpKausitavoiteReRender() { lokit.renderit++; }, _mIdpReRender() { lokit.renderit++; } };
  c.window = c; c.window.TM_VALMENNUSLINJA = L; vm.createContext(c);
  vm.runInContext((sovellus === 'vp' ? [pura(VP, 'async function _vpLataaTeemat('), pura(VP, 'function _vpTeemaRivi(')] : [pura(MA, 'async function _mLataaTeemat('), pura(MA, 'function _mTeemaRivi(')]).join(';\n') + ';', c);
  return { c, lokit };
}
const PEL = { id: 'm93GBdOaGCUuenMiCL0I', joukkue: 'KPV U13' };
describe.each([['vp', '_vpTeemaRivi', '_vpTeemat'], ['master', '_mTeemaRivi', '_mTeemat']])('%s-adapteri', (sov, rivi, kerros) => {
  it('lataa teemat + teemat_luonnos KERRAN (valmennuslinja-polku), piirtää kortin uudelleen; rivi näyttää nyt/seuraava + luonnos-merkinnän; toinen kutsu ei lataa uudelleen', async () => {
    const e = ymp(sov); expect(e.c[rivi](PEL)).toBe('');   // ensimmäinen kutsu käynnistää latauksen, rivi tulee latauksen jälkeen
    await new Promise((r) => setTimeout(r, 0)); await new Promise((r) => setTimeout(r, 0));
    expect(e.lokit.luetut.sort()).toEqual(['valmennuslinja/teemat', 'valmennuslinja/teemat_luonnos']); expect(e.lokit.renderit).toBe(1);
    const h = e.c[rivi](PEL); expect(h).toContain('Joukkueen teema:'); expect(h).toContain('Syöttötaito ja -peli'); expect(h).toContain('seuraavaksi Haasta ja riistä'); expect(h).toContain('luonnos: Luonnosteema');
    e.c[rivi](PEL); expect(e.lokit.luetut.length).toBe(2);
  });
  it('joukkue joukkueet[]-taulukosta jos joukkue-kenttä puuttuu; muun joukkueen pelaaja → ei riviä; demo / ei linjaa / lukuvirhe → ei riviä, ei kaadu (tyhjä kerros)', async () => {
    const e = ymp(sov); e.c[rivi](PEL); await new Promise((r) => setTimeout(r, 0)); await new Promise((r) => setTimeout(r, 0));
    expect(e.c[rivi]({ id: 'x', joukkueet: ['KPV U13'] })).toContain('Syöttötaito'); expect(e.c[rivi]({ id: 'y', joukkue: 'KPV U99' })).toBe('');
    const demo = ymp(sov, { demo: true }); expect(demo.c[rivi](PEL)).toBe(''); await new Promise((r) => setTimeout(r, 0)); expect(demo.lokit.luetut).toEqual([]);
    const tyhja = ymp(sov, { dokit: {} }); tyhja.c[rivi](PEL); await new Promise((r) => setTimeout(r, 0)); await new Promise((r) => setTimeout(r, 0)); expect(tyhja.c[rivi](PEL)).toBe('');
    const kaatuu = ymp(sov, { kaada: ['teemat_luonnos'] }); kaatuu.c[rivi](PEL); await new Promise((r) => setTimeout(r, 0)); await new Promise((r) => setTimeout(r, 0));
    expect(kaatuu.c[rivi](PEL)).toContain('Syöttötaito'); expect(kaatuu.c[rivi](PEL)).not.toContain('luonnos');   // luonnoksen lukuvirhe ei kaada hyväksyttyjen näyttöä
  });
  it('lähde: rivi IDP-kortin yläosassa ennen vastuuhenkilö-riviä; kirjoituksia ei ole (vain .get())', () => {
    const H = sov === 'vp' ? VP : MA, kortti = pura(H, sov === 'vp' ? 'function _vpKausitavoiteHTML(' : 'function _mIdpKorttiHTML('), ad = pura(H, sov === 'vp' ? 'async function _vpLataaTeemat(' : 'async function _mLataaTeemat(');
    expect(kortti).toContain(rivi + '(p)'); expect(kortti.indexOf(rivi + '(p)')).toBeLessThan(kortti.indexOf(sov === 'vp' ? '_vpVastuuhenkiloRivi(p)' : '_mVastuuhenkiloRivi(p, editable)'));
    expect(ad).toContain(".collection('valmennuslinja')"); expect(ad).not.toMatch(/\.(set|update|add|delete)\(/);
  });
});
