/* kattavuus_skriptit.js: V8-kattavuuden luokitus (EI_KUTSUTTU / VAHAN / KAYTOSSA), ylätason osuus, nimet, erät, vartijat — synteettinen data, ei selainta eikä verkkoa. */
import { describe, it, expect } from 'vitest';
import { createRequire } from 'module';
const require = createRequire(import.meta.url);
const K = require('../scripts/kuorma/kattavuus_skriptit.js');

// lähde: 100 merkkiä; ylätaso 0–100; sisäfunktiot: a 20–50, b 60–90
const lahde = 'window.tmX = {};\n' + 'x'.repeat(83);   // 100
const F = (aCount, bCount) => [
  { functionName: '', ranges: [{ startOffset: 0, endOffset: 100, count: 1 }, { startOffset: 20, endOffset: 50, count: aCount }, { startOffset: 60, endOffset: 90, count: bCount }] },
  { functionName: 'a', ranges: [{ startOffset: 20, endOffset: 50, count: aCount }] },
  { functionName: 'b', ranges: [{ startOffset: 60, endOffset: 90, count: bCount }] },
];
describe('kattavuus_skriptit', () => {
  it('analysoiSkripti: vain ylätaso ajettu → kutsuttuja 0, käytetty 40 % (100 − 30 − 30), ylätaso 40 %', () => {
    const a = K.analysoiSkripti(lahde, F(0, 0));
    expect(a.kutsuttuja).toBe(0); expect(a.funktioita).toBe(2); expect(a.kaytetty_pct).toBe(40); expect(a.ylataso_pct).toBe(40);
  });
  it('analysoiSkripti: yksi sisäfunktio ajettu → kutsuttuja 1, käytetty 70 %, ylätaso edelleen 40 %', () => {
    const a = K.analysoiSkripti(lahde, F(3, 0));
    expect(a.kutsutut_nimet).toEqual(['a×3']); expect(a.kutsuttuja).toBe(1); expect(a.kaytetty_pct).toBe(70); expect(a.ylataso_pct).toBe(40);
  });
  it('ylatasonNimet: window.-asetus, function, var', () => {
    expect(K.ylatasonNimet('window.tmA = 1;\nfunction foo() {}\nvar bar = 2;\n')).toEqual(['tmA', 'foo', 'bar']);
  });
  it('analysoi: vain oman hostin .js (lib/, docs/, juuri); ulkoiset (gstatic) ja inline pois; luokat ja järjestys; koodattu kt resurssilistasta', () => {
    const H = 'https://talentmaster-staging--kuorma-x.web.app/';
    const cov = [{ url: H + 'lib/tm_a.js?v=abc', source: lahde, functions: F(0, 0) }, { url: H + 'lib/tm_b.js', source: lahde, functions: F(3, 0) }, { url: H + 'harjoitelogiikka_v4.js', source: lahde, functions: [{ functionName: '', ranges: [{ startOffset: 0, endOffset: 100, count: 1 }] }, { functionName: 'k', ranges: [{ startOffset: 5, endOffset: 55, count: 9 }] }] },
      { url: 'https://www.gstatic.com/firebasejs/9.22.1/firebase-app-compat.js', source: lahde, functions: F(1, 1) }, { url: '', source: lahde, functions: F(1, 1) }];
    const res = [{ url: H + 'lib/tm_a.js', tyyppi: 'Script', koodattu: 51200 }, { url: H + 'lib/tm_b.js', tyyppi: 'Script', koodattu: 10240 }, { url: H + 'harjoitelogiikka_v4.js', tyyppi: 'Script', koodattu: 20480 }];
    const r = K.analysoi(cov, res);
    expect(r.map((x) => x.skripti + ':' + x.luokka)).toEqual(['lib/tm_a.js:EI_KUTSUTTU', 'harjoitelogiikka_v4.js:KAYTOSSA', 'lib/tm_b.js:KAYTOSSA']);
    expect(r[0].koodattu_kt).toBe(50); expect(r[0].nimet).toEqual(['tmX']);
  });
  it('VAHAN: kutsuttu mutta < 10 % tavuista ajettu', () => {
    const f = [{ functionName: '', ranges: [{ startOffset: 0, endOffset: 100, count: 0 }, { startOffset: 0, endOffset: 5, count: 1 }] }, { functionName: 'k', ranges: [{ startOffset: 2, endOffset: 5, count: 1 }] }];
    const r = K.analysoi([{ url: 'https://talentmaster-staging.web.app/lib/v.js', source: lahde, functions: f }], []);
    expect(r[0].luokka).toBe('VAHAN');
  });
  it('eraehdotus: vain EI_KUTSUTTU, iso ensin, erä täyttyy rajasta (kt)', () => {
    const rivit = [{ luokka: 'EI_KUTSUTTU', skripti: 'a.js', koodattu_kt: 60 }, { luokka: 'EI_KUTSUTTU', skripti: 'b.js', koodattu_kt: 50 }, { luokka: 'EI_KUTSUTTU', skripti: 'c.js', koodattu_kt: 10 }, { luokka: 'KAYTOSSA', skripti: 'd.js', koodattu_kt: 99 }];
    expect(K.eraehdotus(rivit, 100)).toEqual([{ era: 1, kt: 110, skriptit: ['a.js', 'b.js'] }, { era: 2, kt: 10, skriptit: ['c.js'] }]);
  });
  it('main-vartijat: ei stagingia / ei tokenia / tuntematon profiili → virhekoodi 2, ei selainta', async () => {
    const v = []; const d = (env) => ({ virhe: (x) => v.push(x), kirjaa: () => {}, env });
    expect(await K.main(['--url=https://talentmaster-pilot.web.app'], d({ STAGING_APPCHECK_DEBUG_TOKEN: 'x' }))).toBe(2);
    expect(await K.main(['--url=https://talentmaster-staging--k.web.app'], d({}))).toBe(2); expect(v.join('\n')).toMatch(/STAGING_APPCHECK_DEBUG_TOKEN/);
    expect(await K.main(['--url=https://talentmaster-staging--k.web.app', '--profiili=tabletti'], d({ STAGING_APPCHECK_DEBUG_TOKEN: 'x' }))).toBe(2);
    expect(v.join('\n')).not.toContain('x\n');
  });
  it('eratarkistus: ei riviä = EI_LADATTU (ok); KAYTOSSA = ✗; EI_KUTSUTTU = ladattu mutta ei käytetty', () => {
    const r = K.eratarkistus([{ skripti: 'lib/a.js', luokka: 'KAYTOSSA' }, { skripti: 'lib/b.js', luokka: 'EI_KUTSUTTU' }], ['lib/a.js', 'lib/b.js', 'lib/c.js']);
    expect(r.map((x) => x.tila + ':' + x.ok)).toEqual(['KAYTOSSA:false', 'EI_KUTSUTTU:null', 'EI_LADATTU:true']);
    expect(K.lueArgv(['--rooli=valmentaja1', '--era=lib/a.js,lib/b.js']).era).toEqual(['lib/a.js', 'lib/b.js']);
  });
  it('IIFE/UMD-kääre (≥ 80 % skriptistä) ei ole kutsu: pelkkä kääre ajettu → kutsuttuja 0 → EI_KUTSUTTU (korjaus 22.11.: aiemmin 1/N = vain kääre)', () => {
    const f = [{ functionName: '', ranges: [{ startOffset: 0, endOffset: 100, count: 1 }] }, { functionName: '', ranges: [{ startOffset: 5, endOffset: 95, count: 1 }] }, { functionName: 'api', ranges: [{ startOffset: 10, endOffset: 30, count: 0 }] }];
    const a = K.analysoiSkripti(lahde, f); expect(a.kutsuttuja).toBe(0); expect(a.funktioita).toBe(1);
    expect(K.analysoi([{ url: 'https://talentmaster-staging.web.app/lib/u.js', source: lahde, functions: f }], [])[0].luokka).toBe('EI_KUTSUTTU');
  });
});
