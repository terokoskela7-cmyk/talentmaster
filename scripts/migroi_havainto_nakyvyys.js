#!/usr/bin/env node
/* migroi_havainto_nakyvyys.js — täyttää `nakyvyys`-kentän vanhoille havainnoille.
 *
 * MIKSI JA MISSÄ JÄRJESTYKSESSÄ:
 * Rules v3.22 rajaa anonyymin pelaajaistunnon lukemaan vain `nakyvyys=='pelaaja'` -havaintoja.
 * Vanhoilta havainnoilta kenttä puuttuu, joten ne katoaisivat pelaajilta heti Rules-deployssa.
 * Siksi järjestys on:
 *     1) tämä migraatio kuivana  →  2) migraatio --kirjoita  →  3) PR merge  →  4) Rules deploy
 *
 * MITÄ TEHDÄÄN:
 *   · `nakyvyys` PUUTTUU  → asetetaan 'pelaaja'. Nämä on jo näytetty pelaajalle, joten käytös
 *     ei muutu — migraatio vain kirjaa vallitsevan tilan kentäksi.
 *   · `nakyvyys` on jo asetettu (esim. pikakirjauksen 'vp') → EI kosketa. Pelaaja ei näe niitä
 *     nytkään, koska niiden tila on 'luonnos'.
 *
 * Idempotentti: uudelleenajo ei muuta mitään, koska ehtona on kentän puuttuminen.
 *
 * Ajo:
 *   node scripts/migroi_havainto_nakyvyys.js                    # kuiva, kaikki seurat
 *   node scripts/migroi_havainto_nakyvyys.js --seura=sjk        # yksi seura
 *   node scripts/migroi_havainto_nakyvyys.js --kirjoita         # oikea ajo
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
const KIRJOITA = argv.includes('--kirjoita');

const ERA = 400;   // WriteBatch-raja on 500; jätetään marginaali (§22)

async function main() {
  if (!admin.apps.length) admin.initializeApp({ credential: admin.applicationDefault() });
  const db = admin.firestore();

  console.log(KIRJOITA ? '⚠ KIRJOITUSAJO\n' : 'KUIVA-AJO — ei kirjoituksia.\n');

  const seurat = VAIN_SEURA
    ? [await db.collection('seurat').doc(VAIN_SEURA).get()]
    : (await db.collection('seurat').get()).docs;

  let puuttuu = 0, oliJo = 0, kirjoitettu = 0;
  const jakauma = {};

  for (const s of seurat) {
    if (!s.exists) { console.log('(seuraa ei ole: ' + VAIN_SEURA + ')'); continue; }
    const pelaajat = await db.collection('seurat').doc(s.id).collection('pelaajat').get();
    let seuranPuuttuu = 0;
    let era = db.batch();
    let eranKoko = 0;

    for (const pel of pelaajat.docs) {
      const hav = await pel.ref.collection('havainnot').get();
      for (const h of hav.docs) {
        const d = h.data() || {};
        if (typeof d.nakyvyys === 'string' && d.nakyvyys !== '') {
          oliJo++;
          jakauma[d.nakyvyys] = (jakauma[d.nakyvyys] || 0) + 1;
          continue;
        }
        puuttuu++; seuranPuuttuu++;
        if (!KIRJOITA) continue;
        era.set(h.ref, { nakyvyys: 'pelaaja' }, { merge: true });
        eranKoko++;
        if (eranKoko >= ERA) {
          await era.commit(); kirjoitettu += eranKoko;
          era = db.batch(); eranKoko = 0;
        }
      }
    }
    if (KIRJOITA && eranKoko) { await era.commit(); kirjoitettu += eranKoko; }
    console.log('  ' + s.id.padEnd(16) + seuranPuuttuu + ' havaintoa ilman nakyvyys-kenttää');
  }

  console.log('\nYHTEENVETO');
  console.log('  nakyvyys puuttuu → asetetaan "pelaaja": ' + puuttuu);
  console.log('  nakyvyys jo asetettu (ei kosketa):      ' + oliJo);
  Object.keys(jakauma).forEach((k) => console.log('      ' + k + ': ' + jakauma[k]));
  if (KIRJOITA) console.log('  kirjoitettu: ' + kirjoitettu);
  else console.log('\n  Tämä oli kuiva ajo. Oikea ajo: --kirjoita (ENNEN Rules-deployta).');
}

main().then(() => process.exit(0)).catch((e) => { console.error(e); process.exit(1); });
