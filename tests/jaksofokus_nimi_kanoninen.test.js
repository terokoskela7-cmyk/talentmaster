/**
 * TalentMaster™ — §32: jaksofokus.konsepti_nimi kirjoitetaan KANONISENA SUOMENA.
 *
 * "Firestoreen tallennettu teksti pysyy suomeksi; käännetään VAIN renderissä."
 *
 * VP:n näyttöpolku (_ttKonsepti / _ttItems / _vpSiltaKonsepti) soveltaa sv-kerroksen. Se on
 * oikein näytölle — mutta sen tulos päätyi TALLENNETTAVAAN kenttään, jolloin ruotsinkielisen
 * VP:n asettama jaksofokus kirjoitti ruotsinkielisen nimen Firestoreen. Kenttä on pelaajapinnan
 * luettava (kaavio-otsikko, jaksofokus-kortti) → suomenkielinen lapsi näki ruotsia.
 *
 *   A) KIRJOITUSPOLKU — _vpJfKanonNimi palauttaa suomen kielestä riippumatta (RUNTIME)
 *   B) KIRJOITUSKOHDAT — jokainen TALLENNETTAVA konsepti_nimi tulee kirjoituspolusta
 *   C) RENDER ENNALLAAN — näyttö kääntää yhä; korjaus ei saa muuttaa näkymää
 *   D) SWEEP — jokainen konsepti_nimi-kirjoitus on luokiteltu (kanon · käyttäjän teksti · läpivienti)
 */
import { describe, it, expect } from 'vitest';
import { readFileSync } from 'fs';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';
import vm from 'vm';

const __dir = dirname(fileURLToPath(import.meta.url));
const ROOT = join(__dir, '..');
const VP = readFileSync(join(ROOT, 'TalentMaster_VP_v25.html'), 'utf8');
const RIVIT = VP.split('\n');

const pala = (pred) => {
  const a = RIVIT.findIndex(pred);
  if (a < 0) throw new Error('ankkuria ei löytynyt');
  for (let i = a + 1; i < RIVIT.length; i++) if (RIVIT[i] === '}') return RIVIT.slice(a, i + 1).join('\n');
  throw new Error('sulkua ei löytynyt');
};

// ── Runtime: VP:n OMA apuri aitojen libien kanssa, molemmilla kielillä ──
function ctxKielella(kieli) {
  const shim = { window: {}, console };
  vm.createContext(shim);
  vm.runInContext(readFileSync(join(ROOT, 'lib', 'tm_teknistaktiset.js'), 'utf8'), shim);
  vm.runInContext(readFileSync(join(ROOT, 'lib', 'tm_teknistaktiset_sv.js'), 'utf8'), shim);
  vm.runInContext(readFileSync(join(ROOT, 'lib', 'tm_konsepti_resolve.js'), 'utf8'), shim);
  vm.runInContext(readFileSync(join(ROOT, 'lib', 'tm_fyysteemat.js'), 'utf8'), shim);
  vm.runInContext(readFileSync(join(ROOT, 'lib', 'tm_jaksofokus.js'), 'utf8'), shim);

  const src = [
    pala((l) => l.startsWith('function _vpJfKanonNimi(')),
    pala((l) => l.startsWith('function _ttKonsepti(')),
    pala((l) => l.startsWith('function _ttResolvoi(')),
    pala((l) => l.startsWith('function _ttSv(')),
    RIVIT.find((l) => l.startsWith('function _ttKopio(')),
    RIVIT.find((l) => l.startsWith('function _ttSvKartta(')),
    RIVIT.find((l) => l.startsWith('function _ttSvPaalla(')),
    RIVIT.find((l) => l.startsWith('var _TT_TEKSTIKENTAT ='))
  ].join('\n');

  const base = {
    console, Math, JSON, String, Number, Object, Array, Boolean,
    _ttSeuraId: () => 'testiseura', _vpTaksLang: () => kieli
  };
  ['TM_TT_YOUTH', 'TM_TT_JOUKKUE', 'TM_TT_FUNDAMENTIT', 'TM_TT_SV'].forEach((k) => { base[k] = shim[k]; });
  Object.keys(shim).filter((k) => /^(tmKonsepti|TM_K_)/.test(k)).forEach((k) => { base[k] = shim[k]; });
  base.window = {
    TM_FYYSTEEMAT_LIB: shim.window.TM_FYYSTEEMAT_LIB || shim.TM_FYYSTEEMAT_LIB,
    TM_JAKSOFOKUS: shim.window.TM_JAKSOFOKUS || shim.TM_JAKSOFOKUS
  };
  const sandbox = new Proxy(base, {
    has: () => true,
    get(t, k) { if (k === Symbol.unscopables) return undefined; if (k in t) return t[k]; if (k === 'window') return base.window; return undefined; },
    set(t, k, v) { t[k] = v; return true; }
  });
  const ctx = vm.createContext(sandbox);
  vm.runInContext(src, ctx);
  return { ctx, aseta: (kartta) => base.tmKonseptiAsetaKerros('testiseura', kartta) };
}
const kanon = (c, avain, dom) => vm.runInContext('_vpJfKanonNimi(' + JSON.stringify(avain) + ',' + JSON.stringify(dom || null) + ')', c.ctx);
const naytto = (c, avain) => vm.runInContext("(_ttKonsepti({ avain: " + JSON.stringify(avain) + " }) || {}).nimi", c.ctx);

