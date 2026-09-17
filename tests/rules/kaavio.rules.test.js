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
import { setDoc, getDoc, doc, updateDoc, deleteDoc, serverTimestamp } from 'firebase/firestore';
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
const kaavio = (status, joukkueId, versio) => ({ spec: SPEC, review: { status, nakyvyys: 'joukkue', joukkueId: joukkueId || JOUKKUE_A1, luonut: VALM_A1, versio: versio == null ? 0 : versio } });
// Versiolukko (B2): jokainen update NOSTAA versiota tasan yhdellä. Testien päivitykset menevät
// tämän kautta, jottei lukko jää huomaamatta vihreäksi väärästä syystä.
const paivita = (kentat, versio) => Object.assign({}, kentat, { 'review.versio': (versio == null ? 0 : versio) + 1 });

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

// ── ERÄ D2 — pelaaja EI kirjoita kaavioon suoraan; kuittaus kulkee Cloud Functionin kautta.
// Tämä sviitti on CF:n OLEMASSAOLON PERUSTE: jos nämä väitteet joskus muuttuvat vihreästä
// punaiseksi (eli anon saisi kirjoittaa), kuittaus-CF:ää ei enää tarvittaisi — ja päinvastoin,
// jos joku "korjaa" nämä sallimalla anon-kirjoituksen, kaavio-dokumentti avautuisi pelaajille.
// ── LUONTI-UI — create-portti kaikilla rooleilla. VP:n nappi-näkyvyys (kaavioVoiLuoda) on vain
// UI; tämä sviitti todistaa että PALVELIN päättää saman. Ilman tätä nappi voisi luvata luonnin
// roolille jolta kirjoitus hylätään — tai kieltää sen roolilta joka saisi luoda.
// ── NÄKYVYYSTASON ROOLILUKKO. Hallintomalli: valmentaja kohdistaa oman joukkueensa sisältöä,
// seuran yhteisen kirjaston kuratoi metodologiajohto. UI rajaa valikon, mutta TOTUUS on täällä.
// Jokainen väite tehdään IDENTTISELLÄ payloadilla eri roolilla → ainoa muuttuja on kutsuja.
describe('kaaviot · NÄKYVYYS — seurataso vain hyväksyjälle', () => {
  const dok = (nakyvyys, tila, versio) => ({
    spec: SPEC,
    review: { status: tila || 'luonnos', nakyvyys: nakyvyys, joukkueId: JOUKKUE_A1, pelaajaIds: [],
              versio: versio == null ? 0 : versio, luonut: VALM_A1 }
  });

  it('valmentaja EI luo seuratasoista', async () => {
    await assertFails(setDoc(kd(valm(VALM_A1, SEURA_A), 'k_nak_v_seura'), dok('seura')));
  });
  it('EI-VACUOUS: IDENTTINEN payload VP:ltä onnistuu → ainoa muuttuja on rooli', async () => {
    await assertSucceeds(setDoc(kd(vp(SEURA_A), 'k_nak_vp_seura'), dok('seura')));
  });
  it('valmentaja luo joukkue- ja pelaajatasoisen (ei-vacuous: portti ei estä kaikkea)', async () => {
    await assertSucceeds(setDoc(kd(valm(VALM_A1, SEURA_A), 'k_nak_v_joukkue'), dok('joukkue')));
    await assertSucceeds(setDoc(kd(valm(VALM_A1, SEURA_A), 'k_nak_v_pelaaja'), dok('pelaaja')));
  });
  // ── NELJÄS TASO 'valmentaja' (A+B) — HENKILÖSTÖREITITYS, ei pelaajayleisö.
  // Se ei laajenna yhdenkään pelaajan näkyvyyttä (policy kaavioKohdistuu → false), joten sen
  // asettaminen ei vaadi hyväksyjää sen enempää kuin joukkue/pelaaja-kohdistuskaan.
  it("valmentaja luo 'valmentaja'-tasoisen (henkilöstöreititys ei vaadi hyväksyjää)", async () => {
    await assertSucceeds(setDoc(kd(valm(VALM_A1, SEURA_A), 'k_nak_v_valm'),
      { spec: SPEC, review: { status: 'luonnos', nakyvyys: 'valmentaja', joukkueId: JOUKKUE_A1,
                              valmentajaId: VALM_A1, pelaajaIds: [], versio: 0, luonut: VALM_A1 } }));
  });
  it("review.valmentajaId on kirjoitettavissa — ei kenttäkohtaista allowlistia kaavioissa", async () => {
    await assertSucceeds(setDoc(kd(vp(SEURA_A), 'k_nak_vp_valm'),
      { spec: SPEC, review: { status: 'luonnos', nakyvyys: 'valmentaja', joukkueId: JOUKKUE_A1,
                              valmentajaId: 'joku_toinen_uid', pelaajaIds: [], versio: 0, luonut: VALM_A1 } }));
  });
  it("EI-VACUOUS: 'seura' hylätään SAMALTA valmentajalta samalla payloadilla", async () => {
    await assertFails(setDoc(kd(valm(VALM_A1, SEURA_A), 'k_nak_v_vrt'),
      { spec: SPEC, review: { status: 'luonnos', nakyvyys: 'seura', joukkueId: JOUKKUE_A1,
                              valmentajaId: VALM_A1, pelaajaIds: [], versio: 0, luonut: VALM_A1 } }));
  });
  it("valmentaja saa LASKEA seura → valmentaja (kaventaa pelaajayleisön nollaan)", async () => {
    await testEnv.withSecurityRulesDisabled(async (ctx) => {
      await setDoc(doc(ctx.firestore(), 'seurat', SEURA_A, 'kaaviot', 'k_nak_laske_valm'), dok('seura'));
    });
    await assertSucceeds(updateDoc(kd(valm(VALM_A1, SEURA_A), 'k_nak_laske_valm'),
      paivita({ 'review.nakyvyys': 'valmentaja', 'review.valmentajaId': VALM_A1 }, 0)));
  });

  it('talenttivalmentaja EI luo seuratasoista (ei ole hyväksyjä)', async () => {
    await assertFails(setDoc(kd(talval(), 'k_nak_tv_seura'), dok('seura')));
  });
  it('FAIL-CLOSED: nakyvyys-kenttä puuttuu kokonaan → valmentajalta estetään, VP:ltä sallitaan', async () => {
    const ilman = { spec: SPEC, review: { status: 'luonnos', joukkueId: JOUKKUE_A1, versio: 0, luonut: VALM_A1 } };
    await assertFails(setDoc(kd(valm(VALM_A1, SEURA_A), 'k_nak_tyhja'), ilman));
    await assertSucceeds(setDoc(kd(vp(SEURA_A), 'k_nak_tyhja_vp'), ilman));
  });

  describe('NOSTO seuratasolle muokkauksessa', () => {
    beforeEach(async () => {
      await testEnv.withSecurityRulesDisabled(async (ctx) => {
        const db = ctx.firestore();
        await setDoc(doc(db, 'seurat', SEURA_A, 'kaaviot', 'k_nak_joukkue'), dok('joukkue'));
        await setDoc(doc(db, 'seurat', SEURA_A, 'kaaviot', 'k_nak_jo_seura'), dok('seura'));
      });
    });
    const nosto = () => paivita({ 'review.nakyvyys': 'seura' }, 0);

    it('valmentaja EI nosta joukkue → seura', async () => {
      await assertFails(updateDoc(kd(valm(VALM_A1, SEURA_A), 'k_nak_joukkue'), nosto()));
    });
    it('EI-VACUOUS: IDENTTINEN nosto VP:ltä onnistuu', async () => {
      await assertSucceeds(updateDoc(kd(vp(SEURA_A), 'k_nak_joukkue'), nosto()));
    });
    it('valmentaja saa LASKEA seura → joukkue (kaventaa, ei laajenna)', async () => {
      await assertSucceeds(updateDoc(kd(valm(VALM_A1, SEURA_A), 'k_nak_jo_seura'), paivita({ 'review.nakyvyys': 'joukkue' }, 0)));
    });
    it('valmentaja saa muokata JO seuratasoisen SISÄLTÖÄ ilman näkyvyysmuutosta', async () => {
      await assertSucceeds(updateDoc(kd(valm(VALM_A1, SEURA_A), 'k_nak_jo_seura'), paivita({ spec: SPEC }, 0)));
    });
    it('valmentaja EI kierrä porttia muokkaamalla spec + nakyvyys samalla kertaa', async () => {
      await assertFails(updateDoc(kd(valm(VALM_A1, SEURA_A), 'k_nak_joukkue'), paivita({ spec: SPEC, 'review.nakyvyys': 'seura' }, 0)));
    });
  });
});

