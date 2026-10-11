/* ════════════════════════════════════════════════════════════════════════
   tm_vp_koti_palsta.js — Kodin OIKEA PALSTA molemmissa vaiheissa (mockup 33; brief C). PURE. Dual-export: module.exports || window.TM_VP_KOTI_PALSTA.
     · tmKotiPalstaHTML(km, o) → HTML   km = { nyt, kalenteri[], nimet{id:nimi}, nimetK[], jaksot{nimi:{teema,vk:{vk,N}}}, palaveri:{valmiina,yht}|null, testi:{a,b,alku,loppu}|null, tauot:[{nimi,a,b}] }
       o = { esc, t, fn, call(esc,f,…), fill, plur, pvHki(ms, optiot), paivaAvain(ms), viikko(ms), lyhytT(nimi, kaikki), ms(x) }
   Tänään: tapahtuma · joukkueen tunniste · jakson nimi + viikko (jos joukkueella on jakso): "P13 · harjoitus · Haasta ja riistä vk 1/6".
   Tulossa 14 päivää: joukkueharjoitukset päivittäin YHDEKSI riviksi ("N harjoitusta" + tunnisteet), jokaisella tapahtumalla joukkuetunniste; AINA mukana jos osuu 14 päivän sisään:
   jaksopalaveri ("N/M valmiina"), testijakso ("N/M varannut päivän") ja seuran taukoviikot (katkoviivalaatikko). Taukoviikoille ei ole vielä datalähdettä: syöte env.tauot tai kalenteritapahtuma tyyppiä tauko/loma.
════════════════════════════════════════════════════════════════════════ */
(function (root) {
  'use strict';
  var DAY = 86400000, IKKUNA_PV = 14;
  function _tunnisteet(e, nimet, nimetK, o) {
    var ids = (Array.isArray(e.joukkueet) && e.joukkueet.length ? e.joukkueet : (e.joukkue ? [e.joukkue] : [])), nimiL = ids.map(function (id) { return (nimet && nimet[id]) || null; }).filter(Boolean);
    if (!nimiL.length && e.joukkue_nimi) nimiL = [e.joukkue_nimi];
    return nimiL.map(function (n) { return { tunniste: o.lyhytT(n, nimetK), nimi: n }; });
  }
  var TYYPPI_AVAIN = { harjoitus: 'harjoitus', ottelu: 'ottelu', turnaus: 'turnaus', testitapahtuma: 'testi', jaksopalaveri: 'jaksopalaveri', valmentajapalaveri: 'palaveri', tiimipalaveri: 'palaveri', mentorointitapaaminen: 'mentorointi', talenttileiri: 'leiri', leiri: 'leiri', idp_seuranta: 'seuranta', kalibraatiopaja: 'kalibraatiopaja', muu: 'tapahtuma' };

  function tmKotiPalstaHTML(km, o) {
    var esc = o.esc, t = o.t, fn = o.fn, nyt = km.nyt, raja = nyt + IKKUNA_PV * DAY, paiva = o.paivaAvain(nyt), nimet = km.nimet || {}, nimetK = km.nimetK || [], jaksot = km.jaksot || {};
    var tyyppiTeksti = function (e) { var a = TYYPPI_AVAIN[e.tyyppi]; return a ? t(a) : ''; };
    var lista = (km.kalenteri || []).filter(function (e) { return e && !e.poistettu; }).map(function (e) {
      var tn = _tunnisteet(e, nimet, nimetK, o), generinen = !e.nimi || (tyyppiTeksti(e) && String(e.nimi).trim().toLowerCase() === String(tyyppiTeksti(e)).toLowerCase());
      return { nimi: e.nimi, ms: o.ms(e.alkaa), tyyppi: e.tyyppi, tn: tn, harj: e.tyyppi === 'harjoitus' && tn.length > 0, teksti: generinen ? (tyyppiTeksti(e) || t('Tapahtuma')) : e.nimi };
    }).filter(function (e) { return (e.nimi || e.tyyppi) && e.ms != null && e.tyyppi !== 'seuran_tauko' && e.tyyppi !== 'tauko' && e.tyyppi !== 'loma'; }).sort(function (a, b) { return a.ms - b.ms; });
    var tagit = function (L) { var u = L.filter(function (x, i, a) { return a.findIndex(function (y) { return y.tunniste === x.tunniste; }) === i; }); return '<span class="kk-rtags">' + u.slice(0, 6).map(function (x) { return '<span class="kk-tag">' + esc(x.tunniste) + '</span>'; }).join('') + (u.length > 6 ? '<span class="kk-tag">+' + (u.length - 6) + '</span>' : '') + '</span>'; };
    var rivi = function (aika, otsikkoHtml, meta, w) { return '<div class="kk-rr' + (w ? ' w' : '') + '"><span class="kk-p">' + esc(aika) + '</span><span class="kk-rt"><span class="kk-rtt">' + otsikkoHtml + '</span>' + (meta ? '<span class="kk-m">' + esc(meta) + '</span>' : '') + '</span></div>'; };
    var jaksoMeta = function (e) { if (e.tn.length !== 1) return ''; var j = jaksot[e.tn[0].nimi]; return j && j.teema ? j.teema + (j.vk ? ' ' + o.fill(t('vk {vk}/{N}'), j.vk) : '') : ''; };
    var tapahtumaRivi = function (e, aika) {
      var ylk = function (x) { return x ? x.charAt(0).toUpperCase() + x.slice(1) : x; }, otsikko = e.tn.length === 1 ? '<b>' + esc(e.tn[0].tunniste) + '</b> · ' + esc(e.teksti) : (e.tn.length ? esc(e.teksti) + tagit(e.tn) : '<b>' + esc(ylk(e.teksti)) + '</b>'), meta = jaksoMeta(e);   // seuratason tapahtuma: otsikko isolla alkukirjaimella (Jaksopalaveri)
      if (e.tyyppi === 'jaksopalaveri' && km.palaveri && km.palaveri.yht > 0) meta = o.fill(t('{a}/{b} valmiina'), { a: km.palaveri.valmiina, b: km.palaveri.yht });
      return rivi(aika, otsikko, meta, false);
    };
    var koosta = function (L, aikaFn, max) {   // saman päivän joukkueharjoitukset (≥ 2) → YKSI rivi + tunnisteet
      var ut = [], harjPv = {}, tehty = {}; L.forEach(function (e) { if (e.harj) (harjPv[o.paivaAvain(e.ms)] = harjPv[o.paivaAvain(e.ms)] || []).push(e); });
      L.forEach(function (e) { var k = o.paivaAvain(e.ms);
        if (e.harj && harjPv[k].length >= 2) { if (tehty[k]) return; tehty[k] = 1; var G = harjPv[k], tn = []; G.forEach(function (x) { tn = tn.concat(x.tn); }); ut.push({ ms: e.ms, html: rivi(aikaFn(G[0].ms), esc(o.fill(t('{n} harjoitusta'), { n: G.length })) + tagit(tn), '', false) }); }
        else ut.push({ ms: e.ms, html: tapahtumaRivi(e, aikaFn(e.ms)) }); });
      return ut;
    };
    var aikaKlo = function (ms) { return o.pvHki(ms, { hour: '2-digit', minute: '2-digit', hourCycle: 'h23' }); }, pvF = function (ms) { return o.pvHki(ms, { weekday: 'short', day: 'numeric', month: 'numeric' }); };
    var tanaan = lista.filter(function (e) { return o.paivaAvain(e.ms) === paiva; }), tulossa = lista.filter(function (e) { return o.paivaAvain(e.ms) !== paiva && e.ms > nyt && e.ms <= raja; });
    var h = '<div class="kk-rail"><div><div class="kk-sh"><span class="kt-eb">' + esc(t('Tänään') + ' · ' + o.pvHki(nyt, { weekday: 'short', day: 'numeric', month: 'numeric' })) + '</span></div>'
      + (tanaan.length ? '<div class="kt-vl kk-list">' + koosta(tanaan, aikaKlo, 6).map(function (x) { return x.html; }).join('') + '</div>' : '<div class="kt-note">' + esc(t('Ei tapahtumia tänään.')) + '</div>') + '</div>';
    /* seuran taukoviikot (katkoviivalaatikko), jos osuvat 14 päivän sisään */
    (km.tauot || []).filter(function (x) { return x.b >= nyt - DAY && x.a <= raja; }).forEach(function (x) {
      var vkA = o.viikko(x.a), vkB = o.viikko(x.b), vk = vkA != null ? (vkB != null && vkB !== vkA ? o.fill(t('vk {a}–{b}'), { a: vkA, b: vkB }) : o.fill(t('vk {a}'), { a: vkA })) : '', pv = function (ms) { return o.pvHki(ms, { day: 'numeric', month: 'numeric' }); };
      h += '<div class="kk-tauko">' + esc((x.nimi || t('Tauko')) + (vk ? ' · ' + vk : '') + ' · ' + pv(x.a) + '–' + pv(x.b)) + '</div>';
    });
    /* tulossa: tapahtumat + testijakso (aina, jos osuu ikkunaan) */
    var rivit = koosta(tulossa, pvF, 99);
    if (km.testi && km.testi.alku != null && km.testi.loppu >= nyt && km.testi.alku <= raja) {
      var tj = km.testi, alkuMs = Math.max(tj.alku, nyt + 1);
      rivit.push({ ms: alkuMs, html: rivi(pvF(alkuMs), '<b>' + esc(t('Testijakso')) + '</b>', tj.b > 0 ? o.fill(t('{a}/{b} varannut päivän'), { a: tj.a, b: tj.b }) : '', false) });
    }
    rivit.sort(function (a, b) { return a.ms - b.ms; });
    h += '<div><div class="kk-sh"><span class="kt-eb">' + esc(t('Tulossa 14 päivää')) + '</span></div>'
      + (rivit.length ? '<div class="kt-vl kk-list">' + rivit.slice(0, 8).map(function (x) { return x.html; }).join('') + '</div>' : '<div class="kt-note">' + esc(t('Ei tapahtumia seuraavan 14 päivän aikana.')) + '</div>')
      + (fn.kalenteri ? '<button type="button" class="kk-lnk" style="margin-top:8px"' + o.call(esc, fn.kalenteri) + '>' + esc(t('Avaa kalenteri →')) + '</button>' : '') + '</div></div>';
    return h;
  }

  var CSS = [
    '.kk-rail{display:grid;gap:22px;align-content:start}.kk-rr{display:grid;grid-template-columns:72px minmax(0,1fr);gap:10px;padding:10px 12px;border-top:1px solid var(--border);font-size:var(--fs-body,14px)}.kk-rr:first-child{border-top:0}.kk-rr.w .kk-p{color:var(--amber)}',
    '.kk-p{font-size:var(--fs-meta,12.5px);color:var(--ink2);padding-top:2px}.kk-rt{display:grid;gap:1px;min-width:0}.kk-rt b{font-weight:600}.kk-rt .kk-m{display:block}.kk-rtags{display:inline-flex;gap:4px;flex-wrap:wrap;margin-left:8px;vertical-align:middle}.kk-rr .kk-tag{cursor:default;padding:0 5px}',
    '.kk-tauko{border:1px dashed var(--ink3);border-radius:6px;padding:10px 12px;font-size:var(--fs-meta,12.5px);color:var(--ink2)}'
  ].join('\n');

  var API = { CSS: CSS, tmKotiPalstaHTML: tmKotiPalstaHTML };
  if (typeof module !== 'undefined' && module.exports) module.exports = API;
  if (root) root.TM_VP_KOTI_PALSTA = API;
})(typeof window !== 'undefined' ? window : null);
