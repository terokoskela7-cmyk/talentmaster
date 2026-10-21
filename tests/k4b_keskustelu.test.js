/* K4b (erä 84) · Kehityskeskustelu uudella sivulla — logiikka (lib/tm_kt_keskustelu.js): neljä aluetta, kausitavoitteen ehto, kirjoitussuunnitelma (reviewit + rytmi), samapäiväinen yhteenveto ei ylikirjoitu,
   rytmin nollaus: sovellus (tmRytmi / laskeReviewKadenssi) ja push (functions/rytmi_notif.js) samaa mieltä, Historian rivit, HTML (vain sisäinen, ei vanhaa sanastoa), selaimen luonnos. */
import { describe, it, expect } from 'vitest';
import { readFileSync } from 'fs';
import { createRequire } from 'module';
const require = createRequire(import.meta.url);
const KE = require('../lib/tm_kt_keskustelu.js'), KS = require('../lib/tm_kehityssilmukka.js'), N = require('../lib/tm_eerikkila_normit.js'), RN = require('../functions/rytmi_notif.js'), RY = require('../lib/tm_rytmi.js'), NK = require('../lib/tm_nakyvyys_kytkin.js'), KK = require('../lib/tm_kevyt_katselmus.js');
globalThis.normiIka = N.normiIka;
globalThis.window = undefined; delete globalThis.window;
const lue = (f) => readFileSync(new URL('../' + f, import.meta.url), 'utf8');
const NYT = new Date(2026, 9, 19, 12, 0).getTime();   // 19.10.2026 (paikallinen)
const iso = (n) => { const d = new Date(2026, 9, 19 + n); return d.getFullYear() + '-' + String(d.getMonth() + 1).padStart(2, '0') + '-' + String(d.getDate()).padStart(2, '0'); };
const pel = (o) => Object.assign({ id: 'p1', etunimi: 'Aatu', sukunimi: 'Aalto', syntymaVuosi: 2013, joukkue: 'Demo U13' }, o);
const VOIMASSA = { status: 'aktiivinen', luotu: '2026-08-20T10:00:00.000Z', fokus: { alue: 'acceleration', dim: 'D1', nimi: 'Kiihdytys', lahde: 'mitattu' }, pelaajan_tavoite: 'Haluan päästä nopeammin liikkeelle', mittari: { testId: 'sprint10', yksikko: 's', suunta: 'pienempi' }, lahto: { arvo: 2.1, pvm: '2026-06-05' }, tavoitearvo: 1.9 };
const S = (o) => Object.assign(KE.tmKeAlku(pel(), { nimi: 'Aatu Aalto' }), { lataa: false, kausi: { tila: 'voimassa', tavoite: VOIMASSA, nimi: 'Kiihdytys' }, sovitut: 'Sovittiin ensiaskelharjoitus.' }, o || {});
const CTX = { pvm: iso(0), nytISO: '2026-10-19T09:00:00.000Z', uid: 'u1', rooli: 'valmentaja' };

describe('neljä aluetta (ent. Nelikulma): sama laskenta kuin VP:n Reviewit-rivillä', () => {
  it('nykyinen = jaksofokus.domeeni, arvioitu = jaksofokus_historia[].domeeni, muut ei arvioitu; aina neljä, vakiojärjestys', () => {
    const r = KE.tmKeNelikulma(pel({ jaksofokus: { domeeni: 'teknis_taktinen' }, jaksofokus_historia: [{ domeeni: 'fyysinen' }, { domeeni: 'teknis_taktinen' }, null, {}] }));
    expect(r).toEqual([{ avain: 'fyysinen', tila: 'fresh' }, { avain: 'teknis_taktinen', tila: 'cur' }, { avain: 'psyykkinen', tila: 'none' }, { avain: 'sosiaalinen', tila: 'none' }]);
    expect(KE.tmKeNelikulma(null).map((x) => x.tila)).toEqual(['none', 'none', 'none', 'none']);
  });
  it('VP:n Reviewit-rivi delegoi libiin (ei omaa laskentaa)', () => {
    const vp = lue('TalentMaster_VP_v25.html'); expect(vp).toContain('window.TM_KT_KESKUSTELU.tmKeNelikulma(p)'); expect(vp).not.toMatch(/katetut\[h\.domeeni\]/); expect(vp).toContain('lib/tm_kt_keskustelu.js');
  });
});

