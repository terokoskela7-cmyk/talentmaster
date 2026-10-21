/*
 * tm_historiatuonti.js — Excel-tuonnin "uusin voittaa" (docs/suunnitelmat/historiatuonti_suunnitelma.md).
 *
 * Puhtaat funktiot — EI Firestorea, EI DOMia. Sama koodi sovelluksessa (TalentMaster_Excel_Tuonti.html) ja testeissä.
 * Sääntö: historiapohjainen (tai tapahtumapohjainen) tuonti EI korvaa uudempaa dataa pikakentissä.
 *  - H-H-pikakentät testikohtaisesti: testin arvo kirjoitetaan vain jos tuotu pvm >= testin nykyinen pvm (tai testiä ei vielä ole).
 *    hh_viimeisin = yhdistelmä (merge per testi), hh_pvm = uusimman testin pvm (ei taaksepäin).
 *  - Testikohtainen pvm johdetaan hh_historia-aikasarjasta (snapshot jonka arvo == hh_viimeisin[testi]); muuten hh_pvm. Ei uusia kenttiä.
 *  - Ryhmät TKI / FLEI / TSI: sama sääntö ryhmän omalla pvm:llä. *_edellinen vain tiukasti uudemmalla pvm:llä (re-import = ei nolladeltaa).
 *  - testitulokset-dokumentit ja historiasarjat (hh_historia, tki_historia, flei_historia) kirjataan aina — ne ovat historiaa.
 * Käyttö: paata(tila, rivi) → päätös; sovella(tila, update) → seuraava tila (rivit pvm nousevaan, saman pelaajan rivit samasta tilasta).
 */
