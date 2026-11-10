/** Staging-asennusohje + salaisuuksien CI-esitarkistus: (1) koodin runWith({secrets}) -nimet = ohjeen dummy-lista; (2) esitarkistus (scripts/tarkista_salaisuudet.js) kaatuu selkeästi;
 *  (3) esitarkistus kytketty molempiin deploy-workfloweihin ENNEN functions-deployta; (4) ohjeen löydökset (services-erät ≤ 20, firebasestorage, ${REPO}, billing-project, Storage-Get started). */
import { describe, it, expect } from 'vitest';
import { createRequire } from 'module';
import { readFileSync, mkdtempSync, mkdirSync, writeFileSync } from 'fs';
import { tmpdir } from 'os';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';
const require = createRequire(import.meta.url);
const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..');
const T = require('../scripts/tarkista_salaisuudet.js');
const OHJE = readFileSync(join(ROOT, 'docs/STAGING_ASENNUS.md'), 'utf8');
const lue = (f) => readFileSync(join(ROOT, f), 'utf8');

/** Ohjeen dummy-lista: `for S in A B C; do` -rivi salaisuuksien luontilohkossa. */
function ohjeenSalaisuudet() {
  const m = OHJE.match(/for S in ([A-Z0-9_ ]+); do\n[\s\S]*?gcloud secrets create/);
  return m ? m[1].trim().split(/\s+/).sort() : [];
}

describe('koodin salaisuudet vs. STAGING_ASENNUS.md dummy-lista', () => {
  it('lukija löytää index.js:n salaisuudet (ei vacuous)', () => {
    const k = T.lueSalaisuudet(); expect(k).toContain('SENDGRID_API_KEY'); expect(k).toContain('VALVONTA_VASTAANOTTAJA'); expect(k.length).toBeGreaterThanOrEqual(5);
  });
  it('jokainen koodin runWith({secrets})-salaisuus on ohjeen dummy-listassa, eikä ohjeessa ole ylimääräisiä', () => {
    const koodi = T.lueSalaisuudet(), ohje = ohjeenSalaisuudet();
    expect(ohje.length, 'dummy-listaa ei löytynyt ohjeesta').toBeGreaterThan(0);
    expect(koodi.filter((x) => ohje.indexOf(x) < 0), 'koodissa mutta EI ohjeen dummy-listassa (lisää docs/STAGING_ASENNUS.md B: for S in …)').toEqual([]);
    expect(ohje.filter((x) => koodi.indexOf(x) < 0), 'ohjeessa mutta ei koodissa').toEqual([]);
  });
  it('lukija: kommentissa oleva secrets-lista ei lasketa; useita listoja ja lainausmerkkejä', () => {
    const d = mkdtempSync(join(tmpdir(), 'sal-')); mkdirSync(join(d, 'functions'));
    writeFileSync(join(d, 'functions', 'a.js'), "// runWith({ secrets: ['KOMMENTTI'] })\n/* secrets: ['TOINEN'] */\nx.runWith({ secrets: ['A_KEY', \"B_KEY\"], timeoutSeconds: 3 })\ny({\n secrets: ['C_KEY'] })\n");
    expect(T.lueSalaisuudet(d)).toEqual(['A_KEY', 'B_KEY', 'C_KEY']);
  });
});

