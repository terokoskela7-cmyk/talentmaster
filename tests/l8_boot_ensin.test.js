/* L8 · vaihe 3 (KYLMA_AVAUS_DIAGNOOSI §13.3) — boot-tiedosto ENSIN: firebase.initializeApp + tmAppCheckAktivoi() + _auth ajetaan heti auth/App Check-SDK:iden jälkeen, ennen muita libejä ja pääskriptiä.
   Muunnos on DEPLOY-aikainen (scripts/versiotiiviste.js: erotaBoot, siirraBoot, esilataus; LYKKAYS[Master].boot); repo ennallaan. Vartioi: (1) muunnosten yksikkösäännöt (virhe, ei hiljaista ohitusta),
   (2) deploy-muodon rakenne (järjestys, prioriteetti, preload, EI HUKKAA, rollback = boot: null), (3) selain: initializeApp ajetaan ENNEN libejä, _auth/_db globaaleina, ei ReferenceErroria, App Check kerran per dokumentti. */
import { describe, it, expect } from 'vitest';
import { existsSync, readFileSync } from 'fs';
import { createRequire } from 'module';
import { createServer } from 'http';
import { fileURLToPath } from 'url';
import { dirname, join, extname } from 'path';
const require = createRequire(import.meta.url);
const JUURI = join(dirname(fileURLToPath(import.meta.url)), '..');
const VT = require('../scripts/versiotiiviste.js');
const MASTER = 'TalentMaster_Master_v16.html', M = VT.LYKKAYS[MASTER];
const SDK = (n) => '<script src="https://www.gstatic.com/firebasejs/9.22.1/firebase-' + n + '-compat.js"></script>';
const LOHKO = "const _FB = {\n  a:1\n};\nfirebase.initializeApp(_FB);\ntmAppCheckAktivoi();   // kommentti\nconst _auth = firebase.auth();";
const PAA = (lohko) => "'use strict';\n/* otsikko */\n" + lohko + "\nconst _db   = firebase.firestore();\nlet _user = null;\n";

