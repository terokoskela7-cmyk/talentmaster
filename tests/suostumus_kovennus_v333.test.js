/**
 * Rules v3.33 (2.10.2026): suostumusTila / huoltajaEmail vain palvelimella + suostumuslomakkeen vanha reitti pois.
 * Rules-puoli: tests/rules/firestore.rules.test.js (v3.33-ryhmät). Tämä: palvelinlogiikka + selainkoodin vartijat.
 */
import { describe, it, expect } from 'vitest';
import { readFileSync } from 'fs';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';
import { createRequire } from 'module';
import vm from 'vm';

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..');
const require_ = createRequire(import.meta.url);
const lue = (n) => readFileSync(join(ROOT, n), 'utf8');
const SEURA = lue('TalentMaster_Seura.html');
const LOMAKE = lue('TalentMaster_Rekisterointi_Suostumus.html');
const INDEX = lue('functions/index.js');
const HE = require_('../functions/huoltajaemail.js');
const S = require_('../functions/suostumus.js');

class HttpsError extends Error { constructor(c, m, d) { super(m); this.code = c; this.details = d; } }
function ymp(pelaaja, { oikeus = true, token = { seuraId: 'kpv', rooli: 'vp' } } = {}) {
  const loki = { update: [], audit: [] };
  const ref = { get: async () => ({ exists: !!pelaaja, data: () => pelaaja }), update: async (u) => { loki.update.push(u); } };
  const db = { collection: () => ({ doc: () => ({ collection: () => ({ doc: () => ref }), get: async () => ({ exists: false }) }) }) };
  const fn = HE.luoKasittelija({ db, HttpsError, FieldValue: { serverTimestamp: () => 'TS' },
    tarkistaOikeus: async () => ({ sallittu: oikeus }), audit: async (t, d) => loki.audit.push([t, d]) });
  return { loki, aja: (data) => fn(Object.assign({ seuraId: 'kpv', pelaajaId: 'p1' }, data), { auth: { uid: 'vp1', token } }) };
}

describe('asetaHuoltajaEmail (ajettu)', () => {
  it('vaihtaa osoitteen pienaakkosiksi; audit ilman osoitetta', async () => {
    const { loki, aja } = ymp({ huoltajaEmail: 'vanha@tm-testi.fi', joukkueet: ['kpv_u13'] });
    expect(await aja({ huoltajaEmail: ' Uusi@TM-testi.fi ' })).toEqual({ ok: true, muuttui: true });
    expect(loki.update).toEqual([{ huoltajaEmail: 'uusi@tm-testi.fi', muokattu: 'TS' }]);
    const [t, d] = loki.audit[0];
    expect(t).toBe('huoltaja_email_vaihdettu');
    expect(d).toMatchObject({ seuraId: 'kpv', pelaajaId: 'p1', tekija_uid: 'vp1', oli_tyhja: false, tyhjennetty: false, severity: 'info' });
    expect(JSON.stringify(d)).not.toMatch(/@/);
  });
  it('sama osoite → ei kirjoitusta eikä audit-riviä', async () => {
    const { loki, aja } = ymp({ huoltajaEmail: 'h@tm-testi.fi' });
    expect(await aja({ huoltajaEmail: 'H@tm-testi.fi' })).toEqual({ ok: true, muuttui: false });
    expect(loki.update).toEqual([]); expect(loki.audit).toEqual([]);
  });
  it('suostumuksen jälkeen vaihto → severity warn; tyhjennys sallittu (null)', async () => {
    const a = ymp({ huoltajaEmail: 'h@tm-testi.fi', suostumusTila: 'annettu' });
    await a.aja({ huoltajaEmail: 'toinen@tm-testi.fi' });
    expect(a.loki.audit[0][1]).toMatchObject({ suostumus_annettu: true, severity: 'warn' });
    const b = ymp({ huoltajaEmail: 'h@tm-testi.fi' });
    await b.aja({ huoltajaEmail: '' });
    expect(b.loki.update[0].huoltajaEmail).toBeNull();
    expect(b.loki.audit[0][1].tyhjennetty).toBe(true);
  });
  it('virheellinen ja paikkamerkkiosoite hylätään ennen kirjoitusta', async () => {
    const { loki, aja } = ymp({ huoltajaEmail: null });
    await expect(aja({ huoltajaEmail: 'ei-osoite' })).rejects.toMatchObject({ code: 'invalid-argument', details: { syy: 'email_virheellinen' } });
    await expect(aja({ huoltajaEmail: 'h@example.com' })).rejects.toMatchObject({ code: 'invalid-argument', details: { syy: 'email_paikkamerkki' } });
    expect(loki.update).toEqual([]);
  });
  it('ei oikeutta → permission-denied; kirjautumaton → unauthenticated', async () => {
    const { aja } = ymp({ huoltajaEmail: null }, { oikeus: false, token: { seuraId: 'muu', rooli: 'vp' } });
    await expect(aja({ huoltajaEmail: 'a@tm-testi.fi' })).rejects.toMatchObject({ code: 'permission-denied' });
    const fn = HE.luoKasittelija({ db: {}, HttpsError, FieldValue: {}, tarkistaOikeus: async () => ({}) });
    await expect(fn({}, {})).rejects.toMatchObject({ code: 'unauthenticated' });
  });
  it('kytketty index.js:ään App Checkillä', () => {
    expect(INDEX).toMatch(/exports\.asetaHuoltajaEmail = functions\s*\.region\('europe-west1'\)\s*\.runWith\(\{ enforceAppCheck: true \}\)\s*\.https\.onCall\(huoltajaemail\.luoKasittelija\(pinDeps\)\)/);
  });
});

