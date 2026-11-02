/**
 * TalentMaster™ — Rules v3.73 (Vaihe 1 · PR 2b, terveys):
 *   1) pelaajadokumentin create/update hylkää terveysavaimet kaikilta (myös SA), poisto sallitaan;
 *   2) B6: fysioterapeutin tallennus (oikea lib/tm_sisainen.js tmTerveysKirjoita) menee sisainen/terveys:iin ilman pelaajadokumentin poikkeusta;
 *   3) fysiikkavalmentaja ei kirjoita sisainen/terveys:iin (ei myöskään oman joukkueen pelaajalle).
 * Ajo: npm run test:rules (Java ≥ 21).
 */
import { initializeTestEnvironment, assertSucceeds, assertFails } from '@firebase/rules-unit-testing';
import { readFileSync } from 'fs';
import { resolve, dirname } from 'path';
import { fileURLToPath } from 'url';
import { createRequire } from 'module';
import { setDoc, getDoc, doc, updateDoc, deleteField } from 'firebase/firestore';
import { describe, it, beforeAll, afterAll, beforeEach, expect } from 'vitest';

const __dirname = dirname(fileURLToPath(import.meta.url));
const require = createRequire(import.meta.url);
const S = require('../../lib/tm_sisainen.js');
const RULES = readFileSync(resolve(__dirname, '../../tm_admin/firestore.rules'), 'utf8');
const [HOST, PORT] = (process.env.FIRESTORE_EMULATOR_HOST || '127.0.0.1:8080').split(':');
const A = 'fcl', PID = 'p1', U12 = 'fcl_u12';
const TERVEYS = ['kaytettavyys', 'loukkaantuminen_tyyppi', 'loukkaantuminen_alue', 'loukkaantuminen_pvm', 'paluu_arvio'];
const VANHA = { kaytettavyys: 'loukkaantunut', loukkaantuminen_tyyppi: 'nivel', loukkaantuminen_alue: 'Nilkka', loukkaantuminen_pvm: '2026-10-20', paluu_arvio: '2026-11-15' };
let env;

beforeAll(async () => { env = await initializeTestEnvironment({ projectId: 'talentmaster-terveys-pr2b', firestore: { rules: RULES, host: HOST, port: Number(PORT) } }); });
afterAll(async () => { if (env) await env.cleanup(); });

beforeEach(async () => {
  await env.clearFirestore();
  await env.withSecurityRulesDisabled(async (c) => {
    const db = c.firestore();
    await setDoc(doc(db, 'admins', 'sa-1'), { rooli: 'super_admin' });
    await setDoc(doc(db, 'seurat', A), { nimi: 'FCL' });
    await setDoc(doc(db, 'seurat', A, 'kayttajat', 'valm-12'), { rooli: 'valmentaja', joukkueet: [U12] });
    await setDoc(doc(db, 'seurat', A, 'kayttajat', 'fiisi-12'), { rooli: 'fysiikkavalmentaja', joukkueet: [U12] });
    await setDoc(doc(db, 'seurat', A, 'pelaajat', PID), { etunimi: 'Testi', joukkueet: [U12] });
    await setDoc(doc(db, 'seurat', A, 'pelaajat', 'p-vanha'), Object.assign({ etunimi: 'Vanha', joukkueet: [U12] }, VANHA));   // ennen siivousta jäänyt kopio (tuotannossa 0)
    await setDoc(doc(db, 'seurat', A, 'pelaajat', 'p-uusi'), { etunimi: 'Uusi', joukkueet: [U12] });
  });
});

const staff = (uid, rooli) => env.authenticatedContext(uid, { rooli, seuraId: A }).firestore();
const sa = () => env.authenticatedContext('sa-1', { rooli: 'super_admin' }).firestore();
const vp = () => staff('vp-a', 'vp'), valm12 = () => staff('valm-12', 'valmentaja'), talentti = () => staff('tal-a', 'talenttivalmentaja');
const fysio = () => staff('fys-1', 'fysioterapeutti'), fiisi12 = () => staff('fiisi-12', 'fysiikkavalmentaja');
const pel = (db, pid) => doc(db, 'seurat', A, 'pelaajat', pid || PID);
const terv = (db, pid) => doc(db, 'seurat', A, 'pelaajat', pid || PID, 'sisainen', 'terveys');
const KIRJOITTAJAT = () => [sa(), vp(), valm12(), talentti()];

