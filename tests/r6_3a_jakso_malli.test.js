/**
 * R6.3-A — lib/tm_jakso_malli.js (+ tmJaksoEhdotukset): ydinvahvuus, tukiosa, tukitarve, kevyt jakso, rajoittaa pelaamista (kypsyyssuoja §25), joukkueen teema (D16),
 * D8-vaihtoehdot, GDPR-sanatesti. Kanoniset libit oikeina (Eerikkilä-normit, tm_phv_tila, tmSiltaEhdota). Fixture: KPV U13 -testipelaaja (m93GBdOaGCUuenMiCL0I).
 */
import { describe, it, expect } from 'vitest';
import { readFileSync } from 'fs';
import { createRequire } from 'module';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

const require = createRequire(import.meta.url);
const juuri = join(dirname(fileURLToPath(import.meta.url)), '..');
const M = require('../lib/tm_jakso_malli.js');
const SA = require('../lib/tm_seuraava_askel.js');
const KS = require('../lib/tm_kehityssilmukka.js');
const SILTA = require('../lib/tm_arviointi_silta.js');
const lue = (f) => readFileSync(join(juuri, f), 'utf8');

const YV = { kuvaus: 'Tempokuljetus', havaittu_pvm: '2026-09-12', rooli: 'valmentaja' };
const TUKI = { alue: 'pallon suojaaminen paineessa', perustelu: 'Jotta kuljetus vie maalille asti, pallo pysyy sinulla paineessa.', harjoitteet: [{ id: 'h1', nimi: 'Porttikuljetuspeli', lahde: 'tm' }, { id: 's7', nimi: 'Suojaa ja käänny 1v1', lahde: 'seura' }] };
const TT = { alue: 'voima', merkitty_pvm: '2026-10-01', rooli: 'fysiikkavalmentaja' };
const PEL = (lisa) => Object.assign({ id: 'm93GBdOaGCUuenMiCL0I', syntymaVuosi: 2013, joukkue: 'KPV U13', sukupuoli: 'M' }, lisa || {});
const MITTAUS = (koodi) => ({ biologinenIka_viimeisin: { phv_tila_koodi: koodi, pvm: '2026-09-01' } });

