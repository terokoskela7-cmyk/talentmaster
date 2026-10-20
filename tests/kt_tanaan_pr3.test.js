/* Kehitystyöpöytä · Tänään (PR 3; 22 / D97–D106, D98, D100, D103, D147, D169): ei tyhjää kenttää ilman aluetta (jaksokortti), signaalikortin nappi, kysymyskortit, osat; ei "SA"-tekstiä; yksi täytetty nappi. */
import { describe, it, expect } from 'vitest';
import { createRequire } from 'module';
const require = createRequire(import.meta.url);
const KT = require('../lib/tm_kehitystyopoyta.js'), TS = require('../lib/tm_tanaan_signaali.js'), KENTTA = require('../lib/tm_kentta.js');
const plain = (h) => h.replace(/<[^>]+>/g, ' ').replace(/\s+/g, ' ').trim();
const JF = (o) => Object.assign({ konsepti_avain: 'x', konsepti_nimi: 'Pelaaminen paineessa', alkoi: '2026-10-05T00:00:00', kesto_vk: 6, osat: ['Katse', 'Ajoitus', 'Aukko', 'Peli', 'Viimeistely'] }, o || {});
const pel = (extra) => Object.assign({ id: 'p1', etunimi: 'Topias', sukunimi: 'O', jaksofokus: JF(), ydinvahvuus: { kuvaus: 'Laukaus' } }, extra || {});
const ALUE = { x: 30, y: 40, w: 40, h: 30 };
const KOKO = (p, c) => KT.tmKtTanaanKoko(p, { tila: 'kaynnissa' }, Object.assign({ esc: (s) => String(s), t: (k) => k, tanaan: '2026-10-11', kenttaFn: (a, pp) => KENTTA.tmKentta({ koko: 'puoli', ase: { alue: a, nimi: pp.ydinvahvuus.kuvaus, tila: 'ok' } }, { wrap: true, rooli: 'henkilokunta' }) }, c || {}));

describe('PR 3 · 1 — ei tyhjää kenttää (D98)', () => {
  it('alue puuttuu → EI kenttäpiirrosta: jaksokortti samassa kohdassa (konsepti, osat a–e tiloineen, vk X/6, katselmuspäivä); ei "Aseta ydinvahvuus" -linkkiä', () => {
    const h = KOKO(pel()), t = plain(h);
    expect(h).not.toMatch(/<svg|class="kt"|kt-kentta|data-kt-kentta/); expect(h).toContain('data-kt-jaksokortti'); expect(h.indexOf('kt-t-kentta')).toBeLessThan(h.indexOf('data-kt-jaksokortti')); expect(h.indexOf('data-kt-jaksokortti')).toBeLessThan(h.indexOf('kt-t-oikea'));
    expect(t).toContain('Pelaaminen paineessa'); expect(t).toMatch(/vk 1\/6/); expect(t).toMatch(/Jakson yhteenveto 16\.11\./); ['a', 'b', 'c', 'd', 'e'].forEach((k) => expect(h).toMatch(new RegExp('data-kt-jk-osa="[^"]*">' + k + ' · ')));
    expect(t).not.toMatch(/Aseta ydinvahvuus|Valitse alue|Siirrä kentällä/i);
  });
  it('alue ({x,y,w,h}) olemassa → kenttä piirtyy tm_kentta.js:llä (alue mukana); ei jaksokorttia', () => {
    const h = KOKO(pel({ ydinvahvuus: { kuvaus: 'Laukaus', alue: ALUE } }));
    expect(h).toMatch(/<svg/); expect(h).not.toContain('data-kt-jaksokortti'); expect(KENTTA.tmKentta({ koko: 'puoli', ase: { alue: ALUE, nimi: 'Laukaus', tila: 'ok' } }).data.alue).toMatchObject({ x: 30, y: 40, w: 40, h: 30 });
  });
  it('epäkelpo alue (puuttuva/ei-luku/NaN) → ei aluetta; tmKtAlue', () => {
    expect(KT.tmKtAlue({ ydinvahvuus: { alue: ALUE } })).toEqual(ALUE); [null, {}, { ydinvahvuus: {} }, { ydinvahvuus: { alue: { x: 1, y: 2, w: 3 } } }, { ydinvahvuus: { alue: { x: '1', y: 2, w: 3, h: 4 } } }, { ydinvahvuus: { alue: { x: NaN, y: 2, w: 3, h: 4 } } }].forEach((p) => expect(KT.tmKtAlue(p)).toBeNull());
  });
  it('ei jaksoa eikä aluetta → jaksokortti "Ei aktiivista jaksoa" (ei tyhjää saraketta)', () => { const h = KT.tmKtTanaanKoko({ id: 'p' }, { tila: 'ei_jaksoa' }, { esc: (s) => String(s), t: (k) => k, tanaan: '2026-10-11' }); expect(h).toContain('data-kt-jaksokortti'); expect(plain(h)).toContain('Ei aktiivista jaksoa'); });
});

