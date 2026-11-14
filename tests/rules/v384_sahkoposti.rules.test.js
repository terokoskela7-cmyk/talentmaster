/**
 * TalentMaster™ — Rules v3.84 (KIRISTÄÄ): seurat/{sid}/kayttajat/{uid}.email muuttuu vain palvelimella (callable vaihdaKayttajanSahkoposti).
 * Client (johto, SA, käyttäjä itse) ei kirjoita email-kenttää; muut profiilikentät ennallaan sallittuja.
 * Ajo: npm run test:rules (Java ≥ 21).
 */
import { initializeTestEnvironment, assertSucceeds, assertFails } from '@firebase/rules-unit-testing';
import { readFileSync } from 'fs';
import { resolve, dirname } from 'path';
import { fileURLToPath } from 'url';
import { setDoc, doc, updateDoc, deleteField } from 'firebase/firestore';
import { describe, it, beforeAll, afterAll, beforeEach, expect } from 'vitest';

const __dirname = dirname(fileURLToPath(import.meta.url));
const RULES = readFileSync(resolve(__dirname, '../../tm_admin/firestore.rules'), 'utf8');
const [HOST, PORT] = (process.env.FIRESTORE_EMULATOR_HOST || '127.0.0.1:8080').split(':');
const A = 'fcl';
const KAYTTAJA = { rooli: 'valmentaja', seuraId: A, nimi: 'Oma', email: 'valm@fcl.fi' };
let env;

beforeAll(async () => { env = await initializeTestEnvironment({ projectId: 'talentmaster-v384', firestore: { rules: RULES, host: HOST, port: Number(PORT) } }); });
afterAll(async () => { if (env) await env.cleanup(); });
beforeEach(async () => {
  await env.clearFirestore();
  await env.withSecurityRulesDisabled(async (c) => {
    const db = c.firestore();
    await setDoc(doc(db, 'admins', 'sa-1'), { rooli: 'super_admin' });
    await setDoc(doc(db, 'seurat', A), { nimi: 'FCL' });
    await setDoc(doc(db, 'seurat', A, 'kayttajat', 'valm-1'), KAYTTAJA);
    await setDoc(doc(db, 'seurat', A, 'kayttajat', 'vp-a'), Object.assign({}, KAYTTAJA, { rooli: 'vp', email: 'vp@fcl.fi' }));
  });
});
const staff = (uid, rooli, seura) => env.authenticatedContext(uid, { rooli, seuraId: seura || A }).firestore();
const sa = () => env.authenticatedContext('sa-1', { rooli: 'super_admin' }).firestore();
const vp = () => staff('vp-a', 'vp'), valm = () => staff('valm-1', 'valmentaja');
const kayttaja = (db, uid) => doc(db, 'seurat', A, 'kayttajat', uid);

describe('v3.84 · kayttajat.email vain palvelimelta', () => {
  it('lähde: email on pääsykenttälistassa (ei omaa sivupolkua)', () => {
    const i = RULES.indexOf('function kayttajaPaasyKentatEnnallaan');
    expect(RULES.slice(i, i + 500)).toMatch(/'claimsAsetettu', 'email'\]/);
    expect(RULES).toMatch(/firestore\.rules v3\.84\s*\n/); expect(RULES).toMatch(/Muutokset v3\.83 → v3\.84/);
  });
  it('VP ei muuta toisen eikä oman email-kenttää; muut kentät (nimi) sallittu', async () => {
    await assertFails(updateDoc(kayttaja(vp(), 'valm-1'), { email: 'uusi@fcl.fi' }));
    await assertFails(updateDoc(kayttaja(vp(), 'vp-a'), { email: 'uusi@fcl.fi' }));
    await assertFails(updateDoc(kayttaja(vp(), 'valm-1'), { nimi: 'X', email: 'uusi@fcl.fi' }));
    await assertFails(updateDoc(kayttaja(vp(), 'valm-1'), { email: deleteField() }));
    await assertSucceeds(updateDoc(kayttaja(vp(), 'valm-1'), { nimi: 'Uusi nimi' }));
  });
  it('SA ei kirjoita clientistä (vain palvelin)', async () => {
    await assertFails(updateDoc(kayttaja(sa(), 'valm-1'), { email: 'uusi@fcl.fi' }));
    await assertSucceeds(updateDoc(kayttaja(sa(), 'valm-1'), { nimi: 'SA muokkasi' }));
  });
  it('käyttäjä itse ei muuta omaa email-kenttäänsä; muu oma kenttä sallittu', async () => {
    await assertFails(updateDoc(kayttaja(valm(), 'valm-1'), { email: 'oma-uusi@fcl.fi' }));
    await assertSucceeds(updateDoc(kayttaja(valm(), 'valm-1'), { puhelin: '0401234567' }));
  });
  it('set-merge (Seura.html tallennusmuoto) email mukana estetty; ilman emailia sallittu', async () => {
    await assertFails(setDoc(kayttaja(vp(), 'valm-1'), { etunimi: 'A', email: 'uusi@fcl.fi' }, { merge: true }));
    await assertSucceeds(setDoc(kayttaja(vp(), 'valm-1'), { etunimi: 'A', puhelin: '40' }, { merge: true }));
  });
  it('sama arvo uudelleenkirjoitettuna ei ole muutos (diff tyhjä) → sallittu', async () => {
    await assertSucceeds(setDoc(kayttaja(vp(), 'valm-1'), { email: 'valm@fcl.fi', etunimi: 'B' }, { merge: true }));
  });
});
