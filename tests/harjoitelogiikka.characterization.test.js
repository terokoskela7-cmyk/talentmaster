/**
 * TalentMaster™ — Characterization-testit: harjoitelogiikka_v4.js (A7 Vaihe 1)
 *
 * TARKOITUS: pinnaa harjoitepankin NYKYKÄYTÖS ennen refaktorointia (A7). Nämä testit
 * ovat turvaverkko — jos refaktorointi muuttaa käytöstä, testi punaisena.
 * Importtaa AINA kanonisesta ROOT-tiedostosta (src/lib on re-export, A7 Vaihe 0).
 *
 * VERIFIOITU TODELLISUUS vs alkuperäinen spec (3 poikkeamaa — pinnattu todellisuuteen,
 * EI spec-oletukseen; characterization = mitä koodi OIKEASTI tekee):
 *  1. laskeTekninenKehityskohde ei-datalle → { lahde:'ikavaihe', varmuus:'oletus' }
 *     (spec oletti lahde:'oletus' — väärin; 'oletus' on varmuus-kentässä).
 *  2. generoiMiksiteksti(p, null, iv) HEITTÄÄ (lukee kehityskohde.kohde). Siksi kuluttaja
 *     Pelaaja_v7:1719 kietoo sen try/catchiin. Pinnaamme heiton, emme heittämättömyyttä.
 *  3. ADAR-override on D-TEHTÄVÄSSÄ (ei S), ehto pelaaja.adar_pisteet < 40 (LUKU, ei objekti
 *     {ac}). harjoitelogiikka_v4.js:1105-1113. Spec-fikstuuri {ac:0.2} EI laukaise overridea.
 */
import { createRequire } from 'module';
const require = createRequire(import.meta.url);
const lib = require('../harjoitelogiikka_v4.js');

const PVM = '2026-06-15';

// Spec-fikstuurit (säilytetty sellaisenaan) — adar_matala.{ac} ei laukaise overridea (ks. yllä #3).
const FIKSTURIT = {
  leikkija_ei_dataa: { syntymaVuosi: 2016 },
  leikkija_flei:     { syntymaVuosi: 2016, flei_ketjut: { sbl: 2.1, sfl: 2.5, ll: 1.8, diag: 2.2, dfl: 2.0 }, luotu: '2026-01-01' },
  rakentaja_tki:     { syntymaVuosi: 2013, tki_kehityskohde: 'syotto', luotu: '2026-03-01' },
  rakentaja_tsi:     { syntymaVuosi: 2013, tsi_viimeisin: 1.4, luotu: '2026-03-01' },
  showcase_phv:      { syntymaVuosi: 2010, phv_tila: 'PH', luotu: '2026-01-15' },
  ilman_luotua:      { syntymaVuosi: 2013 },
  adar_matala:       { syntymaVuosi: 2013, adar_pisteet: { ac: 0.2 }, luotu: '2026-02-01' },
};

// valitsePaivanHarjoite-paluuobjektin kanoninen kenttärakenne (kuluttajasopimus, A7 §3B).
const VPH_KENTAT = ['cue', 'kehityskohde', 'kesto', 'nimi', 'ohje', 'paiviaAktiivinen', 'tarina', 'tyyppi', 'viikkotavoite', 'xp', 'yt'].sort();

describe('A7 Vaihe 0 — kanoonisuus', () => {
  it('src/lib/harjoitelogiikka_v4.js on re-export rootista (sama funktioviite)', () => {
    const lib2 = require('../src/lib/harjoitelogiikka_v4.js');
    expect(lib2.valitsePaivanHarjoite).toBe(lib.valitsePaivanHarjoite);
  });
});

