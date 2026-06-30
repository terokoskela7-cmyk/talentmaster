// #96 — GDPR-locator REAL Firestore -emulaattorissa (firebase-admin). Spec: docs/GDPR_TEKNIIKKA_SPEC.md.
// MIKSI: documentId-collectionGroup-bugi ilmenee VAIN oikeaa Firestorea vasten (mock ei heitä) → tämä testi
// luo lasnaolija- + tulos-docit OIKEALLA doc-id:llä, todistaa että locator LÖYTÄÄ ne (iterointi) JA että
// RTBF-poistologiikka POISTAA ne (regressio: ennen jäivät orvoiksi). Ajetaan rules-tests-CI:ssä (emulaattori).
// EI mukana `npm test`:ssä (vitest run --exclude tests/rules/**) → ei vaadi emulaattoria peruskierroksella.
import { describe, it, expect, beforeAll, afterAll } from 'vitest';
const admin = require('firebase-admin');
const { keraaPelaajanManifesti } = require('../../functions/gdpr_locator.js');

const PROJECT_ID = 'gdpr-locator-emu';   // oma namespace (eristetty Rules-testien projektista)
const SID = 'emuseura';
const PID = 'UID_emu_abc';
const PALLO = '99887766';

// Aja vain emulaattoria vasten (FIRESTORE_EMULATOR_HOST asetettu firebase emulators:exec:llä).
// Ilman emulaattoria → skip (ei osu oikeaan Firestoreen).
const EMULAATTORI = !!process.env.FIRESTORE_EMULATOR_HOST;
const kuvaa = EMULAATTORI ? describe : describe.skip;

let db;

async function poistaSeura() {
  // Siivous: koko seura-puu (recursiveDelete kattaa alikokoelmat). Idempotentti.
  try { await db.recursiveDelete(db.collection('seurat').doc(SID)); } catch (e) { /* tyhjä OK */ }
  try { await db.recursiveDelete(db.collection('pelaajat').doc(PALLO)); } catch (e) { /* tyhjä OK */ }
  try { await db.collection('marketplace').doc(PALLO).delete(); } catch (e) { /* tyhjä OK */ }
}

async function seed() {
  const seura = db.collection('seurat').doc(SID);
  const base  = seura.collection('pelaajat').doc(PID);
  await base.set({ etunimi: 'Emu', sukunimi: 'Testaaja', tunniste: PALLO, huoltajaEmail: 'emu@test.fi' });
  await base.collection('havainnot').doc('h1').set({ tyyppi: 'adar', media: [{ download_url: 'gs://x/m0.jpg' }] });
  await base.collection('kirjaukset').doc('2026-01-01').set({ tyyppi: 'T' });
  // Ristiviitteet OIKEALLA doc-id:llä (regressio):
  await seura.collection('kalenteri').doc('ev1').set({ tyyppi: 'treeni' });
  await seura.collection('kalenteri').doc('ev1').collection('lasnaolijat').doc(PID).set({ tila: 'paikalla' });
  await seura.collection('kalenteri').doc('ev2').set({ tyyppi: 'ottelu' });   // ei tämän pelaajan läsnäoloa
  await seura.collection('testitapahtumat').doc('tt1').set({ nimi: 'syystesti' });
  await seura.collection('testitapahtumat').doc('tt1').collection('tulokset').doc(PID).set({ testit: { lin_30m: 5.0 } });
  await seura.collection('testitapahtumat').doc('tt2').set({ nimi: 'kevattesti' });
  await seura.collection('testitapahtumat').doc('tt2').collection('tulokset').doc(PALLO).set({ testit: {} }); // palloID-avain
  // HUOM: valmentajat/vUID jätetään TAHALLAAN phantom-vanhemmaksi (vain subcollection, ei parent-docia)
  // → testaa että locator löytää kontribuution listDocuments():lla (collection().get() ei palauta phantomia).
  await seura.collection('valmentajat').doc('vUID').collection('kontribuutio').doc(PALLO).set({ pisteet: 3 });
  await seura.collection('rekisteri').doc(PALLO).set({ viite: true });
  await db.collection('marketplace').doc(PALLO).set({ scout_window: true });
  await db.collection('pelaajat').doc(PALLO).set({ nimi: 'Emu', seuraId: null });  // Solo
}

kuvaa('GDPR-locator @ Firestore-emulaattori (#96 regressio)', () => {
  beforeAll(async () => {
    if (!admin.apps.length) admin.initializeApp({ projectId: PROJECT_ID });
    db = admin.firestore();
    await poistaSeura();
    await seed();
  });
  afterAll(async () => { await poistaSeura(); });

  it('locator LÖYTÄÄ ristiviitteet oikeaa Firestorea vasten (ei documentId-heittoa)', async () => {
    const m = await keraaPelaajanManifesti(db, SID, PID);
    expect(m.loytyi).toBe(true);
    expect(m.palloID).toBe(PALLO);
    expect(m.varoitukset).toEqual([]);                       // ei heittoja
    expect(m.lukumaarat.lasnaolo).toBe(1);                   // ev1 (ev2 ei tätä pelaajaa)
    expect(m.lukumaarat.testitapahtuma_tulokset).toBe(2);    // tt1 (pid) + tt2 (palloID)
    expect(m.lukumaarat.palloID_viitteet).toBe(3);           // rekisteri + kontribuutio + marketplace
    expect(m.lukumaarat.havainnot).toBe(1);
    expect(m.lukumaarat.solo).toBe(1);
  });

  it('RTBF-poistologiikka poistaa ristiviitteet (ei jää orpoja)', async () => {
    const m = await keraaPelaajanManifesti(db, SID, PID);
    // Sama poistologiikka kuin poistaPelaajaGDPR: recursiveDelete(pääDoc) + ristiviite-refit + Solo
    await db.recursiveDelete(m.paaDoc.ref);
    const ristiRefit = []
      .concat(m.ristiviitteet.lasnaolo, m.ristiviitteet.testitapahtuma_tulokset, m.ristiviitteet.palloID_viitteet)
      .map((x) => x.ref);
    const batch = db.batch();
    ristiRefit.forEach((r) => batch.delete(r));
    await batch.commit();
    if (m.soloRef) await db.recursiveDelete(m.soloRef);

    // Varmista: ristiviitteet OIKEASTI poissa (ei orpoja)
    const lasna = await db.collection('seurat').doc(SID).collection('kalenteri').doc('ev1').collection('lasnaolijat').doc(PID).get();
    const tt1   = await db.collection('seurat').doc(SID).collection('testitapahtumat').doc('tt1').collection('tulokset').doc(PID).get();
    const tt2   = await db.collection('seurat').doc(SID).collection('testitapahtumat').doc('tt2').collection('tulokset').doc(PALLO).get();
    const kontr = await db.collection('seurat').doc(SID).collection('valmentajat').doc('vUID').collection('kontribuutio').doc(PALLO).get();
    const market = await db.collection('marketplace').doc(PALLO).get();
    expect(lasna.exists).toBe(false);
    expect(tt1.exists).toBe(false);
    expect(tt2.exists).toBe(false);
    expect(kontr.exists).toBe(false);
    expect(market.exists).toBe(false);

    // Idempotenssi: uusi locator-ajo → loytyi:false, nollalukumäärät
    const m2 = await keraaPelaajanManifesti(db, SID, PID);
    expect(m2.loytyi).toBe(false);
    expect(m2.lukumaarat.lasnaolo).toBe(0);
    expect(m2.lukumaarat.testitapahtuma_tulokset).toBe(0);
  });
});
