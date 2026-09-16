/**
 * TalentMaster™ — Seurakerros TIER 1 (lib/tm_konsepti_resolve.js).
 *
 * Linjaus: "TalentMasterin totuus ei ole ainoa." Kaanon (TIER 0, generoitu lib) on OLETUS;
 * seura voi korvata kenttiä, piilottaa konseptin tai lisätä omansa (TIER 1, Firestore).
 *
 * Tämä sviitti lukitsee neljä asiaa:
 *   1) merge on KENTTÄ KERRALLAAN — muuttamaton kenttä tulee yhä kaanonista
 *   2) seuran vapaateksti kantaa `_seura_kentat` → sv-kerros osaa ohittaa sen (data, ei chrome)
 *   3) monivuokralais-ERISTYS — seuran A override ei näy seuralle B
 *   4) EI-TYHJYYS — jos merge ohitetaan (palautetaan suoraan kaanon), muokkaustestit punertavat
 */
import { describe, it, expect, beforeEach } from 'vitest';
import { createRequire } from 'module';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

const __dir = dirname(fileURLToPath(import.meta.url));
const require_ = createRequire(import.meta.url);
const TT = require_(join(__dir, '..', 'lib', 'tm_teknistaktiset.js'));
// lib lukee kaanonin globaaleista (selaimessa window) → asetetaan ne ennen resolvoijan latausta
globalThis.TM_TT_YOUTH = TT.TM_TT_YOUTH;
globalThis.TM_TT_JOUKKUE = TT.TM_TT_JOUKKUE;
globalThis.TM_TT_FUNDAMENTIT = TT.TM_TT_FUNDAMENTIT;
const K = require_(join(__dir, '..', 'lib', 'tm_konsepti_resolve.js'));

const SID_A = 'seura_a', SID_B = 'seura_b';
const AVAIN = 'y_h0';   // HAVAINNOINTI — kaanonissa nimi + kpi + kysymykset + pelaaja_miksi

beforeEach(() => K.tmKonseptiTyhjennaKerros());

describe('TIER 0 — kaanon löytyy ja on koskematon', () => {
  it('kaanonista löytyy y_h0 ja sillä on kpi-taulukko', () => {
    const k = K.tmKonseptiKaanon(AVAIN);
    expect(k).toBeTruthy();
    expect(k.nimi).toBe('HAVAINNOINTI');
    expect(Array.isArray(k.kpi)).toBe(true);
    expect(k.kpi.length).toBeGreaterThan(2);
  });
  it('resolvoi ilman seurakerrosta = kaanon (kopio, ei sama viite)', () => {
    const r = K.tmKonseptiResolvoi(AVAIN, SID_A);
    const k = K.tmKonseptiKaanon(AVAIN);
    expect(r.nimi).toBe(k.nimi);
    expect(r).not.toBe(k);                      // kopio → kaanonia ei mutatoida
    expect(r.lahde).toBeUndefined();            // ei seuraoverridea → ei 'seura'-leimaa
    expect(K.tmKonseptiOnMuokattu(r)).toBe(false);
  });
  it('tuntematon avain → null', () => {
    expect(K.tmKonseptiResolvoi('ei_ole_olemassa', SID_A)).toBeNull();
  });
});