describe('kauden tavoitteen ehto: vain VOIMASSA oleva tavoite sallii kirjauksen', () => {
  it('voimassa → voimassa; saavutettu/jatkuu myös; ehdotus/luonnos → ehdotus (odottaa hyväksyntää); vaihdettu/hylätty/ei mitään → ei', () => {
    expect(KE.tmKeKausiTila({ tavoite: VOIMASSA, luonnos: null })).toMatchObject({ tila: 'voimassa', nimi: 'Kiihdytys' });
    expect(KE.tmKeKausiTila({ tavoite: { ...VOIMASSA, status: 'saavutettu' } }).tila).toBe('voimassa');
    expect(KE.tmKeKausiTila({ tavoite: null, luonnos: { ...VOIMASSA, status: 'ehdotettu' } }).tila).toBe('ehdotus');
    expect(KE.tmKeKausiTila({ tavoite: { ...VOIMASSA, status: 'ehdotettu' } }).tila).toBe('ehdotus');
    expect(KE.tmKeKausiTila({ tavoite: { ...VOIMASSA, status: 'vaihdettu' }, luonnos: null }).tila).toBe('ei');
    expect(KE.tmKeKausiTila({ tavoite: { ...VOIMASSA, status: 'hylatty' } }).tila).toBe('ei');
    expect(KE.tmKeKausiTila(null).tila).toBe('ei'); expect(KE.tmKeKausiTila({}).tila).toBe('ei');
  });
  it('lataus: kuluva vuosi; vuodenvaihteessa edellinen; ehdotus ja voimassa olevat erikseen (idp_kausi)', async () => {
    const dok = (arr) => ({ get: async () => ({ exists: !!arr, data: () => ({ tavoitteet: arr }) }) });
    const db = (d) => ({ collection: () => ({ doc: () => ({ collection: () => ({ doc: () => ({ collection: () => ({ doc: (id) => dok(d[id]) }) }) }) }) }) });
    const a = await KE.tmKeLataaKausi({ db: db({ 2026: [VOIMASSA] }), sid: 's', pid: 'p', nyt: new Date(2026, 9, 19) }); expect(KE.tmKeKausiTila(a).tila).toBe('voimassa');
    const b = await KE.tmKeLataaKausi({ db: db({ 2026: [{ ...VOIMASSA, status: 'ehdotettu', luotu: 'x' }] }), sid: 's', pid: 'p', nyt: new Date(2026, 9, 19) }); expect(KE.tmKeKausiTila(b).tila).toBe('ehdotus');
    const c = await KE.tmKeLataaKausi({ db: db({ 2026: null, 2025: [VOIMASSA] }), sid: 's', pid: 'p', nyt: new Date(2026, 0, 5) }); expect(KE.tmKeKausiTila(c).tila).toBe('voimassa');
    const d = await KE.tmKeLataaKausi({ db: db({}), sid: 's', pid: 'p', nyt: new Date(2026, 9, 19) }); expect(KE.tmKeKausiTila(d).tila).toBe('ei');
  });
  it('tallennus ilman voimassa olevaa tavoitetta ei onnistu (sheetin lisäksi myös suunnitelma)', () => {
    expect(KE.tmKeTallennus(pel(), S({ kausi: { tila: 'ei' } }), CTX)).toEqual({ ok: false, syy: 'ei_tavoitetta' });
    expect(KE.tmKeTallennus(pel(), S({ kausi: { tila: 'ehdotus' } }), CTX).ok).toBe(false);
  });
});

