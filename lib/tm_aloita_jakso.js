/* ════════════════════════════════════════════════════════════════════════
   tm_aloita_jakso.js — "Aloita jakso" -MODAALI jaettuna Masterin ja VP:n kesken (PURE; ei Firebasea, ei DOM-kirjoitusta; adapteri hoitaa DOM:n ja kirjoituksen). 6.10.2026.
   Sama lomake molemmissa: taito · ydinvahvuus · tukiosa {alue, perustelu} · kesto ikävaiheen mukaan (D7) · vastuuhenkilö. Päätös ja validointi: lib/tm_jakso_malli.js (tmAloitaJakso).
   · tmAloitaJaksoTiedot(p, ctx)                → lomakkeen alkuarvot pelaajasta (taidot, esitäyttö valinnasta/jaksosta, kesto, vastuuhenkilö-vaihtoehdot, tila: aloita | vahvista | muokkaa)
   · tmAloitaJaksoModalHTML(tiedot, opts)       → modaalin HTML. opts: { esc, t, overlayAttrs (sovelluksen oma scrim-tyyli/luokka), tallennaFn, suljeFn, modalId }
   · tmAloitaJaksoSyote(arvo)                   → syöte tmAloitaJakso:lle luettuna lomakkeen kentistä (arvo(id) → merkkijono)
   · tmAloitaJaksoKirjoitus(v, tulos, vh, deps) → YKSI atominen update-olio { jaksofokus, ydinvahvuus, [vastuuhenkilo], [jaksofokus_historia] }; deps.arrayUnion injektoidaan (ei Firebase-riippuvuutta)
   · tmJaksoNappi(p)                            → 'aloita' | 'vahvista' | 'muokkaa' (nappitekstin avain: ei jaksoa → Aloita jakso · on jakso → Muokkaa jaksoa · pelaajan valinta odottaa → Vahvista jakso)
   Vain tokenit/CSS-muuttujat (ei hex-värejä); kaikki teksti opts.t:n läpi; kaikki arvot escapataan. Dual-export: module.exports || window.TM_ALOITA_JAKSO.
════════════════════════════════════════════════════════════════════════ */
(function (root) {
  'use strict';
  var IDS = { taito: '_ajTaito', yv: '_ajYv', alue: '_ajAlue', per: '_ajPer', kesto: '_ajKesto', vh: '_ajVh' };
  function _esc(s) { return String(s == null ? '' : s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;'); }
  function _t(o) { return (o && typeof o.t === 'function') ? o.t : function (k) { return k; }; }
  function _jm(ctx) { return (ctx && ctx.malli) || (root && root.TM_JAKSO_MALLI) || (typeof require === 'function' ? require('./tm_jakso_malli.js') : null); }

  function tmJaksoNappi(p) {
    var jf = p && p.jaksofokus;
    if (jf && jf.tila === 'valittavana' && p.ydinvahvuus_valinta) return 'vahvista';
    return (jf && (jf.konsepti_avain || jf.konsepti_nimi)) ? 'muokkaa' : 'aloita';
  }

  /* ctx: { items:[{avain,nimi,koodi?}], ehdotusAvain?, ika (vuosina), nimi (pelaajan näyttönimi), vastuuhenkilot:[{arvo,nimi,rooli}] | null, malli? } */
  function tmAloitaJaksoTiedot(p, ctx) {
    ctx = ctx || {}; p = p || {}; var JM = _jm(ctx), jf = p.jaksofokus || {}, tuki = jf.tukiosa || {}, kesto = JM.tmJaksonKesto(ctx.ika);
    var items = Array.isArray(ctx.items) ? ctx.items : [];
    var valittuAvain = ctx.esivalintaAvain || jf.konsepti_avain || ctx.ehdotusAvain || (items[0] && items[0].avain) || '';
    var valinta = p.ydinvahvuus_valinta && p.ydinvahvuus_valinta.vaihtoehto ? String(p.ydinvahvuus_valinta.vaihtoehto) : '';
    var yv = (p.ydinvahvuus && p.ydinvahvuus.kuvaus) || valinta || '';
    var keston = (jf.kesto_vk != null && kesto.vaihtoehdot.indexOf(Number(jf.kesto_vk)) >= 0) ? Number(jf.kesto_vk) : kesto.oletus;
    return { pid: p.id, nimi: ctx.nimi || '', tila: tmJaksoNappi(p), items: items, valittuAvain: valittuAvain, valinta: valinta, yv: yv, alue: tuki.alue || '', perustelu: tuki.perustelu || '',
      kesto: { vaihtoehdot: kesto.vaihtoehdot, valittu: keston, profiili: kesto.profiili }, vastuuhenkilot: ctx.vastuuhenkilot || null, vastuuNyt: p.vastuuhenkilo ? p.vastuuhenkilo.uid + '|' + p.vastuuhenkilo.rooli : '' };
  }

  function tmAloitaJaksoModalHTML(x, opts) {
    opts = opts || {}; var esc = opts.esc || _esc, t = _t(opts), id = opts.modalId || '_ajModal';
    var kentta = 'width:100%;font-size:13px;margin:4px 0 10px;padding:7px 9px;border-radius:8px;border:.5px solid var(--border);background:var(--card);color:var(--ink)';
    var lab = function (k) { return '<label style="font-size:11px;color:var(--ink3);letter-spacing:.04em">' + esc(t(k)) + '</label>'; };
    var otsikko = x.tila === 'muokkaa' ? 'Muokkaa jaksoa' : (x.tila === 'vahvista' ? 'Vahvista jakso' : 'Aloita jakso');
    var h = '<div id="' + esc(id) + '" role="dialog" aria-modal="true" ' + (opts.overlayAttrs || '') + ' onclick="if(event.target===this)' + esc(opts.suljeFn || '') + '()">'
      + '<div style="background:var(--card);color:var(--ink);border:.5px solid var(--border);border-radius:14px;max-width:520px;width:100%;max-height:92vh;overflow:auto;padding:18px 20px">'
      + '<div style="font-size:16px;font-weight:600;margin-bottom:4px">' + esc(t(otsikko)) + (x.nimi ? ' · ' + esc(x.nimi) : '') + '</div>'
      + (x.valinta ? '<div style="font-size:12px;color:var(--ink3);margin-bottom:8px">' + esc(t('Pelaaja valitsi ydinvahvuutensa')) + ': <b>' + esc(x.valinta) + '</b></div>' : '')
      + lab('Taito') + '<select id="' + IDS.taito + '" style="' + kentta + '">' + x.items.map(function (it) { return '<option value="' + esc(it.avain) + '"' + (it.avain === x.valittuAvain ? ' selected' : '') + '>' + esc(it.nimi || it.avain) + '</option>'; }).join('') + '</select>'
      + lab('Ydinvahvuus') + '<textarea id="' + IDS.yv + '" rows="2" maxlength="300" style="' + kentta + '">' + esc(x.yv) + '</textarea>'
      + lab('Tukiosan alue') + '<input id="' + IDS.alue + '" maxlength="60" value="' + esc(x.alue) + '" style="' + kentta + '">'
      + lab('Tukiosan perustelu (miksi tämä tukee ydinvahvuutta)') + '<textarea id="' + IDS.per + '" rows="3" maxlength="400" style="' + kentta + '">' + esc(x.perustelu) + '</textarea>'
      + lab('Jakson kesto (viikkoa, ikävaiheen mukaan)') + '<select id="' + IDS.kesto + '" style="' + kentta + '">' + x.kesto.vaihtoehdot.map(function (v) { return '<option value="' + v + '"' + (v === x.kesto.valittu ? ' selected' : '') + '>' + v + '</option>'; }).join('') + '</select>'
      + (x.vastuuhenkilot ? lab('Vastuuhenkilö') + '<select id="' + IDS.vh + '" style="' + kentta + '"><option value="">' + esc(t('— ei muutosta —')) + '</option>' + x.vastuuhenkilot.map(function (v) { return '<option value="' + esc(v.arvo) + '"' + (v.arvo === x.vastuuNyt ? ' selected' : '') + '>' + esc((v.nimi || t('tuntematon')) + ' · ' + t(v.rooli)) + '</option>'; }).join('') + '</select>' : '')
      + '<div style="display:flex;gap:8px;justify-content:flex-end;margin-top:6px"><button type="button" onclick="' + esc(opts.suljeFn || '') + '()" style="font-size:12px;border-radius:8px;padding:8px 14px;cursor:pointer;border:.5px solid var(--border);background:transparent;color:var(--ink2)">' + esc(t('Peruuta')) + '</button>'
      + '<button type="button" data-aj-tallenna onclick="' + esc(opts.tallennaFn || '') + '(\'' + esc(x.pid) + '\')" style="font-size:12px;font-weight:600;border-radius:8px;padding:8px 14px;cursor:pointer;border:.5px solid var(--teal);background:var(--teal);color:var(--bg)">' + esc(t(x.tila === 'muokkaa' ? 'Tallenna jakso' : 'Aloita jakso')) + '</button></div></div></div>';
    return h;
  }

  function tmAloitaJaksoSyote(arvo) {
    return { konsepti_avain: arvo(IDS.taito), ydinvahvuus_kuvaus: arvo(IDS.yv), tukiosa_alue: arvo(IDS.alue), tukiosa_perustelu: arvo(IDS.per), kesto_vk: arvo(IDS.kesto), vastuuhenkilo_arvo: arvo(IDS.vh) };
  }

  function tmAloitaJaksoKirjoitus(v, tulos, vh, deps) {
    var upd = { jaksofokus: v.jaksofokus, ydinvahvuus: tulos.ydinvahvuus };
    if (vh) upd.vastuuhenkilo = vh;
    var rivit = Array.isArray(v.historiaLisays) ? v.historiaLisays : [];
    if (rivit.length && deps && typeof deps.arrayUnion === 'function') upd.jaksofokus_historia = deps.arrayUnion.apply(null, rivit);
    return upd;
  }

  var API = { IDS: IDS, tmJaksoNappi: tmJaksoNappi, tmAloitaJaksoTiedot: tmAloitaJaksoTiedot, tmAloitaJaksoModalHTML: tmAloitaJaksoModalHTML, tmAloitaJaksoSyote: tmAloitaJaksoSyote, tmAloitaJaksoKirjoitus: tmAloitaJaksoKirjoitus };
  if (typeof module !== 'undefined' && module.exports) module.exports = API; else root.TM_ALOITA_JAKSO = API;
})(typeof window !== 'undefined' ? window : this);
