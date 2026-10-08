/**
 * Pelaaja_v7 ilman verkkoa (1.10.2026). Teron lentotilatesti: Tulossa/Estynyt jäi vain muistiin, Kirjaa tehdyksi palasi
 * alkutilaan ilman viestiä. Firestoressa ei ole persistenssiä → set/commit jää ilman verkkoa odottamaan loputtomiin.
 * Kaikki ajetaan OIKEALLA sivukoodilla (vm), tyngät nimetty kuten tuotannossa.
 */
import { describe, it, expect } from 'vitest';
import { readFileSync } from 'fs';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';
import vm from 'vm';
import { lisaaP7Offline } from './_p7OfflineCtx.mjs';
import { lisaaVerkko } from './_verkkoCtx.mjs';

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..');
const SIVU = readFileSync(join(ROOT, 'TalentMaster_Pelaaja_v7.html'), 'utf8');
const EI_YHTEYTTA = 'Ei yhteyttä – kirjausta ei tallennettu. Kirjaa uudelleen, kun verkko palaa.';
function pura(t) {
  const a = SIVU.indexOf(t); if (a < 0) throw new Error('ei löydy: ' + t);
  let d = 0;
  for (let j = SIVU.indexOf('{', a); j < SIVU.length; j++) { if (SIVU[j] === '{') d++; else if (SIVU[j] === '}') { d--; if (!d) return SIVU.slice(a, j + 1); } }
  throw new Error('sulkeet');
}
const ikuinen = () => new Promise(() => {});

/* Kirjaus-ympäristö: kirjausDok.get / batch.commit ohjattavissa. */
function kirjausYmp({ onLine = true, get = 'ok', commit = 'ok', sessiot = [{ sk: 'valmentaja', lahde: 'valmentaja', rpe: 6, kesto_min: 90 }] } = {}) {
  const loki = { get: 0, batchSet: [], batchUpdate: [], commit: 0, toastit: [], vahvistettu: [] };
  const kirjausDok = { get: () => { loki.get++; if (get === 'heittaa') return Promise.reject(Object.assign(new Error('Failed to get document because the client is offline.'), { code: 'unavailable' }));
    if (get === 'jumi') return ikuinen(); return Promise.resolve({ exists: true, data: () => ({ sessiot }) }); } };
  const pelaajaDok = { collection: () => ({ doc: () => kirjausDok }) };
  const db = {
    collection: () => ({ doc: () => ({ collection: () => ({ doc: () => pelaajaDok }) }) }),
    batch: () => ({ set: (r, d, o) => loki.batchSet.push([d, o]), update: (r, d) => loki.batchUpdate.push(d),
      commit: () => { loki.commit++; return commit === 'jumi' ? ikuinen() : Promise.resolve(); } }),
  };
  const ctx = {
    console: { log() {}, warn() {} }, navigator: { onLine, vibrate() {} },
    window: { _db: db, _seuraId: 'kpv', _auth: { currentUser: { getIdToken: async () => 't' } } },
    firebase: { firestore: { Timestamp: { fromDate: (d) => d }, FieldValue: { serverTimestamp: () => 'TS' } } },
    _isDemoUser: false, _pelaaja: { id: 'm93', seuraId: 'kpv', xp: 100, etunimi: 'Topias' },
    _paivaIso: () => '2026-10-01', t: (k) => (k === 'pelaaja.ei_yhteytta_kirjaus' ? EI_YHTEYTTA : k),
    _naytaKirjausVirhe: (v) => loki.toastit.push(v), _naytaInfoToast: (v) => loki.toastit.push('INFO ' + v),
    _harjoiteVahvistus: (id) => loki.vahvistettu.push(id), _merkitseNappiTehdyksi() {},
    _onkoKirjattuTanaan: async () => false, setTimeout, clearTimeout, Promise, Object, Array, String, Date, Error,
  };
  vm.createContext(ctx); lisaaP7Offline(ctx);
  vm.runInContext('var _P7_AIKARAJA_MS = 30; var _streak = 3, _streakLastDate = "2026-09-30";\n'
    + pura('async function _tallennaKirjaus(') + '\n' + pura('async function _kirjaaHarjoite(') + '\nthis.tila = () => ({ streak: _streak });', ctx);
  return { ctx, loki };
}

describe('_tallennaKirjaus — P0 eheys', () => {
  it('päivän dokumentin luku heittää → koko kirjaus keskeytetään, batch ei kirjoita mitään, virhe kutsujalle', async () => {
    const { ctx, loki } = kirjausYmp({ get: 'heittaa' });
    await expect(ctx._tallennaKirjaus('T', 20, true, {})).rejects.toMatchObject({ code: 'unavailable' });
    expect(loki.batchSet).toEqual([]); expect(loki.batchUpdate).toEqual([]); expect(loki.commit).toBe(0);
    expect(ctx._pelaaja.xp).toBe(100); expect(ctx.tila().streak).toBe(3);
  });
  it('onnistunut luku → valmentajan saman päivän sessio säilyy, pelaajan sessio lisätään', async () => {
    const { ctx, loki } = kirjausYmp();
    await ctx._tallennaKirjaus('T', 20, true, { kesto_min: 15, rpe: 4 });
    const sessiot = loki.batchSet[0][0].sessiot;
    expect(sessiot.map((s) => s.sk)).toEqual(['valmentaja', 'pelaaja:T']);
    expect(loki.batchSet[0][1]).toEqual({ merge: true });
    expect(ctx._pelaaja.xp).toBe(120); expect(ctx.tila().streak).toBe(4);
  });
});

