/**
 * Suostumuslomake: syntymäaika kolmella valikolla (1.10.2026, Tero testasi kännykällä).
 * Natiivi type="date" oli epäselvä, vuoden 2015 valinta vaati kymmenen vuoden selaamisen, kenttään päätyi 08.10.2026
 * ja virhe "vuoden pitää olla 1990-2025" hämmensi. Nyt Päivä/Kuukausi/Vuosi + piilotettu i_syn (YYYY-MM-DD).
 * Funktiot AJETAAN vm:ssä DOM-tyngällä.
 */
import { describe, it, expect } from 'vitest';
import { readFileSync } from 'fs';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';
import { createRequire } from 'module';
import vm from 'vm';

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..');
const require_ = createRequire(import.meta.url);
const LOMAKE = readFileSync(join(ROOT, 'TalentMaster_Rekisterointi_Suostumus.html'), 'utf8');
const pura = (t) => { const a = LOMAKE.indexOf(t); if (a < 0) throw new Error(t); let d = 0; for (let j = LOMAKE.indexOf(') {', a) + 2; j < LOMAKE.length; j++) { if (LOMAKE[j] === '{') d++; else if (LOMAKE[j] === '}') { d--; if (!d) return LOMAKE.slice(a, j + 1); } } throw new Error(t); };
const iso = (d) => d.getFullYear() + '-' + String(d.getMonth() + 1).padStart(2, '0') + '-' + String(d.getDate()).padStart(2, '0');

function ymp(kieli = 'fi') {
  const els = {};
  const luokat = () => { const s = new Set(); return { add: (c) => s.add(c), remove: (c) => s.delete(c), toggle: (c, on) => (on ? s.add(c) : s.delete(c)), contains: (c) => s.has(c) }; };
  const select = (id) => ({ id, options: [{ value: '', textContent: '' }], classList: luokat(), _v: '',
    get value() { return this._v; }, set value(x) { this._v = this.options.some((o) => o.value === x) ? x : ''; },
    remove(i) { this.options.splice(i, 1); }, appendChild(o) { this.options.push(o); } });
  const E = (id) => els[id] || (els[id] = /^i_syn_/.test(id) ? select(id) : { id, value: '', textContent: '', classList: luokat() });
  const loki = { onAge: 0 };
  const ctx = { el: E, document: { createElement: () => ({ value: '', textContent: '' }) }, Intl, Date, String, Math,
    tmNykyinenKieli: () => kieli, t: (k) => k, onAge: () => { loki.onAge++; } };
  vm.createContext(ctx);
  vm.runInContext('var SYN_ALKUVUOSI = ' + LOMAKE.match(/var SYN_ALKUVUOSI = (\d+);/)[1] + ';\n'
    + ['function _synTt(k, fi) {', 'function _synVirheTeksti() {', 'function _synKuukaudet() {', 'function _synTayta(id, arvot) {', 'function _synAlusta(esitaytto) {',
      'function _synTila() {', 'function _synKorosta(paalla, teksti) {', 'function _synMuuttui(hiljaa) {'].map(pura).join('\n')
    + '\nthis.alusta = _synAlusta; this.muuttui = _synMuuttui;', ctx);
  ctx.alusta('');   // valikot täytetään kuten sivun latauksessa
  const valitse = (p, k, v) => { E('i_syn_p').value = String(p); E('i_syn_k').value = String(k); E('i_syn_v').value = String(v); ctx.muuttui(); };
  return { ctx, E, loki, valitse };
}

describe('HTML', () => {
  it('ei natiivia date-kenttää; kolme valikkoa + piilotettu i_syn; ei kovakoodattua 2025-ylärajaa', () => {
    expect(LOMAKE).not.toMatch(/id="i_syn" type="date"/);
    expect(LOMAKE).toContain('<input id="i_syn" type="hidden">');
    for (const id of ['i_syn_p', 'i_syn_k', 'i_syn_v']) expect(LOMAKE).toContain('<select id="' + id + '"');
    expect(LOMAKE).not.toMatch(/sv > 2025|1990-2025/);
  });
});

