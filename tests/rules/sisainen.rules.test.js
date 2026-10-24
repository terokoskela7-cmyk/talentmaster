/**
 * TalentMaster™ — Rules v3.66 (Vaihe 1 / PR 1a + 1d): seurat/{sid}/pelaajat/{pid}/sisainen/tiedot (henkilökunnan sisäiset kentät) + pelaajan d3_itsearvio.
 * Ajo: npm run test:rules (Java ≥ 21). Käyttää FIRESTORE_EMULATOR_HOST:ia jos asetettu (muuten 127.0.0.1:8080).
 */
import { initializeTestEnvironment, assertSucceeds, assertFails } from '@firebase/rules-unit-testing';
import { readFileSync } from 'fs';
import { resolve, dirname } from 'path';
import { fileURLToPath } from 'url';
import { setDoc, getDoc, doc, updateDoc, deleteDoc, deleteField, collectionGroup, query, where, getDocs, collection } from 'firebase/firestore';
import { describe, it, beforeAll, afterAll, beforeEach } from 'vitest';

const __dirname = dirname(fileURLToPath(import.meta.url));
const RULES = readFileSync(resolve(__dirname, '../../tm_admin/firestore.rules'), 'utf8');
const [HOST, PORT] = (process.env.FIRESTORE_EMULATOR_HOST || '127.0.0.1:8080').split(':');
const A = 'fcl', B = 'kpv', PID = 'p1', PID2 = 'p2', U12 = 'fcl_u12', U14 = 'fcl_u14';
let env;

beforeAll(async () => { env = await initializeTestEnvironment({ projectId: 'talentmaster-sisainen-rules', firestore: { rules: RULES, host: HOST, port: Number(PORT) } }); });
afterAll(async () => { if (env) await env.cleanup(); });

const SIS = { d3_viimeisin: { pisteet: { focus: { valmentaja: 4, avg: 4 } }, pvm: '2026-10-22' }, d3_taso: 4, seuraId: A };
beforeEach(async () => {
  await env.clearFirestore();
  await env.withSecurityRulesDisabled(async (c) => {
    const db = c.firestore();
    await setDoc(doc(db, 'admins', 'sa-1'), { rooli: 'super_admin' });
    await setDoc(doc(db, 'seurat', A), { nimi: 'FCL' }); await setDoc(doc(db, 'seurat', B), { nimi: 'KPV' });
    await setDoc(doc(db, 'seurat', A, 'kayttajat', 'valm-12'), { rooli: 'valmentaja', joukkueet: [U12] });
    await setDoc(doc(db, 'seurat', A, 'kayttajat', 'valm-14'), { rooli: 'valmentaja', joukkueet: [U14] });
    await setDoc(doc(db, 'seurat', A, 'pelaajat', PID), { etunimi: 'Testi', joukkueet: [U12], huoltajaEmail: 'huoltaja@test.fi' });
    await setDoc(doc(db, 'seurat', A, 'pelaajat', PID2), { etunimi: 'Toinen', joukkueet: [U12], huoltajaEmail: 'muu@test.fi' });
    await setDoc(doc(db, 'seurat', A, 'pelaajat', PID, 'sisainen', 'tiedot'), SIS);
    await setDoc(doc(db, 'seurat', A, 'pelaajat', PID2, 'sisainen', 'tiedot'), Object.assign({}, SIS, { d3_taso: 2 }));
    await setDoc(doc(db, 'seurat', B, 'pelaajat', 'pb', 'sisainen', 'tiedot'), { d3_taso: 3, seuraId: B });
    await setDoc(doc(db, 'seurat', B, 'pelaajat', 'pb'), { etunimi: 'Muu', joukkueet: ['kpv_u12'] });
  });
});

const staff = (uid, rooli, seuraId) => env.authenticatedContext(uid, { rooli, seuraId }).firestore();
const valm12 = () => staff('valm-12', 'valmentaja', A), valm14 = () => staff('valm-14', 'valmentaja', A), vp = () => staff('vp-a', 'vp', A), sihteeri = () => staff('sih-a', 'seurasihteeri', A);
const valmB = () => staff('valm-b', 'valmentaja', B), sa = () => env.authenticatedContext('sa-1', { rooli: 'super_admin' }).firestore();
const pelaaja = (pid) => env.authenticatedContext('pel_' + A + '_' + (pid || PID), { rooli: 'pelaaja', pelaajaSeuraId: A, pelaajaId: pid || PID, firebase: { sign_in_provider: 'custom' } }).firestore();
const huoltaja = () => env.authenticatedContext('huolt-1', { email: 'huoltaja@test.fi' }).firestore();
const sis = (db, pid) => doc(db, 'seurat', A, 'pelaajat', pid || PID, 'sisainen', 'tiedot');
const pel = (db, pid) => doc(db, 'seurat', A, 'pelaajat', pid || PID);
const IT = (pisteet, extra) => Object.assign({ d3_itsearvio: Object.assign({ pisteet: pisteet || { inner_drive: 4, focus: 2 }, pvm: '2026-10-22' }, extra || {}) });

