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
    expect(k.jaksolla).toEqual({ a: 2, b: 3, ilman: ['P15 Demo'] });
    expect(k.katselmus).toEqual({ pros: 82, jaksoja: 4 });
    expect(k.mitattu.a).toBe(1); expect(k.mitattu.b).toBe(3); expect(k.mitattu.heikko).toBe(true); expect(k.mitattu.testijakso).toEqual({ a: 45, b: 46 });
    expect(k.idp).toBe(6);
  });
  it('HTML: neljä korttia, tekstit mockupista', () => {
    const h = HTML(); const t = teksti(h);
    expect((h.match(/class="kt-ev"><span class="tt-k"/g) || []).length).toBe(4);
    ['Jaksolla', 'Katselmukset ajallaan', 'Mitattu tällä kaudella', 'IDP odottaa', 'joukkuetta · P15 Demo ilman', '4 jaksoa päättynyt tällä kaudella', 'joukkuetta · testijakso vk 45–46', 'sitoumus vahvistamatta'].forEach((x) => expect(t, x).toContain(x));
  });
  it('ei päättyneitä jaksoja → "—" (ei 0 %)', () => {
    const t = teksti(HTML({ katselmusKausi: { ajallaan: 0, perusta: 0, jaksoja: 0 } })); expect(t).toContain('— ei vielä päättyneitä jaksoja');
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
    expect((h.match(/class="tt-ajb"/g) || []).length).toBe(2); expect((h.match(/class="tt-ajk"/g) || []).length).toBe(2);
    expect(h).toContain('tt-ajm" style="--c:4'); expect(h).toContain('tt-ajm tp'); expect(h).toContain('tt-ajt');
    ['◆ katselmus', '│ nyt', '┆ jaksopalaveri', '▒ testijakso vk 45–46'].forEach((x) => expect(teksti(h)).toContain(x));
  });
  it('mobiili: aikajana vierii OMASSA laatikossaan (overflow-x), sivu ei', () => {
    expect(TT.CSS).toMatch(/\.tt-ajw\{overflow-x:auto/); expect(TT.CSS).toMatch(/\.tt-aj\{[^}]*min-width:660px/);
  });
});

describe('3 · jaksopalaveri', () => {
  it('valmis = jakso käynnissä JA katselmus ei auki; kesken-syyt nimetään; palaveri kalenterista', () => {
    const m = TT.tmTilanneMalli(SYOTE()); expect(m.palaveri.valmiit).toBe(1); expect(m.palaveri.yht).toBe(3);
    expect(m.palaveri.kesken).toEqual([{ nimi: 'P13 Demo', syyt: ['katselmus'] }, { nimi: 'P15 Demo', syyt: ['ei jaksoa'] }]);
    const t = teksti(HTML()); expect(t).toContain('1/3 joukkuetta valmiina'); expect(t).toContain('Kesken: P13 Demo (katselmus), P15 Demo (ei jaksoa).'); expect(t).toMatch(/Jaksopalaveri · \S+ 2\.11\./);
    expect(t).toContain('Esityslista kokoaa jaksojen tulokset, poikkeamat, ehdotukset ja onnistumiset.');
  });
  it('esityslista: jaksot+katselmukset, poikkeamat, ehdotukset, onnistumiset', () => {
    const m = TT.tmTilanneMalli(SYOTE({ ehdotukset: [{ ids: ['a'], teksti: 'Ehdotus A', luotu: NYT }] })), t = teksti(TT.tmTilanneEsityslistaHTML(m, ['Onnistuminen X'], { t: (x) => x }));
    ['1 · Jaksot ja katselmukset', '2 · Poikkeamat', '3 · Ehdotukset', '4 · Onnistumiset', 'P13 Demo', 'Ehdotus A', 'Onnistuminen X'].forEach((x) => expect(t, x).toContain(x));
  });
});

