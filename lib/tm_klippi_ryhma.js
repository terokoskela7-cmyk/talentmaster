/* ════════════════════════════════════════════════════════════════════════
   tm_klippi_ryhma.js — Klippi ryhmälle (Sibbo 1.11.; ROADMAP "Sibbon klippien käyttöönoton ehdot" kohta 4) + oma videoklippi -varaus (klippilataus v2, lisäpalvelu). PURE
   (ei DOMia; Firestore vain tmKrLataa-kutsun db-parametrin kautta): Master_v16 ja VP_v25 ovat ohuita adaptereita. Tekstit ovat lib/tm_mediaviesti.js:n FI-avaimia (mv_ryhma*, mv_oma_video*).
   RYHMÄLÄHETYS: vastaanottajaksi uusi vaihtoehto "Ryhmä" (R1-ryhmät seurat/{sid}/ryhmat, myös sääntöryhmät). Ryhmä puretaan LÄHETYSHETKELLÄ pelaajiksi (jäsenet silloin); jokainen pelaaja saa
   oman klippiketjunsa (tila, vastaus, huoltajan kuittaus pelaajakohtaisia), dokumenttiin tallentuu kohde:{tyyppi:'ryhma', ryhma_id, nimi}. Suostumus: puuttuva huoltajan klippisuostumus → "odottaa lupaa"
   kuten ennenkin; lähettäjä näkee ennen lähetystä "n pelaajaa, joista m odottaa lupaa".
   OIKEUDET (sama kuin Rules v3.63 + käyttöliittymä): SA / johto (vp, urheilutoimenjohtaja, seurasihteeri) kaikille aktiivisille ryhmille; ryhmän valmentaja (valmentajat[], sis. vastaavan vastuu_uid, v3.61)
   omille ryhmilleen; valmentaja-rooli myös ryhmille, joiden KAIKKI jäsenet ovat hänen joukkueissaan (Rules ei tunne valmentajan joukkuetta → tämä ehto on UI:n; Rules vaatii ryhmän olemassaolon + nimen täsmäävyyden).
   OMA VIDEOKLIPPI (v2): KLIPPI_OMA_MIN_S/MAX_S yksi raja (v2 käyttää samaa); lippu seurat/{sid}.liput.klippi_oma_video (oletus pois, vain täsmälleen true). Ei latausta, ei tallennusta, ei hintaa koodissa.
   · tmKrJasenet(ryhma, pelaajat) · tmKrSaaLahettaa(ryhma, ctx) · tmKrRyhmat(ryhmat, ctx) → [{id,nimi,n,tyyppi}] · tmKrYhteenveto(pelaajat) → {n, m} · tmKrKohde(ryhma) → {tyyppi,ryhma_id,nimi}
   · tmKrOmaVideo(ctx) → { tila:'lukittu'|'tulossa', tarjous, seura, osoite, min, max } · tmKrAsetaSheet(S, data, ctx) · tmKrValitse(S, ryhmaId, ctx) · tmKrVastaanottajat(S, ctx) · tmKrLippu(seuraDoc) · tmKrLataa(db, seuraId)
   ctx: { uid, rooli, sa, omatJoukkueet:[avain], pelaajat:[…], seura } · data: { ryhmat:[ryhmädokit], lippu:bool, pelaajat:[seuran pelaajat] }
   Dual-export: module.exports || window.TM_KLIPPI_RYHMA.
════════════════════════════════════════════════════════════════════════ */
(function (root) {
  'use strict';
  var KLIPPI_OMA_MIN_S = 10, KLIPPI_OMA_MAX_S = 15, TUKI_OSOITE = 'talentmasterid@gmail.com';
  var JOHTO = { vp: 1, urheilutoimenjohtaja: 1, seurasihteeri: 1 }, VALMENTAJA = { valmentaja: 1, talenttivalmentaja: 1, fysiikkavalmentaja: 1 };

  function _req(g, f) { try { return (typeof module !== 'undefined' && module.exports && typeof require === 'function') ? require(f) : (root && root[g]); } catch (e) { return root && root[g]; } }
  function _R() { return _req('TM_RYHMAT', './tm_ryhmat.js'); }
  function _norm(s) { return String(s == null ? '' : s).toLowerCase().replace(/[\s_]+/g, ''); }
  function _johto(ctx) { return !!(ctx && (ctx.sa || JOHTO[ctx.rooli])); }

  function tmKrJasenet(ryhma, pelaajat) { var R = _R(); return R && ryhma ? R.tmRyhmaJasenet(ryhma, pelaajat) : []; }
  function _omaJoukkue(p, avaimet) { var k = {}; (avaimet || []).filter(Boolean).forEach(function (a) { k[_norm(a)] = 1; }); return [p.joukkue, p.joukkueId].concat(p.joukkueet || []).filter(Boolean).some(function (x) { return k[_norm(x)]; }); }
  /* Saako lähettäjä lähettää klipin ryhmälle? Aktiivinen ryhmä, jossa on vähintään yksi jäsen. */
  function tmKrSaaLahettaa(ryhma, ctx) {
    ctx = ctx || {}; if (!ryhma || ryhma.aktiivinen === false) return false;
    var jas = tmKrJasenet(ryhma, ctx.pelaajat); if (!jas.length) return false;
    if (_johto(ctx)) return true;
    if (ctx.uid && Array.isArray(ryhma.valmentajat) && ryhma.valmentajat.indexOf(ctx.uid) >= 0) return true;   // oma ryhmä (vastaava kuuluu valmentajiin)
    if (!VALMENTAJA[ctx.rooli]) return false;
    return jas.every(function (p) { return _omaJoukkue(p, ctx.omatJoukkueet); });   // kaikki jäsenet hänen joukkueissaan
  }
  function tmKrRyhmat(ryhmat, ctx) {
    return (Array.isArray(ryhmat) ? ryhmat : []).filter(function (r) { return r && r.id && tmKrSaaLahettaa(r, ctx); })
      .map(function (r) { return { id: r.id, nimi: r.nimi || '', n: tmKrJasenet(r, ctx.pelaajat).length, tyyppi: r.tyyppi === 'saanto' ? 'saanto' : 'lista' }; })
      .sort(function (a, b) { return String(a.nimi).localeCompare(String(b.nimi)); });
  }
  function tmKrYhteenveto(pelaajat) {
    var pl = Array.isArray(pelaajat) ? pelaajat : []; return { n: pl.length, m: pl.filter(function (p) { return p.suostumusTila !== 'annettu'; }).length };
  }
  function tmKrKohde(ryhma) { return ryhma ? { tyyppi: 'ryhma', ryhma_id: ryhma.id, nimi: String(ryhma.nimi || '') } : null; }

  /* ── Oma videoklippi (varaus) ── */
  function tmKrLippu(seuraDoc) { return !!(seuraDoc && seuraDoc.liput && seuraDoc.liput.klippi_oma_video === true); }
  function tmKrOmaVideo(ctx) {
    ctx = ctx || {}; var johto = _johto(ctx);
    return { tila: ctx.lippu === true ? 'tulossa' : 'lukittu', tarjous: johto, seura: ctx.seura || '', osoite: TUKI_OSOITE, min: KLIPPI_OMA_MIN_S, max: KLIPPI_OMA_MAX_S };
  }

  /* ── Sheet-tila (adapterit kutsuvat avattaessa / ryhmää vaihdettaessa) ── */
  function _ctx(S, ctx) { return Object.assign({}, ctx, { pelaajat: S._pelaajat || (ctx && ctx.pelaajat) || [] }); }
  function tmKrAsetaSheet(S, data, ctx) {
    data = data || {}; ctx = ctx || {};   // pelaajat: koko seura (valmentajan oma lista kattaa vain hänen joukkueensa → ryhmän muut jäsenet ladataan erikseen); omat objektit voittavat
    var omat = {}; (ctx.pelaajat || []).forEach(function (p) { omat[p.id] = p; }); S._pelaajat = (Array.isArray(data.pelaajat) ? data.pelaajat : []).map(function (p) { return omat[p.id] || p; });
    if (!S._pelaajat.length) S._pelaajat = (ctx.pelaajat || []).slice();
    ctx = _ctx(S, ctx); S.ryhmat = tmKrRyhmat(data.ryhmat, ctx); S.ryhmaId = null; S.yhteenveto = null; S.tarjolla = Object.assign({}, S.tarjolla, { ryhma: S.ryhmat.length > 0 });
    S.omaVideo = tmKrOmaVideo(Object.assign({}, ctx, { lippu: data.lippu === true })); S._ryhmaDokit = Array.isArray(data.ryhmat) ? data.ryhmat : []; return S;
  }
  function tmKrValitse(S, ryhmaId, ctx) {
    var sallittu = (S.ryhmat || []).some(function (r) { return r.id === ryhmaId; }); S.ryhmaId = sallittu ? ryhmaId : null;
    S.yhteenveto = S.ryhmaId ? tmKrYhteenveto(tmKrVastaanottajat(S, ctx)) : null; return S;
  }
  /* Ryhmän tämänhetkiset jäsenet (purku lähetyshetkellä) */
  function tmKrVastaanottajat(S, ctx) {
    if (!S || !S.ryhmaId) return [];
    var r = (S._ryhmaDokit || []).filter(function (x) { return x && x.id === S.ryhmaId; })[0]; var c = _ctx(S, ctx); return r && tmKrSaaLahettaa(r, c) ? tmKrJasenet(r, c.pelaajat) : [];
  }
  function tmKrKohdeTilasta(S) { var r = (S._ryhmaDokit || []).filter(function (x) { return x && x.id === S.ryhmaId; })[0]; return tmKrKohde(r); }

  /* Ryhmät + lippu yhdellä kertaa (virhe → ei ryhmiä / lippu pois, klippilähetys toimii ennallaan). db = Firestore-compat; seura-doc: liput.klippi_oma_video */
  function tmKrLataa(db, seuraId) {
    if (!db || !seuraId) return Promise.resolve({ ryhmat: [], lippu: false, pelaajat: [] });
    var sref = db.collection('seurat').doc(seuraId);
    var lue = function (sn) { return sn.docs.map(function (d) { return Object.assign({ id: d.id }, d.data()); }); };
    var r = sref.collection('ryhmat').get().then(lue).catch(function (e) { console.warn('[klippi ryhmä] ryhmät:', e && e.message); return []; });
    var l = sref.get().then(function (d) { return d.exists ? tmKrLippu(d.data()) : false; }).catch(function (e) { console.warn('[klippi ryhmä] lippu:', e && e.message); return false; });
    var p = r.then(function (ry) { return ry.length ? sref.collection('pelaajat').get().then(lue).catch(function (e) { console.warn('[klippi ryhmä] pelaajat:', e && e.message); return []; }) : []; });   // koko seura vain jos ryhmiä on
    return Promise.all([r, l, p]).then(function (x) { return { ryhmat: x[0], lippu: x[1], pelaajat: x[2] }; });
  }

  var API = { KLIPPI_OMA_MIN_S: KLIPPI_OMA_MIN_S, KLIPPI_OMA_MAX_S: KLIPPI_OMA_MAX_S, TUKI_OSOITE: TUKI_OSOITE, tmKrJasenet: tmKrJasenet, tmKrSaaLahettaa: tmKrSaaLahettaa, tmKrRyhmat: tmKrRyhmat, tmKrYhteenveto: tmKrYhteenveto, tmKrKohde: tmKrKohde, tmKrKohdeTilasta: tmKrKohdeTilasta,
    tmKrLippu: tmKrLippu, tmKrOmaVideo: tmKrOmaVideo, tmKrAsetaSheet: tmKrAsetaSheet, tmKrValitse: tmKrValitse, tmKrVastaanottajat: tmKrVastaanottajat, tmKrLataa: tmKrLataa };
  if (typeof module !== 'undefined' && module.exports) module.exports = API; else root.TM_KLIPPI_RYHMA = API;
})(typeof window !== 'undefined' ? window : this);
