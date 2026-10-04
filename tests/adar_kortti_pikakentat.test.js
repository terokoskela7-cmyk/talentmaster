/**
 * Masterin kortti näytti "ei havaintoja" tallennuksen jälkeen: kortti lukee PIKAKENTISTÄ (adar_havaintoja/adar_pvm),
 * pikakenttien kirjoituksen tulos ei kulkenut kenellekään (console.warn) ja Master sulki iframen heti ennen kuittausta
 * eikä lista-valinnassa tiennyt pelaajaa (#746 jälkeen oletus). Nyt: tulos kulkee isännälle, Master tekee varapolun.
 */
import { describe, it, expect } from 'vitest';
import { readFileSync } from 'fs';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';
import vm from 'vm';

const juuri = join(dirname(fileURLToPath(import.meta.url)), '..');
const ADAR = readFileSync(join(juuri, 'TalentMaster_ADAR_Pikakortti.html'), 'utf8');
const MASTER = readFileSync(join(juuri, 'TalentMaster_Master_v16.html'), 'utf8');
function pura(src, tunniste) {
  const i = src.indexOf(tunniste); expect(i, tunniste).toBeGreaterThan(-1);
  let syv = 0;
  for (let k = src.indexOf('{', i); k < src.length; k++) { if (src[k] === '{') syv++; else if (src[k] === '}') { syv--; if (!syv) return src.slice(i, k + 1); } }
  throw new Error('sulkeet');
}
const tick = () => new Promise((r) => setTimeout(r, 0));

describe('ADAR · _phKirjoitaHavaintoJaPikakentat kertoo pikakenttien tuloksen', () => {
  function aja({ pikakenttaHylkaa, kentat }) {
    const kirjatut = [];
    const pRef = { id: 'p1', collection: () => ({ get: async () => ({ docs: [] }) }), get: async () => ({ exists: true, data: () => ({}) }),
      set: async (d) => { if (pikakenttaHylkaa) throw Object.assign(new Error('denied'), { code: 'permission-denied' }); kirjatut.push('pelaaja'); } };
    const havRef = { id: 'h1', set: async () => { kirjatut.push('havainto'); } };
    const ctx = { _PH_DB: {}, _phPelaajaRef: () => pRef, _phIka: () => 13, console: { warn() {} }, window: { _pelaajaMap: {} }, Date,
      tmAdarPikakentat: () => kentat };
    vm.createContext(ctx);
    vm.runInContext(pura(ADAR, 'async function _phKirjoitaHavaintoJaPikakentat(') + '\nthis.f = _phKirjoitaHavaintoJaPikakentat;', ctx);
    return { p: ctx.f(havRef, { pisteet: { A: 2 } }, 'kpv', 'p1', 1, false), kirjatut };
  }
  it('onnistuu → pikakentat {ok:true}', async () => {
    const r = aja({ kentat: { adar_havaintoja: 1, adar_pvm: 'x' } });
    expect(await r.p).toEqual({ ok: true });
    expect(r.kirjatut).toEqual(['havainto', 'pelaaja']);
  });
  it('pelaajadokin kirjoitus hylätään (Rules) → havainto silti tallessa, tulos {ok:false, code:permission-denied}', async () => {
    const r = aja({ kentat: { adar_havaintoja: 1 }, pikakenttaHylkaa: true });
    expect(await r.p).toEqual({ ok: false, code: 'permission-denied' });
    expect(r.kirjatut).toEqual(['havainto']);
  });
  it('laskenta ei tuota kenttiä → {ok:false, code:laskenta}', async () => {
    const r = aja({ kentat: null });
    expect(await r.p).toEqual({ ok: false, code: 'laskenta' });
  });
});

