/**
 * Vaihe 0 / PR 4 · PIN vain palvelimella (functions/pelaajapin.js) + kirjautuminen samaa dataa vasten.
 * Muistinvarainen Firestore-tynkä (polku → dokumentti): collection/doc/get/set/update/delete, batch,
 * runTransaction, where (== / array-contains) ja collectionGroup. asetaPelaajanPin ja pelaajaKirjaudu
 * ajetaan SAMAN tynkän päällä → "uudella PIN:llä voi kirjautua ja vanhalla ei" todennetaan päästä päähän.
 */
import { describe, it, expect } from 'vitest';
import { createRequire } from 'module';
const require = createRequire(import.meta.url);
const P = require('../functions/pelaajapin.js');
const K = require('../functions/pelaajakirjautuminen.js');

class HttpsError extends Error { constructor(code, msg) { super(msg); this.code = code; } }
const FieldValue = { serverTimestamp: () => 'TS', increment: (n) => ({ __inc: n }) };

function fakeDb(alku) {
  const D = new Map(Object.entries(alku || {}));   // 'a/b/c/d' → data
  const loki = { commits: 0, batchOps: [] };
  const snap = (path) => ({ id: path.split('/').pop(), exists: D.has(path), data: () => D.get(path), get: (k) => (D.get(path) || {})[k], ref: docRef(path) });
  function kirjoita(path, d, opts) {
    if (opts && opts.merge) {
      const v = Object.assign({}, D.get(path) || {});
      Object.keys(d).forEach((k) => { v[k] = d[k] && d[k].__inc != null ? (v[k] || 0) + d[k].__inc : d[k]; });
      D.set(path, v);
    } else D.set(path, d);
  }
  function docRef(path) {
    return {
      _path: path, id: path.split('/').pop(),
      get: async () => snap(path),
      set: async (d, o) => kirjoita(path, d, o),
      update: async (d) => { if (!D.has(path)) throw new Error('NOT_FOUND ' + path); kirjoita(path, d, { merge: true }); },
      delete: async () => { D.delete(path); },
      collection: (c) => colRef(path + '/' + c),
    };
  }
  function colRef(path, ehdot) {
    ehdot = ehdot || [];
    const lapset = () => [...D.keys()].filter((k) => k.startsWith(path + '/') && k.slice(path.length + 1).indexOf('/') < 0);
    return {
      doc: (id) => docRef(path + '/' + id),
      where: (k, op, v) => colRef(path, ehdot.concat([[k, op, v]])),
      limit: () => colRef(path, ehdot),
      get: async () => ({ docs: lapset().filter((p) => ehdot.every(([k, op, v]) => {
        const a = (D.get(p) || {})[k];
        return op === '==' ? a === v : op === 'array-contains' ? Array.isArray(a) && a.indexOf(v) >= 0 : false;
      })).map(snap) }),
    };
  }
  const db = {
    collection: (c) => colRef(c),
    collectionGroup: (nimi) => ({
      where: (k, _op, v) => ({ limit: () => ({ get: async () => ({
        docs: [...D.keys()].filter((p) => { const o = p.split('/'); return o.length >= 2 && o[o.length - 2] === nimi && (D.get(p) || {})[k] === v; })
          .map((p) => { const s = snap(p); const o = p.split('/'); s.ref = { parent: { parent: o.length >= 4 ? { id: o[o.length - 3], parent: { id: o[o.length - 4] } } : null } }; return s; }),
      }) }) }),
    }),
    batch: () => {
      const ops = [];
      return {
        set: (r, d, o) => ops.push(() => kirjoita(r._path, d, o)),
        update: (r, d) => ops.push(() => { if (!D.has(r._path)) throw new Error('NOT_FOUND'); kirjoita(r._path, d, { merge: true }); }),
        delete: (r) => ops.push(() => D.delete(r._path)),
        commit: async () => { loki.commits++; loki.batchOps.push(ops.length); ops.forEach((f) => f()); },
      };
    },
    runTransaction: async (fn) => {
      const puskuri = [];
      const tulos = await fn({ get: (r) => r.get(), set: (r, d, o) => puskuri.push([r, d, o]) });
      puskuri.forEach(([r, d, o]) => kirjoita(r._path, d, o));
      return tulos;
    },
  };
  return { db, D, loki };
}

