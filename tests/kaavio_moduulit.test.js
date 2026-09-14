/**
 * Kaavio-moduulit (erä A): validaattori + policy. Puhtaat funktiot → tavallinen vitest, ei emulaattoria.
 * Renderöijä testataan erikseen headless-selaimella (vaatii DOMin).
 *
 * HUOM policy: tämä tiedosto testaa vain LOGIIKAN. Väite "sama logiikka kuin palvelimella" on
 * tests/rules/kaavio.rules.test.js:n pariteettilohkossa — se on ainoa paikka jossa lib ja rules
 * ajetaan samaa matriisia vasten.
 */
import { describe, it, expect } from 'vitest';
import { createRequire } from 'module';
const require = createRequire(import.meta.url);
const V = require('../lib/tm_kaavio_validate.js');
const P = require('../lib/tm_kaavio_policy.js');

const SPEC = () => ({
  avain: 't_h0', suunta: 'ylos', pelimuoto: '8v8',
  pelaajat: [
    { id: 'a', joukkue: 'oma', rooli: 'syöttäjä', x: 50, y: 60, pallo: true },
    { id: 'b', joukkue: 'oma', rooli: 'vastaanottaja', x: 62, y: 40, avoin: 45 },
    { id: 'x', joukkue: 'vastustaja', rooli: 'paine', x: 55, y: 50 }
  ],
  liikkeet: [{ id: 'l1', tyyppi: 'syotto', from: { ref: 'a' }, to: { ref: 'b' } }]
});

describe('validaattori · §6-portit', () => {
  it('kelpo spec läpäisee', () => expect(V.validoiKaavio(SPEC()).E).toEqual([]));

  it('viite-eheys: liike poistettuun pelaajaan HYLÄTÄÄN', () => {
    const s = SPEC(); s.liikkeet[0].to = { ref: 'poistettu' };
    expect(V.validoiKaavio(s).E.join(' ')).toContain('tuntemattomaan');
    expect(V.kaavioKelpaa(s)).toBe(false);
  });
  it('avain on ENUM: käännetty avain hylätään (C1)', () => {
    const s = SPEC(); s.avain = 'Havainnointi';
    expect(V.validoiKaavio(s).E.join(' ')).toContain('kanoninen');
  });
  it('pelimuoto-katto: 8v8 sallii max 8 per joukkue', () => {
    const s = SPEC();
    for (let i = 0; i < 8; i++) s.pelaajat.push({ id: 'o' + i, joukkue: 'oma', rooli: 'tuki', x: 10 + i, y: 10 });
    expect(V.validoiKaavio(s).E.join(' ')).toMatch(/omia \d+ > pelimuoto 8/);
  });
  it('koordinaatti rajan ulkona hylätään', () => {
    const s = SPEC(); s.pelaajat[0].x = 140;
    expect(V.validoiKaavio(s).E.join(' ')).toContain('rajan ulkona');
  });
  it('≤1 pallollinen', () => {
    const s = SPEC(); s.pelaajat[1].pallo = true;
    expect(V.validoiKaavio(s).E.join(' ')).toContain('useampi pallollinen');
  });
  it('näkökenttä vaatii tasan 1 vastaanottajan + avoin-kulman', () => {
    const s = SPEC(); s.cone = { r: 12 };
    expect(V.validoiKaavio(s).E).toEqual([]);                       // 1 vastaanottaja + avoin → ok
    s.pelaajat.push({ id: 'c', joukkue: 'oma', rooli: 'vastaanottaja', x: 30, y: 30 });
    expect(V.validoiKaavio(s).E.join(' ')).toContain('tasan 1 vastaanottajan');
  });
  it('liiketyyppi on enumista', () => {
    const s = SPEC(); s.liikkeet[0].tyyppi = 'lentopallo';
    expect(V.validoiKaavio(s).E.join(' ')).toContain('tyyppi ei sallittu');
  });
});

