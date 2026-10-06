/**
 * T1 — Storage Rules: harjoitepankin kaaviokuvat seurat/{sid}/harjoitepankki/{id}.jpg. Luku oman seuran henkilökunnalle + SA; kirjoitus vain SA; toisen seuran henkilökunta, pelaaja, huoltaja, anonyymi eivät lue.
 * Ajetaan Storage-emulaattorilla (firebase emulators:exec --only firestore,storage). Fixture-tiedostot keksittyjä (ei seuran aineistoa).
 */
import { describe, it, expect, beforeAll, afterAll, beforeEach } from 'vitest';
import { initializeTestEnvironment, assertSucceeds, assertFails } from '@firebase/rules-unit-testing';
import { readFileSync } from 'fs';
import { ref, uploadBytes, getBytes, deleteObject } from 'firebase/storage';
import { resolve, dirname } from 'path';
import { fileURLToPath } from 'url';

const juuri = resolve(dirname(fileURLToPath(import.meta.url)), '..', '..');
let env;
beforeAll(async () => {
  env = await initializeTestEnvironment({ projectId: 'demo-tm-storage', storage: { rules: readFileSync(resolve(juuri, 'storage.rules'), 'utf8'), host: '127.0.0.1', port: 9199 } });
});
afterAll(async () => { if (env) await env.cleanup(); });
beforeEach(async () => {
  await env.clearStorage();
  await env.withSecurityRulesDisabled(async (c) => { const s = c.storage(); await uploadBytes(ref(s, 'seurat/kpv/harjoitepankki/kpvh_01.jpg'), new Uint8Array([255, 216, 255, 217]), { contentType: 'image/jpeg' }); await uploadBytes(ref(s, 'seurat/sjk/harjoitepankki/sjk_01.jpg'), new Uint8Array([255, 216, 255, 217]), { contentType: 'image/jpeg' }); });
});
const ctx = (uid, claims) => env.authenticatedContext(uid, claims).storage();
const KPV = (rooli) => ctx('u-' + rooli, { rooli, seuraId: 'kpv' });
const polku = (s, p) => ref(s, p);

describe('Storage · seurat/{sid}/harjoitepankki/{id}.jpg', () => {
  it('LUKU: oman seuran henkilökunta (kaikki roolit) ja SA lukevat', async () => {
    for (const rooli of ['valmentaja', 'talenttivalmentaja', 'fysiikkavalmentaja', 'fysioterapeutti', 'vp', 'urheilutoimenjohtaja', 'seurasihteeri', 'testivastaava']) await assertSucceeds(getBytes(polku(KPV(rooli), 'seurat/kpv/harjoitepankki/kpvh_01.jpg')));
    await assertSucceeds(getBytes(polku(ctx('sa', { rooli: 'super_admin' }), 'seurat/kpv/harjoitepankki/kpvh_01.jpg'))); await assertSucceeds(getBytes(polku(ctx('sa2', { rooli: 'superadmin' }), 'seurat/sjk/harjoitepankki/sjk_01.jpg')));
  });
  it('ERISTYS: toisen seuran henkilökunta (myös VP) ei lue kumpaankaan suuntaan', async () => {
    await assertFails(getBytes(polku(ctx('v2', { rooli: 'vp', seuraId: 'sjk' }), 'seurat/kpv/harjoitepankki/kpvh_01.jpg')));
    await assertFails(getBytes(polku(KPV('vp'), 'seurat/sjk/harjoitepankki/sjk_01.jpg')));
    await assertFails(getBytes(polku(ctx('v3', { rooli: 'valmentaja', seuraId: 'sibbovargarna' }), 'seurat/kpv/harjoitepankki/kpvh_01.jpg')));
  });
  it('PELAAJA, HUOLTAJA, anonyymi, kirjautumaton ja rooliton eivät lue (ei lukua pelaajalle tässä vaiheessa)', async () => {
    await assertFails(getBytes(polku(ctx('p1', { rooli: 'pelaaja', pelaajaSeuraId: 'kpv', pelaajaId: 'p1' }), 'seurat/kpv/harjoitepankki/kpvh_01.jpg')));
    await assertFails(getBytes(polku(ctx('p2', { rooli: 'pelaaja', seuraId: 'kpv' }), 'seurat/kpv/harjoitepankki/kpvh_01.jpg')));   // vaikka seuraId-claim: rooli ei henkilökuntaa
    await assertFails(getBytes(polku(ctx('h1', { rooli: 'huoltaja', seuraId: 'kpv' }), 'seurat/kpv/harjoitepankki/kpvh_01.jpg')));
    await assertFails(getBytes(polku(ctx('a1', {}), 'seurat/kpv/harjoitepankki/kpvh_01.jpg'))); await assertFails(getBytes(polku(ctx('a2', { seuraId: 'kpv' }), 'seurat/kpv/harjoitepankki/kpvh_01.jpg')));
    await assertFails(getBytes(polku(env.unauthenticatedContext().storage(), 'seurat/kpv/harjoitepankki/kpvh_01.jpg')));
  });
  it('KIRJOITUS/POISTO: vain SA — oman seuran VP/valmentaja ei kirjoita eikä poista; toisen seuran ei', async () => {
    const kuva = new Uint8Array([255, 216, 255, 217]), meta = { contentType: 'image/jpeg' };
    await assertSucceeds(uploadBytes(polku(ctx('sa', { rooli: 'super_admin' }), 'seurat/kpv/harjoitepankki/kpvh_02.jpg'), kuva, meta));
    for (const rooli of ['vp', 'valmentaja', 'urheilutoimenjohtaja']) { await assertFails(uploadBytes(polku(KPV(rooli), 'seurat/kpv/harjoitepankki/kpvh_03.jpg'), kuva, meta)); await assertFails(deleteObject(polku(KPV(rooli), 'seurat/kpv/harjoitepankki/kpvh_01.jpg'))); }
    await assertFails(uploadBytes(polku(ctx('v2', { rooli: 'vp', seuraId: 'sjk' }), 'seurat/kpv/harjoitepankki/kpvh_04.jpg'), kuva, meta));
    await assertSucceeds(deleteObject(polku(ctx('sa', { rooli: 'super_admin' }), 'seurat/kpv/harjoitepankki/kpvh_02.jpg')));
  });
  it('muut polut ennallaan: brändi-logo (kirjautunut lukee), oletus-kielto muille (esim. seurat/kpv/muu/x.jpg)', async () => {
    await env.withSecurityRulesDisabled(async (c) => { await uploadBytes(ref(c.storage(), 'seurat/kpv/brandi/logo.png'), new Uint8Array([1]), { contentType: 'image/png' }); await uploadBytes(ref(c.storage(), 'seurat/kpv/muu/x.jpg'), new Uint8Array([1]), { contentType: 'image/jpeg' }); });
    await assertSucceeds(getBytes(polku(ctx('u', { rooli: 'valmentaja', seuraId: 'kpv' }), 'seurat/kpv/brandi/logo.png'))); await assertFails(getBytes(polku(KPV('vp'), 'seurat/kpv/muu/x.jpg')));
  });
});