describe('kaaviot · LUONTI — create-portti (luonti-UI)', () => {
  // nakyvyys on 'joukkue': seuratason saa asettaa vain hyväksyjä (näkyvyyslukko yllä). Tämä
  // sviitti testaa ROOLI- ja TILAPORTTIA, ei näkyvyyttä — joten fixture käyttää arvoa jonka
  // valmentaja saa asettaa, muuten create estyisi väärästä syystä ja portti valehtelisi.
  const uusi = (tila, versio) => ({ spec: SPEC, review: { status: tila || 'luonnos', nakyvyys: 'joukkue', joukkueId: JOUKKUE_A1, pelaajaIds: [], versio: versio == null ? 0 : versio, luonut: VALM_A1 } });
  it('oman seuran valmentaja LUO luonnoksen (ei-vacuous)', async () => {
    await assertSucceeds(setDoc(kd(valm(VALM_A1, SEURA_A), 'k_luonti_valm'), uusi()));
  });
  it('oman seuran VP luo', async () => {
    await assertSucceeds(setDoc(kd(vp(SEURA_A), 'k_luonti_vp'), uusi()));
  });
  it('TOISEN seuran valmentaja EI luo', async () => {
    await assertFails(setDoc(kd(valm(VALM_A1, SEURA_B), 'k_luonti_vieras'), uusi()));
  });
  it('seurasihteeri EI luo (ei valmennusrooli)', async () => {
    await assertFails(setDoc(kd(siht(), 'k_luonti_siht'), uusi()));
  });
  it('anon EI luo', async () => {
    await assertFails(setDoc(kd(anon(), 'k_luonti_anon'), uusi()));
  });
  it('luonti hyväksyttynä ESTETÄÄN (katselmus ei saa ohittua)', async () => {
    await assertFails(setDoc(kd(valm(VALM_A1, SEURA_A), 'k_luonti_hyv'), uusi('hyvaksytty')));
  });
  it('luonti versiolla != 0 ESTETÄÄN (versiolukko alkaa nollasta)', async () => {
    await assertFails(setDoc(kd(valm(VALM_A1, SEURA_A), 'k_luonti_v5'), uusi('luonnos', 5)));
  });
});

