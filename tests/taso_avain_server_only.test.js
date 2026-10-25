/* Turvallisuus-PR: integraatioavaimet server-only (Rules v3.62 salaiset/{dokId}), migraatioskripti, UI ei lue eikä kirjoita avainta selaimella. Emulaattoritestit: tests/rules (v3.62). functions/test/salaiset.test.js. */
const fs = require('fs'), path = require('path');
const M = require('../scripts/siirra_integraatioavaimet.js');
const RULES = fs.readFileSync(path.join(__dirname, '..', 'tm_admin', 'firestore.rules'), 'utf8'), UI = fs.readFileSync(path.join(__dirname, '..', 'taso_seura_ui.html'), 'utf8'), IDX = fs.readFileSync(path.join(__dirname, '..', 'functions', 'index.js'), 'utf8');
const DEL = Symbol('del'), fv = { serverTimestamp: () => 'TS', delete: () => DEL };
function fakeDb(alku) {
  const store = new Map(Object.entries(alku || {})), kirj = [];
  const doc = (p) => ({ get: async () => ({ exists: store.has(p), id: p.split('/').pop(), data: () => store.get(p) }), set: async (d, o) => { kirj.push(['set', p]); store.set(p, Object.assign({}, o && o.merge ? store.get(p) : {}, d)); }, update: async (d) => { kirj.push(['update', p]); const c = Object.assign({}, store.get(p)); Object.keys(d).forEach((k) => { if (d[k] === DEL) delete c[k]; else c[k] = d[k]; }); store.set(p, c); }, collection: (c) => ({ doc: (id) => doc(p + '/' + c + '/' + id) }) });
  return { store, kirj, collection: (c) => ({ doc: (id) => doc(c + '/' + id), get: async () => { const ds = [...store.keys()].filter((k) => k.startsWith(c + '/') && !k.slice(c.length + 1).includes('/')).map((k) => ({ id: k.split('/').pop() })); return { forEach: (f) => ds.forEach(f) }; } }) };
}
describe('Rules v3.62', () => {
  it('versio + changelog + salaiset-blokki (read, write: if false) seurat-blokin sisällä', () => {
    expect(RULES).toMatch(/firestore\.rules v3\.(6[23456789]|70|71)/); expect(RULES).toContain('Muutokset v3.61 → v3.62'); expect(RULES).toMatch(/match \/salaiset\/\{dokId\} \{\s*allow read, write: if false;\s*\}/);
    const i = RULES.indexOf('match /salaiset/{dokId}'), j = RULES.indexOf('match /seurat/{seuraId} {'); expect(i).toBeGreaterThan(j);
  });
});
describe('UI (taso_seura_ui.html): avain ei kulje selaimen kautta muuten kuin callablelle', () => {
  it('ei lue taso_api_key:tä seura-dokista, ei kirjoita sitä .update():lla; kutsuu asetaTasoAsetukset (europe-west1); näyttää "asetettu ✓" lipusta taso_avain_asetettu', () => {
    expect(UI).not.toMatch(/d\.taso_api_key/); expect(UI).not.toMatch(/paivitys\.taso_api_key|update\(paivitys\)/); expect(UI).toContain("httpsCallable('asetaTasoAsetukset')"); expect(UI).toContain("firebase.app().functions('europe-west1')"); expect(UI).not.toContain('firebase.functions()');
    expect(UI).toContain('d.taso_avain_asetettu === true'); expect(UI).toContain('asetettu ✓');
  });
});
describe('functions kytkentä', () => {
  it('tasoHaeSeuranOttelut lukee avaimen _salaiset.tasoAvain:lla; asetaTasoAsetukset exportataan moduulista', () => { expect(IDX).toContain('_salaiset.tasoAvain(db, seuraId, seuraData)'); expect(IDX).toContain('_salaiset.luo({ functions, db, admin, tarkistaOikeus })'); expect(IDX).not.toMatch(/seuraData\.taso_api_key/); });
  it('K35-5: ajastettu synkka ja callable-synkka saavat avaimen _tasoDeps.tasoAvain-koukulla (server-only), ei seura-dokin kentästä', () => { expect(IDX).toContain('tasoAvain: _salaiset.tasoAvain'); const KT = fs.readFileSync(path.join(__dirname, '..', 'functions', 'kalenteri_taso.js'), 'utf8'); expect(KT).toContain('deps.tasoAvain ? await deps.tasoAvain(db, seuraId, s)'); });
});
describe('scripts/siirra_integraatioavaimet.js', () => {
  it('suunnittele: taso_api_key + *_secret/*_token siirrettäviä (vain pituus, ei arvoa); club_id ym. ei; tyhjä/ei-merkkijono ohitetaan; eri arvo salaisessa dokissa → ristiriita', () => {
    const p = M.suunnittele({ taso_api_key: 'abcdef123', taso_club_id: '1', x_secret: 'sss', foo_token: '', nimi: 'A', y_apikey: 5 }, {}); expect(p.siirrettavat).toEqual([{ kentta: 'taso_api_key', pituus: 9 }, { kentta: 'x_secret', pituus: 3 }]); expect(JSON.stringify(p)).not.toContain('abcdef123');
    expect(M.suunnittele({ taso_api_key: 'a1' }, { taso_api_key: 'eri' }).ristiriidat).toEqual(['taso_api_key']); expect(M.suunnittele({ taso_api_key: 'a1' }, { taso_api_key: 'a1' }).siirrettavat).toHaveLength(1);
  });
  it('KUIVA-AJO (oletus) ei kirjoita mitään eikä tulosta avainta', async () => {
    const db = fakeDb({ 'seurat/a': { taso_api_key: 'TOPSECRET-1' }, 'seurat/b': { nimi: 'B' } }), lokit = []; const t = await M.aja({ db, FieldValue: fv, kirjoita: false, loki: (x) => lokit.push(x) });
    expect(db.kirj).toEqual([]); expect(lokit.join('\n')).toContain('a: siirrettäisiin taso_api_key (11 merkkiä)'); expect(lokit.join('\n')).not.toContain('TOPSECRET'); expect(t.siirretty).toBe(0);
  });
  it('--kirjoita: kopioi salaiseen dokumenttiin, VERIFIOI, poistaa seura-dokista + asettaa lipun; toinen ajo ei tee mitään (idempotentti); muut kentät säilyvät', async () => {
    const db = fakeDb({ 'seurat/a': { nimi: 'A', taso_club_id: '9', taso_api_key: 'TOPSECRET-1' }, 'seurat/b': { nimi: 'B' } }), lokit = [];
    const t = await M.aja({ db, FieldValue: fv, kirjoita: true, loki: (x) => lokit.push(x) }); expect(t).toMatchObject({ siirretty: 1, kenttia: 1, virheita: 0 });
    expect(db.store.get('seurat/a/salaiset/integraatiot').taso_api_key).toBe('TOPSECRET-1'); const s = db.store.get('seurat/a'); expect('taso_api_key' in s).toBe(false); expect([s.taso_avain_asetettu, s.taso_club_id, s.nimi]).toEqual([true, '9', 'A']); expect(lokit.join('\n')).not.toContain('TOPSECRET');
    const n = db.kirj.length; const t2 = await M.aja({ db, FieldValue: fv, kirjoita: true, loki: () => {} }); expect(t2.siirretty).toBe(0); expect(db.kirj.length).toBe(n);
  });
  it('verifiointi epäonnistuu → kenttää EI poisteta seura-dokista; ristiriita → ei kosketa', async () => {
    const db = fakeDb({ 'seurat/a': { taso_api_key: 'TOPSECRET-1' } }), orig = db.collection('seurat').doc('a').collection('salaiset').doc('integraatiot'); void orig;
    const huono = fakeDb({ 'seurat/a': { taso_api_key: 'TOPSECRET-1' } }); const alkup = huono.collection; huono.collection = (c) => { const r = alkup(c); return { doc: (id) => { const d = r.doc(id); const col = d.collection; d.collection = (cc) => ({ doc: (i2) => { const x = col(cc).doc(i2); x.set = async () => {}; return x; } }); return d; }, get: r.get }; };   // salainen kirjoitus ei tallennu
    const t = await M.aja({ db: huono, FieldValue: fv, kirjoita: true, loki: () => {} }); expect(t.virheita).toBe(1); expect(huono.store.get('seurat/a').taso_api_key).toBe('TOPSECRET-1');
    const r = fakeDb({ 'seurat/a': { taso_api_key: 'A1' }, 'seurat/a/salaiset/integraatiot': { taso_api_key: 'ERI' } }); const t3 = await M.aja({ db: r, FieldValue: fv, kirjoita: true, loki: () => {} }); expect(t3.ristiriitoja).toBe(1); expect(r.store.get('seurat/a').taso_api_key).toBe('A1');
  });
  it('lueArgit: --seura vaatii id:n; --kirjoita oma lippu', () => { expect(M.lueArgit([])).toEqual({ seura: null, kirjoita: false }); expect(M.lueArgit(['--seura', 'kpv', '--kirjoita'])).toEqual({ seura: 'kpv', kirjoita: true }); expect(() => M.lueArgit(['--seura'])).toThrow(/Käyttö/); expect(() => M.lueArgit(['--seura', '--kirjoita'])).toThrow(); });
});
