/* ════════════════════════════════════════════════════════════════════════
   tm_nakyma_ryhmat.js — "YKSI TOTUUS NÄKYMISSÄ": Masterin ja VP:n D1/D2-kortti, ponnahdusikkuna, vanhuusbanneri ja kattavuus samasta luokittelusta. PURE. Dual-export: module.exports + window.TM_NAKYMA_RYHMAT.
   Näkymä EI laske itse eikä sisällä omaa rajaa: pelaajan luokka tulee lib/tm_tekniikka.js (D2: TKI → SM) ja lib/tm_fyysinen.js (D1), rajat lib/tm_normisto.js (VANHA_KK 15 kk, MUISTUTUS_KK 12 kk), päivän lähde lib/tm_testipaiva.js.
   EI lueta tallennettuja d1_taso / d2_taso / hh_taso -kenttiä luokitteluun.
   tmRyhmat(dim, P, nytMs, opts) → { dim, yht, ryhmat:{kehityskohde,ok,neutraali,vanha,paiva_tuntematon,ei_dataa:[rivi]}, luokka (joukkueluokka libistä), kortti:{mitattu,yht,neutraali,vanha,paivaTuntematon,eiDataa,arvioita,muistutuksia}, kk, muistutusKk }
     dim 'd1' | 'd2'; rivi = { p, ryhma, syy, osat, mittari, arvo, tasot, iso, kk, arvio, kausi, muistutus }
     ryhmät: kehityskohde (syy) · ok · neutraali (D2: nopeus ja tekniikka samalla tasolla; D1: kypsyys ratkaisee §28) · vanha (tulos yli 15 kk) · paiva_tuntematon · ei_dataa
   tmNakymaYhteenveto(P, nytMs, opts) → { d1, d2, banneri:{n, kk}, kattavuus:{...} }
   Tekstit: t = käännösfunktio, avaimet suomeksi (sv-erä 18, lib.tm_nakyma_ryhmat, sv tyhjä).
   ════════════════════════════════════════════════════════════════════════ */