describe('PR 3 · 2 — signaalikortti', () => {
  const ctx = { vkEiVastattu: true, askel: { avain: 'yllapito' }, tila: { tila: 'kaynnissa' }, nyt: Date.UTC(2026, 9, 11) };
  it('"Viikkokatsaus ei vastattu" → yksi nappi paikallaan: Merkitse havainto (kuoressa ei muistutuksen lähetyspolkua)', () => {
    const s = TS.tmTanaanSignaali(pel(), ctx).ensisijainen; expect(s.avain).toBe('vk_ei_vastattu'); expect(s.nappi).toEqual({ avain: 'havainto', teksti: 'Merkitse havainto' });
  });
  it('ctx.vkMuistutus → "Muistuta pelaajaa"; jo muistutettu tällä viikolla → "Merkitse havainto"', () => {
    expect(TS.tmTanaanSignaali(pel(), Object.assign({}, ctx, { vkMuistutus: true })).ensisijainen.nappi).toEqual({ avain: 'muistuta_vk', teksti: 'Muistuta pelaajaa' });
    expect(TS.tmTanaanSignaali(pel(), Object.assign({}, ctx, { vkMuistutus: true, vkMuistutettu: true })).ensisijainen.nappi.avain).toBe('havainto');
  });
  it('vahvistettu sitoumus ei näy signaalikortissa; sitoumusrivi vain toimenpiteelle ("Sitoutui · vahvista" kysymyskortissa)', () => {
    const SIT = require('../lib/tm_sitoumus.js'); const h = KOKO(pel({ idp_sitoumus_pvm: '2026-10-09', idp_sitoumus_vahvistettu_pvm: '2026-10-09' }), { sigCtx: ctx });
    expect(h).toContain('data-kt-signaali="vk_ei_vastattu"'); expect(plain(h)).not.toMatch(/Sitoumus annettu|vahvistettu/); expect(typeof SIT.tmSitoumus).toBe('function');
  });
  it('yksi täytetty nappi: signaalikortin .kt-btn (täytetty); otsakkeen ensisijainen on ääriviiva (.kt-nappi-ens-q)', () => {
    const kehys = KT.tmKtKehysHTML({ pid: 'p1', nimi: 'T', tila: { tila: 'kaynnissa', ensisijainen: { avain: 'havainto', teksti: 'Merkitse havainto' }, valikko: [], rivitila: { teksti: 'x', savy: 'ok' } }, tanaanHTML: '' }, { esc: (s) => String(s), t: (k) => k, toimiFn: 'f', valilehtiFn: 'v', silminFn: 's' });
    expect(kehys).toContain('kt-nappi-ens-q'); expect(kehys).not.toMatch(/class="kt-nappi kt-nappi-ens"/); expect(KT.tmKtCss()).toContain('.kt-nappi-ens-q{background:transparent;color:var(--teal);border-color:var(--teal)}');
    const h = KOKO(pel(), { sigCtx: ctx, toimiFn: '_ktToimi' }); expect((h.match(/class="kt-btn"/g) || []).length).toBe(1);   // sivun ainoa täytetty nappi = signaalikortin nappi
  });
});

