/**
 * TalentMaster™ — tm_pikakentat.js (P2.0)
 * tmLaskePikakentat(pelaajaDoc, tulokset, pvm) → upd
 * IDENTTINEN Testaus_v9 Vaihe 1 _v6TallennaPikakentat-logiikan kanssa + viimeisin-vartija.
 * Riippuvuudet resolvoituvat Node-requiretilla (tm_eerikkila_normit + docs/testit_indeksit).
 */
import { describe, it, expect } from 'vitest';
import { createRequire } from 'module';
const require = createRequire(import.meta.url);

const { tmLaskePikakentat, tmRakennaPikakentatArkistosta } = require('../lib/tm_pikakentat.js');

const PVM = '2026-05-02';

describe('tmLaskePikakentat — H-H pikakentät', () => {
  it('30 m -kirjaus: hh_viimeisin MERGE (ei pyyhi cmj:tä) + §26 pari-invariantti', () => {
    const doc = { syntymaVuosi: 2013, sukupuoli: 'M', joukkue: 'KPV U13', hh_viimeisin: { cmj: 34 } };
    const upd = tmLaskePikakentat(doc, { lin_30m: { paras: 5.0 } }, PVM);
    expect(upd.hh_viimeisin).toEqual({ cmj: 34, lin30m: 5.0 });   // cmj säilyi
    expect(upd.hh_pvm).toBe(PVM);
    expect(typeof upd.hh_taso).toBe('number');
    expect(typeof upd.d1_taso).toBe('number');
    expect(upd.d1_pvm).toBe(PVM);                                  // pari-invariantti
  });

  it('täysi H-H → d1_taso + d2_taso (syöttö/pujottelu) lähteineen', () => {
    const doc = { syntymaVuosi: 2011, sukupuoli: 'M', joukkue: 'SJK P15' };
    const upd = tmLaskePikakentat(doc, {
      lin_30m: { paras: 4.4 }, hyppy_cj: { paras: 38 }, mas: { paras: 15.2 }, kasirata: { paras: 9.1 },
      sm_juoksu: { paras: 7.8 }, sm_pallo: { paras: 8.4 }, pujottelu_hh: { paras: 12.1 }, syotto_hh: { paras: 11.5 }
    }, PVM);
    expect(upd.hh_viimeisin).toMatchObject({ lin30m: 4.4, cmj: 38, mas: 15.2, sm_juoksu: 7.8, sm_pallo: 8.4, pujottelu: 12.1, syotto: 11.5 });
    expect(upd.d1_lahde).toBe('hh');
    expect(typeof upd.d2_taso).toBe('number');
    expect(upd.d2_lahde).toBe('hh');
  });

  it('joukkuenimi-fallback: ikä + sukupuoli joukkueesta kun syntymaVuosi/sukupuoli puuttuu', () => {
    const upd = tmLaskePikakentat({ joukkue: 'GrIFK T11' }, { lin_30m: { paras: 5.6 } }, PVM);
    expect(upd.hh_viimeisin).toEqual({ lin30m: 5.6 });
    expect(upd.hh_pvm).toBe(PVM);
    expect(typeof upd.hh_taso === 'number' || upd.hh_taso === undefined).toBe(true);
  });
});

