/**
 * lib/tm_joukkuejakso.js — J2 joukkuejakso (Master → Kausi). Fixture: KPV U13 (joukkueet/kpv_u13), seuran teemat (valmennuslinja/teemat) + hyväksytyt ohjelmat.
 */
import { describe, it, expect } from 'vitest';
import { createRequire } from 'module';
const require = createRequire(import.meta.url);
const J = require('../lib/tm_joukkuejakso.js');
const TT = require('../lib/tm_tukitavoitteet.js');
const VL = require('../lib/tm_valmennuslinja.js');
const IDP = require('../lib/tm_idp.js');
const FY = require('../lib/tm_fyysteemat.js');
const T = (s) => s;
const TANAAN = '2026-11-10';
const TEEMAT = VL.tmTeemaKerros({ jaksot: [
  { id: 'teema_45_1', joukkue: 'KPV U13', jakso: 'Jakso 1', alkaa: '2026-11-02', paattyy: '2027-01-17', teema: 'Syöttötaito ja -peli', tila: 'hyvaksytty' },
  { id: 'teema_3_1', joukkue: 'KPV U13', jakso: 'Jakso 2', alkaa: '2027-01-18', paattyy: '2027-03-28', teema: 'Kuljetus ja 1v1', tila: 'hyvaksytty' },
  { id: 'teema_9_9', joukkue: 'KPV U12', alkaa: '2026-11-02', paattyy: '2027-01-17', teema: 'Toisen joukkueen teema', tila: 'hyvaksytty' },
  { id: 'luonnos_1', joukkue: 'KPV U13', alkaa: '2026-11-02', paattyy: '2027-01-17', teema: 'Luonnosteema', tila: 'luonnos' }] }, null);
const OHJ = [
  { id: 'ohjelmat_105_1', nimi: 'Räjähtävä voima', tila: 'hyvaksytty', teema_avain: 'fy_rajahtavyys', lahde: 'seura' },
  { id: 'keskivartalo_94_1', nimi: 'Lankku', tila: 'hyvaksytty', teema_avain: null, lahde: 'seura' },
  { id: 'luonnos_o', nimi: 'Luonnosohjelma', tila: 'luonnos' }, { id: 'arkisto_o', nimi: 'Arkistoitu', tila: 'hyvaksytty', arkistoitu: true },
  { id: 'tuntematon_t', nimi: 'Outo teema', tila: 'hyvaksytty', teema_avain: 'fy_ei_ole' }];
const CTX = (lisa) => Object.assign({ joukkue: 'KPV U13', jid: 'kpv_u13', teemat: TEEMAT, ohjelmat: OHJ, tanaan: TANAAN }, lisa || {});
const DOC = (jf) => ({ id: 'kpv_u13', nimi: 'KPV U13', ikaryhma: 'U13', jaksofokus: jf });
const SYOTE = (lisa) => Object.assign({ tekn: 'teema:teema_45_1', teknOma: '', fyys: 'ohj:ohjelmat_105_1', fyysOma: '', henkinen: 'Seuraava suoritus virheen jälkeen', sosiaalinen: '', alku: TANAAN, kesto: '6' }, lisa || {});
const X = (jf) => J.tmJoukkuejaksoTiedot(DOC(jf), CTX());

describe('tmJoukkueenIka', () => {
  it('ikä nimestä/ikaryhmästä; ei-numeerinen → null', () => {
    expect(J.tmJoukkueenIka('KPV U13')).toBe(13); expect(J.tmJoukkueenIka({ ikaryhma: 'U12', nimi: 'X' })).toBe(12); expect(J.tmJoukkueenIka({ nimi: 'KPV T18' })).toBe(18);
    expect(J.tmJoukkueenIka('KPV Edustus')).toBeNull(); expect(J.tmJoukkueenIka(null)).toBeNull(); expect(J.tmJoukkueenIka('Joukkue 99')).toBeNull();
  });
});

