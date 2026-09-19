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
const MASTER = lue('TalentMaster_Master_v16.html');
const RULES = lue('storage.rules');
const CSP = JSON.parse(lue('firebase.json')).hosting.headers
  .flatMap((h) => h.headers).find((h) => h.key === 'Content-Security-Policy').value;

describe('Reflektioaudio · koodin polku ↔ storage.rules', () => {
  it('EI VACUOUS: upload-polku löytyy koodista', () => {
    expect(MASTER).toMatch(/const path = 'seurat\/' \+ _seuraId \+ '\/kayttajat\/' \+ cu\.uid \+ '\/reflektiot\//);
    expect(MASTER).toContain('firebase.storage().ref(path)');
    expect(MASTER).toContain('getDownloadURL()');
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
    expect(MASTER).toMatch(/contentType: _refMime \|\| 'audio\/webm'/);
  });

  it('VP/johto ei pääse toisen reflektioon (yksityinen kasvupäiväkirja)', () => {
    const lohko = RULES.slice(
      RULES.indexOf('match /seurat/{sid}/kayttajat/{uid}/reflektiot/'),
      RULES.indexOf('match /seurat/{sid}/havainnot/'),
    );
    expect(lohko, 'roolipohjainen ohitus ei kuulu tähän').not.toMatch(/onJohtoRooli|seuraId ==/);
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
