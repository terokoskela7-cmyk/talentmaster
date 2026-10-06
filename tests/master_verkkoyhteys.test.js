/**
 * Master_v16 — selkeä viesti kun verkkoa ei ole (EI offline-tukea vielä; docs/MASTER_OFFLINE_SUUNNITELMA.md §10).
 * Ilman persistenceä offline-luku palautti tyhjän listan ilman virhettä → valmentaja näki tyhjän joukkueen.
 *
 * Vartioi (funktiot PURETAAN LÄHTEESTÄ ja AJETAAN vm:ssä tyngillä):
 *   1. offline → ilmoitus näkyy, pelaajalistaa EI korvata tyhjällä eikä näkymiä renderöidä "ei pelaajia" -tilaan
 *   2. online-tapahtuma → ilmoitus pois + lataus uudelleen (alkulatauksen verkkovirhe → sivun uudelleenlataus)
 *   3. tallennus offline / verkkovirhe → selkeä viesti ENNEN kirjoitusta, geneerinen virhetoasti ei korvaa sitä,
 *      lomakkeen sulkevat tallennukset tarkistavat verkon ennen sulkua (lomake ja tiedot säilyvät)
 *   4. ei enablePersistencea, kaikki tallennukset kulkevat _mTuoreToken-apurin kautta
 */
import { describe, it, expect } from 'vitest';
import { readFileSync } from 'fs';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';
import vm from 'vm';

const juuri = join(dirname(fileURLToPath(import.meta.url)), '..');
const M = readFileSync(join(juuri, 'TalentMaster_Master_v16.html'), 'utf8');
const ILMOITUS = 'Ei verkkoyhteyttä. Tiedot päivittyvät, kun yhteys palaa.';
const TALLENNUS = 'Tallennus ei onnistunut, koska verkkoyhteys puuttuu. Yritä uudelleen, kun yhteys palaa.';

function runko(tunniste) {
  const i = M.indexOf(tunniste);
  expect(i, tunniste + ' puuttuu').toBeGreaterThan(-1);
  let syv = 0;
  for (let k = M.indexOf('{', i); k < M.length; k++) {
    if (M[k] === '{') syv++;
    else if (M[k] === '}') { syv--; if (syv === 0) return M.slice(i, k + 1); }
  }
  throw new Error('loppu puuttuu: ' + tunniste);
}
const apuriLohko = M.slice(M.indexOf('const M_VERKKO_ILMOITUS'), M.indexOf('async function _lataaPelaajat()'));

function ymparisto({ online = true, pelaajat = [{ id: 'm93GBdOaGCUuenMiCL0I', data: () => ({ sukunimi: 'Koskela' }) }] } = {}) {
  const elementit = {}, kuuntelijat = {}, toastit = [], kutsut = [];
  const document = {
    getElementById: (id) => elementit[id] || null,
    createElement: () => { const el = { attrs: {}, textContent: '', setAttribute(k, v) { this.attrs[k] = v; }, remove() { delete elementit[this.id]; } }; return el; },
    body: { appendChild: (el) => { elementit[el.id] = el; } },
  };
  const kysely = { get: async () => { kutsut.push('get'); return { docs: pelaajat }; }, where: () => kysely };
  const ctx = {
    document, navigator: { onLine: online }, console: { warn() {}, error() {} },
    window: { addEventListener: (t, f) => { kuuntelijat[t] = f; } },
    location: { reload: () => kutsut.push('reload') },
    masterT: (t) => t, Date,
    tmPhvKoodi: require('../lib/tm_phv_tila.js').tmPhvKoodi, tmPhvIlmoitettuPH: require('../lib/tm_phv_tila.js').tmPhvIlmoitettuPH, tmPhvEiMitattu: require('../lib/tm_phv_tila.js').tmPhvEiMitattu,   // PR C (+ päätös B)
    _demo: false, _seuraId: 'kpv', _joukkue: null, _pelaajatData: [{ id: 'vanha' }],
    _db: { collection: () => ({ doc: () => ({ collection: () => kysely }) }) },
    lataaKonseptikerros: async () => {}, _paivitaKaikkiNakymat: () => kutsut.push('render'),
    _lataaKirjaukset() {}, _kuunteleVpViestit() {}, _lataaTestitapahtumat: async () => kutsut.push('testit'),
    toast: (m, k) => toastit.push([m, k]),
  };
  vm.createContext(ctx);
  // let/const näkyviin kontekstiin: ajetaan samassa skriptissä ja viedään ulos
  vm.runInContext(apuriLohko + '\n' + runko('async function _lataaPelaajat()')
    + '\nthis._mLue = () => ({ asti: _mVerkkoVirheAsti, kaynnistys: _mKaynnistysVerkkovirhe });'
    + '\nthis._mAsetaKaynnistys = (v) => { _mKaynnistysVerkkovirhe = v; };'
    + '\nthis._lataaPelaajat = _lataaPelaajat; this._mTuoreToken = _mTuoreToken; this._mOnVerkkovirhe = _mOnVerkkovirhe; this._mVerkkoEnnenSulkua = _mVerkkoEnnenSulkua;', ctx);
  return { ctx, elementit, kuuntelijat, toastit, kutsut };
}

