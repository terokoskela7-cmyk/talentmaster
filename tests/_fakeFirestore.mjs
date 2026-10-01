/* Muistinvarainen Firestore-tynkä testeille (polku → dokumentti): collection/doc/get/set/update/delete/add,
   batch, runTransaction, where (== / array-contains), collectionGroup. Jaettu: pr4_pin + sisarusbugi. */
export function fakeDb(alku) {
  const D = new Map(Object.entries(alku || {}));   // 'a/b/c/d' → data
  const loki = { commits: 0, batchOps: [], auto: 0 };
  const snap = (path) => ({ id: path.split('/').pop(), exists: D.has(path), data: () => D.get(path), get: (k) => (D.get(path) || {})[k], ref: docRef(path) });
  function kirjoita(path, d, opts) {
    if (opts && opts.merge) {
      const v = Object.assign({}, D.get(path) || {});
      Object.keys(d).forEach((k) => { v[k] = d[k] && d[k].__inc != null ? (v[k] || 0) + d[k].__inc : d[k]; });
      D.set(path, v);
    } else D.set(path, d);
  }
  function docRef(path) {
    return {
      _path: path, id: path.split('/').pop(),
      get: async () => snap(path),
      set: async (d, o) => kirjoita(path, d, o),
      update: async (d) => { if (!D.has(path)) throw new Error('NOT_FOUND ' + path); kirjoita(path, d, { merge: true }); },
      delete: async () => { D.delete(path); },
      collection: (c) => colRef(path + '/' + c),
    };
  }
  function colRef(path, ehdot) {
    ehdot = ehdot || [];
    const lapset = () => [...D.keys()].filter((k) => k.startsWith(path + '/') && k.slice(path.length + 1).indexOf('/') < 0);
    return {
      doc: (id) => docRef(path + '/' + (id || ('auto' + (++loki.auto)))),   // .doc() ilman id:tä → automaattinen id
      add: async (d) => { const id = 'auto' + (++loki.auto); kirjoita(path + '/' + id, d); return docRef(path + '/' + id); },
      where: (k, op, v) => colRef(path, ehdot.concat([[k, op, v]])),
      limit: () => colRef(path, ehdot),
      get: async () => ({ docs: lapset().filter((p) => ehdot.every(([k, op, v]) => {
        const a = (D.get(p) || {})[k];
        return op === '==' ? a === v : op === 'array-contains' ? Array.isArray(a) && a.indexOf(v) >= 0 : false;
      })).map(snap) }),
    };
  }
  const db = {
    collection: (c) => colRef(c),
    collectionGroup: (nimi) => ({
      where: (k, _op, v) => ({ limit: () => ({ get: async () => ({
        docs: [...D.keys()].filter((p) => { const o = p.split('/'); return o.length >= 2 && o[o.length - 2] === nimi && (D.get(p) || {})[k] === v; })
          .map((p) => { const s = snap(p); const o = p.split('/'); s.ref = { parent: { parent: o.length >= 4 ? { id: o[o.length - 3], parent: { id: o[o.length - 4] } } : null } }; return s; }),
      }) }) }),
    }),
    batch: () => {
      const ops = [];
      return {
        set: (r, d, o) => ops.push(() => kirjoita(r._path, d, o)),
        update: (r, d) => ops.push(() => { if (!D.has(r._path)) throw new Error('NOT_FOUND'); kirjoita(r._path, d, { merge: true }); }),
        delete: (r) => ops.push(() => D.delete(r._path)),
        commit: async () => { loki.commits++; loki.batchOps.push(ops.length); ops.forEach((f) => f()); },
      };
    },
    runTransaction: async (fn) => {
      const puskuri = [];
      const tulos = await fn({ get: (r) => r.get(), set: (r, d, o) => puskuri.push([r, d, o]) });
      puskuri.forEach(([r, d, o]) => kirjoita(r._path, d, o));
      return tulos;
    },
  };
  return { db, D, loki };
}
