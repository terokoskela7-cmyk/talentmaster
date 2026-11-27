/* B12 (PM 7.11.2026) — scripts/i18n_luo_gemini_era.cjs --osio=seura: rajausvalinta, jolla erään kootaan VAIN Seurahallinnan tekstit sv-läpiajon tuloksesta.
 * Code EI kirjoita ruotsia (CLAUDE.md §0): testit tarkistavat rakenteen, kontekstin ja sv:n säilymisen, eivät sv-sisältöä.
 * Erä 98 (docs/i18n/sv_kaannoserae_98_gemini.json) = täsmälleen 61 Seuran tekstiä (B12: 101 − 40 reititystä, PR b12-seura-sv-reititys). */
import { describe, it, expect, afterAll } from 'vitest';
import { spawnSync } from 'child_process';
import { mkdtempSync, writeFileSync, readFileSync, rmSync, existsSync } from 'fs';
import { createHash } from 'crypto';
import { createRequire } from 'module';
import { tmpdir } from 'os';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

const juuri = join(dirname(fileURLToPath(import.meta.url)), '..');
const req = createRequire(import.meta.url);
const SKRIPTI = join(juuri, 'scripts/i18n_luo_gemini_era.cjs');
const aja = (...args) => spawnSync(process.execPath, [SKRIPTI, ...args], { cwd: juuri, encoding: 'utf8' });
const sha = (f) => createHash('sha256').update(readFileSync(f)).digest('hex');
const tmp = mkdtempSync(join(tmpdir(), 'b12-era-'));
afterAll(() => rmSync(tmp, { recursive: true, force: true }));

/* Synteettinen sv-läpiajon tulos: Seuran kaksi sovellusta + yksi muu (ei saa tulla mukaan). Tekstit ovat oikeita Seuran literaaleja → lähde löytyy. */
const r = (teksti, o) => Object.assign({ teksti, tyyppi: 'teksti', polku: 'div#nakymaAlue > div', varmuus: 'heuristiikka', luokka: 'ui', lahde: [] }, o || {});
const TULOS = { luotu: '2026-11-08', nakymat: {
  'fx_seura/yhteenveto': { fi: [r('AVAA NÄKYMÄ', { polku: 'div#sivupalkki > div.navRyhma' }), r('Avaa VP Dashboard uudessa välilehdessä', { tyyppi: 'title' })] },
  'fx_seura/pelaajat': { fi: [r('Pelaajahallinta'), r('AVAA  NÄKYMÄ'), r('Jo Strand', { luokka: 'data?' })] },
  'fx_seura_lage/talentit': { fi: [r('Sukupuoli', { polku: 'div.kenttaRyhma > label.kenttaLabel', varmuus: 'kartta' }), r('🟡 Basprogram — 2 pelaajaa', { polku: 'div.taulukkoKortti > div > div', lahde: ['TalentMaster_Seura.html:1 (osa: pelaajaa)'] })] },
  'fx_vp/koti': { fi: [r('Tämä on VP:n teksti')] },
} };
const tulosTiedosto = join(tmp, 'tulos.json'); writeFileSync(tulosTiedosto, JSON.stringify(TULOS));

