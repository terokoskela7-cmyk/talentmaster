/** Projekti 07 / PR 1: PII-vartija (VAIHE0 §3.3, PM:n lisäpäätös). Hälytys (audit-rivi, sähköposti, lokiviesti) saa sisältää vain seura-id:n, tarkistuskoodin, kokoelman ja lukumäärät.
 *  Testi syöttää ydinmoduulille pelaajan nimen, uid:n, pelaaja-id:n, PalloID:n, huoltajan sähköpostin ja joukkueen nimen, ajaa KOKO ketjun
 *  (tarkistaSeura + tarkistaGlobaali → raportti → audit-rivi / sähköposti / loki) ja varmistaa, ettei mikään niistä esiinny missään ulostulossa. */
import { describe, it, expect } from 'vitest';
import { createRequire } from 'module';
const require = createRequire(import.meta.url);
const V = require('../lib/tm_valvonta.js');
const R = require('../lib/tm_valvonta_raportti.js');

const NIMI = 'Matti Meikäläinen', ETU = 'Matti', SUKU = 'Meikäläinen', UID = 'uidSALAINEN9z8y7x', PID = 'pelaajaSALAINEN12ab', PALLO = '90817263', EMAIL = 'huoltaja.salainen@esimerkki.fi', JOUKKUE = 'Salaiset Ukkoset P09', VIERAS = 'Toisen Salainen Tiimi T12', DOCID = 'dokumenttiSALAINEN55';
const KIELLETYT = [NIMI, ETU, SUKU, UID, PID, PALLO, EMAIL, JOUKKUE, VIERAS, DOCID, 'esimerkki.fi'];

function ketju(edellinen) {
  const seurat = [
    { sid: 'seura_a', joukkueet: [{ id: 'sa1', nimi: JOUKKUE }], pelaajat: [{ _id: PID, etunimi: ETU, sukunimi: SUKU, nimi: NIMI, tunniste: PALLO, huoltajaEmail: EMAIL, joukkue: VIERAS, syntymaVuosi: 2009 }, { _id: 'dup', etunimi: 'X', tunniste: PALLO }], kayttajat: [UID] },
    { sid: 'seura_b', joukkueet: [{ id: 'sb1', nimi: VIERAS }], pelaajat: [{ _id: PID, etunimi: ETU, sukunimi: SUKU, tunniste: '1' }], kayttajat: [] }];
  const I = V.tmVIndeksit(seurat);
  const kok = { seura_a: { toimenpiteet: [{ _id: DOCID, joukkue: VIERAS, teksti: NIMI + ' ' + EMAIL, tila: 'ehdotus' }, { _id: 'k', joukkue: 'Kadonnut ' + JOUKKUE }], pelaajat: seurat[0].pelaajat, seuranta_kuittaukset: [{ _id: 'q', valmentajaUid: UID, valmentaja_uid: 'muu' + UID }], havainnot: [{ _id: 'h', seuraId: 'seura_b', narratiivi: NIMI }], kayttajat: [{ _id: UID, seuraId: 'seura_b', email: EMAIL }] } };
  const tulokset = V.tmVTarkistaSeura({ sid: 'seura_a', joukkueet: seurat[0].joukkueet, kokoelmat: kok.seura_a, kayttajat: new Set([UID]), indeksit: I })
    .concat(V.tmVTarkistaGlobaali(I, [{ toiminto: 'kayttaja_rooli_estetty', aikaleimaMs: 1000, seuraId: 'seura_a', uid: UID, email: EMAIL }], 2000));
  const raportti = R.tmVRaportti({ tulokset, ajettu: '2026-11-10T04:30:00.000Z', tyyppi: 'viikko', edellinen: edellinen });
  return { tulokset, raportti };
}

