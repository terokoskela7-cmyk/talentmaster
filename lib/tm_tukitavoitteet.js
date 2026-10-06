/* ════════════════════════════════════════════════════════════════════════
   tm_tukitavoitteet.js — J1 (docs/CODE_BRIEF_J1_TUKITAVOITTEET.md; design 12 D17–D22 + 13 §7). PURE: ei Firebasea, ei DOMia, ei kyselyjä — data tulee parametreina.
   Kolme asiaa yhdessä kirjastossa:
   · tmJoukkuejaksoOsaAlueet(x)      → joukkuejakson neljä aluetta validoituna (D17: tekn.-takt. + fyysinen pakollisia, henkinen/sosiaalinen valinnaisia, ≤ 120 merkkiä)
   · tmTukitavoite(x)                → yksi pelaajan tukitavoite validoituna (D20: perustelu aina myönteinen = KIELLETYT-vartija; lähde mukana; harjoitteet #823-snapshot, lahde 'seura'|'tm')
   · tmTukitavoitteet(jf)            → lukija, taaksepäin yhteensopiva: jf.tukitavoitteet TAI vanhasta jf.tukiosa johdettu; ei heitä vanhalle datalle
   · tmTukitavoitteetKirjoitus(lista)→ { tukitavoitteet, tukiosa } — siirtymän ajan molemmat (tukiosa = ensimmäinen), jotta Pelaaja_v7 ja K1 toimivat
   · tmTukitavoiteMaksimi(ika, profiili) → Leikkijä 0 · Rakentaja 1 · Showcase 2 (D18); seuran prosessiprofiili voi ylikirjoittaa (0–2)
   · tmTukitavoiteEhdotukset(p, k)   → järjestetty lista, enintään 4 (D19); moottori ei koskaan valitse itse
   EI UUTTA LOGIIKKAA: tekstivartija = tm_jakso_malli (KIELLETYT, tmTukiosa); kypsyysvahti = tm_idp.js idpKypsyysEstetty (YKSI sääntö — tämä lib vain lisää PH + 'tuntematon'
   -käsittelyn avaimeen ennen kutsua, ei omaa avainlistaa); PHV = tm_phv_tila tmPhvKoodi; arviointi = tm_arviointi_taksonomia (+ seuran kehys) ja tm_arviointi_silta (D2-tasapeli); päivä = tm_pvm.
   Moottorin sisäiset ketjunimet (SBL/SFL/LL/DIAG/DFL) eivät koskaan päädy palautettuihin merkkijonoihin. Pelaaja ei näe lähdettä (§7.22) — lähde on henkilökunnalle.
   Dual-export: module.exports || window.TM_TUKITAVOITTEET.
════════════════════════════════════════════════════════════════════════ */
(function (root) {
  'use strict';

  var ALUEET = ['fyysinen', 'tekninen_taktinen', 'henkinen', 'sosiaalinen'];
  var LAHDETYYPIT = ['joukkuejakso', 'testi', 'havainto', 'arviointi', 'pelaajan_arvio', 'suunnitelma'];
  var MAX_EHDOTUKSET = 4;
  var IKKUNA_PV = 183;          // "≤ 6 kk" (testi, arviointi)
  var HAVAINTO_IKKUNA_PV = 56;  // oletus: jakson pituus (8 vk), jos kutsuja ei anna havaintoAlkaa
  var DIM_ALUE = { D1: 'fyysinen', D2: 'tekninen_taktinen', D3: 'henkinen', D4: 'tekninen_taktinen', D5: 'sosiaalinen' };   // 5D-sanasto (12: "ei uutta luokittelua")
  var MAKSIMI = { leikkija: 0, rakentaja: 1, showcase: 2 };
  var IKAVAIHE_ALIAS = { kevyt: 'leikkija', perus: 'rakentaja', tiivis: 'showcase' };   // tm_jakso_malli.tmJaksonKesto-profiilit

  // ADAR-dimensio → myönteinen kuvaus (lähde: pikakortin rubriikki PH_TEKSTIT; ei arvosanaa, ei ominaisuutta)
  var ADAR_KUVAUS = { A: 'Pelin lukeminen ennen palloa', D: 'Nopea ja selkeä ratkaisu pelissä', Act: 'Laadukas toteutus paineessa', R: 'Nopea palautuminen heti menetyksen jälkeen' };
  var ADAR_AVAIN = { A: 'anticipation', D: 'decision_making', Act: 'play_under_pressure', R: 'positioning' };   // = ADAR_HAVAITTU_MAP:n ensimmäinen kohde; alue/dim luetaan taksonomiasta
  var ADAR_JARJESTYS = ['A', 'D', 'Act', 'R'];
  var ADAR_IKAKOODI = { A: 'a', D: 'd', Act: 'ac', R: 'r' };   // tmAdarIkaTier palauttaa pienet kirjaimet
  // Pelaajan D3-itsearvio (Pelaaja_v7 Minä, _MINA_D3_KYS) → myönteinen tapa toimia (D20)
  var ITSEARVIO_KUVAUS = { inner_drive: 'Kehittyminen myös omalla ajalla', coachability: 'Ohjeiden kokeileminen', resilience: 'Jatkaminen epäonnistumisen jälkeen', focus: 'Mukana pysyminen koko treenin', emotional_control: 'Rauhallisuus kun ärsyttää' };
  var ITSEARVIO_JARJESTYS = ['inner_drive', 'coachability', 'resilience', 'focus', 'emotional_control'];
  var LIIKEHALLINTA = 'Liikehallinta ja kehonhallinta';

  function _g(n) { return root && root[n]; }
  function _req(n, f) { try { return (typeof module !== 'undefined' && module.exports && typeof require === 'function') ? require(f) : _g(n); } catch (e) { return _g(n); } }
  function _JM() { return _req('TM_JAKSO_MALLI', './tm_jakso_malli.js'); }
  function _IDP() { return _req('__tm_idp__', './tm_idp.js') || root; }   // selaimessa tm_idp.js:n globaalit
  function _PHV() { var m = _req('TM_PHV', './tm_phv_tila.js'); return (m && m.tmPhvKoodi) ? m.tmPhvKoodi : _g('tmPhvKoodi'); }
  function _TAKS() { return _req('__tm_taks__', './tm_arviointi_taksonomia.js') || root; }
  function _SILTA() { return _req('TM_ARVIOINTI_SILTA', './tm_arviointi_silta.js'); }
  function _EEK() { return _req('__tm_eek__', './tm_eerikkila_normit.js') || root; }
  function _paivaIso(d) { var m = _req('__tm_pvm__', './tm_pvm.js'); var f = (m && m.tmPaivaIso) || _g('tmPaivaIso'); return f(d); }
  function _virhe(msg) { return new Error('tm_tukitavoitteet: ' + msg); }

  // ── tekstit ────────────────────────────────────────────────────────────────────────────────
  function _teksti(v, nimi, max, pakollinen) {
    if (v == null || v === '') { if (pakollinen) throw _virhe(nimi + ' puuttuu'); return null; }
    if (typeof v !== 'string') throw _virhe(nimi + ' ei ole teksti');
    var t = v.trim();
    if (!t) { if (pakollinen) throw _virhe(nimi + ' tyhjä'); return null; }
    if (t.length > max) throw _virhe(nimi + ' on liian pitkä (' + t.length + ' > ' + max + ')');
    var k = _JM().tmJaksoTekstiKelpaa(t);
    if (!k.ok) throw _virhe(nimi + ' sisältää kielletyn sanan (' + k.loydetty + ') — kirjoita myönteisenä tapana toimia (D20, GDPR)');
    return t;
  }
  function _pvm(v, nimi) {
    if (typeof v !== 'string' || !/^\d{4}-\d{2}-\d{2}$/.test(v)) throw _virhe(nimi + ' ei ole päivämäärä YYYY-MM-DD (paikallinen päivä, §7.26)');
    var o = v.split('-'), y = +o[0], m = +o[1], d = +o[2], pv = [31, (y % 4 === 0 && (y % 100 !== 0 || y % 400 === 0)) ? 29 : 28, 31, 30, 31, 30, 31, 31, 30, 31, 30, 31];
    if (m < 1 || m > 12 || d < 1 || d > pv[m - 1]) throw _virhe(nimi + ' ei ole kelvollinen päivä');
    return v;
  }
  function _paivaNum(iso) { var m = /^(\d{4})-(\d{2})-(\d{2})/.exec(String(iso || '')); return m ? Date.UTC(+m[1], +m[2] - 1, +m[3]) / 86400000 : null; }
  function _ika(a, b) { var x = _paivaNum(a), y = _paivaNum(b); return (x == null || y == null) ? null : (y - x); }   // päivää a → b
  function _puhdas(data) {   // GDPR-vartija: ei kielletyjä sanoja eikä "ase"-kenttänimiä avaimissa/arvoissa
    var r = _JM().tmTarkistaJaksoData(data);
    if (r.length) throw _virhe('kielletty sana/kenttänimi: ' + r.join(', '));
    return data;
  }

  // ── 1. joukkuejakson osa-alueet ────────────────────────────────────────────────────────────
  function tmJoukkuejaksoOsaAlueet(x) {
    x = x || {};
    var tt = x.tekninen_taktinen, fy = x.fyysinen;
    if (!tt || typeof tt !== 'object') throw _virhe('tekninen_taktinen puuttuu (pakollinen, D17)');
    if (!fy || typeof fy !== 'object') throw _virhe('fyysinen puuttuu (pakollinen, D17)');
    var out = {
      tekninen_taktinen: { teema_avain: _teksti(tt.teema_avain, 'tekninen_taktinen.teema_avain', 120, true), nimi: _teksti(tt.nimi, 'tekninen_taktinen.nimi', 120, true), lahde: _teksti(tt.lahde, 'tekninen_taktinen.lahde', 60, true) },
      fyysinen: { alue: _teksti(fy.alue, 'fyysinen.alue', 120, true), lahde: _teksti(fy.lahde, 'fyysinen.lahde', 60, true) },
      henkinen: null, sosiaalinen: null
    };
    var oid = _teksti(fy.ohjelma_id, 'fyysinen.ohjelma_id', 120, false); if (oid != null) out.fyysinen.ohjelma_id = oid;
    ['henkinen', 'sosiaalinen'].forEach(function (k) {
      var v = x[k]; if (v == null) return;
      if (typeof v !== 'object') throw _virhe(k + ' pitää olla { kuvaus } tai null');
      var kv = _teksti(v.kuvaus, k + '.kuvaus', 120, false);
      out[k] = kv == null ? null : { kuvaus: kv };   // tyhjä lause = ei aluetta (valinnainen)
    });
    return _puhdas(out);
  }

  // ── 2. tukitavoite ────────────────────────────────────────────────────────────────────────
  function tmTukitavoite(x) {
    x = x || {};
    if (ALUEET.indexOf(x.alue) < 0) throw _virhe('alue pitää olla ' + ALUEET.join('|'));
    var l = x.lahde;
    if (!l || typeof l !== 'object' || LAHDETYYPIT.indexOf(l.tyyppi) < 0) throw _virhe('lahde.tyyppi pitää olla ' + LAHDETYYPIT.join('|'));
    var o = {
      alue: x.alue,
      kuvaus: _teksti(x.kuvaus, 'kuvaus', 80, true),
      perustelu: _teksti(x.perustelu, 'perustelu', 400, true),   // sitoo ydinvahvuuteen, aina myönteinen (D20)
      lahde: { tyyppi: l.tyyppi, viite: _teksti(l.viite, 'lahde.viite', 120, false), pvm: _pvm(l.pvm, 'lahde.pvm') },
      // Harjoitteet = #823-snapshot: validointi tm_jakso_malli.tmTukiosa:lla (lahde 'seura'|'tm', hyväksytty tila, linkit http(s)) — ei kopiota
      harjoitteet: _JM().tmTukiosa({ alue: 'x', perustelu: 'x', harjoitteet: Array.isArray(x.harjoitteet) ? x.harjoitteet : [] }).harjoitteet
    };
    if (o.lahde.viite == null) o.lahde.viite = null;
    return _puhdas(o);
  }

  // ── 3. lukija (vanha tukiosa → lista; ei heitä) ───────────────────────────────────────────
  function tmTukitavoitteet(jf) {
    if (!jf || typeof jf !== 'object') return [];
    if (Array.isArray(jf.tukitavoitteet)) {
      return jf.tukitavoitteet.filter(function (t) { return t && typeof t === 'object'; }).map(function (t) {
        return { alue: t.alue != null ? t.alue : null, kuvaus: t.kuvaus != null ? t.kuvaus : null, perustelu: t.perustelu != null ? t.perustelu : null,
          lahde: (t.lahde && typeof t.lahde === 'object') ? t.lahde : { tyyppi: 'suunnitelma' }, harjoitteet: Array.isArray(t.harjoitteet) ? t.harjoitteet : [] };
      });
    }
    var t = jf.tukiosa;
    if (t && typeof t === 'object' && (t.alue || t.perustelu)) {
      return [{ alue: null, kuvaus: t.alue != null ? t.alue : null, perustelu: t.perustelu != null ? t.perustelu : null, lahde: { tyyppi: 'suunnitelma' }, harjoitteet: Array.isArray(t.harjoitteet) ? t.harjoitteet : [] }];
    }
    return [];
  }

  // ── 4. kirjoittaja (siirtymän ajan molemmat) ──────────────────────────────────────────────
  function tmTukitavoitteetKirjoitus(lista) {
    var l = Array.isArray(lista) ? lista : [];
    if (l.length > 2) throw _virhe('tukitavoitteita enintään 2 (D18)');
    var uudet = l.map(tmTukitavoite);
    var eka = uudet[0];
    var tukiosa = eka ? _JM().tmTukiosa({ alue: eka.kuvaus, perustelu: eka.perustelu, harjoitteet: eka.harjoitteet }) : null;   // tyhjä lista → tukiosa null (adapteri poistaa kentän)
    return { tukitavoitteet: uudet, tukiosa: tukiosa };
  }

  // ── 5. määrä ikävaiheittain ───────────────────────────────────────────────────────────────
  function _ikavaihe(v) {
    if (typeof v === 'number' && isFinite(v)) return v <= 12 ? 'leikkija' : (v <= 15 ? 'rakentaja' : 'showcase');
    var s = String(v == null ? '' : v).toLowerCase().replace(/ä/g, 'a');
    s = IKAVAIHE_ALIAS[s] || s;
    return MAKSIMI.hasOwnProperty(s) ? s : 'rakentaja';   // tuntematon → Perus/Rakentaja (sama kuin tmJaksonKesto)
  }
  function tmTukitavoiteMaksimi(ikavaihe, seuraProfiili) {
    var v = _ikavaihe(ikavaihe), p = seuraProfiili && typeof seuraProfiili === 'object' ? (seuraProfiili.prosessiprofiili || seuraProfiili) : null;
    var yli = p && p[v] && p[v].tukitavoitteet_max;
    if (typeof yli === 'number' && yli === Math.floor(yli) && yli >= 0 && yli <= 2) return yli;
    return MAKSIMI[v];
  }

  // ── 6. ehdotusmoottori ────────────────────────────────────────────────────────────────────
  // Kypsyysvahti: YKSI sääntö tm_idp.idpKypsyysEstetty (+ IDP_KYPSYYS_GATED-avaimet). Tuntematon käsitellään kuten PRE/LAH (CLAUDE.md §14).
  // Lisäys vain tähän käyttöön: PH (kuormaa lisäävä ei ehdoteta, design 12 rivi 0). Avainlista (speed/acceleration/endurance/power) elää vain tm_idp.js:ssä.
  function _phvTila(p) { var k = _PHV()(p); return k == null ? 'tuntematon' : k; }
  function _estetty(avain, phvTila) {
    var I = _IDP();
    var phv = phvTila === 'tuntematon' ? 'PRE' : phvTila;
    return I.idpKypsyysEstetty(avain, phv) || (phvTila === 'PH' && !!(I.IDP_KYPSYYS_GATED && I.IDP_KYPSYYS_GATED[avain]));
  }
  // Tero 7.10.2026 (#837): kaikissa kypsyysrajatuissa tiloissa (PRE/LAH/PH/tuntematon) estetty D1-ehdotus KORVATAAN liikehallinnalla — ei vain pudoteta.
  function _kayttaaLiikehallintaa(phvTila) { return phvTila === 'PRE' || phvTila === 'LAH' || phvTila === 'PH' || phvTila === 'tuntematon'; }

  function _kehys(k) {
    var T = _TAKS();
    if (k && k.arviointikehys && Array.isArray(k.arviointikehys.taksonomia)) return { taksonomia: k.arviointikehys.taksonomia, seura: true };   // D16: seuran kehys kumoaa Palloliiton
    return { taksonomia: T.ARVIOINTI_TAKSONOMIA, seura: false };
  }
  function _byAvain(kehys) { return function (a) { for (var i = 0; i < kehys.taksonomia.length; i++) if (kehys.taksonomia[i].avain === a) return kehys.taksonomia[i]; return null; }; }
  function _nimi(it) { return it ? (it.nimi_fi || it.nimi || it.avain) : null; }

  function _perustelu(p, kuvaus) {
    var yv = p && p.ydinvahvuus && typeof p.ydinvahvuus.kuvaus === 'string' ? p.ydinvahvuus.kuvaus.trim() : '';
    return (yv ? 'Tukee ydinvahvuutta (' + yv + '): ' : 'Tukee ydinvahvuutta: ') + kuvaus.toLowerCase() + '.';
  }
  function _ehd(p, alue, kuvaus, tyyppi, viite, pvm, lyhyt, miksi, asia, lisa) {
    var o = { alue: alue, kuvaus: kuvaus, perustelu_ehdotus: _perustelu(p, kuvaus), lahde: { tyyppi: tyyppi, viite: viite || null, pvm: pvm }, lyhyt: lyhyt, miksi: miksi, asia: asia || null };
    if (lisa) Object.keys(lisa).forEach(function (k) { o[k] = lisa[k]; });
    try { tmTukitavoite({ alue: o.alue, kuvaus: o.kuvaus, perustelu: o.perustelu_ehdotus, lahde: o.lahde }); } catch (e) { return null; }   // vain kelvollinen ehdotus (ei kiellettyjä sanoja, kelvollinen pvm)
    return o;
  }

  // Testi-/arviointikandidaatit: tm_idp.idpKeraaKandidaatit (yksi keräyslogiikka). Pelihavainto (adar_viimeisin) jätetään pois — havaintolähde on oma, rakenteinen.
  function _kandidaatit(p, k, kehys) {
    var I = _IDP(), T = _TAKS(), E = _EEK(), io = k.idpOpts || {};
    var opts = {
      tmTaksonomiaByAvain: _byAvain(kehys), ika: io.ika != null ? io.ika : (k.ika != null ? k.ika : null), sp: io.sp != null ? io.sp : (k.sp || null), spTk: io.spTk || null,
      laskeD1Osaindeksit: io.laskeD1Osaindeksit || E.laskeD1Osaindeksit, tkLajiTaso: io.tkLajiTaso || null,
      tklajiAvain: io.tklajiAvain || (T.tmMitattuMappaus ? T.tmMitattuMappaus().tklaji : null)
    };
    return I.idpKeraaKandidaatit(p, opts);
  }

  function _testiPvm(p, c) {
    if (c.tyyppi === 'mitattu_d1') return p.d1_pvm || p.hh_pvm || null;
    return p.tki_pvm || p.tk_lajit_pvm || null;
  }

  function _ehdotaTestista(p, k, kehys, tanaan, phv, kand) {
    var tulos = { ehdotus: null, korvattu: false };
    var I = _IDP(), T = _TAKS(), E = _EEK(), io = k.idpOpts || {};
    // D1: KAIKKI osaindeksit heikoin ensin (tm_idp.idpD1Osakandidaatit) → kypsyysvahdin estämän jälkeen seuraava sallittu (esim. kiihdytys) voi tulla ehdotukseksi.
    var d1 = I.idpD1Osakandidaatit ? I.idpD1Osakandidaatit(p, { tmTaksonomiaByAvain: _byAvain(kehys), ika: io.ika != null ? io.ika : (k.ika != null ? k.ika : null), sp: io.sp != null ? io.sp : (k.sp || null),
      laskeD1Osaindeksit: io.laskeD1Osaindeksit || E.laskeD1Osaindeksit }) : [];
    var d2 = kand.filter(function (c) { return c.tyyppi === 'mitattu_d2'; });
    var lista = d1.concat(d2).map(function (c) { return { c: c, pvm: _testiPvm(p, c) }; })
      .filter(function (r) { var a = _ika(r.pvm, tanaan); return r.pvm && a != null && a >= 0 && a <= IKKUNA_PV && (r.c.taso == null || r.c.taso <= 2); });   // tuore (≤ 6 kk) JA selvästi heikko
    lista.sort(function (a, b) { return (a.c.taso == null ? 2.5 : a.c.taso) - (b.c.taso == null ? 2.5 : b.c.taso); });
    for (var i = 0; i < lista.length; i++) {
      var c = lista[i].c, pvm = lista[i].pvm, it = _byAvain(kehys)(c.avain);
      var alue = DIM_ALUE[c.dim] || 'fyysinen';
      if (_estetty(c.avain, phv)) {   // kypsyysvahti: heikko 30 m / MAS / CMJ ei ole tukitavoite (biologisesti odotettu)
        if (_kayttaaLiikehallintaa(phv) && !tulos.korvattu) tulos.korvattu = { pvm: pvm, avain: c.avain };
        continue;
      }
      tulos.ehdotus = _ehd(p, alue, _nimi(it) || c.nimi, 'testi', c.avain, pvm, 'testistä',
        'Tuore testi (' + pvm + '): osa-alue, jolla on eniten kasvuvaraa ikään nähden. Testi ei ratkaise — valmentajan oma merkintä ratkaisee.', c.avain);
      if (tulos.ehdotus) break;
    }
    return tulos;
  }

  function _havaintoEhdotukset(p, k, tanaan) {
    var T = _TAKS(), out = [];
    var alku = k.havaintoAlkaa && /^\d{4}-\d{2}-\d{2}$/.test(k.havaintoAlkaa) ? k.havaintoAlkaa : null;
    var sallitut = (T.tmAdarIkaTier && (k.ika != null || (k.idpOpts && k.idpOpts.ika != null))) ? T.tmAdarIkaTier(k.ika != null ? k.ika : k.idpOpts.ika) : ['a', 'd', 'ac', 'r'];
    var lasku = {}, pvmt = {};
    (Array.isArray(k.havainnot) ? k.havainnot : []).forEach(function (h) {
      if (!h || h.tyyppi !== 'adar_pikakortti' || !h.pisteet || typeof h.pisteet !== 'object' || typeof h.pvm !== 'string') return;   // vain rakenteinen ADAR-havainto; vapaata tekstiä (narratiivi) ei jäsennetä
      var a = _ika(h.pvm, tanaan); if (a == null || a < 0) return;
      if (alku ? (_ika(alku, h.pvm) < 0) : (a > HAVAINTO_IKKUNA_PV)) return;
      ADAR_JARJESTYS.forEach(function (d) { if (sallitut.indexOf(ADAR_IKAKOODI[d]) >= 0 && h.pisteet[d] === 1) { lasku[d] = (lasku[d] || 0) + 1; (pvmt[d] = pvmt[d] || []).push(h.pvm); } });   // 1 = kehitettävä (curriculum-asteikko 1–3)
    });
    ADAR_JARJESTYS.filter(function (d) { return lasku[d] >= 2; }).sort(function (a, b) { return lasku[b] - lasku[a]; }).forEach(function (d) {
      var it = T.tmTaksonomiaByAvain ? T.tmTaksonomiaByAvain(ADAR_AVAIN[d]) : null, alue = DIM_ALUE[it && it.dim] || 'tekninen_taktinen';
      var sorted = pvmt[d].slice().sort();
      var e = _ehd(p, alue, ADAR_KUVAUS[d], 'havainto', 'adar:' + d, sorted[sorted.length - 1], 'havainnoista (' + lasku[d] + ')',
        'Pelihavainnot ' + sorted.join(', ') + ': sama asia nousi esiin ' + lasku[d] + ' havainnossa.', 'adar:' + d);
      if (e) out.push(e);
    });
    return out;
  }

  function _taso(v) { return (v && v.arvo != null) ? +v.arvo : (v != null ? +v : NaN); }
  function _ehdotaArvioinnista(p, k, kehys, tanaan, phv, kand) {
    var tulos = { ehdotus: null, korvattu: false };
    var pvm = p.arviointi_pvm; var ika = _ika(pvm, tanaan);
    if (!pvm || ika == null || ika < 0 || ika > IKKUNA_PV) return tulos;
    var by = _byAvain(kehys);
    var rivit = kand.filter(function (c) { return c.tyyppi === 'havaittu' && c.lahde === 'havaittu' && c.dim; }).map(function (c) { return { c: c, it: by(c.avain), taso: c.taso, laskeva: false }; });
    // laskeva attribuutti: k.arviointiHistoria [{pvm, havaittu:{avain:arvo}}] — nykyinen < edellinen
    var hist = (Array.isArray(k.arviointiHistoria) ? k.arviointiHistoria : []).filter(function (h) { return h && h.havaittu && typeof h.pvm === 'string' && h.pvm < pvm; }).sort(function (a, b) { return a.pvm < b.pvm ? 1 : -1; })[0];
    var nyk = p.arviointi_havaittu || {};
    if (hist) Object.keys(nyk).forEach(function (a) {
      var n = _taso(nyk[a]), e = _taso(hist.havaittu[a]), it = by(a);
      if (!it || isNaN(n) || isNaN(e) || !(n < e) || n > 3 || rivit.some(function (r) { return r.c.avain === a; })) return;
      rivit.push({ c: { avain: a, dim: it.dim, nimi: _nimi(it), taso: n, tyyppi: 'havaittu', lahde: 'havaittu' }, it: it, taso: n, laskeva: true });
    });
    var silta = !kehys.seura && _SILTA() ? _SILTA().tmSiltaEhdota(Object.keys(nyk).reduce(function (o, a) { var t = _taso(nyk[a]); if (!isNaN(t)) o[a] = t; return o; }, {}), {}) : [];
    var siltaJ = function (a) { for (var i = 0; i < silta.length; i++) if (silta[i].palloliitto_avain === a) return i; return 999; };   // D2-tasapeli: perustaito ensin (tm_arviointi_silta)
    rivit.sort(function (a, b) { return (a.taso - b.taso) || (siltaJ(a.c.avain) - siltaJ(b.c.avain)) || (a.laskeva ? 1 : 0) - (b.laskeva ? 1 : 0); });
    for (var i = 0; i < rivit.length; i++) {
      var r = rivit[i], c = r.c, alue = DIM_ALUE[c.dim] || 'tekninen_taktinen';
      if (_estetty(c.avain, phv)) { if (_kayttaaLiikehallintaa(phv) && !tulos.korvattu) tulos.korvattu = { pvm: pvm, avain: c.avain }; continue; }
      tulos.ehdotus = _ehd(p, alue, _nimi(r.it) || c.nimi, 'arviointi', c.avain, pvm, 'arvioinnista',
        'Valmentajan arviointi (' + pvm + '): ' + (r.laskeva ? 'laskeva' : 'alin') + ' arvioitu osa-alue' + (kehys.seura ? ' (seuran arviointikehys)' : '') + '.', c.avain);
      if (tulos.ehdotus) break;
    }
    return tulos;
  }

  function _ehdotaItsearviosta(p, tanaan) {
    var d = p && p.d3_viimeisin, pt = d && d.pisteet; if (!pt || typeof pt !== 'object') return null;
    var pvm = (typeof d.pvm === 'string' && /^\d{4}-\d{2}-\d{2}/.test(d.pvm)) ? d.pvm.slice(0, 10) : (typeof d.jakso_alkoi === 'string' ? d.jakso_alkoi.slice(0, 10) : null);
    if (!pvm) return null;
    var a = _ika(pvm, tanaan); if (a == null || a < 0 || a > IKKUNA_PV) return null;
    var par = null;
    ITSEARVIO_JARJESTYS.forEach(function (key) { var v = pt[key] && pt[key].pelaaja; if (v != null && !isNaN(+v) && +v <= 2 && (par == null || +v < par.v)) par = { key: key, v: +v, valm: pt[key].valmentaja }; });   // pelaajan oma matala itsearvio (1–5)
    if (!par) return null;
    var ero = par.valm != null && !isNaN(+par.valm) && Math.abs(+par.valm - par.v) >= 2;
    return _ehd(p, 'henkinen', ITSEARVIO_KUVAUS[par.key], 'pelaajan_arvio', 'd3:' + par.key, pvm, 'pelaajan omasta arviosta',
      'Pelaajan oma D3-itsearvio (' + pvm + ')' + (ero ? '; ero valmentajan arvioon nostaa keskustelun.' : '.') + ' Pelaaja ei näe tätä lähdettä.', 'd3:' + par.key);
  }

  function _ehdotaJoukkuejaksosta(p, k, tanaan, phv) {
    var jj = k.joukkuejakso; if (!jj || typeof jj !== 'object') return null;
    var oa = jj.osa_alueet || (jj.jaksofokus && jj.jaksofokus.osa_alueet) || null; if (!oa) return null;
    var viite = jj.jid || jj.id || (jj.joukkuejakso_viite && jj.joukkuejakso_viite.jid) || null, pvm = jj.alku || jj.alkoi || tanaan; pvm = String(pvm).slice(0, 10);
    var I = _IDP();
    var fy = oa.fyysinen && oa.fyysinen.alue, ke = oa.henkinen && oa.henkinen.kuvaus, so = oa.sosiaalinen && oa.sosiaalinen.kuvaus;
    var alue, kuvaus, lisa = null, miksi;
    if (fy) {
      alue = 'fyysinen'; kuvaus = String(fy).slice(0, 80); miksi = 'Joukkueen jakso: fyysinen alue — oletus, jos muuta tavoitetta ei ole.';
      // rakenteinen avain (esim. 'speed') + PH/tuntematon → liikehallinta (kuormaa lisäävä ei oletuksena). Vapaata tekstiä ei jäsennetä.
      if (_kayttaaLiikehallintaa(phv) && I.IDP_KYPSYYS_GATED && I.IDP_KYPSYYS_GATED[String(fy).trim()]) { kuvaus = LIIKEHALLINTA; lisa = { kypsyyssuojattu: true }; miksi += ' Kypsyysvahti: kasvupyrähdys tai kypsyys mittaamatta — kuormaa lisäävä alue korvattu liikehallinnalla.'; }
    } else if (ke) { alue = 'henkinen'; kuvaus = String(ke).slice(0, 80); miksi = 'Joukkueen jakso: henkinen tavoite — oletus, jos muuta tavoitetta ei ole.'; }
    else if (so) { alue = 'sosiaalinen'; kuvaus = String(so).slice(0, 80); miksi = 'Joukkueen jakso: sosiaalinen tavoite — oletus, jos muuta tavoitetta ei ole.'; }
    else return null;
    return _ehd(p, alue, kuvaus, 'joukkuejakso', viite, /^\d{4}-\d{2}-\d{2}$/.test(pvm) ? pvm : tanaan, 'joukkuejaksosta', miksi, 'joukkuejakso:' + alue, lisa);
  }

  function _liikehallintaEhdotus(p, lahdeTyyppi, tieto) {
    return _ehd(p, 'fyysinen', LIIKEHALLINTA, lahdeTyyppi, tieto.avain, tieto.pvm, lahdeTyyppi === 'testi' ? 'testistä, kasvu huomioiden' : 'arvioinnista, kasvu huomioiden',
      'Kypsyysvahti (' + ({ PH: 'kasvupyrähdys käynnissä', PRE: 'ennen kasvupyrähdystä', LAH: 'kasvupyrähdys lähestyy' }[tieto.phv] || 'kypsyyttä ei ole mitattu') + '): testistä johdettu nopeus-, voima- tai kestävyysalue korvattu liikehallinnalla. Lähde: ' + (lahdeTyyppi === 'testi' ? 'tuore testi ' : 'arviointi ') + tieto.pvm + '.', 'liikehallinta',
      { kypsyyssuojattu: true });
  }

  function tmTukitavoiteEhdotukset(p, konteksti) {
    p = p || {}; var k = konteksti || {};
    var tanaan = (typeof k.tanaan === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(k.tanaan)) ? k.tanaan : _paivaIso(new Date());
    if (k.ikavaihe != null || k.ika != null) { if (tmTukitavoiteMaksimi(k.ikavaihe != null ? k.ikavaihe : k.ika, k.seuraProfiili) === 0) return []; }   // Leikkijä: joukkuejakso riittää
    var phv = _phvTila(p), kehys = _kehys(k);
    var kand = _kandidaatit(p, k, kehys);   // arviointi (havaittu) + D2-testi; D1-testit erikseen (koko lista)
    var testi = _ehdotaTestista(p, k, kehys, tanaan, phv, kand), arv = _ehdotaArvioinnista(p, k, kehys, tanaan, phv, kand);
    var jarj = [];
    // 0 kypsyyssuoja (korvaus liikehallinnalla, PH/tuntematon) — ensimmäisenä, lähteenä se tieto jonka vuoksi alue korvattiin
    var korv = testi.korvattu ? _liikehallintaEhdotus(p, 'testi', Object.assign({ phv: phv }, testi.korvattu)) : (arv.korvattu ? _liikehallintaEhdotus(p, 'arviointi', Object.assign({ phv: phv }, arv.korvattu)) : null);
    if (korv) jarj.push(korv);
    if (testi.ehdotus) jarj.push(testi.ehdotus);                                      // 1 testi
    _havaintoEhdotukset(p, k, tanaan).forEach(function (e) { jarj.push(e); });         // 2 havainto
    if (arv.ehdotus) jarj.push(arv.ehdotus);                                          // 2 arviointi
    var itse = _ehdotaItsearviosta(p, tanaan); if (itse) jarj.push(itse);             // 2b pelaajan arvio
    var jj = _ehdotaJoukkuejaksosta(p, k, tanaan, phv);                               // 3 joukkuejakso — aina mukana, jos annettu
    var nahty = {}, lista = [];
    jarj.forEach(function (e) { var a = e.alue + '|' + e.asia; if (nahty[a]) return; nahty[a] = 1; lista.push(e); });
    var tila = jj ? MAX_EHDOTUKSET - 1 : MAX_EHDOTUKSET;
    lista = lista.slice(0, tila);
    if (jj && !lista.some(function (e) { return e.alue === jj.alue && e.asia === jj.asia; })) lista.push(jj);
    return lista;
  }

  var API = {
    ALUEET: ALUEET, LAHDETYYPIT: LAHDETYYPIT, MAX_EHDOTUKSET: MAX_EHDOTUKSET,
    tmJoukkuejaksoOsaAlueet: tmJoukkuejaksoOsaAlueet, tmTukitavoite: tmTukitavoite, tmTukitavoitteet: tmTukitavoitteet, tmTukitavoitteetKirjoitus: tmTukitavoitteetKirjoitus,
    tmTukitavoiteMaksimi: tmTukitavoiteMaksimi, tmTukitavoiteEhdotukset: tmTukitavoiteEhdotukset
  };
  if (typeof module !== 'undefined' && module.exports) module.exports = API; else root.TM_TUKITAVOITTEET = API;
})(typeof window !== 'undefined' ? window : this);
