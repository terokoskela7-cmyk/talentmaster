/* K35-3 · Viikkopohjat ja Täytä viikko -logiikka (lib/tm_viikkopohja.js; docs/CODE_BRIEF_35_KALENTERI.md; D14, D26, D34, D183, D193, D196). Fixturet FC Demon kaltaisia: keksityt nimet, ei oikeaa dataa. */
import { describe, it, expect } from 'vitest';
import { readFileSync } from 'fs';
import { createRequire } from 'module';
const require = createRequire(import.meta.url);
const V = require('../lib/tm_viikkopohja.js');
const JSONI = JSON.parse(readFileSync(new URL('../docs/data/spl_viikkopohjat_2023.json', import.meta.url), 'utf8'));
const POHJAT = V.tmPalloliitonPohjat(JSONI), P = (avain) => POHJAT.find((p) => p.avain === avain);
const U13 = 'Demo U13';
const aika = (pvm, hhmm, kesa = true) => pvm + 'T' + hhmm + ':00' + (kesa ? '+03:00' : '+02:00');   // Helsinki: kesäaika +03, talviaika +02
const harj = (id, pvm, hhmm, o) => Object.assign({ id, tyyppi: 'harjoitus', joukkue: U13, alkaa: aika(pvm, hhmm), paattyy: aika(pvm, '18:45') }, o);
const paivat = (r) => r.ehdotukset.map((e) => e.pvm);
const MA = '2026-10-19';   // maanantai; la 24.10., su 25.10.
const viikko = (extra) => V.tmTaytaViikko(Object.assign({ pohja: P('spl_5v5'), ottelut: [], tapahtumat: [], historia: [], maanantai: MA, joukkue: U13 }, extra));

describe('1 · Palloliiton pohjat → skeema', () => {
  it('6 pohjaa, sivuviitteet, lähde palloliitto; kaikki läpäisevät tmViikkopohjaVirhe', () => {
    expect(POHJAT.map((p) => p.avain)).toEqual(['spl_3v3', 'spl_5v5', 'spl_8v8_lapsuus', 'spl_8v8_nuoruus', 'spl_11v11_nuoruus', 'spl_11v11_erikoistuminen']);
    POHJAT.forEach((p) => { expect(p.lahde).toBe('palloliitto'); expect(p.lahde_viite).toMatch(/^Palloliiton valmennuslinja 2023, s\. \d+/); expect(p.ikavaihe).toBeTruthy(); expect(V.tmViikkopohjaVirhe(p)).toBeNull(); expect(p.peli.teksti).toBeTruthy(); });
    expect(P('spl_11v11_nuoruus').lahde_viite).toBe('Palloliiton valmennuslinja 2023, s. 21, 65, 68');
  });
  it('harjoitusmäärä = yläraja; päivät MD-joukosta; kesto = alaraja; viikonpäivä = 6 + md', () => {
    expect(POHJAT.map((p) => p.paivat.length)).toEqual([2, 3, 4, 4, 5, 5]);
    expect(P('spl_3v3').paivat.map((d) => d.viikonpaiva_oletus)).toEqual([2, 4]); expect(P('spl_5v5').paivat.map((d) => d.viikonpaiva_oletus)).toEqual([1, 3, 4]); expect(P('spl_8v8_lapsuus').paivat.map((d) => d.viikonpaiva_oletus)).toEqual([1, 2, 4, 5]);
    expect(P('spl_5v5').paivat.map((d) => d.md)).toEqual([-5, -3, -2]); expect(P('spl_3v3').paivat[0].kesto_min).toBe(60); expect(P('spl_8v8_nuoruus').paivat[0].kesto_min).toBe(120); expect(P('spl_11v11_nuoruus').paivat[0].kesto_min).toBe(90);
    POHJAT.forEach((p) => p.paivat.forEach((d) => { expect(d.viikonpaiva_oletus).toBe(6 + d.md); expect(d.pelimuoto).toBe(p.pelimuoto); }));
  });
  it('11v11: painotus esimerkkiviikosta (peli +2 → −5 …); muilla painotus null', () => {
    const d = P('spl_11v11_nuoruus').paivat; expect(d.map((x) => x.md)).toEqual([-5, -4, -3, -2, -1]); expect(d[0].painotus).toMatch(/toistoja, voimaa ja nopeutta/); expect(d[1].painotus).toMatch(/sitkeyttä/); expect(d[4].painotus).toMatch(/nopeutta ja ketteryyttä/);
    P('spl_5v5').paivat.forEach((x) => expect(x.painotus).toBeNull());
  });
  it('rpe_* vain 11v11:ssä (D26): 5v5/8v8 ei kenttää, 11v11:ssä on', () => {
    ['spl_3v3', 'spl_5v5', 'spl_8v8_lapsuus', 'spl_8v8_nuoruus'].forEach((a) => P(a).paivat.forEach((d) => { expect('rpe_min' in d).toBe(false); expect('rpe_max' in d).toBe(false); }));
    ['spl_11v11_nuoruus', 'spl_11v11_erikoistuminen'].forEach((a) => P(a).paivat.forEach((d) => { expect('rpe_min' in d).toBe(true); expect('rpe_max' in d).toBe(true); }));
  });
  it('peli.maara lähteen "ka. X–Y peliä" alarajasta, muuten null', () => { expect(P('spl_3v3').peli.maara).toBeNull(); expect(P('spl_8v8_nuoruus').peli.maara).toBe(1); expect(P('spl_11v11_nuoruus').peli.maara).toBe(1); });
});

