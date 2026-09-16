/**
 * TalentMaster™ — Kaavio erä C: konsepti-/KPI-kytkentä seurakerroksen läpi.
 *
 * Kaavio ei omista konseptin tekstiä. Erä C siirtää OTSIKON LÄHTEEN kaavion omasta
 * `spec.nimi`-kartasta resolvoituun konseptiin (kaanon ⊕ seura) ja lisää `spec.kpi`:n.
 *
 *   A) validaattori — kaksitasoinen kpi-portti, puhtaus ja taaksepäinyhteensopivuus säilyvät
 *   B) sidoslib — mikä kenttä tulee mistä (jaettu erän D kanssa)
 *   C) KERROSTODISTE (runtime) — seuran konseptimuokkaus muuttaa kaavion otsikon ILMAN että
 *      kaaviota kosketaan; kaanon kääntyy sv:ksi, seuran suomi EI käänny (§32)
 *   D) kytkentä VP:hen — spec.nimi ei ole enää näyttölähde, write-path välittää resolvoidut koodit
 *
 * (C) on erän koko pointti. Lähdeskannaus todistaisi vain että funktiota kutsutaan; vasta ajo
 * osoittaa että kerros TOIMII — ja että lokalisointi menee _ttKonsepti():n eikä vpT():n kautta
 * (vpT putoaisi aina fi:hin kaanonille JA voisi kääntää seuran oman tekstin, §32-vuoto).
 */
import { describe, it, expect, beforeEach } from 'vitest';
import { readFileSync } from 'fs';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';
import { createRequire } from 'module';
import vm from 'vm';

const __dir = dirname(fileURLToPath(import.meta.url));
const require_ = createRequire(import.meta.url);
const ROOT = join(__dir, '..');
const VP = readFileSync(join(ROOT, 'TalentMaster_VP_v25.html'), 'utf8');
const VAL_SRC = readFileSync(join(ROOT, 'lib', 'tm_kaavio_validate.js'), 'utf8');
const SID_SRC = readFileSync(join(ROOT, 'lib', 'tm_kaavio_konsepti.js'), 'utf8');

const V = require_(join(ROOT, 'lib', 'tm_kaavio_validate.js'));
const S = require_(join(ROOT, 'lib', 'tm_kaavio_konsepti.js'));

