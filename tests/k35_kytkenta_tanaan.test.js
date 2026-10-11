/* K35 kytkentä: kehitystyöpöydän Tänään lukee kalenteria (K35-1-libit).
   · tauko (D131, D193): pelaajan rytmiin sidotut signaalit pysähtyvät, "Treenattiinko?" = Tauolla
   · "Treenattiinko?" ilman vastauksia → lähteenä seuraava harjoitus tai ottelu (ryhmät mukana)
   · kuoret antavat vain tapahtumat (c.kalenteri); logiikka libissä */
import { describe, it, expect } from 'vitest';
import { readFileSync } from 'fs';
import { createRequire } from 'module';
const require = createRequire(import.meta.url);
const TS = require('../lib/tm_tanaan_signaali.js'), KT = require('../lib/tm_kehitystyopoyta.js');
const lue = (p) => readFileSync(new URL('../' + p, import.meta.url), 'utf8');
const H = (s) => Date.parse(s + '+03:00');
const NYT = H('2026-10-14T12:00:00');
const TAUKO = [{ id: 't', tyyppi: 'seuran_tauko', nimi: 'Syysloma', alkaa: H('2026-10-12T00:00:00'), paattyy: H('2026-10-18T23:59:00') }];
const P = { id: 'p1', etunimi: 'Testi', joukkue: 'KPV U13', joukkueet: ['kpv_u13'], jaksofokus: { konsepti_avain: 'k', konsepti_nimi: 'Syöttö', tila: 'kaynnissa' } };

describe('signaali tauolla (D131, D193)', () => {
  it('viikkokatsaus ei vastattu ja havainto eivät nouse tauolla; tilalle hiljainen "Tauko: Syysloma"', () => {
    const ctx = { nyt: NYT, profiili: 'oto', askel: { avain: 'havainto' }, vkEiVastattu: true, tila: { tila: 'kaynnissa' } };
    const ilman = TS.tmSignaalit(P, ctx).map((s) => s.avain);
    expect(ilman).toEqual(expect.arrayContaining(['vk_ei_vastattu', 'havainto']));
    const tauolla = TS.tmSignaalit(P, Object.assign({ tauko: { tauko: true, nimi: 'Syysloma' } }, ctx));
    expect(tauolla.map((s) => s.avain)).toEqual(['tauko']);
    expect(tauolla[0]).toMatchObject({ savy: 'hiljainen', teksti: 'Tauko: Syysloma', nappi: null });
  });
  it('kuorma ja pelaajan tekemä valinta näkyvät tauollakin; tauko ei ole "toinen rivi"', () => {
    const s = TS.tmTanaanSignaali(P, { nyt: NYT, askel: { avain: 'kuorma_tarkista' }, tila: { tila: 'kaynnissa' }, tauko: { tauko: true, nimi: 'Syysloma' } });
    expect(s.ensisijainen.avain).toBe('kuorma'); expect(s.toinen).toBe(null);
  });
  it('myöhästynyt katselmus ei nouse amberiksi tauolla (johto): eräpäivä ei kulu tauon aikana', () => {
    const ctx = { nyt: NYT, rooli: 'vp', askel: { avain: 'review_myohassa' }, tila: { tila: 'kaynnissa' } };
    const a = TS.tmSignaalit(P, ctx).find((s) => s.avain === 'suljettava');
    const b = TS.tmSignaalit(P, Object.assign({ tauko: { tauko: true, nimi: 'Syysloma' } }, ctx)).find((s) => s.avain === 'suljettava');
    expect(a.savy).toBe('amber'); expect(b).toBe(undefined);
  });
  it('ilman taukoa käytös ennallaan (ei taukosignaalia)', () => {
    expect(TS.tmSignaalit(P, { nyt: NYT, tila: { tila: 'kaynnissa' } }).map((s) => s.avain)).toEqual(['yllapito']);
  });
});

