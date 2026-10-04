/**
 * Pelaaja-app V2 · P0.6-jatko (§31, §7.22): MITALI PER KILPAILU. Aiemmin _tkMitali laski vain viimeisimmästä → syyskuun kulta vaihtui lokakuun hopeaksi
 * (= menetys). Nyt lista tki_historiasta: yksi merkki per kilpailu, lasketaan kunkin OMASTA kokonaisajasta + TESTIHETKEN iästä, uusin ensin; mikään ei katoa.
 * Historia rakennetaan oikealla tmTkiSnapshot/tmHistoriaLisaa-polulla (Pikakirjaus/Excel kirjoittaa <laji>_s-avaimet). Funktiot vm:ssä, oikeat libit.
 */
import { describe, it, expect } from 'vitest';
import { readFileSync } from 'fs';
import { createRequire } from 'module';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';
import vm from 'vm';

const require = createRequire(import.meta.url);
const HTML = readFileSync(join(dirname(fileURLToPath(import.meta.url)), '..', 'TalentMaster_Pelaaja_v7.html'), 'utf8');
const TT = require('../docs/testit_indeksit.js');
const EN = require('../lib/tm_eerikkila_normit.js');
const LANG = require('../lib/tm_lang.js');
const KAARI = require('../lib/tm_kehityskaari.js');
const H = require('../lib/tm_historia.js');
function pura(tunniste) {
  const i = HTML.indexOf(tunniste); expect(i, tunniste).toBeGreaterThan(-1);
  let syv = 0;
  for (let k = HTML.indexOf('{', i); k < HTML.length; k++) { if (HTML[k] === '{') syv++; else if (HTML[k] === '}') { syv--; if (!syv) return HTML.slice(i, k + 1); } }
  throw new Error('sulkeet');
}
const ctx = (extraWindow = {}) => {
  const sb = { window: Object.assign({ TM_TESTIT: TT, TM_KEHITYSKAARI: KAARI }, extraWindow), normiIka: EN.normiIka, t: LANG.t, Date, String, Number, Object, Array, parseInt, isFinite, Math };
  vm.createContext(sb);
  vm.runInContext([HTML.match(/var _TK_MERKKI_AVAIN = \{[^}]*\};/)[0], 'function _tkMitaliRivi(', 'function _tkSp(', 'function _tkKokonaisaikaRivilta(', 'function _tkMitaliViimeisin(', 'function _tkMitalit(', 'function _tkMitali(']
    .map((x) => (x.startsWith('var ') ? x : pura(x))).join('\n') + '\nthis.lista = _tkMitalit; this.viim = _tkMitali; this.kt = _tkKokonaisaikaRivilta;', sb);
  return sb;
};
// Kilpailu = tki_historia-rivi Pikakirjaus/Excel-muodossa (<laji>_s). Lajit summautuvat kokonaisaikaan (kolme 20 + loput).
const lajit = (summa, extra = {}) => Object.assign({ ponnauttelu_s: 20, syotto_s: 20, pujottelu_s: 20, kuljetus_laukaus_s: summa - 60 }, extra);
const historia = (rivit) => rivit.reduce((arr, [pvm, tkLajit]) => H.tmHistoriaLisaa(arr, H.tmTkiSnapshot(pvm, { tkLajit })), []);
const pel = (o) => Object.assign({ syntymaVuosi: 2014, sukupuoli: 'M' }, o);
const tekstit = (l) => l.map((x) => x.teksti);

