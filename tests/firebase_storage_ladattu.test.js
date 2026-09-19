/**
 * ÄÄNTÄ LATAAVA APPI LATAA STORAGE-SDK:N — OMALLA SDK-VERSIOLLAAN.
 *
 * MIKSI: `lib/tm_aani.js` kutsuu `firebase.storage()`. Jos appi lataa nauhoittimen
 * muttei Storage-SDK:ta, `firebase.storage` on `undefined` ja lataus heittää
 * "firebase.storage is not a function" — VASTA kun käyttäjä painaa Tallenna.
 * Juuri näin kävi VP_v25:lle: nauhoitus, esikuuntelu ja litterointi toimivat,
 * vain tallennus kaatui. Mikään aiempi portti ei nähnyt sitä, koska ne
 * tarkistivat että appi lataa tm_aanin — eivät sitä mitä tm_aani itse tarvitsee.
 *
 * VERSIOPARITEETTI on osa invarianttia, ei tyyliseikka. Repossa on useita
 * compat-SDK-versioita rinnakkain (Master 9.22.1 · VP 10.7.1), ja CLAUDE.md §38
 * kieltää yhden version kovakoodaamisen appien yli: sekaversio (10.x app +
 * 9.x storage) on juuri se vika jota ei huomaa ennen ajoa. Siksi portti vaatii
 * että storage-compat on SAMASSA versiossa kuin kyseisen apin app-compat.
 */
import { describe, it, expect } from 'vitest';
import { execSync } from 'child_process';
import { readFileSync } from 'fs';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

const juuri = join(dirname(fileURLToPath(import.meta.url)), '..');
const lue = (p) => readFileSync(join(juuri, p), 'utf8');

const NAUHOITIN = 'lib/tm_aani.js';

/** Git-seuratut juuren appit. */
function appit() {
  return execSync("git ls-files '*.html'", { cwd: juuri, encoding: 'utf8' })
    .split('\n').map((s) => s.trim()).filter(Boolean)
    .filter((f) => !f.includes('/'));
}

/** Appit jotka lataavat nauhoittimen → ne lataavat ääntä Storageen. */
function aaniApit() {
  return appit().filter((f) => {
    let s = '';
    try { s = lue(f); } catch (e) { return false; }
    return /<script src="lib\/tm_aani\.js/.test(s);
  });
}

const sdkVersio = (s, moduuli) => {
  const m = new RegExp('firebasejs/([0-9][0-9.]*)/firebase-' + moduuli + '-compat\\.js').exec(s);
  return m ? m[1] : null;
};

describe('Storage-SDK · ääntä lataava appi lataa sen', () => {
  it('EI VACUOUS: nauhoitin kutsuu firebase.storage():a ja appeja löytyy', () => {
    /* Jos nauhoitin lakkaa käyttämästä Storagea, tämä portti vartioi ongelmaa
       jota ei enää ole — ja jos appilista on tyhjä, se ei vartioi mitään. */
    expect(lue(NAUHOITIN), 'nauhoitin ei kutsu firebase.storage():a').toContain('firebase.storage()');
    const a = aaniApit();
    expect(a, 'ääntä lataavia appeja pitää olla').toContain('TalentMaster_Master_v16.html');
    expect(a, 'ääntä lataavia appeja pitää olla').toContain('TalentMaster_VP_v25.html');
  });

  it('jokainen nauhoittimen lataava appi lataa myös firebase-storage-compat', () => {
    const puuttuu = aaniApit().filter((f) => !/firebase-storage-compat\.js/.test(lue(f)));
    expect(
      puuttuu,
      'nämä lataavat tm_aanin muttei Storage-SDK:ta → "firebase.storage is not a function" '
        + 'vasta tallennushetkellä:\n' + puuttuu.join('\n'),
    ).toEqual([]);
  });

  it('storage-compat on SAMASSA SDK-versiossa kuin apin app-compat (§38: ei sekaversiota)', () => {
    const virheet = [];
    for (const f of aaniApit()) {
      const s = lue(f);
      const app = sdkVersio(s, 'app');
      const storage = sdkVersio(s, 'storage');
      if (!app || !storage) { virheet.push(f + ': app=' + app + ' storage=' + storage); continue; }
      if (app !== storage) virheet.push(f + ': app-compat ' + app + ' ≠ storage-compat ' + storage);
    }
    expect(virheet, 'sekaversio — toimii CDN:stä mutta hajoaa arvaamattomasti:\n' + virheet.join('\n')).toEqual([]);
  });

  it('EI VACUOUS: versionpoimija toimii eikä palauta samaa kaikelle', () => {
    /* Jos sdkVersio osuisi väärin (tai aina samaan), yllä oleva pariteettiportti
       olisi tyhjä lupaus. Master ja VP ovat eri versioissa — se on tässä hyvä asia. */
    const mv = sdkVersio(lue('TalentMaster_Master_v16.html'), 'app');
    const vv = sdkVersio(lue('TalentMaster_VP_v25.html'), 'app');
    expect(mv, 'Masterin app-versio').toMatch(/^\d+\.\d+/);
    expect(vv, 'VP:n app-versio').toMatch(/^\d+\.\d+/);
    expect(mv, 'appit ovat tarkoituksella eri SDK-versioissa (§38)').not.toBe(vv);
  });
});
