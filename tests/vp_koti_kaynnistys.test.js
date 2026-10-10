/* PR B — Kodin Käynnistys-vaihe (docs/CODE_BRIEF_KOTI_TILANNE_V2.md; mockup 33; D164–D167). lib/tm_vp_koti.js (PURE) + VP_v25-kytkentä. */
import { describe, it, expect } from 'vitest';
import { readFileSync } from 'fs';
import { createRequire } from 'module';
const require = createRequire(import.meta.url);
const KK = require('../lib/tm_vp_koti.js'), PU = require('../lib/tm_seuran_pulssi.js'), F = require('./helpers/vp_fixture.cjs'), { funktio } = require('./helpers/vp_koti_sandbox.cjs');
const VP = readFileSync(new URL('../TalentMaster_VP_v25.html', import.meta.url), 'utf8');
const NYT = Date.UTC(2026, 9, 12, 7, 0), teksti = (h) => h.replace(/<[^>]+>/g, ' ').replace(/&quot;/g, '"').replace(/\s+/g, ' ');
const rivit = (n, jaksolla, nollia) => { const k = { vk: '2026-W42', versio: 5, laskettu: { seconds: NYT / 1000 }, yhteensa: { n_pelaajat: n * 10, n_suostumus: 0 }, joukkueet: {} };
  for (let i = 0; i < n + (nollia || 0); i++) k.joukkueet['j' + i] = { nimi: 'P' + (10 + i) + ' Demo', ikavaihe: 'leikkija', tyyppi: 'kilpa', profiili: 'oto', jakso: i < jaksolla, n_pelaajat: i < n ? 10 : 0, n_jaksolla: i < jaksolla ? 10 : 0, n_suostumus: 0, jakso_nimi: i < jaksolla ? 'Teema' : null };
  return PU.tmPulssiRivit([k], { nytMs: NYT, ensimmainenVk: '2026-W20', jaksoVk: {}, katselmusPv: {} }); };
const HTML = (d, o) => { const m = PU.tmPulssiRivit(d.koosteet, { nytMs: d.nyt, ensimmainenVk: d.ensin, jaksoVk: d.jaksoVk, katselmusPv: {} }), v = d.koosteet[d.koosteet.length - 1]; const km = KK.tmKotiKaynnistysMalli(m, Object.assign({ yhteensa: v.yhteensa, koosteJ: v.joukkueet, testit: d.tapahtumat, nimet: d.nimet, kalenteri: d.kalenteri, viestit: d.viestit, nytMs: d.nyt }, o || {})); const r = KK.tmKotiKaynnistysHTML(km, { t: (x) => x, fn: { opas: 'op', aloitaJaksot: 'aj', kutsu: 'ku', testit: 'te', joukkue: 'jk', viesti: 'vi', tilanne: 'ti', kalenteri: 'ka', paivita: 'pa', demo: 'de', auki: 'au', tuo: 'tu' } }); return { km, h: r.main + r.rail }; };

describe('D164 · vaihe lasketaan koosteesta (ei käsivalintaa)', () => {
  it('alle 1/3 joukkueista jaksolla → Käynnistys; vähintään 1/3 → Rytmi (rajat: 3 joukkuetta 1 jaksolla = Rytmi, 4 joukkuetta 1 jaksolla = Käynnistys)', () => {
    expect(KK.tmKotiVaihe(rivit(3, 1))).toBe('rytmi'); expect(KK.tmKotiVaihe(rivit(4, 1))).toBe('kaynnistys'); expect(KK.tmKotiVaihe(rivit(15, 4))).toBe('kaynnistys'); expect(KK.tmKotiVaihe(rivit(15, 5))).toBe('rytmi'); expect(KK.tmKotiVaihe(rivit(9, 8))).toBe('rytmi');
  });
  it('0 pelaajan joukkueet eivät lasketa nimittäjään (2 tyhjää + 3 joukkuetta, 1 jaksolla = Rytmi)', () => { expect(KK.tmKotiVaihe(rivit(3, 1, 2))).toBe('rytmi'); });
  it('0 joukkuetta (ei koostetta/ei rivejä) → Käynnistys; fixture-tilat: tyhjä/pilotti/kuormitus Käynnistys, kypsä Rytmi', () => {
    expect(KK.tmKotiVaihe({ rivit: [] })).toBe('kaynnistys'); expect(KK.tmKotiVaihe(null)).toBe('kaynnistys');
    const v = (t) => { const d = F.lataa(t, NYT); return KK.tmKotiVaihe(PU.tmPulssiRivit(d.koosteet, { nytMs: NYT, ensimmainenVk: d.ensin, jaksoVk: {}, katselmusPv: {} })); };
    expect(['tyhja', 'pilotti', 'kypsa', 'kuormitus'].map(v)).toEqual(['kaynnistys', 'kaynnistys', 'rytmi', 'kaynnistys']);
  });
});

