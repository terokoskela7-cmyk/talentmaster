/* Muistissa toimiva Firestore-vale testeille (kirjoittavat skriptit): collection/doc/get/select/where/update/runTransaction. Kirjaa kaikki kirjoitukset `db.kirjoitukset`-taulukkoon.
   store: { 'seurat/kpv/pelaajat': { id: {data} }, ... } — polku → dokumentit. Alikokoelmat: 'seurat/kpv/pelaajat/id/havainnot'. */
function luo(store) {
  const kirjoitukset = [];
  const snap = (path, id) => ({ id, exists: !!(store[path] && store[path][id]), data: () => (store[path] || {})[id], ref: ref(path, id) });
  const query = (path, filt) => {
    const docs = () => Object.keys(store[path] || {}).filter((id) => filt.every((f) => (store[path][id])[f[0]] === f[2])).sort().map((id) => snap(path, id));
    return { where: (a, b, c) => query(path, filt.concat([[a, b, c]])), select: () => query(path, filt), get: async () => ({ docs: docs(), size: docs().length }) };
  };
  const ref = (path, id) => ({ id, path: path + '/' + id, get: async () => snap(path, id), collection: (k) => query(path + '/' + id + '/' + k, []), listCollections: async () => { const pre = path + '/' + id + '/'; return Array.from(new Set(Object.keys(store).filter((k) => k.indexOf(pre) === 0).map((k) => k.slice(pre.length).split('/')[0]))).map((n) => Object.assign({ id: n }, query(pre + n, []))); }, update: async (u) => { kirjoitukset.push({ polku: path + '/' + id, kentat: Object.keys(u) }); Object.assign(store[path][id], u); } });
  const db = {
    kirjoitukset, store,
    collection: (p) => Object.assign(query(p, []), { doc: (id) => Object.assign(ref(p, id), { collection: (k) => Object.assign(query(p + '/' + id + '/' + k, []), { doc: (i2) => ref(p + '/' + id + '/' + k, i2) }) }) }),
    runTransaction: async (fn) => fn({ get: async (x) => x.get(), update: (r, u) => { kirjoitukset.push({ polku: r.path, kentat: Object.keys(u) }); const i = r.path.lastIndexOf('/'); Object.assign(store[r.path.slice(0, i)][r.path.slice(i + 1)], u); } })
  };
  // seurat-kokoelma: id-lista select().get() -> docs jotka ovat store['seurat']-avaimia tai johdettu poluista
  const seuratIdt = () => Array.from(new Set(Object.keys(store).map((k) => k.split('/')[1]).filter(Boolean).concat(Object.keys(store.seurat || {}))));
  const alkuperainen = db.collection;
  db.collection = (p) => { const c = alkuperainen(p); if (p === 'seurat') { const doc = c.doc; c.select = () => ({ get: async () => ({ docs: seuratIdt().map((id) => ({ id })) }) }); c.doc = (id) => doc(id); } return c; };
  return db;
}
module.exports = { luo };
