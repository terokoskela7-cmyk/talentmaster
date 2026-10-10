/**
 * Vaihe 0 / PR 2b — soloLapsiKirjaudu (functions/pelaajakirjautuminen.js luoSoloKasittelija).
 * Sama ydin kuin pelaajaKirjaudu (transaktiolukitus, IP-katto, näennäinen scrypt, hajautus
 * deny-all-kokoelmaan). Ajetaan tynkä-Firestorella: playerCodes/{koodi} → players/{playerId}.
 */
import { describe, it, expect } from 'vitest';
import { createRequire } from 'module';
const require = createRequire(import.meta.url);
const K = require('../functions/pelaajakirjautuminen.js');
const crypto = require('crypto');

class HttpsError extends Error { constructor(code, msg) { super(msg); this.code = code; } }

function tynka(alku) {
  const kokoelmat = {
    _kirjautumisyritykset: new Map(), _soloPin: new Map(), _pelaajaPin: new Map(),
    playerCodes: new Map(), players: new Map(),
  };
  Object.keys(alku || {}).forEach((k) => Object.entries(alku[k]).forEach(([id, d]) => kokoelmat[k].set(id, JSON.parse(JSON.stringify(d)))));
  const kirjoita = (kok, id, d, opts) => {
    if (opts && opts.merge) {
      const vanha = Object.assign({}, kokoelmat[kok].get(id) || {});
      Object.keys(d).forEach((k) => { const v = d[k]; vanha[k] = (v && v.__inc != null) ? (vanha[k] || 0) + v.__inc : v; });
      kokoelmat[kok].set(id, vanha);
    } else kokoelmat[kok].set(id, d);
  };
  const docRef = (kok, id) => ({
    _kok: kok, _id: id,
    get: async () => ({ exists: kokoelmat[kok].has(id), data: () => kokoelmat[kok].get(id) }),
    set: async (d, opts) => { kirjoita(kok, id, d, opts); },
    delete: async () => { kokoelmat[kok].delete(id); },
  });
  let lukko = Promise.resolve();
  const runTransaction = (fn) => {
    const ajo = lukko.then(async () => {
      const puskuri = [];
      const tulos = await fn({ get: (r) => r.get(), set: (r, d, o) => { puskuri.push([r, d, o]); } });
      puskuri.forEach(([r, d, o]) => kirjoita(r._kok, r._id, d, o));
      return tulos;
    });
    lukko = ajo.catch(() => {});
    return ajo;
  };
  const db = {
    runTransaction,
    collection: (kok) => ({ doc: (id) => docRef(kok, id) }),
    collectionGroup: () => { throw new Error('Solo-haku ei saa käyttää collectionGroupia'); },
  };
  const tokenit = []; const audit = []; let nyt = 1_000_000;
  const auth = { createCustomToken: async (uid, claims) => { tokenit.push({ uid, claims }); return 'TOKEN'; } };
  const f = K.luoSoloKasittelija({
    db, auth, HttpsError, FieldValue: { increment: (n) => ({ __inc: n }) },
    audit: async (t, x) => audit.push([t, x]), nyt: () => nyt,
  });
  return { f, tokenit, audit, kokoelmat, siirra: (ms) => { nyt += ms; } };
}
const SOLO = {
  playerCodes: { 'TMP-AB12CD': { playerId: 'solo1', parent_uid: 'vanhempi1' } },
  players: { solo1: { playerId: 'solo1', parent_uid: 'vanhempi1', playerCode: 'TMP-AB12CD', child_pin: '4821', seuraId: null } },
};
const ctx = { rawRequest: { ip: '5.6.7.8' } };
const virhe = async (p) => { try { await p; return null; } catch (e) { return e; } };

describe('soloLapsiKirjaudu · koodi', () => {
  it('playerCode normalisoidaan: pienet kirjaimet, välilyönnit, väliviivaton muoto → TMP-XXXXXX', () => {
    expect(K.normalisoiSoloKoodi(' tmp-ab12cd ')).toBe('TMP-AB12CD');
    expect(K.normalisoiSoloKoodi('TMPAB12CD')).toBe('TMP-AB12CD');
    expect(K.normalisoiSoloKoodi('12345678')).toBeNull();
    expect(K.normalisoiSoloKoodi('')).toBeNull();
    expect(K.normalisoiSoloKoodi(null)).toBeNull();
  });
});

