/* Sibbo-valmius: sv-kattavuusraportti (tools/i18n/sv_kattavuus.mjs) + Gemini-erä 53 (docs/i18n/sv_kaannoserae_53_gemini.json).
 * Code EI kirjoita ruotsia (CLAUDE.md §0): erän 53 sv-kentät ovat tyhjiä kunnes Gemini palauttaa. */
import { describe, it, expect } from 'vitest';
import { readFileSync, readdirSync } from 'fs';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';
import { laske, NAKYMAT } from '../tools/i18n/sv_kattavuus.mjs';
const require_ = createRequire(import.meta.url);
const JUURI = join(dirname(fileURLToPath(import.meta.url)), '..'), lueJ = (f) => JSON.parse(readFileSync(join(JUURI, f), 'utf8'));
const T = laske(join(JUURI, 'docs/i18n/sv_lapiajo_tulos.json'));
const E53 = lueJ('docs/i18n/sv_kaannoserae_53_gemini.json');

describe('kattavuusraportti', () => {
  it('kaikki brieffin näkymät mukana', () => { expect(NAKYMAT.map((n) => n.id)).toEqual(['pelaaja', 'vanhempi', 'master', 'vp', 'adar', 'harjoitusarviointi', 'suostumus', 'toimintakortti', 'kehitystyopoyta']); });
  it('jokainen avain on tasan yhdessä tilassa: ok + puuttuu + odottaa + palautettu = avaimia', () => { for (const n of T.nakymat) expect(n.ok + n.puuttuu + n.odottaa + n.palautettu, n.id).toBe(n.avaimia); });
  it('erät 51 ja 52 on viety (sv_kaannoserae_5{1,2}_palautus): niiden avaimet eivät ole puuttuvia eikä odottavia', () => {
    const avaimet = [51, 52].flatMap((n) => Object.values(lueJ('docs/i18n/sv_kaannoserae_' + n + '_palautus.json').osiot).flatMap((o) => Object.keys(o.rivit)));
    expect(avaimet).toHaveLength(134);
    for (const n of T.nakymat) { expect(n.puuttuvat.filter((r) => avaimet.includes(r.avain)), n.id).toEqual([]); expect(n.odottavat.filter((r) => avaimet.includes(r.avain)), n.id).toEqual([]); }
  });
  it('tm_lang: ei puuttuvia sv-polkuja kenellekään (Pelaaja, Vanhempi, suostumus)', () => { for (const id of ['pelaaja', 'vanhempi', 'suostumus']) expect(T.nakymat.find((n) => n.id === id).puuttuvat.filter((r) => r.lahde === 'tm_lang')).toEqual([]); });
  it('erän 19 VP-rivit ja erä 53 on viety (Sibbo-reititys): ei puuttuvia eikä palautettu-viemättä -tilaa', () => { for (const n of T.nakymat) { expect(n.palautettu, n.id).toBe(0); expect(n.puuttuu, n.id).toBe(0); } });
});

describe('Gemini-erä 53', () => {
  const rivit = Object.entries(E53.osiot).flatMap(([osio, o]) => Object.entries(o.rivit).map(([avain, r]) => ({ osio, avain, r })));
  it('rakenne kuten erät 51/52: _tiedosto + osiot[osio]{_konteksti,_lahde,rivit{avain:{fi,sv}}}', () => {
    expect(E53._tiedosto).toMatch(/erä 53/); for (const [osio, o] of Object.entries(E53.osiot)) { expect(o._konteksti, osio).toBeTruthy(); expect(o._lahde, osio).toBeTruthy(); }
    for (const { osio, avain, r } of rivit) { expect(typeof r.fi, osio + ':' + avain).toBe('string'); expect(r.fi.trim().length).toBeGreaterThan(0); expect('sv' in r, osio + ':' + avain).toBe(true); }
    expect(E53._rivit_yhteensa).toBe(rivit.length);
  });
  it('sv tyhjä kaikilla (Code ei kirjoita ruotsia)', () => { for (const { osio, avain, r } of rivit) expect(r.sv, osio + ':' + avain).toBe(''); });
  it('ei erien 51/52 sisältöä (avainta tai suomenkielistä tekstiä)', () => {
    const era = [51, 52].flatMap((n) => Object.values(lueJ('docs/i18n/sv_kaannoserae_' + n + '_gemini.json').osiot).flatMap((o) => Object.entries(o.rivit)));
    const avaimet = new Set(era.map(([k]) => k)), fit = new Set(era.map(([, r]) => r.fi));
    for (const { osio, avain, r } of rivit.filter((x) => x.osio !== 'vientipohja')) { expect(avaimet.has(avain), osio + ':' + avain).toBe(false); expect(fit.has(r.fi), osio + ':' + avain).toBe(false); }
  });
  it('kovakoodatut.*: rivit merkitty ei-reititetyiksi, lähde tiedosto:rivi; vain sellaiset joilla ei ole sv:tä missään kartassa', () => {
    for (const { osio, avain, r } of rivit.filter((x) => x.osio.startsWith('kovakoodatut.'))) { expect(r.tila, avain).toMatch(/EI REITITETTY/); expect(r.lahde.length, avain).toBeGreaterThan(0); for (const l of r.lahde) expect(l, avain).toMatch(/\.(html|js):\d+$/); }
    expect(Object.keys(E53.osiot).filter((o) => o.startsWith('kovakoodatut.')).sort()).toEqual(['kovakoodatut.ajonaikainen', 'kovakoodatut.harjoitusarviointi', 'kovakoodatut.suostumus']);
  });
});
import { createRequire } from 'module';

