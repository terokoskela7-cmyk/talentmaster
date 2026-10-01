/* ════════════════════════════════════════════════════════════════════════
   auditloki.js — haeAuditLoki-haun logiikka (SA:n poikkeamaselvitystyökalu, 30.9.2026)

   Ennen: 200 uusinta riviä, severity suodatettiin vain tuon ikkunan sisällä → vanhemmat rivit
   (esim. 28.–29.9. suostumuslinkki_epaonnistui) katosivat kirjautumisrivien alle.

   HAKUSTRATEGIA (ettei yksikään rivi katoa):
     · `toiminto` (tarkka tai lista ≤ 10, `in`) + aikaväli → Firestore-kysely
       orderBy('aikaleima','desc'). Yksi composite-indeksi: audit (toiminto ASC, aikaleima DESC).
       Pelkkä aikaväli ilman toimintoa käyttää yksikenttäistä auto-indeksiä.
     · seuraId / severity / piilotaKirjautumiset → suodatetaan PALVELIMELLA sivutetun skannauksen
       yli: haetaan eriä (ERA), kunnes `limit` täyttyy tai SKANNAUSKATTO tulee vastaan.
     · Kursori `seuraava` = viimeisen SKANNATUN rivin id (ei viimeisen palautetun) → seuraava
       sivu jatkaa täsmälleen siitä, mihin skannaus jäi, vaikka suodatin hylkäsi rivejä välistä.
   Rivi ilman `aikaleima`-kenttää ei näy orderBy-kyselyssä lainkaan → kaikki kirjoittajat asettavat sen.
════════════════════════════════════════════════════════════════════════ */
'use strict';

const ERA = 200;
const SKANNAUSKATTO = 3000;
const KIRJAUTUMISET = ['pelaaja_kirjautuminen', 'solo_kirjautuminen'];
const TASOT = ['info', 'warn', 'alert'];

function paiva(v, loppuun) {
  if (v == null || v === '') return null;
  const s = String(v).trim();
  if (!/^\d{4}-\d{2}-\d{2}$/.test(s)) return null;
  const d = new Date(s + (loppuun ? 'T23:59:59.999Z' : 'T00:00:00.000Z'));
  return isNaN(d.getTime()) ? null : d;
}

/* Syöte → normalisoitu suodatin. Tuntemattomat arvot hylätään (null), ei heitetä. */
function normalisoiSuodatin(data) {
  const d = data || {};
  let toiminnot = null;
  if (Array.isArray(d.toiminto)) toiminnot = d.toiminto.map(String).filter(Boolean).slice(0, 10);
  else if (d.toiminto) toiminnot = [String(d.toiminto)];
  if (toiminnot && !toiminnot.length) toiminnot = null;
  const sev = d.severity ? String(d.severity) : null;
  return {
    toiminnot,
    seuraId: d.seuraId ? String(d.seuraId) : null,
    severity: sev === 'warn+' || TASOT.indexOf(sev) >= 0 ? sev : null,
    alku: paiva(d.alku, false),
    loppu: paiva(d.loppu, true),
    piilotaKirjautumiset: d.piilotaKirjautumiset !== false,   // oletus true
    limit: Math.min(Math.max(parseInt(d.limit || 100, 10) || 100, 1), 500),
    jalkeen: d.jalkeen ? String(d.jalkeen) : null,
  };
}

/* Palvelimella suodatettavat ehdot (puhdas). */
function riviKelpaa(r, s) {
  if (s.seuraId && r.seuraId !== s.seuraId) return false;
  if (s.severity === 'warn+' && r.severity !== 'warn' && r.severity !== 'alert') return false;
  if (s.severity && s.severity !== 'warn+' && r.severity !== s.severity) return false;
  // Vain info-tason kirjautumisrivit piiloon: lukitukset ja moniselitteiset (alert) jäävät näkyviin.
  if (s.piilotaKirjautumiset && KIRJAUTUMISET.indexOf(r.toiminto) >= 0 && (r.severity || 'info') === 'info') return false;
  return true;
}

function riviUlos(doc) {
  const x = doc.data() || {};
  const ts = (x.aikaleima && x.aikaleima.toDate) ? x.aikaleima.toDate().toISOString() : null;
  return Object.assign({ id: doc.id }, x, { aikaleima: ts });
}

/* Firestore-kysely (db = Admin SDK). Palauttaa { rivit, seuraava, skannattu }. */
async function haeAuditRivit(db, s) {
  let q = db.collection('audit');
  if (s.toiminnot) q = s.toiminnot.length === 1 ? q.where('toiminto', '==', s.toiminnot[0]) : q.where('toiminto', 'in', s.toiminnot);
  if (s.alku) q = q.where('aikaleima', '>=', s.alku);
  if (s.loppu) q = q.where('aikaleima', '<=', s.loppu);
  q = q.orderBy('aikaleima', 'desc');

  let kursori = null;
  if (s.jalkeen) {
    const k = await db.collection('audit').doc(s.jalkeen).get();
    if (k.exists) kursori = k;
  }
  const rivit = [];
  let skannattu = 0, viimeisin = null, loppui = false;
  while (rivit.length < s.limit && skannattu < SKANNAUSKATTO) {
    let erä = q.limit(ERA);
    if (kursori) erä = erä.startAfter(kursori);
    const snap = await erä.get();
    if (!snap.docs.length) { loppui = true; break; }
    for (const d of snap.docs) {
      skannattu++;
      viimeisin = d;
      const r = riviUlos(d);
      if (riviKelpaa(r, s)) rivit.push(r);
      if (rivit.length >= s.limit) break;
    }
    kursori = viimeisin;
    if (snap.docs.length < ERA && rivit.length < s.limit) { loppui = true; break; }
  }
  return { rivit, seuraava: loppui || !viimeisin ? null : viimeisin.id, skannattu };
}

module.exports = { normalisoiSuodatin, riviKelpaa, haeAuditRivit, KIRJAUTUMISET, ERA, SKANNAUSKATTO };
