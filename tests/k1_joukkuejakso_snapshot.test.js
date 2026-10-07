/**
 * K1 (valinta A): joukkuejakson SNAPSHOT pelaajan jaksoon + J2-propagointi + pelaajan viikkotavoite. Fixturet keksittyjä.
 */
import { describe, it, expect } from 'vitest';
import { createRequire } from 'module';
const require = createRequire(import.meta.url);
const J = require('../lib/tm_joukkuejakso.js');
const AJ = require('../lib/tm_aloita_jakso.js');

const JF = (lisa) => Object.assign({ osa_alueet: { tekninen_taktinen: { nimi: 'Kuljettaminen', lahde: 'seura' }, henkinen: { kuvaus: 'Rohkeus' } }, alku: '2026-10-05', kesto_vk: 6, konsepti_avain: 'kuljettaminen', asetti: 'uid-1', lahde: 'seura', katselmus_alku: '2026-11-16',
  viikot: [{ vk: 2, tavoite: 'Käännös', lahde: 'oma' }, { vk: 1, tavoite: 'Ensikosketus', lahde: 'oma' }] }, lisa || {});
const DOC = (lisa) => ({ nimi: 'KPV U13', jaksofokus: JF(lisa), jaksofokus_historia: [{ salainen: 'x' }] });

describe('tmJoukkuejaksoSnapshot', () => {
  it('täsmälleen {jid, alku, kesto_vk, nimi, viikot:[{vk, tavoite}]} — EI asetti/lahde/historia/katselmus; viikot järjestettynä ilman lahde-kenttää; nimi = tekninen_taktinen.nimi', () => {
    const s = J.tmJoukkuejaksoSnapshot(DOC(), 'kpv_u13');
    expect(Object.keys(s).sort()).toEqual(['alku', 'jid', 'kesto_vk', 'nimi', 'viikot']);
    expect(s).toEqual({ jid: 'kpv_u13', alku: '2026-10-05', kesto_vk: 6, nimi: 'Kuljettaminen', viikot: [{ vk: 1, tavoite: 'Ensikosketus' }, { vk: 2, tavoite: 'Käännös' }] });
    s.viikot.forEach((v) => expect(Object.keys(v).sort()).toEqual(['tavoite', 'vk'])); expect(JSON.stringify(s)).not.toMatch(/uid-1|salainen|seura|oma|katselmus/);
  });
  it('null kun jaksoa/nimeä/alkua/kestoa/jid:tä ei ole; kelvottomat viikot (yli keston, tyhjä, ei-teksti) suodatetaan', () => {
    for (const d of [null, {}, { jaksofokus: {} }, DOC({ osa_alueet: {} }), DOC({ alku: 'huomenna' }), DOC({ kesto_vk: 0 }), DOC({ osa_alueet: { tekninen_taktinen: { nimi: '  ' } } })]) expect(J.tmJoukkuejaksoSnapshot(d, 'j')).toBeNull();
    expect(J.tmJoukkuejaksoSnapshot(DOC(), '')).toBeNull();
    expect(J.tmJoukkuejaksoSnapshot(DOC({ viikot: [{ vk: 7, tavoite: 'yli' }, { vk: 1, tavoite: ' ' }, { vk: 2, tavoite: 5 }, { vk: 3, tavoite: 'ok' }, null] }), 'j').viikot).toEqual([{ vk: 3, tavoite: 'ok' }]);
    expect(J.tmJoukkuejaksoSnapshot(DOC({ viikot: undefined }), 'j').viikot).toEqual([]);
  });
  it('V1/J4 (tmAloitaJaksoTuki) kirjoittaa viitteeksi snapshotin; ilman nimeä/jid:tä → vanha {jid, alku}', () => {
    const tuki = (jDoc, jid) => AJ.tmAloitaJaksoTuki({ id: 'p1', joukkueet: [], jaksofokus: null }, { tanaan: '2026-10-07', ika: 13, sp: 'M', haetut: { joukkue: { jid, data: jDoc } } });
    expect(tuki(DOC(), 'kpv_u13').viite).toEqual(J.tmJoukkuejaksoSnapshot(DOC(), 'kpv_u13'));
    expect(tuki(DOC({ osa_alueet: { tekninen_taktinen: { nimi: '' } } }), 'kpv_u13').viite).toEqual({ jid: 'kpv_u13', alku: '2026-10-05' });
  });
});

