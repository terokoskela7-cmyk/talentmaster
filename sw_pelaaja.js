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
const CACHE = 'tm-pelaaja-v128';   // A (18.10.2026): klippikortti — iso Katso klippi -painike, Uusi-merkki, kortti ylimmäksi; tm_klippi_perhe.js ?v=3 (§27.4) — edellinen tm-pelaaja-v127 = Erä 67 sv viety (VP = tränarchef): i18n-kartat ja tm_lang ?v+1 (§27.4) — edellinen tm-pelaaja-v126 = Erät 65 + 66 sv viety: tm_lib_i18n ?v=15 (§27.4) — edellinen tm-pelaaja-v125 = B4b: tm_mediaviesti ?v=8 (klippirivin lainausmerkit ”…”) (§27.4) — edellinen tm-pelaaja-v124 = Klipin ajastettu-tila: tm_mediaviesti ?v=7 (tmMvAjastus, tila 'ajastettu') (§27.4) — edellinen tm-pelaaja-v123 = Erä 64 sv viety: tm_lib_i18n ?v=14 (§27.4) — edellinen tm-pelaaja-v122 = // B4a: tm_mediaviesti ?v=6 (tmMvLataaPelaajanKlipit, additiivinen) (§27.4) — edellinen tm-pelaaja-v121 = // Erä 61 sv viety: tm_lib_i18n ?v=13 (§27.4) — edellinen tm-pelaaja-v120 = Pelitilanne Vaihe 1: tm_pelialy_yksilo ?v=6 (pikakentät, ei näkyvää muutosta pelaajalle) (§27.4) — edellinen tm-pelaaja-v119 = Tekijän nimi jaettuun libiin (tm_tekija_nimi.js) (§27.4) — edellinen tm-pelaaja-v118 = Tekijän oletusnimi käännettynä pelaajakortilla (erä 60 -jatko) (§27.4) — edellinen tm-pelaaja-v117 = Erä 59 sv viety (tm_lib_i18n + tm_henkilosto_i18n ?v) (§27.4) — edellinen tm-pelaaja-v116 = Pikakortti-design + unelma/pelipaikka-kielivuodot (§27.4) — edellinen tm-pelaaja-v115 = Peliäly: erän 58 sv viety (tm_lib_i18n ?v) (§27.4) — edellinen tm-pelaaja-v114 = Peliäly: taso 5 + tuntemattomat pisteet = kuin 3 (§27.4) — edellinen tm-pelaaja-v113 = Peliäly: alyTaso reunatapaus (pisteet puuttuvat → harjoittele) (§27.4) — edellinen tm-pelaaja-v112 = Peliäly: osaamistavoite (porras) ohjaa seuraavaa askelta, alyTaso(taso, ctx), ?v rubriikki (§27.4) — edellinen tm-pelaaja-v111 = Peliäly-tasokorjaus: tmAdarTaso5/Norm99/Norm5, uusi ÄLY-rubriikki, D/R-tekstit, ?v-bumpit (§27.4) — edellinen tm-pelaaja-v110 = Sibbo-viimeistely: erän 56 sv viety (tietosuojaikkuna), tm_lang ?v=45 (§27.4) — edellinen tm-pelaaja-v109 = Sibbo-viimeistely: tm_lang ?v=44 (tietosuojaikkuna, erä 56) (§27.4) — edellinen tm-pelaaja-v108 = Sibbo 1.11. suostumus vaihe 1: erän 55 sv viety, tm_lang ?v=43 (§27.4) — edellinen tm-pelaaja-v107 = Sibbo 1.11. suostumus vaihe 1: tm_lang ?v=42 (suostumus.rek_*) (§27.4) — edellinen tm-pelaaja-v106 = B1: tm_kentta.js ?v=4 (alueotsikon taustalaikka, kehitystyöpöytä 22 B1) — edellinen tm-pelaaja-v103 = klippi ryhmälle: tm_mediaviesti.js ?v=5 (ryhmäkohde + oma videoklippi -varaus; ketju ennallaan) — edellinen tm-pelaaja-v102 =  sv-erä 19 osavienti: tm_lib_i18n.js ?v=4 (kt_jakso, kt_katselmus … ts_muistuta_nappi) (§27.4) — edellinen tm-pelaaja-v101 = K35-6c: viikkoilmoitus — tm_kalenteri_ilmoitus.js ?v nostettu (viikko-rivi) (§27.4) — edellinen tm-pelaaja-v100 = K35-11b: tm_kalenteri_tilaus_ui.js ?v nostettu (esto/virhesyyt) (§27.4) — edellinen tm-pelaaja-v99 = Sibbo-klippipolku sv: tm_mediaviesti.js ?v=4 + tm_klippi_perhe.js ?v=2 (viikonpäivä + pohjakysymys katsojan kielellä) (§27.4) — edellinen tm-pelaaja-v98 = ?v-korjaus (#1029-opetus): tm_harjoituskertyma[_nakyma].js ?v nostettu (sisältö oli muuttunut ilman bumppia) (§27.4) — edellinen tm-pelaaja-v97 = V-KOTI B: tm_joukkuejakso.js ?v=6 (tmJoukkueenJakso paattynytPv) (§27.4) — edellinen tm-pelaaja-v96 = K35-7b: + tm_kalenteri_tilaus_ui.js (§27.4) — edellinen tm-pelaaja-v95 = V-KOTI A: tm_joukkuejakso.js ?v=5 (tmJoukkueenJakso) (§27.4) — edellinen tm-pelaaja-v94 = K35-6f: + tm_harjoituskertyma[_nakyma].js (§27.4) — edellinen tm-pelaaja-v93 = yksi totuus: + tm_testipaiva.js (testipäivän lähde: oikea/arvio/tuntematon; tm_tekniikka riippuu) (§27.4) — edellinen tm-pelaaja-v92 = PR 4 (K14, #982): + tm_normisto.js (kolme kerrosta; kohdevalinnan riippuvuus) (§27.4) — edellinen tm-pelaaja-v91 = allowlistiin tm_koti_luvut/tm_joukkuesaanto/tm_tekniikka/tm_fyysinen (kohdevalinta SM/H-H-tasoista) (§27.4) — edellinen tm-pelaaja-v90 = tm_viikko.js allowlistiin (D140 ISO-viikko) (§27.4) — edellinen tm-pelaaja-v89 = sv-erä 3: tm_lang v39 + tm_lib_i18n v3 (§27.4) — edellinen tm-pelaaja-v88 = huoltajakutsu: tm_lang v38 (huoltajakutsu.*) (§27.4) — edellinen tm-pelaaja-v87 = huoltajan sähköpostin vahvistus: tm_lang +1 (vanhempi.vahvista_*) (§27.4) — edellinen tm-pelaaja-v86 = B4: kalenteri palvelimelta (haePelaajanKalenteri) + tm_kalenteri_ilmoitus v3 (§27.4) — edellinen tm-pelaaja-v85 = sv-läpiajo PR 5: Gemini-erä 2 viety (tm_lang v36, tm_lib_i18n v2, tm_henkilosto_i18n v2, tm_i18n_common v12) (§27.4) — edellinen tm-pelaaja-v84 = sv-läpiajo PR 3: tm_lang v35 (tmPvmLocale/tmPvmFmt) (§27.4) — edellinen tm-pelaaja-v83 = sv-läpiajo PR 2 (perheet): tm_lang v34 + tm_kalenteri_ilmoitus v2 + tm_pelialy_yksilo v4, Pelaaja_v7 reititetty (§27.4) — edellinen tm-pelaaja-v82 = sv-käännöserä: lib/tm_lib_i18n.js allowlistiin + tm_lang.js v33 (§27.4) — edellinen tm-pelaaja-v81 = R6.4 PR 2: tm_mediaviesti.js + tm_klippi_perhe.js allowlistiin — edellinen v80 = D54: tm_kentta.js v3 (ei 'ase' käyttäjälle) — v79 =   // V4b-2: tm_reitin_valinta.js v3 (Valmentajalta-rivi, tmValintaVoimassa pois) — v78 = // K3: tm_reitin_valinta.js allowlistiin — v77 = // K4: tm_viikkokatsaus.js allowlistiin — v76 = // K1: tm_liput/kielletyt/tukitavoitteet/joukkuejakso/taman_tueksi/tanaan_kentta allowlistiin — v75 = // B 3/3: tm_kotiharjoitteet.js allowlistiin — v74 =   // K0 (D11): tm_kentta.js + Archivo-fontti allowlistiin — v73 =   // P0.6b-korjaus: varapolun kokonaisaika kanonisella laskeKokonaistulos:lla — v72 = V2 P0.6b: mitali per kilpailu (tki_historia, ikä testihetkeltä, mikään ei katoa) — v71 = V2 P0.4 PR1: tm_kalenteri_ilmoitus.js + tm_lang v32 (ilm_tanaan/huomenna) — v70 = P0.3 (#774), v69 = P0.5 (#773), v68 = P0.7 (#772)
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
  if (url.indexOf('/lib/tm_idp.js') !== -1) return true;   // 3c-a pelaajan aikajana
  if (url.indexOf('/lib/tm_koti_luvut.js') !== -1 || url.indexOf('/lib/tm_normisto.js') !== -1 || url.indexOf('/lib/tm_testipaiva.js') !== -1 || url.indexOf('/lib/tm_joukkuesaanto.js') !== -1 || url.indexOf('/lib/tm_tekniikka.js') !== -1 || url.indexOf('/lib/tm_fyysinen.js') !== -1) return true;   // PR 4 (K14): harjoitelogiikan kohdevalinta
  if (url.indexOf('/lib/tm_lang.js') !== -1) return true;   // i18n V0 — käännöstaulukko offline-cacheen
  if (url.indexOf('/lib/tm_ennatykset.js') !== -1) return true;   // PR D2: ennätysrivit alustoittain
  if (url.indexOf('/lib/tm_kalenteri_ilmoitus.js') !== -1) return true;
  if (url.indexOf('/lib/tm_kalenteri_tilaus_ui.js') !== -1) return true;   // K35-7b: Lisää kalenteriini -modaali (offline-avaus)
  if (url.indexOf('/lib/tm_harjoituskertyma') !== -1) return true;   // K35-6f: harjoituskertymä (tm_harjoituskertyma.js + _nakyma.js; tm_viikko.js on jo allowlistillä)   // V2 P0.4: tapahtuman päättyminen + ilmoituksen päivä (offline)
  if (url.indexOf('/lib/tm_alusta.js') !== -1) return true;   // PR F: §22-alustasanasto (ennätyskortin alustanimi)
  if (url.indexOf('/lib/tm_phv_tila.js') !== -1) return true;   // PR C: PHV-tilan yksi lukusääntö (Kehitysvaihe-kortti, stage)
  if (url.indexOf('/lib/tm_mediaviesti.js') !== -1) return true;   // R6.4 PR 2: klippiketjun linkki + tyyppinimet
  if (url.indexOf('/lib/tm_lib_i18n.js') !== -1) return true;   // sv-käännöserä: kirjastojen sv-kartta (päätös A)
  if (url.indexOf('/lib/tm_klippi_perhe.js') !== -1) return true;   // R6.4 PR 2: Valmentajalta klippi / Katsokaa yhdessä
  if (url.indexOf('/lib/tm_kentta.js') !== -1) return true;   // K0: Kenttä-komponentti
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
