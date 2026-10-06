#!/usr/bin/env node
'use strict';
/**
 * tuo_valmennuslinja.js — SJK:n (tai muun seuran) valmennuslinjan tuonti Excelistä Firestoreen. DRY-RUN OLETUKSENA; --apply vain Teron hyväksynnällä.
 *
 *   node scripts/tuo_valmennuslinja.js --seura sjk --tiedosto SJK_valmennuslinja_tarkistettavaksi.xlsx [--master SJK_fysiikkalinja_tuontipohja_v2.xlsx]
 *        [--pvm 2026-10-17] [--tarkistaja "Nimi"] [--lahde "Nevanlinna 2014"] [--ei-lue] [--apply]
 *
 * KAKSI AJOA (kaikki tuodut dokumentit saavat tila + tarkistettu_pvm + tarkistaja):
 *   1. ajo = TM:n esitäytetty Excel (ei yhtään kuittausta) → KAIKKI tila:'luonnos' (pelaajalle ei näy mitään).
 *   2. ajo = SJK:n kuitattu Excel: OK / Muutettu → 'hyvaksytty' · Uusi → 'hyvaksytty' · Poista → dokumentti/rivi poistetaan · tyhjä → pysyy 'luonnos' ja LISTATAAN.
 *   Ketteryys_ja_nopeus: 'hyvaksytty' vasta kun media on täytetty (video_url TAI kuva_url; vanha kuva_tai_video tuettu) — muuten pysyy luonnoksena kuittauksesta riippumatta.
 * IDEMPOTENTTI: dokumentti-ID johdetaan välilehti + lahde_dia + nimi/jarjestys (ei satunnaista) → uudelleenajo päivittää, ei tuplaa. versio +1 jokaisella muuttuneella dokumentilla; muuttumaton → ei kirjoitusta.
 * KOHDE (vain seurat/{seura}/ -polun alla): valmennuslinja/ikavaiheet · valmennuslinja/teemat (vain hyväksytyt jaksot) + valmennuslinja/teemat_luonnos (luonnokset, staff-only) ·
 *   ohjelmat/{id} (Ohjelmat + Keskivartalo) · harjoitepankki/{id} (Rutiinit_ja_harjoitteet + Ketteryys_ja_nopeus; tyyppi T, lahde 'seura').
 * EI TUODA: OHJE, Puutteet, Kattavuus (tiedollisia). Ketju (SBL/SFL/LL/DIAG/DFL) haetaan v2-masterista (välilehti + liike/nimi + lahde_dia) — TM:n sisäistä metodologiaa, ei seuran Excelissä.
 * Sarakenimet haetaan otsikon NIMELLÄ (ei sijainnilla), aliaskartta hyväksyy sekä SJK:lle lähteneen luonnoksen että lukitun mallin sarakenimet. Ei sisältöä TM:n oletuspankkiin (§9).
 */
const fs = require('fs');
const path = require('path');
const { lueXlsx } = require('./xlsx_luku');