describe('tmJoukkuejaksoSynkka (J2-propagointi)', () => {
  const P = (id, viite) => ({ id, jaksofokus: viite === undefined ? null : { konsepti_avain: 'x', joukkuejakso_viite: viite } });
  const VANHA = { alku: '2026-10-05', kesto_vk: 6, sama: true };
  const pelaajat = [P('a', { jid: 'kpv_u13', alku: '2026-10-05' }), P('b', { jid: 'kpv_u13', alku: '2026-10-05', kesto_vk: 6, nimi: 'Vanha', viikot: [] }), P('c', { jid: 'kpv_u13', alku: '2026-08-10' }), P('d', { jid: 'kpv_u14', alku: '2026-10-05' }), P('e'), P('f', null), { id: 'g' }, P('h', { jid: 'kpv_u13', alku: '2026-10-05' })];
  it('viikkotavoite muuttuu (sama alku): päivittyvät vain pelaajat, joilla sama jid + alku — myös vanha {jid, alku} -viite saa koko snapshotin; muut pelaajat ja toinen joukkue eivät', () => {
    const r = J.tmJoukkuejaksoSynkka(VANHA, DOC({ viikot: [{ vk: 1, tavoite: 'Uusi' }] }), 'kpv_u13', pelaajat);
    expect(r.ohitettu).toBeNull(); expect(r.paivitykset.map((x) => x.id)).toEqual(['a', 'b', 'h']);
    r.paivitykset.forEach((x) => { expect(Object.keys(x.update)).toEqual(['jaksofokus.joukkuejakso_viite']); expect(x.update['jaksofokus.joukkuejakso_viite']).toEqual({ jid: 'kpv_u13', alku: '2026-10-05', kesto_vk: 6, nimi: 'Kuljettaminen', viikot: [{ vk: 1, tavoite: 'Uusi' }] }); });
  });
  it('ALKU MUUTTUU (sama jakso, edellinen alku): pelaajat haetaan EDELTÄVÄLLÄ alulla ja viite.alku päivittyy uuteen', () => {
    const r = J.tmJoukkuejaksoSynkka(VANHA, DOC({ alku: '2026-10-12' }), 'kpv_u13', pelaajat);
    expect(r.paivitykset.map((x) => x.id)).toEqual(['a', 'b', 'h']); expect(r.paivitykset[0].update['jaksofokus.joukkuejakso_viite'].alku).toBe('2026-10-12');
    // kun pelaajat on jo päivitetty uudelle alulle, toinen ajo vanhalla parilla ei osu heihin (idempotentti, ei sotke)
    const paivitetty = pelaajat.map((p) => (p.id === 'a' ? P('a', { jid: 'kpv_u13', alku: '2026-10-12' }) : p)); expect(J.tmJoukkuejaksoSynkka(VANHA, DOC({ alku: '2026-10-12' }), 'kpv_u13', paivitetty).paivitykset.map((x) => x.id)).toEqual(['b', 'h']);
  });
  it('UUSI JOUKKUEJAKSO ei koske vanhan jakson snapshotteja: eri identiteetti (sama=false) TAI sama taito joka alkaa vasta vanhan päätyttyä → ei päivityksiä', () => {
    const uusiDoc = DOC({ alku: '2026-11-30', konsepti_avain: 'toinen', osa_alueet: { tekninen_taktinen: { nimi: 'Pelaaminen' } } });
    expect(J.tmJoukkuejaksoSynkka({ alku: '2026-10-05', kesto_vk: 6, sama: false }, uusiDoc, 'kpv_u13', pelaajat)).toEqual({ paivitykset: [], ohitettu: 'uusi_jakso' });
    expect(J.tmJoukkuejaksoSynkka(VANHA, DOC({ alku: '2026-11-16' }), 'kpv_u13', pelaajat)).toEqual({ paivitykset: [], ohitettu: 'uusi_jakso' });   // 5.10. + 42 pv = 16.11. → alkaa vasta edellisen päätyttyä
    expect(J.tmJoukkuejaksoSynkka(VANHA, DOC({ alku: '2026-11-15' }), 'kpv_u13', pelaajat).paivitykset.length).toBe(3);   // päivää ennen päättymistä = vielä sama jakso
  });
  it('ei vanhaa jaksoa / ei snapshotia (uudessa nimi puuttuu) / tyhjät pelaajat → ei päivityksiä, syy kerrotaan; ei heitä rikkinäisellä syötteellä', () => {
    expect(J.tmJoukkuejaksoSynkka({ sama: true }, DOC(), 'j', pelaajat).ohitettu).toBe('ei_vanhaa_jaksoa'); expect(J.tmJoukkuejaksoSynkka(null, DOC(), 'j', pelaajat).ohitettu).toBe('ei_vanhaa_jaksoa');
    expect(J.tmJoukkuejaksoSynkka(VANHA, { jaksofokus: {} }, 'kpv_u13', pelaajat).ohitettu).toBe('ei_snapshotia'); expect(J.tmJoukkuejaksoSynkka(VANHA, DOC(), 'kpv_u13', null).paivitykset).toEqual([]);
  });
  it('tmJoukkuejaksoKirjoitus palauttaa sama-lipun (muokkaus = true, uusi taito = false)', () => {
    const nyt = { nytISO: '2026-10-07T10:00:00.000Z', arrayUnion: (...a) => ({ a }) };
    const jf = (avain, nimi) => ({ konsepti_avain: avain, konsepti_nimi: nimi, domeeni: 'tekninen', laji: 'jalkapallo', lahde: 'seura', osa_alueet: { tekninen_taktinen: { nimi } }, alku: '2026-10-05', kesto_vk: 6 });
    const vanha = { jaksofokus: jf('kuljettaminen', 'Kuljettaminen') };
    expect(J.tmJoukkuejaksoKirjoitus(vanha, jf('kuljettaminen', 'Kuljettaminen'), nyt).sama).toBe(true); expect(J.tmJoukkuejaksoKirjoitus(vanha, jf('pelaaminen', 'Pelaaminen'), nyt).sama).toBe(false);
  });
});

