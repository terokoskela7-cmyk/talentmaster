/* ════════════════════════════════════════════════════════════════════════
   tm_kt_hylkaa.js — kehitystyöpöytä K3a (inventaario #2): HYLKÄÄ VALINTA SHEETINÄ uudella sivulla (D100). Dual-export: module.exports || window.TM_KT_HYLKAA.
   Sama sisältö, validointi ja kirjoitus kuin Masterin/VP:n "Hylkää valinta" -ruudussa (lib/tm_kevyt_katselmus.js: tmHylkaaAlku / tmHylkaaSheetHTML / tmHylkaaTallennus + lib/tm_reitin_valinta.js tmTarjousOsioHTML);
   vain kuori on sheet (lib/tm_sheet.js; pitkä = 390 px koko ruutu / työpöydällä dialogi; sulkeminen säilyttää luonnoksen, vain tallennus tyhjentää).
   Tila 'valinta_tehty' (pelaaja on valinnut, valmentaja ei ole vielä vahvistanut): hylkäys palauttaa pelaajan valintatilaan ja tarjoaa uudet vaihtoehdot (kortit esitäytetty nykyisillä, muutettavissa).
   Vaihe 0 -kytkin "Näytä myös pelaajalle" (oletus POIS): perustelu kirjoitetaan pelaajan luettavaan jaksofokus.hylatty.perustelu-kenttään vain kun kytkin on päällä; muuten sitä ei kerätä eikä tallenneta pelaajan luettavaan paikkaan.
   Kirjoitus: YKSI update (jaksofokus + ydinvahvuus_valinta delete), paikallinen tila vasta onnistumisen jälkeen; virhe → toast + sheet auki (syötetty data säilyy).
   tmKtHylkaaSheet(env) → { avaa(pid) → Promise<boolean>, perustelu(v), nayta(b), k3Valitse(i), k3Lause(i, v), tallenna() → Promise<{ok, syy}>, sulje() }
     env: { db, sid, doc, t, esc, sheet (TM_SHEET-hallinta), toast(teksti, tyyppi), nayta(), pelaaja(pid), nimi(p), ehdotukset(p) → [K3-kortti], nyt():Date, paivaIso(Date), verkossa():boolean, auth():user, FV (firebase.firestore.FieldValue), virheTeksti(teksti, virhe) }
════════════════════════════════════════════════════════════════════════ */
(function (root) {
  'use strict';
  function _g(nimi, polku) { try { return (typeof module !== 'undefined' && module.exports && typeof require === 'function') ? require(polku) : (root && root[nimi]); } catch (e) { return root && root[nimi]; } }
  var ID = 'hylkaa';
  function _id(pid) { return ID + '_' + pid; }
  function _paiva(d) { return d.getFullYear() + '-' + String(d.getMonth() + 1).padStart(2, '0') + '-' + String(d.getDate()).padStart(2, '0'); }

  function tmKtHylkaaSheet(env) {
    env = env || {}; var doc = env.doc || (root && root.document), tila = {};   // tila[pid] = { S, cont, otsikko }
    function K() { return _g('TM_KEVYT_KATSELMUS', './tm_kevyt_katselmus.js'); }
    function RV() { return _g('TM_REITIN_VALINTA', './tm_reitin_valinta.js'); }
    function _kortit(p) { try { var x = typeof env.ehdotukset === 'function' ? env.ehdotukset(p) : []; return Array.isArray(x) ? x : []; } catch (e) { if (typeof console !== 'undefined') console.warn('[hylkaa] ehdotukset:', e && e.message); return []; } }
    function _aktiivinenPid() { var id = env.sheet.avoinna(); return id && id.indexOf(ID + '_') === 0 ? id.slice(ID.length + 1) : null; }
    function _html(S) {
      var k = K(), opts = { esc: env.esc, t: env.t, lauseFn: '_ktHkPerustelu', naytaFn: '_ktHkNayta', tallennaFn: '_ktHkTallenna', suljeFn: '_ktHkSulje', k3: { paalleFn: '_ktHkK3Paalle', valitseFn: '_ktHkK3Valitse', lauseFn: '_ktHkK3Lause' }, pinta: 'var(--bg2)', modalId: '_ktHylkaaLomake' };
      var tmp = doc.createElement('div'); tmp.innerHTML = k.tmHylkaaSheetHTML(S, opts); var laatikko = tmp.firstChild && tmp.firstChild.firstChild; if (!laatikko) return { otsikko: '', laatikko: null };
      var ot = laatikko.firstChild, otsikko = ot ? (ot.querySelector('[data-hk-otsikko]') || ot).textContent : ''; if (ot) laatikko.removeChild(ot);   // otsikko + × siirtyvät sheetin yläriville
      laatikko.style.cssText = 'color:var(--ink)';
      return { otsikko: otsikko, laatikko: laatikko };
    }
    function _piirra(pid) {
      var t = tila[pid]; if (!t) return; var h = _html(t.S); if (!h.laatikko) return;
      while (t.cont.firstChild) t.cont.removeChild(t.cont.firstChild); t.cont.appendChild(h.laatikko);
      if (typeof t.cont.dispatchEvent === 'function' && root && root.Event) t.cont.dispatchEvent(new root.Event('input', { bubbles: true }));   // muokkaus → sheet säilyttää luonnoksen
    }

    function avaa(pid) {
      var p = env.pelaaja(pid), k = K(), rv = RV(); if (!p || !k || !rv) return Promise.resolve(false);
      var r = rv.tmHenkRivitila(p);
      if (!p.jaksofokus || p.jaksofokus.tila !== 'valittavana' || !r || r.tila !== 'valittu') { env.toast(k.FI.hk_virhe_ei_valintaa, 'error'); return Promise.resolve(false); }   // sama ehto kuin Masterissa
      if (env.sheet.avoinna() === _id(pid)) return Promise.resolve(true);
      if (tila[pid] && env.sheet.luonnos(_id(pid))) { env.sheet.avaa({ id: _id(pid), tyyppi: 'pitka', otsikko: tila[pid].otsikko }); return Promise.resolve(true); }   // luonnos säilytetty (D100)
      var S = k.tmHylkaaAlku(p, { nimi: env.nimi ? env.nimi(p) : '', ehdotukset: _kortit(p), kytkin: true }), cont = doc.createElement('div'); tila[pid] = { S: S, cont: cont, otsikko: '' };
      var h = _html(S); if (!h.laatikko) return Promise.resolve(false); cont.appendChild(h.laatikko); tila[pid].otsikko = h.otsikko;
      return Promise.resolve(env.sheet.avaa({ id: _id(pid), tyyppi: 'pitka', otsikko: h.otsikko, sisalto: cont })).then(function () { return true; });
    }
    function perustelu(v) { var pid = _aktiivinenPid(), t = pid && tila[pid]; if (t) t.S.perustelu = String(v || ''); }   // ei piirtoa kirjoittaessa (fokus säilyy)
    function nayta(b) { var pid = _aktiivinenPid(), t = pid && tila[pid]; if (!t) return; t.S.nayta = b === true; _piirra(pid); }   // vaihe 0: oletus pois
    function k3Valitse(i) { var pid = _aktiivinenPid(), t = pid && tila[pid], kortti = t && t.S.k3.kortit[i]; if (!kortti) return; kortti.valittu = !kortti.valittu; _piirra(pid); }
    function k3Lause(i, v) { var pid = _aktiivinenPid(), t = pid && tila[pid], kortti = t && t.S.k3.kortit[i]; if (kortti) kortti.lause = String(v || ''); }
    function sulje() { var pid = _aktiivinenPid(); if (pid) env.sheet.sulje(_id(pid)); }

    function tallenna() {
      var pid = _aktiivinenPid(), t = pid && tila[pid], k = K(); if (!t || t.S.tallentaa) return Promise.resolve({ ok: false, syy: 'ei_lomaketta' });
      var p = env.pelaaja(pid); if (!p) return Promise.resolve({ ok: false, syy: 'ei_pelaajaa' });
      var S = t.S, nyt = env.nyt ? env.nyt() : new Date(), plan = k.tmHylkaaTallennus(p, S, { pvm: (env.paivaIso || _paiva)(nyt) });
      if (!plan.ok) { env.toast(k.tmHylkaaVirhe(plan.syy, { t: env.t }), 'error'); return Promise.resolve({ ok: false, syy: plan.syy }); }   // validointi ENNEN kirjoitusta; sheet jää auki
      if (typeof env.verkossa === 'function' && !env.verkossa()) { env.toast(env.t('Tallennus ei onnistunut, koska verkkoyhteys puuttuu. Yritä uudelleen, kun yhteys palaa.'), 'error'); return Promise.resolve({ ok: false, syy: 'offline' }); }
      var lokaali = function () { p.jaksofokus = plan.jaksofokus; delete p.ydinvahvuus_valinta; };
      var valmis = function () { env.sheet.tallennettu(_id(pid)); delete tila[pid]; if (typeof env.nayta === 'function') env.nayta(); env.toast(k.FI.hk_valmis, 'ok'); return { ok: true }; };
      if (!env.sid || !env.db) { lokaali(); return Promise.resolve(valmis()); }   // demo
      S.tallentaa = true;
      return Promise.resolve().then(function () { var cu = env.auth ? env.auth() : null; return cu ? cu.getIdToken(true) : null; })
        .then(function () { return env.db.collection('seurat').doc(env.sid).collection('pelaajat').doc(p.id).update({ jaksofokus: plan.jaksofokus, ydinvahvuus_valinta: env.FV.delete() }); })   // YKSI update(): jaksofokus + valinta pois (kuten K3-tarjous)
        .then(function () { lokaali(); return valmis(); })
        .catch(function (e) { S.tallentaa = false; if (typeof console !== 'undefined') console.warn('[hylkaa]', e && e.message); var tx = env.t('Tallennus epäonnistui'); env.toast(typeof env.virheTeksti === 'function' ? env.virheTeksti(tx, e) : tx, 'error'); return { ok: false, syy: (e && e.code === 'permission-denied') ? 'oikeudet' : 'tallennus' }; });   // virhe näkyy; sheet auki, syötetty data säilyy
    }
    return { avaa: avaa, perustelu: perustelu, nayta: nayta, k3Valitse: k3Valitse, k3Lause: k3Lause, tallenna: tallenna, sulje: sulje };
  }
  var API = { ID: ID, tmKtHylkaaSheet: tmKtHylkaaSheet };
  if (typeof module !== 'undefined' && module.exports) module.exports = API; else if (root) root.TM_KT_HYLKAA = API;
})(typeof window !== 'undefined' ? window : this);
