// #92 — joukkue-merkkijonon normalisointi (estää pirstoutumisen erätuonneissa).
import { describe, it, expect } from 'vitest';
import { createRequire } from 'module';
const require = createRequire(import.meta.url);
const { tmNormJoukkueAvain, tmKanonisoiJoukkue, tmPuhdistaJoukkueetIdt, lajitteleJoukkueetIkaluokittain } = require('../lib/tm_joukkue.js');

const NBSP = ' ', ZWSP = '​', ZWNJ = '‌', BOM = '﻿';

describe('tmNormJoukkueAvain (vertailuavain)', () => {
  it('case-insensitive + trim', () => {
    expect(tmNormJoukkueAvain('  SJK P15 ')).toBe('sjk p15');
    expect(tmNormJoukkueAvain('sjk p15')).toBe('sjk p15');
    expect(tmNormJoukkueAvain('SJK P15')).toBe(tmNormJoukkueAvain('sjk p15'));
  });
  it('collapse sisäiset whitespacet (tuplaväli, tab)', () => {
    expect(tmNormJoukkueAvain('SJK  P15')).toBe('sjk p15');
    expect(tmNormJoukkueAvain('SJK\tP15')).toBe('sjk p15');
  });
  it('NBSP välilyönniksi (ei poista sanojen väliä)', () => {
    expect(tmNormJoukkueAvain('SJK' + NBSP + 'P15')).toBe('sjk p15');
  });
  it('zero-width / BOM poistetaan (näkymättömät)', () => {
    expect(tmNormJoukkueAvain('SJK P15' + ZWSP)).toBe('sjk p15');
    expect(tmNormJoukkueAvain('S' + ZWNJ + 'JK P15')).toBe('sjk p15');
    expect(tmNormJoukkueAvain(BOM + 'SJK P15')).toBe('sjk p15');
  });
  it('NFC-normalisointi (ä komposoitu vs dekomposoitu = sama avain)', () => {
    const komp = 'Hä15';                    // ä = U+00E4
    const dekomp = 'Hä' + '15';        // a + combining diaeresis
    expect(tmNormJoukkueAvain(komp)).toBe(tmNormJoukkueAvain(dekomp));
  });
  it('null / undefined / tyhjä → ""', () => {
    expect(tmNormJoukkueAvain(null)).toBe('');
    expect(tmNormJoukkueAvain(undefined)).toBe('');
    expect(tmNormJoukkueAvain('   ')).toBe('');
  });
});

describe('tmKanonisoiJoukkue (osuma seuran joukkuet-listaan)', () => {
  const lista = [
    { id: 'sjk_p15', nimi: 'SJK P15' },
    { id: 'sjk_t14', nimi: 'SJK T14' },
    { id: 'sjk_p16', nimi: 'SJK P16' },
  ];
  it('osuma variantilla → docin KANONINEN {nimi,id} (docin nimi voittaa)', () => {
    expect(tmKanonisoiJoukkue('  sjk  p15 ', lista)).toEqual({ nimi: 'SJK P15', id: 'sjk_p15' });
    expect(tmKanonisoiJoukkue('SJK' + NBSP + 'T14', lista)).toEqual({ nimi: 'SJK T14', id: 'sjk_t14' });
    expect(tmKanonisoiJoukkue('SJK P15' + ZWSP, lista)).toEqual({ nimi: 'SJK P15', id: 'sjk_p15' });
  });
  it('ei osumaa → null (uusi joukkue / operaattorin päätös)', () => {
    expect(tmKanonisoiJoukkue('SJK P17', lista)).toBeNull();
    expect(tmKanonisoiJoukkue('', lista)).toBeNull();
    expect(tmKanonisoiJoukkue('SJK P15', null)).toBeNull();
    expect(tmKanonisoiJoukkue(null, lista)).toBeNull();
  });
  it('usea doc → täsmää oikeaan', () => {
    expect(tmKanonisoiJoukkue('sjk p16', lista).id).toBe('sjk_p16');
    expect(tmKanonisoiJoukkue('sjk t14', lista).id).toBe('sjk_t14');
  });
});