describe('valitsePaivanHarjoite', () => {
  for (const [nimi, p] of Object.entries(FIKSTURIT)) {
    it(`${nimi}: ei heitä, palauttaa T-harjoitteen täydellä kenttärakenteella`, () => {
      const r = lib.valitsePaivanHarjoite(p, lib.PANKKI, PVM);
      expect(typeof r).toBe('object');
      expect(r).not.toBeNull();
      expect(Object.keys(r).sort()).toEqual(VPH_KENTAT); // kenttärakenne-snapshot (vain kentät)
      expect(r.tyyppi).toBe('T');                         // T-harjoite joka päivä (metodologia)
      expect(typeof r.ohje).toBe('string');
      expect(r.ohje.length).toBeGreaterThan(0);
    });
  }

  it('ilman luotua → paiviaAktiivinen === 0 (PAKOLLINEN — harjoite ei vaihdu ilman luotua)', () => {
    expect(lib.valitsePaivanHarjoite(FIKSTURIT.ilman_luotua, lib.PANKKI, PVM).paiviaAktiivinen).toBe(0);
    expect(lib.valitsePaivanHarjoite(FIKSTURIT.leikkija_ei_dataa, lib.PANKKI, PVM).paiviaAktiivinen).toBe(0);
  });

  it('luotu olemassa → paiviaAktiivinen on numero >= 0', () => {
    const r = lib.valitsePaivanHarjoite(FIKSTURIT.rakentaja_tki, lib.PANKKI, PVM);
    expect(typeof r.paiviaAktiivinen).toBe('number');
    expect(r.paiviaAktiivinen).toBeGreaterThanOrEqual(0);
  });

  it('leikkija §28 — ohje on ei-tyhjä string (leikkijän fallback, ei rakentajan drilliä)', () => {
    // _ohjeIkavaiheelle (root:2684) ei ole exportattu → §28 pinnataan julkisen API:n kautta.
    // ika annettu eksplisiittisesti → ikävaihe ei riipu kuluvasta vuodesta.
    const p = { ika: 10, luotu: '2026-01-01' };
    expect(lib._laskeIkavaihe(p)).toBe('leikkija');
    const r = lib.valitsePaivanHarjoite(p, lib.PANKKI, PVM);
    expect(typeof r.ohje).toBe('string');
    expect(r.ohje.length).toBeGreaterThan(0);
  });
});

describe('laskeTekninenKehityskohde', () => {
  it('palauttaa { kohde, lahde, varmuus, rawKohde }', () => {
    const k = lib.laskeTekninenKehityskohde(FIKSTURIT.rakentaja_tki);
    expect(Object.keys(k).sort()).toEqual(['kohde', 'lahde', 'rawKohde', 'varmuus']);
  });

  it('tki_kehityskohde → lahde === "tki", kohde === "syotto"', () => {
    const k = lib.laskeTekninenKehityskohde(FIKSTURIT.rakentaja_tki);
    expect(k.lahde).toBe('tki');
    expect(k.kohde).toBe('syotto');
  });

  it('tsi_viimeisin → lahde === "tsi"', () => {
    expect(lib.laskeTekninenKehityskohde(FIKSTURIT.rakentaja_tsi).lahde).toBe('tsi');
  });

  it('ei dataa → lahde === "ikavaihe", varmuus === "oletus" (TODELLISUUS, ei lahde:"oletus")', () => {
    const k = lib.laskeTekninenKehityskohde(FIKSTURIT.ilman_luotua);
    expect(k.lahde).toBe('ikavaihe');
    expect(k.varmuus).toBe('oletus');
  });
});

describe('generoiMiksiteksti', () => {
  it('happy path (oikea kehityskohde-objekti) → { miksi_lause1, miksi_lause2, miksi_lause3 } stringit', () => {
    const p = FIKSTURIT.rakentaja_tki;
    const kk = lib.laskeTekninenKehityskohde(p);
    const m = lib.generoiMiksiteksti(p, kk, lib._laskeIkavaihe(p));
    expect(Object.keys(m).sort()).toEqual(['miksi_lause1', 'miksi_lause2', 'miksi_lause3']);
    for (const v of Object.values(m)) expect(typeof v).toBe('string');
  });

  it('HEITTÄÄ kun kehityskohde === null (siksi Pelaaja_v7:1719 kietoo try/catchiin)', () => {
    const p = FIKSTURIT.rakentaja_tki;
    expect(() => lib.generoiMiksiteksti(p, null, lib._laskeIkavaihe(p))).toThrow();
  });
});

describe('generoimTehtavat', () => {
  it('palauttaa array jossa tyypit T, D, S', () => {
    const t = lib.generoimTehtavat(FIKSTURIT.rakentaja_tki, PVM);
    expect(Array.isArray(t)).toBe(true);
    expect(t.length).toBeGreaterThan(0);
    const tyypit = new Set(t.map((x) => x.tyyppi));
    for (const ty of ['T', 'D', 'S']) expect(tyypit.has(ty)).toBe(true);
  });
});

