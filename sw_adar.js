/* TalentMaster — ADAR Pikakortti (Pelihavainto) · service worker.
 *
 * MIKSI: ADAR on kenttätyökalu. Aiemmin offline-kyky tuli siitä että koko appi (fontit + Firebase-SDK)
 * oli inline-bundlattu yhteen tiedostoon. De-bundlen jälkeen offline on tämän SW:n vastuulla (§15).
 *
 * KAKSI SÄÄNTÖÄ JOITA EI SAA RIKKOA:
 *  1. ALLOWLIST (§27.4): SW cachettaa VAIN omat tiedostonsa + nimetyt riippuvuudet. Scope on
 *     origin-juuri, joten ilman tätä se nappaisi Master/VP/Seura-sivut cacheen — juuri se vika
 *     jäädytti muut apit kerran jo. Kaikki muu menee suoraan verkkoon, ilman cachea.
 *  2. VERSIOIDUT CACHET + skipWaiting/clients.claim: vanha SW-välimuisti oli "firebase is not
 *     defined" -haamun syy. activate siivoaa jokaisen muun kuin nykyisen cachen, joten uusi deploy
 *     syrjäyttää vanhan heti eikä jää sen taakse.
 *
 * Cache-versio on NOSTETTAVA aina kun ADARin HTML tai tämä tiedosto muuttuu.
 */
const CACHE = 'tm-adar-v1';

const OMA_HTML = '/TalentMaster_ADAR_Pikakortti.html';

/* Precache: vain appin oma shell. PIDÄ MINIMISSÄ — cache.addAll on ATOMINEN, joten yksikin 404
   kaataa koko installin eikä SW aktivoidu koskaan (§27.4:n FC-löydös). Kaikki muu (SDK:t, fontit)
   cachetetaan pyydettäessä allowlistin perusteella. */
const PRECACHE = [OMA_HTML];

/** Ulkopuoliset riippuvuudet jotka appi tarvitsee toimiakseen verkotta. */
const SALLITUT_ISANNAT = [
  'https://www.gstatic.com/firebasejs/',   // firebase-*-compat.js
  'https://fonts.googleapis.com/',         // fonttien CSS
  'https://fonts.gstatic.com/',            // fonttitiedostot
];

/** Oman originin tiedostot jotka kuuluvat TÄLLE apille (ei muiden appien sivuja). */
const OMAT_POLUT = [OMA_HTML, '/lib/tm_appcheck.js', '/sw_adar.js'];

const onOmaHtml = (url) => url.pathname.endsWith(OMA_HTML);
const onOmaPolku = (url) => OMAT_POLUT.some((p) => url.pathname.endsWith(p));
const onSallittuIsanta = (req) => SALLITUT_ISANNAT.some((p) => req.url.startsWith(p));

self.addEventListener('install', (e) => {
  e.waitUntil(
    caches.open(CACHE)
      .then((c) => c.addAll(PRECACHE.map((p) => new Request(p, { cache: 'reload' }))))
      .then(() => self.skipWaiting())
      .catch((err) => {
        // Älä jätä installia roikkumaan: ilman tätä epäonnistunut precache estäisi SW:n ikuisesti.
        console.warn('[sw_adar] precache epäonnistui:', err);
        return self.skipWaiting();
      }),
  );
});

self.addEventListener('activate', (e) => {
  e.waitUntil(
    caches.keys()
      .then((avaimet) => Promise.all(avaimet.filter((k) => k !== CACHE).map((k) => caches.delete(k))))
      .then(() => self.clients.claim()),
  );
});

self.addEventListener('fetch', (e) => {
  const req = e.request;
  if (req.method !== 'GET') return;                    // kirjoitukset → Firestoren oma offline-jono

  let url;
  try { url = new URL(req.url); } catch (_) { return; }

  // Oma HTML: network-first (tuore versio kun verkko on), cache varalla → offline-avaus toimii.
  if (onOmaHtml(url)) {
    e.respondWith(
      fetch(req)
        .then((vast) => {
          const kopio = vast.clone();
          caches.open(CACHE).then((c) => c.put(req, kopio));
          return vast;
        })
        .catch(() => caches.match(req).then((osuma) => osuma || Response.error())),
    );
    return;
  }

  // Omat moduulit + versioidut riippuvuudet: cache-first (muuttumattomia URL-versioinnin takia).
  if (onOmaPolku(url) || onSallittuIsanta(req)) {
    e.respondWith(
      caches.match(req).then((osuma) => osuma || fetch(req).then((vast) => {
        if (vast && (vast.ok || vast.type === 'opaque')) {
          const kopio = vast.clone();
          caches.open(CACHE).then((c) => c.put(req, kopio));
        }
        return vast;
      })),
    );
    return;
  }

  // Kaikki muu (Firestore, App Check, muiden appien sivut) → suoraan verkkoon, EI cachea.
});