describe('tmPuhdistaJoukkueetIdt (#92b — joukkueet[] vain kanoniset id:t)', () => {
  const validIdt = ['sjk_p15', 'sjk_t14', 'sjk_p16'];
  const lista = [
    { id: 'sjk_p15', nimi: 'SJK P15' },
    { id: 'sjk_t14', nimi: 'SJK T14' },
    { id: 'sjk_p16', nimi: 'SJK P16' },
  ];
  it('poistaa nimi-string-jäänteen, jättää validi id:n', () => {
    expect(tmPuhdistaJoukkueetIdt(['sjk_p15', 'SJK P15'], validIdt, 'SJK P15', lista)).toEqual(['sjk_p15']);
    expect(tmPuhdistaJoukkueetIdt(['SJK T14', 'sjk_t14'], validIdt, 'SJK T14', lista)).toEqual(['sjk_t14']);
  });
  it('jos vain nimi-string (ei valideja id:tä) → turvaverkko: kanonisoi joukkue-stringistä', () => {
    expect(tmPuhdistaJoukkueetIdt(['SJK P15'], validIdt, 'SJK P15 ', lista)).toEqual(['sjk_p15']);
    expect(tmPuhdistaJoukkueetIdt([], validIdt, 'sjk t14', lista)).toEqual(['sjk_t14']);
  });
  it('orpo (ei id:tä, joukkue-string ei matchaa) → tyhjä', () => {
    expect(tmPuhdistaJoukkueetIdt(['SJK P17'], validIdt, 'SJK P17', lista)).toEqual([]);
    expect(tmPuhdistaJoukkueetIdt(['SJK P17'], validIdt, '', lista)).toEqual([]);
  });
  it('jo puhdas → idempotentti (sama tulos)', () => {
    expect(tmPuhdistaJoukkueetIdt(['sjk_p15'], validIdt, 'SJK P15', lista)).toEqual(['sjk_p15']);
    expect(tmPuhdistaJoukkueetIdt(['sjk_p15', 'sjk_t14'], validIdt, 'SJK P15', lista)).toEqual(['sjk_p15', 'sjk_t14']);
  });
  it('Set tai Array validIdt kelpaa; tyhjä/puuttuva joukkueet → []', () => {
    expect(tmPuhdistaJoukkueetIdt(['sjk_p15', 'SJK P15'], new Set(validIdt), 'SJK P15', lista)).toEqual(['sjk_p15']);
    expect(tmPuhdistaJoukkueetIdt(null, validIdt, null, lista)).toEqual([]);
    expect(tmPuhdistaJoukkueetIdt(undefined, validIdt, '', lista)).toEqual([]);
  });
});

describe('lajitteleJoukkueetIkaluokittain (#70 — kronologinen järjestys)', () => {
  it('P ennen T, ikä nouseva (korjaa P10<P16<P8 -aakkosbugin)', () => {
    const inp = [{ nimi: 'SJK T14' }, { nimi: 'SJK P8' }, { nimi: 'SJK P16' }, { nimi: 'SJK P10' }, { nimi: 'SJK T8' }, { nimi: 'SJK P14' }];
    expect(lajitteleJoukkueetIkaluokittain(inp).map(j => j.nimi))
      .toEqual(['SJK P8', 'SJK P10', 'SJK P14', 'SJK P16', 'SJK T8', 'SJK T14']);
  });
  it('U-joukkueet P/T:n jälkeen; tunnistamaton ikä loppuun', () => {
    const inp = [{ nimi: 'Akatemia' }, { nimi: 'U15' }, { nimi: 'P12' }, { nimi: 'T12' }];
    expect(lajitteleJoukkueetIkaluokittain(inp).map(j => j.nimi)).toEqual(['P12', 'T12', 'U15', 'Akatemia']);
  });
  it('vuosi-kenttä (ei ikää nimessä) → nuorin (suurin vuosi) ensin', () => {
    const inp = [{ nimi: 'Ryhmä A', vuosi: 2012 }, { nimi: 'Ryhmä B', vuosi: 2015 }];
    expect(lajitteleJoukkueetIkaluokittain(inp).map(j => j.nimi)).toEqual(['Ryhmä B', 'Ryhmä A']);
  });
  it('ei mutatoi alkuperäistä taulukkoa; tyhjä/null → []', () => {
    const inp = [{ nimi: 'P14' }, { nimi: 'P8' }];
    lajitteleJoukkueetIkaluokittain(inp);
    expect(inp.map(j => j.nimi)).toEqual(['P14', 'P8']);   // alkuperäinen ennallaan
    expect(lajitteleJoukkueetIkaluokittain([])).toEqual([]);
    expect(lajitteleJoukkueetIkaluokittain(null)).toEqual([]);
  });
});
