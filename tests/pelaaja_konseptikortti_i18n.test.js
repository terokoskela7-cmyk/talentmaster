/**
 * TalentMaster™ — pelaajan konseptikortin i18n (Vaihe 4b -aukko).
 *
 * Kortti shipattiin ilman i18n:ää: rakenteelliset otsikot olivat kovakoodattua suomea, joten
 * sv/en-tilassa kortti oli suomenkielinen muuten käännetyssä sovelluksessa.
 *
 *   A) SWEEP — kortin renderissä ei ole yhtään kovakoodattua näyttötekstiä
 *   B) CHROME — otsikot kääntyvät fi/sv/en (RENDERÖIDYSTÄ kortista, ei lähteestä)
 *   C) SISÄLTÖ — sv tulee oikeasta lähteestä (curriculum-sidecar), ei keksitystä käännöksestä;
 *      en jää suomeksi KOSKA LÄHDETTÄ EI OLE — tämä on testattu tosiasia, ei unohdus
 *   D) §7.22 — kortissa ei ole lukuja eikä vertailua (ennallaan)
 */
import { describe, it, expect } from 'vitest';
import { readFileSync } from 'fs';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';
import vm from 'vm';

const __dir = dirname(fileURLToPath(import.meta.url));
const ROOT = join(__dir, '..');
const PEL = readFileSync(join(ROOT, 'TalentMaster_Pelaaja_v7.html'), 'utf8');
const RIVIT = PEL.split('\n');

const runko = (nimi) => {
  const a = RIVIT.findIndex((l) => new RegExp('^(?:async\\s+)?function ' + nimi + '\\s*\\(').test(l));
  if (a < 0) return null;
  for (let i = a + 1; i < RIVIT.length; i++) if (RIVIT[i] === '}') return RIVIT.slice(a, i + 1).join('\n');
  return null;
};