describe('Master_v16 · verkkoyhteys: lataus', () => {
  it('offline → ilmoitus näkyy, vanhaa listaa ei korvata tyhjällä, ei renderöintiä eikä Firestore-kyselyä', async () => {
    const y = ymparisto({ online: false });
    await y.ctx._lataaPelaajat();
    expect(y.elementit.mVerkkoIlmoitus.textContent).toBe(ILMOITUS);
    expect(y.elementit.mVerkkoIlmoitus.attrs).toMatchObject({ role: 'status', 'aria-live': 'polite' });
    expect(y.ctx._pelaajatData).toEqual([{ id: 'vanha' }]);
    expect(y.kutsut).toEqual([]);
  });
  it('yhteys katkeaa kesken: välimuistin tyhjä tulos ≠ ei pelaajia → ilmoitus, listaa ei tyhjennetä', async () => {
    const y = ymparisto({ online: true, pelaajat: [] });
    y.ctx._db = { collection: () => ({ doc: () => ({ collection: () => ({ get: async () => { y.ctx.navigator.onLine = false; return { docs: [] }; } }) }) }) };
    await y.ctx._lataaPelaajat();
    expect(y.elementit.mVerkkoIlmoitus).toBeTruthy();
    expect(y.ctx._pelaajatData).toEqual([{ id: 'vanha' }]);
    expect(y.kutsut).not.toContain('render');
  });
  it('verkossa → normaali lataus ja renderöinti, ei ilmoitusta', async () => {
    const y = ymparisto({ online: true });
    await y.ctx._lataaPelaajat();
    expect(y.ctx._pelaajatData.map((p) => p.id)).toEqual(['m93GBdOaGCUuenMiCL0I']);
    expect(y.kutsut).toContain('render');
    expect(y.elementit.mVerkkoIlmoitus).toBeUndefined();
  });
  it('offline-tapahtuma näyttää ilmoituksen; online-tapahtuma poistaa sen ja lataa pelaajat + testit uudelleen', async () => {
    const y = ymparisto({ online: false });
    y.kuuntelijat.offline();
    expect(y.elementit.mVerkkoIlmoitus).toBeTruthy();
    y.ctx.navigator.onLine = true;
    y.kuuntelijat.online();
    await new Promise((r) => setTimeout(r, 0));
    expect(y.elementit.mVerkkoIlmoitus).toBeUndefined();
    expect(y.kutsut).toEqual(expect.arrayContaining(['get', 'render', 'testit']));
  });
  it('alkulataus kaatui verkkoon → online = sivun uudelleenlataus (ei puolivalmista tilaa)', () => {
    const y = ymparisto({ online: true });
    y.ctx._mAsetaKaynnistys(true);
    y.kuuntelijat.online();
    expect(y.kutsut).toEqual(['reload']);
  });
  it('kirjautumisen jälkeinen virhe verkon takia → ilmoitus, ei demoa eikä "istunto vanhentunut"', () => {
    const i = M.indexOf("console.warn('[v16 auth]', e.message);");
    const lohko = M.slice(i, i + 900);
    expect(lohko).toMatch(/_mOnVerkkovirhe\(e\) \|\| _mOnOffline\(\)\)\) \{[\s\S]*_mKaynnistysVerkkovirhe = true; _mVerkkoIlmoitus\(true\); return;/);
    expect(lohko.indexOf('_mKaynnistysVerkkovirhe = true')).toBeLessThan(lohko.indexOf('_kaynnistaDemoTila()'));
  });
});

