/**
 * "Tulosta kortit" (1.10.2026, Tero KPV T18 Safari/Chrome): window.open() oli confirm():in JÄLKEEN → selain esti
 * ponnahduksen. Nyt ikkuna avataan HETI, vahvistus näytetään ikkunassa, edistyminen ja virhe kirjoitetaan ikkunaan,
 * ja luoSuostumusKortit käsittelee pelaajat rinnakkain (10 kerrallaan).
 */
import { describe, it, expect } from 'vitest';
import { readFileSync } from 'fs';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';
import { createRequire } from 'module';
import vm from 'vm';

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..');
const require_ = createRequire(import.meta.url);
const SEURA = readFileSync(join(ROOT, 'TalentMaster_Seura.html'), 'utf8');
const SK = require_('../functions/suostumuskortit.js');
const pura = (t) => { const a = SEURA.indexOf(t); if (a < 0) throw new Error(t); let d = 0; for (let j = SEURA.indexOf(') {', a) + 2; j < SEURA.length; j++) { if (SEURA[j] === '{') d++; else if (SEURA[j] === '}') { d--; if (!d) return SEURA.slice(a, j + 1); } } throw new Error(t); };

/* Ikkunatynkä: tallentaa jokaisen kirjoitetun sivun; Tulosta/Peruuta-napit "painetaan" vastauksen mukaan. */
function ikkuna(vastaus) {
  const w = { sivut: [], suljettu: false, get closed() { return this.suljettu; }, close() { this.suljettu = true; } };
  let nyt = '';
  w.document = {
    open() { nyt = ''; }, write(h) { nyt += h; }, close() { w.sivut.push(nyt); },
    getElementById(id) {
      if (id !== 'tkJatka' && id !== 'tkPeru') return null;
      return { addEventListener: (_e, f) => {
        if (vastaus === 'jatka' && id === 'tkJatka') Promise.resolve().then(f);
        if (vastaus === 'peru' && id === 'tkPeru') Promise.resolve().then(f);
        if (vastaus === 'sulje' && id === 'tkJatka') w.suljettu = true;
      } };
    },
  };
  return w;
}
function ymp({ pelaajat, vastaus = 'jatka', estetty = false, palvelin }) {
  const loki = { jarjestys: [], kutsut: [], toast: [] };
  const w = estetty ? null : ikkuna(vastaus);
  const ctx = {
    window: { _pelaajatKaikki: pelaajat, _aktiiviJoukkue: '', open: () => { loki.jarjestys.push('open'); return w; } },
    document: { querySelectorAll: () => { loki.jarjestys.push('kohde'); return []; }, getElementById: () => null },
    location: { href: 'https://tm/TalentMaster_Seura.html' }, URL, encodeURIComponent, String, Object, Array, Promise, RegExp,
    console: { warn() {} }, tila: { seuraId: 'kpv', seuraNimi: 'KPV' }, naytaToast: (t, l) => loki.toast.push([t, l]),
    confirm: () => { throw new Error('confirm() ei saa olla käytössä'); },
    renderPelaajat: () => Promise.resolve(), setTimeout: () => {}, setInterval: (f, ms) => setInterval(f, ms), clearInterval,
    _lataaQrKirjasto: async () => {}, _qrDataUrl: (t) => 'QR:' + t,
    firebase: { app: () => ({ functions: () => ({ httpsCallable: (nimi) => async (d) => { loki.kutsut.push([nimi, d.pelaajaIds.length]); return palvelin(d); } }) }) },
  };
  ctx.open = ctx.window.open;
  vm.createContext(ctx);
  vm.runInContext(SEURA.match(/const PIN_SUOSTUMUS_PUUTTUU = '[^']*';/)[0].replace('const', 'var') + '\n'
    + 'var KORTTI_ERA = ' + SEURA.match(/const KORTTI_ERA = (\d+);/)[1] + ';\n'
    + ['function _tkKieli(avain, kieli, fi, muuttujat) {', 'function _tk(avain, fi, muuttujat) {', 'function _suostumusAnnettu(p) {', 'function _pinFn(nimi) {',
      'function _pinVirheTeksti(e) {', 'function _tunnusKohde() {', 'function _pelaajaLinkki(p) {', 'function _pinPalloId(p) {', 'function _suostumusLinkki(pelaajaId, kutsuId) {',
      'function _pinKortitHtml(kortit) {', 'function _korttiIkkuna(w, otsikko, teksti, napit) {', 'function _korttiVahvistus(w, otsikko, teksti) {',
      'async function tulostaKortit() {'].map(pura).join('\n') + '\nthis.tulosta = tulostaKortit;', ctx);
  return { ctx, loki, w };
}
const kutsuPalvelin = (d) => ({ data: { kortit: d.pelaajaIds.map((p) => ({ pelaajaId: p, tyyppi: 'suostumuskortti', kutsuId: 'K-' + p })) } });
const POHJA = (n) => [{ id: 'ok', etunimi: 'Topias', sukunimi: 'K', pin: '482915', huoltajaEmail: 'h@tm-testi.fi', suostumusTila: 'annettu' }]
  .concat(Array.from({ length: n }, (_, i) => ({ id: 'p' + i, etunimi: 'P' + i, sukunimi: 'S', huoltajaEmail: 'x' + i + '@tm-testi.fi', suostumusTila: 'pilotti' })))
  .concat([{ id: 'eiemail', etunimi: 'Ilman', sukunimi: 'E', suostumusTila: 'pilotti' }]);

