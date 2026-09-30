/**
 * HOTFIX 2 · SENDGRID_FROM_EMAIL oli tyhjä CI-deployn jälkeen (deploy-functions.yml ei luo functions/.env:iä)
 * → jokainen lahetaSahkoposti-kutsu kaatui "SendGrid-credentiaalit puuttuvat". Lähettäjällä on nyt
 * oletusarvo koodissa. lahetaSahkoposti AJETAAN vm:ssä ilman env-muuttujaa ja SendGridille lähtevä
 * payload tarkistetaan (https.request-tynkä).
 */
import { describe, it, expect } from 'vitest';
import { readFileSync } from 'fs';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';
import vm from 'vm';

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..');
const CF = readFileSync(join(ROOT, 'functions', 'index.js'), 'utf8');

function pura(tunniste) {
  const alku = CF.indexOf(tunniste);
  if (alku < 0) throw new Error('ei löydy: ' + tunniste);
  let d = 0;
  for (let j = CF.indexOf(') {', alku) + 2; j < CF.length; j++) {   // rungon aaltosulje (ei parametrien destrukturointia)
    if (CF[j] === '{') d++; else if (CF[j] === '}') { d--; if (!d) return CF.slice(alku, j + 1); }
  }
  throw new Error('sulkeet');
}

function aja(env) {
  const loki = { payload: null };
  const https = {
    request: (_opts, cb) => ({
      on() { return this; },
      write(b) { loki.payload = JSON.parse(String(b)); },
      end() { cb({ statusCode: 202, on(ev, f) { if (ev === 'end') f(); return this; }, setEncoding() {} }); },
    }),
  };
  const ctx = { process: { env }, https, console: { log() {}, warn() {}, error() {} }, JSON, Promise, Buffer, String, Error };
  vm.createContext(ctx);
  vm.runInContext(pura('async function lahetaSahkoposti(') + '\nthis.lahetaSahkoposti = lahetaSahkoposti;', ctx);
  return { loki, ajo: ctx.lahetaSahkoposti({ to: 'huoltaja@x.fi', subject: 'S', html: '<p>', fromName: 'Seura' }) };
}

describe('lahetaSahkoposti · lähettäjä ilman SENDGRID_FROM_EMAIL-muuttujaa', () => {
  it('env-muuttuja puuttuu (CI-deploy) → lähettäjä noreply@talentmasterid.com, ei "credentiaalit puuttuvat"', async () => {
    const t = aja({ SENDGRID_API_KEY: 'SG.testi1234567890' });
    await t.ajo;
    expect(t.loki.payload.from).toEqual({ email: 'noreply@talentmasterid.com', name: 'Seura' });
    expect(t.loki.payload.personalizations[0].to[0].email).toBe('huoltaja@x.fi');
  });
  it('env-muuttuja asetettu → se voittaa oletuksen', async () => {
    const t = aja({ SENDGRID_API_KEY: 'SG.testi1234567890', SENDGRID_FROM_EMAIL: 'muu@talentmasterid.com' });
    await t.ajo;
    expect(t.loki.payload.from.email).toBe('muu@talentmasterid.com');
  });
  it('salainen avain puuttuu → virhe yhä (salaisilla EI oletusta)', async () => {
    await expect(aja({}).ajo).rejects.toThrow(/SENDGRID_API_KEY=TYHJÄ/);
  });
});
