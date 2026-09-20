/**
 * KIRJAUTUMISAIKALEIMA — `viimeisinKirjautuminen` -kentän kirjoituspiste.
 *
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

const juuri = join(dirname(fileURLToPath(import.meta.url)), '..');
const lue = (p) => readFileSync(join(juuri, p), 'utf8');
const LIB = lue('lib/tm_aktiivisuus.js');

/**
 * Toimihenkilöapit = apit joissa kirjautunut henkilö on seuran henkilökuntaa ja
 * jolla on oma `seurat/{sid}/kayttajat/{uid}`-dokki. Näiden JOKAISEN on
 * merkittävä kirjautuminen, muuten kyseisen appin käyttäjät näyttävät
 * passiivisilta vaikka työskentelevät.
 *
 * TIETOISESTI ULKOPUOLELLA (ei kayttajat-dokkia seuran alla / ei seura-roolia):
 *   · Admin.html            — SA, ei `seuraId`-claimia (§3)
 *   · Pelaaja_v7            — pelaaja (PIN/Anonymous Auth)
 *   · Vanhempi_v2           — huoltaja
 *   · Valmentajakortti      — raporttityökalu, ei ratkaise omaa seuraa/uid:tä
 *   · Harjoitettavuus_v4    — arkistoitava edeltäjä (Testaus_v9 korvasi)
 *   · SportDirector_v1      — ei autentikointia lainkaan (0 onAuthStateChanged)
 */
const TOIMIHENKILOAPIT = [
  'TalentMaster_ADAR_Pikakortti.html',
  'TalentMaster_Master_v16.html',
  'TalentMaster_Seura.html',
  'TalentMaster_Testaus_v9.html',
  'TalentMaster_UTJ_v1.html',
  'TalentMaster_VP_v25.html',
];

describe('Kirjautumisaikaleima · viimeisinKirjautuminen', () => {
  it('lib kirjoittaa oikean kentän oikeaan polkuun', () => {
    expect(LIB, 'kirjoitusfunktio puuttuu').toMatch(/function merkitseKirjautuminen\(/);
    expect(LIB, 'väärä kenttänimi').toContain('viimeisinKirjautuminen');
    expect(LIB, 'serverTimestamp puuttuu').toContain('serverTimestamp()');
    expect(LIB, 'kirjoittaa väärään kokoelmaan').toMatch(/collection\('kayttajat'\)/);
    /* Best-effort: kirjautuminen ei saa kaatua jos kirjoitus epäonnistuu. */
    expect(LIB, 'ei .catch-suojaa — epäonnistuva kirjoitus kaataisi kirjautumisen').toMatch(/\.catch\(/);
  });

  it('SNAKE_CASE on kielletty koodissa — se jättäisi VP:n VAI+:n rikki', () => {
    /* docs/PILOTIN_TILA_SPEC.md ehdotti `viimeisin_kirjautuminen`. VP_v25 lukee
       camelCasea, joten snake-nimellä kirjoitettu arvo ei koskaan päätyisi
       laskentaan — kenttä näyttäisi täyttyvän mutta mittari pysyisi nollassa. */
    const koodi = readdirSync(juuri).filter((f) => /^TalentMaster_.*\.html$/.test(f))
      .concat(readdirSync(join(juuri, 'lib')).filter((f) => /\.js$/.test(f)).map((f) => 'lib/' + f));
    const osumat = koodi.filter((f) => lue(f).includes('viimeisin_kirjautuminen'));
    expect(osumat, 'snake_case-nimi koodissa').toEqual([]);
  });

  it('JOKAINEN toimihenkilöappi lataa libin JA kutsuu sitä', () => {
    TOIMIHENKILOAPIT.forEach((f) => {
      const src = lue(f);
      expect(src, f + ': lib-script-tagi puuttuu').toContain('lib/tm_aktiivisuus.js');
      expect(src, f + ': tmMerkitseKirjautuminen-kutsu puuttuu').toMatch(/tmMerkitseKirjautuminen\(/);
    });
  });

  it('DRIFT: kirjoittajajoukko on lukittu — uusi/kadonnut kutsu punertaa', () => {
    /* Skannaa KAIKKI apit, ei vain listaa: uusi toimihenkilöappi joka unohtaa
       kutsun EI näy tässä (se ei voi näkyä ennen kuin joku lisää sen listaan),
       mutta appi joka LISÄÄ kutsun ilman listausta näkyy heti — ja appi joka
       POISTAA sen näkyy heti. Lista pysyy siten pakotetusti ajan tasalla. */
    const apit = readdirSync(juuri).filter((f) => /^TalentMaster_.*\.html$/.test(f));
    expect(apit.length).toBeGreaterThan(5);
    const kutsuvat = apit.filter((f) => /tmMerkitseKirjautuminen\(/.test(lue(f)));
    expect(kutsuvat.sort(), 'kirjautumisen merkitsijöiden joukko muuttui — päivitä TOIMIHENKILOAPIT')
      .toEqual(TOIMIHENKILOAPIT.slice().sort());
  });

  it('DRIFT: kentän LUKIJAT ovat tunnettuja — uusi lukija vaatii kirjoittajan', () => {
    /* Lukija ilman kirjoittajaa oli koko bugi. Jos uusi appi alkaa lukea
       kenttää, se on tarkistettava: saako se dataa vai näyttääkö nollaa? */
    const LUKIJAT = ['TalentMaster_VP_v25.html'];
    const apit = readdirSync(juuri).filter((f) => /^TalentMaster_.*\.html$/.test(f));
    const lukevat = apit.filter((f) => {
      const src = lue(f);
      /* Kutsu itse sisältää kenttänimen vain libissä, ei apeissa → lukija =
         appi joka mainitsee kentän eikä ole pelkkä kutsuja. */
      return src.includes('viimeisinKirjautuminen');
    });
    expect(lukevat.sort(), 'uusi `viimeisinKirjautuminen`-lukija — varmista että kirjoittaja kattaa sen apin käyttäjät')
      .toEqual(LUKIJAT.slice().sort());
  });

  it('SA ohitetaan — SA:lla ei ole kayttajat-dokkia seuran alla (§3)', () => {
    /* Kirjoitus SA:na tuottaisi permission-denied-kohinaa joka sivulatauksella. */
    ['TalentMaster_VP_v25.html', 'TalentMaster_ADAR_Pikakortti.html'].forEach((f) => {
      const src = lue(f);
      const i = src.indexOf('tmMerkitseKirjautuminen(');
      const ennen = src.slice(Math.max(0, i - 260), i);
      expect(ennen, f + ': SA-vahti puuttuu kutsun edestä').toMatch(/isSuperAdmin/);
    });
  });

  it('TYHJÄ ≠ 0 — lib erottaa "ei dataa" nollasta', () => {
    expect(LIB, 'paiviaKirjautumisesta puuttuu').toMatch(/function paiviaKirjautumisesta\(/);
    /* null-paluu puuttuvalle arvolle on se mikä estää "0 pv sitten" -valheen. */
    expect(LIB).toMatch(/if \(!ms\) return null;/);
  });
});
