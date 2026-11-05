/* QG-3 · scripts/savutesti_seura_luo.js (.briefit/QG3_SAVUTESTI_VAIHE0.md S1): synteettinen tuotantoseura qg_savu.
   Vartijat: (1) data on synteettistä (vain qg_savu-polut, @example.test, fixturen nimet, ei PIN:iä/PalloID:tä oikealle henkilölle),
   (2) päivämäärät siirtyvät kokonaisina viikkoina eivätkä mene tulevaisuuteen, (3) aja() ei kirjoita mitään kuiva-ajossa eikä vartijan lauettua,
   (4) kirjoitus koskee vain sallittuja polkuja, PIN tallentuu vain hajautuksena ja salaisuudet eivät tulostu. */
import { describe, it, expect } from 'vitest';
import { createRequire } from 'module';
import { readFileSync } from 'fs';
import { dokitLage, NYT } from '../tools/i18n/sv_fixtuuri.mjs';
const require = createRequire(import.meta.url);
const S = require('../scripts/savutesti_seura_luo.js');
const K = require('../functions/pelaajakirjautuminen.js');

const PV = 86400000;
const NYT_TESTI = Date.parse('2026-11-09T10:00:00+02:00');   // ma: siirto 3 vk → fixturen "nyt" ke 4.11.
const suunnitelma = (o) => S.suunnittele(dokitLage(), Object.assign({ fxNyt: NYT, nyt: NYT_TESTI, tunniste: 'qgsavu01' }, o));
const SALAISET = { email: 'savutesti@example.test', salasana: 'Salasana-joka-on-pitka-123', tunniste: 'QGSAVU01', pin: '583920' };

describe('suunnittele: synteettinen data', () => {
  const p = suunnitelma();
  it('ei virheitä ja synteettisyysvartija hyväksyy', () => { expect(p.virheet).toEqual([]); expect(S.tarkistaSynteettisyys(p.dokit)).toEqual([]); expect(p.dokit.length).toBeGreaterThan(40); });
  it('kaikki polut seurat/qg_savu -puussa; ei qgfx-jäänteitä', () => {
    for (const { polku, data } of p.dokit) { expect(polku === 'seurat/qg_savu' || polku.startsWith('seurat/qg_savu/'), polku).toBe(true); expect(JSON.stringify(data) + polku).not.toMatch(/qgfx/); }
  });
  it('ei liput-dokkeja eikä fixturen VP-dokkia (lippu Administa, VP = oikea Auth-käyttäjä)', () => {
    expect(p.dokit.filter((d) => /\/liput\/|kayttajat\/fxvp/.test(d.polku))).toEqual([]);
    expect(p.dokit.find((d) => d.polku === 'seurat/qg_savu').data.liput).toBeUndefined();
  });
  it('seura ja joukkueet demo:true (laskutus + Adminin yhteenvedot ohittavat), seura merkitty savutesti:true', () => {
    expect(p.dokit.find((d) => d.polku === 'seurat/qg_savu').data).toMatchObject({ demo: true, savutesti: true, kieli: 'sv' });
    const j = p.dokit.filter((d) => /^seurat\/qg_savu\/joukkueet\/[^/]+$/.test(d.polku));
    expect(j.length).toBe(7); j.forEach((d) => expect(d.data.demo, d.polku).toBe(true));
  });
  it('vain kirjautuva pelaaja qp1 saa tunnisteen (normalisoitu kuten pelaajaKirjaudu)', () => {
    const t = p.dokit.filter((d) => d.data && d.data.tunniste);
    expect(t.map((d) => d.polku)).toEqual(['seurat/qg_savu/pelaajat/qp1']); expect(t[0].data.tunniste).toBe('QGSAVU01');
  });
  it('virheellinen tunniste → virhe, ei suunnitelmaa kirjoitettavaksi', () => {
    expect(suunnitelma({ tunniste: '' }).virheet.join()).toMatch(/TUNNISTE/); expect(suunnitelma({ tunniste: 'ä' }).virheet.length).toBe(1);
  });
});

