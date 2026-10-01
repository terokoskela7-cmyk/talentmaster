/**
 * Lapsenvaihdin (1.10.2026): useamman lapsen perheet. 28 perhettä näki vain yhden (satunnaisen) lapsensa.
 *  - haeLapsiHuoltajalle: järjestys vanhin ensin → etunimi, + joukkueNimi/syntymaVuosi, vain seurat/{sid}/pelaajat
 *  - Vanhempi_v2: _vaihdaLapsi nollaa lapsikohtaisen tilan; myöhässä saapuva edellisen lapsen data hylätään;
 *    valinta muistetaan huoltajan uid:llä; linkkireitillä URL:n lapsi oletuksena ja lista haetaan silti.
 */
import { describe, it, expect } from 'vitest';
import { readFileSync } from 'fs';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';
import vm from 'vm';

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..');
const CF = readFileSync(join(ROOT, 'functions', 'index.js'), 'utf8');
const HTML = readFileSync(join(ROOT, 'TalentMaster_Vanhempi_v2.html'), 'utf8');
const valilta = (src, alku, loppu) => { const i = src.indexOf(alku); const j = src.indexOf(loppu, i); if (i < 0 || j < 0) throw new Error('ei löydy: ' + alku); return src.slice(i, j); };

/* ── Palvelin ─────────────────────────────────────────────────────────────── */
class HttpsError extends Error { constructor(c, m) { super(m); this.code = c; } }
function cfYmp(docs) {
  const ketju = { region() { return ketju; }, https: { onCall: (fn) => fn, HttpsError } };
  const viite = (polku) => { const o = polku.split('/'); let r = null; for (let i = 0; i < o.length; i += 2) r = { id: o[i + 1], parent: { id: o[i], parent: r } }; return r; };
  const firestore = () => ({ collectionGroup: () => ({ where: () => ({ limit: () => ({ get: async () => {
    const d = Object.entries(docs).map(([p, x]) => ({ id: p.split('/').pop(), ref: viite(p), data: () => x }));
    return { empty: d.length === 0, docs: d };
  } }) }) }) });
  const ctx = { functions: ketju, exports: {}, admin: { firestore }, console: { error() {} }, String, Number, Infinity };
  vm.createContext(ctx);
  vm.runInContext(valilta(CF, 'function jarjestaHuoltajanLapset(', '// ═══════════════════════════════════════════════════════════════════════════\n// N1 NOTIFIKAATIOT'), ctx);
  return ctx.exports.haeLapsiHuoltajalle;
}
const H = { auth: { uid: 'h1', token: { email: 'tero@x.fi' } } };

describe('haeLapsiHuoltajalle (ajettu)', () => {
  it('vanhin ensin, sama vuosi → etunimi; puuttuva vuosi loppuun; kentät joukkueNimi + syntymaVuosi', async () => {
    const f = cfYmp({
      'seurat/kpv/pelaajat/tero': { etunimi: 'Tero', sukunimi: 'Testaaja', joukkue: 'KPV U11', syntymaVuosi: 2015 },
      'seurat/kpv/pelaajat/topias': { etunimi: 'Topias', sukunimi: 'Koskela', joukkue: 'KPV U13', syntymaVuosi: 2013, pin: '9278' },
      'seurat/sibbo/pelaajat/anna': { etunimi: 'Anna', joukkueNimi: 'Sibbo T13', syntymaVuosi: '2013' },
      'seurat/kpv/pelaajat/nobody': { etunimi: 'Aapo' },
    });
    const r = await f({}, H);
    expect(r.lapset.map((l) => l.uid)).toEqual(['anna', 'topias', 'tero', 'nobody']);
    expect(r.lapset[1]).toEqual({ seura: 'kpv', uid: 'topias', etunimi: 'Topias', sukunimi: 'Koskela', joukkueNimi: 'KPV U13', syntymaVuosi: 2013 });
    expect(r.lapset[0]).toMatchObject({ seura: 'sibbo', joukkueNimi: 'Sibbo T13', syntymaVuosi: 2013 });
    expect(r.lapset[3].syntymaVuosi).toBe(null);
    expect(r.lapset[1]).not.toHaveProperty('pin');   // ei muita kenttiä
  });
  it('juuritason pelaajat/{palloID} (collectionGroup-osuma) ei kaada eikä tule listaan', async () => {
    const f = cfYmp({ 'pelaajat/123': { etunimi: 'Solo' }, 'seurat/kpv/pelaajat/topias': { etunimi: 'Topias' } });
    const r = await f({}, H);
    expect(r.lapset.map((l) => l.uid)).toEqual(['topias']);
  });
  it('ilman sähköpostia → unauthenticated', async () => {
    await expect(cfYmp({})({}, { auth: { uid: 'x', token: {} } })).rejects.toMatchObject({ code: 'unauthenticated' });
  });
});

