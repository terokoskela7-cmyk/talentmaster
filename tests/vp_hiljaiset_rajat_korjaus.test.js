/**
 * Projekti 06 · hiljaiset rajat (PM 9.11.2026): VP:n kyselyt, jotka leikkasivat listan hiljaa, ajettuna vm-sandboxissa AIDOLLA koodilla.
 *  · avoimet ehdotukset: EI limit()iä (Sibbo 73 > 50 pudotti uusimpia); lajittelu ennen näyttöä (uusin ensin)
 *  · valmentajan mentorointihistoria: where valmentajaId + orderBy aika desc + limit(10) PALVELINPUOLELLA (ei koko seuran uusimpia clientissa)
 *  · valmentajaprofiili (laskeVAI): mentoroinnit where valmentajaId + aika >= min(kauden alku, 30 pv) — ei limit()iä, ei koko seuran listaa
 * Indeksi valmentajaId ASC + aika DESC (firestore.indexes.json) kattaa molemmat mentorointikyselyt.
 */
import { describe, it, expect } from 'vitest';
import vm from 'node:vm';
import { readFileSync } from 'fs';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

const juuri = join(dirname(fileURLToPath(import.meta.url)), '..');
const VP = readFileSync(join(juuri, 'TalentMaster_VP_v25.html'), 'utf8');
const INDEKSIT = JSON.parse(readFileSync(join(juuri, 'firestore.indexes.json'), 'utf8'));

function funktio(nimi) {
  const i = VP.indexOf(nimi);
  expect(i, nimi + ' puuttuu VP:stä').toBeGreaterThan(-1);
  let syv = 0, loppu = -1;
  for (let k = VP.indexOf('{', VP.indexOf(')', i)); k < VP.length; k++) {
    if (VP[k] === '{') syv++;
    else if (VP[k] === '}') { syv--; if (syv === 0) { loppu = k + 1; break; } }
  }
  return VP.slice(i, loppu);
}

/** Tallentava db: jokainen ketju kirjataan riviksi "kokoelma|where a == b|orderBy x desc|limit n|get". */
function teeDb(docsPerKokoelma) {
  const lokit = [];
  const kokoelma = (nimi) => {
    const osat = [nimi];
    const api = {
      where(k, op, v) { osat.push('where ' + k + ' ' + op + ' ' + (v && v.ms != null ? 'ts:' + v.ms : v)); return api; },
      orderBy(k, d) { osat.push('orderBy ' + k + ' ' + (d || 'asc')); return api; },
      limit(n) { osat.push('limit ' + n); return api; },
      async get() { lokit.push(osat.join('|')); return { docs: (docsPerKokoelma[nimi] || []).map((d) => ({ id: d.id, data: () => d })) }; },
      doc: () => ({ get: async () => ({ exists: false, data: () => ({}) }), collection: kokoelma }),
    };
    return api;
  };
  return { db: { collection: () => ({ doc: () => ({ collection: kokoelma }) }) }, lokit };
}

describe('avoimet ehdotukset (lataaAvoimetToimenpiteet)', () => {
  it('ei limit()iä; kaikki 73 palautuu uusin ensin', async () => {
    const rivit = Array.from({ length: 73 }, (_, i) => ({ id: 'e' + i, tila: 'ehdotus', luotu: { seconds: 1000 + i } }));
    const { db, lokit } = teeDb({ toimenpiteet: rivit });
    const ctx = vm.createContext({ db, Promise });
    vm.runInContext(funktio('async function lataaAvoimetToimenpiteet('), ctx);
    const r = await vm.runInContext('lataaAvoimetToimenpiteet("sibbo")', ctx);
    expect(lokit).toEqual(['toimenpiteet|where tila == ehdotus']);
    expect(r.length).toBe(73);
    expect(r[0].id).toBe('e72'); expect(r[72].id).toBe('e0');   // lajittelu ennen näyttöä
  });
});

