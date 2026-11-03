/**
 * TalentMaster™ — Rules v3.74 (Laskutus L1c, PM 3.11.2026):
 *   1) joukkueen jakso (jaksofokus / jaksofokus_historia): sopimusseurassa (laskutus_asetukset.laskutettava) johto ja valmentaja
 *      muuttavat sitä VAIN aktiivisessa tai demo-joukkueessa; pilottiseura ennallaan; SA ennallaan; muut kentät ennallaan;
 *   2) seurat/{sid}.laskutus_sopimus: create/update VAIN SA (bool); johto, valmentaja ja muut hylätään.
 * Ajo: npm run test:rules (Java ≥ 21).
 */
import { initializeTestEnvironment, assertSucceeds, assertFails } from '@firebase/rules-unit-testing';
import { readFileSync } from 'fs';
import { resolve, dirname } from 'path';
import { fileURLToPath } from 'url';
import { setDoc, doc, updateDoc, deleteDoc, deleteField } from 'firebase/firestore';
import { describe, it, beforeAll, afterAll, beforeEach } from 'vitest';

const __dirname = dirname(fileURLToPath(import.meta.url));
const RULES = readFileSync(resolve(__dirname, '../../tm_admin/firestore.rules'), 'utf8');
const [HOST, PORT] = (process.env.FIRESTORE_EMULATOR_HOST || '127.0.0.1:8080').split(':');
const SOP = 'sopimus', PIL = 'pilotti', UUSI = 'uusiseura';
const JAKSO = { teema: 'Syöttöpeli', alku: '2026-11-02', kesto_vk: 6 };
let env;

beforeAll(async () => { env = await initializeTestEnvironment({ projectId: 'talentmaster-laskutus-l1c', firestore: { rules: RULES, host: HOST, port: Number(PORT) } }); });
afterAll(async () => { if (env) await env.cleanup(); });

beforeEach(async () => {
  await env.clearFirestore();
  await env.withSecurityRulesDisabled(async (c) => {
    const db = c.firestore();
    await setDoc(doc(db, 'admins', 'sa-1'), { rooli: 'super_admin' });
    await setDoc(doc(db, 'laskutus_asetukset', SOP), { laskutettava: true });
    await setDoc(doc(db, 'laskutus_asetukset', PIL), { laskutettava: false });
    for (const sid of [SOP, PIL]) {
      await setDoc(doc(db, 'seurat', sid), { nimi: sid });
      await setDoc(doc(db, 'seurat', sid, 'kayttajat', 'valm-' + sid), { rooli: 'valmentaja', joukkueet: ['akt', 'pas', 'puu', 'demo'] });
      await setDoc(doc(db, 'seurat', sid, 'joukkueet', 'akt'), { nimi: 'P13', laskutustila: 'aktiivinen' });
      await setDoc(doc(db, 'seurat', sid, 'joukkueet', 'pas'), { nimi: 'P12', laskutustila: 'passiivinen', jaksofokus: JAKSO });
      await setDoc(doc(db, 'seurat', sid, 'joukkueet', 'puu'), { nimi: 'P11' });
      await setDoc(doc(db, 'seurat', sid, 'joukkueet', 'demo'), { nimi: 'Demo', demo: true });
    }
  });
});

const staff = (sid, uid, rooli) => env.authenticatedContext(uid, { rooli, seuraId: sid }).firestore();
const sa = () => env.authenticatedContext('sa-1', { rooli: 'super_admin' }).firestore();
const vp = (sid) => staff(sid, 'vp-' + sid, 'vp');
const valm = (sid) => staff(sid, 'valm-' + sid, 'valmentaja');
const talentti = (sid) => staff(sid, 'tal-' + sid, 'talenttivalmentaja');
const jj = (db, sid, jid) => doc(db, 'seurat', sid, 'joukkueet', jid);
const jakso = (db, sid, jid) => updateDoc(jj(db, sid, jid), { jaksofokus: JAKSO, jaksofokus_historia: [] });

describe('v3.74 · joukkueen jakso sopimusseurassa', () => {
  it('passiivinen ja puuttuva laskutustila: johto, valmentaja ja talenttivalmentaja hylätään', async () => {
    for (const jid of ['pas', 'puu']) {
      await assertFails(jakso(vp(SOP), SOP, jid));
      await assertFails(jakso(valm(SOP), SOP, jid));
      await assertFails(jakso(talentti(SOP), SOP, jid));
    }
    await assertFails(updateDoc(jj(valm(SOP), SOP, 'pas'), { jaksofokus_historia: [JAKSO] }));   // pelkkä historia myös
    await assertFails(updateDoc(jj(vp(SOP), SOP, 'pas'), { jaksofokus: deleteField() }));        // poisto on muutos
  });
  it('aktiivinen ja demo: johto ja valmentaja sallitaan', async () => {
    for (const jid of ['akt', 'demo']) {
      await assertSucceeds(jakso(vp(SOP), SOP, jid));
      await assertSucceeds(jakso(valm(SOP), SOP, jid));
    }
  });
  it('SA sallitaan passiivisessakin', async () => {
    await assertSucceeds(jakso(sa(), SOP, 'pas'));
    await assertSucceeds(jakso(sa(), SOP, 'puu'));
  });
  it('muut kentät ennallaan passiivisessa: johto nimeää, valmentaja muuttaa pelimuodot', async () => {
    await assertSucceeds(updateDoc(jj(vp(SOP), SOP, 'pas'), { nimi: 'P12 uusi' }));
    await assertSucceeds(updateDoc(jj(valm(SOP), SOP, 'pas'), { pelimuodot: ['5v5'] }));
  });
  it('johto ei voi kiertää: laskutustilan muutos (v3.72) ja luonti jaksolla hylätään; luonti ilman jaksoa sallitaan', async () => {
    await assertFails(updateDoc(jj(vp(SOP), SOP, 'pas'), { laskutustila: 'aktiivinen', jaksofokus: JAKSO }));
    await assertFails(setDoc(jj(vp(SOP), SOP, 'uusi'), { nimi: 'P10', jaksofokus: JAKSO }));
    await assertSucceeds(setDoc(jj(vp(SOP), SOP, 'uusi2'), { nimi: 'P10' }));
    await assertSucceeds(setDoc(jj(sa(), SOP, 'uusi3'), { nimi: 'P9', jaksofokus: JAKSO }));
  });
});

