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
import { setDoc, getDoc, doc, collection, addDoc, updateDoc, deleteDoc, query, where, limit, getDocs, serverTimestamp, runTransaction, deleteField, orderBy, documentId } from 'firebase/firestore';
import * as FS_MOD from 'firebase/firestore';
import { createRequire } from 'module';

const __dirname = dirname(fileURLToPath(import.meta.url));
const RULES_PATH = resolve(__dirname, '../../tm_admin/firestore.rules');

const PROJECT_ID = 'talentmaster-rules-test';
/* Review 1: Rules-testi rakentaa payloadin SAMALLA funktiolla kuin sovellus. Jos ne rakennetaan
   erikseen, testi voi olla vihreä samalla kun tuotanto hylkää kirjoituksen — juuri niin kävi. */
const AH = createRequire(import.meta.url)('../../lib/tm_arviointi_historia.js');

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
const PELAAJA_A2_UID = 'pelaaja-fcl-002';   // seura A, ERI joukkue kuin PELAAJA_UID (permissio-joukkulukko L2)
const JOUKKUE_A1 = 'fcl_u12';               // VALM_A_UID + PELAAJA_UID kuuluvat tähän
const JOUKKUE_A2 = 'fcl_u14';               // PELAAJA_A2_UID kuuluu tähän (muu joukkue)
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
    // Pelaaja seura A:ssa — huoltajaEmail matchaa. joukkueet[] = ID-täsmäys (§18, permissio-joukkulukko)
    await setDoc(doc(db, 'seurat', SEURA_A, 'pelaajat', PELAAJA_UID), {
      etunimi: 'Testi', sukunimi: 'Pelaaja', syntymaVuosi: 2014,
      joukkue: 'FCL U12', joukkueet: [JOUKKUE_A1], huoltajaEmail: 'Huoltaja@Test.fi',
      pin: '1234', sukupuoli: 'M',
    });
    // Pelaaja seura A:ssa mutta ERI joukkueessa (JOUKKUE_A2) — VALM_A ei saa kirjoittaa tähän
    await setDoc(doc(db, 'seurat', SEURA_A, 'pelaajat', PELAAJA_A2_UID), {
      etunimi: 'Muu', sukunimi: 'Joukkue', syntymaVuosi: 2012,
      joukkue: 'FCL U14', joukkueet: [JOUKKUE_A2], huoltajaEmail: 'muu@test.fi',
      pin: '4321', sukupuoli: 'M',
    });
    // Pelaaja seura B:ssä
    await setDoc(doc(db, 'seurat', SEURA_B, 'pelaajat', PELAAJA_B_UID), {
      etunimi: 'Toinen', sukunimi: 'Pelaaja', syntymaVuosi: 2013,
      joukkue: 'KPV U13', joukkueet: ['kpv_u13'], huoltajaEmail: 'other@test.fi',
      pin: '5678', sukupuoli: 'M',
    });
    // Valmentajien kayttaja-dokumentit — permissio-joukkulukko lukee joukkueet[]:n säännöissä
    // (valmentajanJoukkueet → get(kayttajat/{uid})). VALM_A + talval kuuluvat JOUKKUE_A1:een.
    await setDoc(doc(db, 'seurat', SEURA_A, 'kayttajat', VALM_A_UID), {
      email: 'valm@fcl.fi', rooli: 'valmentaja', seuraId: SEURA_A, joukkueet: [JOUKKUE_A1], aktiivinen: true,
    });
    await setDoc(doc(db, 'seurat', SEURA_A, 'kayttajat', 'talval-fcl-001'), {
      email: 'talval@fcl.fi', rooli: 'talenttivalmentaja', seuraId: SEURA_A, joukkueet: [JOUKKUE_A1], aktiivinen: true,
    });
    // Valmentaja B (seura B) — tenant-eristys estää jo ilman joukkuetta, mutta doc olemassa realismin vuoksi
    await setDoc(doc(db, 'seurat', SEURA_B, 'kayttajat', VALM_B_UID), {
      email: 'valm@kpv.fi', rooli: 'valmentaja', seuraId: SEURA_B, joukkueet: ['kpv_u13'], aktiivinen: true,
    });
  });
}

