#!/usr/bin/env node
/* diag_e6_vertailu.js — Projekti 07 / PR 2c: E6-ryhmät, joissa SAMASSA seurassa on kaksi (tai useampi) samannimistä pelaajadokumenttia samalla tunnisteella. VAIN LUKU (gcloud ADC).
 * Tero ajaa:  ! node scripts/diag_e6_vertailu.js [--projekti=talentmaster-pilot]
 * Vertaa dokumentteja keskenään: kummassa on enemmän dataa (alikokoelmien dokumenttimäärät, kenttien määrä), onko suostumus/huoltajaEmail/PIN olemassa (vain kyllä/ei, ei arvoja).
 * Tuloste: vain lukumäärät ja kyllä/ei-merkinnät; dokumentit nimetään A (enemmän dataa) ja B; ei nimiä, tunnisteita eikä id:itä. EI KORJAUSTA ennen PM:n päätöstä. */
'use strict';
const path = require('path');
const V = require(path.join(__dirname, '..', 'lib', 'tm_valvonta.js'));
const R = require(path.join(__dirname, '..', 'lib', 'tm_valvonta_raportti.js'));
const L = require(path.join(__dirname, '..', 'functions', 'valvonta_luku.js'));
const D = require(path.join(__dirname, 'e6_datamaara.js'));   // JAETTU laskenta arkistoi_tuplapelaaja.js:n kanssa (terveys/ jätetään kokonaan lukematta, GDPR Art. 9)
const kyllaEi = (b) => (b ? 'kyllä' : 'ei'), pad = (s, n) => String(s).padEnd(n);
const onArvo = (v) => v != null && v !== '' && !(Array.isArray(v) && !v.length);

/** Yhden dokumentin tiivistelmä (vain lukuja ja kyllä/ei). doc = täysi data, db = Admin Firestore. */
async function tiivista(db, sid, pid, d, valimuisti) {
  const dm = await D.datamaara(db, sid, pid, valimuisti), alik = dm.alik, yht = dm.yht;
  const kentat = Object.keys(d).filter((k) => onArvo(d[k])).length;
  return { alik, alikYht: yht, kentat, tavuja: JSON.stringify(d).length, suostumusTila: /^[a-z_]{1,20}$/.test(String(d.suostumusTila)) ? String(d.suostumusTila) : (d.suostumusTila ? '(muu)' : '(puuttuu)'),
    suostumusOlemassa: onArvo(d.suostumus) || onArvo(d.suostumusAnnettu) || d.suostumusTila === 'annettu', huoltajaEmail: onArvo(d.huoltajaEmail), pin: onArvo(d.pin) || onArvo(d._pelaajaPin),
    lahde: /^[a-z_]{1,20}$/.test(String(d.lahde)) ? String(d.lahde) : '(puuttuu)', arkistoitu: d.arkistoitu === true || d.poistettu === true || d.aktiivinen === false, joukkueita: Array.isArray(d.joukkueet) ? d.joukkueet.length : 0, pisteet: score(alik, kentat) };
}
function score(alik, kentat) { return Object.keys(alik).reduce((a, k) => a + alik[k], 0) * 10 + kentat; }