describe('4 · poikkeamat joukkueittain (audit 24 §4 03)', () => {
  const P = (o) => Object.assign({ joukkue: 'P15 Demo', tyyppi: 'alle_normin', osaAlue: 'kiihdytys', vakavuus: 'amber', arvo: 2.1, teema: 'Kiihdytys alle normin (2.1)', alaraja: false, kypsyysEstetty: null }, o || {});
  it('P15:n neljä fyysistä osa-aluetta = YKSI rivi ("H-H alle normin 4 osa-alueella"), ei neljää', () => {
    const m = TT.tmTilanneMalli(SYOTE({ poikkeamat: ['kiihdytys', 'maksinopeus', 'voima', 'aerobinen'].map((o) => P({ osaAlue: o })) }));
    expect(m.poikkeamat).toHaveLength(1); expect(m.poikkeamat[0]).toMatchObject({ joukkue: 'P15 Demo', osa: 'Fyysinen', n: 4 });
    expect(teksti(HTML({ poikkeamat: ['kiihdytys', 'maksinopeus', 'voima', 'aerobinen'].map((o) => P({ osaAlue: o })) }))).toContain('H-H alle normin 4 osa-alueella');
  });
  it('yksi rivi per joukkue JA osa-alue: fyysinen + tekniikka samasta joukkueesta = 2 riviä', () => {
    expect(TT.tmTilanneMalli(SYOTE({ poikkeamat: [P(), P({ osaAlue: 'tekniikka', teema: 'Tekniikka alle normin (2)' })] })).poikkeamat.map((x) => x.osa).sort()).toEqual(['Fyysinen', 'Tekniikka']);
  });
  it('kypsyysvahti (§28): estetty → "N/Y kypsyysvaihe ei salli tulkintaa", ei toimintonappia, himmeä (○)', () => {
    const h = HTML({ poikkeamat: [P({ kypsyysEstetty: { n: 8, yht: 12 } })] });
    expect(teksti(h)).toContain('8/12 kypsyysvaihe ei salli tulkintaa'); expect(h).not.toContain('Ehdota jaksoa'); expect(h).toContain('kt-dot n');
  });
  it('datan ikä jokaisella rivillä: "mitattu 8.10." tai "mitattu N kk sitten" + "odottaa testiä vk 45" (D118) + alaraja-huomautus', () => {
    const t = teksti(HTML({ poikkeamat: [P({ joukkue: 'P11 Demo' }), P({ joukkue: 'P13 Demo', alaraja: true })] }));
    expect(t).toContain('mitattu 8.10.'); expect(t).not.toContain('8.10..'); expect(t).toMatch(/mitattu 1[12] kk sitten · odottaa testiä vk 45/); expect(t).toContain('arvo 1,0 = asteikon alaraja — tarkista mittaus');
  });
  it('kattavuusportti (D125): D1 mitattu 2/9 → seuratason huomautus, luku palaa 6/9', () => {
    expect(teksti(HTML({ d1: { riittava: false, joukkueN: 2, joukkueYht: 9 } }))).toContain('Seuratason fyysisiä lukuja ei näytetä: D1 mitattu 2/9 joukkueelta. Luku palaa, kun kattavuus on vähintään 6/9.');
    expect(teksti(HTML({ d1: { riittava: true, joukkueN: 7, joukkueYht: 9 } }))).not.toContain('Seuratason fyysisiä lukuja ei näytetä');
  });
  it('kattavuus-tyyppi (datapuute) ei ole poikkeamarivi; yli 6 riviä → loput suljetun "+N muuta" -osion taakse', () => {
    expect(TT.tmTilanneMalli(SYOTE({ poikkeamat: [P({ tyyppi: 'kattavuus', osaAlue: null })] })).poikkeamat).toHaveLength(0);
    const monta = ['P10 Demo', 'P11 Demo', 'P12 Demo', 'P13 Demo', 'P14 Demo', 'P15 Demo', 'P16 Demo', 'T12 Demo'].map((j) => P({ joukkue: j }));
    expect(HTML({ poikkeamat: monta })).toContain('+2 muuta poikkeamaa');
  });
  it('ei poikkeamia → rauhallinen lause', () => { expect(teksti(HTML())).toContain('Ei poikkeamia — kaikki joukkueet odotetulla tasolla.'); });
});

