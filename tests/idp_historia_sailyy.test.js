/**
 * HOTFIX-VARTIJA · kausitavoite tai sen historia ei saa koskaan kadota.
 *
 * VIKA 1 — TALLENNUS YLIKIRJOITTI KOKO TAULUKON. VP ja Master kirjoittivat kausitavoitteen
 * yhden alkion taulukkona `merge: true` -optiolla. Firestoren merge EI yhdistä taulukoita vaan
 * KORVAA kentän kokonaan, joten jokainen tallennus jätti taulukkoon yhden tavoitteen ja pyyhki
 * vanhan tavoitteen sekä sen `arviot`-kehityskeskustelut PYSYVÄSTI. Kaikki tallennuspolut
 * (tavoite · kehityskeskustelu · elinkaari) kulkivat tätä kautta. Lukijat olettivat jo historiaa
 * (`arr[arr.length-1]`) — vain tallennus rikkoi sen.
 *
 * VIKA 2 — VUODENVAIHDE. Doc-id on kalenterivuosi (idpKausivuosi), joten syksyn 2026 tavoite olisi
 * kadonnut näkyvistä 1.1.2027 ja seuraava tallennus olisi aloittanut tyhjästä 2027-dokista.
 *
 * KORJAUS: `idpTavoitteetYhdista` yhdistää (vanha saa status 'vaihdettu' + vaihdettu_pvm, arviot
 * säilyvät), tallennus ajetaan transaktiossa (luku → yhdistä → kirjoitus), ja lataus löytää
 * tavoitteen myös edellisen vuoden dokista. Lukijat eivät koskaan valitse 'vaihdettu'/'hylatty'.
 *
 * Ei rules-muutosta: transaktion luku ja kirjoitus ovat samoja operaatioita samoille rooleille.
 */
import { describe, it, expect } from 'vitest';
import { readFileSync } from 'fs';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';
import { createRequire } from 'module';

const juuri = join(dirname(fileURLToPath(import.meta.url)), '..');
const vaadi = createRequire(import.meta.url);
const IDP = vaadi('../lib/tm_idp.js');
const { idpTavoitteetYhdista, idpVoimassaTavoite, idpValitseKausidokista, idpTallennusVuosi } = IDP;

const VP = readFileSync(join(juuri, 'TalentMaster_VP_v25.html'), 'utf8');
const MASTER = readFileSync(join(juuri, 'TalentMaster_Master_v16.html'), 'utf8');
const PELAAJA = readFileSync(join(juuri, 'TalentMaster_Pelaaja_v7.html'), 'utf8');

const NYT = '2026-09-23T10:00:00.000Z';
const A = () => ({ luotu: '2026-01-15T08:00:00.000Z', status: 'aktiivinen', kuvaus: 'A', arviot: [{ pvm: '1' }, { pvm: '2' }, { pvm: '3' }] });
const B = () => ({ luotu: '2026-09-23T09:00:00.000Z', status: 'aktiivinen', kuvaus: 'B', arviot: [] });

describe('(1) Muokkaus — sama luotu korvaa vain sen alkion', () => {
  it('pituus 1, kuvaus päivittyy, arviot säilyvät', () => {
    const a = A();
    const muokattu = Object.assign({}, a, { kuvaus: 'A muokattu' });
    const ulos = idpTavoitteetYhdista([a], muokattu, { nyt: NYT });
    expect(ulos).toHaveLength(1);
    expect(ulos[0].kuvaus).toBe('A muokattu');
    expect(ulos[0].arviot).toHaveLength(3);
    expect(ulos[0].status).toBe('aktiivinen');
  });
});

describe('(2) Vaihto — vanha säilyy statuksella vaihdettu', () => {
  const ulos = idpTavoitteetYhdista([A()], B(), { nyt: NYT });

  it('taulukossa on MOLEMMAT, vanha ensin', () => {
    expect(ulos).toHaveLength(2);
    expect(ulos[0].kuvaus).toBe('A');
    expect(ulos[1].kuvaus).toBe('B');
  });

  it('vanha: status vaihdettu + vaihdettu_pvm, ARVIOT SÄILYVÄT', () => {
    expect(ulos[0].status).toBe('vaihdettu');
    expect(ulos[0].vaihdettu_pvm).toBe(NYT);
    expect(ulos[0].arviot, 'kehityskeskustelut katosivat').toHaveLength(3);
    expect(ulos[0].luotu).toBe(A().luotu);
  });

  it('uusi on voimassa oleva', () => {
    expect(ulos[1].status).toBe('aktiivinen');
    expect(idpVoimassaTavoite(ulos).kuvaus).toBe('B');
  });

  it('korvaa:false → vanhaa ei merkitä vaihdetuksi', () => {
    const u = idpTavoitteetYhdista([A()], B(), { nyt: NYT, korvaa: false });
    expect(u[0].status).toBe('aktiivinen');
  });
});

