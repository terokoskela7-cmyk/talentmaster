/* tm_tt_sv_valinta.js — teknis-taktisen curriculumin KIELIVALINTA näyttöpuolella (sv-läpiajo PR 3, Master). PURE, kielineutraali.
   Lähde: lib/tm_teknistaktiset_sv.js (TM_TT_SV = litteä '<avain>.<kenttä>' → sv; GENEROITU, Geminin ruotsi). Lib lib/tm_teknistaktiset.js pysyy kielineutraalina.
   Sama logiikka kuin VP_v25 [TT-I18N-ALKU] (_ttSv/_ttKonsepti/_ttKys/_ttHarj/_ttPpNimi) — VP voi siirtyä tähän PR 4:ssä.

   KRIITTINEN RAJAUS — VAIN NÄYTTÖÖN: palautetut konseptit ovat KOPIOITA. Älä anna niitä kirjoituspolulle (jaksofokus.konsepti_nimi, syote, Firestore): tallennettu nimi on aina fi
   (kanoninen data; sv-nimi tallennettuna rikkoisi hakuja ja toisen kielen näkymän). Kirjoituspolut käyttävät kielineutraaleja _mTtItems/_mKonseptiByAvain.
   ENUM-kentät EIVÄT käänny (avain · koodi · dim · faasi · ryhma · pelimuoto · domeeni · kpi[].koodi): niitä ei ole sidecarissa ja vertailut/tallennukset nojaavat niihin.
   SEURAKERROS: seuran oma teksti (_seura_kentat) on vapaata suomea = DATAA → kaanonin sv ei ylikirjoita sitä.
   Käyttö:  var S = tmTtSv(kieli[, kartta]);  S.paalla · S.ttSv(avain, kentta) · S.konsepti(item) · S.konseptit(arr) · S.kys(avain, fiKys) · S.harj(avainTaiKoodi, fiArr, raaka) · S.ppNimi(koodi, fiNimi) · S.nimiAvaimella(avain, tallennettuNimi)
   Dual-export: module.exports || window.TM_TT_SV_VALINTA (+ window.tmTtSv). */
(function (root) {
  'use strict';
  var TEKSTIKENTAT = ['nimi', 'pelitilanne', 'painotus', 'pelaaja_miksi', 'konseptipeli', 'teema', 'painopisteet', 'pelipaikka'];   // = scripts/i18n_curriculum.cjs TEKSTIKENTAT (pidä synkassa)

  function _oletusKartta() { try { return (typeof TM_TT_SV !== 'undefined' && TM_TT_SV) || (root && root.TM_TT_SV) || null; } catch (e) { return (root && root.TM_TT_SV) || null; } }
  function _kopio(o) { var n = {}, k; for (k in o) n[k] = o[k]; return n; }
  function _avain(a) { return String(a || '').toLowerCase().replace(/-/g, '_'); }

  function tmTtSv(kieli, kartta) {
    var m = kartta || _oletusKartta();
    var paalla = !!kieli && kieli !== 'fi' && !!m;   // en: sidecarissa ei ole en-lähdettä → sisältö jää suomeksi (chrome kääntyy)
    if (paalla && kieli !== 'sv') paalla = false;

    function ttSv(avain, kentta) {
      if (!avain || !paalla) return null;
      var v = m[avain + '.' + kentta];
      return (typeof v === 'string' && v) ? v : null;
    }
    function konsepti(item) {
      if (!item || !item.avain || !paalla) return item;
      var a = item.avain, o = _kopio(item);
      var seura = Array.isArray(item._seura_kentat) ? item._seura_kentat : [];
      var oma = function (f) { return seura.indexOf(f) >= 0; };
      TEKSTIKENTAT.forEach(function (f) { if (oma(f)) return; var s = ttSv(a, f); if (s) o[f] = s; });
      if (Array.isArray(item.kpi) && !oma('kpi')) o.kpi = item.kpi.map(function (c) {
        var s = (c && c.koodi) ? ttSv(a, 'kpi.' + c.koodi + '.teksti') : null;
        if (!s) return c;
        var n = _kopio(c); n.teksti = s; return n;
      });
      if (Array.isArray(item.kysymykset) && !oma('kysymykset')) o.kysymykset = item.kysymykset.map(function (q, i) { return ttSv(a, 'kysymys.' + i) || q; });
      return o;
    }
    function konseptit(arr) { return (arr || []).map(konsepti); }
    function kys(avainTaiKoodi, fiKys) {   // cue-kysymykset (indeksit säilyvät)
      var k = fiKys || [];
      if (!k.length || !paalla) return k;
      var a = _avain(avainTaiKoodi);
      return k.map(function (q, i) { return ttSv(a, 'kysymys.' + i) || q; });
    }
    function harj(avainTaiKoodi, fiArr, raaka) {   // harjoitteet: taulukolle 'harjoite.<KOODI>.<i>.<kenttä>', yksittäisobjektille 'harjoite.<KOODI>.<kenttä>' (raaka = TM_TT_HARJOITTEET[koodi])
      var arr = fiArr || [];
      if (!arr.length || !paalla) return arr;
      var koodi = String(avainTaiKoodi || '').toUpperCase().replace(/_/g, '-');
      var lista = Array.isArray(raaka);
      return arr.map(function (h, i) {
        var etu = 'harjoite.' + koodi + (lista ? '.' + i : ''), o = _kopio(h);
        TEKSTIKENTAT.forEach(function (f) { var v = m[etu + '.' + f]; if (typeof v === 'string' && v) o[f] = v; });
        return o;
      });
    }
    function ppNimi(koodi, fiNimi) {   // pelipaikan NÄYTTÖnimi (koodi on enum)
      return ttSv('pelipaikka.' + String(koodi || ''), 'nimi') || fiNimi || String(koodi || '');
    }
    function nimiAvaimella(avain, tallennettu) {   // jaksofokuksen TALLENNETTU fi-nimi → sv avaimella (puuttuu → tallennettu)
      return ttSv(_avain(avain), 'nimi') || tallennettu || '';
    }
    return { paalla: paalla, ttSv: ttSv, konsepti: konsepti, konseptit: konseptit, kys: kys, harj: harj, ppNimi: ppNimi, nimiAvaimella: nimiAvaimella };
  }

  var API = { tmTtSv: tmTtSv, TEKSTIKENTAT: TEKSTIKENTAT };
  if (typeof module !== 'undefined' && module.exports) module.exports = API;
  else { root.TM_TT_SV_VALINTA = API; root.tmTtSv = tmTtSv; }
})(typeof window !== 'undefined' ? window : this);
