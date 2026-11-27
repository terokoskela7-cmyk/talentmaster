/* ════════════════════════════════════════════════════════════════════════
   tm_valvonta_raportti.js — Projekti 07 / PR 1: valvonnan raportti, audit-rivi, virhesähköposti ja PII-vartija. PURE (ei I/O:ta, ei kirjoituskutsuja).
   P4/VAIHE0 §3.3: hälytys saa sisältää VAIN seuran id:n, tarkistuskoodin, kokoelman nimen ja lukumäärät. Ei koskaan nimeä, pelaaja-id:tä, uid:ta, sähköpostia, joukkueen nimeä,
   dokumentin id:tä tai tekstikenttää. Rivi, joka ei täytä muotoa, pudotetaan (ei koskaan kirjata sellaisenaan) ja lasketaan `hylatty`-lukuun.
   · tmVRaportti({ tulokset, ajettu, tyyppi, edellinen, ohitetut, eiEhtinyt }) → raportti { ajettu, tyyppi, rivit:[{seura,koodi,kokoelma,lkm,edellinen,taso,muutos}], yhteenveto }
   · tmVAuditRivi(raportti)  → audit-dokumentti (toiminto 'valvonta_ajo', severity info|warn|alert)   · tmVSahkoposti(raportti, opts) → { subject, html } | null (vain virheistä)
   · tmVOnkoPii(kohde, kielletyt) → { ok, rikkomukset:[{tyyppi}] }  (rikkomus ei koskaan sisällä löydettyä arvoa)   · tmVTurvallinenVirhe(e) → { koodi }   · tmVRiviTeksti(r) */
