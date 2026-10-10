/**
 * Kehitystyöpöytä 22 · A13 jatko 2 — Tänään kohti mockupia 22 (osio 1): yksi viikon osa -sääntö, osan nimi, yksi lukumäärä, asettelu, signaalikortti, kysymyskortit, Osat-kortti.
 * Roolit: VP (kirjoittaa, paneeli + Osat-painikkeet) ja valmentaja omalla/vieraalla pelaajalla (voiKirjoittaa true/false); Master: ei paneelia, Osat pelkkää näyttöä.
 */
import { describe, it, expect } from 'vitest';
import { readFileSync } from 'fs';
import { createRequire } from 'module';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

const require = createRequire(import.meta.url);
const KT = require('../lib/tm_kehitystyopoyta.js');
const AJ = require('../lib/tm_aloita_jakso.js');
const TKT = require('../lib/tm_tanaan_kentta.js');
const __dir = dirname(fileURLToPath(import.meta.url));
const CSS = KT.tmKtCss();
const VP = readFileSync(join(__dir, '..', 'TalentMaster_VP_v25.html'), 'utf8');

const NYT = new Date('2026-10-14T10:00:00+03:00');
const KAANON = () => ({ kpi: [1, 2, 3, 4, 5].map((i) => ({ koodi: 'k' + i, teksti: 'Osa ' + i + ' nimeltään tässä: selitys ' + i + ' pidempi' })) });
const pel = (oa, o) => Object.assign({ id: 'p1', etunimi: 'Topias', joukkue: 'KPV P13', jaksofokus: { konsepti_avain: 'kons', konsepti_nimi: 'Haltuunotto', alkoi: '2026-10-05T08:00:00', kesto_vk: 6, osa_arviot: oa ? { kons: oa } : undefined } }, o || {});
const tila = (p) => AJ.tmJaksoTila(p, { nyt: NYT });
const ESC = (x) => String(x == null ? '' : x).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
const plain = (h) => h.replace(/<[^>]+>/g, ' ').replace(/\s+/g, ' ');
function nayta(p, over) {
  const c = Object.assign({ esc: ESC, t: (k) => k, pvmFn: (i) => i.split('-').reverse().join('.'), toimiFn: '_ktToimi', osaFn: '_ktHavaintoAvaa', tallennaFn: '_ktHavaintoTallenna', veoFn: '_ktHavaintoVeo', peruFn: '_ktHavaintoSulje',
    paneeli: true, voiKirjoittaa: true, kentta: '<div class="kt">KENTTÄ</div>', kaanon: KAANON, tanaan: '2026-10-14', vk: null, havainto: { auki: false, osa: null },
    sigCtx: { nyt: NYT, profiili: 'oto', askel: { avain: 'havainto', tila: 'toimenpide' }, vkEiVastattu: false, nimi: 'Topias' } }, over || {});
  return KT.tmKtTanaanKoko(p, tila(p), c);
}

