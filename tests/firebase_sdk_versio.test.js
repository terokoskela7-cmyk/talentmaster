/**
 * PORTTI: Firebase SDK -versioiden yhtenäistys (docs/FIREBASE_SDK_YHTENAISTYS.md, päätökset 2026-10-03).
 *  - Elävät compat-sivut käyttävät KOHDEVERSIO = '10.7.1'; modular-sivut MODULAR_VERSIO = '10.12.0'.
 *  - MIGRAATIOLISTA = sivut jotka ovat vielä vanhassa versiossa (erä-numeroineen). Lista TYHJENEE erien mukana:
 *    erän PR vaihtaa sivun version JA poistaa sivun listalta samassa muutoksessa.
 *  - Failaa jos (a) listan ulkopuolinen sivu poikkeaa kohdeversiosta (uusi appi / vahinkomuutos),
 *    (b) listalla oleva sivu on jo kohdeversiossa (lista jäi elämään), (c) sivu sekoittaa versioita.
 * Kohdejoukko johdetaan DATASTA (juuren *.html jotka lataavat firebase-appin), kuten tests/appcheck_kytkenta.test.js.
 * archive/ ohitetaan (ei juuressa).
 */
import { describe, it, expect } from 'vitest';
import { readFileSync, readdirSync, statSync } from 'fs';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

const juuri = join(dirname(fileURLToPath(import.meta.url)), '..');
const KOHDEVERSIO = '10.7.1';
const MODULAR_VERSIO = '10.12.0';

/* sivu → { era, nyt }: erä jossa sivu siirretään ja sen NYKYINEN (vanha) versio. */
const MIGRAATIOLISTA = {
  'TalentMaster_Admin.html':                { era: 2, nyt: '9.22.1' },
  'TalentMaster_Excel_Tuonti.html':         { era: 2, nyt: '9.22.2' },
  'TalentMaster_Valmennusapuri.html':       { era: 2, nyt: '9.22.1' },
  'TalentMaster_Seura.html':                { era: 3, nyt: '9.22.0' },
  'TalentMaster_Master_v16.html':           { era: 3, nyt: '9.22.1' },
  'TalentMaster_ADAR_Pikakortti.html':      { era: 4, nyt: '9.22.1' },
  'TalentMaster_Rekisterointi_Suostumus.html': { era: 5, nyt: '9.23.0' },
  'TalentMaster_Pelaaja_v7.html':           { era: 6, nyt: '9.22.1' },
  'TalentMaster_Vanhempi_v2.html':          { era: 6, nyt: '9.22.1' },
};

const lue = (n) => readFileSync(join(juuri, n), 'utf8');
const juurenHtml = () => readdirSync(juuri).filter((n) => n.endsWith('.html') && statSync(join(juuri, n)).isFile()).sort();
const SDK_RE = /gstatic\.com\/firebasejs\/([0-9][0-9.]*)\/(firebase-[\w-]+?)(?:\.min)?\.js/g;

function sdk(n) {
  const s = lue(n);
  const viitteet = [...s.matchAll(SDK_RE)].map((m) => ({ versio: m[1], moduuli: m[2] }));
  const versiot = [...new Set(viitteet.map((v) => v.versio))];
  const modular = viitteet.some((v) => !v.moduuli.endsWith('-compat'));
  return { viitteet, versiot, modular };
}

const KAIKKI = juurenHtml().filter((n) => /firebase-app(-compat)?\.js/.test(lue(n)));
const TIEDOT = Object.fromEntries(KAIKKI.map((n) => [n, sdk(n)]));
const COMPAT = KAIKKI.filter((n) => !TIEDOT[n].modular);
const MODULAR = KAIKKI.filter((n) => TIEDOT[n].modular);

describe('kohdejoukko (johdettu datasta)', () => {
  // 20 compat (2026-10): TalentMaster_IDP_Kortti_v4.html arkistoitu (docs/IDP_YHDISTAMINEN.md), oli 21.
  // 19 compat (2026-10): TalentMaster_UTJ_v1.html arkistoitu (docs/UTJ_TALTEEN.md).
  it('EI VACUOUS: 19 compat + 2 modular = 21 elävää sivua (sama luku kuin App Check -portissa)', () => {
    expect(COMPAT.length).toBe(19);
    expect(MODULAR.length).toBe(2);
    expect(KAIKKI.length).toBe(21);
  });
  it('archive/ ei ole mukana', () => { expect(KAIKKI.some((n) => n.includes('/'))).toBe(false); });
});

