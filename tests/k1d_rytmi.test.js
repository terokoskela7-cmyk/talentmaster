/**
 * K1d (Tero 20.10.2026) · YHTEENVETORYTMI: jakson yhteenveto nollaa rytmin; ilmoitus vain kun siitä on hyötyä, aina syyn ja päivän kanssa; "Miksi näen tämän?".
 * Oikeat libit (tm_rytmi, tm_eerikkila_normit.laskeReviewKadenssi, tm_seuraava_askel, tm_tanaan_signaali, tm_kehityssilmukka, tm_kevyt_katselmus, tm_kt_polku). Fixturet keksittyjä (Topias-tyyppinen tapaus: jakso 19.10.–30.11.).
 * Päivät kalenteripäivinä (paikallinen päivä): testit toimivat UTC:ssä ja Helsingissä.
 */
import { describe, it, expect } from 'vitest';
import { createRequire } from 'module';
const require = createRequire(import.meta.url);
const N = require('../lib/tm_eerikkila_normit.js'), R = require('../lib/tm_rytmi.js'), SL = require('../lib/tm_kehityssilmukka.js'), SA = require('../lib/tm_seuraava_askel.js'), TS = require('../lib/tm_tanaan_signaali.js');
const KK = require('../lib/tm_kevyt_katselmus.js'), IDP = require('../lib/tm_idp.js'), JF = require('../lib/tm_jaksofokus.js'), PHV = require('../lib/tm_phv_tila.js');
const nyt = (y, k, p, h = 22) => new Date(y, k - 1, p, h, 8).getTime();
const NYT = nyt(2026, 10, 20);                                   // 20.10.2026 klo 22.08 (Teron testihetki)
const jakso = (alku, vk, o = {}) => Object.assign({ konsepti_avain: 'y_h2', konsepti_nimi: 'Syöttäminen', domeeni: 'teknis_taktinen', alkoi: new Date(alku[0], alku[1] - 1, alku[2], 9).toISOString(), kesto_vk: vk }, o);
const TOPIAS = (o = {}) => Object.assign({ id: 'p', etunimi: 'Topias', syntymaVuosi: 2013, jaksofokus: jakso([2026, 10, 19], 6) }, o);   // 13 v → 42 pv; jakso 19.10.–30.11.
const KESKEN = (o = {}) => TOPIAS(Object.assign({ jaksofokus: jakso([2026, 10, 5], 6) }, o));   // jakso vk 3/6 (5.10.–16.11.): ei vk 1 -signaalia (sitoumus odottaa)

