/* ════════════════════════════════════════════════════════════════════════
   tm_tanaan_signaali.js — V4b-2: Tänään-signaali (D48) (docs/CODE_BRIEF_V4_KEHITYSTYOPOYTA.md #11–#14; design 18 §3). PURE (ei Firebasea, ei DOMia).
   YKSI signaali + pieni toinen rivi. Järjestys (lukittu, taulukkotesti tests/v4b2_tanaan_signaali.test.js):
     1 kuorma_tarkista (§25) · 2 valinta tehty (Vahvista) · 3 suljettava · 4 valinta odottaa pelaajaa · 4b sitoumus odottaa (käsitesti 7.10.) · 5 viikkokatsaus ei vastattu · 6 havainto · 7 ylläpito · 8 ei tietoa
   Poikkeukset tmSeuraavaAskel-portaisiin (D48): kuorma voittaa aina; pelaajan odottama vahvistus (2) ohittaa valmentajan myöhässä olevan katselmuksen (3).
   Profiili (D50, joukkueet/{jid}.valmentajaprofiili, oletus 'oto'): vain sävy ja aikaikkuna — ammatti: "odottaa · N pv" (+ review_myohassa nostetaan signaaliksi), oto: "kun ehdit", ei aikaikkunaa, review_myohassa EI nosteta.
   Sunnuntain pyyntö valmentajalle = rivi 5 (K4-rytmi), EI ilmoitus/notifikaatio (ei uusia Rules-oikeuksia).
   tmTanaanSignaali(p, ctx) → { ensisijainen: S|null, toinen: S|null }   S = { avain, savy:'amber'|'teal'|'ok'|'neutraali'|'harmaa'|'hiljainen', teksti, nappi:{avain,teksti}|null, pv? }
     ctx: { nyt (Date|ms), profiili ('ammatti'|'oto'), askel (tmSeuraavaAskel-tulos|null), tila (tmJaksoTila|null; muuten lasketaan), vkEiVastattu (bool: K4 sunnuntai + ei vastattu), nimi, eiHavaintoa (bool: kaikki osat itsenäisesti → havaintoa ei pyydetä) }
     Teksteissä pelaajan nimi ja luvut valmiina (henkilökunta saa nähdä luvut). Tekstit opts.t:n läpi (fi-oletus tässä).
   Dual-export: module.exports || window.TM_TANAAN_SIGNAALI.
════════════════════════════════════════════════════════════════════════ */
(function (root) {
  'use strict';
  var FI = {
    ts_kuorma: 'Tarkista jakson kuorma', ts_kuorma_nappi: 'Tarkista jakson kuorma',
    ts_valinta_tehty: '{nimi} valitsi reitin {kirjain}', ts_valinta_tehty_oma: '{nimi} ehdotti omaa reittiä', ts_valinta_tehty_oto: ', vahvista kun ehdit', ts_vahvista_nappi: 'Vahvista jakso',
    ts_suljettava: 'Jakso valmis suljettavaksi', ts_suljettava_odottaa: 'odottaa · {pv} pv', ts_suljettava_oto: 'kun ehdit', ts_suljettava_myohassa: 'katselmus myöhässä', ts_sulje_nappi: 'Sulje jakso · 3 kysymystä',
    ts_valinta_odottaa: 'Valinta odottaa pelaajaa', ts_sitoumus_odottaa: 'Sitoumus odottaa pelaajaa', ts_askel_sitoumus_nappi: 'Vahvista sitoumus', ts_vk: 'Viikkokatsaus ei vastattu', ts_askel_sitoumus: 'Pelaaja on sitoutunut — vahvista sitoumus', ts_askel_ehdotus_odottaa: 'Valmentajan ehdotus odottaa tarkistusta', ts_askel_idp_jumissa: 'Kausitavoite on jumissa', ts_askel_valitavoite_valmis: 'Välitavoite saavutettu — valitse seuraava', ts_askel_review_eraantymassa: 'Katselmus erääntymässä', ts_askel_nappi: 'Avaa Polku',
    ts_havainto: 'Merkitse viikkohavainto', ts_havainto_nappi: 'Merkitse havainto',
    ts_yllapito: 'Ei toimenpiteitä juuri nyt', ts_yllapito_nappi: 'Avaa Polku', ts_ei_tietoa: 'Ei tietoa — aloita jakso', ts_aloita_nappi: 'Aloita jakso'
  };
  var JARJESTYS = ['kuorma', 'valinta_tehty', 'suljettava', 'valinta_odottaa', 'sitoumus_odottaa', 'vk_ei_vastattu', 'askel_muu', 'havainto', 'yllapito', 'ei_tietoa'];
  var MUUT = { sitoumus: 1, ehdotus_odottaa: 1, idp_jumissa: 1, valitavoite_valmis: 1, review_eraantymassa: 1 };
  var DAY = 86400000, IKKUNA_PV = 14;   // katselmusikkuna 2 vk (12 D21)

  function _txt(o, k) { var v = (o && typeof o.t === 'function') ? o.t(k) : k; return (v && v !== k) ? v : FI[k]; }
  function _fmt(s, m) { return String(s).replace(/\{(\w+)\}/g, function (_, k) { return m && m[k] != null ? m[k] : ''; }); }
  function _req(g, f) { try { return (typeof module !== 'undefined' && module.exports && typeof require === 'function') ? require(f) : (root && root[g]); } catch (e) { return root && root[g]; } }
  function _RV() { return _req('TM_REITIN_VALINTA', './tm_reitin_valinta.js'); }
  function _AJ() { return _req('TM_ALOITA_JAKSO', './tm_aloita_jakso.js'); }
  function _nytMs(ctx) { return ctx && ctx.nyt instanceof Date ? ctx.nyt.getTime() : (ctx && typeof ctx.nyt === 'number' ? ctx.nyt : Date.now()); }
  function _loppuMs(jf) {
    var a = jf && jf.alkoi ? new Date(jf.alkoi).getTime() : NaN, yht = Number(jf && jf.kesto_vk) > 0 ? Number(jf.kesto_vk) : 4;
    return isNaN(a) ? NaN : a + yht * 7 * DAY;
  }

  function tmOnAmmatti(profiili) { return profiili === 'ammatti'; }   // oletus (myös tuntematon arvo) = oto

  /* Kaikki täyttyvät signaalit D48-järjestyksessä (testit tarkistavat järjestyksen tästä). */
  function tmSignaalit(p, ctx, opts) {
    ctx = ctx || {}; opts = opts || {}; p = p || {};
    var T = function (k, m) { return _fmt(_txt(opts, k), m); }, ammatti = tmOnAmmatti(ctx.profiili), askel = ctx.askel || null, nyt = _nytMs(ctx);
    var jf = p.jaksofokus || null, RV = _RV(), AJ = _AJ();
    var tila = ctx.tila || (AJ && AJ.tmJaksoTila ? AJ.tmJaksoTila(p, { nyt: nyt }) : null);
    var r = RV && RV.tmHenkRivitila ? RV.tmHenkRivitila(p) : null, ulos = [];
    var nimi = ctx.nimi || p.etunimi || '';
    // 1 kuorma_tarkista (§25) — voittaa aina
    if (askel && askel.avain === 'kuorma_tarkista') ulos.push({ avain: 'kuorma', savy: 'amber', teksti: T('ts_kuorma'), nappi: { avain: 'kuorma', teksti: T('ts_kuorma_nappi') } });
    // 2 valinta tehty (K3) — pelaajan odottama vahvistus
    if (jf && jf.tila === 'valittavana' && r && r.tila === 'valittu') {
      var t2 = r.oma ? T('ts_valinta_tehty_oma', { nimi: nimi }) : T('ts_valinta_tehty', { nimi: nimi, kirjain: r.kirjain });
      ulos.push({ avain: 'valinta_tehty', savy: 'ok', teksti: t2 + (ammatti ? '' : T('ts_valinta_tehty_oto')), nappi: { avain: 'vahvista', teksti: T('ts_vahvista_nappi') } });
    }
    // 3 suljettava — jakso päättynyt (porras 4); ammatti: myös review_myohassa (porras 1)
    var paattynyt = (tila && tila.tila === 'paattynyt') || (askel && askel.avain === 'jakso_umpeutunut');
    var myohassa = ammatti && askel && askel.avain === 'review_myohassa';
    if (paattynyt || myohassa) {
      var loppu = _loppuMs(jf), pv = (paattynyt && !isNaN(loppu)) ? Math.max(0, Math.floor((nyt - loppu) / DAY)) : null;
      var lisa = ammatti ? ((pv != null && pv > IKKUNA_PV) || (!paattynyt && myohassa) ? T('ts_suljettava_myohassa') : (pv != null ? T('ts_suljettava_odottaa', { pv: pv }) : '')) : T('ts_suljettava_oto');
      ulos.push({ avain: 'suljettava', savy: ammatti && ((pv != null && pv > IKKUNA_PV) || !paattynyt) ? 'amber' : 'neutraali', teksti: T('ts_suljettava') + (lisa ? ' · ' + lisa : ''), pv: pv, nappi: { avain: 'sulje', teksti: T('ts_sulje_nappi') } });
    }
    // 4 valinta odottaa pelaajaa — tiedoksi, ei nappia
    if (jf && jf.tila === 'valittavana' && r && r.tila === 'odottaa') ulos.push({ avain: 'valinta_odottaa', savy: 'neutraali', teksti: T('ts_valinta_odottaa'), nappi: null });
    // 4b sitoumus odottaa (P6) — jakso alkanut, pelaaja ei ole vielä sitoutunut (tmJaksoTila 'vahvistettu', otsikkorivin "sitoumus odottaa"); tiedoksi, pelaajan asia → ei nappia
    if (tila && tila.tila === 'vahvistettu') ulos.push({ avain: 'sitoumus_odottaa', savy: 'neutraali', teksti: T('ts_sitoumus_odottaa'), nappi: null });
    // 5 viikkokatsaus ei vastattu (K4) — pieni rivi, pelaajan asia
    if (ctx.vkEiVastattu === true) ulos.push({ avain: 'vk_ei_vastattu', savy: 'neutraali', teksti: T('ts_vk'), nappi: null });
    // 5b muut toimenpideportaat (tmSeuraavaAskel 2–8): ilman tätä jakso voi jäädä KOKONAAN ilman signaalia (käsitesti 7.10.: askel 'sitoumus' = pelaaja sitoutui, vahvistus puuttuu). Oto: ei aikaikkunoita → review_eraantymassa ei nosteta.
    if (askel && MUUT[askel.avain] && !(askel.avain === 'review_eraantymassa' && !ammatti)) ulos.push({ avain: 'askel_muu', askel: askel.avain, savy: 'teal', teksti: T('ts_askel_' + askel.avain), nappi: askel.avain === 'sitoumus' ? { avain: 'vahvista_sitoumus', teksti: T('ts_askel_sitoumus_nappi') } : { avain: 'avaa_polku', teksti: T('ts_askel_nappi') } });   // A1: sitoumuksen vahvistus suoraan signaalista (VP + Master)
    // 6 havainto (porras 9)
    if (askel && askel.avain === 'havainto' && !ctx.eiHavaintoa) ulos.push({ avain: 'havainto', savy: 'teal', teksti: T('ts_havainto'), nappi: { avain: 'havainto', teksti: T('ts_havainto_nappi') }, pv: askel.peruste && askel.peruste.paivia != null ? askel.peruste.paivia : null });
    // 7 ylläpito — käynnissä oleva jakso, ei muuta toimenpidettä (hiljainen)
    var kaynnissa = !!(jf && (jf.konsepti_avain || jf.konsepti_nimi) && jf.tila !== 'valittavana' && !paattynyt);
    if (kaynnissa && !ulos.length) ulos.push({ avain: 'yllapito', savy: 'hiljainen', teksti: T('ts_yllapito'), nappi: { avain: 'avaa_polku', teksti: T('ts_yllapito_nappi') } });
    // 8 ei tietoa (porras 5) — ei jaksoa eikä tarjousta
    if (!jf || !(jf.konsepti_avain || jf.konsepti_nimi || jf.tila === 'valittavana')) ulos.push({ avain: 'ei_tietoa', savy: 'harmaa', teksti: T('ts_ei_tietoa'), nappi: { avain: 'aloita', teksti: T('ts_aloita_nappi') } });
    return ulos;
  }

  function tmTanaanSignaali(p, ctx, opts) {
    var s = tmSignaalit(p, ctx, opts);
    var ensisijainen = s[0] || null;
    // pieni toinen rivi: seuraava täyttyvä, mutta ei hiljaista ylläpitoa (ei kerrottavaa) eikä "ei tietoa" -vaihtoehtoa jo ensimmäisen rinnalle
    var toinen = null; for (var i = 1; i < s.length; i++) if (s[i].avain !== 'yllapito' && s[i].avain !== 'ei_tietoa') { toinen = s[i]; break; }
    return { ensisijainen: ensisijainen, toinen: toinen };
  }

  /* HTML (Tänään, mockup 22 osio 1 .ev.sig): ensisijainen kortti — yläotsikko · otsikko · perustelu (.why) · nappi · sisältö (viikkohavaintopaneeli, D100) · alarivit (.second: sitoumus + toinen signaali).
     opts: { esc, t, toimiFn, pid, hk, why (teksti), sisalto (valmis HTML, paneeli), alarivit (tekstit[]) }. Sävy: amber → .w (varoitus), teal/ok → oletus, muut → .n (katkoviiva). Vain tokenit; luokat tm_kehitystyopoyta.js:n CSS:ssä. */
  function tmTanaanSignaaliHTML(x, opts) {
    opts = opts || {}; if (!x || !x.ensisijainen) return '';
    var esc = opts.esc || function (s) { return String(s == null ? '' : s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;'); };
    var hk = typeof opts.hk === 'function' ? opts.hk : function (h) { return h; };   // A8: Pelaajan silmin — luvut .kt-hk:ksi (tmKtHk)
    var s = x.ensisijainen, cls = s.savy === 'amber' ? ' w' : (s.savy === 'teal' || s.savy === 'ok' ? '' : ' n');
    var nappi = s.nappi && opts.toimiFn ? '<div><button type="button" class="kt-btn" data-kt-signaali-nappi="' + esc(s.nappi.avain) + '" onclick="' + esc(opts.toimiFn + "('" + (opts.pid || '') + "','" + s.nappi.avain + "')") + '">' + esc(s.nappi.teksti) + '</button></div>' : '';
    var rivit = (Array.isArray(opts.alarivit) ? opts.alarivit : []).concat(x.toinen ? [x.toinen.teksti] : []).filter(Boolean);
    var toinen = rivit.length ? '<div class="kt-sig-second"' + (x.toinen ? ' data-kt-signaali-toinen="' + esc(x.toinen.avain) + '"' : '') + '>' + rivit.map(function (r) { return '<div>' + hk(esc(r)) + '</div>'; }).join('') + '</div>' : '';
    return '<div class="kt-sig' + cls + '" data-kt-signaali="' + esc(s.avain) + '"><span class="kt-eb">' + esc(_txt(opts, 'ts_otsikko')) + '</span><div class="kt-sig-h">' + hk(esc(s.teksti)) + '</div>'
      + (opts.why ? '<div class="kt-sig-why">' + hk(esc(opts.why)) + '</div>' : '') + nappi + (opts.sisalto || '') + toinen + '</div>';
  }
  FI.ts_otsikko = 'Seuraava askel';

  var API = { FI: FI, JARJESTYS: JARJESTYS, IKKUNA_PV: IKKUNA_PV, tmOnAmmatti: tmOnAmmatti, tmSignaalit: tmSignaalit, tmTanaanSignaali: tmTanaanSignaali, tmTanaanSignaaliHTML: tmTanaanSignaaliHTML };
  if (typeof module !== 'undefined' && module.exports) module.exports = API; else root.TM_TANAAN_SIGNAALI = API;
})(typeof window !== 'undefined' ? window : this);
