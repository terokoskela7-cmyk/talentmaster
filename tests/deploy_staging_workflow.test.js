/**
 * Projekti 06 PR 1: deploy-staging.yml vartijat. MIKSI: staging-deploy "onnistuu" myös väärällä kohteella tai tuotannon tunnuksilla, eikä mikään failaisi.
 *  (1) KOHDE: vain talentmaster-staging; ei yhtään viittausta tuotantoprojektiin. (2) TUNNUKSET: vain Workload Identity Federation + staging-muuttujat;
 *  ei tuotannon secretejä, ei avaimia (P9). (3) KÄYNNISTYS: vain käsin (P3). (4) KORVAUS ennen tiivisteitä ja deployta; Sentry pois; ajastukset pauselle.
 */
import { describe, it, expect } from 'vitest';
import { readFileSync } from 'fs';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';
const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..');
const S = readFileSync(join(ROOT, '.github/workflows/deploy-staging.yml'), 'utf8');
const KOODI = S.split('\n').filter((l) => !/^\s*#/.test(l)).join('\n');

describe('deploy-staging.yml', () => {
  it('käynnistyy vain käsin: workflow_dispatch, ei push/pull_request/schedule', () => {
    expect(KOODI).toMatch(/^on:\n  workflow_dispatch:/m);
    expect(KOODI).not.toMatch(/^  (push|pull_request|schedule|workflow_run):/m);
  });
  it('kohde lukittu: STAGING_PROJEKTI = talentmaster-staging; ei viittausta tuotantoprojektiin', () => {
    expect(KOODI).toContain('STAGING_PROJEKTI: talentmaster-staging');
    expect(S).not.toContain('talentmaster-pilot');
    expect(KOODI).toContain('test "$STAGING_PROJEKTI" = "talentmaster-staging"');
    expect(KOODI).toContain('test "$p" = "talentmaster-staging"');
  });
  it('jokainen --project-argumentti on $STAGING_PROJEKTI (ei kovakoodattua projektia)', () => {
    const projektit = KOODI.match(/--project\s+\S+/g) || [];
    expect(projektit.length).toBeGreaterThanOrEqual(5);
    projektit.forEach((p) => expect(p, p).toMatch(/--project\s+"\$STAGING_PROJEKTI"/));
    expect(KOODI).not.toMatch(/firebase (deploy|hosting:channel:deploy)(?![^\n]*--project)/);
  });
  it('tunnistautuminen vain WIF:llä staging-muuttujista; ei tuotannon secretejä eikä avaimia', () => {
    expect(KOODI).toContain('workload_identity_provider: ${{ vars.STAGING_WIF_PROVIDER }}');
    expect(KOODI).toContain('service_account: ${{ vars.STAGING_DEPLOY_SA }}');
    expect(KOODI).toContain('id-token: write');
    expect(KOODI).not.toMatch(/credentials_json|FIREBASE_SA_KEY|FIREBASE_SERVICE_ACCOUNT|secrets\./);
    expect(KOODI).toContain('environment: staging');
  });
  it('konfiguraatio korvataan ennen versiotiivisteitä ja hosting-deployta; Sentry pois kuuluu korvaukseen', () => {
    const i = (t) => KOODI.indexOf(t);
    expect(i('node scripts/staging_konfiguraatio.js')).toBeGreaterThan(-1);
    expect(i('node scripts/staging_konfiguraatio.js')).toBeLessThan(i('node scripts/versiotiiviste.js --kirjoita'));
    expect(i('node scripts/versiotiiviste.js --kirjoita')).toBeLessThan(i('firebase deploy --only hosting'));
    ['STAGING_API_KEY', 'STAGING_APP_ID', 'STAGING_SENDER_ID', 'STAGING_APPCHECK_SITE_KEY'].forEach((k) => expect(KOODI).toContain(k + ': ${{ vars.' + k + ' }}'));
    const korvaus = readFileSync(join(ROOT, 'scripts/staging_konfiguraatio.js'), 'utf8');
    expect(korvaus).toContain('SENTRY_POIS');
  });
  it('functions: testit ennen deployta; ajastukset pauselle deployn jälkeen; rules ennen functionsia (indeksit ensin)', () => {
    const i = (t) => KOODI.indexOf(t);
    expect(i('npm test')).toBeLessThan(i('firebase deploy --only functions'));
    expect(i('firebase deploy --only functions')).toBeLessThan(i('gcloud scheduler jobs pause'));
    expect(i('firestore:rules,firestore:indexes,storage')).toBeLessThan(i('firebase deploy --only functions'));
    expect(KOODI).toContain("TM_BASE_URL=https://%s.web.app");
  });
  it('kanava kuorma → esikatselukanava `kuorma` (debug-token toimii vain *--*.web.app, P4)', () => {
    expect(KOODI).toContain('firebase hosting:channel:deploy kuorma');
  });
  it('.firebaserc: default pysyy tuotannossa, staging-alias lisätty', () => {
    const rc = JSON.parse(readFileSync(join(ROOT, '.firebaserc'), 'utf8'));
    expect(rc.projects.default).toBe('talentmaster-pilot');
    expect(rc.projects.staging).toBe('talentmaster-staging');
  });
  it('tuotannon deploy-workflowt ennallaan viittaavat edelleen vain tuotantoon (ei staging-vuotoa)', () => {
    ['deploy-hosting.yml', 'deploy-functions.yml', 'deploy-rules.yml'].forEach((f) => expect(readFileSync(join(ROOT, '.github/workflows', f), 'utf8'), f).not.toContain('talentmaster-staging'));
  });
});
