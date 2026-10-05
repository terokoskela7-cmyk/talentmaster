/* ════════════════════════════════════════════════════════════════════════
   tm_seuraava_askel.js — R6.2b: "mikä on tämän pelaajan SEURAAVA TOIMENPIDE" YHDESSÄ paikassa (PURE, EI Firestore/DOM/kyselyjä).
   Aiemmin neljä rinnakkaista päättelijää: VP _pdcPaatos (6 sääntöä), "tee tästä" -osan valinta, _vpSulkuSeuraava (VP) ja _msSeuraava (Master).
   Nyt kaikki kutsuvat tätä; kutsupaikoille jää ohut kääre (tekstit/render omassa sovelluksessa, päätös täällä).

   tmSeuraavaAskel(p, opts) → { avain, tila:'toimenpide'|'hiljainen', peruste:{…}, nappi?, rajoite:{…} }   (aina avain + peruste)
     ENSIN (ennen porrasta 1): kuorma_tarkista — vain jos KÄYNNISSÄ OLEVAN jakson kuorma ei sovi pelaajan PHV-tilaan.
     Portaat (ensimmäinen täyttyvä voittaa):
       1 review_myohassa   2 ehdotus_odottaa   3 sitoumus   4 jakso_umpeutunut (uusi)   5 ei_jaksofokusta   6 idp_jumissa
       7 valitavoite_valmis (uusi)   8 review_eraantymassa   9 havainto (uusi)   10 yllapito (uusi oletus; peruste.signaali 'xfactor' | null)
     rajoite = PHV on RAJOITE, ei askel: { phv:'PH'|'tuntematon'|<koodi>|null, varovainen:bool, eiMitattu:bool } palautetaan AINA, minkä tahansa askeleen rinnalla.
       Tuntematon (mittaamaton ikäikkunassa) = varovaisin (lib/tm_phv_tila.js). Askeleeksi PHV nousee vain kuorma_tarkista-tapauksessa.
   tmSeuraavaJakso(p, nykyAvain, tulos, deps) → seuraava jakso sulkulomakkeelle ('ennallaan' → sama; muuten fyysinen: heikoin D1 / muuten D2-silta) | null
   tmTeeTastaOsa(item) → indeksi osalle, jonka sisällä "tee tästä" -cue näytetään (aina osa b jos ≥ 2 osaa, muuten a)
   Riippuvuudet INJEKTOIDAAN (opts.deps / deps) tai luetaan globaaleista (selain) → Node-testit ajavat samat kanoniset libit.
   Dual-export: module.exports || window.TM_SEURAAVA_ASKEL.
════════════════════════════════════════════════════════════════════════ */
(function (root) {
  'use strict';

  // Raskaat fyysiset ohjelmatyypit (kuorma jota PH/mittaamaton-ikkuna-pelaajalle ei anneta ilman tarkistusta). Lyhyt, tarkoituksella suppea lista.
  var RASKAAT_OHJELMAT = { nopeus_voima: 1, perusvoima: 1, nopeus: 1 };

  function _g(nimi) { return root && root[nimi]; }
  function _deps(d) {
    d = d || {};
    return {
      laskeReviewKadenssi: d.laskeReviewKadenssi || _g('laskeReviewKadenssi'),
      idpJumissa: d.idpJumissa || _g('idpJumissa'),
      jaksoUmpeutunut: d.jaksoUmpeutunut || (_g('TM_JAKSOFOKUS') && _g('TM_JAKSOFOKUS').tmJfUmpeutunut),
      sitoumusOdottaa: d.sitoumusOdottaa || _g('_rvcSitoumusOdottaa') || _sitoumusOdottaa,
      phvKuormaTila: d.phvKuormaTila || _g('tmPhvKuormaTila'),
      phvKuormaVarovainen: d.phvKuormaVarovainen || _g('tmPhvKuormaVarovainen'),
      phvEiMitattu: d.phvEiMitattu || _g('tmPhvEiMitattu'),
      siltaEhdota: d.siltaEhdota || (_g('TM_ARVIOINTI_SILTA') && _g('TM_ARVIOINTI_SILTA').tmSiltaEhdota)
    };
  }
  // Sama sääntö kuin VP:n bulk-signaali: pelaaja sitoutui, vahvistusta ei nykyiselle jaksolle.
  function _sitoumusOdottaa(p) {
    if (!p || !p.idp_sitoumus_pvm) return false;
    var cur = (p.jaksofokus && p.jaksofokus.alkoi) || null;
    return (p.idp_sitoumus_vahv_jakso || null) !== cur;
  }
  function _kutsu(fn, a, b) { return typeof fn === 'function' ? fn(a, b) : undefined; }

  function _rajoite(p, nytD, D) {
    var tila = _kutsu(D.phvKuormaTila, p, nytD);
    return {
      phv: tila === undefined ? null : tila,
      varovainen: !!_kutsu(D.phvKuormaVarovainen, p, nytD),
      eiMitattu: !!_kutsu(D.phvEiMitattu, p, nytD)
    };
  }

  function tmSeuraavaAskel(p, opts) {
    if (!p) return null;
    opts = opts || {};
    var nyt = opts.nyt != null ? opts.nyt : Date.now();
    var nytD = new Date(nyt);
    var D = _deps(opts.deps);
    var jf = p.jaksofokus || null;
    var t = p._idpTavoite || null;
    var rajoite = _rajoite(p, nytD, D);
    var ulos = function (avain, tila, peruste, extra) {
      var o = { avain: avain, tila: tila, peruste: peruste || {}, rajoite: rajoite };
      if (extra) Object.keys(extra).forEach(function (k) { o[k] = extra[k]; });
      return o;
    };
    var umpeutunut = !!(jf && _kutsu(D.jaksoUmpeutunut, jf, nyt));

    // 0. kuorma_tarkista — vain käynnissä oleva (ei umpeutunut) fyysinen jakso jonka ohjelma on raskas JA pelaajan PHV vaatii varovaisuutta (PH tai tuntematon).
    if (jf && !umpeutunut && jf.domeeni === 'fyysinen' && jf.ohjelma && RASKAAT_OHJELMAT[jf.ohjelma.tyyppi] && rajoite.varovainen) {
      return ulos('kuorma_tarkista', 'toimenpide', { ohjelma_tyyppi: jf.ohjelma.tyyppi, phv: rajoite.phv });
    }
    var rk = _kutsu(D.laskeReviewKadenssi, p, nyt) || null;
    // 1. review myöhässä — kova takaraja
    if (rk && rk.status === 'myohassa') return ulos('review_myohassa', 'toimenpide', { ylimaaraPv: rk.ylimaaraPv });
    // 2. valmentajan ehdotus odottaa VP:n tarkistusta (vain hyväksymätön, tallennettu 'ehdotettu')
    if (p._idpLuonnos && p._luonnosTallennettu && p._idpLuonnos.status === 'ehdotettu') {
      return ulos('ehdotus_odottaa', 'toimenpide', {}, { nappi: 'tarkista_ehdotus' });
    }
    // 3. pelaaja sitoutui, vahvistus puuttuu tältä jaksolta
    if (_kutsu(D.sitoumusOdottaa, p)) return ulos('sitoumus', 'toimenpide', {});
    // 4. jakso umpeutunut (uusi) — sulje ja valitse seuraava
    if (umpeutunut) return ulos('jakso_umpeutunut', 'toimenpide', { konsepti_nimi: jf.konsepti_nimi || null, kesto_vk: jf.kesto_vk || 4 });
    // 5. jaksolle ei ole valittu harjoiteltavaa taitoa
    if (!(jf && jf.konsepti_nimi)) return ulos('ei_jaksofokusta', 'toimenpide', {});
    // 6. kauden tavoite jumissa (kanoninen 8 vk -sääntö, lib/tm_idp.js)
    if (t && _kutsu(D.idpJumissa, t, nyt)) return ulos('idp_jumissa', 'toimenpide', {});
    // 7. jakson linkittämä välitavoite on saavutettu (uusi) — valitse seuraava
    var vt = t && Array.isArray(t.valitavoitteet) ? t.valitavoitteet : null;
    if (vt && jf.valitavoite_idx != null && vt[jf.valitavoite_idx] && vt[jf.valitavoite_idx].tila === 'saavutettu') {
      return ulos('valitavoite_valmis', 'toimenpide', { nimi: vt[jf.valitavoite_idx].nimi || null, valitavoite_idx: jf.valitavoite_idx });
    }
    // 8. review erääntymässä (≤14 pv) — pehmeä takaraja
    if (rk && rk.status === 'eraantymassa' && rk.eraantyyPvm) return ulos('review_eraantymassa', 'toimenpide', { eraantyyPvm: rk.eraantyyPvm });
    // 9. havainto (uusi) — arvioinnin heikoin havaittu (≤ 2/5) joka EI ole käynnissä oleva jakso
    if (p.arviointi_havaittu && typeof D.siltaEhdota === 'function') {
      var ehd = D.siltaEhdota(p.arviointi_havaittu, opts.siltaCtx || {}) || [];
      var h = ehd[0];
      if (h && typeof h.arvo === 'number' && h.arvo <= 2 && h.konsepti_avain !== jf.konsepti_avain) {
        return ulos('havainto', 'toimenpide', { konsepti_avain: h.konsepti_avain, konsepti_nimi: h.konsepti_nimi || null, palloliitto_avain: h.palloliitto_avain || null, arvo: h.arvo });
      }
    }
    // 10. ylläpito — oletus, hiljainen (X-Factor on harvinainen → ei toimenpide, vain peruste)
    return ulos('yllapito', 'hiljainen', { signaali: p.signaali === 'xfactor' ? 'xfactor' : null });
  }

  /* Sulun seuraava jakso (aiemmin kaksi kopiota: VP _vpSulkuSeuraava, Master _msSeuraava). deps (sovelluskohtaiset):
       fyysTeema(avain)→{nimi}|null · fyysEhdotus(p, true)→{avain,nimi}|null · siltaKonsepti(avain)→{nimi}|null ·
       siltaEhdota (TM_ARVIOINTI_SILTA.tmSiltaEhdota) · sallitut()→[konsepti-itemit]  */
  function tmSeuraavaJakso(p, nykyAvain, tulos, deps) {
    deps = deps || {};
    var jf = (p && p.jaksofokus) || {};
    var nimiFn = function (a) { var k = _kutsu(deps.siltaKonsepti, a); return k ? k.nimi : a; };
    if (jf.domeeni === 'fyysinen') {
      if (tulos === 'ennallaan') { var ft = _kutsu(deps.fyysTeema, nykyAvain); return { konsepti_avain: nykyAvain, konsepti_nimi: ft ? ft.nimi : nykyAvain, jatka: true, fyysinen: true }; }
      var fe = _kutsu(deps.fyysEhdotus, p, true);
      if (fe) return { konsepti_avain: fe.avain, konsepti_nimi: fe.nimi, fyysinen: true, jatka: fe.avain === nykyAvain };
      return null;
    }
    if (tulos === 'ennallaan') { var k = _kutsu(deps.siltaKonsepti, nykyAvain); return { konsepti_avain: nykyAvain, konsepti_nimi: k ? k.nimi : nykyAvain, jatka: true }; }
    if (typeof deps.siltaEhdota !== 'function' || !p || !p.arviointi_havaittu) return null;
    var sallitut = typeof deps.sallitut === 'function' ? deps.sallitut() : null;
    var ehd = deps.siltaEhdota(p.arviointi_havaittu, { sallitutKonseptit: sallitut, konseptiNimi: nimiFn }) || [];
    var eri = ehd.filter(function (e) { return e.konsepti_avain !== nykyAvain; });
    return eri.length ? eri[0] : (ehd.length ? ehd[0] : null);
  }

  // "Tee tästä" -osan valinta: per-osa-näkyvyyttä ei ole tallennettu → oletus osa b (idx 1) kun ≥ 2 osaa, muuten a (idx 0).
  function tmTeeTastaOsa(item) {
    var n = item && Array.isArray(item.kpi) ? item.kpi.length : 0;
    return n >= 2 ? 1 : 0;
  }

  var API = { tmSeuraavaAskel: tmSeuraavaAskel, tmSeuraavaJakso: tmSeuraavaJakso, tmTeeTastaOsa: tmTeeTastaOsa, RASKAAT_OHJELMAT: RASKAAT_OHJELMAT };
  if (typeof module !== 'undefined' && module.exports) module.exports = API;
  else root.TM_SEURAAVA_ASKEL = API;
})(typeof window !== 'undefined' ? window : this);
