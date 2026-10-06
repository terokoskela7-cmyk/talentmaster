/**
 * Korjaus-PR 1 (VP-periaate 5.10.2026, auditointi UI-1…UI-4): VP/UTJ/talenttivalmentaja näkevät koko seuran Masterissa, vaikka heidän kayttajat-dokissaan on joukkue.
 * Aidot Master_v16-funktiot puretaan lähteestä ja ajetaan vm:ssä Firestore-tynkää vasten. Fixture: KPV U13 -testipelaaja (m93GBdOaGCUuenMiCL0I) + KPV U15 -pelaajia.
 */
import { describe, it, expect } from 'vitest';
import { readFileSync } from 'fs';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';
import vm from 'vm';

const juuri = join(dirname(fileURLToPath(import.meta.url)), '..');
const MA = readFileSync(join(juuri, 'TalentMaster_Master_v16.html'), 'utf8');
function pura(t) {
  const i = MA.indexOf(t); expect(i, t).toBeGreaterThan(-1); let d = 0;
  for (let k = MA.indexOf('{', i); k < MA.length; k++) { if (MA[k] === '{') d++; else if (MA[k] === '}') { d--; if (!d) return MA.slice(i, k + 1); } }
  throw new Error('sulkeet');
}
const TOPIAS = 'm93GBdOaGCUuenMiCL0I';
const PELAAJAT = { [TOPIAS]: { etunimi: 'Topias', sukunimi: 'K.', joukkue: 'KPV U13', joukkueet: ['kpv_u13'] }, p2: { etunimi: 'Aino', sukunimi: 'L.', joukkue: 'KPV U13', joukkueet: ['kpv_u13'] },
  p3: { etunimi: 'Eero', sukunimi: 'M.', joukkue: 'KPV U15', joukkueet: ['kpv_u15'] }, p4: { etunimi: 'Oona', sukunimi: 'N.', joukkue: 'KPV U17', joukkueet: ['kpv_u17'] } };

function db(log) {
  const snap = (ids) => ({ docs: ids.map((id) => ({ id, data: () => PELAAJAT[id] })) });
  const col = { get: async () => { log.push('get-kaikki'); return snap(Object.keys(PELAAJAT)); },
    where: (k, op, v) => ({ get: async () => { log.push('where:' + k + ':' + v); return snap(Object.keys(PELAAJAT).filter((id) => k === 'joukkue' ? PELAAJAT[id].joukkue === v : (PELAAJAT[id].joukkueet || []).includes(v))); } }) };
  return { collection: () => ({ doc: () => ({ collection: () => col }) }) };
}
function ymp({ rooli = 'vp', claimRooli, superAdmin = false, joukkue = 'KPV U13', tallennettu = {} } = {}) {
  const log = [], tallennukset = {}, valitsimet = [];
  const sel = { id: '', style: {}, children: [], appendChild(o) { this.children.push(o); }, setAttribute() {}, insertAdjacentElement() {}, remove() {} };
  const c = { _db: db(log), _seuraId: 'kpv', _demo: false, _joukkue: joukkue, _rooli: rooli, _superAdmin: superAdmin, _pelaajatData: [], _kirjaukset: [], _kirjauksetLadattu: false,
    window: { _tmClaimRooli: claimRooli, _valmentajaData: { joukkueet: ['kpv_u13'], joukkue: 'KPV U13' } }, console: { warn() {} }, Promise, Map, Set, Array, Object, String,
    localStorage: { getItem: (k) => (k in tallennettu ? tallennettu[k] : null), setItem: (k, v) => { tallennukset[k] = v; }, removeItem: (k) => { tallennukset[k] = null; } },
    normalisioiJoukkue: (x) => String(x).trim().toUpperCase().replace(/_/g, ' '), masterT: (x) => x,
    document: { getElementById: (id) => (id === 'sbSeura' ? { textContent: 'KPV' } : null), createElement: () => Object.assign({}, sel, { children: [] }), querySelector: () => ({ insertBefore(e) { valitsimet.push(e); } }) },
    _mOnOffline: () => false, lataaKonseptikerros: async () => {}, _mVerkkoIlmoitus() {}, _mOnVerkkovirhe: () => false, tmPhvIlmoitettuPH: () => false, tmPhvEiMitattu: () => false, tmPhvKoodi: () => null,
    _paivitaKaikkiNakymat() {}, _lataaKirjaukset() {}, _kuunteleVpViestit() {}, _lataaTestitapahtumat: async () => {}, _lataaKalenteriTapahtumat: async () => {} };
  vm.createContext(c);
  vm.runInContext([pura('function _mSeuranLaajuusRooli('), pura('async function _lataaPelaajat('), pura('async function _rakennaSAJoukkueValitsin('), pura('function _mKaavioJoukkueId('), pura('function _mKaavioJoukkueet(')].join(';\n') + ';', c);
  return { c, log, tallennukset, valitsimet };
}

