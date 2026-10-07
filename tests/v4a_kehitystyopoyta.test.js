/**
 * V4a — Kehitystyöpöytä V4: näkymä, hash-reititin, tilakone, typografia (docs/CODE_BRIEF_V4_KEHITYSTYOPOYTA.md §2 V4a, §4 testit 1, 2, 9, 10, 12, 14, 16, 17).
 * lib/tm_hash_reititin.js · tm_aloita_jakso.tmJaksoTila · tmValintaVoimassa · lib/tm_kehitystyopoyta.js · Master/VP-adapterit (vm: SIVUN oikea koodi). Chrome-testit (typografia laskettuna tyylinä, 390 px) kuten kentta_k0: ohitetaan jos Chromea ei ole / TM_CHROME_TESTS=0.
 * Fixturet keksittyjä; KPV U13 -testipelaajat vain käsin (CLAUDE.md §0).
 */
import { describe, it, expect } from 'vitest';
import { readFileSync, existsSync, mkdtempSync, writeFileSync } from 'fs';
import { createRequire } from 'module';
import { fileURLToPath, pathToFileURL } from 'url';
import { dirname, join } from 'path';
import { tmpdir } from 'os';
import { spawn } from 'child_process';
import vm from 'vm';
const require = createRequire(import.meta.url);
const juuri = join(dirname(fileURLToPath(import.meta.url)), '..');
const lue = (f) => readFileSync(join(juuri, f), 'utf8');
const H = require('../lib/tm_hash_reititin.js'), AJ = require('../lib/tm_aloita_jakso.js'), KT = require('../lib/tm_kehitystyopoyta.js'), RV = require('../lib/tm_reitin_valinta.js'), JM = require('../lib/tm_jakso_malli.js'), JA = require('../lib/tm_joukkoaloitus.js');
const MASTER = lue('TalentMaster_Master_v16.html'), VP = lue('TalentMaster_VP_v25.html');

const NYT = new Date('2026-11-12T10:00:00Z');   // to; jakso alkoi ma 9.11. → vk 1
const ALKOI = '2026-11-09T08:00:00.000Z';
const JF = (lisa) => Object.assign({ konsepti_avain: 'y_h1', konsepti_nimi: 'Haltuunotto', alkoi: ALKOI, kesto_vk: 6 }, lisa);
const P = (lisa) => Object.assign({ id: 'topias', etunimi: 'Topias', seuraId: 'kpv', joukkue: 'KPV U13', ydinvahvuus: { kuvaus: 'Pitää pallon' } }, lisa || {});
const VAIHT = [{ konsepti_avain: 'y_h1', nimi: 'Haltuunotto', perustelu: 'Pidät pallon lähellä.', vahvistettu: true }, { konsepti_avain: 'seura_kierto', nimi: 'Kierto', perustelu: 'Käännyt nopeasti.', vahvistettu: true }];
const TARJOUS = (lisa) => ({ tila: 'valittavana', vaihdoehdot: undefined, vaihtoehdot: VAIHT, ...(lisa || {}) });
const VALINTA = (v, pvm) => ({ ydinvahvuus_valinta: { vaihtoehto: v, valittu_pvm: pvm || '2026-11-12' } });
const tila = (p) => AJ.tmJaksoTila(p, { nyt: NYT });

