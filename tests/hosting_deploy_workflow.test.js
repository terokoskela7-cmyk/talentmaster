/**
 * V3c · CI-deploy Firebase Hostingiin — Pages jää fallbackiksi.
 *
 * MIKSI PORTTI: kolme asiaa on hiljaisesti rikottavissa ja kaikki kolme näkyisivät vasta
 * tuotannossa.
 *  (1) VÄÄRÄ SECRET. `FIREBASE_SERVICE_ACCOUNT` (ilman _HOSTING-päätettä) on eri ja LAAJEMPI
 *      service account (seed_kartoitukset.yml käyttää sitä). Sen käyttö täällä toimisi, joten
 *      mikään ei failaisi — vain oikeusrajaus katoaisi. Siksi nimi lukitaan testiin.
 *  (2) VÄÄRÄ KANAVA. channelId: live julkaisee .web.app:iin; mikä tahansa muu arvo tekee
 *      preview-kanavan, jolloin deploy "onnistuu" mutta tuotanto ei päivity.
 *  (3) PAGES-FALLBACKIN RIKKOUTUMINEN. Pages on rollback-polku koko V3:n ajan. Jos
 *      deploy-pages.yml muuttuu tai katoaa tämän erän mukana, rollbackia ei ole.
 */
import { describe, it, expect } from 'vitest';
import { readFileSync, existsSync, readdirSync } from 'fs';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

const juuri = join(dirname(fileURLToPath(import.meta.url)), '..');
const wfDir = join(juuri, '.github/workflows');
const lue = (p) => readFileSync(join(wfDir, p), 'utf8');

describe('deploy-hosting.yml', () => {
  const s = lue('deploy-hosting.yml');

  it('julkaisee LIVE-kanavalle (ei preview)', () => {
    expect(s).toMatch(/channelId:\s*live\b/);
  });
  it('käyttää VAIN hostingiin scopattua secretiä', () => {
    expect(s).toContain('secrets.FIREBASE_SERVICE_ACCOUNT_HOSTING');
    // laajempi jaettu SA ei saa livahtaa tänne: hae viittaus jossa EI ole _HOSTING-päätettä
    const laaja = /secrets\.FIREBASE_SERVICE_ACCOUNT(?!_HOSTING)/.test(s);
    expect(laaja, 'laajempi jaettu SA — käytä _HOSTING-päätteistä').toBe(false);
  });
  it('oikea projekti + laukaisimet', () => {
    expect(s).toMatch(/projectId:\s*talentmaster-pilot/);
    expect(s).toMatch(/branches:\s*\[main\]/);
    expect(s).toContain('workflow_dispatch');
  });
  it('oma concurrency-ryhmä (ei törmää Pagesin kanssa)', () => {
    const m = s.match(/group:\s*"?([a-z-]+)"?/);
    expect(m).toBeTruthy();
    expect(m[1]).toBe('hosting');
    expect(lue('deploy-pages.yml')).toMatch(/group:\s*"?pages"?/);
  });
  it('EI rm -rf archive -steppiä (Hostingin ignore hoitaa sen, toisin kuin Pagesissa)', () => {
    // Haetaan AJETTAVAA steppiä (`run:`), ei mainintaa — workflow'n kommentti selittää miksi
    // steppiä ei ole, eikä selitys ole steppi.
    expect(s).not.toMatch(/^\s*run:.*rm -rf archive/m);
    expect(lue('deploy-pages.yml'), 'Pages tarvitsee sen yhä').toMatch(/^\s*run:\s*rm -rf archive/m);
  });
});

describe('Pages-fallback koskematon (rollback-polku)', () => {
  it('deploy-pages.yml on olemassa ja julkaisee yhä', () => {
    expect(existsSync(join(wfDir, 'deploy-pages.yml'))).toBe(true);
    const s = lue('deploy-pages.yml');
    expect(s).toContain('actions/deploy-pages');
    expect(s).toMatch(/branches:\s*\[main\]/);
  });
  it('vain yksi workflow deployaa Pagesiin ja vain yksi Hostingiin', () => {
    const wf = readdirSync(wfDir).filter((n) => n.endsWith('.yml'));
    const pages = wf.filter((n) => /actions\/deploy-pages/.test(lue(n)));
    const hosting = wf.filter((n) => /action-hosting-deploy/.test(lue(n)));
    expect(pages).toEqual(['deploy-pages.yml']);
    expect(hosting).toEqual(['deploy-hosting.yml']);
  });
  it('hosting-deploy ei koske firestore-sääntöihin eikä funktioihin', () => {
    const s = lue('deploy-hosting.yml');
    expect(s).not.toMatch(/--only\s+(firestore|functions)|deploy-rules/);
  });
});

describe('YAML-rakenne (ilman yaml-kirjastoa: rivipohjainen)', () => {
  const L = lue('deploy-hosting.yml').split('\n');
  it('stepit oikeassa järjestyksessä: checkout ennen deployta', () => {
    const c = L.findIndex((l) => l.includes('actions/checkout@'));
    const d = L.findIndex((l) => l.includes('action-hosting-deploy@'));
    expect(c).toBeGreaterThan(-1);
    expect(d).toBeGreaterThan(c);
  });
  it('ei tab-merkkejä (YAML kieltää ne sisennyksessä)', () => {
    expect(L.filter((l) => /^\s*\t/.test(l))).toEqual([]);
  });
});
