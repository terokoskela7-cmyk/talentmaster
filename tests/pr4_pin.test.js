/**
 * Vaihe 0 / PR 4 · PIN vain palvelimella (functions/pelaajapin.js) + kirjautuminen samaa dataa vasten.
 * Muistinvarainen Firestore-tynkä (polku → dokumentti): collection/doc/get/set/update/delete, batch,
 * runTransaction, where (== / array-contains) ja collectionGroup. asetaPelaajanPin ja pelaajaKirjaudu
 * ajetaan SAMAN tynkän päällä → "uudella PIN:llä voi kirjautua ja vanhalla ei" todennetaan päästä päähän.
 */
import { describe, it, expect } from 'vitest';
import { createRequire } from 'module';
import { readFileSync } from 'fs';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';
import vm from 'vm';
import { fakeDb } from './_fakeFirestore.mjs';
const require = createRequire(import.meta.url);
const P = require('../functions/pelaajapin.js');
const K = require('../functions/pelaajakirjautuminen.js');

class HttpsError extends Error { constructor(code, msg) { super(msg); this.code = code; } }
const FieldValue = { serverTimestamp: () => 'TS', increment: (n) => ({ __inc: n }) };

const SID = 'kpv', PID = 'm93';
const PEL = 'seurat/kpv/pelaajat/m93';
function perusData() {
  return {
    // Suostumus ennen PIN:iä (1.10.2026): fixturet ovat suostumuksen antaneita (uudet testit: tests/suostumus_ennen_kirjautumista.test.js).
    [PEL]: { etunimi: 'Topias', tunniste: '12345678', pin: '9278', joukkueet: ['kpv_u13'], joukkue: 'KPV U13', suostumusTila: 'annettu' },
    'seurat/kpv/pelaajat/x2': { etunimi: 'Muu', tunniste: '87654321', joukkueet: ['kpv_u15'], joukkue: 'KPV U15', suostumusTila: 'annettu' },
    'seurat/kpv/pelaajat/x3': { etunimi: 'Vanha', joukkue: 'KPV U13', suostumusTila: 'annettu' },   // vain nimikenttä (§18)
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
    for (let i = 0; i < 100; i++) alku['seurat/kpv/pelaajat/p' + i] = { tunniste: String(10000000 + i), joukkueet: ['kpv_u13'], suostumusTila: 'annettu' };
    const y = ymparisto(alku);
    const r = await y.luo({ seuraId: SID }, VP);
    expect(r.luotu).toBe(102);
    expect(r.eria).toBeGreaterThan(1);
    expect(Math.max(...y.f.loki.batchOps)).toBeLessThanOrEqual(P.ERAKOKO);
  }, 30000);
});


/* ── Solo: soloHyvaksyLupa (CF-runko vm:ssä, sama tynkä) ── */
const CF = readFileSync(join(dirname(fileURLToPath(import.meta.url)), '..', 'functions', 'index.js'), 'utf8');
function puraFn(nimi) {
  const i = CF.indexOf('function ' + nimi + '(');
  let d = 0;
  for (let j = CF.indexOf(') {', i) + 2; j < CF.length; j++) { if (CF[j] === '{') d++; else if (CF[j] === '}') { d--; if (!d) return CF.slice(i, j + 1); } }
  throw new Error(nimi);
}
function hyvaksyja(alku) {
  const f = fakeDb(alku);
  const i = CF.indexOf('exports.soloHyvaksyLupa = functions');
  const runko = CF.slice(i, CF.indexOf('\n  });', i) + 6);
  const ketju = { region() { return ketju; }, runWith() { return ketju; }, https: { onCall: (fn) => fn, HttpsError } };
  const ctx = {
    functions: ketju, exports: {}, db: f.db, require, String, Object, JSON, console: { log() {}, warn() {} },
    admin: { firestore: { FieldValue: { serverTimestamp: () => 'TS', arrayUnion: (x) => [x], delete: () => undefined } } },
    soloVaraaPlayerCode: async () => 'TMP-QWERTY', pelaajapin: P, pelaajakirjautuminen: K,
  };
  vm.createContext(ctx);
  vm.runInContext(puraFn('soloTokenHash') + '\n' + puraFn('soloLupaToken') + '\n' + runko + '\nthis.h = soloTokenHash;', ctx);
  return { f, fn: ctx.exports.soloHyvaksyLupa, hash: ctx.h };
}
const VANHEMPI = { auth: { uid: 'vanhempi-1', token: { email: 'v@x.fi' } } };

describe('soloHyvaksyLupa (PR 4)', () => {
  it('uusi pyyntö (token_hash): 6-numeroinen child_pin + _soloPin; tulos alidokumentissa, päädokissa EI PIN:iä eikä koodia', async () => {
    const tmp = hyvaksyja({});
    const alku = { 'lupapyynnot/r1': { status: 'odottaa', child_etunimi: 'Aa', token_hash: tmp.hash('tok-1') } };
    const { f, fn } = hyvaksyja(alku);
    const r = await fn({ requestId: 'r1', token: 'tok-1' }, VANHEMPI);
    expect(r.child_pin).toMatch(/^\d{6}$/);
    expect(P.onTriviaaliPin(r.child_pin)).toBe(false);
    const paa = f.D.get('lupapyynnot/r1');
    expect(paa.status).toBe('hyvaksytty');
    expect(paa).not.toHaveProperty('child_pin');
    expect(paa).not.toHaveProperty('playerCode');
    expect(paa.token).toBeUndefined();
    expect(f.D.get('lupapyynnot/r1/tulos/tok-1')).toMatchObject({ child_pin: r.child_pin, playerCode: 'TMP-QWERTY', playerId: r.playerId });
    expect(K.tarkistaPin(r.child_pin, f.D.get('_soloPin/' + r.playerId).hash)).toBe(true);
    expect(f.D.get('players/' + r.playerId).child_pin).toBe(r.child_pin);
    // idempotentti uudelleenkutsu palauttaa saman
    await expect(fn({ requestId: 'r1', token: 'tok-1' }, VANHEMPI)).resolves.toMatchObject({ child_pin: r.child_pin, playerCode: 'TMP-QWERTY' });
  });
  it('väärä token → permission-denied (ei hyväksyntää, ei tulosta)', async () => {
    const tmp = hyvaksyja({});
    const { f, fn } = hyvaksyja({ 'lupapyynnot/r2': { status: 'odottaa', token_hash: tmp.hash('oikea') } });
    await expect(fn({ requestId: 'r2', token: 'vaara' }, VANHEMPI)).rejects.toMatchObject({ code: 'permission-denied' });
    expect(f.D.get('lupapyynnot/r2').status).toBe('odottaa');
    expect([...f.D.keys()].some((k) => k.includes('/tulos/'))).toBe(false);
  });
  it('vanha pyyntö (selväkielinen token) toimii ja token korvataan hashilla', async () => {
    const { f, fn, hash } = hyvaksyja({ 'lupapyynnot/r3': { status: 'odottaa', token: 'vanha-tok' } });
    const r = await fn({ requestId: 'r3', token: 'vanha-tok' }, VANHEMPI);
    expect(f.D.get('lupapyynnot/r3/tulos/vanha-tok').child_pin).toBe(r.child_pin);
    expect(f.D.get('lupapyynnot/r3').token_hash).toBe(hash('vanha-tok'));
    expect(f.D.get('lupapyynnot/r3').token).toBeUndefined();
  });
});
