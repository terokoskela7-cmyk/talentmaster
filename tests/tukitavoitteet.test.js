/**
 * lib/tm_tukitavoitteet.js — J1 (docs/CODE_BRIEF_J1_TUKITAVOITTEET.md; design 12 D17–D22, 13 §7).
 * Fixture: KPV U13 -testipelaaja Topias (m93GBdOaGCUuenMiCL0I) -tyyppinen pelaaja. Vain puhtaita funktioita — ei Firebasea.
 */
import { describe, it, expect } from 'vitest';
import { createRequire } from 'module';
import { readFileSync } from 'fs';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';
const require = createRequire(import.meta.url);
const TT = require('../lib/tm_tukitavoitteet.js');
const JM = require('../lib/tm_jakso_malli.js');
const IDP = require('../lib/tm_idp.js');
const EEK = require('../lib/tm_eerikkila_normit.js');
const TAKS = require('../lib/tm_arviointi_taksonomia.js');
const TANAAN = '2026-10-07';
const KETJUT = /\b(SBL|SFL|LL|DIAG|DFL)\b/;

const PHV = (koodi) => (koodi ? { biologinenIka_viimeisin: { phv_tila_koodi: koodi } } : {});
// Heikko 30 m (taso 1) + heikko kiihdytys (taso 2), testattu 20.9. (≤ 6 kk)
const TOPIAS = (phv, lisa) => Object.assign({ id: 'm93GBdOaGCUuenMiCL0I', joukkue: 'KPV U13', syntymaVuosi: 2013, ydinvahvuus: { kuvaus: 'Tempokuljetus', havaittu_pvm: '2026-10-01', rooli: 'vp' },
  hh_viimeisin: { lin30m: 5.8, lin10m: 1.95 }, hh_pvm: '2026-09-20' }, PHV(phv), lisa || {});
const K = (lisa) => Object.assign({ tanaan: TANAAN, ika: 13, sp: 'P', ikavaihe: 'rakentaja' }, lisa || {});
const ADAR = (pvm, pisteet) => ({ tyyppi: 'adar_pikakortti', pvm, pisteet, havaitut: [], nakyvyys: false });
const kaikkiTekstit = (x) => JSON.stringify(x);
const testiEhd = (l) => l.filter((e) => e.lahde.tyyppi === 'testi');

describe('tmJoukkuejaksoOsaAlueet (D17)', () => {
  const OK = () => ({ tekninen_taktinen: { teema_avain: 'syotto', nimi: 'Syöttötaito ja -peli', lahde: 'kalenteri' }, fyysinen: { alue: 'Ketteryys ja nopeus', ohjelma_id: 'o1', lahde: 'seura' },
    henkinen: { kuvaus: 'Seuraava suoritus virheen jälkeen' }, sosiaalinen: { kuvaus: 'Kannustetaan ääneen joka harjoituksessa' } });
  it('kaikki neljä aluetta kelpaa; henkinen ja sosiaalinen valinnaisia (null/puuttuu)', () => {
    expect(TT.tmJoukkuejaksoOsaAlueet(OK())).toEqual({ tekninen_taktinen: { teema_avain: 'syotto', nimi: 'Syöttötaito ja -peli', lahde: 'kalenteri' }, fyysinen: { alue: 'Ketteryys ja nopeus', lahde: 'seura', ohjelma_id: 'o1' },
      henkinen: { kuvaus: 'Seuraava suoritus virheen jälkeen' }, sosiaalinen: { kuvaus: 'Kannustetaan ääneen joka harjoituksessa' } });
    const v = OK(); delete v.henkinen; v.sosiaalinen = null;
    expect(TT.tmJoukkuejaksoOsaAlueet(v)).toMatchObject({ henkinen: null, sosiaalinen: null });
    const t = OK(); delete t.fyysinen.ohjelma_id; expect(TT.tmJoukkuejaksoOsaAlueet(t).fyysinen.ohjelma_id).toBeUndefined();
  });
  it('tekn.-takt. ja fyysinen PAKOLLISIA', () => {
    const a = OK(); delete a.tekninen_taktinen; expect(() => TT.tmJoukkuejaksoOsaAlueet(a)).toThrow(/tekninen_taktinen puuttuu/);
    const b = OK(); delete b.fyysinen; expect(() => TT.tmJoukkuejaksoOsaAlueet(b)).toThrow(/fyysinen puuttuu/);
    const c = OK(); c.fyysinen.alue = ''; expect(() => TT.tmJoukkuejaksoOsaAlueet(c)).toThrow(/fyysinen.alue puuttuu/);
    const d = OK(); d.tekninen_taktinen.teema_avain = null; expect(() => TT.tmJoukkuejaksoOsaAlueet(d)).toThrow(/teema_avain puuttuu/);
  });
  it('≤ 120 merkkiä: 120 kelpaa, 121 hylätään (henkinen, sosiaalinen, fyysinen, nimi)', () => {
    const ok = OK(); ok.henkinen.kuvaus = 'a'.repeat(120); expect(TT.tmJoukkuejaksoOsaAlueet(ok).henkinen.kuvaus.length).toBe(120);
    ['henkinen', 'sosiaalinen'].forEach((k) => { const v = OK(); v[k].kuvaus = 'a'.repeat(121); expect(() => TT.tmJoukkuejaksoOsaAlueet(v), k).toThrow(/liian pitkä/); });
    const f = OK(); f.fyysinen.alue = 'a'.repeat(121); expect(() => TT.tmJoukkuejaksoOsaAlueet(f)).toThrow(/liian pitkä/);
    const n = OK(); n.tekninen_taktinen.nimi = 'a'.repeat(121); expect(() => TT.tmJoukkuejaksoOsaAlueet(n)).toThrow(/liian pitkä/);
  });
  it('KIELLETYT-sanat hylätään henkisessä/sosiaalisessa lauseessa (ja muissa teksteissä)', () => {
    ['heikkous', 'rajoite', 'kriittinen', 'Heikkoutena', 'rajoittaa'].forEach((s) => {
      ['henkinen', 'sosiaalinen'].forEach((k) => { const v = OK(); v[k].kuvaus = 'Tämä on ' + s; expect(() => TT.tmJoukkuejaksoOsaAlueet(v), k + ':' + s).toThrow(/kielletyn sanan/); });
    });
    const f = OK(); f.fyysinen.alue = 'Heikkoudet pois'; expect(() => TT.tmJoukkuejaksoOsaAlueet(f)).toThrow(/kielletyn sanan/);
  });
  it('tyhjä lause = ei aluetta; ei-objekti hylätään', () => {
    const v = OK(); v.henkinen = { kuvaus: '  ' }; expect(TT.tmJoukkuejaksoOsaAlueet(v).henkinen).toBeNull();
    const w = OK(); w.henkinen = 'teksti'; expect(() => TT.tmJoukkuejaksoOsaAlueet(w)).toThrow(/henkinen pitää olla/);
  });
});