describe('kaaviot · KIRJOITUS — anon-pelaaja ei kirjoita (erä D2)', () => {
  // Kuittaus-payload on TÄSMÄLLEEN sama kaikissa tapauksissa (myös versiolukon osalta) → ainoa
  // muuttuja on KUTSUJA. Ilman tätä anon-esto voisi näyttää vihreältä väärästä syystä
  // (esim. puuttuvasta versiobumpista), ja portti valehtelisi.
  const KUITTAUS = () => paivita({ 'review.ymmarretty.pel1': 'nyt' }, 0);
  it('anon EI kuittaa suoraan (review.ymmarretty)', async () => {
    await assertFails(updateDoc(kd(anon(), 'k_hyvaksytty'), KUITTAUS()));
  });
  it('anon EI kuittaa edes ilman versiobumppia', async () => {
    await assertFails(updateDoc(kd(anon(), 'k_hyvaksytty'), { 'review.ymmarretty.pel1': 'nyt' }));
  });
  it('anon EI muuta statusta eikä speciä', async () => {
    await assertFails(updateDoc(kd(anon(), 'k_hyvaksytty'), paivita({ 'review.status': 'hylatty' }, 0)));
    await assertFails(updateDoc(kd(anon(), 'k_hyvaksytty'), paivita({ spec: SPEC }, 0)));
  });
  it('anon EI luo eikä poista kaaviota', async () => {
    await assertFails(setDoc(kd(anon(), 'k_uusi_anon'), kaavio('luonnos')));
    await assertFails(deleteDoc(kd(anon(), 'k_hyvaksytty')));
  });
  it('EI-VACUOUS: IDENTTINEN kuittaus VP:ltä onnistuu → vain kutsuja erottaa', async () => {
    await assertSucceeds(updateDoc(kd(vp(SEURA_A), 'k_hyvaksytty'), KUITTAUS()));
  });
});

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
    await assertFails(updateDoc(kd(toinen, 'k_luonnos'), paivita({ 'review.status': 'odottaa' })));
    await assertSucceeds(updateDoc(kd(vp(SEURA_A), 'k_luonnos'), paivita({ 'review.status': 'odottaa' })));
  });
  it('valmentaja EI kirjoita TOISEN JOUKKUEEN kaavioon', async () => {
    await assertFails(updateDoc(kd(valm(VALM_A1, SEURA_A), 'k_toinen_joukkue'), paivita({ 'review.status': 'odottaa' })));
  });
  it('valmentaja kirjoittaa OMAN joukkueensa kaavioon (ei-vacuous)', async () => {
    await assertSucceeds(updateDoc(kd(valm(VALM_A1, SEURA_A), 'k_luonnos'), paivita({ 'review.status': 'odottaa' })));
  });
  it('talenttivalmentaja ohittaa joukkuerajauksen seuran sisällä', async () => {
    await assertSucceeds(updateDoc(kd(talval(), 'k_toinen_joukkue'), paivita({ 'review.status': 'odottaa' })));
  });
});

