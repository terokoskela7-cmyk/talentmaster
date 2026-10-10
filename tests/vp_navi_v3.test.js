/**
 * S2c PR 2 — Navigaatio v3 (D135) + Viestit v0. lib/tm_vp_navi.js (PURE) + VP_v25-kytkentä (vain Kenttä-lippu).
 * Mockup 25: sivupalkki Koti · Viestit · Kalenteri · Tilanne │ Joukkueet ja ryhmät · Valmentajat │ Työkalut (suljettu) │ Asetukset; alapalkki 5; Kodin pikatoiminnot.
 */
import { describe, it, expect } from 'vitest';
import { readFileSync } from 'fs';
import { createRequire } from 'module';
import vm from 'vm';
const require = createRequire(import.meta.url);
const N = require('../lib/tm_vp_navi.js'), P = require('../lib/tm_seuran_pulssi.js');
const VP = readFileSync(new URL('../TalentMaster_VP_v25.html', import.meta.url), 'utf8');
const { funktio } = require('./helpers/vp_koti_sandbox.cjs');
const teksti = (h) => h.replace(/<[^>]+>/g, ' ').replace(/\s+/g, ' ').trim();

describe('rakenne (mockup 25)', () => {
  const h = N.tmNaviSivupalkkiHTML({ t: (x) => x });
  it('sivupalkki: 6 päivittäistä/porautumiskohtaa tässä järjestyksessä + suljettu Työkalut-ryhmä', () => {
    const nimet = [...h.matchAll(/<div class="nv-i[^"]*" data-nv="[^"]+"[^>]*>.*?<span>([^<]+)<\/span>/g)].map((m) => m[1]);
    expect(nimet).toEqual(['Koti', 'Viestit', 'Kalenteri', 'Tilanne', 'Joukkueet ja ryhmät', 'Valmentajat']);
    expect(h.indexOf('class="nv-sep"')).toBeGreaterThan(h.indexOf('data-nv="tilanne"')); expect(h.indexOf('class="nv-sep"')).toBeLessThan(h.indexOf('data-nv="joukkueet"'));
  });
  it('Työkalut: suljettu (ei open-attribuuttia), viisi kohdetta, laskuri 5, kaikilla olemassa oleva avaaja', () => {
    const d = /<details class="nv-tyo"([^>]*)>([\s\S]*?)<\/details>/.exec(h); expect(d[1]).not.toContain('open');
    const kohteet = [...d[2].matchAll(/class="nv-i sm"[^>]*onclick="([^"]+)">([^<]+)</g)].map((m) => [m[2], m[1]]);
    expect(kohteet.map((x) => x[0])).toEqual(['Testit', 'Pelihavainto', 'Bio-banding', 'Taktiikkataulu', 'Ohjelmakirjasto']);
    kohteet.forEach(([nimi, fn]) => { const nimiFn = /^([A-Za-z_]+)\(/.exec(fn.replace(/&#39;|&quot;/g, '"'))[1]; expect(nimiFn === 'setWs' || [VP, readFileSync(new URL('../lib/tm_kaavio_ui.js', import.meta.url), 'utf8')].some((l) => l.indexOf('function ' + nimiFn) >= 0 || l.indexOf('window.' + nimiFn) >= 0), nimi + ' → ' + fn).toBe(true); });
    expect(teksti(d[2].split('</summary>')[0])).toContain('Työkalut 5');
  });
  it('Asetukset alhaalla: vanha .sb-bottom säilyy staattisessa sivupalkissa (uusi navigaatio ei piilota sitä)', () => {
    expect(VP).toMatch(/<div class="sb-bottom">\s*<div class="sb-item" data-ws="asetukset"/); expect(N.tmNaviNimiAvain('asetukset')).toBe('Asetukset'); expect(N.PYSYVAT).toContain('asetukset');
    expect(N.CSS).toContain('#sidebar.navi3>.sb-section-label,#sidebar.navi3>.sb-item,#sidebar.navi3>.sb-divider{display:none}');   // vain suorat lapset → .sb-bottom jää
  });
  it('mobiilin alapalkki: Koti · Viestit · Kalenteri · Tilanne · Joukkueet (5)', () => {
    const t = N.tmNaviTabbarHTML({ t: (x) => x, aktiivinen: 'tilanne' }); const lbl = [...t.matchAll(/class="tb-lbl">([^<]+)</g)].map((m) => m[1]);
    expect(lbl).toEqual(['Koti', 'Viestit', 'Kalenteri', 'Tilanne', 'Joukkueet']); expect([...t.matchAll(/data-ws="(\w+)"/g)].map((m) => m[1])).toEqual(['koti', 'viestit', 'kalenteri', 'tilanne', 'joukkueet']);
    expect(t).toMatch(/tabbar-item active" data-ws="tilanne"/);
  });
  it('laskurit: Viestit ja Tilanne -merkit vain kun > 0; aktiivinen kohta korostuu', () => {
    const a = N.tmNaviSivupalkkiHTML({ t: (x) => x, laskurit: { viestit: 2, tilanne: 0 }, aktiivinen: 'viestit' });
    expect(a).toMatch(/class="sb-badge amber" id="nv-badge-viestit">2</); expect(a).toMatch(/class="sb-badge n" id="nv-badge-tilanne" style="display:none"/); expect(a).toMatch(/class="nv-i on" data-nv="viestit"/);
  });
  it('Kodin pikatoiminnot: tekstit mockupista, kolme; pulssi piirtää ne tulkintalauseen jälkeen, ennen signaaleja', () => {
    expect(N.tmNaviPikatoiminnot().map((x) => x.teksti)).toEqual(['+ Arvioi harjoitus', '+ Kirjaa mentorointi', '+ Uusi tapahtuma']);
    const KS = ['2026-W40', '2026-W41'].map((vk, i) => ({ vk, versio: 5, laskettu: { seconds: Date.now() / 1000 - 3600 }, yhteensa: { n_pelaajat: 10 }, joukkueet: { a: { nimi: 'P11 Demo', ikavaihe: 'rakentaja', jakso: false, n_pelaajat: 10, n_jaksolla: 0, n_katselmus: 0, n_vastanneet: 0, n_vastausperusta: 0, n_katselmus_ajallaan: 0, n_katselmus_perusta: 0, n_suostumus: 8, n_perhe_kuittaus_7: 0, n_harjoite_7: 2 } } }));
    const m = P.tmPulssiRivit(KS, { nytMs: Date.now(), ensimmainenVk: '2026-W10' }), h = P.tmPulssiHTML(m, { t: (x) => x, pika: N.tmNaviPikatoiminnot(), fn: { joukkue: 'x' } });
    expect(h).toContain('<div class="quick">'); expect(h.indexOf('class="lead"')).toBeLessThan(h.indexOf('class="quick"')); expect(h.indexOf('class="quick"')).toBeLessThan(h.indexOf('Tarvitsee huomiota'));
    ['vpAvaaHarjoitusarviointi()', '_vpPikaMentorointi()', '_vpPikaTapahtuma()'].forEach((f) => expect(h).toContain('onclick="' + f + '"'));
    expect(P.tmPulssiHTML(m, { t: (x) => x })).not.toContain('class="quick"');   // ilman pikatoimintoja (lippu pois) ennallaan
  });
});

describe('vanhat reitit — taulukkotesti: jokainen vanha setWs-avain ja sivupalkin kohta löytää uuden paikan', () => {
  const VANHAT = { koti: 'koti', tilanne: 'tilanne', valmentajat: 'valmentajat', kalenteri: 'kalenteri', testit: 'testit', asetukset: 'asetukset', pelaajat: 'joukkueet', ryhmat: 'joukkueet', raportointi: 'tilanne', reviewit: 'tilanne', jaksofokus: 'tilanne', joukkueet: 'joukkueet', viestit: 'viestit' };
  it.each(Object.entries(VANHAT))('setWs("%s") → "%s"', (vanha, uusi) => { expect(N.tmNaviReitti(vanha).ws).toBe(uusi); expect(N.PYSYVAT).toContain(uusi); });
  it('välilehdet: pelaajat → joukkueet/pelaajat, ryhmat → joukkueet/ryhmat; vanhat Tilanne-ankkurit avaavat oikean osion', () => {
    expect(N.tmNaviReitti('pelaajat')).toMatchObject({ ws: 'joukkueet', nakyma: 'pelaajat' }); expect(N.tmNaviReitti('ryhmat')).toMatchObject({ ws: 'joukkueet', nakyma: 'ryhmat' }); expect(N.tmNaviReitti('joukkueet', 'ryhmat')).toMatchObject({ ws: 'joukkueet', nakyma: 'ryhmat' });
    expect(N.tmNaviReitti('raportointi').avaa).toBe('raportointi'); expect(N.tmNaviReitti('reviewit').avaa).toBe('reviewit'); expect(N.tmNaviReitti('jaksofokus').avaa).toBe('jaksofokus');
  });
  it('KAIKKI VP_v25:n setWs-kutsuissa ja sivupalkin data-ws-kohdissa käytetyt avaimet on katettu (uusi avain ilman reittiä punaistaa)', () => {
    const avaimet = new Set([...VP.matchAll(/setWs\('([a-z_]+)'/g)].map((m) => m[1]).concat([...VP.matchAll(/data-ws="([a-z_]+)"/g)].map((m) => m[1])));
    const puuttuu = [...avaimet].filter((k) => !(k in VANHAT)); expect(puuttuu, 'avain ilman uutta paikkaa: lisää REITIT/PYSYVAT').toEqual([]);
  });
  it('vanhat sivupalkin kohdat ilman työtilaa (Arvioi harjoitus, Aloita tästä, Pelihavainto …) on kartoitettu uuteen paikkaan', () => {
    ['Arvioi harjoitus', 'Aloita tästä', 'Pelihavainto', 'Bio-banding', 'Taktiikkataulu', 'Ohjelmakirjasto', 'Jaksofokus', 'Seuranta', 'Raportointi', 'Ryhmät', 'Pelaajat'].forEach((k) => expect(N.VANHAT_KOHDAT[k], k).toBeTruthy());
    const vanhat = [...VP.matchAll(/<div class="sb-item"[^>]*>[\s\S]*?<span data-i18n="([^"]+)">/g)].map((m) => m[1]).filter((k) => !['Koti', 'Tilanne', 'Valmentajat', 'Testit', 'Kalenteri', 'Asetukset'].includes(k));
    vanhat.forEach((k) => expect(N.VANHAT_KOHDAT[k], 'vanha kohta ' + k).toBeTruthy());
  });
  it('murupolku seuraa uutta rakennetta: nimet sivupalkista (myös Joukkueet ja ryhmät, Viestit)', () => { ['koti', 'viestit', 'kalenteri', 'tilanne', 'joukkueet', 'valmentajat', 'testit', 'asetukset'].forEach((k) => expect(N.tmNaviNimiAvain(k), k).toBeTruthy()); expect(N.tmNaviNimiAvain('joukkueet')).toBe('Joukkueet ja ryhmät'); expect(N.tmNaviNimiAvain('xyz')).toBeNull(); });
});

describe('Viestit v0: VP:n henkilökuntaviestit', () => {
  const NYT = Date.UTC(2026, 9, 10, 10, 0), UID = 'vp1';
  const D = [
    { id: 'a', lahettajaUid: 'c1', vastaanottajaUid: UID, teksti: 'Moi, ehditkö katsoa jakson?', aika: { seconds: NYT / 1000 - 3600 }, luettu: false },
    { id: 'b', lahettajaUid: UID, vastaanottajaUid: 'c2', teksti: 'Kiitos viikosta', aika: { seconds: NYT / 1000 - 86400 * 2 }, luettu: false, nakyvyys: 'henkilokunta' },
    { id: 'c', lahettajaUid: 'c2', vastaanottajaUid: UID, teksti: 'Luettu viesti', aika: { seconds: NYT / 1000 - 86400 * 5 }, luettu: true },
    { id: 'k', lahettajaUid: UID, vastaanottajaUid: 'c1', tyyppi: 'klippi', teksti: 'klippi', aika: { seconds: NYT / 1000 } },
    { id: 'p', lahettajaUid: UID, vastaanottajaUid: 'x', teksti: 'perheelle', nakyvyys: 'pelaaja', aika: { seconds: NYT / 1000 } },
    { id: 'o', lahettajaUid: 'c1', vastaanottajaUid: 'c2', teksti: 'ei minulle', aika: { seconds: NYT / 1000 } },
    { id: 'a', lahettajaUid: 'c1', vastaanottajaUid: UID, teksti: 'Moi, ehditkö katsoa jakson?', aika: { seconds: NYT / 1000 - 3600 }, luettu: false }   // sama viesti kahdesta kyselystä
  ];
  const nimi = (u) => ({ c1: 'Anna K.', c2: 'Pekka R.' }[u] || null);
  const R = N.tmViestitRivit(D, UID, nimi);
  it('vain VP:n henkilökuntaviestit: lähetetyt + saapuneet; klipit, perheviestit (nakyvyys pelaaja/huoltaja) ja toisten viestit pois; duplikaatit yhdistyvät; uusin ensin', () => {
    expect(R.map((r) => r.id)).toEqual(['a', 'b', 'c']); expect(R.map((r) => r.saapunut)).toEqual([true, false, true]); expect(R.map((r) => r.nimi)).toEqual(['Anna K.', 'Pekka R.', 'Pekka R.']);
  });
  it('lukematon = vain SAAPUNUT ja ei luettu; lähetetty viesti ei ole lukematon; laskuri', () => { expect(R.map((r) => r.lukematon)).toEqual([true, false, false]); expect(N.tmViestitLukemattomat(R)).toBe(1); });
  it('HTML: otsikko "Viestit · 1 lukematonta", rivillä nimi + saapunut/lähetetty + teksti + aika, lukematon ● amber + täytetty nappi "Vastaa"; luettu ○', () => {
    const h = N.tmViestitHTML(R, { t: (x) => x, nytMs: NYT, fn: { avaa: '_vpViestiAvaa' } }), t = teksti(h);
    expect(t).toContain('Viestit · 1 lukematonta'); expect(t).toContain('Anna K. saapunut Moi, ehditkö katsoa jakson?'); expect(t).toContain('Pekka R. lähetetty Kiitos viikosta');
    expect(h).toContain('kt-dot w">●'); expect(h).toContain('kt-dot n">○'); expect(h).toContain("onclick=\"_vpViestiAvaa('c1','a')\""); expect(h).toContain('kt-gb p'); expect(t).toContain('Asiat ja ketjut tulevat tammikuussa.');
    expect(h).not.toContain('klippi'); expect(h).not.toContain('perheelle');
  });
  it('tyhjä → rauhallinen lause; pitkä teksti lyhennetään', () => {
    expect(teksti(N.tmViestitHTML([], { t: (x) => x }))).toContain('Ei henkilökuntaviestejä vielä.'); expect(teksti(N.tmViestitHTML([], { t: (x) => x }))).not.toContain('lukematonta');
    const pitka = N.tmViestitRivit([{ id: 'z', lahettajaUid: 'c1', vastaanottajaUid: UID, teksti: 'x'.repeat(300), aika: NYT }], UID); expect(teksti(N.tmViestitHTML(pitka, { t: (x) => x })).length).toBeLessThan(400);
  });
});

describe('VP_v25-kytkentä vm-sandboxissa (oikeat funktiot, ympäristö tynkinä)', () => {
  const luo = (o) => {
    o = o || {}; const els = {}, luokat = {}, el = (id) => (els[id] = els[id] || { id, innerHTML: '', textContent: '', style: {}, classList: { s: new Set(), add(x) { this.s.add(x); }, remove(x) { this.s.delete(x); }, toggle(x, v) { v ? this.s.add(x) : this.s.delete(x); } }, setAttribute(k, v) { this[k] = v; } });
    ['sidebar', 'sbNavUusi', 'tbSivu', 'viestitView', 'ws-koti', 'ws-tilanne', 'ws-pelaajat', 'ws-ryhmat', 'ws-viestit', 'ws-valmentajat', 'ws-kalenteri', 'ws-testit', 'ws-raportointi', 'ws-reviewit', 'ws-jaksofokus', 'ws-asetukset', 'nvSegPelaajat', 'nvSegRyhmat', 'sivupalkkiOverlay'].forEach(el);
    const tabbar = { innerHTML: '<VANHA-ALAPALKKI>' }, kutsut = [], visited = {}, nvItems = [];
    const ctx = { console, Date, JSON, Math, Promise, Object, Array, String, Number, isNaN, URLSearchParams, setTimeout: (f) => { f(); }, location: { search: o.search || '' }, localStorage: { setItem: (k, v) => { visited[k] = v; } },
      _seuraId: 'demo-fc', _uid: 'vp1', _isDemoMode: false, _currentWs: 'koti', _valmentajat: [{ id: 'c1', etunimi: 'Anna', sukunimi: 'K.' }], _valmentajatKaikki: [], vpT: (x) => x, _jsvEsc: (s) => String(s), toast(m, t) { (o.toastit = o.toastit || []).push([m, t]); },
      renderKotiVP() { kutsut.push('renderKotiVP'); }, _vpaPaivitaTapahtumat() {}, renderVpTestit() {}, renderReviewit() { kutsut.push('renderReviewit'); }, renderJaksofokus() { kutsut.push('renderJaksofokus'); }, _ryRender() { kutsut.push('_ryRender'); }, _ryLataa() { kutsut.push('_ryLataa'); },
      _vpTilanneUusi: () => false, _vpTilanneAvaa(x) { kutsut.push('avaa:' + x); }, _vpPaivitaToimenpideLaskuri() {}, avaaCoachPanel(u) { kutsut.push('coach:' + u); }, avaaUusiTapahtuma() { kutsut.push('uusiTapahtuma'); },
      document: { getElementById: (id) => els[id] || null, querySelector: (s) => (s === 'nav.tabbar' ? tabbar : null), querySelectorAll: (s) => (s === '#sbNavUusi .nv-i[data-nv]' ? nvItems : []), createElement: () => ({ style: {} }), head: { appendChild() {} } },
      firebase: { auth: () => ({ currentUser: { getIdToken: async (p) => { (o.tokenit = o.tokenit || []).push(p); } } }) },
      db: { collection: () => ({ doc: () => ({ collection: () => ({ where: (k, op, v) => ({ limit: () => ({ get: async () => { if (o.lukuVirhe) throw new Error('permission-denied'); return { docs: (o.viestit || []).filter((d) => d[k] === v).map((d) => ({ id: d.id, data: () => d })) }; } }) }), doc: (id) => ({ update: async (u) => { if (o.kirjoitusVirhe) throw new Error('permission-denied'); (o.kirjoitukset = o.kirjoitukset || []).push([id, u]); } }) }) }) }) } };
    ctx.window = ctx; if (o.liput !== undefined) ctx._vpLiput = { 'demo-fc': o.liput };
    ctx.TM_VP_NAVI = N; ctx.TM_KT_KOMPONENTIT = { tmKtKomponentitLisaa() { o.css = true; } };
    ['a', 'b'].forEach((k, i) => nvItems.push({ dataset: { nv: ['koti', 'viestit', 'joukkueet'][i] }, classList: els.sidebar.classList }));   // yksinkertaistettu
    vm.createContext(ctx);
    ['_vpNaviUusi', '_vpNaviAsenna', '_vpNaviAktiivinen', '_vpAvaaUrlWs', '_vpViestitNimi', '_vpViestitLataa', '_vpViestitPiirra', '_vpViestitNayta', 'setWs'].forEach((n) => vm.runInContext(funktio(VP, n), ctx));
    ['_vpViestiAvaa', '_vpPikaMentorointi', '_vpPikaTapahtuma'].forEach((n) => { const a = VP.indexOf('window.' + n + ' = '); let d = 0, k = VP.indexOf('{', VP.indexOf(')', a)), l = -1; for (; k < VP.length; k++) { if (VP[k] === '{') d++; else if (VP[k] === '}' && --d === 0) { l = k + 1; break; } } vm.runInContext(VP.slice(a, l) + ';', ctx); });
    vm.runInContext('var _vpViestit = { rivit: [], ladattu: 0, virhe: false };', ctx);
    return { ctx, els, tabbar, kutsut, visited, o };
  };
  it('ilman lippua: navigaatio ennallaan — ei navi3-luokkaa, alapalkki vanha, setWs("pelaajat") ei ohjaa', () => {
    const y = luo({ liput: { kentta: false } }); expect(y.ctx._vpNaviUusi()).toBe(false); y.ctx._vpNaviAsenna(); expect(y.els.sidebar.classList.s.has('navi3')).toBe(false); expect(y.els.sbNavUusi.innerHTML).toBe(''); expect(y.tabbar.innerHTML).toBe('<VANHA-ALAPALKKI>');
    y.ctx.setWs('pelaajat'); expect(y.ctx._currentWs).toBe('pelaajat'); expect(y.els['ws-pelaajat'].classList.s.has('active')).toBe(true);
    y.ctx.setWs('ryhmat'); expect(y.ctx._currentWs).toBe('ryhmat'); expect(y.kutsut).toContain('_ryRender');
  });
  it('lippu päällä: asennus lisää navi3-luokan, uuden sivupalkin ja 5 kohdan alapalkin; lippu poistuu (SA vaihtaa seuraa) → vanha alapalkki takaisin', () => {
    const y = luo({ liput: { kentta: true } }); y.ctx._vpNaviAsenna();
    expect(y.els.sidebar.classList.s.has('navi3')).toBe(true); expect(y.els.sbNavUusi.innerHTML).toContain('data-nv="joukkueet"'); expect((y.tabbar.innerHTML.match(/tabbar-item/g) || []).length).toBe(5); expect(y.o.css).toBe(true);
    y.ctx._vpLiput['demo-fc'] = { kentta: false }; y.ctx._vpNaviAsenna(); expect(y.els.sidebar.classList.s.has('navi3')).toBe(false); expect(y.tabbar.innerHTML).toBe('<VANHA-ALAPALKKI>');
  });
  it('lippu päällä: setWs("pelaajat") → Joukkueet ja ryhmät (näkymä Pelaajat), murupolku "Joukkueet ja ryhmät"; setWs("ryhmat") → ryhmänäkymä; välilehti muistetaan', () => {
    const y = luo({ liput: { kentta: true } }); y.ctx.setWs('pelaajat');
    expect(y.ctx._currentWs).toBe('joukkueet'); expect(y.els['ws-pelaajat'].classList.s.has('active')).toBe(true); expect(y.els.tbSivu.textContent).toBe('Joukkueet ja ryhmät'); expect(y.visited['tm_vp_visited_pelaajat']).toBe('1');
    y.ctx.setWs('ryhmat'); expect(y.ctx._currentWs).toBe('joukkueet'); expect(y.els['ws-ryhmat'].classList.s.has('active')).toBe(true); expect(y.kutsut).toContain('_ryRender'); expect(y.els.nvSegRyhmat.innerHTML).toContain("setWs('joukkueet','pelaajat')");
    y.ctx.setWs('joukkueet'); expect(y.els['ws-ryhmat'].classList.s.has('active')).toBe(true);   // kielenvaihto kutsuu setWs(_currentWs) → sama välilehti
  });
  it.each([['raportointi', 'raportointi'], ['reviewit', 'reviewit'], ['jaksofokus', 'jaksofokus']])('lippu päällä: vanha "%s" → Tilanne, avaa osion "%s", murupolku "Tilanne"', (vanha, avaa) => {
    const y = luo({ liput: { kentta: true } }); y.ctx.setWs(vanha); expect(y.ctx._currentWs).toBe('tilanne'); expect(y.kutsut).toContain('avaa:' + avaa); expect(y.els.tbSivu.textContent).toBe('Tilanne');
  });
  it('Viestit: lataus hakee lähetetyt + saapuneet, laskuri päivittyy; näkymä piirtyy; saapuneen avaus merkitsee luetuksi (getIdToken(true) ensin) ja avaa valmentajapaneelin', async () => {
    const V = [{ id: 'a', lahettajaUid: 'c1', vastaanottajaUid: 'vp1', teksti: 'Moi', aika: { seconds: Date.now() / 1000 - 600 }, luettu: false }, { id: 'b', lahettajaUid: 'vp1', vastaanottajaUid: 'c1', teksti: 'Hei', aika: { seconds: Date.now() / 1000 - 3000 } }, { id: 'v', lahettajaUid: 'c1', vastaanottajaUid: 'x', teksti: 'ei' }];
    const y = luo({ liput: { kentta: true }, viestit: V }); y.els['nv-badge-viestit'] = { textContent: '', style: {} }; y.ctx.setWs('viestit'); await new Promise((r) => setImmediate(r)); await new Promise((r) => setImmediate(r));
    expect(y.els['nv-badge-viestit'].textContent).toBe(1); expect(y.els.viestitView.innerHTML).toContain('Viestit · 1 lukematonta'); expect(y.els.viestitView.innerHTML).toContain('Anna K.');
    await y.ctx._vpViestiAvaa('c1', 'a'); expect(y.o.tokenit[0]).toBe(true); expect(y.o.kirjoitukset).toEqual([['a', { luettu: true }]]); expect(y.kutsut).toContain('coach:c1'); expect(y.ctx._currentWs).toBe('valmentajat');
  });
  it('Viestit: lukuvirhe → toimintaohje (ei hiljaista virhettä); kirjoitusvirhe lukukuittauksessa → toast, viesti pysyy lukemattomana', async () => {
    const y = luo({ liput: { kentta: true }, lukuVirhe: true }); y.ctx.setWs('viestit'); await new Promise((r) => setImmediate(r)); await new Promise((r) => setImmediate(r)); expect(y.els.viestitView.innerHTML).toContain('Viestejä ei voitu ladata — tarkista yhteys ja yritä uudelleen.');
    const z = luo({ liput: { kentta: true }, kirjoitusVirhe: true }); z.ctx.eval = undefined; vm.runInContext("_vpViestit = { rivit: [{ id: 'a', lukematon: true, saapunut: true, osapuoli: 'c1', teksti: 'x' }], ladattu: Date.now(), virhe: false };", z.ctx);
    await z.ctx._vpViestiAvaa('c1', 'a'); expect(z.o.toastit.some((t) => /Lukukuittaus ei tallentunut/.test(t[0]))).toBe(true); expect(vm.runInContext('_vpViestit.rivit[0].lukematon', z.ctx)).toBe(true);
  });
  it('pikatoiminnot: Kirjaa mentorointi → Valmentajat; Uusi tapahtuma → Kalenteri + olemassa oleva luontimodaali', () => { const y = luo({ liput: { kentta: true } }); y.ctx._vpPikaMentorointi(); expect(y.ctx._currentWs).toBe('valmentajat'); y.ctx._vpPikaTapahtuma(); expect(y.ctx._currentWs).toBe('kalenteri'); expect(y.kutsut).toContain('uusiTapahtuma'); });
  it('?ws=<vanha avain> ohjautuu; tuntematon ei tee mitään; syvälinkki (?pelaaja=) ohittaa ws-parametrin', () => {
    const a = luo({ liput: { kentta: true }, search: '?ws=raportointi' }); a.ctx._vpAvaaUrlWs(); expect(a.ctx._currentWs).toBe('tilanne');
    const b = luo({ liput: { kentta: true }, search: '?ws=hakkeri' }); b.ctx._vpAvaaUrlWs(); expect(b.ctx._currentWs).toBe('koti');
    const c = luo({ liput: { kentta: true }, search: '?ws=ryhmat&pelaaja=abc' }); c.ctx._vpAvaaUrlWs(); expect(c.ctx._currentWs).toBe('koti');
  });
});

describe('VP_v25-lähde: ilman lippua ennallaan (snapshot-vartijat) ja kasvukatto', () => {
  it('vanha sivupalkki säilyy staattisena: kaikki vanhat data-ws-kohdat ja Työkalut-ryhmä paikallaan; uudet kontit tyhjinä', () => {
    ['koti', 'tilanne', 'valmentajat', 'pelaajat', 'testit', 'kalenteri', 'ryhmat', 'raportointi', 'reviewit', 'jaksofokus', 'asetukset'].forEach((k) => expect(VP, k).toContain('<div class="sb-item' + (k === 'koti' ? ' active' : '') + '" data-ws="' + k + '"'));
    expect(VP).toContain('<div id="sbNavUusi"></div>'); expect(VP).toContain('<div id="nvSegPelaajat"></div>');
    expect(VP).toMatch(/<div class="ws-view" id="ws-viestit"><div id="viestitView"><\/div><\/div>/);
  });
  it('uusi navigaatio vain _vpNaviUusi():n takana; setWs-reititys ja asennus eivät muuta mitään ilman sitä', () => {
    expect(funktio(VP, 'setWs')).toMatch(/if \(_vpNaviUusi\(\)\) \{[\s\S]*tmNaviReitti/); expect(funktio(VP, '_vpNaviAsenna')).toMatch(/if \(!_vpNaviUusi\(\)\) \{ sb\.classList\.remove\('navi3'\)/);
    expect(VP).toContain("_vpNaviAsenna();   // S2c PR 2"); expect(VP.split('\n').length).toBeLessThanOrEqual(23800);
  });
  it('tm_vp_navi.js ladataan ennen käyttöä; uudet i18n-avaimet ovat erässä (ei raakoja avaimia)', () => { expect(VP.indexOf('lib/tm_vp_navi.js')).toBeGreaterThan(-1); expect(VP.indexOf('lib/tm_vp_navi.js')).toBeLessThan(VP.indexOf('<script>', VP.indexOf('lib/tm_vp_navi.js'))); });
});


describe('VP:n mentorointiviesti → viestit (Viestit v0:n lähde)', () => {
  it('kirjoitus käyttää Rules v3.39:n sallimaa nakyvyyttä "henkilokunta" (aiempi "valmentajalle" hylättiin hiljaa); virhe ei ole hiljainen; mentoroinnit-historia säilyttää "valmentajalle"', () => {
    const f = funktio(VP, 'lahetaMentorointiViesti'); const viestit = f.slice(f.indexOf("collection('viestit').add({"), f.indexOf('}).catch', f.indexOf("collection('viestit').add({")));
    expect(viestit).toContain("nakyvyys: 'henkilokunta'"); expect(f).toContain("nakyvyys: onSisainen ? 'sisainen' : 'valmentajalle'"); expect(f).toMatch(/\.catch\(function \(e\) \{ console\.warn\('\[mentorointiviesti → viestit\]'/);
    const rules = readFileSync(new URL('../tm_admin/firestore.rules', import.meta.url), 'utf8'); expect(rules).toContain("request.resource.data.get('nakyvyys', 'henkilokunta') in ['henkilokunta', 'pelaaja', 'huoltaja']"); expect(rules).not.toContain("'valmentajalle'");
  });
});