describe('5 · mittaustilanne (D120)', () => {
  it('"x/y joukkueen mittaus on yli 6 kk vanha" (puuttuva mittaus lasketaan) + yksi nappi testijaksolla', () => {
    const m = TT.tmTilanneMalli(SYOTE()); expect(m.mittaus).toMatchObject({ vanhoja: 2, yht: 3 });
    const h = HTML({}, { testijakso: 'avaaTesti' }), t = teksti(h);
    expect(t).toContain('2/3 joukkueen mittaus on yli 6 kk vanha'); expect(t).toContain('Joukkuekohtainen mittaus avautuu joukkueen Kausi-välilehdeltä.'); expect(t).toContain('Suunnittele testijakso vk 45–46');
    expect(h).toContain("onclick=\"avaaTesti()\"");
  });
  it('kaikki tuoreita → ei nappia', () => {
    const h = HTML({ mitattu: [{ nimi: 'A', pvm: '2026-09-01', ms: Date.UTC(2026, 8, 1) }] }); expect(teksti(h)).toContain('Kaikkien joukkueiden mittaus on alle 6 kk vanha'); expect(h).not.toContain('Suunnittele testijakso');
  });
});

describe('6 · ehdotukset (D124, D134)', () => {
  const E = (i, luotu) => ({ ids: ['id' + i], teksti: 'Ehdotus ' + i, luotu: luotu == null ? NYT - DAY : luotu, signaali: 's' + i });
  it('enintään 5, "+N muuta ehdotusta"; kuittaamaton vanhenee 14 pv:ssä', () => {
    const m = TT.tmTilanneMalli(SYOTE({ ehdotukset: [1, 2, 3, 4, 5, 6, 7].map((i) => E(i)).concat([E(8, NYT - 20 * DAY)]) }));
    expect(m.ehdotukset.nakyvat).toHaveLength(5); expect(m.ehdotukset.lisaa).toBe(2);   // 8. vanhentunut → pois
    expect(teksti(HTML({ ehdotukset: [1, 2, 3, 4, 5, 6, 7].map((i) => E(i)) }))).toContain('+2 muuta ehdotusta');
  });
  it('rivi: "ehdotus" + teksti + Hyväksy/Muokkaa/Hylkää kutsuvat olemassa olevia käsittelijöitä id-listalla; otsikko mockupista', () => {
    const h = HTML({ ehdotukset: [E(1)] }, { hyvaksy: 'kuittaa', muokkaa: 'muokkaa', hylkaa: 'hylkaa' });
    expect(teksti(h)).toContain('Ehdotukset · TalentMaster ehdottaa, VP päättää'); expect(h).toContain("onclick=\"kuittaa('id1')\""); expect(h).toContain("onclick=\"muokkaa('id1')\""); expect(h).toContain("onclick=\"hylkaa('id1')\"");
  });
});

describe('7 · talentit ja syntymäkvartaalit', () => {
  it('tekstit mockupista; RAE kattavuusportilla (D125): alle rajan ei prosentteja', () => {
    const t = teksti(HTML());
    ['Talentit', '4 · 2 ehdokasta', 'Hidden Gem -ehdokkaat näkyvät vasta, kun D1 on mitattu (§28).', 'Syntymäkvartaalit', '90/96 syntymäaikaa', 'Q1 32 % · Q2 29 % · Q3 22 % · Q4 17 %.', 'Avaa RAE →'].forEach((x) => expect(t, x).toContain(x));
    const t2 = teksti(HTML({ rae: { n: 4, yht: 160, riittava: false, pct: { Q1: 0, Q2: 0, Q3: 0, Q4: 0 } } })); expect(t2).not.toContain('Q1 0 %'); expect(t2).toContain('mitattu 4/160 · syntymäaikoja puuttuu');
  });
});

