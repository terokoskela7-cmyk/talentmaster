/* Vaihe 0 B.4 PR 2 — Masterin listalataus palvelinyhteenvedosta (seurat/{sid}/lista_joukkue/{jid}).
   YKSI vastuu: lue joukkuedokumentit → pelaajalista (rivit laajennettuna) TAI ok:false (kutsuja putoaa vanhaan polkuun).
   · KAIKKI TAI EI MITÄÄN: puuttuva / vanhaversioinen / rikkinäinen dokumentti → ok:false (ei osittaista listaa, ei hiljaista aukkoa).
   · "kaikki joukkueet" (joukkueIdt = null): luetaan koko kokoelma, ja jokaisen tunnetun joukkueen (opts.tunnetut) dokumentin on oltava mukana.
   · Pelaaja voi olla usealla joukkueella → deduplikoidaan id:llä.
   · Ei kirjoituksia. A-kentät (sisainen), historia ja raskaat tekstit EIVÄT ole rivillä → pelaajakortti hydratoi (Master). */
(function (root) {
  'use strict';
  function _L() { return (typeof require === 'function' && typeof module !== 'undefined') ? require('./tm_lista_yhteenveto.js') : root.TM_LISTA_YHTEENVETO; }
  function _ms(t) { if (!t) return null; if (typeof t.toMillis === 'function') return t.toMillis(); if (typeof t.seconds === 'number') return t.seconds * 1000; if (typeof t === 'number') return t; return null; }

  /* db: Firestore-instanssi (compat). joukkueIdt: string[] | null (= kaikki). opts.tunnetut: string[] (joukkuedokumenttien id:t, joita kaikkien pitää löytyä "kaikki"-luvussa). */
  async function tmListaLataa(db, seuraId, joukkueIdt, opts) {
    opts = opts || {}; var L = _L(), col = db.collection('seurat').doc(seuraId).collection('lista_joukkue'), dokt = [];
    try {
      if (Array.isArray(joukkueIdt)) {
        var ids = joukkueIdt.filter(Boolean).filter(function (x, i, a) { return a.indexOf(x) === i; });
        if (!ids.length) return { ok: false, syy: 'ei_joukkueita' };
        var sn = await Promise.all(ids.map(function (id) { return col.doc(id).get(); }));
        for (var i = 0; i < sn.length; i++) { if (!sn[i].exists) return { ok: false, syy: 'puuttuu:' + ids[i] }; dokt.push({ id: ids[i], data: sn[i].data() }); }
      } else {
        var k = await col.get(); dokt = k.docs.map(function (d) { return { id: d.id, data: d.data() }; });
        var tunnetut = Array.isArray(opts.tunnetut) ? opts.tunnetut : [], loyt = {}; dokt.forEach(function (d) { loyt[d.id] = 1; });
        if (!dokt.length) return { ok: false, syy: 'tyhja' };
        for (var j = 0; j < tunnetut.length; j++) if (!loyt[tunnetut[j]]) return { ok: false, syy: 'puuttuu:' + tunnetut[j] };
      }
    } catch (e) { return { ok: false, syy: 'luku:' + (e && e.code || e && e.message || 'virhe'), virhe: e }; }
    var nahty = {}, pelaajat = [], vanhin = null, kt = dokt.length;
    for (var m = 0; m < dokt.length; m++) {
      var d = dokt[m].data;
      if (!L.tmListaKelpaa(d)) return { ok: false, syy: 'versio:' + dokt[m].id };
      var t = _ms(d.laskettu); if (t != null && (vanhin == null || t < vanhin)) vanhin = t;
      d.rivit.forEach(function (r) { if (r && r.id && !nahty[r.id]) { nahty[r.id] = 1; pelaajat.push(L.tmListaRiviPelaajaksi(r)); } });
    }
    return { ok: true, pelaajat: pelaajat, laskettuMs: vanhin, dokumentteja: kt };
  }

  /* Oletusnäkymä (P2): oma joukkue (joukkueIdt) + talenttiohjelma; koko seura erikseen. */
  function tmListaOletusNakyma(pelaajat, omatIdt) {
    var oma = {}; (omatIdt || []).forEach(function (x) { oma[x] = 1; });
    return pelaajat.filter(function (p) { return p.talenttiOhjelma === true || (p.joukkueet || []).some(function (j) { return oma[j]; }); });
  }

  /* "päivitetty hh:mm" (Europe/Helsinki; tänään vain kellonaika, muuten pv.kk. hh:mm) */
  function tmListaPaivitettyTeksti(ms, nyt) {
    if (ms == null) return '';
    function f(o, d) { return new Intl.DateTimeFormat('fi-FI', Object.assign({ timeZone: 'Europe/Helsinki' }, o)).format(d); }
    var d = new Date(ms), n = new Date(nyt == null ? Date.now() : nyt), aika = f({ hour: '2-digit', minute: '2-digit', hour12: false }, d).replace('.', ':');
    return f({ day: 'numeric', month: 'numeric', year: 'numeric' }, d) === f({ day: 'numeric', month: 'numeric', year: 'numeric' }, n) ? aika : f({ day: 'numeric', month: 'numeric' }, d) + ' ' + aika;
  }

  var API = { tmListaLataa: tmListaLataa, tmListaOletusNakyma: tmListaOletusNakyma, tmListaPaivitettyTeksti: tmListaPaivitettyTeksti };
  if (typeof module !== 'undefined' && module.exports) module.exports = API;
  if (root) root.TM_LISTA_LATAUS = API;
})(typeof window !== 'undefined' ? window : (typeof self !== 'undefined' ? self : null));
