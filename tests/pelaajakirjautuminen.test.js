/**
 * Vaihe 0 / PR 1 — pelaajaKirjaudu (functions/pelaajakirjautuminen.js).
 * Puhtaat osat suoraan; käsittelijä AJETAAN tynkä-Firestorella (collectionGroup, get/set/delete)
 * ja tynkä-authilla (createCustomToken tallentaa uid + claimit).
 */
import { describe, it, expect } from 'vitest';
import { createRequire } from 'module';
const require = createRequire(import.meta.url);
const K = require('../functions/pelaajakirjautuminen.js');

class HttpsError extends Error { constructor(code, msg) { super(msg); this.code = code; } }

function tynka(pelaajat, pinHashit) {
  const kokoelmat = { _kirjautumisyritykset: new Map(), _pelaajaPin: new Map(pinHashit || []) };
  const docRef = (kok, id) => ({
    get: async () => ({ exists: kokoelmat[kok].has(id), data: () => kokoelmat[kok].get(id) }),
    set: async (d) => { kokoelmat[kok].set(id, d); },
    delete: async () => { kokoelmat[kok].delete(id); },
  });
  const db = {
    collection: (kok) => ({ doc: (id) => docRef(kok, id) }),
    collectionGroup: () => ({
      where: (kentta, _op, arvo) => ({
        limit: () => ({
          get: async () => ({
            docs: pelaajat.filter((p) => p.data[kentta] === arvo).map((p) => ({
              id: p.pelaajaId, data: () => p.data,
              ref: { parent: { parent: { id: p.seuraId, parent: { id: p.juuri || 'seurat' } } } },
            })),
          }),
        }),
      }),
    }),
  };
  const tokenit = [];
  const auth = { createCustomToken: async (uid, claims) => { tokenit.push({ uid, claims }); return 'TOKEN'; } };
  const audit = []; let nyt = 1_000_000;
  const f = K.luoKasittelija({ db, auth, HttpsError, audit: async (t, x) => audit.push([t, x]), nyt: () => nyt });
  return { f, tokenit, audit, kokoelmat, siirra: (ms) => { nyt += ms; } };
}
const TOPIAS = { seuraId: 'kpv', pelaajaId: 'm93', data: { tunniste: '12345678', pin: '9278' } };
const ctx = { rawRequest: { ip: '1.2.3.4' } };
const virhe = async (p) => { try { await p; return null; } catch (e) { return e; } };

describe('pelaajakirjautuminen · puhtaat osat', () => {
  it('tunnuksen normalisointi: välilyönnit ja väliviivat pois, tyhjä/outo → null', () => {
    expect(K.normalisoiTunnus(' 1234 5678 ')).toBe('12345678');
    expect(K.normalisoiTunnus('1234-5678')).toBe('12345678');
    expect(K.normalisoiTunnus('se12ab')).toBe('SE12AB');
    expect(K.normalisoiTunnus('')).toBeNull();
    expect(K.normalisoiTunnus('12;drop')).toBeNull();
    expect(K.normalisoiPin('9278')).toBe('9278');
    expect(K.normalisoiPin('92a8')).toBeNull();
    expect(K.normalisoiPin('123')).toBeNull();
  });
  it('lukitus: 5 väärää → lukittu 15 min, jonka jälkeen auki ja laskuri nollautuu', () => {
    let t = null; const nyt = 0;
    for (let i = 0; i < 4; i++) { t = K.kirjaaVirhe(t, nyt); expect(K.onLukittu(t, nyt)).toBe(false); }
    t = K.kirjaaVirhe(t, nyt);
    expect(K.onLukittu(t, nyt)).toBe(true);
    expect(K.onLukittu(t, nyt + K.LUKITUS_MS - 1)).toBe(true);
    expect(K.onLukittu(t, nyt + K.LUKITUS_MS)).toBe(false);
    const jalkeen = K.kirjaaVirhe(t, nyt + K.LUKITUS_MS);
    expect(jalkeen.virheet).toBe(1);
  });
  it('IP-katto: 30 väärää ikkunassa → estetty, ikkunan jälkeen nollautuu', () => {
    let t = null;
    for (let i = 0; i < K.IP_KATTO; i++) t = K.kirjaaIpVirhe(t, 0);
    expect(K.ipYlittyy(t, 1)).toBe(true);
    expect(K.ipYlittyy(t, 15 * 60 * 1000 + 1)).toBe(false);
  });
  it('scrypt-hajautus: oikea PIN täsmää, väärä ei; suola vaihtuu', () => {
    const h1 = K.hajautaPin('9278'), h2 = K.hajautaPin('9278');
    expect(h1).not.toBe(h2);
    expect(K.tarkistaPin('9278', h1)).toBe(true);
    expect(K.tarkistaPin('9279', h1)).toBe(false);
    expect(K.tarkistaPin('9278', 'roskaa')).toBe(false);
  });
  it('claim on pelaajaSeuraId — EI seuraId (onOmaSeura ei saa aueta pelaajalle)', () => {
    const c = K.pelaajaClaims('kpv', 'm93');
    expect(c).toEqual({ rooli: 'pelaaja', pelaajaSeuraId: 'kpv', pelaajaId: 'm93' });
    expect(Object.keys(c)).not.toContain('seuraId');
    expect(K.pelaajaUid('kpv', 'm93')).toBe('pel_kpv_m93');
  });
});