describe('_tallennaKirjaus / _kirjaaHarjoite — ilman verkkoa', () => {
  it('navigator.onLine === false → ei lukua eikä kirjoitusta; toast "Ei yhteyttä…", XP ennallaan', async () => {
    const { ctx, loki } = kirjausYmp({ onLine: false });
    await ctx._kirjaaHarjoite('D');
    expect(loki.get).toBe(0); expect(loki.commit).toBe(0);
    expect(loki.toastit).toEqual([EI_YHTEYTTA]); expect(loki.vahvistettu).toEqual([]);
    expect(ctx._pelaaja.xp).toBe(100);
  });
  it('commit ei valmistu aikarajassa → "Ei yhteyttä…", XP ja streak EIVÄT kasva paikallisesti', async () => {
    const { ctx, loki } = kirjausYmp({ commit: 'jumi' });
    await ctx._kirjaaHarjoite('S');
    expect(loki.commit).toBe(1);
    expect(loki.toastit).toEqual([EI_YHTEYTTA]); expect(loki.vahvistettu).toEqual([]);
    expect(ctx._pelaaja.xp).toBe(100); expect(ctx.tila().streak).toBe(3);
  });
  it('luku jää jumiin (offline) → aikaraja, ei kirjoitusta', async () => {
    const { ctx, loki } = kirjausYmp({ get: 'jumi' });
    await ctx._kirjaaHarjoite('T');
    expect(loki.commit).toBe(0); expect(loki.toastit).toEqual([EI_YHTEYTTA]);
  });
  it('aikaraja on 8 s tuotannossa', () => { expect(SIVU).toContain('const _P7_AIKARAJA_MS = 8000;'); });
});

describe('_p7MerkitseLasna (RSVP)', () => {
  function rsvp({ onLine = true, get = 'ok', set = 'ok' } = {}) {
    const loki = { set: 0, toastit: [], piirrot: [] };
    const ev = { id: 'e1', _omaSaatavuus: 'estynyt' };
    /* B4: yhteystesti tehdään OMAAN lasnaolijat-dokumenttiin (kalenteridokumentin suora luku loppuu Rules v3.55:ssä) */
    const oma = { get: () => (get === 'jumi' ? ikuinen() : Promise.resolve({ exists: false })), set: () => { loki.set++; return set === 'jumi' ? ikuinen() : Promise.resolve(); } };
    const tapahtuma = { collection: () => ({ doc: () => oma }) };
    const ctx = {
      console: { warn() {} }, navigator: { onLine }, setTimeout, clearTimeout, Promise, Object,
      window: { _p7Kalenteri: [ev], _db: { collection: () => ({ doc: () => ({ collection: () => ({ doc: () => tapahtuma }) }) }) }, _auth: { currentUser: null } },
      _isDemoUser: false, _pelaaja: { id: 'm93', seuraId: 'kpv' }, draw: () => loki.piirrot.push(ev._omaSaatavuus),
      t: (k) => (k === 'pelaaja.ei_yhteytta_kirjaus' ? EI_YHTEYTTA : k), _naytaKirjausVirhe: (v) => loki.toastit.push(v),
    };
    vm.createContext(ctx); lisaaP7Offline(ctx);
    vm.runInContext('var _P7_AIKARAJA_MS = 30;\n' + pura('async function _p7MerkitseLasna('), ctx);
    return { ctx, loki, ev };
  }
  it('offline → edellinen valinta palautetaan, viesti näytetään, ei kirjoitusta jonoon', async () => {
    const { ctx, loki, ev } = rsvp({ onLine: false });
    await ctx._p7MerkitseLasna('e1', 'tulossa');
    expect(ev._omaSaatavuus).toBe('estynyt'); expect(loki.set).toBe(0); expect(loki.toastit).toEqual([EI_YHTEYTTA]);
  });
  it('yhteystesti (luku) jää jumiin → palautus, ei kirjoitusta', async () => {
    const { ctx, loki, ev } = rsvp({ get: 'jumi' });
    await ctx._p7MerkitseLasna('e1', 'tulossa');
    expect(ev._omaSaatavuus).toBe('estynyt'); expect(loki.set).toBe(0);
  });
  it('tallennus ei valmistu aikarajassa → palautus + viesti', async () => {
    const { ctx, loki, ev } = rsvp({ set: 'jumi' });
    await ctx._p7MerkitseLasna('e1', 'tulossa');
    expect(ev._omaSaatavuus).toBe('estynyt'); expect(loki.toastit).toEqual([EI_YHTEYTTA]);
  });
  it('onnistuu → uusi valinta jää', async () => {
    const { ctx, loki, ev } = rsvp();
    await ctx._p7MerkitseLasna('e1', 'tulossa');
    expect(ev._omaSaatavuus).toBe('tulossa'); expect(loki.set).toBe(1); expect(loki.toastit).toEqual([]);
  });
});

