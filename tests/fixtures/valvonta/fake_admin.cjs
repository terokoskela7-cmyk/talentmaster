// Fake firebase-admin: deterministinen muistinsisäinen Firestore. Käytetään -r hookilla vanhan ja uuden skriptin tulostuksen vertailuun.
const Module = require('module');
function rng(seed) { let s = seed; return () => (s = (s * 1664525 + 1013904223) % 4294967296) / 4294967296; }
const R = rng(42);
const store = {};   // polku -> {id: data}
const put = (col, id, data) => { (store[col] = store[col] || {})[id] = data; };
const seurat = ['alfa', 'beta', 'gamma', 'delta'];
const joukkueet = { alfa: ['Alfa U13', 'Alfa U12'], beta: ['Beta U13', 'Beta P11'], gamma: ['Gamma U10'], delta: ['Delta U13'] };
const kaikkiNimet = [].concat(...Object.values(joukkueet));
seurat.forEach((s) => {
  put('seurat', s, { nimi: s });
  joukkueet[s].forEach((n, i) => put('seurat/' + s + '/joukkueet', s + '_j' + i, { nimi: n }));
  for (let i = 0; i < 40; i++) {
    const vieras = R() < 0.15, orpo = R() < 0.1;
    const j = orpo ? 'Kadonnut ' + i : (vieras ? kaikkiNimet[Math.floor(R() * kaikkiNimet.length)] : joukkueet[s][i % joukkueet[s].length]);
    const pid = (i < 3 && s !== 'alfa') ? 'alfa_p' + i : s + '_p' + i;   // sama id usealla seuralla
    put('seurat/' + s + '/pelaajat', pid, i % 17 === 0 ? { joukkueNimi: j } : { etunimi: 'E' + i, sukunimi: 'S' + i, syntymaVuosi: 2013, joukkue: j, joukkueet: [s + '_j0'], tunniste: String(1000 + i) });
    if (i < 2) put('seurat/' + s + '/pelaajat/' + pid + '/sisainen', 'jakso', { seuraId: (s === 'delta' && i === 1) ? 'beta' : s });
    for (let k = 0; k < (i % 5); k++) put('seurat/' + s + '/pelaajat/' + pid + '/kirjaukset', 'k' + k, { x: 1 });
    for (let k = 0; k < (i % 7); k++) put('seurat/' + s + '/pelaajat/' + pid + '/havainnot', 'h' + k, { nakyvyys: k % 2 ? 'pelaaja' : 'henkilokunta', valmentajaUid: 'v' + (k % 3) });
  }
  for (let i = 0; i < 90; i++) {
    const j = R() < 0.2 ? kaikkiNimet[Math.floor(R() * kaikkiNimet.length)] : joukkueet[s][i % joukkueet[s].length];
    put('seurat/' + s + '/toimenpiteet', 't' + i, { joukkue: j, tila: i % 3 ? 'ehdotus' : 'korvattu', tyyppi: i % 11 === 0 ? 'pulssi' : 'automaattinen', teksti: 'Teksti E' + (i % 40) + ' S' + (i % 40) + ' juu' });
  }
  for (let i = 0; i < 20; i++) put('seurat/' + s + '/seuranta_kuittaukset', 'q' + i, { valmentaja_uid: 'u' + (i % 4), joukkue: R() < 0.2 ? 'Vieras X' : joukkueet[s][0] });
  for (let i = 0; i < 4; i++) { put('seurat/' + s + '/kayttajat', 'u' + (s === 'beta' ? i + 1 : i), { x: 1, seuraId: (s === 'gamma' && i === 1) ? 'alfa' : s }); for (let k = 0; k < i * 30; k++) put('seurat/' + s + '/kayttajat/u' + (s === 'beta' ? i + 1 : i) + '/reflektiot', 'r' + k, { x: 1 }); }
  for (let i = 0; i < 600; i++) put('seurat/' + s + '/kalenteri', 'c' + i, { pvm: i % 2 ? '2099-01-01' : '2000-01-01', poistettu: i % 3 === 0 });
  for (let i = 0; i < 700; i++) put('seurat/' + s + '/viestit', 'm' + i, { tyyppi: ['klippi', 'klippi_vastaus', 'klippi_kuittaus', 'muu'][i % 4], vastaanottajaUid: 'v' + (i % 3), lahettajaUid: 'w' + (i % 2) });
  for (let i = 0; i < 130; i++) put('seurat/' + s + '/harjoitusarvioinnit', 'a' + i, { valmentajaUid: 'v' + (i % 2) });
  for (let i = 0; i < 60; i++) put('seurat/' + s + '/testitapahtumat', 'e' + i, { x: 1 });
  for (let i = 0; i < 210; i++) put('seurat/' + s + '/ohjelmat', 'o' + i, { laatija_uid: 'l1' });
});
const ms = (iso) => ({ toMillis: () => Date.parse(iso) });
put('audit', 'a1', { toiminto: 'kayttaja_rooli_estetty', seuraId: 'alfa', aikaleima: ms('2026-11-09T10:00:00Z') });
put('audit', 'a2', { toiminto: 'kayttaja_toisen_seuran_estetty', seuraId: 'alfa', aikaleima: ms('2026-11-08T10:00:00Z') });
put('audit', 'a3', { toiminto: 'kayttaja_rooli_estetty', seuraId: 'beta', aikaleima: ms('2026-10-20T10:00:00Z') });   // yli 7 pv
put('audit', 'a4', { toiminto: 'muu', seuraId: 'alfa', aikaleima: ms('2026-11-09T11:00:00Z') });
if (process.env.FAKE_DEMO) {   // P10-testi: demo-seura, jonka data viittaa alfan joukkueeseen; ei mukana oletuksena, jotta vanhojen skriptien golden-tulosteet pysyvät
  put('seurat', 'demo', { nimi: 'demo' }); put('seurat/demo/joukkueet', 'dj0', { nimi: 'Demo U13' });
  for (let i = 0; i < 5; i++) put('seurat/demo/toimenpiteet', 'd' + i, { joukkue: 'Alfa U13', tila: 'ehdotus' });
}
if (process.env.FAKE_VIRHE) { Object.defineProperty(store, 'seurat/beta/kalenteri', { get() { const e = new Error('Missing permission seurat/beta/pelaajat/SALAINEN-UID Matti Meikäläinen'); e.code = 'permission-denied'; throw e; }, enumerable: false }); }
const OPS = { '==': (a, b) => a === b, '>=': (a, b) => (a && typeof a.toMillis === 'function' ? a.toMillis() >= (b instanceof Date ? b.getTime() : b) : a >= b), in: (a, b) => b.includes(a) };
function docSnap(path, id) { const data = store[path][id]; return { id, data: () => data, get: (f) => data[f], ref: { path: path + '/' + id, collection: (n) => query(path + '/' + id + '/' + n, []) } }; }
function query(path, filt, sel) {
  const docs = () => Object.keys(store[path] || {}).filter((id) => filt.every((f) => OPS[f[1]](store[path][id][f[0]], f[2]))).sort().map((id) => docSnap(path, id));
  return { where: (a, b, c) => query(path, filt.concat([[a, b, c]]), sel), select: () => query(path, filt, true), count: () => ({ get: async () => ({ data: () => ({ count: docs().length }) }) }), get: async () => ({ docs: docs(), size: docs().length }), doc: (id) => ({ collection: (n) => query(path + '/' + id + '/' + n, []) }) };
}
const db = { collection: (n) => query(n, []), collectionGroup: (n) => ({ get: async () => { const docs = []; Object.keys(store).filter((k) => k === n || k.endsWith('/' + n)).sort().forEach((k) => Object.keys(store[k]).sort().forEach((id) => docs.push(docSnap(k, id)))); return { docs, size: docs.length }; } }) };
const fake = { initializeApp() {}, firestore: () => db, credential: {} };
const orig = Module._load;
Module._load = function (req, ...a) { return /firebase-admin$/.test(req) ? fake : orig.call(this, req, ...a); };
