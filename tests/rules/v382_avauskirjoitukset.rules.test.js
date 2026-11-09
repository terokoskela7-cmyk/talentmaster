/**
 * TalentMaster™ — Rules v3.82 (projekti 03 PR D, KIRISTÄÄ): avauskirjoitukset vain palvelimelta.
 *  (1) seurat/{sid}/kayttajat/{uid}.viimeisinKirjautuminen muuttumattomana clientiltä KAIKILLE (myös SA, oma uid, johto).
 *  (2) toimenpiteet create vain pulssin kuittaukselle: tid ^pulssi_.+ ja tyyppi == 'pulssi'.
 *  (3) toimenpiteet update: automaattisilla (tyyppi == 'automaattinen') vain tila, vp_teksti, kuitattu_pvm, kuitattu_uid. Pulssin set() olemassa olevaan ennallaan.
 * Ajo: npm run test:rules (Java ≥ 21).
 */
import { initializeTestEnvironment, assertSucceeds, assertFails } from '@firebase/rules-unit-testing';
import { readFileSync } from 'fs';
import { resolve, dirname } from 'path';
import { fileURLToPath } from 'url';
import { setDoc, doc, updateDoc, writeBatch, deleteDoc } from 'firebase/firestore';
import { describe, it, beforeAll, afterAll, beforeEach, expect } from 'vitest';

const __dirname = dirname(fileURLToPath(import.meta.url));
const RULES = readFileSync(resolve(__dirname, '../../tm_admin/firestore.rules'), 'utf8');
const [HOST, PORT] = (process.env.FIRESTORE_EMULATOR_HOST || '127.0.0.1:8080').split(':');
const A = 'fcl', B = 'toinen';
const AUTO = 'auto_suunta_lasku_fcl_u13_2026-W45_0123456789';
const PULSSI = 'pulssi_ei_jaksoa_fcl_u13';
const EHDOTUS = { tyyppi: 'automaattinen', signaali: 'suunta_lasku', joukkue: 'U13', teksti: 'U13 — H-H taso laskussa', tila: 'ehdotus', vp_teksti: null, luotu: 'x', kuitattu_pvm: null, kuitattu_uid: null };
const PULSSI_DOC = { tyyppi: 'pulssi', signaali: 'ei_jaksoa', joukkue: 'fcl_u13', tila: 'kuitattu', palaa_vk: null, kuitattu_pvm: 'a', kuitattu_uid: 'vp-a', luotu: 'x' };
const KAYTTAJA = { rooli: 'valmentaja', seuraId: A, nimi: 'Oma', viimeisinKirjautuminen: 'palvelin-aika' };
let env;

beforeAll(async () => { env = await initializeTestEnvironment({ projectId: 'talentmaster-v382', firestore: { rules: RULES, host: HOST, port: Number(PORT) } }); });
afterAll(async () => { if (env) await env.cleanup(); });
beforeEach(async () => {
  await env.clearFirestore();
  await env.withSecurityRulesDisabled(async (c) => {
    const db = c.firestore();
    await setDoc(doc(db, 'admins', 'sa-1'), { rooli: 'super_admin' });
    await setDoc(doc(db, 'seurat', A), { nimi: 'FCL' });
    await setDoc(doc(db, 'seurat', A, 'kayttajat', 'valm-1'), KAYTTAJA);
    await setDoc(doc(db, 'seurat', A, 'kayttajat', 'vp-a'), Object.assign({}, KAYTTAJA, { rooli: 'vp' }));
    await setDoc(doc(db, 'seurat', A, 'toimenpiteet', AUTO), EHDOTUS);
    await setDoc(doc(db, 'seurat', A, 'toimenpiteet', PULSSI), PULSSI_DOC);
  });
});
const staff = (uid, rooli, seura) => env.authenticatedContext(uid, { rooli, seuraId: seura || A }).firestore();
const sa = () => env.authenticatedContext('sa-1', { rooli: 'super_admin' }).firestore();
const vp = () => staff('vp-a', 'vp'), valm = () => staff('valm-1', 'valmentaja');
const kayttaja = (db, uid) => doc(db, 'seurat', A, 'kayttajat', uid);
const tp = (db, id, seura) => doc(db, 'seurat', seura || A, 'toimenpiteet', id);

