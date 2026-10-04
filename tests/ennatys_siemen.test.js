/**
 * PR D — ennätysjuhla ei lauennut ensimmäisestä parannuksesta. Havainto (Tero 4.10.): Topias, Pikakirjaus 30 m →
 * Ennätykset-kortti 3.12 s, Kehityskaari "30 m nopeutui", mutta "🏅 Uusi oma ennätys" ei tullut.
 * Diag (vain luku): ennatykset.lin30m ILMAN edellistä · testitulokset 3.10. 3.17 "Muu" → 4.10. 3.12 "Halli / parketti".
 * Juurisyy: ennatykset-mappia ei ollut ennen #749:ää → 1. kirjaus ilman `edellinen`-kenttää → hiljaa nähdyksi; historiaa ei
 * käytetty siemenenä → kenenkään 1. parannus ei juhli (sama koskee "Oma ennätys" -saavutusta).
 * Korjaus YHDESSÄ paikassa: lib/tm_ennatykset.js (tmEnnatysSiemenet + paivitaEnnatykset(…, siemenet)); kirjoittajat antavat
 * pelaajadokin tilan ennen kirjoitusta. §22: siemenen alusta ≠ uusi (tai tuntematon alustaherkässä) → ei juhlaa.
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
const E = require('../lib/tm_ennatykset.js');
const VUOSI = new Date().getFullYear();

// Pelaaja_v7:n juhlaportti AJETAAN lähteestä: juhla ⇔ ennätyksellä on `edellinen`
const P7 = lue('TalentMaster_Pelaaja_v7.html');
function pura(src, tun) { const i = src.indexOf(tun); expect(i, tun).toBeGreaterThan(-1); let syv = 0; for (let k = src.indexOf('{', i); k < src.length; k++) { if (src[k] === '{') syv++; else if (src[k] === '}') { syv--; if (!syv) return src.slice(i, k + 1); } } }
const ctx = vm.createContext({ Object, String });
vm.runInContext(pura(P7, 'function _ennUudetNakematta(') + '\nthis.f = _ennUudetNakematta;', ctx);
const juhlii = (ennatykset) => ctx.f(ennatykset, {}).juhli;

const lin = (arvo, pvm, alusta) => ({ testi: 'lin30m', arvo, pvm, alusta });

describe('tmEnnatysSiemenet — aiempi data pelaajadokista (§26, ei alikokoelmaa)', () => {
  it('hh_historia (alusta per piste) + tki_historia (_s) + *_viimeisin jos pvm puuttuu historiasta', () => {
    const s = E.tmEnnatysSiemenet({
      hh_historia: [{ pvm: '2026-09-01', lin30m: 3.4, cmj: 28, pujottelu: 12.0, alusta: 'mondo_yleisurheilualusta' }],
      hh_viimeisin: { lin30m: 3.2 }, hh_pvm: '2026-09-20',
      tki_historia: [{ pvm: '2026-08-01', ponnauttelu_s: 20, kuljetus_laukaus_s: 15 }],
    });
    expect(s.lin30m).toEqual([{ arvo: 3.4, pvm: '2026-09-01', alusta: 'mondo_yleisurheilualusta' }, { arvo: 3.2, pvm: '2026-09-20', alusta: null }]);
    expect(s.cmj).toEqual([{ arvo: 28, pvm: '2026-09-01', alusta: 'mondo_yleisurheilualusta' }]);
    expect(s.ponnauttelu[0].arvo).toBe(20);
    expect(s.pujottelu, 'H-H pujottelu EI ole TK-pujottelun siemen (eri protokolla)').toBeUndefined();
    expect(s.kuljetus_laukaus, 'kuljetus_laukaus EI siemen (historiassa NETTO)').toBeUndefined();
    expect(E.tmEnnatysSiemenet(null)).toEqual({});
  });
});

describe('paivitaEnnatykset + siemen (ennätys puuttuu)', () => {
  const MONDO = 'mondo_yleisurheilualusta';
  it('siemen + parannus samalla alustalla → `edellinen` → JUHLA', () => {
    const r = E.paivitaEnnatykset(null, [lin(3.12, '2026-10-04', MONDO)], { lin30m: [{ arvo: 3.17, pvm: '2026-10-03', alusta: 'Mondo / yleisurheilualusta' }] });
    expect(r.ennatykset.lin30m).toEqual({ paras: 3.12, pvm: '2026-10-04', alusta: MONDO, edellinen: 3.17 });
    expect(r.uudet).toEqual(['lin30m']);
    expect(juhlii(r.ennatykset)).toEqual(['lin30m']);
  });
  it('siemen, EI parannusta → ei juhlaa; aiempi oma paras pysyy ennätyksenä (ei "huononi")', () => {
    const r = E.paivitaEnnatykset(null, [lin(3.30, '2026-10-04', MONDO)], { lin30m: [{ arvo: 3.17, pvm: '2026-10-03', alusta: MONDO }] });
    expect(r.ennatykset.lin30m).toEqual({ paras: 3.17, pvm: '2026-10-03', alusta: MONDO });
    expect(r.uudet).toEqual([]); expect(juhlii(r.ennatykset)).toEqual([]);
  });
  it('TOPIAS: siemen 3.17 "Muu" (tai alustaton historia) → 3.12 "Halli / parketti" = ERI alusta → ei juhlaa, uusi tulos lähtötasoksi', () => {
    for (const siemenAlusta of ['Muu', null]) {
      const r = E.paivitaEnnatykset(null, [lin(3.12, '2026-10-04', 'Halli / parketti')], { lin30m: [{ arvo: 3.17, pvm: '2026-10-03', alusta: siemenAlusta }] });
      expect(r.ennatykset.lin30m, String(siemenAlusta)).toEqual({ paras: 3.12, pvm: '2026-10-04', alusta: 'sisahalli_puu' });
      expect(r.uudet).toEqual([]); expect(juhlii(r.ennatykset)).toEqual([]);
    }
  });
  it('uusi tulos ilman alustaa (tuntematon) alustaherkässä testissä → ei juhlaa vaikka siemen parempi/huonompi', () => {
    const r = E.paivitaEnnatykset(null, [lin(3.0, '2026-10-04', null)], { lin30m: [{ arvo: 3.5, pvm: '2026-10-01', alusta: null }] });
    expect(r.uudet).toEqual([]); expect(r.ennatykset.lin30m.edellinen).toBeUndefined();
  });
  it('ei historiaa → ei juhlaa (1. mittaus = lähtötaso)', () => {
    for (const sm of [null, {}, { lin30m: [] }]) {
      const r = E.paivitaEnnatykset(null, [lin(3.12, '2026-10-04', MONDO)], sm);
      expect(r.ennatykset.lin30m).toEqual({ paras: 3.12, pvm: '2026-10-04', alusta: MONDO }); expect(juhlii(r.ennatykset)).toEqual([]);
    }
  });
  it('saman päivän arvo ei ole siemen (korjaus ≠ edellinen); ei-alustaherkkä (cmj) vertautuu alustasta riippumatta', () => {
    expect(E.paivitaEnnatykset(null, [lin(3.12, '2026-10-04', MONDO)], { lin30m: [{ arvo: 3.5, pvm: '2026-10-04', alusta: MONDO }] }).uudet).toEqual([]);
    const c = E.paivitaEnnatykset(null, [{ testi: 'cmj', arvo: 31, pvm: '2026-10-04', alusta: null }], { cmj: [{ arvo: 28, pvm: '2026-09-01', alusta: null }] });
    expect(c.ennatykset.cmj).toEqual({ paras: 31, pvm: '2026-10-04', alusta: 'tuntematon', edellinen: 28 });
  });
  it('olemassa oleva ennätys → siemeniä EI käytetä (logiikka ennallaan, characterization)', () => {
    const r = E.paivitaEnnatykset({ lin30m: { paras: 3.3, alusta: MONDO } }, [lin(3.2, '2026-10-04', MONDO)], { lin30m: [{ arvo: 2.0, pvm: '2026-01-01', alusta: MONDO }] });
    expect(r.ennatykset.lin30m).toEqual({ paras: 3.2, pvm: '2026-10-04', alusta: MONDO, edellinen: 3.3 });
  });
});

describe('Kirjoittajat antavat pelaajadokin → siemen (yksi paikka: lib)', () => {
  beforeAll(() => {
    globalThis.TM_TESTIKATALOGI = require('../lib/tm_testikatalogi.js');
    globalThis.TM_PIKAKENTAT = require('../lib/tm_pikakentat.js');
    globalThis.TM_ALUSTA = require('../lib/tm_alusta.js');
    const H = require('../lib/tm_historia.js');
    globalThis.tmHhSnapshot = H.tmHhSnapshot; globalThis.tmTkiSnapshot = H.tmTkiSnapshot; globalThis.tmHistoriaLisaa = H.tmHistoriaLisaa;
  });
  it('Pikakirjaus päästä päähän: vanha historia (ei ennatykset-mappia) → parempi tulos samalla alustalla → juhla', () => {
    const PK = require('../lib/tm_pikakirjaus.js');
    const d = { syntymaVuosi: VUOSI - 13, sukupuoli: 'M', hh_historia: [{ pvm: '2026-10-03', lin30m: 3.17, alusta: 'mondo_yleisurheilualusta' }], hh_viimeisin: { lin30m: 3.17 }, hh_pvm: '2026-10-03' };
    const upd = {};
    PK._lisaaEnnatykset(upd, d, { lin_30m: 3.12 }, 'mondo_yleisurheilualusta', '2026-10-04');
    expect(upd.ennatykset.lin30m).toEqual({ paras: 3.12, pvm: '2026-10-04', alusta: 'mondo_yleisurheilualusta', edellinen: 3.17 });
    expect(juhlii(upd.ennatykset)).toEqual(['lin30m']);
  });
  it('kaikki neljä kirjoittajaa välittävät pelaajadokin (Pikakirjaus, Testaus_v9, Testituonti, Excel)', () => {
    expect(lue('lib/tm_pikakirjaus.js')).toContain("E.tmEnnatyksetUpd(d.ennatykset || null, tulokset, alusta || 'tuntematon', pvm, d)");
    expect(lue('TalentMaster_Testaus_v9.html')).toContain('TM_ENNATYKSET.tmEnnatyksetUpd(d.ennatykset || null, _tulokset[pl.id] || {}, alusta, pvm, d)');
    expect(lue('TalentMaster_Testituonti_Master.html')).toContain("tapahtuma.alusta || 'tuntematon', pvm, _dEnn)");
    expect(lue('TalentMaster_Excel_Tuonti.html')).toContain('paivitaEnnatykset(_nykyEnn, _ennatKand, _siem,');   // + ennatykset_alustat (PR D2)
    // vain lib määrittelee siemenlogiikan (ei kopioita kirjoittajiin)
    for (const f of ['lib/tm_pikakirjaus.js', 'TalentMaster_Testaus_v9.html', 'TalentMaster_Testituonti_Master.html', 'TalentMaster_Excel_Tuonti.html']) {
      expect(lue(f), f).not.toMatch(/function (tmEnnatysSiemenet|_parasSiemen)\s*\(/);
    }
  });
});