describe('D165 · kolme askelta', () => {
  const { km, h } = HTML(F.lataa('pilotti', NYT)), t = teksti(h);
  it('otsikko "Kauden käynnistys: kolme askelta." + lause; askeleet Jaksot 1/15 · Perheet mukana 4/160 · Testipäivät 2/15 (mockup 33)', () => {
    expect(t).toContain('Kauden käynnistys: kolme askelta.'); expect(km.askeleet.map((a) => [a.nimi, a.a, a.b])).toEqual([['Jaksot', 1, 15], ['Perheet mukana', 4, 160], ['Testipäivät', 2, 15]]);
    ['1/15', 'joukkuetta jaksolla', '4/160', 'perhettä antanut suostumuksen', 'Tilanne viikolta 42.', '2/15', 'joukkuetta varannut päivän', 'Testijakso vk 45–46. Mittaukset ennen talven jaksoja.', 'Aloita jakso joukkueen näkymässä. Jakso antaa joukkueelle teeman ja viikkotavoitteet.'].forEach((x) => expect(t, x).toContain(x));
  });
  it('sivun ainoa täytetty nappi on ensimmäisellä keskeneräisellä askeleella ("Aloita jaksot"); muut ovat tekstilinkkejä "Kutsu loput 156 →" ja "Sovi päivät →"', () => {
    expect((h.match(/class="kt-btn"/g) || []).length).toBe(1); expect(h).toMatch(/<button class="kt-btn" type="button" onclick="aj\(\)">Aloita jaksot<\/button>/);
    expect(h).toMatch(/<button class="kk-lnk" type="button" onclick="ku\(\)">Kutsu loput 156 →<\/button>/); expect(h).toMatch(/<button class="kk-lnk" type="button" onclick="te\(\)">Sovi päivät →<\/button>/);
  });
  it('täytetty nappi siirtyy: kun jaksot on tehty (≥ 1/3 → Rytmi) seuraava keskeneräinen saa napin (malli)', () => {
    const m = rivit(15, 4), km2 = KK.tmKotiKaynnistysMalli(m, { yhteensa: { n_pelaajat: 150, n_suostumus: 0 }, koosteJ: {}, nytMs: NYT }); expect(km2.askeleet.filter((a) => a.taytetty).map((a) => a.id)).toEqual(['jaksot']);
    const m2 = rivit(3, 1), km3 = KK.tmKotiKaynnistysMalli(m2, { yhteensa: { n_pelaajat: 30, n_suostumus: 0 }, koosteJ: {}, nytMs: NYT }); expect(km3.askeleet.find((a) => a.id === 'jaksot').valmis).toBe(true); expect(km3.askeleet.filter((a) => a.taytetty).map((a) => a.id)).toEqual(['perheet']);
  });
  it('ei prosentteja eikä 0/0 askelissa (D125); testipäivät 0/15 kun yhtään varausta ei ole', () => {
    expect(t).not.toMatch(/\d\s?%/); expect(t).not.toMatch(/\b0\/0\b/); const d = F.lataa('pilotti', NYT); d.tapahtumat = d.tapahtumat.filter((e) => !e.joukkue); expect(teksti(HTML(d).h)).toContain('0/15'); expect(teksti(HTML(d).h)).toContain('joukkuetta varannut päivän');
  });
  it('Perheet mukana: luku koosteen yhteensa-kentästä (ei pelaajalistasta)', () => { const d = F.lataa('pilotti', NYT); d.koosteet[d.koosteet.length - 1].yhteensa.n_suostumus = 20; expect(HTML(d).km.askeleet[1]).toMatchObject({ a: 20, b: 160 }); expect(teksti(HTML(d).h)).toContain('Kutsu loput 140 →'); });
});