describe('tmLaskePikakentat — TKI pikakentät (ika 8–13)', () => {
  it('U12 tekniikkakilpailu → tki_viimeisin/merkki/tk_lajit/tk_kokonaistulos + pari-invariantti', () => {
    const doc = { syntymaVuosi: 2014, sukupuoli: 'P', joukkue: 'HJK P12' };
    const upd = tmLaskePikakentat(doc, {
      ponnauttelu: { paras: 10 }, syotto: { paras: 14 }, pujottelu: { paras: 12 },
      kuljetus_laukaus: { raaka: 20, rangaistukset: [5, 1], ennenaikaiset: 0 }, pituuspotku: { paras: 30 }
    }, PVM);
    // kt = ponnauttelu 10 + syotto 14 + pujottelu 12 + kuljetus netto 14 − pituuspotkubonus(30 m→6) = 44
    expect(upd.tk_kokonaistulos_viimeisin).toBe(44);
    expect(upd.tki_viimeisin).toBe(92);
    expect(upd.tki_merkki).toBe('kulta');
    expect(upd.tki_pvm).toBe(PVM);
    expect(upd.tk_lajit_pvm).toBe(PVM);
    expect(upd.tk_lajit_viimeisin).toMatchObject({ ponnauttelu_s: 10, syotto_s: 14, pujottelu_s: 12, kuljetus_laukaus_s: 14, pituuspotku_bonus_s: 6 });
  });

  it('kuljetus_laukaus netto = raaka + ennenaikaiset*10 − rangaistukset', () => {
    // netto = 20 + 0 − (5+1) = 14 → mukana kokonaistuloksessa
    const upd = tmLaskePikakentat({ syntymaVuosi: 2014, sukupuoli: 'P' },
      { ponnauttelu: { paras: 10 }, kuljetus_laukaus: { raaka: 20, rangaistukset: [5, 1] } }, PVM);
    expect(upd.tk_lajit_viimeisin.kuljetus_laukaus_s).toBe(14);
  });

  it('ika 14 (8–13 ulkopuolella) → ei TKI-pikakenttiä', () => {
    const upd = tmLaskePikakentat({ syntymaVuosi: 2012, sukupuoli: 'M', joukkue: 'KPV P14' },
      { ponnauttelu: { paras: 9 }, syotto: { paras: 12 }, pujottelu: { paras: 11 } }, PVM);
    expect(upd.tki_viimeisin).toBeUndefined();
    expect(upd.tk_lajit_viimeisin).toBeUndefined();
  });
});

describe('tmLaskePikakentat — VIIMEISIN-VARTIJA (P-EDIT)', () => {
  it('pvm < hh_pvm → EI ylikirjoita H-H-pikakenttiä', () => {
    const doc = { syntymaVuosi: 2013, sukupuoli: 'M', hh_pvm: '2026-06-01', hh_viimeisin: { cmj: 34 } };
    const upd = tmLaskePikakentat(doc, { lin_30m: { paras: 5.0 } }, '2026-05-01');   // vanhempi
    expect(upd.hh_viimeisin).toBeUndefined();
    expect(upd.hh_pvm).toBeUndefined();
    expect(upd.hh_taso).toBeUndefined();
    expect(upd.d1_taso).toBeUndefined();
  });

  it('pvm >= hh_pvm → kirjoittaa (vartija no-op, uusin tulos)', () => {
    const doc = { syntymaVuosi: 2013, sukupuoli: 'M', hh_pvm: '2026-06-01', hh_viimeisin: { cmj: 34 } };
    const upd = tmLaskePikakentat(doc, { lin_30m: { paras: 5.0 } }, '2026-06-15');   // uudempi
    expect(upd.hh_viimeisin).toEqual({ cmj: 34, lin30m: 5.0 });
    expect(upd.hh_pvm).toBe('2026-06-15');
  });

  it('sama pvm kuin hh_pvm → kirjoittaa (>=)', () => {
    const doc = { syntymaVuosi: 2013, sukupuoli: 'M', hh_pvm: '2026-06-01', hh_viimeisin: { cmj: 34 } };
    const upd = tmLaskePikakentat(doc, { lin_30m: { paras: 5.0 } }, '2026-06-01');
    expect(upd.hh_pvm).toBe('2026-06-01');
  });

  it('TKI-vartija erillinen H-H:sta: vanha tki_pvm estää TKI:n mutta ei H-H:ta', () => {
    const doc = { syntymaVuosi: 2014, sukupuoli: 'P', tki_pvm: '2026-06-01' };
    const upd = tmLaskePikakentat(doc, {
      lin_30m: { paras: 5.5 },                              // H-H: ei hh_pvm:ää → sallittu
      ponnauttelu: { paras: 10 }, syotto: { paras: 14 }     // TKI: vanhempi kuin tki_pvm → estetty
    }, '2026-05-01');
    expect(upd.hh_viimeisin).toEqual({ lin30m: 5.5 });      // H-H kirjoitettu
    expect(upd.tki_viimeisin).toBeUndefined();              // TKI estetty
  });
});

