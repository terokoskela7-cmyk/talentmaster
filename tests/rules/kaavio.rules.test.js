/**
 * TalentMaster™ — KAAVIOT: Firestore-sääntöjen NEGATIIVISET testit + policy-pariteetti (erä A).
 *
 * Erän turvakriittinen ydin. Jokainen väite on muotoa "X EI saa" — positiiviset tapaukset ovat
 * mukana vain osoittamassa ettei sääntö ole vahingossa kaiken kieltävä (ei-vacuous).
 *
 * PARITEETTI: lib/tm_kaavio_policy.js on UI:n totuus, firestore.rules on palvelimen totuus.
 * Viimeinen describe ajaa SAMAN rooli/tila-matriisin molempien läpi ja vaatii identtisen tuloksen.
 * Se on ainoa tapa osoittaa ettei UI lupaa enempää kuin palvelin pakottaa.
 *
 * Ajo: npm run test:rules  (vaatii Java ≥21 + firestore-emulaattorin)
 */
import { initializeTestEnvironment, assertSucceeds, assertFails } from '@firebase/rules-unit-testing';
import { readFileSync } from 'fs';
import { resolve, dirname } from 'path';
import { fileURLToPath } from 'url';
import { createRequire } from 'module';
import { setDoc, getDoc, doc, updateDoc, deleteDoc } from 'firebase/firestore';
import { describe, it, expect, beforeAll, afterAll, beforeEach } from 'vitest';

const __dirname = dirname(fileURLToPath(import.meta.url));
const require = createRequire(import.meta.url);
const P = require('../../lib/tm_kaavio_policy.js');
const RULES_PATH = resolve(__dirname, '../../tm_admin/firestore.rules');
const PROJECT_ID = 'talentmaster-kaavio-rules';

const SEURA_A = 'fcl', SEURA_B = 'kpv';
const JOUKKUE_A1 = 'fcl_u12', JOUKKUE_A2 = 'fcl_u14';
const SA = 'sa-001', VP_A = 'vp-fcl', VALM_A1 = 'valm-a1', VALM_A2 = 'valm-a2', VALM_B = 'valm-b';
const SIHTEERI = 'siht-fcl', TALVAL = 'talval-fcl', ANON = 'anon-pin';

let testEnv;
const SPEC = { avain: 't_h0', suunta: 'ylos', pelimuoto: '8v8', pelaajat: [{ id: 'a', joukkue: 'oma', rooli: 'syöttäjä', x: 50, y: 50 }] };
const kaavio = (status, joukkueId) => ({ spec: SPEC, review: { status, nakyvyys: 'joukkue', joukkueId: joukkueId || JOUKKUE_A1, luonut: VALM_A1 } });

beforeAll(async () => {
  testEnv = await initializeTestEnvironment({
    projectId: PROJECT_ID,
    firestore: { rules: readFileSync(RULES_PATH, 'utf8'), host: '127.0.0.1', port: 8080 }
  });
});
afterAll(async () => { if (testEnv) await testEnv.cleanup(); });

beforeEach(async () => {
  await testEnv.clearFirestore();
  await testEnv.withSecurityRulesDisabled(async (c) => {
    const db = c.firestore();
    await setDoc(doc(db, 'admins', SA), { rooli: 'super_admin' });
    await setDoc(doc(db, 'seurat', SEURA_A), { nimi: 'FC Lahti' });
    await setDoc(doc(db, 'seurat', SEURA_B), { nimi: 'KPV' });
    // valmentajanJoukkueet() lukee tämän
    await setDoc(doc(db, 'seurat', SEURA_A, 'kayttajat', VALM_A1), { rooli: 'valmentaja', joukkueet: [JOUKKUE_A1] });
    await setDoc(doc(db, 'seurat', SEURA_A, 'kayttajat', VALM_A2), { rooli: 'valmentaja', joukkueet: [JOUKKUE_A2] });
    await setDoc(doc(db, 'seurat', SEURA_A, 'kayttajat', TALVAL), { rooli: 'talenttivalmentaja', joukkueet: [] });
    // kaaviot eri tiloissa
    await setDoc(doc(db, 'seurat', SEURA_A, 'kaaviot', 'k_luonnos'), kaavio('luonnos'));
    await setDoc(doc(db, 'seurat', SEURA_A, 'kaaviot', 'k_odottaa'), kaavio('odottaa'));
    await setDoc(doc(db, 'seurat', SEURA_A, 'kaaviot', 'k_hyvaksytty'), kaavio('hyvaksytty'));
    await setDoc(doc(db, 'seurat', SEURA_A, 'kaaviot', 'k_toinen_joukkue'), kaavio('luonnos', JOUKKUE_A2));
    await setDoc(doc(db, 'kaaviot', 't_h0'), { spec: SPEC, meta: { versio: 1 } });
  });
});

