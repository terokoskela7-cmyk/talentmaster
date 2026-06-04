/* TalentMaster — Service Worker (Pelaaja) — PWA-vaihe 1
   Polut ABSOLUUTTISIA (/talentmaster/...) — GitHub Pages tarjoaa tästä hakemistosta.
   Strategia: Firebase API → Network only (aina tuore) · muut → Cache First (offline).
   HUOM: Pelaaja & Vanhempi -SW jakavat saman scopen (/talentmaster/) → vain yksi on
   kerrallaan aktiivinen. activate poistaa vain TÄMÄN appin (tm-pelaaja-*) vanhat versiot. */
const CACHE = 'tm-pelaaja-v1';
const CACHE_PREFIX = 'tm-pelaaja-';
const SHELL = '/talentmaster/TalentMaster_Pelaaja_v7.html';
const PRECACHE = [
  SHELL,
  '/talentmaster/harjoitelogiikka_v4.js',
  '/talentmaster/tm_eerikkila_normit.js'
];

self.addEventListener('install', function (e) {
  e.waitUntil(
    caches.open(CACHE)
      .then(function (c) { return c.addAll(PRECACHE); })
      .then(function () { return self.skipWaiting(); })
  );
});

self.addEventListener('activate', function (e) {
  e.waitUntil(
    caches.keys().then(function (keys) {
      return Promise.all(keys
        .filter(function (k) { return k.indexOf(CACHE_PREFIX) === 0 && k !== CACHE; })
        .map(function (k) { return caches.delete(k); }));
    }).then(function () { return self.clients.claim(); })
  );
});

// Firebase / Google API -hostit: aina verkosta, ei koskaan välimuistista
function onFirebaseApi(url) {
  return url.indexOf('firestore.googleapis.com') !== -1
      || url.indexOf('cloudfunctions.net') !== -1
      || url.indexOf('firebaseio.com') !== -1
      || url.indexOf('identitytoolkit.googleapis.com') !== -1
      || url.indexOf('securetoken.googleapis.com') !== -1
      || url.indexOf('firebaseinstallations.googleapis.com') !== -1;
}

self.addEventListener('fetch', function (e) {
  var req = e.request;
  var url = req.url;

  // Firebase API: Network only (aina tuore data, ei välimuistia)
  if (onFirebaseApi(url)) { e.respondWith(fetch(req)); return; }

  // Vain GET välimuistitetaan; muut (POST yms.) suoraan verkkoon
  if (req.method !== 'GET') { e.respondWith(fetch(req)); return; }

  // Navigaatiot (esim. ...Pelaaja_v7.html?pelaajaId=X) — Cache First ignoreSearch,
  // fallback precache-shelliin offline-tilassa.
  if (req.mode === 'navigate') {
    e.respondWith(
      caches.match(req, { ignoreSearch: true }).then(function (cached) {
        return cached || fetch(req).then(function (resp) {
          if (resp && resp.ok) { var cp = resp.clone(); caches.open(CACHE).then(function (c) { c.put(req, cp); }); }
          return resp;
        }).catch(function () { return caches.match(SHELL); });
      })
    );
    return;
  }

  // Muut GET: Cache First (tarkka osuma → ?v= -cache-busting säilyy)
  e.respondWith(
    caches.match(req).then(function (cached) {
      if (cached) return cached;
      return fetch(req).then(function (resp) {
        if (resp && (resp.ok || resp.type === 'opaque')) {
          var cp = resp.clone();
          caches.open(CACHE).then(function (c) { c.put(req, cp); });
        }
        return resp;
      }).catch(function () { return cached; });
    })
  );
});