describe('v3.73 · pelaajadokumentti: terveysavaimet hylätään kaikilta (myös SA), poisto sallitaan', () => {
  it('create: pelaajaa ei voi luoda terveysavaimella; ilman niitä luonti toimii kuten ennen', async () => {
    let n = 0;
    for (const k of TERVEYS) for (const db of [sa(), vp(), valm12()]) { n++; await assertFails(setDoc(pel(db, 'luo' + n), { etunimi: 'X', joukkueet: [U12], [k]: 'x' })); }
    for (const db of [sa(), vp(), valm12()]) { n++; await assertSucceeds(setDoc(pel(db, 'luo' + n), { etunimi: 'X', joukkueet: [U12] })); }
  });
  it('update: terveysavaimen LISÄYS hylätään (update ja set merge), myös yhdessä sallitun kentän kanssa', async () => {
    for (const k of TERVEYS) for (const db of KIRJOITTAJAT()) {
      await assertFails(updateDoc(pel(db), { [k]: 'x' }));
      await assertFails(setDoc(pel(db), { [k]: 'x' }, { merge: true }));
      await assertFails(updateDoc(pel(db), { etunimi: 'Uusi nimi', [k]: 'x' }));
    }
  });
  it('update: olemassa olevan terveysavaimen MUUTOS hylätään', async () => {
    for (const k of TERVEYS) for (const db of KIRJOITTAJAT()) await assertFails(updateDoc(pel(db, 'p-vanha'), { [k]: 'muutettu' }));
  });
  it('update: terveysavaimen POISTO sallitaan (FieldValue.delete), yksittäin ja kaikki kerralla', async () => {
    await assertSucceeds(updateDoc(pel(valm12(), 'p-vanha'), { paluu_arvio: deleteField() }));
    await assertSucceeds(updateDoc(pel(vp(), 'p-vanha'), { loukkaantuminen_alue: deleteField(), loukkaantuminen_pvm: deleteField() }));
    await assertSucceeds(updateDoc(pel(sa(), 'p-vanha'), { kaytettavyys: deleteField(), loukkaantuminen_tyyppi: deleteField() }));
    const jaljella = Object.keys((await getDoc(pel(sa(), 'p-vanha'))).data()).filter((k) => TERVEYS.includes(k));
    expect(jaljella).toEqual([]);
  });
  it('regressio: muut kentät päivittyvät, vaikka dokumentissa on vielä vanha terveyskopio (muuttumattomat avaimet eivät estä)', async () => {
    for (const db of KIRJOITTAJAT()) { await assertSucceeds(updateDoc(pel(db, 'p-vanha'), { etunimi: 'Nimi ' + Math.random() })); await assertSucceeds(updateDoc(pel(db), { etunimi: 'Nimi ' + Math.random() })); }
    await assertSucceeds(setDoc(pel(valm12(), 'p-vanha'), Object.assign({ etunimi: 'Sama data' }, VANHA), { merge: true }));   // sama arvo uudelleen = ei muutosta → sallittu
  });
});