describe('_mSeuranLaajuusRooli — joukkuerajaus ei koske johtoa/talenttivalmentajaa', () => {
  it('vp / urheilutoimenjohtaja / talenttivalmentaja → true; valmentaja, fysio, testivastaava, seurasihteeri → false', () => {
    ['vp', 'urheilutoimenjohtaja', 'talenttivalmentaja'].forEach((r) => expect(ymp({ rooli: r }).c._mSeuranLaajuusRooli(), r).toBe(true));
    ['valmentaja', 'fysiikkavalmentaja', 'fysioterapeutti', 'testivastaava', 'seurasihteeri', '', null].forEach((r) => expect(ymp({ rooli: r }).c._mSeuranLaajuusRooli(), String(r)).toBe(false));
  });
  it('CLAIMIN rooli voittaa dokin (Rules lukee claimista): doc "vp" mutta claim "valmentaja" → false; doc "valmentaja" + claim "vp" → true', () => {
    expect(ymp({ rooli: 'vp', claimRooli: 'valmentaja' }).c._mSeuranLaajuusRooli()).toBe(false); expect(ymp({ rooli: 'valmentaja', claimRooli: 'vp' }).c._mSeuranLaajuusRooli()).toBe(true);
  });
});

describe('UI-1 · Masterin pelaajalataus', () => {
  it('VP, jonka kayttajat-dokissa on joukkue: valitsin asettaa oletukseksi "Kaikki joukkueet" (_joukkue null) → lataus hakee KOKO seuran (1 kysely ilman where), 4 pelaajaa', async () => {
    const e = ymp({ rooli: 'vp', joukkue: 'KPV U13' });
    await e.c._rakennaSAJoukkueValitsin('kpv', { oletusKaikki: true, avain: 'tm-vp-joukkue' });
    expect(e.c._joukkue).toBeNull();
    e.log.length = 0; await e.c._lataaPelaajat();
    expect(e.log).toEqual(['get-kaikki']); expect(e.c._pelaajatData.length).toBe(4);
    expect(e.c._pelaajatData.map((p) => p.joukkue).sort()).toEqual(['KPV U13', 'KPV U13', 'KPV U15', 'KPV U17']);
  });
  it('REGRESSIO-vertailu: tavallinen valmentaja (joukkue "KPV U13") lataa EDELLEEN vain oman joukkueensa (where-kyselyt)', async () => {
    const e = ymp({ rooli: 'valmentaja', joukkue: 'KPV U13' });
    await e.c._lataaPelaajat();
    expect(e.log.some((l) => l.startsWith('where:joukkue:KPV U13'))).toBe(true); expect(e.log).not.toContain('get-kaikki');
    expect(e.c._pelaajatData.map((p) => p.id).sort()).toEqual(['p2', TOPIAS].sort()); expect(e.c._pelaajatData.length).toBe(2);
  });
  it('valitsin: tallennettu valinta (tm-vp-joukkue) palautuu; ilman tallennusta oletus = Kaikki; SA-käytös ennallaan (ilman opts → ensimmäinen joukkue, avain tm-sa-joukkue)', async () => {
    const a = ymp({ tallennettu: { 'tm-vp-joukkue': 'KPV U15' } }); await a.c._rakennaSAJoukkueValitsin('kpv', { oletusKaikki: true, avain: 'tm-vp-joukkue' }); expect(a.c._joukkue).toBe('KPV U15');
    const b = ymp({ tallennettu: { 'tm-sa-joukkue': 'KPV U15' } }); await b.c._rakennaSAJoukkueValitsin('kpv', { oletusKaikki: true, avain: 'tm-vp-joukkue' }); expect(b.c._joukkue, 'SA:n tallennus ei vuoda VP:lle').toBeNull();
    const sa = ymp({ superAdmin: true }); await sa.c._rakennaSAJoukkueValitsin('kpv'); expect(sa.c._joukkue).toBe('KPV U13');
    const sa2 = ymp({ superAdmin: true, tallennettu: { 'tm-sa-joukkue': 'KPV U17' } }); await sa2.c._rakennaSAJoukkueValitsin('kpv'); expect(sa2.c._joukkue).toBe('KPV U17');
  });
  it('valitsimen valinta tallentuu VP:n omaan avaimeen (ei SA:n) ja lataa uudelleen; "Kaikki" poistaa tallennuksen', async () => {
    const e = ymp({ rooli: 'vp' }); await e.c._rakennaSAJoukkueValitsin('kpv', { oletusKaikki: true, avain: 'tm-vp-joukkue' });
    const sel = e.valitsimet[0]; expect(sel.children.length).toBe(4);   // Kaikki + 3 joukkuetta
    expect(sel.children.map((o) => o.value)).toEqual(['', 'KPV U13', 'KPV U15', 'KPV U17']);
    await sel.onchange.call({ value: 'KPV U17' }); expect(e.tallennukset['tm-vp-joukkue']).toBe('KPV U17'); expect('tm-sa-joukkue' in e.tallennukset).toBe(false); expect(e.c._pelaajatData.length).toBe(1);
    await sel.onchange.call({ value: '' }); expect(e.tallennukset['tm-vp-joukkue']).toBeNull(); expect(e.c._pelaajatData.length).toBe(4);
  });
});

