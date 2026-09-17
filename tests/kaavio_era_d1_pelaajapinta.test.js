/**
 * TalentMaster™ — Kaavio erä D1: hyväksytty kaavio pelaajan konseptikortilla (§7.22).
 *
 *   A) VALINTA — vain hyväksytty ja kohdistuva; seuran kaavio voittaa kanonisen
 *   B) §7.22 — kuvan ympärillä 0 lukua, ei tasoja/vertailua; renderöity kortti skannataan
 *   C) REHELLISYYS — kohdistus on UI-suodatin, EI pakotus (testi kieltää valheväitteen)
 *   D) TOKENIT — renderöijän design-tokenit ovat määritelty; ilman niitä SVG on näkymätön
 *   E) RAJAUS — pelaaja ei lue seurakerrosta eikä kirjoita kaavioon (D2:n CF hoitaa kuittauksen)
 *
 * (D) löytyi live-renderistä: lib uutettiin erässä A ilman prototyypin <style>-tokeneita, joten
 * määrittelemätön var() teki SVG-attribuutista virheellisen → fill=musta, stroke=ei mitään.
 * Kaavio oli VP:n pankissa käytännössä näkymätön. Yksikään gate ei olisi nähnyt sitä.
 */
import { describe, it, expect } from 'vitest';
import { readFileSync } from 'fs';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';
import { createRequire } from 'module';
import vm from 'vm';

const __dir = dirname(fileURLToPath(import.meta.url));
const require_ = createRequire(import.meta.url);
const ROOT = join(__dir, '..');
const PEL = readFileSync(join(ROOT, 'TalentMaster_Pelaaja_v7.html'), 'utf8');
const VP = readFileSync(join(ROOT, 'TalentMaster_VP_v25.html'), 'utf8');
// TAKTIIKKATAULUN UI ON NYT JAETUSSA LIBISSÄ (lib/tm_kaavio_ui.js) — sama koodi ajaa VP:ssä ja
// valmentajan apissa. Siksi UI:ta koskevat väitteet luetaan LIBISTÄ; `VP` jää niihin väitteisiin
// jotka koskevat nimenomaan VP:n omaa kytkentää (script-tagit, host-adapteri, sivupalkki).
const UI = readFileSync(join(ROOT, 'lib', 'tm_kaavio_ui.js'), 'utf8');
const RENDER_SRC = readFileSync(join(ROOT, 'lib', 'tm_kaavio_render.js'), 'utf8');
const RIVIT = PEL.split('\n');

const runko = (nimi) => {
  const a = RIVIT.findIndex((l) => new RegExp('^(?:async\\s+)?function ' + nimi + '\\s*\\(').test(l));
  if (a < 0) return null;
  for (let i = a + 1; i < RIVIT.length; i++) if (RIVIT[i] === '}') return RIVIT.slice(a, i + 1).join('\n');
  return null;
};

const SPEC = (avain, extra) => Object.assign({
  avain: avain, suunta: 'ylos', pelimuoto: '8v8',
  pelaajat: [{ id: 'p1', joukkue: 'oma', rooli: 'vastaanottaja', x: 50, y: 50, avoin: 90 }]
}, extra || {});
const doc = (o) => Object.assign({ id: 'k1', seuraId: 'seuraA', spec: SPEC('y_h0') }, o);
const HYV = { status: 'hyvaksytty', nakyvyys: 'joukkue', joukkueId: 'kpv_u13' };

