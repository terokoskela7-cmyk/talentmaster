/* PR 4 · vartija kaikille sovelluksille: jokainen TalentMaster_*.html, joka lataa tm_tekniikka.js:n tai tm_fyysinen.js:n, lataa MYÖS tm_joukkuesaanto.js:n ja tm_normisto.js:n ENNEN niitä
   (tm_normisto → tm_joukkuesaanto → tm_tekniikka → tm_fyysinen), ja PWA-sivuilla tiedostot ovat SW:n allowlistissä. Puuttuva riippuvuus tai väärä järjestys kaataa testin.
   + ei hiljaista oletusta: TM_NORMISTO puuttuu selaimesta → console.warn (+ Sentry) ja tila "ei dataa". */
import { describe, it, expect, vi } from 'vitest';
import { readFileSync, readdirSync, existsSync } from 'fs';
import { createRequire } from 'module';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';
import vm from 'vm';
const require = createRequire(import.meta.url);
const juuri = join(dirname(fileURLToPath(import.meta.url)), '..');
const SIVUT = readdirSync(juuri).filter((f) => /^TalentMaster_.*\.html$/.test(f)), lue = (f) => readFileSync(join(juuri, f), 'utf8');
const skriptit = (h) => [...h.matchAll(/<script[^>]+src="([^"?]+)(?:\?[^"]*)?"/g)].map((m) => m[1]);
const KAYTTAJAT = SIVUT.filter((f) => { const s = skriptit(lue(f)); return s.includes('lib/tm_tekniikka.js') || s.includes('lib/tm_fyysinen.js'); });
const ORDER = ['lib/tm_normisto.js', 'lib/tm_joukkuesaanto.js', 'lib/tm_tekniikka.js', 'lib/tm_fyysinen.js'];

describe('lataus: riippuvuudet ja järjestys jokaisessa sovelluksessa', () => {
  it('vartija ei ole tyhjä: VP, Master ja Pelaaja_v7 käyttävät libejä', () => { for (const f of ['TalentMaster_VP_v25.html', 'TalentMaster_Master_v16.html', 'TalentMaster_Pelaaja_v7.html']) expect(KAYTTAJAT).toContain(f); });
  for (const f of KAYTTAJAT) {
    it(f + ': tm_normisto → tm_joukkuesaanto → tm_tekniikka (→ tm_fyysinen) latautuvat tässä järjestyksessä; tm_eerikkila_normit ja tm_phv_tila mukana', () => {
      const s = skriptit(lue(f)), idx = (x) => s.indexOf(x);
      const kaytetyt = ORDER.filter((x) => x === 'lib/tm_normisto.js' || x === 'lib/tm_joukkuesaanto.js' || s.includes(x) || x === 'lib/tm_tekniikka.js');
      for (const x of ['lib/tm_normisto.js', 'lib/tm_joukkuesaanto.js', 'lib/tm_eerikkila_normit.js', 'lib/tm_phv_tila.js']) expect(idx(x), f + ' puuttuu ' + x).toBeGreaterThanOrEqual(0);
      const ennen = [...kaytetyt.filter((x) => idx(x) >= 0)]; for (let i = 1; i < ennen.length; i++) expect(idx(ennen[i - 1]), f + ': ' + ennen[i - 1] + ' ennen ' + ennen[i]).toBeLessThan(idx(ennen[i]));
      if (s.includes('lib/tm_fyysinen.js')) expect(s.includes('lib/tm_tekniikka.js'), f + ': tm_fyysinen vaatii tm_tekniikka:n').toBe(true);
    });
  }
  it('PWA-sivut (Service Worker): kolme kerrosta + riippuvuudet SW:n allowlistissä; Pelaaja_v7 → sw_pelaaja.js', () => {
    const pwa = SIVUT.filter((f) => KAYTTAJAT.includes(f) && /sw_[a-z]+\.js/.test(lue(f)));
    expect(pwa).toContain('TalentMaster_Pelaaja_v7.html');
    for (const f of pwa) {
      const swTiedosto = lue(f).match(/(sw_[a-z]+\.js)/)[1], sw = lue(swTiedosto), on = new Function(sw.slice(sw.indexOf('function onAllowlist'), sw.indexOf("self.addEventListener('fetch'")) + ';return onAllowlist;')();
      const omat = skriptit(lue(f)).filter((x) => /^lib\/tm_(normisto|joukkuesaanto|tekniikka|fyysinen|koti_luvut|eerikkila_normit|phv_tila)\.js$/.test(x));
      expect(omat.filter((x) => !on('https://x/talentmaster/' + x)), f + ' → ' + swTiedosto + ' allowlist').toEqual([]);
    }
  });
});

