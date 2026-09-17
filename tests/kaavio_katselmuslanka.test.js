/**
 * TalentMaster™ — Erä E: katselmuksen palaute + kommenttilanka.
 *
 * Review-silmukka oli PUOLIKAS: hylkäys oli pelkkä tilanmuutos ilman perustelua, joten
 * valmentaja sai "hylätty" tietämättä miksi. Ilman palautetta katselmuksen valmennuksellinen
 * arvo puuttuu — propose→reject on umpikuja, ei silmukka.
 *
 *   A) HYLKÄYS EI ETENE ILMAN PERUSTELUA — ja perustelu kirjoitetaan ENNEN statusta
 *   B) LANKA — alikokoelma (ei review-taulukko), append, aikajärjestys
 *   C) §32 — kommentti on vapaatekstiä omalla kielellä, ei käännöstä
 *   D) AJO — lomake ja lanka renderöityvät ja kirjoittavat oikeat dokumentit
 */
import { describe, it, expect } from 'vitest';
import { readFileSync } from 'fs';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';
import vm from 'vm';

const __dir = dirname(fileURLToPath(import.meta.url));
const ROOT = join(__dir, '..');
const UI = readFileSync(join(ROOT, 'lib', 'tm_kaavio_ui.js'), 'utf8');
const RULES = readFileSync(join(ROOT, 'tm_admin', 'firestore.rules'), 'utf8');

const RIVIT = UI.split('\n');
const runko = (nimi) => {
  const a = RIVIT.findIndex((l) => new RegExp('^(?:async\\s+)?function ' + nimi + '\\s*\\(').test(l));
  if (a < 0) throw new Error('funktiota ei löytynyt: ' + nimi);
  for (let i = a + 1; i < RIVIT.length; i++) if (RIVIT[i] === '}') return RIVIT.slice(a, i + 1).join('\n');
  throw new Error('sulkua ei löytynyt: ' + nimi);
};

const LIBIT = ['tm_teknistaktiset.js', 'tm_konsepti_resolve.js', 'tm_kaavio_render.js',
               'tm_kaavio_policy.js', 'tm_kaavio_validate.js', 'tm_kaavio_editori.js',
               'tm_kaavio_konsepti.js', 'tm_kaavio_ui.js'];

/* Sandbox kirjaa KAIKKI kirjoitukset järjestyksessä, jotta "perustelu ennen statusta" on
   todistettavissa eikä vain luettavissa. */
function sivu({ rooli, uid, kommentit, addKaatuu }) {
  const loki = [];
  const el = (id) => ({ id, value: '', innerHTML: '', textContent: '', focus() {}, remove() { delete rekisteri[id]; } });
  const rekisteri = {};
  const kommRef = {
    orderBy: () => ({ get: async () => ({ forEach: (f) => (kommentit || []).forEach((c) => f({ id: c.id, data: () => c })) }) }),
    add: async (o) => { if (addKaatuu) { loki.push(['add:FAIL', o]); throw new Error('denied'); } loki.push(['add', o]); return { id: 'c9' }; }
  };
  const docRef = { collection: () => kommRef, update: async (o) => { loki.push(['update', o]); } };
  const db = { collection: () => ({ doc: () => ({ collection: () => ({ doc: () => docRef, add: async () => ({ id: 'x' }) }) }) }) };

  const sb = {
    console, Math, JSON, String, Number, Object, Array, Boolean, Promise, Date, RegExp, Error, isNaN,
    setTimeout, clearTimeout, parseFloat, parseInt,
    firebase: { firestore: { FieldValue: { serverTimestamp: () => 'TS' } }, auth: () => ({ currentUser: { uid: uid || 'v1' } }) },
    document: {
      getElementById: (id) => rekisteri[id] || null,
      querySelectorAll: () => [],
      body: { insertAdjacentHTML: () => {} }
    }
  };
  sb.window = {};
  vm.createContext(sb);
  LIBIT.forEach((f) => vm.runInContext(readFileSync(join(ROOT, 'lib', f), 'utf8'), sb));
  sb.window.TM_KAAVIO_HOST = {
    db, t: (fi) => fi, lang: () => 'fi', toast: (v) => loki.push(['toast', v]),
    ctx: () => ({ rooli: rooli || 'vp', uid: uid || 'v1', seuraId: 'A', joukkueet: ['u13'], superAdmin: false, anon: false }),
    valmentajat: () => [{ id: 'v1', nimi: 'Mikko Mäkinen' }, { id: 'c1', nimi: 'Sanna Salo' }]
  };
  return { sb, loki, rekisteri, el };
}
const aja = (sb, e, aw) => (aw ? vm.runInContext('(async()=>{return ' + e + '})()', sb) : vm.runInContext(e, sb));