describe('J2 · tmJoukkuejaksoOsaAlueet: uusi muoto (avain/nimi/lahde) + vanha muoto luetaan edelleen', () => {
  const UUSI = (fy, tt) => ({ tekninen_taktinen: Object.assign({ teema_avain: 'teema_45_1', nimi: 'Syöttötaito ja -peli', lahde: 'seura' }, tt || {}), fyysinen: Object.assign({ avain: 'fy_ketteryys', nimi: 'Ketteryys & suunnanmuutos', lahde: 'tm' }, fy || {}) });
  it('uusi muoto: seuran ohjelma (ohjelma_id), TM-teema (fy_* avain), Oma (ei avainta); tekn. Oma ilman avainta', () => {
    expect(TT.tmJoukkuejaksoOsaAlueet(UUSI()).fyysinen).toEqual({ avain: 'fy_ketteryys', nimi: 'Ketteryys & suunnanmuutos', lahde: 'tm' });
    expect(TT.tmJoukkuejaksoOsaAlueet(UUSI({ avain: 'fy_rajahtavyys', nimi: 'Räjähtävä voima', ohjelma_id: 'ohjelmat_105_1', lahde: 'seura' })).fyysinen).toEqual({ avain: 'fy_rajahtavyys', nimi: 'Räjähtävä voima', lahde: 'seura', ohjelma_id: 'ohjelmat_105_1' });
    expect(TT.tmJoukkuejaksoOsaAlueet(UUSI({ avain: null, nimi: 'Lankku', ohjelma_id: 'keskivartalo_94_1', lahde: 'seura' })).fyysinen.avain).toBeNull();   // ohjelma ilman teema_avainta (tuonnin ohjelmat)
    expect(TT.tmJoukkuejaksoOsaAlueet(UUSI({ avain: null, nimi: 'Oma kuntopiiri', lahde: 'oma' })).fyysinen).toEqual({ avain: null, nimi: 'Oma kuntopiiri', lahde: 'oma' });
    expect(TT.tmJoukkuejaksoOsaAlueet(UUSI(null, { teema_avain: null, nimi: 'Oma teema', lahde: 'oma' })).tekninen_taktinen).toEqual({ teema_avain: null, nimi: 'Oma teema', lahde: 'oma' });
  });
  it('fysiikan avain validoidaan TM_FYYSTEEMAT-listaa vasten: tuntematon hylätään; tm vaatii avaimen; oma ei saa sisältää avainta/ohjelmaa; seura vaatii ohjelma_id:n', () => {
    expect(() => TT.tmJoukkuejaksoOsaAlueet(UUSI({ avain: 'fy_ei_ole' }))).toThrow(/tunnettu fyysinen teema/);
    expect(() => TT.tmJoukkuejaksoOsaAlueet(UUSI({ avain: 'speed' }))).toThrow(/tunnettu fyysinen teema/);   // vahdin avain ei ole TM_FYYSTEEMAT-avain
    expect(() => TT.tmJoukkuejaksoOsaAlueet(UUSI({ avain: null }))).toThrow(/fyysinen.avain puuttuu/);
    expect(() => TT.tmJoukkuejaksoOsaAlueet(UUSI({ avain: 'fy_nopeus', lahde: 'oma' }))).toThrow(/oma \(vapaa teksti\)/);
    expect(() => TT.tmJoukkuejaksoOsaAlueet(UUSI({ avain: null, lahde: 'oma', ohjelma_id: 'x' }))).toThrow(/oma/);
    expect(() => TT.tmJoukkuejaksoOsaAlueet(UUSI({ avain: null, lahde: 'seura' }))).toThrow(/ohjelma_id puuttuu/);
    expect(() => TT.tmJoukkuejaksoOsaAlueet(UUSI({ lahde: 'kalenteri' }))).toThrow(/lahde pitää olla/);
    expect(() => TT.tmJoukkuejaksoOsaAlueet(UUSI({ nimi: '' }))).toThrow(/fyysinen.nimi puuttuu/);
    expect(() => TT.tmJoukkuejaksoOsaAlueet(UUSI({ nimi: 'Heikkoudet kuntoon' }))).toThrow(/kielletyn sanan/);
    expect(() => TT.tmJoukkuejaksoOsaAlueet(UUSI(null, { lahde: 'oma', teema_avain: 'x' }))).toThrow(/teema_avain pitää olla null/);
    expect(() => TT.tmJoukkuejaksoOsaAlueet(UUSI(null, { lahde: 'seura', teema_avain: null }))).toThrow(/teema_avain puuttuu/);
  });
  it('vanha muoto {alue, lahde} luetaan edelleen (vanha sisään → vanha ulos) ja tmFyysinenOsaAlue lukee kumpaakin', () => {
    const v = { tekninen_taktinen: { teema_avain: 'syotto', nimi: 'Syöttö', lahde: 'kalenteri' }, fyysinen: { alue: 'Ketteryys ja nopeus', ohjelma_id: 'o1', lahde: 'seura' } };
    expect(TT.tmJoukkuejaksoOsaAlueet(v).fyysinen).toEqual({ alue: 'Ketteryys ja nopeus', lahde: 'seura', ohjelma_id: 'o1' });
    expect(TT.tmFyysinenOsaAlue(v)).toEqual({ avain: null, nimi: 'Ketteryys ja nopeus', ohjelma_id: 'o1', lahde: 'seura' });
    expect(TT.tmFyysinenOsaAlue(UUSI())).toEqual({ avain: 'fy_ketteryys', nimi: 'Ketteryys & suunnanmuutos', ohjelma_id: null, lahde: 'tm' });
    expect(TT.tmFyysinenOsaAlue(null)).toBeNull(); expect(TT.tmFyysinenOsaAlue({ fyysinen: {} })).toBeNull();
  });
});

describe('J2 · kypsyysvahti joukkuejakson oletusehdotukseen (fy_* → tm_idp.IDP_FY_TEEMA_AVAIN → IDP_KYPSYYS_GATED)', () => {
  const JJ = (fy) => ({ jid: 'kpv_u13', alku: '2026-10-13', osa_alueet: { tekninen_taktinen: { teema_avain: 't', nimi: 'Syöttö', lahde: 'seura' }, fyysinen: fy } });
  const FYS = (avain, nimi) => ({ avain: avain, nimi: nimi, lahde: 'tm' });
  const jjEhd = (p, fy) => TT.tmTukitavoiteEhdotukset(p, K({ joukkuejakso: JJ(fy) })).filter((e) => e.lahde.tyyppi === 'joukkuejakso')[0];
  const KOLME = [['fy_nopeus', 'Nopeus'], ['fy_kestavyys', 'Kestävyys'], ['fy_rajahtavyys', 'Räjähtävyys']];
  it('PRE/LAH/PH/tuntematon: joukkueen fy_nopeus/kestävyys/räjähtävyys → liikehallinta (lahde säilyy joukkuejakso, kypsyyssuojattu)', () => {
    KOLME.forEach(([avain, nimi]) => ['PRE', 'LAH', 'PH', null].forEach((phv) => {
      const e = jjEhd({ id: 'x', ...PHV(phv) }, FYS(avain, nimi));
      expect(e, avain + '/' + phv).toMatchObject({ alue: 'fyysinen', kuvaus: 'Liikehallinta ja kehonhallinta', kypsyyssuojattu: true, lahde: { tyyppi: 'joukkuejakso', viite: 'kpv_u13' } }); expect(e.miksi).toMatch(/Kypsyysvahti/);
    }));
  });
  it('POST/AN: ei korvausta (nopeus/kestävyys/räjähtävyys sellaisenaan); fy_ketteryys ja fy_liikehallinta eivät ole kypsyysrajattuja missään tilassa', () => {
    KOLME.forEach(([avain, nimi]) => ['POST', 'AN'].forEach((phv) => expect(jjEhd({ id: 'x', ...PHV(phv) }, FYS(avain, nimi))).toMatchObject({ kuvaus: nimi }) ));
    [['fy_ketteryys', 'Ketteryys & suunnanmuutos'], ['fy_liikehallinta', 'Liikehallinta (kehon valmius)']].forEach(([avain, nimi]) => ['PRE', 'LAH', 'PH', null, 'POST'].forEach((phv) => {
      const e = jjEhd({ id: 'x', ...PHV(phv) }, FYS(avain, nimi)); expect(e.kuvaus, avain + '/' + phv).toBe(nimi); expect(e.kypsyyssuojattu).toBeUndefined();
    }));
  });
  it('seuran ohjelma rakenteisella avaimella suojataan samoin; ohjelma ilman avainta ja Oma (vapaa teksti) eivät (ei jäsennetä)', () => {
    expect(jjEhd({ id: 'x', ...PHV('LAH') }, { avain: 'fy_rajahtavyys', nimi: 'Räjähtävä voima', ohjelma_id: 'o1', lahde: 'seura' })).toMatchObject({ kuvaus: 'Liikehallinta ja kehonhallinta', kypsyyssuojattu: true });
    expect(jjEhd({ id: 'x', ...PHV('LAH') }, { avain: null, nimi: 'Räjähtävä voima', ohjelma_id: 'o1', lahde: 'seura' }).kuvaus).toBe('Räjähtävä voima');
    expect(jjEhd({ id: 'x', ...PHV('LAH') }, { avain: null, nimi: 'Nopeutta kaikille', lahde: 'oma' }).kuvaus).toBe('Nopeutta kaikille');
  });
  it('vanha muoto: raaka vahdin avain (alue "power") suojataan edelleen; vapaa teksti ("Ketteryys ja nopeus") ei', () => {
    expect(jjEhd({ id: 'x', ...PHV('PH') }, { alue: 'power', lahde: 'seura' })).toMatchObject({ kypsyyssuojattu: true });
    expect(jjEhd({ id: 'x', ...PHV('PH') }, { alue: 'Ketteryys ja nopeus', lahde: 'seura' }).kuvaus).toBe('Ketteryys ja nopeus');
  });
  it('joukkuejakson osa_alueet voi tulla myös joukkueen jaksofokuksesta (jaksofokus.osa_alueet) uudessa muodossa', () => {
    const l = TT.tmTukitavoiteEhdotukset({ id: 'x', ...PHV('LAH') }, K({ joukkuejakso: { jid: 'kpv_u13', jaksofokus: { alku: '2026-10-13', osa_alueet: JJ(FYS('fy_nopeus', 'Nopeus')).osa_alueet } } }));
    expect(l).toHaveLength(1); expect(l[0]).toMatchObject({ kypsyyssuojattu: true });
  });
});

