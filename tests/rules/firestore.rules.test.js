/**
 * TalentMaster™ — Firestore Security Rules -yksikkötestit
 * @firebase/rules-unit-testing v3 + Vitest
 *
 * Testaa kriittiset turvallisuusinvariantit:
 *   1. Tenant isolation — seura A ei lue seura B:n dataa
 *   2. Super Admin — pääsy kaikkeen (admins/{uid} exists TAI token.rooli)
 *   3. Anonymous PIN — lukuoikeus pelaajat + havainnot, ei kirjoitusta muualle
 *   4. Roolipohjainen kirjoitus — valmentaja vs johto vs seurasihteeri
 *   5. Huoltaja — lukee lapsen datan huoltajaEmail-matchilla
 *   6. Viestit — lähettäjä/vastaanottaja-isolaatio
 *   7. Kehut — perheen yksityisyys (valmentaja EI lue)
 *
 * Ajo: npx firebase emulators:exec --only firestore "npx vitest run tests/rules"
 */

import {
  initializeTestEnvironment,
  assertSucceeds,
  assertFails,
} from '@firebase/rules-unit-testing';
import { readFileSync } from 'fs';
import { resolve, dirname } from 'path';
import { fileURLToPath } from 'url';
import { setDoc, getDoc, doc, collection, addDoc, updateDoc, deleteDoc, query, where, limit, getDocs } from 'firebase/firestore';

const __dirname = dirname(fileURLToPath(import.meta.url));
const RULES_PATH = resolve(__dirname, '../../tm_admin/firestore.rules');

const PROJECT_ID = 'talentmaster-rules-test';

// ── Vakiot ────────────────────────────────────────────────────────────────
const SEURA_A = 'fcl';
const SEURA_B = 'kpv';
const SA_UID = 'sa-uid-001';
const VP_A_UID = 'vp-fcl-001';
const VALM_A_UID = 'valm-fcl-001';
const VALM_B_UID = 'valm-kpv-001';
const ANON_UID = 'anon-pin-001';
const HUOLTAJA_UID = 'huoltaja-001';
const PELAAJA_UID = 'pelaaja-001';
const PELAAJA_B_UID = 'pelaaja-kpv-001';
const SIHTEERI_UID = 'sihteeri-fcl-001';
const TESTI_UID = 'testi-fcl-001';
const RANDOM_UID = 'random-user-001';

let testEnv;

// ── Setup / Teardown ──────────────────────────────────────────────────────

beforeAll(async () => {
  testEnv = await initializeTestEnvironment({
    projectId: PROJECT_ID,
    firestore: {
      rules: readFileSync(RULES_PATH, 'utf8'),
      host: '127.0.0.1',
      port: 8080,
    },
  });
});

afterAll(async () => {
  if (testEnv) await testEnv.cleanup();
});

beforeEach(async () => {
  await testEnv.clearFirestore();
});

// ── Helper: seed data ─────────────────────────────────────────────────────

async function seedAdminDoc() {
  // SA:n admins-dokumentti (onSuperAdmin exists-tarkistus)
  await testEnv.withSecurityRulesDisabled(async (context) => {
    const db = context.firestore();
    await setDoc(doc(db, 'admins', SA_UID), { email: 'sa@test.fi', rooli: 'super_admin', luotu: new Date().toISOString() });
  });
}

async function seedSeuraAndPelaaja() {
  await testEnv.withSecurityRulesDisabled(async (context) => {
    const db = context.firestore();
    // Seurat
    await setDoc(doc(db, 'seurat', SEURA_A), { nimi: 'FC Lahti', aktiivinen: true });
    await setDoc(doc(db, 'seurat', SEURA_B), { nimi: 'KPV', aktiivinen: true });
    // Pelaaja seura A:ssa — huoltajaEmail matchaa
    await setDoc(doc(db, 'seurat', SEURA_A, 'pelaajat', PELAAJA_UID), {
      etunimi: 'Testi', sukunimi: 'Pelaaja', syntymaVuosi: 2014,
      joukkue: 'FCL U12', huoltajaEmail: 'Huoltaja@Test.fi',
      pin: '1234', sukupuoli: 'M',
    });
    // Pelaaja seura B:ssä
    await setDoc(doc(db, 'seurat', SEURA_B, 'pelaajat', PELAAJA_B_UID), {
      etunimi: 'Toinen', sukunimi: 'Pelaaja', syntymaVuosi: 2013,
      joukkue: 'KPV U13', huoltajaEmail: 'other@test.fi',
      pin: '5678', sukupuoli: 'M',
    });
  });
}

async function seedHavainto() {
  await testEnv.withSecurityRulesDisabled(async (context) => {
    const db = context.firestore();
    await setDoc(doc(db, 'seurat', SEURA_A, 'pelaajat', PELAAJA_UID, 'havainnot', 'hav1'), {
      tyyppi: 'adar', tila: 'valmis', pelaaja_lukenut: false,
      valmentajaUid: VALM_A_UID, narratiivi: 'Hyvä liike',
    });
  });
}

async function seedKehu() {
  await testEnv.withSecurityRulesDisabled(async (context) => {
    const db = context.firestore();
    await setDoc(doc(db, 'seurat', SEURA_A, 'pelaajat', PELAAJA_UID, 'kehut', 'kehu1'), {
      emoji: '💪', teksti: 'Hyvä peli!', lahettaja: 'Vanhempi',
      luotu: new Date().toISOString(), nahty: false,
    });
  });
}

async function seedViesti() {
  await testEnv.withSecurityRulesDisabled(async (context) => {
    const db = context.firestore();
    await setDoc(doc(db, 'seurat', SEURA_A, 'viestit', 'viesti1'), {
      lahettajaUid: VP_A_UID, vastaanottajaUid: VALM_A_UID,
      teksti: 'Huomenta', aika: new Date(), luettu: false,
      fromRole: 'vp',
    });
  });
}

// ── Token builders ────────────────────────────────────────────────────────

function saContext() {
  return testEnv.authenticatedContext(SA_UID, {
    rooli: 'super_admin',
  });
}

function vpContext(seuraId) {
  return testEnv.authenticatedContext(VP_A_UID, {
    rooli: 'vp', seuraId,
  });
}

function valmentajaContext(uid, seuraId) {
  return testEnv.authenticatedContext(uid, {
    rooli: 'valmentaja', seuraId,
  });
}

function talenttivalmentajaContext(uid, seuraId) {
  return testEnv.authenticatedContext(uid, {
    rooli: 'talenttivalmentaja', seuraId,
  });
}

function sihteeriContext(seuraId) {
  return testEnv.authenticatedContext(SIHTEERI_UID, {
    rooli: 'seurasihteeri', seuraId,
  });
}

