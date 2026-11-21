/* App Check -aktivointi on IDEMPOTENTTI (20.11.2026: tuotannon konsolissa "[AppCheck] aktivoitu (enterprise, appi [DEFAULT])" kahdesti samassa latauksessa).
   Selvitys: yhdessä dokumentissa aktivointi tapahtuu kerran (jokaisella sivulla 1 skriptilataus + 1 kutsu, vartija alla). Kaksi riviä syntyy, kun sivu upottaa toisen sivun iframeen
   (Kehitystyöpöytä → Masterin ?upotettu=taktiikka) — kumpikin dokumentti on oma ikkunansa ja aktivoituu oikein itse. Silti: tila siirrettiin window-rekisteriin, jotta skriptin tuplalataus
   samassa ikkunassa ei nollaa sitä, ja loki kertoo kontekstin (ylin ikkuna / iframe). Tämä tiedosto vartioi sekä käytöstä että sivujen latausmääriä. */
import { describe, it, expect } from 'vitest';
import { readFileSync, readdirSync, statSync } from 'fs';
import { join } from 'path';
import vm from 'vm';

const ROOT = join(__dirname, '..');
const KOODI = readFileSync(join(ROOT, 'lib/tm_appcheck.js'), 'utf8');

/* Tynkä-SDK: laskee activate-kutsut per appi. top: window = ylin ikkuna, muu = iframe. */
function ymparisto(opts) {
  opts = opts || {}; const loki = [], aktivoinnit = [];
  class Provider { constructor(k) { this.k = k; } initialize() {} async getToken() { return { token: 'T', expireTimeMillis: 1 }; } }
  const instanssi = (nimi) => ({ activate(p) { aktivoinnit.push(nimi); if (typeof p.initialize === 'function') p.initialize({ name: nimi }); }, async getToken() { return { token: 'T' }; } });
  const oletus = instanssi('[DEFAULT]'), appCheckFn = () => oletus; appCheckFn.ReCaptchaEnterpriseProvider = Provider;
  const win = { firebase: { appCheck: appCheckFn }, console: { log: (m) => loki.push(m), warn: () => {} }, Promise, self: {}, location: { hostname: 'tm.example' }, localStorage: { getItem: () => null } };
  win.window = win; win.top = opts.iframe ? {} : win;
  const ctx = vm.createContext(win); vm.runInContext(KOODI, ctx);
  return { win, ctx, loki, aktivoinnit, nimetty: (nimi) => ({ name: nimi, appCheck: () => instanssi(nimi) }), lataaUudelleen: () => vm.runInContext(KOODI, ctx) };
}

