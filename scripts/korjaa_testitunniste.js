#!/usr/bin/env node
/* korjaa_testitunniste.js — Projekti 07 / PR 2c: E6-korjaus, KIRJOITTAVA (oletuksena KUIVA-AJO). Tero ajaa:
 *     ! node scripts/korjaa_testitunniste.js            (kuiva-ajo: vain suunnitelma, ei kirjoita mitään)
 *     ! node scripts/korjaa_testitunniste.js --aja       (kirjoittaa)        [--projekti=talentmaster-pilot]   (gcloud ADC)
 *
 * MITÄ: vaihtaa KPV:n CLAUDE.md §10 -nimetyn testipelaajan tunnisteen (tunniste / palloId / palloID, vain ne kentät joissa vanha arvo on) uniikkiin testiarvoon 99000001…,
 * kun sama tunniste on jollakin toisella pelaajadokumentilla (E6). MUUTA EI KOSKETA: ei SJK:n eikä muiden seurojen dokumentteja, ei muita KPV-pelaajia, ei alikokoelmia (havainnot-kopiot jne.).
 *
 * TURVAT (CLAUDE.md §0: suojatut alaikäiset vain luku, kirjoitukset vain nimetyille KPV-testipelaajille):
 *  · kirjoituskohde on AINA seurat/kpv/pelaajat/{id}; nimi tarkistetaan uudelleen transaktiossa juuri ennen kirjoitusta (nimi §10-listalla TAI doc-id on Topiaksen);
 *  · uusi arvo varmistetaan uniikiksi sekä koko luetusta aineistosta että erillisillä kyselyillä jokaisen seuran tunniste/palloId/palloID-kenttiin juuri ennen kirjoitusta;
 *  · vanha arvo on transaktiossa vielä sama kuin suunnitellessa, muuten ei kirjoiteta;
 *  · jos ryhmässä on useampi KPV:n §10-pelaaja (epäselvä), ei kirjoiteta.
 * Tuloste: vain lukumäärät ja uusi testiarvo; ei nimiä, ei vanhoja tunnisteita, ei id:itä. SJK-puoli raportoidaan lukuna: onko törmäävän dokumentin tunniste testiarvoinen
 * (jolloin Tero voi pyytää SJK:lta oikean PalloID:n). HUOM: testipelaajan PalloID-kirjautuminen vaihtuu uuteen arvoon. */
'use strict';
const path = require('path');
const V = require(path.join(__dirname, '..', 'lib', 'tm_valvonta.js'));
const R = require(path.join(__dirname, '..', 'lib', 'tm_valvonta_raportti.js'));

const KENTAT = ['tunniste', 'palloId', 'palloID'];
const TESTINIMET = ['Topias O´Koskela', 'Toppari Testi', 'Testi Pelaaja', 'Testi Test', 'Tero Testaaja'], TESTI_IDT = ['m93GBdOaGCUuenMiCL0I'];
const SALLITTU_SEURA = 'kpv', UUSI_ALKU = 99000001;
const turva = (m) => Object.assign(new Error(m), { turva: true });   // vain omat viestit tulostetaan; Firestore-virheestä vain koodi

const tunnisteArvo = (d) => { for (const k of KENTAT) if (d && d[k] != null && d[k] !== '') return String(d[k]); return null; };
const onTestipelaaja = (pid, d) => TESTI_IDT.indexOf(String(pid)) >= 0 || TESTINIMET.map(V.nimiAvain).indexOf(V.nimiAvain((d && d.nimi) || (((d && d.etunimi) || '') + ' ' + ((d && d.sukunimi) || '')))) >= 0;

