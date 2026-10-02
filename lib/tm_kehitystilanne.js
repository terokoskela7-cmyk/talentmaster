/* ════════════════════════════════════════════════════════════════════════
   tm_kehitystilanne.js — Kehitystilanne v0 (Seura.html → renderKehitystilanne): malli + HTML. PUHDAS.
   Brief: Seurakehitysdashboard v0 (Claude Docs, 2.10.2026) — "Näkymät", lukittu ydin.

   rakennaMalli(data, opts) → malli (luvut, N, päivämäärät, tilat) — EI Firestorea; Seura.html lataa datan.
   renderNakyma(malli, opts) → HTML (string-concat, §7.1). raporttiHTML(malli, tyyppi) → tulostettava raportti.
   Riippuvuudet (selain: globaalit, Node: require): TM_MITTARIT, TM_KEHIKOT, tm_eerikkila_normit (raeKvartaali),
   tm_idp (idpJumissa), tm_arviointi_taksonomia (tmTaksonomiaDim).
   EI seuraId-literaaleja, EI seuran nimiä, EI demoarvoja: tyhjä data = tyhjä tila, joka kertoo mitä kirjaamalla luku syntyy.
   ════════════════════════════════════════════════════════════════════════ */
(function (root) {
  'use strict';

  function _dep() {
    var g = root || {};
    var r = typeof require === 'function' ? require : null;
    var M = g.TM_MITTARIT || (r && r('./tm_mittarit.js'));
    var K = g.TM_KEHIKOT || (r && r('./tm_kehikot.js'));
    var EN = (typeof raeKvartaali === 'function') ? { raeKvartaali: raeKvartaali } : (r && r('./tm_eerikkila_normit.js'));
    var IDP = (typeof idpJumissa === 'function') ? { idpJumissa: idpJumissa } : (r && r('./tm_idp.js'));
    var TX = (typeof tmTaksonomiaDim === 'function') ? { tmTaksonomiaDim: tmTaksonomiaDim } : (r && r('./tm_arviointi_taksonomia.js'));
    return { M: M, K: K, EN: EN, IDP: IDP, TX: TX };
  }

  /* ── Apurit ── */
  function esc(x) { return String(x == null ? '' : x).replace(/[&<>"']/g, function (c) { return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]; }); }
  function _iso(x) {
    if (x == null || x === '') return null;
    if (typeof x === 'string') { var m = x.match(/^(\d{4}-\d{2}-\d{2})/); if (m) return m[1]; }
    if (typeof x.toDate === 'function') return x.toDate().toISOString().slice(0, 10);
    if (typeof x.seconds === 'number') return new Date(x.seconds * 1000).toISOString().slice(0, 10);
    if (x instanceof Date) return x.toISOString().slice(0, 10);
    var d = new Date(x); return isNaN(d.getTime()) ? null : d.toISOString().slice(0, 10);
  }
  function _ms(x) { var i = _iso(x); return i ? Date.parse(i + 'T00:00:00Z') : null; }
  function _max(arr) { var v = arr.filter(Boolean).sort(); return v.length ? v[v.length - 1] : null; }
  function ikavaihe(ika) { return ika == null ? null : ika <= 12 ? 'lapsuus' : ika <= 15 ? 'nuoruus' : ika <= 19 ? 'erikoistuminen' : null; }
  var IKAVAIHEET = { lapsuus: 'Lapsuus (U8–U12)', nuoruus: 'Nuoruus (U13–U15)', erikoistuminen: 'Erikoistuminen (U16–U19)' };
  var TILA_NIMI = { tayttynyt: 'Täyttynyt', raiteilla: 'Raiteilla', riskissa: 'Riskissä', puuttuu: 'Puuttuu' };
  var LIIKKEET_K7 = [
    { nimi: 'Valakyykky', avaimet: ['valakyykky'] },
    { nimi: 'Askelkyykky', avaimet: ['askelkyykky'] },
    { nimi: 'Hyvää huomenta', avaimet: ['hyvahuomenta', 'hyvaa_huomenta'] },
    { nimi: 'Etunojapunnerrus', avaimet: ['punnerrus_arv', 'etunojapunnerrus'] },
  ];

  /* ════════════════ MALLI ════════════════
     data = { seura, joukkueet[], pelaajat[{id,...}], bio{pid:[docs]}, kerrat{pid:[docs]}, idp{pid:doc}, kartoitus{pid:[docs]},
              kirjaukset{pid:[docs]}, harjoitusarvioinnit[], mentoroinnit[]|null (ei lukuoikeutta), kalenteri[{...,lasnaolijat[]}],
              asetukset|null, seuratuki|null, kausikuvat[] }
     opts = { nyt:'YYYY-MM-DD', vuosi, jakso:'kevat'|'syksy'|'vuosi', sukupuoli:'kaikki'|'M'|'N', ikavaihe:'kaikki'|… } */
  function rakennaMalli(data, opts) {
    var D = _dep(), M = D.M, K = D.K;
    opts = opts || {};
    var nyt = opts.nyt || new Date().toISOString().slice(0, 10);
    var vuosi = opts.vuosi || Number(nyt.slice(0, 4));
    var jaksoRaja = M.jaksonRajat(vuosi, opts.jakso || 'vuosi');
    var vuosiRaja = M.jaksonRajat(vuosi, 'vuosi');
    var raja12kk = new Date(Date.parse(nyt + 'T00:00:00Z') - 365 * 864e5).toISOString().slice(0, 10);
    var seura = data.seura || {};
    var kehikko = K.kehikkoKorille(seura.palloliittoKori || seura.kori);
    var bio = data.bio || {}, kerrat = data.kerrat || {}, idp = data.idp || {};

    /* Suodatus: sukupuoli + ikävaihe (ikäluokka = kuluva vuosi − syntymävuosi, joukkuenimi-invariantti §14) */
    var kaikki = (data.pelaajat || []).filter(function (p) { return p && p.tila !== 'arkistoitu' && p.tila !== 'poistettu'; });
    var pelaajat = kaikki.filter(function (p) {
      if (opts.sukupuoli && opts.sukupuoli !== 'kaikki' && p.sukupuoli !== opts.sukupuoli) return false;
      var iv = ikavaihe(p.syntymaVuosi ? vuosi - p.syntymaVuosi : null);
      if (opts.ikavaihe && opts.ikavaihe !== 'kaikki' && iv !== opts.ikavaihe) return false;
      return true;
    });

    /* Varaskaala SWC:lle: viimeisimmät arvot saman sukupuolen + syntymävuoden pelaajilta, muuten koko ikävaihe */
    function swcVara(p, testi) {
      var sama = [], vaihe = [], ivP = ikavaihe(vuosi - p.syntymaVuosi);
      kaikki.forEach(function (q) {
        if (q.sukupuoli !== p.sukupuoli) return;
        var h = (q.hh_historia || []).filter(function (x) { return typeof x[testi] === 'number'; });
        if (!h.length) return; var v = h[h.length - 1][testi];
        if (q.syntymaVuosi === p.syntymaVuosi) sama.push(v);
        if (ikavaihe(vuosi - q.syntymaVuosi) === ivP) vaihe.push(v);
      });
      return M.swcSeurasta([sama, vaihe]);
    }

    /* ── Per pelaaja ── */
    var tiedot = pelaajat.map(function (p) {
      var testit = {}, mitatut = [];
      Object.keys(M.TESTIT).forEach(function (t) {
        if (!(p.hh_historia || []).some(function (h) { return typeof h[t] === 'number'; })) return;   // ei mitattu ≠ ei vertailukelpoinen
        testit[t] = M.k1Tila({ historia: p.hh_historia, testi: t, sukupuoli: p.sukupuoli, syntymaVuosi: p.syntymaVuosi,
          joukkue: p.joukkue, bioDocs: bio[p.id], swcSeura: swcVara(p, t) });
        if (M.AVAINTESTIT.indexOf(t) >= 0) mitatut.push(testit[t]);
      });
      var k1bArg = { historia: p.hh_historia, sukupuoli: p.sukupuoli, syntymaVuosi: p.syntymaVuosi, syntymaaika: p.syntymaaika, bioDocs: bio[p.id] };
      var k1b = (p.hh_historia || []).length ? M.k1bTila(k1bArg) : null;
      var k1bBio = (p.hh_historia || []).length ? M.k1bTila(Object.assign({ vertailu: 'kehitysvaihe' }, k1bArg)) : null;
      var tavoitteet = ((idp[p.id] || {}).tavoitteet || []).filter(function (t) { return ['aktiivinen', 'jatkuu', 'saavutettu', 'ehdotettu'].indexOf(t.status) >= 0; });
      var avoimet = tavoitteet.filter(function (t) { return t.status !== 'saavutettu'; });
      var bioViim = _max([(p.biologinenIka_viimeisin || {}).mittauspaiva].concat((bio[p.id] || []).map(function (b) { return b.mittauspaiva; })));
      return {
        p: p, id: p.id, joukkue: p.joukkue || '—', testit: testit, kehittyy: M.pelaajaKehittyy(mitatut), k1b: k1b, k1bBio: k1bBio,
        hhPvm: p.hh_pvm || _max((p.hh_historia || []).map(function (h) { return h.pvm; })),
        bioPvm: bioViim, idpTavoitteet: tavoitteet, idpAvoimet: avoimet,
        idpJumissa: avoimet.filter(function (t) { return D.IDP && D.IDP.idpJumissa(t, Date.parse(nyt + 'T12:00:00Z')); }).length,
        sitoumusVahv: !!(((idp[p.id] || {}).pelaaja_sitoumus || {}).vahvistettu_pvm),
        hg: M.laskeHiddenGem(p),
      };
    });

    /* ── D1: K1 testeittäin ── */
    var testijakaumat = Object.keys(M.TESTIT).map(function (t) {
      var tilat = tiedot.map(function (x) { return x.testit[t]; }).filter(Boolean);
      if (!tilat.length) return null;
      var vertailtavat = tilat.filter(function (x) { return x.tila !== 'ei_vertailukelpoinen'; });
      var valit = vertailtavat.map(function (x) { return x.valiPv; }).sort(function (a, b) { return a - b; });
      return { testi: t, nimi: M.TESTIT[t].nimi, rooli: M.TESTIT[t].rooli, osuus: M.kehitysosuus(tilat), N: tilat.length,
        valiMediaaniPv: valit.length ? valit[Math.floor(valit.length / 2)] : null,
        pitkia: vertailtavat.filter(function (x) { return x.pitkaVali; }).length,
        pvm: _max(tilat.map(function (x) { return x.pvmB; })),
        swcLahteet: vertailtavat.reduce(function (o, x) { if (x.swcLahde) o[x.swcLahde] = (o[x.swcLahde] || 0) + 1; return o; }, {}) };
    }).filter(Boolean);
    var kehittyvat = tiedot.filter(function (x) { return x.kehittyy !== null; });
    var kehOsuus = M.osuus(kehittyvat.filter(function (x) { return x.kehittyy === true; }).length, kehittyvat.length);
    function k1bKooste(avain) {
      var j = { nopeammin: 0, tahdissa: 0, hitaammin: 0, ei_vertailukelpoinen: 0 }, vara = 0, rajattu = 0;
      tiedot.forEach(function (x) { var t = x[avain]; if (!t) return; if (j[t.tila] != null) j[t.tila]++; if (t.kalenteriVara) vara++; if (t.rajattu) rajattu++; });
      var n = j.nopeammin + j.tahdissa + j.hitaammin;
      return { jakauma: j, N: n, osuus: M.osuus(j.nopeammin, n), vahintaan: M.osuus(j.nopeammin + j.tahdissa, n), kalenteriVara: vara, rajattu: rajattu,
        Nkaikki: n + j.ei_vertailukelpoinen, pvm: _max(tiedot.map(function (x) { return x[avain] && x[avain].pvmB; })) };
    }
    var k1bKal = k1bKooste('k1b'), k1bBioK = k1bKooste('k1bBio');

    /* ── D2–D5: K3 (kaksi viimeisintä arviointikertaa ulottuvuuskeskiarvoina) ── */
    var dimAvaimet = {};
    ['D2', 'D3', 'D4', 'D5'].forEach(function (d) { dimAvaimet[d] = D.TX ? D.TX.tmTaksonomiaDim(d).map(function (i) { return i.avain; }) : []; });
    var k3 = ['D2', 'D3', 'D4', 'D5'].map(function (dim) {
      var jak = { ylos: 0, sama: 0, alas: 0 }, pvm = null;
      tiedot.forEach(function (x) {
        var arvot = (kerrat[x.id] || []).map(function (k) {
          var v = []; dimAvaimet[dim].forEach(function (a) { var o = (k.kohteet || {})[a]; if (o && typeof o.arvo === 'number') v.push(o.arvo); });
          return v.length ? { pvm: _iso(k.pvm), ka: M.keskiarvo(v) } : null;
        }).filter(Boolean).sort(function (a, b) { return a.pvm < b.pvm ? -1 : 1; });
        if (arvot.length < 2) return;
        var d = arvot[arvot.length - 1].ka - arvot[arvot.length - 2].ka;
        if (d >= M.ARVIO_RAJA) jak.ylos++; else if (d <= -M.ARVIO_RAJA) jak.alas++; else jak.sama++;
        pvm = _max([pvm, arvot[arvot.length - 1].pvm]);
      });
      var n = jak.ylos + jak.sama + jak.alas;
      return { dim: dim, jakauma: jak, N: n, osuus: M.osuus(jak.ylos, n), pvm: pvm };
    });

    /* ── Kypsyys, IDP, talentit ── */
    var phvTuore = tiedot.filter(function (x) { return x.bioPvm && x.bioPvm >= raja12kk; }).length;
    var M1 = M.osuus(phvTuore, tiedot.length);
    var M2 = {}; tiedot.forEach(function (x) { if (x.p.phv_tila === 'PH') M2[x.joukkue] = (M2[x.joukkue] || 0) + 1; });
    var talentit = tiedot.filter(function (x) { return x.p.talenttiOhjelma === true; });
    var mKypsyys = function (arr) { return arr.filter(function (x) { return x.p.phv_tila === 'PRE' || x.p.phv_tila === 'LAH'; }).length; };
    var phvTiedossa = tiedot.filter(function (x) { return !!x.p.phv_tila; });
    var M3 = { talentit: M.osuus(mKypsyys(talentit.filter(function (x) { return x.p.phv_tila; })), talentit.filter(function (x) { return x.p.phv_tila; }).length),
      kaikki: M.osuus(mKypsyys(phvTiedossa), phvTiedossa.length) };
    var rae = function (arr) { var q = { Q1: 0, Q2: 0, Q3: 0, Q4: 0 }, n = 0; arr.forEach(function (x) { var sa = x.p.syntymaaika; if (sa && typeof sa.seconds === 'number' && !sa.toDate) sa = new Date(sa.seconds * 1000);
      var k = D.EN && D.EN.raeKvartaali ? D.EN.raeKvartaali(sa) : null; if (k && q[k] != null) { q[k]++; n++; } }); return { q: q, N: n }; };
    var M4 = { kaikki: rae(tiedot), talentit: rae(talentit) };
    var idpOn = tiedot.filter(function (x) { return x.idpTavoitteet.length > 0; }).length;
    var P3 = { kattavuus: M.osuus(idpOn, tiedot.length), sitoumus: M.osuus(tiedot.filter(function (x) { return x.sitoumusVahv; }).length, idpOn) };
    var avoimetYht = tiedot.reduce(function (s, x) { return s + x.idpAvoimet.length; }, 0);
    var P4 = M.osuus(tiedot.reduce(function (s, x) { return s + x.idpJumissa; }, 0), avoimetYht);
    var signaaliKirjataan = kaikki.some(function (p) { return typeof p.signaali === 'string' && p.signaali !== ''; });
    var S1 = signaaliKirjataan ? M.osuus(talentit.filter(function (x) { return x.p.signaali === 'xfactor'; }).length, talentit.length) : null;
    var S2 = M.osuus(talentit.filter(function (x) { return x.idpTavoitteet.some(function (t) { return t.tyyppi === 'vahvuus'; }); }).length, talentit.length);
    var S3 = { n: tiedot.filter(function (x) { return x.hg && x.hg.dHG; }).length, N: tiedot.filter(function (x) { return x.hg && x.hg.d1 != null && x.hg.d2 != null; }).length };

    /* ── K7 liikkuvuus (harjoitettavuus_u12), K8 omatoiminen (lapsuus) ── */
    var k7 = LIIKKEET_K7.map(function (l) {
      var v = []; var pvm = null;
      tiedot.forEach(function (x) {
        var docs = ((data.kartoitus || {})[x.id] || []).slice().sort(function (a, b) { return (a.testauspvm || '') < (b.testauspvm || '') ? -1 : 1; });
        var d = docs[docs.length - 1]; if (!d) return;
        var arvo = null; l.avaimet.forEach(function (a) { var t = (d.testit || {})[a]; if (arvo == null && t != null) arvo = typeof t === 'object' ? t.paras : Number(t); });
        if (typeof arvo === 'number' && isFinite(arvo)) { v.push(arvo); pvm = _max([pvm, d.testauspvm]); }
      });
      return { nimi: l.nimi, ka: v.length ? Math.round(M.keskiarvo(v) * 10) / 10 : null, N: v.length, pvm: pvm };
    });
    var lapsuus = tiedot.filter(function (x) { return ikavaihe(vuosi - x.p.syntymaVuosi) === 'lapsuus'; });
    var raja12vk = new Date(Date.parse(nyt + 'T00:00:00Z') - 84 * 864e5).toISOString().slice(0, 10);
    var k8 = { kirjaavat: 0, N: lapsuus.length, viikkojaKa: null, taysiaViikkoja: 0, pvm: null };
    var vkSumma = 0;
    lapsuus.forEach(function (x) {
      var pv = ((data.kirjaukset || {})[x.id] || []).map(function (k) { return k.pvm || _iso(k.luotu); }).filter(function (d) { return d && d >= raja12vk && d <= nyt; });
      if (!pv.length) return;
      k8.kirjaavat++; k8.pvm = _max([k8.pvm].concat(pv));
      var vk = {}; pv.forEach(function (d) { var w = Math.floor((Date.parse(nyt + 'T00:00:00Z') - Date.parse(d + 'T00:00:00Z')) / (7 * 864e5)); vk[w] = (vk[w] || 0) + 1; });
      vkSumma += Object.keys(vk).length;
      k8.taysiaViikkoja += Object.keys(vk).filter(function (w) { return vk[w] >= 7; }).length;
    });
    if (k8.kirjaavat) k8.viikkojaKa = Math.round(vkSumma / k8.kirjaavat * 10) / 10;

    /* ── Harjoitusarvioinnit (C3, C2a), mentoroinnit ── */
    var ha = (data.harjoitusarvioinnit || []).filter(function (h) {
      if (opts.ikavaihe && opts.ikavaihe !== 'kaikki' && h.ikavaihe && h.ikavaihe !== opts.ikavaihe) return false; return true;
    });
    var haVuosi = ha.filter(function (h) { return M.onValilla(h.pvm, vuosiRaja.alku, vuosiRaja.loppu) && h.pvm <= nyt; });
    var haJakso = ha.filter(function (h) { return M.onValilla(h.pvm, jaksoRaja.alku, jaksoRaja.loppu) && h.pvm <= nyt; });
    var pl = function (arr) { return arr.filter(function (h) { return h.malli === 'palloliitto'; }); };
    var kriteerit = ((data.asetukset || {}).c3_kriteerit && data.asetukset.c3_kriteerit.length) ? data.asetukset.c3_kriteerit : ['a1', 'a2'];
    function c3(arr) {
      var A = pl(arr), o = { N: A.length, pvm: _max(A.map(function (h) { return h.pvm; })), kriteerit: {} };
      kriteerit.forEach(function (k) { o.kriteerit[k] = M.asteikonKeskiarvo(A.map(function (h) { return (h.vastaukset || {})[k]; })); });
      o.a2osuus80 = M.tavoitetasoOsuus(A.map(function (h) { return (h.vastaukset || {}).a2; }), (kehikko.C3_a2_raja || 80));
      return o;
    }
    var mentVuosi = data.mentoroinnit == null ? null : data.mentoroinnit.filter(function (m) { var d = _iso(m.aika); return m.tyyppi === 'viesti' && d && d >= vuosiRaja.alku && d <= vuosiRaja.loppu; });
    var C2a = { havainnointi: haVuosi.filter(function (h) { return h.arviointitapa === 'havainnointi' && h.arvioijaUid && h.arvioijaUid !== h.valmentajaUid; }).length,
      itsereflektio: haVuosi.filter(function (h) { return h.arviointitapa === 'itsearvio'; }).length,
      mentorointi: mentVuosi == null ? null : mentVuosi.length };
    C2a.yhteensa = C2a.havainnointi + C2a.itsereflektio + (C2a.mentorointi || 0);
    C2a.pvm = _max(haVuosi.map(function (h) { return h.pvm; }).concat((mentVuosi || []).map(function (m) { return _iso(m.aika); })));

    /* ── P1 harjoitustunnit (kalenteri + läsnäolo, jakso) ── */
    var P1 = {};
    (data.kalenteri || []).forEach(function (e) {
      if (e.poistettu === true || e.tyyppi !== 'harjoitus') return;
      var d = _iso(e.alkaa); if (!d || !M.onValilla(d, jaksoRaja.alku, jaksoRaja.loppu) || d > nyt) return;
      var kesto = (_ms(e.paattyy) && e.paattyy && e.alkaa) ? ((e.paattyy.toDate ? e.paattyy.toDate() : new Date(e.paattyy.seconds ? e.paattyy.seconds * 1000 : e.paattyy)) - (e.alkaa.toDate ? e.alkaa.toDate() : new Date(e.alkaa.seconds ? e.alkaa.seconds * 1000 : e.alkaa))) / 36e5 : 1.5;
      (e.lasnaolijat || []).forEach(function (l) {
        if (l.tila !== 'paikalla' && l.tila !== 'myohassa') return;
        var x = tiedot.find(function (t) { return t.id === l.id; }); if (!x) return;
        var j = x.joukkue; P1[j] = P1[j] || { tunnit: 0, pelaajat: {}, viikot: {} };
        P1[j].tunnit += kesto; P1[j].pelaajat[l.id] = 1; P1[j].viikot[Math.floor(Date.parse(d + 'T00:00:00Z') / (7 * 864e5))] = 1;
      });
    });
    Object.keys(P1).forEach(function (j) { var o = P1[j], np = Object.keys(o.pelaajat).length, nv = Object.keys(o.viikot).length; P1[j] = { tunnitVk: np && nv ? Math.round(o.tunnit / np / nv * 10) / 10 : null, N: np, viikot: nv }; });

    /* ── Lohko 1: tavoiterivit ── */
    var st = data.seuratuki || null;
    var tapahtumat = st && Array.isArray(st.tapahtumat) ? st.tapahtumat.filter(function (t) { return M.onValilla(t.pvm, vuosiRaja.alku, vuosiRaja.loppu); }) : null;
    var c3V = c3(haVuosi);
    var toteumat = {
      A_kehittyvat: { arvo: kehOsuus.arvo, N: kehOsuus.N, pvm: _max(tiedot.map(function (x) { return x.hhPvm; })), tila: 'alustava', pieni: kehOsuus.tila === 'liian_pieni' },
      C3_havainnot: { arvo: pl(haVuosi).length, N: pl(haVuosi).length, pvm: c3V.pvm },
      C3_a1: { arvo: c3V.kriteerit.a1 ? c3V.kriteerit.a1.arvo : null, N: c3V.N, pvm: c3V.pvm },
      C3_a2: { arvo: c3V.kriteerit.a2 ? c3V.kriteerit.a2.arvo : null, N: c3V.N, pvm: c3V.pvm },
      C3_a2_osuus80: { arvo: c3V.a2osuus80.arvo, N: c3V.a2osuus80.N, pvm: c3V.pvm },
      C2a_kohtaamiset: { arvo: C2a.yhteensa, N: C2a.yhteensa, pvm: C2a.pvm, huom: C2a.mentorointi == null ? 'mentorointiviestit eivät näy tälle roolille' : null },
      C2b_koulutukset: tapahtumat == null ? { arvo: null } : { arvo: tapahtumat.length, N: tapahtumat.length, pvm: _max(tapahtumat.map(function (t) { return t.pvm; })) },
      C1_lisenssit: st && st.lisenssit ? { arvo: (Number(st.lisenssit.fvs) || 0) + (Number(st.lisenssit.muut) || 0), N: null, pvm: _iso(st.paivitetty) } : { arvo: null },
      J2_roolit: st && st.roolit ? { arvo: st.roolit.tayttyy === true, pvm: _iso(st.paivitetty) } : { arvo: null },
      J3_yhteistyoseurat: st && Array.isArray(st.yhteistyoseurat) ? { arvo: st.yhteistyoseurat.length > 0, pvm: _iso(st.paivitetty) } : { arvo: null },
      J5_t3: st && st.t3 ? { arvo: st.t3.osallistuu === true, pvm: _iso(st.paivitetty) } : { arvo: null },
    };
    var tavoiterivit = Object.keys(K.MITTARIT).map(function (avain) {
      var mm = K.MITTARIT[avain], t = K.tavoiteRiville(avain, data.asetukset, kehikko), to = toteumat[avain] || { arvo: null };
      if (t.tavoite == null && avain !== 'A_kehittyvat') return null;
      var pienempi = false;
      var ti = to.pieni ? { tila: null, ennuste: null }
        : M.tavoitteenTila({ toteuma: to.arvo, tavoite: t.tavoite, tyyppi: mm.kertyma, nyt: nyt, vuosi: vuosi, kasinKirjattava: mm.kasin, pienempiParempi: pienempi });
      var plTila = (t.seuraMatalampi && !to.pieni) ? M.tavoitteenTila({ toteuma: to.arvo, tavoite: t.palloliitto, tyyppi: mm.kertyma, nyt: nyt, vuosi: vuosi }).tila : null;
      return { avain: avain, nimi: mm.nimi, yksikko: mm.yksikko, tyyppi: mm.tyyppi, kasin: !!mm.kasin, toteuma: to, tavoite: t.tavoite, lahde: t.lahde,
        palloliitto: t.palloliitto, tila: to.pieni ? 'liian_pieni' : ti.tila, ennuste: ti.ennuste, plTila: plTila };
    }).filter(Boolean);
    var tilaLaskuri = { tayttynyt: 0, raiteilla: 0, riskissa: 0, puuttuu: 0 };
    tavoiterivit.forEach(function (r) { if (tilaLaskuri[r.tila] != null) tilaLaskuri[r.tila]++; });

    /* ── Lohko 3: joukkueet ── */
    var jNimet = {}; (data.joukkueet || []).forEach(function (j) { jNimet[j.nimi || j.id] = j; });
    tiedot.forEach(function (x) { if (!jNimet[x.joukkue]) jNimet[x.joukkue] = { nimi: x.joukkue }; });
    var joukkueRivit = Object.keys(jNimet).map(function (jn) {
      var t = tiedot.filter(function (x) { return x.joukkue === jn; });
      if (!t.length) return null;
      var keh = t.filter(function (x) { return x.kehittyy !== null; });
      return { nimi: jn, N: t.length, pojat: t.filter(function (x) { return x.p.sukupuoli === 'M'; }).length, tytot: t.filter(function (x) { return x.p.sukupuoli === 'N'; }).length,
        fyysinen: { n: keh.filter(function (x) { return x.kehittyy; }).length, N: keh.length },
        idp: { n: t.filter(function (x) { return x.idpTavoitteet.length; }).length, N: t.length },
        pysahtyneet: t.reduce(function (s, x) { return s + x.idpJumissa; }, 0),
        havainnot: haJakso.filter(function (h) { return String(h.joukkue || '').toLowerCase() === String(jn).toLowerCase(); }).length,
        viimTesti: _max(t.map(function (x) { return x.hhPvm; })),
        pelaajat: t.map(function (x) { return { id: x.id, nimi: ((x.p.etunimi || '') + ' ' + (x.p.sukunimi || '')).trim() || x.id, testit: x.testit, kehittyy: x.kehittyy,
          k1b: x.k1b ? x.k1b.tila : null, phv: x.p.phv_tila || null, idp: x.idpTavoitteet.length, jumissa: x.idpJumissa, hhPvm: x.hhPvm }; }),
      };
    }).filter(Boolean).sort(function (a, b) { return a.nimi < b.nimi ? -1 : 1; });

    /* ── Lohko 4: kattavuus ── */
    var testiTuore = tiedot.filter(function (x) { return x.hhPvm && x.hhPvm >= raja12kk; }).length;
    var P7 = { testi: M.osuus(testiTuore, tiedot.length), havainnot: joukkueRivit.map(function (r) { return { nimi: r.nimi, n: r.havainnot }; }) };
    var kehotteet = [];
    joukkueRivit.forEach(function (r) {
      var vanhat = r.pelaajat.filter(function (x) { return !x.hhPvm || x.hhPvm < raja12kk; }).length;
      if (vanhat) kehotteet.push(r.nimi + ': ' + vanhat + ' / ' + r.N + ' pelaajalta puuttuu alle 12 kk vanha testi — testikierros nostaa fyysisen kehityksen kattavuutta.');
      if (!r.havainnot) kehotteet.push(r.nimi + ': ei harjoitushavaintoja valitulla jaksolla.');
    });
    if (M1.N && M1.arvo != null && M1.arvo < 50) kehotteet.push('Kasvumittaus puuttuu yli puolelta pelaajista (alle 12 kk): PHV-tila tarkentaa fyysisen kehityksen tulkintaa.');
    tavoiterivit.filter(function (r) { return r.tila === 'puuttuu' && r.kasin; }).forEach(function (r) { kehotteet.push(r.nimi + ': kirjaa Kori 3 -tiedot.'); });

    var kausikuvat = (data.kausikuvat || []).slice().sort(function (a, b) { return String(a.kausi) < String(b.kausi) ? -1 : 1; });
    return {
      nyt: nyt, vuosi: vuosi, jakso: opts.jakso || 'vuosi', sukupuoli: opts.sukupuoli || 'kaikki', ikavaihe: opts.ikavaihe || 'kaikki',
      seura: { nimi: seura.nimi || '', kori: seura.palloliittoKori || seura.kori || null, tukikausi: seura.tukikausi || kehikko.tukikausi || null, demo: seura.demo === true },
      kehikko: kehikko, N: tiedot.length, Nkaikki: kaikki.length,
      lohko1: { rivit: tavoiterivit, laskuri: tilaLaskuri, asetuksetOmat: !!(data.asetukset && data.asetukset.tavoitteet) },
      lohko2: { testijakaumat: testijakaumat, kehittyvat: kehOsuus, k1b: k1bKal, k1bBio: k1bBioK,
        k3: k3, M1: M1, M2: M2, M3: M3, M4: M4, P3: P3, P4: P4, S1: S1, S2: S2, S3: S3, K7: k7, K8: k8, P1: P1,
        C3: c3(haJakso), C2a: C2a, kausikuvat: kausikuvat },
      lohko3: joukkueRivit, lohko4: { P7: P7, kehotteet: kehotteet },
    };
  }

  /* ════════════════ HTML ════════════════ */
  function luku(arvo, yks) { return arvo == null ? '—' : esc(String(arvo).replace('.', ',')) + (yks ? ' ' + esc(yks) : ''); }
  function osuusTxt(o) {
    if (!o || o.tila === 'ei_dataa') return '<span class="kt-tyhja">Ei vielä dataa</span>';
    if (o.tila === 'liian_pieni') return '<span class="kt-tyhja">Liian pieni ryhmä (N = ' + o.N + ')</span>';
    return '<b>' + luku(o.arvo) + ' %</b> <span class="kt-n">' + o.n + ' / ' + o.N + '</span>';
  }
  function meta(N, pvm, tila) {
    if (tila === 'kirjattu') return '<span class="kt-meta">Kirjattu' + (pvm ? ' ' + esc(pvmFi(pvm)) : '') + '</span>';
    var t = tila === 'alustava' ? 'Alustava' : (N ? 'Mitattu' : 'Ei vielä dataa');
    return '<span class="kt-meta">N ' + (N == null ? '—' : N) + ' · ' + (pvm ? esc(pvmFi(pvm)) : '—') + ' · ' + t + '</span>';
  }
  function pvmFi(x) { return _dep().M.pvmFi(x); }
  function tilaBadge(t) { if (!t) return '<span class="kt-tila">—</span>'; if (t === 'liian_pieni') return '<span class="kt-tila kt-harmaa">Liian pieni ryhmä</span>';
    return '<span class="kt-tila kt-' + t + '">' + esc(TILA_NIMI[t] || t) + '</span>'; }
  function kortti(otsikko, sisalto, alaviite) { return '<div class="kt-kortti"><div class="kt-k-otsikko">' + otsikko + '</div>' + sisalto + (alaviite ? '<div class="kt-ala">' + alaviite + '</div>' : '') + '</div>'; }
  function tyhja(miksi, mita, lahella) { return '<div class="kt-tyhjatila"><b>Ei vielä dataa.</b> ' + esc(miksi) + ' ' + esc(mita) + (lahella ? ' <span class="kt-n">' + esc(lahella) + '</span>' : '') + '</div>'; }
  function palkki(j) {   // pinottu palkki: ↑ ↗ → ↘ ↓ ei vk — luku ja symboli aina näkyvissä (väri ei ole ainoa tieto)
    var osat = [['vahva_ylos', '↑'], ['mahd_ylos', '↗'], ['vaihtelu', '→'], ['mahd_alas', '↘'], ['vahva_alas', '↓'], ['ei_vertailukelpoinen', '–']];
    var yht = osat.reduce(function (s, o) { return s + (j[o[0]] || 0); }, 0) || 1;
    return '<div class="kt-palkki">' + osat.filter(function (o) { return j[o[0]]; }).map(function (o) {
      return '<span class="kt-p kt-p-' + o[0] + '" style="width:' + (j[o[0]] / yht * 100).toFixed(1) + '%" title="' + o[1] + ' ' + j[o[0]] + '">' + o[1] + ' ' + j[o[0]] + '</span>';
    }).join('') + '</div>';
  }
  function tavoiteArvo(r, x) {
    if (x == null) return '—';
    if (typeof x === 'boolean') return x ? 'Täyttyy' : 'Ei';
    return luku(x, r.yksikko === '%' ? '%' : r.yksikko === 'kpl' ? '' : '');
  }

  function renderNakyma(m, o) {
    o = o || {};
    var L2 = m.lohko2;
    var h = '';
    /* Yläpalkki */
    var kehNimi = m.kehikko && m.kehikko.nimi ? m.kehikko.nimi + (m.seura.tukikausi ? ' · tukikausi ' + m.seura.tukikausi : '') : 'Palloliiton kori ei asetettu';
    h += '<div class="sivuOtsikko"><div class="sivuEyebrow">Kehitystilanne · seuran omat tavoitteet · vertailu: ' + esc(kehNimi) + '</div>'
      + '<div class="sivuH1">Saavutammeko tavoitteemme ja kehittyvätkö pelaajat?</div>'
      + '<div class="kt-meta">' + esc(m.seura.nimi) + ' · laskettu seuran omasta datasta ' + esc(pvmFi(m.nyt)) + ' · N < 5 -ryhmien prosentit piilotettu · pelaajia ' + m.N + (m.N !== m.Nkaikki ? ' / ' + m.Nkaikki : '') + '</div></div>';
    h += '<div class="kt-toiminnot">'
      + (o.saaKirjoittaa ? '<button class="toimNappi" onclick="ktAvaaTavoitteet()">Aseta tavoitteet</button><button class="toimNappi" onclick="ktAvaaSeuratuki()">Kirjaa Kori 3 -tiedot</button>' : '')
      + (o.saaKirjoittaa ? (o.kausikuvaSallittu ? '<button class="toimNappi" onclick="ktTallennaKausikuva()">Tallenna kausikuva</button>'
        : '<button class="toimNappi" disabled title="Avautuu, kun pelaajan GDPR-poisto poistaa pelaajan myös kausikuvista">Tallenna kausikuva (tulossa)</button>') : '')
      + '<button class="toimNappi" onclick="ktVieRaportti(\'seura\')">Vie raportti</button><button class="toimNappi" onclick="ktVieRaportti(\'palloliitto\')">Palloliitto-raportti</button></div>';
    var valinta = function (nimi, arvot, nyk) { return '<label class="kt-suodatin">' + nimi + ' <select onchange="ktSuodata(\'' + nimi.toLowerCase() + '\',this.value)">' + arvot.map(function (a) {
      return '<option value="' + a[0] + '"' + (a[0] === nyk ? ' selected' : '') + '>' + esc(a[1]) + '</option>'; }).join('') + '</select></label>'; };
    h += '<div class="kt-suodattimet">'
      + valinta('Sukupuoli', [['kaikki', 'Kaikki'], ['M', 'Pojat'], ['N', 'Tytöt']], m.sukupuoli)
      + valinta('Ikävaihe', [['kaikki', 'Kaikki ikävaiheet']].concat(Object.keys(IKAVAIHEET).map(function (k) { return [k, IKAVAIHEET[k]]; })), m.ikavaihe)
      + valinta('Jakso', [['vuosi', 'Koko vuosi ' + m.vuosi], ['kevat', 'Kevät ' + m.vuosi + ' (1.1.–30.6.)'], ['syksy', 'Syksy ' + m.vuosi + ' (1.7.–31.12.)']], m.jakso)
      + '</div>';

    /* Lohko 1 */
    var L1 = m.lohko1, lk = L1.laskuri;
    h += '<div class="kortti"><div class="korttiHeader"><span class="korttiOtsikko">Lohko 1 · Seuran tavoitteet ' + m.vuosi + '</span><span class="korttiMaara">'
      + lk.tayttynyt + ' täyttynyt · ' + lk.raiteilla + ' raiteilla · ' + lk.riskissa + ' riskissä · ' + lk.puuttuu + ' puuttuu'
      + (m.kehikko && m.kehikko.arviointipaiva ? ' · Palloliiton seuraava arviointi ' + esc(pvmFi(m.kehikko.arviointipaiva)) : '') + '</span></div>'
      + (L1.asetuksetOmat ? '' : '<div class="kt-ala" style="padding:8px 16px">Seura ei ole asettanut omia tavoitteita: tavoitteena käytetään Palloliiton tasoja.</div>')
      + '<div class="taulukonWrapper"><table class="kt-taulu"><thead><tr><th>Mittari</th><th>Toteuma</th><th>Seuran tavoite</th><th>Palloliiton taso</th><th>Ennuste 31.12.</th><th>Tila</th></tr></thead><tbody>'
      + L1.rivit.map(function (r) {
        var to = r.toteuma.arvo == null ? (r.kasin ? '<span class="kt-tyhja">Puuttuu — kirjaa Kori 3 -tiedot</span>' : '<span class="kt-tyhja">Ei vielä dataa</span>')
          : (r.tila === 'liian_pieni' ? '<span class="kt-tyhja">Liian pieni ryhmä</span>' : '<b>' + tavoiteArvo(r, r.toteuma.arvo) + (r.yksikko === '%' && typeof r.toteuma.arvo === 'number' ? '' : '') + '</b>');
        var tTila = r.kasin && r.toteuma.arvo != null ? 'kirjattu' : r.toteuma.tila;
        return '<tr><td>' + esc(r.nimi) + '<div>' + meta(r.toteuma.N, r.toteuma.pvm, tTila) + (r.toteuma.huom ? '<div class="kt-meta">' + esc(r.toteuma.huom) + '</div>' : '') + '</div></td>'
          + '<td>' + to + '</td><td>' + (r.lahde === 'seura' ? tavoiteArvo(r, r.tavoite) : '<span class="kt-meta">(Palloliiton taso)</span>') + '</td>'
          + '<td>' + tavoiteArvo(r, r.palloliitto) + (r.plTila ? ' ' + tilaBadge(r.plTila) : '') + '</td>'
          + '<td>' + (r.ennuste == null || typeof r.ennuste === 'boolean' ? '—' : luku(r.ennuste)) + '</td><td>' + tilaBadge(r.tila) + '</td></tr>';
      }).join('') + '</tbody></table></div>'
      + '<div class="kt-ala" style="padding:8px 16px 14px">Tila lasketaan seuran tavoitetta vasten; Palloliiton taso näkyy vertailuna (myös sen tila, jos seuran tavoite on matalampi). Ennuste = lineaarinen kalenterivuoden loppuun. Kohtaamiset = havainnoinnit, itsereflektiot ja mentorointiviestit; lisenssit, tapahtumat, roolit, yhteistyöseurat ja T3 kirjataan käsin.</div></div>';

    /* Lohko 2 */
    h += '<div class="kortti"><div class="korttiHeader"><span class="korttiOtsikko">Lohko 2 · Pelaajakehitys D1–D5</span><span class="korttiMaara">Kehittyvien pelaajien osuus: ' + osuusTxt(L2.kehittyvat) + ' · Alustava</span></div><div class="kt-ruudukko">';
    h += kortti('D1 Fyysinen · testikohtainen muutos (SWC)', L2.testijakaumat.length ? L2.testijakaumat.map(function (t) {
      return '<div class="kt-testi"><div class="kt-testi-nimi">' + esc(t.nimi) + (t.rooli !== 'avain' ? ' <span class="kt-meta">diagnostiikka</span>' : '') + ' · ' + osuusTxt(t.osuus) + '</div>' + palkki(t.osuus.jakauma)
        + '<div class="kt-meta">N ' + t.N + ' · viimeisin mittaus ' + (t.pvm ? esc(pvmFi(t.pvm)) : '—') + ' · testiväli mediaani ' + (t.valiMediaaniPv != null ? Math.round(t.valiMediaaniPv / 30.4) + ' kk' : '—')
        + (t.pitkia ? ' · pitkä testiväli (yli 9 kk): ' + t.pitkia : '') + (t.swcLahteet.seura ? ' · SWC seuran hajonnasta: ' + t.swcLahteet.seura : '') + ' · Alustava</div></div>';
    }).join('') : tyhja('Fyysisiä testejä ei ole kirjattu.', 'Kirjaa kaksi testikierrosta (8 vk – 15 kk välein), niin muutos lasketaan.'),
      '↑ vahva (≥ SWC) · → vaihtelun sisällä · ↓ heikkeni · – ei vertailukelpoinen (kasvupyrähdys, ei paria, väli < 8 vk tai > 15 kk). SWC = 0,2 × SD, SD johdettu ikäluokan normirajoista (alustava oletus); CV-raja ei vielä käytössä. Kasvupyrähdyksessä olevia ei lasketa heikentyneiksi (§28).');
    var kb = o.k1bRef === 'bio' ? L2.k1bBio : L2.k1b;
    h += kortti('D1 · Kehittyykö vaadittua vauhtia? (' + (o.k1bRef === 'bio' ? 'kehitysvaihe, arvio' : 'kalenteri-ikä') + ')', kb.N || kb.jakauma.ei_vertailukelpoinen ? '<div>Nopeammin kuin ikätason odotus: <b>' + kb.jakauma.nopeammin + '</b> · Ikätason tahdissa: <b>' + kb.jakauma.tahdissa
      + '</b> · Hitaammin: <b>' + kb.jakauma.hitaammin + '</b> · Ei vertailukelpoinen: ' + kb.jakauma.ei_vertailukelpoinen + '</div><div class="kt-meta">Nopeammin-osuus ' + osuusTxt(kb.osuus) + '</div>'
      : tyhja('H-H-tasoa ei ole kahdelta testikierrokselta.', 'Kahdesta kierroksesta syntyy vertailu.'),
      'Eri asia kuin SWC: normi luetaan pelaajan tarkalla iällä (interpoloitu), joten tammikuun ikäluokan vaihto ei laske tasoa. Δ ≥ +0,5 tasoa = nopeammin, ±0,5 = vaaditussa tahdissa. Alustava.');
    h += kortti('D2–D5 · Arvioiden kehitys (kaksi viimeisintä arviointikertaa)', L2.k3.map(function (d) {
      var nimi = { D2: 'D2 Tekninen', D3: 'D3 Psyykkinen', D4: 'D4 Peliäly', D5: 'D5 Sosiaalinen' }[d.dim];
      return '<div class="kt-rivi"><span>' + nimi + '</span><span>' + (d.N ? '↑ ' + d.jakauma.ylos + ' · → ' + d.jakauma.sama + ' · ↓ ' + d.jakauma.alas + ' · ' + osuusTxt(d.osuus) : '<span class="kt-tyhja">Ei vielä dataa (tarvitaan kaksi arviointikertaa)</span>')
        + '</span></div><div class="kt-meta">' + (d.pvm ? 'viimeisin ' + esc(pvmFi(d.pvm)) : '') + '</div>';
    }).join(''), 'Muutos ≥ ±0,5 asteikolla 1–5. Ei arvioitu ei ole nolla.');
    var m2 = Object.keys(L2.M2);
    h += kortti('Kypsyys', '<div class="kt-rivi"><span>PHV-arvio alle 12 kk</span><span>' + osuusTxt(L2.M1) + '</span></div>'
      + '<div class="kt-rivi"><span>Kasvupyrähdyksessä (PH)</span><span>' + (m2.length ? m2.map(function (j) { return esc(j) + ' ' + L2.M2[j]; }).join(' · ') : '0') + '</span></div>'
      + '<div class="kt-rivi"><span>Myöhään kypsyvät (PRE/LAH) talenttiohjelmassa</span><span>' + osuusTxt(L2.M3.talentit) + '</span></div><div class="kt-rivi"><span>… koko pelaajistossa</span><span>' + osuusTxt(L2.M3.kaikki) + '</span></div>');
    var raeTxt = function (r) { return r.N ? ['Q1', 'Q2', 'Q3', 'Q4'].map(function (q) { return q + ' ' + r.q[q]; }).join(' · ') + ' (N ' + r.N + ')' : '<span class="kt-tyhja">Ei vielä dataa (syntymäajat puuttuvat)</span>'; };
    h += kortti('Syntymäkvartaalit (RAE)', '<div class="kt-rivi"><span>Kaikki</span><span>' + raeTxt(L2.M4.kaikki) + '</span></div><div class="kt-rivi"><span>Talenttiohjelma</span><span>' + raeTxt(L2.M4.talentit) + '</span></div>');
    h += kortti('IDP', '<div class="kt-rivi"><span>IDP-kattavuus (vähintään yksi tavoite)</span><span>' + osuusTxt(L2.P3.kattavuus) + '</span></div>'
      + '<div class="kt-rivi"><span>Vahvistetut sitoumukset</span><span>' + osuusTxt(L2.P3.sitoumus) + '</span></div>'
      + '<div class="kt-rivi"><span>Pysähtyneet tavoitteet (yli 8 vk ilman edistystä)</span><span>' + osuusTxt(L2.P4) + '</span></div>');
    h += kortti('Talentit', '<div class="kt-rivi"><span>X-tekijä talenttiohjelmassa</span><span>' + (L2.S1 ? osuusTxt(L2.S1) : '<span class="kt-tyhja">Ei vielä dataa — X-tekijä-signaalia ei vielä kirjata järjestelmään</span>') + '</span></div>'
      + '<div class="kt-rivi"><span>Vahvuuden jalostus (IDP-tavoite vahvuuteen)</span><span>' + osuusTxt(L2.S2) + '</span></div>'
      + '<div class="kt-rivi"><span>Hidden Gem -tunnistukset</span><span>' + (L2.S3.N ? '<b>' + L2.S3.n + '</b> <span class="kt-n">/ ' + L2.S3.N + ' arvioitavaa</span>' : '<span class="kt-tyhja">Ei vielä dataa</span>') + '</span></div>');
    h += kortti('Liikkuvuuskartoitus (lapsuus, 1–3 p)', L2.K7.some(function (k) { return k.N; }) ? L2.K7.map(function (k) {
      return '<div class="kt-rivi"><span>' + esc(k.nimi) + '</span><span>' + (k.N ? '<b>' + luku(k.ka) + '</b> <span class="kt-n">N ' + k.N + ' · ' + esc(pvmFi(k.pvm)) + '</span>' : '—') + '</span></div>'; }).join('')
      : tyhja('Harjoitettavuuskartoitusta ei ole kirjattu.', 'Kartoitus Testaus-työkalulla (protokolla U10–12) tuo luvut.'));
    h += kortti('Omatoiminen liikunta (lapsuus, 12 vk)', L2.K8.kirjaavat ? '<div class="kt-rivi"><span>Kirjaavia pelaajia</span><span><b>' + L2.K8.kirjaavat + '</b> / ' + L2.K8.N + '</span></div>'
      + '<div class="kt-rivi"><span>Viikkoja kirjauksin (ka)</span><span>' + luku(L2.K8.viikkojaKa) + ' / 12</span></div><div class="kt-rivi"><span>Täysiä viikkoja (7 pv)</span><span>' + L2.K8.taysiaViikkoja + '</span></div>'
      + '<div class="kt-meta">Palloliiton vertailu: 7 pv × 12 vk · viimeisin ' + esc(pvmFi(L2.K8.pvm)) + '</div>'
      : tyhja('Omatoimisia kirjauksia ei ole.', 'Pelaajat kirjaavat Pelaaja-sovelluksessa.', L2.K8.N ? 'Lapsuusvaiheen pelaajia ' + L2.K8.N : ''));
    var p1 = Object.keys(L2.P1);
    h += kortti('Toteutuneet harjoitustunnit / pelaaja / vk', p1.length ? p1.map(function (j) { return '<div class="kt-rivi"><span>' + esc(j) + '</span><span><b>' + luku(L2.P1[j].tunnitVk, 'h') + '</b> <span class="kt-n">N ' + L2.P1[j].N + ' · ' + L2.P1[j].viikot + ' vk</span></span></div>'; }).join('')
      : tyhja('Läsnäoloa ei ole kirjattu valitulla jaksolla.', 'Kun valmentaja merkitsee läsnäolon kalenteriin, tunnit lasketaan.'));
    var kk = L2.kausikuvat;
    h += kortti('Pysyvyys ja eteneminen', kk.length >= 2 ? '<div>Kahden kauden kausikuvat tallennettu — laskenta tulee versiossa 1.</div>'
      : '<div class="kt-tyhjatila"><b>Ei vielä dataa.</b> ' + (kk.length ? 'Kausikuva tallennettu ' + esc(pvmFi(kk[0].luotu)) + ' – pysyvyys näkyy kaudesta ' + (Number(kk[0].kausi) + 1) + '.' : 'Tallenna kausikuva kauden alussa.') + ' <span class="kt-n">Kausikuvia: ' + kk.length + ' / 2</span></div>');
    h += kortti('Ei vielä laskettavissa', '<div class="kt-tyhjatila">Peliaika näkyy, kun otteluiden kokoonpanot ja minuutit kirjataan.</div><div class="kt-tyhjatila">Peli-KPI:t näkyvät, kun otteluhavainnoinnit alkavat.</div>'
      + '<div class="kt-tyhjatila">Pääluku lasketaan, kun kaksi pilaria on mitattu.</div>');
    h += '</div></div>';

    /* Lohko 3 */
    h += '<div class="kortti"><div class="korttiHeader"><span class="korttiOtsikko">Lohko 3 · Joukkueet</span><span class="korttiMaara">Joukkueen nimestä aukeavat pelaajarivit</span></div>'
      + '<div class="taulukonWrapper"><table class="kt-taulu"><thead><tr><th>Joukkue</th><th>N (P / T)</th><th>Fyysinen ↑</th><th>IDP-kattavuus</th><th>Pysähtyneet</th><th>Havainnot</th><th>Viimeisin testi</th></tr></thead><tbody>'
      + (m.lohko3.length ? m.lohko3.map(function (r, i) {
        var lkm = function (o) { return o.N < 5 ? '<span class="kt-tyhja">liian pieni ryhmä</span>' : o.n + ' / ' + o.N; };
        var auki = o.auki && o.auki[r.nimi];
        return '<tr class="kt-jrivi"><td><button class="kt-linkki" onclick="ktAvaaJoukkue(' + i + ')">' + (auki ? '▾ ' : '▸ ') + esc(r.nimi) + '</button></td><td>' + r.N + ' (' + r.pojat + ' / ' + r.tytot + ')</td>'
          + '<td>' + lkm(r.fyysinen) + '</td><td>' + lkm(r.idp) + '</td><td>' + r.pysahtyneet + '</td><td>' + r.havainnot + '</td><td>' + (r.viimTesti ? esc(pvmFi(r.viimTesti)) : '—') + '</td></tr>'
          + (auki ? r.pelaajat.map(function (x) {
            var s = ['lin10m', 'lin30m', 'cmj', 'mas'].map(function (t) { return x.testit[t] ? '<span title="' + esc(t) + '">' + esc(x.testit[t].symboli || '–') + '</span>' : '<span class="kt-meta">·</span>'; }).join(' ');
            return '<tr class="kt-privi"><td><button class="kt-linkki" onclick="naytaPelaajaTiedot(\'' + esc(x.id) + '\')">' + esc(x.nimi) + '</button></td><td colspan="2">10m 30m CMJ MAS: ' + s + '</td><td>' + (x.idp ? 'IDP ' + x.idp : '—') + '</td><td>' + (x.jumissa ? 'pysähtynyt' : '') + '</td><td>' + (x.phv ? 'PHV ' + esc(x.phv) : '') + '</td><td>' + (x.hhPvm ? esc(pvmFi(x.hhPvm)) : '—') + '</td></tr>';
          }).join('') : '');
      }).join('') : '<tr><td colspan="7"><span class="kt-tyhja">Ei pelaajia valitulla suodatuksella.</span></td></tr>')
      + '</tbody></table></div></div>';

    /* Lohko 4 */
    var P7 = m.lohko4.P7;
    h += '<div class="kortti"><div class="korttiHeader"><span class="korttiOtsikko">Lohko 4 · Datan kattavuus</span></div><div style="padding:14px 16px">'
      + '<div class="kt-rivi"><span>Pelaajia, joilla testi alle 12 kk</span><span>' + osuusTxt(P7.testi) + '</span></div>'
      + '<div class="kt-rivi"><span>Harjoitushavainnot joukkueittain (jakso)</span><span>' + (P7.havainnot.length ? P7.havainnot.map(function (x) { return esc(x.nimi) + ' ' + x.n; }).join(' · ') : '—') + '</span></div>'
      + '<div class="kt-k-otsikko" style="margin-top:12px">Mitä kirjaamalla luku paranee</div>'
      + (m.lohko4.kehotteet.length ? '<ul class="kt-lista">' + m.lohko4.kehotteet.map(function (k) { return '<li>' + esc(k) + '</li>'; }).join('') + '</ul>' : '<div class="kt-meta">Ei puutteita valitulla suodatuksella.</div>')
      + '</div></div>';
    h += '<div class="kt-meta" style="margin:8px 0 24px">Vertailukehikko ' + esc(m.kehikko && m.kehikko.versio ? m.kehikko.versio : (m.kehikko && m.kehikko.nimi) || '—') + ' · SWC alustava (persentiilioletus) · ei arvioitu ≠ 0 · ei terveystietoa</div>';
    return h;
  }

  /* ════════════════ ENSINÄKYMÄ (brief: KISS ja Oura-tyyli) ════════════════
     Rengas (kaikki tavoitteet tiloittain) · yksi lause · "Seuraavaksi" · kolme tekijää · info · toiminnot. Ei taulukoita.
     o = { avoin:'pelaajat'|'valmennus'|'seura'|null, info:bool, k1bRef:'kal'|'bio', kaikki:bool, saaKirjoittaa, kausikuvaSallittu, auki } */
  var JARJ = ['tayttynyt', 'raiteilla', 'riskissa', 'puuttuu'];
  var VARI = { tayttynyt: '#28B090', raiteilla: 'rgba(40,176,144,.55)', riskissa: '#E0A040', puuttuu: '#D06A5A' };
  function chip(t) { var n = t === 'tayttynyt' ? '✓ Täyttynyt' : (TILA_NIMI[t] || 'Ei vielä dataa'); return '<span class="ke-chip ke-chip-' + (t || 'eidataa') + '">' + esc(n) + '</span>'; }
  function arvoTxt(r, x) { if (x == null) return '–'; if (typeof x === 'boolean') return x ? '✓' : '✗'; return luku(x) + (r.yksikko === '%' ? ' %' : ''); }
  function ensinakymaMalli(m) {
    var K = _dep().K, rivit = m.lohko1.rivit.filter(function (r) { return JARJ.indexOf(r.tila) >= 0; });
    var raiteilla = rivit.filter(function (r) { return r.tila === 'tayttynyt' || r.tila === 'raiteilla'; }).length;
    var tekijat = K.TEKIJAT.map(function (t) {
      var omat = rivit.filter(function (r) { return (K.MITTARIT[r.avain] || {}).tekija === t.id; });
      var heikoin = null; omat.forEach(function (r) { if (heikoin == null || JARJ.indexOf(r.tila) > JARJ.indexOf(heikoin.tila)) heikoin = r; });
      var tila = heikoin ? (heikoin.tila === 'tayttynyt' ? 'raiteilla' : heikoin.tila) : null;
      return { id: t.id, nimi: t.nimi, lyhyt: t.lyhyt, rivit: omat, heikoin: heikoin, tila: tila,
        ok: omat.filter(function (r) { return r.tila === 'tayttynyt' || r.tila === 'raiteilla'; }).length };
    });
    // Seuraavaksi: 1) puuttuva testikierros 2) puuttuva käsin kirjattava tieto 3) eniten riskissä oleva tavoite
    var raja = new Date(Date.parse(m.nyt + 'T00:00:00Z') - 365 * 864e5).toISOString().slice(0, 10);
    var vanhat = m.lohko3.filter(function (j) { var v = j.pelaajat.filter(function (x) { return !x.hhPvm || x.hhPvm < raja; }).length; return j.N >= 5 && v / j.N >= 0.3; }).map(function (j) { return j.nimi; });
    var seuraavaksi;
    if (vanhat.length) seuraavaksi = 'Kirjaa testikierros ' + (vanhat.length === 1 ? 'joukkueelle ' + vanhat[0] : 'joukkueille ' + vanhat.slice(0, -1).join(', ') + ' ja ' + vanhat[vanhat.length - 1]) + ' – fyysisen kehityksen luku tarkentuu.';
    else {
      var puuttuu = rivit.filter(function (r) { return r.tila === 'puuttuu'; })[0];
      var riski = rivit.filter(function (r) { return r.tila === 'riskissa' && typeof r.toteuma.arvo === 'number' && r.tavoite; })
        .sort(function (a, b) { return a.toteuma.arvo / a.tavoite - b.toteuma.arvo / b.tavoite; })[0];
      if (puuttuu) seuraavaksi = 'Kirjaa Kori 3 -tiedot: ' + puuttuu.nimi.toLowerCase() + ' puuttuu' + (puuttuu.palloliitto != null ? ' (Palloliiton vaatimus).' : '.');
      else if (riski) seuraavaksi = riski.nimi + ': ' + arvoTxt(riski, riski.toteuma.arvo) + ', tavoite ' + arvoTxt(riski, riski.tavoite) + ' – ennusteella jää vajaaksi.';
      else seuraavaksi = rivit.length ? 'Pidä suunta: kaikki tavoitteet ovat raiteilla.' : 'Aseta seuran tavoitteet tai kirjaa ensimmäiset tiedot.';
    }
    var heikot = tekijat.filter(function (t) { return t.tila === 'riskissa' || t.tila === 'puuttuu'; });
    var hyvat = tekijat.filter(function (t) { return t.tila === 'raiteilla'; });
    var lista = function (xs) { var n = xs.map(function (t) { return t.lyhyt.toLowerCase(); }); return n.length > 1 ? n.slice(0, -1).join(', ') + ' ja ' + n[n.length - 1] : n[0]; };
    var isolla = function (x) { return x.charAt(0).toUpperCase() + x.slice(1); };
    var otsikko = !rivit.length ? 'Kehitystilanne rakentuu, kun dataa kertyy.'
      : !heikot.length ? 'Seura on menossa oikeaan suuntaan.'
      : heikot.length === tekijat.length ? 'Kaikilla kolmella alueella on tavoitteita, jotka jäävät vajaaksi.'
      : !hyvat.length ? isolla(lista(heikot)) + ' ' + (heikot.length > 1 ? 'jäävät' : 'jää') + ' tavoitteesta.'
      : isolla(lista(hyvat)) + ' ' + (hyvat.length > 1 ? 'ovat' : 'on') + ' raiteilla, ' + lista(heikot) + ' ' + (heikot.length > 1 ? 'jäävät' : 'jää') + ' tavoitteesta.';
    var kehRivi = m.lohko1.rivit.filter(function (r) { return r.avain === 'A_kehittyvat'; })[0];
    var lause = raiteilla + ' / ' + rivit.length + ' tavoitetta raiteilla.' + (m.lohko2.kehittyvat.arvo != null ? ' ' + luku(m.lohko2.kehittyvat.arvo) + ' % pelaajista kehittyy fyysisesti' + (kehRivi && kehRivi.tavoite != null ? ', tavoite ' + luku(kehRivi.tavoite) + ' %.' : '.') : '');
    return { rivit: rivit, raiteilla: raiteilla, tekijat: tekijat, seuraavaksi: seuraavaksi, otsikko: otsikko, lause: lause };
  }
  function rengas(e) {
    var r = 70, C = 2 * Math.PI * r, n = e.rivit.length || 1, seg = C / n, rako = n > 1 ? 3 : 0;
    var jarj = e.rivit.slice().sort(function (a, b) { return JARJ.indexOf(a.tila) - JARJ.indexOf(b.tila); });
    var laskuri = {}; jarj.forEach(function (x) { laskuri[x.tila] = (laskuri[x.tila] || 0) + 1; });
    var aria = e.raiteilla + ' / ' + e.rivit.length + ' tavoitetta raiteilla: ' + JARJ.filter(function (t) { return laskuri[t]; }).map(function (t) { return laskuri[t] + ' ' + TILA_NIMI[t].toLowerCase(); }).join(', ');
    return '<div class="ke-rengas" role="img" aria-label="' + esc(aria) + '"><svg viewBox="0 0 160 160" width="200" height="200"><circle cx="80" cy="80" r="70" fill="none" stroke="rgba(242,239,230,.08)" stroke-width="10"/>'
      + jarj.map(function (x, i) { return '<circle cx="80" cy="80" r="70" fill="none" stroke="' + VARI[x.tila] + '" stroke-width="10" stroke-dasharray="' + (seg - rako).toFixed(2) + ' ' + (C - seg + rako).toFixed(2) + '" stroke-dashoffset="' + (-i * seg).toFixed(2) + '" transform="rotate(-90 80 80)"/>'; }).join('')
      + '</svg><div class="ke-rengas-sis"><div class="ke-iso">' + e.raiteilla + '<span> / ' + e.rivit.length + '</span></div><div class="ke-pieni">tavoitetta raiteilla</div></div></div>';
  }
  function jakaumaPalkki(osat) {   // [[lukumäärä, luokka, nimi], ...] — selite lukumäärinä (väri ei ole ainoa tieto; % vain otsikossa)
    var N = osat.reduce(function (a, o) { return a + o[0]; }, 0) || 1;
    return '<div class="ke-palkki" aria-hidden="true">' + osat.filter(function (o) { return o[0] > 0; }).map(function (o) { return '<span class="ke-p ' + o[1] + '" style="width:' + (o[0] / N * 100).toFixed(1) + '%"></span>'; }).join('') + '</div>'
      + '<div class="ke-selite">' + osat.map(function (o) { return '<span><i class="ke-p ' + o[1] + '"></i>' + esc(o[2]) + ' ' + o[0] + '</span>'; }).join('') + '</div>';
  }
  function renderEnsinakyma(m, o) {
    o = o || {};
    var e = ensinakymaMalli(m), L2 = m.lohko2, h = '';
    var jaksoNimi = { vuosi: 'koko vuosi ' + m.vuosi, kevat: 'kevät ' + m.vuosi, syksy: 'syksy ' + m.vuosi }[m.jakso];
    var nappi = function (teksti, paalla, onclick) { return '<button class="ke-vaihto' + (paalla ? ' paalla' : '') + '" aria-pressed="' + (paalla ? 'true' : 'false') + '" onclick="' + onclick + '">' + esc(teksti) + '</button>'; };
    h += '<div class="ke"><div class="ke-ylarivi"><div class="ke-eyebrow">Kehitystilanne · ' + esc(jaksoNimi) + ' · päivitetty ' + esc(pvmFi(m.nyt)) + (m.kehikko && m.kehikko.nimi ? ' · vertailu ' + esc(m.kehikko.nimi) : '') + '</div>'
      + '<div class="ke-suod"><div class="ke-ryhma">' + [['kaikki', 'Kaikki'], ['M', 'Pojat'], ['N', 'Tytöt']].map(function (g) { return nappi(g[1], m.sukupuoli === g[0], "ktSuodata('sukupuoli','" + g[0] + "')"); }).join('') + '</div>'
      + '<label class="ke-valinta">Jakso <select onchange="ktSuodata(\'jakso\',this.value)">' + [['vuosi', 'Koko vuosi ' + m.vuosi], ['kevat', 'Kevät ' + m.vuosi], ['syksy', 'Syksy ' + m.vuosi]].map(function (a) { return '<option value="' + a[0] + '"' + (a[0] === m.jakso ? ' selected' : '') + '>' + a[1] + '</option>'; }).join('') + '</select></label>'
      + '<label class="ke-valinta">Ikävaihe <select onchange="ktSuodata(\'ikävaihe\',this.value)">' + [['kaikki', 'Kaikki']].concat(Object.keys(IKAVAIHEET).map(function (k) { return [k, IKAVAIHEET[k]]; })).map(function (a) { return '<option value="' + a[0] + '"' + (a[0] === m.ikavaihe ? ' selected' : '') + '>' + esc(a[1]) + '</option>'; }).join('') + '</select></label></div></div>';
    // Hero: rengas + lause + seuraavaksi
    h += '<div class="ke-hero">' + rengas(e) + '<div class="ke-hero-teksti"><h2 class="ke-otsikko">' + esc(e.otsikko) + '</h2><p class="ke-lause">' + esc(e.lause) + '</p>'
      + '<div class="ke-seuraavaksi"><span class="ke-label">Seuraavaksi</span><span>' + esc(e.seuraavaksi) + '</span></div>'
      + '<div><button class="ke-info-nappi" aria-expanded="' + (o.info ? 'true' : 'false') + '" onclick="ktInfo()">ⓘ Miten luvut lasketaan</button></div></div></div>';
    if (o.info) {
      var P7 = m.lohko4.P7, hav = P7.havainnot, havOk = hav.filter(function (x) { return x.n > 0; }).length;
      var kattavuus = [['Pelaajia, joilla testi alle 12 kk', P7.testi], ['Pelaajia, joilla kypsyysarvio alle 12 kk', L2.M1]];
      h += '<div class="ke-info"><div><div class="ke-label ke-sininen">Laskentaperiaatteet</div><p>Tila lasketaan seuran omaa tavoitetta vasten; ' + esc(m.kehikko && m.kehikko.nimi ? m.kehikko.nimi : 'Palloliiton') + ' -taso näkyy vertailuna. Tekijän tila on sen heikoimman tavoitteen tila.</p>'
        + '<p>Fyysiset luvut nojaavat TalentMasterin normeihin: todellinen muutos (SWC = 0,2 × SD normirajoista) ja ikätaso (normi luettuna pelaajan tarkalla iällä). Merkintä "Alustava", kunnes kerroin on vahvistettu. Kasvupyrähdyksessä olevaa ei verrata.</p>'
        + '<p>Alle viiden pelaajan ryhmistä ei näytetä prosentteja. Ei arvioitu ei ole nolla. Ei terveystietoa. Ennuste on lineaarinen kalenterivuoden loppuun.</p></div>'
        + '<div><div class="ke-label ke-sininen">Datan kattavuus</div>' + kattavuus.map(function (k) {
          var v = k[1].arvo; return '<div class="ke-kattavuus"><div class="ke-kat-rivi"><span>' + esc(k[0]) + '</span><span class="ke-mono">' + (v == null ? '–' : luku(v) + ' %') + '</span></div><div class="ke-kat-palkki"><span style="width:' + (v || 0) + '%"></span></div></div>';
        }).join('') + '<div class="ke-kattavuus"><div class="ke-kat-rivi"><span>Joukkueita, joilla havaintoja jaksolla</span><span class="ke-mono">' + havOk + ' / ' + hav.length + '</span></div><div class="ke-kat-palkki"><span style="width:' + (hav.length ? havOk / hav.length * 100 : 0) + '%"></span></div></div></div></div>';
    }
    // Kolme tekijää
    h += '<div class="ke-tekijat">' + e.tekijat.map(function (t) {
      var auki = o.avoin === t.id, arvo, rivi, pct;
      if (t.id === 'pelaajat') {
        var r0 = t.rivit[0], kv = m.lohko2.kehittyvat, v = L2.k1b.vahintaan;
        arvo = kv.arvo == null ? '–' : luku(kv.arvo) + ' %';
        pct = kv.arvo != null && r0 && r0.tavoite ? kv.arvo / r0.tavoite * 100 : 0;
        rivi = kv.arvo == null ? (kv.tila === 'liian_pieni' ? 'Liian pieni ryhmä prosenttiin.' : 'Ei vielä dataa: tarvitaan kaksi testikierrosta.')
          : 'kehittyy fyysisesti' + (r0 && r0.tavoite != null ? ', tavoite ' + luku(r0.tavoite) + ' %' : '') + '.' + (v.arvo != null ? ' Ikätasoon nähden ' + luku(v.arvo) + ' % vähintään vaadittua vauhtia.' : '');
      } else {
        arvo = t.rivit.length ? t.ok + ' / ' + t.rivit.length : '–';
        pct = t.rivit.length ? t.ok / t.rivit.length * 100 : 0;
        var hk = t.heikoin;
        rivi = !t.rivit.length ? 'Ei vielä tavoitteita tai tietoja.'
          : (t.tila === 'raiteilla' ? 'raiteilla.' : '') + (hk && (hk.tila === 'riskissa' || hk.tila === 'puuttuu')
            ? ' ' + hk.nimi + (hk.tila === 'puuttuu' ? ' puuttuu' + (hk.palloliitto != null ? ', Palloliiton vaatimus.' : '.') : ': ' + arvoTxt(hk, hk.toteuma.arvo) + ', tavoite ' + arvoTxt(hk, hk.tavoite) + ' – ennusteella jää vajaaksi.') : '');
      }
      return '<button class="ke-tekija' + (auki ? ' auki' : '') + '" aria-expanded="' + (auki ? 'true' : 'false') + '" onclick="ktAvaaTekija(\'' + t.id + '\')">'
        + '<span class="ke-t-yla"><span class="ke-label ke-sininen">' + esc(t.nimi) + '</span>' + chip(t.tila) + '</span>'
        + '<span class="ke-t-arvo">' + esc(arvo) + '</span><span class="ke-mini"><span style="width:' + Math.min(100, Math.round(pct)) + '%;background:' + (VARI[t.tila] || 'rgba(242,239,230,.2)') + '"></span></span>'
        + '<span class="ke-t-rivi">' + esc(rivi.trim()) + '</span><span class="ke-t-cta">' + (auki ? 'Sulje ‹' : 'Avaa ›') + '</span></button>';
    }).join('') + '</div>';
    // Avattu tekijä
    if (o.avoin === 'pelaajat') {
      var avain = L2.testijakaumat.filter(function (t) { return t.rooli === 'avain'; });
      var kb = o.k1bRef === 'bio' ? L2.k1bBio : L2.k1b, kj = kb.jakauma;
      h += '<div class="ke-paneeli"><div class="ke-p-otsikko"><span class="ke-label">Pelaajat kehittyvät · fyysinen</span></div>'
        + '<div class="ke-kaksi"><div><h3 class="ke-h3">Oliko muutos todellinen? <span class="ke-chip ke-chip-alustava">Alustava</span></h3>'
        + (avain.length ? avain.map(function (t) {
          var j = t.osuus.jakauma;
          return '<div class="ke-testi"><div class="ke-kat-rivi"><span>' + esc(t.nimi) + '</span><span class="ke-mono">' + (t.osuus.arvo == null ? osuusTxt(t.osuus) : 'parani ' + luku(t.osuus.arvo) + ' % (' + t.osuus.n + ' / ' + t.osuus.N + ')') + '</span></div>'
            + jakaumaPalkki([[j.vahva_ylos, 'ke-ylos', 'parani'], [j.vaihtelu + j.mahd_ylos + j.mahd_alas, 'ke-sama', 'vaihtelun sisällä'], [j.vahva_alas, 'ke-alas', 'laski'], [j.ei_vertailukelpoinen, 'ke-eivk', 'ei vertailukelpoinen']]) + '</div>';
        }).join('') : tyhja('Fyysisiä testejä ei ole kirjattu.', 'Kaksi testikierrosta 8 vk – 15 kk välein tuo luvun.'))
        + '</div><div><h3 class="ke-h3">Kehittyykö vaadittua vauhtia?</h3><div class="ke-ryhma">' + nappi('Kalenteri-ikä', o.k1bRef !== 'bio', "ktK1bRef('kal')") + nappi('Kehitysvaihe', o.k1bRef === 'bio', "ktK1bRef('bio')") + '</div>'
        + (kb.Nkaikki ? '<div class="ke-kat-rivi"><span>Vähintään vaadittua vauhtia</span><span class="ke-mono">' + (kb.vahintaan.arvo == null ? osuusTxt(kb.vahintaan) : luku(kb.vahintaan.arvo) + ' % (' + kb.vahintaan.n + ' / ' + kb.vahintaan.N + ')') + '</span></div><div class="ke-meta">' + (o.k1bRef === 'bio' ? 'kehitysvaihe (biologinen ikä, arvio)' + (kb.kalenteriVara ? ' · ' + kb.kalenteriVara + ' ilman kypsyysarviota → kalenteri-ikä' : '') : 'kalenteri-ikä mittauspäivänä') + (kb.rajattu ? ' · ' + kb.rajattu + ' normitaulukon ulkopuolella (lähin ikäluokka)' : '') + ' · Alustava</div>'
          + jakaumaPalkki([[kj.nopeammin, 'ke-ylos', 'nopeammin'], [kj.tahdissa, 'ke-sama', 'vaaditussa tahdissa'], [kj.hitaammin, 'ke-alas', 'hitaammin'], [kj.ei_vertailukelpoinen, 'ke-eivk', 'ei vertailukelpoinen']])
          : tyhja('Ikätasoa ei voi vielä verrata.', 'Tarvitaan kaksi testikierrosta (30 m, CMJ tai MAS).'))
        + '<p class="ke-meta">' + (o.k1bRef === 'bio' ? 'Normi luetaan pelaajan biologisella iällä: varhain kypsyvää verrataan vanhempiin, myöhään kypsyvää nuorempiin. Vaatii kypsyysmittauksen.' : 'Vaadittu vauhti tulee normeista: normi luetaan pelaajan tarkalla iällä, joten pelkkä ikääntyminen vaatii parannusta (esim. tason 3 pitäminen 30 m:llä noin 0,1 s vuodessa).') + '</p></div></div>'
        + '<div class="taulukonWrapper"><table class="ke-taulu"><thead><tr><th>Joukkue</th><th>N</th><th>Parani</th><th>IDP</th><th>Viimeisin testi</th></tr></thead><tbody>'
        + m.lohko3.map(function (r, i) {
          var pieni = function (x) { return x.N < 5 ? 'alle 5' : x.N ? Math.round(x.n / x.N * 100) + ' %' : '–'; };
          var auki2 = o.auki && o.auki[r.nimi];
          return '<tr><td><button class="kt-linkki" onclick="ktAvaaJoukkue(' + i + ')">' + esc(r.nimi) + ' ' + (auki2 ? '‹' : '›') + '</button></td><td>' + r.N + '</td><td>' + pieni(r.fyysinen) + '</td><td>' + pieni(r.idp) + '</td><td>' + (r.viimTesti ? esc(pvmFi(r.viimTesti)) : '–') + '</td></tr>'
            + (auki2 ? r.pelaajat.map(function (x) { return '<tr class="kt-privi"><td colspan="5"><button class="kt-linkki" onclick="naytaPelaajaTiedot(\'' + esc(x.id) + '\')">' + esc(x.nimi) + ' ›</button></td></tr>'; }).join('') : '');
        }).join('') + '</tbody></table></div><div class="ke-meta">Joukkueesta aukeavat pelaajarivit ja niistä pelaajakortti.</div></div>';
    } else if (o.avoin === 'valmennus' || o.avoin === 'seura') {
      var t = e.tekijat.filter(function (x) { return x.id === o.avoin; })[0];
      h += '<div class="ke-paneeli"><div class="ke-p-otsikko"><span class="ke-label">' + esc(t.nimi) + '</span><span class="ke-h3">' + (t.id === 'valmennus' ? 'Omat tavoitteet ja Palloliiton taso' : 'Rakenteet ja Kori 3 -vaatimukset') + '</span></div>'
        + (t.rivit.length ? t.rivit.map(function (r) {
          var src = (_dep().K.MITTARIT[r.avain] || {}).lahde || '';
          var pct = typeof r.toteuma.arvo === 'number' && r.tavoite ? Math.min(100, r.toteuma.arvo / r.tavoite * 100) : (r.toteuma.arvo === true ? 100 : 0);
          return '<div class="ke-kriteeri"><div class="ke-k-nimi"><div>' + esc(r.nimi) + '</div><div class="ke-meta">' + esc(src) + (r.toteuma.pvm ? ' · ' + esc(pvmFi(r.toteuma.pvm)) : '') + '</div></div>'
            + '<div class="ke-k-arvo"><span class="ke-t-arvo ke-pienempi">' + arvoTxt(r, r.toteuma.arvo) + '</span> <span class="ke-meta">' + (r.tavoite == null ? '' : (typeof r.tavoite === 'boolean' ? 'vaatimus' : 'tavoite ' + arvoTxt(r, r.tavoite))) + '</span></div>'
            + '<div class="ke-meta">Palloliitto ' + (r.palloliitto == null ? '–' : (typeof r.palloliitto === 'boolean' ? 'vaatimus' : arvoTxt(r, r.palloliitto))) + (r.plTila ? ' ' + chip(r.plTila) : '') + '</div>'
            + '<div>' + chip(r.tila) + '</div><div class="ke-mini ke-kriteeri-palkki"><span style="width:' + Math.round(pct) + '%;background:' + VARI[r.tila] + '"></span></div></div>';
        }).join('') : tyhja('Tavoitteita ei ole.', 'Aseta tavoitteet tai kirjaa Kori 3 -tiedot.')) + '</div>';
    }
    // Toiminnot + kaikki luvut
    h += '<div class="ke-toiminnot">' + (o.saaKirjoittaa ? '<button class="ke-toim" onclick="ktAvaaTavoitteet()">Aseta tavoitteet</button><button class="ke-toim" onclick="ktAvaaSeuratuki()">Kirjaa Kori 3 -tiedot</button>'
        + (o.kausikuvaSallittu ? '<button class="ke-toim" onclick="ktTallennaKausikuva()">Tallenna kausikuva</button>' : '<button class="ke-toim" disabled title="Avautuu, kun pelaajan GDPR-poisto poistaa pelaajan myös kausikuvista">Tallenna kausikuva (tulossa)</button>') : '')
      + '<button class="ke-toim" onclick="ktVieRaportti(\'seura\')">↗ Vie raportti</button><button class="ke-toim" onclick="ktVieRaportti(\'palloliitto\')">↗ Palloliitto-raportti</button>'
      + '<button class="ke-toim ke-toim-kevyt" aria-expanded="' + (o.kaikki ? 'true' : 'false') + '" onclick="ktKaikkiLuvut()">' + (o.kaikki ? 'Piilota kaikki luvut ‹' : 'Kaikki luvut ›') + '</button></div></div>';
    return h;
  }

  /* Raportti: ei pelaajanimiä. tyyppi 'seura' (omat tavoitteet) | 'palloliitto' (Palloliiton kriteerit ja tilat). */
  function raporttiHTML(m, tyyppi) {
    var pl = tyyppi === 'palloliitto', M = _dep().M;
    var rivit = m.lohko1.rivit.map(function (r) {
      var tav = pl ? r.palloliitto : r.tavoite;
      var tila = pl ? (r.palloliitto == null ? null : (r.plTila || (r.lahde === 'palloliitto' ? r.tila : M.tavoitteenTila({ toteuma: r.toteuma.arvo, tavoite: r.palloliitto, tyyppi: _dep().K.MITTARIT[r.avain].kertyma, nyt: m.nyt, vuosi: m.vuosi }).tila))) : r.tila;
      if (pl && r.palloliitto == null) return '';
      return '<tr><td>' + esc(r.nimi) + '</td><td>' + (r.toteuma.arvo == null ? 'Puuttuu' : (typeof r.toteuma.arvo === 'boolean' ? (r.toteuma.arvo ? 'Täyttyy' : 'Ei') : luku(r.toteuma.arvo))) + '</td><td>' + (tav == null ? '—' : (typeof tav === 'boolean' ? 'Täyttyy' : luku(tav))) + '</td><td>' + esc(TILA_NIMI[tila] || '—') + '</td></tr>';
    }).join('');
    var L2 = m.lohko2;
    var otsikko = pl ? 'Palloliitto-raportti' : 'Seuran kehitysraportti';
    return '<!doctype html><html lang="fi"><head><meta charset="utf-8"><title>' + esc(otsikko) + '</title><style>body{font-family:Arial,sans-serif;color:#111;margin:18mm;font-size:10.5pt}h1{font-size:16pt;margin:0 0 4px}h2{font-size:12pt;margin:16px 0 6px}table{border-collapse:collapse;width:100%}td,th{border:1px solid #bbb;padding:4px 6px;text-align:left}th{background:#eee}.m{color:#555;font-size:9pt}@page{size:A4;margin:12mm}</style></head><body>'
      + '<h1>' + esc(otsikko) + ': ' + esc(m.seura.nimi) + '</h1><div class="m">' + esc(m.kehikko && m.kehikko.nimi ? m.kehikko.nimi : 'Palloliiton kori ei asetettu') + (m.seura.tukikausi ? ' · tukikausi ' + esc(m.seura.tukikausi) : '') + ' · laskettu ' + esc(pvmFi(m.nyt)) + ' · pelaajia ' + m.N + '</div>'
      + '<h2>1 · ' + (pl ? 'Palloliiton kriteerit' : 'Seuran tavoitteet') + ' ' + m.vuosi + '</h2><table><tr><th>Mittari</th><th>Toteuma</th><th>' + (pl ? 'Palloliiton taso' : 'Tavoite') + '</th><th>Tila</th></tr>' + rivit + '</table>'
      + '<h2>2 · Pelaajakehitys</h2><table><tr><th>Mittari</th><th>Arvo</th></tr>'
      + '<tr><td>Kehittyvien pelaajien osuus (alustava)</td><td>' + (L2.kehittyvat.arvo == null ? 'Ei vielä dataa' : L2.kehittyvat.arvo.toString().replace('.', ',') + ' % (' + L2.kehittyvat.n + ' / ' + L2.kehittyvat.N + ')') + '</td></tr>'
      + L2.testijakaumat.filter(function (t) { return t.rooli === 'avain'; }).map(function (t) { return '<tr><td>' + esc(t.nimi) + ' ↑</td><td>' + (t.osuus.arvo == null ? 'Ei vielä dataa' : t.osuus.arvo.toString().replace('.', ',') + ' % (' + t.osuus.n + ' / ' + t.osuus.N + ')') + '</td></tr>'; }).join('')
      + L2.k3.map(function (d) { return '<tr><td>' + d.dim + ' arvioiden kehitys ↑</td><td>' + (d.osuus.arvo == null ? 'Ei vielä dataa' : d.osuus.arvo.toString().replace('.', ',') + ' % (' + d.osuus.n + ' / ' + d.osuus.N + ')') + '</td></tr>'; }).join('')
      + '<tr><td>IDP-kattavuus</td><td>' + (L2.P3.kattavuus.arvo == null ? 'Ei vielä dataa' : L2.P3.kattavuus.arvo.toString().replace('.', ',') + ' %') + '</td></tr>'
      + '<tr><td>PHV-arvio alle 12 kk</td><td>' + (L2.M1.arvo == null ? 'Ei vielä dataa' : L2.M1.arvo.toString().replace('.', ',') + ' %') + '</td></tr></table>'
      + '<h2>3 · Datan kattavuus</h2><table><tr><td>Testi alle 12 kk</td><td>' + (m.lohko4.P7.testi.arvo == null ? 'Ei vielä dataa' : m.lohko4.P7.testi.arvo.toString().replace('.', ',') + ' %') + '</td></tr></table>'
      + '<p class="m">Laskettu TalentMasterissa seuran omasta datasta. Ei pelaajanimiä. Alle viiden pelaajan ryhmien prosentit piilotettu. Fyysisen kehityksen raja (SWC) on alustava.</p>'
      + '<script>window.onload=function(){setTimeout(function(){window.print()},300)}<\/script></body></html>';
  }

  var API = { rakennaMalli: rakennaMalli, renderNakyma: renderNakyma, renderEnsinakyma: renderEnsinakyma, ensinakymaMalli: ensinakymaMalli, raporttiHTML: raporttiHTML, ikavaihe: ikavaihe, esc: esc };
  if (typeof module !== 'undefined' && module.exports) module.exports = API;
  if (root) root.TM_KEHITYSTILANNE = API;
})(typeof window !== 'undefined' ? window : null);