describe('Tällä viikolla · Jaksolla nyt · Odottaa jaksoa · oikea palsta', () => {
  it('Tällä viikolla: VP:tä odottava viesti ("Viesti · P12") + "1 asia"; "ei jaksoa" -signaalit eivät toistu (askel 1 hoitaa)', () => {
    const { h } = HTML(F.lataa('pilotti', NYT)), t = teksti(h); expect(t).toContain('Tällä viikolla'); expect(t).toContain('1 asia'); expect(t).toContain('Viesti · P12'); expect(t).toContain('Valmentaja: "Testipäivä vk 45 sopii meille."'); expect(t).not.toMatch(/ilman jaksoa 4 vk|ei ole aloittanut uutta jaksoa/);
    expect(h).toContain("onclick=\"vi('valm0','v0')\"");
  });
  it('Jaksolla nyt: rivi P10 · teema · "Leikkijä · 10 pel. · vk 3/6"; perheluvut kattavuusportin alla → "perheitä mukana 3/10", ei Katsaus/Käyttö-lukuja', () => {
    const { km, h } = HTML(F.lataa('pilotti', NYT)), t = teksti(h); expect(km.jaksollaRivit).toHaveLength(1); expect(km.jaksollaRivit[0].luvut).toBeNull();
    expect(t).toContain('Jaksolla nyt'); expect(t).toContain('Pelaaminen'); expect(t).toContain('Leikkijä · 10 pel. · vk 3/6'); expect(t).toContain('perheitä mukana 3/10'); expect(t).not.toContain('Käyttö 7 pv');
  });
  it('kattavuusportin yli (suostumus ≥ 70 %, ≥ 5 pelaajaa) rivillä Katsaus ja Käyttö 7 pv; alle → perheitä mukana', () => {
    const d = F.lataa('pilotti', NYT); const k = d.koosteet[d.koosteet.length - 1]; k.joukkueet.pil2.n_suostumus = 9; const a = HTML(d); expect(a.km.jaksollaRivit[0].luvut).not.toBeNull(); expect(teksti(a.h)).toContain('Käyttö 7 pv'); expect(teksti(a.h)).not.toContain('perheitä mukana');
    k.joukkueet.pil2.n_suostumus = 6; expect(HTML(d).km.jaksollaRivit[0].luvut).toBeNull();   // 6/10 < 70 %
  });
  it('Odottaa jaksoa: 14 tunnistetta ikäjärjestyksessä (ei tyhjiä joukkueita P18/T18); yli 14 → "+N"; klikkaus avaa joukkueen', () => {
    const { km, h } = HTML(F.lataa('pilotti', NYT)); expect(km.odottaa).toHaveLength(14); expect(km.odottaa[0].tunniste).toBe('P8'); expect(teksti(h)).toContain('Odottaa jaksoa · 14'); { const o = h.slice(h.indexOf('kk-odottaa')); expect((o.slice(0, o.indexOf('Ehdota jaksot')).match(/class="kk-tag"/g) || []).length).toBe(7); }   // D144: 6 tagia + "+8" expect(h).not.toMatch(/>(P18|T18)</); expect(h).toContain("onclick=\"jk('P8 Pilotti')\"");
    const k = HTML(F.lataa('kuormitus', NYT)); expect(teksti(k.h)).toContain('Odottaa jaksoa · 30'); expect(k.h).toMatch(/data-auki|onclick="au\('odottaa'\)">\+\d+</);
  });
  it('Odottaa jaksoa -rivillä aina "Ehdota jaksot →" (mockup 33): sama kohde kuin Aloita jaksot -napilla (aj)', () => {
    ['pilotti', 'kuormitus'].forEach((t) => { const h = HTML(F.lataa(t, NYT)).h; expect(h).toMatch(/<button class="kk-lnk" type="button" onclick="aj\(\)">Ehdota jaksot →<\/button>/); expect(h).toMatch(/<button class="kt-btn" type="button" onclick="aj\(\)">Aloita jaksot<\/button>/); });
  });
  it('D150: "Aloita tästä" -opas piilossa oletuksena kaikissa vaiheissa; vain sivun lopun "Näytä opas" -linkki palauttaa sen (VP: luokka vpk-hide-guide ws-koti:ssa)', () => {
    expect(teksti(HTML(F.lataa('pilotti', NYT)).h)).toContain('Näytä opas'); expect(HTML(F.lataa('pilotti', NYT)).h).toContain('onclick="op()"');
    expect(KK.CSS).toContain("#ws-koti.vpk-hide-guide #vpAloitaKortti{display:none}"); expect(VP).toContain("classList.toggle('vpk-hide-guide', p)"); expect(VP).toContain('opasLuokka(!window._vpKotiOpasNayta)');  expect(VP).toContain("opas: '_vpKotiOpas'");
  });
  it('oikea palsta: Tänään · Tulossa 14 päivää (+ testijakso vk 45–46), Avaa kalenteri →; ei lomatietoa (ei datalähdettä)', () => {
    const t = teksti(HTML(F.lataa('pilotti', NYT)).h); ['Tänään · ma 12.10.', '17.00 Harjoitus P9', 'Tulossa 14 päivää', 'to 15.10. Ottelu P10', 'Valmentajapalaveri', 'vk 45–46 Testijakso', 'Avaa kalenteri →'].forEach((x) => expect(t, x).toContain(x));
  });
  it('tyhjä seura: ei askelia; "Tuo pelaajat" on ainoa täytetty nappi; ei nollia', () => {
    const { h } = HTML(F.lataa('tyhja', NYT)), t = teksti(h); expect(t).toContain('Kauden käynnistys: aloita tuomalla pelaajat.'); expect((h.match(/class="kt-btn"/g) || []).length).toBe(1); expect(t).toContain('Tuo pelaajat'); expect(t).not.toMatch(/\b0\/0\b|\d\s?%/); expect(h).not.toContain('kk-st');
  });
});