describe('kaaviot · STATUSSIIRROT — katselmus ei saa ohittua', () => {
  it('suora luonnos→hyvaksytty ESTETTY (myös VP:ltä)', async () => {
    await assertFails(updateDoc(kd(vp(SEURA_A), 'k_luonnos'), paivita({ 'review.status': 'hyvaksytty' })));
  });
  it('luonnos→odottaa→hyvaksytty sallittu (ei-vacuous)', async () => {
    await assertSucceeds(updateDoc(kd(valm(VALM_A1, SEURA_A), 'k_luonnos'), paivita({ 'review.status': 'odottaa' })));
    await assertSucceeds(updateDoc(kd(vp(SEURA_A), 'k_odottaa'), paivita({ 'review.status': 'hyvaksytty' })));
  });
  it('valmentaja EI hyväksy odottavaa', async () => {
    await assertFails(updateDoc(kd(valm(VALM_A1, SEURA_A), 'k_odottaa'), paivita({ 'review.status': 'hyvaksytty' })));
  });
  it('SEURASIHTEERI EI hyväksy (onJohtoRooli olisi päästänyt)', async () => {
    await assertFails(updateDoc(kd(siht(), 'k_odottaa'), paivita({ 'review.status': 'hyvaksytty' })));
  });
  it('uusi kaavio EI voi syntyä hyväksyttynä', async () => {
    await assertFails(setDoc(kd(valm(VALM_A1, SEURA_A), 'uusi1'), kaavio('hyvaksytty')));
    await assertSucceeds(setDoc(kd(valm(VALM_A1, SEURA_A), 'uusi2'), kaavio('luonnos')));
  });
});

describe('kaaviot · UUDELLEENHYVÄKSYNTÄ', () => {
  it('valmentajan muokkaus hyväksyttyyn PAKOTTAA takaisin odottamaan', async () => {
    const db = valm(VALM_A1, SEURA_A);
    await assertFails(updateDoc(kd(db, 'k_hyvaksytty'), paivita({ spec: { ...SPEC, suunta: 'alas' } })));            // status jäisi hyväksytyksi
    await assertSucceeds(updateDoc(kd(db, 'k_hyvaksytty'), paivita({ spec: { ...SPEC, suunta: 'alas' }, 'review.status': 'odottaa' })));
  });
  it('VP saa muokata hyväksyttyä ilman pudotusta (itse-kierros ei lisää kontrollia)', async () => {
    await assertSucceeds(updateDoc(kd(vp(SEURA_A), 'k_hyvaksytty'), paivita({ spec: { ...SPEC, suunta: 'alas' } })));
  });
});

