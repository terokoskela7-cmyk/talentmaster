/* L6 vaihe 2 (KYLMA_AVAUS_DIAGNOOSI §9.4 / §12) — kaikki Masterin skriptit `defer`, head-lohkot ulos, kirjautumisnapit tynkinä kunnes pääskripti ajaa. Muunnos on DEPLOY-aikainen (scripts/versiotiiviste.js);
   repo ennallaan. Vartioi: (1) muunnoksen yksikkösäännöt, (2) deploy-muotoisen Masterin rakenne (defer, järjestys, App Check -järjestys, CSP, ei SW-osumia), (3) kylma_aikajana.js:n init_ms + vesiputous. */
import { describe, it, expect } from 'vitest';
import { readFileSync } from 'fs';
import { createRequire } from 'module';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';
const require = createRequire(import.meta.url);
const JUURI = join(dirname(fileURLToPath(import.meta.url)), '..');
const VT = require('../scripts/versiotiiviste.js');
const MASTER = 'TalentMaster_Master_v16.html', M = VT.LYKKAYS[MASTER];
const r = VT.laske(JUURI), ulos = r.tiedostot[MASTER], main = r.tiedostot['tm_master_main.js'], alku = r.tiedostot[M.alku];
const tagit = [...ulos.matchAll(/<script\b[^>]*>/g)].map((m) => m[0]);
const src = (t) => { const m = /\bsrc="([^"]+)"/.exec(t); return m ? m[1] : null; };

describe('lisaaDefer (yksikkö)', () => {
  it('lisää deferin src-skripteille; ei koske defer/async/type-tageihin eikä inline-skripteihin; idempotentti', () => {
    const h = '<script src="a.js"></script><script src="b.js" defer></script><script async src="c.js"></script><script type="text/plain" data-tm-laiska src="d.js"></script><script type="module" src="e.js"></script><script>var x=1;</script><script src="https://x/y.js" integrity="sha384-z" crossorigin="anonymous"></script>';
    const o = VT.lisaaDefer(h);
    expect(o).toBe('<script src="a.js" defer></script><script src="b.js" defer></script><script async src="c.js"></script><script type="text/plain" data-tm-laiska src="d.js"></script><script type="module" src="e.js"></script><script>var x=1;</script><script src="https://x/y.js" integrity="sha384-z" crossorigin="anonymous" defer></script>');
    expect(VT.lisaaDefer(o)).toBe(o);
  });
});

describe('lykkaaSivu (yksikkö)', () => {
  const sivu = '<head><script>document.documentElement.classList.add(\'tm-auth-odottaa\');</script><script>window.TM_KAAVIO_HOST = {a:1};</script><script src="x.js"></script>' +
    '<script>window.__TM_SEURA = localStorage.getItem(\'tm-sa-seura\') || \'kpv\';</script><script>function _lataaDemoScript(c){}</script></head>';
  it('kolme lohkoa → yksi alku-tiedosto ensimmäisen paikalle (järjestys säilyy), tynkä + luokka + tyyli, defer', () => {
    const y = VT.lykkaaSivu(sivu, M); expect(y.virhe).toBeNull();
    expect(y.alku).toBe('window.TM_KAAVIO_HOST = {a:1};\n\nwindow.__TM_SEURA = localStorage.getItem(\'tm-sa-seura\') || \'kpv\';\n\nfunction _lataaDemoScript(c){}\n');
    expect(y.html.indexOf('<!--@@ALKU@@-->')).toBeGreaterThan(0); expect(y.html.indexOf('<!--@@ALKU@@-->')).toBeLessThan(y.html.indexOf('x.js')); expect(y.html.match(/@@ALKU@@/g)).toHaveLength(1);
    expect(y.html).toContain("classList.add('tm-auth-odottaa','tm-main-odottaa');window.login=window.kirjauduGooglella=window.loginDemo=window._unohditSalasana=function(){};");
    expect(y.html).toContain('html.tm-main-odottaa #sLogin button'); expect(y.html).toContain('<script src="x.js" defer>');
  });
  it('puuttuva lohko → virhe (deploy kaatuu, ei hiljaista ohitusta)', () => {
    expect(VT.lykkaaSivu(sivu.replace('window.TM_KAAVIO_HOST', 'window.MUU'), M).virhe).toMatch(/odotettiin 3/);
    expect(VT.lykkaaSivu(sivu.replace("classList.add('tm-auth-odottaa')", 'x'), M).virhe).toMatch(/tm-auth-odottaa/);
  });
  it('jo muunnettu sivu ei muutu (idempotentti)', () => {
    const y = VT.lykkaaSivu(sivu, M), valmis = y.html.replace('<!--@@ALKU@@-->', '<script src="tm_master_alku.js?v=abcd1234" defer></script>');
    const z = VT.lykkaaSivu(valmis, M); expect(z.virhe).toBeNull(); expect(z.alku).toBeNull(); expect(z.html).toBe(valmis);
  });
});

