/* QG-3 · savutesti.yml -vartija: laukaisimet (Hosting-deployn jälkeen + käsin, EI ajastusta), minimioikeudet, secretit vain env:nä
   (ei tulostusta, ei komentoriville), kanavan URL artefaktista, tulos talteen, yksi issue (päivitetään, ei monisteta).
   Lisäksi ajo-skriptin turvasäännöt: ::add-mask:: secreteille CI:ssä, PIN sivulle vain argumenttina, SW estetty (SW:n pyynnöt ohittaisivat verkkoeston). */
import { describe, it, expect } from 'vitest';
import { readFileSync } from 'fs';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

const JUURI = join(dirname(fileURLToPath(import.meta.url)), '..');
const RAAKA = readFileSync(join(JUURI, '.github/workflows/savutesti.yml'), 'utf8');
const WF = RAAKA.split('\n').filter((r) => !/^\s*#/.test(r)).join('\n');   // väitteet askeliin, ei kommentteihin
const SKRIPTI = readFileSync(join(JUURI, 'tools/savutesti/savutesti.mjs'), 'utf8');
const LIB = readFileSync(join(JUURI, 'tools/savutesti/savutesti_lib.mjs'), 'utf8');
const SECRETIT = ['TM_SAVU_EMAIL', 'TM_SAVU_SALASANA', 'TM_SAVU_PELAAJA_TUNNISTE', 'TM_SAVU_PELAAJA_PIN', 'TM_SAVU_APPCHECK_DEBUG'];

describe('QG-3 · savutesti.yml', () => {
  it('laukaisimet: Hosting-deployn valmistuminen + workflow_dispatch; EI schedulea eikä pushia/PR:ää', () => {
    expect(WF).toMatch(/workflow_run:\s*\n\s*workflows: \["Deploy to Firebase Hosting"\]\s*\n\s*types: \[completed\]/);
    expect(WF).toContain('workflow_dispatch:');
    expect(WF).not.toMatch(/^\s*schedule:/m);
    expect(WF).not.toMatch(/^\s*(push|pull_request|pull_request_target):/m);
    expect(readFileSync(join(JUURI, '.github/workflows/deploy-hosting.yml'), 'utf8')).toMatch(/^name: Deploy to Firebase Hosting$/m);
  });
  it('vain onnistunut main-deploy laukaisee automaattisesti', () => {
    expect(WF).toContain("github.event.workflow_run.conclusion == 'success'");
    expect(WF).toContain("github.event.workflow_run.head_branch == 'main'");
  });
  it('minimioikeudet: contents read, actions read (artefakti), issues write (ilmoitus) — ei muuta', () => {
    const m = WF.match(/^permissions:\n((?:\s{2}\S.*\n)+)/m);
    expect(m).toBeTruthy();
    const oik = m[1].trim().split('\n').map((r) => r.trim()).sort();
    expect(oik).toEqual(['actions: read', 'contents: read', 'issues: write']);
    expect(WF).not.toMatch(/write-all|contents: write|pull-requests: write/);
  });
  it('secretit vain env-muuttujina Savutesti-askeleessa; ei echo/run-riville, ei set -x', () => {
    for (const s of SECRETIT) {
      const viittaukset = WF.match(new RegExp('secrets\\.' + s + '\\b', 'g')) || [];
      expect(viittaukset.length, s).toBe(1);
      expect(WF, s).toMatch(new RegExp('^\\s+' + s + ': \\$\\{\\{ secrets\\.' + s + ' \\}\\}$', 'm'));
      expect(WF, s + ' run-rivillä').not.toMatch(new RegExp('(echo|printf|cat)[^\\n]*\\$\\{?' + s));
    }
    expect(WF).not.toMatch(/set -x|ACTIONS_STEP_DEBUG/);
    expect(WF).not.toContain('FIREBASE_SERVICE_ACCOUNT');   // savutesti ei tarvitse palvelutiliä: lukee artefaktin, ajaa selainta
  });
  it('kanavan URL artefaktista savutesti-kanava (url.txt) → syöte → vars.TM_SAVU_URL', () => {
    expect(WF).toContain('actions/download-artifact@v7');
    expect(WF).toContain('name: savutesti-kanava');
    expect(WF).toContain('run-id: ${{ github.event.workflow_run.id }}');
    expect(WF).toContain('kanava/url.txt');
    expect(WF).toContain('vars.TM_SAVU_URL');
    expect(WF).toContain('gh run download');
  });
  it('ajaa savutestin runnerin Chromella, tulos artefaktiksi, aikaraja', () => {
    expect(WF).toContain('node tools/savutesti/savutesti.mjs --tulos=savutesti-tulos/tulos.json --issue=savutesti-tulos/issue.md');
    expect(WF).toContain('TM_CHROME_PATH="$(which google-chrome)"');
    expect(WF).toMatch(/timeout-minutes: \d+/);
    expect(WF).toContain('actions/upload-artifact@v6');
  });
  it('issue: yksi auki oleva label savutesti — kommentoi olemassa olevaa, luo vain jos ei ole; vihreä sulkee', () => {
    expect(WF).toContain('gh issue list --label savutesti --state open');
    expect(WF).toMatch(/if \[ -n "\$NRO" \]; then gh issue comment "\$NRO"[^\n]*else gh issue create[^\n]*--label savutesti/);
    expect(WF).toContain('gh issue close "$NRO"');
    expect(WF).toContain("if: failure() && steps.savu.outcome == 'failure'");
  });
});

describe('QG-3 · savutesti.mjs turvasäännöt', () => {
  it('CI:ssä jokainen secret maskataan ennen ajoa', () => {
    expect(SKRIPTI).toMatch(/GITHUB_ACTIONS === 'true'\) for \(const s of SECRETIT\)[^\n]*::add-mask::/);
  });
  it('PIN ja salasana sivulle vain evaluate-argumenttina (ei merkkijonoon upotettuna)', () => {
    expect(SKRIPTI).toContain("p.evaluate((pin) => { _kirjaudu(pin); }, env.TM_SAVU_PELAAJA_PIN)");
    expect(SKRIPTI).toContain('{ e: env.TM_SAVU_EMAIL, s: env.TM_SAVU_SALASANA }');
    expect(SKRIPTI).not.toMatch(/console\.(log|error)\([^)]*TM_SAVU_(SALASANA|PELAAJA_PIN|APPCHECK_DEBUG)/);
    expect(SKRIPTI).not.toMatch(/`[^`]*\$\{env\.TM_SAVU_(SALASANA|PELAAJA_PIN|EMAIL|PELAAJA_TUNNISTE)\}/);
  });
  it('kirjoitusvartija ja verkkoesto ovat paikallaan; service workerit estetty', () => {
    expect(SKRIPTI).toContain("serviceWorkers: 'block'");
    expect(SKRIPTI).toContain('ctx.addInitScript(VARTIJA)');
    expect(SKRIPTI).toContain('ctx.route(REITITA_RE');
    expect(SKRIPTI).toContain('const VARTIJA = vartijaLahde(ESTO_VIESTI)');
    for (const m of ["DR[m] = function", 'CollectionReference.prototype.add', 'WB.commit', 'TR[m] = function']) expect(LIB).toContain(m);
  });
});
