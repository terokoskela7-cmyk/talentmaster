/* tm_kieli_paketit.js — kielipakettien laiska lataus (PM-päätös P5, 12.11.2026; docs/VAIHE0_MASTER_JA_SIVUKOKO.md).
   Sivu merkitsee ruotsin/englannin sanakirjat `<script type="text/plain" data-tm-kielipaketti src="lib/…js">`:llä (selain ei hae niitä; versiotiiviste-skripti
   lisää ?v-tiivisteen kuten muillekin skriptilatauksille). fi-tilassa niitä ei ladata lainkaan (−~110 kt gzip Kehitystyöpöydällä). Muu kuin fi → tmKieliPaketit.lataa(kieli)
   lisää ne <script>-elementteinä HTML-järjestyksessä (peräkkäin) ja palauttaa lupauksen — sivu odottaa sen ENNEN renderiä (render-gate: ei fi-vilahdusta).
   fi-stubit: masterT/tmI18nResolve = identiteetti, sweep-funktiot ei-tekeviä, tmLibT → undefined, tmLibPohjat → null — täsmälleen se, mitä oikeat funktiot palauttavat fi-kielellä.
   Oikeat tiedostot ylikirjoittavat stubit (globaali function-deklaraatio / window-sijoitus). Epäonnistunut lataus ei kaada sivua: lupaus täyttyy arvolla false ja teksti jää fi:ksi. */
(function (root) {
  'use strict';
  function stub(nimi, fn) { if (typeof root[nimi] !== 'function') root[nimi] = fn; }
  stub('masterT', function (fi) { return fi; });
  stub('masterLokalisoi', function () {});
  stub('tmI18nResolve', function (fi) { return fi; });
  stub('tmLokalisoiCommon', function () {});
  stub('tmLibT', function () { return undefined; });
  stub('tmLibPohjat', function () { return null; });

  var lupaus = null;
  function paketit() {
    var d = root.document, a = d ? d.querySelectorAll('script[data-tm-kielipaketti]') : [], out = [], i;
    for (i = 0; i < a.length; i++) { var s = a[i].getAttribute('src'); if (s) out.push(s); }
    return out;
  }
  function lisaa(src) {
    return new Promise(function (ok) {
      var el = root.document.createElement('script');
      el.async = false; el.onload = function () { ok(true); }; el.onerror = function () { ok(false); };
      el.src = src; root.document.head.appendChild(el);
    });
  }
  /** kieli ≠ fi → lataa paketit (kerran). Palauttaa Promise<boolean>: true = kaikki ladattu, false = ei tarvetta tai lataus epäonnistui (fi-fallback). */
  function lataa(kieli) {
    if (!kieli || kieli === 'fi' || !root.document) return Promise.resolve(false);
    if (lupaus) return lupaus;
    var lista = paketit(), ketju = Promise.resolve(true);
    lista.forEach(function (src) { ketju = ketju.then(function (hyva) { return lisaa(src).then(function (ok) { return hyva && ok; }); }); });
    lupaus = ketju.then(function (ok) { if (!ok && root.console) console.warn('[kielipaketit] lataus epäonnistui — teksti jää suomeksi'); return ok; });
    return lupaus;
  }
  var API = { lataa: lataa, paketit: paketit };
  root.tmKieliPaketit = API;
  // Eräkäynnistys: käyttäjän oma kielivalinta (localStorage) tiedetään heti → aloita lataus rinnakkain verkkokutsujen kanssa; sivu odottaa lupauksen kielen varmistuttua.
  try {
    var k = root.localStorage && root.localStorage.getItem('tm_kieli');
    if (k && k !== 'fi' && root.document) { if (root.document.readyState === 'loading') root.document.addEventListener('DOMContentLoaded', function () { lataa(k); }); else lataa(k); }
  } catch (e) { /* localStorage estetty → seuran kieli ratkaisee sivun init-vaiheessa */ }
  if (typeof module !== 'undefined' && module.exports) module.exports = API;
})(typeof window !== 'undefined' ? window : this);
