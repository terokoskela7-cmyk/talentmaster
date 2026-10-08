'use strict';
/**
 * Huoltajakutsu (Tero 10.10.2026; #919:n jatko) — OMA kutsulinkki huoltajalle, koska Firebasen salasanalinkki on voimassa vain 1 tunnin (ei konfiguroitavissa) ja suostumus annetaan kentällä, sähköposti luetaan illalla.
 *
 * Sähköpostissa on linkki  <base>/TalentMaster_Huoltajakutsu.html#k=<token>  (token URL-fragmentissa → ei palvelinlokeihin eikä referreriin; linkintarkistajat eivät aja sivun JS:ää).
 * Palvelin tallentaa VAIN tokenin SHA-256-tiivisteen (huoltajakutsut/{hash}, vain Admin SDK; Rules: ei client-pääsyä). Tokenia ei voi johtaa tietokannasta.
 *
 *  · KELPOISUUS (kutsunTila): voimassa 7 pv luonnista; pysyy käytettävissä ENSIMMÄISEEN ONNISTUNEESEEN KIRJAUTUMISEEN asti (Auth lastSignInTime) tai kunnes salasana on asetettu kutsun luonnin jälkeen
 *    (tokensValidAfterTime ≠ luontihetken arvo) — kumpi tahansa sulkee kutsun. Jokainen avaus luo TUOREEN 1 h:n Firebase-salasanalinkin; enintään 10 avausta.
 *  · Sähköposti luetaan AINA pelaajan huoltajaEmail-kentästä käyttöhetkellä (ei tallenneta kutsuun, ei clientin antamaa) → lähetys menee aina oikeaan osoitteeseen, korjaus näkyy heti.
 *  · avaaHuoltajakutsu({token}) — kirjautumaton + App Check. Vastaus: { tila: 'ok'|'vanhentunut'|'raja'|'kaytetty'|'ei_loydy', linkki?, kieli? }.
 *  · pyydaUusiHuoltajakutsu({token}) — uusi kutsu huoltajaEmailiin: enintään 3 / vrk / pelaaja, 5 min jäähy. Ei paljasta osoitetta (vain maskattu).
 */
const crypto = require('crypto');
const { normalisoiDocId } = require('./pelaajakirjautuminen');

const KUTSU_PV = 7, KUTSU_MS = KUTSU_PV * 24 * 3600 * 1000, MAKS_AVAUKSIA = 10, MAKS_UUSIA_24H = 3, JAAHY_MS = 5 * 60 * 1000, VRK_MS = 24 * 3600 * 1000;

const hash = (s) => crypto.createHash('sha256').update(String(s)).digest('hex');
const uusiToken = () => crypto.randomBytes(32).toString('base64url');
const tokenKelpaa = (t) => typeof t === 'string' && /^[A-Za-z0-9_-]{40,64}$/.test(t);
const kutsuUrl = (base, token) => base + '/TalentMaster_Huoltajakutsu.html#k=' + token;
const _ms = (v) => { const t = v ? Date.parse(v) : NaN; return isNaN(t) ? null : t; };

/* Onko tilillä ensimmäinen onnistunut kirjautuminen? Admin SDK voi antaa lastSignInTime = luontihetki tilille, jolla ei ole kirjauduttu → vaadi selvästi luonnin jälkeen (> 60 s). */
function onKirjautunut(user) {
  const m = user && user.metadata; const k = m ? _ms(m.lastSignInTime) : null, c = m ? _ms(m.creationTime) : null;
  if (k == null) return false;
  return c == null ? true : k > c + 60000;
}
/* Salasana asetettu kutsun luonnin jälkeen? (Firebase päivittää tokensValidAfterTime salasanan vaihdossa; vertailuarvo tallennettu kutsun luonnissa.) */
function salasanaAsetettu(user, doc) {
  const nyt = user ? _ms(user.tokensValidAfterTime) : null;
  return doc && doc.validSince0 != null && nyt != null && nyt > doc.validSince0;
}
/* PUHDAS päätös: doc = kutsudokumentti, user = Auth-käyttäjä (tai null). */
function kutsunTila(doc, user, nytMs) {
  if (!doc) return 'ei_loydy';
  if (user && (onKirjautunut(user) || salasanaAsetettu(user, doc))) return 'kaytetty';
  if (!(nytMs <= doc.vanhenee)) return 'vanhentunut';
  if ((doc.avauksia || 0) >= MAKS_AVAUKSIA) return 'raja';
  return 'ok';
}
function maskaa(email) {   // a***@x.fi
  const [a, d] = String(email || '').split('@'); if (!a || !d) return '';
  return a.charAt(0) + '***@' + d;
}

/* Luo kutsun (palauttaa raakatokenin — ei tallenneta). Varmistaa Auth-tilin ja tallentaa vertailuarvon salasanan asetuksen tunnistamiseen. */
async function luoKutsu(deps, o) {
  const { db, haeOrLuoHuoltajaAuth } = deps; const nyt = (deps.nyt || Date.now)();
  const seuraId = normalisoiDocId(o && o.seuraId), pelaajaId = normalisoiDocId(o && o.pelaajaId);
  if (!seuraId || !pelaajaId) throw new Error('kutsu: seuraId/pelaajaId puuttuu');
  const ps = await db.collection('seurat').doc(seuraId).collection('pelaajat').doc(pelaajaId).get();
  const p = ps && ps.exists ? ps.data() || {} : null;
  const email = p && typeof p.huoltajaEmail === 'string' ? p.huoltajaEmail.toLowerCase().trim() : '';
  if (!email) throw new Error('kutsu: huoltajaEmail puuttuu');
  const user = await haeOrLuoHuoltajaAuth(email, p.etunimi, p.sukunimi);
  const token = uusiToken();
  await db.collection('huoltajakutsut').doc(hash(token)).set({ seuraId, pelaajaId, luotu: nyt, vanhenee: nyt + KUTSU_MS, avauksia: 0, validSince0: user ? _ms(user.tokensValidAfterTime) : null });
  return token;
}