describe('tmJoukkuejaksoValinnat', () => {
  const V = J.tmJoukkuejaksoValinnat(CTX());
  it('tekn.-takt.: vain TÄMÄN joukkueen HYVÄKSYTYT teemat; esivalintana nykyisen päivän teema (#822)', () => {
    expect(V.tekn.map((v) => v.nimi)).toEqual(['Syöttötaito ja -peli', 'Kuljetus ja 1v1']);
    expect(V.tekn.filter((v) => v.esivalittu).map((v) => v.nimi)).toEqual(['Syöttötaito ja -peli']);
    expect(J.tmJoukkuejaksoValinnat(CTX({ tanaan: '2027-02-01' })).tekn.filter((v) => v.esivalittu).map((v) => v.nimi)).toEqual(['Kuljetus ja 1v1']);
    expect(J.tmJoukkuejaksoValinnat(CTX({ tanaan: '2026-10-01' })).tekn.filter((v) => v.esivalittu)[0].nimi).toBe('Syöttötaito ja -peli');   // ei nykyistä → seuraava
    expect(J.tmJoukkuejaksoValinnat(CTX({ tanaan: '2027-06-01' })).tekn.some((v) => v.esivalittu)).toBe(false);
  });
  it('fyysinen kahdessa ryhmässä: Seuran ohjelmat (vain hyväksytyt, ei arkistoituja/luonnoksia; ryhmitelty teema_avaimen mukaan) + Fyysiset teemat (TM_FYYSTEEMAT, 5 kpl)', () => {
    const ryhmat = V.fyysRyhmat.map((g) => g.ryhma);
    expect(ryhmat).toEqual(['Seuran ohjelmat · Räjähtävyys', 'Seuran ohjelmat · muut', 'Fyysiset teemat']);
    const ohj = V.fyysRyhmat.slice(0, 2).flatMap((g) => g.optiot);
    expect(ohj.map((o) => o.ohjelma_id).sort()).toEqual(['keskivartalo_94_1', 'ohjelmat_105_1', 'tuntematon_t']);
    expect(ohj.find((o) => o.ohjelma_id === 'ohjelmat_105_1')).toMatchObject({ avain: 'fy_rajahtavyys', lahde: 'seura' });
    expect(ohj.find((o) => o.ohjelma_id === 'tuntematon_t').avain).toBeNull();   // tuntematon teema_avain ei kelpaa vahdille
    const fy = V.fyysRyhmat[2].optiot; expect(fy.map((o) => o.avain)).toEqual(['fy_nopeus', 'fy_rajahtavyys', 'fy_kestavyys', 'fy_ketteryys', 'fy_liikehallinta']); expect(fy.every((o) => o.lahde === 'tm')).toBe(true);
  });
  it('ilman ohjelmia ja linjaa: vain TM_FYYSTEEMAT; ei kaadu tyhjällä', () => {
    const v = J.tmJoukkuejaksoValinnat({ joukkue: 'X', tanaan: TANAAN }); expect(v.tekn).toEqual([]); expect(v.fyysRyhmat.map((g) => g.ryhma)).toEqual(['Fyysiset teemat']);
    expect(() => J.tmJoukkuejaksoValinnat(null)).not.toThrow();
  });
});

