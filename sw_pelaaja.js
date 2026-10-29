/* TalentMaster — Service Worker (Pelaaja) — PWA-vaihe 1
   Polut SUHTEELLISIA/alipolkuriippumattomia: sama SW toimii Pages-alipolussa (/talentmaster/),
   Firebase-stagingissa ja custom-domainilla. SHELL on './'-suhteellinen (resolvoituu SW:n scopea
   vasten) ja allowlist-tarkistukset matchaavat polun LOPPUUN, eivät alipolkuetuliitteeseen.

   KORJATTU 2026-06-11 (cachebugi): SW EI saa kaapata muiden appien (VP/Master/Excel)
   sivuja. Aiempi versio cachetti Cache First -strategialla KAIKKI scopen
   fetchit → toisten appien HTML jäätyi cacheen, ?v= ei auttanut. Nyt ALLOWLIST:
   - Oma HTML (Pelaaja_v7) → NETWORK-FIRST, fallback cacheen vain offline-tilassa (kenttäkäyttö).
   - Omat JS-moduulit + manifest + ikonit + versioidut fontit/SDK → cache-first.
   - KAIKKI muu (toisten appien sivut, raw.githubusercontent, jne.) → suoraan verkkoon, EI cachea.
   Scopea ei voi kaventaa (SW juuressa) → allowlist hoitaa rajaamisen. CLAUDE.md §27.4. */
const CACHE = 'tm-pelaaja-dev';   // QG-2: deploy kirjoittaa tähän tm-pelaaja-<sisällön tiiviste> (scripts/versiotiiviste.js). Älä nosta käsin.
const SHELL = './TalentMaster_Pelaaja_v7.html';
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
  return url.indexOf('/TalentMaster_Pelaaja_v7.html') !== -1;
}

