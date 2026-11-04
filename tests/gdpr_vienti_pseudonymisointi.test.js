/**
 * #1178 / PM 4.11.2026 (art. 15(4)): GDPR-viennissä henkilökunnan tekijätunnisteet (uid) korvataan roolilla
 * KAIKISSA osioissa. Sisältö (vp_muistiinpanot, kenttätarkkailut) säilyy (art. 15). Pelaajan oma tunniste säilyy.
 */
import { describe, it, expect } from 'vitest';
import { readFileSync } from 'fs';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';
const { pseudonymisoiHenkilokunta, lueHenkilokunnanRoolit, TUNTEMATON_ROOLI, ALIKOKOELMAT } = require('../functions/gdpr_locator.js');

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..');
const INDEX = readFileSync(join(ROOT, 'functions/index.js'), 'utf8');

const VALM = 'VALMENTAJA_uid_0123456789abcdef';
const VP = 'VP_uid_0123456789abcdefghij';
const FYSIO = 'FYSIO_uid_0123456789abcdefgh';
const ENTINEN = 'ENTINEN_uid_0123456789abcdef';   // poistettu valmentaja: ei roolilähteissä
const PELAAJA = 'PELAAJA_uid_0123456789abcdef';
const roolit = new Map([[VALM, 'valmentaja'], [VP, 'vp'], [FYSIO, 'fysioterapeutti']]);

function kaikkiMerkkijonot(x, out = []) {
  if (Array.isArray(x)) x.forEach((v) => kaikkiMerkkijonot(v, out));
  else if (x && typeof x === 'object') Object.keys(x).forEach((k) => { out.push(k); kaikkiMerkkijonot(x[k], out); });
  else if (typeof x === 'string') out.push(x);
  return out;
}

/* Vienti, jossa henkilökunnan uid jokaisessa alikokoelmassa eri muodoissa. */
function esimerkkiVienti() {
  const v = {
    _meta: { pelaajaId: PELAAJA, viejaUid: VP },
    pelaaja: { _id: PELAAJA, etunimi: 'T', vastuuhenkilo: { uid: VALM }, luoja_uid: VP },
  };
  ALIKOKOELMAT.forEach((n) => { v[n] = [{ _id: 'x_' + VALM, tekija_uid: VALM, sisalto: 'teksti ' + n }]; });
  v.kenttatarkkailut = [{ _id: '2026-11-01_' + ENTINEN, valmentajaUid: ENTINEN, havainto: 'hyvä prässi' }];
  v.vp_muistiinpanot = [{ _id: 'm1', laatija_uid: VP, teksti: 'muistiinpano', naytaPelaajalle: false, osallistujat_uid: [VALM, FYSIO] }];
  v.kooste = [{ _id: 'k', kuittaukset: { [VALM]: true }, tekija: VALM }];
  v.kirjaukset = [{ _id: '2026-11-01', lahde: 'pelaaja', tekija_uid: PELAAJA }];
  v.palloID_viitteet = [{ _id: 'P1', polku: 'seurat/s/valmentajat/' + VALM + '/kontribuutio/P1' }];
  return v;
}

