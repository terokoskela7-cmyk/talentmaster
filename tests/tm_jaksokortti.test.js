/**
 * lib/tm_jaksokortti.js — "Jakso nyt" -kortti (VP Tänään + Polku). Fixture: KPV U13 -testipelaaja Topias (m93GBdOaGCUuenMiCL0I).
 */
import { describe, it, expect } from 'vitest';
import { createRequire } from 'module';
const require = createRequire(import.meta.url);
const JK = require('../lib/tm_jaksokortti.js');
const T = (k) => k;
const JF = (o) => Object.assign({ konsepti_avain: 'y_h2', konsepti_nimi: 'Saattaen vaihtaminen', alkoi: '2026-10-01T09:00:00.000Z', kesto_vk: 6, lahde: 'valmentaja', asetti: { rooli: 'vp', pvm: '2026-10-01' },
  tukiosa: { alue: 'kestävyys', perustelu: 'Jaksaa pelata koko ottelun', harjoitteet: [] } }, o || {});
const P = (o) => Object.assign({ id: 'm93GBdOaGCUuenMiCL0I', jaksofokus: JF(), ydinvahvuus: { kuvaus: 'Näkee pelin hyvin', havaittu_pvm: '2026-10-01', rooli: 'vp' }, vastuuhenkilo: { uid: 'u1', rooli: 'valmentaja', asetettu_pvm: '2026-10-01' } }, o || {});

describe('tmJaksoKortti — tiedot', () => {
  it('kesto + päättymispäivä: alkoi + kesto_vk × 7 pv (paikallinen kalenteripäivä); viikko n/k', () => {
    const k = JK.tmJaksoKortti(P(), { nyt: '2026-10-15' });
    expect(k).toMatchObject({ onJakso: true, taito: 'Saattaen vaihtaminen', kesto_vk: 6, alkoi: '2026-10-01', paattyy: '2026-11-12', umpeutunut: false });
    expect(k.viikko).toEqual({ n: 3, k: 6, jaljella: 3 });
    expect(k.tukiosa).toEqual({ alue: 'kestävyys', perustelu: 'Jaksaa pelata koko ottelun' });
    expect(k.ydinvahvuus).toBe('Näkee pelin hyvin');
  });
  it('vanha jakso ilman kesto_vk → 4 vk ennallaan; umpeutunut kun päättymispäivä saavutettu', () => {
    const k = JK.tmJaksoKortti(P({ jaksofokus: JF({ kesto_vk: undefined }) }), { nyt: '2026-10-29' });
    expect(k.kesto_vk).toBe(4); expect(k.paattyy).toBe('2026-10-29'); expect(k.umpeutunut).toBe(true);
    expect(JK.tmJaksoKortti(P({ jaksofokus: JF({ kesto_vk: undefined }) }), { nyt: '2026-10-28' }).umpeutunut).toBe(false);
  });
  it('lähdemerkintä: asetti → "Asetti: VP · pvm"; moottorin lähde → TalentMasterin ehdotus; tuntematon → ei merkintää', () => {
    expect(JK.tmJaksoKortti(P(), {}).asetti).toEqual({ tapa: 'asetti', rooli: 'vp', pvm: '2026-10-01' });
    expect(JK.tmJaksoKortti(P({ jaksofokus: JF({ asetti: undefined, lahde: 'silta_d1' }) }), {}).asetti).toEqual({ tapa: 'ehdotus', rooli: null, pvm: null });
    expect(JK.tmJaksoKortti(P({ jaksofokus: JF({ asetti: undefined, lahde: 'vp' }) }), {}).asetti).toMatchObject({ tapa: 'asetti', rooli: 'vp', pvm: '2026-10-01' });
    expect(JK.tmJaksoKortti(P({ jaksofokus: JF({ asetti: undefined, lahde: 'outo' }) }), {}).asetti).toBeNull();
  });
  it('ei jaksoa → onJakso false (ydinvahvuus + teema silti mukana); null/tyhjä pelaaja ei kaadu', () => {
    const k = JK.tmJaksoKortti(P({ jaksofokus: null }), { teema: { nyt: 'Pelaaminen', seuraava: null, luonnos: null } });
    expect(k.onJakso).toBe(false); expect(k.ydinvahvuus).toBe('Näkee pelin hyvin'); expect(k.teema.nyt).toBe('Pelaaminen');
    expect(() => JK.tmJaksoKortti(null, null)).not.toThrow(); expect(JK.tmJaksoKortti({}, {}).onJakso).toBe(false);
  });
});

