/**
 * §7.18 JOUKKUEJÄSENYYS — YKSI SÄÄNTÖ (Tero 8.10.2026): joukkueet[] on jäsenyyden totuus; `joukkue` on vain näyttönimi, ja sen tunnisteen on oltava joukkueet[]:ssä. Pelaaja voi kuulua useaan
 * joukkueeseen (lasketaan jokaiseen; seuran yhteensä-luvut uniikeista pelaajista). Ryhmät eivät ole joukkueita. Ikäluokka tulee syntymävuodesta.
 * Syy: Sibbon 25 pelaajalla joukkue = "2014 Blå", joukkueet[] = [p12] (24) / [p11] (1) → VP ryhmitteli nimellä, Master ja kooste nimellä TAI tunnisteella → sama pelaaja kahdessa joukkueessa (271 vs 246).
 * VARTIJA: joukkuemittareissa (VP, Master, kooste, joukkoaloitus) uusi ryhmittely `p.joukkue`-kentän mukaan kaatuu tähän.
 */
import { describe, it, expect } from 'vitest';
import { createRequire } from 'module';
import { readFileSync } from 'fs';
import vm from 'vm';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';
const require = createRequire(import.meta.url);
const J = require('../lib/tm_joukkue.js');
const juuri = join(dirname(fileURLToPath(import.meta.url)), '..');
const lue = (f) => readFileSync(join(juuri, f), 'utf8');

const D = [{ id: 'sib_p12', nimi: 'Sibbo-Vargarna P12', ikaryhma: 'P12' }, { id: 'sib_p11', nimi: 'Sibbo-Vargarna P11', ikaryhma: 'P11' }, { id: 'sib_bla', nimi: 'Sibbo-Vargarna 2014 Blå', ikaryhma: 'P12', vuosi: 2014 }];
const BLA = 'Sibbo-Vargarna 2014 Blå';

describe('tmPelaajanJoukkueet — joukkueet[] on totuus', () => {
  it('Sibbo: nimi = Blå mutta joukkueet[] = [p12] → vain P12 (nimi ei lisää jäsenyyttä); korjattu [bla] → vain Blå', () => {
    expect(J.tmPelaajanJoukkueet({ joukkue: BLA, joukkueet: ['sib_p12'] }, D)).toEqual(['sib_p12']);
    expect(J.tmPelaajanJoukkueet({ joukkue: BLA, joukkueet: ['sib_bla'] }, D)).toEqual(['sib_bla']);
  });
  it('monta joukkuetta: kaikki voimassa olevat, järjestys säilyy, duplikaatit pois', () => {
    expect(J.tmPelaajanJoukkueet({ joukkueet: ['sib_p12', 'sib_bla', 'sib_p12'] }, D)).toEqual(['sib_p12', 'sib_bla']);
  });
  it('tuntematon (kuollut) tunniste ohitetaan; nimi tunnisteen paikalla (legacy) → kanoninen doc', () => {
    expect(J.tmPelaajanJoukkueet({ joukkueet: ['kuollut', 'sib_p12'] }, D)).toEqual(['sib_p12']);
    expect(J.tmPelaajanJoukkueet({ joukkueet: ['sibbo-vargarna p12'] }, D)).toEqual(['sib_p12']);
  });
  it('legacy-pelaaja ILMAN joukkueet[]-listaa: nimi kanonisoidaan; tuntematon nimi → ei joukkuetta; nimi EI koskaan lisää jäsenyyttä listaan jossa on tunnisteita', () => {
    expect(J.tmPelaajanJoukkueet({ joukkue: ' sibbo-vargarna p12 ', joukkueet: [] }, D)).toEqual(['sib_p12']);
    expect(J.tmPelaajanJoukkueet({ joukkue: 'Muu' }, D)).toEqual([]);
    expect(J.tmPelaajanJoukkueet({ joukkue: 'Sibbo-Vargarna P12', joukkueet: ['sib_bla'] }, D)).toEqual(['sib_bla']);
  });
  it('ilman docia (tai tyhjä docs) joukkueet[] sellaisenaan; null-pelaaja → []', () => {
    expect(J.tmPelaajanJoukkueet({ joukkueet: ['a', 'b'] }, null)).toEqual(['a', 'b']);
    expect(J.tmPelaajanJoukkueet({ joukkueet: ['a'] }, [])).toEqual(['a']);
    expect(J.tmPelaajanJoukkueet(null, D)).toEqual([]);
  });
  it('ikäluokka ei vaikuta: sama tulos eri syntymävuosilla', () => {
    expect(J.tmPelaajanJoukkueet({ joukkueet: ['sib_bla'], syntymaVuosi: 2010 }, D)).toEqual(J.tmPelaajanJoukkueet({ joukkueet: ['sib_bla'], syntymaVuosi: 2014 }, D));
  });
});