describe('tmJoukkuejaksoTiedot (lomakkeen alkuarvot)', () => {
  it('uusi jakso: tila aloita, esivalittu teema, alku = tänään, kesto ikävaiheesta (U13 = 6–8, oletus 6; U12 = 12)', () => {
    const x = X(null); expect(x).toMatchObject({ tila: 'aloita', tekn: 'teema:teema_45_1', fyys: '', alku: TANAAN, ika: 13 }); expect(x.kesto).toMatchObject({ vaihtoehdot: [6, 7, 8], valittu: 6 });
    expect(J.tmJoukkuejaksoTiedot({ id: 'a', nimi: 'KPV U12' }, CTX({ joukkue: 'KPV U12' })).kesto).toMatchObject({ vaihtoehdot: [12], valittu: 12 });
  });
  it('ei teemoja → Oma esivalittu; muokkaus: tila muokkaa, valinnat palautuvat osa_alueista (ohjelma, fy-teema, Oma, nykyinen)', () => {
    expect(J.tmJoukkuejaksoTiedot(DOC(null), CTX({ teemat: null })).tekn).toBe(J.OMA);
    const jf = J.tmJoukkuejaksoRakenna(SYOTE(), X(null), { rooli: 'vp', tanaan: TANAAN });
    const x = X(jf); expect(x).toMatchObject({ tila: 'muokkaa', tekn: 'teema:teema_45_1', fyys: 'ohj:ohjelmat_105_1', henkinen: 'Seuraava suoritus virheen jälkeen', sosiaalinen: '' });
    const jf2 = J.tmJoukkuejaksoRakenna(SYOTE({ fyys: 'fy:fy_ketteryys', tekn: J.OMA, teknOma: 'Oma teema', kesto: '8' }), X(null), {}); const x2 = X(jf2);
    expect(x2).toMatchObject({ fyys: 'fy:fy_ketteryys', tekn: J.OMA, teknOma: 'Oma teema' }); expect(x2.kesto.valittu).toBe(8);
    const jf3 = J.tmJoukkuejaksoRakenna(SYOTE({ fyys: J.OMA, fyysOma: 'Oma kuntotreeni' }), X(null), {}); expect(X(jf3)).toMatchObject({ fyys: J.OMA, fyysOma: 'Oma kuntotreeni' });
    const poistunut = JSON.parse(JSON.stringify(jf)); poistunut.osa_alueet.fyysinen.ohjelma_id = 'poistettu_o'; expect(X(poistunut).fyys).toBe(J.NYKYINEN);   // ohjelma ei enää valikossa → "nykyinen" säilyy
  });
});

