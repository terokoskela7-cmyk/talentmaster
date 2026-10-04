/**
 * TK-historian avainnimet: Pikakirjaus/Excel kirjoittavat tki_historiaan `<laji>_s`, Testaus_v9 `<laji>`.
 * Kehityskaari tunsi vain ilman _s:ää → Pikakirjauksen/Excelin TK-historia ei näkynyt kaaressa. Lukuhetken normalisointi
 * (ei migraatiota, kirjoittajiin ei kosketa). Testit ajavat OIKEITA libejä (kehityskaari, ennatykset, historia).
 */
import { describe, it, expect } from 'vitest';
const K = require('../lib/tm_kehityskaari.js');
const E = require('../lib/tm_ennatykset.js');
const H = require('../lib/tm_historia.js');

// Historia rakennetaan oikealla tmTkiSnapshot/tmHistoriaLisaa-polulla, kuten kirjoittajat.
const rakenna = (rivit) => rivit.reduce((arr, [pvm, tkLajit]) => H.tmHistoriaLisaa(arr, H.tmTkiSnapshot(pvm, { tkLajit })), []);
const S_HIST = rakenna([
  ['2026-03-01', { pujottelu_s: 12.0, syotto_s: 15.0, kuljetus_laukaus_s: 30.0 }],
  ['2026-09-01', { pujottelu_s: 10.5, syotto_s: 13.0, kuljetus_laukaus_s: 27.0 }],
]);

describe('tmKaariNormalisoiTk', () => {
  it('_s-avaimet → kanoniset, muut avaimet (pvm, tki) koskemattomia, ei mutatoi', () => {
    const src = [{ pvm: '2026-03-01', tki: 50, pujottelu_s: 12, pituuspotku_bonus_s: 1.5 }];
    const kopio = JSON.parse(JSON.stringify(src));
    expect(K.tmKaariNormalisoiTk(src)).toEqual([{ pvm: '2026-03-01', tki: 50, pujottelu: 12, pituuspotku_bonus: 1.5 }]);
    expect(src).toEqual(kopio);
  });
  it('sama rivillä molemmat → kanoninen (käyttäjän kirjaus) voittaa, riippumatta avainjärjestyksestä', () => {
    expect(K.tmKaariNormalisoiTk([{ pvm: 'a', pujottelu_s: 9, pujottelu: 11 }])[0].pujottelu).toBe(11);
    expect(K.tmKaariNormalisoiTk([{ pvm: 'a', pujottelu: 11, pujottelu_s: 9 }])[0].pujottelu).toBe(11);
  });
  it('kanoninen null/puuttuu + _s numero → _s:n arvo (null ei ylikirjoita)', () => {
    expect(K.tmKaariNormalisoiTk([{ pvm: 'a', pujottelu: null, pujottelu_s: 9 }])[0].pujottelu).toBe(9);
  });
  it('_s on null → ei luoda kanonista avainta (ei fabrikoida)', () => {
    expect(K.tmKaariNormalisoiTk([{ pvm: 'a', pujottelu_s: null }])).toEqual([{ pvm: 'a' }]);
  });
  it('hh_historian avaimet ennallaan (pujottelu_hh, lin30m)', () => {
    expect(K.tmKaariNormalisoiTk([{ pvm: 'a', lin30m: 5.1, pujottelu_hh: 9.9 }])).toEqual([{ pvm: 'a', lin30m: 5.1, pujottelu_hh: 9.9 }]);
  });
  it('tyhjä/null/rikkinäinen rivi ei kaada', () => {
    expect(K.tmKaariNormalisoiTk(null)).toEqual([]);
    expect(K.tmKaariNormalisoiTk([null])).toEqual([null]);
  });
});