describe('Jäsenyysdiagnoosi + raportti (Excel_Tuonti "Tarkista joukkuejäsenyydet")', () => {
  // 24 Blå-pelaajaa joilla [p12] (s. 2014), 1 jolla [p11] (s. 2015), 3 ehjää
  const P = [];
  for (let i = 0; i < 24; i++) P.push({ joukkue: BLA, joukkueet: ['sib_p12'], syntymaVuosi: 2014 });
  P.push({ joukkue: BLA, joukkueet: ['sib_p11'], syntymaVuosi: 2015 });
  for (let i = 0; i < 3; i++) P.push({ joukkue: BLA, joukkueet: ['sib_bla'], syntymaVuosi: 2014 });
  const r = J.tmJasenyysRaportti(P, D, 2026);
  it('Sibbo-tilanne: 24 yksiselitteistä (→ vain Blå), 1 epäselvä (P11-tunniste, ikäluokka ei täsmää), 3 ehjää', () => {
    expect(r.pelaajia).toBe(28); expect(r.tyypit).toEqual({ vanha_id: 25, ehja: 3 }); expect(r.yksiselitteisia).toBe(24);
    expect(r.epaselvat.length).toBe(1); expect(r.epaselvat[0]).toMatchObject({ lkm: 1, nyt: ['sib_p11'], ehdotus: ['sib_bla'], tyyppi: 'vanha_id' });
    expect(r.korjattavat[0].ehdotus).toEqual({ joukkueet: ['sib_bla'], joukkue: BLA, joukkueNimi: BLA, joukkueetNimet: [BLA] });
  });
  it('muut tyypit: tunniste puuttuu · nimi tunnisteen paikalla · nimi puuttuu · orpo · tyhjä · kuollut tunniste', () => {
    const t = (p) => J.tmJasenyysDiagnoosi(p, D, 2026);
    expect(t({ joukkue: 'Sibbo-Vargarna P12', joukkueet: [] })).toMatchObject({ tyyppi: 'id_puuttuu', yksiselitteinen: true });
    expect(t({ joukkue: 'Sibbo-Vargarna P12', joukkueet: ['Sibbo-Vargarna P12'] })).toMatchObject({ tyyppi: 'nimi_idn_paikalla', yksiselitteinen: true, ehdotus: { joukkueet: ['sib_p12'] } });
    expect(t({ joukkue: 'Sibbo-Vargarna P12', joukkueet: ['sib_p12'] }).tyyppi).toBe('ehja');
    expect(t({ joukkueet: ['sib_bla'] })).toMatchObject({ tyyppi: 'nimi_puuttuu', yksiselitteinen: true });
    expect(t({ joukkue: 'Tuntematon joukkue', joukkueet: [] })).toMatchObject({ tyyppi: 'orpo', ehdotus: null });
    expect(t({})).toMatchObject({ tyyppi: 'tyhja' });
    expect(t({ joukkue: 'Sibbo-Vargarna P12', joukkueet: ['sib_p12', 'kuollut'] })).toMatchObject({ tyyppi: 'kuollut_id', yksiselitteinen: true });
    expect(t({ joukkue: BLA, joukkueet: ['sib_p12', 'sib_p11'], syntymaVuosi: 2014 })).toMatchObject({ tyyppi: 'vanha_id', yksiselitteinen: false });   // useita vanhoja → epäselvä
  });
  it('raportti ei sisällä pelaajien nimiä eikä tunnisteita: epäselvät vain joukkuetunnisteina ja lukumäärinä (pelaajaobjektit vain sisäisesti)', () => {
    const T = require('../lib/tm_joukkuejasenyys_tarkistus.js');
    const teksti = T.tmJasenyysTeksti([{ id: 's', nimi: 'Sibbo', joukkueet: D, raportti: J.tmJasenyysRaportti(P.map((p, i) => Object.assign({ etunimi: 'Salainen' + i, sukunimi: 'Nimi', id: 'pid' + i }, p)), D, 2026) }]);
    expect(teksti).toMatch(/28 pelaajaa/); expect(teksti).toMatch(/yksiselitteisiä 24, epäselviä 1/); expect(teksti).toMatch(/Sibbo-Vargarna P11\] → ehdotus \[Sibbo-Vargarna 2014 Blå\] · 1 pelaajaa/);
    expect(teksti).not.toMatch(/Salainen|pid\d|sukunimi/i);
  });
});

