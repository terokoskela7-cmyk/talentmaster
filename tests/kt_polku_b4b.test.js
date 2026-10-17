/* B4b · Polku (lib/tm_kt_polku.js): Tämä viikko (luku) · Pelaajan ääni (D105) · Historia. Vain keksityt nimet. */
import { describe, it, expect } from 'vitest';
import { createRequire } from 'module';
const require = createRequire(import.meta.url);
const P = require('../lib/tm_kt_polku.js'), FI = P.FI, AJ = require('../lib/tm_aloita_jakso.js');
const NYT = new Date('2026-10-19T09:00:00+03:00'), PAIVA = 86400000, TANAAN = '2026-10-19';   // maanantai
const esc = (s) => String(s == null ? '' : s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
const JF = { konsepti_avain: 'y_h1', konsepti_nimi: 'Ensimmäinen kosketus', alkoi: '2026-10-03', kesto_vk: 6, domeeni: 'teknis_taktinen' };
const OSAT_T = ['Käännä pää ennen vastaanottoa', 'Vastaanotto poispäin paineesta', 'Ensimmäinen syöttö eteenpäin'];
const KAANON = () => ({ kpi: OSAT_T.map((teksti, i) => ({ teksti, koodi: 'abc'[i] })) });
const pelaaja = (o) => Object.assign({ id: 'p2', etunimi: 'Bertta', sukunimi: 'Bergh', suostumusTila: 'annettu', joukkue: 'Demo U13', joukkueet: ['demo_u13'], jaksofokus: JF }, o || {});
const JD = [{ id: 'demo_u13', nimi: 'Demo U13' }, { id: 'demo_u15', nimi: 'Demo U15' }];
const ev = (id, tyyppi, iso, o) => Object.assign({ id, tyyppi, nimi: 'Tapahtuma ' + id, alkaa: new Date(iso).getTime(), joukkue: 'demo_u13' }, o || {});
const klippi = (n, ms, o) => Object.assign({ id: 'k' + n, tyyppi: 'klippi', pelaajaId: 'p2', nakyvyys: 'pelaaja', url: 'https://veo.co/' + n, domain: 'veo.co', kysymys: 'Kysymys ' + n, klippityyppi: 'onnistui', fromNimi: 'Mika V.', aika: ms }, o || {});
const vastaus = (n, ms, teksti) => ({ id: 'v' + n, tyyppi: 'klippi_vastaus', pelaajaId: 'p2', nakyvyys: 'pelaaja', vastaus_viestille: 'k' + n, teksti, aika: ms });
const ctx = (p, o) => Object.assign({ esc, t: (k) => k, kaanon: KAANON, tila: AJ.tmJaksoTila(p, { nyt: NYT }), nyt: NYT, tanaan: TANAAN, nimi: 'Bertta Bergh', voiKirjoittaa: true, kausi: { tila: 'ok', tavoite: null }, klipit: { tila: 'ok', dokit: [] },
  viikko: { tila: 'ok', docs: [] }, vk: { docs: [] }, joukkueDocs: JD, uudelleenFn: '_u', historiaNimiFn: (a, n) => n }, o || {});
const html = (p, c) => P.tmKtPolkuHTML(p, c || ctx(p));
const F = (k, o) => String(FI[k]).replace(/\{(\w+)\}/g, (m, x) => (o && o[x] != null ? o[x] : m));
const lkm = (s, osa) => s.split(osa).length - 1;
const tavoite = (o) => Object.assign({ status: 'aktiivinen', luotu: '2026-08-20T10:00:00.000Z', fokus: { nimi: 'Pelaaja, joka pitää pallon paineessa' }, pelaajan_tavoite: 'Haluan, että pallo pysyy mulla', mittari: { yksikko: 's' }, lahto: { arvo: 5.4, pvm: '2026-06-05' }, tavoitearvo: 5.1 }, o || {});

describe('Tämä viikko (luku)', () => {
  const docs = [ev('h1', 'harjoitus', '2026-10-20T17:00:00+03:00'), ev('h2', 'harjoitus', '2026-10-22T17:00:00+03:00'), ev('o1', 'ottelu', '2026-10-24T11:00:00+03:00', { nimi: 'vs. GBK' })];
  it('vain tämän viikon (ma–su) harjoitukset ja ottelut; muut tyypit, peruttu, poistettu ja viikon ulkopuoliset pois', () => {
    const lisa = [ev('x1', 'valmentajapalaveri', '2026-10-21T18:00:00+03:00'), ev('x2', 'harjoitus', '2026-10-21T17:00:00+03:00', { tila: 'peruttu' }), ev('x3', 'harjoitus', '2026-10-21T17:00:00+03:00', { poistettu: true }),
      ev('x4', 'harjoitus', '2026-10-26T17:00:00+02:00'), ev('x5', 'harjoitus', '2026-10-18T17:00:00+03:00')];
    const w = P.tmKtPolkuViikko(docs.concat(lisa), pelaaja(), { tanaan: TANAAN, joukkueDocs: JD });
    expect(w.n).toBe(3); expect(w.paivat.map((d) => d.iso)).toEqual(['2026-10-19', '2026-10-20', '2026-10-21', '2026-10-22', '2026-10-23', '2026-10-24', '2026-10-25']);
    const klo = (iso) => { const d = new Date(iso); return String(d.getHours()).padStart(2, '0') + ':' + String(d.getMinutes()).padStart(2, '0'); };   // paikallinen kellonaika (CI = UTC, kehitys = Helsinki)
    expect(w.paivat[1].tapahtumat[0]).toMatchObject({ tyyppi: 'harjoitus', klo: klo('2026-10-20T17:00:00+03:00') }); expect(w.paivat[5].tapahtumat[0]).toMatchObject({ tyyppi: 'ottelu', nimi: 'vs. GBK' });
  });
  it('toisen joukkueen tapahtuma ei kuulu pelaajalle; poimittu pelaajat_id kuuluu', () => {
    const muu = ev('m1', 'harjoitus', '2026-10-21T17:00:00+03:00', { joukkue: 'demo_u15' }), poimittu = ev('m2', 'harjoitus', '2026-10-22T17:00:00+03:00', { joukkue: 'demo_u15', pelaajat_id: ['p2'] });
    expect(P.tmKtPolkuViikko([muu], pelaaja(), { tanaan: TANAAN, joukkueDocs: JD }).n).toBe(0); expect(P.tmKtPolkuViikko([poimittu], pelaaja(), { tanaan: TANAAN, joukkueDocs: JD }).n).toBe(1);
  });
  it('sunnuntai kuuluu viikkoon (ma 19.10. –> su 25.10.), ja sunnuntaina haettu viikko alkaa samasta maanantaista', () => {
    expect(P.tmKtPolkuViikonIkkuna('2026-10-25').paivat[0]).toBe('2026-10-19'); expect(P.tmKtPolkuViikonIkkuna('2026-10-19').paivat[6]).toBe('2026-10-25');
  });
  it('HTML: päivät ma–su, tapahtumat, ei Täytä viikko -toimintoa eikä kuormaa; sunnuntaina Viikkokatsaus + tila', () => {
    const p = pelaaja(), h = html(p, ctx(p, { viikko: { tila: 'ok', docs } }));
    expect(lkm(h, 'data-kt-vk-paiva="')).toBe(7); expect(lkm(h, 'data-kt-vk-tapahtuma="harjoitus"')).toBe(2); expect(lkm(h, 'data-kt-vk-tapahtuma="ottelu"')).toBe(1);
    expect(h).toContain('data-kt-viikko="ok"'); expect(h).not.toMatch(/Täytä viikko|kuorma|täytä/i);
    expect(h).toContain('data-kt-vk-katsaus-tila="odottaa"'); expect(h).toContain(FI.ktp_vk_odottaa);
    const v = html(p, ctx(p, { viikko: { tila: 'ok', docs }, vk: { docs: [{ id: '2026-10-25', vastaukset: [] }] } })); expect(v).toContain('data-kt-vk-katsaus-tila="vastattu"');
    expect(html(p, ctx(p, { viikko: { tila: 'ok', docs }, vk: { docs: null } }))).not.toContain('data-kt-vk-katsaus-tila');   // lukuvirhe → ei väitetä "ei vastattu"
  });
  it('ei jaksoa / Leikkijä → ei viikkokatsausriviä; ei tapahtumia → yksi selittävä rivi', () => {
    const e = pelaaja({ jaksofokus: null }); expect(html(e, ctx(e, { viikko: { tila: 'ok', docs } }))).not.toContain('data-kt-vk-katsaus');
    const p = pelaaja(); expect(html(p, ctx(p, { viikko: { tila: 'ok', docs }, ikavaihe: 'leikkija' }))).not.toContain('data-kt-vk-katsaus'); expect(html(p)).toContain('data-kt-vk-ei');
  });
  it('lataus ja virhe näkyvät lohkossa; ilman viikkodataa (B4a-kutsu) riviä ei piirretä', () => {
    const p = pelaaja(); expect(html(p, ctx(p, { viikko: { tila: 'lataa', docs: [] } }))).toContain('data-kt-viikko="lataa"');
    const v = html(p, ctx(p, { viikko: { tila: 'virhe', docs: [] } })); expect(v).toContain('data-kt-viikko="virhe"'); expect(v).toContain(FI.ktp_virhe_viikko); expect(v).toContain('data-kt-polku-uudelleen');
    expect(html(p, ctx(p, { viikko: undefined }))).not.toContain('data-kt-viikko');
  });
  it('lataaja: lukee kalenterin viikon ikkunan ja suodattaa poistetut', async () => {
    const kutsut = []; const L = { tmLataaIkkuna: async (db, sid, valit, TS) => { kutsut.push([sid, valit[0].alku, valit[0].loppu, TS.tag]); return [{ id: 'a', data: () => ({ tyyppi: 'harjoitus' }) }, { id: 'b', data: () => ({ tyyppi: 'harjoitus', poistettu: true }) }]; }, tmLatausSuodata: (t) => t.filter((x) => x.poistettu !== true) };
    const r = await P.tmKtPolkuLataaViikko({ db: {}, sid: 'demo', tanaan: TANAAN, L, TS: { tag: 'ts' } });
    expect(r.map((x) => x.id)).toEqual(['a']); expect(kutsut[0][0]).toBe('demo'); expect(new Date(kutsut[0][1]).getDate()).toBe(19); expect(new Date(kutsut[0][2]).getDate()).toBe(25);
    expect(await P.tmKtPolkuLataaViikko({ db: {}, sid: 'demo' })).toEqual([]);
  });
});

describe('Pelaajan ääni (D105)', () => {
  const aloitus = Date.parse('2026-10-03T12:00:00+03:00');
  const lahteet = (n) => {   // n lähdettä: kausi, klippi, vk, klippi, vk, ...
    const kl = [], vk = []; let kausi = null;
    for (let i = 0; i < n; i++) {
      if (i === 0) kausi = tavoite();
      else if (i % 2 === 1) { kl.push(klippi(i, aloitus + i * PAIVA), vastaus(i, aloitus + i * PAIVA + 3600000, 'Vastaus ' + i)); }
      else vk.push({ id: '2026-10-' + String(10 + i).padStart(2, '0'), lause: 'Lause ' + i });
    }
    return { kausi: { tila: 'ok', tavoite: kausi }, klipit: { tila: 'ok', dokit: kl }, vk: { docs: vk } };
  };
  it('0 lähdettä → lohkoa ei piirretä lainkaan (ei otsikkoa, ei paikkamerkkiä)', () => {
    const p = pelaaja(), h = html(p, ctx(p, lahteet(0))); expect(h).not.toContain('data-kt-aani'); expect(h).not.toContain(FI.ktp_aani);
    expect(P.tmKtPolkuAani({}).rivit).toEqual([]);
  });
  it('1 lähde → yksi rivi lähteellä ja päivällä; 5 lähdettä → enintään 3 uusinta, uusin ensin', () => {
    const p = pelaaja(), yksi = html(p, ctx(p, lahteet(1))); expect(yksi).toContain('data-kt-aani-n="1"'); expect(yksi).toContain(FI.ktp_a_kausi); expect(yksi).toContain('20.8.'); expect(yksi).toContain('Haluan, että pallo pysyy mulla');
    const viisi = html(p, ctx(p, lahteet(5))), a = P.tmKtPolkuAani({ kausi: P.tmKtPolkuKausi(lahteet(5).kausi.tavoite), klipit: lahteet(5).klipit.dokit, vk: lahteet(5).vk.docs, pelaaja: { id: 'p2', suostumusTila: 'annettu' } });
    expect(viisi).toContain('data-kt-aani-n="3"'); expect(a.rivit).toHaveLength(3); expect(a.yht).toBe(5); expect(a.rivit.map((r) => r.ms)).toEqual([...a.rivit.map((r) => r.ms)].sort((x, y) => y - x));
    expect(lkm(viisi, 'data-kt-aani-lahde="')).toBe(3); expect(viisi).toContain(F('ktp_a_uusinta', { n: 3, yht: 5 }));
  });
  it('jokaisella lähde + päivä; ei kirjoituskenttää; vain pelaajan oma teksti (ei pelkkä valinta, ei kuittaus)', () => {
    const p = pelaaja(), h = html(p, ctx(p, lahteet(3))); expect(h).not.toMatch(/<textarea|<input/); for (const a of ['ktp_a_klippi', 'ktp_a_vk']) expect(h).toContain(FI[a]);
    const a = P.tmKtPolkuAani({ klipit: [klippi(1, aloitus), { id: 'v1', tyyppi: 'klippi_vastaus', pelaajaId: 'p2', vastaus_viestille: 'k1', valinta: 'Näin tilan', aika: aloitus + 1000 }, { id: 'c1', tyyppi: 'klippi_kuittaus', pelaajaId: 'p2', vastaus_viestille: 'k1', teksti: 'Hyvä!', aika: aloitus + 2000 }], pelaaja: { id: 'p2', suostumusTila: 'annettu' } });
    expect(a.rivit).toEqual([]);   // valinta ei ole teksti; kuittaus on aikuisen
  });
  it('tyhjä lause tai päivämäärätön lähde ei tuota riviä; kausi ilman asetuspäivää ohitetaan', () => {
    const a = P.tmKtPolkuAani({ kausi: P.tmKtPolkuKausi(tavoite({ luotu: null })), vk: [{ id: '2026-10-11', lause: '  ' }, { id: 'x', lause: 'Ei päivää' }] }); expect(a.rivit).toEqual([]);
  });
  it('lähde puuttuu (klipit/vk ei ladattu) → muut lähteet silti; ei virhelohkoa Ääni-osioon', () => {
    const p = pelaaja(), h = html(p, ctx(p, { kausi: { tila: 'ok', tavoite: tavoite() }, klipit: { tila: 'virhe', dokit: [] }, vk: { docs: null } })); expect(h).toContain('data-kt-aani-n="1"');
  });
});

describe('Historia (jaksofokus_historia)', () => {
  const rivi = (o) => Object.assign({ konsepti_avain: 'y_h1', konsepti_nimi: 'Tallennettu nimi', alkoi: '2026-08-17', paattyi: '2026-09-27', lause: 'Hyvä jakso, kuljetus näkyy pelissä.', lause_lahde: 'valmentaja', tulos: null, suljettu: '2026-09-27T10:00:00.000Z', sulkutapa: 'suljettu',
    havainnot_vk: { y_h1: { a: { '2026-W36': { u1: { arvo: 2, pvm: '2026-09-01', rooli: 'valmentaja' } }, '2026-W38': { u1: { arvo: 3, pvm: '2026-09-15', rooli: 'valmentaja' } } }, b: { '2026-W38': { u1: { arvo: 3, pvm: '2026-09-15', rooli: 'valmentaja' } } }, c: { '2026-W38': { u1: { arvo: 1, pvm: '2026-09-15', rooli: 'valmentaja' } } } } } }, o || {});
  it('suljetut jaksot uusimmasta alkaen; nimi D248-funktiolla (tallennettu nimi ei muutu); aikaväli ja lause lähteineen', () => {
    const vanha = rivi({ konsepti_avain: 'y_p1', paattyi: '2026-06-01', alkoi: '2026-04-20', lause: '', konsepti_nimi: 'Vanha' }), p = pelaaja({ jaksofokus_historia: [vanha, rivi()] });
    const h = P.tmKtPolkuHistoria(p, null, { historiaNimiFn: null, nimiFn: (a, n) => (a === 'y_h1' ? 'Haltuunotto' : n), kaanon: KAANON });
    expect(h.map((x) => x.nimi)).toEqual(['Haltuunotto', 'Vanha']); expect(p.jaksofokus_historia[1].konsepti_nimi).toBe('Tallennettu nimi');
    const s = html(p, ctx(p, { historiaNimiFn: (a, n) => (a === 'y_h1' ? 'Haltuunotto' : n) })); expect(s).toContain('data-kt-historia-n="2"'); expect(s).toContain('17.8.–27.9.'); expect(s).toContain('”Hyvä jakso, kuljetus näkyy pelissä.” – ' + FI.ktp_h_lause_valm);
  });
  it('trendi a/b: viimeisin viikkohavainto per osa; b = konseptin osat', () => {
    const p = pelaaja({ jaksofokus_historia: [rivi()] }), t = P.tmKtPolkuHistoria(p, null, { kaanon: KAANON })[0].trendi;
    expect(t).toEqual({ a: 2, b: 3 });   // a, b itsenäisesti (viim. vk), c ei vielä
    expect(html(p)).toContain('↗ ' + F('ktp_h_osaa', { a: 2, b: 3 }));
  });
  it('ei havaintoja → ei trendiä; vaihdettu-tulos; VP:n lause; kesken olevia (ei paattyi) ei listata', () => {
    const p = pelaaja({ jaksofokus_historia: [rivi({ havainnot_vk: undefined, tulos: 'vaihda', lause_lahde: 'vp' }), { konsepti_nimi: 'Kesken' }] }), h = P.tmKtPolkuHistoria(p, null, { kaanon: KAANON });
    expect(h).toHaveLength(1); expect(h[0].trendi).toBeNull(); expect(h[0].vaihdettu).toBe(true); const s = html(p); expect(s).not.toContain('data-kt-h-trendi>↗'); expect(s).toContain(FI.ktp_h_vaihdettu); expect(s).toContain(FI.ktp_h_lause_vp);
  });
  it('tyhjä historia → yksi rivi "täyttyy kun jaksoja päätetään"', () => { expect(html(pelaaja())).toContain('data-kt-historia="tyhja"'); });
  it('jakson klipit: vain jakson aikaväliltä, määrä + avautuu; klipit eivät ole ladattu → ei klipit-osaa', () => {
    const k1 = klippi(1, Date.parse('2026-09-01T12:00:00+03:00')), k2 = klippi(2, Date.parse('2026-09-27T20:00:00+03:00')), k3 = klippi(3, Date.parse('2026-10-05T12:00:00+03:00')), eka = klippi(4, Date.parse('2026-08-01T12:00:00+03:00'));
    const p = pelaaja({ jaksofokus_historia: [rivi()] }), h = P.tmKtPolkuHistoria(p, [k1, k2, k3, eka], { nimi: 'Bertta' });
    expect(h[0].klipit.n).toBe(2);   // 27.9. koko päivä mukana, 5.10. (seuraava jakso) ja 1.8. (ennen) eivät
    const s = html(p, ctx(p, { klipit: { tila: 'ok', dokit: [k1, k2, k3, eka] } })); expect(s).toContain('data-kt-h-klipit'); expect(s).toContain(F('ktp_h_klipit', { n: 2 }));
    expect(html(p, ctx(p, { klipit: { tila: 'virhe', dokit: [] } }))).not.toContain('data-kt-h-klipit');
  });
  it('Jakso nyt -klipit eivät saa ylärajaa (B4a-käytös ennallaan)', () => {
    const jf = Object.assign({}, JF), r = P.tmKtPolkuKlipit([klippi(1, Date.parse('2026-12-01T12:00:00+02:00'))], jf, { pelaaja: { id: 'p2', suostumusTila: 'annettu' }, nyt: NYT }); expect(r.n).toBe(1);
  });
  it('konseptin nimi Jakso nyt -otsikossa täsmälleen kerran, vaikka historiassa ei ole samaa nimeä', () => {
    const p = pelaaja({ jaksofokus_historia: [rivi({ konsepti_nimi: 'Toinen asia' })] }); expect(lkm(html(p), 'Ensimmäinen kosketus')).toBe(1);
  });
});

describe('Muoto', () => {
  it('Ääni ei ole pelaajalle/huoltajalle: sivu on henkilökunnan; lib ei lue uusia Firestore-kenttiä (vain nimetyt)', () => {
    const fs = require('fs'), s = fs.readFileSync(require('path').join(__dirname, '..', 'lib', 'tm_kt_polku.js'), 'utf8'); expect(s).not.toMatch(/\.(set|update|add|delete)\(/);
  });
  it('CSS vain tokeneilla', () => { expect(P.tmKtPolkuCss()).not.toMatch(/#[0-9a-fA-F]{3,8}\b|rgba?\(/); });
});
