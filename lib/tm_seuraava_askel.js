/* ════════════════════════════════════════════════════════════════════════
   tm_seuraava_askel.js — R6.2b: "mikä on tämän pelaajan SEURAAVA TOIMENPIDE" YHDESSÄ paikassa (PURE, EI Firestore/DOM/kyselyjä).
   Aiemmin neljä rinnakkaista päättelijää: VP _pdcPaatos (6 sääntöä), "tee tästä" -osan valinta, _vpSulkuSeuraava (VP) ja _msSeuraava (Master).
   Nyt kaikki kutsuvat tätä; kutsupaikoille jää ohut kääre (tekstit/render omassa sovelluksessa, päätös täällä).

   tmSeuraavaAskel(p, opts) → { avain, tila:'toimenpide'|'hiljainen', peruste:{…}, nappi?, rajoite:{…} }   (aina avain + peruste)
     ENSIN (ennen porrasta 1): kuorma_tarkista — vain jos KÄYNNISSÄ OLEVAN jakson kuorma ei sovi pelaajan PHV-tilaan.
     Portaat (ensimmäinen täyttyvä voittaa):
       1 review_myohassa   1b valinta_odottaa (D-1: pelaaja valitsi ydinvahvuuden, jakso 'valittavana' → vahvista)   2 ehdotus_odottaa   3 sitoumus   4 jakso_umpeutunut (uusi)   5 ei_jaksofokusta   6 idp_jumissa
       7 valitavoite_valmis (uusi)   8 review_eraantymassa   9 havainto (uusi: havaintorytmi, oletus 14 pv)   10 yllapito (uusi oletus; peruste.signaali 'xfactor' | null)
     rajoite = PHV on RAJOITE, ei askel: { phv:'PH'|'tuntematon'|<koodi>|null, varovainen:bool, eiMitattu:bool } palautetaan AINA, minkä tahansa askeleen rinnalla.
       Tuntematon (mittaamaton ikäikkunassa) = varovaisin (lib/tm_phv_tila.js). Askeleeksi PHV nousee vain kuorma_tarkista-tapauksessa.
   tmSeuraavaJakso(p, nykyAvain, tulos, deps) → seuraava jakso sulkulomakkeelle ('ennallaan' → sama; muuten fyysinen: heikoin D1 / muuten D2-silta) | null
   tmTeeTastaOsa(item) → indeksi osalle, jonka sisällä "tee tästä" -cue näytetään (aina osa b jos ≥ 2 osaa, muuten a)
   Riippuvuudet INJEKTOIDAAN (opts.deps / deps) tai luetaan globaaleista (selain) → Node-testit ajavat samat kanoniset libit.
   Dual-export: module.exports || window.TM_SEURAAVA_ASKEL.
════════════════════════════════════════════════════════════════════════ */
(function (root) {
  'use strict';

  var HAVAINTO_RYTMI_PV = 14;   // D7 Perus; profiili (R6.3) asettaa opts.havaintoRytmiPv
  var DAY = 86400000;

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
      phvOhjelmaKuorma: d.phvOhjelmaKuorma || _g('tmPhvOhjelmaKuorma')   // kuormakategoriat: YKSI lähde lib/tm_phv_tila.js
    };
  }
  // Sama sääntö kuin VP:n bulk-signaali: pelaaja sitoutui, vahvistusta ei nykyiselle jaksolle.
  function _sitoumusOdottaa(p) {
    if (!p || !p.idp_sitoumus_pvm) return false;
    var cur = (p.jaksofokus && p.jaksofokus.alkoi) || null;
    return (p.idp_sitoumus_vahv_jakso || null) !== cur;
  }
  // Paikallinen kalenteripäivä (§7.26): date-only merkkijono sellaisenaan, muuten aikaleiman PAIKALLINEN päivä.
  function _pvmPaiva(v) {
    if (v == null || v === '') return null;
    var s = String(v);
    if (/^\d{4}-\d{2}-\d{2}$/.test(s)) return s;
    var ms = Date.parse(s); if (isNaN(ms)) return null;
    var d = new Date(ms); var m = d.getMonth() + 1, p = d.getDate();
    return d.getFullYear() + '-' + (m < 10 ? '0' : '') + m + '-' + (p < 10 ? '0' : '') + p;
  }
  function _paivaEro(a, b) {   // b − a, kokonaisina kalenteripäivinä
    var x = a.split('-'), y = b.split('-');
    return Math.round((Date.UTC(+y[0], +y[1] - 1, +y[2]) - Date.UTC(+x[0], +x[1] - 1, +x[2])) / DAY);
  }
  // Havaintolähteet pelaajadokista (EI alikokoelmakyselyjä, §26): arviointi_pvm = valmentajan/VP:n arviointi, adar_viimeisin.pvm = ADAR/pelianalyysi.
  // havainto_viimeisin_pvm = varattu pikakenttä vapaille havainnoille (ei vielä kirjoittajaa).
  function _havaintoLahteet(p) {
    return [['arviointi', p.arviointi_pvm], ['adar', p.adar_viimeisin && p.adar_viimeisin.pvm], ['havainto', p.havainto_viimeisin_pvm]];
  }
  function _havaintoRytmi(p, jf, nytD, rytmiPv) {
    if (!jf || !jf.alkoi) return null;                              // ei jaksoa → sääntö 5 hoitaa; ei alkoi-pvm:ää → ei arvausta
    var alku = _pvmPaiva(jf.alkoi); if (!alku) return null;
    var tanaan = _pvmPaiva(nytD.toISOString()); if (!tanaan) return null;
    var paras = null, lahde = 'jakso_alku';
    _havaintoLahteet(p).forEach(function (l) {
      var d = _pvmPaiva(l[1]);
      if (d && d >= alku && d <= tanaan && (!paras || d > paras)) { paras = d; lahde = l[0]; }   // vain jakson aikaiset havainnot kohdistuvat tähän jaksoon
    });
    var ref = paras || alku;
    var paivia = _paivaEro(ref, tanaan);
    if (paivia <= rytmiPv) return null;
    return { paivia: paivia, rytmi_pv: rytmiPv, viimeisin_pvm: paras, lahde: lahde };
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
    if (jf && !umpeutunut && jf.domeeni === 'fyysinen' && jf.ohjelma && rajoite.varovainen && _kutsu(D.phvOhjelmaKuorma, jf.ohjelma.tyyppi)) {
      return ulos('kuorma_tarkista', 'toimenpide', { ohjelma_tyyppi: jf.ohjelma.tyyppi, kuorma: _kutsu(D.phvOhjelmaKuorma, jf.ohjelma.tyyppi), phv: rajoite.phv });
    }
    var rk = _kutsu(D.laskeReviewKadenssi, p, nyt) || null;
    // 1. review myöhässä — kova takaraja
    if (rk && rk.status === 'myohassa') return ulos('review_myohassa', 'toimenpide', { ylimaaraPv: rk.ylimaaraPv });
    // 1b. valinta_odottaa (D-1) — pelaaja on tehnyt valintansa (ydinvahvuus_valinta) ja jakso odottaa vahvistusta (jaksofokus.tila 'valittavana', additiivinen).
    //     Peruste: pelaajan etunimi + vastuuhenkilö (jos asetettu) nimineen; nimet haetaan opts.henkilot-listasta ([{id|uid, nimi}], injektoitu — lib ei lue Firestorea).
    if (p.ydinvahvuus_valinta && jf && jf.tila === 'valittavana') {
      var vh = p.vastuuhenkilo || null;
      var vhH = vh && Array.isArray(opts.henkilot) ? opts.henkilot.filter(function (h) { return h && (h.uid === vh.uid || h.id === vh.uid); })[0] : null;
      return ulos('valinta_odottaa', 'toimenpide', { pelaaja_nimi: p.etunimi || null, vastuuhenkilo_uid: vh ? vh.uid : null, vastuuhenkilo_rooli: vh ? vh.rooli : null, vastuuhenkilo_nimi: vhH && vhH.nimi ? vhH.nimi : null });
    }
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
    // 9. havainto (uusi) = HAVAINTORYTMI: käynnissä olevan jakson viimeisimmästä havainnosta yli N pv (oletus 14). Ei havaintoja → aika jakson alusta.
    //    Kaikki lähteet yhteen: arviointi (valmentaja/VP) · ADAR/pelianalyysi (pelaajadokin pikakentät). Pelaajatasoinen, ei konseptikohtainen.
    var hr = _havaintoRytmi(p, jf, nytD, opts.havaintoRytmiPv != null ? opts.havaintoRytmiPv : HAVAINTO_RYTMI_PV);
    if (hr) return ulos('havainto', 'toimenpide', hr);
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
    // D8:n ehdotukset: heikoin havaittu → ehdotus; heikko = arvo ≤ 2/5 (lippu henkilökunnalle; ennen tämä oli askel 9, nyt vain sulun ehdotuksen syöte)
    var eri = ehd.filter(function (e) { return e.konsepti_avain !== nykyAvain; });
    var v = eri.length ? eri[0] : (ehd.length ? ehd[0] : null);
    return v ? Object.assign({}, v, { heikko: typeof v.arvo === 'number' && v.arvo <= 2 }) : null;
  }

  /* D8 (R6.3-A): "Aloita seuraava jakso" → moottori ehdottaa KAKSI konseptia (valmentaja vahvistaa, pelaaja valitsee). Ehdotukset = lasketusta datasta:
     ensisijaisesti arvioinnin havaitut (tmSiltaEhdota; heikoin ensin — "heikko"-lippu vain henkilökunnalle), vähäisen datan tilassa täydennys deps.laskettuEhdotukset(p):sta
     (esim. testien/pelianalyysin laskema). EI askel ja EI pelaajalle näkyvä: vahvistettu:false kunnes valmentaja vahvistaa (tmPelaajanVaihtoehdot, lib/tm_jakso_malli.js). */
  function tmJaksoEhdotukset(p, nykyAvain, deps) {
    deps = deps || {};
    var ulos = [], nahty = {};
    var lisaa = function (e, lahde) {
      if (!e || !e.konsepti_avain || e.konsepti_avain === nykyAvain || nahty[e.konsepti_avain] || ulos.length >= 2) return;
      nahty[e.konsepti_avain] = 1;
      ulos.push({ konsepti_avain: e.konsepti_avain, konsepti_nimi: e.konsepti_nimi || e.konsepti_avain, lahde: lahde, jarjestys: ulos.length + 1, heikko: typeof e.arvo === 'number' ? e.arvo <= 2 : false, vahvistettu: false });
    };
    if (p && p.arviointi_havaittu && typeof deps.siltaEhdota === 'function') {
      var sallitut = typeof deps.sallitut === 'function' ? deps.sallitut() : null;
      (deps.siltaEhdota(p.arviointi_havaittu, { sallitutKonseptit: sallitut, konseptiNimi: function (a) { var k = _kutsu(deps.siltaKonsepti, a); return k ? k.nimi : a; } }) || []).forEach(function (e) { lisaa(e, 'havainto'); });
    }
    if (ulos.length < 2 && typeof deps.laskettuEhdotukset === 'function') (deps.laskettuEhdotukset(p) || []).forEach(function (e) { lisaa(e, 'laskettu'); });
    return ulos;
  }

  // "Tee tästä" -osan valinta: per-osa-näkyvyyttä ei ole tallennettu → oletus osa b (idx 1) kun ≥ 2 osaa, muuten a (idx 0).
  function tmTeeTastaOsa(item) {
    var n = item && Array.isArray(item.kpi) ? item.kpi.length : 0;
    return n >= 2 ? 1 : 0;
  }

  var API = { tmSeuraavaAskel: tmSeuraavaAskel, tmSeuraavaJakso: tmSeuraavaJakso, tmJaksoEhdotukset: tmJaksoEhdotukset, tmTeeTastaOsa: tmTeeTastaOsa, HAVAINTO_RYTMI_PV: HAVAINTO_RYTMI_PV };
  if (typeof module !== 'undefined' && module.exports) module.exports = API;
  else root.TM_SEURAAVA_ASKEL = API;
})(typeof window !== 'undefined' ? window : this);