describe('PII-vartija: koko ketju', () => {
  const { tulokset, raportti } = ketju([]);
  it('aineisto laukaisee oikeasti tarkistuksia (testi ei ole vacuous)', () => {
    expect(raportti.rivit.some((r) => r.taso === 'virhe')).toBe(true);
    ['E1a', 'E1b', 'E2', 'E3', 'E6'].forEach((k) => expect(raportti.rivit.some((r) => r.koodi === k && r.lkm > 0), k).toBe(true));
  });
  it('tarkistusten raakatulokset eivät sisällä mitään kiellettyä', () => { expect(R.tmVOnkoPii(tulokset, KIELLETYT)).toEqual({ ok: true, rikkomukset: [] }); });
  it('raportti, audit-rivi ja sähköposti (tiivistelmä + viikkoyhteenveto) eivät sisällä mitään kiellettyä', () => {
    const audit = R.tmVAuditRivi(raportti), posti = R.tmVSahkoposti(raportti, {}), viikko = R.tmVSahkoposti(raportti, { kaikki: true });
    expect(posti).not.toBe(null);
    [raportti, audit, posti, viikko, R.tmVRiviTeksti(raportti.rivit[0])].forEach((o) => expect(R.tmVOnkoPii(o, KIELLETYT)).toEqual({ ok: true, rikkomukset: [] }));
    expect(audit.toiminto).toBe('valvonta_ajo'); expect(audit.severity).toBe('alert');
  });
  it('audit-rivin ja sähköpostin avaimet/arvot rajoittuvat sallittuun: seura-id, koodi, kokoelma, luku, taso', () => {
    const audit = R.tmVAuditRivi(raportti);
    audit.rivit.forEach((r) => { expect(Object.keys(r).sort()).toEqual(['c', 'e', 'k', 'n', 's', 't']); expect(r.s).toMatch(/^[a-z0-9_-]{1,40}$/); expect(r.k).toMatch(/^[EFHKM]\d[a-c]?$/); expect(typeof r.n).toBe('number'); expect(typeof r.e).toBe('number'); });
    expect(Object.keys(audit).sort()).toEqual(['ajettu', 'ei_ehtinyt', 'hylatty', 'rivit', 'severity', 'toiminto', 'tyyppi', 'varoituksia', 'virheita']);
    const rivi = R.tmVRiviTeksti({ taso: 'virhe', koodi: 'E1a', seura: 'sibbovargarna', kokoelma: 'toimenpiteet', lkm: 12, edellinen: 0 });
    expect(rivi).toBe('ERROR E1a · sibbovargarna · toimenpiteet · 12 (edellinen 0)');
  });
  it('vain virheistä: ilman uutta/kasvanutta virhettä päivittäinen sähköposti ei lähde (dedup); viikkoyhteenveto kertoo "edelleen auki"', () => {
    const toinen = ketju(raportti.rivit);   // edellinen = sama tilanne
    expect(R.tmVSahkoposti(toinen.raportti, {})).toBe(null);
    const viikko = R.tmVSahkoposti(toinen.raportti, { kaikki: true });
    expect(viikko.html).toContain('Edelleen auki'); expect(viikko.html).not.toContain('Uudet tai kasvaneet');
    const kasvanut = raportti.rivit.map((r) => (r.koodi === 'E1a' ? Object.assign({}, r, { lkm: Math.max(0, r.lkm - 1) }) : r));
    expect(R.tmVSahkoposti(ketju(kasvanut).raportti, {}).html).toContain('Uudet tai kasvaneet');
  });
  it('ei virheitä → ei sähköpostia; info-ajo → audit severity info', () => {
    const ok = R.tmVRaportti({ tulokset: [{ seura: 'a', koodi: 'E1a', kokoelma: 'toimenpiteet', lkm: 0, taso: 'ok' }], ajettu: 'x', tyyppi: 'paivittain' });
    expect(R.tmVSahkoposti(ok, {})).toBe(null); expect(R.tmVSahkoposti(ok, { kaikki: true })).toBe(null); expect(R.tmVAuditRivi(ok).severity).toBe('info'); expect(R.tmVAuditRivi(ok).rivit).toEqual([]);
  });
});

