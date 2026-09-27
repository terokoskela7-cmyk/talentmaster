/**
 * TalentMaster™ — Arviointihistoria (H1) · puhtaat lib-funktiot.
 * Brief: docs/CODE_BRIEF_ARVIOINTI_HISTORIA_MONIARVIOIJA.md §5 + §8.
 */
import { describe, it, expect } from 'vitest';
import { createRequire } from 'module';

const vaadi = createRequire(import.meta.url);
const L = vaadi('../lib/tm_arviointi_historia.js');

const NYT = Date.parse('2026-09-27T12:00:00Z');
const kerta = (pvm, uid, kohteet, lisa) => Object.assign({
  pvm, arvioija_uid: uid, arvioija_org: 'seura', nakyvyys: 'seuralle', kohteet,
}, lisa || {});

/* ── KAUSI ────────────────────────────────────────────────────────────── */
describe('tmKausi — Suomi = kalenterivuosi, Eurooppa = heinä–kesä', () => {
  it('kalenteri: syyskuu 2026 → "2026"', () => {
    expect(L.tmKausi('2026-09-20', 'kalenteri')).toBe('2026');
  });
  it('heina_kesa: syyskuu 2026 → "2026-27"', () => {
    expect(L.tmKausi('2026-09-20', 'heina_kesa')).toBe('2026-27');
  });
  it('heina_kesa: kesäkuu 2026 kuuluu vielä edelliseen kauteen', () => {
    expect(L.tmKausi('2026-06-30', 'heina_kesa')).toBe('2025-26');
  });
  it('heina_kesa: heinäkuun 1. aloittaa uuden kauden', () => {
    expect(L.tmKausi('2026-07-01', 'heina_kesa')).toBe('2026-27');
  });
  it('oletus on kalenteri (Suomi)', () => {
    expect(L.tmKausi('2026-09-20')).toBe('2026');
  });
  it('kausitunniste ei sisällä "/" (Firestore-polkuerotin, §11)', () => {
    expect(L.tmKausi('2026-09-20', 'heina_kesa')).not.toContain('/');
  });
  it('kelvoton pvm → null (ei arvausta)', () => {
    expect(L.tmKausi('ei-paiva', 'kalenteri')).toBeNull();
  });
  it('kausimalli johdetaan maasta kun konfiguraatio puuttuu', () => {
    expect(L.tmKausimalli({ maa: 'FI' })).toBe('kalenteri');
    expect(L.tmKausimalli({ maa: 'SE' })).toBe('heina_kesa');
    expect(L.tmKausimalli({ kausimalli: 'heina_kesa', maa: 'FI' })).toBe('heina_kesa');
    expect(L.tmKausimalli(null)).toBe('kalenteri');
  });
});

/* ── KERTA-ID: kaksi arvioijaa samana päivänä = KAKSI kertaa ──────────── */
describe('tmAhKertaId — arvio kuuluu arvioijalle (brief §1.2, §8)', () => {
  it('kaksi eri arvioijaa samana päivänä → eri id (ei ylikirjoitusta)', () => {
    const a = L.tmAhKertaId('2026-09-27', 'uid-a', 'ottelu');
    const b = L.tmAhKertaId('2026-09-27', 'uid-b', 'ottelu');
    expect(a).not.toBe(b);
  });
  it('sama arvioija + sama päivä + sama konteksti → SAMA id (kohteet kertyvät)', () => {
    expect(L.tmAhKertaId('2026-09-27T08:00:00Z', 'uid-a', 'ottelu'))
      .toBe(L.tmAhKertaId('2026-09-27T19:30:00Z', 'uid-a', 'ottelu'));
  });
  it('uusi päivä → uusi kerta', () => {
    expect(L.tmAhKertaId('2026-09-28', 'uid-a', 'ottelu')).not.toBe(L.tmAhKertaId('2026-09-27', 'uid-a', 'ottelu'));
  });
  it('uusi konteksti → uusi kerta', () => {
    expect(L.tmAhKertaId('2026-09-27', 'uid-a', 'harjoitus')).not.toBe(L.tmAhKertaId('2026-09-27', 'uid-a', 'ottelu'));
  });
  it('id ei sisällä "/" vaikka uid olisi siivoton', () => {
    expect(L.tmAhKertaId('2026-09-27', 'a/b c', 'ottelu')).not.toContain('/');
  });
});

