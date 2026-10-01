/* ════════════════════════════════════════════════════════════════════════
   huoltajaemail.js — huoltajan sähköposti VAIN palvelimella (Rules v3.33, 2.10.2026)

   huoltajaEmail ohjaa huoltajan pääsyä lapsen tietoihin (Rules onLapsenHuoltaja, haeLapsiHuoltajalle) ja
   suostumustarkistusta (vahvistaSuostumus vertaa tallennettua ja annettua osoitetta). Siksi selain ei enää
   muuta kenttää; Seuran pelaajamuokkaus kutsuu tätä.
   Oikeus: johto/SA koko seura, joukkueen valmentaja oma joukkue (sama kuin PIN-funktioissa).
   Audit: huoltaja_email_vaihdettu — EI osoitetta (vain oli_tyhja / tyhjennetty / suostumus_annettu).
════════════════════════════════════════════════════════════════════════ */
'use strict';
const P = require('./pelaajapin');
const K = require('./pelaajakirjautuminen');
const { suostumusAnnettu } = require('./suostumus');
const { onPaikkamerkkiOsoite } = require('./paikkamerkki');

const EMAIL_RE = /^[^\s@<>"]+@[^\s@<>"]+\.[^\s@<>"]+$/;

/* Puhdas: normalisoi syötteen. '' / null → null (tyhjennys). Heittää koodilla, jos osoite ei kelpaa. */
function normalisoiHuoltajaEmail(arvo) {
  if (arvo == null) return null;
  const e = String(arvo).trim().toLowerCase();
  if (!e) return null;
  if (e.length > 254 || !EMAIL_RE.test(e)) { const v = new Error('virheellinen'); v.syy = 'email_virheellinen'; throw v; }
  if (onPaikkamerkkiOsoite(e)) { const v = new Error('paikkamerkki'); v.syy = 'email_paikkamerkki'; throw v; }
  return e;
}

function luoKasittelija(deps) {
  const { db, tarkistaOikeus, HttpsError, FieldValue } = deps;
  const audit = deps.audit || (async () => {});
  return async function asetaHuoltajaEmail(data, context) {
    if (!context || !context.auth) throw new HttpsError('unauthenticated', 'Kirjaudu ensin.');
    const seuraId = K.normalisoiDocId(data && data.seuraId);
    const pelaajaId = K.normalisoiDocId(data && data.pelaajaId);
    if (!seuraId || !pelaajaId) throw new HttpsError('invalid-argument', 'seuraId ja pelaajaId ovat pakollisia.');
    let uusi;
    try { uusi = normalisoiHuoltajaEmail(data && data.huoltajaEmail); } catch (e) {
      throw new HttpsError('invalid-argument', e.syy === 'email_paikkamerkki'
        ? 'Esimerkkiosoitetta ei voi tallentaa huoltajan sähköpostiksi.' : 'Tarkista huoltajan sähköpostiosoite.', { syy: e.syy });
    }
    const oikeus = await P.pinOikeus(db, tarkistaOikeus, context, seuraId);
    if (!oikeus) throw new HttpsError('permission-denied', 'Ei oikeutta tämän seuran pelaajiin.');
    const ref = db.collection('seurat').doc(seuraId).collection('pelaajat').doc(pelaajaId);
    const s = await ref.get();
    if (!s.exists) throw new HttpsError('not-found', 'Pelaajaa ei löytynyt.');
    const pd = s.data() || {};
    if (!P.saaPelaajalle(oikeus, pd)) throw new HttpsError('permission-denied', 'Ei oikeutta tälle pelaajalle.');
    const vanha = pd.huoltajaEmail ? String(pd.huoltajaEmail).trim().toLowerCase() : null;
    if (vanha === uusi) return { ok: true, muuttui: false };
    await ref.update({ huoltajaEmail: uusi, muokattu: FieldValue.serverTimestamp() });
    const annettu = suostumusAnnettu(pd);
    // Suostumuksen jälkeen vaihtuva osoite siirtää pääsyn lapsen tietoihin toiselle → warn.
    await audit('huoltaja_email_vaihdettu', { seuraId, pelaajaId, tekija_uid: context.auth.uid,
      oli_tyhja: !vanha, tyhjennetty: !uusi, suostumus_annettu: annettu, severity: annettu ? 'warn' : 'info' });
    return { ok: true, muuttui: true };
  };
}

module.exports = { luoKasittelija, normalisoiHuoltajaEmail };
