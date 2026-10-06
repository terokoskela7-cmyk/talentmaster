/**
 * scripts/tuo_harjoitepankki.js — T1: suunnittelu (puhdas; dry-run-raportti), uudelleenajo ei tuplaa, vanhojen arkistointi vain lipulla, kuvat, tarkistaja. Fixturet keksittyjä.
 */
import { describe, it, expect } from 'vitest';
import { createRequire } from 'module';
import { readFileSync } from 'fs';
const require = createRequire(import.meta.url);
const T = require('../scripts/tuo_harjoitepankki.js');
const FIX = require('./fixtures/harjoitepankki/keksitty_seura.json');
const OPTS = { seura: 'testi', tarkistaja: 'Testaaja', pvm: '2026-10-07' };
const KUVAT = new Set(['kpvh_01', 'kpvh_02', 'kpvh_04']);

describe('suunnittele (dry-run)', () => {
  it('raportti: 5 riviä → 4 hyväksytty + 1 luonnos (kolmas osapuoli), kaikki uusia, kuvat 3 ladattavana, 2 ilman kuvaa, jäsentymättömät, ei virheitä', () => {
    const r = T.suunnittele(FIX, {}, KUVAT, OPTS), rp = r.raportti;
    expect(rp).toMatchObject({ yhteensa: 5, hyvaksytty: 4, uudet: 5, paivitettavat: 0, muuttumattomat: 0, kuvatLadattavana: 3, virheet: [], vanhatYhteensa: 0 });
    expect(rp.luonnos).toEqual([{ id: 'kpvh_03', nimi: 'Keksitty kolmannen osapuolen kortti', syy: 'kolmannen osapuolen lähde (SoccerTutor)' }]); expect(rp.ilmanKuvaa).toEqual(['kpvh_03', 'kpvh_05']);
    expect(rp.jasentymattomat).toEqual([{ id: 'kpvh_04', kentat: ['kesto: "1–2 min / kierros"'] }]); expect(rp.kolmannenOsapuolenLahteet.map((x) => x.id)).toEqual(['kpvh_03', 'kpvh_05']);   // FIFA-maininta pelkkä INFO
    expect(r.docs.find((d) => d.id === 'kpvh_01').data.kuva_url).toBe('seurat/testi/harjoitepankki/kpvh_01.jpg'); expect(r.docs.find((d) => d.id === 'kpvh_03').data.kuva_url).toBeNull(); expect(r.docs.every((d) => d.op === 'luo' && d.versio === 1)).toBe(true);
  });
  it('tilasto laskee jäsennysosuudet (alue mitta/koko/osa/ei, pelaajamäärä, ikärajattu, kesto, vuosikello, tasot)', () => {
    expect(T.suunnittele(FIX, {}, KUVAT, OPTS).raportti.tilasto).toMatchObject({ alue_mitta: 2, alue_koko: 1, alue_osa: 1, alue_ei: 1, pelaajamaara: 2, pelaajamaara_ei: 3, ika_rajattu: 4, ika_ei: 1, kesto: 2, kesto_ei: 3, vuosikello: 1, tasot: 1 });
  });
  it('UUDELLEENAJO ei tuplaa: sama aineisto samoilla arvoilla → kaikki ei_muutosta; muuttunut rivi → paivita + versio+1; ID = lähteen id', () => {
    const eka = T.suunnittele(FIX, {}, KUVAT, OPTS), kanta = {}; eka.docs.forEach((d) => { kanta[d.id] = Object.assign({}, d.data, { versio: d.versio, paivitetty: 'x', luotu: 'y' }); });
    const toka = T.suunnittele(FIX, kanta, KUVAT, OPTS); expect(toka.raportti).toMatchObject({ uudet: 0, paivitettavat: 0, muuttumattomat: 5 }); expect(toka.docs.map((d) => d.id)).toEqual(eka.docs.map((d) => d.id));
    const muutettu = JSON.parse(JSON.stringify(FIX)); muutettu.harjoitteet[0].kulku = 'Uusi kulku'; const kolmas = T.suunnittele(muutettu, kanta, KUVAT, OPTS);
    expect(kolmas.raportti).toMatchObject({ uudet: 0, paivitettavat: 1, muuttumattomat: 4 }); expect(kolmas.docs.find((d) => d.id === 'kpvh_01')).toMatchObject({ op: 'paivita', versio: 2 });
    const uusiTark = T.suunnittele(FIX, kanta, KUVAT, Object.assign({}, OPTS, { tarkistaja: 'Toinen' })); expect(uusiTark.raportti.paivitettavat).toBe(4);   // tarkistaja vaihtuu → hyväksytyt päivittyvät, luonnos ei
  });
  it('VANHAT RIVIT: id ei kuulu aineistoon → arkistoitavia; ilman lippua EI arkistoida (arkistoitavat tyhjä), lipulla listataan; jo arkistoitu ei uudelleen; samaa id:tä ei arkistoida', () => {
    const kanta = { vanha_1: { nimi: 'v1', tila: 'hyvaksytty' }, vanha_2: { nimi: 'v2' }, vanha_3: { nimi: 'v3', arkistoitu: true }, kpvh_01: { nimi: 'sama id' } };
    const ilman = T.suunnittele(FIX, kanta, KUVAT, OPTS); expect(ilman.raportti).toMatchObject({ vanhatYhteensa: 3, arkistoitavat: ['vanha_1', 'vanha_2'] }); expect(ilman.arkistoitavat).toEqual([]);
    const lipulla = T.suunnittele(FIX, kanta, KUVAT, Object.assign({}, OPTS, { arkistoiVanhat: true })); expect(lipulla.arkistoitavat).toEqual(['vanha_1', 'vanha_2']); expect(lipulla.arkistoitavat).not.toContain('kpvh_01');
    expect(lipulla.docs.find((d) => d.id === 'kpvh_01').op).toBe('paivita');
  });
  it('virheet: tyhjä syöte, duplikaatti-id, kelpaamaton id (esim. polkumerkit), puuttuva nimi → virhe (apply estetty); meta-ristiriidat huomautuksina; ylimääräinen kuva raportoidaan', () => {
    expect(T.suunnittele({ harjoitteet: [] }, {}, KUVAT, OPTS).raportti.virheet).toEqual(['syötteessä ei harjoitteita']);
    const dup = T.suunnittele({ harjoitteet: [{ id: 'a_1', nimi: 'x' }, { id: 'a_1', nimi: 'y' }] }, {}, new Set(), OPTS).raportti; expect(dup.virheet).toEqual(['duplikaatti-id a_1']); expect(dup.duplikaatit).toEqual(['a_1']);
    expect(T.suunnittele({ harjoitteet: [{ id: '../x', nimi: 'x' }, { id: 'Ä', nimi: 'x' }, { id: 'ok', nimi: '' }] }, {}, new Set(), OPTS).raportti.virheet.length).toBe(3);
    const m = T.suunnittele({ meta: { lkm: 99, seura: 'MUU' }, harjoitteet: [{ id: 'a', nimi: 'x' }] }, {}, new Set(['ei_riviä']), OPTS).raportti; expect(m.huomautukset.length).toBe(2); expect(m.ylimaaraisetKuvat).toEqual(['ei_riviä']);
  });
  it('--tarkistaja puuttuu → huomautus ja hyväksytyillä tarkistaja null (apply estetään mainissa); tulosta() sisältää avainluvut eikä harjoitetekstejä', () => {
    const r = T.suunnittele(FIX, {}, KUVAT, { seura: 'testi', pvm: '2026-10-07' }); expect(r.raportti.huomautukset.join(' ')).toMatch(/--tarkistaja puuttuu/); expect(r.docs[0].data.tarkistaja).toBeNull();
    const teksti = T.tulosta(T.suunnittele(FIX, {}, KUVAT, OPTS), false, OPTS); for (const s of ['DRY-RUN', '5 harjoitetta', 'hyväksytty: 4', 'luonnos: 1', 'kpvh_03', 'kuvia ladattavana: 3', 'ei kosketa ilman --arkistoi-vanhat']) expect(teksti).toContain(s);
    for (const rivi of FIX.harjoitteet) expect(teksti).not.toContain(rivi.kulku);   // sisältö ei vuoda lokiin
    expect(T.tulosta(T.suunnittele(FIX, { v: { nimi: 'x' } }, KUVAT, Object.assign({}, OPTS, { arkistoiVanhat: true })), true, Object.assign({}, OPTS, { arkistoiVanhat: true }))).toMatch(/APPLY[\s\S]*ARKISTOIDAAN/);
  });
});

