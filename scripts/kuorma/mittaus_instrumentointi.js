'use strict';
/* mittaus_instrumentointi.js — projekti 06 PR 3: selaimeen ennen sivun skriptejä ajettava alustus (Playwright addInitScript). Sisältö ajetaan SELAIMESSA — funktio on serialisoitava, ei viittauksia ulkopuolelle.
 * Tekee kolme asiaa (VAIHE0 3.1):
 *   1. Firestore-lukujen laskenta: kietoo compat-SDK:n Query.get, DocumentReference.get ja Query/DocumentReference.onSnapshot → window.__tmM.luvut = { <kokoelma>: <dokumenttia> }, yht.
 *      Laskutuksen mukainen approksimaatio: kysely = palautetut dokumentit (väh. 1), doc.get = 1, onSnapshot = palvelimelta tulleet muutokset (ei välimuistista). Totuus = Cloud Monitoring document/read_count (mittaa_monitoring.js).
 *   2. "Kiireiset" jaksot (pitkät tehtävät > 50 ms + avoimet Firestore-luvut) → laskeInteraktiivinen() (mittaus_lib.js) laskee ajan interaktiiviseksi.
 *   3. App Check -debug-token (vain jos annettu; ei tulosteeseen): self.FIREBASE_APPCHECK_DEBUG_TOKEN + localStorage (lib/tm_appcheck.js sallii vain preview/staging-kanavan hostit).
 * Koukku: window.firebase-asetin → firebase.firestore-asetin (compat-SDK rekisteröi nimiavaruuden sijoituksella) → kietominen heti kun Query/DocumentReference ovat olemassa. __tmM.kiinnitetty = true kun kietominen onnistui. */
