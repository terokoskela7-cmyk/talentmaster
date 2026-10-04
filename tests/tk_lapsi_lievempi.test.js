/**
 * PR G -jatko (Teron tarkastus 4.10.2026):
 *  1) Lapsen/huoltajan välitavoite = LIEVEMPI alueellisesta ja valtakunnallisesta "hyvä"-tasosta kun molemmat on
 *     (alueellinen = top-20-otos, voi olla finaalia tiukempi — esim. P12 kuljetus-laukaus 11.7 vs 14.5).
 *  3) VP/Master Eerikkilä-badge "valtak." → "H-H-normi" (ei sekoitu TK:n "Loppukilpailutaso"-merkintään).
 *  4) Vain lukeva kartoitus (scripts/diag_tk_hh_sekaantuminen.js): TK-kentissä todennäköisesti H-H-arvo.
 */
import { describe, it, expect } from 'vitest';
import { readFileSync } from 'fs';
import { createRequire } from 'module';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';
import vm from 'vm';

const require = createRequire(import.meta.url);
const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..');
const lue = (f) => readFileSync(join(ROOT, f), 'utf8');
const T = require('../docs/testit_indeksit.js');
const VUOSI = new Date().getFullYear();

describe('1) tkLajiViiteLapsi — hyvä = lievempi alue/finaali', () => {
  it('P12 kuljetus-laukaus: alue 11.7 tiukempi → lapsen hyvä = finaali 14.5; erinomainen pysyy alueellisena', () => {
    const v = T.tkLajiViiteLapsi('kuljetus_laukaus', 12, 'P');
    expect(v).toMatchObject({ hyva: 14.5, erinomainen: 8.6, hyvaLahde: 'valtakunnallinen' });
    expect(T.tkValitavoite(16, v, false)).toBe(14.5);   // ennen (alue) 13.0 → tiukempi kuin finaali
  });
  it('P10 pujottelu: alue 27.1 lievempi kuin finaali 26.2 → alueellinen', () => {
    expect(T.tkLajiViiteLapsi('pujottelu', 10, 'P')).toMatchObject({ hyva: 27.1, hyvaLahde: 'alueellinen' });
  });
  it('pituuspotku_bonus (suurempi parempi): lievempi = PIENEMPI (P12 alue 13.3 vs finaali 12.4 → 12.4)', () => {
    expect(T.tkLajiViiteLapsi('pituuspotku_bonus', 12, 'P')).toMatchObject({ hyva: 12.4, hyvaLahde: 'valtakunnallinen' });
  });
  it('vain alueellinen (P13) → alueellinen; ei alueellista → null (ei finaalitasoa lapsen tavoitteeksi)', () => {
    expect(T.tkLajiViiteLapsi('pujottelu', 13, 'P')).toMatchObject({ hyva: 25.3, hyvaLahde: 'alueellinen' });
    expect(T.tkLajiViiteLapsi('pujottelu', 7, 'P')).toBeNull();
  });
  it('valtakunnallinen huomioidaan vain kun n ≥ 5: P11 kuljetus-laukaus (finaali n=2) → alueellinen', () => {
    expect(T.TK_LAPSI_VALTAK_MIN_N).toBe(5);
    expect(T.tkLajiViite('kuljetus_laukaus', 11, 'P', 'valtakunnallinen').n).toBe(2);
    expect(T.tkLajiViiteLapsi('kuljetus_laukaus', 11, 'P')).toMatchObject({ hyva: 14.1, hyvaLahde: 'alueellinen' });
  });
  it('T12 (finaali n=7): alueellinen tiukempi kaikissa 5 lajissa → lapsen hyvä = finaali (lievempi)', () => {
    expect(T.tkLajiViite('syotto', 12, 'T', 'valtakunnallinen').n).toBe(7);
    for (const laji of ['syotto', 'pujottelu', 'ponnauttelu', 'kuljetus_laukaus', 'pituuspotku_bonus']) {
      const f = T.tkLajiViite(laji, 12, 'T', 'valtakunnallinen');
      expect(T.tkLajiViiteLapsi(laji, 12, 'T'), laji).toMatchObject({ hyva: f.hyva, hyvaLahde: 'valtakunnallinen' });
    }
  });
  it('pieni finaaliotos (n < 5) ei koskaan valitse valtakunnallista', () => {
    for (const sp of ['P', 'T']) for (const ika of [8, 9, 10, 11, 12, 13]) for (const laji of ['syotto', 'pujottelu', 'ponnauttelu', 'kuljetus_laukaus', 'pituuspotku_bonus']) {
      const l = T.tkLajiViiteLapsi(laji, ika, sp), f = T.tkLajiViite(laji, ika, sp, 'valtakunnallinen');
      if (l && f && f.n < 5) expect(l.hyvaLahde, sp + ika + laji).toBe('alueellinen');
    }
  });
  it('ei yhtään solua (finaali n ≥ 5), jossa lapsen hyvä olisi finaalia tiukempi', () => {
    for (const sp of ['P', 'T']) for (const ika of [8, 9, 10, 11, 12, 13]) for (const laji of ['syotto', 'pujottelu', 'ponnauttelu', 'kuljetus_laukaus', 'pituuspotku_bonus']) {
      const l = T.tkLajiViiteLapsi(laji, ika, sp), f = T.tkLajiViite(laji, ika, sp, 'valtakunnallinen');
      if (!l || !f || f.n < 5) continue;
      if (laji === 'pituuspotku_bonus') expect(l.hyva, sp + ika + laji).toBeLessThanOrEqual(f.hyva);
      else expect(l.hyva, sp + ika + laji).toBeGreaterThanOrEqual(f.hyva);
    }
  });
  it('Pelaaja (_tekKorttiData) ja Vanhempi käyttävät lapsen viitettä; henkilökunta (VP/Master) ei', () => {
    const P7 = lue('TalentMaster_Pelaaja_v7.html'), V2 = lue('TalentMaster_Vanhempi_v2.html');
    expect(P7).toContain('T.tkLajiViiteLapsi(laji, ika, sp)'); expect(P7).toContain('T.tkLajiViiteLapsi(kk, ika, sp)');
    expect(V2).toContain('T.tkLajiViiteLapsi(laji, ika, sp)');
    for (const f of ['TalentMaster_VP_v25.html', 'TalentMaster_Master_v16.html']) expect(lue(f), f).not.toContain('tkLajiViiteLapsi');
    // ajo: P12 kuljetus-laukaus 16 s → lapsen tavoite 14.5 (ei alueen 11.7-pohjainen)
    const pura = (s, t) => { const i = s.indexOf(t); let d = 0; for (let k = s.indexOf('{', i); k < s.length; k++) { if (s[k] === '{') d++; else if (s[k] === '}') { d--; if (!d) return s.slice(i, k + 1); } } };
    const ctx = vm.createContext({ window: { TM_TESTIT: T }, Math, Number, String, Date });
    vm.runInContext([pura(P7, 'function _minaTekLajiNimi('), pura(P7, 'function _minaValitavoite('), pura(P7, 'function _tekKorttiData(')].join('\n') + '\nthis.f = _tekKorttiData;', ctx);
    expect(ctx.f({ syntymaVuosi: VUOSI - 12, sukupuoli: 'M', tki_kehityskohde: 'kuljetus_laukaus', tk_lajit_viimeisin: { kuljetus_laukaus_s: 16 } }).kehitys.tavoite).toBe(14.5);
  });
});