describe('synteettisyysvartija laukeaa', () => {
  const ok = { polku: 'seurat/qg_savu/pelaajat/x', data: { etunimi: 'Alex', sukunimi: 'Berg', huoltajaEmail: 'g@example.test' } };
  const v = (d) => S.tarkistaSynteettisyys([d]);
  it('hyväksyy synteettisen', () => expect(v(ok)).toEqual([]));
  it('oikea sähköposti', () => expect(v({ polku: ok.polku, data: { huoltajaEmail: 'someone@gmail.com' } }).join()).toMatch(/example\.test/));
  it('sähköposti tekstin sisällä', () => expect(v({ polku: ok.polku, data: { viesti: 'ota yhteys a.b@seura.fi' } }).length).toBe(1));
  it('nimi listan ulkopuolelta (esim. KPV:n testipelaaja)', () => expect(v({ polku: ok.polku, data: { etunimi: 'Topias', sukunimi: 'Berg' } }).join()).toMatch(/nimi/));
  it('polku toiseen seuraan / admins / juuren kokoelma', () => {
    expect(v({ polku: 'seurat/kpv/pelaajat/x', data: {} }).length).toBe(1);
    expect(v({ polku: 'seurat/qg_savu_x/pelaajat/x', data: {} }).length).toBe(1);
    expect(v({ polku: 'admins/x', data: {} }).length).toBe(2);
  });
  it('pin, palloID ja vieras seuraId', () => {
    expect(v({ polku: ok.polku, data: { pin: '1234' } }).length).toBe(1);
    expect(v({ polku: ok.polku, data: { palloID: '12345678' } }).length).toBe(1);
    expect(v({ polku: ok.polku, data: { seuraId: 'kpv' } }).length).toBe(1);
  });
});

