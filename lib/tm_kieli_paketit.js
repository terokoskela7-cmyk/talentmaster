/* tm_kieli_paketit.js — kielipakettien laiska lataus (PM-päätös P5, 12.11.2026; docs/VAIHE0_MASTER_JA_SIVUKOKO.md).
   Sivu merkitsee ruotsin/englannin sanakirjat `<script type="text/plain" data-tm-kielipaketti src="lib/…js">`:llä (selain ei hae niitä; versiotiiviste-skripti
   lisää ?v-tiivisteen kuten muillekin skriptilatauksille). fi-tilassa niitä ei ladata lainkaan (−~110 kt gzip Kehitystyöpöydällä). Muu kuin fi → tmKieliPaketit.lataa(kieli)
   lisää ne <script>-elementteinä HTML-järjestyksessä (peräkkäin) ja palauttaa lupauksen — sivu odottaa sen ENNEN renderiä (render-gate: ei fi-vilahdusta).
   fi-stubit: masterT/tmI18nResolve = identiteetti, sweep-funktiot ei-tekeviä, tmLibT → undefined, tmLibPohjat → null — täsmälleen se, mitä oikeat funktiot palauttavat fi-kielellä.
   Oikeat tiedostot ylikirjoittavat stubit (globaali function-deklaraatio / window-sijoitus). Epäonnistunut lataus ei kaada sivua: lupaus täyttyy arvolla false ja teksti jää fi:ksi. */
(function (root) {
  'use strict';
  /* Stub on ohut kääre: sivun osat voivat saada funktion arvona (esim. t: masterT navigaatiolle) ENNEN pakettien latausta. Latauksen jälkeen kääre delegoi oikeaan funktioon (_r),
     joten fi-tilassa avattu sivu ei jää fi-stubiin kun käyttäjä vaihtaa kielen (muuten arvona välitetty masterT pysyisi identiteettinä). */
  var stubit = {};
  function stub(nimi, fn) {
    if (typeof root[nimi] === 'function') return;
    var w = function () { return (w._r || fn).apply(this, arguments); };
    stubit[nimi] = w; root[nimi] = w;
  }
  function sido() { Object.keys(stubit).forEach(function (n) { if (typeof root[n] === 'function' && root[n] !== stubit[n]) stubit[n]._r = root[n]; }); }
  stub('masterT', function (fi) { return fi; });
  stub('masterLokalisoi', function () {});
  stub('tmI18nResolve', function (fi) { return fi; });
  stub('tmLokalisoiCommon', function () {});
  stub('tmLibT', function () { return undefined; });
  stub('tmLibPohjat', function () { return null; });

  var lupaukset = {}, ladatut = {}, haettu = {};   // kielikohtaiset (tm_lang_sv/en ladataan vain aktiiviselle kielelle → sv→en-vaihto hakee en-paketin); haettu: sama tiedosto ei ladata kahdesti   // ladattu: lataus on RATKENNUT (onnistui tai epäonnistui → fi-fallback); vain sen jälkeen sv/en-sanakirjat (mm. TM_TT_SV) ovat varmasti paikallaan
  /* data-tm-kieli="sv|en" (valinnainen): paketti ladataan vain kun nykyinen kieli täsmää (tm_lang_sv/en: ei turhaa toisen kielen latausta). Ilman attribuuttia → aina (kuten ennen). */
  function paketit(kieli) {
    var d = root.document, a = d ? d.querySelectorAll('script[data-tm-kielipaketti]') : [], out = [], i;
    for (i = 0; i < a.length; i++) { var s = a[i].getAttribute('src'), k = a[i].getAttribute('data-tm-kieli'); if (k !== 'sv' && k !== 'en') k = null; if (s && (!k || !kieli || k === kieli)) out.push(s); }
    return out;
  }
  function lisaa(src) {
    if (haettu[src]) return haettu[src];
    return haettu[src] = new Promise(function (ok) {
      var el = root.document.createElement('script');
      el.async = false; el.onload = function () { ok(true); }; el.onerror = function () { ok(false); };
      el.src = src; root.document.head.appendChild(el);
    });
  }
  /** kieli ≠ fi → lataa paketit (kerran). Palauttaa Promise<boolean>: true = kaikki ladattu, false = ei tarvetta tai lataus epäonnistui (fi-fallback). */
  function lataa(kieli) {
    if (!kieli || kieli === 'fi' || !root.document) return Promise.resolve(false);
    if (lupaukset[kieli]) return lupaukset[kieli];
    var lista = paketit(kieli), ketju = Promise.resolve(true);
    lista.forEach(function (src) { ketju = ketju.then(function (hyva) { return lisaa(src).then(function (ok) { return hyva && ok; }); }); });
    lupaukset[kieli] = ketju.then(function (ok) { sido(); ladatut[kieli] = true; if (!ok && root.console) console.warn('[kielipaketit] lataus epäonnistui — teksti jää suomeksi'); return ok; });
    return lupaukset[kieli];
  }
  /** Lataa nykyisen kielen paketit (tmNykyinenKieli); ei heitä koskaan → Promise<boolean>. Sivut kutsuvat ENNEN ensirenderiä. */
  function valmiit() {
    try { return Promise.resolve(typeof root.tmNykyinenKieli === 'function' ? lataa(root.tmNykyinenKieli()) : false).catch(function () { return false; }); } catch (e) { return Promise.resolve(false); }
  }
  /** Kielenvaihto: fi → render heti (synkroninen kuten ennen); sv/en → render vasta pakettien latauksen jälkeen (virhe → render silti, teksti fi). */
  function vaihda(kieli, render) {
    if (kieli && kieli !== 'fi') lataa(kieli).then(render, render); else render();
  }
  /** SYNKRONINEN: onko nykyisen kielen sanakirjat paikallaan? fi → aina; sv/en → vasta kun lataus on ratkennut. Näkymä, joka kääntää datasta (esim. jaksofokus.konsepti_nimi → TM_TT_SV), piirtää vasta kun tämä on true
   (tai piirtää uudelleen valmiit():n jälkeen) — muuten käännös puuttuu ja teksti jää suomeksi (klippi_sv_selain a2, 20.11.2026). */
  function valmis() {
    try { var k = typeof root.tmNykyinenKieli === 'function' ? root.tmNykyinenKieli() : 'fi'; return !k || k === 'fi' || !!ladatut[k]; } catch (e) { return true; }
  }
  var API = { lataa: lataa, paketit: paketit, valmiit: valmiit, vaihda: vaihda, valmis: valmis };
  root.tmKieliPaketit = API;
  // Eräkäynnistys: käyttäjän oma kielivalinta (localStorage) tiedetään heti → aloita lataus rinnakkain verkkokutsujen kanssa; sivu odottaa lupauksen kielen varmistuttua.
  try {
    var k = root.localStorage && root.localStorage.getItem('tm_kieli');
    if (k && k !== 'fi' && root.document) { if (root.document.readyState === 'loading') root.document.addEventListener('DOMContentLoaded', function () { lataa(k); }); else lataa(k); }
  } catch (e) { /* localStorage estetty → seuran kieli ratkaisee sivun init-vaiheessa */ }
  if (typeof module !== 'undefined' && module.exports) module.exports = API;
})(typeof window !== 'undefined' ? window : this);
