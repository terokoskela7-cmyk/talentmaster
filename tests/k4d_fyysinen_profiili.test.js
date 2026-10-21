/* K4d · Fyysinen-kortin profiilitulkinta (lib/tm_fyysinen_profiili.js + Fyysinen-kortti): neljä tulosta, rajatapaukset, kasvuvaihe, kortin virkkeet, ei pelaaja-/perhe-apeissa, VP-ohje. */
import { describe, it, expect } from 'vitest';
import { readFileSync, readdirSync } from 'fs';
import { createRequire } from 'module';
import { VOIMA, JUOKSU, SUUNNANMUUTOS } from './helpers/k4d_fixturet.mjs';
const require = createRequire(import.meta.url);
const lue = (f) => readFileSync(new URL('../' + f, import.meta.url), 'utf8');
const N = require('../lib/tm_eerikkila_normit.js');
globalThis.normiIka = N.normiIka;
const TC = require('../lib/tm_todistekortit.js'), FP = require('../lib/tm_fyysinen_profiili.js'), L = require('../lib/tm_naytto_lohkot.js'), FI = require('../lib/tm_todistekortit_fi.js');
const { tmFyysinenProfiili: prof, tmFyysinenSyote: syote, KYNNYS } = FP;
const NYT = new Date('2026-10-19T12:00:00');
const esc = (s) => String(s == null ? '' : s).replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
const malli = (p) => { const isp = L.tmNayttoDevIkaSp(p); const c = { nyt: NYT, ika: isp.ika, sp: isp.sp, perTestTasot: N.perTestTasot, jaksoTila: 'ei_jaksoa', esc, pid: p.id }; return TC.tmTodisteMalli(p, c); };
const fyys = (p) => malli(p).kortitKaikki.fyysinen;
const T = (taso, pvm) => ({ taso, pvm: pvm || '2026-10-04' });
const S = (cmj, l30, kas, l10) => ({ cmj: cmj == null ? undefined : T(cmj), lin30m: l30 == null ? undefined : T(l30), kasirata: kas == null ? undefined : T(kas), lin10m: l10 == null ? undefined : T(l10) });

describe('K4d · tmFyysinenProfiili: neljä tulosta (POST = kasvu tiedossa)', () => {
  it('voima: CMJ ≤ 2 ja sprintti ≤ 2', () => { expect(prof(S(2, 2), 'POST')).toEqual({ tyyppi: 'voima', alue: 'voima_ja_hyppy' }); expect(prof(S(1, 1), 'AN').tyyppi).toBe('voima'); });
  it('juoksu: CMJ − sprintti ≥ 1,5', () => { expect(prof(S(4, 2), 'POST')).toEqual({ tyyppi: 'juoksu', alue: 'kiihdytys_ja_juoksutekniikka' }); expect(prof(S(5, 3), 'POST').tyyppi).toBe('juoksu'); });
  it('suunnanmuutos: sprintti − kasirata ≥ 1,5', () => { expect(prof(S(3, 4, 1), 'POST')).toEqual({ tyyppi: 'suunnanmuutos', alue: 'jarrutus_ja_suunnanmuutos' }); });
  it('muuten null', () => { expect(prof(S(3, 3, 3), 'POST')).toBe(null); expect(prof(S(3, 2), 'POST')).toBe(null); expect(prof({}, 'POST')).toBe(null); expect(prof(null, 'POST')).toBe(null); });
  it('kynnysarvot yhdessä paikassa', () => { expect(KYNNYS).toEqual({ VOIMA_MAX: 2, JUOKSU_EROTUS: 1.5, SUUNNANMUUTOS_EROTUS: 1.5, PAIVAT_MAX: 30 }); });
});

describe('K4d · rajatapaukset', () => {
  it('ero tasan 1,5 osuu (puolikkaat tasot); 1,0 ei', () => {
    expect(prof(S(3.5, 2), 'POST').tyyppi).toBe('juoksu'); expect(prof(S(3, 2), 'POST')).toBe(null);
    expect(prof(S(3, 3.5, 2), 'POST').tyyppi).toBe('suunnanmuutos'); expect(prof(S(3, 3, 2), 'POST')).toBe(null);
  });
  it('voima-raja: CMJ 2 ja sprintti 3 ei ole voima', () => { expect(prof(S(2, 3), 'POST')).toBe(null); });
  it('puuttuva 30 m → 10 m sprinttinä; 30 m voittaa kun molemmat', () => {
    expect(prof(S(4, null, null, 2), 'POST').tyyppi).toBe('juoksu');
    expect(prof(S(4, 3, null, 2), 'POST')).toBe(null);   // 30 m (3) ratkaisee, ei 10 m (2): ero 1
    expect(prof(S(3, 4, 1, 4), 'POST').tyyppi).toBe('suunnanmuutos');
    expect(prof(S(3, null, 1, 4), 'POST').tyyppi).toBe('suunnanmuutos');
  });
  it('mittaukset ≤ 30 pv toisistaan → vertailu; > 30 pv → ei tulkintaa', () => {
    expect(prof({ cmj: T(4, '2026-09-04'), lin30m: T(2, '2026-10-04') }, 'POST').tyyppi).toBe('juoksu');   // tasan 30 pv
    expect(prof({ cmj: T(4, '2026-09-03'), lin30m: T(2, '2026-10-04') }, 'POST')).toBe(null);   // 31 pv
    expect(prof({ lin30m: T(4, '2026-08-01'), kasirata: T(1, '2026-10-04') }, 'POST')).toBe(null);
    expect(prof({ cmj: T(4), lin30m: { taso: 2 } }, 'POST')).toBe(null);   // pvm puuttuu → ei voi todentaa
  });
  it('raaka-arvoja ei käytetä: syöte on tasoja (taso null → ohitetaan)', () => { expect(prof({ cmj: { taso: null, pvm: '2026-10-04', arvo: 34 }, lin30m: T(2) }, 'POST')).toBe(null); });
});

