/* ════════════════════════════════════════════════════════════════════════
   tm_kt_toimintakortti.js — kehitystyöpöytä 22 · B3/B4: TOIMINTAKORTTI "Miten valmennetaan" (raportti 40 §11 + §13; D248-sanasto). Dual-export: module.exports || window.TM_KT_TOIMINTAKORTTI.
   PURE-ydin (valinta + HTML) + sheet-tehdas tmKtVideoSheet(env) ("+ Lisää video", vain VP/UTJ/SA).
   · tmKtToimintakortti(p, ctx) → kortin data. ctx: { pankki:[harjoitepankki-dokit], lahteet:{jarjestys:['seura','talentmaster']}|null, tt:{kysymykset(avain), harjoitteet(avain), pelaaja(avain)}, rooli, superAdmin, silmin, phv }
       Harjoite JAKSON tasolla (ei osakohtaista, §11/2): lähdejärjestys oletuksena seura → TalentMaster (konfiguraatio/harjoitelahteet.jarjestys voi muuttaa); seura = hyväksytty harjoitepankin dokumentti jonka `konsepti` = jakson konseptiavain; muuten TalentMaster-peliharjoite (tmTtHarjoitteet → konseptipelin nimi).
       Kysy pelaajalta: KAIKKI kolme kysymystä (tmTtKysymykset), osarivit eivät näytä cuetä (§11/3). Video vain jos linkki on (http(s)); näkyy "Katso video · youtube.com". "+ Lisää video" vain VP/UTJ/SA ja vain seuran harjoitteelle (§11/4).
       Pelaajan silmin (§11/5): VAIN TalentMaster-data (tmTtPelaaja): konseptipelin nimi + kysymykset; ei seuran harjoitetta, videota, fysiikkaa eikä lisää-nappia.
       Fysiikkaharjoite (§13/2, omaa aineistoa): näkyy kun jakso on fyysinen TAI pelaajalla on kasvupyrähdysmerkintä (PH); sisältö = jakson ohjelma (liikkeet, snapshot jaksofokuksessa); ei sisältöä → osiota ei piirretä (ei tyhjää korttia; harjoitepankista tehtävä PH-valinta = erillinen turvallisuuskatselmus).
   · tmKtFysiikkaNakyy(jf, phv) · tmKtVideoKelpaa(url, {vainHttps}) · tmKtVideoHost(url) · tmKtToimintakorttiHTML(k, c) · tmKtVideoSheet(env)
   Värit vain tokeneilla. Tekstit c.t:n läpi (FI-oletukset FI; D248-sanat sanastosta).
════════════════════════════════════════════════════════════════════════ */
(function (root) {
  'use strict';
  var FI = {
    kt_tk_otsikko: 'Miten valmennetaan', kt_tk_seuran_harjoite: 'Seuran harjoite', kt_tk_fysiikka: 'Fysiikkaharjoite', kt_tk_katso_video: 'Katso video', kt_tk_lisaa_video: '+ Lisää video', kt_tk_ohjelma: 'Jakson ohjelma',
    kt_tk_video_otsikko: 'Lisää video', kt_tk_video_url: 'Videon linkki (https)', kt_tk_video_ohje: 'Julkinen video linkkinä. Videota ei tallenneta omalle palvelimelle.', kt_tk_video_virhe: 'Linkin pitää alkaa https://',
    kt_tk_video_tallenna: 'Tallenna video', kt_tk_video_tallennettu: 'Video lisätty ✓', kt_tk_video_epaonnistui: 'Videon tallennus epäonnistui', kt_tk_peliharjoite: 'Peliharjoite', kt_tk_kysy: 'Kysy pelaajalta', kt_tk_kysy_itselta: 'Kysy itseltäsi',
    kt_tk_kevennetty: 'Kevennettynä', kt_tk_vaihtoehto: 'Vaihtoehto kasvuaikana', kt_tk_kasvuvaihe_ei_mitattu: 'Kasvuvaihe ei mitattu'
  };
  var VIDEON_LISAAJAT = { vp: 1, urheilutoimenjohtaja: 1, super_admin: 1 };
  function _esc(s) { return String(s == null ? '' : s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;'); }
  function _sn() { try { return (typeof module !== 'undefined' && module.exports && typeof require === 'function') ? require('./tm_sanasto.js') : (root && root.TM_SANASTO); } catch (e) { return root && root.TM_SANASTO; } }
  function _txt(c, k) { var v = (c && typeof c.t === 'function') ? c.t(k) : k; if (v && v !== k) return v; var s = _sn(); return FI[k] != null ? FI[k] : (s && s.FI && s.FI[k] != null ? s.FI[k] : k); }   // D248-sanat (sn_*) sanastosta
  function _kp() { try { return (typeof module !== 'undefined' && module.exports && typeof require === 'function') ? require('./tm_kasvupyrahdys.js') : (root && root.TM_KASVUPYRAHDYS); } catch (e) { return root && root.TM_KASVUPYRAHDYS; } }
  function _avain(a) { return String(a == null ? '' : a).toLowerCase().replace(/-/g, '_'); }
  function _rooli(r) { r = String(r || ''); return r === 'superadmin' ? 'super_admin' : r; }

  function tmKtVideoKelpaa(url, o) { var re = o && o.vainHttps ? /^https:\/\/[^\s/$.?#][^\s]*$/i : /^https?:\/\/[^\s/$.?#][^\s]*$/i; return typeof url === 'string' && re.test(url.trim()); }
  function tmKtVideoHost(url) { var m = /^https?:\/\/([^\/?#:]+)/i.exec(String(url || '').trim()); return m ? m[1].toLowerCase().replace(/^www\./, '') : ''; }
  function tmKtFysiikkaNakyy(jf, phv) { return !!(jf && (jf.domeeni === 'fyysinen' || (jf.ohjelma && typeof jf.ohjelma === 'object'))) || String(phv || '').toUpperCase() === 'PH'; }
  function _fysiikka(jf, ctx) {   // jakson ohjelma (snapshot): nimi + liikkeet; ei sisältöä → null. Kasvupyrähdyssuodatus (Teron hyväksymä taulu, lib/tm_kasvupyrahdys.js): ei → pois, vain kevennettynä → lähteen ohjeella, sama harjoite vain kerran, korvaava ehdotus.
    if (!jf) return null; var o = jf.ohjelma && typeof jf.ohjelma === 'object' ? jf.ohjelma : null, liikkeet = [];
    var lahde = o && Array.isArray(o.liikkeet) ? o.liikkeet : (Array.isArray(jf.tukitavoitteet) ? [].concat.apply([], jf.tukitavoitteet.map(function (t) { return (t && Array.isArray(t.harjoitteet)) ? t.harjoitteet : []; })) : []);
    lahde.forEach(function (l) { if (l && (l.liike || l.nimi)) liikkeet.push({ liike: String(l.liike || l.nimi), toistot: l.toistot ? String(l.toistot) : '', video_url: tmKtVideoKelpaa(l.video_url) ? String(l.video_url).trim() : null }); });
    var KP = _kp(), korvaavat = [];
    if (KP) { var tila = ctx && ctx.phvTila !== undefined ? ctx.phvTila : (ctx ? ctx.phv : null), r = KP.tmKpSuodata(liikkeet, tila, { t: ctx && ctx.t, ikavaihe: ctx && ctx.ikavaihe }); liikkeet = r.liikkeet; korvaavat = r.korvaavat; }
    liikkeet = liikkeet.slice(0, 4);
    if (!liikkeet.length && !korvaavat.length) return null;
    var tl = ctx && ctx.phvTila !== undefined ? ctx.phvTila : null, href = (tl === 'tuntematon' && ctx && ctx.mittausHref) ? String(ctx.mittausHref) : null;
    return { nimi: (o && (o.nimi || o.ohjelma_nimi)) || '', liikkeet: liikkeet, korvaavat: korvaavat, eiMitattu: !!href, mittausHref: href };
  }
  /* Seuran harjoite (konsepti-osuma ennen TalentMasteria). SoccerTutor-lähde (lahde_tyyppi 'soccertutor' / kolmas_osapuoli): VAIN nimi ja kuva — ei kestoa, ei videota, ei tekstejä. Muu lähde (oma / SPL / muu / tyhjä = muu / en tiedä): kuten oma harjoite. Video vain https. */
  function _kuva(d, ctx) {
    var u = String(d && d.kuva_url || '').trim(); if (!u) return null;
    if (/^https:\/\//i.test(u) || /^data:image\/(png|jpe?g|gif|webp);base64,/i.test(u)) return u;
    var r = ctx && typeof ctx.kuvaUrl === 'function' ? ctx.kuvaUrl(u) : null;   // Storage-polku (seurat/{sid}/harjoitepankki/{id}.jpg) → sivun ratkaisema URL
    return typeof r === 'string' && (/^https:\/\//i.test(r) || /^data:image\//i.test(r)) ? r : null;
  }
  function _seuranHarjoite(d, ctx) {
    var kolmas = d.lahde_tyyppi === 'soccertutor' || d.kolmas_osapuoli === true, kuva = _kuva(d, ctx);
    if (kolmas) return { lahde: 'seura', id: d.id || null, nimi: String(d.nimi), kesto: null, pelimuoto: null, video_url: null, kuva: kuva, soccertutor: true };
    return { lahde: 'seura', id: d.id || null, nimi: String(d.nimi), kesto: d.kesto || null, pelimuoto: null, video_url: tmKtVideoKelpaa(d.video_url, { vainHttps: true }) ? String(d.video_url).trim() : null, kuva: kuva, soccertutor: false };
  }
  function tmKtToimintakortti(p, ctx) {
    ctx = ctx || {}; var jf = p && p.jaksofokus, a = jf && _avain(jf.konsepti_avain), tt = ctx.tt || {}; if (!a) return null;
    var kysymykset = (typeof tt.kysymykset === 'function' ? tt.kysymykset(a) : []) || [], tmp = typeof tt.pelaaja === 'function' ? tt.pelaaja(a) : null, tmh = typeof tt.harjoitteet === 'function' ? (tt.harjoitteet(a) || [])[0] : null;
    var tmHarjoite = (tmp && tmp.koe) || (tmh && tmh.konseptipeli) ? { lahde: 'talentmaster', id: null, nimi: (tmp && tmp.koe) || String(tmh.konseptipeli), pelimuoto: (tmh && tmh.pelimuoto) || null, video_url: null } : null;
    if (ctx.silmin) return { silmin: true, konsepti_avain: a, kysymykset: kysymykset.slice(0, 3), harjoite: tmHarjoite, video: null, voiLisataVideon: false, fysiikka: null };   // Pelaajan silmin: vain TalentMaster-data
    var jarjestys = ctx.lahteet && Array.isArray(ctx.lahteet.jarjestys) && ctx.lahteet.jarjestys.length ? ctx.lahteet.jarjestys : ['seura', 'talentmaster'], harjoite = null;
    var seura = (Array.isArray(ctx.pankki) ? ctx.pankki : []).filter(function (d) { return d && d.tila === 'hyvaksytty' && d.arkistoitu !== true && d.lahde === 'seura' && _avain(d.konsepti) === a && d.nimi; }).sort(function (x, y) { return String(y.paivitetty || '') < String(x.paivitetty || '') ? -1 : 1; })[0] || null;
    for (var i = 0; i < jarjestys.length && !harjoite; i++) {
      if (jarjestys[i] === 'seura' && seura) harjoite = _seuranHarjoite(seura, ctx);
      else if (jarjestys[i] === 'talentmaster' && tmHarjoite) harjoite = tmHarjoite;
    }
    var video = harjoite && harjoite.video_url ? { url: harjoite.video_url, host: tmKtVideoHost(harjoite.video_url) } : null;
    var fys = tmKtFysiikkaNakyy(jf, ctx.phv) ? _fysiikka(jf, ctx) : null;
    return { silmin: false, konsepti_avain: a, kysymykset: kysymykset.slice(0, 3), harjoite: harjoite, video: video, voiLisataVideon: !!(harjoite && harjoite.lahde === 'seura' && !harjoite.soccertutor && harjoite.id && (ctx.superAdmin || VIDEON_LISAAJAT[_rooli(ctx.rooli)])), fysiikka: fys };
  }
  /* k = tmKtToimintakortti(...) | null; c: { esc, t, lisaaVideoFn(pid, harjoiteId), pid } */
  function tmKtToimintakorttiHTML(k, c) {
    c = c || {}; var esc = c.esc || _esc, t = function (x) { return esc(_txt(c, x)); }; if (!k || (!k.harjoite && !k.kysymykset.length && !k.fysiikka)) return '';
    var h = '<section class="kt-tk" data-kt-toimintakortti' + (k.silmin ? ' data-kt-silmin' : '') + '><span class="kt-eb">' + t(k.silmin ? 'sn_mita_harjoittelet' : 'kt_tk_otsikko') + '</span>';
    if (k.harjoite) {
      h += '<div class="kt-tk-r" data-kt-tk-harjoite="' + esc(k.harjoite.lahde) + '"><div class="kt-tk-k">' + t(k.harjoite.lahde === 'seura' ? 'kt_tk_seuran_harjoite' : 'sn_peliharjoite') + '</div><div class="kt-tk-v"><b>' + esc(k.harjoite.nimi) + '</b>' + (k.harjoite.pelimuoto ? ' · ' + esc(k.harjoite.pelimuoto) : '') + (k.harjoite.kesto ? ' · ' + esc(k.harjoite.kesto) : '') + '</div>';
      if (k.harjoite.kuva) h += '<div class="kt-tk-kuva"><img data-kt-kuva src="' + esc(k.harjoite.kuva) + '" alt="' + esc(k.harjoite.nimi) + '" loading="lazy"></div>';
      if (k.video) h += '<div class="kt-tk-video"><a class="kt-linkki" data-kt-video href="' + esc(k.video.url) + '" target="_blank" rel="noopener noreferrer">' + t('kt_tk_katso_video') + ' · ' + esc(k.video.host) + '</a></div>';
      if (k.voiLisataVideon && !k.video && c.lisaaVideoFn) h += '<div class="kt-tk-video"><button type="button" class="kt-linkki" data-kt-lisaa-video onclick="' + esc(c.lisaaVideoFn + '(' + JSON.stringify(c.pid) + ',' + JSON.stringify(k.harjoite.id) + ')') + '">' + t('kt_tk_lisaa_video') + '</button></div>';
      h += '</div>';
    }
    if (k.kysymykset.length) h += '<div class="kt-tk-r" data-kt-tk-kysy><div class="kt-tk-k">' + t(k.silmin ? 'sn_kysy_itseltasi' : 'sn_kysy_pelaajalta') + '</div><ol class="kt-tk-kysy">' + k.kysymykset.map(function (q) { return '<li>' + esc(q) + '</li>'; }).join('') + '</ol></div>';
    if (k.fysiikka) {
      h += '<div class="kt-tk-r" data-kt-tk-fysiikka><div class="kt-tk-k">' + t('kt_tk_fysiikka') + (k.fysiikka.nimi ? ' · ' + esc(k.fysiikka.nimi) : '') + '</div>' + (k.fysiikka.eiMitattu ? '<div class="kt-tk-k"><a class="kt-linkki" data-kt-kasvuvaihe-ei-mitattu href="' + esc(k.fysiikka.mittausHref) + '">' + t('kt_tk_kasvuvaihe_ei_mitattu') + '</a></div>' : '');
      if (k.fysiikka.liikkeet.length) h += '<ul class="kt-tk-kysy">' + k.fysiikka.liikkeet.map(function (l) { return '<li>' + esc(l.liike) + (l.toistot ? ' · ' + esc(l.toistot) : '') + (l.video_url ? ' · <a class="kt-linkki" href="' + esc(l.video_url) + '" target="_blank" rel="noopener noreferrer">' + t('kt_tk_katso_video') + ' · ' + esc(tmKtVideoHost(l.video_url)) + '</a>' : '') + (l.kevennetty ? '<div class="kt-tk-k" data-kt-kevennetty>' + t('kt_tk_kevennetty') + ': ' + esc(l.kevennetty) + '</div>' : '') + '</li>'; }).join('') + '</ul>';
      if ((k.fysiikka.korvaavat || []).length) h += '<div class="kt-tk-k" data-kt-vaihtoehdot>' + t('kt_tk_vaihtoehto') + '</div><ul class="kt-tk-kysy">' + k.fysiikka.korvaavat.map(function (v) { return '<li><b>' + esc(v.nimi) + '</b> · ' + esc(v.ohje) + (v.kp ? '<div class="kt-tk-k">' + esc(v.kp) + '</div>' : '') + '</li>'; }).join('') + '</ul>';
      h += '</div>';
    }
    return h + '</section>';
  }

  /* "+ Lisää video": lyhyt sheet (D100); kirjoitus harjoitepankki/{id}.update({video_url, paivitetty}) — Rules: VP/UTJ/SA (valmentajalle ei löysennetä). Uusi linkki vain https (§11/7). env: { db, sid, doc, t, esc, sheet, toast, nayta, pankki(id) → dokumentti, nyt, verkossa, virheTeksti, auth } */
  function tmKtVideoSheet(env) {
    env = env || {}; var doc = env.doc || (root && root.document), ID = 'video';
    function _t(k) { return _txt(env, k); }
    function _html(id) { var esc = env.esc || _esc; return '<div class="kt-tk-sheet" data-kt-video-sheet><label class="kt-tk-k" for="ktVideoUrl">' + esc(_t('kt_tk_video_url')) + '</label><input id="ktVideoUrl" type="url" inputmode="url" autocomplete="off" placeholder="https://" style="width:100%;box-sizing:border-box;min-height:44px;font:inherit;background:var(--card);color:var(--ink);border:1px solid var(--line2);border-radius:8px;padding:8px"><div class="kt-meta" style="margin:6px 0 10px">' + esc(_t('kt_tk_video_ohje')) + '</div><div class="kt-tk-virhe" data-kt-video-virhe role="alert"></div><button type="button" class="kt-btn" data-kt-video-tallenna onclick="_ktVideoTallenna(' + esc(JSON.stringify(id)) + ')">' + esc(_t('kt_tk_video_tallenna')) + '</button></div>'; }
    function avaa(pid, id) { var d = env.pankki ? env.pankki(id) : null; if (!d) return Promise.resolve(false); var c = doc.createElement('div'); c.innerHTML = _html(id); return Promise.resolve(env.sheet.avaa({ id: ID + '_' + id, tyyppi: 'lyhyt', otsikko: _t('kt_tk_video_otsikko'), sisalto: c.firstChild })).then(function () { return true; }); }
    function tallenna(id) {
      var runko = env.sheet.runko(ID + '_' + id), inp = runko && runko.querySelector('#ktVideoUrl'), virhe = runko && runko.querySelector('[data-kt-video-virhe]'), url = inp ? String(inp.value || '').trim() : '', d = env.pankki ? env.pankki(id) : null;
      if (!d || !runko) return Promise.resolve({ ok: false, syy: 'ei_lomaketta' });
      if (!tmKtVideoKelpaa(url, { vainHttps: true })) { if (virhe) virhe.textContent = _t('kt_tk_video_virhe'); return Promise.resolve({ ok: false, syy: 'url' }); }   // vain https; validointi ENNEN kirjoitusta
      if (typeof env.verkossa === 'function' && !env.verkossa()) { env.toast(env.t('Tallennus ei onnistunut, koska verkkoyhteys puuttuu. Yritä uudelleen, kun yhteys palaa.')); return Promise.resolve({ ok: false, syy: 'offline' }); }
      var iso = (env.nyt ? env.nyt() : new Date()).toISOString(), cu = env.auth ? env.auth() : null;
      return Promise.resolve().then(function () { return cu ? cu.getIdToken(true) : null; }).then(function () { return env.db.collection('seurat').doc(env.sid).collection('harjoitepankki').doc(id).update({ video_url: url, paivitetty: iso }); })
        .then(function () { d.video_url = url; d.paivitetty = iso; env.sheet.tallennettu(ID + '_' + id); if (typeof env.nayta === 'function') env.nayta(); env.toast(_t('kt_tk_video_tallennettu')); return { ok: true }; })
        .catch(function (e) { if (typeof console !== 'undefined') console.warn('[video]', e && e.message); var tx = _t('kt_tk_video_epaonnistui'); env.toast(typeof env.virheTeksti === 'function' ? env.virheTeksti(tx, e) : tx); return { ok: false, syy: (e && e.code === 'permission-denied') ? 'oikeudet' : 'tallennus' }; });
    }
    return { avaa: avaa, tallenna: tallenna };
  }
  function tmKtToimintakorttiCss() {
    return ['.kt-tk{display:grid;gap:10px;margin-top:14px}.kt-tk-r{display:grid;gap:3px;border:1px solid var(--line2);border-radius:8px;background:var(--card);padding:10px 12px}',
      '.kt-tk-kuva img{display:block;max-width:100%;max-height:200px;object-fit:contain;border-radius:8px;margin-top:6px;background:var(--card)}',
      '.kt-tk-k{font-size:var(--fs-meta,12.5px);color:var(--ink3)}.kt-tk-v{font-size:var(--fs-body,14px);color:var(--ink)}.kt-tk-video{font-size:var(--fs-body,14px)}',
      '.kt-tk-kysy{margin:2px 0 0 18px;padding:0;display:grid;gap:3px;font-size:var(--fs-body,14px);color:var(--ink)}.kt-tk-virhe{min-height:0;color:var(--amber);font-size:var(--fs-meta,12.5px);margin-bottom:6px}'].join('\n');
  }
  var API = { FI: FI, tmKtVideoKelpaa: tmKtVideoKelpaa, tmKtVideoHost: tmKtVideoHost, tmKtFysiikkaNakyy: tmKtFysiikkaNakyy, tmKtToimintakortti: tmKtToimintakortti, tmKtToimintakorttiHTML: tmKtToimintakorttiHTML, tmKtVideoSheet: tmKtVideoSheet, tmKtToimintakorttiCss: tmKtToimintakorttiCss };
  if (typeof module !== 'undefined' && module.exports) module.exports = API; else if (root) root.TM_KT_TOIMINTAKORTTI = API;
})(typeof window !== 'undefined' ? window : this);