// Allowlist cache-first-assetteille: Pelaajan omat tiedostot + versioidut 3. osapuolen assetit.
// Omat JS-moduulit ovat versioituja (?v=) HTML:ssä → cache-first ei vanhene väärin. EI muiden appien sivuja.
function onAllowlist(url) {
  if (url.indexOf('/manifest_pelaaja.json') !== -1) return true;
  if (url.indexOf('/assets/pwa/') !== -1) return true;       // omat ikonit
  // Pelaajan tarvitsemat omat JS-moduulit (URL:ssä ?v= → versioitu, cache-first turvallinen)
  if (/\/(harjoitelogiikka_v4|tm_why_lauseet|tm-bus|tm-demo|tm_sentry)\.js/.test(url)) return true;
  // HUOM: Sentry CDN (browser.sentry-cdn.com) + ingest (*.ingest.*.sentry.io) EIVÄT ole allowlistissa
  // → suora verkko, EI cachea (cross-origin telemetria ei kuulu PWA-cacheen). Tietoinen valinta.
  if (url.indexOf('/lib/tm-microcycles.js') !== -1) return true;
  if (url.indexOf('/lib/tm_viikko.js') !== -1) return true;   // YKSI ISO 8601 -viikkolasku (audit 27, D140): harjoitelogiikka_v4 + tm-microcycles käyttävät
  if (url.indexOf('/lib/tm_eerikkila_normit.js') !== -1) return true;
  if (url.indexOf('/lib/tm_kotiharjoitteet.js') !== -1) return true;   // B 3/3: kotiharjoitteet offline-cacheen
  if (url.indexOf('/lib/tm_d3_itsearvio.js') !== -1) return true;   // Vaihe 1 (1d): pelaajan oma D3-itsearvio (offline-avaus)
  if (url.indexOf('/lib/tm_idp.js') !== -1) return true;   // 3c-a pelaajan aikajana
  if (url.indexOf('/lib/tm_idp_pelaaja_dok.js') !== -1) return true;   // Vaihe 1 1f-3: idp_pelaaja dual-read/-write offline-cacheen
  if (url.indexOf('/lib/tm_idp_pelaaja.js') !== -1) return true;
  if (url.indexOf('/lib/tm_tt_sv_valinta.js') !== -1) return true;   // P7 viimeiset sv: kielivalinta näyttöön (sama kuin Kehitystyöpöytä)
  if (url.indexOf('/lib/tm_taito_nimi.js') !== -1) return true;   // sv-aukot P7 kohta 8: taidon nimi pelaajan kielellä   // K1d: aikajanan tekstit käännösavaimilla (siirretty tm_idp.js:stä)
  if (url.indexOf('/lib/tm_koti_luvut.js') !== -1 || url.indexOf('/lib/tm_normisto.js') !== -1 || url.indexOf('/lib/tm_testipaiva.js') !== -1 || url.indexOf('/lib/tm_joukkuesaanto.js') !== -1 || url.indexOf('/lib/tm_tekniikka.js') !== -1 || url.indexOf('/lib/tm_fyysinen.js') !== -1) return true;   // PR 4 (K14): harjoitelogiikan kohdevalinta
  if (url.indexOf('/lib/tm_lang.js') !== -1) return true;   // i18n V0 — käännöstaulukko offline-cacheen
  if (url.indexOf('/lib/tm_ennatykset.js') !== -1) return true;   // PR D2: ennätysrivit alustoittain
  if (url.indexOf('/lib/tm_merkki_nakyma.js') !== -1) return true;   // palaute-näkyvyys 0a: merkkisääntö
  if (url.indexOf('/lib/tm_kalenteri_ilmoitus.js') !== -1) return true;
  if (url.indexOf('/lib/tm_ilmoitus_lista.js') !== -1) return true;   // K1c: ilmoituslista (ryhmittely, ✕ paikallaan)
  if (url.indexOf('/lib/tm_kalenteri_tilaus_ui.js') !== -1) return true;   // K35-7b: Lisää kalenteriini -modaali (offline-avaus)
  if (url.indexOf('/lib/tm_harjoituskertyma') !== -1) return true;   // K35-6f: harjoituskertymä (tm_harjoituskertyma.js + _nakyma.js; tm_viikko.js on jo allowlistillä)   // V2 P0.4: tapahtuman päättyminen + ilmoituksen päivä (offline)
  if (url.indexOf('/lib/tm_alusta.js') !== -1) return true;   // PR F: §22-alustasanasto (ennätyskortin alustanimi)
  if (url.indexOf('/lib/tm_phv_tila.js') !== -1) return true;   // PR C: PHV-tilan yksi lukusääntö (Kehitysvaihe-kortti, stage)
  if (url.indexOf('/lib/tm_mediaviesti.js') !== -1) return true;   // R6.4 PR 2: klippiketjun linkki + tyyppinimet
  if (url.indexOf('/lib/tm_lib_i18n.js') !== -1) return true;   // sv-käännöserä: kirjastojen sv-kartta (päätös A)
  if (url.indexOf('/lib/tm_klippi_perhe.js') !== -1) return true;   // R6.4 PR 2: Valmentajalta klippi / Katsokaa yhdessä
  if (url.indexOf('/lib/tm_kentta.js') !== -1) return true;   // K0: Kenttä-komponentti
  if (url.indexOf('/lib/tm_viikon_osa.js') !== -1) return true;   // K1b/4: viikon osa (Tämän viikon fokus) pelaajan Viikko-kortilla
  if (url.indexOf('/lib/tm_kentta_spec.js') !== -1) return true;   // C: pelaajan kenttäpiirros valmentajan asettamasta alueesta
  if (/\/lib\/tm_(liput|kielletyt|tukitavoitteet|joukkuejakso|taman_tueksi|tanaan_kentta|viikkokatsaus)\.js/.test(url)) return true;   // K1: Kenttä-näkymän libit (versioituja)
  if (url.indexOf('/lib/tm_reitin_valinta.js') !== -1) return true;   // K3: pelaaja valitsee seuraavan reitin (versioitu)
  if (url.indexOf('/assets/fonts/archivo-latin-wdth-normal.woff2') !== -1) return true;   // D11: Archivo omalta palvelimelta (ei Google Fonts)
  // Kaavio erä D1: konseptin piirros pelaajan kortilla. Inline-SVG, ei ulkoisia origineja →
  // toimii offline kun libit ovat cachessa (itse spec tulee Firestoresta ja vaatii verkon).
  if (/\/lib\/tm_kaavio_(render|konsepti|policy)\.js/.test(url)) return true;
  if (url.indexOf('/lib/tm_konsepti_resolve.js') !== -1) return true;   // vain kaanon-haku (tmKonseptiKaanon)
  if (url.indexOf('/lib/tm_teknistaktiset_sv.js') !== -1) return true;   // konseptikortin sisällön sv
  if (url.indexOf('/lib/tm_appcheck.js') !== -1) return true;   // V2 App Check — site key + aktivointi
  if (url.indexOf('/lib/tm_verkko.js') !== -1) return true;   // verkkokatkon käsittely kirjautumisessa
  if (url.indexOf('/lib/tm_tekija_nimi.js') !== -1) return true;   // tekijän nimi (tallennus + käännetty oletus)
  if (url.indexOf('/lib/tm_havaintohistoria.js') !== -1) return true;   // Valmentajalta-osion jarjestys
  // 1.10.2026: loput Pelaajan omat kirjastot (versioituja) — offline-avaus ilman verkkoa ei saa jättää niitä lataamatta.
  // tests/pelaaja_offline.test.js vaatii, että JOKAINEN Pelaaja_v7:n oma <script src> osuu allowlistiin.
  if (/\/lib\/tm_(piirros|adar_rubriikki|kortti_rubriikit|pelialy_yksilo|kehityskaari)\.js/.test(url)) return true;
  // HUOM: reCAPTCHA Enterprise (www.google.com/recaptcha/, gstatic.com/recaptcha/) EI ole
  // allowlistissa — attestointi on tuore-kutsu, ei cachettavaa. 'gstatic.com/firebasejs/'
  // -match on kapea eikä osu recaptchaan; app-check-compat.js cachettuu versioidulla URL:lla.
  if (url.indexOf('/lib/tm_teknistaktiset.js') !== -1) return true;   // 4b pelaajan cue-kerros
  if (url.indexOf('/docs/testit_indeksit.js') !== -1) return true;
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
