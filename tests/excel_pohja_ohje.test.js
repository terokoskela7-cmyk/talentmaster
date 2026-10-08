/**
 * Excel-pohja ja tuonnin ohje (1.10.2026): Syntymävuosi * pakolliseksi, "OHJE SIHTEEREILLE" kerran,
 * dropdown-lupaukset pois, yksi nimi ("Lataa Excel-pohja" / "Tuo pelaajat Excelistä"), ohjemodaalin uudet tekstit.
 */
import { describe, it, expect } from 'vitest';
import { readFileSync } from 'fs';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';
import { createRequire } from 'module';
import vm from 'vm';

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..');
const SEURA = readFileSync(join(ROOT, 'TalentMaster_Seura.html'), 'utf8');
const require_ = createRequire(import.meta.url);
const pura = (t) => { const a = SEURA.indexOf(t); if (a < 0) throw new Error(t); let d = 0; for (let j = SEURA.indexOf(') {', a) + 2; j < SEURA.length; j++) { if (SEURA[j] === '{') d++; else if (SEURA[j] === '}') { d--; if (!d) return SEURA.slice(a, j + 1); } } throw new Error(t); };

function apurit() {
  const ctx = { String, Number, Date, Object, RegExp };
  ctx.tmHT = ctx.tmHT || function (s) { return s; }; vm.createContext(ctx);
  vm.runInContext(pura('function _tmSyntymaVuosi(v) {') + '\n' + pura('function _tkKieli(avain, kieli, fi, muuttujat) {') + '\n' + pura('function _tk(avain, fi, muuttujat) {'), ctx);
  return ctx;
}

describe('_tmSyntymaVuosi', () => {
  const { _tmSyntymaVuosi } = apurit();
  it.each([['2014', 2014], [2014, 2014], [' 2015 ', 2015], ['14', null], ['', null], [null, null], ['1980', null],
    [String(new Date().getFullYear() + 1), null], ['20l4', null], ['2014.5', null]])('%j → %j', (v, o) => expect(_tmSyntymaVuosi(v)).toBe(o));
});

describe('lataaRekisteriPohja (ajettu SheetJS-tyngällä)', () => {
  async function aja() {
    const lehdet = {}; const toastit = []; const nappi = { textContent: '', disabled: false };
    const XLSX = { utils: { book_new: () => ({}), aoa_to_sheet: (aoa) => ({ aoa }), book_append_sheet: (wb, ws, nimi) => { lehdet[nimi] = ws.aoa; } }, writeFile() {} };
    const joukkueet = { docs: [{ id: 'kpv_u13', data: () => ({ nimi: 'KPV U13' }) }, { id: 'kpv_t18', data: () => ({ nimi: 'KPV T18' }) }] };
    const ctx = {
      XLSX, tila: { seuraId: 'kpv', seuraNimi: 'KPV' }, naytaToast: (t, l) => toastit.push([t, l]), console: { error() {} },
      document: { querySelector: () => nappi }, Date, Set, Promise, Object, String, Array, Number, RegExp,
      db: { collection: () => ({ doc: () => ({ collection: (k) => (k === 'joukkueet'
        ? { orderBy: () => ({ get: async () => joukkueet }), get: async () => joukkueet }
        : { get: async () => ({ docs: [] }) }) }) }) },
    };
    ctx.tmHT = ctx.tmHT || function (s) { return s; }; vm.createContext(ctx);
    vm.runInContext(pura('function _tkKieli(avain, kieli, fi, muuttujat) {') + '\n' + pura('function _tk(avain, fi, muuttujat) {') + '\n' + pura('async function lataaRekisteriPohja() {'), ctx);
    await ctx.lataaRekisteriPohja();
    return { lehdet, toastit, nappi };
  }
  it('Pelaajat: Syntymävuosi * kolmantena; OHJE SIHTEEREILLE kerran; ei dropdown-lupausta; joukkue kopioidaan Asetuksista', async () => {
    const { lehdet } = await aja();
    const P = lehdet.Pelaajat;
    expect(P[0].slice(0, 5)).toEqual(['Etunimi *', 'Sukunimi *', 'Syntymävuosi *', 'Joukkue * (katso Asetukset-välilehti)', 'Huoltajan sähköposti *']);
    const kaikki = JSON.stringify(P);
    expect((kaikki.match(/OHJE SIHTEEREILLE/g) || []).length).toBe(1);
    expect(kaikki).not.toMatch(/dropdown/i);
    expect(kaikki).toContain('2.  Joukkue: kopioi nimi Asetukset-välilehdeltä (seuran joukkueet valmiina).');
    expect(kaikki).toContain('Syntymävuosi: neljä numeroa');
  });
  it('Esimerkki: samat sarakkeet + syntymävuosi; esimerkkiosoite säilyy (tuonti hylkää sen)', async () => {
    const { lehdet } = await aja();
    const E = lehdet.Esimerkki;
    expect(E[0]).toEqual(lehdet.Pelaajat[0].slice(0, E[0].length));
    expect(E[1].slice(0, 5)).toEqual(['Matti', 'Meikäläinen', 2014, 'KPV T18', 'huoltaja@example.com']);
    expect(E[2][2]).toBe(2015);
  });
  it('toast: "Excel-pohja ladattu – N joukkuetta Asetukset-välilehdellä"; nappi palautuu nimellä Lataa Excel-pohja', async () => {
    const { toastit, nappi } = await aja();
    expect(toastit).toEqual([['✅ Excel-pohja ladattu – 2 joukkuetta Asetukset-välilehdellä', 'ok']]);
    expect(nappi.textContent).toBe('⬇ Lataa Excel-pohja');
  });
});