describe('INVARIANTIT — EI saa rikkoa refaktoroinnissa', () => {
  it('DIAG-ketju ei hajoa sl/fl-kentillä (PANKKI.D + PANKKI.S)', () => {
    for (const haara of ['D', 'S']) {
      const ketjut = Object.keys(lib.PANKKI[haara]);
      expect(ketjut).toContain('diag');
      expect(ketjut).not.toContain('sl');
      expect(ketjut).not.toContain('fl');
    }
  });

  it('ADAR-override: adar_pisteet < 40 (luku) → D-tehtävä ketju === "diag", adar_override === true', () => {
    const p = { syntymaVuosi: 2013, adar_pisteet: 30, luotu: '2026-02-01' };
    const d = lib.generoimTehtavat(p, PVM).find((x) => x.tyyppi === 'D');
    expect(d.ketju).toBe('diag');
    expect(d.adar_override).toBe(true);
  });

  it('ADAR >= 40 → ei diag-overridea (heikoin ketju voittaa)', () => {
    const p = { syntymaVuosi: 2013, adar_pisteet: 50, luotu: '2026-02-01' };
    const d = lib.generoimTehtavat(p, PVM).find((x) => x.tyyppi === 'D');
    expect(d.adar_override).toBe(false);
  });
});

// ── PR C (PHV-sanaston yhtenäistys, 4.10.2026) ────────────────────────────────────────────────────
// Kirjoitettu ENNEN muutosta: "ennallaan"-testit olivat vihreinä vanhalla koodilla, "PR C:" -testit
// punaisina. Vanha koodi luki puuttuvan tilan oletuksella 'AN' ja tulkitsi AN:n pre-PHV:ksi
// (vanha lomakesanasto) — nyt kanoninen Mirwald + sääntö 3 (ilman mittausta = 'tuntematon').
describe('generoimTehtavat — PHV (PR C)', () => {
  const mitattu = (koodi) => ({ phv_tila: koodi, biologinenIka_viimeisin: { phv_tila_koodi: koodi, mittauspaiva: '2026-09-01' } });
  const pohja = { ika: 14, flei_ketjut: { SBL: 20, SFL: 80, LL: 80, DIAG: 80, DFL: 80 }, luotu: '2026-02-01' };
  const dTehtava = (extra) => lib.generoimTehtavat(Object.assign({}, pohja, extra), PVM).find((x) => x.tyyppi === 'D');

  it('mitattu PH → PH-variantti ⚠️-merkillä (ennallaan)', () => {
    expect(dTehtava(mitattu('PH')).ohje).toMatch(/⚠️ Naruhypyt 2×10s kevyesti/);
  });

  it('mitattu AN (jälki-PHV) → normaali ohje ilman varianttia (ennallaan)', () => {
    const d = dTehtava(mitattu('AN'));
    expect(d.ohje).not.toMatch(/Naruhypyt 2×10s kevyesti/);
    expect(d.ohje).not.toMatch(/⚠️/);
  });

  it('PR C: puuttuva tila → varovainen variantti (ennen: oletus AN → täysi kuorma), EI ⚠️-PH-varoitusta', () => {
    const d = dTehtava({});
    expect(d.ohje).toMatch(/Naruhypyt 2×10s kevyesti/);
    expect(d.ohje).not.toMatch(/⚠️/);
    expect(d.ohje).not.toMatch(/PHV/);
  });

  it('PR C: AN ilman mittausta (Topias) → tuntematon → varovainen variantti ilman ⚠️ (ennen: täysi kuorma)', () => {
    const d = dTehtava({ phv_tila: 'AN' });
    expect(d.ohje).toMatch(/Naruhypyt 2×10s kevyesti/);
    expect(d.ohje).not.toMatch(/⚠️/);
  });

  it('PR C: lomakkeelta ilmoitettu PH (ei mittausta) → kuorma EI kevene, mutta lapselle ei ⚠️-PH-varoitusta', () => {
    const d = dTehtava({ phv_tila: 'PH' });
    expect(d.ohje).toMatch(/Naruhypyt 2×10s kevyesti/);
    expect(d.ohje).not.toMatch(/⚠️/);
  });
});

