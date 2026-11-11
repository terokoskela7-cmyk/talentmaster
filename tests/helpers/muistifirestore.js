'use strict';
/* Muistinvarainen Firestore-vale testeille (CJS-apuri, ei *.test.js): store = Map polku → data. Laskee LUVUT niin kuin Firestore laskuttaa: dokumentti-get = 1 (myös olematon), kysely = palautetut dokumentit (väh. 1).
 * Tuettu: collection(...).get()/where(kenttä|'__id__', >= | <= | ==, arvo)/doc(id).get|set|collection, db.doc(polku).set, Timestamp.fromDate, getAll(...refs). Date-kentät palautetaan Timestamp-muotoisina ({toDate,_ms}). */
const wrap = (data) => { const o = Object.assign({}, data); Object.keys(o).forEach((k) => { if (o[k] instanceof Date) { const dt = o[k]; o[k] = { toDate: () => dt, _ms: dt.getTime() }; } }); return o; };
const msOf = (v) => (v instanceof Date ? v.getTime() : v && v._ms != null ? v._ms : v);
function luo(store) {
  let indeksi = null, koko = -1;   // vanhempi-polku → lapsipolut (kyselyt eivät skannaa koko storea); rakennetaan uudelleen kun store kasvaa
  const lapset = (polku) => { if (!indeksi || koko !== store.size) { indeksi = new Map(); store.forEach((_, p) => { const i = p.lastIndexOf('/'); const v = p.slice(0, i); (indeksi.get(v) || indeksi.set(v, []).get(v)).push(p); }); koko = store.size; } return indeksi.get(polku) || []; };
  const t = { reads: 0, writes: 0, perKokoelma: {}, nollaa() { t.reads = 0; t.writes = 0; t.perKokoelma = {}; } };
  const laske = (k, n) => { t.reads += n; t.perKokoelma[k] = (t.perKokoelma[k] || 0) + n; };
  const nimi = (polku) => polku.split('/').slice(-1)[0];
  const refOf = (polku) => ({ id: polku.split('/').pop(), polku, path: polku,
    async get() { const d = store.get(polku); laske(nimi(polku.split('/').slice(0, -1).join('/')) + ':get', 1); return { exists: !!d, id: polku.split('/').pop(), data: () => (d ? wrap(d) : undefined) }; },
    async set(data) { t.writes++; store.set(polku, data); }, collection: (c) => col(polku + '/' + c) });
  function col(polku) {
    const lista = () => lapset(polku);
    const mk = (f) => ({ where: (a, op, v) => mk(f.concat([[a, op, v]])), doc: (id) => refOf(polku + '/' + id),
      async get() {
        const ks = lista().filter((p) => f.every(([a, op, v]) => { const d = store.get(p), x = a === '__id__' ? p.split('/').pop() : msOf(d[a]), y = msOf(v); return op === '>=' ? x >= y : op === '<=' ? x <= y : x === y; }));
        laske(nimi(polku) + ':query', Math.max(1, ks.length)); const docs = ks.map((p) => ({ id: p.split('/').pop(), ref: refOf(p), data: () => wrap(store.get(p)) }));
        return { docs, size: docs.length, forEach: (fn) => docs.forEach(fn) };
      } });
    return mk([]);
  }
  const db = { collection: (c) => col(c), doc: (p) => refOf(p), async getAll(...refs) { return refs.map((r) => { const d = store.get(r.polku); laske(nimi(r.polku.split('/').slice(0, -1).join('/')) + ':getAll', 1); return { exists: !!d, id: r.id, data: () => (d ? wrap(d) : undefined) }; }); } };
  const deps = { db, Timestamp: { fromDate: (d) => ({ toDate: () => d, _ms: d.getTime() }) }, FieldPath: { documentId: () => '__id__' }, palvelinAika: () => 'TS', nyt: () => Date.parse('2026-10-19T09:00:00+03:00') };
  return { db, deps, tilasto: t, store };
}
module.exports = { luo };
