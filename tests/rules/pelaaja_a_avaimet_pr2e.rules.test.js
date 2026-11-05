/**
 * TalentMaster™ — Rules v3.79 (Vaihe 1 · PR 2e):
 *   1) pelaajadokumentin create/update hylkää A-avaimet (lib/tm_sisainen.js tmSisainenAKentat ilman terveyttä) kaikilta, myös SA:lta; poisto sallitaan;
 *   2) jaettujen kenttien A-osat hylätään: jaksofokus.<A>, talenttisignaali (xfactor/hidden…), havainto_porras_ehdotus.hist, biologinenIka_viimeisin muu kuin B-muoto;
 *      B-muodot (jaksofokus ilman A-osia, signaali 'underdog', porrasehdotus ilman hist:iä, bioika B-avaimin) menevät läpi;
 *   3) koskemattomat vanhat A-avaimet (siivoamaton dokumentti) eivät estä muuta päivitystä;
 *   4) idp/{id} suljettu kokonaan (myös SA ja huoltaja).
 * Lista luetaan libistä (ei käsin ylläpidettävää listaa): uusi A-kenttä libissä ilman Rules-päivitystä kaataa testin 1.
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
const TERVEYS = S.tmTerveysKentat();
const AKENTAT = S.tmSisainenAKentat().filter((k) => !TERVEYS.includes(k));
let env;

beforeAll(async () => { env = await initializeTestEnvironment({ projectId: 'talentmaster-a-avaimet-pr2e', firestore: { rules: RULES, host: HOST, port: Number(PORT) } }); });
afterAll(async () => { if (env) await env.cleanup(); });

beforeEach(async () => {
  await env.clearFirestore();
  await env.withSecurityRulesDisabled(async (c) => {
    const db = c.firestore();
    await setDoc(doc(db, 'admins', 'sa-1'), { rooli: 'super_admin' });
    await setDoc(doc(db, 'seurat', A), { nimi: 'FCL' });
    await setDoc(doc(db, 'seurat', A, 'kayttajat', 'valm-12'), { rooli: 'valmentaja', joukkueet: [U12] });
    await setDoc(doc(db, 'seurat', A, 'pelaajat', PID), { etunimi: 'Testi', joukkueet: [U12], huoltajaEmail: 'huoltaja@x.fi' });
    await setDoc(doc(db, 'seurat', A, 'pelaajat', 'p-vanha'), { etunimi: 'Vanha', joukkueet: [U12], d3_taso: 3, adar_arvioijat: 2, jaksofokus: { osa_havainnot: { a: 1 }, osa_arviot: {} } });   // siivoamaton (tuotannossa 0)
    await setDoc(doc(db, 'seurat', A, 'pelaajat', PID, 'idp', 'k2026'), { tavoite: 'x' });
  });
});

const staff = (uid, rooli) => env.authenticatedContext(uid, { rooli, seuraId: A }).firestore();
const sa = () => env.authenticatedContext('sa-1', { rooli: 'super_admin' }).firestore();
const vp = () => staff('vp-a', 'vp'), valm12 = () => staff('valm-12', 'valmentaja'), talentti = () => staff('tal-a', 'talenttivalmentaja');
const huoltaja = () => env.authenticatedContext('huolt-1', { email: 'huoltaja@x.fi', email_verified: true }).firestore();
const pel = (db, pid) => doc(db, 'seurat', A, 'pelaajat', pid || PID);
const KIRJOITTAJAT = () => [sa(), vp(), valm12(), talentti()];

describe('v3.79 · lista libistä: Rules-lista = tmSisainenAKentat ilman terveyttä', () => {
  it('EI VACUOUS + synkassa: pelaajaAAvaimet() sisältää täsmälleen libin A-kentät (terveys omassa listassaan)', () => {
    const m = RULES.match(/function pelaajaAAvaimet\(\) \{ return \[([^\]]*)\]; \}/);
    expect(m).toBeTruthy();
    const rules = m[1].split(',').map((x) => x.trim().replace(/^'|'$/g, ''));
    expect(AKENTAT.length).toBeGreaterThan(40);
    expect([...rules].sort()).toEqual([...AKENTAT].sort());
  });
});

describe('v3.79 · pelaajadokumentti: A-avaimet hylätään kaikilta (myös SA), poisto sallitaan', () => {
  it('create: pelaajaa ei voi luoda A-avaimella (jokainen avain, SA ja VP); ilman niitä luonti toimii', async () => {
    let n = 0;
    for (const k of AKENTAT) for (const db of [sa(), vp()]) { n++; await assertFails(setDoc(pel(db, 'luo' + n), { etunimi: 'X', joukkueet: [U12], [k]: 'x' })); }
    for (const db of [sa(), vp(), valm12()]) { n++; await assertSucceeds(setDoc(pel(db, 'luo' + n), { etunimi: 'X', joukkueet: [U12] })); }
  }, 60000);   // 57 avainta × 2 roolia peräkkäin
  it('update: A-avaimen LISÄYS hylätään kaikilta kirjoittajilta (update ja set merge); sallittu kenttä yksin menee läpi', async () => {
    for (const k of AKENTAT) await assertFails(updateDoc(pel(sa()), { [k]: 'x' }));
    for (const k of ['d3_taso', 'vastuuhenkilo', 'adar_arvioijat', 'havainto_viimeisin_pvm', 'review_tagit', 'scout_potentiaali', 'talenttiTaso', 'maturity_offset']) for (const db of KIRJOITTAJAT()) {
      await assertFails(updateDoc(pel(db), { [k]: 'x' }));
      await assertFails(setDoc(pel(db), { [k]: 'x', etunimi: 'Testi2' }, { merge: true }));
    }
    for (const db of KIRJOITTAJAT()) await assertSucceeds(updateDoc(pel(db), { etunimi: 'Testi3' }));
  }, 60000);
  it('update: olemassa olevan A-avaimen MUUTOS hylätään; POISTO sallitaan; koskematon vanha A-avain ei estä muuta päivitystä', async () => {
    for (const db of [sa(), vp(), valm12()]) await assertFails(updateDoc(pel(db, 'p-vanha'), { d3_taso: 4 }));
    await assertSucceeds(updateDoc(pel(valm12(), 'p-vanha'), { etunimi: 'Vanha2' }));   // d3_taso + adar_arvioijat koskemattomina
    await assertSucceeds(updateDoc(pel(vp(), 'p-vanha'), { d3_taso: deleteField(), adar_arvioijat: deleteField() }));
  });
});

describe('v3.79 · jaettujen kenttien A-osat', () => {
  it('jaksofokus: A-osa (osa_havainnot, onnistumiskriteeri, dot-polku) hylätään; B-osat (osa_arviot, alue) menevät läpi; koskematon vanha A-osa ei estä muuta päivitystä, mutta jaksofokuksen muutos vaatii sen poiston', async () => {
    for (const db of KIRJOITTAJAT()) {
      await assertFails(updateDoc(pel(db), { jaksofokus: { alue: 'nopeus', osa_havainnot: { a: 1 } } }));
      await assertFails(updateDoc(pel(db), { 'jaksofokus.onnistumiskriteeri': 'x' }));
      await assertFails(updateDoc(pel(db), { 'jaksofokus.osa_havainnot.y.k.u': { arvo: 2 } }));
    }
    await assertSucceeds(updateDoc(pel(valm12()), { jaksofokus: { alue: 'nopeus', osa_arviot: { y: 2 } } }));
    await assertSucceeds(updateDoc(pel(vp()), { 'jaksofokus.osa_arviot.y': 3 }));
    await assertSucceeds(updateDoc(pel(vp(), 'p-vanha'), { etunimi: 'V' }));   // jaksofokus ei kosketa
    await assertFails(updateDoc(pel(vp(), 'p-vanha'), { 'jaksofokus.osa_arviot.y': 3 }));   // jaksofokus muuttuu ja sisältää yhä A-osan → siivoa ensin (siivous ajettu: 0 kpl)
    await assertSucceeds(updateDoc(pel(vp(), 'p-vanha'), { 'jaksofokus.osa_havainnot': deleteField() }));
  });
  it('signaali: sisäiset talenttisignaalit (xfactor, x-factor, hidden-gem, hidden; kirjainkoko/välit) hylätään; muu arvo ja null menevät läpi', async () => {
    for (const v of S.SIGNAALI_SISAINEN.concat(['XFactor', ' hidden '])) await assertFails(updateDoc(pel(vp()), { signaali: v }));
    await assertSucceeds(updateDoc(pel(vp()), { signaali: 'underdog' }));
    await assertSucceeds(updateDoc(pel(vp()), { signaali: null }));
    await assertFails(setDoc(pel(sa(), 'luo-s'), { etunimi: 'X', joukkueet: [U12], signaali: 'xfactor' }));
  });
  it('havainto_porras_ehdotus: hist-alikenttä hylätään; ehdotus ilman hist:iä menee läpi', async () => {
    await assertFails(updateDoc(pel(valm12()), { havainto_porras_ehdotus: { porras: 2, hist: [1, 2] } }));
    await assertFails(updateDoc(pel(valm12()), { 'havainto_porras_ehdotus.hist': [1] }));
    await assertSucceeds(updateDoc(pel(valm12()), { havainto_porras_ehdotus: { porras: 2, hist_n: 2 } }));
  });
  it('biologinenIka_viimeisin: vain B-avaimet (tmBioIkaJaa-muoto); maturity_offset tms. hylätään', async () => {
    const b = { phv_tila: 'PRE', phv_tila_koodi: 'PRE', phv_ika: 13.9, ika_mittaushetkella: 12.4, mittauspaiva: '2026-10-01' };
    await assertSucceeds(updateDoc(pel(valm12()), { biologinenIka_viimeisin: b }));
    await assertFails(updateDoc(pel(valm12()), { biologinenIka_viimeisin: Object.assign({}, b, { maturity_offset: -1.5 }) }));
    await assertFails(updateDoc(pel(sa()), { 'biologinenIka_viimeisin.phv_raaka': 1 }));
  });
});

describe('v3.79 · sovelluksen jako kelpaa: tmSisainenRiisu(upd) menee pelaajadokumenttiin (jaksofokus jaetaan erikseen tmJaksofokusJaa:lla)', () => {
  it('kaikki A-kentät + signaali/porrasehdotus A-muodossa → riisuttu osa läpi valmentajalta (ei vacuous: riisumaton hylätään)', async () => {
    const upd = { etunimi: 'Testi', signaali: 'xfactor', havainto_porras_ehdotus: { porras: 2, hist: [1, 2] } };
    for (const k of AKENTAT) upd[k] = 1;
    await assertFails(updateDoc(pel(valm12()), upd));
    const r = S.tmSisainenRiisu(upd);
    await assertSucceeds(updateDoc(pel(valm12()), r));
  });
});

describe('v3.79 · idp/{id} suljettu', () => {
  it('kukaan ei lue eikä kirjoita (SA, VP, valmentaja, huoltaja)', async () => {
    for (const db of [sa(), vp(), valm12(), huoltaja()]) {
      await assertFails(getDoc(doc(db, 'seurat', A, 'pelaajat', PID, 'idp', 'k2026')));
      await assertFails(setDoc(doc(db, 'seurat', A, 'pelaajat', PID, 'idp', 'k2027'), { tavoite: 'y' }));
    }
    await assertSucceeds(getDoc(pel(huoltaja())));   // ei vacuous: huoltaja lukee lapsen pelaajadokumentin edelleen
  });
});
