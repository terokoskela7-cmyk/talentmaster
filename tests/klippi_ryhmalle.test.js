/* Klippi ryhmälle (Sibbo 1.11.) + oma videoklippi -varaus. Lib: tm_klippi_ryhma.js (oikeudet, purku, yhteenveto, varaus) + tm_mediaviesti.js (dokumentit, rivi, sheet). Rules v3.63: tests/rules. Selain: klippi_sv_selain.test.js. */
import { describe, it, expect } from 'vitest';
import { readFileSync } from 'fs';
import { createRequire } from 'module';
const require = createRequire(import.meta.url);
const lue = (f) => readFileSync(new URL('../' + f, import.meta.url), 'utf8');
const K = require('../lib/tm_klippi_ryhma.js'), M = require('../lib/tm_mediaviesti.js');
const P = (id, joukkue, suostumus = 'annettu', extra = {}) => ({ id, joukkue, joukkueet: [joukkue.toLowerCase()], suostumusTila: suostumus, ...extra });
const PELAAJAT = [P('p1', 'P13'), P('p2', 'P13', 'odottaa'), P('p3', 'P14'), P('p4', 'P12', 'annettu', { talenttiOhjelma: true }), P('p5', 'P13', 'annettu', { talenttiOhjelma: true })];
const R = (o) => ({ id: 'r1', nimi: 'Maalivahdit', tyyppi: 'lista', pelaajat_id: ['p1', 'p2'], valmentajat: ['v-oma'], vastuu_uid: 'v-oma', aktiivinen: true, ...o });
const ctx = (o) => ({ uid: 'v-x', rooli: 'valmentaja', sa: false, omatJoukkueet: ['p13'], pelaajat: PELAAJAT, seura: 'Sibbo', ...o });

describe('oikeudet (tmKrSaaLahettaa / tmKrRyhmat)', () => {
  it('SA ja johto (vp, urheilutoimenjohtaja, seurasihteeri) kaikille aktiivisille ryhmille', () => {
    for (const c of [{ sa: true, rooli: 'super_admin' }, { rooli: 'vp' }, { rooli: 'urheilutoimenjohtaja' }, { rooli: 'seurasihteeri' }]) expect(K.tmKrSaaLahettaa(R({ valmentajat: [] }), ctx({ ...c, omatJoukkueet: [] })), JSON.stringify(c)).toBe(true);
  });
  it('valmentaja: OMA ryhmä (valmentajat[] sis. vastaava) aina — myös muiden joukkueiden pelaajille; ryhmän ulkopuolinen vain jos KAIKKI jäsenet hänen joukkueissaan', () => {
    expect(K.tmKrSaaLahettaa(R({ pelaajat_id: ['p1', 'p3'] }), ctx({ uid: 'v-oma' }))).toBe(true);   // p3 = P14, ei hänen joukkueensa, mutta hän on ryhmän valmentaja
    expect(K.tmKrSaaLahettaa(R({ pelaajat_id: ['p1', 'p2'] }), ctx())).toBe(true);                       // kaikki P13
    expect(K.tmKrSaaLahettaa(R({ pelaajat_id: ['p1', 'p3'] }), ctx())).toBe(false);                      // p3 muusta joukkueesta
    expect(K.tmKrSaaLahettaa(R({ pelaajat_id: ['p1', 'p2'] }), ctx({ omatJoukkueet: ['p14'] }))).toBe(false);
  });
  it('ei oikeutta: muu rooli (testivastaava, fysioterapeutti), arkistoitu ryhmä, tyhjä ryhmä, puuttuva ryhmä', () => {
    expect(K.tmKrSaaLahettaa(R(), ctx({ rooli: 'testivastaava', omatJoukkueet: ['p13'] }))).toBe(false); expect(K.tmKrSaaLahettaa(R(), ctx({ rooli: 'fysioterapeutti' }))).toBe(false);
    expect(K.tmKrSaaLahettaa(R({ aktiivinen: false }), ctx({ rooli: 'vp' }))).toBe(false); expect(K.tmKrSaaLahettaa(R({ pelaajat_id: [] }), ctx({ rooli: 'vp' }))).toBe(false); expect(K.tmKrSaaLahettaa(null, ctx({ rooli: 'vp' }))).toBe(false);
  });
  it('sääntöryhmä (talenttiohjelma): jäsenet = talenttiOhjelma === true; valmentaja vain jos kaikki omissa joukkueissa tai ryhmän valmentaja', () => {
    const sr = R({ id: 'tal', nimi: 'Talentit', tyyppi: 'saanto', pelaajat_id: undefined, valmentajat: [] });
    expect(K.tmKrJasenet(sr, PELAAJAT).map((p) => p.id)).toEqual(['p4', 'p5']); expect(K.tmKrSaaLahettaa(sr, ctx({ rooli: 'vp' }))).toBe(true); expect(K.tmKrSaaLahettaa(sr, ctx())).toBe(false);   // p4 = P12
    expect(K.tmKrSaaLahettaa(sr, ctx({ omatJoukkueet: ['p12', 'p13'] }))).toBe(true);
  });
  it('tmKrRyhmat: vain sallitut, nimen mukaan, n = jäsenmäärä', () => {
    const l = K.tmKrRyhmat([R({ id: 'b', nimi: 'Öö' }), R({ id: 'a', nimi: 'Aa', valmentajat: [] }), R({ id: 'c', nimi: 'Cc', pelaajat_id: ['p3'], valmentajat: [] })], ctx());
    expect(l.map((x) => [x.id, x.n])).toEqual([['a', 2], ['b', 2]]);
  });
});