describe('(3) Ehdotus ei vaihda ennen hyväksyntää', () => {
  it('ehdotettu lisätään, voimassa oleva pysyy aktiivisena', () => {
    const ehdotus = Object.assign(B(), { status: 'ehdotettu' });
    const ulos = idpTavoitteetYhdista([A()], ehdotus, { nyt: NYT });
    expect(ulos[0].status, 'ehdotus syrjäytti voimassa olevan').toBe('aktiivinen');
    expect(ulos[1].status).toBe('ehdotettu');
  });

  it('hyväksyntä (sama luotu, aktiivinen) vaihtaa edellisen', () => {
    const ehdotus = Object.assign(B(), { status: 'ehdotettu' });
    const vaihe1 = idpTavoitteetYhdista([A()], ehdotus, { nyt: NYT });
    const hyvaksytty = Object.assign({}, ehdotus, { status: 'aktiivinen' });
    const vaihe2 = idpTavoitteetYhdista(vaihe1, hyvaksytty, { nyt: NYT });
    // sama luotu → korvaa alkion; A jää aktiiviseksi koska korvaus ei kulje "uusi tavoite" -haaraa
    expect(vaihe2).toHaveLength(2);
    expect(vaihe2[1].status).toBe('aktiivinen');
    expect(idpVoimassaTavoite(vaihe2).kuvaus).toBe('B');
  });
});

describe('(4) Kehityskeskustelu ja elinkaari — sama luotu', () => {
  it('arviot-lisäys päivittää alkion, muut säilyvät', () => {
    const lista = idpTavoitteetYhdista([A()], B(), { nyt: NYT });   // [A(vaihdettu), B]
    const bArvioilla = Object.assign(B(), { arviot: [{ pvm: 'uusi' }] });
    const ulos = idpTavoitteetYhdista(lista, bArvioilla, { nyt: NYT });
    expect(ulos).toHaveLength(2);
    expect(ulos[1].arviot).toHaveLength(1);
    expect(ulos[0].arviot, 'vanhan arviot katosivat').toHaveLength(3);
    expect(ulos[0].status).toBe('vaihdettu');
  });

  it('elinkaari (saavutettu) päivittää alkion eikä lisää uutta', () => {
    const saavutettu = Object.assign(A(), { status: 'saavutettu' });
    const ulos = idpTavoitteetYhdista([A()], saavutettu, { nyt: NYT });
    expect(ulos).toHaveLength(1);
    expect(ulos[0].status).toBe('saavutettu');
    expect(ulos[0].arviot).toHaveLength(3);
  });
});

describe('(5) Ei mutatoi syötettä', () => {
  it('syötetaulukko ja sen alkiot ovat muuttumattomia (Object.freeze)', () => {
    const a = Object.freeze(A());
    const lista = Object.freeze([a]);
    expect(() => idpTavoitteetYhdista(lista, B(), { nyt: NYT })).not.toThrow();
    expect(lista).toHaveLength(1);
    expect(a.status, 'alkuperäinen alkio mutatoitui').toBe('aktiivinen');
  });

  it('puuttuva luotu → käsitellään uutena (ei korvaa väärää alkiota)', () => {
    const ilman = { status: 'aktiivinen', kuvaus: 'X' };
    const ulos = idpTavoitteetYhdista([A()], ilman, { nyt: NYT });
    expect(ulos).toHaveLength(2);
    expect(ulos[0].status).toBe('vaihdettu');
  });
});

