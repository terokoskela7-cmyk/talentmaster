// Vaihe 7.2a — fysiikkaohjelmakirjasto PURE-ydin (lib/tm_ohjelma.js).
// Validoi (pakolliset + intensiteetti-järki + GDPR-vahti) · versioi · templaatista-esitäyttö. Brief §10.
import { describe, it, expect } from 'vitest';
const O = require('../lib/tm_ohjelma.js');

const vaihe = (o = {}) => Object.assign({ vaihe: 'V', viikot: '1–2', intensiteetti: '60–70 %', nimi: 'Loikat', ohje: 'tee', mittari: 'x', harjoitteet: [] }, o);
const ohjelma = (o = {}) => Object.assign({ nimi: 'Nopeus-voima A', tyyppi: 'nopeus_voima', kuvaus: 'plyo', kesto_vk: 6, vaiheet: [vaihe()] }, o);

describe('tmOhjelmaValidoi — pakolliset kentät', () => {
  it('validi ohjelma → ok', () => {
    expect(O.tmOhjelmaValidoi(ohjelma())).toEqual({ ok: true, virheet: [] });
  });
  it('nimi puuttuu → virhe', () => {
    expect(O.tmOhjelmaValidoi(ohjelma({ nimi: '' })).ok).toBe(false);
  });
  it('tyyppi virheellinen → virhe', () => {
    expect(O.tmOhjelmaValidoi(ohjelma({ tyyppi: 'xyz' })).virheet.join()).toMatch(/Tyyppi/);
  });
  it('ei vaiheita → virhe', () => {
    expect(O.tmOhjelmaValidoi(ohjelma({ vaiheet: [] })).virheet.join()).toMatch(/vaihe/i);
  });
  it('vaiheen nimi puuttuu → virhe', () => {
    expect(O.tmOhjelmaValidoi(ohjelma({ vaiheet: [vaihe({ nimi: '' })] })).ok).toBe(false);
  });
  it('null → virhe', () => {
    expect(O.tmOhjelmaValidoi(null).ok).toBe(false);
  });
});

describe('tmOhjelmaValidoi — intensiteetti-järki', () => {
  it('nouseva %-progressio → ok', () => {
    const o = ohjelma({ vaiheet: [vaihe({ intensiteetti: '60–70 %' }), vaihe({ intensiteetti: '75–85 %' }), vaihe({ intensiteetti: '90–100 %' })] });
    expect(O.tmOhjelmaValidoi(o).ok).toBe(true);
  });
  it('laskeva progressio → virhe', () => {
    const o = ohjelma({ vaiheet: [vaihe({ intensiteetti: '80–90 %' }), vaihe({ intensiteetti: '60–70 %' })] });
    expect(O.tmOhjelmaValidoi(o).virheet.join()).toMatch(/laskee/);
  });
  it('yli 100 % → virhe', () => {
    expect(O.tmOhjelmaValidoi(ohjelma({ vaiheet: [vaihe({ intensiteetti: '90–120 %' })] })).virheet.join()).toMatch(/epälooginen/);
  });
  it('lo > hi → virhe', () => {
    expect(O.tmOhjelmaValidoi(ohjelma({ vaiheet: [vaihe({ intensiteetti: '80–60 %' })] })).ok).toBe(false);
  });
  it('sanallinen intensiteetti (kuntoutus) → ei %-tarkistusta', () => {
    const o = ohjelma({ tyyppi: 'kuntoutus', vaiheet: [vaihe({ intensiteetti: 'kevyt' }), vaihe({ intensiteetti: 'kohtalainen' })] });
    expect(O.tmOhjelmaValidoi(o).ok).toBe(true);
  });
});