describe('yhteenveto, kohde, purku', () => {
  it('"n pelaajaa, joista m odottaa lupaa": suostumusTila !== annettu', () => { expect(K.tmKrYhteenveto(PELAAJAT.slice(0, 3))).toEqual({ n: 3, m: 1 }); expect(K.tmKrYhteenveto([])).toEqual({ n: 0, m: 0 }); });
  it('tmKrKohde → {tyyppi, ryhma_id, nimi}', () => { expect(K.tmKrKohde(R())).toEqual({ tyyppi: 'ryhma', ryhma_id: 'r1', nimi: 'Maalivahdit' }); expect(K.tmKrKohde(null)).toBeNull(); });
  it('sheet-tila: tmKrAsetaSheet → ryhmät + omaVideo; tmKrValitse → yhteenveto; purku lähetyshetken jäsenistä; luvaton ryhmä-id hylätään', () => {
    const S = { tarjolla: { yksi: true } }; K.tmKrAsetaSheet(S, { ryhmat: [R()], lippu: false, pelaajat: PELAAJAT }, ctx({ uid: 'v-oma', pelaajat: [] }));
    expect(S.tarjolla).toEqual({ yksi: true, ryhma: true }); expect(S.ryhmat).toEqual([{ id: 'r1', nimi: 'Maalivahdit', n: 2, tyyppi: 'lista' }]);
    K.tmKrValitse(S, 'r1', ctx({ uid: 'v-oma' })); expect(S.yhteenveto).toEqual({ n: 2, m: 1 }); expect(K.tmKrVastaanottajat(S, ctx({ uid: 'v-oma' })).map((p) => p.id)).toEqual(['p1', 'p2']); expect(K.tmKrKohdeTilasta(S)).toEqual({ tyyppi: 'ryhma', ryhma_id: 'r1', nimi: 'Maalivahdit' });
    S._ryhmaDokit[0] = R({ pelaajat_id: ['p1', 'p2', 'p5'] }); expect(K.tmKrVastaanottajat(S, ctx({ uid: 'v-oma' })).length).toBe(3);   // jäsenet SILLÄ HETKELLÄ
    K.tmKrValitse(S, 'ei-sallittu', ctx()); expect(S.ryhmaId).toBeNull(); expect(S.yhteenveto).toBeNull(); expect(K.tmKrVastaanottajat(S, ctx())).toEqual([]);
  });
  it('ei ryhmiä sallittu → tarjolla.ryhma false', () => { const S = {}; K.tmKrAsetaSheet(S, { ryhmat: [R({ pelaajat_id: ['p3'], valmentajat: [] })], pelaajat: PELAAJAT }, ctx()); expect(S.tarjolla.ryhma).toBe(false); expect(S.ryhmat).toEqual([]); });
  it('tmKrLataa: ryhmät + lippu + (vain jos ryhmiä) pelaajat; virhe → tyhjää, ei heitä', async () => {
    const dok = (data, id) => ({ id, data: () => data }), kutsut = [];
    const db = { collection: () => ({ doc: () => ({ get: async () => ({ exists: true, data: () => ({ liput: { klippi_oma_video: true } }) }), collection: (c) => ({ get: async () => { kutsut.push(c); return { docs: c === 'ryhmat' ? [dok(R(), 'r1')] : [dok({ etunimi: 'A' }, 'p1')] }; } }) }) }) };
    expect(await K.tmKrLataa(db, 's')).toMatchObject({ lippu: true, ryhmat: [{ id: 'r1' }], pelaajat: [{ id: 'p1' }] }); expect(kutsut).toEqual(['ryhmat', 'pelaajat']);
    const tyhja = { collection: () => ({ doc: () => ({ get: async () => ({ exists: true, data: () => ({}) }), collection: () => ({ get: async () => ({ docs: [] }) }) }) }) }; kutsut.length = 0;
    expect(await K.tmKrLataa(tyhja, 's')).toEqual({ ryhmat: [], lippu: false, pelaajat: [] });
    const rikki = { collection: () => ({ doc: () => ({ get: async () => { throw new Error('x'); }, collection: () => ({ get: async () => { throw new Error('y'); } }) }) }) }; expect(await K.tmKrLataa(rikki, 's')).toEqual({ ryhmat: [], lippu: false, pelaajat: [] });
    expect(await K.tmKrLataa(null, 's')).toEqual({ ryhmat: [], lippu: false, pelaajat: [] });
  });
});