describe('pelaajakirjautuminen · käsittelijä (ajettu tyngällä)', () => {
  it('oikea PalloID + PIN → token oikeilla claimeilla; vanha PIN siirretään hajautukseksi', async () => {
    const t = tynka([TOPIAS]);
    const r = await t.f({ liittoTunnus: '1234 5678', pin: '9278' }, ctx);
    expect(r).toEqual({ token: 'TOKEN', seuraId: 'kpv', pelaajaId: 'm93' });
    expect(t.tokenit).toEqual([{ uid: 'pel_kpv_m93', claims: { rooli: 'pelaaja', pelaajaSeuraId: 'kpv', pelaajaId: 'm93' } }]);
    const h = t.kokoelmat._pelaajaPin.get('kpv_m93');
    expect(h.hash).toMatch(/^scrypt\$/);
    expect(K.tarkistaPin('9278', h.hash)).toBe(true);
  });

  it('hajautus olemassa → käytetään sitä (vanha pin-kenttä ei enää ratkaise)', async () => {
    const t = tynka([{ ...TOPIAS, data: { tunniste: '12345678', pin: '0000' } }], [['kpv_m93', { hash: K.hajautaPin('9278') }]]);
    await expect(t.f({ liittoTunnus: '12345678', pin: '9278' }, ctx)).resolves.toMatchObject({ pelaajaId: 'm93' });
    expect((await virhe(t.f({ liittoTunnus: '12345678', pin: '0000' }, ctx))).code).toBe('unauthenticated');
  });

  it('väärä PIN ja tuntematon tunnus → SAMA virhe (ei kerro kumpi osa oli väärin)', async () => {
    const t = tynka([TOPIAS]);
    const a = await virhe(t.f({ liittoTunnus: '12345678', pin: '1111' }, ctx));
    const b = await virhe(t.f({ liittoTunnus: '99999999', pin: '9278' }, ctx));
    expect([a.code, a.message]).toEqual(['unauthenticated', K.VIRHE_TUNNISTUS]);
    expect([b.code, b.message]).toEqual(['unauthenticated', K.VIRHE_TUNNISTUS]);
    expect(t.tokenit).toEqual([]);
  });

  it('5 väärää → lukittu: oikeakaan PIN ei kelpaa 15 min, audit-hälytys; sen jälkeen onnistuu', async () => {
    const t = tynka([TOPIAS]);
    for (let i = 0; i < 5; i++) await virhe(t.f({ liittoTunnus: '12345678', pin: '0000' }, ctx));
    expect(t.audit.map((x) => x[0])).toContain('pelaaja_kirjautuminen_lukittu');
    const e = await virhe(t.f({ liittoTunnus: '12345678', pin: '9278' }, ctx));
    expect([e.code, e.message]).toEqual(['resource-exhausted', K.VIRHE_LUKITTU]);
    t.siirra(K.LUKITUS_MS);
    await expect(t.f({ liittoTunnus: '12345678', pin: '9278' }, ctx)).resolves.toMatchObject({ pelaajaId: 'm93' });
  });

  it('lukitus on TUNNUSKOHTAINEN: toisen pelaajan kirjautuminen toimii', async () => {
    const t = tynka([TOPIAS, { seuraId: 'kpv', pelaajaId: 'p2', data: { tunniste: '22222222', pin: '1234' } }]);
    for (let i = 0; i < 5; i++) await virhe(t.f({ liittoTunnus: '12345678', pin: '0000' }, { rawRequest: { ip: '9.9.9.' + i } }));
    await expect(t.f({ liittoTunnus: '22222222', pin: '1234' }, ctx)).resolves.toMatchObject({ pelaajaId: 'p2' });
  });

  it('sama PalloID kahdessa seurassa: PIN ratkaisee; jos PIN täsmää molempiin → hylätään + audit', async () => {
    const A = { seuraId: 'kpv', pelaajaId: 'a', data: { tunniste: '55555555', pin: '1111' } };
    const B = { seuraId: 'sjk', pelaajaId: 'b', data: { tunniste: '55555555', pin: '2222' } };
    const t = tynka([A, B]);
    await expect(t.f({ liittoTunnus: '55555555', pin: '2222' }, ctx)).resolves.toMatchObject({ seuraId: 'sjk', pelaajaId: 'b' });
    const t2 = tynka([A, { ...B, data: { tunniste: '55555555', pin: '1111' } }]);
    expect((await virhe(t2.f({ liittoTunnus: '55555555', pin: '1111' }, ctx))).code).toBe('unauthenticated');
    expect(t2.audit.map((x) => x[0])).toContain('pelaaja_kirjautuminen_moniselitteinen');
  });

  it('Solo-`pelaajat` (ei seurat-alla) ohitetaan', async () => {
    const t = tynka([{ seuraId: 'x', pelaajaId: 'solo', juuri: 'players', data: { tunniste: '77777777', pin: '1234' } }]);
    expect((await virhe(t.f({ liittoTunnus: '77777777', pin: '1234' }, ctx))).code).toBe('unauthenticated');
  });

  it('pelaaja ilman PIN:iä ei kirjaudu', async () => {
    const t = tynka([{ seuraId: 'kpv', pelaajaId: 'x', data: { tunniste: '88888888' } }]);
    expect((await virhe(t.f({ liittoTunnus: '88888888', pin: '0000' }, ctx))).code).toBe('unauthenticated');
  });
});

describe('pelaajaKirjaudu · kytkentä index.js:ään', () => {
  const fs = require('fs'); const path = require('path');
  const src = fs.readFileSync(path.join(__dirname, '..', 'functions', 'index.js'), 'utf8');
  it('App Check pakollinen, europe-west1', () => {
    const i = src.indexOf('exports.pelaajaKirjaudu = functions');
    const blok = src.slice(i, i + 400);
    expect(blok).toContain(".region('europe-west1')");
    expect(blok).toContain('enforceAppCheck: true');
  });
  it('kuittaaKaavioYmmarretty hylkää pelaajatokenilla eri pelaajan', () => {
    const i = src.indexOf('exports.kuittaaKaavioYmmarretty');
    const blok = src.slice(i, i + 1400);
    expect(blok).toContain("tk.rooli === 'pelaaja' && (tk.pelaajaSeuraId !== seuraId || tk.pelaajaId !== pelaajaId)");
  });
});
