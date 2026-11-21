/* tm_appcheck.js — Firebase App Check (reCAPTCHA Enterprise) · YKSI totuuslähde site keylle.
   Ladataan JOKAISESSA elävässä apissa joka koskee backendiin. Aktivointi tapahtuu
   tmAppCheckAktivoi():lla HETI firebase.initializeApp():n jälkeen ja ENNEN ensimmäistä
   Firestore/Auth/Functions/Storage-kutsua — App Check ei liity jälkikäteen jo luotuun palveluun.

   PROVIDER = reCAPTCHA **Enterprise**, ei klassinen v3. Firebase merkitsi v3:n vanhentuneeksi.
   Ero koodissa: activate() ottaa PROVIDER-INSTANSSIN, ei avainmerkkijonoa.
     v3 (vanha):    firebase.appCheck().activate('SITEKEY', true)
     Enterprise:    firebase.appCheck().activate(new firebase.appCheck.ReCaptchaEnterpriseProvider('SITEKEY'), true)

   SDK-VERSIO: jokainen appi lataa firebase-app-check-compat.js:n OMALLA versiollaan (sama kuin
   sen firebase-app-compat.js: 10.7.1 / 9.23.0 / 9.22.x). Tämä moduuli ei lataa SDK:ta eikä ota
   kantaa versioon — se vain aktivoi sen mitä sivulle on ladattu.

   GUARD-PERIAATE (sama kuin tm_sentry.js §33 B2): jos SDK puuttuu tai aktivointi heittää,
   funktio EI kaada appia. Monitoring-vaiheessa tokenin puuttuminen on vaaratonta (kutsut menevät
   läpi unverified-liikenteenä). ENFORCEN JÄLKEEN sama tilanne tarkoittaa hylättyjä kutsuja —
   siksi aktivointi logitetaan aina, jotta hiljainen ei-aktivoituminen näkyy konsolissa. */

/* Julkinen site key (reCAPTCHA Enterprise, avain 'talentmaster-appcheck', score-based,
   domain-verifiointi päällä). Julkinen arvo — kuuluu clientiin, ei ole salaisuus.
   Domain-rajaus + App Check -attestointi ovat sen suoja, ei salassapito. */
var TM_APPCHECK_SITE_KEY = '6Lf3tbstAAAAAE9fqxhiH9WltKEdT4NuJBXF0kjq';

/* REKISTERI window:ssa (ei moduulimuuttujissa): jos skripti jostain syystä evaluoituu kahdesti samassa ikkunassa (tuplalataus), var-uudelleenmäärittely nollaisi moduulin sisäisen tilan
   ja toinen tmAppCheckAktivoi() aktivoisi saman apin uudelleen (20.11.2026: "[AppCheck] aktivoitu (enterprise, appi [DEFAULT])" kahdesti). Rekisteri säilyy → aktivointi tapahtuu kerran per appi per ikkuna.
   HUOM: eri dokumentti (esim. Kehitystyöpöydän taktiikkataulu-iframe lataa Masterin ?upotettu=taktiikka) on OMA ikkunansa → oma aktivointi on oikein; loki kertoo kontekstin (ylin ikkuna / iframe). */
var _tmAppCheckRek = (typeof window !== 'undefined')
  ? (window.__tmAppCheckRek = window.__tmAppCheckRek || { aktivoidut: {}, tila: { aktivoitu: false, syy: null, recaptcha: 'ei_aktivoitu' } })
  : { aktivoidut: {}, tila: { aktivoitu: false, syy: null, recaptcha: 'ei_aktivoitu' } };
var _tmAppCheckTila = _tmAppCheckRek.tila;

/* Dokumenttitunniste lokiin: kaksi aktivointiriviä SAMALLA dokumentti-id:llä = oikea tuplaus (bugi); eri id:t = kaksi dokumenttia (esim. versiotarkistuksen reload `?_v=` tai iframe, loki säilytetty "Preserve log"). */
var _tmAppCheckDok = (typeof window !== 'undefined')
  ? (window.__tmAppCheckDok = window.__tmAppCheckDok || Math.random().toString(36).slice(2, 6))
  : 'node';
function _tmAppCheckDokTeksti() {
  var nav = '';
  try { var e = performance.getEntriesByType('navigation')[0]; nav = e && e.type ? ', nav ' + e.type : ''; } catch (e2) {}
  return ', dok ' + _tmAppCheckDok + nav;
}

