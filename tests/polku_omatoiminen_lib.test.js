/* PR E: Polku-rivi "Omatoiminen tällä viikolla" — lib (tmKtPolkuOmatoiminen + renderöinti), sivun laiska moottorilataus, sv-erä 105 (sv tyhjä: Code ei kirjoita ruotsia, §0). */
import { describe, it, expect } from 'vitest';
import { readFileSync } from 'fs';
import { createRequire } from 'module';
const require = createRequire(import.meta.url);
const P = require('../lib/tm_kt_polku.js'), AJ = require('../lib/tm_aloita_jakso.js'), HL = require('../harjoitelogiikka_v4.js'), FI = P.FI;
const teksti = (f) => readFileSync(new URL('../' + f, import.meta.url), 'utf8');
const NYT = new Date('2026-10-19T09:00:00+03:00'), TANAAN = '2026-10-19';
const esc = (s) => String(s == null ? '' : s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
const JF = { konsepti_avain: 'y_h1', konsepti_nimi: 'Ensimmäinen kosketus', alkoi: '2026-10-03', kesto_vk: 6, domeeni: 'teknis_taktinen' };
const KAANON = () => ({ kpi: ['Käännä pää ennen vastaanottoa', 'Vastaanotto poispäin paineesta', 'Ensimmäinen syöttö eteenpäin'].map((teksti, i) => ({ teksti, koodi: 'abc'[i] })) });
const pel = (o) => Object.assign({ id: 'p2', etunimi: 'Bertta', sukunimi: 'Bergh', syntymaVuosi: 2013, seuraId: 'kpv', luotu: '2026-03-01', suostumusTila: 'annettu', joukkue: 'Demo U13', joukkueet: ['demo_u13'], jaksofokus: JF }, o || {});
const H = (o) => Object.assign({ nimi: 'Seuran seinäpeli', tyyppi: 'T', lahde: 'seura', tila: 'hyvaksytty', kaytto: 'koti', konsepti: 'y_h1', ohje: 'o', kesto_min: 10 }, o || {});
const PANKKI = (r) => ({ seuraId: 'kpv', harjoitteet: r });
const omat = (p, pankki, nimi) => P.tmKtPolkuOmatoiminen(p, { valitse: HL.valitsePaivanHarjoite, seuraPankki: pankki, seuranNimi: nimi, kaanon: KAANON, tanaan: TANAAN });
const ctx = (p, om) => ({ esc, t: (k) => k, kaanon: KAANON, tila: AJ.tmJaksoTila(p, { nyt: NYT }), nyt: NYT, tanaan: TANAAN, nimi: 'Bertta Bergh', voiKirjoittaa: true, kausi: { tila: 'ok', tavoite: null }, klipit: { tila: 'ok', dokit: [] }, omatoiminen: om });
const html = (p, om) => P.tmKtPolkuHTML(p, ctx(p, om));

describe('tmKtPolkuOmatoiminen: sama valinta kuin Kenttä', () => {
  it('ei pankkia → testidata (lahde tm); seuran rivi → lahde seura + seuran nimi; osa mukaan', () => {
    const a = omat(pel(), null, 'KPV'); expect(a).toMatchObject({ lahde: 'tm', lahdeNimi: null, jaksosta: false }); expect(a.nimi).toBeTruthy();
    expect(omat(pel(), PANKKI([H()]), 'KPV')).toMatchObject({ nimi: 'Seuran seinäpeli', lahde: 'seura', lahdeNimi: 'KPV', jaksosta: true, osa: null });   // yhteensä sama kuin HL suoraan
    expect(omat(pel(), PANKKI([H(), H({ nimi: 'Osa A', konsepti_osa: 'a' })]), 'KPV')).toMatchObject({ nimi: 'Osa A', osa: 'a' });
  });
  it('sama tulos kuin valitsePaivanHarjoite suoraan (yksi valinta kaikkialla)', () => {
    const p = pel(), pankki = PANKKI([H({ nimi: 'Osa A', konsepti_osa: 'a' })]);
    expect(omat(p, pankki, 'KPV').nimi).toBe(HL.valitsePaivanHarjoite(p, null, TANAAN, pankki, { viikonOsa: 'a' }).nimi);
    expect(omat(p, null, null).nimi).toBe(HL.valitsePaivanHarjoite(p, null, TANAAN, null, { viikonOsa: 'a' }).nimi);
  });
  it('turvallinen: ei jaksoa / ei funktiota / heittävä valinta → null', () => {
    expect(omat(pel({ jaksofokus: null }), null)).toBeNull(); expect(P.tmKtPolkuOmatoiminen(pel(), { seuraPankki: null, kaanon: KAANON, tanaan: TANAAN })).toBeNull();
    expect(P.tmKtPolkuOmatoiminen(pel(), { valitse: () => { throw new Error('x'); }, kaanon: KAANON, tanaan: TANAAN })).toBeNull();
  });
});
describe('renderöinti', () => {
  const om = { nimi: 'Seuran seinäpeli', lahde: 'seura', lahdeNimi: 'KPV' };
  it('rivi: "Omatoiminen tällä viikolla: <osa> · <harjoite>" + lähde seuran nimellä; TM-lähde "Lähde: TalentMaster"; ei nimeä → "seuran harjoite"', () => {
    const h = html(pel(), om); expect(h).toContain('data-kt-omatoiminen'); expect(h).toContain('data-kt-omat-lahde="seura"');
    expect(h).toMatch(/Omatoiminen tällä viikolla: Käännä pää ennen vastaanottoa · Seuran seinäpeli/); expect(h).toContain('Lähde: KPV');
    expect(html(pel(), { nimi: 'X', lahde: 'tm' })).toContain('Lähde: TalentMaster'); expect(html(pel(), { nimi: 'X', lahde: 'seura' })).toContain('Lähde: seuran harjoite');
  });
  it('ei riviä: ei harjoitetta / nimetön; ei jaksoa; katselmus', () => {
    expect(html(pel(), null)).not.toContain('data-kt-omatoiminen'); expect(html(pel(), { nimi: '  ', lahde: 'tm' })).not.toContain('data-kt-omatoiminen');
    expect(html(pel({ jaksofokus: null }), om)).not.toContain('data-kt-omatoiminen');
    expect(html(pel({ jaksofokus: Object.assign({}, JF, { alkoi: '2026-08-01', kesto_vk: 6 }) }), om)).not.toContain('data-kt-omatoiminen');   // jakso päättynyt (katselmus)
  });
  it('§7.22: ei lukuja/tasoja/vertailua eikä käskevää kieltä rivillä; HTML-escape', () => {
    const rivi = (html(pel(), { nimi: '<b>x</b>', lahde: 'tm' }).match(/<div class="kt-omat"[\s\S]*?<\/div><\/div>/) || [''])[0];
    expect(rivi).not.toContain('<b>'); expect(rivi).toContain('&lt;b&gt;'); expect(rivi.replace(/<[^>]+>/g, '')).not.toMatch(/pitää|täytyy|sinun|taso|vertaa|XP|%/i);
  });
  it('FI-avaimet olemassa', () => { for (const k of ['ktp_omat', 'ktp_omat_ilman_osaa', 'ktp_omat_lahde_seura', 'ktp_omat_lahde_seura_ei_nimea', 'ktp_omat_lahde_tm']) expect(typeof FI[k], k).toBe('string'); });
});
describe('Kehitystyöpöytä: moottori ladataan laiskasti', () => {
  const S = teksti('TalentMaster_Kehitystyopoyta.html');
  it('harjoitelogiikka_v4 + sen libit vain data-tm-harj text/plain -tageina, oikeassa järjestyksessä; ei aktiivista skriptitagia', () => {
    expect(S).not.toMatch(/<script src="harjoitelogiikka_v4\.js"/);
    expect([...S.matchAll(/<script type="text\/plain" data-tm-harj src="([^"]+)"/g)].map((m) => m[1])).toEqual(['lib/tm_testipaiva.js', 'lib/tm_joukkuesaanto.js', 'lib/tm_tekniikka.js', 'lib/tm_fyysinen.js', 'harjoitelogiikka_v4.js']);
    expect(S).toContain('omatoiminen: _omatoimi(p)');
  });
});
describe('sv-erä 105: sv tyhjä (PM kirjoittaa), 5 avainta, paikkamerkit', () => {
  const E = JSON.parse(teksti('docs/i18n/sv_kaannoserae_105_gemini.json')), r = E.osiot['lib.tm_kt_polku'].rivit;
  it('avaimet = lib-FI, fi täsmää, sv tyhjä, odotuslistalla', () => {
    const avaimet = Object.keys(r).sort(); expect(avaimet).toEqual(['ktp_omat', 'ktp_omat_ilman_osaa', 'ktp_omat_lahde_seura', 'ktp_omat_lahde_seura_ei_nimea', 'ktp_omat_lahde_tm']); expect(E._rivit_yhteensa).toBe(5);
    for (const k of avaimet) { expect(r[k].fi, k).toBe(FI[k]); expect(r[k].sv, k).toBe(''); expect(require('./helpers/era105_odottaa.cjs').era105Odottaa(k), k).toBe(true); }
    expect(teksti('tools/i18n/sv_kattavuus.mjs')).toMatch(/const ODOTTAVAT_ERAT = \[105\]/);
  });
});
