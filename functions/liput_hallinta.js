'use strict';
/**
 * D1 (QG-3 vaihe 0, Tero 5.11.2026) — seuran käyttöönottolippujen hallinta SA:lle + muutosloki.
 * Callable asetaSeuranLippu({ seuraId, lippu, arvo: true|false }):
 *   · vain super-admin (admins/{uid}, sama tarkistus kuin haeAuditLoki / laskutusKuukausiVarapolku)
 *   · lippu vain rekisteristä (tm_liput.LIPUT); arvo vain boolean (pelkkä päälle/pois, ei poistoa — päätös 3)
 *   · transaktio: lue tehokas arvo (liput/julkiset → vanha seurat.liput → oletus, tm_liput.tmLippuTila),
 *     kirjoita liput/julkiset (merge, vain boolean-kenttä) JA audit-rivi samassa → loki ei voi jäädä puuttumaan
 *   · sama tehokas arvo → ei kirjoitusta eikä lokiriviä
 * Audit: { toiminto: 'lippu_muutettu', severity: 'info', seuraId, lippu, vanha, uusi, lahde_vanha, tekija_uid, aikaleima }.
 * Luku: Admin → Liput (lib/tm_liput_admin.js) ja Audit-loki (haeAuditLoki, toiminto 'lippu_muutettu').
 */
const L = require('./tm_liput');
const SEURA_ID = /^[A-Za-z0-9_-]{1,60}$/;

function kasittelija(deps) {
  const E = deps.HttpsError;
  return async (data, context) => {
    if (!context || !context.auth) throw new E('unauthenticated', 'Kirjaudu ensin.');
    if (!(await deps.onSuperAdminUid(context.auth.uid))) throw new E('permission-denied', 'Vain Super Admin.');
    const d = data || {}, seuraId = String(d.seuraId || '').trim(), lippu = String(d.lippu || '').trim();
    if (!SEURA_ID.test(seuraId)) throw new E('invalid-argument', 'seuraId puuttuu tai on virheellinen.');
    if (!L.tmLippuTunnettu(lippu)) throw new E('invalid-argument', 'Tuntematon lippu: ' + lippu);
    if (typeof d.arvo !== 'boolean') throw new E('invalid-argument', 'arvo: true tai false.');
    const db = deps.db, sref = db.collection('seurat').doc(seuraId), jref = sref.collection('liput').doc('julkiset');
    let tulos;
    try {
      tulos = await db.runTransaction(async (tx) => {
        const [s, j] = [await tx.get(sref), await tx.get(jref)];
        if (!s.exists) { const e = new Error('Seuraa ei löydy: ' + seuraId); e.koodi = 'not-found'; throw e; }
        const vanha = L.tmLippuTila(lippu, j.exists ? j.data() : null, s.data());
        if (vanha.arvo === d.arvo) return { muuttui: false, vanha: vanha.arvo, uusi: d.arvo, lahde_vanha: vanha.lahde };
        tx.set(jref, { [lippu]: d.arvo }, { merge: true });
        tx.set(db.collection('audit').doc(), {
          toiminto: 'lippu_muutettu', severity: 'info', seuraId, lippu, vanha: vanha.arvo, uusi: d.arvo, lahde_vanha: vanha.lahde,
          tekija_uid: context.auth.uid, aikaleima: deps.FieldValue.serverTimestamp(),
        });
        return { muuttui: true, vanha: vanha.arvo, uusi: d.arvo, lahde_vanha: vanha.lahde };
      });
    } catch (e) {
      if (e && e.koodi) throw new E(e.koodi, e.message);
      (deps.loki || console).error('[asetaSeuranLippu] ' + seuraId + '/' + lippu + ': ' + (e && e.message));
      throw new E('internal', 'Lipun tallennus epäonnistui.');
    }
    (deps.loki || console).log('[asetaSeuranLippu] ' + seuraId + ' · ' + lippu + ' ' + tulos.vanha + ' → ' + tulos.uusi + (tulos.muuttui ? '' : ' (ei muutosta)'));
    return Object.assign({ ok: true }, tulos);
  };
}

/* Callable-tehdas (index.js injektoi). */
function luo(deps) {
  const asetaSeuranLippu = deps.functions.region('europe-west1').runWith({ enforceAppCheck: true })
    .https.onCall(kasittelija({ db: deps.db, FieldValue: deps.admin.firestore.FieldValue, HttpsError: deps.functions.https.HttpsError, onSuperAdminUid: deps.onSuperAdminUid }));
  return { asetaSeuranLippu };
}
module.exports = { kasittelija, luo, SEURA_ID };
