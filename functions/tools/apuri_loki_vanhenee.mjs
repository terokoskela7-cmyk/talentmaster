#!/usr/bin/env node
/**
 * Kertaskripti (Tero 2.11.2026): lisää `vanhenee`-kentän (Firestore Timestamp) valmennusapurin vanhoihin
 * dokumentteihin, joissa sitä ei vielä ole. Firestoren TTL-käytäntö poistaa dokumentin, kun `vanhenee` on ohitettu.
 *   valmennusapuri_loki      vanhenee = aika + 182 vrk        (6 kk)
 *   valmennusapuri_budjetti  vanhenee = paivitetty + 400 vrk
 * Jos aikakenttä puuttuu tai on rikki, pohjana on dokumentin luontiaika (createTime).
 *
 * OLETUS ON KUIVA-AJO: tulostaa vain lukumäärät eikä kirjoita mitään. Kirjoitus vaatii lipun --kirjoita.
 * Lukee vain aikakentät (`select()`), joten kysymykset ja vastaukset eivät tule koneelle eikä niitä tulosteta.
 * Dokumentteja, joissa `vanhenee` on jo, ei kosketa (idempotentti: voi ajaa uudelleen).
 *
 * Tunnistus: gcloud ADC (ei avaintiedostoa).
 *   gcloud auth application-default login
 *   node functions/tools/apuri_loki_vanhenee.mjs                 # kuiva-ajo (sama kuin --kuiva)
 *   node functions/tools/apuri_loki_vanhenee.mjs --kirjoita      # kirjoittaa
 * Valinnaiset: --projekti talentmaster-pilot (oletus) · --kokoelma valmennusapuri_loki|valmennusapuri_budjetti
 */
import { createRequire } from 'node:module';
import { pathToFileURL } from 'node:url';

const require = createRequire(import.meta.url);
const { LOKI_SAILYTYS_VRK, BUDJETTI_SAILYTYS_VRK, vanheneeAika } = require('../valmennusapuri.js');

export const KOKOELMAT = {
  valmennusapuri_loki: { kentta: 'aika', vrk: LOKI_SAILYTYS_VRK },
  valmennusapuri_budjetti: { kentta: 'paivitetty', vrk: BUDJETTI_SAILYTYS_VRK },
};

export function argumentit(argv) {
  const a = {};
  for (let i = 0; i < argv.length; i++) {
    if (!argv[i].startsWith('--')) continue;
    const k = argv[i].slice(2), seur = argv[i + 1];
    if (seur === undefined || seur.startsWith('--')) a[k] = true; else { a[k] = seur; i++; }
  }
  return a;
}

/**
 * Puhdas: dokumenttilista → mitä kirjoitetaan. docs: [{ id, data, luotu (Date|null) }].
 * Palauttaa { paivitettavat: [{ id, vanhenee: Date, lahde }], jo: n, ohitettu: n, menneet: n }.
 * menneet = vanhenee on jo ohitettu → TTL poistaa nämä pian kirjoituksen jälkeen (tarkoituksellista: yli 6 kk vanhat).
 */
export function suunnitelma(docs, kokoelma, nyt) {
  const k = KOKOELMAT[kokoelma];
  if (!k) throw new Error('tuntematon kokoelma: ' + kokoelma);
  const hetki = (nyt || new Date()).getTime();
  const tulos = { paivitettavat: [], jo: 0, ohitettu: 0, menneet: 0 };
  docs.forEach((d) => {
    const x = d.data || {};
    if (x.vanhenee) { tulos.jo++; return; }
    let v = vanheneeAika(x[k.kentta], k.vrk), lahde = k.kentta;
    if (!v && d.luotu) { v = vanheneeAika(d.luotu, k.vrk); lahde = 'createTime'; }
    if (!v) { tulos.ohitettu++; return; }
    if (v.getTime() <= hetki) tulos.menneet++;
    tulos.paivitettavat.push({ id: d.id, vanhenee: v, lahde });
  });
  return tulos;
}

async function kasitteleKokoelma(admin, kokoelma, kirjoita) {
  const db = admin.firestore();
  const k = KOKOELMAT[kokoelma];
  const snap = await db.collection(kokoelma).select(k.kentta, 'vanhenee').get();
  const docs = snap.docs.map((d) => ({ id: d.id, data: d.data(), luotu: d.createTime ? d.createTime.toDate() : null }));
  const s = suunnitelma(docs, kokoelma);
  const createTime = s.paivitettavat.filter((p) => p.lahde === 'createTime').length;
  console.log(kokoelma + ': dokumentteja ' + docs.length + ' · vanhenee jo ' + s.jo + ' · lisättävä ' + s.paivitettavat.length +
    ' (createTimesta ' + createTime + ', joista jo vanhentuneita ' + s.menneet + ') · ohitettu ' + s.ohitettu);
  if (!kirjoita || !s.paivitettavat.length) return s;
  const Timestamp = admin.firestore.Timestamp;
  const kirjoittaja = db.bulkWriter();
  s.paivitettavat.forEach((p) => {
    kirjoittaja.update(db.collection(kokoelma).doc(p.id), { vanhenee: Timestamp.fromDate(p.vanhenee) });
  });
  await kirjoittaja.close();
  console.log('  kirjoitettu ' + s.paivitettavat.length);
  return s;
}

async function main() {
  const a = argumentit(process.argv.slice(2));
  const kirjoita = a.kirjoita === true;
  if (kirjoita && a.kuiva) throw new Error('--kuiva ja --kirjoita yhtä aikaa');
  const kokoelmat = typeof a.kokoelma === 'string' ? [a.kokoelma] : Object.keys(KOKOELMAT);
  kokoelmat.forEach((k) => { if (!KOKOELMAT[k]) throw new Error('tuntematon kokoelma: ' + k); });
  const admin = require('firebase-admin');
  admin.initializeApp({ credential: admin.credential.applicationDefault(), projectId: a.projekti || 'talentmaster-pilot' });
  console.log(kirjoita ? 'KIRJOITUS' : 'KUIVA-AJO (ei kirjoituksia; kirjoitus: --kirjoita)');
  for (const k of kokoelmat) await kasitteleKokoelma(admin, k, kirjoita);
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  main().catch((e) => { console.error('Virhe:', e.message); process.exit(1); });
}
