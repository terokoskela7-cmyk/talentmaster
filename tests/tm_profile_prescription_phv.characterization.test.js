/**
 * Characterization-testit: lib/tm-profile.js + lib/tm-prescription.js — PHV-kuormarajoitin (PR C).
 *
 * Kirjoitettu ENNEN PHV-sanaston yhtenäistystä, jotta muutos näkyy testeissä. Odotukset, jotka PR C
 * muutti, on merkitty "PR C:" -kommentilla ja perusteltu. Ladataan kuten selain (Master_v16):
 * tm-methodology → tm-profile → tm-microcycles → tm-prescription samaan globaaliin.
 */
import { readFileSync } from 'fs';
import { join } from 'path';
import vm from 'vm';

const juuri = join(__dirname, '..');

function lataa() {
  const ctx = { console: { warn() {}, log() {}, error() {} }, Date, Math, JSON };
  ctx.window = ctx;
  vm.createContext(ctx);
  for (const f of ['lib/tm_viikko.js', 'lib/tm_phv_tila.js', 'lib/tm-methodology.js', 'lib/tm-profile.js', 'lib/tm-microcycles.js', 'lib/tm-prescription.js']) {
    vm.runInContext(readFileSync(join(juuri, f), 'utf8'), ctx, { filename: f });
  }
  return ctx.TM;
}

const TM = lataa();
const P = TM.profile;
const R = TM.prescription;

// Mittauslähteellinen pelaaja (Testaus_v9:n kasvumittaus kirjoittaa biologinenIka_viimeisin + phv_tila samassa batchissa).
const mitattu = (koodi, extra) => Object.assign({ phv_tila: koodi, biologinenIka_viimeisin: { phv_tila_koodi: koodi, mittauspaiva: '2026-09-01' } }, extra || {});
const FLEI_KORKEA = { flei_ketjut: { SBL: 95, SFL: 95, LL: 95, DIAG: 95, DFL: 95 } };   // ka 95 → raakaStage 5

describe('laskeEfektiivinenStage — PHV-portti', () => {
  it('PH → max S2, rajoitusSyy PHV (ennallaan)', () => {
    const r = P.laskeEfektiivinenStage(95, 'PH', 17, null);
    expect(r.stage).toBe(2);
    expect(r.rajoitusSyy).toBe('PHV');
  });

  it('AN (jälki-PHV) → ei PHV-rajaa (ennallaan; ikäraja ainoa)', () => {
    const r = P.laskeEfektiivinenStage(95, 'AN', 17, null);
    expect(r.stage).toBe(5);
    expect(r.rajattu).toBe(false);
  });

  it("PR C: 'tuntematon' → SAMA raja kuin PH (max S2), mutta EI PHV-syytä eikä kasvupyrähdyspuhetta", () => {
    // Ennen PR C:tä puuttuva tila oli 'AN' → ei rajaa. Sääntö 3: tuntematon = varovaisin kuorma.
    const r = P.laskeEfektiivinenStage(95, 'tuntematon', 17, null);
    expect(r.stage).toBe(2);
    expect(r.rajattu).toBe(true);
    expect(r.rajoitusSyy).not.toBe('PHV');
    expect(r.perusteKielella.pelaaja).not.toMatch(/kasvat nopeasti/i);
    expect(JSON.stringify(r.perusteKielella)).not.toMatch(/PHV|kasvupyräh/i);
  });

  // Päätös B (4.10.2026): kutsujat antavat KUORMATILAN (tmPhvKuormaTila). null = mittaamaton IKKUNAN ULKOPUOLELLA →
  // normaali ikävaiheen kuorma (ei S2-kattoa). Aiempi PR C -odotus (null → S2) muutettu tämän mukaiseksi.
  it("päätös B: null/undefined (= mittaamaton ikäikkunan ulkopuolella) → EI PHV-kattoa, vain ikäportit", () => {
    expect(P.laskeEfektiivinenStage(95, null, 17, null).stage).toBe(5);
    expect(P.laskeEfektiivinenStage(95, undefined, 17, null).stage).toBe(5);
    expect(P.laskeEfektiivinenStage(95, null, 13, null).stage).toBe(3);   // alle 14 v ikäportti ennallaan
  });
});