// ── K1: "jakso ensin, sitten testit" (opts.jaksoEnsin) — vanha polku lukittu, uusi vain lipun takana ──
describe('valitsePaivanHarjoite — K1 opts.jaksoEnsin', () => {
  const H = (lisa) => Object.assign({ nimi: 'Seuran porttikuljetus', tyyppi: 'T', lahde: 'seura', tila: 'hyvaksytty', kaytto: 'koti', konsepti: 'y_h2', ohje: 'Kuljeta pallo porttien läpi.', kesto_min: 12, ika_min: 10, ika_max: 16 }, lisa || {});
  const P = (lisa) => Object.assign({ syntymaVuosi: 2013, seuraId: 'kpv', luotu: '2026-03-01', tki_kehityskohde: 'syotto', jaksofokus: { konsepti_avain: 'y_h2', konsepti_nimi: 'Kuljettaminen' } }, lisa || {});
  const BANK = (rivit) => ({ seuraId: 'kpv', harjoitteet: rivit });
  it('ILMAN opts / opts.jaksoEnsin !== true → täsmälleen sama tulos kuin ennen (jakso ei vaikuta); kenttärakenne ennallaan', () => {
    const vanha = lib.valitsePaivanHarjoite(P(), lib.PANKKI, PVM, BANK([H()]));
    expect(vanha.nimi).not.toBe('Seuran porttikuljetus');   // seuran rivin kehityskohde ei täsmää testikohteeseen → TM-polku
    for (const opts of [undefined, null, {}, { jaksoEnsin: false }, { jaksoEnsin: 'true' }, { jaksoEnsin: 1 }]) expect(lib.valitsePaivanHarjoite(P(), lib.PANKKI, PVM, BANK([H()]), opts)).toEqual(vanha);
    expect(Object.keys(vanha).sort()).toEqual(VPH_KENTAT);
    for (const [nimi, p] of Object.entries(FIKSTURIT)) expect(lib.valitsePaivanHarjoite(p, lib.PANKKI, PVM, undefined, { jaksoEnsin: true }), nimi).toEqual(lib.valitsePaivanHarjoite(p, lib.PANKKI, PVM));   // ei jaksoa → testipolku
  });
  it('jaksoEnsin: pelaajan jakson konsepti_avain täsmää seuran hyväksyttyyn pankkiriviin → päivän treeni siitä (lahde seura, jaksosta: true), kehityskohde silti testistä', () => {
    const r = lib.valitsePaivanHarjoite(P(), lib.PANKKI, PVM, BANK([H()]), { jaksoEnsin: true });
    expect(r).toMatchObject({ nimi: 'Seuran porttikuljetus', lahde: 'seura', jaksosta: true, kesto: '12 min', tyyppi: 'T', kehityskohde: 'syotto' });
    expect(lib.valitsePaivanHarjoite(P(), lib.PANKKI, PVM, [H()], { jaksoEnsin: true }).nimi).toBe('Seuran porttikuljetus');   // pelkkä taulukkokin kelpaa
  });
  it('ei osumaa → testipolku täsmälleen ennallaan: toinen konsepti, ei konsepti-kenttää, ei jaksoa, tyhjä pankki', () => {
    const vanha = lib.valitsePaivanHarjoite(P(), lib.PANKKI, PVM);
    for (const pankki of [BANK([H({ konsepti: 'y_h9' })]), BANK([H({ konsepti: undefined })]), BANK([]), undefined, null]) expect(lib.valitsePaivanHarjoite(P(), lib.PANKKI, PVM, pankki, { jaksoEnsin: true })).toEqual(vanha);
    expect(lib.valitsePaivanHarjoite(P({ jaksofokus: null }), lib.PANKKI, PVM, BANK([H()]), { jaksoEnsin: true })).toEqual(lib.valitsePaivanHarjoite(P({ jaksofokus: null }), lib.PANKKI, PVM));
  });
  it('puolustavat rajat: joukkue-käyttöinen, luonnos, ei-seura-lähde, eri seura ja väärä ikä eivät koskaan pelaajalle', () => {
    const vanha = lib.valitsePaivanHarjoite(P(), lib.PANKKI, PVM);
    for (const rivi of [H({ kaytto: 'joukkue' }), H({ tila: 'luonnos' }), H({ lahde: 'tm' }), H({ ika_min: 14 }), H({ ika_max: 11 }), H({ nimi: '' })]) expect(lib.valitsePaivanHarjoite(P(), lib.PANKKI, PVM, BANK([rivi]), { jaksoEnsin: true }), JSON.stringify(rivi)).toEqual(vanha);
    expect(lib.valitsePaivanHarjoite(P(), lib.PANKKI, PVM, { seuraId: 'sjk', harjoitteet: [H()] }, { jaksoEnsin: true })).toEqual(vanha);
  });
  it('useampi konseptiin sopiva rivi: deterministinen päiväindeksi (sama päivä → sama; vaihtuu päivittäin)', () => {
    const rivit = [H({ nimi: 'A' }), H({ nimi: 'B' }), H({ nimi: 'C' })];
    const a = lib.valitsePaivanHarjoite(P(), lib.PANKKI, '2026-06-15', BANK(rivit), { jaksoEnsin: true }).nimi, b = lib.valitsePaivanHarjoite(P(), lib.PANKKI, '2026-06-15', BANK(rivit), { jaksoEnsin: true }).nimi;
    expect(a).toBe(b); const nimet = new Set(['2026-06-15', '2026-06-16', '2026-06-17'].map((d) => lib.valitsePaivanHarjoite(P(), lib.PANKKI, d, BANK(rivit), { jaksoEnsin: true }).nimi)); expect(nimet.size).toBe(3);
  });
});
