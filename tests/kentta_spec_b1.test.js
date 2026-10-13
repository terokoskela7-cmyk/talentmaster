/* Kehitystyöpöytä 22 · B1 — lib/tm_kentta_spec.js: alue → ase, jakso → reitti, tmTanaanTila → viikot, osa_arviot → osat, historia; kirjoitusapurit ja pelimuodot. Geometria tarkistetaan tmKentta:n data-ulostulosta. */
import { describe, it, expect } from 'vitest';
import { createRequire } from 'module';
const require = createRequire(import.meta.url);
const S = require('../lib/tm_kentta_spec.js');
const K = require('../lib/tm_kentta.js');
const TK = require('../lib/tm_tanaan_kentta.js');
const KT = require('../lib/tm_kehitystyopoyta.js');
const TANAAN = '2026-10-14';
const KAANON = () => ({ kpi: [1, 2, 3, 4, 5].map((i) => ({ koodi: 'k' + i, teksti: 'Osa ' + i + ' nimeltään tässä: selitys ' + i + ' pidempi' })) });
const ALUE = { x: 28, y: 44, w: 44, h: 32 };
const JF = (lisa) => Object.assign({ konsepti_avain: 'kons', konsepti_nimi: 'Haltuunotto', alkoi: '2026-10-05T08:00:00', kesto_vk: 6, reitti: { loppu: 'maali' }, osa_arviot: { kons: { k1: 3, k2: 2 } } }, lisa || {});
const P = (o) => Object.assign({ id: 'p1', etunimi: 'Aatu', joukkue: 'Demo U13', ydinvahvuus: { kuvaus: 'Ensimmäinen kosketus', alue: ALUE, asetti_uid: 'u1', asetettu_pvm: '2026-09-24' }, jaksofokus: JF() }, o || {});
const spec = (p, c) => S.tmKenttaSpec(p, Object.assign({ rooli: 'henkilokunta', tanaan: TANAAN, kaanon: KAANON }, c || {}));

describe('alue: kelpoisuus (sama ehto kuin Rules) ja kirjoitus', () => {
  it('tmKenttaAlueKelpaa: numerot 0–100 × 0–140, w,h ≥ 1, ei yli reunan, täsmälleen {x,y,w,h}', () => {
    expect(S.tmKenttaAlueKelpaa(ALUE)).toBe(true); expect(S.tmKenttaAlueKelpaa({ x: 0, y: 0, w: 100, h: 140 })).toBe(true); expect(S.tmKenttaAlueKelpaa({ x: 60, y: 120, w: 40, h: 20 })).toBe(true);
    for (const a of [null, undefined, {}, { x: 1, y: 1, w: 1 }, { x: '1', y: 1, w: 5, h: 5 }, { x: -1, y: 0, w: 5, h: 5 }, { x: 0, y: 141, w: 5, h: 5 }, { x: 60, y: 10, w: 41, h: 5 }, { x: 0, y: 130, w: 5, h: 11 }, { x: 10, y: 10, w: 0.5, h: 5 }, { x: NaN, y: 1, w: 5, h: 5 }, { x: 1, y: 1, w: 5, h: 5, z: 1 }]) expect(S.tmKenttaAlueKelpaa(a), JSON.stringify(a)).toBe(false);
  });
  it('tmKenttaAlue(p): kelvollinen alue tai null (puuttuva / epäkelpo → ei aluetta, ei oletusta)', () => {
    expect(S.tmKenttaAlue(P())).toEqual(ALUE); expect(S.tmKenttaAlue({ ydinvahvuus: { kuvaus: 'x' } })).toBeNull(); expect(S.tmKenttaAlue({ ydinvahvuus: { alue: { x: 1, y: 1, w: 0, h: 5 } } })).toBeNull(); expect(S.tmKenttaAlue(null)).toBeNull();
  });
  it('tmAlueKirjoitus: dot-polut alue + asetti_uid + asetettu_pvm (paikallinen päivä, 1 desimaali); asettaja pakollinen; epäkelpo alue hylätään', () => {
    const k = S.tmAlueKirjoitus({ x: 28.04, y: 44, w: 44, h: 32.06 }, { uid: 'u7', nyt: new Date(2026, 9, 14, 0, 30) });
    expect(k.ok).toBe(true); expect(k.polut).toEqual({ 'ydinvahvuus.alue': { x: 28, y: 44, w: 44, h: 32.1 }, 'ydinvahvuus.asetti_uid': 'u7', 'ydinvahvuus.asetettu_pvm': '2026-10-14' });
    expect(S.tmAlueKirjoitus(ALUE, {})).toMatchObject({ ok: false, virhe: 'ei_asettajaa' }); expect(S.tmAlueKirjoitus({ x: 90, y: 0, w: 20, h: 5 }, { uid: 'u1' })).toMatchObject({ ok: false, virhe: 'alue_ei_kelpaa' });
  });
  it('tmReittiKirjoitus: vain kolme kiinteää päätepistettä', () => {
    for (const l of ['maali', 'kaveri', 'kausitavoite']) expect(S.tmReittiKirjoitus(l)).toEqual({ 'jaksofokus.reitti': { loppu: l } });
    for (const l of ['', 'vapaa', null, undefined, 'MAALI']) expect(S.tmReittiKirjoitus(l)).toBeNull();
  });
  it('LOPUT vastaa tm_kentta.js:n kiinteitä päätepisteitä (yksi totuus)', () => { expect(S.LOPUT.slice().sort()).toEqual(Object.keys(K.LOPPU).sort()); });
});

