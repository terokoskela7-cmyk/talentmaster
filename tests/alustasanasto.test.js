/**
 * PR F — yksi §22-alustasanasto (lib/tm_alusta.js). Ennen kolme sanastoa (Testaus_v9-koodit · Pikakirjaus/Excel-vapaatekstit
 * ilman Mondoa · kehityskaaren tekstihaku) → sama alusta eri työkaluista ei ollut vertailukelpoinen.
 *   1) muunnostaulukko kaikille vanhoille arvoille (moniselitteiset → yleiskoodi, ei arvata) · tunnistamaton → 'muu'
 *   2) Mondo valittavissa kaikissa kolmessa työkalussa, valikot libistä (ei kopioita)
 *   3) ennätys + kehityskaari vertaavat KOODEJA → sama alusta eri työkaluista vertailukelpoinen; vanha data lukuhetkellä
 *   4) Pikakirjaus: koodi + nimi tallennukseen, laite muistaa valinnan, valinta pakollinen alustaherkissä testeissä
 */
import { describe, it, expect } from 'vitest';
import { readFileSync } from 'fs';
import { createRequire } from 'module';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';
import vm from 'vm';

const require = createRequire(import.meta.url);
const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..');
const lue = (f) => readFileSync(join(ROOT, f), 'utf8');
const A = require('../lib/tm_alusta.js');
const E = require('../lib/tm_ennatykset.js');
const KK = require('../lib/tm_kehityskaari.js');

describe('tmAlustaKoodi — muunnostaulukko kaikille vanhoille arvoille', () => {
  const TAULU = [
    // Testaus_v9-koodit (ennallaan) + niiden näyttönimet
    ['mondo_yleisurheilualusta', 'mondo_yleisurheilualusta'], ['Mondo / yleisurheilualusta', 'mondo_yleisurheilualusta'],
    ['sisahalli_puu', 'sisahalli_puu'], ['Sisähalli — puulattia', 'sisahalli_puu'],
    ['sisahalli_kumi', 'sisahalli_kumi'], ['Sisähalli — kumi/tartan', 'sisahalli_kumi'],
    ['keinonurmi_3g', 'keinonurmi_3g'], ['Keinonurmi (3G)', 'keinonurmi_3g'],
    ['keinonurmi_4g5g', 'keinonurmi_4g5g'], ['Keinonurmi (4G/5G)', 'keinonurmi_4g5g'],
    ['luonnonnurmi_kuiva', 'luonnonnurmi_kuiva'], ['Luonnonnurmi — kuiva', 'luonnonnurmi_kuiva'],
    ['luonnonnurmi_marka', 'luonnonnurmi_marka'], ['Luonnonnurmi — märkä', 'luonnonnurmi_marka'],
    ['muu', 'muu'], ['Muu', 'muu'], ['Muu — hiekkakenttä', 'muu'],
    // Pikakirjaus + Excel_Tuonti vapaatekstit
    ['Tekonurmi', 'keinonurmi'], ['Luonnonnurmi', 'luonnonnurmi'], ['Hiekkatekonurmi', 'keinonurmi_hiekka'], ['Halli / parketti', 'sisahalli_puu'],
    // kehityskaari/demo-lyhenteet
    ['tekonurmi', 'keinonurmi'], ['nurmi', 'luonnonnurmi'], ['halli', 'sisahalli'], ['mondo', 'mondo_yleisurheilualusta'],
    // ei tietoa / tunnistamaton
    [null, 'tuntematon'], ['', 'tuntematon'], ['tuntematon', 'tuntematon'], ['asfaltti', 'muu'],
  ];
  it.each(TAULU)('%j → %s', (sisaan, ulos) => expect(A.tmAlustaKoodi(sisaan)).toBe(ulos));
  it('moniselitteiset EIVÄT saa tarkempaa koodia (ei arvata 3G/4G/kuiva/märkä/puu) eivätkä ole valikossa', () => {
    const valittavat = A.ALUSTAT.map((a) => a.koodi);
    for (const yk of ['keinonurmi', 'luonnonnurmi', 'sisahalli', 'tuntematon']) expect(valittavat).not.toContain(yk);
    expect(A.tmAlustaSama('Tekonurmi', 'keinonurmi_3g')).toBe(false);
    expect(A.tmAlustaSama('Tekonurmi', 'tekonurmi')).toBe(true);
  });
  it('Mondo on valikon ensimmäinen; hiekkatekonurmi oma koodi; nimet libistä', () => {
    expect(A.ALUSTAT[0]).toEqual({ koodi: 'mondo_yleisurheilualusta', nimi: 'Mondo / yleisurheilualusta' });
    expect(A.ALUSTAT.map((a) => a.koodi)).toContain('keinonurmi_hiekka');
    expect(A.tmAlustaNimi('Halli / parketti')).toBe('Sisähalli — puulattia');
  });
});

