/* ════════════════════════════════════════════════════════════════════════
   tm_viikkokatsaus.js — K4 (docs/CODE_BRIEF_K4_VIIKKOKATSAUS.md; design 09 "Sunnuntai · viikkokatsaus", 10 K4, 12 D21): PURE (ei Firebasea, ei DOM:ia).
   Tallennus: seurat/{sid}/pelaajat/{pid}/viikkokatsaukset/{sunnuntain pvm} = { vk, jakso_alkoi, vastaukset:[{osa, teksti, arvo}], lause?, luotu } (Rules v3.44; EI kirjaukset/{pvm}).
   PELAAJA
   · tmVkNakyy(p, ctx{tanaan, ikavaihe, vastattu})   → boolean: sunnuntai (tanaan = paikallinen päivä) + jakso käynnissä + ei Leikkijä (K5) + ei jo vastattu. Maanantaina ei muistuteta (§7.22).
   · tmVkKysymykset(jf, ctx{kaanon})                  → [{osa:'A'|'B'|'C', teksti}] 1–3 (osat K1:n tavoin: jaksofokus.osat → konsepti-kpi); ei osia → yksi yleiskysymys {osa:'jakso'}.
   · tmVkLausePelaaja(s) / tmVkLauseValmentaja(s)     → { ok, teksti|null, syy } — ≤140 merkkiä + KIELLETYT; valmentajan lause lisäksi K1:n perustelun mittaus-/lukutarkistus (ei lukuja, X/Y, taso N).
   · tmVkLauseVirhe(syy, opts)                        → virheteksti toastiin (pitka | luku | sana)
   · tmVkTallennusolio(p, valinnat, lause, ctx)       → { id: sunnuntain pvm, data:{vk, jakso_alkoi, vastaukset, lause?} } | null  (adapteri lisää luotu = serverTimestamp(); Rules vaatii luotu == request.time)
   · tmVkKorttiHTML / tmVkKiitosHTML                  → "Miten osat näkyivät pelissä?" (pill3: Onnistui usein · Joskus · Ei vielä; ei lukuja/asteikkoa) / kiitosrivi
   · tmVkPaatos(p, ctx{tanaan}) + tmVkPaatosHTML      → jakson päätöskortti "Hyvä jakso" + valmentajan lause (jaksofokus_historia[-1].lause) tai "Hyvä jakso, {nimi} tehty"; ei nappia; piiloon kun uusi jakso alkaa.
   HENKILÖKUNTA (saa nähdä luvut; pelaaja ei, §7.22)
   · tmVkJaksoAlkoi(jf)                               → 'YYYY-MM-DD' (kysely where jakso_alkoi == …)
   · tmVkTiivistelma(docs) → [{osa, teksti, usein, joskus, ei_viela, n, rivi:'A: usein 3/4 viikkoa'}]   · tmVkHenkilokuntaHTML(docs, opts) → osio "Pelaajan viikkokatsaukset"
   Tekstit opts.t:n läpi (avain → fi-oletus tässä; sv-avaimet määrittelemättä → Geminin lista). Vain tokenit (ei hex). Dual-export: module.exports || window.TM_VIIKKOKATSAUS.
════════════════════════════════════════════════════════════════════════ */
(function (root) {
  'use strict';
  var FI = {
    k4_otsikko: 'Miten osat näkyivät pelissä?', k4_ohje: 'Vastauksesi näkyy valmentajan katselmuksessa.', k4_yleinen: 'Miten jakso on näkynyt pelissä?',
    k4_usein: 'Onnistui usein', k4_joskus: 'Joskus', k4_ei_viela: 'Ei vielä', k4_lause: 'Haluatko kertoa jotain? (valinnainen)', k4_valmis: 'Valmis', k4_kiitos: 'Kiitos, vastauksesi on tallessa.',
    k4_hyva_jakso: 'Hyvä jakso', k4_tehty: 'tehty', k4_valmentajalta: 'Valmentajalta',
    k4_vk_otsikko: 'Pelaajan viikkokatsaukset', k4_vk_viikko: 'Viikko', k4_vk_ei: 'Ei vielä viikkokatsauksia tältä jaksolta.', k4_vk_usein: 'usein', k4_vk_joskus: 'joskus', k4_vk_ei_viela: 'ei vielä',
    k4_pelaaja_lause_virhe: 'Lauseessa on sana, jota ei voi tallentaa. Kirjoita se toisin.',
    k4_lause_valm: 'Lause pelaajalle (valinnainen, enintään 140 merkkiä)', k4_lause_valm_ohje: 'Näkyy pelaajalle Tänään-sivulla. Ei lukuja, ei vertailua.',
    k4_lause_virhe_pitka: 'Lause on liian pitkä (enintään 140 merkkiä).', k4_lause_virhe_sana: 'Lause sisältää sanan, jota pelaajalle ei näytetä.', k4_lause_virhe_luku: 'Lause ei saa sisältää lukuja tai mittausmuotoja.'
  };
  var MAX = 140, ARVOT = ['usein', 'joskus', 'ei_viela'], DAY = 86400000;
  function _esc(s) { return String(s == null ? '' : s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;'); }
  function _txt(o, k) { var v = (o && typeof o.t === 'function') ? o.t(k) : k; return (v && v !== k) ? v : FI[k]; }
  function _req(g, f) { try { return (typeof module !== 'undefined' && module.exports && typeof require === 'function') ? require(f) : (root && root[g]); } catch (e) { return root && root[g]; } }
  function _TK() { return _req('TM_TANAAN_KENTTA', './tm_tanaan_kentta.js'); }
  function _KI() { return _req('TM_KIELLETYT', './tm_kielletyt.js'); }
  function _TS() { return _req('TM_TAMAN_TUEKSI', './tm_taman_tueksi.js'); }
  function _isoPaiva(d) { return d.getFullYear() + '-' + String(d.getMonth() + 1).padStart(2, '0') + '-' + String(d.getDate()).padStart(2, '0'); }
  function _paivaNum(iso) { var m = /^(\d{4})-(\d{2})-(\d{2})/.exec(String(iso || '')); return m ? Date.UTC(+m[1], +m[2] - 1, +m[3]) / DAY : null; }
  function _sunnuntai(iso) { var n = _paivaNum(iso); return n != null && new Date(n * DAY).getUTCDay() === 0; }

  /* Jakson alkupäivä paikallisena päivänä (sama logiikka kuin tm_tanaan_kentta._alkuIso: alku 'YYYY-MM-DD' | alkoi ISO → paikalliset komponentit). */
  function tmVkJaksoAlkoi(jf) {
    if (jf && typeof jf.alku === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(jf.alku)) return jf.alku;
    var d = jf && jf.alkoi ? new Date(jf.alkoi) : null; return d && !isNaN(d.getTime()) ? _isoPaiva(d) : null;
  }

  function tmVkNakyy(p, ctx) {
    ctx = ctx || {}; var TK = _TK(); if (!TK || !ctx.tanaan || ctx.vastattu === true || ctx.ikavaihe === 'leikkija') return false;
    var x = TK.tmTanaanTila(p, { tanaan: ctx.tanaan });
    return x.tila === 'sunnuntai' && _sunnuntai(ctx.tanaan) && !!tmVkJaksoAlkoi(p && p.jaksofokus);
  }

  function tmVkKysymykset(jf, ctx) {
    var TK = _TK(), osat = TK ? TK.tmTanaanOsat(jf, ctx) : [];
    if (osat.length) return osat.slice(0, 3).map(function (o) { return { osa: String(o.k).toUpperCase(), teksti: o.teksti }; });
    return [{ osa: 'jakso', teksti: FI.k4_yleinen }];
  }

  function _lauseRunko(s, valm) {
    var t = (typeof s === 'string') ? s.trim() : '';
    if (!t) return { ok: true, teksti: null, syy: null };
    if (t.length > MAX) return { ok: false, teksti: null, syy: 'pitka' };
    var KI = _KI(); if (!KI || typeof KI.tmJaksoTekstiKelpaa !== 'function') return { ok: false, teksti: null, syy: 'vartija_puuttuu' };   // vartija puuttuu → ei hyväksytä (suljettu virhe)
    if (!KI.tmJaksoTekstiKelpaa(t).ok) return { ok: false, teksti: null, syy: 'sana' };
    if (valm) {   // sama tarkistus kuin K1:n perustelussa (mittaus-/lukumuodot, lähdesanat) — tmTukiPerustelu palauttaa null hylätylle
      var TS = _TS(); if (!TS || typeof TS.tmTukiPerustelu !== 'function') return { ok: false, teksti: null, syy: 'vartija_puuttuu' };
      if (TS.tmTukiPerustelu(t) === null) return { ok: false, teksti: null, syy: 'luku' };
    }
    return { ok: true, teksti: t, syy: null };
  }
  function tmVkLausePelaaja(s) { return _lauseRunko(s, false); }
  function tmVkLauseValmentaja(s) { return _lauseRunko(s, true); }

  function tmVkLauseVirhe(syy, opts) { return _txt(opts, syy === 'pitka' ? 'k4_lause_virhe_pitka' : syy === 'luku' ? 'k4_lause_virhe_luku' : 'k4_lause_virhe_sana'); }

  function tmVkTallennusolio(p, valinnat, lause, ctx) {
    ctx = ctx || {}; var jf = p && p.jaksofokus, TK = _TK(); if (!TK || !jf || !ctx.tanaan) return null;
    var x = TK.tmTanaanTila(p, { tanaan: ctx.tanaan }), alkoi = tmVkJaksoAlkoi(jf); if (!alkoi || !_sunnuntai(ctx.tanaan)) return null;
    var vk = x.viikko ? x.viikko.n : Math.max(1, Math.floor((_paivaNum(ctx.tanaan) - _paivaNum(alkoi)) / 7) + 1);   // kestoa ei aina ole → viikko alkupäivästä
    var vastaukset = [];
    tmVkKysymykset(jf, ctx).forEach(function (q) {
      var a = valinnat && valinnat[q.osa]; if (ARVOT.indexOf(a) < 0) return;
      vastaukset.push({ osa: q.osa, teksti: q.teksti, arvo: a });   // teksti = kopio (konsepti voi muuttua)
    });
    if (!vastaukset.length) return null;
    var l = tmVkLausePelaaja(lause); if (!l.ok) return null;
    var data = { vk: Math.min(vk, 52), jakso_alkoi: alkoi, vastaukset: vastaukset };
    if (l.teksti) data.lause = l.teksti;
    return { id: ctx.tanaan, data: data };
  }

  var PILL = 'flex:1;padding:12px 4px;border-radius:10px;font-family:var(--font-k);font-size:13px;font-weight:600;cursor:pointer;';
  function tmVkKorttiHTML(kysymykset, tila, opts) {
    opts = opts || {}; tila = tila || {}; var esc = opts.esc || _esc, v = tila.valinnat || {}, jokin = false;
    var rivit = (kysymykset || []).map(function (q) {
      if (ARVOT.indexOf(v[q.osa]) >= 0) jokin = true;
      var napit = ARVOT.map(function (a) {
        var valittu = v[q.osa] === a;
        return '<button type="button" data-vk-osa="' + esc(q.osa) + '" data-vk-arvo="' + a + '" aria-pressed="' + (valittu ? 'true' : 'false') + '" onclick="_p7VkValitse(\'' + esc(q.osa) + '\',\'' + a + '\')" style="' + PILL
          + (valittu ? 'background:var(--teal);color:var(--text);border:.5px solid var(--teal-d)' : 'background:none;color:var(--ink2);border:.5px solid var(--border2)') + '">' + esc(_txt(opts, 'k4_' + a)) + '</button>';
      }).join('');
      return '<div class="k4-osa" style="padding:12px 0;border-top:.5px solid var(--border)"><div style="display:flex;gap:10px;align-items:baseline;margin-bottom:8px">'
        + (q.osa.length === 1 ? '<span style="font-family:var(--font-k);font-size:12px;font-weight:600;color:var(--teal-d);flex:0 0 14px">' + esc(q.osa) + '</span>' : '')
        + '<span style="font-size:14px;color:var(--text);line-height:1.4">' + esc(q.teksti) + '</span></div><div style="display:flex;gap:8px">' + napit + '</div></div>';
    }).join('');
    return '<section id="p7VkKortti" class="k4-katsaus" style="margin:12px 20px;padding:16px;background:var(--card);border:.5px solid var(--border);border-radius:12px">'
      + '<div style="font-family:var(--font-k);font-size:17px;font-weight:600;color:var(--text);line-height:1.3">' + esc(_txt(opts, 'k4_otsikko')) + '</div>'
      + '<div style="font-size:12px;color:var(--ink2);line-height:1.5;margin:4px 0 8px">' + esc(_txt(opts, 'k4_ohje')) + '</div>' + rivit
      + '<label style="display:block;font-size:11px;font-weight:600;letter-spacing:.14em;text-transform:uppercase;color:var(--ink3);margin:10px 0 6px" for="p7VkLause">' + esc(_txt(opts, 'k4_lause')) + '</label>'
      + '<textarea id="p7VkLause" rows="2" maxlength="' + MAX + '" oninput="_p7VkLause(this.value)" style="width:100%;box-sizing:border-box;background:var(--surface2);color:var(--text);border:.5px solid var(--border2);border-radius:8px;padding:10px;font-family:inherit;font-size:14px;resize:none">' + esc(tila.lause || '') + '</textarea>'
      + '<button id="p7VkValmis" type="button" class="btn-p" onclick="_p7VkTallenna()" style="margin-top:12px"' + (jokin && !tila.tallentaa ? '' : ' disabled') + '>' + esc(_txt(opts, 'k4_valmis')) + '</button></section>';
  }
  function tmVkKiitosHTML(opts) {
    opts = opts || {}; var esc = opts.esc || _esc;
    return '<section id="p7VkKortti" class="k4-kiitos" style="margin:12px 20px;padding:14px 16px;background:var(--card);border:.5px solid var(--border);border-radius:12px;font-size:14px;color:var(--text)">' + esc(_txt(opts, 'k4_kiitos')) + '</section>';
  }

  /* Jakson päätöskortin tila. null = ei korttia (jakso käynnissä / ei tietoa). 'lause' | 'ei_lausetta'. */
  function tmVkPaatos(p, ctx) {
    ctx = ctx || {}; var TK = _TK(); if (!TK || !p) return null;
    var x = TK.tmTanaanTila(p, { tanaan: ctx.tanaan });
    if (x.tila === 'jakso' || x.tila === 'sunnuntai') return null;   // uusi jakso alkanut / käynnissä → kortti pois
    var jf = p.jaksofokus, hist = Array.isArray(p.jaksofokus_historia) ? p.jaksofokus_historia : [], rivi = hist.length ? hist[hist.length - 1] : null;
    var nimiJf = jf && typeof jf.konsepti_nimi === 'string' && jf.konsepti_nimi.trim() ? jf.konsepti_nimi.trim() : null;
    if (nimiJf && jf.tila !== 'valittavana') return { tila: 'ei_lausetta', nimi: nimiJf, lause: null };   // umpeutunut mutta sulkematta → ei suljettua riviä, ei lausetta
    if (!rivi || typeof rivi !== 'object') return null;
    var nimi = typeof rivi.konsepti_nimi === 'string' && rivi.konsepti_nimi.trim() ? rivi.konsepti_nimi.trim() : null;
    var l = tmVkLausePelaaja(rivi.lause);   // puolustava: vanha/käsin kirjoitettu rivi ei saa tuoda kiellettyä tekstiä pelaajalle
    return l.ok && l.teksti ? { tila: 'lause', nimi: nimi, lause: l.teksti } : { tila: 'ei_lausetta', nimi: nimi, lause: null };
  }
  function tmVkPaatosHTML(x, opts) {
    opts = opts || {}; var esc = opts.esc || _esc;
    if (!x) return opts.lisaHTML ? '<section class="k4-paatos" data-k4-tila="ei_korttia" style="margin:12px 20px;padding:18px 16px;background:var(--card);border:.5px solid var(--teal-brd, var(--border2));border-radius:12px">' + opts.lisaHTML + '</section>' : '';   // K3: valintakortti ilman päätöskorttia
    var otsikko = x.tila === 'lause' ? _txt(opts, 'k4_hyva_jakso') : (_txt(opts, 'k4_hyva_jakso') + (x.nimi ? ', ' + x.nimi : '') + ' ' + _txt(opts, 'k4_tehty'));
    return '<section class="k4-paatos" data-k4-tila="' + esc(x.tila) + '" style="margin:12px 20px;padding:18px 16px;background:var(--card);border:.5px solid var(--teal-brd, var(--border2));border-radius:12px">'
      + '<div style="font-family:var(--font-k);font-size:22px;font-weight:700;color:var(--text);line-height:1.2">' + esc(otsikko) + '</div>'
      + (x.tila === 'lause' ? (x.nimi ? '<div style="font-size:13px;color:var(--ink2);margin-top:4px">' + esc(x.nimi) + '</div>' : '')
        + '<div style="font-size:11px;font-weight:600;letter-spacing:.14em;text-transform:uppercase;color:var(--teal-d);margin-top:12px">' + esc(_txt(opts, 'k4_valmentajalta')) + '</div>'
        + '<div style="font-family:var(--font-k);font-size:16px;color:var(--text);line-height:1.45;margin-top:4px;white-space:pre-wrap">' + esc(x.lause) + '</div>' : '') + (opts.lisaHTML || '') + '</section>';   // K3: lisaHTML = "Valitse seuraava reitti" / "Valintasi on valmentajalla"
  }

  /* ── Henkilökunta ── docs: [{ id:'YYYY-MM-DD', vk, vastaukset:[{osa,teksti,arvo}], lause? }] */
  function _jarjesta(docs) { return (Array.isArray(docs) ? docs : []).filter(function (d) { return d && Array.isArray(d.vastaukset); }).slice().sort(function (a, b) { return String(a.id || '') < String(b.id || '') ? -1 : 1; }); }
  function tmVkTiivistelma(docs) {
    var kartta = {}, jarj = [];
    _jarjesta(docs).forEach(function (d) {
      d.vastaukset.forEach(function (v) {
        if (!v || ARVOT.indexOf(v.arvo) < 0) return;
        var o = kartta[v.osa]; if (!o) { o = kartta[v.osa] = { osa: v.osa, teksti: v.teksti || '', usein: 0, joskus: 0, ei_viela: 0, n: 0 }; jarj.push(o); }
        o[v.arvo]++; o.n++; o.teksti = v.teksti || o.teksti;
      });
    });
    return jarj.map(function (o) { o.rivi = (o.osa.length === 1 ? o.osa + ': ' : '') + 'usein ' + o.usein + '/' + o.n + ' viikkoa'; return o; });
  }
  function tmVkHenkilokuntaHTML(docs, opts) {
    opts = opts || {}; var esc = opts.esc || _esc, jarj = _jarjesta(docs), T = function (k) { return esc(_txt(opts, k)); };
    var rasti = 'font-size:10px;letter-spacing:.06em;text-transform:uppercase;color:var(--ink3)';
    if (!jarj.length) return '<div class="k4-hk" style="margin-top:12px;border-top:.5px solid var(--border);padding-top:10px"><div style="' + rasti + ';margin-bottom:6px">' + T('k4_vk_otsikko') + '</div><div style="font-size:12px;color:var(--ink3)">' + T('k4_vk_ei') + '</div></div>';
    var tiiv = tmVkTiivistelma(jarj).map(function (o) { return '<div style="font-size:12px;color:var(--text)">' + esc(o.rivi) + '</div>'; }).join('');
    var nimi = { usein: T('k4_vk_usein'), joskus: T('k4_vk_joskus'), ei_viela: T('k4_vk_ei_viela') };
    var viikot = jarj.map(function (d) {
      return '<div style="padding:6px 0;border-top:.5px solid var(--border)"><div style="font-size:11px;color:var(--ink3)">' + T('k4_vk_viikko') + ' ' + esc(d.vk) + ' · ' + esc(d.id) + '</div>'
        + d.vastaukset.map(function (v) { return '<div style="font-size:12px;color:var(--text)">' + (v.osa && v.osa.length === 1 ? esc(v.osa) + ': ' : '') + esc(v.teksti) + ' — <b>' + (nimi[v.arvo] || esc(v.arvo)) + '</b></div>'; }).join('')
        + (d.lause ? '<div style="font-size:12px;color:var(--ink2);font-style:italic;margin-top:2px">“' + esc(d.lause) + '”</div>' : '') + '</div>';
    }).join('');
    return '<div class="k4-hk" style="margin-top:12px;border-top:.5px solid var(--border);padding-top:10px"><div style="' + rasti + ';margin-bottom:6px">' + T('k4_vk_otsikko') + '</div>' + tiiv + '<div style="margin-top:6px">' + viikot + '</div></div>';
  }

  var API = { FI: FI, MAX_LAUSE: MAX, tmVkJaksoAlkoi: tmVkJaksoAlkoi, tmVkNakyy: tmVkNakyy, tmVkKysymykset: tmVkKysymykset, tmVkLausePelaaja: tmVkLausePelaaja, tmVkLauseValmentaja: tmVkLauseValmentaja, tmVkLauseVirhe: tmVkLauseVirhe, tmVkTallennusolio: tmVkTallennusolio,
    tmVkKorttiHTML: tmVkKorttiHTML, tmVkKiitosHTML: tmVkKiitosHTML, tmVkPaatos: tmVkPaatos, tmVkPaatosHTML: tmVkPaatosHTML, tmVkTiivistelma: tmVkTiivistelma, tmVkHenkilokuntaHTML: tmVkHenkilokuntaHTML };
  if (typeof module !== 'undefined' && module.exports) module.exports = API; else root.TM_VIIKKOKATSAUS = API;
})(typeof window !== 'undefined' ? window : this);
