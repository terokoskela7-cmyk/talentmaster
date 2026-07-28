// Vaihe B — ADAR ristiinarvio (multi-rater konsensus + anti-anchoring-gate).
// lib/tm_pelialy_yksilo.js: tmAdarKonsensus · tmAdarRistiinarvioAvoin · tmAdarTalenttiSignaali.
// Kanoni: D4 = konsensus (§4-ikäportitettu keskiarvo arvioijien uusimmista); riippumattomuus = kk-ikkuna.
import { describe, it, expect } from 'vitest';
const P = require('../lib/tm_pelialy_yksilo.js');

// Apuri: havainto tietylle arvioijalle. pisteet-avaimet A/D/Act/R (havainnon natiivimuoto).
function hav(uid, pisteet, luotu, extra) {
  return Object.assign({ tekija_uid: uid, tekija_nimi: uid + '-nimi', pisteet: pisteet, luotu: luotu }, extra || {});
}

describe('tmAdarKonsensus — per-arvioija-uusin', () => {
  it('yksi arvioija, yksi havainto → yht = tmAdarYht (U13 band a,d,ac)', () => {
    const k = P.tmAdarKonsensus([hav('u1', { A: 2, D: 3, Act: 1, R: 3 }, '2026-07-10')], 13);
    expect(k.arvioijia).toBe(1);
    // U13 band = a,d,ac → (2+3+1)/3 = 2.0
    expect(k.yht).toBe(2);
    expect(k.yhtenevyysTaso).toBe(null);   // <2 arvioijaa → ei yhtenevyyttä
  });

  it('ottaa kunkin arvioijan UUSIMMAN havainnon (ei vanhaa)', () => {
    const k = P.tmAdarKonsensus([
      hav('u1', { A: 1, D: 1, Act: 1, R: 1 }, '2026-06-01'),   // vanha u1
      hav('u1', { A: 3, D: 3, Act: 3, R: 3 }, '2026-07-20'),   // uusin u1 → tämä painaa
    ], 20);
    expect(k.arvioijia).toBe(1);
    expect(k.arvioijat[0].pisteet).toEqual({ a: 3, d: 3, ac: 3, r: 3 });
    expect(k.yht).toBe(3);   // U16+ band a,d,ac,r kaikki 3
  });

  it('kaksi arvioijaa → dim-keskiarvo yli arvioijien, yht = §4-konsensus', () => {
    const k = P.tmAdarKonsensus([
      hav('u1', { A: 2, D: 2, Act: 2, R: 2 }, '2026-07-10'),
      hav('u2', { A: 3, D: 3, Act: 3, R: 3 }, '2026-07-11'),
    ], 14);
    expect(k.arvioijia).toBe(2);
    // U13–15 band a,d,ac → keskiarvot (2.5,2.5,2.5) → yht 2.5
    expect(k.dimKonsensus.a).toBe(2.5);
    expect(k.yht).toBe(2.5);
  });

  it('yhtenevyystaso hajonnasta (band-dimit): yksimielinen → korkea', () => {
    const k = P.tmAdarKonsensus([
      hav('u1', { A: 2, D: 2, Act: 2 }, '2026-07-10'),
      hav('u2', { A: 2, D: 2, Act: 2 }, '2026-07-11'),
    ], 14);
    expect(k.yhtenevyysTaso).toBe('korkea');
    expect(k.yhtenevyys.a).toBe(0);
  });

  it('yhtenevyystaso: hajonta 1 → keskiverto, hajonta 2 → matala', () => {
    const kesk = P.tmAdarKonsensus([
      hav('u1', { A: 2, D: 2, Act: 2 }, '2026-07-10'),
      hav('u2', { A: 3, D: 2, Act: 2 }, '2026-07-11'),
    ], 14);
    expect(kesk.yhtenevyysTaso).toBe('keskiverto');
    const mat = P.tmAdarKonsensus([
      hav('u1', { A: 1, D: 2, Act: 2 }, '2026-07-10'),
      hav('u2', { A: 3, D: 2, Act: 2 }, '2026-07-11'),
    ], 14);
    expect(mat.yhtenevyysTaso).toBe('matala');
  });

  it('§4-ikäportitus: U12 band = vain a → R/D/Act eivät nosta yht:iä', () => {
    const k = P.tmAdarKonsensus([hav('u1', { A: 1, D: 3, Act: 3, R: 3 }, '2026-07-10')], 11);
    expect(k.yht).toBe(1);   // vain a lasketaan (band U8–12 = [a])
  });

  it('arvioija ilman uid:ia (valmentajaUid-fallback) tunnistuu omaksi ryhmäksi', () => {
    const k = P.tmAdarKonsensus([
      { valmentajaUid: 'vc1', valmentajaNimi: 'Coach', pisteet: { A: 2, D: 2, Act: 2 }, luotu: '2026-07-10' },
      { valmentajaUid: 'vc2', valmentajaNimi: 'Coach2', pisteet: { A: 2, D: 2, Act: 2 }, luotu: '2026-07-11' },
    ], 14);
    expect(k.arvioijia).toBe(2);
    expect(k.arvioijat[0].nimi).toBeTruthy();
  });

  it('pisteet capataan 1–3 (vanha 1–5-testidata)', () => {
    const k = P.tmAdarKonsensus([hav('u1', { A: 5, D: 4, Act: 1 }, '2026-07-10')], 14);
    expect(k.arvioijat[0].pisteet).toEqual({ a: 3, d: 3, ac: 1, r: null });
  });

  it('tyhjä/virheellinen syöte → graceful (arvioijia 0, yht null)', () => {
    expect(P.tmAdarKonsensus([], 14)).toMatchObject({ arvioijia: 0, yht: null });
    expect(P.tmAdarKonsensus(null, 14)).toMatchObject({ arvioijia: 0 });
    expect(P.tmAdarKonsensus([{ luotu: '2026-07-10' }], 14).arvioijia).toBe(0);  // ei pisteitä → ohitetaan
  });
});

