/** Projekti 06 PR 1 (P2/P5): scripts/staging_konfiguraatio.js — syötevartijat, korvaus, "ei tuotannon arvoja jäljelle" ja oikea repo tmp-kopiona. */
import { describe, it, expect } from 'vitest';
import { createRequire } from 'module';
import { mkdtempSync, mkdirSync, writeFileSync, readFileSync, rmSync, cpSync, existsSync } from 'fs';
import { tmpdir } from 'os';
import { execFileSync } from 'child_process';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';
const require = createRequire(import.meta.url);
const M = require('../scripts/staging_konfiguraatio.js');
const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..');

const OK = { projekti: 'talentmaster-staging', apiKey: 'AIzaSyA1234567890123456789012345678901Z', appId: '1:123456789012:web:abcdef0123456789', senderId: '123456789012', siteKey: '6LfSTAGINGSTAGINGSTAGINGSTAGINGSTAGINGabc' };

describe('asetukset (vartijat)', () => {
  it('hyväksyy oikeat staging-arvot', () => { expect(M.asetukset(OK).projekti).toBe('talentmaster-staging'); });
  it('KAATUU jos projekti ei ole täsmälleen talentmaster-staging: tuotanto, tyhjä, variantit', () => {
    ['talentmaster-pilot', '', undefined, 'Talentmaster-Staging', 'talentmaster-staging2', 'talentmaster-staging-x', 'demo-kuorma'].forEach((p) => {
      expect(() => M.asetukset(Object.assign({}, OK, { projekti: p })), String(p)).toThrow(/STAGING_PROJEKTI/);
    });
    expect(M.asetukset(Object.assign({}, OK, { projekti: ' talentmaster-staging ' })).projekti).toBe('talentmaster-staging');   // trimmaus
  });
  it('kaatuu väärän muotoisiin tai puuttuviin syötteisiin ja tuotannon arvoihin', () => {
    ['apiKey', 'appId', 'senderId', 'siteKey'].forEach((k) => { expect(() => M.asetukset(Object.assign({}, OK, { [k]: '' })), k).toThrow(); expect(() => M.asetukset(Object.assign({}, OK, { [k]: 'x' })), k).toThrow(); });
    expect(() => M.asetukset(Object.assign({}, OK, { apiKey: M.PROD.apiKey }))).toThrow(/tuotannon/);
    expect(() => M.asetukset(Object.assign({}, OK, { siteKey: M.PROD.siteKey }))).toThrow(/tuotannon/);
    expect(() => M.asetukset(Object.assign({}, OK, { senderId: '999999999999' }))).toThrow(/eivät täsmää/);
  });
});

describe('korvaus', () => {
  it('appId korvataan kokonaisena ennen senderId:tä; projekti-id kaikissa muodoissa; DSN pois käytöstä', () => {
    const a = M.asetukset(OK), lista = M.korvaukset(a);
    const src = "appId:'" + M.PROD.appId + "', messagingSenderId:'" + M.PROD.senderId + "', authDomain:'talentmaster-pilot.firebaseapp.com', b:'talentmaster-pilot.firebasestorage.app', "
      + "k:'" + M.PROD.apiKey + "', s:'" + M.PROD.siteKey + "', d:'" + M.PROD.dsn + "'";
    const r = M.korvaaTeksti(src, lista);
    expect(r.teksti).toContain("appId:'" + OK.appId + "'");
    expect(r.teksti).toContain("messagingSenderId:'" + OK.senderId + "'");
    expect(r.teksti).toContain('talentmaster-staging.firebaseapp.com');
    expect(r.teksti).toContain('talentmaster-staging.firebasestorage.app');
    expect(r.teksti).toContain("d:'" + M.SENTRY_POIS + "'");
    expect(M.SENTRY_POIS.charAt(0)).toBe('<');   // tm_sentry.js GUARD: '<' → no-op
    expect(M.jaljella(r.teksti)).toEqual([]);
    expect(r.osumat).toBe(7);
  });
  it('jaljella nimeää kunkin tuotannon arvon ilman arvoa itseään', () => {
    expect(M.jaljella('x talentmaster-pilot y ' + M.PROD.dsn).sort()).toEqual(['dsn', 'projekti']);
    expect(M.jaljella('puhdas')).toEqual([]);
  });
  it('globRe: dir/**, **/*.md, **/.*, juuren *.config.js ei osu alikansioon', () => {
    expect(M.globRe('tests/**').test('tests/a/b.js')).toBe(true);
    expect(M.globRe('**/*.md').test('docs/x/y.md')).toBe(true);
    expect(M.globRe('**/*.md').test('x.md')).toBe(true);
    expect(M.globRe('**/.*').test('a/.hidden')).toBe(true);
    expect(M.globRe('*.config.js').test('vite.config.js')).toBe(true);
    expect(M.globRe('*.config.js').test('lib/vite.config.js')).toBe(false);
    expect(M.globRe('docs/**/*.html').test('docs/a/b.html')).toBe(true);
    expect(M.globRe('functions/**').test('functionsX/a.js')).toBe(false);
  });
});