describe('v3.82 (1) · viimeisinKirjautuminen vain palvelimelta', () => {
  it('lähde: oma apufunktio, liitetty kayttajat-updateen (ei kayttajaPaasyKentatEnnallaan-listaan)', () => {
    expect(RULES).toMatch(/function kayttajaAikaleimaEnnallaan\(\)/);
    expect(RULES).toMatch(/kayttajaPaasyKentatEnnallaan\(\) && kayttajaAikaleimaEnnallaan\(\)/);
    const paasy = RULES.slice(RULES.indexOf('function kayttajaPaasyKentatEnnallaan'), RULES.indexOf('function kayttajaPaasyKentatEnnallaan') + 400);
    expect(paasy).not.toContain('viimeisinKirjautuminen');
  });
  it('oma uid: muu kenttä sallittu; viimeisinKirjautuminen-muutos estetty', async () => {
    await assertSucceeds(updateDoc(kayttaja(valm(), 'valm-1'), { nimi: 'Uusi nimi' }));
    await assertFails(updateDoc(kayttaja(valm(), 'valm-1'), { viimeisinKirjautuminen: 'selaimen-aika' }));
    await assertFails(updateDoc(kayttaja(valm(), 'valm-1'), { nimi: 'X', viimeisinKirjautuminen: 'selaimen-aika' }));
  });
  it('johto (VP) ja SA: ei toisen eikä oman aikaleimaa; muut kentät ennallaan sallittu', async () => {
    await assertFails(updateDoc(kayttaja(vp(), 'valm-1'), { viimeisinKirjautuminen: 'x' }));
    await assertFails(updateDoc(kayttaja(vp(), 'vp-a'), { viimeisinKirjautuminen: 'x' }));
    await assertFails(updateDoc(kayttaja(sa(), 'valm-1'), { viimeisinKirjautuminen: 'x' }));
    await assertSucceeds(updateDoc(kayttaja(vp(), 'valm-1'), { nimi: 'Johdon muokkaama' }));
    await assertSucceeds(updateDoc(kayttaja(sa(), 'valm-1'), { nimi: 'SA:n muokkaama' }));
  });
  it('sama arvo uudelleen (ei muutosta) ei kaada; poisto/uusi kenttä estetty', async () => {
    await assertSucceeds(updateDoc(kayttaja(valm(), 'valm-1'), { nimi: 'Y', viimeisinKirjautuminen: 'palvelin-aika' }));
    await assertFails(setDoc(kayttaja(valm(), 'valm-1'), { rooli: 'valmentaja', seuraId: A, nimi: 'Oma' }));   // set() ilman kenttää = kentän poisto
  });
  it('pääsykentät ennallaan estetty (v3.31 ei regressoi)', async () => {
    await assertFails(updateDoc(kayttaja(valm(), 'valm-1'), { rooli: 'vp' }));
  });
});