function luoAvaa(deps) {
  const { db, auth, HttpsError, haeOrLuoHuoltajaAuth, jatkoUrl } = deps; const nytF = deps.nyt || Date.now;
  return async function avaaHuoltajakutsu(data) {
    const token = data && data.token;
    if (!tokenKelpaa(token)) return { tila: 'ei_loydy' };
    const ref = db.collection('huoltajakutsut').doc(hash(token)), snap = await ref.get();
    if (!snap || !snap.exists) return { tila: 'ei_loydy' };
    const doc = snap.data() || {}, nyt = nytF();
    const ps = await db.collection('seurat').doc(doc.seuraId).collection('pelaajat').doc(doc.pelaajaId).get();
    const p = ps && ps.exists ? ps.data() || {} : null;
    const email = p && typeof p.huoltajaEmail === 'string' ? p.huoltajaEmail.toLowerCase().trim() : '';
    if (!email) return { tila: 'ei_loydy' };
    let user = null; try { user = await auth.getUserByEmail(email); } catch (e) { user = null; }
    const kieli = await deps.seuranKieli(doc.seuraId);
    const tila = kutsunTila(doc, user, nyt);
    if (tila !== 'ok') return { tila, kieli };
    // varaa avaus atomisesti (rinnakkaiset avaukset eivät ylitä rajaa)
    const varattu = await db.runTransaction(async (tx) => {
      const s = await tx.get(ref); const d = s.data() || {};
      if ((d.avauksia || 0) >= MAKS_AVAUKSIA) return false;
      tx.update(ref, { avauksia: (d.avauksia || 0) + 1 }); return true;
    });
    if (!varattu) return { tila: 'raja', kieli };
    if (!user) user = await haeOrLuoHuoltajaAuth(email, p.etunimi, p.sukunimi);
    const jatko = jatkoUrl + '?pelaajaId=' + encodeURIComponent(doc.pelaajaId) + '&seuraId=' + encodeURIComponent(doc.seuraId);
    const linkki = await auth.generatePasswordResetLink(email, { url: jatko, handleCodeInApp: false });   // TUORE, voimassa 1 h
    return { tila: 'ok', linkki, kieli };
  };
}

function luoPyydaUusi(deps) {
  const { db, auth, HttpsError, lahetaSahkoposti, pohja, base } = deps; const nytF = deps.nyt || Date.now;
  return async function pyydaUusiHuoltajakutsu(data) {
    const token = data && data.token;
    if (!tokenKelpaa(token)) return { tila: 'ei_loydy' };
    const snap = await db.collection('huoltajakutsut').doc(hash(token)).get();
    if (!snap || !snap.exists) return { tila: 'ei_loydy' };
    const doc = snap.data() || {}, nyt = nytF();
    const ps = await db.collection('seurat').doc(doc.seuraId).collection('pelaajat').doc(doc.pelaajaId).get();
    const p = ps && ps.exists ? ps.data() || {} : null;
    const email = p && typeof p.huoltajaEmail === 'string' ? p.huoltajaEmail.toLowerCase().trim() : '';
    if (!email) return { tila: 'ei_loydy' };
    let user = null; try { user = await auth.getUserByEmail(email); } catch (e) { user = null; }
    if (user && (onKirjautunut(user) || salasanaAsetettu(user, doc))) return { tila: 'kaytetty' };   // tunnus on jo käytössä → ei uutta kutsua, ohjataan kirjautumaan
    const rajaRef = db.collection('huoltajakutsu_rajat').doc(hash(doc.seuraId + '/' + doc.pelaajaId));
    const rs = await rajaRef.get(); const vanhat = rs && rs.exists ? ((rs.data() || {}).pyynnot || []).filter((t) => nyt - t < VRK_MS) : [];
    if (vanhat.length >= MAKS_UUSIA_24H) return { tila: 'raja' };
    if (vanhat.length && nyt - Math.max.apply(null, vanhat) < JAAHY_MS) return { tila: 'odota' };
    const uusi = await luoKutsu(Object.assign({}, deps, { nyt: nytF }), { seuraId: doc.seuraId, pelaajaId: doc.pelaajaId });
    await lahetaSahkoposti({ to: email, subject: 'Aseta TalentMaster-salasanasi', fromName: 'TalentMaster', html: pohja({ kutsuLinkki: kutsuUrl(base, uusi) }) });
    await rajaRef.set({ pyynnot: vanhat.concat([nyt]) });
    return { tila: 'lahetetty', osoite: maskaa(email) };
  };
}

module.exports = { hash, uusiToken, tokenKelpaa, kutsuUrl, onKirjautunut, salasanaAsetettu, kutsunTila, maskaa, luoKutsu, luoAvaa, luoPyydaUusi, KUTSU_PV, KUTSU_MS, MAKS_AVAUKSIA, MAKS_UUSIA_24H, JAAHY_MS };
