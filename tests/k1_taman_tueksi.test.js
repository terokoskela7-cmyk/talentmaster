/**
 * K1 §2–3: "Tämän tueksi" -kortti + "Joukkueen jakso" -rivi (lib/tm_taman_tueksi.js) ja §7.22-portti. Fixturet keksittyjä.
 */
import { describe, it, expect } from 'vitest';
import { createRequire } from 'module';
const require = createRequire(import.meta.url);
const K = require('../lib/tm_taman_tueksi.js');
const JJ = require('../lib/tm_joukkuejakso.js');

const H = (lisa) => Object.assign({ id: 'h1', nimi: 'Seinäsyöttö', kesto_min: 10, tila: 'hyvaksytty', kaytto: 'koti', lahde: 'seura', lahde_nimi: 'Keksitty FC', pelaajan_ohje: 'Syötä seinään ja ota vastaan.' }, lisa || {});
const TT = (lisa) => Object.assign({ alue: 'fy_rajahtavyys', kuvaus: 'Kehonhallinta', perustelu: 'Tukee ydinvahvuutta (Tempokuljetus): kehonhallinta.', lahde: { tyyppi: 'testi', viite: 'lin30m', pvm: '2026-10-01' }, harjoitteet: [H()] }, lisa || {});
const JF = (tt) => ({ konsepti_avain: 'x', tukitavoitteet: tt });

describe('tmTukiPerustelu', () => {
  it('generoitu oletus: "Tukee ydinvahvuutta (X): …" → "Tukee vahvuuttasi (X): …"; muu ydinvahvuus-sana → vahvuus', () => {
    expect(K.tmTukiPerustelu('Tukee ydinvahvuutta (Tempokuljetus): kehonhallinta.')).toBe('Tukee vahvuuttasi (Tempokuljetus): kehonhallinta.');
    expect(K.tmTukiPerustelu('Tukee ydinvahvuutta: kehonhallinta.')).toBe('Tukee vahvuuttasi: kehonhallinta.'); expect(K.tmTukiPerustelu('Pitää ydinvahvuuden käytössä')).toBe('Pitää vahvuuden käytössä');
  });
  it('valmentajan oma teksti sellaisenaan jos läpäisee tarkistuksen', () => { expect(K.tmTukiPerustelu('Jotta pysyt mukana pelissä myös virheen jälkeen')).toBe('Jotta pysyt mukana pelissä myös virheen jälkeen'); expect(K.tmTukiPerustelu('  Rauhallinen aloitus  ')).toBe('Rauhallinen aloitus'); });
  it('SALLITTU (K1-korjaus): järjestysnumero/numero taidon nimessä — "1. kosketus", "2. pallo", "1v1", "3 pelaajaa"; taidon sanat "havainnointi", "arvioi", "testaa" eivät ole lähdeviitteitä', () => {
    for (const s of ['1. kosketukseen kuluu hyvä pallon suojaus ja havainnointi', 'Harjoittelet 1v1-tilanteita', '2. pallo kuuluu aina vapaalle', 'Pelaa 3 pelaajaa vastaan', 'Arvioi tilanne ennen kosketusta', 'Testaa eri suuntia', 'Havainnoi kaverin paikka', 'Pelaa 2. kosketuksella']) expect(K.tmTukiPerustelu(s), s).toBe(s);
    expect(K.tmTukiPerustelu('Tukee ydinvahvuutta (1v1-kuljetus): 1. kosketus.')).toBe('Tukee vahvuuttasi (1v1-kuljetus): 1. kosketus.');   // numero vahvuuden nimessä ei enää hylkää
    expect(K.tmTamanTueksiRivit(JF([TT({ perustelu: '1. kosketukseen kuluu hyvä pallon suojaus ja havainnointi' })]))[0].perustelu).toBe('1. kosketukseen kuluu hyvä pallon suojaus ja havainnointi');
  });
  it('ESTETTY (mittaus-/arvosanamuodot): desimaaliluku, luku + yksikkö (s, m, cm, mm, km, km/h, %, kpl, min, kg), X/Y, "taso N", pisteet, sarja X x Y', () => {
    for (const s of ['Nopeus 4.8 s', 'Aika 4,8', 'Matka 10 m', 'Matka 10m', 'Hyppy 35 cm', 'Vauhti 24 km/h', 'Onnistui 80 %', 'Onnistui 80%', 'Teit 12 kpl', 'Kesto 5 min', 'Paino 70 kg', 'Teit 5 s', 'Tulos 4/5', 'Tulos 4 / 5', 'Taso 2', 'taso2', 'Sait 3 pistettä', 'Pisteet nousivat', '3 x 5', '3×5', 'Tavoite 3 x 5']) expect(K.tmTukiPerustelu(s), s).toBeNull();
    for (const s of ['Pelaa 10 sekuntia', 'Tee 3 syöttöä']) expect(K.tmTukiPerustelu(s), s).toBe(s);   // luku + sana joka alkaa yksikön kirjaimella EI ole yksikkö ("s" ≠ "sekuntia"/"syöttöä")
  });
  it('POIS (null): numerot, KIELLETYT (heikkous/rajoite/kriittinen), lähdeviitteet, tulokset/tasot, ketjunimet, tekniset avaimet, tyhjä/ei-teksti', () => {
    for (const s of ['Kehonhallinta 3 x 5', 'Nopeus 4.8 s', 'Tämä on heikkous', 'Rajoite pelissä', 'Kriittinen kohta', 'Nousi testistä', 'Näkyi havainnosta', 'Tuli arviosta', 'Mittaustulos hyvä', 'Taso 2', 'Vertailu muihin', 'SBL-ketju', 'DIAG-pelaaja', 'fy_rajahtavyys', 'FLEI', 'OVR', '', '   ', null, undefined, 5, {}]) expect(K.tmTukiPerustelu(s), String(s)).toBeNull();
      });
  it('ei yli-pudota tavallisia sanoja (tulossa, kestävyys, testaamaton ei)', () => { expect(K.tmTukiPerustelu('Pelaat tulossa olevassa pelissä rohkeammin')).toContain('tulossa'); expect(K.tmTukiPerustelu('Kestävyys auttaa jaksamaan')).toBe('Kestävyys auttaa jaksamaan'); });
});

