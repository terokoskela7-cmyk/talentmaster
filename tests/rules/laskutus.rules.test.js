/**
 * Rules v3.72 (Laskutus L1a, PM 2.11.2026):
 *  · seurat/{sid}/joukkueet/{jid}: laskutustila / laskutustila_muutettu / laskutus_aktivoitu vain SA (create + update); laskutus_aktivoitu ei muutu;
 *    johdon nimen/ikäryhmän muutos ja valmentajan jaksokirjoitus toimivat ennallaan.
 *  · laskutus/{kk}/seurat/{sid}: luku vain SA, kirjoitus ei kenellekään clientista.
 *  · laskutus_asetukset/{id}: vain SA.
 * Ajo: npm run test:rules (Java ≥ 21)
 */
import { initializeTestEnvironment, assertFails, assertSucceeds } from '@firebase/rules-unit-testing';
import { readFileSync } from 'fs';
import { resolve, dirname } from 'path';
import { fileURLToPath } from 'url';
import { setDoc, getDoc, getDocs, updateDoc, deleteDoc, doc, collection, deleteField } from 'firebase/firestore';

const __dirname = dirname(fileURLToPath(import.meta.url));
const PROJECT_ID = 'talentmaster-laskutus-test';
const S = 'sibbovargarna', SA = 'sa-lask', VP = 'vp-lask', UTJ = 'utj-lask', SIHT = 'siht-lask', VALM = 'valm-lask', TV = 'tv-lask', PEL = 'pel-lask';
const J = 'seurat/' + S + '/joukkueet/p13';
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
    await setDoc(doc(db, 'seurat', S), { nimi: 'Sibbo-Vargarna' });
    await setDoc(doc(db, 'seurat', S, 'kayttajat', VALM), { rooli: 'valmentaja', seuraId: S, joukkueet: ['p13'], aktiivinen: true });
    await setDoc(doc(db, J), { nimi: 'P13', ikaryhma: 'P13', laskutustila: 'aktiivinen', laskutustila_muutettu: { pvm: '2026-11-01', uid: SA }, laskutus_aktivoitu: { pvm: '2026-11-01', uid: SA } });
    await setDoc(doc(db, 'seurat/' + S + '/joukkueet/p12'), { nimi: 'P12' });
    await setDoc(doc(db, 'laskutus/2026-11/seurat/' + S), { yhteensa_snt: 12500 });
    await setDoc(doc(db, 'laskutus_asetukset/oletus'), { hinta_pelaaja_snt: 100 });
    await setDoc(doc(db, 'laskutus_asetukset/' + S), { laskutettava: true, sopimus_alkaen: '2026-11' });
  });
});

const K = () => ({
  SA: testEnv.authenticatedContext(SA, { rooli: 'super_admin' }).firestore(),
  VP: testEnv.authenticatedContext(VP, { rooli: 'vp', seuraId: S }).firestore(),
  UTJ: testEnv.authenticatedContext(UTJ, { rooli: 'urheilutoimenjohtaja', seuraId: S }).firestore(),
  seurasihteeri: testEnv.authenticatedContext(SIHT, { rooli: 'seurasihteeri', seuraId: S }).firestore(),
  valmentaja: testEnv.authenticatedContext(VALM, { rooli: 'valmentaja', seuraId: S }).firestore(),
  talenttivalmentaja: testEnv.authenticatedContext(TV, { rooli: 'talenttivalmentaja', seuraId: S }).firestore(),
  pelaaja: testEnv.authenticatedContext(PEL, { rooli: 'pelaaja', pelaajaSeuraId: S, pelaajaId: PEL }).firestore(),
  kirjautumaton: testEnv.unauthenticatedContext().firestore(),
});
const JOHTO = ['VP', 'UTJ', 'seurasihteeri'];