/* ── VIIMEISIMMÄT + HAJONTA ───────────────────────────────────────────── */
describe('tmAhViimeisimmat + tmAhHajonta', () => {
  const kerrat = [
    kerta('2026-09-01', 'a', { pelin_lukeminen: { arvo: 3 } }),
    kerta('2026-09-20', 'a', { pelin_lukeminen: { arvo: 4 } }),   // saman arvioijan uudempi
    kerta('2026-09-10', 'b', { pelin_lukeminen: { arvo: 2 } }),
  ];

  it('sama arvioija kahdesti → vain viimeisin mukana', () => {
    const v = L.tmAhViimeisimmat(kerrat, NYT);
    expect(Object.keys(v).sort()).toEqual(['a', 'b']);
    expect(v.a.pvm).toBe('2026-09-20');
  });

  it('12 kk ikkunan ulkopuolinen kerta rajautuu pois', () => {
    const v = L.tmAhViimeisimmat(kerrat.concat([kerta('2024-01-01', 'c', { pelin_lukeminen: { arvo: 5 } })]), NYT);
    expect(v.c).toBeUndefined();
  });

  it('hajonta laskee vain arvioijien viimeisimmistä (4 vs 2 → ero 2)', () => {
    const h = L.tmAhHajonta(L.tmAhViimeisimmat(kerrat, NYT), 'pelin_lukeminen');
    expect(h.n).toBe(2);
    expect(h.min).toBe(2); expect(h.max).toBe(4); expect(h.ero).toBe(2);
    expect(h.keskustelunaihe).toBe(true);
  });

  it('ero 1.5 on keskustelunaihe (sama raja kuin D3-kalibraatio), 1.0 ei', () => {
    const v15 = { a: kerta('2026-09-20', 'a', { x: { arvo: 4.5 } }), b: kerta('2026-09-20', 'b', { x: { arvo: 3 } }) };
    const v10 = { a: kerta('2026-09-20', 'a', { x: { arvo: 4 } }), b: kerta('2026-09-20', 'b', { x: { arvo: 3 } }) };
    expect(L.tmAhHajonta(v15, 'x').keskustelunaihe).toBe(true);
    expect(L.tmAhHajonta(v10, 'x').keskustelunaihe).toBe(false);
  });

  it("'NA' ja puuttuva avain eivät laske hajontaan", () => {
    const v = {
      a: kerta('2026-09-20', 'a', { x: { arvo: 4 } }),
      b: kerta('2026-09-20', 'b', { x: { arvo: 'NA' } }),
      c: kerta('2026-09-20', 'c', { y: { arvo: 2 } }),
    };
    const h = L.tmAhHajonta(v, 'x');
    expect(h.n).toBe(1);
    expect(h.ero).toBe(0);
  });

  it('mediaani parillisella n:llä = kahden keskimmäisen keskiarvo', () => {
    const v = {
      a: kerta('2026-09-20', 'a', { x: { arvo: 2 } }), b: kerta('2026-09-20', 'b', { x: { arvo: 3 } }),
      c: kerta('2026-09-20', 'c', { x: { arvo: 4 } }), d: kerta('2026-09-20', 'd', { x: { arvo: 5 } }),
    };
    expect(L.tmAhHajonta(v, 'x').mediaani).toBe(3.5);
  });

  it('ei yhtään arvoa → nollatulos, ei keskustelunaihetta', () => {
    expect(L.tmAhHajonta({}, 'x')).toMatchObject({ n: 0, ero: null, keskustelunaihe: false });
  });
});

