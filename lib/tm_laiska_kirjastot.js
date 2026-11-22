/* tm_laiska_kirjastot.js — L2 (docs/KYLMA_AVAUS_DIAGNOOSI.md §4): data-/laskentakirjastot ladataan vasta kun niitä tarvitaan, ei kuoren avauksessa.
   Sivu merkitsee kirjastot `<script type="text/plain" data-tm-laiska src="lib/…js">` (selain ei hae; versiotiiviste-skripti lisää ?v kuten muillekin skriptilatauksille) ja listaa
   portit tämän skriptin data-portit-attribuutissa: `nimi` | `nimi!koti` (portti vain kun 1. argumentti ≠ 'koti') | `nimi=true` (odotuksen aikana palautetaan true = "käsitelty"), `+nimi` (TYNKÄ: funktion määrittelevä kirjasto on itse laiska → globaali tynkä lataa ja kutsuu oikeaa).
   Portti = globaalin funktion kääre: ladattu → suoraan alkuperäinen (synkroninen kuten ennen); ei ladattu → lataa (kerran, HTML-järjestyksessä), PIIRRÄ KAIKKI NÄKYMÄT UUDELLEEN
   (_paivitaKaikkiNakymat: renderöinnit, jotka ajettiin ennen latausta typeof-vartijoin tai jäivät kesken, korjaantuvat) ja kutsu alkuperäistä samoilla argumenteilla.
   Epäonnistunut lataus: toimintoa EI suoriteta (ei puolikasta näkymää), käyttäjälle näytetään ohjetoast ja seuraava yritys lataa uudelleen (virhettä ei välimuistiteta).
   Verkko: ReferenceError ennen latausta (portti jäi listasta) → lataus käynnistyy itsestään (itseparantuva verkko; virhe näkyy konsolissa/Sentryssä, jotta portti voidaan lisätä). */