describe('v3.66 · sisainen/tiedot — luku', () => {
  it('pelaaja EI lue (get)', async () => { await assertFails(getDoc(sis(pelaaja()))); });
  it('huoltaja EI lue (get)', async () => { await assertFails(getDoc(sis(huoltaja()))); });
  it('kirjautumaton ja satunnainen kirjautunut EIVÄT lue', async () => { await assertFails(getDoc(sis(env.unauthenticatedContext().firestore()))); await assertFails(getDoc(sis(env.authenticatedContext('x', {}).firestore()))); });
  it('valmentaja, VP ja seurasihteeri (oma seura) lukevat — kaikki oman seuran roolit kuten reviewit', async () => { for (const db of [valm12(), valm14(), vp(), sihteeri()]) await assertSucceeds(getDoc(sis(db))); });
  it('toisen seuran valmentaja EI lue', async () => { await assertFails(getDoc(sis(valmB()))); });
  it('SA lukee', async () => { await assertSucceeds(getDoc(sis(sa()))); });
});

describe('v3.66 · sisainen/tiedot — kirjoitus', () => {
  it('oman joukkueen valmentaja ja VP kirjoittavat (seuraId == sid)', async () => { await assertSucceeds(setDoc(sis(valm12()), Object.assign({}, SIS, { d3_taso: 5 }), { merge: true })); await assertSucceeds(setDoc(sis(vp(), PID2), SIS, { merge: true })); });
  it('toisen joukkueen valmentaja EI kirjoita (kuten pelaajadokumentin update); seurasihteeri EI kirjoita', async () => { await assertFails(setDoc(sis(valm14()), SIS, { merge: true })); await assertFails(setDoc(sis(sihteeri()), SIS, { merge: true })); });
  it('toisen seuran valmentaja EI kirjoita (ei update, ei create)', async () => { await assertFails(updateDoc(sis(valmB()), { d3_taso: 1 })); await assertFails(setDoc(doc(valmB(), 'seurat', A, 'pelaajat', PID, 'sisainen', 'tiedot'), SIS)); });
  it('PELAAJA EI kirjoita sisainen/*: ei create/update/delete, ei omaan eikä toiseen', async () => {
    await assertFails(setDoc(sis(pelaaja()), { d3_taso: 5, seuraId: A }, { merge: true })); await assertFails(updateDoc(sis(pelaaja()), { d3_taso: 5 })); await assertFails(deleteDoc(sis(pelaaja()))); await assertFails(setDoc(sis(pelaaja(), PID2), SIS));
    await assertFails(setDoc(doc(pelaaja(), 'seurat', A, 'pelaajat', PID, 'sisainen', 'uusi'), { seuraId: A }));
  });
  it('HUOLTAJA EI kirjoita sisainen/*', async () => { await assertFails(setDoc(sis(huoltaja()), { d3_taso: 5, seuraId: A }, { merge: true })); await assertFails(deleteDoc(sis(huoltaja()))); });
  it('seuraId pakollinen ja == polun sid (ei vieraan seuran collectionGroup-lukua väärennetyllä seuraId:llä); doc-id vain "tiedot"', async () => {
    await assertFails(setDoc(sis(valm12(), PID2), { d3_taso: 1 }, { merge: false }));   // seuraId puuttuu
    await assertFails(setDoc(sis(valm12()), { d3_taso: 1, seuraId: B }));
    await assertFails(setDoc(doc(valm12(), 'seurat', A, 'pelaajat', PID, 'sisainen', 'muu'), { d3_taso: 1, seuraId: A }));
  });
  it('delete vain SA', async () => { await assertFails(deleteDoc(sis(vp()))); await assertSucceeds(deleteDoc(sis(sa()))); });
  it('SA kirjoittaa (seuraId-ehto koskee myös SA:ta)', async () => { await assertSucceeds(setDoc(sis(sa()), SIS, { merge: true })); await assertFails(setDoc(sis(sa()), { d3_taso: 1 })); });
});