describe('Hash-reititin (lib/tm_hash_reititin.js)', () => {
  it('tmHashParse: #pelaaja/{pid}/tanaan|polku|naytto; välilehti oletus tanaan; vioittunut / tuntematon → null', () => {
    expect(H.tmHashParse('#pelaaja/abc/polku')).toEqual({ nakyma: 'pelaaja', pid: 'abc', valilehti: 'polku' }); expect(H.tmHashParse('#pelaaja/abc')).toMatchObject({ valilehti: 'tanaan' }); expect(H.tmHashParse('pelaaja/abc/naytto/')).toMatchObject({ valilehti: 'naytto' });
    for (const x of ['', null, undefined, '#', '#joukkue/a', '#pelaaja/', '#pelaaja/a b/tanaan', '#pelaaja/a/viikko', '#pelaaja/a/tanaan/extra', '#pelaaja/<x>/tanaan', '#pelaaja/%E0%A4%A/tanaan', '#pelaaja/' + 'x'.repeat(129) + '/tanaan']) expect(H.tmHashParse(x), String(x)).toBeNull();
    expect(H.tmHashRakenna('m93_G-b', 'naytto')).toBe('#pelaaja/m93_G-b/naytto'); expect(H.tmHashRakenna('a/b')).toBeNull(); expect(H.tmHashRakenna('a', 'viikko')).toBeNull();
  });
  it('tmPelaajaOikeus (D46 #3): oma joukkue / talenttivalmentaja / VP ja johto oma seura / SA; toisen joukkueen valmentaja ✗; toisen seuran pelaaja ✗', () => {
    const o = (rooli, extra) => H.tmPelaajaOikeus(P(), Object.assign({ rooli, seuraId: 'kpv', omaJoukkueet: ['KPV U13'] }, extra)).ok;
    expect(o('valmentaja')).toBe(true); expect(o('valmentaja', { omaJoukkueet: ['kpv u13'] })).toBe(true); expect(o('valmentaja', { omaJoukkueet: ['KPV U15'] })).toBe(false); expect(o('valmentaja', { omaJoukkueet: null })).toBe(true);   // null = ei rajausta (Masterin !_joukkue)
    for (const r of ['vp', 'urheilutoimenjohtaja', 'seurasihteeri', 'talenttivalmentaja']) expect(o(r, { omaJoukkueet: ['KPV U15'] }), r).toBe(true);
    expect(o('vp', { seuraId: 'sjk' })).toBe(false); expect(o('talenttivalmentaja', { seuraId: 'sjk' })).toBe(false); expect(o(null, { sa: true, seuraId: null })).toBe(true); expect(o('fysioterapeutti')).toBe(false); expect(o(undefined)).toBe(false);
    expect(H.tmPelaajaOikeus(null, {})).toEqual({ ok: false, syy: 'ei_pelaajaa' }); expect(H.tmPelaajaOikeus(P({ joukkueet: ['KPV U15'] }), { rooli: 'valmentaja', omaJoukkueet: ['KPV U15'], seuraId: 'kpv' }).ok).toBe(true);
  });
  function ymp(hash, lippu = true) {
    const log = { kuuntelijat: [], poistetut: [], luvut: 0, push: [], replace: [], back: 0, reitit: [], tyhjat: 0 };
    let h = hash; const loc = { get hash() { log.luvut++; return h; }, set hash(v) { h = v; log.push.push(v); }, pathname: '/app.html', search: '?seura=kpv' };
    const win = { location: loc, history: { replaceState: (a, b, u) => { h = u.indexOf('#') === 0 ? u : ''; log.replace.push(u); }, back: () => { log.back++; } }, addEventListener: (n, f) => log.kuuntelijat.push([n, f]), removeEventListener: (n, f) => log.poistetut.push([n, f]) };
    let lp = lippu; const r = H.tmHashReititin({ win, lippu: () => lp, onReitti: (x) => log.reitit.push(x), onTyhja: () => { log.tyhjat++; } });
    return { r, log, win, aseta: (v) => { h = v; }, lippu: (v) => { lp = v; } };
  }
  it('LIPPU POIS: liita() ei lisää kuuntelijaa eikä lue hashia; avaa/sulje eivät koske osoitteeseen; hashchange ei tee mitään', () => {
    const e = ymp('#pelaaja/abc/tanaan', false); expect(e.r.liita()).toBe(false); expect(e.log.kuuntelijat).toEqual([]); expect(e.log.luvut).toBe(0); expect(e.log.reitit).toEqual([]);
    expect(e.r.avaa('abc', 'polku')).toBe(false); expect(e.r.sulje()).toBe(false); expect(e.r.nykyinen()).toBeNull(); expect(e.log.push).toEqual([]); expect(e.log.replace).toEqual([]); expect(e.log.luvut).toBe(0);
  });
  it('LIPPU PÄÄLLÄ: suora URL avautuu (onReitti), hashchange kuuntelija, tuntematon hash → onTyhja (Back listaan); irrota poistaa kuuntelijan', () => {
    const e = ymp('#pelaaja/abc/polku'); expect(e.r.liita()).toBe(true); expect(e.log.kuuntelijat.map((k) => k[0])).toEqual(['hashchange']); expect(e.log.reitit).toEqual([{ nakyma: 'pelaaja', pid: 'abc', valilehti: 'polku' }]);
    e.aseta('#pelaaja/xyz/naytto'); e.log.kuuntelijat[0][1](); expect(e.log.reitit.at(-1)).toMatchObject({ pid: 'xyz', valilehti: 'naytto' });
    e.aseta(''); e.log.kuuntelijat[0][1](); expect(e.log.tyhjat).toBe(1); e.lippu(false); e.aseta('#pelaaja/q/tanaan'); e.log.kuuntelijat[0][1](); expect(e.log.reitit).toHaveLength(2);   // lippu sammuu → ei reagoi
    e.r.irrota(); expect(e.log.poistetut).toHaveLength(1); e.lippu(true); expect(e.r.liita()).toBe(true);
    const tyhja = ymp(''); tyhja.r.liita(); expect(tyhja.log.reitit).toEqual([]); expect(tyhja.log.tyhjat).toBe(0);   // ei hashia → ei avausta
  });
  it('avaa: lista → näkymä työntää yhden historiamerkinnän; näkymän sisäinen siirto (korvaa) käyttää replaceState; sulje: Back jos työnnetty, muuten hash siivotaan paikallaan', () => {
    const e = ymp(''); e.r.liita(); expect(e.r.avaa('a', 'tanaan')).toBe(true); expect(e.log.push).toEqual(['#pelaaja/a/tanaan']);
    e.r.avaa('b', 'tanaan', true); expect(e.log.replace).toEqual(['#pelaaja/b/tanaan']); expect(e.log.push).toHaveLength(1); expect(e.r.avaa('x y', 'tanaan')).toBe(false);
    e.r.sulje(); expect(e.log.back).toBe(1);   // yksi Back palaa listaan
    const suora = ymp('#pelaaja/a/tanaan'); suora.r.liita(); suora.r.sulje(); expect(suora.log.back).toBe(0); expect(suora.log.replace).toEqual(['/app.html?seura=kpv']); expect(suora.log.tyhjat).toBe(1);
  });
});