describe('D167 · esimerkkiseura (FC Demo) erillisenä tilana', () => {
  it('tmKotiDemo: 9 keksittyä joukkuetta, vaihe Rytmi, vain muistissa (ei pelaajalistaa/oikeaa dataa)', () => {
    const D = KK.tmKotiDemo(NYT); expect(D.seuranNimi).toBe('FC Demo'); expect(Object.keys(D.koosteet[3].joukkueet)).toHaveLength(9); expect(D.pelaajat).toBeUndefined();
    expect(KK.tmKotiVaihe(PU.tmPulssiRivit(D.koosteet, { nytMs: NYT, ensimmainenVk: D.ensin, jaksoVk: {}, katselmusPv: {} }))).toBe('rytmi');
  });
  it('nauha "Esimerkkiseura · FC Demo · keksittyä dataa, ei sinun seurasi" + paluulinkki; otsikkorivillä linkki "Katso esimerkkiseura"', () => {
    expect(teksti(KK.tmKotiDemoNauhaHTML({ fn: { demo: 'x' } }))).toContain('Esimerkkiseura · FC Demo · keksittyä dataa, ei sinun seurasi'); expect(KK.tmKotiDemoNauhaHTML({ fn: { demo: 'x' } })).toContain("onclick=\"x('0')\"");
    expect(HTML(F.lataa('pilotti', NYT)).h).toContain("onclick=\"de('1')\"");
  });
  it('VP: demo-tila vain istunnossa ja vain nykyiselle seuralle (_vpKotiDemo === _seuraId); demon aikana ei kuittauksia/kirjoituksia (fn {}) eikä oikeaa pelaajadataa', () => {
    expect(VP).toContain('window._vpKotiDemo === _seuraId'); expect(VP).toContain("window._vpKotiDemo = p === '1' ? _seuraId : null");
    const lohko = VP.slice(VP.indexOf('function _renderKotiPulssi'), VP.indexOf('/* ═══ S2c PR 1: Tilanne = kausi')); expect(lohko).toContain('fn: demo ? {} :'); expect(lohko).toContain('testit: demo ? [] : _tapahtumat'); expect(lohko).toContain('viestit: demo ? [] :'); expect(lohko).toContain('seuraNimi: demo ? D.seuranNimi');
  });
});

