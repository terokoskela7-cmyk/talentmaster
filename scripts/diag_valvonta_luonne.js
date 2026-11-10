#!/usr/bin/env node
/* diag_valvonta_luonne.js — Projekti 07 / PR 2b: valvonnan löydösten LUONNE ilman nimiä. VAIN LUKU, gcloud ADC. Tero ajaa:  ! node scripts/diag_valvonta_luonne.js [--projekti=talentmaster-pilot] [--kaikki]
 *  1) E6 (sama PalloID/tunniste usealla pelaajadokumentilla): onko kyse CLAUDE.md §10:n testipelaajista, arkistoiduista dokumenteista, testiarvoisesta tunnisteesta (12345678, toistomerkit…)
 *     vai samannimisestä pelaajasta (siirto seurasta toiseen). Tulostaa vain lukumäärät per ryhmä ja seura — ei nimiä, ei tunnisteita, ei pelaaja-id:itä.
 *  2) E1b (orvot joukkueviitteet): luokitus lukumäärinä — kirjoitusasu (sama joukkue eri kirjoitettuna), osittainen osuma, avainsana (esim. "koko seura"), id-muotoinen (poistetun joukkueen id), muu.
 *  3) PR 2c: orpo nimi → lähin oma joukkue -parit (JOUKKUEIDEN NIMET NÄKYVÄT — vain Teron paikallinen tuloste, ei koskaan hälytyksiin), K1-erittely (mitä K1:n luku tarkoittaa) ja kalenterin F1-erittely (joukkueettomat harjoitukset/ottelut).
 *     --alias-luonnos: tulostaa JSON-luonnoksen functions/valvonta_aliakset.json -tiedostoon (perustelu tyhjä → PM täyttää).
 * Korjausta EI tehdä tämän perusteella: PM päättää (E6: ennen päätöstä ei muuteta mitään). Sama logiikka kuin lib/tm_valvonta.js (tmVE6Luonne, tmVOrpojenLuonne); sama lukukerros kuin käsiajurissa. */
'use strict';
if (require.main !== module) throw new Error('käsittelee tuotantodataa — aja suoraan: node scripts/diag_valvonta_luonne.js');
const path = require('path');
const V = require(path.join(__dirname, '..', 'lib', 'tm_valvonta.js'));
const R = require(path.join(__dirname, '..', 'lib', 'tm_valvonta_raportti.js'));
const L = require(path.join(__dirname, '..', 'functions', 'valvonta_luku.js'));
const fs = require('fs');

/* CLAUDE.md §10: nimetyt testipelaajat (vertailu vain muistissa; nimiä ei tulosteta) */
const TESTINIMET = ['Topias O´Koskela', 'Toppari Testi', 'Testi Pelaaja', 'Testi Test', 'Tero Testaaja'], TESTI_IDT = ['m93GBdOaGCUuenMiCL0I'];
const KOKOELMAT = ['kalenteri', 'harjoitusarvioinnit', 'pelaajat', 'toimenpiteet', 'viestit', 'mentoroinnit', 'kooste_joukkue'];
const pad = (s, n) => String(s).padEnd(n), lpad = (s, n) => String(s).padStart(n), kyllaEi = (b) => (b ? 'kyllä' : 'ei');