describe('kirjoitussuunnitelma: reviewit/{pvm} (sisäinen) + rytmi', () => {
  it('kentät: tyyppi kehityskeskustelu, pvm, sovitut_sisainen, kk_* (tekijä uid + rooli); pikakentät review_viimeisin_pvm/-tyyppi; EI pelaajalle näkyviä kenttiä', () => {
    const x = KE.tmKeTallennus(pel(), S({ kausiValinta: 'muutetaan' }), { ...CTX, rooli: 'vp' });
    expect(x.ok).toBe(true); expect(x.reviewitPvm).toBe('2026-10-19'); expect(x.avaaKausi).toBe(true);
    expect(Object.keys(x.reviewitData).sort()).toEqual(['kk_kausitavoite', 'kk_tallennettu', 'kk_tekija_rooli', 'kk_tekija_uid', 'pvm', 'sovitut_sisainen', 'tyyppi']);
    expect(x.reviewitData).toMatchObject({ tyyppi: 'kehityskeskustelu', pvm: '2026-10-19', kk_tekija_uid: 'u1', kk_tekija_rooli: 'vp', kk_kausitavoite: 'muutetaan', kk_tallennettu: CTX.nytISO, sovitut_sisainen: { teksti: 'Sovittiin ensiaskelharjoitus.', lahde: 'vp', uid: 'u1', tallennettu: CTX.nytISO } });
    expect(x.pikakentat).toEqual({ review_viimeisin_pvm: '2026-10-19', review_viimeisin_tyyppi: 'kehityskeskustelu' });
    const nimet = Object.keys(x.reviewitData).concat(Object.keys(x.pikakentat)); expect(nimet.filter((k) => /nayta|nakyvyys|pelaaja|lause$|historia/i.test(k))).toEqual([]);   // vain sisäinen: ei kytkintä, ei pelaajan luettavaa paikkaa
  });
  it('lähde ja tekijän rooli: VP/UTJ/SA = vp, muut valmentaja; ilman valintaa ei kk_kausitavoite-kenttää (undefined karsitaan)', () => {
    const l = (rooli, sa) => KE.tmKeTallennus(pel(), S(), { ...CTX, rooli, superAdmin: sa }).reviewitData;
    expect(l('valmentaja').sovitut_sisainen.lahde).toBe('valmentaja'); expect(l('urheilutoimenjohtaja').sovitut_sisainen.lahde).toBe('vp'); expect(l(undefined, true).sovitut_sisainen.lahde).toBe('vp'); expect(l(undefined, true).kk_tekija_rooli).toBe('super_admin');
    expect('kk_kausitavoite' in l('valmentaja')).toBe(false); expect(KE.tmKeTallennus(pel(), S({ kausiValinta: 'pidetaan' }), CTX).avaaKausi).toBe(false);
  });
  it('SAMA PÄIVÄ kuin jakson yhteenveto: kentät erillisiä (lause_sisainen, kevyt, hylkays_sisainen vs sovitut_sisainen, kk_*) → Firestoren merge ei ylikirjoita kumpaakaan', () => {
    const jakso = KK.tmKkTallennus(pel({ jaksofokus: { konsepti_avain: 'y_h1', konsepti_nimi: 'Haltuunotto', alkoi: iso(-40), kesto_vk: 6, lahde: 'valmentaja' } }), Object.assign(KK.tmKkAlku(pel(), { profiili: 'oto', lahde: 'valmentaja', nimi: 'A', konsepti: 'Haltuunotto', kortit: [], osat: [], k3Paalla: false }), { kevyt: { nakyi: 'ohjatusti', treeni: 'usein', mukana: 'hyvin' }, lause: 'Hyvä jakso, jatka näin.' }), { uid: 'u1', nytISO: CTX.nytISO, pvm: iso(0), rooli: 'valmentaja', alkoi: iso(-40), loppu: iso(0), harjoituksia: 5, lasnaolo: { paikalla: 4, yhteensa: 5, tiedossa: 5 } });
    const sjakso = NK.tmLauseSuunnitelma('Hyvä jakso, jatka näin.', false, { lahde: 'valmentaja', uid: 'u1', nytISO: CTX.nytISO }).reviewit;
    const jakson = Object.assign({}, jakso.reviewitData || {}, sjakso), kk = KE.tmKeTallennus(pel(), S(), CTX).reviewitData;
    expect(Object.keys(jakson)).toContain('lause_sisainen'); expect(Object.keys(jakson)).toContain('kevyt');
    const yhteiset = Object.keys(kk).filter((k) => k in jakson && !['pvm', 'tyyppi'].includes(k)); expect(yhteiset).toEqual([]);   // pvm = sama päivä; tyyppi vain tässä
    const merge = Object.assign({}, jakson, kk); expect(merge.lause_sisainen).toEqual(jakson.lause_sisainen); expect(merge.kevyt).toEqual(jakson.kevyt); expect(merge.sovitut_sisainen.teksti).toBe('Sovittiin ensiaskelharjoitus.');
  });
  it('validointi: tyhjä / pelkkä väli → tyhja; yli 1000 merkkiä → pitka; ennen kirjoitusta', () => {
    expect(KE.tmKeTallennus(pel(), S({ sovitut: '   ' }), CTX)).toEqual({ ok: false, syy: 'tyhja' }); expect(KE.tmKeTallennus(pel(), S({ sovitut: 'x'.repeat(1001) }), CTX)).toEqual({ ok: false, syy: 'pitka' });
    expect(KE.tmKeTallennus(pel(), S({ sovitut: 'x'.repeat(1000) }), CTX).ok).toBe(true); expect(KE.tmKeVirhe('tyhja', { t: (k) => k })).toBe('Kirjoita sovitut asiat ennen tallennusta.');
  });
  it('aiempaa myöhäisempi review_viimeisin_pvm säilyy (tmKirjaaKatselmus): jälkikäteen kirjattu keskustelu ei siirrä rytmiä taaksepäin; reviewit-dokumentti kirjoitetaan silti', () => {
    const x = KE.tmKeTallennus(pel({ review_viimeisin_pvm: iso(+3), review_viimeisin_tyyppi: 'jakso' }), S(), CTX); expect(x.pikakentat).toEqual({}); expect(x.reviewitData.sovitut_sisainen.teksti).toBeTruthy();
  });
});

