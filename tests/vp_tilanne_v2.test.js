/* PR C — Tilanne v2 (docs/CODE_BRIEF_KOTI_TILANNE_V2.md; mockup 30; D147–D152, D170). lib/tm_vp_tilanne.js + VP-kytkentä. */
import { describe, it, expect } from 'vitest';
import { readFileSync } from 'fs';
import { createRequire } from 'module';
const require = createRequire(import.meta.url);
const TT = require('../lib/tm_vp_tilanne.js'), F = require('./helpers/vp_fixture.cjs'), NV = require('../lib/tm_vp_navi.js');
const VP = readFileSync(new URL('../TalentMaster_VP_v25.html', import.meta.url), 'utf8'), DAY = 86400000, NYT = Date.UTC(2026, 9, 12, 7, 0);
const teksti = (h) => h.replace(/<[^>]+>/g, ' ').replace(/&quot;/g, '"').replace(/\s+/g, ' '), t = (x) => x;
const tila = (nimi, muokkaa) => { const d = F.lataa(nimi, NYT); if (muokkaa) muokkaa(d); const m = TT.tmTilanneMalli(d.syote); return { d, m, h: TT.tmTilanneHTML(m, { t, fn: { joukkue: 'jk', esityslista: 'es', hyvaksy: 'ok', muokkaa: 'mu', hylkaa: 'hy', aloitaJaksot: 'aj', valmentaja: 'va', auki: 'au', testijakso: 'te', ryhmat: 'ry', rae: 'ra' } }) }; };
const P = (o) => Object.assign({ joukkue: 'P12 Demo', tyyppi: 'alle_normin', osaAlue: 'tekniikka', vakavuus: 'amber', arvo: 2, teema: 'x', alaraja: false, kypsyysEstetty: null }, o || {});
const huom = (poikkeamat, mitattu) => { const d = F.lataa('kypsa', NYT); d.syote.poikkeamat = poikkeamat; if (mitattu) d.syote.mitattu = mitattu; return TT.tmTilanneMalli(d.syote).huomiot; };

describe('D151 · otsikko ja tulkintalause; D170 · Käynnistys-vaiheessa ei signaalikorttia', () => {
  it('Käynnistys (pilotti 1/15): "Kausi on alussa." + lause; EI signaalikorttia, EI täytettyä nappia ("Aloita jaksot" on Kodissa)', () => {
    const { m, h } = tila('pilotti'), x = teksti(h); expect(m.vaihe).toBe('kaynnistys'); expect(m.signaali).toBeNull();
    expect(x).toContain('Kausi on alussa.'); expect(x).toContain('Jakso on käynnissä 1/15 joukkueella. Ennen jaksopalaveria'); expect(h).not.toContain('id="tilannePalaveri"'); expect(h).not.toMatch(/class="kt-btn"/); expect(h).not.toContain('kt-sig');
  });
  it('Rytmi (kypsä 8/9): signaali = jaksopalaverin valmius — ainoa täytetty nappi "Avaa esityslista", linkki "Muistuta valmentajia"', () => {
    const { m, h } = tila('kypsa'), x = teksti(h); expect(m.vaihe).toBe('rytmi'); expect(m.signaali).toMatchObject({ w: true, n: 1 });
    expect((h.match(/class="kt-btn"/g) || []).length).toBe(1); expect(h).toContain('<button class="kt-btn" type="button" onclick="es()">Avaa esityslista</button>'); expect(h).toContain('onclick="va()">Muistuta valmentajia');
    expect(x).toMatch(/Jaksopalaveri · \S+ \d+\.\d+\. · \d+ päivää/); expect(x).toContain('Yksi katselmus auki ennen palaveria.'); expect(h).toContain('kt-sig w');
  });
  it('Rytmi, kaikki katselmukset tehty → teal-kortti "Kaikki katselmukset ovat valmiina."; ei palaveria eikä auki olevia → ei korttia', () => {
    const a = tila('kypsa', (d) => d.syote.joukkueet.forEach((j) => { j.katselmusAuki = false; })); expect(teksti(a.h)).toContain('Kaikki katselmukset ovat valmiina.'); expect(a.h).not.toContain('kt-sig w'); expect(a.h).not.toContain('Muistuta valmentajia');
    const b = tila('kypsa', (d) => { d.syote.joukkueet.forEach((j) => { j.katselmusAuki = false; }); d.syote.palaveri = null; }); expect(b.m.signaali).toBeNull(); expect(b.h).not.toContain('kt-sig');
  });
  it('tyhjä seura: "Kausi odottaa joukkueita." ilman nollia (ei 0/0) ja ilman aikajanaa', () => { const { h } = tila('tyhja'), x = teksti(h); expect(x).toContain('Kausi odottaa joukkueita.'); expect(x).not.toMatch(/\b0\/0\b/); expect(h).not.toContain('tilanneAikajana'); });
  it('sivun yksi täytetty nappi: jokaisessa tilassa korkeintaan yksi; Käynnistyksessä nolla', () => { F.TILAT.forEach((n) => { const k = (tila(n).h.match(/class="kt-btn"/g) || []).length; expect(k, n).toBeLessThanOrEqual(1); if (['pilotti', 'tyhja', 'kuormitus'].includes(n)) expect(k, n).toBe(0); }); });
});

