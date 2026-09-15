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

var _tmAppCheckTila = { aktivoitu: false, syy: null };

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

/* Palauttaa true jos aktivointi tehtiin (tai oli jo tehty). Idempotentti. */
function tmAppCheckAktivoi() {
  if (_tmAppCheckTila.aktivoitu) return true;
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

    firebase.appCheck().activate(
      new firebase.appCheck.ReCaptchaEnterpriseProvider(TM_APPCHECK_SITE_KEY),
      true                                  // isTokenAutoRefreshEnabled
    );
    _tmAppCheckTila.aktivoitu = true;
    _tmAppCheckTila.syy = dbg ? 'debug_token' : 'enterprise';
    try { console.log('[AppCheck] aktivoitu (' + _tmAppCheckTila.syy + ')'); } catch (e) {}
    return true;
  } catch (e) {
    _tmAppCheckTila.syy = 'heitti:' + (e && e.message);
    try { console.warn('[AppCheck] aktivointi epäonnistui:', e && e.message); } catch (e2) {}
    return false;
  }
}

function tmAppCheckTila() { return { aktivoitu: _tmAppCheckTila.aktivoitu, syy: _tmAppCheckTila.syy }; }

if (typeof window !== 'undefined') {
  window.TM_APPCHECK_SITE_KEY = TM_APPCHECK_SITE_KEY;   // modulaariset apit lukevat avaimen tästä
  window.tmAppCheckAktivoi = tmAppCheckAktivoi;
  window.tmAppCheckTila = tmAppCheckTila;
}
if (typeof module !== 'undefined' && module.exports) {
  module.exports = { TM_APPCHECK_SITE_KEY: TM_APPCHECK_SITE_KEY, tmAppCheckAktivoi: tmAppCheckAktivoi, tmAppCheckTila: tmAppCheckTila };
}