describe('Masterin deploy-muoto', () => {
  it('ei virheitä; jokainen ajettava <script src> on defer (type=text/plain-laiskatagit ennallaan); ei synkronisia skriptejä', () => {
    expect(r.virheet.filter((v) => v.indexOf(MASTER) >= 0)).toEqual([]);
    const ajettavat = tagit.filter((t) => src(t) && !/\btype=/.test(t)); expect(ajettavat.length).toBeGreaterThan(100);
    expect(ajettavat.filter((t) => !/\bdefer\b/.test(t))).toEqual([]);
    expect(tagit.filter((t) => /\basync\b/.test(t))).toEqual([]);
  });
  it('inline-skriptejä jää vain neljä pientä (versiotarkistus, odotustila+tynkä, upotettu-luokka, TM_SENTRY) — ei lib-riippuvuuksia latausaikana', () => {
    const inl = [...ulos.matchAll(/<script>([\s\S]*?)<\/script>/g)].map((m) => m[1]); expect(inl).toHaveLength(4);
    expect(Math.max(...inl.map((x) => x.length))).toBeLessThan(1500);
    for (const x of inl) expect(x).not.toMatch(/\b(masterT|tmAppCheckAktivoi|firebase\.(auth|firestore)|TM_[A-Z_]+\.)\b/);
  });
  it('JÄRJESTYS: alku-tiedosto ennen tm_kaavio_ui.js:ää ja tm-bus.js:ää; Sentry-asetus ennen tm_sentry.js:ää; pääskripti viimeisenä; SDK:t app → app-check → auth', () => {
    const jarj = tagit.filter(src).map(src).map((s) => s.replace(/\?.*/, '')), i = (nimi) => jarj.findIndex((s) => s.endsWith(nimi));
    expect(i('tm_master_alku.js')).toBeGreaterThanOrEqual(0); expect(i('tm_master_alku.js')).toBeLessThan(i('lib/tm_kaavio_ui.js')); expect(i('tm_master_alku.js')).toBeLessThan(i('tm-bus.js'));
    expect(i('tm_master_main.js')).toBe(jarj.length - 1);
    expect(i('firebase-app-compat.js')).toBeLessThan(i('firebase-app-check-compat.js')); expect(i('firebase-app-check-compat.js')).toBeLessThan(i('firebase-auth-compat.js'));
    expect(i('lib/tm_appcheck.js')).toBeLessThan(i('tm_master_main.js')); expect(i('tm_sentry.js')).toBeLessThan(i('firebase-app-compat.js'));
    expect(ulos.indexOf('window.TM_SENTRY={app:')).toBeLessThan(ulos.indexOf('<script src="tm_sentry.js'));
  });
  it('APP CHECK -JÄRJESTYS (vaihe 3: boot-tiedostossa): initializeApp → tmAppCheckAktivoi() → firebase.auth(); pääskriptissä vasta sitten ensimmäinen Firestore/Functions/Storage-kutsu eikä initiä/aktivointia lainkaan', () => {
    const boot = r.tiedostot[M.boot.tiedosto], a = boot.indexOf('firebase.initializeApp('), b = boot.indexOf('tmAppCheckAktivoi()'), c = boot.indexOf('firebase.auth()');
    expect(a).toBeGreaterThanOrEqual(0); expect(b).toBeGreaterThan(a); expect(c).toBeGreaterThan(b);
    expect(main).not.toContain('firebase.initializeApp('); expect(main).not.toContain('tmAppCheckAktivoi('); expect(main).not.toContain('const _auth');
    expect(main).toContain('const _db   = firebase.firestore();');   // Firestore-SDK ei kuulu auth-kriittiselle polulle → _db pääskriptissä, App Check on silloin jo aktivoitu
  });
  it('kirjautumisnapit: tynkä + luokka kunnes pääskripti ajaa; pääskripti vapauttaa heti \'use strict\' -rivin jälkeen (tasan kerran); oikeat funktiot määritellään pääskriptissä', () => {
    expect(main.startsWith("'use strict';\ndocument.documentElement.classList.remove('" + M.luokka + "');")).toBe(true); expect(main.split("classList.remove('" + M.luokka + "')")).toHaveLength(2);
    for (const n of M.tynkat) expect(new RegExp('(async function ' + n + '\\(|window\\.' + n + '\\s*=\\s*(async\\s*)?function)').test(main), n).toBe(true);
    expect(ulos).toContain("window.login=window.kirjauduGooglella=window.loginDemo=window._unohditSalasana=function(){};");
  });
  it('alku-tiedosto: lib-riippumaton (ei kutsu libejä latausaikana), tm-demo.js saa ?v:n', () => {
    expect(alku).toContain('window.TM_KAAVIO_HOST = {'); expect(alku).toContain('window.__TM_SEURA ='); expect(alku).toContain('function _lataaDemoScript(');
    expect(alku).toMatch(/s\.src = 'tm-demo\.js\?v=[0-9a-f]{8}'/); expect(alku.length).toBeLessThan(6000);
  });
  it('odotustilan sanamerkki (FCP) on repon CSS:ssä ja piilossa upotetussa tilassa', () => {
    const h = readFileSync(join(JUURI, MASTER), 'utf8'); expect(h).toContain('html.tm-auth-odottaa body::before{content:"TalentMaster™"'); expect(h).toContain('html.tm-upotettu body::before{display:none}');
  });
});

