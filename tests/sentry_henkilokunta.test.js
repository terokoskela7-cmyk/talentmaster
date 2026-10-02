/**
 * Sentry henkilökunnan näkymiin (VP_v25 · Master_v16 · Seura · Admin), sama malli kuin Pelaaja/Vanhempi/Rekisteröinti.
 *  - jokainen lataa tm_sentry.js:n ja asettaa TM_SENTRY.app ENNEN Firebase-SDK:ta, sama bundle-versio + SRI
 *  - PII-skrubi (beforeSend/beforeBreadcrumb) poistaa henkilökunnan näkymien kentät (SYNTEETTINEN testidata)
 *  - §39: errors-only, ei Session Replayta, ei tracingia, sendDefaultPii:false
 */
import { describe, it, expect } from 'vitest';
import { readFileSync } from 'fs';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';
import vm from 'vm';

const juuri = join(dirname(fileURLToPath(import.meta.url)), '..');
const lue = (p) => readFileSync(join(juuri, p), 'utf8');

const SRI = 'integrity="sha384-rtfUMq82bneIHVOpL/60roC5pIJ9kDO15w13yGEBKZSJp3aIbrOAhimB61EwPClB"';
const BUNDLE = 'https://browser.sentry-cdn.com/10.58.0/bundle.min.js';
const NAKYMAT = [
  ['TalentMaster_VP_v25.html', 'vp'],
  ['TalentMaster_Master_v16.html', 'master'],
  ['TalentMaster_Seura.html', 'seura'],
  ['TalentMaster_Admin.html', 'admin'],
];
// Verrokki: onboarding-sivujen bundle-rivi on sama kuin henkilökunnalla
const REFERENSSI = lue('TalentMaster_Pelaaja_v7.html');

describe('henkilökunnan näkymät lataavat Sentryn', () => {
  it('EI VACUOUS: referenssisivulla on sama bundle + SRI', () => {
    expect(REFERENSSI).toContain(BUNDLE);
    expect(REFERENSSI).toContain(SRI);
  });
  it.each(NAKYMAT)('%s: TM_SENTRY.app=%s → bundle (sama versio + SRI) → tm_sentry.js, kaikki ENNEN Firebase-SDK:ta', (tiedosto, app) => {
    const s = lue(tiedosto);
    const iApp = s.indexOf(`window.TM_SENTRY={app:'${app}'}`);
    const iBundle = s.indexOf(BUNDLE);
    const iSkripti = s.indexOf('tm_sentry.js?v=2');
    const iFirebase = s.indexOf('firebase-app-compat.js');
    expect(iApp, 'TM_SENTRY.app puuttuu').toBeGreaterThan(-1);
    expect(iBundle, 'bundle puuttuu').toBeGreaterThan(iApp);
    expect(iSkripti, 'tm_sentry.js puuttuu').toBeGreaterThan(iBundle);
    expect(iFirebase, 'Firebase-SDK ladataan ennen Sentryä').toBeGreaterThan(iSkripti);
    expect(s.slice(iBundle - 10, iBundle + 400)).toContain(SRI);
    expect(s.split(BUNDLE).length - 1, 'bundle vain kerran').toBe(1);
  });
  it('kaikilla kahdeksalla sivulla sama tm_sentry.js-versio', () => {
    for (const [t] of NAKYMAT) expect(lue(t)).not.toContain('tm_sentry.js?v=1');
  });
});

/* ── Skrubi: ajetaan tm_sentry.js vm-hiekkalaatikossa Sentry-tynkällä ───────────────────── */
function lataaSkrubi() {
  let opts = null; const tagit = {};
  const win = { TM_SENTRY: { app: 'vp' } };
  const ctx = {
    window: win, location: { hostname: 'talentmaster-pilot--test.web.app' },
    Sentry: { init: (o) => { opts = o; }, setTag: (k, v) => { tagit[k] = v; }, setUser() {} },
  };
  vm.createContext(ctx);
  vm.runInContext(lue('tm_sentry.js'), ctx);
  return { opts, tagit };
}

