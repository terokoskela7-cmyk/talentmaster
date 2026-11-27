/* B12 (PM 8.11.2026) — erä 99: --osio=seura_muodot (scripts/i18n_era_seura_muodot.cjs). Tekstit, joita sv-läpiajo ei näe fixture-tiloista:
 * kehitystilanteen ensinäkymän muut muodot, Talentit-taso LAAJENNETTU ja Seuran kirjautumissivu; --savutesti lisää tuotannon Seura-löydökset.
 * Erä lähetettiin PM:lle (121 riviä) ja palautus on viety (scripts/i18n_vie_sv_era99.cjs, tests/i18n_era99_vienti.test.js): rakentaja tuottaa
 * nyt vain uudet rivit (kaikki listan rivit ovat kartassa). Code EI kirjoita ruotsia (CLAUDE.md §0): testit tarkistavat rakenteen, eivät sv-sisältöä. */
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
const SAVU = (uudet, nimi) => ({ url: 'https://x--savutesti.web.app', nakymat: [{ nimi: nimi || 'Seura Talentit', kieli: 'sv', sv: { uudet } }] });

describe('erä 99 (lähetetty PM:lle: docs/i18n/sv_kaannoserae_99_gemini.json)', () => {
  it('vain osio seura_muodot; 121 riviä; sv tyhjä; konteksti; jokaisella rivillä näkymä, elementti ja lähde', () => {
    expect(Object.keys(ERA.osiot)).toEqual(['seura_muodot']);
    expect(Object.keys(R)).toHaveLength(121); expect(ERA._rivit_yhteensa).toBe(121);
    expect(O._konteksti).toBe(KONTEKSTI);
    for (const [k, r] of Object.entries(R)) {
      expect(r.fi, k).toBe(k); expect(r.sv, k).toBe(''); expect(r.nakyma.length, k).toBeGreaterThan(0); expect(r.elementti, k).toBeTruthy();
      const m = /^(.+):(\d+)$/.exec(r.lahde); expect(m, k).toBeTruthy(); expect(existsSync(join(juuri, m[1])), k).toBe(true);
    }
    expect(O._lahde.jo_kartassa_vain_reititys.sort()).toEqual(['Kausikuva tallennettu', 'Kirjaa ›', 'Salasana', 'Seura ja rakenteet', 'Seuran omat tavoitteet', 'Sähköposti']);
  });
  it('erä = rakentajan lista: 121 lähetettyä + 6 jo kartassa olevaa = MUODOT', () => {
    expect([...Object.keys(R), ...O._lahde.jo_kartassa_vain_reititys].sort()).toEqual(MUODOT.map((x) => x[0]).sort());
  });
  it('PM:n hyväksymät kohdat ovat mukana; kirjautumissivun 5 tekstiä: 3 erässä, 2 yhteisessä kartassa', () => {
    for (const k of ['Kirjaa testikierros joukkueelle {joukkue} – fyysisen kehityksen luku tarkentuu.', '{p} pelaajista kehittyy fyysisesti, tavoite {t}.',
      'kevät {v}', 'syksy {v}', 'vertailu {kehikko}', 'Täyttynyt', 'Raiteilla', 'Riskissä', 'Puuttuu', 'Sulje ‹', 'Piilota kaikki luvut ‹', 'Pojat', 'Tytöt',
      'ⓘ Miten luvut lasketaan', 'Valmennuksen laatu', 'LAAJENNETTU']) expect(R, k).toHaveProperty([k]);
    expect(Object.keys(R).filter((k) => R[k].nakyma.includes('Kirjautuminen')).sort()).toEqual(['Jos työsähköposti estää linkin, pyydä valmennuspäällikköä jakamaan se WhatsAppilla.', 'Unohditko salasanan?', 'vp@seura.fi']);
  });
  it('paikkamerkit {x} selitetty: jokaisella paikkamerkkirivillä on huomautus', () => {
    for (const [k, r] of Object.entries(R)) if (/\{\w+\}/.test(k)) expect((r.huom || []).length, k).toBeGreaterThan(0);
  });
});

