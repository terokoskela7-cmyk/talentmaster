/**
 * R6.2b — INVENTAARIOTESTI: "mikä päättää pelaajan seuraavan toimenpiteen" -kohdat lähdekoodissa.
 * Luokat: A = päättää seuraavan toimenpiteen → siirretään lib/tm_seuraava_askel.js:ään (kääre jää) · B = renderöi/muotoilee päätöstä, ei päätä (ennallaan)
 *         · C = ei päättelyä / ei pelaajan askel. Testi (1) varmistaa että jokainen luokiteltu ankkuri on olemassa, (2) lukitsee päätöspaikkojen LUKUMÄÄRÄT tiedostoittain,
 * jotta uusi luokittelematon päätöskohta (tai tuplattu) kaataa testin ja pakottaa luokittelun. (3) A-kohtien migraatiotila: R6.2b:n jälkeen kaikki 4 ovat ohuita kääreitä jotka kutsuvat libiä (ei paikallista päättelyä).
 */
import { describe, it, expect } from 'vitest';
import { readFileSync } from 'fs';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

const juuri = join(dirname(fileURLToPath(import.meta.url)), '..');
const lue = (f) => readFileSync(join(juuri, f), 'utf8');
const SRC = { VP: 'TalentMaster_VP_v25.html', MA: 'TalentMaster_Master_v16.html', PE: 'TalentMaster_Pelaaja_v7.html', VH: 'TalentMaster_Vanhempi_v2.html' };

// luokitellut ankkurit: [id, luokka, tiedosto, ankkuri(regex), kuvaus]
const KOHTEET = [
  ['pdc',      'A', SRC.VP, /window\._pdcPaatos = function[\s\S]{0,900}tmSeuraavaAskel\(/, 'VP päätöslähde → kääre: 10-portainen tmSeuraavaAskel'],
  ['teeTasta', 'A', SRC.VP, /const nextIdx = window\.TM_SEURAAVA_ASKEL\.tmTeeTastaOsa\(item\)/, '"tee tästä" -osan (b) valinta → lib'],
  ['sulkuVP',  'A', SRC.VP, /function _vpSulkuSeuraava\([\s\S]{0,200}tmSeuraavaJakso\(/, 'sulun seuraava jakso (VP) → kääre'],
  ['sulkuMA',  'A', SRC.MA, /function _msSeuraava\([\s\S]{0,200}tmSeuraavaJakso\(/, 'sulun seuraava jakso (Master) → kääre'],
  ['pdcHTML',  'B', SRC.VP, /function _pdcPaatosHTML\(/,               'renderöi _pdcPaatos-tuloksen'],
  ['askelHTML','B', SRC.VP, /function _vpKehSeuraavaAskelHTML\(/,      'cockpit-askelrivi (renderöi _pdcPaatos)'],
  ['askelNappi','B', SRC.VP, /function _vpAskelNappi\(/,               'askeleen painike (semanttinen avain → fn)'],
  ['rvcSit',   'B', SRC.VP, /function _rvcSitoumusOdottaa\(/,          'bulk-signaali (syöte säännölle 3)'],
  ['msUmp',    'B', SRC.MA, /_msJfLib\.tmJfUmpeutunut\(jf\)/,          'Master "Sulje jakso" -nappi umpeutuneelle (UI; sääntö 4 lukee samaa libiä)'],
  ['msSilta',  'B', SRC.MA, /TM_ARVIOINTI_SILTA\.tmSiltaEhdota\(p\.arviointi_havaittu, \{\s*\n\s*sallitutKonseptit: items/, 'Master lähde-vihje kun jaksofokus puuttuu (UI-vihje)'],
  ['pelMina',  'B', SRC.PE, /Seuraava askel:<\/b>/,                    'Pelaaja tki_kehityskohde / sekuntitavoite -muotoilu'],
  ['vanhTek',  'B', SRC.VH, /\/\/ 3\. Seuraava askel — yksi kehityskohde/, 'Vanhempi tekniikka-tavoiterivit'],
];
// päätöspaikka-signaalit joiden lukumäärä lukitaan (tiedosto → { regex → lkm })
const SIGNAALIT = [
  [SRC.VP, /function _vpSulkuSeuraava\(/g, 1], [SRC.MA, /function _msSeuraava\(/g, 1], [SRC.VP, /window\._pdcPaatos = function/g, 1],
  [SRC.VP, /\btoim\('/g, 11], [SRC.VP, /const nextIdx\b/g, 1],   // toim(' × 11 = _pdcPaatos-kääreen tekstihaarat (yksi per askel; +valinta_odottaa D-1)
  [SRC.VP, /\.tmSiltaEhdota\(/g, 1], [SRC.MA, /\.tmSiltaEhdota\(/g, 1],   // sulku-kääreet käyttävät libiä; jäljellä vain Masterin UI-vihje (B) / VP:n ehdotus-render
  [SRC.VP, /\.tmFyysEhdota\(|_vpFyysEhdotus\(/g, 6], [SRC.MA, /\.tmFyysEhdota\(|_msFyysEhdotus\(/g, 4],
  [SRC.VP, /\.tmJfUmpeutunut\(/g, 5], [SRC.MA, /\.tmJfUmpeutunut\(/g, 1],
  [SRC.VP, /laskeReviewKadenssi\(/g, 2], [SRC.VP, /\bidpJumissa\(/g, 1], [SRC.VP, /_rvcSitoumusOdottaa\(/g, 3],   // _pdcPaatos ei enää laske itse (cockpit-rivit + UI jäävät)
];

describe('R6.2b inventaario — luokitellut ankkurit olemassa', () => {
  KOHTEET.forEach(([id, luokka, f, re, kuv]) => it(`${luokka} ${id}: ${kuv}`, () => { expect(re.test(lue(f)), `${id} ankkuri puuttuu → luokittelu vanhentunut`).toBe(true); }));
  it('luokkien lukumäärät: A=4 · B=8 (C-kohdat ovat tarkoituksella ankkuroimatta: staattiset CTA:t, heroInsight, reflektiopäiväkirja, ADAR-rubriikit, omaKehitysKooste)', () => {
    const n = (l) => KOHTEET.filter((k) => k[1] === l).length; expect(n('A')).toBe(4); expect(n('B')).toBe(8);
  });
});

describe('R6.2b inventaario — päätöspaikkojen lukumäärät lukittu (uusi luokittelematon päätöskohta kaataa)', () => {
  SIGNAALIT.forEach(([f, re, n]) => it(`${f} ${re.source.slice(0, 50)} × ${n}`, () => { expect((lue(f).match(re) || []).length).toBe(n); }));
});

describe('R6.2b inventaario — A-kohtien migraatiotila', () => {
  it('kaikki 4 A-kohtaa ovat kääreitä (ankkurit yllä vaativat lib-kutsun) eikä paikallista päättelyä jäänyt; molemmat sovellukset lataavat libin', () => {
    expect(KOHTEET.filter((k) => k[1] === 'A').map((k) => k[0])).toEqual(['pdc', 'teeTasta', 'sulkuVP', 'sulkuMA']);
    expect(lue(SRC.VP)).toContain('lib/tm_seuraava_askel.js'); expect(lue(SRC.MA)).toContain('lib/tm_seuraava_askel.js');
    expect(lue(SRC.VP)).not.toMatch(/item\.kpi\.length >= 2\) \? 1 : 0/);
  });
});