/* ── Vanhempi_v2 ──────────────────────────────────────────────────────────── */
const ODOTA = () => new Promise((r) => setTimeout(r, 0));
function sivu({ search = '', lapset = [], muisti = {}, localStorageRikki = false, uid = 'h1' } = {}) {
  const viiveet = {};   // polku → { resolve } kun testi haluaa pidättää vastauksen
  const pidata = (polku) => new Promise((res) => { viiveet[polku] = res; });
  const pelaajat = {
    'seurat/kpv/pelaajat/A': { etunimi: 'Topias', syntymaVuosi: 2013, joukkue: 'KPV U13' },
    'seurat/kpv/pelaajat/B': { etunimi: 'Tero', syntymaVuosi: 2015, joukkue: 'KPV U11' },
    'seurat/sibbo/pelaajat/C': { etunimi: 'Anna', syntymaVuosi: 2016, joukkue: 'Sibbo T10' },
  };
  const pidatettavat = new Set();
  const kysely = (polku) => {
    const q = {
      orderBy: () => q, limit: () => q, where: () => q,
      get: async () => {
        if (pidatettavat.delete(polku)) await pidata(polku);
        const kirjaus = { tyyppi: 'T', luotu: { toDate: () => new Date() } };
        const kokoelma = polku.split('/').pop();
        const omistaja = polku.split('/')[3];
        if (kokoelma === 'kirjaukset') return { empty: false, docs: [{ id: 'k-' + omistaja, data: () => kirjaus }] };
        if (kokoelma === 'havainnot') return { docs: [{ id: 'h-' + omistaja, data: () => ({ teksti: 'viesti ' + omistaja }) }] };
        return { empty: true, docs: [] };
      },
    };
    return q;
  };
  const doc = (polku) => ({
    collection: (k) => coll(polku + '/' + k),
    get: async () => {
      if (pidatettavat.delete(polku)) await pidata(polku);
      const d = pelaajat[polku]; return { exists: !!d, data: () => Object.assign({}, d) };
    },
  });
  const coll = (polku) => Object.assign(kysely(polku), { doc: (id) => doc(polku + '/' + id) });
  const _db = { collection: (k) => coll(k) };
  const ls = new Map(Object.entries(muisti));
  const localStorage = localStorageRikki
    ? { getItem() { throw new Error('ei'); }, setItem() { throw new Error('ei'); } }
    : { getItem: (k) => (ls.has(k) ? ls.get(k) : null), setItem: (k, v) => ls.set(k, String(v)) };
  const kasitellyt = [], toastit = [];
  const url = { href: 'https://x/TalentMaster_Vanhempi_v2.html' + search };
  const ctx = {
    _db, _auth: { currentUser: { uid, email: 'tero@x.fi' } }, localStorage, console: { warn() {} },
    location: { get search() { return new URL(url.href).search; }, get href() { return url.href; } },
    history: { replaceState: (a, b, u) => { url.href = u; } },
    URL, URLSearchParams, JSON, Object, Date, Set, String, Array, Math,
    firebase: { firestore: { Timestamp: { fromDate: (d) => d } } },
    t: (k) => k, _toast: (x) => toastit.push(x), draw() {}, tmHhRivit: undefined,
    _vthEsc: (s) => String(s == null ? '' : s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;').replace(/'/g, '&#39;'),
    _kasitteleLapsi: (l) => { kasitellyt.push(l); ctx.window._lapsi = l; },
  };
  ctx.window = ctx;
  ctx._fbApp = { functions: () => ({ httpsCallable: () => async () => ({ data: { lapset } }) }) };
  vm.createContext(ctx);
  vm.runInContext('let _viimeisinKirjaus = null, _viikkoKirjaukset = [], _valmentajaViestit = [], _kehuLahetetty = false, _pTyypit = new Set(), _pFiilis = null, _pTeksti = "", _pMinuutit = null;\n'
    + valilta(HTML, 'window._lapsetLista = [];', '/* ── Lähetä kehu pelaajalle')
    + '\nthis.tila = () => ({ kirjaus: _viimeisinKirjaus, viestit: _valmentajaViestit, viikko: _viikkoKirjaukset, pTyypit: _pTyypit });', ctx);
  return { ctx, ls, kasitellyt, toastit, url, pidatettavat, viiveet };
}
const LISTA = [
  { seura: 'kpv', uid: 'A', etunimi: 'Topias', joukkueNimi: 'KPV U13', syntymaVuosi: 2013 },
  { seura: 'kpv', uid: 'B', etunimi: 'Tero', joukkueNimi: 'KPV U11', syntymaVuosi: 2015 },
  { seura: 'sibbo', uid: 'C', etunimi: 'Anna', joukkueNimi: 'Sibbo T10', syntymaVuosi: 2016 },
];