describe('kaaviot · OPTIMISTINEN VERSIOLUKKO (B2)', () => {
  // Kaavio on kokonaisuutena korvattava dokumentti: spec kirjoitetaan aina kokonaan, joten
  // hiljainen ylikirjoitus menettäisi KOKO toisen piirroksen. Lukko on siksi datan eheyttä,
  // ei pääsyoikeutta — se koskee myös SA:ta.
  it('oikea +1 SALLITAAN (ei-vacuous)', async () => {
    await assertSucceeds(updateDoc(kd(vp(SEURA_A), 'k_luonnos'), { 'review.status': 'odottaa', 'review.versio': 1 }));
  });
  it('VANHENTUNUT versio (sama kuin nykyinen) ESTETÄÄN — samanaikainen kirjoittaja', async () => {
    await assertFails(updateDoc(kd(vp(SEURA_A), 'k_luonnos'), { 'review.status': 'odottaa', 'review.versio': 0 }));
  });
  it('versio-HYPPY (+2) estetään — ohittaisi välissä tehdyn muutoksen', async () => {
    await assertFails(updateDoc(kd(vp(SEURA_A), 'k_luonnos'), { 'review.status': 'odottaa', 'review.versio': 2 }));
  });
  it('versio-LASKU estetään — palauttaisi vanhan tilan', async () => {
    await testEnv.withSecurityRulesDisabled(async (c) => {
      await setDoc(doc(c.firestore(), 'seurat', SEURA_A, 'kaaviot', 'k_v5'), kaavio('luonnos', JOUKKUE_A1, 5));
    });
    await assertFails(updateDoc(kd(vp(SEURA_A), 'k_v5'), { 'review.status': 'odottaa', 'review.versio': 4 }));
    await assertSucceeds(updateDoc(kd(vp(SEURA_A), 'k_v5'), { 'review.status': 'odottaa', 'review.versio': 6 }));
  });
  it('versio puuttuu updatesta kokonaan → estetään (ei saa ohittaa lukkoa jättämällä kentän pois)', async () => {
    await assertFails(updateDoc(kd(vp(SEURA_A), 'k_luonnos'), { 'review.status': 'odottaa' }));
  });
  it('luonti vaatii versio == 0', async () => {
    await assertFails(setDoc(kd(valm(VALM_A1, SEURA_A), 'uusi_v3'), kaavio('luonnos', JOUKKUE_A1, 3)));
    await assertSucceeds(setDoc(kd(valm(VALM_A1, SEURA_A), 'uusi_v0'), kaavio('luonnos', JOUKKUE_A1, 0)));
  });
  it('lukko koskee MYÖS super_adminia (eheys, ei oikeus)', async () => {
    await assertFails(updateDoc(kd(sa(), 'k_luonnos'), { 'review.status': 'odottaa', 'review.versio': 0 }));
    await assertSucceeds(updateDoc(kd(sa(), 'k_luonnos'), { 'review.status': 'odottaa', 'review.versio': 1 }));
  });
});

describe('kaaviot · KIRJAUTUMATON (A:n avoin kovennus taitettu B2:een)', () => {
  it('kirjautumaton EI lue edes hyväksyttyä', async () => {
    const db = testEnv.unauthenticatedContext().firestore();
    await assertFails(getDoc(kd(db, 'k_hyvaksytty')));
  });
  it('kirjautumaton EI lue kanonista', async () => {
    const db = testEnv.unauthenticatedContext().firestore();
    await assertFails(getDoc(doc(db, 'kaaviot', 't_h0')));
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
    await assertFails(updateDoc(kd(vp(SEURA_A), 'k_luonnos'), paivita({ 'review.status': 'hyvaksytty' })));
    await assertSucceeds(updateDoc(kd(vp(SEURA_A), 'k_odottaa'), paivita({ 'review.status': 'hyvaksytty' })));
  });

  it('VERSIOLUKKO on identtinen libissä ja säännöissä', async () => {
    const doc0 = { seuraId: SEURA_A, review: { status: 'luonnos', joukkueId: JOUKKUE_A1, versio: 0 } };
    expect(P.kaavioSeuraavaVersio(doc0)).toBe(1);
    expect(P.kaavioVersioKelpaa(doc0, 1)).toBe(true);
    expect(P.kaavioVersioKelpaa(doc0, 0)).toBe(false);   // vanhentunut
    expect(P.kaavioVersioKelpaa(doc0, 2)).toBe(false);   // hyppy
    // sama säännöissä
    await assertFails(updateDoc(kd(vp(SEURA_A), 'k_luonnos'), { 'review.status': 'odottaa', 'review.versio': 0 }));
    await assertFails(updateDoc(kd(vp(SEURA_A), 'k_luonnos'), { 'review.status': 'odottaa', 'review.versio': 2 }));
    await assertSucceeds(updateDoc(kd(vp(SEURA_A), 'k_luonnos'), { 'review.status': 'odottaa', 'review.versio': 1 }));
  });

  it('seurasihteeri ei ole hyväksyjä kummassakaan', async () => {
    expect(P.kaavioOnHyvaksyja({ rooli: 'seurasihteeri', seuraId: SEURA_A })).toBe(false);
    await assertFails(updateDoc(kd(siht(), 'k_odottaa'), paivita({ 'review.status': 'hyvaksytty' })));
  });
});

