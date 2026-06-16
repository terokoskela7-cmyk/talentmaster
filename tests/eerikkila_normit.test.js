/**
 * TalentMaster™ — Eerikkilä-normitestit
 * lib/tm_eerikkila_normit.js
 *
 * HUOM: eerikkilaTaso(arvo, testi, ika, sukup)
 *   - testi = 'nopeus_30m', 'hyppy_cj', 'mas', 'pujottelu', 'syotto' jne.
 *   - sukup = 'M' (pojat) tai 'N' (tytöt) — EI 'P'/'T'
 *   - palauttaa 0 kun testiä/ikää ei tunneta (ei null)
 */
import { createRequire } from 'module';
const require = createRequire(import.meta.url);

const {
  EERIKKILA_NORMIT,
  eerikkilaTaso,
  eerikkilaNormiarvo,
  laskeTSI,
  laskeD1Joustava,
  laskeD2HH,
  laskeD2Joustava,
  perTestTasot,
} = require('../lib/tm_eerikkila_normit.js');

// ═══════════════════════════════════════════════════════════════════
// eerikkilaTaso — 5-portainen (ja 3-portainen pujottelu/syotto)
// ═══════════════════════════════════════════════════════════════════
describe('eerikkilaTaso', () => {
  // nopeus_30m P10: [4.88, 5.01, 5.15, 5.31] — pienempi_parempi
  // ≤4.88 → taso 5, ≤5.01 → 4, ≤5.15 → 3, ≤5.31 → 2, >5.31 → 1

  it('palauttaa tason 1 huonolle käänteiselle arvolle', () => {
    const taso = eerikkilaTaso(6.0, 'nopeus_30m', 10, 'M');
    expect(taso).toBe(1);
  });

  it('palauttaa tason 5 erittäin hyvälle käänteiselle arvolle', () => {
    const taso = eerikkilaTaso(4.5, 'nopeus_30m', 10, 'M');
    expect(taso).toBe(5);
  });

  it('rajatapaus: tasan taso-5-rajalla → taso 5', () => {
    // nopeus_30m P10: [4.88,...] → arvo 4.88 ≤ 4.88 → taso 5
    const taso = eerikkilaTaso(4.88, 'nopeus_30m', 10, 'M');
    expect(taso).toBe(5);
  });

  it('rajatapaus: juuri yli taso-5-rajan → taso 4', () => {
    const taso = eerikkilaTaso(4.89, 'nopeus_30m', 10, 'M');
    expect(taso).toBe(4);
  });

  it('suurempi=parempi testi (hyppy_cj)', () => {
    // hyppy_cj P14 → suurempi on parempi
    const huono = eerikkilaTaso(15, 'hyppy_cj', 14, 'M');
    expect(huono).toBe(1);
    const hyva = eerikkilaTaso(50, 'hyppy_cj', 14, 'M');
    expect(hyva).toBe(5);
  });

  it('MAS m/s-arvoilla (normi on m/s)', () => {
    // mas P14 suurempi=parempi
    const taso = eerikkilaTaso(4.0, 'mas', 14, 'M');
    expect(taso).toBeGreaterThanOrEqual(1);
    expect(taso).toBeLessThanOrEqual(5);
  });

  it('REGRESSIO: km/h-arvo saturoi taso 5 — yksikkömuunnos /3.6 on pakollinen', () => {
    // BUGI joka korjattiin: MAS-data tallennetaan km/h, normi on m/s. Jos raaka
    // km/h-luku syötetään eerikkilaTasoon, se saturoituu aina taso 5:een (VÄÄRIN).
    // Kutsupaikan ON muunnettava km/h → m/s (÷3.6) ennen tätä funktiota.
    // 14.4 km/h = 4.0 m/s. M14 MAS-normi (taso 3) = 4.4 m/s.
    expect(eerikkilaNormiarvo('mas', 14, 'M')).toBe(4.4);       // normi todella m/s
    expect(eerikkilaTaso(14.4, 'mas', 14, 'M')).toBe(5);        // km/h raakana → saturoi 5
    expect(eerikkilaTaso(4.0, 'mas', 14, 'M')).toBe(1);         // sama nopeus m/s → oikea (matala) taso
    // Ydinväite: yksikkö ratkaisee tuloksen → eri yksiköt eivät saa antaa samaa tasoa.
    expect(eerikkilaTaso(14.4, 'mas', 14, 'M'))
      .not.toBe(eerikkilaTaso(4.0, 'mas', 14, 'M'));
  });

  it('palauttaa 0 tuntemattomalle testille', () => {
    expect(eerikkilaTaso(5, 'olematon', 10, 'M')).toBe(0);
  });

  it('palauttaa 0 null-arvolle', () => {
    expect(eerikkilaTaso(null, 'nopeus_30m', 10, 'M')).toBe(0);
  });

  it('pujottelu on 3-portainen (taso 1–3)', () => {
    const huono = eerikkilaTaso(99, 'pujottelu', 12, 'M');
    const hyva = eerikkilaTaso(1, 'pujottelu', 12, 'M');
    expect(huono).toBe(1);
    expect(hyva).toBe(3);
  });

  it('syotto on 3-portainen (taso 1–3)', () => {
    const huono = eerikkilaTaso(99, 'syotto', 12, 'M');
    expect(huono).toBe(1);
    const hyva = eerikkilaTaso(1, 'syotto', 12, 'M');
    expect(hyva).toBe(3);
  });

  it('N-sukupuoli (tytöt) toimii', () => {
    // nopeus_30m tytöt: [5.18, 5.33, 5.48, 5.65] (P10 approx)
    const taso = eerikkilaTaso(6.5, 'nopeus_30m', 10, 'N');
    expect(taso).toBe(1); // huono aika
  });

  it('ikä cappaa 10–19', () => {
    const t9 = eerikkilaTaso(6.0, 'nopeus_30m', 9, 'M');
    const t10 = eerikkilaTaso(6.0, 'nopeus_30m', 10, 'M');
    expect(t9).toBe(t10);
  });
});