describe('versiot', () => {
  it.each(KAIKKI)('%s: kaikki firebase-*-skriptit samassa versiossa (ei sekoitusta sivun sisällä)', (n) => {
    expect(TIEDOT[n].versiot, 'sekaversio sivun sisällä (§38)').toHaveLength(1);
  });
  it('app-check-compat ladataan samalla versiolla kuin app-compat joka compat-sivulla (§38)', () => {
    for (const n of COMPAT) {
      const v = TIEDOT[n].viitteet;
      const app = v.find((x) => x.moduuli === 'firebase-app-compat');
      const ac = v.find((x) => x.moduuli === 'firebase-app-check-compat');
      expect(app, n + ': app-compat puuttuu').toBeTruthy();
      expect(ac, n + ': app-check-compat puuttuu').toBeTruthy();
      expect(ac.versio, n).toBe(app.versio);
    }
  });
  it(`modular-sivut käyttävät versiota ${MODULAR_VERSIO}`, () => {
    for (const n of MODULAR) expect(TIEDOT[n].versiot, n).toEqual([MODULAR_VERSIO]);
  });
  it(`listan ULKOPUOLISET compat-sivut ovat kohdeversiossa ${KOHDEVERSIO} (uusi appi väärällä versiolla punertaa)`, () => {
    const poikkeavat = COMPAT.filter((n) => !MIGRAATIOLISTA[n] && TIEDOT[n].versiot[0] !== KOHDEVERSIO)
      .map((n) => n + ' (' + TIEDOT[n].versiot[0] + ')');
    expect(poikkeavat, `käytä ${KOHDEVERSIO}; vanhalle sivulle vain MIGRAATIOLISTA-merkintä erä-numeroineen`).toEqual([]);
  });
  it('listalla olevat sivut ovat yhä VANHASSA versiossa (siirretty sivu → poista MIGRAATIOLISTA-rivi samassa PR:ssä)', () => {
    const jaanteet = Object.keys(MIGRAATIOLISTA).filter((n) => COMPAT.includes(n) && TIEDOT[n].versiot[0] === KOHDEVERSIO);
    expect(jaanteet, 'jo kohdeversiossa → poista listalta').toEqual([]);
    const eriVanha = Object.entries(MIGRAATIOLISTA).filter(([n, m]) => COMPAT.includes(n) && TIEDOT[n].versiot[0] !== m.nyt && TIEDOT[n].versiot[0] !== KOHDEVERSIO)
      .map(([n, m]) => n + ': listalla ' + m.nyt + ', sivulla ' + TIEDOT[n].versiot[0]);
    expect(eriVanha, 'sivun versio muuttui mutta ei kohdeversioon → päivitä listan "nyt" tai siirrä kohdeversioon').toEqual([]);
  });
  it('jokainen listan sivu on olemassa ja compat-elävien joukossa (lista ei vanhene)', () => {
    const puuttuu = Object.keys(MIGRAATIOLISTA).filter((n) => !COMPAT.includes(n));
    expect(puuttuu).toEqual([]);
  });
  it('migraatiolista = 9 jäljellä olevaa poikkeusta, erät 2–6 (erä 1 tehty: UTJ, Testituonti_Master, IDP_Kortti_v4 — UTJ ja IDP_Kortti_v4 sittemmin arkistoitu)', () => {
    // Tämä luku pienenee erien mukana (erä 2: −3 → 6, …). Erän PR päivittää tämän ja listan yhdessä.
    expect(Object.keys(MIGRAATIOLISTA)).toHaveLength(9);
    expect([...new Set(Object.values(MIGRAATIOLISTA).map((m) => m.era))].sort()).toEqual([2, 3, 4, 5, 6]);
  });
  it('listan ulkopuolisia compat-sivuja on 10 (jo kohdeversiossa; IDP_Kortti_v4 ja UTJ_v1 arkistoitu 2026-10)', () => {
    expect(COMPAT.filter((n) => !MIGRAATIOLISTA[n])).toHaveLength(10);
  });
});