describe('aja (fixtuuripuu)', () => {
  const rakenna = (tiedostot) => {
    const d = mkdtempSync(join(tmpdir(), 'stg-'));
    writeFileSync(join(d, 'firebase.json'), JSON.stringify({ hosting: { ignore: ['archive/**', 'tests/**', '**/*.md'] } }));
    Object.keys(tiedostot).forEach((p) => { mkdirSync(dirname(join(d, p)), { recursive: true }); writeFileSync(join(d, p), tiedostot[p]); });
    return d;
  };
  const prod = "projectId:'talentmaster-pilot'";
  const peruspuu = () => { const t = { 'config.js': prod, 'lib/tm_appcheck.js': "k='" + M.PROD.siteKey + "'", 'tm_sentry.js': "d='" + M.PROD.dsn + "'" }; for (let i = 0; i < 15; i++) t['S' + i + '.html'] = prod; return t; };
  it('korvaa julkaistavat, jättää ignoroidut (archive/tests/md) koskematta eikä valita niistä', () => {
    const t = peruspuu(); t['archive/vanha.html'] = prod; t['tests/x.js'] = prod; t['README.md'] = prod;
    const d = rakenna(t);
    const r = M.aja(d, M.asetukset(OK), false);
    expect(r.virheet).toEqual([]);
    expect(readFileSync(join(d, 'S0.html'), 'utf8')).toContain('talentmaster-staging');
    expect(readFileSync(join(d, 'archive/vanha.html'), 'utf8')).toBe(prod);
    expect(Object.keys(r.muutetut)).not.toContain('archive/vanha.html');
    rmSync(d, { recursive: true });
  });
  it('kuiva-ajo ei kirjoita', () => {
    const d = rakenna(peruspuu());
    M.aja(d, M.asetukset(OK), true);
    expect(readFileSync(join(d, 'config.js'), 'utf8')).toBe(prod);
    rmSync(d, { recursive: true });
  });
  it('KAATUU (virhe), jos avaintiedosto puuttuu tai sivuja korvautuu liian vähän — ei hiljaista ohitusta', () => {
    const t = peruspuu(); delete t['lib/tm_appcheck.js'];
    let d = rakenna(t);
    expect(M.aja(d, M.asetukset(OK), true).virheet.join('|')).toMatch(/tm_appcheck\.js: ei korvattu/);
    rmSync(d, { recursive: true });
    const t2 = peruspuu(); for (let i = 5; i < 15; i++) delete t2['S' + i + '.html'];
    d = rakenna(t2);
    expect(M.aja(d, M.asetukset(OK), true).virheet.join('|')).toMatch(/juuri-HTML-sivuja 5 < 15/);
    rmSync(d, { recursive: true });
  });
});

describe('oikea repo (tmp-kopio): julkaistava joukko puhdistuu', () => {
  it('kaikki julkaistavat tiedostot ilman tuotannon arvoja; avaintiedostot muuttuneet; Sentry pois; CLI exit 0 ja väärällä projektilla exit 1', () => {
    const d = mkdtempSync(join(tmpdir(), 'stg-repo-'));
    const tiedostot = execFileSync('git', ['ls-files'], { cwd: ROOT, encoding: 'utf8' }).split('\n').filter((p) => p && !/^(archive|tests|docs|functions|scripts|node_modules|\.github|\.briefit|\.claude)\//.test(p));
    tiedostot.forEach((p) => { if (!existsSync(join(ROOT, p))) return; mkdirSync(dirname(join(d, p)), { recursive: true }); cpSync(join(ROOT, p), join(d, p)); });
    const env = Object.assign({}, process.env, { STAGING_PROJEKTI: 'talentmaster-staging', STAGING_API_KEY: OK.apiKey, STAGING_APP_ID: OK.appId, STAGING_SENDER_ID: OK.senderId, STAGING_APPCHECK_SITE_KEY: OK.siteKey });
    const ulos = execFileSync('node', [join(ROOT, 'scripts/staging_konfiguraatio.js'), '--juuri=' + d], { env, encoding: 'utf8' });
    expect(ulos).toContain('OK: yhtään tuotannon arvoa ei jäänyt');
    expect(ulos).not.toContain(M.PROD.apiKey);
    expect(readFileSync(join(d, 'config.js'), 'utf8')).toContain("projectId:         'talentmaster-staging'");
    expect(readFileSync(join(d, 'tm_sentry.js'), 'utf8')).toContain("var TM_SENTRY_DSN = '" + M.SENTRY_POIS + "'");
    expect(readFileSync(join(d, 'lib/tm_appcheck.js'), 'utf8')).toContain(OK.siteKey);
    let koodi = 0;
    try { execFileSync('node', [join(ROOT, 'scripts/staging_konfiguraatio.js'), '--juuri=' + d, '--kuiva'], { env: Object.assign({}, env, { STAGING_PROJEKTI: 'talentmaster-pilot' }), stdio: 'pipe' }); } catch (e) { koodi = e.status; }
    expect(koodi).toBe(1);
    rmSync(d, { recursive: true, force: true });
  });
});