describe('joukkueen laskutuskentät: vain SA', () => {
  test('SA asettaa ja muuttaa laskutustilan; ensimmäinen aktivointi asetetaan kerran', async () => {
    const db = K().SA;
    await assertSucceeds(updateDoc(doc(db, 'seurat/' + S + '/joukkueet/p12'), { laskutustila: 'aktiivinen', laskutustila_muutettu: { pvm: '2026-11-02', uid: SA }, laskutus_aktivoitu: { pvm: '2026-11-02', uid: SA } }));
    await assertSucceeds(updateDoc(doc(db, J), { laskutustila: 'passiivinen', laskutustila_muutettu: { pvm: '2026-12-01', uid: SA } }));
    await assertSucceeds(setDoc(doc(db, 'seurat/' + S + '/joukkueet/uusi'), { nimi: 'Uusi', laskutustila: 'passiivinen' }));
  });
  test('SA:n ohitus laskutus_vastuuvalmentaja_ok: SA asettaa (bool), johto ja valmentaja eivät', async () => {
    await assertSucceeds(updateDoc(doc(K().SA, J), { laskutus_vastuuvalmentaja_ok: true }));
    await assertFails(updateDoc(doc(K().SA, J), { laskutus_vastuuvalmentaja_ok: 'kyllä' }));
    for (const r of [...JOHTO, 'valmentaja', 'talenttivalmentaja']) await assertFails(updateDoc(doc(K()[r], 'seurat/' + S + '/joukkueet/p12'), { laskutus_vastuuvalmentaja_ok: true }));
    await assertFails(setDoc(doc(K().VP, 'seurat/' + S + '/joukkueet/ohitus_vp'), { nimi: 'X', laskutus_vastuuvalmentaja_ok: true }));
  });
  test('SA: laskutus_aktivoitu ei muutu eikä poistu; tuntematon tila hylätään', async () => {
    const db = K().SA;
    await assertFails(updateDoc(doc(db, J), { laskutus_aktivoitu: { pvm: '2027-01-01', uid: SA } }));
    await assertFails(updateDoc(doc(db, J), { laskutus_aktivoitu: deleteField() }));
    await assertFails(updateDoc(doc(db, J), { laskutustila: 'kaikki' }));
    await assertFails(updateDoc(doc(db, J), { laskutustila_muutettu: '2026-11-02' }));
  });
  for (const r of JOHTO) {
    test(r + ': ei aseta eikä muuta laskutuskenttiä (create + update), mutta nimen ja ikäryhmän muutos toimii', async () => {
      const db = K()[r];
      await assertFails(updateDoc(doc(db, J), { laskutustila: 'passiivinen' }));
      await assertFails(updateDoc(doc(db, 'seurat/' + S + '/joukkueet/p12'), { laskutustila: 'aktiivinen' }));
      await assertFails(updateDoc(doc(db, J), { laskutustila_muutettu: { pvm: 'x', uid: 'y' } }));
      await assertFails(updateDoc(doc(db, J), { laskutus_aktivoitu: deleteField() }));
      await assertFails(setDoc(doc(db, 'seurat/' + S + '/joukkueet/uusi_' + r), { nimi: 'Uusi', laskutustila: 'aktiivinen' }));
      await assertFails(setDoc(doc(db, 'seurat/' + S + '/joukkueet/uusi2_' + r), { nimi: 'Uusi', laskutus_aktivoitu: { pvm: 'x' } }));
      await assertFails(setDoc(doc(db, J), { nimi: 'P13 uusi' }));   // koko dokumentin korvaus poistaisi laskutuskentät
      await assertSucceeds(updateDoc(doc(db, J), { nimi: 'P13 Blå', ikaryhma: 'P13' }));
      await assertSucceeds(setDoc(doc(db, 'seurat/' + S + '/joukkueet/ok_' + r), { nimi: 'OK', ikaryhma: 'P10', jarjestys: 10 }));
    });
  }
  test('valmentaja: jaksokirjoitus toimii, laskutuskentät eivät', async () => {
    const db = K().valmentaja;
    await assertSucceeds(updateDoc(doc(db, J), { jaksofokus: { teema: 'x' } }));
    await assertFails(updateDoc(doc(db, J), { laskutustila: 'passiivinen' }));
    await assertFails(updateDoc(doc(db, J), { jaksofokus: { teema: 'y' }, laskutustila: 'passiivinen' }));
  });
  test('talenttivalmentaja, pelaaja, kirjautumaton: ei laskutuskenttiä', async () => {
    for (const r of ['talenttivalmentaja', 'pelaaja', 'kirjautumaton']) await assertFails(updateDoc(doc(K()[r], J), { laskutustila: 'passiivinen' }));
  });
  test('oman seuran henkilökunta lukee tilan (harmaa merkintä tarvitsee sen)', async () => {
    for (const r of ['VP', 'valmentaja']) await assertSucceeds(getDoc(doc(K()[r], J)));
  });
});

describe('laskutus/{kk}/seurat/{sid}: luku vain SA, ei client-kirjoitusta', () => {
  const P = 'laskutus/2026-11/seurat/' + S;
  test('SA lukee, mutta ei kirjoita', async () => {
    const db = K().SA;
    await assertSucceeds(getDoc(doc(db, P))); await assertSucceeds(getDocs(collection(db, 'laskutus/2026-11/seurat')));
    await assertFails(setDoc(doc(db, P), { yhteensa_snt: 0 })); await assertFails(updateDoc(doc(db, P), { yhteensa_snt: 0 })); await assertFails(deleteDoc(doc(db, P)));
    await assertFails(setDoc(doc(db, 'laskutus/2026-12/seurat/' + S), { yhteensa_snt: 0 }));
  });
  for (const r of ['VP', 'UTJ', 'seurasihteeri', 'valmentaja', 'pelaaja', 'kirjautumaton']) {
    test(r + ' ei lue eikä kirjoita', async () => {
      const db = K()[r];
      await assertFails(getDoc(doc(db, P))); await assertFails(getDocs(collection(db, 'laskutus/2026-11/seurat'))); await assertFails(setDoc(doc(db, P), { yhteensa_snt: 0 }));
    });
  }
});

describe('laskutus_asetukset: vain SA', () => {
  test('SA lukee ja kirjoittaa oletuksen ja seurakohtaisen', async () => {
    const db = K().SA;
    await assertSucceeds(getDoc(doc(db, 'laskutus_asetukset/oletus'))); await assertSucceeds(setDoc(doc(db, 'laskutus_asetukset/' + S), { laskutettava: true, sopimus_alkaen: '2026-11', laskentaperuste: 'suostumus' }));
  });
  for (const r of ['VP', 'UTJ', 'seurasihteeri', 'valmentaja', 'pelaaja', 'kirjautumaton']) {
    test(r + ' ei lue eikä kirjoita (seura ei voi muuttaa omaa hintaansa)', async () => {
      const db = K()[r];
      await assertFails(getDoc(doc(db, 'laskutus_asetukset/' + S))); await assertFails(getDoc(doc(db, 'laskutus_asetukset/oletus')));
      await assertFails(setDoc(doc(db, 'laskutus_asetukset/' + S), { hinta_pelaaja_snt: 0 })); await assertFails(updateDoc(doc(db, 'laskutus_asetukset/' + S), { laskutettava: false }));
    });
  }
});
