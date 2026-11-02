/**
 * Valmennusapurin K1e-kokoelmat (CODE_BRIEF_K1_APURI_KUSTANNUS 29.10.2026): `valmennusapuri_budjetti/{seuraId}_{kk}` ja
 * `valmennusapuri_seurat/{seuraId}`. Vain Cloud Function (Admin SDK) lukee ja kirjoittaa. Rulesissa ei ole niille
 * match-blokkia → deny kaikille clienteille, myös SA:lle ja oman seuran VP:lle. Tämä testi vahvistaa, ettei
 * Rules-muutosta tarvita, ja kaatuu, jos joku lisää kokoelmille avaavan säännön.
 * Ajo: npm run test:rules (Java ≥ 21)
 */
import { initializeTestEnvironment, assertFails } from '@firebase/rules-unit-testing';
import { readFileSync } from 'fs';
import { resolve, dirname } from 'path';
import { fileURLToPath } from 'url';
import { setDoc, getDoc, getDocs, updateDoc, deleteDoc, doc, collection } from 'firebase/firestore';

const __dirname = dirname(fileURLToPath(import.meta.url));
const PROJECT_ID = 'talentmaster-apuri-budjetti-test';
const SEURA = 'kpv', SA = 'sa-apuri-1', VP = 'vp-kpv-apuri', VALM = 'valm-kpv-apuri', PELAAJA = 'pelaaja-kpv-apuri';
const BUDJETTI = 'valmennusapuri_budjetti/' + SEURA + '_2026-10';
const SEURADOK = 'valmennusapuri_seurat/' + SEURA;
let testEnv;

beforeAll(async () => {
  testEnv = await initializeTestEnvironment({ projectId: PROJECT_ID, firestore: { rules: readFileSync(resolve(__dirname, '../../tm_admin/firestore.rules'), 'utf8'), host: '127.0.0.1', port: 8080 } });
});
afterAll(async () => { if (testEnv) await testEnv.cleanup(); });
beforeEach(async () => {
  await testEnv.clearFirestore();
  await testEnv.withSecurityRulesDisabled(async (ctx) => {
    const db = ctx.firestore();
    await setDoc(doc(db, 'admins', SA), { rooli: 'super_admin' });
    await setDoc(doc(db, 'seurat', SEURA), { nimi: 'KPV', aktiivinen: true });
    await setDoc(doc(db, 'seurat', SEURA, 'kayttajat', VP), { email: 'vp@kpv.fi', rooli: 'vp', seuraId: SEURA, aktiivinen: true });
    await setDoc(doc(db, BUDJETTI), { usd: 12.5, kysymyksia: 80, paivitetty: '2026-10-29T10:00:00.000Z' });
    await setDoc(doc(db, SEURADOK), { budjettiUsd: 30 });
  });
});

const kontekstit = () => ({
  SA: testEnv.authenticatedContext(SA, { rooli: 'super_admin' }).firestore(),
  VP: testEnv.authenticatedContext(VP, { rooli: 'vp', seuraId: SEURA }).firestore(),
  valmentaja: testEnv.authenticatedContext(VALM, { rooli: 'valmentaja', seuraId: SEURA }).firestore(),
  pelaaja: testEnv.authenticatedContext(PELAAJA, { rooli: 'pelaaja', pelaajaSeuraId: SEURA, pelaajaId: PELAAJA }).firestore(),
  kirjautumaton: testEnv.unauthenticatedContext().firestore(),
});

describe('valmennusapuri K1e: budjettikokoelmat vain palvelimella', () => {
  for (const polku of [BUDJETTI, SEURADOK]) {
    const kokoelma = polku.split('/')[0];
    for (const rooli of ['SA', 'VP', 'valmentaja', 'pelaaja', 'kirjautumaton']) {
      test(rooli + ' ei lue eikä kirjoita: ' + polku, async () => {
        const db = kontekstit()[rooli];
        await assertFails(getDoc(doc(db, polku)));
        await assertFails(getDocs(collection(db, kokoelma)));
        await assertFails(setDoc(doc(db, polku), { usd: 0 }));
        await assertFails(updateDoc(doc(db, polku), { budjettiUsd: 999, usd: 0 }));
        await assertFails(deleteDoc(doc(db, polku)));
      });
    }
  }
});
