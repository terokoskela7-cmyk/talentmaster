/* 8–9 v -esto (LASKUTUS_L1_VAIHE0 §7.6, PM päätös 8, 3.11.2026): jaettu sääntö lib/tm_pelaaja_ika.js + kytkennät
   (Seura PIN-kortti ja kortit, Vanhempi_v2 kirjautumiskortti, Pelaaja_v7 virheteksti, SW) + scripts/poista_alle10_pinit.js.
   Palvelimen polut: functions/test/pelaaja_ika.test.js · kirjautuminen: tests/pelaajakirjautuminen.test.js. */
import { describe, it, expect } from 'vitest';
import fs from 'fs';
import vm from 'vm';
import { createRequire } from 'module';
const require = createRequire(import.meta.url);
const IKA = require('../lib/tm_pelaaja_ika.js');
const L = require('../lib/tm_laskutus.js');
const S = require('../scripts/poista_alle10_pinit.js');
const lue = (f) => fs.readFileSync(f, 'utf8');
const SEURA = lue('TalentMaster_Seura.html'), VANH = lue('TalentMaster_Vanhempi_v2.html'), PEL = lue('TalentMaster_Pelaaja_v7.html');

describe('lib/tm_pelaaja_ika.js', () => {
  it('raja: ikä ≤ 9 estetty (2026: syntynyt 2017+), 10 sallittu; esto poistuu vuoden vaihteessa', () => {
    expect(IKA.tmPelaajaAppTila({ syntymaVuosi: 2017 }, 2026)).toBe('ika_alle_10');
    expect(IKA.tmPelaajaAppTila({ syntymaVuosi: 2020 }, 2026)).toBe('ika_alle_10');
    expect(IKA.tmPelaajaAppTila({ syntymaVuosi: 2016 }, 2026)).toBe('ok');
    expect(IKA.tmPelaajaAppTila({ syntymaVuosi: 2017 }, 2027)).toBe('ok');
    expect(IKA.pelaajaAppEstettyIka({ syntymaVuosi: 2017 }, 2026)).toBe(true);
    expect(IKA.pelaajaAppEstettyIka({ syntymaVuosi: 2016 }, 2026)).toBe(false);
  });
  it('syntymävuosi: numero, "YYYY", varalla syntymaaika (Timestamp / {seconds} / Date / ISO); puuttuva tai outo → ika_puuttuu', () => {
    expect(IKA.tmPelaajaSyntymaVuosi({ syntymaVuosi: '2015' })).toBe(2015);
    expect(IKA.tmPelaajaSyntymaVuosi({ syntymaaika: { toDate: () => new Date(Date.UTC(2014, 4, 1)) } })).toBe(2014);
    expect(IKA.tmPelaajaSyntymaVuosi({ syntymaaika: { seconds: Date.UTC(2013, 0, 5) / 1000 } })).toBe(2013);
    expect(IKA.tmPelaajaSyntymaVuosi({ syntymaaika: '2012-06-01' })).toBe(2012);
    expect(IKA.tmPelaajaSyntymaVuosi({ syntymaaika: new Date(Date.UTC(2016, 11, 31, 23, 0)) })).toBe(2017);   // 31.12. klo 23 UTC = 1.1. Helsingissä
    [{}, null, { syntymaVuosi: '' }, { syntymaVuosi: 'x' }, { syntymaVuosi: 1800 }, { syntymaVuosi: 2015.5 }].forEach((p) => expect(IKA.tmPelaajaAppTila(p, 2026)).toBe('ika_puuttuu'));
  });
  it('Helsingin vuosi: UTC 31.12. klo 22:30 on Suomessa jo seuraava vuosi', () => {
    expect(IKA.tmHelsinkiVuosi(new Date(Date.UTC(2026, 11, 31, 22, 30)))).toBe(2027);
    expect(IKA.tmHelsinkiVuosi(new Date(Date.UTC(2026, 11, 31, 21, 30)))).toBe(2026);
  });
  it('sama ikätulkinta kuin laskutuksessa (tmLaskutusIka): ikä ≤ 9 ↔ laskutuksen maksuton alle 10', () => {
    const otos = [{ syntymaVuosi: 2017 }, { syntymaVuosi: '2016' }, { syntymaaika: { seconds: Date.UTC(2015, 3, 1) / 1000 } }, { syntymaaika: '2018-02-02' }, {}, { syntymaVuosi: 'x' }];
    otos.forEach((p) => expect(IKA.tmPelaajaAppIka(p, 2026)).toBe(L.tmLaskutusIka(p, 2026)));
  });
  it('functions-kopio on manifestissa (tavu tavulta sama: tests/functions_jaettu_lib.test.js)', () => {
    expect(JSON.parse(lue('functions/jaettu_lib.json')).tiedostot).toContain('tm_pelaaja_ika.js');
    expect(lue('functions/tm_pelaaja_ika.js')).toBe(lue('lib/tm_pelaaja_ika.js'));
  });
});