describe('skriptin turvarajat (lähdekooditesti)', () => {
  const src = readFileSync(new URL('../scripts/tuo_harjoitepankki.js', import.meta.url), 'utf8');
  it('dry-run oletus: kirjoitus vain --apply:lla; apply vaatii tarkistajan, ei virheitä, lukuyhteyden; kohde vain seurat/{seura}/harjoitepankki; ei poistoa; arkistointi vain lipulla', () => {
    expect(src).toMatch(/if \(!o\.apply\) \{[^}]*return 0;/); expect(src).toMatch(/Apply estetty: vaaditaan --tarkistaja/); expect(src).toMatch(/Apply estetty: korjaa virheet/); expect(src).toMatch(/Apply estetty: --ei-lue ei salli kirjoitusta/);
    expect(src).not.toMatch(/\.delete\(|batch\.delete|deleteDoc/); expect(src).toMatch(/arkistoiVanhat: !!o\['arkistoi-vanhat'\]/); expect(src).toMatch(/Polku seuran ulkopuolella/); expect(src.match(/arkistoitu: true/g).length).toBe(1);
    expect(src).toMatch(/applicationDefault\(\)/); expect(src).not.toMatch(/serviceAccount|\.json'\)\s*\)|cert\(/);   // ADC, ei SA-avainta
  });
});