describe('ADAR · _phTallenna ilmoittaa isännälle VASTA kuittauksen jälkeen', () => {
  function aja({ havaintoHylkaa, pikakentat, offline }) {
    const viestit = [];
    let vapauta;
    const odota = new Promise((r) => { vapauta = r; });
    const kirjoitus = odota.then(() => { if (havaintoHylkaa) throw Object.assign(new Error('x'), { code: 'permission-denied' }); return pikakentat; });
    const dok = { id: 'h1', collection: () => ({ doc: () => dok }) };
    const ctx = vm.createContext({
      console: { error() {}, warn() {} }, Date, Promise, Object, Array, String, JSON, setTimeout,
      navigator: { onLine: !offline },
      _PH_DB: {}, _PH_AUTH: { currentUser: { uid: 'u1', displayName: 'V' } },
      window: { _tmSeuraId: 'kpv', _tmRooli: 'valmentaja', _pelaajaMap: { p1: {} }, firebase: { firestore: { FieldValue: { serverTimestamp: () => 1 } } },
        _phTila: { pelaajaId: 'p1', porras: 1, porrasTallennettu: null, porrasNostettu: false, konteksti: 'harjoitus', pisteet: { A: 2 }, havaitut: {}, teksti: '', nakyvyys: false, tehdyt: {}, naytto: 'havainto', viimeisin: null, odottaa: false },
        parent: { postMessage: (m) => viestit.push(m) } },
      tmPaivaIso: () => '2026-10-04', _phDimit: () => ['A'], _nakArvo: () => 'valmentajat', _adarTekijaNimi: () => 'V', _adarEstonSyy: () => 'syy',
      _showToast() {}, _phRender() {}, _phSeuraaKirjoitusta() {}, tmAdarBand: () => ['a'],
      _luonnosKeraa: () => ({}), _luonnosMerkitse() {}, _luonnosTyhjenna() {}, _luonnosAvaa() {},
      _phPelaajaRef: () => dok, _phKirjoitaHavaintoJaPikakentat: () => kirjoitus,
    });
    ctx.window.window = ctx.window; ctx.window.parent.parent = null;
    vm.runInContext(pura(ADAR, 'async function _phTallenna(') + '\nthis.f = _phTallenna;', ctx);
    return { ctx, viestit, vapauta, kirjoitus };
  }
  it('EI VIESTIÄ ennen kuittausta (Master sulkisi iframen ja virhe jäisi näkymättömiin)', async () => {
    const y = aja({ pikakentat: { ok: true } });
    await y.ctx.f(); await tick();
    expect(y.viestit, 'viesti lähti ennen kuittausta').toEqual([]);
    y.vapauta(); await tick(); await tick();
    expect(y.viestit).toEqual([{ type: 'tm:adar:saved', pelaajaId: 'p1', pikakentat: true, pikakenttaVirhe: null }]);
  });
  it('pikakentät epäonnistuivat → viesti kertoo (pikakentat:false + koodi) → Master tekee varapolun', async () => {
    const y = aja({ pikakentat: { ok: false, code: 'permission-denied' } });
    await y.ctx.f(); y.vapauta(); await tick(); await tick();
    expect(y.viestit[0]).toMatchObject({ type: 'tm:adar:saved', pelaajaId: 'p1', pikakentat: false, pikakenttaVirhe: 'permission-denied' });
  });
  it('havainnon kirjoitus hylätään → tm:adar:failed, EI saved-viestiä (iframe jää auki virhebannerin kanssa)', async () => {
    const y = aja({ havaintoHylkaa: true, pikakentat: { ok: true } });
    await y.ctx.f(); y.vapauta(); await tick(); await tick();
    expect(y.viestit).toEqual([{ type: 'tm:adar:failed', pelaajaId: 'p1', koodi: 'permission-denied' }]);
  });
  it('offline → ilmoitus heti (jonossa:true), ei kuittausta jäädä odottamaan', async () => {
    const y = aja({ offline: true, pikakentat: { ok: true } });
    await y.ctx.f(); await tick();
    expect(y.viestit).toEqual([{ type: 'tm:adar:saved', pelaajaId: 'p1', jonossa: true }]);
  });
});

describe('Master · _pikakorttiValmis: pikakenttien varapolku ja lievä huomautus', () => {
  function aja(d, { fallbackOk }) {
    const loki = [];
    const ctx = vm.createContext({ console: { warn() {} }, Promise, Object,
      masterT: (s) => s, toast: (m) => loki.push('toast:' + m),
      paivitaAdarPikakentat: async () => { loki.push('fallback'); return fallbackOk; },
      _pikakorttiLataaPelaaja: async () => { loki.push('lataa'); },
      _adarSentry: (paikka, koodi) => loki.push('sentry:' + paikka + ':' + koodi) });
    vm.runInContext(pura(MASTER, 'async function _pikakorttiValmis(') + '\nthis.f = _pikakorttiValmis;', ctx);
    return ctx.f('p1', d).then(() => loki);
  }
  it('ADARin pikakentät OK → ei varapolkua, kortti ladataan uudelleen', async () => {
    expect(await aja({ pikakentat: true }, { fallbackOk: true })).toEqual(['lataa']);
  });
  it('ADARin pikakentät epäonnistuivat → Sentry + Masterin oma laskenta → kortti ladataan', async () => {
    expect(await aja({ pikakentat: false, pikakenttaVirhe: 'permission-denied' }, { fallbackOk: true }))
      .toEqual(['sentry:adar-iframe:permission-denied', 'fallback', 'lataa']);
  });
  it('myös varapolku kaatuu → lievä huomautus "yhteenveto päivittyy myöhemmin"', async () => {
    const l = await aja({ pikakentat: false, pikakenttaVirhe: 'permission-denied' }, { fallbackOk: false });
    expect(l).toContain('toast:Havainto tallennettu – yhteenveto päivittyy myöhemmin');
    expect(l).not.toContain('lataa');
  });
  it('offline-jonossa → ei tehdä mitään', async () => {
    expect(await aja({ jonossa: true }, { fallbackOk: true })).toEqual([]);
  });
  it('viestikuuntelija: pelaaja VIESTISTÄ (ei vain avaushetken pid), failed ei sulje modaalia', () => {
    const k = MASTER.slice(MASTER.indexOf("window.addEventListener('message', function (ev) {\n  var d = ev && ev.data;\n  var tyyppi"));
    const lohko = k.slice(0, k.indexOf('\n});') + 4);
    expect(lohko).toContain("(d && d.pelaajaId) || window._pikakorttiPid");
    const failedHaara = lohko.slice(lohko.indexOf("tyyppi === 'tm:adar:failed'"), lohko.indexOf("document.getElementById('_pkModal')?.remove()"));
    expect(failedHaara).toContain('return;');
    expect(failedHaara).not.toContain('_pkModal');
  });
});
