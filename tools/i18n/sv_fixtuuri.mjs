/* QG-1 · sv-läpiajon synteettinen fixture-seura "QG FC" (seuraId qgfx). EI tuotantodataa (repo on julkinen): keksityt, neutraalit nimet.
   Ajetaan OIKEILLA sivuilla: Firebase-SDK korvataan muistissa toimivalla tyngällä (sv_fixtuuri_firebase.js), joten sovellusten omat
   kirjautumis- ja latauspolut ajetaan tällä datalla. Kattaa tilat, joita sovellusten demo-data ei näytä (viikon 44 aukot):
   käynnissä oleva jakso osineen, ydinvahvuus + tukiosa, pelaajan sitoumus q1–q3, kehityskaari ≥2 mittauksella, kertymä,
   kalenteri + kalenteritilaus, VP Kodin kooste, pelaajaraportti. Kello = läpiajon kiinteä 14.10.2026 klo 10 (ke).
   Fixturen arvot ovat dataa, eivät käyttöliittymätekstiä: siksi nimet ja vapaat tekstit on valittu niin, ettei suomen tunnistin osu niihin. */
import { createRequire } from 'module';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';
const require = createRequire(import.meta.url);
const JUURI = join(dirname(fileURLToPath(import.meta.url)), '..', '..');

export const NYT = Date.parse('2026-10-14T10:00:00+03:00');
const PV = 86400000, iso = (ms) => new Date(ms).toISOString(), pvm = (ms) => iso(ms).slice(0, 10), ts = (ms) => ({ __ts: iso(ms) });
const S = 'qgfx', J = 'qgfx_u13', SP = 'seurat/' + S;
const ALKOI = '2026-10-12T08:00:00.000Z';   // jakso alkoi ma 12.10. → viikko 1 (sitoumus näkyy myös Tänään-näkymässä)

const kertyma = (() => {
  const H = require(join(JUURI, 'lib/tm_harjoituskertyma.js'));
  const ms = (d, h) => Date.parse(d + 'T' + h + ':00+03:00');
  const ev = (id, d, o) => Object.assign({ id, tyyppi: 'harjoitus', pvm: d, _alkaaMs: ms(d, '17:30'), _paattyyMs: ms(d, '19:00'), joukkue: 'QG U13', joukkueet: [J], poistettu: false }, o || {});
  const t = [], la = {};
  for (let i = 0; i < 8; i++) { const d = '2026-09-' + String(14 + i * 2).padStart(2, '0'); t.push(ev('t' + i, d)); la['t' + i] = { tila: i === 5 ? 'poissa' : 'paikalla', syy: 'sairas' }; }
  t.push(ev('am', '2026-10-07', { alalaji: 'aamutreeni' })); la.am = { tila: 'paikalla' };
  t.push(ev('ot', '2026-10-10', { tyyppi: 'ottelu' })); la.ot = { tila: 'paikalla' };
  return H.tmKertyma({ tapahtumat: t, lasnaolot: la, kirjaukset: [{ pvm: '2026-10-05', tyyppi: 'T', tehty: true, kesto_min: 20 }, { pvm: '2026-10-08', tyyppi: 'S', tehty: true }, { pvm: '2026-10-11', tyyppi: 'T', tehty: true, kesto_min: 15 }], nyt: NYT });
})();

const kal = (id, tyyppi, paiva, klo, o) => { const a = Date.parse(paiva + 'T' + klo + ':00+03:00'); return Object.assign({ id, tyyppi, nimi: tyyppi === 'ottelu' ? 'QG U13 – BK' : 'QG U13', alkaa: a, paattyy: a + 90 * 60000, joukkue: J, joukkueet: [J], paikka: 'Arena 2' }, o || {}); };
const TAPAHTUMAT = [kal('e1', 'harjoitus', '2026-10-14', '17:30'), kal('e2', 'harjoitus', '2026-10-15', '17:30'), kal('e3', 'ottelu', '2026-10-17', '11:00'), kal('e4', 'harjoitus', '2026-10-19', '17:30', { peruttu: true }), kal('e5', 'testi', '2026-10-21', '17:00')];