/* ── SARJA + TRENDI ───────────────────────────────────────────────────── */
describe('tmAhSarja + tmAhTrendi — ohut otos -portti', () => {
  const kevat = [
    kerta('2026-02-10', 'a', { x: { arvo: 2 } }),
    kerta('2026-04-10', 'b', { x: { arvo: 3 } }),
  ];
  const syksy = [
    kerta('2026-08-10', 'a', { x: { arvo: 4 } }),
    kerta('2026-09-10', 'b', { x: { arvo: 4 } }),
  ];

  it('puolivuotisjako: tammi–kesä = K, heinä–joulu = S', () => {
    expect(L.tmAhJakso('2026-06-30')).toBe('2026-K');
    expect(L.tmAhJakso('2026-07-01')).toBe('2026-S');
  });

  it('< 3 kertaa → ohut (ei trendiä, ei muutoslukua)', () => {
    const t = L.tmAhTrendi(kevat, 'x');
    expect(t.ohut).toBe(true);
    expect(t.d).toBeNull();
  });

  it('3 kertaa mutta vain yksi jakso → yhä ohut (vaatii kaksi jaksoa)', () => {
    const t = L.tmAhTrendi(kevat.concat([kerta('2026-05-01', 'c', { x: { arvo: 3 } })]), 'x');
    expect(t.n).toBe(3);
    expect(t.jaksoja).toBe(1);
    expect(t.ohut).toBe(true);
  });

  it('≥ 3 kertaa kahdelta jaksolta → trendi + muutos jaksomediaanien erotuksena', () => {
    const t = L.tmAhTrendi(kevat.concat(syksy), 'x');
    expect(t.ohut).toBe(false);
    expect(t.eka).toBe(2.5);   // kevät: 2,3
    expect(t.vika).toBe(4);    // syksy: 4,4
    expect(t.d).toBe(1.5);
  });

  it("'NA' ei tule sarjaan pisteeksi", () => {
    const s = L.tmAhSarja(kevat.concat([kerta('2026-08-01', 'c', { x: { arvo: 'NA' } })]), 'x');
    expect(s.pisteet.length).toBe(2);
  });

  it('pisteet ovat aikajärjestyksessä', () => {
    const s = L.tmAhSarja([kerta('2026-09-10', 'a', { x: { arvo: 4 } }), kerta('2026-02-10', 'b', { x: { arvo: 2 } })], 'x');
    expect(s.pisteet.map((p) => p.arvo)).toEqual([2, 4]);
  });
});

/* ── KOOSTE (pikakenttä) ──────────────────────────────────────────────── */
describe('tmAhKooste — pikakentän rakenne (sama CF:ssä ja clientissä)', () => {
  const kerrat = [
    kerta('2026-09-01', 'a', { x: { arvo: 3 }, y: { arvo: 5 } }),
    kerta('2026-09-20', 'a', { x: { arvo: 4 } }),
    kerta('2026-09-10', 'b', { x: { arvo: 2 } }),
  ];

  it('kokoaa per avain: viimeisin, mediaani, n, arvioijia, min/max, ero', () => {
    const k = L.tmAhKooste(kerrat, NYT);
    expect(k.x).toMatchObject({ viimeisin: 4, n: 2, arvioijia: 2, min: 2, max: 4, ero: 2, keskustelunaihe: true });
    expect(k.x.pvm).toBe('2026-09-20');
  });

  /* KORJATTU REVIEW-LÖYDÖKSEN 2 MUKANA: tämä väite koodasi aiemmin juuri sen bugin, jonka
     review löysi — arvioijan aiempi arvio KATOSI, kun hän kirjasi myöhemmin toisen kohteen.
     Oikea semantiikka: uudempi kerta ei kumoa vanhempaa arviota MUUSTA kohteesta. */
  it('arvioijan aiempi arvio toisesta kohteesta säilyy koosteessa', () => {
    const k = L.tmAhKooste(kerrat, NYT);
    expect(k.y).toMatchObject({ viimeisin: 5, n: 1, arvioijia: 1 });
  });

  it('tyhjä syöte → tyhjä kooste (ei keksittyä nollaa)', () => {
    expect(L.tmAhKooste([], NYT)).toEqual({});
  });
});

