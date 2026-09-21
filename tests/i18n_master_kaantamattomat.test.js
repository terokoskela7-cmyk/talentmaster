/**
 * Master sv — KATTAVUUSPORTTI: näkyvä fi-teksti ILMAN sv-käännöstä.
 *
 * MIKSI OMA PORTTI: `idp_i18n_v5_master_render_dom` on tälle SOKEA suunnittelultaan. Se ohittaa
 * literaalin jos sille ei ole sv-käännöstä (`if (!resolvesSv(ts)) continue`) — se valvoo
 * REITITYSTÄ ("onko käännös käytössä"), ei KATTAVUUTTA ("onko käännöstä olemassa").
 *
 * Aukon läpi meni neljä näkyvää tekstiä, kaikki samaa muotoa: virkkeen HÄNTÄ jätettynä
 * `masterT()`:n ulkopuolelle, esim.
 *   masterT('”ennallaan” on biologisesti odotettua') + '</b>, ei epäonnistuminen.'
 * Alkuosa kääntyi, häntä ei — sv-tilassa lause oli puoliksi suomea.
 *
 * Portti käyttää samaa poimintaa ja samoja allowlisteja kuin render-gate, mutta käänteisellä
 * ehdolla. Kolme suodatinta estävät väärät positiivit (kaikki löytyivät oikeista osumista):
 *   1. DIRECT / DIRECT_BLOBS — `masterT(...)`-argumentin sisäinen HTML on JO reititetty
 *   2. `if (_demo)` -haarat — mock-sisältöä, ei tuotannon käyttöliittymää (kuten DEMO-allowlist)
 *   3. konkatenaation yli osuvat poiminnat (`' + masterT('x') + '`) eivät ole tekstiä vaan koodia
 */
import { describe, it, expect } from 'vitest';
import { readFileSync } from 'fs';
import { createRequire } from 'module';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

const juuri = join(dirname(fileURLToPath(import.meta.url)), '..');
const require = createRequire(import.meta.url);
const HTML = readFileSync(join(juuri, 'TalentMaster_Master_v16.html'), 'utf8');
const Msv = require('../lib/tm_master_i18n.js').TM_MASTER_I18N.sv;
const Csv = require('../lib/tm_i18n_common.js').TM_I18N_COMMON.sv;

const rivit = HTML.split('\n');
const dec = (t) => t.replace(/&amp;/g, '&').replace(/&nbsp;/g, ' ');
const resolvesSv = (t) => {
  for (const K of [Msv, Csv]) for (const x of [t, dec(t)]) if (x in K && K[x] !== x) return true;
  return false;
};
/* Suomenkielisyys: ä/ö tai yleinen suomen sana → rajaa pois englannin ja tekniset merkkijonot. */
const SUOMI = /[äöÄÖ]|\b(?:ja|tai|ei|on|jos|kun|että|joka|tämä|nyt|vielä|ensin|pelaaja\w*|valmentaj\w*|joukkue\w*|tallenna|peruuta|lisää|poista|valitse|kirjoita|avaa|sulje|näytä|kaikki|uusi|viikko|päivä)\b/i;

/* Render-JS-alue = pääscript (sama ankkurointi kuin render-gatessa). */
function alue() {
  let lo = -1;
  for (let i = 1800; i < rivit.length; i++) if (/^\s*<script>\s*$/.test(rivit[i])) { lo = i + 1; break; }
  let hi = -1;
  for (let i = lo; i < rivit.length; i++) if (/^\s*<\/script>/.test(rivit[i])) { hi = i; break; }
  return { lo, hi };
}
const { lo, hi } = alue();
const region = rivit.slice(lo - 1, hi - 1).join('\n');

/* Literaalit minkä tahansa masterT(...)-kutsun arg-alueella (paren-matching, string-tietoinen). */
function rakennaDirect(src) {
  const ulos = new Set();
  let i = 0; const n = src.length;
  for (;;) {
    const j = src.indexOf('masterT(', i); if (j < 0) break;
    let k = j + 8, depth = 1, q = null; const st = k;
    while (k < n && depth > 0) {
      const c = src[k];
      if (q) { if (c === '\\') { k += 2; continue; } if (c === q) q = null; }
      else if (c === "'" || c === '"' || c === '`') q = c;
      else if (c === '(') depth++; else if (c === ')') depth--;
      k++;
    }
    const arg = src.slice(st, k - 1);
    const lre = /'((?:[^'\\]|\\.)*)'|"((?:[^"\\]|\\.)*)"/g;
    let m;
    while ((m = lre.exec(arg))) { const t = (m[1] ?? m[2]).replace(/\\'/g, "'"); ulos.add(t); ulos.add(t.trim()); }
    i = k;
  }
  return ulos;
}
const DIRECT = rakennaDirect(region);
const DIRECT_BLOBS = [...DIRECT].filter((d) => d.includes('<'));

/* Ankkuroidut allowlist-lohkot (samat kuin render-gatessa; rajat haetaan lähteestä). */
function lohko(alkuEhto, loppuEhto) {
  const a = rivit.findIndex(alkuEhto);
  let b = -1;
  for (let i = a + 1; i < rivit.length; i++) if (loppuEhto(rivit[i])) { b = i; break; }
  return [a + 1, b + 1];
}
const [dLo, dHi] = lohko((l) => l === 'const DEMO = {', (l) => l === '};');
const [kLo, kHi] = lohko((l) => l === 'const KETJU_NIMET = {', (l) => l === '};');
const sallittuAlue = (ln) => (ln >= dLo && ln <= dHi) || (ln >= kLo && ln <= kHi);

