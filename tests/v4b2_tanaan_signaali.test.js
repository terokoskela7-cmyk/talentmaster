/**
 * V4b-2 · Tänään-signaali (D48): järjestyksen TAULUKKOTESTI + profiilin vaikutus (D50). Pure lib: lib/tm_tanaan_signaali.js.
 * Taulukko: jokaiselle riville oma pelaaja/konteksti; kun KAKSI riviä täyttyy yhtä aikaa, pienempi numero voittaa (ensisijainen) ja seuraava näkyy pienenä rivinä (toinen).
 */
import { describe, it, expect } from 'vitest';
import { createRequire } from 'module';
const require = createRequire(import.meta.url);
const TS = require('../lib/tm_tanaan_signaali.js'), RV = require('../lib/tm_reitin_valinta.js');
const NYT = new Date('2026-10-01T10:00:00.000Z');
const JF = (o = {}) => Object.assign({ konsepti_avain: 'y_h1', konsepti_nimi: 'Kuljetus', domeeni: 'teknis_taktinen', alkoi: '2026-09-21T08:00:00.000Z', kesto_vk: 4 }, o);   // käynnissä (vk 2/4)
const PAATTYNYT = (pv) => JF({ alkoi: new Date(NYT.getTime() - (4 * 7 + pv) * 86400000).toISOString() });                                       // päättynyt pv päivää sitten
const TARJOUS = () => ({ tila: 'valittavana', vaihtoehdot: [{ konsepti_avain: 'seura_kierto', nimi: 'Kierto', perustelu: 'Hyvä.', vahvistettu: true }, { konsepti_avain: 'y_h3', nimi: 'Pelinluku', perustelu: 'Hyvä.', vahvistettu: true }] });
const P = (o = {}) => Object.assign({ id: 'p1', etunimi: 'Topias' }, o);
const S = (p, ctx = {}) => TS.tmTanaanSignaali(p, Object.assign({ nyt: NYT, profiili: 'oto', askel: null, nimi: 'Topias' }, ctx));
const ensin = (p, ctx) => (S(p, ctx).ensisijainen || {}).avain;
const KUORMA = { avain: 'kuorma_tarkista' }, HAV = { avain: 'havainto', peruste: { paivia: 16 } }, YLL = { avain: 'yllapito' }, MYOH = { avain: 'review_myohassa' };

describe('D48 — järjestys (taulukko): jokainen rivi yksinään', () => {
  const rivit = [
    ['1 kuorma_tarkista', P({ jaksofokus: JF() }), { askel: KUORMA }, 'kuorma', 'kuorma'],
    ['2 valinta tehty', P({ jaksofokus: TARJOUS(), ydinvahvuus_valinta: { vaihtoehto: 'seura_kierto', valittu_pvm: '2026-10-01' } }), {}, 'valinta_tehty', 'vahvista'],
    ['3 suljettava', P({ jaksofokus: PAATTYNYT(2) }), {}, 'suljettava', 'sulje'],
    ['4 valinta odottaa pelaajaa', P({ jaksofokus: TARJOUS() }), {}, 'valinta_odottaa', null],
    ['5 viikkokatsaus ei vastattu', P({ jaksofokus: JF() }), { vkEiVastattu: true, askel: YLL }, 'vk_ei_vastattu', null],
    ['6 havainto', P({ jaksofokus: JF() }), { askel: HAV }, 'havainto', 'havainto'],
    ['7 ylläpito', P({ jaksofokus: JF() }), { askel: YLL }, 'yllapito', 'avaa_polku'],
    ['8 ei tietoa', P(), {}, 'ei_tietoa', 'aloita']
  ];
  it.each(rivit)('%s → ensisijainen + nappi', (_n, p, ctx, avain, nappi) => { const x = S(p, ctx); expect(x.ensisijainen.avain).toBe(avain); expect((x.ensisijainen.nappi || {}).avain || null).toBe(nappi); });
  it('JARJESTYS-vakio = D48:n kahdeksan riviä oikeassa järjestyksessä', () => { expect(TS.JARJESTYS).toEqual(['kuorma', 'valinta_tehty', 'suljettava', 'valinta_odottaa', 'vk_ei_vastattu', 'havainto', 'yllapito', 'ei_tietoa']); });
});

