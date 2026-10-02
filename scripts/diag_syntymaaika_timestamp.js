#!/usr/bin/env node
/* diag_syntymaaika_timestamp.js — KUIVA, VAIN LUKU. (Seura.html:4896: syntymaaika-Timestamp → päivä toISOString().slice(0,10))
 * Kysymys: montako pelaajaa, joiden syntymaaika-Timestamp EI ole UTC-keskiyö (tunnit/minuutit/sekunnit ≠ 0)?
 *   UTC-keskiyö → toISOString().slice(0,10) antaa oikean päivän.
 *   Muu hetki (esim. paikallinen keskiyö = 21:00/22:00Z edellisenä päivänä) → UTC-päivä on yhtä pienempi kuin tarkoitettu.
 * Ajo (ADC): node scripts/diag_syntymaaika_timestamp.js [--seura=kpv]    (ilman --seura: kaikki seurat)
 * Tulostaa vain lukumäärät (ei nimiä, ei id:itä).
 */
const path = require('path');
const admin = require(path.join(__dirname, '..', 'functions', 'node_modules', 'firebase-admin'));
const arg = (n) => { const o = process.argv.slice(2).find((a) => a.indexOf('--' + n + '=') === 0); return o ? o.split('=').slice(1).join('=') : null; };
(async () => {
  admin.initializeApp({ projectId: 'talentmaster-pilot' });
  const db = admin.firestore();
  const seurat = arg('seura') ? [await db.collection('seurat').doc(arg('seura')).get()] : (await db.collection('seurat').get()).docs;
  const yht = { pelaajia: 0, ilmanSyntymaaikaa: 0, tyyppiMuu: 0, timestamp: 0, utcKeskiyo: 0, eiUtcKeskiyo: 0 };
  const jakauma = {};   // UTC-kellonaika "HH:MM" → lkm (vain ei-keskiyö)
  for (const s of seurat) {
    const ps = await s.ref.collection('pelaajat').get();
    for (const p of ps.docs) {
      yht.pelaajia++;
      const v = p.data().syntymaaika;
      if (v == null) { yht.ilmanSyntymaaikaa++; continue; }
      if (typeof v.toDate !== 'function') { yht.tyyppiMuu++; continue; }
      yht.timestamp++;
      const d = v.toDate();
      const keskiyo = d.getUTCHours() === 0 && d.getUTCMinutes() === 0 && d.getUTCSeconds() === 0 && d.getUTCMilliseconds() === 0;
      if (keskiyo) { yht.utcKeskiyo++; continue; }
      yht.eiUtcKeskiyo++;
      const k = String(d.getUTCHours()).padStart(2, '0') + ':' + String(d.getUTCMinutes()).padStart(2, '0');
      jakauma[k] = (jakauma[k] || 0) + 1;
    }
  }
  console.log('seuroja:', seurat.length);
  console.log(yht);
  console.log('ei-UTC-keskiyö, UTC-kellonajat (HH:MM → lkm):', jakauma);
})().catch((e) => { console.error('VIRHE:', e.message); process.exit(1); });