describe('A — kirjoituspolku palauttaa suomen kielestä riippumatta', () => {
  it('EI-VACUOUS: näyttöpolku TODELLA kääntää sv-tilassa (muuten portti olisi tyhjä)', () => {
    const fi = ctxKielella('fi'), sv = ctxKielella('sv');
    fi.aseta({}); sv.aseta({});
    expect(naytto(fi, 'y_h0')).toBe('HAVAINNOINTI');
    expect(naytto(sv, 'y_h0')).not.toBe('HAVAINNOINTI');   // sv-kerros on päällä
  });
  it('teknis-taktinen: sama suomi fi- ja sv-tilassa', () => {
    const fi = ctxKielella('fi'), sv = ctxKielella('sv');
    fi.aseta({}); sv.aseta({});
    expect(kanon(fi, 'y_h0', 'teknis_taktinen')).toBe('HAVAINNOINTI');
    expect(kanon(sv, 'y_h0', 'teknis_taktinen')).toBe('HAVAINNOINTI');
  });
  it('seuraoverride: tallentuu SEURAN suomi, ei kaanon eikä sv', () => {
    const sv = ctxKielella('sv');
    sv.aseta({ y_h0: { nimi: 'PÄÄN NOSTO', lahde: 'seura' } });
    expect(kanon(sv, 'y_h0', 'teknis_taktinen')).toBe('PÄÄN NOSTO');
  });
  it('fyysinen: lib-nimi on suomi (sv asuu erillisessä nimi_sv-kentässä)', () => {
    const sv = ctxKielella('sv'); sv.aseta({});
    expect(kanon(sv, 'fy_nopeus', 'fyysinen')).toBe('Nopeus');
  });
  it('psyykkinen/sosiaalinen: jaksofokus-lib on suomi-only', () => {
    const sv = ctxKielella('sv'); sv.aseta({});
    const n = kanon(sv, 'ps_keskittyminen', 'psyykkinen');
    expect(typeof n).toBe('string');
    expect(n.length).toBeGreaterThan(0);
  });
  it('tuntematon avain → fallback avaimeen, ei tyhjä nimi', () => {
    const fi = ctxKielella('fi'); fi.aseta({});
    expect(kanon(fi, 'ei_ole_olemassa', 'teknis_taktinen')).toBe('ei_ole_olemassa');
    expect(kanon(fi, '', 'teknis_taktinen')).toBe('');
  });
});