describe('tmKtKalenteri: tauko ja seuraava tapahtuma pelaajalle', () => {
  const KAL = TAUKO.concat([
    { id: 'h1', tyyppi: 'harjoitus', joukkue: 'kpv_u13', alkaa: H('2026-10-21T17:30:00'), paattyy: H('2026-10-21T19:00:00') },
    { id: 'r1', tyyppi: 'harjoitus', kohde: { tyyppi: 'ryhma', ryhma_id: 'mv' }, pelaajat_id: ['p1'], alkaa: H('2026-10-20T17:00:00') },
    { id: 'pal', tyyppi: 'valmentajapalaveri', joukkue: 'kpv_u13', nakyvyys: 'henkilokunta', alkaa: H('2026-10-19T18:00:00') }
  ]);
  it('tauko tunnistetaan; seuraava = ryhmän harjoitus (pelaajakohtainen), ei henkilökunnan palaveri', () => {
    const k = KT.tmKtKalenteri(P, KAL, NYT);
    expect(k.tauko).toMatchObject({ tauko: true, nimi: 'Syysloma' });
    expect(k.seuraava.id).toBe('r1');
  });
  it('joukkueelle rajattu tauko löytyy pelaajan joukkueen kautta', () => {
    const k = KT.tmKtKalenteri(P, [{ tyyppi: 'seuran_tauko', nimi: 'Leiri', joukkue: 'kpv_u13', alkaa: H('2026-10-14T00:00:00'), paattyy: H('2026-10-14T23:59:00') }], NYT);
    expect(k.tauko && k.tauko.nimi).toBe('Leiri');
  });
  it('ilman kalenteria (shell ei anna) → ei muutosta', () => { expect(KT.tmKtKalenteri(P, null, NYT)).toEqual({ tauko: null, seuraava: null }); });
});

describe('"Treenattiinko?"-kortti (D103: arvo + lähde)', () => {
  const ESC = (s) => String(s), C = { esc: ESC };
  it('ei vastauksia + seuraava harjoitus → lähde "seuraava harjoitus 21.10. klo 17.30"', () => {
    const h = KT.tmKtKysymyksetHTML({ nakyy: true, osat: [], vk: { n: 0, vk: 3 }, seuraava: { alkaa: H('2026-10-21T17:30:00'), tyyppi: 'harjoitus' } }, C);
    expect(h).toContain('seuraava harjoitus 21.10. klo 17.30'); expect(h).not.toContain('pelaaja vastaa sunnuntaina');
  });
  it('ottelu → "seuraava ottelu"', () => {
    const h = KT.tmKtKysymyksetHTML({ nakyy: true, osat: [], vk: null, seuraava: { alkaa: H('2026-10-24T12:00:00'), tyyppi: 'ottelu' } }, C);
    expect(h).toContain('seuraava ottelu 24.10. klo 12.00');
  });
  it('tauolla → "Tauolla" + "seuran tauko 18.10. asti"', () => {
    const h = KT.tmKtKysymyksetHTML({ nakyy: true, osat: [], vk: { n: 0, vk: 3 }, tauko: { tauko: true, nimi: 'Syysloma', loppu: '2026-10-18' } }, C);
    expect(h).toContain('Tauolla'); expect(h).toContain('seuran tauko 18.10. asti');
  });
  it('vastattu viikkokatsaus voittaa (lähde ennallaan)', () => {
    const h = KT.tmKtKysymyksetHTML({ nakyy: true, osat: [], vk: { n: 2, vk: 3, viimeisin: '2026-10-11' }, seuraava: { alkaa: H('2026-10-21T17:30:00'), tyyppi: 'harjoitus' } }, C);
    expect(h).toContain('2/3'); expect(h).not.toContain('seuraava harjoitus');
  });
});

describe('kuoret: vain tapahtumat libille, skriptit ladattu ennen kehitystyöpöytää', () => {
  for (const [nimi, f] of [['VP', 'TalentMaster_VP_v25.html'], ['Master', 'TalentMaster_Master_v16.html']]) {
    it(nimi, () => {
      const s = lue(f), i1 = s.indexOf('lib/tm_kalenteri_tyypit.js?v='), i2 = s.indexOf('lib/tm_kalenteri_kyselyt.js?v='), i3 = s.indexOf('lib/tm_kehitystyopoyta.js?v='), i0 = s.indexOf('lib/tm_ryhmat.js?v=');
      expect(i0).toBeGreaterThan(0); expect(i1).toBeGreaterThan(i0); expect(i2).toBeGreaterThan(i1); expect(i3).toBeGreaterThan(i2);
      expect(s).toMatch(/kalenteri: \(typeof _(ktKalenteri|kalenteriTapahtumat)/);
      expect(s).not.toMatch(/tmOnTauko\(|tmSeuraavaTapahtuma\(/);   // logiikka libissä, ei kuoressa
    });
  }
  it('Master antaa tarkat ajat (monipäiväinen tauko)', () => { expect(lue('TalentMaster_Master_v16.html')).toContain('_alkaaMs: alkaaD ? alkaaD.getTime() : null, _paattyyMs: paattyyD ? paattyyD.getTime() : null'); });
});
