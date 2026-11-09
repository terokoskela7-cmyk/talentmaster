/**
 * KIRJAUTUMISAIKALEIMA — `viimeisinKirjautuminen` -kentän LUKUPUOLI.
 *
 * Projekti 03 (PR C): kirjoituspiste POISTETTU libistä ja kaikista sovelluksista — kenttä kirjoitetaan palvelimella
 * (functions/kirjautumisaika.js, yöajo). Tämä testi lukitsee: (1) lib ei enää kirjoita, (2) yksikään sovellus ei kutsu kirjoittajaa,
 * (3) lukijajoukko on tunnettu, (4) TYHJÄ ≠ 0. Avauskirjoitusvartija kokonaisuutena: tests/avauskirjoitukset_vartija.test.js.
 *
 * HISTORIA (miksi kenttä on olemassa):
 * MIKSI TÄMÄ PORTTI ON OLEMASSA:
 * kenttä oli koodipohjassa **vain lukuna**. VP_v25 `laskeVAI` n4 (Kontakti,
 * paino 0.15) luki sen, mutta mikään appi eikä `functions/` kirjoittanut sitä.
 * Lopputulos tuotannossa: n4 = 0 jokaisella valmentajalla → VAI+ jopa 15 p
 * liian matala + punainen "Ei kirjautunut 30pv" JOKAISELLA valmentajakortilla.
 * Lukija ilman kirjoittajaa ei näy mistään — paitsi väärinä lukuina.
 *
 * Sama vikaluokka kuin `lasnaolo_n` (Master kirjoitti, VP ei): jaettu kenttä,
 * monta appia, kytkentä ihmisen muistin varassa. Siksi kirjoittajajoukko on
 * lukittu TÄSSÄ, ei muistissa.
 */
import { describe, it, expect } from 'vitest';
import { readFileSync, readdirSync } from 'fs';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';
import { createRequire as _kuoriReq, createRequire } from 'module';
const { lueKuori } = _kuoriReq(import.meta.url)('../scripts/kuoren_lahde.js');   // Seura.html + seura/-osat (rivikattojen purku)

const juuri = join(dirname(fileURLToPath(import.meta.url)), '..');
const lue = (p) => lueKuori(p);
const LIB = lue('lib/tm_aktiivisuus.js');

/* Sovellukset, joiden KUULUU lukea kenttä (VAI+ n4 Kontakti). Uusi lukija vaatii tarkistuksen: kirjoittaja on nyt palvelin. */
const LUKIJAT = ['TalentMaster_VP_v25.html'];
const apit = () => readdirSync(juuri).filter((f) => /^TalentMaster_.*\.html$/.test(f));

describe('Kirjautumisaikaleima · viimeisinKirjautuminen (lukupuoli)', () => {
  it('lib EI kirjoita: ei merkitseKirjautuminen-funktiota, ei aliasta, ei serverTimestampia eikä update-kutsua', () => {
    expect(LIB).not.toMatch(/merkitseKirjautuminen/i);
    expect(LIB).not.toContain('serverTimestamp()');
    expect(LIB).not.toMatch(/\.update\(/);
    expect(LIB).not.toContain('sessionStorage');
  });

  it('lib vie vain lukufunktiot: aikaMs, paiviaKirjautumisesta (+ KENTTA, VERSIO)', () => {
    const API = createRequire(import.meta.url)('../lib/tm_aktiivisuus.js');
    expect(Object.keys(API).sort()).toEqual(['KENTTA', 'VERSIO', 'aikaMs', 'paiviaKirjautumisesta']);
    expect(API.KENTTA).toBe('viimeisinKirjautuminen');
    expect(typeof API.aikaMs).toBe('function'); expect(typeof API.paiviaKirjautumisesta).toBe('function');
  });

  it('SNAKE_CASE on kielletty koodissa — se jättäisi VP:n VAI+:n rikki', () => {
    /* docs/PILOTIN_TILA_SPEC.md ehdotti `viimeisin_kirjautuminen`. VP_v25 lukee camelCasea, joten snake-nimellä kirjoitettu arvo
       ei koskaan päätyisi laskentaan — kenttä näyttäisi täyttyvän mutta mittari pysyisi nollassa. */
    const koodi = apit().concat(readdirSync(join(juuri, 'lib')).filter((f) => /\.js$/.test(f)).map((f) => 'lib/' + f));
    expect(koodi.filter((f) => lue(f).includes('viimeisin_kirjautuminen')), 'snake_case-nimi koodissa').toEqual([]);
  });

  it('KÄÄNNETTY: yksikään sovellus ei kutsu tmMerkitseKirjautuminen / merkitseKirjautuminen (kirjoittaja on palvelin)', () => {
    expect(apit().length).toBeGreaterThan(5);
    const kutsuvat = apit().filter((f) => /merkitseKirjautuminen\(/i.test(lue(f)));
    expect(kutsuvat, 'avauskirjoitus palasi koodiin').toEqual([]);
  });

  it('DRIFT: kentän LUKIJAT ovat tunnettuja — uusi lukija vaatii tarkistuksen', () => {
    const lukevat = apit().filter((f) => lue(f).includes('viimeisinKirjautuminen'));
    expect(lukevat.sort(), 'uusi `viimeisinKirjautuminen`-lukija — varmista että palvelimen yöajo kattaa sen apin käyttäjät')
      .toEqual(LUKIJAT.slice().sort());
  });

  it('TYHJÄ ≠ 0 — lib erottaa "ei dataa" nollasta', () => {
    expect(LIB, 'paiviaKirjautumisesta puuttuu').toMatch(/function paiviaKirjautumisesta\(/);
    /* null-paluu puuttuvalle arvolle on se mikä estää "0 pv sitten" -valheen. */
    expect(LIB).toMatch(/if \(!ms\) return null;/);
  });
});