describe('Kirjoituspolut — Siirrä / Lisää (tmJasenyysPaivitys): kaikki neljä kenttää, vanha tunniste pois siirrossa', () => {
  const p = { joukkue: 'Sibbo-Vargarna P12', joukkueet: ['sib_p12'] };
  it('siirto: joukkueet = [kohde] (vanha pois), nimet kohteesta', () => {
    expect(J.tmJasenyysPaivitys(p, 'siirto', 'sib_bla', D)).toEqual({ joukkueet: ['sib_bla'], joukkueetNimet: [BLA], joukkue: BLA, joukkueNimi: BLA });
  });
  it('lisäys: tunniste lisätään, pääjoukkue (näyttönimi) pysyy; olemassa oleva ei tuplaudu; kuolleet pois', () => {
    expect(J.tmJasenyysPaivitys(p, 'lisays', 'sib_bla', D)).toEqual({ joukkueet: ['sib_p12', 'sib_bla'], joukkueetNimet: ['Sibbo-Vargarna P12', BLA], joukkue: 'Sibbo-Vargarna P12', joukkueNimi: 'Sibbo-Vargarna P12' });
    expect(J.tmJasenyysPaivitys({ joukkue: 'x', joukkueet: ['sib_p12', 'kuollut'] }, 'lisays', 'sib_p12', D).joukkueet).toEqual(['sib_p12']);
  });
  it('Seura: Siirrä/Lisää käyttävät jaettua rakentajaa; joukkueen nimenmuutos ei kirjoita nimeä tunnisteen paikalle', () => {
    const S = lue('TalentMaster_Seura.html');
    expect(S).toMatch(/var kirj = tmJasenyysPaivitys\(p, tapa, kohdeId, tila\.joukkueet\);/);
    const a = S.indexOf('async function _pelSiirraValitut'); const b = S.indexOf('\nfunction suodataJoukkue', a);
    expect(S.slice(a, b)).not.toMatch(/joukkueet:\s*uudet/);
    const r = S.slice(S.indexOf('async function tallennaJoukkueMuutos'), S.indexOf("naytaToast(uusiNimi + ' — tallennettu ✓'"));
    expect(r).not.toMatch(/joukkueet\.map\(j => j === vanhanimi \? uusiNimi/);   // vanha virhe: uusi NIMI joukkueet[]:iin
    expect(r).toContain("where('joukkueet', 'array-contains', joukkueId)");
  });
  it('Seura: nimenmuutos ajettuna — jäsenet nimetään uudelleen, tunnisteen mukaan muualla oleva (stale) pelaaja EI kosketa, legacy saa tunnisteen', async () => {
    const S = lue('TalentMaster_Seura.html'), a = S.indexOf('async function tallennaJoukkueMuutos'); let d = 0, k = S.indexOf('{', a), loppu = k;
    for (let i = k; i < S.length; i++) { if (S[i] === '{') d++; else if (S[i] === '}') { d--; if (!d) { loppu = i; break; } } }
    const fn = S.slice(a, loppu + 1);
    const PEL = { m: { joukkue: 'Vanha Nimi', joukkueNimi: 'Vanha Nimi', joukkueet: ['jx'], joukkueetNimet: ['Vanha Nimi'] },
      stale: { joukkue: 'Vanha Nimi', joukkueet: ['muu'], joukkueetNimet: ['Muu'] }, legacy: { joukkue: 'Vanha Nimi' }, ohi: { joukkue: 'Eri', joukkueet: ['jx'], joukkueetNimet: ['Eri'] } };
    const paivitykset = {};
    const doc = (id) => ({ id, ref: { id }, data: () => PEL[id] });
    const col = { where: (f, op, v) => ({ get: async () => ({ docs: Object.keys(PEL).filter((id) => (f === 'joukkueet' ? (PEL[id].joukkueet || []).includes(v) : PEL[id].joukkue === v)).map(doc) }) }) };
    const els = { jm_nimi: { value: 'Uusi Nimi' }, jm_ikaryhma: { value: 'P12' }, jm_vuosi: { value: '2014' }, jm_status: { textContent: '' } };
    const db = { collection: () => ({ doc: () => ({ collection: (n) => (n === 'pelaajat' ? col : { doc: () => ({ update: async () => {} }) }) }) }), batch: () => ({ update: (ref, p) => { paivitykset[ref.id] = p; }, commit: async () => {} }) };
    const sb = { setTimeout: () => 0, document: { getElementById: (id) => els[id] }, tila: { kayttaja: null, seuraId: 'sib' }, firebase: { firestore: Object.assign(() => db, { FieldValue: { serverTimestamp: () => 'ts' } }) }, naytaToast() {}, tmNormJoukkueAvain: J.tmNormJoukkueAvain, parseInt, Promise, Map, Array, Object };
    vm.createContext(sb); vm.runInContext(fn + '\nthis.__f = tallennaJoukkueMuutos;', sb); await sb.__f('jx', 'Vanha Nimi');
    expect(paivitykset.m).toMatchObject({ joukkue: 'Uusi Nimi', joukkueNimi: 'Uusi Nimi', joukkueetNimet: ['Uusi Nimi'] }); expect(paivitykset.m.joukkueet).toBeUndefined();   // tunniste ennallaan
    expect(paivitykset.legacy).toMatchObject({ joukkue: 'Uusi Nimi', joukkueet: ['jx'] });
    expect(paivitykset.stale).toBeUndefined();                       // nimi täsmää mutta tunniste muualla → ei kosketa
    expect(paivitykset.ohi).toMatchObject({ joukkueetNimet: ['Eri'] }); expect(paivitykset.ohi.joukkue).toBeUndefined();   // jäsen, mutta näyttönimi on toinen → vain nimilistaa ei muuteta tarpeettomasti
  });
});

describe('VARTIJA — joukkuemittareissa ei ryhmittelyä p.joukkue-kentän mukaan', () => {
  const VP = lue('TalentMaster_VP_v25.html'), MA = lue('TalentMaster_Master_v16.html');
  const KIELLETYT = [
    [/\b(?:const|let|var)\s+(?:j|jk)\s*=\s*\w+\.joukkue\s*\|\|/, 'ryhmittelyavain = p.joukkue || …'],
    [/\b(?:p|x|pl)\.joukkue\s*(?:===|==|!==)/, 'jäsenyysvertailu p.joukkue === nimi'],
    [/\[(?:p|x|pl)\.joukkue\]/, 'taulukko-/avainindeksi [p.joukkue]'],
    [/toLowerCase\(\)\s*===\s*jkl\)\s*return true/, 'nimivertailu jäsenyytenä (case-insensitive p.joukkue)'],
  ];
  for (const [nimi, src] of [['VP_v25', VP], ['Master_v16', MA]]) {
    it(nimi + ': yhtään kiellettyä ryhmittely-/jäsenyysmallia ei ole (käytä tmPelaajanJoukkueet → _pJNimet/_pOnJoukkueessa/_mPJ)', () => {
      const osumat = [];
      src.split('\n').forEach((rivi, i) => { if (/^\s*(\/\/|\*|\/\*)/.test(rivi)) return; for (const [re, selite] of KIELLETYT) if (re.test(rivi) && !/function _pJNimet\(/.test(rivi) && !/_mJoukkueDocs\.length/.test(rivi)) osumat.push((i + 1) + ': ' + selite + ' · ' + rivi.trim().slice(0, 90)); });
      expect(osumat, 'uusi p.joukkue-ryhmittely joukkuemittarissa → rikkoo §7.18 (yksi säännön lähde: tmPelaajanJoukkueet, lib/tm_joukkue.js)').toEqual([]);
    });
  }
  it('EI VACUOUS: kielletyt mallit tunnistavat vanhat virheelliset rivit', () => {
    expect(KIELLETYT[0][0].test("_pelaajat.forEach(function(p){ const j = p.joukkue || 'Tuntematon'; (jt[j] = jt[j] || []).push(p); });")).toBe(true);
    expect(KIELLETYT[1][0].test("pp.filter(function(p){ return p.joukkue === j && p.hh_taso != null; })")).toBe(true);
    expect(KIELLETYT[2][0].test("jset[p.joukkue] = 1;")).toBe(true);
    expect(KIELLETYT[3][0].test("x.toLowerCase() === jkl) return true;")).toBe(true);
  });
  it('VP ja Master johtavat jäsenyyden jaetusta funktiosta; Master suodattaa latauksen jäsenyyden mukaan', () => {
    expect(VP).toContain('tmPelaajanJoukkueet(p, docs)'); expect(MA).toContain('function _mPJ(p) { return tmPelaajanJoukkueet(');
    expect(MA).toMatch(/docs = docs\.filter\(d => _mPJ\(d\.data\(\)\)\.indexOf\(_kanonJ\.id\) >= 0\)/);
    expect(VP).toMatch(/<script src="lib\/tm_joukkue\.js\?v=\d+"><\/script>/); expect(MA).toMatch(/<script src="lib\/tm_joukkue\.js\?v=\d+"><\/script>/);
  });
  it('kooste ja joukkoaloitus: jäsenyys tmPelaajanJoukkueet:stä, ei omaa nimivertailua', () => {
    const K = lue('lib/tm_seuran_kooste.js'), A = lue('lib/tm_joukkoaloitus.js');
    expect(K).toContain('PJ(p, joukkueet)'); expect(K).not.toContain('_sisaltaa'); expect(K.split('\n').filter((r) => /\bp\.joukkue\b/.test(r) && !/tmPelaajaIka/.test(r) && !/^\s*(\/\/|\*|\/\*)/.test(r) && !/Pelaaja kahdessa/.test(r)).length).toBe(0);
    expect(A).toContain('PJ(p, joukkueDocs)'); expect(A).not.toMatch(/_norm\(p\.joukkue\) === n\) return true;\s*\n\s*return !!jid/);
  });
  it('functions/ kopiot identtiset (kooste käyttää tm_joukkue.js:ää palvelimella)', () => {
    expect(lue('functions/tm_joukkue.js')).toBe(lue('lib/tm_joukkue.js')); expect(lue('functions/tm_seuran_kooste.js')).toBe(lue('lib/tm_seuran_kooste.js'));
    expect(JSON.parse(lue('functions/jaettu_lib.json')).tiedostot).toContain('tm_joukkue.js');
  });
});