describe('valikot (ajettu)', () => {
  it('vuodet kuluvasta vuodesta vuoteen 1990 (uusin ensin), päivät 1–31, kuukaudet nimillä', () => {
    const { ctx, E } = ymp();
    ctx.alusta('');
    const v = E('i_syn_v').options.slice(1).map((o) => o.value);
    expect(v[0]).toBe(String(new Date().getFullYear()));
    expect(v[v.length - 1]).toBe('1990');
    expect(v).toHaveLength(new Date().getFullYear() - 1990 + 1);
    expect(E('i_syn_p').options.slice(1).map((o) => o.value)).toEqual(Array.from({ length: 31 }, (_, i) => String(i + 1)));
    const kk = E('i_syn_k').options.slice(1);
    expect(kk.map((o) => o.value)).toEqual(Array.from({ length: 12 }, (_, i) => String(i + 1)));
    expect(kk[0].textContent).toBe('Tammikuu'); expect(kk[11].textContent).toBe('Joulukuu');
  });
  it('kuukausien nimet englanniksi kun kieli en', () => {
    const { ctx, E } = ymp('en');
    ctx.alusta('');
    expect(E('i_syn_k').options[1].textContent).toBe('January');
  });
  it('kelvollinen valinta → i_syn = YYYY-MM-DD, onAge kutsutaan, ei virhettä', () => {
    const { E, loki, valitse } = ymp();
    valitse(4, 6, 2015);
    expect(E('i_syn').value).toBe('2015-06-04');
    expect(loki.onAge).toBeGreaterThan(0);
    expect(E('synVirhe').textContent).toBe('');
  });
  it('mahdoton päivä 31.2. ja 29.2. ei-karkausvuonna → hylätään: i_syn tyhjä, "Tarkista syntymäaika", rivi korostettu', () => {
    for (const [p, k, v] of [[31, 2, 2014], [29, 2, 2015], [31, 4, 2014]]) {
      const { E, valitse } = ymp();
      valitse(p, k, v);
      expect(E('i_syn').value).toBe('');
      expect(E('synVirhe').textContent).toBe('Tarkista syntymäaika');
      for (const id of ['i_syn_p', 'i_syn_k', 'i_syn_v']) expect(E(id).classList.contains('err')).toBe(true);
    }
    const { E, valitse } = ymp();
    valitse(29, 2, 2012);   // karkausvuosi → kelpaa
    expect(E('i_syn').value).toBe('2012-02-29');
  });
  it('tulevaisuus hylätään (huominen); tämä päivä kelpaa', () => {
    const huomenna = new Date(); huomenna.setDate(huomenna.getDate() + 1);
    const { E, valitse } = ymp();
    if (huomenna.getFullYear() === new Date().getFullYear()) {   // vuoden viimeisenä päivänä huominen ei ole valikossa
      valitse(huomenna.getDate(), huomenna.getMonth() + 1, huomenna.getFullYear());
      expect(E('i_syn').value).toBe('');
      expect(E('synVirhe').textContent).toBe('Tarkista syntymäaika');
    }
    const nyt = new Date();
    valitse(nyt.getDate(), nyt.getMonth() + 1, nyt.getFullYear());
    expect(E('i_syn').value).toBe(iso(nyt));
  });
  it('kesken valinnan (vuosi puuttuu) → i_syn tyhjä, ei virhetekstiä', () => {
    const { E, ctx } = ymp();
    E('i_syn_p').value = '4'; E('i_syn_k').value = '6'; ctx.muuttui();
    expect(E('i_syn').value).toBe(''); expect(E('synVirhe').textContent).toBe('');
  });
  it('esitäyttö URL:sta täyttää valikot: YYYY-MM-DD ja P.K.VVVV', () => {
    for (const x of ['2015-06-04', '4.6.2015', '04.06.2015']) {
      const { ctx, E } = ymp();
      ctx.alusta(x);
      expect([E('i_syn_p').value, E('i_syn_k').value, E('i_syn_v').value]).toEqual(['4', '6', '2015']);
      expect(E('i_syn').value).toBe('2015-06-04');
    }
  });
  it('virheellinen esitäyttö (tulevaisuus) → ei kelpaa eikä hiljaisesti hyväksytä, mutta virhettä ei näytetä ennen käyttäjän toimintaa', () => {
    const v = new Date().getFullYear();
    const { ctx, E } = ymp();
    ctx.alusta(v + '-12-31');
    if (iso(new Date()) !== v + '-12-31') expect(E('i_syn').value).toBe('');
    expect(E('synVirhe').textContent).toBe('');
  });
});

describe('tekstit', () => {
  it('fi + en + sv (Gemini-erä 8.10.2026)', () => {
    global.window = {}; require_(join(ROOT, 'lib', 'tm_lang.js')); const L = global.window.TM_LANG; delete global.window;
    expect(L.fi.suostumus.syn_tarkista).toBe('Tarkista syntymäaika');
    expect(L.en.suostumus.syn_tarkista).toBe('Check the date of birth');
    for (const k of ['syn_paiva', 'syn_kuukausi', 'syn_vuosi', 'syn_tarkista']) {
      expect(L.fi.suostumus[k]).toBeTruthy(); expect(L.en.suostumus[k]).toBeTruthy(); expect(L.sv.suostumus[k]).toBeTruthy();
      expect(require_('./tm_lang_sv_odotuslista.cjs')).not.toContain('suostumus.' + k);
    }
  });
});
