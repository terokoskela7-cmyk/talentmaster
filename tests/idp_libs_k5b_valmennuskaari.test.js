/**
 * TalentMaster™ — K5b: Valmennusosaamisen kaari (havainnointi kalibroituu VP:hen, CPD).
 * tmValmennusKaari: per valmentaja ajassa raakahavainnoista (ei kaappausta). Kolme rehellisyysehtoa:
 * (1) läpinäkyvä ankkuri (vp|konsensus, ei valheellista VP-väitettä) · (2) leave-one-out konsensus-fallbackissa ·
 * (3) honest-empty (datataso-guard). KEHITTÄVÄ EI RANKAISEVA: ei rankinglistaa · vain oma data (permissio).
 */
import { describe, it, expect } from 'vitest';
import { readFileSync } from 'fs';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';
import { createRequire } from 'module';

const __dir = dirname(fileURLToPath(import.meta.url));
const require = createRequire(import.meta.url);
const L = require('../lib/tm_pelialy_yksilo.js');
const VP = readFileSync(join(__dir, '..', 'TalentMaster_VP_v25.html'), 'utf8');

const H = (uid, rooli, pid, p, pvm) => ({ valmentajaUid: uid, tekija_rooli: rooli, pelaajaId: pid, pisteet: p, luotu: pvm });

describe('tmValmennusKaari — VP-ankkuri ensisijainen', () => {
  it('|valmentaja − VP| ajassa; ankkuri="vp"; kaventuu', () => {
    const hav = [
      H('C1', 'valmentaja', 'P1', { A: 2, D: 2, Act: 2, R: 2 }, '2026-03-01'),
      H('VP', 'vp', 'P1', { A: 3, D: 2, Act: 2, R: 2 }, '2026-03-02'),
      H('C1', 'valmentaja', 'P1', { A: 3, D: 3, Act: 3, R: 3 }, '2026-09-01'),
      H('VP', 'vp', 'P1', { A: 3, D: 3, Act: 3, R: 3 }, '2026-09-02')
    ];
    const k = L.tmValmennusKaari(hav, { omaUid: 'C1', vpUid: 'VP', ika: 16 });
    expect(k.kalibraatioAnkkuri).toBe('vp');
    expect(k.kalibraatio.map(x => x.arvo)).toEqual([0.25, 0]);   // kaventuu (0.25 → 0)
    expect(k.kalibraatio.every(x => x.ankkuri === 'vp')).toBe(true);
    expect(k.datataso).toBe('suunta');
  });
});

describe('tmValmennusKaari — LEAVE-ONE-OUT konsensus-fallback (ehto 2)', () => {
  it('valmentajan oma havainto EI ole mukana tiimikonsensuksessa → poikkeama ei keinotekoisen pieni', () => {
    // C1=2, C2=3, C3=3. C1 vs konsensus(C2,C3)=3 → 1. JOS C1 mukana: konsensus 2.67 → 0.67 (väärä).
    const hav = [H('C1', 'valmentaja', 'P2', { A: 2 }, '2026-03-01'), H('C2', 'valmentaja', 'P2', { A: 3 }, '2026-03-01'), H('C3', 'valmentaja', 'P2', { A: 3 }, '2026-03-01')];
    const k = L.tmValmennusKaari(hav, { omaUid: 'C1', vpUid: null, ika: 16 });
    expect(k.kalibraatioAnkkuri).toBe('konsensus');
    expect(k.kalibraatio[0].arvo).toBe(1);   // EI 0.67
  });
  it('VP-ankkuri voittaa konsensuksen kun molemmat saatavilla', () => {
    const hav = [H('C1', 'valmentaja', 'P1', { A: 2 }, '2026-03-01'), H('VP', 'vp', 'P1', { A: 2 }, '2026-03-01'), H('C2', 'valmentaja', 'P1', { A: 3 }, '2026-03-01')];
    const k = L.tmValmennusKaari(hav, { omaUid: 'C1', vpUid: 'VP', ika: 16 });
    expect(k.kalibraatioAnkkuri).toBe('vp');
    expect(k.kalibraatio[0].arvo).toBe(0);   // C1=2 vs VP=2 (ei C2)
  });
});

