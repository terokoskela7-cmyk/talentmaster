// Vaihe C — VP-seuranta koonti-/kuittauslogiikka (lib/tm_vp_seuranta.js, PURE).
// Roster-lajittelu (hälyttävät ensin) · aktiivisten hälytysten suodatus kuittauksilla · IDP-feed pikakentistä.
import { describe, it, expect } from 'vitest';
const S = require('../lib/tm_vp_seuranta.js');

function coach(id, nimi, vai, halytykset, joukkue) {
  return { id: id, nimi: nimi, joukkue: joukkue || 'U15', _vai: { vai: vai, halytykset: halytykset || [] } };
}
const RED = (t) => ({ taso: 'red', teksti: t });
const AMB = (t) => ({ taso: 'amber', teksti: t });

describe('tmSeurantaTilaDot', () => {
  it('kynnykset 70/50 + null', () => {
    expect(S.tmSeurantaTilaDot(80).dot).toBe('🟢');
    expect(S.tmSeurantaTilaDot(60).dot).toBe('🟡');
    expect(S.tmSeurantaTilaDot(30).dot).toBe('🔴');
    expect(S.tmSeurantaTilaDot(null).tila).toBe('ei dataa');
  });
});

describe('tmSeurantaRosterSort — hälyttävät ensin', () => {
  it('eniten red-hälytyksiä ylimmäs, sitten matalin VAI', () => {
    const list = [
      coach('a', 'Aaro', 85, []),
      coach('b', 'Bea', 40, [RED('Ei havaintoja 30pv'), RED('Ei kirjautunut 30pv')]),
      coach('c', 'Cecil', 55, [AMB('Vähän käyntejä')]),
      coach('d', 'Dan', 30, [RED('Ei havaintoja 30pv')]),
    ];
    const sorted = S.tmSeurantaRosterSort(list).map(c => c.id);
    expect(sorted[0]).toBe('b');   // 2 red
    expect(sorted[1]).toBe('d');   // 1 red
    expect(sorted[2]).toBe('c');   // 1 amber
    expect(sorted[3]).toBe('a');   // ei hälytyksiä, korkea vai
  });
  it('null-VAI (laskenta epäonnistui) lajittuu hälyttäväksi (matalimmaksi vai:ksi)', () => {
    const list = [coach('a', 'Aaro', 60, []), { id: 'x', nimi: 'X', _vai: { vai: null, halytykset: [] } }];
    const sorted = S.tmSeurantaRosterSort(list).map(c => c.id);
    expect(sorted[0]).toBe('x');
  });
  it('ei mutatoi alkuperäistä taulukkoa', () => {
    const list = [coach('a', 'A', 30, [RED('x')]), coach('b', 'B', 90, [])];
    const kopio = list.slice();
    S.tmSeurantaRosterSort(list);
    expect(list).toEqual(kopio);
  });
});

describe('tmSeurantaAktiivisetHalytykset — kuittaus suodattaa', () => {
  const valmentajat = [
    coach('b', 'Bea', 40, [RED('Ei havaintoja 30pv'), AMB('Vähän käyntejä')]),
    coach('a', 'Aaro', 85, []),
  ];
  it('litistää kaikki hälytykset, red ensin', () => {
    const akt = S.tmSeurantaAktiivisetHalytykset(valmentajat, []);
    expect(akt.length).toBe(2);
    expect(akt[0].taso).toBe('red');
    expect(akt[0].valmentaja_uid).toBe('b');
  });
  it('kuitattu hälytys poistuu aktiivilistalta (jää audittiin)', () => {
    const kuittaukset = [{ valmentaja_uid: 'b', tyyppi: 'Ei havaintoja 30pv' }];
    const akt = S.tmSeurantaAktiivisetHalytykset(valmentajat, kuittaukset);
    expect(akt.length).toBe(1);
    expect(akt[0].tyyppi).toBe('Vähän käyntejä');   // vain kuittaamaton jää
  });
  it('kuittaus täsmää avaimella (valmentaja + tyyppi), ei sekoita toisiin', () => {
    const kuittaukset = [{ valmentaja_uid: 'a', tyyppi: 'Ei havaintoja 30pv' }];   // eri valmentaja
    const akt = S.tmSeurantaAktiivisetHalytykset(valmentajat, kuittaukset);
    expect(akt.length).toBe(2);   // b:n hälytykset ennallaan
  });
  it('avain-pohjainen kuittaus (valmis avain) toimii myös', () => {
    const avain = S.tmSeurantaKuittausAvain('b', 'Vähän käyntejä');
    const akt = S.tmSeurantaAktiivisetHalytykset(valmentajat, [{ avain: avain }]);
    expect(akt.some(a => a.tyyppi === 'Vähän käyntejä')).toBe(false);
  });
});