describe('3) Eerikkilä-badge = "H-H-normi" (ei "valtak.")', () => {
  it('VP + Master: H-H-normi; vanha "valtak."/"V3/3" poissa', () => {
    const VP = lue('TalentMaster_VP_v25.html'), M = lue('TalentMaster_Master_v16.html');
    expect(VP).toContain("vpT('/3 H-H-normi')"); expect(VP).toContain("vpT('H-H-normi')");
    expect(VP).not.toMatch(/vpT\('\/3 valtak\.'\)|vpT\('valtak\.'\)/);
    expect(M).toContain("masterT('H-H-normi')"); expect(M).not.toContain("'\">V' + _vt + '/3</span>'");
  });
});

describe('4) Kartoitus H-H-arvoista TK-kentissä (vain luku)', () => {
  const { tmTkHhEpaily } = require('../scripts/diag_tk_hh_sekaantuminen.js');
  const viite = (l, i, s) => T.tkLajiViite(l, i, s, 'alueellinen');
  it('A sama arvo · B mittakaava · C historia; puhdas TK-arvo ei epäilyttävä', () => {
    const d = { syntymaVuosi: 2013, sukupuoli: 'M', tk_lajit_pvm: '2026-05-01', hh_viimeisin: { syotto: 9.8 },
      tk_lajit_viimeisin: { pujottelu_s: 12.4, syotto_s: 9.8 }, tki_historia: [{ pvm: '2025-05-01', pujottelu_s: 11.9 }, { pvm: '2026-05-01', pujottelu_s: 25.0 }] };
    const e = tmTkHhEpaily(d, viite, 2026);
    expect(e.map((x) => x.peruste[0]).sort()).toEqual(['A', 'B', 'C']);
    expect(tmTkHhEpaily({ syntymaVuosi: 2013, tk_lajit_pvm: '2026-05-01', tk_lajit_viimeisin: { pujottelu_s: 25.6 } }, viite, 2026)).toEqual([]);
  });
  it('skriptissä ei kirjoituskutsuja eikä nimiä tulosteessa', () => {
    const s = lue('scripts/diag_tk_hh_sekaantuminen.js').split('\n').filter((l) => !/^\s*(\/\/|\*|\/\*)/.test(l)).join('\n');
    expect(s).not.toMatch(/\.(set|update|delete|add|commit)\(|\.batch\(/);
    expect(s).not.toMatch(/etunimi|sukunimi|\.nimi\b/);
  });
});