const sa = () => testEnv.authenticatedContext(SA, { rooli: 'super_admin' }).firestore();
const vp = (s) => testEnv.authenticatedContext(VP_A, { rooli: 'vp', seuraId: s }).firestore();
const valm = (uid, s) => testEnv.authenticatedContext(uid, { rooli: 'valmentaja', seuraId: s }).firestore();
const talval = () => testEnv.authenticatedContext(TALVAL, { rooli: 'talenttivalmentaja', seuraId: SEURA_A }).firestore();
const siht = () => testEnv.authenticatedContext(SIHTEERI, { rooli: 'seurasihteeri', seuraId: SEURA_A }).firestore();
const anon = () => testEnv.authenticatedContext(ANON, { firebase: { sign_in_provider: 'anonymous' } }).firestore();
const kd = (db, id) => doc(db, 'seurat', SEURA_A, 'kaaviot', id);

describe('kaaviot · LUKU — pelaaja/anon näkee vain hyväksytyt', () => {
  it('anon EI lue luonnosta', async () => { await assertFails(getDoc(kd(anon(), 'k_luonnos'))); });
  it('anon EI lue odottavaa', async () => { await assertFails(getDoc(kd(anon(), 'k_odottaa'))); });
  it('anon LUKEE hyväksytyn (ei-vacuous)', async () => { await assertSucceeds(getDoc(kd(anon(), 'k_hyvaksytty'))); });
  it('oman seuran valmentaja lukee KAIKKI tilat', async () => {
    await assertSucceeds(getDoc(kd(valm(VALM_A1, SEURA_A), 'k_luonnos')));
    await assertSucceeds(getDoc(kd(valm(VALM_A1, SEURA_A), 'k_odottaa')));
  });
  it('TOISEN seuran valmentaja EI lue luonnosta', async () => {
    await assertFails(getDoc(kd(valm(VALM_B, SEURA_B), 'k_luonnos')));
  });
});

describe('kaaviot · KIRJOITUS — seura- ja joukkue-skooppi', () => {
  // TÄSMÄLLINEN PARI: sama rooli, sama operaatio, sama dokumentti — ainoa muuttuja on seuraId.
  // Ilman paria kielto voisi johtua onSuperAdmin():in arviointivirheestä (token.super_admin
  // puuttuu → rules-virhe → deny), ei seura-skoopista. Pari eristää skoopin ainoaksi eroksi.
  it('VP EI kirjoita TOISEN seuran kaavioon — mutta OMAN seuran samaan dokumenttiin kyllä', async () => {
    const toinen = testEnv.authenticatedContext('vp-kpv', { rooli: 'vp', seuraId: SEURA_B }).firestore();
    await assertFails(updateDoc(kd(toinen, 'k_luonnos'), { 'review.status': 'odottaa' }));
    await assertSucceeds(updateDoc(kd(vp(SEURA_A), 'k_luonnos'), { 'review.status': 'odottaa' }));
  });
  it('valmentaja EI kirjoita TOISEN JOUKKUEEN kaavioon', async () => {
    await assertFails(updateDoc(kd(valm(VALM_A1, SEURA_A), 'k_toinen_joukkue'), { 'review.status': 'odottaa' }));
  });
  it('valmentaja kirjoittaa OMAN joukkueensa kaavioon (ei-vacuous)', async () => {
    await assertSucceeds(updateDoc(kd(valm(VALM_A1, SEURA_A), 'k_luonnos'), { 'review.status': 'odottaa' }));
  });
  it('talenttivalmentaja ohittaa joukkuerajauksen seuran sisällä', async () => {
    await assertSucceeds(updateDoc(kd(talval(), 'k_toinen_joukkue'), { 'review.status': 'odottaa' }));
  });
});