const KUITTAUKSET = { ok: 'OK', muutettu: 'Muutettu', poista: 'Poista', uusi: 'Uusi' };
const EI_TUODA = ['OHJE', 'Ohje', 'Puutteet', 'Kattavuus'];
// Otsikkoalias → kanoninen nimi (molemmat nimeämiskäytännöt; vertailu pienillä kirjaimilla ilman väliviivoja/välilyöntejä)
const ALIAS = {
  ohjelma: 'ohjelma_nimi', ohjelma_nimi: 'ohjelma_nimi', sarja: 'ohjelma_nimi', ikaluokka: 'ikaluokka', ikaraja: 'ikaraja', ika_min: 'ika_min', ika_max: 'ika_max',
  lahde_dia: 'lahde_viite', lahde_viite: 'lahde_viite', toistot: 'toistot', toistot_aika: 'toistot', palautus: 'palautus', pelaajan_ohje: 'pelaajan_ohje', kesto_min: 'kesto_min',
  kotiin_sopiva: 'kotiin_sopiva', video_url: 'video_url', kuva_url: 'kuva_url', ketju: 'ketju', teema_avain: 'teema_avain', tyyppi: 'tyyppi', jarjestys: 'jarjestys', liike: 'liike', taso: 'taso',
  kuittaus: 'kuittaus', kommentti: 'kommentti', joukkue: 'joukkue', jakso: 'jakso', viikot: 'viikot', teema: 'teema', konsepti: 'konsepti', alkaa_pvm: 'alkaa', alkaa: 'alkaa', paattyy_pvm: 'paattyy', paattyy: 'paattyy',
  nimi: 'nimi', kuvaus: 'kuvaus', valineet: 'valineet', pelaajia: 'pelaajia', kuva_tai_video: 'kuva_tai_video', sisalto: 'sisalto', painopisteet: 'painopisteet', totuteltava_opeteltava: 'totuteltava',
  totuteltava: 'totuteltava', suositellut_ohjelmat: 'suositellut_ohjelmat', dimensio: 'dimensio', kehityskohde: 'kehityskohde', tarvikkeet: 'tarvikkeet',
};
const hash = (s) => { let h = 5381; for (let i = 0; i < s.length; i++) h = ((h << 5) + h + s.charCodeAt(i)) >>> 0; return h.toString(36).slice(0, 5); };
// Vakaa ID-osa: ei-satunnainen; pitkä nimi katkaistaan 40 merkkiin + hash koko nimestä (ei törmäyksiä katkaisussa)
const slug = (s) => { const t = String(s == null ? '' : s).toLowerCase().replace(/ä|å/g, 'a').replace(/ö/g, 'o').replace(/[^a-z0-9]+/g, '_').replace(/^_+|_+$/g, ''); return t.length > 40 ? t.slice(0, 40) + '_' + hash(t) : t; };
const norm = (v) => String(v == null ? '' : v).trim();
const normOtsikko = (h) => norm(h).toLowerCase().replace(/\s+/g, '_').replace(/[()]/g, '');
const luku = (v) => { const s = norm(v).replace(',', '.'); if (!s) return null; const n = Number(s); return Number.isFinite(n) ? n : null; };
// lahde_viite: pelkkä dia-numero → "<lähde>, dia N" (SJK:n Excelin dia-numerot ovat Nevanlinnan 2014 -aineiston diat; --lahde ylikirjoittaa); valmis teksti säilyy.
let LAHDE_NIMI = 'Nevanlinna 2014';
const viite = (v) => { const s = norm(v); if (!s) return null; return /^\d+([–-]\d+)?(,\s*\d+)*$/.test(s) ? LAHDE_NIMI + ', dia ' + s : s; };
// "1. Taitavuus: tasapaino, rytmikyky\n2. Reaktionopeus" → [{jarjestys:1, otsikko:'Taitavuus', kohdat:['tasapaino','rytmikyky']}, {jarjestys:2, otsikko:'Reaktionopeus', kohdat:[]}] (pilkut sulkeiden sisällä eivät erota)
const hierarkia = (v) => norm(v).split(/\n+/).map((x) => x.trim()).filter(Boolean).map((rivi, i) => {
  const m = /^\s*(\d+)[.)]\s*(.*)$/.exec(rivi), teksti = (m ? m[2] : rivi).trim(), kaksoispiste = teksti.indexOf(':');
  const otsikko = (kaksoispiste >= 0 ? teksti.slice(0, kaksoispiste) : teksti).trim(), loppu = kaksoispiste >= 0 ? teksti.slice(kaksoispiste + 1) : '';
  const kohdat = []; let syvyys = 0, nyt = ''; for (const c of loppu) { if (c === '(') syvyys++; if (c === ')') syvyys = Math.max(0, syvyys - 1); if (c === ',' && !syvyys) { kohdat.push(nyt.trim()); nyt = ''; } else nyt += c; } if (nyt.trim()) kohdat.push(nyt.trim());
  return { jarjestys: m ? Number(m[1]) : i + 1, otsikko, kohdat: kohdat.filter(Boolean) };
});
const rivit = (v) => norm(v).split(/\n+/).map((x) => x.replace(/^\s*\d+[.)]\s*/, '').trim()).filter(Boolean);
const OnUrl = (s) => /^https?:\/\//i.test(norm(s));

/** Taulukko → [{rivi (1-pohjainen Excel-rivi), a: kanoniset kentät}] otsikon nimellä. */
function lueTaulu(rows) {
  if (!rows || !rows.length) return [];
  const otsikot = rows[0].map((h) => ALIAS[normOtsikko(h)] || null);
  const out = [];
  for (let i = 1; i < rows.length; i++) {
    const a = {}; let sisaltoa = false;
    otsikot.forEach((k, c) => { if (!k) return; let v = norm(rows[i][c]); if (v.toUpperCase() === 'UUSI' && k !== 'kuittaus') v = '';   // tyhjän UUSI-paikan merkki ei ole sisältöä
        if (v !== '' && k !== 'kuittaus' && k !== 'kommentti' && k !== 'lahde_viite') sisaltoa = true; if (!(k in a) || v !== '') a[k] = v; });
    out.push({ rivi: i + 1, a, sisaltoa });
  }
  return out;
}