describe('mitali per kilpailu — mikään ei katoa', () => {
  it('kaksi kilpailua, jälkimmäinen heikompi: 9/2026 kulta (79) + 10/2026 hopea (85) → MOLEMMAT näkyvät, uusin ensin', () => {
    const p = pel({ tki_historia: historia([['2026-09-12', lajit(79)], ['2026-10-03', lajit(85)]]), tk_kokonaistulos_viimeisin: 85, tk_lajit_pvm: '2026-10-03' });
    expect(tekstit(ctx().lista(p))).toEqual(['Tekniikkakilpailu 10/2026 · hopeamerkki', 'Tekniikkakilpailu 9/2026 · kultamerkki']);
  });
  it('myöhempi kilpailu ilman merkkiä (130 s) EI poista aiempaa merkkiä; itse merkitön kilpailu ei saa merkkiä', () => {
    const p = pel({ tki_historia: historia([['2026-09-12', lajit(79)], ['2026-10-03', lajit(130)]]), tk_kokonaistulos_viimeisin: 130, tk_lajit_pvm: '2026-10-03' });
    expect(tekstit(ctx().lista(p))).toEqual(['Tekniikkakilpailu 9/2026 · kultamerkki']);
    expect(ctx().viim(p).teksti).toBe('Tekniikkakilpailu 9/2026 · kultamerkki');   // uusin ANSAITTU
  });
  it('kolme kilpailua järjestyksessä uusin ensin, vaikka historia annettu sekaisin', () => {
    const rivit = [['2026-10-03', lajit(85)], ['2026-03-01', lajit(100)], ['2026-09-12', lajit(79)]];
    const p = pel({ tki_historia: historia(rivit).reverse() });   // tmHistoriaLisaa lajittelee; käännetään sekaisin
    expect(tekstit(ctx().lista(p))).toEqual(['Tekniikkakilpailu 10/2026 · hopeamerkki', 'Tekniikkakilpailu 9/2026 · kultamerkki', 'Tekniikkakilpailu 3/2026 · pronssimerkki']);
  });
});

describe('kilpailu ilman kokonaisaikaa ei saa merkkiä', () => {
  it('vajaa rivi (vain 2 lajia / vain tki) → ei merkkiä (osasumma näyttäisi liian hyvältä)', () => {
    const p = pel({ tki_historia: historia([['2026-09-12', { ponnauttelu_s: 10, syotto_s: 12 }], ['2026-10-03', { ponnauttelu_s: 20, syotto_s: 20, pujottelu_s: 20 }]]) });
    expect(ctx().lista(p)).toEqual([]);
    expect(ctx().lista(pel({ tki_historia: [{ pvm: '2026-09-12', tki: 70 }] }))).toEqual([]);
  });
  it('tyhjä / puuttuva historia ja ei pikakenttiä → tyhjä lista, ei kaadu', () => {
    expect(ctx().lista(pel({}))).toEqual([]); expect(ctx().lista(pel({ tki_historia: [] }))).toEqual([]);
    expect(ctx().lista(null)).toEqual([]); expect(ctx().viim(pel({}))).toBeNull();
    expect(ctx().lista(pel({ tki_historia: [null, {}, { tki: 5 }] }))).toEqual([]);
  });
  it('ei syntymävuotta → historiasta ei merkkejä (ikää ei voi laskea); vara: tallennettu tki_merkki viimeisimmälle', () => {
    expect(ctx().lista({ tki_historia: historia([['2026-09-12', lajit(79)]]) })).toEqual([]);
    expect(tekstit(ctx().lista({ tki_historia: historia([['2026-09-12', lajit(79)]]), tki_merkki: 'hopea', tki_pvm: '2026-09-12' }))).toEqual(['Tekniikkakilpailu 9/2026 · hopeamerkki']);
  });
});

describe('ikä TESTIHETKELTÄ, ei nykyiästä', () => {
  it('sama kokonaisaika 85 s: 9/2025 (ikä 11) = kulta, 9/2026 (ikä 12) = hopea — molemmat listalla', () => {
    const p = pel({ tki_historia: historia([['2025-09-12', lajit(85)], ['2026-09-12', lajit(85)]]) });
    expect(tekstit(ctx().lista(p))).toEqual(['Tekniikkakilpailu 9/2026 · hopeamerkki', 'Tekniikkakilpailu 9/2025 · kultamerkki']);
  });
  it('ikä lasketaan testipäivän vuodesta (nykyhetki ei vaikuta): sama historia, eri "nyt" antaa saman listan', () => {
    const p = pel({ tki_historia: historia([['2025-09-12', lajit(85)]]) });
    const a = tekstit(ctx().lista(p));
    const RealDate = Date;
    const tulevaisuus = class extends RealDate { constructor(...x) { if (x.length === 0) super(Date.UTC(2031, 5, 1)); else super(...x); } };
    const sb = ctx(); sb.Date = tulevaisuus;
    expect(tekstit(sb.lista(p))).toEqual(a); expect(a).toEqual(['Tekniikkakilpailu 9/2025 · kultamerkki']);
  });
  it('ikä 14+ ei kilpailuluokkaa → ei merkkiä', () => {
    expect(ctx().lista(pel({ syntymaVuosi: 2011, tki_historia: historia([['2026-09-12', lajit(60)]]) }))).toEqual([]);
  });
  it('sukupuoli ohjaa rajoja (T: 12 v, 95 s = hopea; P: 95 s = pronssi)', () => {
    const h = historia([['2026-09-12', lajit(95)]]);
    expect(tekstit(ctx().lista(pel({ sukupuoli: 'N', tki_historia: h })))).toEqual(['Tekniikkakilpailu 9/2026 · hopeamerkki']);
    expect(tekstit(ctx().lista(pel({ sukupuoli: 'M', tki_historia: h })))).toEqual(['Tekniikkakilpailu 9/2026 · pronssimerkki']);
  });
});