function testivastaavaContext(seuraId) {
  return testEnv.authenticatedContext(TESTI_UID, {
    rooli: 'testivastaava', seuraId,
  });
}

function anonContext() {
  return testEnv.authenticatedContext(ANON_UID, {
    firebase: { sign_in_provider: 'anonymous' },
  });
}

function huoltajaContext() {
  return testEnv.authenticatedContext(HUOLTAJA_UID, {
    email: 'huoltaja@test.fi',  // lowercase — Rules vertaa .lower()
  });
}

function randomContext() {
  return testEnv.authenticatedContext(RANDOM_UID, {
    rooli: 'valmentaja', seuraId: 'random-seura',
  });
}

function unauthContext() {
  return testEnv.unauthenticatedContext();
}

// ═══════════════════════════════════════════════════════════════════════════
// 1. SUPER ADMIN
// ═══════════════════════════════════════════════════════════════════════════

describe('Super Admin', () => {
  beforeEach(async () => {
    await seedAdminDoc();
    await seedSeuraAndPelaaja();
  });

  it('SA (admins/{uid} exists) lukee minkä tahansa seuran', async () => {
    // SA ilman token.rooli — pelkkä admins-dokumentti riittää
    const ctx = testEnv.authenticatedContext(SA_UID, {});
    const db = ctx.firestore();
    await assertSucceeds(getDoc(doc(db, 'seurat', SEURA_A)));
    await assertSucceeds(getDoc(doc(db, 'seurat', SEURA_B)));
  });

  it('SA (token.rooli=super_admin) lukee minkä tahansa seuran', async () => {
    const db = saContext().firestore();
    await assertSucceeds(getDoc(doc(db, 'seurat', SEURA_A)));
    await assertSucceeds(getDoc(doc(db, 'seurat', SEURA_B)));
  });

  it('SA (legacy rooli=superadmin) lukee seuran', async () => {
    const ctx = testEnv.authenticatedContext('legacy-sa', { rooli: 'superadmin' });
    const db = ctx.firestore();
    await assertSucceeds(getDoc(doc(db, 'seurat', SEURA_A)));
  });

  it('SA kirjoittaa admins-kokoelmaan', async () => {
    const db = saContext().firestore();
    await assertSucceeds(setDoc(doc(db, 'admins', 'new-admin'), { email: 'new@test.fi' }));
  });

  it('SA lukee + kirjoittaa pelaajaan minkä tahansa seuran', async () => {
    const db = saContext().firestore();
    await assertSucceeds(getDoc(doc(db, 'seurat', SEURA_B, 'pelaajat', PELAAJA_B_UID)));
    await assertSucceeds(updateDoc(doc(db, 'seurat', SEURA_B, 'pelaajat', PELAAJA_B_UID), { flei_viimeisin: 55 }));
  });

  it('SA poistaa pelaajan', async () => {
    const db = saContext().firestore();
    await assertSucceeds(deleteDoc(doc(db, 'seurat', SEURA_A, 'pelaajat', PELAAJA_UID)));
  });
});

// ═══════════════════════════════════════════════════════════════════════════
// 2. TENANT ISOLATION — kriittisin invariantti
// ═══════════════════════════════════════════════════════════════════════════

describe('Tenant isolation', () => {
  beforeEach(async () => {
    await seedAdminDoc();
    await seedSeuraAndPelaaja();
  });

  it('VP seura A EI lue seura B:n seuradokumenttia', async () => {
    const db = vpContext(SEURA_A).firestore();
    await assertSucceeds(getDoc(doc(db, 'seurat', SEURA_A)));
    await assertFails(getDoc(doc(db, 'seurat', SEURA_B)));
  });

  it('VP seura A EI lue seura B:n pelaajia', async () => {
    const db = vpContext(SEURA_A).firestore();
    await assertFails(getDoc(doc(db, 'seurat', SEURA_B, 'pelaajat', PELAAJA_B_UID)));
  });

  it('Valmentaja seura A EI kirjoita seura B:n pelaajaan', async () => {
    const db = valmentajaContext(VALM_A_UID, SEURA_A).firestore();
    await assertFails(updateDoc(doc(db, 'seurat', SEURA_B, 'pelaajat', PELAAJA_B_UID), { flei: 50 }));
  });

  it('Valmentaja seura B EI kirjoita seura A:n havaintoa', async () => {
    await seedHavainto();
    const db = valmentajaContext(VALM_B_UID, SEURA_B).firestore();
    await assertFails(setDoc(
      doc(db, 'seurat', SEURA_A, 'pelaajat', PELAAJA_UID, 'havainnot', 'hav-inject'),
      { tyyppi: 'adar', tila: 'valmis', narratiivi: 'injektoitu' }
    ));
  });

  it('Kirjautumaton ei lue mitään', async () => {
    const db = unauthContext().firestore();
    await assertFails(getDoc(doc(db, 'seurat', SEURA_A)));
    await assertFails(getDoc(doc(db, 'admins', SA_UID)));
  });

  it('Muu seura ei lue testitapahtumia', async () => {
    // Lisää testitapahtuma seura A:lle
    await testEnv.withSecurityRulesDisabled(async (ctx) => {
      const db = ctx.firestore();
      await setDoc(doc(db, 'seurat', SEURA_A, 'testitapahtumat', 'tt1'), {
        nimi: 'Syyskoe', protokolla: 'hh_laaja',
      });
    });
    const db = valmentajaContext(VALM_B_UID, SEURA_B).firestore();
    await assertFails(getDoc(doc(db, 'seurat', SEURA_A, 'testitapahtumat', 'tt1')));
  });
});

// ═══════════════════════════════════════════════════════════════════════════
// 3. ANONYMOUS PIN — pelaajan lukuoikeus
// ═══════════════════════════════════════════════════════════════════════════

