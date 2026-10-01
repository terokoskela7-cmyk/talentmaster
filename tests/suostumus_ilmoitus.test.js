/**
 * #689 jatko · Suostumussivun ristiriitailmoitus: paikka, elinkaari, tuplapainallus, oikea virhekoodi, ä/ö.
 * Sivun funktiot AJETAAN vm:ssä minimaalista DOM-tynkää vasten (ei jsdomia); DOM-asettelu 375 px
 * todennetaan lisäksi headless-Chromella (PR:n kuvakaappaus).
 */
import { describe, it, expect } from 'vitest';
import { readFileSync } from 'fs';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';
import vm from 'vm';

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..');
const S = readFileSync(join(ROOT, 'TalentMaster_Rekisterointi_Suostumus.html'), 'utf8');
function pura(tunniste) {
  const alku = S.indexOf(tunniste);
  if (alku < 0) throw new Error('ei löydy: ' + tunniste);
  let d = 0;
  for (let j = S.indexOf(') {', alku) + 2; j < S.length; j++) {
    if (S[j] === '{') d++; else if (S[j] === '}') { d--; if (!d) return S.slice(alku, j + 1); }
  }
  throw new Error('sulkeet');
}

/* Minimaalinen DOM: solmuilla parentNode/children/insertBefore/removeChild/closest. */
function solmu(tag, props) {
  const n = Object.assign({ tagName: tag, children: [], parentNode: null, style: {}, attrs: {}, className: '', textContent: '', disabled: false, checked: false, value: '',
    classList: { add() {}, remove() {} },
    setAttribute(k, v) { this.attrs[k] = v; },
    appendChild(c) { c.parentNode = this; this.children.push(c); return c; },
    insertBefore(c, ref) { c.parentNode = this; const i = ref ? this.children.indexOf(ref) : -1; if (i < 0) this.children.push(c); else this.children.splice(i, 0, c); return c; },
    removeChild(c) { this.children.splice(this.children.indexOf(c), 1); c.parentNode = null; return c; },
    closest(sel) { let x = this; while (x) { if (sel === '.' + x.className) return x; x = x.parentNode; } return null; },
  }, props || {});
  Object.defineProperty(n, 'nextSibling', { get() { const p = this.parentNode; if (!p) return null; return p.children[p.children.indexOf(this) + 1] || null; } });
  return n;
}
function sivu() {
  const v2 = solmu('div', { id: 'v2' });
  const nav = solmu('div', { className: 'nav' });
  const takaisin = solmu('button', { id: 'takaisin' });
  const btnok = solmu('button', { id: 'btnok', textContent: 'Vahvista ja lähetä' });
  v2.appendChild(nav); nav.appendChild(takaisin); nav.appendChild(btnok);
  const kaikki = () => { const out = []; const k = (x) => { out.push(x); x.children.forEach(k); }; k(v2); return out; };
  const kuuntelijat = {};
  const ctx = {
    document: { createElement: (t) => solmu(t) },
    window: { addEventListener: (e, f) => { kuuntelijat[e] = f; } },
    el: (id) => kaikki().find((x) => x.id === id) || (id === 'c1' || id === 'c2' ? { checked: true } : null),
    setTimeout: (f) => f(), String, console: { error() {} },
  };
  vm.createContext(ctx);
  vm.runInContext(pura('function chkConsent() {').replace('function chkConsent', 'var _lahetysKaynnissa = false, _lahetettyOnnistuneesti = false;\nfunction chkConsent')
    + '\n' + pura('function _poistaRistiriitaIlmoitus() {') + '\n' + pura('function _naytaRistiriitaIlmoitus(viesti) {')
    + '\n' + pura('function _onPelaajaRistiriita(err) {')
    + '\n' + S.slice(S.indexOf("window.addEventListener('pageshow'"), S.indexOf('});', S.indexOf("window.addEventListener('pageshow'")) + 3)
    + '\nthis.nayta=_naytaRistiriitaIlmoitus; this.poista=_poistaRistiriitaIlmoitus; this.onRR=_onPelaajaRistiriita; this.chk=chkConsent;'
    + '\nthis.aseta=function(a,b){_lahetysKaynnissa=a;_lahetettyOnnistuneesti=b;};', ctx);
  return { ctx, v2, nav, btnok, kaikki, kuuntelijat };
}

describe('ristiriitailmoitus · paikka ja elinkaari (ajettu)', () => {
  it('ilmoitus on täysleveä lohko NAPPIRIVIN ALLA, ei .nav-flexin sisällä; vain yksi kerrallaan', () => {
    const t = sivu();
    t.ctx.nayta('viesti 1');
    t.ctx.nayta('viesti 2');
    const ilm = t.kaikki().filter((x) => x.id === 'ristiriitaIlmoitus');
    expect(ilm).toHaveLength(1);
    expect(ilm[0].parentNode).toBe(t.v2);
    expect(t.v2.children.indexOf(ilm[0])).toBe(t.v2.children.indexOf(t.nav) + 1);
    expect(t.nav.children.map((x) => x.id)).toEqual(['takaisin', 'btnok']);
    expect(ilm[0].style.cssText).toMatch(/width:100%/);
    expect(ilm[0].style.cssText).toMatch(/margin-top:12px/);
    expect(ilm[0].textContent).toBe('viesti 2');
    expect(ilm[0].attrs.role).toBe('alert');
  });
  it('takaisin-navigointi (pageshow persisted) poistaa ilmoituksen; tavallinen pageshow ei koske', () => {
    const t = sivu();
    t.ctx.nayta('x');
    t.kuuntelijat.pageshow({ persisted: false });
    expect(t.kaikki().some((x) => x.id === 'ristiriitaIlmoitus')).toBe(true);
    t.kuuntelijat.pageshow({ persisted: true });
    expect(t.kaikki().some((x) => x.id === 'ristiriitaIlmoitus')).toBe(false);
  });
  it('ilmoitusta ei tallenneta mihinkään (ei localStorage/sessionStorage)', () => {
    const koodi = pura('function _naytaRistiriitaIlmoitus(viesti) {') + pura('function _poistaRistiriitaIlmoitus() {');
    expect(koodi).not.toMatch(/localStorage|sessionStorage/);
    expect(S.slice(S.indexOf('.catch(function(err) {'))).not.toMatch(/Storage\.setItem/);
  });
});

