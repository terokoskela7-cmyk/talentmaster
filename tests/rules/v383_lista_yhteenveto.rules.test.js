/**
 * TalentMaster™ — Rules v3.83 (Vaihe 0 / B.4): lista_joukkue/{jid} (luku kuten kooste_joukkue; client ei kirjoita) + lista_likainen/{pid} (ei clientille).
 * Ajo: npm run test:rules (Java ≥ 21).
 */
import { initializeTestEnvironment, assertSucceeds, assertFails } from '@firebase/rules-unit-testing';
import { readFileSync } from 'fs';
import { resolve, dirname } from 'path';
import { fileURLToPath } from 'url';
import { setDoc, doc, getDoc, getDocs, collection, updateDoc, deleteDoc } from 'firebase/firestore';
import { describe, it, beforeAll, afterAll, beforeEach, expect } from 'vitest';

const __dirname = dirname(fileURLToPath(import.meta.url));
const RULES = readFileSync(resolve(__dirname, '../../tm_admin/firestore.rules'), 'utf8');
const [HOST, PORT] = (process.env.FIRESTORE_EMULATOR_HOST || '127.0.0.1:8080').split(':');
const A = 'fcl', B = 'toinen', J1 = 'fcl_u12', J2 = 'fcl_u14';
const LISTA = (jid) => ({ jid, nimi: jid, versio: 1, n: 1, rivit: [{ id: 'p1', e: 'A', s: 'B' }] });
let env;

beforeAll(async () => { env = await initializeTestEnvironment({ projectId: 'talentmaster-v383', firestore: { rules: RULES, host: HOST, port: Number(PORT) } }); });
afterAll(async () => { if (env) await env.cleanup(); });
beforeEach(async () => {
  await env.clearFirestore();
  await env.withSecurityRulesDisabled(async (c) => {
    const db = c.firestore();
    await setDoc(doc(db, 'admins', 'sa-1'), { rooli: 'super_admin' });
    for (const s of [A, B]) await setDoc(doc(db, 'seurat', s), { nimi: s });
    await setDoc(doc(db, 'seurat', A, 'kayttajat', 'valm-1'), { rooli: 'valmentaja', seuraId: A, joukkueet: [J1], aktiivinen: true });
    await setDoc(doc(db, 'seurat', A, 'kayttajat', 'valm-2'), { rooli: 'valmentaja', seuraId: A, joukkueet: [J2], aktiivinen: true });
    await setDoc(doc(db, 'seurat', A, 'lista_joukkue', J1), LISTA(J1));
    await setDoc(doc(db, 'seurat', A, 'lista_joukkue', J2), LISTA(J2));
    await setDoc(doc(db, 'seurat', A, 'lista_likainen', 'p1'), { t: new Date() });
  });
});
const staff = (uid, rooli, seura) => env.authenticatedContext(uid, { rooli, seuraId: seura || A }).firestore();
const sa = () => env.authenticatedContext('sa-1', { rooli: 'super_admin' }).firestore();
const lj = (db, jid = J1, sid = A) => doc(db, 'seurat', sid, 'lista_joukkue', jid);

describe('v3.83 · lista_joukkue: luku kuten kooste_joukkue', () => {
  it('SA, johto (VP, UTJ, seurasihteeri) ja talenttivalmentaja lukevat kaikki oman seuran joukkueet', async () => {
    for (const db of [sa(), staff('vp-1', 'vp'), staff('utj-1', 'urheilutoimenjohtaja'), staff('sih-1', 'seurasihteeri'), staff('tv-1', 'talenttivalmentaja')]) {
      const s = await assertSucceeds(getDoc(lj(db))); expect(s.data().versio).toBe(1); await assertSucceeds(getDoc(lj(db, J2)));
    }
  });
  it('valmentaja lukee VAIN oman joukkueensa dokumentin; rajaamaton lista ✗', async () => {
    await assertSucceeds(getDoc(lj(staff('valm-1', 'valmentaja')))); await assertFails(getDoc(lj(staff('valm-1', 'valmentaja'), J2)));
    await assertSucceeds(getDoc(lj(staff('valm-2', 'valmentaja'), J2))); await assertFails(getDoc(lj(staff('valm-2', 'valmentaja'), J1)));
    await assertFails(getDocs(collection(staff('valm-1', 'valmentaja'), 'seurat', A, 'lista_joukkue')));
  });
  it('fysiikkavalmentaja, fysioterapeutti, toisen seuran käyttäjät, pelaaja, huoltaja ja kirjautumaton eivät lue', async () => {
    const pelaaja = env.authenticatedContext('p-1', { rooli: 'pelaaja', pelaajaSeuraId: A, pelaajaId: 'p-1' }).firestore();
    const huoltaja = env.authenticatedContext('h-1', { email: 'h@x.fi', email_verified: true }).firestore();
    for (const db of [staff('fy-1', 'fysiikkavalmentaja'), staff('ft-1', 'fysioterapeutti'), staff('vp-b', 'vp', B), staff('valm-b', 'valmentaja', B), pelaaja, huoltaja, env.unauthenticatedContext().firestore()]) await assertFails(getDoc(lj(db)));
  });
  it('CLIENT EI KIRJOITA: kukaan (SA, VP, valmentaja, pelaaja) ei luo, päivitä eikä poista', async () => {
    for (const db of [sa(), staff('vp-1', 'vp'), staff('valm-1', 'valmentaja'), staff('tv-1', 'talenttivalmentaja')]) {
      await assertFails(setDoc(lj(db, 'uusi'), LISTA('uusi'))); await assertFails(updateDoc(lj(db), { n: 2 })); await assertFails(deleteDoc(lj(db)));
    }
  });
});

describe('v3.83 · lista_likainen: ei clientille', () => {
  it('kukaan client (SA mukaan lukien) ei lue eikä kirjoita', async () => {
    for (const db of [sa(), staff('vp-1', 'vp'), staff('valm-1', 'valmentaja')]) {
      const r = doc(db, 'seurat', A, 'lista_likainen', 'p1');
      await assertFails(getDoc(r)); await assertFails(setDoc(r, { t: new Date() })); await assertFails(deleteDoc(r));
    }
  });
  it('lähde: versio 3.83 + changelog, ei yleistä catch-all-sääntöä joka avaisi alikokoelman', () => {
    expect(RULES).toMatch(/firestore\.rules v3\.83/); expect(RULES).toMatch(/Muutokset v3\.82 → v3\.83/);
    expect(RULES).toMatch(/match \/lista_joukkue\/\{jid\}/); expect(RULES).toMatch(/match \/lista_likainen\/\{pid\}/);
  });
});
