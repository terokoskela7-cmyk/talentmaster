#!/usr/bin/env node
/**
 * KUIVA-AJO (READ-ONLY): Solo-pelaajat (ylätason `players`) — VAIN LUKUMÄÄRÄT.
 * Vaihe 0 / PR 2b: soloLapsiKirjaudu (playerCode + PIN). Kertoo PR 4:n PIN-vaihtoa varten,
 * kuinka monella Solo-pelaajalla on child_pin ja playerCode. Ei nimiä, id:itä eikä PIN:ejä.
 * AJO: cd functions && node ../scripts/laske_solo_pelaajat.js   (ADC)
 */
'use strict';
const admin = require('firebase-admin');
admin.initializeApp({ projectId: 'talentmaster-pilot' });
const db = admin.firestore();
(async () => {
  const snap = await db.collection('players').select('child_pin', 'playerCode', 'parent_uid', 'seuraId', 'lahde').get();
  const t = { soloPelaajia: snap.size, childPin: 0, playerCode: 0, pinJaKoodi: 0, parentUid: 0, seuraanLinkitetty: 0, lahde: {} };
  snap.docs.forEach((d) => {
    const x = d.data();
    const pin = x.child_pin != null && String(x.child_pin).trim() !== '';
    const koodi = typeof x.playerCode === 'string' && x.playerCode.trim() !== '';
    if (pin) t.childPin++;
    if (koodi) t.playerCode++;
    if (pin && koodi) t.pinJaKoodi++;
    if (x.parent_uid) t.parentUid++;
    if (x.seuraId) t.seuraanLinkitetty++;
    const l = x.lahde || '(ei)'; t.lahde[l] = (t.lahde[l] || 0) + 1;
  });
  const pc = await db.collection('playerCodes').select().get();
  t.playerCodeIndeksi = pc.size;
  console.log(t);
})().catch((e) => { console.error('virhe:', e.code || e.message); process.exit(1); });