describe('(6) Lähteessä ei yhden alkion ylikirjoitusta', () => {
  it.each([['VP', VP], ['Master', MASTER]])('%s: grep `tavoitteet: [t]` = 0', (_nimi, src) => {
    expect(src).not.toContain('tavoitteet: [t]');
  });

  it.each([['VP', VP], ['Master', MASTER]])('%s: tallennus kutsuu idpTavoitteetYhdista transaktiossa', (_nimi, src) => {
    expect(src).toContain('idpTavoitteetYhdista(nykyiset, t)');
    expect(src).toMatch(/runTransaction\(async function \(tx\)/);
    expect(src).toContain('await tx.get(kausiRef)');
    expect(src).toContain('tx.set(kausiRef, { tavoitteet: yhd');
  });
});

describe('(7) Vuodenvaihde', () => {
  it('kuluva tyhjä, edellisessä aktiivinen → valitaan edellinen + vuosi', () => {
    const r = idpValitseKausidokista([], '2027', [A()], '2026');
    expect(r).toBeTruthy();
    expect(r.tavoite.kuvaus).toBe('A');
    expect(r.vuosi).toBe('2026');
  });

  it('kuluvassa voimassa oleva → edellistä ei käytetä', () => {
    const r = idpValitseKausidokista([B()], '2027', [A()], '2026');
    expect(r.vuosi).toBe('2027');
    expect(r.tavoite.kuvaus).toBe('B');
  });

  it('kummassakaan ei voimassa olevaa → null', () => {
    const vaihdettu = Object.assign(A(), { status: 'vaihdettu' });
    expect(idpValitseKausidokista([], '2027', [vaihdettu], '2026')).toBeNull();
  });

  it('ladatun tavoitteen tallennus kohdistuu SAMAAN dokkiin', () => {
    const p = { _idpVuosi: '2026', _idpVuosiLuotu: A().luotu };
    expect(idpTallennusVuosi(p, A(), new Date('2027-01-15'))).toBe('2026');
  });

  it('UUSI tavoite kohdistuu kuluvaan kauteen', () => {
    const p = { _idpVuosi: '2026', _idpVuosiLuotu: A().luotu };
    expect(idpTallennusVuosi(p, B(), new Date('2027-01-15'))).toBe('2027');
  });

  it('ilman _idpVuosi:a aina kuluva kausi', () => {
    expect(idpTallennusVuosi({}, A(), new Date('2027-01-15'))).toBe('2027');
  });

  it.each([['VP', VP], ['Master', MASTER], ['Pelaaja', PELAAJA]])('%s: lataus lukee edellisen vuoden jos voimassa olevaa ei ole', (_n, src) => {
    expect(src).toContain('idpVoimassaTavoite');
    expect(src).toMatch(/Number\(vuosi\) - 1/);
  });
});

describe('(8) Lukijat eivät koskaan valitse vaihdettua/hylättyä', () => {
  it('[A(vaihdettu), B(aktiivinen)] → B', () => {
    const lista = [Object.assign(A(), { status: 'vaihdettu' }), B()];
    expect(idpVoimassaTavoite(lista).kuvaus).toBe('B');
  });

  it('[A(aktiivinen), B(vaihdettu)] → A (ei sokeasti viimeinen)', () => {
    const lista = [A(), Object.assign(B(), { status: 'vaihdettu' })];
    expect(idpVoimassaTavoite(lista).kuvaus).toBe('A');
  });

  it('hylatty ohitetaan samoin', () => {
    const lista = [A(), Object.assign(B(), { status: 'hylatty' })];
    expect(idpVoimassaTavoite(lista).kuvaus).toBe('A');
  });

  it('ehdotettu kelpaa voimassa olevaksi (näkyy kortilla)', () => {
    const lista = [Object.assign(B(), { status: 'ehdotettu' })];
    expect(idpVoimassaTavoite(lista).kuvaus).toBe('B');
  });

  /* Pelaaja-appin suodatin ajetaan LÄHTEESTÄ: greppi ei takaisi että molemmat statukset ovat mukana. */
  it('Pelaaja-appin suodatin pudottaa sekä hylatyn että vaihdetun', () => {
    const rivi = PELAAJA.split('\n').find((l) => l.includes("t.status !== 'hylatty'"));
    expect(rivi, 'suodatinriviä ei löydy').toBeTruthy();
    const m = /arr\.filter\((function[\s\S]*?\})\)/.exec(rivi);
    expect(m, 'suodattimen muoto muuttui').toBeTruthy();
    // eslint-disable-next-line no-new-func
    const suodatin = new Function('return ' + m[1])();
    const lista = [A(), Object.assign(B(), { status: 'vaihdettu' }), { status: 'hylatty' }];
    const jaljella = lista.filter(suodatin);
    expect(jaljella).toHaveLength(1);
    expect(jaljella[0].kuvaus).toBe('A');
  });

  it('lib-vartijat: vaihdettu ei ole jumissa eikä näy pelaajan kaaressa', () => {
    const vanha = Object.assign(A(), { status: 'vaihdettu', luotu: '2020-01-01T00:00:00.000Z' });
    expect(IDP.idpJumissa(vanha, new Date('2026-09-23'))).toBe(false);
    expect(IDP.idpPelaajaKaari(Object.assign(vanha, { fokus: { nimi: 'x' } }))).toBeNull();
  });
});
