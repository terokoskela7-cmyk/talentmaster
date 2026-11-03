#!/usr/bin/env node
/* ════════════════════════════════════════════════════════════════════════
   scripts/laskutus_alkutila.js — Laskutus L1a, briiffi §6: joukkueiden laskutustila seuroittain TERON LISTAN mukaan.
   · Kuiva-ajo oletuksena. --kirjoita kirjoittaa vasta, kun vahvistat kirjoittamalla KIRJOITA (tai --kylla).
   · EI oletusta "kaikki aktiivisiksi": listan aktiiviset → 'aktiivinen', seuran muut joukkueet → 'passiivinen'.
   · laskutus_aktivoitu asetetaan VAIN, jos sitä ei vielä ole (ensimmäinen aktivointi, PM 2.11. päätös 5) — olemassa olevaa ei muuteta.
   · laskutus_vastuuvalmentaja_ok: true listan joukkueille (SA:n ohitus, briiffi "2014 Blå"). Käyttäjien rooleja EI muuteta.
   · laskutus_asetukset/{sid}: listan asetukset (laskutettava, sopimus_alkaen, laskentaperuste…), validoidaan tmLaskutusAsetukset:lla.
   · seurat/{sid}.laskutus_sopimus (L1c, PM 3.11.): peili asetuksen laskutettava-arvosta samassa erässä — UI:n harmaa tila (selain ei lue laskutus_asetuksia). Rules v3.74: vain SA/palvelin kirjoittaa.
   · Tuntematon joukkue-id listassa → keskeytys (ei osittaista kirjoitusta). Demo-joukkueet ohitetaan. Ei pelaajadataa.
   Tunnistus: gcloud ADC (gcloud auth application-default login), EI palvelutiliavainta.
   Käyttö: node scripts/laskutus_alkutila.js [--lista scripts/laskutus_alkutila_sibbo.json] [--kirjoita] [--kylla]
════════════════════════════════════════════════════════════════════════ */
'use strict';
const fs = require('fs');
const path = require('path');
const L = require('../lib/tm_laskutus.js');
const PROJECT_ID = 'talentmaster-pilot';
const OLETUSLISTA = path.join(__dirname, 'laskutus_alkutila_sibbo.json');
const UID = 'skripti:laskutus_alkutila';
const PVM_RE = /^\d{4}-\d{2}-\d{2}$/;

/* Puhdas suunnitelma. lista = { seuraId, asetukset, aktivoitu:'YYYY-MM-DD', aktiiviset:[id | {id, aktivoitu}], vastuuvalmentaja_ok:[id] }, joukkueet = [{id, …}] */
function suunnittele(lista, joukkueet, tanaan) {
  const v = [];
  if (!lista || typeof lista.seuraId !== 'string' || !lista.seuraId) v.push('seuraId puuttuu');
  if (!Array.isArray(lista && lista.aktiiviset)) v.push('aktiiviset-lista puuttuu (ei oletusta "kaikki aktiivisiksi")');
  const as = L.tmLaskutusAsetukset(null, (lista && lista.asetukset) || {});
  if (!as.ok) v.push('asetukset: ' + as.virhe);
  if (lista && lista.asetukset) Object.keys(lista.asetukset).forEach((k) => { if (!(k in L.OLETUS)) v.push('tuntematon asetus: ' + k); });
  if (v.length) return { virheet: v };
  const docs = joukkueet.filter((d) => d.demo !== true), idt = new Set(docs.map((d) => d.id));
  const akt = new Map(lista.aktiiviset.map((x) => (typeof x === 'string' ? [x, lista.aktivoitu] : [x.id, x.aktivoitu || lista.aktivoitu])));
  const ok = new Set(lista.vastuuvalmentaja_ok || []);
  [...akt.keys(), ...ok].forEach((id) => { if (!idt.has(id)) v.push('tuntematon joukkue: ' + id); });
  akt.forEach((pvm, id) => { if (!PVM_RE.test(String(pvm || ''))) v.push(id + ': aktivointipäivä puuttuu tai ei ole YYYY-MM-DD'); });
  ok.forEach((id) => { if (!akt.has(id)) v.push(id + ': vastuuvalmentaja_ok vain aktiiviselle joukkueelle'); });
  if (v.length) return { virheet: v };
  const muutokset = [], ennallaan = [];
  docs.forEach((d) => {
    const tila = akt.has(d.id) ? 'aktiivinen' : 'passiivinen', u = {};
    if (d.laskutustila !== tila) { u.laskutustila = tila; u.laskutustila_muutettu = { pvm: tanaan, uid: UID }; }
    if (tila === 'aktiivinen' && !d.laskutus_aktivoitu) u.laskutus_aktivoitu = { pvm: akt.get(d.id), uid: UID };
    if (ok.has(d.id) && d.laskutus_vastuuvalmentaja_ok !== true) u.laskutus_vastuuvalmentaja_ok = true;
    (Object.keys(u).length ? muutokset : ennallaan).push({ id: d.id, nimi: d.nimi || d.id, nykyinen: d.laskutustila || '(puuttuu = passiivinen)', tila, u });
  });
  return { virheet: [], seuraId: lista.seuraId, asetukset: lista.asetukset, laskutus_sopimus: lista.asetukset.laskutettava === true, muutokset, ennallaan,
    yhteenveto: { aktiivisia: akt.size, passiivisia: docs.length - akt.size, muutoksia: muutokset.length, ohitettu_demo: joukkueet.length - docs.length } };
}

