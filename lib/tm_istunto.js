/* ════════════════════════════════════════════════════════════════════════
   tm_istunto.js — henkilökunnan sovellusten ISTUNTOTURVA (Seura, Admin, Master, VP, Valmennusapuri, Excel-tuonnit).
   Ongelma: kaikki henkilökunnan sovellukset jakavat yhden Firebase Auth -istunnon (oletusappi, LOCAL). Toisen tunnuksen kirjautuminen toisessa välilehdessä korvaa istunnon KAIKISSA välilehdissä;
   väärää roolia näkevä sovellus kutsui automaattisesti signOut() → katkaisi myös muiden välilehtien istunnon ja kesken jääneet kirjoitukset kaatuivat (KPV-rosterituonti 7.10.: 12/125, sitten permission-denied).
   Nyt: väärä rooli → VIESTI + "Kirjaudu ulos" -nappi (käyttäjä päättää), ei automaattista signOut():ia; jatkotoiminnot estetty. Tuonnit pysähtyvät ensimmäiseen istuntovirheeseen.
   · tmOnIstuntoVirhe(e)                → true kun virhe on permission-denied / unauthenticated (myös functions/-, firestore/-, auth/-etuliitteillä) tai "Missing or insufficient permissions"
   · tmIstuntoKoodi(e)                  → 'permission-denied' | 'unauthenticated' | muu koodi | 'tuntematon'
   · tmVaaraRooliHTML(teksti, opts)     → viesti + nappi. opts: { ulosFn:'kirjauduUlos()', nappi:'Kirjaudu ulos' }  (kaikki escapataan; ulosFn on sivun oma vakio, ei käyttäjän syötettä)
   · tmTuontiSeis(auth, e)              → null (jatka) | { syy:'ei_kirjautunut'|'permission-denied'|'unauthenticated' }  — kutsutaan jokaisella rivillä: currentUser null tai e = viimeisin virhe
   · tmTuontiYhteenveto(tuotu, yht, seis, opts) → "Tuonti pysäytetty: tuotiin 12 / 125 pelaajaa. Syy: …"
   PURE (DOMia ei). Dual-export: module.exports || window.TM_ISTUNTO.
════════════════════════════════════════════════════════════════════════ */
(function (root) {
  'use strict';
  var KOODI = /^(?:functions\/|firestore\/|auth\/)?(permission-denied|unauthenticated)$/;
  function _esc(s) { return String(s == null ? '' : s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;'); }
  function tmIstuntoKoodi(e) {
    var c = e && typeof e.code === 'string' ? e.code : '', m = KOODI.exec(c);
    if (m) return m[1];
    if (/missing or insufficient permissions/i.test(String(e && e.message || ''))) return 'permission-denied';
    c = c.replace(/^(functions|firestore|auth|storage)\//, '').toLowerCase().replace(/[^a-z0-9\-_\/]/g, '').slice(0, 40);
    return c || 'tuntematon';
  }
  function tmOnIstuntoVirhe(e) { var k = tmIstuntoKoodi(e); return k === 'permission-denied' || k === 'unauthenticated'; }
  function tmVaaraRooliHTML(teksti, opts) {
    opts = opts || {};
    return '<span data-tm-vaara-rooli>' + _esc(teksti) + '</span> <button type="button" data-tm-kirjaudu-ulos onclick="' + _esc(opts.ulosFn || 'kirjauduUlos()') + '" style="margin-left:6px;padding:4px 12px;border-radius:6px;border:.5px solid currentColor;background:transparent;color:inherit;font-size:12px;cursor:pointer">' + _esc(opts.nappi || 'Kirjaudu ulos') + '</button>';
  }
  function tmTuontiSeis(auth, e) {
    if (!auth || !auth.currentUser) return { syy: 'ei_kirjautunut' };
    if (e && tmOnIstuntoVirhe(e)) return { syy: tmIstuntoKoodi(e) };
    return null;
  }
  function tmTuontiYhteenveto(tuotu, yht, seis, opts) {
    opts = opts || {}; var syyt = { ei_kirjautunut: 'istunto päättyi (ei kirjautunutta käyttäjää)', 'permission-denied': 'ei oikeutta (permission-denied) — istunto on voinut vaihtua toisessa välilehdessä', unauthenticated: 'istunto vanheni tai vaihtui (unauthenticated)' };
    var rivit = (opts.yksikko || 'pelaajaa');
    if (!seis) return 'Tuotiin ' + tuotu + ' / ' + yht + ' ' + rivit + '.';
    return 'Tuonti pysäytetty: tuotiin ' + tuotu + ' / ' + yht + ' ' + rivit + '. Syy: ' + (syyt[seis.syy] || seis.syy) + '. Kirjaudu uudelleen ja aja tuonti uudelleen — jo tuodut ohitetaan.';
  }
  var API = { tmIstuntoKoodi: tmIstuntoKoodi, tmOnIstuntoVirhe: tmOnIstuntoVirhe, tmVaaraRooliHTML: tmVaaraRooliHTML, tmTuontiSeis: tmTuontiSeis, tmTuontiYhteenveto: tmTuontiYhteenveto };
  if (typeof module !== 'undefined' && module.exports) module.exports = API; else root.TM_ISTUNTO = API;
})(typeof window !== 'undefined' ? window : this);
