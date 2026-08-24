/**
 * TalentMaster™ — i18n V1-B: Vanhempi_v2 irrotus + kielivalitsin (ei rinnakkaista i18n:ää → ei konsolidointia).
 * Kovakoodattu suomi → t('vanhempi.*') / nav.* / auth.*. Kielivalitsin fi/sv/en (rLogin + rAsetukset), draw()-re-render.
 * §7.22 (perhe-pinta): vahvuus ensin, ei vertailua/uhkaa/tasolukuja — sv ei tuo uhkakehystä. fi ei rikkoudu (fallback).
 */
import { describe, it, expect } from 'vitest';
import { readFileSync } from 'fs';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';
import { createRequire } from 'module';

const __dir = dirname(fileURLToPath(import.meta.url));
const require = createRequire(import.meta.url);
const L = require('../lib/tm_lang.js');
const V = readFileSync(join(__dir, '..', 'TalentMaster_Vanhempi_v2.html'), 'utf8');

const VKEYS = ['perhe_kirjautuminen', 'kieli', 'tervetulo_hei', 'tervetulo_johdanto', 'kultainen_otsikko', 'kultainen_teksti',
  'nain_mukana', 'selva', 'ohita', 'asetukset_alaotsikko', 'pelaajan_kirjautuminen', 'kopioi', 'lapsen_ikaryhma'];
const NAVKEYS = ['koti', 'viikko', 'viestit', 'kortti', 'asetukset'];

describe('tm_lang — vanhempi.* + nav.* fi/sv/en', () => {
  ['fi', 'sv', 'en'].forEach((k) => {
    it(`${k}: kaikki vanhempi.*-avaimet ei-tyhjinä`, () => {
      expect(VKEYS.filter((x) => typeof L.TM_LANG[k].vanhempi[x] !== 'string' || !L.TM_LANG[k].vanhempi[x].trim())).toEqual([]);
    });
    it(`${k}: nav-tabit (koti/viikko/viestit/kortti/asetukset)`, () => {
      expect(NAVKEYS.filter((x) => typeof L.TM_LANG[k].nav[x] !== 'string')).toEqual([]);
    });
  });
  it('t() palauttaa oikean kielen (johdanto ilman nimen taivutusta, V1-B2)', () => {
    L.tmAsetaKieli('sv', false); expect(L.t('vanhempi.perhe_kirjautuminen')).toBe('Familj · Vårdnadshavarens inloggning');
    expect(L.t('vanhempi.tervetulo_johdanto')).toContain('ditt barns');   // V1-B2: nimen taivutus poistettu
    L.tmAsetaKieli('en', false); expect(L.t('nav.koti')).toBe('Home');
    L.tmAsetaKieli('fi', false); expect(L.t('vanhempi.kieli')).toBe('Kieli');
  });
  it('§7.22: kultainen_teksti on anti-vertailu (ei uhkaa) kaikilla kielillä', () => {
    ['fi', 'sv', 'en'].forEach((k) => {
      const s = L.TM_LANG[k].vanhempi.kultainen_teksti.toLowerCase();
      expect(/kaverei|kompisar|friends/.test(s)).toBe(true);   // "ei kavereihin" -kehys säilyy
    });
  });
});

describe('Vanhempi_v2 — irrotus t():hen', () => {
  it('rTabs nav-labelit t(nav.*)', () => {
    NAVKEYS.forEach((k) => expect(V).toContain("l:t('nav." + k + "')"));
  });
  it('rLogin: otsikko + placeholderit (auth.*) + kielivalitsin', () => {
    expect(V).toContain("${t('vanhempi.perhe_kirjautuminen')}");
    expect(V).toContain('placeholder="${t(\'auth.sahkoposti\')}"');
    expect(V).toContain('placeholder="${t(\'auth.salasana\')}"');
    expect(V).toContain('${_vanhKieliValitsinHTML()}');
  });
  it('_naytaVanhTervetulo: staattiset tekstit t():hen (§7.1 string-concat)', () => {
    expect(V).toContain("t('vanhempi.tervetulo_hei')");
    expect(V).toContain("t('vanhempi.tervetulo_johdanto')");   // V1-B2: ilman { gen: gen } (nimen taivutus poistettu)
    expect(V).toContain("t('vanhempi.kultainen_teksti')");
    expect(V).toContain("t('vanhempi.selva')");
  });
  it('rAsetukset: otsikot + kopioi + kielivalitsin', () => {
    expect(V).toContain("${t('vanhempi.asetukset_alaotsikko')}");
    expect(V).toContain("${t('vanhempi.pelaajan_kirjautuminen')}");
    expect(V).toContain("${t('vanhempi.kopioi')}");
    expect(V).toContain("${t('vanhempi.lapsen_ikaryhma')}");
  });
});

describe('Vanhempi_v2 — kielivalitsin FI/SV/EN + cache-bust', () => {
  it('valitsin-helper + _vanhVaihdaKieli → tmAsetaKieli(true) + draw', () => {
    expect(V).toContain('function _vanhKieliValitsinHTML()');
    expect(V).toContain('window._vanhVaihdaKieli = function(k){');
    expect(V).toContain('tmAsetaKieli(k, true)');
    expect(V).toContain('if (typeof draw === \'function\') draw();');
  });
  it('kieli-init latauksessa (tmKieliInitSeura) + FI/SV/EN-napit', () => {
    expect(V).toContain('if (typeof tmKieliInitSeura === \'function\') tmKieliInitSeura(null);');
    expect(V).toContain("nappi('fi','FI')");
    expect(V).toContain("nappi('sv','SV')");
    expect(V).toContain("nappi('en','EN')");
  });
  it('tm_lang ?v=2 + SW-cache v7', () => {
    expect(V).toMatch(/lib\/tm_lang\.js\?v=[2-9]/);
    expect(readFileSync(join(__dir, '..', 'sw_vanhempi.js'), 'utf8')).toMatch(/const CACHE = 'tm-vanhempi-v([7-9]|[1-9]\d)'/);
  });
});
