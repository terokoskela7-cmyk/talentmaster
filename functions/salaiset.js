'use strict';
/**
 * Server-only integraatioavaimet (turvallisuus-PR): seurat/{sid}/salaiset/integraatiot — Rules estää KAIKKI selainluvut ja -kirjoitukset (myös SA; v3.62), vain Admin SDK (Cloud Functions) lukee ja kirjoittaa.
 * Aiemmin taso_api_key oli seura-dokissa, jonka koko seuran henkilökunta (valmentajat mukaan lukien) pystyi lukemaan selaimella. Nyt:
 *   · avain: salaiset/integraatiot.taso_api_key (kirjoitus VAIN callablella asetaTasoAsetukset: SA / VP / UTJ / seurasihteeri)
 *   · seura-dokissa jää taso_club_id (ei salaisuus) + taso_avain_asetettu: true (UI näyttää vain "asetettu ✓", ei koskaan avainta)
 * Siirtymä: tasoAvain() lukee ensin salaisen dokumentin, varalla vanhan seura-dokin kentän (kunnes scripts/siirra_integraatioavaimet.js on ajettu ja kenttä poistettu). Avaimia ei lokiteta.
 */
const POLKU = 'salaiset', DOKI = 'integraatiot';
const VOI_ASETTAA = ['superadmin', 'vp', 'urheilutoimenjohtaja', 'seurasihteeri'];
const SALAINEN_KENTTA = /(?:_api_?key|_apikey|_secret|_token|_password|_salasana|_private_key|^api_?key$)$/i;   // seura-dokin kentät jotka siirretään (migraatioskripti)

const ref = (db, sid) => db.collection('seurat').doc(sid).collection(POLKU).doc(DOKI);
async function lueIntegraatiot(db, sid) { const s = await ref(db, sid).get(); return (s.exists && s.data()) || {}; }
async function tasoAvain(db, sid, seuraData) {
  const k = (await lueIntegraatiot(db, sid)).taso_api_key;
  if (typeof k === 'string' && k) return k;
  return (seuraData && typeof seuraData.taso_api_key === 'string' && seuraData.taso_api_key) || null;   // siirtymävara (poistuu migraation jälkeen)
}
function voiAsettaa(rooli) { return VOI_ASETTAA.indexOf(rooli) >= 0; }
function tarkistaSyote(d) {
  d = d || {}; const out = {}, apiKey = d.apiKey == null ? null : String(d.apiKey).trim(), clubId = d.clubId == null ? null : String(d.clubId).trim();
  if (apiKey !== null && apiKey !== '') { if (apiKey.length < 8 || apiKey.length > 200 || /\s/.test(apiKey)) return { virhe: 'API-avain on virheellinen (8–200 merkkiä, ei välilyöntejä).' }; out.apiKey = apiKey; }
  if (clubId !== null) { if (!/^[A-Za-z0-9_-]{1,40}$/.test(clubId)) return { virhe: 'Club ID on virheellinen.' }; out.clubId = clubId; }
  if (!('apiKey' in out) && !('clubId' in out)) return { virhe: 'Ei muutettavaa (anna apiKey ja/tai clubId).' };
  return out;
}
async function asetaTaso(db, FieldValue, sid, syote) {   // → { avain_asetettu, club_id }; avain vain palvelimelle, seura-dokiin vain lippu + club_id
  const t = tarkistaSyote(syote); if (t.virhe) { const e = new Error(t.virhe); e.koodi = 'invalid-argument'; throw e; }
  const seura = db.collection('seurat').doc(sid), upd = {};
  if (t.apiKey) { await ref(db, sid).set({ taso_api_key: t.apiKey, paivitetty: FieldValue.serverTimestamp() }, { merge: true }); upd.taso_avain_asetettu = true; upd.taso_api_key = FieldValue.delete(); }   // vanha kenttä pois samalla
  if (t.clubId) upd.taso_club_id = t.clubId;
  await seura.update(upd);
  return { avain_asetettu: !!t.apiKey || undefined, club_id: t.clubId };
}
/* Callable-tehdas (index.js injektoi). Vastaus ei koskaan sisällä avainta. */
function luo(deps) {
  const { functions, db, admin, tarkistaOikeus } = deps;
  const asetaTasoAsetukset = functions.region('europe-west1').https.onCall(async (data, context) => {
    if (!context.auth) throw new functions.https.HttpsError('unauthenticated', 'Kirjautuminen vaaditaan.');
    const seuraId = String((data && data.seuraId) || '').trim(); if (!seuraId || /[\/\s]/.test(seuraId)) throw new functions.https.HttpsError('invalid-argument', 'seuraId puuttuu tai on virheellinen.');
    const oikeus = await tarkistaOikeus(context.auth.uid, seuraId, context.auth.token);
    if (!oikeus.sallittu || !voiAsettaa(oikeus.rooli)) throw new functions.https.HttpsError('permission-denied', 'Integraatioavaimen voi asettaa vain seuran johto.');
    try { const r = await asetaTaso(db, admin.firestore.FieldValue, seuraId, { apiKey: data && data.apiKey, clubId: data && data.clubId }); console.log('[asetaTasoAsetukset] ' + seuraId + ' · avain ' + (r.avain_asetettu ? 'päivitetty' : 'ennallaan') + ' · club ' + (r.club_id || '—')); return { ok: true, avain_asetettu: true, club_id: r.club_id || null }; }
    catch (e) { if (e && e.koodi) throw new functions.https.HttpsError(e.koodi, e.message); console.error('[asetaTasoAsetukset]', seuraId, e && e.message); throw new functions.https.HttpsError('internal', 'Tallennus epäonnistui.'); }
  });
  return { asetaTasoAsetukset };
}
module.exports = { POLKU, DOKI, VOI_ASETTAA, SALAINEN_KENTTA, lueIntegraatiot, tasoAvain, voiAsettaa, tarkistaSyote, asetaTaso, luo };