// ── Sandbox: ajetaan Pelaaja_v7:n OMAT kaaviofunktiot aitojen libien kanssa ──
function pelaajaCtx(pelaaja, kaaviot, kieli) {
  const shim = { window: {}, console };
  vm.createContext(shim);
  vm.runInContext(readFileSync(join(ROOT, 'lib', 'tm_teknistaktiset.js'), 'utf8'), shim);
  vm.runInContext(readFileSync(join(ROOT, 'lib', 'tm_konsepti_resolve.js'), 'utf8'), shim);
  vm.runInContext(readFileSync(join(ROOT, 'lib', 'tm_kaavio_konsepti.js'), 'utf8'), shim);
  vm.runInContext(readFileSync(join(ROOT, 'lib', 'tm_kaavio_policy.js'), 'utf8'), shim);

  const LANG = (() => {
    const sb = { window: {}, console, localStorage: { getItem: () => null, setItem() {} }, document: { documentElement: {} } };
    vm.createContext(sb);
    vm.runInContext(readFileSync(join(ROOT, 'lib', 'tm_lang.js'), 'utf8'), sb);
    return sb.window.TM_LANG || sb.TM_LANG;
  })();

  // D2 lisäsi kuittausnapin kuvalohkoon → sen apurit kuuluvat samaan sandboxiin.
  const src = ['_p7KaavioPelaaja', '_p7ValitseKaavio', '_p7KaavioHTML', '_tKaavio', '_p7KaavioLang',
               '_konseptiFokusAvain', '_p7KuittausKartta', '_p7OnKuitattu', '_p7KuittausNappiHTML']
    .map(runko).filter(Boolean).join('\n');

  const base = {
    console, Math, JSON, String, Number, Object, Array, Boolean,
    _pelaaja: pelaaja,
    t: (polku) => polku.split('.').reduce((o, k) => (o && o[k] != null ? o[k] : null), LANG[kieli]) || polku,
    tmNykyinenKieli: () => kieli,
    _thEsc: (x) => String(x == null ? '' : x).replace(/[&<>"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c])),
    drawSpec: () => ({ nodeType: 1 }),      // DOM-solmu; oikea SVG-piirto testataan D-lohkossa
    draw: () => {},
    document: { getElementById: () => null },
    localStorage: { getItem: () => null, setItem() {} },
    _P7_KUITTAUS_LS: 'tm_p7_kaavio_ymmarretty'
  };
  base.window = { _p7Kaaviot: kaaviot, _db: null };
  ['TM_TT_YOUTH', 'TM_TT_JOUKKUE', 'TM_TT_FUNDAMENTIT'].forEach((k) => { base[k] = shim[k]; });
  Object.keys(shim).filter((k) => /^(tmKonsepti|kaavio|tmTt)/.test(k)).forEach((k) => { base[k] = shim[k]; });
  const sandbox = new Proxy(base, {
    has: () => true,
    get(t2, k) { if (k === Symbol.unscopables) return undefined; if (k in t2) return t2[k]; if (k === 'window') return base.window; return undefined; },
    set(t2, k, v) { t2[k] = v; return true; }
  });
  const ctx = vm.createContext(sandbox);
  vm.runInContext(src, ctx);
  return ctx;
}
const PELAAJA = { id: 'pel1', seuraId: 'seuraA', joukkue: 'kpv_u13', syntymaVuosi: new Date().getFullYear() - 13, jaksofokus: { konsepti_avain: 'y_h0', konsepti_nimi: 'HAVAINNOINTI' } };
const valitse = (ctx) => vm.runInContext("_p7ValitseKaavio('y_h0')", ctx);
const kortti = (ctx) => vm.runInContext("_p7KaavioHTML('y_h0')", ctx);

describe('A — valinta: vain hyväksytty ja kohdistuva', () => {
  it('kohdistuva hyväksytty seurakaavio valitaan', () => {
    const c = pelaajaCtx(PELAAJA, [doc({ review: HYV })], 'fi');
    expect(valitse(c)).toBeTruthy();
  });
  it('toisen joukkueen kaavio EI valikoidu (kaavioKohdistuu)', () => {
    const c = pelaajaCtx(PELAAJA, [doc({ review: Object.assign({}, HYV, { joukkueId: 'muu_u15' }) })], 'fi');
    expect(valitse(c)).toBe(null);
  });
  it('pelaajakohdistus osuu vain nimettyyn pelaajaan', () => {
    const omaan = { status: 'hyvaksytty', nakyvyys: 'pelaaja', pelaajaIds: ['pel1'] };
    const muulle = { status: 'hyvaksytty', nakyvyys: 'pelaaja', pelaajaIds: ['toinen'] };
    expect(valitse(pelaajaCtx(PELAAJA, [doc({ review: omaan })], 'fi'))).toBeTruthy();
    expect(valitse(pelaajaCtx(PELAAJA, [doc({ review: muulle })], 'fi'))).toBe(null);
  });
  it('eri konseptin kaavio ei valikoidu', () => {
    const c = pelaajaCtx(PELAAJA, [doc({ spec: SPEC('y_h5'), review: HYV })], 'fi');
    expect(valitse(c)).toBe(null);
  });
  it('kanoninen kaavio on aina kohdistuva (jaettu curriculum)', () => {
    const c = pelaajaCtx(PELAAJA, [{ id: 'kan1', kanoninen: true, spec: SPEC('y_h0') }], 'fi');
    expect(valitse(c)).toBeTruthy();
  });
  it('seuran kaavio VOITTAA kanonisen samalle konseptille', () => {
    const c = pelaajaCtx(PELAAJA, [{ id: 'kan1', kanoninen: true, spec: SPEC('y_h0') }, doc({ review: HYV })], 'fi');
    expect(valitse(c).kanoninen).toBeUndefined();
  });
  it('ei kaavioita → kortti ei renderöi kuvalohkoa (ei tyhjää laatikkoa)', () => {
    expect(kortti(pelaajaCtx(PELAAJA, [], 'fi'))).toBe('');
  });
});

describe('B — §7.22: kuvan ympärillä ei ole yhtään lukua', () => {
  const teksti = (h) => h.replace(/<[^>]*>/g, ' ').replace(/\s+/g, ' ').trim();
  it('renderöity kuvalohko on numeroton (fi)', () => {
    const h = kortti(pelaajaCtx(PELAAJA, [doc({ review: HYV })], 'fi'));
    expect(h).toContain('_p7KaavioSlot');
    const txt = teksti(h);
    expect(txt.match(/\d/g)).toBe(null);
    expect(txt).not.toMatch(/\/\s*(100|5)\b|taso|OVR|piste/i);
  });
  it('KPI-teksti tulee KAANONISTA kun kaavio on tagattu KPI:hin', () => {
    const h = kortti(pelaajaCtx(PELAAJA, [doc({ spec: SPEC('y_h0', { kpi: 'a' }), review: HYV })], 'fi'));
    expect(teksti(h).length).toBeGreaterThan(40);
    expect(teksti(h).match(/\d/g)).toBe(null);      // KPI-teksti ei myöskään tuo lukuja
  });
  it('sv: kuvalohko kääntyy eikä jätä fi-jäänteitä', () => {
    const h = kortti(pelaajaCtx(PELAAJA, [doc({ review: HYV })], 'sv'));
    expect(h).toContain('Så här ser det ut på planen');
    expect(h).not.toContain('Miltä se näyttää kentällä');
  });
  it('kaikki kuvalohkon oma teksti kulkee t():n läpi (ei kovaa suomea)', () => {
    const fn = runko('_p7KaavioHTML').split('\n').filter((l) => !/^\s*\/\//.test(l)).join('\n');
    const raaka = [...fn.matchAll(/>([A-ZÅÄÖ][^<>${}'"]{6,})</g)].map((m) => m[1]);
    expect(raaka).toEqual([]);
    expect(fn).toContain("_tKaavio('otsikko')");
    expect(fn).toContain("_tKaavio('saate')");
  });
});

describe('C — rehellisyys: kohdistus on UI-suodatin, EI pakotus', () => {
  it('firestore.rules pakottaa pelaajalle VAIN statuksen — ei kohdistusta', () => {
    const rules = readFileSync(join(ROOT, 'tm_admin', 'firestore.rules'), 'utf8');
    const i = rules.indexOf('match /kaaviot/{kaavioId}');
    const lohko = rules.slice(i, rules.indexOf('allow delete', i));
    expect(lohko).toContain("kaavioTila(resource.data) == 'hyvaksytty'");
    expect(lohko).not.toMatch(/nakyvyys|pelaajaIds/);       // kohdistusta EI ole säännöissä
  });
  it('koodi sanoo tämän ääneen — rajoite on dokumentoitu, ei piilotettu', () => {
    const lohko = PEL.slice(PEL.indexOf('KAAVIO ERÄ D1'), PEL.indexOf('window._p7Kaaviot = null'));
    expect(lohko).toMatch(/EI PAKOTUS|ei pakotus|UI-SUODATIN|UI-suodatin/);
  });
});

describe('D — renderöijän design-tokenit ovat määritelty (muuten SVG on näkymätön)', () => {
  const TOKENIT = [...new Set([...RENDER_SRC.matchAll(/var\(--([a-z0-9-]+)\)/g)].map((m) => m[1]))];
  it('renderöijä käyttää tokeneita — lista ei ole tyhjä (ei-vacuous)', () => {
    expect(TOKENIT.length).toBeGreaterThan(8);
  });
  for (const [nimi, src] of [['Pelaaja_v7', PEL], ['VP_v25', VP]]) {
    it(`${nimi}: .tm-kaavio määrittelee JOKAISEN renderöijän tokenin`, () => {
      const i = src.indexOf('.tm-kaavio {');
      expect(i, 'tokenilohko puuttuu').toBeGreaterThan(0);
      const lohko = src.slice(i, src.indexOf('}', i));
      const puuttuu = TOKENIT.filter((tk) => !new RegExp('--' + tk + '\\s*:').test(lohko));
      expect(puuttuu).toEqual([]);
    });
  }
  it('tokenit ovat SKOOPATUT, eivät :rootissa (appien --ink3/--slate tarkoittavat eri asiaa)', () => {
    const i = PEL.indexOf('.tm-kaavio {');
    expect(PEL.slice(Math.max(0, i - 200), i)).not.toMatch(/:root\s*\{[^}]*$/);
  });
  it('kaavion isäntäelementeillä on .tm-kaavio-luokka molemmissa apeissa', () => {
    expect(PEL).toMatch(/id="_p7KaavioSlot" class="tm-kaavio"/);
    expect(UI).toContain('class="tm-kaavio" style="margin-bottom:8px');   // esikatselu (jaettu lib)
    expect(UI).toContain('id="_kvCanvas" class="tm-kaavio"');              // editorin canvas (jaettu lib)
  });
});

describe('E — rajaus: pelaaja ei lue seurakerrosta eikä kirjoita kaavioon', () => {
  const lohko = PEL.slice(PEL.indexOf('KAAVIO ERÄ D1'), PEL.indexOf('function rMinaKonseptiFokus'));
  const koodi = lohko.split('\n').filter((l) => !/^\s*(\/\/|\*|\/\*)/.test(l)).join('\n');
  it('EI lue seurat/{sid}/konseptit-kokoelmaa (rules estäisi anon-tokenilta)', () => {
    expect(koodi).not.toMatch(/collection\('konseptit'\)/);
    expect(koodi).not.toContain('tmKonseptiAsetaKerros');
    expect(koodi).toContain('tmKonseptiKaanon');     // vain puhdas kaanon-haku
  });
  it('EI kirjoita kaavio-dokumenttiin suoraan — kuittaus kulkee erän D2 Cloud Functionin kautta', () => {
    // `ymmarretty` LUETAAN (näytetäänkö ✓), mutta kirjoitusta Firestoreen ei ole: rules estäisi sen.
    expect(koodi).not.toMatch(/collection\('kaaviot'\)[^\n]*\.(set|update|add)\(/);
    expect(koodi).not.toMatch(/\bref\.(set|update)\(/);
    expect(koodi).toContain("httpsCallable('kuittaaKaavioYmmarretty')");
  });
  it('kysely rajaa statuksen jo palvelimella (muuten rules hylkäisi listauksen)', () => {
    expect(koodi).toMatch(/where\('review\.status',\s*'==',\s*'hyvaksytty'\)/);
  });
  it('lataus on best-effort — virhe ei kaada korttia', () => {
    expect(runko('_p7LataaKaaviot')).toMatch(/catch \(e\)/);
  });
});