describe('rytmi: kehityskeskustelu nollaa — sovellus ja push samaa mieltä (kuten tests/k1d_notif_rytmi_parity.test.js)', () => {
  const sovellus = (p) => N.laskeReviewKadenssi(p, NYT), push = (p) => RN.rytmiNotifit([{ id: 'p1', data: p }], NYT);
  it('myöhässä (60 pv edellisestä yhteenvedosta, 13 v → 42 pv) → ilmoitus molemmissa; keskustelun jälkeen ajan tasalla eikä pushia; tyyppi näkyy "kehityskeskustelu"', () => {
    const ennen = pel({ review_viimeisin_pvm: iso(-60), review_viimeisin_tyyppi: 'jakso' });
    expect(sovellus(ennen).status).toBe('myohassa'); expect(push(ennen)).toHaveLength(1);
    const x = KE.tmKeTallennus(ennen, S(), CTX), jalkeen = Object.assign({}, ennen, x.pikakentat);
    const r = sovellus(jalkeen); expect(r.status).toBe('ajantasalla'); expect(r.tyyppi).toBe('kehityskeskustelu'); expect(r.viimeisinPvm).toBe(iso(0)); expect(push(jalkeen)).toEqual([]);
    expect(RY.tmRytmiPelaajalle(jalkeen, NYT).status).toBe('ajantasalla'); expect(RY.tmRytmiPelaajalle(jalkeen, NYT).edellinenPv).toBe(0);
  });
  it('erääntymässä ja "ei yhteenvetoa" -tapaukset: keskustelu nollaa myös ne; rytmi lasketaan 42 pv kirjauspäivästä', () => {
    for (const ennen of [pel({ review_viimeisin_pvm: iso(-37), review_viimeisin_tyyppi: 'mdr' }), pel({})]) {
      const j = Object.assign({}, ennen, KE.tmKeTallennus(ennen, S(), CTX).pikakentat); const r = sovellus(j);
      expect(r.status).toBe('ajantasalla'); expect(r.eraantyyPvm).toBe(iso(42)); expect(push(j)).toEqual([]);
    }
  });
  it('tyypillä ei ole logiikkaa: sama tulos arvolla keskustelu / kehityskeskustelu / mdr / jakso (vain pvm ratkaisee)', () => {
    for (const t of ['keskustelu', 'kehityskeskustelu', 'mdr', 'jakso']) expect(sovellus(pel({ review_viimeisin_pvm: iso(-10), review_viimeisin_tyyppi: t })).status).toBe('ajantasalla');
  });
});

