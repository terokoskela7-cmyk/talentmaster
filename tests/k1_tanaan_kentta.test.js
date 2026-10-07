/**
 * K1 osa 2b — lib/tm_tanaan_kentta.js (tilat, osat, HTML) ja Pelaaja_v7-adapteri (rA1Kentta, lippu, päivän treeni). Fixturet keksittyjä; Topias K. = KPV U13 -testipelaaja.
 */
import { describe, it, expect } from 'vitest';
import { readFileSync } from 'fs';
import { createHash } from 'crypto';
import { createRequire } from 'module';
import vm from 'vm';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';
const require = createRequire(import.meta.url);
const juuri = join(dirname(fileURLToPath(import.meta.url)), '..');
const SRC = readFileSync(join(juuri, 'TalentMaster_Pelaaja_v7.html'), 'utf8');
const K = require('../lib/tm_tanaan_kentta.js'), TKent = require('../lib/tm_kentta.js'), JJ = require('../lib/tm_joukkuejakso.js'), HL = require('../harjoitelogiikka_v4.js');

const TANAAN = '2026-11-11';   // keskiviikko
const ALKOI = new Date(2026, 10, 9).toISOString();   // paikallinen keskiyö → ISO (kuten V1/J4 kirjoittavat)
const SNAP = JJ.tmJoukkuejaksoSnapshot({ jaksofokus: { osa_alueet: { tekninen_taktinen: { nimi: 'Kuljettaminen' } }, alku: '2026-11-09', kesto_vk: 6, viikot: [{ vk: 1, tavoite: 'Ensikosketus pelaa' }] } }, 'kpv_u13');
const H1 = { id: 'h1', nimi: 'Seinäsyöttö', kesto_min: 10, tila: 'hyvaksytty', kaytto: 'koti', lahde: 'seura', lahde_nimi: 'Keksitty FC', pelaajan_ohje: 'Syötä seinään.' };
const TT1 = { alue: 'fy_ketteryys', kuvaus: 'Kehonhallinta', perustelu: 'Tukee ydinvahvuutta (Tempokuljetus): kehonhallinta.', lahde: { tyyppi: 'testi', viite: 'lin30m', pvm: '2026-10-01' }, harjoitteet: [H1] };
const JAKSO = (lisa) => Object.assign({ konsepti_avain: 'y_h2', konsepti_nimi: 'Kuljettaminen', kesto_vk: 6, alkoi: ALKOI, tukitavoitteet: [TT1], joukkuejakso_viite: SNAP }, lisa || {});
const TOPIAS = (lisa) => Object.assign({ id: 'topias', etunimi: 'Topias', seuraId: 'kpv', syntymaVuosi: 2013, luotu: '2026-03-01', tki_kehityskohde: 'syotto', ydinvahvuus: { kuvaus: 'Tempokuljetus' }, jaksofokus: JAKSO() }, lisa || {});