/* ── NÄKYVYYS JA ORGANISAATIO (suodattimet) ───────────────────────────── */
describe('näkyvyys- ja organisaatiosuodattimet', () => {
  const kerrat = [
    kerta('2026-09-20', 'a', { x: { arvo: 4 } }),
    kerta('2026-09-21', 'pl', { x: { arvo: 2 } }, { arvioija_org: 'palloliitto', nakyvyys: 'sisainen' }),
    kerta('2026-09-22', 'pl2', { x: { arvo: 3 } }, { arvioija_org: 'palloliitto', nakyvyys: 'seuralle' }),
  ];

  it('tmAhSeuralle pudottaa sisäiset kerrat (ne eivät saa vuotaa pikakenttään)', () => {
    expect(L.tmAhSeuralle(kerrat).map((k) => k.arvioija_uid)).toEqual(['a', 'pl2']);
  });

  it('tmAhSeuranOmat pudottaa Palloliiton kerrat (IDP-silta ei käänny ulkopuolisesta)', () => {
    expect(L.tmAhSeuranOmat(kerrat).map((k) => k.arvioija_uid)).toEqual(['a']);
  });

  it('kooste sisäiset suodatettuna: vain jaetut vaikuttavat', () => {
    const k = L.tmAhKooste(L.tmAhSeuralle(kerrat), NYT);
    expect(k.x.arvioijia).toBe(2);
    expect(k.x.min).toBe(3);   // sisäinen 2 ei vaikuta
  });
});

/* ── "MIKSI ARVIOT EROAVAT?" ──────────────────────────────────────────── */
describe('tmAhKontekstierot — sääntöpohjainen, vain tallennetuista kentistä', () => {
  const pohja = (uid, pvm, arvo, konteksti, lisa) => kerta(pvm, uid, { x: { arvo } }, Object.assign({ konteksti }, lisa || {}));

  it('yksi arvioija → ei tekijöitä (ei ole mitä verrata)', () => {
    expect(L.tmAhKontekstierot([pohja('a', '2026-09-20', 4, { tyyppi: 'ottelu', pelipaikka: 'KP' })], 'x', NYT)).toEqual([]);
  });

  it('eri pelipaikka tunnistetaan', () => {
    const t = L.tmAhKontekstierot([
      pohja('a', '2026-09-20', 4, { tyyppi: 'ottelu', pelipaikka: 'KP' }),
      pohja('b', '2026-09-21', 2, { tyyppi: 'ottelu', pelipaikka: 'LP' }),
    ], 'x', NYT);
    expect(t.map((x) => x.tekija)).toContain('pelipaikka');
  });

  it('puuttuva kenttä EI ole ero (tekijä vain kun kenttä on molemmissa)', () => {
    const t = L.tmAhKontekstierot([
      pohja('a', '2026-09-20', 4, { tyyppi: 'ottelu', pelipaikka: 'KP' }),
      pohja('b', '2026-09-21', 2, { tyyppi: 'ottelu' }),
    ], 'x', NYT);
    expect(t.map((x) => x.tekija)).not.toContain('pelipaikka');
  });

  it('sama pelipaikka → ei tekijää', () => {
    const t = L.tmAhKontekstierot([
      pohja('a', '2026-09-20', 4, { tyyppi: 'ottelu', pelipaikka: 'KP' }),
      pohja('b', '2026-09-21', 2, { tyyppi: 'ottelu', pelipaikka: 'KP' }),
    ], 'x', NYT);
    expect(t.map((x) => x.tekija)).not.toContain('pelipaikka');
  });

  it('eri tilanne (harjoitus vs ottelu) ja aikaero > 60 pv tunnistetaan', () => {
    const t = L.tmAhKontekstierot([
      pohja('a', '2026-05-01', 4, { tyyppi: 'harjoitus' }),
      pohja('b', '2026-09-21', 2, { tyyppi: 'ottelu' }),
    ], 'x', NYT);
    const tekijat = t.map((x) => x.tekija);
    expect(tekijat).toContain('tilanne');
    expect(tekijat).toContain('aikaero');
  });

  it('aikaero 60 pv tai alle ei ole tekijä', () => {
    const t = L.tmAhKontekstierot([
      pohja('a', '2026-09-01', 4, { tyyppi: 'ottelu' }),
      pohja('b', '2026-09-21', 2, { tyyppi: 'ottelu' }),
    ], 'x', NYT);
    expect(t.map((x) => x.tekija)).not.toContain('aikaero');
  });

  it('§28: kasvupyrähdys (LAH/PH) nostaa kypsyystekijän', () => {
    const t = L.tmAhKontekstierot([
      Object.assign(pohja('a', '2026-09-20', 4, { tyyppi: 'ottelu' }), { tilannekuva: { phv_tila: 'PH' } }),
      Object.assign(pohja('b', '2026-09-21', 2, { tyyppi: 'ottelu' }), { tilannekuva: { phv_tila: 'POST' } }),
    ], 'x', NYT);
    expect(t.map((x) => x.tekija)).toContain('kypsyys');
  });

  it('ei päätelmää siitä kuka on oikeassa (tekstit kuvaavat eroa, eivät arvota)', () => {
    const t = L.tmAhKontekstierot([
      pohja('a', '2026-09-20', 4, { tyyppi: 'ottelu', pelipaikka: 'KP' }),
      pohja('b', '2026-09-21', 2, { tyyppi: 'harjoitus', pelipaikka: 'LP' }),
    ], 'x', NYT);
    const teksti = t.map((x) => x.teksti).join(' ').toLowerCase();
    expect(teksti).not.toMatch(/oikeassa|väärä|virhe|luotettavampi/);
  });
});

