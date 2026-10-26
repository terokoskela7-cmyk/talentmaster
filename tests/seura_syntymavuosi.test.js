import { describe, it, expect } from 'vitest';
import fs from 'fs';
const L = require('../lib/tm_syntymavuosi.js');
const NYT = new Date(Date.UTC(2026, 9, 26));

describe('tmSyntymaPaivitys', () => {
  it('vain vuosi → syntymaVuosi numerona, EI syntymaaikaa', () => {
    const r = L.tmSyntymaPaivitys('', '2016', NYT);
    expect(r.virhe).toBeNull();
    expect(r.kentat).toEqual({ syntymaVuosi: 2016 });
    expect('syntymaaika' in r.kentat).toBe(false);
  });
  it('täysi päivä → molemmat, vuosi = päivän vuosi (vuosikenttä ohitetaan)', () => {
    const r = L.tmSyntymaPaivitys('2015-03-07', '2016', NYT);
    expect(r.kentat.syntymaVuosi).toBe(2015);
    expect(r.kentat.syntymaaika.getTime()).toBe(Date.UTC(2015, 2, 7));
  });
  it('molemmat tyhjiä → ei muuteta mitään (ei poistoa)', () => {
    expect(L.tmSyntymaPaivitys('', '', NYT)).toEqual({ kentat: {}, virhe: null });
    expect(L.tmSyntymaPaivitys(null, undefined, NYT).kentat).toEqual({});
  });
  it('virheelliset arvot hylätään', () => {
    expect(L.tmSyntymaPaivitys('', '1999', NYT).virhe).toBeTruthy();
    expect(L.tmSyntymaPaivitys('', '2027', NYT).virhe).toBeTruthy();
    expect(L.tmSyntymaPaivitys('', 'abc', NYT).virhe).toBeTruthy();
    expect(L.tmSyntymaPaivitys('2015-02-30', '', NYT).virhe).toBeTruthy();
  });
});

describe('tmSyntymaAvaus', () => {
  it('avaus pelkällä vuodella → date-kenttä tyhjä, vuosikenttä täytetty', () => {
    expect(L.tmSyntymaAvaus({ syntymaVuosi: 2014 })).toEqual({ pvm: '', vuosi: 2014 });
  });
  it('regressio: olemassa oleva täysi syntymäaika säilyy ennallaan', () => {
    const p = { syntymaaika: { seconds: Date.UTC(2013, 2, 15) / 1000 }, syntymaVuosi: 2013 };
    expect(L.tmSyntymaAvaus(p)).toEqual({ pvm: '2013-03-15', vuosi: 2013 });
    // avaa → tallenna ilman muutosta antaa saman päivän
    const r = L.tmSyntymaPaivitys('2013-03-15', '2013', NYT);
    expect(r.kentat.syntymaaika.getTime()).toBe(p.syntymaaika.seconds * 1000);
    expect(r.kentat.syntymaVuosi).toBe(2013);
  });
  it('ei tietoa → tyhjä', () => {
    expect(L.tmSyntymaAvaus({})).toEqual({ pvm: '', vuosi: null });
  });
});

describe('tmIkaluokkaVaroitus (ei este)', () => {
  const p10 = { id: 'a', nimi: 'KPV P10', ikaryhma: 'P10' };
  it('P10 = 2016 → ei varoitusta', () => expect(L.tmIkaluokkaVaroitus(2016, [p10], 2026)).toBe(false));
  it('2014 joukkueessa P10 → varoitus', () => expect(L.tmIkaluokkaVaroitus(2014, [p10], 2026)).toBe(true));
  it('pelaa ylempänä: vuosi vastaa toista valituista joukkueista → ei varoitusta', () => {
    expect(L.tmIkaluokkaVaroitus(2016, [{ ikaryhma: 'P12' }, p10], 2026)).toBe(false);
  });
  it('ikäluokka nimestä tai vuosikentästä; tuntematon ikä / ei joukkuetta → ei varoitusta', () => {
    expect(L.tmIkaluokkaVaroitus(2015, [{ nimi: 'Sibbo P11' }], 2026)).toBe(false);
    expect(L.tmIkaluokkaVaroitus(2015, [{ vuosi: 2016 }], 2026)).toBe(true);
    expect(L.tmIkaluokkaVaroitus(2015, [{ nimi: 'Edustus' }], 2026)).toBe(false);
    expect(L.tmIkaluokkaVaroitus(2015, [], 2026)).toBe(false);
  });
});

describe('Seura-HTML käyttää libiä', () => {
  const html = fs.readFileSync(require('path').join(__dirname, '..', 'TalentMaster_Seura.html'), 'utf8');
  it('ei esitäytä date-kenttää vuodesta eikä kirjoita syntymaaikaa suoraan', () => {
    expect(html).not.toMatch(/syntymaVuosi \+ '-01-01'/);
    expect(html).not.toMatch(/paivitys\.syntymaaika\s*=/);
    expect(html).toContain('tmSyntymaPaivitys(');
    expect(html).toContain('id="mp_syntymavuosi"');
  });
  it('lib ladataan ennen käyttöä', () => {
    expect(html.indexOf('lib/tm_syntymavuosi.js')).toBeGreaterThan(-1);
  });
});