describe('tmTanaanTila — neljä tilaa', () => {
  it('jakso käynnissä: viikko lasketaan jakson omasta alusta paikallisena päivänä; nimi = konsepti_nimi (ei teknistä avainta)', () => {
    expect(K.tmTanaanTila(TOPIAS(), { tanaan: TANAAN })).toEqual({ tila: 'jakso', nimi: 'Kuljettaminen', vahvuus: 'Tempokuljetus', viikko: { n: 1, k: 6 }, kesto_vk: 6 });
    expect(K.tmTanaanTila(TOPIAS(), { tanaan: '2026-11-18' }).viikko).toEqual({ n: 2, k: 6 }); expect(K.tmTanaanTila(TOPIAS(), { tanaan: '2026-12-20' }).viikko).toEqual({ n: 6, k: 6 });
    expect(K.tmTanaanTila(TOPIAS(), { tanaan: '2026-11-08' }).viikko).toEqual({ n: 1, k: 6 });   // ennen alkua → viikko 1
    expect(K.tmTanaanTila(TOPIAS({ jaksofokus: JAKSO({ konsepti_nimi: undefined }) }), { tanaan: TANAAN }).nimi).toBeNull();
    expect(K.tmTanaanTila(TOPIAS({ jaksofokus: JAKSO({ alkoi: undefined, alku: '2026-11-02' }) }), { tanaan: TANAAN }).viikko.n).toBe(2);
  });
  it('sunnuntai (jakso käynnissä) → tila sunnuntai; muuten ei', () => { expect(K.tmTanaanTila(TOPIAS(), { tanaan: '2026-11-15' }).tila).toBe('sunnuntai'); expect(K.tmTanaanTila(TOPIAS(), { tanaan: '2026-11-14' }).tila).toBe('jakso'); expect(K.tmTanaanTila(TOPIAS({ jaksofokus: null }), { tanaan: '2026-11-15' }).tila).toBe('vahvuus'); });
  it('ei jaksoa + vahvuus (ydinvahvuus tai pelaajan valinta) → vahvuus; ei vahvuutta → tyhja; umpeutunut jakso ja "valittavana" = ei jaksoa; tyhjä/rikkinäinen pelaaja ei heitä', () => {
    expect(K.tmTanaanTila(TOPIAS({ jaksofokus: null }), { tanaan: TANAAN })).toMatchObject({ tila: 'vahvuus', vahvuus: 'Tempokuljetus', viikko: null, nimi: null });
    expect(K.tmTanaanTila({ ydinvahvuus_valinta: { vaihtoehto: 'Nopea 1v1' } }, { tanaan: TANAAN })).toMatchObject({ tila: 'vahvuus', vahvuus: 'Nopea 1v1' });
    expect(K.tmTanaanTila({}, { tanaan: TANAAN })).toMatchObject({ tila: 'tyhja', vahvuus: null }); expect(K.tmTanaanTila(TOPIAS({ ydinvahvuus: null, jaksofokus: null }), { tanaan: TANAAN }).tila).toBe('tyhja');
    expect(K.tmTanaanTila(TOPIAS(), { tanaan: '2026-12-21' }).tila).toBe('vahvuus');   // 9.11. + 42 pv = 21.12. → päättynyt
    expect(K.tmTanaanTila(TOPIAS({ jaksofokus: JAKSO({ tila: 'valittavana' }) }), { tanaan: TANAAN }).tila).toBe('vahvuus');
    for (const v of [null, undefined, 5, 'x']) expect(() => K.tmTanaanTila(v, { tanaan: TANAAN })).not.toThrow(); expect(K.tmTanaanTila(null).tila).toBe('tyhja');
  });
});

describe('tmTanaanOsat — jaksofokus.osat → konsepti_avain → kpi → piiloon (ei arvata)', () => {
  const KAANON = (avain) => (avain === 'y_h2' ? { kpi: [{ koodi: 'a', teksti: 'Laukaus vauhdista' }, { koodi: 'b', teksti: 'Heikompi jalka' }, { koodi: 'c', teksti: 'Katse maaliin' }, { koodi: 'd', teksti: 'Neljäs ei mukaan' }] } : null);
  it('jaksofokus.osat voittaa (merkkijonot ja {teksti|kuvaus|nimi}); enintään 3; kirjaimet a–c', () => {
    expect(K.tmTanaanOsat({ osat: ['Yksi', { teksti: 'Kaksi' }, { kuvaus: 'Kolme' }, { nimi: 'Neljä' }], konsepti_avain: 'y_h2' }, { kaanon: KAANON })).toEqual([{ k: 'a', teksti: 'Yksi' }, { k: 'b', teksti: 'Kaksi' }, { k: 'c', teksti: 'Kolme' }]);
  });
  it('ilman osia → konsepti_avain → kanonin kpi-tekstit (a–c, max 3); tuntematon avain / ei kaanon-hakua → []', () => {
    expect(K.tmTanaanOsat({ konsepti_avain: 'y_h2' }, { kaanon: KAANON })).toEqual([{ k: 'a', teksti: 'Laukaus vauhdista' }, { k: 'b', teksti: 'Heikompi jalka' }, { k: 'c', teksti: 'Katse maaliin' }]);
    expect(K.tmTanaanOsat({ konsepti_avain: 'x_x' }, { kaanon: KAANON })).toEqual([]); expect(K.tmTanaanOsat({ konsepti_avain: 'y_h2' }, {})).toEqual([]); expect(K.tmTanaanOsat({ konsepti_avain: 'y_h2' }, { kaanon: () => { throw new Error('x'); } })).toEqual([]);
    expect(K.tmTanaanOsat({ osat: [] , konsepti_avain: 'y_h2' }, { kaanon: KAANON })).toHaveLength(3); expect(K.tmTanaanOsat(null, { kaanon: KAANON })).toEqual([]); expect(K.tmTanaanOsat({}, { kaanon: KAANON })).toEqual([]);
  });
  it('kielletyt sanat ja tekniset avaimet jätetään pois yksittäin (KIELLETYT, fy_, ketjunimet)', () => {
    expect(K.tmTanaanOsat({ osat: ['Heikkous pelissä', 'fy_nopeus', 'SBL-ketju', 'Hyvä osa', 'Rajoite'] }, {})).toEqual([{ k: 'a', teksti: 'Hyvä osa' }]);
  });
});

