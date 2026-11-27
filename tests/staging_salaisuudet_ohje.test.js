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

/** Vale-gcloud: versions describe → olemassa/puuttuu; get-iam-policy → JSON, jossa ajotilillä on secretAccessor (paitsi ilmanOikeutta-listan salaisuuksilla). */
const POLKU_OK = (proj) => JSON.stringify({ bindings: [{ role: 'roles/secretmanager.secretAccessor', members: ['serviceAccount:' + proj + '@appspot.gserviceaccount.com'] }] });
function vale(proj, o) {
  const x = o || {}, kutsut = [];
  const aja = (a) => {
    kutsut.push(a); const nimi = (a.find((t) => t.indexOf('--secret=') === 0) || '').slice(9) || a[2];
    if (a[1] === 'versions') return (x.puuttuu || []).indexOf(nimi) >= 0 ? { status: 1, stdout: '', stderr: 'ERROR: NOT_FOUND: Secret [x] not found or has no versions.' } : { status: 0, stdout: 'v1', stderr: '' };
    if ((x.iamVirhe || []).indexOf(nimi) >= 0) return { status: 1, stdout: '', stderr: 'ERROR: PERMISSION_DENIED: getIamPolicy' };
    if ((x.ilmanOikeutta || []).indexOf(nimi) >= 0) return { status: 0, stdout: JSON.stringify({ bindings: [{ role: 'roles/secretmanager.secretAccessor', members: ['serviceAccount:muu@appspot.gserviceaccount.com'] }, { role: 'roles/secretmanager.viewer', members: ['serviceAccount:' + proj + '@appspot.gserviceaccount.com'] }] }), stderr: '' };
    return { status: 0, stdout: POLKU_OK(proj), stderr: '' };
  };
  return { aja, kutsut };
}
const ok = (proj) => vale(proj).aja;

