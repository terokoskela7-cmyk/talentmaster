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
    // PR 4: tulos (PIN + koodi) alidokumentista tulos/{token}, ei päädokumentista
    const PHK = riisu(lue('TalentMaster_Player_Home.html'));
    expect(PHK).toContain('playerCode:t.playerCode||null');
    expect(PHK).toContain(".collection('tulos').doc(tok).onSnapshot(");
    expect(PHK).toContain('token_hash: await _soloTokenHash(tok)');
    expect(PHK).not.toMatch(/parent_email:em, token:tok/);
  });
});

/* ── lapsiKirjaudu ajettuna ── */
function pura(K, tunniste, alkaen = 0) {
  const alku = K.indexOf(tunniste, alkaen);
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
  "var _SOLO_VIRHE_INFRA = 'Kirjautuminen ei juuri nyt onnistu. Yritä hetken päästä uudelleen.';",
  "var _SOLO_VIRHE_EI_KOODIA = 'Kirjautuminen ei onnistu. Pyydä vanhempaa tekemään uusi lupapyyntö.';",
  pura(PH, 'function _soloInfraVirheenSyy('),
  pura(PH, 'function _soloRaportoiKirjautumisvirhe('),
  'var _lapsiKesken = false;',
  pura(PH, 'async function lapsiKirjaudu('),
].join('\n');

function aja({ approved, kutsu, fbReady = true }) {
  const loki = { kutsut: [], custom: [], anon: 0, sentry: [], feed: [], href: null, luettu: [] };
  const auth = {
    currentUser: null,
    signInWithCustomToken: async (t) => { loki.custom.push(t); auth.currentUser = { uid: 'solo_x' }; },
    signInAnonymously: async () => { loki.anon++; auth.currentUser = { uid: 'anon' }; },
  };
  const ls = new Map();
  const nappi = { disabled: false, textContent: 'Aloita →' };
  const ymp = {
    console: { warn() {}, log() {}, error() {} },
    _fbReady: fbReady, _auth: auth,
    _db: { collection: () => ({ doc: (id) => ({ get: async () => (loki.luettu.push(id), { exists: true, data: () => ({ nimi: 'Solo', playerCode: 'TMP-AB12CD' }) }) }) }) },
    _feed: (id, t) => loki.feed.push([id, t]),
    localStorage: { setItem: (k, v) => ls.set(k, v), getItem: (k) => ls.get(k) || null },
    document: { getElementById: () => nappi },
    JSON, String, Object, Error,
  };
  ymp.window = {
    _soloApproved: approved,
    _soloApp: { functions: () => ({ httpsCallable: (nimi) => async (data) => { loki.kutsut.push([nimi, data]); return kutsu(data); } }) },
    Sentry: { captureMessage: (m, o) => loki.sentry.push([m, o.tags.tm_kirjautumisvirhe, o.level]) },
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
  /* PR 3: ei anonyymiä varapolkua. Epäonnistuminen → virhe näkyviin + Sentry error, EI siirtymää Solo_Kotiin. */
  const INFRA = 'Kirjautuminen ei juuri nyt onnistu. Yritä hetken päästä uudelleen.';
  it('infravirhe (App Check) → selkeä virhe + Sentry error, EI anonyymiä, EI siirtymää, nappi vapautuu', async () => {
    const t = aja({ approved: OK, kutsu: async () => { throw httpsVirhe('functions/unauthenticated', 'App Check token is invalid.'); } });
    await t.run();
    expect(t.loki.sentry).toEqual([['soloLapsiKirjaudu epäonnistui: app-check', 'app-check', 'error']]);
    expect(t.loki.anon).toBe(0);
    expect(t.loki.luettu).toEqual([]);
    expect(t.loki.href).toBeNull();
    expect(t.loki.feed).toEqual([['feedWait', INFRA]]);
    expect(t.nappi.disabled).toBe(false);
  });
  it('funktio puuttuu (not-found) / internal / unavailable → virhe + Sentry, EI anonyymiä, EI siirtymää', async () => {
    for (const [code, syy] of [['functions/not-found', 'not-found'], ['functions/internal', 'internal'], ['functions/unavailable', 'unavailable']]) {
      const t = aja({ approved: OK, kutsu: async () => { throw httpsVirhe(code, 'x'); } });
      await t.run();
      expect(t.loki.sentry[0][1]).toBe(syy);
      expect(t.loki.anon).toBe(0);
      expect(t.loki.href).toBeNull();
    }
  });
  it('hyväksynnästä puuttuu playerCode → "Pyydä vanhempaa tekemään uusi lupapyyntö", funktiota ei kutsuta, EI siirtymää', async () => {
    const t = aja({ approved: { playerId: 'solo1', playerCode: null, pin: '4821' }, kutsu: async () => ({}) });
    await t.run();
    expect(t.loki.kutsut).toEqual([]);
    expect(t.loki.sentry[0][1]).toBe('ei-koodia');
    expect(t.loki.anon).toBe(0);
    expect(t.loki.href).toBeNull();
    expect(t.loki.feed).toEqual([['feedWait', 'Kirjautuminen ei onnistu. Pyydä vanhempaa tekemään uusi lupapyyntö.']]);
  });
  it('Firebase ei käytössä → virhe, EI siirtymää Solo_Kotiin', async () => {
    const t = aja({ approved: OK, fbReady: false, kutsu: async () => ({ data: { token: 'T' } }) });
    await t.run();
    expect(t.loki.kutsut).toEqual([]);
    expect(t.loki.href).toBeNull();
    expect(t.loki.feed).toEqual([['feedWait', INFRA]]);
  });
  it('sivulla ei ole signInAnonymously-kutsua (Player_Home, Solo_Koti)', () => {
    expect(riisu(PH)).not.toContain('signInAnonymously');
    expect(riisu(lue('TalentMaster_Solo_Koti.html'))).not.toContain('signInAnonymously');
  });
  it('väärä PIN / lukitus → EI Sentryä, EI siirtymää; virhe näytetään ja nappi vapautuu', async () => {
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

/* PR 3: PR 2b:n varapolulta jäänyt anonyymi tm-solo-istunto kirjataan ulos (Player_Home, Solo_Koti). */
describe('Solo · anonyymi istunto kirjataan ulos (ajettu)', () => {
  for (const nimi of ['TalentMaster_Player_Home.html', 'TalentMaster_Solo_Koti.html']) {
    const K = riisu(lue(nimi));
    const kuuntelija = pura(K, 'function(u){', K.indexOf('_auth.onAuthStateChanged('));
    function ajaK(u) {
      const loki = { ulos: 0, haku: 0 };
      const ymp = {
        console: { warn() {} },
        _auth: { signOut: () => { loki.ulos++; return Promise.resolve(); } },
        _uid: null, _email: null, _haeFirestore: () => { loki.haku++; },
      };
      vm.createContext(ymp);
      vm.runInContext('this.k = ' + kuuntelija, ymp);
      ymp.k(u);
      return { loki, ymp };
    }
    it(nimi + ': anonyymi → signOut, EI uid:tä eikä hakua', () => {
      const { loki, ymp } = ajaK({ uid: 'anon', isAnonymous: true });
      expect(loki.ulos).toBe(1);
      expect(ymp._uid).toBeNull();
      expect(loki.haku).toBe(0);
    });
    it(nimi + ': Solo-token / vanhempi → ei uloskirjausta', () => {
      const { loki, ymp } = ajaK({ uid: 'solo_x', isAnonymous: false });
      expect(loki.ulos).toBe(0);
      expect(ymp._uid).toBe('solo_x');
    });
  }
});