describe('valmentajan mentorointihistoria (_lataaCoachHistoria)', () => {
  it('palvelinpuolen suodatus: where valmentajaId + orderBy aika desc + limit 10; ei clientin suodatusta', async () => {
    const m = Array.from({ length: 10 }, (_, i) => ({ id: 'm' + i, valmentajaId: 'c1', teksti: 't' + i, aika: null }));
    const { db, lokit } = teeDb({ mentoroinnit: m });
    const el = { innerHTML: '' };
    const ctx = vm.createContext({ db, _seuraId: 's', Promise, document: { getElementById: () => el }, vpT: (s) => s, console, _jsvEsc: (s) => s, esc: (s) => s });
    vm.runInContext(funktio('async function _lataaCoachHistoria('), ctx);
    await vm.runInContext('_lataaCoachHistoria("c1")', ctx);
    expect(lokit).toEqual(['mentoroinnit|where valmentajaId == c1|orderBy aika desc|limit 10']);
    expect(el.innerHTML).toContain('t0'); expect(el.innerHTML).toContain('t9');   // kaikki palvelimen palauttamat rivit näytetään
  });
});

describe('valmentajaprofiili (laskeVAI) — mentoroinnit', () => {
  it('where valmentajaId + aika >= min(kausi, 30 pv) + orderBy aika desc; ei limit()iä', async () => {
    const { db, lokit } = teeDb({ mentoroinnit: [{ id: 'a', valmentajaId: 'c1', aika: new Date() }] });
    const ctx = vm.createContext({ console, Date, Math, JSON, String, Number, Object, Array, Promise, isNaN, parseInt, parseFloat, db, _seuraId: 's', _valmentajat: [{ id: 'c1' }], _pelaajat: [],
      vpT: (s) => s, firebase: { firestore: { Timestamp: { fromMillis: (ms) => ({ ms }) } } }, laskeHarjoituslaatuPalloliitto: () => ({ ka_0_10: 8 }) });
    ctx.window = ctx;
    ['function _vpKaudenAlku()', 'function _vpAikaMs(', 'async function laskeVAI(', 'function _vpAikaSitten('].forEach((f) => vm.runInContext(funktio(f), ctx));
    const tulos = await vm.runInContext('laskeVAI("c1")', ctx);
    expect(tulos, 'laskeVAI palautti null').toBeTruthy();
    const q = lokit.filter((l) => l.startsWith('mentoroinnit'));
    expect(q.length).toBe(1);
    expect(q[0]).toMatch(/^mentoroinnit\|where valmentajaId == c1\|where aika >= ts:\d+\|orderBy aika desc$/);
    expect(q[0]).not.toMatch(/limit/);
    const ms = Number(q[0].match(/ts:(\d+)/)[1]);
    expect(ms).toBeLessThanOrEqual(Date.now() - 30 * 86400000 + 5000);   // alaraja ei myöhempi kuin 30 pv sitten (min kauden alun kanssa)
  });
});

describe('indeksi', () => {
  it('firestore.indexes.json sisältää mentoroinnit: valmentajaId ASC + aika DESC (CI deployaa)', () => {
    const i = INDEKSIT.indexes.find((x) => x.collectionGroup === 'mentoroinnit' && x.queryScope === 'COLLECTION'
      && x.fields.length === 2 && x.fields[0].fieldPath === 'valmentajaId' && x.fields[0].order === 'ASCENDING' && x.fields[1].fieldPath === 'aika' && x.fields[1].order === 'DESCENDING');
    expect(i, 'yhdistelmäindeksi puuttuu').toBeTruthy();
  });
  it('lähdekoodissa ei enää limit()iä näillä poluilla', () => {
    expect(funktio('async function lataaAvoimetToimenpiteet(')).not.toMatch(/\.limit\(/);
    expect(funktio('async function laskeVAI(')).not.toMatch(/mentoroinnit'\)[^\n]*\.limit\(/);
  });
});
