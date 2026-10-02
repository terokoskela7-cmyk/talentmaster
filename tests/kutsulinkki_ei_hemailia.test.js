/**
 * hEmail POIS KUTSULINKISTÄ: huoltajan sähköposti ei saa näkyä URL:ssa (selainhistoria, referrerit, lokit, WhatsApp-jaot).
 *  - Seura ei lisää hEmailia yhteenkään kutsulinkin rakentajaan (5 kohtaa)
 *  - palvelin (sahkoposti_turva) pudottaa sen selaimen linkistä
 *  - suostumussivu toimii ilman: huoltaja kirjoittaa osoitteen itse, vahvistaSuostumus vertaa palvelimella; vanhat linkit (hEmail mukana) esitäyttävät yhä
 */
import { describe, it, expect } from 'vitest';
import { readFileSync } from 'fs';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';
import { createRequire } from 'module';

const juuri = join(dirname(fileURLToPath(import.meta.url)), '..');
const lue = (p) => readFileSync(join(juuri, p), 'utf8');
const require = createRequire(import.meta.url);
const T = require('../functions/sahkoposti_turva.js');
const SEURA = lue('TalentMaster_Seura.html');
const LOM = lue('TalentMaster_Rekisterointi_Suostumus.html');
const BASE = 'https://talentmasterid.com';
const SIVU = BASE + '/TalentMaster_Rekisterointi_Suostumus.html';

describe('Seura: kutsulinkin rakentajat eivät lisää hEmailia', () => {
  /* Jokainen `new URLSearchParams({ … })` -lohko, jonka sisältö jatkuu sulkevaan `})`-merkkiin, ja jokainen `params.set('hEmail'…)`. */
  const lohkot = [];
  const re = /new URLSearchParams\(\{/g; let m;
  while ((m = re.exec(SEURA))) { const loppu = SEURA.indexOf('})', m.index); lohkot.push(SEURA.slice(m.index, loppu + 2)); }
  it('EI VACUOUS: kutsulinkki-lohkoja löytyy (seuraId + seura + etunimi/joukkue)', () => {
    const kutsu = lohkot.filter((l) => /seuraId/.test(l) && /seura:/.test(l) && /(etunimi|joukkue)/.test(l));
    expect(kutsu.length).toBeGreaterThanOrEqual(4);
  });
  it('yksikään URLSearchParams-lohko ei sisällä hEmailia (viestin/leiskan hEmail-kentät ovat muualla)', () => {
    const rikkojat = lohkot.filter((l) => /\bhEmail\b/.test(l.replace(/\/\/[^\n]*/g, '')));
    expect(rikkojat.map((l) => l.slice(0, 80))).toEqual([]);
  });
  it("ei params.set('hEmail', …)", () => { expect(SEURA).not.toMatch(/params\.set\(\s*['"]hEmail['"]/); });
  it('linkin rakentajat on silti olemassa (seuraId/seura/etunimi/sukunimi/joukkue/palloid säilyvät)', () => {
    expect(SEURA).toContain('...(palloId   && { palloid: palloId }),');
    expect(SEURA).toContain("params.set('etunimi',  p.etunimi)");
  });
});

describe('palvelin pudottaa hEmailin', () => {
  it('uusi linkki ei sisällä hEmailia eikä @-merkkiä', () => {
    const l = T.rakennaKutsuLinkki(SIVU + '?seuraId=s1&pelaajaId=p1&kutsuId=k1&etunimi=Ella', BASE, { seura: 'FC' });
    expect(l).not.toMatch(/hEmail|%40|@/i);
    expect(l).toContain('kutsuId=k1');
  });
  it('vanha linkki hEmailin kanssa hyväksytään (ei virhettä), parametri pudotetaan', () => {
    const l = T.rakennaKutsuLinkki(SIVU + '?seuraId=s1&hEmail=a%40b.fi&pelaajaId=p1', BASE);
    expect(l).toBe(SIVU + '?seuraId=s1&pelaajaId=p1');
  });
  it('KUTSU_PARAMETRIT ei sisällä hEmailia', () => { expect(T.KUTSU_PARAMETRIT).not.toContain('hEmail'); });
});

describe('suostumussivu: vanha linkki esitäyttää, uusi linkki toimii kirjoitetulla osoitteella', () => {
  it('esitäyttö säilyy vain jos parametri on (vanhat linkit)', () => {
    expect(LOM).toContain("if (_urlParams.hEmail)  el('h_email').value = _urlParams.hEmail;");
  });
  it('vahvistaSuostumus saa osoitteen: parametri (vanha) TAI lomakkeelle kirjoitettu (uusi) — palvelin vertaa tallennettuun', () => {
    expect(LOM).toContain("var raporttiEmail = (val('h_email') || val('i_email') || '').toLowerCase();");
    expect(LOM).toContain("var hEmailParam = (_urlParams.hEmail || raporttiEmail || '').toLowerCase();");
    expect(lue('functions/index.js')).toMatch(/hEmail[\s\S]{0,800}tallennettu|tallennettu[\s\S]{0,800}hEmail/);
  });
  it('QR-suostumuskortti (kutsuId-linkki ilman esitäyttöä) on jo sama reitti: huoltaja kirjoittaa itse', () => {
    expect(lue('tests/qr_suostumuskortti.test.js')).toContain('expect(runko).not.toMatch(/hEmail|etunimi|sukunimi|palloid|joukkue/i);');   // QR-linkissä ei hEmailia/nimiä → huoltaja kirjoittaa itse
  });
});
