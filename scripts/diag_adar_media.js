#!/usr/bin/env node
/* diag_adar_media.js — ADAR-kuvien ja AI-tekstien INVENTAARIO. Kuiva ajo oletuksena.
 *
 * Miksi: "Lisää kuva havaintoon" tallensi kuvan alaikäisestä Storageen ja lähetti sen aiProxyn
 * kautta OpenAI:lle (Yhdysvallat) ilman suostumusmekanismia. Toiminto on poistettu, mutta jo
 * tallennettu data on inventoitava ennen kuin poistosta päätetään.
 *
 * ⚠ Kuvat kirjoitettiin polkuun `seurat/{sid}/havainnot/pre_<aikaleima>/…`, EI havainnon id:n
 * alle. Siksi pelkkä havainto-id-prefiksi ei löydä niitä, ja myös ORVOT kuvat (lataus onnistui,
 * havainnon tallennus epäonnistui) löytyvät vain listaamalla bucket suoraan.
 *
 * Tulostaa vain id:t ja polut — EI sisältöä, ei narratiiveja.
 *
 * Ajo:
 *   node scripts/diag_adar_media.js                 # kuiva, kaikki seurat
 *   node scripts/diag_adar_media.js --seura=sjk     # yksi seura
 *   node scripts/diag_adar_media.js --poista        # POISTAA (vasta Teron päätöksen jälkeen)
 *
 * Vaatii GOOGLE_APPLICATION_CREDENTIALS-ympäristömuuttujan (Admin SDK).
 */

const admin = require('firebase-admin');

const argv = process.argv.slice(2);
const arg = (nimi) => {
  const o = argv.find((a) => a.indexOf('--' + nimi + '=') === 0);
  return o ? o.split('=').slice(1).join('=') : null;
};
const VAIN_SEURA = arg('seura');
const POISTA = argv.includes('--poista');

/* Kentät, jotka poistetaan `--poista`-ajolla. `media` = kuvaviitteet, `ai_*` = OpenAI:n tuottama
   teksti ja sen metatiedot. */
const AI_KENTAT = ['media', 'ai_narratiivi', 'ai_malli', 'ai_analysoitu', 'ai_luottamus'];

async function main() {
  if (!admin.apps.length) admin.initializeApp({ credential: admin.applicationDefault() });
  const db = admin.firestore();
  const bucket = admin.storage().bucket();

  console.log(POISTA ? '⚠ POISTOAJO — tämä kirjoittaa ja poistaa.\n' : 'KUIVA-AJO — ei kirjoituksia.\n');

  const seurat = VAIN_SEURA
    ? [await db.collection('seurat').doc(VAIN_SEURA).get()]
    : (await db.collection('seurat').get()).docs;

  let firestoreYht = 0, storageYht = 0;

  // ── 1 · Firestore: havainnot joissa media[] tai ai_narratiivi ───────────
  console.log('FIRESTORE — havainnot joissa media[] tai ai_narratiivi');
  for (const s of seurat) {
    if (!s.exists) { console.log('  (seuraa ei ole: ' + VAIN_SEURA + ')'); continue; }
    const pelaajat = await db.collection('seurat').doc(s.id).collection('pelaajat').get();
    const osumat = [];
    for (const pel of pelaajat.docs) {
      const hav = await pel.ref.collection('havainnot').get();
      for (const h of hav.docs) {
        const d = h.data() || {};
        const onMedia = Array.isArray(d.media) && d.media.length > 0;
        const onAi = typeof d.ai_narratiivi === 'string' && d.ai_narratiivi.trim() !== '';
        if (!onMedia && !onAi) continue;
        osumat.push({ ref: h.ref, id: h.id, pelaajaId: pel.id, onMedia, onAi });
      }
    }
    firestoreYht += osumat.length;
    console.log('  ' + s.id.padEnd(16) + osumat.length + ' havaintoa');
    osumat.forEach((o) => {
      console.log('      ' + o.pelaajaId + '/' + o.id
        + (o.onMedia ? ' [media]' : '') + (o.onAi ? ' [ai_narratiivi]' : ''));
    });

    if (POISTA && osumat.length) {
      for (const o of osumat) {
        const tyhjennys = {};
        AI_KENTAT.forEach((k) => { tyhjennys[k] = admin.firestore.FieldValue.delete(); });
        await o.ref.update(tyhjennys);
      }
      console.log('      → kentät poistettu (' + AI_KENTAT.join(', ') + ')');
    }
  }

  // ── 2 · Storage: kaikki objektit seurat/*/havainnot/ ────────────────────
  console.log('\nSTORAGE — objektit prefiksillä seurat/*/havainnot/');
  for (const s of seurat) {
    if (!s.exists) continue;
    const prefix = 'seurat/' + s.id + '/havainnot/';
    let tiedostot = [];
    try {
      const [files] = await bucket.getFiles({ prefix });
      tiedostot = files;
    } catch (e) {
      console.log('  ' + s.id.padEnd(16) + 'lukuvirhe: ' + (e && e.message));
      continue;
    }
    storageYht += tiedostot.length;
    console.log('  ' + s.id.padEnd(16) + tiedostot.length + ' objektia');
    tiedostot.forEach((f) => {
      /* `pre_`-alkuinen kansio = kuva ladattiin ENNEN havainnon luontia, joten se ei ole minkään
         havainto-id:n alla. Nämä jäivät GDPR-poistolta löytymättä. */
      const orpo = /\/havainnot\/pre_/.test(f.name) ? '  ← pre_ (ei havainto-id:n alla)' : '';
      console.log('      ' + f.name + orpo);
    });
    if (POISTA && tiedostot.length) {
      for (const f of tiedostot) await f.delete().catch(() => {});
      console.log('      → objektit poistettu');
    }
  }

  console.log('\nYHTEENVETO');
  console.log('  Firestore-havaintoja media/ai-kentillä: ' + firestoreYht);
  console.log('  Storage-objekteja havainnot-poluissa:   ' + storageYht);
  if (!POISTA) {
    console.log('\n  Tämä oli kuiva ajo. Poisto: --poista (vasta kun poistosta on päätetty).');
  }
}

main().then(() => process.exit(0)).catch((e) => { console.error(e); process.exit(1); });