/* ── REVIEW-LÖYDÖS 2: viimeisin PER KOHDE, ei vain viimeisin kerta ────────── */
describe('tmAhViimeisinPerKohde — arvioijan aiempi arvio ei katoa toisen kerran alle', () => {
  /* Reviewin skenaario: VP arvioi 1.9. Fyysisen (4), 20.9. vain Päätöksenteon (4);
     Palloliitto arvioi 10.9. Fyysisen (2). Jos katsotaan vain viimeisintä KERTAA, VP:n
     Fyysinen-arvio katoaa → ero 0 ja "keskustelunaihe" jää syntymättä. */
  const kerrat = [
    kerta('2026-09-01', 'vp', { physical_presence: { arvo: 4 } }),
    kerta('2026-09-20', 'vp', { paatoksenteko: { arvo: 4 } }),
    kerta('2026-09-10', 'pl', { physical_presence: { arvo: 2 } }, { arvioija_org: 'palloliitto' }),
  ];

  it('molemmat arvioijat ovat mukana kohteessa jota kumpikin on arvioinut', () => {
    const v = L.tmAhViimeisinPerKohde(kerrat, 'physical_presence', NYT);
    expect(Object.keys(v).sort()).toEqual(['pl', 'vp']);
    expect(v.vp.arvo).toBe(4);
    expect(v.pl.arvo).toBe(2);
  });

  it('kooste näyttää eron ja merkitsee sen keskustelunaiheeksi', () => {
    const k = L.tmAhKooste(kerrat, NYT);
    expect(k.physical_presence).toMatchObject({ n: 2, arvioijia: 2, min: 2, max: 4, ero: 2, keskustelunaihe: true });
  });

  it('saman arvioijan uudempi arvio SAMASTA kohteesta korvaa vanhemman', () => {
    const v = L.tmAhViimeisinPerKohde(
      kerrat.concat([kerta('2026-09-25', 'vp', { physical_presence: { arvo: 3 } })]), 'physical_presence', NYT);
    expect(v.vp.arvo).toBe(3);
  });

  it("tuorein 'NA' pudottaa arvioijan kohteesta (ei sovellu ≠ arvo)", () => {
    const v = L.tmAhViimeisinPerKohde(
      kerrat.concat([kerta('2026-09-26', 'vp', { physical_presence: { arvo: 'NA' } })]), 'physical_presence', NYT);
    expect(v.vp).toBeUndefined();
    expect(v.pl.arvo).toBe(2);
  });

  it('kontekstierot lukee samat kerrat (ei viimeisintä kertaa)', () => {
    const t = L.tmAhKontekstierot([
      kerta('2026-09-01', 'vp', { physical_presence: { arvo: 4 } }, { konteksti: { tyyppi: 'ottelu', pelipaikka: 'KP' } }),
      kerta('2026-09-20', 'vp', { paatoksenteko: { arvo: 4 } }, { konteksti: { tyyppi: 'harjoitus', pelipaikka: 'LP' } }),
      kerta('2026-09-10', 'pl', { physical_presence: { arvo: 2 } }, { konteksti: { tyyppi: 'ottelu', pelipaikka: 'LP' } }),
    ], 'physical_presence', NYT);
    expect(t.map((x) => x.tekija)).toContain('pelipaikka');
  });
});

