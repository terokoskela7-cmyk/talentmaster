/* B12 (PM 8.11.2026) — erä 100: --osio=seura_kaikki (scripts/i18n_era_seura_kaikki.cjs). Kehitystilanne › "Kaikki luvut ›" (renderNakyma: yläpalkki,
 * Lohko 1–4, selitteet) + erän 99 jäljelle jääneet (Alustava, Ei, Viimeisin testi, Kaikki ikävaiheet). Raportit (raporttiHTML) eivät kuulu erään.
 * Erä lähetettiin PM:lle (127 riviä) ja palautus on viety (scripts/i18n_vie_sv_era100.cjs, tests/i18n_era100_vienti.test.js): rakentaja tuottaa
 * nyt vain uudet rivit (kaikki listan rivit ovat kartassa). Code EI kirjoita ruotsia (CLAUDE.md §0): testit tarkistavat rakenteen, eivät sv-sisältöä. */
import { describe, it, expect, afterAll } from 'vitest';
import { spawnSync } from 'child_process';
import { mkdtempSync, readFileSync, rmSync, existsSync } from 'fs';
import { createRequire } from 'module';
import { tmpdir } from 'os';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

const juuri = join(dirname(fileURLToPath(import.meta.url)), '..');
const req = createRequire(import.meta.url);
const tmp = mkdtempSync(join(tmpdir(), 'b12-era100-'));
afterAll(() => rmSync(tmp, { recursive: true, force: true }));
const aja = (...args) => spawnSync(process.execPath, [join(juuri, 'scripts/i18n_luo_gemini_era.cjs'), ...args], { cwd: juuri, encoding: 'utf8' });
const B = req('../scripts/i18n_era_seura_kaikki.cjs');
const TIEDOSTO = 'docs/i18n/sv_kaannoserae_100_gemini.json';
const ERA = JSON.parse(readFileSync(join(juuri, TIEDOSTO), 'utf8'));
const O = ERA.osiot.seura_kaikki, R = O.rivit;
const KT = readFileSync(join(juuri, 'lib/tm_kehitystilanne.js'), 'utf8');
const kartat = () => [req('../lib/tm_henkilosto_i18n.js').TM_HENKILOSTO_I18N.sv, (() => { const m = req('../lib/tm_i18n_common.js'); return (m.TM_I18N_COMMON || global.TM_I18N_COMMON).sv; })()];

describe('erä 100 (lähetetty PM:lle: docs/i18n/sv_kaannoserae_100_gemini.json)', () => {
  it('vain osio seura_kaikki; 127 riviä; sv tyhjä; konteksti; jokaisella rivillä näkymä, elementti ja koodirivi', () => {
    expect(Object.keys(ERA.osiot)).toEqual(['seura_kaikki']);
    expect(Object.keys(R)).toHaveLength(127); expect(ERA._rivit_yhteensa).toBe(127);
    expect(O._konteksti).toBe(B.KONTEKSTI); expect(O._lahde.savutesti).toBeNull();
    for (const [k, r] of Object.entries(R)) {
      expect(r.fi, k).toBe(k); expect(r.sv, k).toBe(''); expect(r.nakyma[0], k).toMatch(/^Kehitystilanne › Kaikki luvut/); expect(r.elementti, k).toBeTruthy();
      expect(r.lahde, k).toMatch(/^lib\/tm_kehitystilanne\.js:\d+$/);
    }
  });
  it('erä = rakentajan lista: 127 lähetettyä + 10 jo kartassa olevaa = KAIKKI; ei päällekkäisyyttä erän 99 kanssa', () => {
    expect([...Object.keys(R), ...O._lahde.jo_kartassa_vain_reititys].sort()).toEqual(B.MUODOT.map((x) => x[0]).sort());
    expect(O._lahde.jo_kartassa_vain_reititys.slice().sort()).toEqual(['Ikävaihe', 'Jakso', 'Joukkue', 'Kaikki', 'Kehityssuunnitelma', 'Pelaajia, joilla testi alle 12 kk', 'Sukupuoli', 'Talentit', 'Talenttiohjelma', 'Tila']);
    const E99 = JSON.parse(readFileSync(join(juuri, 'docs/i18n/sv_kaannoserae_99_gemini.json'), 'utf8')).osiot.seura_muodot.rivit;
    expect(Object.keys(R).filter((k) => E99[k])).toEqual([]);
  });
  it('Lohko 1–4, selitteet ja erän 99 jäännökset mukana; raporttien tekstejä ei', () => {
    for (const k of ['Lohko 1 · Seuran tavoitteet {v}', 'Lohko 2 · Pelaajakehitys D1–D5', 'Lohko 3 · Joukkueet', 'Lohko 4 · Datan kattavuus', 'Saavutammeko tavoitteemme ja kehittyvätkö pelaajat?',
      'Muutos ≥ ±0,5 asteikolla 1–5. Ei arvioitu ei ole nolla.', 'SWC alustava (persentiilioletus) · ei arvioitu ≠ 0 · ei terveystietoa', 'Mitä kirjaamalla luku paranee',
      'Alustava', 'Ei', 'Viimeisin testi', 'Kaikki ikävaiheet']) expect(R, k).toHaveProperty([k]);
    expect(Object.keys(R).filter((k) => /\{\w+\}/.test(k)).every((k) => (R[k].huom || []).length > 0)).toBe(true);
    const rap = KT.slice(KT.indexOf('function raporttiHTML'));
    for (const r of Object.values(R)) expect(Number(r.lahde.split(':')[1]), r.fi).toBeLessThan(KT.slice(0, KT.indexOf('function raporttiHTML')).split('\n').length);
    expect(rap.length).toBeGreaterThan(0);
  });
});

describe('seura_kaikki-rakentaja viennin jälkeen', () => {
  it('ei uusia rivejä eikä virheitä: kaikki listan 137 tekstiä ovat kartassa, josta Seura lukee', () => {
    const t = B.muotoRivit({ juuri });
    expect(t.virheet).toEqual([]); expect(t.rivit).toEqual({}); expect(t.reititettavat).toHaveLength(B.MUODOT.length); expect(B.MUODOT).toHaveLength(137);
    const [H, C] = kartat();
    for (const k of [...Object.keys(R), ...O._lahde.jo_kartassa_vain_reititys]) expect(typeof H[k] === 'string' || typeof C[k] === 'string', k).toBe(true);
  });
});

describe('i18n_luo_gemini_era.cjs --osio=seura_kaikki (CLI)', () => {
  it('ei uusia rivejä → exit 2, ei kirjoitusta; tunnetut osiot listattu', () => {
    const kohde = join(tmp, 'sv_kaannoserae_9100_gemini.json');
    let p = aja('--osio=seura_kaikki', '--tiedosto=' + kohde);
    expect(p.status).toBe(2); expect(p.stderr).toContain('ei uusia rivejä'); expect(existsSync(kohde)).toBe(false);
    p = aja('--osio=x', '--tiedosto=' + kohde);
    expect(p.status).toBe(2); expect(p.stderr).toContain('tunnetut: seura, seura_muodot, seura_kaikki');
  });
});
