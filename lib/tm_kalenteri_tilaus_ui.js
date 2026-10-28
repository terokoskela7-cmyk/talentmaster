/* ════════════════════════════════════════════════════════════════════════
   tm_kalenteri_tilaus_ui.js — K35-7b · "Lisää kalenteriini" (iCal-tilaus): painike + modaali + ohjain. Backend: luoKalenteriTilaus · peruKalenteriTilaus · haeKalenteriTilausTila (functions/kalenteri_ical.js).
   KUORIIN VAIN KYTKENTÄ: tmTilausAsenna(opts) → { avaa() }; tmTilausPainikeHTML(C) → painike (onclick = C.onclick). Tekstit C.t():n kautta (avain = fi-teksti).
   opts: { kutsu(nimi, data) → Promise<{data}> (httpsCallable), args() → { seuraId, pelaajaId? }, t, kopioi?(teksti) → Promise, avaaUrl?(url), esto?() → { syy:'sahkoposti'|'suostumus', toiminto?: 'funktion nimi window:ssa' } | null, doc?, toast?(teksti) }
   Linkki näytetään KERRAN luonnin jälkeen (URL ei ole tallessa selväkielisenä; tila = { aktiivinen, luotu } ilman tokenia). Painikkeet (K35-11): Apple (webcal://) · Outlook (addfromweb, + Outlook.com-linkki) · Google (render?cid=webcal) · Kopioi linkki; "Luo uusi linkki" mitätöi vanhan; "Poista linkki" = peruKalenteriTilaus.
   Huoltaja ilman vahvistettua sähköpostia / suostumusta: painike näkyy, modaalissa selkeä syy (+ vahvistuslinkin pyyntö) — ei kaatumista. Päivitysviive kerrotaan rehellisesti (muutama tunti; Google jopa vuorokausi).
   Ei hex-värejä (tokenit fallback-ketjulla), ei emojeja. Dual-export: module.exports || window.TM_KALENTERI_TILAUS_UI.
════════════════════════════════════════════════════════════════════════ */
(function (root) {
  'use strict';
  function _e(s) { return String(s == null ? '' : s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;'); }
  var CSS = '.tl-tausta{position:fixed;inset:0;background:rgba(0,0,0,.55);display:flex;align-items:center;justify-content:center;z-index:2000;padding:16px}.tl-ikkuna{background:var(--bg2,var(--surface,var(--card)));color:var(--ink,var(--text));border:1px solid var(--border,rgba(128,128,128,.3));border-radius:14px;max-width:460px;width:100%;max-height:92vh;overflow:auto;padding:18px 20px;display:grid;gap:12px;font-family:\'DM Sans\',system-ui,sans-serif}'
    + '.tl-otsikko{font-family:\'Cormorant Garamond\',serif;font-size:24px;line-height:1.15}.tl-teksti{font-size:14px;line-height:1.5;color:var(--ink2,var(--slate))}.tl-pieni{font-size:12.5px;line-height:1.5;color:var(--ink2,var(--slate))}.tl-rivi{display:flex;flex-wrap:wrap;gap:8px}'
    + '.tl-nappi{border:1px solid var(--teal);background:transparent;color:var(--teal-d,var(--teal));border-radius:8px;padding:9px 14px;font-size:14px;cursor:pointer}.tl-nappi.p{background:var(--teal);color:var(--on-accent,var(--bg))}.tl-nappi.h{border-color:var(--border,rgba(128,128,128,.4));color:var(--ink2,var(--slate))}'
    + '.tl-linkki{width:100%;box-sizing:border-box;padding:9px 10px;border:1px solid var(--border,rgba(128,128,128,.4));border-radius:8px;background:transparent;color:inherit;font-size:12.5px;font-family:\'DM Mono\',monospace}'
    + ''
    + '.tl-varoitus{font-size:13px;line-height:1.5;color:var(--amber,var(--ink2))}.tl-linkkinappi{border:0;background:none;padding:0;color:var(--teal-d,var(--teal));font-size:12.5px;text-decoration:underline;cursor:pointer}.tl-painike{border:1px solid var(--teal);background:transparent;color:var(--teal-d,var(--teal));border-radius:8px;padding:7px 12px;font-size:13px;cursor:pointer}';
  function _pvmKk(iso) { var m = /^(\d{4})-(\d{2})-(\d{2})/.exec(String(iso || '')); return m ? (+m[3]) + '.' + (+m[2]) + '.' : ''; }
  function tmTilausUrlit(s) {   // s: { url (https), webcal? } → { apple, outlook, outlook_live, google }
    var https = String(s.url || ''), webcal = s.webcal || https.replace(/^https?:/, 'webcal:'), q = encodeURIComponent(https), n = encodeURIComponent('TalentMaster');
    return { apple: webcal, outlook: 'https://outlook.office.com/calendar/0/addfromweb?url=' + q + '&name=' + n, outlook_live: 'https://outlook.live.com/calendar/0/addfromweb?url=' + q + '&name=' + n, google: 'https://calendar.google.com/calendar/render?cid=' + encodeURIComponent(webcal) };
  }
  /* K35-11b: kuka EI voi luoda linkkiä → { syy } (nappi piilotetaan Masterissa; modaali kertoo syyn). Backend vaatii claim seuraId = kohdeseura → Super Admin (ei seuraId-claimia) ja toisen seuran käyttäjä saisivat vain "ei oikeutta". */
  function tmTilausEste(c) { c = c || {}; if (c.sa) return { syy: 'sa' }; if (!c.seuraId) return { syy: 'ei_seuraa' }; if (c.claimSeuraId && String(c.claimSeuraId) !== String(c.seuraId)) return { syy: 'toinen_seura' }; return null; }
  var ESTO_TEKSTI = { sahkoposti: 'Sähköpostiosoitettasi ei ole vielä vahvistettu. Vahvista osoite, niin voit tilata kalenterin.', suostumus: 'Kalenteritilaus vaatii, että suostumus on annettu seuran palvelussa.',
    sa: 'Kalenterilinkin voi luoda vain seuran oma käyttäjä. Super Admin ei voi tilata seuran kalenteria — kirjaudu seuran tunnuksella.', toinen_seura: 'Tämä kalenteri kuuluu toiselle seuralle. Linkin voi luoda vain oman seuran käyttäjä.', ei_seuraa: 'Kalenteri ei ole käytettävissä ilman seuraa (esim. demo).' };
  var VIRHE_TEKSTI = { oikeus: 'Tähän kalenteriin ei ole oikeutta tällä tunnuksella. Linkin voi luoda vain seuran oma käyttäjä (ei Super Admin) tai pelaajan huoltaja.', kirjautuminen: 'Kirjautuminen on vanhentunut. Kirjaudu uudelleen ja yritä uudestaan.',
    verkko: 'Yhteys palvelimeen katkesi. Tarkista verkkoyhteys ja yritä uudelleen.', argumentti: 'Seuran tietoja ei löytynyt. Lataa sivu uudelleen ja yritä uudestaan.', yleinen: 'Linkin hallinta ei onnistunut. Yritä hetken kuluttua uudelleen.' };
  function tmTilausVirheTyyppi(e) { var c = String(e && e.code || '').replace(/^functions\//, ''); if (/permission-denied/.test(c)) return 'oikeus'; if (/unauthenticated/.test(c)) return 'kirjautuminen'; if (/unavailable|deadline-exceeded|network/.test(c)) return 'verkko'; if (/invalid-argument|failed-precondition|not-found/.test(c)) return 'argumentti'; return 'yleinen'; }
  function tmTilausPainikeHTML(C) { return '<button type="button" class="tl-painike" onclick="' + _e(C.onclick) + '">' + _e(C.t('Lisää kalenteriini')) + '</button>'; }
  function tmTilausModaaliHTML(s, C) {   // s: { vaihe: 'lataa'|'esto'|'ei'|'on'|'uusi'|'virhe', esto?, luotu?, url?, webcal?, valilehti?, kopioitu?, virhe? }
    var t = C.t, h = '<div class="tl-otsikko">' + _e(t('Lisää kalenteriini')) + '</div>', rivi = function (x) { return '<div class="tl-rivi">' + x + '</div>'; };
    var nappi = function (teksti, toiminto, luokka) { return '<button type="button" class="tl-nappi ' + (luokka || '') + '" data-tl="' + toiminto + '">' + _e(t(teksti)) + '</button>'; };
    if (s.vaihe === 'lataa') return h + '<div class="tl-teksti">' + _e(t('Ladataan…')) + '</div>';
    if (s.vaihe === 'esto') return h + '<div class="tl-varoitus">' + _e(t(ESTO_TEKSTI[s.esto && s.esto.syy] || ESTO_TEKSTI.suostumus)) + '</div>'
      + (s.esto && s.esto.toiminto ? rivi(nappi('Lähetä vahvistuslinkki', 'vahvista', 'p')) : '') + rivi(nappi('Sulje', 'sulje', 'h'));
    if (s.vaihe === 'virhe') return h + '<div class="tl-varoitus">' + _e(t(VIRHE_TEKSTI[s.virhe] || VIRHE_TEKSTI.yleinen)) + '</div>' + rivi(nappi('Sulje', 'sulje', 'h'));
    if (s.vaihe === 'uusi') {   // K35-11 #7: kolme palvelukohtaista nappia (Apple webcal · Outlook addfromweb · Google render?cid) + Kopioi linkki
      var U = tmTilausUrlit(s);
      return h + '<div class="tl-teksti">' + _e(t('Linkki on henkilökohtainen. Älä jaa sitä. Näet sen vain nyt — lisää se kalenteriisi alta tai kopioi se talteen.')) + '</div>'
        + '<input class="tl-linkki" readonly value="' + _e(s.url) + '" onclick="this.select()" aria-label="' + _e(t('Kalenterilinkki')) + '">'
        + rivi(nappi('Apple (iPhone/Mac)', 'apple', 'p') + nappi('Outlook', 'outlook', 'p') + nappi('Google', 'google', 'p'))
        + '<div class="tl-pieni"><button type="button" class="tl-linkkinappi" data-tl="outlook_live">' + _e(t('henkilökohtainen Outlook.com')) + '</button></div>'
        + rivi(nappi(s.kopioitu ? 'Kopioitu' : 'Kopioi linkki', 'kopioi'))
        + '<div class="tl-pieni">' + _e(t('Päivitysväli: Apple noin 1 tunti, Outlook noin 3 tuntia, Google jopa vuorokausi.')) + '</div>' + rivi(nappi('Valmis', 'sulje', 'h'));
    }
    var aktiivinen = s.vaihe === 'on';
    return h + '<div class="tl-teksti">' + _e(t(aktiivinen ? 'Linkki on jo luotu' : 'Tilaa seuran aikataulu omaan kalenterisovellukseesi (Apple, Google, Outlook). Muutokset päivittyvät sinne automaattisesti.')) + (aktiivinen && s.luotu ? ' ' + _e(t('Linkki luotu')) + ' ' + _e(_pvmKk(s.luotu)) : '') + (aktiivinen ? '.' : '') + '</div>'
      + (aktiivinen ? '<div class="tl-pieni">' + _e(t('Linkkiä ei näytetä uudelleen. Luo uusi linkki, jos haluat lisätä kalenterin toiseen laitteeseen — vanha linkki lakkaa toimimasta.')) + '</div>' : '')
      + rivi((aktiivinen ? nappi('Luo uusi linkki', 'luo', 'p') + nappi('Poista linkki', 'poista') : nappi('Luo linkki', 'luo', 'p')) + nappi('Sulje', 'sulje', 'h'))
      + '<div class="tl-pieni">' + _e(t('Päivittyy kalenteriisi muutaman tunnin välein (Google voi viivästyä jopa vuorokauden).')) + '</div>';
  }
  function tmTilausAsenna(o) {
    var C = { t: o.t || function (x) { return x; } }, doc = o.doc || (typeof document !== 'undefined' ? document : null), tila = { vaihe: 'lataa' }, tausta = null;
    function piirra() { if (!tausta) return; tausta.querySelector('.tl-ikkuna').innerHTML = tmTilausModaaliHTML(tila, C); }
    function sulje() { if (tausta && tausta.parentNode) tausta.parentNode.removeChild(tausta); tausta = null; tila = { vaihe: 'lataa' }; }
    function virhe(e) { tila = { vaihe: 'virhe', virhe: tmTilausVirheTyyppi(e) }; piirra(); }
    function kutsu(nimi) { return o.kutsu(nimi, o.args()); }
    function toimi(k) {
      if (k === 'sulje') return sulje();
      if (k === 'vahvista') { var f = o.esto && o.esto() && o.esto().toiminto; if (f && typeof root[f] === 'function') root[f](); return; }
      if (k === 'luo') return kutsu('luoKalenteriTilaus').then(function (r) { var d = (r && r.data) || {}; tila = { vaihe: 'uusi', url: d.url, webcal: d.webcal, valilehti: 'iphone' }; piirra(); }, virhe);
      if (k === 'poista') return kutsu('peruKalenteriTilaus').then(function () { tila = { vaihe: 'ei' }; piirra(); if (o.toast) o.toast(C.t('Linkki poistettu')); }, virhe);
      if (k === 'apple' || k === 'outlook' || k === 'outlook_live' || k === 'google') { var u = tmTilausUrlit(tila)[k]; if (o.avaaUrl) o.avaaUrl(u); else if (k === 'apple' && typeof root.location !== 'undefined') root.location.href = u; else if (typeof root.open === 'function') root.open(u, '_blank', 'noopener'); return; }
      if (k === 'kopioi') { var kop = o.kopioi ? o.kopioi(tila.url) : (root.navigator && root.navigator.clipboard ? root.navigator.clipboard.writeText(tila.url) : Promise.reject()); return Promise.resolve(kop).then(function () { tila.kopioitu = true; piirra(); }, function () { var i = tausta && tausta.querySelector('.tl-linkki'); if (i) i.select(); }); }
    }
    function avaa() {
      if (!doc || tausta) return;
      if (!doc.getElementById('tlCss')) { var st = doc.createElement('style'); st.id = 'tlCss'; st.textContent = CSS; doc.head.appendChild(st); }
      tausta = doc.createElement('div'); tausta.className = 'tl-tausta'; tausta.setAttribute('role', 'dialog'); tausta.setAttribute('aria-modal', 'true'); tausta.innerHTML = '<div class="tl-ikkuna"></div>';
      tausta.addEventListener('click', function (ev) { if (ev.target === tausta) return sulje(); var b = ev.target.closest && ev.target.closest('[data-tl]'); if (b) toimi(b.getAttribute('data-tl')); });
      doc.body.appendChild(tausta); tila = { vaihe: 'lataa' }; piirra();
      var esto = o.esto && o.esto(); if (esto) { tila = { vaihe: 'esto', esto: esto }; piirra(); return; }
      kutsu('haeKalenteriTilausTila').then(function (r) { var d = (r && r.data) || {}; tila = { vaihe: d.aktiivinen ? 'on' : 'ei', luotu: d.luotu }; piirra(); }, virhe);
    }
    return { avaa: avaa, sulje: sulje, tila: function () { return tila; } };
  }
  // sv-aukot P7 (28.10.2026): kaikki C.t()-tekstit (avain = fi-teksti) yhtenä FI-karttana → jaettu libikartta (lib/tm_lib_i18n.js) voi kääntää ne Pelaajassa/Vanhemmassa (_p7K1T/_vKpT). Vartija: tests/sv_aukot_p7.test.js.
  var FI = {}; ['Lisää kalenteriini', 'Ladataan…', 'Lähetä vahvistuslinkki', 'Sulje', 'Linkki on henkilökohtainen. Älä jaa sitä. Näet sen vain nyt — lisää se kalenteriisi alta tai kopioi se talteen.', 'Kalenterilinkki', 'henkilökohtainen Outlook.com', 'Päivitysväli: Apple noin 1 tunti, Outlook noin 3 tuntia, Google jopa vuorokausi.', 'Valmis', 'Linkki luotu', 'Linkkiä ei näytetä uudelleen. Luo uusi linkki, jos haluat lisätä kalenterin toiseen laitteeseen — vanha linkki lakkaa toimimasta.', 'Luo uusi linkki', 'Poista linkki', 'Luo linkki', 'Päivittyy kalenteriisi muutaman tunnin välein (Google voi viivästyä jopa vuorokauden).', 'Linkki poistettu', 'Kopioitu', 'Kopioi linkki', 'Linkki on jo luotu', 'Tilaa seuran aikataulu omaan kalenterisovellukseesi (Apple, Google, Outlook). Muutokset päivittyvät sinne automaattisesti.'].concat(Object.keys(ESTO_TEKSTI).map(function (k) { return ESTO_TEKSTI[k]; }), Object.keys(VIRHE_TEKSTI).map(function (k) { return VIRHE_TEKSTI[k]; })).forEach(function (x) { FI[x] = x; });
  var API = { FI: FI, tmTilausPainikeHTML: tmTilausPainikeHTML, tmTilausEste: tmTilausEste, tmTilausVirheTyyppi: tmTilausVirheTyyppi, ESTO_TEKSTI: ESTO_TEKSTI, VIRHE_TEKSTI: VIRHE_TEKSTI, tmTilausModaaliHTML: tmTilausModaaliHTML, tmTilausUrlit: tmTilausUrlit, tmTilausAsenna: tmTilausAsenna, tmTilausCSS: function () { return CSS; } };
  if (typeof module !== 'undefined' && module.exports) module.exports = API; else if (root) root.TM_KALENTERI_TILAUS_UI = API;
})(typeof window !== 'undefined' ? window : null);
