/** scripts/tarkista_vanhat_kirjoittajat.js (projekti 03 PR D): puhtaat ytimet + rakenne (vain lukeva, ADC, require.main-vartija, vain lukumäärät). */
import { describe, it, expect } from 'vitest';
import { readFileSync } from 'fs';
import { createRequire } from 'module';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';
const require = createRequire(import.meta.url);
const M = require('../scripts/tarkista_vanhat_kirjoittajat.js');
const SRC = readFileSync(join(dirname(fileURLToPath(import.meta.url)), '..', 'scripts/tarkista_vanhat_kirjoittajat.js'), 'utf8');
const DEPLOY = Date.parse('2026-11-09T16:27:35Z');
const ts = (iso) => ({ toMillis: () => Date.parse(iso) });

describe('1) vanhan clientin automaattiset ehdotukset', () => {
  it('lasketaan vain: tyyppi automaattinen, id ei auto_, luotu > deploy', () => {
    expect(M.onVanhaEhdotus('AbCdEfGhIjKlMnOpQrSt', { tyyppi: 'automaattinen', luotu: ts('2026-11-09T16:27:36Z') }, DEPLOY)).toBe(true);
    expect(M.onVanhaEhdotus('AbCdEfGhIjKlMnOpQrSt', { tyyppi: 'automaattinen', luotu: '2026-11-10T08:00:00Z' }, DEPLOY)).toBe(true);
    expect(M.onVanhaEhdotus('AbCdEfGhIjKlMnOpQrSt', { tyyppi: 'automaattinen', luotu: ts('2026-11-09T16:27:34Z') }, DEPLOY)).toBe(false);   // ennen deployta
    expect(M.onVanhaEhdotus('auto_suunta_lasku_kpv_u13_2026-W46_0123456789', { tyyppi: 'automaattinen', luotu: ts('2026-11-10T08:00:00Z') }, DEPLOY)).toBe(false);   // palvelin
    expect(M.onVanhaEhdotus('pulssi_x_y', { tyyppi: 'pulssi', luotu: ts('2026-11-10T08:00:00Z') }, DEPLOY)).toBe(false);
    expect(M.onVanhaEhdotus('X', { tyyppi: 'automaattinen' }, DEPLOY)).toBe(false);   // ei luotu-aikaa
    expect(M.onVanhaEhdotus('X', null, DEPLOY)).toBe(false);
  });
});

describe('2) viimeisinKirjautuminen', () => {
  const YO = Date.parse('2026-11-11T01:30:00Z'), AUTH = Date.parse('2026-11-10T09:00:00Z');
  it('viimeisin yöajon alku: 03:30 Helsinki (talvi 01:30Z, kesä 00:30Z), ennen ajoa edellinen yö', () => {
    expect(new Date(M.viimeisinYoajonAlku(Date.parse('2026-11-11T14:00:00Z'))).toISOString()).toBe('2026-11-11T01:30:00.000Z');
    expect(new Date(M.viimeisinYoajonAlku(Date.parse('2026-11-11T00:50:00Z'))).toISOString()).toBe('2026-11-10T01:30:00.000Z');
    expect(new Date(M.viimeisinYoajonAlku(Date.parse('2026-07-11T14:00:00Z'))).toISOString()).toBe('2026-07-11T00:30:00.000Z');
  });
  it('Auth-aktiivisuus = max(lastRefreshTime, lastSignInTime) kuten yöajo', () => {
    expect(M.authAktiivisuusMs({ metadata: { lastSignInTime: 'Mon, 09 Nov 2026 08:00:00 GMT', lastRefreshTime: 'Tue, 10 Nov 2026 09:00:00 GMT' } })).toBe(AUTH);
    expect(M.authAktiivisuusMs({ metadata: {} })).toBe(null);
    expect(M.authAktiivisuusMs(null)).toBe(null);
  });
  it('yöajon kirjoittama arvo (= Auth-aika ennen ajoa) EI laske; yöajon jälkeinen tai Authia uudempi arvo laskee', () => {
    expect(M.luokitteleKirjautuminen(ts('2026-11-10T09:00:00Z'), AUTH, YO).vanha).toBe(false);   // palvelin: täsmälleen Auth-aika
    expect(M.luokitteleKirjautuminen(ts('2026-11-10T09:00:30Z'), AUTH, YO).vanha).toBe(false);   // toleranssin sisällä
    const a = M.luokitteleKirjautuminen(ts('2026-11-11T08:00:00Z'), Date.parse('2026-11-11T08:00:05Z'), YO);   // yöajon jälkeen, vanha client + token uusittu
    expect(a.yoajonJalkeen).toBe(true); expect(a.vanha).toBe(true);
    const b = M.luokitteleKirjautuminen(ts('2026-11-10T12:00:00Z'), AUTH, YO);   // ennen ajoa mutta Authia uudempi
    expect(b.authiaUudempi).toBe(true); expect(b.yoajonJalkeen).toBe(false); expect(b.vanha).toBe(true);
  });
  it('ei Auth-tiliä: vain yöajokriteeri; ei dataa → ei lasketa', () => {
    const r = M.luokitteleKirjautuminen(ts('2026-11-10T09:00:00Z'), null, YO);
    expect(r.ei_authia).toBe(true); expect(r.vanha).toBe(false);
    expect(M.luokitteleKirjautuminen(ts('2026-11-11T09:00:00Z'), null, YO).vanha).toBe(true);
    expect(M.luokitteleKirjautuminen(null, AUTH, YO).ei_dataa).toBe(true);
  });
});

describe('rakenne: vain lukeva, ADC, ajovartija, ei sisältöä lokiin', () => {
  it('ei kirjoituskutsuja', () => { expect(SRC).not.toMatch(/\.(set|update|delete|add|commit|create|batch)\s*\(/); expect(SRC).not.toMatch(/FieldValue|writeBatch/); });
  it('ADC: ei SA-avainta; require.main-vartija; moduuli ei käynnistä ajoa requirella', () => {
    expect(SRC).not.toMatch(/credential\.cert|serviceAccount|\.json['"]\s*\)/);
    expect(SRC).toContain('if (require.main === module)');
    expect(SRC).toContain('admin.initializeApp({ projectId: projekti })');
  });
  it('tulostaa vain lukumäärät: ei d.data()-sisältöä, nimiä tai uid:eitä console.logiin', () => {
    const logit = SRC.split('\n').filter((l) => /console\.(log|error)/.test(l)).join('\n');
    expect(logit).not.toMatch(/\.uid|\.id\b|\.email|etunimi|sukunimi|nimi\b.*data|\.data\(\)/);
  });
});