describe('Tilakone (tm_aloita_jakso.tmJaksoTila) — kuusi tilaa johdetaan, ei tallenneta', () => {
  it('ei_jaksoa: "Aloita jakso"; "Anna pelaajan valita" vain kun ase (ydinvahvuus) on olemassa', () => {
    const a = tila(P()); expect(a).toMatchObject({ tila: 'ei_jaksoa', ensisijainen: { avain: 'aloita' }, rivitila: { teksti: 'Ei jaksoa' } }); expect(a.valikko.find((m) => m.avain === 'anna_valita').kaytettavissa).toBe(true);
    expect(tila(P({ ydinvahvuus: null })).valikko.find((m) => m.avain === 'anna_valita').kaytettavissa).toBe(false); expect(tila(null).tila).toBe('ei_jaksoa');
  });
  it('kaynnissa: jaksofokus ILMAN tila-kenttää (nykydata, testi 14) → "Merkitse viikkohavainto", valikko Sulje/Muokkaa/Klippi; rivitila vk n/N', () => {
    const k = tila(P({ jaksofokus: JF({ alkoi: '2026-11-02T08:00:00.000Z' }), idp_sitoumus_pvm: '2026-11-03T10:00:00.000Z' }));
    expect(k).toMatchObject({ tila: 'kaynnissa', ensisijainen: { avain: 'havainto', teksti: 'Merkitse viikkohavainto' }, rivitila: { teksti: 'Jakso käynnissä · vk 2/6', vk: { n: 2, yht: 6 } } });
    expect(k.valikko.map((m) => m.avain)).toEqual(['sulje', 'muokkaa', 'klippi', 'anna_valita']); expect(k.valikko.find((m) => m.avain === 'klippi').kaytettavissa).toBe(false);
  });
  it('vahvistettu: sama kuin käynnissä, mutta 1. viikolla sitoumus (idp_sitoumus_pvm) puuttuu → rivitila kertoo; sitoumuksen jälkeen kaynnissa', () => {
    expect(tila(P({ jaksofokus: JF() }))).toMatchObject({ tila: 'vahvistettu', ensisijainen: { avain: 'havainto' }, rivitila: { teksti: 'Jakso käynnissä · vk 1 · sitoumus odottaa' } });
    expect(tila(P({ jaksofokus: JF(), idp_sitoumus_pvm: '2026-11-10T10:00:00.000Z' })).tila).toBe('kaynnissa'); expect(tila(P({ jaksofokus: JF(), idp_sitoumus_pvm: '2026-09-01T10:00:00.000Z' })).tila).toBe('vahvistettu');   // vanhan jakson sitoumus ei riitä
  });
  it('paattynyt: alkoi + kesto_vk × 7 pv < nyt → "Sulje jakso", valikko Jatka jaksoa 2 vk · Syvennä (V4b: ei vielä käytettävissä); amber', () => {
    const p = tila(P({ jaksofokus: JF({ alkoi: '2026-09-01T08:00:00.000Z', kesto_vk: 4 }) })); expect(p).toMatchObject({ tila: 'paattynyt', ensisijainen: { avain: 'sulje' }, rivitila: { savy: 'amber' } });
    expect(p.valikko.map((m) => [m.avain, m.kaytettavissa])).toEqual([['jatka', true], ['syvenna', false]]); expect(tila(P({ jaksofokus: JF({ alkoi: '2026-11-01T08:00:00.000Z', kesto_vk: 2 }) })).tila).toBe('kaynnissa');   // 14 pv, ei vielä yli
  });
  it('valittavana (K3): odottaa pelaajaa, ei nappia; valikko "Peru valinta ja aloita jakso itse"; valinta tehty → "Vahvista jakso" + A/B-rivitila; oma ehdotus tunnistetaan', () => {
    const v = tila(P({ jaksofokus: TARJOUS() })); expect(v).toMatchObject({ tila: 'valittavana', ensisijainen: null, rivitila: { teksti: 'Valinta odottaa' } }); expect(v.valikko[0]).toMatchObject({ avain: 'aloita', kaytettavissa: true });
    const t = tila(P({ jaksofokus: TARJOUS(), ...VALINTA('seura_kierto') })); expect(t).toMatchObject({ tila: 'valinta_tehty', ensisijainen: { avain: 'vahvista', teksti: 'Vahvista jakso' }, rivitila: { teksti: 'Pelaaja valitsi B' } }); expect(t.valikko[0]).toMatchObject({ avain: 'hylkaa', kaytettavissa: false });
    expect(tila(P({ jaksofokus: TARJOUS(), ...VALINTA('Oma juttu') })).rivitila.teksti).toBe('Pelaaja ehdotti omaa');
  });
  it('HYLKÄÄ VALINTA (testi 16, D47 b): pelaajan valinta jää paikalleen; uudempi tarjottu_pvm → "odottaa pelaajaa"; pelaaja valitsee uudelleen → valinta tehty; vanha data ilman tarjottu_pvm:ää = voimassa', () => {
    const vanha = P({ jaksofokus: TARJOUS({ tarjottu_pvm: '2026-11-13' }), ...VALINTA('y_h1', '2026-11-12') }); expect(vanha.ydinvahvuus_valinta.vaihtoehto).toBe('y_h1');
    expect(tila(vanha).tila).toBe('valittavana'); expect(RV.tmValintaTila(vanha).tila).toBe('valittavana'); expect(RV.tmHenkRivitila(vanha).tila).toBe('odottaa');   // sama sääntö pelaajan K3-puolella ("Valintasi on valmentajalla" ei näy)
    const uusi = P({ jaksofokus: TARJOUS({ tarjottu_pvm: '2026-11-13' }), ...VALINTA('y_h1', '2026-11-14') }); expect(tila(uusi).tila).toBe('valinta_tehty'); expect(RV.tmValintaTila(uusi).tila).toBe('valittu');
    expect(tila(P({ jaksofokus: TARJOUS({ tarjottu_pvm: '2026-11-12' }), ...VALINTA('y_h1', '2026-11-12') })).tila).toBe('valinta_tehty');   // sama päivä = voimassa (>=)
    expect(tila(P({ jaksofokus: TARJOUS(), ...VALINTA('y_h1', '2020-01-01') })).tila).toBe('valinta_tehty');   // ei tarjottu_pvm:ää → nykykäytös
    expect(tila(P({ jaksofokus: TARJOUS({ tarjottu_pvm: '2026-11-13' }), ydinvahvuus_valinta: { vaihtoehto: 'y_h1' } })).tila).toBe('valittavana');   // valittu_pvm puuttuu + tarjottu_pvm → ei voimassa
  });
  it('tmValintaVoimassa: tm_jakso_malli-peilaus = tm_reitin_valinta (kaikissa tapauksissa identtinen)', () => {
    const tapaukset = [P(), P({ jaksofokus: TARJOUS() }), P({ jaksofokus: TARJOUS(), ...VALINTA('a') }), P({ jaksofokus: TARJOUS({ tarjottu_pvm: '2026-11-13' }), ...VALINTA('a', '2026-11-12') }), P({ jaksofokus: TARJOUS({ tarjottu_pvm: '2026-11-13' }), ...VALINTA('a', '2026-11-13') }),
      P({ jaksofokus: TARJOUS({ tarjottu_pvm: 'x' }), ...VALINTA('a', '2020-01-01') }), P({ ydinvahvuus_valinta: { vaihtoehto: '  ' } }), null, {}];
    tapaukset.forEach((p, i) => expect(JM.tmValintaVoimassa(p), 'tapaus ' + i).toBe(RV.tmValintaVoimassa(p)));
  });
  it('YHTENÄISYYS (testi 2): tmJaksoNappi / tmJaksoNapitTila (#868) ja J4-rivi sanovat saman kuin tilakone; legacy-valinta (D-1) ennallaan', () => {
    const tapaukset = [[P(), 'aloita'], [P({ jaksofokus: JF() }), 'muokkaa'], [P({ jaksofokus: JF({ alkoi: '2026-09-01T08:00:00.000Z', kesto_vk: 4 }) }), 'muokkaa'], [P({ jaksofokus: TARJOUS() }), 'aloita'], [P({ jaksofokus: TARJOUS(), ...VALINTA('y_h1') }), 'vahvista']];
    for (const [p, nappi] of tapaukset) { expect(AJ.tmJaksoNappi(p)).toBe(nappi); expect(AJ.tmJaksoNapitTila(p).nappi).toBe(nappi); expect(tila(p).tila).toBeTruthy(); }
    expect(tila(P({ jaksofokus: JF({ tila: 'valittavana' }), ydinvahvuus_valinta: { vaihtoehto: 'Pallonhallinta' } })).tila).toBe('valinta_tehty');   // D-1: valittavana + konsepti + valinta
    const rivit = [P({ jaksofokus: TARJOUS() }), P({ jaksofokus: TARJOUS(), ...VALINTA('y_h1') }), P({ jaksofokus: JF() })].map((p, i) => JA.tmJoukkoRivi(Object.assign({}, p, { id: 'p' + i }), { nimi: 'N' + i, nyt: NYT, tilakone: true }));
    rivit.forEach((r) => expect(r.tilakone).toEqual(tila(Object.assign({}, r.tilakone && {}, { id: r.pid }) && [P({ jaksofokus: TARJOUS() }), P({ jaksofokus: TARJOUS(), ...VALINTA('y_h1') }), P({ jaksofokus: JF() })][+r.pid.slice(1)])));
    const h = JA.tmJoukkoHTML(rivit, {}, { t: (k) => k, avaaFn: 'a', tilakone: true }); expect(h).toContain('data-ja-rivitila="valittavana"'); expect(h).toContain('Valinta odottaa'); expect(h).toContain('data-ja-rivitila="valinta_tehty"'); expect(h).toContain('Pelaaja valitsi A');
    const ilman = JA.tmJoukkoHTML(rivit, {}, { t: (k) => k, avaaFn: 'a' }); expect(ilman).not.toContain('data-ja-rivitila');   // lippu pois → J4-lista ennallaan
    expect(JA.tmJoukkoRivi(P(), { nimi: 'x', nyt: NYT }).tilakone).toBeUndefined();
  });
});

