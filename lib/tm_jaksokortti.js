/* ════════════════════════════════════════════════════════════════════════
   tm_jaksokortti.js — "Jakso nyt" -KORTTI henkilökunnalle (PURE; ei Firebasea; VP:n Tänään + Polku, jatkossa Master). 6.10.2026, design 01 (Tänään: jakso ja osat · Polku: jaksot).
   Yksi tieto, yksi paikka: taito · ydinvahvuus · tukiosa · kesto + päättymispäivä (ikävaiheen mukaan, D7; vanhat 4 vk -jaksot ennallaan) · vastuuhenkilö · joukkueen teema (#822) ·
   kotiharjoitteet (#823: liitä/katso) · lähdemerkintä ("Asetti: VP · 6.10." tai "TalentMasterin ehdotus"). EI D-koodeja, EI sanaa "jaksofokus", EI "sillan ehdotus" -termiä käyttäjälle.
   · tmJaksoKortti(p, ctx)        → tiedot { onJakso, taito, ydinvahvuus, tukiosa, kesto_vk, alkoi, paattyy, viikko, umpeutunut, asetti, vastuuhenkilo, teema, kotiharjoitteet }
       ctx: { nyt (Date|ISO, oletus tämä hetki), teema (tmJoukkueenTeemaNaytto-tulos|null), vastuuNimi (merkkijono|''), kotiharjoitteet (rivit [] ) }
   · tmJaksoKorttiHTML(k, opts)   → kortin HTML. opts: { esc, t, lukuTila (true → ei muokkausnappeja), aloitaFn, muokkaaFn, liitaFn, katsoFn, pid, toimintoTeksti/toimintoFn (yksi toiminto Tänäänissä) }
   Vain tokenit/CSS-muuttujat (ei hex-värejä); tekstit opts.t:n läpi; kaikki escapataan. Dual-export: module.exports || window.TM_JAKSOKORTTI.
════════════════════════════════════════════════════════════════════════ */
(function (root) {
  'use strict';
  var DAY = 86400000;
  function _esc(s) { return String(s == null ? '' : s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;'); }
  function _t(o) { return (o && typeof o.t === 'function') ? o.t : function (k) { return k; }; }
  function _pvm(d) { return d.getFullYear() + '-' + String(d.getMonth() + 1).padStart(2, '0') + '-' + String(d.getDate()).padStart(2, '0'); }   // paikallinen kalenteripäivä (§7.26)
  function _pvmOsat(iso) { var m = /^(\d{4})-(\d{2})-(\d{2})/.exec(String(iso || '')); return m ? { y: +m[1], m: +m[2], d: +m[3] } : null; }
  function _lyhyt(iso) { var o = _pvmOsat(iso); return o ? (o.d + '.' + o.m + '.') : ''; }
  function _paivaNum(iso) { var o = _pvmOsat(iso); return o ? Date.UTC(o.y, o.m - 1, o.d) : null; }
  function _lisaaPv(iso, n) { var o = _pvmOsat(iso); if (!o) return null; var d = new Date(Date.UTC(o.y, o.m - 1, o.d) + n * DAY); return d.getUTCFullYear() + '-' + String(d.getUTCMonth() + 1).padStart(2, '0') + '-' + String(d.getUTCDate()).padStart(2, '0'); }
  function _nytPvm(nyt) { if (nyt instanceof Date) return _pvm(nyt); if (typeof nyt === 'string' && /^\d{4}-\d{2}-\d{2}/.test(nyt)) return nyt.slice(0, 10); return _pvm(new Date()); }

  /* Lähdemerkintä: jf.asetti {rooli, pvm} (D-3:n aloitus) → "Asetti: <rooli> · <pvm>". Ilman asetti-kenttää: moottorin/sillan lähteet (silta*, teemakeskittyma, kalenteri…) → "TalentMasterin ehdotus";
     käsin-lähteet (valmentaja/vp/manuaalinen) → "Asetti: <rooli> · <alkoi-pvm>"; tuntematon → ei merkintää. */
  function _asetti(jf, alkoiPvm) {
    if (jf.asetti && jf.asetti.rooli) return { tapa: 'asetti', rooli: String(jf.asetti.rooli), pvm: jf.asetti.pvm || alkoiPvm || null };
    var l = String(jf.lahde || '');
    if (/silta|moottori|ehdotus|teemakeskittyma|kalenteri|viikko/.test(l)) return { tapa: 'ehdotus', rooli: null, pvm: null };
    if (l === 'valmentaja' || l === 'vp' || l === 'manuaalinen') return { tapa: 'asetti', rooli: l === 'manuaalinen' ? 'valmentaja' : l, pvm: alkoiPvm || null };
    return null;
  }

  function tmJaksoKortti(p, ctx) {
    ctx = ctx || {}; p = p || {};
    var jf = p.jaksofokus, nytPvm = _nytPvm(ctx.nyt), teema = ctx.teema || null;
    var base = { onJakso: false, teema: teema, vastuuhenkilo: p.vastuuhenkilo ? { nimi: ctx.vastuuNimi || '', rooli: p.vastuuhenkilo.rooli } : null, kotiharjoitteet: ctx.kotiharjoitteet || [],
      ydinvahvuus: (p.ydinvahvuus && p.ydinvahvuus.kuvaus) || null };
    if (!jf || !(jf.konsepti_nimi || jf.konsepti_avain)) return base;
    var alkoiPvm = jf.alkoi ? _pvm(new Date(jf.alkoi)) : null, kesto = Number(jf.kesto_vk) > 0 ? Number(jf.kesto_vk) : 4;   // vanhat jaksot: 4 vk oletus ennallaan
    var paattyy = alkoiPvm ? _lisaaPv(alkoiPvm, kesto * 7) : null, viikko = null, umpeutunut = false;
    if (alkoiPvm) {
      var n = Math.floor((_paivaNum(nytPvm) - _paivaNum(alkoiPvm)) / DAY / 7) + 1;
      if (n < 1) n = 1; umpeutunut = _paivaNum(nytPvm) >= _paivaNum(paattyy); viikko = { n: Math.min(n, kesto), k: kesto, jaljella: Math.max(0, kesto - n) };
    }
    var tuki = jf.tukiosa && (jf.tukiosa.alue || jf.tukiosa.perustelu) ? { alue: jf.tukiosa.alue || '', perustelu: jf.tukiosa.perustelu || '' } : null;
    return Object.assign(base, { onJakso: true, taito: jf.konsepti_nimi || jf.konsepti_avain, tukiosa: tuki, kesto_vk: kesto, alkoi: alkoiPvm, paattyy: paattyy, viikko: viikko, umpeutunut: umpeutunut, asetti: _asetti(jf, alkoiPvm),
      domeeni: jf.domeeni || 'teknis_taktinen', tila: jf.tila || null });
  }

  var ROOLI_AVAIN = { vp: 'VP', valmentaja: 'valmentaja', apuvalmentaja: 'apuvalmentaja', talenttivalmentaja: 'talenttivalmentaja', urheilutoimenjohtaja: 'UTJ', fysiikkavalmentaja: 'fysiikkavalmentaja' };

  function tmJaksoKorttiHTML(k, opts) {
    opts = opts || {}; var esc = opts.esc || _esc, t = _t(opts);
    var rivi = function (otsikko, arvo) { return arvo ? '<div class="tm-jk-rivi" style="display:flex;gap:8px;font-size:12.5px;margin-top:5px"><span style="flex:0 0 118px;color:var(--ink3)">' + esc(t(otsikko)) + '</span><span style="color:var(--ink2);min-width:0">' + arvo + '</span></div>' : ''; };
    var nappi = function (fn, teksti, ensisijainen) { return fn ? '<button type="button" onclick="event.stopPropagation();' + esc(fn) + '(\'' + esc(opts.pid || '') + '\')" style="font-size:11.5px;font-weight:600;border-radius:7px;padding:6px 11px;cursor:pointer;border:.5px solid var(--teal);'
      + (ensisijainen ? 'background:var(--teal);color:var(--bg)' : 'background:transparent;color:var(--teal)') + '">' + esc(t(teksti)) + '</button>' : ''; };
    var h = '<div class="tm-jaksokortti" data-jakso="' + (k.onJakso ? '1' : '0') + '">';
    var teemaTeksti = '';
    if (k.teema) { var o = []; if (k.teema.nyt) o.push(esc(k.teema.nyt)); if (k.teema.seuraava) o.push(esc(t('seuraavaksi')) + ' ' + esc(k.teema.seuraava)); if (k.teema.luonnos && (k.teema.luonnos.nyt || k.teema.luonnos.seuraava)) o.push('<i data-teema-luonnos>' + esc(t('luonnos')) + ': ' + esc(k.teema.luonnos.nyt || k.teema.luonnos.seuraava) + '</i>'); teemaTeksti = o.join(' · '); }
    if (!k.onJakso) {
      h += '<div style="font-size:13px;color:var(--ink3);font-style:italic">' + esc(t('Ei jaksoa käynnissä.')) + '</div>';
      h += rivi('Ydinvahvuus', k.ydinvahvuus ? esc(k.ydinvahvuus) : '') + rivi('Joukkueen teema', teemaTeksti);
      if (!opts.lukuTila) h += '<div style="margin-top:10px">' + nappi(opts.aloitaFn, 'Aloita jakso', true) + '</div>';
      return h + '</div>';
    }
    var tilaTeksti = k.umpeutunut ? esc(t('Päättynyt')) + ' ' + esc(_lyhyt(k.paattyy)) : (k.viikko ? esc(t('Viikko')) + ' ' + k.viikko.n + '/' + k.viikko.k : '');
    h += '<div style="display:flex;justify-content:space-between;align-items:baseline;gap:10px;flex-wrap:wrap"><div style="font-size:11px;letter-spacing:.08em;text-transform:uppercase;color:var(--ink3)">' + esc(t('Jakso nyt')) + '</div><div style="font-size:11.5px;color:var(--ink3)">' + tilaTeksti + '</div></div>';
    h += '<div class="tm-jk-taito" style="font-size:20px;color:var(--ink);margin:4px 0 6px">' + esc(k.taito) + '</div>';
    h += rivi('Ydinvahvuus', k.ydinvahvuus ? esc(k.ydinvahvuus) : '');
    h += rivi('Tukiosa', k.tukiosa ? esc(k.tukiosa.alue) + (k.tukiosa.perustelu ? ' — ' + esc(k.tukiosa.perustelu) : '') : '');
    h += rivi('Kesto', esc(k.kesto_vk) + ' ' + esc(t('vk')) + (k.paattyy ? ' · ' + esc(t('päättyy')) + ' ' + esc(_lyhyt(k.paattyy)) : ''));
    h += rivi('Vastuuhenkilö', k.vastuuhenkilo ? esc((k.vastuuhenkilo.nimi || t('tuntematon')) + ' · ' + t(ROOLI_AVAIN[k.vastuuhenkilo.rooli] || k.vastuuhenkilo.rooli)) : '');
    h += rivi('Joukkueen teema', teemaTeksti);
    var lkm = (k.kotiharjoitteet || []).length;
    h += rivi('Kotiharjoitteet', lkm ? esc(lkm) + ' ' + esc(t('kpl')) + (opts.katsoFn ? ' · ' + nappi(opts.katsoFn, 'Katso', false) : '') : esc(t('ei vielä')) + (!opts.lukuTila && opts.liitaFn ? ' · ' + nappi(opts.liitaFn, 'Liitä', false) : ''));
    if (lkm && !opts.lukuTila && opts.liitaFn) h += rivi('', nappi(opts.liitaFn, 'Liitä lisää', false));
    var a = k.asetti, asettiTeksti = !a ? '' : (a.tapa === 'ehdotus' ? esc(t('TalentMasterin ehdotus')) : esc(t('Asetti')) + ': ' + esc(t(ROOLI_AVAIN[a.rooli] || a.rooli)) + (a.pvm ? ' · ' + esc(_lyhyt(a.pvm)) : ''));
    if (asettiTeksti) h += '<div class="tm-jk-lahde" style="font-size:10.5px;color:var(--ink3);margin-top:8px;letter-spacing:.03em">' + asettiTeksti + '</div>';
    if (!opts.lukuTila && opts.muokkaaFn) h += '<div style="margin-top:10px">' + nappi(opts.muokkaaFn, 'Muokkaa jaksoa', true) + '</div>';
    if (opts.lukuTila && opts.toimintoFn) h += '<div style="margin-top:10px">' + nappi(opts.toimintoFn, opts.toimintoTeksti || 'Aloita seuraava jakso', true) + '</div>';
    return h + '</div>';
  }

  var API = { tmJaksoKortti: tmJaksoKortti, tmJaksoKorttiHTML: tmJaksoKorttiHTML, _lyhyt: _lyhyt };
  if (typeof module !== 'undefined' && module.exports) module.exports = API; else root.TM_JAKSOKORTTI = API;
})(typeof window !== 'undefined' ? window : this);
