/* K35-6d · Joukkueen omat: vapaa (D240), erikoisohjelma (D241), joukkueen valmennuspalaveri (D242). Fixturet FC Demon kaltaisia (keksityt nimet). */
import { describe, it, expect } from 'vitest';
import { readFileSync } from 'fs';
import { createRequire } from 'module';
const require = createRequire(import.meta.url);
const TY = require('../lib/tm_kalenteri_tyypit.js'), KY = require('../lib/tm_kalenteri_kyselyt.js'), MA = require('../lib/tm_kalenteri_malli.js'), V = require('../lib/tm_viikkopohja.js'), R = require('../lib/tm_ryhmat.js'), O = require('../lib/tm_kalenteri_omat.js'), N = require('../lib/tm_kalenteri_nakyma.js');
const lue = (f) => readFileSync(new URL('../' + f, import.meta.url), 'utf8');
const MASTER = lue('TalentMaster_Master_v16.html');
const ms = (pvm, hhmm, off) => Date.parse(pvm + 'T' + hhmm + ':00' + (off || '+03:00'));
const koko = (id, tyyppi, a, b, o) => Object.assign({ id, tyyppi, nimi: '', koko_paiva: true, pvm: a, alkaa: '00:00', paattyy: '23:59', _alkaaMs: ms(a, '00:00'), _paattyyMs: ms(b, '23:59'), joukkue: 'Demo U13', joukkue_nimi: 'Demo U13', poistettu: false }, o || {});
const POHJAT = V.tmPalloliitonPohjat(JSON.parse(lue('docs/data/spl_viikkopohjat_2023.json'))), P = (a) => POHJAT.find((p) => p.avain === a);

describe('1 · tyyppirekisteri', () => {
  it('14 tyyppiä (+ joukkueen_vapaa, erikoisohjelma); HK-joukko ennallaan ja sama kuin TM_RYHMAT.HK_TYYPIT', () => {
    expect(TY.tmKalTyypit().length).toBe(14); expect(Object.keys(TY.TYYPIT)).toContain('joukkueen_vapaa'); expect(Object.keys(TY.TYYPIT)).toContain('erikoisohjelma');
    expect(TY.HK_TYYPIT).toEqual(['jaksopalaveri', 'valmentajapalaveri', 'tiimipalaveri', 'kokous', 'kalibraatiopaja', 'mentorointitapaaminen']); expect(TY.HK_TYYPIT).toEqual(R.HK_TYYPIT);
    ['joukkueen_vapaa', 'erikoisohjelma'].forEach((a) => expect(TY.tmKalVainHenkilokunta(a)).toBe(false));
  });
  it('joukkueen_vapaa: kerros tauko, merkki tauko, koko päivä, monipäiväinen, joukkue pakollinen; erikoisohjelma: kerros valmennus, koko päivä, monipäiväinen; laji-lista', () => {
    expect(TY.tmKalTyyppi('joukkueen_vapaa')).toMatchObject({ kerros: 'tauko', merkki: 'tauko', kokoPaiva: true, monipaivainen: true, joukkuePakollinen: true, tauko: true, vainHenkilokunta: false });
    expect(TY.tmKalTyyppi('erikoisohjelma')).toMatchObject({ kerros: 'valmennus', kokoPaiva: true, monipaivainen: true, joukkuePakollinen: true, tauko: false }); expect(TY.ERIKOISOHJELMA_LAJIT).toEqual(['leiri', 'turnaus', 'kotiviikko', 'kevennys', 'muu']);
    expect(TY.tmKalOnTauko('seuran_tauko')).toBe(true); expect(TY.tmKalOnTauko('loma')).toBe(true); expect(TY.tmKalOnTauko('joukkueen_vapaa')).toBe(true); expect(TY.tmKalOnTauko('erikoisohjelma')).toBe(false); expect(TY.tmKalOnTauko('harjoitus')).toBe(false);
  });
  it('luontilista: molemmat uudet kaikille rooleille (ei seuran_tauko ilman johtoa); muokkauksen tyyppivalitsin ei tarjoa koko päivän tyyppejä', () => {
    const avaimet = (j, o) => TY.tmKalTyypitRoolille(j, o).map((t) => t.avain);
    ['joukkueen_vapaa', 'erikoisohjelma'].forEach((a) => { expect(avaimet(false, { tauko: false })).toContain(a); expect(avaimet(true, { tauko: false })).toContain(a); expect(avaimet(false, { tauko: false, kokoPaiva: false })).not.toContain(a); });
    expect(avaimet(false, { tauko: false })).not.toContain('seuran_tauko'); expect(avaimet(true, { tauko: false })).toHaveLength(13); expect(avaimet(true, { tauko: false, kokoPaiva: false })).toHaveLength(11); expect(avaimet(true)).toContain('seuran_tauko');
    expect(MA.tmKalTyyppiMuutos({ tyyppi: 'harjoitus' }, 'joukkueen_vapaa', true)).toEqual({}); expect(MA.tmKalTyyppiMuutos({ tyyppi: 'harjoitus' }, 'erikoisohjelma', true)).toEqual({});
  });
  it('tmKalKokoPaiva: molemmat uudet koko päivän riville (myös ilman koko_paiva-lippua)', () => { expect(MA.tmKalKokoPaiva({ tyyppi: 'joukkueen_vapaa' })).toBe(true); expect(MA.tmKalKokoPaiva({ tyyppi: 'erikoisohjelma' })).toBe(true); expect(MA.tmKalKokoPaiva({ tyyppi: 'harjoitus' })).toBe(false); });
});