const ms = (x) => (x && typeof x.toMillis === 'function' ? x.toMillis() : (x instanceof Date ? x.getTime() : (typeof x === 'string' ? Date.parse(x) : (typeof x === 'number' ? x : NaN))));
function etaisyys(a, b) {   // Levenshtein
  const d = []; for (let i = 0; i <= a.length; i++) { d[i] = [i]; } for (let j = 1; j <= b.length; j++) d[0][j] = j;
  for (let i = 1; i <= a.length; i++) for (let j = 1; j <= b.length; j++) d[i][j] = Math.min(d[i - 1][j] + 1, d[i][j - 1] + 1, d[i - 1][j - 1] + (a[i - 1] === b[j - 1] ? 0 : 1));
  return d[a.length][b.length];
}
/** Orvot arvot (E1b + E1c) seurassa ja kokoelmassa: [{ arvo, lkm, lahin (oman joukkueen nimi), etaisyys, tapa }] — aliaksella löytyvät pois. Sisältää nimiä: vain paikallinen tuloste. */
function orpoParit(s, kok, I, aliasRivit) {
  const docs = (s.kokoelmat || {})[kok] || [], omat = s.joukkueet || [], aliakset = V.tmVAliakset(aliasRivit, s.sid, omat);
  const ctx = { sid: s.sid, omatNimet: new Set(omat.map((j) => V.normJoukkue(j.nimi || j.id))), omatIdt: new Set(omat.map((j) => String(j.id))), nimiSeurat: I.nimiSeurat, idSeurat: I.idSeurat, aliakset };
  const lkm = {};
  docs.forEach((d) => { if (kok === 'toimenpiteet' && d.tila === 'korvattu') return; const v = V.viitteet(kok, d), lista = v.p.length ? v.p : v.t;
    lista.forEach((x) => { if (V.tmVJoukkueviite(x, ctx) === 'orpo') lkm[String(x)] = (lkm[String(x)] || 0) + 1; }); });
  return Object.keys(lkm).sort().map((arvo) => {
    const a = V.nimiAvain(arvo); let lahin = null, et = 1e9, tapa = 'etäisyys';
    omat.forEach((j) => { [j.nimi || j.id, j.id].forEach((n, i) => { const e = V.nimiAvain(n) === a && a ? 0 : etaisyys(a, V.nimiAvain(n)); if (e < et) { et = e; lahin = i === 0 ? (j.nimi || j.id) : j.id; } }); });
    if (et === 0) tapa = 'kirjoitusasu';
    return { arvo, lkm: lkm[arvo], lahin, etaisyys: et, tapa, joukkueId: (omat.find((j) => (j.nimi || j.id) === lahin || j.id === lahin) || {}).id };
  });
}
/** K1:n erittely: avoimet ehdotukset joukkueittain (sama avain kuin lib/tm_valvonta.js k1Avain: id ja nimi samaa ryhmää). Vain luvut; yli 6 ryhmille raaka-arvovariantit (nimiä, paikallinen). */
function k1Erittely(s, I) {
  const open = ((s.kokoelmat || {}).toimenpiteet || []).filter((t) => t.tila === 'ehdotus'), omat = s.joukkueet || [];
  const ctx = { sid: s.sid, omatNimet: new Set(omat.map((j) => V.normJoukkue(j.nimi || j.id))), omatIdt: new Set(omat.map((j) => String(j.id))), nimiSeurat: I.nimiSeurat, idSeurat: I.idSeurat };
  const nimiId = {}; omat.forEach((j) => { nimiId[V.normJoukkue(j.nimi || j.id)] = String(j.id); });
  const ryhmat = {};
  open.forEach((t) => { const n = V.normJoukkue(t.joukkue), id = ctx.omatIdt.has(String(t.joukkue)) ? String(t.joukkue) : nimiId[n], avain = id ? 'id:' + id : n; const r = (ryhmat[avain] = ryhmat[avain] || { lkm: 0, variantit: {}, luokka: V.tmVJoukkueviite(t.joukkue, ctx) }); r.lkm++; r.variantit[String(t.joukkue)] = (r.variantit[String(t.joukkue)] || 0) + 1; });
  return { avoimia: open.length, ryhmat: Object.keys(ryhmat).map((k) => ryhmat[k]).sort((a, b) => b.lkm - a.lkm) };
}
/** Kalenterin F1-populaation (harjoitukset/ottelut) dokumentit, joilta joukkueviite puuttuu: jakaumat kenttien NIMILLÄ ja enum-arvoilla, ei sisältöä. */
function kalenteriErittely(aineisto, ohi, nytMs) {
  const kaikki = []; aineisto.seurat.filter((s) => ohi.indexOf(s.sid) < 0).forEach((s) => ((s.kokoelmat || {}).kalenteri || []).forEach((d) => { if (V.F1_POPULAATIO.kalenteri(d)) kaikki.push(d); }));
  const puuttuu = kaikki.filter((d) => !V.tmVKenttavahti('x', 'kalenteri', [d]) || V.tmVKenttavahti('x', 'kalenteri', [d]).osuus === 0);
  const jak = (f) => { const o = {}; puuttuu.forEach((d) => { const k = f(d); o[k] = (o[k] || 0) + 1; }); return Object.keys(o).sort().map((k) => k + ' ' + o[k]).join(' · ') || '–'; };
  const vanha = (d) => { const t = ms(d.alkaa != null ? d.alkaa : d.pvm); return isNaN(t) ? 'päivä tuntematon' : (t < nytMs - 90 * 86400000 ? 'yli 90 pv sitten' : (t < nytMs ? 'alle 90 pv sitten' : 'tulevaisuudessa')); };
  const safe = (x) => (typeof x === 'string' && /^[a-z0-9_]{1,30}$/.test(x) ? x : (x == null ? '(puuttuu)' : '(muu)'));
  return { populaatio: kaikki.length, puuttuu: puuttuu.length, rivit: [
    '  tyyppi: ' + jak((d) => safe(String(d.tyyppi).toLowerCase())), '  lahde: ' + jak((d) => safe(d.lahde)), '  kohde.tyyppi: ' + jak((d) => safe(d.kohde && d.kohde.tyyppi)),
    '  kohde-kentät: ' + jak((d) => (d.kohde && typeof d.kohde === 'object' ? Object.keys(d.kohde).filter((k) => /^[A-Za-z0-9_]{1,30}$/.test(k)).sort().join('+') || '(tyhjä)' : '(ei kohdetta)')),
    '  nakyvyys: ' + jak((d) => safe(d.nakyvyys)), '  ajankohta: ' + jak(vanha), '  poistettu: ' + jak((d) => (d.poistettu === true ? 'kyllä' : 'ei')), '  pelaajat_id täytetty: ' + jak((d) => (Array.isArray(d.pelaajat_id) && d.pelaajat_id.length ? 'kyllä' : 'ei')),
    '  luoja_uid-ryhmä (järjestelmä/muu): ' + jak((d) => (/synkka|system|cron|import/i.test(String(d.luoja_uid || '')) ? 'järjestelmä' : (d.luoja_uid ? 'käyttäjä' : '(puuttuu)'))) ] };
}

