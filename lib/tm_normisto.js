/* ════════════════════════════════════════════════════════════════════════
   tm_normisto.js — KOLME KERROSTA (docs/NORMISTO_JA_SEURAN_LINJA.md, CLAUDE.md "Kolmen kerroksen malli"):
     1. MENETELMÄ (lukittu, EI täällä): §28 kypsyysvahti, §7.22, datan ikä ja tilat — ei seura- eikä normistokohtaista säätöä.
     2. NORMISTO (maa/liitto): testit, normitaulukot NORMIREKISTERIstä, mittariketju, oletusrajat. Suomi: Palloliitto FINAL2024 / Eerikkilä.
     3. SEURAN LINJA (seurat/{sid}/konfiguraatio/normit): oma normisto-valinta, omat rajat (vain SEURA_SALLITUT), mukaan otettavat testit, tavoitetasot ikäluokittain.
   Lähde 'tm' = TalentMasterin oma oletus (tämä tiedosto), 'normisto' = normiston oma arvo, 'seura' = seuran asetus.

   tmNormistoRatkaise(seuraKonfig) → YKSI asetusobjekti, jokaisen arvon vieressä lähde:
     { normisto:{arvo,lahde}, tuntematon, rajat:{AVAIN:{arvo,lahde}}, ketju:{arvo,lahde}, testit:{arvo|null,lahde}, tavoitetasot:{arvo,lahde}, seuranRajat:[avaimet] }
   Laskentafunktiot (tm_tekniikka, tm_fyysinen, tm_joukkuesaanto) saavat asetukset PARAMETRINA (opts.asetukset = konfiguraatio TAI ratkaistu objekti);
   ilman parametria TalentMasterin oletus (Suomi) → nykyinen käyttäytyminen. Tuntematon normisto / puuttuva mittari → "ei dataa", ei virhettä.
   Seuran asetusten KIRJOITUS on Rules-muutos (erillinen PR, Teron kaista) — tässä vain luku ja ratkaisu.
   Dual-export: module.exports + window.TM_NORMISTO. Ei window/DOM-riippuvuutta (palvelinkelpoinen).
   ════════════════════════════════════════════════════════════════════════ */