/** kotiin_sopiva: VAIN täsmälleen "kyllä" → true (ei valvontaa/välineitä). Ehdolliset ("kyllä (keppi)", "osin", "ei …") → false + huomio. */
function kotiinSopiva(v) {
  const s = norm(v).toLowerCase();
  if (s === 'kyllä' || s === 'kylla') return { arvo: true, huomio: null, ehdollinen: false };
  if (!s) return { arvo: false, huomio: null, ehdollinen: false };
  return { arvo: false, huomio: norm(v), ehdollinen: /^(kyllä|kylla|osin)/.test(s) };
}

function ikarajat(a) {
  let min = luku(a.ika_min), max = luku(a.ika_max);
  if (min == null && max == null && a.ikaraja) {
    const s = a.ikaraja.toLowerCase(), n = (s.match(/\d+/) || [])[0];
    if (n && /alle/.test(s)) max = Number(n) - 1; else if (n && /yli/.test(s)) min = Number(n);   // "alle 12v" = <12 (max 11) · "yli 12v" = ≥12 (min 12) — tulkinta raportoidaan
  }
  if (min == null && max == null && a.ikaluokka) { const m = a.ikaluokka.match(/(\d+)(?:\s*[–-]\s*(\d+))?/); if (m) { min = Number(m[1]); max = m[2] ? Number(m[2]) : min; } }
  return { ika_min: min, ika_max: max };
}

// Vakaa serialisointi: avaimet järjestyksessä KAIKILLA tasoilla (JSON.stringify:n taulukko-replacer suodattaisi sisäkkäiset kentät pois!)
const vakaa = (o) => JSON.stringify(o, (k, v) => (v && typeof v === 'object' && !Array.isArray(v) ? Object.keys(v).sort().reduce((r, x) => { r[x] = v[x]; return r; }, {}) : v));
const sisaltoAvain = (d) => { const c = Object.assign({}, d); ['versio', 'tarkistettu_pvm', 'tarkistaja', 'paivitetty', 'luotu'].forEach((k) => delete c[k]); return vakaa(c); };

/**
 * muunna({ pohja: Workbook, master?: Workbook, nykyinen?: {polku → data}, pvm, tarkistaja, ajo? }) → { docs, raportti }
 * docs: [{ polku (seura-suhteellinen), op:'luo'|'paivita'|'ei_muutosta'|'poista', data, versio }] · puhdas funktio (ei I/O).
 */
