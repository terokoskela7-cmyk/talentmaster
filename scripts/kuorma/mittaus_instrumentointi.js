'use strict';
/* mittaus_instrumentointi.js — projekti 06 PR 3: selaimeen ennen sivun skriptejä ajettava alustus (Playwright addInitScript). Sisältö ajetaan SELAIMESSA — funktio on serialisoitava, ei viittauksia ulkopuolelle.
 * Tekee kolme asiaa (VAIHE0 3.1):
 *   1. Firestore-lukujen laskenta: kietoo compat-SDK:n Query.get, DocumentReference.get ja Query/DocumentReference.onSnapshot → window.__tmM.luvut = { <kokoelma>: <dokumenttia> }, yht.
 *      Laskutuksen mukainen approksimaatio: kysely = palautetut dokumentit (väh. 1), doc.get = 1, onSnapshot = palvelimelta tulleet muutokset (ei välimuistista). Totuus = Cloud Monitoring document/read_count (mittaa_monitoring.js).
 *   2. "Kiireiset" jaksot (pitkät tehtävät > 50 ms + avoimet Firestore-luvut) → laskeInteraktiivinen() (mittaus_lib.js) laskee ajan interaktiiviseksi.
 *   3. App Check -debug-token (vain jos annettu; ei tulosteeseen): self.FIREBASE_APPCHECK_DEBUG_TOKEN + localStorage (lib/tm_appcheck.js sallii vain preview/staging-kanavan hostit).
 * Koukku: window.firebase-asetin → firebase.firestore-asetin (compat-SDK rekisteröi nimiavaruuden sijoituksella) → kietominen heti kun Query/DocumentReference ovat olemassa. __tmM.kiinnitetty = true kun kietominen onnistui. */