(function (root) {
  'use strict';
  var tilat = {}, portit = [], ladatutSrc = {};   // tilat[ryhmä] = { lupaus, ladattu }; ryhmä '' = oletus (data-tm-laiska ilman data-tm-ryhma)
  function tila(g) { g = g || ''; return tilat[g] || (tilat[g] = { lupaus: null, ladattu: false }); }
  function tagit() { var d = root.document; return d ? d.querySelectorAll('script[data-tm-laiska]') : []; }
  function ryhmaDe(el) { return (el.hasAttribute && el.hasAttribute('data-tm-ryhma')) ? (el.getAttribute('data-tm-ryhma') || '') : ''; }
  /* data-tm-myos="ryhmä1,ryhmä2": skripti kuuluu omaan ryhmäänsä MUTTA ladataan myös mainittujen ryhmien ensimmäisenä riippuvuutena (kerran; ladatutSrc estää tuplalatauksen). */
  function myosDe(el) { return (el.hasAttribute && el.hasAttribute('data-tm-myos')) ? String(el.getAttribute('data-tm-myos') || '').split(',') : []; }
  function lista(g) { var a = tagit(), out = [], i; g = g || ''; for (i = 0; i < a.length; i++) { var s = a[i].getAttribute('src'); if (s && (ryhmaDe(a[i]) === g || myosDe(a[i]).indexOf(g) >= 0)) out.push(s); } return out; }
  function ryhmat() { var a = tagit(), out = [], i; for (i = 0; i < a.length; i++) { var g = ryhmaDe(a[i]); if (out.indexOf(g) < 0) out.push(g); } return out; }
  function lisaa(src) {
    if (ladatutSrc[src]) return Promise.resolve(true);
    return new Promise(function (ok) {
      var el = root.document.createElement('script');
      el.async = false; el.onload = function () { ladatutSrc[src] = true; ok(true); }; el.onerror = function () { ok(false); };
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
  function varmista(g) {
    var t = tila(g);
    if (t.ladattu) return Promise.resolve(true);
    if (t.lupaus) return t.lupaus;
    var ketju = Promise.resolve(true);
    lista(g).forEach(function (src) { ketju = ketju.then(function (hyva) { return hyva ? lisaa(src) : false; }); });
    t.lupaus = ketju.then(function (ok) {
      if (ok) { t.ladattu = true; uudelleenpiirto(); } else { t.lupaus = null; ilmoita(); }
      return ok;
    }, function () { t.lupaus = null; ilmoita(); return false; });
    return t.lupaus;
  }
  /** Kaikki ryhmät (itseparantuva verkko: tuntematon puuttuva nimi voi kuulua mihin tahansa ryhmään). */
  function varmistaKaikki() { return Promise.all(ryhmat().map(function (g) { return varmista(g); })).then(function (a) { return a.every(Boolean); }); }
  /** Kääre globaalille funktiolle. ehto(args) → true = tarvitsee kirjastot (oletus: aina). palauta = arvo, jonka kääre palauttaa odotuksen aikana. */
  function portti(nimi, ehto, palauta) {
    var orig = root[nimi];
    if (typeof orig !== 'function' || orig.__tmLaiska) return false;
    var w = function () {
      if (tila('').ladattu || (ehto && !ehto.apply(this, arguments))) return orig.apply(this, arguments);
      var a = arguments, t = this;
      varmista().then(function (ok) { if (ok) orig.apply(t, a); });
      return palauta;
    };
    w.__tmLaiska = true; root[nimi] = w; portit.push(nimi); return true;
  }
  /** Tynkä (+nimi): funktio, jonka määrittelevä kirjasto on laiska → globaali tynkä, joka lataa kirjastot ja kutsuu SITTEN oikeaa funktiota samoilla argumenteilla (kirjasto korvaa tynkän latautuessaan).
   *  typeof-vartijat näkevät 'function' → kutsu ei putoa hiljaa varapolulle. Palauttaa undefined odotuksen aikana (vain toiminto-/avaus-funktioille, ei arvoa palauttaville laskentafunktioille). */
  function tynka(nimi, g) {
    if (typeof root[nimi] === 'function') return false;
    var s = function () {
      var a = arguments, t = this;
      if (tila(g).ladattu) { var r = root[nimi]; return (r !== s && typeof r === 'function') ? r.apply(t, a) : undefined; }
      varmista(g).then(function (ok) { var r = root[nimi]; if (ok && r !== s && typeof r === 'function') r.apply(t, a); });
      return undefined;
    };
    s.__tmLaiska = true; s.__tmTynka = true; root[nimi] = s; portit.push(nimi); return true;
  }
  function jasenna(spec) {
    var tm = /^\+([A-Za-z_$][\w$]*)(?:@([\w-]+))?$/.exec(String(spec).trim()); if (tm) return { nimi: tm[1], tynka: true, ryhma: tm[2] || '' };
    var m = /^([A-Za-z_$][\w$]*)(!koti)?(=true)?$/.exec(String(spec).trim());
    return m ? { nimi: m[1], ehto: m[2] ? function (x) { return x !== 'koti'; } : null, palauta: m[3] ? true : undefined } : null;
  }
  /** Asenna data-portit-attribuutin portit (kutsutaan kun sivun funktiot on määritelty = DOMContentLoaded). Palauttaa asennetut nimet. */
  function asenna() {
    var el = root.document && root.document.querySelector('script[data-portit]'), out = [];
    ((el && el.getAttribute('data-portit')) || '').split(',').forEach(function (s) {
      var j = jasenna(s); if (!j) return;
      if (j.tynka) { if (tynka(j.nimi, j.ryhma)) out.push(j.nimi); else if (root.console) console.warn('[laiska] tynkää ei tarvita (funktio jo olemassa): ' + j.nimi); return; }
      if (portti(j.nimi, j.ehto, j.palauta)) out.push(j.nimi); else if (root.console) console.warn('[laiska] porttia ei voitu asentaa: ' + j.nimi);
    });
    return out;
  }
  var API = { varmista: varmista, valmis: function (g) { return tila(g).ladattu; }, varmistaKaikki: varmistaKaikki, ryhmat: ryhmat, portti: portti, tynka: tynka, asenna: asenna, lista: lista, portit: function () { return portit.slice(); } };
  root.tmLaiska = API;
  if (root.document) {
    if (root.document.readyState === 'loading') root.document.addEventListener('DOMContentLoaded', asenna); else asenna();
    if (root.addEventListener) root.addEventListener('error', function (e) {
      if (e && e.error && e.error.name === 'ReferenceError' && ryhmat().some(function (g) { return !tila(g).ladattu && lista(g).length; })) { if (root.console) console.warn('[laiska] ReferenceError ennen latausta → ladataan kirjastot: ' + e.error.message); varmistaKaikki(); }
    });
  }
  if (typeof module !== 'undefined' && module.exports) module.exports = API;
})(typeof window !== 'undefined' ? window : this);
