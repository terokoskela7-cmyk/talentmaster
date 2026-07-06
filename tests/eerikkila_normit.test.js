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
  normSukupuoliMN,
  onNeutraaliPrePHV,
  kypsyysTila,
  teknHeikoimmat20,
  laskeD1Joustava,
  laskeD1Osaindeksit,
  laskeJoukkuePoikkeamat,
  laskeValmentajaKalibraatio,
  vanhempiRaporttiTekstit,
  laskeReviewKadenssi,
  laskeJoukkueReviewKooste,
  laskeVPTuloskortti,
  laskeTavoiteToteuma,
  laskeTaso3Osuus,
  tasoJakauma,
  tkiTavoiteJakauma,
  tavoiteRadarAkselit,
  radarPatteristotSaatavilla,
  _fmtTestiArvo,
  painopisteOminaisuus,
  kattavuusVajeet,
  valitseKohortti,
  laskeHarjoituslaatuPalloliitto,
  laskeValmennustaitoIndeksi,
  laskeHarjoitusKalibraatio,
  laskeValmentajaHarjoitusKooste,
  koostaHarjoitusarvioinnit,
  harjoitusTrendi,
  harjoitusBenchmarkDelta,
  harjoitusKalibraatioHistoria,
  omaKehitysKooste,
  cpdKooste,
  laskeD2HH,
  d2SmPalloFallback,
  taydennaHvSm,
  laskeD2Joustava,
  perTestTasot,
  normiIka,
  raeKvartaali,
  RAE_KERROIN,
  raeChip,
  isUnderdog,
  raeJoukkueJakauma,
  d3Varmuus,
  d3VarmuusChip,
  D3_DIMS,
  renderD3VertailuHTML,
  d3VpKuiluPelaajalla,
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

  it('VP-fallback-tapaus (SJK P15): sm_juoksu 7.62, sm_pallo 8.67 → +1.05 (2 des)', () => {
    expect(laskeTSI(7.62, 8.67)).toBe(1.05);
  });

  it('palauttaa null kun parametrit puuttuvat', () => {
    expect(laskeTSI(null, 5.0)).toBeNull();
    expect(laskeTSI(5.0, null)).toBeNull();
  });
});

