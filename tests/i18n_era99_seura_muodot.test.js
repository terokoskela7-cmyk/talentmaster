/* B12 (PM 8.11.2026) — erä 99: --osio=seura_muodot (scripts/i18n_era_seura_muodot.cjs). Tekstit, joita sv-läpiajo ei näe fixture-tiloista:
 * kehitystilanteen ensinäkymän muut muodot, Talentit-taso LAAJENNETTU ja Seuran kirjautumissivu; --savutesti lisää tuotannon Seura-löydökset.
 * Code EI kirjoita ruotsia (CLAUDE.md §0): testit tarkistavat rakenteen, lähderivit ja kontekstin, eivät sv-sisältöä. */
import { describe, it, expect, afterAll } from 'vitest';
import { spawnSync } from 'child_process';
import { mkdtempSync, writeFileSync, readFileSync, rmSync, existsSync } from 'fs';
import { createRequire } from 'module';
import { tmpdir } from 'os';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

const juuri = join(dirname(fileURLToPath(import.meta.url)), '..');
const req = createRequire(import.meta.url);
const SKRIPTI = join(juuri, 'scripts/i18n_luo_gemini_era.cjs');
const aja = (...args) => spawnSync(process.execPath, [SKRIPTI, ...args], { cwd: juuri, encoding: 'utf8' });
const tmp = mkdtempSync(join(tmpdir(), 'b12-era99-'));
afterAll(() => rmSync(tmp, { recursive: true, force: true }));
const { muotoRivit, MUODOT, KONTEKSTI } = req('../scripts/i18n_era_seura_muodot.cjs');
const ERA = JSON.parse(readFileSync(join(juuri, 'docs/i18n/sv_kaannoserae_99_gemini.json'), 'utf8'));
const O = ERA.osiot.seura_muodot, R = O.rivit;
const sv = (f, n) => req('../' + f)[n].sv;
const SEURAN_KARTAT = [sv('lib/tm_i18n_common.js', 'TM_I18N_COMMON'), sv('lib/tm_henkilosto_i18n.js', 'TM_HENKILOSTO_I18N')];

