#!/usr/bin/env node
'use strict';
/**
 * Listayhteenveto — BACKFILL (Vaihe 0 B.4): rakentaa seurat/{sid}/lista_joukkue/{jid} kaikille aktiivisille seuroille. TERO AJAA (tuotanto-/staging-data); Code ei aja.
 * Sama laskenta kuin ajastetussa funktiossa (functions/lista_yhteenveto.js + jaetut lib-kopiot). Kirjoittaa VAIN lista_joukkue-dokumentit (Admin SDK); ei koske pelaaja- eikä joukkuedokumentteihin.
 * OLETUS = KUIVA-AJO: ei kirjoita, tulostaa seuroittain lukumäärät (joukkueita, pelaajia, rivejä, tavuja) — ei nimiä eikä ID:itä.
 * AJO (gcloud ADC, ei SA-avainta):
 *   node scripts/lista_yhteenveto_backfill.js                              → KUIVA-AJO, kaikki aktiiviset seurat, oletusprojekti talentmaster-pilot
 *   node scripts/lista_yhteenveto_backfill.js --projekti=talentmaster-staging
 *   node scripts/lista_yhteenveto_backfill.js --seura=<seuraId> --kirjoita → kirjoittaa yhden seuran
 *   node scripts/lista_yhteenveto_backfill.js --kirjoita                   → kirjoittaa kaikki
 */
const admin = require('firebase-admin');
const S = require('../functions/lista_yhteenveto');

const arg = (nimi) => { const a = process.argv.find((x) => x.startsWith('--' + nimi + '=')); return a ? a.slice(nimi.length + 3) : null; };
const kirjoita = process.argv.includes('--kirjoita');
const projekti = arg('projekti') || 'talentmaster-pilot', vainSeura = arg('seura');

async function main() {
  if (!admin.apps.length) admin.initializeApp({ projectId: projekti });
  const db = admin.firestore();
  console.log((kirjoita ? 'KIRJOITUS' : 'KUIVA-AJO (ei kirjoita; lisää --kirjoita)') + ' · projekti ' + projekti + ' · ' + (vainSeura ? 'seura ' + vainSeura : 'kaikki aktiiviset seurat'));
  const r = await S.laskeKaikki({ db, FieldValue: admin.firestore.FieldValue }, { nytMs: Date.now(), kuiva: !kirjoita, vainSeura });
  r.tulokset.forEach((x) => console.log('  ' + x.sid + ': ' + x.joukkueita + ' joukkuetta · ' + x.pelaajia + ' pelaajaa · ' + x.rivejaYht + ' riviä · ' + Math.round(x.tavuja / 1024) + ' kt' + (x.poistettu ? ' · poistettu vanhentuneita ' + x.poistettu : '')));
  r.virheet.forEach((v) => console.log('  ✗ ' + v.sid + ': ' + v.viesti));
  console.log('Valmis: ' + r.tulokset.length + ' seuraa ok, ' + r.virheet.length + ' virhettä' + (kirjoita ? '' : ' (kuiva-ajo)'));
  process.exit(r.virheet.length ? 1 : 0);
}
// Vahinkoajon esto: ajo vain suoraan, ei require/import-kutsulla (tests/scripts_ei_ajeta_requirella.test.js).
if (require.main === module) { main().catch((e) => { console.error(e); process.exit(1); }); }
module.exports = { main };
