/* K1b kohta 3 · Kenttä: ydinasiakirjaimet pois ja nimi-tarra. (a) tmKenttaTarra-päätökset kaikille aluejaon alueille, (b) spec ilmanOsia, (c) selain: tarra pysyy kentän sisällä eikä peitä aluetta (kapea reuna-alue + keskialue,
   390 + 1280 px, tumma + vaalea teema, pelaaja + henkilökunta — sama komponentti, D98). TM_KUVAT=1 tallentaa kuvat docs/ui-kuvat/k1b/. Vain keksityt nimet. */
import { describe, it, expect } from 'vitest';
import { mkdirSync } from 'fs';
import { join } from 'path';
import { createRequire } from 'module';
import { selainKaynnista, CHROME, JUURI } from './helpers/kt_sivu.mjs';
const require = createRequire(import.meta.url);
const K = require('../lib/tm_kentta.js'), S = require('../lib/tm_kentta_spec.js'), A = require('../lib/tm_kt_alue.js');
const KUVAT = join(JUURI, 'docs', 'ui-kuvat', 'k1b');
const ALUEET = ['8v8', '11v11'].flatMap((m) => A.tmKtAlueet(m).map((z) => ({ avain: m + ':' + z.avain, x: z.x, y: z.y, w: z.w, h: z.h })));
const NIMET = ['1. kosketus', 'Käännä pää pallon ollessa matkalla'];

describe('tmKenttaTarra: paikka alueen koon mukaan', () => {
  it('kapea (< 30 yks.) reuna-alue → viereen leveämmälle puolelle; leveä ja riittävän korkea → sisällä; matala leveä → alle tai ylös', () => {
    const t = (a, H) => K.tmKenttaTarra(a, H || 84).paikka;
    expect(t({ x: 0, y: 0, w: 25, h: 70 })).toBe('oikea'); expect(t({ x: 75, y: 0, w: 25, h: 70 })).toBe('vasen');
    expect(t({ x: 25, y: 35, w: 50, h: 61 })).toBe('sisalla'); expect(t({ x: 25, y: 0, w: 50, h: 35 })).toBe('sisalla');
    expect(t({ x: 0, y: 122, w: 100, h: 18 }, 140)).toBe('ylos'); expect(t({ x: 0, y: 40, w: 100, h: 18 }, 140)).toBe('alle');
  });
  it('jokaisen aluejaon alueen tarra on tuettu paikka; kapeat ovat aina oikea/vasen ja osoittavat vapaampaan reunaan', () => {
    for (const a of ALUEET) {
      const r = K.tmKenttaTarra(a, 140); expect(['sisalla', 'oikea', 'vasen', 'alle', 'ylos'], a.avain).toContain(r.paikka);
      if (a.w < 30) expect(r.paikka, a.avain).toBe(100 - (a.x + a.w) >= a.x ? 'oikea' : 'vasen');
      expect(r.paikka === 'sisalla' ? r.tyyli : 'x', a.avain).toBe(r.paikka === 'sisalla' ? '' : 'x');
    }
  });
  it('tmKentta: sisällä-tilassa nimi on .kt-ase-laatikon sisällä (ennallaan); muuten oma .kt-ase-tarra + tyhjä .kt-ase; data.tarra kertoo paikan; ei a–e-merkkejä', () => {
    const spec = (alue) => ({ koko: 'puoli', ase: { alue, nimi: 'X-nimi', tila: 'ok' }, osat: [] });
    const sis = K.tmKentta(spec({ x: 25, y: 35, w: 50, h: 40 }), { wrap: true, rooli: 'henkilokunta' });
    expect(sis).toMatch(/<div class="kt-ase" style="[^"]*"><b>X-nimi<\/b><span>ydinvahvuus<\/span><\/div>/); expect(sis).not.toContain('kt-ase-tarra');
    const kap = K.tmKentta(spec({ x: 0, y: 0, w: 25, h: 70 }), { rooli: 'pelaaja' });
    expect(kap.data.tarra).toBe('oikea'); expect(kap.html).toMatch(/<div class="kt-ase" style="[^"]*"><\/div><div class="kt-ase-tarra kt-ase-tarra-oikea" data-kt-tarra="oikea"[^>]*><b>X-nimi<\/b><span>sinun vahvuutesi<\/span><\/div>/);
    expect(K.tmKentta(spec({ x: 25, y: 35, w: 50, h: 40 }), { rooli: 'pelaaja' }).data.tarra).toBe('sisalla');
  });
  it('tmKenttaSpec ilmanOsia: osat tyhjät vaikka jakso ja osat ovat olemassa; ilman lippua osat tulevat kuten ennen', () => {
    const TK = require('../lib/tm_tanaan_kentta.js');
    const p = { id: 'p2', syntymaVuosi: 2013, ydinvahvuus: { kuvaus: 'X', alue: { x: 25, y: 35, w: 50, h: 61 } }, jaksofokus: { konsepti_avain: 'y_h1', konsepti_nimi: 'Haltuunotto', alkoi: new Date(2026, 9, 5).toISOString(), kesto_vk: 6, osat: ['Käännä pää', 'Valitse suunta', 'Ota haltuun'] } };
    const ctx = { rooli: 'henkilokunta', tanaan: '2026-10-19' };
    expect(TK.tmTanaanTila(p, { tanaan: ctx.tanaan }).tila).toBe('jakso');
    const ilman = S.tmKenttaSpec(p, Object.assign({}, ctx, { ilmanOsia: true })), kanssa = S.tmKenttaSpec(p, ctx);
    expect(ilman.osat).toEqual([]); expect(ilman.ase.nimi).toBe('X'); expect(kanssa.osat.length).toBeGreaterThan(0);
  });
  it('Kehitystyöpöytä-sivu ei pyydä ydinasiapisteitä (osaPisteet pois) ja v2-spec rakennetaan ilmanOsia', async () => {
    const { readFileSync } = await import('fs');
    const SIVU = readFileSync(join(JUURI, 'TalentMaster_Kehitystyopoyta.html'), 'utf8'), LIB = readFileSync(join(JUURI, 'lib/tm_kehitystyopoyta.js'), 'utf8');
    expect(SIVU).not.toMatch(/osaPisteet:\s*true/); expect(LIB).toMatch(/ilmanOsia: c\.v2 === true/); expect(LIB).not.toMatch(/pisteet: c\.v2 === true/);
  });
});

