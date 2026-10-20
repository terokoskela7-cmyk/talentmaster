/* sv-erä 19 (scripts/i18n_kooste.cjs era19-kokoa / era19-vie): koonti, tarkistus ja vienti. Ajaa erien kopioilla (tmp). Koneellinen täyte (fi + merkki), ei kieltä: Code ei kirjoita ruotsia. */
import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
vi.setConfig({ testTimeout: 60000 });   // koonti skannaa kaikki lib- ja HTML-lähteet (~2 s yksin, >5 s rinnakkaisajossa) — oletus 5 s aiheutti vaihtelevan timeoutin
import { readFileSync, mkdtempSync, rmSync, cpSync, readdirSync } from 'fs';
import { createRequire } from 'module';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';
import { tmpdir } from 'os';
const require = createRequire(import.meta.url);
const juuri = join(dirname(fileURLToPath(import.meta.url)), '..'), ERA_DIR = join(juuri, 'docs/i18n');
const K = require('../scripts/i18n_kooste.cjs');
const paketti = () => JSON.parse(readFileSync(join(ERA_DIR, 'sv_kaannoserae_19_gemini.json'), 'utf8'));
let tmp;
beforeEach(() => { tmp = mkdtempSync(join(tmpdir(), 'sv19-')); for (const f of readdirSync(ERA_DIR)) if (/^sv_kaannoserae_.*\.json$/.test(f)) cpSync(join(ERA_DIR, f), join(tmp, f)); });
afterEach(() => rmSync(tmp, { recursive: true, force: true }));
const tayta = (p) => { const k = JSON.parse(JSON.stringify(p)); for (const o of Object.values(k.osiot)) for (const r of Object.values(o.rivit)) r.sv = r.fi.replace(/\{gen\}/g, '').replace(/(\s*)$/, '·$1'); return k; };

describe('erä 19 — koonti', () => {
  it('paketti täsmää erien tyhjiin riveihin: jokainen paketin rivi on jollain erällä tyhjänä, kaikki sv tyhjiä, rakenne osiot → _konteksti + rivit {fi,en,sv}', () => {
    const p = paketti(), K19 = K.kokoaEra19(tmp);
    // K1d (20.10.2026): sanastomuutos korvasi 23 koodissa olleen, vielä kääntämättömän fi-tekstin (katselmus/IDP/Raportointi → uusi termi). Lähetetty paketti säilyy ennallaan; korvatut rivit
    // ovat nyt erässä 80. Sallitaan vain rivit joiden fi on k1d_fi_korvaukset-fixturen "vanha".
    const K1D = require('./helpers/k1d_korvaukset.cjs'), korvatut = [];
    for (const [osio, o] of Object.entries(p.osiot)) for (const a of Object.keys(o.rivit)) if (!(K19.osiot[osio] && K19.osiot[osio].rivit[a])) korvatut.push(a);
    expect(korvatut.filter((a) => !K1D.KARTTA.has(a))).toEqual([]);
    expect(Object.keys(p.osiot).sort()).toEqual(Object.keys(K19.osiot).sort()); expect(p._rivit_yhteensa).toBe(K19.yht + korvatut.length);
    for (const [osio, o] of Object.entries(p.osiot)) { expect(typeof o._konteksti, osio).toBe('string'); for (const [a, r] of Object.entries(o.rivit)) { expect(r.sv, osio + a).toBe(''); expect(typeof r.fi).toBe('string'); expect(typeof r.en).toBe('string'); } }
    expect(Object.values(p.osiot).reduce((s, o) => s + Object.keys(o.rivit).length, 0)).toBe(p._rivit_yhteensa);
  });
  it('pudotetut: vain rivit, joita ei ole koodissa; pudotettujen määrä + pakettiin menneet = kaikki tyhjät erärivit (osio+avain-yhdistyksen jälkeen)', () => {
    const K19 = K.kokoaEra19(tmp), tyhjat = K.tyhjatRivit(tmp, K.ERAT_19);
    expect(K19.ennenYhdistysta + K19.pudotetut.length).toBe(tyhjat.length); expect(K19.pudotetut.length).toBeGreaterThan(0);
  });
});