describe('i18n_era_seura.seuraRivit (puhdas)', () => {
  const { seuraRivit, SOVELLUKSET } = req('../scripts/i18n_era_seura.cjs');
  const { rivit, maara } = seuraRivit(TULOS, { juuri });
  it('vain fx_seura + fx_seura_lage; yksi rivi per uniikki teksti (välilyönnit tiivistetty, kirjainkoko ei erota); näkymät yhdistetään', () => {
    expect(SOVELLUKSET).toEqual(['fx_seura', 'fx_seura_lage']);
    expect(maara).toBe(6);
    expect(Object.keys(rivit)).not.toContain('Tämä on VP:n teksti');
    expect(rivit['AVAA NÄKYMÄ'].nakyma).toEqual(['Yhteenveto', 'Pelaajat']);
    expect(rivit['Sukupuoli'].nakyma).toEqual(['Talentit (Läge-data)']);
  });
  it('jokaisella rivillä fi, tyhjä sv, näkymä, tyyppi ja elementti; title-tyyppi selitetään', () => {
    for (const [k, v] of Object.entries(rivit)) { expect(v.fi, k).toBe(k); expect(v.sv, k).toBe(''); expect(v.nakyma.length, k).toBeGreaterThan(0); expect(v.tyyppi, k).toBeTruthy(); expect(typeof v.elementti, k).toBe('string'); }
    expect(rivit['Avaa VP Dashboard uudessa välilehdessä'].huom.join(' ')).toMatch(/title/);
  });
  it('lähde = todellinen tiedosto ja rivi (ei kuoren yhdistettyä numerointia); sama elementti voittaa ensimmäisen osuman', () => {
    const lue = (l) => { const [f, n] = l.split(':'); return readFileSync(join(juuri, f), 'utf8').split('\n')[Number(n) - 1]; };
    expect(rivit['AVAA NÄKYMÄ'].lahde).toMatch(/^TalentMaster_Seura\.html:\d+$/);
    expect(lue(rivit['AVAA NÄKYMÄ'].lahde)).toContain('AVAA NÄKYMÄ');
    expect(rivit['Sukupuoli'].lahde).toMatch(/^seura\/seura_pelaajahallinta\.js:\d+$/);
    expect(lue(rivit['Sukupuoli'].lahde)).toMatch(/<label class="kenttaLabel">(Sukupuoli|\$\{tmHT\('Sukupuoli'\)\})<\/label>/);   // erän 98 vienti reititti tmHT:llä
    expect(lue(rivit['🟡 Basprogram — 2 pelaajaa'].lahde)).toMatch(/— (\$\{[^}]+\}|\{n\}) pelaajaa/);   // luvullinen teksti: rivi, jolla on myös "—" (erän 98 jälkeen malli '{otsikko} — {n} pelaajaa')
  });
  it('luvut → esimerkkidata-huomautus; data? → "ei käännetä" -ohje; viite_sv = olemassa oleva käännös samasta tekstistä', () => {
    expect(rivit['🟡 Basprogram — 2 pelaajaa'].huom.join(' ')).toMatch(/esimerkkidataa/);
    expect(rivit['Jo Strand'].lahde).toBeNull();
    expect(rivit['Jo Strand'].huom.join(' ')).toMatch(/ei käännetä/);
    const L = req('../lib/tm_lang.js').TM_LANG;
    expect(rivit['Sukupuoli'].viite_sv.sv).toBe(L.sv.suostumus.rek_sukupuoli);   // lähde: tm_lang tai (erän 98 viennin jälkeen) henkilöstökartta, sama sv
    expect(rivit['Sukupuoli'].viite_sv.lahde).toMatch(/^(tm_lang:suostumus\.rek_sukupuoli|TM_HENKILOSTO_I18N)$/);
  });
  it('vanha täytetty sv säilyy (idempotentti)', () => {
    const { rivit: r2 } = seuraRivit(TULOS, { juuri, vanhat: { 'Pelaajahallinta': { sv: 'X' } } });
    expect(r2['Pelaajahallinta'].sv).toBe('X');
  });
});