describe('v3.73 · B6: fysioterapeutin tallennus toimii ilman pelaajadokumentin sääntöpoikkeusta', () => {
  it('oikea tmTerveysKirjoita (lib/tm_sisainen.js) fysioterapeutin istunnolla: uusi terveys-dokumentti, päivitys ja "palautunut"-poisto onnistuvat; pelaajadokumenttiin ei tule terveysavaimia', async () => {
    const db = fysio();
    await assertSucceeds(S.tmTerveysKirjoita(db, A, 'p-uusi', { kaytettavyys: 'loukkaantunut', loukkaantuminen_tyyppi: 'lihas', loukkaantuminen_alue: 'Reisi', paluu_arvio: '2026-12-01' }, {}));
    await assertSucceeds(S.tmTerveysKirjoita(db, A, 'p-uusi', { kaytettavyys: 'kuntoutuksessa' }, {}));
    await assertSucceeds(S.tmTerveysKirjoita(db, A, 'p-uusi', { kaytettavyys: 'aktiivinen', loukkaantuminen_tyyppi: deleteField(), loukkaantuminen_alue: deleteField(), loukkaantuminen_pvm: deleteField(), paluu_arvio: deleteField() }, {}));
    const t = (await getDoc(terv(sa(), 'p-uusi'))).data();
    expect(t.kaytettavyys).toBe('aktiivinen'); expect(t.terveysSeuraId).toBe(A);
    for (const k of ['loukkaantuminen_tyyppi', 'loukkaantuminen_alue', 'loukkaantuminen_pvm', 'paluu_arvio']) expect(k in t).toBe(false);
    const p = (await getDoc(pel(sa(), 'p-uusi'))).data();
    expect(Object.keys(p).filter((k) => TERVEYS.includes(k))).toEqual([]);
  });
  it('fysioterapeutti EI kirjoita terveysavainta pelaajadokumenttiin (ei poikkeusta), mutta jaksofokus-oikeus ennallaan (v3.11)', async () => {
    for (const k of TERVEYS) { await assertFails(updateDoc(pel(fysio()), { [k]: 'x' })); await assertFails(updateDoc(pel(fysio()), { jaksofokus: { domeeni: 'fyysinen' }, [k]: 'x' })); }
    await assertSucceeds(updateDoc(pel(fysio()), { jaksofokus: { domeeni: 'fyysinen' } }));
  });
});

describe('v3.73 · fysiikkavalmentaja ei kirjoita sisainen/terveys:iin', () => {
  it('oman joukkueen pelaaja (sama joukkue kuin valmentajalla): create, set merge ja update hylätään; valmentaja samassa asetelmassa saa', async () => {
    await assertFails(S.tmTerveysKirjoita(fiisi12(), A, 'p-uusi', { kaytettavyys: 'tauko' }, {}));
    await assertFails(setDoc(terv(fiisi12(), 'p-uusi'), { terveysSeuraId: A, kaytettavyys: 'tauko' }));
    await assertSucceeds(S.tmTerveysKirjoita(valm12(), A, PID, { kaytettavyys: 'loukkaantunut' }, {}));
    await assertFails(setDoc(terv(fiisi12()), { terveysSeuraId: A, kaytettavyys: 'aktiivinen' }, { merge: true }));
    await assertFails(updateDoc(terv(fiisi12()), { kaytettavyys: 'aktiivinen' }));
    expect((await getDoc(terv(sa()))).data().kaytettavyys).toBe('loukkaantunut');
  });
  it('fysiikkavalmentaja ei edelleenkään lue terveyttä; muut kirjoitukset ennallaan (sisainen/tiedot oman joukkueen pelaajalle, pelaajadokumentti)', async () => {
    await assertFails(getDoc(terv(fiisi12())));
    await assertSucceeds(setDoc(doc(fiisi12(), 'seurat', A, 'pelaajat', PID, 'sisainen', 'tiedot'), { seuraId: A, talenttiTaso: 'perus', paivitetty: 'T' }, { merge: true }));
    await assertSucceeds(updateDoc(pel(fiisi12()), { etunimi: 'Fiisi muokkasi' }));
  });
});

describe('v3.73 · luku ennallaan', () => {
  it('pelaaja ja huoltaja eivät lue sisainen/terveys:iä; fysioterapeutti, vp ja oman joukkueen valmentaja lukevat', async () => {
    await env.withSecurityRulesDisabled(async (c) => { await setDoc(terv(c.firestore()), { terveysSeuraId: A, kaytettavyys: 'tauko' }); await updateDoc(pel(c.firestore()), { huoltajaEmail: 'h@test.fi' }); });
    const pelaaja = env.authenticatedContext('pel_' + A + '_' + PID, { rooli: 'pelaaja', pelaajaSeuraId: A, pelaajaId: PID, firebase: { sign_in_provider: 'custom' } }).firestore();
    const huoltaja = env.authenticatedContext('h-1', { email: 'h@test.fi' }).firestore();
    for (const db of [pelaaja, huoltaja]) await assertFails(getDoc(terv(db)));
    for (const db of [fysio(), vp(), valm12()]) await assertSucceeds(getDoc(terv(db)));
  });
});