(function (root) {
  'use strict';
  var RYHMAT = ['kehityskohde', 'ok', 'neutraali', 'vanha', 'paiva_tuntematon', 'ei_dataa'];
  var OSA_NIMI = { kiihdytys: 'Kiihdytys', maksinopeus: 'Maksiminopeus', voima: 'Voima', aerobinen: 'Aerobinen', ketteryys: 'Ketteryys', suunnanmuutos: 'Suunnanmuutos' };

  function _lib(f, g) { try { var m = (typeof module !== 'undefined' && module.exports && typeof require === 'function') ? require(f) : (root || {}); return m[g] || m; } catch (e) { return root || {}; } }
  function _TK() { var L = _lib('./tm_tekniikka.js', 'TM_TEKNIIKKA'); return L.tmTekniikkaMittari ? L : (root && root.TM_TEKNIIKKA) || {}; }
  function _FY() { var L = _lib('./tm_fyysinen.js', 'TM_FYSINEN'); return L.tmFyysinenPelaaja ? L : (root && root.TM_FYSINEN) || {}; }
  function _LU() { var L = _lib('./tm_koti_luvut.js', 'TM_KOTI_LUVUT'); return L.kattavuus ? L : (root && root.TM_KOTI_LUVUT) || {}; }
  function _NO() { var L = _lib('./tm_normisto.js', 'TM_NORMISTO'); return L.tmNormistoKaytto ? L : (root && root.TM_NORMISTO) || {}; }
  function _fill(s, o) { return String(s).replace(/\{(\w+)\}/g, function (m, k) { return o && o[k] != null ? o[k] : m; }); }
  function _tt(t) { return typeof t === 'function' ? t : function (x) { return x; }; }
  function _rajat(opts) { var K = null; try { K = _NO().tmNormistoKaytto(opts && opts.asetukset); } catch (e) { K = null; } return { kk: K && K.R ? K.R.VANHA_KK : 15, muistutusKk: K && K.R ? K.R.MUISTUTUS_KK : 12 }; }
  function _pvmFi(iso) { var m = String(iso || '').match(/^(\d{4})-(\d{2})-(\d{2})/); return m ? (+m[3]) + '.' + (+m[2]) + '.' + m[1] : ''; }
  function _tyhjat() { var o = {}; RYHMAT.forEach(function (r) { o[r] = []; }); return o; }

  /* Yksi rivi: pelaajan luokka ryhmäksi + päivätiedot. */
  function _riviD2(p, nytMs, opts) {
    var m = _TK().tmTekniikkaMittari(p, nytMs, opts), rivi = { p: p, ryhma: 'ei_dataa', syy: null, osat: [], mittari: m.mittari, arvo: m.arvo, tasot: m.tasot, iso: null, kk: null, arvio: false, kausi: null, muistutus: !!m.muistutus, eiDataaSyy: m.eiDataaSyy };
    var pt = m.pvmTiedot || {}, kaytetty = m.mittari ? pt[m.mittari] : null;
    if (m.mitattu) { rivi.ryhma = m.kehityskohde ? 'kehityskohde' : 'ok'; rivi.syy = m.syy; }
    else if (m.tila === 'neutraali') rivi.ryhma = 'neutraali';
    else if (m.vanhat.length) { rivi.ryhma = 'vanha'; rivi.vanhaLahde = m.vanhat[0]; kaytetty = pt[m.vanhat[0]]; }
    else if (m.tuntematonPvm.length) { rivi.ryhma = 'paiva_tuntematon'; kaytetty = pt[m.tuntematonPvm[0]]; }
    if (kaytetty) { rivi.iso = kaytetty.iso; rivi.kk = kaytetty.kk; rivi.arvio = !!kaytetty.arvio; rivi.kausi = kaytetty.kausi || null; }
    return rivi;
  }
  function _riviD1(p, nytMs, opts) {
    var r = _FY().tmFyysinenPelaaja(p, nytMs, opts), pv = r.pvm || {}, rivi = { p: p, ryhma: 'ei_dataa', syy: null, osat: r.osat || [], neutraloidut: r.neutraloidut || [], mittari: 'H-H', arvo: null, tasot: r.tasot, iso: pv.iso || null, kk: pv.kk == null ? null : pv.kk, arvio: !!pv.arvio, kausi: pv.kausi || null, muistutus: false, eiDataaSyy: r.eiDataaSyy };
    if (r.tila === 'kehityskohde') { rivi.ryhma = 'kehityskohde'; rivi.syy = 'alle_ikatason'; } else if (r.tila === 'ok') rivi.ryhma = 'ok'; else if (r.tila === 'neutraali') rivi.ryhma = 'neutraali';
    else if (r.vanha) rivi.ryhma = 'vanha'; else if (r.paivaTuntematon) rivi.ryhma = 'paiva_tuntematon';
    return rivi;
  }

  function tmRyhmat(dim, pelaajat, nytMs, opts) {
    opts = opts || {}; nytMs = typeof nytMs === 'number' && isFinite(nytMs) ? nytMs : Date.now();
    var P = Array.isArray(pelaajat) ? pelaajat : [], ry = _tyhjat(), R = _rajat(opts), arvioita = 0, muist = 0;
    P.forEach(function (p) {
      var o = {}; for (var k in opts) o[k] = opts[k]; if (o.joukkueNimi == null && p && p.joukkue) o.joukkueNimi = p.joukkue;   // sukupuoli/ikä joukkuenimestä jos kenttä puuttuu
      var r = dim === 'd1' ? _riviD1(p, nytMs, o) : _riviD2(p, nytMs, o); ry[r.ryhma].push(r);
      if ((r.ryhma === 'kehityskohde' || r.ryhma === 'ok') && r.arvio) arvioita++; if (r.muistutus) muist++;
    });
    var luokka = dim === 'd1' ? _FY().tmFyysinenJoukkueLuokka(P, nytMs, opts) : _TK().tmTekniikkaJoukkueLuokka(P, nytMs, opts);
    var kortti = { mitattu: ry.kehityskohde.length + ry.ok.length, yht: P.length, neutraali: ry.neutraali.length, vanha: ry.vanha.length, paivaTuntematon: ry.paiva_tuntematon.length, eiDataa: ry.ei_dataa.length, arvioita: arvioita, muistutuksia: muist };
    return { dim: dim, yht: P.length, ryhmat: ry, luokka: luokka, kortti: kortti, kk: R.kk, muistutusKk: R.muistutusKk };
  }

  /* ── tekstit ── */
  function tmRyhmaOtsikko(ryhma, dim, t, kk) {
    t = _tt(t);
    if (ryhma === 'kehityskohde') return t('Kehityskohde');
    if (ryhma === 'ok') return t('Ok');
    if (ryhma === 'neutraali') return dim === 'd1' ? t('Kypsyys ratkaisee (§28)') : t('Nopeus ja tekniikka samalla tasolla');
    if (ryhma === 'vanha') return _fill(t('Tulos yli {kk} kk vanha'), { kk: kk });
    if (ryhma === 'paiva_tuntematon') return t('Päivä tuntematon');
    return t('Ei dataa');
  }
  /* päivä: oikea → "mitattu 20.9.2025"; arvio → "päivä arvioitu kaudesta (syksy 2025)"; tuntematon → "päivä tuntematon" */
  function tmPaivaTeksti(rivi, t) {
    t = _tt(t);
    if (!rivi.iso) return t('päivä tuntematon');
    return rivi.arvio ? (rivi.kausi ? _fill(t('päivä arvioitu kaudesta ({kausi})'), { kausi: rivi.kausi }) : t('päivä arvioitu kaudesta')) : _fill(t('mitattu {pvm}'), { pvm: _pvmFi(rivi.iso) });
  }
  /* rivin selite henkilökunnalle (tasoluvut saa näyttää; luokittelu ei tule niistä) */
  function tmRiviSelite(rivi, dim, t) {
    t = _tt(t); var o = [];
    if (dim === 'd2') {
      if (rivi.mittari === 'TKI' && rivi.arvo != null) o.push('TKI ' + rivi.arvo);
      if (rivi.mittari === 'SM' && rivi.tasot) o.push(_fill(t('SM-pallo taso {a} · SM-juoksu taso {b}'), { a: rivi.tasot.pallo, b: rivi.tasot.juoksu }));
      if (rivi.syy === 'alle_ikatason') o.push(t('alle ikäluokan tason')); else if (rivi.syy === 'pallo_hidastaa') o.push(t('pallo hidastaa'));
    } else {
      if (rivi.ryhma === 'kehityskohde' && rivi.osat.length) o.push(t('heikko') + ': ' + rivi.osat.map(function (x) { return t(OSA_NIMI[x] || x); }).join(', '));
      if (rivi.ryhma === 'neutraali' && rivi.neutraloidut && rivi.neutraloidut.length) o.push(rivi.neutraloidut.map(function (x) { return t(OSA_NIMI[x] || x); }).join(', '));
    }
    if (rivi.iso || rivi.ryhma === 'vanha' || rivi.ryhma === 'paiva_tuntematon') o.push(tmPaivaTeksti(rivi, t));
    if (rivi.muistutus) o.push(t('Tekniikkakisasta yli vuosi'));
    return o.join(' · ');
  }

  /* Kortin syyrivi: "4/16 mitattu tuoreesti · 8 tulosta yli 15 kk vanhoja · 4 ilman tulosta – seuraava tekniikkakisa päivittää" */
  function tmKorttiSyy(R, t) {
    t = _tt(t); var k = R.kortti, o = [], d1 = R.dim === 'd1';
    o.push(_fill(t('{n}/{yht} mitattu tuoreesti'), { n: k.mitattu, yht: k.yht }));
    if (k.neutraali) o.push(_fill(d1 ? t('{n} kypsyys ratkaisee') : t('{n} nopeus ja tekniikka samalla tasolla'), { n: k.neutraali }));
    if (k.vanha) o.push(_fill(k.vanha === 1 ? t('{n} tulos yli {kk} kk vanha') : t('{n} tulosta yli {kk} kk vanhoja'), { n: k.vanha, kk: R.kk }));
    if (k.paivaTuntematon) o.push(_fill(t('{n} ilman päivää'), { n: k.paivaTuntematon }));
    if (k.eiDataa) o.push(_fill(t('{n} ilman tulosta'), { n: k.eiDataa }));
    var s = o.join(' · ');
    if (k.vanha) s += ' – ' + (d1 ? t('seuraava fyysinen testaus päivittää') : R.ryhmat.vanha.some(function (r) { return r.vanhaLahde === 'TKI'; }) ? t('seuraava tekniikkakisa päivittää') : t('seuraava testaus päivittää'));
    return s;
  }
  /* Kortin otsikkorivi + sävy: 'amber' vain kehityskohteelle, 'teal' ok, 'neutraali' muuten (ei punaista: puuttuva data ≠ huono tulos) */
  function tmKorttiOtsikko(R, t) {
    t = _tt(t); var l = R.luokka, d1 = R.dim === 'd1';
    if (l && l.luokka === 'kehityskohde') return { teksti: d1 ? t('Fyysiset testit kehityskohteena') : t('Tekniikka kehityskohteena'), savy: 'amber', merkki: '▲' };
    if (l && l.luokka === 'ok') return { teksti: t('Ei kehityskohdetta'), savy: 'teal', merkki: '' };
    return { teksti: t('Ei luokkaa'), savy: 'neutraali', merkki: '' };
  }

  /* D1-osaindeksit: ka vain pelaajista, joita §28 ei neutraloi ja joiden tulos on tuore. Enemmistö neutraloitu → harmaa "kypsyys ratkaisee" ilman lukua. Amber vain luokittelun syynä oleville osille. */
  function tmD1Osaprofiili(R, t) {
    t = _tt(t); var FY = _FY(), LU = _LU(), osat = FY.OSAT || [], T = FY.TESTIT || {}, tuoreet = R.ryhmat.kehityskohde.concat(R.ryhmat.ok, R.ryhmat.neutraali), syyt = (R.luokka && R.luokka.luokka === 'kehityskohde') ? (R.luokka.syyt || []) : [];
    return osat.map(function (osa) {
      var arvot = [], neutr = 0;
      tuoreet.forEach(function (r) {
        var ts = Object.keys(r.tasot || {}).filter(function (x) { return T[x] === osa; }); if (!ts.length) return;
        if (LU.kypsyysEstetty && LU.kypsyysEstetty(osa, r.p)) { neutr++; return; }
        arvot.push(ts.reduce(function (s, x) { return s + r.tasot[x]; }, 0) / ts.length);
      });
      var yht = arvot.length + neutr, harmaa = yht > 0 && neutr * 2 > yht, ka = arvot.length && !harmaa ? Math.round(arvot.reduce(function (s, x) { return s + x; }, 0) / arvot.length * 10) / 10 : null;
      return { osa: osa, nimi: t(OSA_NIMI[osa] || osa), ka: ka, lkm: arvot.length, neutraloituja: neutr, harmaa: harmaa, savy: harmaa || ka == null ? 'neutraali' : (syyt.indexOf(osa) >= 0 ? 'amber' : 'teal'), teksti: harmaa ? t('kypsyys ratkaisee') : null };
    }).filter(function (x) { return x.lkm > 0 || x.neutraloituja > 0; });
  }

  /* Vanhuusbanneri + kattavuus samasta luokittelusta: banneri = uniikit pelaajat, joiden tulos on yli VANHA_KK (D1 tai D2); testattu = tuoreesti luokiteltu (D1 tai D2). */
  function tmNakymaYhteenveto(pelaajat, nytMs, opts) {
    var P = Array.isArray(pelaajat) ? pelaajat : [], d1 = tmRyhmat('d1', P, nytMs, opts), d2 = tmRyhmat('d2', P, nytMs, opts);
    var tuore = new Set(), vanha = new Set();
    [d1, d2].forEach(function (R) { ['kehityskohde', 'ok', 'neutraali'].forEach(function (g) { R.ryhmat[g].forEach(function (r) { tuore.add(r.p); }); }); R.ryhmat.vanha.forEach(function (r) { vanha.add(r.p); }); });
    var vainVanha = P.filter(function (p) { return !tuore.has(p) && vanha.has(p); }).length, LU = _LU();
    var kat = LU.kattavuus ? LU.kattavuus(P, { _: P }, function (p) { return tuore.has(p); }) : null;
    return { d1: d1, d2: d2, banneri: { n: vanha.size, kk: d1.kk }, vainVanhaPelaajat: P.filter(function (p) { return !tuore.has(p) && vanha.has(p); }), kattavuus: { testattu: tuore.size, vainVanha: vainVanha, ilmanTulosta: P.length - tuore.size - vainVanha, yht: P.length, kat: kat } };
  }
  function tmBanneriTeksti(b, t) { t = _tt(t); return b && b.n ? _fill(t('{n} pelaajan tulos on yli {kk} kk vanha — ei tasona eikä värinä · päivitä mittaus'), { n: b.n, kk: b.kk }) : ''; }

  /* Kattavuuden näyttö: puuttuva data on neutraalia tekstiä ("ei vielä mitattu"), EI punaista. Punainen on varattu huonolle tulokselle. */
  function tmKattavuusNayta(n, yht, t) {
    t = _tt(t);
    if (!yht || !n) return { teksti: t('ei vielä mitattu'), savy: 'neutraali' };
    var pct = Math.round(n / yht * 100);
    return { teksti: pct + ' %', savy: pct >= 70 ? 'teal' : pct >= 40 ? 'amber' : 'neutraali' };
  }

  var API = { RYHMAT: RYHMAT, tmRyhmat: tmRyhmat, tmRyhmaOtsikko: tmRyhmaOtsikko, tmPaivaTeksti: tmPaivaTeksti, tmRiviSelite: tmRiviSelite, tmKorttiSyy: tmKorttiSyy, tmKorttiOtsikko: tmKorttiOtsikko,
    tmD1Osaprofiili: tmD1Osaprofiili, tmNakymaYhteenveto: tmNakymaYhteenveto, tmBanneriTeksti: tmBanneriTeksti, tmKattavuusNayta: tmKattavuusNayta };
  if (typeof module !== 'undefined' && module.exports) module.exports = API;
  if (root) root.TM_NAKYMA_RYHMAT = API;
})(typeof window !== 'undefined' ? window : null);
