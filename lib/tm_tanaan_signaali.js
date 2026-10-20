/* ════════════════════════════════════════════════════════════════════════
   tm_tanaan_signaali.js — V4b-2: Tänään-signaali (D48) (docs/CODE_BRIEF_V4_KEHITYSTYOPOYTA.md #11–#14; design 18 §3). PURE (ei Firebasea, ei DOMia).
   YKSI signaali + pieni toinen rivi. Järjestys (lukittu, taulukkotesti tests/v4b2_tanaan_signaali.test.js):
     1 kuorma_tarkista (§25) · 2 valinta tehty (Vahvista) · 3 suljettava · 4 valinta odottaa pelaajaa · 4b sitoumus odottaa (käsitesti 7.10.) · 5 viikkokatsaus ei vastattu · 6 havainto · 7 ylläpito · 8 ei tietoa
   Poikkeukset tmSeuraavaAskel-portaisiin (D48): kuorma voittaa aina; pelaajan odottama vahvistus (2) ohittaa valmentajan myöhässä olevan katselmuksen (3).
   Profiili (D50, joukkueet/{jid}.valmentajaprofiili, oletus 'oto'): vain sävy ja aikaikkuna — ammatti: "odottaa · N pv" (+ review_myohassa nostetaan signaaliksi), oto: "kun ehdit", ei aikaikkunaa, review_myohassa EI nosteta.
   Sunnuntain pyyntö valmentajalle = rivi 5 (K4-rytmi), EI ilmoitus/notifikaatio (ei uusia Rules-oikeuksia).
   tmTanaanSignaali(p, ctx) → { ensisijainen: S|null, toinen: S|null }   S = { avain, savy:'amber'|'teal'|'ok'|'neutraali'|'harmaa'|'hiljainen', teksti, nappi:{avain,teksti}|null, pv? }
     ctx: { nyt (Date|ms), profiili ('ammatti'|'oto'), askel (tmSeuraavaAskel-tulos|null), tila (tmJaksoTila|null; muuten lasketaan), vkEiVastattu (bool: K4 sunnuntai + ei vastattu), tauko ({tauko,nimi} tmOnTauko|null), nimi, rooli (sävy: johto = kiireellisyys, muu = ilman painetta; ohittaa profiilin), eiHavaintoa (bool: kaikki osat itsenäisesti → havaintoa ei pyydetä) }
     Teksteissä pelaajan nimi ja luvut valmiina (henkilökunta saa nähdä luvut). Tekstit opts.t:n läpi (fi-oletus tässä).
   Dual-export: module.exports || window.TM_TANAAN_SIGNAALI.
════════════════════════════════════════════════════════════════════════ */
(function (root) {
  'use strict';
  var FI = {
    ts_kuorma: 'Tarkista jakson kuorma', ts_kuorma_nappi: 'Tarkista jakson kuorma',
    ts_valinta_tehty: '{nimi} valitsi reitin {kirjain}', ts_valinta_tehty_oma: '{nimi} ehdotti omaa reittiä', ts_valinta_tehty_oto: ', vahvista kun ehdit', ts_vahvista_nappi: 'Vahvista jakso',
    ts_suljettava: 'Jakso valmis suljettavaksi', ts_suljettava_odottaa: 'odottaa · {pv} pv', ts_suljettava_oto: 'kun ehdit', ts_suljettava_myohassa: 'yhteenveto myöhässä', ts_sulje_nappi: 'Tee jakson yhteenveto · 3 kysymystä',
    ts_valinta_odottaa: 'Valinta odottaa pelaajaa', ts_sitoumus_odottaa: 'Sitoumus odottaa pelaajaa', ts_askel_sitoumus_nappi: 'Vahvista sitoumus', ts_vk: 'Viikkokatsaus ei vastattu', ts_askel_sitoumus: 'Pelaaja on sitoutunut — vahvista sitoumus', ts_askel_ehdotus_odottaa: 'Valmentajan ehdotus odottaa tarkistusta', ts_askel_idp_jumissa: 'Kausitavoite on jumissa', ts_askel_valitavoite_valmis: 'Välitavoite saavutettu — valitse seuraava', ts_askel_review_eraantymassa: 'Jakson yhteenveto tai kehityskeskustelu erääntymässä', ts_askel_nappi: 'Avaa Polku',
    ts_havainto: 'Merkitse viikkohavainto', ts_havainto_nappi: 'Merkitse havainto', ts_muistuta_nappi: 'Muistuta pelaajaa',
    ts_tauko: 'Tauko: {nimi}', ts_tauko_ilman: 'Seuran tauko', ts_yllapito: 'Ei toimenpiteitä juuri nyt', ts_yllapito_nappi: 'Avaa Polku', ts_ei_tietoa: 'Ei tietoa — aloita jakso', ts_aloita_nappi: 'Aloita jakso'
  };
  /* K1d (Tero 20.10.): yhteenvetorytmi-ilmoitus. Otsikko aina eräpäivällä, selitysrivi (päivät edellisestä + väli), jaksorivi kun jakso on käynnissä, toiminnot (Tee jakson yhteenveto · Kirjaa kehityskeskustelu) ja "Miksi näen tämän?" jokaisessa Seuraava askel -kortissa. */
  Object.assign(FI, {
    ts_rytmi_otsikko: 'Jakson yhteenveto tai kehityskeskustelu viimeistään {pvm}', ts_rytmi_otsikko_myohassa: 'Jakson yhteenveto tai kehityskeskustelu myöhässä {n} pv',
    ts_rytmi_selitys: 'Edellisestä yhteenvedosta tai keskustelusta {n} pv. {ika}-vuotiaalle {vali} päivän välein.', ts_rytmi_selitys_ilman_ikaa: 'Edellisestä yhteenvedosta tai keskustelusta {n} pv. {vali} päivän välein.',
    ts_rytmi_jakso: 'Jakso päättyy {pvm}. Tee jakson yhteenveto tai pidä kehityskeskustelu ennen {pvm}.', ts_rytmi_yhteenveto_nappi: 'Tee jakson yhteenveto', ts_rytmi_keskustelu_nappi: 'Kirjaa kehityskeskustelu',
    ts_miksi_otsikko: 'Miksi näen tämän?',
    ts_miksi_kuorma_tarkista: 'Jakson ohjelma on raskas, eikä pelaajan kasvuvaihe (tai sen puuttuva mittaus) tue sitä.',
    ts_miksi_review_myohassa: 'Edellisestä jakson yhteenvedosta tai kehityskeskustelusta on {n} pv, ja {ika}-vuotiaalle on sovittu {vali} päivän väli. Eräpäivä oli {pvm}.',
    ts_miksi_review_eraantymassa: 'Edellisestä jakson yhteenvedosta tai kehityskeskustelusta on {n} pv, ja {ika}-vuotiaalle on sovittu {vali} päivän väli. Eräpäivä on {pvm}.',
    ts_miksi_valinta_odottaa: '{nimi} on valinnut reitin, ja jakso odottaa vahvistustasi.',
    ts_miksi_valinta_pelaajalla: 'Pelaajalle on tarjottu reitti, ja jakso alkaa vasta kun hän on valinnut.',
    ts_miksi_ehdotus_odottaa: 'Valmentajan tekemä kehityssuunnitelman ehdotus odottaa VP:n tarkistusta.',
    ts_miksi_sitoumus: 'Pelaaja on sitoutunut tähän jaksoon, eikä sitoumusta ole vielä vahvistettu.',
    ts_miksi_sitoumus_odottaa: 'Jakso on alkanut, mutta pelaaja ei ole vielä sitoutunut siihen.',
    ts_miksi_jakso_umpeutunut: 'Jakson suunniteltu kesto on kulunut umpeen. Jakson yhteenveto päättää jakson ja valitsee seuraavan.',
    ts_miksi_ei_jaksofokusta: 'Pelaajalle ei ole vielä valittu harjoiteltavaa asiaa tälle jaksolle.',
    ts_miksi_idp_jumissa: 'Kauden tavoite on yli 8 viikkoa vanha, eikä siinä ole nähty merkittävää edistystä.',
    ts_miksi_valitavoite_valmis: 'Jaksoon liitetty välitavoite on saavutettu, joten seuraava kannattaa valita.',
    ts_miksi_havainto: 'Jakson viimeisimmästä havainnosta on {pv} pv, ja havaintorytmi on {rytmi} pv.',
    ts_miksi_yllapito: 'Mikään sääntö ei nosta asiaa: jakso etenee ja havainnot ovat ajan tasalla.',
    ts_miksi_vk: 'Pelaaja ei ole vielä vastannut tämän viikon viikkokatsaukseen.',
    ts_miksi_tauko: 'Seuralla tai joukkueella on tauko, joten rytmin muistutukset pysähtyvät.'
  });
  var JARJESTYS = ['kuorma', 'valinta_tehty', 'suljettava', 'rytmi_myohassa', 'valinta_odottaa', 'sitoumus_odottaa', 'vk_ei_vastattu', 'askel_muu', 'rytmi', 'havainto', 'tauko', 'yllapito', 'ei_tietoa'];
  var MUUT = { sitoumus: 1, ehdotus_odottaa: 1, idp_jumissa: 1, valitavoite_valmis: 1 };
  var DAY = 86400000, IKKUNA_PV = 14;   // katselmusikkuna 2 vk (12 D21)

  function _txt(o, k) { var v = (o && typeof o.t === 'function') ? o.t(k) : k; return (v && v !== k) ? v : FI[k]; }
  function _fmt(s, m) { return String(s).replace(/\{(\w+)\}/g, function (_, k) { return m && m[k] != null ? m[k] : ''; }).replace(/(\d\.\d{1,2}\.)\.(?!\.)/g, '$1'); }   // K1d: "16.11." + lauseen piste → yksi piste
  function _req(g, f) { try { return (typeof module !== 'undefined' && module.exports && typeof require === 'function') ? require(f) : (root && root[g]); } catch (e) { return root && root[g]; } }
  function _RV() { return _req('TM_REITIN_VALINTA', './tm_reitin_valinta.js'); }
  function _SI() { return _req('TM_SANASTO_INFO', './tm_sanasto_info.js'); }   // K1d: ⓘ-selitteet (puuttuessa kortti toimii ilman)
  function _AJ() { return _req('TM_ALOITA_JAKSO', './tm_aloita_jakso.js'); }
  function _nytMs(ctx) { return ctx && ctx.nyt instanceof Date ? ctx.nyt.getTime() : (ctx && typeof ctx.nyt === 'number' ? ctx.nyt : Date.now()); }
  /* Päivät päivinä ilman kellonaikaa (§7.11, §7.26): tmPaivaNum (lib/tm_aloita_jakso.js) = paikallinen kalenteripäivä → Date.UTC(y,m-1,d)/86400000; sama data → sama tulos UTC:ssä ja Helsingissä. */
  function _pvNum(v) { var AJ = _AJ(); if (AJ && typeof AJ.tmPaivaNum === 'function') return AJ.tmPaivaNum(v); var d = v instanceof Date ? v : new Date(v); return isNaN(d.getTime()) ? NaN : Date.UTC(d.getFullYear(), d.getMonth(), d.getDate()) / DAY; }
  function _loppuPv(jf) {   // jakson päättymispäivä (alkupäivä + kesto × 7), päiväluku
    var a = jf && jf.alkoi ? _pvNum(jf.alkoi) : NaN, yht = Number(jf && jf.kesto_vk) > 0 ? Number(jf.kesto_vk) : 4;
    return isNaN(a) ? NaN : a + yht * 7;
  }

  /* K1d: päivämäärä lyhyesti ("30.11."; vuosi mukaan kun se ei ole kuluva) ISO-päivästä; ei Date-parsintaa merkkijonosta (§7.26) */
  function _pvmFi(iso, nytMs) {
    var m = /^(\d{4})-(\d{2})-(\d{2})/.exec(String(iso || '')); if (!m) return '';
    var v = new Date(nytMs).getFullYear();
    return (+m[3]) + '.' + (+m[2]) + '.' + (+m[1] === v ? '' : m[1]);
  }
  /* K1d: push-notifikaation (functions/rytmi_notif.js) teksti selaimessa kielellä: x.rytmi = { eraantyy_pvm, myohassa_pv, nimi, joukkue } → lib-avaimet ts_rytmi_otsikko[_myohassa] (sv erä 80); vanhat notifit (ei x.rytmi) → tallennettu teksti. */
  function tmRytmiNotifTeksti(x, opts) {
    var r = x && x.rytmi; if (!r) return (x && x.teksti) || '';
    return (r.myohassa_pv > 0 ? _fmt(_txt(opts, 'ts_rytmi_otsikko_myohassa'), { n: r.myohassa_pv }) : _fmt(_txt(opts, 'ts_rytmi_otsikko'), { pvm: _pvmFi(r.eraantyy_pvm, Date.now()) })) + ': ' + (r.nimi || '') + (r.joukkue ? ' (' + r.joukkue + ')' : '') + '.';
  }
  /* "Miksi näen tämän?" — YKSI lause säännöstä joka nosti askeleen. avain = tmSeuraavaAskel-avain TAI signaalin oma avain; peruste = askel.peruste; ctx.nimi/nyt. Aina teksti (ts_miksi_<avain>), ei tyhjää. */
  var MIKSI_ASKELET = ['kuorma_tarkista', 'review_myohassa', 'valinta_odottaa', 'ehdotus_odottaa', 'sitoumus', 'jakso_umpeutunut', 'ei_jaksofokusta', 'idp_jumissa', 'valitavoite_valmis', 'review_eraantymassa', 'havainto', 'yllapito'];
  function tmMiksi(avain, peruste, ctx, opts) {
    ctx = ctx || {}; peruste = peruste || {}; var nytMs = _nytMs(ctx), k = 'ts_miksi_' + avain;
    if (FI[k] == null) return '';
    return _fmt(_txt(opts, k), { n: peruste.edellinenPv != null ? peruste.edellinenPv : '', ika: peruste.ika != null ? peruste.ika : '', vali: peruste.valiPv != null ? peruste.valiPv : '', pvm: _pvmFi(peruste.eraantyyPvm, nytMs),
      nimi: ctx.nimi || '', pv: peruste.paivia != null ? peruste.paivia : '', rytmi: peruste.rytmi_pv != null ? peruste.rytmi_pv : '' });
  }
  /* Yhteenvetorytmi-kortti (askel review_myohassa | review_eraantymassa): otsikko eräpäivällä · selitys · jaksorivi · toiminnot. */
  function _rytmi(askel, ctx, T, nytMs) {
    var pr = askel.peruste || {}, myoh = askel.avain === 'review_myohassa', jakso = pr.jakso || null, ika = pr.ika != null;
    var selitys = [T(ika ? 'ts_rytmi_selitys' : 'ts_rytmi_selitys_ilman_ikaa', { n: pr.edellinenPv != null ? pr.edellinenPv : '', ika: pr.ika, vali: pr.valiPv != null ? pr.valiPv : '' })];
    if (jakso && jakso.loppuPvm) selitys.push(T('ts_rytmi_jakso', { pvm: _pvmFi(jakso.loppuPvm, nytMs) }));
    var yhteenveto = jakso ? { avain: 'sulje', teksti: T('ts_rytmi_yhteenveto_nappi') } : null, keskustelu = ctx.keskustelu === true ? { avain: 'kirjaa_keskustelu', teksti: T('ts_rytmi_keskustelu_nappi') } : null;
    return { avain: myoh ? 'rytmi_myohassa' : 'rytmi', askel: askel.avain, savy: myoh ? 'amber' : 'teal',
      teksti: myoh ? T('ts_rytmi_otsikko_myohassa', { n: pr.ylimaaraPv }) : (pr.eraantyyPvm ? T('ts_rytmi_otsikko', { pvm: _pvmFi(pr.eraantyyPvm, nytMs) }) : T('ts_askel_review_eraantymassa')),
      selitys: selitys, pv: myoh ? pr.ylimaaraPv : null, eraantyyPvm: pr.eraantyyPvm || null, jaksoLoppuPvm: jakso ? jakso.loppuPvm : null,
      nappi: yhteenveto || keskustelu, napit: yhteenveto && keskustelu ? [keskustelu] : [] };
  }

  function tmOnAmmatti(profiili) { return profiili === 'ammatti'; }   // oletus (myös tuntematon arvo) = oto
  /* Sävy ROOLIN mukaan (mockup 22, rooli-valitsin; A13 jatko 3): johto (VP, UTJ, sihteeri, SA) näkee kiireellisyyden ("odottaa · N pv", myöhässä); valmentaja ilman painetta ("kun ehdit"), myöhästymispäiviä ei näytetä.
     ctx.rooli puuttuu → joukkueen profiili (D50) kuten ennen. Valinta täällä, ei kuoressa. */
  var JOHTO_ROOLIT = { vp: 1, urheilutoimenjohtaja: 1, seurasihteeri: 1, super_admin: 1, superadmin: 1 };
  function tmSavyAmmatti(ctx) { ctx = ctx || {}; return ctx.rooli ? !!JOHTO_ROOLIT[ctx.rooli] : tmOnAmmatti(ctx.profiili); }

  /* Kaikki täyttyvät signaalit D48-järjestyksessä (testit tarkistavat järjestyksen tästä). */
  function tmSignaalit(p, ctx, opts) {
    ctx = ctx || {}; opts = opts || {}; p = p || {};
    var T = function (k, m) { return _fmt(_txt(opts, k), m); }, ammatti = tmSavyAmmatti(ctx), askel = ctx.askel || null, nyt = _nytMs(ctx);
    var jf = p.jaksofokus || null, RV = _RV(), AJ = _AJ();
    var tila = ctx.tila || (AJ && AJ.tmJaksoTila ? AJ.tmJaksoTila(p, { nyt: nyt }) : null);
    var r = RV && RV.tmHenkRivitila ? RV.tmHenkRivitila(p) : null, ulos = [];
    var nimi = ctx.nimi || p.etunimi || '';
    /* Tauko (D131, D193): ctx.tauko = TM_KALENTERI_KYSELYT.tmOnTauko(...) → pelaajan rytmiin sidotut signaalit (viikkokatsaus, havainto, eräpäivät) pysähtyvät, myöhästyminen ei kasva. Kuorma ja pelaajan tekemä valinta näkyvät silti. */
    var tauko = ctx.tauko && ctx.tauko.tauko ? ctx.tauko : null;
    // 1 kuorma_tarkista (§25) — voittaa aina
    if (askel && askel.avain === 'kuorma_tarkista') ulos.push({ avain: 'kuorma', savy: 'amber', teksti: T('ts_kuorma'), nappi: { avain: 'kuorma', teksti: T('ts_kuorma_nappi') } });
    // 2 valinta tehty (K3) — pelaajan odottama vahvistus
    if (jf && jf.tila === 'valittavana' && r && r.tila === 'valittu') {
      var t2 = r.oma ? T('ts_valinta_tehty_oma', { nimi: nimi }) : T('ts_valinta_tehty', { nimi: nimi, kirjain: r.kirjain });
      ulos.push({ avain: 'valinta_tehty', savy: 'ok', teksti: t2 + (ammatti ? '' : T('ts_valinta_tehty_oto')), nappi: { avain: 'vahvista', teksti: T('ts_vahvista_nappi') } });
    }
    // 3 suljettava — jakso päättynyt (porras 4); ammatti: myös review_myohassa (porras 1)
    var paattynyt = (tila && tila.tila === 'paattynyt') || (askel && askel.avain === 'jakso_umpeutunut');
    if (paattynyt) {
      var loppu = _loppuPv(jf), pv = (paattynyt && !isNaN(loppu)) ? Math.max(0, _pvNum(nyt) - loppu) : null;
      var lisa = ammatti && !tauko ? (pv != null && pv > IKKUNA_PV ? T('ts_suljettava_myohassa') : (pv != null ? T('ts_suljettava_odottaa', { pv: pv }) : '')) : T('ts_suljettava_oto');
      ulos.push({ avain: 'suljettava', savy: !tauko && ammatti && pv != null && pv > IKKUNA_PV ? 'amber' : 'neutraali', teksti: T('ts_suljettava') + (lisa ? ' · ' + lisa : ''), pv: pv, nappi: { avain: 'sulje', teksti: T('ts_sulje_nappi') } });
    }
    // 3b yhteenvetorytmi myöhässä (porras 1) — vain johto/ammatti-sävy; jos jakso on jo päättynyt, 'suljettava' hoitaa (jakson yhteenveto nollaa rytmin)
    var rytmiAskel = askel && (askel.avain === 'review_myohassa' || askel.avain === 'review_eraantymassa') && ammatti && !tauko && !paattynyt ? _rytmi(askel, ctx, T, nyt) : null;
    if (rytmiAskel && askel.avain === 'review_myohassa') ulos.push(rytmiAskel);
    // 4 valinta odottaa pelaajaa — tiedoksi, ei nappia
    if (jf && jf.tila === 'valittavana' && r && r.tila === 'odottaa') ulos.push({ avain: 'valinta_odottaa', savy: 'neutraali', teksti: T('ts_valinta_odottaa'), nappi: null });
    // 4b sitoumus odottaa (P6) — jakso alkanut, pelaaja ei ole vielä sitoutunut (tmJaksoTila 'vahvistettu', otsikkorivin "sitoumus odottaa"); tiedoksi, pelaajan asia → ei nappia
    if (tila && tila.tila === 'vahvistettu') ulos.push({ avain: 'sitoumus_odottaa', savy: 'neutraali', teksti: T('ts_sitoumus_odottaa'), nappi: null });
    // 5 viikkokatsaus ei vastattu (K4) — pieni rivi, pelaajan asia
    /* nappi (D100, Tero 11.10.): "Muistuta pelaajaa" kun muistutuksen lähetys on kuoressa saatavilla (ctx.vkMuistutus === true) ja pelaajaa ei ole vielä muistutettu tällä ISO-viikolla; muuten "Merkitse havainto" (kuoressa ei lähetyspolkua → ei kuollutta nappia) */
    if (ctx.vkEiVastattu === true && !tauko) ulos.push({ avain: 'vk_ei_vastattu', savy: 'neutraali', teksti: T('ts_vk'), nappi: ctx.vkMuistutus === true && ctx.vkMuistutettu !== true ? { avain: 'muistuta_vk', teksti: T('ts_muistuta_nappi') } : { avain: 'havainto', teksti: T('ts_havainto_nappi') } });
    // 5b muut toimenpideportaat (tmSeuraavaAskel 2–8): ilman tätä jakso voi jäädä KOKONAAN ilman signaalia (käsitesti 7.10.: askel 'sitoumus' = pelaaja sitoutui, vahvistus puuttuu). Oto: ei aikaikkunoita → review_eraantymassa ei nosteta.
    if (askel && MUUT[askel.avain]) ulos.push({ avain: 'askel_muu', askel: askel.avain, savy: 'teal', teksti: T('ts_askel_' + askel.avain), nappi: askel.avain === 'sitoumus' ? { avain: 'vahvista_sitoumus', teksti: T('ts_askel_sitoumus_nappi') } : { avain: 'avaa_polku', teksti: T('ts_askel_nappi') } });   // A1: sitoumuksen vahvistus suoraan signaalista (VP + Master)
    // 5c yhteenvetorytmi erääntymässä (porras 8) — pehmeä takaraja, vain johto/ammatti-sävy
    if (rytmiAskel && askel.avain === 'review_eraantymassa') ulos.push(rytmiAskel);
    // 6 havainto (porras 9)
    if (askel && askel.avain === 'havainto' && !ctx.eiHavaintoa && !tauko) ulos.push({ avain: 'havainto', savy: 'teal', teksti: T('ts_havainto'), nappi: { avain: 'havainto', teksti: T('ts_havainto_nappi') }, pv: askel.peruste && askel.peruste.paivia != null ? askel.peruste.paivia : null });
    // 7 ylläpito — käynnissä oleva jakso, ei muuta toimenpidettä (hiljainen)
    var kaynnissa = !!(jf && (jf.konsepti_avain || jf.konsepti_nimi) && jf.tila !== 'valittavana' && !paattynyt);
    if (tauko && kaynnissa && !ulos.length) ulos.push({ avain: 'tauko', savy: 'hiljainen', teksti: tauko.nimi ? T('ts_tauko', { nimi: tauko.nimi }) : T('ts_tauko_ilman'), nappi: null });
    if (kaynnissa && !ulos.length) ulos.push({ avain: 'yllapito', savy: 'hiljainen', teksti: T('ts_yllapito'), nappi: { avain: 'avaa_polku', teksti: T('ts_yllapito_nappi') } });
    // 8 ei tietoa (porras 5) — ei jaksoa eikä tarjousta
    if (!jf || !(jf.konsepti_avain || jf.konsepti_nimi || jf.tila === 'valittavana')) ulos.push({ avain: 'ei_tietoa', savy: 'harmaa', teksti: T('ts_ei_tietoa'), nappi: { avain: 'aloita', teksti: T('ts_aloita_nappi') } });
    var MIKSI_SIGNAALI = { kuorma: 'kuorma_tarkista', valinta_tehty: 'valinta_odottaa', suljettava: 'jakso_umpeutunut', valinta_odottaa: 'valinta_pelaajalla', sitoumus_odottaa: 'sitoumus_odottaa', vk_ei_vastattu: 'vk', havainto: 'havainto', tauko: 'tauko', yllapito: 'yllapito', ei_tietoa: 'ei_jaksofokusta' };
    ulos.forEach(function (x) {
      var a = x.avain === 'askel_muu' ? x.askel : (x.avain === 'rytmi' || x.avain === 'rytmi_myohassa' ? x.askel : MIKSI_SIGNAALI[x.avain]);
      x.miksi = tmMiksi(a, askel && (askel.avain === a || x.askel) ? askel.peruste : null, Object.assign({}, ctx, { nimi: nimi }), opts); x.miksiOtsikko = T('ts_miksi_otsikko');
    });
    return ulos;
  }

  function tmTanaanSignaali(p, ctx, opts) {
    var s = tmSignaalit(p, ctx, opts);
    var ensisijainen = s[0] || null;
    // pieni toinen rivi: seuraava täyttyvä, mutta ei hiljaista ylläpitoa (ei kerrottavaa) eikä "ei tietoa" -vaihtoehtoa jo ensimmäisen rinnalle
    var toinen = null; for (var i = 1; i < s.length; i++) if (s[i].avain !== 'yllapito' && s[i].avain !== 'ei_tietoa' && s[i].avain !== 'tauko') { toinen = s[i]; break; }
    return { ensisijainen: ensisijainen, toinen: toinen };
  }

  /* HTML (Tänään, mockup 22 osio 1 .ev.sig): ensisijainen kortti — yläotsikko · otsikko · perustelu (.why) · nappi · sisältö (viikkohavaintopaneeli, D100) · alarivit (.second: sitoumus + toinen signaali).
     opts: { esc, t, toimiFn, pid, hk, why (teksti), sisalto (valmis HTML, paneeli), alarivit (tekstit[]) }. Sävy: amber → .w (varoitus), teal/ok → oletus, muut → .n (katkoviiva). Vain tokenit; luokat tm_kehitystyopoyta.js:n CSS:ssä. */
  function tmTanaanSignaaliHTML(x, opts) {
    opts = opts || {}; if (!x || !x.ensisijainen) return '';
    var esc = opts.esc || function (s) { return String(s == null ? '' : s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;'); };
    var hk = typeof opts.hk === 'function' ? opts.hk : function (h) { return h; };   // A8: Pelaajan silmin — luvut .kt-hk:ksi (tmKtHk)
    var s = x.ensisijainen, cls = s.savy === 'amber' ? ' w' : (s.savy === 'teal' || s.savy === 'ok' ? '' : ' n');
    var SI = !opts.ilmanInfo ? _SI() : null, info = function (a) { return SI && typeof SI.tmSanastoInfoHTML === 'function' ? SI.tmSanastoInfoHTML(a, { esc: esc, t: opts.t, id: 'si-' + a + '-' + (opts.pid || 'x') }) : ''; };
    var otsInfo = (s.avain === 'rytmi' || s.avain === 'rytmi_myohassa' || s.avain === 'suljettava') ? info('jakson_yhteenveto') : '', keskInfo = (s.avain === 'rytmi' || s.avain === 'rytmi_myohassa') ? info('kehityskeskustelu') : '';
    var nBtn = function (n, cls) { return '<button type="button" class="' + cls + '" data-kt-signaali-nappi="' + esc(n.avain) + '" onclick="' + esc(opts.toimiFn + "('" + (opts.pid || '') + "','" + n.avain + "')") + '">' + esc(n.teksti) + '</button>'; };
    var nappi = s.nappi && opts.toimiFn && !opts.piilotaNappi ? '<div class="kt-sig-napit">' + nBtn(s.nappi, 'kt-btn') + (s.napit || []).map(function (n) { return nBtn(n, 'kt-btn g'); }).join('') + keskInfo + '</div>' : '';
    var selitys = (Array.isArray(s.selitys) ? s.selitys : []).map(function (r) { return '<div class="kt-sig-why" data-kt-sig-selitys>' + hk(esc(r)) + '</div>'; }).join('');
    var miksi = s.miksi ? '<details class="kt-sig-miksi" data-kt-miksi><summary>' + esc(s.miksiOtsikko || _txt(opts, 'ts_miksi_otsikko')) + '</summary><div class="kt-sig-miksi-t">' + hk(esc(s.miksi)) + '</div></details>' : '';
    var rivit = (Array.isArray(opts.alarivit) ? opts.alarivit : []).concat(x.toinen ? [x.toinen.teksti] : []).filter(Boolean);
    var toinen = rivit.length ? '<div class="kt-sig-second"' + (x.toinen ? ' data-kt-signaali-toinen="' + esc(x.toinen.avain) + '"' : '') + '>' + rivit.map(function (r) { return '<div>' + hk(esc(r)) + '</div>'; }).join('') + '</div>' : '';
    return '<div class="kt-sig' + cls + '" data-kt-signaali="' + esc(s.avain) + '"><span class="kt-eb">' + esc(_txt(opts, 'ts_otsikko')) + '</span><div class="kt-sig-h">' + hk(esc(s.teksti)) + otsInfo + '</div>'
      + (opts.why ? '<div class="kt-sig-why">' + hk(esc(opts.why)) + '</div>' : '') + selitys + nappi + (opts.sisalto || '') + miksi + toinen + '</div>';
  }
  FI.ts_otsikko = 'Seuraava askel';

  var API = { FI: FI, JARJESTYS: JARJESTYS, IKKUNA_PV: IKKUNA_PV, tmOnAmmatti: tmOnAmmatti, tmSavyAmmatti: tmSavyAmmatti, tmSignaalit: tmSignaalit, tmMiksi: tmMiksi, tmRytmiNotifTeksti: tmRytmiNotifTeksti, MIKSI_ASKELET: MIKSI_ASKELET, tmTanaanSignaali: tmTanaanSignaali, tmTanaanSignaaliHTML: tmTanaanSignaaliHTML };
  if (typeof module !== 'undefined' && module.exports) module.exports = API; else root.TM_TANAAN_SIGNAALI = API;
})(typeof window !== 'undefined' ? window : this);