describe('klippidokumentit: kohde + lahde', () => {
  const vs = (n) => Array.from({ length: n }, (_, i) => ({ pelaajaId: 'p' + (i + 1), pelaajaNimi: 'P' + (i + 1), ika: 12, vastaanottajaUid: 'u1' }));
  const syote = (o) => ({ url: 'https://app.veo.co/m/1?t=10', klippityyppi: 'onnistui', kysymys: 'Mitä näit?', vastaanottajat: vs(3), ...o });
  const c = { nyt: new Date(2026, 10, 2, 12, 0), lahettajaUid: 'u1', klippi_id: 'kl_r' };
  it('ryhmälähetys: yksi dokumentti per pelaaja (oma ketju), sama klippi_id, kohde {tyyppi,ryhma_id,nimi} jokaisessa, lahde "linkki", EI joukkueklippi/osa/tukitavoite', () => {
    const x = M.tmMvKlippiDokumentit(syote({ kohde: { tyyppi: 'ryhma', ryhma_id: 'r1', nimi: ' Maalivahdit ' }, joukkueklippi: true, osa: 'a', tukitavoite_id: 't' }), c);
    expect(x.ok).toBe(true); expect(x.dokit.length).toBe(3); expect(new Set(x.dokit.map((d) => d.klippi_id)).size).toBe(1); expect(x.yhteinen).toBe(false);
    for (const d of x.dokit) { expect(d.kohde).toEqual({ tyyppi: 'ryhma', ryhma_id: 'r1', nimi: 'Maalivahdit' }); expect(d.lahde).toBe('linkki'); expect(d.joukkueklippi).toBeUndefined(); expect(d.osa).toBeUndefined(); expect(d.tukitavoite_id).toBeUndefined(); expect(d.tila).toBe('lahetetty'); }
    expect(new Set(x.dokit.map((d) => d.pelaajaId)).size).toBe(3);
  });
  it('lahde tallentuu AINA "linkki" (myös ilman kohdetta); "oma_video" hylätään (v2)', () => {
    expect(M.tmMvKlippiDokumentit(syote(), c).dokit.every((d) => d.lahde === 'linkki' && !('kohde' in d))).toBe(true); expect(M.tmMvKlippiDokumentit(syote({ lahde: 'linkki' }), c).ok).toBe(true);
    expect(M.tmMvKlippiDokumentit(syote({ lahde: 'oma_video' }), c)).toEqual({ ok: false, syy: 'lahde' }); expect(M.tmMvVirhe('lahde', {})).toBe(M.FI.mv_virhe_lahde);
  });
  it('virheet: kohde puutteellinen → ryhma ("Valitse ryhmä."); ryhmä ilman jäseniä → ryhma_tyhja; nimi >60 → ryhma', () => {
    expect(M.tmMvKlippiDokumentit(syote({ kohde: {} }), c).syy).toBe('ryhma'); expect(M.tmMvKlippiDokumentit(syote({ kohde: { tyyppi: 'ryhma', ryhma_id: 'r', nimi: 'x'.repeat(61) } }), c).syy).toBe('ryhma');
    expect(M.tmMvKlippiDokumentit(syote({ kohde: { tyyppi: 'ryhma', ryhma_id: 'r', nimi: 'N' }, vastaanottajat: [] }), c).syy).toBe('ryhma_tyhja'); expect(M.tmMvVirhe('ryhma', {})).toBe('Valitse ryhmä.'); expect(M.tmMvVirhe('ryhma_tyhja', {})).toBe('Ryhmässä ei ole pelaajia.');
  });
  it('joukkueklippi ja valitut ennallaan (ei kohdetta)', () => { const x = M.tmMvKlippiDokumentit(syote({ joukkueklippi: true }), c); expect(x.yhteinen).toBe(true); expect(x.dokit.every((d) => d.joukkueklippi === true && !d.kohde)).toBe(true); });
});

