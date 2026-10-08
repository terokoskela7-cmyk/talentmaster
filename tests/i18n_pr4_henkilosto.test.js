/* sv-läpiajo PR 4 — henkilöstösivut (Seura, ADAR-pikakortti, Pelihavainto) + VP: reititys, ADAR-tekstien lib, Gemini-erä 2 -kattavuus.
 * Code EI kirjoita ruotsia (CLAUDE.md §0): testit tarkistavat rakenteen ja fi-säilymisen, eivät sv-sisältöä. */
import { describe, it, expect } from 'vitest';
import { readFileSync } from 'fs';
import { createRequire } from 'module';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';
import { skannaaHtml, lataaSallitut, onSallittu } from '../tools/i18n/sv_staattinen.mjs';

const require = createRequire(import.meta.url);
const juuri = join(dirname(fileURLToPath(import.meta.url)), '..');
const lue = (f) => readFileSync(join(juuri, f), 'utf8');
const ERA = JSON.parse(lue('docs/i18n/sv_kaannoserae_2.json'));
const { poimi } = require('../tools/i18n/reititin_avaimet.cjs');

describe('tmHT — henkilöstösivujen teksti-avainreititin', () => {
  const H = require('../lib/tm_henkilosto_i18n.js');
  it('fi (ei kieltä) ja kartaton avain → teksti ennallaan', () => {
    expect(H.tmHT('Ei vielä pelaajia')).toBe('Ei vielä pelaajia');
    expect(H.tmHT('tätä ei ole missään kartassa')).toBe('tätä ei ole missään kartassa');
  });
  it('sv-kartta on viety Gemini-erästä 2 (scripts/i18n_vie_sv_era2.cjs) ja vastaa erää (tests/i18n_era2_vienti.test.js)', () => {
    expect(Object.keys(H.TM_HENKILOSTO_I18N.sv).length).toBe(Object.keys(ERA.osiot.henkilosto_kartta.rivit).length);
    expect(H.tmHT('Ei vielä pelaajia')).toBe('Ei vielä pelaajia');   // ilman kieltä (fi) teksti ennallaan
  });
  it('kolme henkilöstösivua lataa tmHT:n ennen ensimmäistä käyttöä', () => {
    for (const f of ['TalentMaster_Seura.html', 'TalentMaster_ADAR_Pikakortti.html', 'TalentMaster_Pelihavainto_Kentta.html']) {
      const src = lue(f);
      const a = src.indexOf('lib/tm_henkilosto_i18n.js'); expect(a, f).toBeGreaterThan(0);
      expect(src.indexOf('lib/tm_i18n_common.js'), f).toBeGreaterThan(0);
      expect(src.indexOf('lib/tm_i18n_common.js'), f).toBeLessThan(a);
      expect(src.indexOf('tmHT('), f).toBeGreaterThan(a);
    }
  });
  it('Pelihavainnon phT osoittaa tmHT:hen (yksi jaettu kartta)', () => {
    expect(lue('TalentMaster_Pelihavainto_Kentta.html')).toMatch(/function phT\(fi\) \{ return \(typeof tmHT === 'function'\) \? tmHT\(fi\) : fi; \}/);
  });
});

describe('ADAR-pikakortti — tekstit libissä (lib/tm_adar_tekstit.js)', () => {
  const T = require('../lib/tm_adar_tekstit.js');
  const alku = JSON.parse(readFileSync(join(juuri, 'tests/fixtures/adar_ph_tekstit_alkup.json'), 'utf8'));
  it('fi-tekstit täsmäävät alkuperäisiin PH_TEKSTIT-vakioihin (fixture) — fi ei muutu', () => {
    for (const dim of ['A', 'D', 'Act', 'R']) {
      const k = T.tmAdarKortti(dim, (x) => x);
      expect(k.q, dim).toBe(alku.PH_TEKSTIT[dim].q);
      expect(k.d, dim).toEqual(alku.PH_TEKSTIT[dim].d);
      expect(k.tip, dim).toEqual(alku.PH_TEKSTIT[dim].tip);
    }
  });
  it('tr-funktio ohjaa jokaisen tekstin (sv-reitti): tr saa polkuavaimen ja tulos käytetään', () => {
    const k = T.tmAdarKortti('A', (a) => '«' + a + '»');
    expect(k.q).toBe('«adar_A_q»');
  });
  it('Gemini-erä 2: lib.tm_adar_tekstit kattaa jokaisen FI-avaimen ja fi täsmää', () => {
    const r = ERA.osiot['lib.tm_adar_tekstit'].rivit;
    expect(Object.keys(r).sort()).toEqual(Object.keys(T.FI).sort());
    Object.keys(T.FI).forEach((a) => expect(r[a].fi, a).toBe(T.FI[a]));
  });
  it('ADAR SW: uudet tiedostot allowlistissa ja cache nostettu', () => {
    const sw = lue('sw_adar.js');
    ['tm_lang', 'tm_i18n_common', 'tm_lib_i18n', 'tm_henkilosto_i18n', 'tm_adar_tekstit'].forEach((n) => expect(sw, n).toContain(n));
    expect(sw).toMatch(/tm-adar-v1[3-9]|tm-adar-v[2-9]\d/);
  });
});

