/* ════════════════════════════════════════════════════════════════════════
   tm_kt_keskustelu_sheet.js — K4b (erä 84): KEHITYSKESKUSTELU-SHEETIN OHJAIN uudella sivulla (D100). Dual-export: module.exports || window.TM_KT_KESKUSTELU_SHEET.
   Sisältö, validointi ja kirjoitussuunnitelma: lib/tm_kt_keskustelu.js. Kuori on sheet (lib/tm_sheet.js; pitkä = 390 px koko ruutu / työpöydällä dialogi; sulkeminen säilyttää luonnoksen, vain Tallenna tyhjentää).
   LUONNOS (D100 sääntö 3 + PM 21.10.): sheetin muistiluonnos + per pelaaja selaimen tallennukseen (localStorage, try/catch; sivun uudelleenlataus ei hävitä); tyhjennetään tallennuksen / "Hylkää luonnos" -toiminnon jälkeen.
   Kirjoitus: YKSI batch — reviewit/{pvm} (set merge: sovitut_sisainen, kk_*) + pelaajadokumentti (review_viimeisin_pvm / -tyyppi, set merge). Paikallinen tila vasta onnistumisen jälkeen; virhe → toast + sheet auki.
   Kausitavoite: vain VOIMASSA OLEVA tavoite sallii kirjauksen; ehdotus → "odottaa hyväksyntää" + nappi kausitavoite-sheettiin; ei tavoitetta → toimintaohje + "Aseta kauden tavoite".
   tmKtKeskusteluSheet(env) → { avaa(pid), sovitut(v), kausi(v), aseta(), uudelleen(), tallenna() → Promise<{ok, syy}>, sulje() }
     env: { db, sid, doc, t, esc, rooli, superAdmin, sheet (TM_SHEET-hallinta), toast(teksti, tyyppi), nayta(), pelaaja(pid), nimi(p), nimiFn(avain, nimi), avaaKausi(pid), paivitaHistoria(pid, pvm, data), lataaKausi(pid) → Promise<{tavoite, luonnos}> (oletus tmKeLataaKausi),
            nyt():Date, paivaIso(Date), verkossa():boolean, auth():user, FV, virheTeksti(teksti, virhe), varasto (Storage; oletus window.localStorage) }
════════════════════════════════════════════════════════════════════════ */
(function (root) {
  'use strict';
  function _g(nimi, polku) { try { return (typeof module !== 'undefined' && module.exports && typeof require === 'function') ? require(polku) : (root && root[nimi]); } catch (e) { return root && root[nimi]; } }
  var ID = 'keskustelu';
  var FN = { sovitutFn: '_ktKesSovitut', kausiFn: '_ktKesKausi', tallennaFn: '_ktKesTallenna', suljeFn: '_ktKesSulje', asetaFn: '_ktKesAseta', uudelleenFn: '_ktKesUudelleen', raporttiFn: '_avaaPelaajaraportti' };
  function _id(pid) { return ID + '_' + pid; }
  function _paiva(d) { return d.getFullYear() + '-' + String(d.getMonth() + 1).padStart(2, '0') + '-' + String(d.getDate()).padStart(2, '0'); }

  function tmKtKeskusteluSheet(env) {
    env = env || {}; var doc = env.doc || (root && root.document), tila = {};   // tila[pid] = { S, cont, otsikko }
    function L() { return _g('TM_KT_KESKUSTELU', './tm_kt_keskustelu.js'); }
    function _tt(k) { var v = typeof env.t === 'function' ? env.t(k) : k; if (v && v !== k) return v; var F = L() && L().FI; return F && F[k] != null ? F[k] : k; }
    function _lahde() { return (env.superAdmin || ['vp', 'urheilutoimenjohtaja'].indexOf(env.rooli) >= 0) ? 'vp' : 'valmentaja'; }
    function _aktiivinenPid() { var id = env.sheet.avoinna(); return id && id.indexOf(ID + '_') === 0 ? id.slice(ID.length + 1) : null; }
    /* ── selaimen tallennus (luonnos per pelaaja) ── */
    function _varasto() { try { return env.varasto || (root && root.localStorage) || null; } catch (e) { return null; } }
    function _avain(pid) { return 'tm_kes_luonnos:' + (env.sid || '') + ':' + pid; }
    function _talleta(pid) {
      var t = tila[pid], v = _varasto(); if (!t || !v) return;
      try { var S = t.S; if (String(S.sovitut || '') === '' && !S.kausiValinta) v.removeItem(_avain(pid)); else v.setItem(_avain(pid), JSON.stringify({ sovitut: S.sovitut || '', kausi: S.kausiValinta || null, t: new Date().toISOString() })); } catch (e) { /* ei tallennusta: muistiluonnos toimii silti */ }
    }
    function _tyhjenna(pid) { var v = _varasto(); if (!v) return; try { v.removeItem(_avain(pid)); } catch (e) { /* ei */ } }
    function _lue(pid) { var v = _varasto(); if (!v) return null; try { var s = v.getItem(_avain(pid)); var o = s ? JSON.parse(s) : null; return o && typeof o === 'object' ? o : null; } catch (e) { return null; } }

    function _opts(p) { return Object.assign({ esc: env.esc, t: env.t, p: p, nimiFn: env.nimiFn, nyt: env.nyt ? env.nyt() : new Date() }, FN); }
    function _piirra(pid) {
      var t = tila[pid]; if (!t) return; var p = env.pelaaja(pid); if (!p) return;
      t.cont.innerHTML = L().tmKeSheetHTML(t.S, _opts(p));
      if (t.merkkaaMuokatuksi && typeof t.cont.dispatchEvent === 'function' && root && root.Event) { t.merkkaaMuokatuksi = false; t.cont.dispatchEvent(new root.Event('input', { bubbles: true })); }   // palautettu luonnos = muokkaus → sheet säilyttää sen
    }
    function _lataa(pid) {
      var t = tila[pid], p = env.pelaaja(pid); if (!t || !p) return Promise.resolve();
      t.S.lataa = true; t.S.virhe = false;
      var lataus = (typeof env.lataaKausi === 'function') ? Promise.resolve().then(function () { return env.lataaKausi(pid); })
        : ((!env.sid || !env.db) ? Promise.resolve({ tavoite: null, luonnos: null }) : L().tmKeLataaKausi({ db: env.db, sid: env.sid, pid: pid, nyt: env.nyt ? env.nyt() : new Date() }));
      return lataus.then(function (r) { t.S.kausi = L().tmKeKausiTila(r); t.S.lataa = false; if (t.S.kausi.tila === 'voimassa') { var v = _lue(pid); if (v && !t.S.sovitut && !t.S.kausiValinta) { t.S.sovitut = typeof v.sovitut === 'string' ? v.sovitut : ''; t.S.kausiValinta = v.kausi === 'pidetaan' || v.kausi === 'muutetaan' ? v.kausi : null; t.merkkaaMuokatuksi = !!(t.S.sovitut || t.S.kausiValinta); } } _piirra(pid); },
        function (e) { if (typeof console !== 'undefined') console.warn('[keskustelu] kausi:', e && e.message); t.S.lataa = false; t.S.virhe = true; _piirra(pid); });
    }

    function avaa(pid) {
      var p = env.pelaaja(pid), k = L(); if (!p || !k) return Promise.resolve(false);
      if (env.sheet.avoinna() === _id(pid)) return Promise.resolve(true);
      if (tila[pid] && env.sheet.luonnos(_id(pid))) { env.sheet.avaa({ id: _id(pid), tyyppi: 'pitka', otsikko: tila[pid].otsikko, onSulje: tila[pid].onSulje }); return Promise.resolve(true); }   // luonnos säilytetty (D100)
      var S = k.tmKeAlku(p, { nimi: env.nimi ? env.nimi(p) : '', lahde: _lahde() }), cont = doc.createElement('div'), otsikko = _tt('kes_otsikko') + (S.nimi ? ' · ' + S.nimi : '');
      var onSulje = function (likainen) { var x = tila[pid]; if (!likainen && x && x.S.kausi && x.S.kausi.tila === 'voimassa') _tyhjenna(pid); };   // false = tallennettu / hylätty / koskematon → selaintallennus pois
      tila[pid] = { S: S, cont: cont, otsikko: otsikko, onSulje: onSulje, merkkaaMuokatuksi: false };
      _piirra(pid);
      var auki = Promise.resolve(env.sheet.avaa({ id: _id(pid), tyyppi: 'pitka', otsikko: otsikko, sisalto: cont, onSulje: onSulje }));
      return auki.then(function () { return _lataa(pid); }).then(function () { return true; });
    }
    function sovitut(v) {   // ei piirtoa kirjoittaessa (fokus säilyy); tallennusnappi päivittyy
      var pid = _aktiivinenPid(), t = pid && tila[pid]; if (!t) return; t.S.sovitut = String(v || ''); _talleta(pid);
      var b = t.cont.querySelector('[data-kes-tallenna]'); if (b) { var ok = L().tmKeVoiTallentaa(t.S).ok; b.style.opacity = ok ? '' : '.55'; b.setAttribute('aria-disabled', ok ? 'false' : 'true'); }
    }
    function kausi(v) { var pid = _aktiivinenPid(), t = pid && tila[pid]; if (!t) return; t.S.kausiValinta = t.S.kausiValinta === v ? null : (v === 'pidetaan' || v === 'muutetaan' ? v : null); _talleta(pid); t.merkkaaMuokatuksi = true; _piirra(pid); }
    function aseta() { var pid = _aktiivinenPid(); if (pid && typeof env.avaaKausi === 'function') env.avaaKausi(pid); }
    function uudelleen() { var pid = _aktiivinenPid(); if (pid) { _piirra(pid); _lataa(pid); } }
    function sulje() { var pid = _aktiivinenPid(); if (pid) env.sheet.sulje(_id(pid)); }

    function tallenna() {
      var pid = _aktiivinenPid(), t = pid && tila[pid], k = L(); if (!t || t.S.tallentaa) return Promise.resolve({ ok: false, syy: 'ei_lomaketta' });
      var p = env.pelaaja(pid); if (!p) return Promise.resolve({ ok: false, syy: 'ei_pelaajaa' });
      var S = t.S, nyt = env.nyt ? env.nyt() : new Date(), cu0 = (typeof env.auth === 'function' && env.auth()) || {};
      var plan = k.tmKeTallennus(p, S, { pvm: (env.paivaIso || _paiva)(nyt), nytISO: nyt.toISOString(), uid: cu0.uid, rooli: env.rooli, superAdmin: env.superAdmin });
      if (!plan.ok) { env.toast(plan.syy === 'ei_tavoitetta' ? _tt('kes_ohje_ei_tavoitetta') : k.tmKeVirhe(plan.syy, { t: env.t }), 'error'); return Promise.resolve({ ok: false, syy: plan.syy }); }   // validointi ENNEN kirjoitusta; sheet jää auki
      if (typeof env.verkossa === 'function' && !env.verkossa()) { env.toast(_tt('kes_offline'), 'error'); return Promise.resolve({ ok: false, syy: 'offline' }); }
      var lokaali = function () { Object.assign(p, plan.pikakentat); if (typeof env.paivitaHistoria === 'function') env.paivitaHistoria(pid, plan.reviewitPvm, plan.reviewitData); };
      var valmis = function () { env.sheet.tallennettu(_id(pid)); _tyhjenna(pid); delete tila[pid]; if (typeof env.nayta === 'function') env.nayta(); env.toast(_tt('kes_tallennettu'), 'ok'); if (plan.avaaKausi && typeof env.avaaKausi === 'function') env.avaaKausi(pid); return { ok: true }; };
      if (!env.sid || !env.db) { lokaali(); return Promise.resolve(valmis()); }   // demo
      S.tallentaa = true;
      return Promise.resolve().then(function () { var cu = env.auth ? env.auth() : null; return cu ? cu.getIdToken(true) : null; })
        .then(function () {
          var ref = env.db.collection('seurat').doc(env.sid).collection('pelaajat').doc(p.id), batch = env.db.batch();
          batch.set(ref.collection('reviewit').doc(plan.reviewitPvm), plan.reviewitData, { merge: true });
          if (Object.keys(plan.pikakentat).length) batch.set(ref, plan.pikakentat, { merge: true });
          return batch.commit();   // reviewit + rytmi (review_viimeisin_*) kaikki tai ei mitään
        })
        .then(function () { lokaali(); return valmis(); })
        .catch(function (e) { S.tallentaa = false; if (typeof console !== 'undefined') console.warn('[keskustelu]', e && e.message); var tx = _tt('kes_virhe'); env.toast(typeof env.virheTeksti === 'function' ? env.virheTeksti(tx, e) : tx, 'error'); return { ok: false, syy: (e && e.code === 'permission-denied') ? 'oikeudet' : 'tallennus' }; });   // virhe näkyy; sheet auki, syötetty data säilyy
    }
    return { avaa: avaa, sovitut: sovitut, kausi: kausi, aseta: aseta, uudelleen: uudelleen, tallenna: tallenna, sulje: sulje };
  }
  var API = { ID: ID, FN: FN, tmKtKeskusteluSheet: tmKtKeskusteluSheet };
  if (typeof module !== 'undefined' && module.exports) module.exports = API; else if (root) root.TM_KT_KESKUSTELU_SHEET = API;
})(typeof window !== 'undefined' ? window : this);
