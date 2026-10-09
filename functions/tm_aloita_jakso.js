/* ════════════════════════════════════════════════════════════════════════
   tm_aloita_jakso.js — "Aloita jakso" -MODAALI jaettuna Masterin ja VP:n kesken (PURE; ei Firebasea, ei DOM-kirjoitusta; adapteri hoitaa DOM:n ja kirjoituksen). 6.10.2026.
   Sama lomake molemmissa: taito · ydinvahvuus · tukiosa {alue, perustelu} · kesto ikävaiheen mukaan (D7) · vastuuhenkilö. Päätös ja validointi: lib/tm_jakso_malli.js (tmAloitaJakso).
   · tmAloitaJaksoTiedot(p, ctx)                → lomakkeen alkuarvot pelaajasta (taidot, esitäyttö valinnasta/jaksosta, kesto, vastuuhenkilö-vaihtoehdot, tila: aloita | vahvista | muokkaa)
   · tmAloitaJaksoModalHTML(tiedot, opts)       → modaalin HTML. opts: { esc, t, overlayAttrs (sovelluksen oma scrim-tyyli/luokka), tallennaFn, suljeFn, modalId }
   · tmAloitaJaksoSyote(arvo)                   → syöte tmAloitaJakso:lle luettuna lomakkeen kentistä (arvo(id) → merkkijono)
   · tmAloitaJaksoKirjoitus(v, tulos, vh, deps) → YKSI atominen update-olio { jaksofokus, ydinvahvuus, [vastuuhenkilo], [jaksofokus_historia] }; deps.arrayUnion injektoidaan (ei Firebase-riippuvuutta)
   · tmJaksoNappi(p)                            → 'aloita' | 'vahvista' | 'muokkaa' (nappitekstin avain: ei jaksoa → Aloita jakso · on jakso → Muokkaa jaksoa · pelaajan valinta odottaa → Vahvista jakso)
   V1 (liput.kentta, docs/CODE_BRIEF_V1_JAKSON_ALOITUS.md): "Tukiosan alue + perustelu" → osio "Tukitavoite" (D19 portaittain). VAIN kun ctx.tuki annetaan; ilman sitä lomake on täsmälleen ennallaan (snapshot-testi).
   · tmAloitaJaksoTuki(p, c)                    → tukiosion tiedot: maksimi (D18), kortit (ehdotus tmTukitavoiteEhdotukset:sta + nykyiset), kotiharjoitevalinnat kortin alta (#823-snapshot), oletuspäivät joukkuejaksosta (D21)
   · tmAloitaJaksoSyoteV2(arvo, x)              → syöte myös tukiosiosta (arvo(id): valintaruutu '1'/'' , muut merkkijono)
   · tmAloitaJaksoV2(p, syote, x, opts)         → { jaksofokus (+tukitavoitteet, yhteensopiva tukiosa, joukkuejakso_viite), ydinvahvuus, vihje } — adapteri kirjoittaa kuten ennen (tmAloitaJaksoKirjoitus, YKSI update)
   · tmAjTukiValitse(el, max) / tmAjOmaAlue(sel) → pienet DOM-apurit modaalin inline-käsittelijöille (enimmäismäärä, kotiharjoitepaneelien näkyvyys)
   Vain tokenit/CSS-muuttujat (ei hex-värejä); kaikki teksti opts.t:n läpi; kaikki arvot escapataan. Dual-export: module.exports || window.TM_ALOITA_JAKSO.
════════════════════════════════════════════════════════════════════════ */
(function (root) {
  'use strict';
  var IDS = { taito: '_ajTaito', yv: '_ajYv', alue: '_ajAlue', per: '_ajPer', kesto: '_ajKesto', vh: '_ajVh' };
  function _esc(s) { return String(s == null ? '' : s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;'); }
  function _t(o) { return (o && typeof o.t === 'function') ? o.t : function (k) { return k; }; }
  function _req(g, f) { try { return (typeof module !== 'undefined' && module.exports && typeof require === 'function') ? require(f) : (root && root[g]); } catch (e) { return root && root[g]; } }
  function _jm(ctx) { return (ctx && ctx.malli) || (root && root.TM_JAKSO_MALLI) || (typeof require === 'function' ? require('./tm_jakso_malli.js') : null); }

  function tmJaksoNappi(p) {
    var jf = p && p.jaksofokus;
    if (jf && jf.tila === 'valittavana' && p.ydinvahvuus_valinta) return 'vahvista';
    return (jf && (jf.konsepti_avain || jf.konsepti_nimi)) ? 'muokkaa' : 'aloita';
  }

  /* ── V4a (D47): JAKSON TILAKONE YHDESTÄ FUNKTIOSTA. tmJaksoTila(p, ctx) → { tila, ensisijainen, valikko[], rivitila }. Otsikkorivi, ⋯-valikko ja J4-listan rivitila lukevat TÄMÄN → lista ja työpöytä eivät voi olla eri mieltä.
     TILAT JOHDETAAN, niitä ei tallenneta (uusia jaksofokus.tila-arvoja ei tule): 'valittavana' on ainoa tallennettu tila (K3).
       ei_jaksoa     — ei konseptia eikä tarjousta
       kaynnissa     — konsepti, ei umpeutunut, ei tilaa; sitoumus annettu (tai jakso ei ensimmäisellä viikolla)
       vahvistettu   — kuten käynnissä, mutta pelaajan sitoumus (idp_sitoumus_pvm) puuttuu tältä jaksolta (P6)
       paattynyt     — konsepti ja alkoi + kesto_vk × 7 pv < nyt (suljettava)
       valittavana   — tila 'valittavana', pelaaja ei ole valinnut → odottaa pelaajaa
       valinta_tehty — tila 'valittavana' + ydinvahvuus_valinta → "Vahvista jakso" (valikko: Hylkää valinta, V4b-2)
     ensisijainen: { avain, teksti } | null · valikko: [{ avain, teksti, kaytettavissa }] · rivitila: { teksti, savy:'neutraali'|'ok'|'amber', vk?:{n,yht} }. teksti = fi-avain (kutsuja kääntää t():llä).
     "Anna pelaajan valita" vain kun ase on olemassa (ase = p.ydinvahvuus.kuvaus; kenttänimessä "ase" kielletty). 'hylkaa' ja 'syvenna' ovat käytettävissä (V4b-2).
     tmJaksoNappi / tmJaksoNapitTila (#868) ennallaan (lippu pois → vanhat näkymät ennallaan). */
  var DAY_MS = 86400000;
  function _SIT() { return _req('TM_SITOUMUS', './tm_sitoumus.js'); }
  function _RV() { return _req('TM_REITIN_VALINTA', './tm_reitin_valinta.js'); }
  function _ms(iso) { var t = iso ? new Date(iso).getTime() : NaN; return t; }
  function _valintaTehty(p) { var v = p && p.ydinvahvuus_valinta; return !!(v && typeof v.vaihtoehto === 'string' && v.vaihtoehto.trim()); }   // V4b-2: "Hylkää valinta" poistaa ydinvahvuus_valinta:n → ei erillistä "voimassa"-päättelyä
  function _asetettu(p) { return !!(p && p.ydinvahvuus && typeof p.ydinvahvuus.kuvaus === 'string' && p.ydinvahvuus.kuvaus.trim()); }
  function tmJaksoTila(p, ctx) {
    ctx = ctx || {}; var nyt = ctx.nyt instanceof Date ? ctx.nyt.getTime() : (typeof ctx.nyt === 'number' ? ctx.nyt : Date.now());
    var jf = p && p.jaksofokus, ase = _asetettu(p), onKonsepti = !!(jf && (jf.konsepti_avain || jf.konsepti_nimi));
    var valita = { avain: 'anna_valita', teksti: 'Anna pelaajan valita seuraava reitti', kaytettavissa: ase };
    var valittavana = !!(jf && jf.tila === 'valittavana');
    if (valittavana) {
      var RV = _RV(), r = RV && RV.tmHenkRivitila ? RV.tmHenkRivitila(p) : null;   // K3: A/B-kirjain + nimi
      var tehty = _valintaTehty(p);
      if (tehty) return { tila: 'valinta_tehty', ensisijainen: { avain: 'vahvista', teksti: 'Vahvista jakso' },
        valikko: [{ avain: 'hylkaa', teksti: 'Hylkää valinta', kaytettavissa: true }],
        rivitila: Object.assign({ teksti: r && r.tila === 'valittu' ? (r.oma ? 'Pelaaja ehdotti omaa' : 'Pelaaja valitsi ' + r.kirjain) : 'Pelaaja valitsi — vahvista', savy: 'ok', r: r || null },
          r && r.tila === 'valittu' && !r.oma ? { muoto: 'Pelaaja valitsi {kirjain}', arvot: { kirjain: r.kirjain } } : {}) };
      return { tila: 'valittavana', ensisijainen: null, valikko: [{ avain: 'aloita', teksti: 'Peru valinta ja aloita jakso itse', kaytettavissa: true }], rivitila: { teksti: 'Valinta odottaa', savy: 'neutraali' } };
    }
    if (!onKonsepti) return { tila: 'ei_jaksoa', ensisijainen: { avain: 'aloita', teksti: 'Aloita jakso' }, valikko: [valita], rivitila: { teksti: 'Ei jaksoa', savy: 'neutraali' } };
    var alku = _ms(jf.alkoi), yht = Number(jf.kesto_vk) > 0 ? Number(jf.kesto_vk) : 4, loppu = isNaN(alku) ? NaN : alku + yht * 7 * DAY_MS;
    if (!isNaN(loppu) && loppu < nyt) return { tila: 'paattynyt', ensisijainen: { avain: 'sulje', teksti: 'Sulje jakso' },
      valikko: [{ avain: 'jatka', teksti: 'Jatka jaksoa 2 vk', kaytettavissa: true }, { avain: 'syvenna', teksti: 'Syvennä (täysi katselmus)', kaytettavissa: true }],
      rivitila: { teksti: 'Jakso päättynyt — suljettava', savy: 'amber' } };
    var vk = isNaN(alku) ? null : { n: Math.min(Math.max(1, Math.floor((nyt - alku) / (7 * DAY_MS)) + 1), yht), yht: yht };
    var SIT = _SIT(), sitoutunut = SIT ? SIT.tmSitoumus(p).sitoutunut : false;   // A1/D97: YKSI sääntö (lib/tm_sitoumus.js) — sitoumus annettu tämän jakson aikana
    var menu = [{ avain: 'sulje', teksti: 'Sulje jakso', kaytettavissa: true }, { avain: 'muokkaa', teksti: 'Muokkaa jaksoa', kaytettavissa: true }, { avain: 'klippi', teksti: 'Lisää klippi', kaytettavissa: true }, valita];
    var base = { ensisijainen: { avain: 'havainto', teksti: 'Merkitse havainto' }, valikko: menu };
    if (vk && vk.n === 1 && !sitoutunut) return Object.assign({ tila: 'vahvistettu' }, base, { rivitila: { teksti: 'Jakso käynnissä · vk 1 · sitoumus odottaa', savy: 'ok', vk: vk } });
    return Object.assign({ tila: 'kaynnissa' }, base, { rivitila: Object.assign({ teksti: 'Jakso käynnissä' + (vk ? ' · vk ' + vk.n + '/' + vk.yht : ''), savy: 'ok', vk: vk },
      vk ? { muoto: 'Jakso käynnissä · vk {n}/{yht}', arvot: { n: vk.n, yht: vk.yht } } : {}) });
  }

  /* Pelaajakortin otsikkoalueen jaksonapit (Kenttä-lipun takana; kutsuja tarkistaa lipun + muokkausoikeuden): YKSI nappi tmJaksoNappi(p):n mukaan + "Sulje jakso" kun jakso on käynnissä.
     Samat toiminnot kuin ennen (avaaFn = aloitusmodaali, suljeFn = sulkulomake) — ei uutta logiikkaa. 'Käynnissä' = jaksolla on konsepti eikä se ole K3:n tarjous/valinta-tilassa ('valittavana'). */
  function tmJaksoNapitTila(p) {
    var jf = p && p.jaksofokus, kaynnissa = !!(jf && (jf.konsepti_avain || jf.konsepti_nimi) && jf.tila !== 'valittavana');
    return { nappi: tmJaksoNappi(p), sulje: kaynnissa };
  }
  function tmJaksoNapitHTML(p, opts) {
    opts = opts || {}; if (!p || !p.id) return ''; var esc = opts.esc || _esc, t = _t(opts), x = tmJaksoNapitTila(p), pid = esc(p.id);
    var nimet = { aloita: 'Aloita jakso', muokkaa: 'Muokkaa jaksoa', vahvista: 'Vahvista jakso' };
    var b = function (attr, fn, teksti, ensisijainen) { return '<button type="button" ' + attr + ' onclick="event.stopPropagation();' + esc(fn) + '(\'' + pid + '\')" style="font-size:12px;font-weight:600;border-radius:8px;padding:7px 12px;cursor:pointer;border:.5px solid var(--teal);'
      + (ensisijainen ? 'background:var(--teal);color:var(--on-accent,var(--bg))' : 'background:transparent;color:var(--teal)') + '">' + esc(t(teksti)) + '</button>'; };
    return '<div class="tm-jakso-napit" style="display:flex;gap:8px;flex-wrap:wrap;align-items:center">' + b('data-jakso-nappi="' + x.nappi + '"', opts.avaaFn, nimet[x.nappi], x.nappi !== 'muokkaa')
      + (x.sulje ? b('data-jakso-sulje', opts.suljeFn, 'Sulje jakso', false) : '') + '</div>';
  }

  /* ctx: { items:[{avain,nimi,koodi?}], ehdotusAvain?, ika (vuosina), nimi (pelaajan näyttönimi), vastuuhenkilot:[{arvo,nimi,rooli}] | null, malli? } */
  function tmAloitaJaksoTiedot(p, ctx) {
    ctx = ctx || {}; p = p || {}; var JM = _jm(ctx), jf = p.jaksofokus || {}, tuki = jf.tukiosa || {}, kesto = JM.tmJaksonKesto(ctx.ika);
    var items = Array.isArray(ctx.items) ? ctx.items : [];
    // K3: pelaajalle tarjottu valinta (jaksofokus {tila:'valittavana', vaihtoehdot}) → pelaajan valitsema konsepti esitäytetään taidoksi; oma ehdotus näytetään tekstinä (ei taitoa).
    var k3 = (jf.tila === 'valittavana' && Array.isArray(jf.vaihtoehdot) && jf.vaihtoehdot.length) ? jf.vaihtoehdot : null;
    var valintaTeksti = p.ydinvahvuus_valinta && p.ydinvahvuus_valinta.vaihtoehto ? String(p.ydinvahvuus_valinta.vaihtoehto) : '';
    var k3v = k3 && valintaTeksti ? k3.filter(function (v) { return v && v.konsepti_avain === valintaTeksti; })[0] || null : null;
    var valittuAvain = ctx.esivalintaAvain || (k3v && k3v.konsepti_avain) || jf.konsepti_avain || ctx.ehdotusAvain || (items[0] && items[0].avain) || '';
    var valinta = k3v ? String(k3v.nimi || k3v.konsepti_avain) : valintaTeksti;
    var yv = (p.ydinvahvuus && p.ydinvahvuus.kuvaus) || (k3 ? '' : valinta) || (k3 && !k3v ? valintaTeksti : '');   // K3: konseptin nimi ei ole ydinvahvuuden kuvaus
    var keston = (jf.kesto_vk != null && kesto.vaihtoehdot.indexOf(Number(jf.kesto_vk)) >= 0) ? Number(jf.kesto_vk) : kesto.oletus;
    var x = { pid: p.id, nimi: ctx.nimi || '', tila: tmJaksoNappi(p), items: items, valittuAvain: valittuAvain, valinta: valinta, yv: yv, alue: tuki.alue || '', perustelu: tuki.perustelu || '',
      valintaOtsikko: k3 ? (k3v ? 'Pelaaja valitsi seuraavan reitin' : 'Pelaajan oma ehdotus') : 'Pelaaja valitsi ydinvahvuutensa', kesto: { vaihtoehdot: kesto.vaihtoehdot, valittu: keston, profiili: kesto.profiili }, vastuuhenkilot: ctx.vastuuhenkilot || null, vastuuNyt: p.vastuuhenkilo ? p.vastuuhenkilo.uid + '|' + p.vastuuhenkilo.rooli : '' };
    if (ctx.tuki) {   // V1: tukitavoiteosio; oletuspäivät (D21) esitäyttävät alun ja keston vain uudelle jaksolle
      x.tuki = ctx.tuki; x.alku = ctx.tuki.alku || null;
      if (!(jf.konsepti_avain || jf.konsepti_nimi) && ctx.tuki.kesto != null && kesto.vaihtoehdot.indexOf(Number(ctx.tuki.kesto)) >= 0) x.kesto.valittu = Number(ctx.tuki.kesto);
    }
    return x;
  }

  function tmAloitaJaksoModalHTML(x, opts) {
    opts = opts || {}; var esc = opts.esc || _esc, t = _t(opts), id = opts.modalId || '_ajModal';
    var kentta = 'width:100%;font-size:13px;margin:4px 0 10px;padding:7px 9px;border-radius:8px;border:.5px solid var(--border);background:var(--card);color:var(--ink)' + (x.tuki ? ';box-sizing:border-box' : '');   // V1: ei vaakavuotoa 390 px:llä (vanha lomake ennallaan)
    var lab = function (k) { return '<label style="font-size:11px;color:var(--ink3);letter-spacing:.04em">' + esc(t(k)) + '</label>'; };
    var otsikko = x.tila === 'muokkaa' ? 'Muokkaa jaksoa' : (x.tila === 'vahvista' ? 'Vahvista jakso' : 'Aloita jakso');
    var h = '<div id="' + esc(id) + '" role="dialog" aria-modal="true" ' + (opts.overlayAttrs || '') + ' onclick="if(event.target===this)' + esc(opts.suljeFn || '') + '()">'
      + '<div style="background:var(--card);color:var(--ink);border:.5px solid var(--border);border-radius:14px;max-width:520px;width:100%;max-height:92vh;overflow:auto;padding:18px 20px">'
      + '<div style="font-size:16px;font-weight:600;margin-bottom:4px">' + esc(t(otsikko)) + (x.nimi ? ' · ' + esc(x.nimi) : '') + '</div>'
      + (x.valinta ? '<div style="font-size:12px;color:var(--ink3);margin-bottom:8px">' + esc(t(x.valintaOtsikko || 'Pelaaja valitsi ydinvahvuutensa')) + ': <b>' + esc(x.valinta) + '</b></div>' : '')
      + lab('Taito') + '<select id="' + IDS.taito + '" style="' + kentta + '">' + x.items.map(function (it) { return '<option value="' + esc(it.avain) + '"' + (it.avain === x.valittuAvain ? ' selected' : '') + '>' + esc(it.nimi || it.avain) + '</option>'; }).join('') + '</select>'
      + lab('Ydinvahvuus') + '<textarea id="' + IDS.yv + '" rows="2" maxlength="300" style="' + kentta + '">' + esc(x.yv) + '</textarea>'
      + (x.tuki ? _tukiOsioHTML(x.tuki, esc, t, lab, kentta) : lab('Tukiosan alue') + '<input id="' + IDS.alue + '" maxlength="60" value="' + esc(x.alue) + '" style="' + kentta + '">'
      + lab('Tukiosan perustelu (miksi tämä tukee ydinvahvuutta)') + '<textarea id="' + IDS.per + '" rows="3" maxlength="400" style="' + kentta + '">' + esc(x.perustelu) + '</textarea>')
      + (x.tuki ? lab('Alkaa') + '<input id="_ajAlku" type="date" value="' + esc(x.alku || '') + '" style="' + kentta + '">' + (x.tuki.alkuLahde === 'joukkuejakso' ? '<div style="font-size:10.5px;color:var(--ink3);margin:-6px 0 10px">' + esc(t('Joukkuejakson päivät — voit poiketa.')) + '</div>' : '') : '')
      + lab('Jakson kesto (viikkoa, ikävaiheen mukaan)') + '<select id="' + IDS.kesto + '" style="' + kentta + '">' + x.kesto.vaihtoehdot.map(function (v) { return '<option value="' + v + '"' + (v === x.kesto.valittu ? ' selected' : '') + '>' + v + '</option>'; }).join('') + '</select>'
      + (x.vastuuhenkilot ? lab('Vastuuhenkilö') + '<select id="' + IDS.vh + '" style="' + kentta + '"><option value="">' + esc(t('— ei muutosta —')) + '</option>' + x.vastuuhenkilot.map(function (v) { return '<option value="' + esc(v.arvo) + '"' + (v.arvo === x.vastuuNyt ? ' selected' : '') + '>' + esc((v.nimi || t('tuntematon')) + ' · ' + t(v.rooli)) + '</option>'; }).join('') + '</select>' : '')
      + '<div style="display:flex;gap:8px;justify-content:flex-end;margin-top:6px"><button type="button" onclick="' + esc(opts.suljeFn || '') + '()" style="font-size:12px;border-radius:8px;padding:8px 14px;cursor:pointer;border:.5px solid var(--border);background:transparent;color:var(--ink2)">' + esc(t('Peruuta')) + '</button>'
      + '<button type="button" data-aj-tallenna onclick="' + esc(opts.tallennaFn || '') + '(\'' + esc(x.pid) + '\')" style="font-size:12px;font-weight:600;border-radius:8px;padding:8px 14px;cursor:pointer;border:.5px solid var(--teal);background:var(--teal);color:var(--bg)">' + esc(t(x.tila === 'muokkaa' ? 'Tallenna jakso' : 'Aloita jakso')) + '</button></div></div></div>';
    return h;
  }

  /* ═══ V1 · TUKITAVOITE-OSIO ═══════════════════════════════════════════════════════════════════════════════════════════════ */
  var TT_ALUEET = ['tekninen_taktinen', 'fyysinen', 'henkinen', 'sosiaalinen'];
  var TT_ALUE_NIMI = { tekninen_taktinen: 'Tekninen ja taktinen', fyysinen: 'Fyysinen', henkinen: 'Henkinen', sosiaalinen: 'Sosiaalinen' };
  var TT_MUUTA_MAX = 3;   // D19: "Muut vaihtoehdot" enintään 3
  function _TT(ctx) { return (ctx && ctx.tt) || (root && root.TM_TUKITAVOITTEET) || (typeof require === 'function' ? require('./tm_tukitavoitteet.js') : null); }
  function _pvmOk(v) { return typeof v === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(v); }
  function _lisaaPv(iso, n) { var o = iso.split('-'), d = new Date(Date.UTC(+o[0], +o[1] - 1, +o[2]) + n * 86400000); return d.getUTCFullYear() + '-' + String(d.getUTCMonth() + 1).padStart(2, '0') + '-' + String(d.getUTCDate()).padStart(2, '0'); }

  // Joukkuedokumentin tunniste = slug nimestä ('KPV U13' → kpv_u13); sama kuin Masterin _joukkueTunniste (kirjoitus JA luku).
  function tmAjJoukkueId(nimi) { return String(nimi == null ? '' : nimi).trim().toLowerCase().replace(/\s+/g, '_').replace(/[^a-z0-9_]/g, '') || null; }
  // c: { tt?, tanaan, ika, sp ('M'|'N'|'P'|'T'), haetut{ joukkue:{jid,data}|null, havainnot[], kehys (tmKehys(avain)), profiili, seuranPankki[], seuranOhjelmat[] }, tmPankki, seuraNimi, konteksti? (ohittaa/täydentää) }
  // Haetut tulevat adapterilta rinnakkain; puuttuva (null) lähde jää pois eikä kaada mitään.
  function tmAloitaJaksoTuki(p, c) {
    c = c || {}; p = p || {}; var TT = _TT(c), H = c.haetut || {}, jf = p.jaksofokus || {};
    var jjf = H.joukkue && H.joukkue.data && H.joukkue.data.jaksofokus;
    var K = Object.assign({ sp: c.sp, havainnot: Array.isArray(H.havainnot) ? H.havainnot : [] }, H.kehys ? { arviointikehys: H.kehys } : {}, H.profiili ? { seuraProfiili: H.profiili } : {},
      jjf && jjf.osa_alueet ? { joukkuejakso: { jid: H.joukkue.jid || null, alku: jjf.alku || null, osa_alueet: jjf.osa_alueet } } : {}, c.konteksti || {});
    var S = { seuranPankki: H.seuranPankki, seuranOhjelmat: H.seuranOhjelmat, tmPankki: c.tmPankki, seuraNimi: c.seuraNimi };
    c = Object.assign({}, c, { joukkue: H.joukkue || null });
    var maksimi = TT.tmTukitavoiteMaksimi(c.ika, K.seuraProfiili);
    var harj = function (tt) { try { return TT.tmTukitavoiteHarjoitteet(tt, p, { seuranPankki: S.seuranPankki, seuranOhjelmat: S.seuranOhjelmat, tmPankki: S.tmPankki, ika: c.ika, seuraNimi: S.seuraNimi }); } catch (e) { return []; } };   // yhden lähteen virhe ei kaada modaalia
    var kortit = [];
    if (maksimi > 0) {
      var nykyiset = []; try { nykyiset = (jf.konsepti_avain || jf.konsepti_nimi) ? TT.tmTukitavoitteet(jf) : []; } catch (e) { nykyiset = []; }
      nykyiset.slice(0, maksimi).forEach(function (n) {
        var vaiht = harj({ alue: n.alue }), valitut = {}, ids = {};
        (n.harjoitteet || []).forEach(function (h) { if (h && h.id != null) { valitut[h.id] = 1; } });
        vaiht.forEach(function (o) { ids[o.id] = 1; });
        var omat = (n.harjoitteet || []).filter(function (h) { return h && h.id != null; }).map(function (h) { return { id: String(h.id), nimi: h.nimi || h.liike || String(h.id), lahde: h.lahde === 'tm' ? 'tm' : 'seura', tyyppi: 'harjoite', selite: 'nykyinen', harjoitteet: [h], valittu: true }; });
        var kaikki = vaiht.map(function (o) { return Object.assign({}, o, { valittu: o.harjoitteet.every(function (h) { return valitut[h.id]; }) }); }).concat(omat.filter(function (o) { return !ids[o.id] && !vaiht.some(function (v) { return v.harjoitteet.some(function (h) { return h.id === o.id; }); }); }));
        kortit.push({ tyyppi: 'nykyinen', alue: n.alue || null, kuvaus: n.kuvaus || '', perustelu: n.perustelu || '', lahde: n.lahde || { tyyppi: 'suunnitelma' }, lyhyt: '', miksi: '', valittu: true, harjoitteet: kaikki });
      });
      var ehd = []; try { ehd = TT.tmTukitavoiteEhdotukset(p, Object.assign({ tanaan: c.tanaan, ika: c.ika }, K)) || []; } catch (e) { ehd = []; }   // lähteen virhe → ei ehdotuksia, oma kirjoitus toimii
      var tuttuja = {}; kortit.forEach(function (k) { tuttuja[String(k.alue) + '|' + String(k.kuvaus).toLowerCase()] = 1; });
      var uudet = ehd.filter(function (e) { return !tuttuja[e.alue + '|' + String(e.kuvaus).toLowerCase()]; }).slice(0, 1 + TT_MUUTA_MAX);
      uudet.forEach(function (e, i) {
        kortit.push({ tyyppi: 'ehdotus', alue: e.alue, kuvaus: e.kuvaus, perustelu: e.perustelu_ehdotus, lahde: e.lahde, lyhyt: e.lyhyt, miksi: e.miksi, asia: e.asia || null, kypsyyssuojattu: !!e.kypsyyssuojattu,
          valittu: !kortit.some(function (k) { return k.valittu; }) && i === 0, harjoitteet: harj({ alue: e.alue, asia: e.asia, fy_teema: e.fy_teema }).map(function (o) { return Object.assign({}, o, { valittu: false }); }) });
      });
    }
    var omaH = {}; TT_ALUEET.forEach(function (a) { omaH[a] = maksimi > 0 ? harj({ alue: a }).map(function (o) { return Object.assign({}, o, { valittu: false }); }) : []; });
    var jj = c.joukkue && c.joukkue.data && c.joukkue.data.jaksofokus, oa = jj && jj.osa_alueet, jjAlku = jj && _pvmOk(jj.alku) ? jj.alku : null, jjKesto = jj && Number(jj.kesto_vk) > 0 ? Number(jj.kesto_vk) : null;
    var aktiivinen = !!(oa && jjAlku && jjKesto && _lisaaPv(jjAlku, jjKesto * 7) > c.tanaan);   // D21: oletuspäivät vain käynnissä olevasta/tulevasta joukkuejaksosta
    return { nayta: maksimi > 0, maksimi: maksimi, kortit: kortit, muitaN: Math.max(0, kortit.length - 1), omaHarjoitteet: omaH, alku: aktiivinen ? jjAlku : c.tanaan, alkuLahde: aktiivinen ? 'joukkuejakso' : 'tanaan', kesto: aktiivinen ? jjKesto : null,
      viite: aktiivinen ? _viite(c.joukkue.jid || c.joukkue.data.id || null, c.joukkue.data, jjAlku) : null, tanaan: c.tanaan };
  }

  // K1 / A: pelaajan jaksoon joukkuejakson SNAPSHOT {jid, alku, kesto_vk, nimi, viikot:[{vk,tavoite}]} (pelaajan token ei lue joukkuedokumenttia). Ilman snapshot-libiä/nimeä → vanha {jid, alku} (ei viikkoriviä Tänään-sivulla).
  function _viite(jid, jDoc, alku) {
    var JJ = _req('TM_JOUKKUEJAKSO', './tm_joukkuejakso.js'), s = null;
    try { s = JJ && jid ? JJ.tmJoukkuejaksoSnapshot(jDoc, jid) : null; } catch (e) { s = null; }
    return s || { jid: jid, alku: alku };
  }

  function _harjHTML(lista, prefix, esc, t) {
    if (!lista || !lista.length) return '<div style="font-size:11.5px;color:var(--ink3)">' + esc(t('Ei kotiharjoitteita saatavilla tälle tavoitteelle.')) + '</div>';
    return lista.map(function (o, j) {
      return '<label style="display:flex;gap:8px;align-items:flex-start;font-size:12.5px;margin:4px 0"><input type="checkbox" id="' + prefix + '_' + j + '" data-aj-h' + (o.valittu ? ' checked' : '') + ' style="margin-top:2px"><span style="min-width:0;overflow-wrap:anywhere">' + esc(o.nimi)
        + ' <span style="color:var(--ink3);font-size:10.5px">· ' + esc(o.lahde === 'tm' ? 'TalentMaster' : t('Seuran harjoite')) + (o.tyyppi === 'ohjelma' ? ' · ' + esc(o.harjoitteet.length) + ' ' + esc(t('liikettä')) : '') + '</span></span></label>';
    }).join('');
  }
  function _korttiHTML(k, i, tuki, esc, t, kentta) {
    var alueTeksti = k.alue ? esc(t(TT_ALUE_NIMI[k.alue])) : '';
    var alueValinta = (!k.alue) ? '<select id="_ajTtNA_' + i + '" style="' + kentta + '"><option value="">' + esc(t('— valitse alue —')) + '</option>' + TT_ALUEET.map(function (a) { return '<option value="' + a + '">' + esc(t(TT_ALUE_NIMI[a])) + '</option>'; }).join('') + '</select>' : '';
    return '<div class="tm-aj-tt" data-aj-kortti="' + i + '" style="border:.5px solid var(--border);border-radius:10px;padding:10px 12px;margin:6px 0 10px">'
      + '<label style="display:flex;gap:8px;align-items:flex-start;cursor:pointer"><input type="checkbox" id="_ajTtV_' + i + '" data-aj-tv="' + i + '"' + (k.valittu ? ' checked' : '') + ' onchange="TM_ALOITA_JAKSO.tmAjTukiValitse(this,' + tuki.maksimi + ')" style="margin-top:3px"><span style="min-width:0">'
      + '<span style="font-size:10px;letter-spacing:.08em;text-transform:uppercase;color:var(--teal)">' + (k.tyyppi === 'nykyinen' ? esc(t('Nykyinen')) + (alueTeksti ? ' · ' : '') : '') + alueTeksti + '</span>'
      + '<span style="display:block;font-size:14px;color:var(--ink)">' + esc(k.kuvaus) + '</span>' + (k.lyhyt ? '<span style="display:block;font-size:11px;color:var(--ink3)">' + esc(t(k.lyhyt.split(' (')[0]) + (k.lyhyt.indexOf(' (') > 0 ? ' (' + k.lyhyt.split(' (').slice(1).join(' (') : '')) + '</span>' : '') + '</span></label>'
      + alueValinta
      + (k.miksi ? '<details style="margin:4px 0 0 24px"><summary style="font-size:11px;color:var(--ink3);cursor:pointer">' + esc(t('miksi?')) + '</summary><div style="font-size:11.5px;color:var(--ink2);margin-top:4px">' + esc(k.miksi) + '</div></details>' : '')
      + '<div style="margin:8px 0 0 24px"><label style="font-size:11px;color:var(--ink3);letter-spacing:.04em">' + esc(t('Perustelu (näkyy pelaajalle)')) + '</label><textarea id="_ajTtP_' + i + '" rows="2" maxlength="400" style="' + kentta + '">' + esc(k.perustelu) + '</textarea>'
      + '<div data-aj-koti="' + i + '" style="display:' + (k.valittu ? 'block' : 'none') + '"><div style="font-size:11px;color:var(--ink3);letter-spacing:.04em;margin-bottom:2px">' + esc(t('Kotiharjoitteet')) + '</div>' + _harjHTML(k.harjoitteet, '_ajTtH_' + i, esc, t) + '</div></div></div>';
  }
  function _omaHTML(tuki, esc, t, kentta) {
    var oletus = 'tekninen_taktinen';
    return '<div class="tm-aj-tt" data-aj-kortti="oma" style="border:.5px dashed var(--border);border-radius:10px;padding:10px 12px;margin:6px 0 10px">'
      + '<label style="display:flex;gap:8px;align-items:flex-start;cursor:pointer"><input type="checkbox" id="_ajTtV_oma" data-aj-tv="oma" onchange="TM_ALOITA_JAKSO.tmAjTukiValitse(this,' + tuki.maksimi + ')" style="margin-top:3px"><span style="font-size:14px;color:var(--ink)">' + esc(t('Kirjoita oma')) + '</span></label>'
      + '<div style="margin:8px 0 0 24px"><select id="_ajTtOA" onchange="TM_ALOITA_JAKSO.tmAjOmaAlue(this)" style="' + kentta + '">' + TT_ALUEET.map(function (a) { return '<option value="' + a + '"' + (a === oletus ? ' selected' : '') + '>' + esc(t(TT_ALUE_NIMI[a])) + '</option>'; }).join('') + '</select>'
      + '<input id="_ajTtOK" maxlength="80" placeholder="' + esc(t('Kuvaus (enintään 80 merkkiä)')) + '" style="' + kentta + '">'
      + '<textarea id="_ajTtP_oma" rows="2" maxlength="400" placeholder="' + esc(t('Perustelu (näkyy pelaajalle, myönteisesti)')) + '" style="' + kentta + '"></textarea>'
      + TT_ALUEET.map(function (a) { return '<div data-aj-koti="oma:' + a + '" style="display:none"><div style="font-size:11px;color:var(--ink3);letter-spacing:.04em;margin-bottom:2px">' + esc(t('Kotiharjoitteet')) + '</div>' + _harjHTML(tuki.omaHarjoitteet[a], '_ajTtH_oma_' + a, esc, t) + '</div>'; }).join('') + '</div></div>';
  }
  function _tukiOsioHTML(tuki, esc, t, lab, kentta) {
    if (!tuki.nayta) return '';   // Leikkijä (D18: 0): joukkuejakso riittää
    var eka = tuki.kortit[0], muut = tuki.kortit.slice(1);
    var h = '<div data-aj-tuki style="margin:2px 0 6px">' + lab('Tukitavoite') + '<div style="font-size:10.5px;color:var(--ink3);margin:2px 0 4px">' + esc(t('Tukee ydinvahvuutta. Valitse enintään')) + ' ' + tuki.maksimi + '. '
      + (eka && eka.tyyppi === 'ehdotus' && eka.valittu ? esc(t('Ehdotus hyväksytään Aloita jakso -napilla; poista valinta, jos et halua tukitavoitetta.')) : '') + '</div>';
    if (eka) h += _korttiHTML(eka, 0, tuki, esc, t, kentta);
    h += '<details' + (eka ? '' : ' open') + ' style="margin:0 0 6px"><summary style="font-size:12px;color:var(--teal);cursor:pointer">' + esc(t('Muut vaihtoehdot')) + ' (' + muut.length + ')</summary><div style="margin-top:6px">'
      + muut.map(function (k, j) { return _korttiHTML(k, j + 1, tuki, esc, t, kentta); }).join('') + _omaHTML(tuki, esc, t, kentta) + '</div></details></div>';
    return h;
  }

  function tmAloitaJaksoSyoteV2(arvo, x) {
    var s = tmAloitaJaksoSyote(arvo); s.alku = arvo('_ajAlku'); s.tuki = { valitut: [] };
    var tuki = x && x.tuki; if (!tuki || !tuki.nayta) return s;
    tuki.kortit.forEach(function (k, i) {
      if (arvo('_ajTtV_' + i) !== '1') return;
      var ids = []; (k.harjoitteet || []).forEach(function (o, j) { if (arvo('_ajTtH_' + i + '_' + j) === '1') ids.push(o.id); });
      s.tuki.valitut.push({ i: i, perustelu: arvo('_ajTtP_' + i), alue: k.alue || arvo('_ajTtNA_' + i), harjoitteet: ids });
    });
    if (arvo('_ajTtV_oma') === '1') {
      var alue = arvo('_ajTtOA'), ids2 = []; ((tuki.omaHarjoitteet || {})[alue] || []).forEach(function (o, j) { if (arvo('_ajTtH_oma_' + alue + '_' + j) === '1') ids2.push(o.id); });
      s.tuki.oma = { alue: alue, kuvaus: arvo('_ajTtOK'), perustelu: arvo('_ajTtP_oma'), harjoitteet: ids2 };
    }
    return s;
  }

  function _snapshotit(lista, ids) { var out = []; (lista || []).forEach(function (o) { if (ids.indexOf(o.id) >= 0) o.harjoitteet.forEach(function (h) { out.push(h); }); }); return out; }
  function tmAloitaJaksoV2(p, syote, x, opts) {
    opts = opts || {}; var JM = _jm(opts), TT = _TT(opts), tuki = x && x.tuki; if (!tuki) throw new Error('tm_aloita_jakso: tukitavoiteosio puuttuu (V1)');
    var tulos = JM.tmAloitaJakso(p, syote, Object.assign({}, opts, { ilmanTukiosaa: true }));
    var lista = [], pvm = opts.tanaan;
    if (tuki.nayta) {
      (syote.tuki && syote.tuki.valitut || []).forEach(function (v) {
        var k = tuki.kortit[v.i]; if (!k) return;
        var hs = _snapshotit(k.harjoitteet, v.harjoitteet);
        if (!v.alue) throw new Error('tm_aloita_jakso: tukitavoitteen alue puuttuu');
        lista.push({ alue: v.alue, kuvaus: k.kuvaus, perustelu: v.perustelu, lahde: k.lahde && k.lahde.tyyppi ? { tyyppi: k.lahde.tyyppi, viite: k.lahde.viite != null ? k.lahde.viite : null, pvm: k.lahde.pvm || pvm } : { tyyppi: 'suunnitelma', viite: null, pvm: pvm }, harjoitteet: hs });
      });
      var o = syote.tuki && syote.tuki.oma;
      if (o) lista.push({ alue: o.alue, kuvaus: o.kuvaus, perustelu: o.perustelu, lahde: { tyyppi: 'suunnitelma', viite: null, pvm: pvm }, harjoitteet: _snapshotit(tuki.omaHarjoitteet[o.alue], o.harjoitteet) });
      if (lista.length > tuki.maksimi) throw new Error('tm_aloita_jakso: tukitavoitteita enintään ' + tuki.maksimi + ' (ikävaihe)');
    }
    var k = TT.tmTukitavoitteetKirjoitus(lista);   // validointi (KIELLETYT, alue, lähde, harjoitteet) + yhteensopiva tukiosa
    var jf = tulos.jaksofokus; jf.tukitavoitteet = k.tukitavoitteet; jf.tukiosa = k.tukiosa;   // tukiosa null → Pelaaja_v7/K1 eivät näe vanhaa (merge ei säilytä)
    if (tuki.viite) jf.joukkuejakso_viite = tuki.viite;   // snapshot (tmJoukkuejaksoSnapshot) tai vanha {jid, alku}
    if (syote.alku != null && syote.alku !== '') {
      if (!_pvmOk(syote.alku)) throw new Error('tm_aloita_jakso: alkamispäivä ei ole kelvollinen (YYYY-MM-DD)');
      if (syote.alku !== opts.tanaan) { var ap = syote.alku.split('-'); jf.alkoi = new Date(+ap[0], +ap[1] - 1, +ap[2]).toISOString(); }   // paikallinen keskiyö; tänään = nytISO (kuten ennen)
    }
    var viol = JM.tmTarkistaJaksoData(jf); if (viol.length) throw new Error('tm_aloita_jakso: jaksodata sisältää kielletyn sanan/avaimen: ' + viol.join(', '));
    return { jaksofokus: jf, ydinvahvuus: tulos.ydinvahvuus, vihje: tulos.vihje };
  }

  // J4 C: modaalin OLETUSTALLENNUS ilman käyttäjän muokkauksia = mitä "Aloita jakso" kirjoittaisi heti avauksen jälkeen: oletustaito, ydinvahvuus (valinta/oma), oletuskesto, joukkuejakson päivät,
  // ENSIMMÄINEN ehdotettu tukitavoite (valittu kortti, ehdotettu perustelu, ei kotiharjoitteita), vastuuhenkilö ennallaan. Sama polku kuin V1-modaalin tallennus (tmAloitaJaksoSyoteV2 → tmAloitaJaksoV2).
  function tmAloitaJaksoOletusSyote(x) {
    var m = { _ajTaito: x.valittuAvain || '', _ajYv: x.yv || '', _ajKesto: String(x.kesto.valittu), _ajVh: '', _ajAlku: (x.tuki && x.tuki.alku) || '' };
    if (x.tuki && x.tuki.nayta) x.tuki.kortit.forEach(function (k, i) { if (k.valittu) { m['_ajTtV_' + i] = '1'; m['_ajTtP_' + i] = k.perustelu; } });
    return tmAloitaJaksoSyoteV2(function (id) { return id in m ? m[id] : ''; }, x);
  }

  // DOM-apurit (inline-käsittelijöille; ei-DOM-ympäristössä no-op)
  function tmAjTukiValitse(el, max) {
    if (!el || typeof el.closest !== 'function') return;
    var root = el.closest('[data-aj-tuki]'); if (!root) return;
    var boxes = Array.prototype.slice.call(root.querySelectorAll('input[data-aj-tv]'));
    var valitut = boxes.filter(function (b) { return b.checked; });
    if (el.checked && valitut.length > max) { if (max === 1) boxes.forEach(function (b) { if (b !== el) b.checked = false; }); else el.checked = false; }
    var oma = root.querySelector('#_ajTtOA'), omaAlue = oma ? oma.value : null;
    Array.prototype.slice.call(root.querySelectorAll('[data-aj-koti]')).forEach(function (p) {
      var avain = p.getAttribute('data-aj-koti'), nayta;
      if (avain.indexOf('oma:') === 0) { var ob = root.querySelector('input[data-aj-tv="oma"]'); nayta = !!(ob && ob.checked && avain === 'oma:' + omaAlue); }
      else { var b = root.querySelector('input[data-aj-tv="' + avain + '"]'); nayta = !!(b && b.checked); }
      p.style.display = nayta ? 'block' : 'none';
    });
  }
  function tmAjOmaAlue(sel) { if (sel && typeof sel.closest === 'function') { var r = sel.closest('[data-aj-tuki]'); var b = r && r.querySelector('input[data-aj-tv="oma"]'); if (b) tmAjTukiValitse(b, 99); } }

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

  /* sv-läpiajo PR 3: rivitilan teksti käännettynä. teksti = fi (S1/palvelin ja fi-näkymät ennallaan); yhdistelmäteksteillä (arvo osana lausetta) on lisäksi muoto = käännettävä fi-malli
     '{n}'/'{kirjain}' -paikkamerkeillä + arvot. t(muoto) osuu → paikkamerkit täytetään; ei osumaa (fi tai sv-käännös puuttuu → t palauttaa avaimen) → t(teksti) kuten ennen. */
  function tmJaksoTeksti(x, t) {
    if (!x) return '';
    if (typeof t !== 'function') return x.teksti || '';
    if (x.muoto) { var s = t(x.muoto); if (typeof s === 'string' && s !== x.muoto) return s.replace(/\{(\w+)\}/g, function (m, k) { return x.arvot && x.arvot[k] != null ? x.arvot[k] : m; }); }
    return t(x.teksti);
  }

  var API = { IDS: IDS, tmJaksoTeksti: tmJaksoTeksti, tmJaksoNappi: tmJaksoNappi, tmJaksoNapitTila: tmJaksoNapitTila, tmJaksoTila: tmJaksoTila, tmJaksoNapitHTML: tmJaksoNapitHTML, tmAloitaJaksoTiedot: tmAloitaJaksoTiedot, tmAloitaJaksoModalHTML: tmAloitaJaksoModalHTML, tmAloitaJaksoSyote: tmAloitaJaksoSyote, tmAloitaJaksoKirjoitus: tmAloitaJaksoKirjoitus,
    tmAloitaJaksoTuki: tmAloitaJaksoTuki, tmAjJoukkueId: tmAjJoukkueId, KONF: { arviointikehys: 'arviointi', prosessiprofiili: 'prosessiprofiili' },   // konfiguraatio/{doc} -tunnisteet (adapterit; ei näyttötekstejä)
     tmAloitaJaksoSyoteV2: tmAloitaJaksoSyoteV2, tmAloitaJaksoOletusSyote: tmAloitaJaksoOletusSyote, tmAloitaJaksoV2: tmAloitaJaksoV2, tmAjTukiValitse: tmAjTukiValitse, tmAjOmaAlue: tmAjOmaAlue, TT_ALUEET: TT_ALUEET };
  if (typeof module !== 'undefined' && module.exports) module.exports = API; else root.TM_ALOITA_JAKSO = API;
})(typeof window !== 'undefined' ? window : this);