function instrumentointi(a) {
  var M = window.__tmM = { luvut: {}, dokTavut: {}, dokEiMitattu: 0, yht: 0, varit: [], avoimet: 0, kiinnitetty: false, snapshotit: 0, virheet: [] };
  try { if (a && a.token) { self.FIREBASE_APPCHECK_DEBUG_TOKEN = a.token; try { localStorage.setItem('tm_appcheck_debug', a.token); } catch (e) {} } } catch (e) {}
  try { new PerformanceObserver(function (l) { l.getEntries().forEach(function (e) { M.varit.push([e.startTime, e.startTime + e.duration]); }); }).observe({ type: 'longtask', buffered: true }); } catch (e) {}
  try { new PerformanceObserver(function (l) { l.getEntries().forEach(function (e) { if (e.name === 'first-contentful-paint') M.fcp = e.startTime; }); }).observe({ type: 'paint', buffered: true }); } catch (e) {}
  function lisaa(nimi, n) { M.luvut[nimi] = (M.luvut[nimi] || 0) + n; M.yht += n; }
  /* Dokumenttitavut kokoelmittain (Vaihe 0 B.6 #5): JSON-merkkimäärä dokumentin data():sta (≈ purettu koko; ei sisällä protokollan kehystä). Selvittää, miksi purettu Fetch (Master ~93 MB) ylittää dokumenttisumman. Ei kaada mittausta: epäonnistunut dokumentti → dokEiMitattu++. */
  function tavuta(nimi, docs) {
    try { var n = 0; for (var i = 0; i < docs.length; i++) { try { n += JSON.stringify(docs[i].data()).length; } catch (e) { M.dokEiMitattu++; } } M.dokTavut[nimi] = (M.dokTavut[nimi] || 0) + n; } catch (e) { M.virheet.push(String(e && e.message || e)); }
  }
  function kokoelma(o, onDoc) {
    try {
      if (onDoc) return (o.parent && o.parent.id) || (o.path && String(o.path).split('/').slice(-2, -1)[0]) || 'tuntematon';
      var d = o._delegate || o, q = d._query || d, cg = q.collectionGroup; if (cg) return 'cg:' + cg;
      var p = q.path || d._path; if (p) { var s = p.segments || (p.canonicalString ? p.canonicalString().split('/') : null); if (s && s.length) return s[s.length - 1]; }
      if (o.path) return String(o.path).split('/').pop();
    } catch (e) {}
    return 'tuntematon';
  }
  function kietoGet(proto, onDoc) {
    var alku = proto.get; if (typeof alku !== 'function' || alku.__tm) return;
    proto.get = function () {
      var t0 = performance.now(), nimi = kokoelma(this, onDoc); M.avoimet++;
      var p = alku.apply(this, arguments), valmis = function () { M.avoimet--; M.varit.push([t0, performance.now()]); };
      return p.then(function (s) { valmis(); lisaa(nimi, onDoc ? 1 : Math.max(1, s.size != null ? s.size : (s.docs ? s.docs.length : 1))); tavuta(nimi, onDoc ? (s && s.exists ? [s] : []) : (s && s.docs ? s.docs : [])); return s; }, function (e) { valmis(); throw e; });
    };
    proto.get.__tm = true;
  }
  function kietoSnapshot(proto, onDoc) {
    var alku = proto.onSnapshot; if (typeof alku !== 'function' || alku.__tm) return;
    proto.onSnapshot = function () {
      var args = Array.prototype.slice.call(arguments), nimi = kokoelma(this, onDoc), t0 = performance.now(), ensin = true; M.avoimet++;
      function laske(s) {
        try {
          if (ensin) { ensin = false; M.avoimet--; M.varit.push([t0, performance.now()]); }
          M.snapshotit++; var cache = s && s.metadata && s.metadata.fromCache;
          if (!cache) { lisaa(nimi, onDoc ? 1 : Math.max(1, (typeof s.docChanges === 'function' ? s.docChanges().length : (s.size || 0)))); tavuta(nimi, onDoc ? (s && s.exists ? [s] : []) : (typeof s.docChanges === 'function' ? s.docChanges().map(function (c) { return c.doc; }) : (s.docs || []))); }
        } catch (e) { M.virheet.push(String(e && e.message || e)); }
      }
      var i = args.findIndex(function (x) { return typeof x === 'function' || (x && typeof x.next === 'function'); });
      if (i >= 0) { var f = args[i]; if (typeof f === 'function') args[i] = function (s) { laske(s); return f.apply(this, arguments); }; else { var n = f.next; args[i] = Object.assign({}, f, { next: function (s) { laske(s); return n.apply(f, arguments); } }); } }
      return alku.apply(this, args);
    };
    proto.onSnapshot.__tm = true;
  }
  function kieto(fs) {
    try {
      if (!fs || fs.__tmM || !fs.Query || !fs.DocumentReference) return; fs.__tmM = true;
      kietoGet(fs.Query.prototype, false); kietoGet(fs.DocumentReference.prototype, true);
      kietoSnapshot(fs.Query.prototype, false); kietoSnapshot(fs.DocumentReference.prototype, true);
      M.kiinnitetty = true;
    } catch (e) { M.virheet.push(String(e && e.message || e)); }
  }
  function firebaseKoukku(fb) {
    if (!fb || fb.__tmK) return; try { Object.defineProperty(fb, '__tmK', { value: true }); } catch (e) { return; }
    var fs = fb.firestore;
    try { Object.defineProperty(fb, 'firestore', { configurable: true, enumerable: true, get: function () { return fs; }, set: function (x) { fs = x; kieto(x); } }); } catch (e) { M.virheet.push('firestore-koukku: ' + e.message); }
    if (fs) kieto(fs);
  }
  var _fb = window.firebase;
  try { Object.defineProperty(window, 'firebase', { configurable: true, get: function () { return _fb; }, set: function (v) { _fb = v; firebaseKoukku(v); } }); } catch (e) { M.virheet.push('firebase-koukku: ' + e.message); }
  if (_fb) firebaseKoukku(_fb);
}
module.exports = { instrumentointi };