describe('Vanhempi_v2 · lapsenvaihdin (ajettu)', () => {
  it('yksi lapsi: valintariviä ei näy, lapsi avautuu', async () => {
    const s = sivu({ lapset: [LISTA[0]] });
    await s.ctx._haeViimeisinKirjaus();
    expect(s.ctx._lapsiValitsinHTML()).toBe('');
    expect(s.ctx._lapsi).toMatchObject({ etunimi: 'Topias', id: 'A', seuraId: 'kpv' });
  });
  it('kolme lasta: rivi järjestyksessä, ensimmäinen valittuna; vaihto vaihtaa kaiken, myös eri seuran sisarukseen', async () => {
    const s = sivu({ lapset: LISTA });
    await s.ctx._haeViimeisinKirjaus();
    const rivi = s.ctx._lapsiValitsinHTML();
    expect([...rivi.matchAll(/>([^<]+)<\/button>/g)].map((m) => m[1])).toEqual(['Topias', 'Tero', 'Anna']);
    expect(rivi).toMatch(/aria-selected="true"[^>]*_vaihdaLapsiKlik\('kpv','A'\)/);
    expect(rivi).toContain('aria-label="vanhempi.lapsi_valitse"');
    await s.ctx._vaihdaLapsiKlik('sibbo', 'C'); await ODOTA();
    expect(s.ctx._lapsiTunnisteet).toEqual({ seuraId: 'sibbo', pelaajaId: 'C' });
    expect(s.ctx._lapsi).toMatchObject({ etunimi: 'Anna', id: 'C', seuraId: 'sibbo' });
    const t = s.ctx.tila();
    expect(t.kirjaus).toMatchObject({ id: 'k-C', uid: 'C', seura: 'sibbo' });
    expect(t.viestit.map((v) => v.id)).toEqual(['h-C']);
  });
  it('nopea vaihto A → B ennen kuin A:n data on ladattu: B:n näkymässä ei näy A:n dataa', async () => {
    const s = sivu({ lapset: LISTA });
    s.pidatettavat.add('seurat/kpv/pelaajat/A');
    s.pidatettavat.add('seurat/kpv/pelaajat/B/kirjaukset');
    const a = s.ctx._vaihdaLapsi('kpv', 'A');
    await ODOTA();
    const b = s.ctx._vaihdaLapsi('kpv', 'B');
    await ODOTA();
    s.viiveet['seurat/kpv/pelaajat/A']();   // A:n dokumentti saapuu myöhässä
    await a;
    expect(s.kasitellyt.map((l) => l.id)).toEqual(['B']);   // A:ta ei koskaan käsitelty
    expect(s.ctx._lapsi.id).toBe('B');
    s.viiveet['seurat/kpv/pelaajat/B/kirjaukset']();
    await b;
    expect(s.ctx.tila().kirjaus.uid).toBe('B');
  });
  it('myöhässä saapuvat edellisen lapsen kirjaukset hylätään (lapsi vaihtui kesken datalatauksen)', async () => {
    const s = sivu({ lapset: LISTA });
    s.pidatettavat.add('seurat/kpv/pelaajat/A/kirjaukset');
    const a = s.ctx._vaihdaLapsi('kpv', 'A');
    await ODOTA(); await ODOTA();
    await s.ctx._vaihdaLapsi('kpv', 'B');
    s.viiveet['seurat/kpv/pelaajat/A/kirjaukset']();
    await a;
    expect(s.ctx.tila().kirjaus).toMatchObject({ uid: 'B' });
    expect(s.ctx.tila().viestit.map((v) => v.id)).toEqual(['h-B']);
  });
  it('vaihto nollaa kesken jääneen Kirjaa-lomakkeen ja kalenteri/ilmoitus-välimuistit', async () => {
    const s = sivu({ lapset: LISTA });
    await s.ctx._vaihdaLapsi('kpv', 'A');
    vm.runInContext('_pTyypit.add("pihapeli"); window._vanhKalenteri = [{ id: "a-ev" }]; window._vanhKalLadattu = true; window._vanhNotif = [{ id: "a-n" }]; window._vanhNotifLadattu = true;', s.ctx);
    const p = s.ctx._vaihdaLapsi('kpv', 'B');
    expect(s.ctx.tila().pTyypit.size).toBe(0);
    expect(s.ctx._vanhKalenteri).toBe(null); expect(s.ctx._vanhKalLadattu).toBe(false);
    expect(s.ctx._vanhNotif).toBe(null); expect(s.ctx._vanhNotifLadattu).toBe(false);
    await p;
  });
  it('valinta muistetaan uudelleenlatauksen yli (huoltajan uid:n avaimella)', async () => {
    const s1 = sivu({ lapset: LISTA });
    await s1.ctx._haeViimeisinKirjaus();
    await s1.ctx._vaihdaLapsiKlik('kpv', 'B'); await ODOTA();
    expect(JSON.parse(s1.ls.get('tm_vanhempi_lapsi_h1'))).toEqual({ seura: 'kpv', uid: 'B' });
    const s2 = sivu({ lapset: LISTA, muisti: Object.fromEntries(s1.ls) });
    await s2.ctx._haeViimeisinKirjaus();
    expect(s2.ctx._lapsi.id).toBe('B');
    const s3 = sivu({ lapset: LISTA, muisti: Object.fromEntries(s1.ls), uid: 'toinen-huoltaja' });
    await s3.ctx._haeViimeisinKirjaus();
    expect(s3.ctx._lapsi.id).toBe('A');   // toisen huoltajan valinta ei vuoda
  });
  it('localStorage ei käytössä → ensimmäinen lapsi avautuu ilman virhettä', async () => {
    const s = sivu({ lapset: LISTA, localStorageRikki: true });
    await s.ctx._haeViimeisinKirjaus();
    expect(s.ctx._lapsi.id).toBe('A');
    await s.ctx._vaihdaLapsiKlik('kpv', 'B'); await ODOTA();
    expect(s.ctx._lapsi.id).toBe('B');
  });
  it('muistettu lapsi, jota ei enää ole listalla → ensimmäinen', async () => {
    const s = sivu({ lapset: LISTA, muisti: { tm_vanhempi_lapsi_h1: JSON.stringify({ seura: 'kpv', uid: 'POISTETTU' }) } });
    await s.ctx._haeViimeisinKirjaus();
    expect(s.ctx._lapsi.id).toBe('A');
  });
  it('linkkireitti: URL:n lapsi valittuna, lista haettu → valintarivi näkyy; napautus poistaa lapsiparametrit URL:sta', async () => {
    const s = sivu({ lapset: LISTA, search: '?uid=B&seura=kpv' });
    await s.ctx._haeViimeisinKirjaus();
    expect(s.ctx._lapsi.id).toBe('B');
    expect(s.ctx._lapsiValitsinHTML()).toMatch(/aria-selected="true"[^>]*_vaihdaLapsiKlik\('kpv','B'\)/);
    await s.ctx._vaihdaLapsiKlik('kpv', 'A'); await ODOTA();
    expect(new URL(s.url.href).searchParams.get('uid')).toBe(null);
    const s2 = sivu({ lapset: LISTA, search: '?pelaajaId=C&seuraId=sibbo' });
    await s2.ctx._haeViimeisinKirjaus();
    expect(s2.ctx._lapsiTunnisteet).toEqual({ seuraId: 'sibbo', pelaajaId: 'C' });
  });
  it('sama etunimi kahdella lapsella → joukkue perään; nimet escapetaan', async () => {
    const s = sivu({ lapset: [
      { seura: 'kpv', uid: 'A', etunimi: 'Eemil', joukkueNimi: 'KPV U13' },
      { seura: 'kpv', uid: 'B', etunimi: 'Eemil', joukkueNimi: 'KPV U11' },
      { seura: 'kpv', uid: 'C', etunimi: '<b>x</b>', joukkueNimi: '' },
    ] });
    await s.ctx._haeViimeisinKirjaus();
    const rivi = s.ctx._lapsiValitsinHTML();
    expect(rivi).toContain('>Eemil · KPV U13<'); expect(rivi).toContain('>Eemil · KPV U11<');
    expect(rivi).toContain('&lt;b&gt;x&lt;/b&gt;'); expect(rivi).not.toContain('<b>x</b>');
  });
});

