/**
 * TARJOILTAVISSA TIEDOSTOISSA EI OLE MOJIBAKEA (double-encoding).
 *
 * MIKSI: `tm_dna_builder.html` oli kauttaaltaan double-encoding-korruptoitunut — 2182 C1-kontrolli-
 * merkkiä (U+0080–U+009F). Yksi korruptoitunut TUNNISTE (`SAKARA_VÄRIT` → `SAKARA_VÃ<U+0084>RIT`,
 * jossa U+0084 ei kelpaa JS-tunnisteeseen) kaatoi koko script-lohkon `SyntaxError`iin → sivun JS oli
 * täysin kuollut. Sivu oli silti tarjolla ja linkitetty (UTJ_v1, tm_dna_opas).
 *
 * C1-alue on tarkka sormenjälki: laillisessa UTF-8-tekstissä näitä ohjausmerkkejä ei esiinny. Ne
 * syntyvät kun UTF-8 luetaan latin-1:nä ja tallennetaan uudelleen UTF-8:na — sama vikaluokka josta
 * CLAUDE.md §7.1/§15 varoittavat (Python-generoinnin double-encoding).
 *
 * Portti kattaa kaikki versionhallitut juuren HTML:t + lib/-JS:n, ei vain tarjoiltavia: korruptio
 * kannattaa napata ennen kuin kysymys tarjoillaanko tiedosto on edes ajankohtainen.
 */
import { describe, it, expect } from 'vitest';
import { readFileSync } from 'fs';
import { execFileSync } from 'child_process';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

const juuri = join(dirname(fileURLToPath(import.meta.url)), '..');

/* Kohdejoukko git-seuratuista tiedostoista — ei työhakemiston roskista. */
const seuratut = execFileSync('git', ['ls-files', '*.html', 'lib/*.js'], { cwd: juuri, encoding: 'utf8' })
  .split('\n')
  .filter(Boolean)
  .filter((p) => !p.includes('/') || p.startsWith('lib/'));

// eslint-disable-next-line no-control-regex
const C1 = /[-]/g;

describe('Merkistön eheys (mojibake-vartija)', () => {
  it('kohdejoukko ei ole tyhjä', () => {
    expect(seuratut).toContain('tm_dna_builder.html');
    expect(seuratut.length).toBeGreaterThan(20);
  });

  it('yksikään tiedosto ei sisällä C1-kontrollimerkkejä (double-encodingin sormenjälki)', () => {
    const saastuneet = [];
    for (const p of seuratut) {
      const osumat = readFileSync(join(juuri, p), 'utf8').match(C1);
      if (osumat) saastuneet.push(`${p} (${osumat.length} kpl)`);
    }
    expect(saastuneet).toEqual([]);
  });

  it('tm_dna_builder: korjatut tunnisteet ja aito ™ ovat paikallaan', () => {
    const s = readFileSync(join(juuri, 'tm_dna_builder.html'), 'utf8');
    expect(s).toContain('const SAKARA_VÄRIT');
    expect(s).toContain('TalentMaster™ — Seuran DNA-rakentaja');
    expect(s).toContain('ohjesääntö');
    expect(s).not.toContain('Ã'); // mojibaken näkyvin jäänne
  });
});