function muunna(opts) {
  LAHDE_NIMI = opts.lahde || 'Nevanlinna 2014';
  const pohja = opts.pohja.sheets, master = opts.master ? opts.master.sheets : null, nyk = opts.nykyinen || {};
  const pvm = opts.pvm || null, tarkistaja = opts.tarkistaja || null;
  const rap = { ajo: null, huomiot: [], virheet: [], kuittaamattomat: [], ehdollinenKotiin: [], odottaaKuvaa: [], ketjutta: [], ohitetut: {}, tilastot: {}, tulkinnat: [
    'ikaraja "alle 12v" → ika_max 11 · "yli 12v" → ika_min 12 (ikä vuosina)', 'kotiin_sopiva: vain täsmälleen "kyllä" = true; ehdolliset ("kyllä (keppi)", "osin", "ei …") = false + kotiin_huomio',
    'kehityskohde = null KAIKILLE harjoitepankkiriveille TARKOITUKSELLA + kaytto:\'joukkue\' (valmentajan ratoja/rutiineja; moottori ohittaa — eivät koskaan päivän harjoite)', 'dimensio D1 = Nevanlinna-lähteiset ikavaiheet-rivit (lahde_viite sisältää Nevanlinna), muut tyhjä'] };
  const nimetyt = Object.keys(pohja).filter((n) => EI_TUODA.indexOf(n) < 0);
  const taulut = {}; nimetyt.forEach((n) => { taulut[n] = lueTaulu(pohja[n]); });
  const kuitattuja = Object.values(taulut).some((t) => t.some((r) => norm(r.a.kuittaus) !== ''));
  rap.ajo = opts.ajo || (kuitattuja ? 2 : 1);
  const ketjuHaku = {};
  if (master) for (const sn of ['Ohjelmat', 'Keskivartalo', 'Rutiinit_ja_harjoitteet', 'Ketteryys_ja_nopeus']) {
    lueTaulu(master[sn]).forEach((r) => { if (r.a.ketju) ketjuHaku[[sn, slug(r.a.liike || r.a.nimi), norm(r.a.lahde_viite)].join('|')] = r.a.ketju.toUpperCase(); });
  }
  const ketju = (sn, a) => { const k = ketjuHaku[[sn, slug(a.liike || a.nimi), norm(a.lahde_viite)].join('|')] || null; if (!k && master) rap.ketjutta.push(sn + ': ' + (a.liike || a.nimi)); return k; };

  /** Rivin tila + toimenpide. Palauttaa {ohita, poista, tila, uusi?}. */
  const tilaRivi = (sn, r, avain, valmis) => {
    const k = norm(r.a.kuittaus).toLowerCase();
    if (k && !KUITTAUKSET[k]) { rap.virheet.push(sn + ' rivi ' + r.rivi + ': tuntematon kuittaus "' + r.a.kuittaus + '" (sallitut OK/Muutettu/Poista/Uusi)'); return { ohita: true }; }
    if (!r.sisaltoa && !k) { rap.ohitetut[sn] = (rap.ohitetut[sn] || 0) + 1; return { ohita: true }; }   // tyhjä UUSI-paikka
    if (k === 'poista') return { poista: true };
    if (!r.sisaltoa) { rap.virheet.push(sn + ' rivi ' + r.rivi + ': kuittaus "' + r.a.kuittaus + '" mutta rivi on tyhjä'); return { ohita: true }; }
    if (rap.ajo === 1 || !k) { if (rap.ajo === 2 && !k) rap.kuittaamattomat.push(sn + ' rivi ' + r.rivi + ': ' + avain); return { tila: 'luonnos' }; }
    return { tila: valmis === false ? 'luonnos' : 'hyvaksytty' };
  };
  const leima = (data, tila) => Object.assign(data, { tila, tarkistettu_pvm: tila === 'hyvaksytty' ? pvm : null, tarkistaja: tila === 'hyvaksytty' ? tarkistaja : null });
  // VAKAAT ID:T: välilehti + lahde_dia + järjestysnumero (n:s sisältörivi samalla dia-arvolla, Excel-järjestyksessä) — EI nimeä/joukkuetta, koska SJK korjaa niitä kuittauksessa ("Muutettu"):
  // nimeen sidottu ID loisi korjatusta rivistä uuden dokumentin ja jättäisi vanhan haamuksi. Rivejä ei saa järjestää uudelleen eikä poistaa (OHJE: Poista = merkitse); uudet rivit lisätään loppuun.
  const laskuri = {}; const nro = (avain) => (laskuri[avain] = (laskuri[avain] || 0) + 1);
  const diaId = (a) => slug(a.lahde_viite || 'x');
  const docs = []; const kasitellyt = {};
  /** Yhden dokumentin kirjoitussuunnitelma: versio, op, vertailu nykyiseen. */
  const kirjoita = (polku, data) => {
    const vanha = nyk[polku]; kasitellyt[polku] = true;
    if (!vanha) { docs.push({ polku, op: 'luo', data: Object.assign(data, { versio: 1 }), versio: 1 }); return; }
    if (sisaltoAvain(Object.assign({}, vanha, { tarkistettu_pvm: null, tarkistaja: null })) === sisaltoAvain(Object.assign({}, data, { tarkistettu_pvm: null, tarkistaja: null }))) { docs.push({ polku, op: 'ei_muutosta', data: vanha, versio: vanha.versio || 1 }); return; }
    const versio = (vanha.versio || 0) + 1; docs.push({ polku, op: 'paivita', data: Object.assign(data, { versio }), versio });
  };
  const poista = (polku) => { kasitellyt[polku] = true; if (nyk[polku]) docs.push({ polku, op: 'poista', data: null, versio: nyk[polku].versio || 1 }); else rap.huomiot.push('Poista-rivi ilman olemassa olevaa dokumenttia: ' + polku); };

  // ── Ikaluokat → valmennuslinja/ikavaiheet (yksi dokumentti, rivit[]; rivin tila rivillä) ──
  if (taulut.Ikaluokat) {
    const vanhat = ((nyk['valmennuslinja/ikavaiheet'] || {}).rivit || []).reduce((m, x) => { m[x.id] = x; return m; }, {}), uudet = Object.assign({}, vanhat);
    taulut.Ikaluokat.forEach((r) => {
      const a = r.a, avain = a.ikaluokka || '(nimetön)', id = 'ika_' + diaId(a) + '_' + (r.sisaltoa ? nro('Ikaluokat|' + diaId(a)) : 0), t = tilaRivi('Ikaluokat', r, avain);
      if (t.ohita) return; if (t.poista) { delete uudet[id]; return; }
      const rv = Object.assign({ id, ikaluokka: a.ikaluokka, dimensio: a.dimensio || (/Nevanlinna/i.test(viite(a.lahde_viite) || '') ? 'D1' : null), sisalto: rivit(a.painopisteet), painopisteet: hierarkia(a.painopisteet), totuteltava: rivit(a.totuteltava), totuteltava_hierarkia: hierarkia(a.totuteltava), suositellut_ohjelmat: rivit(a.suositellut_ohjelmat), lahde_viite: viite(a.lahde_viite) }, ikarajat(a));
      const v = vanhat[id]; const muuttui = !v || sisaltoAvain(Object.assign({}, v, { tila: 0 })) !== sisaltoAvain(Object.assign({}, rv, { versio: v.versio, tila: 0, tarkistettu_pvm: v.tarkistettu_pvm, tarkistaja: v.tarkistaja }));
      leima(rv, t.tila); rv.versio = !v ? 1 : (muuttui || v.tila !== t.tila ? (v.versio || 0) + 1 : v.versio); if (v && !muuttui && v.tila === t.tila) { rv.tarkistettu_pvm = v.tarkistettu_pvm; rv.tarkistaja = v.tarkistaja; }
      uudet[id] = rv;
    });
    const lista = Object.keys(uudet).sort().map((k) => uudet[k]);
    kirjoita('valmennuslinja/ikavaiheet', { rivit: lista });
  }

  // ── Teemat → teemat (hyväksytyt) + teemat_luonnos (staff-only) ──
  if (taulut.Teemat) {
    const vanhat = {}; ['valmennuslinja/teemat', 'valmennuslinja/teemat_luonnos'].forEach((p) => ((nyk[p] || {}).jaksot || []).forEach((j) => { vanhat[j.id] = j; }));
    const uudet = Object.assign({}, vanhat);
    taulut.Teemat.forEach((r) => {
      const a = r.a, avain = (a.joukkue || '') + ' / ' + (a.jakso || a.teema || ''), id = 'teema_' + diaId(a) + '_' + (r.sisaltoa ? nro('Teemat|' + diaId(a)) : 0), t = tilaRivi('Teemat', r, avain);
      if (t.ohita) return; if (t.poista) { delete uudet[id]; return; }
      const placeholder = !norm(a.joukkue) || /\besim\.?\s*$/i.test(a.joukkue) || /^uusi$/i.test(norm(a.joukkue));
      if (placeholder) { rap.huomiot.push('Teemat rivi ' + r.rivi + ': joukkue "' + (a.joukkue || '') + '" ei ole oikea joukkuenimi (esimerkkiteksti/tyhjä) — rivi pysyy luonnoksena kunnes SJK kirjoittaa joukkueet'); t.tila = 'luonnos'; }
      const j = { id, joukkue: a.joukkue || null, jakso: a.jakso || null, viikot: a.viikot || null, alkaa: a.alkaa || null, paattyy: a.paattyy || null, teema: a.teema || null, konsepti: a.konsepti || null, lahde_viite: viite(a.lahde_viite) };
      const v = vanhat[id], sama = v && sisaltoAvain(Object.assign({}, v, { tila: 0 })) === sisaltoAvain(Object.assign({}, j, { versio: v.versio, tila: 0, tarkistettu_pvm: v.tarkistettu_pvm, tarkistaja: v.tarkistaja }));
      leima(j, t.tila); j.versio = !v ? 1 : (sama && v.tila === t.tila ? v.versio : (v.versio || 0) + 1); if (sama && v.tila === t.tila) { j.tarkistettu_pvm = v.tarkistettu_pvm; j.tarkistaja = v.tarkistaja; }
      uudet[id] = j;
    });
    const kaikki = Object.keys(uudet).sort().map((k) => uudet[k]);
    kirjoita('valmennuslinja/teemat', { jaksot: kaikki.filter((j) => j.tila === 'hyvaksytty') });
    kirjoita('valmennuslinja/teemat_luonnos', { jaksot: kaikki.filter((j) => j.tila !== 'hyvaksytty') });
  }

  // ── Ohjelmat + Keskivartalo → ohjelmat/{id} (yksi dokumentti per ohjelma/sarja; liikkeet[]) ──
  for (const sn of ['Ohjelmat', 'Keskivartalo']) {
    if (!taulut[sn]) continue;
    const ryhmat = {}, jarj = [];
    taulut[sn].forEach((r) => { const nimi = r.a.ohjelma_nimi; if (!nimi && !r.a.liike) { if (norm(r.a.kuittaus)) tilaRivi(sn, r, '(tyhjä)'); else rap.ohitetut[sn] = (rap.ohitetut[sn] || 0) + 1; return; } const k = nimi || '(nimetön)'; if (!ryhmat[k]) { ryhmat[k] = []; jarj.push(k); } ryhmat[k].push(r); });
    jarj.forEach((nimi) => {
      const rs = ryhmat[nimi], eka = rs.find((r) => r.a.lahde_viite) || rs[0], id = slug(sn) + '_' + diaId(eka.a) + '_' + nro(sn + '|' + diaId(eka.a)), polku = 'ohjelmat/' + id;
      const liikkeet = []; let poistettu = 0, tilat = [];
      rs.forEach((r, i) => {
        const a = r.a, avain = nimi + ' / ' + (a.liike || '?'), t = tilaRivi(sn, r, avain); if (t.ohita) return; if (t.poista) { poistettu++; return; }
        const kd = kotiinSopiva(a.kotiin_sopiva); if (kd.ehdollinen) rap.ehdollinenKotiin.push(sn + ': ' + avain + ' → "' + kd.huomio + '"');
        liikkeet.push({ jarjestys: luku(a.jarjestys) != null ? luku(a.jarjestys) : liikkeet.length + 1, taso: a.taso || null, liike: a.liike || null, toistot: a.toistot || null, palautus: a.palautus || null, pelaajan_ohje: a.pelaajan_ohje || null,
          kesto_min: luku(a.kesto_min), kotiin_sopiva: kd.arvo, kotiin_huomio: kd.huomio, video_url: OnUrl(a.video_url) ? norm(a.video_url) : null, kuva_url: (OnUrl(a.kuva_url) || /\.(jpe?g|png|gif)$/i.test(norm(a.kuva_url))) ? norm(a.kuva_url) : null, ketju: ketju(sn, a), lahde_viite: viite(a.lahde_viite) });
        tilat.push(t.tila);
      });
      if (!liikkeet.length && poistettu === rs.length) { poista(polku); return; }
      if (!liikkeet.length) return;
      const tila = tilat.every((x) => x === 'hyvaksytty') ? 'hyvaksytty' : 'luonnos';   // yksikin kuittaamaton rivi pitää koko ohjelman luonnoksena
      const ik = ikarajat(eka.a);
      const data = Object.assign({ nimi, tyyppi: 'muu', kuvaus: null, kesto_vk: null, vaiheet: [{ vaihe: 'Ohjelma', viikot: '', intensiteetti: '', nimi, ohje: '', mittari: '', harjoitteet: liikkeet.map((l) => l.liike).filter(Boolean) }], liikkeet,
        teema_avain: eka.a.teema_avain || null, lahde: 'seura', lahde_viite: viite(eka.a.lahde_viite), arkistoitu: false, laatija_rooli: 'tuonti' }, ik);
      kirjoita(polku, leima(data, tila));
    });
  }

  // ── Rutiinit_ja_harjoitteet + Ketteryys_ja_nopeus → harjoitepankki/{id} (tyyppi T, lahde 'seura') ──
  for (const sn of ['Rutiinit_ja_harjoitteet', 'Ketteryys_ja_nopeus']) {
    if (!taulut[sn]) continue;
    taulut[sn].forEach((r) => {
      const a = r.a, ketteryys = sn === 'Ketteryys_ja_nopeus', kuva = norm(a.kuva_tai_video), tiedosto = (x) => /\.(jpe?g|png|gif|mp4|mov|webm)$/i.test(norm(x)), videoUrl = OnUrl(a.video_url) ? norm(a.video_url) : (OnUrl(kuva) ? kuva : null), kuvaUrl = (OnUrl(a.kuva_url) || tiedosto(a.kuva_url)) ? norm(a.kuva_url) : (tiedosto(kuva) && !OnUrl(kuva) ? kuva : null), kuvaOk = !!(videoUrl || kuvaUrl);   // media = video_url TAI kuva_url (vanha kuva_tai_video-sarake tuettu)
      const id = (ketteryys ? 'ketteryys' : 'rutiinit') + '_' + diaId(a) + '_' + (r.sisaltoa ? nro(sn + '|' + diaId(a)) : 0), polku = 'harjoitepankki/' + id;
      const t = tilaRivi(sn, r, a.nimi || '?', ketteryys ? kuvaOk : true); if (t.ohita) return; if (t.poista) { poista(polku); return; }
      if (ketteryys && !kuvaOk && (norm(a.kuittaus) || rap.ajo === 2)) rap.odottaaKuvaa.push(a.nimi);
      const kd = kotiinSopiva(a.kotiin_sopiva); if (kd.ehdollinen) rap.ehdollinenKotiin.push(sn + ': ' + a.nimi + ' → "' + kd.huomio + '"');
      const ik = ikarajat(a);
      const data = Object.assign({ nimi: a.nimi, tyyppi: 'T', kehityskohde: null, ketju: ketju(sn, a), konsepti: null, kaytto: 'joukkue', ohje: ketteryys ? (a.kuvaus || null) : (a.pelaajan_ohje || a.sisalto || null),
        sisalto: ketteryys ? null : (a.sisalto || null), kesto_min: luku(a.kesto_min), video_url: videoUrl, kuva_url: kuvaUrl,
        tarvikkeet: a.valineet || a.tarvikkeet || null, pelaajia: luku(a.pelaajia), kotiin_sopiva: kd.arvo, kotiin_huomio: kd.huomio, lahde: 'seura', lahde_viite: viite(a.lahde_viite), laatija_rooli: 'tuonti' }, ik);
      kirjoita(polku, leima(data, t.tila));
    });
  }
  // tilastot
  docs.forEach((d) => { const k = d.polku.split('/')[0] + ':' + d.op; rap.tilastot[k] = (rap.tilastot[k] || 0) + 1; });
  const tilaLkm = {}; docs.forEach((d) => { if (d.data && d.data.tila) tilaLkm[d.data.tila] = (tilaLkm[d.data.tila] || 0) + 1; }); rap.tilaLkm = tilaLkm;
  return { docs, raportti: rap };
}