describe('Gemini-erä 54 (Sibbo-reititys)', () => {
  const E54 = JSON.parse(readFileSync(join(JUURI, 'docs/i18n/sv_kaannoserae_54_gemini.json'), 'utf8')), r54 = Object.entries(E54.osiot).flatMap(([osio, o]) => Object.entries(o.rivit).map(([avain, r]) => ({ osio, avain, r })));
  it('rakenne kuten aiemmat erät; sv tyhjä kaikilla (Code ei kirjoita ruotsia)', () => {
    expect(E54._tiedosto).toMatch(/erä 54/); expect(E54._rivit_yhteensa).toBe(r54.length); expect(Object.keys(E54.osiot).sort()).toEqual(['lib.tm_harjoitusarviointi', 'master_kartta', 'tm_lang', 'vientipohja']);
    for (const [osio, o] of Object.entries(E54.osiot)) { expect(o._konteksti, osio).toBeTruthy(); expect(o._lahde, osio).toBeTruthy(); }
    for (const { osio, avain, r } of r54) { expect(typeof r.fi, osio + ':' + avain).toBe('string'); expect(r.sv, osio + ':' + avain).toBe(''); }
  });
  it('ei toista erän 53 rivejä (avain tai fi-teksti), ei myöskään erien 51/52', () => {
    const vanhat = [51, 52, 53].flatMap((n) => Object.values(JSON.parse(readFileSync(join(JUURI, 'docs/i18n/sv_kaannoserae_' + n + '_gemini.json'), 'utf8')).osiot).flatMap((o) => Object.entries(o.rivit)));
    const avaimet = new Set(vanhat.map(([k]) => k)), fit = new Set(vanhat.map(([, r]) => r.fi));
    for (const { osio, avain, r } of r54.filter((x) => x.osio !== 'vientipohja')) { expect(avaimet.has(avain), osio + ':' + avain).toBe(false); if (osio !== 'tm_lang') expect(fit.has(r.fi), osio + ':' + avain).toBe(false); }   // tm_lang-avain tarvitsee oman sv-rivinsä, vaikka sama suomi olisi jo toisessa kartassa
  });
  it('tm_lang-rivit = sv-odotuslistan suostumus.*-avaimet, fi/en täsmäävät tm_lang.js:ään', () => {
    const L = require_('../lib/tm_lang.js').TM_LANG, hae = (k, p) => p.split('.').reduce((o, x) => (o == null ? undefined : o[x]), L[k]), odotus = require_('./tm_lang_sv_odotuslista.cjs');
    expect(Object.keys(E54.osiot.tm_lang.rivit).sort()).toEqual(odotus.slice().sort());
    for (const [p, r] of Object.entries(E54.osiot.tm_lang.rivit)) { expect(r.fi, p).toBe(hae('fi', p)); expect(r.en, p).toBe(hae('en', p)); }
  });
  it('lib.tm_harjoitusarviointi: avain = fi; jokaiselta puuttuu sv vähintään yhdestä ketjusta (masterT/vpT) ja löytyy lomakkeen lähteestä; master_kartta: Masterin ketjusta puuttuu', () => {
    const ha = readFileSync(join(JUURI, 'lib/tm_harjoitusarviointi.js'), 'utf8'), LIB = require_('../lib/tm_lib_i18n.js').TM_LIB_I18N.sv, MA = require_('../lib/tm_master_i18n.js').TM_MASTER_I18N.sv, VP = require_('../lib/tm_vp_i18n.js').TM_VP_I18N.sv, CO = require_('../lib/tm_i18n_common.js').TM_I18N_COMMON.sv;
    const on = (K, k) => [K, CO, LIB].some((x) => typeof x[k] === 'string' && x[k]);
    for (const [k, r] of Object.entries(E54.osiot['lib.tm_harjoitusarviointi'].rivit)) { expect(r.fi).toBe(k); expect(ha.indexOf(k.replace(/'/g, "\\'")), k).toBeGreaterThan(-1); expect(on(MA, k) && on(VP, k), k).toBe(false); }
    for (const k of Object.keys(E54.osiot.master_kartta.rivit)) expect(on(MA, k), k).toBe(false);
  });
  it('vientipohja: täsmälleen valinnaiset tekstit (kuittaus-aliakset + ohje_5v)', () => { expect(Object.keys(E54.osiot.vientipohja.rivit).sort()).toEqual(require_('../scripts/vientipohja_kieli.js').VALINNAISET.slice().sort()); });
  it('DoD: harjoitusarviointi, suostumus ja kehitystyöpöytä = ok / odottaa (erä 54), ei kovakoodattuja rivejä, ei "puuttuu"', () => {
    const T2 = laske(join(JUURI, 'docs/i18n/sv_lapiajo_tulos.json'));
    for (const id of ['harjoitusarviointi', 'suostumus', 'kehitystyopoyta']) { const n = T2.nakymat.find((x) => x.id === id); expect(n.puuttuu, id).toBe(0); expect(n.kovakoodattuStaattinen, id).toEqual([]); expect(n.ok + n.odottaa, id).toBe(n.avaimia); }
    expect(T2.nakymat.find((x) => x.id === 'harjoitusarviointi').odottaa).toBe(34);
  });
});
