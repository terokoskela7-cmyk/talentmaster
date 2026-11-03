/* ════════════════════════════════════════════════════════════════════════
   laskutus_esto.js — Laskutus L1c: passiivisen joukkueen palvelinesto (.briefit/CODE_BRIEF_LASKUTUS_L1C.md §1–2; kaista Tero)

   KENEEN: vain sopimusseura (laskutus_asetukset/{sid}.laskutettava === true). Pilottiseura (false / ei asetusta) → ei estoa.
   JOUKKUE: passiivinen, jos laskutustila !== 'aktiivinen' (puuttuva = passiivinen). Demo-joukkuetta (demo: true) ei estetä.
   PELAAJA: sallittu, jos JOKIN pelaajan joukkueista on aktiivinen (tai demo). Ei yhtään joukkuetta → esto.
     Joukkuetulkinta = tm_laskutus.js tmLaskutusJoukkue (sama kuin laskennassa: tmPelaajanJoukkueet §7.18).
   Ei SA-ohitusta: SA aktivoi joukkueen Adminissa. Esto ei koske olemassa olevia PIN-koodeja eikä kirjautumista.

   luoEsto(db) → yhden kutsun / ajon välimuisti: asetukset ja joukkuedokumentit luetaan kerran per seura.
   Audit: toiminto 'laskutus_esto', funktio, seuraId, joukkueId/pelaajaId — EI nimiä.
════════════════════════════════════════════════════════════════════════ */
'use strict';
const { tmLaskutusJoukkue } = require('./tm_laskutus');

const SYY = 'joukkue_passiivinen';
const VIESTI = 'Ei käytössä – sovi käyttöönotosta TalentMasterin kanssa';   // = UI:n fi-teksti (briiffi §4)

function onAktiivinenTaiDemo(d) { return !!d && (d.laskutustila === 'aktiivinen' || d.demo === true); }

function luoEsto(db) {
  const sopimus = new Map();    // sid → Promise<boolean>
  const joukkueet = new Map();  // sid → Promise<[{id, …data}]>

  function onSopimusseura(sid) {
    if (!sopimus.has(sid)) {
      sopimus.set(sid, db.collection('laskutus_asetukset').doc(String(sid)).get()
        .then((s) => !!(s.exists && (s.data() || {}).laskutettava === true)));
    }
    return sopimus.get(sid);
  }
  function seuranJoukkueet(sid) {
    if (!joukkueet.has(sid)) {
      joukkueet.set(sid, db.collection('seurat').doc(String(sid)).collection('joukkueet').get()
        .then((q) => q.docs.map((d) => Object.assign({ id: d.id }, d.data() || {}))));
    }
    return joukkueet.get(sid);
  }

  /* Joukkueen jakso / joukkuekohtainen toiminto. Puuttuva joukkuedokumentti = passiivinen. */
  async function joukkueEstetty(sid, jid) {
    if (!(await onSopimusseura(sid))) return false;
    const docs = await seuranJoukkueet(sid);
    const d = docs.find((x) => x.id === String(jid));
    return !onAktiivinenTaiDemo(d);
  }

  /* Pelaajan toiminnot (kutsut, PIN). pelaaja = pelaajadokumentin data. */
  async function pelaajaEstetty(sid, pelaaja) {
    if (!(await onSopimusseura(sid))) return false;
    const docs = await seuranJoukkueet(sid);
    const akt = new Set(docs.filter(onAktiivinenTaiDemo).map((d) => d.id));
    return tmLaskutusJoukkue(pelaaja || {}, docs, (id) => akt.has(id)).joukkueId == null;
  }

  return { onSopimusseura, joukkueEstetty, pelaajaEstetty };
}

/* Audit-rivi (best-effort, ei nimiä). kentat: { funktio, seuraId, pelaajaId?, joukkueId?, … lukumäärät } */
function kirjaaEsto(db, FieldValue, kentat) {
  const rivi = Object.assign({ toiminto: 'laskutus_esto', severity: 'info' }, kentat, { aikaleima: FieldValue.serverTimestamp() });
  return db.collection('audit').add(rivi).catch(() => {});
}

/* Callablen virhe: failed-precondition + details.syy (UI näyttää saman tekstin, ei raakaa virhettä). */
function estoVirhe(HttpsError) { return new HttpsError('failed-precondition', VIESTI, { syy: SYY }); }

/* Yhden pelaajan tarkistus callableen: estetty → audit + heitto. */
async function vaadiPelaajaSallittu(deps, { funktio, seuraId, pelaajaId, pelaaja }) {
  const esto = deps.esto || luoEsto(deps.db);
  if (!(await esto.pelaajaEstetty(seuraId, pelaaja))) return;
  await kirjaaEsto(deps.db, deps.FieldValue, { funktio, seuraId, pelaajaId: pelaajaId || null });
  throw estoVirhe(deps.HttpsError);
}

/* Sama, mutta pelaajadokumentti luetaan tässä (callablet, joilla ei ole sitä valmiina). Ei pelaajaId:tä tai dokumenttia → varapelaaja (esim. { joukkue } uudelle kutsulle). */
async function vaadiPelaajaDocSallittu(deps, { funktio, seuraId, pelaajaId, varapelaaja }) {
  let pelaaja = varapelaaja || {};
  if (pelaajaId) {
    const s = await deps.db.collection('seurat').doc(String(seuraId)).collection('pelaajat').doc(String(pelaajaId)).get();
    if (s.exists) pelaaja = s.data() || {};
  }
  return vaadiPelaajaSallittu(deps, { funktio, seuraId, pelaajaId, pelaaja });
}

module.exports = { SYY, VIESTI, luoEsto, kirjaaEsto, estoVirhe, vaadiPelaajaSallittu, vaadiPelaajaDocSallittu };
