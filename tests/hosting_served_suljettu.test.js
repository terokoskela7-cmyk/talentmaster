/**
 * V3a · TARJOILTAVA JOUKKO ON SULJETTU NAVIGOINNIN SUHTEEN.
 *
 * MIKSI: GitHub Pages tarjoilee KAIKEN repossa; Firebase Hosting kunnioittaa firebase.jsonin
 * `ignore`-listaa. Sama linkki siis toimii Pagesissa ja 404:ää custom-domainilla — vika joka on
 * näkymätön ennen cutoveria ja näkyy vasta käyttäjälle sen jälkeen. Kaksi aitoa tapausta löytyi
 * juuri näin: Solo_Koti → Kortti_Demo (päänavigaatio, ignoressa) ja Testaus_v9 → src/lib/tm_bioika.js
 * (src/** on ignoressa → PHV-laskenta olisi kadonnut hiljaa kasvumittauksesta).
 *
 * Portti johtaa tarjoiltavan joukon DATASTA (juuren html − hosting.ignore) ja seuraa linkkejä
 * TRANSITIIVISESTI: uusi tarjoiltava appi tuo omat linkkinsä vartioinnin piiriin automaattisesti.
 */
import { describe, it, expect } from 'vitest';
import { readFileSync, readdirSync, statSync, existsSync } from 'fs';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

const juuri = join(dirname(fileURLToPath(import.meta.url)), '..');
const lue = (p) => readFileSync(join(juuri, p), 'utf8');
const IGNORE = JSON.parse(lue('firebase.json')).hosting.ignore;
const OMA_PAGES = 'terokoskela7-cmyk.github.io';