const PROBE = (html, teema, leveys) => '<!doctype html><html data-theme="' + teema + '"><head><meta charset="utf-8"><style>'
  + ':root[data-theme="dark"]{--bg:#111110;--ink:#EDECE6;--teal:#28B090;--teal-dim:rgba(40,176,144,.14);--chalk:#8C8B86;--chalk2:#6E6D68;--amber:#E0A040;--amber-dim:rgba(224,160,64,.16);--blue:#2A5DB0}'
  + ':root[data-theme="light"]{--bg:#F4F2EC;--ink:#1C1C1A;--teal:#1A7A5E;--teal-dim:rgba(26,122,94,.12);--chalk:#8C8B86;--chalk2:#A8A7A2;--amber:#B07820;--amber-dim:rgba(176,120,32,.14);--blue:#2A5DB0}'
  + 'body{margin:0;padding:16px;background:var(--bg);color:var(--ink);font:14px system-ui,sans-serif}#k{width:' + leveys + 'px}' + K.tmKenttaCss() + '</style></head><body><div id="k">' + html + '</div></body></html>';

describe.skipIf(!(process.env.TM_CHROME_TESTS !== '0' && CHROME))('Kenttä: tarra selaimessa', () => {
  it('jokainen alue × nimi × leveys (340 ≈ 390 px:n puhelin, 560 ≈ 1280 px:n sarake) × teema × rooli: tarra on kentän sisällä, ei leikkaa aluetta (viereen/alle-tilassa) eikä ylitä laatikkoaan (sisällä-tilassa); ei kirjainpisteitä', async () => {
    const selain = await selainKaynnista(); try {
      const sk = await selain.newContext({ viewport: { width: 700, height: 900 } }), p = await sk.newPage(); let n = 0;
      for (const a of ALUEET) for (const nimi of NIMET) for (const leveys of [340, 560]) for (const teema of ['dark', 'light']) for (const rooli of ['pelaaja', 'henkilokunta']) {
        const koko = a.y + a.h > 84 ? 'koko' : 'puoli', html = K.tmKentta({ koko, ase: { alue: { x: a.x, y: a.y, w: a.w, h: a.h }, nimi, tila: 'ok' }, reitti: null, viikot: null, osat: [], historia: [] }, { wrap: true, rooli, ariaLabel: 'Kenttä' });
        await p.setContent(PROBE(html, teema, leveys)); const nm = a.avain + ' "' + nimi + '" ' + leveys + ' ' + teema + ' ' + rooli;
        const r = await p.evaluate(() => {
          const rect = (e) => { const b = e.getBoundingClientRect(); return { l: b.left, t: b.top, r: b.right, b: b.bottom }; }, kt = rect(document.querySelector('.kt')), ase = rect(document.querySelector('.kt-ase')), tarra = document.querySelector('.kt-ase-tarra');
          const sis = [...document.querySelectorAll('.kt-ase b, .kt-ase span, .kt-ase-tarra b, .kt-ase-tarra span')].map(rect);
          return { kt: kt, ase: ase, tarra: tarra ? rect(tarra) : null, sis: sis, pisteita: document.querySelectorAll('.kt-piste').length };
        });
        const e = 1.5; expect(r.pisteita, nm).toBe(0);
        for (const b of r.sis) { expect(b.l, nm).toBeGreaterThanOrEqual(r.kt.l - e); expect(b.r, nm).toBeLessThanOrEqual(r.kt.r + e); expect(b.t, nm).toBeGreaterThanOrEqual(r.kt.t - e); expect(b.b, nm).toBeLessThanOrEqual(r.kt.b + e); }   // ei kentän yli
        if (r.tarra) { const x = r.tarra, aa = r.ase; expect(!(x.l < aa.r - e && aa.l < x.r - e && x.t < aa.b - e && aa.t < x.b - e), nm + ' tarra leikkaa aluetta').toBe(true); }
        else for (const b of r.sis) { expect(b.l, nm).toBeGreaterThanOrEqual(r.ase.l - e); expect(b.r, nm).toBeLessThanOrEqual(r.ase.r + e); expect(b.t, nm).toBeGreaterThanOrEqual(r.ase.t - e); expect(b.b, nm).toBeLessThanOrEqual(r.ase.b + e); }   // sisällä: ei alueen yli
        n++;
      }
      expect(n).toBe(ALUEET.length * 2 * 2 * 2 * 2);
      await sk.close();
    } finally { await selain.close(); }
  }, 180000);
  it('TM_KUVAT=1 · kuvat: kapea reuna-alue (Teron kuva 1) ja keskialue (kuva 2), 390 + 1280, tumma + vaalea, pelaaja + valmentaja', async () => {
    if (!process.env.TM_KUVAT) return; mkdirSync(KUVAT, { recursive: true }); const selain = await selainKaynnista(); try {
      const sk = await selain.newContext({ viewport: { width: 1280, height: 900 } }), p = await sk.newPage();
      for (const [nm, a, nimi] of [['kapea-reuna', { x: 0, y: 0, w: 25, h: 70 }, 'Käännä pää pallon ollessa matkalla'], ['keskialue', { x: 25, y: 35, w: 50, h: 61 }, '1. kosketus'], ['kapea-oikea', { x: 75, y: 0, w: 25, h: 70 }, '1. kosketus']])
        for (const [lv, leveys] of [['390', 340], ['1280', 560]]) for (const teema of ['dark', 'light']) for (const rooli of ['pelaaja', 'henkilokunta']) {
          const html = K.tmKentta({ koko: 'puoli', ase: { alue: a, nimi, tila: 'ok' }, reitti: null, viikot: null, osat: [], historia: [] }, { wrap: true, rooli }); await p.setContent(PROBE(html, teema, leveys));
          await p.locator('#k').screenshot({ path: join(KUVAT, nm + '-' + lv + '-' + teema + '-' + (rooli === 'pelaaja' ? 'pelaaja' : 'valmentaja') + '.png') });
        }
      await sk.close();
    } finally { await selain.close(); }
  }, 120000);
});