describe('tmAdarRistiinarvioAvoin — anti-anchoring kk-ikkuna', () => {
  const now = Date.parse('2026-07-15T00:00:00Z');
  const kons = P.tmAdarKonsensus([
    hav('minä', { A: 2, D: 2, Act: 2 }, '2026-07-05'),   // oma arvio HEINÄKUUSSA
    hav('muu', { A: 3, D: 3, Act: 3 }, '2026-07-06'),
  ], 14);

  it('avoin kun oma uid on arvioinut kuluvan kuukauden aikana', () => {
    expect(P.tmAdarRistiinarvioAvoin(kons.arvioijat, 'minä', now)).toBe(true);
  });

  it('lukossa kun oma uid EI ole arvioinut tässä kuussa (vain viime kuussa)', () => {
    const konsVanha = P.tmAdarKonsensus([
      hav('minä', { A: 2, D: 2, Act: 2 }, '2026-06-20'),   // oma arvio KESÄKUUSSA
      hav('muu', { A: 3, D: 3, Act: 3 }, '2026-07-06'),
    ], 14);
    expect(P.tmAdarRistiinarvioAvoin(konsVanha.arvioijat, 'minä', now)).toBe(false);
  });

  it('lukossa kun oma uid ei ole arvioijien joukossa lainkaan', () => {
    expect(P.tmAdarRistiinarvioAvoin(kons.arvioijat, 'tuntematon', now)).toBe(false);
  });

  it('lukossa kun uid puuttuu (ei omaa identiteettiä)', () => {
    expect(P.tmAdarRistiinarvioAvoin(kons.arvioijat, null, now)).toBe(false);
  });
});

describe('tmAdarTalenttiSignaali — ≥2 arvioijaa + korkea yhtenevyys + korkeat pisteet', () => {
  it('signaali kun 2 arvioijaa yksimielisesti korkealla (≥2.5)', () => {
    const k = P.tmAdarKonsensus([
      hav('u1', { A: 3, D: 3, Act: 2 }, '2026-07-10'),
      hav('u2', { A: 3, D: 3, Act: 2 }, '2026-07-11'),
    ], 14);   // yht (3+3+2)/3 = 2.67, yhtenevyys korkea
    expect(k.yht).toBeGreaterThanOrEqual(2.5);
    expect(P.tmAdarTalenttiSignaali(k)).toBe(true);
  });

  it('ei signaalia yhdellä arvioijalla vaikka pisteet korkeat', () => {
    const k = P.tmAdarKonsensus([hav('u1', { A: 3, D: 3, Act: 3 }, '2026-07-10')], 14);
    expect(P.tmAdarTalenttiSignaali(k)).toBe(false);
  });

  it('ei signaalia kun yhtenevyys matala', () => {
    const k = P.tmAdarKonsensus([
      hav('u1', { A: 1, D: 3, Act: 3 }, '2026-07-10'),
      hav('u2', { A: 3, D: 3, Act: 3 }, '2026-07-11'),
    ], 14);   // A-hajonta 2 → matala
    expect(k.yhtenevyysTaso).toBe('matala');
    expect(P.tmAdarTalenttiSignaali(k)).toBe(false);
  });

  it('ei signaalia kun konsensuspisteet alle kynnyksen', () => {
    const k = P.tmAdarKonsensus([
      hav('u1', { A: 2, D: 2, Act: 2 }, '2026-07-10'),
      hav('u2', { A: 2, D: 2, Act: 2 }, '2026-07-11'),
    ], 14);   // yht 2.0 < 2.5
    expect(P.tmAdarTalenttiSignaali(k)).toBe(false);
  });
});