const KAAVIO = { id: 'k1', seuraId: 'A',
  spec: { avain: 'y_h0', suunta: 'ylos', pelimuoto: '8v8', pelaajat: [{ id: 'P1', joukkue: 'oma', rooli: 'tuki', x: 50, y: 50 }] },
  review: { status: 'odottaa', nakyvyys: 'joukkue', joukkueId: 'u13', luonut: 'c1', versio: 1 } };

describe('A — hylkäys ei etene ilman perustelua', () => {
  it('tyhjä perustelu → EI kirjoitusta lainkaan (ei kommenttia eikä statusta)', async () => {
    const { sb, loki, rekisteri } = sivu({});
    aja(sb, '_kaavioTila.nakyvat = [' + JSON.stringify(KAAVIO) + ']');
    rekisteri._kvHylkaysSyy = { value: '   ', focus() {} };
    rekisteri._kvHylkaysVirhe = { textContent: '' };
    await aja(sb, "_kaavioHylkaaVahvista('seu_k1')", true);
    expect(loki.filter((r) => r[0] === 'add' || r[0] === 'update')).toEqual([]);
    expect(rekisteri._kvHylkaysVirhe.textContent).toMatch(/perustelu/i);
  });
  it('EI-VACUOUS: perustelulla sama polku kirjoittaa molemmat', async () => {
    const { sb, loki, rekisteri } = sivu({});
    aja(sb, '_kaavioTila.nakyvat = [' + JSON.stringify(KAAVIO) + ']');
    rekisteri._kvHylkaysSyy = { value: 'Liikaa pelaajia — karsi kolmeen.', focus() {} };
    rekisteri._kvHylkaysVirhe = { textContent: '' };
    await aja(sb, "_kaavioHylkaaVahvista('seu_k1')", true);
    const tyypit = loki.filter((r) => r[0] === 'add' || r[0] === 'update').map((r) => r[0]);
    expect(tyypit).toEqual(['add', 'update']);
  });
  it('PERUSTELU KIRJOITETAAN ENNEN STATUSTA — muuten jäisi juuri se umpikuja jonka erä poistaa', async () => {
    const { sb, loki, rekisteri } = sivu({});
    aja(sb, '_kaavioTila.nakyvat = [' + JSON.stringify(KAAVIO) + ']');
    rekisteri._kvHylkaysSyy = { value: 'syy', focus() {} };
    rekisteri._kvHylkaysVirhe = { textContent: '' };
    await aja(sb, "_kaavioHylkaaVahvista('seu_k1')", true);
    const add = loki.findIndex((r) => r[0] === 'add'), upd = loki.findIndex((r) => r[0] === 'update');
    expect(add).toBeGreaterThanOrEqual(0);
    expect(upd).toBeGreaterThan(add);
  });
  it('kommentin kirjoitus epäonnistuu → STATUS EI MUUTU (ei hiljaista hylkäystä)', async () => {
    const { sb, loki, rekisteri } = sivu({ addKaatuu: true });
    aja(sb, '_kaavioTila.nakyvat = [' + JSON.stringify(KAAVIO) + ']');
    rekisteri._kvHylkaysSyy = { value: 'syy', focus() {} };
    rekisteri._kvHylkaysVirhe = { textContent: '' };
    await aja(sb, "_kaavioHylkaaVahvista('seu_k1')", true);
    expect(loki.filter((r) => r[0] === 'update')).toEqual([]);
  });
  it('kirjoitettu kommentti on tyyppiä hylkays ja status hylatty', async () => {
    const { sb, loki, rekisteri } = sivu({});
    aja(sb, '_kaavioTila.nakyvat = [' + JSON.stringify(KAAVIO) + ']');
    rekisteri._kvHylkaysSyy = { value: 'Karsi kolmeen.', focus() {} };
    rekisteri._kvHylkaysVirhe = { textContent: '' };
    await aja(sb, "_kaavioHylkaaVahvista('seu_k1')", true);
    const add = loki.filter((r) => r[0] === 'add')[0][1];
    expect(add.tyyppi).toBe('hylkays');
    expect(add.teksti).toBe('Karsi kolmeen.');
    expect(add.kirjoittaja).toBe('v1');
    expect(add.aika).toBe('TS');                       // serverTimestamp, ei client-kello
    expect(loki.filter((r) => r[0] === 'update')[0][1]['review.status']).toBe('hylatty');
  });
  it('toimintopolku ei enää käytä hiljaista _kaavioSiirra(hylatty):a', () => {
    const t = runko('_kaavioToiminto');
    expect(t).toContain("_kaavioHylkaaLomake(kav)");
    expect(t).not.toMatch(/_kaavioSiirra\(k, 'hylatty'\)/);
  });
});