describe('v3.82 (2) · toimenpiteet create vain pulssille', () => {
  it('lähde: create-ehto', () => { expect(RULES).toContain("tid.matches('^pulssi_.+') && request.resource.data.tyyppi == 'pulssi'"); });
  it('pulssi_-id + tyyppi pulssi: VP ja SA saavat luoda', async () => {
    await assertSucceeds(setDoc(tp(vp(), 'pulssi_uusi_a'), PULSSI_DOC));
    await assertSucceeds(setDoc(tp(sa(), 'pulssi_uusi_b'), PULSSI_DOC));
  });
  it('automaattinen ehdotus (auto-id tai deterministinen auto_…) estetty VP:ltä ja SA:lta', async () => {
    await assertFails(setDoc(tp(vp(), 'AbCdEfGhIjKlMnOpQrSt'), EHDOTUS));
    await assertFails(setDoc(tp(vp(), 'auto_uusi_fcl_u13_2026-W46_0123456789'), EHDOTUS));
    await assertFails(setDoc(tp(sa(), 'AbCdEfGhIjKlMnOpQrSt'), EHDOTUS));
    await assertFails(setDoc(tp(sa(), 'auto_uusi_fcl_u13_2026-W46_0123456789'), EHDOTUS));
  });
  it('väärä yhdistelmä estetty: pulssi_-id mutta tyyppi automaattinen; tyyppi pulssi mutta muu id; tyhjä pulssi_-häntä; tyyppi puuttuu', async () => {
    await assertFails(setDoc(tp(vp(), 'pulssi_huijaus'), EHDOTUS));
    await assertFails(setDoc(tp(vp(), 'auto_x'), PULSSI_DOC));
    await assertFails(setDoc(tp(vp(), 'pulssi_'), PULSSI_DOC));
    await assertFails(setDoc(tp(vp(), 'pulssi_notype'), { signaali: 'x', tila: 'kuitattu' }));
  });
  it('johtoroolin ulkopuolinen ja toisen seuran käyttäjä estetty (ennallaan)', async () => {
    await assertFails(setDoc(tp(valm(), 'pulssi_val'), PULSSI_DOC));
    await assertFails(setDoc(tp(staff('vp-b', 'vp', B), 'pulssi_toinen', A), PULSSI_DOC));
  });
});

describe('v3.82 (3) · toimenpiteet update', () => {
  it('lähde: toimenpideMuutosSallittu + hasOnly-lista', () => {
    expect(RULES).toMatch(/function toimenpideMuutosSallittu\(\)/);
    expect(RULES).toContain("hasOnly(['tila', 'vp_teksti', 'kuitattu_pvm', 'kuitattu_uid'])");
  });
  it('automaattinen: kuittaus, hylkäys ja muokkaus (VP:n kentät) sallittu — myös batch.update kuten VP', async () => {
    await assertSucceeds(updateDoc(tp(vp(), AUTO), { tila: 'kuitattu', kuitattu_pvm: 'ts', kuitattu_uid: 'vp-a' }));
    await assertSucceeds(updateDoc(tp(vp(), AUTO), { tila: 'hylatty' }));
    await assertSucceeds(updateDoc(tp(vp(), AUTO), { tila: 'muokattu', vp_teksti: 'oma versio', kuitattu_pvm: 'ts', kuitattu_uid: 'vp-a' }));
    const db = vp(), b = writeBatch(db); b.update(tp(db, AUTO), { tila: 'hylatty' }); await assertSucceeds(b.commit());
  });
  it('automaattinen: sisällön, tyypin, signaalin tai muun kentän muutos / uusi kenttä estetty (VP ja SA)', async () => {
    for (const k of [vp(), sa()]) {
      await assertFails(updateDoc(tp(k, AUTO), { teksti: 'väärennetty' }));
      await assertFails(updateDoc(tp(k, AUTO), { tyyppi: 'pulssi' }));
      await assertFails(updateDoc(tp(k, AUTO), { signaali: 'muu' }));
      await assertFails(updateDoc(tp(k, AUTO), { joukkue: 'U99' }));
      await assertFails(updateDoc(tp(k, AUTO), { tila: 'kuitattu', ylimaarainen: 1 }));
    }
  });
  it('pulssi: set() olemassa olevaan dokumenttiin (uudelleenkuittaus) ja kenttämuutokset ennallaan sallittu', async () => {
    await assertSucceeds(setDoc(tp(vp(), PULSSI), Object.assign({}, PULSSI_DOC, { tila: 'siirretty', palaa_vk: '2026-W47' })));
    await assertSucceeds(updateDoc(tp(sa(), PULSSI), { tila: 'kuitattu' }));
  });
  it('johtoroolin ulkopuolinen ei päivitä; delete ennallaan estetty muilta kuin säännön sallimilta (ei uutta oikeutta)', async () => {
    await assertFails(updateDoc(tp(valm(), AUTO), { tila: 'hylatty' }));
    await assertFails(updateDoc(tp(staff('vp-b', 'vp', B), AUTO), { tila: 'hylatty' }));
    await assertFails(deleteDoc(tp(valm(), AUTO)));
  });
});
