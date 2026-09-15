/**
 * V5 · Etuovi — juuren landing + on-brand 404.
 *
 * MIKSI PORTTI: landing on ainoa sivu jonka kylmä kävijä näkee ensin, ja sen linkit ovat
 * juurisuhteellisia. Kaksi hiljaista tapaa rikkoa se:
 *  (1) LINKKI KOHTEESEEN JOTA EI TARJOILLA. firebase.jsonin ignore-lista päättää tarjoiltavan
 *      joukon; ignoroituun sivuun osoittava CTA näyttää repossa oikealta ja antaa 404:n
 *      tuotannossa. Sama luokka kuin V3a:n served-suljettu-portti, nyt etuovelle.
 *  (2) STAATTISUUDEN MENETYS. Jos landingiin lipsahtaa Firebase-SDK, se vetää mukanaan
 *      App Check -riippuvuuden ja CSP-kytkennät sivulle jonka koko pointti on latautua heti
 *      ilman niitä. Enforcen jälkeen se olisi myös ensimmäinen sivu joka voi hylätä kävijän.
 */
import { describe, it, expect } from 'vitest';
import { readFileSync, existsSync } from 'fs';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

const juuri = join(dirname(fileURLToPath(import.meta.url)), '..');
const lue = (p) => readFileSync(join(juuri, p), 'utf8');
const IGNORE = JSON.parse(lue('firebase.json')).hosting.ignore;
const ignoroitu = (p) => IGNORE.some((g) => g === p || (g.endsWith('/**') && p.startsWith(g.slice(0, -2))));

const SIVUT = ['index.html', '404.html'];

/* Sisäänkäynnit. HUOM Player_Home: brief listasi SOLOn kohteeksi Solo_Koti.html, mutta se lukee
   valmista localStorage-profiilia (tm_solo_profiili) eikä tarjoa onboardingia — kylmä kävijä
   päätyisi tyhjään kotiin, eikä Solo_Koti linkitä Player_Homeen. Player_Home on §8:n mukaan
   SOLO-onboarding (splash → nimi → syntymä → kortti) = oikea kylmä sisäänkäynti. Solo_Koti
   säilyy toissijaisena "jatka"-linkkinä palaaville. */
const SISAANKAYNNIT = [
  'TalentMaster_Seura.html',
  'TalentMaster_VP_v25.html',
  'TalentMaster_Master_v16.html',
  'TalentMaster_Player_Home.html',
  'TalentMaster_Solo_Koti.html',
];

/* Nämä avataan AINA generoidulla sähköpostilinkillä → etuovella ei saa olla niihin nappia
   (kylmä kävijä ei voi käyttää niitä ilman parametreja). */
const VAIN_LINKILLA = [
  'TalentMaster_Pelaaja_v7.html',
  'TalentMaster_Vanhempi_v2.html',
  'TalentMaster_Solo_Lupa.html',
  'TalentMaster_Rekisterointi_Suostumus.html',
];

describe('tiedostot ovat olemassa ja tarjoiltavia', () => {
  it.each(SIVUT)('%s on juuressa', (f) => expect(existsSync(join(juuri, f))).toBe(true));
  it.each(SIVUT)('%s EI ole ignore-listalla (muuten Hosting ei tarjoile sitä)', (f) => {
    expect(ignoroitu(f)).toBe(false);
  });
});

describe('reititys', () => {
  const kohteet = () => [...lue('index.html').matchAll(/href="(\/[^"]+\.html)"/g)].map((m) => m[1].slice(1));

  it('linkittää tasan sovittuihin sisäänkäynteihin', () => {
    expect([...new Set(kohteet())].sort()).toEqual([...SISAANKAYNNIT].sort());
  });
  /* Tarkistus AIDOISTA hrefeistä, ei vain vakiolistasta: muuten uusi linkki olemattomaan
     sivuun menisi läpi kunhan joku päivittää myös vakion. */
  it('jokainen index.html:n linkkikohde on olemassa ja tarjoiltava', () => {
    const rikki = kohteet().filter((t) => !existsSync(join(juuri, t)) || ignoroitu(t));
    expect(rikki).toEqual([]);
  });
  it.each(SISAANKAYNNIT)('%s on olemassa JA tarjoiltava', (t) => {
    expect(existsSync(join(juuri, t)), 'tiedostoa ei ole').toBe(true);
    expect(ignoroitu(t), 'ignore-listalla → 404 tuotannossa').toBe(false);
  });
  it.each(VAIN_LINKILLA)('%s EI ole etuovella (avataan vain kutsulinkillä)', (t) => {
    expect(lue('index.html')).not.toContain(`href="/${t}"`);
  });
  it('linkit ovat juurisuhteellisia eikä alipolkua ole', () => {
    for (const f of SIVUT) {
      expect(lue(f), f).not.toContain('/talentmaster/');
      expect(lue(f), f).not.toContain('github.io');
    }
    expect(kohteet().length).toBeGreaterThan(0);
  });
  it('404 ohjaa etusivulle', () => expect(lue('404.html')).toContain('href="/"'));
});

