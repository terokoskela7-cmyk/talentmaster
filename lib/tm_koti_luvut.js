/* ════════════════════════════════════════════════════════════════════════
   tm_koti_luvut.js — VP_v25 Koti + Tilanne: P0-luvut YHDESTÄ paikasta (audit 24 §6, CODE_BRIEF_S2 "Tarkistus 9.10." kohta 1).
   PURE: ei Firebasea, ei DOM:ia, ei kelloa (nytMs annetaan sisään). Dual-export: module.exports || window.TM_KOTI_LUVUT.

   JUURISYY: sama asia laskettiin kahdessa-kolmessa paikassa eri säännöllä, joten VP näki "3 / 1 / 1 vaatii toimenpidettä",
   "14 vs 3 joukkuetta" ja "34 / 30 / 156" suostumusta. Tämä moduuli on SSOT; näkymät vain kutsuvat.

   1. toimenpideMaara    — YKSI toimenpidelaskuri: Kodin "Tarvitsee huomiota" -signaalien määrä (= _vpSignaaliKortit().kortit).
   2. kartoitus          — harjoitettavuuskartoitus (flei): joukkueet + pelaajat YHDELLÄ laskennalla.
   3. suostumus          — kutsuttu / odottaa / ilman eriteltynä (kanoninen ehto = functions/suostumus.js).
   4. kattavuus          — D125 kattavuusportti (≥ 2/3 joukkueista TAI ≥ 70 % pelaajista), D116-periaate: alle rajan ei lukua.
   5. aloitusopas        — YKSI opas, yksi tila (ensimmäinen testi kuittaa vaiheen).
   6. poikkeamaPortti    — §28-portti: fyysinen heikkous ei nouse poikkeamaksi ilman PHV-mittausta; D1 = 1,0 = asteikon alaraja.
   7. hiddenGemPortti    — §28-portti Hidden Gem -ehdokkaille (PHV-mittaus + D1-alarajan varmistus).
   8. rajaaEhdotukset / ehdotusVanhentunut — D134 (Koti ≤ 3, Tilanne ≤ 5, kuittaamaton vanhenee 14 pv:ssä).
════════════════════════════════════════════════════════════════════════ */
(function (root) {
  'use strict';

  var KOTI_MAX_SIGNAALIT = 3;          // D134 / D115
  var TILANNE_MAX_EHDOTUKSET = 5;      // D134
  var EHDOTUS_VANHENEE_PV = 14;        // D134
  var KATTAVUUS_JOUKKUE_OSUUS = 2 / 3; // D125 (oletus)
  var KATTAVUUS_PELAAJA_OSUUS = 0.7;   // D125 (oletus)
  var JOUKKUE_KATETTU_OSUUS = 0.7;     // joukkue "katettu" = vähintään 70 % jäsenistä mitattu (sama raja kuin pelaajilla; D125 ei määrittele — PM vahvistaa)
  var D1_ALARAJA = 1;                  // eerikkilaTaso() palauttaa 1 kaikelle heikoimman rajan alittavalle mitatulle arvolle

  function _req(g, f) { try { return (typeof module !== 'undefined' && module.exports && typeof require === 'function') ? require(f) : (root && root[g]); } catch (e) { return root && root[g]; } }
  function _PHV() { return _req('TM_PHV', './tm_phv_tila.js') || root || {}; }
  function _num(x) { return typeof x === 'number' && isFinite(x); }

  /* ── 1. YKSI TOIMENPIDELASKURI ─────────────────────────────────────────── */
  function toimenpideMaara(kortit) { return Array.isArray(kortit) ? kortit.length : 0; }

  /* ── 8. D134 ───────────────────────────────────────────────────────────── */
  function rajaaEhdotukset(lista, max) {
    var a = Array.isArray(lista) ? lista : [];
    var m = max == null ? KOTI_MAX_SIGNAALIT : max;
    return { nakyvat: a.slice(0, m), lisaa: Math.max(0, a.length - m) };
  }
  function _ms(luotu) {
    if (luotu == null) return null;
    if (typeof luotu === 'number') return luotu;
    if (typeof luotu.toMillis === 'function') return luotu.toMillis();
    if (typeof luotu.toDate === 'function') return luotu.toDate().getTime();
    if (typeof luotu.seconds === 'number') return luotu.seconds * 1000;
    var t = new Date(luotu).getTime();
    return isFinite(t) ? t : null;
  }
  /* Tuntematon luontiaika → EI vanhentunut (ei piiloteta ehdotusta arvauksella). */
  function ehdotusVanhentunut(luotu, nytMs) {
    var t = _ms(luotu);
    if (t == null || nytMs == null) return false;
    return (nytMs - t) > EHDOTUS_VANHENEE_PV * 86400000;
  }
  /* "Samaa ehdotusta ei tuoteta uudelleen ennen kuin data muuttuu" (D134): vanhentunut ehdotus estää saman
     (signaali|joukkue|teksti) -yhdistelmän; teksti kantaa lukumäärät → datan muuttuessa teksti muuttuu → uusi ehdotus sallitaan.
     avoimet = KAIKKI haetut ehdotukset (myös vanhentuneet). Palauttaa avain→true -kartan. */
  function ehdotusEste(avoimet, nytMs) {
    var o = {};
    (avoimet || []).forEach(function (t) {
      var perus = (t.signaali || '') + '|' + (t.joukkue || '');
      if (ehdotusVanhentunut(t.luotu, nytMs)) o[perus + '|' + (t.teksti || '')] = true;   // vanhentunut: vain täsmälleen sama teksti estää
      else o[perus] = true;                                                              // tuore: signaali+joukkue estää (nykyinen dedup)
    });
    return o;
  }
  function ehdotusEstetty(este, r) {
    var perus = (r.signaali || '') + '|' + (r.joukkue || '');
    return !!(este[perus] || este[perus + '|' + (r.teksti || '')]);
  }

  /* ── 2. HARJOITETTAVUUSKARTOITUS ───────────────────────────────────────── */
  /* joukkueMap = { joukkueenNimi: [pelaajat] } (VP: _pRyhmiteltyJoukkueittain). Pelaaja voi olla usealla joukkueella (§7.18) →
     pelaajaluku lasketaan UNIIKEISTA pelaajista (id), joukkueluku joukkueista joissa KUKAAN jäsen ei ole kartoitettu. */
  function onKartoitettu(p) { return !!p && p.flei_viimeisin != null; }
  function _avain(p, i) { return p && p.id != null ? 'i:' + p.id : 'x:' + i; }
  function kartoitus(joukkueMap) {
    var nimet = Object.keys(joukkueMap || {}), uniikit = {}, joukkueYht = 0, joukkueIlman = 0, n = 0;
    nimet.forEach(function (nimi) {
      var jasenet = joukkueMap[nimi] || [];
      if (!jasenet.length) return;
      joukkueYht++;
      if (jasenet.every(function (p) { return !onKartoitettu(p); })) joukkueIlman++;
      jasenet.forEach(function (p, i) { var k = _avain(p, nimi + '#' + i); if (!uniikit[k]) { uniikit[k] = 1; n++; } });
    });
    var ilman = 0, seen = {};
    nimet.forEach(function (nimi) { (joukkueMap[nimi] || []).forEach(function (p, i) { var k = _avain(p, nimi + '#' + i); if (seen[k]) return; seen[k] = 1; if (!onKartoitettu(p)) ilman++; }); });
    return { joukkueYht: joukkueYht, joukkueIlman: joukkueIlman, pelaajaYht: n, pelaajaIlman: ilman };
  }

  /* ── 3. SUOSTUMUS ──────────────────────────────────────────────────────── */
  /* Kanoninen ehto = functions/suostumus.js: annettu = suostumusTila==='annettu' TAI suostumus.annettu.
     pilotti = tuotu, odottaa = kutsu lähetetty (ei vastausta). Puuttuva tila = tuotu (EI kutsuttu).
       tuotu     = kaikki seuran pelaajat
       kutsuttu  = kutsu lähetetty (odottaa + annettu)
       odottaa   = kutsuttu, ei vielä suostumusta
       annettu   = suostumus annettu
       ilman     = tuotu − annettu (kaikki joilla ei ole suostumusta; sisältää kutsumattomat)
       eiKutsuttu = tuotu − kutsuttu */
  function suostumusAnnettu(p) { return !!p && (p.suostumusTila === 'annettu' || !!(p.suostumus && p.suostumus.annettu)); }
  function suostumus(pelaajat) {
    var P = Array.isArray(pelaajat) ? pelaajat : [], annettu = 0, odottaa = 0;
    P.forEach(function (p) { if (suostumusAnnettu(p)) annettu++; else if (p && p.suostumusTila === 'odottaa') odottaa++; });
    var kutsuttu = annettu + odottaa;
    return { tuotu: P.length, kutsuttu: kutsuttu, odottaa: odottaa, annettu: annettu, ilman: P.length - annettu, eiKutsuttu: P.length - kutsuttu,
             konversio: kutsuttu > 0 ? Math.round(annettu / kutsuttu * 100) : null };
  }

  /* ── 4. KATTAVUUSPORTTI (D125) ─────────────────────────────────────────── */
  /* pelaajat = uniikit pelaajat, joukkueMap = {nimi:[pelaajat]}, mitattuFn(p) → bool.
     riittava = (mitattuja ≥ 70 % pelaajista) TAI (katettuja joukkueita ≥ 2/3). Kokonaislukuvertailu (ei liukulukua).
     Teksti "mitattu X/Y" (D125) — alle rajan seuratason lukua EI näytetä (D116:n periaate). */
  function kattavuus(pelaajat, joukkueMap, mitattuFn, opts) {
    opts = opts || {};
    var oJ = opts.joukkue != null ? opts.joukkue : KATTAVUUS_JOUKKUE_OSUUS, oP = opts.pelaaja != null ? opts.pelaaja : KATTAVUUS_PELAAJA_OSUUS;
    var P = Array.isArray(pelaajat) ? pelaajat : [], n = 0;
    P.forEach(function (p) { if (mitattuFn(p)) n++; });
    var nimet = Object.keys(joukkueMap || {}).filter(function (j) { return (joukkueMap[j] || []).length > 0; }), jN = 0;
    nimet.forEach(function (j) {
      var js = joukkueMap[j], m = 0; js.forEach(function (p) { if (mitattuFn(p)) m++; });
      if (m >= JOUKKUE_KATETTU_OSUUS * js.length) jN++;
    });
    var EPS = 1e-9;
    var riittava = P.length > 0 && (n >= oP * P.length - EPS || (nimet.length > 0 && jN >= oJ * nimet.length - EPS));
    return { riittava: riittava, n: n, yht: P.length, joukkueN: jN, joukkueYht: nimet.length,
             pelaajaTeksti: 'mitattu ' + n + '/' + P.length, joukkueTeksti: 'mitattu ' + jN + '/' + nimet.length + ' joukkueelta' };
  }

  /* ── 5. YKSI ALOITUSOPAS ───────────────────────────────────────────────── */
  /* ctx = { pelaajat, tapahtumat, valmentajat, kayty:{koti,raportointi}, harjarvio, mentoriLahetetty }. Askeleiden järjestys ja
     sisältö ovat OPPAAN totuus: Koti ja Tilanne renderöivät saman tilan. "valmis" vasta kun kaikki askeleet tehty (4/5 ≠ valmis).
     Ensimmäinen testitapahtuma tai ensimmäinen mittaus kuittaa askeleen 1 → tila päivittyy testin luonnista. */
  function aloitusopas(ctx) {
    ctx = ctx || {};
    var P = ctx.pelaajat || [], V = ctx.valmentajat || [], T = ctx.tapahtumat || [], K = ctx.kayty || {};
    var mitattu = P.some(function (p) { return p.flei_viimeisin != null || p.tki_viimeisin != null || p.hh_taso != null || p.hh_viimeisin != null; });
    var askeleet = [
      { avain: 'testi',      ok: mitattu || T.length > 0 },
      { avain: 'pulssi',     ok: !!K.koti },
      { avain: 'arviointi',  ok: !!ctx.harjarvio },
      { avain: 'raportti',   ok: !!K.raportointi },
      { avain: 'mentorointi', ok: !!ctx.mentoriLahetetty || V.some(function (v) { return v.mentorointiPvt === 0; }) }
    ];
    var tehty = askeleet.filter(function (a) { return a.ok; }).length, seuraava = null;
    for (var i = 0; i < askeleet.length; i++) { if (!askeleet[i].ok) { seuraava = askeleet[i].avain; break; } }
    return { askeleet: askeleet, tehty: tehty, yht: askeleet.length, valmis: tehty === askeleet.length, seuraava: seuraava };
  }

  /* ── 6. §28-PORTTI POIKKEAMILLE + D1 = 1,0 ─────────────────────────────── */
  /* D1-ARVO 1,0 (selvitys): laskeD1Osaindeksit → eerikkilaTaso() palauttaa 1 KAIKELLE arvolle, joka on heikointa rajaa huonompi
     (viimeinen `return 1`), mutta 0 kun arvoa ei ole. 1,0 on siis MITATUSTA arvosta laskettu asteikon ALARAJA (todellinen taso voi olla
     matalampi) — ei puuttuvan datan oletus. Erottelu: alaraja ≠ "heikko": se on "alle mitattavan asteikon" → tarkista mittaus
     (yksikkö/kirjausvirhe) ennen johtopäätöstä. Raaka-arvot tarkistaa scripts/d1_alaraja_tarkistus.js. */
  var FYSIKAALISET = { kiihdytys: 1, maksinopeus: 1, voima: 1, ketteryys: 1, aerobinen: 1 };
  var PHV_HERKAT = { maksinopeus: 1, aerobinen: 1, voima: 1 };   // sama joukko kuin laskeJoukkuePoikkeamat POST_PHV ja kypsyysTila "gated"
  var AVAINTESTIT = ['lin30m', 'cmj', 'mas'];

  function _phvEiMitattu(p) {
    var f = _PHV().tmPhvEiMitattu || (root && root.tmPhvEiMitattu);
    return typeof f === 'function' ? !!f(p) : false;
  }
  function _phvPuuttuuMaara(pelaajat) { var n = 0; (pelaajat || []).forEach(function (p) { if (_phvEiMitattu(p)) n++; }); return n; }

  /* poikkeamat = laskeJoukkuePoikkeamat()-tulos yhdelle joukkueelle, jasenet = joukkueen pelaajat.
     Palauttaa uuden listan (ei muuta syötettä). Lisäkentät: alaraja (bool), phvPuuttuu ({n,yht}|null), vakavuus alennettu 'info':ksi
     kun PHV-herkän fyysisen osa-alueen heikkoutta ei voi tulkita (enemmistöltä PHV mittaamatta). Kiihdytys/ketteryys eivät ole PHV-herkkiä (spec §3). */
  function poikkeamaPortti(poikkeamat, jasenet) {
    var yht = (jasenet || []).length, eiPhv = _phvPuuttuuMaara(jasenet);
    var enemmistoEiPhv = yht > 0 && eiPhv * 2 > yht;
    return (poikkeamat || []).map(function (x) {
      var o = {}; for (var k in x) o[k] = x[k];
      o.alaraja = false; o.phvPuuttuu = null;
      if ((x.tyyppi === 'alle_normin' || x.tyyppi === 'profiilipoikkeama') && FYSIKAALISET[x.osaAlue]) {
        if (_num(x.arvo) && x.arvo <= D1_ALARAJA) { o.alaraja = true; if (o.vakavuus === 'punainen') o.vakavuus = 'amber'; }
        if (PHV_HERKAT[x.osaAlue] && enemmistoEiPhv && !x.ikavaiheOdotettu) { o.phvPuuttuu = { n: eiPhv, yht: yht }; o.vakavuus = 'info'; }
      }
      return o;
    });
  }

  /* ── 7. §28-PORTTI HIDDEN GEM -EHDOKKAILLE ─────────────────────────────── */
  /* Ehdokas näytetään vain kun (a) PHV on mitattu tai pelaaja on PHV-ikkunan ulkopuolella (tmPhvEiMitattu=false) ja
     (b) D1 ≤ 1,0 -alaraja on varmistettu vähintään kahdella plausiibelilla avaintestillä (lin30m, cmj, mas > 0).
     Muuten: ei ehdokaslistaan, vaan syy → "odottaa PHV-mittausta" / "alaraja, tarkista mittaus". */
  function avaintestejaMitattu(p) {
    var hh = (p && p.hh_viimeisin) || {}, n = 0;
    AVAINTESTIT.forEach(function (t) { if (_num(hh[t]) && hh[t] > 0) n++; });
    return n;
  }
  function hiddenGemPortti(p, d1) {
    if (_phvEiMitattu(p)) return { sallittu: false, syy: 'phv_puuttuu' };
    if (_num(d1) && d1 <= D1_ALARAJA && avaintestejaMitattu(p) < 2) return { sallittu: false, syy: 'alaraja' };
    return { sallittu: true, syy: null };
  }

  var API = {
    KOTI_MAX_SIGNAALIT: KOTI_MAX_SIGNAALIT, TILANNE_MAX_EHDOTUKSET: TILANNE_MAX_EHDOTUKSET, EHDOTUS_VANHENEE_PV: EHDOTUS_VANHENEE_PV,
    KATTAVUUS_JOUKKUE_OSUUS: KATTAVUUS_JOUKKUE_OSUUS, KATTAVUUS_PELAAJA_OSUUS: KATTAVUUS_PELAAJA_OSUUS, D1_ALARAJA: D1_ALARAJA,
    toimenpideMaara: toimenpideMaara, rajaaEhdotukset: rajaaEhdotukset, ehdotusVanhentunut: ehdotusVanhentunut, ehdotusEste: ehdotusEste, ehdotusEstetty: ehdotusEstetty,
    onKartoitettu: onKartoitettu, kartoitus: kartoitus, suostumusAnnettu: suostumusAnnettu, suostumus: suostumus, kattavuus: kattavuus, aloitusopas: aloitusopas,
    poikkeamaPortti: poikkeamaPortti, avaintestejaMitattu: avaintestejaMitattu, hiddenGemPortti: hiddenGemPortti
  };
  if (typeof module !== 'undefined' && module.exports) module.exports = API;
  if (root) root.TM_KOTI_LUVUT = API;
})(typeof window !== 'undefined' ? window : null);
