/** Projekti 06 P6: lahetaSahkoposti kutsuu projektiestoa ENNEN avainta ja HTTP-kutsua; toiminta: functions/test/sahkoposti_esto.test.js (node:test). */
import { describe, it, expect } from 'vitest';
import { readFileSync } from 'fs';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';
const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..');
const INDEX = readFileSync(join(ROOT, 'functions/index.js'), 'utf8');
const ESTO = readFileSync(join(ROOT, 'functions/sahkoposti_esto.js'), 'utf8');

describe('SendGrid-vartija kytkentä', () => {
  const alku = INDEX.indexOf('async function lahetaSahkoposti(');
  const runko = INDEX.slice(alku, INDEX.indexOf('\n}\n', alku));
  it('moduuli ladataan ja lahetaSahkoposti tarkistaa eston ensin: ennen avainta, credential-virhettä ja https.request-kutsua', () => {
    expect(INDEX).toContain("require('./sahkoposti_esto')");
    const esto = runko.indexOf('sahkopostiEsto.sahkopostiEsto(process.env)');
    expect(esto).toBeGreaterThan(-1);
    expect(esto).toBeLessThan(runko.indexOf('process.env.SENDGRID_API_KEY'));
    expect(esto).toBeLessThan(runko.indexOf('SendGrid-credentiaalit puuttuvat'));
    expect(esto).toBeLessThan(runko.indexOf('https.request'));
    expect(runko).toMatch(/if \(_esto\.estetty\) return \{ ok: true, estetty: true \};/);
  });
  it('projekti tunnistetaan ajoympäristöstä (ei kovakoodattua stagingia); tuotantoprojekti on talentmaster-pilot', () => {
    expect(ESTO).toContain("TUOTANTOPROJEKTI = 'talentmaster-pilot'");
    expect(ESTO).toContain('GCLOUD_PROJECT');
    expect(ESTO.slice(ESTO.indexOf('*/'))).not.toContain('talentmaster-staging');   // ei staging-nimeä: kaikki ≠ pilot estetään
  });
  it('lokiin ei vastaanottajaa/otsikkoa eston haarassa', () => {
    const logiRivi = runko.split('\n').find((l) => l.includes('ESTETTY'));
    expect(logiRivi).toBeTruthy();
    expect(logiRivi).not.toMatch(/\bto\b|subject|html/);
  });
});
