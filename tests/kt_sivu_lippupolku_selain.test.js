/* Kehitystyöpöydän lippupolku SELAIMEN muodossa (#1289 ei aktivoitunut stagingissa).
   Vika: _req() palautti selaimessa window:n → window.tmListaLataa puuttui → syy 'lib_puuttuu' → hiljainen vanha kokolataus.
   Aiempi testi läpäisi, koska se injektoi `listaLataus: LL` (Node-require). TÄMÄ testi:
   · kirjoittaa lipun oikealla Admin-callablella (functions/liput_hallinta.js → liput/julkiset { lista_yhteenveto: true }), ei käsin tehdyllä tynkällä
   · lataa oikeat libit selaimen tapaan (vm-konteksti: ei module/require-olioita, vain window-globaalit; skriptit samassa järjestyksessä kuin HTML:ssä)
   · EI injektoi listaLataus-riippuvuutta. */
import { describe, it, expect } from 'vitest';
import { createRequire } from 'module';
import fs from 'fs';
import vm from 'vm';
const require = createRequire(import.meta.url);
const { kasittelija } = require('../functions/liput_hallinta.js');

/* ── Admin: oikea callable muistinvaraisella Firestorella ── */
function adminDb() {
  const data = { 'seurat/kuorma_seura_01': { nimi: 'Kuorma 1' } }, audit = [];
  const ref = (p) => ({ p, collection: (n) => ({ doc: (id) => ref(p + '/' + n + '/' + id), _p: p + '/' + n }), });
  const doc = (p) => ({ p, collection: (n) => ({ doc: (id) => doc(p + '/' + n + '/' + id) }) });
  const db = {
    collection: (n) => ({ doc: (id) => doc(n + '/' + id), id: n }),
    runTransaction: async (fn) => fn({
      get: async (r) => ({ exists: !!data[r.p], data: () => data[r.p] }),
      set: (r, v, o) => { if (r.p === undefined) { audit.push(v); return; } data[r.p] = o && o.merge ? Object.assign({}, data[r.p] || {}, v) : v; },
    }),
  };
  /* audit-rivi: db.collection('audit').doc() ilman id:tä → p 'audit/undefined'; ohjataan audit-listaan */
  const alk = db.collection; db.collection = (n) => { const c = alk(n); if (n === 'audit') c.doc = () => ({ p: undefined }); return c; };
  return { db, data, audit };
}

/* ── Selain: oikeat libit window-kontekstissa, ei CommonJS:ää ── */
function selain(fireDb) {
  const win = { Intl, console, Promise, Object, Array, JSON, Date, Math, String, Number, RegExp, Error, parseInt, parseFloat, isNaN, encodeURIComponent, decodeURIComponent };
  win.window = win; const ctx = vm.createContext(win);
  ['tm_liput', 'tm_joukkue', 'tm_phv_tila', 'tm_lista_yhteenveto', 'tm_lista_lataus', 'tm_kt_sivu'].forEach((n) => vm.runInContext(fs.readFileSync('lib/' + n + '.js', 'utf8'), ctx, { filename: n }));
  expect(typeof win.module).toBe('undefined'); expect(typeof win.require).toBe('undefined');
  return win;
}

/* ── Firestore-tynkä lukua varten (vain luvut; loki) ── */
function lukuDb(ds) {
  const log = [];
  const doc = (path) => ({ get: async () => { log.push(path); const d = ds[path]; return { exists: d !== undefined, id: path.split('/').pop(), data: () => d }; }, collection: (n) => col(path + '/' + n) });
  const col = (path) => ({ doc: (id) => doc(path + '/' + id), get: async () => { log.push('LISTAUS ' + path); return { docs: [], forEach() {} }; }, where: () => col(path) });
  return { log, collection: (n) => col(n) };
}

