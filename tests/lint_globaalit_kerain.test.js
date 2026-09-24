/**
 * VARTIJA · no-undef-portin GLOBAALIEN KERÄIN + kaaviopiirtäjän julkaistu rajapinta.
 *
 * VIKA 1 — KERÄIN POIMI MONIDEKLARAATTORISTA VAIN ENSIMMÄISEN NIMEN. eslint.config.js keräsi
 * ajonaikaiset globaalit säännöllisillä lausekkeilla (`^(?:let|const|var)\s+NAME`), joten
 * `var XT_RIVIT = 8, XT_SARAKKEET = 12;` antoi vain XT_RIVIT:in. Portti punersi kelvollisesta koodista
 * ("'XT_SARAKKEET' is not defined") ja main jäi punaiseksi. Keräin jäsentää nyt ESLintin omalla
 * parserilla (espree) ja lukee Program.body:n määrittelyt AST:sta.
 *
 * VIKA 2 — IMPLISIITTINEN RIIPPUVUUS PIIRTÄJÄÄN. lib/tm_xt_kerros.js ja xT-prototyyppi kutsuivat
 * paljasta `kaavioPX`/`kaavioPY`-globaalia. Ne ovat olemassa selaimessa vain siksi, että
 * tm_kaavio_render.js fanauttaa TM_KAAVIO_RENDER:in kentät windowiin (`window[k] = …`) — computed member,
 * jota keräin ei näe. Kutsu siis toimi, mutta riippuvuus oli näkymätön portille ja rikkoisi hiljaa jos
 * fanautus poistetaan. Nyt käytetään JULKAISTUA rajapintaa TM_KAAVIO_RENDER.kaavioPX/kaavioPY, ja
 * varakaava vain jos piirtäjää ei ole ladattu. Sallittujen globaalien listaan EI lisätty mitään.
 *
 * HUOM vartijan tarkkuudesta: varakaava on numeerisesti IDENTTINEN piirtäjän kaavan kanssa
 * (12 + x/100*276 === PAD + x/100*(VW-2*PAD)), joten arvovertailu olisi tyhjä testi. Siksi piirtäjä
 * injektoidaan tunnistettavalla vakoojalla — testi mittaa KUMPI POLKU ajettiin, ei lukua.
 */
import { describe, it, expect } from 'vitest';
import { readFileSync } from 'fs';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';
import { createRequire } from 'module';

const juuri = join(dirname(fileURLToPath(import.meta.url)), '..');
const vaadi = createRequire(import.meta.url);
const KER = vaadi('../scripts/lint_globaalit.js');
const RENDER = vaadi('../lib/tm_kaavio_render.js');

const PROTO = readFileSync(join(juuri, 'TalentMaster_xT_Prototyyppi.html'), 'utf8');
const RUNKO = readFileSync(join(juuri, 'docs/prototyypit/xt_prototyyppi_runko.html'), 'utf8');
const KERROS = readFileSync(join(juuri, 'lib/tm_xt_kerros.js'), 'utf8');

function kerää(src) {
  const g = {};
  const ok = KER.keraaLahteesta(src, g);
  return { g: g, ok: ok, nimet: Object.keys(g).sort() };
}

/* ── Keräin ────────────────────────────────────────────────────────────────── */
describe('(1) Globaalien keräin tunnistaa moninkertaiset määrittelyt', () => {
  it('var A = 1, B = 2, C; → kaikki kolme nimeä', () => {
    const r = kerää('var A = 1, B = 2, C;');
    expect(r.ok).toBe(true);
    expect(r.nimet).toEqual(['A', 'B', 'C']);
  });

  it('const/let-monideklaraattorit myös', () => {
    expect(kerää('const X = 1, Y = 2;').nimet).toEqual(['X', 'Y']);
    expect(kerää('let P, Q = 3;').nimet).toEqual(['P', 'Q']);
  });

  it('VANHA regex-keräin menetti toisen nimen — tämä on vian juurisyy', () => {
    const g = {};
    KER.keraaRegexilla('var A = 1, B = 2;', g);
    expect(Object.keys(g)).toEqual(['A']);
    expect(g.B, 'regex-keräin näkisi B:n → testi ei mittaa juurisyytä').toBeUndefined();
  });

  it('destrukturointi: objekti, alias, taulukko, rest, oletusarvo', () => {
    expect(kerää('const { a, b: c, d = 1, ...e } = o;').nimet).toEqual(['a', 'c', 'd', 'e']);
    expect(kerää('var [f, , g] = arr;').nimet).toEqual(['f', 'g']);
  });

  it('function · async function · class top-levelillä', () => {
    expect(kerää('function f(){}\nasync function g(){}\nclass H {}').nimet).toEqual(['H', 'f', 'g']);
  });

  it('window.X = … mistä tahansa syvyydestä', () => {
    expect(kerää('function f(){ if (1) { window.Zoo = 1; } }').nimet).toContain('Zoo');
  });

  it('PORTIN TERÄVYYS: sisennetty paikallinen EI kelpaa globaaliksi', () => {
    // 'sp is not defined' -defektiluokka: paikallinen muuttuja ei ole Program.body:ssä.
    const r = kerää('function f() {\n  var sp = 1;\n  return sp;\n}');
    expect(r.nimet).toEqual(['f']);
    expect(r.g.sp, 'paikallinen muuttuja kerättiin globaaliksi → portti sokeutuisi').toBeUndefined();
  });

  it('lohkon sisäinen määrittely EI kelpaa (sarake-0-heuristiikka poimi nämä)', () => {
    const r = kerää('{\nvar lohkossa = 1;\n}');
    expect(r.g.lohkossa).toBeUndefined();
  });

  it('for-silmukan var EI kelpaa', () => {
    expect(kerää('for (var i = 0; i < 3; i++) {}').g.i).toBeUndefined();
  });

  it('jäsentymätön lähde → regex-varakeino, ok=false (portti ei ala punertamaan)', () => {
    const r = kerää('var A = 1;\nfunction ( { ) } broken');
    expect(r.ok).toBe(false);
    expect(r.nimet).toContain('A');
  });

  it('HTML: inline-lohkot kerätään, src- ja bundler-lohkot ohitetaan', () => {
    const g = {};
    /* Ohitettavissa lohkoissa on TARKOITUKSELLA kerattavaa sisaltoa — muuten testi lapaisisi
       vaikka ohitus poistettaisiin (tyhja src-lohko ja JSON eivat tuota nimia kummallakaan polulla). */
    KER.keraaHtmlista(
      '<script src="lib/x.js">var EI_SRC = 1;</script>'
      + '<script type="__bundler/manifest">var EI_BUNDLER = 1;</script>'
      + '<script type="application/json">var EI_JSON = 1;</script>'
      + '<script>var HTML_A = 1, HTML_B = 2;</script>', g,
    );
    expect(Object.keys(g).sort()).toEqual(['HTML_A', 'HTML_B']);
  });

  it('REGRESSIO: repon oma XT_SARAKKEET löytyy (tämä punersi mainin)', () => {
    const g = KER.keraaGlobaalit(juuri);
    expect(g.XT_RIVIT).toBe('readonly');
    expect(g.XT_SARAKKEET, 'monideklaraattorin toinen nimi jäi keräämättä').toBe('readonly');
    expect(g.TM_KAAVIO_RENDER).toBe('readonly');
  });
});