describe('Anonymous PIN (pelaaja)', () => {
  beforeEach(async () => {
    await seedSeuraAndPelaaja();
    await seedHavainto();
    await seedKehu();
  });

  it('Anon lukee pelaajat (PIN-haku)', async () => {
    const db = anonContext().firestore();
    await assertSucceeds(getDoc(doc(db, 'seurat', SEURA_A, 'pelaajat', PELAAJA_UID)));
  });

  it('Anon lukee havainnot', async () => {
    const db = anonContext().firestore();
    await assertSucceeds(getDoc(doc(db, 'seurat', SEURA_A, 'pelaajat', PELAAJA_UID, 'havainnot', 'hav1')));
  });

  it('Anon lukee kehut', async () => {
    const db = anonContext().firestore();
    await assertSucceeds(getDoc(doc(db, 'seurat', SEURA_A, 'pelaajat', PELAAJA_UID, 'kehut', 'kehu1')));
  });

  it('Anon päivittää pelaaja_lukenut havaintoon', async () => {
    const db = anonContext().firestore();
    await assertSucceeds(updateDoc(
      doc(db, 'seurat', SEURA_A, 'pelaajat', PELAAJA_UID, 'havainnot', 'hav1'),
      { pelaaja_lukenut: true }
    ));
  });

  it('Anon kuittaa kehun nahty-kentän', async () => {
    const db = anonContext().firestore();
    await assertSucceeds(updateDoc(
      doc(db, 'seurat', SEURA_A, 'pelaajat', PELAAJA_UID, 'kehut', 'kehu1'),
      { nahty: true, nahtyKlo: new Date().toISOString() }
    ));
  });

  it('Anon EI muokkaa kehun muita kenttiä', async () => {
    const db = anonContext().firestore();
    await assertFails(updateDoc(
      doc(db, 'seurat', SEURA_A, 'pelaajat', PELAAJA_UID, 'kehut', 'kehu1'),
      { teksti: 'hakkeroitu' }
    ));
  });

  it('Anon luo kirjauksen (pelaajan oma kirjaus)', async () => {
    const db = anonContext().firestore();
    await assertSucceeds(setDoc(
      doc(db, 'seurat', SEURA_A, 'pelaajat', PELAAJA_UID, 'kirjaukset', '2026-06-07'),
      { tyyppi: 'T', tehty: true, kesto_min: 30, fiilinki: 4, rpe: 6, lahde: 'pelaaja', luotu: new Date() }
    ));
  });

  it('Anon päivittää xp/streak pelaajadokumentissa (rajattu affectedKeys)', async () => {
    const db = anonContext().firestore();
    await assertSucceeds(updateDoc(
      doc(db, 'seurat', SEURA_A, 'pelaajat', PELAAJA_UID),
      { xp: 150, streak: 3, streak_paivitetty: new Date().toISOString() }
    ));
  });

  it('Anon päivittää d3-itsearvion pikakentät (§C D3, rajattu affectedKeys)', async () => {
    const db = anonContext().firestore();
    await assertSucceeds(updateDoc(
      doc(db, 'seurat', SEURA_A, 'pelaajat', PELAAJA_UID),
      {
        d3_viimeisin: { pisteet: { inner_drive: { pelaaja: 4, avg: 4 } }, pvm: '2026-06-15', lahteet: ['pelaaja'] },
        d3_taso: 4,
        d3_pvm: '2026-06-15',
        d3_varmuus: 'itsearvio'
      }
    ));
  });

  it('Anon EI päivitä d3:n ohella muuta kenttää', async () => {
    const db = anonContext().firestore();
    await assertFails(updateDoc(
      doc(db, 'seurat', SEURA_A, 'pelaajat', PELAAJA_UID),
      { d3_taso: 4, hh_taso: 5 }
    ));
  });

  it('Anon EI päivitä pelaajan muita kenttiä', async () => {
    const db = anonContext().firestore();
    await assertFails(updateDoc(
      doc(db, 'seurat', SEURA_A, 'pelaajat', PELAAJA_UID),
      { etunimi: 'Hakkeri' }
    ));
  });

  it('Anon EI lue seuradokumenttia', async () => {
    const db = anonContext().firestore();
    await assertFails(getDoc(doc(db, 'seurat', SEURA_A)));
  });

  it('Anon EI luo havaintoa', async () => {
    const db = anonContext().firestore();
    await assertFails(setDoc(
      doc(db, 'seurat', SEURA_A, 'pelaajat', PELAAJA_UID, 'havainnot', 'hav-fake'),
      { tyyppi: 'adar', narratiivi: 'injektoitu' }
    ));
  });

  it('Anon EI poista havaintoa', async () => {
    const db = anonContext().firestore();
    await assertFails(deleteDoc(
      doc(db, 'seurat', SEURA_A, 'pelaajat', PELAAJA_UID, 'havainnot', 'hav1')
    ));
  });
});

// ═══════════════════════════════════════════════════════════════════════════
// 4. ROOLIPOHJAINEN KIRJOITUS
// ═══════════════════════════════════════════════════════════════════════════

