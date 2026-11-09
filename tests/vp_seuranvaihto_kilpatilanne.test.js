/**
 * Projekti 03 — VP:n seuranvaihdon kilpatilanne (juurisyy: lataaKaikki:n awaitit sijoittivat tuloksensa globaaleihin ja kirjoitukset
 * lukivat _seuraId:n kirjoitushetkellä → vanha lataus täytti uuden seuran listat ja generointi kirjoitti toisen seuran pelaajista johdetut
 * ehdotukset uuteen seuraan). Korjaus: sukupolvitunniste + seura latauksen alusta + kirjoitukset sidottu lataukseen (_pelaajatSeura …).
 * Ajetaan VP:n oikeilla funktioilla vm-sandboxissa (ei pelkkä regex), hallituilla Promise-porteilla.
 */
import { describe, it, expect } from 'vitest';
import { readFileSync } from 'fs';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';
import vm from 'vm';

const juuri = join(dirname(fileURLToPath(import.meta.url)), '..');
const VP = readFileSync(join(juuri, 'TalentMaster_VP_v25.html'), 'utf8');
function pura(tunniste) {
  const i = VP.indexOf(tunniste); if (i < 0) throw new Error('ei löydy: ' + tunniste);
  let syv = 0;
  for (let k = VP.indexOf('{', i); k < VP.length; k++) { if (VP[k] === '{') syv++; else if (VP[k] === '}') { syv--; if (!syv) return VP.slice(i, k + 1); } }
  throw new Error('sulkeet');
}
const ovi = () => { let auki; const p = new Promise((r) => { auki = r; }); return { p, auki }; };

/* Fake Firestore: jokainen get() odottaa porttia (seura+kokoelma), kirjoitukset kirjataan. */
function ymparisto() {
  const portit = {}, kirjoitukset = [], toastit = [];
  const portti = (avain) => (portit[avain] = portit[avain] || ovi());
  const data = {
    'A/pelaajat': [{ id: 'pa1', etunimi: 'AA', sukunimi: 'A', joukkue: 'A U13' }],
    'B/pelaajat': [{ id: 'pb1', etunimi: 'BB', sukunimi: 'B', joukkue: 'B U13' }],
    'A/toimenpiteet': [], 'B/toimenpiteet': [],
  };
  const snap = (rivit) => ({ docs: rivit.map((r) => ({ id: r.id || 'x', data: () => r })) });
  const db = {
    collection: (c) => ({ doc: (seura) => ({ collection: (k) => ({
      get: async () => { const avain = seura + '/' + k; await portti(avain).p; return snap(data[avain] || []); },
      where: () => ({ limit: () => ({ get: async () => { const avain = seura + '/' + k; await portti(avain).p; return snap(data[avain] || []); } }) }),
      doc: (id) => ({ set: async (d) => { kirjoitukset.push({ seura, k, id: id || 'auto', op: 'set', d }); }, update: async (d) => { kirjoitukset.push({ seura, k, id, op: 'update', d }); } }),
    }) }) }),
  };
  const c = {
    db, console: { warn() {}, log() {} }, toast: (m, t) => toastit.push([m, t]), vpT: (s) => s,
    window: { TM_SISAINEN: { tmSisainenLataaJaYhdista: async (_db, _s, p) => p, tmTerveysLukuOpts: () => ({}) }, TM_KOTI_LUVUT: { ehdotusEste: () => ({}), ehdotusEstetty: () => false } },
    normalisioiJoukkue: (x) => x, tmPhvKoodi: () => null, tmPhvIlmoitettuPH: () => false, tmPhvEiMitattu: () => false,
    _vpJasenyydet() {}, _ktKaynnista: undefined, _isDemoMode: false, _seuraId: 'A', _uid: 'u',
    _pJNimet: (p) => [p.joukkue], _tpTuoreToken: async () => ({ uid: 'u' }), renderToimenpiteet() {}, _vpKehAskelReRender() {},
    document: { getElementById: () => ({ innerHTML: '' }) }, firebase: { firestore: { FieldValue: { serverTimestamp: () => 'ts' } }, auth: () => ({ currentUser: { getIdToken: async () => 't' } }) },
    TP_SIGNAALIT: [{ id: 's', tarkista: (j) => ({ joukkue: j, signaali: 's', teksti: j + ' teksti' }) }],
    lataaAvoimetToimenpiteet: undefined,
  };
  vm.createContext(c);
  vm.runInContext([
    'var _vpLatausSukupolvi = 0; var _pelaajatSeura = null, _toimenpiteetSeura = null; var _pelaajat = []; var _toimenpiteet = [];',
    pura('function _vpLatausVanhentunut('), pura('function _vpKirjoitusEstetty('), pura('async function lataaPelaajat('),
    pura('async function lataaAvoimetToimenpiteet('),
    pura('async function _alustaToimenpiteet('), pura('async function _vpTtKirjoita('),
  ].join('\n'), c);
  return { c, portti, kirjoitukset, toastit };
}
const uusiLataus = (c) => vm.runInContext('++_vpLatausSukupolvi', c);
const aseta = (c, seura) => { c._seuraId = seura; };   // _seuraId on sandboxin globaali (kuten VP:ssä)
const tyhjenna = tick => new Promise((r) => setTimeout(r, 0));