// ═══════════════════════════════════════════════════════════════════
// eerikkilaNormiarvo — taso-3-kynnysarvo (ikäluokan keskitaso)
// Param order: (testi, ika, sukup) — sukup 'M'/'P' → pojat
// ═══════════════════════════════════════════════════════════════════
describe('eerikkilaNormiarvo', () => {
  it('palauttaa numeron tunnetuille testeille', () => {
    const arvo = eerikkilaNormiarvo('nopeus_30m', 12, 'M');
    expect(typeof arvo).toBe('number');
    expect(arvo).toBeGreaterThan(0);
  });

  it('palauttaa null tuntemattomalle testille', () => {
    expect(eerikkilaNormiarvo('olematon', 10, 'M')).toBeNull();
  });

  it('30m P12 normiarvo (taso-3-kynnys) on järkevä', () => {
    // nopeus_30m pojat P12: [4.56, 4.69, 4.82, 4.97] → rajat[2]=4.82
    const arvo = eerikkilaNormiarvo('nopeus_30m', 12, 'M');
    expect(arvo).toBeCloseTo(4.82, 1);
  });

  it('tytöille eri arvo', () => {
    const m = eerikkilaNormiarvo('nopeus_30m', 12, 'M');
    const n = eerikkilaNormiarvo('nopeus_30m', 12, 'N');
    expect(m).not.toBe(n);
  });
});

// ═══════════════════════════════════════════════════════════════════
// laskeTSI — Tekniikka-nopeus-indeksi
// laskeTSI(smjuoksu, smpallo) palauttaa numeron (smpallo - smjuoksu)
// ═══════════════════════════════════════════════════════════════════
describe('laskeTSI', () => {
  it('TSI = sm_pallo - sm_juoksu (numero)', () => {
    const result = laskeTSI(5.0, 5.8);
    expect(result).toBeCloseTo(0.8, 1);
  });

  it('palauttaa negatiivisen arvon kun pallo nopeampi', () => {
    const result = laskeTSI(5.5, 5.0);
    expect(result).toBeCloseTo(-0.5, 1);
  });

  it('palauttaa 0 kun samat ajat', () => {
    expect(laskeTSI(5.0, 5.0)).toBe(0);
  });

  it('palauttaa null kun parametrit puuttuvat', () => {
    expect(laskeTSI(null, 5.0)).toBeNull();
    expect(laskeTSI(5.0, null)).toBeNull();
  });
});