const pura = (src, t) => { const a = src.indexOf(t); if (a < 0) throw new Error(t); let d = 0; for (let j = src.indexOf(') {', a) + 2; j < src.length; j++) { if (src[j] === '{') d++; else if (src[j] === '}') { d--; if (!d) return src.slice(a, j + 1); } } throw new Error(t); };

describe('Seura: PIN-kortti, virheteksti ja kortit', () => {
  const ctx = { window: { TM_PELAAJA_IKA: IKA }, tmHT: (s) => s, String };
  vm.createContext(ctx);
  vm.runInContext(['function _ikaTila(p) {', 'function _ikaTeksti(syy) {'].map((t) => pura(SEURA, t)).join('\n') + '\nthis.tila = _ikaTila; this.teksti = _ikaTeksti;', ctx);
  it('ajettuna: sama sääntö kuin palvelimella; teksti syyn mukaan; lib puuttuu → ok (palvelin estää silti)', () => {
    const v = IKA.tmHelsinkiVuosi();
    expect(ctx.tila({ syntymaVuosi: v - 9 })).toBe('ika_alle_10');
    expect(ctx.tila({ syntymaVuosi: v - 10 })).toBe('ok');
    expect(ctx.tila({})).toBe('ika_puuttuu');
    expect(ctx.teksti('ika_alle_10')).toMatch(/Alle 10-vuotiaalle/);
    expect(ctx.teksti('ika_puuttuu')).toMatch(/Syntymävuosi puuttuu/);
    expect(ctx.teksti('ok')).toBe(''); expect(ctx.teksti(undefined)).toBe('');
    const ilman = { tmHT: (s) => s, String }; vm.createContext(ilman);
    vm.runInContext(pura(SEURA, 'function _ikaTila(p) {') + '\nthis.tila = _ikaTila;', ilman);
    expect(ilman.tila({ syntymaVuosi: 2020 })).toBe('ok');
  });
  it('kytkennät lähteessä: lib ladataan, PIN-kortti piiloon alle 10-vuotiaalta, vuosi puuttuu -vihje, kortit ja palvelinvirheet; rivikatto 7100', () => {
    expect(SEURA).toContain('<script src="lib/tm_pelaaja_ika.js"></script>');
    expect(SEURA).toMatch(/\$\{_ikaTila\(p\) === 'ika_alle_10' \? '<div class="ika-teksti"[^`]*` *<!-- PIN-koodi ja pelaajasivu-linkki/);
    expect(SEURA).toMatch(/_ikaTila\(p\) === 'ika_puuttuu' \? '<div class="ika-teksti"/);
    expect(SEURA).toMatch(/esc\(_ikaTeksti\(k\.syy\) \|\| tp\('seura\.kortti_ei_kaytossa'/);
    expect(SEURA).toMatch(/if \(koodi === 'failed-precondition' && e && e\.details && _ikaTeksti\(e\.details\.syy\)\) return _ikaTeksti\(e\.details\.syy\);/);
    expect(SEURA).toMatch(/esi\.data\.ohitettuIka/); expect(SEURA).toMatch(/r\.data\.ohitettuIkaPuuttuu/);
    expect(SEURA).toMatch(/tulos\.data\.vainVanhempi/);
    expect(SEURA.split('\n').length - 1).toBeLessThanOrEqual(7100);
  });
});

describe('Vanhempi_v2, Pelaaja_v7 ja SW', () => {
  it('Vanhempi: pelaajan kirjautumiskortti piiloon alle 10-vuotiaalta (otsikko + kortti), lib ladataan ja on SW:n allowlistillä', () => {
    expect(VANH).toContain('<script src="lib/tm_pelaaja_ika.js"></script>');
    expect(VANH).toContain("_ikaPiilo = (window.TM_PELAAJA_IKA && window.TM_PELAAJA_IKA.pelaajaAppEstettyIka(L)) ? ' hidden' : '';");
    expect(VANH).toContain(`<div class="ey" style="margin:16px 2px 10px"\${_ikaPiilo}>\${t('vanhempi.pelaajan_kirjautuminen')}</div>`);
    expect(VANH).toContain(`\${_ikaPiilo ? '' : _pelaajanKirjautuminenHTML(d.nimi, palloId, pin)}`);
    expect((VANH.match(/_pelaajanKirjautuminenHTML\(d\.nimi, palloId, pin\)/g) || []).length).toBe(1);
    expect(lue('sw_vanhempi.js')).toContain("url.indexOf('/lib/tm_pelaaja_ika.js') !== -1");
  });
  it('Vanhempi: ehto ajettuna — alle 10 → tyhjä, 10 v ja puuttuva vuosi → kortti näkyy', () => {
    const v = IKA.tmHelsinkiVuosi(), piilo = (L_) => !!(IKA && IKA.pelaajaAppEstettyIka(L_));
    expect(piilo({ syntymaVuosi: v - 9 })).toBe(true); expect(piilo({ syntymaVuosi: v - 10 })).toBe(false); expect(piilo({})).toBe(false);
  });
  it('Pelaaja_v7: syy ika_alle_10 → oma teksti (fi + en + sv; sv-erä 93, PM)', () => {
    expect(PEL).toContain("e.details.syy === 'ika_alle_10') { _pinVirhe(T('ika_alle_10')); return; }");
    const T = require('../lib/tm_lang.js').TM_LANG;
    expect(T.fi.pelaaja.ika_alle_10).toMatch(/10 vuoden/); expect(T.en.pelaaja.ika_alle_10).toMatch(/age 10/);
    expect(T.sv.pelaaja.ika_alle_10).toMatch(/10 års ålder/);
  });
});

describe('scripts/poista_alle10_pinit.js', () => {
  it('suunnitelma: vain alle 10 + PIN (kenttä tai hajautus); vuosi puuttuu ja 10 v eivät mukana', () => {
    const p = [{ id: 'a', syntymaVuosi: 2017, pin: '1' }, { id: 'b', syntymaVuosi: 2018 }, { id: 'c', syntymaVuosi: 2019 }, { id: 'd', syntymaVuosi: 2016, pin: '2' }, { id: 'e', pin: '3' }];
    const s = S.suunnittele('s1', p, new Set(['s1_b']), 2026);
    expect(s.kohteet.map((k) => k.id)).toEqual(['a', 'b']);
    expect([s.alle10, s.ikaPuuttuu, s.pinKentta, s.hajautus]).toEqual([3, 1, 1, 1]);
  });
  function kanta(docs) {
    const D = new Map(Object.entries(docs)), audit = [], revoked = [];
    const ref = (p) => ({ path: p, get: async () => ({ exists: D.has(p), data: () => D.get(p) }) });
    const db = {
      collection: (c) => ({ doc: (id) => Object.assign(ref(c + '/' + id), { collection: (cc) => ({ get: async () => ({ docs: [...D.keys()].filter((k) => k.startsWith(c + '/' + id + '/' + cc + '/')).map((k) => ({ id: k.split('/').pop(), data: () => D.get(k) })) }), doc: (pid) => ref(c + '/' + id + '/' + cc + '/' + pid) }) }),
        add: async (d) => { audit.push(d); }, get: async () => ({ docs: [] }) }),
      batch: () => { const ops = []; return { update: (r, d) => ops.push(() => { const o = Object.assign({}, D.get(r.path)); Object.keys(d).forEach((k) => { if (d[k] === '__del__') delete o[k]; else o[k] = d[k]; }); D.set(r.path, o); }), delete: (r) => ops.push(() => D.delete(r.path)), commit: async () => ops.forEach((f) => f()) }; },
    };
    const auth = { revokeRefreshTokens: async (uid) => { if (uid.endsWith('_ei')) { const e = new Error('x'); e.code = 'auth/user-not-found'; throw e; } revoked.push(uid); } };
    return { D, db, auth, audit, revoked, FieldValue: { delete: () => '__del__', serverTimestamp: () => 'TS' } };
  }
  const DOCS = () => ({ 'seurat/s1/pelaajat/a': { syntymaVuosi: 2017, pin: '111111', etunimi: 'Testi' }, 'seurat/s1/pelaajat/ei': { syntymaVuosi: 2018, pin: '222222' },
    'seurat/s1/pelaajat/ok': { syntymaVuosi: 2015, pin: '333333' }, 'seurat/s1/pelaajat/m': { pin: '444444' }, '_pelaajaPin/s1_a': { hash: 'h' }, '_pelaajaPin/s1_ok': { hash: 'h' } });
  it('kuiva-ajo oletuksena: ei kirjoituksia, loki ilman nimiä, id:itä ja PIN:ejä', async () => {
    const k = kanta(DOCS()), loki = [];
    const r = await S.aja(Object.assign({ seuraIdt: ['s1'], vuosi: 2026, kirjoita: false, loki: (x) => loki.push(x) }, k));
    expect(r.kirjoitettu).toBe(false); expect(k.D.get('seurat/s1/pelaajat/a').pin).toBe('111111'); expect(k.revoked).toEqual([]);
    expect(loki.join('\n')).toMatch(/s1: alle 10 v 2 · poistettavia PIN:ejä 2/);
    expect(loki.join('\n')).not.toMatch(/Testi|111111|222222|\ba\b.*pin/);
  });
  it('--kirjoita + vahvistus: PIN-kenttä ja hajautus pois, istunnot mitätöity (tunnukseton ohitetaan), 10 v ja vuosi puuttuu koskematta, audit', async () => {
    const k = kanta(DOCS());
    const r = await S.aja(Object.assign({ seuraIdt: ['s1'], vuosi: 2026, kirjoita: true, kysy: async () => 'KIRJOITA', loki: () => {} }, k));
    expect([r.poistettu, r.istuntoja]).toEqual([2, 1]);
    expect(k.D.get('seurat/s1/pelaajat/a').pin).toBeUndefined(); expect(k.D.get('seurat/s1/pelaajat/a').etunimi).toBe('Testi');
    expect(k.D.has('_pelaajaPin/s1_a')).toBe(false); expect(k.D.has('_pelaajaPin/s1_ok')).toBe(true);
    expect(k.D.get('seurat/s1/pelaajat/ok').pin).toBe('333333'); expect(k.D.get('seurat/s1/pelaajat/m').pin).toBe('444444');
    expect(k.revoked).toEqual(['pel_s1_a']);
    expect(k.audit[0]).toMatchObject({ toiminto: 'alle10_pin_poistettu', poistettu: 2, istuntoja_mitatoity: 1 });
  });
  it('väärä vahvistus → ei kirjoiteta', async () => {
    const k = kanta(DOCS());
    const r = await S.aja(Object.assign({ seuraIdt: ['s1'], vuosi: 2026, kirjoita: true, kysy: async () => 'kyllä', loki: () => {} }, k));
    expect(r.kirjoitettu).toBe(false); expect(k.D.get('seurat/s1/pelaajat/a').pin).toBe('111111');
  });
});
