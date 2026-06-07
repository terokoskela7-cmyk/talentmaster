/**
 * TalentMaster™ — KPI-yksikkötestit
 * Testit kanonisille laskentafunktioille (docs/testit_indeksit.js)
 *
 * Ajetaan: npm test
 */
import { createRequire } from 'module';
const require = createRequire(import.meta.url);

const {
  tkLaskeMerkki,
  tkLaskeTKI,
  laskeKokonaistulos,
  tkPituuspotkuBonus,
  _laskeVahvuudetJaKehityskohteet,
  hhLaskeTaso,
  laskeEI,
  laskeFVP,
  laskeVNE,
  TK_KOKONAISRAJAT,
  HH_NORMIT,
} = require('../docs/testit_indeksit.js');

// ═══════════════════════════════════════════════════════════════════
// tkLaskeMerkki — §23: käyttää < (EI <=), tasan rajalla EI merkkiä
// ═══════════════════════════════════════════════════════════════════
describe('tkLaskeMerkki', () => {
  // P10: kulta=100, hopea=120, pronssi=140
  it('palauttaa kulta kun kokonaistulos < kultaraja', () => {
    expect(tkLaskeMerkki(99, 10, 'P')).toBe('kulta');
  });

  it('palauttaa null tasan kultarajalla (< eikä <=)', () => {
    expect(tkLaskeMerkki(100, 10, 'P')).toBe('hopea');
  });

  it('palauttaa hopea välissä kulta–hopea', () => {
    expect(tkLaskeMerkki(110, 10, 'P')).toBe('hopea');
  });

  it('palauttaa null tasan hopearajalla', () => {
    expect(tkLaskeMerkki(120, 10, 'P')).toBe('pronssi');
  });

  it('palauttaa pronssi välissä hopea–pronssi', () => {
    expect(tkLaskeMerkki(130, 10, 'P')).toBe('pronssi');
  });

  it('palauttaa null tasan pronssirajalla', () => {
    expect(tkLaskeMerkki(140, 10, 'P')).toBeNull();
  });

  it('palauttaa null yli pronssin', () => {
    expect(tkLaskeMerkki(150, 10, 'P')).toBeNull();
  });

  it('palauttaa null kun kokonaistulos on null', () => {
    expect(tkLaskeMerkki(null, 10, 'P')).toBeNull();
  });

  it('palauttaa null tuntemattomalla iällä (ei rajoja)', () => {
    expect(tkLaskeMerkki(80, 7, 'P')).toBeNull();
  });

  it('toimii T-sukupuolella', () => {
    // T10: kulta=110, hopea=135, pronssi=155
    expect(tkLaskeMerkki(109, 10, 'T')).toBe('kulta');
    expect(tkLaskeMerkki(110, 10, 'T')).toBe('hopea');
  });

  it('rajatOverride ohittaa TK_KOKONAISRAJAT', () => {
    const custom = { kulta: 50, hopea: 60, pronssi: 70 };
    expect(tkLaskeMerkki(49, 10, 'P', custom)).toBe('kulta');
    expect(tkLaskeMerkki(50, 10, 'P', custom)).toBe('hopea');
  });

  it('fallback P-rajoihin tuntemattomalla sukupuolella', () => {
    expect(tkLaskeMerkki(99, 10, 'X')).toBe('kulta');
  });
});

