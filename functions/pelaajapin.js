/* ════════════════════════════════════════════════════════════════════════
   pelaajapin.js — Vaihe 0 / PR 4: PIN asetetaan VAIN palvelimella (CODE_BRIEF_PR4_PIN.md)

   Ennen: Seura/Admin kirjoitti `pin`-kentän suoraan selaimesta, mutta kirjautumisessa hajautus
   (_pelaajaPin) voittaa selväkielisen → PIN:n vaihto ei toiminut pelaajalla, joka oli kirjautunut kerran.
   Nyt hajautus JA selväkielinen kopio kirjoitetaan SAMASSA erässä, ja pelaajan lukituslaskurit nollataan.

   SELVÄKIELINEN `pin` jää pelaajadokumenttiin TIETOISESTI: henkilökunta ja huoltaja jakavat sen
   (Vanhemman kortti, PIN-kortit, sähköposti). PIN:iä ei koskaan kirjoiteta audit-lokiin.

   OIKEUS (Teron päätös 30.9.2026, PR 4 kohta 1):
     · johto (vp / urheilutoimenjohtaja / seurasihteeri) ja SA → koko seura (tarkistaOikeus)
     · joukkueen valmentaja (valmentaja / talenttivalmentaja / fysiikkavalmentaja) → VAIN oman joukkueensa
       pelaajat: pelaajan joukkueet[] ∩ valmentajan kayttajat.joukkueet[] (sama sääntö kuin Rulesin
       onOmanJoukkueenValmentaja, pl. talenttivalmentajan seuranlaajuinen ohitus).
════════════════════════════════════════════════════════════════════════ */
'use strict';
const crypto = require('crypto');
const K = require('./pelaajakirjautuminen');
const { suostumusAnnettu, SUOSTUMUS_PUUTTUU } = require('./suostumus');
/* Suostumus ennen PIN:iä (1.10.2026): PIN luodaan vain pelaajalle, jolla on huoltajan suostumus.
   Ilman suostumusta PIN syntyy vahvistaSuostumuksessa (best-effort) heti suostumuksen jälkeen. */
const VIRHE_PIN_SUOSTUMUS = 'Huoltajan suostumus puuttuu – PIN luodaan suostumuksen jälkeen.';

const VALMENTAJAROOLIT = ['valmentaja', 'talenttivalmentaja', 'fysiikkavalmentaja'];
const ERAKOKO = 400;   // Firestore-erän raja 500 → varaa tilaa

/* Triviaali PIN: kaikki samaa numeroa tai peräkkäinen nouseva/laskeva jono (012345, 123456 … 987654). */
function onTriviaaliPin(pin) {
  const s = String(pin);
  if (/^(\d)\1+$/.test(s)) return true;
  let nousee = true, laskee = true;
  for (let i = 1; i < s.length; i++) {
    const d = s.charCodeAt(i) - s.charCodeAt(i - 1);
    if (d !== 1) nousee = false;
    if (d !== -1) laskee = false;
  }
  return nousee || laskee;
}

/* 6-numeroinen PIN kryptografisella satunnaisuudella (crypto.randomInt), ei triviaaleja. */
function generoiPin(randomInt) {
  const r = randomInt || crypto.randomInt;
  for (let yritys = 0; yritys < 50; yritys++) {
    const pin = String(r(0, 1000000)).padStart(6, '0');
    if (!onTriviaaliPin(pin)) return pin;
  }
  throw new Error('PIN-generointi epäonnistui');
}

/* Käsin syötetty PIN: tasan 6 numeroa, ei triviaali. → pin | null */
function normalisoiUusiPin(v) {
  if (v == null || v === '') return null;
  const s = String(v).trim();
  if (!/^[0-9]{6}$/.test(s) || onTriviaaliPin(s)) return null;
  return s;
}

/* Kaikki pelaajan lukituslaskurit: PalloID-reitti (jokainen tunnistekenttä), linkkireitti, pelaajakohtainen. */
function lukitusAvaimet(seuraId, pelaajaId, data) {
  const avaimet = new Set([K.linkkiLukitusAvain(seuraId, pelaajaId), K.pelaajaLukitusAvain(seuraId, pelaajaId)]);
  ['tunniste', 'palloID', 'palloId'].forEach((k) => {
    const t = K.normalisoiTunnus(data && data[k]);
    if (t) avaimet.add(K.palloIdLukitusAvain(t));
  });
  return Array.from(avaimet);
}

