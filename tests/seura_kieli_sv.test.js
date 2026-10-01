/**
 * Gemini-ruotsinnokset + seurahallinta suomeksi (1.10.2026).
 *  - sv-arvot viety tm_lang.js:ään SELLAISENAAN (tests/fixtures/sv_kaannokset_2026-10-01.json = Claude outputs -kopio).
 *    Poikkeus: vanhempi.kirj_jakoteksti ({gen} = suomen genetiivi, V1-B2 kieltää sv/en:ssä) → odotuslistalle.
 *  - Seura-sivun käyttöliittymä on aina suomeksi, myös ruotsinkielisellä seuralla; perheille menevät kortit seuran kielellä.
 */
import { describe, it, expect } from 'vitest';
import { readFileSync } from 'fs';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';
import { createRequire } from 'module';
import vm from 'vm';

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..');
const require_ = createRequire(import.meta.url);
const lue = (n) => readFileSync(join(ROOT, n), 'utf8');
const SV = require_('./fixtures/sv_kaannokset_2026-10-01.json');
const SEURA = lue('TalentMaster_Seura.html');
const pura = (t) => { const a = SEURA.indexOf(t); if (a < 0) throw new Error(t); let d = 0; for (let j = SEURA.indexOf(') {', a) + 2; j < SEURA.length; j++) { if (SEURA[j] === '{') d++; else if (SEURA[j] === '}') { d--; if (!d) return SEURA.slice(a, j + 1); } } throw new Error(t); };

/* Sivuympäristö: oikea tm_lang.js (aktiivinen kieli asetettavissa) + Seuran oikeat funktiot. */
function sivu({ seuraKieli, aktiivinenKieli }) {
  const ls = new Map(aktiivinenKieli ? [['tm_kieli', aktiivinenKieli]] : []);
  const ctx = { console: { log() {}, warn() {} }, localStorage: { getItem: (k) => (ls.has(k) ? ls.get(k) : null), setItem: (k, v) => ls.set(k, v), removeItem: (k) => ls.delete(k) },
    document: { documentElement: {} }, navigator: { language: 'fi' }, String, Object, Array, RegExp };
  ctx.window = ctx;
  vm.createContext(ctx);
  vm.runInContext(lue('lib/tm_lang.js'), ctx);
  if (aktiivinenKieli && typeof ctx.tmAsetaKieli === 'function') ctx.tmAsetaKieli(aktiivinenKieli, true);
  ctx.tila = { seuraId: 'sibbovargarna', seuraKieli };
  vm.runInContext([pura('function _tkKieli(avain, kieli, fi, muuttujat) {'), pura('function _tk(avain, fi, muuttujat) {'), pura('function _pinKortitHtml(kortit) {')].join('\n'), ctx);
  return ctx;
}

describe('Gemini-ruotsinnokset (sellaisenaan)', () => {
  global.window = {};
  require_(join(ROOT, 'lib', 'tm_lang.js'));
  const L = global.window.TM_LANG;
  delete global.window;
  const get = (o, k) => k.split('.').reduce((a, b) => (a ? a[b] : undefined), o);
  it('39 avainta viety muuttamattomina; kirj_jakoteksti EI (odotuslistalla)', () => {
    const viedyt = Object.keys(SV).filter((k) => k !== 'vanhempi.kirj_jakoteksti');
    expect(viedyt.length).toBe(39);
    for (const k of viedyt) expect(get(L.sv, k), k).toBe(SV[k]);
    expect(get(L.sv, 'vanhempi.kirj_jakoteksti')).toBeUndefined();
    const odot = require_('./tm_lang_sv_odotuslista.cjs');
    expect(odot).toContain('vanhempi.kirj_jakoteksti');
    for (const k of viedyt) expect(odot).not.toContain(k);
  });
  it('muuttujat ({nimi}, {n}, …) ovat samat kuin suomessa', () => {
    const vars = (s) => (String(s).match(/\{[a-z_]+\}/gi) || []).sort().join(',');
    for (const k of Object.keys(SV)) expect(vars(SV[k]), k).toBe(vars(get(L.fi, k)));
  });
  it('tm_lang-versio on yksi kaikilla sivuilla', () => {
    const fs = require_('fs');
    const v = new Set(fs.readdirSync(ROOT).filter((f) => f.endsWith('.html')).flatMap((f) => [...lue(f).matchAll(/lib\/tm_lang\.js\?v=(\d+)/g)].map((m) => m[1])));
    expect([...v]).toEqual(['21']);
  });
});

describe('Seura: käyttöliittymä suomeksi, kortit seuran kielellä (ajettu)', () => {
  it('ruotsinkielinen seura (ja selaimessa sv valittuna) → käyttöliittymä "Tuo pelaajat Excelistä", ei ruotsia eikä englantia', () => {
    const ctx = sivu({ seuraKieli: 'sv', aktiivinenKieli: 'sv' });
    expect(ctx.t('seura.tuo_pelaajat_excelista')).toBe(SV['seura.tuo_pelaajat_excelista']);   // ympäristö on oikeasti ruotsiksi
    expect(ctx._tk('seura.tuo_pelaajat_excelista', 'Tuo pelaajat Excelistä')).toBe('Tuo pelaajat Excelistä');
    expect(ctx._tk('seura.lataa_excel_pohja', 'Lataa Excel-pohja')).toBe('Lataa Excel-pohja');
    expect(ctx._tk('seura.excel_pohja_ladattu', '?', { n: 3 })).toBe('Excel-pohja ladattu – 3 joukkuetta Asetukset-välilehdellä');
  });
  it('saman seuran suostumuskortti on ruotsiksi (Geminin teksti), html lang="sv"', () => {
    const ctx = sivu({ seuraKieli: 'sv', aktiivinenKieli: 'fi' });
    const h = ctx._pinKortitHtml([{ tyyppi: 'suostumus', etunimi: 'Anna', joukkue: 'Sibbo T12', qr: 'QR' },
      { tyyppi: 'pelaaja', nimi: 'Bo B', joukkue: 'Sibbo T12', pin: '482915', qr: 'QR' }]);
    expect(h).toContain(SV['seura.suostumuskortti_teksti']);
    expect(h).toContain(SV['seura.suostumuskortti_ala']);
    expect(h).toContain(SV['seura.kortti_skannaa_pin']);
    expect(h).toContain('<html lang="sv">');
    expect(h).not.toContain('Näytä tämä vanhemmallesi');
  });
  it('suomenkielinen seura → kortit suomeksi; ei kieltä → suomi', () => {
    for (const k of ['fi', null]) {
      const h = sivu({ seuraKieli: k })._pinKortitHtml([{ tyyppi: 'suostumus', etunimi: 'A', joukkue: 'J', qr: 'QR' }]);
      expect(h).toContain('Näytä tämä vanhemmallesi'); expect(h).toContain('<title>Kortit</title>');
    }
  });
  it('Seura ei enää vaihda sivun kieltä seuran kielen mukaan; tila.seuraKieli säilyy (A3)', () => {
    const i = SEURA.indexOf('async function asetaAktiivinenSeura(');
    const runko = SEURA.slice(i, SEURA.indexOf('\n}\n', i));
    expect(runko).toContain('tila.seuraKieli   = data.kieli || null;');
    expect(runko).not.toMatch(/^\s*if \(typeof tmKieliInitSeura === 'function'\) tmKieliInitSeura/m);
    expect(SEURA).not.toMatch(/^\s*[^/*\s].*\btmAsetaKieli\(/m);
  });
});
