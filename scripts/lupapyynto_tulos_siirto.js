/**
 * Vaihe 0 / PR 4 — kertaluonteinen siirto: ennen PR 4:ää hyväksytyissä lupapyynnöissä child_pin ja
 * playerCode ovat PÄÄDOKUMENTISSA, joka on get:if true -luettava pelkällä requestId:llä.
 * Siirretään ne alidokumenttiin lupapyynnot/{rid}/tulos/{token} ja korvataan selväkielinen token
 * token_hash:lla (sama malli kuin soloHyvaksyLupa PR 4:n jälkeen).
 *
 * Oletus KUIVA-AJO (vain lukumäärät). Kirjoitus: --apply. Idempotentti. Tulostaa vain lukumäärät.
 * Ajo: cd functions && node ../scripts/lupapyynto_tulos_siirto.js [--apply]   (gcloud ADC)
 */
'use strict';
if (require.main !== module) throw new Error('scripts/lupapyynto_tulos_siirto.js käsittelee tuotantodataa — aja suoraan: node scripts/lupapyynto_tulos_siirto.js (ei require/import)');   // vahinkoajon esto (S1)
const admin = require('firebase-admin');
const crypto = require('crypto');
admin.initializeApp({ projectId: 'talentmaster-pilot' });
const db = admin.firestore();
const APPLY = process.argv.includes('--apply');
const hash = (t) => crypto.createHash('sha256').update('tm-solo-lupa:' + String(t)).digest('hex');

(async () => {
  const snap = await db.collection('lupapyynnot').get();
  const t = { yhteensa: snap.size, hyvaksyttyjaVanhalla: 0, siirretty: 0, ilmanTokenia: 0, odottaviaVanhalla: 0 };
  for (const d of snap.docs) {
    const x = d.data() || {};
    const vanhaTulos = x.child_pin != null || x.playerCode != null;
    if (x.status === 'odottaa' && x.token) t.odottaviaVanhalla++;
    if (x.status !== 'hyvaksytty' || !vanhaTulos) continue;
    t.hyvaksyttyjaVanhalla++;
    if (!x.token) { t.ilmanTokenia++; continue; }
    if (!APPLY) continue;
    const b = db.batch();
    b.set(d.ref.collection('tulos').doc(String(x.token)), {
      playerId: x.playerId || null, playerCode: x.playerCode || null, child_pin: x.child_pin || null,
      luotu: admin.firestore.FieldValue.serverTimestamp(), lahde: 'pr4_siirto',
    }, { merge: true });
    b.update(d.ref, {
      child_pin: admin.firestore.FieldValue.delete(), playerCode: admin.firestore.FieldValue.delete(),
      token: admin.firestore.FieldValue.delete(), token_hash: hash(x.token),
    });
    await b.commit();
    t.siirretty++;
  }
  if (APPLY) {
    await db.collection('audit').add({ toiminto: 'lupapyynto_tulos_siirto', severity: 'info', siirretty: t.siirretty,
      aikaleima: admin.firestore.FieldValue.serverTimestamp() }).catch(() => {});
  }
  console.log(APPLY ? 'APPLY' : 'KUIVA-AJO', t);
})().catch((e) => { console.error('virhe:', e.code || e.message); process.exit(1); });
