/* tm_laiska_kirjastot.js — L2 (docs/KYLMA_AVAUS_DIAGNOOSI.md §4): data-/laskentakirjastot ladataan vasta kun niitä tarvitaan, ei kuoren avauksessa.
   Sivu merkitsee kirjastot `<script type="text/plain" data-tm-laiska src="lib/…js">` (selain ei hae; versiotiiviste-skripti lisää ?v kuten muillekin skriptilatauksille) ja listaa
   portit tämän skriptin data-portit-attribuutissa: `nimi` | `nimi!koti` (portti vain kun 1. argumentti ≠ 'koti') | `nimi=true` (odotuksen aikana palautetaan true = "käsitelty").
   Portti = globaalin funktion kääre: ladattu → suoraan alkuperäinen (synkroninen kuten ennen); ei ladattu → lataa (kerran, HTML-järjestyksessä), PIIRRÄ KAIKKI NÄKYMÄT UUDELLEEN
   (_paivitaKaikkiNakymat: renderöinnit, jotka ajettiin ennen latausta typeof-vartijoin tai jäivät kesken, korjaantuvat) ja kutsu alkuperäistä samoilla argumenteilla.
   Epäonnistunut lataus: toimintoa EI suoriteta (ei puolikasta näkymää), käyttäjälle näytetään ohjetoast ja seuraava yritys lataa uudelleen (virhettä ei välimuistiteta).
   Verkko: ReferenceError ennen latausta (portti jäi listasta) → lataus käynnistyy itsestään (itseparantuva verkko; virhe näkyy konsolissa/Sentryssä, jotta portti voidaan lisätä). */
(function (root) {
  'use strict';
  var lupaus = null, ladattu = false, portit = [];
  function tagit() { var d = root.document; return d ? d.querySelectorAll('script[data-tm-laiska]') : []; }
  function lista() { var a = tagit(), out = [], i; for (i = 0; i < a.length; i++) { var s = a[i].getAttribute('src'); if (s) out.push(s); } return out; }
  function lisaa(src) {
    return new Promise(function (ok) {
      var el = root.document.createElement('script');
      el.async = false; el.onload = function () { ok(true); }; el.onerror = function () { ok(false); };
      el.src = src; root.document.head.appendChild(el);
    });
  }
  function uudelleenpiirto() { try { if (typeof root._paivitaKaikkiNakymat === 'function') root._paivitaKaikkiNakymat(); } catch (e) { if (root.console) console.warn('[laiska] uudelleenpiirto epäonnistui', e && e.message); } }
  function ilmoita() {
    var t = 'Tietojen lataus ei onnistunut — tarkista verkkoyhteys ja yritä uudelleen';
    try { if (typeof root.toast === 'function') root.toast(typeof root.masterT === 'function' ? root.masterT(t) : t, 'error'); } catch (e) { /* toast ei estä jatkoa */ }
    if (root.console) console.warn('[laiska] kirjastojen lataus epäonnistui — ' + t);
  }
  /** Lataa kirjastot (kerran). Promise<boolean>: true = kaikki ladattu. Epäonnistuminen nollaa lupauksen → seuraava kutsu yrittää uudelleen. */
  function varmista() {
    if (ladattu) return Promise.resolve(true);
    if (lupaus) return lupaus;
    var ketju = Promise.resolve(true);
    lista().forEach(function (src) { ketju = ketju.then(function (hyva) { return hyva ? lisaa(src) : false; }); });
    lupaus = ketju.then(function (ok) {
      if (ok) { ladattu = true; uudelleenpiirto(); } else { lupaus = null; ilmoita(); }
      return ok;
    }, function () { lupaus = null; ilmoita(); return false; });
    return lupaus;
  }
  /** Kääre globaalille funktiolle. ehto(args) → true = tarvitsee kirjastot (oletus: aina). palauta = arvo, jonka kääre palauttaa odotuksen aikana. */
  function portti(nimi, ehto, palauta) {
    var orig = root[nimi];
    if (typeof orig !== 'function' || orig.__tmLaiska) return false;
    var w = function () {
      if (ladattu || (ehto && !ehto.apply(this, arguments))) return orig.apply(this, arguments);
      var a = arguments, t = this;
      varmista().then(function (ok) { if (ok) orig.apply(t, a); });
      return palauta;
    };
    w.__tmLaiska = true; root[nimi] = w; portit.push(nimi); return true;
  }
  function jasenna(spec) {
    var m = /^([A-Za-z_$][\w$]*)(!koti)?(=true)?$/.exec(String(spec).trim());
    return m ? { nimi: m[1], ehto: m[2] ? function (x) { return x !== 'koti'; } : null, palauta: m[3] ? true : undefined } : null;
  }
  /** Asenna data-portit-attribuutin portit (kutsutaan kun sivun funktiot on määritelty = DOMContentLoaded). Palauttaa asennetut nimet. */
  function asenna() {
    var el = root.document && root.document.querySelector('script[data-portit]'), out = [];
    ((el && el.getAttribute('data-portit')) || '').split(',').forEach(function (s) {
      var j = jasenna(s); if (!j) return;
      if (portti(j.nimi, j.ehto, j.palauta)) out.push(j.nimi); else if (root.console) console.warn('[laiska] porttia ei voitu asentaa: ' + j.nimi);
    });
    return out;
  }
  var API = { varmista: varmista, valmis: function () { return ladattu; }, portti: portti, asenna: asenna, lista: lista, portit: function () { return portit.slice(); } };
  root.tmLaiska = API;
  if (root.document) {
    if (root.document.readyState === 'loading') root.document.addEventListener('DOMContentLoaded', asenna); else asenna();
    if (root.addEventListener) root.addEventListener('error', function (e) {
      if (!ladattu && e && e.error && e.error.name === 'ReferenceError' && lista().length) { if (root.console) console.warn('[laiska] ReferenceError ennen latausta → ladataan kirjastot: ' + e.error.message); varmista(); }
    });
  }
  if (typeof module !== 'undefined' && module.exports) module.exports = API;
})(typeof window !== 'undefined' ? window : this);