const PERUS = { seuraId: S, sukupuoli: 'M', syntymaVuosi: 2013, joukkue: 'QG U13', joukkueet: [J], joukkueNimi: 'QG U13', suostumusTila: 'annettu', isDemoUser: false, huoltajaEmail: 'guardian@example.test', pelipaikka: 'KH' };
/* Pääpelaaja: käynnissä oleva jakso osineen + tukiosa + ydinvahvuus alueineen + mittaushistoria (kehityskaari ≥2) + ADAR + sitoumus (ks. idp_kausi) */
export const ALEX = Object.assign({ etunimi: 'Alex', sukunimi: 'Berg' }, PERUS, {
  jaksofokus: { konsepti_avain: 'y_h1', konsepti_nimi: 'Haltuunotto', alkoi: ALKOI, kesto_vk: 6, lahde: 'valmentaja', domeeni: 'teknis_taktinen', tila: 'kaynnissa',
    osa_arviot: { y_h1: { a: 3, b: 2 } }, osa_havainnot: { y_h1: { a: { fxv: { arvo: 3, pvm: '2026-10-13', rooli: 'valmentaja' } } } },
    tukiosa: { alue: 'Kehon hallinta', harjoitteet: [] } },
  jaksofokus_historia: [{ konsepti_avain: 'y_p1', konsepti_nimi: 'Peli kapeassa tilassa', alkoi: '2026-08-17', paattyi: '2026-09-27', lause: '', tulos: 'jatka', sulkutapa: 'suljettu', suljettu: '2026-09-27T10:00:00.000Z' }],
  ydinvahvuus: { kuvaus: 'Ensimmäinen kosketus', alue: 'ensimmainen_kosketus', alue_avain: 'ensimmainen_kosketus' },
  hh_pvm: '2026-10-04', hh_viimeisin: { lin30m: 4.62, cmj: 31, kasirata: 8.6 },
  hh_historia: [{ pvm: '2025-09-10', lin30m: 4.95, cmj: 27, kasirata: 9.2 }, { pvm: '2026-04-12', lin30m: 4.78, cmj: 29, kasirata: 8.9 }, { pvm: '2026-10-04', lin30m: 4.62, cmj: 31, kasirata: 8.6 }],
  tki_pvm: '2026-10-04', tki_viimeisin: 41, tk_lajit_viimeisin: { kuljetus_laukaus_s: 13.9, pujottelu_s: 24.1, ponnauttelu_s: 32.0, syotto_s: 45.0 },
  tki_historia: [{ pvm: '2026-04-12', kuljetus_laukaus_s: 14.8, pujottelu_s: 25.4, ponnauttelu_s: 33.5, syotto_s: 47.9 }, { pvm: '2026-10-04', kuljetus_laukaus_s: 13.9, pujottelu_s: 24.1, ponnauttelu_s: 32.0, syotto_s: 45.0 }],
  adar_viimeisin: { a: 2.5, d: 2, ac: 2, r: 2, yht: 2.1, pvm: '2026-10-12' }, adar_edellinen: { a: 2, d: 2, ac: 1.5, r: 2 }, adar_havaintoja: 4, adar_arvioijia: 2,
  flei_viimeisin: 62, flei_pvm: '2026-10-04', flei_historia: [{ pvm: '2026-04-12', flei: 57 }, { pvm: '2026-10-04', flei: 62 }], sbl: 2.3, sfl: 2.2, ll: 2.0, diag: 1.7, dfl: 2.2,
  biologinenIka_viimeisin: { phv_tila_koodi: 'LAH', phv_ika: 13.6, maturity_offset: -0.6, pvm: '2026-09-02', kasvutahti_cm_v: 6.8 }, phv_tila: 'LAH',
  streak: 4,
});
/* Toinen pelaaja: jakso käynnissä, EI sitoumusta (sitoumuslomake q1–q3 tyhjänä) */
export const KIM = Object.assign({ etunimi: 'Kim', sukunimi: 'Lund' }, PERUS, { sukupuoli: 'N', huoltajaEmail: 'guardian2@example.test',
  jaksofokus: { konsepti_avain: 'y_h4', konsepti_nimi: 'Harhauttaminen', alkoi: ALKOI, kesto_vk: 6, lahde: 'valmentaja', domeeni: 'teknis_taktinen', tila: 'kaynnissa', tukiosa: { alue: 'Nopeus' } },
  hh_historia: [{ pvm: '2026-04-12', lin30m: 4.9 }, { pvm: '2026-10-04', lin30m: 4.8 }], hh_viimeisin: { lin30m: 4.8 }, hh_pvm: '2026-10-04' });
/* Kolmas: tyhjä (ei jaksoa, ei mittauksia) — tyhjät tilat */
export const ROBIN = Object.assign({ etunimi: 'Robin', sukunimi: 'Ek' }, PERUS, { syntymaVuosi: 2014, huoltajaEmail: 'guardian3@example.test' });

