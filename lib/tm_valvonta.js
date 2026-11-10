/* ════════════════════════════════════════════════════════════════════════
   tm_valvonta.js — Projekti 07 / PR 1: seurojen erottelun valvonnan PUHDAS ydin (ei Firebasea, ei I/O:ta, ei DOMia, ei kirjoituskutsuja).
   Päätökset: .briefit/projektit/07-erottelun-valvonta/VAIHE0.md (P1–P13). Syöte on dokumenttilistat; I/O-kuoret (scripts/, functions/valvonta.js) hakevat ne.
   Jaettu functions/-kansioon (functions/jaettu_lib.json). Raportointi, PII-vartija ja sähköposti: tm_valvonta_raportti.js. Kenttäinventaario: docs/VALVONTA_KENTTAINVENTAARIO.md.
   LUOKITTELU    · tmVJoukkueviite(viite, ctx) → 'tyhja'|'oma'|'toisen_seuran'|'orpo'   ctx { sid, omatNimet:Set, omatIdt:Set, nimiSeurat, idSeurat }
   TARKISTUKSET  · tmVTarkistaSeura(syote) → [{seura,koodi,kokoelma,lkm,kokonais,taso}]   · tmVTarkistaGlobaali(indeksit, auditRivit, nytMs)   · tmVIndeksit(seurat)
   KYNNYS        · tmVKynnys(koodi, luku, raja?, kokonais?) → 'ok'|'varoitus'|'virhe'   · tmVKasvuTaso(nyt, edellinen, ennen)   · tmVTila(maara, raja)
   MITTARIT      · MITTARIT / PELAAJAMITTARIT (deklaratiivinen H1/H2-lista {nimi,tyyppi,kokoelma,ehto,raja}) — diag_hiljaiset_rajat.js ajaa ne
   Koodit: E1a toisen seuran joukkue · E1b orpo joukkue · E2 sama pelaaja-id usealla seuralla (aktiivinen/arkistoitu E2b) · E3 seuraId≠polku · E4 osittainen pelaajadoc · E5 kuittauksen uid (toisen seuran / E5b ei missään)
           E6 PalloID-törmäys · E7 audit-estot 7 pv · H1 hiljainen raja · K1 avoimia ehdotuksia/joukkue · K2 avoimia/seura (raja 50) · K3 kasvu · M1 dokumenttikoko · M2 orpo pelaajaviite */
