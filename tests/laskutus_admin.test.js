/* Laskutus L1a — Admin "Laskutus" -näkymä (lib/tm_laskutus_admin.js) + Admin-kytkentä. Ajotesti mock-db:llä ja DOM-tyngällä. */
import { describe, it, expect, vi, afterEach } from 'vitest';
import { createRequire } from 'module';
import { readFileSync } from 'fs';
import vm from 'vm';
const require = createRequire(import.meta.url);
const A = require('../lib/tm_laskutus_admin.js'), L = require('../lib/tm_laskutus.js');

function snap(docs) { return { docs: docs.map(([id, d]) => ({ id, data: () => d })) }; }
function mockDb(data) {
  const kirj = [];
  const kok = (polku) => ({
    get: async () => snap(Object.keys(data).filter((k) => k.startsWith(polku + '/') && !k.slice(polku.length + 1).includes('/')).map((k) => [k.slice(polku.length + 1), data[k]])),
    doc: (id) => { const p = polku + '/' + id; return { get: async () => ({ exists: p in data, data: () => data[p] }), update: async (u) => { kirj.push({ p, u }); data[p] = Object.assign({}, data[p], u); }, collection: (c) => kok(p + '/' + c) }; },
  });
  return { kirj, collection: (c) => kok(c) };
}
function dom() {
  const el = { innerHTML: '', _s: { innerHTML: '' }, querySelector: (q) => (q === '#laskutusSisalto' ? el._s : q === '#laskutusSeura' ? { value: 'sibbo' } : q === '#laskutusKk' ? { value: '2026-11' } : null) };
  return el;
}
const DATA = () => ({
  'laskutus_asetukset/oletus': { hinta_pelaaja_snt: 100 }, 'laskutus_asetukset/sibbo': { laskutettava: true, sopimus_alkaen: '2026-11' },
  'seurat/sibbo/joukkueet/p13': { nimi: 'P13', laskutustila: 'aktiivinen', laskutus_aktivoitu: { pvm: '2026-11-01', uid: 'sa' } }, 'seurat/sibbo/joukkueet/p12': { nimi: 'P12 <b>' },
  'seurat/sibbo/kayttajat/v1': { rooli: 'valmentaja', email: 'v@x', joukkueet: ['p13', 'p12'] },
  'seurat/sibbo/pelaajat/a': { etunimi: 'Aa', sukunimi: 'Bb', syntymaVuosi: 2013, suostumusTila: 'annettu', joukkueet: ['p13'] },
  'seurat/sibbo/pelaajat/b': { etunimi: 'Ilman', sukunimi: 'Vuotta', suostumusTila: 'annettu', joukkueet: ['p13'] },
  'seurat/sibbo/pelaajat/c': { etunimi: 'Cc', syntymaVuosi: 2012, suostumusTila: 'annettu', joukkueet: ['p12'] },
});
const env = (db, o) => Object.assign({ db, FieldValue: { serverTimestamp: () => '__ST__' }, alue: (() => { const d = dom(); return () => d; })(), seurat: () => [{ id: 'sibbo', nimi: 'Sibbo-Vargarna' }], uid: () => 'sa-uid',
  tuoreToken: async () => {}, toast: () => {}, vahvista: () => true, lataaTiedosto: () => {} }, o);

describe('tilanvaihto (PM 2.11. päätös 5)', () => {
  it('ensimmäinen aktivointi asettaa laskutus_aktivoitu; uudelleenaktivointi ei; passivointi ei', () => {
    expect(A.tmLaskutusTilanvaihto({}, 'aktiivinen', 'u', '2026-11-02', 'T')).toEqual({ laskutustila: 'aktiivinen', laskutustila_muutettu: { pvm: '2026-11-02', uid: 'u', aika: 'T' }, laskutus_aktivoitu: { pvm: '2026-11-02', uid: 'u', aika: 'T' } });
    expect(A.tmLaskutusTilanvaihto({ laskutus_aktivoitu: { pvm: '2026-11-01' } }, 'aktiivinen', 'u', '2027-02-01', null)).toEqual({ laskutustila: 'aktiivinen', laskutustila_muutettu: { pvm: '2027-02-01', uid: 'u' } });
    expect(A.tmLaskutusTilanvaihto({}, 'passiivinen', 'u', 'x')).not.toHaveProperty('laskutus_aktivoitu');
    expect(() => A.tmLaskutusTilanvaihto({}, 'kaikki', 'u', 'x')).toThrow(/tuntematon/); expect(() => A.tmLaskutusTilanvaihto({}, 'aktiivinen', '', 'x')).toThrow(/uid/);
  });
  it('Helsingin päivä', () => { expect(A.tmLaskutusPaiva(new Date('2026-11-30T22:30:00Z'))).toBe('2026-12-01'); });
});

