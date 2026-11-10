/* ════════════════════════════════════════════════════════════════════════
   tm_valvonta.js — Projekti 07 / PR 1: seurojen erottelun valvonnan PUHDAS ydin (ei Firebasea, ei I/O:ta, ei DOMia, ei kirjoituskutsuja).
   Päätökset: .briefit/projektit/07-erottelun-valvonta/VAIHE0.md (P1–P13). Syöte on dokumenttilistat; I/O-kuoret (scripts/, functions/valvonta.js) hakevat ne.
   Jaettu functions/-kansioon (functions/jaettu_lib.json). Raportointi, PII-vartija ja sähköposti: tm_valvonta_raportti.js. Kenttäinventaario: docs/VALVONTA_KENTTAINVENTAARIO.md.
   LUOKITTELU    · tmVJoukkueviite(viite, ctx) → 'tyhja'|'oma'|'toisen_seuran'|'orpo'   ctx { sid, omatNimet:Set, omatIdt:Set, nimiSeurat, idSeurat }
   TARKISTUKSET  · tmVTarkistaSeura(syote) → [{seura,koodi,kokoelma,lkm,kokonais,taso}]   · tmVTarkistaGlobaali(indeksit, auditRivit, nytMs)   · tmVIndeksit(seurat)
   KYNNYS        · tmVKynnys(koodi, luku, raja?, kokonais?) → 'ok'|'varoitus'|'virhe'   · tmVKasvuTaso(nyt, edellinen, ennen)   · tmVTila(maara, raja)
   MITTARIT      · MITTARIT / PELAAJAMITTARIT (deklaratiivinen H1/H2-lista {nimi,tyyppi,kokoelma,ehto,raja}) — diag_hiljaiset_rajat.js ajaa ne
   Koodit: E1a toisen seuran joukkue · E1b orpo joukkue · E1c orpo joukkue, joka on oman joukkueen kirjoitusasu (varoitus; aliaslista tekee siitä ok) · E2 sama pelaaja-id usealla seuralla (aktiivinen/arkistoitu E2b) · E3 seuraId≠polku · E4 osittainen pelaajadoc · E5 kuittauksen uid (toisen seuran / E5b ei missään)
           E6 PalloID-törmäys · E7 audit-estot 7 pv · H1 hiljainen raja · K1 avoimia ehdotuksia/joukkue (K2 poistui PR 2b:ssä: VP:n avoimet ehdotukset eivät ole enää rajattuja, #1242) · K3 kasvu · M1 dokumenttikoko · M2 orpo pelaajaviite
           F1 KENTTÄVAHTI (PR 2): kokoelmassa on dokumentteja, mutta alle 50 %:lla on yhtään oletetuista joukkuekentistä → VAROITUS (ei hiljaista nollaa; E1 voisi muuten näyttää 0, vaikka kenttä on arvattu väärin) */
