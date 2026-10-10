/**
 * S2c PR 1 — Tilanne = kausi (docs/CODE_BRIEF_S2C_TILANNE_NAVI.md, D123; mockup 25). lib/tm_vp_tilanne.js (PURE) + VP_v25-kytkentä.
 * Järjestys: tilannekortit → aikajana → jaksopalaveri → poikkeamat → mittaustilanne → ehdotukset → talentit + syntymäkvartaalit.
 */
import { describe, it, expect } from 'vitest';
import { readFileSync } from 'fs';
import { createRequire } from 'module';
const require = createRequire(import.meta.url);
const TT = require('../lib/tm_vp_tilanne.js');
const VP = readFileSync(new URL('../TalentMaster_VP_v25.html', import.meta.url), 'utf8');

const DAY = 86400000, NYT = Date.UTC(2026, 9, 9, 10, 0);   // pe 9.10.2026 (vk 41)
const idx = (ms) => TT.viikkoIdx(ms);
const J = (nimi, o) => Object.assign({ jid: nimi, nimi, ika: 12, n: 15, voimassa: true, jakso: { nimi: 'Pelaaminen', a0: idx(NYT) - 2, a1: idx(NYT) + 3, N: 6 }, katselmusAuki: false, katselmusPv: null }, o || {});
const SYOTE = (o) => Object.assign({ nytMs: NYT, joukkueet: [J('P11 Demo'), J('P13 Demo', { katselmusAuki: true, katselmusPv: 6 }), J('P15 Demo', { voimassa: false, jakso: null })], seura: { njakso: 2, joukkueita: 3 },
  katselmusKausi: { ajallaan: 9, perusta: 11, jaksoja: 4 }, mitattu: [{ nimi: 'P11 Demo', pvm: '2026-10-08', ms: Date.UTC(2026, 9, 8) }, { nimi: 'P13 Demo', pvm: '2025-11-01', ms: Date.UTC(2025, 10, 1) }, { nimi: 'P15 Demo', pvm: null, ms: null }],
  kausiAlkuMs: Date.UTC(2026, 7, 1), testijakso: { a0: idx(NYT) + 4, a1: idx(NYT) + 5, nimi: 'Testijakso' }, palaveri: { ms: NYT + 24 * DAY, id: 'jp' },
  poikkeamat: [], ehdotukset: [], idpN: 6, talentit: { n: 4, ehdokkaita: 2, odottaa: 0 }, rae: { n: 90, yht: 96, riittava: true, pct: { Q1: 32, Q2: 29, Q3: 22, Q4: 17 }, signaali: null }, d1: { riittava: false, joukkueN: 2, joukkueYht: 9 } }, o || {});
const HTML = (o, fn) => TT.tmTilanneHTML(TT.tmTilanneMalli(SYOTE(o)), { t: (x) => x, fn: fn || {} });
const teksti = (h) => h.replace(/<[^>]+>/g, ' ').replace(/\s+/g, ' ');

describe('viikot', () => {
  it('ISO-viikkonumero ja vuodenvaihde (W52/W53 → W01)', () => {
    expect(TT.viikkoNro(idx(Date.UTC(2026, 9, 9)))).toBe(41);
    expect(TT.viikkoNro(idx(Date.UTC(2026, 11, 28)))).toBe(53);
    expect(TT.viikkoNro(idx(Date.UTC(2027, 0, 4)))).toBe(1);
    expect(idx(Date.UTC(2026, 9, 12)) - idx(Date.UTC(2026, 9, 9))).toBe(1);   // ma = uusi viikko
    expect(idx(Date.UTC(2026, 9, 11)) - idx(Date.UTC(2026, 9, 5))).toBe(0);   // su ja edellinen ma samalla viikolla
  });
});

describe('1 · neljä tilannekorttia (mockup 25 kpi)', () => {
  const k = TT.tmTilanneMalli(SYOTE()).kortit;
  it('Jaksolla x/y, ilman-nimet; Katselmukset ajallaan (kausi); Mitattu tällä kaudella x/y + testijakso; IDP odottaa', () => {
    expect(k.jaksolla).toEqual({ a: 2, b: 3, ilman: ['P15'] });
    expect(k.katselmus).toMatchObject({ pros: 82, jaksoja: 4, ajallaan: 9, perusta: 11 });
    expect(k.mitattu.a).toBe(1); expect(k.mitattu.b).toBe(3); expect(k.mitattu.heikko).toBe(true); expect(k.mitattu.testijakso).toEqual({ a: 45, b: 46 });
    expect(k.idp).toBe(6);
  });
  it('HTML (mockup 30): neljä kysymyskorttia — kysymys · luku · lähde; ei nimiä, ei nauhaa', () => {
    const h = HTML(), t = teksti(h); expect((h.match(/class="kt-q"/g) || []).length).toBe(4); expect(h).toContain('kt-q3 four');
    ['Onko joukkueilla jakso?', '2 /3', '1 ilman jaksoa', 'Ovatko katselmukset ajallaan?', '9 /11', '2 auki', 'Onko mitattu tällä kaudella?', 'testijakso vk 45–46', 'Odottaako IDP vahvistusta?', 'pelaajaa odottaa'].forEach((x) => expect(t, x).toContain(x));
  });
  it('ei päättyneitä jaksoja → "—" (ei 0 %)', () => {
    const t = teksti(HTML({ katselmusKausi: { ajallaan: 0, perusta: 0, jaksoja: 0 } })); expect(t).toContain('Ovatko katselmukset ajallaan? — ei vielä päättyneitä jaksoja');
  });
});

