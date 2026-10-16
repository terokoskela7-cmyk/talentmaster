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
  it('DoD: harjoitusarviointi, suostumus ja kehitystyöpöytä = ok (erä 54 viety), ei kovakoodattuja rivejä, ei "puuttuu"', () => {
    const T2 = laske(join(JUURI, 'docs/i18n/sv_lapiajo_tulos.json'));
    for (const id of ['harjoitusarviointi', 'suostumus', 'kehitystyopoyta']) { const n = T2.nakymat.find((x) => x.id === id); expect(n.puuttuu, id).toBe(0); expect(n.kovakoodattuStaattinen, id).toEqual([]); const e56 = id === 'suostumus' ? Object.keys(JSON.parse(readFileSync(join(JUURI, 'docs/i18n/sv_kaannoserae_56_gemini.json'), 'utf8')).osiot.tm_lang.rivit).length : 0; expect(n.ok + e56, id).toBe(n.avaimia); expect(n.odottaa, id).toBe(e56); }   // erä 54 vietiin; erä 55 (suostumus vaihe 1) vietiin; suostumus: erän 56 (tietosuojaikkuna) rivit odottavat Geminiä/Teron tarkistusta
  });
});