describe('ydinvahvuus · tukiosa · tukitarve · kevyt jakso (rakentajat + validointi)', () => {
  it('ydinvahvuus {kuvaus, havaittu_pvm, rooli}: normalisoi; ylimääräiset kentät pois; ei xfactor-nimistä kenttää', () => {
    expect(M.tmYdinvahvuus(Object.assign({ xfactor: true, lisa: 1 }, YV))).toEqual(YV);
    expect(JSON.stringify(Object.keys(M.tmYdinvahvuus(YV)))).not.toMatch(/x.?factor/i);
    expect(M.tmYdinvahvuus({ kuvaus: '  Tempokuljetus ', havaittu_pvm: '2026-09-12', rooli: 'vp' }).kuvaus).toBe('Tempokuljetus');
  });
  it('ydinvahvuus: puuttuva/tyhjä kuvaus, virheellinen päivä (2026-02-30, UTC-aikaleima, muu muoto) ja EI-henkilökunnan rooli → throw', () => {
    expect(() => M.tmYdinvahvuus(Object.assign({}, YV, { kuvaus: '' }))).toThrow(/kuvaus/);
    expect(() => M.tmYdinvahvuus(Object.assign({}, YV, { kuvaus: '   ' }))).toThrow(/tyhjä/);
    ['2026-02-30', '2026-09-12T10:00:00Z', '12.9.2026', '', null, undefined, 20260912].forEach((v) => expect(() => M.tmYdinvahvuus(Object.assign({}, YV, { havaittu_pvm: v })), String(v)).toThrow(/päivä/));
    expect(M.tmYdinvahvuus(Object.assign({}, YV, { havaittu_pvm: '2024-02-29' })).havaittu_pvm).toBe('2024-02-29');   // karkausvuosi
    ['2026-02-29', '2100-02-29', '2026-04-31', '2026-13-01', '2026-00-10', '2026-01-00'].forEach((v) => expect(() => M.tmYdinvahvuus(Object.assign({}, YV, { havaittu_pvm: v })), v).toThrow(/päivä/));
    ['pelaaja', 'huoltaja', 'seurasihteeri', '', undefined, 'admin'].forEach((r) => expect(() => M.tmYdinvahvuus(Object.assign({}, YV, { rooli: r })), String(r)).toThrow(/rooli/));
  });
  it('tukiosa {alue, perustelu, harjoitteet[{id,nimi,lahde}]} (D16: lahde seura|tm); perustelu pakollinen (sitoo ydinvahvuuteen)', () => {
    expect(M.tmTukiosa(TUKI)).toEqual(TUKI);
    expect(M.tmTukiosa({ alue: 'kestävyys', perustelu: 'jotta kuljetuksesi on vaarallinen vielä 80. minuutilla' }).harjoitteet).toEqual([]);
    expect(() => M.tmTukiosa({ alue: 'kestävyys', perustelu: '' })).toThrow(/perustelu/);
    expect(() => M.tmTukiosa({ alue: '', perustelu: 'x' })).toThrow(/alue/);
    ['', undefined, 'muu', 'TM', null].forEach((l) => expect(() => M.tmTukiosa(Object.assign({}, TUKI, { harjoitteet: [{ id: 'a', nimi: 'x', lahde: l }] })), String(l)).toThrow(/lahde/));
    expect(() => M.tmTukiosa(Object.assign({}, TUKI, { harjoitteet: [{ id: '', nimi: 'x', lahde: 'tm' }] }))).toThrow(/id/);
    expect(() => M.tmTukiosa(Object.assign({}, TUKI, { harjoitteet: ['x'] }))).toThrow(/objekti/);
  });
  it('tukitarve {alue, merkitty_pvm, rooli}: vain henkilökunta', () => {
    expect(M.tmTukitarve(TT)).toEqual(TT);
    expect(() => M.tmTukitarve(Object.assign({}, TT, { rooli: 'pelaaja' }))).toThrow(/rooli/); expect(() => M.tmTukitarve(Object.assign({}, TT, { merkitty_pvm: 'eilen' }))).toThrow(/päivä/);
  });
  it('kevyt jakso: muoto:"kevyt"; päättyy jakson vaihdossa korvattu-rivinä lisakentat {kuittauksia:n} (ei uutta sulkutapaa, ei lib-muutosta)', () => {
    const kevyt = M.tmKevytJakso({ konsepti_avain: 'kt_1', konsepti_nimi: 'Kotitehtävä', domeeni: 'teknis_taktinen', alkoi: '2026-09-01T08:00:00.000Z' });
    expect(kevyt.muoto).toBe('kevyt');
    const v = KS.tmAsetaJaksofokus({ jaksofokus: kevyt }, { konsepti_avain: 'y_h2', konsepti_nimi: 'Syöttö', domeeni: 'teknis_taktinen' }, { nytISO: '2026-10-05T10:00:00.000Z', lisakentat: { kuittauksia: 7 } });
    expect(v.historiaLisays[0]).toMatchObject({ konsepti_avain: 'kt_1', sulkutapa: 'korvattu', kuittauksia: 7 });
    expect(() => M.tmKevytJakso(null)).toThrow();
  });
});