(function (root) {
  'use strict';

  /* MENETELMÄKERROKSEN LUKITUT RAJAT (lähde 'tm'): luotettavuusehtoja, eivät seuran linjaa — ei normisto- eikä seurakohtaista säätöä.
     MIN_MITATTU (5), OTOS_PIENI (8), kolmasosan osuus (OSUUS_MITATUSTA 3) ja puolen ehto (OSUUS_KAIKISTA 2), VANHA_KK (datan ikä 15 kk). §28 on laskentalogiikassa. */
  var LUKITUT = { MIN_MITATTU: 5, OTOS_PIENI: 8, OSUUS_MITATUSTA: 3, OSUUS_KAIKISTA: 2, VANHA_KK: 15 };

  /* TalentMasterin oma oletus (lähde 'tm'): käytetään kun ei seuran eikä normiston arvoa */
  var TM_OLETUS = {
    normisto: 'eerikkila',
    rajat: { TKI: 40, ERO_TASOA: 2, SM_MIN_IKA: 10, SM_AIKUINEN_IKA: 20, FYS_TASO_RAJA: 1, SM_TASO_RAJA: 1 },
    ketju: { tekniikka: ['tki', 'sm'], fyysinen: ['hh'] }
  };

  /* NORMISTOT: normiston omat arvot (lähde 'normisto'); normitaulukot haetaan NORMIREKISTERIstä (rekisteri-avain) */
  var NORMISTOT = {
    eerikkila: {
      nimi: 'Palloliitto FINAL2024 / Eerikkilä', rekisteri: 'eerikkila',
      rajat: { TKI: 40, ERO_TASOA: 2, SM_MIN_IKA: 10, SM_AIKUINEN_IKA: 20, FYS_TASO_RAJA: 1, SM_TASO_RAJA: 1 },
      testit: ['lin5m', 'lin10m', 'lin30m', 'cmj', 'mas', 'kasirata', 'sm_juoksu', 'sm_pallo', 'syotto', 'pujottelu'],   // normiston testit; seuran valinta on tämän osajoukko
      ketju: { tekniikka: ['tki', 'sm'], fyysinen: ['hh'] }   // Suomi: tekniikka = TKI → SM-tasot, fyysinen = H-H
    }
  };

  /* Seura saa säätää VAIN näitä (väli [min, max], kokonaisluku; väli ulkopuolinen arvo ohitetaan → lähteeksi jää 'normisto'). Lukitut (LUKITUT, §28) eivät ole listalla.
     TKI-raja 25–55 · tasoraja (fyysinen/SM) 1–3: kehityskohde kun taso < raja + 1 (≤ raja) · tasoero 1–3. Tavoitetasot ikäluokittain 1–5. Testit = normiston testien osajoukko. */
  var SEURA_SALLITUT = { TKI: [25, 55], FYS_TASO_RAJA: [1, 3], SM_TASO_RAJA: [1, 3], ERO_TASOA: [1, 3] };

  function _has(o, k) { return o != null && Object.prototype.hasOwnProperty.call(o, k); }
  function _lib(f) { try { return (typeof module !== 'undefined' && module.exports && typeof require === 'function') ? require(f) : (root || {}); } catch (e) { return root || {}; } }
  function _luku(x, lo, hi) { var n = typeof x === 'string' && x.trim() !== '' ? Number(x) : x; return typeof n === 'number' && isFinite(n) && Math.floor(n) === n && n >= lo && n <= hi ? n : null; }

  function tmNormistoRatkaise(seuraKonfig) {
    var k = seuraKonfig && typeof seuraKonfig === 'object' ? seuraKonfig : {};
    if (k._ratkaistu) return k;   // jo ratkaistu
    var id = typeof k.normisto === 'string' && k.normisto ? k.normisto : TM_OLETUS.normisto, N = _has(NORMISTOT, id) ? NORMISTOT[id] : null;
    var ulos = { _ratkaistu: true, normisto: { arvo: id, lahde: typeof k.normisto === 'string' && k.normisto ? 'seura' : 'tm' }, tuntematon: !N, rajat: {}, seuranRajat: [] };
    var sr = k.rajat && typeof k.rajat === 'object' ? k.rajat : {};
    Object.keys(LUKITUT).forEach(function (a) { ulos.rajat[a] = { arvo: LUKITUT[a], lahde: 'tm' }; });   // lukitut: aina menetelmän arvo
    Object.keys(TM_OLETUS.rajat).forEach(function (a) {
      var v = _has(SEURA_SALLITUT, a) && _has(sr, a) ? _luku(sr[a], SEURA_SALLITUT[a][0], SEURA_SALLITUT[a][1]) : null;
      if (v != null) { ulos.rajat[a] = { arvo: v, lahde: 'seura' }; ulos.seuranRajat.push(a); }
      else if (N && _has(N.rajat, a)) ulos.rajat[a] = { arvo: N.rajat[a], lahde: 'normisto' };
      else ulos.rajat[a] = { arvo: TM_OLETUS.rajat[a], lahde: 'tm' };
    });
    ulos.ketju = N && N.ketju ? { arvo: N.ketju, lahde: 'normisto' } : { arvo: { tekniikka: [], fyysinen: [] }, lahde: 'tm' };
    var sallitut = N && N.testit ? N.testit : [], T = Array.isArray(k.testit) ? k.testit.filter(function (x, i, a) { return typeof x === 'string' && sallitut.indexOf(x) >= 0 && a.indexOf(x) === i; }) : null;   // vain normiston testien osajoukko
    ulos.testit = T && T.length ? { arvo: T, lahde: 'seura' } : { arvo: null, lahde: N ? 'normisto' : 'tm' };   // null = kaikki normiston testit
    var tt = {}, ts = k.tavoitetasot && typeof k.tavoitetasot === 'object' ? k.tavoitetasot : {};
    Object.keys(ts).forEach(function (ika) { var v = _luku(ts[ika], 1, 5); if (/^\d{1,2}$/.test(ika) && v != null) tt[ika] = v; });
    ulos.tavoitetasot = Object.keys(tt).length ? { arvo: tt, lahde: 'seura' } : { arvo: {}, lahde: 'tm' };
    return ulos;
  }

  /* Laskentakäyttö: litteät rajat + normihaku rekisteristä. null = tuntematon normisto / puuttuva rekisteri → kutsuja antaa tilan "ei dataa". */
  var _muisti = typeof WeakMap === 'function' ? new WeakMap() : null, _oletus = null;   // laskentakäytön välimuisti (asetusobjekti → käyttö); palvelinkoosteessa tuhansia kutsuja
  function tmNormistoKaytto(asetukset) {
    var avain = asetukset && typeof asetukset === 'object' ? asetukset : null;
    if (avain === null && asetukset == null && _oletus) return _oletus;
    if (avain && _muisti && _muisti.has(avain)) return _muisti.get(avain);
    var K = _kaytto(asetukset);
    if (K) { if (avain && _muisti) _muisti.set(avain, K); else if (asetukset == null) _oletus = K; }
    return K;
  }
  function _kaytto(asetukset) {
    var A = tmNormistoRatkaise(asetukset), N = A.tuntematon ? null : NORMISTOT[A.normisto.arvo], E = _lib('./tm_eerikkila_normit.js');
    var rek = E.NORMIREKISTERI || (typeof NORMIREKISTERI !== 'undefined' ? NORMIREKISTERI : null);   // selaimessa const → lexikaalinen, ei window-ominaisuus
    var reg = N && rek && _has(rek, N.rekisteri) ? rek[N.rekisteri] : null;
    if (!reg || typeof reg.laskeNormitaso !== 'function' || typeof reg.testikartta !== 'function') return null;
    var R = {}, lahteet = {}; Object.keys(A.rajat).forEach(function (a) { R[a] = A.rajat[a].arvo; lahteet[a] = A.rajat[a].lahde; });
    return { id: A.normisto.arvo, R: R, lahteet: lahteet, seuranRajat: A.seuranRajat, ketju: A.ketju.arvo, testit: A.testit.arvo, tavoitetasot: A.tavoitetasot.arvo,
      laskeTaso: function (testi, arvo, ika, sp) { return reg.laskeNormitaso(testi, arvo, ika, sp); }, testikartta: function () { return reg.testikartta(); } };
  }
  /* Vain rajat (joukkuesääntö ei tarvitse normitauluja): null = tuntematon normisto */
  function tmNormistoRajat(asetukset) { var A = tmNormistoRatkaise(asetukset); if (A.tuntematon) return null; var R = {}; Object.keys(A.rajat).forEach(function (a) { R[a] = A.rajat[a].arvo; }); return R; }
  /* Seuran tavoitetaso ikäluokalle (null = ei seuran tavoitetta) */
  function tmNormistoTavoitetaso(asetukset, ika) { var t = tmNormistoRatkaise(asetukset).tavoitetasot.arvo, v = t[String(ika)]; return v == null ? null : v; }
  /* Luku: lukija() palauttaa Promisen seurat/{sid}/konfiguraatio/normit -dokumentin datasta (tai null). Virhe/puuttuva → {} (oletus), ei heitä. */
  function tmNormistoLataa(lukija) {
    try { return Promise.resolve(lukija()).then(function (d) { return tmNormistoRatkaise(d && typeof d === 'object' ? d : {}); }, function () { return tmNormistoRatkaise({}); }); } catch (e) { return Promise.resolve(tmNormistoRatkaise({})); }
  }

  var API = { LUKITUT: LUKITUT, TM_OLETUS: TM_OLETUS, NORMISTOT: NORMISTOT, SEURA_SALLITUT: SEURA_SALLITUT, tmNormistoRatkaise: tmNormistoRatkaise, tmNormistoKaytto: tmNormistoKaytto, tmNormistoRajat: tmNormistoRajat, tmNormistoTavoitetaso: tmNormistoTavoitetaso, tmNormistoLataa: tmNormistoLataa };
  if (typeof module !== 'undefined' && module.exports) module.exports = API;
  if (root) { root.TM_NORMISTO = API; root.tmNormistoRatkaise = tmNormistoRatkaise; }
})(typeof window !== 'undefined' ? window : null);
