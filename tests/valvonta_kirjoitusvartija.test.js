/** Projekti 07 / P3: valvonta on VAIN LUKEVA. Kirjoituskutsu sallitaan vain funktiossa `kirjaaAudit` (functions/valvonta.js, PR 3).
 *  Kaikissa muissa valvontatiedostoissa (lib/tm_valvonta*.js, functions/-kopiot, functions/valvonta.js, scripts/valvonta_aja.js) mikä tahansa kirjoituskutsu kaataa testin.
 *  Vartija testataan myös itse (negatiiviset tapaukset): rikkova lähdekoodi tunnistetaan, kirjaaAudit-sisäinen kirjoitus ei. */
import { describe, it, expect } from 'vitest';
import { readFileSync, existsSync } from 'fs';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';
const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..');
const KIRJOITUS = /\.(set|update|delete|add|create|commit|batch|runTransaction|bulkWriter|recursiveDelete)\s*\(|\b(FieldValue|writeBatch|setDoc|updateDoc|deleteDoc|addDoc)\b/;
const TIEDOSTOT = ['lib/tm_valvonta.js', 'lib/tm_valvonta_raportti.js', 'functions/tm_valvonta.js', 'functions/tm_valvonta_raportti.js', 'functions/valvonta.js', 'functions/valvonta_luku.js', 'scripts/valvonta_aja.js', 'scripts/diag_valvonta_luonne.js'];

/** Poistaa kommentit ja funktion `kirjaaAudit` rungon; palauttaa jäljelle jäävän koodin. */
export function ilmanSallittua(koodi) {
  let s = koodi.replace(/\/\*[\s\S]*?\*\//g, '').replace(/(^|[^:])\/\/.*$/gm, '$1');
  const m = /(async\s+)?function\s+kirjaaAudit\s*\([^)]*\)\s*\{/.exec(s) || /(const|let|var)\s+kirjaaAudit\s*=\s*(async\s*)?(\([^)]*\)|\w+)\s*=>\s*\{/.exec(s);
  if (!m) return s;
  let i = m.index + m[0].length, syvyys = 1;
  while (i < s.length && syvyys > 0) { if (s[i] === '{') syvyys++; else if (s[i] === '}') syvyys--; i++; }
  return s.slice(0, m.index) + s.slice(i);
}
const rikkoo = (koodi) => KIRJOITUS.test(ilmanSallittua(koodi));

describe('valvonnan kirjoitusvartija', () => {
  TIEDOSTOT.forEach((f) => {
    it(f + ': ei kirjoituskutsuja muualla kuin kirjaaAudit-funktiossa', () => {
      if (!existsSync(join(ROOT, f))) return;   // functions/valvonta.js (PR 3) ja scripts/valvonta_aja.js (PR 2) tulevat myöhemmin; vartija on valmiina
      expect(rikkoo(readFileSync(join(ROOT, f), 'utf8')), f).toBe(false);
    });
  });
  it('lib-tiedostot ja PR 2:n lukukerros + käsiajuri ovat olemassa (vartija ei ole vacuous)', () => { expect(existsSync(join(ROOT, 'functions/valvonta_luku.js'))).toBe(true); expect(existsSync(join(ROOT, 'scripts/valvonta_aja.js'))).toBe(true); expect(existsSync(join(ROOT, 'scripts/diag_valvonta_luonne.js'))).toBe(true); expect(existsSync(join(ROOT, 'lib/tm_valvonta.js'))).toBe(true); expect(existsSync(join(ROOT, 'lib/tm_valvonta_raportti.js'))).toBe(true); });
  it('vartija tunnistaa kirjoituskutsut (negatiivinen testi)', () => {
    ['db.collection("x").doc("y").set({a:1});', 'ref.update({a:1})', 'await b.commit();', 'x.delete()', 'col.add({})', 'db.batch()', 'db.runTransaction(async t=>{})', 'FieldValue.increment(1)', 'setDoc(r, {})']
      .forEach((k) => expect(rikkoo('function muu(){ ' + k + ' }'), k).toBe(true));
  });
  it('kirjaaAudit saa kirjoittaa, mutta vain se: muu funktio samassa tiedostossa ei', () => {
    const ok = 'async function kirjaaAudit(db, r){ await db.collection("audit").add(r); }\nfunction lue(){ return 1; }';
    expect(rikkoo(ok)).toBe(false);
    expect(rikkoo(ok + '\nfunction paha(db){ return db.collection("x").doc("y").set({}); }')).toBe(true);
    expect(rikkoo('const kirjaaAudit = async (db, r) => { await db.collection("audit").add(r); };')).toBe(false);
    expect(rikkoo('const kirjaaAudit = async (db, r) => { await db.collection("audit").add(r); };\nconst b = db.batch();')).toBe(true);
  });
  it('kommentissa mainittu kirjoituskutsu ei laukaise (mutta koodissa laukaisee)', () => { expect(rikkoo('// ei .set( tähän\nfunction a(){}')).toBe(false); expect(rikkoo('/* .update( */ function a(){}')).toBe(false); });
});