describe('TIER 1 — merge kenttä kerrallaan (DoD 2)', () => {
  it('vain nimi muutettu → kpi/kysymykset tulevat YHÄ kaanonista', () => {
    K.tmKonseptiAsetaKerros(SID_A, { [AVAIN]: { nimi: 'PELINLUKU', paivitetty: '2026-09-16', muokkaaja_uid: 'u1', lahde: 'seura' } });
    const r = K.tmKonseptiResolvoi(AVAIN, SID_A);
    const kaanon = K.tmKonseptiKaanon(AVAIN);
    expect(r.nimi).toBe('PELINLUKU');                       // seuran arvo voittaa
    expect(r.kpi).toEqual(kaanon.kpi);                      // ← muuttamaton kenttä = kaanon
    expect(r.kysymykset).toEqual(kaanon.kysymykset);
    expect(r.pelaaja_miksi).toBe(kaanon.pelaaja_miksi);
    expect(r.dim).toBe(kaanon.dim);
  });
  it('kpi KORVAUTUU kokonaan (ei alkioittaista mergeä)', () => {
    const omaKpi = [{ koodi: 'a', teksti: 'Seuran oma kriteeri' }];
    K.tmKonseptiAsetaKerros(SID_A, { [AVAIN]: { kpi: omaKpi } });
    const r = K.tmKonseptiResolvoi(AVAIN, SID_A);
    expect(r.kpi).toEqual(omaKpi);
    expect(r.kpi.length).toBe(1);                           // kaanonin 4 kpi:tä EIVÄT jää perään
    expect(r.nimi).toBe('HAVAINNOINTI');                    // nimi yhä kaanonista
  });
  it('"palauta kaanoniin" = kentän poisto overridesta → kaanon näkyy taas', () => {
    K.tmKonseptiAsetaKerros(SID_A, { [AVAIN]: { nimi: 'PELINLUKU' } });
    expect(K.tmKonseptiResolvoi(AVAIN, SID_A).nimi).toBe('PELINLUKU');
    K.tmKonseptiAsetaKerros(SID_A, { [AVAIN]: { paivitetty: '2026-09-16' } });   // nimi pois, doc jää
    const r = K.tmKonseptiResolvoi(AVAIN, SID_A);
    expect(r.nimi).toBe('HAVAINNOINTI');
    expect(K.tmKonseptiOnMuokattu(r)).toBe(false);          // vain metakenttä jäljellä → ei "muokattu"
  });
  it('EI-TYHJYYS: ilman mergeä (pelkkä kaanon) muokkaus EI näkyisi', () => {
    K.tmKonseptiAsetaKerros(SID_A, { [AVAIN]: { nimi: 'PELINLUKU' } });
    expect(K.tmKonseptiResolvoi(AVAIN, SID_A).nimi).toBe('PELINLUKU');
    expect(K.tmKonseptiKaanon(AVAIN).nimi).toBe('HAVAINNOINTI');   // ← mutaatio: merge ohi → testi yllä punertaisi
  });
});

describe('TIER 1 — piilotus ja seuran omat konseptit', () => {
  const items = () => [{ avain: 'y_h0', nimi: 'HAVAINNOINTI' }, { avain: 'y_h1', nimi: 'X' }];
  it('piilotettu konsepti putoaa listalta', () => {
    K.tmKonseptiAsetaKerros(SID_A, { y_h0: { piilotettu: true } });
    const lista = K.tmKonseptiListaa(items(), SID_A).map((x) => x.avain);
    expect(lista).not.toContain('y_h0');
    expect(lista).toContain('y_h1');
    expect(K.tmKonseptiOnPiilotettu('y_h0', SID_A)).toBe(true);
  });
  it('seuran oma seura_*-konsepti tulee listalle ja resolvoituu ilman kaanonia', () => {
    K.tmKonseptiAsetaKerros(SID_A, {
      seura_kaannos: { oma: true, lahde: 'seura', nimi: 'KÄÄNNÖS PAINEESSA', dim: 'hyokkays', kpi: [{ koodi: 'a', teksti: 'Avaa lonkka' }] }
    });
    const lista = K.tmKonseptiListaa(items(), SID_A);
    const oma = lista.find((x) => x.avain === 'seura_kaannos');
    expect(oma).toBeTruthy();
    expect(oma.nimi).toBe('KÄÄNNÖS PAINEESSA');
    expect(oma.oma).toBe(true);
    expect(K.tmKonseptiResolvoi('seura_kaannos', SID_A).nimi).toBe('KÄÄNNÖS PAINEESSA');
  });
  it('seura_-namespace ei törmää kaanoniin (kaanonissa ei seura_-avaimia)', () => {
    const kaanonAvaimet = [...TT.TM_TT_YOUTH, ...TT.TM_TT_JOUKKUE,
      ...Object.values(TT.TM_TT_FUNDAMENTIT).flat()].map((x) => x.avain);
    expect(kaanonAvaimet.filter((a) => String(a).indexOf('seura_') === 0)).toEqual([]);
  });
});