const SID = 'kpv', PID = 'm93';
const PEL = 'seurat/kpv/pelaajat/m93';
function perusData() {
  return {
    [PEL]: { etunimi: 'Topias', tunniste: '12345678', pin: '9278', joukkueet: ['kpv_u13'], joukkue: 'KPV U13' },
    'seurat/kpv/pelaajat/x2': { etunimi: 'Muu', tunniste: '87654321', joukkueet: ['kpv_u15'], joukkue: 'KPV U15' },
    'seurat/kpv/pelaajat/x3': { etunimi: 'Vanha', joukkue: 'KPV U13' },   // vain nimikenttä (§18)
    'seurat/kpv/joukkueet/kpv_u13': { nimi: 'KPV U13' },
    'seurat/kpv/kayttajat/valm-u13': { rooli: 'valmentaja', joukkueet: ['kpv_u13'] },
    'seurat/kpv/kayttajat/valm-pois': { rooli: 'valmentaja', joukkueet: ['kpv_u13'], aktiivinen: false },
  };
}
const VP = { auth: { uid: 'vp-kpv', token: { seuraId: 'kpv', rooli: 'vp', firebase: { sign_in_provider: 'password' } } } };
const VALM = { auth: { uid: 'valm-u13', token: { seuraId: 'kpv', rooli: 'valmentaja', firebase: { sign_in_provider: 'password' } } } };
const VALM_POIS = { auth: { uid: 'valm-pois', token: { seuraId: 'kpv', rooli: 'valmentaja', firebase: { sign_in_provider: 'password' } } } };
const ANON = { auth: { uid: 'anon', token: { firebase: { sign_in_provider: 'anonymous' } } } };
const VIERAS_SEURA = { auth: { uid: 'valm-x', token: { seuraId: 'sjk', rooli: 'valmentaja', firebase: { sign_in_provider: 'password' } } } };
const ctxIp = { rawRequest: { ip: '1.2.3.4' } };

function ymparisto(alku) {
  const f = fakeDb(alku || perusData());
  const audit = [];
  const deps = {
    db: f.db, HttpsError, FieldValue,
    tarkistaOikeus: async (uid) => ({ sallittu: uid === 'vp-kpv' || uid === 'sa' }),
    audit: async (t, x) => audit.push([t, x]),
  };
  const kirjaudu = K.luoKasittelija({ db: f.db, auth: { createCustomToken: async (uid) => 'TOKEN:' + uid }, HttpsError, FieldValue, nyt: () => 1_000_000 });
  return { f, audit, aseta: P.luoAsetaPelaajanPin(deps), luo: P.luoLuoPinitSeuralle(deps), kirjaudu };
}

describe('pelaajapin · puhtaat osat', () => {
  it('triviaalit PIN:t tunnistetaan; generoitu PIN on 6 numeroa eikä triviaali', () => {
    ['111111', '000000', '123456', '654321', '012345', '987654'].forEach((p) => expect(P.onTriviaaliPin(p), p).toBe(true));
    ['482915', '102938', '135790'].forEach((p) => expect(P.onTriviaaliPin(p), p).toBe(false));
    for (let i = 0; i < 200; i++) { const p = P.generoiPin(); expect(p).toMatch(/^\d{6}$/); expect(P.onTriviaaliPin(p)).toBe(false); }
    let n = 0; const seq = [111111, 123456, 482915];   // triviaalit ohitetaan
    expect(P.generoiPin(() => seq[n++])).toBe('482915');
  });
  it('käsin syötetty: tasan 6 numeroa, ei triviaali', () => {
    expect(P.normalisoiUusiPin('482915')).toBe('482915');
    ['1234', '12345', '1234567', '123456', 'abcdef', ''].forEach((p) => expect(P.normalisoiUusiPin(p), p).toBe(null));
  });
});