async function seedHavainto() {
  await testEnv.withSecurityRulesDisabled(async (context) => {
    const db = context.firestore();
    await setDoc(doc(db, 'seurat', SEURA_A, 'pelaajat', PELAAJA_UID, 'havainnot', 'hav1'), {
      tyyppi: 'adar', tila: 'valmis', pelaaja_lukenut: false,
      valmentajaUid: VALM_A_UID, narratiivi: 'Hyvä liike',
      // Rules v3.22: pelaajalle näkyvä havainto on `nakyvyys:'pelaaja'`. Vanhoille
      // havainnoille kenttä asetetaan migraatiossa (scripts/migroi_havainto_nakyvyys.js)
      // ENNEN Rules-deployta, joten tuotannossa kenttä on olemassa — fixtuuri vastaa sitä.
      // Fail-closed-puoli (kenttä puuttuu → ei lukuoikeutta) testataan erikseen
      // "Havainnon näkyvyys (v3.22)" -ryhmässä omalla seedillään.
      nakyvyys: 'pelaaja',
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

async function seedMentorointi() {
  await testEnv.withSecurityRulesDisabled(async (context) => {
    const db = context.firestore();
    // Sisäinen muistiinpano — EI jaettu valmentajalle (ei viestit-kopiota).
    await setDoc(doc(db, 'seurat', SEURA_A, 'mentoroinnit', 'ment_sisainen'), {
      coachId: VALM_A_UID, vpUid: VP_A_UID, tyyppi: 'mentorointi',
      teksti: 'Sisäinen arvio valmentajasta', nakyvyys: 'sisainen', aika: new Date(),
    });
    // Jakamaton SPL-kenttäkäynti — menee samaan kokoelmaan.
    await setDoc(doc(db, 'seurat', SEURA_A, 'mentoroinnit', 'ment_spl'), {
      coachId: VALM_A_UID, vpUid: VP_A_UID, tyyppi: 'kenttäkäynti',
      teksti: 'SPL-arviointi · ka 6.5', nakyvyys: 'sisainen', aika: new Date(),
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

function fysioterapeuttiContext(uid, seuraId) {
  return testEnv.authenticatedContext(uid, {
    rooli: 'fysioterapeutti', seuraId,
  });
}

function fysiikkavalmentajaContext(uid, seuraId) {
  return testEnv.authenticatedContext(uid, {
    rooli: 'fysiikkavalmentaja', seuraId,
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

/* v3.28: pelaajan oma istunto = palvelintoken (pelaajaKirjaudu). Korvaa entisen anonyymin
   PIN-istunnon testeissä, jotka kohdistuvat SEURA_A / PELAAJA_UID -polkuihin. */
function pelaajaItseContext() {
  return pelaajaContext(SEURA_A, PELAAJA_UID);
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

describe('Pelaaja itse (palvelintoken, v3.28)', () => {
  beforeEach(async () => {
    await seedSeuraAndPelaaja();
    await seedHavainto();
    await seedKehu();
  });

  it('Pelaaja lukee pelaajat (PIN-haku)', async () => {
    const db = pelaajaItseContext().firestore();
    await assertSucceeds(getDoc(doc(db, 'seurat', SEURA_A, 'pelaajat', PELAAJA_UID)));
  });

  it('Pelaaja lukee havainnot', async () => {
    const db = pelaajaItseContext().firestore();
    await assertSucceeds(getDoc(doc(db, 'seurat', SEURA_A, 'pelaajat', PELAAJA_UID, 'havainnot', 'hav1')));
  });

  it('Pelaaja lukee kehut', async () => {
    const db = pelaajaItseContext().firestore();
    await assertSucceeds(getDoc(doc(db, 'seurat', SEURA_A, 'pelaajat', PELAAJA_UID, 'kehut', 'kehu1')));
  });

  it('Pelaaja päivittää pelaaja_lukenut havaintoon', async () => {
    const db = pelaajaItseContext().firestore();
    await assertSucceeds(updateDoc(
      doc(db, 'seurat', SEURA_A, 'pelaajat', PELAAJA_UID, 'havainnot', 'hav1'),
      { pelaaja_lukenut: true }
    ));
  });

  it('Pelaaja kuittaa kehun nahty-kentän', async () => {
    const db = pelaajaItseContext().firestore();
    await assertSucceeds(updateDoc(
      doc(db, 'seurat', SEURA_A, 'pelaajat', PELAAJA_UID, 'kehut', 'kehu1'),
      { nahty: true, nahtyKlo: new Date().toISOString() }
    ));
  });

  it('Pelaaja EI muokkaa kehun muita kenttiä', async () => {
    const db = pelaajaItseContext().firestore();
    await assertFails(updateDoc(
      doc(db, 'seurat', SEURA_A, 'pelaajat', PELAAJA_UID, 'kehut', 'kehu1'),
      { teksti: 'hakkeroitu' }
    ));
  });

  it('Pelaaja luo kirjauksen (pelaajan oma kirjaus)', async () => {
    const db = pelaajaItseContext().firestore();
    await assertSucceeds(setDoc(
      doc(db, 'seurat', SEURA_A, 'pelaajat', PELAAJA_UID, 'kirjaukset', '2026-06-07'),
      { tyyppi: 'T', tehty: true, kesto_min: 30, fiilinki: 4, rpe: 6, lahde: 'pelaaja', luotu: new Date() }
    ));
  });

  /* LIVE-BUGI 2026-09-28: päivän ENSIMMÄINEN kirjaus oli fiilis tai kuormitus, jolloin
     `_tmKirjaa` teki createn ilman `luotu`-kenttää → hylätty. Se toimi vain, jos
     Tänään-harjoite oli jo luonut päivän dokumentin — mistä syntyi "toimii joskus".
     Nämä kaksi lukitsevat SYYN: kenttä on pakollinen, ei muu kirjauksen sisältö. */
  it('Pelaaja luo MINIMIkirjauksen (vain fiilinki) kun `luotu` on mukana', async () => {
    const db = pelaajaItseContext().firestore();
    await assertSucceeds(setDoc(
      doc(db, 'seurat', SEURA_A, 'pelaajat', PELAAJA_UID, 'kirjaukset', '2026-09-28'),
      { fiilinki: 4, lahde: 'pelaaja', paivitetty: new Date(), luotu: new Date('2026-09-28') }
    ));
  });

  it('Pelaaja EI luo minimikirjausta ilman `luotu`-kenttää (tämä oli bugin syy)', async () => {
    const db = pelaajaItseContext().firestore();
    await assertFails(setDoc(
      doc(db, 'seurat', SEURA_A, 'pelaajat', PELAAJA_UID, 'kirjaukset', '2026-09-28'),
      { fiilinki: 4, lahde: 'pelaaja', paivitetty: new Date() }
    ));
  });

  it('Pelaaja päivittää xp/streak pelaajadokumentissa (rajattu affectedKeys)', async () => {
    const db = pelaajaItseContext().firestore();
    await assertSucceeds(updateDoc(
      doc(db, 'seurat', SEURA_A, 'pelaajat', PELAAJA_UID),
      { xp: 150, streak: 3, streak_paivitetty: new Date().toISOString() }
    ));
  });

  it('Pelaaja päivittää d3-itsearvion pikakentät (§C D3, rajattu affectedKeys)', async () => {
    const db = pelaajaItseContext().firestore();
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

  it('Pelaaja EI päivitä d3:n ohella muuta kenttää', async () => {
    const db = pelaajaItseContext().firestore();
    await assertFails(updateDoc(
      doc(db, 'seurat', SEURA_A, 'pelaajat', PELAAJA_UID),
      { d3_taso: 4, hh_taso: 5 }
    ));
  });

  it('Pelaaja EI päivitä pelaajan muita kenttiä', async () => {
    const db = pelaajaItseContext().firestore();
    await assertFails(updateDoc(
      doc(db, 'seurat', SEURA_A, 'pelaajat', PELAAJA_UID),
      { etunimi: 'Hakkeri' }
    ));
  });

  it('Pelaaja EI lue seuradokumenttia', async () => {
    const db = pelaajaItseContext().firestore();
    await assertFails(getDoc(doc(db, 'seurat', SEURA_A)));
  });

  it('Pelaaja EI luo havaintoa', async () => {
    const db = pelaajaItseContext().firestore();
    await assertFails(setDoc(
      doc(db, 'seurat', SEURA_A, 'pelaajat', PELAAJA_UID, 'havainnot', 'hav-fake'),
      { tyyppi: 'adar', narratiivi: 'injektoitu' }
    ));
  });

  it('Pelaaja EI poista havaintoa', async () => {
    const db = pelaajaItseContext().firestore();
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

  // ── P1 — Pelihavainto: uudet kentät (tilanne/taksonomia/linkki_yksilo) hyväksytään (ei hasOnly-estoa) ──
  it('Valmentaja luo pelihavainnon P1-kentillä (tilanne/taksonomia/pisteet 1–5)', async () => {
    const db = valmentajaContext(VALM_A_UID, SEURA_A).firestore();
    await assertSucceeds(setDoc(
      doc(db, 'seurat', SEURA_A, 'pelaajat', PELAAJA_UID, 'havainnot', 'ph1'),
      { tyyppi: 'adar', malli: 'tm_pelihavainto', tila: 'valmis', pisteet: { A: 2, D: 3, Act: 4, R: 2 },
        tilanne: 'peli', vastustaja: 'VPS', taksonomia_valittu: 'anticipation', taksonomia: ['anticipation', 'vision'],
        vapaa_havainto: 'luki pelin hyvin', linkki_yksilo: null, pelaajaId: PELAAJA_UID, seuraId: SEURA_A, valmentajaUid: VALM_A_UID, luotu: new Date() }
    ));
  });
  it('Valmentaja asettaa yksilö-jaksofokuksen pelihavainnosta (domeeni teknis_taktinen)', async () => {
    const db = valmentajaContext(VALM_A_UID, SEURA_A).firestore();
    await assertSucceeds(updateDoc(
      doc(db, 'seurat', SEURA_A, 'pelaajat', PELAAJA_UID),
      { jaksofokus: { konsepti_avain: 'y_h0', konsepti_nimi: 'Havainnointi', domeeni: 'teknis_taktinen', lahde: 'pelihavainto', kesto_vk: 4, alkoi: '2026-07-10' } }
    ));
  });
  it('Toisen seuran valmentaja EI luo pelihavaintoa (tenant-eristys)', async () => {
    const db = randomContext().firestore();
    await assertFails(setDoc(
      doc(db, 'seurat', SEURA_A, 'pelaajat', PELAAJA_UID, 'havainnot', 'ph-bad'),
      { tyyppi: 'adar', tila: 'valmis', pisteet: { A: 3 }, tilanne: 'peli', luotu: new Date() }
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
// 4c. PERMISSIO-JOUKKULUKKO (L2, turvakorjaus) — valmentaja kirjoittaa VAIN oman
//     joukkueensa pelaajiin; johto (VP/UTJ) + SA ohittavat; toinen seura estetty.
//     Vahvistaa: pelaaja.joukkueet[] ∩ valmentaja.joukkueet[] (get kayttajat/{uid}).
//     Kohteet: havainnot (ADAR) · arviointi · palautteet · pelaajadok ADAR-pikakenttä-update.
// ═══════════════════════════════════════════════════════════════════════════

describe('Permissio-joukkulukko (L2 — turvakorjaus)', () => {
  beforeEach(async () => {
    await seedAdminDoc();
    await seedSeuraAndPelaaja();
  });

  const HAV = { tyyppi: 'adar', tila: 'valmis', narratiivi: 'ADAR-havainto', luotu: new Date() };
  const ARV = { kehys: 'palloliitto', havaittu: { anticipation: 4 }, luotu: new Date() };
  const PAL = { nakyvyys: 'pelaaja', teksti: 'Hyvä kehitys', pvm: '2026-07-15' };
  const ADAR_PIKA = { adar_viimeisin: { a: 3, d: 2, ac: 2, r: 2, yht: 2.3, pvm: '2026-07-15' } };

  // (a) OMA joukkue → sallittu
  it('(a) Valmentaja luo ADAR-havainnon OMAN joukkueen pelaajaan → sallittu', async () => {
    const db = valmentajaContext(VALM_A_UID, SEURA_A).firestore();
    await assertSucceeds(setDoc(
      doc(db, 'seurat', SEURA_A, 'pelaajat', PELAAJA_UID, 'havainnot', 'hav-oma'), HAV));
  });
  it('(a) Valmentaja päivittää OMAN joukkueen pelaajan ADAR-pikakentät → sallittu', async () => {
    const db = valmentajaContext(VALM_A_UID, SEURA_A).firestore();
    await assertSucceeds(updateDoc(
      doc(db, 'seurat', SEURA_A, 'pelaajat', PELAAJA_UID), ADAR_PIKA));
  });
  it('(a) Valmentaja luo arvioinnin + palautteen OMAN joukkueen pelaajaan → sallittu', async () => {
    const db = valmentajaContext(VALM_A_UID, SEURA_A).firestore();
    await assertSucceeds(setDoc(
      doc(db, 'seurat', SEURA_A, 'pelaajat', PELAAJA_UID, 'arviointi', '2026-27'), ARV));
    await assertSucceeds(setDoc(
      doc(db, 'seurat', SEURA_A, 'pelaajat', PELAAJA_UID, 'palautteet', '2026-07-15_tki'), PAL));
  });

  // (b) MUU joukkue (sama seura) → estetty
  it('(b) Valmentaja EI luo ADAR-havaintoa MUUN joukkueen pelaajaan → estetty', async () => {
    const db = valmentajaContext(VALM_A_UID, SEURA_A).firestore();
    await assertFails(setDoc(
      doc(db, 'seurat', SEURA_A, 'pelaajat', PELAAJA_A2_UID, 'havainnot', 'hav-muu'), HAV));
  });
  it('(b) Valmentaja EI päivitä MUUN joukkueen pelaajan ADAR-pikakenttiä → estetty', async () => {
    const db = valmentajaContext(VALM_A_UID, SEURA_A).firestore();
    await assertFails(updateDoc(
      doc(db, 'seurat', SEURA_A, 'pelaajat', PELAAJA_A2_UID), ADAR_PIKA));
  });
  it('(b) Valmentaja EI luo arviointia/palautetta MUUN joukkueen pelaajaan → estetty', async () => {
    const db = valmentajaContext(VALM_A_UID, SEURA_A).firestore();
    await assertFails(setDoc(
      doc(db, 'seurat', SEURA_A, 'pelaajat', PELAAJA_A2_UID, 'arviointi', '2026-27'), ARV));
    await assertFails(setDoc(
      doc(db, 'seurat', SEURA_A, 'pelaajat', PELAAJA_A2_UID, 'palautteet', '2026-07-15_tki'), PAL));
  });

  // (c) Johto (VP) ohittaa joukkuerajauksen → mikä tahansa seuran pelaaja sallittu
  it('(c) VP luo havainnon + arvioinnin MUUN joukkueen pelaajaan (johto-ohitus) → sallittu', async () => {
    const db = vpContext(SEURA_A).firestore();
    await assertSucceeds(setDoc(
      doc(db, 'seurat', SEURA_A, 'pelaajat', PELAAJA_A2_UID, 'havainnot', 'hav-vp'), HAV));
    await assertSucceeds(setDoc(
      doc(db, 'seurat', SEURA_A, 'pelaajat', PELAAJA_A2_UID, 'arviointi', '2026-27'), ARV));
  });
  it('(c) VP päivittää MUUN joukkueen pelaajan ADAR-pikakentät (johto-ohitus) → sallittu', async () => {
    const db = vpContext(SEURA_A).firestore();
    await assertSucceeds(updateDoc(
      doc(db, 'seurat', SEURA_A, 'pelaajat', PELAAJA_A2_UID), ADAR_PIKA));
  });

  // (d) SA → sallittu (mihin tahansa)
  it('(d) SA luo havainnon MUUN joukkueen pelaajaan → sallittu', async () => {
    const db = saContext().firestore();
    await assertSucceeds(setDoc(
      doc(db, 'seurat', SEURA_A, 'pelaajat', PELAAJA_A2_UID, 'havainnot', 'hav-sa'), HAV));
  });

  // (e) Toisen seuran valmentaja → estetty (seura-lukko ennallaan)
  it('(e) Toisen seuran valmentaja EI luo havaintoa seura A:n pelaajaan → estetty', async () => {
    const db = valmentajaContext(VALM_B_UID, SEURA_B).firestore();
    await assertFails(setDoc(
      doc(db, 'seurat', SEURA_A, 'pelaajat', PELAAJA_UID, 'havainnot', 'hav-crossclub'), HAV));
  });

  // (f) LUKU ennallaan — joukkuerajaus EI koske lukua
  it('(f) Valmentaja LUKEE MUUN joukkueen pelaajan (luku ennallaan) → sallittu', async () => {
    const db = valmentajaContext(VALM_A_UID, SEURA_A).firestore();
    await assertSucceeds(getDoc(doc(db, 'seurat', SEURA_A, 'pelaajat', PELAAJA_A2_UID)));
  });
  it('(f) Valmentaja LUKEE MUUN joukkueen pelaajan havainnot (luku ennallaan) → sallittu', async () => {
    await seedHavainto();  // hav1 PELAAJA_UID:lle; luku sallittu myös eri joukkue
    const db = valmentajaContext(VALM_A_UID, SEURA_A).firestore();
    await assertSucceeds(getDoc(
      doc(db, 'seurat', SEURA_A, 'pelaajat', PELAAJA_UID, 'havainnot', 'hav1')));
  });

  // ── Talenttivalmentaja: joukkuerajauksen ohitus (PR #270) — koko oma seura, seura-lukko ennallaan ──
  // Talval EI ole onJohtoRooli:ssa, mutta ohittaa joukkulukon (vastuu ulottuu kaikkiin talentteihin/joukkueisiin).
  it('Talenttivalmentaja luo havainnon OMAN joukkueen pelaajaan → sallittu', async () => {
    const db = talenttivalmentajaContext('talval-fcl-001', SEURA_A).firestore();
    await assertSucceeds(setDoc(
      doc(db, 'seurat', SEURA_A, 'pelaajat', PELAAJA_UID, 'havainnot', 'hav-talval-oma'), HAV));
  });
  it('Talenttivalmentaja luo havainnon MUUN joukkueen (saman seuran) pelaajaan → sallittu', async () => {
    const db = talenttivalmentajaContext('talval-fcl-001', SEURA_A).firestore();
    await assertSucceeds(setDoc(
      doc(db, 'seurat', SEURA_A, 'pelaajat', PELAAJA_A2_UID, 'havainnot', 'hav-talval-muu'), HAV));
  });
  it('Talenttivalmentaja päivittää MUUN joukkueen pelaajan ADAR-pikakentät + arviointi/palaute → sallittu', async () => {
    const db = talenttivalmentajaContext('talval-fcl-001', SEURA_A).firestore();
    await assertSucceeds(updateDoc(
      doc(db, 'seurat', SEURA_A, 'pelaajat', PELAAJA_A2_UID), ADAR_PIKA));
    await assertSucceeds(setDoc(
      doc(db, 'seurat', SEURA_A, 'pelaajat', PELAAJA_A2_UID, 'arviointi', '2026-27'), ARV));
    await assertSucceeds(setDoc(
      doc(db, 'seurat', SEURA_A, 'pelaajat', PELAAJA_A2_UID, 'palautteet', '2026-07-15_tki'), PAL));
  });
  it('Toisen seuran talenttivalmentaja EI kirjoita seura A:n pelaajaan (seura-lukko) → estetty', async () => {
    const db = talenttivalmentajaContext('talval-kpv-001', SEURA_B).firestore();
    await assertFails(setDoc(
      doc(db, 'seurat', SEURA_A, 'pelaajat', PELAAJA_UID, 'havainnot', 'hav-talval-crossclub'), HAV));
  });
  it('Regressio #269: tavallinen valmentaja EI kirjoita MUUN joukkueen pelaajaan (ei ohitusta) → estetty', async () => {
    const db = valmentajaContext(VALM_A_UID, SEURA_A).firestore();
    await assertFails(setDoc(
      doc(db, 'seurat', SEURA_A, 'pelaajat', PELAAJA_A2_UID, 'havainnot', 'hav-valm-muu-regr'), HAV));
  });
});

// ═══════════════════════════════════════════════════════════════════════════
// 4b. VAIHE 4a — jaksofokus + tt_positio_aktiivinen (roolimalli §4, operatiivinen pelitavoite)
// ═══════════════════════════════════════════════════════════════════════════

describe('Vaihe 4a — jaksofokus / tt_positio_aktiivinen (§4 roolimalli)', () => {
  beforeEach(async () => {
    await seedAdminDoc();
    await seedSeuraAndPelaaja();
  });
  const JF = { konsepti_avain: 'y_h2', konsepti_nimi: 'SYÖTTÄMINEN', kesto_vk: 4, lahde: 'valmentaja', alkoi: '2026-07-07' };

  it('Valmentaja (oma seura) asettaa jaksofokuksen', async () => {
    const db = valmentajaContext(VALM_A_UID, SEURA_A).firestore();
    await assertSucceeds(updateDoc(doc(db, 'seurat', SEURA_A, 'pelaajat', PELAAJA_UID), { jaksofokus: JF }));
  });
  it('Talenttivalmentaja (oma seura) asettaa jaksofokuksen', async () => {
    const db = talenttivalmentajaContext('talval-fcl-001', SEURA_A).firestore();
    await assertSucceeds(updateDoc(doc(db, 'seurat', SEURA_A, 'pelaajat', PELAAJA_UID), { jaksofokus: JF }));
  });
  // Piirrokset Vaihe 1 · B2 (v3.14) — TOISSIJAINEN pelipaikka: sama portti kuin ensisijaisella.
  it('Valmentaja asettaa tt_positio_toissijainen (sama kenttäomistajuus kuin 1°)', async () => {
    const db = valmentajaContext(VALM_A_UID, SEURA_A).firestore();
    await assertSucceeds(updateDoc(doc(db, 'seurat', SEURA_A, 'pelaajat', PELAAJA_UID),
      { tt_positio_aktiivinen: 'KY', tt_positio_toissijainen: 'KK' }));
  });
  it('VP asettaa tt_positio_toissijainen', async () => {
    const db = vpContext(SEURA_A).firestore();
    await assertSucceeds(updateDoc(doc(db, 'seurat', SEURA_A, 'pelaajat', PELAAJA_UID), { tt_positio_toissijainen: 'LA' }));
  });
  it('fysioterapeutti EI saa tt_positio_toissijainen-kenttää (allowlist = jaksofokus + historia)', async () => {
    const db = testEnv.authenticatedContext('fysio-fcl-001', { rooli: 'fysioterapeutti', seuraId: SEURA_A }).firestore();
    await assertSucceeds(updateDoc(doc(db, 'seurat', SEURA_A, 'pelaajat', PELAAJA_UID), { jaksofokus: JF }));
    await assertFails(updateDoc(doc(db, 'seurat', SEURA_A, 'pelaajat', PELAAJA_UID), { tt_positio_toissijainen: 'KK' }));
  });
  it('toisen seuran valmentaja EI aseta tt_positio_toissijainen (tenant-eristys)', async () => {
    const db = valmentajaContext('valm-kpv-001', SEURA_B).firestore();
    await assertFails(updateDoc(doc(db, 'seurat', SEURA_A, 'pelaajat', PELAAJA_UID), { tt_positio_toissijainen: 'KK' }));
  });

  it('VP (oma seura) asettaa jaksofokuksen + tt_positio_aktiivinen (talenttihallinta)', async () => {
    const db = vpContext(SEURA_A).firestore();
    await assertSucceeds(updateDoc(doc(db, 'seurat', SEURA_A, 'pelaajat', PELAAJA_UID), { jaksofokus: JF, tt_positio_aktiivinen: 'T' }));
  });
  it('Seurasihteeri (johto) asettaa VAIN jaksofokus/tt_positio (field-level-klausuuli)', async () => {
    const db = sihteeriContext(SEURA_A).firestore();
    await assertSucceeds(updateDoc(doc(db, 'seurat', SEURA_A, 'pelaajat', PELAAJA_UID), { tt_positio_aktiivinen: 'KK' }));
  });
  it('Seurasihteeri EI pääse muihin kenttiin jaksofokuksen ohella (hasOnly-rajaus)', async () => {
    const db = sihteeriContext(SEURA_A).firestore();
    await assertFails(updateDoc(doc(db, 'seurat', SEURA_A, 'pelaajat', PELAAJA_UID), { jaksofokus: JF, flei_viimeisin: 99 }));
  });
  it('Toisen seuran valmentaja EI aseta jaksofokusta (tenant-eristys)', async () => {
    const db = randomContext().firestore();
    await assertFails(updateDoc(doc(db, 'seurat', SEURA_A, 'pelaajat', PELAAJA_UID), { jaksofokus: JF }));
  });
  it('Pelaaja EI aseta jaksofokusta (ei sallituissa avaimissa)', async () => {
    const db = pelaajaItseContext().firestore();
    await assertFails(updateDoc(doc(db, 'seurat', SEURA_A, 'pelaajat', PELAAJA_UID), { jaksofokus: JF }));
  });
  it('Huoltaja EI aseta jaksofokusta', async () => {
    const db = huoltajaContext().firestore();
    await assertFails(updateDoc(doc(db, 'seurat', SEURA_A, 'pelaajat', PELAAJA_UID), { jaksofokus: JF }));
  });

  // ── Vaihe 6 — jakson sulku: jaksofokus_historia append (sama kenttäomistajuus) ──
  const HIST = [{ domeeni: 'teknis_taktinen', konsepti_avain: 'y_h2', konsepti_nimi: 'SYÖTTÄMINEN', harjoituksia: 3, tulos: 'parani', media: [] }];
  it('Valmentaja sulkee jakson: jaksofokus + jaksofokus_historia yhdessä (field-level)', async () => {
    const db = valmentajaContext(VALM_A_UID, SEURA_A).firestore();
    await assertSucceeds(updateDoc(doc(db, 'seurat', SEURA_A, 'pelaajat', PELAAJA_UID), { jaksofokus: JF, jaksofokus_historia: HIST }));
  });
  it('Talenttivalmentaja kirjoittaa jaksofokus_historian', async () => {
    const db = talenttivalmentajaContext('talval-fcl-001', SEURA_A).firestore();
    await assertSucceeds(updateDoc(doc(db, 'seurat', SEURA_A, 'pelaajat', PELAAJA_UID), { jaksofokus_historia: HIST }));
  });
  it('VP sulkee jakson (oversight)', async () => {
    const db = vpContext(SEURA_A).firestore();
    await assertSucceeds(updateDoc(doc(db, 'seurat', SEURA_A, 'pelaajat', PELAAJA_UID), { jaksofokus: JF, jaksofokus_historia: HIST }));
  });
  // HUOM: valmentajalla on jo koko-dokin update (onOmanSeuranValmentaja) → hasOnly-rajaus ei
  // koske häntä; yhdistelmäkirjoitus onnistuu designin mukaan. Field-level-klausuulin lisäarvo
  // on seurasihteerille (johtorooli ILMAN broad valmennusdata-writeä) — sama kuvio kuin
  // PR #115:n "Seurasihteeri EI pääse muihin kenttiin jaksofokuksen ohella" -testissä.
  it('Seurasihteeri kirjoittaa jaksofokus_historian field-level (hasOnly sallii)', async () => {
    const db = sihteeriContext(SEURA_A).firestore();
    await assertSucceeds(updateDoc(doc(db, 'seurat', SEURA_A, 'pelaajat', PELAAJA_UID), { jaksofokus: JF, jaksofokus_historia: HIST }));
  });
  it('Seurasihteeri EI kirjoita jaksofokus_historiaa + kiellettyä kenttää yhdessä (hasOnly)', async () => {
    const db = sihteeriContext(SEURA_A).firestore();
    await assertFails(updateDoc(doc(db, 'seurat', SEURA_A, 'pelaajat', PELAAJA_UID), { jaksofokus_historia: HIST, flei_viimeisin: 88 }));
  });
  it('Toisen seuran valmentaja EI kirjoita jaksofokus_historiaa (tenant-eristys)', async () => {
    const db = randomContext().firestore();
    await assertFails(updateDoc(doc(db, 'seurat', SEURA_A, 'pelaajat', PELAAJA_UID), { jaksofokus_historia: HIST }));
  });

  // ── Vaihe 7 (v3.11) — fysioterapeutti: fyysisen jakson sulku (jaksofokus + jaksofokus_historia, EI tt_positio) ──
  const JF_FYYS = { konsepti_avain: 'fy_nopeus', konsepti_nimi: 'Nopeus', domeeni: 'fyysinen', lahde: 'silta_d1', kesto_vk: 4, alkoi: '2026-07-09' };
  it('Fysioterapeutti (oma seura) sulkee fyysisen jakson: jaksofokus + jaksofokus_historia', async () => {
    const db = fysioterapeuttiContext('fysio-fcl-001', SEURA_A).firestore();
    await assertSucceeds(updateDoc(doc(db, 'seurat', SEURA_A, 'pelaajat', PELAAJA_UID), { jaksofokus: JF_FYYS, jaksofokus_historia: HIST }));
  });
  it('Fysioterapeutti + kielletty kenttä (flei_viimeisin) yhdessä → estetty (hasOnly)', async () => {
    const db = fysioterapeuttiContext('fysio-fcl-001', SEURA_A).firestore();
    await assertFails(updateDoc(doc(db, 'seurat', SEURA_A, 'pelaajat', PELAAJA_UID), { jaksofokus: JF_FYYS, flei_viimeisin: 42 }));
  });
  it('Fysioterapeutti EI kirjoita tt_positio_aktiivinen (ei kuulu roolille)', async () => {
    const db = fysioterapeuttiContext('fysio-fcl-001', SEURA_A).firestore();
    await assertFails(updateDoc(doc(db, 'seurat', SEURA_A, 'pelaajat', PELAAJA_UID), { tt_positio_aktiivinen: 'T' }));
  });
  it('Toisen seuran fysioterapeutti EI kirjoita jaksofokusta (tenant-eristys)', async () => {
    const db = fysioterapeuttiContext('fysio-kpv-001', 'kpv').firestore();
    await assertFails(updateDoc(doc(db, 'seurat', SEURA_A, 'pelaajat', PELAAJA_UID), { jaksofokus: JF_FYYS, jaksofokus_historia: HIST }));
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

  // ── P7-c.1: anon-luku (PIN-pelaaja/vanhempi näkee seuran aikataulun) ──
  it('Pelaaja lukee kalenterin (P7-c.1)', async () => {
    const db = pelaajaItseContext().firestore();
    await assertSucceeds(getDoc(doc(db, 'seurat', SEURA_A, 'kalenteri', 'kal1')));
  });

  it('Pelaaja lukee kalenterin läsnäolijat (P7-c.1)', async () => {
    const db = pelaajaItseContext().firestore();
    await assertSucceeds(getDoc(doc(db, 'seurat', SEURA_A, 'kalenteri', 'kal1', 'lasnaolijat', PELAAJA_UID)));
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

  // ── Vaihe 4d — treeniteema (additiivinen kenttä harjoitustapahtumassa) ──
  it('Valmentaja luo harjoituksen treeniteemalla (luonti, luoja_uid == oma uid)', async () => {
    const db = valmentajaContext(VALM_A_UID, SEURA_A).firestore();
    await assertSucceeds(setDoc(
      doc(db, 'seurat', SEURA_A, 'kalenteri', 'kal-teema'),
      { tyyppi: 'harjoitus', nimi: 'Kuljetusteema', pvm: '2026-09-18', luoja_uid: VALM_A_UID, poistettu: false,
        treeniteema: { tyyppi: 'yksilo_konsepti', avain: 'y_h0', nimi: 'Kuljetus ahtaassa', koodi: 'Y-H0', lahde: 'teemakeskittyma', pelaajat_id: [PELAAJA_UID] } }
    ));
  });

  it('Valmentaja muokkaa OMAN tapahtuman treeniteeman (täysi, sallittu)', async () => {
    const db = valmentajaContext(VALM_A_UID, SEURA_A).firestore();
    await assertSucceeds(updateDoc(
      doc(db, 'seurat', SEURA_A, 'kalenteri', 'kal_own'),
      { treeniteema: { tyyppi: 'joukkue_teema', avain: 'j_h1', nimi: 'Rakentaminen', koodi: 'J-H1', lahde: 'manuaalinen', pelaajat_id: [] } }
    ));
  });

  it('Valmentaja EI aseta treeniteemaa MUIDEN tapahtumaan (field-level ei salli)', async () => {
    const db = valmentajaContext(VALM_A_UID, SEURA_A).firestore();
    await assertFails(updateDoc(
      doc(db, 'seurat', SEURA_A, 'kalenteri', 'kal1'),
      { treeniteema: { tyyppi: 'yksilo_konsepti', avain: 'y_h0', nimi: 'X', koodi: 'Y-H0', lahde: 'manuaalinen', pelaajat_id: [] } }
    ));
  });

  it('VP asettaa treeniteeman mihin tahansa tapahtumaan (oversight)', async () => {
    const db = vpContext(SEURA_A).firestore();
    await assertSucceeds(updateDoc(
      doc(db, 'seurat', SEURA_A, 'kalenteri', 'kal1'),
      { treeniteema: { tyyppi: 'yksilo_konsepti', avain: 'y_h1', nimi: 'Syöttö', koodi: 'Y-H1', lahde: 'jaksofokus', pelaajat_id: [] } }
    ));
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

  // ── P7-c.3 + RSVP-erotus: anon (PIN-pelaaja/vanhempi) ilmoittaa oman SAATAVUUTENSA — vain saatavuus/rooli/paivitetty ──
  it('Pelaaja luo oman saatavuuden (vain saatavuus/rooli/paivitetty)', async () => {
    const db = pelaajaItseContext().firestore();
    await assertSucceeds(setDoc(
      doc(db, 'seurat', SEURA_A, 'kalenteri', 'kal1', 'lasnaolijat', PELAAJA_UID),
      { saatavuus: 'estynyt', rooli: 'pelaaja', paivitetty: new Date().toISOString() }
    ));
  });

  it('Pelaaja EI voi kirjoittaa tila:aa (valmentajan toteutunut läsnäolo — väärennössuoja)', async () => {
    const db = pelaajaItseContext().firestore();
    await assertFails(setDoc(
      doc(db, 'seurat', SEURA_A, 'kalenteri', 'kal1', 'lasnaolijat', PELAAJA_UID),
      { tila: 'paikalla', rooli: 'pelaaja', paivitetty: new Date().toISOString() }
    ));
  });

  it('Pelaaja EI saa kirjoittaa syytä saatavuuteen (GDPR)', async () => {
    const db = pelaajaItseContext().firestore();
    await assertFails(setDoc(
      doc(db, 'seurat', SEURA_A, 'kalenteri', 'kal1', 'lasnaolijat', PELAAJA_UID),
      { saatavuus: 'estynyt', rooli: 'pelaaja', paivitetty: new Date().toISOString(), syy: 'sairaus' }
    ));
  });

  it('Pelaaja päivittää oman saatavuuden (coach-luotu doc, tila säilyy)', async () => {
    await testEnv.withSecurityRulesDisabled(async (ctx) => {
      await setDoc(doc(ctx.firestore(), 'seurat', SEURA_A, 'kalenteri', 'kal1', 'lasnaolijat', PELAAJA_UID),
        { tila: 'paikalla', merkitsija_uid: VALM_A_UID, nimi: 'Pelaaja' });
    });
    const db = pelaajaItseContext().firestore();
    await assertSucceeds(updateDoc(
      doc(db, 'seurat', SEURA_A, 'kalenteri', 'kal1', 'lasnaolijat', PELAAJA_UID),
      { saatavuus: 'tulossa', rooli: 'pelaaja', paivitetty: new Date().toISOString() }
    ));
  });

  it('Pelaaja EI muuta läsnäolon tila:aa update:ssa (väärennössuoja)', async () => {
    await testEnv.withSecurityRulesDisabled(async (ctx) => {
      await setDoc(doc(ctx.firestore(), 'seurat', SEURA_A, 'kalenteri', 'kal1', 'lasnaolijat', PELAAJA_UID),
        { tila: 'poissa', nimi: 'Pelaaja' });
    });
    const db = pelaajaItseContext().firestore();
    await assertFails(updateDoc(
      doc(db, 'seurat', SEURA_A, 'kalenteri', 'kal1', 'lasnaolijat', PELAAJA_UID),
      { tila: 'paikalla' }
    ));
  });

  it('Valmentaja kirjoittaa toteutuneen tila:n (ennallaan)', async () => {
    const db = valmentajaContext(VALM_A_UID, SEURA_A).firestore();
    await assertSucceeds(setDoc(
      doc(db, 'seurat', SEURA_A, 'kalenteri', 'kal1', 'lasnaolijat', PELAAJA_UID),
      { tila: 'paikalla', merkitsija_uid: VALM_A_UID }
    ));
  });
});

// ═══════════════════════════════════════════════════════════════════════════
// P7-c.4a — KULUTTAJA-NOTIFIKAATIOT (pelaajat/{pid}/notifikaatiot) + opt-out
// ═══════════════════════════════════════════════════════════════════════════
describe('P7-c.4a kuluttaja-notifikaatiot', () => {
  beforeEach(async () => {
    await seedSeuraAndPelaaja();
    await testEnv.withSecurityRulesDisabled(async (ctx) => {
      await setDoc(doc(ctx.firestore(), 'seurat', SEURA_A, 'pelaajat', PELAAJA_UID, 'notifikaatiot', 'n1'),
        { tyyppi: 'peruttu', teksti: 'Peruttu: ottelu', luettu: false, luotu: new Date().toISOString() });
    });
  });

  it('Pelaaja lukee oman notifin', async () => {
    const db = pelaajaItseContext().firestore();
    await assertSucceeds(getDoc(doc(db, 'seurat', SEURA_A, 'pelaajat', PELAAJA_UID, 'notifikaatiot', 'n1')));
  });

  it('Pelaaja EI voi LUODA notifia (väärennössuoja — vain CF/SA)', async () => {
    const db = pelaajaItseContext().firestore();
    await assertFails(setDoc(doc(db, 'seurat', SEURA_A, 'pelaajat', PELAAJA_UID, 'notifikaatiot', 'vaara'),
      { tyyppi: 'muistutus', teksti: 'väärennös', luettu: false }));
  });

  it('Pelaaja merkitsee oman notifin luetuksi (vain luettu)', async () => {
    const db = pelaajaItseContext().firestore();
    await assertSucceeds(updateDoc(doc(db, 'seurat', SEURA_A, 'pelaajat', PELAAJA_UID, 'notifikaatiot', 'n1'),
      { luettu: true, luettu_pvm: new Date().toISOString() }));
  });

  it('Pelaaja EI muuta notifin tekstiä', async () => {
    const db = pelaajaItseContext().firestore();
    await assertFails(updateDoc(doc(db, 'seurat', SEURA_A, 'pelaajat', PELAAJA_UID, 'notifikaatiot', 'n1'),
      { teksti: 'hakkeroitu' }));
  });

  it('Pelaaja kirjoittaa oman notif_asetuksen (opt-out)', async () => {
    const db = pelaajaItseContext().firestore();
    await assertSucceeds(updateDoc(doc(db, 'seurat', SEURA_A, 'pelaajat', PELAAJA_UID),
      { notif_asetukset: { inapp: { enabled: false } } }));
  });
});

// ═══════════════════════════════════════════════════════════════════════════
// 9. SUOSTUMUKSET — julkinen lomake
// ═══════════════════════════════════════════════════════════════════════════

describe('Seurakerros TIER 1 — seurat/{sid}/konseptit (v3.13)', () => {
  const OVR = { nimi: 'PELINLUKU', lahde: 'seura', paivitetty: '2026-09-16', muokkaaja_uid: VP_A_UID };

  beforeEach(async () => {
    await seedAdminDoc();
    await testEnv.withSecurityRulesDisabled(async (ctx) => {
      await setDoc(doc(ctx.firestore(), 'seurat', SEURA_A, 'konseptit', 'y_h0'), OVR);
    });
  });

  // ── LUKU: koko seura (valmentaja tarvitsee konseptit renderiin) ──
  it('VP lukee oman seuran konseptin', async () => {
    const db = vpContext(SEURA_A).firestore();
    await assertSucceeds(getDoc(doc(db, 'seurat', SEURA_A, 'konseptit', 'y_h0')));
  });
  it('valmentaja LUKEE oman seuran konseptin (TIER 2 tarvitsee resolvoidun konseptin)', async () => {
    const db = valmentajaContext(VALM_A_UID, SEURA_A).firestore();
    await assertSucceeds(getDoc(doc(db, 'seurat', SEURA_A, 'konseptit', 'y_h0')));
  });

  // ── KIRJOITUS: vain VP / urheilutoimenjohtaja ──
  it('VP kirjoittaa overriden', async () => {
    const db = vpContext(SEURA_A).firestore();
    await assertSucceeds(setDoc(doc(db, 'seurat', SEURA_A, 'konseptit', 'y_h1'), OVR));
  });
  it('urheilutoimenjohtaja (Head of Talent) kirjoittaa overriden', async () => {
    const db = testEnv.authenticatedContext('utj-fcl-001', { rooli: 'urheilutoimenjohtaja', seuraId: SEURA_A }).firestore();
    await assertSucceeds(setDoc(doc(db, 'seurat', SEURA_A, 'konseptit', 'y_h2'), OVR));
  });
  it('VALMENTAJA EI kirjoita — seuran konseptikieli ei saa hajota joukkueittain (§37)', async () => {
    const db = valmentajaContext(VALM_A_UID, SEURA_A).firestore();
    await assertFails(setDoc(doc(db, 'seurat', SEURA_A, 'konseptit', 'y_h3'), OVR));
    await assertFails(updateDoc(doc(db, 'seurat', SEURA_A, 'konseptit', 'y_h0'), { nimi: 'X' }));
    await assertFails(deleteDoc(doc(db, 'seurat', SEURA_A, 'konseptit', 'y_h0')));
  });
  it('talenttivalmentaja EI kirjoita', async () => {
    const db = talenttivalmentajaContext('tal-fcl-001', SEURA_A).firestore();
    await assertFails(setDoc(doc(db, 'seurat', SEURA_A, 'konseptit', 'y_h4'), OVR));
  });
  it('seurasihteeri EI kirjoita (hallinnollinen rooli, ei pedagoginen)', async () => {
    const db = testEnv.authenticatedContext('sihteeri-fcl', { rooli: 'seurasihteeri', seuraId: SEURA_A }).firestore();
    await assertFails(setDoc(doc(db, 'seurat', SEURA_A, 'konseptit', 'y_h5'), OVR));
  });
  it('"palauta kaanoniin" = VP poistaa override-dokumentin', async () => {
    const db = vpContext(SEURA_A).firestore();
    await assertSucceeds(deleteDoc(doc(db, 'seurat', SEURA_A, 'konseptit', 'y_h0')));
  });

  // ── MONIVUOKRALAIS-ERISTYS ──
  it('seuran A VP EI lue eikä kirjoita seuran B konsepteja', async () => {
    const db = vpContext(SEURA_A).firestore();
    await assertFails(getDoc(doc(db, 'seurat', SEURA_B, 'konseptit', 'y_h0')));
    await assertFails(setDoc(doc(db, 'seurat', SEURA_B, 'konseptit', 'y_h0'), OVR));
  });
  it('kirjautumaton EI lue konsepteja', async () => {
    const db = testEnv.unauthenticatedContext().firestore();
    await assertFails(getDoc(doc(db, 'seurat', SEURA_A, 'konseptit', 'y_h0')));
  });

  // ── Seuran OMA konsepti (seura_*-namespace) ──
  it('VP luo seuran oman seura_*-konseptin', async () => {
    const db = vpContext(SEURA_A).firestore();
    await assertSucceeds(setDoc(doc(db, 'seurat', SEURA_A, 'konseptit', 'seura_kaannos'),
      { oma: true, lahde: 'seura', nimi: 'KÄÄNNÖS PAINEESSA', muokkaaja_uid: VP_A_UID }));
  });
});

describe('Suostumukset (ylätaso, v3.33: ei käytössä)', () => {
  it('kirjautumaton EI luo suostumusta (oli create: if true)', async () => {
    await assertFails(setDoc(doc(unauthContext().firestore(), 'suostumukset', 'suost-1'), { suostumusTila: 'odottaa', seuraId: SEURA_A }));
  });
  it('VP ja SA eivät kirjoita; SA lukee; kirjautumaton ei päivitä odottaa-tilaista', async () => {
    await seedAdminDoc();
    await testEnv.withSecurityRulesDisabled(async (ctx) => {
      await setDoc(doc(ctx.firestore(), 'suostumukset', 'suost-odottaa'), { suostumusTila: 'odottaa' });
    });
    await assertFails(setDoc(doc(vpContext(SEURA_A).firestore(), 'suostumukset', 'suost-2'), { suostumusTila: 'odottaa' }));
    await assertFails(setDoc(doc(saContext().firestore(), 'suostumukset', 'suost-3'), { suostumusTila: 'odottaa' }));
    await assertFails(updateDoc(doc(unauthContext().firestore(), 'suostumukset', 'suost-odottaa'), { suostumusTila: 'annettu' }));
    await assertFails(getDoc(doc(unauthContext().firestore(), 'suostumukset', 'suost-odottaa')));
    await assertSucceeds(getDoc(doc(saContext().firestore(), 'suostumukset', 'suost-odottaa')));
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

  it('Lukukuittaus (token) toimii vaikka luotu puuttuu — affectedKeys ohittaa vartijan', async () => {
    // Regressiosuoja: update-vartija ei saa estää lukukuittausta luotu-puuttuvassa
    // (vanhassa) dokumentissa. seedHavainto luo hav1:n ILMAN luotu-kenttää.
    await seedHavainto();
    const db = pelaajaItseContext().firestore();
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
describe('P6 pelaaja havainnot LISTEN (bugi-diagnoosi)', () => {
  it('pelaaja GET yksittäinen havainto → sallittu (baseline)', async () => {
    await seedAdminDoc(); await seedSeuraAndPelaaja(); await seedHavainto();
    const db = pelaajaItseContext().firestore();
    await assertSucceeds(getDoc(
      doc(db, 'seurat', SEURA_A, 'pelaajat', PELAAJA_UID, 'havainnot', 'hav1')
    ));
  });

  it('pelaaja LIST-query where(tila==valmis).limit(50) → RATKAISEVA (P6-bugi)', async () => {
    await seedAdminDoc(); await seedSeuraAndPelaaja(); await seedHavainto();
    const db = pelaajaItseContext().firestore();
    // Kysely on SAMA kuin Pelaaja_v7 `_p6KaynnistakuuntelIja`:ssa. v3.22 lisäsi
    // `nakyvyys=='pelaaja'` -ehdon sekä sääntöön että kyselyyn — jos tämä ja
    // tuotantokysely eriävät, testi ei enää mittaa oikeaa kyselyä.
    const q = query(
      collection(db, 'seurat', SEURA_A, 'pelaajat', PELAAJA_UID, 'havainnot'),
      where('tila', '==', 'valmis'), where('nakyvyys', '==', 'pelaaja'), limit(50)
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

  it('Pelaaja EI luo eikä lue tavoitetta', async () => {
    const db = pelaajaItseContext().firestore();
    await assertFails(setDoc(
      doc(db, 'seurat', SEURA_A, 'pelaajat', PELAAJA_UID, 'tavoitteet', 'tav-anon'),
      { teksti: 'anon', tila: 'kaynnissa', luotu: new Date() }
    ));
    await assertFails(getDoc(doc(db, 'seurat', SEURA_A, 'pelaajat', PELAAJA_UID, 'tavoitteet', 'tav-a1')));
  });
});

// ═══════════════════════════════════════════════════════════════════════════
// SOLO PLAYER™ P0 — parents / players / playerCodes (v3.7, erillinen seurat/:sta)
// ═══════════════════════════════════════════════════════════════════════════
describe('Solo Player (v3.7)', () => {
  const P1 = 'parent-1', P2 = 'parent-2';
  const pc = (uid) => testEnv.authenticatedContext(uid);
  beforeEach(async () => {
    await testEnv.withSecurityRulesDisabled(async (ctx) => {
      const db = ctx.firestore();
      await setDoc(doc(db, 'players', 'pl1'), { parent_uid: P1, nimi: 'Lapsi', playerCode: 'TMP-ABCDEF', seuraId: null });
      await setDoc(doc(db, 'players', 'pl1', 'suostumukset', 'perus'), { ok: true, tyyppi: 'perus', antaja_uid: P1 });
      await setDoc(doc(db, 'parents', P1), { email: 'p1@test.fi' });
      await setDoc(doc(db, 'playerCodes', 'TMP-ABCDEF'), { playerId: 'pl1', parent_uid: P1 });
    });
  });

  it('Vanhempi lukee + kirjoittaa OMAN parents-dokin', async () => {
    const db = pc(P1).firestore();
    await assertSucceeds(getDoc(doc(db, 'parents', P1)));
    await assertSucceeds(setDoc(doc(db, 'parents', P1), { nimi: 'Äiti' }, { merge: true }));
  });

  it('Vanhempi EI lue toisen vanhemman dokia', async () => {
    await assertFails(getDoc(doc(pc(P2).firestore(), 'parents', P1)));
  });

  it('Vanhempi lukee OMAN lapsen, EI toisen', async () => {
    await assertSucceeds(getDoc(doc(pc(P1).firestore(), 'players', 'pl1')));
    await assertFails(getDoc(doc(pc(P2).firestore(), 'players', 'pl1')));
  });

  it('Vanhempi luo lapsen OMALLA parent_uid:lla; EI toisen uid:lla', async () => {
    await assertSucceeds(setDoc(doc(pc(P1).firestore(), 'players', 'pl-new'), { parent_uid: P1, nimi: 'Uusi' }));
    await assertFails(setDoc(doc(pc(P2).firestore(), 'players', 'pl-bad'), { parent_uid: P1, nimi: 'Väärä' }));
  });

  it('Vanhempi pääsee oman lapsen alikokoelmaan (suostumukset); toinen ei', async () => {
    await assertSucceeds(getDoc(doc(pc(P1).firestore(), 'players', 'pl1', 'suostumukset', 'perus')));
    await assertFails(getDoc(doc(pc(P2).firestore(), 'players', 'pl1', 'suostumukset', 'perus')));
  });

  it('PlayerCode: luo omalla parent_uid:lla · luku kirjautuneelle · ei muokkaa toisen', async () => {
    await assertSucceeds(setDoc(doc(pc(P1).firestore(), 'playerCodes', 'TMP-NEWXYZ'), { playerId: 'pl1', parent_uid: P1 }));
    await assertSucceeds(getDoc(doc(pc(P2).firestore(), 'playerCodes', 'TMP-ABCDEF')));
    await assertFails(updateDoc(doc(pc(P2).firestore(), 'playerCodes', 'TMP-ABCDEF'), { parent_uid: P2 }));
  });

  it('v3.29 · PlayerCode: get kirjautuneelle (myös puuttuva koodi = törmäystarkistus), list EI kenellekään', async () => {
    await assertSucceeds(getDoc(doc(pc(P2).firestore(), 'playerCodes', 'TMP-ABCDEF')));
    await assertSucceeds(getDoc(doc(pc(P2).firestore(), 'playerCodes', 'TMP-EIOLE1')));
    await assertFails(getDocs(collection(pc(P2).firestore(), 'playerCodes')));
    await assertFails(getDocs(query(collection(pc(P1).firestore(), 'playerCodes'), where('parent_uid', '==', P1))));
    await assertFails(getDocs(collection(anonContext().firestore(), 'playerCodes')));
    await assertFails(getDoc(doc(unauthContext().firestore(), 'playerCodes', 'TMP-ABCDEF')));
  });

  it('Kirjautumaton EI pääse Solo-dataan', async () => {
    const db = unauthContext().firestore();
    await assertFails(getDoc(doc(db, 'players', 'pl1')));
    await assertFails(getDoc(doc(db, 'parents', P1)));
  });
});

// ═══════════════════════════════════════════════════════════════════════════
// SOLO POLKU B — lupapyynnot + lapsi-PIN (v3.8)
// ═══════════════════════════════════════════════════════════════════════════
describe('Solo Polku B (v3.8)', () => {
  const P1 = 'parent-1';
  const pc = (uid) => testEnv.authenticatedContext(uid);
  beforeEach(async () => {
    await testEnv.withSecurityRulesDisabled(async (ctx) => {
      const db = ctx.firestore();
      await setDoc(doc(db, 'players', 'pl-pin'), { parent_uid: P1, nimi: 'Lapsi', playerCode: 'TMP-ABCDEF', seuraId: null, child_pin: '1234' });
      await setDoc(doc(db, 'lupapyynnot', 'req-1'), { status: 'odottaa', parent_email: 'p@test.fi', token: 'tok', child_etunimi: 'Lapsi' });
    });
  });

  it('Lupapyyntö: kuka tahansa (anon) luo statuksella odottaa', async () => {
    await assertSucceeds(setDoc(doc(anonContext().firestore(), 'lupapyynnot', 'req-new'),
      { status: 'odottaa', parent_email: 'x@test.fi', token: 't' }));
  });
  it('Lupapyyntö: create ilman status=odottaa hylätään', async () => {
    await assertFails(setDoc(doc(anonContext().firestore(), 'lupapyynnot', 'req-bad'),
      { status: 'hyvaksytty', parent_email: 'x@test.fi' }));
  });
  it('Lupapyyntö: get omalla requestId:llä sallittu', async () => {
    await assertSucceeds(getDoc(doc(anonContext().firestore(), 'lupapyynnot', 'req-1')));
  });
  it('Lupapyyntö: client EI päivitä eikä poista (vain CF)', async () => {
    await assertFails(updateDoc(doc(anonContext().firestore(), 'lupapyynnot', 'req-1'), { status: 'hyvaksytty' }));
    await assertFails(updateDoc(doc(pc(P1).firestore(), 'lupapyynnot', 'req-1'), { status: 'hyvaksytty' }));
    await assertFails(deleteDoc(doc(pc(P1).firestore(), 'lupapyynnot', 'req-1')));
  });
  it('v3.28: anonyymi EI enää GET pelaajaa, jolla child_pin (lapsi = soloLapsiKirjaudu-token)', async () => {
    await assertFails(getDoc(doc(anonContext().firestore(), 'players', 'pl-pin')));
  });
  it('Lapsi-PIN: anonyymi EI saa listata players-kokoelmaa', async () => {
    const db = anonContext().firestore();
    await assertFails(getDocs(query(collection(db, 'players'), where('child_pin', '==', '1234'))));
  });
  it('v3.28: anonyymi EI päivitä profiilikenttää eikä parent_uid/child_pin', async () => {
    const db = anonContext().firestore();
    await assertFails(updateDoc(doc(db, 'players', 'pl-pin'), { nimi: 'Uusi nimi' }));
    await assertFails(updateDoc(doc(db, 'players', 'pl-pin'), { parent_uid: 'hax' }));
    await assertFails(updateDoc(doc(db, 'players', 'pl-pin'), { child_pin: '0000' }));
  });
});

// ═══════════════════════════════════════════════════════════════════════════
// GDPR RTBF -poistoportti (#96) — pelaajan pääDocin client-delete VAIN SA.
// Johto/valmentaja/anon EI saa poistaa clientillä → orpojen esto (poisto kulkee RTBF-CF:n kautta,
// joka tekee täyden recursiveDelete-siivouksen Admin SDK:lla). Subcollections: SA||johto (valmentaja/anon ei).
// ═══════════════════════════════════════════════════════════════════════════
describe('GDPR RTBF delete-gate (#96)', () => {
  beforeEach(async () => {
    await seedAdminDoc();
    await seedSeuraAndPelaaja();
    await seedHavainto();
  });

  it('SA poistaa pelaajan pääDocin (ainoa client-reitti)', async () => {
    const db = saContext().firestore();
    await assertSucceeds(deleteDoc(doc(db, 'seurat', SEURA_A, 'pelaajat', PELAAJA_UID)));
  });

  it('VP (johto) EI POISTA pelaajan pääDocia clientillä — orpojen esto, käytä RTBF-CF:ää', async () => {
    const db = vpContext(SEURA_A).firestore();
    await assertFails(deleteDoc(doc(db, 'seurat', SEURA_A, 'pelaajat', PELAAJA_UID)));
  });

  it('Seurasihteeri (johto) EI POISTA pelaajan pääDocia clientillä', async () => {
    const db = sihteeriContext(SEURA_A).firestore();
    await assertFails(deleteDoc(doc(db, 'seurat', SEURA_A, 'pelaajat', PELAAJA_UID)));
  });

  it('Valmentaja EI POISTA pelaajan pääDocia clientillä', async () => {
    const db = valmentajaContext(VALM_A_UID, SEURA_A).firestore();
    await assertFails(deleteDoc(doc(db, 'seurat', SEURA_A, 'pelaajat', PELAAJA_UID)));
  });

  it('Pelaaja EI POISTA pelaajan pääDocia', async () => {
    const db = pelaajaItseContext().firestore();
    await assertFails(deleteDoc(doc(db, 'seurat', SEURA_A, 'pelaajat', PELAAJA_UID)));
  });

  it('Valmentaja EI POISTA havaintoa (alikokoelma)', async () => {
    const db = valmentajaContext(VALM_A_UID, SEURA_A).firestore();
    await assertFails(deleteDoc(doc(db, 'seurat', SEURA_A, 'pelaajat', PELAAJA_UID, 'havainnot', 'hav1')));
  });

  it('Pelaaja EI POISTA havaintoa (alikokoelma)', async () => {
    const db = pelaajaItseContext().firestore();
    await assertFails(deleteDoc(doc(db, 'seurat', SEURA_A, 'pelaajat', PELAAJA_UID, 'havainnot', 'hav1')));
  });
});

describe('IDP-kausitavoite (idp_kausi) — Vaihe 3a', () => {
  const KAUSITAVOITE = {
    tavoitteet: [{ fokus: { alue: 'short_passing', dim: 'D2', nimi: 'Lyhyt syöttö' }, status: 'aktiivinen',
      lahto: { arvo: 20, pvm: '2026-04-05' }, tavoitearvo: 18, luotu: '2026-07-04T00:00:00.000Z', arviot: [] }],
    paivitetty: '2026-07-04T00:00:00.000Z'
  };
  const idpRef = (db, seura) => doc(db, 'seurat', seura, 'pelaajat', PELAAJA_UID, 'idp_kausi', '2026');

  it('Johto (VP) kirjoittaa oman seuran pelaajan kausitavoitteen', async () => {
    await assertSucceeds(setDoc(idpRef(vpContext(SEURA_A).firestore(), SEURA_A), KAUSITAVOITE));
  });
  it('Oman seuran valmentaja kirjoittaa kausitavoitteen (§15-pattern)', async () => {
    await assertSucceeds(setDoc(idpRef(valmentajaContext(VALM_A_UID, SEURA_A).firestore(), SEURA_A), KAUSITAVOITE));
  });
  it('Toisen seuran valmentaja EI kirjoita (tenant-eristys)', async () => {
    await assertFails(setDoc(idpRef(randomContext().firestore(), SEURA_A), KAUSITAVOITE));
  });
  it('Pelaaja (token) LUKEE oman kausitavoitteen (3c-peili)', async () => {
    await assertSucceeds(getDoc(idpRef(pelaajaItseContext().firestore(), SEURA_A)));
  });
  it('Pelaaja (token) EI kirjoita kausitavoitetta', async () => {
    await assertFails(setDoc(idpRef(pelaajaItseContext().firestore(), SEURA_A), KAUSITAVOITE));
  });
  it('Huoltaja EI lue kausitavoitetta (VP-työkalu; §7.22-peili erikseen)', async () => {
    await assertFails(getDoc(idpRef(huoltajaContext().firestore(), SEURA_A)));
  });
  it('Pelaaja/valmentaja EI POISTA (vain SA)', async () => {
    await assertFails(deleteDoc(idpRef(valmentajaContext(VALM_A_UID, SEURA_A).firestore(), SEURA_A)));
  });
  // IDP-kortti v2 §4 — pelaajan sitoumus (field-level anon-write)
  const SIT = { pelaaja_sitoumus: { itsearvio: { q1: 'a', q2: 'b', q3: 'c' }, rekisteri: 'showcase', sitoumus_pvm: '2026-07-09T10:00:00.000Z', vahvistettu_pvm: null } };
  it('Pelaaja (token) LUO oman sitoumuksensa (vain pelaaja_sitoumus)', async () => {
    await assertSucceeds(setDoc(idpRef(pelaajaItseContext().firestore(), SEURA_A), SIT));
  });
  it('Pelaaja (token) PÄIVITTÄÄ sitoumuksen olemassa olevaan dokkiin (merge, ei koske tavoitteita)', async () => {
    await setDoc(idpRef(vpContext(SEURA_A).firestore(), SEURA_A), KAUSITAVOITE);
    await assertSucceeds(setDoc(idpRef(pelaajaItseContext().firestore(), SEURA_A), SIT, { merge: true }));
  });
  it('Pelaaja (token) EI voi asettaa vahvistettu_pvm (vain VP vahvistaa)', async () => {
    await assertFails(setDoc(idpRef(pelaajaItseContext().firestore(), SEURA_A), { pelaaja_sitoumus: { itsearvio: {}, sitoumus_pvm: 'x', vahvistettu_pvm: '2026-07-09T00:00:00.000Z' } }));
  });
  it('Pelaaja (token) EI voi lisätä tavoitteita sitoumuksen ohella', async () => {
    await assertFails(setDoc(idpRef(pelaajaItseContext().firestore(), SEURA_A), Object.assign({ tavoitteet: [] }, SIT)));
  });
});

// ═══════════════════════════════════════════════════════════════════════════
// Vaihe 7.2a (v3.12) — ohjelmakirjasto seurat/{sid}/ohjelmat/{id}
// ═══════════════════════════════════════════════════════════════════════════
describe('Ohjelmakirjasto (v3.12 — seurat/{sid}/ohjelmat)', () => {
  const OHJ = { nimi: 'Nopeus-voima A', tyyppi: 'nopeus_voima', kuvaus: 'plyo', kesto_vk: 6, vaiheet: [{ vaihe: 'V1', nimi: 'Loikat', intensiteetti: '60–70 %' }], versio: 1, arkistoitu: false, laatija_uid: 'fys-fcl-001', laatija_rooli: 'fysiikkavalmentaja' };
  const ohjRef = (db, seuraId, id) => doc(db, 'seurat', seuraId, 'ohjelmat', id);

  beforeEach(async () => {
    await seedSeuraAndPelaaja();
    await testEnv.withSecurityRulesDisabled(async (ctx) => {
      await setDoc(ohjRef(ctx.firestore(), SEURA_A, 'ohj1'), OHJ);
    });
  });

  it('Fysiikkavalmentaja (oma seura) luo ohjelman', async () => {
    const db = fysiikkavalmentajaContext('fys-fcl-001', SEURA_A).firestore();
    await assertSucceeds(setDoc(ohjRef(db, SEURA_A, 'ohj-uusi'), OHJ));
  });
  it('Fysioterapeutti (oma seura) luo ohjelman', async () => {
    const db = fysioterapeuttiContext('fysio-fcl-001', SEURA_A).firestore();
    await assertSucceeds(setDoc(ohjRef(db, SEURA_A, 'ohj-fysio'), OHJ));
  });
  it('Johto (VP) päivittää ohjelman (arkistoi)', async () => {
    const db = vpContext(SEURA_A).firestore();
    await assertSucceeds(updateDoc(ohjRef(db, SEURA_A, 'ohj1'), { arkistoitu: true }));
  });
  it('Toisen seuran valmentaja EI kirjoita (tenant-eristys)', async () => {
    const db = fysiikkavalmentajaContext('fys-kpv-001', 'kpv').firestore();
    await assertFails(setDoc(ohjRef(db, SEURA_A, 'ohj-bad'), OHJ));
  });
  it('Pelaaja (token) EI kirjoita', async () => {
    const db = pelaajaItseContext().firestore();
    await assertFails(setDoc(ohjRef(db, SEURA_A, 'ohj-anon'), OHJ));
  });
  it('Oman seuran jäsen lukee kirjaston', async () => {
    const db = fysiikkavalmentajaContext('fys-fcl-001', SEURA_A).firestore();
    await assertSucceeds(getDoc(ohjRef(db, SEURA_A, 'ohj1')));
  });
  it('KOVA DELETE estetty valmentajalta (vain arkistointi update)', async () => {
    const db = fysiikkavalmentajaContext('fys-fcl-001', SEURA_A).firestore();
    await assertFails(deleteDoc(ohjRef(db, SEURA_A, 'ohj1')));
  });
});

// ═══════════════════════════════════════════════════════════════════════════
// SEURANTA_KUITTAUKSET (Vaihe C) — VP-hälytyskuittaus: johto kirjoittaa, valmentaja ei,
// oman seuran jäsen lukee, EI hard-deletea (vain SA). seurat/{sid}/seuranta_kuittaukset/{id}
// ═══════════════════════════════════════════════════════════════════════════
describe('Seuranta-kuittaukset (Vaihe C)', () => {
  beforeEach(async () => {
    await seedAdminDoc();
    await seedSeuraAndPelaaja();
  });
  const kRef = (db, sid, id) => doc(db, 'seurat', sid, 'seuranta_kuittaukset', id);
  const KUITTAUS = { tyyppi: 'Ei havaintoja 30pv', valmentaja_uid: VALM_A_UID, kuittaaja_uid: VP_A_UID, pvm: '2026-07-28' };

  it('VP (johto) kuittaa hälytyksen → sallittu', async () => {
    const db = vpContext(SEURA_A).firestore();
    await assertSucceeds(setDoc(kRef(db, SEURA_A, VALM_A_UID + '__ei_havaintoja_30pv'), KUITTAUS));
  });
  it('Seurasihteeri (johto) kuittaa → sallittu', async () => {
    const db = sihteeriContext(SEURA_A).firestore();
    await assertSucceeds(setDoc(kRef(db, SEURA_A, 'k-siht'), KUITTAUS));
  });
  it('Valmentaja EI kuittaa (ei johtoa) → estetty', async () => {
    const db = valmentajaContext(VALM_A_UID, SEURA_A).firestore();
    await assertFails(setDoc(kRef(db, SEURA_A, 'k-valm'), KUITTAUS));
  });
  it('Toisen seuran johto EI kuittaa seura A:han (tenant-eristys) → estetty', async () => {
    const db = vpContext('kpv').firestore();   // vpContext käyttää VP_A_UID:ta mutta seuraId kpv → onOmaSeura(fcl) false
    await assertFails(setDoc(kRef(db, SEURA_A, 'k-cross'), KUITTAUS));
  });
  it('Oman seuran jäsen lukee kuittaukset (oversight) → sallittu', async () => {
    await testEnv.withSecurityRulesDisabled(async (ctx) => {
      await setDoc(kRef(ctx.firestore(), SEURA_A, 'k-luku'), KUITTAUS);
    });
    const db = valmentajaContext(VALM_A_UID, SEURA_A).firestore();
    await assertSucceeds(getDoc(kRef(db, SEURA_A, 'k-luku')));
  });
  it('KOVA DELETE estetty VP:ltä (audit — vain SA) → estetty', async () => {
    await testEnv.withSecurityRulesDisabled(async (ctx) => {
      await setDoc(kRef(ctx.firestore(), SEURA_A, 'k-del'), KUITTAUS);
    });
    const db = vpContext(SEURA_A).firestore();
    await assertFails(deleteDoc(kRef(db, SEURA_A, 'k-del')));
  });
  it('SA poistaa kuittauksen → sallittu', async () => {
    await testEnv.withSecurityRulesDisabled(async (ctx) => {
      await setDoc(kRef(ctx.firestore(), SEURA_A, 'k-sa-del'), KUITTAUS);
    });
    const db = saContext().firestore();
    await assertSucceeds(deleteDoc(kRef(db, SEURA_A, 'k-sa-del')));
  });
});

/* ── ROSTERIN JAKO (VP) ──────────────────────────────────────────────────────────────
 * Briefi väitti: "rules sallivat VP:n jo — ei sääntömuutosta". Väite on oikea, mutta se
 * nojaa kahteen erilliseen ehtoon jotka on helppo lukea väärin:
 *   pelaajan update vaatii onOmanJoukkueenValmentaja = onOmanSeuranValmentaja(seuraId)
 *   JA (onJohtoRooli() || talenttivalmentaja || oma joukkue).
 * 'vp' on MOLEMMISSA listoissa (onValmentajaRooli sisältää vp:n) → läpi.
 * 'seurasihteeri' on vain onJohtoRooli:ssa → sen kirjoitus EI mene läpi, vaikka se saa
 * luoda joukkueita. Juuri siksi VP_v25:n bulk-siirtopalkki piilotetaan sihteeriltä:
 * nappi joka aina failaa on huonompi kuin ei nappia.
 * Nämä testit lukitsevat molemmat puolet AJAMALLA, ei lukemalla.
 */
describe('rosterin jako — kuka saa siirtää pelaajan joukkueeseen', () => {
  beforeEach(async () => { await seedSeuraAndPelaaja(); });

  const SIIRTO = {
    joukkueet: ['fcl_p14_musta'],
    joukkueetNimet: ['P14 Musta'],
    joukkue: 'P14 Musta',
    joukkueNimi: 'P14 Musta',
  };

  it('VP saa siirtää oman seuran pelaajan toiseen joukkueeseen', async () => {
    const db = vpContext(SEURA_A).firestore();
    await assertSucceeds(updateDoc(doc(db, 'seurat', SEURA_A, 'pelaajat', PELAAJA_UID), SIIRTO));
  });

  it('VP saa luoda joukkueen (siirron kohde voi olla uusi tyhjä joukkue)', async () => {
    const db = vpContext(SEURA_A).firestore();
    await assertSucceeds(setDoc(doc(db, 'seurat', SEURA_A, 'joukkueet', 'fcl_p14_musta'), { nimi: 'P14 Musta' }));
  });

  it('VP EI saa siirtää toisen seuran pelaajaa (tenant-eristys)', async () => {
    const db = vpContext(SEURA_A).firestore();
    await assertFails(updateDoc(doc(db, 'seurat', SEURA_B, 'pelaajat', PELAAJA_B_UID), SIIRTO));
  });

  it('seurasihteeri saa luoda joukkueen MUTTA EI siirtää pelaajaa (siksi UI piilotettu)', async () => {
    const db = sihteeriContext(SEURA_A).firestore();
    await assertSucceeds(setDoc(doc(db, 'seurat', SEURA_A, 'joukkueet', 'fcl_sihteeri_test'), { nimi: 'Testi' }));
    await assertFails(updateDoc(doc(db, 'seurat', SEURA_A, 'pelaajat', PELAAJA_UID), SIIRTO));
  });
});

/**
 * MENTOROINNIT — VP:n sisäinen historia.
 *
 * `mentoroinnit` sai KAIKKI mentorointikirjaukset, myös sisäiset muistiinpanot ja
 * jakamattomat SPL-kenttäkäynnit, ja luku oli `onOmaSeura(seuraId)` → kuka tahansa
 * saman seuran valmentaja saattoi lukea mitä hänestä kirjoitettiin. `nakyvyys:
 * 'sisainen'` oli vain client-suodatin. Sama luokka kuin #563.
 *
 * Jakaminen valmentajalle tapahtuu ERI kokoelman kautta (`viestit`), joten kiristys
 * ei vie valmentajalta mitään — se todistetaan viimeisellä testillä, ei väitetä.
 */
describe('Mentoroinnit — VP:n sisäinen historia (valmentaja EI lue)', () => {
  beforeEach(async () => {
    await seedSeuraAndPelaaja();
    await seedMentorointi();
  });

  it('Valmentaja EI lue sisäistä muistiinpanoa itsestään', async () => {
    const db = valmentajaContext(VALM_A_UID, SEURA_A).firestore();
    await assertFails(getDoc(doc(db, 'seurat', SEURA_A, 'mentoroinnit', 'ment_sisainen')));
  });

  it('Valmentaja EI lue jakamatonta SPL-kenttäkäyntiä', async () => {
    const db = valmentajaContext(VALM_A_UID, SEURA_A).firestore();
    await assertFails(getDoc(doc(db, 'seurat', SEURA_A, 'mentoroinnit', 'ment_spl')));
  });

  it('Valmentaja EI listaa koko kokoelmaa (client-suodatin ei ole suoja)', async () => {
    /* VP hakee "KAIKKI mentoroinnit kerran ja ryhmittelee clientissa". Jos vain
       yksittäishaku olisi estetty, sama data tulisi listauksella. */
    const db = valmentajaContext(VALM_A_UID, SEURA_A).firestore();
    await assertFails(getDocs(collection(db, 'seurat', SEURA_A, 'mentoroinnit')));
  });

  it('Talenttivalmentaja EI lue (valmentajarooli, ei johto)', async () => {
    const db = talenttivalmentajaContext('talval-fcl-001', SEURA_A).firestore();
    await assertFails(getDoc(doc(db, 'seurat', SEURA_A, 'mentoroinnit', 'ment_sisainen')));
  });

  it('Seurasihteeri EI lue — onJohtoRooli() olisi ollut liian laaja', async () => {
    /* Portti nimenomaan tälle: onJohtoRooli() kattaa seurasihteerin, joten sen
       käyttö olisi antanut luvun laajemmin kuin kirjoitusoikeus. Luku ja kirjoitus
       peilaavat toisiaan — tämä testi punertuu jos joku vaihtaa helpperiin. */
    const db = sihteeriContext(SEURA_A).firestore();
    await assertFails(getDoc(doc(db, 'seurat', SEURA_A, 'mentoroinnit', 'ment_sisainen')));
  });

  it('VP lukee oman seuransa mentoroinnit (historia säilyy)', async () => {
    const db = vpContext(SEURA_A).firestore();
    await assertSucceeds(getDoc(doc(db, 'seurat', SEURA_A, 'mentoroinnit', 'ment_sisainen')));
    await assertSucceeds(getDocs(collection(db, 'seurat', SEURA_A, 'mentoroinnit')));
  });

  it('Super admin lukee', async () => {
    const db = saContext().firestore();
    await assertSucceeds(getDoc(doc(db, 'seurat', SEURA_A, 'mentoroinnit', 'ment_sisainen')));
  });

  it('Toisen seuran VP EI lue (tenant-eristys)', async () => {
    const db = vpContext(SEURA_B).firestore();
    await assertFails(getDoc(doc(db, 'seurat', SEURA_A, 'mentoroinnit', 'ment_sisainen')));
  });

  it('EI KATVETTA: valmentaja lukee yhä JAETUN viestin (viestit-kokoelma)', async () => {
    /* Kiristyksen koko turvallisuus lepää tämän varassa: jakokanava on eri
       kokoelma, joten valmentaja ei menetä mitään. Todistetaan, ei väitetä. */
    await seedViesti();
    const db = valmentajaContext(VALM_A_UID, SEURA_A).firestore();
    await assertSucceeds(getDoc(doc(db, 'seurat', SEURA_A, 'viestit', 'viesti1')));
  });
});

/* ══════════════════════════════════════════════════════════════════════════
   H1 — ARVIOINTIKERRAT (append-only + nakyvyys)
   Brief: docs/CODE_BRIEF_ARVIOINTI_HISTORIA_MONIARVIOIJA.md §3
   Ydin: kerta kuuluu ARVIOIJALLE. Toinen arvioija ei muokkaa, 24 h jalkeen ei muokkaa kukaan,
   poisto vain CF:lla, eika seura nae Palloliiton sisaisia kertoja.
══════════════════════════════════════════════════════════════════════════ */
describe('Arviointikerrat — append-only, arvio kuuluu arvioijalle (H1)', () => {
  const PL_UID = 'palloliitto-001';

  const kerta = (uid, lisa) => Object.assign({
    kehys: 'palloliitto', kausi: '2026', pvm: '2026-09-20',
    palloId: '12345678', seuraId_arviohetkella: SEURA_A,
    nakyvyys: 'seuralle', arvioija_uid: uid, arvioija_org: 'seura',
    arvioija_rooli: 'valmentaja', arvioija_nimi: 'Testi Arvioija',
    konteksti: { tyyppi: 'ottelu', pelipaikka: 'KP', minuutit: 60, vastustajataso: 'oma', kuvaus: null, taso_ottelu_id: null },
    tilannekuva: { ika: 13, phv_tila: 'PRE', rae_kvartaali: 'Q2', kehitysvaihe_kaista: 'pre', joukkue: 'FCL U12' },
    kohteet: { pelin_lukeminen: { arvo: 4, pvm: '2026-09-20' } },
    luotu: new Date(), paivitetty: new Date(),
  }, lisa || {});

  async function seedKerta(id, data) {
    await testEnv.withSecurityRulesDisabled(async (context) => {
      await setDoc(doc(context.firestore(), 'seurat', SEURA_A, 'pelaajat', PELAAJA_UID, 'arviointikerrat', id), data);
    });
  }

  beforeEach(async () => {
    await seedAdminDoc();
    await seedSeuraAndPelaaja();
  });

  // ── LUONTI ──────────────────────────────────────────────────────────────
  it('oman joukkueen valmentaja luo kerran omalla uid:lla → sallittu', async () => {
    const db = valmentajaContext(VALM_A_UID, SEURA_A).firestore();
    await assertSucceeds(setDoc(
      doc(db, 'seurat', SEURA_A, 'pelaajat', PELAAJA_UID, 'arviointikerrat', '2026-09-20_valm_ottelu'),
      kerta(VALM_A_UID)));
  });

  it('kerta TOISEN arvioijan nimissa → estetty (arvio kuuluu tekijalleen)', async () => {
    const db = valmentajaContext(VALM_A_UID, SEURA_A).firestore();
    await assertFails(setDoc(
      doc(db, 'seurat', SEURA_A, 'pelaajat', PELAAJA_UID, 'arviointikerrat', '2026-09-20_vaara'),
      kerta(VP_A_UID)));
  });

  it('valmentaja EI luo kertaa MUUN joukkueen pelaajaan → estetty', async () => {
    const db = valmentajaContext(VALM_A_UID, SEURA_A).firestore();
    await assertFails(setDoc(
      doc(db, 'seurat', SEURA_A, 'pelaajat', PELAAJA_A2_UID, 'arviointikerrat', '2026-09-20_muu'),
      kerta(VALM_A_UID)));
  });

  it('tenant-eristys: seuran B valmentaja ei kirjoita seuran A pelaajaan', async () => {
    const db = valmentajaContext(VALM_B_UID, SEURA_B).firestore();
    await assertFails(setDoc(
      doc(db, 'seurat', SEURA_A, 'pelaajat', PELAAJA_UID, 'arviointikerrat', '2026-09-20_tenant'),
      kerta(VALM_B_UID)));
  });

  it('seuran kayttaja EI voi luoda kertaa arvioija_org:palloliitto → estetty', async () => {
    const db = valmentajaContext(VALM_A_UID, SEURA_A).firestore();
    await assertFails(setDoc(
      doc(db, 'seurat', SEURA_A, 'pelaajat', PELAAJA_UID, 'arviointikerrat', '2026-09-20_vaaraorg'),
      kerta(VALM_A_UID, { arvioija_org: 'palloliitto' })));
  });

  it('seuran kayttaja EI voi luoda sisaista kertaa (seuran arviot ovat jaettuja)', async () => {
    const db = valmentajaContext(VALM_A_UID, SEURA_A).firestore();
    await assertFails(setDoc(
      doc(db, 'seurat', SEURA_A, 'pelaajat', PELAAJA_UID, 'arviointikerrat', '2026-09-20_sis'),
      kerta(VALM_A_UID, { nakyvyys: 'sisainen' })));
  });

  // ── MUOKKAUS ────────────────────────────────────────────────────────────
  it('arvioija korjaa omaa kertaansa 24 h sisalla → sallittu', async () => {
    await seedKerta('k-oma', kerta(VALM_A_UID, { luotu: new Date() }));
    const db = valmentajaContext(VALM_A_UID, SEURA_A).firestore();
    await assertSucceeds(updateDoc(
      doc(db, 'seurat', SEURA_A, 'pelaajat', PELAAJA_UID, 'arviointikerrat', 'k-oma'),
      { kohteet: { pelin_lukeminen: { arvo: 3, pvm: '2026-09-20' } }, paivitetty: new Date() }));
  });

  it('25 h vanhan kerran muokkaus → estetty (korjausikkuna umpeutui)', async () => {
    const vanha = new Date(Date.now() - 25 * 3600 * 1000);
    await seedKerta('k-vanha', kerta(VALM_A_UID, { luotu: vanha }));
    const db = valmentajaContext(VALM_A_UID, SEURA_A).firestore();
    await assertFails(updateDoc(
      doc(db, 'seurat', SEURA_A, 'pelaajat', PELAAJA_UID, 'arviointikerrat', 'k-vanha'),
      { kohteet: { pelin_lukeminen: { arvo: 1, pvm: '2026-09-20' } }, paivitetty: new Date() }));
  });

  it('TOINEN arvioija ei muokkaa kertaa vaikka olisi johtoa → estetty', async () => {
    await seedKerta('k-toisen', kerta(VALM_A_UID, { luotu: new Date() }));
    const db = vpContext(SEURA_A).firestore();
    await assertFails(updateDoc(
      doc(db, 'seurat', SEURA_A, 'pelaajat', PELAAJA_UID, 'arviointikerrat', 'k-toisen'),
      { kohteet: { pelin_lukeminen: { arvo: 1, pvm: '2026-09-20' } } }));
  });

  it('arvioijan vaihtaminen omassa kerrassa → estetty', async () => {
    await seedKerta('k-uid', kerta(VALM_A_UID, { luotu: new Date() }));
    const db = valmentajaContext(VALM_A_UID, SEURA_A).firestore();
    await assertFails(updateDoc(
      doc(db, 'seurat', SEURA_A, 'pelaajat', PELAAJA_UID, 'arviointikerrat', 'k-uid'),
      { arvioija_uid: VP_A_UID }));
  });

  // ── POISTO ──────────────────────────────────────────────────────────────
  it('poisto on estetty kaikilta, myos SA:lta (GDPR-poisto kulkee CF:n kautta)', async () => {
    await seedKerta('k-del', kerta(VALM_A_UID, { luotu: new Date() }));
    await assertFails(deleteDoc(
      doc(valmentajaContext(VALM_A_UID, SEURA_A).firestore(), 'seurat', SEURA_A, 'pelaajat', PELAAJA_UID, 'arviointikerrat', 'k-del')));
    await assertFails(deleteDoc(
      doc(saContext().firestore(), 'seurat', SEURA_A, 'pelaajat', PELAAJA_UID, 'arviointikerrat', 'k-del')));
  });

  // ── LUKU + NAKYVYYS ─────────────────────────────────────────────────────
  it('seuran valmentaja lukee JAETUN kerran', async () => {
    await seedKerta('k-jaettu', kerta(VALM_A_UID));
    const db = valmentajaContext(VALM_A_UID, SEURA_A).firestore();
    await assertSucceeds(getDoc(doc(db, 'seurat', SEURA_A, 'pelaajat', PELAAJA_UID, 'arviointikerrat', 'k-jaettu')));
  });

  it('seuran valmentaja EI lue SISAISTA kertaa (Palloliiton oma arvio)', async () => {
    await seedKerta('k-sisainen', kerta(PL_UID, { arvioija_org: 'palloliitto', arvioija_rooli: 'palloliitto', nakyvyys: 'sisainen' }));
    const db = valmentajaContext(VALM_A_UID, SEURA_A).firestore();
    await assertFails(getDoc(doc(db, 'seurat', SEURA_A, 'pelaajat', PELAAJA_UID, 'arviointikerrat', 'k-sisainen')));
  });

  it('seuran kysely ILMAN nakyvyys-rajausta → estetty (Rules ei suodata kyselya)', async () => {
    await seedKerta('k-jaettu', kerta(VALM_A_UID));
    await seedKerta('k-sisainen', kerta(PL_UID, { arvioija_org: 'palloliitto', nakyvyys: 'sisainen' }));
    const db = valmentajaContext(VALM_A_UID, SEURA_A).firestore();
    const kaikki = query(collection(db, 'seurat', SEURA_A, 'pelaajat', PELAAJA_UID, 'arviointikerrat'));
    await assertFails(getDocs(kaikki));
    const rajattu = query(collection(db, 'seurat', SEURA_A, 'pelaajat', PELAAJA_UID, 'arviointikerrat'),
      where('nakyvyys', '==', 'seuralle'));
    await assertSucceeds(getDocs(rajattu));
  });

  it('§7.22: pelaaja (pelaajan PIN) ei lue arviointikertoja', async () => {
    await seedKerta('k-jaettu', kerta(VALM_A_UID));
    const db = testEnv.unauthenticatedContext().firestore();
    await assertFails(getDoc(doc(db, 'seurat', SEURA_A, 'pelaajat', PELAAJA_UID, 'arviointikerrat', 'k-jaettu')));
  });

  it('§7.22: huoltaja ei lue arviointikertoja', async () => {
    await seedKerta('k-jaettu', kerta(VALM_A_UID));
    const db = testEnv.authenticatedContext(HUOLTAJA_UID, { email: 'Huoltaja@Test.fi' }).firestore();
    await assertFails(getDoc(doc(db, 'seurat', SEURA_A, 'pelaajat', PELAAJA_UID, 'arviointikerrat', 'k-jaettu')));
  });

  it('onPalloliitto() on false ilman palloliitto/kayttajat-dokia → ei lue sisaista', async () => {
    await seedKerta('k-sisainen', kerta(PL_UID, { arvioija_org: 'palloliitto', nakyvyys: 'sisainen' }));
    const db = testEnv.authenticatedContext(PL_UID, {}).firestore();
    await assertFails(getDoc(doc(db, 'seurat', SEURA_A, 'pelaajat', PELAAJA_UID, 'arviointikerrat', 'k-sisainen')));
  });
});

/* ══════════════════════════════════════════════════════════════════════════
   Review 1 — SOVELLUKSEN OIKEA PAYLOAD Rulesia vasten.
   Vanha koodi lähetti `luotu: serverTimestamp()` joka kirjoituksella, ja update-sääntö vaatii
   `request.resource.data.luotu == resource.data.luotu` → toinen klikkaus samaan kertaan
   hylättiin. Tynkätesti ei voinut nähdä sitä, eivätkä aiemmat Rules-testit, koska ne käyttivät
   updateDoc:ia joka ei koske luotu-kenttään.
══════════════════════════════════════════════════════════════════════════ */
describe('Arviointikerrat — sovelluksen payload Rulesia vasten (H1, review 1)', () => {
  const payload = (uid, lisa) => Object.assign(AH.tmAhKertaPayload({
    kehys: 'palloliitto', kausi: '2026', pvm: '2026-09-20', palloId: '12345678', seuraId: SEURA_A,
    nakyvyys: 'seuralle',
    arvioija: { uid: uid, nimi: 'Testi Arvioija', rooli: 'valmentaja', org: 'seura' },
    konteksti: { tyyppi: 'ottelu', pelipaikka: 'KP', minuutit: 60, vastustajataso: 'oma' },
    tilannekuva: { ika: 13, phv_tila: 'PRE', rae_kvartaali: 'Q2', kehitysvaihe_kaista: 'pre', joukkue: 'FCL U12' },
    kohteet: { pelin_lukeminen: { arvo: 4, pvm: '2026-09-20' } },
    aikaleima: serverTimestamp(),
  }), lisa || {});

  beforeEach(async () => {
    await seedAdminDoc();
    await seedSeuraAndPelaaja();
  });

  it('1. klikkaus (luonti, luotu mukana) → sallittu', async () => {
    const db = valmentajaContext(VALM_A_UID, SEURA_A).firestore();
    const r = doc(db, 'seurat', SEURA_A, 'pelaajat', PELAAJA_UID, 'arviointikerrat', 'k-app');
    await assertSucceeds(setDoc(r, Object.assign(payload(VALM_A_UID), { luotu: serverTimestamp() }), { merge: true }));
  });

  it('2. klikkaus ILMAN luotu-kenttää → sallittu (korjattu kirjoituspolku)', async () => {
    const db = valmentajaContext(VALM_A_UID, SEURA_A).firestore();
    const r = doc(db, 'seurat', SEURA_A, 'pelaajat', PELAAJA_UID, 'arviointikerrat', 'k-app2');
    await assertSucceeds(setDoc(r, Object.assign(payload(VALM_A_UID), { luotu: serverTimestamp() }), { merge: true }));
    const toinen = payload(VALM_A_UID, { kohteet: { pressing: { arvo: 3, pvm: '2026-09-20' } } });
    await assertSucceeds(setDoc(r, toinen, { merge: true }));   // ei luotu-kenttää
  });

  it('2. klikkaus luotu-kentän kanssa → HYLÄTÄÄN (tämä oli tuotantobugi)', async () => {
    const db = valmentajaContext(VALM_A_UID, SEURA_A).firestore();
    const r = doc(db, 'seurat', SEURA_A, 'pelaajat', PELAAJA_UID, 'arviointikerrat', 'k-app3');
    await assertSucceeds(setDoc(r, Object.assign(payload(VALM_A_UID), { luotu: serverTimestamp() }), { merge: true }));
    await assertFails(setDoc(r, Object.assign(
      payload(VALM_A_UID, { kohteet: { pressing: { arvo: 3, pvm: '2026-09-20' } } }),
      { luotu: serverTimestamp() }), { merge: true }));
  });

  it('jaettu payload ei sisällä luotu-kenttää (kirjoituspolku lisää sen vain luonnissa)', () => {
    expect(Object.keys(payload(VALM_A_UID))).not.toContain('luotu');
  });

  /* Review-kierros 2, löydös A: kirjoitus alkaa tx.get():lla, ja päivän ensimmäisellä
     klikkauksella dokumenttia EI OLE. Jos lukusääntö evaluoi `resource.data.nakyvyys`
     olemattomalle dokumentille, luku hylätään ja koko transaktio kaatuu ennen kirjoitusta —
     jokaisella seuran käyttäjällä, mutta EI super-adminilla (onSuperAdmin osuu ketjussa ensin),
     joten pelkkä SA-testaus näyttäisi toimivalta. */
  it('valmentaja saa lukea OLEMATTOMAN kerran (muuten tx.get kaataa 1. klikkauksen)', async () => {
    const db = valmentajaContext(VALM_A_UID, SEURA_A).firestore();
    await assertSucceeds(getDoc(doc(db, 'seurat', SEURA_A, 'pelaajat', PELAAJA_UID, 'arviointikerrat', 'ei-ole-olemassa')));
  });

  it('SOVELLUKSEN TRANSAKTIO valmentajana: 1. klikkaus läpi (get + kerta + pikakenttä)', async () => {
    const db = valmentajaContext(VALM_A_UID, SEURA_A).firestore();
    const kertaRef = doc(db, 'seurat', SEURA_A, 'pelaajat', PELAAJA_UID, 'arviointikerrat', 'k-tx1');
    const pelaajaRef = doc(db, 'seurat', SEURA_A, 'pelaajat', PELAAJA_UID);
    await assertSucceeds(runTransaction(db, async (tx) => {
      const snap = await tx.get(kertaRef);
      const data = Object.assign({}, payload(VALM_A_UID));
      if (!snap.exists()) data.luotu = serverTimestamp();
      tx.set(kertaRef, data, { merge: true });
      tx.set(pelaajaRef, { arviointi_havaittu: { pelin_lukeminen: 4 }, arviointi_pvm: '2026-09-20' }, { merge: true });
    }));
  });

  it('SOVELLUKSEN TRANSAKTIO valmentajana: 2. klikkaus samaan kertaan läpi', async () => {
    const db = valmentajaContext(VALM_A_UID, SEURA_A).firestore();
    const kertaRef = doc(db, 'seurat', SEURA_A, 'pelaajat', PELAAJA_UID, 'arviointikerrat', 'k-tx2');
    const pelaajaRef = doc(db, 'seurat', SEURA_A, 'pelaajat', PELAAJA_UID);
    const kirjoita = (avain, arvo) => runTransaction(db, async (tx) => {
      const snap = await tx.get(kertaRef);
      const kohteet = {}; kohteet[avain] = { arvo: arvo, pvm: '2026-09-20' };
      const data = Object.assign({}, payload(VALM_A_UID, { kohteet: kohteet }));
      if (!snap.exists()) data.luotu = serverTimestamp();
      tx.set(kertaRef, data, { merge: true });
      tx.set(pelaajaRef, { arviointi_pvm: '2026-09-20' }, { merge: true });
    });
    await assertSucceeds(kirjoita('pelin_lukeminen', 4));
    await assertSucceeds(kirjoita('pressing', 3));
  });

  it('kohteen poisto (Ei nähty) omasta kerrasta 24 h sisällä → sallittu', async () => {
    const db = valmentajaContext(VALM_A_UID, SEURA_A).firestore();
    const r = doc(db, 'seurat', SEURA_A, 'pelaajat', PELAAJA_UID, 'arviointikerrat', 'k-del-kohde');
    await assertSucceeds(setDoc(r, Object.assign(payload(VALM_A_UID), { luotu: serverTimestamp() }), { merge: true }));
    await assertSucceeds(updateDoc(r, { 'kohteet.pelin_lukeminen': deleteField(), paivitetty: serverTimestamp() }));
  });
});

/* ══ KENTTÄTARKKAILUT — kohdennettu pelihavainto (v3.20) ══════════════════
   Oma kokoelma, EI `havainnot`. Ratkaiseva ero: `havainnot`-lukusääntö sisältää
   onAnonymous()-ehdon (pelaajan PIN-istunto) eikä sitä ole rajattu omaan pelaajaan.
   Kenttätarkkailu on valmentajan havainto alaikäisestä, eikä sitä näytetä pelaajalle. */
describe('Kenttätarkkailut — valmentajan havainto, EI pelaajalle (v3.20)', () => {
  const tarkkailu = (uid, lisa2) => Object.assign({
    tyyppi: 'kenttatarkkailu',
    palloId: '12345678', pelaajaId: PELAAJA_UID, seuraId: SEURA_A, valmentajaUid: uid,
    tila: 'valmis',
    ottelu: { kalenteriId: null, vastustaja: 'FC X', pvm: '2026-09-28', pelimuoto: '11v11' },
    puoliaika: 1, suunta: { hyokkaysOikealle: true, seisoo: 'lahi' },
    ikataso: 'u1315', pelipaikka: 'LA', kirjattavat: ['syotto', 'laukaus'], jaksofokus: null,
    malli: { xt: 'singh_12x8_v1', xg: 'xg_geom_v0_esimerkki', boksi: 'boksi_v0_esimerkki' },
    merkinnat: [{ id: 1, t: 250, tyyppi: 'laukaus', piste: { len: 88, wid: 50 }, tulos: 'torjuttu' }],
    lahde: 'live',
    luotu: new Date(),
  }, lisa2 || {});

  const polku = (db, pid, id) => doc(db, 'seurat', SEURA_A, 'pelaajat', pid || PELAAJA_UID, 'kenttatarkkailut', id);
  /* v3.20 id-lukko: doc-id on paatyttava KIRJOITTAJAN uid:hen. Jos assertFails-testi kayttaisi
     muuta id:ta, se kaatuisi id-lukkoon eika siihen saantoon jota se vaittaa testaavansa —
     eli olisi vihrea vaarasta syysta. Siksi jokainen luontitesti rakentaa id:n tekijan uid:sta. */
  const idOma = (uid, etuliite) => (etuliite || '2026-09-28_1000') + '_' + uid;

  async function seedTarkkailu(id, data) {
    await testEnv.withSecurityRulesDisabled(async (context) => {
      await setDoc(doc(context.firestore(), 'seurat', SEURA_A, 'pelaajat', PELAAJA_UID, 'kenttatarkkailut', id), data);
    });
  }

  beforeEach(async () => {
    await seedAdminDoc();
    await seedSeuraAndPelaaja();
  });

  // ── LUKU ────────────────────────────────────────────────────────────────
  /* VP-POLKU (2026-09-28): "vp pääsi nyt sisään mutta tallennus epäonnistui". Tämä pari
     erottaa kaksi mahdollista syytä: onko säännössä vika vai tunnuksessa. Jos tämä on
     vihreä, sääntö sallii VP:n luonnin — ja jos tallennus silti epäonnistuu tuotannossa,
     syy on claimissa (rooli ei ole 'vp') tai datassa, ei säännössä.
     Pelaaja ILMAN joukkuetta on tarkoituksellinen: se on tiukin tapaus, koska pelkkä
     valmentaja ei pääse siihen käsiksi lainkaan. */
  async function seedJoukkueetonPelaaja() {
    await testEnv.withSecurityRulesDisabled(async (context) => {
      await setDoc(doc(context.firestore(), 'seurat', SEURA_A, 'pelaajat', 'p-ei-joukkuetta'), {
        etunimi: 'Ei', sukunimi: 'Joukkuetta', seuraId: SEURA_A, joukkueet: [], aktiivinen: true,
      });
    });
  }

  it('VP luo kenttätarkkailun myös pelaajalle jolla EI ole joukkuetta', async () => {
    await seedJoukkueetonPelaaja();
    const db = vpContext(SEURA_A).firestore();
    await assertSucceeds(setDoc(polku(db, 'p-ei-joukkuetta', idOma(VP_A_UID)), tarkkailu(VP_A_UID)));
  });

  it('EI VACUOUS: pelkkä valmentaja EI luo joukkueettomalle pelaajalle', async () => {
    await seedJoukkueetonPelaaja();
    const db = valmentajaContext(VALM_A_UID, SEURA_A).firestore();
    await assertFails(setDoc(polku(db, 'p-ei-joukkuetta', idOma(VALM_A_UID)), tarkkailu(VALM_A_UID)));
  });

  it('TIETOSUOJA: anonyymi PIN-istunto EI lue kenttätarkkailua', async () => {
    await seedTarkkailu('t1', tarkkailu(VALM_A_UID));
    await assertFails(getDoc(polku(anonContext().firestore(), null, 't1')));
  });

  it('TIETOSUOJA: huoltaja EI lue kenttätarkkailua', async () => {
    await seedTarkkailu('t1', tarkkailu(VALM_A_UID));
    await assertFails(getDoc(polku(huoltajaContext().firestore(), null, 't1')));
  });

  it('toisen seuran valmentaja EI lue (tenant-eristys)', async () => {
    await seedTarkkailu('t1', tarkkailu(VALM_A_UID));
    await assertFails(getDoc(polku(valmentajaContext(VALM_B_UID, SEURA_B).firestore(), null, 't1')));
  });

  it('EI VACUOUS: oman seuran valmentaja, johto ja SA lukevat', async () => {
    await seedTarkkailu('t1', tarkkailu(VALM_A_UID));
    await assertSucceeds(getDoc(polku(valmentajaContext(VALM_A_UID, SEURA_A).firestore(), null, 't1')));
    await assertSucceeds(getDoc(polku(vpContext(SEURA_A).firestore(), null, 't1')));
    await assertSucceeds(getDoc(polku(saContext().firestore(), null, 't1')));
  });

  it('toisen valmentajan tarkkailu on luettavissa omassa seurassa (yhteinen työkalu)', async () => {
    await seedTarkkailu('t1', tarkkailu(VP_A_UID));
    await assertSucceeds(getDoc(polku(valmentajaContext(VALM_A_UID, SEURA_A).firestore(), null, 't1')));
  });

  // ── LUONTI ──────────────────────────────────────────────────────────────
  it('oman joukkueen valmentaja luo tarkkailun omalla uid:lla → sallittu', async () => {
    const db = valmentajaContext(VALM_A_UID, SEURA_A).firestore();
    await assertSucceeds(setDoc(polku(db, null, idOma(VALM_A_UID)), tarkkailu(VALM_A_UID)));
  });

  it('tarkkailu TOISEN valmentajan nimissä → estetty', async () => {
    const db = valmentajaContext(VALM_A_UID, SEURA_A).firestore();
    await assertFails(setDoc(polku(db, null, idOma(VALM_A_UID)), tarkkailu(VP_A_UID)));
  });

  it('valmentaja EI luo MUUN joukkueen pelaajaan → estetty', async () => {
    const db = valmentajaContext(VALM_A_UID, SEURA_A).firestore();
    await assertFails(setDoc(polku(db, PELAAJA_A2_UID, idOma(VALM_A_UID)), tarkkailu(VALM_A_UID)));
  });

  it('tenant-eristys: seuran B valmentaja ei kirjoita seuran A pelaajaan', async () => {
    const db = valmentajaContext(VALM_B_UID, SEURA_B).firestore();
    await assertFails(setDoc(polku(db, null, idOma(VALM_B_UID)), tarkkailu(VALM_B_UID)));
  });

  it('anonyymi EI luo tarkkailua', async () => {
    await assertFails(setDoc(polku(anonContext().firestore(), null, idOma(ANON_UID)), tarkkailu(ANON_UID)));
  });

  it('luotu-vartija: ilman kelvollista luotu-kenttää luonti estyy (A5)', async () => {
    const db = valmentajaContext(VALM_A_UID, SEURA_A).firestore();
    const ilman = tarkkailu(VALM_A_UID);
    delete ilman.luotu;
    await assertFails(setDoc(polku(db, null, idOma(VALM_A_UID, 'eiluotua')), ilman));
    await assertFails(setDoc(polku(db, null, idOma(VALM_A_UID, 'strluotu')),
      Object.assign({}, tarkkailu(VALM_A_UID), { luotu: '2026-09-28' })));
  });

  // ── KIELLETYT KENTÄT ────────────────────────────────────────────────────
  /* Nämä kääntäisivät toisen näkymän tulkitsemaan dokumentin väärin: Masterin
     paivitaAdarPikakentat lukisi `pisteet`:n ADAR-pisteinä, ja Pelaaja_v7 näyttäisi
     `narratiivi`/`teksti`/`oppimisnakokohta`-kentän lapselle. */
  it.each(['pisteet', 'narratiivi', 'teksti', 'oppimisnakokohta'])(
    'kielletty kenttä %s estää luonnin', async (kentta) => {
      const db = valmentajaContext(VALM_A_UID, SEURA_A).firestore();
      const data = tarkkailu(VALM_A_UID);
      data[kentta] = kentta === 'pisteet' ? { a: 3 } : 'tekstiä lapselle';
      await assertFails(setDoc(polku(db, null, idOma(VALM_A_UID, 'kielletty')), data));
    });

  it.each(['pisteet', 'narratiivi', 'teksti', 'oppimisnakokohta'])(
    'kielletty kenttä %s estää myös päivityksen', async (kentta) => {
      await seedTarkkailu('t1', tarkkailu(VALM_A_UID));
      const db = valmentajaContext(VALM_A_UID, SEURA_A).firestore();
      const data = tarkkailu(VALM_A_UID);
      data[kentta] = kentta === 'pisteet' ? { a: 3 } : 'tekstiä lapselle';
      await assertFails(setDoc(polku(db, null, 't1'), data));
    });

  // ── ID-LUKKO JA TEKIJÄN MUUTTUMATTOMUUS (review 3) ──────────────────────
  /* Ilman id-lukkoa valmentaja voisi varata dokumentin TOISEN uid:llä päättyvällä id:llä. Kun
     tämä toinen sitten tallentaisi omansa, kirjoitus olisi update eikä create — ja update-sääntö
     torjuisi sen, koska resource.data.valmentajaUid ei ole hän. Hiljainen lukko. */
  it('id ei saa päättyä TOISEN valmentajan uid:hen', async () => {
    const db = valmentajaContext(VALM_A_UID, SEURA_A).firestore();
    await assertFails(setDoc(polku(db, null, idOma(VP_A_UID)), tarkkailu(VALM_A_UID)));
  });

  it('EI VACUOUS: omalla uid:llä päättyvä id kelpaa', async () => {
    const db = valmentajaContext(VALM_A_UID, SEURA_A).firestore();
    await assertSucceeds(setDoc(polku(db, null, idOma(VALM_A_UID)), tarkkailu(VALM_A_UID)));
  });

  it('tekijää ei voi vaihtaa päivityksessä (dokumenttia ei siirretä toisen nimiin)', async () => {
    await seedTarkkailu('t1', tarkkailu(VALM_A_UID));
    const db = valmentajaContext(VALM_A_UID, SEURA_A).firestore();
    await assertFails(setDoc(polku(db, null, 't1'),
      Object.assign({}, tarkkailu(VALM_A_UID), { valmentajaUid: VP_A_UID })));
  });

  // ── PÄIVITYS ────────────────────────────────────────────────────────────
  it('sama valmentaja päivittää oman tarkkailunsa (2. puoliaika samaan dokumenttiin)', async () => {
    await seedTarkkailu('t1', tarkkailu(VALM_A_UID));
    const db = valmentajaContext(VALM_A_UID, SEURA_A).firestore();
    await assertSucceeds(setDoc(polku(db, null, 't1'),
      Object.assign({}, tarkkailu(VALM_A_UID), { puoliaika: 2 })));
  });

  it('TOISEN valmentajan tarkkailua ei muokata', async () => {
    await seedTarkkailu('t1', tarkkailu(VP_A_UID));
    const db = valmentajaContext(VALM_A_UID, SEURA_A).firestore();
    await assertFails(setDoc(polku(db, null, 't1'),
      Object.assign({}, tarkkailu(VP_A_UID), { puoliaika: 2 })));
  });

  it('anonyymi ei päivitä (toisin kuin havainnot-kokoelmassa)', async () => {
    await seedTarkkailu('t1', tarkkailu(VALM_A_UID));
    await assertFails(setDoc(polku(anonContext().firestore(), null, 't1'),
      Object.assign({}, tarkkailu(VALM_A_UID), { puoliaika: 2 })));
  });

  // ── POISTO ──────────────────────────────────────────────────────────────
  it('valmentaja ei poista, johto ja SA poistavat', async () => {
    await seedTarkkailu('t1', tarkkailu(VALM_A_UID));
    await assertFails(deleteDoc(polku(valmentajaContext(VALM_A_UID, SEURA_A).firestore(), null, 't1')));
    await assertSucceeds(deleteDoc(polku(vpContext(SEURA_A).firestore(), null, 't1')));
    await seedTarkkailu('t2', tarkkailu(VALM_A_UID));
    await assertSucceeds(deleteDoc(polku(saContext().firestore(), null, 't2')));
  });
});

/* ══ HAVAINNON KUMOAMINEN (v3.21) ═════════════════════════════════════════
   Kumoaminen on tilamuutos eikä poisto. Vain TEKIJÄ saa perua oman havaintonsa — muuten toinen
   valmentaja voisi pyyhkiä kollegan arvion peliälystä pois. */
describe('Havainnon kumoaminen — vain tekijä (v3.21)', () => {
  const polkuH = (db, id) => doc(db, 'seurat', SEURA_A, 'pelaajat', PELAAJA_UID, 'havainnot', id || 'hav-kumo');

  async function seedKumottava(tekija) {
    await testEnv.withSecurityRulesDisabled(async (context) => {
      await setDoc(polkuH(context.firestore()), {
        tyyppi: 'adar_pikakortti', tila: 'valmis', pelaaja_lukenut: false,
        tekija_uid: tekija, pisteet: { A: 2, D: 1 },
        luotu: new Date(), pvm: '2026-09-28',
        nakyvyys: 'pelaaja',   // v3.22: P6-kuittaustesti vaatii pelaajalle näkyvän havainnon
      });
    });
  }

  const peru = { tila: 'peruttu', peruttu: new Date(), peruttu_uid: VALM_A_UID };

  beforeEach(async () => {
    await seedAdminDoc();
    await seedSeuraAndPelaaja();
  });

  it('tekijä voi perua oman havaintonsa', async () => {
    await seedKumottava(VALM_A_UID);
    const db = valmentajaContext(VALM_A_UID, SEURA_A).firestore();
    await assertSucceeds(updateDoc(polkuH(db), peru));
  });

  it('toinen saman joukkueen valmentaja EI voi perua', async () => {
    await seedKumottava(VP_A_UID);
    const db = valmentajaContext(VALM_A_UID, SEURA_A).firestore();
    await assertFails(updateDoc(polkuH(db), Object.assign({}, peru, { peruttu_uid: VALM_A_UID })));
  });

  it('pelaaja (PIN) EI voi perua', async () => {
    await seedKumottava(VALM_A_UID);
    await assertFails(updateDoc(polkuH(pelaajaItseContext().firestore()), peru));
  });

  it('pisteitä ei voi muuttaa samassa kirjoituksessa (peruttua ei "korjata" hiljaa)', async () => {
    await seedKumottava(VALM_A_UID);
    const db = valmentajaContext(VALM_A_UID, SEURA_A).firestore();
    await assertFails(updateDoc(polkuH(db), Object.assign({}, peru, { pisteet: { A: 3, D: 3 } })));
  });

  it('SA voi perua kenen tahansa havainnon', async () => {
    await seedKumottava(VP_A_UID);
    await assertSucceeds(updateDoc(polkuH(saContext().firestore()), peru));
  });

  /* Sääntö saa koskea VAIN peruutukseen — tavallinen päivitys ei saa kiristyä. */
  it('EI VACUOUS: tavallinen päivitys toimii yhä toisen havaintoon', async () => {
    await seedKumottava(VP_A_UID);
    const db = valmentajaContext(VALM_A_UID, SEURA_A).firestore();
    await assertSucceeds(updateDoc(polkuH(db), { narratiivi: 'täydennys' }));
  });

  it('pelaaja saa yhä merkitä luetuksi (P6-kuittaus ennallaan)', async () => {
    await seedKumottava(VALM_A_UID);
    await assertSucceeds(updateDoc(polkuH(pelaajaItseContext().firestore()), { pelaaja_lukenut: true }));
  });

  /* Peruutus ei saa olla kumottavissa: ilman lukkoa kuka tahansa joukkueen valmentaja voisi
     palauttaa perutun havainnon 'valmis'-tilaan tai muuttaa sen pisteitä. */
  describe('jo peruttu havainto on lukittu', () => {
    async function seedPeruttu() {
      await testEnv.withSecurityRulesDisabled(async (context) => {
        await setDoc(polkuH(context.firestore(), 'hav-jo-peruttu'), {
          tyyppi: 'adar_pikakortti', tila: 'peruttu', tekija_uid: VALM_A_UID,
          pisteet: { A: 2 }, luotu: new Date(), peruttu_uid: VALM_A_UID,
        });
      });
    }

    it('tekijä EI voi palauttaa sitä valmis-tilaan', async () => {
      await seedPeruttu();
      const db = valmentajaContext(VALM_A_UID, SEURA_A).firestore();
      await assertFails(updateDoc(polkuH(db, 'hav-jo-peruttu'), { tila: 'valmis' }));
    });

    it('toinen valmentaja EI voi muuttaa sen pisteitä', async () => {
      await seedPeruttu();
      const db = valmentajaContext(VP_A_UID, SEURA_A).firestore();
      await assertFails(updateDoc(polkuH(db, 'hav-jo-peruttu'), { pisteet: { A: 3 } }));
    });

    it('pelaaja EI voi koskea siihen', async () => {
      await seedPeruttu();
      await assertFails(updateDoc(polkuH(pelaajaItseContext().firestore(), 'hav-jo-peruttu'), { pelaaja_lukenut: true }));
    });

    it('SA voi korjata (hallintatoimi)', async () => {
      await seedPeruttu();
      await assertSucceeds(updateDoc(polkuH(saContext().firestore(), 'hav-jo-peruttu'), { tila: 'valmis' }));
    });
  });

  /* v3.23 — PERUMISEN OIKEUS LAAJENI. Juurisyy: `valmentaja_viesti`-dokumenteilla ei ole
     `tekija_uid`-kenttää vaan `valmentajaUid`, joten viestin kirjoittaja EI voinut perua
     omaa viestiään — vain SA pystyi. Lisäksi seuran johdon on voitava poistaa asiaton
     teksti lapsen näkymistä. */
  async function seedViestiDoc(lahettaja) {
    await testEnv.withSecurityRulesDisabled(async (context) => {
      await setDoc(polkuH(context.firestore()), {
        tyyppi: 'valmentaja_viesti', tila: 'valmis', nakyvyys: 'pelaaja',
        teksti: 'Hyvä treeni', valmentajaUid: lahettaja,
        pelaaja_lukenut: false, luotu: new Date(), pvm: '2026-09-28',
      });
    });
  }

  it('viestin kirjoittaja voi perua OMAN viestinsä (valmentajaUid)', async () => {
    await seedViestiDoc(VALM_A_UID);
    const db = valmentajaContext(VALM_A_UID, SEURA_A).firestore();
    await assertSucceeds(updateDoc(polkuH(db), peru));
  });

  it('toinen valmentaja EI voi perua kollegan viestiä', async () => {
    await seedViestiDoc(VALM_A_UID);
    const db = valmentajaContext(VALM_B_UID, SEURA_A).firestore();
    await assertFails(updateDoc(polkuH(db), { ...peru, peruttu_uid: VALM_B_UID }));
  });

  it('VP voi perua toisen valmentajan havainnon (asiaton teksti)', async () => {
    await seedKumottava(VALM_A_UID);
    const db = vpContext(SEURA_A).firestore();
    await assertSucceeds(updateDoc(polkuH(db), { ...peru, peruttu_uid: VP_A_UID }));
  });

  it('VP EI voi perua TOISEN SEURAN merkintää', async () => {
    await seedKumottava(VALM_A_UID);
    const db = vpContext(SEURA_B).firestore();
    await assertFails(updateDoc(polkuH(db), { ...peru, peruttu_uid: VP_A_UID }));
  });

  it('VP ei voi muuttaa pisteitä samassa kirjoituksessa', async () => {
    await seedKumottava(VALM_A_UID);
    const db = vpContext(SEURA_A).firestore();
    await assertFails(updateDoc(polkuH(db), { ...peru, pisteet: { A: 3 } }));
  });
});

/* ══ NÄKYVYYS (v3.22) ═════════════════════════════════════════════════════
   Anonyymi pelaajaistunto ja huoltaja näkivät kaikki valmiit havainnot, joten Taso 1:n
   "Valmentajan muistiinpano" meni 8–12-vuotiaalle sellaisenaan. Nyt kumpikin näkee vain
   havainnot, jotka valmentaja on merkinnyt pelaajalle. */
describe('Havainnon näkyvyys — vain merkityt pelaajalle (v3.22)', () => {
  const polkuN = (db, id) => doc(db, 'seurat', SEURA_A, 'pelaajat', PELAAJA_UID, 'havainnot', id);

  async function seedNak(id, nakyvyys) {
    await testEnv.withSecurityRulesDisabled(async (context) => {
      const data = {
        tyyppi: 'adar_pikakortti', tila: 'valmis', pelaaja_lukenut: false,
        tekija_uid: VALM_A_UID, narratiivi: 'Hyvä liike', pisteet: { A: 2 }, luotu: new Date(),
      };
      if (nakyvyys !== undefined) data.nakyvyys = nakyvyys;
      await setDoc(polkuN(context.firestore(), id), data);
    });
  }

  beforeEach(async () => {
    await seedAdminDoc();
    await seedSeuraAndPelaaja();
  });

  // ── LUKU ────────────────────────────────────────────────────────────────
  it('pelaaja lukee pelaajalle merkityn', async () => {
    await seedNak('n-pelaaja', 'pelaaja');
    await assertSucceeds(getDoc(polkuN(pelaajaItseContext().firestore(), 'n-pelaaja')));
  });

  it('pelaaja EI lue valmentajille merkittyä', async () => {
    await seedNak('n-valm', 'valmentajat');
    await assertFails(getDoc(polkuN(pelaajaItseContext().firestore(), 'n-valm')));
  });

  /* Migraatio asettaa vanhoille 'pelaaja'. Puuttuva arvo tarkoittaa siis kirjoitusta, joka ei
     ole käynyt kytkimen läpi — fail-closed. */
  it('pelaaja EI lue havaintoa jolta kenttä puuttuu (fail-closed)', async () => {
    await seedNak('n-puuttuu', undefined);
    await assertFails(getDoc(polkuN(pelaajaItseContext().firestore(), 'n-puuttuu')));
  });

  it.each([['pelaaja', true], ['valmentajat', false]])(
    'huoltaja ja nakyvyys=%s → sallittu=%s', async (arvo, sallittu) => {
      await seedNak('n-h-' + arvo, arvo);
      const p = getDoc(polkuN(huoltajaContext().firestore(), 'n-h-' + arvo));
      if (sallittu) await assertSucceeds(p); else await assertFails(p);
    });

  it('valmentaja lukee kaikki (näkyvyys ei rajaa henkilöstöä)', async () => {
    await seedNak('n-valm2', 'valmentajat');
    const db = valmentajaContext(VALM_A_UID, SEURA_A).firestore();
    await assertSucceeds(getDoc(polkuN(db, 'n-valm2')));
  });

  // ── ANONYYMIN KIRJOITUS ─────────────────────────────────────────────────
  it('pelaaja voi merkitä luetuksi', async () => {
    await seedNak('n-luku', 'pelaaja');
    await assertSucceeds(updateDoc(polkuN(pelaajaItseContext().firestore(), 'n-luku'), { pelaaja_lukenut: true }));
  });

  /* Anonyymi sai aiemmin muuttaa MITÄ TAHANSA kenttää — myös omia pisteitään ja näkyvyyttään. */
  it.each([
    ['pisteet', { pisteet: { A: 3 } }],
    ['narratiivi', { narratiivi: 'muutettu' }],
    ['tila', { tila: 'luonnos' }],
    ['nakyvyys', { nakyvyys: 'valmentajat' }],
  ])('anonyymi EI voi muuttaa kenttää %s', async (_n, muutos) => {
    await seedNak('n-kirj', 'pelaaja');
    await assertFails(updateDoc(polkuN(pelaajaItseContext().firestore(), 'n-kirj'), muutos));
  });

  it('pelaaja ei voi liittää lukukuittaukseen muuta kenttää', async () => {
    await seedNak('n-yhd', 'pelaaja');
    await assertFails(updateDoc(polkuN(pelaajaItseContext().firestore(), 'n-yhd'),
      { pelaaja_lukenut: true, pisteet: { A: 3 } }));
  });

  it('pelaaja ei voi kuitata valmentajille merkittyä', async () => {
    await seedNak('n-valm3', 'valmentajat');
    await assertFails(updateDoc(polkuN(pelaajaItseContext().firestore(), 'n-valm3'), { pelaaja_lukenut: true }));
  });

  // ── LIST-KYSELY ─────────────────────────────────────────────────────────
  /* Firestore hyväksyy LIST-kyselyn vain jos sääntö toteutuu KAIKILLE mahdollisille
     osumille. Siksi `nakyvyys`-ehto on pakko olla itse kyselyssä — ei vain suodattimena
     clientissä. Tämä pari pitää Pelaaja_v7:n kyselyn ja säännön synkassa: jos
     `_p6KaynnistakuuntelIja`:sta poistaisi ehdon, alempi testi kertoo että listener
     lakkaisi toimimasta kokonaan (ei siis "vuotaisi" vaan hylkäisi kyselyn). */
  const listKysely = (db, ehdot) => query(
    collection(db, 'seurat', SEURA_A, 'pelaajat', PELAAJA_UID, 'havainnot'), ...ehdot);

  it('pelaaja LIST nakyvyys-ehdolla → sallittu', async () => {
    await seedNak('n-list', 'pelaaja');
    await assertSucceeds(getDocs(listKysely(pelaajaItseContext().firestore(),
      [where('tila', '==', 'valmis'), where('nakyvyys', '==', 'pelaaja'), limit(50)])));
  });

  it('pelaaja LIST ILMAN nakyvyys-ehtoa → hylätty', async () => {
    await seedNak('n-list2', 'pelaaja');
    await assertFails(getDocs(listKysely(pelaajaItseContext().firestore(),
      [where('tila', '==', 'valmis'), limit(50)])));
  });

  /* Vanhempi_v2 lukee saman kokoelman ERI kyselyllä (tyyppi:'valmentaja_viesti') ja
     anonyymina (r.1443). Se rikkoutui katselmoinnissa juuri tästä: ilman nakyvyys-ehtoa
     koko kysely hylätään, jolloin Viestit-välilehti tyhjenee myös vanhoista viesteistä
     — ei siis vuoda vaan katoaa. */
  async function seedViesti(id) {
    await testEnv.withSecurityRulesDisabled(async (context) => {
      await setDoc(polkuN(context.firestore(), id), {
        tyyppi: 'valmentaja_viesti', tila: 'valmis', nakyvyys: 'pelaaja',
        teksti: 'Hienoa työtä!', valmentajaUid: VALM_A_UID,
        pelaaja_lukenut: false, vanhempi_lukenut: false, luotu: new Date(),
      });
    });
  }

  it('Vanhempi_v2:n kysely (tyyppi + nakyvyys) → sallittu', async () => {
    await seedViesti('n-viesti');
    await assertSucceeds(getDocs(listKysely(huoltajaContext().firestore(),
      [where('tyyppi', '==', 'valmentaja_viesti'), where('nakyvyys', '==', 'pelaaja'), limit(20)])));
  });

  it('Vanhempi_v2:n kysely ILMAN nakyvyys-ehtoa → hylätty', async () => {
    await seedViesti('n-viesti2');
    await assertFails(getDocs(listKysely(huoltajaContext().firestore(),
      [where('tyyppi', '==', 'valmentaja_viesti'), limit(20)])));
  });
});

/* ══════════════════════════════════════════════════════════════════════════════════════════
   VAIHE 0 · TAVOITETILA (CODE_BRIEF_PELAAJAN_TUNNISTUS v2) — VIHREÄ v3.28:sta (PR 3)
   PR 0 kirjasi nämä punaisina (`it.fails`) NYKYTILA-parien kanssa; PR 3 sulki anonyymin pääsyn,
   joten `.fails` ja NYKYTILA-parit on poistettu. Anonyymi istunto on yhä mahdollinen julkisella
   avaimella (kunnes provider suljetaan), joten nämä pysyvät regressiovartijoina.
══════════════════════════════════════════════════════════════════════════════════════════ */
describe('Vaihe 0 · tavoitetila (v3.28: anonyymi suljettu)', () => {
  beforeEach(async () => { await seedSeuraAndPelaaja(); });

  const kirjaus = () => ({ tyyppi: 'T', tehty: true, kesto_min: 30, fiilinki: 4, rpe: 6, lahde: 'pelaaja', luotu: new Date() });

  /* EI VACUOUS: jokainen evätty operaatio ajetaan ensin oikealla identiteetillä (assertSucceeds),
     joten assertFails ei voi mennä läpi kirjoitusvirheestä (väärä polku / puuttuva seed). */
  it('anonyymi listaa toisen seuran pelaajat → evätty (seuran VP listaa)', async () => {
    await assertSucceeds(getDocs(collection(vpContext(SEURA_B).firestore(), 'seurat', SEURA_B, 'pelaajat')));
    await assertFails(getDocs(collection(anonContext().firestore(), 'seurat', SEURA_B, 'pelaajat')));
  });
  it('anonyymi hakee yksittäisen toisen seuran pelaajan → evätty (pelaaja itse hakee)', async () => {
    await assertSucceeds(getDoc(doc(pelaajaContext(SEURA_B, PELAAJA_B_UID).firestore(), 'seurat', SEURA_B, 'pelaajat', PELAAJA_B_UID)));
    await assertFails(getDoc(doc(anonContext().firestore(), 'seurat', SEURA_B, 'pelaajat', PELAAJA_B_UID)));
  });
  it('anonyymi luo kirjaukset-merkinnän → evätty (pelaaja itse luo)', async () => {
    await assertFails(setDoc(
      doc(anonContext().firestore(), 'seurat', SEURA_B, 'pelaajat', PELAAJA_B_UID, 'kirjaukset', '2026-09-29'), kirjaus()));
    await assertSucceeds(setDoc(
      doc(pelaajaContext(SEURA_B, PELAAJA_B_UID).firestore(), 'seurat', SEURA_B, 'pelaajat', PELAAJA_B_UID, 'kirjaukset', '2026-09-29'), kirjaus()));
  });
  /* Pelaaja A = PELAAJA_UID (seura A), pelaaja B = PELAAJA_A2_UID (sama seura). Ennen v3.28:aa
     anonyymi PIN-istunto ei kantanut pelaajan identiteettiä, joten A:n istunto luki B:n dokumentin. */
  it('pelaajatunnus A lukee pelaajan B samassa seurassa → evätty (B itse lukee)', async () => {
    await assertSucceeds(getDoc(doc(pelaajaContext(SEURA_A, PELAAJA_A2_UID).firestore(), 'seurat', SEURA_A, 'pelaajat', PELAAJA_A2_UID)));
    await assertFails(getDoc(doc(anonContext().firestore(), 'seurat', SEURA_A, 'pelaajat', PELAAJA_A2_UID)));
    await assertFails(getDoc(doc(pelaajaItseContext().firestore(), 'seurat', SEURA_A, 'pelaajat', PELAAJA_A2_UID)));
  });
});

/* ══════════════════════════════════════════════════════════════════════════════════════════
   v3.28 · ANONYYMI EVÄTTY KAIKILLA ENTISILLÄ PELAAJAPOLUILLA (Vaihe 0 / PR 3)
   Jokainen rivi on operaatio, joka ennen v3.28:aa ONNISTUI anonyymina. Sama operaatio ajetaan
   pelaajatokenilla (assertSucceeds = positiivinen kontrolli) ja anonyymina (assertFails).
══════════════════════════════════════════════════════════════════════════════════════════ */
describe('v3.28 · anonyymi evätty (positiivinen kontrolli pelaajatokenilla)', () => {
  const P = (...seg) => ['seurat', SEURA_A, 'pelaajat', PELAAJA_UID, ...seg];
  beforeEach(async () => {
    await seedSeuraAndPelaaja();
    await seedHavainto();
    await seedKehu();
    await testEnv.withSecurityRulesDisabled(async (ctx) => {
      const f = ctx.firestore();
      await setDoc(doc(f, 'seurat', SEURA_A, 'kalenteri', 'kal-anon'), { otsikko: 'Treeni', luoja_uid: VALM_A_UID });
      await setDoc(doc(f, ...P('notifikaatiot', 'n-anon')), { tyyppi: 'peruttu', teksti: 'x', luettu: false });
      await setDoc(doc(f, ...P('havainnot', 'n-anon')), { tila: 'valmis', nakyvyys: 'pelaaja', pelaaja_lukenut: false });
      await setDoc(doc(f, ...P('havainnot', 'v-anon')), { tyyppi: 'valmentaja_viesti', tila: 'valmis', nakyvyys: 'pelaaja', teksti: 'x', valmentajaUid: VALM_A_UID, luotu: new Date() });
      await setDoc(doc(f, ...P('idp_kausi', '2026')), { tavoitteet: [] });
      await setDoc(doc(f, ...P('idp', 'idp-anon')), { teksti: 'x' });
      await setDoc(doc(f, 'seurat', SEURA_A, 'kalenteri', 'kal-anon', 'lasnaolijat', PELAAJA_UID), { tila: 'paikalla' });
    });
  });
  const OPS = [
    ['pelaajadokumentin get', (db) => getDoc(doc(db, ...P()))],
    ['xp/streak-päivitys', (db) => updateDoc(doc(db, ...P()), { xp: 10, streak: 1 })],
    ['havainnon luku (nakyvyys=pelaaja)', (db) => getDoc(doc(db, ...P('havainnot', 'n-anon')))],
    ['havaintojen list nakyvyys-ehdolla', (db) => getDocs(query(collection(db, ...P('havainnot')), where('nakyvyys', '==', 'pelaaja'), limit(50)))],
    ['havainnon lukukuittaus', (db) => updateDoc(doc(db, ...P('havainnot', 'n-anon')), { pelaaja_lukenut: true })],
    ['kehun luku', (db) => getDoc(doc(db, ...P('kehut', 'kehu1')))],
    ['kirjauksen luonti', (db) => setDoc(doc(db, ...P('kirjaukset', '2026-10-01')), { fiilinki: 4, lahde: 'pelaaja', luotu: new Date() })],
    ['notifikaation luku', (db) => getDoc(doc(db, ...P('notifikaatiot', 'n-anon')))],
    ['kalenterin luku', (db) => getDoc(doc(db, 'seurat', SEURA_A, 'kalenteri', 'kal-anon'))],
    ['viestit (valmentaja_viesti, Vanhempi/Pelaaja-kysely)', (db) => getDocs(query(collection(db, ...P('havainnot')),
      where('tyyppi', '==', 'valmentaja_viesti'), where('nakyvyys', '==', 'pelaaja'), limit(20)))],
    ['kausitavoitteen luku (idp_kausi)', (db) => getDoc(doc(db, ...P('idp_kausi', '2026')))],
    ['kausitavoitteen sitoumus (idp_kausi write)', (db) => setDoc(doc(db, ...P('idp_kausi', '2026')),
      { pelaaja_sitoumus: { itsearvio: { q1: 'a' }, sitoumus_pvm: '2026-10-01T10:00:00.000Z', vahvistettu_pvm: null } }, { merge: true })],
    ['läsnäolon luku', (db) => getDoc(doc(db, 'seurat', SEURA_A, 'kalenteri', 'kal-anon', 'lasnaolijat', PELAAJA_UID))],
    ['oma saatavuus (RSVP, olemassa oleva rivi)', (db) => updateDoc(doc(db, 'seurat', SEURA_A, 'kalenteri', 'kal-anon', 'lasnaolijat', PELAAJA_UID),
      { saatavuus: 'tulossa', rooli: 'pelaaja', paivitetty: new Date().toISOString() })],
  ];
  for (const [nimi, op] of OPS) {
    it(nimi + ': pelaajatoken sallittu, anonyymi evätty', async () => {
      await assertSucceeds(op(pelaajaItseContext().firestore()));
      await assertFails(op(anonContext().firestore()));
    });
  }
  it('IDP (idp/{id}): huoltaja lukee (kontrolli), anonyymi ei lue eikä kirjoita', async () => {
    await assertSucceeds(getDoc(doc(huoltajaContext().firestore(), ...P('idp', 'idp-anon'))));
    await assertFails(getDoc(doc(anonContext().firestore(), ...P('idp', 'idp-anon'))));
    await assertFails(setDoc(doc(anonContext().firestore(), ...P('idp', 'idp-uusi')), { teksti: 'x' }));
  });
  it('VARTIJA: pelaajatoken (seura) EI pääse Solon players-kokoelmaan', async () => {
    await testEnv.withSecurityRulesDisabled(async (ctx) => {
      await setDoc(doc(ctx.firestore(), 'players', 'solo-v328'), { parent_uid: 'p-v328', child_pin: '1234', playerCode: 'TMP-V328AA', seuraId: null, nimi: 'L' });
    });
    const pel = pelaajaItseContext().firestore();
    await assertFails(getDoc(doc(pel, 'players', 'solo-v328')));
    await assertFails(updateDoc(doc(pel, 'players', 'solo-v328'), { nimi: 'X' }));
    await assertFails(getDocs(collection(pel, 'players')));
  });
  it('VARTIJA: Rules-tiedostossa ei ole onAnonymous-sanaa eikä anonymous-provider-ehtoa (ei palaa kopioimalla)', () => {
    const rules = readFileSync(RULES_PATH, 'utf8');
    expect(rules).not.toMatch(/onAnonymous/);
    expect(rules).not.toMatch(/sign_in_provider\s*==\s*'anonymous'/);
  });
  /* PR 1:n token: claim on `pelaajaSeuraId`, EI `seuraId` — `onOmaSeura()` lukee pelkän
     `token.seuraId`:n, joten `seuraId`-claim avaisi pelaajalle koko seuran (myös valmentajien
     havainnot). Tämä vartija on vihreä jo nyt ja pysyy vihreänä. */
  it('VARTIJA: pelaajatoken (pelaajaSeuraId) EI läpäise onOmaSeura-haaroja — ei lue toista pelaajaa', async () => {
    const pel = testEnv.authenticatedContext('pel_' + SEURA_A + '_' + PELAAJA_UID, {
      rooli: 'pelaaja', pelaajaSeuraId: SEURA_A, pelaajaId: PELAAJA_UID,
      firebase: { sign_in_provider: 'custom' },
    }).firestore();
    await assertFails(getDoc(doc(pel, 'seurat', SEURA_A, 'pelaajat', PELAAJA_A2_UID)));
    await assertFails(getDocs(collection(pel, 'seurat', SEURA_A, 'pelaajat')));
  });
});

describe('admins (v3.24): vain SA ja käyttäjä itse', () => {
  beforeEach(async () => {
    await seedAdminDoc();
    await seedSeuraAndPelaaja();
  });

  it('SA lukee admins-dokumentin', async () => {
    await assertSucceeds(getDoc(doc(saContext().firestore(), 'admins', SA_UID)));
  });
  it('käyttäjä lukee OMAN admins-dokumenttinsa (SA-fallback roolintunnistuksessa; ei olemassa → silti sallittu)', async () => {
    await assertSucceeds(getDoc(doc(vpContext(SEURA_A).firestore(), 'admins', VP_A_UID)));
    await assertSucceeds(getDoc(doc(anonContext().firestore(), 'admins', ANON_UID)));
  });
  it('VP EI lue SA:n admins-dokumenttia', async () => {
    await assertFails(getDoc(doc(vpContext(SEURA_A).firestore(), 'admins', SA_UID)));
  });
  it('anonyymi EI lue SA:n admins-dokumenttia', async () => {
    await assertFails(getDoc(doc(anonContext().firestore(), 'admins', SA_UID)));
  });
  it('kirjautunut EI listaa admins-kokoelmaa', async () => {
    await assertFails(getDocs(collection(valmentajaContext(VALM_A_UID, SEURA_A).firestore(), 'admins')));
  });
  it('SA kirjoittaa edelleen, muut eivät', async () => {
    await assertSucceeds(setDoc(doc(saContext().firestore(), 'admins', 'uusi-admin'), { email: 'x@test.fi' }));
    await assertFails(setDoc(doc(vpContext(SEURA_A).firestore(), 'admins', VP_A_UID), { email: 'x@test.fi' }));
  });
});

/* ══════════════════════════════════════════════════════════════════════════════════════════
   v3.25 · PELAAJATOKEN (onPelaajaItse) — Vaihe 0 / PR 1
   Token `pelaajaKirjaudu`-funktiolta: { rooli:'pelaaja', pelaajaSeuraId, pelaajaId }.
══════════════════════════════════════════════════════════════════════════════════════════ */
function pelaajaContext(seuraId, pelaajaId) {
  return testEnv.authenticatedContext('pel_' + seuraId + '_' + pelaajaId, {
    rooli: 'pelaaja', pelaajaSeuraId: seuraId, pelaajaId: pelaajaId,
    firebase: { sign_in_provider: 'custom' },
  });
}

describe('v3.25 · pelaajatoken (onPelaajaItse)', () => {
  beforeEach(async () => {
    await seedSeuraAndPelaaja();
    await seedHavainto();
    await testEnv.withSecurityRulesDisabled(async (c) => {
      const db = c.firestore();
      // Valmentajan sisäinen havainto (ei nakyvyys:'pelaaja') — pelaaja EI saa nähdä.
      await setDoc(doc(db, 'seurat', SEURA_A, 'pelaajat', PELAAJA_UID, 'havainnot', 'sisainen'), {
        tyyppi: 'adar', tila: 'valmis', valmentajaUid: VALM_A_UID, narratiivi: 'vain valmentajille',
      });
      await setDoc(doc(db, 'seurat', SEURA_A, 'pelaajat', PELAAJA_A2_UID, 'havainnot', 'toisen'), {
        tyyppi: 'adar', tila: 'valmis', nakyvyys: 'pelaaja', narratiivi: 'toisen pelaajan',
      });
      await setDoc(doc(db, 'seurat', SEURA_A, 'kalenteri', 'k1'), { otsikko: 'Treeni', poistettu: false });
      await setDoc(doc(db, 'seurat', SEURA_B, 'kalenteri', 'k2'), { otsikko: 'Muu seura', poistettu: false });
      await setDoc(doc(db, 'seurat', SEURA_A, 'konseptit', 'y1'), { nimi: 'Linja' });
      await setDoc(doc(db, 'seurat', SEURA_B, 'konseptit', 'y1'), { nimi: 'Muun seuran linja' });
    });
  });
  const pel = () => pelaajaContext(SEURA_A, PELAAJA_UID).firestore();

  it('lukee OMAN pelaajadokumenttinsa', async () => {
    await assertSucceeds(getDoc(doc(pel(), 'seurat', SEURA_A, 'pelaajat', PELAAJA_UID)));
  });
  it('EI lue toisen pelaajan dokumenttia (sama seura) eikä listaa pelaajia', async () => {
    await assertFails(getDoc(doc(pel(), 'seurat', SEURA_A, 'pelaajat', PELAAJA_A2_UID)));
    await assertFails(getDocs(collection(pel(), 'seurat', SEURA_A, 'pelaajat')));
    await assertFails(getDoc(doc(pel(), 'seurat', SEURA_B, 'pelaajat', PELAAJA_B_UID)));
  });
  it('lukee omat havainnot, joissa nakyvyys==pelaaja — EI sisäisiä eikä toisen', async () => {
    await assertSucceeds(getDoc(doc(pel(), 'seurat', SEURA_A, 'pelaajat', PELAAJA_UID, 'havainnot', 'hav1')));
    await assertFails(getDoc(doc(pel(), 'seurat', SEURA_A, 'pelaajat', PELAAJA_UID, 'havainnot', 'sisainen')));
    await assertFails(getDoc(doc(pel(), 'seurat', SEURA_A, 'pelaajat', PELAAJA_A2_UID, 'havainnot', 'toisen')));
  });
  it('pelaajatoken EI läpäise onOmaSeura-haaroja (seuradokumentti, käyttäjät)', async () => {
    await assertFails(getDoc(doc(pel(), 'seurat', SEURA_A)));
    await assertFails(getDoc(doc(pel(), 'seurat', SEURA_A, 'kayttajat', VALM_A_UID)));
  });
  it('päivittää omasta dokumentistaan VAIN samat kentät kuin pelaaja (xp/streak) — ei muuta', async () => {
    await assertSucceeds(updateDoc(doc(pel(), 'seurat', SEURA_A, 'pelaajat', PELAAJA_UID), { xp: 10, streak: 2 }));
    await assertFails(updateDoc(doc(pel(), 'seurat', SEURA_A, 'pelaajat', PELAAJA_UID), { pin: '0000' }));
    await assertFails(updateDoc(doc(pel(), 'seurat', SEURA_A, 'pelaajat', PELAAJA_A2_UID), { xp: 10 }));
  });
  it('luo oman kirjauksen — EI toisen pelaajan kirjausta', async () => {
    const k = { tyyppi: 'T', tehty: true, kesto_min: 30, fiilinki: 4, rpe: 6, lahde: 'pelaaja', luotu: new Date() };
    await assertSucceeds(setDoc(doc(pel(), 'seurat', SEURA_A, 'pelaajat', PELAAJA_UID, 'kirjaukset', '2026-09-29'), k));
    await assertFails(setDoc(doc(pel(), 'seurat', SEURA_A, 'pelaajat', PELAAJA_A2_UID, 'kirjaukset', '2026-09-29'), k));
  });
  it('kalenteri: oman seuran luku, ei muun seuran', async () => {
    await assertSucceeds(getDoc(doc(pel(), 'seurat', SEURA_A, 'kalenteri', 'k1')));
    await assertFails(getDoc(doc(pel(), 'seurat', SEURA_B, 'kalenteri', 'k2')));
  });
  it('läsnäolo: RSVP vain OMAAN riviin (saatavuus-kentät), ei toisen puolesta', async () => {
    const r = { saatavuus: 'tulossa', paivitetty: new Date().toISOString(), rooli: 'pelaaja' };
    await assertSucceeds(setDoc(doc(pel(), 'seurat', SEURA_A, 'kalenteri', 'k1', 'lasnaolijat', PELAAJA_UID), r));
    await assertFails(setDoc(doc(pel(), 'seurat', SEURA_A, 'kalenteri', 'k1', 'lasnaolijat', PELAAJA_A2_UID), r));
    await assertFails(setDoc(doc(pel(), 'seurat', SEURA_A, 'kalenteri', 'k1', 'lasnaolijat', PELAAJA_UID + 'x'), { tila: 'paikalla' }));
  });
  it('konseptit: oman seuran linja luetaan, muun seuran ei', async () => {
    await assertSucceeds(getDoc(doc(pel(), 'seurat', SEURA_A, 'konseptit', 'y1')));
    await assertFails(getDoc(doc(pel(), 'seurat', SEURA_B, 'konseptit', 'y1')));
  });
  it('kirjautumislaskurit ja PIN-hajautukset: ei kenellekään clientille (myös SA:lle vain Admin SDK)', async () => {
    await assertFails(getDoc(doc(pel(), '_kirjautumisyritykset', 'x')));
    await assertFails(getDoc(doc(saContext().firestore(), '_pelaajaPin', 'fcl_' + PELAAJA_UID)));
    await assertFails(setDoc(doc(anonContext().firestore(), '_pelaajaPin', 'x'), { hash: 'h' }));
  });
  it('väärennetty token ilman rooli:pelaaja (pelkät pelaajaSeuraId/pelaajaId) EI saa pääsyä', async () => {
    const vaara = testEnv.authenticatedContext('x', { pelaajaSeuraId: SEURA_A, pelaajaId: PELAAJA_UID }).firestore();
    await assertFails(getDoc(doc(vaara, 'seurat', SEURA_A, 'pelaajat', PELAAJA_UID)));
  });
});

/* ══════════════════════════════════════════════════════════════════════════════════════════
   PELAAJA_V7:N OIKEAT KYSELYT PELAAJATOKENILLA (30.9.2026)
   Aiemmat pelaajatoken-testit kattoivat vain getDoc-haut. Nämä ajavat sivun TODELLISET kyselyt
   (sama muoto: where/orderBy/limit/documentId), koska Firestore hylkää list-kyselyn, jonka säännön
   se ei pysty todistamaan KAIKILLE tuloksille — getDoc voi toimia, vaikka sivun kysely ei.
══════════════════════════════════════════════════════════════════════════════════════════ */
describe('Pelaaja_v7 · oikeat kyselyt pelaajatokenilla', () => {
  const pel = () => pelaajaContext(SEURA_A, PELAAJA_UID).firestore();
  const P = (db, ...polku) => collection(db, 'seurat', SEURA_A, 'pelaajat', PELAAJA_UID, ...polku);
  beforeEach(async () => {
    await seedSeuraAndPelaaja();
    await seedHavainto();
    await seedKehu();
    await testEnv.withSecurityRulesDisabled(async (c) => {
      const db = c.firestore();
      const pp = (...x) => doc(db, 'seurat', SEURA_A, 'pelaajat', PELAAJA_UID, ...x);
      await setDoc(pp('kirjaukset', '2026-09-29'), { tyyppi: 'T', lahde: 'pelaaja', paivitetty: new Date(), luotu: new Date('2026-09-29') });
      await setDoc(pp('notifikaatiot', 'n1'), { tyyppi: 'palaute', luotu: new Date(), luettu: false });
      await setDoc(pp('idp_kausi', '2026'), { tavoitteet: [] });
      await setDoc(pp('testitulokset', '2026-06-01_tekniikkakilpailu'), { protokolla: 'tekniikkakilpailu', testit: {} });
      await setDoc(doc(db, 'seurat', SEURA_A, 'kalenteri', 'k1'), { otsikko: 'Treeni', poistettu: false });
      await setDoc(doc(db, 'seurat', SEURA_A, 'kalenteri', 'k1', 'lasnaolijat', PELAAJA_UID), { saatavuus: 'tulossa' });
      await setDoc(doc(db, 'seurat', SEURA_A, 'kaaviot', 'kv1'), { review: { status: 'hyvaksytty' }, nakyvyys: 'seura' });
      await setDoc(doc(db, 'kaaviot', 'kan1'), { spec: { avain: 'x' } });
    });
  });

  it('P6: havainnot where(tila==valmis) where(nakyvyys==pelaaja) limit(50)', async () => {
    await assertSucceeds(getDocs(query(P(pel(), 'havainnot'), where('tila', '==', 'valmis'), where('nakyvyys', '==', 'pelaaja'), limit(50))));
  });
  it('EI VACUOUS: sama havaintokysely ILMAN nakyvyys-ehtoa hylätään (sisäiset havainnot)', async () => {
    await assertFails(getDocs(query(P(pel(), 'havainnot'), where('tila', '==', 'valmis'), limit(50))));
  });
  it('kirjaukset: päivän doc, orderBy(paivitetty desc) limit(30), documentId >= raja, oma set(merge)', async () => {
    await assertSucceeds(getDoc(doc(pel(), 'seurat', SEURA_A, 'pelaajat', PELAAJA_UID, 'kirjaukset', '2026-09-29')));
    await assertSucceeds(getDocs(query(P(pel(), 'kirjaukset'), orderBy('paivitetty', 'desc'), limit(30))));
    await assertSucceeds(getDocs(query(P(pel(), 'kirjaukset'), where(documentId(), '>=', '2026-09-01'))));
    await assertSucceeds(setDoc(doc(pel(), 'seurat', SEURA_A, 'pelaajat', PELAAJA_UID, 'kirjaukset', '2026-09-30'),
      { fiilinki: 4, lahde: 'pelaaja', paivitetty: serverTimestamp(), luotu: new Date('2026-09-30') }, { merge: true }));
  });
  it('kehut: orderBy(luotu desc) limit(10)', async () => {
    await assertSucceeds(getDocs(query(P(pel(), 'kehut'), orderBy('luotu', 'desc'), limit(10))));
  });
  it('notifikaatiot: orderBy(luotu desc) limit(20)', async () => {
    await assertSucceeds(getDocs(query(P(pel(), 'notifikaatiot'), orderBy('luotu', 'desc'), limit(20))));
  });
  it('idp_kausi: vuoden doc + pelaaja_sitoumus set(merge)', async () => {
    await assertSucceeds(getDoc(doc(pel(), 'seurat', SEURA_A, 'pelaajat', PELAAJA_UID, 'idp_kausi', '2026')));
    await assertSucceeds(setDoc(doc(pel(), 'seurat', SEURA_A, 'pelaajat', PELAAJA_UID, 'idp_kausi', '2026'),
      { pelaaja_sitoumus: {           // sama muoto kuin Pelaaja_v7 (vahvistettu_* säilytetään, Rules-vartija)
        itsearvio: { q1: 'a', q2: 'b', q3: 'c' }, sitoumus_pvm: '2026-09-30', jakso_alkoi: '2026-09-01',
        vahvistettu_pvm: null, vahvistettu_jakso_alkoi: null, vahvistaja_rooli: null,
      } }, { merge: true }));
  });
  it('testitulokset: koko kokoelma (tekniikkaprofiili)', async () => {
    await assertSucceeds(getDocs(P(pel(), 'testitulokset')));
  });
  it('kalenteri: koko seuran kokoelma + oma läsnäolorivi', async () => {
    await assertSucceeds(getDocs(collection(pel(), 'seurat', SEURA_A, 'kalenteri')));
    await assertSucceeds(getDoc(doc(pel(), 'seurat', SEURA_A, 'kalenteri', 'k1', 'lasnaolijat', PELAAJA_UID)));
  });
  it('kaaviot: seuran hyväksytyt (where review.status) + kanoniset', async () => {
    await assertSucceeds(getDocs(query(collection(pel(), 'seurat', SEURA_A, 'kaaviot'), where('review.status', '==', 'hyvaksytty'))));
    await assertSucceeds(getDocs(collection(pel(), 'kaaviot')));
  });
  it('pelaajadokumentin idp_sitoumus_pvm-pikakenttä set(merge)', async () => {
    await assertSucceeds(setDoc(doc(pel(), 'seurat', SEURA_A, 'pelaajat', PELAAJA_UID), { idp_sitoumus_pvm: '2026-09-30' }, { merge: true }));
  });
});

/* ══════════════════════════════════════════════════════════════════════════════════════════
   v3.26 · SOLO-LAPSEN TOKEN (onSoloLapsiItse) — Vaihe 0 / PR 2b
   Token `soloLapsiKirjaudu`-funktiolta: { rooli:'solo_lapsi', soloPlayerId }.
   Kyselyt = Player_Homen (lapsiKirjaudu) ja Solo_Kodin (_haeFirestore, kirjaus) oikeat kyselyt.
══════════════════════════════════════════════════════════════════════════════════════════ */
const SOLO_PID = 'solo-p-001';
const SOLO_PID_2 = 'solo-p-002';
const SOLO_PARENT = 'solo-parent-001';
function soloContext(playerId) {
  return testEnv.authenticatedContext('solo_' + playerId, {
    rooli: 'solo_lapsi', soloPlayerId: playerId,
    firebase: { sign_in_provider: 'custom' },
  });
}
async function seedSolo() {
  await testEnv.withSecurityRulesDisabled(async (c) => {
    const db = c.firestore();
    const pelaaja = (pid, code) => ({
      playerId: pid, parent_uid: SOLO_PARENT, playerCode: code, child_pin: '4821',
      seuraId: null, nimi: 'Solo', synVuosi: 2016, lahde: 'polku_b',
    });
    await setDoc(doc(db, 'players', SOLO_PID), pelaaja(SOLO_PID, 'TMP-AAAAAA'));
    await setDoc(doc(db, 'players', SOLO_PID_2), pelaaja(SOLO_PID_2, 'TMP-BBBBBB'));
    await setDoc(doc(db, 'playerCodes', 'TMP-AAAAAA'), { playerId: SOLO_PID, parent_uid: SOLO_PARENT });
    await setDoc(doc(db, '_soloPin', SOLO_PID), { hash: 'scrypt$x$y' });
    await setDoc(doc(db, 'players', SOLO_PID, 'kirjaukset', '2026-09-30'), { tyyppi: 'T', tehty: true });
  });
}

describe('v3.26 · Solo-lapsen token (onSoloLapsiItse)', () => {
  beforeEach(async () => { await seedSolo(); await seedSeuraAndPelaaja(); });
  const solo = () => soloContext(SOLO_PID).firestore();

  it('Player_Home lapsiKirjaudu / Solo_Koti _haeFirestore: players/{oma}.get() onnistuu', async () => {
    await assertSucceeds(getDoc(doc(solo(), 'players', SOLO_PID)));
  });
  it('EI lue toisen Solo-pelaajan dokumenttia eikä listaa players-kokoelmaa', async () => {
    await assertFails(getDoc(doc(solo(), 'players', SOLO_PID_2)));
    await assertFails(getDocs(collection(solo(), 'players')));
    await assertFails(getDocs(query(collection(solo(), 'players'), where('parent_uid', '==', SOLO_PARENT))));
  });
  it('update omaan dokkiin: sallittu kun parent_uid/child_pin/playerCode/seuraId pysyvät', async () => {
    await assertSucceeds(updateDoc(doc(solo(), 'players', SOLO_PID), { kortti_taso: 'sharp', pp: 'KH' }));
  });
  it('update EI saa muuttaa suojattuja kenttiä eikä toisen dokkia', async () => {
    await assertFails(updateDoc(doc(solo(), 'players', SOLO_PID), { parent_uid: 'hyokkaaja' }));
    await assertFails(updateDoc(doc(solo(), 'players', SOLO_PID), { child_pin: '0000' }));
    await assertFails(updateDoc(doc(solo(), 'players', SOLO_PID), { playerCode: 'TMP-ZZZZZZ' }));
    await assertFails(updateDoc(doc(solo(), 'players', SOLO_PID), { seuraId: SEURA_A }));
    await assertFails(updateDoc(doc(solo(), 'players', SOLO_PID_2), { kortti_taso: 'elite' }));
  });
  it('EI create toisen vanhemman nimiin eikä delete omaa players-dokkia', async () => {
    // (create omalla uid:lla parent_uid:nä on nykyinen yleissääntö kaikille kirjautuneille — ei PR 2b:n muutos.)
    await assertFails(setDoc(doc(solo(), 'players', 'uusi'), { parent_uid: SOLO_PARENT }));
    await assertFails(deleteDoc(doc(solo(), 'players', SOLO_PID)));
  });
  it('NYKYTILA (ei muutosta PR 2b:ssä): Solo_Kodin kirjaus players/{oma}/kirjaukset on vain vanhemmalle → evätty myös Solo-tokenilla', async () => {
    await assertFails(setDoc(doc(solo(), 'players', SOLO_PID, 'kirjaukset', '2026-09-30'),
      { tyyppi: 'T', tehty: true, lahde: 'solo', paivitetty: serverTimestamp() }, { merge: true }));
    await assertFails(getDoc(doc(solo(), 'players', SOLO_PID, 'kirjaukset', '2026-09-30')));
  });
  it('_soloPin ja _pelaajaPin: ei luku- eikä kirjoitusoikeutta Solo-tokenilla eikä vanhemmalla', async () => {
    await assertFails(getDoc(doc(solo(), '_soloPin', SOLO_PID)));
    await assertFails(setDoc(doc(solo(), '_soloPin', SOLO_PID), { hash: 'x' }));
    const vanh = testEnv.authenticatedContext(SOLO_PARENT).firestore();
    await assertFails(getDoc(doc(vanh, '_soloPin', SOLO_PID)));
    await assertFails(getDoc(doc(solo(), '_pelaajaPin', SEURA_A + '_' + PELAAJA_UID)));
  });
  it('VARTIJA: Solo-token EI läpäise seura- eikä pelaajahaaroja (onOmaSeura / onPelaajaItse)', async () => {
    await assertFails(getDoc(doc(solo(), 'seurat', SEURA_A)));
    await assertFails(getDoc(doc(solo(), 'seurat', SEURA_A, 'pelaajat', PELAAJA_UID)));
    await assertFails(getDocs(collection(solo(), 'seurat', SEURA_A, 'pelaajat')));
    await assertFails(getDoc(doc(solo(), 'seurat', SEURA_A, 'kayttajat', VALM_A_UID)));
  });
  it('VARTIJA: väärennetty Solo-token, jossa soloPlayerId puuttuu tai rooli on pelaaja → evätty', async () => {
    const ilmanId = testEnv.authenticatedContext('solo_x', { rooli: 'solo_lapsi', firebase: { sign_in_provider: 'custom' } }).firestore();
    await assertFails(getDoc(doc(ilmanId, 'players', SOLO_PID)));
    const vaaraRooli = testEnv.authenticatedContext('solo_y', { rooli: 'pelaaja', soloPlayerId: SOLO_PID, firebase: { sign_in_provider: 'custom' } }).firestore();
    await assertFails(getDoc(doc(vaaraRooli, 'players', SOLO_PID)));
  });
  it('vanhempi (parent_uid) toimii ennallaan: get, list omat, kirjaukset', async () => {
    const vanh = testEnv.authenticatedContext(SOLO_PARENT).firestore();
    await assertSucceeds(getDoc(doc(vanh, 'players', SOLO_PID)));
    await assertSucceeds(getDocs(query(collection(vanh, 'players'), where('parent_uid', '==', SOLO_PARENT))));
    await assertSucceeds(getDoc(doc(vanh, 'players', SOLO_PID, 'kirjaukset', '2026-09-30')));
  });
  it('v3.28: anonyymi haara suljettu — players/{id} get ja update evätään', async () => {
    const anon = testEnv.authenticatedContext(ANON_UID, { firebase: { sign_in_provider: 'anonymous' } }).firestore();
    await assertFails(getDoc(doc(anon, 'players', SOLO_PID)));
    await assertFails(updateDoc(doc(anon, 'players', SOLO_PID), { nimi: 'X' }));
  });
});

/* ══════════════════════════════════════════════════════════════════════════════════════════
   v3.27 · SOLO POLKU A — profiilierä + alikokoelmakirjoitus getAfter():lla
   Juurisyy: Player_Homen erä (parents + players + suostumukset/perus) loi pelaajan samassa erässä;
   alikokoelman get() näki tilan ennen erää → koko erä PERMISSION_DENIED → playerCodes-varaus orvoksi.
   Ajetaan OIKEA lib/tm_solo_data.js (tmLuoSoloProfiili / tmMigroiLocalStorage) emulaattoria vasten.
══════════════════════════════════════════════════════════════════════════════════════════ */
const TM_SOLO = createRequire(import.meta.url)('../../lib/tm_solo_data.js');
const POLKU_A_UID = 'polku-a-vanhempi';
const VIERAS_UID = 'polku-a-vieras';
function compatFb() {
  // lib käyttää compat-muotoa fb.firestore.FieldValue.serverTimestamp()/arrayUnion()
  const { serverTimestamp: st, arrayUnion: au } = FS_MOD;
  return { firestore: { FieldValue: { serverTimestamp: st, arrayUnion: au } } };
}
function lsTynka(alku) {
  const m = new Map(Object.entries(alku || {}));
  return { getItem: (k) => (m.has(k) ? m.get(k) : null), setItem: (k, v) => m.set(k, String(v)), _m: m };
}
async function laske(db, uid) {
  const pl = await getDocs(query(collection(db, 'players'), where('parent_uid', '==', uid)));
  // v3.29: playerCodes list on suljettu clientilta → lasketaan säännöt ohittaen (tarkistus, ei käyttäjän kysely).
  let koodit = [];
  await testEnv.withSecurityRulesDisabled(async (c) => {
    const pc = await getDocs(query(collection(c.firestore(), 'playerCodes'), where('parent_uid', '==', uid)));
    koodit = pc.docs.map((d) => ({ id: d.id, playerId: d.data().playerId }));
  });
  return { pelaajat: pl.docs.map((d) => d.id), koodit };
}
const EHDOT = { tos: true, privacy: true };

describe('v3.27 · Solo Polku A -profiilierä (getAfter)', () => {
  it('vanhemman erä parents + players + suostumukset menee läpi (oikea tmLuoSoloProfiili)', async () => {
    const db = testEnv.authenticatedContext(POLKU_A_UID).firestore();
    const r = await assertSucceeds(TM_SOLO.tmLuoSoloProfiili(db, compatFb(), {
      uid: POLKU_A_UID, email: 'a@example.test', ehdot: EHDOT, benchmark: true, profiili: { nimi: 'Testi' },
    }));
    const t = await laske(db, POLKU_A_UID);
    expect(t.pelaajat).toEqual([r.playerId]);
    expect(t.koodit).toEqual([{ id: r.playerCode, playerId: r.playerId }]);
    await assertSucceeds(getDoc(doc(db, 'players', r.playerId, 'suostumukset', 'perus')));
    await assertSucceeds(getDoc(doc(db, 'players', r.playerId, 'suostumukset', 'benchmark')));
  });

  it('vieraan kirjoitus toisen pelaajan alikokoelmaan hylätään edelleen', async () => {
    await testEnv.withSecurityRulesDisabled(async (c) => {
      await setDoc(doc(c.firestore(), 'players', 'uhri'), { parent_uid: POLKU_A_UID, playerCode: 'TMP-UHRI01', seuraId: null });
    });
    const vieras = testEnv.authenticatedContext(VIERAS_UID).firestore();
    await assertFails(setDoc(doc(vieras, 'players', 'uhri', 'suostumukset', 'perus'), { ok: true }));
    await assertFails(setDoc(doc(vieras, 'players', 'uhri', 'tkk_historia', 'x'), { a: 1 }));
    await assertFails(getDoc(doc(vieras, 'players', 'uhri', 'suostumukset', 'perus')));
  });

  it('erä, jossa vieras vaihtaa samalla pelaajan parent_uid:n itselleen, hylätään', async () => {
    await testEnv.withSecurityRulesDisabled(async (c) => {
      await setDoc(doc(c.firestore(), 'players', 'uhri'), { parent_uid: POLKU_A_UID, playerCode: 'TMP-UHRI01', seuraId: null });
    });
    const vieras = testEnv.authenticatedContext(VIERAS_UID).firestore();
    const b = FS_MOD.writeBatch(vieras);
    b.update(doc(vieras, 'players', 'uhri'), { parent_uid: VIERAS_UID });
    b.set(doc(vieras, 'players', 'uhri', 'suostumukset', 'perus'), { ok: true });
    await assertFails(b.commit());
    // Pelkkä parent_uid-päivitys ilman alikokoelmaa (regressio: {sub=**} täsmäsi myös pelaajadokkiin).
    await assertFails(updateDoc(doc(vieras, 'players', 'uhri'), { parent_uid: VIERAS_UID }));
    await assertFails(setDoc(doc(vieras, 'players', 'uhri'), { parent_uid: VIERAS_UID }));
    let tila;
    await testEnv.withSecurityRulesDisabled(async (c) => { tila = (await getDoc(doc(c.firestore(), 'players', 'uhri'))).data(); });
    expect(tila.parent_uid).toBe(POLKU_A_UID);
    // Myös anonyymi ja Solo-lapsi: parent_uid:n vaihto ei ole sallittu → erä hylätään.
    const anon = testEnv.authenticatedContext('anon-x', { firebase: { sign_in_provider: 'anonymous' } }).firestore();
    const b2 = FS_MOD.writeBatch(anon);
    b2.update(doc(anon, 'players', 'uhri'), { parent_uid: 'anon-x' });
    b2.set(doc(anon, 'players', 'uhri', 'suostumukset', 'perus'), { ok: true });
    await assertFails(b2.commit());
  });

  it('laitteelle jäänyt profiili (epäonnistunut tallennus, ei koodia laitteella) siirtyy: 1 pelaaja + 1 indeksi, uusinta ei tuplaa', async () => {
    const db = testEnv.authenticatedContext(POLKU_A_UID).firestore();
    const ls = lsTynka({ tm_solo_profiili: JSON.stringify({ nimi: 'Laite', synVuosi: 2013 }) });
    const opts = { uid: POLKU_A_UID, email: 'a@example.test', ehdot: EHDOT };
    const pid = await TM_SOLO.tmMigroiLocalStorage(db, compatFb(), ls, opts);
    expect(pid).toBeTruthy();
    expect(ls.getItem('tm_migrated')).toBe(pid);
    const pid2 = await TM_SOLO.tmMigroiLocalStorage(db, compatFb(), ls, opts);
    expect(pid2).toBe(pid);
    const t = await laske(db, POLKU_A_UID);
    expect(t.pelaajat).toEqual([pid]);
    expect(t.koodit.filter((k) => k.playerId === pid)).toHaveLength(1);
    expect(t.koodit).toHaveLength(1);
  });

  it('laitteella orpo koodi (oma varaus, pelaajaa ei ole) → käytetään sitä: 1 pelaaja + indeksi osoittaa siihen', async () => {
    const ORPO = 'TMP-QRST23';
    await testEnv.withSecurityRulesDisabled(async (c) => {
      await setDoc(doc(c.firestore(), 'playerCodes', ORPO), { playerId: 'eiOleOlemassa', parent_uid: POLKU_A_UID });
    });
    expect(TM_SOLO.tmPlayerCodeKelpaa(ORPO)).toBe(true);
    const db = testEnv.authenticatedContext(POLKU_A_UID).firestore();
    const ls = lsTynka({ tm_solo_profiili: JSON.stringify({ nimi: 'Laite' }), tm_player_code: ORPO });
    const pid = await TM_SOLO.tmMigroiLocalStorage(db, compatFb(), ls, { uid: POLKU_A_UID, email: 'a@example.test', ehdot: EHDOT });
    const t = await laske(db, POLKU_A_UID);
    expect(t.pelaajat).toEqual([pid]);
    expect(t.koodit).toEqual([{ id: ORPO, playerId: pid }]);
    const p = await getDoc(doc(db, 'players', pid));
    expect(p.data().playerCode).toBe(ORPO);
  });
});

/* ══════════════════════════════════════════════════════════════════════════════════════════
   v3.30 · PIN VAIN PALVELIMELLA (Vaihe 0 / PR 4)
   Selain ei aseta eikä muuta pin-kenttää (hajautus _pelaajaPin ja selväkielinen kopio pysyvät samana).
   Solo: child_pin vain palvelimella. Lupapyynnön tulos alidokumentissa tulos/{token}.
══════════════════════════════════════════════════════════════════════════════════════════ */
describe('v3.30 · PIN vain palvelimella', () => {
  beforeEach(async () => { await seedSeuraAndPelaaja(); await seedAdminDoc(); });
  const pel = (db) => doc(db, 'seurat', SEURA_A, 'pelaajat', PELAAJA_UID);

  it('henkilökunta (VP, oman joukkueen valmentaja) EI päivitä pin-kenttää — muut kentät ennallaan', async () => {
    for (const db of [vpContext(SEURA_A).firestore(), valmentajaContext(VALM_A_UID, SEURA_A).firestore()]) {
      await assertFails(updateDoc(pel(db), { pin: '482915' }));
      await assertFails(updateDoc(pel(db), { pin_asetettu: new Date() }));
      await assertFails(updateDoc(pel(db), { pelipaikka: 'KH', pin: '482915' }));
      await assertSucceeds(updateDoc(pel(db), { pelipaikka: 'KH' }));
    }
  });
  it('SA:kaan EI päivitä pin-kenttää selaimesta (Admin SDK ohittaa säännöt)', async () => {
    await assertFails(updateDoc(pel(saContext().firestore()), { pin: '482915' }));
    await assertSucceeds(updateDoc(pel(saContext().firestore()), { pelipaikka: 'OP' }));
  });
  it('create ilman pin-kenttää onnistuu, pin-kentän kanssa hylätään', async () => {
    const db = vpContext(SEURA_A).firestore();
    await assertSucceeds(setDoc(doc(db, 'seurat', SEURA_A, 'pelaajat', 'uusi-ok'), { etunimi: 'Uusi', joukkueet: [JOUKKUE_A1] }));
    await assertFails(setDoc(doc(db, 'seurat', SEURA_A, 'pelaajat', 'uusi-pin'), { etunimi: 'Uusi', joukkueet: [JOUKKUE_A1], pin: '482915' }));
  });
  it('pelaajatoken EI muuta omaa pin-kenttäänsä', async () => {
    await assertFails(updateDoc(pel(pelaajaItseContext().firestore()), { pin: '482915' }));
  });

  it('Solo: vanhempi EI aseta (create) eikä muuta child_pin-kenttää; muu profiili ennallaan', async () => {
    const P = 'solo-pin-vanhempi';
    const v = testEnv.authenticatedContext(P).firestore();
    await assertFails(setDoc(doc(v, 'players', 'sp-1'), { parent_uid: P, nimi: 'L', child_pin: '482915' }));
    await assertSucceeds(setDoc(doc(v, 'players', 'sp-2'), { parent_uid: P, nimi: 'L' }));
    await testEnv.withSecurityRulesDisabled(async (c) => {
      await setDoc(doc(c.firestore(), 'players', 'sp-3'), { parent_uid: P, nimi: 'L', child_pin: '482915', playerCode: 'TMP-ABCDEF' });
    });
    await assertFails(updateDoc(doc(v, 'players', 'sp-3'), { child_pin: '000111' }));
    await assertSucceeds(updateDoc(doc(v, 'players', 'sp-3'), { nimi: 'Uusi nimi' }));
    await assertSucceeds(setDoc(doc(v, 'players', 'sp-3'), { pp: 'oikea' }, { merge: true }));   // Solo_Profiilin tallennus
  });

  it('lupapyynnot/{rid}/tulos/{token}: get tunnetulla tokenilla, EI list, EI kirjoitusta; väärä token → ei löydy', async () => {
    await testEnv.withSecurityRulesDisabled(async (c) => {
      await setDoc(doc(c.firestore(), 'lupapyynnot', 'rq-1'), { status: 'hyvaksytty', token_hash: 'h', playerId: 'p1' });
      await setDoc(doc(c.firestore(), 'lupapyynnot', 'rq-1', 'tulos', 'tok-oikea'), { child_pin: '482915', playerCode: 'TMP-ABCDEF', playerId: 'p1' });
    });
    const anon = unauthContext().firestore();
    const s = await assertSucceeds(getDoc(doc(anon, 'lupapyynnot', 'rq-1', 'tulos', 'tok-oikea')));
    expect(s.data().child_pin).toBe('482915');
    const vaara = await assertSucceeds(getDoc(doc(anon, 'lupapyynnot', 'rq-1', 'tulos', 'tok-vaara')));
    expect(vaara.exists()).toBe(false);
    await assertFails(getDocs(collection(anon, 'lupapyynnot', 'rq-1', 'tulos')));
    await assertFails(setDoc(doc(anon, 'lupapyynnot', 'rq-1', 'tulos', 'tok-x'), { child_pin: '1' }));
    const kirj = testEnv.authenticatedContext('joku').firestore();
    await assertFails(getDocs(collection(kirj, 'lupapyynnot', 'rq-1', 'tulos')));
    // Päädokumentissa ei ole PIN:iä eikä koodia (uusi malli)
    const paa = await assertSucceeds(getDoc(doc(anon, 'lupapyynnot', 'rq-1')));
    expect(paa.data()).not.toHaveProperty('child_pin');
    expect(paa.data()).not.toHaveProperty('playerCode');
  });
});

/* ══════════════════════════════════════════════════════════════════════════════════════════
   v3.31 · P0 — deaktivointi ei estänyt pääsyä (1.10.2026)
   kayttajat-dokumentin pääsykentät (rooli, seuraId, aktiivinen + jälki, claimsAsetettu) vain palvelimella,
   myös SA:lta ja käyttäjältä itseltään. Poisto vain palvelimella (poistaKayttaja).
══════════════════════════════════════════════════════════════════════════════════════════ */
describe('v3.31 · kayttajat-pääsykentät vain palvelimella', () => {
  const K = 'valm-p0-001';
  beforeEach(async () => {
    await seedSeuraAndPelaaja(); await seedAdminDoc();
    await testEnv.withSecurityRulesDisabled(async (c) => {
      await setDoc(doc(c.firestore(), 'seurat', SEURA_A, 'kayttajat', K), { rooli: 'valmentaja', seuraId: SEURA_A, aktiivinen: true, etunimi: 'V', email: 'v@x.fi' });
    });
  });
  const kd = (db) => doc(db, 'seurat', SEURA_A, 'kayttajat', K);

  it('SA EI kirjoita aktiivinen-, rooli- eikä seuraId-kenttää selaimesta; muut kentät onnistuvat', async () => {
    const db = saContext().firestore();
    await assertFails(updateDoc(kd(db), { aktiivinen: false }));
    await assertFails(updateDoc(kd(db), { aktiivinen: false, deaktivoitu: new Date(), deaktivoija_uid: SA_UID }));
    await assertFails(updateDoc(kd(db), { rooli: 'vp' }));
    await assertFails(updateDoc(kd(db), { seuraId: SEURA_B }));
    await assertFails(updateDoc(kd(db), { claimsAsetettu: true }));
    await assertSucceeds(updateDoc(kd(db), { puhelin: '0401234567' }));
  });
  it('johto (VP) EI kirjoita aktiivinen-kenttää; yhteystiedot onnistuvat', async () => {
    const db = vpContext(SEURA_A).firestore();
    await assertFails(updateDoc(kd(db), { aktiivinen: false }));
    await assertFails(setDoc(kd(db), { aktiivinen: false }, { merge: true }));
    await assertSucceeds(setDoc(kd(db), { puhelin: '0401234567' }, { merge: true }));
  });
  it('käyttäjä itse EI muuta omaa aktiivinen- tai rooli-kenttäänsä', async () => {
    await testEnv.withSecurityRulesDisabled(async (c) => { await updateDoc(kd(c.firestore()), { aktiivinen: false }); });
    const db = valmentajaContext(K, SEURA_A).firestore();
    await assertFails(updateDoc(kd(db), { aktiivinen: true }));   // deaktivoitu ei aktivoi itseään
    await assertFails(updateDoc(kd(db), { rooli: 'vp' }));
    await assertSucceeds(updateDoc(kd(db), { lisenssitaso: 'c' }));
  });
  it('kayttajat-dokumenttia EI poisteta selaimesta (SA eikä johto) — vain poistaKayttaja-palvelinfunktio', async () => {
    await assertFails(deleteDoc(kd(saContext().firestore())));
    await assertFails(deleteDoc(kd(vpContext(SEURA_A).firestore())));
  });
  it('v3.32: kayttajat-dokumentin luonti selaimesta hylätään (SA, johto, käyttäjä itse) — vain luoKayttaja', async () => {
    const data = { rooli: 'valmentaja', seuraId: SEURA_A, aktiivinen: true, claimsAsetettu: true };
    await assertFails(setDoc(doc(vpContext(SEURA_A).firestore(), 'seurat', SEURA_A, 'kayttajat', 'uusi-k'), data));
    await assertFails(setDoc(doc(saContext().firestore(), 'seurat', SEURA_A, 'kayttajat', 'uusi-k2'), data));
    await assertFails(setDoc(doc(saContext().firestore(), 'seurat', SEURA_A, 'kayttajat', SA_UID), { notif_asetukset: {} }, { merge: true }));
    await assertFails(setDoc(doc(valmentajaContext('itse-uusi', SEURA_A).firestore(), 'seurat', SEURA_A, 'kayttajat', 'itse-uusi'), { lisenssitaso: 'c' }, { merge: true }));
  });
});

// ═══════════════════════════════════════════════════════════════════════════
// v3.33 — suostumus-kovennus: suostumusTila / huoltajaEmail vain palvelimella, kutsut, audit
// ═══════════════════════════════════════════════════════════════════════════
describe('v3.33 · suostumuskentät ja huoltajaEmail vain palvelimella', () => {
  beforeEach(async () => { await seedAdminDoc(); await seedSeuraAndPelaaja(); });
  const pel = (ctx) => doc(ctx.firestore(), 'seurat', SEURA_A, 'pelaajat', PELAAJA_UID);

  it('VP ei merkitse suostumusta annetuksi eikä muuta suostumusTilaa, suostumus-objektia tai huoltajaEmailia', async () => {
    const vp = vpContext(SEURA_A);
    await assertFails(updateDoc(pel(vp), { suostumusTila: 'annettu' }));
    await assertFails(updateDoc(pel(vp), { suostumusTila: 'odottaa' }));
    await assertFails(updateDoc(pel(vp), { suostumus: { annettu: true } }));
    await assertFails(updateDoc(pel(vp), { suostumusAnnettu: serverTimestamp() }));
    await assertFails(updateDoc(pel(vp), { huoltajaEmail: 'uusi@test.fi' }));
    await assertFails(setDoc(pel(vp), { huoltajaEmail: 'uusi@test.fi' }, { merge: true }));
  });
  it('myös SA ja oman joukkueen valmentaja estetty', async () => {
    await assertFails(updateDoc(pel(saContext()), { suostumusTila: 'annettu' }));
    await assertFails(updateDoc(pel(saContext()), { huoltajaEmail: 'sa@test.fi' }));
    await assertFails(updateDoc(pel(valmentajaContext(VALM_A_UID, SEURA_A)), { suostumusTila: 'annettu' }));
  });
  it('muut kentät päivittyvät edelleen (myös kun huoltajaEmail on mukana muuttumattomana)', async () => {
    const vp = vpContext(SEURA_A);
    await assertSucceeds(updateDoc(pel(vp), { etunimi: 'Uusi', joukkueet: [JOUKKUE_A1] }));
    await assertSucceeds(setDoc(pel(vp), { etunimi: 'Uusi2', huoltajaEmail: 'Huoltaja@Test.fi' }, { merge: true }));
  });
  it('luonti: huoltajaEmail + pilotti/odottaa sallittu; annettu / suostumus / suostumusAnnettu / suostumukset estetty', async () => {
    const vp = vpContext(SEURA_A).firestore();
    const uusi = (id) => doc(vp, 'seurat', SEURA_A, 'pelaajat', id);
    const pohja = { etunimi: 'U', sukunimi: 'P', joukkueet: [JOUKKUE_A1], huoltajaEmail: 'h@test.fi' };
    await assertSucceeds(setDoc(uusi('n1'), { ...pohja, suostumusTila: 'odottaa' }));
    await assertSucceeds(setDoc(uusi('n2'), { ...pohja, suostumusTila: 'pilotti' }));
    await assertSucceeds(setDoc(uusi('n3'), pohja));
    await assertFails(setDoc(uusi('n4'), { ...pohja, suostumusTila: 'annettu' }));
    await assertFails(setDoc(uusi('n5'), { ...pohja, suostumus: { annettu: true } }));
    await assertFails(setDoc(uusi('n6'), { ...pohja, suostumusAnnettu: serverTimestamp() }));
    await assertFails(setDoc(uusi('n7'), { ...pohja, suostumukset: ['rekisteri'] }));
  });
  it('kirjautumaton ei luo pelaajaa suostumus annettuna (suostumuslomakkeen vanha reitti)', async () => {
    await assertFails(setDoc(doc(unauthContext().firestore(), 'seurat', SEURA_A, 'pelaajat', 'lomake-uusi'),
      { etunimi: 'X', suostumusTila: 'annettu' }));
  });
});

describe('v3.33 · kutsut: ei kirjautumatonta päivitystä', () => {
  beforeEach(async () => {
    await seedAdminDoc(); await seedSeuraAndPelaaja();
    await testEnv.withSecurityRulesDisabled(async (ctx) => {
      await setDoc(doc(ctx.firestore(), 'seurat', SEURA_A, 'kutsut', 'k-odottaa'), { tila: 'odottaa', pelaajaId: PELAAJA_UID });
    });
  });
  const kutsu = (ctx) => doc(ctx.firestore(), 'seurat', SEURA_A, 'kutsut', 'k-odottaa');
  it('kirjautumaton ei hyväksy odottaa-kutsua (oli sallittu)', async () => {
    await assertFails(updateDoc(kutsu(unauthContext()), { tila: 'hyvaksytty', pelaajaId: 'muu' }));
  });
  it('toisen seuran valmentaja ei päivitä; oman seuran VP päivittää', async () => {
    await assertFails(updateDoc(kutsu(valmentajaContext(VALM_B_UID, SEURA_B)), { tila: 'lahetetty' }));
    await assertSucceeds(updateDoc(kutsu(vpContext(SEURA_A)), { tila: 'lahetetty' }));
  });
});

describe('v3.33 · audit: selain ei lue eikä kirjoita (myös SA)', () => {
  beforeEach(async () => {
    await seedAdminDoc();
    await testEnv.withSecurityRulesDisabled(async (ctx) => {
      await setDoc(doc(ctx.firestore(), 'audit', 'a1'), { toiminto: 'pin_asetettu', severity: 'info' });
    });
  });
  it('SA, VP, valmentaja ja kirjautumaton: ei getiä, listaa, luontia, päivitystä eikä poistoa', async () => {
    for (const ctx of [saContext(), vpContext(SEURA_A), valmentajaContext(VALM_A_UID, SEURA_A), unauthContext()]) {
      const db = ctx.firestore();
      await assertFails(getDoc(doc(db, 'audit', 'a1')));
      await assertFails(getDocs(collection(db, 'audit')));
      await assertFails(setDoc(doc(db, 'audit', 'uusi'), { toiminto: 'x' }));
      await assertFails(updateDoc(doc(db, 'audit', 'a1'), { severity: 'warn' }));
      await assertFails(deleteDoc(doc(db, 'audit', 'a1')));
    }
  });
});

// ═══════════════════════════════════════════════════════════════════════════
// v3.34 — Kehitystilanne v0: kehitysasetukset, seuratuki, kausikuvat
// ═══════════════════════════════════════════════════════════════════════════
describe('v3.34 · kehitysasetukset ja seuratuki', () => {
  beforeEach(async () => { await seedAdminDoc(); await seedSeuraAndPelaaja(); });
  const utj = () => testEnv.authenticatedContext('utj-fcl-001', { rooli: 'urheilutoimenjohtaja', seuraId: SEURA_A });
  for (const kok of ['kehitysasetukset', 'seuratuki']) {
    it(kok + ': VP ja urheilutoimenjohtaja kirjoittavat; sihteeri lukee mutta ei kirjoita; valmentaja ei kirjoita eikä lue', async () => {
      const ref = (ctx) => doc(ctx.firestore(), 'seurat', SEURA_A, kok, '2026');
      await assertSucceeds(setDoc(ref(vpContext(SEURA_A)), { vuosi: 2026 }));
      await assertSucceeds(setDoc(ref(utj()), { vuosi: 2026, paivitetty: 1 }, { merge: true }));
      await assertSucceeds(getDoc(ref(sihteeriContext(SEURA_A))));
      await assertFails(setDoc(ref(sihteeriContext(SEURA_A)), { vuosi: 2026 }));
      await assertFails(setDoc(ref(valmentajaContext(VALM_A_UID, SEURA_A)), { vuosi: 2026 }));
      await assertFails(getDoc(ref(valmentajaContext(VALM_A_UID, SEURA_A))));
      await assertFails(deleteDoc(ref(vpContext(SEURA_A))));
    });
    it(kok + ': toisen seuran VP ei lue eikä kirjoita', async () => {
      const toinen = testEnv.authenticatedContext('vp-kpv-001', { rooli: 'vp', seuraId: SEURA_B });
      await assertFails(setDoc(doc(toinen.firestore(), 'seurat', SEURA_A, kok, '2026'), { vuosi: 2026 }));
      await assertFails(getDoc(doc(toinen.firestore(), 'seurat', SEURA_A, kok, '2026')));
    });
  }
});

describe('v3.34/v3.35 · kausikuvat (vain luonti; v3.35: demorajaus purettu, GDPR-poisto kattaa kausikuvat)', () => {
  beforeEach(async () => { await seedAdminDoc(); await seedSeuraAndPelaaja(); });
  const kuva = { kausi: '2026', luotu: 1, pelaajat: [{ id: 'p1' }] };
  it('v3.35: oikea (ei-demo) seura: VP ja UTJ voivat luoda; valmentaja ja sihteeri eivät; toinen seura ei', async () => {
    await assertSucceeds(setDoc(doc(vpContext(SEURA_A).firestore(), 'seurat', SEURA_A, 'kausikuvat', '2026'), kuva));
    const utj = testEnv.authenticatedContext('utj-fcl-001', { rooli: 'urheilutoimenjohtaja', seuraId: SEURA_A });
    await assertSucceeds(setDoc(doc(utj.firestore(), 'seurat', SEURA_A, 'kausikuvat', '2025'), Object.assign({}, kuva, { kausi: '2025' })));
    await assertFails(setDoc(doc(valmentajaContext(VALM_A_UID, SEURA_A).firestore(), 'seurat', SEURA_A, 'kausikuvat', '2024'), Object.assign({}, kuva, { kausi: '2024' })));
    await assertFails(setDoc(doc(sihteeriContext(SEURA_A).firestore(), 'seurat', SEURA_A, 'kausikuvat', '2024'), Object.assign({}, kuva, { kausi: '2024' })));
    const toinen = testEnv.authenticatedContext('vp-kpv-001', { rooli: 'vp', seuraId: SEURA_B });
    await assertFails(setDoc(doc(toinen.firestore(), 'seurat', SEURA_A, 'kausikuvat', '2024'), Object.assign({}, kuva, { kausi: '2024' })));
  });
  it('demoseura: VP luo kerran; päivitys ja poisto estetty; toinen tallennus samalle kaudelle estetty', async () => {
    await testEnv.withSecurityRulesDisabled(async (ctx) => { await setDoc(doc(ctx.firestore(), 'seurat', SEURA_A), { nimi: 'FC Lahti', demo: true }, { merge: true }); });
    const ref = doc(vpContext(SEURA_A).firestore(), 'seurat', SEURA_A, 'kausikuvat', '2026');
    await assertSucceeds(setDoc(ref, kuva));
    await assertFails(setDoc(ref, kuva));                       // olemassa → update → estetty
    await assertFails(updateDoc(ref, { pelaajat: [] }));
    await assertFails(deleteDoc(ref));
    await assertSucceeds(getDoc(doc(sihteeriContext(SEURA_A).firestore(), 'seurat', SEURA_A, 'kausikuvat', '2026')));
    await assertFails(setDoc(doc(sihteeriContext(SEURA_A).firestore(), 'seurat', SEURA_A, 'kausikuvat', '2027'), Object.assign({}, kuva, { kausi: '2027' })));
    await assertFails(setDoc(doc(vpContext(SEURA_A).firestore(), 'seurat', SEURA_A, 'kausikuvat', '2027'), { kausi: '2027', luotu: 1 }));   // pelaajat puuttuu
  });
});

// ═══════════════════════════════════════════════════════════════════════════
// v3.35 — Kehitystilanne v0.1: seuran omat vapaat tavoitteet + kirjaukset
// ═══════════════════════════════════════════════════════════════════════════
describe('v3.35 · omat_tavoitteet ja kirjaukset', () => {
  const UTJ_UID = 'utj-fcl-001';
  const utj = () => testEnv.authenticatedContext(UTJ_UID, { rooli: 'urheilutoimenjohtaja', seuraId: SEURA_A });
  const tav = (tyyppi, uid, extra) => Object.assign({ nimi: 'Omat kasvatit edustukseen', tyyppi, tavoite: tyyppi === 'kylla_ei' ? true : 3, yksikko: 'kpl',
    suunta: 'suurempi', alkaa: '2026-01-01', aikaraja: '2028-12-31', tekija: 'seura', luotu: serverTimestamp(), luoja_uid: uid, arkistoitu: false }, extra || {});
  const tRef = (ctx, id) => doc(ctx.firestore(), 'seurat', SEURA_A, 'omat_tavoitteet', id);
  const kCol = (ctx, id) => collection(ctx.firestore(), 'seurat', SEURA_A, 'omat_tavoitteet', id, 'kirjaukset');
  const kirjaus = (uid, extra) => Object.assign({ pvm: '2026-03-15', arvo: 1, pelaajaId: null, huomio: '', luoja_uid: uid, luotu: serverTimestamp(), mitatoi: null }, extra || {});
  async function seedTavoite(id, tyyppi, extra) {
    await testEnv.withSecurityRulesDisabled(async (ctx) => {
      await setDoc(doc(ctx.firestore(), 'seurat', SEURA_A, 'omat_tavoitteet', id), Object.assign({ nimi: 'X', tyyppi, tavoite: tyyppi === 'kylla_ei' ? true : 3, aikaraja: '2028-12-31', tekija: 'seura', luoja_uid: VP_A_UID, arkistoitu: false }, extra || {}));
    });
  }
  beforeEach(async () => { await seedAdminDoc(); await seedSeuraAndPelaaja(); });

  it('tavoite: VP ja UTJ luovat; sihteeri lukee mutta ei luo; valmentaja ei luo eikä lue; toisen seuran VP ei pääse', async () => {
    await assertSucceeds(setDoc(tRef(vpContext(SEURA_A), 't1'), tav('maara', VP_A_UID)));
    await assertSucceeds(setDoc(tRef(utj(), 't2'), tav('summa', UTJ_UID, { yksikko: '€', tekija: 'pelaajat' })));
    await assertSucceeds(getDoc(tRef(sihteeriContext(SEURA_A), 't1')));
    await assertFails(setDoc(tRef(sihteeriContext(SEURA_A), 't3'), tav('maara', 'sihteeri-fcl-001')));
    await assertFails(setDoc(tRef(valmentajaContext(VALM_A_UID, SEURA_A), 't3'), tav('maara', VALM_A_UID)));
    await assertFails(getDoc(tRef(valmentajaContext(VALM_A_UID, SEURA_A), 't1')));
    const toinen = testEnv.authenticatedContext('vp-kpv-001', { rooli: 'vp', seuraId: SEURA_B });
    await assertFails(getDoc(tRef(toinen, 't1')));
    await assertFails(setDoc(tRef(toinen, 't4'), tav('maara', 'vp-kpv-001')));
  });
  it('tavoite: kenttien tarkistus (tyyppi, tekijä, aikaraja, suunta, luoja_uid, ylimääräinen kenttä, kylla_ei-tavoite)', async () => {
    const vp = vpContext(SEURA_A);
    await assertFails(setDoc(tRef(vp, 'a'), tav('keskiarvo', VP_A_UID)));
    await assertFails(setDoc(tRef(vp, 'b'), tav('maara', VP_A_UID, { tekija: 'talous' })));
    await assertFails(setDoc(tRef(vp, 'c'), tav('maara', VP_A_UID, { aikaraja: '31.12.2028' })));
    await assertFails(setDoc(tRef(vp, 'd'), tav('maara', VP_A_UID, { suunta: 'pienempi' })));          // pienempi vain viimeisin
    await assertSucceeds(setDoc(tRef(vp, 'e'), tav('viimeisin', VP_A_UID, { suunta: 'pienempi', tavoite: 25 })));
    await assertFails(setDoc(tRef(vp, 'f'), tav('maara', 'joku-muu')));
    await assertFails(setDoc(tRef(vp, 'g'), tav('maara', VP_A_UID, { pelaajaId: 'pelaaja-001' })));
    await assertFails(setDoc(tRef(vp, 'h'), tav('kylla_ei', VP_A_UID, { tavoite: 1 })));
    await assertFails(setDoc(tRef(vp, 'i'), tav('maara', VP_A_UID, { arkistoitu: true })));
    await assertFails(setDoc(tRef(vp, 'j'), tav('maara', VP_A_UID, { alkaa: '2029-01-01' })));       // alku aikarajan jälkeen
  });
  it('tavoite: päivitys vain arkistointi; poisto estetty myös VP:ltä', async () => {
    await seedTavoite('t1', 'maara');
    const vp = vpContext(SEURA_A);
    await assertSucceeds(updateDoc(tRef(vp, 't1'), { arkistoitu: true, paivitetty: serverTimestamp(), paivittaja_uid: VP_A_UID }));
    await assertFails(updateDoc(tRef(vp, 't1'), { tavoite: 1 }));
    await assertFails(updateDoc(tRef(vp, 't1'), { nimi: 'Muu' }));
    await assertFails(deleteDoc(tRef(vp, 't1')));
  });
  it('kirjaus: VP ja UTJ luovat; sihteeri lukee; valmentaja ja sihteeri eivät kirjoita; päivitys ja poisto estetty', async () => {
    await seedTavoite('t1', 'maara');
    const vp = vpContext(SEURA_A);
    const ref = await addDoc(kCol(vp, 't1'), kirjaus(VP_A_UID));
    await assertSucceeds(addDoc(kCol(utj(), 't1'), kirjaus(UTJ_UID, { pelaajaId: PELAAJA_UID })));
    await assertSucceeds(getDoc(doc(kCol(sihteeriContext(SEURA_A), 't1'), ref.id)));
    await assertFails(addDoc(kCol(sihteeriContext(SEURA_A), 't1'), kirjaus('sihteeri-fcl-001')));
    await assertFails(addDoc(kCol(valmentajaContext(VALM_A_UID, SEURA_A), 't1'), kirjaus(VALM_A_UID)));
    await assertFails(getDoc(doc(kCol(valmentajaContext(VALM_A_UID, SEURA_A), 't1'), ref.id)));
    await assertFails(updateDoc(doc(kCol(vp, 't1'), ref.id), { arvo: 2 }));
    await assertFails(deleteDoc(doc(kCol(vp, 't1'), ref.id)));
  });
  it('kirjaus: arvo tyypin mukaan; summa ilman pelaajalinkkiä; pelaajan oltava seuran pelaaja; vieras luoja_uid ja ylimääräinen kenttä torjutaan', async () => {
    await seedTavoite('m', 'maara'); await seedTavoite('s', 'summa'); await seedTavoite('v', 'viimeisin'); await seedTavoite('k', 'kylla_ei');
    const vp = vpContext(SEURA_A);
    await assertFails(addDoc(kCol(vp, 'm'), kirjaus(VP_A_UID, { arvo: 2 })));                 // määrä = +1
    await assertSucceeds(addDoc(kCol(vp, 's'), kirjaus(VP_A_UID, { arvo: 6000 })));
    await assertFails(addDoc(kCol(vp, 's'), kirjaus(VP_A_UID, { arvo: 6000, pelaajaId: PELAAJA_UID })));   // ei pelaajakohtaisia summia
    await assertSucceeds(addDoc(kCol(vp, 'v'), kirjaus(VP_A_UID, { arvo: 31.5 })));
    await assertFails(addDoc(kCol(vp, 'v'), kirjaus(VP_A_UID, { arvo: 'paljon' })));
    await assertSucceeds(addDoc(kCol(vp, 'k'), kirjaus(VP_A_UID, { arvo: true })));
    await assertFails(addDoc(kCol(vp, 'k'), kirjaus(VP_A_UID, { arvo: 1 })));
    await assertFails(addDoc(kCol(vp, 'm'), kirjaus(VP_A_UID, { pelaajaId: 'ei-ole-olemassa' })));
    await assertFails(addDoc(kCol(vp, 'm'), kirjaus('joku-muu')));
    await assertFails(addDoc(kCol(vp, 'm'), kirjaus(VP_A_UID, { pvm: '15.3.2026' })));
    await assertFails(addDoc(kCol(vp, 'm'), kirjaus(VP_A_UID, { huomio: 'x'.repeat(281) })));
    await assertFails(addDoc(kCol(vp, 'm'), kirjaus(VP_A_UID, { diagnoosi: 'polvi' })));
  });
  it('kirjaus: kumoava kirjaus (mitatoi) viittaa olemassa olevaan, arvo null; arkistoituun tavoitteeseen ei kirjata', async () => {
    await seedTavoite('s', 'summa'); await seedTavoite('a', 'maara', { arkistoitu: true });
    const vp = vpContext(SEURA_A);
    const alkup = await addDoc(kCol(vp, 's'), kirjaus(VP_A_UID, { arvo: 5000 }));
    await assertSucceeds(addDoc(kCol(vp, 's'), kirjaus(VP_A_UID, { arvo: null, mitatoi: alkup.id, huomio: 'Korjaus' })));
    await assertFails(addDoc(kCol(vp, 's'), kirjaus(VP_A_UID, { arvo: 100, mitatoi: alkup.id })));   // kumoavalla ei arvoa
    await assertFails(addDoc(kCol(vp, 's'), kirjaus(VP_A_UID, { arvo: null, mitatoi: 'ei-ole' })));
    await assertFails(addDoc(kCol(vp, 'a'), kirjaus(VP_A_UID)));
  });
});

// ═══════════════════════════════════════════════════════════════════════════
// §26 pari-invariantti: lähdedokumentti + pelaajan pikakentät YHDESSÄ batchissa (tm_pikakirjaus, VP review).
// Ei Rules-muutosta: batchin jokainen kirjoitus arvioidaan kuten ennen erikseen → kaikki tai ei mitään.
// ═══════════════════════════════════════════════════════════════════════════
describe('§26 atomiset batchit: testitulos/review + pikakentät', () => {
  beforeEach(async () => { await seedAdminDoc(); await seedSeuraAndPelaaja(); });
  const pel = (db, sid, pid) => doc(db, 'seurat', sid, 'pelaajat', pid);
  const lue = async (polku) => { let d; await testEnv.withSecurityRulesDisabled(async (c) => { d = (await getDoc(doc(c.firestore(), ...polku))).data(); }); return d; };

  it('VP: testitulos + hh-pikakenttäpari samassa batchissa onnistuu (create + update)', async () => {
    const db = vpContext(SEURA_A).firestore();
    const b = FS_MOD.writeBatch(db);
    b.set(doc(db, 'seurat', SEURA_A, 'pelaajat', PELAAJA_UID, 'testitulokset', '2026-10-03_vapaa'), { testit: { lin30m: 4.6 }, testauspvm: '2026-10-03' }, { merge: true });
    b.update(pel(db, SEURA_A, PELAAJA_UID), { hh_viimeisin: { lin30m: 4.6 }, hh_pvm: '2026-10-03' });
    await assertSucceeds(b.commit());
    expect((await lue(['seurat', SEURA_A, 'pelaajat', PELAAJA_UID])).hh_pvm).toBe('2026-10-03');
    expect(await lue(['seurat', SEURA_A, 'pelaajat', PELAAJA_UID, 'testitulokset', '2026-10-03_vapaa'])).toBeTruthy();
  });
  it('valmentaja MUUN joukkueen pelaajaan (ei oikeutta): koko batch hylätään → EI pikakenttiä ilman tulosta', async () => {
    // Muun joukkueen pelaaja: hylätään sekä ennen v3.36:ta että sen jälkeen (v3.36 sallii vain OMAN joukkueen).
    const db = valmentajaContext(VALM_A_UID, SEURA_A).firestore();
    const b = FS_MOD.writeBatch(db);
    b.set(doc(db, 'seurat', SEURA_A, 'pelaajat', PELAAJA_A2_UID, 'testitulokset', '2026-10-03_vapaa'), { testit: { lin30m: 4.6 } }, { merge: true });
    b.update(pel(db, SEURA_A, PELAAJA_A2_UID), { hh_viimeisin: { lin30m: 4.6 }, hh_pvm: '2026-10-03' });
    await assertFails(b.commit());
    expect((await lue(['seurat', SEURA_A, 'pelaajat', PELAAJA_A2_UID])).hh_pvm).toBeUndefined();
    expect(await lue(['seurat', SEURA_A, 'pelaajat', PELAAJA_A2_UID, 'testitulokset', '2026-10-03_vapaa'])).toBeUndefined();
  });
  it('review: VP ja oman joukkueen valmentaja kirjaavat reviewit/{pvm} + review_viimeisin_pvm samassa batchissa', async () => {
    for (const [ctx, pvm] of [[vpContext(SEURA_A), '2026-10-03'], [valmentajaContext(VALM_A_UID, SEURA_A), '2026-10-04']]) {
      const db = ctx.firestore(), b = FS_MOD.writeBatch(db);
      b.set(doc(db, 'seurat', SEURA_A, 'pelaajat', PELAAJA_UID, 'reviewit', pvm), { tyyppi: 'mdr', pvm, paatos: '', idp_paivitetty: false });
      b.set(pel(db, SEURA_A, PELAAJA_UID), { review_viimeisin_pvm: pvm, review_viimeisin_tyyppi: 'mdr' }, { merge: true });
      await assertSucceeds(b.commit());
      expect((await lue(['seurat', SEURA_A, 'pelaajat', PELAAJA_UID])).review_viimeisin_pvm).toBe(pvm);
    }
  });
  it('PHV: oman joukkueen valmentaja kirjaa biologinen_ika/{pvm} + phv-pikakentät samassa batchissa; muun joukkueen → hylätään kokonaan', async () => {
    const db = valmentajaContext(VALM_A_UID, SEURA_A).firestore();
    const kirjaa = (pid) => { const b = FS_MOD.writeBatch(db); b.set(doc(db, 'seurat', SEURA_A, 'pelaajat', pid, 'biologinen_ika', '2026-10-03'), { mittauspaiva: '2026-10-03', phv_tila_koodi: 'PRE' }); b.update(pel(db, SEURA_A, pid), { biologinenIka_viimeisin: { mittauspaiva: '2026-10-03' }, phv_tila: 'PRE' }); return b.commit(); };
    await assertSucceeds(kirjaa(PELAAJA_UID));
    expect((await lue(['seurat', SEURA_A, 'pelaajat', PELAAJA_UID])).phv_tila).toBe('PRE');
    await assertFails(kirjaa(PELAAJA_A2_UID));
    expect((await lue(['seurat', SEURA_A, 'pelaajat', PELAAJA_A2_UID])).phv_tila).toBeUndefined();
    expect(await lue(['seurat', SEURA_A, 'pelaajat', PELAAJA_A2_UID, 'biologinen_ika', '2026-10-03'])).toBeUndefined();
  });
  it('review: toisen seuran VP → koko batch hylätään, kumpikaan ei tallennu', async () => {
    const db = testEnv.authenticatedContext('vp-kpv-001', { rooli: 'vp', seuraId: SEURA_B }).firestore();
    const b = FS_MOD.writeBatch(db);
    b.set(doc(db, 'seurat', SEURA_A, 'pelaajat', PELAAJA_UID, 'reviewit', '2026-10-03'), { tyyppi: 'mdr', pvm: '2026-10-03' });
    b.set(pel(db, SEURA_A, PELAAJA_UID), { review_viimeisin_pvm: '2026-10-03', review_viimeisin_tyyppi: 'mdr' }, { merge: true });
    await assertFails(b.commit());
    expect((await lue(['seurat', SEURA_A, 'pelaajat', PELAAJA_UID])).review_viimeisin_pvm).toBeUndefined();
    expect(await lue(['seurat', SEURA_A, 'pelaajat', PELAAJA_UID, 'reviewit', '2026-10-03'])).toBeUndefined();
  });
});