// ═══════════════════════════════════════════════════════════════════
// JOUSTAVA INDEKSILASKENTA (D1/D2) — §30/§14
// ═══════════════════════════════════════════════════════════════════
describe('laskeD2HH (D2 H-H syöttö/pujottelu, 3-port → 1–5)', () => {
  // EERIKKILA_NORMIT P10: syotto [38.7,44.9] (≤38.7→3,≤44.9→2,else1); pujottelu [26.3,29.1] (≤26.3→3,≤29.1→2,else1)
  it('molemmat taso 3 → normalisoitu 5.0', () => {
    const r = laskeD2HH({ syotto: 38.0, pujottelu: 26.0 }, 10, 'M');
    expect(r.taso).toBe(5);            // (3-1)*2+1 = 5
    expect(r.lahde).toBe('hh');
    expect(r.kattavuus).toBe(2);
  });
  it('molemmat taso 2 → normalisoitu 3.0', () => {
    const r = laskeD2HH({ syotto: 40.0, pujottelu: 27.0 }, 10, 'M');
    expect(r.taso).toBe(3);            // (2-1)*2+1 = 3
    expect(r.kattavuus).toBe(2);
  });
  it('vain syöttö → kattavuus 1', () => {
    const r = laskeD2HH({ syotto: 38.0 }, 10, 'M');
    expect(r.kattavuus).toBe(1);
    expect(r.taso).toBe(5);
  });
  it('ei syöttö/pujottelu → null', () => {
    expect(laskeD2HH({ lin30m: 5.0 }, 10, 'M')).toBeNull();
    expect(laskeD2HH(null, 10, 'M')).toBeNull();
    expect(laskeD2HH({ syotto: 38.0 }, null, 'M')).toBeNull();
  });
});

describe('laskeD1Joustava (D1 fyysinen, ka saatavilla olevista)', () => {
  it('laskee vain mitatuista testeistä, kattavuus = lukumäärä', () => {
    const r = laskeD1Joustava({ lin10m: 2.0, lin30m: 5.0 }, 10, 'M');
    expect(r.lahde).toBe('hh');
    expect(r.kattavuus).toBe(2);
    expect(r.maxKattavuus).toBe(6);
    expect(r.taso).toBeGreaterThan(0);
  });
  it('sm_pallo (tekniikka) EI lasketa D1:een', () => {
    const r = laskeD1Joustava({ sm_pallo: 5.0 }, 10, 'M');
    expect(r).toBeNull();            // ei fyysisiä → null
  });
  it('null kun ei dataa/ikä', () => {
    expect(laskeD1Joustava(null, 10, 'M')).toBeNull();
    expect(laskeD1Joustava({ lin30m: 5.0 }, null, 'M')).toBeNull();
  });
});

describe('laskeD2Joustava (prioriteetti TKI → H-H → d2_taso)', () => {
  it('TKI ensisijainen: tki/20', () => {
    const r = laskeD2Joustava({ tki_viimeisin: 80 }, 10, 'M');
    expect(r.taso).toBe(4);
    expect(r.lahde).toBe('tki');
  });
  it('ei TKI → H-H syöttö/pujottelu', () => {
    const r = laskeD2Joustava({ hh_viimeisin: { syotto: 38.0, pujottelu: 26.0 } }, 10, 'M');
    expect(r.lahde).toBe('hh');
    expect(r.taso).toBe(5);
  });
  it('ei TKI/H-H → olemassa oleva d2_taso (SM/TK)', () => {
    const r = laskeD2Joustava({ d2_taso: 2.5, d2_lahde: 'sm' }, 10, 'M');
    expect(r.taso).toBe(2.5);
    expect(r.lahde).toBe('sm');
  });
  it('tyhjä → null', () => {
    expect(laskeD2Joustava({}, 10, 'M')).toBeNull();
  });
});

