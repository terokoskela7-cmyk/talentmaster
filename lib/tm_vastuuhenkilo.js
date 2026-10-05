/* ════════════════════════════════════════════════════════════════════════
   tm_vastuuhenkilo.js — vastuuhenkilö per pelaaja (Tero 5.10.2026; PURE, ei Firebasea/DOM-riippuvuutta, toimii offline).
   Pelaajadokumentin kenttä  vastuuhenkilo: { uid, rooli, asetettu_pvm }  (additiivinen, §11).  Kertoo vain KENEN TEHTÄVÄ pelaajan asia on — EI rajaa oikeuksia
   (VP ja talenttivalmentaja näkevät ja toimivat kaikkien pelaajien kohdalla; periaate: VP hallitsee koko järjestelmää).
   Rooli: valmentaja | apuvalmentaja | talenttivalmentaja | vp. Asettajat (Rules v3.38): SA, VP, UTJ, talenttivalmentaja, joukkueen valmentaja.
   · tmVastuuhenkilo({uid, rooli}, tanaan)        → validoitu {uid, rooli, asetettu_pvm} (paikallinen päivä §7.26); virheellinen → throw
   · tmVastuuhenkiloAsetus(p, valinta, tanaan)    → kirjoitussuunnitelma { kirjoitus:{vastuuhenkilo: obj|POISTA}, paikallinen } (valinta null → poisto)
   · tmVastuuhenkiloVaihtoehdot(henkilot)         → valittavat {arvo:'uid|rooli', nimi, rooli} (valmentaja-henkilölle myös apuvalmentaja-vaihtoehto); vain valmentaja/talenttivalmentaja/vp
   · tmVastuuhenkiloNimi(vh, henkilot)            → näyttönimi ('' jos ei kenttää); tmVastuuhenkiloTeksti(...) → "Nimi · rooli" (t:n läpi)
   · tmVastuuhenkiloHTML(p, henkilot, opts)       → henkilökunnan rivi (EI pelaajan/huoltajan näkymiin): nimi + rooli, ja valitsin kun opts.voiAsettaa
   Tekstit opts.t:n läpi (ilman t:tä avain sellaisenaan); kaikki escapataan; ei hex-värejä (tokenit/CSS-luokat). Dual-export: module.exports || window.TM_VASTUUHENKILO.
════════════════════════════════════════════════════════════════════════ */
(function (root) {
  'use strict';

  var ROOLIT = ['valmentaja', 'apuvalmentaja', 'talenttivalmentaja', 'vp'];
  var VALITTAVAT_KAYTTAJAROOLIT = { valmentaja: 1, talenttivalmentaja: 1, vp: 1 };   // kayttajat.rooli → voi olla vastuuhenkilö
  var POISTA = Object.freeze({ __poista: true });

  function _esc(s) { return String(s == null ? '' : s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;'); }
  function _t(opts) { return (opts && typeof opts.t === 'function') ? opts.t : function (k) { return k; }; }
  function _pvm(v) {
    if (typeof v !== 'string' || !/^\d{4}-\d{2}-\d{2}$/.test(v)) throw new Error('tm_vastuuhenkilo: päivä ei ole YYYY-MM-DD (paikallinen päivä, §7.26)');
    var o = v.split('-'), y = +o[0], m = +o[1], d = +o[2], pv = [31, (y % 4 === 0 && (y % 100 !== 0 || y % 400 === 0)) ? 29 : 28, 31, 30, 31, 30, 31, 31, 30, 31, 30, 31];
    if (m < 1 || m > 12 || d < 1 || d > pv[m - 1]) throw new Error('tm_vastuuhenkilo: päivä ei ole kelvollinen');
    return v;
  }

  function tmVastuuhenkilo(x, tanaan) {
    x = x || {};
    var uid = typeof x.uid === 'string' ? x.uid.trim() : '';
    if (!uid || uid.length > 128) throw new Error('tm_vastuuhenkilo: uid puuttuu tai on liian pitkä');
    if (ROOLIT.indexOf(x.rooli) < 0) throw new Error('tm_vastuuhenkilo: rooli pitää olla ' + ROOLIT.join('|'));
    return { uid: uid, rooli: x.rooli, asetettu_pvm: _pvm(tanaan) };
  }

  function tmVastuuhenkiloAsetus(p, valinta, tanaan) {
    if (valinta == null) {
      if (!p || !p.vastuuhenkilo) throw new Error('tm_vastuuhenkilo: ei poistettavaa vastuuhenkilöä');
      return { kirjoitus: { vastuuhenkilo: POISTA }, paikallinen: { vastuuhenkilo: POISTA } };
    }
    var vh = tmVastuuhenkilo(valinta, tanaan);
    return { kirjoitus: { vastuuhenkilo: vh }, paikallinen: { vastuuhenkilo: vh } };
  }

  // henkilot: [{id|uid, nimi, rooli (kayttajat.rooli), aktiivinen?}] → valittavat vaihtoehdot
  function tmVastuuhenkiloVaihtoehdot(henkilot) {
    var out = [];
    (Array.isArray(henkilot) ? henkilot : []).forEach(function (h) {
      if (!h || h.aktiivinen === false) return;
      var uid = h.uid || h.id, rooli = h.rooli;
      if (!uid || !VALITTAVAT_KAYTTAJAROOLIT[rooli]) return;
      out.push({ arvo: uid + '|' + rooli, uid: uid, nimi: h.nimi || '', rooli: rooli });
      if (rooli === 'valmentaja') out.push({ arvo: uid + '|apuvalmentaja', uid: uid, nimi: h.nimi || '', rooli: 'apuvalmentaja' });
    });
    return out.sort(function (a, b) { return String(a.nimi).localeCompare(String(b.nimi)) || (a.rooli < b.rooli ? -1 : 1); });
  }
  function tmVastuuhenkiloNimi(vh, henkilot) {
    if (!vh || !vh.uid) return '';
    var h = (Array.isArray(henkilot) ? henkilot : []).filter(function (x) { return x && (x.uid === vh.uid || x.id === vh.uid); })[0];
    return h && h.nimi ? h.nimi : '';
  }
  function tmVastuuhenkiloTeksti(vh, henkilot, opts) {
    if (!vh) return '';
    var t = _t(opts), nimi = tmVastuuhenkiloNimi(vh, henkilot);
    return (nimi || t('tuntematon')) + ' · ' + t(vh.rooli);
  }

  /* opts: { t, voiAsettaa, onchange: 'globaaliFn' (kutsutaan (pid, arvo) — arvo '' = poista), luokka } */
  function tmVastuuhenkiloHTML(p, henkilot, opts) {
    opts = opts || {}; var t = _t(opts);
    if (!p) return '';
    var vh = p.vastuuhenkilo || null;
    var teksti = vh ? tmVastuuhenkiloTeksti(vh, henkilot, opts) : t('ei asetettu');
    var h = '<div class="tm-vh' + (opts.luokka ? ' ' + _esc(opts.luokka) : '') + '" data-vastuuhenkilo="' + (vh ? '1' : '0') + '" style="display:flex;flex-wrap:wrap;gap:6px;align-items:center;margin:6px 0;font-size:12px;color:var(--ink3)">'
      + '<span>' + _esc(t('Vastuuhenkilö')) + ':</span> <b style="color:var(--ink2);font-weight:600">' + _esc(teksti) + '</b>';
    if (opts.voiAsettaa && opts.onchange) {
      var vaiht = tmVastuuhenkiloVaihtoehdot(henkilot), nyt = vh ? vh.uid + '|' + vh.rooli : '';
      h += '<select class="tm-vh-sel" aria-label="' + _esc(t('Vastuuhenkilö')) + '" onclick="event.stopPropagation()" onchange="' + _esc(opts.onchange) + '(\'' + _esc(p.id) + '\',this.value)" style="max-width:220px;font-size:12px">'
        + '<option value="">' + _esc(t('— ei vastuuhenkilöä —')) + '</option>';
      vaiht.forEach(function (v) { h += '<option value="' + _esc(v.arvo) + '"' + (v.arvo === nyt ? ' selected' : '') + '>' + _esc((v.nimi || t('tuntematon')) + ' · ' + t(v.rooli)) + '</option>'; });
      h += '</select>';
    }
    return h + '</div>';
  }

  var API = { ROOLIT: ROOLIT, POISTA: POISTA, tmVastuuhenkilo: tmVastuuhenkilo, tmVastuuhenkiloAsetus: tmVastuuhenkiloAsetus, tmVastuuhenkiloVaihtoehdot: tmVastuuhenkiloVaihtoehdot,
    tmVastuuhenkiloNimi: tmVastuuhenkiloNimi, tmVastuuhenkiloTeksti: tmVastuuhenkiloTeksti, tmVastuuhenkiloHTML: tmVastuuhenkiloHTML };
  if (typeof module !== 'undefined' && module.exports) module.exports = API;
  else root.TM_VASTUUHENKILO = API;
})(typeof window !== 'undefined' ? window : this);