/** Ryhmät: sama seura + sama normalisoitu nimi + sama tunniste. → [{ sid, jasenet:[{pid, d}] }] (sisäinen, id:t vain muistissa) */
function ryhmat(aineisto) {
  const out = [];
  V.tmVE6Jasenet(aineisto.seurat).forEach((g) => {
    const per = {}; g.jasenet.forEach((m) => { const k = m.sid + '|' + m.nimi; (per[k] = per[k] || []).push(m); });
    Object.keys(per).forEach((k) => { if (per[k].length >= 2 && per[k][0].nimi) out.push({ sid: per[k][0].sid, jasenet: per[k] }); });
  });
  return out;
}
async function vertaa(db, aineisto) {
  const rivit = [], haettu = {}, valimuisti = {};
  (aineisto.seurat || []).forEach((s) => { haettu[s.sid] = {}; ((s.kokoelmat || {}).pelaajat || []).forEach((p) => { haettu[s.sid][p._id] = p; }); });
  const rs = ryhmat(aineisto);
  rivit.push('# E6: samannimiset pelaajadokumentit samalla tunnisteella samassa seurassa (vain luku) · ryhmiä ' + rs.length);
  for (let i = 0; i < rs.length; i++) {
    const r = rs[i], tiivisteet = [];
    for (const m of r.jasenet) { const d = Object.assign({}, haettu[r.sid][m.pid]); delete d._id; tiivisteet.push(await tiivista(db, r.sid, m.pid, d, valimuisti)); }
    tiivisteet.sort((a, b) => b.pisteet - a.pisteet);
    rivit.push('', 'ryhmä ' + (i + 1) + ' · seura ' + r.sid + ' · dokumentteja ' + tiivisteet.length);
    rivit.push(pad('', 26) + tiivisteet.map((t, j) => pad(String.fromCharCode(65 + j) + (j === 0 ? ' (enemmän dataa)' : ''), 20)).join(''));
    const rivi = (nimi, f) => rivit.push(pad(nimi, 26) + tiivisteet.map((t) => pad(f(t), 20)).join(''));
    Array.from(new Set([].concat(...tiivisteet.map((t) => Object.keys(t.alik))))).sort().forEach((k) => rivi(k === D.TULOKSET ? 'testitapahtumatulokset' : 'alikokoelma ' + k, (t) => t.alik[k] || 0)); rivi('alikokoelmadokumentteja yht.', (t) => t.alikYht); rivi('kenttiä (ei tyhjiä)', (t) => t.kentat); rivi('koko (tavua)', (t) => t.tavuja);
    rivi('suostumusTila', (t) => t.suostumusTila); rivi('suostumus olemassa', (t) => kyllaEi(t.suostumusOlemassa)); rivi('huoltajaEmail olemassa', (t) => kyllaEi(t.huoltajaEmail)); rivi('PIN olemassa', (t) => kyllaEi(t.pin));
    rivi('lähde', (t) => t.lahde); rivi('arkistoitu/poistettu', (t) => kyllaEi(t.arkistoitu)); rivi('joukkueita (joukkueet[])', (t) => t.joukkueita);
    const a = tiivisteet[0], b = tiivisteet[1];
    rivit.push('→ A:ssa on ' + (a.alikYht - b.alikYht) + ' alikokoelmadokumenttia enemmän kuin B:ssä' + (tiivisteet.length > 2 ? ' (vertailu A–B; muita ' + (tiivisteet.length - 2) + ')' : '') + (a.alikYht === b.alikYht ? ' (yhtä paljon: ratkaisu vaatii päätöksen)' : '') + '. EI KORJAUSTA ennen PM:n päätöstä.');
  }
  if (!rs.length) rivit.push('(ei samannimisiä törmäyksiä samassa seurassa)');
  return rivit.join('\n') + '\n';
}
async function ajaMain() {
  const admin = require(path.join(__dirname, '..', 'functions', 'node_modules', 'firebase-admin'));
  const p = process.argv.slice(2).find((a) => a.indexOf('--projekti=') === 0);
  admin.initializeApp({ projectId: p ? p.split('=')[1] : 'talentmaster-pilot' });
  const db = admin.firestore(), aineisto = await L.kerayAineisto(db, { nytMs: Date.now() }), ulos = await vertaa(db, aineisto);
  const pii = R.tmVOnkoPii(ulos, []); if (!pii.ok) throw Object.assign(new Error('tuloste hylätty: PII-vartija'), { turva: true });
  process.stdout.write(ulos);
}
module.exports = { vertaa, ryhmat, tiivista };
if (require.main === module) ajaMain().catch((e) => { console.error('Virhe: ' + (e && e.turva ? e.message : R.tmVTurvallinenVirhe(e).koodi)); process.exit(2); });
