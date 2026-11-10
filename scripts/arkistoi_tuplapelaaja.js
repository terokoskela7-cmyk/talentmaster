#!/usr/bin/env node
/* arkistoi_tuplapelaaja.js — Projekti 07 / PR 2d: E6-tuplapelaajan arkistointi, KIRJOITTAVA (oletuksena KUIVA-AJO). Tero ajaa (gcloud ADC):
 *     ! node scripts/arkistoi_tuplapelaaja.js            (kuiva-ajo: vain suunnitelma, ei kirjoita mitään)
 *     ! node scripts/arkistoi_tuplapelaaja.js --aja       (kirjoittaa)        [--projekti=talentmaster-pilot]
 *
 * MITÄ: E6-ryhmässä (sama tunniste ≥ 2 pelaajadokumentilla) on yksi pelaaja kahtena dokumenttina. Arkistoidaan se dokumentti (B), jolla on VÄHEMMÄN dataa:
 * B:llä 0 alikokoelmadokumenttia ja toisella (A) > 0. Arkistointi = vakiintunut kenttäpari tila:'arkistoitu' + arkistoitu:serverTimestamp + arkistoija_uid (kuten Adminin seura-arkistointi).
 * EI POISTOA. Mitään muuta ei kosketa; arkistoitu dokumentti ei ole enää aktiivinen (valvonta: onAktiivinen).
 * HUOM: valvonnan E6 (tmVTarkistaGlobaali) laskee TÄLLÄ HETKELLÄ myös arkistoidut dokumentit törmäykseen → E6-rivi ei nollaudu arkistoinnilla ennen kuin E6 rajataan aktiivisiin (erillinen päätös).
 *
 * RYHMITTELY: JAETTU diag_e6_vertailu.js:n kanssa (e6_datamaara.ryhmittele): sama seura + sama normalisoitu nimi + sama tunniste, vain aktiiviset.
 * TERVEYS-ESTO: jos B:n terveys/-alikokoelmassa on count() > 0 → EI kirjoiteta (raportoidaan vain lukuna; sisältöä ei lueta).
 * EHDOKAS (kaikki ehdot):  ryhmässä täsmälleen 2 dokumenttia · molemmat aktiivisia · sama normalisoitu nimi · ei KPV:n §10-testipelaajaa (niille on korjaa_testitunniste.js)
 *   · A:lla > 0 ja B:llä 0 alikokoelmadokumenttia. Epäselvät ryhmät (muu koko, eri nimi, molemmilla dataa, ei kumallakaan dataa) raportoidaan lukuna eikä niihin kosketa.
 * KIRJOITUS: vain jos ehdokkaita on TÄSMÄLLEEN 1 (muuten ei kirjoiteta, vaikka --aja). Ennen kirjoitusta B:n alikokoelmat luetaan UUDELLEEN ja transaktiossa varmistetaan,
 *   että B on yhä aktiivinen ja sen tunniste on sama; jos B:ssä on enää yksikin alikokoelmadokumentti → ei kirjoiteta.
 * B:n KUTSUT / PIN-LINKKI raportoidaan lukuna (seurat/{s}/kutsut, huoltajakutsut, _pelaajaPin) — ei estä, ei poista; Tero päättää ennen --aja:a.
 * HUOM (CLAUDE.md §0): jos B on suojattu alaikäinen (ei §10-testipelaaja), kirjoitus on PM:n nimenomainen toimeksianto — vahvista ennen --aja:a.
 * Tuloste: vain lukumäärät; ei nimiä, ei tunnisteita, ei id:itä. */
'use strict';
const path = require('path');
const V = require(path.join(__dirname, '..', 'lib', 'tm_valvonta.js'));
const R = require(path.join(__dirname, '..', 'lib', 'tm_valvonta_raportti.js'));
const D = require(path.join(__dirname, 'e6_datamaara.js'));   // JAETTU laskenta diag_e6_vertailu.js:n kanssa
const turva = (m) => Object.assign(new Error(m), { turva: true });
const { tunnisteArvo, nimiAvain } = D;
const aktiivinen = (d) => V.onAktiivinen(d || {});

