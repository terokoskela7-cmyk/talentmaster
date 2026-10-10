/**
 * D168/D169 · LAATUPORTTI uusille (Kenttä-lipun takaisille) VP-näkymille: Koti (tm_seuran_pulssi), Tilanne (tm_vp_tilanne), navi (tm_vp_navi), komponentit (tm_kt_komponentit).
 * Brief: docs/CODE_BRIEF_KOTI_TILANNE_V2.md PR A kohta 2–4. Fixture-tilat: tests/fixtures/vp/{tyhja,pilotti,kypsa,kuormitus}.json (+ tests/helpers/vp_fixture.cjs).
 * RATCHET: kohdat joita nykyinen (vanha) renderöinti vielä rikkoo, on kirjattu RAJA-lukuina (= nykytila). PR B/C/D laskee ne tavoitteeseen; testi kaatuu myös jos raja on turhan korkea
 * (silloin rajaa pitää laskea) — näin laatuportti vain kiristyy.
 */
import { describe, it, expect } from 'vitest';
import { readFileSync } from 'fs';
import { createRequire } from 'module';
const require = createRequire(import.meta.url);
const F = require('./helpers/vp_fixture.cjs');
const PU = require('../lib/tm_seuran_pulssi.js'), TT = require('../lib/tm_vp_tilanne.js'), NV = require('../lib/tm_vp_navi.js'), KT = require('../lib/tm_kt_komponentit.js');
const VP = readFileSync(new URL('../TalentMaster_VP_v25.html', import.meta.url), 'utf8');
const NYT = Date.UTC(2026, 9, 12, 7, 0);
const teksti = (h) => h.replace(/<[^>]+>/g, ' ').replace(/&amp;/g, '&').replace(/\s+/g, ' ');
const RENDER = {}; F.TILAT.forEach((t) => { const d = F.lataa(t, NYT); RENDER[t] = { koti: F.kotiHTML(d), tilanne: F.tilanneHTML(d) }; });
const KAIKKI = [];   // [tila, näkymä, html]
F.TILAT.forEach((t) => ['koti', 'tilanne'].forEach((n) => KAIKKI.push([t + ' · ' + n, t, n, RENDER[t][n]])));
const CSSIT = { 'tm_seuran_pulssi': PU.CSS, 'tm_vp_tilanne': TT.CSS, 'tm_vp_navi': NV.CSS, 'tm_kt_komponentit': KT.CSS };
const sennut = (css) => { const o = []; css.split('\n').forEach((rivi) => { const re = /([^{}]+)\{([^{}]*)\}/g; let m; while ((m = re.exec(rivi))) o.push({ valitsin: m[1].trim(), maar: m[2] }); }); return o; };