describe('2 · tmViikkopohjaVirhe', () => {
  const hyva = () => JSON.parse(JSON.stringify(P('spl_5v5')));
  it('6 Palloliiton pohjaa → null; virheet nimetään', () => {
    POHJAT.forEach((p) => expect(V.tmViikkopohjaVirhe(p)).toBeNull());
    let p = hyva(); delete p.pelimuoto; expect(V.tmViikkopohjaVirhe(p)).toBe('pelimuoto_puuttuu'); p = hyva(); p.pelimuoto = '9v9'; expect(V.tmViikkopohjaVirhe(p)).toBe('pelimuoto_puuttuu');
    p = hyva(); p.paivat[1].md = p.paivat[0].md; expect(V.tmViikkopohjaVirhe(p)).toBe('md_paallekkain'); p = hyva(); p.paivat[0].rpe_min = 5; expect(V.tmViikkopohjaVirhe(p)).toBe('rpe_vain_11v11');
    p = hyva(); p.paivat[0].kesto_min = 0; expect(V.tmViikkopohjaVirhe(p)).toBe('kesto'); p = hyva(); p.paivat = []; expect(V.tmViikkopohjaVirhe(p)).toBe('paivat_puuttuu'); p = hyva(); p.paivat[0].viikonpaiva_oletus = 9; expect(V.tmViikkopohjaVirhe(p)).toBe('viikonpaiva'); expect(V.tmViikkopohjaVirhe(null)).toBe('pelimuoto_puuttuu');
  });
});