describe('2 · joukkuetauko: tmOnTauko / tmKalTauot lukevat joukkueen_vapaa:n (D193 yksi lähde)', () => {
  const vapaa = koko('v1', 'joukkueen_vapaa', '2026-10-22', '2026-10-25'), seura = koko('s1', 'seuran_tauko', '2026-10-12', '2026-10-18', { joukkue: '', joukkue_nimi: '' });
  it('vapaa koskee vain omaa joukkuetta (ei toista, ei seuran laajuista kyselyä); päivät ti–su rajoissa', () => {
    expect(KY.tmOnTauko([vapaa], '2026-10-22', 'Demo U13').tauko).toBe(true); expect(KY.tmOnTauko([vapaa], '2026-10-25', 'Demo U13').tauko).toBe(true); expect(KY.tmOnTauko([vapaa], '2026-10-21', 'Demo U13').tauko).toBe(false); expect(KY.tmOnTauko([vapaa], '2026-10-26', 'Demo U13').tauko).toBe(false);
    expect(KY.tmOnTauko([vapaa], '2026-10-23', 'Demo U15').tauko).toBe(false); expect(KY.tmOnTauko([vapaa], '2026-10-23').tauko).toBe(false);
  });
  it('seuran_tauko ennallaan (koko seura); molemmat yhdessä; poistettu vapaa ei vaikuta; tmTaukopaivat laskee molemmat', () => {
    expect(KY.tmOnTauko([seura], '2026-10-14', 'Demo U15').tauko).toBe(true); expect(KY.tmOnTauko([seura, vapaa], '2026-10-14', 'Demo U13').tauko).toBe(true); expect(KY.tmOnTauko([Object.assign({}, vapaa, { poistettu: true })], '2026-10-23', 'Demo U13').tauko).toBe(false);
    expect(KY.tmKalTauot([seura, vapaa], 'Demo U13').length).toBe(2); expect(KY.tmKalTauot([seura, vapaa], 'Demo U15').length).toBe(1); expect(KY.tmTaukopaivat('2026-10-20', '2026-10-26', [vapaa], 'Demo U13')).toBe(4);
  });
  it('Täytä viikko ohittaa joukkueen vapaan (syy tauko) — vain omalle joukkueelle', () => {
    const a = (j) => V.tmTaytaViikko({ pohja: P('spl_8v8_nuoruus'), maanantai: '2026-10-19', ottelut: ['2026-10-24'], tapahtumat: [vapaa], joukkue: j }), pv = (r) => r.ehdotukset.map((e) => e.pvm.slice(8));
    expect(pv(a('Demo U13'))).toEqual(['19', '20']); expect(a('Demo U13').ohitetut).toContainEqual({ pvm: '2026-10-22', syy: 'tauko' }); expect(pv(a('Demo U15'))).toEqual(['19', '20', '22', '23']);
  });
});