describe('tmJoukkuejaksoViikko (pelaajan snapshotista)', () => {
  const S = J.tmJoukkuejaksoSnapshot(DOC(), 'kpv_u13');
  it('kuluva viikko tmJoukkuejaksoKortti-laskennalla: nimi + tavoite; ei tavoitetta viikolle → vain nimi; viimeinen viikko ok', () => {
    expect(J.tmJoukkuejaksoViikko(S, '2026-10-05')).toEqual({ nimi: 'Kuljettaminen', viikkotavoite: 'Ensikosketus', viikko: { n: 1, k: 6 } });
    expect(J.tmJoukkuejaksoViikko(S, '2026-10-14')).toMatchObject({ viikkotavoite: 'Käännös', viikko: { n: 2, k: 6 } });
    expect(J.tmJoukkuejaksoViikko(S, '2026-10-21')).toEqual({ nimi: 'Kuljettaminen', viikkotavoite: null, viikko: { n: 3, k: 6 } }); expect(J.tmJoukkuejaksoViikko(S, '2026-11-15').viikko).toEqual({ n: 6, k: 6 });
  });
  it('UMPEUTUNUT jakso, vasta alkava jakso, ei jaksoa, vanha {jid, alku} -viite (ei snapshotia) ja rikkinäinen viite → null (rivi piiloon)', () => {
    expect(J.tmJoukkuejaksoViikko(S, '2026-11-16')).toBeNull(); expect(J.tmJoukkuejaksoViikko(S, '2026-10-04')).toBeNull();
    for (const v of [null, undefined, {}, { jid: 'x', alku: '2026-10-05' }, Object.assign({}, S, { nimi: '' }), Object.assign({}, S, { kesto_vk: 0 }), 'x']) expect(J.tmJoukkuejaksoViikko(v, '2026-10-14')).toBeNull();
  });
});

describe('tmJoukkuejaksoSynkkaIlmoitusHTML', () => {
  it('0 → tyhjä; N → "N pelaajan viikkotavoite ei päivittynyt, yritä uudelleen" + Yritä uudelleen -nappi; 1 → yksikkömuoto; escapaa; t() läpi', () => {
    expect(J.tmJoukkuejaksoSynkkaIlmoitusHTML(0)).toBe('');
    const h = J.tmJoukkuejaksoSynkkaIlmoitusHTML(3, { uudelleenFn: '_mJjSynkkaUudelleen' }); expect(h).toContain('3 pelaajan viikkotavoite ei päivittynyt, yritä uudelleen'); expect(h).toContain('data-jj-synkka-uudelleen'); expect(h).toContain('Yritä uudelleen'); expect(h).not.toMatch(/#[0-9a-fA-F]{3,6}\b/);
    expect(J.tmJoukkuejaksoSynkkaIlmoitusHTML(1)).toContain('1 pelaajan viikkotavoite ei päivittynyt, yritä uudelleen'); expect(J.tmJoukkuejaksoSynkkaIlmoitusHTML(2, { t: (k) => '«' + k + '»' })).toContain('«{n} pelaajan viikkotavoite ei päivittynyt, yritä uudelleen»'.replace('{n}', '2').replace('«2', '«2'));
  });
});