describe('näkymä (ajo)', () => {
  it('Tilanne nyt: laskee, näyttää summan, varoituksen ikä puuttuu nimellä, escapettaa joukkueen nimen', async () => {
    const db = mockDb(DATA()), e = env(db), v = A.tmLaskutusAdmin(e); v.render();
    expect(e.alue().innerHTML).toContain('Laskutus'); expect(e.alue().innerHTML).toContain('Sibbo-Vargarna');
    await v.tilanneNyt(); const h = e.alue()._s.innerHTML;
    expect(h).toContain('Esikatselu'); expect(h).toContain('82,00 €');   // 80 + 2 × 1 € (P12 passiivinen)
    expect(h).toContain('Ilman Vuotta'); expect(h).toContain('P12 &lt;b&gt;'); expect(h).not.toContain('P12 <b>');
    expect(h).toContain("laskutusVaihdaTila('sibbo','p12','aktiivinen')"); expect(h).toContain("laskutusVaihdaTila('sibbo','p13','passiivinen')");
  });
  it('virheellinen asetus → ei laskua, virhe näkyy', async () => {
    const d = DATA(); d['laskutus_asetukset/sibbo'] = { laskutettava: true }; const e = env(mockDb(d)), v = A.tmLaskutusAdmin(e); v.render(); await v.tilanneNyt();
    expect(e.alue()._s.innerHTML).toMatch(/virheelliset: .*sopimus_alkaen/);
  });
  it('vaihdaTila: kirjoittaa vain joukkueen laskutuskentät, ensimmäinen aktivointi mukaan; peruutus ei kirjoita', async () => {
    const db = mockDb(DATA()); let e = env(db, { vahvista: () => false }), v = A.tmLaskutusAdmin(e); v.render(); await v.tilanneNyt();
    expect(await v.vaihdaTila('sibbo', 'p12', 'aktiivinen')).toBe(false); expect(db.kirj).toEqual([]);
    e = env(db); v = A.tmLaskutusAdmin(e); v.render(); await v.tilanneNyt();
    expect(await v.vaihdaTila('sibbo', 'p12', 'aktiivinen')).toBe(true);
    expect(db.kirj).toHaveLength(1); expect(db.kirj[0].p).toBe('seurat/sibbo/joukkueet/p12');
    expect(Object.keys(db.kirj[0].u).sort()).toEqual(['laskutus_aktivoitu', 'laskutustila', 'laskutustila_muutettu']); expect(db.kirj[0].u.laskutustila_muutettu).toMatchObject({ uid: 'sa-uid', aika: '__ST__' });
    expect(await v.vaihdaTila('sibbo', 'p13', 'passiivinen')).toBe(true); expect(Object.keys(db.kirj[1].u).sort()).toEqual(['laskutustila', 'laskutustila_muutettu']);
  });
  it('Tallennetut + CSV (BOM, joukkueet + lisenssi + yhteensä)', async () => {
    const d = DATA(); const t = L.tmLaskutusLaske({ kk: '2026-11', seuraId: 'sibbo', asetukset: L.tmLaskutusAsetukset(null, { laskutettava: true, sopimus_alkaen: '2026-11' }).asetukset, joukkueet: [{ id: 'p13', nimi: 'P13', laskutustila: 'aktiivinen' }], kayttajat: [{ rooli: 'valmentaja', email: 'x', joukkueet: ['p13'] }], pelaajat: [] });
    d['laskutus/2026-11/seurat/sibbo'] = JSON.parse(JSON.stringify(t));
    let tiedosto = null; const e = env(mockDb(d), { lataaTiedosto: (n, s) => { tiedosto = { n, s }; } }), v = A.tmLaskutusAdmin(e); v.render(); await v.tallennetut();
    expect(e.alue()._s.innerHTML).toContain('1 seuraa'); expect(e.alue()._s.innerHTML).not.toContain('laskutusVaihdaTila');   // snapshot ei muokattava
    v.csv(); expect(tiedosto.n).toBe('laskutus_2026-11.csv'); expect(tiedosto.s.charCodeAt(0)).toBe(0xFEFF); expect(tiedosto.s).toContain('Sibbo-Vargarna;YHTEENSÄ');
  });
});

