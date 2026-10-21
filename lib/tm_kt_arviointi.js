/* ════════════════════════════════════════════════════════════════════════
   tm_kt_arviointi.js — kehitystyöpöytä 22 · kierros B · B2c: JAKSON ARVIOINTI (Sulje jakso) SHEETINÄ uudella sivulla (D100, D248). Dual-export: module.exports || window.TM_KT_ARVIOINTI.
   Sama sisältö ja kirjoitus kuin Masterin kevyessä katselmuksessa (lib/tm_kevyt_katselmus.js: kolme kysymystä + lause pelaajalle = YKSI tallennus; pelaajadokki + reviewit/{pvm} samassa batchissa);
   kuori on sheet (lib/tm_sheet.js; pitkä = 390 px koko ruutu / työpöydällä dialogi; sulkeminen säilyttää luonnoksen, vain Sulje jakso -tallennus tyhjentää).
   Ei "Kehityskeskustelu" -polkua tällä sivulla (K4; uusi sivu ei käytä sanaa katselmus, D248).
   K3a: "Anna pelaajan valita seuraava reitti" = sama sheet K3-tarjousosio auki (avaa(pid, { k3: true }); tmKkSheetHTML opts.k3 + tmTarjousOsioHTML, kirjoitus tmKkTallennus: sulku + tarjous + ydinvahvuus_valinta pois = YKSI batch). Tavallinen "Tee jakson yhteenveto" pysyy ilman K3-osiota.
   Viikkohavainnot (osa_havainnot_vk) kopioituvat jakson historiariville tmSuljeJakso:ssa (#1061).
   tmKtArviointiSheet(env) → { avaa(pid, opts?{k3}) → Promise<boolean>, vastaus(avain, arvo), lause(v), ehdotus(i), k3Paalle(b), k3Valitse(i), k3Lause(i, v), tallenna() → Promise<{ok, syy}>, sulje() }
     env: { db, sid, doc, t, esc, rooli, superAdmin, sheet (TM_SHEET-hallinta), toast(teksti, tyyppi), nayta(), pelaaja(pid), joukkueDocs, nimi(p), kaanon, nyt():Date, paivaIso(Date), verkossa():boolean,
            auth():user, ehdotukset(p) → [K3-kortti] (tmTarjousKortit; valinnainen), FV (firebase.firestore.FieldValue), haeSessiot(jf, alkoi, loppu) → Promise<[{treeniteema, pvm, pelaajat_id}]>, virheTeksti(teksti, virhe) }
════════════════════════════════════════════════════════════════════════ */
(function (root) {
  'use strict';
  function _g(nimi, polku) { try { return (typeof module !== 'undefined' && module.exports && typeof require === 'function') ? require(polku) : (root && root[nimi]); } catch (e) { return root && root[nimi]; } }
  var ID = 'arviointi';
  var FI = { kt_vk_lauseet: 'Viikkojen lauseet', kt_vk_lyhyt_nro: 'vk {n}' };
  function _txt(c, k) { var v = (c && typeof c.t === 'function') ? c.t(k) : k; return (v && v !== k) ? v : FI[k]; }
  function _esc(s) { return String(s == null ? '' : s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;'); }
  /* B2c: Jakson arviointi kokoaa jakson viikkohavaintojen LAUSEET viikoittain (osa_havainnot_vk, #1061; ilman viikkoriviä nykytilan lause omalle viikolleen pvm:stä). Vain henkilökunnan sheetissä; ei pelaajalle.
     → [{ vk:'2026-W43', nro:43, rivit:[{koodi, k, nimi, rooli, pvm, lause}] }] viikkojärjestyksessä (vanhin ensin) */
  function tmKtViikkoLauseet(jf, osat) {
    var V = _g('TM_VIIKKO', './tm_viikko.js'), kons = jf && jf.konsepti_avain, ulos = {}, nimet = {}; if (!kons) return [];
    (Array.isArray(osat) ? osat : []).forEach(function (o) { nimet[o.koodi] = { k: o.k, nimi: String(o.teksti || o.nimi || '').slice(0, 48) }; });
    var lisaa = function (koodi, vk, uid, x) { if (!x || typeof x.lause !== 'string' || !x.lause.trim()) return; var w = (ulos[vk] = ulos[vk] || {}); w[koodi + '|' + uid] = { koodi: koodi, k: (nimet[koodi] || {}).k || koodi, nimi: (nimet[koodi] || {}).nimi || '', rooli: x.rooli || '', pvm: x.pvm || '', lause: x.lause.trim() }; };
    var vkMap = (jf.osa_havainnot_vk && jf.osa_havainnot_vk[kons]) || {}, hav = (jf.osa_havainnot && jf.osa_havainnot[kons]) || {};
    Object.keys(vkMap).forEach(function (koodi) { Object.keys(vkMap[koodi] || {}).forEach(function (vk) { Object.keys(vkMap[koodi][vk] || {}).forEach(function (uid) { lisaa(koodi, vk, uid, vkMap[koodi][vk][uid]); }); }); });
    Object.keys(hav).forEach(function (koodi) { Object.keys(hav[koodi] || {}).forEach(function (uid) {   // nykytilan lause, jos sille ei ole viikkoriviä
      var x = hav[koodi][uid], m = V && x && /^(\d{4})-(\d{2})-(\d{2})$/.exec(String(x.pvm || '')), vk = m ? V.tmIsoViikkoYMD(+m[1], +m[2], +m[3]).tunniste : null;
      if (vk && !(vkMap[koodi] && vkMap[koodi][vk] && vkMap[koodi][vk][uid] && vkMap[koodi][vk][uid].lause)) lisaa(koodi, vk, uid, x);
    }); });
    return Object.keys(ulos).sort().map(function (vk) { var rivit = Object.keys(ulos[vk]).map(function (a) { return ulos[vk][a]; }).sort(function (a, b) { return a.k < b.k ? -1 : a.k > b.k ? 1 : (a.pvm < b.pvm ? -1 : 1); }); return { vk: vk, nro: +vk.slice(-2), rivit: rivit }; });
  }
  function tmKtViikkoLauseetHTML(viikot, c) {
    c = c || {}; var esc = c.esc || _esc; if (!Array.isArray(viikot) || !viikot.length) return '';
    var rs = function (r) { var s = _txt(c, 'kt_r_' + r); return s && s !== 'kt_r_' + r ? s : r; };
    return '<div data-kvk-viikkolauseet style="margin:0 0 12px"><div style="font-size:13px;font-weight:600;margin-bottom:6px">' + esc(_txt(c, 'kt_vk_lauseet')) + '</div>' + viikot.map(function (w) {
      return '<div data-kvk-vk="' + esc(w.vk) + '" style="margin-bottom:6px"><div style="font-size:11px;color:var(--ink3)">' + esc(String(_txt(c, 'kt_vk_lyhyt_nro')).replace('{n}', w.nro)) + '</div>' + w.rivit.map(function (r) {
        return '<div style="font-size:12.5px;color:var(--ink2)"><b style="color:var(--ink)">' + esc(r.k) + '</b> · “' + esc(r.lause) + '” <span style="color:var(--ink3)">' + esc([rs(r.rooli), c.pvmFn && r.pvm ? c.pvmFn(r.pvm) : r.pvm].filter(Boolean).join(' · ')) + '</span></div>'; }).join('') + '</div>'; }).join('') + '</div>';
  }
  function _id(pid) { return ID + '_' + pid; }
  function _paiva(d) { return d.getFullYear() + '-' + String(d.getMonth() + 1).padStart(2, '0') + '-' + String(d.getDate()).padStart(2, '0'); }
  /* Jakson väli (sama sääntö kuin Masterin _msJaksovali): alkoi = jakson alku, loppu = alku + kesto_vk viikkoa (oletus 4) */
  function tmKtJaksovali(jf, nyt) {
    var alkoi = jf && jf.alkoi ? String(jf.alkoi).slice(0, 10) : null, vk = (jf && jf.kesto_vk) || 4, m = alkoi && /^(\d{4})-(\d{2})-(\d{2})$/.exec(alkoi);
    var loppuD = m ? new Date(+m[1], +m[2] - 1, +m[3] + vk * 7) : (nyt || new Date());   // paikallinen kalenteripäivä (§7.26), ei UTC-leikkausta
    return { alkoi: alkoi, loppu: _paiva(loppuD) };
  }
  /* K3a: K3-tarjouksen kortit (Anna pelaajan valita + Hylkää valinta): tmJaksoEhdotukset → tmTarjousKortit (≤ 2, "miksi?" vain henkilökunnalle). Sama logiikka ja syötteet kuin Masterin _msK3Ehdotukset;
     d: { konsepti(avain) → {nimi}|null (TIER 1 kaanon+seuraoverride, sitten TM_TT_YOUTH), ttItems(pp) → sallitut konseptit, pp(p) → { ika, sp, joukkue, positio, … } } — selain antaa nämä, testit tynkinä. Virhe → [] (lomake aukeaa ilman tarjousta). */
  function tmKtK3Ehdotukset(p, d) {
    d = d || {}; var SA = _g('TM_SEURAAVA_ASKEL', './tm_seuraava_askel.js'), RV = _g('TM_REITIN_VALINTA', './tm_reitin_valinta.js'), AS = _g('TM_ARVIOINTI_SILTA', './tm_arviointi_silta.js'); if (!SA || !RV || !p) return [];
    try {
      return RV.tmTarjousKortit(SA.tmJaksoEhdotukset(p, p.jaksofokus && p.jaksofokus.konsepti_avain, {
        siltaKonsepti: d.konsepti, siltaEhdota: AS ? AS.tmSiltaEhdota : null,
        sallitut: function () { return typeof d.ttItems === 'function' ? d.ttItems(typeof d.pp === 'function' ? d.pp(p) : p) : null; }
      }));
    } catch (e) { if (typeof console !== 'undefined') console.warn('[K3] ehdotukset:', e && e.message); return []; }
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
      var k = K(), opts = { esc: env.esc, t: env.t, vastausFn: '_ktArvVastaus', lauseFn: '_ktArvLause', naytaFn: '_ktArvNayta', ehdotusFn: '_ktArvEhdotus', tallennaFn: '_ktArvTallenna', suljeFn: '_ktArvSulje', modalId: '_ktArviointiLomake', overlayAttrs: 'style="display:block"' };
      if (S.k3Nakyvissa) { opts.k3 = { paalleFn: '_ktArvK3Paalle', valitseFn: '_ktArvK3Valitse', lauseFn: '_ktArvK3Lause' }; opts.pinta = 'var(--bg2)'; }   // K3a: tarjousosio vain kun valmentaja valitsi "Anna pelaajan valita"

      var tmp = doc.createElement('div'); tmp.innerHTML = k.tmKkSheetHTML(S, opts); var laatikko = tmp.firstChild && tmp.firstChild.firstChild; if (!laatikko) return { otsikko: '', laatikko: null };
      var ot = laatikko.firstChild, otsikko = ot ? (ot.querySelector('[data-kvk-otsikko]') || ot).textContent : ''; if (ot) laatikko.removeChild(ot);   // otsikko + × siirtyvät sheetin yläriville
      laatikko.style.cssText = 'color:var(--ink)';
      if (S.viikkoLauseet && S.viikkoLauseet.length) {   // viikkojen lauseet ennen "Lause pelaajalle" -kenttää
        var ta = laatikko.querySelector('#kvkLause'), kohta = ta && ta.parentNode && ta.parentNode.parentNode === laatikko ? ta.parentNode : null, lh = doc.createElement('div');
        lh.innerHTML = tmKtViikkoLauseetHTML(S.viikkoLauseet, { esc: env.esc, t: env.t, pvmFn: env.pvmFn }); if (lh.firstChild) laatikko.insertBefore(lh.firstChild, kohta);
      }
      return { otsikko: otsikko, laatikko: laatikko };
    }
    function _piirra(pid) {
      var t = tila[pid]; if (!t) return; var h = _html(t.S); if (!h.laatikko) return;
      while (t.cont.firstChild) t.cont.removeChild(t.cont.firstChild); t.cont.appendChild(h.laatikko);
      if (typeof t.cont.dispatchEvent === 'function' && root && root.Event) t.cont.dispatchEvent(new root.Event('input', { bubbles: true }));   // vastaus = muokkaus → sheet säilyttää luonnoksen
    }
    function _aktiivinenPid() { var id = env.sheet.avoinna(); return id && id.indexOf(ID + '_') === 0 ? id.slice(ID.length + 1) : null; }

    function _kortit(p) { try { var x = typeof env.ehdotukset === 'function' ? env.ehdotukset(p) : []; return Array.isArray(x) ? x : []; } catch (e) { if (typeof console !== 'undefined') console.warn('[arviointi] ehdotukset:', e && e.message); return []; } }
    function _k3Esiin(pid) {   // K3a: tarjousosio näkyviin (ja päälle, jos ehdotuksia on); jo syötetyt vastaukset säilyvät
      var t = tila[pid]; if (!t) return; t.S.k3Nakyvissa = true;
      if (!t.S.k3.kortit.length) t.S.k3.kortit = _kortit(env.pelaaja(pid)); t.S.k3.paalla = t.S.k3.kortit.length > 0;
    }
    function avaa(pid, opts) {
      var p = env.pelaaja(pid), k = K(), k3 = !!(opts && opts.k3); if (!p || !k) return Promise.resolve(false);
      var jf = p.jaksofokus; if (!jf || !(jf.konsepti_avain || jf.konsepti_nimi)) { env.toast(env.t('Ei suljettavaa jaksoa'), 'error'); return Promise.resolve(false); }
      if (env.sheet.avoinna() === _id(pid)) { if (k3 && tila[pid]) { _k3Esiin(pid); _piirra(pid); } return Promise.resolve(true); }
      if (tila[pid] && env.sheet.luonnos(_id(pid))) { if (k3) { _k3Esiin(pid); _piirra(pid); } env.sheet.avaa({ id: _id(pid), tyyppi: 'pitka', otsikko: tila[pid].otsikko }); return Promise.resolve(true); }   // luonnos säilytetty (D100)
      var vali = tmKtJaksovali(jf, env.nyt ? env.nyt() : new Date());
      var S = k.tmKkAlku(p, { profiili: _profiili(p), lahde: _lahde(), nimi: env.nimi ? env.nimi(p) : '', konsepti: (function () { var SN = _g('TM_SANASTO', './tm_sanasto.js'); return SN && jf.konsepti_avain ? SN.tmSanastoKonseptiNimi(jf.konsepti_avain, jf.konsepti_nimi || jf.konsepti_avain) : (jf.konsepti_nimi || jf.konsepti_avain); })(), kestoVk: jf.kesto_vk || null, kortit: [], osat: _osat(jf), k3Paalla: false });
      if (k3) { S.k3Nakyvissa = true; S.k3.kortit = _kortit(p); S.k3.paalla = S.k3.kortit.length > 0; }   // K3a: kortit lasketaan vasta kun tarjous pyydetään
      S.vali = vali; S.viikkoLauseet = tmKtViikkoLauseet(jf, _osat(jf)); var cont = doc.createElement('div'); tila[pid] = { S: S, cont: cont, vali: vali, otsikko: '' };
      var h = _html(S); if (!h.laatikko) return Promise.resolve(false); cont.appendChild(h.laatikko); tila[pid].otsikko = h.otsikko;
      return Promise.resolve(env.sheet.avaa({ id: _id(pid), tyyppi: 'pitka', otsikko: h.otsikko, sisalto: cont })).then(function () { return true; });
    }
    function vastaus(avain, arvo) { var pid = _aktiivinenPid(), t = pid && tila[pid]; if (t && K().tmKkAsetaVastaus(t.S, avain, arvo)) _piirra(pid); }
    function lause(v) {
      var pid = _aktiivinenPid(), t = pid && tila[pid]; if (!t) return; t.S.lause = String(v || '');
      var b = t.cont.querySelector('[data-kvk-tallenna]'); if (b) { var ok = K().tmKkVoiTallentaa(t.S).ok; b.style.opacity = ok ? '' : '.55'; b.setAttribute('aria-disabled', ok ? 'false' : 'true'); }   // ei koko ruudun piirtoa kirjoittaessa (fokus säilyy)
    }
    function nayta(v) { var pid = _aktiivinenPid(), t = pid && tila[pid]; if (!t) return; t.S.nayta = v === true; _piirra(pid); }   // 0b: yhtenäinen kytkin "Näytä myös pelaajalle" (oletus pois)
    function ehdotus(i) { var pid = _aktiivinenPid(), t = pid && tila[pid]; if (!t) return; var e = K().tmKkEhdotukset(t.S)[i]; if (e == null) return; t.S.lause = e; _piirra(pid); var ta = t.cont.querySelector('#kvkLause'); if (ta && ta.focus) ta.focus(); }
    function sulje() { var pid = _aktiivinenPid(); if (pid) env.sheet.sulje(_id(pid)); }
    function k3Paalle(b) { var pid = _aktiivinenPid(), t = pid && tila[pid]; if (!t || !t.S.k3Nakyvissa) return; t.S.k3.paalla = !!b; _piirra(pid); }
    function k3Valitse(i) { var pid = _aktiivinenPid(), t = pid && tila[pid], kortti = t && t.S.k3.kortit[i]; if (!kortti) return; kortti.valittu = !kortti.valittu; _piirra(pid); }
    function k3Lause(i, v) { var pid = _aktiivinenPid(), t = pid && tila[pid], kortti = t && t.S.k3.kortit[i]; if (kortti) kortti.lause = String(v || ''); }   // ei piirtoa kirjoittaessa (fokus säilyy)

    function _kirjoita(p, plan) {   // YKSI batch: pelaajadokki + reviewit/{pvm}
      var ref = env.db.collection('seurat').doc(env.sid).collection('pelaajat').doc(p.id), batch = env.db.batch(), rivit = Array.isArray(plan.historiaLisays) ? plan.historiaLisays : [], upd = { jaksofokus: plan.jaksofokus };
      if (rivit.length) upd.jaksofokus_historia = env.FV.arrayUnion.apply(null, rivit);
      if (plan.poistaValinta) upd.ydinvahvuus_valinta = env.FV.delete();
      if (plan.pikakentat) Object.assign(upd, plan.pikakentat);   // K1d: jakson yhteenveto nollaa rytmin (review_viimeisin_*) samassa kirjoituksessa
      batch.update(ref, upd); if (plan.reviewitData) batch.set(ref.collection('reviewit').doc(plan.reviewitPvm), plan.reviewitData, { merge: true });
      return batch.commit().then(function () { if (rivit.length) p.jaksofokus_historia = (Array.isArray(p.jaksofokus_historia) ? p.jaksofokus_historia : []).concat(rivit); p.jaksofokus = plan.jaksofokus; if (plan.pikakentat) Object.assign(p, plan.pikakentat); if (plan.poistaValinta) delete p.ydinvahvuus_valinta; });   // lokaali vasta onnistumisen jälkeen
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
        var plan = k.tmKkTallennus(p, S, { uid: ((typeof env.auth === 'function' && env.auth()) || {}).uid, nytISO: nyt.toISOString(), pvm: (env.paivaIso || _paiva)(nyt), rooli: env.superAdmin ? 'vp' : (env.rooli || 'valmentaja'), alkoi: vali.alkoi, loppu: vali.loppu, harjoituksia: kooste.harjoituksia, lasnaolo: kooste.lasnaolo });
        if (!plan.ok) { env.toast(k.tmKkVirhe(plan.syy, { t: env.t }), 'error'); return { ok: false, syy: plan.syy }; }   // validointi ENNEN kirjoitusta; sheet jää auki
        if (typeof env.verkossa === 'function' && !env.verkossa()) { env.toast(env.t('Tallennus ei onnistunut, koska verkkoyhteys puuttuu. Yritä uudelleen, kun yhteys palaa.'), 'error'); return { ok: false, syy: 'offline' }; }
        var valmis = function () { env.sheet.tallennettu(_id(pid)); delete tila[pid]; if (typeof env.nayta === 'function') env.nayta(); env.toast(k.FI[plan.tarjottu ? 'kk_tallennettu_tarjous' : 'kk_tallennettu'], 'ok'); return { ok: true }; };
        if (!env.sid || !env.db) { p.jaksofokus = plan.jaksofokus; p.jaksofokus_historia = (Array.isArray(p.jaksofokus_historia) ? p.jaksofokus_historia : []).concat(plan.historiaLisays); if (plan.pikakentat) Object.assign(p, plan.pikakentat); if (plan.poistaValinta) delete p.ydinvahvuus_valinta; return valmis(); }   // demo
        S.tallentaa = true;
        return Promise.resolve().then(function () { var cu = env.auth ? env.auth() : null; return cu ? cu.getIdToken(true) : null; }).then(function () { return _kirjoita(p, plan); }).then(valmis)
          .catch(function (e) { S.tallentaa = false; if (typeof console !== 'undefined') console.warn('[arviointi]', e && e.message); var tx = env.t('Tallennus epäonnistui'); env.toast(typeof env.virheTeksti === 'function' ? env.virheTeksti(tx, e) : tx, 'error'); return { ok: false, syy: (e && e.code === 'permission-denied') ? 'oikeudet' : 'tallennus' }; });   // virhe näkyy; sheet auki, syötetty data säilyy
      });
    }
    return { avaa: avaa, vastaus: vastaus, lause: lause, nayta: nayta, ehdotus: ehdotus, k3Paalle: k3Paalle, k3Valitse: k3Valitse, k3Lause: k3Lause, tallenna: tallenna, sulje: sulje };
  }
  var API = { ID: ID, FI: FI, tmKtViikkoLauseet: tmKtViikkoLauseet, tmKtViikkoLauseetHTML: tmKtViikkoLauseetHTML, tmKtJaksovali: tmKtJaksovali, tmKtK3Ehdotukset: tmKtK3Ehdotukset, tmKtArviointiSheet: tmKtArviointiSheet };
  if (typeof module !== 'undefined' && module.exports) module.exports = API; else if (root) root.TM_KT_ARVIOINTI = API;
})(typeof window !== 'undefined' ? window : this);