describe('erä 19 — tarkistus ja vienti', () => {
  it('koneellinen täyte läpäisee; kuiva-ajo (oletus) ei kirjoita; --kirjoita täyttää kaikki paketin rivit kaikista eristä', () => {
    const p = paketti(), t = tayta(p);
    const kuiva = K.vieEra19(p, t, tmp, {}); expect(kuiva.virheet).toEqual([]); expect(kuiva.kirjoitettu).toBeGreaterThan(0);
    expect(K.tyhjatRivit(tmp, K.ERAT_19).length).toBeGreaterThanOrEqual(p._rivit_yhteensa);   // ei kirjoitettu
    const n0 = K.tyhjatRivit(tmp, K.ERAT_19).length, v = K.vieEra19(p, t, tmp, { kirjoita: true }); expect(v.virheet).toEqual([]); expect(v.kirjoitettu).toBe(n0 - K.tyhjatRivit(tmp, K.ERAT_19).length);
    const jaljella = K.tyhjatRivit(tmp, K.ERAT_19); expect(jaljella.every((r) => !(p.osiot[r.osio] && p.osiot[r.osio].rivit[r.avain]))).toBe(true);   // vain pudotetut jäävät
  });
  it('kaatuu ja kirjoittaa 0: tyhjä sv, puuttuva rivi, muuttunut fi, ylimääräinen rivi, paikkamerkki, HTML, välilyönti', () => {
    const p = paketti(), osio = Object.keys(p.osiot).find((o) => Object.values(p.osiot[o].rivit).some((r) => /\{\w+\}/.test(r.fi))), avain = Object.keys(p.osiot[osio].rivit).find((a) => /\{\w+\}/.test(p.osiot[osio].rivit[a].fi));
    const kokeile = (muuta, odotettu) => { const t = tayta(p); muuta(t); const x = K.vieEra19(p, t, tmp, { kirjoita: true }); expect(x.kirjoitettu).toBe(0); expect(x.virheet.join('\n')).toMatch(odotettu); };
    kokeile((t) => { t.osiot[osio].rivit[avain].sv = ''; }, /sv tyhjä/);
    kokeile((t) => { delete t.osiot[osio].rivit[avain]; }, /PUUTTUVA rivi/);
    kokeile((t) => { t.osiot[osio].rivit[avain].fi += 'x'; }, /fi muuttunut/);
    kokeile((t) => { t.osiot[osio].rivit['__ylimaarainen'] = { fi: 'a', en: '', sv: 'b' }; }, /YLIMÄÄRÄINEN rivi/);
    kokeile((t) => { t.osiot[osio].rivit[avain].sv = t.osiot[osio].rivit[avain].sv.replace(/\{\w+\}/, '{vaara}'); }, /paikkamerkit eroavat/);
    kokeile((t) => { t.osiot[osio].rivit[avain].sv += '<b>'; }, /HTML-tagit eroavat/);
    kokeile((t) => { t.osiot[osio].rivit[avain].sv = ' ' + t.osiot[osio].rivit[avain].sv; }, /välilyönti/);
    expect(K.tyhjatRivit(tmp, K.ERAT_19).length).toBeGreaterThan(0);
  });
  it('sama fi eri osioissa, eri sv → varoitus (ei virhe)', () => {
    const p = paketti(), t = tayta(p), fiOsiot = {}; for (const [o, v] of Object.entries(p.osiot)) for (const r of Object.values(v.rivit)) (fiOsiot[r.fi] = fiOsiot[r.fi] || []).push([o, r]);
    const kaksi = Object.entries(fiOsiot).find(([, a]) => new Set(a.map((x) => x[0])).size > 1); if (!kaksi) return;
    const [o1, avain1] = [kaksi[1][0][0], Object.keys(p.osiot[kaksi[1][0][0]].rivit).find((a) => p.osiot[kaksi[1][0][0]].rivit[a].fi === kaksi[0])];
    t.osiot[o1].rivit[avain1].sv += '²'; const x = K.vieEra19(p, t, tmp, {}); expect(x.virheet).toEqual([]); expect(x.varoitukset.join('\n')).toMatch(/sama fi, eri sv/);
  });
});