/* `if (_demo) { … }` -haara: mock-sisältöä, ei tuotannon pintaa. */
function demoHaarassa(ln) {
  let syvyys = 0;
  for (let i = ln - 1; i >= Math.max(0, ln - 300); i--) {
    const r = rivit[i];
    if (/^\s*(?:async\s+)?function\s+\w+/.test(r)) return false;
    for (const ch of r) { if (ch === '}') syvyys++; else if (ch === '{') syvyys--; }
    if (syvyys < 0 && /\bif\s*\(\s*_demo\s*\)/.test(r)) return true;
    if (syvyys < 0) syvyys = 0;
  }
  return false;
}

function etsiKaantamattomat() {
  const ulos = [];
  for (let idx = lo - 1; idx < hi - 1; idx++) {
    const ln = idx + 1, line = rivit[idx];
    if (sallittuAlue(ln)) continue;
    if (/^\s*(\/\/|\*|\/\*)/.test(line)) continue;
    for (const m of line.matchAll(/>([^<>{}`]+)</g)) {
      const ts = m[1].trim();
      if (!ts || ts.length < 3) continue;
      if (/masterT\(|\+\s*'|'\s*\+|\$\{|\breturn\b|=>/.test(ts)) continue;   // koodia, ei tekstiä
      if (resolvesSv(ts)) continue;                                          // render-gaten vastuu
      if (!SUOMI.test(ts)) continue;
      if (DIRECT.has(ts) || DIRECT.has(dec(ts))) continue;
      const pako = ts.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
      if (DIRECT_BLOBS.some((b) => new RegExp('>\\s*' + pako + '\\s*<').test(b))) continue;
      if (demoHaarassa(ln)) continue;
      ulos.push(`  ${ln}: ${JSON.stringify(ts.slice(0, 80))}`);
    }
  }
  return ulos;
}

describe('Master sv · kattavuusportti (näkyvä fi ilman käännöstä)', () => {
  it('EI VACUOUS: alue ja allowlistit löytyvät lähteestä', () => {
    expect(lo).toBeGreaterThan(1800);
    expect(hi).toBeGreaterThan(lo);
    expect(dLo).toBeGreaterThan(0);
    expect(kLo).toBeGreaterThan(0);
    expect(DIRECT.size).toBeGreaterThan(500);       // masterT-reititys on oikeasti laaja
  });

  it('render-JS-alueella 0 näkyvää fi-tekstiä ilman sv-käännöstä', () => {
    const vuodot = etsiKaantamattomat();
    expect(
      vuodot,
      'näkyvä teksti ilman sv-käännöstä → renderöityy fi sv-tilassa.\n'
        + 'Korjaus = käännös karttaan JA reititys masterT():llä (usein virkkeen häntä):\n'
        + vuodot.join('\n'),
    ).toEqual([]);
  });

  it('Gemini-erän neljä tekstiä resolvoituvat ruotsiksi (ajossa, ei lähdeluku)', () => {
    const vanha = global.tmNykyinenKieli;
    global.tmNykyinenKieli = () => 'sv';
    try {
      const { masterT } = require('../lib/tm_master_i18n.js');
      for (const fi of [
        'Ladataan joukkuetta...',
        /* i18n osa 4: markup irrotettiin avaimesta, joten lause on nyt kolme
           tekstiavainta. Invariantti sama — jokainen osa resolvoituu ruotsiksi. */
        'Ei uutta mittausta jaksolla — ',
        'subjektiivinen arvio riittää',
        ' (§29). Deltaa ei väitetä ilman mittausta.',
        ', ei epäonnistuminen.',
        'Olet arvioinut harjoittelua ',
        ' kertaa — hieno sitoutuminen oman valmennuksesi kehittämiseen. 🌱',
      ]) {
        expect(masterT(fi), `${fi.slice(0, 40)} jäi suomeksi`).not.toBe(fi);
      }
    } finally { global.tmNykyinenKieli = vanha; }
  });

  it('A2/A4 eivät luoneet sv-duplikaatteja (yksi fi → yksi sv)', () => {
    // Sama sv-arvo kahdella eri fi-avaimella on drift-riski; A2 ja A4 korjattiin
    // REITITTÄMÄLLÄ olemassa oleviin avaimiin juuri siksi.
    const arvot = Object.values(Msv);
    const kpl = {};
    arvot.forEach((v) => { kpl[v] = (kpl[v] || 0) + 1; });
    for (const sv of [
      /* Sama lause koostettuna (ks. yllä) — duplikaattivartija koskee nyt osia. */
      'Ingen ny mätning under perioden — ',
      'subjektiv bedömning räcker',
      ' (§29). Delta hävdas inte utan mätning.',
      ' gånger — fint engagemang i att utveckla din egen coaching. 🌱',
    ]) {
      expect(kpl[sv], `${sv.slice(0, 40)} esiintyy ${kpl[sv]}× — duplikaatti`).toBe(1);
    }
  });
});
