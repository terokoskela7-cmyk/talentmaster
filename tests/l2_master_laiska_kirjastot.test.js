/* L2 (docs/KYLMA_AVAUS_DIAGNOOSI.md §4): Master lataa 5 data-/laskentakirjastoa vasta tarvittaessa (lib/tm_laiska_kirjastot.js).
   Staattiset vartijat + lib-yksikkö (portit, uudelleenpiirto, epäonnistuminen). Selaintesti: l2_master_laiska_kirjastot_selain.test.js. */
import { describe, it, expect } from 'vitest';
import { readFileSync } from 'fs';
import { createRequire } from 'module';
const require = createRequire(import.meta.url);
const HTML = readFileSync(new URL('../TalentMaster_Master_v16.html', import.meta.url), 'utf8');
const LAISKAT = ['lib/tm_eerikkila_normit.js', 'lib/tm_teknistaktiset.js', 'lib/tm_kehityskaari.js', 'docs/testit_indeksit.js', 'lib/tm-microcycles.js'];

describe('L2 · Master: kirjastot text/plain, ei eager', () => {
  it('viisi kirjastoa on text/plain + data-tm-laiska (ei <script src>), alkuperäinen keskinäinen järjestys säilyy', () => {
    const pos = LAISKAT.map((s) => {
      expect(HTML, s + ' ei saa olla eager').not.toContain('<script src="' + s + '"></script>');
      expect(HTML.split('<script type="text/plain" data-tm-laiska src="' + s + '"></script>').length - 1, s).toBe(1);
      return HTML.indexOf('data-tm-laiska src="' + s + '"');
    });
    for (let i = 1; i < pos.length; i++) expect(pos[i - 1]).toBeLessThan(pos[i]);
  });
  it('loader ladataan ennen inline-skriptejä; portit kattavat setWs (ei Kotia), openDrill, vanhan pelaajaprofiilin, tapahtuman ja D3-arvion', () => {
    const m = /<script src="lib\/tm_laiska_kirjastot\.js" data-portit="([^"]+)"><\/script>/.exec(HTML);
    expect(m).toBeTruthy();
    expect(m[1].split(',')).toEqual(['setWs!koti', 'openDrill', '_mAvaaPelaajaVanha=true', 'calEventClick', '_avaaD3Arvio', '+avaaKaaviopankki', '+_kaavioUusiLomake', '+tmKaavioLiitaHavaintoon', '+tmPhAvaaValinta', 'avaaHarjoitusarviointi', 'avaaValmentajaKehitys', 'avaaCoachProfiili']);
    expect(HTML.indexOf('lib/tm_laiska_kirjastot.js')).toBeLessThan(HTML.indexOf('data-tm-laiska src='));
    m[1].split(',').forEach((p) => { const n = p.replace(/^\+/, '').replace(/[!=].*/, ''), K = HTML + readFileSync(new URL('../lib/tm_kaavio_ui.js', import.meta.url), 'utf8') + readFileSync(new URL('../lib/tm_pelihavainto_valinta.js', import.meta.url), 'utf8');
      expect(K, n).toMatch(new RegExp('\\n(?:async )?function ' + n + '\\(|window\\.' + n + ' = '));   // portti vaatii globaalin funktion (declaraatio tai window-sijoitus)
    });
  });
  it('App Check -järjestys ennallaan: tm_appcheck.js ennen laiskoja kirjastoja', () => {
    expect(HTML.indexOf('<script src="lib/tm_appcheck.js"></script>')).toBeGreaterThan(-1);
    expect(HTML.indexOf('<script src="lib/tm_appcheck.js"></script>')).toBeLessThan(HTML.indexOf('data-tm-laiska'));
  });
  it('Koti ei vaadi L2-kirjastoja: d3OdottaaKalibrointia on typeof-vartioitu samalla lausekkeella kuin kirjasto', () => {
    expect(HTML).toContain("(typeof d3OdottaaKalibrointia === 'function') ? d3OdottaaKalibrointia(p) : (p && p.d3_varmuus === 'itsearvio')");
    expect(readFileSync(new URL('../lib/tm_eerikkila_normit.js', import.meta.url), 'utf8')).toContain("return !!(p && p.d3_varmuus === 'itsearvio');");
  });
  it('tm-prescription hakee mikrosyklit käyttöhetkellä (ei vain latausvaiheessa)', () => {
    const s = readFileSync(new URL('../lib/tm-prescription.js', import.meta.url), 'utf8');
    expect(s).toContain('function mc()'); expect(s).not.toMatch(/\bif \(MC\)|MC \?/);
  });
});

