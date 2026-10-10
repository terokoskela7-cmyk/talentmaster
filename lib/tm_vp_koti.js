/* ════════════════════════════════════════════════════════════════════════
   tm_vp_koti.js — VP:n KOTI vaiheittain (docs/CODE_BRIEF_KOTI_TILANNE_V2.md PR B; mockup 33 "Käynnistys · KPV"; D164–D167, D169). PURE: ei Firebasea, ei DOM:ia.
   Dual-export: module.exports || window.TM_VP_KOTI. Adapteri VP_v25:ssä (_renderKotiPulssi): vain kytkentä; Rytmi-vaihe (PR D) piirtyy toistaiseksi lib/tm_seuran_pulssi.js:llä.
     · tmKotiVaihe(m)                         → 'kaynnistys' | 'rytmi'   m = tmPulssiRivit-malli. Käynnistys kun ALLE 1/3 joukkueista (joissa on pelaajia) on jaksolla (D164); 0 joukkuetta = käynnistys. Ei käsivalintaa.
     · tmKotiKaynnistysMalli(m, env)          → { joukkueita, jaksolla, askeleet[3], viikolla[], jaksolla_rivit[], odottaa[], rail }   env = { yhteensa, koosteJ, testit, nimet, kalenteri, viestit, nytMs, seuraNimi }
     · tmKotiKaynnistysHTML(km, opts)         → { main, rail }   (opts = { t, esc, pika, auki, fn:{aloitaJaksot,kutsu,testit,joukkue,viesti,tilanne,kalenteri,paivita,demo,auki} })
     · tmKotiDemo(nytMs)                      → FC Demo (keksitty, D167): { koosteet, ensin, kalenteri, seuranNimi } — vain muistissa, ei koskaan oikean datan seassa
   Luvut: ei prosentteja eikä 0/0 (D125, PR A:n laatuportti) — "a/b"; perheluvut riveillä vain kun joukkueen suostumuskattavuus ≥ 70 % (muuten "perheitä mukana x/y").
   0 pelaajan joukkueet eivät näy Kodissa (§7.18). Komponentit lib/tm_kt_komponentit.js; vain olemassa olevat tokenit; koot --fs-* (D169).
════════════════════════════════════════════════════════════════════════ */
(function (root) {
  'use strict';
  var DAY = 86400000, PIENI = 5, KATTAVUUS_PERHE = 0.7, PERHEET_VALMIS = 0.7, TESTIT_VALMIS = 2 / 3, ODOTTAA_NAYTA = 14, VIIKOLLA_MAX = 5;
  function _esc(s) { return String(s == null ? '' : s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;'); }
  function _tt(o) { return o && typeof o.t === 'function' ? o.t : function (k) { return k; }; }
  function _fill(s, v) { return String(s).replace(/\{(\w+)\}/g, function (m, k) { return v && v[k] != null ? v[k] : m; }); }
  function _ms(x) { if (x == null) return null; if (typeof x === 'number') return x; if (typeof x.toMillis === 'function') return x.toMillis(); if (typeof x.toDate === 'function') return x.toDate().getTime(); if (typeof x.seconds === 'number') return x.seconds * 1000; var t = Date.parse(x); return isFinite(t) ? t : null; }
  function _req(g, f) { try { return (typeof module !== 'undefined' && module.exports && typeof require === 'function') ? require(f) : (root && root[g]); } catch (e) { return root && root[g]; } }
  function _V() { var V = _req('TM_VIIKKO', './tm_viikko.js'); if (!V || typeof V.tmIsoViikkoMs !== 'function') throw new Error('TM_VIIKKO puuttuu: lataa lib/tm_viikko.js ENNEN tm_vp_koti.js:ää'); return V; }
  /* Joukkueen lyhyt tunniste (P13, T14, P12 harraste → P12) — sama sääntö kuin Tilanteessa */
  function lyhyt(nimi) { var s = String(nimi == null ? '' : nimi).trim().split(/\s+/), i = 0; for (; i < s.length; i++) if (/^[A-Za-zÅÄÖåäö]?\d{1,2}$/.test(s[i])) break; return i < s.length ? s[i].toUpperCase() : String(nimi); }
  /* sama sääntö kuin lib/tm_vp_tilanne.js lyhytTunniste: duplikaatilla (P12 kilpa/harraste) nimen loppu mukaan */
  function lyhytT(nimi, kaikki) {
    var re = /^[A-Za-zÅÄÖåäö]?\d{1,2}$/, sanat = String(nimi == null ? '' : nimi).trim().split(/\s+/), i = 0; for (; i < sanat.length; i++) if (re.test(sanat[i])) break; if (i >= sanat.length) return String(nimi);
    var perus = sanat[i].toUpperCase(), sama = (kaikki || []).filter(function (x) { var q = String(x).trim().split(/\s+/), k = 0; for (; k < q.length; k++) if (re.test(q[k])) break; return k < q.length && q[k].toUpperCase() === perus; }).length;
    return sama > 1 ? sanat.slice(i).join(' ') : perus;
  }
  function _pros(o, n) { return n > 0 ? Math.round(100 * o / n) : null; }
  var IV = { leikkija: 'Leikkijä', rakentaja: 'Rakentaja', showcase: 'Showcase' };
  /* a/b-luku: ei prosenttia ilman otosta, ei 0/0 (D125) */
  function luku(a, b) { return b > 0 ? a + '/' + b : '—'; }

  function tmKotiVaihe(m) {
    var r = ((m && m.rivit) || []).filter(function (x) { return x.n > 0; }); if (!r.length) return 'kaynnistys';
    return r.filter(function (x) { return x.jakso.voimassa; }).length * 3 < r.length ? 'kaynnistys' : 'rytmi';
  }

  function _viikkoNro(ms) { var x = _V().tmIsoViikkoMs(ms); return +(/W(\d+)$/.exec(x.tunniste) || [])[1] || null; }

  function tmKotiKaynnistysMalli(m, env) {
    env = env || {}; var nyt = env.nytMs != null ? env.nytMs : Date.now(), rivit = ((m && m.rivit) || []).filter(function (x) { return x.n > 0; }), b = rivit.length;   // §7.18: 0 pelaajan joukkueet pois
    var jaksolla = rivit.filter(function (x) { return x.jakso.voimassa; }), a = jaksolla.length, yht = env.yhteensa || {}, koosteJ = env.koosteJ || {};
    var pelN = yht.n_pelaajat != null ? yht.n_pelaajat : rivit.reduce(function (s, x) { return s + x.n; }, 0), suost = yht.n_suostumus != null ? yht.n_suostumus : null;
    var nimiJid = {}, nimetK = rivit.map(function (x) { return x.nimi; }); rivit.forEach(function (x) { nimiJid[x.jid] = x; });
    var gate = function (jid) { var r = nimiJid[jid], kj = koosteJ[jid] || {}; return !!r && kj.n_suostumus != null && r.n >= PIENI && kj.n_suostumus >= KATTAVUUS_PERHE * r.n; };   // perheluvut/-signaalit vain kattavuusportin yli
    /* testipäivät: suunnitellut (tuleva) testitapahtumat; "varannut päivän" = eri joukkueita (id tai nimi), joissa on pelaajia */
    var tt = (env.testit || []).filter(function (e) { var l = _ms(e.pvm_loppu || e.pvm_alku); return e && e.tila === 'suunniteltu' && l != null && l >= nyt - DAY; }), varannut = {}, vkA = null, vkB = null;
    tt.forEach(function (e) { var id = e.joukkue, nimi = e.joukkue_nimi || (env.nimet && env.nimet[id]) || id, r = nimiJid[id] || rivit.filter(function (x) { return x.nimi === nimi; })[0]; if (r) varannut[r.jid] = 1;
      var a0 = _ms(e.pvm_alku), a1 = _ms(e.pvm_loppu || e.pvm_alku); if (a0 != null && (vkA == null || a0 < vkA)) vkA = a0; if (a1 != null && (vkB == null || a1 > vkB)) vkB = a1; });
    var testitA = Object.keys(varannut).length, vkTeksti = vkA != null ? { a: _viikkoNro(vkA), b: _viikkoNro(vkB) } : null;
    var as = [
      { nro: 1, id: 'jaksot', nimi: 'Jaksot', a: a, b: b, yks: 'joukkuetta jaksolla', miksi: { k: 'Ehdota jaksot ikävaiheittain, valmentaja vahvistaa omassa Tänään-näkymässään.' }, valmis: b > 0 && a * 3 >= b, fn: 'aloitaJaksot', toiminto: { k: 'Aloita jaksot' } },
      { nro: 2, id: 'perheet', nimi: 'Perheet mukana', a: suost || 0, b: pelN, yks: 'perhettä antanut suostumuksen', miksi: { k: 'Suostumus avaa pelaajan sovelluksen ja kotitehtävät. Luku koosteesta {vk}.', p: { vk: m && m.vk ? m.vk : '' } }, valmis: pelN > 0 && (suost || 0) >= PERHEET_VALMIS * pelN, fn: 'kutsu', toiminto: { k: 'Kutsu loput {n} →', p: { n: Math.max(0, pelN - (suost || 0)) } }, tyhjaVarma: suost == null },
      { nro: 3, id: 'testipaivat', nimi: 'Testipäivät', a: testitA, b: b, yks: 'joukkuetta varannut päivän', miksi: vkTeksti ? { k: 'Testijakso vk {a}–{b}. Mittaukset ennen talven jaksoja.', p: vkTeksti } : { k: 'Testijaksoa ei ole vielä suunniteltu. Mittaukset ennen talven jaksoja.' }, valmis: b > 0 && testitA >= TESTIT_VALMIS * b, fn: 'testit', toiminto: { k: 'Sovi päivät →' } }
    ];
    var ens = as.filter(function (x) { return !x.valmis; })[0]; as.forEach(function (x) { x.taytetty = ens === x; x.pros = x.b > 0 ? Math.max(.02, Math.min(1, x.a / x.b)) : 0; });
    /* Jaksolla nyt -rivit: perheluvut vain kattavuusportin yli (joukkueen suostumus ≥ 70 % ja ≥ PIENI pelaajaa), muuten "perheitä mukana x/y" */
    var jr = jaksolla.map(function (r) {
      var kj = koosteJ[r.jid] || {}, su = kj.n_suostumus != null ? kj.n_suostumus : null, gate = su != null && r.n >= PIENI && su >= KATTAVUUS_PERHE * r.n;
      return { jid: r.jid, nimi: r.nimi, tunniste: lyhytT(r.nimi, nimetK), ikavaihe: r.ikavaihe, n: r.n, teema: r.jakso.nimi || null, vk: r.jaksoVk || null, katselmus: r.nKatselmusAuki > 0,
        luvut: gate ? { katsaus: r.leikkija ? { ei: 'leikkija' } : (r.katsaus.pros != null ? { pros: Math.round(r.katsaus.pros) } : { ei: 'ei_perustaa' }), kaytto: r.kaytto.pros != null ? { pros: Math.round(r.kaytto.pros) } : { ei: 'ei_perustaa' } } : null,
        perheet: { a: su == null ? 0 : su, b: r.n } };
    });
    /* Odottaa jaksoa: tunnisteet (ikäjärjestys), duplikaatit pois */
    var odottaa = rivit.filter(function (x) { return !x.jakso.voimassa; }).map(function (x) { return { jid: x.jid, nimi: x.nimi, tunniste: lyhytT(x.nimi, nimetK) }; });
    /* Tällä viikolla: signaalit (ilman "ei jaksoa" — sen hoitaa askel 1) + VP:tä odottavat viestit */
    var lista = [];
    ((m && m.signaalitKaikki) || []).forEach(function (s) { if (s.tyyppi === 'ei_jaksoa' || !nimiJid[s.jid]) return;
      if ((s.tyyppi === 'katsaus_laskee' || s.tyyppi === 'kaytto_matala') && !gate(s.jid)) return;
      if (s.tyyppi === 'katselmusikkuna') lista.push({ jarj: 1, tyyppi: 'katselmus', aihe: 'Katselmus', tunniste: lyhytT(s.nimi, nimetK), nimi: s.nimi, teksti: s.pv != null ? { k: 'Katselmusikkuna sulkeutuu {pv} päivän päästä', p: { pv: s.pv } } : { k: 'Katselmusikkuna on auki' }, meta: { k: '{n} katselmusta tekemättä', p: { n: s.auki } }, tila: 'w' });
      else if (s.tyyppi === 'katsaus_laskee') lista.push({ jarj: 3, tyyppi: 'katsaus', aihe: 'Viikkokatsaus', tunniste: lyhytT(s.nimi, nimetK), nimi: s.nimi, teksti: { k: 'Viikkokatsaus on laskenut kolme viikkoa' }, meta: { k: '{a} → {b} %', p: { a: s.alku, b: s.loppu } }, tila: 'w' });
      else if (s.tyyppi === 'kaytto_matala') lista.push({ jarj: 4, tyyppi: 'kaytto', aihe: 'Käyttö', tunniste: lyhytT(s.nimi, nimetK), nimi: s.nimi, teksti: { k: 'Pelaajat ja perheet eivät vielä käytä sovellusta' }, meta: { k: 'käyttö 7 pv {pros} %, tavoite {tav} %', p: { pros: s.pros, tav: s.tavoite } }, tila: 'w' }); });
    (env.viestit || []).forEach(function (v) { lista.push({ jarj: 2, tyyppi: 'viesti', aihe: 'Viesti', tunniste: v.nimi || null, osapuoli: v.osapuoli, id: v.id, teksti: { raw: v.teksti }, meta: v.ms != null ? { ms: v.ms } : null, tila: 'n' }); });
    lista.sort(function (x, y) { return x.jarj - y.jarj; });
    return { vk: m && m.vk, vkNum: m && m.vkNum, ajankohta: m ? { laskettuMs: m.laskettuMs, ikaPv: m.ikaPv, vanha: !!m.vanha } : null, seuraNimi: env.seuraNimi || null, nyt: nyt, joukkueita: b, jaksolla: a, tyhja: b === 0, askeleet: as,
      viikolla: lista.slice(0, VIIKOLLA_MAX), viikollaLisaa: Math.max(0, lista.length - VIIKOLLA_MAX), viikollaYht: lista.length, jaksollaRivit: jr, odottaa: odottaa, kalenteri: env.kalenteri || [], testijakso: vkTeksti };
  }

  function _pvHki(ms, o) { try { return new Intl.DateTimeFormat('fi-FI', Object.assign({ timeZone: 'Europe/Helsinki' }, o)).format(new Date(ms)); } catch (e) { return ''; } }
  function _paivaAvain(ms) { return _pvHki(ms, { year: 'numeric', month: '2-digit', day: '2-digit' }); }
  function _pvAika(ms, nyt, t) { return _paivaAvain(ms) === _paivaAvain(nyt) ? t('tänään') : _pvHki(ms, { weekday: 'short', day: 'numeric', month: 'numeric' }); }

  /* ── HTML ─────────────────────────────────────────────────────────────────────────────────────────────── */
  function _call(esc, f) { var a = Array.prototype.slice.call(arguments, 2).map(function (x) { return "'" + String(x == null ? '' : x).replace(/\\/g, '\\\\').replace(/'/g, "\\'").replace(/[\r\n]/g, ' ') + "'"; }); return f ? ' onclick="' + esc(f + '(' + a.join(',') + ')') + '"' : ''; }

  function tmKotiKaynnistysHTML(km, opts) {
    opts = opts || {}; var esc = opts.esc || _esc, t = _tt(opts), fn = opts.fn || {};
    var kk = function (f) { var a = Array.prototype.slice.call(arguments); a.unshift(esc); a[1] = fn[f]; return _call.apply(null, a); };
    var X = function (o) { if (o == null) return ''; if (o.raw != null) return o.raw; if (o.ms != null) return _pvAika(o.ms, km.nyt, t); return _fill(t(o.k), o.p); };   // mallin tekstit = avain + parametrit → käännös ja täyttö täällä (ei esitäytettyjä lauseita)
    var h = '<div class="kk">';
    /* otsikko */
    var aika = km.ajankohta && km.ajankohta.laskettuMs != null ? _pvHki(km.ajankohta.laskettuMs, { weekday: 'short', hour: '2-digit', minute: '2-digit', hourCycle: 'h23' }).replace(/\./g, '.').replace(/\s+/g, ' ') : null;
    h += '<div class="kk-hd"><div class="kk-row"><span class="kt-eb">' + esc((km.seuraNimi ? km.seuraNimi + ' · ' : '') + _fill(t('viikko {n}'), { n: km.vkNum != null ? km.vkNum : (km.vk || '') }) + ' · ' + t('kauden käynnistys')) + '</span>'
      + '<span class="kk-age">' + (aika ? esc(_fill(t('kooste {aika}'), { aika: aika })) : '') + (km.ajankohta && km.ajankohta.vanha ? ' <span class="kk-vanha">' + esc(_fill(t('{n} pv vanha'), { n: Math.floor(km.ajankohta.ikaPv) })) + '</span>' : '')
      + (fn.paivita ? ' · <button type="button" class="kk-lnk g"' + kk('paivita') + '>' + esc(t('Päivitä nyt')) + '</button>' : '') + (fn.opas ? ' · <button type="button" class="kk-lnk g"' + kk('opas') + '>' + esc(t('Näytä opas')) + '</button>' : '') + (fn.demo ? ' · <button type="button" class="kk-lnk g"' + kk('demo', '1') + '>' + esc(t('Katso esimerkkiseura')) + '</button>' : '') + '</span></div>';
    var lause = km.tyhja ? t('Joukkueet ilmestyvät tähän, kun pelaajat on tuotu.') : _fill(t('Jakso on käynnissä {a}/{b} joukkueella.'), { a: km.jaksolla, b: km.joukkueita }) + ' ' + t('Kun kolmasosalla on jakso, Koti alkaa näyttää viikon asiat ja joukkueiden tilanteen.');
    h += '<h3 class="kk-h1">' + esc(km.tyhja ? t('Kauden käynnistys: aloita tuomalla pelaajat.') : t('Kauden käynnistys: kolme askelta.')) + '</h3><p class="kk-lause">' + esc(lause) + '</p>';
    if (opts.pika && opts.pika.length) h += '<div class="kk-quick">' + opts.pika.map(function (x) { return '<button class="kk-lnk" type="button" onclick="' + esc(x.fn) + '()">' + esc(t(x.teksti)) + '</button>'; }).join('') + '</div>';
    h += '</div>';
    if (km.tyhja) return { main: h + '<div class="kk-tyhja">' + (fn.tuo ? '<button class="kt-btn" type="button"' + kk('tuo') + '>' + esc(t('Tuo pelaajat')) + '</button>' : '') + '</div></div>', rail: _rail(km, opts, esc, t, fn) };
    /* kolme askelta */
    h += '<div class="kk-steps">' + km.askeleet.map(function (s) {
      var nappi = '<button class="' + (s.taytetty ? 'kt-btn' : 'kk-lnk') + '" type="button"' + kk(s.fn) + '>' + esc(X(s.toiminto)) + '</button>';
      return '<div class="kt-ev kk-st' + (s.valmis ? ' ok' : '') + '"><span class="kk-sn" aria-hidden="true">' + (s.valmis ? '✓' : s.nro) + '</span><div class="kk-sx"><div class="kk-sl"><b>' + esc(t(s.nimi)) + '</b><span class="kk-lu">' + esc(luku(s.a, s.b)) + '</span><span class="kk-m">' + esc(t(s.yks)) + '</span></div>'
        + '<div class="kk-bar" role="img" aria-label="' + esc(luku(s.a, s.b)) + '"><i style="width:' + Math.round(s.pros * 100) + '%"></i></div><span class="kk-m">' + esc(X(s.miksi)) + '</span></div>' + nappi + '</div>';
    }).join('') + '</div>';
    /* Tällä viikolla */
    h += '<div><div class="kk-sh"><span class="kt-eb">' + esc(t('Tällä viikolla')) + '</span><span class="kk-m">' + esc(km.viikollaYht ? _fill(km.viikollaYht === 1 ? t('{n} asia') : t('{n} asiaa'), { n: km.viikollaYht }) : t('ei asioita')) + '</span></div>';
    h += km.viikolla.length ? '<div class="kt-vl kk-list">' + km.viikolla.map(function (x) {
      var f = x.tyyppi === 'viesti' ? fn.viesti : fn.joukkue, arg = x.tyyppi === 'viesti' ? [x.osapuoli, x.id] : [x.nimi];
      return '<div class="kk-it"><span class="kk-d ' + x.tila + '" aria-hidden="true"></span><span class="kk-tx"><span class="kk-a"><span class="kk-k">' + esc(t(x.aihe) + (x.tunniste ? ' · ' + x.tunniste : '')) + '</span>' + esc(X(x.teksti)) + '</span><span class="kk-m">' + esc(X(x.meta)) + '</span></span>'
        + (f ? '<button type="button" class="kk-lnk" onclick="' + esc(f + '(' + arg.map(function (y) { return "'" + String(y == null ? '' : y).replace(/\\/g, '\\\\').replace(/'/g, "\\'") + "'"; }).join(',') + ')') + '">' + esc(t('Avaa')) + '</button>' : '') + '</div>'; }).join('') + '</div>'
      : '<div class="kt-note" style="margin-top:6px">' + esc(t('Ei toimenpiteitä tällä viikolla.')) + '</div>';
    if (km.viikollaLisaa > 0) h += '<div class="kk-m" style="margin-top:6px">' + esc(_fill(t('+{n} muuta'), { n: km.viikollaLisaa })) + (fn.tilanne ? ' · <button type="button" class="kk-lnk"' + kk('tilanne') + '>' + esc(t('Tilanne · kausi')) + ' →</button>' : '') + '</div>';
    h += '</div>';
    /* Jaksolla nyt */
    if (km.jaksollaRivit.length) h += '<div><div class="kk-sh"><span class="kt-eb">' + esc(t('Jaksolla nyt')) + '</span><span class="kk-m">' + esc(luku(km.jaksolla, km.joukkueita)) + '</span></div><div class="kt-vl kk-list">' + km.jaksollaRivit.map(function (r) {
      var num = function (nimike, c) { return '<span class="kk-nu"><span class="kk-nk">' + esc(t(nimike)) + '</span><span class="kk-v">' + (c.pros != null ? esc(c.pros + ' %') : '<span class="kk-na">' + esc(t(c.ei === 'leikkija' ? 'perhe' : '—')) + '</span>') + '</span></span>'; };
      return '<div class="kk-jr"' + (fn.joukkue ? kk('joukkue', r.nimi) + ' role="button" tabindex="0"' : '') + '><span class="kk-tn" title="' + esc(r.nimi) + '">' + esc(r.tunniste) + '</span><span class="kk-te"><b>' + esc(r.teema || t('Jakso käynnissä')) + '</b><span class="kk-m">' + esc((r.ikavaihe ? t(IV[r.ikavaihe]) + ' · ' : '') + _fill(t('{n} pel.'), { n: r.n }) + (r.vk ? ' · ' + _fill(t('vk {vk}/{N}'), r.vk) + (r.vk.vk === r.vk.N ? ' · ' + t('katselmus') : '') : '')) + '</span></span>'
        + (r.luvut ? num('Katsaus', r.luvut.katsaus) + num('Käyttö 7 pv', r.luvut.kaytto) : '<span class="kk-nu kk-perh"><span class="kk-nk">' + esc(t('perheitä mukana')) + '</span><span class="kk-v">' + esc(luku(r.perheet.a, r.perheet.b)) + '</span></span>') + '<span class="kk-ar" aria-hidden="true">→</span></div>'; }).join('') + '</div></div>';
    /* Odottaa jaksoa */
    if (km.odottaa.length) {
      var uniq = km.odottaa.filter(function (x, i, a) { return a.findIndex(function (y) { return y.tunniste === x.tunniste; }) === i; }), auki = !!(opts.auki && opts.auki.odottaa), nayt = auki ? uniq : uniq.slice(0, ODOTTAA_NAYTA), loput = uniq.length - nayt.length;
      h += '<div class="kk-odottaa"><div><span class="kt-eb">' + esc(_fill(t('Odottaa jaksoa · {n}'), { n: km.odottaa.length })) + '</span><div class="kk-tags">' + nayt.map(function (x) { return '<button type="button" class="kk-tag" title="' + esc(x.nimi) + '"' + kk('joukkue', x.nimi) + '>' + esc(x.tunniste) + '</button>'; }).join('')
        + (loput > 0 ? '<button type="button" class="kk-tag"' + kk('auki', 'odottaa') + '>+' + loput + '</button>' : '') + '</div></div>' + (fn.aloitaJaksot ? '<button class="kk-lnk" type="button"' + kk('aloitaJaksot') + '>' + esc(t('Ehdota jaksot →')) + '</button>' : '') + '</div>';
    }
    return { main: h + '</div>', rail: _rail(km, opts, esc, t, fn) };
  }

  /* Oikea palsta: Tänään · Tulossa 14 päivää (+ testijakso) — kalenteri-tapahtumat {nimi, alkaa}. Lomatauot: ei datalähdettä (ei toteutettu). */
  function _rail(km, opts, esc, t, fn) {
    var nyt = km.nyt, raja = nyt + 14 * DAY, paiva = _paivaAvain(nyt), lista = (km.kalenteri || []).map(function (e) { return { nimi: e && e.nimi, ms: _ms(e && e.alkaa) }; }).filter(function (e) { return e.nimi && e.ms != null; }).sort(function (a, b) { return a.ms - b.ms; });
    var tanaan = lista.filter(function (e) { return _paivaAvain(e.ms) === paiva; }).slice(0, 6), tulossa = lista.filter(function (e) { return _paivaAvain(e.ms) !== paiva && e.ms > nyt && e.ms <= raja; }).slice(0, 8);
    var rivi = function (aika, nimi) { return '<div class="kk-rr"><span class="kk-p">' + esc(aika) + '</span><span class="kk-rt">' + esc(nimi) + '</span></div>'; };
    var h = '<div class="kk-rail"><div><div class="kk-sh"><span class="kt-eb">' + esc(t('Tänään') + ' · ' + _pvHki(nyt, { weekday: 'short', day: 'numeric', month: 'numeric' })) + '</span></div>'
      + (tanaan.length ? '<div class="kt-vl kk-list">' + tanaan.map(function (e) { return rivi(_pvHki(e.ms, { hour: '2-digit', minute: '2-digit', hourCycle: 'h23' }), e.nimi); }).join('') + '</div>' : '<div class="kt-note">' + esc(t('Ei tapahtumia tänään.')) + '</div>') + '</div>';
    h += '<div><div class="kk-sh"><span class="kt-eb">' + esc(t('Tulossa 14 päivää')) + '</span></div>'
      + (tulossa.length || km.testijakso ? '<div class="kt-vl kk-list">' + tulossa.map(function (e) { return rivi(_pvHki(e.ms, { weekday: 'short', day: 'numeric', month: 'numeric' }), e.nimi); }).join('')
        + (km.testijakso ? rivi(_fill(t('vk {a}–{b}'), km.testijakso), t('Testijakso')) : '') + '</div>' : '<div class="kt-note">' + esc(t('Ei tapahtumia seuraavan 14 päivän aikana.')) + '</div>')
      + (fn.kalenteri ? '<button type="button" class="kk-lnk" style="margin-top:8px"' + _call(esc, fn.kalenteri) + '>' + esc(t('Avaa kalenteri →')) + '</button>' : '') + '</div></div>';
    return h;
  }

  /* ── Esimerkkiseura (D167): FC Demo, keksitty, vain muistissa ───────────────────────────────────────── */
  var DEMO_JOUKKUEET = [['P10', 10, 8, 'Pelaaminen', 3, 8, 'kilpa'], ['P11', 11, 8, 'Ensikosketus', 2, 6, 'harraste'], ['P12', 12, 10, 'Haltuunotto', 2, 6, 'kilpa'], ['T12', 12, 4, 'Peliasento', 1, 4, 'kilpa'], ['P13', 13, 12, 'Ensimmäinen kosketus', 5, 6, 'kilpa'], ['P14', 14, 18, 'Kuljettaminen', 2, 4, 'kilpa'], ['T14', 14, 16, 'Murtautuminen', 3, 8, 'kilpa'], ['P15', 15, 10, null, 0, 0, 'kilpa'], ['P16', 16, 11, 'Syöttö', 3, 8, 'harraste']];
  function tmKotiDemo(nytMs) {
    var V = _V(), nyt = nytMs != null ? nytMs : Date.now();
    var koosteet = [3, 2, 1, 0].map(function (w) {
      var jm = {}, y = { n_pelaajat: 0, n_suostumus: 0, n_aktiivinen_7: 0, n_harjoite_7: 0 };
      DEMO_JOUKKUEET.forEach(function (j, i) { var n = j[2], jakso = !!j[3] && j[4] >= w, su = Math.round(n * .8), akt = Math.round(n * .75), harj = Math.round(n * .45);
        jm['demo' + i] = { nimi: j[0] + ' Demo', ikavaihe: j[1] <= 12 ? 'leikkija' : j[1] <= 15 ? 'rakentaja' : 'showcase', tyyppi: j[6], profiili: i > 3 ? 'ammatti' : 'oto', jakso: jakso, n_pelaajat: n, n_jaksolla: jakso ? n : 0, n_valinta_odottaa: 0, n_katselmus: i === 4 && w === 0 ? 6 : 0, n_vastanneet: jakso ? Math.round(n * .7) : 0, n_vastausperusta: jakso ? n : 0, n_katselmus_ajallaan: jakso ? 1 : 0, n_katselmus_perusta: jakso ? 1 : 0, n_suostumus: su, n_kirjautunut_30: akt, n_huoltaja_30: Math.round(su * .6), n_aktiivinen_7: akt, n_aktiivinen_30: akt, n_toiminto_7: Math.round(akt / 2), n_perhe_kuittaus_7: Math.round(su / 2), n_harjoite_7: harj, n_harjoite_30: harj, jakso_nimi: jakso ? j[3] : null };
        y.n_pelaajat += n; y.n_suostumus += su; y.n_aktiivinen_7 += akt; y.n_harjoite_7 += harj; });
      return { vk: V.tmIsoViikkoMs(nyt - w * 7 * DAY).tunniste, versio: 5, laskettu: { seconds: (nyt - (w === 0 ? 2 * 3600000 : w * 7 * DAY)) / 1000 }, yhteensa: y, joukkueet: jm };
    });
    var kalenteri = [{ nimi: 'P14 Demo harjoitus', alkaa: nyt + 6 * 3600000 }, { nimi: 'T14 Demo harjoitus', alkaa: nyt + 8 * 3600000 }, { nimi: 'P13 Demo ottelu', alkaa: nyt + 3 * DAY }, { nimi: 'Valmentajapalaveri', alkaa: nyt + 5 * DAY }];
    return { koosteet: koosteet, ensin: V.tmIsoViikkoMs(nyt - 14 * 7 * DAY).tunniste, kalenteri: kalenteri, seuranNimi: 'FC Demo' };
  }
  function tmKotiDemoNauhaHTML(opts) {
    opts = opts || {}; var esc = opts.esc || _esc, t = _tt(opts);
    return '<div class="kk-demoband"><span>' + esc(t('Esimerkkiseura · FC Demo · keksittyä dataa, ei sinun seurasi')) + '</span>' + (opts.fn && opts.fn.demo ? '<button type="button" class="kk-lnk" onclick="' + esc(opts.fn.demo + "('0')") + '">' + esc(t('← Takaisin omaan seuraan')) + '</button>' : '') + '</div>';
  }

  var CSS = [
    '#ws-koti.vpk-hide-guide #vpAloitaKortti{display:none}',
    '.kk{display:grid;gap:30px;min-width:0;font-family:var(--font-sans);color:var(--ink)}.kk>*{min-width:0}',
    '.kk-hd{display:grid;gap:8px}.kk-row{display:flex;justify-content:space-between;align-items:baseline;gap:12px;flex-wrap:wrap}',
    '.kk-h1{font-family:var(--font-serif);font-weight:400;font-size:var(--fs-h1,40px);line-height:1.02;margin:0}.kk-lause{font-size:var(--fs-lead,16px);color:var(--ink2);max-width:60ch;margin:0}',
    '.kk-age,.kk-m{font-size:var(--fs-meta,12.5px);color:var(--ink2)}.kk-vanha{color:var(--amber);font-weight:600}',
    '.kk-lnk{background:none;border:0;padding:0;font:inherit;font-size:var(--fs-body,14px);font-weight:600;color:var(--teal);cursor:pointer;text-align:left}.kk-lnk.g{font-size:var(--fs-meta,12.5px);font-weight:400;color:var(--ink2);text-decoration:underline}.kk-lnk:focus-visible,.kk-tag:focus-visible,.kk-jr:focus-visible{outline:2px solid var(--teal);outline-offset:2px}',
    '.kk-quick{display:flex;gap:18px;flex-wrap:wrap;margin-top:4px}.kk-quick .kk-lnk{font-weight:500;color:var(--ink2)}',
    '.kk-steps{display:grid;gap:10px}.kk-st{grid-template-columns:28px minmax(0,1fr) auto;align-items:center;gap:14px}.kk-st>.kt-btn,.kk-st>.kk-lnk{justify-self:end}',
    '.kk-sn{width:28px;height:28px;border-radius:50%;border:1px solid var(--teal-brd);display:grid;place-items:center;font-family:var(--font-sans);font-size:var(--fs-meta,12.5px);font-weight:600;color:var(--teal)}.kk-st.ok .kk-sn{background:var(--teal);color:var(--on-accent,var(--bg))}',
    '.kk-sx{display:grid;gap:6px;min-width:0}.kk-sl{display:flex;align-items:baseline;gap:10px;flex-wrap:wrap}.kk-sl b{font-size:var(--fs-body,14px);font-weight:600}.kk-lu{font-family:var(--font-serif);font-size:var(--fs-h2,26px);line-height:1;font-weight:500}',
    '.kk-bar{height:5px;border-radius:3px;background:var(--ov-2);overflow:hidden;max-width:420px}.kk-bar i{display:block;height:100%;background:var(--teal)}',
    '.kk-sh{display:flex;justify-content:space-between;align-items:baseline;gap:12px;flex-wrap:wrap;margin-bottom:10px}.kk-list{margin-top:0}',
    '.kk-it{display:grid;grid-template-columns:14px minmax(0,1fr) auto;gap:12px;align-items:center;padding:12px 16px;border-top:1px solid var(--border)}.kk-it:first-child{border-top:0}',
    '.kk-d{width:8px;height:8px;border-radius:50%;background:var(--teal)}.kk-d.w{background:var(--amber)}.kk-d.n{background:transparent;border:1px solid var(--ink3)}',
    '.kk-tx{display:grid;gap:1px;min-width:0}.kk-a{font-size:var(--fs-body,14px)}.kk-k{font-size:var(--fs-meta,12.5px);color:var(--ink3);margin-right:8px}',
    '.kk-jr{display:grid;grid-template-columns:90px minmax(0,1fr) 96px 96px 16px;gap:12px;align-items:center;padding:10px 16px;border-top:1px solid var(--border);cursor:pointer}.kk-jr:first-child{border-top:0}.kk-jr:hover{background:var(--ov-1)}',
    '.kk-tn{font-family:var(--font-sans);font-size:var(--fs-lead,16px);font-weight:600;white-space:nowrap;overflow:hidden;text-overflow:ellipsis;min-width:0}.kk-te{display:grid;gap:1px;min-width:0}.kk-te b{font-size:var(--fs-body,14px);font-weight:600}',
    '.kk-nu{display:grid}.kk-perh{grid-column:span 2}.kk-nk{font-size:var(--fs-meta,12.5px);color:var(--ink3)}.kk-v{font-family:var(--font-sans);font-size:var(--fs-lead,16px);font-weight:600;font-variant-numeric:tabular-nums;line-height:1.3}.kk-na{font-size:var(--fs-meta,12.5px);font-weight:400;color:var(--ink2)}.kk-ar{color:var(--ink3)}',
    '.kk-odottaa{display:flex;justify-content:space-between;align-items:center;gap:12px;flex-wrap:wrap;border:1px dashed var(--ink3);border-radius:6px;padding:12px 16px}.kk-tags{display:block;margin-top:6px;text-wrap:balance}.kk-tags .kk-tag{display:inline-block;margin:0 4px 4px 0;vertical-align:top}   /* tasainen rivitys: viimeinen tunniste ei jää yksin riville */',
    '.kk-tag{font-family:var(--font-sans);font-size:var(--fs-meta,12.5px);color:var(--ink2);border:1px solid var(--border);border-radius:3px;padding:1px 7px;background:var(--bg);cursor:pointer;text-transform:none;letter-spacing:0;max-width:18ch;white-space:nowrap;overflow:hidden;text-overflow:ellipsis}',
    '.kk-tyhja{display:flex;gap:12px}.kk-rail{display:grid;gap:22px;align-content:start}.kk-rr{display:grid;grid-template-columns:64px minmax(0,1fr);gap:10px;padding:10px 12px;border-top:1px solid var(--border);font-size:var(--fs-body,14px)}.kk-rr:first-child{border-top:0}.kk-p{font-size:var(--fs-meta,12.5px);color:var(--ink2);padding-top:2px}',
    '.kk-demoband{display:flex;justify-content:space-between;align-items:center;gap:12px;flex-wrap:wrap;border:1px solid var(--teal-brd);background:color-mix(in srgb,var(--teal) 14%,transparent);border-radius:5px;padding:6px 12px;font-size:var(--fs-meta,12.5px);color:var(--ink);margin-bottom:14px}',
    '@container (max-width:900px){.kk-st{grid-template-columns:28px minmax(0,1fr);padding:14px 16px}.kk-st>.kt-btn,.kk-st>.kk-lnk{grid-column:2;justify-self:start}.kk-jr{grid-template-columns:minmax(0,1fr) 64px 64px;row-gap:2px;padding:10px 12px}.kk-tn{grid-column:1/-1}.kk-ar{display:none}.kk-perh{grid-column:span 2}}',
    '@media (max-width:720px){.kk-st{grid-template-columns:28px minmax(0,1fr);padding:14px 16px}.kk-st>.kt-btn,.kk-st>.kk-lnk{grid-column:2;justify-self:start}.kk-jr{grid-template-columns:minmax(0,1fr) 64px 64px;row-gap:2px;padding:10px 12px}.kk-tn{grid-column:1/-1}.kk-ar{display:none}}'
  ].join('\n');

  var API = { CSS: CSS, lyhyt: lyhyt, luku: luku, tmKotiVaihe: tmKotiVaihe, tmKotiKaynnistysMalli: tmKotiKaynnistysMalli, tmKotiKaynnistysHTML: tmKotiKaynnistysHTML, tmKotiDemo: tmKotiDemo, tmKotiDemoNauhaHTML: tmKotiDemoNauhaHTML };
  if (typeof module !== 'undefined' && module.exports) module.exports = API;
  if (root) root.TM_VP_KOTI = API;
})(typeof window !== 'undefined' ? window : null);