describe('v3.66 · collectionGroup("sisainen") — YKSI kysely koko seuralle', () => {
  const kysely = (db, sid) => getDocs(query(collectionGroup(db, 'sisainen'), where('seuraId', '==', sid)));
  it('oman seuran henkilökunta (valmentaja, VP, sihteeri) saa kyselyn; tulos vain oman seuran dokumentit', async () => {
    for (const db of [valm12(), vp(), sihteeri()]) { const s = await assertSucceeds(kysely(db, A)); if (s.size !== 2) throw new Error('odotettiin 2 dokumenttia, saatiin ' + s.size); }
  });
  it('toisen seuran valmentaja saa oman seuransa, mutta EI seuran A:n (where seuraId == A)', async () => { await assertSucceeds(kysely(valmB(), B)); await assertFails(kysely(valmB(), A)); });
  it('PELAAJA ja HUOLTAJA EIVÄT saa kyselyä (myös oman seuran tunnisteella)', async () => { await assertFails(kysely(pelaaja(), A)); await assertFails(kysely(huoltaja(), A)); await assertFails(kysely(env.authenticatedContext('x', {}).firestore(), A)); });
  it('rajaamaton kysely (ilman seuraId-ehtoa) hylätään henkilökunnalta; SA saa kaiken', async () => {
    await assertFails(getDocs(collectionGroup(valm12(), 'sisainen'))); await assertSucceeds(getDocs(collectionGroup(sa(), 'sisainen'))); await assertSucceeds(kysely(sa(), A));
  });
  it('collectionGroup-sääntö on vain luku: kirjoitus ei onnistu sen kautta (pelaaja ja vieras seura)', async () => { await assertFails(setDoc(sis(valmB()), SIS)); });
});

describe('v3.66 · pelaajan d3_itsearvio (B) ja siirtymäajan vanhat D3-avaimet', () => {
  it('pelaaja kirjoittaa d3_itsearvio omaan dokumenttiinsa (set merge ja update)', async () => {
    await assertSucceeds(setDoc(pel(pelaaja()), IT(), { merge: true })); await assertSucceeds(updateDoc(pel(pelaaja()), IT({ resilience: 5, coachability: 1 }, { jakso_alkoi: '2026-09-01T00:00:00.000Z' })));
    await assertSucceeds(updateDoc(pel(pelaaja()), IT({ focus: 3 }, { jakso_alkoi: null })));
  });
  it('pelaaja EI kirjoita toisen pelaajan dokumenttiin eikä huoltaja omaan lapseensa', async () => { await assertFails(setDoc(pel(pelaaja(), PID2), IT(), { merge: true })); await assertFails(setDoc(pel(huoltaja()), IT(), { merge: true })); });
  it('muoto validoidaan: vieras avain, arvo 0/6/6.5/teksti, vieras ulottuvuus, pvm puuttuu/väärä tyyppi, ylimääräinen kenttä', async () => {
    const d = pelaaja();
    await assertFails(updateDoc(pel(d), IT({ inner_drive: 6 }))); await assertFails(updateDoc(pel(d), IT({ inner_drive: 0 }))); await assertFails(updateDoc(pel(d), IT({ inner_drive: 4.5 }))); await assertFails(updateDoc(pel(d), IT({ inner_drive: '4' })));
    await assertFails(updateDoc(pel(d), IT({ valmentaja_arvio: 5 }))); await assertFails(updateDoc(pel(d), IT({ focus: 3 }, { valmentaja: 5 })));
    await assertFails(updateDoc(pel(d), { d3_itsearvio: { pisteet: { focus: 3 } } })); await assertFails(updateDoc(pel(d), { d3_itsearvio: { pisteet: { focus: 3 }, pvm: 20261022 } })); await assertFails(updateDoc(pel(d), { d3_itsearvio: 'x' }));
  });
  it('pelaaja EI saa kirjoittaa d3_itsearvio:n kanssa mitään muuta (A-kenttä tai muu): hasOnly', async () => {
    const d = pelaaja();
    for (const lisa of [{ review_viimeisin_pvm: '2026-10-22' }, { scout_potentiaali: 5 }, { vastuuhenkilo: { uid: 'x', rooli: 'valmentaja', asetettu_pvm: '2026-10-22' } }, { signaali: 'xfactor' }, { jaksofokus: { konsepti_avain: 'x' } }, { arviointi_kooste: {} }, { etunimi: 'Hakkeri' }, { huoltajaEmail: 'x@y.fi' }])
      await assertFails(updateDoc(pel(d), Object.assign(IT(), lisa)));
    for (const yksin of [{ review_viimeisin_pvm: '2026-10-22' }, { scout_potentiaali: 5 }, { signaali: 'xfactor' }, { 'jaksofokus.osa_havainnot': {} }, { adar_arvioijat: [] }, { tuoja: 'a@b.fi' }]) await assertFails(updateDoc(pel(d), yksin));
  });
  it('v3.67 (PR 2a): pelaaja EI kirjoita vanhoja D3-kenttiä (d3_viimeisin / d3_taso / d3_pvm / d3_varmuus / d3_vp_pvm) — yksittäin eikä yhdessä, ei set merge eikä update', async () => {
    for (const k of [{ d3_viimeisin: { pisteet: { focus: { pelaaja: 4 } } } }, { d3_taso: 4 }, { d3_pvm: '2026-10-22' }, { d3_varmuus: 'itsearvio' }, { d3_vp_pvm: '2026-10-22' }]) {
      await assertFails(updateDoc(pel(pelaaja()), k)); await assertFails(setDoc(pel(pelaaja()), k, { merge: true }));
    }
    await assertFails(updateDoc(pel(pelaaja()), { d3_viimeisin: { pisteet: { focus: { pelaaja: 4 } } }, d3_taso: 4, d3_pvm: '2026-10-22', d3_varmuus: 'itsearvio' }));
    await assertFails(updateDoc(pel(pelaaja()), Object.assign(IT(), { d3_taso: 5 })));   // d3_itsearvio:n kanssa ei mitään vanhaa
    await assertSucceeds(updateDoc(pel(pelaaja()), IT()));   // ainoa sallittu D3-kirjoitus
  });
  it('v3.67: huoltaja EI kirjoita mitään D3:a (vanhat kentät eikä d3_itsearvio) lapsen dokumenttiin', async () => {
    for (const k of [{ d3_viimeisin: { pisteet: {} } }, { d3_taso: 4 }, { d3_varmuus: 'itsearvio' }, IT()]) await assertFails(updateDoc(pel(huoltaja()), k));
  });
  it('v3.67: valmentaja ja VP kirjoittavat D3:n sisainen/tiedot:iin; toisen seuran valmentaja/VP ei; pelaaja ei; henkilökunnan pelaajadokumentti-kirjoitus ei muutu (stale-asiakkaat)', async () => {
    const d3 = { d3_viimeisin: { pisteet: { focus: { valmentaja: 3, avg: 3 } }, pvm: '2026-10-23', lahteet: ['valmentaja'] }, d3_taso: 3, d3_pvm: '2026-10-23', d3_varmuus: 'valmentaja', seuraId: A };
    await assertSucceeds(setDoc(sis(valm12()), d3, { merge: true })); await assertSucceeds(setDoc(sis(vp()), Object.assign({}, d3, { d3_vp_pvm: '2026-10-23' }), { merge: true }));
    await assertFails(setDoc(sis(valmB()), d3, { merge: true })); await assertFails(setDoc(sis(staff('vp-b', 'vp', B)), d3, { merge: true })); await assertFails(setDoc(sis(pelaaja()), d3, { merge: true }));
    await assertSucceeds(setDoc(pel(valm12()), { d3_viimeisin: { pisteet: {} }, d3_taso: 3 }, { merge: true }));   // ei kiristetä (henkilökunnan vanha polku); siivous poistaa datan, koodi ei enää kirjoita sinne
  });
  it('pelaaja lukee oman d3_itsearvio:nsa pelaajadokumentista, mutta ei sisainen/tiedot-dokumenttia', async () => {
    await env.withSecurityRulesDisabled(async (c) => { await setDoc(pel(c.firestore()), IT(), { merge: true }); });
    const s = await assertSucceeds(getDoc(pel(pelaaja()))); if (!s.data().d3_itsearvio) throw new Error('d3_itsearvio puuttuu'); await assertFails(getDoc(sis(pelaaja())));
  });
});