/* ── Kaaviopiirtäjän rajapinta ─────────────────────────────────────────────── */
describe('(2) xT-kerros käyttää piirtäjän julkaistua rajapintaa', () => {
  /* Puretaan koordinaattimuuntimet lähteestä ja ajetaan injektoidulla piirtäjällä: varakaava on
     numeerisesti identtinen oikean kanssa, joten vain vakooja kertoo kumpi polku ajettiin. */
  function muuntimet(render) {
    const i = KERROS.indexOf('function _xtkRender()');
    expect(i, '_xtkRender puuttuu lähteestä').toBeGreaterThan(-1);
    const j = KERROS.indexOf('\n/* Ruudun rajat', i);
    const src = KERROS.slice(i, j > i ? j : i + 900);
    const store = { TM_KAAVIO_RENDER: render };
    const ymp = new Proxy(store, {
      has: (t, k) => (k in t) || !(k in globalThis),
      get: (t, k) => (k === Symbol.unscopables ? undefined : t[k]),
      set: (t, k, v) => { t[k] = v; return true; },
    });
    // eslint-disable-next-line no-new-func
    return new Function('__ymp', 'with(__ymp){' + src + '\nreturn { px: _xtkPX, py: _xtkPY };}')(ymp);
  }

  it('piirtäjä ladattu → kerros käyttää JAETTUA kaavaa (ei varakaavaa)', () => {
    const kutsut = [];
    const vakooja = { kaavioPX: (x) => { kutsut.push('px'); return 1000 + x; }, kaavioPY: (y) => { kutsut.push('py'); return 2000 + y; } };
    const m = muuntimet(vakooja);
    expect(m.px(50), 'kerros ohitti piirtäjän ja käytti varakaavaa').toBe(1050);
    expect(m.py(50)).toBe(2050);
    expect(kutsut).toEqual(['px', 'py']);
  });

  it('piirtäjää ei ladattu → varakaava', () => {
    const m = muuntimet(undefined);
    expect(m.px(50)).toBe(12 + 0.5 * 276);
    expect(m.py(50)).toBe(12 + 0.5 * 426);
  });

  it('oikea piirtäjä tuottaa saman tuloksen kuin varakaava (siksi arvovertailu ei riitä testiksi)', () => {
    const m = muuntimet(RENDER);
    expect(m.px(50)).toBe(RENDER.kaavioPX(50));
    expect(m.px(50)).toBe(12 + 0.5 * 276);
  });

  it('kerros ei kutsu paljasta kaavioPX/kaavioPY-globaalia', () => {
    const ilmanRajapintaa = KERROS.split('TM_KAAVIO_RENDER.kaavioPX').join('').split('TM_KAAVIO_RENDER.kaavioPY').join('')
      .split('R.kaavioPX').join('').split('R.kaavioPY').join('');
    expect(ilmanRajapintaa, 'paljas globaalikutsu jäi kerrokseen').not.toMatch(/(^|[^.\w])kaavioP[XY]\s*\(/);
  });

  it.each([['juuren prototyyppi', PROTO], ['docs-runko', RUNKO]])('%s: ei vartioimatonta kaavioPX(-kutsua', (_n, src) => {
    const jaljella = src.split('TM_KAAVIO_RENDER.kaavioPX').join('').split('TM_KAAVIO_RENDER.kaavioPY').join('');
    expect(jaljella).not.toMatch(/(^|[^.\w])kaavioP[XY]\s*\(/);
    expect(src, 'prototyyppi ei käytä julkaistua rajapintaa').toContain('TM_KAAVIO_RENDER.kaavioPX(');
  });

  it('sallittujen globaalien listaan ei lisätty kaavioPX/kaavioPY:tä', () => {
    const cfg = readFileSync(join(juuri, 'eslint.config.js'), 'utf8');
    const i = cfg.indexOf('const APP_GLOBALS');
    const lista = cfg.slice(i, cfg.indexOf('\n};', i));
    expect(lista).not.toContain('kaavioPX');
    expect(lista).not.toContain('kaavioPY');
  });
});