describe('B — lanka on alikokoelma, ei review-taulukko', () => {
  it('kirjoitus menee kaaviot/{id}/kommentit-alikokoelmaan', () => {
    expect(runko('_kaavioKommenttiRef')).toContain(".collection('kommentit')");
  });
  it('EI review.kommentit-taulukkoa missään (versiolukko-kolina, #531:n oppi)', () => {
    // kommenttirivit pois: lohkokommentti nimenomaan SELITTÄÄ miksi review.kommentit[] ei ole.
    const koodi = UI.replace(/\/\*[\s\S]*?\*\//g, '').replace(/^\s*\/\/.*$/gm, '');
    expect(koodi).not.toMatch(/review\.kommentit/);
    expect(runko('_kaavioKohdistusKentat')).not.toMatch(/kommentit/);
  });
  it('luku on aikajärjestyksessä', () => {
    expect(runko('_kaavioLataaLanka')).toContain(".orderBy('aika')");
  });
  it('lanka ladataan ja renderöityy', async () => {
    const { sb } = sivu({ kommentit: [
      { id: 'c1', teksti: 'Karsi kolmeen.', kirjoittaja: 'v1', rooli: 'vp', tyyppi: 'hylkays', aika: null },
      { id: 'c2', teksti: 'Korjattu, katso uudelleen.', kirjoittaja: 'c1', rooli: 'valmentaja', tyyppi: 'kommentti', aika: null }
    ] });
    const lanka = await aja(sb, '_kaavioLataaLanka(' + JSON.stringify(KAAVIO) + ')', true);
    expect(lanka.map((c) => c.id)).toEqual(['c1', 'c2']);
    aja(sb, '_kaavioTila.lanka = ' + JSON.stringify(lanka));
    const h = aja(sb, '_kaavioLankaHTML()');
    expect(h).toContain('Karsi kolmeen.');
    expect(h).toContain('Korjattu, katso uudelleen.');
    expect(h).toContain('Hylätty');                      // hylkäysperustelu erottuu
    expect(h).toContain('Mikko Mäkinen');                // kirjoittaja nimenä host-listasta
    expect(h).toContain('id="_kvKomm"');                 // syöttökenttä
  });
  it('tyhjä lanka → hillitty tyhjätila, ei virhe', () => {
    const { sb } = sivu({});
    aja(sb, '_kaavioTila.lanka = []');
    expect(aja(sb, '_kaavioLankaHTML()')).toContain('Ei kommentteja');
  });
  it('tyhjää kommenttia ei lähetetä', async () => {
    const { sb, loki, rekisteri } = sivu({});
    aja(sb, '_kaavioTila.muokkaus = ' + JSON.stringify(KAAVIO));
    rekisteri._kvKomm = { value: '  ' };
    await aja(sb, '_kaavioLahetaKommentti()', true);
    expect(loki.filter((r) => r[0] === 'add')).toEqual([]);
  });
  it('lanka näkyy vain tallennetulle kaaviolle (uudella ei ole dokumenttia johon liittyä)', () => {
    expect(runko('_kaavioAvaaEditori')).toMatch(/muokkaus\.id && !_kaavioTila\.muokkaus\._uusi/);
  });
  it('lanka on nappirivin FLEX-containerin ULKOPUOLELLA', () => {
    // Sisällä se on flex-lapsi ja venyttää Kumoa/Tallenna/Valmis langan korkuisiksi pylväiksi
    // (todettu live-renderistä ennen korjausta).
    const fn = runko('_kaavioAvaaEditori');
    const lanka = fn.indexOf("id=\"_kvLanka\"");
    const rivi = fn.indexOf("'<div style=\"display:flex;gap:6px;flex-wrap:wrap\">'");
    expect(lanka).toBeGreaterThan(0);
    expect(rivi).toBeGreaterThan(lanka);
  });
});

describe('C — §32: kommentti on vapaatekstiä omalla kielellä', () => {
  it('teksti tallentuu YHTENÄ kenttänä, ei fi/sv/en-objektina', async () => {
    const { sb, loki, rekisteri } = sivu({});
    aja(sb, '_kaavioTila.muokkaus = ' + JSON.stringify(KAAVIO));
    rekisteri._kvKomm = { value: 'Pallonhallinta ei näy tässä.' };
    await aja(sb, '_kaavioLahetaKommentti()', true);
    const o = loki.filter((r) => r[0] === 'add')[0][1];
    expect(typeof o.teksti).toBe('string');
    expect(o.teksti).toBe('Pallonhallinta ei näy tässä.');
    expect(o.tyyppi).toBe('kommentti');
  });
  it('render EI käännä kommentin sisältöä (vain langan chrome)', () => {
    const r = runko('_kaavioLankaRiviHTML');
    expect(r).toMatch(/esc\(c\.teksti \|\| ''\)/);
    expect(r).not.toMatch(/_kuiT\(c\.teksti/);
  });
  it('sisältö escapetaan (vapaateksti ei saa injektoida HTML:ää)', () => {
    const { sb } = sivu({});
    aja(sb, "_kaavioTila.lanka = [{id:'c1',teksti:'<img src=x onerror=alert(1)>',kirjoittaja:'v1',rooli:'vp',tyyppi:'kommentti'}]");
    const h = aja(sb, '_kaavioLankaHTML()');
    expect(h).not.toContain('<img src=x');
    expect(h).toContain('&lt;img');
  });
});

describe('D — rules-pariteetti', () => {
  it('sääntö vaatii samat kentät jotka client kirjoittaa', () => {
    const i = RULES.indexOf('match /kommentit/{kommenttiId}');
    expect(i).toBeGreaterThan(0);
    const lohko = RULES.slice(i, RULES.indexOf('\n        }', i));
    ['kirjoittaja == request.auth.uid', "tyyppi in ['kommentti', 'hylkays']", 'aika == request.time',
     'teksti is string'].forEach((e) => expect(lohko, e).toContain(e));
    expect(lohko).toMatch(/allow update: if false/);        // append-only
    const add = runko('_kaavioLisaaKommentti');
    ['teksti', 'kirjoittaja', 'rooli', 'tyyppi', 'aika'].forEach((f) => expect(add, f).toContain(f + ':'));
    expect(add).toContain('serverTimestamp()');             // aika == request.time vaatii tämän
  });
  it('pelaajan "Kysy" EI kirjoita suoraan — anon-rajoite (CF-jatko, #521:n kuvio)', () => {
    const t = runko('_kaavioToiminto');
    expect(t).toMatch(/t === 'kysy'/);
    expect(t).not.toMatch(/_kaavioLisaaKommentti\([^)]*'kysymys'/);
    const i = RULES.indexOf('match /kommentit/{kommenttiId}');
    expect(RULES.slice(i, RULES.indexOf('\n        }', i))).not.toContain("'kysymys'");
  });
});