// ── ERÄ D2 — KESKENERÄINEN LUONNOS (review.yksityinen).
// "Ei vielä valmis", EI valmentajien välinen piilotus: seuran sisäinen näkyvyys on
// tarkoituksellista ja palaa heti julkaisusta. Portti on TÄÄLLÄ — UI:n suodatin voi piilottaa,
// mutta vain sääntö estää lukemisen.
describe('kaaviot · YKSITYINEN LUONNOS — tekijän oma kunnes julkaistu', () => {
  const dok = (yksityinen, status, luonut) => ({
    spec: SPEC,
    review: { status: status || 'luonnos', nakyvyys: 'joukkue', joukkueId: JOUKKUE_A1,
              luonut: luonut || VALM_A1, versio: 0,
              ...(yksityinen === undefined ? {} : { yksityinen: yksityinen }) }
  });
  beforeEach(async () => {
    await testEnv.withSecurityRulesDisabled(async (ctx) => {
      const db = ctx.firestore();
      await setDoc(doc(db, 'seurat', SEURA_A, 'kaaviot', 'k_yks'), dok(true));
      await setDoc(doc(db, 'seurat', SEURA_A, 'kaaviot', 'k_julk'), dok(false));
      await setDoc(doc(db, 'seurat', SEURA_A, 'kaaviot', 'k_vanha'), dok(undefined));        // ei kenttää
      await setDoc(doc(db, 'seurat', SEURA_A, 'kaaviot', 'k_yks_hyv'), dok(true, 'hyvaksytty'));
    });
  });

  it('tekijä lukee oman yksityisen luonnoksensa', async () => {
    await assertSucceeds(getDoc(kd(valm(VALM_A1, SEURA_A), 'k_yks')));
  });
  it('TOINEN saman seuran valmentaja EI lue sitä', async () => {
    await assertFails(getDoc(kd(valm(VALM_A2, SEURA_A), 'k_yks')));
  });
  it('EI-VACUOUS: IDENTTINEN dokumentti ilman yksityisyyttä luetaan samalta valmentajalta', async () => {
    await assertSucceeds(getDoc(kd(valm(VALM_A2, SEURA_A), 'k_julk')));
  });
  it('johto (VP) EI lue keskeneräistä — yksityinen = ei valmis kenellekään', async () => {
    await assertFails(getDoc(kd(vp(SEURA_A), 'k_yks')));
    await assertSucceeds(getDoc(kd(vp(SEURA_A), 'k_julk')));   // ei-vacuous: julkaistu kyllä
  });
  it('talenttivalmentaja EI lue toisen keskeneräistä (ohitus koskee joukkuerajausta, ei yksityisyyttä)', async () => {
    await assertFails(getDoc(kd(talval(), 'k_yks')));
  });
  it('SA lukee (ylläpito)', async () => {
    await assertSucceeds(getDoc(kd(sa(), 'k_yks')));
  });
  it('TAAKSEPÄIN: kenttä puuttuu kokonaan → julkinen (vanhat luonnokset eivät katoa)', async () => {
    await assertSucceeds(getDoc(kd(valm(VALM_A2, SEURA_A), 'k_vanha')));
  });
  it('hyväksytty ei voi olla yksityinen — katselmuksen läpäissyt on julkaistu', async () => {
    await assertSucceeds(getDoc(kd(valm(VALM_A2, SEURA_A), 'k_yks_hyv')));
  });
  it('JULKAISU avaa sen muille (sama dokumentti, yksi kenttä)', async () => {
    await assertFails(getDoc(kd(valm(VALM_A2, SEURA_A), 'k_yks')));
    await assertSucceeds(updateDoc(kd(valm(VALM_A1, SEURA_A), 'k_yks'), { 'review.yksityinen': false, 'review.versio': 1 }));
    await assertSucceeds(getDoc(kd(valm(VALM_A2, SEURA_A), 'k_yks')));
  });
  it('yksityisyys EI ohita seuraeristystä: toisen seuran valmentaja ei lue julkaistuakaan luonnosta', async () => {
    await assertFails(getDoc(kd(valm(VALM_B, SEURA_B), 'k_julk')));
  });
  it('anon (PIN-pelaaja) ei lue yksityistä eikä julkaistua luonnosta (vain hyväksytty)', async () => {
    await assertFails(getDoc(kd(anon(), 'k_yks')));
    await assertFails(getDoc(kd(anon(), 'k_julk')));
  });
});