describe('CSP, SW ja deploy', () => {
  it('Hosting-CSP sallii omat skriptit (script-src \'self\') → tm_master_alku.js / tm_master_main.js toimivat; inline pysyy sallittuna', () => {
    const fb = JSON.parse(readFileSync(join(JUURI, 'firebase.json'), 'utf8')), h = Array.isArray(fb.hosting) ? fb.hosting[0] : fb.hosting;
    const csp = h.headers.flatMap((x) => x.headers).find((x) => x.key === 'Content-Security-Policy').value, ss = /script-src ([^;]+)/.exec(csp)[1];
    expect(ss).toContain("'self'"); expect(ss).toContain("'unsafe-inline'");
    expect(h.ignore.some((g) => /^(\*\*\/)?tm_master/.test(g) || g === '*.js' || g === '**/*.js')).toBe(false);   // uudet juuritiedostot julkaistaan
  });
  it('Masterilla ei ole service workeria eikä yksikään SW nimeä Masterin tiedostoja', () => {
    for (const f of ['sw_pelaaja.js', 'sw_vanhempi.js', 'sw_adar.js']) expect(readFileSync(join(JUURI, f), 'utf8')).not.toMatch(/tm_master_(alku|main)|Master_v16/);
  });
  it('alku-tiedosto saa ?v:n sisällöstä (QG-2) ja repoon ei jää irrotettuja tiedostoja', () => {
    expect(r.raportti.sivut[MASTER][M.alku]).toMatch(/^[0-9a-f]{8}$/); expect(ulos).toContain('<script src="' + M.alku + '?v=' + r.raportti.sivut[MASTER][M.alku] + '" defer></script>');
    expect(VT.tarkistaRepo(JUURI)).toEqual([]);
  });
});

describe('kylma_aikajana.js — init_ms + vesiputous (L4/L6-mittaus)', () => {
  const kuva = readFileSync(join(JUURI, 'scripts/kuorma/kylma_aikajana.js'), 'utf8');
  it('mittaa initializeApp-hetken (init_ms), DCL:n ja skriptikohtaisen vesiputouksen (haku, ajon alku, kesto, defer); --deploy palvelee deploy-muotoa', () => {
    for (const k of ['init_ms', 'dcl_ms', 'vesiputous', 'haku_alkaa_ms', 'haku_valmis_ms', 'ajo_alkaa_ms', 'ajo_kesto_ms', 'skriptit_defer', '--deploy', "require('../versiotiiviste.js').laske"]) expect(kuva, k).toContain(k);
    expect(() => new (require('vm').Script)(kuva.replace(/^#!.*/, ''))).not.toThrow();
  });
});