describe('tmLaskePikakentat — graceful degradation (ympäristö ilman TKI-funktioita, esim. VP)', () => {
  // VP lataa eerikkilä-libin mutta EI testit_indeksit.js:ää → normiIka/eerikkilaTaso/laskeD1Joustava läsnä, TKI-funktiot ei.
  const E = require('../lib/tm_eerikkila_normit.js');
  const vainHH = { normiIka: E.normiIka, normSukupuoliMN: E.normSukupuoliMN, eerikkilaTaso: E.eerikkilaTaso, laskeD1Joustava: E.laskeD1Joustava, laskeD2HH: E.laskeD2HH };

  it('H-H lasketaan vaikka TKI-funktiot puuttuvat', () => {
    const upd = tmLaskePikakentat({ syntymaVuosi: 2013, sukupuoli: 'M', joukkue: 'KPV U13' }, { lin_30m: { paras: 5.0 } }, PVM, vainHH);
    expect(upd.hh_viimeisin).toEqual({ lin30m: 5.0 });
    expect(upd.hh_pvm).toBe(PVM);
    expect(typeof upd.d1_taso).toBe('number');
  });

  it('TKI ohitetaan hiljaa kun laskeKokonaistulos puuttuu (ei kaadu, ei tki-kenttiä)', () => {
    const upd = tmLaskePikakentat({ syntymaVuosi: 2014, sukupuoli: 'P' },
      { ponnauttelu: { paras: 10 }, syotto: { paras: 14 }, pujottelu: { paras: 12 } }, PVM, vainHH);
    expect(upd.tki_viimeisin).toBeUndefined();
    expect(upd.tk_lajit_viimeisin).toBeUndefined();
  });
});

describe('tmLaskePikakentat — reunatapaukset', () => {
  it('tyhjä tulokset → {}', () => {
    expect(tmLaskePikakentat({ syntymaVuosi: 2013, sukupuoli: 'M' }, {}, PVM)).toEqual({});
  });
  it('null-argumentit → {} (ei kaadu)', () => {
    expect(tmLaskePikakentat(null, null, PVM)).toEqual({});
  });
});

