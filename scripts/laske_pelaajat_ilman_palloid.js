#!/usr/bin/env node
/**
 * KUIVA-AJO (READ-ONLY): pelaajat ilman PalloID:tä seuroittain — VAIN LUKUMÄÄRÄT.
 * Vaihe 0 / PR 1 (CODE_BRIEF_PELAAJAN_TUNNISTUS v2): uusi kirjautuminen on PalloID + PIN;
 * PalloID:ttömät saavat pelaajakoodin PR 2:ssa. Tämä kertoo, kuinka moni odottaa sitä.
 *
 * Ei tulosta nimiä, id:itä eikä PIN:ejä. Lukee vain kentät tunniste/palloID/palloId/pin (select).
 * AJO:  cd functions && node ../scripts/laske_pelaajat_ilman_palloid.js
 * AUTENTIKOINTI: Application Default Credentials (gcloud auth application-default login).
 */
'use strict';
const admin = require('firebase-admin');
admin.initializeApp({ projectId: 'talentmaster-pilot' });
const db = admin.firestore();

const onTunnus = (v) => typeof v === 'string' ? v.trim().length > 0 : (typeof v === 'number');

(async () => {
  const seurat = await db.collection('seurat').select().get();
  const rivit = [];
  let yht = { pelaajia: 0, ilman: 0, ilmanJaPin: 0 };
  for (const s of seurat.docs) {
    const snap = await s.ref.collection('pelaajat').select('tunniste', 'palloID', 'palloId', 'pin').get();
    let ilman = 0, ilmanJaPin = 0;
    snap.docs.forEach((d) => {
      const x = d.data();
      if (!(onTunnus(x.tunniste) || onTunnus(x.palloID) || onTunnus(x.palloId))) {
        ilman++;
        if (x.pin != null && String(x.pin).trim()) ilmanJaPin++;
      }
    });
    rivit.push({ seura: s.id, pelaajia: snap.size, ilmanPalloID: ilman, joistaPINillinen: ilmanJaPin });
    yht.pelaajia += snap.size; yht.ilman += ilman; yht.ilmanJaPin += ilmanJaPin;
  }
  console.table(rivit);
  console.log('YHTEENSÄ', yht);
})().catch((e) => { console.error('virhe:', e.code || e.message); process.exit(1); });
