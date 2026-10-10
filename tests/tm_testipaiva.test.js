/* Testipäivän lähde (lib/tm_testipaiva.js): oikea | arvio (kausi → pvm_arvio) | tuntematon. Ei hiljaista varapäivää kirjoituspoluissa. */
import { describe, it, expect } from 'vitest';
import { readFileSync } from 'fs';
import { createRequire } from 'module';
const require = createRequire(import.meta.url);
const TP = require('../lib/tm_testipaiva.js'), PK = require('../lib/tm_pikakentat.js');
const lue = (f) => readFileSync(new URL('../' + f, import.meta.url), 'utf8');

describe('tmKausiPvm — kausi → kauden keskipäivä (ARVIO)', () => {
  it.each([['syksy 2025', '2025-10-15'], ['2025-syksy', '2025-10-15'], ['Kevät 2026', '2026-04-15'], ['2026-kevat', '2026-04-15'], ['2022-talvi', '2022-01-15']])('%s → %s', (k, p) => { expect(TP.tmKausiPvm(k)).toMatchObject({ pvm: p, arvio: true }); });
  it('kausi näkyy tekstinä ("syksy 2025"), ei keksittynä päivänä', () => { expect(TP.tmKausiPvm('2025-syksy').kausi).toBe('syksy 2025'); });
  it.each([[''], [null], ['2025'], ['syksy'], ['kesä 2025'], ['abc']])('tuntematon kausi %s → null', (k) => { expect(TP.tmKausiPvm(k)).toBeNull(); });
});

describe('tmTestipaiva — kirjoituspolun päätös', () => {
  it('oikea päivä voittaa kauden', () => { expect(TP.tmTestipaiva({ pvm: '2025-09-20', kausi: '2025-syksy' })).toEqual({ pvm: '2025-09-20', arvio: false, lahde: 'oikea', kausi: null }); });
  it('kausiteksti TestiPvm-solussa → arvio', () => { expect(TP.tmTestipaiva({ pvm: null, teksti: 'Kevät 2026' })).toMatchObject({ pvm: '2026-04-15', arvio: true, lahde: 'arvio' }); });
  it('vain kausi → arvio', () => { expect(TP.tmTestipaiva({ kausi: '2025-syksy' })).toMatchObject({ pvm: '2025-10-15', arvio: true }); });
  it('ei päivää eikä kautta → tuntematon, pvm null (EI "tänään", EI kiinteää päivää)', () => { expect(TP.tmTestipaiva({})).toEqual({ pvm: null, arvio: false, lahde: 'tuntematon', kausi: null }); expect(TP.tmTestipaiva({ pvm: 'ei päivä', kausi: '' }).pvm).toBeNull(); });
  it('mahdoton kalenteripäivä (2025-02-31) ei kelpaa', () => { expect(TP.tmTestipaiva({ pvm: '2025-02-31' }).lahde).toBe('tuntematon'); });
  it('pikakenttäpari: arvio → <x>_pvm + <x>_pvm_arvio:true; oikea päivä poistaa merkin; tuntematon → ei kenttiä', () => {
    expect(TP.tmPvmKentat('tki', TP.tmTestipaiva({ kausi: '2025-syksy' }), 'DEL')).toEqual({ tki_pvm: '2025-10-15', tki_pvm_arvio: true });
    expect(TP.tmPvmKentat('tki', TP.tmTestipaiva({ pvm: '2025-09-20' }), 'DEL')).toEqual({ tki_pvm: '2025-09-20', tki_pvm_arvio: 'DEL' });
    expect(TP.tmPvmKentat('tki', TP.tmTestipaiva({}), 'DEL')).toEqual({});
  });
});