describe('seura_muodot-rakentaja viennin jälkeen', () => {
  it('ei uusia rivejä eikä virheitä: kaikki listan 127 tekstiä ovat kartassa, josta Seura lukee', () => {
    const t = muotoRivit({ juuri });
    expect(t.virheet).toEqual([]); expect(t.rivit).toEqual({}); expect(t.reititettavat).toHaveLength(MUODOT.length);
  });
  it('uusi listarivi, jonka neulaa ei ole koodissa → virhe (ei riviä)', () => {
    MUODOT.push(['Tätä ei ole koodissa', 'X', 'Y']);
    try { const t = muotoRivit({ juuri }); expect(t.virheet).toEqual([expect.stringContaining('Tätä ei ole koodissa')]); expect(t.rivit).toEqual({}); }
    finally { MUODOT.pop(); }
  });
  it('--savutesti: Seura-näkymien sv-löydökset lisätään; fi-näkymät, muut sovellukset ja jo kartassa olevat ohitetaan', () => {
    const s = SAVU(['Uusi tuotantoteksti 3 kpl', 'LAAJENNETTU']);
    s.nakymat.push({ nimi: 'Seura Pelaajat', kieli: 'fi', sv: { uudet: ['Ei tämä'] } }, { nimi: 'VP Koti', kieli: 'sv', sv: { uudet: ['Eikä tämä'] } });
    const t = muotoRivit({ juuri, savutesti: s });
    expect(t.virheet).toEqual([]);
    expect(Object.keys(t.rivit)).toEqual(['Uusi tuotantoteksti 3 kpl']);
    expect(t.rivit['Uusi tuotantoteksti 3 kpl']).toMatchObject({ nakyma: ['Talentit (tuotannon savutesti)'], lahde: null, sv: '' });
  });
  it('vanha täytetty sv säilyy (idempotentti)', () => {
    expect(muotoRivit({ juuri, savutesti: SAVU(['Uusi tuotantoteksti 9']), vanhat: { 'Uusi tuotantoteksti 9': { sv: 'X' } } }).rivit['Uusi tuotantoteksti 9'].sv).toBe('X');
  });
});

describe('i18n_luo_gemini_era.cjs --osio=seura_muodot (CLI)', () => {
  it('ei uusia rivejä → exit 2, ei kirjoitusta; tunnetut osiot listattu', () => {
    const kohde = join(tmp, 'sv_kaannoserae_9099_gemini.json');
    let p = aja('--osio=seura_muodot', '--tiedosto=' + kohde);
    expect(p.status).toBe(2); expect(p.stderr).toContain('ei uusia rivejä'); expect(existsSync(kohde)).toBe(false);
    p = aja('--osio=tuntematon', '--tiedosto=' + kohde);
    expect(p.status).toBe(2); expect(p.stderr).toContain('tunnetut: seura, seura_muodot, seura_kaikki');
  });
  it('--savutesti=<tulos.json> (ei --lapiajo:a): tuotannon löydös päätyy uuteen erään; uudelleenajo tuottaa saman tiedoston', () => {
    const st = join(tmp, 'savu.json'), kohde = join(tmp, 'sv_kaannoserae_9097_gemini.json');
    writeFileSync(st, JSON.stringify(SAVU(['Tuotannon lause'], 'Seura Kehitystilanne')));
    expect(aja('--osio=seura_muodot', '--savutesti=' + st, '--tiedosto=' + kohde).status).toBe(0);
    const a = readFileSync(kohde, 'utf8'), j = JSON.parse(a).osiot.seura_muodot;
    expect(Object.keys(JSON.parse(a).osiot)).toEqual(['seura_muodot']);
    expect(j.rivit['Tuotannon lause'].nakyma).toEqual(['Kehitystilanne (tuotannon savutesti)']); expect(j._lahde.savutesti).toBe('https://x--savutesti.web.app');
    expect(aja('--osio=seura_muodot', '--savutesti=' + st, '--tiedosto=' + kohde).status).toBe(0); expect(readFileSync(kohde, 'utf8')).toBe(a);
  });
  it('palautettu erä (palautustiedosto) → kieltäytyy kirjoittamasta (B11)', () => {
    const st = join(tmp, 'savu2.json'), kohde = join(tmp, 'sv_kaannoserae_9096_gemini.json');
    writeFileSync(st, JSON.stringify(SAVU(['X'])));
    writeFileSync(join(tmp, 'sv_kaannoserae_9096_palautus.json'), '{}');
    expect(aja('--osio=seura_muodot', '--savutesti=' + st, '--tiedosto=' + kohde).status).toBe(1); expect(existsSync(kohde)).toBe(false);
  });
});