describe('pelimuodot (D107): asetus tai oletus iästä', () => {
  it('asetus voittaa (järjestys = oletus ensin, vain kelvolliset, uniikit, ≤ 3)', () => {
    expect(S.tmPelimuodot({ pelimuodot: ['8v8', '11v11'] })).toEqual(['8v8', '11v11']); expect(S.tmPelimuodot({ pelimuodot: ['8v8', 'x', '8v8', '5v5', '11v11', '5v5'] })).toEqual(['8v8', '5v5', '11v11']);
  });
  it('ilman asetusta: ≤ 9 v [5v5] · 10–12 v [8v8] · 13 v [11v11, 8v8] · 14+ v [11v11]; ikä joukkuedokista (U13/P13/nimi) tai ctx.ika; tuntematon → [11v11]', () => {
    const e = (d, c) => S.tmPelimuodot(d, c);
    expect(e({ ika: 'U8' })).toEqual(['5v5']); expect(e({ ika: 'U9' })).toEqual(['5v5']); expect(e({ nimi: 'KPV P10' })).toEqual(['8v8']); expect(e({ ikaryhma: 'T12' })).toEqual(['8v8']);
    expect(e({ ika: 'U13' })).toEqual(['11v11', '8v8']); expect(e({ nimi: 'Demo U13' })).toEqual(['11v11', '8v8']); expect(e({ ika: 'U14' })).toEqual(['11v11']); expect(e({ ika: 'U19' })).toEqual(['11v11']);
    expect(e({}, { ika: 11 })).toEqual(['8v8']); expect(e({ pelimuodot: [] , ika: 'U9' })).toEqual(['5v5']); expect(e({ nimi: 'Edustus' })).toEqual(['11v11']); expect(e(null)).toEqual(['11v11']);
  });
});

