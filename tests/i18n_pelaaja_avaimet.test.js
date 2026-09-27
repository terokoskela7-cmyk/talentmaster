/**
 * TalentMaster™ — Pelaaja_v7 · i18n-avainten RESOLVI. Vartija (osa A).
 *
 * Miksi: kotinäytön fiilisrivillä luki lapselle raaka avain `pelaaja.fiilis_vasynyt`, koska avain
 * oli olemassa vain `vanhempi.*`-haarassa. Yksikään testi ei huomannut sitä: aiemmat i18n-testit
 * todistavat, että REITITETYILLÄ avaimilla on sv — eivät sitä, että avain ylipäätään resolvoituu.
 *
 * Tämä portti ajaa oikean tm_lang.js:n ja vaatii, että jokainen Pelaajan `T()`/`t()`-avain
 * palauttaa TEKSTIN eikä avainta itseään — kaikilla kolmella kielellä fi-fallbackin kautta.
 */
import { describe, it, expect } from 'vitest';
import { readFileSync } from 'fs';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';
import vm from 'vm';

const juuri = join(dirname(fileURLToPath(import.meta.url)), '..');
const HTML = readFileSync(join(juuri, 'TalentMaster_Pelaaja_v7.html'), 'utf8');

/** tm_lang.js ajossa (sama tiedosto jonka appi lataa). */
function lang() {
  const sb = { console: { log() {}, warn() {}, error() {} } };
  sb.window = sb;
  vm.createContext(sb);
  vm.runInContext(readFileSync(join(juuri, 'lib/tm_lang.js'), 'utf8'), sb);
  return sb;
}

/** _TMAP: STR-avain → tm_lang-polku. Luetaan lähteestä, ei kopioida tänne. */
function tmap() {
  const i = HTML.indexOf('var _TMAP = {');
  expect(i, '_TMAP puuttuu').toBeGreaterThan(-1);
  const loppu = HTML.indexOf('};', i);
  const runko = HTML.slice(i, loppu + 2);
  // eslint-disable-next-line no-new-func
  return new Function(runko + '\nreturn _TMAP;')();
}