// ═══════════════════════════════════════════════════════════════════
// §28 kypsyysTila — kolmiportainen gated-fyysisen kypsyystila (kasvu/epavarma/normaali)
describe('kypsyysTila (§28 kolmiportainen)', () => {
  it('PRE-PHV heikko gated → kasvu', () => {
    expect(kypsyysTila('PRE', 2, true)).toBe('kasvu');
    expect(kypsyysTila('LAH', 1, true)).toBe('kasvu');
  });
  it('kypsyys tuntematon (phv_tila null) heikko gated → epavarma', () => {
    expect(kypsyysTila(null, 2, true)).toBe('epavarma');
    expect(kypsyysTila(undefined, 1, true)).toBe('epavarma');
    expect(kypsyysTila('', 2, true)).toBe('epavarma');
  });
  it('post-PHV (PH/POST/AN) heikko gated → normaali (aito signaali)', () => {
    expect(kypsyysTila('PH', 2, true)).toBe('normaali');
    expect(kypsyysTila('POST', 1, true)).toBe('normaali');
    expect(kypsyysTila('AN', 2, true)).toBe('normaali');
  });
  it('ei-gated (esim. 10m kiihdytys) → aina normaali riippumatta kypsyydestä', () => {
    expect(kypsyysTila(null, 1, false)).toBe('normaali');
    expect(kypsyysTila('PRE', 1, false)).toBe('normaali');
  });
  it('taso ≥ 3 (ei heikko) → aina normaali', () => {
    expect(kypsyysTila('PRE', 3, true)).toBe('normaali');
    expect(kypsyysTila(null, 4, true)).toBe('normaali');
    expect(kypsyysTila('POST', 5, true)).toBe('normaali');
  });
  it('taso null → normaali (ei heikko-luokitusta)', () => {
    expect(kypsyysTila(null, null, true)).toBe('normaali');
  });
  it('preOverride (ikäpohjainen pre-päättely ilman phv_tila:aa) → kasvu', () => {
    expect(kypsyysTila(null, 2, true, true)).toBe('kasvu');   // onNeutraaliPrePHV johti pre-PHV:hen iän perusteella
    expect(kypsyysTila(null, 2, true, false)).toBe('epavarma');
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
    expect(r.maxKattavuus).toBe(7);   // lin5m,lin10m,lin30m,cmj,mas,kasirata,sm_juoksu (sm_juoksu lisätty Vaihe B §8.4)
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

describe('laskeD1Osaindeksit (D1 osaindeksit, additiivinen §29)', () => {
  it('null kun hh/ikä/sp puuttuu', () => {
    expect(laskeD1Osaindeksit(null, 10, 'M')).toBeNull();
    expect(laskeD1Osaindeksit({ lin30m: 5.0 }, null, 'M')).toBeNull();
    expect(laskeD1Osaindeksit({ lin30m: 5.0 }, 10, null)).toBeNull();
  });
  it('osaindeksi = null kun testi puuttuu; maksinopeus lin30m:stä', () => {
    const r = laskeD1Osaindeksit({ lin30m: 5.0 }, 10, 'M');
    expect(r.kiihdytys).toBeNull();   // ei lin5m/lin10m
    expect(r.voima).toBeNull();       // ei cmj/sj
    expect(r.ketteryys).toBeNull();   // ei kasirata
    expect(r.suunnanmuutos).toBeNull(); // ei sm_juoksu
    expect(r.aerobinen).toBeNull();   // ei mas
    expect(r.maksinopeus).toBe(eerikkilaTaso(5.0, 'nopeus_30m', 10, 'M') || null);
    expect(r.maksinopeus).toBeGreaterThan(0);
  });
  it('aerobinen muuntaa MAS km/h → m/s (÷3,6)', () => {
    const r = laskeD1Osaindeksit({ mas: 14.4 }, 14, 'M');
    expect(r.aerobinen).toBe(eerikkilaTaso(14.4 / 3.6, 'mas', 14, 'M') || null);
  });
  it('kiihdytys = ka kahdesta tasosta (lin5m + lin10m)', () => {
    const tt = (a, e) => eerikkilaTaso(a, e, 12, 'M') || null;
    const vals = [tt(1.1, 'nopeus_5m'), tt(2.0, 'nopeus_10m')].filter(x => x != null);
    const odotus = vals.length ? Math.round(vals.reduce((a, b) => a + b, 0) / vals.length * 10) / 10 : null;
    const r = laskeD1Osaindeksit({ lin5m: 1.1, lin10m: 2.0 }, 12, 'M');
    expect(r.kiihdytys).toBe(odotus);
  });
  // §30 — Ketteryys (kasirata, LL) ja Suunnanmuutos (sm_juoksu, DIAG) eriytetty (ei enää keskiarvo).
  it('ketteryys = pelkkä kasirata-taso (ei enää ka(kasirata, sm_juoksu))', () => {
    const r = laskeD1Osaindeksit({ kasirata: 8.0 }, 12, 'M');
    expect(r.ketteryys).toBe(eerikkilaTaso(8.0, 'kasirata', 12, 'M') || null);
    expect(r.ketteryys).toBeGreaterThan(0);
    expect(r.suunnanmuutos).toBeNull();   // ei sm_juoksu
  });
  it('suunnanmuutos = pelkkä sm_juoksu-taso (DIAG), erillinen ketteryydestä', () => {
    const r = laskeD1Osaindeksit({ sm_juoksu: 7.0 }, 12, 'M');
    expect(r.suunnanmuutos).toBe(eerikkilaTaso(7.0, 'sm_juoksu', 12, 'M') || null);
    expect(r.suunnanmuutos).toBeGreaterThan(0);
    expect(r.ketteryys).toBeNull();   // ei kasirata
  });
  it('kasirata + sm_juoksu → EI keskiarvoa: ketteryys=kasirata, suunnanmuutos=sm_juoksu erikseen', () => {
    const kt = eerikkilaTaso(8.0, 'kasirata', 12, 'M') || null;
    const st = eerikkilaTaso(7.0, 'sm_juoksu', 12, 'M') || null;
    const r = laskeD1Osaindeksit({ kasirata: 8.0, sm_juoksu: 7.0 }, 12, 'M');
    expect(r.ketteryys).toBe(kt);
    expect(r.suunnanmuutos).toBe(st);
  });
  it('Sibbo-tapaus (kasirata, ei sm_juoksu) → ketteryys=arvo, suunnanmuutos=null (rehellistä)', () => {
    const r = laskeD1Osaindeksit({ kasirata: 7.5, lin30m: 5.4 }, 12, 'N');
    expect(r.ketteryys).toBe(eerikkilaTaso(7.5, 'kasirata', 12, 'N') || null);
    expect(r.suunnanmuutos).toBeNull();
  });
});

describe('laskeJoukkuePoikkeamat (POIKKEUSKEHYS_SPEC)', () => {
  it('alle_normin: tekniikka ka <2.5 → punainen; 2.5–2.9 → amber (§7)', () => {
    const r1 = laskeJoukkuePoikkeamat([{ tki_viimeisin: 40 }, { tki_viimeisin: 44 }], 14, 'M');  // 2.0,2.2 → 2.1
    const t1 = r1.find(x => x.tyyppi === 'alle_normin' && x.osaAlue === 'tekniikka');
    expect(t1).toBeTruthy();
    expect(t1.vakavuus).toBe('punainen');
    const r2 = laskeJoukkuePoikkeamat([{ tki_viimeisin: 56 }, { tki_viimeisin: 56 }], 14, 'M');  // 2.8 → lievä
    const t2 = r2.find(x => x.tyyppi === 'alle_normin' && x.osaAlue === 'tekniikka');
    expect(t2.vakavuus).toBe('amber');
  });
  it('profiilipoikkeama: heikoin fyysinen ≥1.0 alle osa-alueiden ka:n', () => {
    const team = [{ hh_viimeisin: { lin30m: 3.9, mas: 8 } }, { hh_viimeisin: { lin30m: 4.0, mas: 8.3 } }];
    const ika = 15, sp = 'M';
    const areas = ['kiihdytys','maksinopeus','voima','ketteryys','aerobinen'];
    const oi = team.map(p => laskeD1Osaindeksit(p.hh_viimeisin, ika, sp));
    const ka = {}; areas.forEach(a => { const v = oi.map(o => o[a]).filter(x => x != null); ka[a] = v.length ? v.reduce((s,x)=>s+x,0)/v.length : null; });
    const vals = areas.map(a => ka[a]).filter(x => x != null);
    const r = laskeJoukkuePoikkeamat(team, ika, sp);
    if (vals.length >= 2 && (vals.reduce((s,x)=>s+x,0)/vals.length - Math.min(...vals)) >= 1.0) {
      expect(r.some(x => x.tyyppi === 'profiilipoikkeama')).toBe(true);
    } else {
      expect(r.some(x => x.tyyppi === 'profiilipoikkeama')).toBe(false);
    }
  });
  it('laskeva: delta < −0.3 ≥2 pelaajalla', () => {
    const team = [{ hh_taso: 3.0, hh_taso_edellinen: 3.5 }, { tki_viimeisin: 50, tki_edellinen: 60 }, { hh_taso: 3.0 }];
    const r = laskeJoukkuePoikkeamat(team, 14, 'M');
    expect(r.some(x => x.tyyppi === 'laskeva')).toBe(true);
  });
  it('hajonta: ≥33% tasolla ≤2 JA ka ≥2.5', () => {
    const team = [{ hh_taso: 1.5 }, { hh_taso: 2.0 }, { hh_taso: 4.0 }, { hh_taso: 4.0 }, { hh_taso: 4.0 }, { hh_taso: 4.0 }];
    const r = laskeJoukkuePoikkeamat(team, 14, 'M');
    expect(r.some(x => x.tyyppi === 'hajonta')).toBe(true);
  });
  it('talenttiydin ka <3.0 → punainen', () => {
    const team = [{ hh_taso: 2.8 }, { hh_taso: 2.5 }, { hh_taso: 2.2 }, { hh_taso: 2.0 }, { hh_taso: 1.8 }];
    const ydin = laskeJoukkuePoikkeamat(team, 14, 'M').find(x => x.tyyppi === 'talenttiydin');
    expect(ydin).toBeTruthy();
    expect(ydin.vakavuus).toBe('punainen');
    expect(ydin.arvo).toBeLessThan(3.0);
  });
  it('PHV-caveat: post-PHV-ominaisuus + ika≤13 → ikavaiheOdotettu & ei punainen', () => {
    const team = [{ hh_viimeisin: { mas: 8 } }, { hh_viimeisin: { mas: 8.5 } }];
    const ika = 13, sp = 'M';
    const aer = laskeD1Osaindeksit(team[0].hh_viimeisin, ika, sp).aerobinen;
    const a = laskeJoukkuePoikkeamat(team, ika, sp).find(x => x.osaAlue === 'aerobinen' && x.tyyppi === 'alle_normin');
    if (aer != null && aer < 3) {
      expect(a).toBeTruthy();
      expect(a.ikavaiheOdotettu).toBe(true);
      expect(a.vakavuus).not.toBe('punainen');
    }
  });
  it('phv_tila POST ohittaa ikäproxyn → punainen sallittu nuorelle fyysiselle', () => {
    const team = [{ phv_tila: 'POST', hh_viimeisin: { mas: 8 } }, { phv_tila: 'POST', hh_viimeisin: { mas: 8.5 } }];
    const ika = 13, sp = 'M';
    const aer = laskeD1Osaindeksit(team[0].hh_viimeisin, ika, sp).aerobinen;
    const a = laskeJoukkuePoikkeamat(team, ika, sp).find(x => x.osaAlue === 'aerobinen' && x.tyyppi === 'alle_normin');
    if (aer != null && aer < 2.5) {
      expect(a.ikavaiheOdotettu).toBe(false);
      expect(a.vakavuus).toBe('punainen');
    }
  });
  it('tyhjä joukkue → tyhjä lista; lajittelu punainen ennen amberia', () => {
    expect(laskeJoukkuePoikkeamat([], 14, 'M')).toEqual([]);
    const r = laskeJoukkuePoikkeamat([{ tki_viimeisin: 30 }, { tki_viimeisin: 30 }], 14, 'M');  // tekn 1.5 → punainen + talenttiydin
    if (r.length >= 2) expect(['punainen']).toContain(r[0].vakavuus);
  });
});

describe('laskeValmentajaKalibraatio (mentorointi)', () => {
  it('ei dataa → headline "Ei riittävästi dataa"', () => {
    const r = laskeValmentajaKalibraatio([], null);
    expect(r.headline).toBe('Ei riittävästi dataa');
    expect(r.chips).toEqual([]);
  });
  it('RAE-bias: ydin Q1 ≥50% & +15pp yli joukkueen → amber-chip', () => {
    const team = [
      { talenttiOhjelma: true, rae_kvartaali: 'Q1' }, { talenttiOhjelma: true, rae_kvartaali: 'Q1' }, { talenttiOhjelma: true, rae_kvartaali: 'Q1' },
      { rae_kvartaali: 'Q4' }, { rae_kvartaali: 'Q4' }, { rae_kvartaali: 'Q3' }, { rae_kvartaali: 'Q4' }
    ];
    const r = laskeValmentajaKalibraatio(team, null);
    expect(r.rae.tila).toBe('bias');
    expect(r.rae.ydinQ1).toBe(100);
    expect(r.chips.some(c => c.key === 'rae')).toBe(true);
  });
  it('RAE: ydin = joukkue (ei eroa) → ei biasia', () => {
    const team = [
      { talenttiOhjelma: true, rae_kvartaali: 'Q1' }, { talenttiOhjelma: true, rae_kvartaali: 'Q2' }, { talenttiOhjelma: true, rae_kvartaali: 'Q3' },
      { rae_kvartaali: 'Q1' }, { rae_kvartaali: 'Q2' }, { rae_kvartaali: 'Q3' }
    ];
    const r = laskeValmentajaKalibraatio(team, null);
    expect(r.rae.tila).toBe('ok');
    expect(r.chips.some(c => c.key === 'rae')).toBe(false);
  });
  it('D3-kuilu: ka |valm−vp| ≥1.5 → punainen-chip; ≥1.0 → amber', () => {
    const red = laskeValmentajaKalibraatio([
      { d3_viimeisin: { pisteet: { a: { valmentaja: 5, vp: 2 } } } },
      { d3_viimeisin: { pisteet: { a: { valmentaja: 5, vp: 2 } } } }
    ], null);
    const c = red.chips.find(x => x.key === 'd3');
    expect(c).toBeTruthy(); expect(c.vakavuus).toBe('punainen'); expect(red.d3.ka).toBe(3);
    const amber = laskeValmentajaKalibraatio([
      { d3_viimeisin: { pisteet: { a: { valmentaja: 4, vp: 3 } } } },
      { d3_viimeisin: { pisteet: { a: { valmentaja: 3, vp: 2 } } } }
    ], null);
    expect(amber.chips.find(x => x.key === 'd3').vakavuus).toBe('amber');
  });
  it('D3: n<2 pelaajaa → ei chipiä', () => {
    const r = laskeValmentajaKalibraatio([{ d3_viimeisin: { pisteet: { a: { valmentaja: 5, vp: 1 } } } }], null);
    expect(r.chips.some(c => c.key === 'd3')).toBe(false);
    expect(r.d3.tila).toBe('ei_dataa');
  });
  it('Leniency: |Δ| ≥1.5 vs klubiAdarKa → info-chip', () => {
    const team = [{ adar_viimeisin: { yht: 9 } }, { adar_viimeisin: { yht: 9 } }, { adar_viimeisin: { yht: 9 } }];
    const r = laskeValmentajaKalibraatio(team, 6);
    const c = r.chips.find(x => x.key === 'leniency');
    expect(c).toBeTruthy(); expect(c.vakavuus).toBe('info'); expect(r.leniency.delta).toBe(3);
  });
  it('headline = pahin chip (punainen ennen amber/info)', () => {
    const team = [
      { d3_viimeisin: { pisteet: { a: { valmentaja: 5, vp: 1 } } }, adar_viimeisin: { yht: 9 } },
      { d3_viimeisin: { pisteet: { a: { valmentaja: 5, vp: 1 } } }, adar_viimeisin: { yht: 9 } },
      { adar_viimeisin: { yht: 9 } }
    ];
    const r = laskeValmentajaKalibraatio(team, 6);
    expect(r.headline).toContain('D3-arviot eroavat');   // punainen ohittaa info-leniencyn
  });
});

describe('vanhempiRaporttiTekstit (§7.22 SSOT)', () => {
  it('palauttaa vahvuuden ennen kehityskohdetta (molemmat täytetty, eri kohde)', () => {
    const r = vanhempiRaporttiTekstit({ etunimi: 'Aino', tki_vahvuus: 'syotto', tki_kehityskohde: 'pujottelu' }, 11, 'N');
    expect(r.vahvuus.teksti).toContain('Syöttö');
    expect(r.seuraavaAskel.teksti).toContain('Pujottelu');
    expect(r.vahvuus.kohde).toBe('Syöttö');
    expect(r.vahvuus.kohde).not.toBe(r.seuraavaAskel.kohde);
    expect(Array.isArray(r.tukivinkit)).toBe(true);
    expect(r.tukivinkit.length).toBeGreaterThanOrEqual(1);
  });
  it('ei numeerista tasoa stringeissä (vahvuus + seuraava askel)', () => {
    const r = vanhempiRaporttiTekstit({ etunimi: 'Aino', tki_vahvuus: 'syotto', tki_kehityskohde: 'pujottelu', hh_taso: 2.4, tki_viimeisin: 55, d2_taso: 3 }, 11, 'N');
    expect(/\d/.test(r.vahvuus.teksti)).toBe(false);
    expect(/\d/.test(r.seuraavaAskel.teksti)).toBe(false);
    // ei "taso"/percentiili/vertailusanastoa vahvuus/askel-teksteissä
    expect(/taso|%|percentiili|parempi kuin/i.test(r.vahvuus.teksti + ' ' + r.seuraavaAskel.teksti)).toBe(false);
  });
  it('ei kaadu tyhjällä pelaajalla; palauttaa rakenteen + positiivisen vahvuuden', () => {
    const r = vanhempiRaporttiTekstit({}, null, null);
    expect(r.vahvuus && r.vahvuus.teksti).toBeTruthy();
    expect(r.seuraavaAskel && r.seuraavaAskel.teksti).toBeTruthy();
    expect(Array.isArray(r.tukivinkit)).toBe(true);
    expect(r.prosessikehu).toBeNull();   // ei käynti-/kehitysdataa
  });
  it('prosessikehu vain kun kehitys-/käyntidataa', () => {
    expect(vanhempiRaporttiTekstit({ etunimi: 'X', hh_taso: 3.0, hh_taso_edellinen: 2.5 }, 12, 'M').prosessikehu).toContain('kehittynyt');
    expect(vanhempiRaporttiTekstit({ etunimi: 'X', streak: 4 }, 12, 'M').prosessikehu).toContain('säännöllisesti');
  });
  it('ikävaihe ≤12 → leikkirekisteri (leikki-/autonomiavinkit)', () => {
    const r = vanhempiRaporttiTekstit({ etunimi: 'Eemeli', tki_kehityskohde: 'pujottelu' }, 10, 'M');
    expect(r.ikavaihe).toBe('leikkija');
    const t = r.tukivinkit.join(' ');
    expect(/leik/i.test(t)).toBe(true);
    expect(/uni ja lepo|ravinto|koulun ja urheilun/i.test(t)).toBe(false);
  });
  it('ikävaihe 13–15 → uni/lepo + ravinto + koulu, EI "pihalla"/"hippa"', () => {
    const r = vanhempiRaporttiTekstit({ etunimi: 'Matias', tki_kehityskohde: 'pujottelu' }, 15, 'M');
    expect(r.ikavaihe).toBe('rakentaja');
    const t = r.tukivinkit.join(' ');
    expect(/uni ja lepo/i.test(t)).toBe(true);
    expect(/ravinto/i.test(t)).toBe(true);
    expect(/koulun ja urheilun/i.test(t)).toBe(true);
    expect(/pihalla|hippa/i.test(t)).toBe(false);
    expect(/leikki/i.test(r.seuraavaAskel.teksti)).toBe(false);
    expect(/\d/.test(r.vahvuus.teksti + ' ' + r.seuraavaAskel.teksti)).toBe(false);   // ei numeroita
  });
});

describe('laskeReviewKadenssi + laskeJoukkueReviewKooste', () => {
  const NYT = new Date(2026, 5, 22).getTime();   // 2026-06-22
  const isoN = (ms, dpv) => { const d = new Date(ms + dpv * 86400000); return d.getFullYear() + '-' + String(d.getMonth() + 1).padStart(2, '0') + '-' + String(d.getDate()).padStart(2, '0'); };
  it('kaistaraja 11↔12 v (84 vs 42 pv)', () => {
    expect(laskeReviewKadenssi({ syntymaVuosi: 2015, review_viimeisin_pvm: '2026-01-01' }, NYT).ikakaista).toBe(84);   // ikä 11
    expect(laskeReviewKadenssi({ syntymaVuosi: 2014, review_viimeisin_pvm: '2026-01-01' }, NYT).ikakaista).toBe(42);   // ikä 12
  });
  it('myöhässä / erääntymässä / ajantasalla (ikä≥12, 42 pv)', () => {
    expect(laskeReviewKadenssi({ syntymaVuosi: 2010, review_viimeisin_pvm: '2026-01-01' }, NYT).status).toBe('myohassa');
    expect(laskeReviewKadenssi({ syntymaVuosi: 2010, review_viimeisin_pvm: isoN(NYT, -32) }, NYT).status).toBe('eraantymassa');   // erääntyy ~10 pv päästä
    expect(laskeReviewKadenssi({ syntymaVuosi: 2010, review_viimeisin_pvm: isoN(NYT, -5) }, NYT).status).toBe('ajantasalla');
  });
  it('ei review_viimeisin_pvm → ei_reviewia', () => {
    const r = laskeReviewKadenssi({ syntymaVuosi: 2010 }, NYT);
    expect(r.status).toBe('ei_reviewia');
    expect(r.eraantyyPvm).toBeNull();
  });
  it('roll-up: on-time-% arvioiduista, ei_reviewia erikseen', () => {
    const team = [
      { syntymaVuosi: 2010, review_viimeisin_pvm: isoN(NYT, -5) },   // ajantasalla
      { syntymaVuosi: 2010, review_viimeisin_pvm: isoN(NYT, -5) },   // ajantasalla
      { syntymaVuosi: 2010, review_viimeisin_pvm: '2026-01-01' },    // myöhässä
      { syntymaVuosi: 2010 },                                         // ei_reviewia
    ];
    const k = laskeJoukkueReviewKooste(team, NYT);
    expect(k.myohassa_n).toBe(1);
    expect(k.ei_reviewia_n).toBe(1);
    expect(k.onTime_pct).toBe(67);   // 2 / (2+0+1)
  });
});

describe('laskeTaso3Osuus (kanoninen taso≥3)', () => {
  const team = [
    { joukkue: 'SJK P15', d1_taso: 4 },                 // lvl 4 ≥3
    { joukkue: 'SJK P15', tki_viimeisin: 65 },          // d2j tki→3.3 ≥3
    { joukkue: 'SJK P14', hh_taso: 2 },                 // lvl 2 <3
    { joukkue: 'SJK P14' },                             // ei dataa → ei arvioitu
  ];
  it('nimittäjä = lvl≠null; ≥3 lasketaan', () => {
    const r = laskeTaso3Osuus(team);
    expect(r.n_arvioidut).toBe(3);   // p4 ei dataa
    expect(r.n_taso3).toBe(2);
    expect(r.osuus_pct).toBe(67);    // 2/3
  });
  it('sama tulos eri kutsujille (kanoninen)', () => {
    expect(laskeTaso3Osuus(team)).toEqual(laskeTaso3Osuus(team.slice()));
  });
  it('kohorttisuodatus (opts.joukkueet, case-insensitive)', () => {
    const r = laskeTaso3Osuus(team, { joukkueet: ['sjk p15'] });
    expect(r.n_arvioidut).toBe(2);
    expect(r.n_taso3).toBe(2);
    expect(r.osuus_pct).toBe(100);
  });
  it('tyhjä → null osuus', () => {
    const r = laskeTaso3Osuus([]);
    expect(r.osuus_pct).toBeNull();
    expect(r.n_arvioidut).toBe(0);
  });
  it('VP-tuloskortti II käyttää samaa kanonista (sama % samalla scopella)', () => {
    const k = laskeVPTuloskortti(team, [], null, Date.now());
    const r = laskeTaso3Osuus(team);
    expect(k.metriikat.taso3_pct).toBe(r.osuus_pct);
  });
});

describe('Harjoitusarviointi (kaksimallinen, HARJOITUSARVIOINTI_SPEC)', () => {
  it('laskeHarjoituslaatuPalloliitto: ka = a1,a3,a4,a5,a7 + %-erottelu', () => {
    const r = laskeHarjoituslaatuPalloliitto({ a1: 8, a2: 60, a3: 6, a4: 7, a5: 9, a6: 50, a7: 5 });
    expect(r.ka_0_10).toBe(7);          // (8+6+7+9+5)/5 = 7
    expect(r.liike_pct).toBe(60);       // a2
    expect(r.maali_pct).toBe(50);       // a6
  });
  it('laskeHarjoituslaatuPalloliitto: null-turva (osa puuttuu)', () => {
    const r = laskeHarjoituslaatuPalloliitto({ a1: 8, a5: 6 });
    expect(r.ka_0_10).toBe(7);          // vain a1,a5 → (8+6)/2
    expect(r.liike_pct).toBeNull();
    expect(r.maali_pct).toBeNull();
  });
  it('laskeValmennustaitoIndeksi: b1–b7 ka (1–5)', () => {
    expect(laskeValmennustaitoIndeksi({ b1: 4, b2: 4, b3: 4, b4: 4, b5: 4, b6: 4, b7: 4 })).toBe(4);
    expect(laskeValmennustaitoIndeksi({ b1: 5, b2: 3 })).toBe(4);
  });
  it('laskeValmennustaitoIndeksi: null jos 0 vastausta', () => {
    expect(laskeValmennustaitoIndeksi({})).toBeNull();
    expect(laskeValmennustaitoIndeksi(null)).toBeNull();
  });
  it('laskeHarjoitusKalibraatio: kuilun etumerkki (itsearvio − havainnointi)', () => {
    const r = laskeHarjoitusKalibraatio({ b1: 5, b2: 3, b4: 2 }, { b1: 3, b2: 4 });
    expect(r.per_kriteeri.b1).toBe(2);   // 5−3 yliarvio
    expect(r.per_kriteeri.b2).toBe(-1);  // 3−4 aliarvio
    expect(r.per_kriteeri.b4).toBeUndefined();   // ei havainnointia → ei paria
    expect(r.ka_abs_kuilu).toBe(1.5);    // (|2|+|−1|)/2
  });
  it('laskeHarjoitusKalibraatio: tyhjä → null kuilu', () => {
    expect(laskeHarjoitusKalibraatio({ b1: 4 }, {}).ka_abs_kuilu).toBeNull();
  });
  it('laskeValmentajaHarjoitusKooste: ka + n + pvm per malli', () => {
    const arvioinnit = [
      { malli: 'palloliitto', pvm: '2026-06-01', vastaukset: { a1: 8, a3: 8, a4: 8, a5: 8, a7: 8, a2: 70, a6: 40 } },
      { malli: 'palloliitto', pvm: '2026-06-10', vastaukset: { a1: 6, a3: 6, a4: 6, a5: 6, a7: 6, a2: 50, a6: 30 } },
      { malli: 'valmennustaidot', pvm: '2026-06-05', vastaukset: { b1: 4, b2: 4, b3: 4, b4: 4, b5: 4, b6: 4, b7: 4 } },
    ];
    const k = laskeValmentajaHarjoitusKooste(arvioinnit);
    expect(k.harjoituslaatu_ka).toBe(7);          // (8+6)/2
    expect(k.harjoituslaatu_n).toBe(2);
    expect(k.harjoituslaatu_pvm).toBe('2026-06-10');
    expect(k.harjoituslaatu_liike_pct).toBe(50);  // uusimmasta (06-10)
    expect(k.harjoituslaatu_maali_pct).toBe(30);
    expect(k.valmennustaito_ka).toBe(4);
    expect(k.valmennustaito_n).toBe(1);
  });
  it('laskeValmentajaHarjoitusKooste: tyhjä → null-kentät', () => {
    const k = laskeValmentajaHarjoitusKooste([]);
    expect(k.harjoituslaatu_ka).toBeNull();
    expect(k.harjoituslaatu_n).toBe(0);
    expect(k.valmennustaito_ka).toBeNull();
  });
});

describe('Harjoitusarviointi Vaihe 2.1 — dashboard-koosteet (HARJOITUSARVIOINTI_VAIHE2_SPEC)', () => {
  const arvioinnit = [
    { malli: 'palloliitto', joukkue: 'SJK P15', ikavaihe: 'nuoruus', valmentajaUid: 'c1', pvm: '2026-04-10', vastaukset: { a1: 8, a2: 60, a3: 6, a4: 7, a5: 9, a6: 50, a7: 5 } },
    { malli: 'palloliitto', joukkue: 'SJK P15', ikavaihe: 'nuoruus', valmentajaUid: 'c1', pvm: '2026-05-12', vastaukset: { a1: 6, a2: 40, a3: 4, a4: 5, a5: 7, a6: 30, a7: 3 } },
    { malli: 'palloliitto', joukkue: 'SJK P09', ikavaihe: 'lapsuus', valmentajaUid: 'c2', pvm: '2026-05-20', vastaukset: { a1: 9, a2: 70, a3: 8, a4: 8, a5: 9, a6: 60, a7: 7 } },
    { malli: 'valmennustaidot', joukkue: 'SJK P15', ikavaihe: 'nuoruus', valmentajaUid: 'c1', pvm: '2026-05-12', vastaukset: { b1: 4, b2: 4, b3: 4, b4: 4, b5: 4, b6: 4, b7: 4 } },
  ];
  it('koosta: suodatin malli=A oletus + per-kriteeri ka + %-erottelu (a2/a6)', () => {
    const k = koostaHarjoitusarvioinnit(arvioinnit);   // malli palloliitto oletus → 3 A-arviointia
    expect(k.n).toBe(3);
    expect(k.per_kriteeri.a2.ka).toBeCloseTo((60 + 40 + 70) / 3, 1);   // %-asteikko erikseen
    expect(k.per_kriteeri.a1.ka).toBeCloseTo((8 + 6 + 9) / 3, 1);
    expect(k.viimeisin_pvm).toBe('2026-05-20');
    expect(k.per_kriteeri.b1).toBeUndefined();         // ei B-avaimia A-koosteessa
  });
  it('koosta: joukkue- + valmentaja-suodatin', () => {
    const k = koostaHarjoitusarvioinnit(arvioinnit, { joukkue: 'sjk p15', valmentaja: 'c1' });
    expect(k.n).toBe(2);
    expect(k.ka).toBe(6);        // overall per arviointi = 7 ja 5 (a1,a3,a4,a5,a7 ka) → ka 6
  });
  it('koosta: ikävaihe-suodatin + aikaväli', () => {
    expect(koostaHarjoitusarvioinnit(arvioinnit, { ikavaihe: 'lapsuus' }).n).toBe(1);
    expect(koostaHarjoitusarvioinnit(arvioinnit, { aikavali: { alku: '2026-05-01', loppu: '2026-05-31' } }).n).toBe(2);
  });
  it('koosta: malli B', () => {
    const k = koostaHarjoitusarvioinnit(arvioinnit, { malli: 'valmennustaidot' });
    expect(k.n).toBe(1);
    expect(k.per_kriteeri.b1.ka).toBe(4);
  });
  it('koosta: tyhjä otos', () => {
    const k = koostaHarjoitusarvioinnit([], {});
    expect(k.n).toBe(0); expect(k.ka).toBeNull(); expect(k.viimeisin_pvm).toBeNull();
    expect(k.per_kriteeri.a1.ka).toBeNull();
  });
  it('trendi: kuukausi-bucket (oletus) erottaa kk-rajat', () => {
    const t = harjoitusTrendi(arvioinnit.filter(a => a.malli === 'palloliitto'));
    expect(t.map(x => x.label)).toEqual(['2026-04', '2026-05']);
    expect(t[0].n).toBe(1);   // huhtikuu 1
    expect(t[1].n).toBe(2);   // toukokuu 2
  });
  it('trendi: viikko- ja kausi-bucket', () => {
    const tv = harjoitusTrendi(arvioinnit.filter(a => a.malli === 'palloliitto'), { bucket: 'viikko' });
    expect(tv.every(x => /^\d{4}-W\d{2}$/.test(x.label))).toBe(true);
    const tk = harjoitusTrendi(arvioinnit.filter(a => a.malli === 'palloliitto'), { bucket: 'kausi' });
    expect(tk.length).toBe(1);                 // kaikki samalla kaudella (kevät 2026 → 2025/26)
    expect(tk[0].label).toBe('2025/26');
  });
  it('benchmark-delta: suunta + null-turva a7 (ei kansallista)', () => {
    const k = koostaHarjoitusarvioinnit(arvioinnit, { joukkue: 'SJK P15', valmentaja: 'c1' });
    const d = harjoitusBenchmarkDelta(k.per_kriteeri, { a1: 7, a2: 50, a3: 5, a4: 6, a5: 8, a6: 40, a7: null });
    expect(d.a1.delta).toBeCloseTo(7 - 7, 1);        // oma a1 ka = 7
    expect(d.a1.suunta).toBe('tasan');
    expect(d.a3.suunta).toBe('tasan');               // (6+4)/2=5 vs 5
    expect(d.a7.delta).toBeNull();                   // a7 ei kansallista
    expect(d.a7.suunta).toBe('neutraali');
  });
});

describe('Harjoitusarviointi Vaihe 2.2 — kalibraatiohistoria + arviointitapa-suodatin', () => {
  // 2 vahvistettua paria valmentajalle c1 + 1 vahvistamaton + 1 pariton havainnointi
  const arvioinnit = [
    // Pari 1 (vahvistettu): itse yliarvioi (itse korkeampi useassa kriteerissä, b1 +2)
    { malli: 'valmennustaidot', valmentajaUid: 'c1', valmentaja: 'Coach 1', joukkue: 'SJK P15', arviointitapa: 'itsearvio', pvm: '2026-04-01', pari_id: 'p1', pari_vahvistettu: true, vastaukset: { b1: 5, b2: 5, b3: 5, b4: 4, b5: 4, b6: 4, b7: 4 } },
    { malli: 'valmennustaidot', valmentajaUid: 'c1', valmentaja: 'Coach 1', joukkue: 'SJK P15', arviointitapa: 'havainnointi', pvm: '2026-04-02', pari_id: 'p1', pari_vahvistettu: true, vastaukset: { b1: 3, b2: 3, b3: 3, b4: 4, b5: 4, b6: 4, b7: 4 } },
    // Pari 2 (vahvistettu, myöhemmin): kuilu kaventunut (itse 4 vs hav 4 → 0)
    { malli: 'valmennustaidot', valmentajaUid: 'c1', valmentaja: 'Coach 1', joukkue: 'SJK P15', arviointitapa: 'itsearvio', pvm: '2026-06-01', pari_id: 'p2', pari_vahvistettu: true, vastaukset: { b1: 4, b2: 4, b3: 4, b4: 4, b5: 4, b6: 4, b7: 4 } },
    { malli: 'valmennustaidot', valmentajaUid: 'c1', valmentaja: 'Coach 1', joukkue: 'SJK P15', arviointitapa: 'havainnointi', pvm: '2026-06-02', pari_id: 'p2', pari_vahvistettu: true, vastaukset: { b1: 4, b2: 4, b3: 4, b4: 4, b5: 4, b6: 4, b7: 4 } },
    // Vahvistamaton pari → ei lasketa
    { malli: 'valmennustaidot', valmentajaUid: 'c1', arviointitapa: 'itsearvio', pvm: '2026-05-01', pari_id: 'p3', pari_vahvistettu: false, vastaukset: { b1: 5, b2: 5, b3: 5, b4: 5, b5: 5, b6: 5, b7: 5 } },
    { malli: 'valmennustaidot', valmentajaUid: 'c1', arviointitapa: 'havainnointi', pvm: '2026-05-02', pari_id: 'p3', pari_vahvistettu: false, vastaukset: { b1: 1, b2: 1, b3: 1, b4: 1, b5: 1, b6: 1, b7: 1 } },
    // Pariton havainnointi (pari_id mutta ei itsearvio-paria)
    { malli: 'valmennustaidot', valmentajaUid: 'c1', arviointitapa: 'havainnointi', pvm: '2026-03-01', pari_id: 'p9', pari_vahvistettu: true, vastaukset: { b1: 2, b2: 2, b3: 2, b4: 2, b5: 2, b6: 2, b7: 2 } },
  ];
  it('vain vahvistetut TÄYDET parit lasketaan (vahvistamaton + pariton pois)', () => {
    const h = harjoitusKalibraatioHistoria(arvioinnit);
    expect(h.c1).toBeTruthy();
    expect(h.c1.n_paria).toBe(2);     // p1 + p2; p3 vahvistamaton, p9 pariton → pois
  });
  it('kuilun etumerkki: itsearvio − havainnointi (b1 +2 ekassa parissa)', () => {
    const h = harjoitusKalibraatioHistoria(arvioinnit);
    expect(h.c1.parit[0].per_kriteeri.b1).toBe(2);   // itse 5 − hav 3
    expect(h.c1.suunta).toBe('yliarvio');            // keskimäärin itse > hav
    expect(h.c1.suurin_kuilu_kriteeri).toBe('b1');
  });
  it('keskikuilu + kaventuminen (eka kuilu > vika)', () => {
    const h = harjoitusKalibraatioHistoria(arvioinnit);
    expect(h.c1.parit[0].ka_abs_kuilu).toBeGreaterThan(h.c1.parit[1].ka_abs_kuilu);
    expect(h.c1.kaventuu).toBe(true);
    expect(h.c1.trendi.length).toBe(2);
  });
  it('tyhjä / ei pareja → tyhjä objekti', () => {
    expect(Object.keys(harjoitusKalibraatioHistoria([])).length).toBe(0);
  });
  it('koostaHarjoitusarvioinnit: arviointitapa-suodatin (malli B)', () => {
    const k = koostaHarjoitusarvioinnit(arvioinnit, { malli: 'valmennustaidot', arviointitapa: 'havainnointi' });
    // havainnoinnit: p1-hav, p2-hav, p3-hav, p9-hav = 4
    expect(k.n).toBe(4);
    const ki = koostaHarjoitusarvioinnit(arvioinnit, { malli: 'valmennustaidot', arviointitapa: 'itsearvio' });
    expect(ki.n).toBe(3);
  });
});

describe('Harjoitusarviointi Vaihe 2.3a — omaKehitysKooste (valmentajan oma data)', () => {
  const data = [
    // omat (c1)
    { malli: 'palloliitto', valmentajaUid: 'c1', joukkue: 'SJK P15', pvm: '2026-04-10', vastaukset: { a1: 6, a2: 50, a3: 5, a4: 5, a5: 6, a6: 40, a7: 4 } },
    { malli: 'palloliitto', valmentajaUid: 'c1', joukkue: 'SJK P15', pvm: '2026-05-10', vastaukset: { a1: 8, a2: 60, a3: 7, a4: 7, a5: 8, a6: 50, a7: 6 } },
    { malli: 'valmennustaidot', valmentajaUid: 'c1', joukkue: 'SJK P15', arviointitapa: 'itsearvio', pvm: '2026-05-01', pari_id: 'p1', pari_vahvistettu: true, reflektio: { onnistui: 'Hyvä energia', toisin: 'Vähemmän jonotusta', kehityskohde: 'Eriyttäminen' }, vastaukset: { b1: 5, b2: 4, b3: 4, b4: 4, b5: 4, b6: 4, b7: 4 } },
    { malli: 'valmennustaidot', valmentajaUid: 'c1', joukkue: 'SJK P15', arviointitapa: 'havainnointi', pvm: '2026-05-02', pari_id: 'p1', pari_vahvistettu: true, vastaukset: { b1: 3, b2: 4, b3: 4, b4: 4, b5: 4, b6: 4, b7: 4 } },
    // toisen valmentajan data (c2) → EI saa näkyä c1:n koosteessa
    { malli: 'palloliitto', valmentajaUid: 'c2', joukkue: 'SJK P09', pvm: '2026-05-15', vastaukset: { a1: 9, a2: 70, a3: 8, a4: 8, a5: 9, a6: 60, a7: 7 } },
  ];
  it('vain oman uid:n data (ei vertailua muihin)', () => {
    const k = omaKehitysKooste(data, 'c1');
    expect(k.n_A).toBe(2);   // c2 ei mukana
    expect(k.n_B).toBe(2);
  });
  it('A/B-trendit kuukausibucketilla', () => {
    const k = omaKehitysKooste(data, 'c1');
    expect(k.trendA.map(t => t.label)).toEqual(['2026-04', '2026-05']);
    expect(k.trendB.length).toBe(1);   // molemmat B samalla kk
    expect(k.viimA).toBe(7.2);         // toukokuun A overall (8+7+7+8+6)/5
  });
  it('oma kalibraatio vahvistetusta parista', () => {
    const k = omaKehitysKooste(data, 'c1');
    expect(k.kalib).toBeTruthy();
    expect(k.kalib.n_paria).toBe(1);
    expect(k.kalib.per_kriteeri.b1).toBe(2);   // itse 5 − hav 3
  });
  it('reflektiopäiväkirja + seuraava askel uusimmasta kehityskohteesta', () => {
    const k = omaKehitysKooste(data, 'c1');
    expect(k.reflektiot.length).toBe(1);
    expect(k.reflektiot[0].onnistui).toBe('Hyvä energia');
    expect(k.seuraavaAskel.teksti).toBe('Eriyttäminen');
  });
  it('tyhjä / tuntematon uid → tyhjä kooste', () => {
    const k = omaKehitysKooste(data, 'cX');
    expect(k.n_A).toBe(0); expect(k.n_B).toBe(0);
    expect(k.kalib).toBeNull(); expect(k.seuraavaAskel).toBeNull();
    expect(k.reflektiot.length).toBe(0);
  });
});

describe('Harjoitusarviointi Vaihe 2.3b-2 — cpdKooste (CPD-todiste)', () => {
  const reflektiot = [{ cpd_minuutit: 30 }, { cpd_minuutit: 90 }, { cpd_minuutit: null }, {}, { cpd_minuutit: 'x' }];
  it('reflektio-CPD = Σ cpd_minuutit → tunnit (null/virhe ohitetaan)', () => {
    const c = cpdKooste(reflektiot, 0, null);
    expect(c.reflektio_min).toBe(120);   // 30+90
    expect(c.reflektio_h).toBe(2);
  });
  it('kertynyt = reflektio-CPD + koulutus-/kurssitunnit (cpd_tunnit_kausi)', () => {
    const c = cpdKooste(reflektiot, 5, null);
    expect(c.koulutus_h).toBe(5);
    expect(c.kertynyt_h).toBe(7);        // 2 + 5
  });
  it('edistymä-% VAIN jos vaatimus asetettu (datagate)', () => {
    expect(cpdKooste(reflektiot, 5, null).edistyma_pct).toBeNull();   // ei vaatimusta
    expect(cpdKooste(reflektiot, 5, null).vaatimus_h).toBeNull();
    const c = cpdKooste(reflektiot, 5, 10);   // vaatimus 10 h, kertynyt 7
    expect(c.vaatimus_h).toBe(10);
    expect(c.edistyma_pct).toBe(70);
  });
  it('edistymä cap 100 %', () => {
    expect(cpdKooste([{ cpd_minuutit: 600 }], 5, 10).edistyma_pct).toBe(100);   // 10+5=15 > 10
  });
  it('tyhjä → 0 kertynyt, ei vaatimusta', () => {
    const c = cpdKooste([], null, null);
    expect(c.kertynyt_h).toBe(0); expect(c.edistyma_pct).toBeNull();
  });
});

describe('laskeVPTuloskortti + laskeTavoiteToteuma (VP_TULOSKORTTI_SPEC)', () => {
  const NYT = new Date(2026, 5, 22).getTime();
  it('toimenpideaste = toimennetut underdogit / underdogit', () => {
    const team = [
      { rae_kvartaali: 'Q4', d2_taso: 3, talenttiOhjelma: true },   // underdog + toimennettu
      { rae_kvartaali: 'Q4', d2_taso: 3 },                          // underdog, ei toimenpidettä
    ];
    const k = laskeVPTuloskortti(team, [], null, NYT);
    expect(k.metriikat.underdog_n).toBe(2);
    expect(k.metriikat.toimenpideaste_pct).toBe(50);
  });
  it('tavoite vs toteuma ✓/✗ (suunta yli/alle)', () => {
    const kortti = { metriikat: { taso3_pct: 45, rae_q1_pct: 30 } };
    const t = laskeTavoiteToteuma(kortti, { taso3_pct: { tavoite: 40, alue: 'II' }, rae_q1_max: { tavoite: 35, alue: 'IV' } });
    expect(t.find(x => x.mittariId === 'taso3_pct').saavutettu).toBe(true);    // 45 ≥ 40
    expect(t.find(x => x.mittariId === 'rae_q1_max').saavutettu).toBe(true);   // 30 ≤ 35
    const t2 = laskeTavoiteToteuma({ metriikat: { taso3_pct: 30 } }, { taso3_pct: { tavoite: 40, alue: 'II' } });
    expect(t2[0].saavutettu).toBe(false);
    expect(t2[0].alue).toBe('II');
  });
  it('ylätaso: auditValmius /4 + tavoitteetSaavutettu /N', () => {
    const k = laskeVPTuloskortti([], [], { taso3_pct: { tavoite: 40, alue: 'II' } }, NYT);
    expect(typeof k.ylataso.auditValmius_x_per4).toBe('number');
    expect(k.ylataso.auditValmius_x_per4).toBeGreaterThanOrEqual(0);
    expect(k.ylataso.auditValmius_x_per4).toBeLessThanOrEqual(4);
    expect(k.ylataso.tavoitteetSaavutettu_per_n.n).toBe(1);
  });
  it('tyhjä joukkue → datagate (status "tulossa"), ei kaadu', () => {
    const k = laskeVPTuloskortti([], [], null, NYT);
    expect(k.alueet.I.status).toBe('tulossa');
    expect(k.alueet.II.status).toBe('tulossa');
    expect(k.alueet.III.status).toBe('tulossa');
    expect(k.toteumat).toEqual([]);
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

  it('§28 ikätietoinen: PHV-null + ika≥13 → oletus:true (taso näkyy), ika≤12 → neutraali:true', () => {
    // PHV puuttuu, ika 14 → 30m näyttää tason, oletus-lippu
    const r14 = perTestTasot({ hh_viimeisin: { lin30m: 6.0 } }, 14, 'M').find(x => x.label === '30m');
    expect(r14.neutraali).toBe(false);
    expect(r14.oletus).toBe(true);
    expect(r14.taso).toBeGreaterThan(0);
    // PHV puuttuu, ika 11 → neutraali (pre-PHV todennäköinen)
    const r11 = perTestTasot({ hh_viimeisin: { lin30m: 6.0 } }, 11, 'M').find(x => x.label === '30m');
    expect(r11.neutraali).toBe(true);
    expect(r11.oletus).toBe(false);
    // PHV PRE, ika 14 → neutraali (vahvistettu pre-PHV, mikä ikä tahansa)
    const rPre = perTestTasot({ hh_viimeisin: { lin30m: 6.0 }, phv_tila: 'PRE' }, 14, 'M').find(x => x.label === '30m');
    expect(rPre.neutraali).toBe(true);
    expect(rPre.oletus).toBe(false);
    // PHV POST, ika 14 → ei kumpaakaan
    const rPost = perTestTasot({ hh_viimeisin: { lin30m: 6.0 }, phv_tila: 'POST' }, 14, 'M').find(x => x.label === '30m');
    expect(rPost.neutraali).toBe(false);
    expect(rPost.oletus).toBe(false);
    // 5m EI saa oletus/neutraali (ei NEUTR-testi)
    const r5 = perTestTasot({ hh_viimeisin: { lin5m: 1.5 } }, 14, 'M').find(x => x.label === '5m');
    expect(r5.neutraali).toBe(false);
    expect(r5.oletus).toBe(false);
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

// ═══════════════════════════════════════════════════════════════════
// IKÄKONVENTIO §24/§26 — normiIka / raeKvartaali (docs/IKAKONVENTIO_SPEC.md)
// ═══════════════════════════════════════════════════════════════════
describe('normiIka (norminhaun ikäluokka)', () => {
  it('haara 1: year(testipvm) − syntymaVuosi, EI 1.7.-vähennystä', () => {
    expect(normiIka(2015, '2025-06-10')).toBe(10);   // kevättesti → silti 10 (ei 9)
    expect(normiIka(2015, '2025-11-20')).toBe(10);
    expect(normiIka(2015, '10.6.2025')).toBe(10);     // pp.kk.vvvv
    expect(Number.isInteger(normiIka(2015, '2025-06-10'))).toBe(true);  // kokonaisluku (ikäluokka)
  });
  it('haara 2: pvm puuttuu → currentYear − syntymaVuosi', () => {
    expect(normiIka(2015, null)).toBe(new Date().getFullYear() - 2015);
  });
  it('haara 3: syntymaVuosi puuttuu → joukkuenimi-fallback', () => {
    expect(normiIka(null, '2025-06-10', 'SJK P14')).toBe(14);
    expect(normiIka(null, null, 'EPS T11')).toBe(11);
    expect(normiIka(null, null, 'U15')).toBe(15);
    expect(normiIka(null, null, null)).toBeNull();
  });
  it('idempotentti: sama tulos toistuvilla kutsuilla (recalcHH-determinismi)', () => {
    expect(normiIka(2015, '2025-06-10')).toBe(normiIka(2015, '2025-06-10'));
    // sama ika → sama d1-taso (recalcHH:n taso-determinismi: ika tallennetuista kentistä, ei Date.now)
    const hh = { lin10m: 2.1, lin30m: 5.05 };
    const a = laskeD1Joustava(hh, normiIka(2015, '2025-06-10'), 'M');
    const b = laskeD1Joustava(hh, normiIka(2015, '2025-06-10'), 'M');
    expect(a.taso).toBe(b.taso);
  });
});

describe('RAE-näkyvyys Vaihe 1 — isUnderdog + raeJoukkueJakauma (RAE_NAKYVYYS_SPEC)', () => {
  it('isUnderdog: Q4 + lvl≥3 (jokin dimensio) → true', () => {
    expect(isUnderdog({ rae_kvartaali: 'Q4', d1_taso: 3 })).toBe(true);
    expect(isUnderdog({ rae_kvartaali: 'Q4', hh_taso: 4 })).toBe(true);
    expect(isUnderdog({ rae_kvartaali: 'Q4', tki_viimeisin: 65 })).toBe(true);   // laskeD2Joustava: 65/20→3.3 ≥3
  });
  it('isUnderdog: Q4 mutta lvl<3 → false; ei-Q4 → false', () => {
    expect(isUnderdog({ rae_kvartaali: 'Q4', d1_taso: 2 })).toBe(false);
    expect(isUnderdog({ rae_kvartaali: 'Q4' })).toBe(false);          // ei dataa → lvl null
    expect(isUnderdog({ rae_kvartaali: 'Q1', d1_taso: 5 })).toBe(false);
    expect(isUnderdog({ d1_taso: 5 })).toBe(false);                   // ei kvartaalia
    expect(isUnderdog(null)).toBe(false);
  });
  it('isUnderdog: kvartaali syntymäajasta jos pikakenttä puuttuu', () => {
    expect(isUnderdog({ syntymaaika: '2015-11-10', d2_taso: 3 })).toBe(true);   // marras → Q4
  });
  it('raeChip.underdog === isUnderdog (sama lähde)', () => {
    const p = { rae_kvartaali: 'Q4', d1_taso: 3 };
    expect(raeChip(p).underdog).toBe(isUnderdog(p));
    expect(raeChip(p).q).toBe('Q4');
  });
  it('raeJoukkueJakauma: lkm + pct vain kvartaalillisista', () => {
    const team = [
      { rae_kvartaali: 'Q1' }, { rae_kvartaali: 'Q1' }, { rae_kvartaali: 'Q2' },
      { rae_kvartaali: 'Q4' }, { /* ei kvartaalia */ },
    ];
    const j = raeJoukkueJakauma(team);
    expect(j.n_kvartaalillisia).toBe(4);   // 5. ei lasketa
    expect(j.Q1).toBe(2); expect(j.Q4).toBe(1);
    expect(j.pct.Q1).toBe(50);
  });
  it('raeJoukkueJakauma: Q1>40% → valintaharha', () => {
    const team = [{ rae_kvartaali: 'Q1' }, { rae_kvartaali: 'Q1' }, { rae_kvartaali: 'Q1' }, { rae_kvartaali: 'Q2' }];
    expect(raeJoukkueJakauma(team).signaali).toBe('valintaharha');   // 75% Q1
  });
  it('raeJoukkueJakauma: Q4>25% (eikä Q1>40) → underdog_ok', () => {
    const team = [{ rae_kvartaali: 'Q4' }, { rae_kvartaali: 'Q4' }, { rae_kvartaali: 'Q2' }, { rae_kvartaali: 'Q3' }];
    expect(raeJoukkueJakauma(team).signaali).toBe('underdog_ok');    // 50% Q4
  });
  it('raeJoukkueJakauma: tasapaino + tyhjä → null', () => {
    expect(raeJoukkueJakauma([{ rae_kvartaali: 'Q1' }, { rae_kvartaali: 'Q2' }, { rae_kvartaali: 'Q3' }, { rae_kvartaali: 'Q4' }]).signaali).toBe('tasapaino');
    expect(raeJoukkueJakauma([{}, {}]).signaali).toBeNull();   // ei kvartaaleja
    expect(raeJoukkueJakauma([]).n_kvartaalillisia).toBe(0);
  });
  it('Q1>40 voittaa Q4>25 (prioriteetti)', () => {
    // Q1 3/6=50%, Q4 2/6=33% → valintaharha
    const team = [{ rae_kvartaali: 'Q1' }, { rae_kvartaali: 'Q1' }, { rae_kvartaali: 'Q1' }, { rae_kvartaali: 'Q4' }, { rae_kvartaali: 'Q4' }, { rae_kvartaali: 'Q2' }];
    expect(raeJoukkueJakauma(team).signaali).toBe('valintaharha');
  });
});

describe('raeKvartaali + RAE_KERROIN (§14/§30)', () => {
  it('kk → Q-rajat (Jan-1-katkaisu)', () => {
    expect(raeKvartaali('2015-01-15')).toBe('Q1');
    expect(raeKvartaali('2015-03-31')).toBe('Q1');
    expect(raeKvartaali('2015-04-01')).toBe('Q2');
    expect(raeKvartaali('2015-06-30')).toBe('Q2');
    expect(raeKvartaali('2015-07-01')).toBe('Q3');
    expect(raeKvartaali('2015-09-30')).toBe('Q3');
    expect(raeKvartaali('2015-10-01')).toBe('Q4');
    expect(raeKvartaali('2015-12-31')).toBe('Q4');
  });
  it('null/virheellinen → null', () => {
    expect(raeKvartaali(null)).toBeNull();
    expect(raeKvartaali('')).toBeNull();
  });
  it('RAE_KERROIN määritelty (§30)', () => {
    expect(RAE_KERROIN).toEqual({ Q1: 0.92, Q2: 0.96, Q3: 1.02, Q4: 1.06 });
  });
});

describe('d3Varmuus (D3_KALIBRAATIO_SPEC malli A)', () => {
  it('pelaaja + valmentaja → trianguloitu', () => {
    expect(d3Varmuus(['valmentaja', 'pelaaja'])).toBe('trianguloitu');
    expect(d3Varmuus(['pelaaja', 'valmentaja'])).toBe('trianguloitu');
  });
  it('vain pelaaja → itsearvio', () => {
    expect(d3Varmuus(['pelaaja'])).toBe('itsearvio');
  });
  it('vain valmentaja → valmentaja', () => {
    expect(d3Varmuus(['valmentaja'])).toBe('valmentaja');
  });
  it('tyhjä/null → null', () => {
    expect(d3Varmuus([])).toBeNull();
    expect(d3Varmuus(null)).toBeNull();
    expect(d3Varmuus(undefined)).toBeNull();
  });
  it('chip: tunnettu tila → HTML, tuntematon/null → tyhjä', () => {
    expect(d3VarmuusChip('itsearvio')).toContain('itsearvio');
    expect(d3VarmuusChip('trianguloitu')).toContain('trianguloitu');
    expect(d3VarmuusChip(null)).toBe('');
    expect(d3VarmuusChip('outo')).toBe('');
  });
});

describe('D3 kalibraatio (renderD3VertailuHTML + d3VpKuiluPelaajalla, malli A)', () => {
  it('D3_DIMS = 5 kanonista ulottuvuutta', () => {
    expect(D3_DIMS.map(d => d.key)).toEqual(['inner_drive', 'coachability', 'resilience', 'focus', 'emotional_control']);
  });
  it('vertailu: tyhjä → tyhjä string', () => {
    expect(renderD3VertailuHTML(null)).toBe('');
    expect(renderD3VertailuHTML({})).toBe('');
  });
  it('vertailu: ⚠ kun kuilu ≥1.5 (max−min)', () => {
    const html = renderD3VertailuHTML({ inner_drive: { pelaaja: 5, valmentaja: 2 }, focus: { valmentaja: 3, vp: 3 } });
    expect(html).toContain('⚠');
    expect(html).toContain('Sisäinen motivaatio');
  });
  it('vpKuilu: VAIN valmentaja vs vp ≥1.5 → true', () => {
    expect(d3VpKuiluPelaajalla({ resilience: { valmentaja: 4, vp: 2 } })).toBe(true);
    expect(d3VpKuiluPelaajalla({ resilience: { valmentaja: 4, vp: 3 } })).toBe(false);
    expect(d3VpKuiluPelaajalla({ resilience: { valmentaja: 4 } })).toBe(false);
    expect(d3VpKuiluPelaajalla(null)).toBe(false);
  });
  it('vpKuilu EI laukea pelkästä pelaaja–vp erosta (malli A: vain valmentaja vs vp)', () => {
    expect(d3VpKuiluPelaajalla({ x: { pelaaja: 5, vp: 1 } })).toBe(false);
  });
});

describe('Excel-tuonti sp-skooppi (regressio: 0/0 Pallo-Iirot P11)', () => {
  it('normSukupuoliMN: Excel/Firestore/P-T → M/N, roska → null', () => {
    expect(normSukupuoliMN('p')).toBe('M');   // Excel lowercase
    expect(normSukupuoliMN('P')).toBe('M');
    expect(normSukupuoliMN('M')).toBe('M');   // Firestore
    expect(normSukupuoliMN('t')).toBe('N');
    expect(normSukupuoliMN('N')).toBe('N');
    expect(normSukupuoliMN('')).toBeNull();
    expect(normSukupuoliMN(null)).toBeNull();
    expect(normSukupuoliMN(undefined)).toBeNull();
  });

  it('Pallo-Iirot P11 osapatteri (10m+30m → D1, syöttö+pujottelu → D2) laskee tasot M/N:llä', () => {
    const hh = { lin10m: 2.1, lin30m: 5.4, syotto: 49.8, pujottelu: 34.6 };
    const sp = normSukupuoliMN('p');          // → 'M'
    const d1 = laskeD1Joustava(hh, 10, sp);
    expect(d1).not.toBeNull();
    expect(d1.kattavuus).toBe(2);             // vain 10m + 30m mitattu
    expect(d1.lahde).toBe('hh');
    const d2 = laskeD2HH(hh, 10, sp);
    expect(d2).not.toBeNull();
    expect(d2.kattavuus).toBe(2);             // syöttö + pujottelu
  });

  it('sp=null → indeksifunktiot palauttavat null (ei heitä) → recalcHH backfillaa', () => {
    const hh = { lin10m: 2.1, lin30m: 5.4 };
    expect(laskeD1Joustava(hh, 10, null)).toBeNull();
    expect(laskeD2HH({ syotto: 49.8, pujottelu: 34.6 }, 10, null)).toBeNull();
  });
});

describe('Kehitysvaihe-neutraalius (Vaihe B, §28 + Eerikkilä §8.1)', () => {
  it('onNeutraaliPrePHV: P11 ilman PHV-dataa = pre-PHV (neutraali)', () => {
    expect(onNeutraaliPrePHV({ joukkue:'Pallo-Iirot P11', syntymaVuosi:2015, hh_pvm:'2026-02-08' })).toBe(true);
    expect(onNeutraaliPrePHV({ phv_tila:'PRE' })).toBe(true);
    expect(onNeutraaliPrePHV({ phv_tila:'POST' })).toBe(false);
    expect(onNeutraaliPrePHV({ joukkue:'SJK P15', syntymaVuosi:2011, hh_pvm:'2026-02-08' })).toBe(false); // 15v
  });
  it('laskeD1Joustava sisältää sm_juoksun (kattavuus kasvaa)', () => {
    const hh = { lin10m:2.1, lin30m:5.4, sm_juoksu:9.0 };
    const d1 = laskeD1Joustava(hh, 11, 'M');
    expect(d1).not.toBeNull();
    expect(d1.kattavuus).toBe(3);   // 10m + 30m + sm_juoksu
  });
});

describe('teknHeikoimmat20 (Vaihe B′, §10 joukkuesuhteellinen Kehityskohde)', () => {
  const mk = (id, d2, syotto, pujottelu) => ({ id, d2_taso: d2, hh_viimeisin: { syotto, pujottelu } });
  it('palauttaa ceil(20%) heikointa; d2-klusterin sisällä raaka syöttö+pujottelu ratkaisee', () => {
    const team = [
      mk('a', 1, 30, 20),  // raaka 50
      mk('b', 1, 35, 25),  // 60
      mk('c', 1, 40, 30),  // 70  ← heikoin (suurin raaka)
      mk('d', 1, 32, 22),  // 54
      mk('e', 1, 38, 28),  // 66  ← toiseksi heikoin
      mk('f', 1, 31, 21),  // 52
      mk('g', 1, 33, 23),  // 56
      mk('h', 1, 34, 24),  // 58
      mk('i', 2, 50, 40),  // taso 2 → parempi taso, ei valita vaikka raaka iso
      mk('j', 2, 10, 5),   // taso 2
    ];
    const set = teknHeikoimmat20(team);
    expect(set.size).toBe(2);          // ceil(10 * 0.2)
    expect(set.has('c')).toBe(true);   // suurin raaka taso-1-klusterissa
    expect(set.has('e')).toBe(true);   // toiseksi suurin
    expect(set.has('i')).toBe(false);  // taso 2 ei valita (parempi d2_taso)
  });
  it('tyhjä/d2-tonta lista → tyhjä Set (ei kaadu)', () => {
    expect(teknHeikoimmat20([]).size).toBe(0);
    expect(teknHeikoimmat20(null).size).toBe(0);
    expect(teknHeikoimmat20([{ etunimi: 'A', sukunimi: 'B' }]).size).toBe(0);  // ei d2_taso → ei arvioitava
  });
});

describe('d2SmPalloFallback (#68 SJK d2-vakautus, §14)', () => {
  it('antaa d2 lahde sm_pallo kun ei syöttö/pujottelua (laskeD2HH null) mutta sm_pallo mitattu', () => {
    const r = d2SmPalloFallback({ sm_pallo_viimeisin: 7.5 }, 13, 'M', false);
    expect(r).not.toBeNull();
    expect(r.lahde).toBe('sm_pallo');
    expect(r.kattavuus).toBe(1);
    expect(r.taso).toBeGreaterThan(0);
  });
  it('EI ylikirjoita tki-lähdettä (Sibbo)', () => {
    expect(d2SmPalloFallback({ sm_pallo_viimeisin: 7.5, tki_viimeisin: 55 }, 13, 'M', false)).toBeNull();
  });
  it('EI ylikirjoita H-H-lähdettä (d2_lahde hh)', () => {
    expect(d2SmPalloFallback({ sm_pallo_viimeisin: 7.5, d2_taso: 3, d2_lahde: 'hh' }, 13, 'M', false)).toBeNull();
  });
  it('EI laukea kun H-H-d2 jo laskettu (onD2HH) tai sm_pallo puuttuu', () => {
    expect(d2SmPalloFallback({ sm_pallo_viimeisin: 7.5 }, 13, 'M', true)).toBeNull();   // onD2HH
    expect(d2SmPalloFallback({}, 13, 'M', false)).toBeNull();                            // ei sm_pallo
    expect(d2SmPalloFallback({ sm_pallo_viimeisin: 7.5 }, null, 'M', false)).toBeNull(); // ei ikä
  });
  it('korvaa olemassa olevan sm/sm_pallo-lähteen (ei parempaa)', () => {
    const r = d2SmPalloFallback({ sm_pallo_viimeisin: 7.5, d2_taso: 2, d2_lahde: 'sm' }, 13, 'M', false);
    expect(r).not.toBeNull();
    expect(r.lahde).toBe('sm_pallo');
  });
});

describe('tasoJakauma + tkiTavoiteJakauma (#67 Tavoitetaso-näkymä)', () => {
  it('tasoJakauma: jakauma 1–5, ka, ≥3-osuus; null/NaN ohitetaan', () => {
    const r = tasoJakauma([1, 2, 3, 4, 5, null, NaN, 3]);
    expect(r.n).toBe(6);                    // 6 mitattua (null+NaN pois)
    expect(r.jakauma).toEqual([1, 1, 2, 1, 1]);   // taso 3 kahdesti
    expect(r.n_tavoite).toBe(4);            // tasot 3,4,5,3 ≥3
    expect(r.osuus_pct).toBe(67);           // 4/6
    expect(r.ka).toBeCloseTo(3.0, 1);       // (1+2+3+4+5+3)/6 = 3.0
  });
  it('tasoJakauma: tyhjä → n 0, osuus_pct null (ei fabrikoida)', () => {
    const r = tasoJakauma([]);
    expect(r.n).toBe(0);
    expect(r.osuus_pct).toBeNull();
    expect(r.ka).toBeNull();
  });
  it('tasoJakauma: desimaalitaso pyöristyy pylvääseen, clamp 1–5', () => {
    const r = tasoJakauma([2.4, 2.6, 6, 0]);   // → pylväät 2,3,5,1
    expect(r.jakauma).toEqual([1, 1, 1, 0, 1]);
    expect(r.n).toBe(4);
  });
  it('tkiTavoiteJakauma: bändit + TKI≥60-osuus', () => {
    const r = tkiTavoiteJakauma([35, 50, 62, 80, null]);
    expect(r.n).toBe(4);
    expect(r.bandit).toEqual({ alle40: 1, keski: 1, hyva: 2 });
    expect(r.n_tavoite).toBe(2);            // 62, 80 ≥60
    expect(r.osuus_pct).toBe(50);
    expect(r.ka).toBe(57);                  // round((35+50+62+80)/4)=57
  });
  it('tkiTavoiteJakauma: tyhjä → osuus_pct null', () => {
    expect(tkiTavoiteJakauma([]).osuus_pct).toBeNull();
  });
});

describe('tavoiteRadarAkselit (#73 per-testi-radar — akselivalinta + ka + collapse)', () => {
  it('H-H-data → hh-akselit, vain mitatut, joukkueen raaka-ka', () => {
    const team = [
      { hh_viimeisin: { lin10m: 2.1, lin30m: 5.4, syotto: 40 } },
      { hh_viimeisin: { lin10m: 2.0, lin30m: 5.2, syotto: 38 } },
    ];
    const r = tavoiteRadarAkselit(team);
    expect(r.tyyppi).toBe('hh');
    expect(r.akselit.map(a => a.kentta)).toEqual(['lin10m', 'lin30m', 'syotto']);
    const lin30 = r.akselit.find(a => a.kentta === 'lin30m');
    expect(lin30.raakaKa).toBe(5.3);   // (5.4+5.2)/2
    expect(lin30.n).toBe(2);
  });
  it('TK-data (_s-avaimet, ei hh) → tk-lajiakselit + laji-id (#74 Sibbo-fix)', () => {
    // tk_lajit_viimeisin tallennetaan _s-suffiksilla (§26) → ilman tätä Sibbo sai 0 akselia → null.
    const team = [
      { tk_lajit_viimeisin: { ponnauttelu_s: 20, syotto_s: 15, pujottelu_s: 18, kuljetus_laukaus_s: 12 } },
      { tk_lajit_viimeisin: { ponnauttelu_s: 22, syotto_s: 17, pujottelu_s: 16, kuljetus_laukaus_s: 14 } },
    ];
    const r = tavoiteRadarAkselit(team);
    expect(r).not.toBeNull();
    expect(r.tyyppi).toBe('tk');
    expect(r.akselit.length).toBeGreaterThanOrEqual(3);
    expect(r.akselit.map(a => a.kentta)).toEqual(['ponnauttelu_s', 'syotto_s', 'pujottelu_s', 'kuljetus_laukaus_s']);
    // laji-id (ilman _s) tkLajiTaso:a varten — muutoin TK-akselit piirtyisivät raakasekunteina.
    expect(r.akselit.map(a => a.laji)).toEqual(['ponnauttelu', 'syotto', 'pujottelu', 'kuljetus_laukaus']);
    expect(r.akselit.find(a => a.laji === 'ponnauttelu').raakaKa).toBe(21);   // (20+22)/2
  });
  // SEKADATA (fix/vp-sekadata): rikkain patteristo voittaa (eniten akseleita ≥3), tasan → hh. Aiemmin 'hh' voitti
  // jos yksikin pelaaja oli H-H-testattu → harva H-H (2 akselia) ohitti rikkaan TK:n → Sibbon T-joukkueiden radar collapse.
  const TK4 = { ponnauttelu_s: 20, syotto_s: 15, pujottelu_s: 18, kuljetus_laukaus_s: 12 };
  it('SJK: H-H 5 akselia + TK 0 → hh (fyysinen radar, ennallaan)', () => {
    const team = [{ hh_viimeisin: { lin5m: 1.1, lin10m: 2.0, lin30m: 5.0, cmj: 30, mas: 15 } }];
    expect(tavoiteRadarAkselit(team).tyyppi).toBe('hh');
  });
  it('Sibbo nyt: H-H 2 akselia + TK 4 → tk (harva H-H ei enää ohita rikasta TK:ta)', () => {
    const team = [{ hh_viimeisin: { lin10m: 2.0, lin30m: 5.0 }, tk_lajit_viimeisin: TK4 }];
    expect(tavoiteRadarAkselit(team).tyyppi).toBe('tk');
  });
  it('Sibbo kasirata-backfillin jälkeen: H-H 3 + TK 4 → tk (rikkain voittaa, TK 4 > HH 3)', () => {
    const team = [{ hh_viimeisin: { lin10m: 2.0, lin30m: 5.0, kasirata: 7.8 }, tk_lajit_viimeisin: TK4 }];
    expect(tavoiteRadarAkselit(team).tyyppi).toBe('tk');
  });
  it('H-H 4 + TK 3 → hh (rikkain)', () => {
    const team = [{ hh_viimeisin: { lin10m: 2.0, lin30m: 5.0, kasirata: 7.8, cmj: 30 },
      tk_lajit_viimeisin: { ponnauttelu_s: 20, syotto_s: 15, pujottelu_s: 18 } }];
    expect(tavoiteRadarAkselit(team).tyyppi).toBe('hh');
  });
  it('tasapeli H-H 3 + TK 3 → hh (fyysinen primaari)', () => {
    const team = [{ hh_viimeisin: { lin10m: 2.0, lin30m: 5.0, kasirata: 7.8 },
      tk_lajit_viimeisin: { ponnauttelu_s: 20, syotto_s: 15, pujottelu_s: 18 } }];
    expect(tavoiteRadarAkselit(team).tyyppi).toBe('hh');
  });
  it('H-H 0 + TK 4 → tk', () => {
    expect(tavoiteRadarAkselit([{ tk_lajit_viimeisin: TK4 }]).tyyppi).toBe('tk');
  });
  it('regressio T13: yksi H-H-pelaaja (HH=2) + muut TKI (TK=4) → tk (ei collapse)', () => {
    const team = [{ hh_viimeisin: { lin10m: 2.0, lin30m: 5.0 } }];
    for (let i = 0; i < 5; i++) team.push({ tk_lajit_viimeisin: TK4 });
    expect(tavoiteRadarAkselit(team).tyyppi).toBe('tk');
  });
  it('<3 akselia kummallakaan → null (collapse, kuten 5D-radar)', () => {
    expect(tavoiteRadarAkselit([{ hh_viimeisin: { lin30m: 5.0 } }])).toBeNull();
    expect(tavoiteRadarAkselit([{ hh_viimeisin: { lin30m: 5.0, cmj: 30 } }])).toBeNull();   // H-H 2 + TK 0
    expect(tavoiteRadarAkselit([{ hh_viimeisin: { lin30m: 5.0, cmj: 30 },
      tk_lajit_viimeisin: { syotto_s: 15, pujottelu_s: 18 } }])).toBeNull();   // H-H 2 + TK 2
  });
  it('ei mittausdataa → null', () => {
    expect(tavoiteRadarAkselit([])).toBeNull();
    expect(tavoiteRadarAkselit([{ etunimi: 'A' }])).toBeNull();
    expect(tavoiteRadarAkselit(null)).toBeNull();
  });
  // Osa A — tyyppivalinta erotettu datasta (kohortti-vakautus).
  it('tavoiteRadarAkselit(team, "tk"): pakottaa TK vaikka HH rikkaampi (kohortti-vakaus)', () => {
    const team = [{ hh_viimeisin: { lin5m: 1.1, lin10m: 2.0, lin30m: 5.0, cmj: 30, mas: 15 }, tk_lajit_viimeisin: TK4 }];
    expect(tavoiteRadarAkselit(team, 'tk').tyyppi).toBe('tk');   // auto valitsisi 'hh' (5>4)
    expect(tavoiteRadarAkselit(team, 'tk').akselit.length).toBe(4);
  });
  it('tavoiteRadarAkselit(team, "hh"): pakottaa HH vaikka TK rikkaampi', () => {
    const team = [{ hh_viimeisin: { lin10m: 2.0, lin30m: 5.0 }, tk_lajit_viimeisin: TK4 }];
    expect(tavoiteRadarAkselit(team, 'hh').tyyppi).toBe('hh');   // auto valitsisi 'tk' (4>2)
    expect(tavoiteRadarAkselit(team, 'hh').akselit.length).toBe(2);   // pakotus palauttaa myös <3 (VP-gate erikseen)
  });
  it('tavoiteRadarAkselit(team, "tk"): kohortilla ei TK-dataa → null (siisti tyhjä)', () => {
    expect(tavoiteRadarAkselit([{ hh_viimeisin: { lin10m: 2.0, lin30m: 5.0, cmj: 30 } }], 'tk')).toBeNull();
  });
});

describe('radarPatteristotSaatavilla (Osa A — saatavuus koko joukkueesta, ≥3 akselia)', () => {
  const TK4b = { ponnauttelu_s: 20, syotto_s: 15, pujottelu_s: 18, kuljetus_laukaus_s: 12 };
  it('HH5 / TK0 → {hh:true, tk:false}', () => {
    expect(radarPatteristotSaatavilla([{ hh_viimeisin: { lin5m: 1.1, lin10m: 2, lin30m: 5, cmj: 30, mas: 15 } }]))
      .toEqual({ hh: true, tk: false });
  });
  it('HH3 / TK4 → {hh:true, tk:true} (molemmat → toggle)', () => {
    expect(radarPatteristotSaatavilla([{ hh_viimeisin: { lin10m: 2, lin30m: 5, kasirata: 7.8 }, tk_lajit_viimeisin: TK4b }]))
      .toEqual({ hh: true, tk: true });
  });
  it('HH2 / TK4 → {hh:false, tk:true}', () => {
    expect(radarPatteristotSaatavilla([{ hh_viimeisin: { lin10m: 2, lin30m: 5 }, tk_lajit_viimeisin: TK4b }]))
      .toEqual({ hh: false, tk: true });
  });
  it('tyhjä → {hh:false, tk:false}', () => {
    expect(radarPatteristotSaatavilla([])).toEqual({ hh: false, tk: false });
    expect(radarPatteristotSaatavilla(null)).toEqual({ hh: false, tk: false });
  });
});

describe('_fmtTestiArvo (Osa F — näyttöpyöristys, ei muuta tallennettua dataa)', () => {
  it('sekunnit → 2 desimaalia (5.227 → "5.23")', () => {
    expect(_fmtTestiArvo(5.227, 's')).toBe('5.23');
    expect(_fmtTestiArvo(7.825, 's')).toBe('7.83');
    expect(_fmtTestiArvo(5.2, 's')).toBe('5.2');     // perännolla pois
    expect(_fmtTestiArvo(5, 's')).toBe('5');
  });
  it('cm → 0–1 des (30 → "30", 32.4 → "32.4")', () => {
    expect(_fmtTestiArvo(30, 'cm')).toBe('30');
    expect(_fmtTestiArvo(32.4, 'cm')).toBe('32.4');
  });
  it('km/h → 1 des (18.4 → "18.4")', () => {
    expect(_fmtTestiArvo(18.4, 'km/h')).toBe('18.4');
    expect(_fmtTestiArvo(18, 'km/h')).toBe('18');
  });
  it('m → 0 des; tuntematon yks → 2 des; null/NaN → ""', () => {
    expect(_fmtTestiArvo(23.6, 'm')).toBe('24');
    expect(_fmtTestiArvo(3.219, '/5')).toBe('3.22');
    expect(_fmtTestiArvo(null, 's')).toBe('');
    expect(_fmtTestiArvo('', 's')).toBe('');
    expect(_fmtTestiArvo('abc', 's')).toBe('');
  });
});

describe('taydennaHvSm (#69 sm_juoksu/sm_pallo persistointi hh_viimeisin:iin)', () => {
  it('lisää sm_juoksun kun pikakenttä on mutta hh_viimeisin:istä puuttuu → täysi uusi hv', () => {
    const r = taydennaHvSm({ lin30m: 5.4, lin10m: 2.1 }, 9.0, null);
    expect(r).not.toBeNull();
    expect(r.sm_juoksu).toBe(9.0);
    expect(r.lin30m).toBe(5.4);   // olemassa olevat säilyvät (täysi objekti merge-settiä varten)
    expect(r.lin10m).toBe(2.1);
  });
  it('lisää sm_pallon (rikastaa radarin SM-pallo-akselin H-H-seuroille)', () => {
    const r = taydennaHvSm({ lin30m: 5.4 }, null, 7.2);
    expect(r.sm_pallo).toBe(7.2);
  });
  it('lisää molemmat kun molemmat puuttuvat', () => {
    const r = taydennaHvSm({ lin30m: 5.4 }, 9.0, 7.2);
    expect(r.sm_juoksu).toBe(9.0);
    expect(r.sm_pallo).toBe(7.2);
  });
  it('EI ylikirjoita jo olemassa olevaa hh_viimeisin.sm_juoksua', () => {
    const r = taydennaHvSm({ sm_juoksu: 8.5 }, 9.0, null);
    expect(r).toBeNull();   // ei muutosta → ei kirjoitusta
  });
  it('ei pikakenttiä → null (ei turhaa kirjoitusta)', () => {
    expect(taydennaHvSm({ lin30m: 5.4 }, null, null)).toBeNull();
    expect(taydennaHvSm(null, null, null)).toBeNull();
  });
});

describe('painopisteOminaisuus + kattavuusVajeet (#75 kevennetty Yhteenveto)', () => {
  it('painopiste = ominaisuus jolla suurin gap tasoon 3 (pienin ka)', () => {
    const r = painopisteOminaisuus([{ nimi: 'Nopeus', ka: 2.4 }, { nimi: 'Tekniikka', ka: 1.8 }, { nimi: 'Suunnanmuutos', ka: 3.2 }]);
    expect(r.nimi).toBe('Tekniikka');
    expect(r.ka).toBe(1.8);
    expect(r.gap).toBe(1.2);   // 3 - 1.8
  });
  it('kaikki tavoitteessa (ka ≥3) → null (§28 ei punaista)', () => {
    expect(painopisteOminaisuus([{ nimi: 'A', ka: 3.0 }, { nimi: 'B', ka: 4.1 }])).toBeNull();
  });
  it('tyhjä / ka null → null', () => {
    expect(painopisteOminaisuus([])).toBeNull();
    expect(painopisteOminaisuus([{ nimi: 'A', ka: null }])).toBeNull();
  });
  it('kattavuusVajeet: vain <100%, suurin vaje ensin, 100% pois', () => {
    const r = kattavuusVajeet({ pelihavainto: 2, suostumus: 10, phv: 0 }, 10);
    expect(r.map(v => v.avain)).toEqual(['phv', 'pelihavainto']);   // 0% ennen 20%; suostumus 100% pois
    expect(r[0].pct).toBe(0);
    expect(r[1].pct).toBe(20);
  });
  it('kattavuusVajeet: kaikki 100% → tyhjä; n=0 → tyhjä', () => {
    expect(kattavuusVajeet({ pelihavainto: 5, suostumus: 5, phv: 5 }, 5)).toEqual([]);
    expect(kattavuusVajeet({ pelihavainto: 0 }, 0)).toEqual([]);
  });
});

describe('valitseKohortti (#76 — kohortti-valitsin, komposiitti kokonaistaso)', () => {
  const mk = (nimi, d1) => ({ sukunimi: nimi, d1_taso: d1 });
  const team = [mk('A', 2), mk('B', 5), mk('C', 4), mk('D', 1), mk('E', 3), mk('F', null)];
  it('järjestää komposiitti kokonaistasolla laskevasti; rankaamattomat (ei tasoa) pois', () => {
    expect(valitseKohortti(team, 'top5').map(p => p.sukunimi)).toEqual(['B', 'C', 'E', 'A', 'D']);
  });
  it('paras → 1 (vakain talenttiydin)', () => {
    expect(valitseKohortti(team, 'paras').map(p => p.sukunimi)).toEqual(['B']);
  });
  it('top10 / alle-N → kaikki rankatut (ei kaadu, F null pois)', () => {
    expect(valitseKohortti(team, 'top10').length).toBe(5);
  });
  it('kaikki → koko roster (myös rankaamattomat)', () => {
    expect(valitseKohortti(team, 'kaikki').length).toBe(6);
  });
  it('tyhjä/null → []', () => {
    expect(valitseKohortti([], 'top5')).toEqual([]);
    expect(valitseKohortti(null, 'paras')).toEqual([]);
  });
});