describe('Roolipohjainen kirjoitus', () => {
  beforeEach(async () => {
    await seedAdminDoc();
    await seedSeuraAndPelaaja();
  });

  // VP (johtorooli) — laaja kirjoitusoikeus
  it('VP kirjoittaa seuradokumentin', async () => {
    const db = vpContext(SEURA_A).firestore();
    await assertSucceeds(updateDoc(doc(db, 'seurat', SEURA_A), { nimi: 'FC Lahti Juniorit' }));
  });

  it('VP luo joukkueen', async () => {
    const db = vpContext(SEURA_A).firestore();
    await assertSucceeds(setDoc(doc(db, 'seurat', SEURA_A, 'joukkueet', 'u14'), { nimi: 'FCL U14' }));
  });

  // Valmentaja — pelaajadata, mutta ei seurahallinto
  it('Valmentaja lukee pelaajan', async () => {
    const db = valmentajaContext(VALM_A_UID, SEURA_A).firestore();
    await assertSucceeds(getDoc(doc(db, 'seurat', SEURA_A, 'pelaajat', PELAAJA_UID)));
  });

  it('Valmentaja luo havainnon', async () => {
    const db = valmentajaContext(VALM_A_UID, SEURA_A).firestore();
    await assertSucceeds(setDoc(
      doc(db, 'seurat', SEURA_A, 'pelaajat', PELAAJA_UID, 'havainnot', 'new-hav'),
      { tyyppi: 'adar', tila: 'luonnos', narratiivi: 'Näppärä tekniikka', luotu: new Date() }
    ));
  });

  it('Valmentaja EI kirjoita seuradokumenttia', async () => {
    const db = valmentajaContext(VALM_A_UID, SEURA_A).firestore();
    await assertFails(updateDoc(doc(db, 'seurat', SEURA_A), { nimi: 'Hakkeroitu' }));
  });

  it('Valmentaja EI poista pelaajaa', async () => {
    const db = valmentajaContext(VALM_A_UID, SEURA_A).firestore();
    await assertFails(deleteDoc(doc(db, 'seurat', SEURA_A, 'pelaajat', PELAAJA_UID)));
  });

  // Seurasihteeri — johtorooli lukuun, mutta EI valmennusdata-kirjoitusta
  it('Seurasihteeri lukee pelaajan', async () => {
    const db = sihteeriContext(SEURA_A).firestore();
    await assertSucceeds(getDoc(doc(db, 'seurat', SEURA_A, 'pelaajat', PELAAJA_UID)));
  });

  it('Seurasihteeri EI luo havaintoa (valmennusdata)', async () => {
    const db = sihteeriContext(SEURA_A).firestore();
    await assertFails(setDoc(
      doc(db, 'seurat', SEURA_A, 'pelaajat', PELAAJA_UID, 'havainnot', 'sih-hav'),
      { tyyppi: 'adar', narratiivi: 'Ei pitäisi onnistua', luotu: new Date() }
    ));
  });

  it('Seurasihteeri luo joukkueen (johtorooli)', async () => {
    const db = sihteeriContext(SEURA_A).firestore();
    await assertSucceeds(setDoc(doc(db, 'seurat', SEURA_A, 'joukkueet', 'u15'), { nimi: 'FCL U15' }));
  });

  // Testivastaava — vain testitapahtumat + testitulokset + pelaaja-update
  it('Testivastaava luo testitapahtuman', async () => {
    const db = testivastaavaContext(SEURA_A).firestore();
    await assertSucceeds(setDoc(
      doc(db, 'seurat', SEURA_A, 'testitapahtumat', 'tt-new'),
      { nimi: 'Kevättesti', protokolla: 'hh_laaja' }
    ));
  });

  it('Testivastaava päivittää pelaajan pikakenttiä', async () => {
    const db = testivastaavaContext(SEURA_A).firestore();
    await assertSucceeds(updateDoc(
      doc(db, 'seurat', SEURA_A, 'pelaajat', PELAAJA_UID),
      { hh_taso: 3, hh_viimeisin: { lin30m: 4.82, cmj: 28, mas: 14.2 } }
    ));
  });

  it('Testivastaava EI luo havaintoa', async () => {
    const db = testivastaavaContext(SEURA_A).firestore();
    await assertFails(setDoc(
      doc(db, 'seurat', SEURA_A, 'pelaajat', PELAAJA_UID, 'havainnot', 'tv-hav'),
      { tyyppi: 'adar', narratiivi: 'Ei saa', luotu: new Date() }
    ));
  });

  it('Testivastaava luo testituloksen', async () => {
    // Tarvitsee ensin testitapahtuman
    await testEnv.withSecurityRulesDisabled(async (ctx) => {
      const db = ctx.firestore();
      await setDoc(doc(db, 'seurat', SEURA_A, 'testitapahtumat', 'tt1'), { nimi: 'Koe' });
    });
    const db = testivastaavaContext(SEURA_A).firestore();
    await assertSucceeds(setDoc(
      doc(db, 'seurat', SEURA_A, 'testitapahtumat', 'tt1', 'tulokset', PELAAJA_UID),
      { testit: { lin_30m: 4.92 }, kausi: '2026-kevat' }
    ));
  });

  it('Testivastaava luo historiapohja-testituloksen', async () => {
    const db = testivastaavaContext(SEURA_A).firestore();
    await assertSucceeds(setDoc(
      doc(db, 'seurat', SEURA_A, 'pelaajat', PELAAJA_UID, 'testitulokset', '2026-05-13_hh_laaja'),
      { testit: { lin_30m: 4.92 }, lahde: 'historiapohja' }
    ));
  });
});

// ═══════════════════════════════════════════════════════════════════════════
// 5. HUOLTAJA — lukee lapsen datan huoltajaEmail-matchilla
// ═══════════════════════════════════════════════════════════════════════════

describe('Huoltaja (vanhempi)', () => {
  beforeEach(async () => {
    await seedSeuraAndPelaaja();
    await seedHavainto();
    await seedKehu();
  });

  it('Huoltaja lukee oman lapsen pelaajadokumentin', async () => {
    const db = huoltajaContext().firestore();
    await assertSucceeds(getDoc(doc(db, 'seurat', SEURA_A, 'pelaajat', PELAAJA_UID)));
  });

  it('Huoltaja lukee oman lapsen havainnot', async () => {
    const db = huoltajaContext().firestore();
    await assertSucceeds(getDoc(
      doc(db, 'seurat', SEURA_A, 'pelaajat', PELAAJA_UID, 'havainnot', 'hav1')
    ));
  });

  it('Huoltaja lukee oman lapsen kehut', async () => {
    const db = huoltajaContext().firestore();
    await assertSucceeds(getDoc(
      doc(db, 'seurat', SEURA_A, 'pelaajat', PELAAJA_UID, 'kehut', 'kehu1')
    ));
  });

  it('Huoltaja luo kehun lapselle', async () => {
    const db = huoltajaContext().firestore();
    await assertSucceeds(setDoc(
      doc(db, 'seurat', SEURA_A, 'pelaajat', PELAAJA_UID, 'kehut', 'kehu-new'),
      { emoji: '⭐', teksti: 'Hienoa!', lahettaja: 'Vanhempi', luotu: new Date(), nahty: false }
    ));
  });

  it('Huoltaja EI lue toisen lapsen dataa', async () => {
    const db = huoltajaContext().firestore();
    await assertFails(getDoc(
      doc(db, 'seurat', SEURA_B, 'pelaajat', PELAAJA_B_UID)
    ));
  });

  it('Huoltaja EI luo havaintoa (valmennusdata)', async () => {
    const db = huoltajaContext().firestore();
    await assertFails(setDoc(
      doc(db, 'seurat', SEURA_A, 'pelaajat', PELAAJA_UID, 'havainnot', 'hav-huolt'),
      { tyyppi: 'adar', narratiivi: 'Vanhemman injektio', luotu: new Date() }
    ));
  });

  // U12-huoltaja kirjaa lapselle (PÄÄTÖS 2)
  it('Huoltaja kirjaa U12-lapselle kun lahde=vanhempi', async () => {
    const db = huoltajaContext().firestore();
    await assertSucceeds(setDoc(
      doc(db, 'seurat', SEURA_A, 'pelaajat', PELAAJA_UID, 'kirjaukset', '2026-06-07'),
      { tyyppi: 'T', tehty: true, kesto_min: 20, lahde: 'vanhempi', luotu: new Date() }
    ));
  });

  it('Huoltaja EI kirjaa U12-lapselle kun lahde != vanhempi', async () => {
    const db = huoltajaContext().firestore();
    await assertFails(setDoc(
      doc(db, 'seurat', SEURA_A, 'pelaajat', PELAAJA_UID, 'kirjaukset', '2026-06-07'),
      { tyyppi: 'T', tehty: true, kesto_min: 20, lahde: 'valmentaja', luotu: new Date() }
    ));
  });
});

// ═══════════════════════════════════════════════════════════════════════════
// 6. VIESTIT — lähettäjä/vastaanottaja-isolaatio
// ═══════════════════════════════════════════════════════════════════════════