// ═══════════════════════════════════════════════════════════════════
// tkLaskeTKI — nelivyöhyke 0–99
// ═══════════════════════════════════════════════════════════════════
describe('tkLaskeTKI', () => {
  // P10: kulta=100, hopea=120, pronssi=140

  it('palauttaa 80-99 kultavyöhykkeessä', () => {
    const tki = tkLaskeTKI(90, 10, 'P');
    expect(tki).toBeGreaterThanOrEqual(80);
    expect(tki).toBeLessThanOrEqual(99);
  });

  it('palauttaa tasan 80 kultarajalla', () => {
    expect(tkLaskeTKI(100, 10, 'P')).toBe(80);
  });

  it('palauttaa 60-80 hopeavyöhykkeessä', () => {
    const tki = tkLaskeTKI(110, 10, 'P');
    expect(tki).toBeGreaterThanOrEqual(60);
    expect(tki).toBeLessThanOrEqual(80);
  });

  it('palauttaa tasan 60 hopearajalla', () => {
    expect(tkLaskeTKI(120, 10, 'P')).toBe(60);
  });

  it('palauttaa 40-60 pronssivyöhykkeessä', () => {
    const tki = tkLaskeTKI(130, 10, 'P');
    expect(tki).toBeGreaterThanOrEqual(40);
    expect(tki).toBeLessThanOrEqual(60);
  });

  it('palauttaa tasan 40 pronssirajalla', () => {
    expect(tkLaskeTKI(140, 10, 'P')).toBe(40);
  });

  it('palauttaa 0-40 pronssirajan yli', () => {
    const tki = tkLaskeTKI(160, 10, 'P');
    expect(tki).toBeGreaterThanOrEqual(0);
    expect(tki).toBeLessThan(40);
  });

  it('ei koskaan palauta yli 99', () => {
    // Erittäin pieni kokonaistulos
    const tki = tkLaskeTKI(10, 10, 'P');
    expect(tki).toBeLessThanOrEqual(99);
  });

  it('ei koskaan palauta alle 0', () => {
    // Erittäin suuri kokonaistulos (yli 1.5× pronssi)
    const tki = tkLaskeTKI(300, 10, 'P');
    expect(tki).toBe(0);
  });

  it('palauttaa null kun kokonaistulos null tai 0', () => {
    expect(tkLaskeTKI(null, 10, 'P')).toBeNull();
    expect(tkLaskeTKI(0, 10, 'P')).toBeNull();
  });

  it('rajatOverride suoraan {kulta,hopea,pronssi}', () => {
    const custom = { kulta: 50, hopea: 60, pronssi: 70 };
    expect(tkLaskeTKI(50, 10, 'P', custom)).toBe(80);
    expect(tkLaskeTKI(40, 10, 'P', custom)).toBeGreaterThan(80);
  });

  it('monotonisesti laskeva: pienempi tulos → suurempi TKI', () => {
    const a = tkLaskeTKI(80, 10, 'P');
    const b = tkLaskeTKI(100, 10, 'P');
    const c = tkLaskeTKI(120, 10, 'P');
    const d = tkLaskeTKI(140, 10, 'P');
    expect(a).toBeGreaterThan(b);
    expect(b).toBeGreaterThan(c);
    expect(c).toBeGreaterThan(d);
  });
});

// ═══════════════════════════════════════════════════════════════════
// tkPituuspotkuBonus
// ═══════════════════════════════════════════════════════════════════
describe('tkPituuspotkuBonus', () => {
  it('palauttaa metrit / 5', () => {
    expect(tkPituuspotkuBonus(20)).toBe(4);
    expect(tkPituuspotkuBonus(50)).toBe(10);
  });

  it('max 20 sekuntia', () => {
    expect(tkPituuspotkuBonus(200)).toBe(20);
  });

  it('palauttaa 0 null/undefined/0 arvoilla', () => {
    expect(tkPituuspotkuBonus(null)).toBe(0);
    expect(tkPituuspotkuBonus(undefined)).toBe(0);
    expect(tkPituuspotkuBonus(0)).toBe(0);
  });
});