describe('tm_sentry.js · §39-säännöt', () => {
  const { opts, tagit } = lataaSkrubi();
  it('init tapahtui, app-tagi asetettu', () => {
    expect(opts).not.toBeNull();
    expect(tagit.app).toBe('vp');
  });
  it('errors-only, ei replayta, ei tracingia, sendDefaultPii:false, EU-DSN', () => {
    expect(opts.sendDefaultPii).toBe(false);
    expect(opts.tracesSampleRate).toBe(0);
    expect(opts.dsn).toContain('.ingest.de.sentry.io');
    expect(opts).not.toHaveProperty('replaysSessionSampleRate');
    expect(opts).not.toHaveProperty('replaysOnErrorSampleRate');
    expect(opts.integrations).toBeUndefined();
    const lahde = lue('tm_sentry.js');
    expect(lahde).not.toMatch(/replayIntegration|browserTracingIntegration/);
  });
});

describe('PII-skrubi poistaa henkilökunnan näkymien kentät', () => {
  const { opts } = lataaSkrubi();
  // SYNTEETTISET arvot — ei oikeita nimiä
  const TESTI = {
    nimi: 'Testi Pelaaja', etunimi: 'Testi', sukunimi: 'Pelaaja', pelaajaNimi: 'Testi Pelaaja',
    huoltajaEmail: 'huoltaja.testi@example.test', hEmail: 'h.testi@example.test', email: 'valmentaja.testi@example.test',
    pin: '4821', tunniste: '12345678', palloId: '12345678', palloID: '12345678', sporttiId: 'S-TEST-1',
    displayName: 'Testi Valmentaja', puhelin: '+358000000000', osoite: 'Testikatu 1',
  };
  function tapahtuma() {
    return {
      user: { id: 'uid-123', email: 'valmentaja.testi@example.test', username: 'testi', ip_address: '1.2.3.4' },
      request: { url: 'https://talentmasterid.com/TalentMaster_VP_v25.html?pelaaja=Testi&hEmail=x@example.test', query_string: 'a=b', cookies: 'c=d', headers: { Cookie: 'x' }, data: Object.assign({}, TESTI) },
      extra: { pelaaja: Object.assign({}, TESTI), lista: [Object.assign({}, TESTI)] },
      contexts: { kasittely: Object.assign({}, TESTI) },
      tags: { app: 'vp', huoltajaEmail: 'huoltaja.testi@example.test' },
      message: 'Virhe: huoltaja.testi@example.test PIN 4821 PalloID 12345678',
      exception: { values: [{ value: 'Ei oikeutta: valmentaja.testi@example.test, PalloID 12345678, PIN 4821' }] },
      breadcrumbs: [{ message: 'haku 12345678 / 4821', data: { url: 'https://x.fi/a?palloid=12345678', to: '/b?pin=4821', pelaajaNimi: 'Testi Pelaaja', tunniste: '12345678' } }],
    };
  }
  const e = opts.beforeSend(tapahtuma());
  const JSONI = JSON.stringify(e);

  it('EI VACUOUS: tapahtuma säilyy ja pseudonyymi user.id säilyy', () => {
    expect(e).not.toBeNull();
    expect(e.user).toEqual({ id: 'uid-123' });
    expect(e.tags.app).toBe('vp');
  });
  it.each([
    'Testi Pelaaja', 'Testi Valmentaja', 'huoltaja.testi@example.test', 'h.testi@example.test', 'valmentaja.testi@example.test',
    '4821', '12345678', 'S-TEST-1', '+358000000000', 'Testikatu', '1.2.3.4', 'c=d',
  ])('"%s" ei esiinny skrubatussa tapahtumassa', (arvo) => {
    expect(JSONI).not.toContain(arvo);
  });
  it('URL:n query-parametrit strippautuvat (pelaaja/hEmail/palloid/pin)', () => {
    expect(e.request.url).toBe('https://talentmasterid.com/TalentMaster_VP_v25.html');
    expect(e.breadcrumbs[0].data.url).toBe('https://x.fi/a');
    expect(e.breadcrumbs[0].data.to).toBe('/b');
  });
  it('skrubin heitto pudottaa tapahtuman (PII-turva > näkyvyys)', () => {
    const rikki = {}; Object.defineProperty(rikki, 'user', { get() { throw new Error('x'); } });
    expect(opts.beforeSend(rikki)).toBeNull();
  });
  it('beforeBreadcrumb skrubaa myös yksittäisen leivänmurun', () => {
    const c = opts.beforeBreadcrumb({ message: 'PalloID 12345678', data: { palloId: '12345678', url: '/a?b=1' } });
    expect(JSON.stringify(c)).not.toContain('12345678');
    expect(c.data.url).toBe('/a');
  });
});
