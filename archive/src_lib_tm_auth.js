/**
 * TalentMaster™ — tm_auth.js
 * Yhteinen Firebase Auth -kirjasto kaikille näkymille
 *
 * KÄYTTÖ: Lisää <script src="...tm_auth.js"></script>
 * Firebase-scriptien JÄLKEEN mutta ennen omaa JS:ää.
 *
 * Tarjoaa:
 *   - TM.init(config)       — alustaa Firebase + Auth
 *   - TM.onAuth(callback)   — rekisteröi auth-kuuntelija
 *   - TM.kirjaudu(email, salasana) → Promise
 *   - TM.ulos()             → Promise
 *   - TM.kayttaja()         → nykyinen käyttäjä tai null
 *   - TM.rooli()            → Custom Claim rooli tai null
 *   - TM.seuraId()          → Custom Claim seuraId tai null
 *   - TM.onSuperAdmin()     → boolean
 *   - TM.haeSeura(db, uid)  → Promise<seura|null>
 *   - TM.db                 → Firestore-instanssi
 *   - TM.auth               → Auth-instanssi
 *   - TM.functions          → Functions-instanssi
 *
 * Firebase versio: 9.22.1 (compat)
 */

(function (global) {
  'use strict';

  // ── FIREBASE CONFIG ─────────────────────────────────────────────────────
  // Sama kaikissa TalentMaster-näkymissä
  var FIREBASE_CONFIG = {
    apiKey:            'AIzaSyAp471lOIntzP33p9bIW3y4KbeEyBt5kIo',
    authDomain:        'talentmaster-pilot.firebaseapp.com',
    projectId:         'talentmaster-pilot',
    storageBucket:     'talentmaster-pilot.firebasestorage.app',
    messagingSenderId: '872561784446',
    appId:             '1:872561784446:web:05c4c7996dfd46ddd14a2f',
  };

  // ── SISÄINEN TILA ────────────────────────────────────────────────────────
  var _app      = null;
  var _auth     = null;
  var _db       = null;
  var _fn       = null;
  var _alustettu = false;
  var _kirjautuminenKesken = false;
  var _callbacks = [];

  // ── ALUSTUS ──────────────────────────────────────────────────────────────
  /**
   * Alustaa Firebase-sovelluksen. Kutsutaan kerran per sivu.
   * Jos Firebase on jo alustettu, palauttaa olemassa olevat instanssit.
   * @param {Object} [extraConfig] — ylikirjoittaa oletuskonfigin kenttiä
   */
  function init(extraConfig) {
    if (_alustettu) return { app: _app, auth: _auth, db: _db, fn: _fn };

    var config = Object.assign({}, FIREBASE_CONFIG, extraConfig || {});

    // Estä duplikaatti-initialisointi
    try {
      _app = firebase.app();
    } catch (e) {
      _app = firebase.initializeApp(config);
    }

    _auth = firebase.auth();
    _db   = firebase.firestore();
    _fn   = firebase.functions ? firebase.functions() : null;

    // Cloud Functions region
    if (_fn && typeof _fn.useRegion === 'function') {
      _fn.useRegion('europe-west1');
    } else if (firebase.functions && typeof firebase.functions === 'function') {
      // Compat v9 tapa
      _fn = firebase.app().functions('europe-west1');
    }

    // Yksi ainoa onAuthStateChanged koko sovelluksessa
    _auth.onAuthStateChanged(async function (user) {
      if (_kirjautuminenKesken) return;

      // Haetaan Custom Claims token
      var claims = null;
      if (user) {
        try {
          var result = await user.getIdTokenResult(true);
          claims = result.claims || {};
        } catch (e) {
          claims = {};
        }
      }

      // Kutsutaan kaikki rekisteröidyt callbackit
      _callbacks.forEach(function (cb) {
        try { cb(user, claims); } catch (e) { console.error('[tm_auth] callback virhe:', e); }
      });
    });

    _alustettu = true;

    return { app: _app, auth: _auth, db: _db, fn: _fn };
  }

  // ── JULKINEN API ─────────────────────────────────────────────────────────

  /**
   * Rekisteröi auth-tilan muutoskuuntelija.
   * Callback: function(user, claims) {}
   * user = Firebase User tai null
   * claims = Custom Claims -objekti tai null
   */
  function onAuth(callback) {
    if (typeof callback !== 'function') return;
    _callbacks.push(callback);
  }

  /**
   * Kirjaudu sisään sähköpostilla ja salasanalla.
   * Asettaa _kirjautuminenKesken ennen kutsua.
   * @returns {Promise<UserCredential>}
   */
  async function kirjaudu(email, salasana) {
    _kirjautuminenKesken = true;
    try {
      var cred = await _auth.signInWithEmailAndPassword(email, salasana);
      // Haetaan Claims heti kirjautumisen jälkeen
      var result = await cred.user.getIdTokenResult(true);
      var claims = result.claims || {};
      _kirjautuminenKesken = false;
      // Kutsutaan callbackit manuaalisesti koska kesken-flagin takia ei automaattisesti
      _callbacks.forEach(function (cb) {
        try { cb(cred.user, claims); } catch (e) {}
      });
      return { user: cred.user, claims: claims };
    } catch (e) {
      _kirjautuminenKesken = false;
      throw e;
    }
  }

  /**
   * Kirjaudu ulos.
   * @returns {Promise<void>}
   */
  async function ulos() {
    // Kutsutaan callbackit null-käyttäjällä ennen signOut
    _callbacks.forEach(function (cb) {
      try { cb(null, null); } catch (e) {}
    });
    return _auth.signOut();
  }

  /**
   * Palauttaa nykyisen käyttäjän tai null.
   */
  function kayttaja() {
    return _auth ? _auth.currentUser : null;
  }

  /**
   * Palauttaa Custom Claim -roolin tai null.
   * HUOM: Käytä onAuth-callbackin claims-parametria mieluummin.
   */
  async function rooli() {
    var user = kayttaja();
    if (!user) return null;
    try {
      var result = await user.getIdTokenResult();
      return result.claims.rooli || result.claims.role || null;
    } catch (e) { return null; }
  }

  /**
   * Palauttaa Custom Claim -seuraId:n tai null.
   */
  async function seuraId() {
    var user = kayttaja();
    if (!user) return null;
    try {
      var result = await user.getIdTokenResult();
      return result.claims.seuraId || result.claims.seura || null;
    } catch (e) { return null; }
  }

  /**
   * Tarkistaa onko käyttäjä Super Admin Firestoresta.
   * @param {string} uid
   * @returns {Promise<boolean>}
   */
  async function onSuperAdmin(uid) {
    if (!uid || !_db) return false;
    try {
      var snap = await _db.collection('admins').doc(uid).get();
      return snap.exists;
    } catch (e) { return false; }
  }

  /**
   * Hakee seuran Firestoresta VP:n uid:n tai Custom Claimsin perusteella.
   * Käytä tätä kaikkien näkymien seurantunnistukseen.
   * @param {Object} user — Firebase User
   * @param {Object} claims — Custom Claims
   * @returns {Promise<{seuraId, seuraNimi, seuraData} | null>}
   */
  async function haeSeura(user, claims) {
    if (!user || !_db) return null;

    // 1. Custom Claims seuraId
    var sid = claims && (claims.seuraId || claims.seura);

    if (sid) {
      try {
        var snap = await _db.collection('seurat').doc(sid).get();
        if (snap.exists) {
          return { seuraId: sid, seuraNimi: snap.data().nimi || sid, seuraData: snap.data() };
        }
      } catch (e) {}
    }

    // 2. Super admin — palauttaa null (saa valita seuran itse)
    var isSa = await onSuperAdmin(user.uid);
    if (isSa) return { seuraId: '__super_admin__', seuraNimi: 'Super Admin', seuraData: null };

    // 3. Hae vp_uid:llä
    try {
      var q = await _db.collection('seurat').where('vp_uid', '==', user.uid).limit(1).get();
      if (!q.empty) {
        var doc = q.docs[0];
        return { seuraId: doc.id, seuraNimi: doc.data().nimi || doc.id, seuraData: doc.data() };
      }
    } catch (e) {}

    return null;
  }

  /**
   * Lähettää salasanan palautusviestin.
   * @param {string} email
   * @returns {Promise<void>}
   */
  async function lahetaSalasana(email) {
    if (!email || !_auth) throw new Error('Sähköposti puuttuu');
    return _auth.sendPasswordResetEmail(email);
  }

  // ── JULKINEN NAMESPACE ───────────────────────────────────────────────────
  global.TM = {
    init:           init,
    onAuth:         onAuth,
    kirjaudu:       kirjaudu,
    ulos:           ulos,
    kayttaja:       kayttaja,
    rooli:          rooli,
    seuraId:        seuraId,
    onSuperAdmin:   onSuperAdmin,
    haeSeura:       haeSeura,
    lahetaSalasana: lahetaSalasana,

    // Suorat instanssit — käytä vain jos välttämätöntä
    get db()   { return _db; },
    get auth() { return _auth; },
    get fn()   { return _fn; },

    // Config versiotiedot
    VERSION: '1.0.0',
    FB_VERSION: '9.22.1',
  };

  // Automaattinen alustus jos Firebase on jo ladattu
  if (global.firebase) {
    init();
  } else {
    // Odotetaan Firebase-scriptien latautumista
    document.addEventListener('DOMContentLoaded', function () {
      if (global.firebase) init();
      else console.error('[tm_auth] Firebase ei ole ladattu ennen tm_auth.js:ää!');
    });
  }

}(window));
