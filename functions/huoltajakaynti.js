'use strict';
/**
 * S1.1 Käyttöaste — huoltajan käynnin aikaleima palvelimella (docs/CODE_BRIEF_S1_1_KAYTTOASTE.md §1).
 * Huoltajalla ei ole seuraId-claimia eikä Rules salli hänen kirjoittaa pelaajadokumenttiin kenttää `huoltajaViimeisinKaynti` → kirjoitus vain Admin SDK:lla tässä callablessa.
 * Callable kirjaaHuoltajaKaynti({ seuraId, pelaajaId }): App Check pakollinen (index.js); kutsuja tunnistetaan autentikoidusta sähköpostista — pelaajan `huoltajaEmail` (tallennettu palvelimella,
 * Rules v3.33) on oltava sama (sama ehto kuin Rules onLapsenHuoltaja ja haeLapsiHuoltajalle). Kirjoitus kerran päivässä (Helsingin päivä 'YYYY-MM-DD'), päivämäärä ei sisältöä.
 * Linkkikäynti ilman sähköpostia (anonyymi) ei kirjaudu → ei lasketa huoltajakäynniksi (raportoitu S1.1:ssä; kattaa sähköpostikirjautumisen).
 */
const { normalisoiDocId, helsinginPaiva } = require('./pelaajakirjautuminen');

function luoKasittelija(deps) {
  const { db, HttpsError } = deps;
  const nytF = deps.nyt || (() => Date.now());
  return async function kirjaaHuoltajaKaynti(data, context) {
    if (!context || !context.auth || !context.auth.token || !context.auth.token.email) return { kirjattu: false, syy: 'ei_sahkopostia' };   // anonyymi/linkki: ei virhettä (best-effort)
    const seuraId = normalisoiDocId(data && data.seuraId), pelaajaId = normalisoiDocId(data && data.pelaajaId);
    if (!seuraId || !pelaajaId) throw new HttpsError('invalid-argument', 'seuraId ja pelaajaId pakollisia.');
    const email = String(context.auth.token.email).toLowerCase().trim();
    const ref = db.collection('seurat').doc(seuraId).collection('pelaajat').doc(pelaajaId);
    const snap = await ref.get();
    if (!snap || !snap.exists) return { kirjattu: false, syy: 'ei_loydy' };
    const x = snap.data() || {};
    if (typeof x.huoltajaEmail !== 'string' || x.huoltajaEmail.toLowerCase().trim() !== email) throw new HttpsError('permission-denied', 'Ei huoltajan oikeutta tähän pelaajaan.');   // §Rules onLapsenHuoltaja: sama ehto
    const tanaan = helsinginPaiva(nytF());
    if (typeof x.huoltajaViimeisinKaynti === 'string' && x.huoltajaViimeisinKaynti.slice(0, 10) === tanaan) return { kirjattu: false, syy: 'jo_tanaan' };
    await ref.update({ huoltajaViimeisinKaynti: tanaan });
    return { kirjattu: true };
  };
}

module.exports = { luoKasittelija };
