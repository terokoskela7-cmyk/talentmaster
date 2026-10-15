/* Sibbo-valmius: sv-kattavuusraportti (tools/i18n/sv_kattavuus.mjs) + Gemini-erä 53 (docs/i18n/sv_kaannoserae_53_gemini.json).
 * Code EI kirjoita ruotsia (CLAUDE.md §0): erän 53 sv-kentät ovat tyhjiä kunnes Gemini palauttaa. */
import { describe, it, expect } from 'vitest';
import { readFileSync, readdirSync } from 'fs';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';
import { laske, NAKYMAT } from '../tools/i18n/sv_kattavuus.mjs';
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
  it('palautettu mutta viemättä (erä 19 → VP) ei mene puuttuviin', () => { const vp = T.nakymat.find((n) => n.id === 'vp'); expect(vp.palautettu).toBeGreaterThan(0); expect(vp.puuttuvat.map((r) => r.avain)).not.toContain(vp.palautetut[0].avain); });
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
  it('lib-/karttarivit ovat aidosti puuttuvia: ei sv:tä koodissa eikä Geminin palautuksessa', () => {
    const SV = (f, n) => require_(f)[n].sv, require_ = (f) => createRequire(import.meta.url)('../' + f);
    const LIB = SV('lib/tm_lib_i18n.js', 'TM_LIB_I18N'), MA = SV('lib/tm_master_i18n.js', 'TM_MASTER_I18N'), VP = SV('lib/tm_vp_i18n.js', 'TM_VP_I18N'), CO = SV('lib/tm_i18n_common.js', 'TM_I18N_COMMON');
    const palautettu = readdirSync(join(JUURI, 'docs/i18n')).filter((f) => /palautus.*\.json$/.test(f)).flatMap((f) => Object.values(lueJ('docs/i18n/' + f).osiot || {}).flatMap((o) => Object.entries(o.rivit || {}).filter(([, r]) => r && r.sv).map(([k, r]) => [k, r.fi])));
    const pAvain = new Set(palautettu.map(([k]) => k)), pFi = new Set(palautettu.map(([, f]) => f).filter(Boolean));
    for (const { osio, avain, r } of rivit.filter((x) => x.osio.startsWith('lib.'))) { expect(LIB[avain], avain).toBeUndefined(); expect(pAvain.has(avain), avain).toBe(false); }
    for (const { avain } of rivit.filter((x) => x.osio === 'master_kartta')) { expect([MA, CO, LIB].some((K) => typeof K[avain] === 'string'), avain).toBe(false); expect(pFi.has(avain), avain).toBe(false); }
    expect(Object.keys(VP).length).toBeGreaterThan(0);
  });
  it('kovakoodatut.*: rivit merkitty ei-reititetyiksi, lähde tiedosto:rivi; vain sellaiset joilla ei ole sv:tä missään kartassa', () => {
    for (const { osio, avain, r } of rivit.filter((x) => x.osio.startsWith('kovakoodatut.'))) { expect(r.tila, avain).toMatch(/EI REITITETTY/); expect(r.lahde.length, avain).toBeGreaterThan(0); for (const l of r.lahde) expect(l, avain).toMatch(/\.(html|js):\d+$/); }
    expect(Object.keys(E53.osiot).filter((o) => o.startsWith('kovakoodatut.')).sort()).toEqual(['kovakoodatut.ajonaikainen', 'kovakoodatut.harjoitusarviointi', 'kovakoodatut.suostumus']);
  });
});
import { createRequire } from 'module';