describe('3 · erikoisohjelma Täytä viikolla (D241)', () => {
  const run = (t, o) => V.tmTaytaViikko(Object.assign({ pohja: P('spl_8v8_nuoruus'), maanantai: '2026-10-19', ottelut: ['2026-10-24'], tapahtumat: t, joukkue: 'Demo U13' }, o)), pv = (r) => r.ehdotukset.map((e) => e.pvm.slice(8)), oh = (r) => r.ohitetut.filter((x) => x.syy !== 'ottelu' && x.syy !== 'palautuminen');
  const eo = (laji, a, b, o) => koko('e' + laji, 'erikoisohjelma', a, b, Object.assign({ laji }, o));
  it('leiri / turnaus / kotiviikko → päivät ohitetaan, ohitetut syy = laji', () => {
    ['leiri', 'turnaus', 'kotiviikko'].forEach((l) => { const r = run([eo(l, '2026-10-21', '2026-10-22')]); expect(pv(r)).toEqual(['19', '20', '23']); expect(oh(r)).toEqual([{ pvm: '2026-10-22', syy: l }]); });
    const koko_ = run([eo('turnaus', '2026-10-19', '2026-10-25')]); expect(pv(koko_)).toEqual([]); expect(oh(koko_).map((x) => x.syy)).toEqual(['turnaus', 'turnaus', 'turnaus', 'turnaus']);
  });
  it('kevennys → viikolta pois pohjan viimeinen MD-päivä (ottelua lähin: MD−1 pe), muut ennallaan; syy kevennys', () => {
    const r = run([eo('kevennys', '2026-10-19', '2026-10-25')]); expect(pv(r)).toEqual(['19', '20', '22']); expect(oh(r)).toEqual([{ pvm: '2026-10-23', syy: 'kevennys' }]);
    expect(pv(run([eo('kevennys', '2026-10-22', '2026-10-22')]))).toEqual(['19', '20', '22']);   // osuu viikolle yhdelläkin päivällä
    expect(pv(run([eo('kevennys', '2026-11-02', '2026-11-04')]))).toEqual(['19', '20', '22', '23']);   // eri viikko → ei vaikutusta
    const kolme = run([eo('kevennys', '2026-10-19', '2026-10-25')], { pohja: P('spl_5v5') }); expect(pv(kolme)).toEqual(['19', '21']); expect(oh(kolme)).toEqual([{ pvm: '2026-10-22', syy: 'kevennys' }]);   // 5v5: −5, −3, −2 → pois −2
  });
  it('muu → ei vaikutusta; toisen joukkueen erikoisohjelma ei vaikuta; poistettu/peruttu ei vaikuta', () => {
    const perus = pv(run([])); expect(pv(run([eo('muu', '2026-10-19', '2026-10-25')]))).toEqual(perus); expect(pv(run([eo('leiri', '2026-10-19', '2026-10-25', { joukkue: 'Demo U15', joukkue_nimi: 'Demo U15' })]))).toEqual(perus);
    expect(pv(run([eo('leiri', '2026-10-19', '2026-10-25', { poistettu: true })]))).toEqual(perus); expect(pv(run([eo('leiri', '2026-10-19', '2026-10-25', { tila: 'peruttu' })]))).toEqual(perus);
  });
  it('Monista edellinen viikko: leiri → päivät ohitetaan; kevennys → viimeinen päivä pois', () => {
    const edell = [{ id: 'a', tyyppi: 'harjoitus', pvm: '2026-10-13', joukkue: 'Demo U13', alkaa: '17:30', paattyy: '19:00', _alkaaMs: ms('2026-10-13', '17:30'), _paattyyMs: ms('2026-10-13', '19:00') }, { id: 'b', tyyppi: 'harjoitus', pvm: '2026-10-15', joukkue: 'Demo U13', alkaa: '17:30', paattyy: '19:00', _alkaaMs: ms('2026-10-15', '17:30'), _paattyyMs: ms('2026-10-15', '19:00') }, { id: 'c', tyyppi: 'harjoitus', pvm: '2026-10-16', joukkue: 'Demo U13', alkaa: '17:30', paattyy: '19:00', _alkaaMs: ms('2026-10-16', '17:30'), _paattyyMs: ms('2026-10-16', '19:00') }];
    const m = (t) => V.tmMonistaViikko({ tapahtumat: edell.concat(t), maanantai: '2026-10-19', joukkue: 'Demo U13' });
    expect(m([]).ehdotukset.map((e) => e.pvm.slice(8))).toEqual(['20', '22', '23']); const l = m([eo('leiri', '2026-10-22', '2026-10-22')]); expect(l.ehdotukset.map((e) => e.pvm.slice(8))).toEqual(['20', '23']); expect(l.ohitetut).toContainEqual({ pvm: '2026-10-22', syy: 'leiri' });
    const k = m([eo('kevennys', '2026-10-19', '2026-10-25')]); expect(k.ehdotukset.map((e) => e.pvm.slice(8))).toEqual(['20', '22']); expect(k.ohitetut).toContainEqual({ pvm: '2026-10-23', syy: 'kevennys' });
  });
  it('Täytä viikko -kortin ohitettu-rivi näyttää syyn ("pe kevennys")', () => {
    const r = run([eo('kevennys', '2026-10-19', '2026-10-25')]), malli = N.tmKalViikkoMalli({ tapahtumat: [], maanantai: '2026-10-19', ehdotukset: r.ehdotukset, ohitetut: r.ohitetut }), h = N.tmKalViikkoHTML(malli, { t: (x) => x, on: {} }); expect(h).toContain('pe kevennys');
  });
});

