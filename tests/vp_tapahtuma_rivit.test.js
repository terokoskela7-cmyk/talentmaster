/**
 * TalentMaster™ — E1a: _vpTapahtumaRivit (TalentMaster_VP_v25.html)
 * Tapahtuman osallistujarivien kokoaminen ladatuista cache-dokeista (joukkuerajattu, per pelaaja).
 * Funktio on VP_v25.html:ssä inline + nojaa _vpMittausKatTesti/_vpMittausArvo:hon (tm_testikatalogi) →
 * poimitaan koko tarvittava lohko lähteestä ja evaluoidaan (ei DOM/Firestore).
 */
import { describe, it, expect, beforeAll } from 'vitest';
import { readFileSync } from 'fs';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';
import { createRequire } from 'module';

const require = createRequire(import.meta.url);
const __dir = dirname(fileURLToPath(import.meta.url));

let _vpTapahtumaRivit;
beforeAll(() => {
  const lines = readFileSync(join(__dir, '..', 'TalentMaster_VP_v25.html'), 'utf8').split('\n');
  const grab = (a, b) => { const s = lines.findIndex(l => l.includes(a)); let e = s + 1; while (e < lines.length && !lines[e].includes(b)) e++; return lines.slice(s, e).join('\n'); };
  // riippuvuudet: _vpMittausKatTesti (tm_testikatalogi), _vpMittausArvo
  const katBlock = grab('function _vpMittausKatTesti(avain)', 'function _vpMittausArvo');
  const arvoBlock = grab('function _vpMittausArvo(v)', 'function _vpMittausLahdeLabel');
  const rivitBlock = grab('function _vpTapahtumaRivit(pelaajat', 'window._vpTapahtumaRivit = _vpTapahtumaRivit;');
  const K = require('../lib/tm_testikatalogi.js');
  const src = 'var window = { TM_TESTIKATALOGI: __K };\n' + katBlock + '\n' + arvoBlock + '\n' + rivitBlock + '\n return _vpTapahtumaRivit;';
  _vpTapahtumaRivit = new Function('__K', src)(K);
});

const pelaajat = [
  { id: 'p1', etunimi: 'Aino', sukunimi: 'Virtanen' },
  { id: 'p2', etunimi: 'Elias', sukunimi: 'Koski' },
  { id: 'p3', etunimi: 'Liam', sukunimi: 'Aho' }   // ei osallistunut tähän tapahtumaan
];
const cache = {
  p1: [{ __id: '2026-06-01_pikakirjaus', data: { testauspvm: '2026-06-01', lahde: 'pikakirjaus', protokolla: 'pikakirjaus', testit: { lin_30m: 4.35, hyppy_cj: 38 }, mitatoidut: {} } }],
  p2: [{ __id: '2026-06-01_pikakirjaus', data: { testauspvm: '2026-06-01', lahde: 'pikakirjaus', protokolla: 'pikakirjaus', testit: { lin_30m: 4.52, mas_kmh: 15 }, mitatoidut: { lin_30m: { kuka: 'u', milloin: 'x' } } } },
        { __id: '2026-03-01_hh', data: { testauspvm: '2026-03-01', protokolla: 'hh_laaja', testit: { lin30m: 4.7 } } }],   // eri pvm → ei mukaan
  p3: [{ __id: '2026-02-01_hh', data: { testauspvm: '2026-02-01', testit: { lin30m: 5.0 } } }]
};

describe('_vpTapahtumaRivit — osallistujien kokoaminen', () => {
  it('vain pvm:n tehneet pelaajat mukaan; muut pois', () => {
    const out = _vpTapahtumaRivit(pelaajat, cache, '2026-06-01', 'pikakirjaus');
    expect(out.map(o => o.pid)).toEqual(['p1', 'p2']);   // p3 ei osallistunut
  });

  it('arvot + nimet tm_testikatalogista, johdannaiset (mas_kmh) ohitetaan', () => {
    const out = _vpTapahtumaRivit(pelaajat, cache, '2026-06-01', 'pikakirjaus');
    const p1 = out.find(o => o.pid === 'p1');
    expect(p1.rivit.map(r => r.nimi + '=' + r.arvo)).toEqual(['Lineaarinopeus 30m=4.35', 'Kevennyshyppy (CMJ)=38']);
    const p2 = out.find(o => o.pid === 'p2');
    expect(p2.rivit.some(r => r.avain === 'mas_kmh')).toBe(false);   // johdannainen ohitettu
  });

  it('mitätöity avain merkitään; kaikkiMitatoitu kun kaikki mitätöity', () => {
    const out = _vpTapahtumaRivit(pelaajat, cache, '2026-06-01', 'pikakirjaus');
    const p2 = out.find(o => o.pid === 'p2');
    expect(p2.rivit.find(r => r.avain === 'lin_30m').mitatoitu).toBe(true);
    expect(p2.kaikkiMitatoitu).toBe(true);   // p2:lla vain lin_30m katalogitestinä → kaikki mitätöity
    const p1 = out.find(o => o.pid === 'p1');
    expect(p1.kaikkiMitatoitu).toBe(false);
  });

  it('idx = pelaajan indeksi joukkuelistassa (kortin avaus)', () => {
    const out = _vpTapahtumaRivit(pelaajat, cache, '2026-06-01', 'pikakirjaus');
    expect(out.find(o => o.pid === 'p1').idx).toBe(0);
    expect(out.find(o => o.pid === 'p2').idx).toBe(1);
  });

  it('lahde-disambiguaattori: match myös protokollaan; tyhjä lahde → vain pvm', () => {
    expect(_vpTapahtumaRivit(pelaajat, cache, '2026-03-01', 'hh_laaja').map(o => o.pid)).toEqual(['p2']);
    expect(_vpTapahtumaRivit(pelaajat, cache, '2026-06-01', '').map(o => o.pid)).toEqual(['p1', 'p2']);   // tyhjä → pvm-match
  });

  it('tyhjä cache / ei osallistujia → []', () => {
    expect(_vpTapahtumaRivit(pelaajat, {}, '2026-06-01', 'pikakirjaus')).toEqual([]);
    expect(_vpTapahtumaRivit([], cache, '2026-06-01', '')).toEqual([]);
  });
});
