/**
 * Vaihe 0 / PR 2b — Solo-sivut nimettyyn appiin + lapsen palvelinkirjautuminen.
 * Player_Home, Solo_Koti, Solo_Profiili → 'tm-solo' (vanhempi jatkaa Solo_Kotiin → sama istunto).
 * Solo_Lupa → 'tm-solo-lupa' (vanhemman hyväksyntäkirjautuminen ei korvaa lapsen istuntoa).
 * lapsiKirjaudu AJETAAN vm-hiekkalaatikossa (ei pelkkä lähdetarkistus).
 */
import { describe, it, expect } from 'vitest';
import { readFileSync } from 'fs';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';
import vm from 'vm';

const juuri = join(dirname(fileURLToPath(import.meta.url)), '..');
const lue = (n) => readFileSync(join(juuri, n), 'utf8');
const riisu = (s) => s.replace(/<!--[\s\S]*?-->/g, ' ').replace(/\/\*[\s\S]*?\*\//g, ' ').replace(/(^|[^:"'])\/\/[^\n]*/g, '$1 ');
const SIVUT = {
  'TalentMaster_Player_Home.html': 'tm-solo',
  'TalentMaster_Solo_Koti.html': 'tm-solo',
  'TalentMaster_Solo_Profiili.html': 'tm-solo',
  'TalentMaster_Solo_Lupa.html': 'tm-solo-lupa',
};

describe('Solo-sivut · nimetty appi', () => {
  for (const [nimi, appi] of Object.entries(SIVUT)) {
    it(nimi + " → '" + appi + "', App Check samaan appiin, ei oletusappikutsuja", () => {
      const S = lue(nimi); const K = riisu(S);
      expect(K.match(/firebase\.(auth|firestore|functions|storage)\(\)/g) || []).toEqual([]);
      expect(K.match(/firebase\.app\(\)/g) || []).toEqual([]);
      expect((K.match(/initializeApp\(/g) || []).length).toBe(1);
      const iInit = K.indexOf("}, '" + appi + "')");
      const iAc = K.indexOf('tmAppCheckAktivoi(app)');
      expect(iInit).toBeGreaterThan(0);
      expect(iAc).toBeGreaterThan(iInit);
      expect(iAc).toBeLessThan(K.indexOf('app.auth()'));
      expect(S).toContain('lib/tm_appcheck.js?v=2');
    });
  }
  it('Player_Home: Sentry ladataan (app:solo) ennen Firebasea, funktiot nimetystä appista', () => {
    const S = lue('TalentMaster_Player_Home.html');
    const iS = S.indexOf("window.TM_SENTRY={app:'solo'}");
    expect(iS).toBeGreaterThan(0);
    expect(S.indexOf('tm_sentry.js?v=1')).toBeGreaterThan(iS);
    expect(S.indexOf('firebase-app-compat.js')).toBeGreaterThan(S.indexOf('tm_sentry.js?v=1'));
    expect(riisu(S)).toContain("window._soloApp.functions('europe-west1').httpsCallable('soloLapsiKirjaudu')");
    expect(riisu(S)).toContain("window._soloApp.functions('europe-west1').httpsCallable('soloLupapyyntoEmail')");
  });
  it('lupakuuntelija ottaa playerCoden talteen hyväksynnästä', () => {
    expect(riisu(lue('TalentMaster_Player_Home.html'))).toContain('playerCode:d.playerCode||null');
  });
});

/* ── lapsiKirjaudu ajettuna ── */
function pura(K, tunniste) {
  const alku = K.indexOf(tunniste);
  if (alku < 0) throw new Error('ei löydy: ' + tunniste);
  let d = 0;
  for (let j = K.indexOf('{', alku); j < K.length; j++) {
    if (K[j] === '{') d++; else if (K[j] === '}') { d--; if (!d) return K.slice(alku, j + 1); }
  }
  throw new Error('sulkeet');
}
const PH = lue('TalentMaster_Player_Home.html');
const LAHDE = [
  "var _SOLO_VIRHE_TUNNISTUS = 'Tunnus tai PIN on väärin.';",
  pura(PH, 'function _soloVarapolunSyy('),
  pura(PH, 'function _soloRaportoiVarapolku('),
  'var _lapsiKesken = false;',
  pura(PH, 'async function lapsiKirjaudu('),
].join('\n');

function aja({ approved, kutsu }) {
  const loki = { kutsut: [], custom: [], anon: 0, sentry: [], feed: [], href: null, luettu: [] };
  const auth = {
    currentUser: null,
    signInWithCustomToken: async (t) => { loki.custom.push(t); auth.currentUser = { uid: 'solo_x' }; },
    signInAnonymously: async () => { loki.anon++; auth.currentUser = { uid: 'anon' }; },
  };
  const ls = new Map();
  const nappi = { disabled: false, textContent: 'Aloita →' };
  const ymp = {
    console: { warn() {}, log() {} },
    _fbReady: true, _auth: auth,
    _db: { collection: () => ({ doc: (id) => ({ get: async () => (loki.luettu.push(id), { exists: true, data: () => ({ nimi: 'Solo', playerCode: 'TMP-AB12CD' }) }) }) }) },
    _feed: (id, t) => loki.feed.push([id, t]),
    localStorage: { setItem: (k, v) => ls.set(k, v), getItem: (k) => ls.get(k) || null },
    document: { getElementById: () => nappi },
    JSON, String, Object, Error,
  };
  ymp.window = {
    _soloApproved: approved,
    _soloApp: { functions: () => ({ httpsCallable: (nimi) => async (data) => { loki.kutsut.push([nimi, data]); return kutsu(data); } }) },
    Sentry: { captureMessage: (m, o) => loki.sentry.push([m, o.tags.tm_varapolku]) },
    location: { set href(v) { loki.href = v; }, get href() { return loki.href; } },
  };
  vm.createContext(ymp);
  vm.runInContext(LAHDE, ymp);
  return { loki, ls, nappi, run: () => vm.runInContext('lapsiKirjaudu()', ymp) };
}
const OK = { playerId: 'solo1', playerCode: 'TMP-AB12CD', pin: '4821' };
const httpsVirhe = (code, message) => Object.assign(new Error(message), { code });

describe('Player_Home · lapsiKirjaudu (ajettu)', () => {
  it('palvelinreitti: soloLapsiKirjaudu({playerCode,pin}) → signInWithCustomToken, EI anonyymiä, EI Sentryä', async () => {
    const t = aja({ approved: OK, kutsu: async () => ({ data: { token: 'TOK', playerId: 'solo1' } }) });
    await t.run();
    expect(t.loki.kutsut).toEqual([['soloLapsiKirjaudu', { playerCode: 'TMP-AB12CD', pin: '4821' }]]);
    expect(t.loki.custom).toEqual(['TOK']);
    expect(t.loki.anon).toBe(0);
    expect(t.loki.sentry).toEqual([]);
    expect(t.loki.luettu).toEqual(['solo1']);
    expect(t.ls.get('tm_active_player')).toBe('solo1');
    expect(t.loki.href).toBe('TalentMaster_Solo_Koti.html');
  });
  it('infravirhe (App Check) → Sentry-hälytys syykoodilla + vanha anonyymi varapolku', async () => {
    const t = aja({ approved: OK, kutsu: async () => { throw httpsVirhe('functions/unauthenticated', 'App Check token is invalid.'); } });
    await t.run();
    expect(t.loki.sentry).toEqual([['soloLapsiKirjaudu → varapolku: app-check', 'app-check']]);
    expect(t.loki.anon).toBe(1);
    expect(t.loki.href).toBe('TalentMaster_Solo_Koti.html');
  });
  it("funktio puuttuu (not-found) / internal → varapolku + Sentry", async () => {
    for (const [code, syy] of [['functions/not-found', 'not-found'], ['functions/internal', 'internal'], ['functions/unavailable', 'unavailable']]) {
      const t = aja({ approved: OK, kutsu: async () => { throw httpsVirhe(code, 'x'); } });
      await t.run();
      expect(t.loki.sentry[0][1]).toBe(syy);
      expect(t.loki.anon).toBe(1);
    }
  });
  it('hyväksynnästä puuttuu playerCode (ennen PR 2b:tä) → varapolku syyllä ei-koodia, funktiota ei kutsuta', async () => {
    const t = aja({ approved: { playerId: 'solo1', playerCode: null, pin: '4821' }, kutsu: async () => ({}) });
    await t.run();
    expect(t.loki.kutsut).toEqual([]);
    expect(t.loki.sentry[0][1]).toBe('ei-koodia');
    expect(t.loki.anon).toBe(1);
  });
  it('väärä PIN / lukitus → EI varapolkua, EI siirtymää; virhe näytetään ja nappi vapautuu', async () => {
    for (const e of [httpsVirhe('functions/unauthenticated', 'Tunnus tai PIN on väärin.'), httpsVirhe('functions/resource-exhausted', 'Liian monta yritystä.')]) {
      const t = aja({ approved: OK, kutsu: async () => { throw e; } });
      await t.run();
      expect(t.loki.anon).toBe(0);
      expect(t.loki.sentry).toEqual([]);
      expect(t.loki.href).toBeNull();
      expect(t.loki.feed.length).toBe(1);
      expect(t.nappi.disabled).toBe(false);
    }
  });
  it('tuplaklikkaus ei aja kirjautumista kahdesti', async () => {
    let n = 0;
    const t = aja({ approved: OK, kutsu: async () => { n++; return { data: { token: 'T' } }; } });
    await Promise.all([t.run(), t.run()]);
    expect(n).toBe(1);
  });
});