describe('v3.66 · regressio: reviewit ja muu pelaajadokumentti ennallaan', () => {
  it('reviewit edelleen staff-only; huoltaja lukee lapsen pelaajadokumentin mutta ei sisainen:ä', async () => {
    await env.withSecurityRulesDisabled(async (c) => { await setDoc(doc(c.firestore(), 'seurat', A, 'pelaajat', PID, 'reviewit', '2026-10-01'), { tyyppi: 'mdr' }); });
    await assertFails(getDoc(doc(pelaaja(), 'seurat', A, 'pelaajat', PID, 'reviewit', '2026-10-01'))); await assertFails(getDocs(collection(huoltaja(), 'seurat', A, 'pelaajat', PID, 'reviewit')));
    await assertSucceeds(getDoc(pel(huoltaja()))); await assertFails(getDoc(sis(huoltaja())));
  });
});

/* v3.68 (Vaihe 1 · PR 1b-1, S1): jaksofokuksen sisäiset osat sisainen/tiedot:ssa + fysioterapeutin rajattu kirjoitus */
const fysio = (seura) => staff('fys-1', 'fysioterapeutti', seura || A);
const JF = { jaksofokus_sisainen: { osa_havainnot: { y_h1: { a: { 'u-1': { arvo: 2, pvm: '2026-10-09', rooli: 'valmentaja' } } } }, tavoite_tarkenteet: ['x'] }, historia_sisainen: { '2026-10-01T08:00:00,000Z_y_h1': { arvio_itse: 2, arvio_valmentaja: 3, arvioija_rooli: 'valmentaja' } } };
describe('v3.68 · jaksofokus_sisainen / historia_sisainen — kirjoittajat ja lukijat', () => {
  it('valmentaja (oma joukkue) ja VP kirjoittavat jaksofokus_sisainen + historia_sisainen (merge, seuraId == sid)', async () => {
    await assertSucceeds(setDoc(sis(valm12()), Object.assign({ seuraId: A }, JF), { merge: true })); await assertSucceeds(setDoc(sis(vp()), Object.assign({ seuraId: A }, JF), { merge: true }));
    await assertSucceeds(updateDoc(sis(valm12()), { 'jaksofokus_sisainen.oma_jakso': { x: 1 } }));
  });
  it('FYSIOTERAPEUTTI kirjoittaa vain jaksofokus_sisainen / historia_sisainen (+ seuraId, paivitetty): create uuteen dokumenttiin ja update/merge olemassa olevaan', async () => {
    await assertSucceeds(setDoc(sis(fysio(), 'p-uusi'), Object.assign({ seuraId: A, paivitetty: '2026-10-23T10:00:00.000Z' }, JF)));   // create
    await assertSucceeds(setDoc(sis(fysio()), Object.assign({ seuraId: A, paivitetty: 'x' }, JF), { merge: true })); await assertSucceeds(updateDoc(sis(fysio()), { 'historia_sisainen.2026-10-01_x': { arvio_itse: 1 } }));
  });
  it('fysioterapeutti EI kirjoita D3:a eikä muita A-kenttiä sisainen:iin (create hasOnly, update affectedKeys)', async () => {
    for (const k of [{ d3_taso: 5 }, { d3_viimeisin: { pisteet: {} } }, { signaali: 'xfactor' }, { review_viimeisin_pvm: '2026-10-23' }, { vastuuhenkilo: { uid: 'x' } }, { scout_potentiaali: 5 }, { tukitarve: { alue: 'x' } }]) {
      await assertFails(setDoc(sis(fysio()), Object.assign({ seuraId: A }, k), { merge: true })); await assertFails(updateDoc(sis(fysio()), k)); await assertFails(setDoc(sis(fysio(), 'p-uusi2'), Object.assign({ seuraId: A }, JF, k)));
    }
    await assertFails(setDoc(sis(fysio()), Object.assign({ seuraId: A }, JF, { d3_taso: 1 }), { merge: true }));   // sallitun kanssa ei mitään muuta
  });
  it('fysioterapeutti: seuraId == sid pakollinen; toisen seuran fysioterapeutti ei kirjoita; fysioterapeutti lukee (oma seura) mutta ei poista', async () => {
    await assertFails(setDoc(sis(fysio()), Object.assign({ seuraId: B }, JF), { merge: true })); await assertFails(setDoc(sis(fysio(), 'p-uusi3'), JF));   // seuraId puuttuu
    await assertFails(setDoc(sis(fysio(B)), Object.assign({ seuraId: A }, JF), { merge: true })); await assertFails(setDoc(sis(fysio(B)), Object.assign({ seuraId: B }, JF), { merge: true }));
    await assertSucceeds(getDoc(sis(fysio()))); await assertFails(getDoc(sis(fysio(B)))); await assertFails(deleteDoc(sis(fysio())));
  });
  it('muut roolit eivät saa kirjoitusoikeutta jaksofokus-osiin: seurasihteeri (ei valmennusrooli), pelaaja, huoltaja, toisen seuran valmentaja ja VP; pelaaja/huoltaja eivät lue', async () => {
    await assertFails(setDoc(sis(pelaaja()), Object.assign({ seuraId: A }, JF), { merge: true })); await assertFails(setDoc(sis(huoltaja()), Object.assign({ seuraId: A }, JF), { merge: true }));
    await assertFails(setDoc(sis(valmB()), Object.assign({ seuraId: A }, JF), { merge: true })); await assertFails(setDoc(sis(staff('vp-b', 'vp', B)), Object.assign({ seuraId: A }, JF), { merge: true }));
    await assertFails(setDoc(sis(valm14()), Object.assign({ seuraId: A }, JF), { merge: true }));   // toisen joukkueen valmentaja (U14) ei kirjoita U12-pelaajan sisainen:iin
    await assertFails(getDoc(sis(pelaaja()))); await assertFails(getDoc(sis(huoltaja())));
  });
  it('pelaajadokumentti: pelaaja ei voi kirjoittaa jaksofokus-A-kenttiä (hasOnly-lista) eikä lukea niitä sisainen:stä; fysioterapeutin vanha pelaajadokumentti-kirjoitus (jaksofokus + historia) ennallaan', async () => {
    await assertFails(updateDoc(pel(pelaaja()), { 'jaksofokus.osa_havainnot': {} })); await assertFails(updateDoc(pel(pelaaja()), { jaksofokus: { osa_havainnot: {} } }));
    await assertSucceeds(updateDoc(pel(fysio()), { jaksofokus: { konsepti_avain: 'x' }, jaksofokus_historia: [] }));
  });
});