/* Minimaalinen glob → regex tässä ignore-joukossa esiintyville kuvioille (**, *, ?). */
function ignoroitu(polku) {
  return IGNORE.some((g) => {
    const re = new RegExp('^' + g
      .replace(/[.+^${}()|[\]\\]/g, '\\$&')
      .replace(/\*\*\//g, '(?:.*/)?')
      .replace(/\*\*/g, '.*')
      .replace(/(?<!\.)\*/g, '[^/]*')
      .replace(/\?/g, '[^/]') + '$');
    return re.test(polku) || (g.endsWith('/**') && polku.startsWith(g.slice(0, -2)));
  });
}

/* href/src/action + JS-navigointi. `(?<=\s)` estää data-action= -väärän positiivin. */
const LINKKI = /(?:(?<=\s)|^)(?:href|src|action)\s*=\s*["']([^"'\s>]+)["']|(?:window\.open|location\.assign|location\.replace)\s*\(\s*["'`]([^"'`]+)["'`]|location\.href\s*=\s*["'`]([^"'`]+)["'`]/g;
const OHITA = /^(mailto:|tel:|javascript:|data:|blob:|#|\{)/;

function kohteet(tiedosto) {
  const ulos = [];
  for (const m of lue(tiedosto).matchAll(LINKKI)) {
    const t = m[1] || m[2] || m[3];
    if (t && !OHITA.test(t)) ulos.push(t);
  }
  return ulos;
}

const juurenHtml = () => readdirSync(juuri)
  .filter((n) => n.endsWith('.html') && statSync(join(juuri, n)).isFile()).sort();

const SERVED = juurenHtml().filter((n) => !ignoroitu(n));

/* Transitiivinen saavutettavuus: tarjoiltavista appeista lähtien. */
function skannaa() {
  const jono = [...SERVED], nahty = new Set(SERVED);
  const rikki = [], ignoroituun = [], omaPages = [];
  while (jono.length) {
    const f = jono.pop();
    if (!existsSync(join(juuri, f)) || !f.endsWith('.html')) continue;
    for (const t of kohteet(f)) {
      if (t.includes(OMA_PAGES)) { omaPages.push(`${f} → ${t}`); continue; }
      if (/^(https?:)?\/\//.test(t)) continue;                     // aito ulkoinen
      if (t.includes('${') || t.includes('"+') || t.includes("'+")) continue;  // dynaaminen
      const p = t.split('?')[0].split('#')[0].replace(/^\.\//, '');
      if (!p) continue;
      if (!existsSync(join(juuri, p))) { rikki.push(`${f} → ${t}`); continue; }
      if (ignoroitu(p)) ignoroituun.push(`${f} → ${p}`);
      if (p.endsWith('.html') && !nahty.has(p)) { nahty.add(p); jono.push(p); }
    }
  }
  return { rikki, ignoroituun, omaPages };
}

describe('tarjoiltava joukko (johdettu firebase.jsonista)', () => {
  it('EI VACUOUS: tarjoiltavia appeja on runsaasti ja ignore rajaa oikeasti', () => {
    expect(SERVED.length).toBeGreaterThan(20);
    expect(juurenHtml().length).toBeGreaterThan(SERVED.length);   // ignore ei ole tyhjä
  });
  it('App Check -appit ovat kaikki tarjoiltavia (ei backend-appia ignoren taakse)', () => {
    const appCheckAppit = juurenHtml().filter((n) => /firebase-app(-compat)?\.js/.test(lue(n)));
    const piilossa = appCheckAppit.filter((n) => ignoroitu(n));
    expect(piilossa, 'backend-appi ignoressa → 404 custom-domainilla').toEqual([]);
  });
});

describe('suljettu navigoinnin suhteen', () => {
  const { rikki, ignoroituun, omaPages } = skannaa();

  it('yksikään saavutettava linkki ei osoita OLEMATTOMAAN tiedostoon', () => {
    expect(rikki).toEqual([]);
  });
  it('yksikään saavutettava linkki ei osoita IGNOROITUUN polkuun (404 Hostingissa)', () => {
    expect(ignoroituun).toEqual([]);
  });
  /* Yleistää #491:n resurssiportin NAV-linkkeihin: absoluuttinen oma-Pages-URL "toimii" nyt mutta
     lähettäisi käyttäjän pois custom-domainilta cutoverin jälkeen. */
  it('yksikään tarjoiltava appi ei linkitä absoluuttiseen omaan Pages-originiin', () => {
    expect(omaPages).toEqual([]);
  });
});

/* Nämä EIVÄT ole linkkejä vaan hostname-VERTAILUJA: Pages-spesifinen stale-CDN-varoitus, joka on
   oikein no-op Hostingilla (oikeat cache-headerit). Testi on olemassa ettei niitä "korjata"
   portabiliteetin nimissä — ja ettei niitä sekoiteta yllä olevaan absoluuttisten linkkien porttiin. */
describe('hostname-vartiot säilyvät (tietoinen Pages-spesifisyys)', () => {
  it.each([
    ['TalentMaster_VP_v25.html', '_vpTarkistaCdnVersio'],
    ['TalentMaster_Excel_Tuonti.html', '_tarkistaCdnVersio'],
  ])('%s · %s on yhä hostname-vartioitu', (tiedosto, fn) => {
    const s = lue(tiedosto);
    expect(s).toContain(fn);
    expect(s).toMatch(/location\.hostname\s*!==\s*'terokoskela7-cmyk\.github\.io'/);
  });
});

/* Suostumuslinkki menee perheille sähköpostissa → sen ON oltava absoluuttinen, mutta johdettu
   tarjoilevasta originista. Kovakoodattu github.io lähettäisi cutoverin jälkeen yhä vanhan domainin. */
describe('Seuran suostumuslinkki · absoluuttinen mutta origin-agnostinen', () => {
  const s = lue('TalentMaster_Seura.html');
  it('yksi jaettu apuri, ei kovakoodattua Pages-URLia', () => {
    expect(s).toContain("new URL('TalentMaster_Rekisterointi_Suostumus.html', location.href).href");
    // Haetaan MERKKIJONOLITERAALIA, ei mainintaa: apurin kommentti näyttää molemmat resolvoituvat
    // muodot esimerkkeinä, eikä esimerkki ole kovakoodaus.
    expect(s).not.toMatch(/['"`]https:\/\/terokoskela7-cmyk\.github\.io[^'"`]*Rekisterointi_Suostumus/);
  });
  it('kaikki 5 kutsukohtaa käyttävät apuria', () => {
    expect((s.match(/_rekBaseUrl\(\)/g) || []).length).toBe(6);   // 1 määrittely + 5 kutsua
  });
  it('kohde on tarjoiltava (muuten linkki 404:äisi custom-domainilla)', () => {
    expect(ignoroitu('TalentMaster_Rekisterointi_Suostumus.html')).toBe(false);
  });
  /* AJETTU: resolvoituu molemmilla originilla oikein — Pages ennallaan, Hosting uusi. */
  it.each([
    ['https://terokoskela7-cmyk.github.io/talentmaster/TalentMaster_Seura.html',
     'https://terokoskela7-cmyk.github.io/talentmaster/TalentMaster_Rekisterointi_Suostumus.html'],
    ['https://talentmasterid.com/TalentMaster_Seura.html',
     'https://talentmasterid.com/TalentMaster_Rekisterointi_Suostumus.html'],
  ])('%s → %s', (sivu, odotettu) => {
    expect(new URL('TalentMaster_Rekisterointi_Suostumus.html', sivu).href).toBe(odotettu);
  });
});