describe('4 · joukkueen valmennuspalaveri (D242)', () => {
  it('tmKenelleDoc joukkue_hk: kohde { henkilokunta, joukkue }, nakyvyys henkilokunta, joukkue-id; ilman joukkuetta virhe', () => {
    const d = R.tmKenelleDoc({ tapa: 'joukkue_hk', joukkue: 'demo_u13', joukkueNimet: { demo_u13: 'Demo U13' } }, {}); expect(d.ok).toBe(true); expect(d.osa).toMatchObject({ joukkue: 'demo_u13', joukkue_nimi: 'Demo U13', joukkueet: ['demo_u13'], pelaajat_id: [], kohde: { tyyppi: 'henkilokunta', joukkue: 'demo_u13' }, nakyvyys: 'henkilokunta' });
    expect(R.tmKenelleDoc({ tapa: 'joukkue_hk', joukkue: '' }, {}).ok).toBe(false); expect(R.tmKenelleDoc({ tapa: 'henkilokunta' }, {}).osa.kohde).toEqual({ tyyppi: 'henkilokunta' });   // vanha "koko henkilökunta" ennallaan
  });
  it('tmNakyyKalenterissa: joukkue-henkilökunta vain sen joukkueen valmentajille, johdolle ja luojalle; ilman joukkuetta koko henkilökunta (nykyinen)', () => {
    const ev = { tyyppi: 'valmentajapalaveri', nakyvyys: 'henkilokunta', luoja_uid: 'u1', kohde: { tyyppi: 'henkilokunta', joukkue: 'demo_u13' } }, N_ = (c) => R.tmNakyyKalenterissa(ev, c);
    expect(N_({ uid: 'u2', omatJoukkueet: ['demo_u13'] })).toBe(true); expect(N_({ uid: 'u2', omatJoukkueet: ['demo_u15'] })).toBe(false); expect(N_({ uid: 'u2', omatJoukkueet: [] })).toBe(false); expect(N_({ uid: 'u2' })).toBe(false);
    expect(N_({ uid: 'u2', johto: true, omatJoukkueet: [] })).toBe(true); expect(N_({ uid: 'u1', omatJoukkueet: [] })).toBe(true);   // luoja
    expect(R.tmNakyyKalenterissa(Object.assign({}, ev, { kohde: { tyyppi: 'henkilokunta' } }), { uid: 'u2', omatJoukkueet: [] })).toBe(true);
  });
  it('Kenelle-HTML: "Joukkueen valmennus (Demo U13)" -valinta vain kun sallittu; pelaaja ei näe tapahtumaa (nakyvyys henkilokunta)', () => {
    const h = R.tmKenelleHTML({ sallitut: ['joukkue', 'joukkue_hk', 'ryhma', 'pelaajat', 'henkilokunta'], joukkueHkNimi: 'Joukkueen valmennus (Demo U13)' }); expect(h).toContain('<option value="joukkue_hk">Joukkueen valmennus (Demo U13)</option>'); expect(R.tmKenelleHTML({})).not.toContain('joukkue_hk');
    expect(R.tmNakyyPelaajalle({ tyyppi: 'valmentajapalaveri', nakyvyys: 'henkilokunta', kohde: { tyyppi: 'henkilokunta', joukkue: 'demo_u13' } })).toBe(false);
  });
  it('Masterin visibilityn kutsu antaa omatJoukkueet (id + nimi)', () => { expect(MASTER).toContain('omatJoukkueet: [_calJoukkueId(), _joukkue].filter(Boolean)'); expect(MASTER).toContain("_kv.tapa === 'joukkue_hk'"); });
});

