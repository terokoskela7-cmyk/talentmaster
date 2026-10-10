/* D171 · "Seuran tauko" -kalenteritapahtuma: VP luo Kalenterissa (alku, viimeinen päivä, nimi); Koti lukee sen palstalle. Rules: nykyinen kalenterikokoelma sallii johdon (VP/UTJ) luonnin → ei Rules-muutosta. */
import { describe, it, expect } from 'vitest';
import { readFileSync } from 'fs';
import { createRequire } from 'module';
const require = createRequire(import.meta.url);
const VP = readFileSync(new URL('../TalentMaster_VP_v25.html', import.meta.url), 'utf8'), RULES = readFileSync(new URL('../tm_admin/firestore.rules', import.meta.url), 'utf8');
const KK = require('../lib/tm_vp_koti.js'), PU = require('../lib/tm_seuran_pulssi.js'), KP = require('../lib/tm_kalenteri_pelaajalle.js'), F = require('./helpers/vp_fixture.cjs');
const NYT = Date.UTC(2026, 9, 12, 7, 0), DAY = 86400000, teksti = (h) => h.replace(/<[^>]+>/g, ' ').replace(/\s+/g, ' ');

describe('VP: uusi kalenteritapahtuman tyyppi "Seuran tauko"', () => {
  it('KALENTERI_TYYPIT.seuran_tauko ("Seuran tauko"); tyyppivalitsin listaa sen (rakennetaan KALENTERI_TYYPIT:stä)', () => { expect(VP).toMatch(/seuran_tauko:\s+\{ nimi: 'Seuran tauko'/); expect(VP).toContain('Object.keys(KALENTERI_TYYPIT)'); });
  it('lomake: tyypille seuran_tauko näkyy "Viimeinen päivä", kellonajat ja joukkue piiloon; tallennus koko päivän jaksona alkupäivästä viimeiseen (koko_paiva, ei joukkuetta); viimeinen päivä ei ennen alkua', () => {
    expect(VP).toContain("vpT('Viimeinen päivä')"); expect(VP).toContain("tyyppiSel.value === 'seuran_tauko'"); expect(VP).toContain("loppuPvmInp.value + 'T23:59:00'"); expect(VP).toContain('koko_paiva: _tauko2'); expect(VP).toContain("vpT('Viimeinen päivä ei voi olla ennen alkua')");
    expect(VP).toMatch(/joukkue: _tauko2 \? null :/); expect(VP).toMatch(/joukkueet: !_tauko2 && joukkueSel\.value/);
  });
  it('Koti-adapteri välittää paattyy-kentän (taukoviikon loppu)', () => { expect(VP).toMatch(/alkaa: e\.alkaa, paattyy: e\.paattyy, tyyppi: e\.tyyppi/); });
});

describe('Koti lukee tauon', () => {
  it('seuran_tauko → palstalle katkoviivalaatikko "Nimi · vk a–b · pp.kk.–pp.kk."; ei myös tapahtumariviksi; ei kellonaikaa', () => {
    const d = F.lataa('kypsa', NYT); d.kalenteri = d.kalenteri.filter((e) => e.tyyppi !== 'seuran_tauko').concat([{ nimi: 'Talviloma', tyyppi: 'seuran_tauko', alkaa: NYT + 2 * DAY, paattyy: NYT + 9 * DAY - 60000 }]);
    const x = teksti(F.kotiHTML(d, {})); expect(x).toMatch(/Talviloma · vk 42–43 · 14\.10\.–21\.10\./); expect((x.match(/Talviloma/g) || []).length).toBe(1);
  });
  it('pelkkä alkupäivä (ei paattyy) → yhden päivän tauko; tauko ei osu 14 päivän sisään → ei näy', () => {
    const d = F.lataa('kypsa', NYT); d.kalenteri = d.kalenteri.filter((e) => e.tyyppi !== 'seuran_tauko').concat([{ nimi: 'Pyhäpäivä', tyyppi: 'seuran_tauko', alkaa: NYT + 3 * DAY }, { nimi: 'Kaukana', tyyppi: 'seuran_tauko', alkaa: NYT + 40 * DAY, paattyy: NYT + 45 * DAY }]);
    const x = teksti(F.kotiHTML(d, {})); expect(x).toContain('Pyhäpäivä · vk 42'); expect(x).not.toContain('Kaukana');
  });
});

describe('Tietosuoja ja Rules: tauko ei vuoda pelaajalle; ei Rules-muutosta tarvita', () => {
  it('joukkueeton seuran_tauko ei kuulu millekään pelaajalle (tmKuuluuPelaajalle vaatii joukkueen)', () => {
    const ev = { id: 't', tyyppi: 'seuran_tauko', nimi: 'Syysloma', alkaa: new Date(NYT + DAY), paattyy: new Date(NYT + 8 * DAY), joukkue: null, joukkueet: [] }, joukkueDocs = [{ id: 'j1', nimi: 'P12' }];
    expect(KP.tmKuuluuPelaajalle(ev, { id: 'p1', joukkue: 'P12', joukkueet: ['j1'] }, joukkueDocs)).toBe(false); expect(KP.tmValitse([ev], { id: 'p1', joukkueet: ['j1'] }, joukkueDocs, NYT)).toEqual([]);
  });
  it('Rules: seurat/{sid}/kalenteri create sallii johdon (onJohtoRooli: VP/UTJ) ilman tyyppirajoitusta; toisen seuran VP ei (onOmaSeura) — olemassa oleva blokki riittää', () => {
    const blokki = RULES.slice(RULES.indexOf('match /kalenteri/{tapahtumaId} {')); const create = blokki.slice(blokki.indexOf('allow create:'), blokki.indexOf('allow update:'));
    expect(create).toContain('onOmaSeura(seuraId) && onJohtoRooli()'); expect(create).not.toMatch(/request\.resource\.data\.tyyppi/);
  });
});
