/**
 * TalentMaster™ — Rules v3.75 (PM 3.11.2026): seurat/{sid}/joukkueet/{jid}.demo vain SA.
 * Demo-joukkue ohittaa laskennan (L1a) ja passiivisen joukkueen eston (L1c), joten johto ja valmentaja eivät
 * aseta, muuta eivätkä poista kenttää (create + update). SA asettaa bool-arvon. Muut kentät ennallaan.
 * Ajo: npm run test:rules (Java ≥ 21).
 */
import { initializeTestEnvironment, assertSucceeds, assertFails } from '@firebase/rules-unit-testing';
import { readFileSync } from 'fs';
import { resolve, dirname } from 'path';
import { fileURLToPath } from 'url';
import { setDoc, doc, updateDoc, deleteField } from 'firebase/firestore';
import { describe, it, beforeAll, afterAll, beforeEach } from 'vitest';

const __dirname = dirname(fileURLToPath(import.meta.url));
const RULES = readFileSync(resolve(__dirname, '../../tm_admin/firestore.rules'), 'utf8');
const [HOST, PORT] = (process.env.FIRESTORE_EMULATOR_HOST || '127.0.0.1:8080').split(':');
const S = 'seura1';
let env;

beforeAll(async () => { env = await initializeTestEnvironment({ projectId: 'talentmaster-demo-vain-sa', firestore: { rules: RULES, host: HOST, port: Number(PORT) } }); });
afterAll(async () => { if (env) await env.cleanup(); });

beforeEach(async () => {
  await env.clearFirestore();
  await env.withSecurityRulesDisabled(async (c) => {
    const db = c.firestore();
    await setDoc(doc(db, 'admins', 'sa-1'), { rooli: 'super_admin' });
    await setDoc(doc(db, 'seurat', S), { nimi: 'Seura' });
    await setDoc(doc(db, 'seurat', S, 'kayttajat', 'valm-1'), { rooli: 'valmentaja', joukkueet: ['tav', 'demo'] });
    await setDoc(doc(db, 'seurat', S, 'joukkueet', 'tav'), { nimi: 'P12' });
    await setDoc(doc(db, 'seurat', S, 'joukkueet', 'demo'), { nimi: 'Demo', demo: true });
  });
});

const staff = (uid, rooli) => env.authenticatedContext(uid, { rooli, seuraId: S }).firestore();
const sa = () => env.authenticatedContext('sa-1', { rooli: 'super_admin' }).firestore();
const JOHTO = [['vp-1', 'vp'], ['utj-1', 'urheilutoimenjohtaja'], ['sihteeri-1', 'seurasihteeri']];
const VALM = [['valm-1', 'valmentaja'], ['tal-1', 'talenttivalmentaja']];
const jj = (db, jid) => doc(db, 'seurat', S, 'joukkueet', jid);

describe('v3.75 · joukkueen demo-kenttä vain SA', () => {
  it('create: johto ei luo joukkuetta demo-kentällä (true eikä false); ilman kenttää sallitaan', async () => {
    for (const [uid, rooli] of JOHTO) {
      await assertFails(setDoc(jj(staff(uid, rooli), 'u-' + uid), { nimi: 'Uusi', demo: true }));
      await assertFails(setDoc(jj(staff(uid, rooli), 'u-' + uid), { nimi: 'Uusi', demo: false }));
      await assertSucceeds(setDoc(jj(staff(uid, rooli), 'u-' + uid), { nimi: 'Uusi' }));
    }
  });
  it('create: valmentaja ei luo joukkuetta (ennallaan), ei myöskään demona', async () => {
    for (const [uid, rooli] of VALM) await assertFails(setDoc(jj(staff(uid, rooli), 'v-' + uid), { nimi: 'Uusi', demo: true }));
  });
  it('update: johto ja valmentaja eivät aseta, muuta eivätkä poista demo-kenttää', async () => {
    for (const [uid, rooli] of JOHTO.concat(VALM)) {
      const db = staff(uid, rooli);
      await assertFails(updateDoc(jj(db, 'tav'), { demo: true }));
      await assertFails(updateDoc(jj(db, 'demo'), { demo: false }));
      await assertFails(updateDoc(jj(db, 'demo'), { demo: deleteField() }));
    }
  });
  it('update: johto muuttaa muita kenttiä demo-joukkueessa (merge säilyttää demon); valmentaja jaksoa', async () => {
    await assertSucceeds(updateDoc(jj(staff('vp-1', 'vp'), 'demo'), { nimi: 'Demo 2' }));
    await assertSucceeds(setDoc(jj(staff('vp-1', 'vp'), 'demo'), { ikaryhma: 'P12' }, { merge: true }));
    await assertSucceeds(updateDoc(jj(staff('valm-1', 'valmentaja'), 'demo'), { jaksofokus: { teema: 'x' } }));
  });
  it('SA: asettaa, muuttaa ja poistaa (bool); ei-bool hylätään; luonti demona sallitaan', async () => {
    await assertSucceeds(updateDoc(jj(sa(), 'tav'), { demo: true }));
    await assertSucceeds(updateDoc(jj(sa(), 'tav'), { demo: false }));
    await assertSucceeds(updateDoc(jj(sa(), 'tav'), { demo: deleteField() }));
    await assertFails(updateDoc(jj(sa(), 'tav'), { demo: 'kyllä' }));
    await assertSucceeds(setDoc(jj(sa(), 'uusi'), { nimi: 'Demo', demo: true }));
    await assertFails(setDoc(jj(sa(), 'uusi2'), { nimi: 'Demo', demo: 1 }));
  });
});