describe('2 · kauden aikajana (D43)', () => {
  const m = TT.tmTilanneMalli(SYOTE());
  it('14 viikkoa: nyt−4 … nyt+9; nyt-merkki, jaksopalaveri ja testijakso omilla viikoillaan', () => {
    expect(m.aikajana.n).toBe(14); expect(m.aikajana.nyt - m.aikajana.A).toBe(4); expect(m.aikajana.otsikot.map((o) => o.nro).slice(0, 3)).toEqual([37, 38, 39]);
    expect(m.aikajana.palaveri.idx).toBe(idx(NYT + 24 * DAY)); expect(m.aikajana.testijakso).toMatchObject({ a: 45, b: 46 });
  });
  it('HTML: jakso-palkki + ◆ katselmus jakson viimeisellä viikolla + nyt-merkki; ei jaksoa → ei palkkia; legendassa merkit', () => {
    const h = HTML();
    expect((h.match(/class="tt-ajb( w)?"/g) || []).length).toBe(2); expect((h.match(/class="tt-ajk"/g) || []).length).toBe(2);
    expect(h).toContain('tt-ajm" style="--c:4'); expect(h).toContain('tt-ajm tp'); expect(h).toContain('tt-ajt');
    ['◆ katselmus', '│ nyt', '┆ jaksopalaveri', '▒ testijakso vk 45–46'].forEach((x) => expect(teksti(h)).toContain(x));
  });
  it('mobiili: aikajana vierii OMASSA laatikossaan (overflow-x), sivu ei', () => {
    expect(TT.CSS).toMatch(/\.tt-ajw\{overflow-x:auto/); expect(TT.CSS).toMatch(/\.tt-aj\{[^}]*min-width:660px/);
  });
});

describe('3 · jaksopalaveri', () => {
  it('valmis = jakso käynnissä JA katselmus ei auki; ryhmät Valmiina · Kesken · Ei jaksoa lyhyillä tunnisteilla; palaveri kalenterista', () => {
    const m = TT.tmTilanneMalli(SYOTE()); expect(m.palaveri.valmiit).toBe(1); expect(m.palaveri.yht).toBe(3);
    expect(m.palaveri.ok.map((x) => x.tunniste)).toEqual(['P11']); expect(m.palaveri.w.map((x) => x.tunniste)).toEqual(['P13']); expect(m.palaveri.n.map((x) => x.tunniste)).toEqual(['P15']);
    expect(m.vaihe).toBe('rytmi'); expect(m.signaali).toMatchObject({ w: true, n: 1, auki: ['P13'] });   // 2/3 jaksolla → Rytmi → signaalikortti = jaksopalaverin valmius (D170)
    const h = HTML(), t = teksti(h); expect(t).toMatch(/Jaksopalaveri · \S+ 2\.11\. · 24 päivää/); expect(t).toContain('Yksi katselmus auki ennen palaveria.'); expect(t).toContain('P13: jakso päättyy vk'); expect(t).toContain('Avaa esityslista');
    expect(t).toContain('1 jakso käynnissä'); expect(t).toContain('1 katselmus auki'); expect(t).toContain('1 ei jaksoa'); expect(h).toContain('class="kt-nauha iso"'); expect(t).not.toContain('P13 Demo (katselmus)');   // ei joukkuenimiä lauseina
  });
  it('esityslista: jaksot+katselmukset, poikkeamat, ehdotukset, onnistumiset', () => {
    const m = TT.tmTilanneMalli(SYOTE({ ehdotukset: [{ ids: ['a'], teksti: 'Ehdotus A', luotu: NYT }] })), t = teksti(TT.tmTilanneEsityslistaHTML(m, ['Onnistuminen X'], { t: (x) => x }));
    ['1 · Jaksot ja katselmukset', '2 · Poikkeamat', '3 · Ehdotukset', '4 · Onnistumiset', 'Kesken 1 P13', 'Ei jaksoa 1 P15', 'Ehdotus A', 'Onnistuminen X'].forEach((x) => expect(t, x).toContain(x));
  });
});

describe('Design: komponentit, tokenit', () => {
  it('käyttää jaettuja .kt-*-komponentteja; oma CSS ei määrittele niitä uudelleen; ei hex/rgb-värejä; vain sallitut tokenit', () => {
    const h = HTML(); ['kt-eb', 'kt-sig', 'kt-btn', 'kt-ev', 'kt-sig-h'].forEach((c) => expect(h).toContain(c));
    ['kt-sig', 'kt-sig-h', 'kt-sig-why', 'kt-btn', 'kt-eb', 'kt-ev', 'kt-q3'].forEach((c) => expect(TT.CSS).not.toMatch(new RegExp('(^|[}\\n,])\\.' + c + '[{ .:,]')));
    expect(TT.CSS).not.toMatch(/#[0-9a-fA-F]{3,8}\b/); expect(TT.CSS).not.toMatch(/rgba?\(/);
    const sallitut = new Set(['teal', 'amber', 'red', 'ink', 'ink2', 'ink3', 'bg', 'border', 'teal-brd', 'font-serif', 'font-mono', 'font-sans', 'kt-serif', 'amber-dim', 'tt-teal-dim', 'ov-1', 'n', 'c', 's', 'w', 'fs-h1', 'fs-h2', 'fs-lead', 'fs-body', 'fs-meta', 'fs-eb']);
    expect([...new Set((TT.CSS.match(/var\(--[a-z0-9-]+/g) || []).map((x) => x.slice(6)))].filter((x) => !sallitut.has(x))).toEqual([]);
  });
  it('mitat mockupista: KPI-luku Cormorant --fs-h2; aikajanan otsikot DM Sans --fs-meta (D169: DM Mono vain .kt-eb); rivi --fs-body; kortin radius 6', () => {
    expect(TT.CSS).toMatch(/\.tt-bigv\{font-family:var\(--font-serif\);font-size:var\(--fs-h2,26px\)/); expect(TT.CSS).toMatch(/\.tt-ajh\{font-family:var\(--font-sans\);font-size:var\(--fs-meta,12\.5px\)/); const KTC = require('../lib/tm_kt_komponentit.js').CSS; expect(KTC).toMatch(/\.kt-vr\{[^}]*font-size:var\(--fs-body,14px\)/); expect(KTC).toMatch(/\.kt-vl\{[^}]*border-radius:6px/);   // rivilista on jaetussa komponenttitiedostossa
  });
});

describe('tmTilanneSyote (VP:n globaaleista malliin)', () => {
  const rivit = [{ jid: 'a', nimi: 'P11 Demo', ikaNum: 11, ikavaihe: 'leikkija', n: 8, pieni: false, leikkija: true, jakso: { voimassa: true, nimi: 'Ensikosketus' }, jaksoVk: { vk: 3, N: 6 }, nKatselmusAuki: 0, katselmusPv: null }];
  const env = (o) => Object.assign({ nytMs: NYT, pelaajat: [{ id: 'p1', hh_pvm: '2026-10-08', talenttiOhjelma: true }], joukkueDocs: [{ id: 'a', jaksofokus: { alku: '2026-09-21', kesto_vk: 6, osa_alueet: { tekninen_taktinen: { nimi: 'Ensikosketus' } } } }],
    kalenteri: [{ id: 'jp', tyyppi: 'jaksopalaveri', alkaa: NYT + 10 * DAY, poistettu: false }, { id: 'x', tyyppi: 'harjoitus', alkaa: NYT + DAY }], tapahtumat: [{ tila: 'suunniteltu', pvm_alku: '2026-11-09', pvm_loppu: '2026-11-15', nimi: 'T' }, { tila: 'avoin', pvm_alku: '2026-11-01' }],
    pulssi: { malli: { rivit, seura: { njakso: 1, joukkueita: 1 } }, koosteet: [{ joukkueet: { a: { n_katselmus_ajallaan: 2, n_katselmus_perusta: 3, ikavaihe: 'rakentaja' } } }] },
    fn: { ryhmittely: () => ({ 'P11 Demo': [{ id: 'p1', hh_pvm: '2026-10-08' }] }) }, idpN: 6, kausiAlkuMs: Date.UTC(2026, 7, 1) }, o || {});
  it('joukkuejakso aikajanalle joukkuedokumentista; jaksopalaveri vain tyypiltä jaksopalaveri; testijakso vain suunniteltu; katselmus kaudelta (ei Leikkijää)', () => {
    const s = TT.tmTilanneSyote(env());
    expect(s.joukkueet[0].jakso).toMatchObject({ nimi: 'Ensikosketus', N: 6 }); expect(s.joukkueet[0].jakso.a1 - s.joukkueet[0].jakso.a0).toBe(5);
    expect(s.palaveri).toMatchObject({ id: 'jp' }); expect(s.testijakso.nimi).toBe('T'); expect(s.katselmusKausi).toEqual({ ajallaan: 2, perusta: 3, jaksoja: 1 });
    expect(s.mitattu[0].pvm).toBe('2026-10-08'); expect(s.talentit.n).toBe(1);
  });
  it('ilman pulssimallia (ei lukuoikeutta/ei dataa) ei kaadu', () => { expect(() => TT.tmTilanneMalli(TT.tmTilanneSyote({ nytMs: NYT, pulssi: {} }))).not.toThrow(); });
});

describe('VP_v25-kytkentä (kuoressa vain kytkentä; ilman lippua ennallaan)', () => {
  it('uusi Tilanne vain Kenttä-lipulla: _vpTilanneUusi vaatii lipun ja libit; early-return vain sen takana', () => {
    expect(VP).toMatch(/function _vpTilanneUusi\(\) \{[^}]*lp\.kentta === true[^}]*TM_VP_TILANNE/);
    expect(VP).toMatch(/if \(_vpTilanneUusi\(\)\) \{ _vpPaivitaToimenpideLaskuri\(\); _vpTilanneKausi\(\); return; \}/);
    expect(VP).toMatch(/if \(_vpTilanneUusi\(\) && \(ws === 'reviewit' \|\| ws === 'jaksofokus' \|\| ws === 'raportointi'\)\)/);
  });
  it('Seuranta, Jaksofokus ja Raportointi siirretään (appendChild) — ei uudelleenrenderöintiä, ei toiminto katoa', () => {
    expect(VP).toMatch(/\['ws-raportointi', 'tilanneRaportit'\], \['ws-reviewit', 'tilanneSeuranta'\], \['ws-jaksofokus', 'tilanneJaksofokus'\]/); expect(VP).toMatch(/while \(a\.firstChild\) b\.appendChild\(a\.firstChild\)/);
  });
  it('vanha Tilanne piiloon vain .tt-uusi-luokalla (CSS), uusi kontti oletuksena piilossa', () => {
    expect(VP).toContain('#tilanneKausi,#tilanneLiite{display:none}#ws-tilanne.tt-uusi>*{display:none}'); expect(VP).toMatch(/<script src="lib\/tm_vp_tilanne\.js\?v=\d+">/);
  });
  it('ei kasva yli kasvukaton', () => { expect(VP.split('\n').length).toBeLessThanOrEqual(23800); });
});

describe('adapteri vm-sandboxissa (oikeat VP-funktiot, ympäristö tynkinä)', () => {
  const vm = require('vm'), { funktio } = require('./helpers/vp_koti_sandbox.cjs');
  const luo = (o) => {
    o = o || {}; const els = {}, el = (id) => (els[id] = els[id] || { id, innerHTML: '', children: [], classList: { s: new Set(), add(x) { this.s.add(x); }, remove(x) { this.s.delete(x); } }, style: {}, open: false, scrollIntoView() { o.scrolled = (o.scrolled || 0) + 1; }, get firstChild() { return this.children[0] || null; }, appendChild(c) { this.children.push(c); } });
    ['tilanneKausi', 'ws-tilanne', 'ws-raportointi', 'tilanneRaportit', 'tilanneRaportitDet', 'tilanneSeurantaDet', 'tilanneJaksofokusDet'].forEach(el);
    Object.values(els).forEach((e) => { Object.defineProperty(e, 'firstChild', { get() { return this.children[0] || null; } }); e.appendChild = function (c) { if (c._p) c._p.children.splice(c._p.children.indexOf(c), 1); c._p = this; this.children.push(c); }; });   // oikea DOM-siirtosemantiikka
    els['ws-raportointi'].children = [{ n: 1 }, { n: 2 }].map((c) => Object.assign(c, { _p: els['ws-raportointi'] }));
    const ctx = { console, Date, JSON, Math, Promise, Object, Array, String, Number, isNaN, setTimeout, window: null, _seuraId: 'demo-fc', _pelaajat: [], _vpJoukkueDocs: [], _kalenteriTapahtumat: [], _tapahtumat: [], _toimenpiteet: [], _idpJono: [], vpT: (x) => x, _jsvEsc: (x) => String(x), vpTToimenpide: (x) => x,
      document: { getElementById: (id) => els[id] || null, createElement: () => ({ style: {} }), head: { appendChild() {} } }, _laskeKausi: () => ({ alku: new Date(2026, 7, 1) }), _vpKatselmusPv: () => ({}), _vpJaksoVk: () => ({}), _vpEhdotusLista: () => [], _talentitGemEhdokkaat: () => ({ ehdokkaat: [], odottaa: { phv_puuttuu: 0, alaraja: 0 } }),
      _pRyhmiteltyJoukkueittain: () => ({}), laskeJoukkuePoikkeamat: () => [], _jsvJoukkueIkaSp: () => ({}), raeJoukkueJakauma: () => ({ n_kvartaalillisia: 0, pct: {} }), raeChip: () => ({}), _tilanneRenderKerrokset() { o.vanha = (o.vanha || 0) + 1; }, _vpSignaaliKortit: () => ({ kortit: [] }),
      _vpPulssiLataa: async () => { if (o.lukuVirhe) throw new Error('permission-denied'); return { koosteet: o.koosteet || [], ensin: '2026-W20' }; }, setWs() {} };
    ctx.window = ctx; if (o.liput !== undefined) ctx._vpLiput = { 'demo-fc': o.liput };
    ctx.TM_VP_TILANNE = TT; ctx.TM_SEURAN_PULSSI = require('../lib/tm_seuran_pulssi.js'); ctx.TM_KOTI_LUVUT = require('../lib/tm_koti_luvut.js'); ctx.TM_KT_KOMPONENTIT = { tmKtKomponentitLisaa() { o.cssLisatty = true; } };
    vm.createContext(ctx);
    ['_vpTilanneUusi', '_vpTilanneKausi', '_vpTilanneSiirraTyotilat', '_vpTilanneAvaa'].forEach((n) => vm.runInContext(funktio(VP, n), ctx));
    return { ctx, els, o };
  };
  const tick = () => new Promise((r) => setImmediate(r));
  const KS = [{ vk: '2026-W41', versio: 5, laskettu: { seconds: NYT / 1000 }, yhteensa: { n_pelaajat: 10 }, joukkueet: { a: { nimi: 'P11 Demo', ikavaihe: 'leikkija', jakso: true, n_pelaajat: 10, n_jaksolla: 10, n_katselmus: 0, n_vastanneet: 0, n_vastausperusta: 0, n_katselmus_ajallaan: 0, n_katselmus_perusta: 0, n_perhe_kuittaus_7: 5, n_harjoite_7: 0 } } }];
  it('ilman lippua: _vpTilanneUusi() false → uutta Tilannetta ei piirretä', () => { const y = luo({ liput: { kentta: false } }); expect(y.ctx._vpTilanneUusi()).toBe(false); const z = luo({}); expect(z.ctx._vpTilanneUusi()).toBe(false); });
  it('lippu päällä: ladataan koosteet, Tilanne piirtyy (.tt-uusi, komponentti-CSS lisätty), tilannekortit ja aikajana näkyvät', async () => {
    const y = luo({ liput: { kentta: true }, koosteet: KS }); expect(y.ctx._vpTilanneUusi()).toBe(true);
    y.ctx._vpTilanneKausi(); expect(y.els['tilanneKausi'].innerHTML).toContain('Ladataan pulssia…'); await tick(); await tick();
    expect(y.els['ws-tilanne'].classList.s.has('tt-uusi')).toBe(true); expect(y.o.cssLisatty).toBe(true);
    const h = y.els['tilanneKausi'].innerHTML; expect(h).toContain('kt-q3 four'); expect(h).toContain('Kausi · jaksot aikajanalla'); expect(h).toContain('P11 Demo'); expect(h).not.toContain('Mihin tartut nyt');
  });
  it('kooste-luku epäonnistuu (ei oikeutta) → vanha Tilanne takaisin (ei lukittu virhetilaan)', async () => {
    const y = luo({ liput: { kentta: true }, lukuVirhe: true }); y.ctx._vpTilanneKausi(); await tick(); await tick();
    expect(y.els['ws-tilanne'].classList.s.has('tt-uusi')).toBe(false); expect(y.o.vanha).toBe(1); expect(y.ctx._vpTilanneUusi()).toBe(false);
  });
  it('Raportointi-työtilan sisältö siirtyy esityslistan liitteeksi; vanha avain avaa oikean ankkurin', () => {
    const y = luo({ liput: { kentta: true } }); y.ctx._vpTilanneSiirraTyotilat(); expect(y.els['tilanneRaportit'].children).toHaveLength(2);
    y.ctx._vpTilanneAvaa('raportointi'); expect(y.els['tilanneRaportitDet'].open).toBe(true); expect(y.o.scrolled).toBe(1); y.ctx._vpTilanneAvaa('reviewit'); expect(y.els['tilanneSeurantaDet'].open).toBe(true);
  });
});

describe('murupolku (tbSivu) uudessa Tilanteessa', () => {
  const vm = require('vm'), { funktio } = require('./helpers/vp_koti_sandbox.cjs');
  const NIMI = { koti: 'Koti', tilanne: 'Tilanne', reviewit: 'Seuranta', jaksofokus: 'Jaksofokus', raportointi: 'Raportointi' };
  const luo = (lippu) => {
    const bc = { textContent: 'Koti', attrs: {}, setAttribute(k, v) { this.attrs[k] = v; } }, aktiivinen = { ws: null }, visited = {}, kutsut = [];
    const ctx = { console, setTimeout: (f) => { f(); }, _currentWs: 'koti', vpT: (x) => x, localStorage: { setItem: (k, v) => { visited[k] = v; } },
      _vpNaviUusi: () => false, _vpTilanneUusi: () => lippu, renderReviewit() { kutsut.push('renderReviewit'); }, renderJaksofokus() { kutsut.push('renderJaksofokus'); }, renderKotiVP() {}, _vpaPaivitaTapahtumat() {}, renderVpTestit() {}, _vpTilanneAvaa(x) { kutsut.push('avaa:' + x); },
      document: { getElementById: (id) => (id === 'tbSivu' ? bc : id === 'ws-tilanne' ? { classList: { add() { aktiivinen.ws = 'tilanne'; } } } : null), querySelectorAll: () => [],
        querySelector: (sel) => { const m = /data-ws="(\w+)"/.exec(sel), n = m && NIMI[m[1]]; return n ? { querySelectorAll: () => [{ dataset: { i18n: n } }] } : null; } } };
    ctx.window = ctx; vm.createContext(ctx); vm.runInContext(funktio(VP, 'setWs'), ctx);
    return { ctx, bc, visited, kutsut };
  };
  it('lippu päällä: setWs("tilanne") → murupolku "Tilanne" (ei "Koti")', () => { const y = luo(true); y.ctx.setWs('tilanne'); expect(y.bc.textContent).toBe('Tilanne'); expect(y.bc.attrs['data-i18n']).toBe('Tilanne'); expect(y.ctx._currentWs).toBe('tilanne'); });
  it.each(['reviewit', 'jaksofokus', 'raportointi'])('lippu päällä: vanha avain "%s" ohjautuu Tilanteeseen JA murupolku on "Tilanne" (ei "Seuranta"/"Raportointi")', (ws) => {
    const y = luo(true); y.ctx.setWs(ws); expect(y.bc.textContent).toBe('Tilanne'); expect(y.ctx._currentWs).toBe('tilanne'); expect(y.kutsut).toContain('avaa:' + ws);
  });
  it('lippu päällä: "raportointi" merkitään silti käydyksi (Aloita tästä -checklist käyttää vanhaa avainta)', () => { const y = luo(true); y.ctx.setWs('raportointi'); expect(y.visited['tm_vp_visited_raportointi']).toBe('1'); expect(y.visited['tm_vp_visited_tilanne']).toBeUndefined(); });
  it('lippu pois: ennallaan — "reviewit" → "Seuranta", "koti" → "Koti", ei ohjausta', () => {
    const y = luo(false); y.ctx.setWs('reviewit'); expect(y.bc.textContent).toBe('Seuranta'); expect(y.ctx._currentWs).toBe('reviewit'); expect(y.kutsut).not.toContain('avaa:reviewit'); y.ctx.setWs('koti'); expect(y.bc.textContent).toBe('Koti');
  });
});

/* ═══ Tilanne harvalla datalla (mockup 29, D143–D146) ═══ */
describe('harva data: tyhjät joukkueet pois, nauha, ryhmittely, kooste-kaista, D146', () => {
  const KT = require('../lib/tm_kt_komponentit.js');
  const NIMET = ['P9', 'T9', 'P10', 'T10', 'P11', 'T11', 'P12', 'T12', 'P13', 'T13', 'P14', 'T14', 'P15', 'T15', 'T18'];
  /* n joukkuetta; jaksolla = {nimi: 'ok'|'w'} */
  const TILA = (jaksolla, extra) => SYOTE(Object.assign({ joukkueet: NIMET.map((nimi) => { const t = jaksolla[nimi]; return J(nimi, { voimassa: !!t, katselmusAuki: t === 'w', jakso: t ? { nimi: 'Teema ' + nimi, a0: idx(NYT) - 1, a1: idx(NYT) + 3, N: 5 } : null }); }), seura: { njakso: Object.keys(jaksolla).length, joukkueita: 15 }, mitattu: NIMET.map((nimi) => ({ nimi, pvm: null, ms: null })) }, extra || {}));
  const PILOTTI = { P13: 'ok' }, KASVU = { P11: 'ok', P12: 'w', P13: 'ok', T13: 'ok', P14: 'ok', T14: 'w' };
  const KYPSA = Object.fromEntries(NIMET.filter((n) => n !== 'P15' && n !== 'T18').map((n, i) => [n, i % 5 === 2 ? 'w' : 'ok']).concat([['P15', 'ok'], ['T18', 'ok']]));
  const H = (jaksolla, opts) => TT.tmTilanneHTML(TT.tmTilanneMalli(TILA(jaksolla)), Object.assign({ t: (x) => x, fn: { joukkue: 'avaaJ', aloitaJaksot: 'aloita', esityslista: 'esi', auki: 'auki' } }, opts || {}));

  it('TYHJÄ JOUKKUE EI OLE NIMITTÄJÄSSÄ: tmTilanneSyote suodattaa 0 pelaajan joukkueen (jäsenyys tmPelaajanJoukkueet, ei p.joukkue); kaikki luvut ja nauha 2 joukkueesta', () => {
    const rivi = (jid, nimi) => ({ jid, nimi, ikaNum: 12, ikavaihe: 'rakentaja', n: 0, pieni: false, leikkija: false, jakso: { voimassa: true, nimi: 'X' }, jaksoVk: null, nKatselmusAuki: 0, katselmusPv: null });
    const env = { nytMs: NYT, pelaajat: [{ id: 'p1', joukkue: 'KPV T8', joukkueet: ['kpv_p13'] }, { id: 'p2', joukkueet: ['kpv_p13', 'kpv_t14'] }, { id: 'p3', joukkueet: ['kpv_t14'] }], joukkueDocs: [{ id: 'kpv_p13', nimi: 'KPV P13' }, { id: 'kpv_t14', nimi: 'KPV T14' }, { id: 'kpv_t8', nimi: 'KPV T8' }],
      pulssi: { malli: { rivit: [rivi('kpv_t8', 'KPV T8'), rivi('kpv_p13', 'KPV P13'), rivi('kpv_t14', 'KPV T14')], seura: { njakso: 3, joukkueita: 3 } }, koosteet: [] }, fn: { pelaajanJoukkueet: (p, docs) => p.joukkueet || [] } };
    const s = TT.tmTilanneSyote(env), m = TT.tmTilanneMalli(s);
    expect(s.joukkueet.map((j) => j.nimi)).toEqual(['KPV P13', 'KPV T14']); expect(s.joukkueet.map((j) => j.n)).toEqual([2, 2]);   // p.joukkue-nimi "KPV T8" ei laske T8:aa jäseneksi (jäsenyys joukkueet[])
    expect(m.kortit.jaksolla.b).toBe(2); expect(m.nauha).toHaveLength(2); expect(m.palaveri.yht).toBe(2); expect(m.mittaus.yht).toBe(2); expect(m.aikajana.rivit.map((r) => r.nimi)).not.toContain('KPV T8');
    expect(TT.tmTilanneHTML(m, { t: (x) => x })).not.toContain('T8');
  });
  it('PELAAJIA EI VIELÄ LADATTU (env.pelaajat tyhjä): joukkueita ei rajata pelaajamäärällä — koosteen r.n ratkaisee, ei 0/0; kun pelaajat latautuvat, jäsenyys ratkaisee', () => {
    const rivi = (jid, n) => ({ jid, nimi: 'KPV ' + jid.toUpperCase(), ikaNum: 12, ikavaihe: 'rakentaja', n, pieni: false, leikkija: false, jakso: { voimassa: true, nimi: 'X' }, jaksoVk: null, nKatselmusAuki: 0, katselmusPv: null });
    const base = (pelaajat) => ({ nytMs: NYT, pelaajat, joukkueDocs: [], pulssi: { malli: { rivit: [rivi('p13', 14), rivi('t14', 9), rivi('t8', 0)], seura: {} }, koosteet: [] }, fn: { pelaajanJoukkueet: (p) => p.joukkueet || [] } });
    const tyhja = TT.tmTilanneSyote(base([])), m = TT.tmTilanneMalli(tyhja);
    expect(tyhja.joukkueet.map((j) => [j.jid, j.n])).toEqual([['p13', 14], ['t14', 9]]);   // koosteen määrät; kooste-T8 (0) pois edelleen
    expect(m.kortit.jaksolla).toMatchObject({ a: 2, b: 2 }); expect(m.nauha).toHaveLength(2); expect(teksti(TT.tmTilanneHTML(m, { t: (x) => x }))).not.toContain('0/0');
    expect(TT.tmTilanneSyote({ ...base(undefined), pelaajat: undefined }).joukkueet).toHaveLength(2);   // puuttuva lista = sama kuin tyhjä
    const ladattu = TT.tmTilanneSyote(base([{ id: 'a', joukkueet: ['p13'] }]));   // pelaajat latautuneet → jäsenyys: t14:ssä ei jäseniä → pois
    expect(ladattu.joukkueet.map((j) => [j.jid, j.n])).toEqual([['p13', 1]]);
  });
  it('ilman jäsenyysfunktiota (vanha kutsuja) → koosteen n_pelaajat ratkaisee: 0 pelaajaa = pois', () => {
    const rivi = (jid, n) => ({ jid, nimi: jid, ikaNum: 12, ikavaihe: 'rakentaja', n, pieni: false, leikkija: false, jakso: { voimassa: false }, jaksoVk: null, nKatselmusAuki: 0, katselmusPv: null });
    expect(TT.tmTilanneSyote({ nytMs: NYT, pulssi: { malli: { rivit: [rivi('a', 0), rivi('b', 5)], seura: {} } } }).joukkueet.map((j) => j.jid)).toEqual(['b']);
  });
  it('NAUHA (D143): yksi segmentti per joukkue ikäjärjestyksessä; kolme tilaa MUODOSTA (täytetty / amber-ääriviiva / katkoviiva); title + aria-label tunniste ja tila', () => {
    const h = KT.tmKtNauhaHTML(TT.tmTilanneMalli(TILA(KASVU)).nauha, { t: (x) => x, iso: true });
    expect((h.match(/<i /g) || []).length).toBe(15); expect([...h.matchAll(/title="([^:"]+):/g)].map((m) => m[1])).toEqual(NIMET);   // ikäjärjestys = syötteen järjestys
    expect((h.match(/<i class="ok"/g) || []).length).toBe(4); expect((h.match(/<i class="w"/g) || []).length).toBe(2); expect((h.match(/<i class=""/g) || []).length).toBe(9);
    expect(h).toContain('title="P13: jakso käynnissä, katselmukset ajallaan" aria-label="P13: jakso käynnissä, katselmukset ajallaan"'); expect(h).toContain('title="P12: jakso kesken tai katselmus odottaa"'); expect(h).toContain('title="P9: ei jaksoa"');
    expect(KT.CSS).toMatch(/\.kt-nauha i\{[^}]*border:1px dashed var\(--ink3\)/); expect(KT.CSS).toMatch(/\.kt-nauha i\.ok\{background:var\(--teal\)/); expect(KT.CSS).toMatch(/\.kt-nauha i\.w\{[^}]*border:1px solid var\(--amber\)/);   // muoto, ei vain väri
    expect(h).toContain('<span>P9</span><span>ikäjärjestys</span><span>T18</span>'); expect(KT.CSS).not.toMatch(/#[0-9a-fA-F]{3,8}\b/);
  });
  it('nauha vain signaalikortissa (Rytmi, iso) — Käynnistyksessä ei signaalikorttia eikä nauhaa (D170, D150: tieto kerran)', () => {
    const k = H(PILOTTI); expect(k).not.toContain('kt-nauha'); expect(k).not.toContain('id="tilannePalaveri"'); expect(TT.tmTilanneMalli(TILA(PILOTTI)).signaali).toBeNull();
    const r = H(KYPSA); expect((r.match(/class="kt-nauha( iso)?" /g) || []).length).toBe(1); expect(r).toContain('class="kt-nauha iso"'); expect(teksti(H(KASVU))).not.toContain('kaikilla jakso');
  });
  it('RYHMITTELY (D144): ehdotuksen tunnisteet uniikit, kuusi + "+N"; kaistalla kymmenen + "+N"; klikkaus (auki) avaa koko ryhmän', () => {
    const tg = (x, c) => [...x.matchAll(new RegExp('<button type="button" class="tt-tg ' + c + '"[^>]*>([^<]+)<', 'g'))].map((m) => m[1]), ilman = NIMET.filter((n) => n !== 'P13');
    const h = H(PILOTTI), kaista = h.slice(h.indexOf('class="tt-ajr ilman"'), h.indexOf('</div></div>', h.indexOf('class="tt-ajr ilman"')));
    expect(tg(kaista, 'n')).toEqual(ilman.slice(0, 10).concat(['+4'])); expect(kaista).toContain('data-auki="kaista"');
    const auki = H(PILOTTI, { auki: { kaista: true } }), k2 = auki.slice(auki.indexOf('class="tt-ajr ilman"'), auki.indexOf('</div></div>', auki.indexOf('class="tt-ajr ilman"'))); expect(tg(k2, 'n')).toEqual(ilman); expect(k2).not.toContain('data-auki');
    const eh = TT.tmTilanneHTML(TT.tmTilanneMalli(TILA(PILOTTI, { ehdotukset: [{ ids: ['a'], signaali: 'tki_alhainen', luotu: NYT - DAY, teksti: 'x', joukkueet: NIMET.concat(['P9 Demo', 'P13']).map((n) => n + ' Demo') }] })), { t: (x) => x, fn: { hyvaksy: 'ok', auki: 'au' } });
    expect(tg(eh, 'ok')).toEqual(['P9', 'T9', 'P10', 'T10', 'P11', 'T11', '+9']);   // 15 nimeä, tuplat (P9, P13) pois, 6 + "+N"
    expect(teksti(h)).not.toMatch(/P13 Demo|\(ei jaksoa\)|\(katselmus\)/);
  });
  it('AIKAJANA (D145): 1/15 → yksi joukkuerivi + vinoviivakaista "Ei jaksoa · 14 joukkuetta" (tunnisteet klikattavia, "Aloita jaksot →"); 15/15 → ei kaistaa', () => {
    const h = H(PILOTTI); expect([...h.slice(h.indexOf('class="tt-ajr ilman"'), h.indexOf('</div></div>', h.indexOf('class="tt-ajr ilman"'))).matchAll(/class="tt-tg n"[^>]*>([^<]+)</g)].map((m) => m[1])).toEqual(['P9', 'T9', 'P10', 'T10', 'P11', 'T11', 'P12', 'T12', 'T13', 'P14', '+4']);   // kaistalla kymmenen tunnistetta + "+N" (mockup 30)
    expect((h.match(/class="tt-ajn"><button/g) || []).length).toBe(1); expect(h).toContain('tt-ajn ilman'); expect(h).toContain('class="tt-ajr ilman"'); expect(teksti(h)).toContain('Ei jaksoa 14 joukkuetta'); expect(h).toContain('>Aloita jaksot →<'); expect(h).toContain("onclick=\"avaaJ('P9')\"");
    expect(teksti(h)).toContain('▨ ei jaksoa');
    const k = H(KYPSA); expect(k).not.toContain('tt-ajn ilman'); expect(k).not.toContain('tt-ilmankortti'); expect((k.match(/class="tt-ajn"><button/g) || []).length).toBe(5); expect(teksti(k)).toContain('+10 jaksoa Näytä kaikki jaksot →');   // viisi riviä + "näytä kaikki" expect(teksti(k)).not.toContain('▨ ei jaksoa');
  });
  it('AIKAJANA: kun jaksoja ei ole yhtään, kaista on ainoa rivi (ei tyhjiä joukkuerivejä, ei viikkootsikoita)', () => {
    const h = H({}); expect((h.match(/class="tt-ajn"><button/g) || []).length).toBe(0); expect(h).toContain('tt-ajn ilman'); expect(teksti(h)).toContain('Ei jaksoa 15 joukkuetta'); expect(h).toContain('>Aloita jaksot →<'); expect(h).not.toContain('class="tt-ajh');
  });
  it('AIKAJANA mobiili: tiivistyy riveiksi ("Jaksot · vk 41"), kaista omana korttinaan aikajanan alla; 390 px:llä grid piilossa (container query)', () => {
    const h = H(KASVU); expect(h).toContain('class="tt-mj"'); expect(teksti(h)).toContain('Jaksot · vk 41'); expect((h.match(/class="tt-mjr"/g) || []).length).toBe(5); expect(teksti(h)).toContain('+1 jaksoa · näytä kaikki →'); expect(h).toContain('class="kt-ev tt-ilmankortti"'); expect(teksti(h)).toContain('Ei jaksoa · 9 joukkuetta');
    expect(TT.CSS).toMatch(/@container tt \(max-width:760px\)\{\.tt-ajw\{display:none\}\.tt-mj\{display:block\}\.tt-ilmankortti\{display:grid\}/); expect(TT.CSS).toMatch(/\.tt-mj,\.tt-ilmankortti\{display:none\}/);
    expect(teksti(H(KYPSA))).not.toContain('Ei jaksoa ·');
  });
  it('D164/D170 KYNNYS: alle 1/3 jaksolla (4/15) → Käynnistys, EI signaalikorttia, ainoa toiminto aikajanan "Aloita jaksot →"; 5/15 → Rytmi + signaali "Avaa esityslista" (ainoa täytetty nappi)', () => {
    const jak = (n) => Object.fromEntries(NIMET.slice(0, n).map((x) => [x, 'ok']));
    const a = H(jak(4)); expect(TT.tmTilanneMalli(TILA(jak(4))).vaihe).toBe('kaynnistys'); expect(a).not.toContain('id="tilannePalaveri"'); expect(a).not.toContain('kt-btn'); expect(a).toContain('>Aloita jaksot →<'); expect(teksti(a)).toContain('Kausi on alussa.');
    const b = H(jak(5)); expect(TT.tmTilanneMalli(TILA(jak(5))).vaihe).toBe('rytmi'); expect(b).toContain('id="tilannePalaveri"'); expect((b.match(/class="kt-btn"/g) || []).length).toBe(1); expect(b).toContain('<button class="kt-btn" type="button" onclick="esi()">Avaa esityslista</button>'); expect(teksti(b)).not.toContain('Kausi on alussa.');
    expect(TT.tmTilanneMalli(TILA(PILOTTI)).aikajana.vahan).toBe(true); expect(teksti(H(jak(8)))).toContain('Aloita jakso →');   // kaistan toiminto yksikössä kun jaksoja yli puolella
  });
  it('kolme tilaa: Pilotti 1/15 · Kasvu 6/15 · Kypsä 15/15 — kortti, kaista ja palaveri samasta mallista', () => {
    const k = (j) => TT.tmTilanneMalli(TILA(j)).kortit.jaksolla; expect(k(PILOTTI)).toMatchObject({ a: 1, b: 15 }); expect(k(KASVU)).toMatchObject({ a: 6, b: 15 }); expect(k(KYPSA)).toMatchObject({ a: 15, b: 15 });
    expect(TT.tmTilanneMalli(TILA(KASVU)).palaveri.vahan).toBe(true); expect(TT.tmTilanneMalli(TILA(KYPSA)).palaveri.vahan).toBe(false);
  });
  it('§7.22: ei pelaajanimiä Tilanteen seuratason lohkoissa harvallakaan datalla', () => { ['Topias', 'Kalle', 'Eino'].forEach((n) => expect(H(KASVU)).not.toContain(n)); });
});
