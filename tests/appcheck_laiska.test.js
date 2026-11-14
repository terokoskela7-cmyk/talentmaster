/* A1 · laiska reCAPTCHA (lib/tm_appcheck.js, yksi paikka). Vanha käytös: ReCaptchaEnterpriseProvider.initialize() latasi reCAPTCHA-skriptin (~353 kt) HETI activate():ssa
   myös silloin, kun voimassa oleva token oli IndexedDB:ssä. Nyt initialize() ajetaan vasta ensimmäisessä provider.getToken():ssa (= kun tokenia ei ole).
   ENFORCE pysyy: kääre ei keksi tokenia eikä ohita getToken():ia; virhe kulkee SDK:lle; tokenin puuttuminen varoitetaan konsolissa. */
import { describe, it, expect, beforeEach } from 'vitest';
import { createRequire } from 'module';
import vm from 'vm';
import fs from 'fs';
const require = createRequire(import.meta.url);
const KOODI = fs.readFileSync('lib/tm_appcheck.js', 'utf8');

/* Tosi ReCaptchaEnterpriseProvider (SDK:n oma luokka) vain rajapinnan olemassaolon vahtiin; käytös ajetaan tynkäproviderilla (ei verkkoa). */
function ajaa(opts) {
  opts = opts || {}; const loki = [], varoitukset = [], tilat = { init: 0, getToken: 0 };
  class Provider {
    constructor(k) { this.k = k; }
    initialize(app) { tilat.init++; loki.push('initialize:' + app.name); }
    async getToken() { tilat.getToken++; loki.push('provider.getToken'); if (opts.tokenVirhe) throw new Error('recaptcha-error'); return { token: 'UUSI', expireTimeMillis: 1 }; }
  }
  const appCheckInst = {
    activate(provider) { this.provider = provider; if (typeof provider.initialize === 'function') provider.initialize({ name: '[DEFAULT]' }); },
    /* SDK:n käytös: voimassa oleva token välimuistista → ei provider-kutsua; muuten provider.getToken() */
    async getToken() { if (opts.valimuistissa) return { token: 'VALIMUISTI' }; try { return await this.provider.getToken(); } catch (e) { return { token: 'dummy', error: e }; } },
  };
  const appCheckFn = () => appCheckInst; appCheckFn.ReCaptchaEnterpriseProvider = Provider;
  const win = { firebase: { appCheck: appCheckFn }, console: { log: (m) => loki.push('log:' + m), warn: (...a) => varoitukset.push(a.join(' ')) }, Promise, self: {}, location: { hostname: 'tm.example' }, localStorage: { getItem: () => null }, Error };
  win.window = win; const ctx = vm.createContext(win); vm.runInContext(KOODI, ctx);
  return { win, loki, varoitukset, tilat, appCheckInst };
}
const odota = () => new Promise((r) => setTimeout(r, 5));

describe('A1 · laiska reCAPTCHA', () => {
  it('voimassa oleva token välimuistissa → reCAPTCHAa (provider.initialize) EI ajeta lainkaan', async () => {
    const a = ajaa({ valimuistissa: true }); expect(a.win.tmAppCheckAktivoi()).toBe(true); await odota();
    expect(a.tilat.init).toBe(0); expect(a.tilat.getToken).toBe(0); expect(a.win.tmAppCheckTila().recaptcha).toBe('odottaa'); expect(a.win.tmAppCheckTila().token).toBe(true);
    expect(a.varoitukset).toEqual([]);
  });
  it('ei tokenia (kylmä) → esihaku käynnistää reCAPTCHAn heti activate():n jälkeen: initialize ENNEN provider.getToken, kumpikin kerran', async () => {
    const a = ajaa(); a.win.tmAppCheckAktivoi(); await odota();
    expect(a.tilat.init).toBe(1); expect(a.tilat.getToken).toBe(1);
    expect(a.loki.filter((x) => !/^log:/.test(x))).toEqual(['initialize:[DEFAULT]', 'provider.getToken']); expect(a.win.tmAppCheckTila().recaptcha).toBe('ladataan');
    await a.appCheckInst.provider.getToken(); expect(a.tilat.init).toBe(1);   // myöhemmät uusinnat eivät alusta uudelleen
  });
  it('ENFORCE: tokenin saanti epäonnistuu → varoitus konsoliin, virhe ei katoa eikä tokenia keksitä', async () => {
    const a = ajaa({ tokenVirhe: true }); a.win.tmAppCheckAktivoi(); await odota();
    expect(a.varoitukset.some((v) => /tokenia ei saatu/.test(v) && /ENFORCE/.test(v))).toBe(true); expect(a.win.tmAppCheckTila().token).toBe(false);
    await expect(a.appCheckInst.provider.getToken()).rejects.toThrow('recaptcha-error');   // kääre ei niele virhettä
  });
  it('provider ilman sisäistä rajapintaa → eager-varapolku + varoitus (ei kaada appia)', async () => {
    const a = ajaa(); a.win.firebase.appCheck.ReCaptchaEnterpriseProvider = class { constructor(k) { this.k = k; } };
    expect(a.win.tmAppCheckAktivoi()).toBe(true); expect(a.win.tmAppCheckTila().recaptcha).toBe('eager'); expect(a.varoitukset.some((v) => /laiska lataus pois/.test(v))).toBe(true);
  });
  it('SDK:n oma ReCaptchaEnterpriseProvider-luokka tarjoaa yhä initialize/getToken-rajapinnan, jonka päälle kääre nojaa (versionnostovahti)', () => {
    const { ReCaptchaEnterpriseProvider } = require('@firebase/app-check'), p = new ReCaptchaEnterpriseProvider('k');
    expect(typeof p.initialize).toBe('function'); expect(typeof p.getToken).toBe('function'); expect(p.initialize.length).toBe(1);
  });
  it('lähde: yksi paikka, site key ennallaan, esihaku aktivoinnin jälkeen', () => {
    expect(KOODI).toContain("6Lf3tbstAAAAAE9fqxhiH9WltKEdT4NuJBXF0kjq"); expect(KOODI).toMatch(/new firebase\.appCheck\.ReCaptchaEnterpriseProvider\(TM_APPCHECK_SITE_KEY\)/);
    expect(KOODI.indexOf('appCheck.activate(provider, true)')).toBeLessThan(KOODI.indexOf('_tmAppCheckEsihaku(appCheck);'));   // v3-merkkijono-activate: tests/appcheck_kytkenta.test.js
  });
});