// ── Renderöi kortti oikealla lähdekoodilla + aidoilla libeillä ──
function renderoi(kieli, avain) {
  const shim = { window: {}, console };
  vm.createContext(shim);
  vm.runInContext(readFileSync(join(ROOT, 'lib', 'tm_teknistaktiset.js'), 'utf8'), shim);
  vm.runInContext(readFileSync(join(ROOT, 'lib', 'tm_teknistaktiset_sv.js'), 'utf8'), shim);
  const LANG = (() => {
    const sb = { window: {}, console, localStorage: { getItem: () => null, setItem() {} }, document: { documentElement: {} } };
    vm.createContext(sb);
    vm.runInContext(readFileSync(join(ROOT, 'lib', 'tm_lang.js'), 'utf8'), sb);
    return sb.window.TM_LANG || sb.TM_LANG;
  })();

  const src = ['_tKonsepti', '_p7Kieli', '_p7TtSv', '_p7KonseptipeliNimi', '_p7KonseptiLokalisoi',
               '_konseptiFokusAvain', '_konseptiVaiheVihje', 'rMinaKonseptiFokus']
    .map(runko).filter(Boolean).join('\n');

  const base = {
    console, Math, JSON, String, Number, Object, Array, Boolean,
    _pelaaja: { id: 'p1', seuraId: 's1', joukkue: 'kpv_u13', syntymaVuosi: new Date().getFullYear() - 13,
                jaksofokus: { konsepti_avain: avain || 'y_h0' } },
    t: (polku) => polku.split('.').reduce((o, k) => (o && o[k] != null ? o[k] : null), LANG[kieli]) || polku,
    tmNykyinenKieli: () => kieli,
    _thEsc: (x) => String(x == null ? '' : x).replace(/[&<>"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c])),
    _p7KaavioHTML: () => '',      // kaaviolohko ei kuulu tähän eräään
    window: {}
  };
  ['TM_TT_YOUTH', 'TM_TT_JOUKKUE', 'TM_TT_FUNDAMENTIT', 'TM_TT_HARJOITTEET', 'TM_TT_SV'].forEach((k) => { base[k] = shim[k]; });
  ['tmTtPelaaja', 'tmTtVaihe'].forEach((k) => { base[k] = shim[k]; });
  const sandbox = new Proxy(base, {
    has: () => true,
    get(t2, k) { if (k === Symbol.unscopables) return undefined; if (k in t2) return t2[k]; if (k === 'window') return base.window; return undefined; },
    set(t2, k, v) { t2[k] = v; return true; }
  });
  const ctx = vm.createContext(sandbox);
  vm.runInContext(src, ctx);
  return vm.runInContext('rMinaKonseptiFokus()', ctx);
}
const teksti = (h) => h.replace(/<[^>]*>/g, ' ').replace(/\s+/g, ' ').trim();

describe('A — SWEEP: kortin renderissä ei ole kovakoodattua näyttötekstiä', () => {
  it('rMinaKonseptiFokus: jokainen näyttöteksti kulkee esc()/t():n läpi', () => {
    const fn = runko('rMinaKonseptiFokus').split('\n').filter((l) => !/^\s*\/\//.test(l)).join('\n');
    // markup-ulkoinen teksti ilman interpolointia = kovakoodattu
    const raaka = [...fn.matchAll(/>([^<>${}']*[A-Za-zÅÄÖåäö]{3,}[^<>${}']*)</g)]
      .map((m) => m[1].trim()).filter((x) => x && !/^\s*$/.test(x));
    expect(raaka).toEqual([]);
  });
  it('_konseptiVaiheVihje: vaihelabelit t():n läpi (brief ei listannut näitä)', () => {
    const fn = runko('_konseptiVaiheVihje');
    expect(fn).toContain("_tKonsepti('vaihe_leikkija')");
    expect(fn).toContain("_tKonsepti('vaihe_rakentaja')");
    expect(fn).toContain("_tKonsepti('vaihe_pelipaikka')");
    expect(fn).not.toMatch(/'[🌱⚽] ?(Leikkijän|Rakentajan|Pelipaikan) vaihe'/);
  });
  it('kaikilla chrome-avaimilla on rivi fi JA sv JA en', () => {
    const lang = readFileSync(join(ROOT, 'lib', 'tm_lang.js'), 'utf8');
    const avaimet = [...new Set([...PEL.matchAll(/_tKonsepti\('([a-z_]+)'\)/g)].map((m) => m[1]))];
    expect(avaimet.length).toBeGreaterThanOrEqual(9);
    const lohkot = [...lang.matchAll(/konseptikortti: \{([\s\S]*?)\n    \}/g)].map((m) => m[1]);
    expect(lohkot.length).toBe(3);                       // fi + sv + en
    avaimet.forEach((a) => lohkot.forEach((l, i) => expect(l, a + ' / lohko ' + i).toContain(a + ':')));
  });
});

describe('B — CHROME kääntyy renderöidyssä kortissa', () => {
  it('fi', () => {
    const t2 = teksti(renderoi('fi'));
    expect(t2).toContain('Milloin tämä näkyy');
    expect(t2).toContain('Rakentajan vaihe');
  });
  it('sv: 0 suomenkielistä otsikkoa', () => {
    const t2 = teksti(renderoi('sv'));
    expect(t2).toContain('När syns det här');
    expect(t2).toContain('Varför det hjälper');
    expect(t2).toContain('Byggfasen');
    ['Milloin tämä näkyy', 'Miksi se auttaa', 'Kokeile tätä', 'Rakentajan vaihe', 'Minä ja pallo'].forEach((x) => expect(t2).not.toContain(x));
  });
  it('en: 0 suomenkielistä otsikkoa', () => {
    const t2 = teksti(renderoi('en'));
    expect(t2).toContain('When you see this');
    expect(t2).toContain('Building phase');
    ['Milloin tämä näkyy', 'Miksi se auttaa', 'Kokeile tätä'].forEach((x) => expect(t2).not.toContain(x));
  });
});

describe('C — SISÄLTÖ: sv oikeasta lähteestä, en rajattu ulos', () => {
  it('sv-sisältö tulee curriculum-sidecarista (ei keksitty)', () => {
    const t2 = teksti(renderoi('sv'));
    expect(t2).toContain('ORIENTERING OCH AVLÄSNING');                 // nimi
    expect(t2).toMatch(/allt börjar med information/);                  // pelitilanne
    expect(t2).toContain('Vad såg du innan bollen kom till dig?');      // kysymys.0
    expect(t2).not.toContain('HAVAINNOINTI');
    expect(t2).not.toContain('Mitä näit ennen kuin pallo tuli sinulle?');
  });
  it('`koe` lyhennetään sv:stä SAMALLA säännöllä kuin kaanon lyhentää fi:n', () => {
    // Pariteetti: lib on generoitu eikä vie funktiota ulos → sääntö on peilattu. Aja molemmat.
    const libSrc = readFileSync(join(ROOT, 'lib', 'tm_teknistaktiset.js'), 'utf8');
    const libFn = libSrc.slice(libSrc.indexOf('function _ttKonseptipeliNimi('));
    const sb = {};
    vm.createContext(sb);
    vm.runInContext(libFn.slice(0, libFn.indexOf('\n}') + 2) + '\nthis.kaanon = _ttKonseptipeliNimi;', sb);
    vm.runInContext(runko('_p7KonseptipeliNimi') + '\nthis.peili = _p7KonseptipeliNimi;', sb);
    const syotteet = ['Possessionspel med scanningsregel: huvudet måste vridas', 'Lyhyt', '', 'A – B', 'X (y)',
                      'Tämä on hyvin pitkä nimi joka ylittää neljänkymmenenkahden merkin rajan selvästi'];
    syotteet.forEach((x) => expect(sb.peili(x), JSON.stringify(x)).toBe(sb.kaanon(x)));
    expect(teksti(renderoi('sv'))).toContain('Possessionspel med scanningsregel');
  });
  it('en-tilassa SISÄLTÖ jää suomeksi — en-lähdettä ei ole (todettu, ei unohdettu)', () => {
    const t2 = teksti(renderoi('en'));
    expect(t2).toContain('HAVAINNOINTI');
    expect(t2).toContain('Mitä näit ennen kuin pallo tuli sinulle?');
    // ja lähteen puuttuminen on tosiasia, ei oletus:
    expect(() => readFileSync(join(ROOT, 'lib', 'tm_teknistaktiset_en.js'))).toThrow();
  });
  it('rajoite on kirjoitettu koodiin auki', () => {
    const lohko = PEL.slice(PEL.indexOf('KONSEPTIKORTIN i18n'), PEL.indexOf('function _tKonsepti('));
    expect(lohko).toMatch(/EN-LÄHDETTÄ EI OLE/);
  });
  it('sidecar ei vaikuta fi-tilaan (haku on kielirajattu)', () => {
    expect(runko('_p7TtSv')).toMatch(/_p7Kieli\(\) !== 'sv'/);
    expect(teksti(renderoi('fi'))).toContain('HAVAINNOINTI');
  });
});

describe('D — §7.22 ennallaan', () => {
  for (const kieli of ['fi', 'sv', 'en']) {
    it(`${kieli}: kortissa ei lukuja tasoista, pisteistä tai vertailusta`, () => {
      const t2 = teksti(renderoi(kieli));
      expect(t2).not.toMatch(/\d+\s*\/\s*(5|100)|taso \d|OVR|piste/i);
    });
  }
});
