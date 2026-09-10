/**
 * i18n V5 · VP_v25 alaerä V8c — Palloliitto-taksonomia → sv: RESOLVE-TODISTE.
 *
 * Miksi oma gate: render-gate (idp_i18n_v5_vp_render_dom) ohittaa lib-taksonomian nimet `isLib`-sallituslistalla
 * (nimi_fi-arvot ovat allowlistissa), joten se on SOKEA tälle luokalle — vihreä gate ei todista että arviointi-UI
 * puhuu ruotsia. Tämä testi todistaa sen kolmella tasolla:
 *   1) DATA — jokaisella dimensiolla/attribuutilla/asteikkoportaalla/kategorialla on sv (≠ fi, ei tyhjä).
 *   2) AJO — VP:n kielivalinta-helperit ([TAKS-I18N]-lohko HTML:stä) ajetaan vm-sandboxissa oikealla
 *      taksonomialla: `tmNykyinenKieli()==='sv'` → jokainen nimi/asteikko/teema resolvoituu sv:ksi, ei fi-jäänteitä.
 *      (Muistisääntö: render-funktioille ajo, ei pelkkä lähdeluku.)
 *   3) REITITYS — arviointi/PDC-renderit EIVÄT enää lue `item.nimi_fi`/`A[v].fi`-kenttiä suoraan (negatiivitesti).
 * Kielineutraalius: fi-tilassa helperit palauttavat täsmälleen nimi_fi/fi (ei regressiota suomelle).
 */
import { describe, it, expect } from 'vitest';
import { readFileSync } from 'fs';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';
import { createRequire } from 'module';
import vm from 'vm';

const __dir = dirname(fileURLToPath(import.meta.url));
const require = createRequire(import.meta.url);
const T = require('../lib/tm_arviointi_taksonomia.js');
const VP_PATH = join(__dir, '..', 'TalentMaster_VP_v25.html');
const VP = readFileSync(VP_PATH, 'utf8');

const DIMIT = ['D1', 'D2', 'D3', 'D4', 'D5'];
const PORTAAT = [1, 2, 3, 4, 5];
const KATEGORIAT = [...new Set(T.ARVIOINTI_TAKSONOMIA.map((i) => i.kategoria))];

// ── VP:n kielivalinta-lohko sandboxiin (sama koodi joka ajaa selaimessa) ──────────────────────────
function sandbox(kieli) {
  const alku = VP.indexOf('// ─── [TAKS-I18N-ALKU]');
  const loppu = VP.indexOf('// ─── [TAKS-I18N-LOPPU]');
  expect(alku, 'TAKS-I18N-ALKU-merkki puuttuu VP_v25:stä').toBeGreaterThan(-1);
  expect(loppu, 'TAKS-I18N-LOPPU-merkki puuttuu VP_v25:stä').toBeGreaterThan(alku);
  const sb = { console, tmNykyinenKieli: () => kieli };
  sb.window = sb;
  vm.createContext(sb);
  vm.runInContext(readFileSync(join(__dir, '..', 'lib', 'tm_arviointi_taksonomia.js'), 'utf8'), sb);
  vm.runInContext(VP.slice(alku, loppu), sb);
  return sb;
}

describe('V8c · 1 DATA — taksonomialla on sv-kattavuus', () => {
  it('dimensiot D1–D5: nimi_sv olemassa ja ≠ nimi_fi', () => {
    DIMIT.forEach((d) => {
      const o = T.TM_DIMENSIOT[d];
      expect(o && o.nimi_sv, d).toBeTruthy();
      expect(o.nimi_sv, d).not.toBe(o.nimi_fi);
    });
  });
  it('kaikki 57 attribuuttia: nimi_sv olemassa, ei-tyhjä, ≠ nimi_fi', () => {
    expect(T.ARVIOINTI_TAKSONOMIA.length).toBe(57);
    const puuttuu = T.ARVIOINTI_TAKSONOMIA.filter((i) => !i.nimi_sv || !String(i.nimi_sv).trim() || i.nimi_sv === i.nimi_fi);
    expect(puuttuu.map((i) => i.avain)).toEqual([]);
  });
  it('asteikko 1–5: sv olemassa ja ≠ fi (koodi P/A/G/VG/E ennallaan)', () => {
    PORTAAT.forEach((v) => {
      const s = T.TM_ARVIOINTI_ASTEIKKO[v];
      expect(s.sv, 'porras ' + v).toBeTruthy();
      expect(s.sv, 'porras ' + v).not.toBe(s.fi);
      expect(s.koodi, 'porras ' + v).toBeTruthy();
    });
  });
  it('kategoriat: tmKategoriaNimi(k,"sv") ≠ fi; ilman kieltä + tuntemattomalla kielellä fi (taaksepäin-yhteensopiva)', () => {
    KATEGORIAT.forEach((k) => {
      expect(T.tmKategoriaNimi(k, 'sv'), k).not.toBe(T.tmKategoriaNimi(k));
      expect(T.tmKategoriaNimi(k, 'en'), k).toBe(T.tmKategoriaNimi(k));   // en-kartta puuttuu → fi-fallback
    });
  });
});

