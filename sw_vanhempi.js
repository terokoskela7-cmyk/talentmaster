/* TalentMaster — Service Worker (Vanhempi/Perhe) — PWA-vaihe 1
   Polut SUHTEELLISIA/alipolkuriippumattomia: sama SW toimii Pages-alipolussa (/talentmaster/),
   Firebase-stagingissa ja custom-domainilla. SHELL on './'-suhteellinen (resolvoituu SW:n scopea
   vasten) ja allowlist-tarkistukset matchaavat polun LOPPUUN, eivät alipolkuetuliitteeseen.

   KORJATTU 2026-06-11 (cachebugi): SW EI saa kaapata muiden appien (VP/Master/Excel)
   sivuja. Aiempi versio cachetti Cache First -strategialla KAIKKI scopen
   fetchit → toisten appien HTML jäätyi cacheen, ?v= ei auttanut. Nyt ALLOWLIST:
   - Oma HTML (Vanhempi_v2) → NETWORK-FIRST, fallback cacheen vain offline-tilassa.
   - Omat staattiset assetit (manifest, ikonit) + versioidut fontit/SDK → cache-first.
   - KAIKKI muu (toisten appien sivut, raw.githubusercontent, jne.) → suoraan verkkoon, EI cachea.
   Scopea ei voi kaventaa (SW juuressa) → allowlist hoitaa rajaamisen. CLAUDE.md §27.4. */
const CACHE = 'tm-vanhempi-v53';   // sv-käännöserä: lib/tm_lib_i18n.js allowlistiin + tm_lang.js v33 (§27.4) — edellinen tm-vanhempi-v52 = R6.4 PR 2: tm_mediaviesti.js + tm_klippi_perhe.js allowlistiin — edellinen v51 = D54: tm_kentta.js v3 (ei 'ase' käyttäjälle) — v50 =   // K0 (D11): tm_kentta.js + Archivo-fontti allowlistiin — v49 =   // V2 P0.4 PR1: tm_kalenteri_ilmoitus.js + tm_lang v32 (ilm_tanaan/huomenna) — edellinen v48 = tm_lang v31 (V2 P0.6 -avaimet) — v47 = tm_ennatykset v6 (TK-siemen molemmat avainmuodot) — v46 = Design V2 T1: tekstikontrasti (teal-teksti → --teal-d, oma HTML) — v45 = TK min n 8→5
const SHELL = './TalentMaster_Vanhempi_v2.html';
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
    // Siivoa KAIKKI muut cachet kuin nykyinen (ml. poisoned tm-vanhempi-v1 jossa oli VP_v25.html).
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

// Vanhemman OMA HTML (navigaatiot) — vain tämä cachetetaan network-first + offline-fallback.
function onOmaHtml(url) {
  return url.indexOf('/TalentMaster_Vanhempi_v2.html') !== -1;
}

// Allowlist cache-first-assetteille: VAIN omat staattiset tiedostot + versioidut 3. osapuolen assetit
// (URL sisältää version → cache-first ei vanhene väärin). EI muiden appien JS/HTML:ää.
function onAllowlist(url) {
  if (url.indexOf('/manifest_vanhempi.json') !== -1) return true;
  if (url.indexOf('/tm_sentry.js') !== -1) return true;             // B2 Sentry-wrapper (?v= → cache-first)
  if (url.indexOf('/lib/tm_lang.js') !== -1) return true;           // i18n V0 — käännöstaulukko offline-cacheen
  if (url.indexOf('/lib/tm_alusta.js') !== -1) return true;   // PR D2: ennätysrivit alustoittain
  if (url.indexOf('/lib/tm_ennatykset.js') !== -1) return true;   // PR D2: ennätysrivit alustoittain
  if (url.indexOf('/lib/tm_kalenteri_ilmoitus.js') !== -1) return true;   // V2 P0.4: tapahtuman päättyminen + ilmoituksen päivä (offline)
  if (url.indexOf('/lib/tm_appcheck.js') !== -1) return true;   // V2 App Check — site key + aktivointi
  if (url.indexOf('/lib/tm_verkko.js') !== -1) return true;   // verkkokatkon käsittely kirjautumisessa
  if (url.indexOf('/lib/tm_pvm.js') !== -1) return true;   // tmPaivaIso: kirjaukset/{pvm} paikallisena (offline-avaus ei saa kaatua ReferenceErroriin)
  if (url.indexOf('/lib/tm_mediaviesti.js') !== -1) return true;   // R6.4 PR 2: klippiketjun linkki + tyyppinimet
  if (url.indexOf('/lib/tm_lib_i18n.js') !== -1) return true;   // sv-käännöserä: kirjastojen sv-kartta (päätös A)
  if (url.indexOf('/lib/tm_klippi_perhe.js') !== -1) return true;   // R6.4 PR 2: Valmentajalta klippi / Katsokaa yhdessä
  if (url.indexOf('/lib/tm_kentta.js') !== -1) return true;   // K0: Kenttä-komponentti
  if (url.indexOf('/assets/fonts/archivo-latin-wdth-normal.woff2') !== -1) return true;   // D11: Archivo omalta palvelimelta (ei Google Fonts)
  // HUOM: reCAPTCHA Enterprise (www.google.com/recaptcha/, gstatic.com/recaptcha/) EI ole
  // allowlistissa — attestointi on tuore-kutsu, ei cachettavaa. 'gstatic.com/firebasejs/'
  // -match on kapea eikä osu recaptchaan; app-check-compat.js cachettuu versioidulla URL:lla.
  if (url.indexOf('/docs/testit_indeksit.js') !== -1) return true;  // TKI-laskenta (?v= → cache-first ei vanhene väärin)
  if (url.indexOf('/assets/pwa/') !== -1) return true;       // omat ikonit
  if (url.indexOf('gstatic.com/firebasejs/') !== -1) return true;         // Firebase SDK (versioitu URL)
  if (url.indexOf('fonts.googleapis.com') !== -1) return true;            // Google Fonts CSS
  if (url.indexOf('fonts.gstatic.com') !== -1) return true;               // Google Fonts -fontit
  // HUOM: Sentry CDN (browser.sentry-cdn.com) + ingest (*.ingest.*.sentry.io) EIVÄT ole allowlistissa
  // → suora verkko, EI cachea (cross-origin telemetria ei kuulu PWA-cacheen). Tietoinen valinta.
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
      }).catch(function () { return caches.match(SHELL); })   // offline → oma shell
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