describe('valmentajan klippilista: ryhmälähetys yhtenä rivinä', () => {
  const dok = (id, pid, o) => ({ id, tyyppi: 'klippi', klippi_id: 'kl_r', pelaajaId: pid, url: 'https://x.fi', domain: 'x.fi', mediatyyppi: 'linkki', klippityyppi: 'onnistui', kysymys: 'K?', tila: 'lahetetty', kohde: { tyyppi: 'ryhma', ryhma_id: 'r1', nimi: 'Maalivahdit' }, aika: 1, ...o });
  const dokit = [dok('a', 'p1'), dok('b', 'p2'), dok('c', 'p3'), { id: 'v1', tyyppi: 'klippi_vastaus', vastaus_viestille: 'a', pelaajaId: 'p1', valinta: 'x', aika: 2 }, { id: 'v2', tyyppi: 'klippi_vastaus', vastaus_viestille: 'a', pelaajaId: 'p1', valinta: 'y', aika: 3 }, { id: 'v3', tyyppi: 'klippi_vastaus', vastaus_viestille: 'b', pelaajaId: 'p2', valinta: 'z', aika: 3 }];
  const pl = { p1: { nimi: 'A', suostumusTila: 'annettu' }, p2: { nimi: 'B', suostumusTila: 'annettu' }, p3: { nimi: 'C', suostumusTila: 'odottaa' } };
  it('yksi rivi: ryhmän nimi, vastanneita = eri pelaajia (ei vastausten määrä), n = pelaajia; pelaajakohtaiset tilat (ketjut) säilyvät', () => {
    const rivit = M.tmMvRivit(dokit, { pelaajat: pl }); expect(rivit.length).toBe(1); const r = rivit[0];
    expect(r.yhteinen).toBe(true); expect(r.ryhma).toEqual({ tyyppi: 'ryhma', ryhma_id: 'r1', nimi: 'Maalivahdit' }); expect([r.n, r.vastanneita, r.vastauksia, r.lupaaOdottaa]).toEqual([3, 2, 3, 1]);
    const html = M.tmMvRiviHTML(r, { avaaFn: 'x' }); expect(html).toContain('Maalivahdit · 2/3 vastannut'); expect(html).toContain('1 odottaa lupaa');
  });
  it('yhden jäsenen ryhmä = tavallinen pelaajarivi (ei ikuista purkusilmukkaa); ilman kohdetta yksi klippi = yksittäinen rivi', () => {
    const r = M.tmMvRivit([dok('a', 'p1')], { pelaajat: pl })[0]; expect(r.yhteinen).toBe(false); expect(r.ryhma).toBeNull(); expect(r.klippiDocId).toBe('a');
    expect(M.tmMvRivit([dok('a', 'p1', { kohde: undefined })], { pelaajat: pl })[0].yhteinen).toBe(false);
  });
  it('purku pelaajakohtaisiksi: jäsenet erikseen omilla tiloillaan (klippi_id = dokumentin id kuten joukkueklipissä)', () => {
    const jas = dokit.filter((d) => d.tyyppi === 'klippi').map((d) => ({ ...d, klippi_id: d.id })), rivit = M.tmMvRivit(jas.concat(dokit.filter((d) => d.tyyppi !== 'klippi')), { pelaajat: pl });
    expect(rivit.every((r) => !r.yhteinen && r.ryhma === null)).toBe(true); expect(rivit.map((r) => [r.pelaajaNimi, r.tila]).sort()).toEqual([['A', 'vastattu'], ['B', 'vastattu'], ['C', 'odottaa_lupaa']]);
  });
});

