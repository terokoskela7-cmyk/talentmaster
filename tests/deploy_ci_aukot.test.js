/**
 * DEPLOY-CI-AUKOT — storage.rules · firestore-indeksit · functions.
 *
 * KOLME AUKKOA jotka tuottivat prod≠main-driftiä ja käsin-deployta:
 *  1. `storage.rules` deployattiin Consolesta käsin, koska `firebase.json`:sta
 *     puuttui `storage`-avain → `--only storage` ei löytänyt sääntötiedostoa.
 *  2. `deploy-rules` deployasi VAIN `firestore:rules`, ei indeksejä. Juuri se
 *     pakotti #586:n käsin-deployn: indeksi oli repossa ja koodi kunnossa,
 *     mutta VP:n viestit eivät saapuneet ennen käsin ajettua deployta.
 *  3. `functions/` ei deployautunut lainkaan CI:llä → #564-drift (aiProxy
 *     prod ≠ main).
 *
 * Portti mittaa KONFIGURAATIOTA (workflow + firebase.json), ei ajoa: Claude ei
 * aja tuotannon deployta eikä käsittele salaisuuksia. Rooli- ja
 * environment-asetukset ovat Teron vastuulla; ne eivät näy repossa, joten niitä
 * ei voi eikä pidä vartioida täältä.
 */
import { describe, it, expect } from 'vitest';
import { readFileSync, existsSync } from 'fs';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

const juuri = join(dirname(fileURLToPath(import.meta.url)), '..');
const lue = (p) => readFileSync(join(juuri, p), 'utf8');
const FIREBASE = JSON.parse(lue('firebase.json'));
/** YAML ILMAN #-kommentteja.
    Väitteet kohdistuvat ASKELIIN, eivät dokumentaatioon: otsikkokommentit
    mainitsevat `firebase deploy` ja `--only ...` selittäessään MIKSI aukot
    olivat olemassa, jolloin `indexOf` osuisi kommenttiin eikä varsinaiseen
    askeleeseen — todettu mutaatiotestissä. */