describe('asetaPelaajanPin', () => {
  it('kirjoittaa hajautuksen + selväkielisen, palauttaa PIN:n; UUDELLA kirjautuu, VANHALLA ei', async () => {
    const y = ymparisto();
    // Lähtötila: Topias on kirjautunut kerran vanhalla PIN:llä → hajautus on olemassa
    await expect(y.kirjaudu({ liittoTunnus: '12345678', pin: '9278' }, ctxIp)).resolves.toMatchObject({ token: 'TOKEN:pel_kpv_m93' });
    const r = await y.aseta({ seuraId: SID, pelaajaId: PID }, VP);
    expect(r.pin).toMatch(/^\d{6}$/);
    expect(y.f.D.get(PEL).pin).toBe(r.pin);
    expect(K.tarkistaPin(r.pin, y.f.D.get('_pelaajaPin/kpv_m93').hash)).toBe(true);
    expect(y.f.loki.commits).toBe(1);   // hajautus + selväkielinen SAMASSA erässä
    await expect(y.kirjaudu({ liittoTunnus: '12345678', pin: '9278' }, ctxIp)).rejects.toMatchObject({ code: 'unauthenticated' });
    await expect(y.kirjaudu({ liittoTunnus: '12345678', pin: r.pin }, ctxIp)).resolves.toMatchObject({ token: 'TOKEN:pel_kpv_m93' });
    await expect(y.kirjaudu({ seuraId: SID, pelaajaId: PID, pin: r.pin }, ctxIp)).resolves.toMatchObject({ token: 'TOKEN:pel_kpv_m93' });
  });
  it('nollaa lukitukset: lukittu pelaaja pääsee sisään uudella PIN:llä heti', async () => {
    const y = ymparisto();
    for (let i = 0; i < 5; i++) await y.kirjaudu({ seuraId: SID, pelaajaId: PID, pin: '0000' }, ctxIp).catch(() => {});
    await expect(y.kirjaudu({ seuraId: SID, pelaajaId: PID, pin: '9278' }, ctxIp)).rejects.toMatchObject({ code: 'resource-exhausted' });
    const { pin } = await y.aseta({ seuraId: SID, pelaajaId: PID, pin: '482915' }, VP);
    expect(pin).toBe('482915');
    expect([...y.f.D.keys()].filter((k) => k.startsWith('_kirjautumisyritykset/') && !k.includes('/ip_'))).toEqual([]);
    await expect(y.kirjaudu({ seuraId: SID, pelaajaId: PID, pin: '482915' }, ctxIp)).resolves.toMatchObject({ token: 'TOKEN:pel_kpv_m93' });
  });
  it('audit-rivi ei sisällä PIN:iä; generoitu-lippu', async () => {
    const y = ymparisto();
    const { pin } = await y.aseta({ seuraId: SID, pelaajaId: PID }, VP);
    await y.aseta({ seuraId: SID, pelaajaId: PID, pin: '482915' }, VP);
    expect(y.audit.map(([t, x]) => [t, x.generoitu])).toEqual([['pin_asetettu', true], ['pin_asetettu', false]]);
    expect(JSON.stringify(y.audit)).not.toContain(pin);
    expect(JSON.stringify(y.audit)).not.toContain('482915');
  });
  it('oikeudet: valmentaja VAIN oman joukkueen pelaajalle; anonyymi, deaktivoitu ja vieras seura → permission-denied', async () => {
    const y = ymparisto();
    await expect(y.aseta({ seuraId: SID, pelaajaId: PID }, VALM)).resolves.toHaveProperty('pin');
    await expect(y.aseta({ seuraId: SID, pelaajaId: 'x2' }, VALM)).rejects.toMatchObject({ code: 'permission-denied' });
    await expect(y.aseta({ seuraId: SID, pelaajaId: 'x3' }, VALM)).rejects.toMatchObject({ code: 'permission-denied' });   // ei joukkueet[] → ei ID-täsmäystä
    for (const c of [ANON, VALM_POIS, VIERAS_SEURA]) await expect(y.aseta({ seuraId: SID, pelaajaId: PID }, c)).rejects.toMatchObject({ code: 'permission-denied' });
    await expect(y.aseta({ seuraId: SID, pelaajaId: PID }, {})).rejects.toMatchObject({ code: 'unauthenticated' });
    await expect(y.aseta({ seuraId: SID, pelaajaId: 'x2' }, VP)).resolves.toHaveProperty('pin');   // johto koko seura
  });
  it('käsin: triviaali tai väärä pituus → invalid-argument (ei kirjoitusta)', async () => {
    const y = ymparisto();
    for (const p of ['123456', '111111', '1234', '12345678']) await expect(y.aseta({ seuraId: SID, pelaajaId: PID, pin: p }, VP)).rejects.toMatchObject({ code: 'invalid-argument' });
    expect(y.f.D.get(PEL).pin).toBe('9278');
    await expect(y.aseta({ seuraId: SID, pelaajaId: 'eiole' }, VP)).rejects.toMatchObject({ code: 'not-found' });
  });
});