describe('PR 3 · 3 — kysymyskortit (D103, D169)', () => {
  const q = (k, extra) => KT.tmKtKysymyksetHTML(Object.assign({ osat: [], nakyy: true, viikonOsa: null, vk: k, sit: null }, extra || {}), { esc: (s) => String(s), t: (x) => x });
  it('"Tulee tänään" ei ole poikkeama: --ink (ei .w/amber), lähde näkyy; muut tilat lähteineen', () => {
    const h = q({ n: 0, vk: 1, sunnuntai: true, vastattuTanaan: false }); expect(h).toContain('Tulee tänään'); expect(h).not.toMatch(/kt-q-v w/); expect(plain(h)).toContain('viikkokatsaus · pelaaja vastaa tänään'); expect(h).toContain('data-kt-lahde');
    expect(plain(q({ n: 2, vk: 3, viimeisin: '2026-10-04', sunnuntai: false }))).toMatch(/pelaajan viikkokatsaus su 4\.10\./);
    expect(plain(q({ n: 0, vk: 1, sunnuntai: false }))).toContain('pelaaja vastaa sunnuntaina');
  });
  it('arvo Cormorant --fs-h2 ja --ink; amber vain .w-poikkeamassa (CSS)', () => {
    const css = require('../lib/tm_kt_komponentit.js').CSS; expect(css).toContain('.kt-q-v{font-family:var(--kt-serif);font-size:var(--fs-h2,26px);line-height:1.05;font-weight:500}'); expect(css).toContain('.kt-q-v.w{color:var(--amber)}');
  });
});

describe('PR 3 · 4 — osat (D169)', () => {
  const PV = '2026-10-09', hav = (a) => ({ k1: Object.fromEntries(a.map(([u, arvo, rooli], i) => ['u' + i, { arvo, pvm: PV, rooli }])) });
  it('viikon osa: teal-reuna + tagi tealina (ei amber); "arvioi" teal; ei "aiempi merkintä"', () => {
    const css = KT.tmKtCss(); expect(css).toContain('.kt-osa-r.on{border-color:var(--teal);border-left-width:4px;background:color-mix(in srgb,var(--teal) 14%,var(--bg))}');   // K1c: tausta + paksu vasen reuna expect(css).not.toMatch(/\.kt-osa-r\.on\{border-color:var\(--amber\)/);
    const h = KT.tmKtOsatHTML({ osat: [{ k: 'a', nimi: 'Katse', koodi: 'a1', tila: 'ohjatusti', havainnot: [] }, { k: 'b', nimi: 'Aukko', koodi: 'b1', tila: null, havainnot: [] }], viikonOsa: { k: 'a', koodi: 'a1' }, jaksoNimi: 'J' }, { esc: (s) => String(s), t: (k) => k });
    expect(h).toContain('kt-osa-r on'); expect(h).toContain('Tämän viikon fokus');   // K1c: badge (ei pientä "viikon osa" -tekstiä) expect(h).toContain('kt-osa-st arvioi'); expect(h).not.toContain('aiempi merkintä');
  });
  it('eroavat arviot → uusin + "arviot eroavat"; avautuu paikallaan; seuran käyttäjälle ei koskaan "SA"', () => {
    const o = { k: 'b', nimi: 'X', koodi: 'k1', tila: 'ohjatusti', havainnot: [{ uid: 'a', arvo: 3, pvm: '2026-10-09', rooli: 'vp' }, { uid: 'b', arvo: 2, pvm: '2026-10-09', rooli: 'super_admin' }] };
    const h = KT.tmKtOsatHTML({ osat: [o], jaksoNimi: 'J' }, { esc: (s) => String(s), t: (k) => k, nimet: (u) => (u === 'a' ? 'Tero Koskela' : '') }), t = plain(h);
    expect(t).toContain('arviot eroavat'); expect(t).toContain('Tero Koskela'); expect(t).not.toMatch(/\bSA\b/); expect(h).toContain('data-kt-kaikki-arviot');
  });
  it('kt_r_super_admin-sana ei päädy mihinkään renderöintiin (kaikki roolit ilman nimeä)', () => {
    ['super_admin', 'superadmin', 'vp', 'valmentaja'].forEach((r) => { const m = KT.tmKtOsaMeta({ havainnot: [{ uid: 'u', arvo: 2, pvm: '2026-10-09', rooli: r }] }, { t: (k) => k }); expect(m.meta).not.toMatch(/\bSA\b/); });
  });
});
