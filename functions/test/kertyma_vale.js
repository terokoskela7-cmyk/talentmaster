'use strict';
/* Firestore-vale harjoituskertyma-testeille: store (polku → data) + LASKEE LUVUT kokoelmittain niin kuin Firestore laskuttaa (doc-get 1, myös olematon · kysely = palautetut doc:t, väh. 1 · getAll = refien määrä).
   `luoDb(o, { sid, kyselyVirhe })`: o = { pelaajat:{pid:data}, joukkueet:[{id,nimi}], eventit:{eid:ev}, lasnaolot:{'eid/pid':data}, kirjaukset:{pid:{pvm:data}}, kooste:{'pid/id':data} }.
   Palauttaa { db-yhteensopiva, kirjoitukset:[{pid,id,d,opts}], lukuja:{ pelaajat, yht, perKokoelma }, store }. kyselyVirhe(kokoelma, ehdot) → heitettävä virhe tai undefined (indeksipuutteen simulointi). */
const msOf = (v) => (v && v._ms != null ? v._ms : v);
function luoDb(o, opts) {
  opts = opts || {}; const SID = opts.sid || 'demo', store = new Map(), kirjoitukset = [], lukuja = { pelaajat: 0, yht: 0, perKokoelma: {} };
  const P = 'seurat/' + SID + '/';
  Object.keys(o.pelaajat || {}).forEach((pid) => store.set(P + 'pelaajat/' + pid, o.pelaajat[pid]));
  (o.joukkueet || []).forEach((j) => store.set(P + 'joukkueet/' + j.id, { nimi: j.nimi }));
  Object.keys(o.eventit || {}).forEach((e) => store.set(P + 'kalenteri/' + e, o.eventit[e]));
  Object.keys(o.lasnaolot || {}).forEach((k) => { const [e, pid] = k.split('/'); store.set(P + 'kalenteri/' + e + '/lasnaolijat/' + pid, o.lasnaolot[k]); });
  Object.keys(o.kirjaukset || {}).forEach((pid) => Object.keys(o.kirjaukset[pid]).forEach((pvm) => store.set(P + 'pelaajat/' + pid + '/kirjaukset/' + pvm, o.kirjaukset[pid][pvm])));
  Object.keys(o.kooste || {}).forEach((k) => { const [pid, id] = k.split('/'); store.set(P + 'pelaajat/' + pid + '/kooste/' + id, o.kooste[k]); });
  const kok = (polku) => polku.split('/').slice(-2, -1)[0];
  const laske = (polku, n) => { const k = kok(polku); lukuja.yht += n; lukuja.perKokoelma[k] = (lukuja.perKokoelma[k] || 0) + n; if (k === 'pelaajat') lukuja.pelaajat += n; };
  const ref = (polku) => ({ id: polku.split('/').pop(), polku,
    async get() { const d = store.get(polku); laske(polku, 1); return { exists: d !== undefined, id: polku.split('/').pop(), data: () => d }; },
    async set(d, op) { const m = /pelaajat\/([^/]+)\/kooste\/([^/]+)$/.exec(polku); kirjoitukset.push({ pid: m && m[1], id: m && m[2], d, opts: op }); store.set(polku, d); },
    collection: (c) => kol(polku + '/' + c) });
  function kol(polku) {
    const lapset = () => [...store.keys()].filter((p) => p.startsWith(polku + '/') && p.slice(polku.length + 1).indexOf('/') < 0);
    const mk = (f) => ({ where: (a, op, v) => mk(f.concat([[a, op, v]])), doc: (id) => ref(polku + '/' + id),
      async get() {
        const virhe = opts.kyselyVirhe && opts.kyselyVirhe(kok(polku + '/x'), f); if (virhe) throw virhe;
        if (opts.suodataKysely && opts.suodataKysely(f)) { laske(polku + '/x', 1); return { docs: [], empty: true, size: 0, forEach: () => {} }; }   // testi: kysely palauttaa tyhjää (simuloi puuttuvaa kyselyä)
        const ks = lapset().filter((p) => f.every(([a, op, v]) => { const d = store.get(p), x = a === '__id__' ? p.split('/').pop() : msOf(d[a]), y = msOf(v);
          return op === '==' ? x === y : op === '>=' ? x >= y : op === '<=' ? x <= y : op === 'array-contains' ? Array.isArray(x) && x.indexOf(y) >= 0 : false; }));
        laske(polku + '/x', Math.max(1, ks.length)); const docs = ks.map((p) => ({ id: p.split('/').pop(), data: () => store.get(p) }));
        return { docs, empty: !docs.length, size: docs.length, forEach: (fn) => docs.forEach(fn) };
      } });
    return mk([]);
  }
  const db = { kirjoitukset, lukuja, store, collection: (c) => kol(c), async getAll() { const refs = [].slice.call(arguments); return refs.map((r) => { const d = store.get(r.polku); laske(r.polku, 1); return { exists: d !== undefined, id: r.id, data: () => d }; }); } };
  return db;
}
module.exports = { luoDb };
