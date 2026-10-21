/* K4c · Kaikki mittaukset (lib/tm_mittaukset.js + tm_mittaukset_html.js, PURE): sama data ja säännöt kuin K4a:n kortit; historia, käyrä (ylös = parempi), kehitysnopeus (alle 2 kk → ei arvioida), kausi-suodatin,
   Peli (ikätason ulottuvuudet, lukitut, arvioijasarakkeet + ristiinarvion lukko), Psyykkinen arvio (ei pelaajan omaa), Kehon valmius (selkokieli), tyhjät tilat, SJK/Sibbo-testistöt, kielletyt sanat. */
import { describe, it, expect } from 'vitest';
import { createRequire } from 'module';
import { TOPIAS, SJK, VAHAN, VANHA, TOPIAS_PITKA, SIBBO, TYHJA } from './helpers/k4c_fixturet.mjs';
const require = createRequire(import.meta.url);
const N = require('../lib/tm_eerikkila_normit.js');
globalThis.tkLajiTaso = require('../docs/testit_indeksit.js').tkLajiTaso; globalThis.normiIka = N.normiIka;
const TC = require('../lib/tm_todistekortit.js'), M = require('../lib/tm_mittaukset.js'), H = require('../lib/tm_mittaukset_html.js'), L = require('../lib/tm_naytto_lohkot.js');
const NYT = new Date('2026-10-19T12:00:00');
const esc = (s) => String(s == null ? '' : s).replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
const ctx = (p, extra) => { const isp = L.tmNayttoDevIkaSp(p); return Object.assign({ nyt: NYT, ika: isp.ika, sp: isp.sp, perTestTasot: N.perTestTasot, jaksoTila: 'ei_jaksoa', esc, pid: p.id, uid: 'u1', superAdmin: false, kausiAlku: '2026-01-01' }, extra || {}); };
const malli = (p, extra) => M.tmMittauksetMalli(p, ctx(p, extra));
const osio = (m, a) => m.osiot.find((o) => o.avain === a);
const rivi = (m, a, id) => osio(m, a).rivit.find((r) => r.id === id);
const teksti = (p, extra) => { const c = ctx(p, extra); return H.tmMittauksetHTML(M.tmMittauksetMalli(p, c), c).replace(/<[^>]+>/g, ' ').replace(/&quot;/g, '"').replace(/&#39;/g, "'").replace(/&amp;/g, '&').replace(/\s+/g, ' '); };

describe('K4c · Topias: 30 m kaksi mittausta alle 2 kk → käyrä ylöspäin, Kehitysnopeutta ei arvioida', () => {
  const m = malli(TOPIAS), r = rivi(m, 'fyysinen', 'lin30m');
  it('rivi: viimeisin 3,08 s, edellinen 3,17 s, muutos parani, 2 mittausta, taso K4a:n kortin mukainen', () => {
    expect(r.viimeisin.raaka).toBe('3,08 s'); expect(r.edellinen.raaka).toBe('3,17 s'); expect(r.muutos).toBe('up'); expect(r.n).toBe(2);
    const kortti = TC.tmTodisteMalli(TOPIAS, ctx(TOPIAS)).kortitKaikki.fyysinen.rivit.find((x) => x.id === 'lin30m');
    expect(r.viimeisin.taso).toBe(kortti.taso); expect(r.max).toBe(5);
  });
  it('historia: kaksi pistettä, ajoissa pienempi parempi; vauhtia ei arvioida (alle 60 pv)', () => {
    expect(r.historia.kayra.pisteet).toHaveLength(2); expect(r.historia.kayra.pienempi).toBe(true); expect(r.historia.pisteet[0].raaka).toBe('3,08 s');   // uusin ensin
    expect(r.historia.vauhti).toBe('Kehitysnopeutta ei arvioida: mittausten väli alle 2 kk'); expect(r.historia.lause).toBe('Pienempi aika on parempi');
  });
  it('HTML: käyrä nousee (ylös = parempi), lause "Pienempi aika on parempi" ja "Kehitysnopeutta ei arvioida"; hyppy: suurempi parempi, ei aikalausetta', () => {
    const h = H.tmMittauksetHTML(m, ctx(TOPIAS)), lin = h.split('id="mkH-fyysinen-lin30m"')[1].split('</tr>')[0];
    expect(lin).toContain('data-mk-suunta="ylos"'); expect(lin).toContain('Pienempi aika on parempi'); expect(lin).toContain('Kehitysnopeutta ei arvioida');
    const cmj = h.split('id="mkH-fyysinen-cmj"')[1].split('</tr>')[0]; expect(cmj).toContain('Suurempi tulos on parempi'); expect(cmj).not.toContain('Pienempi aika on parempi');
  });
  it('yksi mittaus: rivi näyttää viimeisimmän ja "1 mittaus", ei laajennusta', () => {
    const k = rivi(m, 'tekninen', 'syotto'); expect(k.n).toBe(1); expect(k.historia).toBe(null); expect(k.edellinen).toBe(null);
    const h = H.tmMittauksetHTML(m, ctx(TOPIAS)); expect(h).not.toContain('id="mkH-tekninen-syotto"'); expect(h).toContain('1 mittaus');
  });
  it('tekniset TK-rivit: 4 testiä, taso K4a:n mukaan (syöttö 2 / 5)', () => {
    expect(osio(m, 'tekninen').rivit.map((x) => x.id)).toEqual(['kuljetus_laukaus', 'pujottelu', 'ponnauttelu', 'syotto']); expect(rivi(m, 'tekninen', 'syotto').viimeisin.taso).toBe(2);
  });
});

describe('K4c · pitkä historia: kausi-suodatin, kehitysvauhti, taso testihetken iästä', () => {
  it('Kaikki: 30 m 3 mittausta, vauhti "/ kausi"; Tämä kausi: 2 mittausta, edellinen 3,17 s; viime kauden mittaus ei näy', () => {
    const k = malli(TOPIAS_PITKA), t = malli(TOPIAS_PITKA, { suodatin: 'kausi' });
    expect(rivi(k, 'fyysinen', 'lin30m').n).toBe(3); expect(rivi(k, 'fyysinen', 'lin30m').historia.vauhti).toMatch(/ \/ kausi$/);
    expect(rivi(t, 'fyysinen', 'lin30m').n).toBe(2); expect(rivi(t, 'fyysinen', 'lin30m').edellinen.raaka).toBe('3,17 s'); expect(rivi(t, 'fyysinen', 'lin30m').kaikkiN).toBe(3);
    expect(rivi(t, 'fyysinen', 'lin30m').historia.pisteet.map((x) => x.pvm)).toEqual(['2026-10-04', '2026-04-12']);
  });
  it('historian taso on laskettu mittaushetken iästä (jokaisella pisteellä taso 1–5)', () => {
    const h = rivi(malli(TOPIAS_PITKA), 'fyysinen', 'lin30m').historia.pisteet; h.forEach((x) => { expect(x.taso).toBeGreaterThanOrEqual(1); expect(x.taso).toBeLessThanOrEqual(5); });
  });
  it('kausi, jolla ei mittauksia: osio kertoo sen eikä näytä tyhjää taulua', () => {
    const m = malli(VANHA, { suodatin: 'kausi', kausiAlku: '2026-09-01' }); expect(osio(m, 'fyysinen').eiKaudella).toBe(true); expect(osio(m, 'fyysinen').tyhja).toBe(false);
    expect(teksti(VANHA, { suodatin: 'kausi', kausiAlku: '2026-09-01' })).toContain('Ei mittauksia tällä kaudella');
  });
  it('Sibbo: ketteryys (käsirata) + 30 m, kolmen kuukauden väli → kehitysvauhti lasketaan', () => {
    const m = malli(SIBBO); expect(osio(m, 'fyysinen').rivit.map((r) => r.id).sort()).toEqual(['kasirata', 'lin30m']); expect(rivi(m, 'fyysinen', 'kasirata').nimi).toBe('Ketteryys');
    expect(rivi(m, 'fyysinen', 'lin30m').historia.vauhti).toMatch(/ \/ kausi$/); expect(osio(m, 'tekninen').tyhja).toBe(true);
  });
});

describe('K4c · seuran oma testistö (SJK): ei normia, juoksurata + pallorata + erotus, 1 mittaus', () => {
  const m = malli(SJK);
  it('fyysinen = seuran testit; tekninen = juoksurata, pallorata, pallorata − juoksurata ilman tasoa', () => {
    expect(osio(m, 'fyysinen').rivit.map((r) => r.id)).toEqual(['lin30m', 'cmj', 'lin10m']);
    expect(osio(m, 'tekninen').rivit.map((r) => r.id)).toEqual(['sm_juoksu', 'sm_pallo', 'sm_ero']); expect(osio(m, 'tekninen').rivit.every((r) => r.viimeisin.taso === null && r.n === 1 && r.historia === null)).toBe(true);
    expect(rivi(m, 'tekninen', 'sm_ero').viimeisin.raaka).toBe('2,3 s');
  });
  it('Peli, Kasvu ja Kehon valmius tyhjinä', () => { ['kasvu', 'peli', 'keho'].forEach((a) => expect(osio(m, a).tyhja, a).toBe(true)); });
});

describe('K4c · tyhjä pelaaja: vain tyhjät tilat', () => {
  const m = malli(TYHJA);
  it('kaikki viisi osiota tyhjinä, ei rivejä, jokaisella ohje; Kasvu = katkoviivakortti "Ei kasvumittauksia" + Suunnittele kasvumittaus', () => {
    expect(m.osiot.map((o) => o.avain)).toEqual(['kasvu', 'fyysinen', 'tekninen', 'peli', 'keho']); m.osiot.forEach((o) => { expect(o.tyhja, o.avain).toBe(true); expect(o.rivit, o.avain).toEqual([]); expect(o.tyhjaLause, o.avain).toBeTruthy(); });
    expect(osio(m, 'kasvu').tyhjaOtsikko).toBe('Ei kasvumittauksia'); expect(osio(m, 'kasvu').toiminto).toMatchObject({ avain: 'mittaus', teksti: 'Suunnittele kasvumittaus', arg: 'kasvumittaus' });
    expect(osio(m, 'peli').toiminto).toMatchObject({ avain: 'havainto' });
    const h = H.tmMittauksetHTML(m, ctx(TYHJA)); expect(h).not.toContain('<table'); expect((h.match(/data-mk-tyhja/g) || []).length).toBe(5);
  });
});

describe('K4c · Peli: ikätason ulottuvuudet, lukitut, arvioijasarakkeet ja ristiinarvion lukko', () => {
  it('13-v: A, D, Ac + keskiarvo; Reagointi lukittu "ei arvioida tällä portaalla"; edellinen + muutos', () => {
    const P = osio(malli(TOPIAS_PITKA), 'peli').peli; expect(P.rivit.map((r) => r.id)).toEqual(['a', 'd', 'ac']); expect(P.lukitut.map((l) => l.id)).toEqual(['r']); expect(P.lukitut[0].teksti).toBe('ei arvioida tällä portaalla');
    expect(P.rivit[0]).toMatchObject({ viimeisin: '2,5 / 3', edellinen: '2 / 3', muutos: 'up' }); expect(P.keskiarvo.id).toBe('yht'); expect(P.meta).toContain('7 havaintoa'); expect(P.meta).toContain('3 arvioijaa'); expect(P.meta).toContain('12.10.2026');
  });
  it('arvioija on itse arvioinut tässä kuussa (uid u1): sarakkeet nimillä ja pisteillä', () => {
    const P = osio(malli(TOPIAS_PITKA), 'peli').peli; expect(P.arvioijat).toEqual(['Testi Valmentaja', 'Veera Virta', 'Ville Peltola']); expect(P.rivit[0].arvioijat).toEqual(['2,5', '3', '2']); expect(P.lukko).toBe('');
  });
  it('ei omaa arviota tässä kuussa (uid u9): muiden pisteet EIVÄT ole mallissa eikä HTML:ssä (ei DOM-vuotoa), lukkoteksti näkyy; super_admin ohittaa', () => {
    const m = malli(TOPIAS_PITKA, { uid: 'u9' }), P = osio(m, 'peli').peli; expect(P.arvioijat).toEqual([]); expect(P.rivit.every((r) => r.arvioijat.length === 0)).toBe(true); expect(P.lukko).toContain('Arvioi ensin');
    const h = H.tmMittauksetHTML(m, ctx(TOPIAS_PITKA, { uid: 'u9' })); expect(h).not.toContain('Veera Virta'); expect(h).not.toContain('Ville Peltola'); expect(h).toContain('data-mk-lukko');
    expect(osio(malli(TOPIAS_PITKA, { uid: 'u9', superAdmin: true }), 'peli').peli.arvioijat).toHaveLength(3);
  });
  it('Psyykkinen arvio: viisi ulottuvuutta, vain valmentajan ja VP:n arvio — pelaajan oma arvio ja keskiarvo eivät ole mallissa; rivi kehityskeskustelusta', () => {
    const m = malli(TOPIAS_PITKA), d = osio(m, 'peli').d3; expect(d.rivit.map((r) => r.id)).toEqual(['inner_drive', 'coachability', 'resilience', 'focus', 'emotional_control']);
    expect(d.rivit[0]).toMatchObject({ valmentaja: '4 / 5', vp: '' }); expect(d.rivit[4]).toMatchObject({ valmentaja: '2 / 5', vp: '3 / 5' });
    expect(Object.keys(d.rivit[0]).sort()).toEqual(['id', 'nimi', 'valmentaja', 'vp']);
    expect(teksti(TOPIAS_PITKA)).toContain('Pelaajan oma arvio ja valmentajien erot näkyvät kehityskeskustelussa');
  });
  it('vähän dataa (1 havainto): taulu + "Vähän dataa" -huomautus; loput ulottuvuudet lukittuja', () => {
    const P = osio(malli(VAHAN), 'peli').peli; expect(P.vahan).toContain('Vähän dataa'); expect(P.lukitut.length).toBeGreaterThan(0);
  });
});

describe('K4c · Kasvu ja Kehon valmius', () => {
  const m = malli(TOPIAS_PITKA);
  it('Kasvu mitattuna: yksi mittaus/rivi (tila, ikä, kasvutahti), ei tasoa', () => {
    expect(osio(m, 'kasvu').rivit.map((r) => r.id)).toEqual(['phv', 'phv_ika', 'kasvutahti']); expect(osio(m, 'kasvu').rivit.every((r) => r.n === 1 && r.historia === null && r.viimeisin.taso === null)).toBe(true);
  });
  it('Kehon valmius: 62 % (3 mittausta, historia), K4a2:n selkokielinen rivi, ei ketjuprosentteja eikä koodeja', () => {
    const r = rivi(m, 'keho', 'keho'), o = osio(m, 'keho'); expect(r.viimeisin.raaka).toBe('62 %'); expect(r.n).toBe(3); expect(r.edellinen.raaka).toBe('57 %'); expect(r.muutos).toBe('up'); expect(r.viimeisin.taso).toBe(3);
    expect(o.tuki).toBe('Eniten tukea: vartalon kierto · näkyy potkussa ja suunnanmuutoksissa'); const t = teksti(TOPIAS_PITKA); expect(t).not.toMatch(/\b(SBL|SFL|LL|DIAG|DFL)\b/); expect(o.rivit).toHaveLength(1);
  });
  it('matala valmius (< 40 %): ohjaus fysioterapeutille kuten kortilla', () => { expect(osio(malli(Object.assign({}, TOPIAS_PITKA, { flei_viimeisin: 35, flei_historia: [{ pvm: '2026-10-04', flei: 35 }] })), 'keho').matala).toContain('fysioterapeutille'); });
});

describe('K4c · vanha data ja päivämerkit', () => {
  it('yli 6 kk vanha mittaus: "yli 6 kk" -merkki', () => {
    const r = rivi(malli(VANHA), 'fyysinen', 'lin30m'); expect(r.viimeisin.merkki).toBe('yli 6 kk'); expect(r.viimeisin.luokka).toBe('vanha');
  });
  it('3–6 kk: "yli 3 kk"', () => { expect(rivi(malli(Object.assign({}, TOPIAS_PITKA, { hh_pvm: '2026-06-20', hh_historia: [{ pvm: '2026-06-20', lin30m: 3.1, cmj: 34, kasirata: 8.4 }] })), 'fyysinen', 'lin30m').viimeisin.merkki).toBe('yli 3 kk'); });
});

describe('K4c · näkyvä teksti: ei emojeita, ⭐-merkkiä, D1/D2/D3, PHV, ketju-sanaa eikä raakoja avaimia; ei hex-värejä', () => {
  it.each([['Topias', TOPIAS], ['Pitkä', TOPIAS_PITKA], ['SJK', SJK], ['Sibbo', SIBBO], ['Tyhjä', TYHJA], ['Vähän', VAHAN], ['Vanha', VANHA]])('%s', (n, p) => {
    const t = teksti(p); expect(t.replace(/[↗↘ⓘ]/g, '')).not.toMatch(/\p{Extended_Pictographic}/u);   // nuolet ja ⓘ ovat tekstimerkkejä (K4a), ei emojeita
    expect(t).not.toContain('⭐'); expect(t).not.toMatch(/\bD[123]\b/); expect(t).not.toMatch(/PHV|ketju|§|katselmus|IDP/i);
    expect(t).not.toMatch(/\b(mk|tc|kn)_[a-z_0-9]+\b/); expect(t).not.toMatch(/\bundefined\b|\bNaN\b|\bnull\b/);
  });
  it('CSS: vain tokenit (ei hex-värejä), fonttikoot var(--fs-*), DM Mono vain .mk-eb', () => {
    const css = H.tmMittauksetCss(); expect(css).not.toMatch(/#[0-9a-fA-F]{3,8}\b/);
    [...css.matchAll(/font-size:([^;}]+)/g)].forEach((x) => expect(x[1]).toMatch(/^(var\(--fs-(h1|h2|lead|body|meta|eb)\)|calc\(var\(--fs-lead\) \* [\d.]+\))$/));
    css.split('}').filter((r) => /--font-mono/.test(r)).forEach((r) => expect(r).toMatch(/^\s*\.mk-eb\{/));
  });
  it('kohde-parseri: osio[:testi]', () => { expect(M.tmMittauksetKohde('fyysinen:lin30m')).toEqual({ osio: 'fyysinen', testi: 'lin30m' }); expect(M.tmMittauksetKohde('peli')).toEqual({ osio: 'peli', testi: null }); expect(M.tmMittauksetKohde('xx')).toBe(null); expect(M.tmMittauksetKohde('fyysinen:')).toBe(null); });
});