describe('Viestit', () => {
  beforeEach(async () => {
    await seedSeuraAndPelaaja();
    await seedViesti();
  });

  it('Vastaanottaja (valmentaja) lukee viestin', async () => {
    const db = valmentajaContext(VALM_A_UID, SEURA_A).firestore();
    await assertSucceeds(getDoc(doc(db, 'seurat', SEURA_A, 'viestit', 'viesti1')));
  });

  it('Lähettäjä (VP) lukee viestin', async () => {
    const db = vpContext(SEURA_A).firestore();
    await assertSucceeds(getDoc(doc(db, 'seurat', SEURA_A, 'viestit', 'viesti1')));
  });

  it('Muu valmentaja samasta seurasta EI lue viestiä (ei johtorooli)', async () => {
    const otherValm = testEnv.authenticatedContext('valm-other', {
      rooli: 'valmentaja', seuraId: SEURA_A,
    });
    const db = otherValm.firestore();
    await assertFails(getDoc(doc(db, 'seurat', SEURA_A, 'viestit', 'viesti1')));
  });

  it('VP luo viestin omalla lahettajaUid:lla', async () => {
    const db = vpContext(SEURA_A).firestore();
    await assertSucceeds(setDoc(
      doc(db, 'seurat', SEURA_A, 'viestit', 'viesti-new'),
      { lahettajaUid: VP_A_UID, vastaanottajaUid: VALM_A_UID, teksti: 'Uusi', aika: new Date(), luettu: false }
    ));
  });

  it('A5-jälki: VP EI luo viestiä ISO-string-aika:lla (vartija)', async () => {
    const db = vpContext(SEURA_A).firestore();
    await assertFails(setDoc(
      doc(db, 'seurat', SEURA_A, 'viestit', 'aika-iso'),
      { lahettajaUid: VP_A_UID, vastaanottajaUid: VALM_A_UID, teksti: 'x', aika: new Date().toISOString(), luettu: false }
    ));
  });

  it('A5-jälki: VP luo viestin Timestamp-aika:lla', async () => {
    const db = vpContext(SEURA_A).firestore();
    await assertSucceeds(setDoc(
      doc(db, 'seurat', SEURA_A, 'viestit', 'aika-ts'),
      { lahettajaUid: VP_A_UID, vastaanottajaUid: VALM_A_UID, teksti: 'x', aika: new Date(), luettu: false }
    ));
  });

  it('EI luo viestiä toisen nimiin (lahettajaUid != uid)', async () => {
    const db = vpContext(SEURA_A).firestore();
    await assertFails(setDoc(
      doc(db, 'seurat', SEURA_A, 'viestit', 'viesti-spoof'),
      { lahettajaUid: 'someone-else', vastaanottajaUid: VALM_A_UID, teksti: 'Huijaus', aika: new Date() }
    ));
  });

  it('Vastaanottaja päivittää viestin (luettu-merkintä)', async () => {
    const db = valmentajaContext(VALM_A_UID, SEURA_A).firestore();
    await assertSucceeds(updateDoc(
      doc(db, 'seurat', SEURA_A, 'viestit', 'viesti1'),
      { luettu: true }
    ));
  });

  it('Lähettäjä EI päivitä viestiä (vain vastaanottaja)', async () => {
    const db = vpContext(SEURA_A).firestore();
    await assertFails(updateDoc(
      doc(db, 'seurat', SEURA_A, 'viestit', 'viesti1'),
      { luettu: true }
    ));
  });

  it('Vain SA poistaa viestin', async () => {
    await seedAdminDoc();
    const vpDb = vpContext(SEURA_A).firestore();
    await assertFails(deleteDoc(doc(vpDb, 'seurat', SEURA_A, 'viestit', 'viesti1')));

    const saDb = saContext().firestore();
    await assertSucceeds(deleteDoc(doc(saDb, 'seurat', SEURA_A, 'viestit', 'viesti1')));
  });
});

// ═══════════════════════════════════════════════════════════════════════════
// 7. KEHUT — perheen yksityisyys
// ═══════════════════════════════════════════════════════════════════════════

describe('Kehut — perheen yksityisyys', () => {
  beforeEach(async () => {
    await seedSeuraAndPelaaja();
    await seedKehu();
  });

  it('Valmentaja EI lue kehuja (pedagoginen suoja)', async () => {
    const db = valmentajaContext(VALM_A_UID, SEURA_A).firestore();
    await assertFails(getDoc(
      doc(db, 'seurat', SEURA_A, 'pelaajat', PELAAJA_UID, 'kehut', 'kehu1')
    ));
  });

  it('VP EI lue kehuja', async () => {
    const db = vpContext(SEURA_A).firestore();
    await assertFails(getDoc(
      doc(db, 'seurat', SEURA_A, 'pelaajat', PELAAJA_UID, 'kehut', 'kehu1')
    ));
  });

  it('SA lukee kehun', async () => {
    await seedAdminDoc();
    const db = saContext().firestore();
    await assertSucceeds(getDoc(
      doc(db, 'seurat', SEURA_A, 'pelaajat', PELAAJA_UID, 'kehut', 'kehu1')
    ));
  });
});

// ═══════════════════════════════════════════════════════════════════════════
// 8. KALENTERI — field-level update rajoitus valmentajalle (v3.4)
// ═══════════════════════════════════════════════════════════════════════════

