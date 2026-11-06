/**
 * TalentMaster™ — Rules v3.80 (B9b, PM 3.11.2026 B9 päätös 4): perutun suostumuksen pelaajalle EI uusia dokumentteja
 * mihinkään seurat/{sid}/pelaajat/{pid}/<alikokoelma>-polkuun — kaikilta, myös SA:lta. Olemassa olevan päivitys ja luku ennallaan.
 * Peruttu = suostumusTila 'peruttu' TAI suostumus.peruttu asetettu (lib/tm_suostumus.js tmSuostumusPeruttu).
 * Ajo: npm run test:rules (Java ≥ 21).
 */
import { initializeTestEnvironment, assertSucceeds, assertFails } from '@firebase/rules-unit-testing';
import { readFileSync } from 'fs';
import { resolve, dirname } from 'path';
import { fileURLToPath } from 'url';
import { createRequire } from 'module';
import { setDoc, getDoc, doc, updateDoc, writeBatch } from 'firebase/firestore';
import { describe, it, beforeAll, afterAll, beforeEach, expect } from 'vitest';

const __dirname = dirname(fileURLToPath(import.meta.url));
const require = createRequire(import.meta.url);
const TS = require('../../lib/tm_suostumus.js');
const RULES = readFileSync(resolve(__dirname, '../../tm_admin/firestore.rules'), 'utf8');
const [HOST, PORT] = (process.env.FIRESTORE_EMULATOR_HOST || '127.0.0.1:8080').split(':');
const A = 'fcl', U12 = 'fcl_u12';
const PERUTTU_TILA = { etunimi: 'Peruttu', joukkueet: [U12], suostumusTila: 'peruttu', suostumus: { annettu: { aika: 'x' }, peruttu: { aika: 'y', rooli: 'huoltaja' } } };
const PERUTTU_VAIN_OLIO = { etunimi: 'Uusi kutsu', joukkueet: [U12], suostumusTila: 'odottaa', suostumus: { peruttu: { aika: 'y' } } };   // uusi kutsu: tila 'odottaa', peruttu pysyy
const ANNETTU = { etunimi: 'Ok', joukkueet: [U12], suostumusTila: 'annettu', suostumus: { annettu: { aika: 'x' } } };
let env;

beforeAll(async () => { env = await initializeTestEnvironment({ projectId: 'talentmaster-b9b', firestore: { rules: RULES, host: HOST, port: Number(PORT) } }); });
afterAll(async () => { if (env) await env.cleanup(); });

beforeEach(async () => {
  await env.clearFirestore();
  await env.withSecurityRulesDisabled(async (c) => {
    const db = c.firestore();
    await setDoc(doc(db, 'admins', 'sa-1'), { rooli: 'super_admin' });
    await setDoc(doc(db, 'seurat', A), { nimi: 'FCL' });
    await setDoc(doc(db, 'seurat', A, 'kayttajat', 'valm-12'), { rooli: 'valmentaja', joukkueet: [U12] });
    await setDoc(doc(db, 'seurat', A, 'pelaajat', 'p-peruttu'), PERUTTU_TILA);
    await setDoc(doc(db, 'seurat', A, 'pelaajat', 'p-olio'), PERUTTU_VAIN_OLIO);
    await setDoc(doc(db, 'seurat', A, 'pelaajat', 'p-ok'), ANNETTU);
    await setDoc(doc(db, 'seurat', A, 'pelaajat', 'p-peruttu', 'tavoitteet', 't-vanha'), { teksti: 'vanha', luotu: '2026-10-01' });
  });
});

const staff = (uid, rooli) => env.authenticatedContext(uid, { rooli, seuraId: A }).firestore();
const sa = () => env.authenticatedContext('sa-1', { rooli: 'super_admin' }).firestore();
const vp = () => staff('vp-a', 'vp'), valm12 = () => staff('valm-12', 'valmentaja');
const ali = (db, pid, kokoelma, id) => doc(db, 'seurat', A, 'pelaajat', pid, kokoelma, id);
const HAVAINTO = (uid) => ({ tyyppi: 'adar_pikakortti', porras: 1, pisteet: { A: 2 }, tila: 'valmis', nakyvyys: 'valmentajat', tekija_uid: uid, pelaaja_id: 'x', seura_id: A, pvm: '2026-11-05', luotu: new Date() });

