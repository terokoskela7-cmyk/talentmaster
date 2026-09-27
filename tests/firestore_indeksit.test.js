/**
 * TalentMaster™ — KOMPOSIITTI-INDEKSIT vastaavat koodin kyselyitä. Vartija.
 *
 * LÖYDÖS (review PR #638): Katso-tilan arvioijakysely tekee yhtäsuuruuden yhdellä kentällä ja
 * vaihteluvälin toisella — se vaatii Firestoressa komposiitti-indeksin, jota ei ollut. Ilman
 * indeksiä `.get()` hylätään tuotannossa (FAILED_PRECONDITION), ja koska latausfunktion `catch`
 * nielee virheen, nimet eivät olisi ilmestyneet kenellekään. Vihreä CI ei näytä tätä: emulaattori
 * ei pakota indeksejä, eikä lähdettä greppaava testi koske kyselyyn.
 *
 * Siksi vaadittu indeksi JOHDETAAN KYSELYSTÄ: jos kyselyn kentät muuttuvat, tämä testi vaatii
 * indeksin muuttuvan mukana. Se ei korvaa emulaattoria, mutta estää juuri tämän vikaluokan.
 */
import { describe, it, expect } from 'vitest';
import { readFileSync } from 'fs';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

const juuri = join(dirname(fileURLToPath(import.meta.url)), '..');
const VP = readFileSync(join(juuri, 'TalentMaster_VP_v25.html'), 'utf8');
const INDEKSIT = JSON.parse(readFileSync(join(juuri, 'firestore.indexes.json'), 'utf8'));

function pura(tunniste) {
  const i = VP.indexOf(tunniste);
  expect(i, tunniste + ' puuttuu VP:stä').toBeGreaterThan(-1);
  let syv = 0;
  for (let k = VP.indexOf('{', i); k < VP.length; k++) {
    if (VP[k] === '{') syv++;
    else if (VP[k] === '}') { syv--; if (syv === 0) return VP.slice(i, k + 1); }
  }
  throw new Error('sulkuja ei saatu tasan: ' + tunniste);
}

/** Kyselyn where-ehdot lähteestä: [{ kentta, op }] esiintymisjärjestyksessä. */
function whereEhdot(src) {
  const out = [];
  const re = /\.where\(\s*'([^']+)'\s*,\s*'([^']+)'/g;
  let m;
  while ((m = re.exec(src))) out.push({ kentta: m[1], op: m[2] });
  return out;
}

const onIndeksi = (kokoelma, kentat) => (INDEKSIT.indexes || []).some((idx) => idx.collectionGroup === kokoelma
  && Array.isArray(idx.fields)
  && idx.fields.length >= kentat.length
  && kentat.every((k, n) => idx.fields[n] && idx.fields[n].fieldPath === k));

describe('arviointikerrat — Katso-tilan arvioijakysely on indeksoitu', () => {
  const lataus = pura('async function _vpArvLataaKerrat(p) {');
  const ehdot = whereEhdot(lataus);

  it('EI VACUOUS: kysely löytyy ja siinä on kaksi ehtoa', () => {
    expect(lataus).toContain("collection('arviointikerrat')");
    expect(ehdot.length).toBe(2);
  });

  it('kysely yhdistää yhtäsuuruuden ja vaihteluvälin → vaatii komposiitti-indeksin', () => {
    const opit = ehdot.map((e) => e.op);
    expect(opit).toContain('==');
    expect(opit.some((o) => o === '>=' || o === '<=' || o === '>' || o === '<')).toBe(true);
  });

  it('firestore.indexes.json sisältää indeksin JUURI näille kentille tässä järjestyksessä', () => {
    const kentat = ehdot.map((e) => e.kentta);
    expect(kentat, 'yhtäsuuruuskentän on oltava ensin').toEqual(['nakyvyys', 'pvm']);
    expect(onIndeksi('arviointikerrat', kentat),
      'puuttuva indeksi → kysely hylätään tuotannossa ja catch nielee virheen').toBe(true);
  });

  it('EI VACUOUS: keksitylle kentälle EI löydy indeksiä (tarkistus toimii)', () => {
    expect(onIndeksi('arviointikerrat', ['nakyvyys', 'ei_ole_kenttaa'])).toBe(false);
    expect(onIndeksi('ei_ole_kokoelmaa', ['nakyvyys', 'pvm'])).toBe(false);
  });

  it('näkyvyysrajaus pysyy kyselyssä (Rules vaatii sen — ei saa poistaa indeksin välttämiseksi)', () => {
    expect(lataus).toContain(".where('nakyvyys', '==', 'seuralle')");
  });
});

describe('deploy kattaa indeksit, ei vain sääntöjä', () => {
  const YAML = readFileSync(join(juuri, '.github/workflows/deploy-rules.yml'), 'utf8');

  it('workflow deployaa firestore:indexes', () => {
    expect(YAML).toContain('firestore:indexes');
  });

  it('workflow laukeaa myös indeksitiedoston muutoksesta', () => {
    expect(YAML).toContain('firestore.indexes.json');
  });
});
