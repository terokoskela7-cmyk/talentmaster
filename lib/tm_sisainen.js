/* ════════════════════════════════════════════════════════════════════════
   tm_sisainen.js — Vaihe 1 / PR 1a: HENKILÖKUNNAN SISÄISET KENTÄT pois pelaajan luettavasta dokumentista. Dual-export: module.exports || window.TM_SISAINEN.
   Pelaaja ja huoltaja lukevat koko `seurat/{sid}/pelaajat/{pid}`-dokumentin → A-kentät (sisäinen) siirtyvät yhteen staff-only-dokumenttiin:
       seurat/{sid}/pelaajat/{pid}/sisainen/tiedot   (+ kenttä `seuraId` collectionGroup-kyselyä ja Rules-tarkistusta varten)
   SIIRTYMÄ ILMAN KATKOA: dual-write (A-kentät MOLEMPIIN paikkoihin) + dual-read (sisainen voittaa, vanha pelaajakenttä varalla). Vanha Master/Sibbo toimii: jos `sisainen` puuttuu, vanha kenttä luetaan.
   Tässä PR:ssä KYTKETTY vain ryhmä `d3`; muut ryhmät on määritelty rekisteriin (inventaario 22.10.) mutta `kytketty:false` → eivät vaikuta mihinkään ennen omaa viipalettaan.
   · RYHMAT / tmSisainenKentat()          kenttärekisteri (top-level A-kentät ryhmittäin; pistepolut vain dokumentaationa)
   · tmSisainenPolku(sid, pid)            'seurat/{sid}/pelaajat/{pid}/sisainen/tiedot'
   · tmSisainenYhdista(pelaaja, sisainen) dual-read: uusi olio, sisainen voittaa; D3: pelaajan d3_itsearvio → pisteet[dim].pelaaja (tm_d3_itsearvio.js)
   · tmSisainenYhdistaLista(lista, mapa)  sama listalle (mapa = tmSisainenLataaSeura-tulos)
   · tmSisainenJaa(payload, opts)         dual-write: { pelaaja, sisainen } (A-kentät molemmissa; opts.pelaajaIlmanA → PR 2 -tila; sisainen:null jos ei A-kenttiä)
   · tmSisainenKirjoita(db, sid, pid, payload, deps)  batch: pelaajadokumentti + sisainen/tiedot; permission-denied → vain vanha kenttä (sisainenOhitettu, console.warn)
   · tmSisainenLataaJaYhdista(db, sid, lista)  lataus + yhdistys yhdellä kutsulla (Master/VP-kuoren yksi rivi)
   · tmSisainenLataaSeura(db, sid)        YKSI collectionGroup('sisainen').where('seuraId','==',sid) → { mapa:{pid:data}, virhe }  (ei N+1; vaatii indeksin sisainen.seuraId COLLECTION_GROUP)
   Riippuu: lib/tm_d3_itsearvio.js (TM_D3_ITSEARVIO). Pelaaja-/vanhempi-app EI saa ladata tätä tiedostoa (vartija: tests/d3_jako_kirjoittajat.test.js).
════════════════════════════════════════════════════════════════════════ */
(function (root) {
  'use strict';

  var ALIKOKOELMA = 'sisainen', DOKUMENTTI = 'tiedot';

  /* Ryhmät (inventaario 22.10. + PM:n päätökset). kentat: top-level kentät jotka siirtyvät; pistepolut (jaksofokus.…) ovat dokumentaatiota — vain kytkettyjen ryhmien kentät toimivat top-level-avaimina. */
  var RYHMAT = {
    d3: { kytketty: true, kentat: ['d3_viimeisin', 'd3_taso', 'd3_pvm', 'd3_varmuus', 'd3_vp_pvm'] },   // PM: d3_taso/_pvm/_varmuus = A; pelaajan oma osa → d3_itsearvio (B)
    jaksofokus_sisainen: { kytketty: false, kentat: ['jaksofokus.osa_havainnot', 'jaksofokus.osa_havainnot_vk', 'jaksofokus.tavoite_tarkenteet', 'jaksofokus.onnistumiskriteeri', 'jaksofokus.linkitetyt', 'jaksofokus.tavoite_alue', 'jaksofokus.valitavoite_idx', 'jaksofokus.poikkeama', 'jaksofokus.oma_jakso'] },
    historia_sisainen: { kytketty: false, kentat: ['historia_sisainen'] },   // map <alkoi-ISO>_<konsepti_avain>: havainnot_vk, arvio_*, kalibraatio_ero, delta_mitattu, d3_snapshot, sitoumus_snapshot (PM päätös 6)
    staff_paatokset: { kytketty: false, kentat: ['vastuuhenkilo', 'talentti_ehdotus', 'scout_potentiaali', 'scout_potentiaali_taso', 'scout_potentiaali_huomiot', 'scout_potentiaali_pvm', 'scout_potentiaali_arvioija', 'tukitarve', 'signaali'] },
    review: { kytketty: false, kentat: ['review_viimeisin_pvm', 'review_viimeisin_tyyppi', 'review_tagit'] },
    arviointi: { kytketty: false, kentat: ['arviointi_havaittu', 'arviointi_pvm', 'arviointi_kehys', 'arviointi_kooste', 'potentiaali_kooste', 'arviointi_kooste_pvm'] },
    idp_sisainen: { kytketty: false, kentat: ['idp_edistyma', 'idp_lahde', 'idp_viim_review', 'idp_dvi', 'tavoitteet'] },
    adar_sisainen: { kytketty: false, kentat: ['adar_arvioijat', 'adar_arvioijia', 'adar_yhtenevyys', 'adar_yhtenevyys_taso', 'adar_dim_konsensus', 'adar_vahvin', 'adar_tilanne_jakauma', 'adar_vaihe_jakauma', 'adar_otos_jakauma', 'adar_ottelupohja', 'adar_luotettavuus', 'havainto_viimeisin_pvm', 'havainto_porras_ehdotus'] },   // havainto_porras_ehdotus: viipale 1e (+ B adar_uusin_havaintoja)
    kypsyys_sisainen: { kytketty: false, kentat: ['kasvutahti_cm_v', 'kasvutahti_vyohyke', 'maturity_offset', 'kehitysvaihe_kaista', 'kronologinen_ika', 'phv_raaka', 'phv_huom', 'phv_ongelma', 'phv_ilmoitettu_ph', 'phv_ei_mitattu'] },
    perhe: { kytketty: false, kentat: ['isa_pituus_cm', 'aiti_pituus_cm', 'vanhempi_pituus_pvm', 'vanhempi_pituus_puuttuu'] },
    talentti_terveys: { kytketty: false, kentat: ['talenttiOhjelma', 'talenttiTaso', 'talenttiAlku', 'talenttiAktivoi', 'talenttiPaattyi', 'kaytettavyys', 'loukkaantuminen_tyyppi', 'loukkaantuminen_alue', 'loukkaantuminen_pvm', 'paluu_arvio'] },
    tuonti_meta: { kytketty: false, kentat: ['tuoja', 'muokkaajaUid'] }   // korjattu/korjaus = C (PM 22.10.), jää
  };

  function _ryhmat(opts) { return (opts && opts.ryhmat) || RYHMAT; }
  /* Kytkettyjen ryhmien top-level-kentät (pisteellä alkavat polut ohitetaan). */
  function tmSisainenKentat(opts) {
    var r = _ryhmat(opts), ulos = [];
    Object.keys(r).forEach(function (n) { if (r[n].kytketty) r[n].kentat.forEach(function (k) { if (k.indexOf('.') < 0 && ulos.indexOf(k) < 0) ulos.push(k); }); });
    return ulos;
  }
  function tmSisainenPolku(sid, pid) { return 'seurat/' + sid + '/pelaajat/' + pid + '/' + ALIKOKOELMA + '/' + DOKUMENTTI; }

  function _D3() {
    var m = (typeof module !== 'undefined' && module.exports && typeof require === 'function') ? require('./tm_d3_itsearvio.js') : root.TM_D3_ITSEARVIO;
    return m && typeof m.tmD3Yhdista === 'function' ? m : null;
  }

  /* DUAL-READ. sisainen voittaa kentittäin (undefined = ei ole → vanha kenttä varalla). Palauttaa UUDEN olion; syötteet ennallaan. */
  function tmSisainenYhdista(pelaaja, sisainen, opts) {
    var ulos = Object.assign({}, pelaaja || {});
    if (sisainen && typeof sisainen === 'object') tmSisainenKentat(opts).forEach(function (k) { if (sisainen[k] !== undefined) ulos[k] = sisainen[k]; });
    var d3 = _D3(); return d3 ? d3.tmD3Yhdista(ulos) : ulos;
  }
  function tmSisainenYhdistaLista(lista, mapa, opts) {
    mapa = mapa || {};
    return (Array.isArray(lista) ? lista : []).map(function (p) { return tmSisainenYhdista(p, p && mapa[p.id], opts); });
  }

  /* DUAL-WRITE. A-kentät (kytkettyjen ryhmien top-level-avaimet) menevät sisainen-dokumenttiin; pelaajadokumenttiin kaikki (siirtymän ajan), paitsi opts.pelaajaIlmanA (PR 2). */
  function tmSisainenJaa(payload, opts) {
    opts = opts || {}; payload = payload || {};
    var a = tmSisainenKentat(opts), pelaaja = {}, sis = {}, onA = false;
    Object.keys(payload).forEach(function (k) {
      if (a.indexOf(k) >= 0) { sis[k] = payload[k]; onA = true; if (!opts.pelaajaIlmanA) pelaaja[k] = payload[k]; }
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
    var j = tmSisainenJaa(payload, { seuraId: sid, nytISO: deps.nytISO, ryhmat: deps.ryhmat }), pel = db.collection('seurat').doc(sid).collection('pelaajat').doc(pid);
    function yksin() { return pel.set(j.pelaaja, { merge: true }); }
    if (!j.sisainen) return yksin().then(function () { return { ok: true, sisainenOhitettu: false, jaettu: j }; });
    var b = db.batch(); b.set(pel, j.pelaaja, { merge: true }); b.set(pel.collection(ALIKOKOELMA).doc(DOKUMENTTI), j.sisainen, { merge: true });
    return b.commit().then(function () { return { ok: true, sisainenOhitettu: false, jaettu: j }; }, function (e) {
      if (e && e.code === 'permission-denied' && deps.varapolku !== false) {
        console.warn('[tm_sisainen] sisainen/tiedot ei kirjoitettavissa (Rules v3.66 ei vielä käytössä?) — tallennettu vanhaan kenttään:', e.message);
        return yksin().then(function () { return { ok: true, sisainenOhitettu: true, jaettu: j }; });
      }
      throw e;
    });
  }

  /* JOUKKOLATAUS: yksi kysely koko seuralle. Virhe (esim. Rules/indeksi ei vielä käytössä) EI kaada: mapa tyhjä → dual-read käyttää vanhoja kenttiä; virhekoodi palautetaan ja kirjataan. */
  function tmSisainenLataaSeura(db, sid) {
    return Promise.resolve().then(function () { return db.collectionGroup(ALIKOKOELMA).where('seuraId', '==', sid).get(); }).then(function (snap) {
      var mapa = {}; snap.forEach(function (d) { if (d.id === DOKUMENTTI && d.ref && d.ref.parent && d.ref.parent.parent) mapa[d.ref.parent.parent.id] = d.data(); });
      return { mapa: mapa, virhe: null };
    }, function (e) {
      console.warn('[tm_sisainen] joukkolataus epäonnistui — käytetään vanhoja kenttiä:', e && (e.code || e.message));
      return { mapa: {}, virhe: (e && (e.code || e.message)) || 'virhe' };
    });
  }

  /* Kätevä: lataa + yhdistä listaan (staff-näkymien alkulataus). Virhe → lista sellaisenaan (vanhat kentät). */
  function tmSisainenLataaJaYhdista(db, sid, lista, opts) {
    return tmSisainenLataaSeura(db, sid).then(function (r) { return tmSisainenYhdistaLista(lista, r.mapa, opts); });
  }

  var API = { tmSisainenLataaJaYhdista: tmSisainenLataaJaYhdista, ALIKOKOELMA: ALIKOKOELMA, DOKUMENTTI: DOKUMENTTI, RYHMAT: RYHMAT, tmSisainenKentat: tmSisainenKentat, tmSisainenPolku: tmSisainenPolku, tmSisainenYhdista: tmSisainenYhdista,
    tmSisainenYhdistaLista: tmSisainenYhdistaLista, tmSisainenJaa: tmSisainenJaa, tmSisainenKirjoita: tmSisainenKirjoita, tmSisainenLataaSeura: tmSisainenLataaSeura };
  if (typeof module !== 'undefined' && module.exports) module.exports = API; else if (root) root.TM_SISAINEN = API;
})(typeof window !== 'undefined' ? window : this);
