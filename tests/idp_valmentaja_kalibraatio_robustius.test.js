/**
 * TalentMaster™ — Valmentajan IDP Briiffi 1: kalibraatio-parituksen robustius + rehellinen tyhjä tila (VP_v25).
 * Juurisyy (Joakim, rooli vp): itsearvio (joukkue P10) ja VP-havainnointi (P12) täsmäsivät kaikessa PAITSI
 * joukkueessa → paritusta ei ehdotettu. Korjaus: joukkue = PEHMEÄ etusija, EI kova suodatin (valmentajaUid + ±2 pv
 * pysyvät). Ihmisen vahvistus säilyy (_hlVahvistaPari koskematon). Tyhjä tila kertoo MITÄ puuttuu. §37 kehittävä.
 */
import { describe, it, expect, beforeAll } from 'vitest';
import { readFileSync } from 'fs';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

const __dir = dirname(fileURLToPath(import.meta.url));
const VP = readFileSync(join(__dir, '..', 'TalentMaster_VP_v25.html'), 'utf8');

const mk = (id, uid, jk, tapa, pvm, extra) => Object.assign({ _id: id, valmentajaUid: uid, joukkue: jk, arviointitapa: tapa, malli: 'valmennustaidot', pvm: pvm }, extra || {});
function build(arvioinnit, torjutut) {
  const lines = VP.split('\n');
  const s = lines.findIndex((l) => l.includes('function _hlKalibTyhjaViesti(arvioinnit) {'));
  const e = lines.findIndex((l, i) => i > s && l.trim() === 'function _hlPariBlokki(a) {');
  if (s < 0 || e < 0) throw new Error('_hlKalibTyhjaViesti / _hlEhdotaPari -lohkoa ei löytynyt');
  return new Function('_hlArvioinnit', '_hlTorjutut', 'var vpT = function (x) { return x; };\n' + lines.slice(s, e).join('\n') + '\nreturn { _hlKalibTyhjaViesti, _hlEhdotaPari };')(arvioinnit, torjutut || {}); // vpT-identity-stub (fi): i18n-reititys läpinäkyvä yksikkötestille
}

describe('_hlEhdotaPari — robusti paritus (joukkue pehmeä, ei kova)', () => {
  it('JOAKIM-bugi korjattu: eri joukkuemerkintä (P10 vs P12), sama valmentaja + ±2 pv → paritus ehdotetaan', () => {
    const a = [mk('a', 'joakim', 'P10', 'itsearvio', '2026-03-01'), mk('b', 'joakim', 'P12', 'havainnointi', '2026-03-02')];
    const M = build(a);
    expect(M._hlEhdotaPari(a[0]) && M._hlEhdotaPari(a[0])._id).toBe('b');
  });
  it('valmentajaUid PYSYY pakollisena (kalibraatio on per valmentaja)', () => {
    const a = [mk('a', 'joakim', 'P10', 'itsearvio', '2026-03-01'), mk('b', 'liisa', 'P10', 'havainnointi', '2026-03-02')];
    expect(build(a)._hlEhdotaPari(a[0])).toBeNull();
  });
  it('±2 pv -ikkuna pysyy (yli → ei paria)', () => {
    const a = [mk('a', 'joakim', 'P10', 'itsearvio', '2026-03-01'), mk('b', 'joakim', 'P10', 'havainnointi', '2026-03-20')];
    expect(build(a)._hlEhdotaPari(a[0])).toBeNull();
  });
  it('pehmeä etusija: sama joukkue voittaa eri-joukkueisen vaikka pvm kauempana', () => {
    const a = [mk('a', 'joakim', 'P10', 'itsearvio', '2026-03-01'), mk('b', 'joakim', 'P12', 'havainnointi', '2026-03-01'), mk('c', 'joakim', 'P10', 'havainnointi', '2026-03-02')];
    expect(build(a)._hlEhdotaPari(a[0])._id).toBe('c');
  });
  it('vahvistettu pari ja torjuttu pari suljetaan pois (ihmisen valinta säilyy)', () => {
    const a1 = [mk('a', 'j', 'P10', 'itsearvio', '2026-03-01'), mk('b', 'j', 'P12', 'havainnointi', '2026-03-01', { pari_vahvistettu: true })];
    expect(build(a1)._hlEhdotaPari(a1[0])).toBeNull();
    const a2 = [mk('a', 'j', 'P10', 'itsearvio', '2026-03-01'), mk('b', 'j', 'P12', 'havainnointi', '2026-03-01')];
    expect(build(a2, { 'a|b': true })._hlEhdotaPari(a2[0])).toBeNull();
  });
});

