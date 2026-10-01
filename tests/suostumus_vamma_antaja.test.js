/**
 * Suostumuslomake 1.10.2026: vammakentän poisto, suostumuksen antajan nimi pakolliseksi, Seura-kortin selkeys.
 * Lomakkeen ja Seura-kortin funktiot AJETAAN vm:ssä (DOM-tynkä); palvelinpuoli: tests/sisarusbugi.test.js.
 */
import { describe, it, expect } from 'vitest';
import { readFileSync, readdirSync } from 'fs';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';
import vm from 'vm';
import { fakeDb } from './_fakeFirestore.mjs';

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..');
const lue = (n) => readFileSync(join(ROOT, n), 'utf8');
const LOMAKE = lue('TalentMaster_Rekisterointi_Suostumus.html');
function pura(S, tunniste) {
  const alku = S.indexOf(tunniste);
  if (alku < 0) throw new Error('ei löydy: ' + tunniste);
  let d = 0;
  for (let j = S.indexOf(') {', alku) + 2; j < S.length; j++) {
    if (S[j] === '{') d++; else if (S[j] === '}') { d--; if (!d) return S.slice(alku, j + 1); }
  }
  throw new Error('sulkeet');
}

/* ── Vartija: vammakenttiä ei kirjoiteta eikä kysytä missään ── */
describe('vartija · vammahistoria poistettu (GDPR 9 art.)', () => {
  const KENTTA = /vammahistoria|loukkaantumishistoria|\bi_vam\b|(^|[^\w])(vammat|vamma)\s*:|['"](vammat|vamma)['"]/;
  const tiedostot = []
    .concat(readdirSync(ROOT).filter((f) => /\.(html|js)$/.test(f)))
    .concat(readdirSync(join(ROOT, 'functions')).filter((f) => f.endsWith('.js')).map((f) => 'functions/' + f))
    .concat(readdirSync(join(ROOT, 'lib')).filter((f) => f.endsWith('.js')).map((f) => 'lib/' + f));
  it('yksikään sovellus-, lib- tai funktiotiedosto ei sisällä vammakentän nimeä', () => {
    const osumat = tiedostot.filter((f) => KENTTA.test(lue(f)));
    expect(tiedostot.length).toBeGreaterThan(20);
    expect(osumat).toEqual([]);
  });
  it('suostumuslomakkeella ei ole vammakorttia eikä -tekstiä (fi); tm_lang ei sisällä vamma-avaimia (fi/en/sv)', () => {
    expect(LOMAKE).not.toMatch(/Vammahistoria|Aiemmat vammat|textarea id="i_vam"|vain valmentajat nähtävissä/);
    const lang = lue('lib/tm_lang.js');
    expect(lang).not.toMatch(/vammahist|i_vam|vammat_|skadehistorik|injury.?history/i);
  });
  it('poistunut piilosuostumus c7/ei_kaytossa ei ole enää lomakkeella', () => {
    expect(LOMAKE).not.toMatch(/id="c7"|ei_kaytossa/);
  });
});

/* ── Lomake ajettuna: huoltajakortti, validointi, lähetettävä data ── */
function lomake(arvot, ika) {
  const els = {};
  const luokat = (alku) => { const s = new Set(alku); return { add: (c) => s.add(c), remove: (c) => s.delete(c), contains: (c) => s.has(c), _s: s }; };
  const E = (id) => els[id] || (els[id] = { id, value: (arvot || {})[id] || '', checked: ['c1', 'c2'].includes(id), disabled: false, textContent: '', style: {},
    classList: luokat(id === 'hcard' ? ['card', 'hide'] : []), closest: () => null, parentNode: null, scrollIntoView() {} });
  const nyt = new Date();
  const syn = ika == null ? '' : (nyt.getUTCFullYear() - ika - 1) + '-01-15';
  if (syn) E('i_syn').value = syn;
  const loki = { kutsut: [], askel: [], toast: [] };
  const ctx = {
    el: E, toast: (m) => loki.toast.push(m), setStep: (n) => loki.askel.push(n), console: { error() {}, warn() {} },
    Date, Math, JSON, String, parseInt, parseFloat, isNaN, Object, Array, Promise,
    _fbDb: { collection: () => ({ doc: () => ({ collection: () => ({ doc: () => ({}) }) }) }) }, _seuraId: 'kpv', _pelaajaId: 'p1', _kutsuId: 'k1', _urlParams: { hEmail: 'h@x.fi' },
    firebase: { firestore: { FieldValue: { serverTimestamp: () => 'TS' } },
      app: () => ({ functions: () => ({ httpsCallable: () => (d) => { loki.kutsut.push(d); return new Promise(() => {}); } }) }) },
    document: { getElementById: () => null, createElement: () => ({ style: {}, setAttribute() {} }) },
    window: {}, setTimeout: (f) => f(),
  };
  vm.createContext(ctx);
  vm.runInContext('var _lahetysKaynnissa = false, _lahetettyOnnistuneesti = false;\n'
    + pura(LOMAKE, 'function val(id) {') + '\n' + pura(LOMAKE, 'function _ikaVuosina(d) {') + '\n' + pura(LOMAKE, 'function _naytaHuoltajakortti(age) {') + '\n'
    + pura(LOMAKE, 'function onAge() {') + '\n' + pura(LOMAKE, 'function toStep2() {') + '\n'
    + pura(LOMAKE, 'function _poistaRistiriitaIlmoitus() {') + '\n' + pura(LOMAKE, 'function _naytaRistiriitaIlmoitus(viesti) {') + '\n'
    + pura(LOMAKE, 'function _onPelaajaRistiriita(err) {') + '\n' + pura(LOMAKE, 'function toStep3() {')
    + '\nthis.t2 = toStep2; this.t3 = toStep3; this.onAge = onAge;', ctx);
  return { ctx, E, loki };
}

describe('lomake · huoltajakortti ja antajan nimi (ajettu)', () => {
  it('alaikäisen syntymäaika → huoltajakortti NÄKYY (hide-luokka pois; ennen style.display ei ohittanut !importantia)', () => {
    const t = lomake({}, 12);
    t.ctx.onAge();
    expect(t.E('hcard').classList.contains('hide')).toBe(false);
    const a = lomake({}, 25); a.ctx.onAge();
    expect(a.E('hcard').classList.contains('hide')).toBe(true);
  });
  it('CSS: .hide on !important ja huoltajakortin näkyvyys vaihdetaan luokalla, ei style.displaylla', () => {
    expect(LOMAKE).toMatch(/\.hide\{display:none!important;\}/);
    expect(LOMAKE).not.toMatch(/el\('hcard'\)\.style\.display/);
  });
  it('alaikäinen ilman huoltajan nimeä → vaihe 2 ei avaudu; nimellä avautuu', () => {
    const t = lomake({ i_etu: 'Topias', i_suku: 'Koskela', h_email: 'h@x.fi' }, 12);
    t.ctx.t2();
    expect(t.loki.askel).toEqual([]);
    expect(t.E('h_etu').classList.contains('err')).toBe(true);
    const ok = lomake({ i_etu: 'Topias', i_suku: 'Koskela', h_etu: 'Tero', h_suku: 'Koskela', h_email: 'h@x.fi' }, 12);
    ok.ctx.t2();
    expect(ok.loki.askel).toEqual([2]);
  });
  it('lähetys ilman huoltajan nimeä → EI kutsua palvelimelle', () => {
    const t = lomake({ i_etu: 'Topias', i_suku: 'Koskela', h_email: 'h@x.fi' }, 12);
    t.ctx.t3();
    expect(t.loki.kutsut).toEqual([]);
  });
  it('lähetys nimellä → antaja = huoltajan nimi; datassa EI vammakenttää', () => {
    const t = lomake({ i_etu: 'Topias', i_suku: 'Koskela', h_etu: 'Tero', h_suku: 'Koskela', h_email: 'h@x.fi' }, 12);
    t.ctx.t3();
    expect(t.loki.kutsut).toHaveLength(1);
    const d = t.loki.kutsut[0];
    expect(d).toMatchObject({ antaja: 'Tero Koskela', antajaRooli: 'huoltaja' });
    expect(JSON.stringify(d)).not.toMatch(/vamma|loukkaant/i);
    expect(d.suostumusMap).not.toHaveProperty('ei_kaytossa');
  });
  it('täysi-ikäinen → antaja = oma nimi, huoltajan nimeä ei vaadita', () => {
    const t = lomake({ i_etu: 'Aino', i_suku: 'Aikuinen' }, 25);
    t.ctx.t3();
    expect(t.loki.kutsut[0]).toMatchObject({ antaja: 'Aino Aikuinen', antajaRooli: 'itse' });
  });
});

/* ── Seura-kortti ajettuna ── */
async function seuraKortti(pelaaja, kutsut) {
  const S = lue('TalentMaster_Seura.html');
  const alku = { 'seurat/kpv/pelaajat/p1': pelaaja };
  (kutsut || []).forEach((k, i) => { alku['seurat/kpv/kutsut/k' + i] = k; });
  const f = fakeDb(alku);
  const modal = { classList: { add() {} }, innerHTML: '' };
  const ctx = {
    db: f.db, tila: { seuraId: 'kpv' }, console: { warn() {} }, naytaToast() {}, Date, Object, JSON, String, Array, Promise,
    document: { getElementById: () => modal, createElement: () => modal, body: { appendChild() {} } },
  };
  vm.createContext(ctx);
  vm.runInContext(pura(S, 'async function naytaPelaajaTiedot(pelaajaId) {') + '\nthis.nayta = naytaPelaajaTiedot;', ctx);
  await ctx.nayta('p1').catch(() => {});
  return modal.innerHTML;
}
const TS = (iso) => ({ seconds: Date.parse(iso) / 1000 });
describe('Seura-kortti · suostumukset, antaja, kutsuhistoria (ajettu)', () => {
  const P = { etunimi: 'Topias', sukunimi: 'Koskela', joukkue: 'KPV U13', suostumusTila: 'annettu', huoltajaEmail: 'h@x.fi',
    suostumus: { annettu: TS('2026-10-01T06:37:44Z'), antaja: 'Tero Koskela',
      hyvaksytyt: { anon_data: false, ei_kaytossa: false, valmentajajako: true, rekisteri: true, tietosuoja: true, testaaminen: true, biologinen_ika: true } } };
  it('selkokieliset nimet lomakkeen järjestyksessä; ei_kaytossa ei näy; antaja näkyy', async () => {
    const h = await seuraKortti(P, []);
    const nimet = ['Tietojen tallentaminen rekisteriin', 'Tietosuojaseloste luettu', 'Testaaminen ja kehitysseuranta',
      'Biologisen iän arviointi', 'Tietojen jakaminen valmentajille', 'Anonyymi tilastokäyttö'];
    const paikat = nimet.map((n) => h.indexOf(n));
    expect(paikat.every((x) => x > 0)).toBe(true);
    expect([...paikat].sort((a, b) => a - b)).toEqual(paikat);
    expect(h).not.toMatch(/ei_kaytossa|valmentajajako<|anon_data</);
    expect(h).toMatch(/Antaja: <strong[^>]*>Tero Koskela<\/strong>/);
  });
  it('antaja vanhoista kentistä varalla (suostumuksenAntaja → huoltaja-objekti)', async () => {
    const vanha = Object.assign({}, P, { suostumus: Object.assign({}, P.suostumus, { antaja: null }), suostumuksenAntaja: 'Vanha Kenttä' });
    expect(await seuraKortti(vanha, [])).toMatch(/Antaja: <strong[^>]*>Vanha Kenttä</);
    const obj = Object.assign({}, P, { suostumus: Object.assign({}, P.suostumus, { antaja: null }), huoltaja: { etunimi: 'Olio', sukunimi: 'Huoltaja' } });
    expect(await seuraKortti(obj, [])).toMatch(/Antaja: <strong[^>]*>Olio Huoltaja</);
  });
  it('kutsuhistoria uusin ensin', async () => {
    const h = await seuraKortti(P, [
      { pelaajaId: 'p1', hEmail: 'a@x.fi', luotu: TS('2026-09-30T17:17:00Z'), tila: 'odottaa' },
      { pelaajaId: 'p1', hEmail: 'b@x.fi', luotu: TS('2026-10-01T06:30:00Z'), tila: 'hyvaksytty' },
    ]);
    expect(h.indexOf('b@x.fi')).toBeGreaterThan(0);
    expect(h.indexOf('b@x.fi')).toBeLessThan(h.indexOf('a@x.fi'));
  });
});