describe('erotaBoot (yksikkö)', () => {
  it('lohko ulos täsmälleen; pääskripti saa merkkikommentin; _db jää pääskriptiin; boot alkaa \'use strict\'', () => {
    const e = VT.erotaBoot(PAA(LOHKO)); expect(e.virhe).toBeNull();
    expect(e.boot).toBe("'use strict';\n" + LOHKO + '\n');
    expect(e.main).toBe("'use strict';\n/* otsikko */\n/* tm_master_boot.js (deploy): _FB, firebase.initializeApp, tmAppCheckAktivoi, _auth */\nconst _db   = firebase.firestore();\nlet _user = null;\n");
    expect(e.main.replace(/\/\* tm_master_boot[^\n]*\*\//, LOHKO)).toBe(PAA(LOHKO));   // palautettavissa
  });
  it('virhe (deploy kaatuu): rajat puuttuvat/kahdesti, väärä järjestys, Firestore- tai tilariippuvuus lohkossa', () => {
    expect(VT.erotaBoot(PAA(LOHKO).replace('const _FB = {', 'const _XX = {')).virhe).toMatch(/rajoja/);
    expect(VT.erotaBoot(PAA(LOHKO) + LOHKO).virhe).toMatch(/rajoja/);
    expect(VT.erotaBoot(PAA(LOHKO.replace('firebase.initializeApp(_FB);\ntmAppCheckAktivoi();', 'tmAppCheckAktivoi();\nfirebase.initializeApp(_FB);'))).virhe).toMatch(/järjestyksessä/);
    expect(VT.erotaBoot(PAA(LOHKO.replace('const _auth', 'const _x = firebase.firestore();\nconst _auth'))).virhe).toMatch(/Firestore/);
    expect(VT.erotaBoot(PAA(LOHKO.replace('const _auth', '_user = 1;\nconst _auth'))).virhe).toMatch(/tilasta/);
  });
});

describe('siirraBoot (yksikkö)', () => {
  const AC = '<script src="lib/tm_appcheck.js"></script>', sivu = SDK('app') + SDK('auth') + SDK('firestore') + '<script src="lib/a.js"></script>' + AC + '<script src="lib/b.js"></script>';
  it('tm_appcheck-tagi auth-SDK:n perään + boot-paikanpitäjä; muu järjestys ennallaan', () => {
    const y = VT.siirraBoot(sivu); expect(y.virhe).toBeNull();
    expect(y.html).toBe(SDK('app') + SDK('auth') + '\n' + AC + '\n<!--@@BOOT@@-->' + SDK('firestore') + '<script src="lib/a.js"></script>' + '<script src="lib/b.js"></script>');
  });
  it('virhe: auth-SDK tai appcheck-tagi puuttuu/kahdesti, appcheck jo ennen authia', () => {
    expect(VT.siirraBoot(sivu.replace(SDK('auth'), '')).virhe).toMatch(/auth-compat/);
    expect(VT.siirraBoot(sivu.replace(AC, '')).virhe).toMatch(/tm_appcheck/);
    expect(VT.siirraBoot(sivu + AC).virhe).toMatch(/tm_appcheck/);
    expect(VT.siirraBoot(AC + SDK('auth')).virhe).toMatch(/jo ennen/);
  });
});

describe('esilataus (yksikkö)', () => {
  const sivu = '<head>\n<meta charset="utf-8">\n<meta name="viewport" content="x">\n<script src="https://x/firebase-app-compat.js" defer></script><script src="lib/m.js?v=abcd1234" defer></script><script src="lib/muu.js" defer></script></head>';
  it('ketjun tagit fetchpriority=high + preload (sama href) charset-metan JÄLKEEN; muut ennallaan; idempotentti', () => {
    const o = VT.esilataus(sivu, ['firebase-app-compat.js', 'lib/m.js']);
    expect(o).toContain('<meta charset="utf-8">\n<link rel="preload" as="script" href="https://x/firebase-app-compat.js" fetchpriority="high">\n<link rel="preload" as="script" href="lib/m.js?v=abcd1234" fetchpriority="high">\n<meta name="viewport"');
    expect(o).toContain('<script src="https://x/firebase-app-compat.js" defer fetchpriority="high"></script>'); expect(o).toContain('<script src="lib/m.js?v=abcd1234" defer fetchpriority="high"></script>');
    expect(o).toContain('<script src="lib/muu.js" defer></script>'); expect(VT.esilataus(o, ['firebase-app-compat.js', 'lib/m.js'])).toBe(o);
  });
});

describe('Masterin deploy-muoto (vaihe 3)', () => {
  const r = VT.laske(JUURI), html = r.tiedostot[MASTER], boot = r.tiedostot[M.boot.tiedosto], main = r.tiedostot['tm_master_main.js'];
  const tagit = [...html.matchAll(/<script\b[^>]*\bsrc="([^"]+)"[^>]*>/g)].map((m) => ({ tagi: m[0], src: m[1], nimi: m[1].replace(/\?.*/, '') }));
  const i = (osa) => tagit.findIndex((t) => t.nimi.endsWith(osa));
  it('ei virheitä; boot-tiedosto syntyy ja saa ?v:n sisällöstä (QG-2); kääntyy; ei sisällä Firestorea tai sovellustilaa', () => {
    expect(r.virheet.filter((v) => v.indexOf(MASTER) >= 0)).toEqual([]);
    expect(r.raportti.sivut[MASTER][M.boot.tiedosto]).toMatch(/^[0-9a-f]{8}$/); expect(html).toContain('<script src="' + M.boot.tiedosto + '?v=' + r.raportti.sivut[MASTER][M.boot.tiedosto] + '" defer fetchpriority="high"></script>');
    expect(() => new (require('vm').Script)(boot, { filename: 'tm_master_boot.js' })).not.toThrow(); expect(boot.length).toBeLessThan(1500);
    expect(boot).not.toMatch(/firestore|\b_db\b|\b_user\b|onAuthStateChanged/);
  });
  it('JÄRJESTYS: app → app-check → auth → tm_appcheck → boot → (Firestore-SDK ja kaikki muut libit) → pääskripti; Sentry ennen Firebasea', () => {
    expect(i('firebase-app-compat.js')).toBeLessThan(i('firebase-app-check-compat.js')); expect(i('firebase-app-check-compat.js')).toBeLessThan(i('firebase-auth-compat.js'));
    expect(i('firebase-auth-compat.js') + 1).toBe(i('lib/tm_appcheck.js')); expect(i('lib/tm_appcheck.js') + 1).toBe(i(M.boot.tiedosto));
    for (const t of tagit) if (/\blib\//.test(t.nimi) && !/tm_appcheck/.test(t.nimi) || /firestore|functions|storage/.test(t.nimi) && /gstatic/.test(t.src)) expect(i(M.boot.tiedosto), t.nimi).toBeLessThan(tagit.indexOf(t));
    expect(i('tm_master_main.js')).toBe(tagit.length - 1); expect(i('tm_sentry.js')).toBeLessThan(i('firebase-app-compat.js'));
  });
  it('PRIORITEETTI: täsmälleen ketju (5 tagia) fetchpriority=high + 5 preloadia samoilla href-osoitteilla; muut ei', () => {
    const korkeat = tagit.filter((t) => /fetchpriority="high"/.test(t.tagi)); expect(korkeat.map((t) => t.nimi.split('/').pop())).toEqual(M.boot.ketju.map((k) => k.split('/').pop()));
    const pre = [...html.matchAll(/<link rel="preload" as="script" href="([^"]+)" fetchpriority="high">/g)].map((m) => m[1]); expect(pre).toEqual(korkeat.map((t) => t.src));
    expect(html.indexOf('<meta charset')).toBeLessThan(html.indexOf('rel="preload"')); expect(html.indexOf('rel="preload"')).toBeLessThan(html.indexOf('<title>'));
    expect(html).not.toMatch(/<link rel="preload"[^>]*crossorigin/);   // tagit eivät käytä crossorigin → preload ei saa (muuten haetaan kahdesti)
  });
  it('App Check- ja init-vastuu vain boot-tiedostossa: kerran; pääskriptissä ei; HTML:ssä ei; kirjautumisnapit pääskriptissä kuten ennen', () => {
    const kerran = (s, x) => s.split(x).length - 1;
    for (const x of ['firebase.initializeApp(', 'tmAppCheckAktivoi()', 'const _auth', 'const _FB']) { expect(kerran(boot, x), x).toBe(1); expect(kerran(main, x), x).toBe(0); expect(kerran(html, x), x).toBe(0); }
    expect(kerran(main, 'const _db   = firebase.firestore();')).toBe(1); expect(main).toContain('_auth.onAuthStateChanged(');
  });
  it('ROLLBACK: LYKKAYS.boot = null → vaiheen 2 muoto (ei boot-tiedostoa, tm_appcheck alkuperäisellä paikallaan, init pääskriptissä, ei preloadeja)', () => {
    const vanha = M.boot; M.boot = null;
    try {
      const o = VT.laske(JUURI), h = o.tiedostot[MASTER], m = o.tiedostot['tm_master_main.js'];
      expect(o.virheet).toEqual([]); expect(o.tiedostot['tm_master_boot.js']).toBeUndefined(); expect(h).not.toMatch(/tm_master_boot|rel="preload"|fetchpriority/);
      expect(m).toContain('firebase.initializeApp(_FB);'); expect(m).toContain('tmAppCheckAktivoi();'); expect(m).toContain('const _auth = firebase.auth();');
      expect(h.indexOf('lib/tm_appcheck.js')).toBeGreaterThan(h.indexOf('firebase-storage-compat.js'));
    } finally { M.boot = vanha; }
  });
  it('muut sivut eivät muutu: boot koskee vain Masteria; repo ennallaan (ei boot-tiedostoa eikä ?v:itä)', () => {
    expect(Object.keys(r.tiedostot).filter((k) => /^tm_master_/.test(k)).sort()).toEqual(['tm_master_alku.js', 'tm_master_boot.js', 'tm_master_main.js']);
    expect(existsSync(join(JUURI, 'tm_master_boot.js'))).toBe(false); expect(readFileSync(join(JUURI, MASTER), 'utf8')).not.toContain('tm_master_boot'); expect(VT.tarkistaRepo(JUURI)).toEqual([]);
  });
});

const CHROME = [process.env.TM_CHROME_PATH, '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome', '/usr/bin/google-chrome', '/usr/bin/chromium'].filter(Boolean).find((p) => existsSync(p));
const MIME = { '.html': 'text/html', '.js': 'text/javascript', '.css': 'text/css', '.json': 'application/json' };
describe.skipIf(!(process.env.TM_CHROME_TESTS !== '0' && CHROME))('L8 · boot ensin (deploy-muoto, selain)', () => {
  it('initializeApp ajetaan ENNEN libejä ja pääskriptiä; _auth/_db globaaleina; ei ReferenceErroria; App Check ≤ 1 per dokumentti; kirjautumisnapit vapautuvat; muut sivuvirheet = vertailu (vaihe 2)', async () => {
    const aja = async (poistaBoot) => {
      const vanha = M.boot; if (poistaBoot) M.boot = null;
      const r = VT.laske(JUURI); M.boot = vanha;
      const srv = createServer((rq, rs) => {
        const p = decodeURIComponent(rq.url.split('?')[0]).replace(/^\//, ''), ov = Object.prototype.hasOwnProperty.call(r.tiedostot, p) ? r.tiedostot[p] : null, f = join(JUURI, p);
        if (ov === null && (!p || !existsSync(f) || !/\.[a-z]+$/.test(p))) { rs.statusCode = 404; return rs.end(); }
        rs.setHeader('content-type', MIME[extname(p)] || 'application/octet-stream'); rs.setHeader('cache-control', 'no-store'); rs.end(ov !== null ? Buffer.from(ov) : readFileSync(f));
      });
      await new Promise((ok) => srv.listen(0, '127.0.0.1', ok));
      const selain = await require('playwright-core').chromium.launch({ executablePath: CHROME, args: ['--no-sandbox'] });
      try {
        const sk = await selain.newContext(), p = await sk.newPage(), virheet = [], ac = [];
        await p.addInitScript(() => {   // initializeApp-hetken tila: onko mikään myöhemmin ladattava lib jo ajettu?
          let _fb; Object.defineProperty(window, 'firebase', { configurable: true, get() { return _fb; }, set(v) { _fb = v; try { const o = v.initializeApp; if (typeof o === 'function' && !v.__tmL8) { v.__tmL8 = 1; v.initializeApp = function () { if (!window.__initTila) window.__initTila = { kieliPaketit: typeof window.tmKieliPaketit, lang: typeof window.masterT, laiska: typeof window.tmLaiska, appcheck: typeof window.tmAppCheckAktivoi, pääskripti: typeof window.setWs }; return o.apply(this, arguments); }; } } catch (e) {} } });
        });
        p.on('pageerror', (e) => virheet.push(String(e && e.message))); p.on('console', (m) => { const t = m.text(); if (t.indexOf('[AppCheck] aktivoitu') === 0) ac.push(t); });
        await p.goto('http://127.0.0.1:' + srv.address().port + '/' + MASTER, { waitUntil: 'load' }); await p.waitForTimeout(2500);
        const t = await p.evaluate(() => ({ init: window.__initTila, tyypit: [typeof _auth, typeof _db, typeof _FB, typeof login, typeof setWs].join(','), apps: firebase.apps.length, luokka: document.documentElement.classList.contains('tm-main-odottaa'), asyncLogin: /^async/.test(String(window.login)) }));
        await sk.close(); return { t, virheet, ac };
      } finally { await selain.close(); srv.close(); }
    };
    const b = await aja(false), v2 = await aja(true);
    expect(b.t.init, 'initializeApp kutsuttu').toBeTruthy();
    expect(b.t.init).toEqual({ kieliPaketit: 'undefined', lang: 'undefined', laiska: 'undefined', appcheck: 'function', pääskripti: 'undefined' });   // boot ennen muita libejä ja pääskriptiä; tm_appcheck jo ladattu
    expect(v2.t.init.pääskripti).toBe('function');   // vertailu: vaiheessa 2 init tapahtuu vasta pääskriptin ajossa (kaikki libit ladattu)
    expect(b.t.tyypit).toBe('object,object,object,function,function'); expect(b.t.tyypit).toBe(v2.t.tyypit); expect(b.t.apps).toBe(1);
    expect(b.t.luokka).toBe(false); expect(b.t.asyncLogin).toBe(true);
    expect(b.virheet.filter((e) => /ReferenceError|is not defined|Identifier .* has already been declared/.test(e)), b.virheet.join('\n')).toEqual([]);
    expect(b.virheet).toEqual(v2.virheet);   // samat (hyvänlaatuiset) virheet kuin vaiheen 2 muodossa
    expect(b.ac.length).toBeLessThanOrEqual(1); expect(new Set(b.ac.map((x) => (/dok ([a-z0-9]+)/.exec(x) || [])[1])).size).toBeLessThanOrEqual(1);
  }, 120000);
});
