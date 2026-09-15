/**
 * V4 · Backendin generoimat käyttäjälinkit osoittavat kanoniseen domainiin.
 *
 * MIKSI PORTTI: nämä linkit lähtevät SÄHKÖPOSTINA perheille ja pelaajille (suostumus,
 * salasanan reset, continue-url, muistutus, SOLO-lupa). Väärä base ei kaada mitään ja ei näy
 * konsolissa — se vain lähettää vastaanottajan väärään osoitteeseen. Regressio olisi siis
 * täysin hiljainen, ja huomattaisiin vasta kun Pages joskus poistetaan.
 *
 * KAKSI ERI VIRHETTÄ, molemmat lukittu erikseen:
 *  (1) väärä HOST (github.io vs talentmasterid.com)
 *  (2) jäänyt PROJEKTIALIPOLKU. Pages oli Project Pages → tarjoili repo-segmentin alta;
 *      custom domain tarjoilee juuresta. Pelkkä host-swap jättäisi segmentin → 404.
 *      Tämä on se puolikas jonka voisi vahingossa unohtaa, koska (1) näyttäisi korjatulta.
 */
import { describe, it, expect } from 'vitest';
import { readFileSync } from 'fs';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

const juuri = join(dirname(fileURLToPath(import.meta.url)), '..');
const lue = (p) => readFileSync(join(juuri, p), 'utf8');
const CF = lue('functions/index.js');

describe('kanoninen base', () => {
  it('TM_BASE_URL määritelty TASAN KERRAN', () => {
    expect((CF.match(/^const TM_BASE_URL\s*=/gm) || []).length).toBe(1);
  });
  it('oletus on tuotannon custom domain, env-override sallittu, perän kauttaviivat siivotaan', () => {
    const rivi = CF.split('\n').find((l) => /^const TM_BASE_URL\s*=/.test(l));
    expect(rivi).toContain('process.env.TM_BASE_URL');
    expect(rivi).toContain("'https://talentmasterid.com'");
    expect(rivi, 'perän / jättäisi tuplakauttaviivan linkkeihin').toMatch(/replace\(.*\$.*,\s*''\)/);
  });
  it('kaikki 8 linkkikohtaa käyttävät vakiota (määrittely + ≥8 käyttöä)', () => {
    expect((CF.match(/TM_BASE_URL/g) || []).length).toBeGreaterThanOrEqual(9);
  });
});

describe('vanha Pages-osoite ei generoi linkkejä', () => {
  it('0 × github.io-projektipolkua koko tiedostossa (myös kommenteissa)', () => {
    // Tarkoituksella myös kommentit: portin grep on se, jonka tarkastaja ajaa käsin.
    expect(CF.split('github.io/talentmaster').length - 1).toBe(0);
  });
  it('0 × projektialipolkua — pelkkä host-swap ei riitä', () => {
    expect(CF.split('/talentmaster/').length - 1).toBe(0);
  });
  it('github.io säilyy VAIN CORS-originina, ilman alipolkua (Pages on yhä fallback)', () => {
    const osumat = CF.split('\n').filter((l) => l.includes('github.io') && !l.trim().startsWith('//'));
    expect(osumat.length, 'github.io koodissa muualla kuin CORS-listassa').toBe(1);
    expect(osumat[0]).toContain("'https://terokoskela7-cmyk.github.io'");
  });
});

describe('CORS-allowlist kattaa etuoven', () => {
  const lista = CF.slice(CF.indexOf('const allowedOrigins'), CF.indexOf('const allowedOrigins') + 1400);
  it.each([
    'https://talentmasterid.com',
    'https://www.talentmasterid.com',
    'https://talentmaster-pilot.web.app',
    'https://talentmaster-pilot.firebaseapp.com',
  ])('sisältää %s', (o) => expect(lista).toContain(`'${o}'`));
  it('fallbackeja EI poistettu (Pages + localhost jäävät)', () => {
    expect(lista).toContain("'https://terokoskela7-cmyk.github.io'");
    expect(lista).toContain("'http://localhost:5000'");
  });
});

/* Nämä kolme ovat firebase.jsonin ignore-listalla = Pages-only. Niiden sisäiset github.io-linkit
   ovat siksi JOHDONMUKAISIA (Pages→Pages). Kanonisointi tekisi niistä 404:n, koska ne eivät ole
   Hostingin tarjoiltavassa joukossa. Testi estää "siivoamasta" niitä myöhemmässä sweepissä. */
describe('Pages-only-sivut jätetty rauhaan (kanonisointi rikkoisi ne)', () => {
  const IGNORE = JSON.parse(lue('firebase.json')).hosting.ignore;
  it.each([
    'TalentMaster_Kayttoonotto_Pilotti.html',
    'TalentMaster_Vaihe1_Roolimatriisi.html',
    'TalentMaster_Vaihe2_Flow.html',
  ])('%s on yhä ignore-listalla eikä sitä ole kanonisoitu', (tiedosto) => {
    expect(IGNORE, 'jos tämä tarjoillaan, linkit pitää kanonisoida erikseen').toContain(tiedosto);
  });
  it('Kayttoonotto_Pilotti linkittää yhä Pagesiin (Pages→Pages on oikein)', () => {
    expect(lue('TalentMaster_Kayttoonotto_Pilotti.html')).toContain('terokoskela7-cmyk.github.io');
  });
});

/* Linkkien MUOTO, ei vain base: rakennetaan samat merkkijonot kuin CF ja tarkistetaan ettei
   tuplakauttaviivaa tai alipolkua synny. */
describe('generoidut linkkimuodot', () => {
  const base = 'https://talentmasterid.com';
  it.each([
    ['suostumus', `${base}/TalentMaster_Rekisterointi_Suostumus.html?seura=kpv&pelaaja=x`],
    ['vanhempi-continue', `${base}/TalentMaster_Vanhempi_v2.html?pelaajaId=x&seuraId=kpv`],
    ['pelaajasivu', `${base}/TalentMaster_Pelaaja_v7.html?pelaajaId=x&seuraId=kpv`],
    ['reset-kohde', `${base}/TalentMaster_Seura.html`],
  ])('%s — ei alipolkua, ei tuplakauttaviivaa', (_nimi, url) => {
    expect(url).not.toContain('/talentmaster/');
    expect(url.replace('https://', '')).not.toContain('//');
    expect(new URL(url).hostname).toBe('talentmasterid.com');
  });
});