(function (root) {
  'use strict';

  var HH_AVAIMET = ['lin5m', 'lin10m', 'lin30m', 'cmj', 'mas', 'kasirata', 'sm_juoksu', 'sm_pallo', 'pujottelu', 'syotto'];
  var NIMET = { lin5m: '5 m', lin10m: '10 m', lin30m: '30 m', cmj: 'CMJ', mas: 'MAS', kasirata: 'käsirata', sm_juoksu: 'SM-juoksu', sm_pallo: 'SM-pallo', pujottelu: 'pujottelu', syotto: 'syöttö', tki: 'TKI', flei: 'FLEI', tsi: 'TSI' };
  var FYYSINEN = ['lin5m', 'lin10m', 'lin30m', 'cmj', 'mas', 'sm_juoksu', 'sm_pallo'];   // peilaa tmTestipaivaPatteristot (lib/tm_pvm.js): fyysinen_hh
  var TEKNIIKKA = ['pujottelu', 'syotto'];                                             // tekniikka_hh

  function _num(v) { return typeof v === 'number' && isFinite(v); }
  function _plain(v) {   // tavallinen olio (ei FieldValue/Timestamp/Date/taulukko); toimii myös vm-realmien yli
    if (v == null || typeof v !== 'object' || Array.isArray(v)) return false;
    var p = Object.getPrototypeOf(v); return p === null || (p.constructor && p.constructor.name === 'Object');
  }
  // ISO-päivä (YYYY-MM-DD) merkkijonosta / Date / Timestamp; muuten ''.
  function iso(v) {
    if (v == null || v === '') return '';
    if (typeof v === 'object' && typeof v.toDate === 'function') v = v.toDate();
    if (v instanceof Date) { if (isNaN(v.getTime())) return ''; return v.getFullYear() + '-' + ('0' + (v.getMonth() + 1)).slice(-2) + '-' + ('0' + v.getDate()).slice(-2); }
    var m = String(v).match(/^(\d{4})-(\d{2})-(\d{2})/);
    return m ? m[0] : '';
  }
  function pvmFi(p) { var m = String(p || '').match(/^(\d{4})-(\d{2})-(\d{2})/); return m ? (+m[3]) + '.' + (+m[2]) + '.' + m[1] : ''; }
  function _max(a, b) { return a > b ? a : b; }

  // Testikohtainen pvm olemassa olevalle hh_viimeisin-yhdistelmälle: {testi: 'YYYY-MM-DD'}. Lähde: uusin hh_historia-snapshot jonka
  // arvo == hh_viimeisin[testi]; muuten hh_pvm (varovainen: vanha data ilman historiaa suojataan koko hh_pvm:n verran).
  function perTesti(tila) {
    tila = tila || {};
    var hv = tila.hh_viimeisin || {}, hist = Array.isArray(tila.hh_historia) ? tila.hh_historia : [], vara = iso(tila.hh_pvm), out = {};
    HH_AVAIMET.forEach(function (k) {
      if (!_num(hv[k])) return;
      var p = '';
      hist.forEach(function (s) { if (s && s[k] === hv[k] && iso(s.pvm) > p) p = iso(s.pvm); });
      out[k] = p || vara;
    });
    return out;
  }

  // Ryhmän (TKI/FLEI/TSI) päätös: nyk = ryhmän nykyinen pvm ('' = ei vielä).
  function _ryhma(nyk, pvm, mukana) {
    if (!mukana) return { mukana: false, uusi: false, edellinen: false, ohitettu: false, nyk: nyk };
    return { mukana: true, uusi: !nyk || pvm >= nyk, edellinen: !!nyk && pvm > nyk, ohitettu: !!nyk && pvm < nyk, nyk: nyk };
  }

  // paata(tila, rivi) — rivi: { pvm:'YYYY-MM-DD', hh:{lin30m,cmj,mas,...}, tki:bool, flei:bool, tsi:bool }. EI mutatoi tilaa.
  function paata(tila, rivi) {
    tila = tila || {}; rivi = rivi || {};
    var pvm = iso(rivi.pvm), nyk = perTesti(tila), hv = {}, hhNyk = iso(tila.hh_pvm);
    var vanha = tila.hh_viimeisin || {};
    Object.keys(vanha).forEach(function (k) { hv[k] = vanha[k]; });
    var uudet = [], ohitetut = [];
    HH_AVAIMET.forEach(function (k) {
      var v = rivi.hh && rivi.hh[k];
      if (!_num(v)) return;
      if (nyk[k] === undefined || pvm >= nyk[k]) { hv[k] = v; uudet.push(k); } else ohitetut.push({ avain: k, pvm: nyk[k] });
    });
    var tp = {}, nykTp = tila.testipaivat || {};
    var sovi = function (lista) { return uudet.some(function (k) { return lista.indexOf(k) >= 0; }); };
    [['fyysinen_hh', FYYSINEN], ['tekniikka_hh', TEKNIIKKA]].forEach(function (p) {
      if (sovi(p[1]) && !(iso(nykTp[p[0]]) > pvm)) tp[p[0]] = pvm;
    });
    var tki = _ryhma(iso(tila.tki_pvm) || iso(tila.tk_lajit_pvm), pvm, !!rivi.tki);
    var flei = _ryhma(iso(tila.flei_pvm), pvm, !!rivi.flei);
    var tsi = _ryhma(iso(tila.tsi_pvm), pvm, !!rivi.tsi);
    var uusinNyt = [hhNyk, iso(tila.tki_pvm), iso(tila.tsi_pvm), iso(tila.flei_pvm)].reduce(_max, '');
    var d = {
      pvm: pvm,
      hh: {
        uudet: uudet, ohitetut: ohitetut, muuttuu: uudet.length > 0, viimeisin: uudet.length ? hv : null,
        pvm: uudet.length ? _max(hhNyk, pvm) : hhNyk, pvmMuuttuu: uudet.length > 0 && pvm >= hhNyk,
        edellinen: uudet.length > 0 && !!hhNyk && pvm > hhNyk
      },
      testipaivat: tp, tki: tki, flei: flei, tsi: tsi, onUusin: pvm >= uusinNyt
    };
    d.viesti = viesti(d);
    return d;
  }

  // Esikatseluviesti suomeksi tai null jos mitään ei jätetä päivittämättä.
  function viesti(d) {
    var ohit = d.hh.ohitetut.map(function (o) { return { n: NIMET[o.avain], pvm: o.pvm }; });
    [['tki', d.tki], ['flei', d.flei], ['tsi', d.tsi]].forEach(function (r) { if (r[1].ohitettu) ohit.push({ n: NIMET[r[0]], pvm: r[1].nyk }); });
    if (!ohit.length) return null;
    var pvm = ohit.reduce(function (a, o) { return _max(a, o.pvm); }, '');
    var paivittyy = d.hh.muuttuu || d.tki.uusi || d.flei.uusi || d.tsi.uusi;
    var perus = 'Uudempi tulos jo järjestelmässä (' + pvmFi(pvm) + ') — historia tallennetaan, ';
    return paivittyy ? perus + 'profiilissa ei muutu: ' + ohit.map(function (o) { return o.n; }).join(', ') + '.' : perus + 'profiili ei muutu.';
  }

  // Tuontirivin H-H-pikakenttämuoto skalaaritesteistä (esikatselu; tallennus käyttää omaa reititettyä hhViimeisin-karttaansa).
  function hhRivilta(testit) {
    testit = testit || {}; var out = {};
    var kartta = { lin5m: 'lin5m', lin10m: 'lin10m', lin30m: 'lin30m', cmj: 'hyppy_cj', mas: 'mas', kasirata: 'kasirata', sm_juoksu: 'sm_juoksu', sm_pallo: 'sm_pallo', pujottelu: 'pujottelu_hh', syotto: 'syotto_hh' };
    Object.keys(kartta).forEach(function (k) { var n = parseFloat(testit[kartta[k]]); if (_num(n)) out[k] = n; });
    return out;
  }
  // hh_viimeisin-yhdistelmä → testit-muoto (cmj → hyppy_cj) tasolaskentaa varten.
  function hvTesteiksi(hv) {
    var o = {}; Object.keys(hv || {}).forEach(function (k) { o[k === 'cmj' ? 'hyppy_cj' : k] = hv[k]; });
    return o;
  }

  function _historia() {
    if (root.TM_HISTORIA) return root.TM_HISTORIA;
    if (typeof module !== 'undefined' && module.exports && typeof require === 'function') { try { return require('./tm_historia.js'); } catch (e) { /* ei historiaa */ } }
    return null;
  }

  // paivitys(tila, d, rivi) — pikakenttäpäivitys päätöksestä (esikatselu / kuiva-ajo / testit; sovellus rakentaa omansa laajempana).
  function paivitys(tila, d, rivi) {
    var u = {}, H = _historia(), pvm = d.pvm;
    if (d.hh.muuttuu) { u.hh_viimeisin = d.hh.viimeisin; if (d.hh.pvmMuuttuu) u.hh_pvm = pvm; }
    if (Object.keys(d.testipaivat).length) u.testipaivat = d.testipaivat;
    if (d.tki.uusi) u.tki_pvm = pvm;
    if (d.flei.uusi) u.flei_pvm = pvm;
    if (d.tsi.uusi) u.tsi_pvm = pvm;
    if (H && rivi && rivi.hh && Object.keys(rivi.hh).length) u.hh_historia = H.tmHistoriaLisaa(tila.hh_historia, H.tmHhSnapshot(pvm, { hv: rivi.hh }));
    return u;
  }


  // Toiseksi uusin mittaus historiasarjasta (pvm-järjestys): {arvo, pvm} tai null. f(snapshot) → numero | null.
  function _toiseksiUusin(hist, f) {
    var pisteet = (Array.isArray(hist) ? hist : []).map(function (s) { var v = s ? f(s) : null; return _num(v) ? { arvo: v, pvm: iso(s.pvm) } : null; })
      .filter(function (x) { return x && x.pvm; }).sort(function (a, b) { return a.pvm < b.pvm ? -1 : a.pvm > b.pvm ? 1 : 0; });
    return pisteet.length >= 2 ? pisteet[pisteet.length - 2] : null;
  }
  // *_edellinen historiasta (kehitysvauhti): toiseksi uusin mittaus, riippumaton tuontijärjestyksestä → idempotentti.
  // Palauttaa vain ne kentät joille historiassa on >= 2 pistettä (yksi mittaus → ei edellistä, ei nolladeltaa).
  function edellisetHistoriasta(hhHist, tkiHist) {
    var u = {}, r;
    r = _toiseksiUusin(hhHist, function (s) { return s.hh_taso; });
    if (r) { u.hh_taso_edellinen = r.arvo; u.hh_taso_edellinen_pvm = r.pvm; }
    r = _toiseksiUusin(tkiHist, function (s) { return s.tki; });
    if (r) { u.tki_edellinen = r.arvo; u.tki_edellinen_pvm = r.pvm; }
    r = _toiseksiUusin(hhHist, function (s) { return _num(s.sm_pallo) && _num(s.sm_juoksu) ? Math.round((s.sm_pallo - s.sm_juoksu) * 100) / 100 : null; });
    if (r) { u.tsi_edellinen = r.arvo; u.tsi_edellinen_pvm = r.pvm; }
    return u;
  }

  // Yksikkövirhevaroitukset (VAROITUS, ei estä; arvoja ei muuteta). testit: skalaarit (merkkijono/numero). Tyhjä/ei-numeerinen ei varoita.
  function _fi(n) { return String(n).replace('.', ','); }
  function yksikkoVaroitukset(testit) {
    testit = testit || {}; var out = [];
    var luku = function (k) { var v = testit[k]; if (v == null || String(v).trim() === '') return null; var n = parseFloat(String(v).replace(',', '.')); return isNaN(n) ? null : n; };
    [['hyppy_cj', 'CMJ'], ['hyppy_sj', 'SJ'], ['sj_jump', 'SJ']].forEach(function (t) {
      var n = luku(t[0]);
      if (n != null && n < 5) out.push('Epäilyttävä arvo: ' + t[1] + ' ' + _fi(n) + ' — onko yksikkö cm (ei m)?');
    });
    var k10 = luku('lin10m');
    if (k10 != null && k10 < 1.4) out.push('Epäilyttävä arvo: 10 m ' + _fi(k10) + ' s — alle 1,4 s on epärealistinen, tarkista sekuntiyksikkö.');
    return out;
  }


  // Protokolla–sarake-ristiriita (HARD BLOCK): H-H-testit + tekniikkakilpailu (tai päinvastoin) → virheviesti, muuten null.
  // ids = testi-id:t joissa on dataa. Moniselitteiset pujottelu/syotto (TK-id, H-H:ssa pujottelu_hh/syotto_hh) eivät ratkaise.
  var HH_TESTIT = ['lin5m', 'lin10m', 'lin30m', 'kasirata', 'sm_juoksu', 'sm_pallo', 'hyppy_sj', 'hyppy_cj', 'mas', 'pujottelu_hh', 'syotto_hh'];
  var TK_TESTIT = ['ponnauttelu', 'kuljetus_laukaus', 'pituuspotku'];
  var TESTI_NIMI = { lin5m: '5 m', lin10m: '10 m', lin30m: '30 m', kasirata: 'käsirata', sm_juoksu: 'SM-juoksu', sm_pallo: 'SM-pallo', hyppy_sj: 'SJ', hyppy_cj: 'CMJ', mas: 'MAS', pujottelu_hh: 'pujottelu (H-H)', syotto_hh: 'syöttö (H-H)', ponnauttelu: 'ponnauttelu', kuljetus_laukaus: 'kuljetus-laukaus', pituuspotku: 'pituuspotku' };
  function protokollaRistiriita(ids, protokolla) {
    var onHH = protokolla === 'hh_laaja' || protokolla === 'hh_suppea', onTK = protokolla === 'tekniikkakilpailu';
    if (!onHH && !onTK) return null;
    var lista = Array.isArray(ids) ? ids : [];
    var hh = HH_TESTIT.filter(function (k) { return lista.indexOf(k) >= 0; }), tk = TK_TESTIT.filter(function (k) { return lista.indexOf(k) >= 0; });
    var nimet = function (a) { return a.map(function (k) { return TESTI_NIMI[k]; }).join(', '); };
    if (hh.length && tk.length) return 'Tiedostossa on sekä H-H-testejä (' + nimet(hh) + ') että tekniikkakilpailun testejä (' + nimet(tk) + '). Tuo ne erillisinä tiedostoina oikealla protokollalla.';
    if (onTK && hh.length) return 'Tiedoston testit ovat H-H-testejä. Valitse protokollaksi HH-testi laaja.';
    if (onHH && tk.length) return 'Tiedoston testit ovat tekniikkakilpailun testejä. Valitse protokollaksi Tekniikkakilpailu.';
    return null;
  }

  // sovella(tila, update) — palauttaa seuraavan tilan (Firestore set-merge: sisäkkäiset kartat yhdistyvät, taulukot korvautuvat,
  // FieldValue-sentinellit (ei tavallinen olio) ohitetaan). Ei mutatoi.
  function _yhdista(a, b) {
    var o = {}; Object.keys(a || {}).forEach(function (k) { o[k] = a[k]; });
    Object.keys(b || {}).forEach(function (k) {
      var v = b[k];
      if (_plain(v)) o[k] = _yhdista(_plain(o[k]) ? o[k] : {}, v);
      else if (Array.isArray(v)) o[k] = v.slice();
      else if (v == null || typeof v !== 'object') o[k] = v;
    });
    return o;
  }
  function sovella(tila, update) { return _yhdista(tila || {}, update || {}); }
  function alkutila(fd) { return _yhdista(fd || {}, {}); }

  // suunnitelma(pelaajat) — pelaajat: [{id, nimi, fd, rivit:[{pvm, hh, tki, flei, tsi}]}]. Rivit pvm nousevaan; palauttaa esikatselun/kuiva-ajon.
  function suunnitelma(pelaajat) {
    var y = { pelaajia: 0, rivit: 0, taysi: 0, osittain: 0, vainHistoria: 0 }, ulos = [];
    (pelaajat || []).forEach(function (p) {
      var tila = alkutila(p.fd), viestit = [], loppu = [];
      var rivit = (p.rivit || []).slice().sort(function (a, b) { return String(a.pvm).localeCompare(String(b.pvm)); });
      rivit.forEach(function (r) {
        var d = paata(tila, r), u = paivitys(tila, d, r);
        var paivittyy = d.hh.muuttuu || d.tki.uusi || d.flei.uusi || d.tsi.uusi;
        y.rivit++;
        if (!d.viesti) y.taysi++;
        else { viestit.push(pvmFi(d.pvm) + ': ' + d.viesti); if (paivittyy) y.osittain++; else y.vainHistoria++; }
        loppu.push({ pvm: d.pvm, paatos: d });
        tila = sovella(tila, u);
      });
      y.pelaajia++;
      ulos.push({ id: p.id, nimi: p.nimi, viestit: viestit, loppu: tila, rivit: loppu });
    });
    return { pelaajat: ulos, yhteenveto: y };
  }

  var API = { HH_AVAIMET: HH_AVAIMET, iso: iso, pvmFi: pvmFi, perTesti: perTesti, paata: paata, viesti: viesti, hhRivilta: hhRivilta,
    hvTesteiksi: hvTesteiksi, edellisetHistoriasta: edellisetHistoriasta, yksikkoVaroitukset: yksikkoVaroitukset, protokollaRistiriita: protokollaRistiriita, paivitys: paivitys, sovella: sovella, alkutila: alkutila, suunnitelma: suunnitelma };
  if (typeof module !== 'undefined' && module.exports) module.exports = API;
  root.TM_HISTORIATUONTI = API;
})(typeof window !== 'undefined' ? window : this);
