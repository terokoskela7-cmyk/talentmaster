/**
 * VP→valmentaja-viestit: komposiitti-indeksi vs. kysely.
 *
 * LIVE-BUGI: `_kuunteleVpViestit` kuuntelee
 *   where('vastaanottajaUid','==',uid) + orderBy('aika','desc')
 * `where(==) + orderBy(ERI kenttä)` vaatii komposiitti-indeksin, jota
 * `firestore.indexes.json` ei sisältänyt. Virhe menee `onSnapshot`:n
 * error-callbackiin (console.warn) → **ei kaada sivua**, mutta snapshot ei
 * koskaan täyty → valmentajan Inbox jää tyhjäksi ja VP luulee lähettäneensä.
 *
 * Hiljainen vika tarvitsee vartijan: tämä sitoo INDEKSIN ja KYSELYN yhteen.
 * Jos joko kysely muuttuu tai indeksi katoaa, portti punertaa — kumpikaan ei
 * voi ajautua erilleen niin että ainoa oire on tyhjä näkymä.
 */
import { describe, it, expect } from 'vitest';
import { readFileSync } from 'fs';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

const juuri = join(dirname(fileURLToPath(import.meta.url)), '..');
const lue = (p) => readFileSync(join(juuri, p), 'utf8');
const MASTER = lue('TalentMaster_Master_v16.html');
const INDEKSIT = JSON.parse(lue('firestore.indexes.json'));

/** `_kuunteleVpViestit`-funktion runko sulkeita laskemalla. */
function kuuntelija() {
  const i = MASTER.indexOf('function _kuunteleVpViestit(');
  expect(i, '_kuunteleVpViestit puuttuu Masterista').toBeGreaterThan(-1);
  let syv = 0, loppu = -1;
  for (let k = MASTER.indexOf('{', i); k < MASTER.length; k++) {
    if (MASTER[k] === '{') syv++;
    else if (MASTER[k] === '}') { syv--; if (syv === 0) { loppu = k + 1; break; } }
  }
  return MASTER.slice(i, loppu);
}

const indeksi = (kokoelma) =>
  (INDEKSIT.indexes || []).find((x) => x.collectionGroup === kokoelma);

describe('VP-viestit · komposiitti-indeksi', () => {
  it('EI VACUOUS: kuuntelija tekee yhä where + orderBy -yhdistelmän', () => {
    /* Jos kysely joskus yksinkertaistetaan (esim. client-sort), indeksivaatimus
       katoaa — silloin tämän portin pitää kertoa se, ei vaatia turhaa indeksiä. */
    const k = kuuntelija();
    expect(k, 'vastaanottajaUid-suodatus puuttuu').toMatch(/where\(\s*'vastaanottajaUid'\s*,\s*'=='/);
    expect(k, 'aika-järjestys puuttuu').toMatch(/orderBy\(\s*'aika'\s*,\s*'desc'\s*\)/);
    expect(k, 'viestit-kokoelma puuttuu').toContain("collection('viestit')");
  });

  it('INDEKSI on olemassa kyselyä vastaavilla kentillä ja suunnilla', () => {
    const idx = indeksi('viestit');
    expect(idx, 'viestit-indeksi puuttuu firestore.indexes.json:ista').toBeTruthy();
    expect(idx.queryScope, 'alikokoelma → COLLECTION').toBe('COLLECTION');
    /* Järjestys merkitsee: yhtäsuuruussuodatus ENSIN, sitten orderBy-kenttä. */
    expect(idx.fields.map((f) => f.fieldPath)).toEqual(['vastaanottajaUid', 'aika']);
    expect(idx.fields.map((f) => f.order)).toEqual(['ASCENDING', 'DESCENDING']);
  });

  it('DRIFT: kysely ja indeksi pysyvät linjassa', () => {
    /* Sitoo kaksi tiedostoa yhteen: kyselystä luetaan kentät, indeksistä
       tarkistetaan että ne löytyvät. Näin indeksi ei voi kadota hiljaa
       kyselyn jäädessä paikalleen (eikä päinvastoin). */
    const k = kuuntelija();
    const wm = k.match(/where\(\s*'([\w]+)'\s*,\s*'=='/);
    const om = k.match(/orderBy\(\s*'([\w]+)'\s*,\s*'(asc|desc)'\s*\)/);
    expect(wm && om, 'kyselyä ei voitu jäsentää').toBeTruthy();
    const idx = indeksi('viestit');
    expect(idx, 'kysely vaatii indeksin jota ei ole').toBeTruthy();
    const kentat = idx.fields.map((f) => f.fieldPath);
    expect(kentat[0], 'indeksin 1. kenttä ei vastaa where-suodatusta').toBe(wm[1]);
    expect(kentat[1], 'indeksin 2. kenttä ei vastaa orderBy-kenttää').toBe(om[1]);
    expect(idx.fields[1].order, 'orderBy-suunta ei vastaa indeksiä')
      .toBe(om[2] === 'desc' ? 'DESCENDING' : 'ASCENDING');
  });

  it('EI RIKOTA naapureita: aiemmat indeksit ovat tallella', () => {
    /* firestore.indexes.json on A1:n mukaan "täydellinen totuus" — deploy
       korvaa tuotannon indeksit tällä tiedostolla, joten kadonnut rivi
       poistaisi indeksin tuotannosta. */
    ['havainnot', 'kartoitukset', 'kehut', 'mentoroinnit', 'pelaajat', 'tapahtumat']
      .forEach((c) => expect(indeksi(c), c + '-indeksi katosi').toBeTruthy());
    expect((INDEKSIT.indexes || []).length, 'indeksien määrä pieneni').toBeGreaterThanOrEqual(10);
  });
});
