/**
 * K3a · lib-testit: Hylkää valinta -kytkin (lib/tm_kevyt_katselmus.js), K3-ehdotukset uudelle sivulle (lib/tm_kt_arviointi.js tmKtK3Ehdotukset),
 * ja reititys (lib/tm_kt_sivu.js). Master/VP:n käytös (ei kytkintä) pysyy ennallaan.
 */
import { describe, it, expect } from 'vitest';
import { createRequire } from 'module';
const require = createRequire(import.meta.url);
const K = require('../lib/tm_kevyt_katselmus.js'), ARV = require('../lib/tm_kt_arviointi.js'), KS = require('../lib/tm_kt_sivu.js'), RV = require('../lib/tm_reitin_valinta.js');
const PVM = '2026-10-20';
const VAIHTOEHDOT = [{ konsepti_avain: 'y_h1', nimi: 'Kuljetus', perustelu: 'Hyvä.', vahvistettu: true }, { konsepti_avain: 'y_h2', nimi: 'Syöttö', perustelu: 'Toinen.', vahvistettu: true }];
const VALITTU = (o = {}) => Object.assign({ id: 'p1', etunimi: 'Aatu', jaksofokus: { tila: 'valittavana', vaihtoehdot: VAIHTOEHDOT }, ydinvahvuus_valinta: { vaihtoehto: 'y_h2', valittu_pvm: PVM } }, o);

describe('K3a · Hylkää valinta: vaihe 0 -kytkin', () => {
  it('Master/VP (ei kytkintä): S.nayta puuttuu, perustelu pakollinen ja kirjoitetaan hylatty.perustelu — ennallaan', () => {
    const S = K.tmHylkaaAlku(VALITTU(), {}); expect('nayta' in S).toBe(false);
    expect(K.tmHylkaaTallennus(VALITTU(), S, { pvm: PVM })).toMatchObject({ ok: false, syy: 'pakollinen' });
    S.perustelu = 'Valitse reitti, jonka haluat harjoitella itse.'; expect(K.tmHylkaaTallennus(VALITTU(), S, { pvm: PVM }).jaksofokus.hylatty).toEqual({ pvm: PVM, perustelu: 'Valitse reitti, jonka haluat harjoitella itse.', valinta: 'y_h2' });
  });
  it('uusi sivu (kytkin): perustelu pakollinen; pois (oletus) → VAIN reviewit/{pvm}.hylkays_sisainen, ei pelaajan luettavaan hylatty.perustelu-kenttään; päällä → hylatty.perustelu kuten ennen', () => {
    const S = K.tmHylkaaAlku(VALITTU(), { kytkin: true }); expect(S.nayta).toBe(false);
    expect(K.tmHylkaaTallennus(VALITTU(), S, { pvm: PVM })).toMatchObject({ ok: false, syy: 'pakollinen' });
    S.perustelu = 'Tätä ei saa vuotaa pelaajalle.';
    const x = K.tmHylkaaTallennus(VALITTU(), S, { pvm: PVM, uid: 'u1', lahde: 'vp', nytISO: '2026-10-20T09:00:00.000Z' }); expect(x.ok).toBe(true); expect(x.poistaValinta).toBe(true); expect(x.jaksofokus.hylatty).toEqual({ pvm: PVM, valinta: 'y_h2' });
    expect(JSON.stringify(x.jaksofokus)).not.toContain('vuotaa');
    expect(x.reviewitPvm).toBe(PVM); expect(x.reviewitData).toEqual({ hylkays_sisainen: { teksti: 'Tätä ei saa vuotaa pelaajalle.', lahde: 'vp', uid: 'u1', tallennettu: '2026-10-20T09:00:00.000Z' } });
    S.nayta = true; const y = K.tmHylkaaTallennus(VALITTU(), S, { pvm: PVM }); expect(y.jaksofokus.hylatty.perustelu).toBe('Tätä ei saa vuotaa pelaajalle.'); expect(y.reviewitData).toBeUndefined();
    S.perustelu = 'Tämä on hylätty.'; expect(K.tmHylkaaTallennus(VALITTU(), S, { pvm: PVM })).toMatchObject({ ok: false, syy: 'sana' });
  });
  it('kytkin pois: validointi ei silti ohita vaihtoehtojen tarkistusta (ei valittua → virhe) eikä "ei valintaa" -tilaa', () => {
    const S = K.tmHylkaaAlku(VALITTU(), { kytkin: true }); S.perustelu = 'Mietitään vielä yhdessä.'; S.k3.kortit.forEach((k) => { k.valittu = false; });
    expect(K.tmHylkaaTallennus(VALITTU(), S, { pvm: PVM })).toMatchObject({ ok: false, syy: 'k3_ei_valittu' });
    const ei = K.tmHylkaaAlku(VALITTU({ ydinvahvuus_valinta: undefined }), { kytkin: true }); ei.perustelu = 'x'; expect(K.tmHylkaaTallennus(VALITTU({ ydinvahvuus_valinta: undefined }), ei, { pvm: PVM })).toMatchObject({ ok: false, syy: 'ei_valintaa' });
  });
  it('HTML: ilman naytaFn:ää vanha ruutu (perustelukenttä, ei kytkintä); naytaFn → kytkin + perustelukenttä', () => {
    const o = { lauseFn: 'a', tallennaFn: 'b', suljeFn: 'c', k3: { paalleFn: 'd', valitseFn: 'e', lauseFn: 'f' } }, S = K.tmHylkaaAlku(VALITTU(), {});
    const vanha = K.tmHylkaaSheetHTML(S, o); expect(vanha).toContain('data-hk-perustelu'); expect(vanha).not.toContain('data-nk-kytkin'); expect(vanha).toContain('Kerro pelaajalle miksi');
    const S2 = K.tmHylkaaAlku(VALITTU(), { kytkin: true }), pois = K.tmHylkaaSheetHTML(S2, Object.assign({ naytaFn: 'g' }, o));
    expect(pois).toContain('data-nk-kytkin'); expect(pois).toContain('data-hk-perustelu'); expect(pois).toContain('Näytä myös pelaajalle'); expect(pois).not.toMatch(/\bchecked\b[^>]*data-nk-checkbox|data-nk-checkbox[^>]*\bchecked\b/);
    S2.nayta = true; const paalla = K.tmHylkaaSheetHTML(S2, Object.assign({ naytaFn: 'g' }, o)); expect(paalla).toContain('data-hk-perustelu'); expect(paalla).toContain('data-nk-kytkin');
  });
  it('pelaajan "Valmentajalta"-rivi: ilman perustelua ei riviä (tila valittavana jatkuu)', () => {
    const S = K.tmHylkaaAlku(VALITTU(), { kytkin: true }); S.perustelu = 'Sisäinen.'; const x = K.tmHylkaaTallennus(VALITTU(), S, { pvm: PVM });
    const p = { jaksofokus: x.jaksofokus }; const t = RV.tmValintaTila(p); expect(t.tila).toBe('valittavana'); expect(t.valmentajalta == null).toBe(true);
  });
});