describe('tmAppCheckAktivoi: idempotentti per appi per ikkuna', () => {
  it('toinen kutsu samalle apille: true, ei uutta activate():a eikä uutta lokiriviä', () => {
    const e = ymparisto();
    expect(e.win.tmAppCheckAktivoi()).toBe(true); expect(e.win.tmAppCheckAktivoi()).toBe(true); expect(e.win.tmAppCheckAktivoi()).toBe(true);
    expect(e.aktivoinnit).toEqual(['[DEFAULT]']); expect(e.loki.filter((m) => m.indexOf('[AppCheck] aktivoitu') === 0).length).toBe(1);
  });
  it('skriptin TUPLALATAUS samassa ikkunassa ei nollaa tilaa: toinen aktivointi ei tapahdu, tmAppCheckTila pysyy aktivoituna', () => {
    const e = ymparisto(); e.win.tmAppCheckAktivoi(); e.lataaUudelleen();
    expect(e.win.tmAppCheckTila().aktivoitu).toBe(true);   // tila säilyi (ennen: var-uudelleenmäärittely nollasi)
    expect(e.win.tmAppCheckAktivoi()).toBe(true); expect(e.aktivoinnit).toEqual(['[DEFAULT]']); expect(e.loki.filter((m) => m.indexOf('[AppCheck] aktivoitu') === 0).length).toBe(1);
  });
  it('nimetyt apit aktivoidaan kukin KERRAN (oletusappi ei kata nimettyä, nimetty ei estä oletusta)', () => {
    const e = ymparisto(), a = e.nimetty('tm-pelaaja'), b = e.nimetty('tm-vanhempi');
    e.win.tmAppCheckAktivoi(a); e.win.tmAppCheckAktivoi(a); e.win.tmAppCheckAktivoi(b); e.win.tmAppCheckAktivoi(); e.win.tmAppCheckAktivoi();
    expect(e.aktivoinnit.slice().sort()).toEqual(['[DEFAULT]', 'tm-pelaaja', 'tm-vanhempi']);
  });
  it('loki erottaa kontekstin: ylin ikkuna vs iframe (kaksi riviä samassa konsolissa selittyy)', () => {
    const ylin = ymparisto(); ylin.win.tmAppCheckAktivoi(); expect(ylin.loki.find((m) => m.indexOf('[AppCheck] aktivoitu') === 0)).toMatch(/^\[AppCheck\] aktivoitu \(enterprise, appi \[DEFAULT\], ylin ikkuna, dok [a-z0-9]+(, nav \w+)?\)$/);
    const ifr = ymparisto({ iframe: true }); ifr.win.tmAppCheckAktivoi(); expect(ifr.loki.find((m) => m.indexOf('[AppCheck] aktivoitu') === 0)).toMatch(/^\[AppCheck\] aktivoitu \(enterprise, appi \[DEFAULT\], iframe, dok [a-z0-9]+(, nav \w+)?\)$/);
  });
  it('aktivointi, joka epäonnistuu (SDK puuttuu), ei merkitse appia aktivoiduksi → uusi yritys sallittu', () => {
    const e = ymparisto(); const fb = e.win.firebase; e.win.firebase = {};
    expect(e.win.tmAppCheckAktivoi()).toBe(false); e.win.firebase = fb; expect(e.win.tmAppCheckAktivoi()).toBe(true); expect(e.aktivoinnit).toEqual(['[DEFAULT]']);
  });
});

describe('staattinen: jokaisella sivulla yksi lataus ja yksi aktivointikutsu (ei tuplaa samassa dokumentissa)', () => {
  const sivut = readdirSync(ROOT).filter((n) => n.endsWith('.html') && statSync(join(ROOT, n)).isFile() && /lib\/tm_appcheck\.js/.test(readFileSync(join(ROOT, n), 'utf8')));
  it('löytyy elävät sivut', () => { expect(sivut.length).toBeGreaterThan(15); });
  for (const n of sivut) {
    it(n + ': tm_appcheck.js ladataan kerran; tmAppCheckAktivoi( kutsutaan enintään kerran (modulaariset sivut käyttävät TM_APPCHECK_SITE_KEY:tä)', () => {
      const s = readFileSync(join(ROOT, n), 'utf8'), lataukset = (s.match(/src="lib\/tm_appcheck\.js/g) || []).length, kutsut = (s.match(/tmAppCheckAktivoi\(/g) || []).length;
      expect(lataukset, 'lataukset').toBe(1); expect(kutsut, 'kutsut').toBeLessThanOrEqual(1);
    });
  }
  it('Master: kutsu vain pääskriptissä, ei kopiona toisessa tiedostossa (L6: pääskripti irrotetaan deployssa — kutsu lähtee mukana, ei monistu)', () => {
    const html = readFileSync(join(ROOT, 'TalentMaster_Master_v16.html'), 'utf8');
    expect((html.match(/tmAppCheckAktivoi\(\)/g) || []).length).toBe(1);
    for (const f of readdirSync(join(ROOT, 'lib')).filter((x) => x.endsWith('.js') && x !== 'tm_appcheck.js')) expect(readFileSync(join(ROOT, 'lib', f), 'utf8'), f).not.toMatch(/tmAppCheckAktivoi\(/);
  });
});