describe('V8c · 2 AJO — VP-helperit resolvoivat sv:ksi (vm-sandbox, ei pelkkä lähdeluku)', () => {
  it('sv: D1–D5 + kaikki attribuutit + asteikko 1–5 + teemat palautuvat sv:nä (0 fi-jäännettä)', () => {
    const sb = sandbox('sv');
    const fi = [];
    DIMIT.forEach((d) => { if (sb._taksNimi(T.TM_DIMENSIOT[d]) !== T.TM_DIMENSIOT[d].nimi_sv) fi.push('dim ' + d); });
    T.ARVIOINTI_TAKSONOMIA.forEach((i) => { if (sb._taksNimi(i) !== i.nimi_sv) fi.push('attr ' + i.avain); });
    PORTAAT.forEach((v) => { if (sb._taksAst(T.TM_ARVIOINTI_ASTEIKKO[v]) !== T.TM_ARVIOINTI_ASTEIKKO[v].sv) fi.push('ast ' + v); });
    T.tmTeemat().forEach((t) => {
      const odotus = t.dim + ' · ' + T.tmKategoriaNimi(t.kategoria, 'sv');
      if (sb._taksTeemaNimi(t) !== odotus) fi.push('teema ' + t.avain);
      if (sb._taksTeemaNimi(t) === t.nimi) fi.push('teema-fi-jäänne ' + t.avain);   // t.nimi = esikoostettu fi
    });
    expect(fi).toEqual([]);
  });
  it('fi: helperit palauttavat nimi_fi / fi / esikoostetun teemanimen (ei regressiota suomelle)', () => {
    const sb = sandbox('fi');
    expect(sb._taksNimi(T.TM_DIMENSIOT.D4)).toBe('Peliäly');
    expect(sb._taksNimi(T.tmTaksonomiaByAvain('finishing'))).toBe('Viimeistely');
    expect(sb._taksAst(T.TM_ARVIOINTI_ASTEIKKO[3])).toBe('Osaa');
    expect(sb._taksTeemaNimi(T.tmTeemat()[0])).toBe(T.tmTeemat()[0].nimi);
  });
  it('puuttuva käännös → fi-fallback, ei tyhjää (kv-kehys ilman sv:tä)', () => {
    const sb = sandbox('sv');
    expect(sb._taksNimi({ nimi_fi: 'Oma kohde' })).toBe('Oma kohde');
    expect(sb._taksAst({ fi: 'Oma porras' })).toBe('Oma porras');
    expect(sb._taksNimi(null)).toBe('');
  });
  it('kanoniset sv-termit lukittu (glossaari-konformi: Syöttö→Passning, Pujottelu→Slalom -linja)', () => {
    const sb = sandbox('sv');
    const n = (avain) => sb._taksNimi(T.tmTaksonomiaByAvain(avain));
    expect(n('short_passing')).toBe('Kort passning');
    expect(n('finishing')).toBe('Avslut');
    expect(n('ball_control')).toBe('Bollkontroll');
    expect(n('endurance')).toBe('Uthållighet');   // = tm_vp_i18n sv-kartta (ei driftiä)
    expect(n('mobility')).toBe('Smidighet');
    expect(n('power')).toBe('Styrka');
    expect(sb._taksNimi(T.TM_DIMENSIOT.D4)).toBe('Spelintelligens');   // EI 'Spelint' (V8c-bugikorjaus)
  });
});

describe('V8c · 3 REITITYS — renderit eivät lue nimi_fi/fi-kenttiä suoraan', () => {
  const rivit = VP.split('\n');
  // Arviointi + fokusvalinta + PDC/FA-lista: taksonomianimen näyttö AINA _taksNimi/_taksAst/_taksTeemaNimi kautta.
  it('arviointi/fokus/PDC-renderit: 0 suoraa item.nimi_fi / DN[dim].nimi_fi / A[v].fi -näyttöä', () => {
    const kielletty = [/\bitem\.nimi_fi\b/, /\bit\.nimi_fi\b/, /DN\[dim\]\.nimi_fi/, /TM_DIMENSIOT\[dim\]\.nimi_fi/, /\bA\[v\]\.fi\b/, /\bast\.fi\b/];
    const osumat = [];
    rivit.forEach((l, i) => {
      if (!/_jsvEsc|jsp-arv|pdc-fa|<option/.test(l)) return;
      kielletty.forEach((re) => { if (re.test(l)) osumat.push((i + 1) + ': ' + l.trim().slice(0, 90)); });
    });
    expect(osumat).toEqual([]);
  });
  it('reititetyt kutsupaikat ovat olemassa (ei-vacuous: helperit tosiasiassa käytössä)', () => {
    expect((VP.match(/_taksNimi\(/g) || []).length).toBeGreaterThanOrEqual(7);
    expect((VP.match(/_taksAst\(/g) || []).length).toBeGreaterThanOrEqual(3);
    expect((VP.match(/_taksTeemaNimi\(/g) || []).length).toBeGreaterThanOrEqual(3);
  });
  it('lib pysyy kielineutraalina: tm_arviointi_taksonomia ei lue kieltä (ei tmNykyinenKieli-riippuvuutta)', () => {
    const lib = readFileSync(join(__dir, '..', 'lib', 'tm_arviointi_taksonomia.js'), 'utf8');
    expect(/tmNykyinenKieli|document\.|window\./.test(lib)).toBe(false);
  });
});