describe('soloLapsiKirjaudu · käsittelijä (tynkä)', () => {
  it('oikea koodi + PIN → token, claimit { rooli:solo_lapsi, soloPlayerId }; child_pin siirretään hajautukseksi _soloPin-kokoelmaan', async () => {
    const t = tynka(SOLO);
    /* Kiinteä suola: hajautus ei saa riippua sattumasta (aiempi `not.toContain('4821')` kaatui satunnaisesti, kun satunnainen heksa sisälsi merkit 4821) */
    const alkup = crypto.randomBytes, spy = (n, ...r) => (n === 16 ? Buffer.alloc(16, 7) : alkup.call(crypto, n, ...r));
    crypto.randomBytes = spy;
    let r; try { r = await t.f({ playerCode: 'tmp-ab12cd', pin: '4821' }, ctx); } finally { crypto.randomBytes = alkup; }
    expect(r).toEqual({ token: 'TOKEN', playerId: 'solo1', playerCode: 'TMP-AB12CD' });
    expect(t.tokenit[0]).toEqual({ uid: 'solo_solo1', claims: { rooli: 'solo_lapsi', soloPlayerId: 'solo1' } });
    const h = t.kokoelmat._soloPin.get('solo1');
    expect(h && h.hash).toMatch(/^scrypt\$/);
    expect(h.hash).toMatch(/^scrypt\$\d+\$\d+\$\d+\$(?:07){16}\$[0-9a-f]+$/);   // scrypt$N$r$p$suola(kiinteä)$hash
    expect(h.hash).not.toBe('4821'); expect(K.tarkistaPin('4821', h.hash)).toBe(true); expect(K.tarkistaPin('4822', h.hash)).toBe(false);   // ei tallenneta selväkielisenä; täsmää vain oikealla PIN:llä
    expect(t.kokoelmat._pelaajaPin.size).toBe(0);
    // Hajautuksen jälkeen vanha child_pin ei enää ratkaise: vaihdetaan se → kirjautuminen hajautuksella toimii silti.
    t.kokoelmat.players.get('solo1').child_pin = '0000';
    await expect(t.f({ playerCode: 'TMP-AB12CD', pin: '4821' }, ctx)).resolves.toMatchObject({ playerId: 'solo1' });
    const e = await virhe(t.f({ playerCode: 'TMP-AB12CD', pin: '0000' }, ctx));
    expect(e.code).toBe('unauthenticated');
  });

  it('väärä PIN, tuntematon koodi ja indeksi ilman pelaajaa → SAMA virhe', async () => {
    const t = tynka(Object.assign({}, SOLO, {
      playerCodes: Object.assign({}, SOLO.playerCodes, { 'TMP-ORPO01': { playerId: 'eiole' } }),
    }));
    const a = await virhe(t.f({ playerCode: 'TMP-AB12CD', pin: '1111' }, ctx));
    const b = await virhe(t.f({ playerCode: 'TMP-ZZZZZZ', pin: '4821' }, ctx));
    const c = await virhe(t.f({ playerCode: 'TMP-ORPO01', pin: '4821' }, ctx));
    [a, b, c].forEach((e) => { expect(e.code).toBe('unauthenticated'); expect(e.message).toBe(K.VIRHE_TUNNISTUS); });
    expect(t.tokenit).toHaveLength(0);
  });

  it('pelaajadokumentin playerCode ei täsmää indeksiin → hylätään (vanhentunut/kaapattu indeksi)', async () => {
    const t = tynka({
      playerCodes: { 'TMP-VIERAS': { playerId: 'solo1' } },
      players: SOLO.players,
    });
    const e = await virhe(t.f({ playerCode: 'TMP-VIERAS', pin: '4821' }, ctx));
    expect(e.code).toBe('unauthenticated');
  });

  it('5 väärää → lukittu 15 min (oikeakaan PIN ei kelpaa), audit-hälytys; sen jälkeen onnistuu', async () => {
    const t = tynka(SOLO);
    for (let i = 0; i < 5; i++) await virhe(t.f({ playerCode: 'TMP-AB12CD', pin: '0000' }, ctx));
    const e = await virhe(t.f({ playerCode: 'TMP-AB12CD', pin: '4821' }, ctx));
    expect(e.code).toBe('resource-exhausted');
    expect(t.audit.some(([tt, x]) => tt === 'solo_kirjautuminen_lukittu' && x.severity === 'alert')).toBe(true);
    t.siirra(K.LUKITUS_MS + 1);
    await expect(t.f({ playerCode: 'TMP-AB12CD', pin: '4821' }, ctx)).resolves.toMatchObject({ playerId: 'solo1' });
  });

  it('20 RINNAKKAISTA väärää → ≥15 resource-exhausted (varaus transaktiossa)', async () => {
    const t = tynka(SOLO);
    const tulokset = await Promise.all(Array.from({ length: 20 }, () => virhe(t.f({ playerCode: 'TMP-AB12CD', pin: '0000' }, ctx))));
    expect(tulokset.filter((e) => e && e.code === 'resource-exhausted').length).toBeGreaterThanOrEqual(15);
  });

  it('Solo-laskuri on eri avaimella kuin seurapelaajan: lukitus ei vuoda tunnusavaruudesta toiseen', async () => {
    const t = tynka(SOLO);
    for (let i = 0; i < 5; i++) await virhe(t.f({ playerCode: 'TMP-AB12CD', pin: '0000' }, ctx));
    const avaimet = Array.from(t.kokoelmat._kirjautumisyritykset.keys());
    expect(avaimet.some((a) => a.startsWith('so_'))).toBe(true);
    expect(avaimet.some((a) => a.startsWith('t_'))).toBe(false);
  });

  it('tuntematon koodi ajaa silti scryptin (vastausajan tasaus)', async () => {
    const t = tynka(SOLO);
    const alkup = crypto.scryptSync; let n = 0;
    crypto.scryptSync = function () { n++; return alkup.apply(this, arguments); };
    try { await virhe(t.f({ playerCode: 'TMP-ZZZZZZ', pin: '4821' }, ctx)); } finally { crypto.scryptSync = alkup; }
    expect(n).toBeGreaterThanOrEqual(1);
  });
});