// ═══════════════════════════════════════════════════════════════════
// perTestTasot — §8 per-test TM-normitasot (kanoninen, näkyvä kerros)
// ═══════════════════════════════════════════════════════════════════
describe('perTestTasot', () => {
  // nopeus_30m P10: [4.88,5.01,5.15,5.31] (pienempi parempi): ≤4.88→5, ≤5.01→4, ...
  it('5-port: hyvä 30m → korkea taso, asteikko 5, lahde hh', () => {
    const r = perTestTasot({ hh_viimeisin: { lin30m: 4.85 }, phv_tila: 'POST' }, 10, 'M');
    const m30 = r.find(x => x.label === '30m');
    expect(m30.taso).toBe(5);
    expect(m30.asteikko).toBe(5);
    expect(m30.lahde).toBe('hh');
    expect(m30.xfactor).toBe(true);     // taso 5
    expect(m30.neutraali).toBe(false);  // POST-PHV → ei neutraali
  });

  it('3-port: syöttö/pujottelu → asteikko 3, xfactor kun taso 3', () => {
    // syotto P10 [38.7,44.9]: ≤38.7→3; pujottelu P10 [26.3,29.1]: ≤29.1→2
    const r = perTestTasot({ hh_viimeisin: { syotto: 38.0, pujottelu: 27.0 } }, 10, 'M');
    const sy = r.find(x => x.label === 'Syöttö');
    const pu = r.find(x => x.label === 'Pujottelu');
    expect(sy.asteikko).toBe(3);
    expect(sy.taso).toBe(3);
    expect(sy.xfactor).toBe(true);      // 3-port taso 3
    expect(pu.taso).toBe(2);
    expect(pu.xfactor).toBe(false);
    expect(sy.neutraali).toBe(false);   // tekniikka ei koskaan neutraali
  });

  it('§28 PRE-PHV: heikko 30m/mas/cmj → neutraali:true; 5m/10m/syöttö EIVÄT', () => {
    const r = perTestTasot({ hh_viimeisin: { lin5m: 1.2, lin10m: 2.5, lin30m: 6.0, cmj: 18, mas: 50, syotto: 50 }, phv_tila: 'PRE' }, 10, 'M');
    expect(r.find(x => x.label === '30m').neutraali).toBe(true);
    expect(r.find(x => x.label === 'CMJ').neutraali).toBe(true);
    expect(r.find(x => x.label === 'MAS').neutraali).toBe(true);
    expect(r.find(x => x.label === '5m').neutraali).toBe(false);
    expect(r.find(x => x.label === '10m').neutraali).toBe(false);
    expect(r.find(x => x.label === 'Syöttö').neutraali).toBe(false);
  });

  it('§28: phv_tila puuttuu → 30m myös neutraali', () => {
    const r = perTestTasot({ hh_viimeisin: { lin30m: 6.0 } }, 10, 'M');
    expect(r.find(x => x.label === '30m').neutraali).toBe(true);
  });

  it('ika null → taso:null (raaka, ei väärää tasoa), rivi silti palautuu', () => {
    const r = perTestTasot({ hh_viimeisin: { lin30m: 4.85, syotto: 38.0 } }, null, 'M');
    expect(r.length).toBe(2);
    expect(r.every(x => x.taso === null)).toBe(true);
    expect(r.find(x => x.label === '30m').arvo).toBe(4.85);
  });

  it('sp null → taso:null', () => {
    const r = perTestTasot({ hh_viimeisin: { lin30m: 4.85 } }, 10, null);
    expect(r[0].taso).toBeNull();
  });

  it('Pallo-Iirot-tyyppinen (10m/30m/syöttö/pujottelu, ei cmj/mas/TKI) → 4 riviä tasoineen', () => {
    const r = perTestTasot({ hh_viimeisin: { lin10m: 2.10, lin30m: 5.05, syotto: 41.0, pujottelu: 28.0 } }, 10, 'M');
    expect(r.length).toBe(4);
    expect(r.filter(x => x.taso != null).length).toBe(4);   // kaikki saavat TM-tason ilman aggregaattia
  });

  it('tyhjä pelaaja → []', () => {
    expect(perTestTasot({}, 10, 'M')).toEqual([]);
    expect(perTestTasot(null, 10, 'M')).toEqual([]);
  });

  it('gap seuraavaan tasoon: 5-port (hhSeuraavaTaso) + 3-port + suunta (pienempi)', () => {
    const r = perTestTasot({ hh_viimeisin: { lin30m: 5.05, syotto: 41.0, mas: 14.0 }, phv_tila: 'POST' }, 10, 'M');
    const m30 = r.find(x => x.label === '30m');
    expect(m30.seuraavaTaso).toBe(m30.taso + 1);
    expect(m30.gap).toBeGreaterThan(0);
    expect(m30.pienempi).toBe(true);        // aika → −gap
    const sy = r.find(x => x.label === 'Syöttö');
    expect(sy.gap).toBeCloseTo(2.3, 1);     // 41.0 − 38.7 (P10 taso-3-kynnys)
    expect(sy.seuraavaTaso).toBe(3);
    const mas = r.find(x => x.label === 'MAS');
    expect(mas.pienempi).toBe(false);       // km/h → +gap
  });

  it('gap null kun ika/sp puuttuu tai huipputaso', () => {
    const r0 = perTestTasot({ hh_viimeisin: { lin30m: 5.05 } }, null, 'M');
    expect(r0[0].gap).toBeNull();
    // huipputaso (erittäin nopea 30m) → seuraavaa tasoa ei ole → gap null
    const r5 = perTestTasot({ hh_viimeisin: { lin30m: 4.0 }, phv_tila: 'POST' }, 10, 'M');
    expect(r5[0].taso).toBe(5);
    expect(r5[0].gap).toBeNull();
  });
});