describe('1 · jakson yhteenveto kirjoittaa rytmin (sama funktio kuin kehityskeskustelu)', () => {
  it('tmSuljeJakso palauttaa pikakentat = tmKirjaaKatselmus(tyyppi "jakso").pikakentat; opts.pvm = sulkupäivä', () => {
    const p = TOPIAS(), v = SL.tmSuljeJakso(p, { harjoituksia: 3 }, { nytISO: new Date(2026, 10, 30, 9).toISOString(), pvm: '2026-11-30' });
    expect(v.pikakentat).toEqual({ review_viimeisin_pvm: '2026-11-30', review_viimeisin_tyyppi: 'jakso' });
    expect(v.pikakentat).toEqual(SL.tmKirjaaKatselmus(p, { pvm: '2026-11-30', tyyppi: 'jakso' }).pikakentat);
    expect(v.historiaLisays[0]).toMatchObject({ sulkutapa: 'suljettu' });
  });
  it('ilman opts.pvm: nytISO:n paikallinen päivä; aiempaa myöhäisempi review_viimeisin_pvm säilyy (ei vanhene)', () => {
    const iso = new Date(2026, 9, 20, 23, 30).toISOString();
    expect(SL.tmSuljeJakso(TOPIAS(), {}, { nytISO: iso }).pikakentat.review_viimeisin_pvm).toBe('2026-10-20');
    expect(SL.tmSuljeJakso(TOPIAS({ review_viimeisin_pvm: '2026-11-05' }), {}, { nytISO: iso }).pikakentat).toEqual({});
  });
  it('kevyt jakson yhteenveto (tmKkTallennus) välittää pikakentat; reviewit-dokumentti ilman tyyppiä; tmKkTallennus ei kirjoita muuta', () => {
    const p = TOPIAS(), S = KK.tmKkAlku(p, { nimi: 'Topias', profiili: 'oto' }); S.kevyt = { nakyi: 'ohjatusti', treeni: 'usein', mukana: 'hyvin' };
    const x = KK.tmKkTallennus(p, S, { nytISO: new Date(2026, 10, 30, 9).toISOString(), pvm: '2026-11-30', alkoi: '2026-10-19', loppu: '2026-11-30' });
    expect(x.ok).toBe(true); expect(x.pikakentat).toEqual({ review_viimeisin_pvm: '2026-11-30', review_viimeisin_tyyppi: 'jakso' });
    expect(Object.keys(x.reviewitData).sort()).toEqual(['kevyt', 'kevyt_tallennettu']);
  });
  it('rytmi nollautuu: kirjoitettu pikakenttä → edellinenPv 0, eräpäivä +42 pv', () => {
    const v = SL.tmSuljeJakso(TOPIAS({ review_viimeisin_pvm: '2026-08-01' }), {}, { nytISO: new Date(2026, 9, 20, 9).toISOString(), pvm: '2026-10-20' });
    const r = N.laskeReviewKadenssi(Object.assign(TOPIAS({ jaksofokus: null }), v.pikakentat), NYT);
    expect(r).toMatchObject({ status: 'ajantasalla', viimeisinPvm: '2026-10-20', tyyppi: 'jakso', eraantyyPvm: '2026-12-01', edellinenPv: 0, valiPv: 42 });
  });
});

