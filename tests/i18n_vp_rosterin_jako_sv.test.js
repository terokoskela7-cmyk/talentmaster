/**
 * VP rosterin jako · sv — VAHVISTUSLAUSE KOKO LAUSEENA (prepositio-lukko).
 *
 * MIKSI: ensimmäinen toteutus paloitteli vahvistuksen jaettuun palaan:
 *   vpT('Siirretäänkö'|'Lisätäänkö') + n + vpT('pelaajaa joukkueeseen') + nimi
 * Suomessa keskipala on sama molemmissa haaroissa, ruotsissa EI:
 *   Flytta  … spelare TILL laget     (siirto)
 *   Lägg till … spelare I laget      (lisäys)
 * Jaettu pala olisi siis pakottanut toiseen haaraan väärän preposition — tai
 * "Lägg till … till laget" -tuplan. Korjaus: koko lause avaimena per haara,
 * {n}/{nimi} paikkamerkkeinä, jolloin kumpikin kieli saa oman rakenteensa.
 *
 * Portti lukitsee sekä lopputuloksen (molemmat kielet) että sen ettei paloiteltu
 * muoto palaa: irralliset avaimet eivät saa esiintyä koodissa eivätkä kartassa.
 */
import { describe, it, expect } from 'vitest';
import { readFileSync } from 'fs';
import { createRequire } from 'module';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

const juuri = join(dirname(fileURLToPath(import.meta.url)), '..');
const require = createRequire(import.meta.url);
const HTML = readFileSync(join(juuri, 'TalentMaster_VP_v25.html'), 'utf8');

const C = require('../lib/tm_i18n_common.js');
global.TM_I18N_COMMON = C.TM_I18N_COMMON;
global.tmI18nResolve = C.tmI18nResolve;
const { vpT, TM_VP_I18N } = require('../lib/tm_vp_i18n.js');

/** Sama koostus kuin tuotannossa (_vpPelSiirraValitut). */
function vahvistus(tapa, n, nimi) {
  const pohja = (tapa === 'siirto')
    ? vpT('Siirretäänkö {n} pelaajaa joukkueeseen {nimi}?')
    : vpT('Lisätäänkö {n} pelaajaa joukkueeseen {nimi}?');
  return pohja.replace('{n}', n).replace('{nimi}', '"' + nimi + '"');
}
function kielella(k, fn) {
  const vanha = global.tmNykyinenKieli;
  global.tmNykyinenKieli = () => k;
  try { return fn(); } finally { global.tmNykyinenKieli = vanha; }
}

describe('VP rosterin jako · vahvistuslause', () => {
  it('sv: siirto käyttää "till laget", lisäys "i laget" — ei väärää prepositiota', () => {
    const siirto = kielella('sv', () => vahvistus('siirto', 3, 'P14 Musta'));
    const lisays = kielella('sv', () => vahvistus('lisays', 3, 'P14 Musta'));
    expect(siirto).toBe('Flytta 3 spelare till laget "P14 Musta"?');
    expect(lisays).toBe('Lägg till 3 spelare i laget "P14 Musta"?');
    // Juuri se virhe jonka koko lauseen avain estää:
    expect(lisays).not.toContain('till laget');
    expect(lisays.match(/till/g).length, '"Lägg till … till laget" -tupla').toBe(1);
  });

  it('fi: molemmat haarat ennallaan, paikkamerkit korvautuvat', () => {
    expect(kielella('fi', () => vahvistus('siirto', 3, 'P14 Musta')))
      .toBe('Siirretäänkö 3 pelaajaa joukkueeseen "P14 Musta"?');
    expect(kielella('fi', () => vahvistus('lisays', 12, 'P14 Valkoinen')))
      .toBe('Lisätäänkö 12 pelaajaa joukkueeseen "P14 Valkoinen"?');
  });

  it('paloiteltu muoto ei palaa — ei kuolleita avaimia koodissa eikä kartassa', () => {
    for (const k of ['Siirretäänkö', 'Lisätäänkö', 'pelaajaa joukkueeseen']) {
      expect(HTML, `vpT('${k}') palasi koodiin`).not.toContain(`vpT('${k}')`);
      expect(TM_VP_I18N.sv, `kuollut avain kartassa: ${k}`).not.toHaveProperty(k);
    }
  });

  it('kaikki rosterin jaon näkyvät tekstit resolvoituvat ruotsiksi', () => {
    const avaimet = [
      'Siirrä joukkueeseen', 'Lisää joukkueeseen', '+ Uusi joukkue', 'Tyhjennä',
      'Pelaaja voi kuulua useampaan joukkueeseen', '— luo ensin joukkue —',
      'Uuden joukkueen nimi (esim. P14 Musta)', 'Nimestä ei saatu tunnistetta',
      'Joukkue luotu', 'Luonti epäonnistui', 'Valitse joukkue', 'valittu', 'siirretty',
    ];
    const fi = kielella('sv', () => avaimet.filter((k) => vpT(k) === k));
    expect(fi, 'jäi suomeksi sv-tilassa').toEqual([]);
  });

  it('title-attribuutti on pyyhkäisyn piirissä (data-i18n-title)', () => {
    // Pelkkä title="" ei käänny — tmLokalisoiCommon lukee data-i18n-title:n.
    expect(HTML).toContain('data-i18n-title="Pelaaja voi kuulua useampaan joukkueeseen"');
  });

  it('kartan cache-bustin on noussut (stale-klientit eivät saa uusia avaimia)', () => {
    const m = HTML.match(/lib\/tm_vp_i18n\.js\?v=(\d+)/);
    expect(m).not.toBeNull();
    expect(Number(m[1])).toBeGreaterThanOrEqual(78);
  });
});