describe('DATA-INTEGRITEETTI — seuran vapaateksti ei ole käännettävää chromea', () => {
  it('_seura_kentat listaa VAIN sisältökentät (ei kirjanpitoa)', () => {
    K.tmKonseptiAsetaKerros(SID_A, {
      [AVAIN]: { nimi: 'PELINLUKU', pelitilanne: 'seuran oma kuvaus', paivitetty: '2026-09-16', muokkaaja_uid: 'u1', lahde: 'seura', piilotettu: false }
    });
    const r = K.tmKonseptiResolvoi(AVAIN, SID_A);
    expect(r._seura_kentat.sort()).toEqual(['nimi', 'pelitilanne']);
    for (const meta of K.TM_K_META_KENTAT) expect(r._seura_kentat).not.toContain(meta);
    expect(K.tmKonseptiOnMuokattu(r)).toBe(true);
  });
  it('kaanonista tulevat kentät EIVÄT ole _seura_kentat-listassa → sv-kerros kääntää ne yhä', () => {
    K.tmKonseptiAsetaKerros(SID_A, { [AVAIN]: { nimi: 'PELINLUKU' } });
    const r = K.tmKonseptiResolvoi(AVAIN, SID_A);
    expect(r._seura_kentat).toContain('nimi');
    expect(r._seura_kentat).not.toContain('pelitilanne');    // kaanonin kenttä → kääntyy normaalisti
    expect(r._seura_kentat).not.toContain('kpi');
  });
});

describe('MONIVUOKRALAIS-ERISTYS (DoD 5)', () => {
  it('seuran A override EI näy seuralle B', () => {
    K.tmKonseptiAsetaKerros(SID_A, { [AVAIN]: { nimi: 'A:N NIMI' } });
    K.tmKonseptiAsetaKerros(SID_B, {});
    expect(K.tmKonseptiResolvoi(AVAIN, SID_A).nimi).toBe('A:N NIMI');
    expect(K.tmKonseptiResolvoi(AVAIN, SID_B).nimi).toBe('HAVAINNOINTI');
    expect(K.tmKonseptiKerros(SID_B)).toEqual({});
  });
  it('A:n piilotus ja A:n oma konsepti eivät vuoda B:lle', () => {
    K.tmKonseptiAsetaKerros(SID_A, { y_h0: { piilotettu: true }, seura_x: { oma: true, nimi: 'A-OMA' } });
    K.tmKonseptiAsetaKerros(SID_B, {});
    const bLista = K.tmKonseptiListaa([{ avain: 'y_h0' }], SID_B).map((x) => x.avain);
    expect(bLista).toEqual(['y_h0']);
    expect(K.tmKonseptiOnPiilotettu('y_h0', SID_B)).toBe(false);
    expect(K.tmKonseptiOmat(SID_B)).toEqual([]);
  });
  it('tuntematon seuraId → tyhjä kerros (ei kaatumista, ei vuotoa)', () => {
    K.tmKonseptiAsetaKerros(SID_A, { [AVAIN]: { nimi: 'A' } });
    expect(K.tmKonseptiResolvoi(AVAIN, 'ei_ladattu').nimi).toBe('HAVAINNOINTI');
    expect(K.tmKonseptiResolvoi(AVAIN, null).nimi).toBe('HAVAINNOINTI');
    expect(K.tmKonseptiKerrosLadattu('ei_ladattu')).toBe(false);
  });
});

describe('TIER 0 koskemattomuus (reunaehto B)', () => {
  it('resolvointi EI mutatoi kaanon-objektia', () => {
    const ennen = JSON.stringify(K.tmKonseptiKaanon(AVAIN));
    K.tmKonseptiAsetaKerros(SID_A, { [AVAIN]: { nimi: 'X', kpi: [], kysymykset: ['q'] } });
    K.tmKonseptiResolvoi(AVAIN, SID_A);
    K.tmKonseptiListaa([{ avain: AVAIN }], SID_A);
    expect(JSON.stringify(K.tmKonseptiKaanon(AVAIN))).toBe(ennen);
  });
});
