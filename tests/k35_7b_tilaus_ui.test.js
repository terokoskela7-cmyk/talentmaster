/* K35-7b — "Lisää kalenteriini": modaalin tilat (pure), ohjain (fake doc), ei hex/emoji, rehellinen viive, linkki vain kerran, kuorissa vain kytkentä. */
import { describe, it, expect } from 'vitest';
import { createRequire } from 'module';
import { readFileSync } from 'fs';
const require = createRequire(import.meta.url), U = require('../lib/tm_kalenteri_tilaus_ui.js'), C = { t: (x) => x };
const lue = (f) => readFileSync(new URL('../' + f, import.meta.url), 'utf8');
describe('modaalin tilat', () => {
  it('ei tilausta: "Luo linkki"; aktiivinen: "Linkki luotu 5.10." + Luo uusi/Poista, EI linkkiä; molemmissa rehellinen päivitysviive', () => {
    const ei = U.tmTilausModaaliHTML({ vaihe: 'ei' }, C), on = U.tmTilausModaaliHTML({ vaihe: 'on', luotu: '2026-10-05T10:00:00.000Z' }, C);
    expect(ei).toContain('data-tl="luo"'); expect(ei).not.toContain('data-tl="poista"'); expect(on).toContain('Linkki luotu 5.10.'); expect(on).toContain('Luo uusi linkki'); expect(on).toContain('data-tl="poista"'); expect(on).not.toMatch(/https?:|webcal:|<input/);
    [ei, on].forEach((h) => expect(h).toContain('muutaman tunnin välein (Google voi viivästyä jopa vuorokauden)'));
  });
  it('uusi linkki: linkki-kenttä, Avaa kalenterisovelluksessa, Kopioi, varoitus "Älä jaa sitä", välilehdet iPhone/Google/Outlook (2–3 riviä), Google kertoo viiveen', () => {
    const h = (v) => U.tmTilausModaaliHTML({ vaihe: 'uusi', url: 'https://x.test/abc.ics', webcal: 'webcal://x.test/abc.ics', valilehti: v }, C);
    expect(h()).toContain('value="https://x.test/abc.ics"'); expect(h()).toContain('Avaa kalenterisovelluksessa'); expect(h()).toContain('Kopioi linkki'); expect(h()).toContain('Älä jaa sitä');
    ['iphone', 'google', 'outlook'].forEach((k) => { const rivit = (h(k).match(/<li>/g) || []).length; expect(rivit).toBeGreaterThanOrEqual(2); expect(rivit).toBeLessThanOrEqual(3); expect(U.OHJEET[k]).toBeTruthy(); });
    expect(h('google')).toContain('jopa vuorokauden viiveellä'); expect(h('iphone')).toContain('Asetukset');
  });
  it('esto: huoltaja ilman vahvistettua sähköpostia → syy + vahvistusnappi; suostumus → syy ilman nappia; virhe: oikeus/yleinen', () => {
    expect(U.tmTilausModaaliHTML({ vaihe: 'esto', esto: { syy: 'sahkoposti', toiminto: 'f' } }, C)).toMatch(/ei ole vielä vahvistettu[\s\S]*data-tl="vahvista"/);
    const s = U.tmTilausModaaliHTML({ vaihe: 'esto', esto: { syy: 'suostumus' } }, C); expect(s).toContain('suostumus on annettu'); expect(s).not.toContain('data-tl="vahvista"');
    expect(U.tmTilausModaaliHTML({ vaihe: 'virhe', virhe: 'oikeus' }, C)).toContain('ei ole oikeutta'); expect(U.tmTilausModaaliHTML({ vaihe: 'virhe', virhe: 'yleinen' }, C)).toContain('Yritä hetken kuluttua');
  });
  it('ei hex-värejä eikä emojeja; painike käyttää annettua onclickia', () => {
    ['ei', 'on', 'uusi', 'esto', 'virhe', 'lataa'].forEach((v) => { const h = U.tmTilausModaaliHTML({ vaihe: v, url: 'https://x', esto: {}, luotu: '2026-10-05' }, C); expect(h).not.toMatch(/#[0-9a-fA-F]{3,6}\b/); expect(h).not.toMatch(/[\u{1F300}-\u{1FAFF}]/u); });
    expect(U.tmTilausCSS()).not.toMatch(/#[0-9a-fA-F]{3,6}\b/); expect(U.tmTilausPainikeHTML({ t: (x) => x, onclick: 'a()' })).toContain('onclick="a()"');
  });
});
describe('ohjain (fake doc)', () => {
  function fakeDoc() { const els = []; const mk = () => ({ children: [], className: '', innerHTML: '', _l: {}, setAttribute() {}, addEventListener(t, f) { this._l[t] = f; }, appendChild(c) { this.children.push(c); c.parentNode = this; }, removeChild(c) { this.children = this.children.filter((x) => x !== c); }, querySelector() { return this._ik || (this._ik = { innerHTML: '' }); }, getAttribute() { return null; } }); return { head: mk(), body: mk(), getElementById: () => null, createElement: () => { const e = mk(); els.push(e); return e; }, els }; }
  it('avaus → tila haetaan; luonti kutsuu luoKalenteriTilaus args:illa; poisto peruKalenteriTilaus; esto → ei kutsuja', async () => {
    const kutsut = [], doc = fakeDoc(), o = { doc, t: (x) => x, args: () => ({ seuraId: 'demo', pelaajaId: 'p1' }), kutsu: async (n, d) => { kutsut.push([n, d]); return { data: n === 'haeKalenteriTilausTila' ? { aktiivinen: true, luotu: '2026-10-05T00:00:00Z' } : { url: 'https://u.ics', webcal: 'webcal://u.ics' } }; } };
    const a = U.tmTilausAsenna(o); a.avaa(); await Promise.resolve(); await Promise.resolve(); expect(kutsut).toEqual([['haeKalenteriTilausTila', { seuraId: 'demo', pelaajaId: 'p1' }]]); expect(a.tila().vaihe).toBe('on');
    const e = U.tmTilausAsenna(Object.assign({}, o, { doc: fakeDoc(), esto: () => ({ syy: 'suostumus' }), kutsu: async () => { throw new Error('ei saa kutsua'); } })); e.avaa(); expect(e.tila().vaihe).toBe('esto');
  });
});
describe('kuorissa vain kytkentä', () => {
  it('Master/Pelaaja/Vanhempi lataavat libin ja kutsuvat tmTilausAsenna/tmTilausPainikeHTML; modaalilogiikkaa ei kuoressa', () => {
    ['TalentMaster_Master_v16.html', 'TalentMaster_Pelaaja_v7.html', 'TalentMaster_Vanhempi_v2.html'].forEach((f) => { const h = lue(f); expect(h).toContain('lib/tm_kalenteri_tilaus_ui.js'); expect(h).toMatch(/tmTilausAsenna|tmTilausPainikeHTML/); expect(h).not.toContain('tl-ikkuna'); });
    expect(lue('TalentMaster_Master_v16.html')).toContain('firebase-functions-compat.js'); expect(lue('TalentMaster_Vanhempi_v2.html')).toContain('_vanhLahetaVahvistus');
  });
});