describe('kokonaisaika riviltä', () => {
  it('pituuspotkubonus vähennetään vain iästä 12 alkaen (testihetken ikä)', () => {
    const r12 = { ponnauttelu: 20, syotto: 20, pujottelu: 20, kuljetus_laukaus: 26, pituuspotku_bonus: 8 };   // normalisoitu rivi (_tkMitalit normalisoi _s-avaimet ennen)   // 86 − 8 = 78
    expect(ctx().kt(r12, 12)).toBe(78); expect(ctx().kt(r12, 11)).toBe(86); expect(ctx().kt(r12, null)).toBe(86);
    const p = pel({ tki_historia: historia([['2026-09-12', { ponnauttelu_s: 20, syotto_s: 20, pujottelu_s: 20, kuljetus_laukaus_s: 26, pituuspotku_bonus_s: 8 }]]) });
    expect(tekstit(ctx().lista(p))).toEqual(['Tekniikkakilpailu 9/2026 · kultamerkki']);   // 78 < 80 (ilman bonusta 86 = hopea)
  });
  it('tallennettu kokonaistulos(_s) voittaa lajisumman; _s ja kanoniset avaimet sekaisin (Testaus_v9 + Pikakirjaus)', () => {
    expect(ctx().kt({ kokonaistulos: 79.5, ponnauttelu: 99 }, 12)).toBe(79.5);
    expect(ctx().kt({ kokonaistulos_s: 80.25 }, 12)).toBe(80.25);
    const p = pel({ tki_historia: historia([['2026-09-12', { ponnauttelu: 20, syotto_s: 20, pujottelu: 20, kuljetus_laukaus_s: 19 }]]) });
    expect(tekstit(ctx().lista(p))).toEqual(['Tekniikkakilpailu 9/2026 · kultamerkki']);
  });
  it('pyöristys 2 desimaaliin (ei liukulukuroskaa rajalla)', () => { expect(ctx().kt({ ponnauttelu: 20.1, syotto: 20.2, pujottelu: 20.3, kuljetus_laukaus: 18.7 }, 11)).toBe(79.3); });
});

describe('varapolun kokonaisaika = KANONINEN laskeKokonaistulos (ei rinnakkaista laskentaa)', () => {
  it('lähde kutsuu T.laskeKokonaistulos:ta eikä summaa itse', () => {
    const l = pura('function _tkKokonaisaikaRivilta(');
    expect(l).toContain('T.laskeKokonaistulos(testit, ika'); expect(l).not.toMatch(/summa\s*[+-]?=|Math\.round/);
  });
  it('PARITEETTI: rivin tulos = laskeKokonaistulos(lajit + pituuspotku metreinä) kaikilla metreillä 0–120 ja ikinä 8–14 (bonus-sekunnit = tkPituuspotkuBonus(m))', () => {
    const lajitObj = { ponnauttelu: 21.3, syotto: 19.7, pujottelu: 22.15, kuljetus_laukaus: 17.85 };
    for (let ika = 8; ika <= 14; ika++) {
      for (let m = 0; m <= 120; m += 0.5) {
        const kanoninen = TT.laskeKokonaistulos(Object.assign({}, lajitObj, { pituuspotku: m }), ika, 'P');
        const rivi = Object.assign({}, lajitObj, { pituuspotku_bonus: TT.tkPituuspotkuBonus(m) });
        expect(ctx().kt(rivi, ika), 'ika ' + ika + ' m ' + m).toBe(kanoninen);
      }
    }
  });
  it('kanoninen puuttuu (TM_TESTIT ei ladattu) → null (ei rinnakkaista varalaskentaa)', () => {
    const sb = ctx({ TM_TESTIT: {} }); expect(sb.kt({ ponnauttelu: 20, syotto: 20, pujottelu: 20, kuljetus_laukaus: 20 }, 11)).toBeNull();
  });
});

