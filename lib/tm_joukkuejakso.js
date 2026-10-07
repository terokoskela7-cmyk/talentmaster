/* ════════════════════════════════════════════════════════════════════════
   tm_joukkuejakso.js — J2 (docs/CODE_BRIEF_J2_JOUKKUEJAKSO.md; design 12 D17·D21, 13 §3): JOUKKUEJAKSO Masterin Kausi-näkymässä (PURE; ei Firebasea, ei DOM-kirjoitusta; adapteri hoitaa DOM:n ja kirjoituksen).
   Neljä aluetta: tekn.-takt. (seuran teema tai Oma) · fyysinen (seuran hyväksytty ohjelma TAI TM_FYYSTEEMAT-teema; vapaa teksti vain "Oma" — jotta kypsyysvahti saa tunnetun avaimen) · henkinen/sosiaalinen (yksi lause, valinnaiset).
   Validointi: lib/tm_tukitavoitteet.js tmJoukkuejaksoOsaAlueet (KIELLETYT, ≤120, fy_*-avain TM_FYYSTEEMAT:ia vasten). Kesto: tm_jakso_malli.tmJaksonKesto(joukkueen ikä) (D7). Kirjoitus: tm_kehityssilmukka.tmAsetaJaksofokus (YKSI kirjoituspolku, ei uutta kirjoittajaa).
   · tmJoukkueenIka(joukkue)                    → ikä luvuksi joukkueen nimestä/ikaryhmästä ('KPV U13' → 13) | null
   · tmJoukkuejaksoValinnat(ctx)                → { tekn:[{arvo,nimi,avain,alkaa,paattyy}], fyysRyhmat:[{ryhma, optiot:[{arvo,nimi,avain,ohjelma_id?,lahde}]}] }  ctx: { joukkue (nimi), teemat (tmTeemaKerros), ohjelmat[], tanaan }
   · tmJoukkuejaksoTiedot(jDoc, ctx)            → lomakkeen alkuarvot (tila aloita|muokkaa, esivalinnat, kesto D7, alku)
   · tmJoukkuejaksoModalHTML(x, opts)           → modaalin HTML. opts: { esc, t, overlayAttrs, tallennaFn, suljeFn, modalId }
   · tmJoukkuejaksoSyote(arvo)                  → raakasyöte kentistä (arvo(id) → merkkijono)
   · tmJoukkuejaksoRakenna(syote, x, opts)      → validoitu jaksofokus (osa_alueet, alku, kesto_vk, katselmus_alku/loppu); heittää selkeän virheen. opts: { nytISO, rooli }
   · tmJoukkuejaksoKirjoitus(jDoc, jf, deps)    → { update:{jaksofokus, [jaksofokus_historia]}, paikallinen:{jaksofokus, historiaLisays} } — Rules v3.37: vain nämä kaksi kenttää
   · tmJoukkuejaksoKortti(jDoc, ctx) / tmJoukkuejaksoKorttiHTML(k, opts) → "Joukkueen jakso" -kortti (neljä aluetta, viikko n/N, katselmusikkuna)
   K1 (docs/CODE_BRIEF_K1_TAMAN_TUEKSI.md §3, valinta A): pelaajan token ei lue joukkuedokumenttia → joukkuejakson SNAPSHOT pelaajan jaksofokus.joukkuejakso_viite:en (valmentajan oikeuksin; Rules ennallaan v3.42).
   · tmJoukkuejaksoSnapshot(jDoc, jid)          → { jid, alku, kesto_vk, nimi, viikot:[{vk, tavoite}] } | null — EI muita avaimia (ei asetti/lahde/historia); nimi = osa_alueet.tekninen_taktinen.nimi
   · tmJoukkuejaksoSynkka(vanha, uusiDoc, jid, pelaajat, opts) → { paivitykset:[{id, update:{'jaksofokus.joukkuejakso_viite': snapshot}}], ohitettu } — vain pelaajat, joilla viite.jid + viite.alku = TALLENNUSTA EDELTÄVÄ pari
   · tmJoukkuejaksoSynkkaIlmoitusHTML(n, opts)  → valmentajalle näkyvä huomautus epäonnistuneista propagoinneista + "Yritä uudelleen"
   · tmJoukkuejaksoViikko(viite, tanaan)        → { nimi, viikkotavoite, viikko } | null (pelaajan snapshotista, tmJoukkuejaksoKortti-laskennalla; umpeutunut/alkamaton → null)
   Ketjunimiä ei näytetä. Vain tokenit (ei hex-värejä); kaikki teksti opts.t:n läpi; kaikki arvot escapataan. Dual-export: module.exports || window.TM_JOUKKUEJAKSO.
════════════════════════════════════════════════════════════════════════ */
(function (root) {
  'use strict';
  var IDS = { tekn: '_jjTekn', teknOma: '_jjTeknOma', fyys: '_jjFyys', fyysOma: '_jjFyysOma', hen: '_jjHen', sos: '_jjSos', alku: '_jjAlku', kesto: '_jjKesto' };
  var VK_ID = '_jjVk_', VK_MAX = 12, VK_PITUUS = 120;   // J4 B: viikkotavoitteet — yksi rivi per jakson viikko (≤ 120 merkkiä)
  var OMA = '__oma', NYK = '__nykyinen', DAY = 86400000, KATSELMUS_PV = 14;

  function _esc(s) { return String(s == null ? '' : s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;'); }
  function _t(o) { return (o && typeof o.t === 'function') ? o.t : function (k) { return k; }; }
  function _req(g, f) { try { return (typeof module !== 'undefined' && module.exports && typeof require === 'function') ? require(f) : (root && root[g]); } catch (e) { return root && root[g]; } }
  function _JM() { return _req('TM_JAKSO_MALLI', './tm_jakso_malli.js'); }
  function _TT() { return _req('TM_TUKITAVOITTEET', './tm_tukitavoitteet.js'); }
  function _KS() { return _req('TM_KEHITYSSILMUKKA', './tm_kehityssilmukka.js'); }
  function _FY() { return _req('TM_FYYSTEEMAT_LIB', './tm_fyysteemat.js'); }
  function _virhe(m) { return new Error('tm_joukkuejakso: ' + m); }
  function _paivaNum(iso) { var m = /^(\d{4})-(\d{2})-(\d{2})/.exec(String(iso || '')); return m ? Date.UTC(+m[1], +m[2] - 1, +m[3]) / DAY : null; }
  function _lisaaPv(iso, n) { var d = new Date((_paivaNum(iso) + n) * DAY); return d.getUTCFullYear() + '-' + String(d.getUTCMonth() + 1).padStart(2, '0') + '-' + String(d.getUTCDate()).padStart(2, '0'); }
  function _lyhyt(iso) { var m = /^(\d{4})-(\d{2})-(\d{2})/.exec(String(iso || '')); return m ? (+m[3] + '.' + +m[2] + '.') : ''; }
  function _oikeaPvm(v) { if (typeof v !== 'string' || !/^\d{4}-\d{2}-\d{2}$/.test(v)) return false; var o = v.split('-'); return _lisaaPv(v, 0) === v && +o[1] >= 1; }
  function _slug(s) { return String(s || '').trim().toLowerCase().replace(/ä/g, 'a').replace(/ö/g, 'o').replace(/å/g, 'a').replace(/[^a-z0-9]+/g, '_').replace(/^_+|_+$/g, '').slice(0, 60); }

  function tmJoukkueenIka(j) {
    var s = j && typeof j === 'object' ? (j.ikaryhma || j.nimi || '') : String(j || '');
    var m = /(\d{1,2})/.exec(String(s)); if (!m) return null;
    var n = +m[1]; return (n >= 5 && n <= 25) ? n : null;
  }

  // Vuosikellon viikkojako (J4 B): teemarivin valinnainen `viikkotavoitteet: [{vk (jakson viikko 1..N), tavoite}]`. KPV/SJK:n nykyisessä aineistossa EI ole viikkojakoa
  // (teemat.viikot = viikkoväli-teksti, joukkueharjoittelu per jakso) → esitäyttö tyhjä kunnes seuran linjaan tulee kenttä. Tavoite kulkee silti KIELLETYT-vartijan läpi tallennettaessa.
  function _vuosikello(r) { return (Array.isArray(r && r.viikkotavoitteet) ? r.viikkotavoitteet : []).filter(function (v) { return v && Number(v.vk) >= 1 && Number(v.vk) <= VK_MAX && typeof v.tavoite === 'string' && v.tavoite.trim(); }).map(function (v) { return { vk: Number(v.vk), tavoite: v.tavoite.trim() }; }); }
  // ── valinnat ──────────────────────────────────────────────────────────────────────────────
  function tmJoukkuejaksoValinnat(ctx) {
    ctx = ctx || {};
    var kerros = ctx.teemat && ctx.teemat.hyvaksytty ? ctx.teemat.hyvaksytty : null, tanaan = ctx.tanaan;
    var rivit = (kerros && Array.isArray(kerros.jaksot) ? kerros.jaksot : []).filter(function (r) { return r && r.joukkue === ctx.joukkue && typeof r.teema === 'string' && r.teema.trim(); })
      .sort(function (a, b) { return String(a.alkaa) < String(b.alkaa) ? -1 : 1; });
    var nyt = null, seur = null;
    rivit.forEach(function (r) { if (!nyt && r.alkaa <= tanaan && tanaan <= r.paattyy) nyt = r; });
    if (!nyt) rivit.forEach(function (r) { if (!seur && r.alkaa > tanaan) seur = r; });
    var esi = nyt || seur;   // #822: nykyisen päivän teema (tmJoukkueenTeema-logiikka), muuten seuraava
    var tekn = rivit.map(function (r, i) { return { arvo: 'teema:' + (r.id || i), nimi: r.teema.trim(), avain: r.id ? String(r.id) : null, alkaa: r.alkaa || null, paattyy: r.paattyy || null, esivalittu: r === esi, viikkotavoitteet: _vuosikello(r) }; });
    var FY = _FY(), ryhmat = [], byTeema = {}, muut = [];
    (Array.isArray(ctx.ohjelmat) ? ctx.ohjelmat : []).filter(function (o) { return o && o.tila === 'hyvaksytty' && !o.arkistoitu && typeof o.nimi === 'string' && o.nimi.trim(); })
      .sort(function (a, b) { return String(a.nimi).localeCompare(String(b.nimi)); }).forEach(function (o) {
        var t = (FY && o.teema_avain) ? FY.tmFyysTeema(o.teema_avain) : null;
        var opt = { arvo: 'ohj:' + o.id, nimi: o.nimi.trim(), avain: t ? t.avain : null, ohjelma_id: String(o.id), lahde: 'seura' };
        if (t) (byTeema[t.avain] = byTeema[t.avain] || { ryhma: 'Seuran ohjelmat · ' + t.nimi, optiot: [] }).optiot.push(opt); else muut.push(opt);
      });
    Object.keys(byTeema).sort().forEach(function (k) { ryhmat.push(byTeema[k]); });
    if (muut.length) ryhmat.push({ ryhma: ryhmat.length ? 'Seuran ohjelmat · muut' : 'Seuran ohjelmat', optiot: muut });
    if (FY) ryhmat.push({ ryhma: 'Fyysiset teemat', optiot: FY.TM_FYYSTEEMAT.map(function (t) { return { arvo: 'fy:' + t.avain, nimi: t.nimi, avain: t.avain, lahde: 'tm' }; }) });
    return { tekn: tekn, fyysRyhmat: ryhmat };
  }

  function _fyysArvoOsasta(fy, val) {   // olemassa oleva osa-alue → lomakkeen valinta
    if (!fy) return { arvo: '', oma: '' };
    if (fy.lahde === 'oma') return { arvo: OMA, oma: fy.nimi || '' };
    var id = fy.ohjelma_id ? 'ohj:' + fy.ohjelma_id : (fy.avain ? 'fy:' + fy.avain : null), kaikki = [];
    val.fyysRyhmat.forEach(function (g) { g.optiot.forEach(function (o) { kaikki.push(o.arvo); }); });
    return (id && kaikki.indexOf(id) >= 0) ? { arvo: id, oma: '' } : { arvo: NYK, oma: '' };
  }

  function tmJoukkuejaksoTiedot(jDoc, ctx) {
    ctx = ctx || {}; jDoc = jDoc || {};
    var JM = _JM(), TT = _TT(), jf = jDoc.jaksofokus, oa = jf && jf.osa_alueet ? jf.osa_alueet : null;
    var ika = ctx.ika != null ? ctx.ika : tmJoukkueenIka(jDoc), kesto = JM.tmJaksonKesto(ika), val = tmJoukkuejaksoValinnat(ctx), tanaan = ctx.tanaan;
    var teknArvo = '', teknOma = '', ten = oa && oa.tekninen_taktinen, fyo = oa ? TT.tmFyysinenOsaAlue(oa) : null;
    if (ten) {
      if (ten.lahde === 'oma') { teknArvo = OMA; teknOma = ten.nimi || ''; }
      else { var o = val.tekn.filter(function (v) { return v.avain && v.avain === ten.teema_avain; })[0]; teknArvo = o ? o.arvo : NYK; }
    } else { var es = val.tekn.filter(function (v) { return v.esivalittu; })[0]; teknArvo = es ? es.arvo : (val.tekn.length ? '' : OMA); }
    var f = _fyysArvoOsasta(fyo, val), viikot = {}, esitayttoV = {};
    var esiTeema = val.tekn.filter(function (v) { return v.esivalittu; })[0];
    if (esiTeema && !oa) esiTeema.viikkotavoitteet.forEach(function (v) { viikot[v.vk] = v.tavoite; esitayttoV[v.vk] = v.tavoite; });   // esitäyttö vuosikellosta vain uudelle jaksolle (oletusvalittu teema)
    if (jf && Array.isArray(jf.viikot)) jf.viikot.forEach(function (v) { if (v && Number(v.vk) >= 1 && typeof v.tavoite === 'string') { viikot[v.vk] = v.tavoite; if (v.lahde === 'vuosikello') esitayttoV[v.vk] = v.tavoite; } });
    var keston = (jf && jf.kesto_vk != null && kesto.vaihtoehdot.indexOf(Number(jf.kesto_vk)) >= 0) ? Number(jf.kesto_vk) : kesto.oletus;
    return { jid: ctx.jid || jDoc.id || null, nimi: ctx.joukkue || jDoc.nimi || '', tila: oa ? 'muokkaa' : 'aloita', valinnat: val, tekn: teknArvo, teknOma: teknOma, fyys: f.arvo, fyysOma: f.oma,
      henkinen: oa && oa.henkinen ? oa.henkinen.kuvaus : '', sosiaalinen: oa && oa.sosiaalinen ? oa.sosiaalinen.kuvaus : '', alku: (jf && jf.alku && _oikeaPvm(jf.alku)) ? jf.alku : tanaan,
      kesto: { vaihtoehdot: kesto.vaihtoehdot, valittu: keston, profiili: kesto.profiili }, nykyinen: { tekn: ten || null, fyys: oa ? oa.fyysinen : null }, ika: ika, viikot: viikot, viikotVuosikello: esitayttoV };
  }

  // ── lomake ────────────────────────────────────────────────────────────────────────────────
  function tmJoukkuejaksoModalHTML(x, opts) {
    opts = opts || {}; var esc = opts.esc || _esc, t = _t(opts), id = opts.modalId || '_jjModal';
    var kentta = 'width:100%;font-size:13px;margin:4px 0 10px;padding:7px 9px;border-radius:8px;border:.5px solid var(--border);background:var(--card);color:var(--ink);box-sizing:border-box';
    var lab = function (k) { return '<label style="font-size:11px;color:var(--ink3);letter-spacing:.04em">' + esc(t(k)) + '</label>'; };
    var omaToggle = function (omaId) { return ' onchange="var e=document.getElementById(\'' + omaId + '\');if(e)e.style.display=(this.value===\'' + OMA + '\')?\'block\':\'none\'"'; };
    var opt = function (v, n, sel) { return '<option value="' + esc(v) + '"' + (sel ? ' selected' : '') + '>' + esc(n) + '</option>'; };
    var nyk = x.tekn === NYK && x.nykyinen.tekn, nykF = x.fyys === NYK && x.nykyinen.fyys;
    var teknSel = '<select id="' + IDS.tekn + '" style="' + kentta + '"' + omaToggle(IDS.teknOma) + '>' + opt('', t('— valitse —'), x.tekn === '')
      + x.valinnat.tekn.map(function (v) { return opt(v.arvo, v.nimi + (v.alkaa ? ' · ' + _lyhyt(v.alkaa) + '–' + _lyhyt(v.paattyy) : ''), x.tekn === v.arvo); }).join('')
      + (nyk ? opt(NYK, (x.nykyinen.tekn.nimi || '') + ' · ' + t('nykyinen'), true) : '') + opt(OMA, t('Oma…'), x.tekn === OMA) + '</select>'
      + '<input id="' + IDS.teknOma + '" maxlength="120" value="' + esc(x.teknOma) + '" placeholder="' + esc(t('Oma teema (enintään 120 merkkiä)')) + '" style="' + kentta + ';display:' + (x.tekn === OMA ? 'block' : 'none') + '">';
    var fyysSel = '<select id="' + IDS.fyys + '" style="' + kentta + '"' + omaToggle(IDS.fyysOma) + '>' + opt('', t('— valitse —'), x.fyys === '')
      + x.valinnat.fyysRyhmat.map(function (g) { return '<optgroup label="' + esc(t(g.ryhma.split(' · ')[0]) + (g.ryhma.indexOf(' · ') > 0 ? ' · ' + g.ryhma.split(' · ').slice(1).join(' · ') : '')) + '">' + g.optiot.map(function (o) { return opt(o.arvo, o.nimi, x.fyys === o.arvo); }).join('') + '</optgroup>'; }).join('')
      + (nykF ? opt(NYK, (x.nykyinen.fyys.nimi || x.nykyinen.fyys.alue || '') + ' · ' + t('nykyinen'), true) : '') + opt(OMA, t('Oma…'), x.fyys === OMA) + '</select>'
      + '<input id="' + IDS.fyysOma + '" maxlength="120" value="' + esc(x.fyysOma) + '" placeholder="' + esc(t('Oma fyysinen painopiste (enintään 120 merkkiä)')) + '" style="' + kentta + ';display:' + (x.fyys === OMA ? 'block' : 'none') + '">'
      + '<div style="font-size:10.5px;color:var(--ink3);margin:-6px 0 10px">' + esc(t('Valitse ohjelma tai teema, jotta kasvun huomioiva suoja toimii. "Oma" ei tunnista kuormaa.')) + '</div>';
    var otsikko = x.tila === 'muokkaa' ? 'Muokkaa joukkuejaksoa' : 'Aloita joukkuejakso';
    return '<div id="' + esc(id) + '" role="dialog" aria-modal="true" ' + (opts.overlayAttrs || '') + ' onclick="if(event.target===this)' + esc(opts.suljeFn || '') + '()">'
      + '<div style="background:var(--card);color:var(--ink);border:.5px solid var(--border);border-radius:14px;max-width:520px;width:100%;max-height:92vh;overflow:auto;padding:18px 20px;box-sizing:border-box">'
      + '<div style="font-size:16px;font-weight:600;margin-bottom:10px">' + esc(t(otsikko)) + (x.nimi ? ' · ' + esc(x.nimi) : '') + '</div>'
      + lab('Tekninen ja taktinen (pakollinen)') + teknSel + lab('Fyysinen (pakollinen)') + fyysSel
      + lab('Henkinen (valinnainen, yksi lause)') + '<input id="' + IDS.hen + '" maxlength="120" value="' + esc(x.henkinen) + '" style="' + kentta + '">'
      + lab('Sosiaalinen (valinnainen, yksi lause)') + '<input id="' + IDS.sos + '" maxlength="120" value="' + esc(x.sosiaalinen) + '" style="' + kentta + '">'
      + '<div style="display:flex;gap:10px;flex-wrap:wrap"><div style="flex:1;min-width:140px">' + lab('Alkaa') + '<input id="' + IDS.alku + '" type="date" value="' + esc(x.alku) + '" style="' + kentta + '"></div>'
      + '<div style="flex:1;min-width:140px">' + lab('Kesto (viikkoa, ikävaiheen mukaan)') + '<select id="' + IDS.kesto + '" onchange="TM_JOUKKUEJAKSO.tmJjViikotNayta(this)" style="' + kentta + '">' + x.kesto.vaihtoehdot.map(function (v) { return opt(String(v), v + ' ' + t('vk'), v === x.kesto.valittu); }).join('') + '</select></div></div>'
      + _viikotHTML(x, esc, t, lab, kentta)
      + '<div style="font-size:10.5px;color:var(--ink3);margin-bottom:12px">' + esc(t('Katselmusikkuna: 2 viikkoa jakson päättymispäivästä.')) + '</div>'
      + '<div style="display:flex;gap:8px;justify-content:flex-end"><button type="button" onclick="' + esc(opts.suljeFn || '') + '()" style="font-size:12px;border-radius:8px;padding:8px 14px;cursor:pointer;border:.5px solid var(--border);background:transparent;color:var(--ink2)">' + esc(t('Peruuta')) + '</button>'
      + '<button type="button" data-jj-tallenna onclick="' + esc(opts.tallennaFn || '') + '()" style="font-size:12px;font-weight:600;border-radius:8px;padding:8px 14px;cursor:pointer;border:.5px solid var(--teal);background:var(--teal);color:var(--bg)">' + esc(t(x.tila === 'muokkaa' ? 'Tallenna joukkuejakso' : 'Aloita joukkuejakso')) + '</button></div></div></div>';
  }

  function _viikotHTML(x, esc, t, lab, kentta) {
    var max = Math.min(VK_MAX, Math.max.apply(null, x.kesto.vaihtoehdot)), rivit = '';
    for (var n = 1; n <= max; n++) rivit += '<div data-jj-vk="' + n + '" style="display:' + (n <= x.kesto.valittu ? 'block' : 'none') + '"><label style="font-size:10.5px;color:var(--ink3)">' + esc(t('Viikko')) + ' ' + n + (x.viikotVuosikello && x.viikotVuosikello[n] ? ' · ' + esc(t('vuosikellosta')) : '') + '</label><input id="' + VK_ID + n + '" maxlength="' + VK_PITUUS + '" value="' + esc(x.viikot && x.viikot[n] || '') + '" style="' + kentta + ';margin-bottom:6px"></div>';
    return '<details data-jj-viikot style="margin:0 0 12px"' + (x.viikot && Object.keys(x.viikot).length ? ' open' : '') + '><summary style="font-size:12px;color:var(--teal);cursor:pointer">' + esc(t('Viikkotavoitteet (valinnainen)')) + '</summary><div style="margin-top:6px">' + rivit + '</div></details>';
  }
  // DOM-apuri: kesto-valinnan mukaan näytetään vain jakson viikkojen rivit (ei-DOM-ympäristössä no-op)
  function tmJjViikotNayta(sel) {
    if (!sel || typeof sel.closest !== 'function') return;
    var juuri = sel.closest('[role="dialog"]'); if (!juuri) return; var k = Number(sel.value);
    Array.prototype.slice.call(juuri.querySelectorAll('[data-jj-vk]')).forEach(function (e) { e.style.display = Number(e.getAttribute('data-jj-vk')) <= k ? 'block' : 'none'; });
  }
  function tmJoukkuejaksoSyote(arvo) {
    var vk = []; for (var n = 1; n <= VK_MAX; n++) vk.push(arvo(VK_ID + n) || '');
    return { tekn: arvo(IDS.tekn), teknOma: arvo(IDS.teknOma), fyys: arvo(IDS.fyys), fyysOma: arvo(IDS.fyysOma), henkinen: arvo(IDS.hen), sosiaalinen: arvo(IDS.sos), alku: arvo(IDS.alku), kesto: arvo(IDS.kesto), viikot: vk };
  }

  // ── rakennus ──────────────────────────────────────────────────────────────────────────────
  function _trim(v) { return typeof v === 'string' ? v.trim() : ''; }
  function tmJoukkuejaksoRakenna(s, x, opts) {
    s = s || {}; opts = opts || {};
    var TT = _TT(), val = x.valinnat, FY = _FY(), JM = _JM();
    var tekn;
    if (s.tekn === OMA) tekn = { teema_avain: null, nimi: _trim(s.teknOma), lahde: 'oma' };
    else if (s.tekn === NYK && x.nykyinen.tekn) tekn = x.nykyinen.tekn;
    else { var tv = val.tekn.filter(function (v) { return v.arvo === s.tekn; })[0]; if (!tv) throw _virhe('tekninen ja taktinen: valitse teema tai "Oma"'); tekn = { teema_avain: tv.avain, nimi: tv.nimi, lahde: 'seura' }; }
    var fyys;
    if (s.fyys === OMA) fyys = { avain: null, nimi: _trim(s.fyysOma), lahde: 'oma' };
    else if (s.fyys === NYK && x.nykyinen.fyys) fyys = x.nykyinen.fyys;
    else {
      var fv = null; val.fyysRyhmat.forEach(function (g) { g.optiot.forEach(function (o) { if (o.arvo === s.fyys) fv = o; }); });
      if (!fv) throw _virhe('fyysinen: valitse ohjelma tai teema (vapaa teksti vain "Oma")');
      fyys = fv.ohjelma_id ? { avain: fv.avain, nimi: fv.nimi, ohjelma_id: fv.ohjelma_id, lahde: 'seura' } : { avain: fv.avain, nimi: fv.nimi, lahde: 'tm' };
    }
    if (!_oikeaPvm(s.alku)) throw _virhe('alkamispäivä ei ole kelvollinen (YYYY-MM-DD)');
    var kesto = Number(s.kesto), K = JM.tmJaksonKesto(x.ika);
    if (K.vaihtoehdot.indexOf(kesto) < 0) throw _virhe('kesto ' + s.kesto + ' vk ei sovi ikävaiheelle (' + K.vaihtoehdot.join('/') + ' vk)');
    var osa = TT.tmJoukkuejaksoOsaAlueet({ tekninen_taktinen: tekn, fyysinen: fyys, henkinen: _trim(s.henkinen) ? { kuvaus: _trim(s.henkinen) } : null, sosiaalinen: _trim(s.sosiaalinen) ? { kuvaus: _trim(s.sosiaalinen) } : null });
    var viikot = [];   // J4 B: yksi rivi per jakson viikko (1..kesto); tyhjät pois; ≤ 120 merkkiä + KIELLETYT; lähde: vuosikello jos teksti = vuosikellon esitäyttö, muuten valmentaja
    (Array.isArray(s.viikot) ? s.viikot : []).forEach(function (v, i) {
      var n = i + 1, tv = _trim(v); if (!tv || n > kesto) return;
      if (tv.length > VK_PITUUS) throw _virhe('viikon ' + n + ' tavoite on liian pitkä (' + tv.length + ' > ' + VK_PITUUS + ')');
      var kk = JM.tmJaksoTekstiKelpaa(tv); if (!kk.ok) throw _virhe('viikon ' + n + ' tavoite sisältää kielletyn sanan (' + kk.loydetty + ') — kirjoita myönteisenä');
      viikot.push({ vk: n, tavoite: tv, lahde: (x.viikotVuosikello && x.viikotVuosikello[n] === tv) ? 'vuosikello' : 'valmentaja' });
    });
    var paattyy = _lisaaPv(s.alku, kesto * 7);
    var nimi = osa.tekninen_taktinen.nimi;
    var jf = { konsepti_avain: osa.tekninen_taktinen.teema_avain || ('oma:' + _slug(nimi)), konsepti_nimi: nimi, domeeni: 'teknis_taktinen', laji: 'joukkue', lahde: 'joukkuejakso', osa_alueet: osa,
      alku: s.alku, kesto_vk: kesto, viikot: viikot, katselmus_alku: paattyy, katselmus_loppu: _lisaaPv(paattyy, KATSELMUS_PV) };   // D21: yhteinen katselmusikkuna 2 vk jakson päättymispäivästä
    if (opts.rooli && opts.tanaan && _oikeaPvm(opts.tanaan)) jf.asetti = { rooli: opts.rooli, pvm: opts.tanaan };   // kuka asetti ja milloin (paikallinen päivä)
    var chk = JM.tmTarkistaJaksoData(jf); if (chk.length) throw _virhe('kielletty sana/kenttänimi: ' + chk.join(', '));
    return jf;
  }

  function tmJoukkuejaksoKirjoitus(jDoc, jf, deps) {
    deps = deps || {};
    var v = _KS().tmAsetaJaksofokus(jDoc || {}, jf, { nytISO: deps.nytISO || new Date().toISOString(), tulos: 'vaihdettu' });
    var upd = { jaksofokus: v.jaksofokus };
    if (v.historiaLisays.length) { if (typeof deps.arrayUnion !== 'function') throw _virhe('arrayUnion puuttuu'); upd.jaksofokus_historia = deps.arrayUnion.apply(null, v.historiaLisays); }
    return { update: upd, sama: v.sama === true, paikallinen: { jaksofokus: v.jaksofokus, historiaLisays: v.historiaLisays } };
  }

  // ── kortti ────────────────────────────────────────────────────────────────────────────────
  function tmJoukkuejaksoKortti(jDoc, ctx) {
    ctx = ctx || {}; var jf = jDoc && jDoc.jaksofokus, oa = jf && jf.osa_alueet;
    if (!oa || !oa.tekninen_taktinen) return { onJakso: false };
    var TT = _TT(), tanaan = ctx.tanaan, kesto = Number(jf.kesto_vk) > 0 ? Number(jf.kesto_vk) : null, alku = (jf.alku && _oikeaPvm(jf.alku)) ? jf.alku : null, paattyy = (alku && kesto) ? _lisaaPv(alku, kesto * 7) : null;
    var fyo = TT.tmFyysinenOsaAlue(oa), viikko = null, alkaaVasta = false;
    if (alku && kesto && tanaan) {
      if (_paivaNum(tanaan) < _paivaNum(alku)) alkaaVasta = true;
      else { var n = Math.floor((_paivaNum(tanaan) - _paivaNum(alku)) / 7) + 1; viikko = { n: Math.min(n, kesto), k: kesto }; }
    }
    var vkRivi = viikko && Array.isArray(jf.viikot) ? jf.viikot.filter(function (v) { return v && Number(v.vk) === viikko.n && typeof v.tavoite === 'string'; })[0] : null;
    return { onJakso: true, viikkotavoite: vkRivi ? vkRivi.tavoite : null, tekn: oa.tekninen_taktinen.nimi, fyys: fyo ? fyo.nimi : null, henkinen: oa.henkinen ? oa.henkinen.kuvaus : null, sosiaalinen: oa.sosiaalinen ? oa.sosiaalinen.kuvaus : null,
      alku: alku, kesto_vk: kesto, paattyy: paattyy, viikko: viikko, alkaaVasta: alkaaVasta, umpeutunut: !!(paattyy && tanaan && _paivaNum(tanaan) >= _paivaNum(paattyy)),
      katselmus_alku: jf.katselmus_alku || paattyy, katselmus_loppu: jf.katselmus_loppu || (paattyy ? _lisaaPv(paattyy, KATSELMUS_PV) : null) };
  }

  function tmJoukkuejaksoKorttiHTML(k, opts) {
    opts = opts || {}; var esc = opts.esc || _esc, t = _t(opts);
    var nappi = function (teksti, ensisijainen) { return opts.avaaFn ? '<button type="button" data-jj-avaa onclick="event.stopPropagation();' + esc(opts.avaaFn) + '()" style="font-size:11.5px;font-weight:600;border-radius:7px;padding:6px 11px;cursor:pointer;border:.5px solid var(--teal);'
      + (ensisijainen ? 'background:var(--teal);color:var(--bg)' : 'background:transparent;color:var(--teal)') + '">' + esc(t(teksti)) + '</button>' : ''; };
    var otsikko = '<div style="font-size:11px;letter-spacing:.08em;text-transform:uppercase;color:var(--ink3)">' + esc(t('Joukkueen jakso')) + (opts.nimi ? ' · ' + esc(opts.nimi) : '') + '</div>';
    var kehys = function (sisalto) { return '<div class="tm-joukkuejakso" data-jakso="' + (k.onJakso ? '1' : '0') + '" style="background:var(--card);border:.5px solid var(--border);border-radius:12px;padding:14px 16px;margin-bottom:24px">' + sisalto + '</div>'; };
    if (!k.onJakso) return kehys(otsikko + '<div style="font-size:13px;color:var(--ink3);font-style:italic;margin:6px 0 10px">' + esc(t('Joukkueella ei ole jaksoa')) + '</div>' + (opts.voiMuokata === false ? '<div style="font-size:12px;color:var(--ink3)">' + esc(t('Pyydä VP:tä luomaan joukkue')) + '</div>' : nappi('Aloita joukkuejakso', true)));
    var rivi = function (n, a) { return a ? '<div style="display:flex;gap:8px;font-size:12.5px;margin-top:5px"><span style="flex:0 0 118px;color:var(--ink3)">' + esc(t(n)) + '</span><span style="color:var(--ink2);min-width:0;overflow-wrap:anywhere">' + esc(a) + '</span></div>' : ''; };
    var tila = k.alkaaVasta ? esc(t('Alkaa')) + ' ' + esc(_lyhyt(k.alku)) : (k.umpeutunut ? esc(t('Päättynyt')) + ' ' + esc(_lyhyt(k.paattyy)) : (k.viikko ? esc(t('Viikko')) + ' ' + k.viikko.n + '/' + k.viikko.k : ''));
    return kehys('<div style="display:flex;justify-content:space-between;align-items:baseline;gap:10px;flex-wrap:wrap">' + otsikko + '<div style="font-size:11.5px;color:var(--ink3)">' + tila + '</div></div>'
      + rivi('Tekninen ja taktinen', k.tekn) + rivi('Fyysinen', k.fyys) + rivi('Henkinen', k.henkinen) + rivi('Sosiaalinen', k.sosiaalinen)
      + rivi('Kesto', k.kesto_vk ? k.kesto_vk + ' ' + t('vk') + (k.paattyy ? ' · ' + t('päättyy') + ' ' + _lyhyt(k.paattyy) : '') : '')
      + (k.viikkotavoite ? rivi('Viikon tavoite', k.viikkotavoite) : '')
      + rivi('Katselmusikkuna', k.katselmus_alku && k.katselmus_loppu ? _lyhyt(k.katselmus_alku) + '–' + _lyhyt(k.katselmus_loppu) : '')
      + (opts.voiMuokata === false ? '' : '<div style="margin-top:10px">' + nappi('Muokkaa joukkuejaksoa', true) + '</div>'));
  }

  // ── K1 / A: snapshot pelaajan jaksoon ──────────────────────────────────────────────────────
  function tmJoukkuejaksoSnapshot(jDoc, jid) {
    var jf = jDoc && jDoc.jaksofokus; if (!jid || !jf || typeof jf !== 'object') return null;
    var oa = jf.osa_alueet, nimi = oa && oa.tekninen_taktinen && typeof oa.tekninen_taktinen.nimi === 'string' ? oa.tekninen_taktinen.nimi.trim() : '';
    var kesto = Number(jf.kesto_vk); if (!nimi || !(kesto > 0) || !_oikeaPvm(jf.alku)) return null;
    var viikot = (Array.isArray(jf.viikot) ? jf.viikot : []).filter(function (v) { return v && Number.isInteger(Number(v.vk)) && Number(v.vk) >= 1 && Number(v.vk) <= kesto && typeof v.tavoite === 'string' && v.tavoite.trim(); })
      .map(function (v) { return { vk: Number(v.vk), tavoite: v.tavoite.trim() }; }).sort(function (a, b) { return a.vk - b.vk; });
    return { jid: String(jid), alku: jf.alku, kesto_vk: kesto, nimi: nimi, viikot: viikot };
  }
  /* vanha = { alku, kesto_vk, sama } tallennusta EDELTÄVÄLTÄ joukkueen jaksolta; uusiDoc = tallennettu joukkuedokumentti. Uusi joukkuejakso (eri identiteetti TAI alkaa vasta vanhan päätyttyä) EI koske vanhan jakson snapshotteja. */
  function tmJoukkuejaksoSynkka(vanha, uusiDoc, jid, pelaajat, opts) {
    vanha = vanha || {}; var tyhja = { paivitykset: [], ohitettu: null };
    if (!_oikeaPvm(vanha.alku)) return Object.assign(tyhja, { ohitettu: 'ei_vanhaa_jaksoa' });
    if (vanha.sama !== true) return Object.assign(tyhja, { ohitettu: 'uusi_jakso' });
    var uusi = tmJoukkuejaksoSnapshot(uusiDoc, jid); if (!uusi) return Object.assign(tyhja, { ohitettu: 'ei_snapshotia' });
    var vKesto = Number(vanha.kesto_vk) > 0 ? Number(vanha.kesto_vk) : null;
    if (vKesto && _paivaNum(uusi.alku) >= _paivaNum(_lisaaPv(vanha.alku, vKesto * 7))) return Object.assign(tyhja, { ohitettu: 'uusi_jakso' });   // sama taito, mutta alkaa vasta edellisen päätyttyä
    var paivitykset = [];
    (Array.isArray(pelaajat) ? pelaajat : []).forEach(function (p) {
      var v = p && p.jaksofokus && p.jaksofokus.joukkuejakso_viite; if (!p || !p.id || !v || v.jid !== String(jid) || v.alku !== vanha.alku) return;
      paivitykset.push({ id: p.id, update: { 'jaksofokus.joukkuejakso_viite': Object.assign({}, uusi, { viikot: uusi.viikot.map(function (x) { return { vk: x.vk, tavoite: x.tavoite }; }) }) } });
    });
    return { paivitykset: paivitykset, ohitettu: null };
  }
  function tmJoukkuejaksoSynkkaIlmoitusHTML(n, opts) {
    opts = opts || {}; n = Number(n) || 0; if (n <= 0) return ''; var esc = opts.esc || _esc, t = _t(opts);
    var teksti = (n === 1 ? t('1 pelaajan viikkotavoite ei päivittynyt, yritä uudelleen') : t('{n} pelaajan viikkotavoite ei päivittynyt, yritä uudelleen').replace('{n}', String(n)));
    return '<div class="tm-jj-synkka" role="alert" style="display:flex;align-items:center;gap:10px;flex-wrap:wrap;background:var(--card);border:.5px solid var(--amber);border-radius:12px;padding:10px 14px;margin-bottom:12px"><span style="font-size:12.5px;color:var(--ink)">' + esc(teksti) + '</span>'
      + (opts.uudelleenFn ? '<button type="button" data-jj-synkka-uudelleen onclick="' + esc(opts.uudelleenFn) + '()" style="font-size:11.5px;font-weight:600;border-radius:8px;padding:6px 12px;cursor:pointer;border:.5px solid var(--teal);background:transparent;color:var(--teal)">' + esc(t('Yritä uudelleen')) + '</button>' : '') + '</div>';
  }
  function tmJoukkuejaksoViikko(viite, tanaan) {
    if (!viite || typeof viite !== 'object' || !viite.jid || !_oikeaPvm(viite.alku) || !(Number(viite.kesto_vk) > 0) || typeof viite.nimi !== 'string' || !viite.nimi.trim()) return null;   // vanha {jid, alku} -viite ilman snapshotia → ei riviä
    var k = tmJoukkuejaksoKortti({ jaksofokus: { osa_alueet: { tekninen_taktinen: { nimi: viite.nimi } }, alku: viite.alku, kesto_vk: viite.kesto_vk, viikot: viite.viikot } }, { tanaan: tanaan });
    if (!k.onJakso || k.umpeutunut || k.alkaaVasta || !k.viikko) return null;
    return { nimi: viite.nimi, viikkotavoite: k.viikkotavoite || null, viikko: k.viikko };
  }

  var API = { tmJoukkuejaksoSnapshot: tmJoukkuejaksoSnapshot, tmJoukkuejaksoSynkka: tmJoukkuejaksoSynkka, tmJoukkuejaksoSynkkaIlmoitusHTML: tmJoukkuejaksoSynkkaIlmoitusHTML, tmJoukkuejaksoViikko: tmJoukkuejaksoViikko, IDS: IDS, OMA: OMA, NYKYINEN: NYK, tmJoukkueenIka: tmJoukkueenIka, tmJoukkuejaksoValinnat: tmJoukkuejaksoValinnat, tmJoukkuejaksoTiedot: tmJoukkuejaksoTiedot, tmJoukkuejaksoModalHTML: tmJoukkuejaksoModalHTML,
    tmJoukkuejaksoSyote: tmJoukkuejaksoSyote, tmJoukkuejaksoRakenna: tmJoukkuejaksoRakenna, tmJoukkuejaksoKirjoitus: tmJoukkuejaksoKirjoitus, tmJoukkuejaksoKortti: tmJoukkuejaksoKortti, tmJoukkuejaksoKorttiHTML: tmJoukkuejaksoKorttiHTML, tmJjViikotNayta: tmJjViikotNayta, VK_MAX: VK_MAX, VK_PITUUS: VK_PITUUS };
  if (typeof module !== 'undefined' && module.exports) module.exports = API; else root.TM_JOUKKUEJAKSO = API;
})(typeof window !== 'undefined' ? window : this);