describe('VP seuranvaihto kesken latauksen', () => {
  it('vanha lataus valmistuu vaihdon jälkeen: ei vanhaa dataa uuteen seuraan eikä kirjoituksia', async () => {
    const t = ymparisto(), { c } = t;
    uusiLataus(c);                           // lataaKaikki(A)
    const vanha = c.lataaPelaajat();         // A:n luku jää odottamaan
    await tyhjenna();
    aseta(c, 'B'); uusiLataus(c);            // SA vaihtaa B:hen (superAdminVaihdaSeura bumppaa tunnisteen)
    vm.runInContext('_pelaajat = []; _pelaajatSeura = null;', c);
    const uusi = c.lataaPelaajat();
    t.portti('B/pelaajat').auki(); await uusi;
    t.portti('A/pelaajat').auki(); await vanha;   // vanha valmistuu VAIHDON JÄLKEEN
    expect(vm.runInContext('_pelaajat.map(p => p.id)', c)).toEqual(['pb1']);   // vain B
    expect(vm.runInContext('_pelaajatSeura', c)).toBe('B');
    expect(t.kirjoitukset).toEqual([]);
  });
  it('toimenpiteiden lataus: seura vaihtuu haun aikana → tulosta ei sijoiteta (ei vanhan seuran ehdotuksia uuden näkymään), ei kirjoituksia', async () => {
    const t = ymparisto(), { c } = t;
    uusiLataus(c);
    await (async () => { const l = c.lataaPelaajat(); t.portti('A/pelaajat').auki(); await l; })();
    const ajo = c._alustaToimenpiteet();     // A: lataaAvoimet odottaa A/toimenpiteet
    await tyhjenna();
    aseta(c, 'B'); uusiLataus(c);            // vaihto kesken latauksen
    t.portti('A/toimenpiteet').auki(); await ajo;
    expect(t.kirjoitukset).toEqual([]);
    expect(vm.runInContext('_toimenpiteetSeura', c)).toBe(null);
    expect(vm.runInContext('_toimenpiteet.length', c)).toBe(0);
  });
});

describe('VP normaali lataus ilman vaihtoa', () => {
  it('pelaajat sijoittuvat ja toimenpiteet ladataan oikeaan seuraan; VP vain lukee (PR C: ei generointia, ei kirjoituksia avauksessa)', async () => {
    const t = ymparisto(), { c } = t;
    uusiLataus(c);
    const l = c.lataaPelaajat(); t.portti('A/pelaajat').auki(); await l;
    expect(vm.runInContext('_pelaajat.map(p => p.id)', c)).toEqual(['pa1']);
    expect(vm.runInContext('_pelaajatSeura', c)).toBe('A');
    t.portti('A/toimenpiteet').auki();
    await c._alustaToimenpiteet();
    expect(t.kirjoitukset).toEqual([]);   // PR C: avaus ei kirjoita mitään
    expect(vm.runInContext('_toimenpiteetSeura', c)).toBe('A');
  });
});

describe('VP pelaajakirjoitus vaihdon jälkeen', () => {
  it('estyy näkyvällä virheellä; ei kirjoiteta väärään seuraan', async () => {
    const t = ymparisto(), { c } = t;
    uusiLataus(c);
    const l = c.lataaPelaajat(); t.portti('A/pelaajat').auki(); await l;   // pid 'pa1' kuuluu A:han
    aseta(c, 'B');                                                          // vaihto, B:n lataus ei ole vielä valmis
    await c._vpTtKirjoita('pa1', { x: 1 }, 'Tallennettu');
    expect(t.kirjoitukset).toEqual([]);
    expect(t.toastit.some((x) => x[1] === 'virhe')).toBe(true);
  });
  it('ilman vaihtoa kirjoitus menee latauksen seuraan', async () => {
    const t = ymparisto(), { c } = t;
    uusiLataus(c);
    const l = c.lataaPelaajat(); t.portti('A/pelaajat').auki(); await l;
    await c._vpTtKirjoita('pa1', { x: 1 }, 'Tallennettu');
    expect(t.kirjoitukset).toEqual([{ seura: 'A', k: 'pelaajat', id: 'pa1', op: 'set', d: { x: 1 } }]);
  });
});

describe('Kirjoituskohdat on sidottu lataukseen (staattinen)', () => {
  it.each([
    ['rosterin jako', "var onnistui = 0, epaonnistui = 0, viimVirhe = '';"],
    ['pulssikuittaus', 'window._vpPulssiKuittaa = async function'], ['seurantakuittaus', 'window.vpKuittaaHalytys = async function'],
    ['viesti luettu', 'window._vpViestiAvaa = async function'], ['toimenpide kuittaa', 'window._kuittaaToimenpide = async function'],
    ['toimenpide hylkää', 'window._hylkaaToimenpide = async function'],
  ])('%s ei lue _seuraId:tä kirjoitushetkellä', (_n, alku) => {
    const i = VP.indexOf(alku); expect(i).toBeGreaterThan(-1);
    const ikkuna = VP.slice(i, i + 2600);
    const kirj = ikkuna.match(/collection\('seurat'\)\.doc\((_seuraId|_seura)\)[^;]*?\.(set|update|add)\(|batch\.update\(db\.collection\('seurat'\)\.doc\((_seuraId|_seura)\)/g) || [];
    expect(kirj.length, _n).toBeGreaterThan(0);
    kirj.forEach((k) => expect(k, _n).not.toContain('doc(_seuraId)'));
  });
});

describe('_vpJfKirjoita (sisainen-kirjoitus)', () => {
  it('käyttää latauksen seuraa, ei _seuraId:tä', () => {
    const f = pura('async function _vpJfKirjoita(');
    expect(f).toContain('_pelaajatSeura');
    expect(f).not.toMatch(/db, _seuraId,/);
  });
});