/* Lisää erään: hajautus + selväkielinen PIN + lukitusten nollaus. Palauttaa kirjoitusten määrän. */
function lisaaPinKirjoitukset(db, batch, { seuraId, pelaajaId, data, pin, lahde, TS }) {
  const pelRef = db.collection('seurat').doc(seuraId).collection('pelaajat').doc(pelaajaId);
  batch.set(db.collection('_pelaajaPin').doc(seuraId + '_' + pelaajaId), { hash: K.hajautaPin(pin), luotu: TS, lahde: lahde });
  batch.update(pelRef, { pin: pin, pin_asetettu: TS });
  const avaimet = lukitusAvaimet(seuraId, pelaajaId, data);
  avaimet.forEach((a) => batch.delete(db.collection('_kirjautumisyritykset').doc(a)));
  return 2 + avaimet.length;
}

/* OIKEUS: → { koko:true } | { joukkueet:[...] } | null (ei oikeutta). */
async function pinOikeus(db, tarkistaOikeus, context, seuraId) {
  if (!context || !context.auth) return null;
  const tk = context.auth.token || {};
  if (tk.firebase && tk.firebase.sign_in_provider === 'anonymous') return null;
  if ((await tarkistaOikeus(context.auth.uid, seuraId, context.auth.token)).sallittu) return { koko: true };   // token: VP myös claimeista (korjaus-PR 2)
  if (tk.seuraId !== seuraId || VALMENTAJAROOLIT.indexOf(tk.rooli) < 0) return null;
  const k = await db.collection('seurat').doc(seuraId).collection('kayttajat').doc(context.auth.uid).get();
  const kd = k.exists ? (k.data() || {}) : null;
  if (!kd || kd.aktiivinen === false) return null;
  const joukkueet = Array.isArray(kd.joukkueet) ? kd.joukkueet.filter(Boolean) : [];
  return joukkueet.length ? { joukkueet } : null;
}
function saaPelaajalle(oikeus, pelaajaData) {
  if (!oikeus) return false;
  if (oikeus.koko) return true;
  const pj = Array.isArray(pelaajaData && pelaajaData.joukkueet) ? pelaajaData.joukkueet : [];
  return pj.some((j) => oikeus.joukkueet.indexOf(j) >= 0);
}

/* ── asetaPelaajanPin({ seuraId, pelaajaId, pin? }) ── */
function luoAsetaPelaajanPin(deps) {
  const { db, tarkistaOikeus, HttpsError, FieldValue } = deps;
  const audit = deps.audit || (async () => {});
  return async function asetaPelaajanPin(data, context) {
    if (!context || !context.auth) throw new HttpsError('unauthenticated', 'Kirjaudu ensin.');
    const seuraId = K.normalisoiDocId(data && data.seuraId);
    const pelaajaId = K.normalisoiDocId(data && data.pelaajaId);
    if (!seuraId || !pelaajaId) throw new HttpsError('invalid-argument', 'seuraId ja pelaajaId ovat pakollisia.');
    const annettu = data && data.pin != null && data.pin !== '';
    const pin = annettu ? normalisoiUusiPin(data.pin) : generoiPin(deps.randomInt);
    if (!pin) throw new HttpsError('invalid-argument', 'PIN:n on oltava 6 numeroa, eikä se saa olla helposti arvattava (esim. 111111 tai 123456).');
    const oikeus = await pinOikeus(db, tarkistaOikeus, context, seuraId);
    if (!oikeus) throw new HttpsError('permission-denied', 'Ei oikeutta asettaa PIN:iä tämän seuran pelaajille.');
    const snap = await db.collection('seurat').doc(seuraId).collection('pelaajat').doc(pelaajaId).get();
    if (!snap.exists) throw new HttpsError('not-found', 'Pelaajaa ei löytynyt.');
    const pd = snap.data() || {};
    if (!saaPelaajalle(oikeus, pd)) throw new HttpsError('permission-denied', 'Valmentaja voi asettaa PIN:n vain oman joukkueensa pelaajalle.');
    if (!suostumusAnnettu(pd)) throw new HttpsError('failed-precondition', VIRHE_PIN_SUOSTUMUS, { syy: SUOSTUMUS_PUUTTUU });
    const TS = FieldValue.serverTimestamp();
    const batch = db.batch();
    lisaaPinKirjoitukset(db, batch, { seuraId, pelaajaId, data: pd, pin, lahde: 'asetaPelaajanPin', TS });
    await batch.commit();
    await audit('pin_asetettu', { seuraId, pelaajaId, tekija_uid: context.auth.uid, generoitu: !annettu, severity: 'info' });
    return { pin };
  };
}