function ymparisto(opts) {
  const lisatyt = [], kuuntelijat = {};
  const tagit = (opts.srcs || ['a.js', 'b.js']).map((s) => ({ getAttribute: () => s }));
  const head = { appendChild(el) { lisatyt.push(el.src); setTimeout(() => (opts.epaonnistuu && opts.epaonnistuu(el.src) ? el.onerror() : el.onload()), 0); } };
  const doc = { readyState: 'complete', head, createElement: () => ({}), querySelectorAll: () => tagit, querySelector: () => ({ getAttribute: () => opts.portit || '' }), addEventListener() {} };
  const root = { document: doc, console: { warn() {} }, addEventListener: (n, f) => { kuuntelijat[n] = f; } };
  Object.assign(root, opts.globaalit || {});
  const kopio = Object.assign({}, root); delete kopio.document; void kopio;
  const src = readFileSync(new URL('../lib/tm_laiska_kirjastot.js', import.meta.url), 'utf8');
  new Function('module', 'exports', src.replace(/\}\)\(typeof window !== 'undefined' \? window : this\);\s*$/, '})(this);')).call(root, {}, {});
  return { root, lisatyt, kuuntelijat };
}
describe('L2 · lib/tm_laiska_kirjastot.js', () => {
  it('portti: ei ladattu → lataa HTML-järjestyksessä kerran, piirtää uudelleen ja kutsuu alkuperäistä samoilla argumenteilla; ladattuna suoraan', async () => {
    const kutsut = []; let piirto = 0;
    const { root, lisatyt } = ymparisto({ portit: 'avaa=true,setWs!koti', globaalit: { avaa: (...a) => kutsut.push(a), setWs: (...a) => kutsut.push(['ws', ...a]), _paivitaKaikkiNakymat: () => { piirto++; } } });
    expect(root.tmLaiska.portit()).toEqual(['avaa', 'setWs']);
    expect(root.avaa(1, 2)).toBe(true); root.avaa(3);
    root.setWs('koti');   // Koti: ei porttia → suoraan
    expect(kutsut).toEqual([['ws', 'koti']]);
    await root.tmLaiska.varmista();
    expect(lisatyt).toEqual(['a.js', 'b.js']); expect(piirto).toBe(1); expect(root.tmLaiska.valmis()).toBe(true);
    expect(kutsut).toEqual([['ws', 'koti'], [1, 2], [3]]);
    root.setWs('dev'); expect(kutsut[3]).toEqual(['ws', 'dev']);   // ladattu → synkroninen
  });
  it('epäonnistunut lataus: toimintoa ei suoriteta, ohjetoast, seuraava yritys lataa uudelleen', async () => {
    const kutsut = [], toastit = []; let huono = true;
    const { root } = ymparisto({ portit: 'avaa', epaonnistuu: (s) => huono && s === 'b.js', globaalit: { avaa: () => kutsut.push(1), toast: (m, t) => toastit.push([m, t]) } });
    root.avaa(); await new Promise((r) => setTimeout(r, 30));
    expect(kutsut).toEqual([]); expect(toastit.length).toBe(1); expect(toastit[0][0]).toMatch(/yritä uudelleen/); expect(root.tmLaiska.valmis()).toBe(false);
    huono = false; root.avaa(); await new Promise((r) => setTimeout(r, 30));
    expect(kutsut).toEqual([1]); expect(root.tmLaiska.valmis()).toBe(true);
  });
  it('ReferenceError ennen latausta käynnistää latauksen (itseparantuva verkko)', async () => {
    const { root, kuuntelijat, lisatyt } = ymparisto({});
    kuuntelijat.error({ error: { name: 'TypeError' } }); expect(lisatyt).toEqual([]);
    kuuntelijat.error({ error: { name: 'ReferenceError', message: 'x is not defined' } }); await new Promise((r) => setTimeout(r, 30));
    expect(lisatyt).toEqual(['a.js', 'b.js']); expect(root.tmLaiska.valmis()).toBe(true);
  });
});
