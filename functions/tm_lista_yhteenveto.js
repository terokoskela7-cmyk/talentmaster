/* ════════════════════════════════════════════════════════════════════════
   tm_lista_yhteenveto.js — joukkuekohtainen LISTAYHTEENVETO (Vaihe 0 B.4; seurat/{sid}/lista_joukkue/{jid}). PURE, Node-kelpoinen (jaettu functions/-kopio, ks. jaettu_lib.json).
   Palvelin (functions/lista_yhteenveto.js) rakentaa dokumentit pelaajadokumenteista; client (Master, PR 2) lukee ne ja putoaa vanhaan polkuun, jos dokumenttia ei ole tai VERSIO on vanha.
   Rivi = pelaajan listalla tarvittavat kentät lyhyillä avaimilla (~200–300 B). Rakennetaan VAIN pelaajat/{pid}-dokumentin kentistä (ei sisainen/*, terveys/*, ei PIN:iä, ei huoltajan sähköpostia).
   Jäsenyys: tmPelaajanJoukkueet (§7.18; pelaaja useassa joukkueessa → rivi jokaisessa). PHV: tmPhvKoodi. D1/D2-ryhmä: tm_nakyma_ryhmat.tmRyhmat (§41 yksi totuus; EI tallennettuja d1_taso/d2_taso luokitteluun).
   ════════════════════════════════════════════════════════════════════════ */