describe('koostaProfiili — phvTila pelaajadokumentista', () => {
  it("PR C + päätös B: ei phv_tila:a, ikäikkunassa (13 v) → 'tuntematon' → varovaisin raja", () => {
    const pr = P.koostaProfiili(Object.assign({ ika: 13 }, FLEI_KORKEA));
    expect(pr.phvTila).toBe('tuntematon');
    expect(pr.stageKokonais.stage).toBe(2);   // varovaisin raja
  });
  it("päätös B: ei phv_tila:a, ikkunan ulkopuolella (17 v) → normaali kuorma (ei 'tuntematon'-kattoa)", () => {
    const pr = P.koostaProfiili(Object.assign({ ika: 17 }, FLEI_KORKEA));
    expect(pr.phvTila).toBe(null);
    expect(pr.stageKokonais.stage).toBe(5);
  });

  it("PR C: phv_tila 'AN' ILMAN mittausta → 'tuntematon' (Topiaksen tapaus), ei jälki-PHV:tä eikä pre-PHV:tä", () => {
    const pr = P.koostaProfiili(Object.assign({ ika: 13, phv_tila: 'AN' }, FLEI_KORKEA));
    expect(pr.phvTila).toBe('tuntematon');
  });

  it('Mirwald-mitattu AN → AN (jälki-PHV), ei PHV-rajaa', () => {
    const pr = P.koostaProfiili(Object.assign({ ika: 17 }, FLEI_KORKEA, mitattu('AN')));
    expect(pr.phvTila).toBe('AN');
    expect(pr.stageKokonais.stage).toBe(5);
  });

  it('mitattu PH → PH, max S2 + PHV-syy', () => {
    const pr = P.koostaProfiili(Object.assign({ ika: 17 }, FLEI_KORKEA, mitattu('PH')));
    expect(pr.phvTila).toBe('PH');
    expect(pr.stageKokonais.stage).toBe(2);
    expect(pr.stageKokonais.rajoitusSyy).toBe('PHV');
  });

  it('PR C: lomakkeelta ilmoitettu PH (ei mittausta) → tuntematon, kuorma EI kevene (max S2 säilyy)', () => {
    const pr = P.koostaProfiili(Object.assign({ ika: 17, phv_tila: 'PH' }, FLEI_KORKEA));
    expect(pr.phvTila).toBe('tuntematon');
    expect(pr.stageKokonais.stage).toBe(2);
  });
});

describe('generoimYksilo — PH-ohjeet', () => {
  const ohjeet = (pel) => {
    const o = R.generoimYksilo(Object.assign({ etunimi: 'X', ika: 16 }, pel), { paiva: new Date(2026, 9, 5) });
    return Object.values(o.viikko).flatMap((d) => d.blokit).map((b) => b.ohje).join('\n');
  };
  it('mitattu PH → PH-variantit käytössä', () => {
    expect(ohjeet(Object.assign({ flei_ketjut: { SBL: 30, SFL: 90, LL: 90, DIAG: 90, DFL: 90 } }, mitattu('PH')))).toMatch(/Naruhypyt 2×10s kevyesti/);
  });
  it('PR C + päätös B: tuntematon IKÄIKKUNASSA (13 v) → varovaiset variantit, mutta ei PHV-mainintaa ohjeissa', () => {
    const t = ohjeet({ ika: 13, flei_ketjut: { SBL: 30, SFL: 90, LL: 90, DIAG: 90, DFL: 90 } });
    expect(t).toMatch(/Naruhypyt 2×10s kevyesti/);
    expect(t).not.toMatch(/PHV/);
  });
  it('päätös B: mittaamaton ikkunan ulkopuolella (16 v) → normaalit ohjeet', () => {
    expect(ohjeet({ flei_ketjut: { SBL: 30, SFL: 90, LL: 90, DIAG: 90, DFL: 90 } })).not.toMatch(/Naruhypyt 2×10s kevyesti/);
  });
  it('PR C: tuntematon + heikoin DFL → "paras PHV:ssä" -variantit EIVÄT tule ohjeisiin (= normaali ohje)', () => {
    const t = ohjeet({ flei_ketjut: { SBL: 90, SFL: 90, LL: 90, DIAG: 90, DFL: 30 } });
    expect(t).not.toMatch(/PHV/);
    const ph = ohjeet(Object.assign({ flei_ketjut: { SBL: 90, SFL: 90, LL: 90, DIAG: 90, DFL: 30 } }, mitattu('PH')));
    expect(ph).toMatch(/PHV/);   // mitattu PH saa PH-variantin sellaisenaan (ennallaan)
  });
  it('mitattu POST → normaalit ohjeet', () => {
    expect(ohjeet(Object.assign({ flei_ketjut: { SBL: 30, SFL: 90, LL: 90, DIAG: 90, DFL: 90 } }, mitattu('POST')))).not.toMatch(/Naruhypyt 2×10s kevyesti/);
  });
});