describe('sheet-HTML: ryhmävalinta + oma videoklippi', () => {
  const opts = { kohdeFn: 'k', valitseFn: 'v', urlFn: 'u', tyyppiFn: 't', osaFn: 'o', pohjaFn: 'p', kysymysFn: 'q', saateFn: 's', lahetaFn: 'l', suljeFn: 'x', ryhmaFn: 'rf' };
  const S = (o) => ({ kohde: 'valitut', klippityyppi: 'onnistui', rekisteri: 'rakentaja', pelaajatLista: [], tarjolla: {}, ...o });
  it('Ryhmä-vaihtoehto näkyy vain kun sallittuja ryhmiä; valinta: pudotusvalikko + "n pelaajaa, joista m odottaa lupaa" (m=0 → pelkkä n)', () => {
    expect(M.tmMvSheetHTML(S(), opts)).not.toContain('data-mv-kohde="ryhma"');
    const h = M.tmMvSheetHTML(S({ kohde: 'ryhma', tarjolla: { ryhma: true }, ryhmat: [{ id: 'r1', nimi: 'Maalivahdit', n: 6, tyyppi: 'lista' }], ryhmaId: 'r1', yhteenveto: { n: 6, m: 2 } }), opts);
    expect(h).toContain('data-mv-kohde="ryhma"'); expect(h).toContain('onchange="rf(this.value)"'); expect(h).toContain('Maalivahdit (6)'); expect(h).toContain('6 pelaajaa, joista 2 odottaa lupaa');
    expect(M.tmMvSheetHTML(S({ kohde: 'ryhma', tarjolla: { ryhma: true }, ryhmat: [{ id: 'r1', nimi: 'M', n: 6 }], ryhmaId: 'r1', yhteenveto: { n: 6, m: 0 } }), opts)).toMatch(/>6 pelaajaa</);
    expect(M.tmMvSheetHTML(S({ kohde: 'ryhma', tarjolla: { ryhma: true }, ryhmat: [] }), opts)).toContain('data-mv-ei-ryhmia');
  });
  it('OMA VIDEOKLIPPI lippu pois: valmentajalle lukittu "Lisäpalvelu. Ei käytössä seurallasi." ilman tarjouslinkkiä; ei hintaa', () => {
    const o = K.tmKrOmaVideo({ rooli: 'valmentaja', lippu: false, seura: 'Sibbo' }), h = M.tmMvSheetHTML(S({ omaVideo: o }), opts);
    expect(o).toMatchObject({ tila: 'lukittu', tarjous: false }); expect(h).toContain('Oma videoklippi (10–15 s)'); expect(h).toContain('🔒'); expect(h).toContain('Lisäpalvelu. Ei käytössä seurallasi.'); expect(h).toMatch(/data-mv-oma-nappi disabled/); expect(h).not.toContain('data-mv-oma-tarjous');
    expect(h).not.toMatch(/€|\beur\b|hinta/i);
  });
  it('johto ja SA: lisämaksuteksti + mailto TM:n tukiosoitteeseen, aihe "Oma videoklippi – {seura}"', () => {
    for (const c of [{ rooli: 'vp' }, { rooli: 'urheilutoimenjohtaja' }, { rooli: 'seurasihteeri' }, { sa: true, rooli: 'super_admin' }]) {
      const o = K.tmKrOmaVideo({ ...c, lippu: false, seura: 'FC Sibbo & Co' }), h = M.tmMvSheetHTML(S({ omaVideo: o }), opts); expect(o.tarjous, JSON.stringify(c)).toBe(true);
      expect(h).toContain('Lisäpalvelu, josta peritään lisämaksu. Pyydä tarjous TalentMasterilta.'); const href = /data-mv-oma-tarjous href="([^"]+)"/.exec(h)[1].replace(/&amp;/g, '&');
      expect(href.startsWith('mailto:' + K.TUKI_OSOITE + '?subject=')).toBe(true); expect(decodeURIComponent(href.split('subject=')[1])).toBe('Oma videoklippi – FC Sibbo & Co');
    }
  });
  it('lippu päällä: "Tulossa" (ei lukkoa, ei tarjouslinkkiä), edelleen disabled — ei latausta', () => {
    const h = M.tmMvSheetHTML(S({ omaVideo: K.tmKrOmaVideo({ rooli: 'vp', lippu: true }) }), opts);
    expect(h).toContain('Tulossa'); expect(h).not.toContain('🔒'); expect(h).not.toContain('data-mv-oma-tarjous'); expect(h).toMatch(/data-mv-oma-nappi disabled/); expect(h).not.toContain('type="file"');
  });
  it('raja yhdessä libissä: KLIPPI_OMA_MIN_S 10, KLIPPI_OMA_MAX_S 15; lippu vain täsmälleen true', () => {
    expect([K.KLIPPI_OMA_MIN_S, K.KLIPPI_OMA_MAX_S]).toEqual([10, 15]); expect(K.tmKrLippu({ liput: { klippi_oma_video: true } })).toBe(true);
    for (const v of ['true', 1, null, undefined, false]) expect(K.tmKrLippu({ liput: { klippi_oma_video: v } }), String(v)).toBe(false); expect(K.tmKrLippu(null)).toBe(false); expect(K.tmKrLippu({ liput: {} })).toBe(false);
  });
  it('osa-valinta piilotetaan ryhmälähetyksessä', () => { expect(M.tmMvSheetHTML(S({ kohde: 'ryhma', osat: [{ k: 'a', teksti: 'A' }], tarjolla: { ryhma: true }, ryhmat: [] }), opts)).not.toContain('data-mv-osa'); });
});

