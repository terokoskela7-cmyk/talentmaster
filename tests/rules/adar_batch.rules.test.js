/**
 * ADAR-pikakortin tallennusbatch (#745) Rules v3.36:ta vastaan: havainnot/{id} + pelaajadokin adar_*-pikakentät SAMASSA
 * batchissa, KPV-valmentajan claimeilla. Payload rakennetaan SAMOILLA libeillä kuin sovellus (tmAdarPikakentat).
 * Kysymys (Teron käsitesti): hylkääkö Rules jonkin kentän / koko batchin → havainto katoaa hiljaa?
 * Ajo: firebase emulators:exec --only firestore "npx vitest run tests/rules/adar_batch.rules.test.js" (Java ≥21)
 */
import { initializeTestEnvironment, assertSucceeds, assertFails } from '@firebase/rules-unit-testing';
import { readFileSync } from 'fs';
import { resolve, dirname } from 'path';
import { fileURLToPath } from 'url';
import { createRequire } from 'module';
import { setDoc, doc, writeBatch, serverTimestamp, getDoc } from 'firebase/firestore';

const __dirname = dirname(fileURLToPath(import.meta.url));
const require = createRequire(import.meta.url);
const PY = require('../../lib/tm_pelialy_yksilo.js');
const PROJECT_ID = 'talentmaster-adar-batch-test';
const SEURA = 'kpv', TOPIAS = 'm93GBdOaGCUuenMiCL0I', VALM = 'valm-kpv-1', VP = 'vp-kpv-1', TALVAL = 'talval-kpv-1', TESTIV = 'testiv-kpv-1';
let testEnv;

beforeAll(async () => {
  testEnv = await initializeTestEnvironment({ projectId: PROJECT_ID, firestore: { rules: readFileSync(resolve(__dirname, '../../tm_admin/firestore.rules'), 'utf8'), host: '127.0.0.1', port: 8080 } });
});
afterAll(async () => { if (testEnv) await testEnv.cleanup(); });
beforeEach(async () => { await testEnv.clearFirestore(); });

async function seed({ pelaaja, valmJoukkueet }) {
  await testEnv.withSecurityRulesDisabled(async (ctx) => {
    const db = ctx.firestore();
    await setDoc(doc(db, 'seurat', SEURA), { nimi: 'KPV', aktiivinen: true });
    await setDoc(doc(db, 'seurat', SEURA, 'pelaajat', TOPIAS), pelaaja);
    const kd = { email: 'valm@kpv.fi', rooli: 'valmentaja', seuraId: SEURA, aktiivinen: true };
    if (valmJoukkueet) kd.joukkueet = valmJoukkueet;
    await setDoc(doc(db, 'seurat', SEURA, 'kayttajat', VALM), kd);
    await setDoc(doc(db, 'seurat', SEURA, 'kayttajat', VP), { email: 'vp@kpv.fi', rooli: 'vp', seuraId: SEURA, aktiivinen: true });
    await setDoc(doc(db, 'seurat', SEURA, 'kayttajat', TALVAL), { email: 'tv@kpv.fi', rooli: 'talenttivalmentaja', seuraId: SEURA, aktiivinen: true });
    await setDoc(doc(db, 'seurat', SEURA, 'kayttajat', TESTIV), { email: 'tt@kpv.fi', rooli: 'testivastaava', seuraId: SEURA, aktiivinen: true });
  });
}
const ctxRooli = (uid, rooli) => testEnv.authenticatedContext(uid, { rooli, seuraId: SEURA });
const TOPIAS_OK = { etunimi: 'Topias', sukunimi: 'Koskela', syntymaVuosi: 2013, sukupuoli: 'M', joukkue: 'KPV U13', joukkueet: ['kpv_u13'], tunniste: '12345678', suostumusTila: 'annettu' };