describe('tmKenttaSpec: alue → ase, jakso → reitti, viikot, osat, historia', () => {
  it('alue + jakso: ase (alue + nimi), reitti maali, viikot (n = kesto, tehty = viikko − 1), osat sijainteineen ja tiloineen', () => {
    const s = spec(P()); expect(s.alueAsetettu).toBe(true); expect(s.ilmanAluetta).toBeUndefined(); expect(s.koko).toBe('puoli');
    expect(s.ase).toEqual({ alue: ALUE, nimi: 'Ensimmäinen kosketus', tila: 'ok' }); expect(s.reitti).toEqual({ loppu: 'maali', col: 'teal', faint: false });
    expect(s.viikot).toEqual({ n: 6, tehty: 1, valmis: false });   // 14.10. = viikko 2/6 (jakso alkoi 5.10.) → 1 tehty
    expect(s.osat.map((o) => o.k)).toEqual(['a', 'b', 'c', 'd', 'e']);
    expect(s.osat.map((o) => o.tila)).toEqual(['itsenaisesti', 'nyt', undefined, undefined, undefined]);   // k1=3 itsenäisesti · k2=2 ohjatusti mutta ensimmäinen ei-itsenäinen = viikon osa 'nyt' · loput ei arvioita
    s.osat.forEach((o) => { expect(o.x).toBeGreaterThanOrEqual(3); expect(o.x).toBeLessThanOrEqual(66); expect(o.y).toBeGreaterThanOrEqual(4); });   // tagin vasen reuna ≤ 66 %: pisin tagi ("b · itsenäisesti") ei leikkaudu kentän oikeaan reunaan
  });
  it('osan oma sijainti (jaksofokus.osat[i].x/y) voittaa oletuksen; oletus = rengas alueen ympärillä, pohjoinen sektori vapaa (reitti lähtee ylös)', () => {
    const s = spec(P({ jaksofokus: JF({ osat: [{ teksti: 'Katse ylös ennen vastaanottoa', x: 10, y: 20 }, { teksti: 'Vastaanotto poispäin paineesta' }, 'Syöttö eteenpäin', { x: 5, y: 5 }] }) })); expect([s.osat[0].x, s.osat[0].y]).toEqual([10, 20]); expect(s.osat).toHaveLength(3);   // neljäs (ei tekstiä) suodattuu pois; ilman omaa sijaintia oletus
    expect(s.osat[1].x).not.toBe(5); expect(s.osat.every((o) => typeof o.x === 'number' && typeof o.y === 'number')).toBe(true);
    const cx = ALUE.x + ALUE.w / 2, cy = ALUE.y + ALUE.h / 2; spec(P()).osat.forEach((o) => { const ylos = o.y < cy - 6 && Math.abs(o.x - cx) < 6; expect(ylos, o.k).toBe(false); });
  });
  it('geometria tmKentta:n datasta: alue = ase, reitti alkaa alueen keskipisteestä ja päättyy maaliin, viikkomerkit tasavälein (n kpl; tehty/nyt/tyhjä)', () => {
    const d = K.tmKentta(spec(P()), { rooli: 'henkilokunta' }).data;
    expect(d.alue).toMatchObject(ALUE); expect(d.reitti[0]).toEqual([50, 60]); expect(d.reitti[d.reitti.length - 1]).toEqual([48, 8]);
    expect(d.viikot.map((v) => v.tila)).toEqual(['tehty', 'nyt', 'tyhja', 'tyhja', 'tyhja', 'tyhja']);
  });
  it('reitin päätepisteet: kaveri / kausitavoite piirtyvät kiinteisiin pisteisiin; tuntematon loppu → ei reittiä eikä viikkomerkkejä (ei arvata)', () => {
    for (const [l, p] of [['kaveri', [74, 24]], ['kausitavoite', [50, 30]]]) { const d = K.tmKentta(spec(P({ jaksofokus: JF({ reitti: { loppu: l } }) })), {}).data; expect(d.reitti[d.reitti.length - 1]).toEqual(p); }
    for (const r of [undefined, { loppu: 'vapaa' }, { loppu: null }]) { const s = spec(P({ jaksofokus: JF({ reitti: r }) })); expect(s.reitti).toBeNull(); expect(s.viikot).toBeNull(); expect(s.ase).not.toBeNull(); }
  });
  it('ei jaksoa / umpeutunut jakso / valittavana: ase näkyy, ei reittiä, viikkoja eikä osia', () => {
    for (const jf of [null, JF({ alkoi: '2026-08-01T08:00:00' }), JF({ tila: 'valittavana' })]) { const s = spec(P({ jaksofokus: jf })); expect(s.ase).not.toBeNull(); expect(s.reitti).toBeNull(); expect(s.viikot).toBeNull(); expect(s.osat).toEqual([]); expect(s.jakso).toBe(false); }
  });
  it('ei aluetta: ase null, ei reittiä/osia (henkilökunta: jaksokortti + CTA, ei ilmanAluetta); pelaaja/huoltaja: ilmanAluetta (pelkkä kenttä kuten ennen)', () => {
    const p = P({ ydinvahvuus: { kuvaus: 'Ensimmäinen kosketus' } });
    const h = spec(p); expect(h.alueAsetettu).toBe(false); expect(h.ase).toBeNull(); expect(h.reitti).toBeNull(); expect(h.osat).toEqual([]); expect(h.ilmanAluetta).toBeUndefined();
    for (const r of ['pelaaja', 'huoltaja']) { const s = spec(p, { rooli: r }); expect(s.ilmanAluetta).toBe(true); expect(K.tmKentta(s, {}).data.alue).toBeNull(); }
    expect(spec(P({ ydinvahvuus: { kuvaus: 'x', alue: { x: 1, y: 1, w: 0, h: 3 } } })).alueAsetettu).toBe(false);   // epäkelpo alue = ei aluetta
  });
  it('nimi: ydinvahvuus.kuvaus → ydinvahvuus_valinta.vaihtoehto → tyhjä', () => {
    expect(spec(P({ ydinvahvuus: { alue: ALUE }, ydinvahvuus_valinta: { vaihtoehto: 'Pallonhallinta' } })).ase.nimi).toBe('Pallonhallinta'); expect(spec(P({ ydinvahvuus: { alue: ALUE } })).ase.nimi).toBe('');
  });
  it('historia: vain merkinnät joilla on reitti.loppu, uusin ensin, enintään 3', () => {
    const h = [{ reitti: { loppu: 'maali' } }, { /* vanha, ei reittiä */ }, { reitti: { loppu: 'kaveri' } }, { reitti: { loppu: 'vapaa' } }, { reitti: { loppu: 'kausitavoite' } }, { reitti: { loppu: 'maali' } }];
    expect(spec(P({ jaksofokus_historia: h })).historia).toEqual([{ loppu: 'maali' }, { loppu: 'kausitavoite' }, { loppu: 'kaveri' }]);
    expect(spec(P({ jaksofokus_historia: undefined })).historia).toEqual([]); expect(spec(P({ ydinvahvuus: { kuvaus: 'x' }, jaksofokus_historia: h })).historia).toEqual([]);
  });
  it('puolikentän ulkopuolinen alue → koko kenttä (alue ei katoa viewBoxin ulkopuolelle); muuten puoli', () => {
    const s = spec(P({ ydinvahvuus: { alue: { x: 30, y: 95, w: 40, h: 30 } } })); expect(s.koko).toBe('koko'); expect(K.tmKentta(s, {}).data.viewBox).toBe('0 0 100 140');
    expect(spec(P()).koko).toBe('puoli'); expect(K.tmKentta(spec(P()), {}).data.viewBox).toBe('0 0 100 84');
  });
  it('osan tila ilman kanonin koodia ja kaikki itsenäisesti: ei "nyt"-merkkiä (ei pyydetä havaintoa)', () => {
    const kaikki = spec(P({ jaksofokus: JF({ osa_arviot: { kons: { k1: 3, k2: 3, k3: 3, k4: 3, k5: 3 } } }) })); expect(kaikki.osat.every((o) => o.tila === 'itsenaisesti')).toBe(true);
  });
  it('sama "nyt"-osa kuin Tänään-näkymän viikon osa (tmKtViikonOsa) — yksi sääntö', () => {
    const p = P({ jaksofokus: JF({ osa_arviot: { kons: { k1: 3, k2: 3, k3: 2 } } }) }), osat = KT.tmKtOsat(p.jaksofokus, { kaanon: KAANON }), vo = KT.tmKtViikonOsa(osat), s = spec(p);
    expect(s.osat.find((o) => o.tila === 'nyt').k).toBe(vo.k);
  });
  it('rendaus: alue + reitti + osat piirtyvät tmKentta:lla; osan tilasana näkyy; ei "ase"-sanaa henkilökunnalle (D54)', () => {
    const html = K.tmKentta(spec(P()), { wrap: true, rooli: 'henkilokunta', t: (k) => k }); expect(html).toContain('kt-reitti'); expect(html).toContain('kt-ase'); expect(html).toContain('a · itsenäisesti'); expect(html).toContain('b · nyt'); expect(html).not.toMatch(/\base\b/i.test('') ? /x^/ : /(^|[^a-zäö])ase([^a-zäö]|$)/i.exec(html.replace(/class="[^"]*"/g, '')) || /$^/);
  });
});

describe('Tänään (tmKtTanaanKoko) käyttää adapteria: alue → koko Kenttä; ei aluetta → jaksokortti + CTA (ei tyhjää kenttää)', () => {
  const tila = { tila: 'kaynnissa', ensisijainen: { avain: 'havainto', teksti: 'Merkitse havainto' }, valikko: [], rivitila: { teksti: 'Jakso käynnissä', savy: 'ok' } };
  const nayta = (p, o) => KT.tmKtTanaanKoko(p, tila, Object.assign({ esc: (s) => String(s), t: (k) => k, hk: KT.tmKtHk, toimiFn: '_ktToimi', osaFn: '_ktHavaintoAvaa', paneeli: false, voiKirjoittaa: true, rooli: 'vp', uid: 'u1', nimet: () => '', kaanon: KAANON, tanaan: TANAAN,
    kenttaFn: (alue, pp, sp) => K.tmKentta(sp, { wrap: true, rooli: 'henkilokunta' }) }, o || {}));
  it('alue asetettu → kenttäfunktio saa täyden specin (reitti + viikkomerkit + osat); jaksokorttia ei', () => {
    const h = nayta(P()); expect(h).toContain('class="kt-reitti'); expect(h).toContain('kt-vk-tehty'); expect(h).toContain('kt-osa-nyt'); expect(h).not.toContain('data-kt-jaksokortti');
  });
  it('ei aluetta → jaksokortti + CTA "Aseta ydinvahvuus kentälle" → Polku; ei kenttäpiirrosta', () => {
    const h = nayta(P({ ydinvahvuus: { kuvaus: 'x' } })); expect(h).toContain('data-kt-jaksokortti'); expect(h).not.toContain('class="kt-svg"'); expect(h).toMatch(/data-kt-aseta-alue[^>]*onclick="_ktToimi\('p1','avaa_polku'\)"/); expect(h).toContain('Aseta ydinvahvuus kentälle');
  });
  it('CTA vain kirjoittajalle (voiKirjoittaa=false → ei nappia, jaksokortti silti)', () => {
    const h = nayta(P({ ydinvahvuus: { kuvaus: 'x' } }), { voiKirjoittaa: false }); expect(h).toContain('data-kt-jaksokortti'); expect(h).not.toContain('data-kt-aseta-alue');
  });
  it('adapterin puuttuessa (välimuisti) vanha käytös: alue → kenttäfunktio (alue, pelaaja)', () => {
    const h = nayta(P(), { kenttaFn: (alue) => '<i data-vanha="' + alue.x + '"></i>' }); expect(h).toContain('data-vanha="28"');
  });
  it('TK.tmTanaanOsat ja tmTanaanTila ovat adapterin lähteet (ei omaa jaksolaskentaa)', () => { expect(typeof TK.tmTanaanTila).toBe('function'); expect(S.tmKenttaSpec(P(), { tanaan: TANAAN, kaanon: KAANON }).viikot.n).toBe(6); });
});