describe('Kehityskaari lukee _s-historian', () => {
  it('tmKaariSarja(tki,"pujottelu") löytää _s-pisteet pvm-järjestyksessä; sekahistoria (Testaus_v9 + Pikakirjaus) yhdeksi sarjaksi', () => {
    expect(K.tmKaariSarja(S_HIST, 'pujottelu').map((x) => x.arvo)).toEqual([12.0, 10.5]);
    const sekaisin = rakenna([['2026-01-01', { pujottelu: 13.0 }], ['2026-03-01', { pujottelu_s: 12.0 }], ['2026-09-01', { pujottelu: 10.5 }]]);
    expect(K.tmKaariSarja(sekaisin, 'pujottelu').map((x) => x.arvo)).toEqual([13.0, 12.0, 10.5]);
  });
  it('tmKaariRenderFull näyttää Pujottelu/Syöttö/Kuljetus-laukaus-rivit _s-historiasta', () => {
    const html = K.tmKaariRenderFull({ tki_historia: S_HIST }, { esc: (x) => String(x) });
    expect(html).toContain('Pujottelu'); expect(html).toContain('Syöttö'); expect(html).toContain('Kuljetus-laukaus');
  });
  it('VP:n varapolku: tmKaariMitatutAvaimet(tki)[0] + _s-historia → kanoninen avain, aikatestin suunta OIKEIN (aika laski = parani)', () => {
    const avaimet = K.tmKaariMitatutAvaimet(S_HIST);
    expect(avaimet.slice().sort()).toEqual(['kuljetus_laukaus', 'pujottelu', 'syotto']);   // ei *_s-avaimia
    avaimet.forEach((avain) => {   // jokaisen (myös [0]:n, jonka VP valitsee) aikatestin suunta: aika laski = parani
      const suunta = K.tmKaariSuunta(avain, K.tmKaariSarja(S_HIST, avain));
      expect(suunta.parani, avain).toBe(true); expect(suunta.suunta, avain).toBe('up');
    });
    expect(K.tmKaariNimi('pujottelu')).toBe('Pujottelu');
    // vastakohta: aika kasvoi → ei parannus
    const huonompi = rakenna([['2026-03-01', { pujottelu_s: 10.0 }], ['2026-09-01', { pujottelu_s: 12.0 }]]);
    expect(K.tmKaariSuunta('pujottelu', K.tmKaariSarja(huonompi, 'pujottelu')).parani).toBe(false);
  });
  it('kuljetus_laukaus: _s (netto) ja Testaus_v9-avain (netto) samassa sarjassa', () => {
    const h = rakenna([['2026-03-01', { kuljetus_laukaus_s: 30 }], ['2026-09-01', { kuljetus_laukaus: 27 }]]);
    expect(K.tmKaariSarja(h, 'kuljetus_laukaus').map((x) => x.arvo)).toEqual([30, 27]);
  });
});

describe('Ennätyssiemen lukee molemmat avainmuodot; kuljetus_laukaus ei ennätyksiin', () => {
  it('_s ja kanoninen historia siementävät saman testin', () => {
    const a = E.tmEnnatysSiemenet({ tki_historia: S_HIST });
    const b = E.tmEnnatysSiemenet({ tki_historia: rakenna([['2026-03-01', { pujottelu: 12.0 }], ['2026-09-01', { pujottelu: 10.5 }]]) });
    expect(a.pujottelu.map((x) => x.arvo)).toEqual([12.0, 10.5]);
    expect(b.pujottelu.map((x) => x.arvo)).toEqual([12.0, 10.5]);
    expect(a.syotto.length).toBe(2);
  });
  it('rivillä molemmat → yksi arvo (kaksoispistettä ei synny); kl ei siemeneksi kummassakaan muodossa', () => {
    const o = E.tmEnnatysSiemenet({ tki_historia: [{ pvm: '2026-03-01', pujottelu_s: 12, pujottelu: 12, kuljetus_laukaus: 30, kuljetus_laukaus_s: 30 }] });
    expect(o.pujottelu.length).toBe(1);
    expect(o.kuljetus_laukaus).toBeUndefined();
  });
});