/* Täsmälleen ADARin _phTallenna-data (TalentMaster_ADAR_Pikakortti.html) */
function havaintoData(uid, nakyvyys) {
  return {
    tyyppi: 'adar_pikakortti', porras: 1, ulottuvuudet: ['A', 'D'], pisteet: { A: 2, D: 3 }, havaitut: ['A:x'], konteksti: 'harjoitus',
    narratiivi: 'testi', nakyvyys: nakyvyys, tila: 'valmis', pelaaja_lukenut: false, tekija_uid: uid, tekija_nimi: 'Valmentaja V.',
    tekija_rooli: 'valmentaja', pelaaja_id: TOPIAS, seura_id: SEURA, palloId: '12345678', pvm: '2026-10-03', luotu: serverTimestamp(),
  };
}
function kentat(porrasKirjoita) {
  const hav = [{ tyyppi: 'adar_pikakortti', porras: 1, pisteet: { A: 2, D: 3 }, tila: 'valmis', konteksti: 'harjoitus', luotu: new Date(), pvm: '2026-10-03', nakyvyys: 'valmentajat' }];
  const k = PY.tmAdarPikakentat(hav, 13, 1, { edellinen: null });
  if (k && porrasKirjoita) k.havainto_porras = 1;
  return k;
}
async function ajaBatch(ctx, k, { nakyvyys = 'valmentajat', uid = VALM } = {}) {
  const db = ctx.firestore();
  const hRef = doc(db, 'seurat', SEURA, 'pelaajat', TOPIAS, 'havainnot', 'h1');
  const pRef = doc(db, 'seurat', SEURA, 'pelaajat', TOPIAS);
  const b = writeBatch(db);
  b.set(hRef, havaintoData(uid, nakyvyys));
  if (k) b.set(pRef, k, { merge: true });
  return b.commit();
}

describe('ADAR-batch (havainto + adar_*) — KPV-valmentaja, Rules v3.36', () => {
  it('EI VACUOUS: tmAdarPikakentat tuottaa adar_*-kenttiä', () => {
    const k = kentat(true);
    expect(Object.keys(k).some((x) => x.startsWith('adar_'))).toBe(true);
    console.log('[adar-batch] kenttäavaimet:', Object.keys(k).join(','));
  });
  it('terve tila: Topias joukkueet=[kpv_u13], valmentaja joukkueet=[kpv_u13] → batch menee läpi', async () => {
    await seed({ pelaaja: TOPIAS_OK, valmJoukkueet: ['kpv_u13'] });
    await assertSucceeds(ajaBatch(ctxRooli(VALM, 'valmentaja'), kentat(true)));
  });
  it('havainto yksinään (ilman pikakenttiä) menee läpi terveessä tilassa', async () => {
    await seed({ pelaaja: TOPIAS_OK, valmJoukkueet: ['kpv_u13'] });
    await assertSucceeds(ajaBatch(ctxRooli(VALM, 'valmentaja'), null));
  });
  it('nakyvyys pelaaja / valmentajat — molemmat läpi', async () => {
    await seed({ pelaaja: TOPIAS_OK, valmJoukkueet: ['kpv_u13'] });
    await assertSucceeds(ajaBatch(ctxRooli(VALM, 'valmentaja'), kentat(false), { nakyvyys: 'pelaaja' }));
  });
  it('Topiaksella EI joukkueet[]-kenttää (vain joukkue-merkkijono) → HAVAINTO JA BATCH HYLÄTÄÄN (fail-closed)', async () => {
    const { joukkueet, ...ilman } = TOPIAS_OK;
    await seed({ pelaaja: ilman, valmJoukkueet: ['kpv_u13'] });
    await assertFails(ajaBatch(ctxRooli(VALM, 'valmentaja'), kentat(true)));
    await seed({ pelaaja: ilman, valmJoukkueet: ['kpv_u13'] });
    await assertFails(ajaBatch(ctxRooli(VALM, 'valmentaja'), null));   // havainto yksinäänkin hylätään
  });
  it('valmentajan kayttajat-dokissa EI joukkueet[]-kenttää → hylätään', async () => {
    await seed({ pelaaja: TOPIAS_OK, valmJoukkueet: undefined });
    await assertFails(ajaBatch(ctxRooli(VALM, 'valmentaja'), kentat(true)));
  });
  it('joukkue-ID eri kuin pelaajalla → hylätään', async () => {
    await seed({ pelaaja: TOPIAS_OK, valmJoukkueet: ['kpv_u15'] });
    await assertFails(ajaBatch(ctxRooli(VALM, 'valmentaja'), null));
  });
  it('VP ja talenttivalmentaja: batch läpi ilman joukkuekuulumista', async () => {
    await seed({ pelaaja: TOPIAS_OK, valmJoukkueet: ['kpv_u13'] });
    await assertSucceeds(ajaBatch(ctxRooli(VP, 'vp'), kentat(true), { uid: VP }));
    await testEnv.clearFirestore(); await seed({ pelaaja: TOPIAS_OK, valmJoukkueet: ['kpv_u13'] });
    await assertSucceeds(ajaBatch(ctxRooli(TALVAL, 'talenttivalmentaja'), kentat(true), { uid: TALVAL }));
  });
  it('testivastaava: havainto hylätään (ei valmennusrooli) — kuuluu mallin mukaan', async () => {
    await seed({ pelaaja: TOPIAS_OK, valmJoukkueet: ['kpv_u13'] });
    await assertFails(ajaBatch(ctxRooli(TESTIV, 'testivastaava'), kentat(true), { uid: TESTIV }));
  });
});

