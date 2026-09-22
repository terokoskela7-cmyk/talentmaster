/**
 * INLINE-HANDLER-PARSE-PORTTI — jokaisen on*="…"-attribuutin on oltava ajokelpoista JS:ää.
 *
 * JUURISYY (#605, 2026-09-21): i18n-markup-codemod veti markupin ulos vpT():stä ja escapetti
 * attribuuttihännät YHDEN TASON LIIKAA:
 *
 *     ennen:   … + pid + vpT('\',\'aktiivinen\')">…')   -> onclick="f('123','aktiivinen')"    OK
 *     jälkeen: … + pid + '\\\',\\\'aktiivinen\\\')">'   -> onclick="f('123\',\'aktiivinen\')" SyntaxError
 *
 * Selain kääntää inline-handlerin vasta klikattaessa, joten rikkinäinen handler EI näy
 * konsolissa latauksessa eikä kaada mitään: nappi vain lakkaa toimimasta HILJAA.
 * Näin 16 VP:n nappia — mm. _vpTallennaTavoite, _vpElinkaari('saavutettu'), _vpTallennaReview,
 * _vpJatkuuVahvista, _vpTtAsetaPositio — oli kuolleena tuotannossa. Yksikään olemassa oleva
 * testi ei nähnyt sitä: ne lukevat lähdetekstiä, eivät syntyvää attribuuttia.
 *
 * MITEN PORTTI TOIMII: dekoodaa rivin JS-merkkijonoliteraalit (EI suorita mitään), korvaa
 * konkatenaatioaukot paikkamerkillä ja ajaa syntyneelle handlerille new Function.
 * Luokittelu on tahallinen:
 *   A = ei parsiudu JA sisältää kenoviiva-escapen -> #605-luokan regressio, KAATAA portin.
 *   B = ei parsiudu ilman kenoviivaa             -> dekooderin artefakti (ternääri tms.);
 *       tunnetut listattu alla, TUNTEMATON KAATAA portin (ettei uusi vika piiloudu tänne).
 *
 * HUOM: kaksoisescape ei ole aina väärin — sisäkkäinen merkkijonon rakennus voi vaatia sen.
 * Siksi portti ei kiellä lähdemerkkijonoa vaan vaatii että handler PARSIUTUU.
 *
 * §7.1: ei template-literaaleja tässä tiedostossa (konkatenaatio) — myös backtick-merkki
 * viitataan vakiolla BT, jotta invarianttikoukun parillisuustarkistus pysyy tyytyväisenä.
 */
import { describe, it, expect } from 'vitest';
import { readFileSync, readdirSync } from 'fs';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

const juuri = join(dirname(fileURLToPath(import.meta.url)), '..');
const PAIKKA = 'X';
const BT = String.fromCharCode(96);   // backtick

