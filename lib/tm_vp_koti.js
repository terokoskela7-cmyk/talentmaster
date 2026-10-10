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
      { nro: 1, id: 'jaksot', nimi: 'Jaksot', a: a, b: b, yks: 'joukkuetta jaksolla', miksi: { k: 'Aloita jakso joukkueen näkymässä. Jakso antaa joukkueelle teeman ja viikkotavoitteet.' }, valmis: b > 0 && a * 3 >= b, fn: 'aloitaJaksot', toiminto: { k: 'Aloita jaksot' } },
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
    return { eiKoostetta: !!(m && m.tyhja), vk: m && m.vk, vkNum: m && m.vkNum, ajankohta: m ? { laskettuMs: m.laskettuMs, ikaPv: m.ikaPv, vanha: !!m.vanha } : null, seuraNimi: env.seuraNimi || null, nyt: nyt, joukkueita: b, jaksolla: a, tyhja: b === 0, askeleet: as,
      viikolla: lista.slice(0, VIIKOLLA_MAX), viikollaLisaa: Math.max(0, lista.length - VIIKOLLA_MAX), viikollaYht: lista.length, jaksollaRivit: jr, odottaa: odottaa, kalenteri: env.kalenteri || [], nimet: env.nimet || {}, nimetK: nimetK, testijakso: vkTeksti };
  }

  var _kieli = 'fi', LOC = { fi: 'fi-FI', sv: 'sv-FI', en: 'en-GB' };   // viikonpäivälyhenteet ym. tulevat VALITUSTA kielestä (opts.kieli)
  function _pvHki(ms, o) { try { return new Intl.DateTimeFormat(LOC[_kieli] || 'fi-FI', Object.assign({ timeZone: 'Europe/Helsinki' }, o)).format(new Date(ms)); } catch (e) { return ''; } }
  function _paivaAvain(ms) { return _pvHki(ms, { year: 'numeric', month: '2-digit', day: '2-digit' }); }
  function _pvAika(ms, nyt, t) { return _paivaAvain(ms) === _paivaAvain(nyt) ? t('tänään') : _pvHki(ms, { weekday: 'short', day: 'numeric', month: 'numeric' }); }

  /* ── HTML ─────────────────────────────────────────────────────────────────────────────────────────────── */
  function _call(esc, f) { var a = Array.prototype.slice.call(arguments, 2).map(function (x) { return "'" + String(x == null ? '' : x).replace(/\\/g, '\\\\').replace(/'/g, "\\'").replace(/[\r\n]/g, ' ') + "'"; }); return f ? ' onclick="' + esc(f + '(' + a.join(',') + ')') + '"' : ''; }

  /* yhteinen otsikkoalue (Käynnistys ja Rytmi): yläotsikko + kooste-ikä + linkit · otsikko (h1) · tulkintalause · pikatoiminnot */
  function _otsikko(km, opts, esc, t, fn, kk, ylaotsikko, h1, lause) {
    var al = km.ajankohta && km.ajankohta.laskettuMs, aika = al != null ? _pvHki(al, { hour: '2-digit', minute: '2-digit', hourCycle: 'h23' }) : null, tanaan = al != null && _paivaAvain(al) === _paivaAvain(km.nyt);
    var teksti = aika == null ? '' : tanaan ? _fill(t('kooste klo {aika}'), { aika: aika }) : _fill(t('kooste {pvm} klo {aika}'), { pvm: _pvHki(al, { weekday: 'short', day: 'numeric', month: 'numeric' }), aika: aika });
    var h = '<div class="kk-hd"><div class="kk-row"><span class="kt-eb">' + esc(ylaotsikko) + '</span>'
      + '<span class="kk-age">' + esc(teksti) + (km.ajankohta && km.ajankohta.vanha ? ' <span class="kk-vanha">' + esc(_fill(t('{n} pv vanha'), { n: Math.floor(km.ajankohta.ikaPv) })) + '</span>' : '')
      + (fn.paivita ? (teksti ? ' · ' : '') + '<button type="button" class="kk-lnk g"' + kk('paivita') + '>' + esc(t('Päivitä nyt')) + '</button>' : '') + '</span></div>'
      + '<h3 class="kk-h1">' + esc(h1) + '</h3><p class="kk-lause">' + esc(lause) + '</p>';
    if (opts.pika && opts.pika.length) h += '<div class="kk-quick">' + opts.pika.map(function (x) { return '<button class="kk-lnk" type="button" onclick="' + esc(x.fn) + '()">' + esc(t(x.teksti)) + '</button>'; }).join('') + '</div>';
    return h + '</div>';
  }
  /* hiljaiset linkit sivun loppuun: Näytä opas · Katso esimerkkiseura */
  function _loppu(opts, esc, t, fn, kk) { var L = []; if (fn.opas) L.push('<button type="button" class="kk-lnk g"' + kk('opas') + '>' + esc(t('Näytä opas')) + '</button>'); if (fn.demo) L.push('<button type="button" class="kk-lnk g"' + kk('demo', '1') + '>' + esc(t('Katso esimerkkiseura')) + '</button>'); return L.length ? '<div class="kk-loppu">' + L.join(' · ') + '</div>' : ''; }

  function tmKotiKaynnistysHTML(km, opts) {
    opts = opts || {}; _kieli = opts.kieli || 'fi'; var esc = opts.esc || _esc, t = _tt(opts), fn = opts.fn || {};
    var kk = function (f) { var a = Array.prototype.slice.call(arguments); a.unshift(esc); a[1] = fn[f]; return _call.apply(null, a); };
    var X = function (o) { if (o == null) return ''; if (o.raw != null) return o.raw; if (o.ms != null) return _pvAika(o.ms, km.nyt, t); return _fill(t(o.k), o.p); };   // mallin tekstit = avain + parametrit → käännös ja täyttö täällä (ei esitäytettyjä lauseita)
    var h = '<div class="kk">';
    if (km.eiKoostetta) { h += _otsikko(km, opts, esc, t, fn, kk, (km.seuraNimi ? km.seuraNimi + ' · ' : '') + t('kauden käynnistys'), t('Pulssi alkaa kertyä seuraavasta viikkokoosteesta'), t('Kooste lasketaan maanantaisin klo 6.00.')); return { main: h + _loppu(opts, esc, t, fn, kk) + '</div>', rail: _rail(km, opts, esc, t, fn) }; }
    var lause = km.tyhja ? t('Joukkueet ilmestyvät tähän, kun pelaajat on tuotu.') : _fill(t('Jakso on käynnissä {a}/{b} joukkueella.'), { a: km.jaksolla, b: km.joukkueita }) + ' ' + t('Kun kolmasosalla on jakso, Koti alkaa näyttää viikon asiat ja joukkueiden tilanteen.');
    h += _otsikko(km, opts, esc, t, fn, kk, (km.seuraNimi ? km.seuraNimi + ' · ' : '') + _fill(t('viikko {n}'), { n: km.vkNum != null ? km.vkNum : (km.vk || '') }) + ' · ' + t('kauden käynnistys'), km.tyhja ? t('Kauden käynnistys: aloita tuomalla pelaajat.') : t('Kauden käynnistys: kolme askelta.'), lause);
    if (km.tyhja) return { main: h + '<div class="kk-tyhja">' + (fn.tuo ? '<button class="kt-btn" type="button"' + kk('tuo') + '>' + esc(t('Tuo pelaajat')) + '</button>' : '') + '</div>' + _loppu(opts, esc, t, fn, kk) + '</div>', rail: _rail(km, opts, esc, t, fn) };
    /* kolme askelta */
    h += '<div class="kk-steps">' + km.askeleet.map(function (s) {
      var nappi = '<button class="' + (s.taytetty ? 'kt-btn' : 'kk-lnk') + '" type="button"' + kk(s.fn) + '>' + esc(X(s.toiminto)) + '</button>';
      return '<div class="kt-ev kk-st' + (s.valmis ? ' ok' : '') + '"><span class="kk-sn" aria-hidden="true">' + (s.valmis ? '✓' : s.nro) + '</span><div class="kk-sx"><div class="kk-sl"><b>' + esc(t(s.nimi)) + '</b><span class="kk-lu">' + esc(luku(s.a, s.b)) + '</span><span class="kk-m">' + esc(t(s.yks)) + '</span></div>'
        + '<div class="kk-bar" role="img" aria-label="' + esc(luku(s.a, s.b)) + '"><i style="width:' + Math.round(s.pros * 100) + '%"></i></div><span class="kk-m">' + esc(X(s.miksi)) + '</span></div>' + nappi + '</div>';
    }).join('') + '</div>';
    /* Tällä viikolla */
    if (km.viikolla.length) { h += '<div><div class="kk-sh"><span class="kt-eb">' + esc(t('Tällä viikolla')) + '</span><span class="kk-m">' + esc(_fill(km.viikollaYht === 1 ? t('{n} asia') : t('{n} asiaa'), { n: km.viikollaYht })) + '</span></div>';
    h += '<div class="kt-vl kk-list">' + km.viikolla.map(function (x) {
      var f = x.tyyppi === 'viesti' ? fn.viesti : fn.joukkue, arg = x.tyyppi === 'viesti' ? [x.osapuoli, x.id] : [x.nimi];
      return '<div class="kk-it"><span class="kk-d ' + x.tila + '" aria-hidden="true"></span><span class="kk-tx"><span class="kk-a"><span class="kk-k">' + esc(t(x.aihe) + (x.tunniste ? ' · ' + x.tunniste : '')) + '</span>' + esc(X(x.teksti)) + '</span><span class="kk-m">' + esc(X(x.meta)) + '</span></span>'
        + (f ? '<button type="button" class="kk-lnk" onclick="' + esc(f + '(' + arg.map(function (y) { return "'" + String(y == null ? '' : y).replace(/\\/g, '\\\\').replace(/'/g, "\\'") + "'"; }).join(',') + ')') + '">' + esc(t('Avaa')) + '</button>' : '') + '</div>'; }).join('') + '</div>';
    if (km.viikollaLisaa > 0) h += '<div class="kk-m" style="margin-top:6px">' + esc(_fill(t('+{n} muuta'), { n: km.viikollaLisaa })) + (fn.tilanne ? ' · <button type="button" class="kk-lnk"' + kk('tilanne') + '>' + esc(t('Tilanne · kausi')) + ' →</button>' : '') + '</div>';
    h += '</div>'; }
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
    return { main: h + _loppu(opts, esc, t, fn, kk) + '</div>', rail: _rail(km, opts, esc, t, fn) };
  }

  /* Oikea palsta: Tänään · Tulossa 14 päivää. Joukkuetapahtumilla on joukkueen tunniste; yksittäiset joukkueharjoitukset yhdistetään päiväkohtaiseksi riviksi
     ("ti 13.10. · 3 harjoitusta" + tunnisteet); seuratason tapahtumat (palaveri, jaksopalaveri, testijakso, kisat) ovat omia rivejään. Lomatauot: ei datalähdettä. */
  function _tapTunnisteet(e, nimet, nimetK) {
    var ids = (Array.isArray(e.joukkueet) && e.joukkueet.length ? e.joukkueet : (e.joukkue ? [e.joukkue] : [])), nimiL = ids.map(function (id) { return (nimet && nimet[id]) || null; }).filter(Boolean);
    if (!nimiL.length && e.joukkue_nimi) nimiL = [e.joukkue_nimi];
    return nimiL.map(function (n) { return lyhytT(n, nimetK); });
  }
  function _rail(km, opts, esc, t, fn) {
    var nyt = km.nyt, raja = nyt + 14 * DAY, paiva = _paivaAvain(nyt), nimet = km.nimet || {}, nimetK = km.nimetK || [];
    var lista = (km.kalenteri || []).map(function (e) { var tn = _tapTunnisteet(e || {}, nimet, nimetK); return { nimi: e && e.nimi, ms: _ms(e && e.alkaa), tyyppi: e && e.tyyppi, tunnisteet: tn, harj: !!(e && e.tyyppi === 'harjoitus' && tn.length) }; }).filter(function (e) { return (e.nimi || e.tyyppi) && e.ms != null; }).sort(function (a, b) { return a.ms - b.ms; });
    var tanaan = lista.filter(function (e) { return _paivaAvain(e.ms) === paiva; }), tulossa = lista.filter(function (e) { return _paivaAvain(e.ms) !== paiva && e.ms > nyt && e.ms <= raja; });
    var tagit = function (L) { var u = L.filter(function (x, i, a) { return a.indexOf(x) === i; }); return '<span class="kk-rtags">' + u.slice(0, 6).map(function (x) { return '<span class="kk-tag">' + esc(x) + '</span>'; }).join('') + (u.length > 6 ? '<span class="kk-tag">+' + (u.length - 6) + '</span>' : '') + '</span>'; };
    var oletusNimi = function (e) { return e.nimi || t(e.tyyppi === 'ottelu' ? 'Ottelu' : e.tyyppi === 'harjoitus' ? 'Harjoitus' : 'Tapahtuma'); };
    var rivi = function (aika, teksti, tn) { return '<div class="kk-rr"><span class="kk-p">' + esc(aika) + '</span><span class="kk-rt">' + esc(teksti) + (tn && tn.length ? tagit(tn) : '') + '</span></div>'; };
    var koosta = function (L, aikaFn, max) {   // saman päivän joukkueharjoitukset (≥ 2) → yksi rivi
      var ut = [], harjPv = {}, tehty = {}; L.forEach(function (e) { if (e.harj) (harjPv[_paivaAvain(e.ms)] = harjPv[_paivaAvain(e.ms)] || []).push(e); });
      L.forEach(function (e) { var k = _paivaAvain(e.ms);
        if (e.harj && harjPv[k].length >= 2) { if (tehty[k]) return; tehty[k] = 1; var G = harjPv[k], tn = []; G.forEach(function (x) { tn = tn.concat(x.tunnisteet); }); ut.push(rivi(aikaFn(G[0].ms), _fill(t('{n} harjoitusta'), { n: G.length }), tn)); }
        else ut.push(rivi(aikaFn(e.ms), oletusNimi(e), e.tunnisteet)); });
      return ut.slice(0, max);
    };
    var h = '<div class="kk-rail"><div><div class="kk-sh"><span class="kt-eb">' + esc(t('Tänään') + ' · ' + _pvHki(nyt, { weekday: 'short', day: 'numeric', month: 'numeric' })) + '</span></div>'
      + (tanaan.length ? '<div class="kt-vl kk-list">' + koosta(tanaan, function (ms) { return _pvHki(ms, { hour: '2-digit', minute: '2-digit', hourCycle: 'h23' }); }, 6).join('') + '</div>' : '<div class="kt-note">' + esc(t('Ei tapahtumia tänään.')) + '</div>') + '</div>';
    var pvF = function (ms) { return _pvHki(ms, { weekday: 'short', day: 'numeric', month: 'numeric' }); };
    h += '<div><div class="kk-sh"><span class="kt-eb">' + esc(t('Tulossa 14 päivää')) + '</span></div>'
      + (tulossa.length || km.testijakso ? '<div class="kt-vl kk-list">' + koosta(tulossa, pvF, 8).join('') + (km.testijakso ? rivi(_fill(t('vk {a}–{b}'), km.testijakso), t('Testijakso')) : '') + '</div>' : '<div class="kt-note">' + esc(t('Ei tapahtumia seuraavan 14 päivän aikana.')) + '</div>')
      + (fn.kalenteri ? '<button type="button" class="kk-lnk" style="margin-top:8px"' + _call(esc, fn.kalenteri) + '>' + esc(t('Avaa kalenteri →')) + '</button>' : '') + '</div></div>';
    return h;
  }

  /* ════════ RYTMI-VAIHE (PR D; mockup 33 "Rytmi · FC Demo", mockup 32, D161–D163, D166) ════════
     Tällä viikolla = signaalit + VP:tä odottavat viestit yhdessä listassa (≤ 5 + "+N muuta"); tärkein signaali nousee signaalikortiksi (sivun ainoa täytetty nappi).
     Sama asia ≥ 3 joukkueella = YKSI rivi/kortti (kuten Tilanteessa). Joukkueet kolmella tasolla: ≤ 3 huomiokorttia · muut jaksolliset riveinä · jaksottomat tunnisteina.
     Käynnistyksen askeleet ohuena rivinä kunnes kaikki ovat valmiita. Tekstirakenne D162: yläotsikko = aihe · joukkue, otsikko = havainto, perustelu = luku + tavoite + suunta + ikä, toiminto = teonsana. */
  var RYHMA_MIN = 3, HUOMIOKORTTEJA = 3, LISTA_MAX = 5, SIG_JARJ = { ei_jaksoa: 1, katselmusikkuna: 2, katsaus_laskee: 3, kaytto_matala: 4 }, AIHE = { ei_jaksoa: 'Jakso', katselmusikkuna: 'Katselmus', katsaus_laskee: 'Katsaus', kaytto_matala: 'Käyttö', viesti: 'Viesti' };

  function tmKotiRytmiMalli(m, env) {
    env = env || {}; var km = tmKotiKaynnistysMalli(m, env), rivit = ((m && m.rivit) || []).filter(function (x) { return x.n > 0; }), koosteJ = env.koosteJ || {}, nimetK = rivit.map(function (x) { return x.nimi; }), nimiJid = {}; rivit.forEach(function (x) { nimiJid[x.jid] = x; });
    var gate = function (jid) { var r = nimiJid[jid], kj = koosteJ[jid] || {}; return !!r && kj.n_suostumus != null && r.n >= PIENI && kj.n_suostumus >= KATTAVUUS_PERHE * r.n; };
    var sig = ((m && m.signaalitLista) || []).filter(function (s) { return nimiJid[s.jid] && !((s.tyyppi === 'katsaus_laskee' || s.tyyppi === 'kaytto_matala') && !gate(s.jid)); }).map(function (s) { return Object.assign({}, s, { tunniste: lyhytT(s.nimi, nimetK), jarj: SIG_JARJ[s.tyyppi] || 9 }); });
    var ryh = {}; sig.forEach(function (s) { (ryh[s.tyyppi] = ryh[s.tyyppi] || []).push(s); });
    var entries = [];
    Object.keys(ryh).forEach(function (ty) { var L = ryh[ty]; if (L.length >= RYHMA_MIN) entries.push({ tyyppi: ty, ryhma: true, jarj: SIG_JARJ[ty] || 9, joukkueet: L.map(function (s) { return { jid: s.jid, nimi: s.nimi, tunniste: s.tunniste }; }), n: L.length, sigs: L }); else L.forEach(function (s) { entries.push({ tyyppi: ty, ryhma: false, jarj: s.jarj, s: s, joukkueet: [{ jid: s.jid, nimi: s.nimi, tunniste: s.tunniste }], n: 1 }); }); });
    entries.sort(function (a, b) { return a.jarj - b.jarj; });
    (env.viestit || []).slice().sort(function (a, b) { return (b.ms || 0) - (a.ms || 0); }).forEach(function (v) { entries.push({ tyyppi: 'viesti', ryhma: false, jarj: 50, v: v, joukkueet: [], n: 1 }); });
    var kortti = entries.length && entries[0].tyyppi !== 'viesti' ? entries[0] : null, loput = entries.slice(kortti ? 1 : 0), naytetaan = loput.slice(0, kortti ? LISTA_MAX - 1 : LISTA_MAX);
    /* huomiokortit: joukkueet joilla katselmus-/katsaus-/käyttösignaali (ei "ei jaksoa": se on tunnisterivillä) — enintään 3, ikäjärjestys per signaalin tärkeys */
    var huomioSyy = {}, huomioJrj = []; sig.filter(function (s) { return s.tyyppi !== 'ei_jaksoa'; }).sort(function (a, b) { return a.jarj - b.jarj; }).forEach(function (s) { if (!huomioSyy[s.jid]) { huomioSyy[s.jid] = s; huomioJrj.push(s.jid); } });
    var huomioIds = huomioJrj.slice(0, HUOMIOKORTTEJA), jaksolliset = km.jaksollaRivit, hid = {}; huomioIds.forEach(function (j) { hid[j] = 1; });
    var huomio = jaksolliset.filter(function (r) { return hid[r.jid]; }).map(function (r) { return Object.assign({}, r, { syy: huomioSyy[r.jid] }); });
    var muut = jaksolliset.filter(function (r) { return !hid[r.jid]; });
    var vk = km.askeleet.filter(function (a) { return a.valmis; }).length, seuraava = km.askeleet.filter(function (a) { return !a.valmis; })[0] || null;
    return Object.assign({}, km, { entries: entries, kortti: kortti, rivit2: naytetaan, lisaa: entries.length - (kortti ? 1 : 0) - naytetaan.length, asioita: entries.length, huomio: huomio, muut: muut, ilman: km.odottaa,
      kn: vk < km.askeleet.length ? { valmiit: vk, yht: km.askeleet.length, seuraava: seuraava } : null });
  }

  /* signaalin / ryhmän tekstit (D162): { aihe, otsikko, perustelu[], nappi, fn, arg } — avain + parametrit; käännös HTML:ssä */
  function _sigTeksti(e) {
    var ty = e.tyyppi, s = e.s, ik = s && s.jaksoVk ? s.jaksoVk : null, tn = s ? s.tunniste : null;
    if (e.ryhma) {
      var p = { n: e.n };
      if (ty === 'ei_jaksoa') return { aihe: 'Jakso', otsikko: { k: '{n} joukkuetta on ilman jaksoa.', p: p }, perustelu: [{ k: 'Jakso antaa joukkueelle teeman, viikkotavoitteet ja katselmuksen.' }], nappi: { k: 'Aloita jaksot' }, fn: 'aloitaJaksot', havainto: { k: 'Joukkueita ilman jaksoa' } };
      if (ty === 'katselmusikkuna') return { aihe: 'Katselmus', otsikko: { k: '{n} joukkueen katselmusikkuna on auki.', p: p }, perustelu: [{ k: 'Kevyt katselmus riittää: kolme kysymystä ja yksi lause.' }], nappi: { k: 'Avaa Tilanne' }, fn: 'tilanne', havainto: { k: 'Katselmusikkuna auki' } };
      if (ty === 'katsaus_laskee') return { aihe: 'Katsaus', otsikko: { k: 'Viikkokatsaus on laskenut {n} joukkueella.', p: p }, perustelu: [{ k: 'Katsauksia tehdään yhä harvemmin useassa joukkueessa.' }], nappi: { k: 'Viesti valmentajille' }, fn: 'valmentaja', havainto: { k: 'Viikkokatsaus laskenut' } };
      return { aihe: 'Käyttö', otsikko: { k: 'Pelaajat ja perheet eivät vielä käytä sovellusta {n} joukkueella.', p: p }, perustelu: [{ k: 'Käyttö 7 pv on alle tavoitteen.' }], nappi: { k: 'Avaa Tilanne' }, fn: 'tilanne', havainto: { k: 'Käyttö alle tavoitteen' } };
    }
    if (ty === 'ei_jaksoa') return { aihe: 'Jakso', otsikko: { k: '{nimi} on ollut ilman jaksoa {vk} viikkoa.', p: { nimi: tn, vk: s.vk } }, perustelu: [{ k: '{n} pelaajaa ilman jaksoa.', p: { n: s.n } }], nappi: { k: 'Aloita jakso' }, fn: 'joukkue', arg: s.nimi, havainto: { k: '{nimi} on ilman jaksoa', p: { nimi: tn } } };
    if (ty === 'katselmusikkuna') return { aihe: 'Katselmus', otsikko: s.pv != null ? { k: 'Katselmusikkuna sulkeutuu {pv} päivän päästä', p: { pv: s.pv } } : { k: 'Katselmusikkuna on auki' }, perustelu: [{ k: '{n} pelaajan katselmus tekemättä.', p: { n: s.auki } }].concat(ik ? [{ k: 'Jakso vk {vk}/{N}.', p: ik }] : []).concat([{ k: 'Kevyt katselmus riittää.' }]), nappi: { k: 'Sulje jakso lauseella' }, fn: 'joukkue', arg: s.nimi, havainto: s.pv != null ? { k: 'Katselmusikkuna sulkeutuu {pv} päivän päästä', p: { pv: s.pv } } : { k: 'Katselmusikkuna on auki' } };
    if (ty === 'katsaus_laskee') return { aihe: 'Katsaus', otsikko: { k: 'Viikkokatsaus on laskenut kolme viikkoa' }, perustelu: [{ k: 'Katsaus {a} → {b} % pelaajista.', p: { a: s.alku, b: s.loppu } }].concat(ik ? [{ k: 'Jakso vk {vk}/{N}.', p: ik }] : []), nappi: { k: 'Viesti valmentajalle' }, fn: 'valmentaja', havainto: { k: 'Katsaus laskenut kolme viikkoa' } };
    return { aihe: 'Käyttö', otsikko: { k: 'Pelaajat ja perheet eivät vielä käytä sovellusta' }, perustelu: [{ k: 'Käyttö 7 pv {pros} %, tavoite {tav} %.', p: { pros: s.pros, tav: s.tavoite } }, s.leikkija ? { k: 'Perheen kuittaukset puuttuvat.' } : { k: 'Kotitehtäviä tai omia harjoitteita ei ole merkitty.' }], nappi: { k: 'Viesti perheille' }, fn: 'joukkue', arg: s.nimi, havainto: { k: 'Käyttö alle tavoitteen' } };
  }

  function tmKotiRytmiHTML(rm, opts) {
    opts = opts || {}; _kieli = opts.kieli || 'fi'; var esc = opts.esc || _esc, t = _tt(opts), fn = opts.fn || {}, nyt = rm.nyt;
    var kk = function (f) { var a = Array.prototype.slice.call(arguments); a.unshift(esc); a[1] = fn[f]; return _call.apply(null, a); };
    var X = function (o) { if (o == null) return ''; if (o.raw != null) return o.raw; if (o.ms != null) return _pvAika(o.ms, nyt, t); return _fill(t(o.k), o.p); };
    var kuitt = function (avain) { return fn.kuittaa ? ['kuitattu', 'siirretty'].map(function (tl) { return '<button type="button" class="kk-lnk g" data-kuittaus="' + tl + '"' + kk('kuittaa', avain, tl) + '>' + esc(t(tl === 'kuitattu' ? 'Kuittaa' : 'Ensi viikolla')) + '</button>'; }).join('') : ''; };
    var tagit = function (L, avain) { var auki = !!(opts.auki && opts.auki[avain]), nayt = auki ? L : L.slice(0, 6), loput = L.length - nayt.length; return nayt.map(function (j) { return '<button type="button" class="kk-tag" title="' + esc(j.nimi) + '"' + kk('joukkue', j.nimi) + '>' + esc(j.tunniste) + '</button>'; }).join('') + (loput > 0 ? '<button type="button" class="kk-tag"' + kk('auki', avain) + '>+' + loput + '</button>' : ''); };
    var teksti = function (e) { return _sigTeksti(e); };
    /* otsikko (D163: viikko, ei kausi) */
    var kortti = rm.kortti, kt = kortti ? teksti(kortti) : null, cardH = kt ? X(kt.otsikko) : null;
    var h1 = rm.asioita === 0 ? t('Rauhallinen viikko.') : rm.asioita === 1 ? t('Yksi asia tällä viikolla.') : _fill(t('{n} asiaa tällä viikolla.'), { n: rm.asioita });
    var lause = _fill(t('Jakso on käynnissä {a}/{b} joukkueella.'), { a: rm.jaksolla, b: rm.joukkueita }) + (kortti ? ' ' + _fill(t('Tärkein: {asia}'), { asia: cardH }) : '');
    var h = '<div class="kk">' + _otsikko(rm, opts, esc, t, fn, kk, (rm.seuraNimi ? rm.seuraNimi + ' · ' : '') + _fill(t('viikko {n}'), { n: rm.vkNum != null ? rm.vkNum : (rm.vk || '') }), h1, lause);
    /* Tällä viikolla: signaalikortti (ainoa täytetty nappi) + lista */
    if (rm.asioita > 0) {
      h += '<div><div class="kk-sh"><span class="kt-eb">' + esc(t('Tällä viikolla')) + '</span><span class="kk-m">' + esc(_fill(rm.asioita === 1 ? t('{n} asia') : t('{n} asiaa'), { n: rm.asioita })) + '</span></div>';
      if (kortti) {
        var avain = kortti.ryhma ? null : kortti.s.avain, why = kt.perustelu.map(X).join(' ');
        h += '<div class="kt-sig w kk-sigk"' + (avain ? ' data-signaali="' + esc(avain) + '"' : '') + '><span class="kt-eb">' + esc(_fill(kortti.ryhma ? t('{aihe} · {n} joukkuetta') : t('{aihe} · {joukkue}'), { aihe: t(kt.aihe), joukkue: kortti.joukkueet[0].tunniste, n: kortti.n })) + '</span><div class="kk-sg"><div class="kk-sgl"><div class="kt-sig-h">' + esc(cardH) + '</div><div class="kt-sig-why">' + esc(why) + '</div>' + (kortti.ryhma ? '<div class="kk-tags">' + tagit(kortti.joukkueet, 'kortti') + '</div>' : '') + '</div>'
          + '<button class="kt-btn" type="button"' + kk(kt.fn, kt.arg) + '>' + esc(X(kt.nappi)) + '</button></div>' + (!kortti.ryhma && (fn.kuittaa || fn.joukkue) ? '<div class="kt-sig-second">' + kuitt(avain) + '</div>' : '') + '</div>';
      }
      if (rm.rivit2.length) h += '<div class="kt-vl kk-list' + (kortti ? ' kk-eka' : '') + '">' + rm.rivit2.map(function (e) {
        if (e.tyyppi === 'viesti') { var v = e.v; return '<div class="kk-it"><span class="kk-d w" aria-hidden="true"></span><span class="kk-tx"><span class="kk-a"><span class="kk-k">' + esc(t('Viesti') + (v.nimi ? ' · ' + v.nimi : '')) + '</span>' + esc(v.teksti) + '</span><span class="kk-m">' + esc(_fill(t('{aika} · odottaa sinua'), { aika: v.ms != null ? _pvAika(v.ms, nyt, t) : '' })) + '</span></span><span class="kk-ac">' + (fn.viesti ? '<button type="button" class="kk-lnk"' + kk('viesti', v.osapuoli, v.id) + '>' + esc(t('Vastaa')) + '</button>' : '') + '</span></div>'; }
        var tx = teksti(e);
        if (e.ryhma) return '<details class="kk-ryhma"><summary class="kk-it"><span class="kk-d w" aria-hidden="true"></span><span class="kk-tx"><span class="kk-a"><span class="kk-k">' + esc(_fill(t('{aihe} · {n} joukkuetta'), { aihe: t(tx.aihe), n: e.n })) + '</span>' + esc(X(tx.havainto)) + '</span><span class="kk-tags">' + e.joukkueet.slice(0, 6).map(function (j) { return '<span class="kk-tag">' + esc(j.tunniste) + '</span>'; }).join('') + (e.n > 6 ? '<span class="kk-tag">+' + (e.n - 6) + '</span>' : '') + '</span></span><span class="kk-ac"><span class="kk-go" aria-hidden="true">▾</span></span></summary>'
          + '<div class="kk-ryhmasis">' + (tx.fn === 'aloitaJaksot' && fn.aloitaJaksot ? '<div class="kk-alit"><button type="button" class="kk-lnk"' + kk('aloitaJaksot') + '>' + esc(t('Aloita jaksot →')) + '</button></div>' : '') + e.joukkueet.map(function (j) { return '<button type="button" class="kk-alit kk-alit2" aria-label="' + esc(j.nimi) + '"' + kk('joukkue', j.nimi) + '><span class="kk-tn">' + esc(j.tunniste) + '</span><span class="kk-go" aria-hidden="true">›</span></button>'; }).join('') + '</div></details>';
        return '<div class="kk-it" data-signaali="' + esc(e.s.avain) + '"><span class="kk-d w" aria-hidden="true"></span><span class="kk-tx"><span class="kk-a"><span class="kk-k">' + esc(_fill(t('{aihe} · {joukkue}'), { aihe: t(tx.aihe), joukkue: e.joukkueet[0].tunniste })) + '</span>' + esc(X(tx.otsikko)) + '</span><span class="kk-m">' + esc(tx.perustelu.map(X).join(' ')) + '</span></span><span class="kk-ac"><button type="button" class="kk-lnk"' + kk(tx.fn, tx.arg) + '>' + esc(X(tx.nappi)) + '</button>'
          + (fn.kuittaa ? '<details class="kk-kebab"><summary aria-label="' + esc(t('Kuittaa · Ensi viikolla')) + '" title="' + esc(t('Kuittaa · Ensi viikolla')) + '">⋯</summary><div class="kk-menu">' + kuitt(e.s.avain) + '</div></details>' : '') + '</span></div>'; }).join('') + '</div>';
      if (rm.lisaa > 0) h += '<div class="kk-m" style="margin-top:6px">' + esc(_fill(t('+{n} muuta'), { n: rm.lisaa })) + (fn.tilanne ? ' · <button type="button" class="kk-lnk"' + kk('tilanne') + '>' + esc(t('Kaikki signaalit ja poikkeamat → Tilanne · kausi')) + '</button>' : '') + '</div>';
      h += '</div>';
    } else h += '<div><div class="kk-sh"><span class="kt-eb">' + esc(t('Tällä viikolla')) + '</span></div><div class="kt-note">' + esc(_fill(t('Ei uusia asioita · tarkistettu {n} joukkuetta'), { n: rm.joukkueita })) + '</div></div>';   // D114
    /* Joukkueet · kolme tasoa (D166) */
    var Lnum = function (nimike, c) { return '<span class="kk-nu"><span class="kk-nk">' + esc(t(nimike)) + '</span><span class="kk-v' + (c.w ? ' w' : '') + '">' + (c.pros != null ? esc(c.pros + ' %') : '<span class="kk-na">' + esc(t(c.ei === 'leikkija' ? 'perhe kuittaa' : '—')) + '</span>') + '</span></span>'; };
    var luvut = function (r) { return r.luvut ? [Lnum('Katsaus', r.luvut.katsaus), Lnum('Käyttö 7 pv', r.luvut.kaytto)].join('') : null; };
    var perh = function (r) { return '<span class="kk-nu kk-perh"><span class="kk-nk">' + esc(t('perheitä mukana')) + '</span><span class="kk-v">' + esc(luku(r.perheet.a, r.perheet.b)) + '</span></span>'; };
    var ikav = function (r) { return (r.ikavaihe ? t(IV[r.ikavaihe]) + ' · ' : '') + _fill(t('{n} pel.'), { n: r.n }); };
    h += '<div><div class="kk-sh"><span class="kt-eb">' + esc(t('Joukkueet · ikäjärjestys')) + '</span><span class="kk-m">' + esc(_fill(t('{b} joukkuetta · {a} jaksolla'), { a: rm.jaksolla, b: rm.joukkueita })) + '</span></div>';
    if (rm.huomio.length) h += '<div class="kk-jg">' + rm.huomio.map(function (r) {
      var sy = r.syy, why = sy.tyyppi === 'katselmusikkuna' ? (sy.pv != null ? _fill(t('Katselmusikkuna sulkeutuu {pv} päivän päästä'), { pv: sy.pv }) : t('Katselmusikkuna on auki')) : sy.tyyppi === 'katsaus_laskee' ? t('Katsaus laskenut kolme viikkoa') : _fill(t('Käyttö {pros} %, tavoite {tav} %'), { pros: sy.pros, tav: sy.tavoite });
      return '<button type="button" class="kk-jk w" aria-label="' + esc(r.nimi) + '"' + kk('joukkue', r.nimi) + '><span class="kk-jkt"><span class="kk-jtn">' + esc(r.tunniste) + '</span><span class="kk-mk w">▲ ' + esc(t('huomio')) + '</span></span><span class="kk-sub">' + esc(ikav(r)) + '</span>'
        + '<span class="kk-jak"><b>' + esc(r.teema || t('Jakso käynnissä')) + '</b>' + (r.vk ? '<span class="kk-vkl">' + esc(_fill(t('vk {vk}/{N}'), r.vk)) + '</span>' : '') + '</span><span class="kk-why">' + esc(why) + '</span><span class="kk-nums">' + (luvut(r) || perh(r)) + '</span></button>'; }).join('') + '</div>';
    if (rm.muut.length) h += '<div class="kt-vl kk-list"' + (rm.huomio.length ? ' style="margin-top:10px"' : '') + '>' + rm.muut.map(function (r) {
      return '<div class="kk-jr"' + (fn.joukkue ? kk('joukkue', r.nimi) + ' role="button" tabindex="0"' : '') + '><span class="kk-tn" title="' + esc(r.nimi) + '">' + esc(r.tunniste) + '</span><span class="kk-te"><b>' + esc(r.teema || t('Jakso käynnissä')) + '</b><span class="kk-m">' + esc(ikav(r) + (r.vk ? ' · ' + _fill(t('vk {vk}/{N}'), r.vk) : '')) + '</span></span>' + (luvut(r) || perh(r)) + '<span class="kk-ar" aria-hidden="true">→</span></div>'; }).join('') + '</div>';
    if (rm.ilman.length) h += '<div class="kk-odottaa"' + ((rm.huomio.length || rm.muut.length) ? ' style="margin-top:10px"' : '') + '><div><span class="kt-eb">' + esc(_fill(t('Ilman jaksoa · {n}'), { n: rm.ilman.length })) + '</span><div class="kk-tags">' + tagit(rm.ilman.filter(function (x, i, a) { return a.findIndex(function (y) { return y.tunniste === x.tunniste; }) === i; }), 'ilman') + '</div></div>' + (fn.aloitaJaksot ? '<button class="kk-lnk" type="button"' + kk('aloitaJaksot') + '>' + esc(rm.ilman.length === 1 ? t('Aloita jakso →') : t('Aloita jaksot →')) + '</button>' : '') + '</div>';
    h += '</div>';
    /* Käynnistyksen askeleet ohuena rivinä kunnes kaikki valmiita */
    if (rm.kn) { var sa = rm.kn.seuraava; h += '<div class="kt-ev kk-kn"><span>' + esc(t('Käynnistys')) + '</span><b>' + esc(rm.kn.valmiit + '/' + rm.kn.yht) + '</b><span>' + esc(_fill(t('askelta valmiina · {nimi} {a}/{b}'), { nimi: t(sa.nimi).toLowerCase(), a: sa.a, b: sa.b })) + '</span><span class="kk-bar" role="img" aria-label="' + esc(rm.kn.valmiit + '/' + rm.kn.yht) + '"><i style="width:' + Math.round(100 * rm.kn.valmiit / rm.kn.yht) + '%"></i></span><button type="button" class="kk-lnk"' + kk(sa.fn) + '>' + esc(X(sa.toiminto)) + '</button></div>'; }
    return { main: h + _loppu(opts, esc, t, fn, kk) + '</div>', rail: _rail(rm, opts, esc, t, fn) };
  }

  /* ── Esimerkkiseura (D167): FC Demo, keksitty, vain muistissa ───────────────────────────────────────── */
  var DEMO_JOUKKUEET = [['P10', 10, 8, 'Pelaaminen', 3, 8, 'kilpa'], ['P11', 11, 8, 'Ensikosketus', 2, 6, 'harraste'], ['P12', 12, 10, 'Haltuunotto', 2, 6, 'kilpa'], ['T12', 12, 4, 'Peliasento', 1, 4, 'kilpa'], ['P13', 13, 12, 'Ensimmäinen kosketus', 5, 6, 'kilpa'], ['P14', 14, 18, 'Kuljettaminen', 3, 6, 'kilpa'], ['T14', 14, 16, 'Murtautuminen', 3, 8, 'kilpa'], ['P15', 15, 10, null, 0, 0, 'kilpa'], ['P16', 16, 11, 'Syöttö', 3, 8, 'harraste']];
  function tmKotiDemo(nytMs) {
    var V = _V(), nyt = nytMs != null ? nytMs : Date.now();
    var koosteet = [3, 2, 1, 0].map(function (w) {
      var jm = {}, y = { n_pelaajat: 0, n_suostumus: 0, n_aktiivinen_7: 0, n_harjoite_7: 0 };
      DEMO_JOUKKUEET.forEach(function (j, i) { var n = j[2], jakso = !!j[3] && j[4] >= w, su = Math.round(n * .8), akt = Math.round(n * .75), harj = Math.round(n * .45);
        jm['demo' + i] = { nimi: j[0] + ' Demo', ikavaihe: j[1] <= 12 ? 'leikkija' : j[1] <= 15 ? 'rakentaja' : 'showcase', tyyppi: j[6], profiili: i > 3 ? 'ammatti' : 'oto', jakso: jakso, n_pelaajat: n, n_jaksolla: jakso ? n : 0, n_valinta_odottaa: 0, n_katselmus: i === 4 && w === 0 ? 6 : 0, n_vastanneet: jakso ? Math.round(n * (i === 5 ? [.6, .7, .8, .9][w] : .7)) : 0, n_vastausperusta: jakso ? n : 0, n_katselmus_ajallaan: jakso ? 1 : 0, n_katselmus_perusta: jakso ? 1 : 0, n_suostumus: su, n_kirjautunut_30: akt, n_huoltaja_30: Math.round(su * .6), n_aktiivinen_7: akt, n_aktiivinen_30: akt, n_toiminto_7: Math.round(akt / 2), n_perhe_kuittaus_7: Math.round(su / 2), n_harjoite_7: harj, n_harjoite_30: harj, jakso_nimi: jakso ? j[3] : null };
        y.n_pelaajat += n; y.n_suostumus += su; y.n_aktiivinen_7 += akt; y.n_harjoite_7 += harj; });
      return { vk: V.tmIsoViikkoMs(nyt - w * 7 * DAY).tunniste, versio: 5, laskettu: { seconds: (nyt - (w === 0 ? 2 * 3600000 : w * 7 * DAY)) / 1000 }, yhteensa: y, joukkueet: jm };
    });
    var H = 3600000, har = function (jn, h) { return { nimi: '', tyyppi: 'harjoitus', joukkue_nimi: jn + ' Demo', alkaa: nyt + h * H }; };
    var kalenteri = [har('P14', 6), har('T14', 8), har('P10', 27), har('P12', 29), har('P13', 31), { nimi: '', tyyppi: 'ottelu', joukkue_nimi: 'P13 Demo', alkaa: nyt + 3 * DAY }, har('P16', 100), { nimi: 'Valmentajapalaveri', tyyppi: 'palaveri', alkaa: nyt + 5 * DAY }];
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
    '.kk-loppu{display:flex;gap:6px;flex-wrap:wrap;margin-top:6px;font-size:var(--fs-meta,12.5px);color:var(--ink3)}.kk-rtags{display:inline-flex;gap:4px;flex-wrap:wrap;margin-left:8px;vertical-align:middle}.kk-rr .kk-tag{cursor:default;padding:0 5px}',
    '#ws-koti.kk-uusi{margin-left:0;margin-right:auto}',
    /* Rytmi (PR D) */
    '.kk-sigk{border-color:var(--amber);background:var(--amber-dim);display:grid;gap:10px}.kk-sg{display:grid;grid-template-columns:minmax(0,1fr) auto;gap:16px;align-items:center}.kk-sgl{display:grid;gap:8px;min-width:0}.kk-sigk .kt-sig-second{display:flex;gap:16px;flex-wrap:wrap;border-top:1px dashed var(--border);padding-top:8px}.kk-sigk .kk-lnk.g{color:var(--ink2);text-decoration:none;font-size:var(--fs-body,14px)}',
    '.kk-eka{margin-top:10px}.kk-ac{display:flex;gap:14px;align-items:center}.kk-kebab{position:relative}.kk-kebab summary{list-style:none;cursor:pointer;border:1px solid var(--border);border-radius:4px;width:28px;height:28px;display:grid;place-items:center;color:var(--ink2)}.kk-kebab summary::-webkit-details-marker{display:none}',
    '.kk-menu{position:absolute;right:0;top:32px;z-index:5;display:grid;min-width:140px;border:1px solid var(--border);border-radius:6px;background:var(--bg);overflow:hidden}.kk-menu .kk-lnk{padding:9px 14px;border-top:1px solid var(--border);color:var(--ink);font-weight:400;text-decoration:none;font-size:var(--fs-body,14px)}.kk-menu .kk-lnk:first-child{border-top:0}',
    '.kk-ryhma{border-top:1px solid var(--border)}.kk-ryhma:first-child{border-top:0}.kk-ryhma>summary{list-style:none;cursor:pointer;border-top:0}.kk-ryhma>summary::-webkit-details-marker{display:none}.kk-ryhma[open]>summary .kk-go{display:inline-block;transform:rotate(180deg)}.kk-ryhmasis{background:var(--ov-1)}.kk-alit{display:flex;justify-content:space-between;align-items:center;padding:9px 16px 9px 40px;border:0;border-top:1px solid var(--border);background:none;color:inherit;font:inherit;cursor:pointer;width:100%;text-align:left}.kk-alit2 .kk-tn{font-size:var(--fs-lead,16px)}.kk-go{color:var(--ink3)}',
    '.kk-jg{display:grid;grid-template-columns:repeat(auto-fill,minmax(210px,1fr));gap:10px}.kk-jk{border:1px solid var(--border);border-radius:8px;background:var(--bg);padding:14px 16px 12px;display:grid;gap:8px;cursor:pointer;color:inherit;font:inherit;text-align:left;position:relative}.kk-jk:hover{border-color:var(--ink3)}.kk-jk.w{border-color:var(--amber);box-shadow:inset 3px 0 0 var(--amber)}',
    '.kk-jkt{display:flex;justify-content:space-between;align-items:baseline;gap:8px}.kk-jtn{font-family:var(--font-serif);font-size:var(--fs-h2,26px);line-height:1;font-weight:500}.kk-mk{font-size:var(--fs-meta,12.5px);color:var(--ink2)}.kk-mk.w{color:var(--amber);font-weight:600}.kk-sub{font-size:var(--fs-meta,12.5px);color:var(--ink2);margin-top:-4px}',
    '.kk-jak{display:grid;gap:5px}.kk-jak b{font-size:var(--fs-body,14px);font-weight:600;line-height:1.25}.kk-vkl{font-size:var(--fs-meta,12.5px);color:var(--ink2)}.kk-why{font-size:var(--fs-meta,12.5px);color:var(--amber)}.kk-nums{display:flex;gap:16px;border-top:1px solid var(--border);padding-top:8px}.kk-nums .kk-nu{display:grid}.kk-nums .kk-perh{grid-column:auto}',
    '.kk-v.w{color:var(--amber)}.kk-kn{display:flex;align-items:center;gap:14px;flex-wrap:wrap;padding:10px 14px;font-size:var(--fs-body,14px);color:var(--ink2)}.kk-kn b{font-family:var(--font-serif);font-size:var(--fs-h2,26px);font-weight:500;color:var(--ink)}.kk-kn .kk-bar{flex:1;min-width:120px}',
    '@container (max-width:900px){.kk-st{grid-template-columns:28px minmax(0,1fr);padding:14px 16px}.kk-st>.kt-btn,.kk-st>.kk-lnk{grid-column:2;justify-self:start}.kk-jr{grid-template-columns:minmax(0,1fr) 64px 64px;row-gap:2px;padding:10px 12px}.kk-tn{grid-column:1/-1}.kk-ar{display:none}.kk-perh{grid-column:span 2}}',
    '@media (max-width:720px){.kk-st{grid-template-columns:28px minmax(0,1fr);padding:14px 16px}.kk-st>.kt-btn,.kk-st>.kk-lnk{grid-column:2;justify-self:start}.kk-jr{grid-template-columns:minmax(0,1fr) 64px 64px;row-gap:2px;padding:10px 12px}.kk-tn{grid-column:1/-1}.kk-ar{display:none}}'
  ].join('\n');

  var API = { CSS: CSS, lyhyt: lyhyt, luku: luku, tmKotiVaihe: tmKotiVaihe, tmKotiKaynnistysMalli: tmKotiKaynnistysMalli, tmKotiKaynnistysHTML: tmKotiKaynnistysHTML, tmKotiRytmiMalli: tmKotiRytmiMalli, tmKotiRytmiHTML: tmKotiRytmiHTML, tmKotiDemo: tmKotiDemo, tmKotiDemoNauhaHTML: tmKotiDemoNauhaHTML };
  if (typeof module !== 'undefined' && module.exports) module.exports = API;
  if (root) root.TM_VP_KOTI = API;
})(typeof window !== 'undefined' ? window : null);
