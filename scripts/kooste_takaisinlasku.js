#!/usr/bin/env node
'use strict';
/**
 * Seuran pulssi S1 — TAKAISINLASKENTA (docs/CODE_BRIEF_S1_SEURAN_PULSSI.md): laskee edelliset 3 ISO-viikkoa NYKYTILASTA ja merkitsee ne `arvio: true`
 * (jakson historiallista tilaa ei voi täysin palauttaa) → S2 voi näyttää trendin heti, ja arviot erottuvat. TERO AJAA (tuotantodata); Code ei aja.
 *
 * Sama laskenta kuin ajastetussa funktiossa (functions/seuran_kooste.js + jaetut lib-kopiot). Kirjoittaa VAIN seurat/{sid}/kooste/{vk} ja kooste_joukkue/{jid}_{vk};
 * EI korvaa palvelimen oikeaa (ei-arvio) koostetta (eiYlikirjoitaTodellista). Ei nimiä eikä pelaaja-ID:itä koosteessa; tuloste = vain lukumäärät.
 *
 * VARA: sama toiminto on napissa Excel_Tuonti → SA → "📊 Takaisinlaske kooste (3 vk)" (callable paivitaSeuranKooste {takaisin:3}); tämä skripti jää varalle.
 * AJO (gcloud ADC, Teron tili; ei SA-avainta):
 *   node scripts/kooste_takaisinlasku.js                        → KUIVA-AJO kaikille aktiivisille seuroille (ei kirjoita; tulostaa lukumäärät)
 *   node scripts/kooste_takaisinlasku.js --kirjoita             → kirjoittaa
 *   node scripts/kooste_takaisinlasku.js --seura=<seuraId> --kirjoita
 *   node scripts/kooste_takaisinlasku.js --viikkoja=3           → (oletus 3, enintään 8)
 */
const admin = require('firebase-admin');
const S = require('../functions/seuran_kooste');
const H = require('../functions/helsinki_paiva');

const arg = (nimi) => { const a = process.argv.find((x) => x.startsWith('--' + nimi + '=')); return a ? a.slice(nimi.length + 3) : null; };
const kirjoita = process.argv.includes('--kirjoita');
const viikkoja = Math.max(1, Math.min(8, parseInt(arg('viikkoja') || '3', 10) || 3));
const vainSeura = arg('seura');

async function main() {
  if (!admin.apps.length) admin.initializeApp({ projectId: 'talentmaster-pilot' });
  const db = admin.firestore();
  const nytMs = Date.now(), kuluva = H.viikonRajat(nytMs);
  const viikot = []; for (let i = viikkoja; i >= 1; i--) viikot.push(H.viikonRajat(kuluva.alkuMs - i * 7 * 86400000 + 12 * 3600000));   // vanhin ensin
  console.log((kirjoita ? 'KIRJOITUS' : 'KUIVA-AJO') + ' · viikot ' + viikot.map((v) => v.tunniste).join(', ') + ' · arvio:true · ' + (vainSeura ? 'seura ' + vainSeura : 'kaikki aktiiviset seurat'));
  const deps = { db, FieldValue: admin.firestore.FieldValue, FieldPath: admin.firestore.FieldPath };
  let seurat = (await db.collection('seurat').get()).docs.filter((d) => (d.data() || {}).aktiivinen !== false).map((d) => d.id);
  if (vainSeura) seurat = seurat.filter((id) => id === vainSeura);
  if (!seurat.length) { console.log('Ei seuroja.'); return; }
  let virheita = 0;
  for (const sid of seurat) {
    for (const rajat of viikot) {
      try {
        const r = await S.laskeSeura(deps, sid, { rajat, nytMs, arvio: true, eiYlikirjoitaTodellista: true, kuiva: !kirjoita });
        if (r.ohitettu) { console.log(`  ${sid.slice(0, 4)}… ${rajat.tunniste}: ohitettu (oikea kooste olemassa)`); continue; }
        const yht = { pel: 0, jaksolla: 0, valinta: 0, kats: 0, vastanneet: 0, vperusta: 0, kajal: 0, kperusta: 0, jakso: 0 };
        const joukkueet = r.doc ? Object.values(r.doc.joukkueet) : [];
        joukkueet.forEach((j) => { yht.pel += j.n_pelaajat; yht.jaksolla += j.n_jaksolla; yht.valinta += j.n_valinta_odottaa; yht.kats += j.n_katselmus; yht.vastanneet += j.n_vastanneet; yht.vperusta += j.n_vastausperusta; yht.kajal += j.n_katselmus_ajallaan; yht.kperusta += j.n_katselmus_perusta; yht.jakso += j.jakso ? 1 : 0; });
        console.log(`  ${sid.slice(0, 4)}… ${rajat.tunniste}: joukkueita ${r.joukkueita}${r.doc ? ` (joukkuejakso ${yht.jakso}) · pelaajat ${yht.pel} · jaksolla ${yht.jaksolla} (valinta odottaa ${yht.valinta}, katselmus ${yht.kats}) · katsaus ${yht.vastanneet}/${yht.vperusta} · katselmus ajallaan ${yht.kajal}/${yht.kperusta}` : ' kirjoitettu'}`);
      } catch (e) { virheita++; console.error(`  ${sid.slice(0, 4)}… ${rajat.tunniste}: VIRHE ${e && e.message}`); }
    }
  }
  console.log(virheita ? `Valmis, ${virheita} virhettä.` : (kirjoita ? 'Valmis.' : 'Kuiva-ajo valmis — lisää --kirjoita kirjoittaaksesi.'));
}
// Vahinkoajon esto: ajo vain suoraan (`node scripts/kooste_takaisinlasku.js`), ei require/import-kutsulla (tests/scripts_ei_ajeta_requirella.test.js).
if (require.main === module) { main().catch((e) => { console.error(e); process.exit(1); }); }
module.exports = { main };