const SITOUMUS = { itsearvio: { q1: 'Ball control', q2: 'More touches', q3: '' }, rekisteri: 'pelaaja', fokus_nimi: 'Haltuunotto', jakso_alkoi: ALKOI, sitoumus_pvm: '2026-10-12T15:00:00.000Z' };
const TAVOITE = { status: 'aktiivinen', luotu: '2026-08-20T10:00:00.000Z', fokus: { nimi: 'Haltuunotto' }, pelaajan_tavoite: 'Ball control', mittari: { yksikko: 's' }, lahto: { arvo: 14.8, pvm: '2026-04-12' }, tavoitearvo: 13.5, aikaraami: { kausi: 'syksy 2026' } };

/* VP Koti -kooste (seurat/{sid}/kooste/{ISO-vk}, functions/tm_seuran_kooste.js:n muoto): neljä viikkoa, U13:lla joukkuejakso (jakso_nimi = teema kuten palvelin kirjoittaa). */
const KOOSTE_VKOT = ['2026-W39', '2026-W40', '2026-W41', '2026-W42'];
const koosteJ = (nimi, n, jakso, i) => ({ nimi, ikavaihe: 'rakentaja', tyyppi: 'kilpa', profiili: 'oto', jakso, n_pelaajat: n, n_jaksolla: jakso ? n : 0, n_valinta_odottaa: jakso ? 1 : 0, n_katselmus: 0, n_vastanneet: jakso ? 1 : 0, n_vastausperusta: jakso ? n : 0,
  n_katselmus_ajallaan: 0, n_katselmus_perusta: 0, n_suostumus: n, n_kirjautunut_30: n - 1, n_huoltaja_30: 1, n_aktiivinen_7: Math.max(1, n - 1 - (3 - i)), n_aktiivinen_30: n - 1, n_toiminto_7: 1 + i, n_perhe_kuittaus_7: i % 2, n_harjoite_7: 2 + i, n_harjoite_30: 6 + i, jakso_nimi: jakso ? 'Haltuunotto' : null });
const kooste = (vk, i) => ({ vk, versio: 5, laskettu: ts(NYT - (3 - i) * 7 * PV - 2 * PV), yhteensa: { n_pelaajat: 5, n_ilman_joukkuetta: 0, n_suostumus: 5, n_kirjautunut_30: 4, n_huoltaja_30: 2, n_aktiivinen_7: 2 + (i > 1 ? 1 : 0), n_aktiivinen_30: 4, n_toiminto_7: 2 + i, n_perhe_kuittaus_7: i % 2, n_harjoite_7: 3 + i, n_harjoite_30: 9 + i },
  joukkueet: { [J]: koosteJ('QG U13', 3, true, i), qgfx_u15: koosteJ('QG U15', 2, false, i) } });

export function dokit() {
  const D = {
    [SP]: { nimi: 'QG FC', kieli: 'sv', paketti: 'pro', liput: { kentta: true, valmentaja_v2: true, kehitystyopoyta_v2: true } },
    [SP + '/liput/julkiset']: { kentta: true, valmentaja_v2: true, kehitystyopoyta_v2: true },
    [SP + '/joukkueet/' + J]: { nimi: 'QG U13', ika: 'U13', ikaluokka: 'U13', valmentajat: ['fxv'], jaksofokus: { konsepti_avain: 'y_h1', konsepti_nimi: 'Haltuunotto', alkoi: ALKOI, kesto_vk: 6, tila: 'kaynnissa' } },
    [SP + '/joukkueet/qgfx_u15']: { nimi: 'QG U15', ika: 'U15', ikaluokka: 'U15' },
    [SP + '/kayttajat/fxv']: { rooli: 'valmentaja', joukkueet: [J], joukkue: 'QG U13', etunimi: 'Sam', sukunimi: 'Holm', email: 'coach@example.test', seuraId: S, aktiivinen: true },
    [SP + '/kayttajat/fxvp']: { rooli: 'vp', etunimi: 'Jo', sukunimi: 'Strand', email: 'vp@example.test', seuraId: S, aktiivinen: true },
    [SP + '/pelaajat/qp1']: ALEX, [SP + '/pelaajat/qp2']: KIM, [SP + '/pelaajat/qp3']: ROBIN,
    [SP + '/pelaajat/qp1/idp_kausi/2026']: { tavoitteet: [TAVOITE], pelaaja_sitoumus: SITOUMUS },
    [SP + '/pelaajat/qp1/kirjaukset/2026-10-13']: { pvm: '2026-10-13', tyyppi: 'T', tehty: true, kesto_min: 20, fiilinki: 4, luotu: ts(NYT - PV) },
    [SP + '/pelaajat/qp1/viikkokatsaukset/2026-10-11']: { vk: 1, jakso_alkoi: ALKOI, vastaukset: [], lause: 'Good week.' },
    [SP + '/viestit/m1']: { tyyppi: 'viesti', pelaajaId: 'qp1', nakyvyys: 'pelaaja', teksti: 'Nice work!', fromNimi: 'Sam H.', lahettajaUid: 'fxv', aika: NYT - 2 * PV, luotu: ts(NYT - 2 * PV) },
    [SP + '/kehityskooste/' + J]: { paivitetty: ts(NYT - PV) },
  };
  for (const e of TAPAHTUMAT) D[SP + '/kalenteri/' + e.id] = e;
  KOOSTE_VKOT.forEach((vk, i) => { D[SP + '/kooste/' + vk] = kooste(vk, i); });
  D[SP + '/pelaajat/qp4'] = Object.assign({}, ROBIN, { etunimi: 'Noa', sukunimi: 'Dahl', joukkue: 'QG U15', joukkueet: ['qgfx_u15'], joukkueNimi: 'QG U15', syntymaVuosi: 2011, huoltajaEmail: 'guardian4@example.test' });
  return D;
}