/* VARTIJA (PR 2b): Solo-lapsen claimit eivät saa koskaan sisältää seura-avaruuden kenttiä.
   seuraId avaisi onOmaSeura-haarat, pelaajaSeuraId/pelaajaId onPelaaja/onPelaajaItse-haarat. */
describe('soloLapsiKirjaudu · claim-vartija', () => {
  it('claimeissa EI ole seuraId-, pelaajaSeuraId- eikä pelaajaId-kenttää, rooli ei ole pelaaja', async () => {
    const c = K.soloClaims('solo1');
    expect(Object.keys(c).sort()).toEqual(['rooli', 'soloPlayerId']);
    ['seuraId', 'pelaajaSeuraId', 'pelaajaId'].forEach((k) => expect(c).not.toHaveProperty(k));
    expect(c.rooli).toBe('solo_lapsi');
    const t = tynka(SOLO);
    await t.f({ playerCode: 'TMP-AB12CD', pin: '4821' }, ctx);
    ['seuraId', 'pelaajaSeuraId', 'pelaajaId'].forEach((k) => expect(t.tokenit[0].claims).not.toHaveProperty(k));
    expect(t.tokenit[0].uid.startsWith('solo_')).toBe(true);
  });
  it('lähde: Solo-mallin claims-rakennus ei mainitse seura-avaruuden kenttiä', () => {
    const fs = require('fs'); const path = require('path');
    const src = fs.readFileSync(path.join(__dirname, '..', 'functions', 'pelaajakirjautuminen.js'), 'utf8');
    const m = /function soloClaims\([^)]*\)\s*\{([^}]*)\}/.exec(src);
    expect(m).not.toBeNull();
    expect(m[1]).not.toMatch(/seuraId|pelaajaSeuraId|pelaajaId/);
  });
});
