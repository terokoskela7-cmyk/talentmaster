/* ════════════════════════════════════════════════════════════════════════
   tm_jakso_malli.js — R6.3-A: jakson datamalli ilman UI:ta (PURE, ei Firebasea/DOM:ia/kyselyjä). 01 · "R6.3:n suunnittelu · linjaukset 5.10.2026 (koottu täsmennys)", D8, D16.
   Rakentajat normalisoivat ja VALIDOIVAT kentät ennen kirjoitusta (adapteri vie ne tmAsetaJaksofokus:n kautta); virheellinen syöte → throw (ei hiljaista roskaa).

   · tmYdinvahvuus({kuvaus, havaittu_pvm, rooli})        → pelaajan oma ydinvahvuus (se mikä tekee pelaajasta vaarallisen); valmentaja havainnoi ja vahvistaa. EI xfactor-nimistä kenttää.
   · tmTukiosa({alue, perustelu, harjoitteet[{id,nimi,lahde:'seura'|'tm'}]}) → tukiosa PERUSTELLAAN ydinvahvuudella; pelaaja näkee harjoitteet ja perustelun. alue neutraali ('kestävyys').
   · tmTukitarve({alue, merkitty_pvm, rooli})             → VAIN henkilökunnalle (ei pelaajan/huoltajan pinnoissa, ei raporteissa); vahvistetaan tai poistetaan katselmuksessa.
   · tmKevytJakso(jf)                                    → kotitehtävä = jakson kevyt muoto (muoto:'kevyt'); päättyy jakson vaihdossa ('korvattu'), arkistoriville lisakentat {kuittauksia:n}.
   · tmRajoittaaPelaamista(p, opts)                       → SISÄINEN funktio: ehto = valmentajan tukitarve TAI fyysinen testitulos Eerikkilä-normien alimmalla tasolla (normiIka). Kypsyyssuoja (§25):
                                                            PRE/LAH tai tuntematon PHV → pelkkä fyysinen testitulos EI riitä; tuntemattomalla PHV:llä vihje 'mittaa_kasvu'. Pelipaikan KPI = kolmas ehto myöhemmin (R6.3b).
   · tmYdinvahvuusVihje(p, ydinvahvuus, opts)             → kypsyyssuoja toiseen suuntaan (§25): PHV POST tai varhain kypsynyt JA ydinvahvuus fyysinen → vihje 'harkitse_tekninen_tai_taktinen'.
   · tmPelaajanVaihtoehdot(jf)                           → D8: pelaaja näkee vain valmentajan VAHVISTAMAT (vahvistettu:true) vaihtoehdot, ja vain kun jakso on 'valittavana'; vahvistamattomia ei koskaan.
   · tmJoukkueenTeema(joukkue, pvm, opts)                 → {nyt, seuraava} | null (null = teemaa ei näytetä; näkymän pitää toimia). Lähde D16 = A: seurat/{id}/valmennuslinja/teemat (opts.teemat annetaan lukijalta;
                                                            lib ei lue Firestorea). Muoto VÄLIAIKAINEN kunnes valmennuslinja-PR vahvistaa: teemat.jaksot = [{joukkue, alkaa, paattyy, teema}].
   · tmJaksoTekstiKelpaa / tmTarkistaJaksoData            → GDPR (tarkastusoikeus, tietojen vienti): kaikki tallennettu teksti voidaan näyttää huoltajalle; sanat heikkous, rajoite, kriittinen (ja muodot)
                                                            EIVÄT saa esiintyä pelaaja- eikä jaksodatassa (arvoissa eivätkä avaimissa); "ase" ei saa esiintyä kenttänimissä (neutraalit kenttänimet).
   Dual-export: module.exports || window.TM_JAKSO_MALLI.
════════════════════════════════════════════════════════════════════════ */
(function (root) {
  'use strict';

  // GDPR/§7.22: kielletyt sanat (taivutukset mukana). Avainsanat tahallaan tässä: tämä on vartijan oma lista, ei tallennettua tekstiä.
  var KIELLETYT = /heikkou|rajoite|rajoitt|kriittin|kriittis/i;
  // Firestore-kenttänimet ovat NEUTRAALEJA: näkyvä sana (esim. ydinvahvuus) tulee käännöksistä eikä kenttänimestä (GDPR-vienti näyttää kenttänimet). "ase" ei saa esiintyä kenttänimissä (segmenttinä).
  var KENTTANIMI_KIELLETTY = /(^|_)ase(_|$)/i;
  var HENKILOKUNTA = { valmentaja: 1, talenttivalmentaja: 1, fysiikkavalmentaja: 1, fysioterapeutti: 1, vp: 1, urheilutoimenjohtaja: 1, testivastaava: 1 };
  var LAHTEET = { seura: 1, tm: 1 };
  var FYYSISET = { kiihdytys: 1, maksinopeus: 1, voima: 1, ketteryys: 1, suunnanmuutos: 1, aerobinen: 1, fyysinen: 1, nopeus: 1, kestavyys: 1 };

  function _g(n) { return root && root[n]; }
  function _req(n, f) { try { return (typeof module !== 'undefined' && module.exports && typeof require === 'function') ? require(f) : _g(n); } catch (e) { return _g(n); } }

  function tmJaksoTekstiKelpaa(teksti) {
    var s = String(teksti == null ? '' : teksti), m = KIELLETYT.exec(s);
    return { ok: !m, loydetty: m ? m[0] : null };
  }
  // Käy läpi arvot JA avaimet; palauttaa polut joissa kielletty sana (tyhjä taulukko = puhdas). Syvyysraja suojaa kehästä.
  function tmTarkistaJaksoData(data, polku, _syv) {
    polku = polku || '$'; _syv = _syv || 0;
    var out = [];
    if (_syv > 12 || data == null) return out;
    if (typeof data === 'string') { if (KIELLETYT.test(data)) out.push(polku); return out; }
    if (typeof data !== 'object') return out;
    Object.keys(data).forEach(function (k) {
      if (KIELLETYT.test(k) || KENTTANIMI_KIELLETTY.test(k)) out.push(polku + '.' + k + ' (avain)');
      out = out.concat(tmTarkistaJaksoData(data[k], polku + '.' + k, _syv + 1));
    });
    return out;
  }

  function _teksti(v, nimi, pakollinen) {
    if (v == null || v === '') { if (pakollinen) throw new Error('tm_jakso_malli: ' + nimi + ' puuttuu'); return null; }
    if (typeof v !== 'string') throw new Error('tm_jakso_malli: ' + nimi + ' ei ole teksti');
    var t = v.trim();
    if (pakollinen && !t) throw new Error('tm_jakso_malli: ' + nimi + ' tyhjä');
    var k = tmJaksoTekstiKelpaa(t);
    if (!k.ok) throw new Error('tm_jakso_malli: ' + nimi + ' sisältää kielletyn sanan (' + k.loydetty + ') — teksti voidaan näyttää huoltajalle (GDPR)');
    return t;
  }
  function _pvm(v, nimi) {
    if (typeof v !== 'string' || !/^\d{4}-\d{2}-\d{2}$/.test(v)) throw new Error('tm_jakso_malli: ' + nimi + ' ei ole päivämäärä YYYY-MM-DD (paikallinen päivä, §7.26)');
    var o = v.split('-'), y = +o[0], m = +o[1], p = +o[2], pv = [31, (y % 4 === 0 && (y % 100 !== 0 || y % 400 === 0)) ? 29 : 28, 31, 30, 31, 30, 31, 31, 30, 31, 30, 31];   // kalenteripäivä (ei UTC-johdannaista, §7.26)
    if (m < 1 || m > 12 || p < 1 || p > pv[m - 1]) throw new Error('tm_jakso_malli: ' + nimi + ' ei ole kelvollinen päivä');
    return v;
  }
  function _rooli(v) {
    if (!HENKILOKUNTA[v]) throw new Error('tm_jakso_malli: rooli ei ole henkilökunnan rooli (' + v + ')');
    return v;
  }

  function tmYdinvahvuus(x) {
    x = x || {};
    return { kuvaus: _teksti(x.kuvaus, 'ydinvahvuus.kuvaus', true), havaittu_pvm: _pvm(x.havaittu_pvm, 'ydinvahvuus.havaittu_pvm'), rooli: _rooli(x.rooli) };
  }
  function tmTukiosa(x) {
    x = x || {};
    var h = Array.isArray(x.harjoitteet) ? x.harjoitteet : [];
    return {
      alue: _teksti(x.alue, 'tukiosa.alue', true),
      perustelu: _teksti(x.perustelu, 'tukiosa.perustelu', true),   // sitoo tukiosan ydinvahvuuteen — pakollinen
      harjoitteet: h.map(function (e, i) {
        if (!e || typeof e !== 'object') throw new Error('tm_jakso_malli: tukiosa.harjoitteet[' + i + '] ei ole objekti');
        if (!LAHTEET[e.lahde]) throw new Error('tm_jakso_malli: tukiosa.harjoitteet[' + i + '].lahde pitää olla \'seura\' tai \'tm\' (D16)');
        var id = e.id != null ? String(e.id).trim() : '';
        if (!id) throw new Error('tm_jakso_malli: tukiosa.harjoitteet[' + i + '].id puuttuu');
        return { id: id, nimi: _teksti(e.nimi, 'tukiosa.harjoitteet[' + i + '].nimi', true), lahde: e.lahde };
      })
    };
  }
  function tmTukitarve(x) {
    x = x || {};
    return { alue: _teksti(x.alue, 'tukitarve.alue', true), merkitty_pvm: _pvm(x.merkitty_pvm, 'tukitarve.merkitty_pvm'), rooli: _rooli(x.rooli) };
  }
  function tmKevytJakso(jf) {
    if (!jf || typeof jf !== 'object') throw new Error('tm_jakso_malli: jakso puuttuu');
    return Object.assign({}, jf, { muoto: 'kevyt' });
  }

  // ── Rajoittaa pelaamista (sisäinen) ─────────────────────────────────────
  function _phvKoodi(p, d) { var f = d.phvKoodi || _g('tmPhvKoodi') || (_req('TM_PHV', './tm_phv_tila.js') || {}).tmPhvKoodi; return typeof f === 'function' ? f(p) : null; }
  function _osaindeksit(p, d) {
    if (typeof d.osaindeksit === 'function') return d.osaindeksit(p);
    var N = _req('TM_EERIKKILA', './tm_eerikkila_normit.js') || {};
    var lasku = d.laskeD1Osaindeksit || N.laskeD1Osaindeksit || _g('laskeD1Osaindeksit');
    var ni = d.normiIka || N.normiIka || _g('normiIka');
    if (typeof lasku !== 'function' || !p || !p.hh_viimeisin) return null;
    var jk = p.joukkue || (Array.isArray(p.joukkueet) ? p.joukkueet[0] : '') || '';
    var ika = typeof ni === 'function' ? ni(p.syntymaVuosi, p.hh_pvm || null, jk) : null;
    var sp = (/\bT\s?\d/i.test(jk) || p.sukupuoli === 'N' || p.sukupuoli === 'T') ? 'N' : 'M';
    return ika == null ? null : lasku(p.hh_viimeisin, ika, sp);
  }
  function tmRajoittaaPelaamista(p, opts) {
    opts = opts || {}; var d = opts.deps || {};
    var tulos = { kylla: false, syyt: [], vihje: null, alueet: [] };
    if (!p) return tulos;
    var koodi = _phvKoodi(p, d);   // PRE|LAH|PH|POST|AN | null (tuntematon)
    // Ehto 1: valmentajan merkitsemä tukitarve (henkilökunnan päätös → ei kypsyyssuojaa; vahvistetaan katselmuksessa)
    if (p.tukitarve && p.tukitarve.alue && p.tukitarve.merkitty_pvm) { tulos.kylla = true; tulos.syyt.push('tukitarve'); tulos.alueet.push(p.tukitarve.alue); }
    // Ehto 2: fyysinen testitulos Eerikkilä-normien ALIMMALLA tasolla (normiIka) — kypsyyssuojan alainen
    var oi = _osaindeksit(p, d), alimmat = [];
    if (oi) Object.keys(oi).forEach(function (k) { if (oi[k] != null && oi[k] <= 1) alimmat.push(k); });
    if (alimmat.length) {
      var suojattu = koodi === 'PRE' || koodi === 'LAH' || koodi == null;   // §25: pre-PHV tai tuntematon → matala fyysinen on odotettua, ei peruste
      if (!suojattu) { tulos.kylla = true; tulos.syyt.push('testitulos'); alimmat.forEach(function (k) { tulos.alueet.push(k); }); }
      if (koodi == null) tulos.vihje = 'mittaa_kasvu';
      tulos.kypsyyssuoja = suojattu;
    }
    return tulos;
  }
  function tmYdinvahvuusVihje(p, ydinvahvuus, opts) {
    opts = opts || {}; var d = opts.deps || {};
    if (!p || !ydinvahvuus) return null;
    var koodi = _phvKoodi(p, d);
    var varhain = typeof d.varhainKypsynyt === 'function' ? !!d.varhainKypsynyt(p) : false;
    if (!(koodi === 'POST' || varhain)) return null;
    var alue = String(ydinvahvuus.alue || ydinvahvuus.kuvaus || '').toLowerCase();
    var fyysinen = ydinvahvuus.fyysinen === true || Object.keys(FYYSISET).some(function (k) { return alue.indexOf(k) >= 0; });
    return fyysinen ? 'harkitse_tekninen_tai_taktinen' : null;
  }

  // Pelaaja näkee vaihtoehdot VASTA kun jakso on 'valittavana' JA valmentaja on vahvistanut ne (vahvistettu:true); vahvistamattomia ehdotuksia ei koskaan. Max 2 (D8).
  function tmPelaajanVaihtoehdot(jf) {
    if (!jf || jf.tila !== 'valittavana' || !Array.isArray(jf.vaihtoehdot)) return [];
    return jf.vaihtoehdot.filter(function (v) { return v && v.vahvistettu === true && v.konsepti_avain; }).slice(0, 2);
  }

  // ── Joukkueen teema (rajapinta; lähde D16 = A, seurat/{id}/valmennuslinja/teemat) ──
  function _pvmKey(v) {
    if (typeof v === 'string' && /^\d{4}-\d{2}-\d{2}/.test(v)) return v.slice(0, 10);
    return null;
  }
  function tmJoukkueenTeema(joukkue, pvm, opts) {
    var teemat = opts && opts.teemat, p = _pvmKey(pvm);
    if (!joukkue || !p || !teemat || !Array.isArray(teemat.jaksot)) return null;
    var rivit = teemat.jaksot.filter(function (r) { return r && r.joukkue === joukkue && _pvmKey(r.alkaa) && _pvmKey(r.paattyy) && typeof r.teema === 'string' && r.teema.trim(); })
      .map(function (r) { return { a: _pvmKey(r.alkaa), b: _pvmKey(r.paattyy), t: r.teema.trim() }; }).sort(function (x, y) { return x.a < y.a ? -1 : 1; });
    var nyt = null, seur = null, i;
    for (i = 0; i < rivit.length; i++) if (rivit[i].a <= p && p <= rivit[i].b) { nyt = rivit[i].t; break; }
    for (i = 0; i < rivit.length; i++) if (rivit[i].a > p) { seur = rivit[i].t; break; }
    return (nyt == null && seur == null) ? null : { nyt: nyt, seuraava: seur };
  }

  var API = { tmYdinvahvuus: tmYdinvahvuus, tmTukiosa: tmTukiosa, tmTukitarve: tmTukitarve, tmKevytJakso: tmKevytJakso, tmRajoittaaPelaamista: tmRajoittaaPelaamista,
    tmYdinvahvuusVihje: tmYdinvahvuusVihje, tmJoukkueenTeema: tmJoukkueenTeema, tmPelaajanVaihtoehdot: tmPelaajanVaihtoehdot, tmJaksoTekstiKelpaa: tmJaksoTekstiKelpaa, tmTarkistaJaksoData: tmTarkistaJaksoData, KIELLETYT: KIELLETYT, KENTTANIMI_KIELLETTY: KENTTANIMI_KIELLETTY };
  if (typeof module !== 'undefined' && module.exports) module.exports = API;
  else root.TM_JAKSO_MALLI = API;
})(typeof window !== 'undefined' ? window : this);