describe('vain oikea virhekoodi näyttää ristiriitailmoituksen', () => {
  const t = sivu();
  it.each([
    [{ code: 'functions/failed-precondition', message: 'pelaaja_ristiriita', details: { syy: 'pelaaja_ristiriita' } }, true],
    [{ code: 'failed-precondition', message: 'pelaaja_ristiriita' }, true],
    [{ code: 'functions/permission-denied', message: 'pelaaja_ristiriita' }, false],
    [{ code: 'functions/failed-precondition', message: 'Pyyntö on jo käsitelty.' }, false],
    [{ code: 'functions/internal', message: 'Palvelinvirhe' }, false],
    [new Error('Network error'), false],
  ])('%o → %s', (err, odotus) => expect(t.ctx.onRR(err)).toBe(odotus));
});

describe('tuplapainallus', () => {
  it('chkConsent ei avaa nappia kutsun aikana eikä onnistumisen jälkeen', () => {
    const t = sivu();
    t.ctx.chk(); expect(t.btnok.disabled).toBe(false);
    t.ctx.aseta(true, false); t.ctx.chk(); expect(t.btnok.disabled).toBe(true);
    t.ctx.aseta(false, true); t.ctx.chk(); expect(t.btnok.disabled).toBe(true);
  });
  it('toStep3: kaksi peräkkäistä painallusta → yksi vahvistaSuostumus-kutsu; onnistumisen jälkeen ei uutta lähetystä', async () => {
    const kutsut = [];
    let vapauta;
    const pending = new Promise((r) => { vapauta = r; });
    const elementit = {};
    const E = (id) => elementit[id] || (elementit[id] = { id, value: '', checked: ['c1', 'c2'].includes(id), disabled: false, textContent: '', style: {}, classList: { add() {}, remove() {} },
      closest: () => null, parentNode: null });
    const ctx = {
      el: E, val: (id) => ({ h_etu: 'Tero', h_suku: 'Koskela' })[id] || '', toast() {}, setStep: (n) => kutsut.push('step' + n), console: { error() {}, warn() {} },
      Date, Math, JSON, String, parseInt, parseFloat, isNaN, Object, Array, Promise,
      _fbDb: { collection: () => ({ doc: () => ({ collection: () => ({ doc: () => ({}) }) }) }) }, _seuraId: 'kpv', _pelaajaId: 'p1', _kutsuId: null, _urlParams: { hEmail: 'h@x.fi' },
      firebase: { firestore: { FieldValue: { serverTimestamp: () => 'TS' } },
        app: () => ({ functions: () => ({ httpsCallable: () => (d) => { kutsut.push('vahvista'); return pending; } }) }) },
      document: { getElementById: () => null, createElement: () => ({ style: {}, setAttribute() {} }) },
      window: {}, setTimeout: (f) => f(),
    };
    vm.createContext(ctx);
    vm.runInContext('var _lahetysKaynnissa = false, _lahetettyOnnistuneesti = false;\n'
      + pura('function _poistaRistiriitaIlmoitus() {') + '\n' + pura('function _naytaRistiriitaIlmoitus(viesti) {') + '\n'
      + pura('function _onPelaajaRistiriita(err) {') + '\n' + pura('function toStep3() {') + '\nthis.t3 = toStep3;', ctx);
    ctx.t3(); ctx.t3();
    expect(kutsut.filter((k) => k === 'vahvista')).toHaveLength(1);
    vapauta({ data: { ok: true, emailLahetetty: true } });
    await new Promise((r) => setImmediate(r)); await new Promise((r) => setImmediate(r));
    expect(kutsut).toContain('step3');
    ctx.t3();
    expect(kutsut.filter((k) => k === 'vahvista')).toHaveLength(1);
  });
});

describe('suostumussivun fi-tekstit (ä/ö)', () => {
  it('ei ASCII-muotoisia näkyviä sanoja; avainlauseet oikein', () => {
    expect(S).toContain('Vahvista ja lähetä');
    expect(S).toContain('Seura on esitäyttänyt osan tiedoista puolestasi. Tarkista tiedot ja täydennä puuttuvat kentät.');
    expect(S).not.toMatch(/Vahvista ja laheta|esitayttanyt|taydenna|\bkentat\b|epaonnistui|Syntymaaika|sahkoposti \(|Rekisterointitunnus|Raportit lahetetaan|Tayta pakolliset/);
  });
});