function _tmAppCheckIkkuna() {
  try { return (typeof window !== 'undefined' && typeof window.top !== 'undefined' && window.top !== window) ? 'iframe' : 'ylin ikkuna'; } catch (e) { return 'iframe'; }   // cross-origin top → heittää → iframe
}

/* Debug-token vain EI-TUOTANTOISILLA hosteilla (localhost + preview-kanavat).
   Miksi rajattu: debug-token ohittaa attestoinnin. Se on rekisteröitävä Consoleen ennen kuin se
   toimii, mutta vuotanut token olisi tuotannossa ohituskeino — repossa ei ole build-vaihetta
   joka strippaisi koodin, joten rajaus tehdään ajonaikaisesti hostin perusteella.
   Tuotanto = terokoskela7-cmyk.github.io · talentmaster-pilot.web.app · talentmasterid.com. */
function _tmAppCheckDebugSallittu() {
  try {
    var h = location.hostname;
    if (h === 'localhost' || h === '127.0.0.1' || h === '' ) return true;
    return /--[a-z0-9-]+\.web\.app$/.test(h);            // Hosting preview/staging-kanava
  } catch (e) { return false; }
}

function _tmAppCheckDebugToken() {
  if (!_tmAppCheckDebugSallittu()) return null;
  try {
    if (typeof self !== 'undefined' && self.FIREBASE_APPCHECK_DEBUG_TOKEN) return self.FIREBASE_APPCHECK_DEBUG_TOKEN;
    return localStorage.getItem('tm_appcheck_debug') || null;
  } catch (e) { return null; }
}


/* A1 (laiska reCAPTCHA): ReCaptchaEnterpriseProvider.initialize() lataa reCAPTCHA-skriptin (~353 kt gz, ~2 s Slow 4G -puhelimella) HETI activate():ssa,
   vaikka IndexedDB:ssä olisi voimassa oleva App Check -token. Kääre siirtää oikean initialize():n ensimmäiseen provider.getToken()-kutsuun, jonka SDK tekee VAIN kun
   voimassa olevaa tokenia ei ole (muistissa/IndexedDB:ssä) tai proaktiivinen uusinta (50 % TTL + 5 min) erääntyy. Tuloksena:
   · lämmin avaus voimassa olevalla tokenilla EI lataa reCAPTCHAa lainkaan;  · kylmä avaus (ei tokenia) lataa sen heti activate():n jälkeisessä esihaussa → sama aloitusaika kuin ennen.
   ENFORCE-turva: kääre EI koskaan keksi tokenia eikä ohita oikeaa getToken():ia; virhe kulkee SDK:lle ennallaan. Jos providerin sisäinen rajapinta puuttuu (SDK-versio), palataan
   eagerin (ei käärettä) ja varoitetaan. Vain tämä yksi paikka (§38: yksi site key, yksi aktivointi). */
function _tmAppCheckLaiska(provider) {
  if (!provider || typeof provider.initialize !== 'function' || typeof provider.getToken !== 'function') return false;
  var alkuperainen = provider.initialize, haeToken = provider.getToken, appi = null, kaynnistetty = false;
  provider.initialize = function (a) { appi = a; _tmAppCheckTila.recaptcha = 'odottaa'; };   // SDK kutsuu tätä activate():ssa
  function kaynnista() {
    if (kaynnistetty || !appi) return;
    kaynnistetty = true; _tmAppCheckTila.recaptcha = 'ladataan';
    try { console.log('[AppCheck] reCAPTCHA ladataan (voimassa olevaa tokenia ei välimuistissa' + _tmAppCheckDokTeksti() + ')'); } catch (e) {}
    return alkuperainen.call(provider, appi);
  }
  provider.getToken = function () { kaynnista(); return haeToken.apply(provider, arguments); };
  return true;
}

/* Palauttaa true jos aktivointi tehtiin (tai oli jo tehty). Idempotentti PER APPI.
   `app` (valinnainen): NIMETTY compat-appi (esim. Pelaaja_v7:n 'tm-pelaaja'). Ilman argumenttia
   aktivoidaan oletusappi kuten ennen. Nimetty appi tarvitsee OMAN aktivointinsa: App Check sidotaan
   appiin, ei selaimeen, ja oletusapin aktivointi ei kata nimettyä. */