describe('Historia: "Kehityskeskustelu {pvm}" + sisäinen teksti + tekijän rooli', () => {
  it('vain dokumentit joilla kk_tallennettu ja sovitut_sisainen.teksti; jakson yhteenvedon dokumentit (lause_sisainen) eivät tule keskusteluriveiksi; uusin ensin', () => {
    const docs = { '2026-10-01': { lause_sisainen: { teksti: 'Jakson lause', lahde: 'valmentaja' }, kevyt: {} }, '2026-10-05': { tyyppi: 'mdr', paatos: 'x' }, '2026-10-12': { kk_tallennettu: 'a', sovitut_sisainen: { teksti: ' Ensiaskel ', lahde: 'vp' } }, '2026-10-19': { kk_tallennettu: 'b', sovitut_sisainen: { teksti: 'Toinen', lahde: 'valmentaja' } }, '2026-10-20': { kk_tallennettu: 'c', sovitut_sisainen: { teksti: '' } } };
    expect(KE.tmKeHistoriaRivit(docs)).toEqual([{ pvm: '2026-10-19', teksti: 'Toinen', lahde: 'valmentaja' }, { pvm: '2026-10-12', teksti: 'Ensiaskel', lahde: 'vp' }]);
    expect(KE.tmKeHistoriaRivit(null)).toEqual([]);
  });
  it('Polun Historia piirtää rivin ("Kehityskeskustelu 19.10." + teksti + rooli + sisäinen-merkki) ja lajittelee jaksojen joukkoon', () => {
    const P = require('../lib/tm_kt_polku.js'), esc = (s) => String(s).replace(/&/g, '&amp;').replace(/</g, '&lt;');
    const p = pel({ jaksofokus_historia: [{ konsepti_avain: 'y_h1', konsepti_nimi: 'Haltuunotto', alkoi: '2026-08-01', paattyi: '2026-10-01', suljettu: '2026-10-01T10:00:00.000Z', sulkutapa: 'suljettu' }] });
    const html = P.tmKtPolkuHTML(p, { esc, t: (k) => k, tila: null, nyt: new Date(2026, 9, 19), tanaan: '2026-10-19', kausi: { tila: 'ok', tavoite: VOIMASSA }, klipit: { tila: 'ok', dokit: [] }, viikko: { tila: 'ok', docs: [] }, reviewit: { tila: 'ok', docs: { '2026-10-19': { kk_tallennettu: 'x', sovitut_sisainen: { teksti: 'Sovittiin A', lahde: 'vp' } } } }, voiKirjoittaa: true, toimiFn: '_ktToimi' });
    expect(html).toContain('data-kt-h-keskustelu'); expect(html).toContain('Kehityskeskustelu 19.10.'); expect(html).toContain('”Sovittiin A” – VP'); expect(html).toContain('data-hl-sisainen');
    expect(html.indexOf('data-kt-h-keskustelu')).toBeLessThan(html.indexOf('Haltuunotto', html.indexOf('data-kt-historia')));   // uusin ensin
    expect(html).toContain('data-kt-kirjaa-keskustelu'); expect(html).toContain('_ktToimi("p1","kirjaa_keskustelu")');   // otsikkonappi (ei ⋯-valikossa)
    expect(P.tmKtPolkuHTML(p, { esc, t: (k) => k, tila: null, nyt: new Date(2026, 9, 19), tanaan: '2026-10-19', kausi: { tila: 'ok', tavoite: VOIMASSA }, klipit: { tila: 'ok', dokit: [] }, viikko: { tila: 'ok', docs: [] }, reviewit: { tila: 'ok', docs: {} }, voiKirjoittaa: false, toimiFn: '_ktToimi' })).not.toContain('data-kt-kirjaa-keskustelu');   // ei kirjoitusoikeutta → ei nappia
  });
});

