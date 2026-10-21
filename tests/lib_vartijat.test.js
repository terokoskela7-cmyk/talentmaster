/* PR 3b · vartijat (CLAUDE.md "Kolmen kerroksen malli"): (1) yksikään lib/-tiedosto ei ylitä ~500 riviä (nykyiset isot sallittu eikä saa kasvaa); (2) tasoihin, rajoihin ja normeihin liittyvää logiikkaa ei lisätä TalentMaster_*.html-tiedostoihin. */
import { describe, it, expect } from 'vitest';
import { readFileSync, readdirSync } from 'fs';
import { createRequire } from 'module';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';
const require = createRequire(import.meta.url);
const juuri = join(dirname(fileURLToPath(import.meta.url)), '..');
const { laske } = require('../scripts/html_logiikka_baseline.cjs');
const RAJA = 520;   // "noin 500"
/* Sallittu lista: tätä isommat tiedostot nykyisessä koossaan (kattona). Lista saa vain PIENENTYÄ — kun tiedosto pilkotaan, poista/laske rivi tästä.
   Poikkeus: i18n-kartat (tm_lib_i18n.js, tm_master_i18n.js …) ovat Geminin käännösdataa, eivät logiikkaa — katto nousee vain Gemini-erän viennissä (sv-erä 83 (K4c): lib_i18n 1378→1438; sv-erä 80 (K1d): lib_i18n 1295→1378, vp_i18n 3798→3821, master_i18n 1726→1728; sv-erä 79 (K4a): 1109→1295, sv-erä 19 osavienti: 584→594, sv-erät 46+47 (D248-sanasto): 594→633, sv-erät 48–50: 633→687, sv-erät 51+52 (Sibbo-valmius): 687→823, sv-erä 53 + erän 19 VP-rivit (Sibbo-reititys): lib 823→876 (+ harjoitusarviointilomake 22), master 1713→1722, vp 3755→3798, sv-erä 54: tm_lang →3844, lib →911, master →1726; tm_lang 3699→3819 (suostumuslomakkeen reititys: 47 avainta × fi/sv/en), 1608→1626; sv-erä 68 vienti (klippikortti, 2 riviä): tm_lib_i18n →1043; sv-erä 40 vienti: tm_master_i18n 1626→1694; sv-erä 41 vienti: 1694→1713; sv-erä 72 vienti ("Aseta alue", 1 rivi + kommentti): tm_lib_i18n 1051→1053). */
const ISOT = { 'hpp_rehab_protokollat.js': 1545, 'tm-microcycles.js': 1491, 'tm_bioika.js': 534, 'tm_eerikkila_normit.js': 2006, 'tm_idp.js': 733, 'tm_kaavio_kanon_data.js': 1715, 'tm_kaavio_ui.js': 2030,
  'tm_henkilosto_i18n.js': 575, 'tm_kehityskaari.js': 722, 'tm_kehitystilanne.js': 684, 'tm_lang.js': 4044, 'tm_lib_i18n.js': 1438, 'tm_master_i18n.js': 1728, 'tm_pelihavainto.js': 918, 'tm_teknistaktiset.js': 4886, 'tm_teknistaktiset_sv.js': 1270, 'tm_vp_i18n.js': 3821 };
const rivit = (f) => readFileSync(join(juuri, 'lib', f), 'utf8').split('\n').length - 1;

describe('vartija 1: lib-tiedoston koko', () => {
  const tiedostot = readdirSync(join(juuri, 'lib')).filter((f) => f.endsWith('.js'));
  it('jokainen lib/-tiedosto ≤ ' + RAJA + ' riviä tai sallitulla listalla eikä sen kattoa ylitetä', () => {
    const rikkojat = tiedostot.filter((f) => rivit(f) > (ISOT[f] != null ? ISOT[f] : RAJA)).map((f) => f + ' ' + rivit(f) + ' > ' + (ISOT[f] != null ? ISOT[f] : RAJA));
    expect(rikkojat, 'pilko tiedosto (lib/ ≤ ~500 riviä) — kolmen kerroksen malli').toEqual([]);
  });
  it('sallittu lista on elävä: jokainen listan tiedosto on yhä olemassa ja yli rajan (pienentynyt tiedosto → poista rivi)', () => {
    expect(Object.keys(ISOT).filter((f) => !tiedostot.includes(f) || rivit(f) <= RAJA)).toEqual([]);
  });
  it('uudet kolme kerrosta ovat pieniä', () => { for (const f of ['tm_normisto.js', 'tm_joukkuesaanto.js', 'tm_tekniikka.js', 'tm_fyysinen.js']) expect(rivit(f), f).toBeLessThanOrEqual(RAJA); });
});

describe('vartija 2: tasoihin, rajoihin ja normeihin liittyvää logiikkaa ei lisätä HTML:ään', () => {
  const baseline = JSON.parse(readFileSync(join(juuri, 'tests/fixtures/html_logiikka_baseline.json'), 'utf8')), nyt = laske();
  it('esiintymät (normitaulu, normihaku, TKI-raja, tasoraja, TKI/20-konversio) eivät kasva yhdessäkään TalentMaster_*.html-tiedostossa', () => {
    const kasvaneet = [];
    for (const f of Object.keys(nyt)) for (const k of Object.keys(nyt[f])) { const sallittu = baseline[f] && baseline[f][k] != null ? baseline[f][k] : 0; if (nyt[f][k] > sallittu) kasvaneet.push(f + ' · ' + k + ' ' + sallittu + ' → ' + nyt[f][k]); }
    expect(kasvaneet, 'siirrä logiikka lib/-tiedostoon (asetukset parametrina), älä lisää HTML:ään').toEqual([]);
  });
  it('sallittu lista ei ole vanhentunut ylöspäin: baseline ei ylitä nykytilaa (kun logiikka siirtyy libiin, aja node scripts/html_logiikka_baseline.cjs --kirjoita)', () => {
    const vanhentuneet = []; for (const f of Object.keys(baseline)) for (const k of Object.keys(baseline[f])) if (!nyt[f] || nyt[f][k] < baseline[f][k]) vanhentuneet.push(f + ' · ' + k);
    expect(vanhentuneet).toEqual([]);
  });
  it('vartija toimii (ei vacuous): nykyiset lainat löytyvät', () => { expect(Object.values(nyt).reduce((a, o) => a + o.normihaku + o.tkiRaja + o.tasoRaja, 0)).toBeGreaterThan(20); });
});