/* v3.68 · PR 1b-3: jakson elinkaaren kirjoitusmuodot (tmJaksofokusElinkaariKirjoita): set + mergeFields, jaksofokus_sisainen korvataan / poistetaan (deleteField), historia_sisainen.<avain> lisätään. Rules ennallaan (ei uutta versiota). */
describe('v3.68 · PR 1b-3 elinkaarikirjoitus: set mergeFields + deleteField', () => {
  const kirj = (db, pid, lisa) => setDoc(sis(db, pid), Object.assign({ seuraId: A, paivitetty: '2026-11-16T09:00:00.000Z' }, lisa), { mergeFields: ['seuraId', 'paivitetty', 'jaksofokus_sisainen', 'historia_sisainen.2026-10-05T08:00:00,000Z_y_h2'] });
  const kentat = () => ({ jaksofokus_sisainen: { jakso_avain: 'x', linkitetyt: ['a'], valitavoite_idx: 0, poikkeama: true }, historia_sisainen: { '2026-10-05T08:00:00,000Z_y_h2': { arvio_vp: 3, kalibraatio_ero: 1 } } });
  it('valmentaja (oma joukkue), VP ja fysioterapeutti: korvaus olemassa olevaan dokumenttiin ja uuden dokumentin luonti; deleteField-versio (sulku ilman uutta jaksoa) onnistuu', async () => {
    const fysioDb = fysio(); for (const db of [valm12(), vp(), fysioDb]) { await assertSucceeds(kirj(db, PID, kentat())); if (db === fysioDb) await assertSucceeds(kirj(db, 'p-uusi', kentat())); await assertSucceeds(kirj(db, PID, { jaksofokus_sisainen: deleteField(), historia_sisainen: kentat().historia_sisainen })); }
    await assertSucceeds(setDoc(sis(fysio(), 'p-vain-delete'), { seuraId: A, paivitetty: 'x', jaksofokus_sisainen: deleteField() }, { mergeFields: ['seuraId', 'paivitetty', 'jaksofokus_sisainen'] }));   // delete-only uuteen dokumenttiin
  });
  it('pelaaja, huoltaja, seurasihteeri ja toisen seuran valmentaja EIVÄT kirjoita tätä muotoa; fysioterapeutti ei saa lisätä muuta A-kenttää samaan mergeFields-kirjoitukseen', async () => {
    for (const db of [pelaaja(), huoltaja(), sihteeri(), valmB()]) await assertFails(kirj(db, PID, kentat()));
    await assertFails(setDoc(sis(fysio()), { seuraId: A, paivitetty: 'x', d3_taso: 5, jaksofokus_sisainen: deleteField() }, { mergeFields: ['seuraId', 'paivitetty', 'd3_taso', 'jaksofokus_sisainen'] }));
  });
});