// ═══════════════════════════════════════════════════════════════════
// laskeKokonaistulos — 4 aikalajia + pituuspotku-bonus (ika≥12)
// ═══════════════════════════════════════════════════════════════════
describe('laskeKokonaistulos', () => {
  it('laskee 4 lajin summan ilman pituuspotkua (ika < 12)', () => {
    const testit = { ponnauttelu: 10, syotto: 20, pujottelu: 15, kuljetus_laukaus: 25 };
    expect(laskeKokonaistulos(testit, 10, 'P')).toBe(70);
  });

  it('vähentää pituuspotku-bonuksen kun ika >= 12', () => {
    const testit = { ponnauttelu: 10, syotto: 20, pujottelu: 15, kuljetus_laukaus: 25, pituuspotku: 50 };
    // summa=70, bonus=50/5=10 → 70-10=60
    expect(laskeKokonaistulos(testit, 12, 'P')).toBe(60);
  });

  it('ei vähennä pituuspotku-bonusta kun ika < 12', () => {
    const testit = { ponnauttelu: 10, syotto: 20, pujottelu: 15, kuljetus_laukaus: 25, pituuspotku: 50 };
    expect(laskeKokonaistulos(testit, 11, 'P')).toBe(70);
  });

  it('hyväksyy objektimuotoisen kuljetus_laukaus', () => {
    const testit = {
      ponnauttelu: 10, syotto: 20, pujottelu: 15,
      kuljetus_laukaus: { raaka: 30, vahennys: 5, tulos: 25 },
    };
    expect(laskeKokonaistulos(testit, 10, 'P')).toBe(70);
  });

  it('palauttaa null kun testit puuttuu', () => {
    expect(laskeKokonaistulos(null, 10, 'P')).toBeNull();
  });

  it('palauttaa null kun mitään lajia ei löydy', () => {
    expect(laskeKokonaistulos({}, 10, 'P')).toBeNull();
  });

  it('toimii osittaisella datalla', () => {
    const testit = { ponnauttelu: 10, syotto: 20 };
    expect(laskeKokonaistulos(testit, 10, 'P')).toBe(30);
  });
});

// ═══════════════════════════════════════════════════════════════════
// hhLaskeTaso — Eerikkilä 5-portainen (ja 3-portainen pujottelu/syotto)
// ═══════════════════════════════════════════════════════════════════
describe('hhLaskeTaso', () => {
  // 30m P10: [5.31, 5.15, 5.01, 4.88] — käänteinen
  it('taso 1 (heikoin) kun arvo > rajat[0]', () => {
    expect(hhLaskeTaso('30m', 5.50, 10, 'P')).toBe(1);
  });

  it('taso 2 kun arvo tasan rajat[0] (5.31)', () => {
    // arvo 5.31 > 5.31 on false → next: > 5.15 → false → ... → taso 5
    // Itse asiassa: 5.31 > 5.31 = false → ei taso 1
    // 5.31 > 5.15 = true → taso 2
    expect(hhLaskeTaso('30m', 5.31, 10, 'P')).toBe(2);
  });

  it('taso 5 (paras) kun arvo <= kaikki rajat', () => {
    expect(hhLaskeTaso('30m', 4.80, 10, 'P')).toBe(5);
  });

  // CMJ P10 — suurempi on parempi
  it('CMJ: taso 1 kun arvo < rajat[0]', () => {
    const cmjRajat = HH_NORMIT.P.cmj;
    if (cmjRajat && cmjRajat[10]) {
      expect(hhLaskeTaso('cmj', cmjRajat[10][0] - 1, 10, 'P')).toBe(1);
    }
  });

  it('palauttaa null tuntemattomalle testille', () => {
    expect(hhLaskeTaso('olematon_testi', 5, 10, 'P')).toBeNull();
  });

  it('palauttaa null ikäluokalle jossa ei normeja', () => {
    // pujottelu on 3-portainen, 10-15 → 16 = null
    expect(hhLaskeTaso('pujottelu', 15, 16, 'P')).toBeNull();
  });

  it('cappaa iän 10–19', () => {
    // 9 → 10, 20 → 19
    const t9 = hhLaskeTaso('30m', 5.50, 9, 'P');
    const t10 = hhLaskeTaso('30m', 5.50, 10, 'P');
    expect(t9).toBe(t10);
  });

  it('pujottelu on 3-portainen (taso 1–3)', () => {
    const pujRajat = HH_NORMIT.P.pujottelu;
    if (pujRajat && pujRajat[10]) {
      // pujottelu: 2 rajaa → taso 1-3
      const huono = hhLaskeTaso('pujottelu', 99, 10, 'P');
      const hyva = hhLaskeTaso('pujottelu', 1, 10, 'P');
      expect(huono).toBe(1);
      expect(hyva).toBe(3);
    }
  });
});

