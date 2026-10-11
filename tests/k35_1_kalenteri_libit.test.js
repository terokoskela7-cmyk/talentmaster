/* K35-1 · kalenterin jaetut libit (docs/CODE_BRIEF_35_KALENTERI.md, D181, D186, D192–D194): tyyppirekisteri, tapahtumamalli, tauko, seuraava tapahtuma, testijakso. */
import { describe, it, expect } from 'vitest';
import { readFileSync } from 'fs';
import { createRequire } from 'module';
const require = createRequire(import.meta.url);
const TY = require('../lib/tm_kalenteri_tyypit.js'), MA = require('../lib/tm_kalenteri_malli.js'), KY = require('../lib/tm_kalenteri_kyselyt.js'), RY = require('../lib/tm_ryhmat.js');
const lue = (p) => readFileSync(new URL('../' + p, import.meta.url), 'utf8');
const H = (s) => Date.parse(s + '+03:00');   // Helsingin kesäaika lokakuussa (EEST) — testipäivät ennen 25.10.
const DAY = 86400000;

describe('tyyppirekisteri (D186)', () => {
  it('12 tyyppiä, VP:n KALENTERI_TYYPIT-avaimet kaikki mukana', () => {
    const vp = lue('TalentMaster_VP_v25.html'), i = vp.search(/(?:var|const|let) KALENTERI_TYYPIT\s*=/), lohko = vp.slice(i, vp.indexOf('};', i));
    const avaimet = [...lohko.matchAll(/^\s+([a-z_]+):\s+\{ nimi:/gm)].map((m) => m[1]);
    expect(avaimet.length).toBe(12);
    expect(Object.keys(TY.TYYPIT).sort()).toEqual(avaimet.sort());
    expect(TY.tmKalTyypit().map((t) => t.avain)).toEqual(TY.JARJESTYS);
  });
  it('ei emojeja eikä hex-värejä; kerros D131:n mukaan; nimiAvain i18n:lle', () => {
    const src = lue('lib/tm_kalenteri_tyypit.js');
    expect(src).not.toMatch(/#[0-9a-fA-F]{3,6}\b/);
    expect(src).not.toMatch(/\p{Extended_Pictographic}/u);
    expect(TY.tmKalTyyppi('ottelu')).toMatchObject({ kerros: 'valmennus', merkki: 'ott', nimiAvain: 'kal_tyyppi_ottelu', pikavalinta: true });
    expect(TY.tmKalTyyppi('jaksopalaveri').kerros).toBe('silmukka');
    expect(TY.tmKalTyyppi('seuran_tauko').kerros).toBe('tauko');
  });
  it('pikavalinnat: viisi yleisintä järjestyksessä (D185)', () => {
    expect(TY.tmKalPikavalinnat().map((t) => t.avain)).toEqual(['harjoitus', 'ottelu', 'testitapahtuma', 'valmentajapalaveri', 'muu']);
  });
  it('aliakset: muiden sovellusten ja vanhat nimet → kanoninen; tuntematon → muu', () => {
    expect(TY.tmKalTyyppiAvain('treeni')).toBe('harjoitus'); expect(TY.tmKalTyyppiAvain('peli')).toBe('ottelu');
    expect(TY.tmKalTyyppiAvain('tauko')).toBe('seuran_tauko'); expect(TY.tmKalTyyppiAvain('loma')).toBe('seuran_tauko');
    expect(TY.tmKalTyyppiAvain('mentorointi')).toBe('mentorointitapaaminen'); expect(TY.tmKalTyyppiAvain('Ottelu')).toBe('ottelu');
    expect(TY.tmKalTyyppiAvain('jotain')).toBe('muu'); expect(TY.tmKalTyyppiAvain(null)).toBe('muu');
  });
  it('vain henkilökunnalle = TM_RYHMAT.HK_TYYPIT (yksi lähde)', () => {
    expect(TY.HK_TYYPIT).toEqual(RY.HK_TYYPIT);
    for (const t of RY.HK_TYYPIT) expect(TY.tmKalVainHenkilokunta(t), t).toBe(true);
    expect(TY.tmKalVainHenkilokunta('harjoitus')).toBe(false); expect(TY.tmKalVainHenkilokunta('idp_seuranta')).toBe(false);
  });
});

describe('tapahtumamalli (D181, D186)', () => {
  it('normalisoi VP:n Timestampin ja Masterin merkkijonon samaan muotoon', () => {
    const ts = { seconds: H('2026-10-19T17:30:00') / 1000, nanoseconds: 0 }, ts2 = { toMillis: () => H('2026-10-19T19:00:00') };
    const vp = MA.tmKalNormalisoi({ tyyppi: 'harjoitus', alkaa: ts, paattyy: ts2, joukkue: 'kpv_u13', poistettu: false }, 'e1');
    const ms = MA.tmKalNormalisoi({ tyyppi: 'treeni', alkaa: '2026-10-19T14:30:00Z', paattyy: '2026-10-19T16:00:00Z', joukkue: 'kpv_u13' }, 'e1');
    expect(vp).toMatchObject({ id: 'e1', tyyppi: 'harjoitus', pvm: '2026-10-19', alkaaMs: ms.alkaaMs, paattyyMs: ms.paattyyMs, joukkue: 'kpv_u13', lahde: 'manuaalinen' });
    expect(ms.tyyppi).toBe('harjoitus'); expect(ms.tyyppiRaaka).toBe('treeni');
  });
  it('poistettu_pvm kummastakin muodosta; joukkue säilyy tallennettuna (ei korvata nimellä)', () => {
    expect(MA.tmKalNormalisoi({ poistettu: true, poistettu_pvm: '2026-10-01T10:00:00Z' }).poistettuMs).toBe(Date.parse('2026-10-01T10:00:00Z'));
    expect(MA.tmKalNormalisoi({ poistettu: true, poistettu_pvm: { seconds: 100 } }).poistettuMs).toBe(100000);
    expect(MA.tmKalNormalisoi({ joukkue: 'kpv_u13', joukkue_nimi: 'KPV U13' })).toMatchObject({ joukkue: 'kpv_u13', joukkue_nimi: 'KPV U13' });
  });
  it('helsingin päivä yöllä: klo 01.30 Helsingissä on sama päivä, ei UTC:n edellinen', () => {
    expect(MA.tmKalPaiva(H('2026-10-20T01:30:00'))).toBe('2026-10-20');
  });
  it('kauden loppu: kevät 30.6., syksy helmikuun viimeinen (karkausvuosi), maaliskuu → 30.6.', () => {
    expect(MA.tmKalKaudenLoppu(new Date(2026, 4, 10))).toBe('2026-06-30');
    expect(MA.tmKalKaudenLoppu(new Date(2026, 9, 11))).toBe('2027-02-28');
    expect(MA.tmKalKaudenLoppu(new Date(2027, 9, 11))).toBe('2028-02-29');
    expect(MA.tmKalKaudenLoppu(new Date(2027, 0, 15))).toBe('2027-02-28');
    expect(MA.tmKalKaudenLoppu(new Date(2027, 2, 15))).toBe('2027-06-30');
  });
  it('D181: tuodun tapahtuman lähteen kentät lukittuja, TM:n kentät vapaita; käsin luotu vapaa', () => {
    const tuotu = { lahde: 'myclub' }, oma = { lahde: 'manuaalinen' };
    expect(MA.tmKalSaaMuokata('alkaa', tuotu)).toBe(false); expect(MA.tmKalSaaMuokata('paikka', tuotu)).toBe(false);
    expect(MA.tmKalSaaMuokata('treeniteema', tuotu)).toBe(true); expect(MA.tmKalSaaMuokata('pelaajat_id', tuotu)).toBe(true);
    expect(MA.tmKalSaaMuokata('alkaa', oma)).toBe(true); expect(MA.tmKalSaaMuokata('alkaa', {})).toBe(true);
  });
  it('D181 synkka: vain muuttuneet lähteen kentät; poistunut → peruttu; TM-kenttiin ei kosketa', () => {
    const nyk = { alkaa: '2026-10-19T14:30:00Z', paattyy: '2026-10-19T16:00:00Z', paikka: 'Kenttä 1', tila: 'suunniteltu', treeniteema: { avain: 'x' } };
    expect(MA.tmKalSynkkaPaivitys(nyk, { alkaa: { seconds: Date.parse('2026-10-19T14:30:00Z') / 1000 }, paikka: 'Kenttä 2', treeniteema: null })).toEqual({ paikka: 'Kenttä 2' });
    expect(MA.tmKalSynkkaPaivitys(nyk, { tila: 'vahvistettu' })).toEqual({});
    expect(MA.tmKalSynkkaPaivitys(nyk, { tila: 'peruttu' })).toEqual({ tila: 'peruttu' });
    expect(MA.tmKalSynkkaPaivitys(nyk, null)).toEqual({ tila: 'peruttu' });
    expect(MA.tmKalSynkkaPaivitys({ tila: 'peruttu' }, null)).toEqual({});
  });
  it('testijakso: rajat normistosta (12 / 15 kk) — KPV 2.11.2025 → muistutus 2.11.2026, vanhenee 2.2.2027', () => {
    expect(MA.tmTestijaksoEhdotus('2025-11-02')).toMatchObject({ muistutus: '2026-11-02', vanhenee: '2027-02-02', muistutusKk: 12, vanhaKk: 15 });
    expect(MA.tmTestijaksoEhdotus('2025-11-30').vanhenee).toBe('2027-02-28');
    expect(MA.tmTestijaksoEhdotus(null)).toBe(null);
    expect(lue('lib/tm_kalenteri_malli.js')).not.toMatch(/\b(12|15)\s*\)\s*;?\s*\/\/\s*(kk|MUISTUTUS|VANHA)/);
  });
});

describe('tauko (D193): ainoa lähde seuran_tauko', () => {
  const kal = [
    { id: 't1', tyyppi: 'seuran_tauko', nimi: 'Syysloma', alkaa: H('2026-10-12T00:00:00'), paattyy: H('2026-10-18T23:59:00'), koko_paiva: true },
    { id: 't2', tyyppi: 'seuran_tauko', nimi: 'Poistettu', alkaa: H('2026-11-02T00:00:00'), paattyy: H('2026-11-08T23:59:00'), poistettu: true },
    { id: 't3', tyyppi: 'loma', nimi: 'Vanha loma', alkaa: H('2026-12-21T00:00:00'), paattyy: H('2026-12-27T23:59:00') },
    { id: 't4', tyyppi: 'seuran_tauko', nimi: 'P13 leiri', alkaa: H('2026-11-14T00:00:00'), paattyy: H('2026-11-15T23:59:00'), joukkue: 'kpv_u13' },
    { id: 'h1', tyyppi: 'harjoitus', nimi: 'Harjoitus', alkaa: H('2026-10-14T17:30:00') }
  ];
  it('tunnistaa tauon päivän Helsingin ajassa, ei poistettua, ei harjoitusta', () => {
    expect(KY.tmOnTauko(kal, H('2026-10-12T00:30:00'))).toMatchObject({ tauko: true, nimi: 'Syysloma', alku: '2026-10-12', loppu: '2026-10-18' });
    expect(KY.tmOnTauko(kal, H('2026-10-18T23:00:00')).tauko).toBe(true);
    expect(KY.tmOnTauko(kal, H('2026-10-19T08:00:00')).tauko).toBe(false);
    expect(KY.tmOnTauko(kal, H('2026-11-03T12:00:00')).tauko).toBe(false);
    expect(KY.tmOnTauko(kal, '2026-12-24').tauko).toBe(true);
  });
  it('joukkueelle rajattu tauko koskee vain sitä joukkuetta; koko seuran tauko kaikkia', () => {
    expect(KY.tmOnTauko(kal, '2026-11-14', 'kpv_u13').tauko).toBe(true);
    expect(KY.tmOnTauko(kal, '2026-11-14', 'kpv_t13').tauko).toBe(false);
    expect(KY.tmOnTauko(kal, '2026-11-14').tauko).toBe(false);
    expect(KY.tmOnTauko(kal, '2026-10-15', 'kpv_t13').tauko).toBe(true);
  });
  it('taukopäivät välillä (eskalointi, katselmusikkunat)', () => {
    expect(KY.tmTaukopaivat('2026-10-08', '2026-10-21', kal)).toBe(7);
    expect(KY.tmTaukopaivat('2026-10-15', '2026-10-16', kal)).toBe(2);
    expect(KY.tmTaukopaivat('2026-10-19', '2026-10-25', kal)).toBe(0);
    expect(KY.tmTaukopaivat('2026-10-21', '2026-10-08', kal)).toBe(0);
  });
  it('ei rinnakkaisia taukolähteitä uusissa libeissä (env.tauot, kausisuunnitelma.tauot, kalenteri/tauot)', () => {
    for (const f of ['lib/tm_kalenteri_kyselyt.js', 'lib/tm_kalenteri_malli.js']) expect(lue(f).replace(/\/\*[\s\S]*?\*\//g, '')).not.toMatch(/env\.tauot|kausisuunnitelma[^\n]*tauot|kalenteri\/tauot/);
  });
});

describe('seuraava tapahtuma', () => {
  const NYT = H('2026-10-19T16:00:00');
  const kal = [
    { id: 'a', tyyppi: 'harjoitus', nimi: 'P13 harjoitus', joukkue: 'kpv_u13', alkaa: H('2026-10-19T17:30:00'), paattyy: H('2026-10-19T19:00:00'), paikka: 'Kipparihalli' },
    { id: 'b', tyyppi: 'harjoitus', nimi: 'Mennyt', joukkue: 'kpv_u13', alkaa: H('2026-10-19T10:00:00'), paattyy: H('2026-10-19T11:00:00') },
    { id: 'c', tyyppi: 'harjoitus', nimi: 'Talenttiryhmä', kohde: { tyyppi: 'ryhma', ryhma_id: 'r1' }, pelaajat_id: ['p1'], alkaa: H('2026-10-19T17:00:00') },
    { id: 'd', tyyppi: 'valmentajapalaveri', nimi: 'Palaveri', joukkue: 'kpv_u13', nakyvyys: 'henkilokunta', alkaa: H('2026-10-19T16:30:00') },
    { id: 'e', tyyppi: 'harjoitus', nimi: 'Peruttu', joukkue: 'kpv_u13', tila: 'peruttu', alkaa: H('2026-10-19T16:15:00') },
    { id: 'f', tyyppi: 'peli', nimi: 'Ottelu', joukkue: 'kpv_u13', alkaa: H('2026-10-24T12:00:00') },
    { id: 'g', tyyppi: 'harjoitus', nimi: 'Käynnissä', joukkue: 'kpv_t13', alkaa: H('2026-10-19T15:00:00'), paattyy: H('2026-10-19T16:30:00') }
  ];
  it('joukkueen seuraava harjoitus; ei mennyttä, ei perutteja', () => {
    expect(KY.tmSeuraavaTapahtuma(kal, { joukkue: 'kpv_u13', tyyppi: 'harjoitus', nyt: NYT })).toMatchObject({ id: 'a', paikka: 'Kipparihalli', tyyppi: 'harjoitus' });
  });
  it('ilman tyyppirajausta palaveri tulee ennen harjoitusta (henkilökunnan näkymä)', () => {
    expect(KY.tmSeuraavaTapahtuma(kal, { joukkue: 'kpv_u13', nyt: NYT }).id).toBe('d');
  });
  it('pelaaja: ryhmän tapahtuma mukana, henkilökunnan palaveri ei (TM_RYHMAT.tmTapahtumaKuuluuPelaajalle)', () => {
    const p1 = { id: 'p1', joukkue: 'kpv_u13', joukkueet: ['kpv_u13'] };
    expect(KY.tmSeuraavaTapahtuma(kal, { pelaaja: p1, nyt: NYT }).id).toBe('c');
    expect(KY.tmSeuraavaTapahtuma(kal, { pelaaja: { id: 'p2', joukkueet: ['kpv_u13'] }, nyt: NYT }).id).toBe('a');
  });
  it('ryhmä, aliakset tyypissä, käynnissä oleva lasketaan', () => {
    expect(KY.tmSeuraavaTapahtuma(kal, { ryhma: 'r1', nyt: NYT }).id).toBe('c');
    expect(KY.tmSeuraavaTapahtuma(kal, { joukkue: 'kpv_u13', tyyppi: 'ottelu', nyt: NYT }).id).toBe('f');
    expect(KY.tmSeuraavaTapahtuma(kal, { joukkue: 'kpv_t13', nyt: NYT }).id).toBe('g');
    expect(KY.tmSeuraavaTapahtuma(kal, { joukkue: 'ei_ole', nyt: NYT })).toBe(null);
    expect(KY.tmSeuraavaTapahtuma(null, { nyt: NYT })).toBe(null);
  });
  it('Masterin muoto (pvm + HH:MM) toimii samoin kuin VP:n Timestamp', () => {
    const m = [{ id: 'm1', tyyppi: 'harjoitus', joukkue: 'KPV U13', pvm: '2026-10-21', alkaa: '17:30', paattyy: '19:00' }, { id: 'm0', tyyppi: 'harjoitus', joukkue: 'KPV U13', pvm: '2026-10-19', alkaa: '9:00', paattyy: '10:00' }];
    const nyt = new Date(2026, 9, 20, 12, 0).getTime();
    const s = KY.tmSeuraavaTapahtuma(m, { joukkue: 'KPV U13', nyt });
    expect(s.id).toBe('m1'); expect(s.alkaa).toBe(new Date(2026, 9, 21, 17, 30).getTime());
    expect(KY.tmOnTauko([{ tyyppi: 'seuran_tauko', pvm: '2026-10-12', alkaa: '', paattyy: '' }], new Date(2026, 9, 12, 15).getTime()).tauko).toBe(true);
    const mt = [{ tyyppi: 'seuran_tauko', pvm: '2026-10-12', alkaa: '00:00', paattyy: '23:59', _alkaaMs: new Date(2026, 9, 12, 0, 0).getTime(), _paattyyMs: new Date(2026, 9, 18, 23, 59).getTime() }];
    expect(KY.tmOnTauko(mt, new Date(2026, 9, 16, 12).getTime()).tauko).toBe(true);   // monipäiväinen tauko Masterissa: loppupäivä _paattyyMs:stä
  });
  it('tauko ei ole seuraava tapahtuma', () => {
    expect(KY.tmSeuraavaTapahtuma([{ id: 't', tyyppi: 'seuran_tauko', alkaa: NYT + DAY }], { nyt: NYT })).toBe(null);
  });
});

describe('Node-yhteensopivuus (functions-kopio tehdään ensimmäisessä palvelinkäytössä, kaista Tero)', () => {
  it('kyselyt-lib toimii Nodessa pelkillä lib/-riippuvuuksilla (tm_ryhmat, tm_kalenteri_tyypit)', () => {
    expect(KY.tmOnTauko([{ tyyppi: 'tauko', alkaa: '2026-10-12', paattyy: '2026-10-18' }], '2026-10-14').tauko).toBe(true);
    expect(KY.tmSeuraavaTapahtuma([{ id: 'x', tyyppi: 'harjoitus', pelaajat_id: ['p'], alkaa: '2026-10-20T15:00:00Z' }], { pelaaja: { id: 'p' }, nyt: '2026-10-19T00:00:00Z' }).id).toBe('x');
    const src = lue('lib/tm_kalenteri_kyselyt.js'); expect([...src.matchAll(/_lib\('\.\/([a-z_]+\.js)'/g)].map((m) => m[1]).sort()).toEqual(['tm_kalenteri_tyypit.js', 'tm_ryhmat.js']);
  });
});
