/* ════════════════════════════════════════════════════════════════════════
   tm_kalenteri_taytto.js — K35-6a · Täytä viikko -ohjain Masterin kalenterille (mockup 35 §2; D184). Kirjoittaa vain kalenteri-batchilla (Vahvista) ja joukkueet/{id}.pelimuoto-kentän (johto).
   Kaikki riippuvuudet annetaan env-oliossa (Firestore db, rooli, tapahtumat, käännös, renderöinti) → testattavissa mock-Firestorella; Master antaa vain kytkennän.
   Laskenta: tm_viikkopohja.js (tmTaytaViikko/tmMonistaViikko/tmEhdotusDoc/tmPohjaJoukkueelle), näkymä: tm_kalenteri_nakyma.js.
   env: { db, seuraId(), uid(), demo(), joukkue()→nimi|null, joukkueDocit()→[{id,nimi,pelimuoto}] , lataaJoukkueDocit()→Promise, tapahtumat()→[Masterin tapahtumat], pelaajat()→[id], johto()→bool, saaKirjoittaa()→bool,
          ts(pvm,'HH:MM')→Timestamp, palvelinAika()→serverTimestamp, toast(msg,tyyppi), t(fi), rerender(), lataaTapahtumat()→Promise, avaaUusi(pvm), avaaEhdotus(idx) }
   tmKalTayttoLuo(env) → ohjain: { lataa(), tila(maanantai), esikatselu(maanantai), renderoi(maanantai, tapahtumat, C)→{viikko, kortti}, tayta(), monista(), peru(), vahvista(), asetaPelimuoto(pm), poista(idx), paivita(idx, {alkaa,paattyy,paikka}), nollaa() }
   Ei notifikaatiokirjoituksia selaimesta (D192: perheiden viikkoilmoitus tulee palvelimelta, K35-6c). Tauko vain tmOnTauko:n kautta (tm_viikkopohja.js).
   Dual-export: module.exports || window.TM_KALENTERI_TAYTTO.
════════════════════════════════════════════════════════════════════════ */
(function (root) {
  'use strict';
  function _lib(f, g) { try { if (typeof module !== 'undefined' && module.exports && typeof require === 'function') return require(f); } catch (e) { /* selain */ } return (root && root[g]) || {}; }
  function _VP() { return _lib('./tm_viikkopohja.js', 'TM_VIIKKOPOHJA'); }
  function _NA() { return _lib('./tm_kalenteri_nakyma.js', 'TM_KALENTERI_NAKYMA'); }
  function _TY() { return _lib('./tm_kalenteri_tyypit.js', 'TM_KALENTERI_TYYPIT'); }
  function _utc(iso) { var m = /^(\d{4})-(\d{2})-(\d{2})/.exec(String(iso || '')); return m ? Date.UTC(+m[1], +m[2] - 1, +m[3], 12) : null; }
  function _lisaa(iso, vrk) { var u = _utc(iso); if (u == null) return null; var d = new Date(u + vrk * 86400000), z = function (n) { return (n < 10 ? '0' : '') + n; }; return d.getUTCFullYear() + '-' + z(d.getUTCMonth() + 1) + '-' + z(d.getUTCDate()); }
  function _kausi(iso) { var m = /^(\d{4})-(\d{2})/.exec(String(iso || '')); if (!m) return null; var y = +m[1], kk = +m[2]; return kk >= 8 ? y + '-' + String((y + 1) % 100).padStart(2, '0') : (y - 1) + '-' + String(y % 100).padStart(2, '0'); }   // elo–heinä = kausi alkaa elokuussa
  function _vsama(a, b) { return String(a == null ? '' : a).trim().toLowerCase() === String(b == null ? '' : b).trim().toLowerCase(); }

  function tmKalTayttoLuo(env) {
    var data = { ladattu: false, lataa: false, pohjat: [], ks: null }, esik = null, kesken = false;   // kesken: Vahvista käynnissä → nappi disabled, tuplaklikkaus ei luo toista sarjaa
    function _joukkueDoc() { var n = env.joukkue(); if (!n) return null; var d = (env.joukkueDocit() || []).filter(function (x) { return _vsama(x.id, n) || _vsama(x.nimi, n); })[0]; return d || null; }
    function _omat(tap, ma) { var n = env.joukkue(); return tap.filter(function (e) { return e && e.poistettu !== true && (_vsama(e.joukkue, n) || _vsama(e.joukkue_nimi, n)); }); }
    function _viikossa(e, ma) { var p = e.pvm || ''; return p >= ma && p <= _lisaa(ma, 6); }
    function _haeKaytossa(ma) { var TY = _TY(); return _omat(env.tapahtumat() || [], ma).filter(function (e) { return _viikossa(e, ma) && TY.tmKalTyyppiAvain(e.tyyppi) === 'harjoitus' && e.tila !== 'peruttu'; }); }
    async function lataa() {
      if (data.ladattu || data.lataa || env.demo() || !env.seuraId()) return; data.lataa = true;
      try {
        var sRef = env.db.collection('seurat').doc(env.seuraId()), lue = async function (id) { try { var d = await sRef.collection('valmennuslinja').doc(id).get(); return d.exists ? d.data() : null; } catch (e) { return null; } };
        var vp = await lue('viikkopohjat'); data.pohjat = vp && Array.isArray(vp.pohjat) ? vp.pohjat : [];
        data.ks = await lue('kausisuunnitelma_' + (_kausi(env.maanantai()) || ''));
        if (env.lataaJoukkueDocit) await env.lataaJoukkueDocit();
      } catch (e) { /* ei pohjia → kortti kysyy / ei näy */ }
      data.ladattu = true; data.lataa = false; env.rerender();
    }
    function tila(ma) {
      if (env.demo() || !env.joukkue() || !env.saaKirjoittaa()) return null;
      if (esik && esik.maanantai === ma && esik.tulos.ehdotukset.length) return { tyyppi: 'vahvista', n: esik.tulos.ehdotukset.length, lahde: esik.lahde, kesken: kesken };
      if (_haeKaytossa(ma).length) return null;
      if (!data.ladattu) return null;
      var jd = _joukkueDoc(), pohja = _VP().tmPohjaJoukkueelle(data.pohjat, data.ks, jd ? { id: jd.id, pelimuoto: jd.pelimuoto, ikavaihe: jd.ikavaihe, ika: jd.ika, ikaluokka: jd.ikaluokka } : null, ma);
      if (pohja) return { tyyppi: 'tayta', pohjaNimi: pohja.nimi };
      return !jd || !jd.pelimuoto ? { tyyppi: 'pelimuoto', saaAsettaa: !!env.johto() } : { tyyppi: 'ei_pohjaa' };
    }
    function _args(ma) {
      var TY = _TY(), tap = env.tapahtumat() || [], n = env.joukkue(), alku = _lisaa(ma, -1), loppu = _lisaa(ma, 13), hist = _lisaa(ma, -56);
      return { tapahtumat: tap, maanantai: ma, joukkue: n, kohde: { joukkue: n }, pelaajat: env.pelaajat() || [], kokoonpanot: {},
        ottelut: tap.filter(function (e) { return e && e.poistettu !== true && TY.tmKalTyyppiAvain(e.tyyppi) === 'ottelu' && e.tila !== 'peruttu' && (!(e.joukkue || e.joukkue_nimi) || _vsama(e.joukkue, n) || _vsama(e.joukkue_nimi, n)) && e.pvm >= alku && e.pvm <= loppu; }).map(function (e) { return e.pvm; }),
        historia: tap.filter(function (e) { return e && e.poistettu !== true && TY.tmKalTyyppiAvain(e.tyyppi) === 'harjoitus' && (_vsama(e.joukkue, n) || _vsama(e.joukkue_nimi, n)) && e.pvm >= hist && e.pvm < ma; }) };   // historia 8 vk
    }
    function _aseta(ma, tulos, lahde, pohja) { esik = { maanantai: ma, tulos: tulos, lahde: lahde, pohjaAvain: pohja ? pohja.avain : null }; env.rerender(); }
    function _tyhja(tulos) { var oh = (tulos.ohitetut || []).map(function (o) { return o.pvm + ' ' + env.t(o.syy); }).join(', '); env.toast(env.t('Ei uusia ehdotuksia') + (oh ? ' (' + oh + ')' : ''), 'err'); }
    function tayta() {
      var ma = env.maanantai(), jd = _joukkueDoc(), VP = _VP(), pohja = VP.tmPohjaJoukkueelle(data.pohjat, data.ks, jd ? { id: jd.id, pelimuoto: jd.pelimuoto, ikavaihe: jd.ikavaihe, ika: jd.ika, ikaluokka: jd.ikaluokka } : null, ma);
      if (!pohja) { env.toast(env.t('Joukkueelle ei löydy viikkopohjaa.'), 'err'); return; }
      var a = _args(ma); a.pohja = pohja; a.vaihe = VP.tmKausivaihe ? VP.tmKausivaihe(data.ks, ma) : null; var tulos = VP.tmTaytaViikko(a);
      if (!tulos.ehdotukset.length) { _tyhja(tulos); esik = null; return; } _aseta(ma, tulos, 'pohja', pohja);
    }
    function monista() { var ma = env.maanantai(), tulos = _VP().tmMonistaViikko(_args(ma)); if (!tulos.ehdotukset.length) { _tyhja(tulos); return; } _aseta(ma, tulos, 'monista', null); }
    function peru() { esik = null; env.rerender(); }
    function nollaa() { esik = null; }
    function poista(idx) { if (!esik) return; esik.tulos.ehdotukset.splice(idx, 1); if (!esik.tulos.ehdotukset.length) esik = null; env.rerender(); }
    function paivita(idx, p) { if (!esik || !esik.tulos.ehdotukset[idx]) return; var e = esik.tulos.ehdotukset[idx]; ['alkaa', 'paattyy', 'paikka'].forEach(function (k) { if (p && p[k] != null) e[k] = String(p[k]).slice(0, 120); }); env.rerender(); }
    async function vahvista() {
      if (!esik || kesken || env.demo() || !env.saaKirjoittaa() || !env.seuraId()) return; var e0 = esik, VP = _VP(), uid = env.uid();
      kesken = true; env.rerender();   // lippu ensin (synkronisesti) → toinen klikkaus ohitetaan; nappi disabled
      try {
        var col = env.db.collection('seurat').doc(env.seuraId()).collection('kalenteri'), batch = env.db.batch(), era = 'v' + Date.now().toString(36) + Math.random().toString(36).slice(2, 7);   // yksi erä-tunniste koko vahvistukselle (viikkoilmoitus)
        e0.tulos.ehdotukset.forEach(function (e) {
          var x = VP.tmEhdotusDoc(e, { joukkue: env.joukkue(), joukkueId: (_joukkueDoc() || {}).id || null, uid: uid, pohjaAvain: e0.pohjaAvain, pelaajat: env.pelaajat() || [], era: era }), d = x.doc;
          d.alkaa = env.ts(x.pvm, x.alkaa || '00:00'); d.paattyy = env.ts(x.pvm, x.paattyy || x.alkaa || '00:00'); d.luotu = env.palvelinAika(); d.paivitetty = env.palvelinAika();
          batch.set(col.doc(), d);
        });
        await batch.commit(); esik = null; env.toast('✓ ' + e0.tulos.ehdotukset.length + ' ' + env.t('harjoitusta tallennettu'), 'ok'); await env.lataaTapahtumat();
      } catch (err) { env.toast(env.t('Virhe tallennuksessa: ') + (err && err.message), 'err'); }
      finally { kesken = false; env.rerender(); }   // virheessä esikatselu säilyy → voi yrittää uudelleen
    }
    async function asetaPelimuoto(pm) {
      if (!_VP().PELIMUODOT || _VP().PELIMUODOT.indexOf(pm) < 0) return;
      var jd = _joukkueDoc(); if (!env.johto() || !jd || env.demo()) { env.toast(env.t('Pyydä valmennuspäällikköä asettamaan pelimuoto'), 'err'); return; }
      try { await env.db.collection('seurat').doc(env.seuraId()).collection('joukkueet').doc(jd.id).update({ pelimuoto: pm }); jd.pelimuoto = pm; env.toast('✓ ' + pm, 'ok'); env.rerender(); }
      catch (err) { env.toast(env.t('Pyydä valmennuspäällikköä asettamaan pelimuoto'), 'err'); }   // Rules ei salli → ei muuteta Rulesia tässä
    }
    function esikatselu(ma) { return esik && esik.maanantai === ma ? esik.tulos : null; }
    function renderoi(ma, tapahtumat, C) {
      var NA = _NA(), tl = esikatselu(ma), TY = _TY();
      var malli = NA.tmKalViikkoMalli({ tapahtumat: tapahtumat, maanantai: ma, ehdotukset: tl && tl.ehdotukset, paallekkaisyydet: tl && tl.paallekkaisyydet, ohitetut: tl && tl.ohitetut, nyt: C && C.nyt });
      var c = Object.assign({}, C, { on: Object.assign({ ehdotus: function (i) { return env.avaaEhdotus ? '_calTaytto.muokkaa(' + i + ')' : ''; } }, C && C.on) });
      var t = tila(ma), kc = Object.assign({}, c, { on: { tayta: '_calTaytto.tayta()', monista: '_calTaytto.monista()', yksittainen: '_calTaytto.yksittainen()', vahvista: '_calTaytto.vahvista()', peru: '_calTaytto.peru()', pelimuoto: function (pm) { return "_calTaytto.asetaPelimuoto('" + pm + "')"; } } });
      return { viikko: NA.tmKalViikkoHTML(malli, c), kortti: t ? NA.tmKalTaytaKorttiHTML(t, kc) : '', ehdotuksia: malli.ehdotuksia };
    }
    return { lataa: lataa, tila: tila, esikatselu: esikatselu, renderoi: renderoi, tayta: tayta, monista: monista, peru: peru, vahvista: vahvista, asetaPelimuoto: asetaPelimuoto, poista: poista, paivita: paivita, nollaa: nollaa,
      muokkaa: function (i) { if (esik && esik.tulos.ehdotukset[i] && env.avaaEhdotus) env.avaaEhdotus(i, esik.tulos.ehdotukset[i]); }, yksittainen: function () { if (env.avaaUusi) env.avaaUusi(env.maanantai()); }, _data: data };
  }
  var API = { tmKalTayttoLuo: tmKalTayttoLuo, tmKalKausiAvain: _kausi };
  if (typeof module !== 'undefined' && module.exports) module.exports = API; else if (root) root.TM_KALENTERI_TAYTTO = API;
})(typeof window !== 'undefined' ? window : null);