(function (root) {
  'use strict';
  var OHITETUT_SEURAT = ['demo', 'demo-fc', 'qg_savu'];   // P10: synteettinen data; uusi demo-seura lisätään tähän PR:llä
  var DOC_RAJA_TAVU = 1048576, AUDIT_ESTOT = ['kayttaja_toisen_seuran_estetty', 'kayttaja_rooli_estetty'], VIIKKO_MS = 7 * 86400000;
  /* Joukkueviitekentät kokoelmittain (VAIHE0 §1.1 E1; inventaario PR 1: pelaajat/toimenpiteet koodista, muut joukkue*-perhe, vahvistetaan PR 2:n ajossa) */
  var VIITEKENTAT = { toimenpiteet: ['joukkue'], pelaajat: ['joukkue', 'joukkueNimi', 'joukkueId', 'joukkueet'], kalenteri: ['joukkue', 'joukkue_nimi', 'joukkueet'], viestit: ['joukkue'],
    seuranta_kuittaukset: ['joukkue'], kooste_joukkue: ['joukkue'], havainnot: ['joukkue'], harjoitusarvioinnit: ['joukkue'], mentoroinnit: ['joukkue'] };
  var SEURAID_KOKOELMAT = ['kayttajat', 'havainnot', 'sisainen'];   // E3: kokoelmat, joissa seuraId tallentuu (inventaario)
  var ORPO_PELAAJAVIITE = ['seuranta_kuittaukset', 'toimenpiteet', 'viestit'], PELAAJA_VIITEKENTAT = ['pelaajaId', 'pelaaja_id'];

  function arr(v) { return Array.isArray(v) ? v : []; }
  function ohitetaanko(sid) { return OHITETUT_SEURAT.indexOf(String(sid)) >= 0; }
  /** Joukkuenimen vertailumuoto: kirjainkoko, _/- → väli, tyhjät yhteen. */
  function normJoukkue(j) { return String(j == null ? '' : j).toLowerCase().replace(/[_\-]+/g, ' ').replace(/\s+/g, ' ').trim(); }
  /** Vieras = joukkue annettu (ei tyhjä/'tuntematon'/'—') eikä kuulu seuran omiin (omat = Set normalisoituja nimiä). */
  function onVieras(joukkue, omat) { var n = normJoukkue(joukkue); return !!n && n !== 'tuntematon' && n !== '—' && !omat.has(n); }
  function onNimi(x) { return !!(x.etunimi || x.sukunimi || x.nimi); }
  function onSyntyma(x) { return x.syntymaVuosi != null || x.syntymavuosi != null || x.syntymaaika != null || x.syntymapaiva != null; }
  /** E4: osittainen pelaajadokumentti (ei nimeä eikä syntymävuotta = set merge -jäänne). */
  function onOsittainen(x) { return !onNimi(x) && !onSyntyma(x); }
  /** Pelaajan joukkueviitteet (nimet ja id:t) → ne, jotka eivät ole seuran omia. */
  function vieraatViitteet(x, omatNimet, omatIdt) {
    var viitteet = [x.joukkue, x.joukkueNimi, x.joukkueId].concat(arr(x.joukkueet)).filter(function (v) { return v != null && v !== ''; });
    return viitteet.filter(function (v) { var n = normJoukkue(v); return onVieras(v, omatNimet) && !omatIdt.has(String(v)) && !omatIdt.has(n); });
  }
  function haeSetti(kartta, avain) { if (!kartta) return null; return typeof kartta.get === 'function' ? kartta.get(avain) : (Object.prototype.hasOwnProperty.call(kartta, avain) ? kartta[avain] : null); }
  function onMuussa(setti, sid) { var r = false; if (setti) setti.forEach(function (s) { if (s !== sid) r = true; }); return r; }
  /** Viite jonkin TOISEN seuran joukkueeseen nimen perusteella (laajuusskriptin "joka on jonkin toisen seuran joukkue"). nimiSeurat: {normNimi: Set(sid)} tai Map. */
  function onToisenSeuranNimi(viite, sid, nimiSeurat) { return onMuussa(haeSetti(nimiSeurat, normJoukkue(viite)), sid); }
  function tmVJoukkueviite(viite, ctx) {
    var n = normJoukkue(viite);
    if (!n || n === 'tuntematon' || n === '—') return 'tyhja';
    if (ctx.omatNimet.has(n) || ctx.omatIdt.has(String(viite)) || ctx.omatIdt.has(n)) return 'oma';
    if (onMuussa(haeSetti(ctx.nimiSeurat, n), ctx.sid) || onMuussa(haeSetti(ctx.idSeurat, String(viite)), ctx.sid)) return 'toisen_seuran';
    return 'orpo';
  }
  /** Kuittauksen vieras joukkue tai valmentaja_uid, jota ei ole seuran kayttajat-joukossa (laajuusskriptin yhdistetty luku). */
  function kuittausVieras(k, omatNimet, kayttajat) { return (k.joukkue != null && onVieras(k.joukkue, omatNimet)) || !!(k.valmentaja_uid && !kayttajat.has(String(k.valmentaja_uid))); }

  /* ── Hiljaiset rajat (H1/H2) ── */
  /** PURE: osuus rajasta → tila. raja ei-numeerinen → null. */
  function tmVTila(maara, raja) {
    if (typeof raja !== 'number' || raja <= 0) return null;
    var o = maara / raja;
    return o >= 1 ? 'YLITTYY' : (o >= 0.7 ? 'LÄHELLÄ' : 'OK');
  }
  /** PURE: ryhmälaskuri {avain: n} → { ryhmia, suurin, ylittaa (n ≥ raja), lahella (≥ 70 % ja < raja) } */
  function ryhmaYhteenveto(kartta, raja) {
    var arvot = Object.keys(kartta || {}).map(function (k) { return kartta[k]; });
    return { ryhmia: arvot.length, suurin: arvot.reduce(function (a, b) { return Math.max(a, b); }, 0), ylittaa: arvot.filter(function (n) { return n >= raja; }).length, lahella: arvot.filter(function (n) { return n >= raja * 0.7 && n < raja; }).length };
  }
  /** Kooste-ikkunan alku: sama laskenta kuin seuran_kooste.js (arvioMs − 29 pv), UTC-päivänä. */
  function ikkunanAlku(nytMs) { return new Date(nytMs - 29 * 86400000).toISOString().slice(0, 10); }
  var KLIPPI = ['klippi', 'klippi_vastaus', 'klippi_kuittaus'];
  /* tyyppi: maara = count() · ryhma = select(ryhmaKentta) ryhmittely · alikokoelma_ryhma = count() per kayttajat-dokumentin alikokoelma. ehto: [kentta, op, arvo]; '{alku}' = ikkunanAlku. Järjestys = tulostusjärjestys. */
  var MITTARIT = [
    { nimi: 'kalenteri_ikkuna (pvm ≥ {alku})', tyyppi: 'maara', kokoelma: 'kalenteri', ehto: [['pvm', '>=', '{alku}']], raja: 500 },
    { nimi: 'kalenteri_ei_poistettu', tyyppi: 'maara', kokoelma: 'kalenteri', ehto: [['poistettu', '==', false]], raja: 300 },
    { nimi: 'viestit klippi_vastaus', tyyppi: 'maara', kokoelma: 'viestit', ehto: [['tyyppi', '==', 'klippi_vastaus']], raja: 2000 },
    { nimi: 'viestit klippi_kuittaus', tyyppi: 'maara', kokoelma: 'viestit', ehto: [['tyyppi', '==', 'klippi_kuittaus']], raja: 2000 },
    { nimi: 'harjoitusarvioinnit (raja 500)', tyyppi: 'maara', kokoelma: 'harjoitusarvioinnit', ehto: [], raja: 500 },
    { nimi: 'testitapahtumat (raja 50)', tyyppi: 'maara', kokoelma: 'testitapahtumat', ehto: [], raja: 50 },
    { nimi: 'toimenpiteet tyyppi=pulssi', tyyppi: 'maara', kokoelma: 'toimenpiteet', ehto: [['tyyppi', '==', 'pulssi']], raja: 300 },
    { nimi: 'harjoitusarvioinnit per valmentajaUid (raja 100)', tyyppi: 'ryhma', kokoelma: 'harjoitusarvioinnit', ehto: [], ryhmaKentta: 'valmentajaUid', raja: 100 },
    { nimi: 'havainnot per valmentajaUid (raja 200)', tyyppi: 'ryhma', kokoelma: 'havainnot', ehto: [], ryhmaKentta: 'valmentajaUid', raja: 200 },
    { nimi: 'ohjelmat per laatija_uid (raja 200)', tyyppi: 'ryhma', kokoelma: 'ohjelmat', ehto: [], ryhmaKentta: 'laatija_uid', raja: 200 },
    { nimi: 'viestit klippi* per vastaanottajaUid (Master, raja 600)', tyyppi: 'ryhma', kokoelma: 'viestit', ehto: [['tyyppi', 'in', KLIPPI]], ryhmaKentta: 'vastaanottajaUid', raja: 600 },
    { nimi: 'viestit per vastaanottajaUid (VP, raja 100)', tyyppi: 'ryhma', kokoelma: 'viestit', ehto: [], ryhmaKentta: 'vastaanottajaUid', raja: 100 },
    { nimi: 'viestit per lahettajaUid (VP, raja 100)', tyyppi: 'ryhma', kokoelma: 'viestit', ehto: [], ryhmaKentta: 'lahettajaUid', raja: 100 },
    { nimi: 'reflektiot per käyttäjä (raja 100)', tyyppi: 'alikokoelma_ryhma', kokoelma: 'kayttajat', alikokoelma: 'reflektiot', ehto: [], raja: 100 }
  ];
  /* H2 (pelaajakohtaiset; vain --pelaajat / kuukausiajo, P9): count() per pelaajan alikokoelma */
  var PELAAJAMITTARIT = [
    { nimi: 'kirjaukset per pelaaja (Pelaaja-laskuri, raja 60)', alikokoelma: 'kirjaukset', ehto: [], raja: 60 },
    { nimi: 'havainnot nakyvyys=pelaaja per pelaaja (raja 50)', alikokoelma: 'havainnot', ehto: [['nakyvyys', '==', 'pelaaja']], raja: 50 }
  ];
  /** Mittarin ehto → [[kentta, op, arvo]] ('{alku}' korvattu). */
  function mittarinEhto(m, alku) { return m.ehto.map(function (e) { return [e[0], e[1], e[2] === '{alku}' ? alku : e[2]]; }); }
  function mittarinNimi(m, alku) { return m.nimi.replace('{alku}', alku); }

  /* ── Kynnykset (P4, VAIHE0 §3.2) ── */
  var KYNNYS = {   // absoluuttinen luku → taso: [varoitus-alaraja, virhe-alaraja] (null = ei kyseistä tasoa)
    E1a: [null, 1], E1b: [1, null], E2: [null, 1], E2b: [1, null], E3: [null, 1], E4: [1, null], E5: [null, 1], E5b: [1, null], E6: [null, 1], E7: [1, null], K1: [7, 12], M2: [1, null] };
  var OSUUSKYNNYS = { H1: [0.7, 1], K2: [0.7, 1], M1: [0.7, 0.9] };   // luku/raja → [varoitus, virhe]
  var E1B_MASSA = 0.1;   // E1b: yli 10 % seuran dokumenteista kokoelmassa → virhe
  /** luku (+ raja osuuskynnyksille, + kokonais E1b-massavirheelle) → 'ok'|'varoitus'|'virhe'. Tuntematon koodi → virhe (ei hiljaa ok). */
  function tmVKynnys(koodi, luku, raja, kokonais) {
    if (OSUUSKYNNYS[koodi]) { if (typeof raja !== 'number' || raja <= 0) return 'virhe'; var o = OSUUSKYNNYS[koodi], l = luku * 100; return l >= raja * o[1] * 100 - 1e-9 ? 'virhe' : (l >= raja * o[0] * 100 - 1e-9 ? 'varoitus' : 'ok'); }
    var k = KYNNYS[koodi]; if (!k) return 'virhe';
    if (koodi === 'E1b' && luku >= 1 && kokonais > 0 && luku / kokonais > E1B_MASSA) return 'virhe';
    if (k[1] != null && luku >= k[1]) return 'virhe';
    return k[0] != null && luku >= k[0] ? 'varoitus' : 'ok';
  }
  /** K3: kokoelman viikkokasvu > 2 × edellisen viikon kasvu JA absoluuttinen kasvu ≥ 50 → varoitus (pienet luvut eivät hälytä). */
  function tmVKasvuTaso(nyt, edellinen, ennen) {
    if (edellinen == null) return 'ok';
    var kasvu = nyt - edellinen, ed = ennen == null ? 0 : Math.max(0, edellinen - ennen);
    return kasvu >= 50 && kasvu > 2 * ed ? 'varoitus' : 'ok';
  }

  /* ── Indeksit ── */
  /* "joukko" = taulukko ilman toistoja (ei Set.add: valvontamoduuleissa ei saa olla yhtään .add/.set/.delete-kutsua, ks. tests/valvonta_kirjoitusvartija.test.js) */
  function tyhja() { return Object.setPrototypeOf({}, null); }   // prototyypitön kartta (id 'constructor' ei törmää); ei Object.create (vartija)
  function lisaaSettiin(o, avain, arvo) { var l = (o[avain] = o[avain] || []); if (l.indexOf(arvo) < 0) l.push(arvo); }
  function onAktiivinen(x) { return !(x.arkistoitu === true || x.poistettu === true || x.aktiivinen === false || x.tila === 'arkistoitu' || x.tila === 'poistettu'); }
  /** seurat: [{sid, joukkueet:[{id,nimi}], pelaajat:[{_id,tunniste,…}], kayttajat:[uid]}] → globaalit indeksit (vain muistissa; ei saa päätyä lokiin/auditiin). */
  function tmVIndeksit(seurat) {
    var I = { nimiSeurat: tyhja(), idSeurat: tyhja(), pelaajaSeurat: tyhja(), tunnisteet: tyhja(), uidSeurat: tyhja(), omat: tyhja() };
    arr(seurat).forEach(function (s) {
      var nimet = [], idt = [];
      arr(s.joukkueet).forEach(function (j) { var n = normJoukkue(j.nimi || j.id); nimet.push(n); idt.push(String(j.id)); lisaaSettiin(I.nimiSeurat, n, s.sid); lisaaSettiin(I.idSeurat, String(j.id), s.sid); });
      I.omat[s.sid] = { omatNimet: new Set(nimet), omatIdt: new Set(idt) };
      arr(s.pelaajat).forEach(function (p) {
        (I.pelaajaSeurat[p._id] = I.pelaajaSeurat[p._id] || []).push({ sid: s.sid, aktiivinen: onAktiivinen(p) });
        var t = p.tunniste != null && p.tunniste !== '' ? p.tunniste : (p.palloId != null && p.palloId !== '' ? p.palloId : p.palloID);
        if (t != null && t !== '') lisaaSettiin(I.tunnisteet, String(t), p._id);
      });
      arr(s.kayttajat).forEach(function (u) { lisaaSettiin(I.uidSeurat, String(u), s.sid); });
    });
    return I;
  }
  function rivi(seura, koodi, kokoelma, lkm, kokonais, extra) { var r = { seura: seura, koodi: koodi, kokoelma: kokoelma, lkm: lkm, kokonais: kokonais == null ? null : kokonais }; r.taso = tmVKynnys(koodi, lkm, extra, kokonais); if (extra != null) r.raja = extra; return r; }

  /** Seurakohtaiset tarkistukset. syote: { sid, joukkueet:[{id,nimi}], kokoelmat:{ nimi: [doc+_id] }, kayttajat:Set(uid), indeksit } → rivit (myös lkm 0, jotta "edellinen" säilyy). */
  function tmVTarkistaSeura(syote) {
    var sid = syote.sid, K = syote.kokoelmat || {}, I = syote.indeksit || tmVIndeksit([]), out = [];
    var omatNimet = new Set(arr(syote.joukkueet).map(function (j) { return normJoukkue(j.nimi || j.id); })), omatIdt = new Set(arr(syote.joukkueet).map(function (j) { return String(j.id); }));
    var ctx = { sid: sid, omatNimet: omatNimet, omatIdt: omatIdt, nimiSeurat: I.nimiSeurat, idSeurat: I.idSeurat };
    Object.keys(VIITEKENTAT).forEach(function (kok) {   // E1a / E1b
      var docs = arr(K[kok]), a = 0, b = 0;
      docs.forEach(function (d) {
        var luokat = [];
        VIITEKENTAT[kok].forEach(function (f) { (Array.isArray(d[f]) ? d[f] : [d[f]]).forEach(function (v) { if (v != null && v !== '') luokat.push(tmVJoukkueviite(v, ctx)); }); });
        if (luokat.indexOf('toisen_seuran') >= 0) a++; else if (luokat.indexOf('orpo') >= 0) b++;
      });
      if (K[kok]) { out.push(rivi(sid, 'E1a', kok, a, docs.length)); out.push(rivi(sid, 'E1b', kok, b, docs.length)); }
    });
    SEURAID_KOKOELMAT.forEach(function (kok) {   // E3
      if (K[kok]) out.push(rivi(sid, 'E3', kok, K[kok].filter(function (d) { return d.seuraId != null && String(d.seuraId) !== String(sid); }).length, K[kok].length));
    });
    if (K.pelaajat) {
      out.push(rivi(sid, 'E4', 'pelaajat', K.pelaajat.filter(onOsittainen).length, K.pelaajat.length));
      var orpoja = 0, max = 0, pid = {};
      K.pelaajat.forEach(function (p) { pid[p._id] = 1; var koko = JSON.stringify(p).length; if (koko > max) max = koko; });
      out.push(rivi(sid, 'M1', 'pelaajat', max, K.pelaajat.length, DOC_RAJA_TAVU));
      ORPO_PELAAJAVIITE.forEach(function (kok) { arr(K[kok]).forEach(function (d) { var v = PELAAJA_VIITEKENTAT.map(function (f) { return d[f]; }).filter(function (x) { return x != null && x !== ''; })[0]; if (v != null && !pid[String(v)]) orpoja++; }); });
      out.push(rivi(sid, 'M2', 'pelaajat', orpoja, null));
    }
    if (K.seuranta_kuittaukset) {   // E5
      var toinen = 0, ei = 0, own = syote.kayttajat || new Set();
      K.seuranta_kuittaukset.forEach(function (k) { if (!k.valmentaja_uid || own.has(String(k.valmentaja_uid))) return; if (onMuussa(haeSetti(I.uidSeurat, String(k.valmentaja_uid)), sid)) toinen++; else ei++; });
      out.push(rivi(sid, 'E5', 'seuranta_kuittaukset', toinen, K.seuranta_kuittaukset.length)); out.push(rivi(sid, 'E5b', 'seuranta_kuittaukset', ei, K.seuranta_kuittaukset.length));
    }
    if (K.toimenpiteet) {   // K1 / K2: avoimet ehdotukset
      var ryhmat = {}, yht = 0;
      K.toimenpiteet.forEach(function (t) { if (t.tila !== 'ehdotus') return; yht++; var n = normJoukkue(t.joukkue); ryhmat[n] = (ryhmat[n] || 0) + 1; });
      out.push(rivi(sid, 'K1', 'toimenpiteet', Object.keys(ryhmat).reduce(function (a, k) { return Math.max(a, ryhmat[k]); }, 0), yht));
      out.push(rivi(sid, 'K2', 'toimenpiteet', yht, null, 50));
    }
    return out;
  }
  /** K3-syöte: kokoelmien kokonaismäärät seurassa (tallennetaan raporttiin; vertailu edelliseen ajoon tmVKasvuTaso:lla). */
  function tmVKasvuLuvut(K) { var o = {}; ['toimenpiteet', 'seuranta_kuittaukset'].forEach(function (k) { if (K && K[k]) o[k] = K[k].length; }); if (K && K.viestit) o.viestit_klippi = K.viestit.filter(function (v) { return String(v.tyyppi || '').indexOf('klippi') === 0; }).length; return o; }

  /** Seurojen väliset tarkistukset (E2, E6) + audit-estot (E7). auditRivit: [{toiminto, aikaleimaMs, seuraId}] → rivit per seura. */
  function tmVTarkistaGlobaali(indeksit, auditRivit, nytMs) {
    var I = indeksit, e2 = {}, e2b = {}, e6 = {}, e7 = {}, sidit = {};
    Object.keys(I.omat).forEach(function (s) { sidit[s] = 1; });
    Object.keys(I.pelaajaSeurat).forEach(function (pid) {
      var kopiot = I.pelaajaSeurat[pid]; if (kopiot.length < 2) return;
      var aktiiviset = kopiot.filter(function (k) { return k.aktiivinen; });
      kopiot.forEach(function (k) { var virhe = aktiiviset.length >= 2 && k.aktiivinen; var o = virhe ? e2 : e2b; o[k.sid] = (o[k.sid] || 0) + 1; });
    });
    var tormaavat = {};
    Object.keys(I.tunnisteet).forEach(function (t) { if (I.tunnisteet[t].length > 1) I.tunnisteet[t].forEach(function (pid) { tormaavat[pid] = 1; }); });
    Object.keys(I.pelaajaSeurat).forEach(function (pid) { if (!tormaavat[pid]) return; I.pelaajaSeurat[pid].forEach(function (k) { e6[k.sid] = (e6[k.sid] || 0) + 1; }); });
    arr(auditRivit).forEach(function (r) { if (AUDIT_ESTOT.indexOf(r.toiminto) >= 0 && r.seuraId && nytMs - r.aikaleimaMs <= VIIKKO_MS && nytMs - r.aikaleimaMs >= 0) e7[r.seuraId] = (e7[r.seuraId] || 0) + 1; });
    var out = [];
    Object.keys(sidit).sort().forEach(function (s) {
      out.push(rivi(s, 'E2', 'pelaajat', e2[s] || 0)); out.push(rivi(s, 'E2b', 'pelaajat', e2b[s] || 0)); out.push(rivi(s, 'E6', 'pelaajat', e6[s] || 0)); out.push(rivi(s, 'E7', 'audit', e7[s] || 0));
    });
    return out;
  }

  var API = { OHITETUT_SEURAT: OHITETUT_SEURAT, VIITEKENTAT: VIITEKENTAT, SEURAID_KOKOELMAT: SEURAID_KOKOELMAT, MITTARIT: MITTARIT, PELAAJAMITTARIT: PELAAJAMITTARIT, KYNNYS: KYNNYS, OSUUSKYNNYS: OSUUSKYNNYS,
    ohitetaanko: ohitetaanko, normJoukkue: normJoukkue, onVieras: onVieras, onNimi: onNimi, onSyntyma: onSyntyma, onOsittainen: onOsittainen, onAktiivinen: onAktiivinen, vieraatViitteet: vieraatViitteet,
    onToisenSeuranNimi: onToisenSeuranNimi, kuittausVieras: kuittausVieras, ryhmaYhteenveto: ryhmaYhteenveto, ikkunanAlku: ikkunanAlku, mittarinEhto: mittarinEhto, mittarinNimi: mittarinNimi,
    tmVTila: tmVTila, tmVJoukkueviite: tmVJoukkueviite, tmVKynnys: tmVKynnys, tmVKasvuTaso: tmVKasvuTaso, tmVKasvuLuvut: tmVKasvuLuvut, tmVIndeksit: tmVIndeksit, tmVTarkistaSeura: tmVTarkistaSeura, tmVTarkistaGlobaali: tmVTarkistaGlobaali };
  if (typeof module !== 'undefined' && module.exports) module.exports = API; else root.TM_VALVONTA = API;
})(typeof window !== 'undefined' ? window : this);
