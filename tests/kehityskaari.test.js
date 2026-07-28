// Trendi Vaihe 2 — Kehityskaari render-ydin (lib/tm_kehityskaari.js, PURE).
// L2: suunta pienempi_parempi:stä · kehitysnopeus Δ/Δt · taso raaka+laskeFn · testijoukko-agnostisuus.
import { describe, it, expect } from 'vitest';
const K = require('../lib/tm_kehityskaari.js');

// Aleksi Rajala (Sibbo) -kaltainen historia: 30m paranee (aika laskee), ketteryys paranee.
const HIST = [
  { pvm: '2024-04-10', lin30m: 6.18, kasirata: 8.21 },
  { pvm: '2024-10-05', lin30m: 5.72, kasirata: 7.71 },
  { pvm: '2025-05-13', lin30m: 5.33, kasirata: 7.60 },
  { pvm: '2025-10-20', lin30m: 5.38, kasirata: 7.34 },
];

describe('tmKaariMitatutAvaimet — testijoukko-agnostinen', () => {
  it('vain mitatut numeeriset avaimet (pvm pois)', () => {
    expect(K.tmKaariMitatutAvaimet(HIST).sort()).toEqual(['kasirata', 'lin30m']);
  });
  it('union yli pisteiden — SJK-tyylinen eri testijoukko', () => {
    const h = [{ pvm: '2025-01-01', lin10m: 2.1, cmj: 28 }, { pvm: '2025-06-01', lin10m: 2.0, sm_juoksu: 3.1 }];
    expect(K.tmKaariMitatutAvaimet(h).sort()).toEqual(['cmj', 'lin10m', 'sm_juoksu']);
  });
  it('ei fabrikoi null-avaimia / graceful tyhjä', () => {
    expect(K.tmKaariMitatutAvaimet([{ pvm: 'x', lin30m: null }])).toEqual([]);
    expect(K.tmKaariMitatutAvaimet([])).toEqual([]);
    expect(K.tmKaariMitatutAvaimet(null)).toEqual([]);
  });
});

describe('tmKaariSarja — pvm-järjestys, vain avaimen pisteet', () => {
  it('poimii oikean avaimen nousevassa pvm-järjestyksessä', () => {
    const s = K.tmKaariSarja(HIST, 'lin30m');
    expect(s.map(p => p.arvo)).toEqual([6.18, 5.72, 5.33, 5.38]);
  });
  it('ohittaa pisteet joilta avain puuttuu', () => {
    const h = [{ pvm: '2025-01-01', lin30m: 6.0 }, { pvm: '2025-06-01', cmj: 30 }];
    expect(K.tmKaariSarja(h, 'lin30m').length).toBe(1);
  });
});

describe('tmKaariSuunta — pienempi_parempi:stä (aikatesti pienempi=parempi)', () => {
  it('30m 6.18→5.38 = PARANNUS (up), vaikka raaka-arvo laskee', () => {
    const s = K.tmKaariSuunta('lin30m', K.tmKaariSarja(HIST, 'lin30m'));
    expect(s.suunta).toBe('up');
    expect(s.parani).toBe(true);
    expect(s.delta).toBeCloseTo(-0.8, 5);
  });
  it('suurempi_parempi (cmj) nousu = parannus', () => {
    const s = K.tmKaariSuunta('cmj', [{ ms: 1, arvo: 25 }, { ms: 2, arvo: 30 }]);
    expect(s.suunta).toBe('up'); expect(s.parani).toBe(true);
  });
  it('suurempi_parempi (cmj) lasku = huononnus', () => {
    const s = K.tmKaariSuunta('cmj', [{ ms: 1, arvo: 30 }, { ms: 2, arvo: 25 }]);
    expect(s.suunta).toBe('down'); expect(s.parani).toBe(false);
  });
  it('aikatesti nousu (hidastui) = huononnus (down)', () => {
    const s = K.tmKaariSuunta('lin30m', [{ ms: 1, arvo: 5.0 }, { ms: 2, arvo: 5.4 }]);
    expect(s.suunta).toBe('down'); expect(s.parani).toBe(false);
  });
  it('<2 pistettä → flat / parani null', () => {
    expect(K.tmKaariSuunta('lin30m', [{ ms: 1, arvo: 5 }]).parani).toBe(null);
  });
});

describe('tmKaariNopeus — Δ/Δt päivätyistä pisteistä', () => {
  it('30m nopeus per vuosi + kausi', () => {
    const n = K.tmKaariNopeus(K.tmKaariSarja(HIST, 'lin30m'));
    // Δ = 5.38 − 6.18 = −0.80 yli ~1.53 v → ~−0.52/v, ~−0.26/kausi
    expect(n.delta).toBeCloseTo(-0.8, 5);
    expect(n.dtVuodet).toBeGreaterThan(1.4);
    expect(n.perVuosi).toBeLessThan(0);
    expect(n.perKausi).toBeCloseTo(n.perVuosi / 2, 5);
  });
  it('Δt=0 (sama pvm) → null', () => {
    expect(K.tmKaariNopeus([{ ms: 100, arvo: 5 }, { ms: 100, arvo: 4 }])).toBe(null);
  });
  it('<2 pistettä → null', () => {
    expect(K.tmKaariNopeus([{ ms: 1, arvo: 5 }])).toBe(null);
  });
});

