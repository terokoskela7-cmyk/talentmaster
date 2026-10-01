/**
 * HOTFIX · lahetaPelaajaSivuLinkki (auki 1.4.2026 lähtien).
 * Funktiossa ei ollut kirjautumistarkistusta, ja se palautti salasanan asetuslinkin kutsujalle →
 * kuka tahansa sai reset-linkin mille tahansa tilille. Nyt: kirjautuminen + tarkistaOikeus +
 * hEmail = pelaajan tallennettu huoltajaEmail, eikä linkkiä palauteta.
 *
 * functions/index.js alustaa admin SDK:n moduulitasolla → ei importattavissa. CF:n runko puretaan
 * lähteestä ja AJETAAN vm-hiekkalaatikossa; tyngät nimetty kuten tuotannon muuttujat.
 */
import { describe, it, expect } from 'vitest';
import { readFileSync } from 'fs';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';
import vm from 'vm';
import { lisaaPaikkamerkki, onPaikkamerkkiOsoite } from './_paikkamerkkiCtx.mjs';
import { createRequire } from 'module';
const require_ = createRequire(import.meta.url);

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..');
const CF = readFileSync(join(ROOT, 'functions', 'index.js'), 'utf8');

function cfRunko(nimi) {
  const i = CF.indexOf('exports.' + nimi + ' = functions');
  if (i < 0) throw new Error('ei löydy: ' + nimi);
  const j = CF.indexOf('\n  });', i);
  return CF.slice(i, j + 6);
}
class HttpsError extends Error { constructor(code, msg) { super(msg); this.code = code; } }

const ANON = { uid: 'anon-1', token: { firebase: { sign_in_provider: 'anonymous' } } };
const VP = { uid: 'vp-1', token: { seuraId: 'fcl', rooli: 'vp', firebase: { sign_in_provider: 'password' } } };

function aja(auth, { oikeus = false, tallennettu = 'huoltaja@tm-testi.fi' } = {}) {
  const loki = { reset: 0, luotu: 0, sposti: 0, oikeus: [] };
  const ketju = { region() { return ketju; }, runWith() { return ketju; }, https: { onCall: (f) => f, HttpsError } };
  const ctx = {
    functions: ketju, exports: {}, console: { log() {}, warn() {}, error() {} }, encodeURIComponent, String,
    db: { collection: () => ({ doc: () => ({ collection: () => ({ doc: () => ({
      get: async () => { const d = { huoltajaEmail: tallennettu, pin: '482915', tunniste: '12345678' }; return { exists: true, get: (k) => d[k], data: () => d }; },
      update: () => Promise.resolve(),
    }) }) }) }) },
    admin: { firestore: { FieldValue: { serverTimestamp: () => 'TS' } } },
    auth: { generatePasswordResetLink: async () => { loki.reset++; return 'https://reset/SALAINEN'; } },
    tarkistaOikeus: async (uid, sid) => { loki.oikeus.push([uid, sid]); return { sallittu: oikeus }; },
    haeJoukkueNimi: async () => 'U12',
    haeOrLuoHuoltajaAuth: async () => { loki.luotu++; },
    lahetaSahkoposti: async (m) => { loki.sposti++; loki.viesti = m; },
    pohjaPelaajaSivu: (o) => JSON.stringify(o),
      pelaajakirjautuminen: require_('../functions/pelaajakirjautuminen.js'),
    TM_BASE_URL: 'https://tm',
  };
  vm.createContext(ctx); lisaaPaikkamerkki(ctx);
  vm.runInContext(cfRunko('lahetaPelaajaSivuLinkki'), ctx);
  const data = { hEmail: 'Huoltaja@tm-testi.fi', pelaajaId: 'p1', seuraId: 'fcl', etunimi: 'A' };
  return { loki, ajo: ctx.exports.lahetaPelaajaSivuLinkki(data, { auth }) };
}
const EI_MITAAN = { reset: 0, luotu: 0, sposti: 0 };
const sivuvaikutukset = (l) => ({ reset: l.reset, luotu: l.luotu, sposti: l.sposti });

describe('HOTFIX · lahetaPelaajaSivuLinkki (ajettu)', () => {
  it('ei kirjautumista → unauthenticated; ei tiliä, linkkiä eikä sähköpostia', async () => {
    const t = aja(undefined);
    await expect(t.ajo).rejects.toMatchObject({ code: 'unauthenticated' });
    expect(sivuvaikutukset(t.loki)).toEqual(EI_MITAAN);
  });
  it('anonyymi / muu kuin seuran johto → permission-denied (tarkistaOikeus)', async () => {
    const t = aja(ANON);
    await expect(t.ajo).rejects.toMatchObject({ code: 'permission-denied' });
    expect(t.loki.oikeus).toEqual([['anon-1', 'fcl']]);
    expect(sivuvaikutukset(t.loki)).toEqual(EI_MITAAN);
  });
  it('johto, mutta sähköposti ≠ pelaajan tallennettu huoltajaEmail → failed-precondition', async () => {
    const t = aja(VP, { oikeus: true, tallennettu: 'joku.muu@tm-testi.fi' });
    await expect(t.ajo).rejects.toMatchObject({ code: 'failed-precondition' });
    expect(sivuvaikutukset(t.loki)).toEqual(EI_MITAAN);
  });
  it('pelaajalla ei tallennettua huoltajaEmailia → failed-precondition', async () => {
    const t = aja(VP, { oikeus: true, tallennettu: '' });
    await expect(t.ajo).rejects.toMatchObject({ code: 'failed-precondition' });
    expect(sivuvaikutukset(t.loki)).toEqual(EI_MITAAN);
  });
  it('johto + täsmäävä sähköposti → lähetetään, mutta reset-linkkiä EI palauteta kutsujalle', async () => {
    const t = aja(VP, { oikeus: true });
    const r = await t.ajo;
    expect(t.loki.sposti).toBe(1);
    expect(r.ok).toBe(true);
    expect(r).not.toHaveProperty('salasanaLinkki');
    expect(JSON.stringify(r)).not.toContain('SALAINEN');
  });
  it('PR 4: sähköpostissa PalloID + PIN + henkilökohtainen linkki ?p=&seura= (ei nimiä URL:ssa); vastauksessa ei PIN:iä', async () => {
    const t = aja(VP, { oikeus: true });
    const r = await t.ajo;
    const o = JSON.parse(t.loki.viesti.html);
    expect(o).toMatchObject({ pin: '482915', palloId: '12345678', pelaajaLinkki: 'https://tm/TalentMaster_Pelaaja_v7.html?p=p1&seura=fcl' });
    expect(JSON.stringify(r)).not.toContain('482915');
  });
});