describe('ei hiljaista oletusta: TM_NORMISTO puuttuu selaimesta', () => {
  const lataaSelaimessa = (libit, sentry) => {
    const varoitukset = [], viestit = [], ikkuna = { console: { warn: (m) => varoitukset.push(String(m)), log() {}, error() {} }, Date, Math, JSON };
    if (sentry) ikkuna.Sentry = { captureMessage: (m, taso) => viestit.push([String(m), taso]) };
    ikkuna.window = ikkuna; vm.createContext(ikkuna);
    for (const f of libit) vm.runInContext(readFileSync(join(juuri, f), 'utf8'), ikkuna);
    return { ikkuna, varoitukset, viestit };
  };
  const PERUS = ['lib/tm_eerikkila_normit.js', 'lib/tm_phv_tila.js', 'lib/tm_idp.js', 'lib/tm_koti_luvut.js'];   // EI tm_normisto.js
  const pel = { id: 'p', syntymaVuosi: 2012, sukupuoli: 'M', joukkue: 'P14', tki_viimeisin: 20, tki_pvm: '2026-09-15', hh_viimeisin: { kasirata: 99 }, hh_pvm: '2026-09-15' }, NYT = Date.UTC(2026, 9, 10, 12);
  it('tm_tekniikka: console.warn kerran + Sentry; tulos "ei dataa" (ei oletusta)', () => {
    const { ikkuna, varoitukset, viestit } = lataaSelaimessa(PERUS.concat(['lib/tm_joukkuesaanto.js', 'lib/tm_tekniikka.js']), true);
    const r = ikkuna.TM_TEKNIIKKA.tmTekniikkaMittari(pel, NYT); ikkuna.TM_TEKNIIKKA.tmTekniikkaMittari(pel, NYT);
    expect(r).toMatchObject({ tila: 'ei_dataa', eiDataaSyy: 'normisto_tuntematon' }); expect(varoitukset.filter((v) => /tm_tekniikka: TM_NORMISTO puuttuu/.test(v))).toHaveLength(1);
    expect(viestit.some(([m, t]) => /tm_tekniikka: TM_NORMISTO puuttuu/.test(m) && t === 'warning')).toBe(true);
  });
  it('tm_fyysinen ja tm_joukkuesaanto: sama varoitus; ilman Sentryä vain console.warn (ei kaadu)', () => {
    const { ikkuna, varoitukset } = lataaSelaimessa(PERUS.concat(['lib/tm_joukkuesaanto.js', 'lib/tm_tekniikka.js', 'lib/tm_fyysinen.js']), false);
    expect(ikkuna.TM_FYSINEN.tmFyysinenPelaaja(pel, NYT)).toMatchObject({ tila: 'ei_dataa' }); expect(ikkuna.TM_JOUKKUESAANTO.tmJoukkueSaanto({ yht: 10, mitattu: 10, kehityskohteita: 5 }).luokka).toBe('ei_luokkaa');
    expect(varoitukset.some((v) => /tm_fyysinen: TM_NORMISTO puuttuu/.test(v))).toBe(true); expect(varoitukset.some((v) => /tm_joukkuesaanto: TM_NORMISTO puuttuu/.test(v))).toBe(true);
  });
  it('kun tm_normisto.js on ladattu: ei varoitusta ja luokitus toimii', () => {
    const { ikkuna, varoitukset } = lataaSelaimessa(PERUS.concat(['lib/tm_normisto.js', 'lib/tm_joukkuesaanto.js', 'lib/tm_tekniikka.js', 'lib/tm_fyysinen.js']), true);
    expect(ikkuna.TM_TEKNIIKKA.tmTekniikkaMittari(pel, NYT).kehityskohde).toBe(true); expect(ikkuna.TM_FYSINEN.tmFyysinenPelaaja(pel, NYT).tila).toBe('kehityskohde'); expect(varoitukset).toEqual([]);
  });
  it('harjoitelogiikka: ilman normistoa kohdevalinta putoaa oletukseen JA varoitus tulee (ei hiljaa)', () => {
    const { ikkuna, varoitukset } = lataaSelaimessa(PERUS.concat(['lib/tm_joukkuesaanto.js', 'lib/tm_tekniikka.js', 'lib/tm_fyysinen.js', 'harjoitelogiikka_v4.js']), false);
    expect(ikkuna.laskeTekninenKehityskohde({ ...pel, tki_viimeisin: undefined }, NYT).lahde).toBe('ikavaihe'); expect(varoitukset.some((v) => /TM_NORMISTO puuttuu/.test(v))).toBe(true);
  });
});
