/* TalentMaster — Service Worker (Pelaaja) — PWA-vaihe 1
   Polut ABSOLUUTTISIA (/talentmaster/...) — GitHub Pages tarjoaa tästä hakemistosta.

   KORJATTU 2026-06-11 (cachebugi): SW EI saa kaapata muiden appien (VP/Master/Excel)
   sivuja. Aiempi versio cachetti Cache First -strategialla KAIKKI scopen (/talentmaster/)
   fetchit → toisten appien HTML jäätyi cacheen, ?v= ei auttanut. Nyt ALLOWLIST:
   - Oma HTML (Pelaaja_v7) → NETWORK-FIRST, fallback cacheen vain offline-tilassa (kenttäkäyttö).
   - Omat JS-moduulit + manifest + ikonit + versioidut fontit/SDK → cache-first.
   - KAIKKI muu (toisten appien sivut, raw.githubusercontent, jne.) → suoraan verkkoon, EI cachea.
   Scopea ei voi kaventaa (SW juuressa) → allowlist hoitaa rajaamisen. CLAUDE.md §27.4. */
const CACHE = 'tm-pelaaja-v8';
const SHELL = '/talentmaster/TalentMaster_Pelaaja_v7.html';
// VAIN oma shell — JS-moduulit ovat ?v=-versioituja (bare-polku ei matchaisi), allowlist cachettaa ne
// pyydettäessä. (Vanha PRECACHE viittasi /talentmaster/tm_eerikkila_normit.js → 404, jota Pelaaja ei lataa
// → addAll olisi hylännyt installin.)
const PRECACHE = [SHELL];

self.addEventListener('install', function (e) {
  e.waitUntil(
    caches.open(CACHE)
      .then(function (c) { return c.addAll(PRECACHE); })
      .then(function () { return self.skipWaiting(); })
  );
});

self.addEventListener('activate', function (e) {
  e.waitUntil(
    // Siivoa KAIKKI muut cachet kuin nykyinen (ml. poisoned tm-pelaaja-v1 jossa oli muiden appien sivuja).
    caches.keys().then(function (keys) {
      return Promise.all(keys
        .filter(function (k) { return k !== CACHE; })
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

// Pelaajan OMA HTML (navigaatiot) — vain tämä cachetetaan network-first + offline-fallback.
function onOmaHtml(url) {
  return url.indexOf('/talentmaster/TalentMaster_Pelaaja_v7.html') !== -1;
}

// Allowlist cache-first-assetteille: Pelaajan omat tiedostot + versioidut 3. osapuolen assetit.
// Omat JS-moduulit ovat versioituja (?v=) HTML:ssä → cache-first ei vanhene väärin. EI muiden appien sivuja.
function onAllowlist(url) {
  if (url.indexOf('/talentmaster/manifest_pelaaja.json') !== -1) return true;
  if (url.indexOf('/talentmaster/assets/pwa/') !== -1) return true;       // omat ikonit
  // Pelaajan tarvitsemat omat JS-moduulit (URL:ssä ?v= → versioitu, cache-first turvallinen)
  if (/\/talentmaster\/(harjoitelogiikka_v4|tm_why_lauseet|tm-bus|tm-demo|tm_sentry)\.js/.test(url)) return true;
  // HUOM: Sentry CDN (browser.sentry-cdn.com) + ingest (*.ingest.*.sentry.io) EIVÄT ole allowlistissa
  // → suora verkko, EI cachea (cross-origin telemetria ei kuulu PWA-cacheen). Tietoinen valinta.
  if (url.indexOf('/talentmaster/lib/tm-microcycles.js') !== -1) return true;
  if (url.indexOf('/talentmaster/lib/tm_eerikkila_normit.js') !== -1) return true;
  if (url.indexOf('/talentmaster/lib/tm_idp.js') !== -1) return true;   // 3c-a pelaajan aikajana
  if (url.indexOf('/talentmaster/docs/testit_indeksit.js') !== -1) return true;
  if (url.indexOf('gstatic.com/firebasejs/') !== -1) return true;         // Firebase SDK (versioitu URL)
  if (url.indexOf('fonts.googleapis.com') !== -1) return true;            // Google Fonts CSS
  if (url.indexOf('fonts.gstatic.com') !== -1) return true;               // Google Fonts -fontit
  return false;
}

self.addEventListener('fetch', function (e) {
  var req = e.request;
  var url = req.url;

  // Ei-GET (POST yms.) ja Firebase API → suoraan verkkoon (ei SW-välitystä, ei cachea)
  if (req.method !== 'GET' || onFirebaseApi(url)) return;

  // HTML-navigaatiot: vain OMA HTML network-first. Muiden appien sivut (VP/Master/Excel)
  // → ei respondWith → selain hakee normaalisti verkosta (?v= + HTTP-cache toimivat). EI kaappausta.
  if (req.mode === 'navigate') {
    if (!onOmaHtml(url)) return;
    e.respondWith(
      fetch(req).then(function (resp) {
        if (resp && resp.ok) { var cp = resp.clone(); caches.open(CACHE).then(function (c) { c.put(SHELL, cp); }); }
        return resp;
      }).catch(function () { return caches.match(SHELL); })   // offline → oma shell (kenttäkäyttö)
    );
    return;
  }

  // Allowlist-assetit: cache-first (offline). Kaikki muu → ei respondWith → suoraan verkkoon.
  if (onAllowlist(url)) {
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
    return;
  }

  // KAIKKI muu (toisten appien HTML/JS, raw.githubusercontent, data) → selaimen oletus, EI cachea.
});