describe('kaaviot · STATUSSIIRROT — katselmus ei saa ohittua', () => {
  it('suora luonnos→hyvaksytty ESTETTY (myös VP:ltä)', async () => {
    await assertFails(updateDoc(kd(vp(SEURA_A), 'k_luonnos'), { 'review.status': 'hyvaksytty' }));
  });
  it('luonnos→odottaa→hyvaksytty sallittu (ei-vacuous)', async () => {
    await assertSucceeds(updateDoc(kd(valm(VALM_A1, SEURA_A), 'k_luonnos'), { 'review.status': 'odottaa' }));
    await assertSucceeds(updateDoc(kd(vp(SEURA_A), 'k_odottaa'), { 'review.status': 'hyvaksytty' }));
  });
  it('valmentaja EI hyväksy odottavaa', async () => {
    await assertFails(updateDoc(kd(valm(VALM_A1, SEURA_A), 'k_odottaa'), { 'review.status': 'hyvaksytty' }));
  });
  it('SEURASIHTEERI EI hyväksy (onJohtoRooli olisi päästänyt)', async () => {
    await assertFails(updateDoc(kd(siht(), 'k_odottaa'), { 'review.status': 'hyvaksytty' }));
  });
  it('uusi kaavio EI voi syntyä hyväksyttynä', async () => {
    await assertFails(setDoc(kd(valm(VALM_A1, SEURA_A), 'uusi1'), kaavio('hyvaksytty')));
    await assertSucceeds(setDoc(kd(valm(VALM_A1, SEURA_A), 'uusi2'), kaavio('luonnos')));
  });
});

describe('kaaviot · UUDELLEENHYVÄKSYNTÄ', () => {
  it('valmentajan muokkaus hyväksyttyyn PAKOTTAA takaisin odottamaan', async () => {
    const db = valm(VALM_A1, SEURA_A);
    await assertFails(updateDoc(kd(db, 'k_hyvaksytty'), { spec: { ...SPEC, suunta: 'alas' } }));            // status jäisi hyväksytyksi
    await assertSucceeds(updateDoc(kd(db, 'k_hyvaksytty'), { spec: { ...SPEC, suunta: 'alas' }, 'review.status': 'odottaa' }));
  });
  it('VP saa muokata hyväksyttyä ilman pudotusta (itse-kierros ei lisää kontrollia)', async () => {
    await assertSucceeds(updateDoc(kd(vp(SEURA_A), 'k_hyvaksytty'), { spec: { ...SPEC, suunta: 'alas' } }));
  });
});

describe('kaaviot · KANONINEN kerros on master-omisteinen', () => {
  it('VP EI kirjoita kanoniseen', async () => {
    await assertFails(setDoc(doc(vp(SEURA_A), 'kaaviot', 't_h0'), { spec: SPEC }));
  });
  it('valmentaja EI kirjoita kanoniseen', async () => {
    await assertFails(setDoc(doc(valm(VALM_A1, SEURA_A), 'kaaviot', 'uusi'), { spec: SPEC }));
  });
  it('SA kirjoittaa kanoniseen (ei-vacuous)', async () => {
    await assertSucceeds(setDoc(doc(sa(), 'kaaviot', 't_h1'), { spec: SPEC }));
  });
  it('kirjautunut pelaaja/anon LUKEE kanonisen', async () => {
    await assertSucceeds(getDoc(doc(anon(), 'kaaviot', 't_h0')));
  });
});