describe('generoimPreHarkka — joukkueen kuormarajoitin', () => {
  const flei = { flei_ketjut: { SBL: 95, SFL: 95, LL: 90, DIAG: 95, DFL: 95 } };
  const joukkue = (lista) => ({ nimi: 'T', pelaajat: lista.map((x) => Object.assign({ ika: 17 }, flei, x)) });

  it('3+ mitattua PH → phvRajoitus + PH-muistutus (ennallaan)', () => {
    const r = R.generoimPreHarkka(joukkue([mitattu('PH'), mitattu('PH'), mitattu('PH'), mitattu('POST')]), { paiva: new Date(2026, 9, 5) });
    expect(r.phvRajoitus).toBe(true);
    expect(r.blokit[1].phv_muistutus).toMatch(/PHV-pelaajaa/);
    expect(r.blokit[1].stage).toBeLessThanOrEqual(2);
  });

  it('kaikki mitattu POST/AN → ei rajaa, ei muistutusta', () => {
    const r = R.generoimPreHarkka(joukkue([mitattu('POST'), mitattu('AN'), mitattu('AN'), mitattu('POST')]), { paiva: new Date(2026, 9, 5) });
    expect(r.phvRajoitus).toBe(false);
    expect(r.blokit[1].phv_muistutus).toBe(null);
    expect(r.blokit[1].stage).toBeGreaterThan(2);
  });

  it("PR C: tuntematon/puuttuva EI ole 'AN' → varovaisin raja (max S2), mutta EI PH-varoitustekstiä", () => {
    // Ennen: phvTila = phvRajoitus ? 'PH' : 'AN' → mittaamaton joukkue sai täyden kuorman.
    // Päätös B: joukkue ikäikkunassa (13 v) → mittaamattomat saavat varovaisimman rajan.
    const r = R.generoimPreHarkka(joukkue([{ ika: 13 }, { ika: 13, phv_tila: 'AN' }, { ika: 13, phv_tila: 'PH' }, { ika: 13 }]), { paiva: new Date(2026, 9, 5) });
    expect(r.phvRajoitus).toBe(false);          // ei MITATTUA PH-ryhmää
    expect(r.varovainenKuorma).toBe(true);
    expect(r.phvLkm).toBe(0);
    expect(r.blokit[1].stage).toBeLessThanOrEqual(2);
    expect(r.blokit[2].stage).toBeLessThanOrEqual(2);
    for (const b of r.blokit) {
      expect(b.phv_muistutus || null).toBe(null);
      expect(String(b.ohje || '')).not.toMatch(/PHV/);
    }
  });

  it('päätös B: mittaamaton joukkue IKKUNAN ULKOPUOLELLA (17 v) → normaali kuorma, ei PH-muistutusta', () => {
    const r = R.generoimPreHarkka(joukkue([{}, {}, {}, {}]), { paiva: new Date(2026, 9, 5) });
    expect(r.varovainenKuorma).toBe(false);
    expect(r.blokit[1].stage).toBeGreaterThan(2);
    expect(r.blokit[1].phv_muistutus || null).toBe(null);
  });

  it('PR C: lomakkeelta ilmoitetut PH:t lasketaan erikseen henkilökunnalle (phvIlmoitettuLkm), ei PH-hälytykseksi', () => {
    const r = R.generoimPreHarkka(joukkue([{ phv_tila: 'PH' }, { phv_tila: 'PH' }, { phv_tila: 'PH' }, mitattu('POST')]), { paiva: new Date(2026, 9, 5) });
    expect(r.phvLkm).toBe(0);
    expect(r.phvIlmoitettuLkm).toBe(3);
    expect(r.phvRajoitus).toBe(false);
    expect(r.varovainenKuorma).toBe(true);     // 3 tuntematonta → varovaisin raja silti
  });
});