describe('sheetin HTML: vain sisäinen, selkokieli, tilat', () => {
  const O = { esc: (s) => String(s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/"/g, '&quot;'), t: (k) => k, sovitutFn: '_s', kausiFn: '_k', tallennaFn: '_t', suljeFn: '_c', asetaFn: '_a', uudelleenFn: '_u', raporttiFn: '_avaaPelaajaraportti' };
  const D3 = { inner_drive: { pelaaja: 5, valmentaja: 3, vp: 3 }, coachability: { pelaaja: 4, valmentaja: 4 }, focus: { pelaaja: 2, valmentaja: 4 } };
  it('lomake: kuusi osiota, D3-erot nostettu, ei "Näytä myös pelaajalle" -kytkintä, ei vanhaa sanastoa (katselmus/review/IDP/Syvennä/MDT/Nelikulma), Pelaajaraportti-linkki', () => {
    const p = pel({ d3_viimeisin: { pisteet: D3 }, adar_havaintoja: 7, jaksofokus: { konsepti_avain: 'y_h1', konsepti_nimi: 'Haltuunotto', alkoi: iso(-10), kesto_vk: 6, domeeni: 'teknis_taktinen' } });
    const h = KE.tmKeSheetHTML(S({ pid: 'p1', kausiValinta: 'pidetaan' }), { ...O, p, nyt: NYT });
    for (const n of [1, 2, 3, 4, 5]) expect(h).toContain('data-kes-s="' + n + '"');
    expect((h.match(/data-kes-ero/g) || []).length).toBe(2); expect(h).toContain('Pelaajaraportti ↗'); expect(h).toContain('data-kes-raportti'); expect(h).toContain('_avaaPelaajaraportti(&quot;p1&quot;)'); expect(h).toContain('Pelihavaintoja: 7');
    expect(h).toContain('aria-pressed="true"'); expect(h).not.toMatch(/data-nk-|Näytä myös pelaajalle|checkbox/); expect(h.replace(/<[^>]+>/g, ' ')).not.toMatch(/katselmu|review|Syvennä|IDP|MDT|Nelikulma/i);
    expect(KE.tmKeD3Erot(D3).map((e) => e.key)).toEqual(['inner_drive', 'focus']);
  });
  it('tilat: lataus · virhe (yritä uudelleen) · ei tavoitetta (ohje + Aseta kauden tavoite, ei kenttää) · ehdotus (odottaa hyväksyntää + Avaa kauden tavoite, ei kenttää)', () => {
    const h = (S2) => KE.tmKeSheetHTML(S2, { ...O, p: pel(), nyt: NYT });
    expect(h(S({ lataa: true }))).toContain('data-kes-lataa'); expect(h(S({ virhe: true }))).toContain('data-kes-uudelleen');
    const ei = h(S({ kausi: { tila: 'ei' } })); expect(ei).toContain('Kehityskeskustelun voi kirjata, kun pelaajalle on asetettu kauden tavoite.'); expect(ei).toContain('Aseta kauden tavoite'); expect(ei).not.toContain('data-kes-sovitut');
    const ehd = h(S({ kausi: { tila: 'ehdotus' } })); expect(ehd).toContain('Kauden tavoite odottaa hyväksyntää'); expect(ehd).toContain('Avaa kauden tavoite'); expect(ehd).not.toContain('data-kes-tallenna');
  });
  it('FI-tekstit eivät sisällä vanhaa sanastoa; kuoressa vain ohut kytkentä (logiikka libeissä)', () => {
    expect(Object.values(KE.FI).filter((v) => /katselmu|review|Syvennä|IDP|MDT|Nelikulma/i.test(v))).toEqual([]);
    for (const f of ['lib/tm_kt_keskustelu.js', 'lib/tm_kt_keskustelu_sheet.js']) expect(lue(f).split('\n').length, f).toBeLessThanOrEqual(500);
  });
});

describe('luonnos selaimen tallennukseen (D100 sääntö 3): per pelaaja, try/catch, tyhjennys', () => {
  const sheetSrc = lue('lib/tm_kt_keskustelu_sheet.js');
  it('avain per seura + pelaaja; tallennus/luku/poisto try/catchissa; tyhjennetään tallennuksen jälkeen ja kun luonnos hylätään tai tallennettu (onSulje false)', () => {
    expect(sheetSrc).toContain("'tm_kes_luonnos:' + (env.sid || '') + ':' + pid"); expect((sheetSrc.match(/try \{/g) || []).length).toBeGreaterThanOrEqual(5);
    expect(sheetSrc).toMatch(/var valmis = function \(\) \{ env\.sheet\.tallennettu\(_id\(pid\)\); _tyhjenna\(pid\)/); expect(sheetSrc).toContain('if (!likainen && x && x.S.kausi && x.S.kausi.tila === \'voimassa\') _tyhjenna(pid)');
  });
  it('varasto joka heittää (yksityinen tila) ei kaada: ohjain toimii muistiluonnoksella', () => {
    const SH = require('../lib/tm_kt_keskustelu_sheet.js'); const heittaa = { getItem() { throw new Error('x'); }, setItem() { throw new Error('x'); }, removeItem() { throw new Error('x'); } };
    const kirj = []; const sheet = { avoinna: () => null, luonnos: () => false, avaa: () => true, tallennettu() {}, sulje() {} };
    const el = () => ({ innerHTML: '', querySelector: () => null, dispatchEvent() {} }), doc = { createElement: el };
    const o = SH.tmKtKeskusteluSheet({ doc, sheet, varasto: heittaa, t: (k) => k, esc: String, toast: (m) => kirj.push(m), pelaaja: () => pel(), nimi: () => 'Aatu', lataaKausi: async () => ({ tavoite: VOIMASSA }), nyt: () => new Date(2026, 9, 19), sid: '', db: null });
    return o.avaa('p1').then((ok) => { expect(ok).toBe(true); });
  });
});

describe('D3-vertailu: uusi sivu "Psyykkinen arvio" / "Pelaaja · Valmentajat · VP"; vanha renderöinti tavu tavulta ennallaan (Master/VP, Sibbo 1.11.)', () => {
  const SNAP = JSON.parse(lue('tests/fixtures/d3_vertailu_vanha.json')), A = { inner_drive: { pelaaja: 5, valmentaja: 3, vp: 3 }, coachability: { pelaaja: 4, valmentaja: 4 }, focus: { pelaaja: 2, valmentaja: 4 } }, B = { resilience: { pelaaja: 3, valmentaja: 3, vp: 3 } };
  it('oletus (ilman optiota) = snapshot origin/mainin renderöinnistä: otsikko "D3 kalibraatio", sarakkeet Pel/Val/VP, 30 px, vihje', () => {
    expect(N.renderD3VertailuHTML(A)).toBe(SNAP.a); expect(N.renderD3VertailuHTML(B)).toBe(SNAP.b); expect(N.renderD3VertailuHTML({})).toBe(SNAP.e); expect(N.renderD3VertailuHTML(null)).toBe(SNAP.n);
    expect(SNAP.a).toContain('D3 kalibraatio'); expect(SNAP.a).toContain('>Pel<'); expect(SNAP.a).toContain('VP ei ole vielä arvioinut'.slice(0, 0));
  });
  it('uusi sivu: sheetin osio 2 näyttää "Psyykkinen arvio" ja "Pelaaja / Valmentajat / VP"; ei D3/Pel/Val/kalibraatio-sanastoa; samat luvut ja ⚠', () => {
    const h = KE.tmKeSheetHTML(S({ pid: 'p1' }), { esc: String, t: (k) => k, p: pel({ d3_viimeisin: { pisteet: A } }), sovitutFn: 'a', kausiFn: 'b', tallennaFn: 'c', suljeFn: 'd', asetaFn: 'e', uudelleenFn: 'f', raporttiFn: 'g', nyt: NYT });
    const t = h.replace(/<[^>]+>/g, ' ').replace(/\s+/g, ' ');
    expect(t).toContain('Psyykkinen arvio Pelaaja Valmentajat VP'); expect(t).not.toMatch(/D3|kalibraatio|>Pel<|\bVal\b|\bPel\b/i); expect(h).toContain('⚠');
    expect(N.renderD3VertailuHTML(A, { otsikko: 'O', sarakkeet: ['a', 'b', 'c'], kuilu: 'k' })).toContain('title="k"');
  });
});
