/* B4 · Polku → Pelaajan ääni: Jakson sitoumus (lib/tm_kt_polku.js, .briefit/CODE_BRIEF_B4_SITOUMUS_POLKUUN.md). Vain näyttö; keksityt nimet ja vastaukset. */
import { describe, it, expect } from 'vitest';
import { createRequire } from 'module';
import { readFileSync } from 'fs';
const require = createRequire(import.meta.url);
const P = require('../lib/tm_kt_polku.js'), FI = P.FI, AJ = require('../lib/tm_aloita_jakso.js'), SV = require('../lib/tm_lib_i18n.js').TM_LIB_I18N.sv;
const NYT = new Date('2026-10-21T09:00:00+03:00'), TANAAN = '2026-10-21';
const esc = (s) => String(s == null ? '' : s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
const JF = { konsepti_avain: 'y_h1', konsepti_nimi: 'Ensimmäinen kosketus', alkoi: '2026-10-20', kesto_vk: 6, domeeni: 'teknis_taktinen' };
const pelaaja = (o) => Object.assign({ id: 'p2', etunimi: 'Bertta', sukunimi: 'Bergh', suostumusTila: 'annettu', joukkue: 'Demo U13', joukkueet: ['demo_u13'], jaksofokus: JF }, o || {});
const SIT = (o) => Object.assign({ itsearvio: { q1: 'Pallon suojaaminen', q2: 'Treeni oli kivaa', q3: 'Testi' }, fokus_nimi: 'Ensimmäinen kosketus', jakso_alkoi: '2026-10-20', sitoumus_pvm: '2026-10-20T15:00:00.000Z' }, o || {});
const ctx = (p, o) => Object.assign({ esc, t: (k) => k, tila: AJ.tmJaksoTila(p, { nyt: NYT }), nyt: NYT, tanaan: TANAAN, nimi: 'Bertta Bergh', voiKirjoittaa: true,
  kausi: { tila: 'ok', tavoite: null }, klipit: { tila: 'ok', dokit: [] }, viikko: { tila: 'ok', docs: [] }, vk: { docs: [] }, joukkueDocs: [], historiaNimiFn: (a, n) => n }, o || {});
const html = (sit, o, p) => { p = p || pelaaja(); return P.tmKtPolkuHTML(p, ctx(p, Object.assign({ sitoumus: { tila: 'ok', sit } }, o || {}))); };
const F = (k, o) => String(FI[k]).replace(/\{(\w+)\}/g, (m, x) => (o && o[x] != null ? o[x] : m));
const lohko = (h) => { const i = h.indexOf('data-kt-sitoumus-lohko'); return i < 0 ? '' : h.slice(i, h.indexOf('</div></div>', h.lastIndexOf('data-kt-sitoumus'))); };

describe('Jakson sitoumus: näkyvyys', () => {
  it('nykyisen jakson sitoumus näkyy Pelaajan äänen alussa: otsikko, kysymykset q1–q3 järjestyksessä, vastaukset lainausmerkeissä', () => {
    const h = html(SIT());
    expect(h).toContain('data-kt-aani'); expect(h).toContain(FI.ktp_s_ots);
    const i1 = h.indexOf(FI.ktp_s_q1), i2 = h.indexOf(FI.ktp_s_q2), i3 = h.indexOf(FI.ktp_s_q3);
    expect(i1).toBeGreaterThan(0); expect(i2).toBeGreaterThan(i1); expect(i3).toBeGreaterThan(i2);
    expect(h).toContain('<div class="kt-aq">”Pallon suojaaminen”</div>'); expect(h).toContain('class="kt-as">' + FI.ktp_s_q1);
  });
  it('vanhan jakson sitoumus ei näy (jakso_alkoi eri kuin nykyinen); osio puuttuu kun muita lähteitä ei ole', () => {
    const h = html(SIT({ jakso_alkoi: '2026-09-01' }));
    expect(h).not.toContain('data-kt-sitoumus-lohko'); expect(h).not.toContain('data-kt-aani');
  });
  it('jakso_alkoi puuttuu (vanha data) → näytetään nykyisen jakson sitoumuksena (sama sääntö kuin P7)', () => {
    expect(html(SIT({ jakso_alkoi: undefined }))).toContain('data-kt-sitoumus-lohko');
  });
  it('tyhjä q3 (ja pelkkä välilyönti) ei näy rivinä', () => {
    const h = html(SIT({ itsearvio: { q1: 'Pallon suojaaminen', q2: '  ', q3: '' } }));
    expect(h).toContain('data-kt-sitoumus-rivi="q1"'); expect(h).not.toContain('data-kt-sitoumus-rivi="q2"'); expect(h).not.toContain('data-kt-sitoumus-rivi="q3"');
    expect(h).not.toContain(FI.ktp_s_q3);
  });
  it('ei sitoumusta / jaksoa ei ole → ei lohkoa eikä paikkamerkkiä (D105)', () => {
    expect(html(null)).not.toContain('data-kt-aani');
    expect(html(SIT(), null, pelaaja({ jaksofokus: null }))).not.toContain('data-kt-sitoumus-lohko');
  });
});

describe('Jakson sitoumus: tilarivi', () => {
  it('vahvistettu nykyiselle jaksolle → "Sitoutui {pvm} · vahvistettu {pvm}", ei vahvista-nappia', () => {
    const h = html(SIT({ vahvistettu_pvm: '2026-10-20T16:00:00.000Z', vahvistettu_jakso_alkoi: '2026-10-20' }));
    expect(h).toContain('data-kt-sitoumus-tila="vahvistettu"'); expect(h).toContain(F('ktp_s_sitoutui', { pvm: '20.10.' }) + ' · ' + F('ktp_s_vahvistettu', { pvm: '20.10.' }));
    expect(lohko(h)).not.toContain('<button'); expect(h).not.toContain('vahvista_sitoumus');
  });
  it('vahvistus edelliselle jaksolle → "odottaa vahvistustasi"', () => {
    const h = html(SIT({ vahvistettu_pvm: '2026-09-02T16:00:00.000Z', vahvistettu_jakso_alkoi: '2026-09-01' }));
    expect(h).toContain('data-kt-sitoumus-tila="odottaa"'); expect(h).toContain(F('ktp_s_sitoutui', { pvm: '20.10.' }) + ' · ' + FI.ktp_s_odottaa);
  });
  it('vanha data: vahvistettu_pvm ilman vahvistettu_jakso_alkoi -leimaa → "vahvistettu"', () => {
    expect(html(SIT({ vahvistettu_pvm: '2026-10-20T16:00:00.000Z' }))).toContain('data-kt-sitoumus-tila="vahvistettu"');
  });
  it('ei vahvistusta → "odottaa vahvistustasi"', () => {
    expect(html(SIT())).toContain('data-kt-sitoumus-tila="odottaa"');
  });
});

describe('Jakson sitoumus: rajat ja virheet', () => {
  const vk = (id, lause) => ({ id, lause });
  const VK = [vk('2026-10-25', 'Eka'), vk('2026-11-01', 'Toka'), vk('2026-11-08', 'Kolmas'), vk('2026-11-15', 'Neljäs')];
  it('lohko ei kuulu 3 uusimman rajaan eikä laskuriin', () => {
    const ilman = html(null, { vk: { docs: VK } }), kanssa = html(SIT(), { vk: { docs: VK } });
    const n = (h) => (h.match(/data-kt-aani-lahde=/g) || []).length;
    expect(n(ilman)).toBe(3); expect(n(kanssa)).toBe(3);
    expect(kanssa).toContain('data-kt-aani-n="3"'); expect(kanssa).toContain(F('ktp_a_uusinta', { n: 3, yht: 4 }));
    expect(kanssa.indexOf('data-kt-sitoumus-lohko')).toBeLessThan(kanssa.indexOf('data-kt-aani-lahde='));
  });
  it('pelkkä sitoumus (muut lähteet tyhjiä) → osio näkyy ilman laskuririviä', () => {
    const h = html(SIT());
    expect(h).toContain('data-kt-aani-n="0"'); expect(h).not.toContain(F('ktp_a_omaa', { n: 0 }));
  });
  it('lukuvirhe tai lataus kesken → ei lohkoa, Polku renderöityy', () => {
    for (const s of [{ tila: 'virhe', sit: null }, { tila: 'lataa', sit: null }, undefined]) {
      const p = pelaaja(), h = P.tmKtPolkuHTML(p, ctx(p, { sitoumus: s }));
      expect(h).toContain('data-kt-polku'); expect(h).not.toContain('data-kt-sitoumus-lohko');
    }
  });
  it('XSS: vastaus escapetaan', () => {
    const h = html(SIT({ itsearvio: { q1: '<img src=x onerror=alert(1)>"&' } }));
    expect(h).not.toContain('<img src=x'); expect(h).toContain('&lt;img src=x onerror=alert(1)&gt;&quot;&amp;');
  });
});

describe('Kausi-lataus: valinnainen paluuarvo (ei tuplakyselyä)', () => {
  const tav = { status: 'aktiivinen', fokus: { nimi: 'Pallon suojaaminen' }, mittari: { yksikko: 'taso' } };
  const kausiDb = (docs, laskuri) => ({ collection: () => ({ doc: () => ({ collection: () => ({ doc: () => ({ collection: () => ({ doc: (id) => ({ get: async () => { laskuri.n++; return { exists: id in docs, data: () => docs[id] }; } }) }) }) }) }) }) });
  it('oletus ennallaan: palauttaa tavoitteen', async () => {
    const l = { n: 0 }; expect((await P.tmKtPolkuLataaKausi({ db: kausiDb({ 2026: { tavoitteet: [tav] } }, l), sid: 's', pid: 'p2', nyt: NYT })).fokus.nimi).toBe('Pallon suojaaminen');
  });
  it('palautaData: { tavoite, vuosi, kausiData } — kuluvan vuoden data (sis. pelaaja_sitoumus) samasta luvusta', async () => {
    const l = { n: 0 }, docs = { 2026: { tavoitteet: [tav], pelaaja_sitoumus: SIT() } };
    const r = await P.tmKtPolkuLataaKausi({ db: kausiDb(docs, l), sid: 's', pid: 'p2', nyt: NYT, palautaData: true });
    expect(r.tavoite.fokus.nimi).toBe('Pallon suojaaminen'); expect(r.vuosi).toBe('2026'); expect(r.kausiData.pelaaja_sitoumus.itsearvio.q1).toBe('Pallon suojaaminen'); expect(l.n).toBe(1);
  });
  it('palautaData: kuluva vuosi puuttuu → kausiData null (edellisen vuoden dokkia ei käytetä sitoumukseen)', async () => {
    const l = { n: 0 }, r = await P.tmKtPolkuLataaKausi({ db: kausiDb({ 2025: { tavoitteet: [tav], pelaaja_sitoumus: SIT() } }, l), sid: 's', pid: 'p2', nyt: NYT, palautaData: true });
    expect(r.vuosi).toBe('2026'); expect(r.kausiData).toBeNull();
  });
});

describe('Kytkentä, kielet ja vartijat', () => {
  const KT = readFileSync('TalentMaster_Kehitystyopoyta.html', 'utf8');
  it('Kehitystyöpöytä lukee sitoumuksen samasta kausi-luvusta tmIdpPelaajaLueSitoumus:lla ja välittää c.sitoumus Polulle', () => {
    expect(KT).toMatch(/tmKtPolkuLataaKausi\(\{[^}]*palautaData: true/); expect(KT).toMatch(/tmIdpPelaajaLueSitoumus\(_db, _seuraId, p\.id, r\.vuosi, r\.kausiData/);
    expect(KT).toContain('sitoumus: x.sitoumus');
  });
  it('sv-avaimet olemassa ja ei-tyhjiä (PM:n sv), paikkamerkit säilyvät', () => {
    for (const k of ['ktp_s_ots', 'ktp_s_q1', 'ktp_s_q2', 'ktp_s_q3', 'ktp_s_sitoutui', 'ktp_s_vahvistettu', 'ktp_s_odottaa']) { expect(FI[k]).toBeTruthy(); expect(SV[k]).toBeTruthy(); expect((SV[k].match(/\{\w+\}/g) || [])).toEqual(FI[k].match(/\{\w+\}/g) || []); }
  });
  it('§7.22: Pelaaja_v7 ja Vanhempi_v2 eivät lataa tm_kt_polku.js:ää (henkilökunnan näkymä)', () => {
    for (const f of ['TalentMaster_Pelaaja_v7.html', 'TalentMaster_Vanhempi_v2.html']) expect(readFileSync(f, 'utf8')).not.toMatch(/<script[^>]+src="lib\/tm_kt_polku\.js/);
  });
});