describe('tmTamanTueksiRivit', () => {
  it('0 / 1 / 2 riviä (enintään 2); kuvaus + pelaajamuotoinen perustelu + harjoitteet; EI alue/lahde-kenttiä', () => {
    expect(K.tmTamanTueksiRivit(JF([]))).toEqual([]); expect(K.tmTamanTueksiRivit(null)).toEqual([]); expect(K.tmTamanTueksiRivit({})).toEqual([]);
    const yksi = K.tmTamanTueksiRivit(JF([TT()])); expect(yksi).toHaveLength(1);
    expect(Object.keys(yksi[0]).sort()).toEqual(['harjoitteet', 'kuvaus', 'perustelu']); expect(yksi[0]).toMatchObject({ kuvaus: 'Kehonhallinta', perustelu: 'Tukee vahvuuttasi (Tempokuljetus): kehonhallinta.' }); expect(yksi[0].harjoitteet.map((h) => h.nimi)).toEqual(['Seinäsyöttö']);
    expect(K.tmTamanTueksiRivit(JF([TT(), TT({ kuvaus: 'Ketteryys' }), TT({ kuvaus: 'Kolmas' })])).map((r) => r.kuvaus)).toEqual(['Kehonhallinta', 'Ketteryys']);
    expect(JSON.stringify(yksi)).not.toMatch(/fy_|testi|lin30m|"alue"|"tyyppi"|"viite"/); expect(yksi[0].harjoitteet[0].lahde_nimi).toBe('Keksitty FC');   // harjoitteen oma lähdemerkintä (seuran nimi) on kotiharjoitteiden vanha, hyväksytty esitys — ei testin/havainnon lähde
  });
  it('VANHA tukiosa-muoto: yhden rivin fallback (tmTukitavoitteet) — tukiosa.alue = kuvaus, perustelu, harjoitteet', () => {
    const r = K.tmTamanTueksiRivit({ tukiosa: { alue: 'Kehonhallinta', perustelu: 'Jotta pysyt mukana', harjoitteet: [H()] } }); expect(r).toHaveLength(1); expect(r[0]).toMatchObject({ kuvaus: 'Kehonhallinta', perustelu: 'Jotta pysyt mukana' }); expect(r[0].harjoitteet).toHaveLength(1);
    expect(K.tmTamanTueksiRivit({ tukiosa: { alue: '', perustelu: '' } })).toEqual([]);
  });
  it('perustelu pois (numerot/KIELLETYT) → kuvaus näytetään yksin; kuvaus jossa tekninen avain/ketjunimi/kielletty sana → rivi pois', () => {
    expect(K.tmTamanTueksiRivit(JF([TT({ perustelu: 'Tavoite 3 x 5' })]))[0]).toMatchObject({ kuvaus: 'Kehonhallinta', perustelu: null });
    expect(K.tmTamanTueksiRivit(JF([TT({ kuvaus: 'fy_nopeus' }), TT({ kuvaus: 'SBL' }), TT({ kuvaus: 'Heikkous' }), TT({ kuvaus: '' }), TT({ kuvaus: null })]))).toEqual([]);
  });
  it('kotiharjoitteiden puolustava suodatus: joukkue-käyttöinen ja ei-hyväksytty eivät näy; tyhjä harjoitelista OK', () => {
    const r = K.tmTamanTueksiRivit(JF([TT({ harjoitteet: [H({ id: 'a', nimi: 'Koti' }), H({ id: 'b', nimi: 'Joukkue', kaytto: 'joukkue' }), H({ id: 'c', nimi: 'Luonnos', tila: 'luonnos' })] })])); expect(r[0].harjoitteet.map((h) => h.nimi)).toEqual(['Koti']);
    expect(K.tmTamanTueksiRivit(JF([TT({ harjoitteet: [] })]))[0].harjoitteet).toEqual([]); expect(K.tmTamanTueksiRivit(JF([TT({ harjoitteet: undefined })]))[0].harjoitteet).toEqual([]);
  });
});