describe('K4d · kasvuvaihe (§28)', () => {
  it('PH → ei tulkintaa millekään tyypille', () => { expect(prof(S(2, 2), 'PH')).toBe(null); expect(prof(S(4, 2), 'PH')).toBe(null); expect(prof(S(3, 4, 1), 'PH')).toBe(null); });
  it('tuntematon + voima-ehto → null', () => { expect(prof(S(2, 2), 'tuntematon')).toBe(null); });
  it('PRE ja LAH + voima-ehto → null', () => { expect(prof(S(2, 2), 'PRE')).toBe(null); expect(prof(S(2, 2), 'LAH')).toBe(null); });
  it('tuntematon/PRE/LAH + juoksu- ja suunnanmuutos-ehto → näkyy', () => { ['tuntematon', 'PRE', 'LAH'].forEach((v) => { expect(prof(S(4, 2), v).tyyppi).toBe('juoksu'); expect(prof(S(3, 4, 1), v).tyyppi).toBe('suunnanmuutos'); }); });
  it('POST ja AN: kaikki tyypit', () => { ['POST', 'AN'].forEach((v) => { expect(prof(S(2, 2), v).tyyppi).toBe('voima'); }); });
});

describe('K4d · syöte perTestTasot-riveistä (testin oma pvm)', () => {
  it('pvm = testin oma historiapiste jos uusin = viimeisin arvo; muuten hh_pvm', () => {
    const p = { hh_pvm: '2026-10-04', hh_viimeisin: { cmj: 34, lin30m: 4.7 }, hh_historia: [{ pvm: '2026-08-01', cmj: 34 }, { pvm: '2026-10-04', lin30m: 4.7 }] };
    const rows = [{ dimensio: 'D1', selKey: 'cmj', taso: 4 }, { dimensio: 'D1', selKey: 'lin30m', taso: 2 }];
    const s = syote(rows, p); expect(s.cmj).toEqual({ taso: 4, pvm: '2026-08-01' }); expect(s.lin30m.pvm).toBe('2026-10-04');
    expect(prof(s, 'POST')).toBe(null);   // 64 pv erillään
    const p2 = Object.assign({}, p, { hh_historia: [] }); expect(syote(rows, p2).cmj.pvm).toBe('2026-10-04');
  });
  it('rivi ilman tasoa (ei normia) ei tule syötteeseen', () => { expect(syote([{ dimensio: 'D1', selKey: 'cmj', taso: null }], { hh_pvm: '2026-10-04' })).toEqual({}); });
});

