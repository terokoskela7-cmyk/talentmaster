/**
 * P1 (1.10.2026) · Tallennettu XSS Adminissa ja Seura-kortissa.
 * - lib/tm_esc.js: jaettu escape
 * - vartija: Admin.html:n innerHTML-templaateissa ei käyttäjäperäistä ${p./k./r./s./t./h.}-interpolointia ilman esc(:iä,
 *   eikä arvoja upoteta onclick-merkkijonoihin (sallitut poikkeukset: uid / seuraId / r.id = turvallinen merkistö)
 * - Seura-kortti ajettuna haitallisella nimellä ja heittomerkillä
 * - vahvistaSuostumus: antajan nimi < > hylätään, > 100 merkkiä hylätään, O'Koskela kelpaa; muut lomakekentät siivotaan
 */
import { describe, it, expect } from 'vitest';
import { readFileSync } from 'fs';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';
import { createRequire } from 'module';
import vm from 'vm';
import { fakeDb } from './_fakeFirestore.mjs';

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..');
const require_ = createRequire(import.meta.url);
const lue = (n) => readFileSync(join(ROOT, n), 'utf8');
const { tmEsc } = require_(join(ROOT, 'lib', 'tm_esc.js'));
const ADMIN = lue('TalentMaster_Admin.html');

describe('lib/tm_esc.js', () => {
  it('escapettaa HTML- ja attribuuttimerkit; null → tyhjä', () => {
    expect(tmEsc('<img src=x onerror=alert(1)>')).toBe('&lt;img src=x onerror=alert(1)&gt;');
    expect(tmEsc(`"O'Brien" & \``)).toBe('&quot;O&#39;Brien&quot; &amp; &#96;');
    expect(tmEsc(null)).toBe('');
    expect(tmEsc(42)).toBe('42');
  });
  it('ladataan Adminiin ja Seuraan', () => {
    expect(ADMIN).toContain('<script src="lib/tm_esc.js?v=1"></script>');
    expect(lue('TalentMaster_Seura.html')).toContain('<script src="lib/tm_esc.js?v=1"></script>');
  });
});