describe('Gemini-erä 2 — PR 4 -osiot (VP, henkilöstö, jäännökset)', () => {
  const KARTAT_VP = [['lib/tm_vp_i18n.js', 'TM_VP_I18N'], ['lib/tm_i18n_common.js', 'TM_I18N_COMMON'], ['lib/tm_lib_i18n.js', 'TM_LIB_I18N']];
  const KARTAT_HENK = [['lib/tm_henkilosto_i18n.js', 'TM_HENKILOSTO_I18N'], ['lib/tm_i18n_common.js', 'TM_I18N_COMMON'], ['lib/tm_lib_i18n.js', 'TM_LIB_I18N']];
  const ei = (t) => /^(var\(|#)/.test(t) || /^[:%]/.test(t) || t.length < 2;
  it('vp_kartta kattaa jokaisen vpT-avaimen jolla ei ole sv-riviä (aja: node scripts/i18n_luo_gemini_era.cjs)', () => {
    const p = poimi({ juuri, tiedostot: ['TalentMaster_VP_v25.html'], routerit: ['vpT', '_mT'], kartat: KARTAT_VP, taulukot: ['TM_TESTI_OHJEET', '_ONB_VP', '_PHV_LABEL', '_VP_POS_NIMI', '_TAL_LAJINIMI', '_VP_HH_FOKUS_NIMI', '_VP_OHJ_PHV_NIMI', '_JSV_HH_TEEMA', 'TK_LAJI_NIMET', '_VKO_LASNA', '_JA_POSRYHMA'] });
    const rivit = ERA.osiot.vp_kartta.rivit;
    const puuttuu = p.puuttuu.filter((t) => !ei(t) && !rivit[t]);
    expect(puuttuu).toEqual([]);
  });
  it('henkilosto_kartta kattaa Seuran, ADARin ja Pelihavainnon tmHT/phT-avaimet', () => {
    const p = poimi({ juuri, tiedostot: ['TalentMaster_Seura.html', 'TalentMaster_ADAR_Pikakortti.html', 'TalentMaster_Pelihavainto_Kentta.html'], routerit: ['tmHT', 'phT'], kartat: KARTAT_HENK });
    const rivit = ERA.osiot.henkilosto_kartta.rivit;
    expect(p.puuttuu.filter((t) => !ei(t) && !rivit[t])).toEqual([]);
  });
  it('#892:n jäännökset mukana: ts_otsikko, Förening-rivit, kausifokus, VP×Master', () => {
    expect(ERA.osiot['lib.tm_tanaan_signaali'].rivit.ts_otsikko.fi).toBe('Seuraava askel');
    expect(Object.keys(ERA.osiot['jaannos.seura_forening'].rivit).length).toBeGreaterThan(20);
    expect(ERA.osiot['jaannos.kausifokus'].rivit['vp:Kehityskaari (kausifokus)']).toBeTruthy();
    const vm = ERA.osiot['jaannos.vp_master'].rivit; expect(Object.keys(vm).length).toBeGreaterThan(50);
    Object.values(vm).forEach((r) => { expect(r.sv_vp).toBeTruthy(); expect(r.sv_master).toBeTruthy(); expect(r.sv_vp).not.toBe(r.sv_master); });
  });
  it('termistölisäykset mukana (ADAR-termit + pelihavainto/otteluhavainnointi/ottelutarkkailu)', () => {
    const k = ERA.termisto.kaannettava;
    ['Havainnointi', 'Päätös / Päätöksenteko', 'Toteutus', 'Palautuminen', 'Pelihavainto', 'Otteluhavainnointi', 'Ottelutarkkailu'].forEach((t) => expect(k[t], t).toBeTruthy());
  });
  it('jokaisella PR 4 -rivillä on fi ja sv on merkkijono (tyhjä kunnes Gemini täyttää)', () => {
    for (const o of ['vp_kartta', 'henkilosto_kartta', 'lib.tm_adar_tekstit', 'lib.tm_pelihavainto_valinta', 'lib.tm_havaintohistoria', 'jaannos.seura_forening', 'jaannos.kausifokus', 'jaannos.vp_master']) {
      Object.entries(ERA.osiot[o].rivit).forEach(([a, r]) => { expect(typeof r.sv, o + ' ' + a).toBe('string'); if (!o.startsWith('jaannos.vp_master')) expect(r.fi, o + ' ' + a).toBeTruthy(); });
    }
  });
});

describe('VP ja Seura — reititysmittaus', () => {
  const S = lataaSallitut();
  it('VP_v25: ei reitittämätöntä suomea (sallitut poislukien)', () => {
    const { loydot } = skannaaHtml(lue('TalentMaster_VP_v25.html'), 'TalentMaster_VP_v25.html');
    expect(loydot.filter((f) => !onSallittu(f, S)).map((f) => f.rivi + ' ' + f.teksti.slice(0, 60))).toEqual([]);
  });
  it('Seura: reitittämättömiä korkeintaan raportoidun jäännöksen verran (kasvukatto — vain pienenee)', () => {
    const { loydot } = skannaaHtml(lue('TalentMaster_Seura.html'), 'TalentMaster_Seura.html');
    const jaljella = loydot.filter((f) => !onSallittu(f, S));
    const raportoitu = lue('docs/i18n/seura_reitittamatta_jaljella.tsv').trim().split('\n').length;
    expect(jaljella.length, 'päivitä docs/i18n/seura_reitittamatta_jaljella.tsv jos jäännös pieneni').toBeLessThanOrEqual(raportoitu);
  });
});