describe('kaaviot · POISTO', () => {
  it('valmentaja EI poista', async () => { await assertFails(deleteDoc(kd(valm(VALM_A1, SEURA_A), 'k_luonnos'))); });
  it('VP poistaa oman seuran kaavion', async () => { await assertSucceeds(deleteDoc(kd(vp(SEURA_A), 'k_luonnos'))); });
});

/* ── PARITEETTI ───────────────────────────────────────────────────────────────────────────
   Sama matriisi molempien läpi. Jos UI lupaa enemmän kuin palvelin pakottaa (tai päinvastoin),
   tämä testi punastuu — se on erän vahvin väite "oikeudet pakotettu palvelimella". */
describe('kaaviot · POLICY-PARITEETTI (lib vs rules)', () => {
  const TAPAUKSET = [
    { nimi: 'anon + luonnos',            ctx: { anon: true },                                          dokId: 'k_luonnos',    odotus: false },
    { nimi: 'anon + odottaa',            ctx: { anon: true },                                          dokId: 'k_odottaa',    odotus: false },
    { nimi: 'anon + hyvaksytty',         ctx: { anon: true },                                          dokId: 'k_hyvaksytty', odotus: true  },
    { nimi: 'oman seuran valmentaja',    ctx: { rooli: 'valmentaja', seuraId: SEURA_A, joukkueet: [JOUKKUE_A1] }, dokId: 'k_luonnos', odotus: true },
    { nimi: 'toisen seuran valmentaja',  ctx: { rooli: 'valmentaja', seuraId: SEURA_B, joukkueet: [] }, dokId: 'k_luonnos',    odotus: false },
    { nimi: 'oman seuran VP',            ctx: { rooli: 'vp', seuraId: SEURA_A },                        dokId: 'k_luonnos',    odotus: true  }
  ];
  const libDoc = (id) => ({ seuraId: SEURA_A, review: (id === 'k_luonnos' ? kaavio('luonnos') : id === 'k_odottaa' ? kaavio('odottaa') : kaavio('hyvaksytty')).review });

  it('LUKU-matriisi on identtinen libissä ja säännöissä', async () => {
    const erot = [];
    for (const t of TAPAUKSET) {
      const lib = P.kaavioVoiLukea(libDoc(t.dokId), t.ctx);
      const db = t.ctx.anon ? anon() : (t.ctx.rooli === 'vp' ? vp(t.ctx.seuraId)
        : valm(t.ctx.seuraId === SEURA_A ? VALM_A1 : VALM_B, t.ctx.seuraId));
      let rules = true;
      try { await getDoc(kd(db, t.dokId)); } catch { rules = false; }
      if (lib !== rules || lib !== t.odotus) erot.push(`${t.nimi}: lib=${lib} rules=${rules} odotus=${t.odotus}`);
    }
    expect(erot).toEqual([]);
  });

  it('statussiirto-matriisi on identtinen (lib TM_KAAVIO_SIIRROT vs rules)', async () => {
    const vpCtx = { rooli: 'vp', seuraId: SEURA_A };
    // lib kieltää suoran luonnos→hyvaksytty
    expect(P.kaavioSiirtoSallittu('luonnos', 'hyvaksytty', vpCtx)).toBe(false);
    expect(P.kaavioSiirtoSallittu('odottaa', 'hyvaksytty', vpCtx)).toBe(true);
    // sama säännöissä
    await assertFails(updateDoc(kd(vp(SEURA_A), 'k_luonnos'), { 'review.status': 'hyvaksytty' }));
    await assertSucceeds(updateDoc(kd(vp(SEURA_A), 'k_odottaa'), { 'review.status': 'hyvaksytty' }));
  });

  it('seurasihteeri ei ole hyväksyjä kummassakaan', async () => {
    expect(P.kaavioOnHyvaksyja({ rooli: 'seurasihteeri', seuraId: SEURA_A })).toBe(false);
    await assertFails(updateDoc(kd(siht(), 'k_odottaa'), { 'review.status': 'hyvaksytty' }));
  });
});
