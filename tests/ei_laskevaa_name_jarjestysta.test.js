/**
 * Vartija: repossa EI saa olla laskevaa dokumentti-id-järjestystä (`orderBy(documentId(), 'desc')` / `orderBy('__name__', 'desc')`).
 * Syy (S1.1-tuotantobugi 12.10.2026): laskeva __name__ vaatii yksittäiskenttäindeksin → tuotannossa "The query requires an index". Emulaattori EI valvo indeksejä, joten testit eivät huomanneet.
 * Tee nousevana: where(documentId(), '>=', <rajaus>) + käänteinen järjestys selaimessa/palvelimella (ks. lib/tm_kayttoaste.js tmKayttoasteLueKoosteet).
 * Jos laskevaa TODELLA tarvitaan: lisää indeksi firestore.indexes.json:iin SAMASSA PR:ssä (EI Consolesta) ja lisää tiedosto + perustelu POIKKEUKSET-listaan alla.
 */
import { describe, it, expect } from 'vitest';
import { readFileSync, readdirSync, statSync } from 'fs';
import { join, relative, dirname } from 'path';
import { fileURLToPath } from 'url';

const juuri = join(dirname(fileURLToPath(import.meta.url)), '..');
const POIKKEUKSET = [];   // [{ tiedosto, perustelu }] — vain jos indeksi on firestore.indexes.json:ssa
const OHITA = new Set(['node_modules', 'archive', '.git', '.claude', 'tests', 'coverage', 'dist']);
const PAATTEET = /\.(html|js|mjs|cjs)$/;
function kavele(d, ulos) {
  for (const n of readdirSync(d)) {
    if (OHITA.has(n)) continue; const p = join(d, n), st = statSync(p);
    if (st.isDirectory()) kavele(p, ulos); else if (PAATTEET.test(n)) ulos.push(p);
  }
  return ulos;
}
/* orderBy( … documentId() | '__name__' … , 'desc' ) — myös monirivisenä; orderBy-kutsun sulkuun asti (max 120 merkkiä) */
export const LASKEVA = /orderBy\(\s*(?:[\w$.]*\bdocumentId\(\)|['"]__name__['"])\s*,\s*['"]desc['"]\s*\)/;

describe('ei laskevaa dokumentti-id-järjestystä (indeksivaatimus)', () => {
  it('yksikään lähdetiedosto ei sisällä orderBy(documentId(), \'desc\')', () => {
    const osumat = kavele(juuri, []).filter((p) => LASKEVA.test(readFileSync(p, 'utf8'))).map((p) => relative(juuri, p))
      .filter((t) => !POIKKEUKSET.some((x) => x.tiedosto === t));
    expect(osumat, 'laskeva __name__ vaatii indeksin (tuotannossa "The query requires an index"). Käytä nousevaa where(documentId(), \'>=\', …) tai lisää indeksi firestore.indexes.json:iin samassa PR:ssä').toEqual([]);
  });
  it('EI VACUOUS: kaava tunnistaa vanhan virheellisen muodon ja ohittaa oikean', () => {
    expect(LASKEVA.test("db.collection('x').orderBy(firebase.firestore.FieldPath.documentId(), 'desc').limit(4)")).toBe(true);
    expect(LASKEVA.test("q.orderBy(d.FieldPath.documentId(),\n   \"desc\")")).toBe(true);
    expect(LASKEVA.test("q.orderBy('__name__', 'desc')")).toBe(true);
    expect(LASKEVA.test("q.where(FieldPath.documentId(), '>=', alku)")).toBe(false);
    expect(LASKEVA.test("q.orderBy('luotu', 'desc')")).toBe(false);
  });
  it('EI VACUOUS: skannaus lukee oikeita tiedostoja (Admin, VP, lib, functions)', () => {
    const t = kavele(juuri, []).map((p) => relative(juuri, p));
    for (const f of ['TalentMaster_Admin.html', 'TalentMaster_VP_v25.html', 'lib/tm_kayttoaste.js', 'functions/seuran_kooste.js']) expect(t).toContain(f);
  });
  it('POIKKEUKSET-lista: jokaisella perustelu ja indeksi firestore.indexes.json:ssa', () => {
    const idx = readFileSync(join(juuri, 'firestore.indexes.json'), 'utf8');
    for (const x of POIKKEUKSET) { expect(x.perustelu).toMatch(/\S/); expect(idx).toContain('__name__'); }
  });
});
