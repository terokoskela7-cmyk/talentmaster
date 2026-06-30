// #92 — joukkue-merkkijonon normalisointi (estää pirstoutumisen erätuonneissa).
import { describe, it, expect } from 'vitest';
import { createRequire } from 'module';
const require = createRequire(import.meta.url);
const { tmNormJoukkueAvain, tmKanonisoiJoukkue } = require('../lib/tm_joukkue.js');

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