describe('policy · statussiirrot', () => {
  const vp = { rooli: 'vp', seuraId: 'fcl' };
  const valm = { rooli: 'valmentaja', seuraId: 'fcl', joukkueet: ['fcl_u12'] };
  it('suora luonnos→hyvaksytty on kielletty kaikilta', () => {
    expect(P.kaavioSiirtoSallittu('luonnos', 'hyvaksytty', vp)).toBe(false);
    expect(P.kaavioSiirtoSallittu('luonnos', 'hyvaksytty', { superAdmin: true })).toBe(false);
  });
  it('luonnos→odottaa sallittu valmentajalle', () => expect(P.kaavioSiirtoSallittu('luonnos', 'odottaa', valm)).toBe(true));
  it('odottaa→hyvaksytty vain hyväksyjältä', () => {
    expect(P.kaavioSiirtoSallittu('odottaa', 'hyvaksytty', valm)).toBe(false);
    expect(P.kaavioSiirtoSallittu('odottaa', 'hyvaksytty', vp)).toBe(true);
  });
  it('hylatty→odottaa sallittu (uusi kierros)', () => expect(P.kaavioSiirtoSallittu('hylatty', 'odottaa', valm)).toBe(true));
  it('seurasihteeri EI ole hyväksyjä', () => expect(P.kaavioOnHyvaksyja({ rooli: 'seurasihteeri', seuraId: 'fcl' })).toBe(false));
  it('urheilutoimenjohtaja ON hyväksyjä', () => expect(P.kaavioOnHyvaksyja({ rooli: 'urheilutoimenjohtaja' })).toBe(true));
});

describe('policy · uudelleenhyväksyntä', () => {
  const doc = { seuraId: 'fcl', review: { status: 'hyvaksytty', joukkueId: 'fcl_u12' } };
  it('valmentajan muokkaus pudottaa odottamaan', () => {
    expect(P.kaavioTilaMuokkauksenJalkeen(doc, { rooli: 'valmentaja', seuraId: 'fcl', joukkueet: ['fcl_u12'] })).toBe('odottaa');
  });
  it('VP:n muokkaus säilyttää hyväksynnän', () => {
    expect(P.kaavioTilaMuokkauksenJalkeen(doc, { rooli: 'vp', seuraId: 'fcl' })).toBe('hyvaksytty');
  });
  it('ei-hyväksytty pysyy omassa tilassaan', () => {
    expect(P.kaavioTilaMuokkauksenJalkeen({ review: { status: 'luonnos' } }, { rooli: 'valmentaja' })).toBe('luonnos');
  });
});

describe('policy · skooppi', () => {
  const doc = { seuraId: 'fcl', review: { status: 'luonnos', joukkueId: 'fcl_u12' } };
  it('toisen seuran valmentaja ei kirjoita', () => {
    expect(P.kaavioVoiKirjoittaa(doc, { rooli: 'valmentaja', seuraId: 'kpv', joukkueet: ['fcl_u12'] })).toBe(false);
  });
  it('toisen joukkueen valmentaja ei kirjoita', () => {
    expect(P.kaavioVoiKirjoittaa(doc, { rooli: 'valmentaja', seuraId: 'fcl', joukkueet: ['fcl_u14'] })).toBe(false);
  });
  it('oman joukkueen valmentaja kirjoittaa', () => {
    expect(P.kaavioVoiKirjoittaa(doc, { rooli: 'valmentaja', seuraId: 'fcl', joukkueet: ['fcl_u12'] })).toBe(true);
  });
  it('kanoniseen kirjoittaa vain SA', () => {
    const kan = { kanoninen: true };
    expect(P.kaavioVoiKirjoittaa(kan, { rooli: 'vp', seuraId: 'fcl' })).toBe(false);
    expect(P.kaavioVoiKirjoittaa(kan, { superAdmin: true })).toBe(true);
  });
});

describe('policy · kohdistus on UI-suodatin (EI pakotettu)', () => {
  it('joukkuekohdistus osuu vain oman joukkueen pelaajaan', () => {
    const d = { seuraId: 'fcl', review: { status: 'hyvaksytty', nakyvyys: 'joukkue', joukkueId: 'fcl_u12' } };
    expect(P.kaavioKohdistuu(d, { seuraId: 'fcl', joukkueet: ['fcl_u12'] })).toBe(true);
    expect(P.kaavioKohdistuu(d, { seuraId: 'fcl', joukkueet: ['fcl_u14'] })).toBe(false);
  });
  it('mutta LUKU sallii hyväksytyn silti — kohdistus ei ole turvaraja', () => {
    const d = { seuraId: 'fcl', review: { status: 'hyvaksytty', nakyvyys: 'joukkue', joukkueId: 'fcl_u12' } };
    expect(P.kaavioVoiLukea(d, { anon: true })).toBe(true);
    expect(P.kaavioKohdistuu(d, { seuraId: 'fcl', joukkueet: ['fcl_u14'] })).toBe(false);
  });
});