describe('2 · ilmoitus vain kun siitä on hyötyä (laskeReviewKadenssi / tmRytmi)', () => {
  it('Topias-tapaus: edellinen yhteenveto = jakson alku 19.10. (viimeisin suljettu jakso), jakso 19.10.–30.11. → ei ilmoitusta', () => {
    const p = TOPIAS({ jaksofokus_historia: [{ sulkutapa: 'suljettu', suljettu: new Date(2026, 9, 19, 9).toISOString(), konsepti_nimi: 'Edellinen' }] });
    const r = N.laskeReviewKadenssi(p, NYT);
    expect(r.status).toBe('ajantasalla'); expect(r).toMatchObject({ eraantyyPvm: '2026-11-30', viimeisinPvm: '2026-10-19', tyyppi: 'jakso', edellinenPv: 1 });
    expect(SA.tmSeuraavaAskel(p, { nyt: NYT, deps: { laskeReviewKadenssi: N.laskeReviewKadenssi, jaksoUmpeutunut: JF.tmJfUmpeutunut } }).avain).not.toMatch(/^review_/);
  });
  it('jakso käynnissä ja päättyy VIIMEISTÄÄN eräpäivänä → ei erääntymässä (raakaStatus säilyy)', () => {
    const p = TOPIAS({ review_viimeisin_pvm: '2026-09-20', jaksofokus: jakso([2026, 10, 19], 2) });   // eräpäivä 1.11., jakso päättyy 2.11. → ulkona; testataan rajalla alla
    const p2 = TOPIAS({ review_viimeisin_pvm: '2026-09-21', jaksofokus: jakso([2026, 10, 19], 2) });  // eräpäivä 2.11. = jakson loppu → kattaa
    expect(N.laskeReviewKadenssi(p, NYT).status).toBe('eraantymassa');
    const r = N.laskeReviewKadenssi(p2, NYT); expect(r).toMatchObject({ status: 'ajantasalla', raakaStatus: 'eraantymassa', jaksoHoitaa: true, eraantyyPvm: '2026-11-02' });
  });
  it('jakso käynnissä mutta päättyy eräpäivän JÄLKEEN → ilmoitus, kortissa molemmat päivät ja kaksi vaihtoehtoa', () => {
    const p = KESKEN({ review_viimeisin_pvm: '2026-09-10' });   // eräpäivä 22.10., jakso päättyy 16.11.
    const r = N.laskeReviewKadenssi(p, NYT); expect(r).toMatchObject({ status: 'eraantymassa', jaksoHoitaa: false, eraantyyPvm: '2026-10-22', ylimaaraPv: -2, edellinenPv: 40, valiPv: 42, ika: 13 }); expect(r.jakso).toMatchObject({ kaynnissa: true, loppuPvm: '2026-11-16' });
    const askel = SA.tmSeuraavaAskel(p, { nyt: NYT, deps: { laskeReviewKadenssi: N.laskeReviewKadenssi, jaksoUmpeutunut: JF.tmJfUmpeutunut } });
    expect(askel.avain).toBe('review_eraantymassa'); expect(askel.peruste).toMatchObject({ eraantyyPvm: '2026-10-22', edellinenPv: 40, valiPv: 42, ika: 13, jakso: { loppuPvm: '2026-11-16' } });
    const s = TS.tmTanaanSignaali(p, { nyt: NYT, rooli: 'vp', askel, keskustelu: true, nimi: 'Topias' }).ensisijainen;
    expect(s.avain).toBe('rytmi'); expect(s.teksti).toBe('Jakson yhteenveto tai kehityskeskustelu viimeistään 22.10.');
    expect(s.selitys).toEqual(['Edellisestä yhteenvedosta tai keskustelusta 40 pv. 13-vuotiaalle 42 päivän välein.', 'Jakso päättyy 16.11. Tee jakson yhteenveto tai pidä kehityskeskustelu ennen 16.11.']);
    expect(s.nappi).toEqual({ avain: 'sulje', teksti: 'Tee jakson yhteenveto' }); expect(s.napit).toEqual([{ avain: 'kirjaa_keskustelu', teksti: 'Kirjaa kehityskeskustelu' }]);
  });
  it('ei jaksoa → ilmoitus kuten ennen, mutta selkeänä (otsikko + selitys, ei jaksoriviä, ei "Tee jakson yhteenveto" -nappia); myöhässä: "… myöhässä {n} pv"', () => {
    const p = TOPIAS({ jaksofokus: null, review_viimeisin_pvm: '2026-08-01' });   // eräpäivä 12.9. → myöhässä 38 pv
    const r = N.laskeReviewKadenssi(p, NYT); expect(r).toMatchObject({ status: 'myohassa', ylimaaraPv: 38, eraantyyPvm: '2026-09-12' });
    const askel = SA.tmSeuraavaAskel(p, { nyt: NYT, deps: { laskeReviewKadenssi: N.laskeReviewKadenssi } }); expect(askel.avain).toBe('review_myohassa');
    const s = TS.tmTanaanSignaali(p, { nyt: NYT, rooli: 'vp', askel, keskustelu: true }).ensisijainen;
    expect(s.avain).toBe('rytmi_myohassa'); expect(s.teksti).toBe('Jakson yhteenveto tai kehityskeskustelu myöhässä 38 pv'); expect(s.selitys).toHaveLength(1); expect(s.nappi).toEqual({ avain: 'kirjaa_keskustelu', teksti: 'Kirjaa kehityskeskustelu' }); expect(s.napit).toEqual([]);
  });
  it('"Kirjaa kehityskeskustelu" vain jos kuori tarjoaa toiminnon (ctx.keskustelu); valmentajan (oto/ei-johto) näkymässä rytmi-ilmoitusta ei nosteta (D50)', () => {
    const p = KESKEN({ review_viimeisin_pvm: '2026-09-10' }), askel = SA.tmSeuraavaAskel(p, { nyt: NYT, deps: { laskeReviewKadenssi: N.laskeReviewKadenssi, jaksoUmpeutunut: JF.tmJfUmpeutunut } });
    const ilman = TS.tmTanaanSignaali(p, { nyt: NYT, rooli: 'vp', askel }).ensisijainen; expect(ilman.napit).toEqual([]); expect(ilman.nappi.avain).toBe('sulje');
    expect(TS.tmTanaanSignaali(p, { nyt: NYT, rooli: 'valmentaja', askel }).ensisijainen.avain).not.toBe('rytmi');
  });
  it('ikä 9–11 v → 84 pv; ikä ≥ 12 v → 42 pv', () => {
    expect(N.laskeReviewKadenssi({ syntymaVuosi: 2016, review_viimeisin_pvm: '2026-10-01' }, NYT)).toMatchObject({ valiPv: 84, eraantyyPvm: '2026-12-24', ika: 10 });
    expect(N.laskeReviewKadenssi({ syntymaVuosi: 2013, review_viimeisin_pvm: '2026-10-01' }, NYT)).toMatchObject({ valiPv: 42, eraantyyPvm: '2026-11-12' });
  });
  it('kalenteripäivät: kellonsiirto (25.10.2026) ei siirrä eräpäivää; sama tulos klo 00:30 ja 23:30', () => {
    const p = { syntymaVuosi: 2013, review_viimeisin_pvm: '2026-09-20' };
    expect(R.tmRytmi(p, nyt(2026, 10, 24, 0), { ikakaista: 42, ika: 13 }).eraantyyPvm).toBe('2026-11-01'); expect(R.tmRytmi(p, nyt(2026, 11, 1, 23), { ikakaista: 42, ika: 13 })).toMatchObject({ status: 'eraantymassa', ylimaaraPv: 0 }); expect(R.tmRytmi(p, nyt(2026, 11, 2, 0), { ikakaista: 42, ika: 13 })).toMatchObject({ status: 'myohassa', ylimaaraPv: 1 });
  });
  it('ei yhtään yhteenvetoa/keskustelua → ei_reviewia (ei ilmoitusta, ei erääntymispäivää)', () => {
    const r = N.laskeReviewKadenssi(TOPIAS({ jaksofokus: null }), NYT); expect(r).toMatchObject({ status: 'ei_reviewia', eraantyyPvm: null, edellinenPv: null });
  });
  it('VP-status (laskeJoukkueReviewKooste) käyttää samaa sääntöä: jakson aikana ei erääntymässä jos jakso päättyy ajoissa', () => {
    const tapa = TOPIAS({ review_viimeisin_pvm: '2026-09-21', jaksofokus: jakso([2026, 10, 19], 2) }), myoh = TOPIAS({ review_viimeisin_pvm: '2026-09-10' }), jaksoton = TOPIAS({ jaksofokus: null, review_viimeisin_pvm: '2026-09-10' });
    const k = N.laskeJoukkueReviewKooste([tapa, myoh, jaksoton], NYT); expect(k).toMatchObject({ ajantasalla_n: 1, eraantymassa_n: 2, myohassa_n: 0, n: 3 });
  });
});