describe('Mondo valittavissa kaikissa kolmessa työkalussa — valikot libistä, ei kopioita', () => {
  function taytto(src, id, iife) {
    const el = { value: '', innerHTML: '' };
    const ctx = vm.createContext({ document: { getElementById: (x) => (x === id ? el : null) }, TM_ALUSTA: A });
    const i = src.indexOf(iife); expect(i, iife).toBeGreaterThan(-1);
    vm.runInContext(src.slice(i, src.indexOf('})();', i) + 5), ctx);
    return el.innerHTML;
  }
  it('Testaus_v9: #v1-alusta täytetään libistä; ALUSTA_NIMET johdetaan libistä (ei inline-listaa)', () => {
    const T = lue('TalentMaster_Testaus_v9.html');
    const h = taytto(T, 'v1-alusta', '(function _taytaAlustaValikko()');
    expect(h).toMatch(/^<option value="">— Valitse alusta —<\/option><option value="mondo_yleisurheilualusta">Mondo \/ yleisurheilualusta<\/option>/);
    expect(T).not.toMatch(/<option value="keinonurmi_3g">/);
    expect(T).not.toMatch(/mondo_yleisurheilualusta:\s*'Mondo/);
    expect(T).toMatch(/<script src="lib\/tm_alusta\.js\?v=\d+"><\/script>/);
  });
  it('Excel_Tuonti: #pv-alusta täytetään libistä; vanha vapaatekstilista poistettu', () => {
    const X = lue('TalentMaster_Excel_Tuonti.html');
    const h = taytto(X, 'pv-alusta', '(function _taytaPvAlusta()');
    expect(h).toContain('<option value="mondo_yleisurheilualusta">Mondo / yleisurheilualusta</option>');
    expect(X).not.toContain('<option>Tekonurmi</option>');
    expect(X).toMatch(/<script src="lib\/tm_alusta\.js\?v=\d+"><\/script>/);
  });
  it('Pikakirjaus: valikko tmAlustaOptiot:lla (Mondo mukana); vanha kovakoodattu lista poistettu', () => {
    const P = lue('lib/tm_pikakirjaus.js');
    expect(P).toContain("global.TM_ALUSTA.tmAlustaOptiot(state.alusta, '(valitse alusta)')");
    expect(P).not.toContain("'Hiekkatekonurmi'");
    expect(A.tmAlustaOptiot('', '(valitse alusta)')).toContain('<option value="mondo_yleisurheilualusta">Mondo / yleisurheilualusta</option>');
    for (const f of ['TalentMaster_VP_v25.html', 'TalentMaster_Master_v16.html']) {
      const s = lue(f); expect(s.indexOf('lib/tm_alusta.js'), f).toBeGreaterThan(-1);
      expect(s.indexOf('lib/tm_alusta.js'), f + ': ennen pikakirjausta').toBeLessThan(s.indexOf('lib/tm_pikakirjaus.js'));
    }
  });
});

describe('Pikakirjaus: koodi tallennukseen, laite muistaa, valinta pakollinen', () => {
  const PK = () => { globalThis.TM_ALUSTA = A; return require('../lib/tm_pikakirjaus.js'); };
  it('payload.alusta = KOODI + alusta_nimi (kuten Testaus_v9)', () => {
    expect(PK()._alustaKentat({}, 'mondo_yleisurheilualusta')).toEqual({ alusta: 'mondo_yleisurheilualusta', alusta_nimi: 'Mondo / yleisurheilualusta' });
    expect(PK()._alustaKentat({}, '')).toEqual({});
  });
  it('muistettu alusta luetaan localStoragesta (try/catch); kelvoton arvo / estetty → tyhjä (ei oletusta "Muu")', () => {
    const vanha = globalThis.localStorage;
    try {
      globalThis.localStorage = { getItem: () => 'keinonurmi_3g' }; expect(PK()._muistettuAlusta()).toBe('keinonurmi_3g');
      globalThis.localStorage = { getItem: () => 'Tekonurmi' }; expect(PK()._muistettuAlusta()).toBe('');
      globalThis.localStorage = { getItem: () => { throw new Error('SecurityError'); } }; expect(PK()._muistettuAlusta()).toBe('');
    } finally { globalThis.localStorage = vanha; }
  });
  it('alustaherkät testit: tallennus estetään ilman alustaa; valinta muistetaan', () => {
    const P = lue('lib/tm_pikakirjaus.js');
    expect(P).toContain("if (K.tmOnkoAlustaherkka(state.testit) && !state.alusta) { toast('Valitse testialusta");
    expect(P).toContain('state.alusta = al.value; _muistaAlusta(al.value);');
    expect(P).toContain('alusta: _muistettuAlusta()');
  });
});

describe('Vertailu koodeina: sama alusta eri työkaluista on vertailukelpoinen (vanha data lukuhetkellä)', () => {
  it('ennätys: Testaus_v9 "mondo_yleisurheilualusta" vs vanha Pikakirjaus "Mondo / yleisurheilualusta" → parannus kirjautuu, tallennus koodina', () => {
    const r = E.paivitaEnnatykset({ lin30m: { paras: 4.3, pvm: '2026-09-01', alusta: 'Mondo / yleisurheilualusta' } },
      [{ testi: 'lin30m', arvo: 4.0, pvm: '2026-10-04', alusta: 'mondo_yleisurheilualusta' }]);
    expect(r.ennatykset.lin30m).toEqual({ paras: 4.0, pvm: '2026-10-04', alusta: 'mondo_yleisurheilualusta', edellinen: 4.3 });
    expect(r.uudet).toEqual(['lin30m']);
  });
  it('ennätys: "Halli / parketti" (Pikakirjaus) ≡ sisahalli_puu (Testaus_v9); eri alusta (Mondo vs keinonurmi_3g) → ei vertailua', () => {
    expect(E.paivitaEnnatykset({ lin30m: { paras: 4.3, alusta: 'Halli / parketti' } }, [{ testi: 'lin30m', arvo: 4.0, alusta: 'sisahalli_puu' }]).uudet).toEqual(['lin30m']);
    expect(E.paivitaEnnatykset({ lin30m: { paras: 4.3, alusta: 'mondo_yleisurheilualusta' } }, [{ testi: 'lin30m', arvo: 4.0, alusta: 'keinonurmi_3g' }]).uudet).toEqual([]);
    expect(E.paivitaEnnatykset(null, [{ testi: 'lin30m', arvo: 4.0, alusta: 'Mondo / yleisurheilualusta' }]).ennatykset.lin30m.alusta).toBe('mondo_yleisurheilualusta');
  });
  it('kehityskaari: Testaus_v9-koodi + Pikakirjauksen vanha teksti samalla Mondolla → "30 m nopeutui" (ei virheellistä segmentointia)', () => {
    const esc = (s) => String(s);
    const h = KK.tmKaariRenderPelaaja({ hh_historia: [{ pvm: '2026-09-01', lin30m: 4.3, alusta: 'mondo_yleisurheilualusta' }, { pvm: '2026-10-04', lin30m: 4.0, alusta: 'Mondo / yleisurheilualusta' }] }, { esc });
    expect(h).toContain('30 m nopeutui');
    const eri = KK.tmKaariRenderPelaaja({ hh_historia: [{ pvm: '2026-09-01', lin30m: 4.3, alusta: 'mondo_yleisurheilualusta' }, { pvm: '2026-10-04', lin30m: 4.0, alusta: 'Tekonurmi' }] }, { esc });
    expect(eri, 'eri alusta → segmentoitu (§22)').not.toContain('30 m nopeutui');
  });
  it('Pelaaja näyttää alustan nimenä (t("alusta.<koodi>")), ei raakakoodia; fi + en olemassa, sv odotuslistalla', () => {
    const P = lue('TalentMaster_Pelaaja_v7.html');
    // AJETAAN oikea koodi (live-probe löysi: kortin paikallinen `t` varjosti t():n → TypeError alustan kanssa)
    const pura = (tun) => { const i = P.indexOf(tun); let syv = 0; for (let k = P.indexOf('{', i); k < P.length; k++) { if (P[k] === '{') syv++; else if (P[k] === '}') { syv--; if (!syv) return P.slice(i, k + 1); } } };
    const LANGM = require('../lib/tm_lang.js');
    const ctx = vm.createContext({ t: LANGM.t, tmAlustaKoodi: A.tmAlustaKoodi, tmAlustaNimi: A.tmAlustaNimi, Math, Number, String, Object, Array, isNaN, window: {} });
    vm.runInContext([pura('function _thEsc('), pura('function _kkEnnatysTiedot('), pura('function _ennLuku('), pura('function _kkAlustaNimi('), pura('function _ennRivit('),
      pura('function _kkEnnatyksetHTML(')].join('\n') + '\nthis.f = _kkEnnatyksetHTML;', ctx);
    const kortti = ctx.f({ ennatykset: { lin30m: { paras: 3.12, alusta: 'mondo_yleisurheilualusta' }, cmj: { paras: 30, alusta: 'Halli / parketti' } } }, '2_rakentaja');
    expect(kortti).toContain('Oma paras · Mondo / yleisurheilualusta');
    expect(kortti).toContain('Oma paras · Sisähalli — puulattia');
    expect(kortti).not.toContain('mondo_yleisurheilualusta<');
    const L = require('../lib/tm_lang.js').TM_LANG;
    for (const a of A.ALUSTAT.concat(Object.keys(A.YLEISKOODIT).map((k) => ({ koodi: k })))) {
      expect(L.fi.alusta[a.koodi], a.koodi).toBeTruthy(); expect(L.en.alusta[a.koodi], a.koodi).toBeTruthy();
      expect(L.sv.alusta && L.sv.alusta[a.koodi], 'sv vain Gemini').toBeUndefined();
    }
    expect(require('./tm_lang_sv_odotuslista.cjs')).toContain('alusta.mondo_yleisurheilualusta');
  });
});