describe('tmJoukkuejaksoRakenna', () => {
  it('seuran ohjelma + seuran teema → osa_alueet-muoto, alku/kesto/katselmusikkuna (D21: 2 vk jakson päättymispäivästä), asetti', () => {
    const jf = J.tmJoukkuejaksoRakenna(SYOTE({ alku: '2026-10-13' }), X(null), { rooli: 'valmentaja', tanaan: '2026-10-13' });
    expect(jf.osa_alueet).toEqual({ tekninen_taktinen: { teema_avain: 'teema_45_1', nimi: 'Syöttötaito ja -peli', lahde: 'seura' }, fyysinen: { avain: 'fy_rajahtavyys', nimi: 'Räjähtävä voima', ohjelma_id: 'ohjelmat_105_1', lahde: 'seura' },
      henkinen: { kuvaus: 'Seuraava suoritus virheen jälkeen' }, sosiaalinen: null });
    expect(jf).toMatchObject({ alku: '2026-10-13', kesto_vk: 6, katselmus_alku: '2026-11-24', katselmus_loppu: '2026-12-08', asetti: { rooli: 'valmentaja', pvm: '2026-10-13' }, konsepti_avain: 'teema_45_1', domeeni: 'teknis_taktinen' });
    expect(TT.tmJoukkuejaksoOsaAlueet(jf.osa_alueet)).toEqual(jf.osa_alueet);   // kelpaa J1-validaattorille sellaisenaan
  });
  it('TM_FYYSTEEMAT-teema → lahde tm + avain; ohjelma ilman teema_avainta → avain null (lahde seura)', () => {
    expect(J.tmJoukkuejaksoRakenna(SYOTE({ fyys: 'fy:fy_nopeus' }), X(null), {}).osa_alueet.fyysinen).toEqual({ avain: 'fy_nopeus', nimi: 'Nopeus', lahde: 'tm' });
    expect(J.tmJoukkuejaksoRakenna(SYOTE({ fyys: 'ohj:keskivartalo_94_1' }), X(null), {}).osa_alueet.fyysinen).toEqual({ avain: null, nimi: 'Lankku', ohjelma_id: 'keskivartalo_94_1', lahde: 'seura' });
  });
  it('Oma… (vapaa teksti): tekn. ilman avainta (konsepti_avain oma:<slug>), fyysinen vain lahde oma ilman avainta; vapaata tekstiä EI hyväksytä muulla tavoin', () => {
    const jf = J.tmJoukkuejaksoRakenna(SYOTE({ tekn: J.OMA, teknOma: 'Rakennetaan ylös ääriä pitkin', fyys: J.OMA, fyysOma: 'Oma kuntopiiri' }), X(null), {});
    expect(jf.osa_alueet.tekninen_taktinen).toEqual({ teema_avain: null, nimi: 'Rakennetaan ylös ääriä pitkin', lahde: 'oma' }); expect(jf.osa_alueet.fyysinen).toEqual({ avain: null, nimi: 'Oma kuntopiiri', lahde: 'oma' }); expect(jf.konsepti_avain).toBe('oma:rakennetaan_ylos_aaria_pitkin');
    expect(() => J.tmJoukkuejaksoRakenna(SYOTE({ fyys: 'vapaa teksti' }), X(null), {})).toThrow(/valitse ohjelma tai teema/);
    expect(() => J.tmJoukkuejaksoRakenna(SYOTE({ tekn: 'teema:ei_ole' }), X(null), {})).toThrow(/valitse teema/);
  });
  it('pakolliset: tekn. ja fyysinen; Oma ilman tekstiä hylätään; henkinen/sosiaalinen valinnaisia', () => {
    expect(() => J.tmJoukkuejaksoRakenna(SYOTE({ tekn: '' }), X(null), {})).toThrow(/valitse teema/);
    expect(() => J.tmJoukkuejaksoRakenna(SYOTE({ fyys: '' }), X(null), {})).toThrow(/valitse ohjelma tai teema/);
    expect(() => J.tmJoukkuejaksoRakenna(SYOTE({ tekn: J.OMA, teknOma: '  ' }), X(null), {})).toThrow(/puuttuu|tyhjä/);
    expect(() => J.tmJoukkuejaksoRakenna(SYOTE({ fyys: J.OMA, fyysOma: '' }), X(null), {})).toThrow(/puuttuu|tyhjä/);
    expect(J.tmJoukkuejaksoRakenna(SYOTE({ henkinen: '', sosiaalinen: '' }), X(null), {}).osa_alueet).toMatchObject({ henkinen: null, sosiaalinen: null });
  });
  it('henkinen/sosiaalinen: ≤ 120 merkkiä ja KIELLETYT-sanat hylätään (aina myönteinen)', () => {
    expect(J.tmJoukkuejaksoRakenna(SYOTE({ sosiaalinen: 'a'.repeat(120) }), X(null), {}).osa_alueet.sosiaalinen.kuvaus.length).toBe(120);
    expect(() => J.tmJoukkuejaksoRakenna(SYOTE({ sosiaalinen: 'a'.repeat(121) }), X(null), {})).toThrow(/liian pitkä/);
    ['heikkous', 'rajoite', 'kriittinen'].forEach((s) => { expect(() => J.tmJoukkuejaksoRakenna(SYOTE({ henkinen: 'Tämä on ' + s }), X(null), {}), s).toThrow(/kielletyn sanan/); expect(() => J.tmJoukkuejaksoRakenna(SYOTE({ sosiaalinen: s }), X(null), {})).toThrow(/kielletyn sanan/); });
    expect(() => J.tmJoukkuejaksoRakenna(SYOTE({ tekn: J.OMA, teknOma: 'Heikkouksien korjaus' }), X(null), {})).toThrow(/kielletyn sanan/);
  });
  it('kesto D7: vain ikävaiheen vaihtoehdot (U13: 6–8; 5 ja 9 hylätään); alku kelvollinen kalenteripäivä', () => {
    [6, 7, 8].forEach((k) => expect(J.tmJoukkuejaksoRakenna(SYOTE({ kesto: String(k) }), X(null), {}).kesto_vk).toBe(k));
    ['5', '9', '12', 'x', ''].forEach((k) => expect(() => J.tmJoukkuejaksoRakenna(SYOTE({ kesto: k }), X(null), {}), k).toThrow(/kesto/));
    ['13.11.2026', '2026-02-30', '', '2026-13-01'].forEach((p) => expect(() => J.tmJoukkuejaksoRakenna(SYOTE({ alku: p }), X(null), {}), p).toThrow(/alkamispäivä/));
    expect(J.tmJoukkuejaksoRakenna(SYOTE({ alku: '2028-02-29' }), X(null), {}).katselmus_alku).toBe('2028-04-11');
  });
  it('tulokseen ei vuoda ketjunimiä; kentät neutraaleja (GDPR: ei "ase"-kenttänimiä)', () => {
    const jf = J.tmJoukkuejaksoRakenna(SYOTE(), X(null), { rooli: 'vp', tanaan: TANAAN });
    expect(/\b(SBL|SFL|LL|DIAG|DFL)\b/.test(JSON.stringify(jf))).toBe(false); expect(require('../lib/tm_jakso_malli.js').tmTarkistaJaksoData(jf)).toEqual([]);
  });
});