describe('viimeisin kilpailu (pikakentät) ja yhteensopivuus', () => {
  it('ei historiaa → vain viimeisin kilpailu pikakentistä (ennallaan, myös stale tki_merkki-suoja)', () => {
    expect(tekstit(ctx().lista(pel({ tk_kokonaistulos_viimeisin: 79, tk_lajit_pvm: '2026-09-12' })))).toEqual(['Tekniikkakilpailu 9/2026 · kultamerkki']);
    expect(ctx().lista(pel({ tk_kokonaistulos_viimeisin: 130, tk_lajit_pvm: '2026-09-12', tki_merkki: 'kulta' }))).toEqual([]);
  });
  it('viimeisin (pikakentät) on auktoriteetti saman päivän historiariville: vajaa historiarivi + kokonaistulos pikakentissä → merkki; heikko viimeisin poistaa saman päivän merkin', () => {
    const vajaa = historia([['2026-09-12', { ponnauttelu_s: 20 }]]);
    expect(tekstit(ctx().lista(pel({ tki_historia: vajaa, tk_kokonaistulos_viimeisin: 79, tk_lajit_pvm: '2026-09-12' })))).toEqual(['Tekniikkakilpailu 9/2026 · kultamerkki']);
    const taysi = historia([['2026-09-12', lajit(79)]]);
    expect(ctx().lista(pel({ tki_historia: taysi, tk_kokonaistulos_viimeisin: 130, tk_lajit_pvm: '2026-09-12' }))).toEqual([]);   // korjattu tulos ylikirjoittaa
  });
  it('sama pvm kahdesti historiassa/viimeisimmässä → yksi merkki (ei tuplia)', () => {
    const p = pel({ tki_historia: [{ pvm: '2026-09-12', ...lajit(79) }, { pvm: '2026-09-12T10:00:00', ...lajit(79) }], tk_kokonaistulos_viimeisin: 79, tk_lajit_pvm: '2026-09-12' });
    expect(ctx().lista(p).length).toBe(1);
  });
  it('§7.22: teksti vain "Tekniikkakilpailu K/VVVV · merkki" — ei lukuja, sijoituksia, prosentteja eikä määrää', () => {
    const p = pel({ tki_historia: historia([['2026-09-12', lajit(79)], ['2026-10-03', lajit(85)]]) });
    ctx().lista(p).forEach((m) => { expect(m.teksti).toMatch(/^Tekniikkakilpailu \d{1,2}\/\d{4} · (kulta|hopea|pronssi)merkki$/); expect(m.teksti).not.toMatch(/\d{2,}\s*s\b|%|sija|\./i); });
  });
});

describe('käyttö Pelaaja_v7:ssä', () => {
  it('tavoiterivit renderöivät KAIKKI merkit listasta (forEach), ei yhtä', () => {
    const l = pura('function _minaTavoiteRivit(');
    expect(l).toMatch(/_tkMitalit\(p\)\.forEach\(/); expect(l).not.toMatch(/const _mit = _tkMitali\(p\)/);
  });
  it('ei lajikohtaisia merkkejä (§31) eikä tkLajiViite-kutsuja mitalilogiikassa', () => {
    ['_tkMitalit', '_tkMitaliViimeisin', '_tkKokonaisaikaRivilta'].forEach((f) => expect(pura('function ' + f + '(')).not.toMatch(/tkLajiViite|erinomainen|hyva/));
  });
});