// Kommenttien riisuja. Lohkokommentti (/* … */) ulottuu monelle riville, joten rivipohjainen
// suodatin ei riitä — ja näiden libien OTSIKKOKOMMENTIT nimenomaan puhuvat Firestoresta ja
// resolvoinnista selittääkseen miksi niitä EI ole koodissa.
const ilmanKommentteja = (src) => src.replace(/\/\*[\s\S]*?\*\//g, '').replace(/^\s*\/\/.*$/gm, '');

const SPEC = {
  avain: 'y_h0', suunta: 'ylos', pelimuoto: '8v8',
  pelaajat: [{ id: 'p1', joukkue: 'oma', rooli: 'vastaanottaja', x: 50, y: 50, avoin: 90 }]
};
const spec = (extra) => Object.assign({}, SPEC, extra || {});

describe('A — validaattorin kpi-portti on kaksitasoinen', () => {
  it('spec.kpi on VALINNAINEN — yleiskuva ilman KPI:tä kelpaa', () => {
    expect(V.validoiKaavio(spec()).E).toEqual([]);
    expect(V.validoiKaavio(spec({ kpi: '' })).E).toEqual([]);
  });
  it('syntaktinen portti: a–d kelpaa, muu ei', () => {
    for (const k of ['a', 'b', 'c', 'd']) expect(V.validoiKaavio(spec({ kpi: k })).E, k).toEqual([]);
    for (const k of ['e', 'A', '1', 'ab']) expect(V.validoiKaavio(spec({ kpi: k })).E.join(' '), k).toMatch(/kpi ei kelpaa/);
  });
  it('semanttinen portti vain kun ctx annetaan (jäsenyys konseptin listalla)', () => {
    expect(V.validoiKaavio(spec({ kpi: 'c' }), { kpiKoodit: ['a', 'b'] }).E.join(' ')).toMatch(/ei ole konseptin y_h0 KPI-listalla/);
    expect(V.validoiKaavio(spec({ kpi: 'a' }), { kpiKoodit: ['a', 'b'] }).E).toEqual([]);
    expect(V.validoiKaavio(spec({ kpi: 'c' })).E).toEqual([]);          // ctx puuttuu → vain syntaktinen
  });
  it('tyhjä kpiKoodit-lista + tagattu kpi → virhe (ei mihin tagata)', () => {
    expect(V.validoiKaavio(spec({ kpi: 'a' }), { kpiKoodit: [] }).E.join(' ')).toMatch(/KPI-listalla \[\]/);
    expect(V.validoiKaavio(spec(), { kpiKoodit: [] }).E).toEqual([]);   // tagaamaton kelpaa yhä
  });
  it('TAAKSEPÄINYHTEENSOPIVA: yksiargumenttinen kutsu toimii ennallaan', () => {
    expect(V.validoiKaavio(spec()).E).toEqual([]);
    expect(V.kaavioKelpaa(spec())).toBe(true);
    expect(V.kaavioKelpaa(spec({ kpi: 'z' }))).toBe(false);
  });
  it('spec.nimi-varoitus poistettu (ei enää totuuslähde), tilanne-varoitus säilyy', () => {
    expect(V.validoiKaavio(spec({ nimi: { fi: 'vain suomeksi' } })).W).toEqual([]);
    expect(V.validoiKaavio(spec({ tilanne: { fi: 'x' } })).W.join(' ')).toMatch(/tilanne\.(sv|en) puuttuu/);
  });
  it('validaattori pysyy PUHTAANA (ctx on dataa, ei riippuvuus)', () => {
    const koodi = ilmanKommentteja(VAL_SRC);
    expect(koodi).not.toMatch(/firebase|firestore|tmKonseptiResolvoi|document\./i);
  });
});

describe('B — sidoslib kertoo mikä kenttä tulee mistä', () => {
  const konsepti = { nimi: 'HAVAINNOINTI', kpi: [{ koodi: 'a', teksti: 'Sijoitu diagonaalisesti' }, { koodi: 'b', teksti: 'Pidä asento avoimena' }] };
  it('nimi konseptista, ei specistä', () => {
    expect(S.kaavioKonseptiNaytto(spec({ nimi: { fi: 'KAAVION OMA' } }), konsepti).nimi).toBe('HAVAINNOINTI');
  });
  it('kpiTeksti poimitaan koodilla; tagaamaton → tyhjä', () => {
    expect(S.kaavioKonseptiNaytto(spec({ kpi: 'b' }), konsepti).kpiTeksti).toBe('Pidä asento avoimena');
    expect(S.kaavioKonseptiNaytto(spec(), konsepti).kpiTeksti).toBe('');
  });
  it('konsepti puuttuu → nimi putoaa avaimeen (ei tyhjä otsikko)', () => {
    expect(S.kaavioKonseptiNaytto(spec(), null).nimi).toBe('y_h0');
  });
  it('kpiTuntematon erottaa "ei tagattu" ja "tagattu väärin"', () => {
    expect(S.kaavioKonseptiNaytto(spec({ kpi: 'z' }), konsepti).kpiTuntematon).toBe(true);
    expect(S.kaavioKonseptiNaytto(spec({ kpi: 'a' }), konsepti).kpiTuntematon).toBe(false);
    expect(S.kaavioKonseptiNaytto(spec(), konsepti).kpiTuntematon).toBe(false);
  });
  it('kaavioKpiKoodit palauttaa enum-koodit; tyhjä konsepti → []', () => {
    expect(S.kaavioKpiKoodit(konsepti)).toEqual(['a', 'b']);
    expect(S.kaavioKpiKoodit(null)).toEqual([]);
    expect(S.kaavioKpiKoodit({ kpi: [{ teksti: 'ilman koodia' }] })).toEqual([]);
  });
  it('lib on PUHDAS — ei resolvointia, ei kieltä, ei Firestorea', () => {
    const koodi = ilmanKommentteja(SID_SRC);
    expect(koodi).not.toMatch(/firebase|firestore|tmKonseptiResolvoi|vpT\(|document\./i);
  });
});

// ── C: RUNTIME-KERROSTODISTE ──────────────────────────────────────────────────────────────
// Ajetaan VP:n OMAT funktiot (_kaavioKonsepti/_kaavioOtsikko) yhdessä aitojen libien kanssa.
function kaavioCtx(kieli) {
  const shim = { window: {}, console };
  vm.createContext(shim);
  vm.runInContext(readFileSync(join(ROOT, 'lib', 'tm_teknistaktiset.js'), 'utf8'), shim);
  vm.runInContext(readFileSync(join(ROOT, 'lib', 'tm_teknistaktiset_sv.js'), 'utf8'), shim);
  vm.runInContext(readFileSync(join(ROOT, 'lib', 'tm_konsepti_resolve.js'), 'utf8'), shim);
  vm.runInContext(SID_SRC, shim);

  const rivit = VP.split('\n');
  const pala = (alkuEhto) => {
    const a = rivit.findIndex(alkuEhto);
    if (a < 0) throw new Error('ankkuria ei löytynyt');
    for (let i = a + 1; i < rivit.length; i++) if (rivit[i] === '}') return rivit.slice(a, i + 1).join('\n');
    throw new Error('sulkua ei löytynyt');
  };
  const src = [
    pala((l) => l.startsWith('function _kaavioKonsepti(')),
    pala((l) => l.startsWith('function _kaavioOtsikko(')),
    pala((l) => l.startsWith('function _ttKonsepti(')),
    pala((l) => l.startsWith('function _ttResolvoi(')),
    rivit.find((l) => l.startsWith('function _ttKopio(')),
    rivit.find((l) => l.startsWith('function _ttSvKartta(')),
    rivit.find((l) => l.startsWith('function _ttSvPaalla(')),
    pala((l) => l.startsWith('function _ttSv(')),
    rivit.find((l) => l.startsWith("var _TT_TEKSTIKENTAT =")),
  ].join('\n');

  const base = {
    console, Math, JSON, String, Number, Object, Array, Boolean,
    _ttSeuraId: () => 'testiseura',
    _vpTaksLang: () => kieli,
    _isDemoMode: false, _seuraId: 'testiseura'
  };
  ['TM_TT_YOUTH', 'TM_TT_JOUKKUE', 'TM_TT_FUNDAMENTIT', 'TM_TT_SV'].forEach((k) => { base[k] = shim[k] || shim.window[k]; });
  Object.keys(shim).filter((k) => /^(tmKonsepti|kaavio|TM_K_)/.test(k)).forEach((k) => { base[k] = shim[k]; });
  const ctx = vm.createContext(base);
  vm.runInContext(src, ctx);
  return { ctx, base, aseta: (kartta) => base.tmKonseptiAsetaKerros('testiseura', kartta) };
}
const otsikko = (k, s) => vm.runInContext('_kaavioOtsikko(' + JSON.stringify(s) + ')', k.ctx);

describe('C — KERROSTODISTE: seuran muokkaus vuotaa kaavioon ilman kaavion kosketusta', () => {
  it('ilman overridea otsikko on KAANONIN nimi', () => {
    const k = kaavioCtx('fi');
    k.aseta({});
    expect(otsikko(k, spec()).nimi).toBe('HAVAINNOINTI');
  });

  it('SAMA koskematon spec → seuran override vaihtaa otsikon', () => {
    const k = kaavioCtx('fi');
    const s = spec();                                  // kaaviota ei muuteta välissä
    k.aseta({});
    expect(otsikko(k, s).nimi).toBe('HAVAINNOINTI');
    k.aseta({ y_h0: { nimi: 'PÄÄN NOSTO', lahde: 'seura' } });
    expect(otsikko(k, s).nimi).toBe('PÄÄN NOSTO');     // spec identtinen, otsikko muuttui
    expect(s).toEqual(spec());                          // ja spec on todella koskematon
  });

  it('seuran KPI-teksti näkyy kaaviossa kun kaavio on tagattu siihen', () => {
    const k = kaavioCtx('fi');
    k.aseta({ y_h0: { kpi: [{ koodi: 'a', teksti: 'Seuran oma kriteeri' }], lahde: 'seura' } });
    const o = otsikko(k, spec({ kpi: 'a' }));
    expect(o.kpiTeksti).toBe('Seuran oma kriteeri');
    expect(o.kpiKoodit).toEqual(['a']);                 // write-path saa seuran listan
  });

  it('§32 sv: KAANON kääntyy ruotsiksi', () => {
    const k = kaavioCtx('sv');
    k.aseta({});
    const nimi = otsikko(k, spec()).nimi;
    expect(nimi).not.toBe('HAVAINNOINTI');              // sidecar käänsi
    expect(nimi.length).toBeGreaterThan(0);
  });

  it('§32 sv: SEURAN kirjoittama suomi EI käänny eikä katoa', () => {
    const k = kaavioCtx('sv');
    k.aseta({ y_h0: { nimi: 'PÄÄN NOSTO', lahde: 'seura' } });
    expect(otsikko(k, spec()).nimi).toBe('PÄÄN NOSTO');
  });

  it('tuntematon avain → otsikko putoaa avaimeen, loytyi=false (write-path jättää ctx:n pois)', () => {
    const k = kaavioCtx('fi');
    k.aseta({});
    const o = otsikko(k, spec({ avain: 'ei_ole_olemassa' }));
    expect(o.nimi).toBe('ei_ole_olemassa');
    expect(o.loytyi).toBe(false);
  });

  it('spec.nimi EI enää vaikuta otsikkoon (vanha dokumentti siedetään)', () => {
    const k = kaavioCtx('fi');
    k.aseta({});
    expect(otsikko(k, spec({ nimi: { fi: 'VANHA KOPIO', sv: 'x', en: 'y' } })).nimi).toBe('HAVAINNOINTI');
  });
});

describe('D — kytkentä VP_v25:een', () => {
  it('sidoslib ladataan ja validaattorin ?v nostettu (sisältö muuttui)', () => {
    expect(VP).toMatch(/lib\/tm_kaavio_konsepti\.js\?v=\d+/);
    const m = VP.match(/lib\/tm_kaavio_validate\.js\?v=(\d+)/);
    expect(Number(m[1])).toBeGreaterThanOrEqual(2);
  });
  it('kortti ja editori lukevat _kaavioOtsikko():n, EIVÄT spec.nimeä', () => {
    const i = VP.indexOf('function _kaavioKorttiHTML('), j = VP.indexOf('function _kaavioNappiHTML(');
    const kortti = VP.slice(i, j);
    expect(kortti).toContain('_kaavioOtsikko(k.spec)');
    expect(kortti).not.toContain('spec.nimi');
    const e = VP.indexOf('function _kaavioAvaaEditori('), e2 = VP.indexOf('function _kvTyokalu(');
    expect(VP.slice(e, e2)).toContain('_kaavioOtsikko(');
  });
  it('spec.nimi ei ole enää MISSÄÄN kaavio-näyttöpolussa', () => {
    const i = VP.indexOf('var _kaavioTila = {'), j = VP.indexOf('function _kaavioPointerUp(');
    expect(i).toBeGreaterThan(0);
    const lohko = VP.slice(i, j).split('\n').filter((l) => !/^\s*\/\//.test(l)).join('\n');
    expect(lohko).not.toMatch(/spec\.nimi/);
  });
  it('lokalisointi kulkee _ttKonsepti():n kautta, EI vpT():n (§32)', () => {
    const i = VP.indexOf('function _kaavioOtsikko('), j = VP.indexOf('function avaaKaaviopankki(');
    const fn = VP.slice(i, j > i ? j : i + 1200);
    expect(fn).toContain('_ttKonsepti(');
    expect(fn).not.toMatch(/vpT\(\s*(raaka|naytto|res)\./);
  });
  it('write-path välittää resolvoidut kpi-koodit, ja jättää ctx:n pois kun konseptia ei ole', () => {
    const i = VP.indexOf('async function _kaavioTallenna(');
    const fn = VP.slice(i, i + 900);
    expect(fn).toMatch(/validoiKaavio\(m\.spec,\s*_ots\.loytyi\s*\?\s*\{\s*kpiKoodit:\s*_ots\.kpiKoodit\s*\}\s*:\s*undefined\)/);
    expect(fn).toContain('tulos.E.length');            // esto ennen kirjoitusta ennallaan
  });
  it('render.js, editori.js ja rules eivät muuttuneet (rajaus)', () => {
    const r = readFileSync(join(ROOT, 'lib', 'tm_kaavio_render.js'), 'utf8');
    const e = readFileSync(join(ROOT, 'lib', 'tm_kaavio_editori.js'), 'utf8');
    const rules = readFileSync(join(ROOT, 'tm_admin', 'firestore.rules'), 'utf8');
    expect(r).not.toContain('kpi');
    expect(e).not.toContain('kpi');
    expect(rules).not.toMatch(/spec\.kpi|kaavioKpi/);
  });
});

describe('E — EI VACUOUS', () => {
  it('jos jäsenyysportti puuttuisi, väärä koodi menisi läpi', () => {
    // sama syöte ilman ctx:ää = sama tilanne kuin ennen erää C
    expect(V.validoiKaavio(spec({ kpi: 'c' })).E).toEqual([]);
    expect(V.validoiKaavio(spec({ kpi: 'c' }), { kpiKoodit: ['a'] }).E.length).toBe(1);
  });
  it('jos otsikko luettaisiin specistä, kerrostodiste ei erottaisi overridea', () => {
    const k = kaavioCtx('fi');
    const s = spec({ nimi: { fi: 'KAAVION OMA' } });
    k.aseta({ y_h0: { nimi: 'PÄÄN NOSTO', lahde: 'seura' } });
    expect(otsikko(k, s).nimi).not.toBe('KAAVION OMA');   // spec-lähde olisi antanut tämän
    expect(otsikko(k, s).nimi).toBe('PÄÄN NOSTO');
  });
});