describe('staattisuus — ei Firebasea, ei uusia origineja', () => {
  /* Haetaan KOODIA, ei sanaa: sivujen kommentit selittävät nimenomaan miksi Firebasea EI ole,
     eikä selitys ole riippuvuus. (Origin-testi alla sulkee SDK:n latauksen joka tapauksessa:
     ainoat sallitut originit ovat fontit, joten firebasejs:ää ei voi ladata.) */
  it.each(SIVUT)('%s ei lataa Firebase-SDK:ta eikä alusta sitä', (f) => {
    const s = lue(f);
    expect(s, 'SDK-script').not.toMatch(/gstatic\.com\/firebasejs/);
    expect(s, 'SDK-kutsu').not.toMatch(/\bfirebase\s*\./);
    expect(s, 'alustus').not.toMatch(/initializeApp\s*\(|initializeAppCheck\s*\(|tmAppCheckAktivoi\s*\(/);
  });
  it.each(SIVUT)('%s käyttää vain jo sallittuja ulkoisia origineja (Google Fonts)', (f) => {
    const originit = [...new Set([...lue(f).matchAll(/https:\/\/[a-z0-9.-]+/g)].map((m) => m[0]))];
    expect(originit.sort()).toEqual(['https://fonts.googleapis.com', 'https://fonts.gstatic.com']);
  });
});

describe('brändilukko (§5)', () => {
  it.each(SIVUT)('%s määrittelee molemmat teemat', (f) => {
    const s = lue(f);
    expect(s).toMatch(/:root\[data-theme="dark"\]/);
    expect(s).toMatch(/:root\[data-theme="light"\]/);
  });
  it.each(SIVUT)('%s: tumma on oletus', (f) => expect(lue(f)).toMatch(/<html[^>]*data-theme="dark"/));
  it.each(SIVUT)('%s käyttää vain brändifontteja', (f) => {
    const perheet = [...lue(f).matchAll(/font-family:\s*([^;]+);/g)].map((m) => m[1]);
    const kielletyt = perheet.filter((p) => !/var\(--font-(serif|sans|mono)\)/.test(p));
    expect(kielletyt, 'muu kuin token-fontti').toEqual([]);
    expect(lue(f)).not.toMatch(/Playfair Display/);
  });
  it.each(SIVUT)('%s: hex-värit vain teemalohkoissa (ei kovakoodausta muualla)', (f) => {
    const s = lue(f);
    const lohkot = [...s.matchAll(/:root\[data-theme="(?:dark|light)"\]\s*\{[^}]*\}/g)].map((m) => m[0]).join('\n');
    const kaikki = (s.match(/#[0-9A-Fa-f]{3,8}\b/g) || []);
    const lohkoissa = (lohkot.match(/#[0-9A-Fa-f]{3,8}\b/g) || []).length;
    expect(kaikki.length - lohkoissa, 'hex teemalohkojen ulkopuolella: ' + kaikki.join(' ')).toBe(0);
  });
  it.each(SIVUT)('%s: terävät kulmat (ei border-radiusta)', (f) => {
    expect(lue(f)).not.toMatch(/border-radius/);
  });
  it.each(SIVUT)('%s: Cormorant ei koskaan bold', (f) => {
    const serif = [...lue(f).matchAll(/font-family:\s*var\(--font-serif\)[\s\S]{0,140}?\}/g)].map((m) => m[0]);
    for (const lohko of serif) expect(lohko, lohko.slice(0, 60)).not.toMatch(/font-weight:\s*(700|800|900|bold)/);
  });
});