(function (root) {
  'use strict';
  var VERSIO = 2;   // v2: rivin `x` = luokittelun raakasyötteet alkuperäisillä nimillä (tmRyhmat-pariteetti selaimessa) + tmListaRiviPelaajaksi
  var RIVI_ENINT_TAVUA = 1200;   // yhden rivin yläraja (vartija; tyypillisesti 200–300 B)
  var KIELLETYT_AVAIMET = ['pin', '_pelaajaPin', 'huoltajaEmail', 'huoltajaemail', 'email', 'sahkoposti', 'puhelin', 'terveys', 'sisainen', 'loukkaantuminen', 'jaksofokus_historia', 'kirjaukset', 'havainnot', 'omatTavoitteet', 'kausikuvat'];

  function _req(g, f) { try { if (typeof module !== 'undefined' && module.exports && typeof require === 'function') return require(f); } catch (e) { /* selain */ } return root && root[g]; }
  function _J() { return _req('TM_JOUKKUE', './tm_joukkue.js') || {}; }
  function _P() { return _req('TM_PHV_TILA', './tm_phv_tila.js') || {}; }
  function _R() { return _req('TM_NAKYMA_RYHMAT', './tm_nakyma_ryhmat.js') || {}; }

  function _iso(v) {   // Timestamp / Date → ISO-merkkijono; muut sellaisenaan
    if (v == null) return null;
    if (typeof v.toDate === 'function') { try { return v.toDate().toISOString(); } catch (e) { return null; } }
    if (v instanceof Date) return isNaN(v.getTime()) ? null : v.toISOString();
    if (typeof v === 'object' && typeof v.seconds === 'number') return new Date(v.seconds * 1000).toISOString();
    return v;
  }
  function _skal(v) { v = _iso(v); return (typeof v === 'string' || typeof v === 'number' || typeof v === 'boolean') ? v : null; }
  function _poista(o) { var u = {}, n = 0; Object.keys(o).forEach(function (k) { var v = o[k]; if (v === null || v === undefined || v === '' || (Array.isArray(v) && !v.length)) return; if (typeof v === 'object' && !Array.isArray(v) && !Object.keys(v).length) return; u[k] = v; n++; }); return u; }
  function _ali(o) { return _poista(o); }

  /* Luokittelun/mittarien raakasyötteet alkuperäisillä kenttänimillä (tm_tekniikka/tm_fyysinen/tm_nakyma_ryhmat lukevat nämä suoraan pelaajaobjektista). Vain skalaarit; jo lyhyillä avaimilla olevat jätetään pois (ei tuplaa). */
  /* TIUKKA WHITELIST (ei kuviohakua): rivin koko pysyy rajattuna eikä yksi seura voi kaataa koko laskentaa yli-isolla rivillä. Lisää kenttä tähän vain jos lib lukee sen pelaajaobjektista (pariteettitesti tests/lista_rivi_pariteetti.test.js). */
  var X_NIMET = { tki_pvm_arvio: 1, hh_pvm_arvio: 1, hh_taso_edellinen: 1, tk_kokonaistulos_viimeisin: 1, tk_kokonaistulos_edellinen: 1, tsi_viimeisin: 1, tsi_edellinen: 1, flei_pvm: 1, flei_pvm_arvio: 1 };
  var X_KUVIO = /^sm_[a-z0-9]+_pvm(_arvio)?$/i;
  function _raaka(p) {
    var x = {};
    Object.keys(p).forEach(function (k) { if (X_NIMET[k] || X_KUVIO.test(k)) { var v = _skal(p[k]); if (v != null) x[k] = v; } });
    var tp = p.testipaivat;   // litteä päivämääräkartta (tm_fyysinen)
    if (tp && typeof tp === 'object' && !Array.isArray(tp)) { var t = {}; Object.keys(tp).forEach(function (k) { var v = _skal(tp[k]); if (v != null) t[k] = v; }); if (Object.keys(t).length) x.testipaivat = t; }
    return x;
  }

  /* Yksi rivi pelaajadokumentista. d1r/d2r (ryhmäkoodit) annetaan erikseen (lasketaan koko joukkueelle kerralla). */
  function tmListaRivi(id, p, ryhmat) {
    p = p || {}; ryhmat = ryhmat || {};
    var sm = {};
    Object.keys(p).forEach(function (k) { if (/^sm_[a-z0-9_]*_(viimeisin|taso)$/i.test(k)) { var v = _skal(p[k]); if (v != null) sm[k.slice(3)] = v; } });
    var jf = p.jaksofokus && typeof p.jaksofokus === 'object' ? p.jaksofokus : null, vh = p.vastuuhenkilo && typeof p.vastuuhenkilo === 'object' ? p.vastuuhenkilo : null;
    var rivi = {
      id: String(id), e: _skal(p.etunimi), s: _skal(p.sukunimi), n: _skal(p.numero), pp: _skal(p.pelipaikka != null ? p.pelipaikka : p.positio), tp: _skal(p.tt_positio_aktiivinen),
      jn: _skal(p.joukkue), sv: _skal(p.syntymaVuosi), sg: _skal(p.sukupuoli), phv: (_P().tmPhvKoodi ? _P().tmPhvKoodi(p) : null),
      tki: _ali({ v: _skal(p.tki_viimeisin), pvm: _skal(p.tki_pvm), k: _skal(p.tki_kehityskohde), vh: _skal(p.tki_vahvuus), m: _skal(p.tki_merkki) }),
      hh: _ali({ v: _skal(p.hh_viimeisin), t: _skal(p.hh_taso), pvm: _skal(p.hh_pvm) }), flei: _skal(p.flei_viimeisin), sm: sm,
      d1: _skal(p.d1_taso), d2: _skal(p.d2_taso), d3: _ali({ v: _skal(p.d3_viimeisin), vm: _skal(p.d3_varmuus) }),
      jf: jf ? _ali({ k: _skal(jf.konsepti_avain), a: _skal(jf.alkoi), l: _skal(jf.loppu), t: _skal(jf.tila), o: _skal(jf.ohjelma_id) }) : {},
      adar: _ali({ v: _skal(p.adar_viimeisin), pvm: _skal(p.adar_pvm), n: _skal(p.adar_havaintoja) }),
      st: _skal(p.streak), fi: _skal(p.fiilinki), sg2: _skal(p.signaali), vh: vh ? _ali({ u: _skal(vh.uid), r: _skal(vh.rooli) }) : {}, sut: _skal(p.suostumusTila),
      idp: _ali({ t: _skal(p.idp_tila), e: _skal(p.idp_edistyma), f: _skal(p.idp_fokus) }),
      x: _raaka(p), to: p.talenttiOhjelma === true ? 1 : null, tt: _skal(p.talenttiTaso), d1r: ryhmat.d1r || null, d2r: ryhmat.d2r || null
    };
    return _poista(rivi);
  }

  /* Pelaajan D1/D2-ryhmäkoodit yhdellä tmRyhmat-ajolla per ulottuvuus (rivi.p → ryhma). */
  function _ryhmaKartta(pelaajat, nytMs) {
    var R = _R(), kartta = new Map();
    if (!R.tmRyhmat) return kartta;
    ['d1', 'd2'].forEach(function (dim) {
      var tulos = null; try { tulos = R.tmRyhmat(dim, pelaajat.map(function (x) { return x.data; }), nytMs, {}); } catch (e) { tulos = null; }
      if (!tulos) return;
      Object.keys(tulos.ryhmat).forEach(function (ryhma) { tulos.ryhmat[ryhma].forEach(function (r) { var x = kartta.get(r.p) || {}; x[dim + 'r'] = ryhma; kartta.set(r.p, x); }); });
    });
    return kartta;
  }

  /* pelaajat: [{id, data}] (aktiiviset), joukkueet: [{id, nimi}], nytMs → [{ id: jid, data: { versio, n, rivit, nimi } }] (yksi per joukkue; tyhjä joukkue → n:0, rivit:[]).
     Pelaaja ilman tunnistettavaa joukkuetta ei kuulu mihinkään joukkuedokumenttiin (seuran taulukko = lista_seura, myöhempi PR). */
  function tmListaJoukkueDokumentit(pelaajat, joukkueet, nytMs) {
    var J = _J(), docs = (Array.isArray(joukkueet) ? joukkueet : []).map(function (j) { return { id: String(j.id), nimi: j.nimi || '' }; });
    var kartta = _ryhmaKartta(pelaajat, nytMs), perJ = {}, ulos = [];
    docs.forEach(function (j) { perJ[j.id] = []; });
    pelaajat.forEach(function (x) {
      var jids = J.tmPelaajanJoukkueet ? J.tmPelaajanJoukkueet(x.data, docs) : [], rivi = tmListaRivi(x.id, x.data, kartta.get(x.data));
      rivi.jk = jids;
      jids.forEach(function (jid) { if (perJ[jid]) perJ[jid].push(rivi); });   // tuntematon joukkue-id (ei docia) ohitetaan
    });
    docs.forEach(function (j) {
      var rivit = perJ[j.id].slice().sort(function (a, b) { return String(a.s || '').localeCompare(String(b.s || ''), 'fi') || String(a.e || '').localeCompare(String(b.e || ''), 'fi'); });
      ulos.push({ id: j.id, data: { jid: j.id, nimi: j.nimi, versio: VERSIO, n: rivit.length, rivit: rivit } });
    });
    return ulos;
  }

  /* Vartija ennen kirjoitusta: kielletyt avaimet missä tahansa syvyydessä, sähköpostimuotoinen arvo, liian iso rivi. → rikkomusten lista (tyhjä = ok). */
  function tmListaRikkomukset(data) {
    var r = [];
    (function kavele(v, polku) {
      if (v == null) return;
      if (typeof v === 'string') { if (/[^\s@]+@[^\s@]+\.[^\s@]+/.test(v)) r.push(polku + ': sähköpostin näköinen arvo'); return; }
      if (Array.isArray(v)) { v.forEach(function (x, i) { kavele(x, polku + '[' + i + ']'); }); return; }
      if (typeof v === 'object') Object.keys(v).forEach(function (k) { if (KIELLETYT_AVAIMET.indexOf(k) >= 0) r.push(polku + '.' + k + ': kielletty avain'); kavele(v[k], polku + '.' + k); });
    })(data, 'doc');
    (data && Array.isArray(data.rivit) ? data.rivit : []).forEach(function (x, i) { var t = JSON.stringify(x).length; if (t > RIVI_ENINT_TAVUA) r.push('rivi ' + i + ': ' + t + ' merkkiä > ' + RIVI_ENINT_TAVUA); });
    return r;
  }

  /* Rivi → pelaajaobjekti alkuperäisillä kenttänimillä (Masterin lista-tila). Vain rivillä olevat kentät; puuttuvat (A-kentät, jaksofokus_historia, idp-tekstit, jne.) haetaan pelaajakortissa.
     _lista: true = ei täysi dokumentti (Master hydratoi pelaajakortin avauksessa). _d1r/_d2r = palvelimella laskettu ryhmä (vertailu/diagnostiikka; näkymät laskevat tmRyhmat:illa samoista syötteistä). */
  function tmListaRiviPelaajaksi(r) {
    r = r || {}; var p = { id: r.id, _lista: true }, sk = function (k, v) { if (v !== undefined && v !== null) p[k] = v; };
    sk('etunimi', r.e); sk('sukunimi', r.s); sk('numero', r.n); sk('pelipaikka', r.pp); sk('tt_positio_aktiivinen', r.tp); sk('joukkue', r.jn); sk('joukkueet', r.jk); sk('syntymaVuosi', r.sv); sk('sukupuoli', r.sg);
    var t = r.tki || {}; sk('tki_viimeisin', t.v); sk('tki_pvm', t.pvm); sk('tki_kehityskohde', t.k); sk('tki_vahvuus', t.vh); sk('tki_merkki', t.m);
    var h = r.hh || {}; sk('hh_viimeisin', h.v); sk('hh_taso', h.t); sk('hh_pvm', h.pvm); sk('flei_viimeisin', r.flei); sk('d1_taso', r.d1); sk('d2_taso', r.d2);
    var d3 = r.d3 || {}; sk('d3_viimeisin', d3.v); sk('d3_varmuus', d3.vm);
    Object.keys(r.sm || {}).forEach(function (k) { p['sm_' + k] = r.sm[k]; });
    Object.keys(r.x || {}).forEach(function (k) { p[k] = r.x[k]; });
    var jf = r.jf || null; if (jf && Object.keys(jf).length) p.jaksofokus = _poista({ konsepti_avain: jf.k, alkoi: jf.a, loppu: jf.l, tila: jf.t, ohjelma_id: jf.o });
    var a = r.adar || {}; sk('adar_viimeisin', a.v); sk('adar_pvm', a.pvm); sk('adar_havaintoja', a.n);
    sk('streak', r.st); sk('fiilinki', r.fi); sk('signaali', r.sg2); var vh = r.vh || {}; if (vh.u || vh.r) p.vastuuhenkilo = _poista({ uid: vh.u, rooli: vh.r });
    sk('suostumusTila', r.sut); var i = r.idp || {}; sk('idp_tila', i.t); sk('idp_edistyma', i.e); sk('idp_fokus', i.f);
    if (r.to === 1) p.talenttiOhjelma = true; sk('talenttiTaso', r.tt);
    if (r.phv) p.biologinenIka_viimeisin = { phv_tila_koodi: r.phv };   // tmPhvKoodi/tmPhvTila lukevat tämän (mittauslähde); muita bio-kenttiä ei ole (A = sisainen)
    p._d1r = r.d1r || null; p._d2r = r.d2r || null;
    return p;
  }

  /* Client: onko dokumentti käyttökelpoinen? (puuttuu / vanha versio → vanha polku). */
  function tmListaKelpaa(data) { return !!data && typeof data === 'object' && data.versio === VERSIO && Array.isArray(data.rivit); }

  var API = { VERSIO: VERSIO, KIELLETYT_AVAIMET: KIELLETYT_AVAIMET, tmListaRivi: tmListaRivi, tmListaJoukkueDokumentit: tmListaJoukkueDokumentit, tmListaRikkomukset: tmListaRikkomukset, tmListaKelpaa: tmListaKelpaa, tmListaRiviPelaajaksi: tmListaRiviPelaajaksi };
  if (typeof module !== 'undefined' && module.exports) module.exports = API;
  if (root) root.TM_LISTA_YHTEENVETO = API;
})(typeof window !== 'undefined' ? window : (typeof self !== 'undefined' ? self : null));