/* v3.69 · PR 1c-1 (S2): henkilokunta-ryhmän kentät sisainen/tiedot:ssa — scout_potentiaali* vain johto/SA, vastuuhenkilo kuten pelaajadokumentissa, testivastaava/pelaaja/huoltaja/toisen seuran käyttäjä ei */
describe('v3.69 · henkilokunta-kentät sisainen/tiedot:ssa', () => {
  const utj = () => staff('utj-a', 'urheilutoimenjohtaja', A), tv = () => staff('tv-a', 'testivastaava', A), talentti = () => staff('tal-a', 'talenttivalmentaja', A);
  const VH = { uid: 'valm-12', rooli: 'valmentaja', asetettu_pvm: '2026-10-24' };
  const HK = { tukitarve: { alue: 'kestävyys', merkitty_pvm: '2026-10-24' }, talentti_ehdotus: { lahde: 'vp', pvm: '2026-10-24' }, review_viimeisin_pvm: '2026-10-24', review_viimeisin_tyyppi: 'jakso', review_tagit: ['a'], idp_edistyma: 40, idp_lahde: 'vp', idp_viim_review: '2026-10-24', idp_dvi: { x: 1 } };
  const SC = { scout_potentiaali: 4, scout_potentiaali_taso: 'korkea', scout_potentiaali_huomiot: 'h', scout_potentiaali_pvm: '2026-10-24', scout_potentiaali_arvioija: 'vp-a' };
  const kirj = (db, lisa, pid) => setDoc(sis(db, pid), Object.assign({ seuraId: A, paivitetty: 'T' }, lisa), { merge: true });
  it('valmentaja (oma joukkue), talenttivalmentaja, johto ja SA kirjoittavat tukitarve / talentti_ehdotus / review_* / idp_* (kuten pelaajadokumenttiin)', async () => {
    for (const db of [valm12(), talentti(), vp(), utj(), sa()]) await assertSucceeds(kirj(db, HK));
    await assertFails(kirj(valm14(), HK));   // toisen joukkueen valmentaja ei (kuten pelaajadokumentti)
  });
  it('scout_potentiaali*: vain SA ja johto (vp, urheilutoimenjohtaja); valmentaja, talenttivalmentaja, fysioterapeutti, testivastaava, seurasihteeri EIVÄT — create ja update', async () => {
    for (const db of [vp(), utj(), sa()]) { await assertSucceeds(kirj(db, SC)); await assertSucceeds(updateDoc(sis(db), { scout_potentiaali: 5, seuraId: A })); }
    for (const db of [valm12(), talentti(), fysio(), tv(), sihteeri()]) { await assertFails(kirj(db, SC)); await assertFails(updateDoc(sis(db), { scout_potentiaali_taso: 'x', seuraId: A })); }
    await assertFails(setDoc(sis(valm12(), 'p-uusi'), Object.assign({ seuraId: A }, SC)));
  });
  it('vastuuhenkilo: asettajat (vp, utj, talenttivalmentaja, oman joukkueen valmentaja, SA) + muoto {uid, rooli, asetettu_pvm}, uid = seuran käyttäjä; poisto sallittu asettajille; muut eivät', async () => {
    for (const db of [valm12(), vp(), utj(), talentti(), sa()]) await assertSucceeds(kirj(db, { vastuuhenkilo: VH }));
    await assertSucceeds(updateDoc(sis(valm12()), { vastuuhenkilo: deleteField(), seuraId: A }));
    await assertFails(kirj(valm14(), { vastuuhenkilo: VH })); for (const db of [fysio(), tv(), sihteeri()]) await assertFails(kirj(db, { vastuuhenkilo: VH }));
    await assertFails(kirj(vp(), { vastuuhenkilo: { uid: 'ei-kayttaja', rooli: 'valmentaja', asetettu_pvm: '2026-10-24' } })); await assertFails(kirj(vp(), { vastuuhenkilo: { uid: 'valm-12', rooli: 'valmentaja' } }));
    await assertFails(kirj(vp(), { vastuuhenkilo: { uid: 'valm-12', rooli: 'pelaaja', asetettu_pvm: '2026-10-24' } })); await assertFails(kirj(vp(), { vastuuhenkilo: Object.assign({ ylimaarainen: 1 }, VH) }));
  });
  it('testivastaava EI kirjoita mitään sisainen-kenttää (ei myöskään henkilökunta-ryhmää) mutta lukee; fysioterapeutti vain jaksofokus-osat', async () => {
    await assertFails(kirj(tv(), HK)); await assertFails(kirj(tv(), { jaksofokus_sisainen: { linkitetyt: ['a'] } })); await assertSucceeds(getDoc(sis(tv())));
    await assertFails(kirj(fysio(), HK)); await assertSucceeds(kirj(fysio(), { jaksofokus_sisainen: { linkitetyt: ['a'] } }));
  });
  it('pelaaja, huoltaja ja toisen seuran käyttäjät (valmentaja, VP) eivät lue eivätkä kirjoita henkilökunta-kenttiä', async () => {
    await assertSucceeds(kirj(sa(), Object.assign({}, HK, SC, { vastuuhenkilo: VH })));
    for (const db of [pelaaja(), huoltaja(), valmB(), staff('vp-b', 'vp', B)]) { await assertFails(getDoc(sis(db))); await assertFails(kirj(db, HK)); await assertFails(kirj(db, SC)); await assertFails(kirj(db, { vastuuhenkilo: VH })); }
  });
});