describe('tmJoukkuejaksoKirjoitus (YKSI tmAsetaJaksofokus-polku; Rules v3.37: vain jaksofokus + jaksofokus_historia)', () => {
  const dep = { arrayUnion: (...r) => ({ AU: r }), nytISO: '2026-10-13T08:00:00.000Z' };
  it('ensimmäinen jakso: vain jaksofokus (alkoi = nyt); ei historiaa', () => {
    const jf = J.tmJoukkuejaksoRakenna(SYOTE(), X(null), {}); const k = J.tmJoukkuejaksoKirjoitus(DOC(null), jf, dep);
    expect(Object.keys(k.update)).toEqual(['jaksofokus']); expect(k.update.jaksofokus.alkoi).toBe('2026-10-13T08:00:00.000Z'); expect(k.paikallinen.historiaLisays).toEqual([]);
  });
  it('sama teema (muokkaus): yhdistetään, alkoi säilyy, EI historiaa; eri teema: edellinen arkistoidaan arrayUnionina (sulkutapa korvattu)', () => {
    const jf = J.tmJoukkuejaksoRakenna(SYOTE(), X(null), {}), eka = J.tmJoukkuejaksoKirjoitus(DOC(null), jf, dep).paikallinen.jaksofokus;
    const muok = J.tmJoukkuejaksoKirjoitus(DOC(eka), J.tmJoukkuejaksoRakenna(SYOTE({ henkinen: 'Uusi lause', kesto: '7' }), J.tmJoukkuejaksoTiedot(DOC(eka), CTX()), {}), Object.assign({}, dep, { nytISO: '2026-10-20T08:00:00.000Z' }));
    expect(Object.keys(muok.update)).toEqual(['jaksofokus']); expect(muok.update.jaksofokus.alkoi).toBe('2026-10-13T08:00:00.000Z'); expect(muok.update.jaksofokus.kesto_vk).toBe(7); expect(muok.update.jaksofokus.osa_alueet.henkinen.kuvaus).toBe('Uusi lause');
    const vaihto = J.tmJoukkuejaksoKirjoitus(DOC(eka), J.tmJoukkuejaksoRakenna(SYOTE({ tekn: 'teema:teema_3_1' }), J.tmJoukkuejaksoTiedot(DOC(eka), CTX()), {}), dep);
    expect(Object.keys(vaihto.update).sort()).toEqual(['jaksofokus', 'jaksofokus_historia']); expect(vaihto.update.jaksofokus_historia.AU).toHaveLength(1); expect(vaihto.update.jaksofokus_historia.AU[0]).toMatchObject({ konsepti_avain: 'teema_45_1', sulkutapa: 'korvattu', tulos: 'vaihdettu' });
  });
  it('historia ilman arrayUnion-injektiota heittää (ei hiljaista katoamista)', () => {
    const eka = J.tmJoukkuejaksoKirjoitus(DOC(null), J.tmJoukkuejaksoRakenna(SYOTE(), X(null), {}), dep).paikallinen.jaksofokus;
    const jf2 = J.tmJoukkuejaksoRakenna(SYOTE({ tekn: 'teema:teema_3_1' }), J.tmJoukkuejaksoTiedot(DOC(eka), CTX()), {});
    expect(() => J.tmJoukkuejaksoKirjoitus(DOC(eka), jf2, {})).toThrow(/arrayUnion/);
  });
});

