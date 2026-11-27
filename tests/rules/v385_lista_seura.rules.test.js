/**
 * TalentMaster™ — Rules v3.85 (seuran lista_seura): luku vain SA + oman seuran johto (vp / urheilutoimenjohtaja / seurasihteeri); client ei kirjoita. Päätös Q1/Q6, Tero 27.11.2026.
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
const A = 'fcl', B = 'toinen';
const META = { versio: 1, kierros: 1, n: 1, sivuja: 1, laskurit: { kaikki: 1 } }, SIVU = { versio: 1, kierros: 1, sivu: 1, n: 1, rivit: [{ id: 'p1', e: 'A', s: 'B', st: 'annettu' }] };
let env;

beforeAll(async () => { env = await initializeTestEnvironment({ projectId: 'talentmaster-v385', firestore: { rules: RULES, host: HOST, port: Number(PORT) } }); });
afterAll(async () => { if (env) await env.cleanup(); });
beforeEach(async () => {
  await env.clearFirestore();
  await env.withSecurityRulesDisabled(async (c) => {
    const db = c.firestore();
    await setDoc(doc(db, 'admins', 'sa-1'), { rooli: 'super_admin' });
    for (const s of [A, B]) { await setDoc(doc(db, 'seurat', s), { nimi: s }); await setDoc(doc(db, 'seurat', s, 'lista_seura', '_meta'), META); await setDoc(doc(db, 'seurat', s, 'lista_seura', 's0001'), SIVU); }
    await setDoc(doc(db, 'seurat', A, 'pelaajat', 'p-1'), { etunimi: 'A', huoltajaEmail: 'h@x.fi' });
  });
});
const staff = (uid, rooli, seura) => env.authenticatedContext(uid, { rooli, seuraId: seura || A }).firestore();
const sa = () => env.authenticatedContext('sa-1', { rooli: 'super_admin' }).firestore();
const ls = (db, id = '_meta', sid = A) => doc(db, 'seurat', sid, 'lista_seura', id);

describe('v3.85 · lista_seura: luku vain SA + oman seuran johto', () => {
  it('SA, VP, urheilutoimenjohtaja ja seurasihteeri lukevat _metan ja sivut + koko kokoelman (SA:n seuravalitsin)', async () => {
    for (const db of [sa(), staff('vp-1', 'vp'), staff('utj-1', 'urheilutoimenjohtaja'), staff('sih-1', 'seurasihteeri')]) {
      expect((await assertSucceeds(getDoc(ls(db)))).data().versio).toBe(1); await assertSucceeds(getDoc(ls(db, 's0001')));
      expect((await assertSucceeds(getDocs(collection(db, 'seurat', A, 'lista_seura')))).size).toBe(2);
    }
    await assertSucceeds(getDoc(ls(sa(), '_meta', B)));   // SA lukee minkä tahansa seuran
  });
  it('valmentaja, talenttivalmentaja (Q1: heillä lista_joukkue), fysiikkavalmentaja, fysioterapeutti, testivastaava ✗', async () => {
    for (const rooli of ['valmentaja', 'talenttivalmentaja', 'fysiikkavalmentaja', 'fysioterapeutti', 'testivastaava']) { const db = staff('x-' + rooli, rooli); await assertFails(getDoc(ls(db))); await assertFails(getDoc(ls(db, 's0001'))); await assertFails(getDocs(collection(db, 'seurat', A, 'lista_seura'))); }
  });
  it('toisen seuran johto, pelaaja, huoltaja ja kirjautumaton ✗', async () => {
    const pelaaja = env.authenticatedContext('p-1', { rooli: 'pelaaja', pelaajaSeuraId: A, pelaajaId: 'p-1' }).firestore();
    const huoltaja = env.authenticatedContext('h-1', { email: 'h@x.fi', email_verified: true }).firestore();
    for (const db of [staff('vp-b', 'vp', B), staff('utj-b', 'urheilutoimenjohtaja', B), staff('sih-b', 'seurasihteeri', B), pelaaja, huoltaja, env.unauthenticatedContext().firestore()]) { await assertFails(getDoc(ls(db))); await assertFails(getDoc(ls(db, 's0001'))); }
  });
  it('CLIENT EI KIRJOITA: kukaan (SA, VP, UTJ, sihteeri, valmentaja) ei luo, päivitä eikä poista', async () => {
    for (const db of [sa(), staff('vp-1', 'vp'), staff('utj-1', 'urheilutoimenjohtaja'), staff('sih-1', 'seurasihteeri'), staff('valm-1', 'valmentaja')]) {
      await assertFails(setDoc(ls(db, 'uusi'), SIVU)); await assertFails(setDoc(ls(db), META)); await assertFails(updateDoc(ls(db, 's0001'), { n: 2 })); await assertFails(deleteDoc(ls(db)));
    }
  });
  it('lähde: blokki + changelog v3.84 → v3.85; ei avaa lista_likainen-merkkejä', async () => {
    expect(RULES).toMatch(/Muutokset v3\.84 → v3\.85/); expect(RULES).toMatch(/match \/lista_seura\/\{doc\}/); expect(RULES).toMatch(/firestore\.rules v3\.85/);
    const db = staff('vp-1', 'vp'); await assertFails(getDoc(doc(db, 'seurat', A, 'lista_likainen', 'p1')));
  });
});