describe('esitarkistus: tarkista() — salaisuus + secretAccessor', () => {
  it('kaikki kunnossa → ok; kutsut: versions describe latest + get-iam-policy kohdeprojektissa', () => {
    const v = vale('proj-x'); const r = T.tarkista(['A', 'B'], 'proj-x', v.aja);
    expect(r.ok).toBe(true); expect(v.kutsut[0]).toEqual(['secrets', 'versions', 'describe', 'latest', '--secret=A', '--project=proj-x', '--format=value(name)']);
    expect(v.kutsut[1]).toEqual(['secrets', 'get-iam-policy', 'A', '--project=proj-x', '--format=json']);
  });
  it('puuttuva salaisuus → viesti sisältää luonti- JA oikeuskomennon yhdessä; get-iam-policyä ei kutsuta puuttuvalle', () => {
    const v = vale('talentmaster-pilot', { puuttuu: ['VALVONTA_VASTAANOTTAJA'] }); const r = T.tarkista(['A', 'VALVONTA_VASTAANOTTAJA'], 'talentmaster-pilot', v.aja);
    expect(r.ok).toBe(false); expect(r.puuttuu).toEqual(['VALVONTA_VASTAANOTTAJA']); expect(r.ilmanOikeutta).toEqual([]);
    expect(r.viesti).toContain('gcloud secrets create VALVONTA_VASTAANOTTAJA --project=talentmaster-pilot'); expect(r.viesti).toContain('read -s');
    expect(r.viesti).toContain('gcloud secrets add-iam-policy-binding VALVONTA_VASTAANOTTAJA --project=talentmaster-pilot --member=serviceAccount:talentmaster-pilot@appspot.gserviceaccount.com --role=roles/secretmanager.secretAccessor');
    expect(v.kutsut.filter((k) => k[1] === 'get-iam-policy').map((k) => k[2])).toEqual(['A']);
  });
  it('salaisuus olemassa mutta ajotililtä puuttuu secretAccessor (toisella tilillä/toisella roolilla ei kelpaa) → EI OIKEUTTA + oikeuskomento; luontikomentoa ei', () => {
    const r = T.tarkista(['A', 'B'], 'talentmaster-pilot', vale('talentmaster-pilot', { ilmanOikeutta: ['B'] }).aja);
    expect(r.ok).toBe(false); expect(r.ilmanOikeutta).toEqual(['B']); expect(r.puuttuu).toEqual([]);
    expect(r.viesti).toContain('EI OIKEUTTA: ajotilillä talentmaster-pilot@appspot.gserviceaccount.com'); expect(r.viesti).toContain('gcloud secrets add-iam-policy-binding B --project=talentmaster-pilot --member=serviceAccount:talentmaster-pilot@appspot.gserviceaccount.com --role=roles/secretmanager.secretAccessor');
    expect(r.viesti).toContain('setIamPolicy 403'); expect(r.viesti).not.toContain('gcloud secrets create'); expect(r.viesti).not.toMatch(/salaisuuteen A\b/);
  });
  it('kaikki puutteet kerralla (ei pysähdy ensimmäiseen)', () => {
    const r = T.tarkista(['A', 'B', 'C'], 'p-abcde', vale('p-abcde', { puuttuu: ['A'], ilmanOikeutta: ['B'], iamVirhe: ['C'] }).aja);
    expect(r.puuttuu).toEqual(['A']); expect(r.ilmanOikeutta).toEqual(['B']); expect(r.virheet.map((x) => x.nimi)).toEqual(['C']);
  });
  it('lukuoikeusvirhe (versions tai get-iam-policy) erotetaan puuttumisesta; CI:lle ei ehdoteta kirjoitusoikeutta', () => {
    const r = T.tarkista(['A'], 'p-abcde', () => ({ status: 1, stdout: '', stderr: 'ERROR: PERMISSION_DENIED: Permission denied' }));
    expect(r.ok).toBe(false); expect(r.puuttuu).toEqual([]); expect(r.viesti).toContain('TARKISTUS EPÄONNISTUI: A'); expect(r.viesti).toContain('getIamPolicy'); expect(r.viesti).not.toContain('setIamPolicy 403');
    const i = T.tarkista(['A'], 'p-abcde', vale('p-abcde', { iamVirhe: ['A'] }).aja); expect(i.virheet[0].syy).toContain('get-iam-policy');
  });
  it('onAccessor: oikea rooli + oikea ajotili vaaditaan; roskaa → null', () => {
    expect(T.onAccessor(POLKU_OK('p'), 'p')).toBe(true); expect(T.onAccessor(POLKU_OK('p'), 'q')).toBe(false); expect(T.onAccessor('{}', 'p')).toBe(false); expect(T.onAccessor('ei json', 'p')).toBeNull();
    expect(T.onAccessor(JSON.stringify({ bindings: [{ role: 'roles/secretmanager.viewer', members: ['serviceAccount:p@appspot.gserviceaccount.com'] }] }), 'p')).toBe(false);
  });
  it('main: puute → exit 1 + virhe stderriin (nimi + komennot); kaikki ok → 0; virheellinen projekti → 2; ei kirjoituskutsuja gcloudiin', () => {
    const virheet = [], lokit = []; const e = console.error, l = console.log; console.error = (m) => virheet.push(m); console.log = (m) => lokit.push(m);
    try {
      const v = vale('talentmaster-pilot', { ilmanOikeutta: ['SENDGRID_API_KEY'] });
      expect(T.main(['--projekti=talentmaster-pilot'], v.aja)).toBe(1);
      expect(virheet.join('\n')).toContain('SENDGRID_API_KEY'); expect(virheet.join('\n')).toContain('KESKEYTETTY'); expect(virheet.join('\n')).toContain('add-iam-policy-binding SENDGRID_API_KEY');
      expect(v.kutsut.every((k) => (k[1] === 'versions' && k[2] === 'describe') || k[1] === 'get-iam-policy')).toBe(true);   // vain lukukutsut
      expect(T.main(['--projekti=talentmaster-staging'], ok('talentmaster-staging'))).toBe(0); expect(lokit.join('\n')).toMatch(/^OK: \d+ salaisuutta .*secretAccessor/);
      expect(T.main(['--projekti=;rm -rf'], ok('x'))).toBe(2);
    } finally { console.error = e; console.log = l; }
  });
  it('skriptissä ei kirjoittavia gcloud-komentoja (CI ei saa lisäoikeuksia): komennot vain tulostetaan viestissä', () => {
    const src = readFileSync(join(ROOT, 'scripts/tarkista_salaisuudet.js'), 'utf8');
    const kutsut = src.match(/aja\(\[[^\]]*\]\)/g) || []; expect(kutsut.length).toBe(2); kutsut.forEach((k) => expect(k).toMatch(/'describe'|'get-iam-policy'/));
    expect(src).not.toMatch(/spawnSync\('gcloud', \[\s*'secrets', '(create|add-iam|versions', 'add)/);
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
  it('gcloud services enable jaettu: enintään 20 palvelua / komento, firebasestorage + cloudbilling (laskutustarkistus) mukana, ei kaksoiskappaleita', () => {
    expect(komennot.length).toBeGreaterThanOrEqual(2);
    const kaikki = []; komennot.forEach((k) => { const n = k.match(/[a-z]+\.googleapis\.com/g) || []; expect(n.length).toBeLessThanOrEqual(20); kaikki.push(...n); });
    expect(kaikki).toContain('firebasestorage.googleapis.com'); expect(kaikki).toContain('cloudbilling.googleapis.com'); expect(new Set(kaikki).size).toBe(kaikki.length);
  });
  it('WIF-ehto ${REPO}:environment:staging (aaltosulkeet, zsh), ei paljas $REPO:e', () => {
    expect(OHJE).toContain('repo:${REPO}:environment:staging'); expect(OHJE).not.toMatch(/\$REPO:[a-z]/);
  });
  it('dummy-salaisuuksille luodaan samalla secretAccessor-oikeus ajotilille (luonti + oikeus aina yhdessä)', () => {
    const lohko = OHJE.slice(OHJE.indexOf('for S in '), OHJE.indexOf('# --- Budjetti'));
    expect(lohko).toContain('gcloud secrets create'); expect(lohko).toMatch(/gcloud secrets add-iam-policy-binding \$S .*roles\/secretmanager\.secretAccessor/); expect(lohko).toContain('@appspot.gserviceaccount.com');
  });
  it('budjettikomento --billing-project=$PROJECT_ID', () => { expect(OHJE).toMatch(/gcloud billing budgets create --billing-project=\$PROJECT_ID/); });
  it('A4: Storage "Get started" tehdään loppuun Consolessa (rules-deploy muuten kaatuu)', () => {
    const a4 = OHJE.split('\n').find((r) => /^4\. \*\*Storage/.test(r)) || '';
    expect(a4).toMatch(/LOPPUUN Consolessa/); expect(a4).toContain('rules-deploy kaatuu');
  });
});

describe('docs/SECRET_MANAGER_MIGRAATIO.md: "Uusi salaisuus" -osio', () => {
  const D = lue('docs/SECRET_MANAGER_MIGRAATIO.md'), osio = D.slice(D.indexOf('## Uusi salaisuus'));
  it('osio on olemassa ja sisältää luonti- ja oikeuskomennon YHDESSÄ samassa koodilohkossa', () => {
    expect(D).toContain('## Uusi salaisuus'); const lohko = (osio.match(/```sh\n([\s\S]*?)```/) || [])[1] || '';
    expect(lohko).toContain('gcloud secrets create'); expect(lohko).toContain('gcloud secrets add-iam-policy-binding'); expect(lohko).toContain('roles/secretmanager.secretAccessor'); expect(lohko).toContain('@appspot.gserviceaccount.com');
  });
  it('osio kertoo miksi (CI ei saa asettaa oikeutta), esitarkistuksen ja että staging-ohjeen dummy-lista päivitetään', () => {
    expect(osio).toMatch(/setIamPolicy/); expect(osio).toContain('scripts/tarkista_salaisuudet.js'); expect(osio).toContain('docs/STAGING_ASENNUS.md');
  });
});
