'use strict';
/**
 * B4 — haePelaajanKalenteri({ seuraId, pelaajaId }): pelaajan ja huoltajan kalenteri palvelimelta (docs/CODE_BRIEF_B4_PELAAJAN_KALENTERI.md; Kaista: Tero).
 * Oikeus (palvelimella, ei pelkkä context.auth): pelaajatoken (pelaajaSeuraId + pelaajaId täsmää) TAI huoltaja (huoltaja_tunnistus.js: email_verified + huoltajaEmail + suostumusTila 'annettu').
 * Henkilökunta, anonyymi, solo-lapsi → hylkäys (henkilökunta lukee kalenterin suoraan). Rajaus: lib/tm_kalenteri_pelaajalle.js (jäsenyys §7.18, nakyvyys, sallittulista, ikkuna, 24 h -pudotus, 20 aikaisinta).
 * Vastaus: { tapahtumat: [...], laskettu: ISO } — ei nimiä muista pelaajista, ei henkilökunnan kenttiä.
 */
const { normalisoiDocId } = require('./pelaajakirjautuminen');
const { huoltajaSyy } = require('./huoltaja_tunnistus');
const { tunnisteTyyppi } = require('./authz_paatos');
const { helsinginPaiva } = require('./pelaajakirjautuminen');
const { helsinginKeskiyo } = require('./helsinki_paiva');
const K = require('./tm_kalenteri_pelaajalle');

function ikkuna(nytMs) {
  const [v, kk, pv] = helsinginPaiva(nytMs).split('-').map(Number);
  const paiva = (d) => { const x = new Date(Date.UTC(v, kk - 1, pv + d)); return helsinginKeskiyo(x.getUTCFullYear(), x.getUTCMonth() + 1, x.getUTCDate()); };
  return { alku: paiva(K.IKKUNA_ALKU_PV), loppu: paiva(K.IKKUNA_LOPPU_PV + 1) - 1 };   // alkaa ∈ [tänään−7 pv 00:00, tänään+30 pv 23:59:59.999] Helsingin aikaa
}

function luoKasittelija(deps) {
  const { db, HttpsError, Timestamp } = deps;
  const nytF = deps.nyt || (() => Date.now());
  const torju = () => new HttpsError('permission-denied', 'Ei oikeutta tämän pelaajan kalenteriin.');
  return async function haePelaajanKalenteri(data, context) {
    if (!context || !context.auth) throw new HttpsError('unauthenticated', 'Kirjautuminen vaaditaan.');
    const seuraId = normalisoiDocId(data && data.seuraId), pelaajaId = normalisoiDocId(data && data.pelaajaId);
    if (!seuraId || !pelaajaId) throw new HttpsError('invalid-argument', 'seuraId ja pelaajaId pakollisia.');
    const tyyppi = tunnisteTyyppi(context.auth), token = context.auth.token || {};
    if (tyyppi === 'pelaaja') { if (token.pelaajaSeuraId !== seuraId || token.pelaajaId !== pelaajaId) throw torju(); }
    else if (tyyppi !== 'kayttaja') throw torju();
    const seura = db.collection('seurat').doc(seuraId);
    const pSnap = await seura.collection('pelaajat').doc(pelaajaId).get();
    if (!pSnap || !pSnap.exists) throw torju();
    const p = pSnap.data() || {};
    if (tyyppi === 'kayttaja' && huoltajaSyy(token, p, { vaadiSuostumus: true })) throw torju();   // henkilökunta (ei huoltajaEmail-täsmäystä) hylätään samalla
    const nyt = nytF(), r = ikkuna(nyt);
    const [jSnap, eSnap] = await Promise.all([
      seura.collection('joukkueet').get(),
      seura.collection('kalenteri').where('alkaa', '>=', Timestamp.fromDate(new Date(r.alku))).where('alkaa', '<=', Timestamp.fromDate(new Date(r.loppu))).get(),
    ]);
    const joukkueDocs = []; jSnap.forEach((d) => joukkueDocs.push({ id: d.id, nimi: (d.data() || {}).nimi }));
    const evs = []; eSnap.forEach((d) => evs.push(Object.assign({ id: d.id }, d.data())));
    const valitut = K.tmValitse(evs, Object.assign({ id: pelaajaId }, p), joukkueDocs, nyt);
    const saatavuudet = await Promise.all(valitut.map((ev) => seura.collection('kalenteri').doc(ev.id).collection('lasnaolijat').doc(pelaajaId).get()
      .then((s) => (s && s.exists ? ((s.data() || {}).saatavuus || null) : null)).catch(() => null)));
    return { tapahtumat: valitut.map((ev, i) => K.tmProjisoi(ev, saatavuudet[i])), laskettu: new Date(nyt).toISOString() };
  };
}

module.exports = { luoKasittelija, ikkuna };