describe('v3.74 · pilottiseura ennallaan', () => {
  it('passiivinen ja puuttuva laskutustila: johto ja valmentaja sallitaan; luonti jaksolla sallitaan', async () => {
    for (const jid of ['pas', 'puu']) {
      await assertSucceeds(jakso(vp(PIL), PIL, jid));
      await assertSucceeds(jakso(valm(PIL), PIL, jid));
    }
    await assertSucceeds(setDoc(jj(vp(PIL), PIL, 'uusi'), { nimi: 'P10', jaksofokus: JAKSO }));
  });
  it('seura ilman laskutus_asetuksia = pilotti', async () => {
    await env.withSecurityRulesDisabled(async (c) => {
      const db = c.firestore();
      await setDoc(doc(db, 'seurat', UUSI), { nimi: 'Uusi' });
      await setDoc(doc(db, 'seurat', UUSI, 'joukkueet', 'puu'), { nimi: 'P11' });
    });
    await assertSucceeds(jakso(vp(UUSI), UUSI, 'puu'));
  });
});

describe('v3.74 · seurat/{sid}.laskutus_sopimus vain SA', () => {
  it('update: johto, valmentaja ja toisen seuran johto hylätään; SA sallitaan (bool)', async () => {
    await assertFails(updateDoc(doc(vp(SOP), 'seurat', SOP), { laskutus_sopimus: true }));
    await assertFails(updateDoc(doc(valm(SOP), 'seurat', SOP), { laskutus_sopimus: true }));
    await assertFails(updateDoc(doc(vp(PIL), 'seurat', SOP), { laskutus_sopimus: true }));
    await assertSucceeds(updateDoc(doc(sa(), 'seurat', SOP), { laskutus_sopimus: true }));
    await assertFails(updateDoc(doc(sa(), 'seurat', SOP), { laskutus_sopimus: 'kyllä' }));
  });
  it('update: johto ei muuta eikä poista olemassa olevaa; muut kentät sallitaan kuten ennen', async () => {
    await env.withSecurityRulesDisabled(async (c) => { await updateDoc(doc(c.firestore(), 'seurat', SOP), { laskutus_sopimus: true }); });
    await assertFails(updateDoc(doc(vp(SOP), 'seurat', SOP), { laskutus_sopimus: false }));
    await assertFails(updateDoc(doc(vp(SOP), 'seurat', SOP), { laskutus_sopimus: deleteField() }));
    await assertSucceeds(updateDoc(doc(vp(SOP), 'seurat', SOP), { nimi: 'Uusi nimi' }));
    await assertSucceeds(setDoc(doc(vp(SOP), 'seurat', SOP), { kieli: 'sv' }, { merge: true }));   // merge säilyttää kentän → sallittu
    await assertFails(updateDoc(doc(valm(SOP), 'seurat', SOP), { nimi: 'x' }));                     // valmentaja ei kirjoita seuradokumenttia (ennallaan)
  });
  it('create: johto ja valmentaja hylätään kentän kanssa; johto ilman kenttää ja SA sallitaan', async () => {
    await assertFails(setDoc(doc(vp(UUSI), 'seurat', UUSI), { nimi: 'U', laskutus_sopimus: true }));
    await assertFails(setDoc(doc(vp(UUSI), 'seurat', UUSI), { nimi: 'U', laskutus_sopimus: false }));
    await assertFails(setDoc(doc(valm(UUSI), 'seurat', UUSI), { nimi: 'U', laskutus_sopimus: true }));
    await assertSucceeds(setDoc(doc(vp(UUSI), 'seurat', UUSI), { nimi: 'U' }));
    await assertSucceeds(setDoc(doc(sa(), 'seurat', 'toinen'), { nimi: 'T', laskutus_sopimus: true }));
  });
  it('delete ennallaan (SA | oman seuran johto)', async () => {
    await assertFails(deleteDoc(doc(valm(PIL), 'seurat', PIL)));
    await assertSucceeds(deleteDoc(doc(sa(), 'seurat', PIL)));
  });
});
