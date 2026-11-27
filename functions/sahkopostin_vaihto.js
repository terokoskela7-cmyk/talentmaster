'use strict';
/**
 * Sähköpostin vaihto (callable vaihdaKayttajanSahkoposti, ydin). Authz tehty kutsujassa (kayttajahallinta.js: SA tai seuran johto, ei oma/SA-tunnus).
 * Yksi kokonaisuus: Auth email + kayttajat.email + token-mitätöinti + audit (vanha → uusi, tekijä). Varattu osoite → already-exists, EI muutosta.
 * Firestore-virhe → Auth-osoite palautetaan (rollback). Vain seuran henkilöstörooli (ei pelaaja/huoltaja).
 * Jos seurat/{sid}.vp_uid == kohde → myös seurat/{sid}.vp_email päivittyy (tiedoksi-kopio; virhe ei kaada vaihtoa).
 */
const SAHKOPOSTI_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const _koodi = (e) => (e && (e.code || (e.errorInfo && e.errorInfo.code))) || '';
function tarkistaOsoite(uusi, HttpsError) {
  if (!uusi || uusi.length > 254 || !SAHKOPOSTI_RE.test(uusi)) throw new HttpsError('invalid-argument', 'Virheellinen sähköpostiosoite.');
}
async function suorita(d) {
  const { db, auth, admin, HttpsError, kRef, kDoc, kohdeUid, seuraId, uusi, tekijaUid } = d;
  if (!d.sallitutRoolit.includes(kDoc.get('rooli'))) throw new HttpsError('failed-precondition', 'Sähköpostin voi vaihtaa vain seuran henkilökunnalta.');
  let kohdeAuth;
  try { kohdeAuth = await auth.getUser(kohdeUid); }
  catch (e) { if (d.authEiLoydy(e)) throw new HttpsError('not-found', 'Käyttäjän kirjautumistiliä ei löydy.'); throw e; }
  if ((kohdeAuth.providerData || []).some((p) => p && p.providerId === 'google.com')) throw new HttpsError('failed-precondition', 'Google-tunnuksella kirjautuvan osoitetta ei voi vaihtaa.');   // osoite tulee Googlelta: Auth-muutos ei pysyisi, kirjautuminen menisi rikki
  const vanha = String(kohdeAuth.email || kDoc.get('email') || '').toLowerCase() || null;
  if (vanha === uusi) throw new HttpsError('failed-precondition', 'Uusi osoite on sama kuin nykyinen.');
  const varattu = () => new HttpsError('already-exists', 'Sähköpostiosoite on jo käytössä toisella käyttäjällä — muutosta ei tehty.');
  try {
    const toinen = await auth.getUserByEmail(uusi);
    if (toinen && toinen.uid !== kohdeUid) throw varattu();
  } catch (e) {
    if (e && e.code === 'already-exists') throw e;
    if (_koodi(e) !== 'auth/user-not-found') throw e;
  }
  try { await auth.updateUser(kohdeUid, { email: uusi, emailVerified: false }); }
  catch (e) {
    if (_koodi(e) === 'auth/email-already-exists') throw varattu();
    if (_koodi(e) === 'auth/invalid-email') throw new HttpsError('invalid-argument', 'Virheellinen sähköpostiosoite.');
    throw e;
  }
  try { await kRef.update({ email: uusi, muokattu: admin.firestore.FieldValue.serverTimestamp() }); }
  catch (e) {
    if (vanha) { try { await auth.updateUser(kohdeUid, { email: vanha }); } catch (e2) { console.error('[vaihdaKayttajanSahkoposti] rollback epäonnistui', kohdeUid, e2 && e2.message); } }
    throw new HttpsError('internal', 'Osoitteen tallennus epäonnistui — muutos peruttu.');
  }
  try {   // seurat/{sid}.vp_email on seuran VP:n tiedoksi-kopio (vp_uid osoittaa häneen) → pidetään samassa; muun henkilön vaihto ei koske seuradokumenttiin
    const sRef = db.collection('seurat').doc(seuraId), sDoc = await sRef.get();
    if (sDoc.exists && sDoc.get('vp_uid') === kohdeUid) await sRef.update({ vp_email: uusi });
  } catch (e) { console.error('[vaihdaKayttajanSahkoposti] vp_email-päivitys epäonnistui (ei kriittinen)', seuraId, e && e.message); }
  await auth.revokeRefreshTokens(kohdeUid);
  await db.collection('audit').add({
    toiminto: 'sahkoposti_vaihdettu', severity: 'info', kohde_uid: kohdeUid, seuraId, vanha_email: vanha, uusi_email: uusi, tekija_uid: tekijaUid,
    aikaleima: admin.firestore.FieldValue.serverTimestamp(),
  }).catch((e) => { console.error('[vaihdaKayttajanSahkoposti] audit epäonnistui', e && e.message); });
  return { ok: true, vanhaEmail: vanha, uusiEmail: uusi, viesti: 'Sähköposti vaihdettu. Käyttäjä kirjautuu jatkossa uudella osoitteella; vanha istunto päättyy.' };
}
module.exports = { tarkistaOsoite, suorita, SAHKOPOSTI_RE };