describe('_kirjaudu ilman verkkoa (offline-avaus → PIN)', () => {
  function kirjaudu({ onLine = true, kutsu }) {
    const loki = { kutsut: 0, virhe: [], sentry: [] };
    const ctx = {
      console: { error() {}, warn() {} }, navigator: { onLine }, setTimeout: (f) => setTimeout(f, 0), clearTimeout, Promise, Object, String, Error,
      document: { getElementById: (id) => (id === 'pinTunnus' ? { value: '1234567' } : null) },
      localStorage: { setItem() {}, removeItem() {} },
      window: { _auth: { signInWithCustomToken: async () => {} }, _db: {},
        _fbApp: { functions: () => ({ httpsCallable: () => () => { loki.kutsut++; return kutsu(); } }) },
        Sentry: { captureMessage: (m, o) => loki.sentry.push([m, o.level]) } },
      _pin: '123456', draw() {}, _kirjautuminenKesken: false, _pinIlmoitus: '', _URL: { pelaajaId: null, seuraId: null },
      _pinPalloIdTila: false, _TUNNUS_LS: 'x', _PK_VIRHE_TUNNISTUS: 'Tunnus tai PIN on väärin.', _PK_VIRHE_INFRA: 'infra',
      _pinVirhe: (t) => loki.virhe.push(t), _lataaOmaPelaaja: async () => true,
    };
    vm.createContext(ctx); lisaaVerkko(ctx); lisaaP7Offline(ctx);
    vm.runInContext([pura('function _infraVirheenSyy('), pura('function _raportoiKirjautumisvirhe('), pura('function _linkkiKirjautuminen('),
      pura('async function _kirjaudu(')].join('\n'), ctx);
    return { ctx, loki };
  }
  it('navigator.onLine === false → heti Yhteyskatko, ei kutsua eikä Sentryä', async () => {
    const { ctx, loki } = kirjaudu({ onLine: false, kutsu: () => Promise.resolve({}) });
    await ctx._kirjaudu('123456');
    expect(loki.kutsut).toBe(0); expect(loki.virhe).toEqual(['Yhteyskatko – yritä hetken kuluttua uudelleen']); expect(loki.sentry).toEqual([]);
  });
  it('kutsu jää jumiin (App Check -token ei valmistu offline) → aikaraja, 1 uusi yritys, Yhteyskatko + warning', async () => {
    const { ctx, loki } = kirjaudu({ kutsu: ikuinen });
    await ctx._kirjaudu('123456');
    expect(loki.kutsut).toBe(2); expect(loki.virhe).toEqual(['Yhteyskatko – yritä hetken kuluttua uudelleen']);
    expect(loki.sentry).toEqual([['pelaajaKirjaudu: verkkokatko', 'warning']]);
  });
});

describe('rakenne', () => {
  it('ei enablePersistenceä (alaikäisen tiedot yhteiskäyttöisellä laitteella)', () => {
    expect(SIVU).not.toMatch(/\.enablePersistence\(|enableIndexedDbPersistence\(|persistentLocalCache\(/);
  });
  it('SW-allowlist kattaa JOKAISEN Pelaaja_v7:n oman <script src> (offline-avaus)', () => {
    const sw = readFileSync(join(ROOT, 'sw_pelaaja.js'), 'utf8');
    const onAllowlist = new Function(sw.slice(sw.indexOf('function onAllowlist'), sw.indexOf("self.addEventListener('fetch'")) + ';return onAllowlist;')();
    const omat = [...SIVU.matchAll(/<script[^>]+src="([^"]+)"/g)].map((m) => m[1]).filter((s) => !/^https?:/.test(s));
    expect(omat.length).toBeGreaterThan(15);
    expect(omat.filter((s) => !onAllowlist('https://x/talentmaster/' + s))).toEqual([]);
  });
  it('tekstit tm_langissa fi + en (+ sv Geminiltä)', () => {
    const L = readFileSync(join(ROOT, 'lib', 'tm_lang.js'), 'utf8');
    expect(L).toContain("ei_yhteytta_kirjaus:    '" + EI_YHTEYTTA + "'");
    expect(L).toContain("ei_yhteytta_kirjaus:    'No connection – your entry was not saved. Log it again when you are back online.'");
    expect(readFileSync(join(ROOT, 'tests', 'tm_lang_sv_odotuslista.cjs'), 'utf8')).not.toContain("'pelaaja.ei_yhteytta_kirjaus'");   // sv Geminiltä 1.10.2026
  });
});