/* ── REVIEW-LÖYDÖS 1: jaettu payload-rakentaja ────────────────────────────── */
describe('tmAhKertaPayload — sovellus ja Rules-testi rakentavat saman payloadin', () => {
  const syote = {
    kehys: 'palloliitto', kausi: '2026', pvm: '2026-09-20', palloId: '123', seuraId: 'sjk',
    arvioija: { uid: 'u1', nimi: 'A', rooli: 'valmentaja', org: 'seura' },
    konteksti: { tyyppi: 'ottelu', pelipaikka: 'KP', minuutit: 60, vastustajataso: 'oma' },
    tilannekuva: { ika: 13, phv_tila: 'PRE' },
    kohteet: { x: { arvo: 4 } }, aikaleima: 'TS',
  };

  it('EI sisällä luotu-kenttää (Rules vaatii sen muuttumattomaksi updatessa)', () => {
    expect(Object.keys(L.tmAhKertaPayload(syote))).not.toContain('luotu');
  });

  it('kentät vastaavat datamallia', () => {
    const p = L.tmAhKertaPayload(syote);
    expect(p).toMatchObject({
      kausi: '2026', pvm: '2026-09-20', palloId: '123', seuraId_arviohetkella: 'sjk',
      nakyvyys: 'seuralle', arvioija_uid: 'u1', arvioija_org: 'seura', paivitetty: 'TS',
    });
    expect(p.konteksti).toMatchObject({ tyyppi: 'ottelu', pelipaikka: 'KP', minuutit: 60 });
  });

  it('tuntematon näkyvyysarvo normalisoituu jaetuksi', () => {
    expect(L.tmAhKertaPayload(Object.assign({}, syote, { nakyvyys: 'sisainen' })).nakyvyys).toBe('sisainen');
    expect(L.tmAhKertaPayload(Object.assign({}, syote, { nakyvyys: 'roskaa' })).nakyvyys).toBe('seuralle');
  });
});

/* ── REVIEW-LÖYDÖS 5: potentiaalin kooste ─────────────────────────────────── */
describe('tmAhPotentiaaliKooste — uusin kerta JOSSA on potentiaali', () => {
  const kerrat = [
    kerta('2026-09-01', 'vp', { x: { arvo: 3 } }, { potentiaali: { tahdet: 4, varmuus: 'kohtalainen' } }),
    kerta('2026-09-20', 'vp', { x: { arvo: 3 } }),
    kerta('2026-09-10', 'tv', { x: { arvo: 3 } }, { potentiaali: { tahdet: 2, varmuus: 'alustava' } }),
  ];

  it('arvioijan potentiaali ei katoa uudemman kerran alle', () => {
    const k = L.tmAhPotentiaaliKooste(kerrat, NYT);
    expect(k).toMatchObject({ arvioijia: 2, tahdet_mediaani: 3 });
  });

  it('ei potentiaaleja → null (ei keksittyä nollaa)', () => {
    expect(L.tmAhPotentiaaliKooste([kerta('2026-09-01', 'vp', { x: { arvo: 3 } })], NYT)).toBeNull();
  });

  it('alle 14-vuotiaan oletusvarmuus on alustava', () => {
    expect(L.tmAhVarmuusOletus(13)).toBe('alustava');
    expect(L.tmAhVarmuusOletus(15)).toBe('kohtalainen');
    expect(L.tmAhVarmuusOletus(null)).toBe('kohtalainen');
  });
});