describe('Master_v16 · verkkoyhteys: tallennus', () => {
  it('offline → selkeä viesti ja heitto ENNEN tokenia/kirjoitusta', async () => {
    const y = ymparisto({ online: false });
    let tokenKutsuttu = false;
    await expect(y.ctx._mTuoreToken({ getIdToken: async () => { tokenKutsuttu = true; } })).rejects.toMatchObject({ code: 'tm/offline', message: TALLENNUS });
    expect(tokenKutsuttu).toBe(false);
    expect(y.toastit).toEqual([[TALLENNUS, 'error']]);
  });
  it('verkossa mutta tokenin verkkovirhe (auth/network-request-failed) → sama viesti, virhe heitetään eteenpäin', async () => {
    const y = ymparisto({ online: true });
    const virhe = Object.assign(new Error('network'), { code: 'auth/network-request-failed' });
    await expect(y.ctx._mTuoreToken({ getIdToken: async () => { throw virhe; } })).rejects.toBe(virhe);
    expect(y.toastit).toEqual([[TALLENNUS, 'error']]);
  });
  it('verkossa normaalisti → getIdToken(true) kuten ennen (§7.2), ei toastia; puuttuva käyttäjä → ei mitään', async () => {
    const y = ymparisto({ online: true });
    const args = [];
    await y.ctx._mTuoreToken({ getIdToken: async (f) => { args.push(f); return 't'; } });
    expect(args).toEqual([true]); expect(y.toastit).toEqual([]);
    await expect(y.ctx._mTuoreToken(null)).resolves.toBeUndefined();
  });
  it('tallennuskohdan geneerinen virhetoasti verkkovirheen jälkeen näyttää verkkoviestin (ei "Tallennus epäonnistui")', () => {
    const toastRunko = runko('function toast(msg, actionKey)');
    const el = { items: [] };
    const ctx = { masterT: (t) => t, Date, M_VERKKO_TALLENNUS: TALLENNUS, _mVerkkoVirheAsti: Date.now() + 3000, _lastAction: null, _toastTimer: null,
      clearTimeout() {}, setTimeout() {},
      document: { getElementById: () => ({ querySelectorAll: () => [], appendChild: (i) => el.items.push(i) }), createElement: () => ({}) } };
    vm.createContext(ctx);
    vm.runInContext(toastRunko + '\nthis.toast = toast;', ctx);
    ctx.toast('Tallennus epäonnistui', 'error');
    expect(el.items[0].innerHTML).toContain(TALLENNUS);
    expect(el.items[0].className).toBe('toast-item toast-pitka');   // pitkä viesti rivittyy mobiilissa
    ctx._mVerkkoVirheAsti = 0;
    ctx.toast('Tallennus epäonnistui', 'error');
    expect(el.items[1].innerHTML).toContain('Tallennus epäonnistui');
  });
  it('lomakkeen sulkevat tallennukset tarkistavat verkon ENNEN lomakkeen sulkua ja tilan muutosta (tiedot säilyvät)', () => {
    for (const [f, sulku] of [['window._msAsetaFyysFokus = async function', "getElementById('_msFyysModal')?.remove()"],
      ['window._ohjKaytaOhjelma = async function', "getElementById('_ohjValitseModal')?.remove()"],
      ['window._msTallenna = async function', "getElementById('_msSulkuModal')?.remove()"]]) {
      const r = runko(f);
      const tarkistus = r.indexOf('if (!_mVerkkoEnnenSulkua()) return;');
      expect(tarkistus, f).toBeGreaterThan(-1);
      expect(tarkistus, f + ': tarkistus ennen sulkua').toBeLessThan(r.indexOf(sulku));
      expect(tarkistus, f + ': tarkistus ennen tilan muutosta').toBeLessThan(r.search(/p\.jaksofokus(_historia)? = /));
    }
    const y = ymparisto({ online: false });
    expect(y.ctx._mVerkkoEnnenSulkua()).toBe(false);
    expect(y.toastit).toEqual([[TALLENNUS, 'error']]);
    expect(ymparisto({ online: true }).ctx._mVerkkoEnnenSulkua()).toBe(true);
  });
  it('verkkovirheen tunnistus: unavailable, auth/network-request-failed, offline-failed-precondition; ei permission-deniediä', () => {
    const y = ymparisto();
    for (const e of [{ code: 'unavailable' }, { code: 'auth/network-request-failed' }, { code: 'failed-precondition', message: 'Failed to get document because the client is offline.' }, { message: 'Failed to get document because the client is offline.' }])
      expect(y.ctx._mOnVerkkovirhe(e), JSON.stringify(e)).toBe(true);
    for (const e of [{ code: 'permission-denied' }, { code: 'failed-precondition', message: 'index required' }, null])
      expect(y.ctx._mOnVerkkovirhe(e), JSON.stringify(e)).toBe(false);
  });
});

describe('Master_v16 · verkkoyhteys: rajaukset', () => {
  it('kaikki tallennukset kulkevat _mTuoreToken-apurin kautta; ei enablePersistencea', () => {
    expect(M.match(/\.getIdToken\(true\)/g)).toHaveLength(1);   // vain apurin sisällä (kommenteissa ilman pistettä)
    expect(runko('async function _mTuoreToken(cu)')).toContain('cu.getIdToken(true)');
    expect((M.match(/await _mTuoreToken\(/g) || []).length).toBe(23);   // 23 tallennuskohtaa (+ vastuuhenkilön asetus 5.10.2026, + valinta-viestin luetuksi-merkintä D-2)
    expect(M).not.toMatch(/enablePersistence\(|enableIndexedDbPersistence|enableMultiTabIndexedDbPersistence/);
  });
});
