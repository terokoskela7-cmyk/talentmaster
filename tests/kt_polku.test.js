/* B4a · Polku (lib/tm_kt_polku.js): tilat, lähtötason näkyvyys (D104), klippien jaksorajaus + "Näytä kaikki", virhe näkyy lohkossa, konseptin nimi kerran, osat samalla komponentilla kuin Tänään, lukulogiikka. Vain keksityt nimet. */
import { describe, it, expect } from 'vitest';
import { readFileSync } from 'fs';
import { createRequire } from 'module';
const require = createRequire(import.meta.url);
const P = require('../lib/tm_kt_polku.js'), K = require('../lib/tm_kehitystyopoyta.js'), AJ = require('../lib/tm_aloita_jakso.js'), MV = require('../lib/tm_mediaviesti.js');
const NYT = new Date('2026-10-19T09:00:00+03:00'), PAIVA = 86400000;
const esc = (s) => String(s == null ? '' : s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
const JF = { konsepti_avain: 'y_h1', konsepti_nimi: 'Ensimmäinen kosketus', alkoi: '2026-10-03', kesto_vk: 6, domeeni: 'teknis_taktinen', tukiosa: { alue: 'Kehon hallinta' } };
const OSAT_T = ['Käännä pää ennen vastaanottoa', 'Vastaanotto poispäin paineesta', 'Ensimmäinen syöttö eteenpäin'];
const pelaaja = (o) => Object.assign({ id: 'p2', etunimi: 'Bertta', sukunimi: 'Bergh', suostumusTila: 'annettu', jaksofokus: JF }, o || {});
const ctx = (p, o) => Object.assign({ esc, t: (k) => k, kaanon: KAANON, tila: AJ.tmJaksoTila(p, { nyt: NYT }), nyt: NYT, nimi: 'Bertta Bergh', voiKirjoittaa: true, alueMahdollinen: true, osaFn: '_osa', toimiFn: '_toimi', uudelleenFn: '_uudelleen', kausi: { tila: 'ok', tavoite: null }, klipit: { tila: 'ok', dokit: [] } }, o || {});
const tavoite = (o) => Object.assign({ status: 'aktiivinen', luotu: '2026-08-20T10:00:00.000Z', fokus: { nimi: 'Pelaaja, joka pitää pallon paineessa' }, pelaajan_tavoite: 'Haluan, että pallo pysyy mulla', mittari: { yksikko: 's' }, lahto: { arvo: 5.4, pvm: '2026-06-05' }, tavoitearvo: 5.1, aikaraami: { kausi: 'syksy 2026' } }, o || {});
const klippi = (n, ms, o) => Object.assign({ id: 'k' + n, tyyppi: 'klippi', pelaajaId: 'p2', nakyvyys: 'pelaaja', klippi_id: 'kl' + n, url: 'https://veo.co/' + n, domain: 'veo.co', kysymys: 'Kysymys ' + n, klippityyppi: 'onnistui', fromNimi: 'Mika V.', aika: ms }, o || {});
const KAANON = () => ({ kpi: OSAT_T.map((teksti, i) => ({ teksti, koodi: 'abc'[i] })) });   // konseptin osat koodeineen (tmKonseptiKaanon-muoto)
const html = (p, c) => P.tmKtPolkuHTML(p, c || ctx(p));
const lkm = (s, osa) => s.split(osa).length - 1;

describe('Kausi (D104: lähtötaso vain mitattuna)', () => {
  it('mitattu lähtötaso + tavoite näkyvät päivällä; omin sanoin mukana', () => {
    const h = html(pelaaja(), ctx(pelaaja(), { kausi: { tila: 'ok', tavoite: tavoite() } }));
    expect(h).toContain('Pelaajan omin sanoin: ”Haluan, että pallo pysyy mulla”'); expect(h).toContain('Lähtötaso: 5.4 s (mitattu 5.6.).'); expect(h).toContain('Tavoite: 5.1 s.'); expect(h).toContain('asetettu 20.8.');
  });
  it('taso-yksikkö (havaittu / oletus taso+1): ei lähtötasoa eikä tavoitearvoa lukuna', () => {
    const t = tavoite({ mittari: { yksikko: 'taso' }, lahto: { arvo: 2, pvm: '2026-09-01' }, tavoitearvo: 3 }), K1 = P.tmKtPolkuKausi(t);
    expect(K1.lahto).toBeNull(); expect(K1.tavoite).toBeNull();
    const h = html(pelaaja(), ctx(pelaaja(), { kausi: { tila: 'ok', tavoite: t } })); expect(h).toContain('Lähtötasoa ei ole vielä mitattu.'); expect(h).not.toMatch(/Tavoite: 3/);
  });
  it('lähtöarvo ilman mittauspäivää tai ilman arvoa → ei lukua', () => {
    expect(P.tmKtPolkuKausi(tavoite({ lahto: { arvo: 5.4, pvm: null } })).lahto).toBeNull(); expect(P.tmKtPolkuKausi(tavoite({ lahto: { arvo: null, pvm: '2026-06-05' } })).lahto).toBeNull();
  });
  it('vaihdettu / hylätty / ehdotettu tavoite ei ole kausi', () => { for (const s of ['vaihdettu', 'hylatty', 'ehdotettu']) expect(P.tmKtPolkuKausi(tavoite({ status: s })), s).toBeNull(); });
  it('ei tavoitetta → yksi rivi + "Aseta kauden tavoite" (vain kirjoittajalle)', () => {
    const h = html(pelaaja()); expect(h).toContain('Kauden tavoitetta ei ole asetettu.'); expect(h).toContain('Aseta kauden tavoite'); expect(h).toContain('&quot;kausitavoite&quot;');
    const lue = html(pelaaja(), ctx(pelaaja(), { voiKirjoittaa: false })); expect(lue).toContain('Kauden tavoitetta ei ole asetettu.'); expect(lue).not.toContain('Aseta kauden tavoite');
  });
  it('lataus ja virhe näkyvät lohkossa (ei hiljaista tyhjää)', () => {
    expect(html(pelaaja(), ctx(pelaaja(), { kausi: { tila: 'lataa' } }))).toContain('data-kt-kausi="lataa"');
    const v = html(pelaaja(), ctx(pelaaja(), { kausi: { tila: 'virhe' } })); expect(v).toContain('role="alert"'); expect(v).toContain('Kauden tavoitetta ei voitu ladata.'); expect(v).toContain('data-kt-polku-uudelleen');
  });
});

describe('Jakso nyt: tilat, osat, konseptin nimi', () => {
  it('Normaali: viikko X/Y, arviointipäivä, osat tiloineen, konseptin nimi TÄSMÄLLEEN kerran', () => {
    const p = pelaaja({ jaksofokus: Object.assign({}, JF, { osa_arviot: { y_h1: { a: 3, b: 2 } }, osa_havainnot: { y_h1: { a: { u1: { arvo: 3, pvm: '2026-10-15', rooli: 'valmentaja' } } } } }) }), h = html(p);
    expect(h).toContain('data-kt-polku-tila="normaali"'); expect(h).toContain('viikko 3/6'); expect(h).toContain('arviointi 14.11.'); expect(h).toContain('Jakso nyt · 3.10.–14.11.'); expect(h).toContain('teknis-taktinen'); expect(h).toContain('tukiosa: Kehon hallinta');
    expect(lkm(h, 'Ensimmäinen kosketus')).toBe(1);   // konseptin nimi vain Jakso nyt -otsikossa (osan "Ensimmäinen syöttö eteenpäin" on eri teksti)
    expect(h).toContain('data-kt-osa="a"'); expect(h).toMatch(/kt-osa-r ok[^>]*data-kt-osa="a"/);
  });
  it('osat piirtää SAMA komponentti kuin Tänään (tmKtOsatHTML), ei toista osarenderöintiä', () => {
    const p = pelaaja(), osat = K.tmKtOsat(p.jaksofokus, { kaanon: KAANON }), tila = AJ.tmJaksoTila(p, { nyt: NYT }), h = html(p);
    const odotettu = K.tmKtOsatHTML({ osat, viikonOsa: K.tmKtViikonOsa(osat), jaksoNimi: '' }, { esc, t: (k) => k, osaFn: '_osa', pid: 'p2', v2: true });
    expect(tila.tila).toBe('kaynnissa'); expect(h).toContain(odotettu);
  });
  it('Vähän dataa: ei havaintoja eikä klippejä → ohje; Normaali kun klippi on', () => {
    const p = pelaaja(); expect(html(p)).toContain('data-kt-polku-tila="vahan"'); expect(html(p)).toContain('data-kt-vahan-ohje');
    const kl = klippi(1, NYT.getTime() - 2 * PAIVA); expect(html(p, ctx(p, { klipit: { tila: 'ok', dokit: [kl] } }))).toContain('data-kt-polku-tila="normaali"');
  });
  it('Jakso ei alkanut: yksi kortti "Aloita jakso", ei osa- eikä klippilohkoja', () => {
    const p = pelaaja({ jaksofokus: null, ydinvahvuus: { kuvaus: 'Ensimmäinen kosketus' } }), h = html(p);
    expect(h).toContain('data-kt-polku-tila="ei_jaksoa"'); expect(h).toContain('Ei jaksoa käynnissä'); expect(h).toContain('Aloita jakso'); expect(h).toContain('&quot;aloita&quot;');
    expect(h).not.toContain('data-kt-osat'); expect(h).not.toContain('data-kt-klipit'); expect(h).not.toContain('Merkitse viikkohavainto');
    expect(html(pelaaja({ jaksofokus: null }))).toContain('Aseta ydinvahvuus kentälle');   // ei ydinvahvuutta → ensin se
  });
  it('Katselmusvaihe: Sulje jakso korostettuna (täytetty nappi), ei "Merkitse viikkohavainto" -ensisijaista', () => {
    const p = pelaaja({ jaksofokus: Object.assign({}, JF, { alkoi: '2026-08-31' }) }), h = html(p);
    expect(h).toContain('data-kt-polku-tila="katselmus"'); expect(h).toContain('päättynyt · suljettava'); expect(h).toMatch(/class="kt-btn" [^>]*data-kt-jakso-nappi="sulje"/); expect(h).not.toContain('data-kt-jakso-nappi="havainto"');
  });
  it('toiminnot: Merkitse viikkohavainto + ⋯ (Lisää klippi · Muokkaa jaksoa · Sulje jakso); lukijalle ei yhtään', () => {
    const h = html(pelaaja()); for (const a of ['data-kt-jakso-nappi="havainto"', 'data-kt-lisaa-klippi', 'data-kt-jakso-muokkaa', 'data-kt-jakso-sulje']) expect(h, a).toContain(a);
    const lue = html(pelaaja(), ctx(pelaaja(), { voiKirjoittaa: false })); for (const a of ['data-kt-jakso-nappi', 'data-kt-lisaa-klippi', 'kt-pk-valikko', 'onclick="_osa']) expect(lue, a).not.toContain(a);
  });
  it('henkilökunnan tekstit escapataan', () => {
    const p = pelaaja({ jaksofokus: Object.assign({}, JF, { tukiosa: { alue: '<img src=x onerror=alert(1)>' } }) }); const h = html(p, ctx(p, { kausi: { tila: 'ok', tavoite: tavoite({ pelaajan_tavoite: '<script>x</script>' }) } }));
    expect(h).not.toContain('<img'); expect(h).not.toContain('<script>x'); expect(h).toContain('&lt;script&gt;');
  });
});

describe('Klipit jakson sisällä', () => {
  const alku = Date.parse('2026-10-03T00:00:00'), jf = JF;
  it('rajaus: vain jaksofokus.alkoi:n jälkeiset klipit; vastaus ja kuittaus seuraavat klippiään; uusin ensin', () => {
    const dokit = [klippi(1, alku - PAIVA), klippi(2, alku + 2 * PAIVA), klippi(3, alku + 9 * PAIVA),
      { id: 'v2', tyyppi: 'klippi_vastaus', pelaajaId: 'p2', vastaus_viestille: 'k2', teksti: 'Näin tilan', aika: alku + 3 * PAIVA }, { id: 'v1', tyyppi: 'klippi_vastaus', pelaajaId: 'p2', vastaus_viestille: 'k1', teksti: 'Vanha', aika: alku }];
    const r = P.tmKtPolkuKlipit(dokit, jf, { pelaaja: { id: 'p2', suostumusTila: 'annettu' }, nyt: NYT });
    expect(r.n).toBe(2); expect(r.rivit.map((x) => x.klippiDocId)).toEqual(['k3', 'k2']); expect(r.rivit[1].tila).toBe('vastattu'); expect(r.rivit[1].vastaus.teksti).toBe('Näin tilan');
  });
  it('rivi: päivä, tekijä, tila ja linkki; vain https-linkki', () => {
    const p = pelaaja(), h = html(p, ctx(p, { klipit: { tila: 'ok', dokit: [klippi(1, alku + 2 * PAIVA), klippi(2, alku + 3 * PAIVA, { url: 'http://x.example/k' })] } }));
    expect(h).toContain('Mika V. · 5.10. · lähetetty'); expect(h).toContain('href="https://veo.co/1"'); expect(h).not.toContain('http://x.example');
  });
  it('tilat: lähetetty · pelaaja vastasi · huoltaja kuittasi', () => {
    const dokit = [klippi(1, alku + PAIVA), klippi(2, alku + 2 * PAIVA), klippi(3, alku + 3 * PAIVA),
      { id: 'v2', tyyppi: 'klippi_vastaus', pelaajaId: 'p2', vastaus_viestille: 'k2', teksti: 'x', aika: alku + 3 * PAIVA }, { id: 'c3', tyyppi: 'klippi_kuittaus', pelaajaId: 'p2', vastaus_viestille: 'k3', kuittaus: true, aika: alku + 4 * PAIVA }];
    const t = Object.fromEntries(P.tmKtPolkuKlipit(dokit, jf, { pelaaja: { id: 'p2', suostumusTila: 'annettu' }, nyt: NYT }).rivit.map((r) => [r.klippiDocId, r.tila]));
    expect(t).toEqual({ k1: 'odottaa', k2: 'vastattu', k3: 'perhe_kuittasi' });
  });
  it('enintään 5 näkyy; "Näytä kaikki (n)" vasta kun klippejä on yli 5', () => {
    const p = pelaaja(), tee = (n) => Array.from({ length: n }, (_, i) => klippi(i + 1, alku + (i + 1) * PAIVA / 2));
    const viisi = html(p, ctx(p, { klipit: { tila: 'ok', dokit: tee(5) } })); expect(lkm(viisi, 'data-kt-klippi="')).toBe(5); expect(viisi).not.toContain('data-kt-klipit-kaikki');
    const seitseman = html(p, ctx(p, { klipit: { tila: 'ok', dokit: tee(7) } })); expect(seitseman).toContain('Näytä kaikki (7)'); expect(lkm(seitseman, 'data-kt-klippi="')).toBe(7);
    expect(seitseman.indexOf('data-kt-klipit-kaikki')).toBeGreaterThan(seitseman.indexOf('data-kt-klippi="k7"'));   // uusin ensin: viidestä uusimmasta ensin, loput haitarin sisällä
    expect(seitseman.slice(0, seitseman.indexOf('data-kt-klipit-kaikki'))).toContain('data-kt-klippi="k7"'); expect(seitseman.slice(0, seitseman.indexOf('data-kt-klipit-kaikki'))).not.toContain('data-kt-klippi="k1"');
  });
  it('0 klippiä → yksi rivi; virhe → näkyvä viesti + uudelleenyritys; lataus', () => {
    const p = pelaaja(); expect(html(p)).toContain('Ei klippejä tällä jaksolla.');
    const v = html(p, ctx(p, { klipit: { tila: 'virhe', dokit: [] } })); expect(v).toContain('Klippejä ei voitu ladata.'); expect(v).toContain('data-kt-polku-uudelleen'); expect(html(p, ctx(p, { klipit: { tila: 'lataa', dokit: [] } }))).toContain('data-kt-klipit="lataa"');
  });
  it('ketju: pelaajan vastaus ja valmentajan kuittaus näkyvät rivillä', () => {
    const p = pelaaja(), dokit = [klippi(1, alku + PAIVA, { kuittaus_lause: 'Hyvä!' }), { id: 'v1', tyyppi: 'klippi_vastaus', pelaajaId: 'p2', vastaus_viestille: 'k1', valinta: 'Näin tilan', aika: alku + 2 * PAIVA }];
    const h = html(p, ctx(p, { klipit: { tila: 'ok', dokit } })); expect(h).toContain('Pelaaja: Näin tilan'); expect(h).toContain('Kuittaus: Hyvä!');
  });
});

describe('Lataus (ei uusia kenttiä): idp_kausi ja viestit', () => {
  const kausiDb = (docs, virhe) => ({ collection: () => ({ doc: () => ({ collection: () => ({ doc: () => ({ collection: () => ({ doc: (id) => ({ get: async () => { if (virhe) throw new Error('x'); return { exists: id in docs, data: () => docs[id] }; } }) }) }) }) }) }) });
  it('kuluva vuosi voimassa → se; vuodenvaihde → edellisen vuoden voimassa oleva; ei tavoitetta → null; lukuvirhe → hylkää (ei hiljaista null)', async () => {
    const t = tavoite();
    expect((await P.tmKtPolkuLataaKausi({ db: kausiDb({ 2026: { tavoitteet: [t] } }), sid: 's', pid: 'p2', nyt: NYT })).fokus.nimi).toBe(t.fokus.nimi);
    expect((await P.tmKtPolkuLataaKausi({ db: kausiDb({ 2026: { tavoitteet: [t] } }), sid: 's', pid: 'p2', nyt: new Date('2027-01-10T12:00:00+02:00') })).fokus.nimi).toBe(t.fokus.nimi);
    expect(await P.tmKtPolkuLataaKausi({ db: kausiDb({}), sid: 's', pid: 'p2', nyt: NYT })).toBeNull();
    await expect(P.tmKtPolkuLataaKausi({ db: kausiDb({}, true), sid: 's', pid: 'p2', nyt: NYT })).rejects.toThrow();
  });
  it('klippien lukukysely: pelaajaId + nakyvyys in [pelaaja, huoltaja]; vain klippityypit (YKSI lukija Masterille ja uudelle sivulle)', async () => {
    const kutsut = []; const q = { where: (a, b, c) => { kutsut.push([a, b, c]); return q; }, get: async () => ({ docs: [{ id: 'a', data: () => ({ tyyppi: 'klippi' }) }, { id: 'b', data: () => ({ tyyppi: 'viesti' }) }, { id: 'c', data: () => ({ tyyppi: 'klippi_vastaus' }) }] }) };
    const db = { collection: (c) => { kutsut.push(['col', c]); return { doc: (d) => { kutsut.push(['doc', d]); return { collection: (k) => { kutsut.push(['col', k]); return q; } }; } }; } };
    const r = await MV.tmMvLataaPelaajanKlipit(db, 'seura1', 'p2'); expect(r.map((x) => x.id)).toEqual(['a', 'c']);
    expect(kutsut).toEqual([['col', 'seurat'], ['doc', 'seura1'], ['col', 'viestit'], ['pelaajaId', '==', 'p2'], ['nakyvyys', 'in', ['pelaaja', 'huoltaja']]]);
    const master = readFileSync(new URL('../TalentMaster_Master_v16.html', import.meta.url), 'utf8'); expect(master).toContain('M.tmMvLataaPelaajanKlipit(C.db(), C.seuraId(), p.id)'); expect(master).not.toMatch(/where\('pelaajaId', '==', p\.id\)\.where\('nakyvyys'/);   // Master käyttää samaa lukijaa
  });
});

describe('Muoto: ei uusia kenttiä, vain tokenit', () => {
  it('CSS: ei hex- tai rgb-värejä', () => { expect(P.tmKtPolkuCss()).not.toMatch(/#[0-9a-fA-F]{3,8}\b|rgba?\(/); });
  it('lib ei kirjoita Firestoreen (ei set/update/add) eikä uusia kenttänimiä', () => { const s = readFileSync(new URL('../lib/tm_kt_polku.js', import.meta.url), 'utf8'); expect(s).not.toMatch(/\.(set|update|add|delete)\(/); });
  it('kaikki FI-avaimet ovat ktp_-etuliitteisiä ja käytössä', () => {
    const s = readFileSync(new URL('../lib/tm_kt_polku.js', import.meta.url), 'utf8'); for (const k of Object.keys(P.FI)) { expect(k).toMatch(/^ktp_/); expect(lkm(s, "'" + k + "'") + lkm(s, k + ':'), k).toBeGreaterThan(1); }
  });
});
