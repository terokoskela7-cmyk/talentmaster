/* QG-1 · sv-läpiajon Firebase-tynkä (selainskripti). Korvaa gstatic-SDK:n (firebase-app-compat.js) fixture-ajossa: kaikki data
   muistissa (window.__FX, synteettinen seura tools/i18n/sv_fixtuuri.mjs) — EI verkkoa, EI Firestorea, EI emulaattoria, EI tuotantodataa.
   Kirjoitukset menevät vain muistiin (window.__fxKirj). Tuntemattomat kutsut → Proxy, joka ei kaada sivua.
   Aikaleimat fixturessa muodossa { __ts: 'ISO' } → muutetaan Timestamp-tyyppisiksi (toDate/toMillis/seconds) luettaessa. */
(function () {
  'use strict';
  var FX = window.__FX || {};
  var D = FX.dokit || {};
  var CALL = FX.callablet || {};
  window.__fxKirj = [];

  function proxy() {   // kaikki tuntematon: kutsuttava, ketjutettava, await → itsensä (then puuttuu)
    var f = function () { return proxy(); };
    return new Proxy(f, { get: function (t, k) { if (k === 'then' || k === Symbol.toPrimitive || k === Symbol.iterator) return undefined; if (k === 'toString') return function () { return ''; }; return proxy(); }, apply: function () { return proxy(); } });
  }
  function ts(ms) { return { seconds: Math.floor(ms / 1000), nanoseconds: 0, toDate: function () { return new Date(ms); }, toMillis: function () { return ms; }, valueOf: function () { return ms; }, isEqual: function (o) { return o && o.toMillis && o.toMillis() === ms; } }; }
  function elvyta(x) {   // syväkopio + { __ts } → Timestamp
    if (x === null || typeof x !== 'object') return x;
    if (Array.isArray(x)) return x.map(elvyta);
    if (typeof x.__ts === 'string') return ts(Date.parse(x.__ts));
    var o = {}; for (var k in x) o[k] = elvyta(x[k]); return o;
  }
  function raaka(x) { return x == null ? x : JSON.parse(JSON.stringify(x, function (k, v) { return v && typeof v === 'object' && typeof v.toMillis === 'function' ? { __ts: new Date(v.toMillis()).toISOString() } : v; })); }
  function getP(o, p) { return String(p).split('.').reduce(function (a, k) { return a == null ? a : a[k]; }, o); }
  function vrt(v) { return v && typeof v === 'object' && typeof v.toMillis === 'function' ? v.toMillis() : (v && typeof v === 'object' && typeof v.__ts === 'string') ? Date.parse(v.__ts) : v; }
  function ehto(data, w, id) {
    var a = w[0] === '__name__' ? id : getP(data, w[0]), op = w[1], b = w[2], av = vrt(a), bv = vrt(b);
    switch (op) {
      case '==': return JSON.stringify(av) === JSON.stringify(bv);
      case '!=': return a !== undefined && JSON.stringify(av) !== JSON.stringify(bv);
      case 'array-contains': return Array.isArray(a) && a.indexOf(b) >= 0;
      case 'array-contains-any': return Array.isArray(a) && (b || []).some(function (x) { return a.indexOf(x) >= 0; });
      case 'in': return (b || []).some(function (x) { return JSON.stringify(x) === JSON.stringify(av); });
      case 'not-in': return a !== undefined && !(b || []).some(function (x) { return JSON.stringify(x) === JSON.stringify(av); });
      case '>': return av > bv; case '>=': return av >= bv; case '<': return av < bv; case '<=': return av <= bv;
      default: return true;
    }
  }
  function dsnap(path) {
    var on = D[path] !== undefined;
    return { id: path.split('/').pop(), exists: on, ref: dref(path), metadata: { hasPendingWrites: false, fromCache: false }, data: function () { return on ? elvyta(D[path]) : undefined; }, get: function (k) { return on ? elvyta(getP(D[path], k)) : undefined; } };
  }
  function kirjaa(tyyppi, path, v) { window.__fxKirj.push({ tyyppi: tyyppi, path: path, v: raaka(v) }); }
  function yhdista(vanha, uusi) {
    var o = Object.assign({}, vanha || {});
    Object.keys(uusi || {}).forEach(function (k) {
      var v = uusi[k];
      if (k.indexOf('.') > 0) { var ks = k.split('.'), c = o; for (var i = 0; i < ks.length - 1; i++) { c[ks[i]] = Object.assign({}, c[ks[i]] || {}); c = c[ks[i]]; } c[ks[ks.length - 1]] = v; }
      else o[k] = v;
    });
    return o;
  }
  function dref(path) {
    return {
      path: path, id: path.split('/').pop(),
      get parent() { return cref(path.split('/').slice(0, -1).join('/')); },
      collection: function (c) { return cref(path + '/' + c); },
      get: function () { return Promise.resolve(dsnap(path)); },
      onSnapshot: function (cb) { var f = typeof cb === 'function' ? cb : cb && cb.next; setTimeout(function () { try { f && f(dsnap(path)); } catch (e) { console.warn('[fx] onSnapshot', e && e.message); } }, 0); return function () {}; },
      set: function (v, o) { kirjaa('set', path, v); D[path] = raaka(o && o.merge ? yhdista(D[path], v) : v); return Promise.resolve(); },
      update: function (v) { kirjaa('update', path, v); D[path] = raaka(yhdista(D[path], v)); return Promise.resolve(); },
      delete: function () { kirjaa('delete', path); delete D[path]; return Promise.resolve(); },
      isEqual: function (o) { return o && o.path === path; },
    };
  }
  function qsnap(docs) { return { docs: docs, size: docs.length, empty: !docs.length, forEach: function (f) { docs.forEach(f); }, docChanges: function () { return docs.map(function (d) { return { type: 'added', doc: d }; }); }, metadata: { fromCache: false } }; }
  function query(path, s, ryhma) {
    s = s || { w: [], o: [], n: null };
    function lista() {
      var n = path.split('/').length + 1;
      var avaimet = Object.keys(D).filter(function (k) {
        if (ryhma) { var o = k.split('/'); return o.length >= 2 && o[o.length - 2] === ryhma; }
        return k.indexOf(path + '/') === 0 && k.split('/').length === n;
      });
      var docs = avaimet.filter(function (k) { return s.w.every(function (w) { return ehto(D[k], w, k.split('/').pop()); }); });
      s.o.slice().reverse().forEach(function (o) { docs.sort(function (a, b) { var x = vrt(getP(D[a], o[0])), y = vrt(getP(D[b], o[0])); var r = x === y ? 0 : (x === undefined ? 1 : y === undefined ? -1 : (x < y ? -1 : 1)); return o[1] === 'desc' ? -r : r; }); });
      if (s.n != null) docs = docs.slice(0, s.n);
      return docs.map(dsnap);
    }
    function uusi(muutos) { return query(path, Object.assign({ w: s.w, o: s.o, n: s.n }, muutos), ryhma); }
    return {
      path: path, id: path.split('/').pop(),
      where: function (a, b, c) { return uusi({ w: s.w.concat([[typeof a === 'string' ? a : String(a && a._k || a), b, c]]) }); },
      orderBy: function (a, d) { return uusi({ o: s.o.concat([[typeof a === 'string' ? a : String(a), d || 'asc']]) }); },
      limit: function (n) { return uusi({ n: n }); }, limitToLast: function (n) { return uusi({ n: n }); },
      startAfter: function () { return uusi({}); }, startAt: function () { return uusi({}); }, endAt: function () { return uusi({}); }, endBefore: function () { return uusi({}); },
      get: function () { return Promise.resolve(qsnap(lista())); },
      onSnapshot: function (cb, virhe) { var f = typeof cb === 'function' ? cb : cb && cb.next; setTimeout(function () { try { f && f(qsnap(lista())); } catch (e) { console.warn('[fx] onSnapshot', e && e.message); } }, 0); return function () {}; },
      count: function () { return { get: function () { var n = lista().length; return Promise.resolve({ data: function () { return { count: n }; } }); } }; },
    };
  }
  function cref(path) {
    var q = query(path);
    q.doc = function (id) { return dref(path + '/' + (id || ('fx' + Math.random().toString(36).slice(2, 10)))); };
    q.add = function (v) { var id = 'fx' + (window.__fxKirj.length + 1); kirjaa('add', path + '/' + id, v); D[path + '/' + id] = raaka(v); return Promise.resolve(dref(path + '/' + id)); };
    return q;
  }
  function batch() { var ops = []; return { set: function (r, v, o) { ops.push(function () { return r.set(v, o); }); return this; }, update: function (r, v) { ops.push(function () { return r.update(v); }); return this; }, delete: function (r) { ops.push(function () { return r.delete(); }); return this; }, commit: function () { return Promise.all(ops.map(function (f) { return f(); })); } }; }
  var db = {
    collection: function (c) { return cref(c); }, doc: function (p) { return dref(p); }, collectionGroup: function (n) { return query('', null, n); },
    batch: batch, runTransaction: function (fn) { var tx = { get: function (r) { return r.get(); }, set: function (r, v, o) { r.set(v, o); return tx; }, update: function (r, v) { r.update(v); return tx; }, delete: function (r) { r.delete(); return tx; } }; return Promise.resolve(fn(tx)); },
    settings: function () {}, enablePersistence: function () { return Promise.resolve(); }, enableNetwork: function () { return Promise.resolve(); }, disableNetwork: function () { return Promise.resolve(); }, clearPersistence: function () { return Promise.resolve(); }, terminate: function () { return Promise.resolve(); },
  };
  var FV = { serverTimestamp: function () { return ts(Date.now()); }, delete: function () { return undefined; }, arrayUnion: function () { return [].slice.call(arguments); }, arrayRemove: function () { return []; }, increment: function (n) { return n; } };
  var TS = { now: function () { return ts(Date.now()); }, fromDate: function (d) { return ts(d.getTime()); }, fromMillis: function (m) { return ts(m); } };
  function FP() { this._k = [].slice.call(arguments).join('.'); } FP.documentId = function () { return '__name__'; };
  var firestore = function () { return db; }; firestore.FieldValue = FV; firestore.Timestamp = TS; firestore.FieldPath = FP; firestore.CACHE_SIZE_UNLIMITED = -1;

  var K = FX.kayttaja || {};
  var user = FX.kirjautunut === false ? null : { uid: K.uid || 'fx-u1', email: K.email || null, displayName: K.nimi || null, isAnonymous: false, emailVerified: true, providerData: [],
    getIdToken: function () { return Promise.resolve('fx-token'); }, getIdTokenResult: function () { return Promise.resolve({ claims: FX.claims || {}, token: 'fx-token' }); }, reload: function () { return Promise.resolve(); } };
  var auth = { currentUser: user, onAuthStateChanged: function (cb) { setTimeout(function () { cb(user); }, 20); return function () {}; }, onIdTokenChanged: function (cb) { setTimeout(function () { cb(user); }, 20); return function () {}; },
    signInWithCustomToken: function () { return Promise.resolve({ user: user }); }, signInWithEmailAndPassword: function () { return Promise.resolve({ user: user }); }, signInWithPopup: function () { return Promise.resolve({ user: user }); }, signInWithRedirect: function () { return Promise.resolve(); }, getRedirectResult: function () { return Promise.resolve({ user: null }); },
    signOut: function () { return Promise.resolve(); }, setPersistence: function () { return Promise.resolve(); }, useDeviceLanguage: function () {}, sendPasswordResetEmail: function () { return Promise.resolve(); }, languageCode: 'fi' };
  var authF = function () { return auth; }; authF.GoogleAuthProvider = function () { this.setCustomParameters = function () {}; this.addScope = function () {}; }; authF.Auth = { Persistence: { LOCAL: 'local', SESSION: 'session', NONE: 'none' } };
  var functions = { httpsCallable: function (n) { return function (d) { window.__fxKirj.push({ tyyppi: 'callable', path: n, v: raaka(d) }); return n in CALL ? Promise.resolve({ data: elvyta(CALL[n]) }) : Promise.reject(Object.assign(new Error('fx: callable ' + n + ' ei fixturessa'), { code: 'unavailable' })); }; }, useEmulator: function () {} };
  var app = { name: '[DEFAULT]', options: {}, firestore: firestore, auth: authF, functions: function () { return functions; }, storage: function () { return proxy(); }, appCheck: function () { return { activate: function () {}, setTokenAutoRefreshEnabled: function () {} }; }, delete: function () { return Promise.resolve(); } };
  var F = {
    SDK_VERSION: 'fx', apps: [app], app: function () { return app; },
    initializeApp: function (cfg, nimi) { if (nimi) { var a = Object.assign({}, app, { name: nimi }); F.apps.push(a); return a; } return app; },
    firestore: firestore, auth: authF, functions: function () { return functions; }, storage: function () { return proxy(); },
    appCheck: Object.assign(function () { return app.appCheck(); }, { ReCaptchaEnterpriseProvider: function () {}, ReCaptchaV3Provider: function () {} }),
    messaging: Object.assign(function () { return proxy(); }, { isSupported: function () { return false; } }), analytics: function () { return proxy(); },
  };
  window.firebase = new Proxy(F, { get: function (t, k) { return k in t ? t[k] : proxy(); } });
})();