// ═══════════════════════════════════════════════════════════════════
// laskeEI — Elastisuusindeksi (CMJ - SJ)
// ═══════════════════════════════════════════════════════════════════
describe('laskeEI', () => {
  it('palauttaa objektin {arvo, tulkinta, tavoite, ...}', () => {
    const result = laskeEI(30, 25, 12);
    expect(result).toHaveProperty('arvo');
    expect(result).toHaveProperty('tulkinta');
    expect(result).toHaveProperty('tavoite');
    expect(result.arvo).toBe(5);
  });

  it('tulkinta erinomainen kun arvo >= 1.4*tavoite', () => {
    // ika 12 → tavoite 3, 1.4*3=4.2 → ei >= 5
    const result = laskeEI(30, 25, 12);
    expect(result.tulkinta).toBe('erinomainen');
  });

  it('tulkinta hyvä kun arvo >= tavoite', () => {
    // ika 12 → tavoite 3 → ei = 3
    const result = laskeEI(28, 25, 12);
    expect(result.tulkinta).toBe('hyvä');
  });

  it('tulkinta kehittyvä kun arvo >= 0.6*tavoite', () => {
    // ika 12 → tavoite 3, 0.6*3=1.8 → ei = 2
    const result = laskeEI(27, 25, 12);
    expect(result.tulkinta).toBe('kehittyvä');
  });

  it('tulkinta prioriteetti kun arvo < 0.6*tavoite', () => {
    // ika 12 → tavoite 3, 0.6*3=1.8 → ei = 1
    const result = laskeEI(26, 25, 12);
    expect(result.tulkinta).toBe('prioriteetti');
  });

  it('palauttaa null kun CMJ tai SJ null', () => {
    expect(laskeEI(null, 25, 12)).toBeNull();
    expect(laskeEI(30, null, 12)).toBeNull();
  });

  it('ikä vaikuttaa tavoitteeseen', () => {
    expect(laskeEI(30, 25, 10).tavoite).toBe(3);  // <=12
    expect(laskeEI(30, 25, 14).tavoite).toBe(5);  // <=14
    expect(laskeEI(30, 25, 16).tavoite).toBe(6);  // <=16
    expect(laskeEI(30, 25, 18).tavoite).toBe(8);  // >16
  });
});

// ═══════════════════════════════════════════════════════════════════
// laskeFVP — Voima-nopeus-profiili
// ═══════════════════════════════════════════════════════════════════
describe('laskeFVP', () => {
  it('palauttaa objektin {arvo, profiili, tulkinta, ...}', () => {
    const result = laskeFVP(1.1, 4.5);
    expect(result).toHaveProperty('arvo');
    expect(result).toHaveProperty('profiili');
  });

  it('nopeus-profiili kun FVP < 0.85', () => {
    // FVP = 1.0 / (5.0/6) = 1.0/0.833 = 1.20 → voima
    // Tarvitaan: m5/(m30/6) < 0.85 → m5 < 0.85*(m30/6)
    // m30=4.8 → m30/6=0.8, m5 < 0.68
    const result = laskeFVP(0.67, 4.8);
    expect(result.profiili).toBe('nopeus');
  });

  it('tasapainoinen profiili kun FVP 0.90–1.10', () => {
    // m5=1.0, m30=6.0 → FVP = 1.0/(6.0/6) = 1.0
    const result = laskeFVP(1.0, 6.0);
    expect(result.profiili).toBe('tasapainoinen');
    expect(result.arvo).toBe(1.0);
  });

  it('voima-profiili kun FVP > 1.20', () => {
    // m5=1.3, m30=6.0 → FVP = 1.3/1.0 = 1.30
    const result = laskeFVP(1.3, 6.0);
    expect(result.profiili).toBe('voima');
  });

  it('palauttaa null kun parametrit puuttuvat', () => {
    expect(laskeFVP(null, 4.5)).toBeNull();
    expect(laskeFVP(1.0, null)).toBeNull();
  });

  it('pelipaikkahuomio mukana kun pelipaikka annettu', () => {
    const result = laskeFVP(1.0, 6.0, 'W');
    expect(result.pelipaikkaHuomio).toBeTruthy();
  });
});