describe('esitarkistus: tarkista()', () => {
  const ok = () => ({ status: 0, stderr: '' });
  it('kaikki olemassa → ok, kutsu = versions describe latest kohdeprojektissa', () => {
    const kutsut = []; const r = T.tarkista(['A', 'B'], 'proj-x', (a) => { kutsut.push(a); return ok(); });
    expect(r.ok).toBe(true); expect(kutsut[0]).toEqual(['secrets', 'versions', 'describe', 'latest', '--secret=A', '--project=proj-x', '--format=value(name)']);
  });
  it('puuttuva → viesti nimi + projekti + gcloud-luontikomento; muut eivät', () => {
    const r = T.tarkista(['A', 'VALVONTA_VASTAANOTTAJA'], 'talentmaster-pilot', (a) => (a[4] === '--secret=VALVONTA_VASTAANOTTAJA' ? { status: 1, stderr: 'ERROR: NOT_FOUND: Secret [x] not found or has no versions.' } : ok()));
    expect(r.ok).toBe(false); expect(r.puuttuu).toEqual(['VALVONTA_VASTAANOTTAJA']);
    expect(r.viesti).toContain('PUUTTUU: salaisuus VALVONTA_VASTAANOTTAJA'); expect(r.viesti).toContain('gcloud secrets create VALVONTA_VASTAANOTTAJA --project=talentmaster-pilot'); expect(r.viesti).toContain('read -s');
    expect(r.viesti).not.toMatch(/PUUTTUU: salaisuus A\b/);
  });
  it('muu virhe (oikeus) erotetaan puuttumisesta', () => {
    const r = T.tarkista(['A'], 'p-abcde', () => ({ status: 1, stderr: 'ERROR: PERMISSION_DENIED: Permission denied' }));
    expect(r.ok).toBe(false); expect(r.puuttuu).toEqual([]); expect(r.viesti).toContain('TARKISTUS EPÄONNISTUI: A'); expect(r.viesti).toContain('secretmanager.versions.get');
  });
  it('main: puuttuva salaisuus → exit 1 + virhe stderriin nimen kanssa; kaikki ok → 0; virheellinen projekti → 2', () => {
    const virheet = [], lokit = []; const e = console.error, l = console.log; console.error = (m) => virheet.push(m); console.log = (m) => lokit.push(m);
    try {
      expect(T.main(['--projekti=talentmaster-pilot'], (a) => (a[4] === '--secret=SENDGRID_API_KEY' ? { status: 1, stderr: 'NOT_FOUND' } : ok()))).toBe(1);
      expect(virheet.join('\n')).toContain('SENDGRID_API_KEY'); expect(virheet.join('\n')).toContain('KESKEYTETTY');
      expect(T.main(['--projekti=talentmaster-staging'], ok)).toBe(0); expect(lokit.join('\n')).toMatch(/^OK: \d+ salaisuutta/);
      expect(T.main(['--projekti=;rm -rf'], ok)).toBe(2);
    } finally { console.error = e; console.log = l; }
  });
});

describe('esitarkistus kytketty workfloweihin ennen functions-deployta', () => {
  it('deploy-functions.yml: tarkistus kohdeprojektille ennen "firebase deploy --only functions"', () => {
    const y = lue('.github/workflows/deploy-functions.yml'), a = y.indexOf('node scripts/tarkista_salaisuudet.js --projekti=talentmaster-pilot'), d = y.lastIndexOf('firebase deploy --only functions');
    expect(a).toBeGreaterThan(-1); expect(a).toBeLessThan(d); expect(y.indexOf('google-github-actions/auth')).toBeLessThan(a);
  });
  it('deploy-staging.yml: tarkistus ($STAGING_PROJEKTI, vain kun functions) ennen functions-deployta ja autentikoinnin jälkeen', () => {
    const y = lue('.github/workflows/deploy-staging.yml'), a = y.indexOf('node scripts/tarkista_salaisuudet.js --projekti="$STAGING_PROJEKTI"'), d = y.lastIndexOf('firebase deploy --only functions');
    expect(a).toBeGreaterThan(-1); expect(a).toBeLessThan(d); expect(y.indexOf('google-github-actions/auth')).toBeLessThan(a);
    expect(y.slice(y.lastIndexOf('- name:', a), a)).toContain('if: ${{ inputs.functions }}');
  });
});

describe('STAGING_ASENNUS.md B/A: staging-asennuksen löydökset', () => {
  const komennot = OHJE.split('\n').reduce((acc, rivi, i, rs) => { if (/^gcloud services enable/.test(rivi)) { let k = rivi; let j = i; while (/\\$/.test(rs[j])) { j++; k += ' ' + rs[j]; } acc.push(k); } return acc; }, []);
  it('gcloud services enable jaettu: enintään 20 palvelua / komento, firebasestorage mukana, ei kaksoiskappaleita', () => {
    expect(komennot.length).toBeGreaterThanOrEqual(2);
    const kaikki = []; komennot.forEach((k) => { const n = k.match(/[a-z]+\.googleapis\.com/g) || []; expect(n.length).toBeLessThanOrEqual(20); kaikki.push(...n); });
    expect(kaikki).toContain('firebasestorage.googleapis.com'); expect(new Set(kaikki).size).toBe(kaikki.length);
  });
  it('WIF-ehto ${REPO}:environment:staging (aaltosulkeet, zsh), ei paljas $REPO:e', () => {
    expect(OHJE).toContain('repo:${REPO}:environment:staging'); expect(OHJE).not.toMatch(/\$REPO:[a-z]/);
  });
  it('budjettikomento --billing-project=$PROJECT_ID', () => { expect(OHJE).toMatch(/gcloud billing budgets create --billing-project=\$PROJECT_ID/); });
  it('A4: Storage "Get started" tehdään loppuun Consolessa (rules-deploy muuten kaatuu)', () => {
    const a4 = OHJE.split('\n').find((r) => /^4\. \*\*Storage/.test(r)) || '';
    expect(a4).toMatch(/LOPPUUN Consolessa/); expect(a4).toContain('rules-deploy kaatuu');
  });
});