describe('UI-2/UI-4 · joukkuevalitsin VP:lle; joukkuesuodatus ei rajaa kun "Kaikki"', () => {
  it('"Valitse joukkue ensin" -esto ja _joukkueTunniste ovat ennallaan, mutta VP:llä on nyt valitsin jolla joukkueen voi valita (valitsimessa kaikki seuran joukkueet)', () => {
    expect(MA).toMatch(/if \(_mSeuranLaajuusRooli\(\)\) await _rakennaSAJoukkueValitsin\(_seuraId, \{ oletusKaikki: true, avain: 'tm-vp-joukkue' \}\);\s*else _rakennaValmentajaJoukkueValitsin\(\);/);
    expect(MA).toMatch(/if \(_mSeuranLaajuusRooli\(\)\) \{ _joukkue = ''; await _rakennaSAJoukkueValitsin\(_seuraId, \{ oletusKaikki: true, avain: 'tm-vp-joukkue' \}\); \}/);   // ilman kayttajat-dokkia
  });
  it('testitapahtumien ja kalenterin suodatus: _joukkue null → kaikki joukkueet näkyvät (ennallaan olevat lausekkeet !_joukkue || …)', () => {
    expect(pura('async function _lataaTestitapahtumat(')).toMatch(/\(!_joukkue \|\| /);
    const e = ymp({ rooli: 'vp' }); const suodata = (jk, _joukkue) => (!_joukkue || (!jk && true) || jk === _joukkue);
    expect(['KPV U13', 'KPV U15', 'KPV U17'].every((j) => suodata(j, null))).toBe(true); expect(suodata('KPV U15', 'KPV U13')).toBe(false); expect(e.c._joukkue).toBe('KPV U13');
  });
});

describe('UI-3 · taktiikkataulun kohdistuslista', () => {
  it('VP: KAIKKI seuran joukkueet (ladatuista pelaajista, nimi + id) — ei vain oma', async () => {
    const e = ymp({ rooli: 'vp' }); await e.c._rakennaSAJoukkueValitsin('kpv', { oletusKaikki: true, avain: 'tm-vp-joukkue' }); await e.c._lataaPelaajat();
    expect(e.c._mKaavioJoukkueet()).toEqual([{ id: 'kpv_u13', nimi: 'KPV U13' }, { id: 'kpv_u15', nimi: 'KPV U15' }, { id: 'kpv_u17', nimi: 'KPV U17' }]);
  });
  it('talenttivalmentaja ja SA: sama; tavallinen valmentaja: vain oma (kayttajat.joukkueet) — ennallaan; VP ilman ladattuja pelaajia → varapolku (oma lista)', async () => {
    for (const o of [{ rooli: 'talenttivalmentaja' }, { rooli: 'valmentaja', superAdmin: true }]) { const e = ymp(o); await e.c._rakennaSAJoukkueValitsin('kpv', { oletusKaikki: true }); await e.c._lataaPelaajat(); expect(e.c._mKaavioJoukkueet().length, JSON.stringify(o)).toBe(3); }
    const v = ymp({ rooli: 'valmentaja', joukkue: 'KPV U13' }); await v.c._lataaPelaajat(); expect(v.c._mKaavioJoukkueet()).toEqual([{ id: 'kpv_u13', nimi: 'KPV U13' }]);
    const tyhja = ymp({ rooli: 'vp', joukkue: 'KPV U13' }); expect(tyhja.c._mKaavioJoukkueet()).toEqual([{ id: 'kpv_u13', nimi: 'KPV U13' }]);
  });
});