describe('tmRakennaPikakentatArkistosta — rebuild-primitiivi (P-EDIT.0)', () => {
  const P = { syntymaVuosi: 2013, sukupuoli: 'M', joukkue: 'KPV U13' };
  const vanha = { pvm: '2026-03-01', tulokset: { lin_30m: { paras: 5.2 } } };
  const uusi  = { pvm: '2026-06-01', tulokset: { lin_30m: { paras: 4.9 } } };

  it('poisto regressoi viimeisimmän pikakentän edelliseen', () => {
    const molemmat = tmRakennaPikakentatArkistosta(P, [vanha, uusi]);
    expect(molemmat.upd.hh_pvm).toBe('2026-06-01');
    expect(molemmat.upd.hh_viimeisin.lin30m).toBe(4.9);
    // poista uusin → jää vanha
    const vainVanha = tmRakennaPikakentatArkistosta(P, [vanha]);
    expect(vainVanha.upd.hh_pvm).toBe('2026-03-01');
    expect(vainVanha.upd.hh_viimeisin.lin30m).toBe(5.2);
  });

  it('kaikkien mittausten poisto → omistetut kentät listalla poistetut (haamuarvo ei jää)', () => {
    const doc = Object.assign({}, P, { hh_viimeisin: { lin30m: 4.9 }, hh_pvm: '2026-06-01', hh_taso: 3, d1_taso: 2, d1_pvm: '2026-06-01', hh_historia: [{ pvm: '2026-06-01', lin30m: 4.9 }] });
    const r = tmRakennaPikakentatArkistosta(doc, []);
    expect(r.upd).toEqual({});
    ['hh_viimeisin', 'hh_pvm', 'hh_taso', 'd1_taso', 'd1_pvm', 'hh_historia'].forEach(k => expect(r.poistetut).toContain(k));
  });

  it('korjaus = identtinen alusta-kirjaukseen (rebuild = puhdas fold)', () => {
    // Väärä 5.9 korjattu → 4.9. Rebuild korjatusta listasta === rebuild kun oikea alusta.
    const korjattu = tmRakennaPikakentatArkistosta(P, [vanha, { pvm: '2026-06-01', tulokset: { lin_30m: { paras: 4.9 } } }]);
    const alusta   = tmRakennaPikakentatArkistosta(P, [vanha, uusi]);
    expect(korjattu).toEqual(alusta);
  });

  it('idempotenssi: sama sisään → sama ulos (myös kahdesti ajettuna)', () => {
    const a = tmRakennaPikakentatArkistosta(P, [vanha, uusi]);
    const b = tmRakennaPikakentatArkistosta(P, [vanha, uusi]);
    expect(a).toEqual(b);
    // aja base-idempotenssi: syötä a.upd takaisin dokumenttiin → rebuild samoista merkinnöistä tuottaa saman
    const doc2 = Object.assign({}, P, a.upd);
    const c = tmRakennaPikakentatArkistosta(doc2, [vanha, uusi]);
    expect(c.upd.hh_viimeisin).toEqual(a.upd.hh_viimeisin);
    expect(c.upd.hh_pvm).toBe(a.upd.hh_pvm);
  });

  it('järjestys-agnostinen: merkinnät missä tahansa järjestyksessä → sama (kronologinen fold)', () => {
    const a = tmRakennaPikakentatArkistosta(P, [vanha, uusi]);
    const b = tmRakennaPikakentatArkistosta(P, [uusi, vanha]);
    expect(a).toEqual(b);
  });

  it('D2 ristilähde: ulkoinen d2_lahde (tk) säilyy rebuildin yli (ei clobberia, ei poistoa)', () => {
    const doc = { syntymaVuosi: 2011, sukupuoli: 'M', joukkue: 'SJK P15', d2_taso: 4.2, d2_lahde: 'tk', d2_kattavuus: 1, d2_pvm: '2026-01-10' };
    // H-H mittaus jonka syotto/pujottelu TUOTTAISI oman d2:n (lahde hh) — ei saa ylikirjoittaa ulkoista
    const r = tmRakennaPikakentatArkistosta(doc, [{ pvm: '2026-06-01', tulokset: { lin_30m: { paras: 4.4 }, syotto_hh: { paras: 11.5 }, pujottelu_hh: { paras: 12.1 } } }]);
    expect(r.upd.d2_taso).toBeUndefined();     // ei kosketa
    expect(r.upd.d2_lahde).toBeUndefined();
    expect(r.poistetut.filter(k => k.indexOf('d2') === 0)).toEqual([]);   // ei poisteta
    expect(r.upd.hh_viimeisin).toBeTruthy();   // H-H silti laskettu
    expect(typeof r.upd.d1_taso).toBe('number');
  });

  it('D2 omistettu (hh) tai puuttuva: fold laskee sen uudelleen', () => {
    const doc = { syntymaVuosi: 2011, sukupuoli: 'M', joukkue: 'SJK P15', d2_taso: 3, d2_lahde: 'hh', d2_pvm: '2026-01-10' };
    const r = tmRakennaPikakentatArkistosta(doc, [{ pvm: '2026-06-01', tulokset: { syotto_hh: { paras: 11.5 }, pujottelu_hh: { paras: 12.1 } } }]);
    expect(r.upd.d2_lahde).toBe('hh');
    expect(typeof r.upd.d2_taso).toBe('number');
    expect(r.upd.d2_pvm).toBe('2026-06-01');
  });

  it('mitatoitu:true -merkinnät jätetään huomiotta', () => {
    const r = tmRakennaPikakentatArkistosta(P, [
      { pvm: '2026-07-01', tulokset: { lin_30m: { paras: 4.0 } }, mitatoitu: true },   // pehmeästi poistettu
      vanha
    ]);
    expect(r.upd.hh_pvm).toBe('2026-03-01');           // mitätöity 4.0 ei vaikuta
    expect(r.upd.hh_viimeisin.lin30m).toBe(5.2);
  });

  it('TKI + historia rakentuu alusta (U12 tekniikka, 2 mittausta)', () => {
    const doc = { syntymaVuosi: 2014, sukupuoli: 'P', joukkue: 'HJK P12' };
    const m1 = { pvm: '2026-02-01', tulokset: { ponnauttelu: { paras: 12 }, syotto: { paras: 16 }, pujottelu: { paras: 14 } } };
    const m2 = { pvm: '2026-06-01', tulokset: { ponnauttelu: { paras: 10 }, syotto: { paras: 14 }, pujottelu: { paras: 12 } } };
    const r = tmRakennaPikakentatArkistosta(doc, [m1, m2]);
    expect(r.upd.tki_pvm).toBe('2026-06-01');
    expect(typeof r.upd.tki_viimeisin).toBe('number');
    expect(r.upd.tki_historia.map(h => h.pvm)).toEqual(['2026-02-01', '2026-06-01']);
  });

  it('pvm-tön merkintä suodattuu pois', () => {
    const r = tmRakennaPikakentatArkistosta(P, [{ tulokset: { lin_30m: { paras: 3.0 } } }, vanha]);
    expect(r.upd.hh_pvm).toBe('2026-03-01');
    expect(r.upd.hh_viimeisin.lin30m).toBe(5.2);
  });
});
