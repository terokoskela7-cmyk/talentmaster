/**
 * Audit 27 §3 P0 / D140 — YKSI ISO 8601 -viikkokaava (lib/tm_viikko.js). Vartija: sovelluksissa ja libeissä ei omia viikkokaavoja.
 * Juurisyy: Master "Viikko 42", Kalenteri "Viikko 40", oikea ISO-viikko 41 (kaksi omaa kaavaa, kumpikaan ei ISO 8601).
 */
import { describe, it, expect } from 'vitest';
import { readFileSync, readdirSync } from 'fs';
import { createRequire } from 'module';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';
const require = createRequire(import.meta.url);
const V = require('../lib/tm_viikko.js');
const juuri = join(dirname(fileURLToPath(import.meta.url)), '..');

const OIKEA = [   // [vuosi, kk, pv, ISO-tunniste] — vuodenvaihteet ja tunnetut ISO-rajatapaukset
  [2026, 10, 9, '2026-W41'], [2026, 10, 11, '2026-W41'], [2026, 10, 12, '2026-W42'], [2026, 12, 28, '2026-W53'], [2027, 1, 3, '2026-W53'], [2027, 1, 4, '2027-W01'],
  [2024, 12, 30, '2025-W01'], [2025, 12, 29, '2026-W01'], [2021, 1, 1, '2020-W53'], [2021, 1, 3, '2020-W53'], [2021, 1, 4, '2021-W01'], [2026, 1, 1, '2026-W01'], [2020, 12, 31, '2020-W53'], [2015, 12, 31, '2015-W53'],
];
describe('tm_viikko.js — ISO 8601', () => {
  it.each(OIKEA)('%i-%i-%i → %s', (y, m, d, odotus) => { expect(V.tmIsoViikkoYMD(y, m, d).tunniste).toBe(odotus); });
  it('Date (paikallinen päivä) ja ms (UTC-päivä) antavat saman viikon keskipäivällä', () => {
    OIKEA.forEach(([y, m, d, o]) => { expect(V.tmIsoViikkoPaiva(new Date(y, m - 1, d, 12)).tunniste).toBe(o); expect(V.tmIsoViikkoMs(Date.UTC(y, m - 1, d, 12)).tunniste).toBe(o); expect(V.tmIsoViikkoNro(new Date(y, m - 1, d, 12))).toBe(+o.slice(-2)); });
  });
  it('maanantai on aina viikon alku: 7 peräkkäistä päivää ma–su = sama viikko', () => {
    for (let a = 0; a < 400; a += 7) { const ma = new Date(Date.UTC(2025, 0, 6 + a)), n = V.tmIsoViikkoMs(ma.getTime()).tunniste; for (let i = 1; i < 7; i++) expect(V.tmIsoViikkoMs(ma.getTime() + i * 86400000).tunniste).toBe(n); }
  });
  it('vertailu riippumattomaan toteutukseen (ISO: viikon torstain vuosi + (torstain päivä − 1.1.) / 7) koko vuosille 2020–2030', () => {
    for (let t = Date.UTC(2020, 0, 1); t < Date.UTC(2030, 0, 1); t += 86400000) {
      const d = new Date(t), pv = d.getUTCDay() || 7, th = new Date(t + (4 - pv) * 86400000), y = th.getUTCFullYear(), w = Math.floor((th - Date.UTC(y, 0, 1)) / 86400000 / 7) + 1;
      expect(V.tmIsoViikkoMs(t).tunniste).toBe(y + '-W' + String(w).padStart(2, '0'));
    }
  });
  it('viikon maanantai', () => { expect(V.tmIsoViikonMaanantaiYMD(2026, 10, 9)).toEqual({ y: 2026, m: 10, d: 5 }); expect(V.tmIsoViikonMaanantaiYMD(2027, 1, 3)).toEqual({ y: 2026, m: 12, d: 28 }); });
  it('kolmella aikavyöhykkeellä sama viikko samalle kalenteripäivälle (Helsinki · UTC · Los Angeles): ajetaan TZ-ympäristömuuttujilla erikseen testisarjassa', () => {
    // Aritmetiikka on kalenteripäivä-pohjaista (ei ms − offset), joten TZ ei vaikuta; tämä testi ajetaan myös TZ=UTC- ja TZ=Pacific/Auckland -ajoissa (ks. npm-skriptit / PR-kuvaus).
    expect(V.tmIsoViikkoPaiva(new Date(2026, 9, 9, 0, 30)).tunniste).toBe('2026-W41'); expect(V.tmIsoViikkoPaiva(new Date(2026, 9, 9, 23, 30)).tunniste).toBe('2026-W41');
    expect(V.tmIsoViikkoPaiva(new Date(2026, 11, 28, 0, 5)).tunniste).toBe('2026-W53'); expect(V.tmIsoViikkoPaiva(new Date(2027, 0, 4, 23, 55)).tunniste).toBe('2027-W01');
  });
});