/* v3.70 · PR 1e-1 (S4): sisainen/tiedot — S4-ryhmät (valmentaja/johto/SA kuten ennen), testivastaava vain kasvumittauksen kypsyys-avaimet, johto vain tuojaUid; pelaaja ja huoltaja eivät lue eivätkä kirjoita mitään uutta */
describe('v3.70 · S4-ryhmät + tuojaUid sisainen/tiedot:ssa', () => {
  const tv = () => staff('tv-a', 'testivastaava', A), utj = () => staff('utj-a', 'urheilutoimenjohtaja', A), talentti = () => staff('tal-a', 'talenttivalmentaja', A);
  const kirj = (db, lisa, pid) => setDoc(sis(db, pid), Object.assign({ seuraId: A, paivitetty: 'T' }, lisa), { merge: true });
  const KYP_TV = { kasvutahti_cm_v: 6, kasvutahti_vyohyke: 'nopea', maturity_offset: -0.4, kehitysvaihe_kaista: 'circa', kronologinen_ika: 13.2, phv_raaka: 'LAH', phv_huom: 'x', phv_ongelma: null };
  const S4 = { adar_arvioijia: 2, adar_luotettavuus: 'hyva', havainto_viimeisin_pvm: '2026-10-24', havainto_porras_hist: [3, 2], arviointi_kooste: { a: 1 }, arviointi_kooste_pvm: '2026-10-24', talenttiTaso: 'perus', loukkaantuminen_tyyppi: 'nilkka', paluu_arvio: '2026-11-01', signaali: 'xfactor', isa_pituus_cm: 180, aiti_pituus_cm: 168, vanhempi_pituus_pvm: '2026-10-24' };
  it('oman joukkueen valmentaja, talenttivalmentaja-johto (vp, utj) ja SA kirjoittavat S4-ryhmien kentät kuten muutkin sisainen-kentät; toisen joukkueen valmentaja ei', async () => {
    for (const db of [valm12(), vp(), utj(), sa()]) await assertSucceeds(kirj(db, Object.assign({}, S4, KYP_TV)));
    await assertFails(kirj(valm14(), S4)); await assertFails(kirj(valmB(), S4)); await assertFails(kirj(sihteeri(), S4));
  });
  it('TESTIVASTAAVA: kirjoittaa vain kasvumittauksen kypsyys-avaimet (create + update); mikään muu S4-kenttä, d3, henkilokunta tai jaksofokus ei; lukee silti', async () => {
    await assertSucceeds(kirj(tv(), KYP_TV, 'p-uusi')); await assertSucceeds(kirj(tv(), KYP_TV)); await assertSucceeds(updateDoc(sis(tv()), { kasvutahti_cm_v: 7, seuraId: A })); await assertSucceeds(getDoc(sis(tv())));
    for (const lisa of [{ talenttiTaso: 'perus' }, { loukkaantuminen_tyyppi: 'x' }, { adar_arvioijia: 1 }, { arviointi_kooste: {} }, { signaali: 'xfactor' }, { isa_pituus_cm: 180 }, { phv_ilmoitettu_ph: true }, { d3_taso: 5 }, { tukitarve: { alue: 'a', merkitty_pvm: '2026-10-24' } }, { jaksofokus_sisainen: { linkitetyt: ['a'] } }]) {
      await assertFails(kirj(tv(), lisa)); await assertFails(kirj(tv(), Object.assign({}, KYP_TV, lisa)));
    }
    await assertFails(deleteDoc(sis(tv()))); await assertFails(setDoc(sis(tv()), Object.assign({ seuraId: B }, KYP_TV)));   // seuraId pakotettu == sid
  });
  it('toisen seuran testivastaava ei kirjoita eikä lue', async () => { const tvB = staff('tv-b', 'testivastaava', B); await assertFails(kirj(tvB, KYP_TV)); await assertFails(getDoc(sis(tvB))); });
  it('JOHTO (vp, utj, seurasihteeri): tuojaUid + seuraId/paivitetty onnistuu; seurasihteeri: tuojaUid + mikä tahansa muu avain ei; fysio/testivastaava/toisen seuran johto tuojaUid:ia ei', async () => {
    let n = 0; for (const db of [vp(), utj(), sihteeri()]) { n++; await assertSucceeds(kirj(db, { tuojaUid: 'uid-x' + n }, 'p-uusi2')); await assertSucceeds(kirj(db, { tuojaUid: 'uid-y' + n })); await assertSucceeds(updateDoc(sis(db), { tuojaUid: 'uid-z' + n, seuraId: A })); }   // arvo muuttuu joka kerta: no-op-merge ei oikeuta (hasAny)
    await assertFails(kirj(sihteeri(), { tuojaUid: 'uid-q', talenttiTaso: 'perus' })); await assertFails(kirj(sihteeri(), { tuojaUid: 'uid-q2', d3_taso: 1 }));   // vp/utj kirjoittavat kaiken jo ennestään (onOmanJoukkueenValmentaja) → rajaus koskee vain seurasihteeriä
    await assertFails(kirj(sihteeri(), { talenttiTaso: 'perus' })); await assertFails(kirj(fysio(), { tuojaUid: 'uid-x' })); await assertFails(kirj(tv(), { tuojaUid: 'uid-x' }));
    await assertFails(kirj(staff('sih-b', 'seurasihteeri', B), { tuojaUid: 'uid-x' }));   // toisen seuran johto
  });
  it('pelaaja, huoltaja, toisen seuran käyttäjät: eivät lue eivätkä kirjoita S4-kenttiä, kypsyys-avaimia eivätkä tuojaUid:ia; tallennettu S4-data ei vuoda collectionGroup-kyselyssä', async () => {
    await assertSucceeds(kirj(sa(), Object.assign({}, S4, KYP_TV, { tuojaUid: 'uid-x' })));
    for (const db of [pelaaja(), huoltaja(), valmB(), staff('vp-b', 'vp', B)]) { await assertFails(getDoc(sis(db))); await assertFails(kirj(db, S4)); await assertFails(kirj(db, KYP_TV)); await assertFails(kirj(db, { tuojaUid: 'x' })); }
    await assertFails(getDocs(query(collectionGroup(pelaaja(), 'sisainen'), where('seuraId', '==', A)))); await assertFails(getDocs(query(collectionGroup(huoltaja(), 'sisainen'), where('seuraId', '==', A))));
  });
});
