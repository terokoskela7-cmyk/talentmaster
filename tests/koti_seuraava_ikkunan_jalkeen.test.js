/* PR A · Kodin "seuraava tapahtuma" ei katoa kun se on ikkunan (−2…+6 vk) jälkeen (talvitauko): erillinen kysely, 1–2 lukua; ikkunan tapahtumat ennallaan. */
import { describe, it, expect } from 'vitest';
import { readFileSync } from 'fs'; import vm from 'vm'; import { createRequire } from 'module';
const require = createRequire(import.meta.url), MA = readFileSync(new URL('../TalentMaster_Master_v16.html', import.meta.url), 'utf8');
const KOTI = require('../lib/tm_valmentaja_koti.js'), LATAUS = require('../lib/tm_kalenteri_lataus.js');
function pura(t) { const i = MA.indexOf(t); expect(i, t).toBeGreaterThan(-1); let d = 0; for (let k = MA.indexOf('{', i); k < MA.length; k++) { if (MA[k] === '{') d++; else if (MA[k] === '}') { d--; if (!d) return MA.slice(i, k + 1); } } throw new Error('sulkeet'); }
const NYT = Date.parse('2026-12-10T12:00:00+02:00'), VK = 7 * 864e5, ts = (ms) => ({ _ms: ms, toMillis: () => ms, toDate: () => new Date(ms) });
function ymp(dokit) {   // dokit: [{id, ms, joukkue_nimi?, tila?}] kalenteri-kokoelmassa
  const lokit = [], sorted = dokit.slice().sort((a, b) => a.ms - b.ms);
  const kysely = (alku, jalkeen) => ({ orderBy: () => kysely(alku, jalkeen), startAfter: (d) => kysely(alku, d), limit: (n) => ({ get: async () => { lokit.push(n); const l = sorted.filter((d) => d.ms >= alku && (!jalkeen || d.ms > jalkeen.ms)).slice(0, n); return { docs: l.map((d) => Object.assign({}, d, { data: () => ({ alkaa: ts(d.ms), paattyy: ts(d.ms + 36e5), joukkue_nimi: d.joukkue_nimi, tila: d.tila || 'suunniteltu', nimi: d.id }) })) }; } }) });
  const c = { _seuraId: 'demo', _demo: false, _joukkue: 'Demo U13', _kalLadattu: LATAUS.tmLatausIkkuna({ nyt: NYT }), console, Date, Math, Promise, tmPaivaIso: (d) => new Date(d.getTime() + 2 * 36e5).toISOString().slice(0, 10), renderKotiV2() { c.renders = (c.renders || 0) + 1; },
    firebase: { firestore: { Timestamp: { fromMillis: (m) => ts(m) } } }, window: { TM_KALENTERI_LATAUS: LATAUS },
    _db: { collection: () => ({ doc: () => ({ collection: () => ({ where: (f, op, t) => kysely(t._ms) }) }) }) },
    _kalNormalisoi: (d) => { const x = d.data(); return Object.assign({ id: d.id }, x, { _alkaaMs: x.alkaa._ms, pvm: new Date(x.alkaa._ms).toISOString().slice(0, 10), joukkue: x.joukkue_nimi || '' }); },
    _kalSuodata: async (l) => l.filter((t) => !t.joukkue || t.joukkue === 'Demo U13'), lokit };
  vm.createContext(c); vm.runInContext([pura('function _kotiMyohempiAvain('), pura('async function _kotiHaeMyohempi(')].join('\n') + '\nvar _kotiMyohempi = { avain: null, lista: [] };', c); return c;
}
describe('Koti: seuraava ikkunan jälkeen', () => {
  it('+10 vk päässä oleva (oma joukkue) löytyy 1 kyselyllä; toisen joukkueen aiempi ohitetaan → 2. kierros; kysely alkaa ikkunan lopusta', async () => {
    const e = ymp([{ id: 'muu', ms: NYT + 9 * VK, joukkue_nimi: 'Demo U15' }, { id: 'a', ms: NYT + 10 * VK, joukkue_nimi: 'Demo U13' }, { id: 'b', ms: NYT + 12 * VK }]);
    await vm.runInContext('_kotiHaeMyohempi(' + NYT + ')', e);
    const l = vm.runInContext('_kotiMyohempi.lista', e); expect(l.map((x) => x.id)).toEqual(['a']); expect(e.lokit.length).toBeLessThanOrEqual(2); expect(e.renders).toBe(1);
  });
  it('sama avain → ei uutta hakua (ei looppia); peruttu ohitetaan; ei löydy → tyhjä, ei renderiä', async () => {
    const e = ymp([{ id: 'p', ms: NYT + 10 * VK, tila: 'peruttu' }]); await vm.runInContext('_kotiHaeMyohempi(' + NYT + ')', e); const n = e.lokit.length; await vm.runInContext('_kotiHaeMyohempi(' + NYT + ')', e);
    expect(e.lokit.length).toBe(n); expect(vm.runInContext('_kotiMyohempi.lista', e)).toEqual([]); expect(e.renders || 0).toBe(0);
  });
  it('malli: lisätty +10 vk tapahtuma on Kodin seuraava; ikkunan tapahtumat ennallaan (ikkunan oma seuraava voittaa)', () => {
    const ma = (id, ms) => ({ id, tyyppi: 'harjoitus', nimi: id, joukkue: 'Demo U13', joukkue_nimi: 'Demo U13', pvm: new Date(ms).toISOString().slice(0, 10), alkaa: '17:00', paattyy: '18:00', _alkaaMs: ms, _paattyyMs: ms + 36e5, tila: 'suunniteltu', poistettu: false });
    const k = (t) => KOTI.tmKotiMalli({ tapahtumat: t, nyt: NYT, joukkue: { nimi: 'Demo U13' }, pelaajat: [{ id: 'p1', nimi: 'A B' }], kirjaukset: [], viestit: [] });
    const kaukainen = ma('talvi', NYT + 10 * VK), ikkuna = ma('ikk', NYT + 2 * 864e5);
    expect(k([]).seuraava).toBeNull(); expect(k([kaukainen]).seuraava.id).toBe('talvi');
    expect(k([ikkuna, kaukainen]).seuraava.id).toBe('ikk'); expect(JSON.stringify(k([ikkuna]).viikko)).toBe(JSON.stringify(k([ikkuna, kaukainen]).viikko));
  });
  it('renderKotiV2 kutsuu hakua vain kun seuraavaa ei ole ja yhdistää löydön malliin', () => {
    const r = pura('function renderKotiV2('); expect(r).toMatch(/if \(!m\.seuraava\) _kotiHaeMyohempi\(Date\.now\(\)\)/); expect(r).toMatch(/concat\(_kotiMyohempi\.avain === _kotiMyohempiAvain\(\) \? _kotiMyohempi\.lista : \[\]\)/);
  });
});