describe('5 · luonnin lib (tm_kalenteri_omat) ja Masterin kytkentä', () => {
  const v = (o) => Object.assign({ tyyppi: 'joukkueen_vapaa', pvm: '2026-10-22', loppu: '2026-10-25', joukkueId: 'demo_u13', joukkueNimi: 'Demo U13' }, o);
  it('tmKalOmatDoc: vapaa → koko päivä, joukkue-id, alkaa 00:00 – loppu 23:59, ei lajia; erikoisohjelma → laji pakollinen ja kelvollinen', () => {
    const a = O.tmKalOmatDoc(v()); expect(a).toMatchObject({ ok: true, alkaa: '2026-10-22T00:00', paattyy: '2026-10-25T23:59' }); expect(a.doc).toMatchObject({ tyyppi: 'joukkueen_vapaa', nimi: 'Joukkueen vapaa', koko_paiva: true, joukkue: 'demo_u13', joukkue_nimi: 'Demo U13', joukkueet: ['demo_u13'], kohde: { tyyppi: 'joukkue' } }); expect('laji' in a.doc).toBe(false);
    const e = O.tmKalOmatDoc(v({ tyyppi: 'erikoisohjelma', laji: 'kotiviikko' })); expect(e.doc).toMatchObject({ tyyppi: 'erikoisohjelma', laji: 'kotiviikko', nimi: 'Kotiviikko' }); expect(O.tmKalOmatDoc(v({ tyyppi: 'erikoisohjelma', laji: 'x' }))).toEqual({ ok: false, syy: 'laji' }); expect(O.tmKalOmatDoc(v({ tyyppi: 'erikoisohjelma', nimi: 'Kesäleiri', laji: 'leiri' })).doc.nimi).toBe('Kesäleiri');
  });
  it('virheet: joukkue puuttuu, loppu ennen alkua, väärä päivämuoto, ei koko päivän tyyppi; loppupäivä puuttuu → yksi päivä', () => {
    expect(O.tmKalOmatDoc(v({ joukkueId: '' }))).toEqual({ ok: false, syy: 'joukkue' }); expect(O.tmKalOmatDoc(v({ loppu: '2026-10-21' }))).toEqual({ ok: false, syy: 'loppu' }); expect(O.tmKalOmatDoc(v({ pvm: 'huomenna' }))).toEqual({ ok: false, syy: 'loppu' }); expect(O.tmKalOmatDoc(v({ tyyppi: 'harjoitus' }))).toEqual({ ok: false, syy: 'tyyppi' });
    expect(O.tmKalOmatDoc(v({ loppu: '' }))).toMatchObject({ ok: true, alkaa: '2026-10-22T00:00', paattyy: '2026-10-22T23:59' });
  });
  it('tmKalOmatKenelle: koko päivän omat lukittu joukkueeseen; palaverille + joukkue_hk (jos joukkue valittuna); muut ennallaan', () => {
    expect(O.tmKalOmatKenelle('joukkueen_vapaa', { joukkue: true }).sallitut).toEqual(['joukkue']); expect(O.tmKalOmatKenelle('erikoisohjelma', {}).sallitut).toEqual(['joukkue']); expect(O.tmKalOmatKenelle('valmentajapalaveri', { joukkue: true }).sallitut).toEqual(['joukkue', 'joukkue_hk', 'ryhma', 'pelaajat', 'henkilokunta']);
    expect(O.tmKalOmatKenelle('valmentajapalaveri', { joukkue: false }).sallitut).toEqual(['joukkue', 'ryhma', 'pelaajat', 'henkilokunta']); expect(O.tmKalOmatKenelle('harjoitus', { joukkue: true }).sallitut).toEqual(['joukkue', 'ryhma', 'pelaajat', 'henkilokunta']);
  });
  it('tmKalOmatNayta: koko päivän tyypeillä Loppupäivä näkyy (+ Laji vain erikoisohjelmalle), kellonajat ja toistuvuus piiloon; muilla päinvastoin', () => {
    const el = () => ({ style: {} }), laji = el(), wrap = { style: {}, querySelector: () => laji }, a = el(), b = el();
    O.tmKalOmatNayta('erikoisohjelma', { wrap, piilota: [a, b] }); expect([wrap.style.display, laji.style.display, a.style.display]).toEqual(['flex', 'block', 'none']); O.tmKalOmatNayta('joukkueen_vapaa', { wrap, piilota: [a, b] }); expect([wrap.style.display, laji.style.display, b.style.display]).toEqual(['flex', 'none', 'none']);
    O.tmKalOmatNayta('harjoitus', { wrap, piilota: [a, b] }); expect([wrap.style.display, a.style.display, b.style.display]).toEqual(['none', '', '']);
    const m = el(); m.style.display = 'none'; O.tmKalOmatNayta('harjoitus', { wrap, piilota: [m] }); expect(m.style.display).toBe('none');   // tyyppikohtaisesti piilotettu lohko (mentorointi/logistiikka) ei aukea vahingossa
    O.tmKalOmatNayta('joukkueen_vapaa', { wrap, piilota: [m] }); O.tmKalOmatNayta('harjoitus', { wrap, piilota: [m] }); expect(m.style.display).toBe('none');
  });
  it('HTML: Loppupäivä + Laji (5 lajia), ei hexejä/emojeja; Master kytkee libin eikä käsittele päiviä/tyyppejä itse', () => {
    const h = O.tmKalOmatHTML({ t: (x) => x, pvm: '2026-10-22' }); expect(h).toContain('id="tapahtumaLoppu" value="2026-10-22"'); expect((h.match(/<option/g) || []).length).toBe(5); expect(h).not.toMatch(/#[0-9a-fA-F]{3,6}\b/); expect(h).not.toMatch(/[\u{1F300}-\u{1FAFF}]/u);
    expect(MASTER).toContain('lib/tm_kalenteri_omat.js'); expect(MASTER).toContain('TM_KALENTERI_OMAT.tmKalOmatDoc('); expect(MASTER).toContain('TM_KALENTERI_OMAT.tmKalOmatNayta('); expect(MASTER).not.toMatch(/'joukkueen_vapaa'|'erikoisohjelma'/);
  });
});

describe('6 · Rules v3.58 (lähdetarkistus; emulaattoritestit tests/rules)', () => {
  it('versio + changelog; kalTyyppiSaaKirjoittaa create ja update (uusi + vanha dokumentti) oikeassa kalenteri-lohkossa', () => {
    const r = lue('tm_admin/firestore.rules'); expect(r).toMatch(/firestore\.rules v3\.(5[89]|60|61|62|63|64|65|66|67|68|69|70|71)/); expect(r).toMatch(/Muutokset v3\.57 → v3\.58/); expect(r).toContain("kalTyyppi(d) in ['seuran_tauko', 'tauko', 'loma']"); expect(r).toContain("['joukkueen_vapaa', 'erikoisohjelma']");
    const a = r.indexOf('match /kalenteri/{tapahtumaId}'), blokki = r.slice(a, r.indexOf('match /henkilokunta/{dokId}', a)); expect(blokki).toContain('allow create: if !(\'muistiinpanot\' in request.resource.data)\n                      && kalTyyppiSaaKirjoittaa(seuraId, request.resource.data)'); expect(blokki).toContain('kalTyyppiSaaKirjoittaa(seuraId, request.resource.data) && kalTyyppiSaaKirjoittaa(seuraId, resource.data)');
  });
});