describe('suostumusTila kutsun jälkeen (palvelin)', () => {
  it('pilotti/puuttuva → odottaa; odottaa ja annettu ennallaan', () => {
    expect(S.suostumusTilaKutsunJalkeen({ suostumusTila: 'pilotti' })).toEqual({ suostumusTila: 'odottaa' });
    expect(S.suostumusTilaKutsunJalkeen({})).toEqual({ suostumusTila: 'odottaa' });
    expect(S.suostumusTilaKutsunJalkeen({ suostumusTila: 'odottaa' })).toBeNull();
    expect(S.suostumusTilaKutsunJalkeen({ suostumusTila: 'annettu' })).toBeNull();
    expect(S.suostumusTilaKutsunJalkeen({ suostumusTila: 'pilotti', suostumus: { annettu: true } })).toBeNull();
  });
  it('lahetaRekisteriKutsu päivittää tilan lähetyksen jälkeen pelaajaId:llä', () => {
    const f = INDEX.slice(INDEX.indexOf('exports.lahetaRekisteriKutsu'), INDEX.indexOf('exports.lahetaMuistutukset'));
    expect(f).toContain('suostumusTilaKutsunJalkeen(pSnap.data() || {})');
    expect(f.indexOf('await lahetaSahkoposti(')).toBeLessThan(f.indexOf('suostumusTilaKutsunJalkeen('));
  });
});

describe('Seura-sivu: ei suostumusTila- eikä huoltajaEmail-päivitystä selaimesta', () => {
  it('ei .update({ suostumusTila }) eikä _upd.suostumusTila', () => {
    expect(SEURA).not.toMatch(/\.update\(\{\s*suostumusTila/);
    expect(SEURA).not.toMatch(/_upd\.suostumusTila\s*=/);
  });
  it('pelaajamuokkaus: huoltajaEmail ei ole update-objektissa, vaihto asetaHuoltajaEmail-callablella', () => {
    const f = SEURA.slice(SEURA.indexOf('async function tallennaMusokkausPelaaja('), SEURA.indexOf('// SUPER ADMIN: JOUKKUEEN VAIHTO'));
    const paivitys = f.slice(f.indexOf('const paivitys = {'), f.indexOf('.update(paivitys)'));
    expect(paivitys).not.toMatch(/^\s*huoltajaEmail\s*:/m);
    expect(f).toContain("httpsCallable('asetaHuoltajaEmail')");
  });
  it('massakutsu välittää pelaajaId:n palvelimelle', () => {
    const f = SEURA.slice(SEURA.indexOf('async function lahetaMassakutsu('));
    expect(f.slice(0, 6000)).toContain('pelaajaId: p.pelaajaId || null');
  });
});

describe('suostumuslomake: ei pelaajan luontia selaimesta; "Pyydä seuralta uusi kutsu"', () => {
  it('vanha reitti poistettu (ei colRef.doc(), ei kirjautumatonta kutsut-updatea)', () => {
    expect(LOMAKE).not.toMatch(/pelRef2|colRef\.doc\(\)/);
    expect(LOMAKE).not.toMatch(/collection\('kutsut'\)\.doc\(_kutsuId\)\s*\.update/);
  });
  it('viesti näytetään latauksessa ja lähetys estetään ilman pelaajan tunnistetta (ajettu)', () => {
    const pura = (t) => { const a = LOMAKE.indexOf(t); let d = 0; for (let j = LOMAKE.indexOf(') {', a) + 2; ; j++) { if (LOMAKE[j] === '{') d++; else if (LOMAKE[j] === '}') { d--; if (!d) return LOMAKE.slice(a, j + 1); } } };
    const els = {}, v1 = { firstChild: null, insertBefore(n) { this.lisatty = n; } };
    const ctx = { el: (id) => (id === 'v1' ? v1 : els[id] || null), t: (k) => k,
      document: { createElement: () => ({ style: {}, setAttribute() {} }) } };
    vm.createContext(ctx);
    vm.runInContext(pura('function _uusiKutsuViesti() {') + '\n' + pura('function _naytaUusiKutsuIlmoitus() {') + '\nthis.nayta = _naytaUusiKutsuIlmoitus;', ctx);
    ctx.nayta();
    expect(v1.lisatty.textContent).toMatch(/^Pyydä seuralta uusi kutsu\./);
    expect(LOMAKE).toContain('if (_seuraId && !_pelaajaId) _naytaUusiKutsuIlmoitus();');
    expect(LOMAKE).toContain('if (_fbDb && _seuraId && !dokumenttiId) { var _uk = _uusiKutsuViesti(); toast(_uk, true); _naytaRistiriitaIlmoitus(_uk); return; }');
  });
  it('tekstit fi + en, sv odotuslistalla', () => {
    global.window = {}; require_(join(ROOT, 'lib', 'tm_lang.js')); const L = global.window.TM_LANG; delete global.window;
    expect(L.fi.suostumus.pyyda_uusi_kutsu).toMatch(/^Pyydä seuralta uusi kutsu\./);
    expect(L.en.suostumus.pyyda_uusi_kutsu).toMatch(/^Ask the club for a new invitation\./);
    expect(L.sv.suostumus.pyyda_uusi_kutsu).toBeUndefined();
    expect(require_('./tm_lang_sv_odotuslista.cjs')).toContain('suostumus.pyyda_uusi_kutsu');
  });
});
