'use strict';
/**
 * K35-6c (D192) · Viikkoilmoituksen trigger — Täytä viikko / Monista kirjoittaa erän tapahtumia (viikko_era) → perheille YKSI ilmoitus per kohde + ISO-viikko (viikko_<kohde>_<vvvv-Www>), ei yksi per tapahtuma.
 * Päätöslogiikka: kalenteri_notif.js (viikkoKohde, viikkoPaatos, varaaViikkoErä, kirjoitaNotif). Yksittäiset tapahtumat ilman viikko_era-merkintää (Uusi tapahtuma, sarjat) eivät laukaise tätä.
 * Päättynyt / peruttu / henkilökunnan tapahtuma → ei ilmoitusta. Fan-out kerran (marker notifikaatio_erat); epäonnistuminen vapauttaa varauksen.
 * deps: { functions, admin, db, roster(sid, ev), optOut(pelaaja, tyyppi) } — index.js injektoi (_c4Roster, _c4OptOut).
 */
const { kirjoitaNotif, viikkoKohde, viikkoPaatos, varaaViikkoErä } = require('./kalenteri_notif');

async function kasittele(deps, ev, sid) {
  const { admin, db } = deps; ev = ev || {};
  if (typeof ev.viikko_era !== 'string' || !ev.viikko_era) return null;
  const seura = db.collection('seurat').doc(sid), jSnap = await seura.collection('joukkueet').get(), docs = [];
  jSnap.forEach((d) => docs.push({ id: d.id, nimi: (d.data() || {}).nimi }));
  const kohde = viikkoKohde(ev, docs); if (!kohde) return null;
  const alustava = viikkoPaatos(ev, kohde, 1, new Date()); if (!alustava) return null;
  const erat = seura.collection('notifikaatio_erat');
  if (!(await varaaViikkoErä(erat, alustava.avain, admin.firestore.FieldValue))) return null;   // toinen onCreate-ajo samasta erästä hoitaa
  try {
    const eraSnap = await seura.collection('kalenteri').where('viikko_era', '==', ev.viikko_era).get(), maara = eraSnap.docs.filter((d) => (d.data() || {}).poistettu !== true).length;
    const paatos = viikkoPaatos(ev, kohde, maara, new Date()), roster = await deps.roster(sid, ev), notifCol = (pid) => seura.collection('pelaajat').doc(pid).collection('notifikaatiot');
    for (const p of roster) {
      if (deps.optOut(p, 'viikko')) continue;
      await kirjoitaNotif(notifCol(p.id), paatos, paatos.avain, admin.firestore.FieldValue).catch((err) => console.warn('[c4 viikko]', err && err.message));
    }
  } catch (e) { await erat.doc(alustava.avain).delete().catch(() => {}); throw e; }   // epäonnistui → varaus pois, seuraava erä yrittää uudelleen
  return null;
}

function viikkoTrigger(deps) {
  return deps.functions.region('europe-west1').firestore.document('seurat/{sid}/kalenteri/{tapahtumaId}').onCreate((snap, context) => kasittele(deps, snap.data(), context.params.sid));
}
module.exports = { viikkoTrigger, kasittele };