describe('Vanhempi_v2 · vartijat (lähde)', () => {
  it('ei enää "useampi lapsi → ensimmäinen" -oletusta', () => {
    expect(HTML).not.toContain('const lapsi = lapset[0];');
  });
  it('Kirjaa tallentaa VALITULLE lapselle (_lapsiTunnisteet), ei URL:n lapselle', () => {
    const k = valilta(HTML, 'async function _perheKirjaa(', '/* ══ VALMENTAJAN VIESTI ══ */');
    expect(k).toContain('const _tt = window._lapsiTunnisteet || {};');
    expect(k).not.toMatch(/_qs\.get\('uid'\)/);
  });
  it('kalenteri- ja ilmoituslataus hylkää tuloksen, jos lapsi vaihtui kesken haun', () => {
    expect(valilta(HTML, 'async function _vanhLataaKalenteri(', '// P7-c.2')).toContain('if (window._lapsi !== L) return;');
    expect(valilta(HTML, 'async function _vanhLataaNotif(', 'function _vanhNotifHTML(')).toContain('if (window._lapsi !== L) return;');
  });
  it('tervetulo kerran per huoltaja (auth-uid), vanha lapsikohtainen avain kunnioitetaan', () => {
    const v = valilta(HTML, 'function _vthAvain(', 'function _naytaVanhTervetulo(');
    expect(v).toContain("'tm_vanhempi_aloitettu_h_' + u.uid");
    expect(valilta(HTML, 'function _naytaVanhTervetulo(', 'var nimi = _vthEsc')).toContain('_vthAvainLapsi()');
  });
  it('valintarivi piirretään kaikkiin näkymiin paitsi loginiin; tm_lang ?v=17 + SW-cachet bumpattu', () => {
    expect(HTML).toContain("const valitsin = (_sc!=='login' && typeof _lapsiValitsinHTML==='function') ? _lapsiValitsinHTML() : '';");
    expect(HTML).toContain('lib/tm_lang.js?v=17');
    expect(readFileSync(join(ROOT, 'sw_vanhempi.js'), 'utf8')).toContain("const CACHE = 'tm-vanhempi-v24';");
    expect(readFileSync(join(ROOT, 'TalentMaster_Pelaaja_v7.html'), 'utf8')).toContain('lib/tm_lang.js?v=17');
  });
});
