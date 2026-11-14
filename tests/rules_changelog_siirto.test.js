/* Rules-changelogin siirto (PM 14.11.2026): "Muutokset vX → vY" -lohkot v3.79 → v3.80 ja vanhemmat siirrettiin sanatarkasti docs/RULES_CHANGELOG.md:hen.
   Sääntökoodiin ei koskettu: siirtohetkellä kommenttirivit poistamalla tiedosto oli identtinen siirtoa edeltävän (origin/main) kanssa (PR-kuvaus). Tämä vartija pitää rakenteen: viittausrivi, lohkot dokumentissa, uudet lohkot tiedoston alussa. */
import { describe, it, expect } from 'vitest';
import { readFileSync } from 'fs';
const teksti = (f) => readFileSync(new URL('../' + f, import.meta.url), 'utf8');
const RULES = teksti('tm_admin/firestore.rules'), DOC = teksti('docs/RULES_CHANGELOG.md');
const lohko = DOC.split('```')[1].replace(/^\n|\n$/g, '').split('\n');
const otsikot = (t) => t.split('\n').filter((l) => /^\/\/ Muutokset /.test(l)).map((l) => (l.match(/^\/\/ Muutokset (v[\d.]+ → v[\d.]+|\()/) || [])[1]);
describe('Rules-changelogin siirto', () => {
  it('dokumentin lohko: jokainen rivi on kommentti (// ) sellaisenaan; alkaa v3.79 → v3.80:llä ja päättyy v2.1.0 → v3.0 -lohkoon', () => {
    for (const l of lohko) expect(l, l).toMatch(/^\/\//);
    expect(lohko[0]).toMatch(/^\/\/ Muutokset v3\.79 → v3\.80 /); expect(lohko[lohko.length - 1]).toContain('Firestore EI periydy alikokoelmiin');
    const o = otsikot(lohko.join('\n')); expect(o[0]).toBe('v3.79 → v3.80'); expect(o).toContain('v3.1 → v3.2'); expect(o).toContain('v2.1.0 → v3.0'); expect(o.length).toBeGreaterThan(50);
  });
  it('firestore.rules: viittausrivi dokumenttiin, ei siirrettyjä lohkoja (ei kaksoiskappaleita), viimeisimmät (v3.80 → v3.81 →) jäivät', () => {
    expect(RULES).toContain('docs/RULES_CHANGELOG.md');
    const o = otsikot(RULES.split('service cloud.firestore')[0]);
    for (const siirretty of otsikot(lohko.join('\n'))) if (siirretty && siirretty !== 'v3.79 → v3.80') expect(o, siirretty).not.toContain(siirretty);
    expect(RULES.split('service cloud.firestore')[0]).not.toMatch(/^\/\/ Muutokset v3\.79 → v3\.80 \(B9b/m);
    expect(o).toContain('v3.80 → v3.81');
  });
  it('sääntökoodi ennallaan rakenteessa: rules_version + service-lohko tallessa, otsikko ja uusin lohko (versio nyt) alussa', () => {
    expect(RULES.startsWith("rules_version = '2';")).toBe(true); expect(RULES).toMatch(/service cloud\.firestore \{\n\s+match \/databases/);
    expect(RULES.split('\n').slice(0, 12).join('\n')).toMatch(/firestore\.rules v3\.\d+/);
  });
});