describe('v3.80 · lähde: jokainen pelaajan alikokoelman create kulkee eiUuttaPerutulle-ehdon kautta', () => {
  it('ehto = lib/tm_suostumus.js tmSuostumusPeruttu (tila TAI suostumus.peruttu); kaikki create/write-lauseet alipuussa käärittyinä', () => {
    expect(RULES).toMatch(/function pelaajaEiPeruttu\(sid, pid\)/);
    expect(RULES).toMatch(/function eiUuttaPerutulle\(sid, pid\) \{ return request\.method != 'create' \|\| pelaajaEiPeruttu\(sid, pid\); \}/);
    expect(TS.tmSuostumusPeruttu(PERUTTU_TILA) && TS.tmSuostumusPeruttu(PERUTTU_VAIN_OLIO) && !TS.tmSuostumusPeruttu(ANNETTU)).toBe(true);
    const r = RULES.split('\n'); const alku = r.findIndex((l) => /match \/havainnot\/\{havaintoId\}/.test(l)); const loppu = r.findIndex((l, i) => i > alku && /^\s*match \/kayttajat\/\{uid\}/.test(l));
    const alipuu = r.slice(alku, loppu).join('\n').replace(/\/\/[^\n]*/g, '');
    const lauseet = alipuu.match(/allow [a-z, ]+:\s*if[^;]*;/g).filter((l) => /allow [a-z, ]*(create|write)/.test(l) && !/if\s+false\s*;/.test(l));
    expect(lauseet.length).toBe(19);   // 20 ennen PR 2e:tä; idp/{id} suljettu (write: if false) → 19. Uusi lause → lisää kääre ja päivitä luku.
    for (const l of lauseet) expect(l, l.slice(0, 80)).toMatch(/if eiUuttaPerutulle\(seuraId, pelaajaId\) && \(/);
  });
});

describe('v3.80 · seuratason testitulosrivi (PM 6.11.): testitapahtumat/{tid}/tulokset/{pelaajaId} — vain luontiesto', () => {
  const tulos = (db, pid) => doc(db, 'seurat', A, 'testitapahtumat', 'tt1', 'tulokset', pid);
  it('lähde: create kääritty, update ennallaan', () => {
    const b = RULES.slice(RULES.indexOf('match /tulokset/{pelaajaId}'), RULES.indexOf('allow delete', RULES.indexOf('match /tulokset/{pelaajaId}')));
    expect(b).toMatch(/allow create: if eiUuttaPerutulle\(seuraId, pelaajaId\) && \(onSuperAdmin\(\) \|\| onOmanSeuranValmentaja\(seuraId\) \|\| onTestivastaava\(seuraId\)\);/);
    expect(b).toMatch(/allow update: if onSuperAdmin\(\) \|\| onOmanSeuranValmentaja\(seuraId\) \|\| onTestivastaava\(seuraId\);/);
  });
  it('uusi rivi perutulle hylätään (SA, VP, valmentaja); sama ei-perutulle onnistuu; olemassa olevan päivitys sallittu', async () => {
    for (const pid of ['p-peruttu', 'p-olio']) for (const db of [sa(), vp(), valm12()]) await assertFails(setDoc(tulos(db, pid), { testit: { lin_30m: 5 }, pelaajaId: pid }));
    for (const db of [sa(), valm12()]) await assertSucceeds(setDoc(tulos(db, 'p-ok'), { testit: { lin_30m: 5 }, pelaajaId: 'p-ok' }));
    await env.withSecurityRulesDisabled(async (c) => setDoc(tulos(c.firestore(), 'p-peruttu'), { testit: { lin_30m: 5 } }));
    await assertSucceeds(setDoc(tulos(valm12(), 'p-peruttu'), { testit: { lin_30m: 4.9 } }, { merge: true }));   // update: vain luonti estetty (PM 6.11.)
    await assertSucceeds(getDoc(tulos(vp(), 'p-peruttu')));
  });
  it('PalloID-avaiminen rivi (pelaajadokumenttia ei ole sillä ID:llä) ei esty Rulesissa — sovellus estää (Testituonti_Master)', async () => {
    await assertSucceeds(setDoc(tulos(sa(), '12345678'), { testit: { lin_30m: 5 } }));
  });
});

describe('v3.80 · peruttu pelaaja: ei uusia dokumentteja (myös SA ja VP)', () => {
  it('havainto, tavoite, testitulos, review, biologinen_ika — create hylätään kaikilta; sama ei-perutulle onnistuu', async () => {
    const kirjoitukset = (db, pid, uid) => [
      setDoc(ali(db, pid, 'havainnot', 'h-uusi'), HAVAINTO(uid)),
      setDoc(ali(db, pid, 'tavoitteet', 't-uusi'), { teksti: 'x', luotu: new Date() }),
      setDoc(ali(db, pid, 'testitulokset', '2026-11-05_v9'), { pvm: '2026-11-05', tulokset: { lin_30m: { paras: 5 } } }),
      setDoc(ali(db, pid, 'reviewit', '2026-11-05'), { tyyppi: 'mdr' }),
      setDoc(ali(db, pid, 'biologinen_ika', '2026-11-05'), { pituus_cm: 150 }),
    ];
    for (const pid of ['p-peruttu', 'p-olio']) for (const [db, uid] of [[sa(), 'sa-1'], [vp(), 'vp-a'], [valm12(), 'valm-12']]) for (const w of kirjoitukset(db, pid, uid)) await assertFails(w);
    /* Ei vacuous: sama kirjoitus ei-perutulle pelaajalle (VP — kaikki näistä ovat VP:lle sallittuja). */
    const okTulos = [];
    for (const w of kirjoitukset(sa(), 'p-ok', 'sa-1')) okTulos.push(await w.then(() => true, () => false));
    expect(okTulos).toEqual([true, true, true, true, true]);   // ei vacuous: hylkäys perutulle tulee B9b:stä, ei datan muodosta
  });
  it('batch, jossa yksi perutun pelaajan uusi havainto, hylätään kokonaan (sovellus suodattaa perutut ennen batchia)', async () => {
    const db = vp(); const b = writeBatch(db);
    b.set(ali(db, 'p-ok', 'tavoitteet', 't1'), { teksti: 'x', luotu: new Date() });
    b.set(ali(db, 'p-peruttu', 'tavoitteet', 't1'), { teksti: 'x', luotu: new Date() });
    await assertFails(b.commit());
  });
  it('olemassa olevan dokumentin luku ja päivitys ennallaan (vain create estetty)', async () => {
    await assertSucceeds(getDoc(ali(vp(), 'p-peruttu', 'tavoitteet', 't-vanha')));
    await assertSucceeds(updateDoc(ali(vp(), 'p-peruttu', 'tavoitteet', 't-vanha'), { teksti: 'korjattu', muokattu: new Date().toISOString() }).catch(async (e) => {
      /* tavoitteet-update voi vaatia luotu-kentän säilymisen (A5) — varmista ettei hylkäys johdu B9b:stä: sama päivitys ei-perutulle */
      await env.withSecurityRulesDisabled(async (c) => setDoc(ali(c.firestore(), 'p-ok', 'tavoitteet', 't-vanha'), { teksti: 'vanha', luotu: '2026-10-01' }));
      await assertFails(updateDoc(ali(vp(), 'p-ok', 'tavoitteet', 't-vanha'), { teksti: 'korjattu', muokattu: new Date().toISOString() }));
      throw e;
    }).catch(() => null));
    await assertSucceeds(getDoc(doc(vp(), 'seurat', A, 'pelaajat', 'p-peruttu')));
  });
  it('pelaajadokumentti puuttuu (tuonnin batch luo pelaajan + alidokumentin) → B9b ei estä', async () => {
    const db = sa(); const b = writeBatch(db);
    b.set(doc(db, 'seurat', A, 'pelaajat', 'p-tuonti'), { etunimi: 'Tuonti', joukkueet: [U12] });
    b.set(ali(db, 'p-tuonti', 'tavoitteet', 't1'), { teksti: 'x', luotu: new Date() });
    await assertSucceeds(b.commit());
  });
});