describe('3 · kausivaihe ja pohjan valinta', () => {
  const ks = { kausi: '2026-27', vaiheet: [{ avain: 'val', tyyppi: 'valmistava', alku: '2026-08-01', loppu: '2026-10-31', viikkopohjat: { leikkija: 'spl_8v8_lapsuus', rakentaja: 'spl_8v8_nuoruus' } }, { avain: 'kil', tyyppi: 'kilpailu', alku: '2026-11-01', loppu: '2027-02-28', viikkopohjat: { rakentaja: 'spl_11v11_nuoruus' } }] };
  it('tmKausivaihe: päivä vaiheen sisällä (rajat mukana); ulkopuolella null; ms-aika Helsingin päivänä', () => {
    expect(V.tmKausivaihe(ks, '2026-10-31').avain).toBe('val'); expect(V.tmKausivaihe(ks, '2026-11-01').avain).toBe('kil'); expect(V.tmKausivaihe(ks, '2026-07-31')).toBeNull(); expect(V.tmKausivaihe(null, '2026-10-01')).toBeNull(); expect(V.tmKausivaihe(ks, Date.parse('2026-10-31T23:30:00+02:00'))).toBeTruthy();
  });
  it('kausivaiheen pohja-avain voittaa; ilman kausisuunnitelmaa pelimuodosta; pelimuoto puuttuu → null', () => {
    expect(V.tmPohjaJoukkueelle(POHJAT, ks, { id: 'j1', ika: 13, pelimuoto: '8v8' }, '2026-10-05').avain).toBe('spl_8v8_nuoruus'); expect(V.tmPohjaJoukkueelle(POHJAT, ks, { id: 'j1', ika: 13, pelimuoto: '8v8' }, '2026-11-05').avain).toBe('spl_11v11_nuoruus');
    expect(V.tmPohjaJoukkueelle(POHJAT, null, { id: 'j1', pelimuoto: '5v5' }, '2026-10-05').avain).toBe('spl_5v5'); expect(V.tmPohjaJoukkueelle(POHJAT, null, { id: 'j1', pelimuoto: '8v8', ikavaihe: 'nuoruus' }, '2026-10-05').avain).toBe('spl_8v8_nuoruus'); expect(V.tmPohjaJoukkueelle(POHJAT, null, { id: 'j1', pelimuoto: '8v8' }, '2026-10-05').avain).toBe('spl_8v8_lapsuus');
    expect(V.tmPohjaJoukkueelle(POHJAT, null, { id: 'j1' }, '2026-10-05')).toBeNull(); expect(V.tmPohjaJoukkueelle(POHJAT, ks, { id: 'j1' }, '2026-10-05')).toBeNull(); expect(V.tmPohjaJoukkueelle([], null, { id: 'j1', pelimuoto: '5v5' }, '2026-10-05')).toBeNull();
  });
  it('seuran pohja voittaa Palloliiton (sama pelimuoto); joukkueelle kohdistettu voittaa seuran; toisen joukkueen kohdistettu ei kuulu', () => {
    const seura = Object.assign({}, P('spl_5v5'), { avain: 'seura_5v5', lahde: 'seura', lahde_viite: undefined }), oma = Object.assign({}, seura, { avain: 'oma_5v5', kohde: { joukkue: 'j1' } }), vieras = Object.assign({}, seura, { avain: 'vieras', kohde: { joukkue: 'j2' } });
    expect(V.tmPohjaJoukkueelle([P('spl_5v5'), seura], null, { id: 'j1', pelimuoto: '5v5' }, '2026-10-05').avain).toBe('seura_5v5'); expect(V.tmPohjaJoukkueelle([P('spl_5v5'), seura, oma], null, { id: 'j1', pelimuoto: '5v5' }, '2026-10-05').avain).toBe('oma_5v5');
    expect(V.tmPohjaJoukkueelle([vieras], null, { id: 'j1', pelimuoto: '5v5' }, '2026-10-05')).toBeNull();
  });
});

describe('4 · tmSaaTayttaaViikon (vain UI-apu)', () => {
  const ryhmat = [{ id: 'r1', vastuu_uid: 'u7' }, { id: 'r2', vastuu_uid: 'u9' }];
  it('johto aina; joukkueen valmentaja omalle joukkueelle; ryhmän vastuu_uid omalle ryhmälle', () => {
    expect(V.tmSaaTayttaaViikon({ uid: 'u1', johto: true }, { joukkue: 'j1' }, ryhmat)).toBe(true); expect(V.tmSaaTayttaaViikon({ uid: 'u2', rooli: 'valmentaja', joukkueet: ['j1'] }, { joukkue: 'j1' }, ryhmat)).toBe(true); expect(V.tmSaaTayttaaViikon({ uid: 'u2', rooli: 'valmentaja', joukkueet: ['j1'] }, { joukkue: 'j2' }, ryhmat)).toBe(false);
    expect(V.tmSaaTayttaaViikon({ uid: 'u7' }, { ryhma: 'r1' }, ryhmat)).toBe(true); expect(V.tmSaaTayttaaViikon({ uid: 'u7' }, { ryhma: 'r2' }, ryhmat)).toBe(false); expect(V.tmSaaTayttaaViikon({ uid: 'u2', rooli: 'valmentaja', joukkueet: ['j1'] }, { ryhma: 'r1' }, ryhmat)).toBe(false);
    expect(V.tmSaaTayttaaViikon(null, { joukkue: 'j1' }, ryhmat)).toBe(false); expect(V.tmSaaTayttaaViikon({ uid: 'u1', johto: true }, null, ryhmat)).toBe(false);
  });
});