describe('tmTukitavoite (D20)', () => {
  const OK = () => ({ alue: 'tekninen_taktinen', kuvaus: 'Pallon suojaaminen paineessa', perustelu: 'Jotta kuljetuksesi vie maalille asti, pallo pysyy sinulla paineessa',
    lahde: { tyyppi: 'havainto', viite: 'adar:Act', pvm: '2026-10-03' }, harjoitteet: [{ id: 'h1', nimi: 'Suojaa ja käänny 1v1', lahde: 'seura' }] });
  it('kelvollinen tukitavoite säilyttää kentät; harjoitteen kenttä on lahde seura|tm (#823), ei sisalto', () => {
    const t = TT.tmTukitavoite(OK());
    expect(t).toMatchObject({ alue: 'tekninen_taktinen', kuvaus: 'Pallon suojaaminen paineessa', lahde: { tyyppi: 'havainto', viite: 'adar:Act', pvm: '2026-10-03' } });
    expect(t.harjoitteet).toEqual([{ id: 'h1', nimi: 'Suojaa ja käänny 1v1', lahde: 'seura' }]);
    expect(Object.keys(t.harjoitteet[0])).not.toContain('sisalto');
    const v = OK(); v.harjoitteet[0].lahde = 'sisalto'; expect(() => TT.tmTukitavoite(v)).toThrow(/lahde pitää olla/);
    const w = OK(); w.harjoitteet[0].tila = 'luonnos'; expect(() => TT.tmTukitavoite(w)).toThrow(/luonnos/);
  });
  it('alue: täsmälleen neljä sallittua', () => {
    ['fyysinen', 'tekninen_taktinen', 'henkinen', 'sosiaalinen'].forEach((a) => expect(TT.tmTukitavoite(Object.assign(OK(), { alue: a })).alue).toBe(a));
    ['taktinen', 'D1', null, ''].forEach((a) => expect(() => TT.tmTukitavoite(Object.assign(OK(), { alue: a })), String(a)).toThrow(/alue pitää olla/));
  });
  it('kuvaus ≤ 80, perustelu pakollinen ≤ 400', () => {
    expect(TT.tmTukitavoite(Object.assign(OK(), { kuvaus: 'a'.repeat(80) })).kuvaus.length).toBe(80);
    expect(() => TT.tmTukitavoite(Object.assign(OK(), { kuvaus: 'a'.repeat(81) }))).toThrow(/liian pitkä/);
    expect(() => TT.tmTukitavoite(Object.assign(OK(), { perustelu: '' }))).toThrow(/perustelu puuttuu/);
    expect(() => TT.tmTukitavoite(Object.assign(OK(), { perustelu: null }))).toThrow(/perustelu puuttuu/);
    expect(TT.tmTukitavoite(Object.assign(OK(), { perustelu: 'a'.repeat(400) })).perustelu.length).toBe(400);
    expect(() => TT.tmTukitavoite(Object.assign(OK(), { perustelu: 'a'.repeat(401) }))).toThrow(/liian pitkä/);
  });
  it('KIELLETYT-sanat hylätään perustelussa ja kuvauksessa (aina myönteinen)', () => {
    ['heikkous', 'rajoite', 'kriittinen'].forEach((s) => {
      expect(() => TT.tmTukitavoite(Object.assign(OK(), { perustelu: 'Pelaajan ' + s + ' paineessa' })), s).toThrow(/kielletyn sanan/);
      expect(() => TT.tmTukitavoite(Object.assign(OK(), { kuvaus: s })), s).toThrow(/kielletyn sanan/);
    });
  });
  it('lähde: kuusi tyyppiä; viite ≤ 120 (valinnainen); pvm YYYY-MM-DD ja kelvollinen kalenteripäivä', () => {
    ['joukkuejakso', 'testi', 'havainto', 'arviointi', 'pelaajan_arvio', 'suunnitelma'].forEach((t) => expect(TT.tmTukitavoite(Object.assign(OK(), { lahde: { tyyppi: t, pvm: '2026-10-03' } })).lahde.tyyppi).toBe(t));
    expect(TT.tmTukitavoite(Object.assign(OK(), { lahde: { tyyppi: 'testi', pvm: '2026-10-03' } })).lahde.viite).toBeNull();
    expect(() => TT.tmTukitavoite(Object.assign(OK(), { lahde: { tyyppi: 'muu', pvm: '2026-10-03' } }))).toThrow(/lahde.tyyppi/);
    expect(() => TT.tmTukitavoite(Object.assign(OK(), { lahde: null }))).toThrow(/lahde.tyyppi/);
    expect(() => TT.tmTukitavoite(Object.assign(OK(), { lahde: { tyyppi: 'testi', viite: 'a'.repeat(121), pvm: '2026-10-03' } }))).toThrow(/liian pitkä/);
    ['03.10.2026', '2026-13-01', '2026-02-30', null].forEach((d) => expect(() => TT.tmTukitavoite(Object.assign(OK(), { lahde: { tyyppi: 'testi', pvm: d } })), String(d)).toThrow(/pvm/));
    expect(TT.tmTukitavoite(Object.assign(OK(), { lahde: { tyyppi: 'testi', pvm: '2028-02-29' } })).lahde.pvm).toBe('2028-02-29');
  });
  it('ei "ase"-kenttänimiä eikä kiellettyjä avaimia tuloksessa (GDPR-vartija)', () => {
    expect(JM.tmTarkistaJaksoData(TT.tmTukitavoite(OK()))).toEqual([]);
  });
});

