/* ════════════════════════════════════════════════════════════════════════
   tm_mediaviesti.js — R6.4 Mediaviesti M1 (docs/CODE_BRIEF_R6_4_MEDIAVIESTI.md; D55–D64; design 19). PURE (ei Firebasea, ei DOMia): Master_v16 ja VP_v25 ovat ohuita adaptereita. Inboxin ominaisuus, EI Kenttä-lipun.
   Klippiviesti = seurat/{sid}/viestit-dokumentti: valmentaja liittää https-linkin + yhden kysymyksen → pelaajan vastaus → valmentajan kuittauslause (kolme askelta, ei neljättä viestiä).
   LINKKI (D56): vain https ≤500; domain = host; mediatyyppi domainista (veo/youtube/youtu.be/vimeo → video; kuvapäätteet → kuva; muu → linkki); VEO/YouTube t= → kohta_s. Ei oEmbediä, ei esikatselua.
   · tmMvLinkki(url) → { ok, url, domain, mediatyyppi, kohta_s|null } | { ok:false, syy:'tyhja'|'pitka'|'ei_https'|'virheellinen' }
   · tmMvRekisteri(ika) → 'leikkija'|'rakentaja'|'showcase' · tmMvNakyvyys(ika) → 'huoltaja' (U8–12) | 'pelaaja' (U13+) · tmMvPohjat(klippityyppi, rekisteri) → [{avain, teksti}] (3 kpl; fi — sv Geminiltä)
   · tmMvNakyvaAlkaen(nyt) → Date: lähetys klo 21–07 → seuraava klo 07 (paikallinen); muuten nyt (Inbox näyttää heti, pelaajan/huoltajan kysely suodattaa)
   · tmMvTeksti(s, max, {luvut}) → { ok, teksti|null, syy } — KIELLETYT-vartija (sama kuin kevyt katselmus: tm_viikkokatsaus.tmVkLauseValmentaja → saate/kuittaus; kysymykselle vain KIELLETYT)
   · tmMvKlippiDokumentit(syote, ctx) → { ok, klippi_id, dokit:[…] } | { ok:false, syy, indeksi? }   (monistus per pelaaja, sama klippi_id; adapteri lisää aika/nakyva_alkaen-timestampit ja kirjoittaa writeBatchilla)
   · tmMvRivit(dokit, ctx) → Inbox-rivit (ryhmittely klippi_id:llä clientissä; yksi koottu rivi joukkueklipille) · tmMvTila(klippi, vastaukset, pelaaja) → odottaa|vastattu|perhe_kuittasi|odottaa_lupaa|suljettu (JOHDETTU, ei tallennettu)
   · tmMvKuittaus(syote) → { ok, paivitys:{tila:'suljettu', kuittaus_lause?} }
   HTML (tokenit, ei hex-värejä): tmMvSheetHTML · tmMvRiviHTML · tmMvKetjuHTML · tmMvKlipitKorttiHTML.  Tekstit opts.t:n läpi (fi-oletus tässä; sv-avaimet määrittelemättä → Geminin lista docs/R6_4_MEDIAVIESTI_SV_KAANNOKSET.md).
   Pelaajalle EI lukuja, vertailua eikä muiden vastauksia (§7.22) — koottu "11/18" vain henkilökunnalle.
   Dual-export: module.exports || window.TM_MEDIAVIESTI.
════════════════════════════════════════════════════════════════════════ */
(function (root) {
  'use strict';
  var FI = {
    mv_otsikko: 'Lisää klippi', mv_kenelle: 'Kenelle', mv_yksi: 'Vain tämä pelaaja', mv_valitut: 'Valitut…', mv_joukkue: 'Koko joukkue', mv_valitse_pelaajat: 'Valitse pelaajat',
    mv_linkki: 'Linkki', mv_linkki_ohje: 'vain https · tunnistettu domainista', mv_tyyppi: 'Tyyppi', mv_tyyppi_ohje: 'pelaajalle: Onnistuminen · Katsotaan yhdessä · Tilanne', mv_osa: 'Jakson osa', mv_osa_ohje: 'valinnainen', mv_ei_osaa: 'ei osaa',
    mv_kysymys: 'Kysymys', mv_kysymys_pakollinen: 'pakollinen', mv_oma_kysymys: 'oma kysymys…', mv_saate: 'Saate', mv_saate_ohje: 'valinnainen · enintään 120 merkkiä', mv_vertailu_ohje: 'Kysy tilanteesta, älä vertaa.',
    mv_tyyppi_onnistui: 'Onnistui', mv_tyyppi_prosessi: 'Prosessi', mv_tyyppi_tulos: 'Tulos', mv_pelaajanimi_onnistui: 'Onnistuminen', mv_pelaajanimi_prosessi: 'Katsotaan yhdessä', mv_pelaajanimi_tulos: 'Tilanne',
    mv_laheta: 'Lähetä', mv_laheta_pelaajalle: 'Lähetä {nimi}', mv_tallenna_lupa: 'Tallenna – näkyy kun lupa on annettu', mv_tallentuu_heti: 'tallentuu heti · näkyy klo 7–21', mv_peruuta: 'Peruuta',
    mv_joukkue_kysymys: 'Mitä huomaat tästä tilanteesta?', mv_joukkue_ohje: 'Koko joukkue: kysymys koskee tilannetta, vastaus on valinnainen.', mv_suostumus_puuttuu: 'suostumus odottaa — viesti tallentuu ja näkyy kun lupa on annettu',
    mv_domain: 'avautuu', mv_kohta: 'kohta', mv_ulos: 'Avaa linkki', mv_uuteen: 'avautuu uudessa välilehdessä',
    mv_virhe_linkki_tyhja: 'Liitä klipin linkki.', mv_virhe_linkki_ei_https: 'Linkin pitää alkaa https://', mv_virhe_linkki_pitka: 'Linkki on liian pitkä (enintään 500 merkkiä).', mv_virhe_linkki_virheellinen: 'Linkki ei ole kelvollinen osoite.',
    mv_virhe_kysymys: 'Valitse tai kirjoita kysymys (enintään 160 merkkiä).', mv_virhe_saate: 'Saate on liian pitkä (enintään 120 merkkiä).', mv_virhe_sana: 'Tekstissä on sana, jota pelaajalle ei näytetä. Kirjoita se toisin.', mv_virhe_luku: 'Ei lukuja eikä vertailua.',
    mv_virhe_vastaanottajat: 'Valitse vähintään yksi pelaaja.', mv_virhe_tyyppi: 'Valitse klipin tyyppi.', mv_virhe_kuittaus: 'Kuittaus on liian pitkä (enintään 120 merkkiä).',
    mv_lahetetty: 'Klippi lähetetty ✓', mv_lahetetty_n: 'Klippi lähetetty {n} pelaajalle ✓', mv_kuitattu: 'Ketju suljettu ✓', mv_ketju_otsikko: 'Ketju',
    mv_rivi_odottaa: 'Odottaa vastausta', mv_rivi_vastattu: 'vastasi klippiin', mv_rivi_perhe: 'Perhe kuittasi: katsoimme yhdessä', mv_rivi_lupa: 'Odottaa suostumusta', mv_rivi_suljettu: 'Suljettu', mv_rivi_lupa_ohje: 'näkyy kun huoltaja on antanut luvan',
    mv_rivi_joukkue: 'Joukkueklippi', mv_rivi_pelaajia: 'pelaajaa', mv_rivi_vastausta: 'vastausta', mv_rivi_lupaa_odottaa: 'odottaa lupaa', mv_klippi_nappi: '＋ klippi',
    mv_valmentaja: 'Valmentaja', mv_pelaaja: 'Pelaaja', mv_kuittaus: 'Kuittaus', mv_kuittaa_sulje: 'Kuittaa ja sulje', mv_kuittaus_ohje: 'valinnainen · enintään 120 merkkiä · sulkee ketjun', mv_ei_vastausta: 'Ei vastausta vielä.', mv_perhe_nahnyt: 'huoltaja kuittasi',
    mv_klipit: 'Klipit', mv_ei_klippeja: 'Ei klippejä vielä.', mv_lisaa: 'Lisää klippi'
  };
  var POHJAT = {
    onnistui: {
      leikkija: ['Mitä teit tässä hyvin?', 'Mistä tämä tuntui kivalta?', 'Mitä katsoit ennen kuin teit sen?'],
      rakentaja: ['Mitä näit ennen kuin päätit?', 'Missä muualla tämä toimisi?', 'Mikä teki tästä helpon?'],
      showcase: ['Mikä tässä onnistui ja miksi?', 'Mitä teit tässä tietoisesti?', 'Missä tilanteessa tämä toimii seuraavalla kerralla?']
    },
    prosessi: {
      leikkija: ['Mitä huomaat tässä?', 'Mitä voisit kokeilla seuraavaksi?', 'Mitä tapahtuu ennen kuin pallo tulee?'],
      rakentaja: ['Mitä huomaat, kun katsot tämän uudelleen?', 'Mitä kokeilisit seuraavalla kerralla?', 'Missä kohdassa päätös tehtiin?'],
      showcase: ['Mitä tekisit toisin tässä ja miksi?', 'Mikä ratkaisi tilanteen?', 'Mitä valmistelit ennen tätä hetkeä?']
    },
    tulos: {
      leikkija: ['Mitä tapahtui tässä?', 'Mitä tunsit tässä?', 'Mitä haluaisit kokeilla seuraavaksi?'],
      rakentaja: ['Mitä tapahtui juuri ennen tätä?', 'Mikä ratkaisi tilanteen?', 'Mitä haluaisit tehdä toisin?'],
      showcase: ['Miten luet tämän tilanteen?', 'Mikä oli vaihtoehtosi tässä?', 'Mitä ottaisit tästä mukaan seuraavaan peliin?']
    }
  };
  var TYYPIT = ['onnistui', 'prosessi', 'tulos'], REKISTERIT = ['leikkija', 'rakentaja', 'showcase'];
  /* Pohjatekstit myös avainmuotoisina (Geminin lista + sv-lisäys): mv_pohja_<tyyppi>_<rekisteri>_<n> */
  TYYPIT.forEach(function (ty) { REKISTERIT.forEach(function (r) { POHJAT[ty][r].forEach(function (t, i) { FI['mv_pohja_' + ty + '_' + r + '_' + (i + 1)] = t; }); }); });
  var MAX_URL = 500, MAX_KYSYMYS = 160, MAX_SAATE = 120, MAX_KUITTAUS = 120;
  var VIDEO = /(^|\.)(veo\.co|youtube\.com|youtu\.be|vimeo\.com)$/i, KUVA = /\.(jpe?g|png|gif|webp|heic|avif)$/i;

  function _esc(s) { return String(s == null ? '' : s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;'); }
  function _txt(o, k) { var v = (o && typeof o.t === 'function') ? o.t(k) : k; return (v && v !== k) ? v : FI[k]; }
  function _fmt(s, m) { return String(s).replace(/\{(\w+)\}/g, function (_, k) { return m && m[k] != null ? m[k] : ''; }); }
  function _req(g, f) { try { return (typeof module !== 'undefined' && module.exports && typeof require === 'function') ? require(f) : (root && root[g]); } catch (e) { return root && root[g]; } }
  function _K4() { return _req('TM_VIIKKOKATSAUS', './tm_viikkokatsaus.js'); }
  function _KI() { return _req('TM_KIELLETYT', './tm_kielletyt.js'); }
  function _str(v) { return typeof v === 'string' ? v.trim() : ''; }
  function _ms(t) { return t == null ? NaN : (t.toDate ? t.toDate().getTime() : (t instanceof Date ? t.getTime() : (typeof t === 'number' ? t : new Date(t).getTime()))); }

  /* ── Linkki ── */
  function _kohta(u) {
    var v = u.searchParams.get('t') || u.searchParams.get('start') || ''; if (!v) { var h = /[#&?]t=([^&]+)/.exec(u.hash || ''); v = h ? h[1] : ''; }
    v = String(v).trim(); if (!v) return null;
    if (/^\d+$/.test(v)) return parseInt(v, 10); if (/^\d+s$/i.test(v)) return parseInt(v, 10);
    var m = /^(?:(\d+)h)?(?:(\d+)m)?(?:(\d+)s)?$/i.exec(v); if (m && (m[1] || m[2] || m[3])) return (+m[1] || 0) * 3600 + (+m[2] || 0) * 60 + (+m[3] || 0);
    var c = /^(?:(\d+):)?(\d+):(\d+)$/.exec(v); if (c) return (+c[1] || 0) * 3600 + (+c[2]) * 60 + (+c[3]);
    return null;
  }
  function tmMvLinkki(raw) {
    var s = _str(raw); if (!s) return { ok: false, syy: 'tyhja' };
    if (s.length > MAX_URL) return { ok: false, syy: 'pitka' };
    if (!/^https:\/\//i.test(s)) return { ok: false, syy: 'ei_https' };
    if (/\s/.test(s)) return { ok: false, syy: 'virheellinen' };
    var u; try { u = new URL(s); } catch (e) { return { ok: false, syy: 'virheellinen' }; }
    if (u.protocol !== 'https:' || !u.hostname || u.username || u.password || u.hostname.indexOf('.') < 0) return { ok: false, syy: 'virheellinen' };
    var host = u.hostname.toLowerCase(), tyyppi = VIDEO.test(host) ? 'video' : (KUVA.test(u.pathname || '') ? 'kuva' : 'linkki');
    return { ok: true, url: s, domain: host, mediatyyppi: tyyppi, kohta_s: tyyppi === 'video' ? _kohta(u) : null };
  }
  function tmMvKohtaTeksti(s) { if (s == null || !isFinite(s)) return ''; var h = Math.floor(s / 3600), m = Math.floor((s % 3600) / 60), x = s % 60, p = function (n) { return n < 10 ? '0' + n : '' + n; }; return h ? h + ':' + p(m) + ':' + p(x) : m + ':' + p(x); }

  /* Tunnistusrivi sheetin linkkikentän alle: "app.veo.co · video · kohta 0:12" tai virheteksti. */
  function tmMvTunnistus(url, opts) {
    if (!_str(url)) return { ok: true, teksti: '' };
    var l = tmMvLinkki(url); if (!l.ok) return { ok: false, teksti: tmMvVirhe(l.syy, opts) };
    return { ok: true, teksti: l.domain + ' · ' + l.mediatyyppi + (l.kohta_s != null ? ' · ' + _txt(opts, 'mv_kohta') + ' ' + tmMvKohtaTeksti(l.kohta_s) : '') };
  }

  /* ── Ikä · rekisteri · näkyvyys · pohjat · toimitusaika ── */
  function tmMvRekisteri(ika) { var n = ika == null || ika === '' ? NaN : Number(ika); if (!isFinite(n)) return 'rakentaja'; return n <= 12 ? 'leikkija' : (n <= 15 ? 'rakentaja' : 'showcase'); }
  function tmMvNakyvyys(ika) { var n = ika == null || ika === '' ? NaN : Number(ika); return isFinite(n) && n <= 12 ? 'huoltaja' : 'pelaaja'; }
  function tmMvPohjat(tyyppi, rekisteri) {
    var ty = POHJAT[tyyppi] ? tyyppi : 'onnistui', r = POHJAT[ty][rekisteri] ? rekisteri : 'rakentaja';
    return POHJAT[ty][r].map(function (t, i) { return { avain: 'mv_pohja_' + ty + '_' + r + '_' + (i + 1), teksti: t }; });
  }
  function tmMvNakyvaAlkaen(nyt) {
    var d = nyt instanceof Date ? new Date(nyt.getTime()) : new Date(nyt == null ? Date.now() : nyt), h = d.getHours();
    if (h >= 21) { d.setDate(d.getDate() + 1); d.setHours(7, 0, 0, 0); return d; }
    if (h < 7) { d.setHours(7, 0, 0, 0); return d; }
    return d;
  }

  /* ── Tekstit: KIELLETYT (+ luvut saatteessa/kuittauksessa kuten kevyt katselmus) ── */
  function tmMvTeksti(s, max, opts) {
    opts = opts || {}; var t = _str(s); if (!t) return { ok: true, teksti: null, syy: null };
    if (t.length > max) return { ok: false, teksti: null, syy: 'pitka' };
    if (opts.luvut === false) { var KI = _KI(); if (!KI || typeof KI.tmJaksoTekstiKelpaa !== 'function') return { ok: false, teksti: null, syy: 'vartija_puuttuu' }; return KI.tmJaksoTekstiKelpaa(t).ok ? { ok: true, teksti: t, syy: null } : { ok: false, teksti: null, syy: 'sana' }; }
    var K4 = _K4(); if (!K4 || typeof K4.tmVkLauseValmentaja !== 'function') return { ok: false, teksti: null, syy: 'vartija_puuttuu' };
    var x = K4.tmVkLauseValmentaja(t); return x.ok ? { ok: true, teksti: x.teksti, syy: null } : { ok: false, teksti: null, syy: x.syy };
  }
  function tmMvVirhe(syy, opts) { return _txt(opts, { tyhja: 'mv_virhe_linkki_tyhja', ei_https: 'mv_virhe_linkki_ei_https', pitka: 'mv_virhe_linkki_pitka', virheellinen: 'mv_virhe_linkki_virheellinen', kysymys: 'mv_virhe_kysymys', saate: 'mv_virhe_saate', sana: 'mv_virhe_sana', luku: 'mv_virhe_luku', vastaanottajat: 'mv_virhe_vastaanottajat', tyyppi: 'mv_virhe_tyyppi', kuittaus: 'mv_virhe_kuittaus' }[syy] || 'mv_virhe_sana'); }

  /* ── Lähetys → dokumentit (yksi per pelaaja, sama klippi_id) ──
     syote: { url, klippityyppi, kysymys, kysymys_avain, saate, osa, tukitavoite_id, joukkueklippi, vastaanottajat:[{ pelaajaId, pelaajaNimi, ika, vastaanottajaUid }] }
     ctx: { nyt (Date), lahettajaUid, lahettajaNimi, rooli, klippi_id } → dokit sisältävät nakyva_alkaen: Date (adapteri → Timestamp) ja aika:null (adapteri: serverTimestamp) */
  function tmMvKlippiDokumentit(syote, ctx) {
    syote = syote || {}; ctx = ctx || {};
    var l = tmMvLinkki(syote.url); if (!l.ok) return { ok: false, syy: l.syy };
    if (TYYPIT.indexOf(syote.klippityyppi) < 0) return { ok: false, syy: 'tyyppi' };
    var kysymys = _str(syote.kysymys); if (!kysymys || kysymys.length > MAX_KYSYMYS) return { ok: false, syy: 'kysymys' };
    var kv = tmMvTeksti(kysymys, MAX_KYSYMYS, { luvut: false }); if (!kv.ok) return { ok: false, syy: kv.syy === 'pitka' ? 'kysymys' : kv.syy };
    var sa = tmMvTeksti(syote.saate, MAX_SAATE); if (!sa.ok) return { ok: false, syy: sa.syy === 'pitka' ? 'saate' : sa.syy };
    var vs = (Array.isArray(syote.vastaanottajat) ? syote.vastaanottajat : []).filter(function (v) { return v && v.pelaajaId; }); if (!vs.length) return { ok: false, syy: 'vastaanottajat' };
    var yht = !!syote.joukkueklippi && vs.length > 1, kid = ctx.klippi_id || ('kl_' + (ctx.nyt ? _ms(ctx.nyt) : Date.now()).toString(36) + '_' + Math.random().toString(36).slice(2, 8)), alk = tmMvNakyvaAlkaen(ctx.nyt);
    var avain = syote.kysymys_avain || null, seen = {}, dokit = [];
    vs.forEach(function (v) {
      if (seen[v.pelaajaId]) return; seen[v.pelaajaId] = 1;
      var d = { tyyppi: 'klippi', url: l.url, domain: l.domain, mediatyyppi: l.mediatyyppi, klippityyppi: syote.klippityyppi, kysymys: kysymys, kysymys_avain: avain, klippi_id: kid,
        pelaajaId: v.pelaajaId, nakyvyys: tmMvNakyvyys(v.ika), vastaanottajaUid: v.vastaanottajaUid || ctx.lahettajaUid, lahettajaUid: ctx.lahettajaUid, fromRole: ctx.rooli || 'valmentaja', fromNimi: ctx.lahettajaNimi || '', pelaajaNimi: v.pelaajaNimi || '',
        tila: 'lahetetty', nakyva_alkaen: alk, luettu: false, aika: null };
      if (l.kohta_s != null) d.kohta_s = l.kohta_s;
      if (sa.teksti) d.saate = sa.teksti;
      if (!yht && (syote.osa === 'a' || syote.osa === 'b' || syote.osa === 'c')) d.osa = syote.osa;   // joukkueklipissä ei osaa (18 eri jaksoa)
      if (!yht && typeof syote.tukitavoite_id === 'string' && syote.tukitavoite_id) d.tukitavoite_id = syote.tukitavoite_id;
      if (yht) d.joukkueklippi = true;
      dokit.push(d);
    });
    return { ok: true, klippi_id: kid, dokit: dokit, yhteinen: yht };
  }

  /* ── Tila (JOHDETTU) ── */
  function tmMvTila(klippi, vastaukset, pelaaja) {
    if (klippi && klippi.tila === 'suljettu') return 'suljettu';
    if (pelaaja && pelaaja.suostumusTila !== 'annettu') return 'odottaa_lupaa';
    var vs = (Array.isArray(vastaukset) ? vastaukset : []).filter(function (v) { return v && v.vastaus_viestille === (klippi && klippi.id); });
    if (vs.some(function (v) { return v.tyyppi === 'klippi_kuittaus' || v.kuittaus === true; })) return 'perhe_kuittasi';
    if (vs.some(function (v) { return v.tyyppi === 'klippi_vastaus'; })) return 'vastattu';
    return 'odottaa';
  }
  /* dokit: kaikki saman vastaanottajan klippi-/vastaus-/kuittausdokumentit ({id, …}); ctx: { pelaajat:{ id → {nimi, suostumusTila} } } → rivit uusin ensin */
  function tmMvRivit(dokit, ctx) {
    ctx = ctx || {}; var pl = ctx.pelaajat || {}, klipit = [], vastaukset = [];
    (Array.isArray(dokit) ? dokit : []).forEach(function (d) { if (!d) return; if (d.tyyppi === 'klippi') klipit.push(d); else if (d.tyyppi === 'klippi_vastaus' || d.tyyppi === 'klippi_kuittaus') vastaukset.push(d); });
    var ryhmat = {}, jarj = [];
    klipit.forEach(function (k) { var id = k.klippi_id || k.id; if (!ryhmat[id]) { ryhmat[id] = []; jarj.push(id); } ryhmat[id].push(k); });
    var rivit = jarj.map(function (id) {
      var jasen = ryhmat[id], k0 = jasen[0], tilat = jasen.map(function (k) { return tmMvTila(k, vastaukset, pl[k.pelaajaId]); }), yhteinen = jasen.length > 1;
      var vast = vastaukset.filter(function (v) { return jasen.some(function (k) { return k.id === v.vastaus_viestille; }) && v.tyyppi === 'klippi_vastaus'; });
      var tila = yhteinen ? (tilat.every(function (x) { return x === 'suljettu'; }) ? 'suljettu' : (vast.length ? 'vastattu' : (tilat.every(function (x) { return x === 'odottaa_lupaa'; }) ? 'odottaa_lupaa' : 'odottaa'))) : tilat[0];
      var lupaaOdottaa = tilat.filter(function (x) { return x === 'odottaa_lupaa'; }).length;
      var v1 = vast.sort(function (a, b) { return _ms(b.aika) - _ms(a.aika); })[0] || null;
      return { avain: id, klippi_id: id, yhteinen: yhteinen, n: jasen.length, vastauksia: vast.length, lupaaOdottaa: lupaaOdottaa, tila: tila, klippityyppi: k0.klippityyppi, domain: k0.domain, mediatyyppi: k0.mediatyyppi, kohta_s: k0.kohta_s != null ? k0.kohta_s : null, osa: k0.osa || null, kysymys: k0.kysymys, saate: k0.saate || '',
        pelaajaId: yhteinen ? null : k0.pelaajaId, pelaajaNimi: yhteinen ? '' : ((pl[k0.pelaajaId] && pl[k0.pelaajaId].nimi) || k0.pelaajaNimi || ''), klippiDocId: yhteinen ? null : k0.id, dokIds: jasen.map(function (k) { return k.id; }),
        vastaus: v1 ? { valinta: v1.valinta || '', teksti: v1.teksti || '', aika: _ms(v1.aika), kuittaus: v1.kuittaus === true } : null, perheKuittasi: vastaukset.some(function (v) { return v.tyyppi === 'klippi_kuittaus' && jasen.some(function (k) { return k.id === v.vastaus_viestille; }); }),
        kuittaus_lause: k0.kuittaus_lause || '', t: Math.max.apply(null, jasen.map(function (k) { return _ms(k.aika) || 0; }).concat(v1 ? [_ms(v1.aika) || 0] : [0])) };
    });
    rivit.sort(function (a, b) { return (b.t || 0) - (a.t || 0); }); return rivit;
  }
  function tmMvKuittaus(syote) {
    var l = tmMvTeksti(syote && syote.lause, MAX_KUITTAUS); if (!l.ok) return { ok: false, syy: l.syy === 'pitka' ? 'kuittaus' : l.syy };
    var p = { tila: 'suljettu' }; if (l.teksti) p.kuittaus_lause = l.teksti; return { ok: true, paivitys: p };
  }

  /* ── HTML ── */
  var KORTTI = 'background:var(--card);border:.5px solid var(--border);border-radius:12px;padding:14px 16px;margin-bottom:10px';
  var RASTI = 'font-size:10px;text-transform:uppercase;letter-spacing:.05em;color:var(--ink3);margin:12px 0 4px';
  var KENTTA = 'width:100%;box-sizing:border-box;background:var(--card);color:var(--ink);border:.5px solid var(--border);border-radius:8px;padding:8px;font-family:inherit;font-size:13px';
  var VARI = { odottaa: 'var(--ink3)', vastattu: 'var(--teal)', perhe_kuittasi: 'var(--blue,var(--teal))', odottaa_lupaa: 'var(--amber)', suljettu: 'var(--ink3)' };
  function _pill(esc, akt, fn, teksti, attr) { return '<button type="button" ' + attr + ' aria-pressed="' + (akt ? 'true' : 'false') + '" onclick="' + esc(fn) + '" style="flex:1;min-width:86px;font-size:12.5px;border-radius:8px;padding:8px;cursor:pointer;border:.5px solid ' + (akt ? 'var(--teal)' : 'var(--border)') + ';background:' + (akt ? 'var(--teal)' : 'transparent') + ';color:' + (akt ? 'var(--on-accent,var(--bg))' : 'var(--ink)') + '">' + esc(teksti) + '</button>'; }
  function _aika(ms) { if (!ms || !isFinite(ms)) return ''; var d = new Date(ms), p = function (n) { return n < 10 ? '0' + n : '' + n; }; return ['su', 'ma', 'ti', 'ke', 'to', 'pe', 'la'][d.getDay()] + ' ' + d.getDate() + '.' + (d.getMonth() + 1) + '. ' + d.getHours() + '.' + p(d.getMinutes()); }
  function _linkkiRivi(esc, T, k) { return '<a data-mv-linkki href="' + esc(k.url) + '" target="_blank" rel="noopener noreferrer" style="color:var(--teal);font-size:13px">' + T('mv_ulos') + '</a> <span data-mv-domain style="font-size:12px;color:var(--ink3)">' + esc(k.domain || '') + (k.kohta_s != null ? ' · ' + esc(tmMvKohtaTeksti(k.kohta_s)) : '') + ' · ' + T('mv_uuteen') + '</span>'; }

  /* S: { kohde:'yksi'|'valitut'|'joukkue', pelaajanNimi, joukkueNimi, valitut:[ids], url, klippityyppi, osa, osat:[{k,teksti}], kysymysAvain, kysymysOma, saate, rekisteri, suostumusPuuttuu, tallentaa, pelaajatLista:[{id,nimi}], tarjolla:{yksi:bool} }
     opts: { esc, t, kohdeFn(k), valitseFn(id), urlFn(v), tyyppiFn(t), osaFn(k), pohjaFn(i), kysymysFn(v), saateFn(v), lahetaFn, suljeFn } */
  function tmMvSheetHTML(S, opts) {
    opts = opts || {}; S = S || {}; var esc = opts.esc || _esc, T = function (k) { return esc(_txt(opts, k)); }, joukkue = S.kohde === 'joukkue', l = S.url ? tmMvLinkki(S.url) : null, pohjat = tmMvPohjat(S.klippityyppi || 'onnistui', S.rekisteri || 'rakentaja');
    var valittu = {}; (S.valitut || []).forEach(function (id) { valittu[id] = 1; });
    var h = '<div style="display:flex;justify-content:space-between;align-items:baseline;margin-bottom:6px"><div data-mv-otsikko style="font-family:\'Cormorant Garamond\',serif;font-size:21px">' + T('mv_otsikko') + '</div><button type="button" aria-label="' + esc(_txt(opts, 'mv_peruuta')) + '" onclick="' + esc(opts.suljeFn) + '()" style="background:none;border:none;color:var(--ink3);font-size:22px;cursor:pointer;padding:0 6px">×</button></div>'
      + '<div style="' + RASTI + '">' + T('mv_kenelle') + '</div><div style="display:flex;gap:7px;flex-wrap:wrap">'
      + (S.tarjolla && S.tarjolla.yksi ? _pill(esc, S.kohde === 'yksi', opts.kohdeFn + "('yksi')", S.pelaajanNimi || _txt(opts, 'mv_yksi'), 'data-mv-kohde="yksi"') : '') + _pill(esc, S.kohde === 'valitut', opts.kohdeFn + "('valitut')", _txt(opts, 'mv_valitut'), 'data-mv-kohde="valitut"') + _pill(esc, joukkue, opts.kohdeFn + "('joukkue')", _txt(opts, 'mv_joukkue') + (S.joukkueNimi ? ' ' + S.joukkueNimi : ''), 'data-mv-kohde="joukkue"') + '</div>'
      + (S.kohde === 'valitut' ? '<div data-mv-pelaajalista style="max-height:200px;overflow:auto;border:.5px solid var(--border);border-radius:8px;padding:4px 10px;margin-top:8px">' + (S.pelaajatLista || []).map(function (p) { return '<label style="display:flex;gap:8px;align-items:center;padding:4px 0;font-size:13px;cursor:pointer"><input type="checkbox" data-mv-pelaaja="' + esc(p.id) + '"' + (valittu[p.id] ? ' checked' : '') + ' onchange="' + esc(opts.valitseFn + "('" + p.id + "')") + '"> ' + esc(p.nimi) + '</label>'; }).join('') + '</div>' : '')
      + (joukkue ? '<div style="font-size:12px;color:var(--ink2);margin-top:6px">' + T('mv_joukkue_ohje') + '</div>' : '')
      + '<div style="' + RASTI + '">1 · ' + T('mv_linkki') + ' <span style="text-transform:none;letter-spacing:0">(' + T('mv_linkki_ohje') + ')</span></div><input data-mv-url type="url" value="' + esc(S.url || '') + '" placeholder="https://" oninput="' + esc(opts.urlFn) + '(this.value)" style="' + KENTTA + '">'
      + '<div data-mv-tunnistus style="font-size:12px;margin-top:3px;min-height:16px;color:' + (l && !l.ok ? 'var(--amber)' : 'var(--ink3)') + '">' + (l ? esc(tmMvTunnistus(S.url, opts).teksti) : '') + '</div>'
      + '<div style="' + RASTI + '">2 · ' + T('mv_tyyppi') + '</div><div style="display:flex;gap:7px;flex-wrap:wrap">' + TYYPIT.map(function (ty) { return _pill(esc, S.klippityyppi === ty, opts.tyyppiFn + "('" + ty + "')", _txt(opts, 'mv_tyyppi_' + ty), 'data-mv-tyyppi="' + ty + '"'); }).join('') + '</div><div style="font-size:11px;color:var(--ink3);margin-top:3px">' + T('mv_tyyppi_ohje') + '</div>';
    if (!joukkue && (S.osat || []).length) h += '<div style="' + RASTI + '">3 · ' + T('mv_osa') + ' <span style="text-transform:none;letter-spacing:0">(' + T('mv_osa_ohje') + ')</span></div><div style="display:flex;gap:7px;flex-wrap:wrap">' + S.osat.map(function (o) { return _pill(esc, S.osa === o.k, opts.osaFn + "('" + o.k + "')", o.k + ' · ' + o.teksti, 'data-mv-osa="' + esc(o.k) + '"'); }).join('') + _pill(esc, !S.osa, opts.osaFn + "('')", _txt(opts, 'mv_ei_osaa'), 'data-mv-osa=""') + '</div>';
    h += '<div style="' + RASTI + '">4 · ' + T('mv_kysymys') + ' <span style="text-transform:none;letter-spacing:0">(' + T('mv_kysymys_pakollinen') + ')</span></div>';
    if (joukkue) h += '<div data-mv-joukkuekysymys style="font-size:13.5px;padding:8px 0">' + T('mv_joukkue_kysymys') + '</div>';
    else h += '<div style="display:flex;flex-direction:column;gap:6px">' + pohjat.map(function (p, i) { return '<button type="button" data-mv-pohja="' + i + '" aria-pressed="' + (S.kysymysAvain === p.avain ? 'true' : 'false') + '" onclick="' + esc(opts.pohjaFn + '(' + i + ')') + '" style="text-align:left;font-size:13px;border-radius:8px;padding:9px 10px;cursor:pointer;border:.5px solid ' + (S.kysymysAvain === p.avain ? 'var(--teal)' : 'var(--border)') + ';background:transparent;color:var(--ink)">' + esc(_txt(opts, p.avain)) + '</button>'; }).join('') + '</div>'
      + '<input data-mv-oma type="text" maxlength="' + MAX_KYSYMYS + '" value="' + esc(S.kysymysOma || '') + '" placeholder="' + T('mv_oma_kysymys') + '" oninput="' + esc(opts.kysymysFn) + '(this.value)" style="' + KENTTA + ';margin-top:6px"><div style="font-size:11px;color:var(--ink3);margin-top:3px">' + T('mv_vertailu_ohje') + '</div>';
    h += '<div style="' + RASTI + '">5 · ' + T('mv_saate') + ' <span style="text-transform:none;letter-spacing:0">(' + T('mv_saate_ohje') + ')</span></div><textarea data-mv-saate rows="2" maxlength="' + MAX_SAATE + '" oninput="' + esc(opts.saateFn) + '(this.value)" style="' + KENTTA + ';resize:none">' + esc(S.saate || '') + '</textarea>'
      + (S.suostumusPuuttuu ? '<div data-mv-lupa style="font-size:12px;color:var(--amber);margin-top:8px">' + T('mv_suostumus_puuttuu') + '</div>' : '')
      + '<div style="display:flex;gap:8px;align-items:center;flex-wrap:wrap;margin-top:14px"><button type="button" data-mv-laheta class="kt-nappi kt-nappi-ens" onclick="' + esc(opts.lahetaFn) + '()"' + (S.tallentaa ? ' disabled' : '') + '>'
      + esc(S.suostumusPuuttuu ? _txt(opts, 'mv_tallenna_lupa') : (S.kohde === 'yksi' && S.pelaajanNimi ? _fmt(_txt(opts, 'mv_laheta_pelaajalle'), { nimi: S.pelaajanNimi }) : _txt(opts, 'mv_laheta'))) + '</button><span style="font-size:11px;color:var(--ink3)">' + T('mv_tallentuu_heti') + '</span></div>';
    return '<div id="' + esc(opts.modalId || '_mvModal') + '" role="dialog" aria-modal="true" style="position:fixed;inset:0;background:rgba(0,0,0,.75);z-index:9200;display:flex;align-items:center;justify-content:center;padding:16px" onclick="if(event.target===this)' + esc(opts.suljeFn) + '()"><div style="background:var(--card);color:var(--ink);border:.5px solid var(--border);border-radius:14px;padding:20px;width:540px;max-width:100%;max-height:92vh;overflow-y:auto" onclick="event.stopPropagation()">' + h + '</div></div>';
  }

  /* Inbox-rivi. r = tmMvRivit-rivi; opts: { esc, t, avaaFn(avain) } */
  function tmMvRiviHTML(r, opts) {
    opts = opts || {}; var esc = opts.esc || _esc, T = function (k) { return esc(_txt(opts, k)); }, tilaTeksti;
    if (r.yhteinen) tilaTeksti = T('mv_rivi_joukkue') + ' · ' + esc(r.domain || '') + (r.kohta_s != null ? ' ' + esc(tmMvKohtaTeksti(r.kohta_s)) : '');
    else tilaTeksti = (r.tila === 'vastattu' ? esc(r.pelaajaNimi) + ' ' + T('mv_rivi_vastattu') : r.tila === 'perhe_kuittasi' ? T('mv_rivi_perhe') : r.tila === 'odottaa_lupaa' ? T('mv_rivi_lupa') : r.tila === 'suljettu' ? T('mv_rivi_suljettu') : T('mv_rivi_odottaa') + ' · ' + esc(r.pelaajaNimi));
    var ala = r.yhteinen ? r.n + ' ' + _txt(opts, 'mv_rivi_pelaajia') + ' · ' + r.vastauksia + ' ' + _txt(opts, 'mv_rivi_vastausta') + (r.lupaaOdottaa ? ' · ' + r.lupaaOdottaa + ' ' + _txt(opts, 'mv_rivi_lupaa_odottaa') : '') + ' · „' + r.kysymys + '“'
      : (r.vastaus && (r.vastaus.teksti || r.vastaus.valinta) ? (r.vastaus.teksti || r.vastaus.valinta) : (r.tila === 'odottaa_lupaa' ? _txt(opts, 'mv_rivi_lupa_ohje') : '„' + r.kysymys + '“'));
    return '<div class="mv-rivi" data-mv-rivi="' + esc(r.avain) + '" data-mv-tila="' + esc(r.tila) + '" role="button" tabindex="0" onclick="' + esc(opts.avaaFn + "('" + r.avain + "')") + '" style="display:flex;gap:10px;align-items:flex-start;padding:12px 4px;border-bottom:.5px solid var(--border);cursor:pointer">'
      + '<span aria-hidden="true" style="font-size:15px">🎬</span><span aria-hidden="true" data-mv-piste style="width:8px;height:8px;border-radius:50%;margin-top:6px;flex:none;background:' + (VARI[r.tila] || VARI.odottaa) + '"></span>'
      + '<div style="flex:1;min-width:0"><div style="font-size:13.5px;color:var(--ink)">' + tilaTeksti + '</div><div style="font-size:12px;color:var(--ink3);margin-top:2px;overflow:hidden;text-overflow:ellipsis">' + (r.osa && !r.yhteinen ? esc(r.osa) + ' · ' : '') + esc(ala) + '</div></div><div style="font-size:11px;color:var(--ink3)">' + esc(_aika(r.t)) + '</div></div>';
  }
  /* Ketju (kolme askelta). K: { rivi (tmMvRivit-rivi, yksi pelaaja), saate, vastaus, kuittaus_lause, tallentaa, lause } opts: { esc, t, lauseFn(v), kuittaaFn, suljeFn, saaKuitata } */
  function tmMvKetjuHTML(K, opts) {
    opts = opts || {}; K = K || {}; var esc = opts.esc || _esc, T = function (k) { return esc(_txt(opts, k)); }, r = K.rivi || {}, v = r.vastaus;
    var askel = function (otsikko, teksti, ala) { return '<div style="border-left:2px solid var(--border);padding:2px 0 2px 12px;margin:10px 0"><div style="font-size:11px;text-transform:uppercase;letter-spacing:.05em;color:var(--ink3)">' + esc(otsikko) + '</div>' + teksti + (ala ? '<div style="font-size:11px;color:var(--ink3);margin-top:3px">' + esc(ala) + '</div>' : '') + '</div>'; };
    var h = '<div style="display:flex;justify-content:space-between;align-items:baseline"><div data-mv-ketju-otsikko style="font-family:\'Cormorant Garamond\',serif;font-size:20px">' + T('mv_ketju_otsikko') + ' · ' + esc(r.pelaajaNimi || '') + (r.osa ? ' · ' + esc(r.osa) : '') + '</div><button type="button" aria-label="' + esc(_txt(opts, 'mv_peruuta')) + '" onclick="' + esc(opts.suljeFn) + '()" style="background:none;border:none;color:var(--ink3);font-size:22px;cursor:pointer;padding:0 6px">×</button></div>'
      + '<div style="margin-top:4px">' + _linkkiRivi(esc, T, r) + '</div>'
      + askel(_txt(opts, 'mv_valmentaja'), (r.saate ? '<div style="font-size:14px">' + esc(r.saate) + '</div>' : '') + '<div style="font-size:14px;font-weight:600;margin-top:4px">' + esc(r.kysymys) + '</div>', _txt(opts, 'mv_tyyppi_' + (r.klippityyppi || 'onnistui')) + ' · ' + _aika(r.t))
      + askel(_txt(opts, 'mv_pelaaja'), v && (v.valinta || v.teksti) ? '<div data-mv-vastaus style="font-size:14px">' + esc([v.valinta, v.teksti].filter(Boolean).join(' — ')) + '</div>' : '<div data-mv-ei-vastausta style="font-size:13px;color:var(--ink3)">' + T('mv_ei_vastausta') + '</div>', (v ? _aika(v.aika) : '') + (r.perheKuittasi ? ' · ' + _txt(opts, 'mv_perhe_nahnyt') : ''))
      + askel(_txt(opts, 'mv_kuittaus'), r.kuittaus_lause ? '<div data-mv-kuittaus style="font-size:14px">' + esc(r.kuittaus_lause) + '</div>' : (r.tila === 'suljettu' ? '<div style="font-size:13px;color:var(--ink3)">' + T('mv_rivi_suljettu') + '</div>' : (opts.saaKuitata !== false ? '<textarea data-mv-kuittaus-kentta rows="2" maxlength="' + MAX_KUITTAUS + '" oninput="' + esc(opts.lauseFn) + '(this.value)" style="' + KENTTA + ';resize:none">' + esc(K.lause || '') + '</textarea><div style="font-size:11px;color:var(--ink3);margin:3px 0 8px">' + T('mv_kuittaus_ohje') + '</div><button type="button" data-mv-kuittaa class="kt-nappi kt-nappi-ens" onclick="' + esc(opts.kuittaaFn) + '()"' + (K.tallentaa ? ' disabled' : '') + '>' + T('mv_kuittaa_sulje') + '</button>' : '')));
    return '<div id="' + esc(opts.modalId || '_mvKetju') + '" role="dialog" aria-modal="true" style="position:fixed;inset:0;background:rgba(0,0,0,.75);z-index:9200;display:flex;align-items:center;justify-content:center;padding:16px" onclick="if(event.target===this)' + esc(opts.suljeFn) + '()"><div style="background:var(--card);color:var(--ink);border:.5px solid var(--border);border-radius:14px;padding:20px;width:520px;max-width:100%;max-height:92vh;overflow-y:auto" onclick="event.stopPropagation()">' + h + '</div></div>';
  }
  /* "Klipit" -kortti pelaajan Polussa (henkilökunta): rivit + Lisää klippi. opts: { esc, t, avaaFn, lisaaFn, pid } */
  function tmMvKlipitKorttiHTML(rivit, opts) {
    opts = opts || {}; var esc = opts.esc || _esc, T = function (k) { return esc(_txt(opts, k)); }, l = (Array.isArray(rivit) ? rivit : []).filter(function (r) { return !r.yhteinen || true; });
    return '<div class="kt-kortti" data-mv-klipit style="' + KORTTI + '"><div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:6px"><div class="kt-otsikko-pieni">' + T('mv_klipit') + '</div>'
      + (opts.lisaaFn ? '<button type="button" data-mv-lisaa class="kt-nappi" onclick="' + esc(opts.lisaaFn + "('" + (opts.pid || '') + "')") + '">' + T('mv_lisaa') + '</button>' : '') + '</div>'
      + (l.length ? l.map(function (r) { return tmMvRiviHTML(r, { esc: esc, t: opts.t, avaaFn: opts.avaaFn }); }).join('') : '<div data-mv-tyhja style="font-size:13px;color:var(--ink3)">' + T('mv_ei_klippeja') + '</div>') + '</div>';
  }

  var API = { FI: FI, POHJAT: POHJAT, TYYPIT: TYYPIT, REKISTERIT: REKISTERIT, MAX_URL: MAX_URL, MAX_KYSYMYS: MAX_KYSYMYS, MAX_SAATE: MAX_SAATE, MAX_KUITTAUS: MAX_KUITTAUS, tmMvLinkki: tmMvLinkki, tmMvKohtaTeksti: tmMvKohtaTeksti, tmMvTunnistus: tmMvTunnistus, tmMvRekisteri: tmMvRekisteri, tmMvNakyvyys: tmMvNakyvyys, tmMvPohjat: tmMvPohjat, tmMvNakyvaAlkaen: tmMvNakyvaAlkaen,
    tmMvTeksti: tmMvTeksti, tmMvVirhe: tmMvVirhe, tmMvKlippiDokumentit: tmMvKlippiDokumentit, tmMvTila: tmMvTila, tmMvRivit: tmMvRivit, tmMvKuittaus: tmMvKuittaus, tmMvSheetHTML: tmMvSheetHTML, tmMvRiviHTML: tmMvRiviHTML, tmMvKetjuHTML: tmMvKetjuHTML, tmMvKlipitKorttiHTML: tmMvKlipitKorttiHTML };
  if (typeof module !== 'undefined' && module.exports) module.exports = API; else root.TM_MEDIAVIESTI = API;
})(typeof window !== 'undefined' ? window : this);