describe('tmKaariTasoSarja — raaoista laskeFn:llä (johdonmukainen kortin kanssa)', () => {
  it('käyttää laskeFn:ää (raaka+ikä → taso), ei tallennettua', () => {
    // laskeFn simuloi eerikkilä-tasoa: nopeampi 30m → korkeampi taso
    const laskeFn = (pt) => pt.lin30m <= 5.4 ? 4 : pt.lin30m <= 5.8 ? 3 : 2;
    const ts = K.tmKaariTasoSarja(HIST, 'd1_taso', laskeFn);
    expect(ts.map(x => x.taso)).toEqual([2, 3, 4, 4]);
  });
  it('fallback tallennettuun tasoon jos laskeFn puuttuu', () => {
    const h = [{ pvm: '2025-01-01', d1_taso: 2 }, { pvm: '2025-06-01', d1_taso: 3 }];
    expect(K.tmKaariTasoSarja(h, 'd1_taso').map(x => x.taso)).toEqual([2, 3]);
  });
  it('ohittaa pisteet joilta taso puuttuu kokonaan', () => {
    const h = [{ pvm: '2025-01-01' }, { pvm: '2025-06-01', d1_taso: 3 }];
    expect(K.tmKaariTasoSarja(h, 'd1_taso').length).toBe(1);
  });
});

describe('tmKaariKattavuusOk / jaksot', () => {
  it('<2 pistettä → kattavuus false', () => {
    expect(K.tmKaariKattavuusOk([{ arvo: 1 }])).toBe(false);
    expect(K.tmKaariKattavuusOk(K.tmKaariSarja(HIST, 'lin30m'))).toBe(true);
  });
  it('tmKaariJaksot poimii vain alkoi-pvm:lliset, uusin ensin', () => {
    const jh = [
      { konsepti_nimi: 'Kiihdytys', domeeni: 'fyysinen', alkoi: '2024-02-01', paattyi: '2024-03-15', tulos: 'parani' },
      { konsepti_nimi: 'Syöttö', domeeni: 'teknis_taktinen' },   // ei alkoi → pois
      { konsepti_nimi: 'Ketteryys', domeeni: 'fyysinen', alkoi: '2025-01-10', paattyi: '2025-03-01' },
    ];
    const j = K.tmKaariJaksot(jh);
    expect(j.map(x => x.nimi)).toEqual(['Ketteryys', 'Kiihdytys']);
  });
  it('render näyttää raaka-arvot max 2 desimaaliin (6.179→6.18, ei 3 des)', () => {
    const p = { hh_historia: [{ pvm: '2024-04-10', lin30m: 6.179 }, { pvm: '2025-10-20', lin30m: 5.377 }] };
    const html = K.tmKaariRenderFull(p, { phvTila: null });
    expect(html).toContain('6.18');
    expect(html).toContain('5.38');
    expect(html).not.toContain('6.179');
    expect(html).not.toContain('5.377');
  });

  it('tasainen arvo (Δ=0) → neutraali →, EI punaista ↓', () => {
    // ponnauttelu on aikalaji (pienempi=parempi), mutta 40→40 = flat, ei lasku
    const p = { tki_historia: [{ pvm: '2024-04-10', ponnauttelu: 40 }, { pvm: '2025-04-10', ponnauttelu: 40 }] };
    const html = K.tmKaariRenderFull(p, { phvTila: null });
    expect(html).toContain('→');
    expect(html).not.toContain('↓');
    expect(html).not.toContain('#C94040');   // punainen lasku-väri ei saa esiintyä flatilla
    // tmKaariSuunta-sopimus ennallaan (vitestit nojaavat)
    expect(K.tmKaariSuunta('ponnauttelu', K.tmKaariSarja(p.tki_historia, 'ponnauttelu')).suunta).toBe('flat');
  });

  it('ponnauttelu on aikalaji (pienempi=parempi) — ennallaan', () => {
    expect(K.tmKaariPienempiParempi('ponnauttelu')).toBe(true);
    const s = K.tmKaariSuunta('ponnauttelu', [{ ms: 1, arvo: 44 }, { ms: 2, arvo: 40 }]);
    expect(s.parani).toBe(true);   // 44→40 = nopeampi = parannus
  });

  it('tmKaariJaksoSidos — arvo ennen/jälkeen jakson', () => {
    const sarja = K.tmKaariSarja(HIST, 'lin30m');
    // jakso alkoi 2024-09-01, paattyi 2025-06-01. Pisteet: 04-10, 10-05, 05-13(2025), 10-20(2025).
    const sidos = K.tmKaariJaksoSidos({ alkoiMs: Date.parse('2024-09-01'), paattyiMs: Date.parse('2025-06-01') }, 'lin30m', sarja);
    expect(sidos.ennen).toBe(6.18);      // viimeisin ≤ alkoi (2024-04-10)
    expect(sidos.jalkeen).toBe(5.38);    // ensimmäinen ≥ paattyi (2025-10-20; 2025-05-13 on ennen paattyi)
    expect(sidos.parani).toBe(true);     // 6.18→5.38, aikatesti laskee → parannus
  });
});