describe('K3a · K3-ehdotukset uudelle sivulle (sama logiikka kuin Masterin _msK3Ehdotukset)', () => {
  const p = { id: 'p2', jaksofokus: { konsepti_avain: 'y_h1' }, arviointi_havaittu: { ball_control: 2, short_passing: 3, link_up: 4 } };
  const d = { konsepti: (a) => ({ nimi: 'Nimi ' + a }), ttItems: () => [{ avain: 'y_h1' }, { avain: 'y_h2' }, { avain: 'y_h6' }], pp: (x) => ({ ika: 12, joukkue: 'U13', id: x.id }) };
  it('heikoin havaittu → kortit (≤ 2, nykyistä jaksoa ei tarjota, syy vain henkilökunnalle, valittu:false)', () => {
    const k = ARV.tmKtK3Ehdotukset(p, d); expect(k.map((x) => x.avain)).toEqual(['y_h2', 'y_h6']); expect(k.every((x) => x.valittu === false && x.lause === '')).toBe(true); expect(k[0].nimi).toBe('Nimi y_h2'); expect(k[0].syy).toMatch(/Havaittu: Lyhyt syöttö/);   // syy (luku sulkeissa) vain henkilökunnan "miksi?"-rivillä
  });
  it('sallitut-suodatus (ttItems) ja pp-syöte välittyvät; virhe tai puuttuva data → [] (lomake aukeaa ilman tarjousta)', () => {
    let nahty = null; ARV.tmKtK3Ehdotukset(p, Object.assign({}, d, { ttItems: (pp) => { nahty = pp; return [{ avain: 'y_h6' }]; } })); expect(nahty).toEqual({ ika: 12, joukkue: 'U13', id: 'p2' });
    expect(ARV.tmKtK3Ehdotukset(p, Object.assign({}, d, { ttItems: () => [{ avain: 'y_h6' }] })).map((x) => x.avain)).toEqual(['y_h6']);
    expect(ARV.tmKtK3Ehdotukset(p, Object.assign({}, d, { ttItems: () => { throw new Error('x'); } }))).toEqual([]); expect(ARV.tmKtK3Ehdotukset(null, d)).toEqual([]); expect(ARV.tmKtK3Ehdotukset({ id: 'x' }, d)).toEqual([]);
  });
});

describe('K3a · reititys (kirjoitus katetaan selaintestissä: YKSI update, __kirj)', () => {
  it('anna_valita ja hylkaa ovat sheet-reittejä; kausitavoite on sheet (K3b); kuorma pysyy Masterissa; syvenna on sheet (K4b)', () => {
    expect(KS.tmKtToimiReitti('anna_valita')).toBe('sheet'); expect(KS.tmKtToimiReitti('hylkaa')).toBe('sheet'); expect(KS.tmKtToimiReitti('kausitavoite')).toBe('sheet');
    expect(KS.tmKtToimiReitti('kuorma')).toBe('master'); expect(KS.tmKtToimiReitti('syvenna')).toBe('sheet'); expect(KS.tmKtToimiReitti('kirjaa_keskustelu')).toBe('sheet');
  });
});
