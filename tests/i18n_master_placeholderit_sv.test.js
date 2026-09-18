/**
 * Master sv — PLACEHOLDER-REITITYS + pyyhkäisyn johdotus.
 *
 * MIKSI OMA PORTTI: kaksi olemassa olevaa Master-gatea ovat tälle sokeita.
 *  · render-gate (idp_i18n_v5_master_render_dom) skannaa vain `>teksti<`- ja `'…'`-literaaleja JA
 *    ohittaa kaiken jolle ei ole sv-käännöstä (`if (!resolvesSv(ts)) continue`).
 *  · staattinen-DOM-vartija katsoo data-i18n-tagitusta, ei `placeholder=`-attribuutteja.
 * Niinpä `placeholder="Kirjoita henkilökohtainen palaute..."` renderöityi suomeksi sv-tilassa
 * vaikka käännös oli koko ajan sv-kartassa — se ei vain ollut reitityksessä. Tämä on osa
 * "sekava sv/fi" -oiretta: käännös on olemassa, sovellus ei aja sitä.
 *
 * Portti vaatii: jokainen näkyvä placeholder on reititetty (data-i18n-ph TAI masterT), ja
 * pyyhkäisy on kytketty sekä boottiin että kielenvaihtoon.
 */
import { describe, it, expect } from 'vitest';
import { readFileSync } from 'fs';
import { createRequire } from 'module';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

const juuri = join(dirname(fileURLToPath(import.meta.url)), '..');
const require = createRequire(import.meta.url);
const HTML = readFileSync(join(juuri, 'TalentMaster_Master_v16.html'), 'utf8');
const Msv = require('../lib/tm_master_i18n.js').TM_MASTER_I18N.sv;
const Csv = require('../lib/tm_i18n_common.js').TM_I18N_COMMON.sv;

/** Suomenkielisyys: ä/ö tai yleinen suomen sana. */
const SUOMI = /[äöÄÖ]|\b(?:ja|tai|ei|on|kirjoita|hae|luo|viesti|nimi|ohje|vaihe|viikot|valitse|lisää)\b/i;

describe('Master sv · placeholder-reititys', () => {
  it('yksikään näkyvä suomenkielinen placeholder ei ole reitittämätön', () => {
    const vuodot = [];
    const rivit = HTML.split('\n');
    rivit.forEach((rivi, i) => {
      for (const m of rivi.matchAll(/placeholder="([^"]*)"/g)) {
        const arvo = m[1];
        if (!arvo || !SUOMI.test(arvo)) continue;
        if (arvo.includes("masterT(")) continue;                 // dynaaminen reititys
        if (/data-i18n-ph=/.test(rivi)) continue;                // staattinen reititys (pyyhkäisy)
        vuodot.push(`  ${i + 1}: ${JSON.stringify(arvo.slice(0, 60))}`);
      }
    });
    expect(vuodot, 'reitittämätön placeholder renderöityy fi sv-tilassa:\n' + vuodot.join('\n')).toEqual([]);
  });

  it('EI VACUOUS: reititettyjä placeholdereita on oikeasti (molemmat tavat käytössä)', () => {
    expect((HTML.match(/data-i18n-ph="/g) || []).length).toBeGreaterThanOrEqual(4);
    expect((HTML.match(/placeholder="' \+ masterT\(/g) || []).length).toBeGreaterThanOrEqual(4);
  });

  it('jokaisella reititetyllä placeholder-avaimella on sv-käännös', () => {
    const avaimet = new Set();
    for (const m of HTML.matchAll(/data-i18n-ph="([^"]+)"/g)) avaimet.add(m[1]);
    for (const m of HTML.matchAll(/placeholder="' \+ masterT\('((?:[^'\\]|\\.)*)'\)/g)) {
      avaimet.add(m[1].replace(/\\'/g, "'"));
    }
    const ilman = [...avaimet].filter((k) => SUOMI.test(k) && !(k in Msv) && !(k in Csv));
    expect(ilman, 'reititetty mutta kääntämätön → yhä fi sv-tilassa').toEqual([]);
  });
});

describe('Master sv · pyyhkäisyn johdotus', () => {
  it('masterLokalisoi ajetaan bootissa VASTA kun kieli on resolvoitu', () => {
    // tmKieliInitSeura asettaa kielen seura-dokista; pyyhkäisy sen jälkeen, muuten kääntäisi fi:llä.
    const i = HTML.indexOf('tmKieliInitSeura');
    const j = HTML.indexOf('masterLokalisoi()', i);
    expect(i).toBeGreaterThan(0);
    expect(j).toBeGreaterThan(i);
  });

  it('masterLokalisoi ajetaan myös kielenvaihdossa', () => {
    const fn = HTML.slice(HTML.indexOf('function masterVaihdaKieli'), HTML.indexOf('function masterVaihdaKieli') + 400);
    expect(fn).toContain('masterLokalisoi()');
  });

  it('pyyhkäisy ajetaan KAIKISSA auth-haaroissa (kirjautunut · demo · login)', () => {
    /* Juurisyy jonka tämä lukitsee: sv valittuna mutta kirjautumatta staattiset data-i18n-otsikot
       jäivät fi:ksi, kun taas dynaaminen masterT-sisältö oli sv → "sekava sv/fi". Todennettu
       livenä: kieli sv, "Kehitysaikajana" (dynaaminen, rivi ~7545) oli sv mutta sen naapuriotsikot
       ("Pelaajan elämäkerta", "Työkalut", "Tänään") fi, koska pyyhkäisy oli vain kirjautuneen haarassa. */
    const alku = HTML.indexOf('_auth.onAuthStateChanged');
    const loppu = HTML.indexOf('// Kirjautumisen timeout-varmistus', alku);
    expect(alku).toBeGreaterThan(0);
    expect(loppu).toBeGreaterThan(alku);
    const kasittelija = HTML.slice(alku, loppu);
    // kolme haaraa: kirjautunut · anonyymi/demo · ei kirjautunut
    expect(kasittelija).toContain('_kaynnistaDemoTila()');
    expect(kasittelija).toContain('_naytaLogin()');
    const kutsut = (kasittelija.match(/masterLokalisoi\(\)/g) || []).length;
    expect(kutsut, 'jokaisen auth-haaran on pyyhkäistävä').toBeGreaterThanOrEqual(3);
  });

  it('kartan cache-bustin on noustava kun avaimia lisätään (stale-klientit)', () => {
    const m = HTML.match(/lib\/tm_master_i18n\.js\?v=(\d+)/);
    expect(m, 'i18n-kartta ladataan versioidulla URLilla').not.toBeNull();
    expect(Number(m[1])).toBeGreaterThanOrEqual(23);
  });
});
