/**
 * Pieni korjaus-PR (Master_v16 + VP_v25; kaista Tero): (1) toast kaikkien modaalien yläpuolelle, (2) jaksonapit pelaajakortin otsikkoalueelle (lipun takana),
 * (3) tallennusvirheen syy (koodi) toastiin. Funktiot PURETAAN SIVUILTA ja AJETAAN (vm). Chrome-testi (z-index oikeasti ylimpänä) kuten kentta_k0: ohitetaan jos Chromea ei ole / TM_CHROME_TESTS=0.
 */
import { describe, it, expect } from 'vitest';
import { readFileSync, existsSync, mkdtempSync, writeFileSync } from 'fs';
import { createRequire } from 'module';
import { fileURLToPath, pathToFileURL } from 'url';
import { dirname, join } from 'path';
import { tmpdir } from 'os';
import { spawn } from 'child_process';
import vm from 'vm';
const require = createRequire(import.meta.url);
const juuri = join(dirname(fileURLToPath(import.meta.url)), '..');
const lue = (f) => readFileSync(join(juuri, f), 'utf8');
const AJ = require('../lib/tm_aloita_jakso.js'), VK = require('../lib/tm_virhekoodi.js');
const MASTER = lue('TalentMaster_Master_v16.html'), VP = lue('TalentMaster_VP_v25.html');
const pura = (src, tunniste) => { const i = src.indexOf(tunniste); if (i < 0) throw new Error('ei löydy: ' + tunniste); let d = 0; for (let k = src.indexOf('{', i); k < src.length; k++) { if (src[k] === '{') d++; else if (src[k] === '}' && !--d) return src.slice(i, k + 1); } throw new Error('ei sulkeva'); };
const SOVELLUKSET = [['Master', MASTER, /#toast-wrap\s*\{[^}]*\}/], ['VP', VP, /#toast\s*\{[^}]*\}/]];
const zToast = (css) => Number(/z-index:\s*(\d+)/.exec(css)[1]);

describe('1 · Toast kaikkien modaalien yläpuolelle', () => {
  for (const [nimi, src, re] of SOVELLUKSET) {
    it(nimi + ': toastin z-index > JOKAINEN muu z-index (modaalit 300–9600, reply-overlay 9998, …); ainoa korkeampi on VP:n ylärivin tilabanneri (yläreunassa, ei peitä toastia)', () => {
      const css = re.exec(src)[0], z = zToast(css); expect(z).toBeGreaterThanOrEqual(10000);
      const kaikki = [...src.matchAll(/z-index:\s*(\d+)/g)].map((m) => Number(m[1])).filter((n, i, a) => a.indexOf(n) === i);
      const korkeammat = kaikki.filter((n) => n > z);
      expect(korkeammat, 'korkeammat z-indexit').toEqual(nimi === 'VP' ? [99999] : []);   // VP: position:fixed;top:0 -banneri (rivi ~22794) — toast on alhaalla
      expect(kaikki.filter((n) => n >= 300 && n < z).length).toBeGreaterThan(2);   // ei vacuous: modaaleja on
    });
  }
  const CHROME = ['/Applications/Google Chrome.app/Contents/MacOS/Google Chrome', '/usr/bin/google-chrome', '/usr/bin/chromium', '/usr/bin/chromium-browser'].find((p) => existsSync(p));
  const KAYTOSSA = process.env.TM_CHROME_TESTS !== '0';
  for (const [nimi, src, re] of SOVELLUKSET) {
    ((CHROME && KAYTOSSA) ? it : it.skip)(nimi + ': headless-Chrome — toast on näkyvin elementti modaalin (z 9600, koko ruutu) päällä: elementFromPoint osuu toastiin', async () => {
      const css = re.exec(src)[0];
      const html = '<!doctype html><meta charset="utf-8"><style>html,body{margin:0;height:100%}' + css + '#toast.show{transform:translateY(0);opacity:1}</style>'
        + '<div id="modal" style="position:fixed;inset:0;z-index:9600;background:#222">modaali</div><div id="toast-wrap"><div id="toast-item" style="padding:12px 16px">Tallennus epäonnistui (permission-denied)</div></div><div id="toast" class="show ok" style="min-width:120px;min-height:20px">x</div>'
        + '<script>var el=document.getElementById(' + JSON.stringify(nimi === 'Master' ? 'toast-item' : 'toast') + '),r=el.getBoundingClientRect(),t=document.elementFromPoint(r.left+r.width/2,r.top+r.height/2);document.body.setAttribute("data-ylin",t&&t.id);document.body.setAttribute("data-valmis","1");</script>';
      const polku = join(mkdtempSync(join(tmpdir(), 'tm-toast-')), 'toast.html'); writeFileSync(polku, html);
      const profiili = mkdtempSync(join(tmpdir(), 'tm-chrome-'));
      const out = await new Promise((resolve, reject) => {
        const lapsi = spawn(CHROME, ['--headless=new', '--disable-gpu', '--no-sandbox', '--disable-dev-shm-usage', '--no-first-run', '--user-data-dir=' + profiili, '--window-size=800,600', '--virtual-time-budget=1500', '--dump-dom', pathToFileURL(polku).href], { stdio: ['ignore', 'pipe', 'ignore'] });
        let data = '', valmis = false; const lopeta = (fn) => { if (valmis) return; valmis = true; clearTimeout(ajastin); try { lapsi.kill('SIGKILL'); } catch (e) { /* päättynyt */ } fn(); };
        const ajastin = setTimeout(() => lopeta(() => reject(new Error('Chrome ei tuottanut DOM:ia'))), 30000);
        lapsi.stdout.setEncoding('utf8'); lapsi.stdout.on('data', (d) => { data += d; if (/<\/html>\s*$/i.test(data)) lopeta(() => resolve(data)); }); lapsi.on('close', () => lopeta(() => resolve(data)));
      });
      expect(out).toContain('data-valmis="1"'); expect(out).toContain('data-ylin="' + (nimi === 'Master' ? 'toast-item' : 'toast') + '"');
    }, 60000);
  }
});

describe('3 · tmVirheKoodi — virheen syy toastiin', () => {
  it('permission-denied / unavailable / muu koodi / tuntematon; siivottu (ei vapaata tekstiä)', () => {
    expect(VK.tmVirheKoodi({ code: 'permission-denied' })).toBe('permission-denied'); expect(VK.tmVirheKoodi({ code: 'unavailable' })).toBe('unavailable');
    expect(VK.tmVirheKoodi({ code: 'firestore/failed-precondition' })).toBe('failed-precondition'); expect(VK.tmVirheKoodi({ code: 'tm/ei-yhteytta' })).toBe('tm/ei-yhteytta');
    expect(VK.tmVirheKoodi(new Error('Missing or insufficient permissions for /seurat/kpv'))).toBe('tuntematon'); expect(VK.tmVirheKoodi(null)).toBe('tuntematon'); expect(VK.tmVirheKoodi({ code: 5 })).toBe('tuntematon');
    expect(VK.tmVirheKoodi({ code: 'Hei <b>PIN 1234</b> ääkköset' })).toMatch(/^[a-z0-9\-_/]+$/);   // ei HTML:ää, ei ääkkösiä
    expect(VK.tmVirheKoodi({ code: 'x'.repeat(100) })).toHaveLength(40);
    expect(VK.tmVirheTeksti('Tallennus epäonnistui', { code: 'permission-denied' })).toBe('Tallennus epäonnistui (permission-denied)');
  });
  for (const [nimi, src, t] of [['Master', MASTER, 'masterT'], ['VP', VP, 'vpT']]) {
    it(nimi + ': kutsukohdan lauseke = käännetty perusteksti + koodi; ilman libiä (esim. välimuisti) pelkkä perusteksti — ei ReferenceErroria', () => {
      const ilmaisu = "((typeof TM_VIRHEKOODI !== 'undefined' && TM_VIRHEKOODI.tmVirheTeksti) || String)(" + t + "('Tallennus epäonnistui'), e)";
      expect(src).toContain(ilmaisu);
      const a = { [t]: (x) => '«' + x + '»', e: { code: 'unavailable' }, TM_VIRHEKOODI: VK }; vm.createContext(a); expect(vm.runInContext(ilmaisu, a)).toBe('«Tallennus epäonnistui» (unavailable)');
      const b = { [t]: (x) => '«' + x + '»', e: { code: 'unavailable' } }; vm.createContext(b); expect(vm.runInContext(ilmaisu, b)).toBe('«Tallennus epäonnistui»');
    });
  }
  it('jakson tallennuspolkujen catch-haarat käyttävät koodillista toastia (Master: sulku, V1-aloitus, J2, K1-synka, treeniin vienti, fyysfokus · VP: _vpJfKirjoita, _vpTt); skriptit ladataan', () => {
    for (const k of ["console.warn('[msTallenna]'", "ilmoita(", "console.warn('[J2] kirjoitus:'", "console.warn('[K1] synka uudelleen:'", "console.warn('[ttVieTreeniin]'", "console.warn('[msAsetaFyysFokus]'"]) {
      const i = MASTER.indexOf(k === 'ilmoita(' ? "ilmoita((" : k); expect(i, k).toBeGreaterThan(-1); expect(MASTER.slice(i, i + 500), k).toContain('TM_VIRHEKOODI.tmVirheTeksti');
    }
    for (const k of ["console.warn('[vpJf]'", "console.warn('[vpTt]'"]) { const i = VP.indexOf(k); expect(i, k).toBeGreaterThan(-1); expect(VP.slice(i, i + 400), k).toContain('TM_VIRHEKOODI.tmVirheTeksti'); }
    for (const src of [MASTER, VP]) { expect(src).toMatch(/<script src="lib\/tm_virhekoodi\.js\?v=1"><\/script>/); expect(src).toMatch(/<script src="lib\/tm_aloita_jakso\.js\?v=6"><\/script>/); }
  });
});

describe('2 · Jaksonapit pelaajakortin otsikkoalueelle — lib', () => {
  const JAKSO = (lisa) => ({ id: 'p1', jaksofokus: Object.assign({ konsepti_avain: 'y_h1', konsepti_nimi: 'Haltuunotto', alkoi: '2026-11-09T10:00:00.000Z', kesto_vk: 4 }, lisa) });
  const o = { t: (k) => k, avaaFn: 'avaa', suljeFn: 'sulje' };
  it('ei jaksoa → "Aloita jakso", ei Sulje-nappia', () => { const h = AJ.tmJaksoNapitHTML({ id: 'p1' }, o); expect(h).toContain('Aloita jakso'); expect(h).toContain('data-jakso-nappi="aloita"'); expect(h).not.toContain('Sulje jakso'); expect(AJ.tmJaksoNapitTila({ id: 'p1' })).toEqual({ nappi: 'aloita', sulje: false }); });
  it('jakso käynnissä → "Muokkaa jaksoa" + "Sulje jakso"; napit kutsuvat samoja funktioita pelaajan id:llä', () => {
    const h = AJ.tmJaksoNapitHTML(JAKSO(), o); expect(h).toContain('Muokkaa jaksoa'); expect(h).toContain('Sulje jakso'); expect(h).toContain("avaa('p1')"); expect(h).toContain("sulje('p1')"); expect(AJ.tmJaksoNapitTila(JAKSO())).toEqual({ nappi: 'muokkaa', sulje: true });
  });
  it('pelaajan valinta odottaa (K3/D-1) → "Vahvista jakso"; tarjous/valittavana ei ole käynnissä → ei Sulje-nappia', () => {
    const p = { id: 'p1', jaksofokus: { tila: 'valittavana', vaihtoehdot: [] }, ydinvahvuus_valinta: { vaihtoehto: 'y_h1' } };
    expect(AJ.tmJaksoNapitHTML(p, o)).toContain('Vahvista jakso'); expect(AJ.tmJaksoNapitTila(p)).toEqual({ nappi: 'vahvista', sulje: false });
    expect(AJ.tmJaksoNapitTila({ id: 'p1', jaksofokus: { tila: 'valittavana', vaihtoehdot: [] } })).toEqual({ nappi: 'aloita', sulje: false });
    expect(AJ.tmJaksoNapitTila(JAKSO({ tila: 'valittavana' })).sulje).toBe(false);
  });
  it('nappi = tmJaksoNappi(p) (sama päättely kuin vanha rivi); id escapataan; ei pid:tä → tyhjä; ei hex-värejä', () => {
    for (const p of [{ id: 'a' }, JAKSO(), { id: 'a', jaksofokus: { konsepti_avain: 'x', tila: 'valittavana' }, ydinvahvuus_valinta: { vaihtoehto: 'x' } }]) expect(AJ.tmJaksoNapitTila(p).nappi).toBe(AJ.tmJaksoNappi(p));
    expect(AJ.tmJaksoNapitHTML({ id: '"><img src=x>' }, o)).not.toContain('<img'); expect(AJ.tmJaksoNapitHTML(null, o)).toBe(''); expect(AJ.tmJaksoNapitHTML(JAKSO(), o)).not.toMatch(/#[0-9a-f]{3,8}\b/i);
  });
});

describe('2 · Jaksonapit — adapterit (lipun takana; vanha sijainti jää)', () => {
  function ymp(src, nimi, { kentta = true, muokkaa = true, demo = false } = {}) {
    const el = { innerHTML: '' }, ajastettu = [], log = { avaa: 0 };
    const ctx = { window: { TM_ALOITA_JAKSO: AJ }, document: { getElementById: (id) => (id === (nimi === 'Master' ? 'mJaksoNapit_p1' : 'vpJaksoNapit_p1') ? el : null) }, setTimeout: (f) => ajastettu.push(f), console: { warn() {} }, Promise,
      _demo: demo, _isDemoMode: demo, _mEsc: (s) => s, _jsvEsc: (s) => s, masterT: (s) => s, vpT: (s) => s, _mIdpVoiMuokata: () => muokkaa, _mJjLataaLiput: async () => ({ kentta }), _vpLataaLiput: async () => ({ kentta }) };
    vm.createContext(ctx); const f = nimi === 'Master' ? '_mJaksoNapitHTML' : '_vpJaksoNapitHTML'; vm.runInContext(pura(src, 'function ' + f + '(') + '\nthis.f=' + f + ';', ctx);
    return { ctx, el, ajastettu, f: ctx.f };
  }
  for (const [nimi, src, avaa, sulje] of [['Master', MASTER, '_mAloitaJaksoAvaa', '_msSuljeJakso'], ['VP', VP, '_vpAloitaJaksoAvaa', '_vpSuljeJakso']]) {
    it(nimi + ': lippu päällä → nappi täytetään (tmJaksoNappi + Sulje jakso) ja kutsuvat ' + avaa + ' / ' + sulje, async () => {
      const e = ymp(src, nimi), p = { id: 'p1', jaksofokus: { konsepti_avain: 'y_h1', konsepti_nimi: 'H', alkoi: '2026-11-09T10:00:00.000Z' } };
      expect(e.f(p)).toContain('id="' + (nimi === 'Master' ? 'mJaksoNapit_p1' : 'vpJaksoNapit_p1') + '"'); await e.ajastettu[0]();
      expect(e.el.innerHTML).toContain('Muokkaa jaksoa'); expect(e.el.innerHTML).toContain(avaa + "(\\'p1\\')".replace(/\\/g, '')); expect(e.el.innerHTML).toContain(sulje + "('p1')");
    });
    it(nimi + ': lippu pois → ei nappeja (vain tyhjä paikka); demo → ei mitään; lib puuttuu → ei mitään', async () => {
      const e = ymp(src, nimi, { kentta: false }); e.f({ id: 'p1' }); await e.ajastettu[0](); expect(e.el.innerHTML).toBe('');
      expect(ymp(src, nimi, { demo: true }).f({ id: 'p1' })).toBe('');
      const l = ymp(src, nimi); l.ctx.window = {}; expect(l.f({ id: 'p1' })).toBe('');
    });
  }
  it('Master: ei muokkausoikeutta (toisen joukkueen pelaaja) → ei nappeja', async () => { const e = ymp(MASTER, 'Master', { muokkaa: false }); e.f({ id: 'p1' }); await e.ajastettu[0](); expect(e.el.innerHTML).toBe(''); });
  it('sijainti: Master pinfo-otsikko (heti pinfo-sub:n jälkeen, molemmat renderöijät) · VP:n pelaajakortin sticky-otsikko; vanhat sijainnit (_mAloitaJaksoRivi, Polku/Aloitus) jäävät', () => {
    const i = MASTER.indexOf("${_mJaksoNapitHTML(p)}"); expect(i).toBeGreaterThan(-1); expect(MASTER.slice(i - 300, i)).toContain('pinfo-sub'); expect(MASTER.slice(i, i + 40)).toContain('</div>');
    expect(MASTER).toContain("+ _mJaksoNapitHTML(p)"); expect(MASTER).toContain('h += _mAloitaJaksoRivi(p, editable);');
    const v = VP.indexOf('h += _vpJaksoNapitHTML(p);'); expect(v).toBeGreaterThan(-1); expect(VP.slice(v - 600, v)).toContain('position:sticky;top:0'); expect(VP).toContain('window._vpAloitaJaksoAvaa = async function'); expect(VP).toContain('window._vpSuljeJakso = async function');
  });
});