describe('adapterit (Master + VP): ohut kytkentä, samat kutsut; Master-rivikatto', () => {
  const MA = lue('TalentMaster_Master_v16.html'), VP = lue('TalentMaster_VP_v25.html');
  it('molemmat: skripti ladataan, ryhmä purkautuu _mvKentat:ssa, kohde + lahde lähetykseen, ryhmäfunktio sheetille, otsikko ryhmän nimellä', () => {
    for (const src of [MA, VP]) {
      expect(src).toContain('lib/tm_klippi_ryhma.js?v=1'); expect(src).toContain("if (S.kohde === 'ryhma') return window.TM_KLIPPI_RYHMA.tmKrVastaanottajat(S, _mvKrCtx());"); expect(src).toContain("lahde: 'linkki', kohde: S.kohde === 'ryhma'");
      expect(src).toContain("ryhmaFn: '_mvRyhma'"); expect(src).toContain('window._mvRyhma = function'); expect(src).toContain('e.rivi.ryhma ? e.rivi.ryhma.nimi'); expect(src).toContain('_mvKrAlusta(S);'); expect(src).toContain("'mv_lahetetty_ryhma'");
    }
  });
  it('Master pysyy rivikatossa (≤ 11900)', () => { expect(MA.split('\n').length).toBeLessThanOrEqual(11900); });
  it('lib-tiedosto ≤ 520 riviä; ei hintaa/valuuttaa libissä', () => { const s = lue('lib/tm_klippi_ryhma.js'); expect(s.split('\n').length).toBeLessThanOrEqual(520); expect(s).not.toMatch(/€|\d+\s?(eur|euroa)\b/i); });
  it('Gemini-erä 42: 16 uutta avainta, fi = lib, en täytetty, sv tyhjä (Code ei kirjoita ruotsia)', () => {
    const E = JSON.parse(lue('docs/i18n/sv_kaannoserae_42_gemini.json')).osiot['lib.tm_mediaviesti'].rivit, avaimet = Object.keys(E);
    expect(avaimet.length).toBe(16); for (const k of avaimet) { expect(E[k].fi, k).toBe(M.FI[k]); expect(E[k].en.length, k).toBeGreaterThan(0); expect(E[k].sv, k).toBe(''); expect((E[k].en.match(/\{\w+\}/g) || []).sort(), k).toEqual((E[k].fi.match(/\{\w+\}/g) || []).sort()); }
  });
});