describe('SA-varapolku (L1b)', () => {
  afterEach(() => { vi.useRealTimers(); });
  const kello = (iso) => vi.useFakeTimers({ toFake: ['Date'] }).setSystemTime(new Date(iso));
  it('kuluva kuukausi (Suomen aikaa) → ei kutsua: 30.11. klo 23.30 marraskuu on kesken', async () => {
    kello('2026-11-30T21:30:00Z'); let kutsuttu = 0, vahvistettu = 0; const toastit = [];
    const e = env(mockDb(DATA()), { vahvista: () => { vahvistettu++; return true; }, toast: (t, ty) => toastit.push([t, ty]), kutsu: () => async () => { kutsuttu++; } });
    const v = A.tmLaskutusAdmin(e); v.render();
    expect(await v.varapolku()).toBe(null); expect(kutsuttu).toBe(0); expect(vahvistettu).toBe(0); expect(toastit[0]).toEqual(['Kuukausi 2026-11 ei ole vielä päättynyt', 'virhe']);
  });
  it('kutsuu laskutusKuukausiVarapolku valitulla kuukaudella vahvistuksen jälkeen, näyttää tuloksen ja lataa tallennetut', async () => {
    kello('2026-11-30T23:30:00Z');   // 1.12. klo 1.30 Suomen aikaa
    const kutsut = [], toastit = []; let token = 0;
    const e = env(mockDb(DATA()), { tuoreToken: async () => { token++; }, toast: (t, ty) => toastit.push([t, ty]),
      kutsu: (n) => async (d) => { kutsut.push([n, d]); return { data: { kk: d.kk, luotu: 2, on_jo: ['kpv'], ohitettu: 3, virheet: [], yhteensa_snt: 13400 } }; } });
    const v = A.tmLaskutusAdmin(e); v.render();
    expect(e.alue().innerHTML).toContain('laskutusVarapolku()');
    const r = await v.varapolku();
    expect(kutsut).toEqual([['laskutusKuukausiVarapolku', { kk: '2026-11' }]]); expect(token).toBe(1); expect(r.luotu).toBe(2);
    expect(toastit[0][0]).toContain('luotu 2'); expect(toastit[0][0]).toContain('oli jo 1'); expect(toastit[0][0]).toContain('134,00 €'); expect(toastit[0][1]).toBe('ok');
  });
  it('peruutus ei kutsu; virhe näytetään toastina; seuran virheet listataan', async () => {
    kello('2026-12-03T08:00:00Z');
    let kutsuttu = 0; const toastit = [];
    let e = env(mockDb(DATA()), { vahvista: () => false, kutsu: () => async () => { kutsuttu++; } }); let v = A.tmLaskutusAdmin(e); v.render();
    expect(await v.varapolku()).toBe(null); expect(kutsuttu).toBe(0);
    e = env(mockDb(DATA()), { toast: (t, ty) => toastit.push([t, ty]), kutsu: () => async () => { throw new Error('Vain Super Admin.'); } }); v = A.tmLaskutusAdmin(e); v.render();
    expect(await v.varapolku()).toBe(null); expect(toastit.pop()).toEqual(['Varapolku epäonnistui: Vain Super Admin.', 'virhe']);
    e = env(mockDb(DATA()), { toast: (t, ty) => toastit.push([t, ty]), kutsu: () => async () => ({ data: { luotu: 1, on_jo: [], virheet: [{ sid: 'rikki', viesti: 'x' }], yhteensa_snt: 0 } }) }); v = A.tmLaskutusAdmin(e); v.render();
    await v.varapolku(); expect(toastit.pop()).toEqual([expect.stringContaining('virheitä 1 (rikki)'), 'virhe']);
  });
});

describe('Admin-kytkentä', () => {
  const H = readFileSync('TalentMaster_Admin.html', 'utf8');
  it('skriptit, valikko, case ja globaalit', () => {
    expect(H).toContain('<script src="lib/tm_laskutus.js"></script><script src="lib/tm_laskutus_admin.js"></script>');
    expect(H).toContain("vaihdaNakyma('laskutus',this)"); expect(H).toContain("case 'laskutus':   _lask().render();");
    for (const f of ['laskutusTilanneNyt', 'laskutusTallennetut', 'laskutusVaihdaTila', 'laskutusCsv', 'laskutusVarapolku']) expect(H).toContain('window.' + f + ' =');
    expect(H.indexOf('lib/tm_joukkue.js')).toBeLessThan(H.indexOf('lib/tm_laskutus.js'));
    expect(H).toContain('kutsu: (n) => functions.httpsCallable(n)'); expect(H).toMatch(/const functions = firebase\.app\(\)\.functions\('europe-west1'\)/);
  });
  it('selaimessa (vm): libit latautuvat window-globaaleiksi ilman module-objektia', () => {
    const w = {}; const ctx = vm.createContext({ window: w, Intl, Date, Object, Array, String, Number, Math, JSON, Promise, Error });
    for (const f of ['lib/tm_joukkue.js', 'lib/tm_laskutus.js', 'lib/tm_laskutus_admin.js']) vm.runInContext(readFileSync(f, 'utf8'), ctx);
    expect(typeof w.TM_LASKUTUS.tmLaskutusLaske).toBe('function'); expect(typeof w.TM_LASKUTUS_ADMIN.tmLaskutusAdmin).toBe('function');
    const t = w.TM_LASKUTUS.tmLaskutusLaske({ kk: '2026-11', seuraId: 's', asetukset: w.TM_LASKUTUS.OLETUS, joukkueet: [{ id: 'a', laskutustila: 'aktiivinen' }], kayttajat: [], pelaajat: [{ id: 'p', joukkueet: ['a'] }] });
    expect(t.joukkueet[0].pelaajia).toBe(1);   // tmPelaajanJoukkueet löytyi window-globaalista
  });
});