describe('tuonti: syntymävuosi pakollinen', () => {
  it('sarake luetaan, puuttuva/virheellinen → keltainen varoitus esikatselussa, riviä ei tuoda, lasketaan yhteenvetoon', () => {
    expect(SEURA).toContain("const iVuosi    = etsiSarake('Syntymävuosi', 'syntymavuosi');");
    expect(SEURA).toContain("syntymaVuosi:  _tmSyntymaVuosi(iVuosi >= 0 ? r[iVuosi] : ''),");
    expect(SEURA).toContain(".map(r => Object.assign(r, { _eiVuotta: r.syntymaVuosi == null }))");
    expect(SEURA).toContain(": p._eiVuotta ? tmHT('⚠️ Syntymävuosi puuttuu – riviä ei tuoda')");
    expect(SEURA).toContain('if (p._eiVuotta) { eiVuotta++; continue; }');
    expect(SEURA).toContain('`${eiVuotta} ei tuotu (syntymävuosi puuttuu tai virheellinen)`');
    expect(SEURA).toContain("syntymaVuosi:  p.syntymaVuosi,   // numerona (§7.11)");
    expect(SEURA).toContain("'⚠️ Pohjasta puuttuu Syntymävuosi-sarake – lataa uusi Excel-pohja.'");
  });
  it('olemassa oleva pelaaja ohitetaan tuonnissa (ei päivitystä) → tyhjä vuosi ei voi nollata mitään', () => {
    const i = SEURA.indexOf('async function ajaExcelTuonti(');
    const runko = SEURA.slice(i, SEURA.indexOf('\nfunction toggleSivupalkki', i));
    expect(runko).not.toMatch(/pelaajat'\)\.doc\([^)]*\)\.update\(/);
  });
});

describe('nimet ja ohjemodaali', () => {
  const modaali = SEURA.slice(SEURA.indexOf('<div class="modalTausta" id="rekisteriOhjeModal">'), SEURA.indexOf('<!-- HUOMIOLAATIKKO: PalloID -->'));
  it('ei dropdown-lupauksia, ei "Massakutsu automaattisesti", ei "sininen sarake"', () => {
    expect(modaali).not.toMatch(/dropdown|Massakutsu automaattisesti|sininen sarake/i);
    expect(SEURA).not.toContain('valmiina dropdownissa');
  });
  it('yksi nimi: Lataa Excel-pohja · Tuo pelaajat Excelistä', () => {
    expect(SEURA).not.toContain('📨 Tuo Excel → lähetä kutsut');
    expect(SEURA).not.toMatch(/>\s*⬇️? Lataa rekisteripohja/);
    expect(SEURA).toContain("📨 ${_tk('seura.tuo_pelaajat_excelista', 'Tuo pelaajat Excelistä')}");
    expect(SEURA).toContain("⬇ ${_tk('seura.lataa_excel_pohja', 'Lataa Excel-pohja')}");
  });
  it('modaalin tekstit = briefin tekstit; jokainen data-tm-k-avain löytyy tm_langista fi + en + sv', () => {
    global.window = {};
    require_(join(ROOT, 'lib', 'tm_lang.js'));
    const L = global.window.TM_LANG;
    const SV = require_(join(ROOT, 'tests', 'tm_lang_sv_odotuslista.cjs'));
    const avaimet = [...modaali.matchAll(/data-tm-k="([^"]+)">([^<]+)</g)];
    expect(avaimet.length).toBeGreaterThanOrEqual(12);
    for (const [, avain, fi] of avaimet) {
      const k = avain.split('.')[1];
      expect(L.fi.seura[k], avain).toBe(fi.trim());
      expect(L.en.seura[k], avain).toBeTruthy();
      expect(typeof L.sv.seura[k], avain).toBe('string');   // Gemini-ruotsinnos 1.10.2026
      expect(SV).not.toContain(avain);
    }
    expect(L.fi.seura.excel_v3_teksti).toBe('Paina Minulla on täytetty Excel → Tuo järjestelmään. Tarkista esikatselu: punaiset rivit eivät tuonnissa mene läpi. Valitse Tuo vain, jos haluat lähettää kutsut myöhemmin, tai Tuo + lähetä kutsut, jolloin huoltajat saavat suostumuspyynnön sähköpostiin heti.');
    delete global.window;
  });
  it('vanha staattinen pohja (ilman syntymävuotta) poistettu', () => {
    expect(SEURA).not.toContain('async function lataaExcelMalli(');
    expect(SEURA).not.toContain('raw.githubusercontent.com/terokoskela7-cmyk/talentmaster/main/TalentMaster_Pelaajarekisteri.xlsx');
  });
});
