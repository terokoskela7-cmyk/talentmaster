/**
 * Pages-deploy: build ja deploy omissa jobeissaan (artefakti-ei-löydy-kaatumisen korjaus) + turhat raskaat hakemistot pois artefaktista.
 * Lähde: deploy-pages.yml kaatui 5/7 ajosta ("No artifacts named github-pages") kun upload ja deploy-pages olivat samassa jobissa.
 */
import { describe, it, expect } from 'vitest';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';

const juuri = join(__dirname, '..');
const wf = readFileSync(join(juuri, '.github/workflows/deploy-pages.yml'), 'utf8');
const jobi = (nimi) => {
  const m = new RegExp('^  ' + nimi + ':\\n([\\s\\S]*?)(?=^  \\w[\\w-]*:\\n|(?![\\s\\S]))', 'm').exec(wf);
  return m ? m[1] : null;
};

describe('deploy-pages.yml · build + deploy erillisinä jobeina', () => {
  const build = jobi('build'), deploy = jobi('deploy');
  it('molemmat jobit olemassa', () => { expect(build).toBeTruthy(); expect(deploy).toBeTruthy(); });
  it('upload-pages-artifact vain build-jobissa, deploy-pages vain deploy-jobissa', () => {
    expect(build).toContain('actions/upload-pages-artifact@');
    expect(build).not.toContain('actions/deploy-pages');
    expect(deploy).toContain('actions/deploy-pages@');
    expect(deploy).not.toContain('upload-pages-artifact');
  });
  it('deploy needs: build ja environment github-pages', () => {
    expect(deploy).toMatch(/needs:\s*build/);
    expect(deploy).toMatch(/name:\s*github-pages/);
  });
  it('upload-pages-artifact ja deploy-pages samassa major-versiossa (v5 + v5)', () => {
    const up = /upload-pages-artifact@v(\d+)/.exec(wf)[1], dp = /deploy-pages@v(\d+)/.exec(wf)[1];
    expect(up).toBe(dp);
  });
  it('concurrency "pages" ja permissions säilyvät', () => {
    expect(wf).toMatch(/group:\s*"pages"/);
    expect(wf).toMatch(/pages:\s*write/); expect(wf).toMatch(/id-token:\s*write/);
  });
  it('docs/design/ ja docs/data/ rajataan pois ja ovat jo Hostingin ignoressa (sovellus ei lataa niitä)', () => {
    expect(build).toMatch(/rm -rf archive docs\/ui-kuvat docs\/design docs\/data/);
    const ign = JSON.parse(readFileSync(join(juuri, 'firebase.json'), 'utf8')).hosting.ignore;
    expect(ign).toContain('docs/design/**'); expect(ign).toContain('docs/data/**');
  });
});