describe('tmPaivaLahde — luku: tulosdokumentti → pikakenttä → arvio → tuntematon', () => {
  it('tulosdokumentin päivä voittaa', () => { expect(TP.tmPaivaLahde({ tki_pvm: '2024-01-01' }, 'tki', { tulosPvm: '2025-09-20' })).toEqual({ iso: '2025-09-20', lahde: 'oikea', kausi: null }); });
  it('pikakentän oikea päivä', () => { expect(TP.tmPaivaLahde({ tki_pvm: '2025-09-20' }, 'tki')).toMatchObject({ iso: '2025-09-20', lahde: 'oikea' }); });
  it('pikakenttä + pvm_arvio → arvio (päivä käytössä vanhuuteen)', () => { expect(TP.tmPaivaLahde({ tki_pvm: '2025-10-15', tki_pvm_arvio: true }, 'tki')).toMatchObject({ iso: '2025-10-15', lahde: 'arvio' }); });
  it('kausiteksti pvm-kentässä → arvio', () => { expect(TP.tmPaivaLahde({ tki_pvm: 'syksy 2025' }, 'tki')).toMatchObject({ iso: '2025-10-15', lahde: 'arvio', kausi: 'syksy 2025' }); });
  it('puuttuva / tyhjä / roskaa → tuntematon (ei tuore, ei kehityskohde)', () => { ['', null, undefined, 'huomenna'].forEach((v) => expect(TP.tmPaivaLahde({ tki_pvm: v }, 'tki').lahde).toBe('tuntematon')); expect(TP.tmPaivaLahde(null, 'tki').iso).toBeNull(); });
  it('Firestore Timestamp (toDate) kelpaa', () => { expect(TP.tmPaivaLahde({ tki_pvm: { toDate: () => new Date(2025, 8, 20) } }, 'tki')).toMatchObject({ iso: '2025-09-20', lahde: 'oikea' }); });
});

describe('Ei hiljaista varapäivää — kaikki tunnetut kirjoituspolut', () => {
  it('tm_pikakentat: ilman pvm:ää pikakenttiä EI kirjoiteta (ei "tänään")', () => {
    const d = { syntymaVuosi: 2013, sukupuoli: 'M', joukkue: 'KPV U13' };
    expect(PK.tmLaskePikakentat(d, { lin_30m: { paras: 5.0 } }, undefined)).toEqual({});
    expect(PK.tmLaskePikakentat(d, { lin_30m: { paras: 5.0 } }, '').hh_pvm).toBeUndefined();
    expect(PK.tmLaskePikakentat(d, { lin_30m: { paras: 5.0 } }, '2026-05-02').hh_pvm).toBe('2026-05-02');
  });
  const X = lue('TalentMaster_Excel_Tuonti.html');
  it('Excel-tuonti: ei 20.1.-varapäivää eikä "tänään" testipäiväksi; kausi → TM_TESTIPAIVA, pvm_arvio tallentuu', () => {
    expect(X).not.toContain('WALLSPORT_FALLBACK'); expect(X).not.toMatch(/_kausiPvm\([^)]*\) \|\| _paivaIso\(new Date\(\)\)/);
    expect(X).toContain('TM_TESTIPAIVA.tmTestipaiva('); expect(X).toContain('pvm_arvio: pvmArvio === true'); expect(X).toContain("paketit0.filter(x => x.pvmIso)");
    expect(X).toMatch(/\[k \+ '_arvio'\] = pvmArvio \? true : firebase\.firestore\.FieldValue\.delete\(\)/);
  });
  it('PDF-tuonti: kilpailupäivä vaaditaan (ei "tänään"); recalcTSI ei keksi tsi_pvm:ää; recalc-polut kantavat pvm_arvion', () => {
    expect(X).toMatch(/return pdfData\.pvm \|\| null;/); expect(X).toContain("Anna kilpailupäivä ennen tallennusta");
    expect(X).toContain('if (!m.pvm) return;'); expect(X).not.toMatch(/tsi_pvm: m\.pvm \|\| /);
    expect(X).toContain("pika.tki_pvm_arvio = d.pvm_arvio === true"); expect(X).toContain("tki_pvm_arvio: m.pvmArvio ? true");
  });
  it('Testaus_v9 / Pikakirjaus / Testituonti: päivä tulee tapahtumasta/lomakkeelta (näkyvä), Testituonti vaatii jäsentyvän päivän', () => {
    expect(lue('TalentMaster_Testituonti_Master.html')).toContain('jäsentymätön päivä → EI pikakenttiä');
  });
});