describe('tmTukitavoitteet (lukija) ja tmTukitavoitteetKirjoitus', () => {
  it('uusi muoto: palauttaa jf.tukitavoitteet; tyhjä lista on auktoritatiivinen (ei vanhaa tukiosaa)', () => {
    const jf = { tukitavoitteet: [{ alue: 'henkinen', kuvaus: 'k', perustelu: 'p', lahde: { tyyppi: 'testi', pvm: '2026-10-01' }, harjoitteet: [] }], tukiosa: { alue: 'vanha', perustelu: 'v', harjoitteet: [] } };
    expect(TT.tmTukitavoitteet(jf)).toHaveLength(1); expect(TT.tmTukitavoitteet(jf)[0].alue).toBe('henkinen');
    expect(TT.tmTukitavoitteet({ tukitavoitteet: [], tukiosa: { alue: 'vanha', perustelu: 'v' } })).toEqual([]);
  });
  it('vanha tukiosa luetaan oikein: [{alue:null, kuvaus:tukiosa.alue, perustelu, lahde:suunnitelma, harjoitteet}]', () => {
    const h = [{ id: 'o1#1', nimi: 'Narulla hyppely', lahde: 'seura' }];
    expect(TT.tmTukitavoitteet({ tukiosa: { alue: 'kestävyys', perustelu: 'Jaksaa pelata koko ottelun', harjoitteet: h } })).toEqual([{ alue: null, kuvaus: 'kestävyys', perustelu: 'Jaksaa pelata koko ottelun', lahde: { tyyppi: 'suunnitelma' }, harjoitteet: h }]);
  });
  it('ei heitä vanhalle/rikkinäiselle datalle', () => {
    [null, undefined, {}, { tukiosa: null }, { tukiosa: {} }, { tukiosa: 'x' }, { tukitavoitteet: 'x' }, { tukitavoitteet: [null, 1, 'a'] }, 'merkkijono', 5].forEach((jf) => {
      expect(() => TT.tmTukitavoitteet(jf), JSON.stringify(jf)).not.toThrow(); expect(Array.isArray(TT.tmTukitavoitteet(jf))).toBe(true);
    });
    expect(TT.tmTukitavoitteet({ tukitavoitteet: [null, { kuvaus: 'k' }] })).toEqual([{ alue: null, kuvaus: 'k', perustelu: null, lahde: { tyyppi: 'suunnitelma' }, harjoitteet: [] }]);
  });
  const T1 = (o) => Object.assign({ alue: 'tekninen_taktinen', kuvaus: 'Pallon suojaaminen paineessa', perustelu: 'Jotta kuljetuksesi vie maalille asti', lahde: { tyyppi: 'havainto', viite: 'x', pvm: '2026-10-03' }, harjoitteet: [{ id: 'h1', nimi: 'Suojaa ja käänny', lahde: 'seura' }] }, o || {});
  it('kirjoitus: tukitavoitteet + yhteensopiva tukiosa (= ensimmäinen: alue ← kuvaus, perustelu, harjoitteet); tukiosa läpäisee tmTukiosa', () => {
    const k = TT.tmTukitavoitteetKirjoitus([T1(), T1({ alue: 'henkinen', kuvaus: 'Toinen' })]);
    expect(k.tukitavoitteet).toHaveLength(2);
    expect(k.tukiosa).toEqual({ alue: 'Pallon suojaaminen paineessa', perustelu: 'Jotta kuljetuksesi vie maalille asti', harjoitteet: [{ id: 'h1', nimi: 'Suojaa ja käänny', lahde: 'seura' }] });
    expect(JM.tmTukiosa(k.tukiosa)).toEqual(k.tukiosa);
    // kiertotesti: kirjoitettu → luettu
    expect(TT.tmTukitavoitteet({ tukitavoitteet: k.tukitavoitteet, tukiosa: k.tukiosa }).map((t) => t.kuvaus)).toEqual(['Pallon suojaaminen paineessa', 'Toinen']);
    expect(TT.tmTukitavoitteet({ tukiosa: k.tukiosa })[0].kuvaus).toBe('Pallon suojaaminen paineessa');   // vanha lukija (K1/Pelaaja_v7) saa saman
  });
  it('tyhjä lista → tukitavoitteet [] ja tukiosa null; yli 2 hylätään (D18-katto); virheellinen alkio heittää', () => {
    expect(TT.tmTukitavoitteetKirjoitus([])).toEqual({ tukitavoitteet: [], tukiosa: null }); expect(TT.tmTukitavoitteetKirjoitus(null)).toEqual({ tukitavoitteet: [], tukiosa: null });
    expect(() => TT.tmTukitavoitteetKirjoitus([T1(), T1(), T1()])).toThrow(/enintään 2/);
    expect(() => TT.tmTukitavoitteetKirjoitus([T1({ perustelu: 'heikkous' })])).toThrow(/kielletyn sanan/);
  });
});

describe('tmTukitavoiteMaksimi (D18)', () => {
  it('Leikkijä 0 · Rakentaja 1 · Showcase 2 (nimellä ja iällä)', () => {
    expect(['leikkija', 'Leikkijä', 'kevyt'].map((v) => TT.tmTukitavoiteMaksimi(v))).toEqual([0, 0, 0]);
    expect(['rakentaja', 'Rakentaja', 'perus'].map((v) => TT.tmTukitavoiteMaksimi(v))).toEqual([1, 1, 1]);
    expect(['showcase', 'Showcase', 'tiivis'].map((v) => TT.tmTukitavoiteMaksimi(v))).toEqual([2, 2, 2]);
    expect([8, 12].map((v) => TT.tmTukitavoiteMaksimi(v))).toEqual([0, 0]); expect([13, 15].map((v) => TT.tmTukitavoiteMaksimi(v))).toEqual([1, 1]); expect([16, 19].map((v) => TT.tmTukitavoiteMaksimi(v))).toEqual([2, 2]);
    expect(TT.tmTukitavoiteMaksimi(null)).toBe(1); expect(TT.tmTukitavoiteMaksimi('outo')).toBe(1);   // tuntematon → Rakentaja (kuten tmJaksonKesto)
  });
  it('seuran prosessiprofiili ylikirjoittaa (0–2); virheellinen arvo ohitetaan; prosessiprofiili-kääre sallittu', () => {
    expect(TT.tmTukitavoiteMaksimi('rakentaja', { rakentaja: { tukitavoitteet_max: 2 } })).toBe(2);
    expect(TT.tmTukitavoiteMaksimi('showcase', { showcase: { tukitavoitteet_max: 0 } })).toBe(0);
    expect(TT.tmTukitavoiteMaksimi('rakentaja', { prosessiprofiili: { rakentaja: { tukitavoitteet_max: 2 } } })).toBe(2);
    [3, -1, 1.5, '2', null].forEach((v) => expect(TT.tmTukitavoiteMaksimi('rakentaja', { rakentaja: { tukitavoitteet_max: v } }), String(v)).toBe(1));
    expect(TT.tmTukitavoiteMaksimi('leikkija', { rakentaja: { tukitavoitteet_max: 2 } })).toBe(0);   // toisen ikävaiheen asetus ei vaikuta
  });
});