describe('erä 99 (docs/i18n/sv_kaannoserae_99_gemini.json)', () => {
  it('vain osio seura_muodot; 121 riviä; sv tyhjä; konteksti mukana; = rakentajan tulos nyt (ei käsin muokattu)', () => {
    expect(Object.keys(ERA.osiot)).toEqual(['seura_muodot']);
    expect(Object.keys(R)).toHaveLength(121); expect(ERA._rivit_yhteensa).toBe(121);
    for (const [k, r] of Object.entries(R)) { expect(r.fi, k).toBe(k); expect(r.sv, k).toBe(''); }
    expect(O._konteksti).toBe(KONTEKSTI);
    expect(JSON.stringify(muotoRivit({ juuri }).rivit)).toBe(JSON.stringify(R));
  });
  it('jokaisella rivillä on näkymä, elementti ja todellinen lähderivi, joka on koodissa (ei keksittyjä rivejä)', () => {
    for (const [k, r] of Object.entries(R)) {
      expect(r.nakyma.length, k).toBeGreaterThan(0); expect(r.elementti, k).toBeTruthy();
      const m = /^(.+):(\d+)$/.exec(r.lahde); expect(m, k).toBeTruthy();
      const rivi = readFileSync(join(juuri, m[1]), 'utf8').split('\n')[Number(m[2]) - 1].replace(/\s+/g, ' ');
      expect(rivi, k).toContain(r.lahde_rivi.slice(0, 40).replace(/^\S*\s/, ''));
    }
  });
  it('ei rivejä, joilla on jo sv kartassa, josta Seura lukee: ne ovat _lahde.jo_kartassa_vain_reititys -listalla', () => {
    for (const k of Object.keys(R)) for (const m of SEURAN_KARTAT) expect(typeof m[k] === 'string' && m[k] !== '', k).toBe(false);
    expect(O._lahde.jo_kartassa_vain_reititys.sort()).toEqual(['Kausikuva tallennettu', 'Kirjaa ›', 'Salasana', 'Seura ja rakenteet', 'Seuran omat tavoitteet', 'Sähköposti']);
    for (const k of O._lahde.jo_kartassa_vain_reititys) expect(SEURAN_KARTAT.some((m) => typeof m[k] === 'string' && m[k]), k).toBe(true);
  });
  it('PM:n hyväksymät kohdat ovat mukana (#1226:n lista)', () => {
    for (const k of ['Kirjaa testikierros joukkueelle {joukkue} – fyysisen kehityksen luku tarkentuu.', '{p} pelaajista kehittyy fyysisesti, tavoite {t}.',
      'kevät {v}', 'syksy {v}', 'vertailu {kehikko}', 'Täyttynyt', 'Raiteilla', 'Riskissä', 'Puuttuu', 'Seura on menossa oikeaan suuntaan.',
      'Sulje ‹', 'Piilota kaikki luvut ‹', 'Pojat', 'Tytöt', 'ⓘ Miten luvut lasketaan', 'Valmennuksen laatu', 'LAAJENNETTU']) expect(R, k).toHaveProperty([k]);
    // kirjautumissivun 5 tekstiä: 3 erässä, 2 jo yhteisessä kartassa (vain reititys)
    expect(Object.keys(R).filter((k) => R[k].nakyma.includes('Kirjautuminen')).sort()).toEqual(['Jos työsähköposti estää linkin, pyydä valmennuspäällikköä jakamaan se WhatsAppilla.', 'Unohditko salasanan?', 'vp@seura.fi']);
    const base = JSON.parse(readFileSync(join(juuri, 'tools/i18n/sv_lapiajo_baseline.json'), 'utf8')).tekstit;
    for (const k of ['Sähköposti', 'Salasana', 'Unohditko salasanan?', 'Jos työsähköposti estää linkin, pyydä valmennuspäällikköä jakamaan se WhatsAppilla.', 'vp@seura.fi']) expect(base, k).toContain(k.toLowerCase());
  });
  it('paikkamerkit {x} selitetty: jokaisella paikkamerkkirivillä on huomautus', () => {
    for (const [k, r] of Object.entries(R)) if (/\{\w+\}/.test(k)) expect((r.huom || []).length, k).toBeGreaterThan(0);
  });
  it('viite_sv vain olemassa olevasta kartasta (Code ei kirjoita ruotsia)', () => {
    const kartat = { TM_VP_I18N: sv('lib/tm_vp_i18n.js', 'TM_VP_I18N'), TM_MASTER_I18N: sv('lib/tm_master_i18n.js', 'TM_MASTER_I18N'), TM_LIB_I18N: sv('lib/tm_lib_i18n.js', 'TM_LIB_I18N') };
    for (const [k, r] of Object.entries(R)) if (r.viite_sv) { expect(kartat[r.viite_sv.lahde], k).toBeTruthy(); expect(kartat[r.viite_sv.lahde][k], k).toBe(r.viite_sv.sv); }
  });
});