describe('tmSeurantaKuittausAvain / OnKuitattu', () => {
  it('avain on deterministinen + slugattu', () => {
    expect(S.tmSeurantaKuittausAvain('u1', 'Ei havaintoja 30pv')).toBe('u1__ei_havaintoja_30pv');
  });
  it('OnKuitattu tunnistaa kuitatun', () => {
    const k = [{ valmentaja_uid: 'u1', tyyppi: 'Vähän käyntejä' }];
    expect(S.tmSeurantaOnKuitattu(k, 'u1', 'Vähän käyntejä')).toBe(true);
    expect(S.tmSeurantaOnKuitattu(k, 'u1', 'Ei havaintoja 30pv')).toBe(false);
  });
});

describe('tmSeurantaIdpFeed — pikakentistä, ikkuna + uusi-badge', () => {
  const now = Date.parse('2026-07-28T00:00:00Z');
  const D = (iso) => iso;
  const pelaajat = [
    { id: 'p1', etunimi: 'Topias', sukunimi: 'K', joukkue: 'KPV U13', idp_sitoumus_pvm: '2026-07-27', idp_fokus: { nimi: 'Syöttäminen' }, idp_tila: 'aktiivinen' },
    { id: 'p2', etunimi: 'Vanha', sukunimi: 'V', joukkue: 'U15', idp_sitoumus_pvm: '2026-07-01', idp_fokus: 'Prässi' },   // 27pv → ikkunan ulkopuolella (14)
    { id: 'p3', etunimi: 'Eilen', sukunimi: 'E', joukkue: 'U15', idp_sitoumus_pvm: '2026-07-20', idp_fokus: { alue: 'Puolustus' } },   // 8pv → mukana, ei uusi
    { id: 'p4', etunimi: 'Ei', sukunimi: 'Idp', joukkue: 'U15' },   // ei pvm → ohita
  ];
  it('poimii vain ikkunan sisällä olevat, uusin ensin', () => {
    const feed = S.tmSeurantaIdpFeed(pelaajat, now, 14, 3);
    expect(feed.map(f => f.pelaajaId)).toEqual(['p1', 'p3']);
    expect(feed[0].nimi).toBe('Topias K');
    expect(feed[0].fokus).toBe('Syöttäminen');
  });
  it('uusi-badge vain ≤ uusiVrk', () => {
    const feed = S.tmSeurantaIdpFeed(pelaajat, now, 14, 3);
    expect(feed.find(f => f.pelaajaId === 'p1').uusi).toBe(true);    // 1pv
    expect(feed.find(f => f.pelaajaId === 'p3').uusi).toBe(false);   // 8pv
  });
  it('fokus-teksti eri muodoista (string / {nimi} / {alue})', () => {
    const feed = S.tmSeurantaIdpFeed(pelaajat, now, 30, 3);
    expect(feed.find(f => f.pelaajaId === 'p2').fokus).toBe('Prässi');
    expect(feed.find(f => f.pelaajaId === 'p3').fokus).toBe('Puolustus');
  });
  it('tyhjä / puuttuva pvm → graceful', () => {
    expect(S.tmSeurantaIdpFeed([], now)).toEqual([]);
    expect(S.tmSeurantaIdpFeed(null, now)).toEqual([]);
    expect(S.tmSeurantaIdpFeed([{ id: 'x' }], now).length).toBe(0);
  });
});