describe('Excel_Tuonti — Tarkista joukkuejäsenyydet (kuiva-ajo → korjaus; Sibbo-tapaus)', () => {
  const T = require('../lib/tm_joukkuejasenyys_tarkistus.js');
  function luoDb() {
    const pel = {}; for (let i = 0; i < 24; i++) pel['a' + i] = { etunimi: 'E' + i, joukkue: BLA, joukkueet: ['sib_p12'], joukkueetNimet: ['Sibbo-Vargarna P12'], syntymaVuosi: 2014 };
    pel.epa = { etunimi: 'Epa', joukkue: BLA, joukkueet: ['sib_p11'], joukkueetNimet: ['Sibbo-Vargarna P11'], syntymaVuosi: 2015 };
    pel.ehja = { etunimi: 'Ehja', joukkue: BLA, joukkueet: ['sib_bla'], joukkueetNimet: [BLA], syntymaVuosi: 2014 };
    pel.arkisto = { etunimi: 'Arkisto', joukkue: BLA, joukkueet: ['sib_p12'], arkistoitu: true, syntymaVuosi: 2014 };
    const kirjoitukset = [];
    const ref = (id) => ({ id, update: null });
    const docsOf = (o, mk) => Object.keys(o).map((id) => ({ id, ref: ref(id), data: () => o[id] }));
    const db = {
      kirjoitukset, pel,
      collection: (k) => (k === 'seurat' ? { get: async () => ({ docs: [{ id: 'sib', data: () => ({ nimi: 'Sibbo' }) }, { id: 'demo', data: () => ({ demo: true }) }] }),
        doc: () => ({ collection: (n) => ({ get: async () => ({ docs: n === 'pelaajat' ? docsOf(pel) : D.map((d) => ({ id: d.id, ref: ref(d.id), data: () => { const { id, ...r } = d; return r; } })) }) }) }) } : null),
      batch: () => { const ops = []; return { update: (r, d) => ops.push([r.id, d]), commit: async () => { ops.forEach(([id, d]) => { kirjoitukset.push(id); Object.assign(pel[id], d); }); } }; },
    };
    return db;
  }
  it('kuiva-ajo: demo-seura pois; 24 yksiselitteistä + 1 epäselvä; arkistoitu ohitetaan; EI kirjoituksia', async () => {
    const db = luoDb(), t = await T.tmJasenyysTarkista({ db }, null, 2026);
    expect(t.map((x) => x.id)).toEqual(['sib']); expect(t[0].raportti.pelaajia).toBe(26); expect(t[0].raportti.yksiselitteisia).toBe(24); expect(t[0].raportti.epaselvat.length).toBe(1);
    expect(db.kirjoitukset).toEqual([]);
    expect(T.tmJasenyysTeksti(t)).not.toMatch(/E\d+|Epa|Ehja|Arkisto/);
  });
  it('korjaa (oletus): vain yksiselitteiset → joukkueet[] = [Blå] kaikki neljä kenttää; epäselvä ja ehjä koskematta', async () => {
    const db = luoDb(), r = await T.tmJasenyysKorjaa({ db }, 'sib', { viiteVuosi: 2026 });
    expect(r).toEqual({ kirjoitettu: 24, virhe: 0, epaselvia: 1 });
    expect(db.pel.a0).toMatchObject({ joukkueet: ['sib_bla'], joukkueetNimet: [BLA], joukkue: BLA, joukkueNimi: BLA }); expect(db.pel.a23.joukkueet).toEqual(['sib_bla']);
    expect(db.pel.epa.joukkueet).toEqual(['sib_p11']); expect(db.pel.arkisto.joukkueet).toEqual(['sib_p12']);
    // idempotentti: toinen ajo ei kirjoita mitään
    expect((await T.tmJasenyysKorjaa({ db }, 'sib', { viiteVuosi: 2026 })).kirjoitettu).toBe(0);
  });
  it('epäselvät erillisellä vahvistuksella: oletus = vain nimen joukkue (Blå)', async () => {
    const db = luoDb(); await T.tmJasenyysKorjaa({ db }, 'sib', { viiteVuosi: 2026 });
    const r = await T.tmJasenyysKorjaa({ db }, 'sib', { viiteVuosi: 2026, epaselvat: true });
    expect(r.kirjoitettu).toBe(1); expect(db.pel.epa).toMatchObject({ joukkueet: ['sib_bla'], joukkue: BLA });
  });
  it('korjaus lukee tuoreeltaan: kuiva-ajon jälkeen toisaalla korjattu/muutettu pelaaja ei kirjoiteta uudelleen', async () => {
    const db = luoDb(); await T.tmJasenyysTarkista({ db }, null, 2026);
    db.pel.a3.joukkueet = ['sib_bla'];   // joku korjasi käsin välissä
    const r = await T.tmJasenyysKorjaa({ db }, 'sib', { viiteVuosi: 2026 });
    expect(r.kirjoitettu).toBe(23); expect(db.kirjoitukset).not.toContain('a3');
  });
  it('Excel_Tuonti: nappi vain SA:lle, lataa libin ja ajaa kuiva-ajon ENNEN kirjoitusta', () => {
    const X = lue('TalentMaster_Excel_Tuonti.html');
    expect(X).toMatch(/<script src="lib\/tm_joukkuejasenyys_tarkistus\.js\?v=\d+"><\/script>/); expect(X).toContain("jbtn.id = 'sa-jasenyys'");
    const a = X.indexOf('async function _adminTarkistaJasenyydet'); const f = X.slice(a, X.indexOf('async function _adminTakaisinlaskeKooste', a));
    expect(f).toMatch(/if \(!superAdmin\)/); expect(f.indexOf('tmJasenyysTarkista')).toBeLessThan(f.indexOf('tmJasenyysKorjaa')); expect(f).toContain("'Korjaa epäselvät (vain nimen joukkue)'");
  });
});
