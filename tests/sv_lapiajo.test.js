/**
 * sv-läpiajo (docs/CODE_BRIEF_I18N_SV_LAPIAJO.md; Kaista: Tero): tunnistin (puhdas) + läpiajo fixtuurisivulla (selain, vain TM_CHROME_TESTS=1 ja TM_CHROME_PATH tai Playwrightin Chromium).
 * Fixtuuri: tunnettu kovakoodattu fi löytyy; sallittu nimi, ruotsi ja piilotettu teksti eivät aiheuta osumaa.
 */
import { describe, it, expect } from 'vitest';
import { spawnSync } from 'child_process';
import { readFileSync, mkdtempSync, existsSync } from 'fs';
import { tmpdir } from 'os';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';
import { onkoSuomea } from '../tools/i18n/sv_lapiajo_fi.mjs';
const juuri = join(dirname(fileURLToPath(import.meta.url)), '..');

describe('suomen tunnistin', () => {
  it('suomi osuu (lyhyet, yhdyssanat, lauseet)', () => {
    for (const s of ['Aloita jakso', 'Tallenna muutokset', 'Kotiharjoitteet', 'Pikakirjaus', 'Taidot & keho', 'Anna pelaajan valita seuraava reitti', 'Harjoitus – nopeus klo 17', 'Näytä kaikki', 'Hae pelaajaa']) expect(onkoSuomea(s).fi, s).toBe(true);
  });
  it('ruotsi ei osu (myös yleiset ä/ö-sanat ja jaetut sanat)', () => {
    for (const s of ['Ingen behörighet', 'Tillbaka till listan', 'Välj spelare', 'Låt spelaren välja', 'Spelare under bronsnivå', 'Visa alla', 'Inställningar', 'Idag', 'Kärnstyrka', 'Lätt granskning', 'Spara ändringar', 'Välkommen tillbaka', 'Ja', 'On: 0 registreringar']) expect(onkoSuomea(s).fi, s).toBe(false);
  });
  it('lyhyt/kirjaimeton ei osu', () => { for (const s of ['OK', '→', '12:30', '']) expect(onkoSuomea(s).fi, s).toBe(false); });
});

const AJA = process.env.TM_CHROME_TESTS === '1';
describe.skipIf(!AJA)('läpiajo fixtuurisivulla (selain)', () => {
  it('kovakoodattu fi löytyy (teksti, placeholder, title); sv, sallittu nimi ja piilotettu eivät', () => {
    const ulos = join(mkdtempSync(join(tmpdir(), 'svlp-')), 'tulos.json');
    const r = spawnSync('node', ['tools/i18n/sv_lapiajo.mjs', '--fixtuuri=tests/fixtures/sv_lapiajo_fixtuuri.html', '--ulos=' + ulos], { cwd: juuri, encoding: 'utf8', timeout: 90000 });
    expect(r.status, r.stderr).toBe(0); expect(existsSync(ulos)).toBe(true);
    const rivit = JSON.parse(readFileSync(ulos, 'utf8')).nakymat['fixtuuri/sivu'].fi;
    const tekstit = rivit.map((x) => x.teksti);
    expect(tekstit).toContain('Tallenna muutokset'); expect(tekstit).toContain('Hae pelaajaa'); expect(tekstit).toContain('Avaa valmentajan asetukset');
    expect(rivit.find((x) => x.teksti === 'Hae pelaajaa').tyyppi).toBe('placeholder'); expect(rivit.find((x) => x.teksti === 'Avaa valmentajan asetukset').tyyppi).toBe('title');
    for (const ei of ['Välkommen tillbaka', 'Spara ändringar', 'Aleksi Mäkinen', 'TalentMaster™', 'Tämä teksti on piilotettu']) expect(tekstit, ei).not.toContain(ei);
  });
});
