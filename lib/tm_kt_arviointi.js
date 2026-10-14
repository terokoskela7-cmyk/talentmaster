/* ════════════════════════════════════════════════════════════════════════
   tm_kt_arviointi.js — kehitystyöpöytä 22 · kierros B · B2c: JAKSON ARVIOINTI (Sulje jakso) SHEETINÄ uudella sivulla (D100, D248). Dual-export: module.exports || window.TM_KT_ARVIOINTI.
   Sama sisältö ja kirjoitus kuin Masterin kevyessä katselmuksessa (lib/tm_kevyt_katselmus.js: kolme kysymystä + lause pelaajalle = YKSI tallennus; pelaajadokki + reviewit/{pvm} samassa batchissa);
   kuori on sheet (lib/tm_sheet.js; pitkä = 390 px koko ruutu / työpöydällä dialogi; sulkeminen säilyttää luonnoksen, vain Sulje jakso -tallennus tyhjentää).
   Ei K3-tarjousta eikä "Syvennä (täysi katselmus)" -polkua tällä sivulla (vanha näkymä hoitaa; uusi sivu ei käytä sanaa katselmus, D248).
   Viikkohavainnot (osa_havainnot_vk) kopioituvat jakson historiariville tmSuljeJakso:ssa (#1061).
   tmKtArviointiSheet(env) → { avaa(pid) → Promise<boolean>, vastaus(avain, arvo), lause(v), ehdotus(i), tallenna() → Promise<{ok, syy}>, sulje() }
     env: { db, sid, doc, t, esc, rooli, superAdmin, sheet (TM_SHEET-hallinta), toast(teksti, tyyppi), nayta(), pelaaja(pid), joukkueDocs, nimi(p), kaanon, nyt():Date, paivaIso(Date), verkossa():boolean,
            auth():user, FV (firebase.firestore.FieldValue), haeSessiot(jf, alkoi, loppu) → Promise<[{treeniteema, pvm, pelaajat_id}]>, virheTeksti(teksti, virhe) }
════════════════════════════════════════════════════════════════════════ */
(function (root) {
  'use strict';
  function _g(nimi, polku) { try { return (typeof module !== 'undefined' && module.exports && typeof require === 'function') ? require(polku) : (root && root[nimi]); } catch (e) { return root && root[nimi]; } }
  var ID = 'arviointi';
  function _id(pid) { return ID + '_' + pid; }
  function _paiva(d) { return d.getFullYear() + '-' + String(d.getMonth() + 1).padStart(2, '0') + '-' + String(d.getDate()).padStart(2, '0'); }
  /* Jakson väli (sama sääntö kuin Masterin _msJaksovali): alkoi = jakson alku, loppu = alku + kesto_vk viikkoa (oletus 4) */
  function tmKtJaksovali(jf, nyt) {
    var alkoi = jf && jf.alkoi ? String(jf.alkoi).slice(0, 10) : null, vk = (jf && jf.kesto_vk) || 4, m = alkoi && /^(\d{4})-(\d{2})-(\d{2})$/.exec(alkoi);
    var loppuD = m ? new Date(+m[1], +m[2] - 1, +m[3] + vk * 7) : (nyt || new Date());   // paikallinen kalenteripäivä (§7.26), ei UTC-leikkausta
    return { alkoi: alkoi, loppu: _paiva(loppuD) };
  }
  function tmKtArviointiSheet(env) {
    env = env || {}; var doc = env.doc || (root && root.document), tila = {};   // tila[pid] = { S, cont, vali, sessiot }
    function K() { return _g('TM_KEVYT_KATSELMUS', './tm_kevyt_katselmus.js'); }
    function _lahde() { return (env.superAdmin || ['vp', 'urheilutoimenjohtaja'].indexOf(env.rooli) >= 0) ? 'vp' : 'valmentaja'; }
    function _profiili(p) {
      var AJ = _g('TM_ALOITA_JAKSO', './tm_aloita_jakso.js'), jid = AJ && AJ.tmAjJoukkueId ? AJ.tmAjJoukkueId(p.joukkue || (Array.isArray(p.joukkueet) ? p.joukkueet[0] : '')) : null;
      var d = (env.joukkueDocs || []).filter(function (x) { return x.id === jid; })[0] || null; return K().tmProfiili(d);
    }
    function _osat(jf) { var T = _g('TM_TANAAN_KENTTA', './tm_tanaan_kentta.js'); try { return T ? T.tmTanaanOsat(jf, { kaanon: env.kaanon || null }) : []; } catch (e) { return []; } }
    function _html(S) {
      var k = K(), opts = { esc: env.esc, t: env.t, vastausFn: '_ktArvVastaus', lauseFn: '_ktArvLause', ehdotusFn: '_ktArvEhdotus', tallennaFn: '_ktArvTallenna', suljeFn: '_ktArvSulje', modalId: '_ktArviointiLomake', overlayAttrs: 'style="display:block"' };
      var tmp = doc.createElement('div'); tmp.innerHTML = k.tmKkSheetHTML(S, opts); var laatikko = tmp.firstChild && tmp.firstChild.firstChild; if (!laatikko) return { otsikko: '', laatikko: null };
      var ot = laatikko.firstChild, otsikko = ot ? (ot.querySelector('[data-kvk-otsikko]') || ot).textContent : ''; if (ot) laatikko.removeChild(ot);   // otsikko + × siirtyvät sheetin yläriville
      laatikko.style.cssText = 'color:var(--ink)'; return { otsikko: otsikko, laatikko: laatikko };
    }
    function _piirra(pid) {
      var t = tila[pid]; if (!t) return; var h = _html(t.S); if (!h.laatikko) return;
      while (t.cont.firstChild) t.cont.removeChild(t.cont.firstChild); t.cont.appendChild(h.laatikko);
      if (typeof t.cont.dispatchEvent === 'function' && root && root.Event) t.cont.dispatchEvent(new root.Event('input', { bubbles: true }));   // vastaus = muokkaus → sheet säilyttää luonnoksen
    }
    function _aktiivinenPid() { var id = env.sheet.avoinna(); return id && id.indexOf(ID + '_') === 0 ? id.slice(ID.length + 1) : null; }

    function avaa(pid) {
      var p = env.pelaaja(pid), k = K(); if (!p || !k) return Promise.resolve(false);
      var jf = p.jaksofokus; if (!jf || !(jf.konsepti_avain || jf.konsepti_nimi)) { env.toast(env.t('Ei suljettavaa jaksoa'), 'error'); return Promise.resolve(false); }
      if (env.sheet.avoinna() === _id(pid)) return Promise.resolve(true);
      if (tila[pid] && env.sheet.luonnos(_id(pid))) { env.sheet.avaa({ id: _id(pid), tyyppi: 'pitka', otsikko: tila[pid].otsikko }); return Promise.resolve(true); }   // luonnos säilytetty (D100)
      var vali = tmKtJaksovali(jf, env.nyt ? env.nyt() : new Date());
      var S = k.tmKkAlku(p, { profiili: _profiili(p), lahde: _lahde(), nimi: env.nimi ? env.nimi(p) : '', konsepti: (function () { var SN = _g('TM_SANASTO', './tm_sanasto.js'); return SN && jf.konsepti_avain ? SN.tmSanastoKonseptiNimi(jf.konsepti_avain, jf.konsepti_nimi || jf.konsepti_avain) : (jf.konsepti_nimi || jf.konsepti_avain); })(), kestoVk: jf.kesto_vk || null, kortit: [], osat: _osat(jf), k3Paalla: false });
      S.vali = vali; var cont = doc.createElement('div'); tila[pid] = { S: S, cont: cont, vali: vali, otsikko: '' };
      var h = _html(S); if (!h.laatikko) return Promise.resolve(false); cont.appendChild(h.laatikko); tila[pid].otsikko = h.otsikko;
      return Promise.resolve(env.sheet.avaa({ id: _id(pid), tyyppi: 'pitka', otsikko: h.otsikko, sisalto: cont })).then(function () { return true; });
    }
    function vastaus(avain, arvo) { var pid = _aktiivinenPid(), t = pid && tila[pid]; if (t && K().tmKkAsetaVastaus(t.S, avain, arvo)) _piirra(pid); }
    function lause(v) {
      var pid = _aktiivinenPid(), t = pid && tila[pid]; if (!t) return; t.S.lause = String(v || '');
      var b = t.cont.querySelector('[data-kvk-tallenna]'); if (b) { var ok = K().tmKkVoiTallentaa(t.S).ok; b.style.opacity = ok ? '' : '.55'; b.setAttribute('aria-disabled', ok ? 'false' : 'true'); }   // ei koko ruudun piirtoa kirjoittaessa (fokus säilyy)
    }
    function ehdotus(i) { var pid = _aktiivinenPid(), t = pid && tila[pid]; if (!t) return; var e = K().tmKkEhdotukset(t.S)[i]; if (e == null) return; t.S.lause = e; _piirra(pid); var ta = t.cont.querySelector('#kvkLause'); if (ta && ta.focus) ta.focus(); }
    function sulje() { var pid = _aktiivinenPid(); if (pid) env.sheet.sulje(_id(pid)); }

    function _kirjoita(p, plan) {   // YKSI batch: pelaajadokki + reviewit/{pvm}
      var ref = env.db.collection('seurat').doc(env.sid).collection('pelaajat').doc(p.id), batch = env.db.batch(), rivit = Array.isArray(plan.historiaLisays) ? plan.historiaLisays : [], upd = { jaksofokus: plan.jaksofokus };
      if (rivit.length) upd.jaksofokus_historia = env.FV.arrayUnion.apply(null, rivit);
      if (plan.poistaValinta) upd.ydinvahvuus_valinta = env.FV.delete();
      batch.update(ref, upd); if (plan.reviewitData) batch.set(ref.collection('reviewit').doc(plan.reviewitPvm), plan.reviewitData, { merge: true });
      return batch.commit().then(function () { if (rivit.length) p.jaksofokus_historia = (Array.isArray(p.jaksofokus_historia) ? p.jaksofokus_historia : []).concat(rivit); p.jaksofokus = plan.jaksofokus; if (plan.poistaValinta) delete p.ydinvahvuus_valinta; });   // lokaali vasta onnistumisen jälkeen
    }
    function tallenna() {
      var pid = _aktiivinenPid(), t = pid && tila[pid], k = K(); if (!t || t.S.tallentaa) return Promise.resolve({ ok: false, syy: 'ei_lomaketta' });
      var p = env.pelaaja(pid); if (!p) return Promise.resolve({ ok: false, syy: 'ei_pelaajaa' });
      var S = t.S, vali = t.vali, jf = p.jaksofokus, nyt = env.nyt ? env.nyt() : new Date(), JK = _g('TM_JAKSOKOOSTE', './tm_jaksokooste.js');
      var hae = typeof env.haeSessiot === 'function' ? Promise.resolve().then(function () { return env.haeSessiot(jf, vali.alkoi, vali.loppu); }).catch(function () { return []; }) : Promise.resolve([]);
      return hae.then(function (sess) {
        sess = Array.isArray(sess) ? sess : [];
        var tap = sess.map(function (s) { return { treeniteema: s.treeniteema, pvm: s.pvm, pelaajat_id: s.pelaajat_id, lasnaolo: {} }; });
        var kooste = JK ? JK.tmJaksonHarjoitukset(tap, jf.konsepti_avain, vali.alkoi, vali.loppu, p.id) : { harjoituksia: sess.length, lasnaolo: { paikalla: 0, yhteensa: sess.length, tiedossa: 0 } };
        var plan = k.tmKkTallennus(p, S, { nytISO: nyt.toISOString(), pvm: (env.paivaIso || _paiva)(nyt), rooli: env.superAdmin ? 'vp' : (env.rooli || 'valmentaja'), alkoi: vali.alkoi, loppu: vali.loppu, harjoituksia: kooste.harjoituksia, lasnaolo: kooste.lasnaolo });
        if (!plan.ok) { env.toast(k.tmKkVirhe(plan.syy, { t: env.t }), 'error'); return { ok: false, syy: plan.syy }; }   // validointi ENNEN kirjoitusta; sheet jää auki
        if (typeof env.verkossa === 'function' && !env.verkossa()) { env.toast(env.t('Tallennus ei onnistunut, koska verkkoyhteys puuttuu. Yritä uudelleen, kun yhteys palaa.'), 'error'); return { ok: false, syy: 'offline' }; }
        var valmis = function () { env.sheet.tallennettu(_id(pid)); delete tila[pid]; if (typeof env.nayta === 'function') env.nayta(); env.toast(k.FI[plan.tarjottu ? 'kk_tallennettu_tarjous' : 'kk_tallennettu'], 'ok'); return { ok: true }; };
        if (!env.sid || !env.db) { p.jaksofokus = plan.jaksofokus; p.jaksofokus_historia = (Array.isArray(p.jaksofokus_historia) ? p.jaksofokus_historia : []).concat(plan.historiaLisays); if (plan.poistaValinta) delete p.ydinvahvuus_valinta; return valmis(); }   // demo
        S.tallentaa = true;
        return Promise.resolve().then(function () { var cu = env.auth ? env.auth() : null; return cu ? cu.getIdToken(true) : null; }).then(function () { return _kirjoita(p, plan); }).then(valmis)
          .catch(function (e) { S.tallentaa = false; if (typeof console !== 'undefined') console.warn('[arviointi]', e && e.message); var tx = env.t('Tallennus epäonnistui'); env.toast(typeof env.virheTeksti === 'function' ? env.virheTeksti(tx, e) : tx, 'error'); return { ok: false, syy: (e && e.code === 'permission-denied') ? 'oikeudet' : 'tallennus' }; });   // virhe näkyy; sheet auki, syötetty data säilyy
      });
    }
    return { avaa: avaa, vastaus: vastaus, lause: lause, ehdotus: ehdotus, tallenna: tallenna, sulje: sulje };
  }
  var API = { ID: ID, tmKtJaksovali: tmKtJaksovali, tmKtArviointiSheet: tmKtArviointiSheet };
  if (typeof module !== 'undefined' && module.exports) module.exports = API; else if (root) root.TM_KT_ARVIOINTI = API;
})(typeof window !== 'undefined' ? window : this);