describe('tmOhjelmaValidoi — GDPR Art. 9 -vahti (§8)', () => {
  it('harjoitussisältö OK (eksentrinen takareisi)', () => {
    expect(O.tmOhjelmaValidoi(ohjelma({ tyyppi: 'kuntoutus', kuvaus: 'eksentrinen takareisi 2×/vk', vaiheet: [vaihe({ intensiteetti: 'kevyt' })] })).ok).toBe(true);
  });
  it('diagnoosi kuvauksessa → hylätty', () => {
    expect(O.tmOhjelmaValidoi(ohjelma({ kuvaus: 'takareiden revähdyksen jälkeinen ohjelma' })).virheet.join()).toMatch(/GDPR|diagnoosi/i);
  });
  it('diagnoosi vaiheen ohjeessa → hylätty', () => {
    expect(O.tmOhjelmaValidoi(ohjelma({ vaiheet: [vaihe({ ohje: 'eturistiside-leikkauksen jälkeen varovasti' })] })).ok).toBe(false);
  });
  it('diagnoosi harjoitteissa → hylätty', () => {
    expect(O.tmOhjelmaValidoi(ohjelma({ vaiheet: [vaihe({ harjoitteet: ['nilkan nyrjähdys kuntoutus'] })] })).ok).toBe(false);
  });
});

describe('tmOhjelmaVersioi', () => {
  it('versio+1 + edellinen_versio_id + ei-arkistoitu', () => {
    const vanha = { id: 'abc', nimi: 'A', tyyppi: 'nopeus', kuvaus: 'x', kesto_vk: 4, vaiheet: [vaihe()], versio: 1, laatija_uid: 'u1', laatija_rooli: 'fysiikkavalmentaja', luotu: '2026-01-01' };
    const uusi = O.tmOhjelmaVersioi(vanha, { nimi: 'A muokattu', paivitetty: '2026-07-10' });
    expect(uusi.versio).toBe(2);
    expect(uusi.edellinen_versio_id).toBe('abc');
    expect(uusi.nimi).toBe('A muokattu');
    expect(uusi.tyyppi).toBe('nopeus');       // säilyy
    expect(uusi.laatija_uid).toBe('u1');       // laatija säilyy
    expect(uusi.arkistoitu).toBe(false);
    expect(uusi.paivitetty).toBe('2026-07-10');
    expect('id' in uusi).toBe(false);          // uusi doc-id kutsujalta
  });
  it('ilman versio-kenttää → versio 2', () => {
    expect(O.tmOhjelmaVersioi({ id: 'x' }, {}).versio).toBe(2);
  });
});

describe('tmOhjelmaTemplaatista', () => {
  it('nopeus_voima → 3 vaihetta (Everton-struktuuri) + V7-templaatin nimi/kesto', () => {
    const t = O.tmOhjelmaTemplaatista('nopeus_voima');
    expect(t.vaiheet.length).toBe(3);
    expect(t.vaiheet.map(v => v.vaihe)).toEqual(['Valmistava', 'Kehittävä', 'Huipentava']);
    expect(t.versio).toBe(1);
    expect(t.kesto_vk).toBe(6);   // V7 tmOhjelmaTemplaatti
    expect(t.lahde_templaatti).toBe('everton_loikat');
  });
  it('kuntoutus → 3 vaihetta (HPP-struktuuri) + RTP-mittari', () => {
    const t = O.tmOhjelmaTemplaatista('kuntoutus');
    expect(t.vaiheet.map(v => v.vaihe)).toEqual(['Akuutti', 'Subakuutti', 'Krooninen']);
    expect(t.vaiheet[2].mittari).toMatch(/RTP/);
  });
  it('nopeus → 1 geneerinen vaihe', () => {
    expect(O.tmOhjelmaTemplaatista('nopeus').vaiheet.length).toBe(1);
  });
  it('tuntematon tyyppi → null', () => {
    expect(O.tmOhjelmaTemplaatista('xyz')).toBe(null);
  });
  it('templaatista tuotettu läpäisee validoinnin kun vaiheille annetaan nimet', () => {
    const t = O.tmOhjelmaTemplaatista('nopeus_voima');
    t.vaiheet.forEach((v, i) => { v.nimi = 'Vaihe ' + (i + 1); });
    expect(O.tmOhjelmaValidoi(t).ok).toBe(true);
  });
});