function tulosta(r, apply) {
  const rp = r.raportti, L = [];
  L.push((apply ? 'APPLY' : 'DRY-RUN') + ' — ajo ' + rp.ajo + (rp.ajo === 1 ? ' (esitäytetty → kaikki luonnos)' : ' (kuitattu → OK/Muutettu/Uusi = hyväksytty)'));
  L.push('Dokumentit: ' + Object.keys(rp.tilastot).sort().map((k) => k + '=' + rp.tilastot[k]).join(' · ') + ' | tila: ' + JSON.stringify(rp.tilaLkm));
  if (Object.keys(rp.ohitetut).length) L.push('Ohitettu tyhjiä UUSI-paikkoja: ' + JSON.stringify(rp.ohitetut));
  if (rp.kuittaamattomat.length) L.push('KUITTAAMATTOMAT (pysyvät luonnoksena) ' + rp.kuittaamattomat.length + ':\n  - ' + rp.kuittaamattomat.join('\n  - '));
  if (rp.odottaaKuvaa.length) L.push('Odottaa kuvaa/videota (luonnos): ' + rp.odottaaKuvaa.join(', '));
  if (rp.ehdollinenKotiin.length) L.push('Ehdollinen kotiin_sopiva (tuotu false + huomio) ' + rp.ehdollinenKotiin.length + ':\n  - ' + rp.ehdollinenKotiin.slice(0, 30).join('\n  - '));
  if (rp.ketjutta.length) {
    const ryh = {}; rp.ketjutta.forEach((x) => { const i = x.indexOf(': '); (ryh[x.slice(0, i)] = ryh[x.slice(0, i)] || new Set()).add(x.slice(i + 2)); });
    L.push('ILMAN KETJUA v2-masterista: ' + rp.ketjutta.length + ' riviä (' + Object.keys(ryh).map((k) => k + ' ' + ryh[k].size + ' uniikkia').join(', ') + '):\n' + Object.keys(ryh).map((k) => '  [' + k + ']\n    - ' + [...ryh[k]].join('\n    - ')).join('\n'));
  }
  if (rp.huomiot.length) L.push('Huomiot:\n  - ' + rp.huomiot.join('\n  - '));
  if (rp.virheet.length) L.push('VIRHEET (apply estetty) ' + rp.virheet.length + ':\n  - ' + rp.virheet.join('\n  - '));
  L.push('Tulkinnat: ' + rp.tulkinnat.join(' | '));
  return L.join('\n');
}