describe('Kalenteri (v3.5 — omistajuus + läsnäolo)', () => {
  // kal1 = MUIDEN tapahtuma (ei luoja_uid:tä VALM_A:lle) · kal_own = VALM_A:n OMA tapahtuma
  beforeEach(async () => {
    await seedSeuraAndPelaaja();
    await testEnv.withSecurityRulesDisabled(async (ctx) => {
      const db = ctx.firestore();
      await setDoc(doc(db, 'seurat', SEURA_A, 'kalenteri', 'kal1'), {
        tyyppi: 'testi', nimi: 'Syyskoe', pvm: '2026-09-15',
        joukkue: 'FCL U12', muistiinpanot: '', tila: 'suunniteltu', poistettu: false,
      });
      await setDoc(doc(db, 'seurat', SEURA_A, 'kalenteri', 'kal_own'), {
        tyyppi: 'harjoitus', nimi: 'Oma treeni', pvm: '2026-09-16',
        joukkue: 'FCL U12', muistiinpanot: '', tila: 'suunniteltu', poistettu: false,
        luoja_uid: VALM_A_UID,
      });
    });
  });

  // ── Field-level MUIDEN tapahtumaan ──
  it('Valmentaja päivittää muistiinpanot muiden tapahtumaan (field-level, sallittu)', async () => {
    const db = valmentajaContext(VALM_A_UID, SEURA_A).firestore();
    await assertSucceeds(updateDoc(
      doc(db, 'seurat', SEURA_A, 'kalenteri', 'kal1'),
      { muistiinpanot: 'Hyvin meni', paivitetty: new Date().toISOString(), muokkaaja_uid: VALM_A_UID }
    ));
  });

  it('Valmentaja päivittää läsnäolo-koosteen muiden tapahtumaan (field-level, sallittu)', async () => {
    const db = valmentajaContext(VALM_A_UID, SEURA_A).firestore();
    await assertSucceeds(updateDoc(
      doc(db, 'seurat', SEURA_A, 'kalenteri', 'kal1'),
      { lasnaolo_kooste: { paikalla: 8, myohassa: 1, poissa: 2 }, paivitetty: new Date().toISOString(), muokkaaja_uid: VALM_A_UID }
    ));
  });

  it('Valmentaja kirjaa session-RPE:n muiden tapahtumaan (field-level v3.6, sallittu)', async () => {
    const db = valmentajaContext(VALM_A_UID, SEURA_A).firestore();
    await assertSucceeds(updateDoc(
      doc(db, 'seurat', SEURA_A, 'kalenteri', 'kal1'),
      { valmentaja_rpe: 7, valmentaja_rpe_pvm: new Date().toISOString(), paivitetty: new Date().toISOString(), muokkaaja_uid: VALM_A_UID }
    ));
  });

  it('Valmentaja EI päivitä muiden tapahtuman nimeä (kielletty kenttä)', async () => {
    const db = valmentajaContext(VALM_A_UID, SEURA_A).firestore();
    await assertFails(updateDoc(
      doc(db, 'seurat', SEURA_A, 'kalenteri', 'kal1'),
      { nimi: 'Muutettu nimi' }
    ));
  });

  it('Valmentaja EI soft-deletoi MUIDEN tapahtumaa', async () => {
    const db = valmentajaContext(VALM_A_UID, SEURA_A).firestore();
    await assertFails(updateDoc(
      doc(db, 'seurat', SEURA_A, 'kalenteri', 'kal1'),
      { poistettu: true, poistettu_uid: VALM_A_UID, poistettu_pvm: new Date().toISOString() }
    ));
  });

  // ── Täysi muokkaus OMAAN tapahtumaan ──
  it('Valmentaja muokkaa OMAN tapahtuman nimen + ajan (täysi, sallittu)', async () => {
    const db = valmentajaContext(VALM_A_UID, SEURA_A).firestore();
    await assertSucceeds(updateDoc(
      doc(db, 'seurat', SEURA_A, 'kalenteri', 'kal_own'),
      { nimi: 'Päivitetty treeni', alkaa: '18:00', paikka: 'Halli 2' }
    ));
  });

  it('Valmentaja soft-deletoi OMAN tapahtuman (poistettu=true)', async () => {
    const db = valmentajaContext(VALM_A_UID, SEURA_A).firestore();
    await assertSucceeds(updateDoc(
      doc(db, 'seurat', SEURA_A, 'kalenteri', 'kal_own'),
      { poistettu: true, poistettu_uid: VALM_A_UID, poistettu_pvm: new Date().toISOString() }
    ));
  });

  it('Toinen valmentaja EI muokkaa muiden tapahtuman nimeä (vain field-level)', async () => {
    const db = valmentajaContext('valm-fcl-002', SEURA_A).firestore();
    await assertFails(updateDoc(
      doc(db, 'seurat', SEURA_A, 'kalenteri', 'kal_own'),
      { nimi: 'Kaapattu' }
    ));
  });

  // ── Johto ──
  it('VP päivittää minkä tahansa kentän', async () => {
    const db = vpContext(SEURA_A).firestore();
    await assertSucceeds(updateDoc(
      doc(db, 'seurat', SEURA_A, 'kalenteri', 'kal1'),
      { nimi: 'Uusi nimi', joukkue: 'FCL U13' }
    ));
  });

  // ── Luonti (luoja_uid pakollinen valmentajalta) ──
  it('Valmentaja luo tapahtuman luoja_uid == oma uid (sallittu)', async () => {
    const db = valmentajaContext(VALM_A_UID, SEURA_A).firestore();
    await assertSucceeds(setDoc(
      doc(db, 'seurat', SEURA_A, 'kalenteri', 'kal-new'),
      { tyyppi: 'harjoitus', nimi: 'Aamu', pvm: '2026-09-16', luoja_uid: VALM_A_UID, poistettu: false }
    ));
  });

  it('Valmentaja EI luo tapahtumaa toisen luoja_uid:llä', async () => {
    const db = valmentajaContext(VALM_A_UID, SEURA_A).firestore();
    await assertFails(setDoc(
      doc(db, 'seurat', SEURA_A, 'kalenteri', 'kal-bad'),
      { tyyppi: 'harjoitus', nimi: 'Väärä', pvm: '2026-09-16', luoja_uid: 'joku-muu' }
    ));
  });

  it('Talenttivalmentaja luo talenttileirin (luoja_uid == oma uid)', async () => {
    const db = talenttivalmentajaContext('talentti-fcl-001', SEURA_A).firestore();
    await assertSucceeds(setDoc(
      doc(db, 'seurat', SEURA_A, 'kalenteri', 'kal-tal'),
      { tyyppi: 'talenttileiri', nimi: 'Talenttitreeni', pvm: '2026-09-20', luoja_uid: 'talentti-fcl-001', poistettu: false }
    ));
  });

  it('Valmentaja EI hard-deletoi tapahtumaa', async () => {
    const db = valmentajaContext(VALM_A_UID, SEURA_A).firestore();
    await assertFails(deleteDoc(doc(db, 'seurat', SEURA_A, 'kalenteri', 'kal1')));
  });

  // ── Läsnäolijat ──
  it('Valmentaja merkitsee pelaajan läsnäolon (osallistujaId = pelaaja)', async () => {
    const db = valmentajaContext(VALM_A_UID, SEURA_A).firestore();
    await assertSucceeds(setDoc(
      doc(db, 'seurat', SEURA_A, 'kalenteri', 'kal1', 'lasnaolijat', PELAAJA_UID),
      { tila: 'paikalla', merkitsija_uid: VALM_A_UID, merkitty: new Date().toISOString() }
    ));
  });

  it('Toisen seuran valmentaja EI merkitse läsnäoloa', async () => {
    const db = valmentajaContext(VALM_B_UID, 'kpv').firestore();
    await assertFails(setDoc(
      doc(db, 'seurat', SEURA_A, 'kalenteri', 'kal1', 'lasnaolijat', PELAAJA_UID),
      { tila: 'paikalla', merkitsija_uid: VALM_B_UID }
    ));
  });
});

// ═══════════════════════════════════════════════════════════════════════════
// 9. SUOSTUMUKSET — julkinen lomake
// ═══════════════════════════════════════════════════════════════════════════