var _tmAppCheckAktivoidut = _tmAppCheckRek.aktivoidut;
function tmAppCheckAktivoi(app) {
  var nimi = (app && app.name) || '[DEFAULT]';
  if (_tmAppCheckAktivoidut[nimi]) return true;
  try {
    if (typeof firebase === 'undefined' || !firebase.appCheck) {
      _tmAppCheckTila.syy = 'sdk_puuttuu';
      try { console.warn('[AppCheck] firebase-app-check-compat.js ei ladattu — ei aktivoitu'); } catch (e) {}
      return false;
    }
    if (!firebase.appCheck.ReCaptchaEnterpriseProvider) {
      _tmAppCheckTila.syy = 'provider_puuttuu';
      try { console.warn('[AppCheck] ReCaptchaEnterpriseProvider puuttuu (liian vanha SDK?) — ei aktivoitu'); } catch (e) {}
      return false;
    }
    var dbg = _tmAppCheckDebugToken();
    if (dbg) { try { self.FIREBASE_APPCHECK_DEBUG_TOKEN = dbg; } catch (e) {} }

    var appCheck = (app && typeof app.appCheck === 'function') ? app.appCheck() : firebase.appCheck();
    var provider = new firebase.appCheck.ReCaptchaEnterpriseProvider(TM_APPCHECK_SITE_KEY);
    var laiska = _tmAppCheckLaiska(provider);
    if (!laiska) { _tmAppCheckTila.recaptcha = 'eager'; try { console.warn('[AppCheck] provider-rajapinta ei tuettu — reCAPTCHA ladataan heti (laiska lataus pois)'); } catch (e) {} }
    appCheck.activate(provider, true);      // isTokenAutoRefreshEnabled
    _tmAppCheckEsihaku(appCheck);
    _tmAppCheckAktivoidut[nimi] = true;
    _tmAppCheckTila.aktivoitu = true;
    _tmAppCheckTila.syy = dbg ? 'debug_token' : 'enterprise';
    try { console.log('[AppCheck] aktivoitu (' + _tmAppCheckTila.syy + ', appi ' + nimi + ', ' + _tmAppCheckIkkuna() + _tmAppCheckDokTeksti() + ')'); } catch (e) {}
    return true;
  } catch (e) {
    _tmAppCheckTila.syy = 'heitti:' + (e && e.message);
    try { console.warn('[AppCheck] aktivointi epäonnistui:', e && e.message); } catch (e2) {}
    return false;
  }
}


/* Esihaku heti aktivoinnin jälkeen: lukee voimassa olevan tokenin välimuistista (ei verkkoa), muuten käynnistää provider.getToken():n → reCAPTCHA latautuu rinnakkain sivun muun latauksen kanssa.
   Samalla ENFORCE-varoitus: jos tokenia ei saada, backend-kutsut hylätään — se näkyy konsolissa heti eikä vasta permission-deniedinä. */
function _tmAppCheckEsihaku(appCheck) {
  try {
    if (typeof appCheck.getToken !== 'function') return;
    Promise.resolve(appCheck.getToken(false)).then(function (r) {
      if (!r || !r.token || r.error || r.internalError) { _tmAppCheckTila.token = false; try { console.warn('[AppCheck] tokenia ei saatu — Firestore/Functions-kutsut lähtevät ilman voimassa olevaa tokenia ja ENFORCE hylkää ne:', (r && (r.error || r.internalError) && (r.error || r.internalError).message) || 'tyhjä token'); } catch (e) {} }
      else _tmAppCheckTila.token = true;
    }, function (e) { _tmAppCheckTila.token = false; try { console.warn('[AppCheck] tokenia ei saatu — kutsut lähtevät ilman tokenia ja ENFORCE hylkää ne:', e && e.message); } catch (e2) {} });
  } catch (e) { /* ei kaada appia */ }
}

function tmAppCheckTila() { return { aktivoitu: _tmAppCheckTila.aktivoitu, syy: _tmAppCheckTila.syy, recaptcha: _tmAppCheckTila.recaptcha, token: _tmAppCheckTila.token === undefined ? null : _tmAppCheckTila.token }; }

if (typeof window !== 'undefined') {
  window.TM_APPCHECK_SITE_KEY = TM_APPCHECK_SITE_KEY;   // modulaariset apit lukevat avaimen tästä
  window.tmAppCheckAktivoi = tmAppCheckAktivoi;
  window.tmAppCheckTila = tmAppCheckTila;
}
if (typeof module !== 'undefined' && module.exports) {
  module.exports = { TM_APPCHECK_SITE_KEY: TM_APPCHECK_SITE_KEY, tmAppCheckAktivoi: tmAppCheckAktivoi, tmAppCheckTila: tmAppCheckTila };
}