describe('_hlKalibTyhjaViesti — rehellinen tyhjä tila (kerro mitä puuttuu, §37)', () => {
  it('ei arviointeja → kehottaa tekemään itsearvio + havainnointi', () => {
    expect(build([])._hlKalibTyhjaViesti([])).toContain('Ei vielä valmennustaito-arviointeja');
  });
  it('vain itsearvio → puuttuu VP-havainnointi', () => {
    const a = [mk('a', 'x', 'P10', 'itsearvio', '2026-03-01')];
    const msg = build(a)._hlKalibTyhjaViesti(a);
    expect(msg).toContain('0 havainnointia');
    expect(msg).toContain('VP-havainnoinnin');
  });
  it('vain havainnointi → puuttuu itsearvio', () => {
    const a = [mk('a', 'x', 'P10', 'havainnointi', '2026-03-01')];
    expect(build(a)._hlKalibTyhjaViesti(a)).toContain('0 itsearviota');
  });
  it('molemmat + robusti pari löytyy → "N paria odottaa vahvistusta" (Joakim näkee toimintaohjeen)', () => {
    const a = [mk('a', 'joakim', 'P10', 'itsearvio', '2026-03-01'), mk('b', 'joakim', 'P12', 'havainnointi', '2026-03-02')];
    expect(build(a)._hlKalibTyhjaViesti(a)).toContain('paria odottaa vahvistusta');
  });
  it('molemmat mutta ei pariudu (yli ±2 pv) → "ei löytynyt paria" + manuaalilinkitys', () => {
    const a = [mk('a', 'j', 'P10', 'itsearvio', '2026-03-01'), mk('b', 'j', 'P10', 'havainnointi', '2026-03-20')];
    const msg = build(a)._hlKalibTyhjaViesti(a);
    expect(msg).toContain('ei löytynyt paria');
    expect(msg).toContain('Linkitä manuaalisesti');
  });
  it('suomen partitiivi: 1 → "itsearvio", 2 → "itsearviota"', () => {
    const yksi = [mk('a', 'x', 'P10', 'itsearvio', '2026-03-01')];
    expect(build(yksi)._hlKalibTyhjaViesti(yksi)).toContain('1 itsearvio,');
    const kaksi = [mk('a', 'x', 'P10', 'itsearvio', '2026-03-01'), mk('b', 'x', 'P10', 'itsearvio', '2026-03-02')];
    expect(build(kaksi)._hlKalibTyhjaViesti(kaksi)).toContain('2 itsearviota');
  });
});

describe('Briiffi 1 — wiring + koskemattomuus', () => {
  it('molemmat tyhjät tilat käyttävät _hlKalibTyhjaViesti (coach-paneeli + malli B)', () => {
    expect(VP).toContain('if (!r) kalEl.innerHTML = _hlKalibTyhjaViesti(arvioinnit);');
    expect(VP).toContain("_hlKalibTyhjaViesti(kalInput)");
    expect(VP).not.toContain('Ei vahvistettuja pareja vielä — vahvista itsearvio↔havainnointi tapahtumanäkymässä.');
  });
  it('joukkue EI enää kova suodatin _hlEhdotaPari:ssa (vain valmentajaUid pakollinen)', () => {
    expect(VP).not.toContain('if (x.valmentajaUid !== a.valmentajaUid || lc(x.joukkue) !== lc(a.joukkue)) return false;');
    expect(VP).toContain('if (x.valmentajaUid !== a.valmentajaUid) return false;');
  });
  it('label kertoo eri joukkuemerkinnän (keskustelunavaus, §37)', () => {
    expect(VP).toContain('eri joukkuemerkintä — vahvista jos sama harjoitus');
  });
  it('ihmisen vahvistus (_hlVahvistaPari) + laskeHarjoitusKalibraatio koskemattomia', () => {
    expect(VP).toContain('window._hlVahvistaPari = async function');
    expect(VP).toContain('laskeHarjoitusKalibraatio(itse.vastaukset, hav.vastaukset)');
  });
});
