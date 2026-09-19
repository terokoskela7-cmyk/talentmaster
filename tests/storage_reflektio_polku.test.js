/**
 * REFLEKTIOAUDION KETJU: koodin upload-polku ↔ storage.rules ↔ CSP media-src.
 *
 * MIKSI: äänireflektio tarvitsee KOLME kerrosta yhtä aikaa, ja jokainen voi rikkoutua yksin
 * hiljaisesti — ominaisuus näyttää olevan olemassa, mutta se ei toimi:
 *   1. CSP media-src         → <audio> estyy (tämä oli rikki Hosting-cutoverista asti, #561)
 *   2. storage.rules         → upload/lataus estyy palvelimella
 *   3. koodin upload-polku   → jos se muuttuu, rules-match ei enää osu
 *
 * Portti sitoo kerrokset yhteen: se lukee polun KOODISTA ja vaatii että rules-blokki vastaa sitä.
 * Ilman tätä polun muuttaminen (esim. 'reflektiot' → 'aanireflektiot') menisi läpi vihreänä ja
 * kaatuisi vasta tuotannossa default-deny-sääntöön.
 *
 * ⚠ storage.rules EI ole CI-deployn piirissä: firebase.json:issa ei ole `storage`-avainta, joten
 * se deployataan Consolesta käsin (tiedoston oma otsikko sanoo saman). Tämä portti valvoo siis
 * REPON sääntöä; live-ruleset on erikseen varmistettava Consolesta.
 */
import { describe, it, expect } from 'vitest';
import { readFileSync } from 'fs';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

const juuri = join(dirname(fileURLToPath(import.meta.url)), '..');
const lue = (p) => readFileSync(join(juuri, p), 'utf8');
/* Upload-koodi asuu Vaiheesta 1 alkaen jaetussa libissä (Master + VP samasta lähteestä).
   Portin sitoma kerros on KOODIN upload-polku — sitä luetaan sieltä missä se on. */
const KOODI = lue('lib/tm_reflektio.js');
const RULES = lue('storage.rules');
const CSP = JSON.parse(lue('firebase.json')).hosting.headers
  .flatMap((h) => h.headers).find((h) => h.key === 'Content-Security-Policy').value;

