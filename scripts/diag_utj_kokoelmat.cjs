// VAIN LUKU: laskee seurat/{sid}/dna_konfig ja seurat/{sid}/kasvattisuppilo -dokumentit per seura (count-aggregaatti).
// Ajo repon juuresta: node scripts/diag_utj_kokoelmat.cjs   (gcloud ADC, projekti talentmaster-pilot). Ei kirjoita mitään.
const path = require('path');
const admin = require(path.join(process.cwd(), 'node_modules', 'firebase-admin'));
admin.initializeApp({ projectId: 'talentmaster-pilot' });
const db = admin.firestore();
(async () => {
  const seurat = await db.collection('seurat').get();
  const rivit = [];
  for (const s of seurat.docs) {
    const r = { seura: s.id, demo: s.data().demo === true };
    for (const k of ['dna_konfig', 'kasvattisuppilo']) r[k] = (await s.ref.collection(k).count().get()).data().count;
    rivit.push(r);
  }
  console.table(rivit);
  console.log('Yhteensä: dna_konfig', rivit.reduce((a, r) => a + r.dna_konfig, 0), '· kasvattisuppilo', rivit.reduce((a, r) => a + r.kasvattisuppilo, 0), '· seuroja', rivit.length);
  process.exit(0);
})().catch((e) => { console.error('Virhe:', e.message); process.exit(1); });