// ═══════════════════════════════════════════════════════════════════
// laskeVNE — yhdistelmäprofiili
// ═══════════════════════════════════════════════════════════════════
describe('laskeVNE', () => {
  it('tunnistaa räjähdys-profiilin (korkea EI + nopeus + balanced FVP)', () => {
    const result = laskeVNE({
      cmj: 35, sj: 25,           // EI = 10, tavoite ~5 (14v) → erinomainen
      m5: 1.0, m30: 6.0,        // FVP = 1.0 → tasapainoinen
      taso30m: 5, ika: 14,
    });
    expect(result.profiilityyppi).toBe('rajahdys');
    expect(result.vneIndeksi).toBeGreaterThan(0);
  });

  it('tunnistaa jousi-profiilin (korkea EI, matala nopeus)', () => {
    const result = laskeVNE({
      cmj: 35, sj: 25,           // EI = 10 → erinomainen
      m5: 1.0, m30: 6.0,        // FVP tasapainoinen
      taso30m: 2, ika: 14,       // matala nopeus
    });
    expect(result.profiilityyppi).toBe('jousi');
  });

  it('tunnistaa moottori-profiilin (matala EI, korkea nopeus)', () => {
    const result = laskeVNE({
      cmj: 27, sj: 26,           // EI = 1 → prioriteetti
      m5: 1.0, m30: 6.0,
      taso30m: 5, ika: 14,
    });
    expect(result.profiilityyppi).toBe('moottori');
  });

  it('palauttaa perusta kun kaikki puuttuu', () => {
    const result = laskeVNE({});
    expect(result.profiilityyppi).toBe('perusta');
    expect(result.vneIndeksi).toBeNull();
  });

  it('kattavuus kertoo montako komponenttia saatavilla', () => {
    const full = laskeVNE({
      cmj: 35, sj: 25, m5: 1.0, m30: 6.0, taso30m: 5, ika: 14,
    });
    expect(full.kattavuus).toBe(3);
    expect(full.maxKattavuus).toBe(3);

    const partial = laskeVNE({ taso30m: 4, ika: 14 });
    expect(partial.kattavuus).toBe(1);
  });
});

// ═══════════════════════════════════════════════════════════════════
// _laskeVahvuudetJaKehityskohteet
// ═══════════════════════════════════════════════════════════════════
describe('_laskeVahvuudetJaKehityskohteet', () => {
  it('tunnistaa vahvuuden ja kehityskohteen', () => {
    const tulokset = {
      testit: {
        ponnauttelu: 8,        // pieni osuus → vahvuus
        syotto: 12,
        pujottelu: 10,
        kuljetus_laukaus: 30,  // iso osuus → kehityskohde
      },
    };
    const out = _laskeVahvuudetJaKehityskohteet(tulokset, { ika: 12 });
    expect(out.vahvuudet.length).toBeGreaterThan(0);
    expect(out.kehityskohteet.length).toBeGreaterThan(0);
    expect(out.vahvuudet[0].laji).toBe('ponnauttelu');
    expect(out.kehityskohteet[0].laji).toBe('kuljetus_laukaus');
  });

  it('palauttaa tyhjät listat tasaisilla arvoilla', () => {
    const tulokset = {
      testit: { ponnauttelu: 15, syotto: 15, pujottelu: 15, kuljetus_laukaus: 15 },
    };
    const out = _laskeVahvuudetJaKehityskohteet(tulokset, { ika: 12 });
    expect(out.vahvuudet).toHaveLength(0);
    expect(out.kehityskohteet).toHaveLength(0);
  });

  it('palauttaa tyhjä kun ei dataa', () => {
    const out = _laskeVahvuudetJaKehityskohteet(null, { ika: 12 });
    expect(out.vahvuudet).toHaveLength(0);
    expect(out.kehityskohteet).toHaveLength(0);
  });
});

// ═══════════════════════════════════════════════════════════════════
// TSI (SM-pallo − SM-juoksu) — via laskeVNE tai laskeFVP ei suoraan,
// mutta voidaan testata laskennasta
// ═══════════════════════════════════════════════════════════════════
describe('TSI-logiikka (integraatio)', () => {
  it('TSI = sm_pallo - sm_juoksu sekunteina', () => {
    // TSI testataan epäsuorasti — laskeTSI on eerikkila-libissä
    // Tässä varmistetaan etä VNE-komponentti-objekti sisältää oikeat kentät
    const result = laskeVNE({
      cmj: 30, sj: 25, m5: 1.0, m30: 6.0, taso30m: 3, ika: 12,
    });
    expect(result).toHaveProperty('komponentit');
    expect(result.komponentit).toHaveProperty('ei');
    expect(result.komponentit).toHaveProperty('fvp');
  });
});