describe('K4d · Fyysinen-kortti', () => {
  const VIRKKEET = { voima: 'Hyppy ja sprintti ovat matalalla, joten painota voima- ja hyppyharjoittelua.', juoksu: 'Voimaa on, mutta juoksu ei vielä hyödynnä sitä, joten painota kiihdytystä ja juoksutekniikkaa.', suunnanmuutos: 'Suora nopeus on hyvä mutta suunnanmuutos jää jälkeen, joten painota jarrutusta ja suunnanmuutostaitoa.' };   // PM 22.10. (yksi virke)
  const virkkeet = (s) => s.split(/(?<=\.)\s+/).filter(Boolean);
  const osat = (k) => virkkeet(k.lause);
  [['voima', VOIMA], ['juoksu', JUOKSU], ['suunnanmuutos', SUUNNANMUUTOS]].forEach(([tyyppi, p]) => {
    it(tyyppi + ': kortin lause = Taso-virke + tulkinta (2 virkettä), ei lukuja tulkinnassa, ei "Vahvin…heikoin"', () => {
      const k = fyys(p); expect(k.profiili.tyyppi).toBe(tyyppi);
      expect(k.lause).toMatch(/^Taso on ikäisekseen \S+\. /); expect(k.lause.endsWith(' ' + VIRKKEET[tyyppi])).toBe(true); expect(virkkeet(k.lause)).toHaveLength(2);   // D102: "Taso on…" säilyy, tulkinta korvaa vain Vahvin/heikoin
      expect(VIRKKEET[tyyppi]).not.toMatch(/\d/); expect(k.selite).toContain('Perustuu hyppytason ja sprinttitason eroon samanikäisiin verrattuna.');
      expect(k.toiminto.avain).toBe('testihistoria');   // Kehityskohde-linkki ennallaan
    });
  });
  it('tulkinta ei kasva kortin virkemäärää kun mikään ehto ei osu: "Vahvin…, heikoin…" säilyy', () => {
    const k = fyys(Object.assign({}, JUOKSU, { hh_viimeisin: { lin30m: 4.4, cmj: 30, kasirata: 6.7 }, hh_historia: [{ pvm: '2026-10-04', lin30m: 4.4, cmj: 30, kasirata: 6.7 }] }));
    expect(k.profiili).toBeUndefined(); expect(k.lause).toMatch(/Vahvin .*, heikoin /); expect(osat(k)).toHaveLength(2);
  });
  it('tuntematon kasvu + voima-ehto: ei voima-virkettä (vahvin/heikoin + PHV-selite)', () => {
    const k = fyys(Object.assign({}, VOIMA, { biologinenIka_viimeisin: null, phv_tila: 'POST' }));
    expect(k.profiili).toBeUndefined(); expect(k.lause).toMatch(/Vahvin/); expect(k.selite).not.toContain('Perustuu hyppytason');
  });
  it('PH: kasvupyrähdys-virke, ei tulkintaa', () => {
    const k = fyys(Object.assign({}, JUOKSU, { biologinenIka_viimeisin: { phv_tila_koodi: 'PH', phv_ika: 13.4, maturity_offset: 0, pvm: '2026-10-04' } }));
    expect(k.profiili).toBeUndefined(); expect(k.lause).toContain(FI.tc_fy_ph);
  });
  it('juoksu + PRE: tulkinta näkyy ja PHV-selite säilyy ⓘ:ssä', () => {
    const k = fyys(Object.assign({}, JUOKSU, { biologinenIka_viimeisin: { phv_tila_koodi: 'PRE', phv_ika: 12, maturity_offset: -1.5, pvm: '2026-10-04' } }));
    expect(k.profiili.tyyppi).toBe('juoksu'); expect(k.selite).toContain('Perustuu hyppytason'); expect(k.selite).toContain(FI.tc_fy_selite);
  });
  it('kortin tekstit ovat FI-avaimissa (tc_fy_tulk_*), logiikassa ei kovakoodattua virkettä', () => {
    ['voima', 'juoksu', 'suunnanmuutos'].forEach((t) => expect(FI['tc_fy_tulk_' + t]).toBe(VIRKKEET[t]));
    expect(lue('lib/tm_fyysinen_profiili.js')).not.toMatch(/Painota/); expect(lue('lib/tm_todistekortit.js')).not.toMatch(/Painota/);
  });
  it('lib ≤ ~500 riviä', () => { ['lib/tm_fyysinen_profiili.js', 'lib/tm_todistekortit.js'].forEach((f) => expect(lue(f).split('\n').length - 1, f).toBeLessThanOrEqual(500)); });
});

describe('K4d · ei pelaajalle eikä huoltajalle (§7.22)', () => {
  it('juurisivuista vain Kehitystyöpöytä lataa korttilibit; pelaaja-/vanhempi-appit eivät', () => {
    const sivut = readdirSync(new URL('..', import.meta.url).pathname).filter((f) => /\.html$/.test(f));
    const lataajat = sivut.filter((f) => /tm_fyysinen_profiili|tm_todistekortit/.test(lue(f)));
    expect(lataajat).toEqual(['TalentMaster_Kehitystyopoyta.html']);
    sivut.filter((f) => /Pelaaja|Vanhempi/i.test(f)).forEach((f) => { const s = lue(f); expect(s, f).not.toMatch(/tmFyysinenProfiili|tc_fy_tulk|TM_TODISTEKORTIT/); });
  });
  it('tulkintatekstit eivät ole pelaaja-/perheappien jaetuissa libeissä', () => {
    ['lib/tm_lib_i18n.js'].forEach(() => {});
    readdirSync(new URL('../lib', import.meta.url).pathname).filter((f) => /\.js$/.test(f) && !/^tm_(todistekortit|fyysinen_profiili)/.test(f) && f !== 'tm_lib_i18n.js').forEach((f) => expect(lue('lib/' + f), f).not.toMatch(/tmFyysinenProfiili|tc_fy_tulk_/));
  });
});

describe('K4d · VP:n ⓘ-ohje sanoo saman (CMJ-vinkki)', () => {
  const vp = lue('TalentMaster_VP_v25.html'), m = vp.match(/cmj: \{ otsikko: 'Räjähtävyys · CMJ'[^\n]*vinkki: '([^']*)'/);
  it('vanha raakasääntö on poissa; uusi kattaa voiman, juoksun ja suunnanmuutoksen sekä kasvuvaiheen', () => {
    expect(m).toBeTruthy(); expect(vp).not.toContain('Matala CMJ + matala nopeus → voimaharjoittelu.');
    expect(m[1]).toMatch(/voima- ja hyppyharjoittelu/); expect(m[1]).toMatch(/kiihdytys ja juoksutekniikka/); expect(m[1]).toMatch(/jarrutus ja suunnanmuutos/); expect(m[1]).toMatch(/kasvuvaihe/); expect(m[1]).toMatch(/samanikäisiin/);
  });
});
