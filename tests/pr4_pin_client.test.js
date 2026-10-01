/**
 * PR 4 · selainpinnat: Seura (tunnusten jako), Admin, Pelaaja_v7 (6-numeroinen PIN), Vanhempi_v2.
 * Seuran funktiot AJETAAN vm:ssä oikeasta lähteestä; tyngät nimetty kuten tuotannon muuttujat.
 */
import { describe, it, expect } from 'vitest';
import { readFileSync } from 'fs';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';
import vm from 'vm';

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..');
const lue = (n) => readFileSync(join(ROOT, n), 'utf8');
const SEURA = lue('TalentMaster_Seura.html');
const ADMIN = lue('TalentMaster_Admin.html');
const PEL = lue('TalentMaster_Pelaaja_v7.html');
const VAN = lue('TalentMaster_Vanhempi_v2.html');
const riisu = (s) => s.replace(/<!--[\s\S]*?-->/g, ' ').replace(/\/\*[\s\S]*?\*\//g, ' ').replace(/(^|[^:"'])\/\/[^\n]*/g, '$1 ');

function pura(S, tunniste) {
  const alku = S.indexOf(tunniste);
  if (alku < 0) throw new Error('ei löydy: ' + tunniste);
  let d = 0;
  for (let j = S.indexOf(') {', alku) + 2; j < S.length; j++) {
    if (S[j] === '{') d++; else if (S[j] === '}') { d--; if (!d) return S.slice(alku, j + 1); }
  }
  throw new Error('sulkeet');
}

const PELAAJAT = [
  { id: 'a1', etunimi: 'Aino', sukunimi: 'Aalto', joukkueet: ['kpv_u13'], joukkueNimi: 'KPV U13', tunniste: '11111111', pin: '482915', huoltajaEmail: 'a@x.fi', syntymaVuosi: 2013, huoltaja: { puhelin: '040' } },
  { id: 'b2', etunimi: 'Bea', sukunimi: 'Berg', joukkueet: ['kpv_u13'], joukkueNimi: 'KPV U13', pin: '9278' },
  { id: 'c3', etunimi: 'Cee', sukunimi: 'Cox', joukkueet: ['kpv_u13'], joukkueNimi: 'KPV U13', huoltajaEmail: 'c@x.fi' },
  { id: 'd4', etunimi: 'Dee', sukunimi: 'Dahl', joukkueet: ['kpv_u15'], joukkueNimi: 'KPV U15', pin: '135790', huoltajaEmail: 'd@x.fi' },
];

function ajaSeura({ valitut = [], joukkue = '', vahvista = true } = {}) {
  const loki = { kutsut: [], toast: [], confirm: [] };
  const ctx = {
    window: { _pelaajatKaikki: PELAAJAT.map((p) => Object.assign({}, p)), _aktiiviJoukkue: joukkue },
    document: {
      querySelectorAll: () => valitut.map((v) => ({ value: v })),
      getElementById: () => null,
    },
    location: { href: 'https://tm.example/talentmaster/TalentMaster_Seura.html' },
    URL, encodeURIComponent, String, Object, Array, Promise, console: { warn() {} },
    tila: { seuraId: 'kpv', seuraNimi: 'KPV' },
    naytaToast: (t, l) => loki.toast.push([t, l]),
    confirm: (t) => { loki.confirm.push(t); return vahvista; },
    renderPelaajat: () => Promise.resolve(),
    setTimeout: () => {},
    firebase: { app: () => ({ functions: () => ({ httpsCallable: (nimi) => async (data) => {
      loki.kutsut.push([nimi, data]);
      if (nimi === 'luoPinitSeuralle') return { data: data.kuivaAjo ? { luotaisiin: 2 } : { luotu: 2 } };
      if (nimi === 'asetaPelaajanPin') return { data: { pin: '700123' } };
      return { data: { ok: true } };
    } }) }) },
  };
  vm.createContext(ctx);
  const osat = ['function _pinFn(nimi) {', 'function _pinVirheTeksti(e) {', 'function _paivitaPinPaikallisesti(pelaajaId, pin) {',
    'function _tunnusKohde() {', 'function _tunnusTila(t) {', 'function _pelaajaLinkki(p) {', 'function _pinPalloId(p) {',
    'async function luoPuuttuvatPinit() {', 'function _pinKortitHtml(kortit) {', 'async function lahetaTunnuksetHuoltajille() {'];
  vm.runInContext(osat.map((o) => pura(SEURA, o)).join('\n')
    + '\nthis.kohde=_tunnusKohde; this.luo=luoPuuttuvatPinit; this.kortit=_pinKortitHtml; this.laheta=lahetaTunnuksetHuoltajille; this.linkki=_pelaajaLinkki;', ctx);
  return { loki, ctx };
}

describe('Seura · tunnusten jako (ajettu)', () => {
  it('kohde: valitut → aktiivinen joukkue → koko seura', () => {
    expect(ajaSeura({ valitut: ['a1', 'd4'] }).ctx.kohde()).toMatchObject({ kuvaus: '2 valittua pelaajaa', valitut: true });
    const j = ajaSeura({ joukkue: 'kpv_u13' }).ctx.kohde();
    expect(j.lista.map((p) => p.id)).toEqual(['a1', 'b2', 'c3']);
    expect(j).toMatchObject({ joukkue: 'kpv_u13', kuvaus: 'joukkue KPV U13' });
    expect(ajaSeura().ctx.kohde().lista).toHaveLength(4);
  });
  it('Luo puuttuvat PIN-koodit (joukkue): kuiva-ajo → vahvistus lukumäärällä → luoPinitSeuralle', async () => {
    const { loki, ctx } = ajaSeura({ joukkue: 'kpv_u13' });
    await ctx.luo();
    expect(loki.kutsut).toEqual([
      ['luoPinitSeuralle', { kuivaAjo: true, seuraId: 'kpv', vainPuuttuvat: true, joukkue: 'kpv_u13' }],
      ['luoPinitSeuralle', { seuraId: 'kpv', vainPuuttuvat: true, joukkue: 'kpv_u13' }],
    ]);
    expect(loki.confirm[0]).toContain('2 pelaajalle (joukkue KPV U13)');
  });
  it('peruttu vahvistus → ei luontia', async () => {
    const { loki, ctx } = ajaSeura({ vahvista: false });
    await ctx.luo();
    expect(loki.kutsut.map((k) => k[1].kuivaAjo)).toEqual([true]);
  });
  it('valitut: asetaPelaajanPin vain niille, joilta PIN puuttuu', async () => {
    const { loki, ctx } = ajaSeura({ valitut: ['a1', 'c3'] });
    await ctx.luo();
    expect(loki.kutsut).toEqual([['asetaPelaajanPin', { seuraId: 'kpv', pelaajaId: 'c3' }]]);
    expect(ctx.window._pelaajatKaikki.find((p) => p.id === 'c3').pin).toBe('700123');
  });
  it('PIN-kortit: 8 / A4-sivu; vain nimi, joukkue, PalloID, PIN ja QR — ei sähköpostia, syntymävuotta eikä puhelinta', () => {
    const { ctx } = ajaSeura();
    const kortit = Array.from({ length: 11 }, (_, i) => ({ nimi: 'Pelaaja ' + i, joukkue: 'KPV U13', palloId: i === 0 ? '11111111' : '', pin: '48291' + (i % 10), qr: 'data:image/png;base64,QR' }));
    const h = ctx.kortit(kortit);
    expect((h.match(/class="s"/g) || []).length).toBe(2);
    expect((h.match(/class="k"/g) || []).length).toBe(11);
    expect(h).toContain('Skannaa ja syötä PIN');
    expect(h).toContain('11111111');
    const runko = h.slice(h.indexOf('<body>'));   // korttien sisältö (tyylilohkon @page ei ole henkilötietoa)
    expect(runko).not.toMatch(/@|2013|040/);
    expect(h).toContain('@page{size:A4');
    expect(ctx.kortit([{ nimi: '<script>x</script>', joukkue: '', palloId: '', pin: '1', qr: '' }])).not.toContain('<script>x');
  });
  it('QR-linkki = henkilökohtainen ?p=&seura= (Pelaaja_v7 → pelkkä PIN)', () => {
    expect(ajaSeura().ctx.linkki({ id: 'a1' })).toBe('https://tm.example/talentmaster/TalentMaster_Pelaaja_v7.html?p=a1&seura=kpv');
  });
  it('Lähetä tunnukset: vain pelaajat, joilla huoltajaEmail JA PIN; ohitetut näytetään; sarjassa', async () => {
    const { loki, ctx } = ajaSeura({ joukkue: 'kpv_u13' });
    await ctx.laheta();
    expect(loki.confirm[0]).toMatch(/1 huoltajalle[\s\S]*1 ohitetaan: ei huoltajan sähköpostia[\s\S]*1 ohitetaan: ei PIN:iä/);
    expect(loki.kutsut).toEqual([['lahetaPelaajaSivuLinkki', expect.objectContaining({ pelaajaId: 'a1', hEmail: 'a@x.fi', seuraId: 'kpv' })]]);
    expect(loki.toast.at(-1)[0]).toMatch(/1 huoltajalle · 1 ilman sähköpostia · 1 ilman PIN:iä/);
  });
});

describe('PR 4 · vartijat selainpinnoissa', () => {
  it('Seura ja Admin EIVÄT kirjoita pin-kenttää Firestoreen (vain asetaPelaajanPin / luoPinitSeuralle)', () => {
    for (const [nimi, S] of [['Seura', SEURA], ['Admin', ADMIN]]) {
      const K = riisu(S);
      expect(K, nimi).not.toMatch(/\.update\(\{\s*pin\b/);
      expect(K, nimi).not.toMatch(/\.(update|set)\(\{[^}]*\bpin\s*[:,}]/);   // Firestore-kirjoitus pin-kentällä
      expect(K, nimi).not.toMatch(/Math\.floor\(1000 \+ Math\.random\(\) \* 9000\)/);
    }
    // P2 (1.10.2026): Adminin Hallinnoi-modaalin PIN-osio poistettu — PIN vain pelaajakortilta Seura-sivulla.
    expect(riisu(ADMIN)).not.toContain('ktPinInput');
    expect(riisu(SEURA)).toContain("_pinFn('asetaPelaajanPin')");
    expect(riisu(SEURA)).toContain("_pinFn('luoPinitSeuralle')");
    expect(riisu(SEURA)).not.toMatch(/function (luoPelaajaPIN|tallennaPelaajaPIN)\(/);
  });
  it('Pelaaja_v7: 6 PIN-ruutua, automaattinen lähetys 6. numerolla, OK-nappi 4 numeron jälkeen', () => {
    expect(PEL).toContain('[0,1,2,3,4,5].map(i=>');
    expect(PEL).toContain('else if(_pin.length<6){_pin+=k;}');
    expect(PEL).toContain('if(_pin.length===6){setTimeout(()=>_kirjaudu(_pin),280);}');
    expect(PEL).toContain("if(k==='ok'){ if(_pin.length===4) _kirjaudu(_pin); return; }");
    expect(PEL).toContain('id="pinOk" data-k="ok"');
  });
  it('Vanhempi_v2: kortti hyväksyy 4- ja 6-numeroisen PIN:n', () => {
    expect(VAN).toContain('/^([0-9]{4}|[0-9]{6})$/.test(String(L.pin))');
  });
});
