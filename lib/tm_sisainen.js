/* ════════════════════════════════════════════════════════════════════════
   tm_sisainen.js — Vaihe 1 / PR 1a: HENKILÖKUNNAN SISÄISET KENTÄT pois pelaajan luettavasta dokumentista. Dual-export: module.exports || window.TM_SISAINEN.
   Pelaaja ja huoltaja lukevat koko `seurat/{sid}/pelaajat/{pid}`-dokumentin → A-kentät (sisäinen) siirtyvät yhteen staff-only-dokumenttiin:
       seurat/{sid}/pelaajat/{pid}/sisainen/tiedot   (+ kenttä `seuraId` collectionGroup-kyselyä ja Rules-tarkistusta varten)
   SIIRTYMÄ ILMAN KATKOA: dual-READ (sisainen voittaa, vanha pelaajakenttä varalla; Master/Sibbo toimii vaikka siivousta ei olisi ajettu). PR 2a: D3:n dual-WRITE on LOPETETTU — D3 kirjoitetaan vain sisainen/tiedot:iin (ryhmä d3 `vainSisainen`).
   Tässä PR:ssä KYTKETTY vain ryhmä `d3`; muut ryhmät on määritelty rekisteriin (inventaario 22.10.) mutta `kytketty:false` → eivät vaikuta mihinkään ennen omaa viipalettaan.
   · RYHMAT / tmSisainenKentat()          kenttärekisteri (top-level A-kentät ryhmittäin; pistepolut vain dokumentaationa)
   · tmSisainenPolku(sid, pid)            'seurat/{sid}/pelaajat/{pid}/sisainen/tiedot'
   · tmSisainenYhdista(pelaaja, sisainen) dual-read: uusi olio, sisainen voittaa; D3: pelaajan d3_itsearvio → pisteet[dim].pelaaja (tm_d3_itsearvio.js)
   · tmSisainenYhdistaLista(lista, mapa)  sama listalle (mapa = tmSisainenLataaSeura-tulos)
   · tmSisainenJaa(payload, opts)         kirjoitusjako: { pelaaja, sisainen }. PR 2a: D3 (vainSisainen) VAIN sisainen:iin; muut A-ryhmät dual-write (opts.pelaajaIlmanA → PR 2 -tila); sisainen:null jos ei A-kenttiä
   · tmJaksofokusKirjoita(db, sid, pid, polut, deps)  PR 1b-2: jaksofokus-osapäivitysten dual-write (lippu RYHMAT.jaksofokus_sisainen.kirjoitus, oletus pois); tmJaksofokusPolutJaa = puhdas jako
   · tmJaksofokusElinkaariKirjoita(db, sid, pid, upd, v, deps)  PR 1b-3: jakson elinkaari (kokonainen jaksofokus + historiarivit) → jaksofokus_sisainen korvataan, historia_sisainen.<avain> lisätään; sama lippu; tmJaksoAvain = leima vanhojen asiakkaiden varalle
   · tmHenkilokuntaOsa / tmHenkilokuntaKirjoita  PR 1c-1 (S2): henkilokunta-ryhmän (vastuuhenkilo, tukitarve, scout_potentiaali*, talentti_ehdotus, review_*, idp_*) dual-write mergeFields-batchilla; oma lippu RYHMAT.henkilokunta.kirjoitus (pois) ohjaa kirjoituksen JA dual-readin
   · S4 (PR 1e-1): adar_sisainen · arviointi · kypsyys_sisainen (+ vanhempien pituudet) · talentti · signaali → sisainen/tiedot; TERVEYS (kaytettavyys, loukkaantuminen_*, paluu_arvio; GDPR art. 9) → OMA dokumentti sisainen/terveys (kapeampi lukijajoukko, Rules v3.70) — YKSI lippu RYHMAT.s4.kirjoitus (oletus pois; ohjaa dual-writen JA dual-readin). tmS4Osa/Kirjoita/Lisaa/Varapolulla (tiedot) ja tmTerveysOsa/Kirjoita/Lisaa/Varapolulla (terveys) = sama apunelikko kuin henkilokunta (_erillinen);
     tmSignaaliJaa (talenttisignaalit → sisainen, 'phv' pelaajalle) · tmPorrasEhdotusJaa (hist → sisainen.havainto_porras_hist, pelaajalle hist_n). Kirjoittajat kytketään 1e-2 (CF) / 1e-3 (selain); migraatio scripts/migroi_sisainen_s4.js.
   · tmSisainenKirjoita(db, sid, pid, payload, deps)  vain sisainen-kentät → yksi set; sekapayload → batch; permission-denied-varapolku EI D3:lle (heittää → näkyvä virhe)
   · S1 (PR 1b-1): JAKSOFOKUS_A / HISTORIA_A · tmJaksofokusJaa / tmJaksofokusYhdista · tmHistoriaAvain / tmHistoriaJaa / tmHistoriaYhdista — jaksofokuksen ja jaksofokus_historia-rivien A-osat (sisainen.jaksofokus_sisainen, sisainen.historia_sisainen); tmSisainenYhdista yhdistää ne
     vanhaan muotoon (dual-READ); kirjoittajat kytketään PR 1b-2/1b-3:ssa, migraatio scripts/migroi_sisainen_jaksofokus.js
   · tmSisainenVainSisaiset(opts)         kentät jotka kirjoitetaan vain sisainen:iin (D3: d3_viimeisin, d3_taso, d3_pvm, d3_varmuus, d3_vp_pvm)
   · tmSisainenLataaJaYhdista(db, sid, lista)  lataus + yhdistys yhdellä kutsulla (Master/VP-kuoren yksi rivi)
   · tmSisainenLataaSeura(db, sid)        YKSI collectionGroup('sisainen').where('seuraId','==',sid) → { mapa:{pid:data}, virhe }  (ei N+1; vaatii indeksin sisainen.seuraId COLLECTION_GROUP)
   Riippuu: lib/tm_d3_itsearvio.js (TM_D3_ITSEARVIO). Pelaaja-/vanhempi-app EI saa ladata tätä tiedostoa (vartija: tests/d3_jako_kirjoittajat.test.js).
════════════════════════════════════════════════════════════════════════ */
(function (root) {
  'use strict';

  var ALIKOKOELMA = 'sisainen', DOKUMENTTI = 'tiedot', TERVEYS_DOK = 'terveys', TERVEYS_SEURA = 'terveysSeuraId';

  /* Ryhmät (inventaario 22.10. + PM:n päätökset). kentat: top-level kentät jotka siirtyvät; pistepolut (jaksofokus.…) ovat dokumentaatiota — vain kytkettyjen ryhmien kentät toimivat top-level-avaimina. */
  var RYHMAT = {
    d3: { kytketty: true, vainSisainen: true, kentat: ['d3_viimeisin', 'd3_taso', 'd3_pvm', 'd3_varmuus', 'd3_vp_pvm'] },   // PM: d3_taso/_pvm/_varmuus = A; pelaajan oma osa → d3_itsearvio (B). PR 2a: vainSisainen → EI dual-writea pelaajadokumenttiin
    jaksofokus_sisainen: { kytketty: false, kirjoitus: false, luku: true, sisainenAvain: 'jaksofokus_sisainen', kentat: ['jaksofokus.osa_havainnot', 'jaksofokus.osa_havainnot_vk', 'jaksofokus.tavoite_tarkenteet', 'jaksofokus.onnistumiskriteeri', 'jaksofokus.linkitetyt', 'jaksofokus.tavoite_alue', 'jaksofokus.valitavoite_idx', 'jaksofokus.poikkeama', 'jaksofokus.oma_jakso'] },
    historia_sisainen: { kytketty: false, luku: true, sisainenAvain: 'historia_sisainen', kentat: ['historia_sisainen'] },   // map <alkoi-ISO>_<konsepti_avain>: havainnot_vk, arvio_*, kalibraatio_ero, delta_mitattu, d3_snapshot, sitoumus_snapshot (PM päätös 6)
    henkilokunta: { kytketty: false, kirjoitus: false, luku: true, erillinen: true, kentat: ['vastuuhenkilo', 'tukitarve', 'scout_potentiaali', 'scout_potentiaali_taso', 'scout_potentiaali_huomiot', 'scout_potentiaali_pvm', 'scout_potentiaali_arvioija', 'talentti_ehdotus',
      'review_viimeisin_pvm', 'review_viimeisin_tyyppi', 'review_tagit', 'idp_edistyma', 'idp_lahde', 'idp_viim_review', 'idp_dvi'] },   // S2 (PR 1c): top-level kentät; oma lippu `kirjoitus` (pois) ohjaa SEKÄ kirjoituksen ETTÄ dual-readin; erillinen = ei tmSisainenJaa-reittiä (mergeFields, ks. tmHenkilokuntaOsa)
    /* ── S4 (PR 1e): YKSI yhteinen lippu RYHMAT.s4.kirjoitus (oletus pois) ohjaa viiden ryhmän dual-writea JA dual-readia. Ryhmät ovat `erillinen` (ei tmSisainenJaa-reittiä; kirjoitus mergeFields-apurilla tmS4Osa/tmS4Kirjoita). */
    s4: { kytketty: false, kirjoitus: true, luku: true, kentat: [] },
    adar_sisainen: { s4: true, erillinen: true, kytketty: false, kentat: ['adar_arvioijat', 'adar_arvioijia', 'adar_yhtenevyys', 'adar_yhtenevyys_taso', 'adar_dim_konsensus', 'adar_vahvin', 'adar_tilanne_jakauma', 'adar_vaihe_jakauma', 'adar_otos_jakauma', 'adar_ottelupohja', 'adar_luotettavuus', 'havainto_viimeisin_pvm', 'havainto_porras_hist'] },   // havainto_porras_hist = havainto_porras_ehdotus.hist (≤3 raakapistettä; pelaaja näkee vain sanatilan → P7 lukee vain hist_n); ehdotus {valmis, seuraava, hist_n} jää pelaajalle (tmPorrasEhdotusJaa)
    arviointi: { s4: true, erillinen: true, kytketty: false, syva: ['arviointi_havaittu'], kentat: ['arviointi_havaittu', 'arviointi_pvm', 'arviointi_kehys', 'arviointi_kooste', 'potentiaali_kooste', 'arviointi_kooste_pvm'] },   // kirjoittaja CF arviointikertaOnWrite
    kypsyys_sisainen: { s4: true, erillinen: true, kytketty: false, kentat: ['kasvutahti_cm_v', 'kasvutahti_vyohyke', 'maturity_offset', 'kehitysvaihe_kaista', 'kronologinen_ika', 'phv_raaka', 'phv_huom', 'phv_ongelma', 'phv_ilmoitettu_ph', 'phv_ei_mitattu',
      'isa_pituus_cm', 'aiti_pituus_cm', 'vanhempi_pituus_pvm', 'vanhempi_pituus_puuttuu'] },   // + vanhempien pituudet (CF vahvistaSuostumus). B jää: phv_tila, phv_tila_koodi, phv_ika, biologinenIka_viimeisin
    talentti: { s4: true, erillinen: true, kytketty: false, kentat: ['talenttiOhjelma', 'talenttiTaso', 'talenttiAlku', 'talenttiAktivoi', 'talenttiPaattyi'] },   // sisainen/tiedot (oman seuran henkilökunta lukee)
    /* TERVEYS (PM 25.10., PR #1137): käytettävyys/loukkaantuminen/paluu = terveystietoa (GDPR art. 9) → OMA dokumentti `sisainen/terveys` (ei tiedot:iin: tiedot lukee koko oman seuran henkilökunta, myös seurasihteeri ja testivastaava).
       Lukijat (Rules v3.70): SA · vp · urheilutoimenjohtaja · fysioterapeutti · talenttivalmentaja · oman joukkueen valmentaja. EI seurasihteeri, testivastaava, pelaaja, huoltaja. Kirjoittajat: SA · onOmanJoukkueenValmentaja · fysioterapeutti.
       Dokumentin seuraavain on `terveysSeuraId` (EI `seuraId`) → tiedot-joukkolataus (where seuraId == sid) ei osu terveys-dokumentteihin eikä kaadu niiden rajattuun lukuun. */
    terveys: { s4: true, erillinen: true, kytketty: false, dokumentti: 'terveys', seuraAvain: 'terveysSeuraId', kentat: ['kaytettavyys', 'loukkaantuminen_tyyppi', 'loukkaantuminen_alue', 'loukkaantuminen_pvm', 'paluu_arvio'] },
    signaali: { s4: true, erillinen: true, kytketty: false, kentat: ['signaali'], jaa: true },   // jaettu arvo: 'phv' jää pelaajalle (P7 PH-merkki); talenttisignaalit (SIGNAALI_SISAINEN) → sisainen. Ks. tmSignaaliJaa
    // idp_sisainen poistettu: `tavoitteet` = C (PM 24.10.) — jää pelaajadokumenttiin, PR 2 siivoaa; idp_edistyma/_lahde/_viim_review/_dvi → henkilokunta (S2)
    tuonti_meta: { kytketty: false, kentat: ['tuoja', 'muokkaajaUid'] }   // korjattu/korjaus = C (PM 22.10.), jää
  };

  function _ryhmat(opts) { return (opts && opts.ryhmat) || RYHMAT; }
  /* PR 1c-1 (S2): henkilokunta-ryhmän oma lippu. opts.henkilokuntaKirjoitus ohittaa (testit/CF-vakio); muuten RYHMAT.henkilokunta.kirjoitus (oletus pois). Lippu ohjaa kirjoituksen JA dual-readin (pois → vanha kenttä). */
  function _hkPaalla(opts) { if (opts && opts.henkilokuntaKirjoitus !== undefined && opts.henkilokuntaKirjoitus !== null) return !!opts.henkilokuntaKirjoitus; var r = _ryhmat(opts).henkilokunta; return !!(r && r.kirjoitus); }
  function tmHenkilokuntaKentat(opts) { var r = _ryhmat(opts).henkilokunta; return r ? r.kentat.slice() : []; }
  /* PR 1e-1 (S4): kuuden ryhmän (adar_sisainen, arviointi, kypsyys_sisainen, talentti, terveys, signaali) YKSI lippu RYHMAT.s4.kirjoitus (oletus pois). opts.s4Kirjoitus ohittaa (testit). Lippu ohjaa kirjoituksen JA dual-readin (pois → vanha kenttä). */
  function _s4Paalla(opts) { if (opts && opts.s4Kirjoitus !== undefined && opts.s4Kirjoitus !== null) return !!opts.s4Kirjoitus; var r = _ryhmat(opts).s4; return !!(r && r.kirjoitus); }
  /* terveys: true → vain oman dokumentin (sisainen/terveys) S4-ryhmät; false → vain sisainen/tiedot:iin menevät; undefined → kaikki S4-kentät (grep-portti). */
  function _s4Kentat(opts, terveys) { var r = _ryhmat(opts), ulos = []; Object.keys(r).forEach(function (n) { if (r[n].s4 && (terveys === undefined || !!r[n].dokumentti === terveys)) r[n].kentat.forEach(function (k) { if (ulos.indexOf(k) < 0) ulos.push(k); }); }); return ulos; }
  function tmS4Kentat(opts) { return _s4Kentat(opts); }
  function tmS4TiedotKentat(opts) { return _s4Kentat(opts, false); }
  /* Syvät kentät (RYHMAT.<ryhmä>.syva): kirjoitetaan avainkohtaisesti (pistepolku), ei koko kartan korvauksena. */
  function tmS4SyvaKentat(opts) { var r = _ryhmat(opts), ulos = []; Object.keys(r).forEach(function (n) { if (r[n].s4 && !r[n].dokumentti && Array.isArray(r[n].syva)) r[n].syva.forEach(function (k) { if (ulos.indexOf(k) < 0) ulos.push(k); }); }); return ulos; }
  function tmTerveysKentat(opts) { return _s4Kentat(opts, true); }
  /* Lukukentät: kytkettyjen ryhmien top-level-kentät + henkilokunta / S4 (vain tiedot-dokumentin ryhmät; terveys luetaan omasta dokumentistaan) kun niiden liput ovat päällä. */
  function _lukuKentat(opts) { var k = tmSisainenKentat(opts); if (_hkPaalla(opts)) tmHenkilokuntaKentat(opts).forEach(function (x) { if (k.indexOf(x) < 0) k.push(x); }); if (_s4Paalla(opts)) tmS4TiedotKentat(opts).forEach(function (x) { if (k.indexOf(x) < 0) k.push(x); }); return k; }
  /* PR 2a: kytkettyjen ryhmien kentät, jotka kirjoitetaan VAIN sisainen/tiedot:iin (ei pelaajadokumenttiin, ei varapolkua). */
  function tmSisainenVainSisaiset(opts) {
    var r = _ryhmat(opts), ulos = [];
    Object.keys(r).forEach(function (n) { if (r[n].kytketty && r[n].vainSisainen) r[n].kentat.forEach(function (k) { if (k.indexOf('.') < 0 && ulos.indexOf(k) < 0) ulos.push(k); }); });
    return ulos;
  }
  /* Kytkettyjen ryhmien top-level-kentät (pisteellä alkavat polut ohitetaan). */
  function tmSisainenKentat(opts) {
    var r = _ryhmat(opts), ulos = [];
    Object.keys(r).forEach(function (n) { if (r[n].kytketty && !r[n].erillinen) r[n].kentat.forEach(function (k) { if (k.indexOf('.') < 0 && ulos.indexOf(k) < 0) ulos.push(k); }); });
    return ulos;
  }
  function tmSisainenPolku(sid, pid) { return 'seurat/' + sid + '/pelaajat/' + pid + '/' + ALIKOKOELMA + '/' + DOKUMENTTI; }
  function tmTerveysPolku(sid, pid) { return 'seurat/' + sid + '/pelaajat/' + pid + '/' + ALIKOKOELMA + '/' + TERVEYS_DOK; }

  function _D3() {
    var m = (typeof module !== 'undefined' && module.exports && typeof require === 'function') ? require('./tm_d3_itsearvio.js') : root.TM_D3_ITSEARVIO;
    return m && typeof m.tmD3Yhdista === 'function' ? m : null;
  }

  /* ── VIIPALE S1 (PR 1b-1): jaksofokuksen sisäiset osat — PURE jako- ja yhdistysfunktiot (kirjoittajat kytketään PR 1b-2/1b-3:ssa; tässä vain malli + dual-READ + migraatio).
     Sisainen/tiedot:ssa: `jaksofokus_sisainen` = { <A-alikenttä>: arvo } (jaksofokus-objektin A-osat) · `historia_sisainen` = { <tmHistoriaAvain>: { <A-kenttä>: arvo } } (jaksofokus_historia-rivien A-osat).
     Julkiselle puolelle jää B/C: jaksofokus ilman A-alikenttiä (asetti {rooli,pvm} ja lahde (tyyppi) jäävät — PM 23.10.: vain rooli/pvm/lähdetyyppi, ei uid/email) ja historiarivi ilman A-kenttiä (lause jää). */
  var JAKSOFOKUS_A = ['osa_havainnot', 'osa_havainnot_vk', 'tavoite_tarkenteet', 'onnistumiskriteeri', 'linkitetyt', 'tavoite_alue', 'valitavoite_idx', 'poikkeama', 'oma_jakso'];
  var HISTORIA_A = ['havainnot_vk', 'arvio_ennen', 'arvio_jalkeen', 'arvio_itse', 'arvio_valmentaja', 'arvio_vp', 'arvioija_rooli', 'kalibraatio_ero', 'delta_mitattu', 'd3_snapshot', 'sitoumus_snapshot'];
  function _olio(x) { return !!x && typeof x === 'object' && !Array.isArray(x); }
  function _onArvo(v) { return v !== undefined && v !== null; }

  /* Historiarivin avain sisainen.historia_sisainen-mapissa: `<alkoi>_<konsepti_avain>` (PM päätös 6). alkoi = rivin tallennettu merkkijono; '.' → ',' (Firestore-kenttäpolut: ISO-aikaleiman millisekuntipiste ei saa olla polkuerotin). null jos alkoi/konsepti_avain puuttuu. */
  function tmHistoriaAvain(rivi) {
    if (!_olio(rivi) || typeof rivi.alkoi !== 'string' || !rivi.alkoi || typeof rivi.konsepti_avain !== 'string' || !rivi.konsepti_avain) return null;
    return (rivi.alkoi + '_' + rivi.konsepti_avain).replace(/\./g, ',');
  }
  /* jaksofokus-objekti → { julkinen (ilman A-alikenttiä), sisainen ({A-alikenttä: arvo} | null) } */
  function tmJaksofokusJaa(jf) {
    if (!_olio(jf)) return { julkinen: jf, sisainen: null };
    var julk = {}, sis = {}, on = false;
    Object.keys(jf).forEach(function (k) { if (JAKSOFOKUS_A.indexOf(k) >= 0) { if (_onArvo(jf[k])) { sis[k] = jf[k]; on = true; } } else julk[k] = jf[k]; });
    return { julkinen: julk, sisainen: on ? sis : null };
  }
  /* DUAL-READ: julkinen jaksofokus + sisainen.jaksofokus_sisainen → vanha (yhdistetty) muoto; sisainen voittaa kentittäin. Ei jaksofokusta → ennallaan (A-osilla ei ole jaksoa jonka osa ne olisivat). */
  /* PR 1b-3: jakson tunniste `<alkoi>_<konsepti_avain>` — kirjoitetaan jaksofokus_sisainen.jakso_avain:iin jakson elinkaarikirjoituksessa. Dual-read ohittaa sisainen-osat, jos leima on eri jaksolta kuin julkinen jaksofokus
     (vanha välimuisti-Master vaihtoi jakson vain pelaajadokumenttiin → sisainen jäi edellisen jakson A-osiin; ilman tätä vanhan jakson havainnot näkyisivät uudessa jaksossa). Ei leimaa (migraatio, 1b-2 -osapäivitys) → käytetään kuten ennen. */
  function tmJaksoAvain(jf) {
    return (_olio(jf) && typeof jf.alkoi === 'string' && jf.alkoi && typeof jf.konsepti_avain === 'string' && jf.konsepti_avain) ? jf.alkoi + '_' + jf.konsepti_avain : null;
  }
  function tmJaksofokusYhdista(jf, sis) {
    if (!_olio(jf) || !_olio(sis)) return jf;
    var ja = tmJaksoAvain(jf); if (ja && typeof sis.jakso_avain === 'string' && sis.jakso_avain !== ja) return jf;   // sisainen on toiselta jaksolta → vanha (dual-write) pelaajadokumentin kopio on voimassa
    var ulos = Object.assign({}, jf); JAKSOFOKUS_A.forEach(function (k) { if (_onArvo(sis[k])) ulos[k] = sis[k]; }); return ulos;
  }
  /* historiarivi → { avain|null, julkinen (ilman A-kenttiä), sisainen ({A-kenttä: arvo} | null) } */
  function tmHistoriaJaa(rivi) {
    if (!_olio(rivi)) return { avain: null, julkinen: rivi, sisainen: null };
    var julk = {}, sis = {}, on = false;
    Object.keys(rivi).forEach(function (k) { if (HISTORIA_A.indexOf(k) >= 0) { if (_onArvo(rivi[k])) { sis[k] = rivi[k]; on = true; } } else julk[k] = rivi[k]; });
    return { avain: tmHistoriaAvain(rivi), julkinen: julk, sisainen: on ? sis : null };
  }
  /* DUAL-READ: julkiset rivit + sisainen.historia_sisainen → vanha muoto (rivin A-kentät takaisin); sisainen voittaa kentittäin; rivit ilman avainta/osumaa ennallaan. */
  function tmHistoriaYhdista(rivit, his) {
    if (!Array.isArray(rivit) || !_olio(his)) return rivit;
    return rivit.map(function (r) {
      var a = tmHistoriaAvain(r), s = a ? his[a] : null; if (!_olio(s)) return r;
      var ulos = Object.assign({}, r); HISTORIA_A.forEach(function (k) { if (_onArvo(s[k])) ulos[k] = s[k]; }); return ulos;
    });
  }

  /* DUAL-READ. sisainen voittaa kentittäin (undefined = ei ole → vanha kenttä varalla). Palauttaa UUDEN olion; syötteet ennallaan. */
  function tmSisainenYhdista(pelaaja, sisainen, opts) {
    var ulos = Object.assign({}, pelaaja || {});
    if (sisainen && typeof sisainen === 'object') {
      _lukuKentat(opts).forEach(function (k) { if (sisainen[k] !== undefined) ulos[k] = sisainen[k]; });   // PR 1c: + henkilokunta kun sen lippu on päällä
      if (_s4Paalla(opts) && Array.isArray(sisainen.havainto_porras_hist)) ulos.havainto_porras_ehdotus = Object.assign({}, _olio(ulos.havainto_porras_ehdotus) ? ulos.havainto_porras_ehdotus : {}, { hist: sisainen.havainto_porras_hist });   // S4: porrasehdotuksen hist takaisin vanhaan muotoon (henkilökunnan lukijat)
      if (_jfKirjoitusPaalla(opts) && _olio(sisainen.jaksofokus_sisainen)) ulos.jaksofokus = tmJaksofokusYhdista(ulos.jaksofokus, sisainen.jaksofokus_sisainen);   // S1: jaksofokuksen A-osat — seuraa samaa lippua kuin kirjoitus (PR 1b-3): lippu pois → vanha kenttä
      if (_jfKirjoitusPaalla(opts) && _olio(sisainen.historia_sisainen)) ulos.jaksofokus_historia = tmHistoriaYhdista(ulos.jaksofokus_historia, sisainen.historia_sisainen);   // S1: historiarivien A-osat
    }
    /* S4/terveys: oma dokumentti (opts.terveys = tämän pelaajan sisainen/terveys-data; lukijalla oltava oikeus, muuten puuttuu → vanha kenttä varalla). Seuraa samaa lippua kuin kirjoitus. */
    if (_s4Paalla(opts) && opts && _olio(opts.terveys)) tmTerveysKentat(opts).forEach(function (k) { if (opts.terveys[k] !== undefined) ulos[k] = opts.terveys[k]; });
    var d3 = _D3(); return d3 ? d3.tmD3Yhdista(ulos) : ulos;
  }
  /* opts.terveysMapa = tmSisainenLataaSeura-tuloksen terveysMapa ({pid: terveys-data}) → pelaajakohtainen opts.terveys. */
  function tmSisainenYhdistaLista(lista, mapa, opts) {
    mapa = mapa || {}; var tm = opts && opts.terveysMapa;
    return (Array.isArray(lista) ? lista : []).map(function (p) { return tmSisainenYhdista(p, p && mapa[p.id], tm ? Object.assign({}, opts, { terveys: p && tm[p.id] }) : opts); });
  }

  /* KIRJOITUSJAKO. A-kentät (kytkettyjen ryhmien top-level-avaimet) menevät sisainen-dokumenttiin. PR 2a: `vainSisainen`-ryhmien (D3) kentät menevät VAIN sinne — ei pelaajadokumenttiin.
     Muiden (tulevien) A-ryhmien kentät dual-writena pelaajadokumenttiin siirtymän ajan, paitsi opts.pelaajaIlmanA (PR 2). */
  function tmSisainenJaa(payload, opts) {
    opts = opts || {}; payload = payload || {};
    var a = tmSisainenKentat(opts), vain = tmSisainenVainSisaiset(opts), pelaaja = {}, sis = {}, onA = false;
    Object.keys(payload).forEach(function (k) {
      if (a.indexOf(k) >= 0) { sis[k] = payload[k]; onA = true; if (!opts.pelaajaIlmanA && vain.indexOf(k) < 0) pelaaja[k] = payload[k]; }
      else pelaaja[k] = payload[k];
    });
    if (onA && opts.seuraId) sis.seuraId = opts.seuraId;
    if (onA) sis.paivitetty = opts.nytISO || new Date().toISOString();
    return { pelaaja: pelaaja, sisainen: onA ? sis : null };
  }

  /* Kirjoitus: YKSI batch (kaikki tai ei mitään). Jos Rules ei vielä salli sisainen-kirjoitusta (deploy-järjestys), kirjoitetaan vanhaan kenttään (authoritatiivinen siirtymässä)
     ja kerrotaan se (sisainenOhitettu + console.warn) — ei hiljaista virhettä. deps: { writeBatch? (oletus db.batch()), nytISO }. → Promise<{ ok, sisainenOhitettu, jaettu }> */
  function tmSisainenKirjoita(db, sid, pid, payload, deps) {
    deps = deps || {};
    var o = { seuraId: sid, nytISO: deps.nytISO, ryhmat: deps.ryhmat }, j = tmSisainenJaa(payload, o), pel = db.collection('seurat').doc(sid).collection('pelaajat').doc(pid), vain = tmSisainenVainSisaiset(o);
    var onVainSis = !!j.sisainen && Object.keys(payload || {}).some(function (k) { return vain.indexOf(k) >= 0; }), pelaajaTyhja = Object.keys(j.pelaaja).length === 0;
    function yksin() { return pel.set(j.pelaaja, { merge: true }); }
    if (!j.sisainen) return yksin().then(function () { return { ok: true, sisainenOhitettu: false, jaettu: j }; });
    var sref = pel.collection(ALIKOKOELMA).doc(DOKUMENTTI);
    /* PR 2a: vain sisainen-kentät (D3) → YKSI set sisainen/tiedot:iin; vanhaan pelaajakenttään ei kirjoiteta eikä permission-denied-varapolkua ole (Rules v3.66 on deployattu; virhe heitetään → näkyvä toast). */
    if (pelaajaTyhja) return sref.set(j.sisainen, { merge: true }).then(function () { return { ok: true, sisainenOhitettu: false, jaettu: j }; });
    var b = db.batch(); b.set(pel, j.pelaaja, { merge: true }); b.set(sref, j.sisainen, { merge: true });
    return b.commit().then(function () { return { ok: true, sisainenOhitettu: false, jaettu: j }; }, function (e) {
      if (e && e.code === 'permission-denied' && deps.varapolku !== false && !onVainSis) {
        console.warn('[tm_sisainen] sisainen/tiedot ei kirjoitettavissa (Rules v3.66 ei vielä käytössä?) — tallennettu vanhaan kenttään:', e.message);
        return yksin().then(function () { return { ok: true, sisainenOhitettu: true, jaettu: j }; });
      }
      throw e;
    });
  }

  /* PR 1b-2 — JAKSOFOKUKSEN OSAPÄIVITYSTEN dual-write (dot-polut: tmPaivitaJaksofokus.polut). `jaksofokus.<A-alikenttä>[.…]` polut kopioidaan sisainen/tiedot.jaksofokus_sisainen.<A>[.…] -sisäkkäiseksi set-merge-olioksi
     (Firestore set+merge yhdistää kartat syvästi; FieldValue.delete() sentinel kulkee mukana). B/C-polut (osa_arviot, tukitavoitteet, tila…) ja kokonaisen `jaksofokus`-olion kirjoitukset (1b-3) EIVÄT kuulu tähän.
     Lippu: RYHMAT.jaksofokus_sisainen.kirjoitus (oletus false → kirjoitus täsmälleen kuten ennen; kytketään marraskuussa). deps.kirjoitus ohittaa (testit); deps.pelaajaIlmanA = PR 2 -tila (A-polut vain sisainen:iin). */
  function tmJaksofokusPolutJaa(polut) {
    var pelaaja = {}, sis = {}, onA = false;
    Object.keys(polut || {}).forEach(function (k) {
      var osat = k.split('.'), a = osat[0] === 'jaksofokus' ? osat[1] : null;
      if (a && JAKSOFOKUS_A.indexOf(a) >= 0) {
        onA = true; var kohde = sis, i; for (i = 1; i < osat.length - 1; i++) { if (!_olio(kohde[osat[i]])) kohde[osat[i]] = {}; kohde = kohde[osat[i]]; }
        kohde[osat[osat.length - 1]] = polut[k];
      } else pelaaja[k] = polut[k];
    });
    return { pelaajaPolut: pelaaja, sisainen: onA ? { jaksofokus_sisainen: sis } : null };
  }
  function _jfKirjoitusPaalla(deps) { if (deps && deps.kirjoitus !== undefined && deps.kirjoitus !== null) return !!deps.kirjoitus; var r = _ryhmat(deps).jaksofokus_sisainen; return !!(r && r.kirjoitus); }
  /* → Promise<{ ok, sisainen, sisainenOhitettu }>. Lippu pois / ei A-polkuja → pelkkä pelaajadokumentin osapäivitys (kuten ennen). Muuten YKSI batch (pelaajan osapäivitys + sisainen set-merge);
     permission-denied (Rules v3.68 ei käytössä) → vanha kenttä yksin + varoitus, paitsi pelaajaIlmanA-tilassa (heittää → näkyvä virhe). */
  function tmJaksofokusKirjoita(db, sid, pid, polut, deps) {
    deps = deps || {}; var pel = db.collection('seurat').doc(sid).collection('pelaajat').doc(pid), j = _jfKirjoitusPaalla(deps) ? tmJaksofokusPolutJaa(polut) : { pelaajaPolut: polut, sisainen: null };
    function yksin(ohitettu) { return pel.update(polut).then(function () { return { ok: true, sisainen: false, sisainenOhitettu: !!ohitettu }; }); }
    if (!j.sisainen) return yksin(false);
    var sref = pel.collection(ALIKOKOELMA).doc(DOKUMENTTI), data = Object.assign({ seuraId: sid, paivitetty: deps.nytISO || new Date().toISOString() }, j.sisainen), pelPolut = deps.pelaajaIlmanA ? j.pelaajaPolut : polut, b = db.batch();
    if (Object.keys(pelPolut).length) b.update(pel, pelPolut);
    b.set(sref, data, { merge: true });
    return b.commit().then(function () { return { ok: true, sisainen: true, sisainenOhitettu: false }; }, function (e) {
      if (e && e.code === 'permission-denied' && !deps.pelaajaIlmanA && deps.varapolku !== false) { console.warn('[tm_sisainen] sisainen/tiedot ei kirjoitettavissa (Rules v3.68 ei vielä käytössä?) — tallennettu vanhaan kenttään:', e.message); return yksin(true); }
      throw e;
    });
  }

  /* PR 1b-3 — JAKSON ELINKAARI: kokonaisen `jaksofokus`-olion kirjoitus (aloitus / vaihto / sulku / katselmus / hylkäys) + `jaksofokus_historia`-rivien lisäys → sisainen/tiedot (dual-write, sama lippu kuin 1b-2).
     · jaksofokus_sisainen KORVATAAN kokonaan (mergeFields): uuden jakson A-osat; ei A-osia tai jaksofokus null (sulku ilman uutta) → kenttä poistetaan (FieldValue.delete) — edellisen jakson A-osat eivät jää sisainen:iin voittamaan dual-readissa.
       Mukana leima jakso_avain (tmJaksoAvain) vanhojen asiakkaiden varalle (ks. tmJaksofokusYhdista).
     · historia_sisainen.<avain>: lisätyn rivin A-osa (rivi kerrallaan, mergeFields-polku) — vanhat rivit eivät kosketa.
     · Pelaajadokumentti kirjoitetaan täsmälleen kuten ennen (upd annetaan valmiina; sisältää jaksofokus + arrayUnion). EI pelaajaIlmanA-tilaa (arrayUnion-rivejä ei voi jälkikäteen riisua) — PR 2 tekee tämän.
     v = { jaksofokus (olio|null; avain PAKKO olla mukana), historiaLisays[] } · deps = { FV (FieldValue; oletus firebase.firestore.FieldValue), kirjoitus (ohittaa lipun), nytISO, ryhmat, varapolku, taydenna(batch) (lisäoperaatiot samaan batchiin, esim. reviewit/{pvm}) }. */
  function tmJaksofokusElinkaariSisainen(sid, v, deps) {
    deps = deps || {}; if (!_olio(v) || !('jaksofokus' in v)) return null;
    var FV = deps.FV || (root && root.firebase && root.firebase.firestore && root.firebase.firestore.FieldValue) || null;
    var data = { seuraId: sid, paivitetty: deps.nytISO || new Date().toISOString() }, kentat = ['seuraId', 'paivitetty'], jaa = tmJaksofokusJaa(v.jaksofokus), ja = tmJaksoAvain(v.jaksofokus);
    if (jaa.sisainen) data.jaksofokus_sisainen = ja ? Object.assign({ jakso_avain: ja }, jaa.sisainen) : jaa.sisainen;
    else { if (!FV || typeof FV.delete !== 'function') throw new Error('tm_sisainen: FieldValue.delete puuttuu (deps.FV)'); data.jaksofokus_sisainen = FV.delete(); }
    kentat.push('jaksofokus_sisainen');
    (Array.isArray(v.historiaLisays) ? v.historiaLisays : []).forEach(function (rivi) {
      var j = tmHistoriaJaa(rivi); if (!j.avain || !j.sisainen || /[~*\/\[\]]/.test(j.avain) || j.avain.charAt(0) === '.' || j.avain.charAt(j.avain.length - 1) === '.') return;   // ei A-osaa / ei avainta (migraatio-luokka "ilman_avainta") / kelvoton kenttäpolku
      if (!_olio(data.historia_sisainen)) data.historia_sisainen = {};
      data.historia_sisainen[j.avain] = j.sisainen; kentat.push('historia_sisainen.' + j.avain);
    });
    return { data: data, mergeFields: kentat };
  }
  /* → Promise<{ ok, sisainen, sisainenOhitettu }>. Lippu pois → pelaajadokumentti kuten ennen (update, tai batch jos taydenna). Lippu päällä → YKSI batch (pelaaja + sisainen set mergeFields + taydenna);
     permission-denied (Rules v3.68 ei käytössä) → uusi batch ilman sisainen:iä (vanha polku) + varoitus. Muu virhe heitetään. */
  function tmJaksofokusElinkaariKirjoita(db, sid, pid, upd, v, deps) {
    deps = deps || {}; var pel = db.collection('seurat').doc(sid).collection('pelaajat').doc(pid), s = _jfKirjoitusPaalla(deps) ? tmJaksofokusElinkaariSisainen(sid, v, deps) : null, taydenna = typeof deps.taydenna === 'function' ? deps.taydenna : null;
    var h = tmHenkilokuntaOsa(sid, upd, deps);   // PR 1c-3: upd:n henkilokunta-kentät (review_viimeisin_*, vastuuhenkilo …) samaan sisainen-kirjoitukseen
    if (h) s = s ? { data: Object.assign({}, s.data, h.data), mergeFields: s.mergeFields.concat(h.mergeFields.filter(function (x) { return s.mergeFields.indexOf(x) < 0; })) } : h;
    function ilman(ohitettu) {
      if (!taydenna) return pel.update(upd).then(function () { return { ok: true, sisainen: false, sisainenOhitettu: !!ohitettu }; });
      var b = db.batch(); b.update(pel, upd); taydenna(b); return b.commit().then(function () { return { ok: true, sisainen: false, sisainenOhitettu: !!ohitettu }; });
    }
    if (!s) return ilman(false);
    var b = db.batch(); b.update(pel, upd); b.set(pel.collection(ALIKOKOELMA).doc(DOKUMENTTI), s.data, { mergeFields: s.mergeFields }); if (taydenna) taydenna(b);
    return b.commit().then(function () { return { ok: true, sisainen: true, sisainenOhitettu: false }; }, function (e) {
      if (e && e.code === 'permission-denied' && deps.varapolku !== false) { console.warn('[tm_sisainen] sisainen/tiedot ei kirjoitettavissa (Rules v3.68 ei vielä käytössä?) — tallennettu vanhaan kenttään:', e.message); return ilman(true); }
      throw e;
    });
  }

  /* PR 1c-1 — HENKILÖKUNNAN KENTÄT (S2): top-level-kenttien kirjoitus. tmHenkilokuntaOsa poimii päivitysoliosta (`upd`, sellaisenaan pelaajadokumentin päivitysolio) henkilokunta-ryhmän kentät → { data, mergeFields } | null
     (lippu pois / ei kenttiä → null). mergeFields KORVAA kentän kokonaan (map-kentät: vastuuhenkilo, tukitarve, talentti_ehdotus) ja välittää FieldValue.delete-sentinellin sellaisenaan. Pelaajadokumentti kirjoitetaan aina täsmälleen kuten ennen (dual-write).
     tmHenkilokuntaKirjoita: YKSI batch (pelaajan päivitys + sisainen set mergeFields + taydenna); permission-denied (Rules v3.69 ei käytössä) → uusi batch ilman sisainen:iä + console.warn. deps: { henkilokuntaKirjoitus, nytISO, taydenna(batch), varapolku, ryhmat }. */
  /* PR 1e-1 (S4) — JAETUT ARVOT. signaali: talenttisignaalit (xfactor/hidden …) vain henkilökunnalle, 'phv' jää pelaajadokumenttiin (P7 _signaaliLabel). Ei kirjoittajia → migraatio tekee jaon; lukijat saavat yhdistetyn muodon (sisainen voittaa lipun ollessa päällä).
     havainto_porras_ehdotus {valmis, seuraava, hist}: pelaaja näkee vain sanatilan (P7 lukee hist.length) → hist (≤3 raakapistettä) sisainen:iin `havainto_porras_hist`, pelaajalle { valmis, seuraava, hist_n }. */
  var SIGNAALI_SISAINEN = ['xfactor', 'x-factor', 'hidden-gem', 'hidden'];
  function tmSignaaliJaa(arvo) { var a = typeof arvo === 'string' ? arvo.trim().toLowerCase() : arvo; return SIGNAALI_SISAINEN.indexOf(a) >= 0 ? { pelaaja: null, sisainen: arvo } : { pelaaja: arvo === undefined ? null : arvo, sisainen: null }; }
  function tmPorrasEhdotusJaa(e) {
    if (!_olio(e)) return { pelaaja: e === undefined ? null : e, hist: null };
    var hist = Array.isArray(e.hist) ? e.hist.slice() : null, pel = Object.assign({}, e); delete pel.hist; pel.hist_n = hist ? hist.length : (typeof e.hist_n === 'number' ? e.hist_n : 0);
    return { pelaaja: pel, hist: hist };
  }
  /* PR 1e-1 (S4): sama kirjoitusapuri-nelikko kahdelle erilliselle lipulle — henkilokunta (oma lippu) ja S4 (RYHMAT.s4.kirjoitus). kentatFn(deps) → kentät, paallaFn(deps) → lippu päällä? */
  function _erillinen(kentatFn, paallaFn, dok, seuraAvain, syvaFn) {
    dok = dok || DOKUMENTTI; seuraAvain = seuraAvain || 'seuraId';
    function osa(sid, upd, deps) {
      deps = deps || {}; if (!paallaFn(deps) || !_olio(upd)) return null;
      var lahde = _olio(deps.lisa) ? Object.assign({}, upd, deps.lisa) : upd, syva = syvaFn ? syvaFn(deps) : [];   // PR 1e-3a: deps.lisa = vain sisainen-kentät (ei pelaajadokumenttiin), esim. havainto_porras_hist
      var kentat = kentatFn(deps).filter(function (k) { return lahde[k] !== undefined; });
      if (!kentat.length) return null;
      var data = { paivitetty: deps.nytISO || new Date().toISOString() }; data[seuraAvain] = sid; var polut = [seuraAvain, 'paivitetty'];
      kentat.forEach(function (k) {
        var v = lahde[k];
        /* syvä kenttä (arviointi_havaittu): pelaajadokumentin set+merge yhdistää avainkohtaisesti → sisainen-puolella pistepolku k.avain, ei koko kartan korvausta (muut avaimet säilyvät). Null / ei-olio → koko kenttä. */
        if (syva.indexOf(k) >= 0 && _olio(v) && Object.keys(v).length) { data[k] = {}; Object.keys(v).forEach(function (a) { if (/^[^.~*\/\[\]]+$/.test(a)) { data[k][a] = v[a]; polut.push(k + '.' + a); } }); }
        else { data[k] = v; polut.push(k); }
      });
      return { data: data, mergeFields: polut };
    }
    /* deps.pelaajaSet = true: pelaajadokumentti kirjoitetaan set-mergenä (kuten vanhat kirjoittajat: IDP-pikakentät, scout, talentti_ehdotus — syvä yhdistys säilyy), muuten update. Tyhjä upd → pelaajaa ei kirjoiteta (vain taydenna). */
    function kirjoita(db, sid, pid, upd, deps) {
      deps = deps || {}; var pel = db.collection('seurat').doc(sid).collection('pelaajat').doc(pid), s = osa(sid, upd, deps), taydenna = typeof deps.taydenna === 'function' ? deps.taydenna : null, onUpd = _olio(upd) && Object.keys(upd).length > 0;
      function pelaajaOp(b) { if (!onUpd) return; if (deps.pelaajaSet) b.set(pel, upd, { merge: true }); else b.update(pel, upd); }
      function ilman(ohitettu) {
        var ulos = { ok: true, sisainen: false, sisainenOhitettu: !!ohitettu };
        if (!taydenna && onUpd) return (deps.pelaajaSet ? pel.set(upd, { merge: true }) : pel.update(upd)).then(function () { return ulos; });
        if (!taydenna) return Promise.resolve(ulos);
        var b = db.batch(); pelaajaOp(b); taydenna(b); return b.commit().then(function () { return ulos; });
      }
      if (!s) return ilman(false);
      var b = db.batch(); pelaajaOp(b); b.set(pel.collection(ALIKOKOELMA).doc(dok), s.data, { mergeFields: s.mergeFields }); if (taydenna) taydenna(b);
      return b.commit().then(function () { return { ok: true, sisainen: true, sisainenOhitettu: false }; }, function (e) {
        if (e && e.code === 'permission-denied' && deps.varapolku !== false) { console.warn('[tm_sisainen] sisainen/' + dok + ' ei kirjoitettavissa (Rules v3.69/v3.70 ei vielä käytössä?) — tallennettu vanhaan kenttään:', e.message); return ilman(true); }
        throw e;
      });
    }
    /* Yleiset rakennuspalikat monimutkaisille kirjoituksille (transaktio, oma batch): tmHenkilokuntaLisaa lisää sisainen-kirjoituksen annettuun batchiin/transaktioon (→ true jos lisättiin; lippu pois / ei kenttiä → false);
       tmHenkilokuntaVarapolulla(deps, fn) ajaa fn(mukaan) ensin sisainen mukana (jos lippu päällä) ja permission-denied → uudelleen ilman sitä + console.warn. */
    function lisaa(kohde, db, sid, pid, upd, deps) {
      var s = osa(sid, upd, deps); if (!s) return false;
      kohde.set(db.collection('seurat').doc(sid).collection('pelaajat').doc(pid).collection(ALIKOKOELMA).doc(dok), s.data, { mergeFields: s.mergeFields }); return true;
    }
    function varapolulla(deps, fn) {
      var mukaan = paallaFn(deps || {});
      return Promise.resolve().then(function () { return fn(mukaan); }).catch(function (e) {
        if (mukaan && e && e.code === 'permission-denied' && !(deps && deps.varapolku === false)) { console.warn('[tm_sisainen] sisainen/' + dok + ' ei kirjoitettavissa (Rules v3.69/v3.70 ei vielä käytössä?) — tallennettu vanhaan kenttään:', e.message); return fn(false); }
        throw e;
      });
    }
    /* PR 1e-3a: VAIN sisainen-dokumentti omana kirjoituksenaan (pelaajadokumentti on jo kirjoitettu erikseen: Pikakortin havainto, luontipolut). deps.hiljainen !== false → mikään virhe (permission-denied, verkko) EI heitä:
       kutsujan päätoiminto ei hylkäydy sisainen-osan takia; puuttuva kopio paikataan migraation uudelleenajossa. → Promise<{ ok, sisainen, virhe? }> */
    function vainSisainen(db, sid, pid, upd, deps) {
      deps = deps || {}; var s;
      try { s = osa(sid, upd, deps); } catch (e) { s = null; }
      if (!s) return Promise.resolve({ ok: true, sisainen: false });
      return Promise.resolve().then(function () { return db.collection('seurat').doc(sid).collection('pelaajat').doc(pid).collection(ALIKOKOELMA).doc(dok).set(s.data, { mergeFields: s.mergeFields }); })
        .then(function () { return { ok: true, sisainen: true }; }, function (e) {
          if (deps.hiljainen === false) throw e;
          console.warn('[tm_sisainen] sisainen/' + dok + ' -kopio jäi kirjoittamatta (migraation uudelleenajo paikkaa):', e && (e.code || e.message)); return { ok: false, sisainen: false, virhe: (e && (e.code || e.message)) || 'virhe' };
        });
    }
    return { osa: osa, kirjoita: kirjoita, lisaa: lisaa, varapolulla: varapolulla, vainSisainen: vainSisainen };
  }
  var _HK = _erillinen(tmHenkilokuntaKentat, _hkPaalla), tmHenkilokuntaOsa = _HK.osa, tmHenkilokuntaKirjoita = _HK.kirjoita, tmHenkilokuntaLisaa = _HK.lisaa, tmHenkilokuntaVarapolulla = _HK.varapolulla;
  /* PR 1e-3a: ADAR-pikakenttien kirjoitus. S4-lippu päällä: pelaajalle ehdotus + hist_n (hist säilyy dual-write-ajan: vanha muoto), raakapisteet `havainto_porras_hist` vain sisainen-puolelle (deps.lisa, EI pelaajadokumenttiin).
     Lippu pois → { upd: kentat sellaisenaan, lisa: null } (kirjoitus täsmälleen kuten ennen). Käyttö: var v = tmAdarS4Valmista(kentat, deps); tmS4Kirjoita(db, sid, pid, v.upd, Object.assign({ pelaajaSet: true, lisa: v.lisa }, deps)). */
  function tmAdarS4Valmista(kentat, opts) {
    var e = _olio(kentat) ? kentat.havainto_porras_ehdotus : null;
    if (!_s4Paalla(opts) || !_olio(e) || !Array.isArray(e.hist)) return { upd: kentat, lisa: null };
    var upd = Object.assign({}, kentat); upd.havainto_porras_ehdotus = Object.assign({}, e, { hist_n: e.hist.length });
    return { upd: upd, lisa: { havainto_porras_hist: e.hist.slice() } };
  }
  var _S4 = _erillinen(tmS4TiedotKentat, _s4Paalla, null, null, tmS4SyvaKentat), tmS4Sisainen = _S4.vainSisainen, tmS4Osa = _S4.osa, tmS4Kirjoita = _S4.kirjoita, tmS4Lisaa = _S4.lisaa, tmS4Varapolulla = _S4.varapolulla;
  /* TERVEYS (PR #1137): sama nelikko, oma dokumentti sisainen/terveys + seuraavain terveysSeuraId; sama S4-lippu. Terveyskentät eivät koskaan päädy tmS4*-apurien kautta sisainen/tiedot:iin. */
  var _TV = _erillinen(tmTerveysKentat, _s4Paalla, TERVEYS_DOK, TERVEYS_SEURA), tmTerveysOsa = _TV.osa, tmTerveysKirjoita = _TV.kirjoita, tmTerveysLisaa = _TV.lisaa, tmTerveysVarapolulla = _TV.varapolulla, tmTerveysSisainen = _TV.vainSisainen;
  /* Terveys-lukutapa rooleittain (Rules v3.70): 'seura' = yksi collectionGroup-kysely (where terveysSeuraId == sid); 'pelaajat' = pelaajakohtaiset get:it (valmentaja: vain OMAN joukkueen pelaajat — kutsuja antaa idt); null = ei lue (seurasihteeri, testivastaava …). */
  /* PR 1e-3a: kutsupaikan apuri — lataus-opts roolin mukaan. 'seura' → collectionGroup; 'pelaajat' → kutsujan jo lataamat (oman joukkueen) pelaajat; muut roolit (seurasihteeri, testivastaava, fysiikkavalmentaja …) → {} = terveyttä ei yritetä lukea. */
  function tmTerveysLukuOpts(rooli, lista) {
    var tapa = tmTerveysLuvunTapa(rooli); if (!tapa) return {};
    return { terveysLuku: tapa === 'seura' ? 'seura' : (Array.isArray(lista) ? lista.map(function (p) { return p && p.id; }).filter(Boolean) : []) };
  }
  function tmTerveysLuvunTapa(rooli) { return ['super_admin', 'superadmin', 'vp', 'urheilutoimenjohtaja', 'fysioterapeutti', 'talenttivalmentaja'].indexOf(rooli) >= 0 ? 'seura' : (rooli === 'valmentaja' ? 'pelaajat' : null); }

  /* JOUKKOLATAUS: yksi kysely koko seuralle. Virhe (esim. Rules/indeksi ei vielä käytössä) EI kaada: mapa tyhjä → dual-read käyttää vanhoja kenttiä; virhekoodi palautetaan ja kirjataan. */
  function tmSisainenLataaSeura(db, sid, opts) {
    return Promise.resolve().then(function () { return db.collectionGroup(ALIKOKOELMA).where('seuraId', '==', sid).get(); }).then(function (snap) {
      var mapa = {}; snap.forEach(function (d) { if (d.id === DOKUMENTTI && d.ref && d.ref.parent && d.ref.parent.parent) mapa[d.ref.parent.parent.id] = d.data(); });
      return { mapa: mapa, virhe: null };
    }, function (e) {
      console.warn('[tm_sisainen] joukkolataus epäonnistui — käytetään vanhoja kenttiä:', e && (e.code || e.message));
      return { mapa: {}, virhe: (e && (e.code || e.message)) || 'virhe' };
    }).then(function (r) {
      if (!(opts && opts.terveysLuku)) return r;   // terveyttä ei pyydetty → tulos kuten ennen { mapa, virhe }
      return tmSisainenLataaTerveys(db, sid, opts).then(function (t) { r.terveysMapa = t.mapa; r.terveysVirhe = t.virhe; return r; });
    });
  }
  /* TERVEYS-joukkolataus (PR #1137): vain kun S4-lippu on päällä JA kutsuja pyytää (opts.terveysLuku = tmTerveysLuvunTapa(rooli): 'seura' | [pelaajaId, …]). Lukijalla ilman oikeutta ei yritetä lainkaan (ei turhia permission-denied-kyselyitä).
     Virhe ei kaada: mapa (osittain) tyhjä → dual-read käyttää vanhaa kenttää; virhekoodi palautetaan. → Promise<{ mapa:{pid:data}, virhe }> */
  function tmSisainenLataaTerveys(db, sid, opts) {
    var tapa = opts && opts.terveysLuku; if (!_s4Paalla(opts) || !tapa) return Promise.resolve({ mapa: {}, virhe: null });
    function lokita(e) { console.warn('[tm_sisainen] terveys-lataus epäonnistui — käytetään vanhoja kenttiä:', e && (e.code || e.message)); return (e && (e.code || e.message)) || 'virhe'; }
    if (tapa === 'seura') return Promise.resolve().then(function () { return db.collectionGroup(ALIKOKOELMA).where(TERVEYS_SEURA, '==', sid).get(); }).then(function (snap) {
      var mapa = {}; snap.forEach(function (d) { if (d.id === TERVEYS_DOK && d.ref && d.ref.parent && d.ref.parent.parent) mapa[d.ref.parent.parent.id] = d.data(); }); return { mapa: mapa, virhe: null };
    }, function (e) { return { mapa: {}, virhe: lokita(e) }; });
    if (!Array.isArray(tapa)) return Promise.resolve({ mapa: {}, virhe: null });
    var mapa = {}, virhe = null;
    return Promise.all(tapa.map(function (pid) {
      return Promise.resolve().then(function () { return db.collection('seurat').doc(sid).collection('pelaajat').doc(pid).collection(ALIKOKOELMA).doc(TERVEYS_DOK).get(); }).then(function (d) { if (d && d.exists) mapa[pid] = d.data(); }, function (e) { virhe = lokita(e); });
    })).then(function () { return { mapa: mapa, virhe: virhe }; });
  }

  /* Kätevä: lataa + yhdistä listaan (staff-näkymien alkulataus). Virhe → lista sellaisenaan (vanhat kentät). */
  function tmSisainenLataaJaYhdista(db, sid, lista, opts) {
    return tmSisainenLataaSeura(db, sid, opts).then(function (r) { return tmSisainenYhdistaLista(lista, r.mapa, r.terveysMapa ? Object.assign({}, opts, { terveysMapa: r.terveysMapa }) : opts); });
  }

  var API = { tmSisainenLataaJaYhdista: tmSisainenLataaJaYhdista, ALIKOKOELMA: ALIKOKOELMA, DOKUMENTTI: DOKUMENTTI, RYHMAT: RYHMAT, tmSisainenKentat: tmSisainenKentat, tmSisainenVainSisaiset: tmSisainenVainSisaiset,
    JAKSOFOKUS_A: JAKSOFOKUS_A, HISTORIA_A: HISTORIA_A, tmHistoriaAvain: tmHistoriaAvain, tmJaksofokusJaa: tmJaksofokusJaa, tmJaksofokusYhdista: tmJaksofokusYhdista, tmHistoriaJaa: tmHistoriaJaa, tmHistoriaYhdista: tmHistoriaYhdista, tmSisainenPolku: tmSisainenPolku, tmSisainenYhdista: tmSisainenYhdista,
    tmSisainenYhdistaLista: tmSisainenYhdistaLista, tmSisainenJaa: tmSisainenJaa, tmSisainenKirjoita: tmSisainenKirjoita, tmJaksofokusPolutJaa: tmJaksofokusPolutJaa, tmJaksofokusKirjoita: tmJaksofokusKirjoita, tmJaksoAvain: tmJaksoAvain, tmHenkilokuntaKentat: tmHenkilokuntaKentat, tmHenkilokuntaOsa: tmHenkilokuntaOsa, tmHenkilokuntaKirjoita: tmHenkilokuntaKirjoita, tmHenkilokuntaLisaa: tmHenkilokuntaLisaa, tmHenkilokuntaVarapolulla: tmHenkilokuntaVarapolulla, tmHenkilokuntaPaalla: _hkPaalla, tmS4Kentat: tmS4Kentat, tmS4TiedotKentat: tmS4TiedotKentat, tmTerveysKentat: tmTerveysKentat, TERVEYS_DOK: TERVEYS_DOK, TERVEYS_SEURA: TERVEYS_SEURA, tmTerveysPolku: tmTerveysPolku, tmTerveysOsa: tmTerveysOsa, tmTerveysKirjoita: tmTerveysKirjoita, tmTerveysLisaa: tmTerveysLisaa, tmTerveysVarapolulla: tmTerveysVarapolulla, tmTerveysLuvunTapa: tmTerveysLuvunTapa, tmSisainenLataaTerveys: tmSisainenLataaTerveys, tmS4Paalla: _s4Paalla, tmS4Sisainen: tmS4Sisainen, tmTerveysSisainen: tmTerveysSisainen, tmTerveysLukuOpts: tmTerveysLukuOpts, tmS4SyvaKentat: tmS4SyvaKentat, tmAdarS4Valmista: tmAdarS4Valmista, tmS4Osa: tmS4Osa, tmS4Kirjoita: tmS4Kirjoita, tmS4Lisaa: tmS4Lisaa, tmS4Varapolulla: tmS4Varapolulla, SIGNAALI_SISAINEN: SIGNAALI_SISAINEN, tmSignaaliJaa: tmSignaaliJaa, tmPorrasEhdotusJaa: tmPorrasEhdotusJaa, tmJaksofokusElinkaariSisainen: tmJaksofokusElinkaariSisainen, tmJaksofokusElinkaariKirjoita: tmJaksofokusElinkaariKirjoita, tmSisainenLataaSeura: tmSisainenLataaSeura };
  if (typeof module !== 'undefined' && module.exports) module.exports = API; else if (root) root.TM_SISAINEN = API;
})(typeof window !== 'undefined' ? window : this);
