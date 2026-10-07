/* ════════════════════════════════════════════════════════════════════════
   tm_ryhmat.js — R1 Seuran ryhmät (D33; docs/CODE_BRIEF_R1_RYHMAT.md). PURE (ei Firebasea, ei DOMia): VP_v25 ja Master_v16 ovat ohuita adaptereita. EI Kenttä-lippua.
   Data: seurat/{sid}/ryhmat/{rid} = { nimi ≤60, tyyppi 'lista'|'saanto', saanto?:{kentta:'talenttiOhjelma',arvo:true}, pelaajat_id[] ≤200, valmentajat[] (uid) ≤10, kuvaus? ≤200, aktiivinen, luotu, luoja_uid, muokattu } (Rules v3.49).
   R1 = lista-ryhmät (pelaajat valitaan mistä tahansa joukkueesta); poikkeus: talenttiryhmä voi olla sääntöryhmä (talenttiOhjelma == true). Ei roolia "maalivahtivalmentaja": valmentaja-rooli + merkintä valmentajat[]:ään.
   RYHMÄT
   · tmRyhmaSyote(syote, ctx)        → { ok, data } | { ok:false, syy }  (validointi ENNEN kirjoitusta; sama muoto kuin Rules ryhmaKelpaa) ctx: { uid, johto:bool }
   · tmRyhmaSaaMuokata(ryhma, ctx)   → bool   ctx: { uid, rooli, sa }   (SA/johto aina; valmentaja vain ryhmän valmentajana)   · tmRyhmaSaaLuoda(ctx)
   · tmRyhmaJasenet(ryhma, pelaajat) → [pelaaja]   lista: pelaajat_id; sääntö: talenttiOhjelma === true
   KOHDE (kalenteri)
   · tmKohdePelaajat(kohde, ctx)     → [pelaajaId]  kohde { tyyppi:'joukkue'|'joukkueet'|'ryhma'|'pelaajat', joukkue?, joukkueet?, ryhma_id?, pelaajat_id? } ctx: { pelaajat, ryhmat }
   · tmKokoonpano(ev, ctx)           → { ids, jaadytetty, jaadytettava }  elävä kunnes läsnäolo kirjataan tai päivä menee ohi; silloin jäädytetään tapahtumaan (pelaajat_id-snapshot + jaadytetty ISO). ctx: { nyt, pelaajat, ryhmat }
   · tmSynkkaaTapahtumat(tapahtumat, ryhma, pelaajat, nyt) → [{ id, pelaajat_id }]  ryhmän jäsenyys muuttui → tulevien, jäädyttämättömien ryhmätapahtumien pelaajat_id päivitetään
   · tmTapahtumaKuuluuPelaajalle(ev, pelaaja)  — peili Pelaaja_v7 _p7EvKuuluu / Vanhempi _vanhEvKuuluu (joukkue/joukkueet normalisoituna TAI pelaajat_id)
   HTML (tokenit, ei hex-värejä): tmRyhmaListaHTML(ryhmat, opts) · tmRyhmaLomakeHTML(S, opts).  Tekstit opts.t:n läpi (fi-oletus tässä; sv-avaimet määrittelemättä → Geminin lista).
   Dual-export: module.exports || window.TM_RYHMAT.
════════════════════════════════════════════════════════════════════════ */
(function (root) {
  'use strict';
  var FI = {
    ry_otsikko: 'Ryhmät', ry_ohje: 'Ryhmä kokoaa pelaajia eri joukkueista ja ikäluokista (esim. maalivahdit, talenttiryhmä). Ryhmälle voi luoda tapahtumia ja kirjata niihin läsnäolon.',
    ry_uusi: '+ Uusi ryhmä', ry_ei_ryhmia: 'Ei ryhmiä vielä', ry_jasenia: 'jäsentä', ry_valmentajat: 'Valmentajat', ry_muokkaa: 'Muokkaa', ry_arkistoi: 'Arkistoi', ry_palauta: 'Palauta', ry_arkistoitu: 'Arkistoitu',
    ry_talenttiryhma: 'Talenttiohjelma (sääntö)', ry_tyyppi_lista: 'Lista', ry_tyyppi_saanto: 'Sääntö: talenttiohjelma', ry_nimi: 'Nimi', ry_kuvaus: 'Kuvaus (valinnainen)', ry_tyyppi: 'Tyyppi',
    ry_saanto_ohje: 'Jäsenet ovat kaikki talenttiohjelman pelaajat — lista päivittyy automaattisesti.', ry_pelaajat: 'Pelaajat', ry_haku: 'Hae pelaajaa…', ry_kaikki_joukkueet: 'Kaikki joukkueet',
    ry_valittu: 'valittu', ry_lisaa_nakyvat: 'Lisää näkyvät', ry_tyhjenna: 'Tyhjennä valinnat', ry_tallenna: 'Tallenna ryhmä', ry_peruuta: 'Peruuta', ry_ei_pelaajia: 'Ei pelaajia hakuehdoilla.',
    ry_valmentajat_ohje: 'Ryhmän valmentaja voi luoda ryhmälle tapahtumia ja kirjata läsnäolon kaikille jäsenille joukkueesta riippumatta.', ry_ei_valmentajia: 'Ei valmentajia rekisterissä.',
    ry_virhe_nimi: 'Anna ryhmälle nimi (enintään 60 merkkiä).', ry_virhe_pelaajat: 'Valitse vähintään yksi pelaaja (enintään 200).', ry_virhe_valmentajat: 'Valmentajia enintään 10. Valmentajana tallentava lisää itsensä ryhmän valmentajaksi.',
    ry_virhe_kuvaus: 'Kuvaus on enintään 200 merkkiä.', ry_virhe_tyyppi: 'Tuntematon ryhmätyyppi.', ry_tallennettu: 'Ryhmä tallennettu ✓', ry_ei_oikeutta: 'Voit muokata vain ryhmiä, joissa olet valmentajana.',
    ry_vahvista_arkisto: 'Arkistoidaanko ryhmä? Ryhmän tapahtumat säilyvät.', ry_arkistoitu_toast: 'Ryhmä arkistoitu ✓', ry_palautettu_toast: 'Ryhmä palautettu ✓', ry_lataa: 'Ladataan ryhmiä…'
  };
  var MAX_NIMI = 60, MAX_KUVAUS = 200, MAX_PELAAJAT = 200, MAX_VALMENTAJAT = 10;
  var JOHTO = { vp: 1, urheilutoimenjohtaja: 1, seurasihteeri: 1 }, LUOJAT = { valmentaja: 1, talenttivalmentaja: 1, fysiikkavalmentaja: 1 };

  function _esc(s) { return String(s == null ? '' : s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;'); }
  function _txt(o, k) { var v = (o && typeof o.t === 'function') ? o.t(k) : k; return (v && v !== k) ? v : FI[k]; }
  function _str(v) { return typeof v === 'string' ? v.trim() : ''; }
  function _uniq(a, maxLen) { var out = [], n = {}; (Array.isArray(a) ? a : []).forEach(function (x) { if (typeof x === 'string' && x && !n[x] && out.length < maxLen + 1) { n[x] = 1; out.push(x); } }); return out; }
  function _norm(s) { return String(s == null ? '' : s).toLowerCase().replace(/[\s_]+/g, ''); }

  /* ── Oikeudet (peilaa Rules v3.49) ── */
  function tmRyhmaSaaLuoda(ctx) { ctx = ctx || {}; return !!(ctx.sa || JOHTO[ctx.rooli] || LUOJAT[ctx.rooli]); }
  function tmRyhmaSaaMuokata(ryhma, ctx) {
    ctx = ctx || {}; if (!ryhma) return false; if (ctx.sa || JOHTO[ctx.rooli]) return true;
    return !!(ctx.uid && (LUOJAT[ctx.rooli] || ctx.rooli === 'vp') && Array.isArray(ryhma.valmentajat) && ryhma.valmentajat.indexOf(ctx.uid) >= 0);
  }

  /* ── Lomakkeen syöte → tallennettava data (aikaleimat lisää adapteri: luotu/muokattu = serverTimestamp()) ──
     syote: { nimi, tyyppi, pelaajat_id[], valmentajat[], kuvaus, aktiivinen? } ctx: { uid, johto:bool } */
  function tmRyhmaSyote(syote, ctx) {
    syote = syote || {}; ctx = ctx || {};
    var nimi = _str(syote.nimi); if (!nimi || nimi.length > MAX_NIMI) return { ok: false, syy: 'nimi' };
    var tyyppi = syote.tyyppi === 'saanto' ? 'saanto' : (syote.tyyppi === 'lista' || syote.tyyppi == null ? 'lista' : null); if (!tyyppi) return { ok: false, syy: 'tyyppi' };
    var kuvaus = _str(syote.kuvaus); if (kuvaus.length > MAX_KUVAUS) return { ok: false, syy: 'kuvaus' };
    var vm = _uniq(syote.valmentajat, MAX_VALMENTAJAT); if (ctx.uid && !ctx.johto && vm.indexOf(ctx.uid) < 0 && !syote._muokkaus) vm.push(ctx.uid);   // luoja kuuluu valmentajiin ellei johto (Rules)
    if (vm.length > MAX_VALMENTAJAT) return { ok: false, syy: 'valmentajat' };
    var pel = tyyppi === 'saanto' ? [] : _uniq(syote.pelaajat_id, MAX_PELAAJAT);
    if (tyyppi === 'lista' && (!pel.length || pel.length > MAX_PELAAJAT)) return { ok: false, syy: 'pelaajat' };
    var data = { nimi: nimi, tyyppi: tyyppi, pelaajat_id: pel, valmentajat: vm, aktiivinen: syote.aktiivinen !== false };
    if (tyyppi === 'saanto') data.saanto = { kentta: 'talenttiOhjelma', arvo: true };
    if (kuvaus) data.kuvaus = kuvaus;
    return { ok: true, data: data };
  }
  function tmRyhmaVirhe(syy, opts) { return _txt(opts, { nimi: 'ry_virhe_nimi', pelaajat: 'ry_virhe_pelaajat', valmentajat: 'ry_virhe_valmentajat', kuvaus: 'ry_virhe_kuvaus', tyyppi: 'ry_virhe_tyyppi' }[syy] || 'ry_virhe_nimi'); }

  /* ── Jäsenet ── */
  function tmRyhmaJasenet(ryhma, pelaajat) {
    var pl = Array.isArray(pelaajat) ? pelaajat : []; if (!ryhma) return [];
    if (ryhma.tyyppi === 'saanto') return pl.filter(function (p) { return p && p.talenttiOhjelma === true; });
    var n = {}; (Array.isArray(ryhma.pelaajat_id) ? ryhma.pelaajat_id : []).forEach(function (id) { n[id] = 1; });
    return pl.filter(function (p) { return p && n[p.id]; });
  }

  /* ── Kohdejoukko ── */
  function _joukkueenPelaajat(avaimet, pelaajat) {
    var k = {}; avaimet.filter(Boolean).forEach(function (a) { k[_norm(a)] = 1; });
    return pelaajat.filter(function (p) { return [p.joukkue, p.joukkueId].concat(p.joukkueet || []).filter(Boolean).some(function (x) { return k[_norm(x)]; }); }).map(function (p) { return p.id; });
  }
  function tmKohdePelaajat(kohde, ctx) {
    ctx = ctx || {}; kohde = kohde || {}; var pl = Array.isArray(ctx.pelaajat) ? ctx.pelaajat : [];
    if (kohde.tyyppi === 'pelaajat') return _uniq(kohde.pelaajat_id, 1000);
    if (kohde.tyyppi === 'ryhma') { var r = (Array.isArray(ctx.ryhmat) ? ctx.ryhmat : []).filter(function (x) { return x && x.id === kohde.ryhma_id; })[0]; return r ? tmRyhmaJasenet(r, pl).map(function (p) { return p.id; }) : []; }
    if (kohde.tyyppi === 'joukkueet') return _joukkueenPelaajat([].concat(kohde.joukkueet || []), pl);
    if (kohde.tyyppi === 'joukkue') return _joukkueenPelaajat([kohde.joukkue].concat(kohde.joukkueet || []), pl);
    return [];
  }
  function _evPaiva(ev) {
    var a = ev && ev.alkaa, d = a && a.toDate ? a.toDate() : (a instanceof Date ? a : typeof a === 'string' ? new Date(a) : (ev && ev.pvm ? new Date(String(ev.pvm).slice(0, 10) + 'T00:00:00') : null));
    return d && !isNaN(d.getTime()) ? d : null;
  }
  function _paivaAvain(d) { return d.getFullYear() * 10000 + (d.getMonth() + 1) * 100 + d.getDate(); }
  function tmTapahtumaOhi(ev, nyt) { var d = _evPaiva(ev), n = nyt instanceof Date ? nyt : new Date(nyt == null ? Date.now() : nyt); return !!d && _paivaAvain(d) < _paivaAvain(n); }
  /* Kokoonpano: jäädytetty → tapahtuman oma snapshot; päivä ohi → tallennettu snapshot (jäädytetään lazy kun joku avaa läsnäolon); muuten elävästi kohteesta.
     jaadytettava = true kun on jäädytettävä nyt (läsnäolo kirjataan tai päivä on ohi eikä jaadytetty ole vielä kirjattu). */
  function tmKokoonpano(ev, ctx) {
    ctx = ctx || {}; ev = ev || {}; var tallennettu = Array.isArray(ev.pelaajat_id) ? ev.pelaajat_id : [];
    if (ev.jaadytetty) return { ids: tallennettu.slice(), jaadytetty: true, jaadytettava: false };
    var kohde = ev.kohde, elava = (kohde && (kohde.tyyppi === 'ryhma' || kohde.tyyppi === 'pelaajat')) ? tmKohdePelaajat(kohde, ctx) : null;
    if (tmTapahtumaOhi(ev, ctx.nyt)) return { ids: (tallennettu.length || !elava ? tallennettu : elava).slice(), jaadytetty: false, jaadytettava: !!(kohde && kohde.tyyppi === 'ryhma') };
    return { ids: (elava || tallennettu).slice(), jaadytetty: false, jaadytettava: false };
  }
  function tmSynkkaaTapahtumat(tapahtumat, ryhma, pelaajat, nyt) {
    var uudet = tmRyhmaJasenet(ryhma, pelaajat).map(function (p) { return p.id; }).sort(), ulos = [];
    (Array.isArray(tapahtumat) ? tapahtumat : []).forEach(function (ev) {
      if (!ev || ev.poistettu || ev.jaadytetty || !ev.kohde || ev.kohde.tyyppi !== 'ryhma' || ev.kohde.ryhma_id !== ryhma.id || tmTapahtumaOhi(ev, nyt)) return;
      var vanhat = (Array.isArray(ev.pelaajat_id) ? ev.pelaajat_id : []).slice().sort();
      if (vanhat.join('|') !== uudet.join('|')) ulos.push({ id: ev.id, pelaajat_id: uudet.slice() });
    });
    return ulos;
  }
  function tmTapahtumaKuuluuPelaajalle(ev, pelaaja) {
    if (!pelaaja || !ev) return false;
    var pk = {}; [pelaaja.joukkue, pelaaja.joukkueId].concat(pelaaja.joukkueet || []).filter(Boolean).forEach(function (x) { pk[_norm(x)] = 1; });
    if ([ev.joukkue].concat(ev.joukkueet || []).filter(Boolean).map(_norm).some(function (k) { return pk[k]; })) return true;
    return Array.isArray(ev.pelaajat_id) && ev.pelaajat_id.indexOf(pelaaja.id) >= 0;
  }

  /* ── HTML ── */
  var KORTTI = 'background:var(--card);border:.5px solid var(--border);border-radius:12px;padding:14px 16px;margin-bottom:10px';
  var NAPPI = 'font-size:12px;border-radius:8px;padding:7px 12px;cursor:pointer;border:.5px solid var(--border);background:transparent;color:var(--ink2)';
  var NAPPI_ENS = 'font-size:12.5px;font-weight:600;border-radius:8px;padding:8px 14px;cursor:pointer;border:.5px solid var(--teal);background:var(--teal);color:var(--on-accent,var(--bg))';
  /* ryhmat: [{id, nimi, tyyppi, pelaajat_id[], valmentajat[], aktiivinen, kuvaus}] ; opts: { esc, t, jasenMaara(ryhma)→n, valmentajaNimet(ryhma)→'A, B', saaMuokata(ryhma)→bool, uusiFn, muokkaaFn(id), arkistoiFn(id), palautaFn(id), voiLuoda } */
  function tmRyhmaListaHTML(ryhmat, opts) {
    opts = opts || {}; var esc = opts.esc || _esc, T = function (k) { return esc(_txt(opts, k)); }, lista = Array.isArray(ryhmat) ? ryhmat : [];
    var akt = lista.filter(function (r) { return r.aktiivinen !== false; }), arkisto = lista.filter(function (r) { return r.aktiivinen === false; });
    var rivi = function (r) {
      var n = typeof opts.jasenMaara === 'function' ? opts.jasenMaara(r) : (r.pelaajat_id || []).length, voi = typeof opts.saaMuokata === 'function' ? opts.saaMuokata(r) : false;
      return '<div data-ry-id="' + esc(r.id) + '" style="' + KORTTI + (r.aktiivinen === false ? ';opacity:.6' : '') + '"><div style="display:flex;justify-content:space-between;gap:10px;align-items:baseline;flex-wrap:wrap">'
        + '<div><span style="font-size:15px;font-weight:600;color:var(--ink)">' + esc(r.nimi) + '</span> <span style="font-size:11.5px;color:var(--ink3)">· ' + n + ' ' + T('ry_jasenia') + (r.tyyppi === 'saanto' ? ' · ' + T('ry_talenttiryhma') : '') + (r.aktiivinen === false ? ' · ' + T('ry_arkistoitu') : '') + '</span></div>'
        + (voi ? '<div style="display:flex;gap:6px">' + '<button type="button" data-ry-muokkaa style="' + NAPPI + '" onclick="' + esc(opts.muokkaaFn + "('" + r.id + "')") + '">' + T('ry_muokkaa') + '</button>'
          + (r.aktiivinen === false ? '<button type="button" data-ry-palauta style="' + NAPPI + '" onclick="' + esc(opts.palautaFn + "('" + r.id + "')") + '">' + T('ry_palauta') + '</button>' : '<button type="button" data-ry-arkistoi style="' + NAPPI + '" onclick="' + esc(opts.arkistoiFn + "('" + r.id + "')") + '">' + T('ry_arkistoi') + '</button>') + '</div>' : '') + '</div>'
        + (typeof opts.valmentajaNimet === 'function' && opts.valmentajaNimet(r) ? '<div style="font-size:12px;color:var(--ink2);margin-top:4px">' + T('ry_valmentajat') + ': ' + esc(opts.valmentajaNimet(r)) + '</div>' : '')
        + (r.kuvaus ? '<div style="font-size:12px;color:var(--ink3);margin-top:3px">' + esc(r.kuvaus) + '</div>' : '') + '</div>';
    };
    return '<div data-ry-lista><div style="font-size:12.5px;color:var(--ink2);margin-bottom:12px;max-width:640px">' + T('ry_ohje') + '</div>'
      + (opts.voiLuoda ? '<div style="margin-bottom:14px"><button type="button" data-ry-uusi style="' + NAPPI_ENS + '" onclick="' + esc(opts.uusiFn) + '()">' + T('ry_uusi') + '</button></div>' : '')
      + (akt.length ? akt.map(rivi).join('') : '<div data-ry-tyhja style="font-size:13px;color:var(--ink3)">' + T('ry_ei_ryhmia') + '</div>') + arkisto.map(rivi).join('') + '</div>';
  }
  /* S: { id|null, nimi, tyyppi, kuvaus, pelaajat_id[], valmentajat[], haku, joukkue ('' = kaikki) }
     opts: { esc, t, pelaajat:[{id,nimi,joukkue}], joukkueet:[nimi], valmentajat:[{id,nimi,rooli}], nimiFn, tyyppiFn(v), kuvausFn(v), hakuFn(v), joukkueFn(v), valitseFn(id), lisaaNakyvatFn, tyhjennaFn, valmentajaFn(uid), tallennaFn, peruutaFn, saaTyypin:bool } */
  function tmRyhmaLomakeHTML(S, opts) {
    opts = opts || {}; S = S || {}; var esc = opts.esc || _esc, T = function (k) { return esc(_txt(opts, k)); }, saanto = S.tyyppi === 'saanto', valittu = {}; (S.pelaajat_id || []).forEach(function (id) { valittu[id] = 1; });
    var kentta = 'width:100%;box-sizing:border-box;background:var(--card);color:var(--ink);border:.5px solid var(--border);border-radius:8px;padding:8px;font-family:inherit;font-size:13px';
    var rasti = 'font-size:10px;text-transform:uppercase;letter-spacing:.05em;color:var(--ink3);margin:12px 0 4px';
    var haku = _norm(S.haku || ''), nakyvat = (opts.pelaajat || []).filter(function (p) { return (!S.joukkue || _norm(p.joukkue) === _norm(S.joukkue)) && (!haku || _norm(p.nimi).indexOf(haku) >= 0); });
    var h = '<div data-ry-lomake style="' + KORTTI + ';max-width:760px">'
      + '<div style="' + rasti + '">' + T('ry_nimi') + '</div><input data-ry-nimi type="text" maxlength="' + MAX_NIMI + '" value="' + esc(S.nimi || '') + '" oninput="' + esc(opts.nimiFn) + '(this.value)" style="' + kentta + '">'
      + '<div style="' + rasti + '">' + T('ry_kuvaus') + '</div><input data-ry-kuvaus type="text" maxlength="' + MAX_KUVAUS + '" value="' + esc(S.kuvaus || '') + '" oninput="' + esc(opts.kuvausFn) + '(this.value)" style="' + kentta + '">'
      + (opts.saaTyypin !== false ? '<div style="' + rasti + '">' + T('ry_tyyppi') + '</div><div style="display:flex;gap:8px;flex-wrap:wrap">'
        + ['lista', 'saanto'].map(function (ty) { return '<button type="button" data-ry-tyyppi="' + ty + '" aria-pressed="' + (S.tyyppi === ty ? 'true' : 'false') + '" style="' + NAPPI + (S.tyyppi === ty ? ';border-color:var(--teal);color:var(--teal)' : '') + '" onclick="' + esc(opts.tyyppiFn + "('" + ty + "')") + '">' + T(ty === 'lista' ? 'ry_tyyppi_lista' : 'ry_tyyppi_saanto') + '</button>'; }).join('') + '</div>' : '');
    if (saanto) h += '<div style="font-size:12.5px;color:var(--ink2);margin-top:10px">' + T('ry_saanto_ohje') + '</div>';
    else {
      h += '<div style="' + rasti + '">' + T('ry_pelaajat') + ' · ' + (S.pelaajat_id || []).length + ' ' + T('ry_valittu') + '</div>'
        + '<div style="display:flex;gap:8px;flex-wrap:wrap;margin-bottom:8px"><input data-ry-haku type="text" value="' + esc(S.haku || '') + '" placeholder="' + T('ry_haku') + '" oninput="' + esc(opts.hakuFn) + '(this.value)" style="' + kentta + ';flex:1 1 200px;width:auto">'
        + '<select data-ry-joukkue onchange="' + esc(opts.joukkueFn) + '(this.value)" style="' + kentta + ';flex:0 1 200px;width:auto"><option value="">' + T('ry_kaikki_joukkueet') + '</option>'
        + (opts.joukkueet || []).map(function (j) { return '<option value="' + esc(j) + '"' + (S.joukkue === j ? ' selected' : '') + '>' + esc(j) + '</option>'; }).join('') + '</select></div>'
        + '<div style="display:flex;gap:8px;margin-bottom:6px"><button type="button" data-ry-lisaa-nakyvat style="' + NAPPI + '" onclick="' + esc(opts.lisaaNakyvatFn) + '()">' + T('ry_lisaa_nakyvat') + '</button><button type="button" data-ry-tyhjenna style="' + NAPPI + '" onclick="' + esc(opts.tyhjennaFn) + '()">' + T('ry_tyhjenna') + '</button></div>'
        + '<div data-ry-pelaajalista style="max-height:260px;overflow:auto;border:.5px solid var(--border);border-radius:8px;padding:4px 10px">'
        + (nakyvat.length ? nakyvat.map(function (p) { return '<label style="display:flex;gap:8px;align-items:center;padding:5px 0;font-size:13px;color:var(--ink);cursor:pointer"><input type="checkbox" data-ry-pelaaja="' + esc(p.id) + '"' + (valittu[p.id] ? ' checked' : '') + ' onchange="' + esc(opts.valitseFn + "('" + p.id + "')") + '"> ' + esc(p.nimi) + ' <span style="color:var(--ink3);font-size:11.5px">' + esc(p.joukkue || '') + '</span></label>'; }).join('') : '<div style="font-size:12.5px;color:var(--ink3);padding:8px 0">' + T('ry_ei_pelaajia') + '</div>') + '</div>';
    }
    var vm = {}; (S.valmentajat || []).forEach(function (u) { vm[u] = 1; });
    h += '<div style="' + rasti + '">' + T('ry_valmentajat') + '</div><div style="font-size:12px;color:var(--ink3);margin-bottom:4px">' + T('ry_valmentajat_ohje') + '</div>'
      + ((opts.valmentajat || []).length ? '<div data-ry-valmentajat>' + opts.valmentajat.map(function (v) { return '<label style="display:flex;gap:8px;align-items:center;padding:4px 0;font-size:13px;color:var(--ink);cursor:pointer"><input type="checkbox" data-ry-valmentaja="' + esc(v.id) + '"' + (vm[v.id] ? ' checked' : '') + ' onchange="' + esc(opts.valmentajaFn + "('" + v.id + "')") + '"> ' + esc(v.nimi) + ' <span style="color:var(--ink3);font-size:11.5px">' + esc(v.rooli || '') + '</span></label>'; }).join('') + '</div>' : '<div style="font-size:12.5px;color:var(--ink3)">' + T('ry_ei_valmentajia') + '</div>')
      + '<div style="display:flex;gap:8px;margin-top:16px"><button type="button" data-ry-tallenna style="' + NAPPI_ENS + '" onclick="' + esc(opts.tallennaFn) + '()">' + T('ry_tallenna') + '</button><button type="button" data-ry-peruuta style="' + NAPPI + '" onclick="' + esc(opts.peruutaFn) + '()">' + T('ry_peruuta') + '</button></div></div>';
    return h;
  }

  var API = { FI: FI, MAX_NIMI: MAX_NIMI, MAX_PELAAJAT: MAX_PELAAJAT, MAX_VALMENTAJAT: MAX_VALMENTAJAT, tmRyhmaSaaLuoda: tmRyhmaSaaLuoda, tmRyhmaSaaMuokata: tmRyhmaSaaMuokata, tmRyhmaSyote: tmRyhmaSyote, tmRyhmaVirhe: tmRyhmaVirhe,
    tmRyhmaJasenet: tmRyhmaJasenet, tmKohdePelaajat: tmKohdePelaajat, tmTapahtumaOhi: tmTapahtumaOhi, tmKokoonpano: tmKokoonpano, tmSynkkaaTapahtumat: tmSynkkaaTapahtumat, tmTapahtumaKuuluuPelaajalle: tmTapahtumaKuuluuPelaajalle,
    tmRyhmaListaHTML: tmRyhmaListaHTML, tmRyhmaLomakeHTML: tmRyhmaLomakeHTML };
  if (typeof module !== 'undefined' && module.exports) module.exports = API; else root.TM_RYHMAT = API;
})(typeof window !== 'undefined' ? window : this);