describe('PII-vartija: virheet ja huonosti muodostetut rivit', () => {
  it('Firestore-virhe: vain koodi päätyy lokiin, ei message (jossa on dokumentin polku)', () => {
    const e = Object.assign(new Error('7 PERMISSION_DENIED: seurat/seura_a/pelaajat/' + PID + ' ' + NIMI), { code: 'permission-denied' });
    expect(R.tmVTurvallinenVirhe(e)).toEqual({ koodi: 'permission-denied' });
    const viesti = R.tmVLokiVirhe('seura_a', e);
    expect(viesti).toBe('valvonta-virhe seura=seura_a koodi=permission-denied');
    expect(R.tmVOnkoPii(viesti, KIELLETYT).ok).toBe(true);
    expect(R.tmVTurvallinenVirhe(new Error('pelkkä viesti ' + NIMI))).toEqual({ koodi: 'tuntematon' });
    expect(R.tmVTurvallinenVirhe({ code: 'x/' + NIMI + '<script>' }).koodi).not.toMatch(/\s|<|ä/);
    expect(R.tmVLokiVirhe('Matti Meikäläinen', e)).toContain('seura=?');
  });
  it('rivi, jonka seura/koodi/kokoelma ei ole sallittua muotoa (esim. nimi tai uid niissä), pudotetaan eikä päädy raporttiin', () => {
    const huonot = [{ seura: NIMI, koodi: 'E1a', kokoelma: 'pelaajat', lkm: 1, taso: 'virhe' }, { seura: 'a', koodi: 'E1a', kokoelma: UID, lkm: 1, taso: 'virhe' }, { seura: 'a', koodi: EMAIL, kokoelma: 'pelaajat', lkm: 1, taso: 'virhe' },
      { seura: 'a', koodi: 'E1a', kokoelma: 'pelaajat', lkm: '12 ' + NIMI, taso: 'virhe' }, { seura: 'a', koodi: 'E1a', kokoelma: 'pelaajat', lkm: 1, taso: 'kriittinen' }, null];
    const r = R.tmVRaportti({ tulokset: huonot.concat([{ seura: 'a', koodi: 'E1a', kokoelma: 'pelaajat', lkm: 2, taso: 'virhe' }]), ajettu: 'x', tyyppi: 'viikko', eiEhtinyt: [NIMI, 'seura_c'] });
    expect(r.rivit.length).toBe(1); expect(r.yhteenveto.hylatty).toBe(6); expect(r.eiEhtinyt).toEqual(['seura_c']);
    expect(R.tmVOnkoPii([r, R.tmVAuditRivi(r), R.tmVSahkoposti(r, { kaikki: true })], KIELLETYT).ok).toBe(true);
  });
  it('ohitetut seurat (P10) putoavat raportista', () => {
    const t = V.OHITETUT_SEURAT.map((s) => ({ seura: s, koodi: 'E1a', kokoelma: 'toimenpiteet', lkm: 50, taso: 'virhe' })).concat([{ seura: 'kpv', koodi: 'E1a', kokoelma: 'toimenpiteet', lkm: 1, taso: 'virhe' }]);
    expect(R.tmVRaportti({ tulokset: t, ajettu: 'x', tyyppi: 'paivittain', ohitetut: V.OHITETUT_SEURAT }).rivit.map((r) => r.seura)).toEqual(['kpv']);
  });
  it('HTML escapataan sähköpostissa', () => {
    const r = R.tmVRaportti({ tulokset: [{ seura: 'a', koodi: 'E1a', kokoelma: 'pelaajat', lkm: 1, taso: 'virhe' }], ajettu: '<b>x</b>', tyyppi: 'viikko' });
    expect(R.tmVSahkoposti(r, {}).html).toContain('&lt;b&gt;'); expect(R.tmVSahkoposti(r, {}).html).not.toContain('<b>x');
  });
});

describe('PII-vartija toimii itse (positiivinen kontrolli)', () => {
  it('tunnistaa kielletyn arvon (isot/pienet kirjaimet), sähköpostin ja ei kerro löydettyä arvoa', () => {
    expect(R.tmVOnkoPii('ERROR E1a · ' + NIMI.toUpperCase(), KIELLETYT).ok).toBe(false);
    expect(R.tmVOnkoPii({ a: { b: UID } }, KIELLETYT).ok).toBe(false);
    expect(R.tmVOnkoPii('yhteys: joku@jossain.com', []).rikkomukset).toEqual([{ tyyppi: 'sahkoposti' }]);
    expect(JSON.stringify(R.tmVOnkoPii('xx ' + UID, KIELLETYT))).not.toContain(UID);
    expect(R.tmVOnkoPii('puhdas teksti E1a 12', KIELLETYT).ok).toBe(true);
  });
  it('MUTAATIO: jos hälytysrivi vuotaa nimen (esim. kokoelma-kenttään), vartija huomaa — raportti-suodatin pudottaa sen jo ennen', () => {
    const vuoto = { toiminto: 'valvonta_ajo', rivit: [{ s: 'a', k: 'E1a', c: 'pelaajat', n: 1, e: 0, t: 'virhe', extra: NIMI }] };
    expect(R.tmVOnkoPii(vuoto, KIELLETYT).ok).toBe(false);
  });
});