describe('GDPR-vienti: henkilökunnan uid → rooli (art. 15(4))', () => {
  it('yhtään henkilökunnan uid:tä (nykyinen tai entinen) ei jää mihinkään vientiosioon — ei arvoihin, avaimiin eikä doc-id:ihin', () => {
    const out = pseudonymisoiHenkilokunta(esimerkkiVienti(), { roolit, suojatut: [PELAAJA] });
    const kaikki = kaikkiMerkkijonot(out).join('\n');
    [VALM, VP, FYSIO, ENTINEN].forEach((u) => expect(kaikki, u).not.toContain(u));
  });
  it('rooli tulee tilalle; tuntematon uid-kenttä → muu_kayttaja; sisältö säilyy', () => {
    const out = pseudonymisoiHenkilokunta(esimerkkiVienti(), { roolit, suojatut: [PELAAJA] });
    ALIKOKOELMAT.filter((n) => !['kenttatarkkailut', 'vp_muistiinpanot', 'kooste', 'kirjaukset'].includes(n)).forEach((n) => {
      expect(out[n][0].tekija_uid, n).toBe('valmentaja');
      expect(out[n][0]._id, n).toBe('x_valmentaja');
      expect(out[n][0].sisalto, n).toBe('teksti ' + n);
    });
    expect(out.vp_muistiinpanot[0]).toEqual({ _id: 'm1', laatija_uid: 'vp', teksti: 'muistiinpano', naytaPelaajalle: false, osallistujat_uid: ['valmentaja', 'fysioterapeutti'] });
    expect(out.kenttatarkkailut[0]).toEqual({ _id: '2026-11-01_' + TUNTEMATON_ROOLI, valmentajaUid: TUNTEMATON_ROOLI, havainto: 'hyvä prässi' });
    expect(out.kooste[0]).toEqual({ _id: 'k', kuittaukset: { valmentaja: true }, tekija: 'valmentaja' });
    expect(out.pelaaja.vastuuhenkilo).toEqual({ uid: 'valmentaja' });
    expect(out._meta.viejaUid).toBe('vp');
    expect(out.palloID_viitteet[0].polku).toBe('seurat/s/valmentajat/valmentaja/kontribuutio/P1');
  });
  it('pelaajan oma tunniste säilyy (myös uid-nimisessä kentässä)', () => {
    const out = pseudonymisoiHenkilokunta(esimerkkiVienti(), { roolit, suojatut: [PELAAJA] });
    expect(out._meta.pelaajaId).toBe(PELAAJA);
    expect(out.pelaaja._id).toBe(PELAAJA);
    expect(out.kirjaukset[0].tekija_uid).toBe(PELAAJA);
  });
  it('ei muuta alkuperäistä eikä Timestamp-tyyppisiä arvoja; avaintörmäys ei ylikirjoita', () => {
    class Ts { constructor(s) { this._seconds = s; } }
    const ts = new Ts(1);
    const sisaan = { a: [{ luotu: ts, kuittaukset: { [VALM]: 1, valmentaja: 2 } }] };
    const kopio = JSON.parse(JSON.stringify(sisaan));
    const out = pseudonymisoiHenkilokunta(sisaan, { roolit });
    expect(out.a[0].luotu).toBe(ts);
    expect(out.a[0].kuittaukset).toEqual({ valmentaja: 2, valmentaja_2: 1 });
    expect(JSON.parse(JSON.stringify(sisaan))).toEqual(kopio);
  });
  it('lueHenkilokunnanRoolit: kayttajat.rooli, vp_uid, valmentajat, admins (SA voittaa)', async () => {
    const col = (docs) => ({ get: async () => ({ docs: docs.map(([id, d]) => ({ id, data: () => d })) }) });
    const seura = { get: async () => ({ exists: true, data: () => ({ vp_uid: VP }) }),
      collection: (n) => ({ kayttajat: col([[FYSIO, { rooli: 'fysioterapeutti' }], [VP, { rooli: 'utj' }], ['ILMAN_ROOLIA_uid_000', {}]]),
        valmentajat: col([[VALM, {}], [FYSIO, {}]]) }[n]) };
    const db = { collection: (n) => (n === 'seurat' ? { doc: () => seura } : col([['SA_uid_0000000000', {}]])) };
    const r = await lueHenkilokunnanRoolit(db, 's');
    expect(Object.fromEntries(r)).toEqual({ [FYSIO]: 'fysioterapeutti', [VP]: 'vp', ILMAN_ROOLIA_uid_000: 'henkilokunta', [VALM]: 'valmentaja', SA_uid_0000000000: 'superadmin' });
  });
  it('viePelaajanDataGDPR pseudonymisoi koko viennin ennen tallennusta (pelaajaId suojattuna)', () => {
    const f = INDEX.slice(INDEX.indexOf('exports.viePelaajanDataGDPR'), INDEX.indexOf('// ═', INDEX.indexOf('exports.viePelaajanDataGDPR')));
    expect(f).toMatch(/const vienti = pseudonymisoiHenkilokunta\(vientiRaaka, \{ roolit, suojatut: \[pelaajaId\] \}\);/);
    expect(f.indexOf('pseudonymisoiHenkilokunta(')).toBeLessThan(f.indexOf('file.save(JSON.stringify(vienti'));
    expect(f).not.toMatch(/JSON\.stringify\(vientiRaaka/);
  });
});
