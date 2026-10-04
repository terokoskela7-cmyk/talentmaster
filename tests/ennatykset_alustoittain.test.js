/**
 * PR D2 (päätös 4.10.2026) — ennätykset alustakohtaisiksi.
 *  · EI muuntokaavaa alustojen välillä (validoitua kerrointa ei ole): _alustaNormi (tm_kehityskaari) + SWC_KERROIN (tm_mittarit) ennallaan.
 *  · Juoksutestien PÄÄALUSTA = mondo_yleisurheilualusta (yksi nimetty vakio lib/tm_alusta.js).
 *  · Eri alustan tulos tallentuu OMAKSI rivikseen (ennatykset_alustat) eikä enää katoa §22-sääntöön; ennätysnäkymässä Mondo ensin,
 *    muut alustat omina riveinään ilman vertailua. ennatykset.<testi> = pääennätys (taaksepäin yhteensopiva lukijoille).
 */
import { describe, it, expect, beforeAll } from 'vitest';
import { readFileSync } from 'fs';
import { createRequire } from 'module';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';
import vm from 'vm';

const require = createRequire(import.meta.url);
const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..');
const lue = (f) => readFileSync(join(ROOT, f), 'utf8');
const A = require('../lib/tm_alusta.js');
globalThis.TM_ALUSTA = A;
const E = require('../lib/tm_ennatykset.js');
const LANG = require('../lib/tm_lang.js');
const MONDO = 'mondo_yleisurheilualusta', HALLI = 'sisahalli_puu';
const lin = (arvo, pvm, alusta) => ({ testi: 'lin30m', arvo, pvm, alusta });

describe('Päätökset: pääalusta-vakio, ei muuntokaavaa', () => {
  it('PAAALUSTA_JUOKSU = Mondo; juoksutestit = lin5m/10m/30m, kasirata, sm_juoksu, sm_pallo, mas', () => {
    expect(A.PAAALUSTA_JUOKSU).toBe(MONDO);
    expect(A.JUOKSUTESTIT).toEqual(['lin5m', 'lin10m', 'lin30m', 'kasirata', 'sm_juoksu', 'sm_pallo', 'mas']);
    expect(A.tmPaaalusta('lin30m')).toBe(MONDO);
    expect(A.tmPaaalusta('cmj')).toBeNull();
    expect(A.tmPaaalusta('pujottelu')).toBeNull();
  });
  it('alustojen välistä muuntoa EI käytetä: _alustaNormi palauttaa arvon sellaisenaan; ennätys ei muunna', () => {
    expect(lue('lib/tm_kehityskaari.js')).toContain('function _alustaNormi(arvo, alusta) { return arvo; }');
    const r = E.paivitaEnnatykset({ lin30m: { paras: 4.0, alusta: MONDO } }, [lin(3.6, '2026-10-05', HALLI)]);
    expect(r.ennatykset_alustat.lin30m[HALLI].paras).toBe(3.6);          // halli-arvo sellaisenaan
    expect(r.ennatykset.lin30m).toEqual({ paras: 4.0, alusta: MONDO });   // Mondo-pää EI muutu hallin tuloksesta
    expect(r.uudet).toEqual([]);                                           // nopeampi halliaika EI ole Mondo-ennätys
  });
});