describe('Tulosta kortit · ikkuna ensin (ajettu)', () => {
  it('window.open on ENSIMMÄINEN toimenpide (ennen kohdejoukkoa, palvelinkutsua tai vahvistusta); ei confirm():ia', async () => {
    const { ctx, loki, w } = ymp({ pelaajat: POHJA(3), palvelin: kutsuPalvelin });
    await ctx.tulosta();
    expect(loki.jarjestys[0]).toBe('open');
    expect(w.sivut[0]).toContain('Valmistellaan kortteja…');
    expect(SEURA.slice(SEURA.indexOf('async function tulostaKortit() {'), SEURA.indexOf('/* Lähetä tunnukset huoltajille:'))).not.toMatch(/\bconfirm\(/);
  });
  it('vahvistus ikkunassa (yhteenveto + Tulosta/Peruuta) → Tulosta → kortit samaan ikkunaan', async () => {
    const { ctx, w } = ymp({ pelaajat: POHJA(3), palvelin: kutsuPalvelin });
    await ctx.tulosta();
    const vahvistus = w.sivut.find((h) => h.includes('id="tkJatka"'));
    expect(vahvistus).toContain('1 pelaajakorttia, 3 suostumuskorttia, 1 ilman huoltajan sähköpostia.');
    expect(vahvistus).toContain('>Tulosta</button>'); expect(vahvistus).toContain('>Peruuta</button>');
    const viimeinen = w.sivut[w.sivut.length - 1];
    expect(viimeinen).toContain('482915'); expect(viimeinen).toContain('kutsuId=K-p0');
    expect(w.closed).toBe(false);
  });
  it('Peruuta → ikkuna suljetaan, ei palvelinkutsua', async () => {
    const { ctx, loki, w } = ymp({ pelaajat: POHJA(3), vastaus: 'peru', palvelin: kutsuPalvelin });
    await ctx.tulosta();
    expect(w.closed).toBe(true); expect(loki.kutsut).toEqual([]);
  });
  it('käyttäjä sulkee ikkunan vahvistuksen aikana → peruutus, ei palvelinkutsua', async () => {
    const { ctx, loki } = ymp({ pelaajat: POHJA(3), vastaus: 'sulje', palvelin: kutsuPalvelin });
    await ctx.tulosta();
    expect(loki.kutsut).toEqual([]);
  });
  it('edistyminen "Luodaan suostumuskortteja… X/N" 10 pelaajan erissä (25 → 3 kutsua)', async () => {
    const { ctx, loki, w } = ymp({ pelaajat: POHJA(25), palvelin: kutsuPalvelin });
    await ctx.tulosta();
    expect(loki.kutsut.map(([, n]) => n)).toEqual([10, 10, 5]);
    for (const x of ['0/25', '10/25', '20/25']) expect(w.sivut.some((h) => h.includes('Luodaan suostumuskortteja… ' + x))).toBe(true);
    expect(w.sivut.some((h) => h.includes('Luodaan QR-koodeja…'))).toBe(true);
  });
  it('virhe kirjoitetaan ikkunaan (ikkunaa ei suljeta hiljaa) + toast', async () => {
    const { ctx, loki, w } = ymp({ pelaajat: POHJA(3), palvelin: () => { throw Object.assign(new Error('Ei oikeutta tämän seuran pelaajiin.'), { code: 'functions/permission-denied' }); } });
    await ctx.tulosta();
    expect(w.closed).toBe(false);
    const viimeinen = w.sivut[w.sivut.length - 1];
    expect(viimeinen).toContain('Korttien teko epäonnistui'); expect(viimeinen).toContain('ei oikeutta tälle pelaajalle');
    expect(loki.toast[0][1]).toBe('virhe');
  });
  it('ponnahdus estetty → selkeä ohje, ei muuta', async () => {
    const { ctx, loki } = ymp({ pelaajat: POHJA(3), estetty: true, palvelin: kutsuPalvelin });
    await ctx.tulosta();
    expect(loki.toast).toEqual([['Selain esti tulostusikkunan. Salli ponnahdusikkunat tälle sivulle ja paina uudelleen.', 'virhe']]);
    expect(loki.kutsut).toEqual([]);
  });
  it('ei tulostettavaa → syy ikkunaan (ei tyhjää sivua)', async () => {
    const { ctx, w } = ymp({ pelaajat: [{ id: 'eiemail', etunimi: 'I', suostumusTila: 'pilotti' }], palvelin: kutsuPalvelin });
    await ctx.tulosta();
    expect(w.sivut[w.sivut.length - 1]).toContain('Ei tulostettavia kortteja');
  });
});

/* luoSuostumusKortit: rinnakkain 10 kerrallaan. Mittaus viiveellisellä tyngällä (jokainen Firestore-kierros L ms). */
describe('luoSuostumusKortit · rinnakkaisuus ja kesto 33 pelaajalla', () => {
  class HttpsError extends Error { constructor(c, m) { super(m); this.code = c; } }
  function hidasDb(L, n) {
    const odota = () => new Promise((r) => setTimeout(r, L));
    const pelaajat = Object.fromEntries(Array.from({ length: n }, (_, i) => ['p' + i, { joukkueet: ['kpv_t18'], huoltajaEmail: 'h' + i + '@tm-testi.fi', suostumusTila: 'pilotti' }]));
    let auto = 0;
    const kokoelma = (nimi) => ({
      doc: (id) => ({ get: async () => { await odota(); const d = nimi === 'pelaajat' ? pelaajat[id] : null; return { exists: !!d, data: () => d }; },
        update: async () => { await odota(); } }),
      where: () => ({ get: async () => { await odota(); return { docs: [] }; } }),
      add: async () => { await odota(); return { id: 'k' + (++auto) }; },
    });
    return { collection: () => ({ doc: () => ({ collection: kokoelma }) }) };
  }
  it('33 pelaajaa (uusi kutsu jokaiselle, 4 kierrosta/pelaaja): rinnakkain ≤ ~4 erää, ei 33 × 4 peräkkäistä', async () => {
    const L = 40, N = 33;
    const fn = SK.luoKasittelija({ db: hidasDb(L, N), HttpsError, FieldValue: { serverTimestamp: () => 'TS' }, tarkistaOikeus: async () => ({ sallittu: true }) });
    const alku = Date.now();
    const r = await fn({ seuraId: 'kpv', pelaajaIds: Array.from({ length: N }, (_, i) => 'p' + i) }, { auth: { uid: 'vp', token: { seuraId: 'kpv', rooli: 'vp' } } });
    const kesto = Date.now() - alku;
    const sarjassa = N * 4 * L;                                   // 5280 ms vanhalla sarjakäsittelyllä
    const odotettu = Math.ceil(N / SK.RINNAKKAIN) * 4 * L;         // 4 erää × 4 kierrosta = 640 ms
    console.log(`[mittaus] 33 pelaajaa, ${L} ms/kierros: ${kesto} ms (sarjassa olisi ~${sarjassa} ms, odotettu ~${odotettu} ms)`);
    expect(r.kortit).toHaveLength(N);
    expect(r.kortit.map((k) => k.pelaajaId)).toEqual(Array.from({ length: N }, (_, i) => 'p' + i));   // järjestys säilyy
    expect(r.luotu).toBe(N);
    expect(kesto).toBeLessThan(sarjassa / 3);
  }, 20000);
});