describe('Kehys (lib/tm_kehitystyopoyta.js)', () => {
  const o = { t: (k) => k, toimiFn: 'toimi', valilehtiFn: 'vl', silminFn: 'si', edellinenFn: 'ed', seuraavaFn: 'se', suljeFn: 'su' };
  const x = (lisa) => Object.assign({ pid: 'topias', nimi: 'Topias K.', joukkue: 'KPV U13', ikavaihe: 'Rakentaja', phv: 'LAH', tila: tila(P({ jaksofokus: JF() })), edellinen: 'a', seuraava: 'b', jarj: { n: 2, yht: 20 }, valilehti: 'tanaan', tanaanHTML: '<i data-t>T</i>', ladattu: { polku: false, naytto: false } }, lisa);
  it('otsikkorivi: ‹ › · nimi · joukkue · ikävaihe · PHV · jakson tila · ensisijainen nappi · ⋯ valikko · Pelaajan silmin · sulje; sticky (ei vieri pois)', () => {
    const h = KT.tmKtKehysHTML(x(), o);
    for (const a of ['data-kt-edellinen', 'data-kt-seuraava', '<h1 class="kt-nimi">Topias K.</h1>', 'KPV U13 · Rakentaja', 'PHV', 'LAH', 'data-kt-rivitila="vahvistettu"', 'data-kt-ensisijainen="havainto"', 'class="kt-valikko"', 'data-kt-silmin', 'data-kt-sulje', '2/20']) expect(h, a).toContain(a);
    expect(KT.tmKtCss()).toMatch(/\.kt-ot\{position:sticky;top:0/); expect(h).toContain("onclick=\"toimi('topias','havainto')\"");
  });
  it('‹ › listan reunoilla pois käytöstä (ei kiertoa); tmKtJarjestys; ikävaihe nimeltä', () => {
    expect(KT.tmKtKehysHTML(x({ edellinen: null }), o)).toMatch(/data-kt-edellinen[^>]*disabled|disabled[^>]*data-kt-edellinen/); expect(KT.tmKtKehysHTML(x(), o)).not.toMatch(/data-kt-edellinen[^>]*disabled/);
    expect(KT.tmKtJarjestys(['a', 'b', 'c'], 'a')).toEqual({ edellinen: null, seuraava: 'b', n: 1, yht: 3 }); expect(KT.tmKtJarjestys(['a', 'b', 'c'], 'c')).toMatchObject({ edellinen: 'b', seuraava: null }); expect(KT.tmKtJarjestys(['a'], 'x').n).toBe(0);
    expect([11, 12, 13, 15, 16, 18, null].map(KT.tmKtIkavaihe)).toEqual(['Leikkijä', 'Leikkijä', 'Rakentaja', 'Rakentaja', 'Showcase', 'Showcase', '']);
  });
  it('valikko: käyttämättömät toiminnot (V4b) näkyvät mutta ovat pois käytöstä; ei valikkoa jos ei toimintoja; ensisijaisen napin puuttuessa (valittavana) ei nappia', () => {
    const h = KT.tmKtKehysHTML(x(), o); expect(h).toMatch(/data-kt-valikko="klippi"[^>]*disabled/); expect(h).toMatch(/data-kt-valikko="sulje"[^>]*onclick/);
    const v = KT.tmKtKehysHTML(x({ tila: tila(P({ jaksofokus: TARJOUS() })) }), o); expect(v).not.toContain('data-kt-ensisijainen'); expect(v).toContain('Valinta odottaa');
    expect(KT.tmKtKehysHTML(x({ tila: { tila: 'x', ensisijainen: null, valikko: [], rivitila: { teksti: '' } } }), o)).not.toContain('kt-valikko');
  });
  it('LATAUSJAKO (D52): Polku ja Näyttö tyhjinä (data-ladattu="0", hidden) kunnes ladattu; Tänään aina; vain valittu välilehti näkyvissä', () => {
    const h = KT.tmKtKehysHTML(x({ polkuHTML: '<b id="polku-sisalto"></b>', nayttoHTML: '<b id="naytto-sisalto"></b>' }), o);
    expect(h).not.toContain('polku-sisalto'); expect(h).not.toContain('naytto-sisalto'); expect(h).toMatch(/data-kt-sivu="polku" data-ladattu="0" hidden/); expect(h).toMatch(/data-kt-sivu="tanaan" data-ladattu="1">/); expect(h).toContain('data-t');
    const p = KT.tmKtKehysHTML(x({ valilehti: 'polku', ladattu: { polku: true, naytto: false }, polkuHTML: '<b id="polku-sisalto"></b>', nayttoHTML: '<b id="naytto-sisalto"></b>' }), o);
    expect(p).toContain('polku-sisalto'); expect(p).not.toContain('naytto-sisalto'); expect(p).toMatch(/data-kt-sivu="polku" data-ladattu="1">/); expect(p).toMatch(/data-kt-sivu="tanaan" data-ladattu="1" hidden/); expect(p).toMatch(/data-kt-valilehti="polku" aria-selected="true"/);
  });
  it('Pelaajan silmin: kytkin kääntää luokan (.kt-silmin piilottaa .kt-hk-merkinnät); arvot escapataan; "Ei oikeutta" / ei löydy / lataus -tilat', () => {
    expect(KT.tmKtKehysHTML(x({ silmin: true }), o)).toContain('kt-shell kt-silmin'); expect(KT.tmKtKehysHTML(x({ silmin: true }), o)).toContain('aria-pressed="true"'); expect(KT.tmKtCss()).toContain('.kt-silmin .kt-hk{display:none}');
    expect(KT.tmKtKehysHTML(x({ nimi: '<script>x</script>' }), Object.assign({ esc: undefined }, o))).not.toContain('<script>x');
    expect(KT.tmKtEiOikeuttaHTML(o)).toContain('data-kt-tila="ei_oikeutta"'); expect(KT.tmKtEiOikeuttaHTML(o)).toContain('Ei oikeutta'); expect(KT.tmKtEiLoydyHTML(o)).toContain('Pelaajaa ei löytynyt'); expect(KT.tmKtLataaHTML(o)).toContain('data-kt-tila="lataa"');
  });
  it('TYPOGRAFIA (D51, testi 17 lähdetasolla): Archivo vain .kt-komponentin sisällä (@font-face + .kt-shell .kt), otsikkorivi ja napit DM Sans; ei hex-/rgb-värejä libissä', () => {
    const css = KT.tmKtCss(), rivit = css.split('\n'); const archivo = rivit.filter((r) => /Archivo/.test(r));
    expect(archivo).toHaveLength(2); expect(archivo.some((r) => r.indexOf('@font-face') === 0)).toBe(true); expect(archivo.some((r) => r.indexOf('.kt-shell .kt{') === 0)).toBe(true);
    expect(css).toMatch(/\.kt-ot \*\{font-family:var\(--kt-sans\)\}/); expect(css).toContain('assets/fonts/archivo-latin-wdth-normal.woff2'); expect(css).not.toMatch(/fonts\.googleapis|gstatic/);
    expect(lue('lib/tm_kehitystyopoyta.js') + lue('lib/tm_hash_reititin.js')).not.toMatch(/#[0-9a-fA-F]{3,8}\b|rgba?\(/);
    const h = KT.tmKtKehysHTML(x(), o); expect(h).not.toMatch(/Archivo|--font-k|font-family/);
  });
  const CHROME = ['/Applications/Google Chrome.app/Contents/MacOS/Google Chrome', '/usr/bin/google-chrome', '/usr/bin/chromium', '/usr/bin/chromium-browser'].find((p) => existsSync(p));
  ((CHROME && process.env.TM_CHROME_TESTS !== '0') ? it : it.skip)('headless-Chrome: laskettu tyyli — otsikkorivissä ja napeissa EI Archivoa, Kenttä-komponentissa on; 390 px: ei vaakavieritystä, otsikkorivi + ensisijainen nappi ensimmäisessä ruudussa', async () => {
    const kentta = require('../lib/tm_kentta.js').tmKentta({ koko: 'puoli', ilmanAluetta: true, ase: null, reitti: null, viikot: null, osat: [], historia: [], lempipaikka: null, vaihtoehdot: null }, { wrap: true });
    const html = '<!doctype html><meta charset="utf-8"><meta name="viewport" content="width=device-width"><style>:root{--bg:#111110;--card:#161614;--ink:#F2EFE6;--ink2:#C9C7BE;--ink3:#8C8B86;--teal:#28B090;--border:#333;--amber:#E0A040;--chalk:#999;--chalk2:#666}body{margin:0;font-family:Georgia}' + KT.tmKtCss() + require('../lib/tm_kentta.js').tmKenttaCss() + '</style>'
      + KT.tmKtKehysHTML(x({ tanaanHTML: KT.tmKtTanaanHTML({ pid: 'topias', kenttaHTML: kentta, rivitila: { teksti: 'Jakso käynnissä · vk 1/6' }, osat: [{ k: 'a', teksti: 'Laukaus vauhdista' }] }, o) }), o)
      + '<script>var q=function(s){var e=document.querySelector(s);return e?getComputedStyle(e).fontFamily:"EI_LÖYDY"};var b=document.body;'
      + 'b.setAttribute("data-ot",q(".kt-ot"));b.setAttribute("data-nimi",q(".kt-nimi"));b.setAttribute("data-nappi",q("[data-kt-ensisijainen]"));b.setAttribute("data-valilehti",q("[data-kt-valilehti]"));b.setAttribute("data-kt",q(".kt"));'
      + 'b.setAttribute("data-sw",document.documentElement.scrollWidth);b.setAttribute("data-iw",window.innerWidth);var r=document.querySelector("[data-kt-ensisijainen]").getBoundingClientRect();b.setAttribute("data-nappi-y",Math.round(r.bottom));b.setAttribute("data-ih",window.innerHeight);</script>';
    const polku = join(mkdtempSync(join(tmpdir(), 'tm-v4a-')), 'kt.html'); writeFileSync(polku, html); const profiili = mkdtempSync(join(tmpdir(), 'tm-chrome-'));
    const out = await new Promise((resolve, reject) => {
      const lapsi = spawn(CHROME, ['--headless=new', '--disable-gpu', '--no-sandbox', '--disable-dev-shm-usage', '--no-first-run', '--user-data-dir=' + profiili, '--window-size=390,844', '--virtual-time-budget=2500', '--dump-dom', pathToFileURL(polku).href], { stdio: ['ignore', 'pipe', 'ignore'] });
      let data = '', valmis = false; const lopeta = (fn) => { if (valmis) return; valmis = true; clearTimeout(ajastin); try { lapsi.kill('SIGKILL'); } catch (e) { /* päättynyt */ } fn(); };
      const ajastin = setTimeout(() => lopeta(() => reject(new Error('Chrome ei tuottanut DOM:ia'))), 30000);
      lapsi.stdout.setEncoding('utf8'); lapsi.stdout.on('data', (d) => { data += d; if (/<\/html>\s*$/i.test(data)) lopeta(() => resolve(data)); }); lapsi.on('close', () => lopeta(() => resolve(data)));
    });
    const a = (n) => (new RegExp('data-' + n + '="([^"]*)"').exec(out) || [])[1];
    for (const n of ['ot', 'nimi', 'nappi', 'valilehti']) { expect(a(n), n).toBeTruthy(); expect(a(n), n).not.toMatch(/Archivo/i); expect(a(n), n).not.toBe('EI_LÖYDY'); }
    expect(a('nimi')).toMatch(/Cormorant/); expect(a('ot')).toMatch(/DM Sans/); expect(a('nappi')).toMatch(/DM Sans/); expect(a('kt')).toMatch(/Archivo/);
    expect(Number(a('sw'))).toBeLessThanOrEqual(Number(a('iw'))); expect(Number(a('nappi-y'))).toBeLessThanOrEqual(Number(a('ih')));
  }, 60000);
});

/* ── Adapterit: SIVUN oikea koodi vm:ssä (miniDOM) ── */
function pala(src, alku, loppu) { const i = src.indexOf(alku), j = src.indexOf(loppu, i); if (i < 0 || j < 0) throw new Error('ei löydy: ' + alku); return src.slice(i, j); }
function miniDom() {
  const dom = { nakyma: null, tyyli: false, ladattu: [], overflow: '' }; const el = (html) => ({ firstChild: null, set innerHTML(v) { this.firstChild = { html: v, replaceWith: () => {}, remove: () => {} }; } });
  const document = { getElementById: (id) => (id === 'ktNakyma' && dom.nakyma !== null ? { replaceWith: (n) => { dom.nakyma = n.html; }, remove: () => { dom.nakyma = null; } } : (id === 'ktTyylit' && dom.tyyli ? {} : null)),
    createElement: (t) => (t === 'style' ? { set textContent(v) {}, set id(v) {} } : { set innerHTML(v) { this.firstChild = { html: v, replaceWith() {}, remove() {} }; } }),
    head: { appendChild: () => { dom.tyyli = true; } }, body: { appendChild: (n) => { dom.nakyma = n.html; }, style: { get overflow() { return dom.overflow; }, set overflow(v) { dom.overflow = v; } } } };
  return { dom, document };
}
function ymp(sov, { pelaajat, rooli = 'vp', sa = false, joukkue = '', lippu = true, hash = '' } = {}) {
  const master = sov === 'Master', src = master ? MASTER : VP, M = miniDom(), log = { liputLuvut: 0, dbLuvut: 0, polku: 0, nayttoMonta: 0, renderDev: [], toimi: [] };
  const h = { v: hash }; const win = { location: { get hash() { return h.v; }, set hash(v) { h.v = v; }, pathname: '/x.html', search: '' }, history: { replaceState: (a, b, u) => { h.v = u.indexOf('#') === 0 ? u : ''; }, back: () => { h.v = ''; } }, addEventListener() {}, removeEventListener() {} };
  const sb = { console: { warn() {} }, Array, Object, String, Number, Promise, JSON, Date, Math, document: M.document, window: win, _seuraId: 'kpv', _demo: false, _isDemoMode: false, _mEsc: (s) => String(s == null ? '' : s), _jsvEsc: (s) => String(s == null ? '' : s), masterT: (x) => x, vpT: (x) => x,
    _pelaajatData: pelaajat, _pelaajat: pelaajat, _rooli: rooli, _superAdmin: sa, _joukkue: joukkue, _tmHenkiloNimi: (p) => p.etunimi, _devIkaSp: () => ({ ika: 13 }), _dimIkaSp: () => ({ ika: 13 }),
    _mJjLataaLiput: async () => { log.liputLuvut++; return { kentta: lippu }; }, _vpLataaLiput: async () => { log.liputLuvut++; return { kentta: lippu }; }, db: { collection: () => { log.dbLuvut++; throw new Error('luku!'); } }, _db: { collection: () => { log.dbLuvut++; throw new Error('luku!'); } },
    _mIdpReRender: () => { log.polku++; }, _mIdpLataa: () => { log.polku++; }, _msMesoKaariHTML: () => '<i>meso</i>', _mMitaOsattavaHTML: () => '<i>mita</i>', renderDev: (pid) => log.renderDev.push(pid), setWs() {},
    _vpPelaajanAaniHTML: () => { log.polku++; return ''; }, _vpKehSeuraavaAskelHTML: () => '', _vpKehSuunnitelmaHTML: () => '', _vpViikkoHTML: () => '', _vpArviointiHTML: () => { log.nayttoMonta++; return '<i>arv</i>'; }, _vpMesoKaariHTML: () => '', _vpLataaTavoite() {}, _vpLataaArviointiKehys() {},
    TM_HASH_REITITIN: H, TM_KEHITYSTYOPOYTA: KT, TM_ALOITA_JAKSO: AJ, TM_TANAAN_KENTTA: require('../lib/tm_tanaan_kentta.js'), tmKentta: require('../lib/tm_kentta.js').tmKentta, _vpRooli: rooli, _vpSA: sa };
  sb.window = Object.assign(win, { _mAloitaJaksoAvaa: (pid) => log.toimi.push(['aloitaM', pid]), _msSuljeJakso: (pid) => log.toimi.push(['suljeM', pid]), _vpAloitaJaksoAvaa: (pid) => log.toimi.push(['aloitaV', pid]), _vpSuljeJakso: (pid) => log.toimi.push(['suljeV', pid]), TM_HASH_REITITIN: H, TM_KEHITYSTYOPOYTA: KT, TM_ALOITA_JAKSO: AJ, TM_TANAAN_KENTTA: sb.TM_TANAAN_KENTTA, tmKentta: sb.tmKentta, _vpRooli: rooli, _vpSA: sa, _jsvPelaajat: pelaajat });
  vm.createContext(sb);
  const koodi = master ? pala(src, '/* ═══ V4a — Kehitystyöpöytä V4', 'window._msSuljeJakso = async function') : pala(src, '/* ═══ V4a — Kehitystyöpöytä V4', 'window._vpSulkuTila = null;');
  vm.runInContext(koodi + '\nthis._ktS=_ktS;this._ktKaynnista=_ktKaynnista;this._ktNayta=_ktNayta;this._ktPaivita=_ktPaivita;', sb);
  return { sb, M, log, h, win };
}
const lopeta = () => new Promise((r) => setTimeout(r, 0));
const PEL = () => [P({ id: 'a', etunimi: 'Aatu', joukkue: 'KPV U13' }), P({ id: 'b', etunimi: 'Bertta', joukkue: 'KPV U15', jaksofokus: JF() }), P({ id: 'c', etunimi: 'Cecilia', joukkue: 'KPV U13', jaksofokus: TARJOUS() })];

for (const sov of ['Master', 'VP']) {
  describe(sov + ' · V4a-adapteri (vm)', () => {
    it('LIPPU POIS: reititin ei liity, hashia ei lueta, mitään ei piirretä; _ktAvaa palauttaa false (vanha polku jatkuu)', async () => {
      const e = ymp(sov, { pelaajat: PEL(), lippu: false, hash: '#pelaaja/a/tanaan' }); await e.sb._ktKaynnista(); await lopeta();
      expect(e.sb.window._ktLippu).toBe(false); expect(e.sb._ktS.reititin).toBeNull(); expect(e.M.dom.nakyma).toBeNull(); expect(e.sb.window._ktAvaa('a')).toBe(false); expect(e.log.liputLuvut).toBe(1); expect(e.log.dbLuvut).toBe(0);
    });
    it('LIPPU PÄÄLLÄ + suora URL: näkymä avautuu oikeustarkistuksen jälkeen (otsikkorivi, Tänään); Firestore-lukuja 0 (pelaaja listan välimuistista, liput 1 luku); Polku/Näyttö 0 latausta ennen avaamista', async () => {
      const e = ymp(sov, { pelaajat: PEL(), hash: '#pelaaja/b/tanaan' }); await e._ktKaynnistaOdota; await e.sb._ktKaynnista(); await lopeta();
      expect(e.sb.window._ktLippu).toBe(true); expect(e.M.dom.nakyma).toContain('data-kt-pid="b"'); expect(e.M.dom.nakyma).toContain('Bertta'); expect(e.M.dom.nakyma).toContain('data-kt-valilehti-nyt="tanaan"'); expect(e.M.dom.nakyma).toContain('data-kt-tila="vahvistettu"');
      expect(e.log.dbLuvut).toBe(0); expect(e.log.liputLuvut).toBe(1); expect(e.log.polku).toBe(0); expect(e.log.nayttoMonta).toBe(0); expect(e.M.dom.nakyma).toMatch(/data-kt-sivu="polku" data-ladattu="0" hidden/); expect(e.M.dom.overflow).toBe('hidden');
    });
    it('välilehden vaihto Polkuun: sisältö ladataan vasta nyt (kerran); Näyttö edelleen 0; Takaisin → näkymä pois ja vieritys palaa', async () => {
      const e = ymp(sov, { pelaajat: PEL(), hash: '#pelaaja/a/tanaan' }); await e.sb._ktKaynnista(); await lopeta(); expect(e.log.polku).toBe(0);
      e.sb.window._ktValilehti('a', 'polku'); expect(e.h.v).toBe('#pelaaja/a/polku'); e.win.__laukaise && e.win.__laukaise();
      expect(e.log.polku).toBeGreaterThan(0); expect(e.log.nayttoMonta).toBe(0); expect(e.M.dom.nakyma).toContain('data-kt-valilehti-nyt="polku"');
      e.sb.window._ktSulje(); expect(e.M.dom.nakyma === null || e.h.v === '').toBe(true);
    });
    it('OIKEUS (testi 9): toisen joukkueen valmentaja → "Ei oikeutta" (ei pelaajan tietoja); oman joukkueen valmentaja, VP, talenttivalmentaja ja SA pääsevät; tuntematon pid → "ei löytynyt"', async () => {
      const kokeile = async (opts, hash) => { const e = ymp(sov, Object.assign({ pelaajat: PEL(), hash }, opts)); await e.sb._ktKaynnista(); await lopeta(); return e.M.dom.nakyma || ''; };
      const ei = await kokeile({ rooli: 'valmentaja', joukkue: 'KPV U13' }, '#pelaaja/b/tanaan'); expect(ei).toContain('data-kt-tila="ei_oikeutta"'); expect(ei).not.toContain('Bertta');
      if (sov === 'Master') { expect(await kokeile({ rooli: 'valmentaja', joukkue: 'KPV U13' }, '#pelaaja/a/tanaan')).toContain('data-kt-pid="a"'); expect(await kokeile({ rooli: 'talenttivalmentaja', joukkue: 'KPV U13' }, '#pelaaja/b/tanaan')).toContain('data-kt-pid="b"'); }
      expect(await kokeile({ rooli: 'vp' }, '#pelaaja/b/tanaan')).toContain('data-kt-pid="b"'); expect(await kokeile({ rooli: null, sa: true }, '#pelaaja/b/tanaan')).toContain('data-kt-pid="b"'); expect(await kokeile({ rooli: 'vp' }, '#pelaaja/ei_ole/tanaan')).toContain('data-kt-tila="ei_loydy"');
    });
    it('‹ › kulkevat listan järjestyksessä (uusi hash korvaa edellisen, ei kasvata historiaa); otsikkorivin napit kutsuvat olemassa olevia toimintoja', async () => {
      const e = ymp(sov, { pelaajat: PEL(), hash: '#pelaaja/a/tanaan' }); await e.sb._ktKaynnista(); await lopeta();
      e.sb.window._ktSeuraava('a'); expect(e.h.v).toBe('#pelaaja/b/tanaan'); e.sb.window._ktEdellinen('b'); expect(e.h.v).toBe('#pelaaja/a/tanaan'); e.sb.window._ktEdellinen('a'); expect(e.h.v).toBe('#pelaaja/a/tanaan');   // ensimmäisellä ei edellistä
      e.sb.window._ktToimi('c', 'vahvista'); e.sb.window._ktToimi('c', 'sulje'); e.sb.window._ktToimi('c', 'anna_valita');
      expect(e.log.toimi).toEqual(sov === 'Master' ? [['aloitaM', 'c'], ['suljeM', 'c'], ['suljeM', 'c']] : [['aloitaV', 'c'], ['suljeV', 'c'], ['suljeV', 'c']]);
    });
    it('otsikkorivi seuraa tilakonetta (6 tilaa samalla funktiolla kuin J4): ei_jaksoa / kaynnissa / valittavana → data-kt-tila', async () => {
      for (const [pid, tilaNimi] of [['a', 'ei_jaksoa'], ['b', 'vahvistettu'], ['c', 'valittavana']]) { const e = ymp(sov, { pelaajat: PEL(), hash: '#pelaaja/' + pid + '/tanaan' }); await e.sb._ktKaynnista(); await lopeta(); expect(e.M.dom.nakyma, pid).toContain('data-kt-tila="' + tilaNimi + '"'); }
    });
  });
}

describe('Kytkennät (lähdetarkistukset) — lippu pois → ennallaan', () => {
  it('Master: pickPlayer ja _mJaAvaa ohjaavat uuteen näkymään VAIN lipulla; muuten renderDev / V1-modaali kuten ennen; J4-lista saa tilakoneen vain lipulla', () => {
    const pp = pala(MASTER, 'function pickPlayer(pid) {', '\n}\n'); expect(pp).toMatch(/if \(window\._ktLippu && typeof window\._ktAvaa === 'function' && window\._ktAvaa\(pid, 'tanaan'\)\) return;[^\n]*\n\s*renderDev\(pid\);/);
    expect(pala(MASTER, 'window._mJaAvaa = function (pid) {', '\n};')).toMatch(/window\._ktLippu && .*_ktAvaa\(pid, 'polku'\)\) return;[\s\S]*return window\._mAloitaJaksoAvaa\(pid\);/);
    expect(MASTER).toContain("tilakone: window._ktLippu === true"); expect(MASTER).toMatch(/_paivitaKaikkiNakymat\(\);\s*\n\s*if \(typeof _ktKaynnista === 'function'\) _ktKaynnista\(\);/);
  });
  it('VP: _avaaPerPelaajaPikakatsaus ohjaa uuteen näkymään VAIN lipulla — vanha pelaajamodaali muuten ennallaan (testi 10)', () => {
    const f = pala(VP, 'window._avaaPerPelaajaPikakatsaus = function(idx, joukkueNimi) {', 'const nP = lista.length;'); expect(f).toMatch(/if \(window\._ktLippu && typeof window\._ktAvaaIdx === 'function' && window\._ktAvaaIdx\(idx\)\) return;/); expect(f).toContain("const lista = window._jsvPelaajat || [];");
    expect(VP).toMatch(/if \(typeof _ktKaynnista === 'function'\) _ktKaynnista\(\);/);
  });
  it('skriptit + ?v: molemmat lataavat uudet libit; tokenit (D10) sivun CSS:ssä; Archivo-fontti omalta palvelimelta', () => {
    for (const [n, s] of [['Master', MASTER], ['VP', VP]]) {
      for (const l of ['tm_kentta.js', 'tm_tanaan_kentta.js', 'tm_hash_reititin.js', 'tm_kehitystyopoyta.js', 'tm_reitin_valinta.js']) expect(s, n + ' ' + l).toMatch(new RegExp('<script src="lib/' + l.replace('.', '\\.') + '\\?v=\\d+"></script>'));
      expect(s).toContain('.kt-shell { --chalk:'); expect(s).toContain(':root[data-theme="light"] .kt-shell'); expect(s).not.toMatch(/fonts\.googleapis[^"']*Archivo/);
    }
    expect(MASTER.indexOf('lib/tm_kehitystyopoyta.js')).toBeLessThan(MASTER.indexOf('window._ktLippu = false;')); expect(lue('assets/fonts/README.md')).toMatch(/Archivo/i);
  });
});