describe('Ennätykset alustoittain', () => {
  it('eri alustan tulos tallentuu omaksi rivikseen (ennen: §22 hylkäsi sen kokonaan)', () => {
    const r = E.paivitaEnnatykset({ lin30m: { paras: 4.0, pvm: '2026-10-01', alusta: MONDO } }, [lin(4.2, '2026-10-05', HALLI)]);
    expect(Object.keys(r.ennatykset_alustat.lin30m).sort()).toEqual([HALLI, MONDO].sort());
    expect(r.ennatykset_alustat.lin30m[HALLI]).toEqual({ paras: 4.2, pvm: '2026-10-05', alusta: HALLI });
  });
  it('parannus SAMAN alustan sisällä → edellinen + uudetAlustat; pääalusta (Mondo) pysyy pääennätyksenä', () => {
    let r = E.paivitaEnnatykset({ lin30m: { paras: 4.0, pvm: '2026-10-01', alusta: MONDO } }, [lin(4.2, '2026-10-05', HALLI)]);
    r = E.paivitaEnnatykset(r.ennatykset, [lin(4.05, '2026-10-12', HALLI)], null, r.ennatykset_alustat);
    expect(r.ennatykset_alustat.lin30m[HALLI]).toEqual({ paras: 4.05, pvm: '2026-10-12', alusta: HALLI, edellinen: 4.2 });
    expect(r.uudetAlustat).toEqual(['lin30m@' + HALLI]);
    expect(r.ennatykset.lin30m.alusta).toBe(MONDO);
  });
  it('TOPIAS: vanha pää "Halli / parketti" 3.12 → 1. Mondo-tulos ottaa pään, halli säilyy omana rivinään → halli 3.05 juhlii', () => {
    let r = E.paivitaEnnatykset({ lin30m: { paras: 3.12, pvm: '2026-10-04', alusta: HALLI } }, [lin(3.4, '2026-10-10', MONDO)]);
    expect(r.ennatykset.lin30m).toMatchObject({ paras: 3.4, alusta: MONDO });
    expect(r.ennatykset_alustat.lin30m[HALLI]).toMatchObject({ paras: 3.12 });
    expect(r.uudet).toEqual([]);                                           // ei vertailua halliin
    r = E.paivitaEnnatykset(r.ennatykset, [lin(3.05, '2026-10-20', HALLI)], null, r.ennatykset_alustat);
    expect(r.ennatykset_alustat.lin30m[HALLI]).toMatchObject({ paras: 3.05, edellinen: 3.12 });
    expect(r.uudetAlustat).toEqual(['lin30m@' + HALLI]);
  });
  it('alustaton (tuntematon) tulos + ei-alustaherkkä (cmj) → vanha yhden tietueen polku, ei alustarivejä', () => {
    const r = E.paivitaEnnatykset(null, [lin(4.0, '2026-10-05', null), { testi: 'cmj', arvo: 30, pvm: '2026-10-05', alusta: MONDO }]);
    expect(r.ennatykset_alustat).toBeUndefined();
    expect(r.ennatykset.lin30m.alusta).toBe('tuntematon');
    expect(r.ennatykset.cmj.paras).toBe(30);
  });
  it('tmEnnatysRivit: Mondo ensin, muut alustat omina riveinään; ei-alustaherkkä yksi rivi', () => {
    const p = { ennatykset: { lin30m: { paras: 3.4, alusta: MONDO }, cmj: { paras: 30, alusta: 'tuntematon' } },
      ennatykset_alustat: { lin30m: { [HALLI]: { paras: 3.05, pvm: '2026-10-20' }, keinonurmi_3g: { paras: 3.5, pvm: '2026-09-01' }, [MONDO]: { paras: 3.4, pvm: '2026-10-10' } } } };
    const rv = E.tmEnnatysRivit(p);
    expect(rv.map((r) => r.avain)).toEqual(['lin30m@' + MONDO, 'lin30m@' + HALLI, 'lin30m@keinonurmi_3g', 'cmj']);
    expect(rv[0].paa).toBe(true); expect(rv[1].paa).toBe(false);
  });
});

describe('Kirjoittajat: ennatykset_alustat samaan batchiin (§26)', () => {
  beforeAll(() => {
    globalThis.TM_TESTIKATALOGI = require('../lib/tm_testikatalogi.js');
    globalThis.TM_PIKAKENTAT = require('../lib/tm_pikakentat.js');
    const H = require('../lib/tm_historia.js');
    globalThis.tmHhSnapshot = H.tmHhSnapshot; globalThis.tmTkiSnapshot = H.tmTkiSnapshot; globalThis.tmHistoriaLisaa = H.tmHistoriaLisaa;
  });
  it('Pikakirjaus: Mondo-pää + hallitulos → upd sisältää molemmat kentät', () => {
    const PK = require('../lib/tm_pikakirjaus.js');
    const upd = {};
    PK._lisaaEnnatykset(upd, { ennatykset: { lin30m: { paras: 4.0, pvm: '2026-10-01', alusta: MONDO } } }, { lin_30m: 4.2 }, HALLI, '2026-10-05');
    expect(upd.ennatykset.lin30m.alusta).toBe(MONDO);
    expect(upd.ennatykset_alustat.lin30m[HALLI].paras).toBe(4.2);
  });
  it('kaikki kirjoittajat kirjoittavat ennatykset_alustat kun lib palauttaa sen', () => {
    expect(lue('lib/tm_pikakirjaus.js')).toContain('upd.ennatykset_alustat = r.ennatykset_alustat');
    expect(lue('TalentMaster_Testaus_v9.html')).toContain('u.ennatykset_alustat = r.ennatykset_alustat');
    expect(lue('TalentMaster_Testituonti_Master.html')).toContain('profiiliUpdate.ennatykset_alustat = enn.ennatykset_alustat');
    expect(lue('TalentMaster_Excel_Tuonti.html')).toContain('profiiliUpdate.ennatykset_alustat = _enR.ennatykset_alustat');
  });
});

