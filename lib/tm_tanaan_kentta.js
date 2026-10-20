/* ════════════════════════════════════════════════════════════════════════
   tm_tanaan_kentta.js — K1 osa 2b (docs/CODE_BRIEF_K1_TAMAN_TUEKSI.md §1; design 10 K1, 09 näkymä 1): Pelaaja_v7 Tänään-sivun KENTTÄ-näkymä `rA1Kentta()` (PURE; ei Firebasea, ei DOM:ia).
   Neljä tilaa:  'jakso' (jakso käynnissä) · 'sunnuntai' (jakso käynnissä + sunnuntai; sisältö K4:ssä → tässä vain koukku #k1-sunnuntai) · 'vahvuus' (ei jaksoa, ydinvahvuus näkyy) · 'tyhja' (ei vahvuutta eikä jaksoa; "siihen asti: pelaa").
   · tmTanaanTila(p, ctx{tanaan})            → { tila, nimi, vahvuus, viikko:{n,k}|null, kesto_vk }   umpeutunut / 'valittavana' -jakso = ei jaksoa (K3/K4 hoitavat siirtymän)
   · tmTanaanOsat(jf, ctx{kaanon, max=3})      → [{k:'a'|'b'|'c'…, koodi (kanonin kpi-koodi | null), teksti}] 0–max (oletus 3 = pelaajasovellus; henkilökunta antaa ctx.max, kaikki osat, a–z). Lähde: jaksofokus.osat → muuten konsepti_avain → kanonin kpi-tekstit (ctx.kaanon(avain).kpi, D15 A) → muuten [] (osarivi piiloon). Ei arvata.
   · tmTanaanKenttaHTML(x, opts)              → otsikko (Viikko N / Oma kenttä) + kenttä (tmKentta, koko:'puoli', ilmanAluetta — pelkkä kenttä: ei asetta, reittiä, oletusaluetta eikä aluetekstiä; alue tulee K3:ssa) + osat sanoin. opts: { esc, t, kentta(spec)→html }
   · tmKenttaPelaajalle(p, ctx{tanaan})       → spec | null (C, 18.10.2026): pelaajan kenttäpiirros YHDESTÄ adapterista (tm_kentta_spec.js, rooli 'pelaaja', D98): valmentajan asettama ydinvahvuus.alue → ase. Ei aluetta → null (= EI kenttäpiirrosta lainkaan, ei tyhjää kenttää). Reitti, viikkomerkit, osat ja historia pois (R1/joulukuu; osien tila olisi arviointitaso §7.22)
   · tmPaivanTreeniHTML(h, opts)              → päivän treeni -kortti (nimi, kesto, "jaksosta"-merkintä jos h.jaksosta, kirjaa-nappi opts.kirjausFn)
   · tmKuittausHTML(opts)                     → fiilis + kuormitus kuittauksena (piilossa kunnes treeni kirjattu; näytetään adapterista); ids fiiRow/kuormitusRow = olemassa olevat tmFiilinki/tmKuormitus
   §7.22: ei lukuja X/5, ei tasoja/vertailua; "vahvuus" pelaajalle (ei "ydinvahvuus"); viikkomerkit = kestoa, eivät suoritusta (tässä ei piirretä reittiä lainkaan). Vain tokenit (ei hex); arvot escapataan; teksti opts.t:n läpi, fi-oletus tässä.
   Dual-export: module.exports || window.TM_TANAAN_KENTTA.
════════════════════════════════════════════════════════════════════════ */
(function (root) {
  'use strict';
  var FI = {
    k1_viikko: 'Viikko', k1_talla_viikolla: 'tällä viikolla', k1_taman_viikon_fokus: 'Tämän viikon fokus', k1_talla_harjoittelet: 'Tällä viikolla harjoittelet: {nimi}', k1_viikkoa: 'viikkoa', k1_oma_kentta: 'Oma kenttä', k1_valmentaja_valmistelee: 'Valmentaja valmistelee jaksoa', k1_vahvuutesi: 'Vahvuutesi',
    k1_vield_tyhja: 'Vielä tyhjä, ja se on ok', k1_tyhja_ohje: 'Valmentaja katsoo pelejäsi ja merkitsee kentälle, missä olet vaarallinen. Siihen asti: pelaa.', k1_kentta_aria: 'Kenttä',
    k1_paivan_treeni: 'Päivän treeni', k1_jaksosta: 'jaksosta', k1_kirjaa_tehdyksi: 'Kirjaa tehdyksi', k1_miltä_tuntui: 'Miltä treeni tuntui?', k1_kuinka_raskas: 'Kuinka raskas treeni oli?',
    k1_kevyt: 'Kevyt', k1_sopiva: 'Sopiva', k1_raskas: 'Raskas'
  };
  var DAY = 86400000;
  function _esc(s) { return String(s == null ? '' : s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;'); }
  function _txt(o, k) { var v = (o && typeof o.t === 'function') ? o.t(k) : k; return (v && v !== k) ? v : FI[k]; }
  function _req(g, f) { try { return (typeof module !== 'undefined' && module.exports && typeof require === 'function') ? require(f) : (root && root[g]); } catch (e) { return root && root[g]; } }
  function _JM() { return _req('TM_KIELLETYT', './tm_kielletyt.js'); }   // ei tm_jakso_malli.js:ää pelaajan appiin
  function _isoPaiva(d) { return d.getFullYear() + '-' + String(d.getMonth() + 1).padStart(2, '0') + '-' + String(d.getDate()).padStart(2, '0'); }
  function _paivaNum(iso) { var m = /^(\d{4})-(\d{2})-(\d{2})/.exec(String(iso || '')); return m ? Date.UTC(+m[1], +m[2] - 1, +m[3]) / DAY : null; }
  function _alkuIso(jf) {   // jakson alkupäivä PAIKALLISENA päivänä (alkoi = paikallinen keskiyö ISO:na → Date-komponentit, ei UTC-viipale)
    if (jf && typeof jf.alku === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(jf.alku)) return jf.alku;
    var d = jf && jf.alkoi ? new Date(jf.alkoi) : null; return d && !isNaN(d.getTime()) ? _isoPaiva(d) : null;
  }
  function _puhdas(s) {
    if (typeof s !== 'string' || !s.trim()) return null;
    if (/fy_|\b(SBL|SFL|LL|DIAG|DFL)\b|\bOVR\b|\bFLEI\b/.test(s)) return null;
    var JM = _JM(); if (JM && JM.tmJaksoTekstiKelpaa && !JM.tmJaksoTekstiKelpaa(s).ok) return null;
    return s.trim();
  }

  function tmTanaanTila(p, ctx) {
    ctx = ctx || {}; p = p || {}; var jf = p.jaksofokus, tanaan = ctx.tanaan;
    var vahvuus = (p.ydinvahvuus && typeof p.ydinvahvuus.kuvaus === 'string' && p.ydinvahvuus.kuvaus.trim()) || (p.ydinvahvuus_valinta && typeof p.ydinvahvuus_valinta.vaihtoehto === 'string' && p.ydinvahvuus_valinta.vaihtoehto.trim()) || '';
    var onJakso = !!(jf && typeof jf === 'object' && (jf.konsepti_avain || jf.konsepti_nimi) && jf.tila !== 'valittavana');
    var kesto = onJakso && Number(jf.kesto_vk) > 0 ? Number(jf.kesto_vk) : null, alku = onJakso ? _alkuIso(jf) : null, viikko = null;
    if (onJakso && alku && kesto && tanaan) {
      var ero = _paivaNum(tanaan) - _paivaNum(alku);
      if (ero >= kesto * 7) onJakso = false;                                           // umpeutunut → ei jaksoa (K4 hoitaa "Hyvä jakso")
      else viikko = { n: Math.min(Math.max(Math.floor(ero / 7) + 1, 1), kesto), k: kesto };   // ennen alkua → viikko 1
    }
    var nimi = onJakso && typeof jf.konsepti_nimi === 'string' && jf.konsepti_nimi.trim() ? jf.konsepti_nimi.trim() : null,   // tekninen konsepti_avain ei koskaan pelaajalle
         sunnuntai = onJakso && tanaan && new Date(_paivaNum(tanaan) * DAY).getUTCDay() === 0;
    return { tila: onJakso ? (sunnuntai ? 'sunnuntai' : 'jakso') : (vahvuus ? 'vahvuus' : 'tyhja'), nimi: nimi, vahvuus: vahvuus || null, viikko: viikko, kesto_vk: kesto };
  }

  function tmTanaanOsat(jf, ctx) {
    ctx = ctx || {}; if (!jf || typeof jf !== 'object') return [];
    var max = Number(ctx.max) > 0 ? Math.min(Number(ctx.max), 26) : 3;   // kolmen raja vain pelaajasovelluksessa; henkilökunta näkee kaikki osat
    var raaka = [];
    if (Array.isArray(jf.osat) && jf.osat.length) raaka = jf.osat.map(function (o) { return { teksti: typeof o === 'string' ? o : (o && (o.teksti || o.kuvaus || o.nimi)), koodi: null }; });
    else if (jf.konsepti_avain && typeof ctx.kaanon === 'function') { var k; try { k = ctx.kaanon(jf.konsepti_avain); } catch (e) { k = null; } raaka = (k && Array.isArray(k.kpi) ? k.kpi : []).map(function (o) { return { teksti: o && o.teksti, koodi: o && o.koodi ? String(o.koodi) : null }; }); }
    var ulos = [];
    raaka.forEach(function (r) { var s = _puhdas(r.teksti); if (s && ulos.length < max) ulos.push({ k: 'abcdefghijklmnopqrstuvwxyz'.charAt(ulos.length), koodi: r.koodi, teksti: s }); });
    return ulos;
  }

  function tmTanaanKenttaHTML(x, opts) {
    opts = opts || {}; var esc = opts.esc || _esc, tila = x && x.tila, jakso = tila === 'jakso' || tila === 'sunnuntai';
    var otsikko = jakso ? (_txt(opts, 'k1_viikko') + ' ' + (x.viikko ? x.viikko.n : 1)) : _txt(opts, 'k1_oma_kentta');
    var ala = jakso ? [x.nimi, x.kesto_vk ? x.kesto_vk + ' ' + _txt(opts, 'k1_viikkoa') : null, x.vahvuus ? _txt(opts, 'k1_vahvuutesi').toLowerCase() + ': ' + x.vahvuus : null].filter(Boolean).join(' · ')
      : (tila === 'vahvuus' ? _txt(opts, 'k1_valmentaja_valmistelee') : _txt(opts, 'k1_vield_tyhja'));
    var kentta = typeof opts.kentta === 'function' && !opts.ilmanKenttaa ? opts.kentta(opts.kenttaSpec || { koko: 'puoli', ilmanAluetta: true, ase: null, reitti: null, viikot: null, osat: [], historia: [], lempipaikka: null, vaihtoehdot: null }) : '';   // oletus: EI asetta eikä reittiä · C: opts.kenttaSpec = tmKenttaPelaajalle (alue piirtyy) · opts.ilmanKenttaa = ei aluetta → ei kenttää lainkaan
    var vo = jakso && x.osat && x.viikonOsa ? x.osat.filter(function (o) { return o.k === x.viikonOsa; })[0] : null;   // K1c: viikon fokus näkyväksi (ei lukuja, §7.22)
    var fokusRivi = vo ? '<div class="k1-fokus-rivi" data-k1-fokus-rivi style="font-size:14px;color:var(--text);line-height:1.4;margin:0 0 10px">' + esc(_txt(opts, 'k1_talla_harjoittelet').replace('{nimi}', vo.teksti)) + '</div>' : '';
    var osat = jakso && x.osat && x.osat.length ? '<div class="k1-osat" style="margin-top:12px">' + x.osat.map(function (o) {
      var fokus = !!(x.viikonOsa && x.viikonOsa === o.k);
      return '<div class="k1-osa' + (fokus ? ' k1-fokus' : '') + '"' + (fokus ? ' data-k1-fokus' : '') + ' style="display:flex;gap:10px;align-items:baseline;padding:6px 8px;border-top:.5px solid var(--border);border-left:3px solid ' + (fokus ? 'var(--teal)' : 'transparent') + (fokus ? ';background:color-mix(in srgb,var(--teal) 14%,transparent);border-radius:6px' : '') + '"><span style="font-family:var(--font-k);font-size:12px;font-weight:600;color:var(--teal-d);flex:0 0 14px;text-transform:uppercase">' + esc(o.k) + '</span><span style="font-size:14px;color:var(--text);line-height:1.4">' + esc(o.teksti) + '</span>' + (fokus ? '<span class="k1-viikon-osa" data-k1-viikon-osa style="margin-left:auto;font-size:12px;font-weight:600;background:var(--teal);color:var(--on-accent,var(--text));padding:2px 9px;border-radius:999px;white-space:nowrap">' + esc(_txt(opts, 'k1_taman_viikon_fokus')) + '</span>' : '') + '</div>'; }).join('') + '</div>' : '';
    var tyhja = tila === 'tyhja' ? '<div class="k1-tyhja" style="font-size:13px;color:var(--ink2);line-height:1.5;margin-top:10px">' + esc(_txt(opts, 'k1_tyhja_ohje')) + '</div>' : '';
    var vahv = tila === 'vahvuus' && x.vahvuus ? '<div class="k1-vahvuus" style="font-size:13px;color:var(--ink2);margin-top:8px">' + esc(_txt(opts, 'k1_vahvuutesi')) + ': <b style="font-family:var(--font-k)">' + esc(x.vahvuus) + '</b></div>' : '';
    return '<section class="k1-kentta" data-k1-tila="' + esc(tila) + '" style="padding:22px 20px 6px">'
      + fokusRivi
      + '<div style="font-family:var(--font-k);font-size:28px;font-weight:700;line-height:1.1;color:var(--text)">' + esc(otsikko) + '</div>'
      + '<div style="font-size:13px;color:var(--ink2);line-height:1.4;margin:4px 0 12px">' + esc(ala) + '</div>'
      + kentta + vahv + osat + tyhja + (tila === 'sunnuntai' ? '<div id="k1-sunnuntai" data-k4="1" style="display:none"></div>' : '') + '</section>';
  }

  function tmKenttaPelaajalle(p, ctx) {
    var S = _req('TM_KENTTA_SPEC', './tm_kentta_spec.js'); if (!S || typeof S.tmKenttaSpec !== 'function') return null;
    var spec = S.tmKenttaSpec(p, { rooli: 'pelaaja', tanaan: ctx && ctx.tanaan });
    if (!spec || !spec.ase || !spec.ase.alue) return null;   // ei (kelvollista) aluetta → ei kenttää
    return { koko: spec.koko === 'koko' ? 'koko' : 'puoli', ase: { alue: spec.ase.alue, nimi: spec.ase.nimi || '', tila: 'ok' }, reitti: null, viikot: null, osat: [], historia: [], lempipaikka: null, vaihtoehdot: null };
  }

  function tmPaivanTreeniHTML(h, opts) {
    if (!h || !h.nimi) return ''; opts = opts || {}; var esc = opts.esc || _esc;
    var meta = [h.kesto ? String(h.kesto) : null, h.jaksosta ? _txt(opts, 'k1_jaksosta') : null].filter(Boolean).join(' · ');
    return '<div class="k1-treeni" style="margin:12px 20px;padding:16px;background:var(--card);border:.5px solid var(--border);border-radius:12px">'
      + '<div style="font-family:var(--font-k);font-size:11px;font-weight:600;letter-spacing:.14em;text-transform:uppercase;color:var(--teal-d)">' + esc(_txt(opts, 'k1_paivan_treeni')) + (meta ? ' · ' + esc(meta) : '') + '</div>'
      + '<div style="font-family:var(--font-k);font-size:17px;font-weight:600;color:var(--text);line-height:1.3;margin-top:6px">' + esc(h.nimi) + '</div>'
      + (h.ohje ? '<div style="font-size:13px;color:var(--ink2);line-height:1.5;margin-top:6px">' + esc(h.ohje) + '</div>' : '')
      + (opts.kirjausFn ? '<button id="dKirjausBtn" type="button" onclick="' + esc(opts.kirjausFn) + '(\'D\')" class="btn-p" style="width:100%;margin-top:12px">✓ ' + esc(_txt(opts, 'k1_kirjaa_tehdyksi')) + '</button>' : '') + '</div>';
  }

  function tmKuittausHTML(opts) {
    opts = opts || {}; var esc = opts.esc || _esc, leikkija = opts.leikkija === true;
    var fiilis = leikkija ? [['😞', 1], ['😐', 3], ['🙂', 5]] : [['😞', 1], ['😕', 2], ['🙂', 4], ['🤩', 5]], kuorma = [['k1_kevyt', 2], ['k1_sopiva', 5], ['k1_raskas', 8]];
    var nappi = function (fn, arvo, ylä, ala) { return '<button type="button" onclick="' + fn + '(' + arvo + ',this)" style="flex:1;background:none;border:none;display:flex;flex-direction:column;align-items:center;gap:4px;padding:8px 2px;border-radius:6px;cursor:pointer"><span style="font-size:22px;line-height:1">' + ylä + '</span>' + (ala ? '<span style="font-size:10px;color:var(--ink3)">' + esc(ala) + '</span>' : '') + '</button>'; };
    return '<div id="k1Kuittaus" class="k1-kuittaus" style="display:none;margin:12px 20px;padding:14px 16px;background:var(--card);border:.5px solid var(--border);border-radius:12px">'
      + '<div style="font-size:11px;font-weight:600;letter-spacing:.14em;text-transform:uppercase;color:var(--ink3);margin-bottom:8px">' + esc(_txt(opts, 'k1_miltä_tuntui')) + '</div>'
      + '<div id="fiiRow" style="display:flex;justify-content:space-between">' + fiilis.map(function (f) { return nappi('tmFiilinki', f[1], f[0], null); }).join('') + '</div>'
      + '<div style="font-size:11px;font-weight:600;letter-spacing:.14em;text-transform:uppercase;color:var(--ink3);margin:12px 0 8px">' + esc(_txt(opts, 'k1_kuinka_raskas')) + '</div>'
      + '<div id="kuormitusRow" style="display:flex;justify-content:space-between">' + kuorma.map(function (k) { return nappi('tmKuormitus', k[1], '', _txt(opts, k[0])); }).join('') + '</div></div>';
  }

  var API = { FI: FI, tmTanaanTila: tmTanaanTila, tmTanaanOsat: tmTanaanOsat, tmTanaanKenttaHTML: tmTanaanKenttaHTML, tmKenttaPelaajalle: tmKenttaPelaajalle, tmPaivanTreeniHTML: tmPaivanTreeniHTML, tmKuittausHTML: tmKuittausHTML };
  if (typeof module !== 'undefined' && module.exports) module.exports = API; else root.TM_TANAAN_KENTTA = API;
})(typeof window !== 'undefined' ? window : this);