/** Kaikki T('x')-kutsut lähteestä. */
function tAvaimet() {
  const out = new Set();
  const re = /\bT\('((?:[^'\\]|\\.)*)'\)/g;
  let m;
  while ((m = re.exec(HTML))) out.add(m[1].replace(/\\'/g, "'"));
  return [...out];
}

/** Kaikki t('polku')-kutsut lähteestä (literaaliavaimet). */
function tPolut() {
  const out = new Set();
  const re = /\bt\('([a-zA-Z0-9_]+\.[a-zA-Z0-9_.]+)'/g;
  let m;
  while ((m = re.exec(HTML))) out.add(m[1]);
  return [...out];
}

const M = tmap();
const T_AVAIMET = tAvaimet();
const T_POLUT = tPolut();
const polku = (k) => M[k] || ('pelaaja.' + k);

describe('Pelaaja_v7 — jokainen T()-avain resolvoituu tekstiksi', () => {
  it('EI VACUOUS: avaimia löytyy runsaasti', () => {
    expect(T_AVAIMET.length).toBeGreaterThan(15);
  });

  it('yksikään T()-avain ei palauta avainta itseään (fi)', () => {
    const sb = lang();
    sb.tmAsetaKieli('fi', false);
    const rikki = T_AVAIMET.filter((k) => {
      const p = polku(k);
      const v = sb.t(p);
      return typeof v !== 'string' || v === p || v === k || v === '';
    }).map((k) => k + ' → ' + polku(k));
    expect(rikki, 'avain ei resolvoidu fi-arvoksi').toEqual([]);
  });

  it.each(['sv', 'en'])('%s: T()-avain resolvoituu (fallback fi kelpaa, avain EI)', (kieli) => {
    const sb = lang();
    sb.tmAsetaKieli(kieli, false);
    const rikki = T_AVAIMET.filter((k) => {
      const p = polku(k);
      const v = sb.t(p);
      return typeof v !== 'string' || v === p || v === '';
    }).map((k) => k + ' → ' + polku(k));
    expect(rikki).toEqual([]);
  });

  it('EI VACUOUS: keksitty avain EI resolvoidu (portti todella tarkistaa)', () => {
    const sb = lang();
    sb.tmAsetaKieli('fi', false);
    expect(sb.t('pelaaja.ei_ole_olemassa_xyz')).toBe('pelaaja.ei_ole_olemassa_xyz');
  });
});

describe('Pelaaja_v7 — t()-polut resolvoituvat', () => {
  it('EI VACUOUS: polkuja löytyy', () => {
    expect(T_POLUT.length).toBeGreaterThan(10);
  });

  it('yksikään t()-polku ei palauta polkua itseään (fi)', () => {
    const sb = lang();
    sb.tmAsetaKieli('fi', false);
    const rikki = T_POLUT.filter((p) => {
      const v = sb.t(p);
      return typeof v !== 'string' || v === p || v === '';
    });
    expect(rikki, 'polku ei resolvoidu fi-arvoksi').toEqual([]);
  });
});

describe('A1 — fiilis_vasynyt oli vain vanhempi-haarassa (regressio)', () => {
  it.each(['fi', 'sv', 'en'])('%s: pelaaja.fiilis_vasynyt on oma arvonsa', (kieli) => {
    const sb = lang();
    sb.tmAsetaKieli(kieli, false);
    const v = sb.t('pelaaja.fiilis_vasynyt');
    expect(v).not.toBe('pelaaja.fiilis_vasynyt');
    expect(v.length).toBeGreaterThan(2);
  });

  it('arvo on sama kuin vanhempi-haarassa (kopioitu, ei keksitty)', () => {
    const sb = lang();
    ['fi', 'sv', 'en'].forEach((kieli) => {
      sb.tmAsetaKieli(kieli, false);
      expect(sb.t('pelaaja.fiilis_vasynyt')).toBe(sb.t('vanhempi.fiilis_vasynyt'));
    });
  });
});

describe('A2 — kielivalinta on tavoitettavissa puhelimella', () => {
  /* RENDERÖITY todiste: onclick rakennetaan escapatuista paloista, joten lähdettä greppaava
     väite olisi haurastunut merkkijonon muodosta. Ajetaan funktio ja luetaan tulos. */
  function asetukset(kieli) {
    const i = HTML.indexOf('function rMinaAsetukset()');
    expect(i).toBeGreaterThan(-1);
    let syv = 0, loppu = -1;
    for (let k = HTML.indexOf('{', i); k < HTML.length; k++) {
      if (HTML[k] === '{') syv++;
      else if (HTML[k] === '}') { syv--; if (syv === 0) { loppu = k + 1; break; } }
    }
    const runko = HTML.slice(i, loppu);
    const store = { T: (k) => k, tmNykyinenKieli: () => kieli };
    const ymp = new Proxy(store, {
      has: (t2, k) => (k in t2) || !(k in globalThis),
      get: (t2, k) => (k === Symbol.unscopables ? undefined : (k in t2 ? t2[k] : () => '')),
      set: (t2, k, v) => { t2[k] = v; return true; },
    });
    // eslint-disable-next-line no-new-func
    return new Function('__ymp', 'with(__ymp){' + runko + '\nreturn rMinaAsetukset();}')(ymp);
  }

  it('Asetukset renderöi kaikki kolme kieltä setLoc()-kutsuina', () => {
    const h = asetukset('fi');
    ['fi', 'sv', 'en'].forEach((l) => expect(h).toContain("setLoc('" + l + "')"));
    expect(h).toContain('Svenska');
    expect(h).toContain('Suomi');
    expect(h).toContain('English');
  });

  it('nykyinen kieli on merkitty valituksi (aria-pressed)', () => {
    expect(asetukset('sv')).toMatch(/setLoc\('sv'\)" aria-pressed="true"/);
    expect(asetukset('fi')).toMatch(/setLoc\('sv'\)" aria-pressed="false"/);
  });

  it('Asetukset ei enää lupaa kieltä "tulossa"', () => {
    const i = HTML.indexOf('function rMinaAsetukset()');
    const f = HTML.slice(i, HTML.indexOf('\n}', i));
    expect(f).not.toContain('Tulossa pian — kieli');
  });

  it('locale-bar on yhä piilossa puhelimessa → Asetusten valinta on ainoa reitti', () => {
    expect(HTML).toMatch(/@media\(max-width:420px\)\{[\s\S]*?\.scene-bar,\.locale-bar\{display:none\}/);
  });
});