describe('tmValmennusKaari — §28-band · honest-empty · vain oma', () => {
  it('U13 → R pois band-vertailusta', () => {
    const hav = [H('C1', 'valmentaja', 'P3', { A: 2, D: 2, Act: 2, R: 1 }, '2026-03-01'), H('VP', 'vp', 'P3', { A: 2, D: 2, Act: 2, R: 3 }, '2026-03-01')];
    const k = L.tmValmennusKaari(hav, { omaUid: 'C1', vpUid: 'VP', ika: 13 });
    expect(k.kalibraatio[0].arvo).toBe(0);   // A/D/Ac täsmää; R (ero 2) EI mukana
  });
  it('tyhjä / vain muiden data → datataso tyhja, ei vuoda', () => {
    expect(L.tmValmennusKaari([], { omaUid: 'C1' }).datataso).toBe('tyhja');
    expect(L.tmValmennusKaari([H('C2', 'valmentaja', 'P9', { A: 2 }, '2026-03-01')], { omaUid: 'C1' }).datataso).toBe('tyhja');
  });
  it('ei ankkuria (vain oma havainto) → kalibraatio tyhjä, kalibraatioAnkkuri null (honest-empty)', () => {
    const k = L.tmValmennusKaari([H('C1', 'valmentaja', 'P1', { A: 2 }, '2026-03-01')], { omaUid: 'C1', vpUid: 'VP' });
    expect(k.kalibraatio.length).toBe(0);
    expect(k.kalibraatioAnkkuri).toBe(null);
    expect(k.havainnointi.length).toBe(1);   // havainnointi näkyy silti
  });
  it('reflektio: >1 arvio samalle pelaajalle ikkunassa', () => {
    const hav = [H('C1', 'valmentaja', 'P1', { A: 2 }, '2026-03-01'), H('C1', 'valmentaja', 'P1', { A: 3 }, '2026-04-01')];
    expect(L.tmValmennusKaari(hav, { omaUid: 'C1' }).reflektio[0].paivitykset).toBe(1);
  });
});

describe('VP-render — cockpit (MUUTOS 3) + coach-CPD (MUUTOS 2), kehittävä ei rankaiseva', () => {
  it('renderKalib EI enää Math.random-demoa; käyttää tmValmennusKaari + honest-empty', () => {
    expect(VP).not.toContain('// Demo ADAR-data (tulee tulevaisuudessa Firestoresta)');
    expect(VP).not.toContain('Math.round((v.adar || 4) - 0.5 + Math.random())');
    expect(VP).toContain('tmValmennusKaari(hav, { omaUid: v.id, vpUid: _uid || null })');
    expect(VP).toContain('kalibraatio kertyy');   // honest-empty
  });
  it('läpinäkyvä ankkuri-merkintä (VP:n näkemykseen / tiimin yhteisnäkemykseen)', () => {
    expect(VP).toContain("a === 'vp' ? 'VP:n näkemykseen' : a === 'konsensus' ? 'tiimin yhteisnäkemykseen'");
  });
  it('kehittävä sanamuoto (kaventuu — yhteinen kieli tarkentuu; keskustelun avaus, ei virhe)', () => {
    expect(VP).toContain('kaventuu — yhteinen kieli tarkentuu');
    expect(VP).toContain('keskustelun avaus, ei virhe');
  });
  it('EI rankinglistaa: alkuperäinen valmentajajärjestys (_valmentajat.map, ei sort by delta)', () => {
    expect(VP).not.toContain('data.reduce((a,b) => Number(a.delta) > Number(b.delta)');
    expect(VP).toContain('const rivit = _valmentajat.map(v => {');
  });
  it('per-pelaaja loader (VP-työpöytäkysely, ei uutta indeksiä/collectionGroupia)', () => {
    expect(VP).toContain('.collection(\'pelaajat\').doc(p.id).collection(\'havainnot\').get()');
    expect(VP).not.toContain('collectionGroup');
  });
  it('coach-CPD (MUUTOS 2): oma kaari (omaUid), mount + async render', () => {
    expect(VP).toContain('_cmLataaAdarCpd(v.id)');
    expect(VP).toContain('id="cmAdarCpd"');
    expect(VP).toContain('function _cmAdarCpdHTML(k)');
  });
});