describe('D48 — kaksi riviä täyttyy: pienempi numero voittaa; toinen = pieni rivi', () => {
  const VALINTA = { ydinvahvuus_valinta: { vaihtoehto: 'seura_kierto', valittu_pvm: '2026-10-01' } };
  // [nimi, pelaaja, ctx, odotettu ensisijainen, odotettu toinen]
  const parit = [
    ['kuorma > valinta tehty', P({ jaksofokus: Object.assign(TARJOUS()), ...VALINTA }), { askel: KUORMA }, 'kuorma', 'valinta_tehty'],
    ['kuorma > suljettava', P({ jaksofokus: PAATTYNYT(3) }), { askel: KUORMA }, 'kuorma', 'suljettava'],
    ['valinta tehty > suljettava/review myöhässä (pelaajan odottama vahvistus ohittaa myöhässä olevan katselmuksen)', P({ jaksofokus: TARJOUS(), ...VALINTA }), { askel: MYOH, profiili: 'ammatti' }, 'valinta_tehty', 'suljettava'],
    ['suljettava > viikkokatsaus', P({ jaksofokus: PAATTYNYT(1) }), { vkEiVastattu: true }, 'suljettava', 'vk_ei_vastattu'],
    ['suljettava > havainto', P({ jaksofokus: PAATTYNYT(1) }), { askel: HAV }, 'suljettava', 'havainto'],
    ['valinta odottaa > viikkokatsaus', P({ jaksofokus: TARJOUS() }), { vkEiVastattu: true }, 'valinta_odottaa', 'vk_ei_vastattu'],
    ['viikkokatsaus > havainto', P({ jaksofokus: JF() }), { vkEiVastattu: true, askel: HAV }, 'vk_ei_vastattu', 'havainto']
  ];
  it.each(parit)('%s', (_n, p, ctx, e1, e2) => { const x = S(p, ctx); expect(x.ensisijainen.avain).toBe(e1); expect(x.toinen && x.toinen.avain).toBe(e2); });
  it('kaikki signaalit täyttyvät: lista on täsmälleen D48-järjestyksessä (tmSignaalit), ensisijainen on ensimmäinen', () => {
    const p = P({ jaksofokus: PAATTYNYT(3), ...VALINTA }); const lista = TS.tmSignaalit(p, { nyt: NYT, profiili: 'ammatti', askel: HAV, vkEiVastattu: true, nimi: 'Topias' });
    const jarj = lista.map((s) => s.avain); const idx = jarj.map((a) => TS.JARJESTYS.indexOf(a)); expect(idx).toEqual([...idx].sort((a, b) => a - b)); expect(new Set(jarj).size).toBe(jarj.length);
  });
  it('yksi signaali + pieni toinen rivi: ylläpito ja "ei tietoa" eivät koskaan ole toinen rivi', () => { expect(S(P({ jaksofokus: JF() }), { askel: YLL }).toinen).toBeNull(); expect(S(P(), {}).toinen).toBeNull(); });
});

describe('D50 — profiili vaikuttaa vain sävyyn ja aikaikkunaan', () => {
  it('suljettava: ammatti "odottaa · N pv"; 2 vk jälkeen amber (katselmus myöhässä); oto "kun ehdit", ei aikaikkunaa', () => {
    const am = S(P({ jaksofokus: PAATTYNYT(2) }), { profiili: 'ammatti' }).ensisijainen; expect(am.teksti).toContain('odottaa · 2 pv'); expect(am.savy).toBe('neutraali');
    const myoh = S(P({ jaksofokus: PAATTYNYT(20) }), { profiili: 'ammatti' }).ensisijainen; expect(myoh.savy).toBe('amber'); expect(myoh.teksti).toContain('katselmus myöhässä');
    const oto = S(P({ jaksofokus: PAATTYNYT(20) }), { profiili: 'oto' }).ensisijainen; expect(oto.teksti).toContain('kun ehdit'); expect(oto.teksti).not.toMatch(/\d+ pv/); expect(oto.savy).toBe('neutraali');
  });
  it('review_myohassa (porras 1) nostetaan signaaliksi VAIN ammattiprofiilissa', () => {
    const p = P({ jaksofokus: JF() });
    expect(ensin(p, { askel: MYOH, profiili: 'ammatti' })).toBe('suljettava'); expect(ensin(p, { askel: MYOH, profiili: 'oto' })).not.toBe('suljettava');
  });
  it('valinta tehty: oto "…, vahvista kun ehdit"; ammatti pelkkä "{nimi} valitsi reitin A"; oma ehdotus tunnistetaan', () => {
    const p = P({ jaksofokus: TARJOUS(), ydinvahvuus_valinta: { vaihtoehto: 'seura_kierto', valittu_pvm: '2026-10-01' } });
    expect(S(p, { profiili: 'oto' }).ensisijainen.teksti).toBe('Topias valitsi reitin A, vahvista kun ehdit'); expect(S(p, { profiili: 'ammatti' }).ensisijainen.teksti).toBe('Topias valitsi reitin A');
    expect(S(P({ jaksofokus: TARJOUS(), ydinvahvuus_valinta: { vaihtoehto: 'Oma juttu', valittu_pvm: '2026-10-01' } }), {}).ensisijainen.teksti).toContain('ehdotti omaa');
  });
  it('profiili: oletus oto (tuntematon / puuttuva / ei joukkuedokumenttia); vain "ammatti" on ammatti', () => {
    expect(TS.tmOnAmmatti('ammatti')).toBe(true); for (const v of ['oto', undefined, null, '', 'AMMATTI', 'x']) expect(TS.tmOnAmmatti(v)).toBe(false);
    const K = require('../lib/tm_kevyt_katselmus.js'); expect(K.tmProfiili(null)).toBe('oto'); expect(K.tmProfiili({})).toBe('oto'); expect(K.tmProfiili({ valmentajaprofiili: 'ammatti' })).toBe('ammatti'); expect(K.tmProfiili({ valmentajaprofiili: 'muu' })).toBe('oto');
  });
});

describe('Tänään-signaalin HTML', () => {
  it('yksi kortti + nappi (toimiFn) + pieni toinen rivi; ei nappia kun nappi:null; ei hex-värejä', () => {
    const x = S(P({ jaksofokus: PAATTYNYT(2) }), { vkEiVastattu: true }); const h = TS.tmTanaanSignaaliHTML(x, { toimiFn: '_ktToimi', pid: 'p1' });
    expect(h).toContain('data-kt-signaali="suljettava"'); expect(h).toContain('data-kt-signaali-nappi="sulje"'); expect(h).toContain("_ktToimi('p1','sulje')"); expect(h).toContain('data-kt-signaali-toinen="vk_ei_vastattu"'); expect(h).not.toMatch(/#[0-9a-fA-F]{3,6}\b/);
    const ei = TS.tmTanaanSignaaliHTML(S(P({ jaksofokus: TARJOUS() }), {}), { toimiFn: '_ktToimi', pid: 'p1' }); expect(ei).not.toContain('data-kt-signaali-nappi');
    expect(TS.tmTanaanSignaaliHTML({ ensisijainen: null, toinen: null }, {})).toBe('');
  });
});