describe('D148 · huomiot joukkueittain, selkokielellä', () => {
  it('yksi rivi per joukkue (ei osa-aluetagia + toistoa, ei seuran nimeä, ei raaka-arvoja): Tekniikka + kärkipelaajat = yksi lause', () => {
    const hu = huom([P({ osaAlue: 'tekniikka' }), P({ tyyppi: 'talenttiydin', osaAlue: null, teema: 'y' }), P({ joukkue: 'P13 Demo' })], [{ nimi: 'P12 Demo', pvm: '2026-10-07', ms: Date.UTC(2026, 9, 7) }, { nimi: 'P13 Demo', pvm: '2026-10-07', ms: Date.UTC(2026, 9, 7) }]);
    expect(hu.map((x) => x.joukkue).sort()).toEqual(['P12 Demo', 'P13 Demo']); expect(hu.find((x) => x.joukkue === 'P12 Demo')).toMatchObject({ tekniikka: true, karki: true, n: 2, tila: 'asiaa' });
    const x = teksti(TT.tmTilanneHTML(Object.assign(TT.tmTilanneMalli(F.lataa('kypsa', NYT).syote), { huomiot: hu }), { t, fn: {} })); expect(x).toContain('Tekniikka ja kärkipelaajien taso alle ikätason'); expect(x).toContain('2 asiaa'); expect(x).not.toMatch(/\(2\)|→ \w*teema|TKI <|top-5|Demo /);
  });
  it('rivi avaa joukkueen (koko rivi on nappi, aria-label); tunniste lyhyt; yläotsikko ja määrä "5 / 6"', () => {
    const { m, h } = tila('kypsa'), x = teksti(h); expect(m.huomiot.length).toBeGreaterThan(5); expect(h).toMatch(/<button type="button" class="tt-it" aria-label="[^"]+: [^"]+" onclick="jk\('[^']+'\)">/); expect(x).toContain('Joukkueet, jotka tarvitsevat huomiota'); expect(x).toContain('5 / ' + m.huomiot.length);
    expect((h.match(/class="tt-it"/g) || []).length).toBe(5); expect(x).toContain('Näytä kaikki ' + m.huomiot.length + ' →'); expect(h).toContain("onclick=\"au('huomiot')\"");
  });
  it('enintään 5 + "näytä kaikki": auki.huomiot näyttää kaikki', () => { const { m } = tila('kypsa'); const h = TT.tmTilanneHTML(m, { t, fn: {}, auki: { huomiot: true } }); expect((h.match(/class="tt-it"/g) || []).length).toBe(m.huomiot.length); expect(h).not.toMatch(/Näytä kaikki \d+ →/); });
  it('D141: yli 12 kk vanha mittaus EI ole tasoväite → "Tekniikan mittaus on vanha · viimeksi 2025 · ei tasoarviota · päivitä"', () => {
    const hu = huom([P({ joukkue: 'P15 Demo', mitattuKk: 14 })], [{ nimi: 'P15 Demo', pvm: '2025-08-01', ms: Date.UTC(2025, 7, 1) }]);
    expect(hu).toHaveLength(1); expect(hu[0]).toMatchObject({ avain: 'vanha', osa: 'tekniikka', vuosi: 2025, w: false });
    const x = teksti(TT.tmTilanneHTML(Object.assign(TT.tmTilanneMalli(F.lataa('kypsa', NYT).syote), { huomiot: hu }), { t, fn: {} })); expect(x).toContain('Tekniikan mittaus on vanha'); expect(x).toContain('viimeksi 2025 · ei tasoarviota'); expect(x).toContain('päivitä'); expect(x).not.toMatch(/alle ikätason.*viimeksi 2025/);
  });
  it('kypsyysvahti (§28): kaikki rivit estettyjä → ei huomiota; alaraja → "tarkista mittaus"; kehitys → "kuormitus?"', () => {
    expect(huom([P({ kypsyysEstetty: { n: 8, yht: 12 } })])).toHaveLength(0);
    expect(huom([P({ osaAlue: 'kiihdytys', alaraja: true })])[0]).toMatchObject({ alaraja: true, tila: 'tarkista' }); expect(huom([P({ tyyppi: 'laskeva', osaAlue: null })])[0]).toMatchObject({ kehitys: true, tila: 'kuormitus' });
  });
  it('ei huomioita → rauhallinen lause', () => { const x = teksti(tila('kypsa', (d) => { d.syote.poikkeamat = []; }).h); expect(x).toContain('Ei huomioita — kaikki joukkueet odotetulla tasolla.'); });
  it('järjestys: amber (sev w) ensin, sitten laajuus; vanha mittaus viimeiseksi', () => { const vanha = { nimi: 'P10 Demo', pvm: '2025-08-01', ms: Date.UTC(2025, 7, 1) }, tuore = (n) => ({ nimi: n, pvm: '2026-10-07', ms: Date.UTC(2026, 9, 7) }), hu = huom([P({ joukkue: 'P10 Demo' }), P({ joukkue: 'P13 Demo' }), P({ joukkue: 'P14 Demo' }), P({ joukkue: 'P14 Demo', osaAlue: 'voima' })], [vanha, tuore('P13 Demo'), tuore('P14 Demo')]); expect(hu.map((x) => x.joukkue)).toEqual(['P14 Demo', 'P13 Demo', 'P10 Demo']); });
});

