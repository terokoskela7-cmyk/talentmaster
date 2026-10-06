/**
 * R6.0a (hotfix) — VP_v25: `window._vpKirjaaReview` (modaali, 1 arg) varjosti saman nimisen kirjoittajan (pid, pvm, review) →
 * MDT-/bulk-"kirjaus" avasi modaalin eikä kirjoittanut mitään, silti "✓ Review merkitty". Kirjoittaja nimetty _vpKirjoitaReview.
 *  · vartija: ei kahta samannimistä globaalia VP_v25:ssä (funktiodeklaraatio vs window-funktio; tuplat)
 *  · MDT-review + bulk: toast "✓" ja ok++ VASTA kirjoituksen onnistuttua, virheestä näkyvä virheilmoitus, paikallinen tila vasta onnistumisen jälkeen
 * Fixturet: vain KPV U13 -testipelaajat (seura 'kpv'). Funktiot PURETAAN LÄHTEESTÄ ja ajetaan vm:ssä.
 */
import { describe, it, expect } from 'vitest';
import { readFileSync } from 'fs';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';
import vm from 'vm';

const VP = readFileSync(join(dirname(fileURLToPath(import.meta.url)), '..', 'TalentMaster_VP_v25.html'), 'utf8');
function pura(tunniste, lahde = VP) {
  const i = lahde.indexOf(tunniste); expect(i, tunniste).toBeGreaterThan(-1);
  let syv = 0;
  for (let k = lahde.indexOf('{', i); k < lahde.length; k++) { if (lahde[k] === '{') syv++; else if (lahde[k] === '}') { syv--; if (!syv) return lahde.slice(i, k + 1); } }
  throw new Error('sulkeet');
}