/* ── #743/#745: muut batchit — ensisijainen tieto (tulos) ei saa kadota pikakenttäoikeuden takia ─────────────────────── */
const PK = require('../../lib/tm_pikakirjaus.js');
const PKENT = require('../../lib/tm_pikakentat.js');
const TULOKSET = { lin_30m: { paras: 5.0 }, hyppy_cj: { paras: 34 } };

async function testiBatch(ctx, { uid, pikakentat = true }) {
  const db = ctx.firestore();
  const pRef = doc(db, 'seurat', SEURA, 'pelaajat', TOPIAS);
  const upd = PKENT.tmLaskePikakentat(TOPIAS_OK, TULOKSET, '2026-10-03');
  PK._lisaaHistoria(upd, TOPIAS_OK, TULOKSET, '2026-10-03');
  const b = writeBatch(db);
  b.set(doc(pRef, 'testitulokset', PK._docId('2026-10-03')), PK._testitulosPayload(TULOKSET, '2026-10-03', uid, serverTimestamp(), new Date().toISOString()), { merge: true });
  if (pikakentat && Object.keys(upd).length) b.update(pRef, upd);
  return { commit: () => b.commit(), upd };
}
describe('Pikakirjaus/Testituonti/Testaus_v9 -batchit (testitulos + pelaajan pikakentät) roolittain', () => {
  it('EI VACUOUS: pikakentät sisältävät hh_viimeisin + hh_pvm samassa upd:ssä (§26)', async () => {
    const { upd } = await testiBatch(ctxRooli(VALM, 'valmentaja'), { uid: VALM }).catch(() => ({ upd: PKENT.tmLaskePikakentat(TOPIAS_OK, TULOKSET, '2026-10-03') }));
    expect(upd.hh_viimeisin).toBeTruthy(); expect(upd.hh_pvm).toBe('2026-10-03');
  });
  it.each([['valmentaja (oma joukkue)', VALM, 'valmentaja'], ['VP', VP, 'vp'], ['talenttivalmentaja', TALVAL, 'talenttivalmentaja'], ['testivastaava', TESTIV, 'testivastaava']])('%s: tulos + pikakentät samassa batchissa menevät läpi', async (_n, uid, rooli) => {
    await seed({ pelaaja: TOPIAS_OK, valmJoukkueet: ['kpv_u13'] });
    const { commit } = await testiBatch(ctxRooli(uid, rooli), { uid });
    await assertSucceeds(commit());
  });
  it('valmentaja EI omaa joukkuetta → koko batch hylätään (tulos ei tallennu): Pikakirjaus näyttää virheen, ei hiljaista katoamista', async () => {
    await seed({ pelaaja: TOPIAS_OK, valmJoukkueet: ['kpv_u15'] });
    const { commit } = await testiBatch(ctxRooli(VALM, 'valmentaja'), { uid: VALM });
    await assertFails(commit());
  });
  it('tulos ilman pikakenttiä (fallback-kirjoitus) menee läpi valmentajalle ja testivastaavalle — ensisijainen tieto säilyy', async () => {
    await seed({ pelaaja: TOPIAS_OK, valmJoukkueet: ['kpv_u13'] });
    await assertSucceeds((await testiBatch(ctxRooli(VALM, 'valmentaja'), { uid: VALM, pikakentat: false })).commit());
    await testEnv.clearFirestore(); await seed({ pelaaja: TOPIAS_OK, valmJoukkueet: ['kpv_u13'] });
    await assertSucceeds((await testiBatch(ctxRooli(TESTIV, 'testivastaava'), { uid: TESTIV, pikakentat: false })).commit());
  });
});