(function (root) {
  'use strict';
  var SEURA_RE = /^[a-z0-9_-]{1,40}$/, KOODI_RE = /^[EFHKM]\d[a-c]?$/, KOKOELMA_RE = /^[a-z_]{1,40}$/, TASOT = ['ok', 'varoitus', 'virhe'];
  var SEVERITY = { ok: 'info', varoitus: 'warn', virhe: 'alert' }, JARJESTYS = { ok: 0, varoitus: 1, virhe: 2 };
  function arr(v) { return Array.isArray(v) ? v : []; }
  function avain(r) { return r.seura + '|' + r.koodi + '|' + r.kokoelma; }
  function esc(s) { return String(s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;'); }
  function rivinKelpaa(r) {
    return !!r && SEURA_RE.test(String(r.seura)) && KOODI_RE.test(String(r.koodi)) && KOKOELMA_RE.test(String(r.kokoelma)) && TASOT.indexOf(r.taso) >= 0 && typeof r.lkm === 'number' && isFinite(r.lkm) && r.lkm >= 0;
  }
  /** Rivit edelliseen ajoon verrattuna: edellinen lkm (0 jos ei ollut) ja muutos 'uusi'|'kasvanut'|'sama'|'pienentynyt'. */
  function tmVVertaaEdelliseen(rivit, edelliset) {
    var ed = {}; arr(edelliset).forEach(function (r) { ed[avain(r)] = r.lkm; });
    return arr(rivit).map(function (r) {
      var e = Object.prototype.hasOwnProperty.call(ed, avain(r)) ? ed[avain(r)] : 0;
      return Object.assign({}, r, { edellinen: e, muutos: r.lkm > e ? (e === 0 ? 'uusi' : 'kasvanut') : (r.lkm === e ? 'sama' : 'pienentynyt') });
    });
  }
  /** Raportti: vain rivit, joissa on jotain kerrottavaa (lkm > 0 tai edellinen > 0, tai taso ≠ ok). Ohitetut seurat pudotetaan. */
  function tmVRaportti(o) {
    var ohi = arr(o.ohitetut), hylatty = 0, kelvolliset = [];
    arr(o.tulokset).forEach(function (r) { if (ohi.indexOf(r && r.seura) >= 0) return; if (rivinKelpaa(r)) kelvolliset.push({ seura: r.seura, koodi: r.koodi, kokoelma: r.kokoelma, lkm: Math.floor(r.lkm), taso: r.taso }); else hylatty++; });
    var rivit = tmVVertaaEdelliseen(kelvolliset, o.edellinen).filter(function (r) { return r.lkm > 0 || r.edellinen > 0 || r.taso !== 'ok'; });
    var eiEhtinyt = arr(o.eiEhtinyt).filter(function (s) { return SEURA_RE.test(String(s)); });
    return { ajettu: String(o.ajettu || ''), tyyppi: o.tyyppi === 'viikko' ? 'viikko' : 'paivittain', rivit: rivit, eiEhtinyt: eiEhtinyt,
      yhteenveto: { virheita: rivit.filter(function (r) { return r.taso === 'virhe'; }).length, varoituksia: rivit.filter(function (r) { return r.taso === 'varoitus'; }).length, eiEhtinyt: eiEhtinyt.length, hylatty: hylatty } };
  }
  function ylin(raportti) { var t = 'ok'; arr(raportti.rivit).forEach(function (r) { if (JARJESTYS[r.taso] > JARJESTYS[t]) t = r.taso; }); if (raportti.eiEhtinyt && raportti.eiEhtinyt.length && t === 'ok') t = 'varoitus'; return t; }
  /** Rivi tekstinä: "ERROR E1a · seura · kokoelma · 12 (edellinen 0)". */
  function tmVRiviTeksti(r) { return (r.taso === 'virhe' ? 'ERROR' : (r.taso === 'varoitus' ? 'WARN' : 'INFO')) + ' ' + r.koodi + ' · ' + r.seura + ' · ' + r.kokoelma + ' · ' + r.lkm + ' (edellinen ' + (r.edellinen || 0) + ')'; }
  /** Audit-dokumentti (kirjoittaa vain functions/valvonta.js:n kirjaaAudit). Rivit tiivistetyssä muodossa; vain info/varoitus/virhe-rivit, joissa lkm > 0. */
  function tmVAuditRivi(raportti) {
    return { toiminto: 'valvonta_ajo', severity: SEVERITY[ylin(raportti)], tyyppi: raportti.tyyppi, ajettu: raportti.ajettu, virheita: raportti.yhteenveto.virheita, varoituksia: raportti.yhteenveto.varoituksia,
      ei_ehtinyt: raportti.eiEhtinyt, hylatty: raportti.yhteenveto.hylatty,
      rivit: raportti.rivit.filter(function (r) { return r.lkm > 0; }).map(function (r) { return { s: r.seura, k: r.koodi, c: r.kokoelma, n: r.lkm, e: r.edellinen, t: r.taso }; }) };
  }
  /** Virhesähköposti (P4: vain virheistä). Ei virheitä → null. Vain uudet tai kasvaneet virheet laukaisevat; muut mainitaan "edelleen auki". opts.kaikki = viikkoyhteenveto (myös varoitukset). */
  function tmVSahkoposti(raportti, opts) {
    var virheet = raportti.rivit.filter(function (r) { return r.taso === 'virhe'; }), uudet = virheet.filter(function (r) { return r.muutos === 'uusi' || r.muutos === 'kasvanut'; });
    var varoitukset = (opts && opts.kaikki) ? raportti.rivit.filter(function (r) { return r.taso === 'varoitus'; }) : [];
    if (!(opts && opts.kaikki) && !uudet.length && !raportti.eiEhtinyt.length) return null;
    if (!virheet.length && !varoitukset.length && !raportti.eiEhtinyt.length) return null;
    var osa = function (otsikko, lista) { return lista.length ? '<h3>' + esc(otsikko) + '</h3><ul>' + lista.map(function (r) { return '<li>' + esc(tmVRiviTeksti(r)) + '</li>'; }).join('') + '</ul>' : ''; };
    var html = '<p>Valvonta ' + esc(raportti.tyyppi) + ' · ' + esc(raportti.ajettu) + '</p>' + osa('Uudet tai kasvaneet virheet', uudet)
      + osa('Edelleen auki', virheet.filter(function (r) { return uudet.indexOf(r) < 0; })) + osa('Varoitukset', varoitukset)
      + (raportti.eiEhtinyt.length ? '<p>Käsittelemättä jääneitä seuroja: ' + raportti.eiEhtinyt.length + '</p>' : '');
    return { subject: 'TalentMaster valvonta: ' + virheet.length + ' virhettä' + (uudet.length ? ' (' + uudet.length + ' uutta)' : ''), html: html };
  }
  /** PII-vartija: kohde (merkkijono tai JSON-kelpoinen olio) ei saa sisältää kiellettyjä arvoja (nimi, uid, joukkueen nimi, id…) eikä sähköpostiosoitetta. Rikkomus ei sisällä löydettyä arvoa. */
  function tmVOnkoPii(kohde, kielletyt) {
    var teksti = (typeof kohde === 'string' ? kohde : JSON.stringify(kohde)).toLowerCase(), riko = [];
    arr(kielletyt).forEach(function (k, i) { var v = String(k == null ? '' : k).toLowerCase().trim(); if (v.length >= 2 && teksti.indexOf(v) >= 0) riko.push({ tyyppi: 'kielletty_arvo', indeksi: i }); });
    if (/[^\s"'<>@]+@[^\s"'<>@]+\.[a-z]{2,}/i.test(teksti)) riko.push({ tyyppi: 'sahkoposti' });
    return { ok: riko.length === 0, rikkomukset: riko };
  }
  /** Virhe → vain koodi (Firestore-virheen message voi sisältää dokumentin polun, joten sitä ei koskaan välitetä). */
  function tmVTurvallinenVirhe(e) { var k = e && e.code != null ? String(e.code) : 'tuntematon'; k = k.replace(/[^a-zA-Z0-9_.\/-]/g, '').slice(0, 40); return { koodi: k || 'tuntematon' }; }
  /** Lokiviesti seuran käsittelyvirheestä: vain seura-id ja virhekoodi. */
  function tmVLokiVirhe(seura, e) { return 'valvonta-virhe seura=' + (SEURA_RE.test(String(seura)) ? seura : '?') + ' koodi=' + tmVTurvallinenVirhe(e).koodi; }

  var API = { tmVRaportti: tmVRaportti, tmVVertaaEdelliseen: tmVVertaaEdelliseen, tmVAuditRivi: tmVAuditRivi, tmVSahkoposti: tmVSahkoposti, tmVOnkoPii: tmVOnkoPii, tmVTurvallinenVirhe: tmVTurvallinenVirhe,
    tmVLokiVirhe: tmVLokiVirhe, tmVRiviTeksti: tmVRiviTeksti, SEVERITY: SEVERITY };
  if (typeof module !== 'undefined' && module.exports) module.exports = API; else root.TM_VALVONTA_RAPORTTI = API;
})(typeof window !== 'undefined' ? window : this);
