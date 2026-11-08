'use strict';
/**
 * Avauskirjoitukset palvelimelle, PR A (.briefit/projektit/03-avauskirjoitukset-palvelimelle/VAIHE0.md, PM 8.11.2026 P1, P2 = c2).
 * Henkilökunnan `seurat/{sid}/kayttajat/{uid}.viimeisinKirjautuminen` lasketaan Firebase Authista, ei selaimesta.
 * Ajastettu kirjautumisaikaYo (index.js) klo 3.30 Europe/Helsinki:
 *   collectionGroup('kayttajat') → vain seurat/{sid}/kayttajat/{uid} (ylätason /kayttajat ohitetaan) → Admin SDK getUsers (100 uid:n erissä)
 *   → aika = max(metadata.lastRefreshTime, metadata.lastSignInTime) → update vain, kun Helsingin päivä on uudempi kuin kentän nykyinen päivä.
 * MIKSI lastRefreshTime: Firebase-istunto säilyy kuukausia, joten lastSignInTime päivittyy vain uudelleenkirjautumisessa. lastRefreshTime
 * päivittyy, kun ID-token uusitaan (sivun avaus yli tunnin tauon jälkeen), eli se vastaa vanhaa "kerran istunnossa" -merkintää.
 * SEMANTIIKKA: aktiivisuus = tunnus auki missä tahansa TM-sovelluksessa (myös Admin / Excel-tuonti). Kentän tyyppi pysyy Timestampina
 * (VP laskeVAI n4 Kontakti + viimAktiivisuus lukevat sen _vpAikaMs:llä sellaisenaan). Kenttä ei koskaan siirry taaksepäin.
 * Lokiin vain lukumäärät (ei uid:ejä, ei sähköposteja). Yhden erän virhe ei kaada muita.
 */
const KENTTA = 'viimeisinKirjautuminen';
const AUTH_ERA = 100;     // getUsers-raja
const KIRJOITUS_ERA = 400; // batch-raja 500, varaa
const POLKU = /^seurat\/[^/]+\/kayttajat\/([^/]+)$/;

const _pvmF = new Intl.DateTimeFormat('sv-SE', { timeZone: 'Europe/Helsinki', year: 'numeric', month: '2-digit', day: '2-digit' });
/** Helsingin kalenteripäivä 'YYYY-MM-DD' hetkelle ms (null jos ei aikaa). */
function helsinginPaiva(ms) { return (typeof ms === 'number' && isFinite(ms)) ? _pvmF.format(new Date(ms)) : null; }

/** Firestore Timestamp | Date | ISO / Auth-aikamerkkijono | ms → ms tai null. */
function aikaMs(v) {
  if (v == null || v === '') return null;
  try {
    if (typeof v.toMillis === 'function') return v.toMillis();
    if (typeof v.toDate === 'function') return v.toDate().getTime();
    if (v instanceof Date) return isNaN(v.getTime()) ? null : v.getTime();
    if (typeof v === 'number') return isFinite(v) ? v : null;
    const ms = new Date(v).getTime(); return isNaN(ms) ? null : ms;
  } catch (e) { return null; }
}

/** Auth-käyttäjän viimeisin aktiivisuus: max(lastRefreshTime, lastSignInTime) ms tai null. */
function authAktiivisuusMs(user) {
  const m = (user && user.metadata) || {};
  const a = aikaMs(m.lastRefreshTime), b = aikaMs(m.lastSignInTime);
  if (a == null && b == null) return null;
  return Math.max(a == null ? 0 : a, b == null ? 0 : b);
}

/**
 * Puhdas päätös: mitkä dokumentit päivitetään.
 * @param {Array<{polku:string, uid:string, nykyinen:*}>} kayttajat
 * @param {Map<string, number>} authAjat uid → ms
 * @returns {Array<{polku:string, ms:number}>}
 */
function paivitettavat(kayttajat, authAjat) {
  const ulos = [];
  (kayttajat || []).forEach((k) => {
    const ms = authAjat.get(k.uid); if (ms == null) return;
    const uusi = helsinginPaiva(ms), vanha = helsinginPaiva(aikaMs(k.nykyinen));
    if (uusi && (!vanha || uusi > vanha)) ulos.push({ polku: k.polku, ms });
  });
  return ulos;
}

function _erat(lista, n) { const e = []; for (let i = 0; i < lista.length; i += n) e.push(lista.slice(i, i + n)); return e; }

/**
 * Yksi ajo. deps = { db, auth, Timestamp, loki? }. → { kayttajia, authLoytyi, paivitetty, virheita }
 */
async function aja(deps) {
  const loki = deps.loki || console;
  const snap = await deps.db.collectionGroup('kayttajat').get();
  const kayttajat = [];
  snap.docs.forEach((d) => {
    const m = POLKU.exec(d.ref.path); if (!m) return;
    kayttajat.push({ polku: d.ref.path, uid: m[1], nykyinen: (d.data() || {})[KENTTA] });
  });
  const uidit = Array.from(new Set(kayttajat.map((k) => k.uid)));
  const authAjat = new Map(); let virheita = 0;
  for (const era of _erat(uidit, AUTH_ERA)) {
    try {
      const r = await deps.auth.getUsers(era.map((uid) => ({ uid })));
      (r.users || []).forEach((u) => { const ms = authAktiivisuusMs(u); if (ms != null) authAjat.set(u.uid, ms); });
    } catch (e) { virheita++; loki.error('[kirjautumisaika] getUsers-erä epäonnistui: ' + (e && e.message || e)); }
  }
  const muutokset = paivitettavat(kayttajat, authAjat);
  let paivitetty = 0;
  for (const era of _erat(muutokset, KIRJOITUS_ERA)) {
    try {
      const b = deps.db.batch();
      era.forEach((p) => b.update(deps.db.doc(p.polku), { [KENTTA]: deps.Timestamp.fromMillis(p.ms) }));
      await b.commit(); paivitetty += era.length;
    } catch (e) { virheita++; loki.error('[kirjautumisaika] kirjoituserä epäonnistui: ' + (e && e.message || e)); }
  }
  const tulos = { kayttajia: kayttajat.length, authLoytyi: authAjat.size, paivitetty, virheita };
  loki.log('[kirjautumisaika] ' + JSON.stringify(tulos));
  return tulos;
}

/** index.js: pubsub.schedule(...).onRun(ajastettuKasittelija(deps)) */
function ajastettuKasittelija(deps) { return async () => { await aja(deps); return null; }; }

module.exports = { KENTTA, helsinginPaiva, aikaMs, authAktiivisuusMs, paivitettavat, aja, ajastettuKasittelija };