describe('tmTamanTueksiHTML + §7.22-portti', () => {
  const html = (jf, o) => K.tmTamanTueksiHTML(K.tmTamanTueksiRivit(jf), o);
  it('tyhjä lista (Leikkijä, D18 = 0, ei tavoitteita) → tyhjä merkkijono (ei tyhjää laatikkoa)', () => { expect(html(JF([]))).toBe(''); expect(html({})).toBe(''); expect(K.tmTamanTueksiHTML([])).toBe(''); expect(K.tmTamanTueksiHTML(null)).toBe(''); });
  it('kortti: otsikko "Tämän tueksi", kuvaus isona, perustelu, harjoitteet samalla esityksellä (tm-kotiharjoitteet); t() läpi; escapaa', () => {
    const h = html(JF([TT({ kuvaus: 'Kehon <b>hallinta</b>', harjoitteet: [H({ nimi: '<i>x</i>' })] })]), { t: (k) => (k === 'k1_taman_tueksi' ? 'Till stöd' : k) });
    expect(h).toContain('Till stöd'); expect(h).toContain('tm-taman-tueksi'); expect(h).toContain('tm-kotiharjoitteet'); expect(h).not.toContain('<b>'); expect(h).not.toContain('<i>'); expect(h).toContain('Kehon &lt;b&gt;hallinta'); expect(html(JF([TT()]))).toContain('Tämän tueksi');
  });
  it('§7.22 / D24: ei lukuja muodossa X/5, ei OVR/FLEI, ei lähdesanoja (testistä/havainnosta/arviosta), ei fy_-avaimia eikä ketjunimiä, ei hex-värejä, ei symboleja/alueita kentällä', () => {
    const jf = JF([TT({ lahde: { tyyppi: 'testi', viite: 'lin30m', pvm: '2026-10-01' } }), TT({ alue: 'tekninen_taktinen', kuvaus: 'Ensikosketus', perustelu: 'Nousi havainnosta 4/5 SBL', lahde: { tyyppi: 'havainto', viite: 'a', pvm: '2026-10-02' } })]);
    const h = html(jf); expect(h.length).toBeGreaterThan(100);
    expect(h).not.toMatch(/\d\s*\/\s*5\b/); expect(h).not.toMatch(/\bOVR\b|\bFLEI\b/); expect(h).not.toMatch(/testistä|havainnosta|arviosta|tyyppi|viite|lin30m/i); expect(h).not.toMatch(/>[^<]*\blahde\b/i); expect(h).not.toMatch(/fy_|\b(SBL|SFL|LL|DIAG|DFL)\b/); expect(h).not.toMatch(/#[0-9a-fA-F]{3,6}\b/);
    expect(h).not.toMatch(/<svg|data-pitch|class="kt"/); expect(h).not.toMatch(/heikkou|rajoite|kriittin/i);
  });
});

describe('tmJoukkueenJaksoRiviHTML', () => {
  const D = { jaksofokus: { osa_alueet: { tekninen_taktinen: { nimi: 'Kuljettaminen' } }, alku: '2026-10-05', kesto_vk: 6, viikot: [{ vk: 2, tavoite: 'Käännös ja suojaus' }] } };
  const S = JJ.tmJoukkuejaksoSnapshot(D, 'kpv_u13');
  it('nimi + kuluva viikko + viikon tavoite; escapaa; ei lahde/asetti', () => {
    const h = K.tmJoukkueenJaksoRiviHTML(S, '2026-10-14'); expect(h).toContain('Joukkueen jakso · Viikko 2'); expect(h).toContain('Kuljettaminen'); expect(h).toContain('Käännös ja suojaus'); expect(h).not.toMatch(/lahde|asetti|uid/i);
    expect(K.tmJoukkueenJaksoRiviHTML(Object.assign({}, S, { nimi: '<s>x</s>' }), '2026-10-14')).toContain('&lt;s&gt;');
  });
  it('ei tavoitetta viikolle → vain nimi (ei tyhjää tavoiterivi); viimeinen viikko ok', () => {
    const h = K.tmJoukkueenJaksoRiviHTML(S, '2026-10-05'); expect(h).toContain('Viikko 1'); expect(h).toContain('Kuljettaminen'); expect(h).not.toContain('Käännös'); expect(h.match(/<div/g).length).toBe(3);
    expect(K.tmJoukkueenJaksoRiviHTML(S, '2026-11-15')).toContain('Viikko 6');
  });
  it('PIILOON: umpeutunut jakso, ei viitettä, vanha {jid, alku} -viite (ei snapshotia), vasta alkava jakso, rikkinäinen', () => {
    for (const [v, p] of [[S, '2026-11-16'], [null, '2026-10-14'], [{ jid: 'x', alku: '2026-10-05' }, '2026-10-14'], [S, '2026-10-04'], [{}, '2026-10-14'], ['x', '2026-10-14']]) expect(K.tmJoukkueenJaksoRiviHTML(v, p), JSON.stringify(v) + p).toBe('');
  });
});