/** Poimii match-lohkon sulkeita laskemalla — ei riipu siitä mikä lohko sattuu olemaan seuraavana. */
function reflektioLohko() {
  /* Aloita lohkon AVAAVASTA sulusta, ei polun `{sid}`-sulusta — indexOf('{') osuisi siihen. */
  const otsikko = /match \/seurat\/\{sid\}\/kayttajat\/\{uid\}\/reflektiot\/\{[a-z]+\}\s*\{/.exec(RULES);
  expect(otsikko, 'reflektio-lohkoa ei löytynyt storage.rulesista').not.toBeNull();
  const alku = otsikko.index;
  let i = otsikko.index + otsikko[0].length - 1, syvyys = 0, loppu = -1;
  for (let j = i; j < RULES.length; j++) {
    if (RULES[j] === '{') syvyys++;
    else if (RULES[j] === '}') { syvyys--; if (syvyys === 0) { loppu = j + 1; break; } }
  }
  expect(loppu, 'lohkon sulkeva } puuttuu').toBeGreaterThan(alku);
  return RULES.slice(alku, loppu);
}

/**
 * ALLOWLIST, ei denylist. Ensimmäinen versio kielsi kaksi kirjoitusasua
 * (`onJohtoRooli|seuraId ==`), ja suora `request.auth.token.rooli == 'vp'` meni läpi vihreänä —
 * todennettu mutaatiolla. Denylist vaatii jokaisen vuototavan ennakoimista; allowlist ei.
 *
 * Menetelmä: poista ehdosta kaikki SALLITUT osalausekkeet ja operaattorit. Jos jäljelle jää
 * yhtään tunnistemerkkiä, lohkossa on auktorisointitermi jota siellä ei kuulu olla.
 */
const SALLITUT_LAUSEKKEET = [
  /request\.auth != null/g,
  /request\.auth\.uid == uid/g,
  /onSuperAdmin\(\)/g,
  /request\.resource\.contentType\.matches\('audio\/\.\*'\)/g,
  /request\.resource\.size < \d+ \* 1024 \* 1024/g,
];

/** @returns {{sääntö:string, jäännös:string}[]} allow-ehdot joista sallitut osat on poistettu */
function jaannokset(lohko) {
  const ulos = [];
  for (const m of lohko.matchAll(/allow\s+([a-z, ]+):\s*if([\s\S]*?);/g)) {
    let ehto = m[2];
    for (const sallittu of SALLITUT_LAUSEKKEET) ehto = ehto.replace(sallittu, ' ');
    ehto = ehto.replace(/[&|()\s]/g, '');          // operaattorit ja välit pois
    ulos.push({ saanto: m[1].trim(), jaannos: ehto });
  }
  return ulos;
}

describe('Reflektioaudio · koodin polku ↔ storage.rules', () => {
  it('EI VACUOUS: upload-polku löytyy koodista', () => {
    /* Regex pinnaa KIRJAIMELLISET polkusegmentit (ne rules-blokki matchaa) muttei
       muuttujanimiä: aiempi versio vaati täsmälleen `const path = … _seuraId … cu.uid`
       ja punertui lib-irrotuksessa pelkästä uudelleennimeämisestä, vaikka polku pysyi
       samana. Segmentit ovat invariantti, nimet eivät. */
    expect(KOODI).toMatch(/'seurat\/' \+ [A-Za-z_$][\w$]* \+ '\/kayttajat\/' \+ [A-Za-z_$][\w$.]* \+ '\/reflektiot\//);
    expect(KOODI).toContain('firebase.storage().ref(path)');
    expect(KOODI).toContain('getDownloadURL()');
  });

  it('storage.rules kattaa täsmälleen sen polun jota koodi käyttää', () => {
    // Koodi: seurat/{sid}/kayttajat/{uid}/reflektiot/{tiedosto}
    expect(RULES).toMatch(/match \/seurat\/\{sid\}\/kayttajat\/\{uid\}\/reflektiot\/\{file\}/);
  });

  it('sääntö sallii omistajan lukea JA kirjoittaa (molemmat polut tarvitaan)', () => {
    const lohko = RULES.slice(
      RULES.indexOf('match /seurat/{sid}/kayttajat/{uid}/reflektiot/'),
      RULES.indexOf('match /seurat/{sid}/havainnot/'),
    );
    expect(lohko, 'EI VACUOUS: lohko löytyi').toContain('allow');
    // read = tallennetun toisto, write = nauhoituksen tallennus
    expect(lohko).toMatch(/allow read:[^;]*request\.auth\.uid == uid/);
    expect(lohko).toMatch(/allow write:[^;]*request\.auth\.uid == uid/);
  });

  it('kirjoitusrajaus vastaa sitä mitä koodi lähettää (audio/* + kokokatto)', () => {
    const lohko = RULES.slice(
      RULES.indexOf('match /seurat/{sid}/kayttajat/{uid}/reflektiot/'),
      RULES.indexOf('match /seurat/{sid}/havainnot/'),
    );
    expect(lohko, 'contentType-rajaus').toMatch(/contentType\.matches\('audio\/\.\*'\)/);
    expect(lohko, 'kokokatto').toMatch(/request\.resource\.size < \d+ \* 1024 \* 1024/);
    // Koodi asettaa contentTypen, joka läpäisee audio/.*-rajauksen.
    expect(KOODI).toMatch(/contentType: _refMime \|\| 'audio\/webm'/);
  });

  it('VAIN omistaja + SA: mikään muu auktorisointitermi ei kelpaa (allowlist)', () => {
    /* Reflektioaudio on valmentajan YKSITYINEN kasvupäiväkirja. Yksikin rooli-, seura- tai
       claim-pohjainen ohitus tarkoittaisi että joku muu kuuntelee sen — luottamus- ja
       GDPR-asia, ei tyylikysymys. Siksi ehto on allowlist eikä kiellettyjen lista. */
    const ehdot = jaannokset(reflektioLohko());
    expect(ehdot.length, 'EI VACUOUS: allow-sääntöjä pitää löytyä').toBeGreaterThanOrEqual(3);
    const vuodot = ehdot.filter((e) => e.jaannos.length > 0);
    expect(
      vuodot.map((e) => `allow ${e.saanto}: ylimääräinen termi → ${e.jaannos}`),
      'reflektio-lohkossa saa olla VAIN: request.auth != null · request.auth.uid == uid · '
        + 'onSuperAdmin() (+ writen contentType/size-rajaukset)',
    ).toEqual([]);
  });

  it('EI VACUOUS: allowlist tunnistaa oikeat termit eikä hyväksy mitä tahansa', () => {
    // Jos SALLITUT_LAUSEKKEET olisi liian väljä (esim. osuisi kaikkeen), tämä paljastaa sen.
    const keksitty = 'allow read: if request.auth != null && request.auth.token.rooli == \'vp\';';
    expect(jaannokset(keksitty)[0].jaannos).not.toBe('');
  });

  it('CSP media-src kattaa molemmat toistopolut (blob + Storage)', () => {
    const media = CSP.split(';').map((s) => s.trim()).find((s) => s.startsWith('media-src '));
    expect(media, 'media-src puuttuu → <audio> estyy').toBeDefined();
    expect(media, 'nauhoituksen esikuuntelu').toContain('blob:');
    expect(media, 'tallennetun toisto Storagesta').toContain('https://firebasestorage.googleapis.com');
  });

  it('litterointi kulkee jo deployatun aiProxyn kautta (ei omaa CF:ää)', () => {
    const cf = lue('functions/index.js');
    expect(cf).toContain("task === 'voice_transcribe'");
    expect(cf, 'aiProxy on se joka deployataan').toContain('exports.aiProxy');
  });
});