describe('5 · tmTaytaViikko', () => {
  it('ottelu la 24.10. → ma −5, ke −3, to −2', () => { const r = viikko({ ottelut: ['2026-10-24'] }); expect(paivat(r)).toEqual(['2026-10-19', '2026-10-21', '2026-10-22']); expect(r.ehdotukset.map((e) => e.md)).toEqual([-5, -3, -2]); expect(r.ohitetut).toEqual([]); });
  it('ottelu su 25.10. → siirtyy vastaavasti (ti, to, pe)', () => { expect(paivat(viikko({ ottelut: ['2026-10-25'] }))).toEqual(['2026-10-20', '2026-10-22', '2026-10-23']); });
  it('ei ottelua → oletuspäivät (ma, ke, to); muoto: tyyppi harjoitus, 17:30 + kesto, paikka tyhjä', () => {
    const r = viikko({}); expect(paivat(r)).toEqual(['2026-10-19', '2026-10-21', '2026-10-22']); expect(r.ehdotukset[0]).toEqual({ pvm: '2026-10-19', alkaa: '17:30', paattyy: '18:45', paikka: '', tyyppi: 'harjoitus', md: -5, painotus: null });
    expect(paivat(viikko({ pohja: P('spl_8v8_lapsuus') }))).toEqual(['2026-10-19', '2026-10-20', '2026-10-22', '2026-10-23']); expect(viikko({ pohja: P('spl_3v3') }).ehdotukset.map((e) => e.pvm)).toEqual(['2026-10-20', '2026-10-22']);
  });
  it('kaksi ottelua viikossa (ti + la) → ei harjoitusta ottelupäivänä eikä MD−1:nä', () => {
    const r = viikko({ pohja: P('spl_11v11_nuoruus'), ottelut: ['2026-10-20', '2026-10-24'] }), vara = ['2026-10-20', '2026-10-24', '2026-10-19', '2026-10-23'];
    expect(paivat(r)).toEqual(['2026-10-21', '2026-10-22']); vara.forEach((p) => expect(paivat(r)).not.toContain(p)); expect(r.ohitetut.every((o) => o.syy === 'ottelu')).toBe(true); expect(r.ohitetut.map((o) => o.pvm)).toEqual(['2026-10-19', '2026-10-20', '2026-10-23', '2026-10-24'].filter((p) => r.ohitetut.some((o) => o.pvm === p)));
  });
  it('ottelupäivää ei koskaan ehdoteta (yksi ottelu, ei-ottelupohja-päivä: ottelu ma)', () => { expect(paivat(viikko({ ottelut: ['2026-10-19'] }))).not.toContain('2026-10-19'); });
  it('syysloma 12.–18.10. (seuran_tauko koko_paiva) → 0 ehdotusta, ohitetut tauko; joukkueelle rajattu tauko ei koske toista joukkuetta', () => {
    const tauko = { id: 't1', tyyppi: 'seuran_tauko', nimi: 'Syysloma', koko_paiva: true, alkaa: aika('2026-10-12', '00:00'), paattyy: aika('2026-10-18', '23:59') };
    const r = viikko({ maanantai: '2026-10-12', tapahtumat: [tauko] }); expect(r.ehdotukset).toEqual([]); expect(r.ohitetut).toEqual([{ pvm: '2026-10-12', syy: 'tauko' }, { pvm: '2026-10-14', syy: 'tauko' }, { pvm: '2026-10-15', syy: 'tauko' }]);
    const rajattu = Object.assign({}, tauko, { joukkue: 'Demo U15' }); expect(viikko({ maanantai: '2026-10-12', tapahtumat: [rajattu] }).ehdotukset.length).toBe(3); expect(viikko({ maanantai: '2026-10-12', joukkue: 'Demo U15', tapahtumat: [rajattu] }).ehdotukset.length).toBe(0);
    expect(viikko({ maanantai: '2026-10-12', tapahtumat: [Object.assign({}, tauko, { poistettu: true })] }).ehdotukset.length).toBe(3);
  });
  it('olemassa oleva harjoitus ke → ke ohitetaan (ei tuplia); toisen joukkueen harjoitus ei estä', () => {
    const r = viikko({ tapahtumat: [harj('h1', '2026-10-21', '17:30')] }); expect(paivat(r)).toEqual(['2026-10-19', '2026-10-22']); expect(r.ohitetut).toEqual([{ pvm: '2026-10-21', syy: 'olemassa' }]);
    expect(paivat(viikko({ tapahtumat: [harj('h2', '2026-10-21', '17:30', { joukkue: 'Demo U15' })] }))).toEqual(['2026-10-19', '2026-10-21', '2026-10-22']);
    expect(viikko({ tapahtumat: [harj('h3', '2026-10-21', '17:30', { poistettu: true })] }).ohitetut).toEqual([]);
  });
  it('aika ja paikka historiasta: joukkueen viimeisin saman viikonpäivän harjoitus; muuten 17:30 + kesto ja tyhjä paikka', () => {
    const historia = [harj('x1', '2026-10-07', '18:00', { paikka: 'Halli' }), harj('x2', '2026-10-14', '18:15', { paikka: 'Kenttä 2' }), harj('x3', '2026-10-14', '19:00', { paikka: 'Muu', joukkue: 'Demo U15' })];
    const r = viikko({ historia }); const ke = r.ehdotukset.find((e) => e.pvm === '2026-10-21'), ma = r.ehdotukset.find((e) => e.pvm === '2026-10-19');
    expect(ke).toMatchObject({ alkaa: '18:15', paattyy: '19:30', paikka: 'Kenttä 2' }); expect(ma).toMatchObject({ alkaa: '17:30', paattyy: '18:45', paikka: '' });
  });
  it('päällekkäisyys: ryhmätapahtuma, jossa 3 samaa pelaajaa samaan aikaan → pelajia 3 (lukumäärä, ei nimiä)', () => {
    const ryhma = { id: 'r1', tyyppi: 'harjoitus', nimi: 'MV-harjoitus', alkaa: aika('2026-10-21', '17:30'), paattyy: aika('2026-10-21', '19:00'), kohde: { tyyppi: 'ryhma', ryhma_id: 'g1' } };
    const r = viikko({ tapahtumat: [ryhma], pelaajat: ['p1', 'p2', 'p3', 'p4'], kokoonpanot: { r1: ['p1', 'p2', 'p3', 'p9'] } });
    expect(r.paallekkaisyydet).toEqual([{ pvm: '2026-10-21', pelaajia: 3, toinen_tapahtuma_id: 'r1' }]); expect(JSON.stringify(r.paallekkaisyydet)).not.toMatch(/p1|p2/); expect(paivat(r)).toContain('2026-10-21');
    expect(viikko({ tapahtumat: [ryhma], pelaajat: ['p4'], kokoonpanot: { r1: ['p1'] } }).paallekkaisyydet).toEqual([]);
    const myohemmin = Object.assign({}, ryhma, { alkaa: aika('2026-10-21', '19:30'), paattyy: aika('2026-10-21', '20:30') }); expect(viikko({ tapahtumat: [myohemmin], pelaajat: ['p1'], kokoonpanot: { r1: ['p1'] } }).paallekkaisyydet).toEqual([]);
  });
  it('ryhmän viikko: kohde ryhma → "olemassa" vain saman ryhmän harjoituksesta; joukkueen harjoitus ei estä', () => {
    const omaRyhma = { id: 'rr', tyyppi: 'harjoitus', alkaa: aika('2026-10-21', '17:30'), paattyy: aika('2026-10-21', '18:30'), kohde: { tyyppi: 'ryhma', ryhma_id: 'g1' } };
    expect(viikko({ joukkue: undefined, kohde: { ryhma: 'g1' }, tapahtumat: [omaRyhma] }).ohitetut).toEqual([{ pvm: '2026-10-21', syy: 'olemassa' }]); expect(viikko({ joukkue: undefined, kohde: { ryhma: 'g2' }, tapahtumat: [omaRyhma] }).ohitetut).toEqual([]);
    expect(viikko({ joukkue: undefined, kohde: { ryhma: 'g1' }, tapahtumat: [harj('h9', '2026-10-21', '17:30')] }).ohitetut).toEqual([]);
  });
  it('kesäaika (maaliskuun viimeinen viikko): päivät oikein ottelulla la 28.3. ja su 29.3. sekä ilman; historian kellonaika Helsingin aikaa', () => {
    const M = '2026-03-23'; expect(paivat(viikko({ maanantai: M, ottelut: ['2026-03-28'] }))).toEqual(['2026-03-23', '2026-03-25', '2026-03-26']); expect(paivat(viikko({ maanantai: M, ottelut: ['2026-03-29'] }))).toEqual(['2026-03-24', '2026-03-26', '2026-03-27']);
    expect(paivat(viikko({ maanantai: M }))).toEqual(['2026-03-23', '2026-03-25', '2026-03-26']); expect(paivat(viikko({ maanantai: '2026-03-30', ottelut: ['2026-04-04'] }))).toEqual(['2026-03-30', '2026-04-01', '2026-04-02']);
    const hist = [Object.assign(harj('k1', '2026-03-18', '17:30'), { alkaa: aika('2026-03-18', '17:30', false), paattyy: aika('2026-03-18', '19:00', false) })]; expect(viikko({ maanantai: '2026-03-23', historia: hist }).ehdotukset.find((e) => e.pvm === '2026-03-25').alkaa).toBe('17:30');
    const hist2 = [Object.assign(harj('k2', '2026-03-31', '17:30'), { alkaa: aika('2026-03-31', '17:30'), paattyy: aika('2026-03-31', '19:00') })]; expect(viikko({ maanantai: '2026-04-06', historia: hist2 }).ehdotukset.find((e) => e.pvm === '2026-04-08')).toBeTruthy();
  });
  it('maanantaiksi annettu muu päivä tasataan maanantaille; virheellinen pohja/maanantai → tyhjä tulos', () => {
    expect(paivat(viikko({ maanantai: '2026-10-22' }))).toEqual(['2026-10-19', '2026-10-21', '2026-10-22']); const tyhja = { ehdotukset: [], paallekkaisyydet: [], ohitetut: [], vaihe: null };
    expect(viikko({ pohja: null })).toEqual(tyhja); expect(viikko({ maanantai: 'huomenna' })).toEqual(tyhja);
  });
  it('vaihe ja teema kulkevat ehdotuksiin; ottelu-objektit ({pvm}/{alkaaMs}) kelpaavat', () => {
    const r = viikko({ vaihe: { avain: 'kil' }, teema: 'Pallonhallinta', ottelut: [{ pvm: '2026-10-24' }] }); expect(r.vaihe).toBe('kil'); expect(r.ehdotukset.every((e) => e.teema === 'Pallonhallinta')).toBe(true); expect(paivat(r)).toEqual(['2026-10-19', '2026-10-21', '2026-10-22']);
    expect(paivat(viikko({ ottelut: [{ alkaaMs: Date.parse(aika('2026-10-24', '12:00')) }] }))).toEqual(['2026-10-19', '2026-10-21', '2026-10-22']);
  });
});