describe('GDPR-sanatesti: heikkous · rajoite · kriittinen eivät esiinny pelaaja- eivätkä jaksodatassa', () => {
  const SANAT = ['heikkous', 'Heikkoudet', 'heikkouksia', 'rajoite', 'rajoitteet', 'Rajoitteeton', 'rajoittaa', 'rajoittava', 'kriittinen', 'kriittisen', 'Kriittiset'];
  it('tekstikentät hylkäävät sanat kaikissa taivutuksissa (ydinvahvuus.kuvaus, tukiosa.alue/perustelu/harjoite.nimi, tukitarve.alue)', () => {
    SANAT.forEach((s) => {
      expect(() => M.tmYdinvahvuus(Object.assign({}, YV, { kuvaus: 'Hänen ' + s }))).toThrow(/kielletyn/);
      expect(() => M.tmTukiosa(Object.assign({}, TUKI, { alue: s }))).toThrow(/kielletyn/);
      expect(() => M.tmTukiosa(Object.assign({}, TUKI, { perustelu: 'Jotta ' + s + ' korjaantuu' }))).toThrow(/kielletyn/);
      expect(() => M.tmTukiosa(Object.assign({}, TUKI, { harjoitteet: [{ id: 'a', nimi: s, lahde: 'tm' }] }))).toThrow(/kielletyn/);
      expect(() => M.tmTukitarve(Object.assign({}, TT, { alue: s }))).toThrow(/kielletyn/);
    });
  });
  it('EI vääriä hälytyksiä: "heikompi jalka" (mockup), "heikosti", "kriitikko", "rajaus" ja tavalliset sanat läpi', () => {
    ['laukaus heikommalla jalalla', 'heikompi jalka', 'syöttö heikosti', 'rajaus', 'Pallon suojaaminen paineessa', 'kestävyys'].forEach((t) => expect(M.tmJaksoTekstiKelpaa(t).ok, t).toBe(true));
    SANAT.forEach((s) => expect(M.tmJaksoTekstiKelpaa(s).ok, s).toBe(false));
  });
  it('tmTarkistaJaksoData käy läpi koko jaksodatan: arvot, AVAIMET, sisäkkäiset objektit ja taulukot → polut', () => {
    expect(M.tmTarkistaJaksoData({ jaksofokus: { konsepti_nimi: 'ok', ydinvahvuus: YV, tukiosa: TUKI }, jaksofokus_historia: [{ konsepti_nimi: 'ok', lahde_seuraava: 'silta' }] })).toEqual([]);
    const l = M.tmTarkistaJaksoData({ a: { b: [{ c: 'oli kriittinen' }] }, heikkous: 1, d: { rajoite_x: 2 } });
    expect(l).toEqual(['$.a.b.0.c', '$.heikkous (avain)', '$.d.rajoite_x (avain)']);
    expect(M.tmTarkistaJaksoData(null)).toEqual([]); expect(M.tmTarkistaJaksoData('heikkoutta')).toEqual(['$']);
    const kehä = {}; kehä.itse = kehä; expect(() => M.tmTarkistaJaksoData(kehä)).not.toThrow();
  });
  it('KENTTÄNIMET neutraaleja: "ase" ei saa esiintyä kenttänimissä (segmenttinä) — ase_valinta, ase, idp_kausi.ase, ase.alue hylätään; ydinvahvuus_valinta, base, phase, vaasea sallittu', () => {
    expect(M.tmTarkistaJaksoData({ ase_valinta: { vaihtoehto: 'A' } })).toEqual(['$.ase_valinta (avain)']);
    expect(M.tmTarkistaJaksoData({ idp_kausi: { ase: { kuvaus: 'x' } } })).toEqual(['$.idp_kausi.ase (avain)']);
    expect(M.tmTarkistaJaksoData({ jaksofokus: { ase: { alue: { x: 1 } } } })).toEqual(['$.jaksofokus.ase (avain)']);
    expect(M.tmTarkistaJaksoData({ x: [{ valinta_ase: 1 }] })).toEqual(['$.x.0.valinta_ase (avain)']);
    expect(M.tmTarkistaJaksoData({ ydinvahvuus_valinta: { vaihtoehto: 'A', valittu_pvm: '2026-10-05' }, base: 1, phase: 2, vaasea: 3, asetukset: 4, notif_asetukset: 5, ydinvahvuus: YV })).toEqual([]);
    expect(M.tmTarkistaJaksoData({ kuvaus: 'ase' }), 'arvo "ase" ei ole kenttänimi').toEqual([]);   // vain avaimet
    ['ydinvahvuus', 'tukiosa', 'tukitarve', 'muoto', 'harjoitteet', 'ydinvahvuus_valinta', 'jakso_kuittaus'].forEach((k) => expect(M.KENTTANIMI_KIELLETTY.test(k), k).toBe(false));
  });
  it('lib:n rakentamasta jaksodatasta (ydinvahvuus + tukiosa + kevyt + historiarivi) ei löydy sanoja; pelaajan fixture-doc vahvistettujen kenttien osalta puhdas', () => {
    const jf = Object.assign(M.tmKevytJakso({ konsepti_avain: 'y_h2', konsepti_nimi: 'Tempokuljetus', domeeni: 'teknis_taktinen', alkoi: '2026-09-01T08:00:00.000Z' }), { ydinvahvuus: M.tmYdinvahvuus(YV), tukiosa: M.tmTukiosa(TUKI) });
    const v = KS.tmAsetaJaksofokus({ jaksofokus: jf }, { konsepti_avain: 'y_h3', konsepti_nimi: 'Pallonhallinta', domeeni: 'teknis_taktinen' }, { nytISO: '2026-10-05T10:00:00.000Z' });
    expect(M.tmTarkistaJaksoData({ jaksofokus: v.jaksofokus, historia: v.historiaLisays, jf })).toEqual([]);
    expect(M.tmTarkistaJaksoData(PEL({ jaksofokus: jf, ydinvahvuus: M.tmYdinvahvuus(YV) }))).toEqual([]);
  });
  it('tukitarve on VAIN henkilökunnalle: lib ei sisällytä sitä ydinvahvuuteen/tukiosaan/pelaajan vaihtoehtoihin; model-moduuli ei lataa Firestorea', () => {
    expect(Object.keys(M.tmTukiosa(TUKI))).toEqual(['alue', 'perustelu', 'harjoitteet']); expect(Object.keys(M.tmYdinvahvuus(YV))).toEqual(['kuvaus', 'havaittu_pvm', 'rooli']);
    expect(JSON.stringify(M.tmPelaajanVaihtoehdot({ tila: 'valittavana', tukitarve: TT, vaihtoehdot: [{ konsepti_avain: 'a', vahvistettu: true }] }))).not.toMatch(/tukitarve|voima/);
    const koodi = lue('lib/tm_jakso_malli.js').replace(/\/\*[\s\S]*?\*\//g, '').split('\n').map((l) => l.replace(/\/\/.*$/, '')).join('\n');
    expect(koodi).not.toMatch(/firebase|fetch\(|XMLHttpRequest|collection\(|https?:\/\//i);
    // pelaajan/huoltajan sovellukset eivät lataa mallilibiä (henkilökunnan päätösrakenteet)
    ['TalentMaster_Pelaaja_v7.html', 'TalentMaster_Vanhempi_v2.html'].forEach((f) => expect(lue(f), f).not.toMatch(/tm_jakso_malli|TM_JAKSO_MALLI|tmRajoittaaPelaamista|tukitarve/));
  });
});

describe('tmRajoittaaPelaamista (sisäinen) — tukitarve TAI alin testitaso; kypsyyssuoja §25', () => {
  const oi = (arvo) => ({ osaindeksit: () => ({ kiihdytys: null, maksinopeus: arvo, voima: null, ketteryys: null, suunnanmuutos: null, aerobinen: null }) });
  const aja = (p, deps) => M.tmRajoittaaPelaamista(p, { deps: deps || {} });
  it('EI VACUOUS: ei tukitarvetta eikä testiä → ei', () => { expect(aja(PEL())).toMatchObject({ kylla: false, syyt: [], vihje: null }); });
  it('ehto 1: valmentajan tukitarve riittää yksin (myös PRE/LAH/tuntematon PHV — henkilökunnan päätös)', () => {
    ['PRE', 'LAH', 'PH', 'POST', 'AN'].forEach((k) => expect(aja(PEL(Object.assign({ tukitarve: TT }, MITTAUS(k)))), k).toMatchObject({ kylla: true, syyt: ['tukitarve'], alueet: ['voima'] }));
    expect(aja(PEL({ tukitarve: TT }))).toMatchObject({ kylla: true, syyt: ['tukitarve'] });
    expect(aja(PEL({ tukitarve: { alue: 'voima' } })).kylla).toBe(false);   // vaillinainen merkintä ei laske
  });
  it('ehto 2: fyysinen testitulos Eerikkilä-normien alimmalla tasolla (1) KUN PHV mitattu PH/POST/AN → kylla; taso 2+ → ei', () => {
    ['PH', 'POST', 'AN'].forEach((k) => expect(aja(PEL(MITTAUS(k)), oi(1)), k).toMatchObject({ kylla: true, syyt: ['testitulos'], alueet: ['maksinopeus'], kypsyyssuoja: false }));
    expect(aja(PEL(MITTAUS('POST')), oi(2)).kylla).toBe(false); expect(aja(PEL(MITTAUS('POST')), oi(5)).kylla).toBe(false);
  });
  it('KYPSYYSSUOJA (§25): PRE/LAH → pelkkä fyysinen testitulos EI riitä; tuntematon PHV → ei riitä + vihje "mittaa kasvu"', () => {
    ['PRE', 'LAH'].forEach((k) => expect(aja(PEL(MITTAUS(k)), oi(1)), k).toMatchObject({ kylla: false, vihje: null, kypsyyssuoja: true }));
    expect(aja(PEL(), oi(1))).toMatchObject({ kylla: false, vihje: 'mittaa_kasvu', kypsyyssuoja: true });
    expect(aja(PEL({ phv_tila: 'POST' }), oi(1)), 'lomakkeen phv_tila ei ole mittaus → tuntematon').toMatchObject({ kylla: false, vihje: 'mittaa_kasvu' });
    // tukitarve + suojattu testi: tukitarve voittaa, testi ei lisää syytä
    expect(aja(PEL({ tukitarve: TT }), oi(1))).toMatchObject({ kylla: true, syyt: ['tukitarve'], vihje: 'mittaa_kasvu' });
  });
  it('molemmat ehdot → molemmat syyt; ei testidataa → ei vihjettä', () => {
    expect(aja(PEL(Object.assign({ tukitarve: TT }, MITTAUS('POST'))), oi(1)).syyt).toEqual(['tukitarve', 'testitulos']);
    expect(aja(PEL(), { osaindeksit: () => null })).toMatchObject({ kylla: false, vihje: null }); expect(aja(null)).toMatchObject({ kylla: false });
  });
  it('KANONISET LIBIT oikeina: oikea laskeD1Osaindeksit + normiIka (KPV U13, poika, lin30m 5,0 s = taso 1; cmj 20 = voima 1) + oikea PHV-luku', () => {
    expect(aja(PEL(Object.assign({ hh_viimeisin: { lin30m: 5.0 } }, MITTAUS('POST'))))).toMatchObject({ kylla: true, syyt: ['testitulos'], alueet: ['maksinopeus'] });
    expect(aja(PEL(Object.assign({ hh_viimeisin: { lin30m: 4.4 } }, MITTAUS('POST')))).kylla).toBe(false);   // taso 4
    expect(aja(PEL(Object.assign({ hh_viimeisin: { lin30m: 4.3, cmj: 20 } }, MITTAUS('POST')))).alueet).toEqual(['voima']);
    expect(aja(PEL(Object.assign({ hh_viimeisin: { lin30m: 5.0 } }, MITTAUS('PRE'))))).toMatchObject({ kylla: false, kypsyyssuoja: true });
    expect(aja(PEL({ hh_viimeisin: { lin30m: 5.0 } }))).toMatchObject({ kylla: false, vihje: 'mittaa_kasvu' });
  });
  it('kypsyyssuoja toiseen suuntaan: POST tai varhain kypsynyt + fyysinen ydinvahvuus → vihje harkitse teknistä/taktista; tekninen ydinvahvuus / PRE → ei', () => {
    const fyys = { kuvaus: 'Maksiminopeus', fyysinen: true };
    expect(M.tmYdinvahvuusVihje(PEL(MITTAUS('POST')), fyys)).toBe('harkitse_tekninen_tai_taktinen');
    expect(M.tmYdinvahvuusVihje(PEL(MITTAUS('POST')), { kuvaus: 'Kuljetus ahtaassa' })).toBeNull();
    expect(M.tmYdinvahvuusVihje(PEL(MITTAUS('POST')), { kuvaus: 'Voima ja kestävyys' })).toBe('harkitse_tekninen_tai_taktinen');   // fyysinen avainsana
    ['AN', 'PH', 'LAH'].forEach((k) => expect(M.tmYdinvahvuusVihje(PEL(MITTAUS(k)), fyys), k).toBeNull());   // vain POST (spec); AN on moniselitteinen, PH/LAH eivät ole "jälkeen"
    expect(M.tmYdinvahvuusVihje(PEL(MITTAUS('PRE')), fyys)).toBeNull(); expect(M.tmYdinvahvuusVihje(PEL(), fyys)).toBeNull();
    expect(M.tmYdinvahvuusVihje(PEL(MITTAUS('PRE')), fyys, { deps: { varhainKypsynyt: () => true } })).toBe('harkitse_tekninen_tai_taktinen');
    expect(M.tmYdinvahvuusVihje(null, fyys)).toBeNull(); expect(M.tmYdinvahvuusVihje(PEL(MITTAUS('POST')), null)).toBeNull();
  });
});

describe('tmJoukkueenTeema (D16 = A: seurat/{id}/valmennuslinja/teemat) — rajapinta, null = teemaa ei näytetä', () => {
  const TEEMAT = { jaksot: [{ joukkue: 'KPV U13', alkaa: '2026-09-01', paattyy: '2026-09-30', teema: 'Pallonhallinta' }, { joukkue: 'KPV U13', alkaa: '2026-10-01', paattyy: '2026-10-31', teema: 'Paine ja suojaus' }, { joukkue: 'KPV U13', alkaa: '2026-11-01', paattyy: '2026-11-30', teema: 'Viimeistely' }, { joukkue: 'KPV U15', alkaa: '2026-10-01', paattyy: '2026-10-31', teema: 'Muu joukkue' }] };
  it('null kun lähdettä ei ole / tuntematon joukkue / virheellinen päivä / vääränmuotoinen data (näkymän pitää toimia)', () => {
    [[null, '2026-10-05', { teemat: TEEMAT }], ['KPV U13', '2026-10-05', undefined], ['KPV U13', '2026-10-05', {}], ['KPV U13', '2026-10-05', { teemat: null }], ['KPV U13', '2026-10-05', { teemat: { jaksot: 'x' } }],
      ['KPV U99', '2026-10-05', { teemat: TEEMAT }], ['KPV U13', 'huomenna', { teemat: TEEMAT }], ['KPV U13', null, { teemat: TEEMAT }], ['KPV U13', '2027-03-01', { teemat: TEEMAT }]].forEach(([j, p, o]) => expect(M.tmJoukkueenTeema(j, p, o), JSON.stringify([j, p])).toBeNull());
  });
  it('{nyt, seuraava}: oikea jakso päivälle; seuraava = seuraava alkava; vain oman joukkueen rivit; rajapäivät mukana', () => {
    expect(M.tmJoukkueenTeema('KPV U13', '2026-10-05', { teemat: TEEMAT })).toEqual({ nyt: 'Paine ja suojaus', seuraava: 'Viimeistely' });
    expect(M.tmJoukkueenTeema('KPV U13', '2026-10-01', { teemat: TEEMAT }).nyt).toBe('Paine ja suojaus'); expect(M.tmJoukkueenTeema('KPV U13', '2026-09-30', { teemat: TEEMAT }).nyt).toBe('Pallonhallinta');
    expect(M.tmJoukkueenTeema('KPV U13', '2026-11-15', { teemat: TEEMAT })).toEqual({ nyt: 'Viimeistely', seuraava: null });
    expect(M.tmJoukkueenTeema('KPV U13', '2026-08-20', { teemat: TEEMAT })).toEqual({ nyt: null, seuraava: 'Pallonhallinta' });   // ennen ensimmäistä: vain seuraava
    expect(M.tmJoukkueenTeema('KPV U15', '2026-10-05', { teemat: TEEMAT })).toEqual({ nyt: 'Muu joukkue', seuraava: null });
    expect(M.tmJoukkueenTeema('KPV U13', '2026-10-05T10:00:00Z', { teemat: TEEMAT }).nyt).toBe('Paine ja suojaus');   // aikaleimasta päivä
  });
  it('viallisia rivejä ei kaadeta: puuttuva teema/päivä ohitetaan; lib ei lue Firestorea (lukija antaa opts.teemat)', () => {
    const t = { jaksot: [null, { joukkue: 'KPV U13', alkaa: '2026-10-01', paattyy: '2026-10-31', teema: '  ' }, { joukkue: 'KPV U13', alkaa: 'x', paattyy: '2026-10-31', teema: 'a' }, { joukkue: 'KPV U13', alkaa: '2026-10-01', paattyy: '2026-10-31', teema: 'Ehjä' }] };
    expect(M.tmJoukkueenTeema('KPV U13', '2026-10-05', { teemat: t })).toEqual({ nyt: 'Ehjä', seuraava: null });
  });
});

describe('D8: tmJaksoEhdotukset (kaksi ehdotusta) + pelaaja näkee vain vahvistetut', () => {
  const deps = { siltaKonsepti: (a) => ({ nimi: 'K ' + a }), siltaEhdota: SILTA.tmSiltaEhdota, sallitut: () => null };
  const HAV = { ball_control: 1, short_passing: 2, dribbling: 3 };
  it('lasketusta datasta kaksi ehdotusta, heikoin ensin; nykyinen jakso pois; vahvistettu:false; heikko-lippu vain ≤ 2/5', () => {
    const e = SA.tmJaksoEhdotukset({ arviointi_havaittu: HAV }, 'y_h1', deps);
    expect(e.length).toBe(2); expect(e.map((x) => x.jarjestys)).toEqual([1, 2]); expect(e.every((x) => x.vahvistettu === false && x.lahde === 'havainto')).toBe(true);
    expect(e.find((x) => x.konsepti_avain === 'y_h1')).toBeUndefined();
    const kaikki = SA.tmJaksoEhdotukset({ arviointi_havaittu: HAV }, 'ei_olemassa', deps); expect(kaikki[0].konsepti_avain).toBe('y_h1'); expect(kaikki[0].heikko).toBe(true);
    const kolme = SA.tmJaksoEhdotukset({ arviointi_havaittu: { dribbling: 3 } }, 'x', deps); expect(kolme[0].heikko).toBe(false);   // 3/5 ei ole heikko (raja ≤ 2)
  });
  it('vähäisen datan tila: täydennys lasketuilla ehdotuksilla (lahde "laskettu"); ei dataa → []; ei duplikaatteja; max 2; deterministinen', () => {
    const lasketut = (p) => [{ konsepti_avain: 'y_h1', konsepti_nimi: 'Eka' }, { konsepti_avain: 'y_h7', konsepti_nimi: 'Toka' }, { konsepti_avain: 'y_h8', konsepti_nimi: 'Kolmas' }];
    const d = Object.assign({}, deps, { laskettuEhdotukset: lasketut });
    const a = SA.tmJaksoEhdotukset({ arviointi_havaittu: { ball_control: 1 } }, 'x', d);
    expect(a.map((x) => x.konsepti_avain + ':' + x.lahde)).toEqual(['y_h1:havainto', 'y_h7:laskettu']);
    expect(SA.tmJaksoEhdotukset({}, 'x', d).map((x) => x.lahde)).toEqual(['laskettu', 'laskettu']);
    expect(SA.tmJaksoEhdotukset({}, 'x', deps)).toEqual([]); expect(SA.tmJaksoEhdotukset(null, 'x', {})).toEqual([]);
    expect(JSON.stringify(SA.tmJaksoEhdotukset({ arviointi_havaittu: HAV }, 'x', deps))).toBe(JSON.stringify(SA.tmJaksoEhdotukset({ arviointi_havaittu: HAV }, 'x', deps)));
  });
  it('pelaaja ei näe vahvistamattomia ehdotuksia; jakso alkaa vasta vahvistuksesta: vain tila "valittavana" + vahvistettu:true, max 2', () => {
    const e = SA.tmJaksoEhdotukset({ arviointi_havaittu: HAV }, 'x', deps);
    expect(M.tmPelaajanVaihtoehdot({ tila: 'valittavana', vaihtoehdot: e })).toEqual([]);   // vahvistamattomat
    const v = e.map((x) => Object.assign({}, x, { vahvistettu: true }));
    expect(M.tmPelaajanVaihtoehdot({ tila: 'valittavana', vaihtoehdot: v }).length).toBe(2);
    expect(M.tmPelaajanVaihtoehdot({ tila: 'kaynnissa', vaihtoehdot: v })).toEqual([]); expect(M.tmPelaajanVaihtoehdot({ vaihtoehdot: v })).toEqual([]);
    expect(M.tmPelaajanVaihtoehdot({ tila: 'valittavana', vaihtoehdot: [v[0], Object.assign({}, v[1], { vahvistettu: 'true' }), { konsepti_avain: 'z', vahvistettu: true }, { konsepti_avain: 'q', vahvistettu: true }] }).map((x) => x.konsepti_avain)).toEqual([v[0].konsepti_avain, 'z']);
    expect(M.tmPelaajanVaihtoehdot(null)).toEqual([]);
  });
});
