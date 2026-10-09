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
   VERSIO 2 (S1.1 Käyttöaste, docs/CODE_BRIEF_S1_1_KAYTTOASTE.md) — viisi uutta lukumäärää joukkueittain (osoittajat; nimittäjä = n_pelaajat):
     n_suostumus        suostumus annettu (syöte p.suostumus, palvelin: suostumusAnnettu)
     n_kirjautunut_30   pelaajan viimeisinKirjautuminen ≤ 30 pv ennen arviointihetkeä (päivä)
     n_huoltaja_30      huoltajaViimeisinKaynti ≤ 30 pv (kenttä kirjoitetaan palvelimella; ennen deployta 0)
     n_aktiivinen_7 / n_aktiivinen_30   pelaajalla tai huoltajalla JOKIN OMA KIRJOITUS ikkunassa (7 / 30 pv, Helsingin päivät, arviointihetkeen asti). Syöte p.oma = päivämäärälista (palvelin kerää
                        lähteistä: kirjaukset/{pvm}, viikkokatsaukset/{pvm}, kalenterin lasnaolijat-saatavuus, klippivastaus/-kuittaus, ydinvahvuus_valinta, idp_sitoumus_pvm, d3_pvm, streak_paivitetty).
                        Kirjautuminen EI ole oma kirjoitus (se on erillinen mittari).
   VERSIO 4 (S2 Seuran pulssi, docs/CODE_BRIEF_S2_SEURAN_PULSSI.md "Kooste v4"; D65, D70, D71, D50) — joukkueittain kaksi asetusta ja kaksi lukumäärää (+ sama kaksi `yhteensa`-lukuna, uniikit pelaajat):
     tyyppi / profiili  joukkueen asetukset: 'kilpa'|'harraste' (puuttuva tai tuntematon → 'kilpa', D70) · 'ammatti'|'oto' (syöte j.valmentajaprofiili; puuttuva → 'oto', D50 — sama oletus kuin tm_tanaan_signaali.js)
     n_toiminto_7       pelaaja tai huoltaja teki 7 pv:ssä SILMUKAN TOIMINNON (D65). Syöte p.toiminto = päivämäärälista; palvelin kerää VAIN: viikkokatsaus vastattu · ydinvahvuus_valinta (valittu_pvm) · klippivastaus/-kuittaus (R6.4) ·
                        huoltajan jakso_kuittaus. EI kirjaukset, EI kalenterin läsnäolo/RSVP, EI kirjautuminen, EI sitoumus/itsearvio (nämä jäävät n_aktiivinen_*:een, joka säilyy Adminin Käyttöasteessa ennallaan).
     n_perhe_kuittaus_7 Leikkijä (D71): leikkijä-ikävaiheen pelaajia, joiden perhe kuittasi 7 pv:ssä. Syöte p.perhe = päivämäärälista (klippi_kuittaus [huoltaja] + jakso_kuittaus). Muilla ikävaiheilla aina 0.
   VERSIO 5 (Kooste v5, D119; docs/CODE_BRIEF_KOOSTE_V5_D119.md) — joukkueittain + `yhteensa` (uniikit pelaajat) kaksi uutta lukumäärää, vanhat ennallaan (n_toiminto_7 säilyy vertailua varten):
     n_harjoite_7 / n_harjoite_30   pelaaja MERKITSI HARJOITTEEN TEHDYKSI 7 / 30 pv:n ikkunassa (pulssin Käyttö, D119). Syöte p.harjoite = päivämäärälista; palvelin kerää kirjaukset/{pvm}-dokumenteista:
                        tehty === true · lahde === 'pelaaja' · kirjaustapa !== 'auto' · tyyppi T|D|S|P (ei jalkapallo/muu_urheilu/lepo) TAI takautuva.tyyppi T|D|S|P. Vain jakso_kuittaus-dokumentti ei ole harjoite.
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
  var DAY = 86400000, KATSELMUS_PV = 14, VERSIO = 5;
  function _req(g, f) { try { return (typeof module !== 'undefined' && module.exports && typeof require === 'function') ? require(f) : (root && root[g]); } catch (e) { return root && root[g]; } }
  function _AJ() { return _req('TM_ALOITA_JAKSO', './tm_aloita_jakso.js'); }
  function _JJ() { return _req('TM_JOUKKUEJAKSO', './tm_joukkuejakso.js'); }
  function _IV() { return _req('TM_IKAVAIHE', './tm_ikavaihe.js'); }
  /* tmPelaajanJoukkueet (lib/tm_joukkue.js): YKSI jäsenyyssääntö — joukkueet[] on totuus, `joukkue` vain näyttönimi (§7.18). Selaimessa globaali, Nodessa require. */
  function _PJ() { try { if (typeof module !== 'undefined' && module.exports && typeof require === 'function') return require('./tm_joukkue.js').tmPelaajanJoukkueet; } catch (e) { /* ei */ } return root && root.tmPelaajanJoukkueet; }
  function _ms(v) { var t = v ? new Date(v).getTime() : NaN; return t; }
  var _fmt = null;
  function pvmHelsinki(ms) {   // 'YYYY-MM-DD' Helsingin ajassa
    if (!_fmt) _fmt = new Intl.DateTimeFormat('en-CA', { timeZone: 'Europe/Helsinki', year: 'numeric', month: '2-digit', day: '2-digit' });
    return _fmt.format(new Date(ms));
  }
  /* Päivämäärä → 'YYYY-MM-DD' (Helsinki). Hyväksyy 'YYYY-MM-DD', ISO-aikaleiman, ms:n ja Date:n; muu → null. */
  function _pvm(v) {
    if (v == null || v === '') return null;
    if (typeof v === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(v)) return v;
    var t = typeof v === 'number' ? v : (v instanceof Date ? v.getTime() : _ms(v));
    return isNaN(t) ? null : pvmHelsinki(t);
  }
  function _ikkunassa(pvm, alku, loppu) { return pvm != null && pvm >= alku && pvm <= loppu; }   // merkkijonovertailu: ISO-päivä on leksikaalisesti järjestetty
  function _kesto(jf) { return Number(jf && jf.kesto_vk) > 0 ? Number(jf.kesto_vk) : 4; }   // sama oletus kuin tmJaksoTila
  function _tyhja(j, ikavaihe, voimassa) {
    var o = { nimi: j.nimi != null ? String(j.nimi) : '', ikavaihe: ikavaihe, tyyppi: j.tyyppi === 'harraste' ? 'harraste' : 'kilpa', profiili: j.valmentajaprofiili === 'ammatti' ? 'ammatti' : 'oto', jakso: !!voimassa.voimassa, n_pelaajat: 0, n_jaksolla: 0, n_valinta_odottaa: 0, n_katselmus: 0, n_vastanneet: 0, n_vastausperusta: 0, n_katselmus_ajallaan: 0, n_katselmus_perusta: 0, n_suostumus: 0, n_kirjautunut_30: 0, n_huoltaja_30: 0, n_aktiivinen_7: 0, n_aktiivinen_30: 0, n_toiminto_7: 0, n_perhe_kuittaus_7: 0, n_harjoite_7: 0, n_harjoite_30: 0 };
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
    var d7 = pvmHelsinki(arvioMs - 6 * DAY), d30 = pvmHelsinki(arvioMs - 29 * DAY);   // ikkunat päättyvät arviointihetken päivään (tulevaisuuden päivät eivät lasketa)
    var yht = { n_pelaajat: 0, n_ilman_joukkuetta: 0, n_suostumus: 0, n_kirjautunut_30: 0, n_huoltaja_30: 0, n_aktiivinen_7: 0, n_aktiivinen_30: 0, n_toiminto_7: 0, n_perhe_kuittaus_7: 0, n_harjoite_7: 0, n_harjoite_30: 0 };
    var ehdokkaat = [], katselmukset = [], kats = [], vastausMukana = [];   // kats[i] = { jids:[…], ajallaan:true|false|null(=haku ratkaisee), i }
    pelaajat.forEach(function (p) {
      if (!p || !p.id) return;
      var PJ = _PJ(); if (!PJ) throw new Error('tm_seuran_kooste: tm_joukkue.js (tmPelaajanJoukkueet) puuttuu');
      var jasenIds = PJ(p, joukkueet), mukana = joukkueet.filter(function (j) { return j && j.id && jasenIds.indexOf(j.id) >= 0; });
      // Seuran yhteensä-luvut UNIIKEISTA pelaajista (ei joukkueiden summaa: monijoukkueinen pelaaja lasketaan kerran). Pelaaja ilman joukkuetta on mukana yhteensä-luvuissa.
      var oma = (Array.isArray(p.oma) ? p.oma : []).map(_pvm).filter(function (x) { return x != null; });
      var akt7 = oma.some(function (x) { return _ikkunassa(x, d7, tanaan); }), akt30 = oma.some(function (x) { return _ikkunassa(x, d30, tanaan); });
      var kirj30 = _ikkunassa(_pvm(p.viimeisinKirjautuminen), d30, tanaan), huolt30 = _ikkunassa(_pvm(p.huoltajaViimeisinKaynti), d30, tanaan);
      // v4: silmukan toiminnot + leikkijä-perhe (ikävaihe samasta lähteestä kuin viikkokatsauksen perusta; joukkueeton pelaaja: p.joukkue)
      var ikaV = IV.tmPelaajaIka(p.syntymaVuosi, a.vuosi, p.joukkue || (mukana[0] && mukana[0].nimi)), leikkijaV = IV.tmIkavaihe(ikaV) === 'leikkija';
      var toim7 = (Array.isArray(p.toiminto) ? p.toiminto : []).map(_pvm).some(function (x) { return _ikkunassa(x, d7, tanaan); });
      var perhe7 = leikkijaV && (Array.isArray(p.perhe) ? p.perhe : []).map(_pvm).some(function (x) { return _ikkunassa(x, d7, tanaan); });
      var har = (Array.isArray(p.harjoite) ? p.harjoite : []).map(_pvm), har7 = har.some(function (x) { return _ikkunassa(x, d7, tanaan); }), har30 = har.some(function (x) { return _ikkunassa(x, d30, tanaan); });   // v5 (D119)
      yht.n_pelaajat++; if (!mukana.length) yht.n_ilman_joukkuetta++;
      if (toim7) yht.n_toiminto_7++; if (perhe7) yht.n_perhe_kuittaus_7++; if (har7) yht.n_harjoite_7++; if (har30) yht.n_harjoite_30++;
      if (p.suostumus === true) yht.n_suostumus++; if (kirj30) yht.n_kirjautunut_30++; if (huolt30) yht.n_huoltaja_30++; if (akt7) yht.n_aktiivinen_7++; if (akt30) yht.n_aktiivinen_30++;
      if (!mukana.length) return;
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
        if (p.suostumus === true) o.n_suostumus++;
        if (kirj30) o.n_kirjautunut_30++;
        if (huolt30) o.n_huoltaja_30++;
        if (akt7) o.n_aktiivinen_7++;
        if (akt30) o.n_aktiivinen_30++;
        if (toim7) o.n_toiminto_7++;
        if (perhe7) o.n_perhe_kuittaus_7++;
        if (har7) o.n_harjoite_7++;
        if (har30) o.n_harjoite_30++;
        if (tila !== 'ei_jaksoa') o.n_jaksolla++;
        if (tila === 'valittavana' || tila === 'valinta_tehty') o.n_valinta_odottaa++;
        if (tila === 'paattynyt') o.n_katselmus++;
        if (vastausperusta) o.n_vastausperusta++;
        o.n_katselmus_perusta += kPerusta.length;
        o.n_katselmus_ajallaan += kPerusta.filter(function (k) { return k.ajallaan; }).length;
      });
    });
    return { tulos: tulos, yhteensa: yht, ehdokkaat: ehdokkaat, katselmukset: katselmukset, _kats: kats, _vastausMukana: vastausMukana, jidt: jidt };
  }

  function tmKoosteTulos(analyysi, ulkoiset, meta) {
    ulkoiset = ulkoiset || {}; meta = meta || {};
    var vast = {}, loyt = {}; (ulkoiset.vastanneet || []).forEach(function (x) { vast[x] = true; }); (ulkoiset.katselmusLoytyi || []).forEach(function (i) { loyt[i] = true; });
    var joukkueet = {};
    analyysi.jidt.forEach(function (jid) { joukkueet[jid] = Object.assign({}, analyysi.tulos[jid]); });
    analyysi._vastausMukana.forEach(function (x) { if (vast[x.id]) x.jids.forEach(function (jid) { joukkueet[jid].n_vastanneet++; }); });
    analyysi._kats.forEach(function (k) { if (k.i != null && loyt[k.i]) k.jids.forEach(function (jid) { joukkueet[jid].n_katselmus_ajallaan++; }); });
    var doc = { vk: meta.vk, versio: VERSIO, yhteensa: Object.assign({}, analyysi.yhteensa), joukkueet: joukkueet };
    if (meta.arvio) doc.arvio = true;
    return doc;
  }

  /* Neljän viikon trendi (Admin/VP): koosteet vanhin→uusin, mitta = kenttä (esim. 'n_aktiivinen_30'), jaettuna n_pelaajat:lla JOUKKUEIDEN YLI SUMMATTUNA (tai vain joukkue jid, jos annettu). Seurataso: versio 3 -dokumentin `yhteensa` (uniikit pelaajat); v2-dokumentti → joukkueiden summa (monijoukkueiset tuplalaskettu). Palauttaa
     { nyt: {osoittaja, nimittaja, pros}, edellinen: {…}|null, suunta: 'ylos'|'alas'|'sama'|null }. Tyhjä/yksi viikko → edellinen null. v1-dokumentit (kenttä puuttuu) → ohitetaan. */
  function tmKoosteTrendi(koosteet, kentta, jid) {
    var rivit = (Array.isArray(koosteet) ? koosteet : []).map(function (d) {
      var o = 0, n = 0, on = false;
      if (jid == null && d && d.yhteensa && typeof d.yhteensa[kentta] === 'number') { o = d.yhteensa[kentta]; n = d.yhteensa.n_pelaajat || 0; on = true; return on ? { vk: d.vk, osoittaja: o, nimittaja: n, pros: n > 0 ? Math.round(o * 100 / n) : null } : null; }   // v3: uniikit pelaajat (ei joukkueiden summaa)
      Object.keys((d && d.joukkueet) || {}).forEach(function (id) { if (jid != null && id !== jid) return; var j = d.joukkueet[id]; if (j && typeof j[kentta] === 'number') { on = true; o += j[kentta]; n += j.n_pelaajat || 0; } });
      return on ? { vk: d.vk, osoittaja: o, nimittaja: n, pros: n > 0 ? Math.round(o * 100 / n) : null } : null;
    }).filter(Boolean);
    if (!rivit.length) return { nyt: null, edellinen: null, suunta: null };
    var nyt = rivit[rivit.length - 1], ed = rivit.length > 1 ? rivit[rivit.length - 2] : null;
    var suunta = !ed ? null : (nyt.osoittaja > ed.osoittaja ? 'ylos' : nyt.osoittaja < ed.osoittaja ? 'alas' : 'sama');
    return { nyt: nyt, edellinen: ed, suunta: suunta };
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

  var API = { VERSIO: VERSIO, tmKoosteTrendi: tmKoosteTrendi, KATSELMUS_PV: KATSELMUS_PV, pvmHelsinki: pvmHelsinki, tmKoosteAnalysoi: tmKoosteAnalysoi, tmKoosteTulos: tmKoosteTulos, tmKoosteJoukkueDokumentit: tmKoosteJoukkueDokumentit, tmKoosteRikkomukset: tmKoosteRikkomukset };
  if (typeof module !== 'undefined' && module.exports) module.exports = API; else root.TM_SEURAN_KOOSTE = API;
})(typeof window !== 'undefined' ? window : this);