function muotoile(aineisto, opts) {
  const rivit = [], ohi = opts.ohitetut;
  rivit.push('# Valvonta · diagnostiikka (vain luku) · löydösten luonne · ' + opts.projekti + ' · ' + new Date(aineisto.nytMs).toISOString());
  rivit.push('seuroja luettu ' + aineisto.seurat.length + ' · lukuvirheitä ' + aineisto.virheet.length);
  aineisto.virheet.forEach((v) => rivit.push('LUKUVIRHE seura=' + v.seura + ' koodi=' + v.koodi));

  const ryhmat = V.tmVE6Luonne(aineisto.seurat, TESTINIMET, TESTI_IDT);
  rivit.push('', '## E6: samaa tunnistetta käyttävät pelaajadokumentit — ryhmiä ' + ryhmat.length);
  rivit.push(pad('ryhmä', 7) + pad('dok', 5) + pad('seurat (dok)', 34) + pad('samassa seurassa', 18) + pad('testipelaajia', 15) + pad('arkistoituja', 14) + pad('testiarvo', 11) + pad('muoto', 16) + 'samanniminen');
  ryhmat.forEach((r, i) => rivit.push(pad(i + 1, 7) + pad(r.koko, 5) + pad(Object.keys(r.seurat).sort().map((s) => s + ':' + r.seurat[s]).join(' '), 34) + pad(kyllaEi(r.sisaSeura), 18) + pad(r.testipelaajia + ' / ' + r.koko, 15) + pad(r.arkistoituja + ' / ' + r.koko, 14) + pad(kyllaEi(r.testiarvo), 11) + pad(r.muoto, 16) + kyllaEi(r.samaNimi)));
  const kaikki = ryhmat.filter((r) => r.testipelaajia === r.koko).length, arkisto = ryhmat.filter((r) => r.arkistoituja > 0).length;
  rivit.push('yhteenveto: ryhmää, joissa KAIKKI dokumentit ovat §10-testipelaajia: ' + kaikki + ' / ' + ryhmat.length + ' · ryhmää, joissa jokin dokumentti on arkistoitu: ' + arkisto + ' · testiarvoisia tunnisteita: ' + ryhmat.filter((r) => r.testiarvo).length + ' · samannimisiä (siirto seurasta toiseen): ' + ryhmat.filter((r) => r.samaNimi).length);

  const I = V.tmVIndeksit(aineisto.seurat.map((s) => ({ sid: s.sid, joukkueet: s.joukkueet, pelaajat: (s.kokoelmat || {}).pelaajat, kayttajat: s.kayttajat })));
  rivit.push('', '## E1b: orpojen joukkueviitteiden luonne (dokumentteja per luokka; vain seurat, joissa orpoja on)');
  rivit.push(pad('seura', 18) + pad('kokoelma', 22) + lpad('orpoja', 8) + lpad('kirjoitusasu', 14) + lpad('osittainen', 12) + lpad('avainsana', 11) + lpad('id_muotoinen', 14) + lpad('muu', 6));
  let yht = 0;
  aineisto.seurat.filter((s) => ohi.indexOf(s.sid) < 0).forEach((s) => KOKOELMAT.forEach((kok) => {
    if (!(s.kokoelmat || {})[kok]) return;
    const o = V.tmVOrpojenLuonne(s.sid, kok, s.kokoelmat[kok], s.joukkueet, I); if (!o.orpoja) return; yht += o.orpoja;
    rivit.push(pad(s.sid, 18) + pad(kok, 22) + lpad(o.orpoja, 8) + lpad(o.luokat.kirjoitusasu, 14) + lpad(o.luokat.osittainen, 12) + lpad(o.luokat.avainsana, 11) + lpad(o.luokat.id_muotoinen, 14) + lpad(o.luokat.muu, 6));
  }));
  if (!yht) rivit.push('(ei orpoja)');

  const aliasRivit = opts.aliasRivit || [];
  rivit.push('', '## E1b/E1c: orpo viite → lähin oma joukkue (PAIKALLINEN: sisältää joukkueiden nimiä; ei hälytyksiin eikä PR-kuvaukseen)');
  rivit.push(pad('seura', 14) + pad('kokoelma', 22) + lpad('dok', 5) + '  ' + pad('orpo arvo', 34) + pad('lähin oma joukkue', 30) + pad('tapa', 14) + 'etäisyys');
  let pareja = 0;
  aineisto.seurat.filter((s) => ohi.indexOf(s.sid) < 0).forEach((s) => KOKOELMAT.forEach((kok) => {
    if (!(s.kokoelmat || {})[kok]) return;
    orpoParit(s, kok, I, aliasRivit).forEach((p) => { pareja++; rivit.push(pad(s.sid, 14) + pad(kok, 22) + lpad(p.lkm, 5) + '  ' + pad(JSON.stringify(p.arvo), 34) + pad(JSON.stringify(p.lahin), 30) + pad(p.tapa, 14) + p.etaisyys); });
  }));
  if (!pareja) rivit.push('(ei orpoja arvoja)');

  rivit.push('', '## K1-erittely: avoimet ehdotukset joukkueittain (K1 = suurin yhden joukkueen avointen määrä; WARN kun ≥ 7, ERROR kun ≥ 12; id ja nimi lasketaan samaksi joukkueeksi)');
  aineisto.seurat.filter((s) => ohi.indexOf(s.sid) < 0).forEach((s) => {
    const k = k1Erittely(s, I); if (!k.avoimia) return;
    rivit.push(pad(s.sid, 14) + 'avoimia ' + k.avoimia + ' · ryhmiä ' + k.ryhmat.length + ' · suurin ' + k.ryhmat[0].lkm + ' · ryhmäkoot ' + k.ryhmat.map((r) => r.lkm).join(','));
    k.ryhmat.filter((r) => r.lkm >= 7).forEach((r) => rivit.push('    suuri ryhmä ' + r.lkm + ' (viiteluokka ' + r.luokka + '): raaka-arvot ' + Object.keys(r.variantit).map((v) => JSON.stringify(v) + ' ×' + r.variantit[v]).join(', ')));
  });

  const ke = kalenteriErittely(aineisto, ohi, aineisto.nytMs);
  rivit.push('', '## Kalenterin F1: harjoitukset/ottelut, joilta joukkueviite puuttuu (' + ke.puuttuu + ' / ' + ke.populaatio + ')');
  ke.rivit.forEach((r) => rivit.push(r));
  return rivit.join('\n') + '\n';
}