describe('1 · viikon osa — yksi sääntö', () => {
  const osat = (...t) => t.map((x, i) => ({ k: 'abcde'[i], koodi: 'k' + (i + 1), nimi: 'N' + i, tila: x }));
  it('ensimmäinen osa, jonka tila ei ole itsenäisesti; kaikki itsenäisesti / ei osia → null', () => {
    expect(KT.tmKtViikonOsa(osat('itsenaisesti', null, 'ohjatusti')).k).toBe('b'); expect(KT.tmKtViikonOsa(osat('ohjatusti', 'itsenaisesti')).k).toBe('a');
    expect(KT.tmKtViikonOsa(osat('itsenaisesti', 'itsenaisesti'))).toBeNull(); expect(KT.tmKtViikonOsa([])).toBeNull();
  });
  it('5 osaa, A itsenäisesti, muut ilman arviota → viikon osa B, Q1 "Ei vielä havaintoa", Osat-kortissa 5 riviä, Polku 1/5', () => {
    const p = pel({ k1: 3 }), h = nayta(p);
    expect(h.replace(/<[^>]+>/g, '')).toContain('Viikko 2/6, osa b ”Osa 2 nimeltään tässä” on viikon osa. Noin 10 sekuntia: näkyikö osa harjoituksissa?');
    expect(plain(h)).toContain('Ei vielä havaintoa'); expect((h.match(/class="kt-osa-r/g) || []).length).toBe(5);
    expect(h).toMatch(/class="kt-osa-r on" data-kt-osa="k2"/);
    expect(KT.tmKtOsatYhteenveto(KT.tmKtOsat(p.jaksofokus, { kaanon: KAANON }))).toEqual({ n: 1, m: 5 });
  });
  it('B ohjatusti → viikon osa edelleen B, Q1 "Ohjatusti"', () => {
    const h = nayta(pel({ k1: 3, k2: 2 })); expect(h).toMatch(/class="kt-osa-r on" data-kt-osa="k2"/); expect(plain(h)).toContain('Ohjatusti');
  });
  it('kaikki osat itsenäisesti → ei viikon osaa, signaali ei pyydä havaintoa, Q1 "Itsenäisesti"', () => {
    const h = nayta(pel({ k1: 3, k2: 3, k3: 3, k4: 3, k5: 3 }));
    expect(h).not.toContain('class="kt-osa-r on"'); expect(h).not.toContain('data-kt-signaali="havainto"'); expect(plain(h)).not.toContain('on viikon osa');
    expect(plain(h)).toContain('Itsenäisesti'); expect((h.match(/class="kt-osa-r ok"/g) || []).length).toBe(5);
  });
  it('Kentän nyt-sääntö: pelaajasovellus ei valitse "nyt"-tilaa lainkaan (osat: [] ja osarivit ilman tilaa) → ei eroa; VP/Master Kenttä saa osat vasta kun sijainnit tulevat (B1/D98)', () => {
    const pelaaja = readFileSync(join(__dir, '..', 'TalentMaster_Pelaaja_v7.html'), 'utf8');
    expect(pelaaja).not.toMatch(/tila:\s*'nyt'/); expect(pelaaja).toMatch(/window\.tmKentta\(\{ koko: 'puoli', ilmanAluetta: true, ase: null, reitti: null, viikot: null, osat: \[\]/);
  });
});

describe('2 · osan nimi', () => {
  it('"Valitse: hyökkää palloa vastaan…" ei jää pelkäksi "Valitse"; pitkä etuliite jaetaan kuten ennen', () => {
    expect(KT.tmKtOsaJako('Valitse: hyökkää palloa vastaan, kun pallo on vapaana')).toEqual({ nimi: 'Valitse: hyökkää palloa vastaan, kun pallo on vapaana', selitys: '' });
    expect(KT.tmKtOsaJako('Vastaanotto poispäin paineesta: keho suojaa palloa')).toEqual({ nimi: 'Vastaanotto poispäin paineesta', selitys: 'keho suojaa palloa' });
    expect(KT.tmKtOsaJako('Ei kaksoispistettä').nimi).toBe('Ei kaksoispistettä'); expect(KT.tmKtOsaJako('Katse ylös: katsotaan').nimi).toBe('Katse ylös: katsotaan');
  });
  it('VP:n _vpJfOsaJako käyttää samaa libin sääntöä (Polku, Osat, paneeli)', () => { expect(VP).toContain('function _vpJfOsaJako(teksti) { return window.TM_KEHITYSTYOPOYTA.tmKtOsaJako(teksti); }'); });
});

describe('3 · yksi lukumäärä', () => {
  it('henkilökunta näkee kaikki osat (ctx.max), pelaajasovellus enintään 3', () => {
    const jf = pel(null).jaksofokus;
    expect(KT.tmKtOsat(jf, { kaanon: KAANON })).toHaveLength(5); expect(TKT.tmTanaanOsat(jf, { kaanon: KAANON })).toHaveLength(3); expect(TKT.tmTanaanOsat(jf, { kaanon: KAANON, max: 26 })).toHaveLength(5);
  });
  it('Polun otsikon nimittäjä on kaikki osat (n/m)', () => { expect(VP).toContain("jfOsaYht.n + '/' + jfOsaYht.m"); expect(VP).toContain('tmKtOsatYhteenveto(window.TM_KEHITYSTYOPOYTA.tmKtOsat(jf'); });
});

describe('4–5 · asettelu ja signaalikortti', () => {
  it('kaksi saraketta minmax(0,340px)/minmax(0,1fr), gap 18px, align-items start; alle 720 px yksi sarake ja Kenttä toisena', () => {
    expect(CSS).toContain('.kt-tanaan{display:grid;grid-template-columns:minmax(0,340px) minmax(0,1fr);gap:18px;align-items:start}');
    expect(CSS).toContain('@media (max-width:720px){.kt-tanaan{grid-template-columns:minmax(0,1fr)}.kt-t-kentta{order:2}}');
  });
  it('oikean sarakkeen järjestys: signaali → kysymykset → Osat', () => {
    const h = nayta(pel({ k1: 3 })); const i = (s) => h.indexOf(s);
    expect(i('data-kt-signaali=')).toBeLessThan(i('data-kt-kysymykset')); expect(i('data-kt-kysymykset')).toBeLessThan(i('data-kt-osat')); expect(i('kt-t-kentta')).toBeLessThan(i('kt-t-oikea'));
  });
  it('signaalikortin tyylit mockupista (reuna, tausta, säde, padding, otsikko, perustelu, nappi, alarivi)', () => {
    expect(CSS).toContain('.kt-sig{border:1px solid var(--teal);background:color-mix(in srgb,var(--teal) 14%,transparent);border-radius:6px;padding:12px 14px;display:grid;gap:8px}');
    expect(CSS).toContain('.kt-sig.w{border-color:var(--amber);background:var(--amber-dim)}');
    expect(CSS).toContain('.kt-eb{font-family:var(--font-mono);font-size:var(--fs-eb,11px);letter-spacing:.12em;text-transform:uppercase;color:var(--teal)}');
    expect(CSS).toContain('.kt-sig-h{font-family:var(--kt-serif);font-size:var(--fs-h2,26px);font-weight:500;line-height:1.05}'); expect(CSS).toContain('.kt-sig-why{font-size:var(--fs-body,14px);color:var(--ink2)}');
    expect(CSS).toContain('.kt-btn{font:inherit;font-size:var(--fs-body,14px);font-weight:600;padding:8px 14px;border-radius:4px;'); expect(CSS).toContain('border-top:1px dashed var(--border);padding-top:6px');
    expect(CSS).not.toMatch(/#[0-9a-fA-F]{3,8}\b|rgba?\(/);
  });
  it('signaali: nappi "Merkitse havainto"; paneeli avautuu kortin SISÄÄN ja nappi piiloutuu kun paneeli on auki (VP, oikeus); valmentaja ilman oikeutta ja Master: ei paneelia', () => {
    const p = pel({ k1: 3 }), auki = { auki: true, osa: null };
    const kiinni = nayta(p); expect(plain(kiinni)).toContain('Merkitse havainto'); expect(kiinni).toContain('data-kt-signaali-nappi="havainto"');
    const vp = nayta(p, { havainto: auki });
    const sig = vp.slice(vp.indexOf('data-kt-signaali='), vp.indexOf('data-kt-kysymykset')); expect(sig).toContain('data-kt-havainto-paneeli'); expect(sig).not.toContain('data-kt-signaali-nappi');
    expect(nayta(p, { havainto: auki, voiKirjoittaa: false })).toContain('data-kt-signaali-nappi'); expect(nayta(p, { havainto: auki, voiKirjoittaa: false })).not.toContain('data-kt-havainto-paneeli');
    expect(nayta(p, { havainto: auki, paneeli: false, voiKirjoittaa: false, osaFn: null })).not.toContain('data-kt-havainto-paneeli');
  });
});

describe('HOTFIX · paneelin napit renderöityvät oikein kun shell antaa c:n ILMAN pid:tä (VP:n tapa)', () => {
  const p = pel({ k1: 3, k2: 2 }), PID = 'm93GBdOaGCUuenMiCL0I';
  const pp = Object.assign({}, p, { id: PID });
  const html = () => { const c = { esc: ESC, t: (k) => k, hk: KT.tmKtHk, pvmFn: (i) => i, toimiFn: '_ktToimi', osaFn: '_ktHavaintoAvaa', tallennaFn: '_ktHavaintoTallenna', veoFn: '_ktHavaintoVeo', peruFn: '_ktHavaintoSulje', paneeli: true, voiKirjoittaa: true, kentta: '', kaanon: KAANON, tanaan: '2026-10-14', vk: null, havainto: { auki: true, osa: null },
    sigCtx: { nyt: NYT, profiili: 'oto', askel: { avain: 'havainto', tila: 'toimenpide' }, vkEiVastattu: false, nimi: 'T' } }; expect('pid' in c).toBe(false); return KT.tmKtTanaanKoko(pp, tila(pp), c); };
  const onclickit = (h, sel) => [...h.matchAll(new RegExp('<button[^>]*' + sel + '[^>]*onclick="([^"]*)"', 'g'))].map((m) => m[1].replace(/&quot;/g, '"').replace(/&amp;/g, '&'));
  it('jokaisen arvonapin onclick alkaa _ktHavaintoTallenna("<pid>", ja VEO _ktHavaintoVeo("<pid>"); Peru ja Osat-rivit samoin', () => {
    const h = html(), arvot = onclickit(h, 'data-kt-havainto-arvo'), veo = onclickit(h, 'data-kt-havainto-veo'), peru = onclickit(h, 'data-kt-havainto-peru');
    expect(arvot).toHaveLength(3); for (const o of arvot) expect(o.startsWith('_ktHavaintoTallenna("' + PID + '",')).toBe(true);
    expect(veo).toEqual(['_ktHavaintoVeo("' + PID + '")']); expect(peru).toEqual(['_ktHavaintoSulje()']);
    for (const o of onclickit(h, 'data-kt-osa')) expect(o.startsWith('_ktHavaintoAvaa("' + PID + '",')).toBe(true);
  });
  it('yksikään onclick (paneeli, Osat, kysymyslinkit, signaali) ei heitä new Function(onclick):ssa', () => {
    const h = html(), kaikki = [...h.matchAll(/onclick="([^"]*)"/g)].map((m) => m[1].replace(/&quot;/g, '"').replace(/&amp;/g, '&'));
    expect(kaikki.length).toBeGreaterThan(8); for (const o of kaikki) expect(() => new Function(o), o).not.toThrow();
    expect(kaikki.some((o) => /\(,|,,|\(\s*\)/.test(o) && !/Sulje\(\)/.test(o))).toBe(false);
  });
  it('fn-apuri: puuttuva argumentti (pid) → virhe, ei hiljaa rikkinäistä onclickiä; tmKtTanaanKoko ei kaadu vaan kirjaa virheen ja jättää paneelin pois', () => {
    expect(() => KT.tmKtPaneeliHTML({ osat: [{ k: 'a', koodi: 'k1', nimi: 'A', tila: null }], avain: 'kons' }, { t: (k) => k, tallennaFn: '_ktHavaintoTallenna', veoFn: '_ktHavaintoVeo', peruFn: '_ktHavaintoSulje' })).toThrow(/argumentti puuttuu/);
    expect(() => KT.tmKtPaneeliHTML({ osat: [{ k: 'a', koodi: 'k1', nimi: 'A', tila: null }], avain: 'kons' }, { t: (k) => k, pid: 'x', tallennaFn: undefined, veoFn: '_v', peruFn: '_p' })).toThrow();
  });
});

describe('6 · kysymyskortit', () => {
  const sitoumus = (vahv) => ({ idp_sitoumus_pvm: '2026-10-06', idp_sitoumus_vahv_jakso: vahv ? '2026-10-05T08:00:00' : undefined });
  it('sitoumus vahvistettu → kaksi korttia, sitoumusrivi signaalin alarivillä', () => {
    const h = nayta(pel({ k1: 3 }, Object.assign(sitoumus(true)))); expect((h.match(/class="kt-q"/g) || []).length).toBe(2); expect(h).toContain('kt-q3 two'); expect(plain(h)).toMatch(/Sitoumus annettu .*, vahvistettu /);
  });
  it('sitoumus odottaa vahvistusta → kolme korttia', () => {
    const h = nayta(pel({ k1: 3 }, sitoumus(false))); expect((h.match(/class="kt-q"/g) || []).length).toBe(3); expect(h).not.toContain('kt-q3 two'); expect(plain(h)).toContain('Sitoutui');
  });
  it('ei sitoumusta → kaksi korttia, alarivillä "Pelaaja sitoutuu sovelluksessa"; ei otsikkoa "Kolme kysymystä"', () => {
    const h = nayta(pel({ k1: 3 })); expect((h.match(/class="kt-q"/g) || []).length).toBe(2); expect(plain(h)).toContain('Pelaaja sitoutuu sovelluksessa'); expect(plain(h)).not.toContain('Kolme kysymystä');
  });
  it('kortin tyylit mockupista (reuna, säde, padding, gap, tausta; kysymys, vastaus, ei tietoa, lähde); alle 720 px yksi sarake', () => {
    expect(CSS).toContain('.kt-q{border:1px solid var(--border);border-radius:4px;padding:10px 12px;display:grid;gap:3px;background:var(--bg)}');
    expect(CSS).toContain('.kt-q-k{font-size:var(--fs-meta,12.5px);color:var(--ink3)}'); expect(CSS).toContain('.kt-q-v{font-family:var(--kt-serif);font-size:var(--fs-h2,26px);line-height:1.05;font-weight:500}');
    expect(CSS).toContain('.kt-q-v.na{color:var(--ink3);font-family:var(--font-sans);font-size:var(--fs-meta,12.5px);font-weight:400}'); expect(CSS).toContain('.kt-q-s{font-size:var(--fs-meta,12.5px);color:var(--ink2)}');
    expect(CSS).toContain('@media (max-width:720px){.kt-q3,.kt-q3.two{grid-template-columns:minmax(0,1fr)}}');
  });
});

describe('7 · Osat-kortti', () => {
  it('otsikko "OSAT · {jakson nimi}" (.eb); rivit painikkeita (VP) joiden osaFn avaa paneelin tämä osa valittuna; tilat sanoina; Master pelkkää näyttöä', () => {
    const p = pel({ k1: 3, k2: 2 }), vp = nayta(p), ma = nayta(p, { paneeli: false, voiKirjoittaa: false, osaFn: null });
    expect(plain(vp)).toContain('Osat · Haltuunotto'); expect(vp).toContain('<button type="button" class="kt-osa-r ok" data-kt-osa="k1" onclick="_ktHavaintoAvaa(&quot;p1&quot;,&quot;k1&quot;)">');
    for (const s of ['kt_st_itsenaisesti', 'kt_st_viikon_osa', 'kt_st_arvioi']) expect(vp.includes(s) || plain(vp).includes({ kt_st_itsenaisesti: 'itsenäisesti', kt_st_viikon_osa: 'viikon osa', kt_st_arvioi: 'arvioi' }[s])).toBe(true);
    expect(ma).not.toContain('<button type="button" class="kt-osa-r'); expect((ma.match(/<div class="kt-osa-r/g) || []).length).toBe(5);
  });
  it('rivin tyylit: ruudukko auto/1fr/auto, gap 10px, padding 7px 10px, reuna, säde 4px, 13,5 px; kirjain DM Mono teal; viikon osa amber; itsenäisesti teal', () => {
    expect(CSS).toContain('.kt-osa-r{display:grid;grid-template-columns:auto minmax(0,1fr) auto;gap:10px;align-items:center;padding:7px 10px;border:1px solid var(--border);border-radius:4px;');
    expect(CSS).toContain('.kt-osat{display:grid;gap:4px;margin-top:6px}'); expect(CSS).toContain('.kt-osa-k{font-family:var(--font-sans);font-size:var(--fs-meta,12.5px);color:var(--teal);font-weight:500}');
    expect(CSS).toContain('.kt-osa-r.on{border-color:var(--amber)}.kt-osa-r.on .kt-osa-st{color:var(--amber);font-weight:600}'); expect(CSS).toContain('.kt-osa-r.ok .kt-osa-st{color:var(--teal);font-weight:600}');
  });
});