describe('päivämäärien siirto', () => {
  it('kokonaiset viikot, alaspäin; ei koskaan negatiivinen', () => {
    expect(S.viikkosiirto(NYT, NYT_TESTI)).toBe(21 * PV);
    expect(S.viikkosiirto(NYT, NYT + 6 * PV)).toBe(0);
    expect(S.viikkosiirto(NYT, NYT - 30 * PV)).toBe(0);
  });
  it('jakso käynnissä: alkoi maanantaina ≤ 14 pv sitten; viikonpäivät säilyvät', () => {
    for (const nyt of [NYT_TESTI, Date.parse('2027-01-14T08:00:00Z'), Date.parse('2027-03-03T20:00:00Z')]) {
      const q = suunnitelma({ nyt }).dokit.find((d) => d.polku === 'seurat/qg_savu/pelaajat/qp1').data;
      const alkoi = Date.parse(q.jaksofokus.alkoi);
      expect(new Date(alkoi).getUTCDay()).toBe(1); expect(alkoi).toBeLessThanOrEqual(nyt); expect(nyt - alkoi).toBeLessThan(14 * PV);
    }
  });
  it('kirjaukset ja aikaleimat eivät mene tulevaisuuteen; syntymäaika ei siirry', () => {
    const p = suunnitelma();
    const kirj = p.dokit.filter((d) => /\/kirjaukset\//.test(d.polku));
    expect(kirj.length).toBeGreaterThan(0); kirj.forEach((d) => expect(Date.parse(d.polku.split('/').pop())).toBeLessThanOrEqual(NYT_TESTI));
    const tsit = []; const kerää = (x) => { if (x && typeof x === 'object') { if (typeof x.__ts === 'string') tsit.push(Date.parse(x.__ts)); else Object.values(x).forEach(kerää); } };
    p.dokit.forEach((d) => kerää(d.data)); tsit.forEach((t) => expect(t).toBeLessThanOrEqual(NYT_TESTI));
    const lahde = dokitLage(), avain = Object.keys(lahde).find((k) => lahde[k].syntymaaika);
    const kohde = p.dokit.find((d) => d.polku === avain.replace('qgfx', 'qg_savu').replace(/qgfx_/g, 'qg_savu_'));
    expect(kohde.data.syntymaaika).toEqual(lahde[avain].syntymaaika);
  });
  it('kooste-viikkoavaimet siirtyvät yhtä monta viikkoa ja vastaavat dokin vk-kenttää', () => {
    const k = suunnitelma().dokit.filter((d) => /\/kooste\//.test(d.polku));
    expect(k.map((d) => d.polku.split('/').pop())).toEqual(['2026-W42', '2026-W43', '2026-W44', '2026-W45']);
    k.forEach((d) => expect(d.data.vk).toBe(d.polku.split('/').pop()));
  });
  it('ISO-viikko vuodenvaihteessa (53-viikkoinen vuosi)', () => {
    expect(S.siirraVk('2026-W52', 7 * PV)).toBe('2026-W53'); expect(S.siirraVk('2026-W53', 7 * PV)).toBe('2027-W01'); expect(S.siirraVk('2020-W53', 0)).toBe('2020-W53');
    expect(S.siirraPvm('2026-10-14', 7 * PV)).toBe('2026-10-21'); expect(S.siirraPvm('2026-10-12T08:00:00.000Z', PV)).toBe('2026-10-13T08:00:00.000Z');
  });
  it('idp_kausi = siirretyn hetken vuosi', () => {
    expect(suunnitelma({ nyt: Date.parse('2027-02-10T10:00:00Z') }).dokit.some((d) => d.polku === 'seurat/qg_savu/pelaajat/qp1/idp_kausi/2027')).toBe(true);
  });
});

/* ── aja(): valetietokanta ja -Auth ── */
function vale({ seura, tunnisteet = [], kayttaja = null, admins = [] } = {}) {
  const loki = { set: [], delete: [], recursiveDelete: [], auth: [] };
  const olemassa = new Map(); if (seura) olemassa.set('seurat/qg_savu', seura); admins.forEach((u) => olemassa.set('admins/' + u, {}));
  const ref = (path) => ({ path, get: async () => ({ exists: olemassa.has(path), data: () => olemassa.get(path) }), collection: (c) => col(path + '/' + c) });
  const col = (path) => ({ doc: (id) => ref(path + '/' + id) });
  const db = {
    collection: (c) => col(c), doc: (p) => ref(p),
    collectionGroup: () => ({ where: () => ({ limit: () => ({ get: async () => ({ docs: tunnisteet.map((p) => ({ ref: { path: p } })) }) }) }) }),
    batch: () => { const ops = []; return { set: (r, d) => ops.push(['set', r.path, d]), delete: (r) => ops.push(['delete', r.path]), commit: async () => ops.forEach((o) => loki[o[0]].push(o.slice(1))) }; },
    recursiveDelete: async (r) => loki.recursiveDelete.push(r.path),
  };
  const auth = {
    getUserByEmail: async () => { if (!kayttaja) { const e = new Error('nf'); e.code = 'auth/user-not-found'; throw e; } return kayttaja; },
    createUser: async (u) => { loki.auth.push(['createUser', u.email]); return { uid: 'savu-uid' }; },
    updateUser: async (uid) => loki.auth.push(['updateUser', uid]),
    setCustomUserClaims: async (uid, c) => loki.auth.push(['claims', uid, c]),
  };
  const admin = { firestore: { Timestamp: { fromMillis: (ms) => ({ ms }) }, FieldValue: { serverTimestamp: () => 'TS' } } };
  // kayttajat-doc kirjoitetaan suoraan ref.set:llä
  const alkupRef = ref; db.collection = (c) => ({ doc: (id) => { const r = alkupRef(c + '/' + id); r.collection = (cc) => ({ doc: (i2) => Object.assign(alkupRef(c + '/' + id + '/' + cc + '/' + i2), { set: async (d) => loki.set.push([c + '/' + id + '/' + cc + '/' + i2, d]) }) }); return r; } });
  return { db, auth, admin, loki };
}
const ajaVale = async (v, o) => {
  const rivit = [];
  const tulos = await S.aja(Object.assign({ admin: v.admin, db: v.db, auth: v.auth, dokit: dokitLage(), fxNyt: NYT, nyt: NYT_TESTI, salaiset: SALAISET, kirjoita: true, kylla: true, kysy: async () => 'KIRJOITA', loki: (x) => rivit.push(x) }, o));
  return { tulos, rivit };
};

describe('aja(): vartijat ennen kirjoitusta', () => {
  it('kuiva-ajo ei kirjoita mitään', async () => {
    const v = vale(); const { tulos } = await ajaVale(v, { kirjoita: false });
    expect(tulos.kirjoitettu).toBe(false); expect(v.loki).toEqual({ set: [], delete: [], recursiveDelete: [], auth: [] });
  });
  it('ilman KIRJOITA-vahvistusta ei kirjoiteta', async () => {
    const v = vale(); const { tulos } = await ajaVale(v, { kylla: false, kysy: async () => 'joo' });
    expect(tulos.kirjoitettu).toBe(false); expect(v.loki.set).toEqual([]);
  });
  it('olemassa oleva seurat/qg_savu ilman savutesti-merkkiä → keskeytys', async () => {
    const v = vale({ seura: { nimi: 'Joku' } }); await expect(ajaVale(v)).rejects.toThrow(/savutesti-merkkiä/); expect(v.loki.recursiveDelete).toEqual([]);
  });
  it('PalloID toisella pelaajalla → keskeytys', async () => {
    const v = vale({ tunnisteet: ['seurat/kpv/pelaajat/abc'] }); await expect(ajaVale(v)).rejects.toThrow(/PalloID/); expect(v.loki.set).toEqual([]);
  });
  it('sähköposti kuuluu muun seuran käyttäjälle tai SA:lle → keskeytys', async () => {
    await expect(ajaVale(vale({ kayttaja: { uid: 'u1', customClaims: { seuraId: 'kpv', rooli: 'vp' } } }))).rejects.toThrow(/muu seura/);
    await expect(ajaVale(vale({ kayttaja: { uid: 'u1', customClaims: { seuraId: 'qg_savu', rooli: 'valmentaja' } } }))).rejects.toThrow(/muu seura/);
    await expect(ajaVale(vale({ kayttaja: { uid: 'u2', customClaims: {} }, admins: ['u2'] }))).rejects.toThrow(/SA/);
  });
  it('heikko salasana, väärä PIN tai sähköposti → keskeytys ennen lukuja', async () => {
    for (const s of [{ salasana: 'lyhyt' }, { pin: '1234' }, { pin: '12a456' }, { email: 'ei-osoite' }]) {
      const v = vale(); await expect(ajaVale(v, { salaiset: Object.assign({}, SALAISET, s) })).rejects.toThrow(/hylätty/); expect(v.loki.set).toEqual([]);
    }
  });
});

describe('aja(): kirjoitus', () => {
  it('poistaa vain seurat/qg_savu -puun ja kirjoittaa vain sallittuihin polkuihin', async () => {
    const v = vale({ seura: { savutesti: true } }); const { tulos } = await ajaVale(v);
    expect(tulos.kirjoitettu).toBe(true); expect(v.loki.recursiveDelete).toEqual(['seurat/qg_savu']);
    for (const [p] of v.loki.set) expect(p === 'seurat/qg_savu' || p.startsWith('seurat/qg_savu/') || p === '_pelaajaPin/qg_savu_qp1', p).toBe(true);
    for (const [p] of v.loki.delete) expect(p).toMatch(/^_kirjautumisyritykset\//);
    expect(v.loki.delete.length).toBe(3);
  });
  it('PIN vain hajautuksena (tarkistuu palvelimen tarkistaPin:llä); ei selväkielistä pin-kenttää missään', async () => {
    const v = vale(); await ajaVale(v);
    const pin = v.loki.set.find(([p]) => p === '_pelaajaPin/qg_savu_qp1')[1];
    expect(K.tarkistaPin(SALAISET.pin, pin.hash)).toBe(true); expect(K.tarkistaPin('000001', pin.hash)).toBe(false);
    expect(JSON.stringify(v.loki.set)).not.toContain(SALAISET.pin);
  });
  it('Auth: uusi käyttäjä + claims { seuraId: qg_savu, rooli: vp } + kayttajat-doc ilman sähköposti-ilmoituksia', async () => {
    const v = vale(); await ajaVale(v);
    expect(v.loki.auth).toEqual([['createUser', SALAISET.email], ['claims', 'savu-uid', { seuraId: 'qg_savu', rooli: 'vp' }]]);
    const k = v.loki.set.find(([p]) => p === 'seurat/qg_savu/kayttajat/savu-uid')[1];
    expect(k).toMatchObject({ rooli: 'vp', seuraId: 'qg_savu', aktiivinen: true, notif_asetukset: { email: { enabled: false } } });
  });
  it('olemassa oleva savutestikäyttäjä päivitetään (salasana sama kuin secretissä)', async () => {
    const v = vale({ kayttaja: { uid: 'vanha', customClaims: { seuraId: 'qg_savu', rooli: 'vp' } } }); await ajaVale(v);
    expect(v.loki.auth.map((x) => x[0])).toEqual(['updateUser', 'claims']);
  });
  it('aikaleimat kirjoitetaan Timestampeina (ei { __ts } -merkkejä Firestoreen)', async () => {
    const v = vale(); await ajaVale(v); expect(JSON.stringify(v.loki.set)).not.toContain('__ts');
  });
  it('salaisuudet eivät tulostu lokiin', async () => {
    const v = vale(); const { rivit } = await ajaVale(v); const ulos = rivit.join('\n');
    expect(ulos).not.toContain(SALAISET.salasana); expect(ulos).not.toContain(SALAISET.pin); expect(ulos).not.toContain(SALAISET.tunniste); expect(ulos).not.toContain(SALAISET.email);
  });
});

describe('lähdekoodi', () => {
  const s = readFileSync(new URL('../scripts/savutesti_seura_luo.js', import.meta.url), 'utf8');
  it('ADC, ei palvelutiliavainta; admin vasta main():ssa', () => {
    expect(s).toContain('admin.credential.applicationDefault()'); expect(s).not.toMatch(/serviceAccount|\.json['"]\s*\)/);
    expect(s.indexOf("require('firebase-admin')")).toBeGreaterThan(s.indexOf('async function main'));
  });
  it('ei kirjoita liput-dokkia eikä admins-kokoelmaan', () => { expect(s).not.toMatch(/collection\('admins'\)\.doc\([^)]*\)\.set|liput\/julkiset'\)\.set/); });
});
