/* Vartija: laiskoja kirjastoja koskevat Chrome-testit ajetaan myös DEPLOY-muodossa (tests/helpers/deploy_muoto.mjs; CI-työ chrome-laiska-deploy, .github/chrome_laiska_deploy.txt).
   Juurisyy 26.11.2026: repon inline-muoto näytti vihreää, vaikka deploy-muodossa (pääskripti tiedostona + defer) yksikään laiska portti ei asentunut. */
import { describe, it, expect } from 'vitest';
import { readFileSync, readdirSync, existsSync } from 'fs';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';
const JUURI = join(dirname(fileURLToPath(import.meta.url)), '..');
const LISTA = readFileSync(join(JUURI, '.github/chrome_laiska_deploy.txt'), 'utf8').split('\n').map((r) => r.trim()).filter(Boolean);
describe('laiskat selaintestit deploy-muodossa', () => {
  it('lista viittaa olemassa oleviin testeihin, jotka ovat myös pääkorissa (chrome_testit.txt)', () => {
    const kaikki = readFileSync(join(JUURI, '.github/chrome_testit.txt'), 'utf8').split('\n').map((r) => r.trim());
    expect(LISTA.filter((f) => !existsSync(join(JUURI, f)))).toEqual([]); expect(LISTA.filter((f) => !kaikki.includes(f))).toEqual([]);
  });
  it('jokainen Masterin laiskoja (tmLaiska / data-tm-laiska / data-portit) kuvaava selaintesti on deploy-listalla tai nimenomaisessa poikkeuslistassa', () => {
    const POIKKEUS = { 'tests/appcheck_laiska_selain.test.js': 'ei Master-sivu (App Check -latauksen laiskuus, oma kuori)', 'tests/l7_appcheck_kausi_selain.test.js': 'App Check -ajoitus; ei käytä laiskoja portteja' };
    const laiskat = readdirSync(join(JUURI, 'tests')).filter((f) => /selain\.test\.js$/.test(f)).map((f) => 'tests/' + f)
      .filter((f) => { const s = readFileSync(join(JUURI, f), 'utf8'); return /TalentMaster_Master_v16|kalenteri_sivu/.test(s) && /tmLaiska|laiska/i.test(s); });
    expect(laiskat.length).toBeGreaterThan(2);
    expect(laiskat.filter((f) => !LISTA.includes(f) && !POIKKEUS[f]), 'lisää .github/chrome_laiska_deploy.txt:hen (tai perusteltu poikkeus tähän)').toEqual([]);
  });
  it('test.yml ajaa listan TM_DEPLOY_MUOTO=1:llä ja chrome-tests odottaa sitä', () => {
    const yml = readFileSync(join(JUURI, '.github/workflows/test.yml'), 'utf8');
    expect(yml).toContain('chrome_laiska_deploy.txt'); expect(yml).toContain("TM_DEPLOY_MUOTO: '1'"); expect(yml).toMatch(/needs: \[chrome-osat, chrome-laiska-deploy\]/);
  });
  it('apuri tukee deploy-muotoa (sivu(…, {deploy}) ja TM_DEPLOY_MUOTO)', () => {
    const h = readFileSync(join(JUURI, 'tests/helpers/kalenteri_sivu.mjs'), 'utf8'); expect(h).toContain('opts.deploy'); expect(h).toContain('TM_DEPLOY_MUOTO');
  });
});