async function ajaMain() {
  const admin = require(path.join(__dirname, '..', 'functions', 'node_modules', 'firebase-admin'));
  const argv = process.argv.slice(2), arg = (n, d) => { const o = argv.find((a) => a.indexOf('--' + n + '=') === 0); return o ? o.split('=').slice(1).join('=') : d; };
  const projekti = arg('projekti', 'talentmaster-pilot'), nyt = arg('nyt', null), nytMs = nyt ? Date.parse(nyt) : Date.now();
  if (isNaN(nytMs)) throw new Error('--nyt: ei kelpaa ISO-ajaksi');
  admin.initializeApp({ projectId: projekti });
  const aineisto = await L.kerayAineisto(admin.firestore(), { nytMs }), ohitetut = argv.indexOf('--kaikki') >= 0 ? [] : V.OHITETUT_SEURAT;
  const aliasRivit = JSON.parse(fs.readFileSync(path.join(__dirname, '..', 'functions', 'valvonta_aliakset.json'), 'utf8')).rivit;
  if (argv.indexOf('--alias-luonnos') >= 0) {   // JSON-luonnos aliaslistaksi: vain kirjoitusasu-parit (etäisyys 0); perustelu tyhjä → PM täyttää
    const I = V.tmVIndeksit(aineisto.seurat.map((s) => ({ sid: s.sid, joukkueet: s.joukkueet, pelaajat: (s.kokoelmat || {}).pelaajat, kayttajat: s.kayttajat }))), paiva = new Date(nytMs).toISOString().slice(0, 10), luonnos = [], nahty = {};
    aineisto.seurat.filter((s) => ohitetut.indexOf(s.sid) < 0).forEach((s) => KOKOELMAT.forEach((kok) => { if (!(s.kokoelmat || {})[kok]) return;
      orpoParit(s, kok, I, aliasRivit).filter((p) => p.tapa === 'kirjoitusasu' && p.joukkueId && !nahty[s.sid + '|' + p.arvo]).forEach((p) => { nahty[s.sid + '|' + p.arvo] = 1; luonnos.push({ seura: s.sid, alias: p.arvo, joukkue: p.joukkueId, perustelu: '', paiva }); }); }));
    process.stdout.write(JSON.stringify(luonnos, null, 2) + '\n'); return;
  }
  const ulos = muotoile(aineisto, { ohitetut, projekti, aliasRivit });
  const pii = R.tmVOnkoPii(ulos, TESTINIMET.concat(TESTI_IDT));   // vartija: ei sähköpostia, ei testipelaajien nimiä eikä id:itä
  if (!pii.ok) throw new Error('tuloste hylätty: PII-vartija (' + pii.rikkomukset.map((r) => r.tyyppi).join(',') + ')');
  process.stdout.write(ulos);
}
if (require.main === module) ajaMain().catch((e) => { console.error('Virhe: ' + R.tmVTurvallinenVirhe(e).koodi); process.exit(2); });
