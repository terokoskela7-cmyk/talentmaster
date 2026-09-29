#!/usr/bin/env node
/**
 * KERTALUONTEINEN (Vaihe 0 / PR 2b → PR 3): lisää playerCode jokaiseen HYVÄKSYTTYYN lupapyyntöön,
 * josta se puuttuu. Koodi haetaan players/{playerId}.playerCode-kentästä.
 * Syy: ennen PR 2b:tä hyväksytyissä lupapyynnöissä ei ole playerCodea → lapsen "Aloita" putoaa
 * anonyymiin varapolkuun (Sentry "ei-koodia"). Tämän jälkeen palvelinreitti toimii myös vanhoilla.
 *
 * Tulostaa VAIN lukumäärät — ei nimiä, id:itä eikä PIN:ejä.
 * Idempotentti: olemassa olevaa playerCodea ei koskaan ylikirjoiteta.
 *
 * AJO (ADC):
 *   cd functions && node ../scripts/solo_lupapyynto_playercode.js            # kuiva-ajo
 *   cd functions && node ../scripts/solo_lupapyynto_playercode.js --apply    # kirjoitus
 */
'use strict';
const admin = require('firebase-admin');
admin.initializeApp({ projectId: 'talentmaster-pilot' });
const db = admin.firestore();
const APPLY = process.argv.includes('--apply');

const onKoodi = (v) => typeof v === 'string' && /^TMP-[A-Z0-9]{4,12}$/.test(v.trim());

(async () => {
  const snap = await db.collection('lupapyynnot').where('status', '==', 'hyvaksytty').get();
  const t = {
    tila: APPLY ? 'KIRJOITUS' : 'KUIVA-AJO',
    hyvaksyttyja: snap.size,
    koodiJoOlemassa: 0,
    puuttuu: 0,
    korjattavissa: 0,
    eiPlayerId: 0,
    pelaajaaEiLoydy: 0,
    pelaajallaEiKoodia: 0,
    kirjoitettu: 0,
  };
  const korjattavat = [];
  for (const d of snap.docs) {
    const x = d.data() || {};
    if (onKoodi(x.playerCode)) { t.koodiJoOlemassa++; continue; }
    t.puuttuu++;
    if (!x.playerId) { t.eiPlayerId++; continue; }
    const p = await db.collection('players').doc(String(x.playerId)).get();
    if (!p.exists) { t.pelaajaaEiLoydy++; continue; }
    const koodi = (p.data() || {}).playerCode;
    if (!onKoodi(koodi)) { t.pelaajallaEiKoodia++; continue; }
    t.korjattavissa++;
    korjattavat.push({ ref: d.ref, koodi: koodi.trim() });
  }
  if (APPLY) {
    for (const k of korjattavat) {
      // Transaktio: kirjoitetaan vain jos playerCode puuttuu yhä (ei kilpaa uuden hyväksynnän kanssa).
      const kirjoitettiin = await db.runTransaction(async (tx) => {
        const s = await tx.get(k.ref);
        if (!s.exists || onKoodi((s.data() || {}).playerCode)) return false;
        tx.update(k.ref, { playerCode: k.koodi, playerCode_lisatty: admin.firestore.FieldValue.serverTimestamp() });
        return true;
      });
      if (kirjoitettiin) t.kirjoitettu++;
    }
    await db.collection('audit').add({
      toiminto: 'solo_lupapyynto_playercode_backfill', severity: 'info',
      kirjoitettu: t.kirjoitettu, aikaleima: admin.firestore.FieldValue.serverTimestamp(),
    }).catch(() => {});
  }
  console.log(t);
})().catch((e) => { console.error('virhe:', e.code || e.message); process.exit(1); });