function argv(a) { const o = { _: [] }; for (let i = 0; i < a.length; i++) { const x = a[i]; if (x.startsWith('--')) { const k = x.slice(2); if (['apply', 'ei-lue'].indexOf(k) >= 0) o[k] = true; else o[k] = a[++i]; } else o._.push(x); } return o; }

async function main(args) {
  const o = argv(args);
  if (!o.seura || !o.tiedosto) { console.error('Käyttö: node scripts/tuo_valmennuslinja.js --seura <seuraId> --tiedosto <xlsx> [--master <v2.xlsx>] [--pvm YYYY-MM-DD] [--tarkistaja "Nimi"] [--ei-lue] [--apply]'); return 2; }
  const pohja = lueXlsx(fs.readFileSync(o.tiedosto)), master = o.master ? lueXlsx(fs.readFileSync(o.master)) : null;
  const paikallinenPvm = () => { const d = new Date(); return d.getFullYear() + '-' + String(d.getMonth() + 1).padStart(2, '0') + '-' + String(d.getDate()).padStart(2, '0'); };   // paikallinen päivä (§7.26)
  const opts = { pohja, master, lahde: o.lahde || null, pvm: o.pvm || paikallinenPvm(), tarkistaja: o.tarkistaja || null, nykyinen: {} };
  let db = null;
  if (!o['ei-lue']) {
    const admin = require('firebase-admin'); admin.initializeApp({ credential: admin.credential.applicationDefault() }); db = admin.firestore();   // gcloud ADC (ei SA-avainta)
    const lue = async (p) => { const s = await db.doc('seurat/' + o.seura + '/' + p).get(); if (s.exists) opts.nykyinen[p] = s.data(); };
    await Promise.all(['valmennuslinja/ikavaiheet', 'valmennuslinja/teemat', 'valmennuslinja/teemat_luonnos'].map(lue));
    for (const c of ['ohjelmat', 'harjoitepankki']) { const s = await db.collection('seurat/' + o.seura + '/' + c).where('laatija_rooli', '==', 'tuonti').get(); s.forEach((d) => { opts.nykyinen[c + '/' + d.id] = d.data(); }); }
  }
  const r = muunna(opts);
  console.log(tulosta(r, !!o.apply));
  if (!o.apply) { console.log('\n(dry-run: mitään ei kirjoitettu. --apply vain Teron hyväksynnällä.)'); return 0; }
  if (r.raportti.virheet.length) { console.error('\nApply estetty: korjaa virheet ensin.'); return 1; }
  if (r.raportti.ajo === 2 && !o.tarkistaja) { console.error('\nApply estetty: 2. ajolla vaaditaan --tarkistaja (hyväksyjän nimi).'); return 1; }
  if (!db) { console.error('\nApply estetty: --ei-lue ei salli kirjoitusta.'); return 1; }
  const admin = require('firebase-admin'), FV = admin.firestore.FieldValue; const juuri = 'seurat/' + o.seura + '/';
  let n = 0; let batch = db.batch(); let kaytetty = 0;
  for (const d of r.docs) {
    if (d.op === 'ei_muutosta') continue;
    const ref = db.doc(juuri + d.polku); if (ref.path.indexOf(juuri) !== 0) throw new Error('Polku seuran ulkopuolella: ' + ref.path);
    if (d.op === 'poista') batch.delete(ref); else batch.set(ref, Object.assign({}, d.data, { paivitetty: FV.serverTimestamp() }, d.op === 'luo' ? { luotu: FV.serverTimestamp() } : {}), { merge: false });
    n++; if (++kaytetty >= 400) { await batch.commit(); batch = db.batch(); kaytetty = 0; }
  }
  if (kaytetty) await batch.commit();
  console.log('\nKirjoitettu ' + n + ' dokumenttia polun ' + juuri + ' alle.'); return 0;
}

module.exports = { muunna, lueTaulu, kotiinSopiva, ikarajat, slug, tulosta, ALIAS };
if (require.main === module) main(process.argv.slice(2)).then((c) => process.exit(c)).catch((e) => { console.error(e && e.stack || e); process.exit(1); });
