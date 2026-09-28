/* ════════════════════════════════════════════════════════════════════════
   tm_havaintohistoria.js — havaintojen ja viestien HISTORIA yhtenä komponenttina.

   MIKSI JAETTU: sama lista tarvitaan VP:n pelaajakortilla ja valmentajan sovelluksessa.
   Kaksi toteutusta ajautuisi erilleen, ja juuri niin kävi: valmentaja näki tekstin
   katkaistuna 110 merkkiin ja VP ei nähnyt tekstejä lainkaan — vaikka molemmat lukevat
   samaa `havainnot`-kokoelmaa.

   ⚠ TURVALLISUUS: tämä kirjasto ESCAPOI kaiken tekstin. Valmentajan kirjoittama teksti
   päätyy myös lapsen sovellukseen, joten escapoimaton `<img onerror=…>` suorittuisi siellä.
   Älä lisää tähän kohtaa, joka työntää käyttäjän tekstiä HTML:ään `_hhEsc`:n ohi.

   PURE: ei Firestorea, ei Date.now():ta renderöinnissä, ei DOM-riippuvuuksia.
   Dual-export: module.exports (Vitest) || window (selain).
════════════════════════════════════════════════════════════════════════ */
(function (root) {
  'use strict';

  function _hhEsc(s) {
    return String(s == null ? '' : s).replace(/[&<>"']/g, function (c) {
      return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c];
    });
  }

  /* Aikaleima on A5-tyyppiturvallinen: kentässä on ollut Firestore-Timestamp, ISO-merkkijono
     ja pelkkä 'YYYY-MM-DD'. Yksikin väärä oletus rikkoisi järjestyksen hiljaa. */
  function _hhMs(v) {
    if (v == null) return 0;
    if (typeof v.toDate === 'function') { try { return v.toDate().getTime() || 0; } catch (e) { return 0; } }
    if (typeof v.seconds === 'number') return v.seconds * 1000;
    if (v instanceof Date) return v.getTime() || 0;
    var t = new Date(v).getTime();
    return isNaN(t) ? 0 : t;
  }

  function _hhPvm(ms) {
    if (!ms) return '';
    var d = new Date(ms);
    if (isNaN(d.getTime())) return '';
    var p = function (n) { return (n < 10 ? '0' : '') + n; };
    return p(d.getDate()) + '.' + p(d.getMonth() + 1) + '.' + d.getFullYear();
  }

  /* Tekijän nimi. Osaan vanhoista havainnoista tallentui SÄHKÖPOSTI (`user.email`), ja se näkyi
     lapsen kortilla muodossa "talentmasterid@gmail.com". Sitä ei näytetä missään. */
  function _hhTekija(d) {
    var n = d.tekija_nimi || d.valmentajaNimi || '';
    n = String(n).trim();
    if (!n || n.indexOf('@') >= 0) return 'Valmentaja';
    return n;
  }

  var HH_PISTE_AVAIMET = ['A', 'D', 'Act', 'R'];

  function _hhPisteet(p) {
    if (!p || typeof p !== 'object') return {};
    var out = {};
    HH_PISTE_AVAIMET.forEach(function (k) {
      var v = p[k];
      if (v == null || isNaN(v)) return;
      out[k] = Math.max(1, Math.min(3, Math.round(Number(v))));
    });
    return out;
  }

  function _hhRivi(d) {
    if (!d) return null;
    var laji = (d.tyyppi === 'valmentaja_viesti') ? 'viesti' : 'havainto';
    var teksti = d.narratiivi || d.teksti || d.oppimisnakokohta || '';
    var pisteet = _hhPisteet(d.pisteet);
    /* Rivi ilman pisteitä JA ilman tekstiä ei kerro mitään — se olisi tyhjä rivi listassa. */
    if (laji === 'havainto' && !Object.keys(pisteet).length && !String(teksti).trim()) return null;
    var ms = _hhMs(d.luotu) || _hhMs(d.pvm);
    /* Näkyvyys luetaan fail-closed kuten Rules (v3.22): puuttuva kenttä EI tarkoita pelaajalle.
       Näin lista ei lupaa valmentajalle, että teksti meni lapselle, jos sääntö estää sen. */
    var nak = (d.nakyvyys === 'pelaaja') ? 'pelaaja' : 'valmentajat';
    return {
      id: d.id || null,
      laji: laji,
      _ms: ms,
      pvm: _hhPvm(ms),
      tekija: _hhTekija(d),
      tekijaUid: d.tekija_uid || d.valmentajaUid || null,
      konteksti: d.konteksti || d.tilanne || '',       // `tilanne` = vanha kenttänimi
      porras: (typeof d.porras === 'number') ? d.porras : null,
      pisteet: pisteet,
      havaitut: Array.isArray(d.havaitut) ? d.havaitut.slice() : [],
      teksti: String(teksti),
      nakyvyys: nak,
      luettu: !!d.pelaaja_lukenut,
      peruttu: d.tila === 'peruttu'
    };
  }

  /** Dokumentit → normalisoidut rivit, UUSIN ENSIN. */
  function tmHhRivit(docs) {
    return (Array.isArray(docs) ? docs : [])
      .map(_hhRivi)
      .filter(Boolean)
      .sort(function (a, b) { return b._ms - a._ms; });
  }

  var HH_SUODATTIMET = ['kaikki', 'havainto', 'viesti'];

  function _hhOtsikko(r, t) {
    if (r.laji === 'viesti') return t('Viesti perheelle');
    var osat = [t('Pelihavainto')];
    if (r.konteksti) osat.push(t(_hhKontekstiNimi(r.konteksti)));
    if (r.porras) osat.push(t('porras') + ' ' + r.porras);
    return osat.join(' · ');
  }

  var HH_KONTEKSTI = { harjoitus: 'Harjoitus', pienpeli: 'Pienpeli', ottelu: 'Ottelu' };
  function _hhKontekstiNimi(k) { return HH_KONTEKSTI[k] || k; }

  /**
   * Rivit → listan HTML. `opts.t` = käännösfunktio (oletus: identiteetti),
   * `opts.suodatin` = 'kaikki'|'havainto'|'viesti', `opts.peruSallittu(rivi)` = näytetäänkö Peru.
   */
  function tmHhHTML(rivit, opts) {
    opts = opts || {};
    var t = (typeof opts.t === 'function') ? opts.t : function (s) { return s; };
    var suodatin = (HH_SUODATTIMET.indexOf(opts.suodatin) >= 0) ? opts.suodatin : 'kaikki';
    var lista = (Array.isArray(rivit) ? rivit : []).filter(function (r) {
      return suodatin === 'kaikki' || r.laji === suodatin;
    });
    if (!lista.length) {
      return '<div class="hh-tyhja">' + _hhEsc(t('Ei merkintöjä.')) + '</div>';
    }
    return lista.map(function (r) { return _hhRiviHTML(r, t, opts); }).join('');
  }

  function _hhRiviHTML(r, t, opts) {
    var chips = '';
    Object.keys(r.pisteet).forEach(function (k) {
      chips += '<span class="hh-pt">' + _hhEsc(k) + ' <b>' + _hhEsc(r.pisteet[k]) + '</b></span>';
    });
    r.havaitut.forEach(function (x) {
      /* "Mitä näit" -valinta on muodossa "A:Katsoo ylös" — näytetään vain ihmisluettava osa. */
      var teksti = String(x).indexOf(':') > 0 ? String(x).slice(String(x).indexOf(':') + 1) : x;
      chips += '<span class="hh-pt">' + _hhEsc(teksti) + '</span>';
    });

    var nak = r.peruttu
      ? '<span class="hh-badge ghost">' + _hhEsc(t('Peruttu · ei laske')) + '</span>'
      : (r.nakyvyys === 'pelaaja'
        ? '<span class="hh-badge">' + _hhEsc(t('Pelaaja näkee')) + '</span>'
        : '<span class="hh-badge amber">' + _hhEsc(t('Vain valmentajille')) + '</span>');

    /* Lukutila kerrotaan VAIN pelaajalle näkyvistä: "ei vielä luettu" olisi harhaanjohtava
       merkinnälle, jota lapselle ei ole tarkoitettukaan. */
    var luettu = (r.peruttu || r.nakyvyys !== 'pelaaja') ? ''
      : '<span class="hh-seen">' + _hhEsc(t(r.luettu ? '✓ luettu' : 'ei vielä luettu')) + '</span>';

    var peru = '';
    if (!r.peruttu && typeof opts.peruSallittu === 'function' && opts.peruSallittu(r)) {
      peru = '<span class="hh-sp"></span><button type="button" class="hh-peru" data-hh-peru="'
        + _hhEsc(r.id) + '">' + _hhEsc(t('Peru')) + '</button>';
    }

    return '<div class="hh-rivi' + (r.peruttu ? ' peruttu' : '') + '" data-hh-id="' + _hhEsc(r.id) + '">'
      + '<div class="hh-h"><span class="hh-t">' + _hhEsc(_hhOtsikko(r, t)) + '</span>'
      + '<span class="hh-meta">' + _hhEsc(r.pvm) + (r.pvm ? ' · ' : '') + _hhEsc(r.tekija) + '</span></div>'
      + (chips ? ('<div class="hh-chips">' + chips + '</div>') : '')
      + (r.teksti ? ('<div class="hh-narr">' + _hhEsc(r.teksti) + '</div>') : '')
      + '<div class="hh-f">' + nak + luettu + peru + '</div>'
      + '</div>';
  }

  /** Listan oma CSS. Sivut tuovat tämän sellaisenaan, jottei kahta tyyliä synny. */
  function tmHhCss() {
    return '.hh-rivi{padding:14px 0;border-bottom:.5px solid var(--border2,rgba(128,128,128,.2))}'
      + '.hh-rivi:last-child{border-bottom:none}'
      + '.hh-h{display:flex;justify-content:space-between;align-items:baseline;gap:8px;flex-wrap:wrap}'
      + '.hh-t{font-size:12.5px;font-weight:500;color:var(--ink)}'
      + '.hh-meta{font-family:var(--font-mono,monospace);font-size:10.5px;color:var(--ink3)}'
      + '.hh-chips{display:flex;gap:5px;flex-wrap:wrap;margin:7px 0}'
      + '.hh-pt{font-family:var(--font-mono,monospace);font-size:10.5px;padding:2px 7px;'
      + 'border:.5px solid var(--border);color:var(--ink2)}'
      + '.hh-pt b{color:var(--ink);font-weight:500}'
      + '.hh-narr{font-family:var(--font-serif,Georgia,serif);font-style:italic;font-size:16px;'
      + 'color:var(--ink);line-height:1.4;margin-top:4px;white-space:pre-wrap}'
      + '.hh-rivi.peruttu{opacity:.5}'
      + '.hh-rivi.peruttu .hh-narr{text-decoration:line-through;text-decoration-thickness:.5px}'
      + '.hh-f{display:flex;gap:10px;align-items:center;margin-top:8px;flex-wrap:wrap}'
      + '.hh-sp{flex:1}'
      + '.hh-seen{font-size:11px;color:var(--ink3);font-style:italic}'
      + '.hh-badge{display:inline-block;font-size:9px;font-weight:600;letter-spacing:.14em;'
      + 'text-transform:uppercase;padding:3px 8px;border:.5px solid var(--teal-brd);'
      + 'background:var(--teal-dim);color:var(--teal,var(--accent));white-space:nowrap}'
      + '.hh-badge.amber{border-color:var(--amber-brd);background:var(--amber-dim);color:var(--amber)}'
      + '.hh-badge.ghost{border-color:var(--border);background:transparent;color:var(--ink3)}'
      + '.hh-peru{background:none;border:none;color:var(--ink3);font-size:11.5px;cursor:pointer;'
      + 'padding:0;font-family:inherit;text-decoration:underline}'
      + '.hh-tyhja{font-size:12.5px;color:var(--ink3);padding:12px 0}'
      + '.hh-filt{display:flex;gap:6px;margin:10px 0 4px;flex-wrap:wrap}'
      + '.hh-filt button{font-size:11px;padding:5px 10px;border:.5px solid var(--border);'
      + 'background:transparent;color:var(--ink2);border-radius:2px;cursor:pointer;font-family:inherit}'
      + '.hh-filt button[aria-pressed="true"]{border-color:var(--teal-brd);'
      + 'background:var(--teal-dim);color:var(--teal,var(--accent))}';
  }

  /** Suodatinpainikkeet (Kaikki · Pelihavainnot · Viestit perheelle). */
  function tmHhSuodatinHTML(valittu, t) {
    var tt = (typeof t === 'function') ? t : function (s) { return s; };
    var NIMET = { kaikki: 'Kaikki', havainto: 'Pelihavainnot', viesti: 'Viestit perheelle' };
    var v = (HH_SUODATTIMET.indexOf(valittu) >= 0) ? valittu : 'kaikki';
    return '<div class="hh-filt" role="group">' + HH_SUODATTIMET.map(function (k) {
      return '<button type="button" data-hh-suodatin="' + k + '" aria-pressed="' + (k === v) + '">'
        + _hhEsc(tt(NIMET[k])) + '</button>';
    }).join('') + '</div>';
  }

  var API = {
    tmHhRivit: tmHhRivit,
    tmHhHTML: tmHhHTML,
    tmHhCss: tmHhCss,
    tmHhSuodatinHTML: tmHhSuodatinHTML,
    HH_SUODATTIMET: HH_SUODATTIMET,
    _hhEsc: _hhEsc
  };

  if (typeof module !== 'undefined' && module.exports) module.exports = API;
  else {
    root.TM_HAVAINTOHISTORIA = API;
    for (var k in API) { if (Object.prototype.hasOwnProperty.call(API, k)) { try { root[k] = API[k]; } catch (e) { /* readonly */ } } }
  }
})(typeof window !== 'undefined' ? window : this);
