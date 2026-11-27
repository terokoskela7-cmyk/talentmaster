#!/usr/bin/env node
/* ════════════════════════════════════════════════════════════════════════
   scripts/poista_alle10_pinit.js — 8–9 v -esto, vaihe 0 §7.6 kohta 6 (PM päätös 8, 3.11.2026; TERO AJAA).
   Alle 10-vuotiaiden (tmPelaajaAppTila === 'ika_alle_10', sama lib kuin palvelimella) jo olemassa olevat PIN:t pois:
     · seurat/{sid}/pelaajat/{pid}: pin + pin_asetettu poistetaan (FieldValue.delete)
     · _pelaajaPin/{sid}_{pid} poistetaan (hajautus → kirjautuminen ei onnistu edes vanhalla PIN:llä)
     · auth.revokeRefreshTokens('pel_' + sid + '_' + pid) → jo kirjautunut istunto päättyy (tunnusta ei ole → ohitetaan)
   Syntymävuosi puuttuu → EI kosketa (PM päätös 8: ei estä kirjautumista). Suostumusta, huoltajaa ja muuta dataa ei muuteta.
   · Kuiva-ajo oletuksena: tulostaa vain lukumäärät seuroittain (EI nimiä, id:itä eikä PIN:iä). --kirjoita + vahvistus KIRJOITA (tai --kylla).
   · Audit-rivi 'alle10_pin_poistettu' (lukumäärät) kirjoitusajossa.
   Tunnistus: gcloud ADC (gcloud auth application-default login), EI palvelutiliavainta.
   Käyttö: node scripts/poista_alle10_pinit.js [--seura sid] [--vuosi 2026] [--kirjoita] [--kylla]
════════════════════════════════════════════════════════════════════════ */
'use strict';
const IKA = require('../lib/tm_pelaaja_ika.js');
const PROJECT_ID = 'talentmaster-pilot';

function onPin(pd) { return pd.pin != null && String(pd.pin).trim() !== ''; }

/* Puhdas suunnitelma yhdelle seuralle: pelaajat = [{ id, …data }], hajautukset = Set('sid_pid'). */
function suunnittele(seuraId, pelaajat, hajautukset, vuosi) {
  const kohteet = [];
  let alle10 = 0, ikaPuuttuu = 0;
  pelaajat.forEach((p) => {
    const t = IKA.tmPelaajaAppTila(p, vuosi);
    if (t === IKA.SYY_PUUTTUU) { ikaPuuttuu++; return; }
    if (t !== IKA.SYY_ALLE) return;
    alle10++;
    const hash = hajautukset.has(seuraId + '_' + p.id);
    if (onPin(p) || hash) kohteet.push({ id: p.id, pin: onPin(p), hash });
  });
  return { seuraId, alle10, ikaPuuttuu, kohteet, pinKentta: kohteet.filter((k) => k.pin).length, hajautus: kohteet.filter((k) => k.hash).length };
}

async function aja({ db, auth, FieldValue, seuraIdt, vuosi, kirjoita, kylla, kysy, loki = console.log }) {
  const suunnitelmat = [];
  for (const sid of seuraIdt) {
    const snap = await db.collection('seurat').doc(sid).collection('pelaajat').get();
    const pelaajat = snap.docs.map((d) => Object.assign({ id: d.id }, d.data() || {}));
    const ehdokkaat = pelaajat.filter((p) => IKA.tmPelaajaAppTila(p, vuosi) === IKA.SYY_ALLE);
    const hajautukset = new Set();
    for (const p of ehdokkaat) { const h = await db.collection('_pelaajaPin').doc(sid + '_' + p.id).get(); if (h.exists) hajautukset.add(sid + '_' + p.id); }
    const s = suunnittele(sid, pelaajat, hajautukset, vuosi);
    suunnitelmat.push(s);
    loki(sid + ': alle 10 v ' + s.alle10 + ' · poistettavia PIN:ejä ' + s.kohteet.length + ' (kenttä ' + s.pinKentta + ', hajautus ' + s.hajautus + ') · syntymävuosi puuttuu ' + s.ikaPuuttuu + ' (ei kosketa)');
  }
  const yht = suunnitelmat.reduce((a, s) => a + s.kohteet.length, 0);
  loki('Yhteensä ' + yht + ' pelaajaa (vuosi ' + vuosi + ', raja ikä ≤ ' + IKA.RAJA_IKA + ').');
  if (!kirjoita || !yht) { loki(yht ? 'Kuiva-ajo: ei kirjoitettu. Kirjoita lipulla --kirjoita.' : 'Ei poistettavaa.'); return { suunnitelmat, kirjoitettu: false }; }
  if (!kylla) { const v = await kysy('Poistetaanko PIN:t ja mitätöidäänkö istunnot? Vahvista kirjoittamalla KIRJOITA: '); if (String(v).trim() !== 'KIRJOITA') { loki('Peruttu: ei kirjoitettu.'); return { suunnitelmat, kirjoitettu: false }; } }
  let poistettu = 0, istuntoja = 0;
  for (const s of suunnitelmat) {
    for (const k of s.kohteet) {
      const b = db.batch();
      b.update(db.collection('seurat').doc(s.seuraId).collection('pelaajat').doc(k.id), { pin: FieldValue.delete(), pin_asetettu: FieldValue.delete() });
      b.delete(db.collection('_pelaajaPin').doc(s.seuraId + '_' + k.id));
      await b.commit();
      poistettu++;
      try { await auth.revokeRefreshTokens('pel_' + s.seuraId + '_' + k.id); istuntoja++; }
      catch (e) { if (!e || e.code !== 'auth/user-not-found') throw e; }   // ei koskaan kirjautunut → ei istuntoa
    }
  }
  await db.collection('audit').add({ toiminto: 'alle10_pin_poistettu', severity: 'info', vuosi, poistettu, istuntoja_mitatoity: istuntoja,
    seurat: suunnitelmat.map((s) => ({ seuraId: s.seuraId, poistettu: s.kohteet.length })), tekija: 'skripti:poista_alle10_pinit', aikaleima: FieldValue.serverTimestamp() });
  loki('✓ Poistettu ' + poistettu + ' PIN:iä, istuntoja mitätöity ' + istuntoja + '.');
  return { suunnitelmat, kirjoitettu: true, poistettu, istuntoja };
}

async function main() {
  const argv = process.argv.slice(2), arvo = (l) => { const i = argv.indexOf(l); return i >= 0 ? argv[i + 1] : null; };
  const admin = require('firebase-admin'); if (!admin.apps.length) admin.initializeApp({ credential: admin.credential.applicationDefault(), projectId: PROJECT_ID });
  const db = admin.firestore();
  const seuraIdt = arvo('--seura') ? [arvo('--seura')] : (await db.collection('seurat').get()).docs.map((d) => d.id);
  const vuosi = arvo('--vuosi') ? Number(arvo('--vuosi')) : IKA.tmHelsinkiVuosi();
  const kysy = (q) => new Promise((r) => { const rl = require('readline').createInterface({ input: process.stdin, output: process.stdout }); rl.question(q, (v) => { rl.close(); r(v); }); });
  await aja({ db, auth: admin.auth(), FieldValue: admin.firestore.FieldValue, seuraIdt, vuosi, kirjoita: argv.includes('--kirjoita'), kylla: argv.includes('--kylla'), kysy });
}
module.exports = { suunnittele, aja };
if (require.main === module) main().catch((e) => { console.error('VIRHE:', e.message); process.exit(1); });