// ── ERÄ E — KATSELMUKSEN KOMMENTTILANKA (append-only alikokoelma).
// Reject ilman perustelua oli umpikuja. Lanka on se mihin perustelu kirjoitetaan, joten sen
// portit ovat osa review-silmukan eheyttä: väärennetty kirjoittaja tai jälkikäteen muokattu
// hylkäysperustelu tekisi historiasta epäluotettavan.
describe('kaaviot · KOMMENTTILANKA — append-only staff-lanka', () => {
  const kd2 = (db, id) => doc(db, 'seurat', SEURA_A, 'kaaviot', id);
  const komm = (db, kid, cid) => doc(db, 'seurat', SEURA_A, 'kaaviot', kid, 'kommentit', cid);
  const sisalto = (uid, tyyppi, teksti) => ({
    teksti: teksti === undefined ? 'Liikaa pelaajia kentällä — karsi kolmeen.' : teksti,
    kirjoittaja: uid, rooli: 'vp', tyyppi: tyyppi || 'kommentti', aika: serverTimestamp()
  });
  beforeEach(async () => {
    await testEnv.withSecurityRulesDisabled(async (ctx) => {
      const db = ctx.firestore();
      await setDoc(kd2(db, 'k_lanka'), kaavio('odottaa'));
      await setDoc(kd2(db, 'k_lanka_yks'), { spec: SPEC, review: { status: 'luonnos', nakyvyys: 'joukkue', joukkueId: JOUKKUE_A1, luonut: VALM_A1, yksityinen: true, versio: 0 } });
      await setDoc(komm(db, 'k_lanka', 'c0'), { teksti: 'vanha', kirjoittaja: VP_A, rooli: 'vp', tyyppi: 'hylkays', aika: new Date() });
      await setDoc(komm(db, 'k_lanka_yks', 'c0'), { teksti: 'yksityisen lanka', kirjoittaja: VALM_A1, rooli: 'valmentaja', tyyppi: 'kommentti', aika: new Date() });
    });
  });

  it('VP kommentoi oman seuran kaaviota', async () => {
    await assertSucceeds(setDoc(komm(vp(SEURA_A), 'k_lanka', 'c_vp'), sisalto(VP_A, 'hylkays')));
  });
  it('valmentaja kommentoi (silmukka on kaksisuuntainen)', async () => {
    await assertSucceeds(setDoc(komm(valm(VALM_A1, SEURA_A), 'k_lanka', 'c_v'), sisalto(VALM_A1)));
  });
  it('TOISEN SEURAN valmentaja ei kommentoi eikä lue', async () => {
    await assertFails(setDoc(komm(valm(VALM_B, SEURA_B), 'k_lanka', 'c_b'), sisalto(VALM_B)));
    await assertFails(getDoc(komm(valm(VALM_B, SEURA_B), 'k_lanka', 'c0')));
  });
  it('KIRJOITTAJAN VÄÄRENNÖS estyy (kirjoittaja != auth.uid)', async () => {
    await assertFails(setDoc(komm(valm(VALM_A1, SEURA_A), 'k_lanka', 'c_vale'), sisalto(VP_A)));
  });
  it('tyhjä teksti estyy — perustelu ei saa olla tyhjä myöskään säännön mielestä', async () => {
    await assertFails(setDoc(komm(vp(SEURA_A), 'k_lanka', 'c_tyhja'), sisalto(VP_A, 'hylkays', '')));
  });
  it('tuntematon tyyppi estyy (pelaajan kysymys kulkee CF:n kautta, ei suoraan)', async () => {
    await assertFails(setDoc(komm(vp(SEURA_A), 'k_lanka', 'c_kysymys'), sisalto(VP_A, 'kysymys')));
  });
  it('client-kello estyy: aika on pakotettu serverTimestampiksi', async () => {
    await assertFails(setDoc(komm(vp(SEURA_A), 'k_lanka', 'c_kello'),
      { teksti: 'x', kirjoittaja: VP_A, rooli: 'vp', tyyppi: 'kommentti', aika: new Date(2020, 0, 1) }));
  });
  it('APPEND-ONLY: kirjoittajakaan ei muokkaa omaa hylkäysperusteluaan jälkikäteen', async () => {
    await assertFails(updateDoc(komm(vp(SEURA_A), 'k_lanka', 'c0'), { teksti: 'siistitty' }));
  });
  it('poisto vain SA:lle', async () => {
    await assertFails(deleteDoc(komm(vp(SEURA_A), 'k_lanka', 'c0')));
    await assertSucceeds(deleteDoc(komm(sa(), 'k_lanka', 'c0')));
  });
  it('seurasihteeri LUKEE langan (hän näkee kaaviotkin) muttei KIRJOITA siihen', async () => {
    // Sama rajaus kuin onKaavioHyvaksyja():ssa: katselmuspalaute on valmennussisältöä, ei hallintoa.
    await assertSucceeds(getDoc(komm(siht(), 'k_lanka', 'c0')));
    await assertFails(setDoc(komm(siht(), 'k_lanka', 'c_s'), sisalto(SIHTEERI)));
  });
  it('talenttivalmentaja kommentoi (valmennusrooli)', async () => {
    await assertSucceeds(setDoc(komm(talval(), 'k_lanka', 'c_tv'), sisalto(TALVAL)));
  });
  it('anon (PIN-pelaaja) EI lue staff-lankaa vaikka näkisi hyväksytyn kaavion', async () => {
    await testEnv.withSecurityRulesDisabled(async (ctx) => {
      await setDoc(kd2(ctx.firestore(), 'k_hyv_lanka'), kaavio('hyvaksytty'));
      await setDoc(komm(ctx.firestore(), 'k_hyv_lanka', 'c0'), { teksti: 'staff', kirjoittaja: VP_A, rooli: 'vp', tyyppi: 'kommentti', aika: new Date() });
    });
    await assertSucceeds(getDoc(kd2(anon(), 'k_hyv_lanka')));        // ei-vacuous: kaavio kyllä
    await assertFails(getDoc(komm(anon(), 'k_hyv_lanka', 'c0')));    // mutta ei lanka
  });

  describe('yksityisen luonnoksen lanka seuraa kaaviota', () => {
    it('tekijä lukee', async () => {
      await assertSucceeds(getDoc(komm(valm(VALM_A1, SEURA_A), 'k_lanka_yks', 'c0')));
    });
    it('toinen valmentaja EI lue — lanka perii kaavion yksityisyyden', async () => {
      await assertFails(getDoc(komm(valm(VALM_A2, SEURA_A), 'k_lanka_yks', 'c0')));
    });
    it('EI-VACUOUS: sama valmentaja lukee JULKISEN kaavion langan', async () => {
      await assertSucceeds(getDoc(komm(valm(VALM_A2, SEURA_A), 'k_lanka', 'c0')));
    });
  });
});
