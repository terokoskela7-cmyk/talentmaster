/**
 * P0 (2.10.2026): SendGridin klikki-/avaus-/tilaus-/GA-seuranta POIS kaikista viesteistä.
 * Klikkiseuranta kierrätti linkit (huoltajan sähköposti, pelaajan nimi, kutsuId, salasanatoken oobCode)
 * ct.sendgrid.net-kautta EU:n ulkopuolelle (CLAUDE.md §39). Tämä vartija failaa, jos seuranta palaa.
 */
import { describe, it, expect } from 'vitest';
import { readFileSync, readdirSync, statSync } from 'fs';
import { fileURLToPath } from 'url';
import { dirname, join, relative } from 'path';
import { createRequire } from 'module';
import vm from 'vm';

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..');
const require_ = createRequire(import.meta.url);
const INDEX = readFileSync(join(ROOT, 'functions/index.js'), 'utf8');
const SP = require_('../functions/sahkoposti_payload.js');

const POIS = { click_tracking: { enable: false, enable_text: false }, open_tracking: { enable: false },
  subscription_tracking: { enable: false }, ganalytics: { enable: false } };

function jsTiedostot(hak) {
  const out = [];
  for (const n of readdirSync(hak)) {
    if (n === 'node_modules' || n.startsWith('.')) continue;
    const p = join(hak, n);
    if (statSync(p).isDirectory()) out.push(...jsTiedostot(p));
    else if (/\.(js|cjs|mjs)$/.test(n)) out.push(p);
  }
  return out;
}

describe('SendGrid-payload', () => {
  it('kaikki seuranta pois (klikki + teksti, avaus, tilaus, GA)', () => {
    const p = SP.rakennaSendGridPayload({ to: 'h@tm-testi.fi', fromEmail: 'noreply@talentmasterid.com', subject: 's', html: '<a href="https://talentmasterid.com/x">x</a>' });
    expect(p.tracking_settings).toEqual(POIS);
    expect(Object.isFrozen(SP.SEURANTA_POIS)).toBe(true);
  });
});

describe('lahetaSahkoposti (ajettu, https-tynkä)', () => {
  it('lähetetyssä HTTP-rungossa tracking_settings = kaikki pois; linkki säilyy muuttumattomana', async () => {
    const a = INDEX.indexOf('async function lahetaSahkoposti(');
    let d = 0, j = INDEX.indexOf(') {', a) + 2;
    for (; j < INDEX.length; j++) { if (INDEX[j] === '{') d++; else if (INDEX[j] === '}') { d--; if (!d) break; } }
    const lahde = INDEX.slice(a, j + 1);
    let runko = null, optiot = null;
    const https = { request: (o, cb) => { optiot = o; return { on() {}, write(b) { runko = b; },
      end() { const kuuntelijat = {}; cb({ statusCode: 202, on: (e, f) => { kuuntelijat[e] = f; if (e === 'end') { (kuuntelijat.data || (() => {}))(''); f(); } } }); } }; } };
    const ctx = { https, Buffer, JSON, console: { log() {}, error() {} }, Promise, Error,
      process: { env: { SENDGRID_API_KEY: 'SG.testi12345' } }, rakennaSendGridPayload: SP.rakennaSendGridPayload };
    vm.createContext(ctx);
    vm.runInContext(lahde + '\nthis.laheta = lahetaSahkoposti;', ctx);
    const linkki = 'https://talentmasterid.com/TalentMaster_Rekisterointi_Suostumus.html?pelaajaId=p1&kutsuId=k1';
    await ctx.laheta({ to: 'h@tm-testi.fi', subject: 'Kutsu', html: '<a href="' + linkki + '">Avaa</a>', fromName: 'KPV' });
    expect(optiot.hostname).toBe('api.sendgrid.com');
    const p = JSON.parse(runko);
    expect(p.tracking_settings).toEqual(POIS);
    expect(p.content[0].value).toContain('href="' + linkki + '"');
    expect(runko).not.toMatch(/"enable":true/);
  });
});

describe('vartijat', () => {
  const FUNCTIONS = jsTiedostot(join(ROOT, 'functions'));
  it('functions/-koodissa ei click_tracking / open_tracking / subscription_tracking / ganalytics enable:true', () => {
    for (const f of FUNCTIONS) {
      const s = readFileSync(f, 'utf8');
      expect(s, relative(ROOT, f)).not.toMatch(/(click_tracking|open_tracking|subscription_tracking|ganalytics)\s*:\s*\{[^}]*enable(_text)?\s*:\s*true/);
    }
  });
  it('lahetaSahkoposti ei kirjoita omaa tracking_settings-kenttää (vain rakennaSendGridPayload)', () => {
    const a = INDEX.indexOf('async function lahetaSahkoposti(');
    const lahde = INDEX.slice(a, INDEX.indexOf('\n}\n', a));
    expect(lahde).toContain('rakennaSendGridPayload(');
    expect(lahde).not.toMatch(/tracking_settings\s*:/);
  });
  it('api.sendgrid.com kutsutaan vain lahetaSahkoposti-funktiosta (ei ohituskutsuja muualla)', () => {
    const osumat = [];
    const kaikki = FUNCTIONS.concat(jsTiedostot(join(ROOT, 'lib')), jsTiedostot(join(ROOT, 'scripts')), jsTiedostot(join(ROOT, 'src')));
    for (const f of kaikki) {
      const s = readFileSync(f, 'utf8');
      if (/api\.sendgrid\.com|@sendgrid\//.test(s)) osumat.push(relative(ROOT, f));   // kutsukohdat (ei kommentit ct.sendgrid.net)
    }
    for (const f of readdirSync(ROOT).filter((n) => n.endsWith('.html'))) {
      if (/api\.sendgrid\.com/.test(readFileSync(join(ROOT, f), 'utf8'))) osumat.push(f);
    }
    expect(osumat).toEqual(['functions/index.js']);
    expect(INDEX.match(/api\.sendgrid\.com/g)).toHaveLength(1);
    const a = INDEX.indexOf('async function lahetaSahkoposti(');
    const i = INDEX.indexOf('api.sendgrid.com');
    expect(i > a && i < INDEX.indexOf('\n}\n', a)).toBe(true);
  });
});