describe('tmTukitavoiteEhdotukset — kypsyysvahti (§28, CLAUDE.md §14)', () => {
  it('Topias (PHV LAH, heikko 30 m ja kiihdytys): testistä johdettu D1-ehdotus ei ole speed/acceleration/power/endurance — korvataan liikehallinnalla (Tero 7.10.2026)', () => {
    const l = TT.tmTukitavoiteEhdotukset(TOPIAS('LAH'), K());
    const t = testiEhd(l);
    expect(t.map((e) => e.asia)).toEqual(['liikehallinta']);
    expect(t[0]).toMatchObject({ alue: 'fyysinen', kuvaus: 'Liikehallinta ja kehonhallinta', kypsyyssuojattu: true, lyhyt: 'testistä, kasvu huomioiden' }); expect(t[0].miksi).toMatch(/kasvupyrähdys lähestyy/);
    expect(l.some((e) => ['speed', 'acceleration', 'power', 'endurance'].indexOf(e.asia) >= 0 || /nopeus|kiihdytys|voima|kestävyys/i.test(e.kuvaus))).toBe(false);
    expect(l.filter((e) => e.kypsyyssuojattu)).toHaveLength(1); expect(l[0].asia).toBe('liikehallinta');   // rivi 0: ensimmäisenä
  });
  it('PRE: sama kuin LAH (korvaus liikehallinnalla, perustelu "ennen kasvupyrähdystä")', () => {
    const l = TT.tmTukitavoiteEhdotukset(TOPIAS('PRE'), K()); expect(testiEhd(l).map((e) => e.asia)).toEqual(['liikehallinta']); expect(l[0].miksi).toMatch(/ennen kasvupyrähdystä/);
  });
  it('PHV "tuntematon" (ei mittausta) käsitellään kuten PRE/LAH: korvaus liikehallinnalla, ei nopeutta eikä kiihdytystä', () => {
    const l = TT.tmTukitavoiteEhdotukset(TOPIAS(null), K());
    expect(testiEhd(l).map((e) => e.asia)).toEqual(['liikehallinta']); expect(l.some((e) => e.asia === 'speed' || e.asia === 'acceleration')).toBe(false);
  });
  it('POST/AN: kiihdytys ja nopeus sallittuja; mobility (ketteryys) ei ole kypsyysrajattu missään tilassa', () => {
    expect(TT.tmTukitavoiteEhdotukset(TOPIAS('POST', { hh_viimeisin: { lin10m: 1.95 } }), K())[0]).toMatchObject({ asia: 'acceleration', kuvaus: 'Kiihdytys' });
    ['LAH', null, 'PH'].forEach((phv) => expect(testiEhd(TT.tmTukitavoiteEhdotukset(TOPIAS(phv, { hh_viimeisin: { kasirata: 99 } }), K())).map((e) => e.asia), String(phv)).toEqual(['mobility']));
  });
  it('POST/AN: nopeus sallittu (heikoin ensin → 30 m)', () => {
    ['POST', 'AN'].forEach((k) => { const l = TT.tmTukitavoiteEhdotukset(TOPIAS(k), K()); expect(testiEhd(l)[0]).toMatchObject({ alue: 'fyysinen', asia: 'speed', kuvaus: 'Nopeus' }); expect(l.some((e) => e.kypsyyssuojattu)).toBe(false); });
  });
  it('PH (kasvupyrähdys): ei räjähtävyyttä/nopeutta — kuormaa lisäävä korvataan liikehallinnalla, ja se on listan ENSIMMÄINEN (rivi 0)', () => {
    const l = TT.tmTukitavoiteEhdotukset(TOPIAS('PH'), K());
    expect(l[0]).toMatchObject({ alue: 'fyysinen', kuvaus: 'Liikehallinta ja kehonhallinta', kypsyyssuojattu: true, asia: 'liikehallinta' });
    expect(l[0].lahde.tyyppi).toBe('testi'); expect(l[0].miksi).toMatch(/kasvupyrähdys/);
    expect(l.filter((e) => e.asia === 'speed')).toHaveLength(0);
    expect(l.filter((e) => e.kypsyyssuojattu)).toHaveLength(1);
  });
  it('tuntematon + estetty testi: korvataan liikehallinnalla (rivi 0: PH tai tuntematon)', () => {
    const l = TT.tmTukitavoiteEhdotukset(TOPIAS(null), K()); expect(l[0]).toMatchObject({ kypsyyssuojattu: true, kuvaus: 'Liikehallinta ja kehonhallinta' }); expect(l[0].miksi).toMatch(/kypsyyttä ei ole mitattu/);
  });
  it('kypsyysvahti on YKSI sääntö: tm_idp.idpKypsyysEstetty (muutos siellä muuttaa tätä); tm_idp-testit pysyvät vihreinä', () => {
    const src = readFileSync(join(dirname(fileURLToPath(import.meta.url)), '..', 'lib', 'tm_tukitavoitteet.js'), 'utf8');
    expect(src).toContain('idpKypsyysEstetty'); expect(src).not.toMatch(/\{\s*speed:\s*1/); expect(src).not.toMatch(/'speed'\s*,\s*'endurance'/);   // ei omaa avainlistaa
    ['speed', 'acceleration', 'endurance', 'power'].forEach((a) => expect(IDP.idpKypsyysEstetty(a, 'LAH'), a).toBe(true)); expect(IDP.idpKypsyysEstetty('mobility', 'LAH')).toBe(false);
  });
  it('tm_idp.idpKeraaKandidaatit käyttäytyy ennallaan (D1: yksi heikoin kandidaatti) ja idpD1Osakandidaatit on heikoin ensin', () => {
    const opts = { laskeD1Osaindeksit: EEK.laskeD1Osaindeksit, ika: 13, sp: 'P', tmTaksonomiaByAvain: TAKS.tmTaksonomiaByAvain };
    const p = TOPIAS('POST'); const k = IDP.idpKeraaKandidaatit(p, opts).filter((c) => c.tyyppi === 'mitattu_d1'); const kaikki = IDP.idpD1Osakandidaatit(p, opts);
    expect(k).toHaveLength(1); expect(k[0].avain).toBe('speed'); expect(kaikki.map((c) => c.avain)).toEqual(['speed', 'acceleration']); expect(kaikki[0]).toEqual(k[0]);
  });
});

describe('tmTukitavoiteEhdotukset — lähteet ja järjestys (D19)', () => {
  const JJ = { jid: 'u13-2', alku: '2026-10-13', osa_alueet: { tekninen_taktinen: { teema_avain: 'syotto', nimi: 'Syöttö', lahde: 'kalenteri' }, fyysinen: { alue: 'Ketteryys ja nopeus', lahde: 'seura' }, henkinen: { kuvaus: 'Seuraava suoritus virheen jälkeen' }, sosiaalinen: null } };
  const HAV = [ADAR('2026-09-20', { A: 3, D: 2, Act: 1, R: 3 }), ADAR('2026-10-03', { A: 3, D: 3, Act: 1, R: 2 })];
  const ARV = { arviointi_havaittu: { ball_protection: 2, short_passing: 4 }, arviointi_pvm: '2026-09-25' };
  const ITSE = { d3_viimeisin: { pvm: '2026-10-02', pisteet: { resilience: { pelaaja: 2, valmentaja: 4 }, focus: { pelaaja: 4 } } } };
  const KAIKKI = () => ({ p: TOPIAS('POST', Object.assign({}, ARV, ITSE)), k: K({ havainnot: HAV, joukkuejakso: JJ }) });

  it('järjestys: testi → havainto → arviointi → pelaajan arvio, joukkuejakso VIIMEISENÄ; enintään 4; joukkuejakso aina mukana', () => {
    const { p, k } = KAIKKI(); const l = TT.tmTukitavoiteEhdotukset(p, k);
    expect(l.length).toBeLessThanOrEqual(4); expect(l.map((e) => e.lahde.tyyppi)).toEqual(['testi', 'havainto', 'arviointi', 'joukkuejakso']);
    expect(l[3]).toMatchObject({ alue: 'fyysinen', kuvaus: 'Ketteryys ja nopeus', lyhyt: 'joukkuejaksosta', lahde: { tyyppi: 'joukkuejakso', viite: 'u13-2', pvm: '2026-10-13' } });
    // pelaajan arvio (2b) jää pois kun tila loppuu — ei joukkuejakson tilalle
    expect(l.some((e) => e.lahde.tyyppi === 'pelaajan_arvio')).toBe(false);
  });
  it('ilman joukkuejaksoa mahtuu neljäs lähde (pelaajan arvio) mukaan; ilman dataa tyhjä lista (moottori ei keksi mitään)', () => {
    const { p, k } = KAIKKI(); delete k.joukkuejakso; const l = TT.tmTukitavoiteEhdotukset(p, k);
    expect(l.map((e) => e.lahde.tyyppi)).toEqual(['testi', 'havainto', 'arviointi', 'pelaajan_arvio']); expect(l).toHaveLength(4);
    expect(TT.tmTukitavoiteEhdotukset({ id: 'x' }, K())).toEqual([]); expect(TT.tmTukitavoiteEhdotukset(null, null)).toEqual([]);
  });
  it('joukkuejakso on oletus: ainoana lähteenä palautuu yksi ehdotus; fyysinen ensin, sitten henkinen, sitten sosiaalinen', () => {
    const l = TT.tmTukitavoiteEhdotukset({ id: 'x' }, K({ joukkuejakso: JJ })); expect(l).toHaveLength(1); expect(l[0].alue).toBe('fyysinen');
    const jj2 = JSON.parse(JSON.stringify(JJ)); delete jj2.osa_alueet.fyysinen; expect(TT.tmTukitavoiteEhdotukset({}, K({ joukkuejakso: jj2 }))[0]).toMatchObject({ alue: 'henkinen', kuvaus: 'Seuraava suoritus virheen jälkeen' });
    jj2.osa_alueet.henkinen = null; jj2.osa_alueet.sosiaalinen = { kuvaus: 'Kannustetaan ääneen' }; expect(TT.tmTukitavoiteEhdotukset({}, K({ joukkuejakso: jj2 }))[0].alue).toBe('sosiaalinen');
    jj2.osa_alueet.sosiaalinen = null; expect(TT.tmTukitavoiteEhdotukset({}, K({ joukkuejakso: jj2 }))).toEqual([]);   // pelkkä tekn.-takt. = ydinvahvuuden teema, ei tukitavoite
  });
  it('joukkuejakson fyysinen avain + PH/tuntematon → liikehallinta; vapaata tekstiä ei jäsennetä; POST ennallaan', () => {
    const jj = { jid: 'a', alku: '2026-10-13', osa_alueet: { fyysinen: { alue: 'power', lahde: 'seura' } } };
    expect(TT.tmTukitavoiteEhdotukset(TOPIAS('PH'), K({ joukkuejakso: jj })).filter((e) => e.lahde.tyyppi === 'joukkuejakso')[0]).toMatchObject({ kuvaus: 'Liikehallinta ja kehonhallinta', kypsyyssuojattu: true });
    expect(TT.tmTukitavoiteEhdotukset({ id: 'x' }, K({ joukkuejakso: jj }))[0].kuvaus).toBe('Liikehallinta ja kehonhallinta');   // tuntematon
    expect(TT.tmTukitavoiteEhdotukset({ id: 'x', biologinenIka_viimeisin: { phv_tila_koodi: 'POST' } }, K({ joukkuejakso: jj }))[0].kuvaus).toBe('power');
    expect(TT.tmTukitavoiteEhdotukset(TOPIAS('PH'), K({ joukkuejakso: JJ })).filter((e) => e.lahde.tyyppi === 'joukkuejakso')[0].kuvaus).toBe('Ketteryys ja nopeus');
  });
  it('testi: vain tuore (≤ 6 kk) JA selvästi heikko; vanhentunut tai tasoltaan normaali ei ehdota', () => {
    const l = (hh, pvm) => TT.tmTukitavoiteEhdotukset(TOPIAS('POST', { hh_viimeisin: hh, hh_pvm: pvm }), K());
    expect(testiEhd(l({ lin30m: 5.8 }, '2026-04-08'))).toHaveLength(1);    // 182 pv
    expect(testiEhd(l({ lin30m: 5.8 }, '2026-04-07'))).toHaveLength(1);    // 183 pv = raja (mukana)
    expect(testiEhd(l({ lin30m: 5.8 }, '2026-04-06'))).toHaveLength(0);    // 184 pv
    expect(testiEhd(l({ lin30m: 4.2 }, '2026-09-20'))).toHaveLength(0);    // taso 5 — ei heikko
    expect(testiEhd(l({ lin30m: 4.8 }, '2026-09-20'))).toHaveLength(0);    // taso 3 — normaali, ei heikko
    expect(testiEhd(l({ lin30m: 4.9 }, '2026-09-20'))).toHaveLength(1);    // taso 2 — heikko
    expect(testiEhd(l({ lin30m: 5.8 }, null))).toHaveLength(0);            // päivämäärätön ei kelpaa
    expect(testiEhd(l({ lin30m: 5.8 }, '2026-10-20'))).toHaveLength(0);    // tulevaisuus
  });
  it('havainto: sama asia ≥ 2 rakenteisessa ADAR-havainnossa (pisteet = 1); 1 havainto ei riitä; vapaa teksti ei jäsenny', () => {
    const p = { id: 'x' };
    const yksi = TT.tmTukitavoiteEhdotukset(p, K({ havainnot: [ADAR('2026-10-03', { Act: 1 })] })); expect(yksi).toEqual([]);
    const kaksi = TT.tmTukitavoiteEhdotukset(p, K({ havainnot: HAV })); expect(kaksi).toHaveLength(1);
    expect(kaksi[0]).toMatchObject({ alue: 'tekninen_taktinen', kuvaus: 'Laadukas toteutus paineessa', lyhyt: 'havainnoista (2)', lahde: { tyyppi: 'havainto', viite: 'adar:Act', pvm: '2026-10-03' }, asia: 'adar:Act' });
    expect(kaksi[0].miksi).toContain('2026-09-20'); expect(kaksi[0].miksi).toContain('2026-10-03');
    const teksti = [{ tyyppi: 'adar_pikakortti', pvm: '2026-10-03', pisteet: {}, narratiivi: 'menettää pallon paineessa' }, { tyyppi: 'adar_pikakortti', pvm: '2026-10-02', pisteet: {}, narratiivi: 'menettää pallon paineessa' }, { tyyppi: 'kommentti', pvm: '2026-10-01', teksti: 'menettää pallon' }];
    expect(TT.tmTukitavoiteEhdotukset(p, K({ havainnot: teksti }))).toEqual([]);
    const muuTyyppi = HAV.map((h) => Object.assign({}, h, { tyyppi: 'kenttatarkkailu' })); expect(TT.tmTukitavoiteEhdotukset(p, K({ havainnot: muuTyyppi }))).toEqual([]);   // kenttätarkkailussa ei konsepti/osa-tageja
  });
  it('havainto: aikaikkuna (oletus 8 vk; havaintoAlkaa rajaa); pisteet 2–3 eivät ole kehitettävä; ikäportti (U12: vain A)', () => {
    const p = { id: 'x' }, h = (pvm, pt) => ADAR(pvm, pt);
    expect(TT.tmTukitavoiteEhdotukset(p, K({ havainnot: [h('2026-08-01', { Act: 1 }), h('2026-10-03', { Act: 1 })] }))).toEqual([]);   // vanha ulkona oletusikkunasta
    expect(TT.tmTukitavoiteEhdotukset(p, K({ havainnot: [h('2026-08-01', { Act: 1 }), h('2026-10-03', { Act: 1 })], havaintoAlkaa: '2026-07-01' }))).toHaveLength(1);
    expect(TT.tmTukitavoiteEhdotukset(p, K({ havainnot: [h('2026-10-01', { Act: 2 }), h('2026-10-03', { Act: 2 })] }))).toEqual([]);
    expect(TT.tmTukitavoiteEhdotukset(p, K({ havainnot: [h('2026-10-01', { Act: 3 }), h('2026-10-03', { Act: 3 })] }))).toEqual([]);
    const u12 = [h('2026-10-01', { Act: 1, A: 1 }), h('2026-10-03', { Act: 1, A: 1 })];
    expect(TT.tmTukitavoiteEhdotukset(p, K({ havainnot: u12, ika: 12, ikavaihe: null, seuraProfiili: { leikkija: { tukitavoitteet_max: 1 } } })).map((e) => e.asia)).toEqual(['adar:A']);   // U8–12: vain Assess
    expect(TT.tmTukitavoiteEhdotukset(p, K({ havainnot: u12, ika: 14 })).map((e) => e.asia)).toEqual(['adar:A', 'adar:Act']);   // U13–15: A+D+Act (ei R); sama lukumäärä → A ennen Act
    expect(TT.tmTukitavoiteEhdotukset(p, K({ havainnot: [h('2026-10-01', { R: 1 }), h('2026-10-03', { R: 1 })], ika: 14 }))).toEqual([]);   // R vasta U16+
    expect(TT.tmTukitavoiteEhdotukset(p, K({ havainnot: [h('2026-10-01', { R: 1 }), h('2026-10-03', { R: 1 })], ika: 17 })).map((e) => e.asia)).toEqual(['adar:R']);
  });
  it('arviointi: alin attribuutti ≤ 6 kk; D2-tasapeli ratkeaa tm_arviointi_silta-perustaidolla; vanha arviointi ei kelpaa', () => {
    const p = (hav, pvm) => TOPIAS('POST', { hh_viimeisin: {}, arviointi_havaittu: hav, arviointi_pvm: pvm });
    const l = TT.tmTukitavoiteEhdotukset(p({ ball_protection: 2, finishing: 1, short_passing: 1 }, '2026-09-25'), K());
    expect(l).toHaveLength(1); expect(l[0]).toMatchObject({ alue: 'tekninen_taktinen', asia: 'short_passing', lahde: { tyyppi: 'arviointi', viite: 'short_passing', pvm: '2026-09-25' }, lyhyt: 'arvioinnista' });   // short_passing ennen finishing (perustaito)
    expect(TT.tmTukitavoiteEhdotukset(p({ ball_protection: 1 }, '2026-03-01'), K())).toEqual([]);
    expect(TT.tmTukitavoiteEhdotukset(p({ ball_protection: 4 }, '2026-09-25'), K())).toEqual([]);   // ei heikko
    expect(TT.tmTukitavoiteEhdotukset(p({ ball_protection: 1 }, null), K())).toEqual([]);
  });
  it('arviointi: D3 → henkinen, D5 → sosiaalinen, D1 → fyysinen (5D-sanasto); gated D1 (speed) PRE:llä korvataan liikehallinnalla', () => {
    const p = (hav) => TOPIAS('POST', { hh_viimeisin: {}, arviointi_havaittu: hav, arviointi_pvm: '2026-09-25' });
    expect(TT.tmTukitavoiteEhdotukset(p({ confidence: 1 }), K())[0]).toMatchObject({ alue: 'henkinen', kuvaus: 'Itseluottamus' });
    expect(TT.tmTukitavoiteEhdotukset(p({ team_role: 1 }), K())[0]).toMatchObject({ alue: 'sosiaalinen', kuvaus: 'Joukkuerooli' });
    expect(TT.tmTukitavoiteEhdotukset(p({ balance: 1 }), K())[0]).toMatchObject({ alue: 'fyysinen', kuvaus: 'Tasapaino' });
    expect(TT.tmTukitavoiteEhdotukset(Object.assign(p({ speed: 1 }), PHV('PRE')), K())[0]).toMatchObject({ kypsyyssuojattu: true, kuvaus: 'Liikehallinta ja kehonhallinta', lahde: { tyyppi: 'arviointi' } });
    expect(TT.tmTukitavoiteEhdotukset(Object.assign(p({ speed: 1 }), PHV('PH')), K())[0]).toMatchObject({ kypsyyssuojattu: true, lahde: { tyyppi: 'arviointi' } });
  });
  it('arviointi: laskeva attribuutti (historia) ehdotetaan, kun alin ei ole heikko ja arvo ≤ 3', () => {
    const p = TOPIAS('POST', { hh_viimeisin: {}, arviointi_havaittu: { link_up: 3, ball_control: 4 }, arviointi_pvm: '2026-09-25' });
    expect(TT.tmTukitavoiteEhdotukset(p, K())).toEqual([]);
    const l = TT.tmTukitavoiteEhdotukset(p, K({ arviointiHistoria: [{ pvm: '2026-05-01', havaittu: { link_up: 4, ball_control: 4 } }, { pvm: '2026-09-25', havaittu: { link_up: 3 } }] }));
    expect(l).toHaveLength(1); expect(l[0]).toMatchObject({ asia: 'link_up', lahde: { tyyppi: 'arviointi' } }); expect(l[0].miksi).toMatch(/laskeva/);
  });
  it('perustelu_ehdotus sitoo ydinvahvuuteen (nimeää sen, kun se on tiedossa)', () => {
    const l = TT.tmTukitavoiteEhdotukset(TOPIAS('POST'), K()); expect(l[0].perustelu_ehdotus).toContain('Tempokuljetus');
    const v = TT.tmTukitavoiteEhdotukset(TOPIAS('POST', { ydinvahvuus: null }), K()); expect(v[0].perustelu_ehdotus).toMatch(/^Tukee ydinvahvuutta: /); expect(v[0].perustelu_ehdotus).not.toContain('Tempokuljetus');
  });
  it('seuran arviointikehys kumoaa Palloliiton taksonomian (avaimet + nimet kehyksestä; tuntematon avain ei kelpaa)', () => {
    const kehys = { taksonomia: [{ avain: 'oma_rytmi', nimi_fi: 'Rytmin pito', dim: 'D2' }, { avain: 'oma_rooli', nimi_fi: 'Roolin ottaminen', dim: 'D5' }] };
    const p = (hav) => TOPIAS('POST', { hh_viimeisin: {}, arviointi_havaittu: hav, arviointi_pvm: '2026-09-25' });
    const l = TT.tmTukitavoiteEhdotukset(p({ oma_rytmi: 1, ball_control: 1 }), K({ arviointikehys: kehys }));
    expect(l).toHaveLength(1); expect(l[0]).toMatchObject({ alue: 'tekninen_taktinen', kuvaus: 'Rytmin pito', asia: 'oma_rytmi' }); expect(l[0].miksi).toMatch(/seuran arviointikehys/);
    expect(TT.tmTukitavoiteEhdotukset(p({ oma_rooli: 1 }), K({ arviointikehys: kehys }))[0]).toMatchObject({ alue: 'sosiaalinen', kuvaus: 'Roolin ottaminen' });
    // ilman seuran kehystä sama data = Palloliitto: oma_rytmi tuntematon, ball_control kelpaa
    expect(TT.tmTukitavoiteEhdotukset(p({ oma_rytmi: 1, ball_control: 1 }), K())[0]).toMatchObject({ asia: 'ball_control', kuvaus: 'Pallonhallinta' });
  });
  it('pelaajan arvio (2b): vain D3-itsearvio (pelaaja ≤ 2), henkinen, myönteinen kuvaus; ero valmentajan arvioon mainitaan; D5 ei vielä', () => {
    const l = TT.tmTukitavoiteEhdotukset(TOPIAS('POST', Object.assign({ hh_viimeisin: {} }, ITSE)), K());
    expect(l).toHaveLength(1); expect(l[0]).toMatchObject({ alue: 'henkinen', kuvaus: 'Jatkaminen epäonnistumisen jälkeen', lahde: { tyyppi: 'pelaajan_arvio', viite: 'd3:resilience', pvm: '2026-10-02' }, lyhyt: 'pelaajan omasta arviosta' });
    expect(l[0].miksi).toMatch(/ero valmentajan arvioon/); expect(l[0].miksi).toMatch(/Pelaaja ei näe/);
    expect(TT.tmTukitavoiteEhdotukset(TOPIAS('POST', { hh_viimeisin: {}, d3_viimeisin: { pvm: '2026-10-02', pisteet: { focus: { pelaaja: 4 } } } }), K())).toEqual([]);   // ei matalaa
    expect(TT.tmTukitavoiteEhdotukset(TOPIAS('POST', { hh_viimeisin: {}, d3_viimeisin: { pisteet: { focus: { pelaaja: 1 } } } }), K())).toEqual([]);                    // päivämäärätön
    expect(TT.tmTukitavoiteEhdotukset(TOPIAS('POST', { hh_viimeisin: {}, d3_viimeisin: { pvm: '2026-02-01', pisteet: { focus: { pelaaja: 1 } } } }), K())).toEqual([]);  // vanha
  });
  it('Leikkijä: ei ehdotuksia (joukkuejakso riittää, D18); seuran profiili voi avata; ei rajoitetta ilman ikävaihetta', () => {
    const { p, k } = KAIKKI(); k.ikavaihe = 'leikkija'; expect(TT.tmTukitavoiteEhdotukset(p, k)).toEqual([]);
    k.seuraProfiili = { leikkija: { tukitavoitteet_max: 1 } }; expect(TT.tmTukitavoiteEhdotukset(p, k).length).toBeGreaterThan(0);
    expect(TT.tmTukitavoiteEhdotukset(p, K({ ikavaihe: null, ika: null, havainnot: HAV, joukkuejakso: JJ })).length).toBeGreaterThan(0);
  });
  it('deduplikointi: sama alue+asia vain kerran (testi ja arviointi samasta kiihdytyksestä)', () => {
    const p = TOPIAS('POST', { hh_viimeisin: { lin10m: 1.95 }, arviointi_havaittu: { acceleration: 1 }, arviointi_pvm: '2026-09-25' });
    expect(TT.tmTukitavoiteEhdotukset(p, K()).filter((e) => e.asia === 'acceleration')).toHaveLength(1);
  });
});

describe('tmTukitavoiteEhdotukset — muoto ja vartijat', () => {
  const p = TOPIAS('PH', { arviointi_havaittu: { ball_protection: 1 }, arviointi_pvm: '2026-09-25', d3_viimeisin: { pvm: '2026-10-02', pisteet: { focus: { pelaaja: 1 } } } });
  const k = K({ havainnot: [ADAR('2026-09-20', { Act: 1, D: 1 }), ADAR('2026-10-03', { Act: 1, D: 1 })], joukkuejakso: { jid: 'j', alku: '2026-10-13', osa_alueet: { fyysinen: { alue: 'power', lahde: 's' } } } });
  const l = TT.tmTukitavoiteEhdotukset(p, k);
  it('jokaisessa ehdotuksessa alue, kuvaus, perustelu_ehdotus, lahde{tyyppi,viite,pvm}, lyhyt, miksi; ja jokainen kelpaa tmTukitavoite-validaattorille', () => {
    expect(l.length).toBeGreaterThan(0); expect(l.length).toBeLessThanOrEqual(4);
    l.forEach((e) => {
      ['alue', 'kuvaus', 'perustelu_ehdotus', 'lyhyt', 'miksi'].forEach((f) => expect(typeof e[f], f).toBe('string'));
      expect(Object.keys(e.lahde).sort()).toEqual(['pvm', 'tyyppi', 'viite']);
      expect(() => TT.tmTukitavoite({ alue: e.alue, kuvaus: e.kuvaus, perustelu: e.perustelu_ehdotus, lahde: e.lahde, harjoitteet: [] })).not.toThrow();
    });
  });
  it('lyhyt-rivissä ei ole päivämääriä eikä testiarvoja; yksityiskohdat vain miksi-kentässä', () => {
    l.forEach((e) => { expect(e.lyhyt).not.toMatch(/\d{4}-\d{2}-\d{2}/); expect(e.lyhyt).not.toMatch(/\d+[.,]\d+/); });
    expect(l.some((e) => /\d{4}-\d{2}-\d{2}/.test(e.miksi))).toBe(true);
  });
  it('KETJUNIMET (SBL/SFL/LL/DIAG/DFL) eivät esiinny missään palautetussa merkkijonossa', () => {
    // laaja otos: kaikki PHV-tilat × lähteet
    ['PRE', 'LAH', 'PH', 'POST', 'AN', null].forEach((phv) => {
      const t = TT.tmTukitavoiteEhdotukset(TOPIAS(phv, { arviointi_havaittu: { ball_protection: 1, speed: 1, mobility: 1 }, arviointi_pvm: '2026-09-25', hh_viimeisin: { lin30m: 5.8, lin10m: 1.95, kasirata: 14, sm_juoksu: 9, cmj: 15, mas: 9 } }), k);
      expect(KETJUT.test(kaikkiTekstit(t)), String(phv)).toBe(false);
    });
    expect(KETJUT.test(kaikkiTekstit(l))).toBe(false);
    // myös vartija toimii: ketjunimi sisältävä teksti tunnistettaisiin
    expect(KETJUT.test('SBL-ketju')).toBe(true);
  });
  it('myönteisyys (GDPR): perustelut ja kuvaukset eivät sisällä kiellettyjä sanoja; ei "ase"-kenttänimiä', () => {
    l.forEach((e) => { expect(JM.tmJaksoTekstiKelpaa(e.perustelu_ehdotus).ok, e.perustelu_ehdotus).toBe(true); expect(JM.tmJaksoTekstiKelpaa(e.kuvaus).ok).toBe(true); });
    l.forEach((e) => expect(JM.tmTarkistaJaksoData(e), JSON.stringify(e)).toEqual([]));
  });
  it('kelvoton ehdotus pudotetaan, ei koko lista: joukkuejakson kielletty sana → ehdotusta ei synny', () => {
    const jj = { jid: 'j', alku: '2026-10-13', osa_alueet: { fyysinen: { alue: 'heikkous kuntoon', lahde: 's' } } };
    expect(TT.tmTukitavoiteEhdotukset({ id: 'x' }, K({ joukkuejakso: jj }))).toEqual([]);
  });
  it('moottori ei muokkaa syötettä (puhdas funktio) ja on deterministinen', () => {
    const a = JSON.stringify([p, k]); const l1 = TT.tmTukitavoiteEhdotukset(p, k); const l2 = TT.tmTukitavoiteEhdotukset(p, k);
    expect(JSON.stringify([p, k])).toBe(a); expect(l1).toEqual(l2);
  });
  it('lib on puhdas: ei Firebasea/DOMia lähteessä; dual-export', () => {
    const src = readFileSync(join(dirname(fileURLToPath(import.meta.url)), '..', 'lib', 'tm_tukitavoitteet.js'), 'utf8');
    const koodi = src.replace(/\/\*[\s\S]*?\*\//g, '').replace(/\/\/.*$/gm, ''); expect(koodi).not.toMatch(/firebase|firestore|document\.|getElementById|fetch\(/i); expect(src).toContain('root.TM_TUKITAVOITTEET = API'); expect(src).not.toMatch(/#[0-9a-fA-F]{6}\b/);
  });
});
