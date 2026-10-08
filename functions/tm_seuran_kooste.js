/* ════════════════════════════════════════════════════════════════════════
   tm_seuran_kooste.js — Seuran pulssi S1 (docs/CODE_BRIEF_S1_SEURAN_PULSSI.md; design 17, D40–D45): viikkokoosteen PURE-laskenta (ei Firebasea, ei DOM:ia, ei kelloa).
   Ajetaan palvelimella (functions/seuran_kooste.js) ja testataan fixtuureilla. Tiedosto kopioidaan functions/-kansioon (functions/jaettu_lib.json + tests/functions_jaettu_lib.test.js).

   VAIN LUKUMÄÄRIÄ (osoittaja ja nimittäjä erikseen). Prosentit, liikennevalot ja "pieni joukkue" -sääntö lasketaan selaimessa (S2). EI nimiä (pelaajan), pelaaja-ID:itä, vapaatekstiä.
   Neljä prosessimittaria joukkueittain:
     jakso                      joukkueella voimassa oleva joukkuejakso (tmJoukkuejaksoVoimassa) kyllä/ei · jakso_nimi (teema)
     n_pelaajat / n_jaksolla    pelaajat jaksolla = kaikki muut tmJaksoTilan tilat paitsi 'ei_jaksoa'; alatilat n_valinta_odottaa (valittavana + valinta_tehty) ja n_katselmus ('paattynyt', ei suljettu) ovat n_jaksolla:n osajoukkoja
     n_vastanneet / n_vastausperusta   viikkokatsaus: perusta = tila 'kaynnissa' | 'vahvistettu', EI Leikkijä; vastannut = viikkokatsaukset/{sunnuntain pvm} on olemassa
     n_katselmus_ajallaan / n_katselmus_perusta   perusta = jaksot, joiden katselmusikkuna (jakson päättyminen + 14 pv, D21) sulkeutui TÄLLÄ viikolla (jokainen jakso lasketaan kerran → trendi);
                                ajallaan = suljettu (jaksofokus_historia, sulkutapa 'suljettu') ikkunassa TAI reviewit/{pvm} (täysi katselmus) ikkunassa. 'korvattu' ja sulkutavaton rivi eivät ole katselmus → ei perustaan.
   Pelaaja kahdessa joukkueessa (joukkue + joukkueet[], §7.18) lasketaan KUMPAAN joukkueeseen. Jakson tila = tmJaksoTila (tm_aloita_jakso.js) — SAMA funktio kuin kehitystyöpöydällä.
   Ajoteknisesti kaksivaiheinen (palvelin hakee puuttuvat dokumentit välissä):
     a = tmKoosteAnalysoi(syote)                → { ehdokkaat:[pid] (viikkokatsaus haettavaksi), katselmukset:[{i, pid, alkuPvm, loppuPvm}] (reviewit-haku), … }
     doc = tmKoosteTulos(a, { vastanneet:[pid], katselmusLoytyi:[i] }, { vk, arvio })
   syote: { joukkueet:[{id, nimi, ikaryhma, jaksofokus}], pelaajat:[{id, joukkue, joukkueet, syntymaVuosi, jaksofokus, jaksofokus_historia, ydinvahvuus, ydinvahvuus_valinta, idp_sitoumus_pvm}],
            aika:{ alkuMs (viikon alku, ma 00:00 Helsinki), loppuMs (seuraavan viikon alku), arvioMs (tilan arviointihetki, su 21:00 tai aiemmin), nytMs (todellinen nyt), vuosi (Helsingin kalenterivuosi) } }
   Dual-export: module.exports || window.TM_SEURAN_KOOSTE.
════════════════════════════════════════════════════════════════════════ */
(function (root) {
  'use strict';
  var DAY = 86400000, KATSELMUS_PV = 14, VERSIO = 1;
  function _req(g, f) { try { return (typeof module !== 'undefined' && module.exports && typeof require === 'function') ? require(f) : (root && root[g]); } catch (e) { return root && root[g]; } }
  function _AJ() { return _req('TM_ALOITA_JAKSO', './tm_aloita_jakso.js'); }
  function _JJ() { return _req('TM_JOUKKUEJAKSO', './tm_joukkuejakso.js'); }
  function _IV() { return _req('TM_IKAVAIHE', './tm_ikavaihe.js'); }
  function _ms(v) { var t = v ? new Date(v).getTime() : NaN; return t; }
  var _fmt = null;
  function pvmHelsinki(ms) {   // 'YYYY-MM-DD' Helsingin ajassa
    if (!_fmt) _fmt = new Intl.DateTimeFormat('en-CA', { timeZone: 'Europe/Helsinki', year: 'numeric', month: '2-digit', day: '2-digit' });
    return _fmt.format(new Date(ms));
  }
  function _kesto(jf) { return Number(jf && jf.kesto_vk) > 0 ? Number(jf.kesto_vk) : 4; }   // sama oletus kuin tmJaksoTila
  function _sisaltaa(p, j) {   // §7.18: joukkue (nimi) TAI joukkueet[] (ID, varalta nimi)
    if (p.joukkue != null && j.nimi != null && String(p.joukkue).trim().toLowerCase() === String(j.nimi).trim().toLowerCase()) return true;
    return Array.isArray(p.joukkueet) && p.joukkueet.some(function (x) { return x === j.id || (j.nimi != null && String(x).trim().toLowerCase() === String(j.nimi).trim().toLowerCase()); });
  }
  function _tyhja(j, ikavaihe, voimassa) {
    var o = { nimi: j.nimi != null ? String(j.nimi) : '', ikavaihe: ikavaihe, jakso: !!voimassa.voimassa, n_pelaajat: 0, n_jaksolla: 0, n_valinta_odottaa: 0, n_katselmus: 0, n_vastanneet: 0, n_vastausperusta: 0, n_katselmus_ajallaan: 0, n_katselmus_perusta: 0 };
    if (voimassa.voimassa && voimassa.nimi) o.jakso_nimi = voimassa.nimi;
    return o;
  }

  function tmKoosteAnalysoi(s) {
    s = s || {}; var a = s.aika || {}, AJ = _AJ(), JJ = _JJ(), IV = _IV();
    if (!AJ || !JJ || !IV) throw new Error('tm_seuran_kooste: tm_aloita_jakso / tm_joukkuejakso / tm_ikavaihe puuttuu');
    var arvioMs = a.arvioMs, nytMs = a.nytMs != null ? a.nytMs : arvioMs, tanaan = pvmHelsinki(arvioMs);
    var joukkueet = Array.isArray(s.joukkueet) ? s.joukkueet : [], pelaajat = Array.isArray(s.pelaajat) ? s.pelaajat : [];
    var tulos = {}, jidt = [];
    joukkueet.forEach(function (j) {
      if (!j || !j.id) return;
      tulos[j.id] = _tyhja(j, IV.tmIkavaihe(JJ.tmJoukkueenIka(j)), JJ.tmJoukkuejaksoVoimassa(j, tanaan)); jidt.push(j.id);
    });
    var ehdokkaat = [], katselmukset = [], kats = [], vastausMukana = [];   // kats[i] = { jids:[…], ajallaan:true|false|null(=haku ratkaisee), i }
    pelaajat.forEach(function (p) {
      if (!p || !p.id) return;
      var mukana = joukkueet.filter(function (j) { return j && j.id && _sisaltaa(p, j); }); if (!mukana.length) return;
      var jf = p.jaksofokus, tila = AJ.tmJaksoTila(p, { nyt: arvioMs }).tila;
      var ika = IV.tmPelaajaIka(p.syntymaVuosi, a.vuosi, p.joukkue || (mukana[0] && mukana[0].nimi)), leikkija = IV.tmIkavaihe(ika) === 'leikkija';
      var vastausperusta = (tila === 'kaynnissa' || tila === 'vahvistettu') && !leikkija;
      if (vastausperusta) { ehdokkaat.push(p.id); vastausMukana.push({ id: p.id, jids: mukana.map(function (j) { return j.id; }) }); }
      // katselmusikkunat, jotka sulkeutuivat tällä viikolla (loppu ∈ (alku, loppu])
      var rivit = [];
      (Array.isArray(p.jaksofokus_historia) ? p.jaksofokus_historia : []).forEach(function (r) {
        if (!r || r.sulkutapa !== 'suljettu') return;
        var loppu = _ms(r.paattyi); if (isNaN(loppu)) return;
        var ikkuna = loppu + KATSELMUS_PV * DAY; if (!(ikkuna > a.alkuMs && ikkuna <= a.loppuMs)) return;
        var suljettu = _ms(r.suljettu); if (isNaN(suljettu)) suljettu = loppu;
        rivit.push({ loppu: loppu, ikkuna: ikkuna, ajallaan: suljettu <= ikkuna });
      });
      if (tila === 'paattynyt') {   // ei suljettu, päättynyt: myöhässä jos ikkuna on umpeutunut (ja tällä viikolla)
        var alku = _ms(jf && jf.alkoi), loppu2 = isNaN(alku) ? NaN : alku + _kesto(jf) * 7 * DAY, ikkuna2 = loppu2 + KATSELMUS_PV * DAY;
        if (!isNaN(loppu2) && ikkuna2 > a.alkuMs && ikkuna2 <= a.loppuMs && ikkuna2 <= nytMs) rivit.push({ loppu: loppu2, ikkuna: ikkuna2, ajallaan: false });
      }
      var kPerusta = [];
      rivit.forEach(function (r) {
        var item = { jids: mukana.map(function (j) { return j.id; }), ajallaan: r.ajallaan, i: null };
        if (!r.ajallaan) { item.i = katselmukset.length; katselmukset.push({ i: item.i, pid: p.id, alkuPvm: pvmHelsinki(r.loppu), loppuPvm: pvmHelsinki(r.ikkuna) }); }   // täysi katselmus ilman sulkemista (reviewit/{pvm}) voi pelastaa
        kats.push(item); kPerusta.push(item);
      });
      mukana.forEach(function (j) {
        var o = tulos[j.id]; o.n_pelaajat++;
        if (tila !== 'ei_jaksoa') o.n_jaksolla++;
        if (tila === 'valittavana' || tila === 'valinta_tehty') o.n_valinta_odottaa++;
        if (tila === 'paattynyt') o.n_katselmus++;
        if (vastausperusta) o.n_vastausperusta++;
        o.n_katselmus_perusta += kPerusta.length;
        o.n_katselmus_ajallaan += kPerusta.filter(function (k) { return k.ajallaan; }).length;
      });
    });
    return { tulos: tulos, ehdokkaat: ehdokkaat, katselmukset: katselmukset, _kats: kats, _vastausMukana: vastausMukana, jidt: jidt };
  }

  function tmKoosteTulos(analyysi, ulkoiset, meta) {
    ulkoiset = ulkoiset || {}; meta = meta || {};
    var vast = {}, loyt = {}; (ulkoiset.vastanneet || []).forEach(function (x) { vast[x] = true; }); (ulkoiset.katselmusLoytyi || []).forEach(function (i) { loyt[i] = true; });
    var joukkueet = {};
    analyysi.jidt.forEach(function (jid) { joukkueet[jid] = Object.assign({}, analyysi.tulos[jid]); });
    analyysi._vastausMukana.forEach(function (x) { if (vast[x.id]) x.jids.forEach(function (jid) { joukkueet[jid].n_vastanneet++; }); });
    analyysi._kats.forEach(function (k) { if (k.i != null && loyt[k.i]) k.jids.forEach(function (jid) { joukkueet[jid].n_katselmus_ajallaan++; }); });
    var doc = { vk: meta.vk, versio: VERSIO, joukkueet: joukkueet };
    if (meta.arvio) doc.arvio = true;
    return doc;
  }

  /* kooste_joukkue/{jid}_{vk}: sama sisältö joukkueittain (mittarit) → valmentaja lukee vain oman joukkueensa. */
  function tmKoosteJoukkueDokumentit(doc) {
    return Object.keys(doc.joukkueet || {}).map(function (jid) {
      var d = { vk: doc.vk, jid: jid, versio: doc.versio, mittarit: Object.assign({}, doc.joukkueet[jid]) };
      if (doc.arvio) d.arvio = true;
      return { id: jid + '_' + doc.vk, data: d };
    });
  }

  /* Tietosuojavartija: koosteessa ei saa olla pelaajan nimeä, ID:tä tai vapaatekstiä. Palauttaa löydetyt rikkomukset (tyhjä = ok). 'nimi' sallittu VAIN joukkueen nimenä (joukkueet.*.nimi / mittarit.nimi). */
  var KIELLETYT = ['etunimi', 'sukunimi', 'pelaajaId', 'pelaaja_id', 'pelaajat_id', 'pid', 'teksti', 'lause', 'muistiinpano', 'email', 'huoltajaEmail', 'pin', 'palloId', 'uid'];
  function tmKoosteRikkomukset(doc) {
    var r = [];
    (function kavele(o, polku) {
      if (o == null || typeof o !== 'object') return;
      Object.keys(o).forEach(function (k) {
        var p = polku ? polku + '.' + k : k;
        if (KIELLETYT.indexOf(k) >= 0) r.push(p);
        else if (k === 'nimi' && !/^(joukkueet\.[^.]+|mittarit)\.nimi$/.test(p)) r.push(p);
        var v = o[k];
        if (v !== null && typeof v === 'object' && !Array.isArray(v)) kavele(v, p); else if (Array.isArray(v)) r.push(p + ' (taulukko)');
      });
    })(doc, '');
    return r;
  }

  var API = { VERSIO: VERSIO, KATSELMUS_PV: KATSELMUS_PV, pvmHelsinki: pvmHelsinki, tmKoosteAnalysoi: tmKoosteAnalysoi, tmKoosteTulos: tmKoosteTulos, tmKoosteJoukkueDokumentit: tmKoosteJoukkueDokumentit, tmKoosteRikkomukset: tmKoosteRikkomukset };
  if (typeof module !== 'undefined' && module.exports) module.exports = API; else root.TM_SEURAN_KOOSTE = API;
})(typeof window !== 'undefined' ? window : this);