/** Dekoodaa rivin tuottama merkkijono: literaalit puretaan, aukot -> PAIKKA. */
function dekoodaa(rivi) {
  let ulos = '', i = 0, nahty = false;
  const n = rivi.length;
  const ESC = { "'": "'", '"': '"', '\\': '\\', n: '\n', t: '\t' };
  ESC[BT] = BT;
  const onRaja = (c) => (c === "'" || c === '"' || c === BT);
  while (i < n) {
    const c = rivi[i];
    if (onRaja(c)) {
      const raja = c; i++;
      let lit = '';
      while (i < n) {
        const d = rivi[i];
        if (d === '\\') {
          const e = rivi[i + 1];
          lit += (e in ESC) ? ESC[e] : (e === undefined ? '\\' : e);
          i += 2; continue;
        }
        if (d === raja) { i++; break; }
        if (raja === BT && d === '$' && rivi[i + 1] === '{') {
          let syv = 0;
          while (i < n) { if (rivi[i] === '{') syv++; else if (rivi[i] === '}') { syv--; if (!syv) { i++; break; } } i++; }
          lit += PAIKKA; continue;
        }
        lit += d; i++;
      }
      ulos += lit; nahty = true; continue;
    }
    const alku = i;
    let edellinen = '';
    while (i < n && !onRaja(rivi[i])) {
      // ohita regex-literaalit: / sekoittaisi tokenisoinnin
      if (rivi[i] === '/' && /[(,=:!&|?{;+[]|^$/.test(edellinen)) {
        let j = i + 1, esc = false, luokka = false, loytyi = false;
        for (; j < n; j++) {
          const d = rivi[j];
          if (esc) { esc = false; continue; }
          if (d === '\\') { esc = true; continue; }
          if (d === '[') luokka = true;
          else if (d === ']') luokka = false;
          else if (d === '/' && !luokka) { loytyi = true; break; }
        }
        if (loytyi) { i = j + 1; while (i < n && /[gimsuy]/.test(rivi[i])) i++; edellinen = '/'; continue; }
      }
      if (!/\s/.test(rivi[i])) edellinen = rivi[i];
      i++;
    }
    if (nahty && /\+/.test(rivi.slice(alku, i))) ulos += PAIKKA;
  }
  return ulos;
}

const TAPAHTUMA = /\son(click|change|input|submit|keyup|keydown|focus|blur|mouseover)="/gi;

function skannaa(suhteellinen) {
  const rivit = readFileSync(join(juuri, suhteellinen), 'utf8').split('\n');
  const A = [], B = [];
  let arvioitu = 0;
  rivit.forEach((rivi, idx) => {
    if (!/\son\w+="/i.test(rivi)) return;
    const dek = dekoodaa(rivi);
    TAPAHTUMA.lastIndex = 0;
    let m;
    while ((m = TAPAHTUMA.exec(dek))) {
      const a = m.index + m[0].length;
      const b = dek.indexOf('"', a);
      if (b < 0) break;                       // attribuutti jatkuu toiselle riville
      const koodi = dek.slice(a, b);
      if (!koodi.trim()) continue;
      arvioitu++;
      try { new Function(koodi); }            // eslint-disable-line no-new-func
      catch (e) {
        (/\\'|\\"/.test(koodi) ? A : B).push({ tiedosto: suhteellinen, rivi: idx + 1, koodi: koodi });
      }
    }
  });
  return { arvioitu: arvioitu, A: A, B: B };
}

/** Tunnetut dekooderin artefaktit (EI tuotantovikoja — tarkistettu käsin rivi riviltä).
 *  Jos refaktoroit näitä rivejä ja portti punertuu: katso rivi ja päivitä lista. */
const TUNNETUT_ARTEFAKTIT = [
  "_vpBrandiPalauteTallenna('X'X)",              // kaksi literaalia peräkkäin, aukossa vain +
  "document.getElementById('_vpBrandiModal'X)",  // vpT() kääri markup-fragmentin
  "_vpSuljeJakso('X')_reviewCockpitAvaa",        // ternääri: molemmat haarat konkatenoituvat dekoodissa
  "_jaSuodata(X'X'nullX)",                       // ternääri
];

const APIT = readdirSync(juuri).filter((f) => /^TalentMaster_.*\.html$/.test(f)).sort();

function viesti(lista) {
  return lista.map((x) => x.tiedosto + ':' + x.rivi + '  ' + x.koodi.slice(0, 110)).join('\n');
}

describe('Inline-handler-parse-portti (#605-luokka)', () => {
  it('EI VACUOUS: dekooderi + parse nappaa tunnetun #605-muodon, ei ehjää', () => {
    // Täsmälleen se muoto jonka codemod tuotti (testitekstissä escapattu kahdesti).
    const rikki = "h += '<button onclick=\"f(\\'' + pid + '\\\\\\')\">x</button>';";
    const ehja = "h += '<button onclick=\"f(\\'' + pid + '\\')\">x</button>';";
    const koodiRikki = dekoodaa(rikki).match(/onclick="([^"]*)"/)[1];
    const koodiEhja = dekoodaa(ehja).match(/onclick="([^"]*)"/)[1];
    expect(koodiRikki).toContain("\\'");
    expect(() => new Function(koodiRikki)).toThrow();     // eslint-disable-line no-new-func
    expect(() => new Function(koodiEhja)).not.toThrow();  // eslint-disable-line no-new-func
  });

  it('portti näkee oikeasti handlereita (kattavuus ei ole nolla)', () => {
    const yht = APIT.reduce((s, f) => s + skannaa(f).arvioitu, 0);
    expect(yht, 'yksikään handler ei päätynyt arvioitavaksi -> portti olisi tyhjä').toBeGreaterThan(300);
  });

  it.each(APIT)('%s — jokainen inline-handler parsiutuu', (tiedosto) => {
    const r = skannaa(tiedosto);
    // A: kenoviiva-escape joka rikkoo parsinnan = #605-luokan regressio.
    expect(r.A.length, 'Inline-handler ei parsiudu (kaksoisescape?) — nappi on KUOLLUT:\n' + viesti(r.A)).toBe(0);
    // B: muu parse-fail. Sallitaan vain tunnetut dekooderin artefaktit.
    const tuntemattomat = r.B.filter((x) => !TUNNETUT_ARTEFAKTIT.some((t) => x.koodi.includes(t)));
    expect(
      tuntemattomat.length,
      'Uusi parsiutumaton handler (tai dekooderi kaipaa päivitystä):\n' + viesti(tuntemattomat),
    ).toBe(0);
  });
});
