/**
 * tm_auth.js — TalentMaster™ Auth-kirjasto
 * ==========================================
 * Yhdistää VP v18:n ja Master v9:n auth-logiikan.
 *
 * Ongelma ennen: kirjauduSisaan(), kirjauduUlos(), lahetaSalasana()
 * kirjoitettu kahdesti — eri virheviestit, eri käyttäytyminen.
 * Bugi korjattiin vain toisessa → toinen jäi rikki.
 *
 * Ratkaisu: yksi tiedosto, yksi totuus.
 *
 * Käyttö HTML-tiedostossa:
 *   <script src="tm_auth.js"></script>   ← ennen Firebase-scriptiä
 *   Sitten: TmAuth.kirjauduSisaan(...)
 *
 * Versio: 1.0 — 2026
 */

'use strict';

window.TmAuth = (function () {

  // ── Sisäinen viittaus Firebase Auth -instanssiin ─────────────────
  // Asetetaan kun TmAuth.alusta() kutsutaan HTML-tiedostosta.
  let _auth = null;

  // ── Virheviestit suomeksi — yksi lista, kaikki näkymät ───────────
  // Ennen: VP:ssä 2 koodia, v9:ssä 7 koodia — nyt 8 kaikille.
  const VIRHE_KOODIT = {
    'auth/wrong-password':          'Väärä sähköposti tai salasana.',
    'auth/user-not-found':          'Käyttäjää ei löydy. Tarkista sähköposti.',
    'auth/invalid-credential':      'Väärä sähköposti tai salasana.',
    'auth/too-many-requests':       'Liian monta yritystä. Odota hetki.',
    'auth/network-request-failed':  'Verkkovirhe. Tarkista yhteys.',
    'auth/invalid-email':           'Sähköpostiosoite on virheellinen.',
    'auth/user-disabled':           'Käyttäjätunnus on poistettu käytöstä.',
    'auth/email-already-in-use':    'Sähköposti on jo käytössä.',
  };

  // ── Julkinen API ─────────────────────────────────────────────────

  /**
   * Alustaa TmAuth Firebase Auth -instanssilla.
   * Kutsu HTML-tiedostossa heti Firebase-initin jälkeen.
   *
   * @param {object} authInstanssi - firebase.auth()
   */
  function alusta(authInstanssi) {
    _auth = authInstanssi;
    console.log('[TmAuth] Alustettu ✅');
  }

  /**
   * Kirjaa käyttäjän sisään sähköpostilla ja salasanalla.
   * Näyttää virheviestit virheEl-elementissä.
   * Kutsuu onnistuessaan onSuccess-callbackin käyttäjäobjektilla.
   *
   * @param {string}      email      - Sähköpostiosoite
   * @param {string}      salasana   - Salasana
   * @param {HTMLElement} virheEl    - Elementti johon virhe näytetään
   * @param {Function}    onSuccess  - Callback onnistuessa, saa user-obj
   */
  function kirjauduSisaan(email, salasana, virheEl, onSuccess) {
    if (!_auth) { console.error('[TmAuth] alusta() kutsumatta'); return; }

    email = (email || '').trim();
    if (!email || !salasana) {
      _naytaVirhe(virheEl, 'Syötä sähköposti ja salasana.');
      return;
    }

    _auth.signInWithEmailAndPassword(email, salasana)
      .then(function (cred) {
        _tyhjennäVirhe(virheEl);
        if (typeof onSuccess === 'function') onSuccess(cred.user);
      })
      .catch(function (e) {
        const viesti = VIRHE_KOODIT[e.code] || ('Kirjautuminen epäonnistui: ' + e.message);
        _naytaVirhe(virheEl, viesti);
        console.error('[TmAuth] kirjauduSisaan:', e.code, e.message);
      });
  }

  /**
   * Kirjaa käyttäjän ulos ja ajaa onSuccess-callbackin.
   *
   * @param {Function} [onSuccess] - Valinnainen callback uloskirjauksen jälkeen
   */
  function kirjauduUlos(onSuccess) {
    if (!_auth) { console.error('[TmAuth] alusta() kutsumatta'); return; }

    _auth.signOut()
      .then(function () {
        console.log('[TmAuth] Kirjautunut ulos');
        if (typeof onSuccess === 'function') onSuccess();
      })
      .catch(function (e) {
        console.error('[TmAuth] kirjauduUlos:', e.message);
      });
  }

  /**
   * Lähettää salasanan palautuslinkin sähköpostiin.
   * Näyttää tuloksen toast-funktiolla jos se on saatavilla.
   *
   * @param {string}   email     - Sähköpostiosoite
   * @param {Function} [naytaToast] - Valinnainen toast-funktio palautetta varten
   */
  function lahetaSalasana(email, naytaToast) {
    if (!_auth) { console.error('[TmAuth] alusta() kutsumatta'); return; }

    email = (email || '').trim();
    if (!email) {
      if (naytaToast) naytaToast('Syötä ensin sähköpostiosoite.');
      return;
    }

    _auth.sendPasswordResetEmail(email)
      .then(function () {
        if (naytaToast) naytaToast('Salasanalinkki lähetetty: ' + email);
        console.log('[TmAuth] Salasanapyyintö lähetetty:', email);
      })
      .catch(function (e) {
        const viesti = VIRHE_KOODIT[e.code] || ('Virhe: ' + e.message);
        if (naytaToast) naytaToast(viesti);
        console.error('[TmAuth] lahetaSalasana:', e.code, e.message);
      });
  }

  /**
   * Rekisteröi auth-tilan muutoskuuntelijan.
   * Ohittaa turhat kutsut _kirjautuminenKesken-lipun avulla.
   *
   * Korvaa: _auth.onAuthStateChanged(async function(user) { ... })
   * Käyttö:
   *   TmAuth.onAuthReady(
   *     async function(user) { /* kirjautunut *\/ },
   *     function()           { /* ei kirjautunut *\/ }
   *   );
   *
   * @param {Function} onKirjautunut  - Callback kirjautuneelle käyttäjälle
   * @param {Function} [eiKirjautunut] - Callback kirjautumattomalle
   * @returns {Function} unsubscribe-funktio
   */
  function onAuthReady(onKirjautunut, eiKirjautunut) {
    if (!_auth) { console.error('[TmAuth] alusta() kutsumatta'); return function(){}; }

    let kesken = false;

    return _auth.onAuthStateChanged(function (user) {
      if (kesken) return;  // Esto duplikaattikutsuille

      if (!user) {
        if (typeof eiKirjautunut === 'function') eiKirjautunut();
        return;
      }

      kesken = true;
      Promise.resolve(onKirjautunut(user))
        .finally(function () { kesken = false; });
    });
  }

  // ── Sisäiset apufunktiot ─────────────────────────────────────────

  function _naytaVirhe(el, viesti) {
    if (!el) return;
    el.textContent = viesti;
    el.style.display = 'block';
  }

  function _tyhjennäVirhe(el) {
    if (!el) return;
    el.textContent = '';
  }

  // ── Julkinen API ─────────────────────────────────────────────────
  return {
    alusta,
    kirjauduSisaan,
    kirjauduUlos,
    lahetaSalasana,
    onAuthReady,
  };

})();
