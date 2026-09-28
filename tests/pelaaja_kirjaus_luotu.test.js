/* PELAAJAN KIRJAUS · `luotu`-kenttä (A5-vartijan pari)
 *
 * LIVE-BUGI (2026-09-28): pelaaja antoi fiiliksen tai kuormituksen ja sai "tallennus ei
 * onnistunut". Syy ei ollut verkko eikä sessio:
 *
 *   Rules `kirjaukset/{pvm}` create vaatii `luotuLuontiKelpaa()` = `luotu` on olemassa JA
 *   on timestamp. `_tmKirjaa` kirjoitti vain { avain, lahde, paivitetty }. Päivän ENSIMMÄINEN
 *   kirjaus on siis create ilman `luotu`-kenttää → hylätty. Se toimi vain silloin, kun
 *   `_tallennaKirjaus` (Tänään-harjoite) oli jo luonut päivän dokumentin — mistä syntyi
 *   harhaanjohtava "toimii joskus".
 *
 * Vartija on kirjoituspuolella, koska Rules-puoli (emulaattori) on erikseen
 * `tests/rules/firestore.rules.test.js`:ssä. Molempia tarvitaan: sääntö voi olla oikein ja
 * client silti kirjoittaa väärin.
 *
 * EI KOVAKOODATTUA LISTAA: kirjoittavat funktiot johdetaan lähteestä, jotta uusi
 * kirjauspiste ei mene vartijan ohi hiljaa.
 */
import { describe, it, expect } from 'vitest';
import { readFileSync } from 'fs';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

const juuri = join(dirname(fileURLToPath(import.meta.url)), '..');
const PELAAJA = readFileSync(join(juuri, 'TalentMaster_Pelaaja_v7.html'), 'utf8');
const RULES = readFileSync(join(juuri, 'tm_admin', 'firestore.rules'), 'utf8');

/** Funktio lähteestä sulkulaskennalla (ei regexiä rungon yli). */
function funktio(lahde, tunniste) {
  const i = lahde.indexOf(tunniste);
  expect(i, 'ei löydy: ' + tunniste).toBeGreaterThan(-1);
  let syv = 0;
  for (let k = lahde.indexOf('{', i); k < lahde.length; k++) {
    if (lahde[k] === '{') syv++;
    else if (lahde[k] === '}') { syv--; if (!syv) return lahde.slice(i, k + 1); }
  }
  throw new Error('sulkeet eivät täsmää: ' + tunniste);
}

/** Funktion nimi, jonka rungossa annettu kohta on (kävellään taaksepäin lähimpään määrittelyyn). */
function ymparoivaFunktio(lahde, indeksi) {
  const ennen = lahde.slice(0, indeksi);
  const osumat = [...ennen.matchAll(/(?:async\s+)?function\s+([A-Za-z_$][\w$]*)\s*\(/g)];
  return osumat.length ? osumat[osumat.length - 1][1] : null;
}

/** Kaikki funktiot, jotka koskevat `kirjaukset`-kokoelmaan. */
function kirjauskoskijat() {
  const nimet = new Set();
  const re = /collection\('kirjaukset'\)/g;
  let m;
  while ((m = re.exec(PELAAJA)) !== null) {
    const n = ymparoivaFunktio(PELAAJA, m.index);
    if (n) nimet.add(n);
  }
  return nimet;
}

/* Funktio KIRJOITTAA jos sen rungossa on .set( — pelkkä .get()/where() on luku. */
function kirjoittaa(runko) {
  return /\.set\s*\(/.test(runko);
}

describe('Pelaaja_v7 · kirjauksen `luotu` (A5-create-vartija)', () => {
  it('EI VACUOUS: kirjauksia koskevia funktioita löytyy lähteestä', () => {
    const n = kirjauskoskijat();
    expect(n.size, 'yhtään kirjaus-funktiota ei löytynyt → vartija ei mittaisi mitään')
      .toBeGreaterThanOrEqual(3);
    expect([...n]).toContain('_tmKirjaa');
  });

  it('JOKAINEN kirjauksia kirjoittava funktio asettaa `luotu`-kentän', () => {
    const kirjoittajat = [...kirjauskoskijat()]
      .map((nimi) => ({ nimi, runko: funktio(PELAAJA, 'function ' + nimi + '(') }))
      .filter((f) => kirjoittaa(f.runko));

    expect(kirjoittajat.length, 'kirjoittavia funktioita ei löytynyt').toBeGreaterThanOrEqual(3);
    kirjoittajat.forEach((f) => {
      expect(f.runko, f.nimi + ' kirjoittaa kirjauksiin ilman `luotu`-kenttää → create hylätään')
        .toContain('luotu:');
    });
  });

  it('`luotu` on TREENIPÄIVÄ (idempotentti) — ei serverTimestamp', () => {
    /* A5-tuotepäätös: luotu = treenipäivä, paivitetty = kirjaushetki. Idempotenssi on se,
       mikä tekee mergestä turvallisen: sama päivä → sama arvo → `luotuPaivitysKelpaa` ei kaadu.
       serverTimestamp muuttuisi joka kirjoituksella ja rikkoisi kronologisen feedin. */
    const f = funktio(PELAAJA, 'function _tmKirjaa(');
    expect(f).toContain('luotu: firebase.firestore.Timestamp.fromDate(new Date(pvm))');
    const rivi = f.split('\n').find((r) => r.includes('luotu:'));
    expect(rivi, '`luotu` ei saa olla serverTimestamp (ei idempotentti)').not.toContain('serverTimestamp');
  });

  it('`paivitetty` säilyy serverTimestampina (kirjaushetki, ei treenipäivä)', () => {
    const f = funktio(PELAAJA, 'function _tmKirjaa(');
    expect(f, 'orderBy-kenttä `paivitetty` on valmentajan feedin järjestys (§7.23)')
      .toContain('paivitetty: firebase.firestore.FieldValue.serverTimestamp()');
  });

  it('SYY LUKITTU: Rules vaatii `luotu`:n luonnissa (tämän vuoksi kenttä on pakko)', () => {
    const g = funktio(RULES, 'function luotuLuontiKelpaa()');
    expect(g).toContain("'luotu' in request.resource.data");
    expect(g).toContain('request.resource.data.luotu is timestamp');
  });
});