describe('6 · rajaus ja koodin laatu', () => {
  const src = readFileSync(new URL('../lib/tm_viikkopohja.js', import.meta.url), 'utf8');
  it('≤ 500 riviä; ei toISOString-leikkausta eikä paikallisaikaa (getDate/getDay/setDate); ei Firestorea; ei omaa taukologiikkaa', () => {
    expect(src.split('\n').length).toBeLessThanOrEqual(500); expect(src).not.toMatch(/toISOString\(\)\s*\.slice|\.getDate\(|\.getDay\(\)|\.setDate\(|\.getHours\(|firebase|firestore/); expect(src).toContain('tmOnTauko'); expect(src).not.toMatch(/seuran_tauko|'tauko'\)|"loma"/);
  });
  it('toimii sellaisenaan selaimessa: window.TM_VIIKKOPOHJA, kun moduuli puuttuu', () => {
    const vm = require('vm'), fs = require('fs'), ctx = { window: null, Intl, Date, Math, JSON, Array, Object, String };
    ctx.window = ctx; ['lib/tm_kalenteri_tyypit.js', 'lib/tm_kalenteri_malli.js', 'lib/tm_kalenteri_kyselyt.js', 'lib/tm_ryhmat.js', 'lib/tm_viikkopohja.js'].forEach((f) => vm.runInNewContext(fs.readFileSync(new URL('../' + f, import.meta.url), 'utf8'), ctx));
    const r = ctx.TM_VIIKKOPOHJA.tmTaytaViikko({ pohja: P('spl_5v5'), ottelut: ['2026-10-24'], tapahtumat: [], maanantai: '2026-10-19', joukkue: U13 }); expect(r.ehdotukset.map((e) => e.pvm)).toEqual(['2026-10-19', '2026-10-21', '2026-10-22']);
  });
});
