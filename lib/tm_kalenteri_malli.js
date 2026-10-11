/* ════════════════════════════════════════════════════════════════════════
   tm_kalenteri_malli.js — K35-1 · kalenteritapahtuman YKSI malli molemmille sovelluksille (D181, D186; docs/CODE_BRIEF_35_KALENTERI.md).
   PURE. Selainkirjasto (EI kopiota functions/-kansioon: käyttää tm_normisto.js:ää).
   · tmKalNormalisoi(doc, id?) → yksi muoto VP:n (Timestamp) ja Masterin (merkkijono) tapahtumille: alkaaMs/paattyyMs/pvm (Helsingin päivä),
     tyyppi kanonisena (tm_kalenteri_tyypit), joukkue = tallennettu arvo (EI korvata nimellä), poistettu-aika kummastakin muodosta.
   · tmKalKaudenLoppu(nyt) → 'YYYY-MM-DD' toistuvuuden oletus-loppupäivä (yksi kaava; korvaa VP _laskeKausi-loppupään ja Master _calKaudenLoppuISO:n).
     Kevätkausi huhti–heinä → 30.6. · syyskausi elo– → helmikuun viimeinen päivä (karkausvuosi huomioitu) · tammi–helmi → saman vuoden helmikuun loppu ·
     MAALISKUU → 30.6. (ennen: VP ja Master antoivat jo menneen 28.2.).
   · D181 lähteen omistajuus: LAHTEEN_KENTAT · tmKalOnTuotu(ev) · tmKalSaaMuokata(kentta, ev) · tmKalSynkkaPaivitys(nykyinen, lahteesta) → muuttuneet lähteen kentät
     (lähteestä poistunut → { tila:'peruttu' }; TM:n omia kenttiä ei koskaan kosketa).
   · tmTestijaksoEhdotus(viimeisinPvm, opts) → { muistutus, vanhenee } (YYYY-MM-DD) rajat tm_normisto.js:n LUKITUT/asetuksista (MUISTUTUS_KK, VANHA_KK; ei omia vakioita).
   · K35-2 (korjaukset): tmKalTyyppiMuutos(ev, uusiAvain, johto) → muokkauksen tyyppimuutos ({} jos ei muutosta — raaka tyyppi säilyy; muuten {tyyppi, nakyvyys?}) · tmKalKokoPaiva(ev) · tmKalOsuuPaivalle(ev, iso).
   · K35-2: tmKalTuntivali(tapahtumat) → { alku, loppu, tunnit } tuntiruudukon väli = min(15, aikaisin) … max(20, myöhäisin), rajattuna 6–22 (tapahtuma ei katoa) · tmKalTuntiRiville(tunti, vali) ·
     tmKalOletusPaikka(tapahtumat, joukkue, tyyppi) → joukkueen viimeisimmän saman tyypin tapahtuman paikka (D185).
   Dual-export: module.exports || window.TM_KALENTERI_MALLI.
════════════════════════════════════════════════════════════════════════ */
(function (root) {
  'use strict';
  function _lib(f, g) { try { if (typeof module !== 'undefined' && module.exports && typeof require === 'function') return require(f); } catch (e) { /* selain */ } return (root && root[g]) || {}; }
  function _TY() { return _lib('./tm_kalenteri_tyypit.js', 'TM_KALENTERI_TYYPIT'); }
  function _NO() { return _lib('./tm_normisto.js', 'TM_NORMISTO'); }

  /* Aika millisekunneiksi: Firestore Timestamp (toMillis / seconds), Date, ISO-merkkijono, numero. */
  function tmKalMs(x) {
    if (x == null || x === '') return null;
    if (typeof x === 'number') return isFinite(x) ? x : null;
    if (x instanceof Date) return isNaN(x.getTime()) ? null : x.getTime();
    if (typeof x.toMillis === 'function') { try { return x.toMillis(); } catch (e) { return null; } }
    if (typeof x.seconds === 'number') return x.seconds * 1000 + Math.floor((x.nanoseconds || 0) / 1e6);
    if (typeof x === 'string') { var t = Date.parse(x.length === 10 ? x + 'T00:00:00' : x); return isNaN(t) ? null : t; }
    return null;
  }
  var _fmt = null;
  function tmKalPaiva(ms) {   // Helsingin kalenteripäivä 'YYYY-MM-DD'
    if (ms == null) return null;
    try { _fmt = _fmt || new Intl.DateTimeFormat('en-CA', { timeZone: 'Europe/Helsinki', year: 'numeric', month: '2-digit', day: '2-digit' }); return _fmt.format(new Date(ms)); } catch (e) { var d = new Date(ms), z = function (x) { return (x < 10 ? '0' : '') + x; }; return d.getFullYear() + '-' + z(d.getMonth() + 1) + '-' + z(d.getDate()); }
  }

  function tmKalNormalisoi(doc, id) {
    if (!doc || typeof doc !== 'object') return null;
    var a = doc._alkaaMs != null ? doc._alkaaMs : tmKalMs(doc.alkaa != null ? doc.alkaa : doc.pvm), b = doc._paattyyMs != null ? doc._paattyyMs : tmKalMs(doc.paattyy);   // Masterin tapahtuma: alkaa/paattyy 'HH:MM' + _alkaaMs/_paattyyMs (tarkat ajat) → ms-ajat voittavat
    var T = _TY(), tyyppi = T.tmKalTyyppiAvain ? T.tmKalTyyppiAvain(doc.tyyppi) : String(doc.tyyppi || 'muu');
    return {
      id: id != null ? id : (doc.id != null ? doc.id : null),
      tyyppi: tyyppi, tyyppiRaaka: doc.tyyppi || null, nimi: doc.nimi || '',
      alkaaMs: a, paattyyMs: b != null ? b : a, pvm: tmKalPaiva(a), koko_paiva: !!doc.koko_paiva,
      joukkue: doc.joukkue != null ? doc.joukkue : null, joukkue_nimi: doc.joukkue_nimi || null,
      joukkueet: Array.isArray(doc.joukkueet) ? doc.joukkueet.slice() : [], pelaajat_id: Array.isArray(doc.pelaajat_id) ? doc.pelaajat_id.slice() : [],
      kohde: doc.kohde || null, nakyvyys: doc.nakyvyys || null, paikka: doc.paikka || null,
      lahde: doc.lahde || 'manuaalinen', lahde_id: doc.lahde_id || null, tila: doc.tila || 'suunniteltu',
      poistettu: doc.poistettu === true, poistettuMs: tmKalMs(doc.poistettu_pvm),
      toistuvuus_sarja_id: doc.toistuvuus_sarja_id || null, luoja_uid: doc.luoja_uid || null
    };
  }

  function _pvmIso(d) { var z = function (n) { return (n < 10 ? '0' : '') + n; }; return d.getFullYear() + '-' + z(d.getMonth() + 1) + '-' + z(d.getDate()); }
  function tmKalKaudenLoppu(nyt) {
    var n = nyt instanceof Date ? nyt : new Date(tmKalMs(nyt) != null ? tmKalMs(nyt) : Date.now());
    var v = n.getFullYear(), kk = n.getMonth() + 1;
    if (kk >= 3 && kk <= 7) return _pvmIso(new Date(v, 5, 30));
    if (kk >= 8) return _pvmIso(new Date(v + 1, 2, 0));   // helmikuun viimeinen päivä
    return _pvmIso(new Date(v, 2, 0));
  }

  var LAHTEEN_KENTAT = ['alkaa', 'paattyy', 'koko_paiva', 'paikka', 'paikka_id', 'tila'];
  function tmKalOnTuotu(ev) { return !!(ev && ev.lahde && ev.lahde !== 'manuaalinen'); }
  function tmKalSaaMuokata(kentta, ev) { return !tmKalOnTuotu(ev) || LAHTEEN_KENTAT.indexOf(kentta) < 0; }
  /* Lukitut lähdekentät yhdellä kutsulla (tmKalSaaMuokata per kenttä): { alkaa, paattyy, paikka, tila } → true = lukittu */
  function tmKalLukitut(ev) { var o = {}; ['alkaa', 'paattyy', 'paikka', 'tila'].forEach(function (k) { o[k] = !tmKalSaaMuokata(k, ev); }); return o; }
  function _sama(x, y) { var mx = tmKalMs(x), my = tmKalMs(y); if (mx != null || my != null) return mx === my; return (x == null ? null : x) === (y == null ? null : y); }
  function tmKalSynkkaPaivitys(nykyinen, lahteesta) {
    if (!lahteesta) return nykyinen && nykyinen.tila === 'peruttu' ? {} : { tila: 'peruttu' };
    var p = {};
    LAHTEEN_KENTAT.forEach(function (k) {
      if (!Object.prototype.hasOwnProperty.call(lahteesta, k)) return;
      if (k === 'tila' && lahteesta.tila !== 'peruttu' && (!nykyinen || nykyinen.tila !== 'peruttu')) return;   // lähde omistaa vain perumisen
      if (!nykyinen || !_sama(nykyinen[k], lahteesta[k])) p[k] = lahteesta[k];
    });
    return p;
  }

  function _lisaaKk(ms, kk) { var d = new Date(ms); var p = d.getDate(); d.setDate(1); d.setMonth(d.getMonth() + kk); var max = new Date(d.getFullYear(), d.getMonth() + 1, 0).getDate(); d.setDate(Math.min(p, max)); return d; }
  function tmTestijaksoEhdotus(viimeisinPvm, opts) {
    var ms = tmKalMs(viimeisinPvm); if (ms == null) return null;
    var N = _NO(), R = null;
    try { var K = N.tmNormistoKaytto ? N.tmNormistoKaytto(opts && opts.asetukset) : null; R = K && K.R ? K.R : null; } catch (e) { R = null; }
    var L = N.LUKITUT || {}, m = R && typeof R.MUISTUTUS_KK === 'number' ? R.MUISTUTUS_KK : L.MUISTUTUS_KK, v = R && typeof R.VANHA_KK === 'number' ? R.VANHA_KK : L.VANHA_KK;
    if (typeof m !== 'number' || typeof v !== 'number') return null;   // ei hiljaista oletusta: normisto puuttuu → ei ehdotusta
    return { muistutus: _pvmIso(_lisaaKk(ms, m)), vanhenee: _pvmIso(_lisaaKk(ms, v)), muistutusKk: m, vanhaKk: v };
  }

  /* ── K35-2: tuntiruudukon väli. Tapahtuma = { alkaa: 'HH:MM' | tunti (luku) }; päivän kokoiset (ei alkuaikaa) eivät vaikuta. ── */
  var TUNTI_OLETUS = [15, 20], TUNTI_RAJA = [6, 22];
  function _tunti(t) {
    if (!t || t.koko_paiva === true || tmKalKokoPaiva(t)) return null;   // koko päivän tapahtumat ja tauot eivät vaikuta tuntiväliin
    var a = t.alkaa;
    if (typeof a === 'number' && isFinite(a)) return Math.floor(a);
    var m = typeof a === 'string' ? /^(\d{1,2}):\d{2}/.exec(a) : null; return m ? parseInt(m[1], 10) : null;
  }
  /* Koko päivän rivi ("Koko pvm"): koko_paiva === true TAI tyyppi seuran_tauko TAI mentorointi (kanoninen avain, ei raakaa merkkijonoa) */
  function tmKalKokoPaiva(ev) { if (!ev) return false; var a = _TY().tmKalTyyppiAvain ? _TY().tmKalTyyppiAvain(ev.tyyppi) : ev.tyyppi; return ev.koko_paiva === true || a === 'seuran_tauko' || a === 'mentorointitapaaminen'; }
  /* Osuuko (monipäiväinen) tapahtuma päivälle iso? Loppu = päättymishetken Helsingin päivä; täsmälleen keskiyöhön päättyvä jakso ei ulotu seuraavalle päivälle. */
  function tmKalOsuuPaivalle(ev, iso) {
    if (!ev) return false; var a = ev._alkaaMs != null ? ev._alkaaMs : ev.alkaaMs, b = ev._paattyyMs != null ? ev._paattyyMs : ev.paattyyMs;
    var alku = ev.pvm || tmKalPaiva(a); if (!alku) return false; var loppu = b != null ? tmKalPaiva(b) : alku;
    if (b != null && a != null && b > a && tmKalPaiva(b - 1) !== loppu) loppu = tmKalPaiva(b - 1);   // täsmälleen keskiyöhön päättyvä ei ulotu seuraavalle päivälle
    if (loppu < alku) loppu = alku; return iso >= alku && iso <= loppu;
  }
  /* Tyypin muutos muokkauksessa: ei koskaan huomaamatta. Sama tyyppi (kanonisena) → {} (raaka tyyppi — myös vanha/tuntematon — säilyy). Muuten { tyyppi } + nakyvyys, jos
     vain-henkilökunnalle-ominaisuus vaihtuu (TM_RYHMAT.tmOletusNakyvyys) — paitsi kun kohde ratkaisee (ryhmä / poimitut / vain henkilökunta). seuran_tauko ei ole Masterin valinta (D171). */
  function tmKalTyyppiMuutos(ev, uusiAvain, johto) {
    var TY = _TY(); if (!ev || !uusiAvain || !TY.tmKalTyyppiAvain || !TY.TYYPIT || !Object.prototype.hasOwnProperty.call(TY.TYYPIT, uusiAvain)) return {};
    if (uusiAvain === TY.tmKalTyyppiAvain(ev.tyyppi)) return {};
    if (!TY.tmKalTyypitRoolille(!!johto, { tauko: false }).some(function (t) { return t.avain === uusiAvain; })) return {};
    var ulos = { tyyppi: uusiAvain }, vanhaHk = TY.tmKalVainHenkilokunta(ev.tyyppi), uusiHk = TY.tmKalVainHenkilokunta(uusiAvain), k = ev.kohde && ev.kohde.tyyppi;
    if (vanhaHk !== uusiHk && k !== 'ryhma' && k !== 'pelaajat' && k !== 'henkilokunta') { var R = _lib('./tm_ryhmat.js', 'TM_RYHMAT'); ulos.nakyvyys = R.tmOletusNakyvyys ? R.tmOletusNakyvyys(uusiAvain) : (uusiHk ? 'henkilokunta' : 'kaikki'); }
    return ulos;
  }
  function tmKalTuntivali(tapahtumat) {
    var alku = TUNTI_OLETUS[0], loppu = TUNTI_OLETUS[1];
    (Array.isArray(tapahtumat) ? tapahtumat : []).forEach(function (t) { var h = _tunti(t); if (h == null) return; if (h < alku) alku = h; if (h > loppu) loppu = h; });
    alku = Math.max(TUNTI_RAJA[0], Math.min(alku, TUNTI_OLETUS[0])); loppu = Math.min(TUNTI_RAJA[1], Math.max(loppu, TUNTI_OLETUS[1]));
    var tunnit = []; for (var h = alku; h <= loppu; h++) tunnit.push(h);
    return { alku: alku, loppu: loppu, tunnit: tunnit };
  }
  function tmKalTuntiRiville(tunti, vali) { var h = Number(tunti); if (!isFinite(h)) h = vali.alku; return Math.max(vali.alku, Math.min(vali.loppu, h)); }   // rajan ulkopuolinen (esim. 05, 23) → lähin rivi, ei katoa
  /* Päivän muokkaus (D185): vuorokausien ero ja siirto ISO-päivillä (UTC-aritmetiikka → ei kesäaikaharhaa). Sarjassa kaikkia valitun laajuuden tapahtumia siirretään saman verran. */
  function _utc(iso) { var m = /^(\d{4})-(\d{2})-(\d{2})/.exec(String(iso || '')); return m ? Date.UTC(+m[1], +m[2] - 1, +m[3]) : null; }
  function tmKalPaivaEro(uusi, vanha) { var a = _utc(uusi), b = _utc(vanha); return a == null || b == null ? 0 : Math.round((a - b) / 86400000); }
  function tmKalSiirraPaiva(iso, vrk) { var u = _utc(iso); if (u == null) return iso; var d = new Date(u + (Number(vrk) || 0) * 86400000), z = function (n) { return (n < 10 ? '0' : '') + n; }; return d.getUTCFullYear() + '-' + z(d.getUTCMonth() + 1) + '-' + z(d.getUTCDate()); }
  function tmKalOletusPaikka(tapahtumat, joukkue, tyyppi) {
    var TY = _TY(), avain = TY.tmKalTyyppiAvain ? TY.tmKalTyyppiAvain(tyyppi) : tyyppi, paras = null;
    (Array.isArray(tapahtumat) ? tapahtumat : []).forEach(function (t) {
      if (!t || typeof t.paikka !== 'string' || !t.paikka.trim() || t.poistettu === true) return;
      if ((TY.tmKalTyyppiAvain ? TY.tmKalTyyppiAvain(t.tyyppi) : t.tyyppi) !== avain) return;
      if (joukkue && (t.joukkue_nimi || t.joukkue || '') !== joukkue) return;
      var k = String(t.pvm || '') + ' ' + String(typeof t.alkaa === 'string' ? t.alkaa : '');
      if (!paras || k >= paras.k) paras = { k: k, p: t.paikka.trim() };
    });
    return paras ? paras.p : '';
  }

  var API = { tmKalTyyppiMuutos: tmKalTyyppiMuutos, tmKalKokoPaiva: tmKalKokoPaiva, tmKalOsuuPaivalle: tmKalOsuuPaivalle, tmKalPaivaEro: tmKalPaivaEro, tmKalSiirraPaiva: tmKalSiirraPaiva, tmKalLukitut: tmKalLukitut, tmKalTuntivali: tmKalTuntivali, tmKalTuntiRiville: tmKalTuntiRiville, tmKalOletusPaikka: tmKalOletusPaikka, tmKalMs: tmKalMs, tmKalPaiva: tmKalPaiva, tmKalNormalisoi: tmKalNormalisoi, tmKalKaudenLoppu: tmKalKaudenLoppu, LAHTEEN_KENTAT: LAHTEEN_KENTAT, tmKalOnTuotu: tmKalOnTuotu, tmKalSaaMuokata: tmKalSaaMuokata, tmKalSynkkaPaivitys: tmKalSynkkaPaivitys, tmTestijaksoEhdotus: tmTestijaksoEhdotus };
  if (typeof module !== 'undefined' && module.exports) module.exports = API; else if (root) root.TM_KALENTERI_MALLI = API;
})(typeof window !== 'undefined' ? window : null);