describe('Kehitystyöpöytä · lippupolku selaimen muodossa', () => {
  it('Admin kirjoittaa lipun liput/julkiset-dokumenttiin, ja sivun _listaLippu-lasku (TM_LIPUT.tmLiput) näkee sen', async () => {
    const A = adminDb(), kasittele = kasittelija({ db: A.db, FieldValue: { serverTimestamp: () => 'ts' }, HttpsError: class extends Error { constructor(k, m) { super(m); this.code = k; } }, onSuperAdminUid: async () => true });
    const r = await kasittele({ seuraId: 'kuorma_seura_01', lippu: 'lista_yhteenveto', arvo: true }, { auth: { uid: 'sa' } });
    expect(r.ok).toBe(true);
    const julkiset = A.data['seurat/kuorma_seura_01/liput/julkiset']; expect(julkiset).toEqual({ lista_yhteenveto: true });
    const w = selain(), seuraDoc = A.data['seurat/kuorma_seura_01'];
    /* sama lauseke kuin TalentMaster_Kehitystyopoyta.html _listaLippu() */
    expect(w.TM_LIPUT.tmLiput(julkiset, seuraDoc).lista_yhteenveto === true).toBe(true);
    const h = fs.readFileSync('TalentMaster_Kehitystyopoyta.html', 'utf8'); expect(h).toMatch(/l\.lista_yhteenveto === true/); expect(h).toMatch(/TM_LIPUT\.tmLiput\(_julkisetLiput, _seuraDoc\)/);
  });
  it('tmKtSivuLataaAvaus selaimessa ILMAN injektoitua listaLatausta: lukee lista_joukkue-dokumentin (ei lib_puuttuu), ei pelaajat-listausta', async () => {
    const w = selain(), LY = w.TM_LISTA_YHTEENVETO, rivi = (id, e, s) => ({ id, e, s, jn: 'U13', jk: ['u13'] });
    const db = lukuDb({
      'seurat/s1/pelaajat/p1': { etunimi: 'Aatu', sukunimi: 'Aalto', joukkue: 'U13', joukkueet: ['u13'] },
      'seurat/s1/lista_joukkue/u13': { versio: LY.VERSIO, rivit: [rivi('p1', 'Aatu', 'Aalto'), rivi('p2', 'Bertta', 'Bergh')], laskettu: 1000 },
    });
    const r = await w.TM_KT_SIVU.tmKtSivuLataaAvaus({ db, sid: 's1', rooli: 'valmentaja', joukkueet: ['u13'], pid: 'p1', joukkueDocs: [{ id: 'u13', nimi: 'U13' }] });
    expect(r.syy).toBeUndefined(); expect(r.ok).toBe(true);
    expect(r.pelaajat.map((p) => p.id)).toEqual(['p1', 'p2']);
    expect(db.log).toEqual(['seurat/s1/pelaajat/p1', 'seurat/s1/lista_joukkue/u13']);
  });
  it('lib puuttuu selaimessa → ok:false + syy (kutsuja kirjaa "[kt] vanha polku: <syy>")', async () => {
    const w = selain(); delete w.TM_LISTA_LATAUS;
    const db = lukuDb({ 'seurat/s1/pelaajat/p1': { etunimi: 'A', sukunimi: 'A', joukkueet: ['u13'] } });
    const r = await w.TM_KT_SIVU.tmKtSivuLataaAvaus({ db, sid: 's1', rooli: 'vp', pid: 'p1', joukkueDocs: [{ id: 'u13', nimi: 'U13' }] });
    expect(r).toEqual({ ok: false, syy: 'lib_puuttuu' });
  });
  it('sivu kirjaa jokaisen vanhaan polkuun putoamisen muodossa "[kt] vanha polku: <syy>" (mittaa_sivut --erittely kerää [kt]-rivit)', () => {
    const h = fs.readFileSync('TalentMaster_Kehitystyopoyta.html', 'utf8'), a = h.indexOf('async function _kaynnista'), k = h.slice(a, h.indexOf('function _ktListalle'));
    expect(k).toMatch(/\[kt\] vanha polku: lippu_pois/); expect(k).toMatch(/\[kt\] vanha polku: ei_pelaajaa_hashissa/); expect(k).toMatch(/'\[kt\] vanha polku:', \(r && r\.syy\)/);
    expect(k).toMatch(/\[kt\] vanha polku \(poikkeus\)/); expect(k).not.toMatch(/\[avaus\]/);
    const m = fs.readFileSync('scripts/kuorma/mittaa_sivut.js', 'utf8'); expect(m).toMatch(/\^\\\[\(lista\|kt\|sisainen\)/);
  });
});
