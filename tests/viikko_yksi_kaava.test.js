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

/* ── D140 jatko: jokainen sivu, joka lataa viikkoa käyttävän kirjaston, lataa lib/tm_viikko.js:n ENNEN sitä; puuttuva TM_VIIKKO = KOVA virhe (ei paluuta vanhaan kaavaan) ── */
describe('vartija: sivut lataavat tm_viikko.js:n ennen viikkoa käyttäviä kirjastoja', () => {
  // Riippuvat kirjastot JOHDETAAN lähteistä: jokainen lib, jonka lähde viittaa tm_viikko.js:ään (ei kovakoodattua listaa → uusi riippuvuus punaistaa sivut automaattisesti)
  const riippuvat = [].concat(readdirSync(join(juuri, 'lib')).filter((f) => /\.js$/.test(f) && f !== 'tm_viikko.js').map((f) => 'lib/' + f), ['harjoitelogiikka_v4.js'])
    .filter((f) => readFileSync(join(juuri, f), 'utf8').indexOf('tm_viikko.js') >= 0);
  const sivut = readdirSync(juuri).filter((f) => /\.html$/.test(f));   // juuren sivut; archive/ ei ole juuressa → pois
  const skriptit = (html) => [...html.matchAll(/<script\b[^>]*\bsrc="([^"]+)"/g)].map((m) => m[1].split('?')[0]);
  const rikkomukset = (html) => {
    const s = skriptit(html), ensin = s.findIndex((x) => riippuvat.indexOf(x) >= 0 || riippuvat.some((r) => x.replace(/^\.\//, '') === r));
    if (ensin < 0) return null;   // ei lataa riippuvia
    const v = s.indexOf('lib/tm_viikko.js');
    return v < 0 ? 'ei lataa lib/tm_viikko.js:ää' : v > ensin ? 'lataa tm_viikko.js:n vasta riippuvan kirjaston (' + s[ensin] + ') jälkeen' : null;
  };
  it('riippuvien kirjastojen lista on elävä ja kattaa vähintään nämä seitsemän', () => {
    ['harjoitelogiikka_v4.js', 'lib/tm-methodology.js', 'lib/tm-microcycles.js', 'lib/tm_eerikkila_normit.js', 'lib/tm_kayttoaste.js', 'lib/tm_seuran_pulssi.js', 'lib/tm_vp_tilanne.js'].forEach((f) => expect(riippuvat, f).toContain(f));
  });
  it('jokainen juuren HTML-sivu joka lataa riippuvan kirjaston, lataa myös tm_viikko.js:n ja tekee sen ENSIN', () => {
    const viat = []; let kayttajia = 0;
    sivut.forEach((f) => { const r = rikkomukset(readFileSync(join(juuri, f), 'utf8')); if (r !== null || /<script\b[^>]*\bsrc="lib\/tm_viikko\.js/.test(readFileSync(join(juuri, f), 'utf8'))) kayttajia++; if (r) viat.push(f + ': ' + r); });
    expect(viat).toEqual([]); expect(kayttajia).toBeGreaterThanOrEqual(9);   // Admin, Excel_Tuonti, Master, Pelaaja, Seura, Solo_Koti, Testaus_v9, Testituonti_Master, VP
  });
  it('mutaatiotodistus: sivu ilman tm_viikko.js:ää tai sen jälkeen jää kiinni', () => {
    expect(rikkomukset('<script src="lib/tm_eerikkila_normit.js?v=1"></script>')).toContain('ei lataa');
    expect(rikkomukset('<script src="lib/tm_eerikkila_normit.js?v=1"></script><script src="lib/tm_viikko.js?v=1"></script>')).toContain('vasta riippuvan');
    expect(rikkomukset('<script src="lib/tm_viikko.js?v=1"></script><script src="lib/tm_eerikkila_normit.js?v=1"></script>')).toBeNull();
    expect(rikkomukset('<script src="lib/tm_pvm.js"></script>')).toBeNull();
  });
  it('SW:n piirissä oleva sivu (Pelaaja_v7): tm_viikko.js allowlistissa ja välimuistiversio nostettu', () => {
    const sw = readFileSync(join(juuri, 'sw_pelaaja.js'), 'utf8'); expect(sw).toContain("/lib/tm_viikko.js"); expect(sw).toMatch(/const CACHE = 'tm-pelaaja-v(9\d|\d{3})'/);
  });
});

describe('puuttuva TM_VIIKKO = kova virhe, ei hiljaista väärää viikkoa', () => {
  const vm = require('vm'), lue = (f) => readFileSync(join(juuri, f), 'utf8');
  const ymp = (...tiedostot) => { const ctx = { console, Math, Date, JSON, Intl, Object, Array, String, Number, Promise, isNaN, parseInt }; ctx.window = ctx; vm.createContext(ctx); tiedostot.forEach((f) => vm.runInContext(lue(f), ctx, { filename: f })); return ctx; };
  const VIESTI = /TM_VIIKKO puuttuu: lataa lib\/tm_viikko\.js/;
  it('tm-methodology / harjoitelogiikka_v4 / tm_eerikkila_normit / tm_kayttoaste / tm_seuran_pulssi / tm_vp_tilanne heittävät selkeän virheen', () => {
    expect(() => ymp('lib/tm-methodology.js').TM.metodologia._viikonNumero(new Date(2026, 9, 9))).toThrow(VIESTI);
    expect(() => ymp('harjoitelogiikka_v4.js')._laskeViikonNro()).toThrow(VIESTI);
    expect(() => ymp('lib/tm_phv_tila.js', 'lib/tm_eerikkila_normit.js')._haIsoViikko('2026-10-09')).toThrow(VIESTI);
    expect(() => ymp('lib/tm_kayttoaste.js').TM_KAYTTOASTE.tmIsoViikko(Date.UTC(2026, 9, 9))).toThrow(VIESTI);
    expect(() => ymp('lib/tm_seuran_pulssi.js').TM_SEURAN_PULSSI.viikkoLisaa('2026-W41', 1)).toThrow(VIESTI);
    expect(() => ymp('lib/tm_vp_tilanne.js').TM_VP_TILANNE.viikkoNro(100)).toThrow(VIESTI);
  });
  it('tm-microcycles: kutsuu samaa tarkistavaa apuria (lähdetarkistus) eikä sisällä omaa kaavaa', () => {
    const s = lue('lib/tm-microcycles.js'); expect(s).toContain('_tmViikko().tmIsoViikkoNro'); expect(s).toMatch(VIESTI);
  });
  it('kun TM_VIIKKO on ladattu, samat kutsut toimivat (kontrolli: virhe johtuu puuttuvasta libistä, ei rikkinäisestä kutsusta)', () => {
    const c = ymp('lib/tm_viikko.js', 'lib/tm-methodology.js'); expect(c.TM.metodologia._viikonNumero(new Date(2026, 9, 9))).toBe(41);
    expect(ymp('lib/tm_viikko.js', 'lib/tm_seuran_pulssi.js').TM_SEURAN_PULSSI.viikkoLisaa('2026-W53', 1)).toBe('2027-W01');
  });
});