describe('D169 · fonttiasteikko ja tokenit', () => {
  it('VP_v25 :root: kuusi --fs-* tokenia oikeilla arvoilla; --fs-h1 32 px mobiilissa', () => {
    expect(VP).toMatch(/:root \{ --fs-h1: 40px; --fs-h2: 26px; --fs-lead: 16px; --fs-body: 14px; --fs-meta: 12\.5px; --fs-eb: 11px; \}/);
    expect(VP).toMatch(/@media \(max-width: 720px\) \{ :root \{ --fs-h1: 32px; \} \}/);
  });
  it('vaalean teeman --amber (Kenttä-komponentti) #845510 (kontrasti ≥ 5,6), ei vanhaa #9A6512', () => { expect(VP).toContain('--amber: #845510; --blue: #3D6AA8'); expect(VP).not.toContain('#9A6512'); });
  it.each(Object.keys(CSSIT))('%s: jokainen font-size on var(--fs-*) (ei px-kirjaimia), ei hex-värejä', (nimi) => {
    const css = CSSIT[nimi]; const arvot = [...css.matchAll(/font-size:([^;}]+)/g)].map((m) => m[1]);
    expect(arvot.length).toBeGreaterThan(0);
    arvot.forEach((a) => expect(a, nimi).toMatch(/^var\(--fs-(h1|h2|lead|body|meta|eb)(,\s*[\d.]+px)?\)$/));
    expect(css).not.toMatch(/#[0-9a-fA-F]{3,8}\b/);
  });
  it.each(Object.keys(CSSIT))('%s: DM Mono (--font-mono) VAIN yläotsikkoluokassa .kt-eb', (nimi) => {
    const rikkojat = sennut(CSSIT[nimi]).filter((r) => /font-family:[^;]*(--font-mono|DM Mono)/.test(r.maar)).filter((r) => !r.valitsin.split(',').every((v) => /(^|\s)\.kt-eb(\.\w+)?$/.test(v.trim())));
    expect(rikkojat.map((r) => r.valitsin)).toEqual([]);
  });
  it('.kt-eb: DM Mono, --fs-eb, väli .12em, isot kirjaimet, teal', () => {
    const r = sennut(KT.CSS).find((x) => x.valitsin === '.kt-eb'); expect(r.maar).toContain('font-family:var(--font-mono)'); expect(r.maar).toContain('font-size:var(--fs-eb'); expect(r.maar).toContain('letter-spacing:.12em'); expect(r.maar).toContain('text-transform:uppercase'); expect(r.maar).toContain('color:var(--teal)');
  });
  it('luvut riveillä ja korteissa: DM Sans 600 + tabular-nums + --fs-lead (.pv, .kt-ev-v)', () => {
    [['.kt-ev-v', KT.CSS], ['.tmp .pv', PU.CSS]].forEach(([v, css]) => { const r = sennut(css).find((x) => x.valitsin === v); expect(r, v).toBeTruthy(); expect(r.maar).toContain('font-family:var(--font-sans)'); expect(r.maar).toContain('font-weight:600'); expect(r.maar).toContain('tabular-nums'); expect(r.maar).toContain('font-size:var(--fs-lead'); });
  });
  it('kortin otsikko ja iso luku: Cormorant (--kt-serif/--font-serif) --fs-h2; sivun otsikko --fs-h1', () => {
    ['.kt-sig-h', '.kt-q-v', '.kt-ev-h'].forEach((v) => { const r = sennut(KT.CSS).find((x) => x.valitsin === v); expect(r.maar).toMatch(/font-family:var\(--(kt|font)-serif\)/); expect(r.maar).toContain('font-size:var(--fs-h2'); });
    expect(sennut(PU.CSS).find((x) => x.valitsin === '.tmp .lead .big').maar).toContain('font-size:var(--fs-h1');
  });
  it('signaalikortin alarivi ink2 (ei ink3: kontrasti 3,8 → 7,9)', () => { expect(sennut(KT.CSS).find((x) => x.valitsin === '.kt-sig-second').maar).toContain('color:var(--ink2)'); });
  it('renderöidyissä HTML:issä inline font-size vain var(--fs-*) -tokenilla', () => { KAIKKI.forEach(([nimi, , , h]) => [...h.matchAll(/font-size:([^;"]+)/g)].forEach((m) => expect(m[1], nimi).toMatch(/^var\(--fs-/))); });
  it('nimikkeet ink3, merkityksellinen meta ink2: .kt-vm, .kt-q-s, .kt-tag, .kt-ev-age ink2; .kt-q-k, .kt-ev-k ink3', () => {
    ['.kt-tag', '.kt-ev-age'].forEach((v) => expect(sennut(KT.CSS).find((x) => x.valitsin === v).maar).toContain('color:var(--ink2)'));
    expect(sennut(KT.CSS).find((x) => x.valitsin.startsWith('.kt-q-k')).maar).toContain('color:var(--ink3)');
  });
});

describe('D147 · yksi täytetty nappi per näkymä (ratchet → 1)', () => {
  const taytetyt = (h) => (h.match(/class="kt-btn(?:\s[^"]*)?"/g) || []).filter((c) => !/\s(q|g)(\s|")/.test(c) && !/\bsm\b/.test(c) || /kt-btn"/.test(c)).length;
  const RAJA = { koti: 4, tilanne: 3 };   // nykytila (vanha rakenne); PR B/D → koti 1, PR C → tilanne 1
  it.each(KAIKKI)('%s: täytettyjä .kt-btn ≤ raja', (nimi, t, n, h) => { expect(taytetyt(h), nimi).toBeLessThanOrEqual(RAJA[n]); });
  it('raja on tiukka: jossain tilassa saavutetaan (muuten laske rajaa)', () => { ['koti', 'tilanne'].forEach((n) => expect(Math.max(...F.TILAT.map((t) => taytetyt(RENDER[t][n]))), n).toBe(RAJA[n])); });
  it('tyhjässä tilassa korkeintaan yksi täytetty nappi (tavoite jo nyt)', () => { expect(taytetyt(RENDER.tyhja.tilanne)).toBeLessThanOrEqual(1); expect(taytetyt(RENDER.tyhja.koti)).toBeLessThanOrEqual(1); });
});

describe('D168 · kielletyt UI-tekstit', () => {
  const KIELLOT = [['TKI <', /TKI\s*&lt;|TKI\s*</], ['"→ …teema"', /→\s*\S*teema/i], ['0 % · 0 %', /0 % · 0 %/], ['seuran nimi rivin alussa', /(^|[>·]\s*)(KPV|HJK|SJK|FCL|GrIFK|VIFK|EPS)\s+[PT]\d/], ['NaN/undefined/null', /\b(NaN|undefined|null)\b/]];
  const TILAPAISET = { '"→ …teema"': ['pilotti · tilanne', 'kypsa · tilanne', 'kuormitus · tilanne'] };   // poistuu PR C:ssä (D148/D149); sama lista = ratchet
  it.each(KIELLOT)('kielletty teksti %s ei esiinny (paitsi nimetyt tilapäiset)', (nimi, re) => {
    const esiintyy = KAIKKI.filter(([, , , h]) => re.test(teksti(h)) || re.test(h)).map((x) => x[0]);
    expect(esiintyy.sort()).toEqual((TILAPAISET[nimi] || []).slice().sort());
  });
  it('osa-alueen toisto samassa rivissä (ratchet: nykytilassa Tilanteen poikkeamarivit toistavat osa-alueen)', () => {
    const OSAT = ['Tekniikka', 'Fyysinen', 'Talenttiydin', 'Kehitys'], toistoja = (h) => (h.match(/<div class="kt-vr">[\s\S]*?<\/div>(?=<div class="kt-vr">|<\/div><\/div>|$)/g) || []).filter((r) => { const t = teksti(r); return OSAT.some((o) => (t.match(new RegExp(o, 'g')) || []).length > 1); }).length;
    const nyt = F.TILAT.map((t) => toistoja(RENDER[t].tilanne)); expect(Math.max(...nyt)).toBeLessThanOrEqual(8);
  });
});

describe('D125 · prosentti vain otoksen kanssa', () => {
  it('tmProsenttiTeksti: nimittäjä 0 → "—"; alle PIENI (5) → "a/b"; muuten kokonaisluku-%', () => {
    expect(PU.tmProsenttiTeksti(0, 0)).toBe('—'); expect(PU.tmProsenttiTeksti(0, 16)).toBe('0 %'); expect(PU.tmProsenttiTeksti(1, 4)).toBe('1/4'); expect(PU.tmProsenttiTeksti(0, 4)).toBe('0/4'); expect(PU.tmProsenttiTeksti(3, 5)).toBe('60 %'); expect(PU.tmProsenttiTeksti(7, 9, { min: 10 })).toBe('7/9'); expect(PU.tmProsenttiTeksti(null, undefined)).toBe('—');
  });
  it('tyhjä seura: Tilanteessa ei prosentteja; "0/0" -tekstit ovat nimetty tilapäinen (ratchet: Tilanne ≤ 3 → PR C, Koti ≤ 3 → PR B)', () => {
    const ti = teksti(RENDER.tyhja.tilanne); expect(ti).not.toMatch(/\d\s?%/); expect((ti.match(/\b0\/0\b/g) || []).length).toBeLessThanOrEqual(3);
    expect((teksti(RENDER.tyhja.koti).match(/\b0\/0\b/g) || []).length).toBeLessThanOrEqual(3);
  });
  it('"0 %" -esiintymät (ratchet, nykytila): pilotti ≤ 21, kypsä ≤ 1, kuormitus ≤ 37 → PR B/D vie nollaan kattavuusportilla', () => {
    const nolla = (t) => (teksti(RENDER[t].koti).match(/(^|[^\d])0 %/g) || []).length; expect(nolla('pilotti')).toBeLessThanOrEqual(21); expect(nolla('kypsa')).toBeLessThanOrEqual(1); expect(nolla('kuormitus')).toBeLessThanOrEqual(37);
  });
});

describe('D168 · fixture-tilat', () => {
  it('neljä tilaa; pilotti: 15 joukkuetta + 2 tyhjää, 160 pelaajaa, 4 suostumusta, 6+ huomiota, 4 ehdotusta (yksi 14 joukkueelle)', () => {
    expect(F.TILAT).toEqual(['tyhja', 'pilotti', 'kypsa', 'kuormitus']);
    const p = F.lataa('pilotti', NYT); expect(p.joukkueDocs).toHaveLength(17); expect(p.joukkueDocs.filter((j) => !p.pelaajat.some((x) => x.joukkueet[0] === j.id))).toHaveLength(2);
    expect(p.pelaajat).toHaveLength(160); expect(p.pelaajat.filter((x) => x.suostumusTila === 'annettu')).toHaveLength(4); expect(p.syote.poikkeamat.length).toBeGreaterThanOrEqual(6); expect(p.spec.ehdotukset).toHaveLength(4); expect(Math.max(...p.spec.ehdotukset.map((e) => e.joukkueet.length))).toBeGreaterThanOrEqual(14);
    expect(p.syote.ehdotukset[0].teksti).toMatch(/^[^—]*\+8 — /);   // D144: kuusi + "+N", ei tuplia
  });
  it('tyhjä: 0 joukkuetta; kuormitus: 40 joukkuetta, pitkät nimet; kypsä: 9 joukkuetta', () => {
    expect(F.lataa('tyhja', NYT).joukkueDocs).toHaveLength(0); expect(F.lataa('kuormitus', NYT).joukkueDocs).toHaveLength(40); expect(F.lataa('kuormitus', NYT).joukkueDocs.some((j) => j.nimi.length > 30)).toBe(true); expect(F.lataa('kypsa', NYT).joukkueDocs).toHaveLength(9);
  });
  it('ei oikeita nimiä: pelaajilla vain id; joukkuenimet synteettisiä', () => {
    F.TILAT.forEach((t) => { const d = F.lataa(t, NYT); d.pelaajat.forEach((p) => { expect(p.nimi).toBeUndefined(); expect(p.etunimi).toBeUndefined(); expect(p.id).toMatch(/_\d+$/); }); });
    expect(JSON.stringify(F.TILAT.map((t) => F.lataa(t, NYT).nimet))).not.toMatch(/KPV|HJK|SJK|Sibbo/);
  });
  it('fixture-JSON:t vastaavat generaattoria (node scripts/vp_fixturet_kirjoita.cjs ei muuta mitään)', () => {
    const { execFileSync } = require('child_process'), fs = require('fs'), path = require('path'), ennen = F.TILAT.map((t) => fs.readFileSync(path.join(__dirname, 'fixtures/vp', t + '.json'), 'utf8'));
    execFileSync(process.execPath, [path.join(__dirname, '../scripts/vp_fixturet_kirjoita.cjs')]); expect(F.TILAT.map((t) => fs.readFileSync(path.join(__dirname, 'fixtures/vp', t + '.json'), 'utf8'))).toEqual(ennen);
  });
  it('kaikki tilat renderöityvät molemmissa näkymissä ilman virheitä (kuormitus: ≥ 40 joukkuetta näkyvissä)', () => {
    KAIKKI.forEach(([nimi, , , h]) => expect(h.length, nimi).toBeGreaterThan(500)); expect((RENDER.kuormitus.koti.match(/Östra Nylands/g) || []).length).toBeGreaterThanOrEqual(40);
  });
});