function instrumentointi(a) {
  var M = window.__tmM = { luvut: {}, erittely: {}, konsoli: [], dokTavut: {}, dokEiMitattu: 0, yht: 0, varit: [], avoimet: 0, auki: {}, seq: 0, kiinnitetty: false, snapshotit: 0, virheet: [] };
  /* appcheck_vaihto oli ennen AINA null: "kylmä" konteksti saa kirjautumisen storageStatesta (indexedDB: true) myös App Check -tokenin → SDK lukee voimassa olevan tokenin eikä vaihda mitään (todennettu paikallisesti: login 1 vaihtopyyntöä, storageStatella 0).
     Mittari kirjaa nyt (1) ettei Resource Timing -puskuri (oletus 250) täyty ja (2) onko voimassa oleva token IndexedDB:ssä alussa (→ ajat.appcheck_token_valimuistissa). null + true = ei vaihtoa, ei mittarivika. */
  try { performance.setResourceTimingBufferSize(2000); } catch (e) {}
  M.acValimuistissa = null;
  try {
    var rq = indexedDB.open('firebase-app-check-database');
    rq.onupgradeneeded = function () { M.acValimuistissa = false; try { rq.transaction.abort(); } catch (e) {} };   // ei vielä olemassa → älä luo (SDK luo itse)
    rq.onsuccess = function () { try { var db = rq.result, tx = db.transaction('firebase-app-check-store', 'readonly'), g = tx.objectStore('firebase-app-check-store').getAll(); g.onsuccess = function () { M.acValimuistissa = (g.result || []).some(function (r) { return r && r.value && r.value.expireTimeMillis > Date.now(); }); db.close(); }; g.onerror = function () { db.close(); }; } catch (e) { M.acValimuistissa = false; } };
  } catch (e) {}
  try { if (a && a.token) { self.FIREBASE_APPCHECK_DEBUG_TOKEN = a.token; try { localStorage.setItem('tm_appcheck_debug', a.token); } catch (e) {} } } catch (e) {}
  try { new PerformanceObserver(function (l) { l.getEntries().forEach(function (e) { M.varit.push([e.startTime, e.startTime + e.duration]); }); }).observe({ type: 'longtask', buffered: true }); } catch (e) {}
  try { new PerformanceObserver(function (l) { l.getEntries().forEach(function (e) { if (e.name === 'first-contentful-paint') M.fcp = e.startTime; }); }).observe({ type: 'paint', buffered: true }); } catch (e) {}
  /* Vaihemerkit (L2-regressioselvitys 15.11.): milloin istunto tiedettiin (tm-auth-odottaa pois), milloin kuori (#sDash tai #sLogin) tuli näkyviin. FCP = kuoren ensipiirto → merkit kertovat, onko viive ennen vai jälkeen auth-vaihetta. */
  M.merkit = {};
  try {
    var mk = function (n) { if (M.merkit[n] == null) M.merkit[n] = Math.round(performance.now()); };
    var tarkista = function () {
      try {
        var h = document.documentElement, od = !!(h && h.classList && h.classList.contains('tm-auth-odottaa')); if (od) M.merkit._nahtyOdotus = true; else if (M.merkit._nahtyOdotus) mk('auth_odottaa_pois');   // vain sivun oman odotusluokan poistuminen (luokka lisätään sivun alussa)
        var d = document.getElementById('sDash'); if (d && d.className.indexOf('hidden') < 0 && getComputedStyle(d).display !== 'none') mk('dash_nakyy');
        var l = document.getElementById('sLogin'); if (l && l.className.indexOf('hidden') < 0 && getComputedStyle(l).display !== 'none') mk('login_nakyy');
      } catch (e) {}
    };
    var mo = new MutationObserver(tarkista); mo.observe(document, { attributes: true, subtree: true, childList: true, attributeFilter: ['class', 'style'] });
  } catch (e) {}
  function lisaa(nimi, n, er) { M.luvut[nimi] = (M.luvut[nimi] || 0) + n; M.yht += n; if (er) { var e = M.erittely[er] = M.erittely[er] || { n: 0, kutsuja: 0 }; e.n += n; e.kutsuja++; } }
  /* --erittely (a.erittely): polku normalisoituna (id-segmentit → *) + kutsuja (sovelluskoodin ensimmäinen pinokehys) → M.erittely["polku ← funktio tiedosto:rivi"] = { n: dokumenttia, kutsuja: kutsuja }. Pino luetaan SYNKRONISESTI get()/onSnapshot()-kutsuhetkellä. */
  function erKey(o, onDoc) {
    if (!(a && a.erittely)) return null;
    try {
      var polku = null;
      if (onDoc) polku = o.path ? String(o.path) : null;
      else { var d = o._delegate || o, q = d._query || d, cg = q.collectionGroup; if (cg) polku = 'cg:' + cg; else { var pp = q.path || d._path; if (pp) polku = typeof pp === 'string' ? pp : (pp.segments || (pp.canonicalString ? pp.canonicalString().split('/') : [])).join('/'); else if (o.path) polku = String(o.path); } }
      polku = polku ? polku.split('/').map(function (x, i) { return (i % 2 === 1 && polku.indexOf('cg:') !== 0) ? '*' : x; }).join('/') : 'tuntematon';
      var rivit = String(new Error().stack || '').split('\n'), kutsuja = '?';
      for (var i = 1; i < rivit.length; i++) { if (/\.html|\/lib\//.test(rivit[i]) && rivit[i].indexOf('gstatic') < 0) { var m = /at (?:async )?([^\s(]+)?\s*\(?.*?([\w.\-]+\.(?:html|js)):(\d+)/.exec(rivit[i]); kutsuja = m ? ((m[1] || 'anon') + ' ' + m[2] + ':' + m[3]) : rivit[i].trim().slice(0, 90); break; } }
      return polku + ' \u2190 ' + kutsuja;
    } catch (e) { return null; }
  }
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
      var t0 = performance.now(), nimi = kokoelma(this, onDoc), er = erKey(this, onDoc), oid = ++M.seq; M.avoimet++; M.auki[oid] = { tyyppi: 'get', n: nimi, e: er, t: Math.round(t0) };
      var p = alku.apply(this, arguments), valmis = function () { M.avoimet--; delete M.auki[oid]; M.varit.push([t0, performance.now()]); };
      return p.then(function (s) { valmis(); lisaa(nimi, onDoc ? 1 : Math.max(1, s.size != null ? s.size : (s.docs ? s.docs.length : 1)), er); tavuta(nimi, onDoc ? (s && s.exists ? [s] : []) : (s && s.docs ? s.docs : [])); return s; }, function (e) { valmis(); throw e; });
    };
    proto.get.__tm = true;
  }
  function kietoSnapshot(proto, onDoc) {
    var alku = proto.onSnapshot; if (typeof alku !== 'function' || alku.__tm) return;
    proto.onSnapshot = function () {
      var args = Array.prototype.slice.call(arguments), nimi = kokoelma(this, onDoc), er = erKey(this, onDoc), t0 = performance.now(), ensin = true, oid = ++M.seq; M.avoimet++; M.auki[oid] = { tyyppi: 'snapshot', n: nimi, e: er, t: Math.round(t0), virhekutsu: false };
      function laske(s) {
        try {
          if (ensin) { ensin = false; M.avoimet--; delete M.auki[oid]; M.varit.push([t0, performance.now()]); }
          M.snapshotit++; var cache = s && s.metadata && s.metadata.fromCache;
          if (!cache) { lisaa(nimi, onDoc ? 1 : Math.max(1, (typeof s.docChanges === 'function' ? s.docChanges().length : (s.size || 0))), er); tavuta(nimi, onDoc ? (s && s.exists ? [s] : []) : (typeof s.docChanges === 'function' ? s.docChanges().map(function (c) { return c.doc; }) : (s.docs || []))); }
        } catch (e) { M.virheet.push(String(e && e.message || e)); }
      }
      var i = args.findIndex(function (x) { return typeof x === 'function' || (x && typeof x.next === 'function'); });
      if (i >= 0) { var f = args[i]; if (typeof f === 'function') args[i] = function (s) { laske(s); return f.apply(this, arguments); }; else { var n = f.next; args[i] = Object.assign({}, f, { next: function (s) { laske(s); return n.apply(f, arguments); } }); } }
      /* DIAGNOSTIIKKA (Tehtävä 2/1): virhe ennen ensimmäistä snapshotia EI vähennä avoimet-laskuria → silmukka ei pääty. Kirjataan virhekoodi auki-merkintään (ei muuta käytöstä). */
      function virheMerkki(e) { try { if (M.auki[oid]) { M.auki[oid].virhekutsu = true; M.auki[oid].koodi = (e && (e.code || e.message)) || 'tuntematon'; } } catch (x) {} }
      if (i >= 0) { var g = args[i]; if (typeof g === 'function') { var ev = args[i + 1]; if (typeof ev === 'function') args[i + 1] = function (e) { virheMerkki(e); return ev.apply(this, arguments); }; else if (ev == null) M.auki[oid].ilman_virhekuuntelijaa = true; } else if (g && typeof g.error === 'function') { var ge = g.error; args[i] = Object.assign({}, g, { error: function (e) { virheMerkki(e); return ge.apply(g, arguments); } }); } else M.auki[oid].ilman_virhekuuntelijaa = true; }
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