describe('3 · "Miksi näen tämän?" jokaiselle Seuraava askel -avaimelle ja jokaiselle signaalille', () => {
  const ASKELEET = ['kuorma_tarkista', 'review_myohassa', 'valinta_odottaa', 'ehdotus_odottaa', 'sitoumus', 'jakso_umpeutunut', 'ei_jaksofokusta', 'idp_jumissa', 'valitavoite_valmis', 'review_eraantymassa', 'havainto', 'yllapito'];
  it('MIKSI_ASKELET kattaa kaikki tmSeuraavaAskel-avaimet (lähde-skannaus) ja jokaisella on epätyhjä lause ilman jäännöspaikkoja', () => {
    const lahde = require('fs').readFileSync(new URL('../lib/tm_seuraava_askel.js', import.meta.url), 'utf8'), avaimet = new Set([...lahde.matchAll(/ulos\('([a-z_]+)'/g)].map((m) => m[1]));
    ASKELEET.forEach((a) => expect(avaimet.has(a), a).toBe(true)); expect([...avaimet].filter((a) => !TS.MIKSI_ASKELET.includes(a))).toEqual([]);
    TS.MIKSI_ASKELET.forEach((a) => { const t = TS.tmMiksi(a, { edellinenPv: 40, valiPv: 42, ika: 13, eraantyyPvm: '2026-10-22', paivia: 16, rytmi_pv: 14 }, { nyt: NYT, nimi: 'Topias' }); expect(t.length, a).toBeGreaterThan(10); expect(t, a).not.toMatch(/\{\w+\}/); });
  });
  it('rytmin lause kertoo päivät, välin, iän ja eräpäivän', () => {
    expect(TS.tmMiksi('review_eraantymassa', { edellinenPv: 40, valiPv: 42, ika: 13, eraantyyPvm: '2026-10-22' }, { nyt: NYT })).toBe('Edellisestä jakson yhteenvedosta tai kehityskeskustelusta on 40 pv, ja 13-vuotiaalle on sovittu 42 päivän väli. Eräpäivä on 22.10.');
  });
  it('jokainen signaali (kaikki askeleet × rooli) kantaa miksi-tekstin; HTML:ssä <details data-kt-miksi> "Miksi näen tämän?"', () => {
    const p = TOPIAS({ review_viimeisin_pvm: '2026-09-10' });
    for (const a of ASKELEET) for (const rooli of ['vp', 'valmentaja']) {
      const lista = TS.tmSignaalit(p, { nyt: NYT, rooli, askel: { avain: a, peruste: { edellinenPv: 40, valiPv: 42, ika: 13, eraantyyPvm: '2026-10-22', ylimaaraPv: 3, paivia: 15, rytmi_pv: 14 } } });
      lista.forEach((s) => { expect(s.miksi, a + '/' + rooli + '/' + s.avain).toBeTruthy(); expect(s.miksiOtsikko).toBe('Miksi näen tämän?'); });
    }
    const x = TS.tmTanaanSignaali(p, { nyt: NYT, rooli: 'vp', askel: { avain: 'yllapito', peruste: {} } }), h = TS.tmTanaanSignaaliHTML(x, { pid: 'p', toimiFn: 'f' });
    expect(h).toContain('data-kt-miksi'); expect(h).toContain('<summary>Miksi näen tämän?</summary>');
  });
});

describe('4 · Polku: rytmirivi, jakson yhteenveto -päivä, "yhteenveto tehty"', () => {
  const P = require('../lib/tm_kt_polku.js');
  const ctx = { nyt: NYT, tanaan: '2026-10-20', tila: { tila: 'kaynnissa', rivitila: { vk: { n: 1, yht: 6 } } }, kausi: { tila: 'ok', tavoite: null }, klipit: { tila: 'ok', dokit: [] } };
  it('rytmirivi Kauden yläpuolella: ajan tasalla + päivä; erääntymässä: "Seuraava yhteenveto tai kehityskeskustelu viimeistään {pvm}"; myöhässä: päivät + eräpäivä', () => {
    const h1 = P.tmKtPolkuHTML(TOPIAS({ jaksofokus_historia: [{ sulkutapa: 'suljettu', suljettu: new Date(2026, 9, 19, 9).toISOString(), konsepti_nimi: 'E', alkoi: '2026-09-01', paattyi: '2026-10-19' }] }), ctx);
    expect(h1).toContain('data-kt-rytmi="ajantasalla"'); expect(h1).toContain('Ajan tasalla · seuraava yhteenveto tai kehityskeskustelu viimeistään 30.11.'); expect(h1).toContain('yhteenveto tehty'); expect(h1).toContain('Jakson yhteenveto 30.11.');
    expect(P.tmKtPolkuHTML(TOPIAS({ review_viimeisin_pvm: '2026-09-10' }), ctx)).toContain('Seuraava yhteenveto tai kehityskeskustelu viimeistään 22.10.');
    expect(P.tmKtPolkuHTML(TOPIAS({ jaksofokus: null, review_viimeisin_pvm: '2026-08-01' }), Object.assign({}, ctx, { tila: { tila: 'ei_jaksoa' } }))).toContain('Yhteenveto tai kehityskeskustelu myöhässä 38 pv (eräpäivä 12.9.)');
    expect(P.tmKtPolkuHTML(TOPIAS({ jaksofokus: null }), Object.assign({}, ctx, { tila: { tila: 'ei_jaksoa' } }))).not.toContain('data-kt-rytmi');
  });
});

describe('5 · pelaajan Minä (brief 3) ja tm_idp_pelaaja', () => {
  const PK = require('../lib/tm_idp_pelaaja.js'), TK = require('../lib/tm_tanaan_kentta.js');
  const T0 = (o = {}) => Object.assign({ fokus: { nimi: 'Tasaisuus' }, status: 'aktiivinen', mittari: { yksikko: 'taso' }, arviot: [] }, o);
  it('Seuraava askel: neutraali "Muista tavoitteesi joka harjoituksessa: {fokus}." kaikille tavoitteille; "Aloitit tästä" ilman pelaajan ääntä: "Valmentaja asetti tavoitteen."; äänellä: nykyinen', () => {
    const a = PK.tmPelaajaKaari(T0()), b = PK.tmPelaajaKaari(T0({ pelaajan_tavoite: 'Haluan olla varmempi.' }));
    expect(a.seuraavaAskel).toEqual({ otsikko: 'Seuraava askel', teksti: 'Muista tavoitteesi joka harjoituksessa: Tasaisuus.' }); expect(a.pisteet[0]).toMatchObject({ otsikko: 'Aloitit tästä', teksti: 'Valmentaja asetti tavoitteen.' });
    expect(b.pisteet[0].teksti).toBe('Asetitte tavoitteen yhdessä valmentajan kanssa.'); expect(b.aani).toBe('Haluan olla varmempi.');
    expect(IDP.idpPelaajaKaari(T0()).seuraavaAskel.teksti).toBe(a.seuraavaAskel.teksti);   // tm_idp.js delegoi, API ennallaan
  });
  it('kaikki pelaajalle näkyvät tekstit käännösavaimilla: opts.t saa avaimen, sv-pelaaja ei näe suomea (testikäännös) eikä lukuja (§7.22)', () => {
    const t = (k) => '«' + k + '»', k = PK.tmPelaajaKaari(T0({ pelaajan_tavoite: 'x', arviot: [{ arvo: 2, pelaajan_arvio: 4, pelaajan_note: 'Onnistui' }, { arvo: 2.5, pelaajan_arvio: 4 }] }), { t }), kons = PK.tmPelaajaKonsepti(T0(), { t });
    const kaikki = JSON.stringify([k.pisteet, k.seuraavaAskel, k.kehu, kons]).replace(/\\u201d/g, '');
    expect(kaikki).not.toMatch(/[äöå]/i); expect(kaikki).toContain('«ip_seuraava_teksti»'); expect(kaikki).toContain('«ip_kehu»'); expect(kons.mietiKysymys).toBe('«ip_mieti»'); expect(k.seuraavaAskel.teksti).toBe('«ip_seuraava_teksti»');
    Object.keys(PK.FI).forEach((a) => expect(PK.FI[a], a).not.toMatch(/\d/));   // ei lukuja pelaajalle
  });
  it('Minä-sivun kaksi lohkoa: "Kauden tavoite: {kausitavoite}" ja "Nyt harjoittelet: {jakson aihe}" + tämän viikon fokus (sama lähde kuin Viikko-kortti); kausitavoite ≠ jakson aihe', () => {
    const jf = jakso([2026, 10, 19], 6, { konsepti_nimi: 'Syöttäminen' }), p = { jaksofokus: jf };
    const kaanon = (a) => (a === 'y_h2' ? { kpi: [{ teksti: 'Katso ennen syöttöä', koodi: 'k1' }, { teksti: 'Syötä oikealle jalalle', koodi: 'k2' }] } : null);
    const r = TK.tmMinaTavoiteRivit(p, { kausitavoite: 'Tasaisuus', tanaan: '2026-10-20', kaanon }, { esc: (x) => x });
    expect(r.kauden).toBe('Kauden tavoite: Tasaisuus'); expect(r.nyt).toBe('Nyt harjoittelet: Syöttäminen'); expect(r.nytHTML).toContain('data-k1-minajakso'); expect(r.nytHTML).toContain('Syöttäminen'); expect(r.nytHTML).toContain('data-k1-fokus-rivi'); expect(r.nytHTML).toMatch(/Tällä viikolla harjoittelet: /);
    expect(TK.tmMinaTavoiteRivit(p, { kausitavoite: null, tanaan: '2026-10-20', kaanon }, { esc: (x) => x }).kauden).toBeNull();   // ei kausitavoitetta → ei väitetä jakson aihetta kauden tavoitteeksi
    expect(TK.tmMinaTavoiteRivit({}, { kausitavoite: 'X', tanaan: '2026-10-20' }, {})).toMatchObject({ nyt: null, nytHTML: '' });
    expect(r.kauden + r.nyt + r.nytHTML).not.toMatch(/\bIDP\b|Fokus:|Kausitavoite &/);   // vanha otsikko "Kausitavoite & jaksofokus · Fokus: X" pois
  });
  it('idpEdistymaNayta: tallennettu "review N" näytetään "kehityskeskustelu N" (data ennallaan); muu teksti sellaisenaan', () => {
    expect(IDP.idpEdistymaNayta('review 3')).toBe('kehityskeskustelu 3'); expect(IDP.idpEdistymaNayta('42 %')).toBe('42 %'); expect(IDP.idpEdistymaNayta(null)).toBe(''); expect(IDP.idpEdistymaNayta('review 2', (x) => x.toUpperCase())).toBe('KEHITYSKESKUSTELU 2');
    expect(IDP.idpEdistyma({ arviot: [{}, {}], mittari: { yksikko: 'vapaa' } })).toBe('review 2');
  });
});

describe('6 · ADAR-nimikanoni (Tero 20.10.): Havainnointi · Päätöksenteko · Toteutus · Reagointi', () => {
  it('TM_ADAR_NIMET kummallekin roolille; tmAdarNimet-fi sama; varanimet (Master/VP/Pelaaja/kaari/Näyttö) vastaavat', () => {
    const Y = require('../lib/tm_pelialy_yksilo.js'), odotettu = { a: 'Havainnointi', d: 'Päätöksenteko', ac: 'Toteutus', r: 'Reagointi' };
    expect(Y.TM_ADAR_NIMET.valmentaja).toEqual(odotettu); expect(Y.TM_ADAR_NIMET.pelaaja).toEqual(odotettu); expect(Y.tmAdarNimet('valmentaja')).toEqual(odotettu);
    const fs = require('fs'); for (const f of ['lib/tm_kehityskaari.js', 'lib/tm_naytto_lohkot.js', 'TalentMaster_VP_v25.html', 'TalentMaster_Pelaaja_v7.html']) expect(fs.readFileSync(new URL('../' + f, import.meta.url), 'utf8'), f).toContain("{ a: 'Havainnointi', d: 'Päätöksenteko', ac: 'Toteutus', r: 'Reagointi' }");
    expect(require('../lib/tm_adar_tekstit.js').FI).toMatchObject({ adar_partitiivi_r: 'reagointia', adar_R_tip2: 'Sovi yhteinen reagointitapa, esim. taputus ja seuraava tehtävä.' });
    expect(require('../lib/tm_lang.js').TM_LANG.fi.pelaaja.adar_nimi_pelaaja_r).toBe('Reagointi');
  });
});