(function (root) {
  'use strict';
  var OHITETUT_SEURAT = ['demo', 'demo-fc', 'qg_savu'];   // P10: synteettinen data; uusi demo-seura lisätään tähän PR:llä
  var DOC_RAJA_TAVU = 1048576, AUDIT_ESTOT = ['kayttaja_toisen_seuran_estetty', 'kayttaja_rooli_estetty'], VIIKKO_MS = 7 * 86400000;
  /* Joukkueviitekentät kokoelmittain (VAIHE0 §1.1 E1; inventaario PR 1: pelaajat/toimenpiteet koodista, muut joukkue*-perhe, vahvistetaan PR 2:n ajossa) */
  /* PR 2b (baseline 10.11.): viestit/mentoroinnit → joukkueId · kooste_joukkue → dokumentin id ('_id' = {joukkueId}_{vvvv-Www}) · seuranta_kuittaukset pois (E5 kattaa) · pelaajat + joukkueetNimet */
  var VIITEKENTAT = { toimenpiteet: ['joukkue'], pelaajat: ['joukkue', 'joukkueNimi', 'joukkueId', 'joukkueet', 'joukkueetNimet'], kalenteri: ['joukkue', 'joukkue_nimi', 'joukkueet'], viestit: ['joukkueId'],
    kooste_joukkue: ['_id'], havainnot: ['joukkue'], harjoitusarvioinnit: ['joukkue'], mentoroinnit: ['joukkueId'] };
  /* Toissijaiset kentät = näyttönimi, jota luetaan vain jos dokumentissa ei ole yhtään ensisijaista viitettä (kalenterin joukkue_nimi on luontihetken näyttönimi: vanhentuu nimenmuutoksessa ja usean joukkueen tapahtumassa se on "A · B") */
  var TOISSIJAISET = { kalenteri: ['joukkue_nimi'] }, KOOSTE_VK_RE = /_\d{4}-W\d{1,2}$/;
  /** F1:n populaatio: mitkä dokumentit ODOTETAAN sisältävän joukkueviite. Kalenterissa vain harjoitukset ja ottelut (JOUKKUEPAKKO, lib/tm_ryhmat.js); seuratason, ryhmä-, pelaaja- ja henkilökuntatapahtumat ilman joukkuetta ovat sallittuja. */
  var F1_POPULAATIO = { kalenteri: function (d) { var t = String(d.tyyppi == null ? '' : d.tyyppi).trim().toLowerCase(), k = d.kohde && d.kohde.tyyppi; return (t === 'harjoitus' || t === 'ottelu') && d.alalaji !== 'aamutreeni' && k !== 'ryhma' && k !== 'pelaajat' && k !== 'henkilokunta'; } };
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
    if (ctx.aliakset && ctx.aliakset.indexOf(n) >= 0) return 'oma';   // seurakohtainen aliaslista (functions/valvonta_aliakset.json)
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
    E1a: [null, 1], E1b: [1, null], E1c: [1, null], E2: [null, 1], E2b: [1, null], E3: [null, 1], E4: [1, null], E5: [null, 1], E5b: [1, null], E6: [null, 1], E7: [1, null], K1: [7, 12], M2: [1, null] };
  var OSUUSKYNNYS = { H1: [0.7, 1], M1: [0.7, 0.9] };   // luku/raja → [varoitus, virhe]
  var KENTTAVAHTI_RAJA = 50;   // F1: alle 50 % dokumenteista sisältää oletetun joukkuekentän → varoitus
  var E1B_MASSA = 0.1;   // E1b: yli 10 % seuran dokumenteista kokoelmassa → virhe
  /** luku (+ raja osuuskynnyksille, + kokonais E1b-massavirheelle) → 'ok'|'varoitus'|'virhe'. Tuntematon koodi → virhe (ei hiljaa ok). */
  function tmVKynnys(koodi, luku, raja, kokonais) {
    if (OSUUSKYNNYS[koodi]) { if (typeof raja !== 'number' || raja <= 0) return 'virhe'; var o = OSUUSKYNNYS[koodi], l = luku * 100; return l >= raja * o[1] * 100 - 1e-9 ? 'virhe' : (l >= raja * o[0] * 100 - 1e-9 ? 'varoitus' : 'ok'); }
    if (koodi === 'F1') return luku < KENTTAVAHTI_RAJA ? 'varoitus' : 'ok';   // luku = osuus-% dokumenteista, joilla on oletettu kenttä
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

  /** Dokumentin joukkueviitteet: { p: ensisijaiset, t: toissijaiset (näyttönimet; kalenterin ' · '-erotettu nimi pilkotaan) }. Tyhjät arvot pois. */
  function viitteet(kok, d) {
    var p = [], t = [], toiss = TOISSIJAISET[kok] || [];
    if (kok === 'kooste_joukkue') { var j = String(d._id == null ? '' : d._id).replace(KOOSTE_VK_RE, ''); if (j) p.push(j); return { p: p, t: t }; }
    (VIITEKENTAT[kok] || []).forEach(function (f) {
      (Array.isArray(d[f]) ? d[f] : [d[f]]).forEach(function (v) {
        if (v == null || v === '') return;
        if (toiss.indexOf(f) >= 0) String(v).split(' · ').forEach(function (x) { if (x.trim()) t.push(x.trim()); }); else p.push(v);
      });
    });
    return { p: p, t: t };
  }
  function viiteluokat(kok, d, ctx) {
    var v = viitteet(kok, d);
    return (v.p.length ? v.p : v.t).map(function (x) { var l = tmVJoukkueviite(x, ctx); return l === 'orpo' && ctx.omatAvaimet && ctx.omatAvaimet.indexOf(nimiAvain(x)) >= 0 && nimiAvain(x) ? 'kirjoitusasu' : l; });   // kirjoitusasu = sama joukkue kirjoitettuna eri tavalla (E1c, varoitus)
  }
  function omatAvaimet(joukkueet) { var a = []; arr(joukkueet).forEach(function (j) { a.push(nimiAvain(j.nimi || j.id), nimiAvain(j.id)); }); return a.filter(Boolean); }
  function nimiIdKartta(joukkueet) { var k = tyhja(); arr(joukkueet).forEach(function (j) { k[normJoukkue(j.nimi || j.id)] = String(j.id); }); return k; }
  /** K1-ryhmän avain: oman joukkueen id ja nimi (myös kirjoitusasuvariantti) ovat sama ryhmä; muut normalisoituna merkkijonona. */
  function k1Avain(v, ctx) {
    var n = normJoukkue(v), id = ctx.omatIdt.has(String(v)) ? String(v) : (ctx.nimiId[n] || null);
    if (!id && ctx.omatAvaimet.indexOf(nimiAvain(v)) >= 0 && nimiAvain(v)) { arr(ctx.joukkueetLista).forEach(function (j) { if (nimiAvain(j.nimi || j.id) === nimiAvain(v) || nimiAvain(j.id) === nimiAvain(v)) id = String(j.id); }); }
    return id ? 'id:' + id : n;
  }
  /** Seurakohtaiset tarkistukset. syote: { sid, joukkueet:[{id,nimi}], kokoelmat:{ nimi: [doc+_id] }, kayttajat:Set(uid), indeksit } → rivit (myös lkm 0, jotta "edellinen" säilyy). */
  function tmVTarkistaSeura(syote) {
    var sid = syote.sid, K = syote.kokoelmat || {}, I = syote.indeksit || tmVIndeksit([]), out = [];
    var omatNimet = new Set(arr(syote.joukkueet).map(function (j) { return normJoukkue(j.nimi || j.id); })), omatIdt = new Set(arr(syote.joukkueet).map(function (j) { return String(j.id); }));
    var ctx = { sid: sid, omatNimet: omatNimet, omatIdt: omatIdt, nimiSeurat: I.nimiSeurat, idSeurat: I.idSeurat, aliakset: tmVAliakset(syote.aliasRivit, sid, syote.joukkueet), omatAvaimet: omatAvaimet(syote.joukkueet), nimiId: nimiIdKartta(syote.joukkueet), joukkueetLista: arr(syote.joukkueet) };
    Object.keys(VIITEKENTAT).forEach(function (kok) {   // E1a / E1b
      var docs = arr(K[kok]), a = 0, b = 0, c = 0;
      docs.forEach(function (d) {
        if (kok === 'toimenpiteet' && d.tila === 'korvattu') return;   // korvattu ehdotus on historiaa, ei elävä viite
        var luokat = viiteluokat(kok, d, ctx);
        if (luokat.indexOf('toisen_seuran') >= 0) a++; else if (luokat.indexOf('orpo') >= 0) b++; else if (luokat.indexOf('kirjoitusasu') >= 0) c++;
      });
      if (K[kok]) { out.push(rivi(sid, 'E1a', kok, a, docs.length)); out.push(rivi(sid, 'E1b', kok, b, docs.length)); out.push(rivi(sid, 'E1c', kok, c, docs.length)); }
      var f1 = tmVKenttavahti(sid, kok, docs); if (f1) out.push(f1);
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
    if (K.toimenpiteet) {   // K1: avoimet ehdotukset joukkueittain
      var ryhmat = {}, yht = 0;
      K.toimenpiteet.forEach(function (t) { if (t.tila !== 'ehdotus') return; yht++; var n = k1Avain(t.joukkue, ctx); ryhmat[n] = (ryhmat[n] || 0) + 1; });
      out.push(rivi(sid, 'K1', 'toimenpiteet', Object.keys(ryhmat).reduce(function (a, k) { return Math.max(a, ryhmat[k]); }, 0), yht));
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

  /* ── F1 kenttävahti (PR 2) ── */
  function kentallinen(v) { return v != null && v !== '' && !(Array.isArray(v) && !v.length); }
  /** Kokoelman dokumenteista kuinka suurella osalla on vähintään yksi oletetuista joukkuekentistä. Tyhjä kokoelma → null (ei dataa, ei vartioitavaa).
   *  Rivi: { koodi:'F1', lkm: dokumentit ILMAN kenttää, kokonais, osuus (% , 1 desimaali), kentat: {kentta: %}, taso }. Vain luvut ja kenttien NIMET (ei arvoja). */
  function tmVKenttavahti(sid, kok, docs, kentat) {
    docs = arr(docs); if (F1_POPULAATIO[kok]) docs = docs.filter(F1_POPULAATIO[kok]);
    var n = docs.length; if (!n) return null;
    var ks = kentat || VIITEKENTAT[kok] || [], per = {}, yht = 0, pros = function (x) { return Math.round(x * 1000 / n) / 10; };
    ks.forEach(function (f) { per[f] = 0; });
    docs.forEach(function (d) { var on = false; ks.forEach(function (f) { if (kentallinen(d[f])) { per[f]++; on = true; } }); if (on) yht++; });
    var kentatPros = {}; ks.forEach(function (f) { kentatPros[f] = pros(per[f]); });
    return { seura: sid, koodi: 'F1', kokoelma: kok, lkm: n - yht, kokonais: n, osuus: pros(yht), kentat: kentatPros, taso: tmVKynnys('F1', yht * 100 / n) };
  }
  var JOUKKUEKENTTA_RE = /joukkue|team/i, KENTTANIMI_RE = /^[A-Za-z0-9_]{1,40}$/;
  /** Löytää dokumenttien ylätason kentät, joiden nimi viittaa joukkueeseen → { kentta: % dokumenteista, joilla arvo }. Vain kenttien nimet (turvalliseen muotoon rajattuina), ei arvoja. */
  function tmVJoukkuekentat(docs) {
    var n = arr(docs).length, lask = {}, ulos = {}; if (!n) return ulos;
    docs.forEach(function (d) { Object.keys(d || {}).forEach(function (k) { if (KENTTANIMI_RE.test(k) && JOUKKUEKENTTA_RE.test(k) && kentallinen(d[k])) lask[k] = (lask[k] || 0) + 1; }); });
    Object.keys(lask).sort().forEach(function (k) { ulos[k] = Math.round(lask[k] * 1000 / n) / 10; });
    return ulos;
  }

  /* ── Diagnostiikka (PR 2b; vain luku, vain lukumäärät): E6-törmäysten ja orpojen viitteiden LUONNE ilman nimiä tai arvoja ── */
  function nimiAvain(x) { return String(x == null ? '' : x).toLowerCase().replace(/[^a-z0-9äöå]/g, ''); }
  function tunnisteMuoto(t) { t = String(t); return /^\d+$/.test(t) ? (t.length === 8 ? 'numeerinen_8' : 'numeerinen_muu') : 'muu'; }
  function onTestiarvo(t) { t = String(t); return /^(\d)\1+$/.test(t) || '12345678 1234567 123456 12345 1234 87654321 01234567'.split(' ').indexOf(t) >= 0 || /test|demo|xxx/i.test(t); }
  /** seurat (aineisto) + testinimet (§10, vain muistissa vertailuun) + testiIdt → ryhmät, joissa sama tunniste on ≥ 2 eri pelaajadokumentilla. Ryhmä: { koko, seurat:{sid:n}, sisaSeura, testipelaajia, arkistoituja, testiarvo, muoto, samaNimi }. Ei nimiä, ei tunnisteita. */
  function tmVE6Luonne(seurat, testinimet, testiIdt) {
    var kartta = tyhja(), tn = arr(testinimet).map(nimiAvain), ti = arr(testiIdt).map(String), ulos = [];
    arr(seurat).forEach(function (s) {
      arr((s.kokoelmat || {}).pelaajat).forEach(function (p) {
        var t = p.tunniste != null && p.tunniste !== '' ? p.tunniste : (p.palloId != null && p.palloId !== '' ? p.palloId : p.palloID); if (t == null || t === '') return;
        var nimi = nimiAvain(p.nimi || ((p.etunimi || '') + ' ' + (p.sukunimi || '')));
        (kartta[String(t)] = kartta[String(t)] || []).push({ sid: s.sid, pid: String(p._id), aktiivinen: onAktiivinen(p), testi: (nimi && tn.indexOf(nimi) >= 0) || ti.indexOf(String(p._id)) >= 0, nimi: nimi });
      });
    });
    Object.keys(kartta).sort().forEach(function (t) {
      var m = kartta[t], pidit = []; m.forEach(function (x) { if (pidit.indexOf(x.pid) < 0) pidit.push(x.pid); });
      if (pidit.length < 2) return;
      var seurat2 = {}, sisa = false; m.forEach(function (x) { seurat2[x.sid] = (seurat2[x.sid] || 0) + 1; if (seurat2[x.sid] > 1) sisa = true; });
      ulos.push({ koko: m.length, seurat: seurat2, sisaSeura: sisa, testipelaajia: m.filter(function (x) { return x.testi; }).length, arkistoituja: m.filter(function (x) { return !x.aktiivinen; }).length,
        testiarvo: onTestiarvo(t), muoto: tunnisteMuoto(t), samaNimi: !!m[0].nimi && m.every(function (x) { return x.nimi === m[0].nimi; }) });
    });
    return ulos;
  }
  /** SISÄINEN (vain paikallisiin diagnostiikkaskripteihin, ei raportteihin): samaa tunnistetta käyttävät pelaajadokumentit jäseninä { sid, pid, nimi (normalisoitu), aktiivinen }. */
  function tmVE6Jasenet(seurat) {
    var kartta = tyhja(), ulos = [];
    arr(seurat).forEach(function (s) { arr((s.kokoelmat || {}).pelaajat).forEach(function (p) {
      var t = p.tunniste != null && p.tunniste !== '' ? p.tunniste : (p.palloId != null && p.palloId !== '' ? p.palloId : p.palloID); if (t == null || t === '') return;
      (kartta[String(t)] = kartta[String(t)] || []).push({ sid: s.sid, pid: String(p._id), nimi: nimiAvain(p.nimi || ((p.etunimi || '') + ' ' + (p.sukunimi || ''))), aktiivinen: onAktiivinen(p) });
    }); });
    Object.keys(kartta).sort().forEach(function (t) { var m = kartta[t], pidit = []; m.forEach(function (x) { if (pidit.indexOf(x.pid) < 0) pidit.push(x.pid); }); if (pidit.length >= 2) ulos.push({ tunniste: t, jasenet: m }); });
    return ulos;
  }
  var AVAINSANAT = ['kokoseura', 'koko', 'kaikki', 'seura', 'all', 'muu', 'henkilokunta', 'valmennus', 'valmentajat'];
  /** Orpojen viitteiden (E1b) luonne seurassa: { seura, kokoelma, orpoja, luokat:{kirjoitusasu, osittainen, avainsana, id_muotoinen, muu} } (dokumentteja per luokka). Ei arvoja. */
  function tmVOrpojenLuonne(sid, kok, docs, joukkueet, indeksit, aliasRivit) {
    var I = indeksit || tmVIndeksit([]), omat = arr(joukkueet), omatAvaimet = [];
    omat.forEach(function (j) { omatAvaimet.push(nimiAvain(j.nimi || j.id), nimiAvain(j.id)); });
    var ctx = { sid: sid, omatNimet: new Set(omat.map(function (j) { return normJoukkue(j.nimi || j.id); })), omatIdt: new Set(omat.map(function (j) { return String(j.id); })), nimiSeurat: I.nimiSeurat, idSeurat: I.idSeurat, aliakset: tmVAliakset(aliasRivit, sid, joukkueet) };
    var luokat = { kirjoitusasu: 0, osittainen: 0, avainsana: 0, id_muotoinen: 0, muu: 0 }, orpoja = 0;
    arr(docs).forEach(function (d) {
      if (kok === 'toimenpiteet' && d.tila === 'korvattu') return;
      var v = viitteet(kok, d), lista = v.p.length ? v.p : v.t, orpo = lista.filter(function (x) { return tmVJoukkueviite(x, ctx) === 'orpo'; });
      if (!orpo.length || lista.some(function (x) { return tmVJoukkueviite(x, ctx) === 'toisen_seuran'; })) return;
      orpoja++; var x = String(orpo[0]), a = nimiAvain(x), luokka;
      if (a && omatAvaimet.indexOf(a) >= 0) luokka = 'kirjoitusasu';
      else if (a.length >= 3 && omatAvaimet.some(function (o) { return o.length >= 3 && (o.indexOf(a) >= 0 || a.indexOf(o) >= 0); })) luokka = 'osittainen';
      else if (AVAINSANAT.indexOf(a) >= 0) luokka = 'avainsana';
      else if (/^[a-z0-9]+(_[a-z0-9]+)+$/.test(x)) luokka = 'id_muotoinen';
      else luokka = 'muu';
      luokat[luokka]++;
    });
    return { seura: sid, kokoelma: kok, orpoja: orpoja, luokat: luokat };
  }

  /* ── Aliaslista (PR 2c): seurakohtainen { seura, alias, joukkue (joukkueen id), perustelu, paiva }; aliaksella löytyvä viite on 'oma'. Kasvaa vain PR:llä, jonka PM hyväksyy. ── */
  /** Lista → virheilmoitukset (tyhjä = kelvollinen). Alias: 1–80 merkkiä, ei sähköpostia; joukkue: id; perustelu ≥ 10 merkkiä; paiva YYYY-MM-DD; ei kaksoiskappaleita (seura + normalisoitu alias). */
  function tmVAliasVirheet(rivit) {
    var virheet = [], nahty = {};
    arr(rivit).forEach(function (r, i) {
      var p = 'rivi ' + (i + 1) + ': ';
      if (!r || typeof r !== 'object') { virheet.push(p + 'ei olio'); return; }
      if (!/^[a-z0-9_-]{1,40}$/.test(String(r.seura))) virheet.push(p + 'seura');
      if (typeof r.alias !== 'string' || !r.alias.trim() || r.alias.length > 80 || r.alias.indexOf('@') >= 0) virheet.push(p + 'alias');
      if (typeof r.joukkue !== 'string' || !/^[A-Za-z0-9_-]{1,80}$/.test(r.joukkue)) virheet.push(p + 'joukkue');
      if (typeof r.perustelu !== 'string' || r.perustelu.trim().length < 10) virheet.push(p + 'perustelu puuttuu');
      if (!/^\d{4}-\d{2}-\d{2}$/.test(String(r.paiva)) || isNaN(Date.parse(r.paiva))) virheet.push(p + 'paiva');
      var a = r.seura + '|' + normJoukkue(r.alias); if (nahty[a]) virheet.push(p + 'kaksoiskappale'); nahty[a] = 1;
    });
    return virheet;
  }
  /** Seuran voimassa olevat aliakset (normJoukkue-muodossa): vain ne, joiden kohdejoukkue on olemassa seurassa (poistetun joukkueen alias ei piilota orpoa). */
  function tmVAliakset(rivit, sid, joukkueet) {
    var idt = arr(joukkueet).map(function (j) { return String(j.id); });
    return arr(rivit).filter(function (r) { return r && r.seura === sid && idt.indexOf(String(r.joukkue)) >= 0; }).map(function (r) { return normJoukkue(r.alias); });
  }

  /* ── Sallittujen lista (P11): { seura, koodi, kokoelma, enimmaismaara, perustelu, paiva }; lista kasvaa vain PR:llä, jonka PM hyväksyy ── */
  var SALLITTU_SEURA_RE = /^[a-z0-9_-]{1,40}$/, SALLITTU_KOODI_RE = /^[EFHKM]\d[a-c]?$/, SALLITTU_KOK_RE = /^[a-z_]{1,40}$/;
  /** Lista → virheilmoitukset (tyhjä taulukko = kelvollinen). Jokaisella rivillä pitää olla perustelu (≥ 10 merkkiä) ja päivä (YYYY-MM-DD). */
  function tmVSallitutVirheet(rivit) {
    var virheet = [], nahty = {};
    arr(rivit).forEach(function (r, i) {
      var p = 'rivi ' + (i + 1) + ': ';
      if (!r || typeof r !== 'object') { virheet.push(p + 'ei olio'); return; }
      if (!SALLITTU_SEURA_RE.test(String(r.seura))) virheet.push(p + 'seura');
      if (!SALLITTU_KOODI_RE.test(String(r.koodi))) virheet.push(p + 'koodi');
      if (!SALLITTU_KOK_RE.test(String(r.kokoelma))) virheet.push(p + 'kokoelma');
      if (!(Number.isInteger(r.enimmaismaara) && r.enimmaismaara >= 0)) virheet.push(p + 'enimmaismaara');
      if (typeof r.perustelu !== 'string' || r.perustelu.trim().length < 10) virheet.push(p + 'perustelu puuttuu');
      if (!/^\d{4}-\d{2}-\d{2}$/.test(String(r.paiva)) || isNaN(Date.parse(r.paiva))) virheet.push(p + 'paiva');
      var a = r.seura + '|' + r.koodi + '|' + r.kokoelma; if (nahty[a]) virheet.push(p + 'kaksoiskappale'); nahty[a] = 1;
    });
    return virheet;
  }
  /** Tulokset + sallitut → tulokset, joissa sallitun enimmäismäärän sisällä oleva rivi on taso 'ok' (sallittu:true). Enimmäismäärän ylitys pysyy alkuperäisellä tasolla (ylittaaSallitun:true). */
  function tmVSovellaSallitut(tulokset, rivit) {
    var kartta = {}; arr(rivit).forEach(function (r) { kartta[r.seura + '|' + r.koodi + '|' + r.kokoelma] = r.enimmaismaara; });
    return arr(tulokset).map(function (t) {
      var max = kartta[t.seura + '|' + t.koodi + '|' + t.kokoelma]; if (max == null || !(t.lkm > 0)) return t;
      return t.lkm <= max ? Object.assign({}, t, { taso: 'ok', sallittu: true, sallittuMax: max }) : Object.assign({}, t, { ylittaaSallitun: true, sallittuMax: max });
    });
  }

  /** Koko ajo puhtaana: aineisto (reader) → tulokset. seurat: [{sid, joukkueet, kayttajat:[uid], kokoelmat:{…docs}}]. Ohitetut seurat (P10) ovat mukana indeksissä
   *  (toisen seuran saastuminen demosta näkyy), mutta niitä ei tarkisteta eikä raportoida. */
  function tmVAjaKaikki(syote) {
    var seurat = arr(syote.seurat), ohi = syote.ohitetut || OHITETUT_SEURAT;
    var I = tmVIndeksit(seurat.map(function (s) { return { sid: s.sid, joukkueet: s.joukkueet, pelaajat: (s.kokoelmat || {}).pelaajat, kayttajat: s.kayttajat }; }));
    var out = [];
    seurat.forEach(function (s) { if (ohi.indexOf(s.sid) < 0) out = out.concat(tmVTarkistaSeura({ sid: s.sid, joukkueet: s.joukkueet, kokoelmat: s.kokoelmat, kayttajat: new Set(arr(s.kayttajat)), indeksit: I, aliasRivit: syote.aliakset })); });
    out = out.concat(tmVTarkistaGlobaali(I, syote.auditRivit, syote.nytMs).filter(function (r) { return ohi.indexOf(r.seura) < 0; }));
    return syote.sallitut ? tmVSovellaSallitut(out, syote.sallitut) : out;
  }

  var API = { OHITETUT_SEURAT: OHITETUT_SEURAT, VIITEKENTAT: VIITEKENTAT, SEURAID_KOKOELMAT: SEURAID_KOKOELMAT, MITTARIT: MITTARIT, PELAAJAMITTARIT: PELAAJAMITTARIT, KYNNYS: KYNNYS, OSUUSKYNNYS: OSUUSKYNNYS,
    ohitetaanko: ohitetaanko, normJoukkue: normJoukkue, onVieras: onVieras, onNimi: onNimi, onSyntyma: onSyntyma, onOsittainen: onOsittainen, onAktiivinen: onAktiivinen, vieraatViitteet: vieraatViitteet,
    onToisenSeuranNimi: onToisenSeuranNimi, kuittausVieras: kuittausVieras, ryhmaYhteenveto: ryhmaYhteenveto, ikkunanAlku: ikkunanAlku, mittarinEhto: mittarinEhto, mittarinNimi: mittarinNimi,
    tmVTila: tmVTila, tmVJoukkueviite: tmVJoukkueviite, tmVKynnys: tmVKynnys, tmVKasvuTaso: tmVKasvuTaso, tmVKasvuLuvut: tmVKasvuLuvut, tmVIndeksit: tmVIndeksit, tmVTarkistaSeura: tmVTarkistaSeura, tmVTarkistaGlobaali: tmVTarkistaGlobaali,
    tmVKenttavahti: tmVKenttavahti, F1_POPULAATIO: F1_POPULAATIO, tmVE6Luonne: tmVE6Luonne, tmVE6Jasenet: tmVE6Jasenet, tmVOnTestiarvo: onTestiarvo, tmVAliasVirheet: tmVAliasVirheet, tmVAliakset: tmVAliakset, nimiAvain: nimiAvain, tmVOrpojenLuonne: tmVOrpojenLuonne, viitteet: viitteet, tmVJoukkuekentat: tmVJoukkuekentat, tmVSallitutVirheet: tmVSallitutVirheet, tmVSovellaSallitut: tmVSovellaSallitut, tmVAjaKaikki: tmVAjaKaikki, KENTTAVAHTI_RAJA: KENTTAVAHTI_RAJA };
  if (typeof module !== 'undefined' && module.exports) module.exports = API; else root.TM_VALVONTA = API;
})(typeof window !== 'undefined' ? window : this);