describe('tmJaksoKorttiHTML', () => {
  const k = () => JK.tmJaksoKortti(P(), { nyt: '2026-10-15', vastuuNimi: 'Ville Valmentaja', teema: { nyt: 'Pelaaminen paineessa', seuraava: 'Yksinkertainen peli', luonnos: null },
    kotiharjoitteet: [{ id: 'a', nimi: 'Narulla hyppely' }] });
  it('kaikki tiedot yhdellä kortilla: taito · ydinvahvuus · tukiosa · kesto+päättyy · vastuuhenkilö · teema · kotiharjoitteet · lähde', () => {
    const h = JK.tmJaksoKorttiHTML(k(), { t: T, pid: 'X', muokkaaFn: '_m', katsoFn: '_k', liitaFn: '_l' });
    for (const s of ['Saattaen vaihtaminen', 'Näkee pelin hyvin', 'kestävyys', 'Jaksaa pelata koko ottelun', '6 vk', 'päättyy 12.11.', 'Ville Valmentaja', 'Pelaaminen paineessa', 'seuraavaksi Yksinkertainen peli', '1 kpl', 'Asetti: VP · 1.10.', 'Viikko 3/6']) expect(h, s).toContain(s);
    expect(h).toContain('Muokkaa jaksoa'); expect(h).toContain('Katso');
  });
  it('lukuTila (Tänään): ei muokkausnappeja eikä liitä; yksi toiminto jos toimintoFn annettu', () => {
    const h = JK.tmJaksoKorttiHTML(k(), { t: T, pid: 'X', lukuTila: true, muokkaaFn: '_m', liitaFn: '_l', toimintoFn: '_seur' });
    expect(h).not.toContain('Muokkaa jaksoa'); expect(h).not.toContain('Liitä'); expect((h.match(/<button/g) || []).length).toBe(1); expect(h).toContain('Aloita seuraava jakso'); expect(h).toContain("_seur('X')");
  });
  it('ei jaksoa → "Ei jaksoa käynnissä." + napin teksti "Aloita jakso"; ei D-koodeja eikä "jaksofokus"-sanaa; ei hex-värejä', () => {
    const e = JK.tmJaksoKorttiHTML(JK.tmJaksoKortti(P({ jaksofokus: null }), {}), { t: T, pid: 'X', aloitaFn: '_a' });
    expect(e).toContain('Ei jaksoa käynnissä.'); expect(e).toContain('Aloita jakso'); expect(e).not.toContain('Muokkaa jaksoa');
    for (const h of [e, JK.tmJaksoKorttiHTML(k(), { t: T, pid: 'X' })]) { expect(h).not.toMatch(/jaksofokus/i); expect(h).not.toMatch(/\bD[1-8]\b/); expect(h).not.toMatch(/#[0-9a-f]{3,6}\b/i); }
  });
  it('escapaa kaiken (XSS) ja kääntää tekstit t():llä', () => {
    const p = P({ ydinvahvuus: { kuvaus: '<img onerror=x>' }, jaksofokus: JF({ konsepti_nimi: '<b>x</b>' }) });
    const h = JK.tmJaksoKorttiHTML(JK.tmJaksoKortti(p, {}), { t: (s) => '«' + s + '»', pid: 'X' });
    expect(h).not.toContain('<img'); expect(h).not.toContain('<b>x</b>'); expect(h).toContain('«Jakso nyt»');
  });
  it('kotiharjoitteet: ei vielä + Liitä-nappi (ei lukuTilassa)', () => {
    const k0 = JK.tmJaksoKortti(P(), { nyt: '2026-10-15' });
    expect(JK.tmJaksoKorttiHTML(k0, { t: T, pid: 'X', liitaFn: '_l' })).toContain('ei vielä');
    expect(JK.tmJaksoKorttiHTML(k0, { t: T, pid: 'X', liitaFn: '_l' })).toContain("_l('X')");
    expect(JK.tmJaksoKorttiHTML(k0, { t: T, pid: 'X', liitaFn: '_l', lukuTila: true })).not.toContain("_l('X')");
  });
});