/** Lukee pelaajat (vain tarvittavat kentät) → [{ sid, pid, d }]. */
async function lue(db) {
  const sidit = (await db.collection('seurat').select().get()).docs.map((x) => x.id), ulos = [];
  for (const sid of sidit) {
    const snap = await db.collection('seurat').doc(sid).collection('pelaajat').select('etunimi', 'sukunimi', 'nimi', 'tunniste', 'palloId', 'palloID', 'tila', 'arkistoitu', 'poistettu', 'aktiivinen').get();
    snap.docs.forEach((x) => ulos.push({ sid, pid: x.id, d: x.data() || {} }));
  }
  return ulos;
}
/** Pelaajan dokumenttimäärä (alikokoelmat + testitapahtumat/TID/tulokset/PID) — sama laskenta kuin diag_e6_vertailu.js (e6_datamaara.js). */
async function alikokoelmat(db, sid, pid, valimuisti) { return (await D.datamaara(db, sid, pid, valimuisti)).yht; }
/** Suunnitelman puhdas ydin: ryhmat = E6-ryhmät [{ jasenet:[{sid,pid,d,alikok}] }]; testi(pid,d) → bool. → { ehdokkaat:[{A,B}], epaselvat:{muuKoko, eriNimi, testipelaaja, eiAktiivisia, ilmanEroa} } */
function suunnittele(ryhmat, testi) {
  const ehdokkaat = [], erittelyt = [], ep = { muuKoko: 0, eriNimi: 0, testipelaaja: 0, eiAktiivisia: 0, ilmanEroa: 0 };
  ryhmat.forEach((r) => {
    const j = r.jasenet, erit = (tulos) => erittelyt.push({ tulos, jasenet: j.slice().sort((a, b) => b.alikok - a.alikok) });
    if (j.length !== 2) { ep.muuKoko++; erit('muu ryhmäkoko'); return; }
    if (!j.every((x) => aktiivinen(x.d))) { ep.eiAktiivisia++; erit('ei-aktiivinen'); return; }
    if (j.some((x) => testi && testi(x.pid, x.d))) { ep.testipelaaja++; erit('§10-testipelaaja'); return; }
    const n0 = nimiAvain(j[0].d); if (!n0 || n0 !== nimiAvain(j[1].d)) { ep.eriNimi++; erit('eri nimi'); return; }
    const sorted = j.slice().sort((a, b) => b.alikok - a.alikok), A = sorted[0], B = sorted[1];
    if (!(A.alikok > 0 && B.alikok === 0)) { ep.ilmanEroa++; erit('ei dataeroa'); return; }
    erit('ehdokas'); ehdokkaat.push({ A, B });
  });
  return { ehdokkaat, erittelyt, epaselvat: ep };
}
async function kutsuLuvut(db, sid, pid) {
  const k = (await db.collection('seurat').doc(sid).collection('kutsut').where('pelaajaId', '==', pid).get()).size;
  const h = (await db.collection('huoltajakutsut').where('seuraId', '==', sid).where('pelaajaId', '==', pid).get()).size;
  const p = (await db.collection('_pelaajaPin').doc(sid + '_' + pid).get()).exists ? 1 : 0;
  return { kutsut: k, huoltajakutsut: h, pin: p };
}
async function ryhmat(db, pelaajat) {
  const valimuisti = {}, ulos = [];
  for (const g of D.ryhmittele(pelaajat)) {
    const jasenet = [];
    for (const m of g.jasenet) { const dm = await D.datamaara(db, m.sid, m.pid, valimuisti); jasenet.push({ sid: m.sid, pid: m.pid, d: m.d, alikok: dm.yht, alik: dm.alik, johdettu: dm.johdettu, terveys: await D.terveysLkm(db, m.sid, m.pid), tunniste: m.tunniste }); }
    ulos.push({ jasenet });
  }
  return ulos;
}
/** Kirjoittaa B:n arkistoiduksi. Tarkistaa UUDELLEEN: B:llä yhä 0 alikokoelmadokumenttia, aktiivinen, sama tunniste. */
async function kirjoita(db, FV, e) {
  const nyt = await alikokoelmat(db, e.B.sid, e.B.pid);
  if (nyt !== 0) throw turva('B:ssä on nyt ' + nyt + ' alikokoelmadokumenttia — ei kirjoiteta');
  const th = await D.terveysLkm(db, e.B.sid, e.B.pid);
  if (th > 0) throw turva('B:llä on terveys-dokumentteja (' + th + ') — ei kirjoiteta');
  const ref = db.collection('seurat').doc(e.B.sid).collection('pelaajat').doc(e.B.pid);
  await db.runTransaction(async (tx) => {
    const snap = await tx.get(ref); if (!snap.exists) throw turva('dokumenttia ei enää ole');
    const d = snap.data() || {};
    if (!aktiivinen(d)) throw turva('B ei ole enää aktiivinen — ei kirjoiteta');
    if (tunnisteArvo(d) !== e.B.tunniste) throw turva('B:n tunniste muuttunut — ei kirjoiteta');
    tx.update(ref, { tila: 'arkistoitu', arkistoitu: FV.serverTimestamp(), arkistoija_uid: null });
  });
}
function raportti(s, aja, kirjoitettu, kutsut) {
  const r = ['# arkistoi_tuplapelaaja · ' + (aja ? 'AJO' : 'KUIVA-AJO (ei kirjoita)') + ' · E6-ryhmiä ' + s.ryhmia];
  const e = s.epaselvat;
  r.push('ehdokkaita (2 aktiivista dokumenttia, sama nimi, A: dataa / B: 0 alikokoelmadokumenttia): ' + s.ehdokkaat.length + ' · ohitettu: muu ryhmäkoko ' + e.muuKoko + ', ei-aktiivinen ' + e.eiAktiivisia + ', §10-testipelaaja ' + e.testipelaaja + ', eri nimi ' + e.eriNimi + ', ei dataeroa ' + e.ilmanEroa);
  s.ehdokkaat.forEach((c, i) => {
    r.push('  #' + (i + 1) + ' seurat: A ' + c.A.sid + ' (alikokoelmadokumentteja ' + c.A.alikok + ') · B ' + c.B.sid + ' (alikokoelmadokumentteja ' + c.B.alikok + ')'
      + (kutsut && kutsut[i] ? ' · B:n kutsuja ' + kutsut[i].kutsut + ', huoltajakutsuja ' + kutsut[i].huoltajakutsut + ', PIN-linkkejä ' + kutsut[i].pin : ''));
  });
  if (!s.ehdokkaat.length) r.push('  (ei arkistoitavaa)');
  const nm = (k) => (/^[A-Za-z0-9_*\/]{1,40}$/.test(k) ? k : '(muu)');
  (s.erittelyt || []).forEach((g, i) => {
    r.push('  ryhmä ' + (i + 1) + ' [' + g.tulos + ']:');
    g.jasenet.forEach((m, j) => r.push('    ' + String.fromCharCode(65 + j) + ' (seura ' + m.sid + '): yht. ' + m.alikok + ' · ' + (Object.keys(m.alik || {}).sort().map((k) => nm(k) + ' ' + m.alik[k]).concat(Object.keys(m.johdettu || {}).sort().map((k) => nm(k) + ' ' + m.johdettu[k] + ' (johdettu)')).join(', ') || '(ei alikokoelmia)') + ' · terveys ' + (m.terveys == null ? '?' : m.terveys)));
  });
  if (s.ehdokkaat.some((c) => c.B.terveys > 0)) r.push('HUOM: B:llä on terveys-dokumentteja → --aja ei kirjoita (terveys-esto).');
  if (s.ehdokkaat.length > 1) r.push('HUOM: ehdokkaita > 1 → --aja ei kirjoita mitään (tarkista ryhmät ensin).');
  if (kirjoitettu != null) r.push('arkistoitu ' + kirjoitettu + ' dokumenttia');
  return r.join('\n') + '\n';
}
async function ajaMain() {
  const admin = require(path.join(__dirname, '..', 'functions', 'node_modules', 'firebase-admin'));
  const argv = process.argv.slice(2), aja = argv.indexOf('--aja') >= 0, p = argv.find((a) => a.indexOf('--projekti=') === 0);
  admin.initializeApp({ projectId: p ? p.split('=')[1] : 'talentmaster-pilot' });
  const db = admin.firestore(), K = require(path.join(__dirname, 'korjaa_testitunniste.js'));
  const pel = await lue(db), rr = await ryhmat(db, pel), s = suunnittele(rr, K.onTestipelaaja); s.ryhmia = rr.length;
  const kutsut = []; for (const c of s.ehdokkaat) kutsut.push(await kutsuLuvut(db, c.B.sid, c.B.pid));
  let kirjoitettu = null;
  if (aja && s.ehdokkaat.length === 1 && !(s.ehdokkaat[0].B.terveys > 0)) { await kirjoita(db, admin.firestore.FieldValue, s.ehdokkaat[0]); kirjoitettu = 1; }
  else if (aja) kirjoitettu = 0;
  const ulos = raportti(s, aja, kirjoitettu, kutsut), pii = R.tmVOnkoPii(ulos, []);
  if (!pii.ok) throw turva('tuloste hylätty: PII-vartija');
  process.stdout.write(ulos);
}
module.exports = { suunnittele, kirjoita, raportti, alikokoelmat, ryhmat, tunnisteArvo };
if (require.main === module) ajaMain().catch((e) => { console.error('Virhe: ' + (e && e.turva ? e.message : R.tmVTurvallinenVirhe(e).koodi)); process.exit(2); });