describe('D149 · ehdotus = lause + tunnisteet; enintään 3; Ota käyttöön + ⋯', () => {
  const eh = (n) => ({ ids: ['i' + n], signaali: 'tki_alhainen', luotu: NYT - DAY, teksti: 'raaka', joukkueet: ['P9 Demo', 'P10 Demo'] });
  it('otsikko teonsanalla ("Tekniikkaharjoittelua 9 joukkueelle"), perustelu yhdellä rivillä, uniikit tunnisteet D144:llä', () => {
    const { m, h } = tila('pilotti'), x = teksti(h); expect(m.ehdotuksetV2).toHaveLength(3); expect(x).toContain('Tekniikkaharjoittelua 14 joukkueelle'); expect(x).toContain('Useilla pelaajilla tekniikka alle pronssitason.'); expect(x).toContain('Harjoitettavuuskartoitus 15 joukkueelle'); expect(x).toContain('Kehon valmius on kartoittamatta. Varaa kartoituspäivä.');
    expect(x).not.toMatch(/TKI <|Fokusoi|\(TKI/); const e0 = m.ehdotuksetV2[0]; expect(new Set(e0.tunnisteet.map((y) => y.tunniste)).size).toBe(e0.tunnisteet.length);
  });
  it('tuplat pois (P12 kilpa + harraste = yksi), yli kuusi → kuusi + "+N" (livenä oli yli 20 nimeä)', () => {
    const { h } = tila('pilotti', (d) => { d.syote.ehdotukset[0].joukkueet = d.syote.ehdotukset[0].joukkueet.concat(d.syote.ehdotukset[0].joukkueet); }); const e = h.slice(h.indexOf('id="tilanneEhdotukset"')); const ensin = e.slice(e.indexOf('tt-e'), e.indexOf('tt-erow')); expect([...ensin.matchAll(/class="tt-tg ok"[^>]*>([^<]+)</g)].map((m) => m[1])).toEqual(['P8', 'P9', 'P10', 'P11', 'P12', 'T12', '+8']);
  });
  it('yksi "Ota käyttöön" (reunanappi .kt-btn.q) + ⋯-valikko (Muokkaa, Hylkää) — ei Hyväksy·Muokkaa·Hylkää-nappisuppoa; toiminnot olemassa oleviin käsittelijöihin id-listalla', () => {
    const h = tila('pilotti').h, e = h.slice(h.indexOf('id="tilanneEhdotukset"')); expect((e.match(/class="kt-btn q sm"/g) || []).length).toBe(3); expect(e).toContain('onclick="ok(\'e0_0,e0_1'); expect(e).toMatch(/<details class="tt-kebab"><summary aria-label="Muokkaa · Hylkää"/); expect(e).toContain('onclick="mu(') && expect(e).toContain('onclick="hy(');
    expect(e).not.toContain('>Hyväksy<'); expect((h.match(/class="kt-btn"/g) || []).length).toBe(0);
  });
  it('enintään 3 ("3 / 4"), "+1 muuta ehdotusta"; kuittaamaton vanhenee 14 pv:ssä', () => {
    const m = TT.tmTilanneMalli(Object.assign(F.lataa('kypsa', NYT).syote, { ehdotukset: [1, 2, 3, 4, 5].map(eh).concat([Object.assign(eh(6), { luotu: NYT - 20 * DAY })]) })); expect(m.ehdotukset).toMatchObject({ lisaa: 2, yht: 5 }); expect(m.ehdotukset.nakyvat).toHaveLength(3);
    const x = teksti(TT.tmTilanneHTML(m, { t, fn: {} })); expect(x).toContain('3 / 5'); expect(x).toContain('+2 muuta ehdotusta');
  });
  it('ei ehdotuksia → "Ei avoimia toimenpiteitä — hyvä työ."', () => { expect(teksti(tila('kypsa', (d) => { d.syote.ehdotukset = []; }).h)).toContain('Ei avoimia toimenpiteitä — hyvä työ.'); });
});

describe('Rakenne ylhäältä alas (mockup 30) ja tieto kerran (D150)', () => {
  it('järjestys: otsikko → neljä kysymystä → signaali → aikajana → huomiot | ehdotukset → mittaus · talentit · syntymäkvartaalit', () => {
    const h = tila('kypsa').h, p = ['class="tt-hd"', 'kt-q3 four', 'id="tilannePalaveri"', 'id="tilanneAikajana"', 'id="tilannePoikkeamat"', 'id="tilanneEhdotukset"', 'id="tilanneMittaus"', 'id="tilanneTalentit"', 'id="tilanneRae"'].map((x) => h.indexOf(x));
    p.forEach((x) => expect(x).toBeGreaterThanOrEqual(0)); expect([...p].sort((a, b) => a - b)).toEqual(p);
  });
  it('jaksottomien tunnisteet VAIN aikajanalla (kaista + mobiilikortti) — ei signaalikortissa, ei kysymyskortissa', () => {
    const h = tila('pilotti').h, ennen = h.slice(0, h.indexOf('id="tilanneAikajana"')); expect(ennen).not.toMatch(/tt-tg/); expect(teksti(ennen)).toContain('14 ilman jaksoa'); expect(ennen).not.toContain('kt-nauha');
  });
  it('mittaus · talentit · syntymäkvartaalit samalla .kt-ev-anatomialla: otsikko, luku, lause, linkki', () => {
    const { h } = tila('pilotti'), x = teksti(h); ['Mittaustilanne 13 /15 yli 6 kk vanha', 'Seuraava testijakso vk', 'Seuratason fyysisiä lukuja ei näytetä ennen kuin 10/15 on mitattu.', 'Suunnittele testijakso →', 'Talentit 2 talenttia · 0 ehdokasta', 'Hidden Gem -ehdokkaat näkyvät, kun D1 on mitattu (§28). 6 odottaa mittausta.', 'Syntymäkvartaalit 4 /160 syntymäaikaa', 'RAE-jakaumaa ei voi vielä lukea: syntymäajat puuttuvat 156 pelaajalta.', 'Täydennä syntymäajat →'].forEach((s) => expect(x, s).toContain(s));
    expect((h.match(/class="kt-ev tt-g3k"/g) || []).length).toBe(3); expect(x).not.toMatch(/Q1 \d+ %/);   // RAE kattavuusportilla (D125): alle rajan ei prosentteja
  });
  it('kysymyskortit: amber vain kun luku alle puolen; sisältö ei nimiä', () => { const h = tila('pilotti').h; expect(h).toMatch(/class="kt-q-v w">1<small>\/15/); expect(tila('kypsa').h).not.toMatch(/class="kt-q-v w">8</); });
  it('§7.22 / ei konekieltä: ei "→ teema", "TKI <", osa-alueen toistoa, pelaajanimiä missään tilassa', () => { F.TILAT.forEach((n) => { const x = teksti(tila(n).h); expect(x, n).not.toMatch(/→ \S*teema|TKI\s*<|top-5|Fokusoi|undefined|NaN/); }); });
  it('arkisto: Esityslistan liitteet / Seuranta / Jaksofokukset säilyvät VP:ssä (työtilat siirretään, ei uudelleenrenderöintiä); esityslistan kiinnityskohta säilyy', () => { expect(VP).toContain("['ws-raportointi', 'tilanneRaportit'], ['ws-reviewit', 'tilanneSeuranta'], ['ws-jaksofokus', 'tilanneJaksofokus']"); expect(tila('kypsa').h).toContain('id="tilanneEsityslista"'); });
  it('D169: DM Mono vain .kt-eb; koot --fs-*; ei hex-värejä (tm_vp_tilanne CSS)', () => { expect(TT.CSS).not.toMatch(/font-mono/); expect([...TT.CSS.matchAll(/font-size:([^;}]+)/g)].every((m) => /^var\(--fs-/.test(m[1]))).toBe(true); expect(TT.CSS).not.toMatch(/#[0-9a-fA-F]{3,8}\b/); });
});

describe('Sivupalkin Tilanne-merkki: neutraali, luku = Tilanteessa näkyvät ehdotukset (≤ 3)', () => {
  it('merkin luokka "n" (ei punainen); CSS neutraali (ov-3, ink)', () => { const h = NV.tmNaviSivupalkkiHTML({ t, esc: (x) => x, laskurit: { tilanne: 2, viestit: 1 }, aktiivinen: 'koti' }); expect(h).toMatch(/class="sb-badge n" id="nv-badge-tilanne"/); expect(h).not.toMatch(/sb-badge red/); expect(NV.CSS).toContain('.nv-i .sb-badge.n{background:var(--ov-3);color:var(--ink)}'); });
  it('VP: laskuri Kenttä-seurassa = rajaaEhdotukset(dedup-lista, 3).nakyvat — sama luku kuin Tilanteen "3 / N"', () => { expect(VP).toContain('LU.rajaaEhdotukset(_vpEhdotusLista('); expect(VP).toMatch(/_toimenpiteet \|\| \[\]\)\.filter\(function \(t\) \{ return !LU\.ehdotusVanhentunut\(t\.luotu, Date\.now\(\)\); \}\)\), 3\)\.nakyvat\.length/); expect(TT.tmTilanneMalli(F.lataa('pilotti', NYT).syote).ehdotukset.nakyvat).toHaveLength(3); });
});

describe('VP-kytkentä', () => {
  it('ehdotukset välittävät joukkuelistan (tunnisteet) ja koosteen iän; fn.valmentaja; ankkuri aikajanalle', () => { expect(VP).toContain('signaali: e.signaali, joukkueet: e.joukkueet }'); expect(VP).toContain('laskettuMs: S.malli ? S.malli.laskettuMs : null'); expect(VP).toContain("valmentaja: '_vpPulssiValmentajat'"); expect(VP).not.toContain("getElementById('tilannePalaveri')"); expect(VP).toContain("getElementById('tilanneAikajana')"); });
  it('Aloita jaksot (Koti/aikajana): ankkuri on olemassa Tilanteessa (kaista aikajanalla)', () => { expect(tila('pilotti').h).toContain('id="tilanneAikajana"'); });
});