describe('vartija: ei omia viikkokaavoja sovelluksissa eikä libeissä', () => {
  const tiedostot = [].concat(readdirSync(juuri).filter((f) => /^TalentMaster_.*\.html$/.test(f)), ['harjoitelogiikka_v4.js'], readdirSync(join(juuri, 'lib')).filter((f) => /\.js$/.test(f)).map((f) => 'lib/' + f));
  const SALLITTU = new Set(['lib/tm_viikko.js']);
  // Viikkokaavan tunnusmerkit: vuoden alun ankkuri (onejan / jan4 / startOfYear / yearStart) tai päivien jako seitsemällä viikon numeroksi
  const KAAVAT = [/\bonejan\b/, /\bjan4\b/, /\bstartOfYear\b/, /\byearStart\b/, /getDay\(\)\s*\+\s*1\)\s*\/\s*7/, /Math\.(?:ceil|floor)\([^;\n]*\/\s*7\)\s*(?:\+\s*1)?[^;\n]*(?:vk|viikko|week)/i, /\/\s*604800000/];
  it('kaavat löytyvät vain lib/tm_viikko.js:stä', () => {
    const rikkojat = [];
    tiedostot.filter((f) => !SALLITTU.has(f)).forEach((f) => {
      const rivit = readFileSync(join(juuri, f), 'utf8').split('\n');
      rivit.forEach((r, i) => { if (/^\s*(\/\/|\*|\/\*)/.test(r)) return; KAAVAT.forEach((k) => { if (k.test(r)) rikkojat.push(f + ':' + (i + 1) + ' ' + r.trim().slice(0, 90)); }); });
    });
    expect(rikkojat, 'oma viikkokaava → käytä TM_VIIKKO.tmIsoViikkoNro / tmIsoViikkoYMD').toEqual([]);
  });
  it('vartija ei ole vakuuttava ilman mutaatiotodistusta: vanha Masterin kaava jää kiinni', () => {
    const vanha = 'const startOfYear = new Date(d.getFullYear(),0,1); return Math.ceil(((d - startOfYear) / 86400000 + startOfYear.getDay() + 1) / 7);';
    expect([/\bstartOfYear\b/, /getDay\(\)\s*\+\s*1\)\s*\/\s*7/].every((k) => k.test(vanha))).toBe(true);
  });
  it('Master, VP ja Pelaaja lataavat tm_viikko.js ennen käyttöä', () => {
    ['TalentMaster_Master_v16.html', 'TalentMaster_VP_v25.html', 'TalentMaster_Pelaaja_v7.html'].forEach((f) => { const s = readFileSync(join(juuri, f), 'utf8'); expect(s, f).toContain('<script src="lib/tm_viikko.js?v=1">'); expect(s.indexOf('lib/tm_viikko.js'), f).toBeLessThan(s.indexOf('<script>', s.indexOf('lib/tm_viikko.js'))); });
  });
  it('Masterin otsikko ja kalenteri kutsuvat samaa funktiota', () => {
    const m = readFileSync(join(juuri, 'TalentMaster_Master_v16.html'), 'utf8'); expect((m.match(/TM_VIIKKO\.tmIsoViikkoNro/g) || []).length).toBeGreaterThanOrEqual(2);
  });
});