describe('vartija · Admin.html', () => {
  it('ei suoraa käyttäjäkentän ${x.kenttä}-interpolointia ilman esc(:iä (luvut ja ehtolausekkeet sallittu)', () => {
    const NUMEROT = new Set(['pelaajia', 'suostumus', 'length', 'size']);
    const osumat = [...ADMIN.matchAll(/\$\{\s*(p|k|r|s|t|j|h)\.([a-zA-Z_]+)\s*(\|\|\s*'[^']*'\s*)?\}/g)]
      .filter((m) => !NUMEROT.has(m[2]))
      // tekstikonteksti (confirm/textContent): rivit 'status.textContent' ja _emR-taulukko ovat tekstiä, ei HTML:ää
      .filter((m) => { const rivi = ADMIN.slice(ADMIN.lastIndexOf('\n', m.index), ADMIN.indexOf('\n', m.index)); return !/textContent|_emR\[/.test(rivi); });
    expect(osumat.map((m) => m[0])).toEqual([]);
  });
  it('ei käyttäjäkenttiä merkkijonoliitoksella HTML:ään ilman esc(:iä', () => {
    // suora merkkijonopala: '...' + x.kenttä + '...' (esc(...)/_attr(...)-kääreen sisällä olevat eivät osu)
    const osumat = ADMIN.match(/'\s*\+\s*(p|k|r|s|t)\.(nimi|etunimi|sukunimi|email|huoltajaEmail|joukkue|paketti|virhe|blok|toim)\s*\+\s*'/g) || [];
    expect(osumat).toEqual([]);
  });
  it('onclickiin ei upoteta arvoja (vain uid / seuraId / r.id -poikkeukset)', () => {
    const tl = [...ADMIN.matchAll(/onclick="[^"]*'\$\{([^}]*)\}'/g)].map((m) => m[1]);
    expect(tl).toEqual([]);
    const liitos = [...ADMIN.matchAll(/onclick="[^"]*?\\'' \+ ([a-zA-Z_.]+) \+ '\\'/g)].map((m) => m[1]);
    expect(liitos.filter((x) => !['uid', 'seuraId', 'r.id'].includes(x))).toEqual([]);
  });
  it('käyttäjälistan ja hallintamodaalin napit käyttävät data-attribuutteja (O\'Brien ei riko)', () => {
    expect(ADMIN).toMatch(/onclick="avaaKayttajaToiminnot\(this\.dataset\.uid, this\.dataset\.seura, this\.dataset\.email, this\.dataset\.rooli, this\.dataset\.nimi\)"/);
    expect(ADMIN).toMatch(/data-email="\$\{esc\(k\.email\)\}" onclick="lahetaSalasananVaihto\(this\.dataset\.email\)"/);
    expect(ADMIN).toMatch(/data-joukkue="\$\{esc\(j\)\}" onclick="lataaPelaajatJoukkue\(this\.dataset\.joukkue\)"/);
  });
});

/* ── Seura-kortti ajettuna ── */
function pura(S, tunniste) {
  const alku = S.indexOf(tunniste);
  let d = 0;
  for (let j = S.indexOf(') {', alku) + 2; j < S.length; j++) { if (S[j] === '{') d++; else if (S[j] === '}') { d--; if (!d) return S.slice(alku, j + 1); } }
  throw new Error(tunniste);
}
async function seuraKortti(pelaaja, kutsut) {
  const S = lue('TalentMaster_Seura.html');
  const alku = { 'seurat/kpv/pelaajat/p1': pelaaja };
  (kutsut || []).forEach((k, i) => { alku['seurat/kpv/kutsut/k' + i] = k; });
  const f = fakeDb(alku);
  const modal = { classList: { add() {} }, innerHTML: '' };
  const ctx = {
    db: f.db, tila: { seuraId: 'kpv', rooli: 'superadmin' }, console: { warn() {} }, naytaToast() {}, Date, Object, JSON, String, Array, Promise,
    encodeURIComponent, window: { tmEsc }, document: { getElementById: () => modal, createElement: () => modal, body: { appendChild() {} } },
  };
  vm.createContext(ctx);
  vm.runInContext(pura(S, 'async function naytaPelaajaTiedot(pelaajaId) {') + '\nthis.nayta = naytaPelaajaTiedot;', ctx);
  await ctx.nayta('p1');
  return { h: modal.innerHTML, pkd: ctx.window._pkd };
}
describe('Seura-kortti (ajettu) · haitallinen sisältö ei suoriudu', () => {
  const P = { etunimi: "<img src=x onerror=alert(1)>", sukunimi: "O'Brien", joukkue: "KPV '13", huoltajaEmail: 'h@x.fi', suostumusTila: 'annettu',
    suostumus: { annettu: { seconds: 1 }, antaja: 'Tero <b>Koskela</b>', hyvaksytyt: { rekisteri: true, '<script>x</script>': true } },
    huoltaja: { etunimi: '<svg/onload=1>', sukunimi: 'H', puhelin: '"><i>' } };
  it('nimet, antaja, huoltaja, tuntematon suostumusavain ja kutsun sähköposti escapetaan', async () => {
    const { h } = await seuraKortti(P, [{ pelaajaId: 'p1', hEmail: '<u>k@x.fi</u>', tila: 'odottaa' }]);
    expect(h).not.toMatch(/<img|<b>Koskela|<svg|<script>|<u>k@|"><i>/);
    expect(h).toContain('&lt;img src=x onerror=alert(1)&gt;');
    expect(h).toContain('Tero &lt;b&gt;Koskela&lt;/b&gt;');
  });
  it("heittomerkki (O'Brien, KPV '13) ei päädy onclick-merkkijonoon — napit lukevat _pkd-oliosta", async () => {
    const { h, pkd } = await seuraKortti(P, []);
    const onclickit = [...h.matchAll(/onclick="([^"]*)"/g)].map((m) => m[1]);
    expect(onclickit.some((o) => /O'Brien|O&#39;Brien|KPV '13|KPV &#39;13/.test(o))).toBe(false);
    expect(h).toMatch(/onclick="vahvistaPelaajanPoisto\(_pkd\.pelaajaId, _pkd\.nimi\)"/);
    expect(pkd).toMatchObject({ pelaajaId: 'p1', sukunimi: "O'Brien", joukkue: "KPV '13" });
  });
});

/* ── vahvistaSuostumus (ajettu): antajan nimi + lomakekenttien siivous ── */
class HttpsError extends Error { constructor(c, m, d) { super(m); this.code = c; this.details = d; } }
function vahvista() {
  const CF = lue('functions/index.js');
  const i = CF.indexOf('exports.vahvistaSuostumus = functions');
  const f = fakeDb({ 'seurat/kpv/pelaajat/m93': { etunimi: 'Topias', sukunimi: 'K', huoltajaEmail: 'h@x.fi', syntymaVuosi: 2013, suostumusTila: 'odottaa', pin: '591217' } });
  const ketju = { region() { return ketju; }, runWith() { return ketju; }, https: { onCall: (fn) => fn, HttpsError } };
  const ctx = {
    functions: ketju, exports: {}, db: f.db, console: { log() {}, warn() {}, error() {} }, String, Object, Array, JSON, Date, encodeURIComponent, parseFloat, isFinite,
    admin: { firestore: { FieldValue: { serverTimestamp: () => 'TS' }, Timestamp: { fromDate: (d) => d } } },
    auth: { generatePasswordResetLink: async () => 'r' }, haeOrLuoHuoltajaAuth: async () => ({}), lahetaSahkoposti: async () => {}, pohjaSuostumusLinkki: () => '',
    TM_BASE_URL: 'https://tm', suostumusTarkistus: require_(join(ROOT, 'functions', 'suostumus_tarkistus.js')), pelaajapin: require_(join(ROOT, 'functions', 'pelaajapin.js')),
  };
  vm.createContext(ctx);
  vm.runInContext(CF.slice(i, CF.indexOf('\n  });', i) + 6), ctx);
  return { f, fn: ctx.exports.vahvistaSuostumus };
}
const L = (o) => Object.assign({ seuraId: 'kpv', pelaajaId: 'm93', hEmail: 'h@x.fi', antaja: 'Tero Koskela', antajaRooli: 'huoltaja', etunimi: 'Topias', syntyma: '2013-03-15',
  suostumukset: ['rekisteri'], suostumusMap: { rekisteri: true }, aikaleima: '1.10.2026' }, o);
describe('vahvistaSuostumus (ajettu) · P1', () => {
  it.each([['Tero <b>Koskela</b>'], ['<script>'], ['x'.repeat(101)]])('antaja %s → invalid-argument antaja_virheellinen, ei kirjoituksia', async (a) => {
    const v = vahvista();
    const ennen = JSON.stringify(v.f.D.get('seurat/kpv/pelaajat/m93'));
    await expect(v.fn(L({ antaja: a }), {})).rejects.toMatchObject({ code: 'invalid-argument', message: 'antaja_virheellinen' });
    expect(JSON.stringify(v.f.D.get('seurat/kpv/pelaajat/m93'))).toBe(ennen);
  });
  it("O'Koskela kelpaa; 100 merkkiä kelpaa", async () => {
    const v = vahvista();
    await v.fn(L({ antaja: "Tero O'Koskela" }), {});
    expect(v.f.D.get('seurat/kpv/pelaajat/m93').suostumus.antaja).toBe("Tero O'Koskela");
    await expect(vahvista().fn(L({ antaja: 'x'.repeat(100) }), {})).resolves.toBeTruthy();
  });
  it('suostumusMap vain tunnetuilla avaimilla (boolean), suostumukset suodatettu, tekstit ilman <>, pituudet numeroina', async () => {
    const v = vahvista();
    await v.fn(L({ suostumusMap: { rekisteri: 'kyllä', tietosuoja: true, '<img>': true }, suostumukset: ['rekisteri', '<x>'],
      aikaleima: '<b>1.10</b>', suostumusTeksti: 'ok <script>', bioPituudet: { isa_pituus_cm: '<b>', aiti_pituus_cm: 165, vanhempi_pituus_pvm: '2026' } }), {});
    const x = v.f.D.get('seurat/kpv/pelaajat/m93');
    expect(x.suostumus.hyvaksytyt).toEqual({ rekisteri: false, tietosuoja: true });
    expect(x.suostumukset).toEqual(['rekisteri']);
    expect(x.suostumus.aikaleima).toBe('b1.10/b');
    expect(x.suostumusTeksti).toBe('ok script');
    expect(x.isa_pituus_cm).toBe(null);
    expect(x.aiti_pituus_cm).toBe(165);
  });
});
