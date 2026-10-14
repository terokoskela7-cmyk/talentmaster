/* Kasvupyrähdys-fysiikan ehdotuslista (docs/design/idp-v2/42_…md): generoitu lähdeaineistosta, EI valitse mitään; Tero hyväksyy ennen kuin mitään valitaan automaattisesti. */
import { describe, it, expect } from 'vitest';
import { readFileSync, existsSync } from 'fs';
import { execFileSync } from 'child_process';
const lue = (f) => readFileSync(new URL('../' + f, import.meta.url), 'utf8');
describe('42 · kasvupyrähdys-fysiikka: ehdotuslista', () => {
  const md = lue('docs/design/idp-v2/42_kasvupyrahdys_fysiikka_ehdotuslista.md');
  it('dokumentti on ajan tasalla: sama kuin skriptin tuloste (lähdeaineiston muutos vaatii uudelleengeneroinnin)', () => { const uusi = execFileSync('node', ['scripts/phv_fysiikka_ehdotuslista.cjs', '--stdout'], { cwd: new URL('..', import.meta.url).pathname, encoding: 'utf8' }); expect(md).toBe(uusi); });
  it('sisältää kaikki kolme lähdettä (harjoitelogiikka D+S, pre-harkka, HPP), yhteenvedon, Teron päätössarakkeen ja varoituksen ettei lista valitse mitään', () => {
    expect(md).toContain('**Tämä lista ei valitse mitään.**'); ['## harjoitelogiikka D (12)', '## harjoitelogiikka S', '## pre-harkka (tm-prescription)', '## HPP-pankki (kuntoutus)', '| Tero: ennen / nyt / jälkeen |'].forEach((x) => expect(md, x).toContain(x));
    expect((md.match(/^\| (D|S)\./gm) || []).length).toBeGreaterThanOrEqual(12); expect(md).toMatch(/\| \*\*Yhteensä\*\* \| \*\*\d+\*\* \|/);
  });
  it('HPP-rivit: phv_ok=false → ei ehdoteta; ei yhtään rivin "ehdotus" -arvoa harjoitteelle jolla ei ole PHV-ohjetta; Tero-sarake tyhjä (päätös ei ole koneen)', () => {
    const hpp = md.slice(md.indexOf('## HPP-pankki')).split('\n').filter((l) => l.startsWith('| ') && !/^\| (id|---)/.test(l)); expect(hpp.length).toBeGreaterThan(0);
    hpp.forEach((l) => { if (/phv_ok: false/.test(l)) expect(l).toContain('ei ehdoteta (phv_ok=false)'); expect(l).not.toMatch(/ehdotus: sellaisenaan/); });
    md.split('\n').filter((l) => /^\| (D|S)\.|^\| [A-Z]+\.(aktivointi|S\d)/.test(l)).forEach((l) => { const c = l.split(' | '); expect(c[c.length - 1].replace(/[| ]/g, ''), l.slice(0, 40)).toBe(''); });
  });
  it.skipIf(!existsSync(new URL('../lib/tm_kt_toimintakortti.js', import.meta.url)))('koodi ei valitse kasvupyrähdysharjoitetta automaattisesti: toimintakortin fysiikka lukee vain jakson snapshotin (ei PANKKI/HPP-viittauksia; vartija aktivoituu kun toimintakortti on mainissa)', () => { const lib = lue('lib/tm_kt_toimintakortti.js'); expect(lib).not.toMatch(/PANKKI|HPP_|hpp_rehab|valitsePaivanHarjoite|harjoitelogiikka_v4/); });
});