describe('luoPinitSeuralle', () => {
  it('vain puuttuvat (oletus): lukumäärät, olemassa oleva PIN ennallaan', async () => {
    const y = ymparisto();
    const r = await y.luo({ seuraId: SID }, VP);
    expect(r).toMatchObject({ ok: true, luotu: 2, ohitettu: 1, yhteensa: 3 });
    expect(y.f.D.get(PEL).pin).toBe('9278');
    ['x2', 'x3'].forEach((id) => {
      const d = y.f.D.get('seurat/kpv/pelaajat/' + id);
      expect(d.pin).toMatch(/^\d{6}$/);
      expect(K.tarkistaPin(d.pin, y.f.D.get('_pelaajaPin/kpv_' + id).hash)).toBe(true);
    });
    expect(y.audit).toEqual([['pinit_luotu', expect.objectContaining({ luotu: 2, ohitettu: 1, vainPuuttuvat: true })]]);
    expect(JSON.stringify(y.audit)).not.toMatch(/\b\d{6}\b/);
  });
  it('kuiva-ajo: vain lukumäärä vahvistusikkunaan, ei kirjoituksia', async () => {
    const y = ymparisto();
    const r = await y.luo({ seuraId: SID, kuivaAjo: true }, VP);
    expect(r).toMatchObject({ kuivaAjo: true, luotaisiin: 2, ohitettu: 1 });
    expect(y.f.loki.commits).toBe(0);
  });
  it('joukkue: löytää myös vanhat nimikenttäpelaajat (§18); valmentaja vain omalle joukkueelle', async () => {
    const y = ymparisto();
    await expect(y.luo({ seuraId: SID }, VALM)).rejects.toMatchObject({ code: 'permission-denied' });
    await expect(y.luo({ seuraId: SID, joukkue: 'kpv_u15' }, VALM)).rejects.toMatchObject({ code: 'permission-denied' });
    const r = await y.luo({ seuraId: SID, joukkue: 'kpv_u13', vainPuuttuvat: false }, VP);
    expect(r).toMatchObject({ luotu: 2, yhteensa: 2 });   // m93 (joukkueet) + x3 (vain nimi)
    expect(y.f.D.get(PEL).pin).not.toBe('9278');
    const v = await ymparisto().luo({ seuraId: SID, joukkue: 'kpv_u13' }, VALM);
    expect(v).toMatchObject({ luotu: 0, ohitettu: 2 });   // m93 jo PIN, x3 ei joukkueet[] → ei valmentajan oikeutta
  });
  it('erät ≤ 400 kirjoitusta', async () => {
    const alku = perusData();
    // 5 kirjoitusta / pelaaja (hajautus + pin + 3 lukitusavainta) → 80 pelaajaa / erä. scrypt ~35 ms / PIN.
    for (let i = 0; i < 100; i++) alku['seurat/kpv/pelaajat/p' + i] = { tunniste: String(10000000 + i), joukkueet: ['kpv_u13'] };
    const y = ymparisto(alku);
    const r = await y.luo({ seuraId: SID }, VP);
    expect(r.luotu).toBe(102);
    expect(r.eria).toBeGreaterThan(1);
    expect(Math.max(...y.f.loki.batchOps)).toBeLessThanOrEqual(P.ERAKOKO);
  }, 30000);
});