describe('VP-kytkentä (lippu pois = vanha Koti ennallaan)', () => {
  it('Käynnistys vain omalle seuralle (ei demossa); Rytmi muulloin ja demossa; kaikki lib/tm_vp_koti.js:n kautta', () => {
    const l = VP.slice(VP.indexOf('function _renderKotiPulssi'), VP.indexOf('/* ═══ S2c PR 1: Tilanne = kausi')); expect(l).toContain("const kaynn = vaihe === 'kaynnistys' && !demo"); expect(l).toContain('KK.tmKotiKaynnistysHTML(KK.tmKotiKaynnistysMalli(m, env), op) : KK.tmKotiRytmiHTML(KK.tmKotiRytmiMalli(m, env), op)'); expect(l).not.toContain('tmPulssiHTML');
    expect(VP).toContain('<script src="lib/tm_vp_koti.js?v='); expect(VP.indexOf('lib/tm_vp_koti.js')).toBeGreaterThan(VP.indexOf('lib/tm_seuran_pulssi.js')); expect(VP).toContain('window.TM_SEURAN_PULSSI');
  });
  it('toiminnot käyttävät olemassa olevia polkuja: testit → avaaUusiTestiModaali, viesti → _vpViestiAvaa, joukkue → avaaJoukkueSyvanakyma, päivitys → _vpPulssiPaivita; ei uusia Firestore-kirjoituksia', () => {
    const l = VP.slice(VP.indexOf('function _renderKotiPulssi'), VP.indexOf('/* ═══ S2c PR 1: Tilanne = kausi')); ['testit: \'avaaUusiTestiModaali\'', "viesti: '_vpViestiAvaa'", "joukkue: 'avaaJoukkueSyvanakyma'", "paivita: '_vpPulssiPaivita'"].forEach((x) => expect(l, x).toContain(x));
    const h = VP.slice(VP.indexOf('window._vpKotiAloitaJaksot'), VP.indexOf('/* ═══ S2c PR 1: Tilanne = kausi')); expect(h).not.toMatch(/\.(set|update|add|delete)\(/);
  });
  it('Aloita jaksot (kuten #966): yksi jaksoton joukkue → sen näkymä; muuten Tilanteen "Ei jaksoa" -ryhmä auki', () => {
    const avatut = []; const ctx = { window: null, avaaJoukkueSyvanakyma: (n) => avatut.push(['joukkue', n]), setWs: (w) => avatut.push(['ws', w]), setTimeout: () => 0, document: { getElementById: () => null }, _vpTilanneAukiTila: {} }; ctx.window = ctx;
    const vm = require('vm'); vm.createContext(ctx); vm.runInContext(VP.slice(VP.indexOf('window._vpKotiAloitaJaksot = function'), VP.indexOf('window._vpKotiKutsu')), ctx);
    const rv = (jaksoton) => ({ _vpPulssi: { malli: { rivit: jaksoton.map((n) => ({ nimi: n, n: 10, jakso: { voimassa: false } })).concat([{ nimi: 'P1', n: 10, jakso: { voimassa: true } }, { nimi: 'Tyhjä', n: 0, jakso: { voimassa: false } }]) } } });
    Object.assign(ctx, rv(['P9 Demo'])); ctx.window._vpPulssi = ctx._vpPulssi; ctx._vpKotiAloitaJaksot(); expect(avatut).toEqual([['joukkue', 'P9 Demo']]);
    avatut.length = 0; Object.assign(ctx, rv(['P9 Demo', 'P10 Demo'])); ctx.window._vpPulssi = ctx._vpPulssi; ctx._vpKotiAloitaJaksot(); expect(avatut).toEqual([['ws', 'tilanne']]); expect(ctx._vpTilanneAukiTila).toEqual({ n: true, kaista: true });
  });
  it('Kutsu loput: kutsumattomia → Seurahallinta (kutsut lähtevät sieltä); kaikki kutsuttu → muistutus (vpMuistutaOdottavia)', () => {
    const k = []; const ctx = { window: null, _pelaajat: [], TM_KOTI_LUVUT: { suostumus: () => ({ eiKutsuttu: ctx.ei }) }, ei: 3, _talSeuraLinkki: () => 'S.html?seura=x', vpMuistutaOdottavia: () => k.push('muistuta') }; ctx.window = Object.assign(ctx, { open: (u) => k.push(['avaa', u]) }); ctx.window.TM_KOTI_LUVUT = ctx.TM_KOTI_LUVUT;
    const vm = require('vm'); vm.createContext(ctx); vm.runInContext(VP.slice(VP.indexOf('window._vpKotiKutsu = function'), VP.indexOf('window._vpKotiDemoVaihda')), ctx); ctx._vpKotiKutsu(); ctx.ei = 0; ctx._vpKotiKutsu(); expect(k).toEqual([['avaa', 'S.html?seura=x'], 'muistuta']);
  });
});