const ilmanKommentteja = (yaml) => yaml.split('\n')
  .filter((r) => !/^\s*#/.test(r))
  .join('\n');

const RULES_WF = ilmanKommentteja(lue('.github/workflows/deploy-rules.yml'));
const FUNCS_WF_POLKU = '.github/workflows/deploy-functions.yml';
const FUNCS_WF = ilmanKommentteja(lue(FUNCS_WF_POLKU));

describe('Deploy-CI · kolme aukkoa kiinni', () => {
  it('AUKKO 1 · firebase.json osoittaa storage.rules-tiedostoon', () => {
    expect(FIREBASE.storage, 'storage-avain puuttuu → --only storage ei löydä sääntöjä').toBeTruthy();
    expect(FIREBASE.storage.rules).toBe('storage.rules');
    expect(existsSync(join(juuri, FIREBASE.storage.rules)), 'viitattua sääntötiedostoa ei ole').toBe(true);
    /* Firestore-lohko ei saa rikkoutua samalla. */
    expect(FIREBASE.firestore.rules).toBe('tm_admin/firestore.rules');
    expect(FIREBASE.firestore.indexes).toBe('firestore.indexes.json');
  });

  it('AUKKO 2 · deploy-workflow deployaa säännöt, INDEKSIT ja storagen', () => {
    const deployRivi = RULES_WF.split('\n').find((l) => l.includes('firebase deploy'));
    expect(deployRivi, 'deploy-riviä ei löytynyt').toBeTruthy();
    ['firestore:rules', 'firestore:indexes', 'storage'].forEach((osa) => {
      expect(deployRivi, 'deploy ei kata osaa: ' + osa).toContain(osa);
    });
  });

  it('AUKKO 2 · polkuliipaisin kattaa indeksit ja storage-säännöt', () => {
    /* Ilman polkua muutos ei laukaise deployta → sama käsin-vaiva jatkuisi. */
    ['firestore.indexes.json', 'storage.rules', 'tm_admin/firestore.rules', 'firebase.json']
      .forEach((p) => expect(RULES_WF, 'polkuliipaisin ei kata: ' + p).toContain(p));
  });

  it('AUKKO 2 · rules-testit ovat yhä portti ENNEN deployta', () => {
    /* Sääntövirhe ei saa päätyä tuotantoon. Deployn on tultava testien jälkeen. */
    const iTesti = RULES_WF.indexOf('vitest run tests/rules');
    const iDeploy = RULES_WF.indexOf('firebase deploy');
    expect(iTesti, 'rules-testiporttia ei ole').toBeGreaterThan(-1);
    expect(iTesti, 'deploy ajetaan ennen testejä').toBeLessThan(iDeploy);
  });

  it('AUKKO 3 · deploy-functions.yml on olemassa ja path-suodatettu', () => {
    expect(existsSync(join(juuri, FUNCS_WF_POLKU)), 'functions-workflow puuttuu').toBe(true);
    const wf = FUNCS_WF;
    expect(wf, 'ei deployaa funktioita').toContain('--only functions');
    expect(wf, 'path-suodatus puuttuu → deploy joka mergellä').toContain('functions/**');
    expect(wf, 'concurrency-ryhmä puuttuu').toContain('concurrency:');
  });

  it('AUKKO 3 · funktiotestit ajetaan ENNEN deployta', () => {
    const wf = FUNCS_WF;
    const iTesti = wf.indexOf('npm test');
    const iDeploy = wf.indexOf('firebase deploy');
    expect(iTesti, 'testiaskel puuttuu — turvakriittinen koodi deployattaisiin testaamatta').toBeGreaterThan(-1);
    expect(iTesti, 'deploy ajetaan ennen testejä').toBeLessThan(iDeploy);
    /* Testien on ajettava functions-hakemistossa omalla lockfilellään. */
    expect(wf, 'npm ci puuttuu → devDependency firebase-functions-test ei asennu').toContain('npm ci');
    expect(wf, 'väärä työhakemisto').toContain('working-directory: functions');
  });

  it('AUKKO 3 · Node-versio vastaa functions/package.json engineä', () => {
    /* Versioero rikkoisi 1st-gen-handlerit vasta tuotannossa. */
    const pkg = JSON.parse(lue('functions/package.json'));
    const engine = String((pkg.engines || {}).node || '').replace(/[^\d]/g, '');
    expect(engine, 'functions/package.json ei määritä Node-versiota').toBeTruthy();
    expect(FUNCS_WF, 'workflow ajaa eri Nodea kuin functions vaatii')
      .toContain('node-version: ' + engine);
  });

  it('AUKKO 3 · funktiotestit ovat oikeasti ajettavia (ei tyhjä portti)', () => {
    /* Jos `npm test` ei aja mitään, portti olisi näennäinen. */
    const pkg = JSON.parse(lue('functions/package.json'));
    expect(pkg.scripts && pkg.scripts.test, 'functions/package.json:ssa ei ole test-skriptiä').toBeTruthy();
    expect(existsSync(join(juuri, 'functions/test')), 'testihakemistoa ei ole').toBe(true);
    expect((pkg.devDependencies || {})['firebase-functions-test'],
      'firebase-functions-test ei ole devDependency → npm ci ei asenna sitä ja testi kaatuu CI:ssä').toBeTruthy();
  });

  it('EI SALAISUUKSIA REPOSSA: workflowit viittaavat secrets.*:iin', () => {
    [RULES_WF, FUNCS_WF].forEach((wf) => {
      expect(wf, 'service account -avain ei tule secretsistä').toMatch(/secrets\.[A-Z_]+/);
      /* Karkea vartija kovakoodattua avainmateriaalia vastaan. */
      expect(wf, 'workflow sisältää yksityisen avaimen').not.toContain('BEGIN PRIVATE KEY');
      expect(wf, 'workflow sisältää service account -JSONin').not.toContain('"type": "service_account"');
    });
  });

  it('OLEMASSA OLEVAT workflowit ennallaan (tämä ei koske niihin)', () => {
    ['deploy-hosting.yml', 'deploy-pages.yml', 'bump-version.yml', 'seed_kartoitukset.yml', 'test.yml']
      .forEach((f) => expect(existsSync(join(juuri, '.github/workflows/' + f)), f + ' katosi').toBe(true));
  });
});