/* ── Vartija: globaalien nimien törmäykset (puhdas skanneri, testattu synteettisellä esimerkillä) ── */
function skannaaTuplat(html) {
  const skriptit = [...html.matchAll(/<script(?![^>]*\bsrc=)[^>]*>([\s\S]*?)<\/script>/g)].map((m) => m[1]);
  const decl = {}, winFn = {}, varjostus = [];
  skriptit.forEach((sc) => { for (const m of sc.matchAll(/^(?:async\s+)?function\s+([A-Za-z_$][\w$]*)\s*\(/gm)) (decl[m[1]] = decl[m[1]] || []).push(m.index); });
  skriptit.forEach((sc) => {
    for (const m of sc.matchAll(/\bwindow\.([A-Za-z_$][\w$]*)\s*=(?!=)\s*([^;\n]{0,50})/g)) {
      const n = m[1], rhs = m[2].trim();
      const funktio = /^(async\s+function|function|\([^)]*\)\s*=>|[A-Za-z_$][\w$]*\s*=>)/.test(rhs);
      if (funktio) (winFn[n] = winFn[n] || []).push(m.index);
      const alias = new RegExp('^' + n.replace(/\$/g, '\\$') + '\\s*(;|,|$|\\))').test(rhs);   // window.X = X (alias) = ok
      if (decl[n] && funktio && !alias) varjostus.push(n);
    }
  });
  return { varjostus, declTuplat: Object.keys(decl).filter((k) => decl[k].length > 1), winTuplat: Object.keys(winFn).filter((k) => winFn[k].length > 1) };
}
describe('vartija: ei kahta samannimistä globaalia VP_v25:ssä', () => {
  it('skanneri löytää synteettisen varjostuksen (oma testi: vartija ei ole vacuous)', () => {
    const r = skannaaTuplat('<script>\nasync function _x(a,b,c){}\nwindow._x = function (a) {};\nfunction _y(){}\nfunction _y(){}\nwindow._z = function(){};\nwindow._z = function(){};\nfunction _a(){}\nwindow._a = _a;\n</script>');
    expect(r.varjostus).toEqual(['_x']); expect(r.declTuplat).toEqual(['_y']); expect(r.winTuplat).toEqual(['_z']);   // alias window._a = _a EI laukaise
  });
  it('VP_v25: ei varjostusta, ei tuplia (funktiodeklaraatio vs window-funktio; deklaraatio×2; window-funktio×2)', () => {
    const r = skannaaTuplat(VP);
    expect(r.varjostus, 'varjostus').toEqual([]); expect(r.declTuplat, 'deklaraatiotuplat').toEqual([]); expect(r.winTuplat, 'window-tuplat').toEqual([]);
  });
  it('modaali window._vpKirjaaReview (1 arg) ja kirjoittaja _vpKirjoitaReview (5 arg) ovat eri nimiä; onclickit osoittavat modaaliin', () => {
    expect(VP).toMatch(/window\._vpKirjaaReview = function \(pid\) \{/); expect(VP).toMatch(/async function _vpKirjoitaReview\(pid, pvm, review, pelaaja, lisa\) \{/);   // R6.3-E: + lisa (pelaajadokin lisäkentät samaan batchiin)
    expect(VP).not.toMatch(/async function _vpKirjaaReview\(/);
    expect((VP.match(/onclick="_vpKirjaaReview\(/g) || []).length).toBeGreaterThanOrEqual(1);
    expect(VP).not.toMatch(/await _vpKirjaaReview\(/);   // kirjoittajaa ei kutsuta modaalin nimellä
  });
  it('REGRESSIO: selaimen globaali-semantiikka (window = global): deklaraatio + myöhempi modaali-sijoitus → kirjoittaja säilyy', () => {
    const ctx = {}; ctx.window = ctx; vm.createContext(ctx);
    vm.runInContext(pura('window._vpKirjaaReview = function (pid)').replace(/\{[\s\S]*\}$/, '{ return "modaali"; }') + ';\n' + pura('async function _vpKirjoitaReview(') + '\n', ctx);
    expect(ctx._vpKirjoitaReview.length).toBe(5); expect(ctx._vpKirjaaReview.length).toBe(1); expect(ctx._vpKirjoitaReview).not.toBe(ctx._vpKirjaaReview);
  });
});

/* ── Firestore-tynkä: batch.set kirjaa polut, commit voi kaatua ── */
function mockDb({ kaada = false } = {}) {
  const kirjoitukset = [];
  const doc = (p) => ({ path: p, collection: (c) => ({ doc: (id) => doc(p + '/' + c + '/' + id) }) });
  const db = { collection: (c) => ({ doc: (id) => doc(c + '/' + id) }),
    batch: () => { const op = []; return { set: (ref, data, opts) => op.push({ polku: ref.path, data, opts }), commit: async () => { if (kaada) throw new Error('permission-denied'); kirjoitukset.push(...op); } }; } };
  return { db, kirjoitukset };
}
const PID = 'm93GBdOaGCUuenMiCL0I';   // KPV U13 -testipelaaja (Topias)
const PID2 = 'kpvU13Testi2';
const POLKU = (p) => 'seurat/kpv/pelaajat/' + p;

describe('_vpKirjoitaReview — kirjoittaja', () => {
  const aja = (m) => { const c = { db: m.db, _seuraId: 'kpv', window: { TM_KEHITYSSILMUKKA: require('../lib/tm_kehityssilmukka.js') }, Object, Array }; vm.createContext(c); vm.runInContext(pura('async function _vpKirjoitaReview(') + '\nthis.f = _vpKirjoitaReview;', c); return c.f; };
  it('kirjoittaa reviewit/{pvm} + pikakentät yhteen batchiin, vain tämän pelaajan polkuihin (KPV)', async () => {
    const m = mockDb(); await aja(m)(PID, '2026-10-05', { tyyppi: 'mdr', pvm: '2026-10-05' });
    expect(m.kirjoitukset.map((o) => o.polku)).toEqual([POLKU(PID) + '/reviewit/2026-10-05', POLKU(PID)]);
    expect(m.kirjoitukset[1].data).toEqual({ review_viimeisin_pvm: '2026-10-05', review_viimeisin_tyyppi: 'mdr' });
  });
  it('väärä kutsu (modaalikutsu 1 argumentilla / puuttuva pvm / review) HEITTÄÄ eikä kirjoita mitään (ei hiljaista valeonnistumista)', async () => {
    const m = mockDb(); const f = aja(m);
    await expect(f(PID)).rejects.toThrow(/vaaditaan/); await expect(f(PID, '2026-10-05')).rejects.toThrow(); await expect(f(PID, '', {})).rejects.toThrow(); await expect(f('', '2026-10-05', {})).rejects.toThrow();
    expect(m.kirjoitukset).toEqual([]);
  });
});

describe('MDT-review (_mdtMerkitseReview): ✓ vasta onnistumisen jälkeen', () => {
  function ymp(m) {
    const log = { toastit: [], renderit: 0 };
    const p = { id: PID, joukkue: 'KPV U13', review_viimeisin_pvm: '2026-09-01', review_viimeisin_tyyppi: 'mdr' };
    const c = { db: m.db, _seuraId: 'kpv', _mdtPid: PID, _pelaajat: [p], _uid: 'vp-uid', tmPaivaIso: () => '2026-10-05', vpT: (x) => x,
      firebase: { auth: () => ({ currentUser: { uid: 'vp-uid', getIdTokenResult: async () => ({ claims: { rooli: 'vp' } }) } }) },
      document: { getElementById: () => ({ value: 'päätös' }) }, toast: (t, tyyppi) => log.toastit.push([t, tyyppi]),
      _renderMDTProfiili: () => { log.renderit++; }, renderReviewit: () => { log.renderit++; }, renderTilanne: () => { log.renderit++; }, console: { warn() {} }, window: { TM_KEHITYSSILMUKKA: require('../lib/tm_kehityssilmukka.js') }, Object, Array };
    vm.createContext(c);
    vm.runInContext(pura('async function _vpKirjoitaReview(') + '\n' + pura('window._mdtMerkitseReview = async function') + ';', c);
    return { c, log, p };
  }
  it('onnistuu: batch kirjoitettu, paikallinen tila päivittyy, "✓ Review merkitty tehdyksi" (ok)', async () => {
    const m = mockDb(); const { c, log, p } = ymp(m);
    await c.window._mdtMerkitseReview();
    expect(m.kirjoitukset.map((o) => o.polku)).toEqual([POLKU(PID) + '/reviewit/2026-10-05', POLKU(PID)]);
    expect(p.review_viimeisin_pvm).toBe('2026-10-05');
    expect(log.toastit).toEqual([['✓ Review merkitty tehdyksi', 'ok']]); expect(log.renderit).toBe(3);
  });
  it('kirjoitus epäonnistuu: virheilmoitus (error), EI "✓", paikallinen tila ennallaan, ei uudelleenpiirtoa onnistuneena', async () => {
    const m = mockDb({ kaada: true }); const { c, log, p } = ymp(m);
    await c.window._mdtMerkitseReview();
    expect(m.kirjoitukset).toEqual([]);
    expect(p.review_viimeisin_pvm).toBe('2026-09-01');
    expect(log.toastit.length).toBe(1); expect(log.toastit[0][1]).toBe('error'); expect(log.toastit[0][0]).toMatch(/Tallennus epäonnistui/); expect(log.toastit[0][0]).not.toMatch(/✓/);
    expect(log.renderit).toBe(0);
  });
});

describe('Bulk (_vpCockpitBulkMerkitse): ok++ ja ✓ vasta kirjoituksen onnistuttua', () => {
  function ymp(kaadaPidit) {
    const kirjoitukset = [], log = { toastit: [], renderit: 0 };
    const doc = (p) => ({ path: p, collection: (c) => ({ doc: (id) => doc(p + '/' + c + '/' + id) }) });
    const db = { collection: (c) => ({ doc: (id) => doc(c + '/' + id) }),
      batch: () => { const op = []; return { set: (ref) => op.push(ref.path), commit: async () => { if (kaadaPidit.some((k) => op[0].includes('/' + k + '/'))) throw new Error('permission-denied'); kirjoitukset.push(...op); } }; } };
    const p1 = { id: PID, joukkue: 'KPV U13' }, p2 = { id: PID2, joukkue: 'KPV U13' };
    const c = { db, _seuraId: 'kpv', _isDemoMode: false, _reviewSel: { [PID]: 1, [PID2]: 1 }, _reviewSelMode: true, _pelajaat: null, _pelaajat: [p1, p2], _uid: 'vp-uid',
      _vpVoiMuokata: () => true, tmPaivaIso: () => '2026-10-05', vpT: (x) => x, toast: (t, tyyppi) => log.toastit.push([t, tyyppi]), renderReviewit: () => { log.renderit++; },
      firebase: { auth: () => ({ currentUser: { uid: 'vp-uid', getIdToken: async () => 't' } }) }, Array, Object, Promise, Math, console: { warn() {} },
      window: { confirm: () => true, _vpRooli: 'vp', TM_KEHITYSSILMUKKA: require('../lib/tm_kehityssilmukka.js') } };
    vm.createContext(c);
    vm.runInContext(pura('async function _vpKirjoitaReview(') + '\n' + pura('window._vpCockpitBulkMerkitse = async function') + ';', c);
    return { c, log, p1, p2, kirjoitukset };
  }
  it('kaikki onnistuvat: "✓ Review merkitty 2 pelaajalle" (ok), molempien paikallinen tila päivittyy', async () => {
    const { c, log, p1, p2 } = ymp([]); await c.window._vpCockpitBulkMerkitse();
    expect(log.toastit).toEqual([['✓ Review merkitty 2 pelaajalle', 'ok']]); expect(p1.review_viimeisin_pvm).toBe('2026-10-05'); expect(p2.review_viimeisin_pvm).toBe('2026-10-05');
  });
  it('yksi epäonnistuu: ok++ vain onnistuneesta, virhe näkyy (error), epäonnistuneen paikallinen tila ENNALLAAN', async () => {
    const { c, log, p1, p2, kirjoitukset } = ymp([PID2]); await c.window._vpCockpitBulkMerkitse();
    expect(log.toastit).toEqual([['✓ Review merkitty 1 pelaajalle · 1 epäonnistui', 'error']]);
    expect(p1.review_viimeisin_pvm).toBe('2026-10-05'); expect(p2.review_viimeisin_pvm).toBeUndefined();
    expect(kirjoitukset.every((k) => k.startsWith(POLKU(PID)))).toBe(true);   // vain onnistunut KPV U13 -pelaaja
  });
  it('kaikki epäonnistuvat: EI "✓" lainkaan, vain virheilmoitus (error), ei paikallista päivitystä', async () => {
    const { c, log, p1, p2 } = ymp([PID, PID2]); await c.window._vpCockpitBulkMerkitse();
    expect(log.toastit).toEqual([['2 epäonnistui', 'error']]); expect(log.toastit[0][0]).not.toMatch(/✓/);
    expect(p1.review_viimeisin_pvm).toBeUndefined(); expect(p2.review_viimeisin_pvm).toBeUndefined();
  });
});