/** Lukee kaikkien seurojen pelaajat (vain tarvittavat kentät). → [{ sid, pid, d }] */
async function lue(db) {
  const sidit = (await db.collection('seurat').select().get()).docs.map((x) => x.id), ulos = [];
  for (const sid of sidit) {
    const snap = await db.collection('seurat').doc(sid).collection('pelaajat').select('etunimi', 'sukunimi', 'nimi', 'tunniste', 'palloId', 'palloID').get();
    snap.docs.forEach((x) => ulos.push({ sid, pid: x.id, d: x.data() || {} }));
  }
  return { sidit, pelaajat: ulos };
}
/** Suunnitelma (puhdas, ei kirjoita): ehdokkaat = KPV:n §10-pelaajat joiden tunniste on myös jollakin toisella dokumentilla. */
function suunnittele(aineisto) {
  const kaikki = aineisto.pelaajat, kaytossa = {};
  kaikki.forEach((p) => KENTAT.forEach((k) => { if (p.d[k] != null && p.d[k] !== '') kaytossa[String(p.d[k])] = 1; }));
  const ehdokkaat = [], epaselvat = []; let seuraava = UUSI_ALKU;
  kaikki.filter((p) => p.sid === SALLITTU_SEURA && onTestipelaaja(p.pid, p.d)).forEach((p) => {
    const vanha = tunnisteArvo(p.d); if (!vanha) return;
    const toiset = kaikki.filter((q) => (q.sid !== p.sid || q.pid !== p.pid) && KENTAT.some((k) => q.d[k] != null && String(q.d[k]) === vanha));
    if (!toiset.length) return;
    if (toiset.some((q) => q.sid === SALLITTU_SEURA && onTestipelaaja(q.pid, q.d))) { epaselvat.push({ toisetLkm: toiset.length }); return; }
    while (kaytossa[String(seuraava)]) seuraava++;
    const uusi = String(seuraava); kaytossa[uusi] = 1; seuraava++;
    ehdokkaat.push({ sid: p.sid, pid: p.pid, vanha, uusi, kentat: KENTAT.filter((k) => p.d[k] != null && String(p.d[k]) === vanha),
      toisetSeurat: toiset.reduce((o, q) => { o[q.sid] = (o[q.sid] || 0) + 1; return o; }, {}), toisetTestiarvoisia: V.tmVOnTestiarvo(vanha) ? toiset.length : 0, toisetLkm: toiset.length });
  });
  return { ehdokkaat, epaselvat, luettu: kaikki.length, seuroja: aineisto.sidit.length };
}
/** Kirjoittaa yhden ehdokkaan (transaktio + uniikkiustarkistus). Heittää, jos jokin turva ei täyty. */
async function kirjoita(db, aineisto, e) {
  if (e.sid !== SALLITTU_SEURA) throw turva('vain KPV');
  for (const sid of aineisto.sidit) for (const k of KENTAT) {   // uusi arvo ei saa löytyä mistään (juuri ennen kirjoitusta)
    const q = await db.collection('seurat').doc(sid).collection('pelaajat').where(k, '==', e.uusi).get();
    if (q.docs.length) throw turva('uusi arvo ei ole uniikki (' + k + ')');
    const qn = await db.collection('seurat').doc(sid).collection('pelaajat').where(k, '==', Number(e.uusi)).get();
    if (qn.docs.length) throw turva('uusi arvo ei ole uniikki (' + k + ' numerona)');
  }
  const ref = db.collection('seurat').doc(SALLITTU_SEURA).collection('pelaajat').doc(e.pid);
  await db.runTransaction(async (tx) => {
    const snap = await tx.get(ref); if (!snap.exists) throw turva('dokumenttia ei enää ole');
    const d = snap.data() || {};
    if (!onTestipelaaja(e.pid, d)) throw turva('nimi ei ole §10-listalla — ei kirjoiteta');
    const paivitys = {}; KENTAT.forEach((k) => { if (d[k] != null && String(d[k]) === e.vanha) paivitys[k] = typeof d[k] === 'number' ? Number(e.uusi) : e.uusi; });
    if (!Object.keys(paivitys).length) throw turva('vanha arvo muuttunut — ei kirjoiteta');
    tx.update(ref, paivitys);
  });
}
function raportti(s, aja, kirjoitettu) {
  const r = ['# korjaa_testitunniste · ' + (aja ? 'AJO' : 'KUIVA-AJO (ei kirjoita)') + ' · pelaajadokumentteja luettu ' + s.luettu + ' · seuroja ' + s.seuroja];
  r.push('ehdokkaita (KPV:n §10-testipelaajia, joiden tunniste törmää toiseen dokumenttiin): ' + s.ehdokkaat.length + ' · epäselviä (useampi §10-pelaaja ryhmässä, ohitetaan): ' + s.epaselvat.length);
  s.ehdokkaat.forEach((e, i) => {
    r.push('  #' + (i + 1) + ' kentät joissa vaihdetaan: ' + e.kentat.join(', ') + ' → uusi testiarvo ' + e.uusi + ' (uniikki koko aineistossa)');
    r.push('      törmäävät muut dokumentit: ' + Object.keys(e.toisetSeurat).sort().map((k) => k + ':' + e.toisetSeurat[k]).join(' ') + ' (EIVÄT muutu) · niistä tunniste testiarvoinen: ' + (e.toisetTestiarvoisia ? 'KYLLÄ ' + e.toisetTestiarvoisia + ' / ' + e.toisetLkm + ' → pyydä oikea PalloID seuralta' : 'ei'));
  });
  if (!s.ehdokkaat.length) r.push('  (ei muutettavaa)');
  if (kirjoitettu != null) r.push('kirjoitettu ' + kirjoitettu + ' dokumenttia');
  return r.join('\n') + '\n';
}
async function ajaMain() {
  const admin = require(path.join(__dirname, '..', 'functions', 'node_modules', 'firebase-admin'));
  const argv = process.argv.slice(2), aja = argv.indexOf('--aja') >= 0, p = argv.find((a) => a.indexOf('--projekti=') === 0);
  admin.initializeApp({ projectId: p ? p.split('=')[1] : 'talentmaster-pilot' });
  const db = admin.firestore(), aineisto = await lue(db), s = suunnittele(aineisto);
  let kirjoitettu = null;
  if (aja) { kirjoitettu = 0; for (const e of s.ehdokkaat) { await kirjoita(db, aineisto, e); kirjoitettu++; } }
  const ulos = raportti(s, aja, kirjoitettu), pii = R.tmVOnkoPii(ulos, TESTINIMET.concat(TESTI_IDT).concat(s.ehdokkaat.map((e) => e.vanha)));
  if (!pii.ok) throw turva('tuloste hylätty: PII-vartija');
  process.stdout.write(ulos);
}
module.exports = { lue, suunnittele, kirjoita, raportti, onTestipelaaja, UUSI_ALKU };
if (require.main === module) ajaMain().catch((e) => { console.error('Virhe: ' + (e && e.turva ? e.message : R.tmVTurvallinenVirhe(e).koodi)); process.exit(2); });