async function aja({ db, lista, kirjoita, kylla, loki = console.log, kysy, tanaan }) {
  const sRef = db.collection('seurat').doc(lista.seuraId);
  const snap = await sRef.collection('joukkueet').get();
  const p = suunnittele(lista, snap.docs.map((d) => Object.assign({ id: d.id }, d.data())), tanaan);
  if (p.virheet.length) { p.virheet.forEach((x) => loki('VIRHE: ' + x)); throw new Error('Lista hylätty (' + p.virheet.length + ' virhettä) — mitään ei kirjoitettu'); }
  loki('Seura ' + p.seuraId + ': laskutus_asetukset ← ' + JSON.stringify(p.asetukset));
  const sSnap = await sRef.get(), nykySopimus = sSnap.exists ? (sSnap.data() || {}).laskutus_sopimus : undefined;
  loki('  seurat/' + p.seuraId + '.laskutus_sopimus: ' + (nykySopimus === undefined ? '(puuttuu)' : nykySopimus) + ' → ' + p.laskutus_sopimus);
  p.muutokset.forEach((m) => loki('  ' + m.id + ' (' + m.nimi + '): ' + m.nykyinen + ' → ' + m.tila + '  ' + JSON.stringify(m.u)));
  p.ennallaan.forEach((m) => loki('  ' + m.id + ' (' + m.nimi + '): ennallaan ' + m.tila));
  loki('Yhteensä: ' + p.yhteenveto.aktiivisia + ' aktiivista, ' + p.yhteenveto.passiivisia + ' passiivista, ' + p.yhteenveto.muutoksia + ' joukkuemuutosta, demo ohitettu ' + p.yhteenveto.ohitettu_demo + '.');
  if (!kirjoita) { loki('Kuiva-ajo: ei kirjoitettu. Kirjoita lipulla --kirjoita.'); return Object.assign(p, { kirjoitettu: false }); }
  if (!kylla) { const v = await kysy('Kirjoitetaanko? Vahvista kirjoittamalla KIRJOITA: '); if (String(v).trim() !== 'KIRJOITA') { loki('Peruttu: ei kirjoitettu.'); return Object.assign(p, { kirjoitettu: false }); } }
  const b = db.batch();
  b.set(db.collection('laskutus_asetukset').doc(p.seuraId), p.asetukset, { merge: true });
  b.set(sRef, { laskutus_sopimus: p.laskutus_sopimus }, { merge: true });   // L1c: peili samassa erässä
  p.muutokset.forEach((m) => b.update(sRef.collection('joukkueet').doc(m.id), m.u));
  await b.commit();
  loki('✓ Kirjoitettu: asetukset + laskutus_sopimus + ' + p.muutokset.length + ' joukkuetta.');
  return Object.assign(p, { kirjoitettu: true });
}

function tanaanHelsinki() { return L.tmLaskutusPaiva(new Date()); }   // sama Helsingin päivä kuin Adminissa ja palvelimella

async function main() {
  const argv = process.argv.slice(2), i = argv.indexOf('--lista'), polku = i >= 0 ? argv[i + 1] : OLETUSLISTA;
  const lista = JSON.parse(fs.readFileSync(polku, 'utf8'));
  const admin = require('firebase-admin'); if (!admin.apps.length) admin.initializeApp({ credential: admin.credential.applicationDefault(), projectId: PROJECT_ID });
  const kysy = (q) => new Promise((r) => { const rl = require('readline').createInterface({ input: process.stdin, output: process.stdout }); rl.question(q, (v) => { rl.close(); r(v); }); });
  await aja({ db: admin.firestore(), lista, kirjoita: argv.includes('--kirjoita'), kylla: argv.includes('--kylla'), kysy, tanaan: tanaanHelsinki() });
}
module.exports = { suunnittele, aja, tanaanHelsinki, UID, OLETUSLISTA };
if (require.main === module) main().catch((e) => { console.error('VIRHE:', e.message); process.exit(1); });