describe('D123 järjestys ja poistetut lohkot', () => {
  it('lohkot ylhäältä: kortit → aikajana → jaksopalaveri → poikkeamat → mittaustilanne → ehdotukset → talentit', () => {
    const h = HTML(); const p = ['class="tt-tk"', 'Kausi · jaksot aikajanalla', 'id="tilannePalaveri"', 'id="tilannePoikkeamat"', 'id="tilanneMittaus"', 'id="tilanneEhdotukset"', 'id="tilanneTalentit"'].map((x) => h.indexOf(x));
    p.forEach((x) => expect(x).toBeGreaterThanOrEqual(0)); expect([...p].sort((a, b) => a - b)).toEqual(p);
  });
  it('ei "Mihin tartut nyt", "Kriittiset signaalit", tervehdystä eikä IDP-hyväksyntäjonoa; ei pelaajanimiä (§7.22)', () => {
    const t = teksti(HTML({ poikkeamat: [{ joukkue: 'P15 Demo', tyyppi: 'alle_normin', osaAlue: 'voima', vakavuus: 'amber', arvo: 2, teema: 'Voima alle normin (2)' }] }));
    ['Mihin tartut nyt', 'Kriittiset signaalit', 'Hyvää iltaa', 'Hyvää päivää', 'IDP-hyväksyntäjono', 'TILANNE · LIVE'].forEach((x) => expect(t, x).not.toContain(x));
  });
  it('kielletyt sanat: ei "heikko" eikä "ase" näkyvässä tekstissä', () => { expect(teksti(HTML()).toLowerCase()).not.toMatch(/heikko|\base\b/); });
});

describe('Design: komponentit, tokenit', () => {
  it('käyttää jaettuja .kt-*-komponentteja; oma CSS ei määrittele niitä uudelleen; ei hex/rgb-värejä; vain sallitut tokenit', () => {
    const h = HTML(); ['kt-eb', 'kt-sig', 'kt-btn', 'kt-ev', 'kt-sig-h'].forEach((c) => expect(h).toContain(c));
    ['kt-sig', 'kt-sig-h', 'kt-sig-why', 'kt-btn', 'kt-eb', 'kt-ev', 'kt-q3'].forEach((c) => expect(TT.CSS).not.toMatch(new RegExp('(^|[}\\n,])\\.' + c + '[{ .:,]')));
    expect(TT.CSS).not.toMatch(/#[0-9a-fA-F]{3,8}\b/); expect(TT.CSS).not.toMatch(/rgba?\(/);
    const sallitut = new Set(['teal', 'amber', 'red', 'ink', 'ink2', 'ink3', 'bg', 'border', 'teal-brd', 'font-serif', 'font-mono', 'font-sans', 'kt-serif', 'amber-dim', 'tt-teal-dim', 'n', 'c', 's', 'w']);
    expect([...new Set((TT.CSS.match(/var\(--[a-z0-9-]+/g) || []).map((x) => x.slice(6)))].filter((x) => !sallitut.has(x))).toEqual([]);
  });
  it('mitat mockupista: KPI-luku Cormorant 30 px; aikajanan otsikot DM Mono 11 px; rivi 13,5 px; kortin radius 6', () => {
    expect(TT.CSS).toMatch(/\.tt-v\{font-family:var\(--kt-serif\);font-size:30px/); expect(TT.CSS).toMatch(/\.tt-ajh\{font-family:var\(--font-mono\);font-size:11px/); const KTC = require('../lib/tm_kt_komponentit.js').CSS; expect(KTC).toMatch(/\.kt-vr\{[^}]*font-size:13\.5px/); expect(KTC).toMatch(/\.kt-vl\{[^}]*border-radius:6px/);   // rivilista on jaetussa komponenttitiedostossa
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
    expect(VP).toContain('#tilanneKausi,#tilanneLiite{display:none}#ws-tilanne.tt-uusi>*{display:none}'); expect(VP).toContain('<script src="lib/tm_vp_tilanne.js?v=1">');
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
    const h = y.els['tilanneKausi'].innerHTML; expect(h).toContain('class="tt-tk"'); expect(h).toContain('Kausi · jaksot aikajanalla'); expect(h).toContain('P11 Demo'); expect(h).not.toContain('Mihin tartut nyt');
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
