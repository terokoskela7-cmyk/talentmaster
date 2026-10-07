/* ════════════════════════════════════════════════════════════════════════
   tm_hash_reititin.js — V4a: hash-reititin Kehitystyöpöydälle (docs/CODE_BRIEF_V4_KEHITYSTYOPOYTA.md §3 (c), D46). Master_v16 ja VP_v25 käyttävät samaa hashia samalla komponentilla (D38).
   URL: #pelaaja/{pid}/tanaan|polku|naytto. Back palaa listaan (hashchange), suora URL avautuu oikeustarkistuksen jälkeen (adapteri).
   · tmHashParse(hash)            → { nakyma:'pelaaja', pid, valilehti } | null     (tuntematon / vioittunut hash → null; pid vain [A-Za-z0-9_-], ≤ 128; valilehti oletus 'tanaan')
   · tmHashRakenna(pid, valilehti) → '#pelaaja/{pid}/{valilehti}' | null            (virheellinen pid → null)
   · tmPelaajaOikeus(p, ctx)      → { ok, syy:'ei_oikeutta'|'ei_pelaajaa'|null }     ctx: { rooli, sa, seuraId, omaJoukkueet:[nimi|id] | null (= ei rajausta) }. Sama sääntö kuin Rules: oma joukkue / talenttivalmentaja / VP ja johto oma seura / SA.
   · tmHashReititin(opts)         → { liita(), irrota(), avaa(pid, valilehti, korvaa?), sulje(), nykyinen() }
        opts: { win (window), lippu: () => boolean, onReitti(reitti), onTyhja() }
        LIPPU POIS → liita() EI lisää hashchange-kuuntelijaa, EI lue alkuhashia eikä kutsu tmHashParse:a; avaa()/sulje() eivät koske location.hash:iin → vanha käytös ennallaan.
   PURE (ei DOMia: win injektoidaan). Dual-export: module.exports || window.TM_HASH_REITITIN.
════════════════════════════════════════════════════════════════════════ */
(function (root) {
  'use strict';
  var VALILEHDET = ['tanaan', 'polku', 'naytto'], PID_RE = /^[A-Za-z0-9_-]{1,128}$/;
  var JOHTO = { vp: 1, urheilutoimenjohtaja: 1, seurasihteeri: 1 };

  function tmHashParse(hash) {
    var m = /^#?pelaaja\/([^\/?#]+)(?:\/([^\/?#]*))?\/?$/.exec(String(hash == null ? '' : hash));
    if (!m) return null;
    var pid; try { pid = decodeURIComponent(m[1]); } catch (e) { return null; }
    if (!PID_RE.test(pid)) return null;
    var v = m[2] === undefined || m[2] === '' ? 'tanaan' : m[2];
    if (VALILEHDET.indexOf(v) < 0) return null;
    return { nakyma: 'pelaaja', pid: pid, valilehti: v };
  }
  function tmHashRakenna(pid, valilehti) {
    if (!PID_RE.test(String(pid == null ? '' : pid))) return null;
    var v = valilehti || 'tanaan'; if (VALILEHDET.indexOf(v) < 0) return null;
    return '#pelaaja/' + pid + '/' + v;
  }
  function _joukkueOsuu(p, lista) {
    var l = Array.isArray(lista) ? lista.map(function (x) { return String(x == null ? '' : x).trim().toLowerCase(); }).filter(Boolean) : [];
    if (!l.length || !p) return false;
    var nimet = [p.joukkue].concat(Array.isArray(p.joukkueet) ? p.joukkueet : []).map(function (x) { return String(x == null ? '' : x).trim().toLowerCase(); });
    return nimet.some(function (n) { return n && l.indexOf(n) >= 0; });
  }
  function tmPelaajaOikeus(p, ctx) {
    ctx = ctx || {};
    if (!p) return { ok: false, syy: 'ei_pelaajaa' };
    if (ctx.sa === true) return { ok: true, syy: null };
    if (p.seuraId && ctx.seuraId && p.seuraId !== ctx.seuraId) return { ok: false, syy: 'ei_oikeutta' };   // toisen seuran pelaaja
    if (JOHTO[ctx.rooli] || ctx.rooli === 'talenttivalmentaja') return { ok: true, syy: null };   // VP + johto oma seura; talenttivalmentaja koko seura (Rules v3.37)
    if (ctx.rooli === 'valmentaja' && (ctx.omaJoukkueet == null || _joukkueOsuu(p, ctx.omaJoukkueet))) return { ok: true, syy: null };   // omaJoukkueet null = ei joukkuerajausta (kuten Masterin !_joukkue)
    return { ok: false, syy: 'ei_oikeutta' };
  }
  function tmHashReititin(opts) {
    opts = opts || {}; var win = opts.win, liitetty = false, kuuntelija = null;
    function _lippu() { try { return typeof opts.lippu === 'function' && opts.lippu() === true; } catch (e) { return false; } }
    var nav = 0;   // montako historiamerkintää tämä reititin on työntänyt (Back palaa listaan yhdellä askeleella: näkymän sisäiset siirtymät KORVAAVAT merkinnän)
    function _lue() { var r = tmHashParse(win && win.location && win.location.hash); if (r) { if (typeof opts.onReitti === 'function') opts.onReitti(r); } else { nav = 0; if (typeof opts.onTyhja === 'function') opts.onTyhja(); } }
    function liita() {
      if (liitetty || !win || !_lippu()) return false;   // lippu pois → ei kuuntelijaa, ei hashin lukua
      kuuntelija = function () { if (_lippu()) _lue(); };
      win.addEventListener('hashchange', kuuntelija); liitetty = true;
      if (tmHashParse(win.location && win.location.hash)) _lue();   // suora URL
      return true;
    }
    function irrota() { if (liitetty && win) win.removeEventListener('hashchange', kuuntelija); liitetty = false; kuuntelija = null; }
    /* avaa(pid, valilehti, korvaa): korvaa=true → history.replaceState (pelaajan/välilehden vaihto näkymän sisällä); muuten uusi historiamerkintä (lista → näkymä). */
    function avaa(pid, valilehti, korvaa) {
      if (!_lippu() || !win) return false; var h = tmHashRakenna(pid, valilehti); if (!h) return false;
      if (win.location.hash === h) { _lue(); return true; }
      if (korvaa && win.history && typeof win.history.replaceState === 'function' && tmHashParse(win.location.hash)) { win.history.replaceState(null, '', h); _lue(); return true; }
      win.location.hash = h; nav++; return true;
    }
    function sulje() {
      if (!_lippu() || !win) return false; if (!tmHashParse(win.location.hash)) return true;
      if (nav > 0 && win.history && typeof win.history.back === 'function') { nav--; win.history.back(); return true; }   // hashchange → onTyhja
      if (win.history && typeof win.history.replaceState === 'function') win.history.replaceState(null, '', (win.location.pathname || '') + (win.location.search || ''));   // suora URL: ei historiaa jota palata → siivoa hash paikallaan
      _lue(); return true;
    }
    function nykyinen() { return _lippu() && win ? tmHashParse(win.location.hash) : null; }
    return { liita: liita, irrota: irrota, avaa: avaa, sulje: sulje, nykyinen: nykyinen };
  }
  var API = { VALILEHDET: VALILEHDET, tmHashParse: tmHashParse, tmHashRakenna: tmHashRakenna, tmPelaajaOikeus: tmPelaajaOikeus, tmHashReititin: tmHashReititin };
  if (typeof module !== 'undefined' && module.exports) module.exports = API; else root.TM_HASH_REITITIN = API;
})(typeof window !== 'undefined' ? window : this);