/* ── luoPinitSeuralle({ seuraId, joukkue?, vainPuuttuvat=true }) ──
   joukkue = joukkueen id (joukkueet[]); nimi haetaan joukkueet/{id}.nimi, jolloin myös vanhat pelaajat,
   joilla on vain `joukkue`-nimikenttä (§18), löytyvät. Valmentaja: joukkue PAKOLLINEN ja omissa joukkueissa. */
function luoLuoPinitSeuralle(deps) {
  const { db, tarkistaOikeus, HttpsError, FieldValue } = deps;
  const audit = deps.audit || (async () => {});
  return async function luoPinitSeuralle(data, context) {
    if (!context || !context.auth) throw new HttpsError('unauthenticated', 'Kirjaudu ensin.');
    const seuraId = K.normalisoiDocId(data && data.seuraId);
    if (!seuraId) throw new HttpsError('invalid-argument', 'seuraId on pakollinen.');
    const joukkue = data && data.joukkue ? K.normalisoiDocId(data.joukkue) : null;
    const vainPuuttuvat = !(data && data.vainPuuttuvat === false);
    const kuivaAjo = !!(data && data.kuivaAjo);
    const oikeus = await pinOikeus(db, tarkistaOikeus, context, seuraId);
    if (!oikeus) throw new HttpsError('permission-denied', 'Ei oikeutta luoda PIN-koodeja tälle seuralle.');
    if (!oikeus.koko && (!joukkue || oikeus.joukkueet.indexOf(joukkue) < 0)) {
      throw new HttpsError('permission-denied', 'Valmentaja voi luoda PIN-koodit vain omalle joukkueelleen.');
    }
    const col = db.collection('seurat').doc(seuraId).collection('pelaajat');
    const docs = new Map();
    if (joukkue) {
      const jd = await db.collection('seurat').doc(seuraId).collection('joukkueet').doc(joukkue).get();
      const nimi = jd.exists ? (jd.data() || {}).nimi : null;
      const [a, b] = await Promise.all([
        col.where('joukkueet', 'array-contains', joukkue).get(),
        nimi ? col.where('joukkue', '==', nimi).get() : Promise.resolve({ docs: [] }),
      ]);
      a.docs.concat(b.docs).forEach((d) => docs.set(d.id, d));
    } else {
      (await col.get()).docs.forEach((d) => docs.set(d.id, d));
    }
    const kohteet = [];
    let ohitettu = 0, ohitettuSuostumus = 0, oliJo = 0;
    docs.forEach((d) => {
      const pd = d.data() || {};
      if (!saaPelaajalle(oikeus, pd)) { ohitettu++; return; }   // valmentaja: nimikentän kautta löytynyt vieras
      if (!suostumusAnnettu(pd)) { ohitettu++; ohitettuSuostumus++; return; }   // ei PIN:iä ilman suostumusta
      if (vainPuuttuvat && pd.pin != null && String(pd.pin).trim() !== '') { ohitettu++; oliJo++; return; }
      kohteet.push({ id: d.id, pd });
    });
    if (kuivaAjo) return { ok: true, kuivaAjo: true, luotaisiin: kohteet.length, ohitettu, ohitettuSuostumus, oliJo, yhteensa: docs.size };
    const TS = FieldValue.serverTimestamp();
    let batch = db.batch(), opit = 0, eria = 0, luotu = 0;
    for (const k of kohteet) {
      const n = 2 + lukitusAvaimet(seuraId, k.id, k.pd).length;
      if (opit + n > ERAKOKO) { await batch.commit(); eria++; batch = db.batch(); opit = 0; }
      opit += lisaaPinKirjoitukset(db, batch, { seuraId, pelaajaId: k.id, data: k.pd, pin: generoiPin(deps.randomInt), lahde: 'luoPinitSeuralle', TS });
      luotu++;
    }
    if (opit) { await batch.commit(); eria++; }
    await audit('pinit_luotu', { seuraId, joukkue: joukkue || null, luotu, ohitettu, ohitettuSuostumus, oliJo, vainPuuttuvat, tekija_uid: context.auth.uid, severity: 'info' });
    return { ok: true, luotu, ohitettu, ohitettuSuostumus, oliJo, yhteensa: docs.size, eria };
  };
}

module.exports = {
  onTriviaaliPin, generoiPin, normalisoiUusiPin, lukitusAvaimet, lisaaPinKirjoitukset,
  pinOikeus, saaPelaajalle, luoAsetaPelaajanPin, luoLuoPinitSeuralle, VALMENTAJAROOLIT, ERAKOKO, VIRHE_PIN_SUOSTUMUS,
};