export const CALLABLET = {
  haePelaajanKertyma: { kertyma },
  haePelaajanKalenteri: { tapahtumat: TAPAHTUMAT, laskettu: NYT },
  haeVanhemmanKalenteri: { tapahtumat: TAPAHTUMAT, laskettu: NYT },
  haeKalenteriTilausTila: { aktiivinen: false },
  haeLapsiHuoltajalle: { lapset: [{ seura: S, uid: 'qp1', etunimi: 'Alex', sukunimi: 'Berg', seuraNimi: 'QG FC' }] },
};

/* Sisäänkäynnit: kuka on kirjautunut (claims + Auth-käyttäjä). Sovellus ajaa oman kirjautumispolkunsa näillä. */
export const ROOLIT = {
  pelaaja: (pid) => ({ claims: { rooli: 'pelaaja', pelaajaSeuraId: S, pelaajaId: pid || 'qp1' }, kayttaja: { uid: 'pl-' + (pid || 'qp1') } }),
  huoltaja: () => ({ claims: {}, kayttaja: { uid: 'fxh', email: 'guardian@example.test' } }),
  valmentaja: () => ({ claims: { seuraId: S, rooli: 'valmentaja' }, kayttaja: { uid: 'fxv', email: 'coach@example.test' } }),
  vp: () => ({ claims: { seuraId: S, rooli: 'vp' }, kayttaja: { uid: 'fxvp', email: 'vp@example.test' } }),
};
export const fxKonfiguraatio = (rooli, pid) => Object.assign({ dokit: dokit(), callablet: CALLABLET }, ROOLIT[rooli](pid));

/* Sivun valmistelu fixture-ajoon (Playwright page): data window.__FX:ään ennen sivun skriptejä, gstatic-SDK → tynkä,
   Firebase-taustapalvelut, Sentry ja kaikki muu ulkoverkko estetään (ei kirjoituksia minnekään, ei tuotantoa). Paikalliset tiedostot ja
   staattiset CDN-kirjastot (cdnjs) sallitaan. Palauttaa listan estetyistä pyynnöistä (diagnostiikka). */
import { readFileSync } from 'fs';
const TYNKA = readFileSync(join(JUURI, 'tools/i18n/sv_fixtuuri_firebase.js'), 'utf8');
export async function valmisteleFx(page, fx) {
  const estetyt = [];
  await page.addInitScript((c) => { window.__FX = c; }, fx);
  await page.route(/^https?:\/\//, (r) => {
    const u = r.request().url();
    if (/gstatic\.com\/firebasejs\/[^/]+\/firebase-app-compat\.js/.test(u)) return r.fulfill({ contentType: 'application/javascript', body: TYNKA });
    if (/gstatic\.com\/firebasejs\//.test(u) || /sentry-cdn\.com/.test(u)) return r.fulfill({ contentType: 'application/javascript', body: '' });
    if (/fonts\.(googleapis|gstatic)\.com/.test(u)) return r.fulfill({ contentType: 'text/css', body: '' });
    if (/^https:\/\/cdnjs\.cloudflare\.com\//.test(u)) return r.continue();
    estetyt.push(u); return r.abort();
  });
  return estetyt;
}