describe('i18n_luo_gemini_era.cjs --osio (CLI)', () => {
  it('tuntematon osio, puuttuva --tiedosto tai --lapiajo → exit 2, ei kirjoitusta', () => {
    const kohde = join(tmp, 'sv_kaannoserae_9001_gemini.json');
    let p = aja('--osio=tuntematon', '--tiedosto=' + kohde, '--lapiajo=' + tulosTiedosto);
    expect(p.status).toBe(2); expect(p.stderr).toContain('tunnetut: seura');
    p = aja('--osio=seura', '--lapiajo=' + tulosTiedosto);
    expect(p.status).toBe(2); expect(p.stderr).toContain('--osio vaatii kohteen --tiedosto');
    p = aja('--osio=seura', '--tiedosto=' + kohde);
    expect(p.status).toBe(2); expect(p.stderr).toContain('--lapiajo');
    expect(existsSync(kohde)).toBe(false);
  });
  it('seura → uusi erä, jossa VAIN osio seura (ei erän 2 osioita); uudelleenajo tuottaa saman tiedoston', () => {
    const kohde = join(tmp, 'sv_kaannoserae_9002_gemini.json');
    const p = aja('--osio=seura', '--tiedosto=' + kohde, '--lapiajo=' + tulosTiedosto);
    expect(p.status, p.stderr).toBe(0);
    const E = JSON.parse(readFileSync(kohde, 'utf8'));
    expect(Object.keys(E.osiot)).toEqual(['seura']);
    expect(E._rivit_yhteensa).toBe(6);
    expect(E._otsikko).toMatch(/^Käännöserä 9002 \(osiot: seura/);
    expect(E.osiot.seura._konteksti).toMatch(/Seurahallinta/);
    const ennen = sha(kohde);
    expect(aja('--osio=seura', '--tiedosto=' + kohde, '--lapiajo=' + tulosTiedosto).status).toBe(0);
    expect(sha(kohde)).toBe(ennen);
  });
  it('B11-suojat pätevät myös rajaukseen: palautettu erä → kieltäytyy; täytetty sv katoaisi → kieltäytyy', () => {
    const kohde = join(tmp, 'sv_kaannoserae_9003_gemini.json');
    expect(aja('--osio=seura', '--tiedosto=' + kohde, '--lapiajo=' + tulosTiedosto).status).toBe(0);
    writeFileSync(join(tmp, 'sv_kaannoserae_9003_palautus.json'), '{}\n');
    const ennen = sha(kohde);
    const p = aja('--osio=seura', '--tiedosto=' + kohde, '--lapiajo=' + tulosTiedosto);
    expect(p.status).not.toBe(0); expect(p.stderr).toContain('erällä on palautus'); expect(sha(kohde)).toBe(ennen);
    const kohde2 = join(tmp, 'sv_kaannoserae_9004_gemini.json');
    writeFileSync(kohde2, JSON.stringify({ osiot: { seura: { rivit: { 'Poistunut teksti': { fi: 'Poistunut teksti', sv: 'täytetty' } } } } }));
    const ennen2 = sha(kohde2);
    const p2 = aja('--osio=seura', '--tiedosto=' + kohde2, '--lapiajo=' + tulosTiedosto);
    expect(p2.status).not.toBe(0); expect(p2.stderr).toMatch(/1 täytettyä sv-kenttää katoaisi/); expect(sha(kohde2)).toBe(ennen2);
  });
});

describe('Erä 98 (B12, PM:lle)', () => {
  const E = JSON.parse(readFileSync(join(juuri, 'docs/i18n/sv_kaannoserae_98_gemini.json'), 'utf8'));
  const rivit = E.osiot.seura.rivit;
  it('täsmälleen 61 Seuran tekstiä, vain osio seura, sv tyhjä', () => {
    expect(Object.keys(E.osiot)).toEqual(['seura']);
    expect(Object.keys(rivit)).toHaveLength(61);
    expect(E._rivit_yhteensa).toBe(61);
    for (const [k, v] of Object.entries(rivit)) expect(v.sv, k).toBe('');
  });
  it('jokaisella rivillä on konteksti; viennin (B12 vaihe 3) jälkeen rivit ovat poissa baselinesta, paitsi testidatan nimi "Jo Strand"', () => {
    const base = new Set(JSON.parse(readFileSync(join(juuri, 'tools/i18n/sv_lapiajo_baseline.json'), 'utf8')).tekstit);
    for (const [k, v] of Object.entries(rivit)) {
      expect(base.has(k.toLowerCase()), k).toBe(k === 'Jo Strand');
      expect(v.nakyma.length, k).toBeGreaterThan(0);
      expect(v.elementti, k).toBeTruthy();
      expect(v.lahde || (v.huom || []).length, k).toBeTruthy();   // lähde tai selitys miksi ei
    }
  });
  it('vaiheen 1 reitityksiä ei ole erässä; "Rekisteröity" on (ainoa olemassa oleva sv on VP:n monikko)', () => {
    for (const t of ['Kirjaudu ulos', 'HALLINTA', 'Talentit', 'Kaikki pelaajat', 'Synt.', 'Aktiivinen', 'Tallenna joukkue']) expect(rivit, t).not.toHaveProperty(t);
    expect(rivit).toHaveProperty('Rekisteröity');
    expect(rivit['Rekisteröity'].viite_sv.lahde).toMatch(/TM_VP_I18N/);
  });
});