describe('modaali- ja korttinäkymä', () => {
  const OPTS = { t: T, modalId: 'M', tallennaFn: '_tal', suljeFn: '_sulje', overlayAttrs: 'class="o"' };
  it('modaali: kaikki kentät, optgroup-ryhmät, Oma…, tallennus ei vie argumentteja; otsikko tilan mukaan; ei D-koodeja/ketjuja/hex-värejä', () => {
    const h = J.tmJoukkuejaksoModalHTML(X(null), OPTS);
    for (const id of Object.values(J.IDS)) expect(h, id).toContain('id="' + id + '"');
    expect(h).toContain('<optgroup label="Seuran ohjelmat · Räjähtävyys">'); expect(h).toContain('<optgroup label="Fyysiset teemat">'); expect(h).toContain('Oma…'); expect(h).toContain("_tal()"); expect(h).toContain('class="o"');
    expect(h).toContain('Aloita joukkuejakso'); expect(h).toContain('KPV U13'); expect(h).not.toContain('Tallenna joukkuejakso');
    expect(h).not.toMatch(/#[0-9a-f]{3,6}\b/i); expect(h).not.toMatch(/\b(SBL|SFL|LL|DIAG|DFL)\b/); expect(h).not.toMatch(/\bD[1-8]\b/);
    const jf = J.tmJoukkuejaksoRakenna(SYOTE(), X(null), {}); const m = J.tmJoukkuejaksoModalHTML(X(jf), OPTS); expect(m).toContain('Tallenna joukkuejakso'); expect(m).toContain('selected');
    expect(h).toContain('width:100%'); expect(h).toContain('box-sizing:border-box'); expect(h).toContain('max-width:520px');   // 390 px: ei vaakavuotoa
  });
  it('modaali escapaa (XSS) ja kääntää t():llä; Oma-kenttä näkyy vain kun Oma valittu', () => {
    const jf = J.tmJoukkuejaksoRakenna(SYOTE({ tekn: J.OMA, teknOma: 'Oma <b>x</b>' }), X(null), {}); const h = J.tmJoukkuejaksoModalHTML(X(jf), Object.assign({}, OPTS, { t: (s) => '«' + s + '»' }));
    expect(h).not.toContain('<b>x</b>'); expect(h).toContain('«Fyysinen (pakollinen)»'); expect(h).toMatch(/id="_jjTeknOma"[^>]*display:block/); expect(h).toMatch(/id="_jjFyysOma"[^>]*display:none/);
  });
  const jfKortti = (alku, kesto) => J.tmJoukkuejaksoKirjoitus(DOC(null), J.tmJoukkuejaksoRakenna(SYOTE({ alku: alku, kesto: kesto || '6' }), X(null), {}), { nytISO: '2026-10-13T08:00:00.000Z' }).paikallinen.jaksofokus;
  it('kortti: ei jaksoa → "Joukkueella ei ole jaksoa" + Aloita-nappi; jaksolla neljä aluetta, viikko n/N, kesto + päättyy, katselmusikkuna, Muokkaa', () => {
    const e = J.tmJoukkuejaksoKorttiHTML(J.tmJoukkuejaksoKortti(DOC(null), { tanaan: TANAAN }), { t: T, avaaFn: '_avaa' }); expect(e).toContain('Joukkueella ei ole jaksoa'); expect(e).toContain('Aloita joukkuejakso'); expect(e).toContain('_avaa()');
    const k = J.tmJoukkuejaksoKortti(DOC(jfKortti('2026-10-13')), { tanaan: '2026-11-03' }); expect(k).toMatchObject({ onJakso: true, tekn: 'Syöttötaito ja -peli', fyys: 'Räjähtävä voima', henkinen: 'Seuraava suoritus virheen jälkeen', sosiaalinen: null, kesto_vk: 6, paattyy: '2026-11-24', viikko: { n: 4, k: 6 }, umpeutunut: false });
    const h = J.tmJoukkuejaksoKorttiHTML(k, { t: T, avaaFn: '_avaa', nimi: 'KPV U13' });
    for (const s of ['Syöttötaito ja -peli', 'Räjähtävä voima', 'Seuraava suoritus virheen jälkeen', 'Viikko 4/6', '6 vk', 'päättyy 24.11.', 'Katselmusikkuna', '24.11.–8.12.', 'Muokkaa joukkuejaksoa', 'KPV U13']) expect(h, s).toContain(s);
    expect(h).not.toContain('Sosiaalinen'); expect(h).not.toMatch(/\b(SBL|SFL|LL|DIAG|DFL)\b/);
  });
  it('kortti: alkaa vasta · päättynyt · rajat (viikko 1 alkupäivänä, päättyy-päivänä umpeutunut); vain luku ilman muokkausnappia; legacy-jaksofokus ilman osa_alueita = ei jaksoa', () => {
    const jf = jfKortti('2026-10-13');
    expect(J.tmJoukkuejaksoKortti(DOC(jf), { tanaan: '2026-10-12' })).toMatchObject({ alkaaVasta: true, viikko: null }); expect(J.tmJoukkuejaksoKortti(DOC(jf), { tanaan: '2026-10-13' }).viikko).toEqual({ n: 1, k: 6 });
    expect(J.tmJoukkuejaksoKortti(DOC(jf), { tanaan: '2026-11-23' })).toMatchObject({ viikko: { n: 6, k: 6 }, umpeutunut: false }); expect(J.tmJoukkuejaksoKortti(DOC(jf), { tanaan: '2026-11-24' }).umpeutunut).toBe(true);
    expect(J.tmJoukkuejaksoKorttiHTML(J.tmJoukkuejaksoKortti(DOC(jf), { tanaan: '2026-12-01' }), { t: T })).toContain('Päättynyt 24.11.');
    expect(J.tmJoukkuejaksoKorttiHTML(J.tmJoukkuejaksoKortti(DOC(jf), { tanaan: TANAAN }), { t: T, avaaFn: '_a', voiMuokata: false })).not.toContain('Muokkaa joukkuejaksoa');
    expect(J.tmJoukkuejaksoKortti(DOC({ konsepti_avain: 'y_h2', konsepti_nimi: 'X' }), { tanaan: TANAAN }).onJakso).toBe(false); expect(J.tmJoukkuejaksoKortti(null, null).onJakso).toBe(false);
    expect(J.tmJoukkuejaksoKorttiHTML({ onJakso: false }, { t: T, avaaFn: '_a', voiMuokata: false })).toContain('Pyydä VP:tä luomaan joukkue');
  });
});

describe('kypsyysvahti: yksi fy_* → IDP_KYPSYYS_GATED -kartta tm_idp.js:ssä (vahdin vieressä)', () => {
  it('kartta: fy_nopeus → speed, fy_rajahtavyys → power, fy_kestavyys → endurance; ketteryys ja liikehallinta eivät; jokainen kohde on vahdin avain; jokainen avain on TM_FYYSTEEMAT-teema', () => {
    expect(IDP.IDP_FY_TEEMA_AVAIN).toEqual({ fy_nopeus: 'speed', fy_rajahtavyys: 'power', fy_kestavyys: 'endurance' });
    Object.keys(IDP.IDP_FY_TEEMA_AVAIN).forEach((fy) => { expect(IDP.IDP_KYPSYYS_GATED[IDP.IDP_FY_TEEMA_AVAIN[fy]]).toBe(1); expect(FY.tmFyysTeema(fy)).not.toBeNull(); });
    expect(IDP.idpFyTeemaGatedAvain('fy_ketteryys')).toBeNull(); expect(IDP.idpFyTeemaGatedAvain('fy_liikehallinta')).toBeNull(); expect(IDP.idpFyTeemaGatedAvain('constructor')).toBeNull(); expect(IDP.idpFyTeemaGatedAvain(null)).toBeNull();
  });
});