/* ── REVIEW-LÖYDÖS 7: paikallinen päivä + kertojen erottelu ──────────────── */
describe('paikallinen kalenteripäivä (Europe/Helsinki), ei UTC', () => {
  it('klo 01.30 Suomen aikaa kuuluu ALKANEESEEN päivään, ei edelliseen', () => {
    // 2026-09-26T22:30Z = 2026-09-27 01:30 Suomessa
    expect(L.tmAhKertaId('2026-09-26T22:30:00Z', 'u', 'ottelu')).toContain('2026-09-27');
  });

  it('uudenvuodenyön arvio menee alkaneelle kaudelle', () => {
    // 2026-12-31T23:30Z = 2027-01-01 01:30 Suomessa
    expect(L.tmKausi('2026-12-31T23:30:00Z', 'kalenteri')).toBe('2027');
  });

  it('puolivuotisjakso lasketaan samasta paikallisesta päivästä', () => {
    // 2026-06-30T22:30Z = 2026-07-01 01:30 Suomessa → syksy
    expect(L.tmAhJakso('2026-06-30T22:30:00Z')).toBe('2026-S');
  });

  it('keskipäivä ei muutu (ei regressiota tavallisiin päiviin)', () => {
    expect(L.tmKausi('2026-09-20T12:00:00Z', 'kalenteri')).toBe('2026');
    expect(L.tmAhKertaId('2026-09-20T12:00:00Z', 'u', 'ottelu')).toContain('2026-09-20');
  });
});

describe('kaksi ottelua samana päivänä ovat eri kertoja', () => {
  it('eri ottelutunniste → eri kerta (ei kontekstin ylikirjoitusta)', () => {
    const a = L.tmAhKertaId('2026-09-27', 'u', 'ottelu', 'TASO-123');
    const b = L.tmAhKertaId('2026-09-27', 'u', 'ottelu', 'TASO-999');
    expect(a).not.toBe(b);
  });

  it('sama erotin → sama kerta (kohteet kertyvät yhä)', () => {
    expect(L.tmAhKertaId('2026-09-27', 'u', 'ottelu', 'TASO-123'))
      .toBe(L.tmAhKertaId('2026-09-27', 'u', 'ottelu', 'TASO-123'));
  });

  it('ilman erotinta käytös on ennallaan', () => {
    expect(L.tmAhKertaId('2026-09-27', 'u', 'ottelu')).toBe('2026-09-27_u_ottelu');
  });

  it('erotin siivotaan doc-ID-kelpoiseksi (ei "/" eikä välilyöntejä)', () => {
    const id = L.tmAhKertaId('2026-09-27', 'u', 'ottelu', 'P13 sarja / kotiottelu');
    expect(id).not.toContain('/');
    expect(id).not.toContain(' ');
  });
});

/* ── REVIEW-KIERROS 2, LÖYDÖS D: null-kentät eivät saa pyyhkiä aiempaa ─────── */
describe('tmAhKertaPayload — puuttuvaa arvoa ei kirjoiteta nullina', () => {
  const pohja = {
    kausi: '2026', pvm: '2026-09-20', seuraId: 'sjk',
    arvioija: { uid: 'u1', org: 'seura' }, konteksti: { tyyppi: 'ottelu' },
    kohteet: { x: { arvo: 4 } }, aikaleima: 'TS',
  };

  it('ilman potentiaalia kenttää EI ole payloadissa (merge ei saa nollata aiempaa)', () => {
    expect(Object.keys(L.tmAhKertaPayload(pohja))).not.toContain('potentiaali');
  });

  it('potentiaali kirjoitetaan kun se annetaan', () => {
    const p2 = L.tmAhKertaPayload(Object.assign({}, pohja, { potentiaali: { tahdet: 4, varmuus: 'alustava' } }));
    expect(p2.potentiaali).toMatchObject({ tahdet: 4, varmuus: 'alustava' });
  });

  it('ilman tilannekuvaa kenttää EI ole payloadissa', () => {
    expect(Object.keys(L.tmAhKertaPayload(pohja))).not.toContain('tilannekuva');
    expect(L.tmAhKertaPayload(Object.assign({}, pohja, { tilannekuva: { ika: 13 } })).tilannekuva).toMatchObject({ ika: 13 });
  });
});