describe('Suostumukset', () => {
  it('Kuka tahansa luo suostumuksen (julkinen lomake)', async () => {
    const db = unauthContext().firestore();
    await assertSucceeds(setDoc(
      doc(db, 'suostumukset', 'suost-1'),
      { suostumusTila: 'odottaa', seuraId: SEURA_A }
    ));
  });

  it('Kirjautumaton EI lue toisen suostumusta (ei odottaa-tilassa)', async () => {
    await testEnv.withSecurityRulesDisabled(async (ctx) => {
      const db = ctx.firestore();
      await setDoc(doc(db, 'suostumukset', 'suost-valmis'), { suostumusTila: 'annettu' });
    });
    const db = unauthContext().firestore();
    await assertFails(getDoc(doc(db, 'suostumukset', 'suost-valmis')));
  });
});

// ═══════════════════════════════════════════════════════════════════════════
// 10. IDP-JONO — valmentajan oma ehdotus muokattavissa vain oikeassa tilassa
// ═══════════════════════════════════════════════════════════════════════════

describe('IDP-jono', () => {
  beforeEach(async () => {
    await seedSeuraAndPelaaja();
    await testEnv.withSecurityRulesDisabled(async (ctx) => {
      const db = ctx.firestore();
      await setDoc(doc(db, 'seurat', SEURA_A, 'idp_jono', 'idp1'), {
        tila: 'ehdotettu', valmentajaUid: VALM_A_UID,
        pelaajaId: PELAAJA_UID, ehdotus: 'Painopiste nopeus',
      });
      await setDoc(doc(db, 'seurat', SEURA_A, 'idp_jono', 'idp-approved'), {
        tila: 'hyvaksytty', valmentajaUid: VALM_A_UID,
        pelaajaId: PELAAJA_UID, ehdotus: 'Hyväksytty',
      });
    });
  });

  it('Valmentaja muokkaa omaa ehdotustaan (tila=ehdotettu)', async () => {
    const db = valmentajaContext(VALM_A_UID, SEURA_A).firestore();
    await assertSucceeds(updateDoc(
      doc(db, 'seurat', SEURA_A, 'idp_jono', 'idp1'),
      { ehdotus: 'Päivitetty painopiste' }
    ));
  });

  it('Valmentaja EI muokkaa hyväksyttyä ehdotusta', async () => {
    const db = valmentajaContext(VALM_A_UID, SEURA_A).firestore();
    await assertFails(updateDoc(
      doc(db, 'seurat', SEURA_A, 'idp_jono', 'idp-approved'),
      { ehdotus: 'Muutettu' }
    ));
  });

  it('Toinen valmentaja EI muokkaa toisen ehdotusta', async () => {
    const other = testEnv.authenticatedContext('valm-other', { rooli: 'valmentaja', seuraId: SEURA_A });
    const db = other.firestore();
    await assertFails(updateDoc(
      doc(db, 'seurat', SEURA_A, 'idp_jono', 'idp1'),
      { ehdotus: 'Vaihdettu' }
    ));
  });

  it('VP muokkaa minkä tahansa IDP-ehdotuksen', async () => {
    const db = vpContext(SEURA_A).firestore();
    await assertSucceeds(updateDoc(
      doc(db, 'seurat', SEURA_A, 'idp_jono', 'idp-approved'),
      { tila: 'hyvaksytty', arvio: 'VP kommentti' }
    ));
  });
});

// ═══════════════════════════════════════════════════════════════════════════
// 11. AIKALEIMA-VARTIJA (A5) — luotu pakollinen + timestamp
//     Estää orderBy/where-näkymättömyyden: puuttuva luotu → poissuljettu,
//     ISO-string-luotu → eri tyyppiblokki kuin Timestampit.
// ═══════════════════════════════════════════════════════════════════════════

describe('Aikaleima-vartija (A5)', () => {
  beforeEach(async () => {
    await seedSeuraAndPelaaja();
  });

  it('Valmentaja EI luo havaintoa ilman luotu-kenttää', async () => {
    const db = valmentajaContext(VALM_A_UID, SEURA_A).firestore();
    await assertFails(setDoc(
      doc(db, 'seurat', SEURA_A, 'pelaajat', PELAAJA_UID, 'havainnot', 'no-luotu'),
      { tyyppi: 'adar', narratiivi: 'puuttuu luotu' }
    ));
  });

  it('Valmentaja EI luo havaintoa ISO-string-luotu:lla (bugi torjuttu)', async () => {
    const db = valmentajaContext(VALM_A_UID, SEURA_A).firestore();
    await assertFails(setDoc(
      doc(db, 'seurat', SEURA_A, 'pelaajat', PELAAJA_UID, 'havainnot', 'iso-luotu'),
      { tyyppi: 'adar', narratiivi: 'ISO-string', luotu: new Date().toISOString() }
    ));
  });

  it('Valmentaja luo havainnon Timestamp-luotu:lla', async () => {
    const db = valmentajaContext(VALM_A_UID, SEURA_A).firestore();
    await assertSucceeds(setDoc(
      doc(db, 'seurat', SEURA_A, 'pelaajat', PELAAJA_UID, 'havainnot', 'ts-luotu'),
      { tyyppi: 'adar', narratiivi: 'Timestamp', luotu: new Date() }
    ));
  });

  it('Huoltaja EI luo kehua ISO-string-luotu:lla', async () => {
    const db = huoltajaContext().firestore();
    await assertFails(setDoc(
      doc(db, 'seurat', SEURA_A, 'pelaajat', PELAAJA_UID, 'kehut', 'iso-kehu'),
      { emoji: '⭐', teksti: 'x', lahettaja: 'Vanhempi', luotu: new Date().toISOString(), nahty: false }
    ));
  });

  it('Huoltaja EI kirjaa ilman luotu-kenttää', async () => {
    const db = huoltajaContext().firestore();
    await assertFails(setDoc(
      doc(db, 'seurat', SEURA_A, 'pelaajat', PELAAJA_UID, 'kirjaukset', '2026-06-08'),
      { tyyppi: 'T', tehty: true, kesto_min: 20, lahde: 'vanhempi' }
    ));
  });

  it('Lukukuittaus (anon) toimii vaikka luotu puuttuu — affectedKeys ohittaa vartijan', async () => {
    // Regressiosuoja: update-vartija ei saa estää lukukuittausta luotu-puuttuvassa
    // (vanhassa) dokumentissa. seedHavainto luo hav1:n ILMAN luotu-kenttää.
    await seedHavainto();
    const db = anonContext().firestore();
    await assertSucceeds(updateDoc(
      doc(db, 'seurat', SEURA_A, 'pelaajat', PELAAJA_UID, 'havainnot', 'hav1'),
      { pelaaja_lukenut: true }
    ));
  });
});