describe('B — jokainen TALLENNETTAVA konsepti_nimi tulee kirjoituspolusta', () => {
  // Ikkuna ankkurin MOLEMMIN PUOLIN: osa ankkureista (domeeni-tunniste) on lausekkeen lopussa.
  const kohta = (ankkuri) => {
    const i = VP.indexOf(ankkuri);
    expect(i, ankkuri).toBeGreaterThan(0);
    return VP.slice(Math.max(0, i - 420), i + 420);
  };
  it('_vpTtVieTreeniin (teknis-taktinen jaksofokus)', () => {
    expect(kohta("const jaksofokus = { konsepti_avain: avain, konsepti_nimi:"))
      .toContain("_vpJfKanonNimi(avain, 'teknis_taktinen')");
  });
  it('linkitetyt tukikonseptit (tallentuu jaksofokus.linkitetyt)', () => {
    expect(kohta('const uusi = { domeeni: dom, konsepti_avain: avain, konsepti_nimi:'))
      .toContain('_vpJfKanonNimi(avain, dom)');
  });
  it('jakson sulku → uusi teknis-taktinen fokus', () => {
    // Ankkuri on domeenikohtainen: samassa haarassa on myös FYYSINEN uusiJf, jonka nimi tulee
    // fyysteemat-libistä (suomi) eikä kuulu korjattavaksi.
    expect(kohta("lahde: 'silta', domeeni: 'teknis_taktinen' }")).toContain("_vpJfKanonNimi(uusiAvain, 'teknis_taktinen')");
  });
  it('konsepti_koodi säilyy kielineutraalina enumina (ei turhaa muutosta)', () => {
    expect(kohta("const jaksofokus = { konsepti_avain: avain, konsepti_nimi:")).toContain('konsepti_koodi: item ? item.koodi : null');
  });
  it('apuri EI käytä sv-kerrosta', () => {
    const fn = pala((l) => l.startsWith('function _vpJfKanonNimi('));
    expect(fn).not.toMatch(/_ttKonsepti|_ttItems|_vpSiltaKonsepti|vpT\(/);
    expect(fn).toContain('tmKonseptiResolvoi(');
  });
});

describe('C — render ennallaan: näyttö kääntää yhä', () => {
  it('_vpSiltaKonsepti ja _ttItems säilyvät sv-kerroksellisina (niitä ei saa "korjata")', () => {
    expect(pala((l) => l.startsWith('function _vpSiltaKonsepti('))).toContain('_ttKonsepti(');
    expect(VP).toMatch(/function _ttItems\(p\) \{ return _ttSeuraLista\(/);
  });
  it('tavoitelista on RENDER-polku → siellä käännös on oikein, ei korjattavaa', () => {
    const fn = pala((l) => l.startsWith('function _vpJfPaafokusRef('));
    expect(fn).not.toContain('_vpJfKanonNimi');   // ei persistoida → ei kuulu kirjoituspolkuun
  });
});

describe('D — SWEEP: jokainen konsepti_nimi-kirjoitus luokiteltu', () => {
  // Kolme sallittua luokkaa. Jos uusi kirjoituskohta ilmestyy tuntemattomalla lähteellä,
  // tämä portti punertaa ja pakottaa luokittelemaan sen.
  const SALLITUT = [
    /_vpJfKanonNimi\(/,                       // kirjoituspolku (kanon)
    /konsepti_nimi: v\.nimi/,                  // valmentajan kirjoittama välitavoite (käyttäjän teksti)
    /konsepti_nimi: (jf|vanha)\.konsepti_nimi/, // läpivienti (historia/arkistointi)
    /konsepti_nimi: (teema|t|ft|e) \? \1\.nimi/, // fyysteemat-lib (nimi = fi, sv erillisessä kentässä)
    /konsepti_nimi: k\.nimi, konsepti_koodi: k\.koodi \|\| null, domeeni: domeeni/, // jaksofokus-lib (fi-only)
    /konsepti_nimi: (found|kons|k) \? /,        // render-polku (_vpJfTavoiteLista ym.) — ei persistoida
    /konsepti_nimi: (found|kons|l|e)\.(nimi|konsepti_nimi)/   // ehdotus-/render-objektit
  ];
  const rivit = RIVIT.map((l, i) => ({ l, n: i + 1 })).filter((x) => /konsepti_nimi:/.test(x.l));
  it('kirjoituskohtia löytyy (ei-vacuous)', () => {
    expect(rivit.length).toBeGreaterThan(8);
  });
  it('jokainen rivi osuu johonkin luokkaan', () => {
    const luokittelematta = rivit.filter((x) => !SALLITUT.some((re) => re.test(x.l))).map((x) => x.n + ': ' + x.l.trim().slice(0, 90));
    expect(luokittelematta).toEqual([]);
  });
  it('yksikään TALLENNETTAVA teknis-taktinen kirjoitus ei lue sv-listaa', () => {
    // item/_ttItems-peräinen nimi ei saa enää päätyä jaksofokus-objektiin
    expect(VP).not.toMatch(/konsepti_nimi: item \? item\.nimi/);
    expect(VP).not.toMatch(/uusiJf = \{[^}]*konsepti_nimi: k \? k\.nimi/);
  });
});
