/* Erä 101 (PM 9.11.2026): VP:n Kenttä-lippu (Sibbo tuotannossa) — osio vp_kentta (scripts/i18n_era_vp_kentta.cjs) + CI:n sv-läpiajon lippuhaara (fx_vp_kentta).
 * Code EI kirjoita ruotsia (CLAUDE.md §0): testit tarkistavat rakenteen ja kattavuuden, eivät sv-sisältöä. */
import { describe, it, expect } from 'vitest';
import { readFileSync } from 'fs';
import { createRequire } from 'module';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

const juuri = join(dirname(fileURLToPath(import.meta.url)), '..');
const req = createRequire(import.meta.url);
const lue = (f) => readFileSync(join(juuri, f), 'utf8');
const B = req('../scripts/i18n_era_vp_kentta.cjs');
const ERA = JSON.parse(lue('docs/i18n/sv_kaannoserae_101_gemini.json'));
const O = ERA.osiot.vp_kentta, R = O.rivit;

describe('erä 101 — vp_kentta', () => {
  it('vain osio vp_kentta; sv tyhjä; jokaisella rivillä näkymä; konteksti rakentajalta', () => {
    expect(Object.keys(ERA.osiot)).toEqual(['vp_kentta']);
    expect(ERA._rivit_yhteensa).toBe(Object.keys(R).length);
    expect(O._konteksti).toBe(B.KONTEKSTI);
    for (const [k, r] of Object.entries(R)) { expect(r.fi, k).toBe(k); expect(r.sv, k).toBe(''); expect(r.nakyma.length, k).toBeGreaterThan(0); }
  });
  it('ei henkilöiden nimiä (fixture-nimet rajattu pois)', () => {
    for (const k of Object.keys(R)) expect(k, k).not.toMatch(/\b(Strand|Berg|Lund|Holm|Dahl)\b/);
  });
  it('palvelimen ehdotustekstit: jokainen rivin muoto on oikeasti palvelimen/VP:n koodissa, ja vpTToimenpide(sv) jättää sen kääntämättä', () => {
    const lahde = lue('functions/tm_toimenpide_signaalit.js') + lue('TalentMaster_VP_v25.html');
    for (const e of B.STAATTISET_EHDOTUKSET) {
      const fi = e.fi.replace(/\{n\} pelaajaa/, '').trim();
      const haja = fi.split(/\{n\}| — /).map((s) => s.replace(/^[.,\s]+/, '').trim()).filter((s) => s.length > 15);
      for (const h of haja) expect(lahde, e.fi).toContain(h.replace(/^pelaajaa,? ?/, '').split(/[.:]\s/)[0].slice(0, 20));
    }
    expect(Object.keys(R).filter((k) => /kehityskohteena/.test(k)).length).toBe(B.STAATTISET_EHDOTUKSET.length);
  });
});

describe('CI:n sv-läpiajo kattaa Kenttä-lippuhaaran (fx_vp_kentta)', () => {
  const lapiajo = lue('tools/i18n/sv_lapiajo.mjs'), fx = lue('tools/i18n/sv_fixtuuri.mjs'), ci = lue('.github/workflows/test.yml');
  it('fx_vp_kentta on fixtuuri-osassa (fx_-etuliite) ja käyttää kentta-muunnelmaa', () => {
    expect(lapiajo).toMatch(/fx_vp_kentta:\s*\{[^}]*fx: \['vp', null, 'kentta'\]/);
    expect(ci).toMatch(/osa: \[demo-1, demo-2, fixtuuri\]/);
    expect(lapiajo).toMatch(/FX_SOVELLUKSET = Object\.keys\(SOVELLUKSET\)\.filter\(\(k\) => k\.startsWith\('fx_'\)\)/);
  });
  it('fixtuurin seura on Kenttä-lipun seura (seurat.liput + liput/julkiset) ja kattaa kaikki kuusi ehdotussignaalia sekä henkilökuntaviestit', () => {
    expect(fx).toMatch(/liput: \{ kentta: true/);
    expect(fx).toMatch(/liput\/julkiset'\]: \{ kentta: true/);
    for (const s of ['hh_taso_alhainen', 'suunta_lasku', 'tki_alhainen', 'tkk_puuttuu', 'tki_lahella_merkkia', 'flei_kartoitus_puuttuu']) expect(fx, s).toContain("'" + s + "'");
    expect(fx).toContain("nakyvyys: 'henkilokunta'");
  });
  it('askeleet kattavat navi v3:n kaikki kohdat, Tilanteen, Viestit, Kehitystyöpöydän välilehdet ja Aloita jakso -ikkunan', () => {
    const navi = lue('lib/tm_vp_navi.js');
    for (const ws of ['koti', 'viestit', 'kalenteri', 'tilanne', 'joukkueet', 'valmentajat', 'testit', 'asetukset']) { expect(navi).toContain("'" + ws + "'"); expect(lapiajo).toContain("'" + ws + "'"); }
    for (const a of ['tilanne_kaikki', 'tilanne_esityslista', "kt/' + n", '#pelaaja/qp1/', "_vpAloitaJaksoAvaa('qp3')", "avaaJoukkueSyvanakyma('QG U13')"]) expect(lapiajo, a).toContain(a);
  });
});