// ═══════════════════════════════════════════════════════════════════════════
// P6 — ANON HAVAINNOT LISTEN (bugi-diagnoosi 2026-06-16)
// Erottaa: rikkooko havainnot read-ehdon get()-haara (onLapsenHuoltaja →
// pelaajaData()=get) LIST-kyselyn, vaikka onAnonymous() on OR:ssa sitä ENNEN?
// Vrt. pelaajat-LIST (where pin==) toimii anonyyminä — sen viimeinen OR-haara
// käyttää resource.data:aa (sallittu list:ssä), EI get():iä.
// ═══════════════════════════════════════════════════════════════════════════
describe('P6 anon havainnot LISTEN (bugi-diagnoosi)', () => {
  it('anon GET yksittäinen havainto → sallittu (baseline)', async () => {
    await seedAdminDoc(); await seedSeuraAndPelaaja(); await seedHavainto();
    const db = anonContext().firestore();
    await assertSucceeds(getDoc(
      doc(db, 'seurat', SEURA_A, 'pelaajat', PELAAJA_UID, 'havainnot', 'hav1')
    ));
  });

  it('anon LIST-query where(tila==valmis).limit(50) → RATKAISEVA (P6-bugi)', async () => {
    await seedAdminDoc(); await seedSeuraAndPelaaja(); await seedHavainto();
    const db = anonContext().firestore();
    const q = query(
      collection(db, 'seurat', SEURA_A, 'pelaajat', PELAAJA_UID, 'havainnot'),
      where('tila', '==', 'valmis'), limit(50)
    );
    // assertFails → get()-haara rikkoo LIST-kyselyn → rule-korjaus (allow get/list -jako).
    // assertSucceeds → rule OK → bugi on ajoitus/client (Pelaaja_v7 P6-listener).
    await assertSucceeds(getDocs(q));
  });
});

// ═══════════════════════════════════════════════════════════════════════════
// TAVOITTEET (IDP-tavoitteet, Vaihe 2 — docs/MDT_RAPORTTI_SPEC §0)
//   oman seuran valmentaja RW · toisen seuran ei · SA RW · anon ei · luotu A5
// ═══════════════════════════════════════════════════════════════════════════
describe('Tavoitteet (IDP, Vaihe 2)', () => {
  beforeEach(async () => {
    await seedAdminDoc();
    await seedSeuraAndPelaaja();
    // Seed yksi olemassa oleva tavoite (read/update-testeille)
    await testEnv.withSecurityRulesDisabled(async (context) => {
      const db = context.firestore();
      await setDoc(
        doc(db, 'seurat', SEURA_A, 'pelaajat', PELAAJA_UID, 'tavoitteet', 'tav-a1'),
        { teksti: '1v1-puolustaminen', tavoitepvm: '2026-08-01', tila: 'kaynnissa', valmentajaUid: VALM_A_UID, valmentajaNimi: 'Valm A', luotu: new Date() }
      );
    });
  });

  it('Oman seuran valmentaja LUO tavoitteen (create + luotu A5)', async () => {
    const db = valmentajaContext(VALM_A_UID, SEURA_A).firestore();
    await assertSucceeds(setDoc(
      doc(db, 'seurat', SEURA_A, 'pelaajat', PELAAJA_UID, 'tavoitteet', 'tav-new'),
      { teksti: 'uusi tavoite', tila: 'kaynnissa', valmentajaUid: VALM_A_UID, luotu: new Date() }
    ));
  });

  it('Oman seuran valmentaja LUKEE tavoitteen', async () => {
    const db = valmentajaContext(VALM_A_UID, SEURA_A).firestore();
    await assertSucceeds(getDoc(doc(db, 'seurat', SEURA_A, 'pelaajat', PELAAJA_UID, 'tavoitteet', 'tav-a1')));
  });

  it('Oman seuran valmentaja PÄIVITTÄÄ tilan (luotu muuttumaton, A5)', async () => {
    const db = valmentajaContext(VALM_A_UID, SEURA_A).firestore();
    await assertSucceeds(updateDoc(doc(db, 'seurat', SEURA_A, 'pelaajat', PELAAJA_UID, 'tavoitteet', 'tav-a1'), { tila: 'saavutettu' }));
  });

  it('Toisen seuran valmentaja EI luo tavoitetta seura A:han', async () => {
    const db = valmentajaContext(VALM_B_UID, SEURA_B).firestore();
    await assertFails(setDoc(
      doc(db, 'seurat', SEURA_A, 'pelaajat', PELAAJA_UID, 'tavoitteet', 'tav-x'),
      { teksti: 'ei saa', tila: 'kaynnissa', luotu: new Date() }
    ));
  });

  it('Toisen seuran valmentaja EI lue seura A:n tavoitetta', async () => {
    const db = valmentajaContext(VALM_B_UID, SEURA_B).firestore();
    await assertFails(getDoc(doc(db, 'seurat', SEURA_A, 'pelaajat', PELAAJA_UID, 'tavoitteet', 'tav-a1')));
  });

  it('SA luo + lukee tavoitteen', async () => {
    const db = saContext().firestore();
    await assertSucceeds(setDoc(
      doc(db, 'seurat', SEURA_A, 'pelaajat', PELAAJA_UID, 'tavoitteet', 'tav-sa'),
      { teksti: 'SA tavoite', tila: 'kaynnissa', luotu: new Date() }
    ));
    await assertSucceeds(getDoc(doc(db, 'seurat', SEURA_A, 'pelaajat', PELAAJA_UID, 'tavoitteet', 'tav-sa')));
  });

  it('Create ILMAN luotu-kenttää hylätään (A5)', async () => {
    const db = valmentajaContext(VALM_A_UID, SEURA_A).firestore();
    await assertFails(setDoc(
      doc(db, 'seurat', SEURA_A, 'pelaajat', PELAAJA_UID, 'tavoitteet', 'tav-noluotu'),
      { teksti: 'ei luotu-kenttää', tila: 'kaynnissa' }
    ));
  });

  it('Anonyymi EI luo eikä lue tavoitetta', async () => {
    const db = anonContext().firestore();
    await assertFails(setDoc(
      doc(db, 'seurat', SEURA_A, 'pelaajat', PELAAJA_UID, 'tavoitteet', 'tav-anon'),
      { teksti: 'anon', tila: 'kaynnissa', luotu: new Date() }
    ));
    await assertFails(getDoc(doc(db, 'seurat', SEURA_A, 'pelaajat', PELAAJA_UID, 'tavoitteet', 'tav-a1')));
  });
});