describe('seura_muodot-rakentaja', () => {
  it('neula, jota ei ole koodissa → virhe (ei riviä)', () => {
    MUODOT.push(['Tätä ei ole koodissa', 'X', 'Y']);
    try { const t = muotoRivit({ juuri }); expect(t.virheet).toEqual([expect.stringContaining('Tätä ei ole koodissa')]); expect(t.rivit).not.toHaveProperty(['Tätä ei ole koodissa']); }
    finally { MUODOT.pop(); }
  });
  it('--savutesti: tuotannon Seura-näkymien sv-löydökset lisätään; fi-näkymät, muut sovellukset ja jo kartassa olevat ohitetaan', () => {
    const savutesti = { nakymat: [
      { nimi: 'Seura Talentit', kieli: 'sv', sv: { uudet: ['Uusi tuotantoteksti 3 kpl', 'LAAJENNETTU'] } },
      { nimi: 'Seura Pelaajat', kieli: 'fi', sv: { uudet: ['Ei tämä'] } },
      { nimi: 'VP Koti', kieli: 'sv', sv: { uudet: ['Eikä tämä'] } },
      { nimi: 'Seura Yhteenveto', kieli: 'sv', sv: { uudet: ['Seura ja rakenteet'] } },
    ] };
    const t = muotoRivit({ juuri, savutesti });
    expect(t.virheet).toEqual([]);
    expect(t.rivit['Uusi tuotantoteksti 3 kpl']).toMatchObject({ nakyma: ['Talentit (tuotannon savutesti)'], lahde: null, sv: '' });
    expect(t.rivit.LAAJENNETTU.nakyma).toEqual(['Talentit', 'Talentit (tuotannon savutesti)']);
    expect(t.rivit).not.toHaveProperty(['Ei tämä']); expect(t.rivit).not.toHaveProperty(['Eikä tämä']);
    expect(Object.keys(t.rivit)).toHaveLength(122);
  });
  it('vanha täytetty sv säilyy (idempotentti)', () => {
    expect(muotoRivit({ juuri, vanhat: { 'Pojat': { sv: 'X' } } }).rivit['Pojat'].sv).toBe('X');
  });
});

describe('i18n_luo_gemini_era.cjs --osio=seura_muodot (CLI)', () => {
  it('ei vaadi --lapiajo:a; uusi erä VAIN tällä osiolla; uudelleenajo tuottaa saman tiedoston; tunnetut osiot listattu', () => {
    const kohde = join(tmp, 'sv_kaannoserae_9099_gemini.json');
    let p = aja('--osio=seura_muodot', '--tiedosto=' + kohde);
    expect(p.status, p.stderr).toBe(0);
    const a = readFileSync(kohde, 'utf8'), j = JSON.parse(a);
    expect(Object.keys(j.osiot)).toEqual(['seura_muodot']); expect(j.osiot.seura_muodot.rivit).toEqual(R);
    expect(aja('--osio=seura_muodot', '--tiedosto=' + kohde).status).toBe(0); expect(readFileSync(kohde, 'utf8')).toBe(a);
    p = aja('--osio=tuntematon', '--tiedosto=' + join(tmp, 'sv_kaannoserae_9098_gemini.json'));
    expect(p.status).toBe(2); expect(p.stderr).toContain('tunnetut: seura, seura_muodot');
  });
  it('--savutesti=<tulos.json>: tuotannon löydös päätyy erään', () => {
    const st = join(tmp, 'savu.json'), kohde = join(tmp, 'sv_kaannoserae_9097_gemini.json');
    writeFileSync(st, JSON.stringify({ url: 'https://x--savutesti.web.app', nakymat: [{ nimi: 'Seura Kehitystilanne', kieli: 'sv', sv: { uudet: ['Tuotannon lause'] } }] }));
    expect(aja('--osio=seura_muodot', '--savutesti=' + st, '--tiedosto=' + kohde).status).toBe(0);
    const j = JSON.parse(readFileSync(kohde, 'utf8')).osiot.seura_muodot;
    expect(j.rivit['Tuotannon lause'].nakyma).toEqual(['Kehitystilanne (tuotannon savutesti)']); expect(j._lahde.savutesti).toBe('https://x--savutesti.web.app');
  });
  it('palautettu erä 99 (palautustiedosto) → kieltäytyy kirjoittamasta (B11)', () => {
    const kohde = join(tmp, 'sv_kaannoserae_9096_gemini.json');
    writeFileSync(join(tmp, 'sv_kaannoserae_9096_palautus.json'), '{}');
    expect(aja('--osio=seura_muodot', '--tiedosto=' + kohde).status).toBe(1); expect(existsSync(kohde)).toBe(false);
  });
});