describe('tmTanaanKenttaHTML / tmPaivanTreeniHTML / tmKuittausHTML', () => {
  const kentta = (spec) => TKent.tmKentta(spec, { wrap: true });
  const x = (p, tanaan) => Object.assign(K.tmTanaanTila(p, { tanaan: tanaan || TANAAN }), { osat: [{ k: 'a', teksti: 'Laukaus vauhdista' }, { k: 'b', teksti: 'Heikompi jalka' }] });
  it('jakso: "Viikko N" + jakson nimi · kesto · vahvuus; kenttä (koko puoli, EI asetta eikä reittiä); osat a–b sanoin', () => {
    const h = K.tmTanaanKenttaHTML(x(TOPIAS()), { kentta });
    expect(h).toContain('data-k1-tila="jakso"'); expect(h).toContain('Viikko 1'); expect(h).toContain('Kuljettaminen · 6 viikkoa · vahvuutesi: Tempokuljetus'); expect(h).toContain('class="kt"'); expect(h).toContain('viewBox="0 0 100 84"'); expect(h).not.toMatch(/class="kt-(ase|reitti|vk|vk-tehty|vk-nyt)"/); expect(h).not.toMatch(/kt-ase|oma alue|ase puuttuu/); expect(h).toContain('<div class="kt-layer"></div>');   // pelkkä kenttä: ei aluelaatikkoa, ei tekstiä
    expect(h).toContain('Laukaus vauhdista'); expect(h).toContain('Heikompi jalka'); expect(h).not.toContain('k1-tyhja');
  });
  it('vahvuus: "Oma kenttä" + valmentaja valmistelee + vahvuuden nimi; tyhja: "Vielä tyhjä, ja se on ok" + "Siihen asti: pelaa."; sunnuntai: K4-koukku, sisältö tyhjä', () => {
    const v = K.tmTanaanKenttaHTML(x(TOPIAS({ jaksofokus: null })), { kentta }); expect(v).toContain('Oma kenttä'); expect(v).toContain('Valmentaja valmistelee jaksoa'); expect(v).toContain('Vahvuutesi: <b'); expect(v).toContain('Tempokuljetus'); expect(v).not.toContain('k1-osa"');
    const t = K.tmTanaanKenttaHTML(x({}), { kentta }); expect(t).toContain('Vielä tyhjä, ja se on ok'); expect(t).toContain('Siihen asti: pelaa.'); expect(t).toContain('data-k1-tila="tyhja"');
    const s = K.tmTanaanKenttaHTML(x(TOPIAS(), '2026-11-15'), { kentta }); expect(s).toContain('data-k1-tila="sunnuntai"'); expect(s).toContain('id="k1-sunnuntai"'); expect(s).toContain('Viikko 1');
  });
  it('ilman kenttä-funktiota ei kaadu; arvot escapataan; t() läpi (avain → fi-oletus)', () => {
    expect(() => K.tmTanaanKenttaHTML(x(TOPIAS()), {})).not.toThrow(); const p = TOPIAS(); p.jaksofokus.konsepti_nimi = '<b>x</b>'; const h = K.tmTanaanKenttaHTML(x(p), { kentta }); expect(h).not.toContain('<b>x'); expect(h).toContain('&lt;b&gt;x');
    expect(K.tmTanaanKenttaHTML(x(TOPIAS()), { t: (k) => (k === 'k1_viikko' ? 'Vecka' : k) })).toContain('Vecka 1');
  });
  it('päivän treeni: nimi, kesto, "jaksosta"-merkintä, kirjaa-nappi (#dKirjausBtn → _kirjaaHarjoite(\'D\')); ei treeniä → tyhjä', () => {
    const h = K.tmPaivanTreeniHTML({ nimi: 'Porttikuljetus', kesto: '12 min', ohje: 'Kuljeta.', jaksosta: true }, { kirjausFn: '_kirjaaHarjoite' }); expect(h).toContain('Päivän treeni · 12 min · jaksosta'); expect(h).toContain('id="dKirjausBtn"'); expect(h).toContain("_kirjaaHarjoite('D')"); expect(h).toContain('Porttikuljetus');
    expect(K.tmPaivanTreeniHTML({ nimi: 'X' }, {})).not.toContain('jaksosta'); expect(K.tmPaivanTreeniHTML(null, {})).toBe(''); expect(K.tmPaivanTreeniHTML({}, {})).toBe('');
  });
  it('kuittaus: piilossa oletuksena (#k1Kuittaus display:none), käyttää olemassa olevia tmFiilinki/tmKuormitus-kahvoja ja id:itä fiiRow/kuormitusRow; Leikkijällä 3 hymiötä', () => {
    const h = K.tmKuittausHTML({}); expect(h).toContain('id="k1Kuittaus"'); expect(h).toContain('display:none'); expect(h).toContain('id="fiiRow"'); expect(h).toContain('id="kuormitusRow"'); expect(h).toContain('tmFiilinki(5,this)'); expect(h).toContain('tmKuormitus(8,this)'); expect(h.match(/tmFiilinki\(/g).length).toBe(4);
    expect(K.tmKuittausHTML({ leikkija: true }).match(/tmFiilinki\(/g).length).toBe(3);
  });
});

// ── Pelaaja_v7-adapteri (SIVUN oikea koodi vm:ssä) ──
function pura(tunniste) { const i = SRC.indexOf(tunniste); expect(i, tunniste).toBeGreaterThan(-1); let d = 0; for (let k = SRC.indexOf('{', i); k < SRC.length; k++) { if (SRC[k] === '{') d++; else if (SRC[k] === '}' && !--d) return SRC.slice(i, k + 1); } throw new Error('sulkeet'); }
function ymp({ p = TOPIAS(), julkiset = { kentta: true }, julkisetPuuttuu = false, julkisetVirhe = false, pankki = [], demo = false, libit = true, stage = '2_rakentaja', tab = 'tanaan' } = {}) {
  const log = { luvut: [], draw: 0, kuittaus: null };
  const clone = (o) => JSON.parse(JSON.stringify(o));
  const node = (path, ehto) => ({ collection: (c) => node(path + '/' + c), doc: (d) => node(path + '/' + d), where: (f, op, v) => node(path, (ehto ? ehto + '&' : '') + f + op + v),
    get: async () => { log.luvut.push(path + (ehto ? '?' + ehto : ''));
      if (path === 'seurat/kpv/liput/julkiset') { if (julkisetVirhe) throw new Error('permission-denied'); return { exists: !julkisetPuuttuu, data: () => (julkisetPuuttuu ? undefined : julkiset) }; }
      if (path === 'seurat/kpv/harjoitepankki') { return { docs: pankki.map((h, i) => ({ id: 'r' + i, data: () => clone(h) })) }; }
      return { exists: false, data: () => undefined, docs: [] }; } });
  const sb = { console: { warn() {} }, Date, Object, Array, String, Number, JSON, Math, Promise, setTimeout, _isDemoUser: demo, _ladattu: {}, _pelaaja: p, _tab: tab, _sc: 'main', _stage: stage, _viimeisinKehu: null, _seuraId: 'kpv',
    _db: node('seurat').doc ? null : null, _paivaIso: () => TANAAN, _thEsc: (s) => String(s == null ? '' : s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;'),
    T: (k) => ({ pallo_joka_paiva: 'Pallo joka päivä', kirjaa_tehdyksi: 'Kirjaa tehdyksi', takautuva_linkki: 'Kirjaa takautuvasti' }[k] || 'pelaaja.' + k), hdr: (v) => '<div class="hdr">' + v + '</div>',
    rA1: () => 'VANHA-RA1', _p7NotifHTML: () => '<div class="notif-merkki"></div>', _p7AikatauluHTML: () => '<div class="aikataulu-merkki"></div>', draw: () => { log.draw++; }, valitsePaivanHarjoite: HL.valitsePaivanHarjoite, PANKKI: HL.PANKKI,
    tmKonseptiKaanon: (a) => (a === 'y_h2' ? { kpi: [{ koodi: 'a', teksti: 'Laukaus vauhdista' }, { koodi: 'b', teksti: 'Heikompi jalka' }] } : null) };
  sb._db = node('seurat').doc ? { collection: (c) => node(c) } : null;
  sb.window = sb;
  if (libit) Object.assign(sb, { TM_LIPUT: require('../lib/tm_liput.js'), TM_TANAAN_KENTTA: K, TM_TAMAN_TUEKSI: require('../lib/tm_taman_tueksi.js'), tmKentta: TKent.tmKentta, tmKenttaCss: TKent.tmKenttaCss, TM_JOUKKUEJAKSO: JJ, TM_TUKITAVOITTEET: require('../lib/tm_tukitavoitteet.js'), TM_KIELLETYT: require('../lib/tm_kielletyt.js'), TM_KOTIHARJOITTEET: require('../lib/tm_kotiharjoitteet.js') });
  vm.createContext(sb);
  vm.runInContext(['async function _p7LataaLiput(', 'function _p7KenttaKaytossa(', 'async function _p7LataaSeuranPankki(', 'function _p7K1T(', 'function _p7K1NaytaKuittaus(', 'function _p7K1KehuHTML(', 'function _p7K3Lisa(', 'function _p7K3SitoumusHTML(', 'function _p7VkHTML(', 'function rA1Kentta('].map(pura).join(';\n') + ';\nthis._p7LataaLiput=_p7LataaLiput;this._p7KenttaKaytossa=_p7KenttaKaytossa;this._p7LataaSeuranPankki=_p7LataaSeuranPankki;this._p7K1NaytaKuittaus=_p7K1NaytaKuittaus;this.rA1Kentta=rA1Kentta;', sb);
  sb.document = { getElementById: (id) => (id === 'k1Kuittaus' ? { style: { set display(v) { log.kuittaus = v; } } } : null) };
  return { sb, log };
}
const lopeta = () => new Promise((r) => setTimeout(r, 0));
const kortti = (e) => e.sb.rA1Kentta();

describe('Pelaaja_v7 · lippu liput/julkiset', () => {
  it('lippu päällä: ensimmäinen kutsu palauttaa false + käynnistää luvun; luku ({kentta:true}) → true + uudelleenpiirto; pelaaja lukee VAIN seurat/kpv/liput/julkiset', async () => {
    const e = ymp(); expect(e.sb._p7KenttaKaytossa()).toBe(false); await e.sb._p7LataaLiput(); await lopeta(); expect(e.sb._p7KenttaKaytossa()).toBe(true); expect(e.log.draw).toBe(1); expect(e.log.luvut).toEqual(['seurat/kpv/liput/julkiset']);
    expect(e.sb._p7KenttaKaytossa()).toBe(true); expect(e.log.luvut).toHaveLength(1);   // luetaan kerran
  });
  it('lippu pois / dokumentti puuttuu / luku heittää / ei boolean → false, EI uudelleenpiirtoa, vanha näkymä; ei kaada', async () => {
    for (const opts of [{ julkiset: { kentta: false } }, { julkisetPuuttuu: true }, { julkiset: {} }, { julkiset: { kentta: 'true' } }, { julkisetVirhe: true }]) {
      const e = ymp(opts); e.sb._p7KenttaKaytossa(); await e.sb._p7LataaLiput(); await lopeta(); expect(e.sb._p7KenttaKaytossa(), JSON.stringify(opts)).toBe(false); expect(e.log.draw).toBe(0);
    }
  });
  it('demo ja puuttuva tietokanta: ei lueta lainkaan; Kenttä ei koskaan demossa', async () => {
    const d = ymp({ demo: true }); expect(d.sb._p7KenttaKaytossa()).toBe(false); await d.sb._p7LataaLiput(); expect(d.log.luvut).toEqual([]);
    const n = ymp(); n.sb._db = null; await n.sb._p7LataaLiput(); expect(n.sb._p7KenttaKaytossa()).toBe(false);
  });
  it('lähdetaso: dispatcher valitsee rA1Kentta vain lipulla; rA1() on TÄSMÄLLEEN ennallaan (snapshot-hash) eikä sisällä K1-koodia; skriptit ja SW-allowlist', () => {
    expect(SRC).toContain("html=(typeof _p7KenttaKaytossa==='function' && _p7KenttaKaytossa()) ? rA1Kentta() : rA1();");
    const ra1 = pura('function rA1()'); expect(createHash('sha256').update(ra1).digest('hex')).toBe('6089e5d1631d3fb68339d42fd8b995925c066fa9a0ec433505094dfef8516382'); expect(ra1).not.toMatch(/K1|rA1Kentta|k1-/);
    for (const s of ['tm_liput.js?v=1', 'tm_kielletyt.js?v=1', 'tm_tukitavoitteet.js?v=3', 'tm_joukkuejakso.js?v=3', 'tm_taman_tueksi.js?v=2', 'tm_tanaan_kentta.js?v=2']) expect(SRC, s).toContain('<script src="lib/' + s + '"></script>');
    const sw = readFileSync(join(juuri, 'sw_pelaaja.js'), 'utf8'); expect(sw).toMatch(/const CACHE = 'tm-pelaaja-v(7[6-9]|[89]\d)'/); expect(sw).toContain('tm_(liput|kielletyt|tukitavoitteet|joukkuejakso|taman_tueksi|tanaan_kentta');   // K4 lisäsi |viikkokatsaus
    expect(SRC).toContain("if (btnId === 'dKirjausBtn' && typeof _p7K1NaytaKuittaus === 'function') _p7K1NaytaKuittaus();");
  });
});

describe('Pelaaja_v7 · rA1Kentta — Topias neljässä tilassa + §7.22-portti', () => {
  const VIIKKO = () => ymp();
  it('JAKSO KÄYNNISSÄ: Viikko 1, jakson nimi, osat (kpi, a–b), Tämän tueksi (kuvaus + "Tukee vahvuuttasi (…)" + kotiharjoite), Joukkueen jakso -rivi + viikon tavoite, päivän treeni + kirjaa-nappi, kuittaus piilossa, Pallo joka päivä', () => {
    const h = kortti(VIIKKO());
    expect(h).toContain('data-k1-tila="jakso"'); expect(h).toContain('Viikko 1'); expect(h).toContain('Kuljettaminen · 6 viikkoa'); expect(h).toContain('Laukaus vauhdista'); expect(h).toContain('Heikompi jalka'); expect(h).toContain('class="kt"');
    expect(h).toContain('Tämän tueksi'); expect(h).toContain('Kehonhallinta'); expect(h).toContain('Tukee vahvuuttasi (Tempokuljetus): kehonhallinta.'); expect(h).toContain('Seinäsyöttö'); expect(h).toContain('Keksitty FC');
    expect(h).toContain('Joukkueen jakso · Viikko 1'); expect(h).toContain('Ensikosketus pelaa'); expect(h).toContain('Päivän treeni'); expect(h).toContain('id="dKirjausBtn"'); expect(h).toContain('id="k1Kuittaus"'); expect(h).toContain('display:none'); expect(h).toContain('id="tKirjausBtn"'); expect(h).toContain('Pallo joka päivä');
    expect(h).toContain('notif-merkki'); expect(h).toContain('aikataulu-merkki'); expect(h).toContain('data-card'); expect(h).not.toContain('VANHA-RA1');
  });
  it('EI JAKSOA (vahvuus näkyy): Oma kenttä + valmentaja valmistelee; ei Tämän tueksi -korttia eikä joukkueen jaksoa; päivän treeni silti', () => {
    const h = kortti(ymp({ p: TOPIAS({ jaksofokus: null }) })); expect(h).toContain('data-k1-tila="vahvuus"'); expect(h).toContain('Valmentaja valmistelee jaksoa'); expect(h).toContain('Tempokuljetus'); expect(h).not.toContain('Tämän tueksi'); expect(h).not.toContain('Joukkueen jakso'); expect(h).toContain('Päivän treeni');
  });
  it('EI VAHVUUTTA EIKÄ JAKSOA: tyhjä kenttä, "vielä tyhjä, ja se on ok", "Siihen asti: pelaa."; kenttä silti piirtyy', () => {
    const h = kortti(ymp({ p: TOPIAS({ jaksofokus: null, ydinvahvuus: null }) })); expect(h).toContain('data-k1-tila="tyhja"'); expect(h).toContain('Vielä tyhjä, ja se on ok'); expect(h).toContain('Siihen asti: pelaa.'); expect(h).toContain('class="kt"'); expect(h).not.toContain('Tämän tueksi');
  });
  it('SUNNUNTAI: sunnuntaitila + K4-koukku (tyhjä); jakson sisältö ennallaan', () => {
    const e = ymp(); e.sb._paivaIso = () => '2026-11-15'; const h = kortti(e); expect(h).toContain('data-k1-tila="sunnuntai"'); expect(h).toContain('id="k1-sunnuntai"'); expect(h).toContain('Tämän tueksi');
  });
  it('TÄMÄN TUEKSI: ei tukitavoitteita (Leikkijä/D18=0) → kortti piiloon; vanha jakso pelkällä tukiosalla → yksi rivi; perustelu jossa numero → vain kuvaus', () => {
    expect(kortti(ymp({ p: TOPIAS({ jaksofokus: JAKSO({ tukitavoitteet: [] }) }) }))).not.toContain('Tämän tueksi');
    const vanha = kortti(ymp({ p: TOPIAS({ jaksofokus: JAKSO({ tukitavoitteet: undefined, tukiosa: { alue: 'Kehonhallinta', perustelu: 'Jotta pysyt mukana', harjoitteet: [H1] } }) }) })); expect(vanha).toContain('Tämän tueksi'); expect(vanha).toContain('Jotta pysyt mukana'); expect(vanha).toContain('Seinäsyöttö');
    const num = kortti(ymp({ p: TOPIAS({ jaksofokus: JAKSO({ tukitavoitteet: [Object.assign({}, TT1, { perustelu: 'Tavoite 3 x 5' })] }) }) })); expect(num).toContain('Kehonhallinta'); expect(num).not.toContain('Tavoite 3 x 5');
    const jarj = kortti(ymp({ p: TOPIAS({ jaksofokus: JAKSO({ tukitavoitteet: [Object.assign({}, TT1, { perustelu: '1. kosketukseen kuluu hyvä pallon suojaus ja havainnointi' })] }) }) })); expect(jarj).toContain('1. kosketukseen kuluu hyvä pallon suojaus ja havainnointi');   // järjestysnumero taidon nimessä sallittu (K1-korjaus)
  });
  it('JOUKKUEEN JAKSO -rivi vain pelaajalle jonka jakso on aloitettu joukkuejaksosta: ei viitettä / vanha {jid, alku} -viite / umpeutunut → rivi piiloon', () => {
    for (const viite of [undefined, null, { jid: 'kpv_u13', alku: '2026-11-09' }]) expect(kortti(ymp({ p: TOPIAS({ jaksofokus: JAKSO({ joukkuejakso_viite: viite }) }) })), JSON.stringify(viite)).not.toContain('Joukkueen jakso');
    const e = ymp(); e.sb._paivaIso = () => '2026-12-21'; expect(kortti(e)).not.toContain('Joukkueen jakso');
  });
  it('§7.22 / D24: ei X/5, OVR, FLEI, lähdesanoja (testistä/havainnosta/arviosta), fy_-avaimia, ketjunimiä, "ydinvahvuus"-sanaa, heikkoutta/rajoitetta/kriittistä, hex-värejä eikä symboleja tukitavoitteille kentällä — kaikissa tiloissa', () => {
    const tilat = [ymp(), ymp({ p: TOPIAS({ jaksofokus: null }) }), ymp({ p: TOPIAS({ jaksofokus: null, ydinvahvuus: null }) }), (() => { const e = ymp(); e.sb._paivaIso = () => '2026-11-15'; return e; })()];
    for (const e of tilat) { const h = kortti(e).replace(/<style>[\s\S]*?<\/style>/, '');
      expect(h).not.toMatch(/\d\s*\/\s*5\b/); expect(h).not.toMatch(/\bOVR\b|\bFLEI\b/); expect(h).not.toMatch(/testistä|havainnosta|arviosta|lin30m/i); expect(h).not.toMatch(/fy_|\b(SBL|SFL|LL|DIAG|DFL)\b/); expect(h).not.toMatch(/ydinvahvuu/i); expect(h).not.toMatch(/heikkou|rajoite|kriittin/i);
      expect(h).not.toMatch(/#[0-9a-fA-F]{3,8}\b/); expect(h).not.toMatch(/kt-ase|kt-reitti|kt-vk/); expect(h).not.toMatch(/ase puuttuu|oma alue/); }
  });
  it('PÄIVÄN TREENI: jakso ensin — seuran hyväksytty koti-rivi jonka konsepti = jakson konsepti_avain → treeni siitä + "jaksosta"; ilman riviä testipolku (TM-pankki); seuran pankki ladataan vain kerran ja vain kahdella yhtäsuuruusehdolla', async () => {
    const rivi = { nimi: 'Seuran porttikuljetus', tyyppi: 'T', lahde: 'seura', tila: 'hyvaksytty', kaytto: 'koti', konsepti: 'y_h2', ohje: 'Kuljeta pallo porttien läpi.', kesto_min: 12, ika_min: 10, ika_max: 16 };
    const e = ymp({ pankki: [rivi] }); e.sb._ladattu = {}; kortti(e); await lopeta(); await lopeta(); expect(e.log.luvut).toContain('seurat/kpv/harjoitepankki?tila==hyvaksytty&kaytto==koti'); kortti(e); expect(e.log.luvut.filter((x) => /harjoitepankki/.test(x))).toHaveLength(1);
    const h = kortti(e); expect(h).toContain('Seuran porttikuljetus'); expect(h).toContain('12 min · jaksosta'); expect(h).toContain('Kuljeta pallo porttien läpi.');
    const ilman = ymp({ pankki: [Object.assign({}, rivi, { konsepti: 'y_h9' })] }); kortti(ilman); await lopeta(); await lopeta(); const hi = kortti(ilman); expect(hi).not.toContain('Seuran porttikuljetus'); expect(hi).toContain('Päivän treeni'); expect(hi).not.toContain('jaksosta');
  });
  it('VARAPOLKU: libit puuttuvat → vanha rA1(); päivän treenin virhe ei kaada näkymää; kuittaus paljastuu kun treeni kirjattu (_p7K1NaytaKuittaus)', () => {
    expect(kortti(ymp({ libit: false }))).toBe('VANHA-RA1');
    const e = ymp(); e.sb.valitsePaivanHarjoite = () => { throw new Error('x'); }; const h = kortti(e); expect(h).toContain('Viikko 1'); expect(h).not.toContain('id="dKirjausBtn"');
    const k = ymp(); k.sb._p7K1NaytaKuittaus(); expect(k.log.kuittaus).toBe('block');
  });
});
