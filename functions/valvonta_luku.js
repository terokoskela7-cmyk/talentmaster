/* ════════════════════════════════════════════════════════════════════════
   valvonta_luku.js — Projekti 07 / PR 2: valvonnan LUKUkerros (VAIN LUKU: .get() / .where() / .select(); ei yhtään kirjoituskutsua — tests/valvonta_kirjoitusvartija.test.js).
   Ottaa `db`:n parametrina (admin.firestore() tai testin vale-db), joten sekä scripts/valvonta_aja.js (ADC, käsin) että PR 3:n ajastettu funktio käyttävät samaa lukua.
   Palauttaa aineiston lib/tm_valvonta.js:n tmVAjaKaikki-funktiolle. Virheistä talteen vain seura-id ja virhekoodi (tmVTurvallinenVirhe) — ei message-kenttää, jossa voi olla dokumentin polku.
   · kerayAineisto(db, { nytMs }) → { seurat:[{sid, joukkueet, kayttajat, kokoelmat}], auditRivit, virheet:[{seura, koodi}] } */
'use strict';
const V = require('./tm_valvonta.js');
const R = require('./tm_valvonta_raportti.js');

const SEURAN_KOKOELMAT = ['toimenpiteet', 'pelaajat', 'kalenteri', 'viestit', 'seuranta_kuittaukset', 'kooste_joukkue', 'havainnot', 'harjoitusarvioinnit', 'mentoroinnit', 'kayttajat'];
const VIIKKO_MS = 7 * 86400000;
const docit = (snap) => snap.docs.map((d) => Object.assign({ _id: d.id }, d.data() || {}));

/** Seuran kaikki valvottavat kokoelmat rinnakkain. Palauttaa { sid, joukkueet:[{id,nimi}], kayttajat:[uid], kokoelmat:{ nimi: [doc+_id] } }. */
async function lueSeura(db, sid) {
  const S = db.collection('seurat').doc(sid);
  const [js, ...muut] = await Promise.all([S.collection('joukkueet').get()].concat(SEURAN_KOKOELMAT.map((k) => S.collection(k).get())));
  const kokoelmat = {};
  SEURAN_KOKOELMAT.forEach((k, i) => { kokoelmat[k] = docit(muut[i]); });
  return { sid, joukkueet: js.docs.map((d) => ({ id: d.id, nimi: (d.data() || {}).nimi || d.id })), kayttajat: kokoelmat.kayttajat.map((u) => u._id), kokoelmat };
}
/** sisainen on pelaajan alikokoelma: yksi collectionGroup-luku, ryhmittely polun seura-osasta. Säilytetään vain seuraId-kenttä (E3). */
async function lueSisainen(db) {
  const snap = await db.collectionGroup('sisainen').get();
  const ulos = {};
  snap.docs.forEach((d) => { const p = String(d.ref && d.ref.path || '').split('/'); if (p[0] !== 'seurat' || !p[1]) return; (ulos[p[1]] = ulos[p[1]] || []).push({ _id: d.id, seuraId: (d.data() || {}).seuraId }); });
  return ulos;
}
/** audit: viimeisen 7 pv estotapahtumat (indeksi toiminto + aikaleima). Säilytetään vain toiminto, seuraId ja aika. */
async function lueAuditEstot(db, nytMs) {
  const alku = new Date(nytMs - VIIKKO_MS), ulos = [];
  for (const toiminto of ['kayttaja_toisen_seuran_estetty', 'kayttaja_rooli_estetty']) {
    const snap = await db.collection('audit').where('toiminto', '==', toiminto).where('aikaleima', '>=', alku).get();
    snap.docs.forEach((d) => { const x = d.data() || {}, t = x.aikaleima; ulos.push({ toiminto, seuraId: x.seuraId ? String(x.seuraId) : null, aikaleimaMs: t && typeof t.toMillis === 'function' ? t.toMillis() : Number(t) || 0 }); });
  }
  return ulos;
}
/** Koko aineisto. Yhden seuran virhe ei kaada muita: seura jää pois aineistosta ja kirjataan virheisiin (seura + koodi). */
async function kerayAineisto(db, opts) {
  const nytMs = (opts && opts.nytMs) || Date.now(), seurat = [], virheet = [];
  const sidit = (await db.collection('seurat').select().get()).docs.map((d) => d.id);
  for (const sid of sidit) {
    try { seurat.push(await lueSeura(db, sid)); } catch (e) { virheet.push({ seura: sid, koodi: R.tmVTurvallinenVirhe(e).koodi }); }
  }
  let sis = {}, auditRivit = [];
  try { sis = await lueSisainen(db); } catch (e) { virheet.push({ seura: '-', koodi: 'sisainen_' + R.tmVTurvallinenVirhe(e).koodi }); }
  try { auditRivit = await lueAuditEstot(db, nytMs); } catch (e) { virheet.push({ seura: '-', koodi: 'audit_' + R.tmVTurvallinenVirhe(e).koodi }); }
  seurat.forEach((s) => { if (sis[s.sid]) s.kokoelmat.sisainen = sis[s.sid]; });
  return { seurat, auditRivit, virheet, nytMs, ohitetut: V.OHITETUT_SEURAT };
}

module.exports = { SEURAN_KOKOELMAT, lueSeura, lueSisainen, lueAuditEstot, kerayAineisto };