describe('Näyttö: Pelaaja + Vanhempi (oikea koodi, oikea lib)', () => {
  const P7 = lue('TalentMaster_Pelaaja_v7.html');
  const pura = (src, tun) => { const i = src.indexOf(tun); expect(i, tun).toBeGreaterThan(-1); let syv = 0; for (let k = src.indexOf('{', i); k < src.length; k++) { if (src[k] === '{') syv++; else if (src[k] === '}') { syv--; if (!syv) return src.slice(i, k + 1); } } };
  const p = { id: 'X', ennatykset: { lin30m: { paras: 3.4, pvm: '2026-10-10', alusta: MONDO } },
    ennatykset_alustat: { lin30m: { [MONDO]: { paras: 3.4, pvm: '2026-10-10', alusta: MONDO }, [HALLI]: { paras: 3.05, pvm: '2026-10-20', alusta: HALLI, edellinen: 3.12 } } } };
  const ctx = vm.createContext({ window: { TM_ENNATYKSET: E }, t: LANG.t, tmAlustaKoodi: A.tmAlustaKoodi, tmAlustaNimi: A.tmAlustaNimi, Math, Number, String, Object, Array, isNaN });
  vm.runInContext(['function _thEsc(', 'function _kkEnnatysTiedot(', 'function _ennLuku(', 'function _kkAlustaNimi(', 'function _ennRivit(',
    'function _ennUudetNakematta(', 'function _kkEnnatyksetHTML('].map((f) => pura(P7, f)).join('\n')
    + '\nthis.kortti = _kkEnnatyksetHTML; this.rivit = _ennRivit; this.uudet = _ennUudetNakematta;', ctx);
  it('Pelaajan kortti: Mondo-rivi ensin, halli omana rivinään alustanimellä', () => {
    const h = ctx.kortti(p, '2_rakentaja').replace(/<[^>]*>/g, ' ').replace(/\s+/g, ' ');
    expect(h.indexOf('Mondo / yleisurheilualusta')).toBeGreaterThan(-1);
    expect(h.indexOf('Mondo / yleisurheilualusta')).toBeLessThan(h.indexOf('Sisähalli — puulattia'));
    expect(h).toContain('3.4 s'); expect(h).toContain('3.05 s');
  });
  it('juhla per alustarivi (avain testi@alusta); vanha nähty-merkki (avain = testi, sama pvm) EI juhli uudelleen', () => {
    expect(ctx.uudet(ctx.rivit(p), {}).juhli).toEqual(['lin30m@' + HALLI]);
    expect(ctx.uudet(ctx.rivit(p), { lin30m: '2026-10-20' }).juhli).toEqual([]);
  });
  it('Vanhempi: samat rivit jaetusta libistä, alustanimet näkyvissä', () => {
    const V2 = lue('TalentMaster_Vanhempi_v2.html');
    const vctx = vm.createContext({ window: { _lapsi: p, TM_ENNATYKSET: E }, t: LANG.t, tmAlustaKoodi: A.tmAlustaKoodi, tmPaivaIso: () => '2026-10-21', Date, Math, Number, String, Object, Array, isNaN });
    const a = V2.indexOf('const _VANH_ENN = {');
    vm.runInContext(V2.slice(a, V2.indexOf('};', a) + 2) + '\n' + ['function _vEsc(', 'function _vanhEnnArvo(', 'function _vanhEnnPvm(', 'function rVanhempiEnnatykset('].map((f) => pura(V2, f)).join('\n')
      + '\nthis.f = rVanhempiEnnatykset;', vctx);
    const h = vctx.f().replace(/<[^>]*>/g, ' ').replace(/\s+/g, ' ');
    expect(h.indexOf('Mondo / yleisurheilualusta')).toBeLessThan(h.indexOf('Sisähalli — puulattia'));
    expect(h).toContain('3.05 s'); expect(h).toContain('Uusi oma ennätys');
  });
  it('Pelaaja ja Vanhempi lataavat tm_alusta + tm_ennatykset (SW-allowlistit mukana)', () => {
    for (const f of ['TalentMaster_Pelaaja_v7.html', 'TalentMaster_Vanhempi_v2.html']) {
      expect(lue(f), f).toMatch(/lib\/tm_ennatykset\.js\?v=\d+/); expect(lue(f), f).toMatch(/lib\/tm_alusta\.js\?v=\d+/);
    }
    for (const f of ['sw_pelaaja.js', 'sw_vanhempi.js']) { expect(lue(f), f).toContain("/lib/tm_ennatykset.js"); expect(lue(f), f).toContain("/lib/tm_alusta.js"); }
  });
});
