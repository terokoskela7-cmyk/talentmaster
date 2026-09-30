/**
 * Sisarusbugi (30.9.2026): Seura-sivun uuden pelaajan kutsu + suostumus päätyivät huoltajan olemassa
 * olevalle lapselle (Topias), koska rekisteröinti haki pelaajaa PELKÄLLÄ huoltajan sähköpostilla, ja
 * vahvistaSuostumus kirjoitti toisen lapsen syntymäajan/sukupuolen ensimmäiselle.
 *
 * Seura-sivun rekisteröintiketju (avaaRekisteriModal → lahetaRekisteriSahkoposti) AJETAAN vm:ssä
 * muistinvaraista Firestore-tynkää ja DOM-tynkää vasten; vahvistaSuostumus ajetaan CF-rungosta.
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
const T = require_(join(ROOT, 'functions', 'suostumus_tarkistus.js'));
const lue = (n) => readFileSync(join(ROOT, n), 'utf8');

function pura(S, tunniste) {
  const alku = S.indexOf(tunniste);
  if (alku < 0) throw new Error('ei löydy: ' + tunniste);
  let d = 0;
  for (let j = S.indexOf(') {', alku) + 2; j < S.length; j++) {
    if (S[j] === '{') d++; else if (S[j] === '}') { d--; if (!d) return S.slice(alku, j + 1); }
  }
  throw new Error('sulkeet');
}

/* ── Seura-sivun rekisteröintiketju ── */
const TOPIAS = { id: 'm93', etunimi: 'Topias', sukunimi: 'Koskela', huoltajaEmail: 'h@x.fi', syntymaVuosi: 2013, joukkueet: ['kpv_u13'] };
function seura(SEURA_LAHDE) {
  const S = SEURA_LAHDE || lue('TalentMaster_Seura.html');
  const f = fakeDb({ 'seurat/kpv/pelaajat/m93': Object.assign({}, TOPIAS) });
  const el = {};
  const E = (id) => el[id] || (el[id] = { id, value: '', textContent: '', disabled: false, style: {},
    classList: { add() {}, remove() {} }, options: [{ text: 'KPV U13' }], selectedIndex: 0 });
  const loki = { kutsuFn: [], confirm: [], avattu: [] };
  const ctx = {
    document: { getElementById: E, querySelector: () => null },
    window: { _pelaajatKaikki: [Object.assign({}, TOPIAS)] },
    location: { href: 'https://tm.example/talentmaster/TalentMaster_Seura.html' },
    URL, URLSearchParams, Promise, Object, String, Array, console: { log() {}, warn() {}, error() {} },
    setTimeout: (fn) => fn(),
    tila: { seuraId: 'kpv', seuraNimi: 'KPV', joukkueet: [{ id: 'kpv_u13', nimi: 'KPV U13' }], kayttaja: { uid: 'vp', email: 'vp@x.fi' } },
    db: f.db,
    firebase: { firestore: { FieldValue: { serverTimestamp: () => 'TS' } } },
    functions: { httpsCallable: (n) => async (d) => { loki.kutsuFn.push([n, d]); return { data: { ok: true } }; } },
    _pinFn: () => async () => ({ data: { pin: '700123' } }),
    _pinVirheTeksti: () => 'x',
    _tmPelaajanKieli: () => ({}),
    paivitaJoukkueValitsin() {}, naytaModalVirhe() {}, naytaToast() {},
    naytaPelaajaTiedot: (id) => loki.avattu.push(id),
    confirm: (t) => { loki.confirm.push(t); return ctx._confirmVastaus !== false; },
  };
  vm.createContext(ctx);
  const osat = ['function _rekBaseUrl() {', 'function avaaRekisteriModal() {', 'function avaaRekisteriModalPelaajalle(',
    'function luoRekisteriLinkki() {', 'async function lahetaRekisteriSahkoposti() {'];
  if (S.indexOf('function _rekDuplikaatti(') >= 0) osat.push('function _rekDuplikaatti(');
  vm.runInContext(osat.map((o) => pura(S, o)).join('\n')
    + '\nthis.uusi=avaaRekisteriModal; this.vanha=avaaRekisteriModalPelaajalle; this.laheta=lahetaRekisteriSahkoposti;', ctx);
  const tayta = (etu, suku, email) => { E('rek_etunimi').value = etu; E('rek_sukunimi').value = suku; E('rek_hEmail').value = email; E('rek_joukkue').value = 'kpv_u13'; };
  const kutsut = () => [...f.D.entries()].filter(([k]) => k.startsWith('seurat/kpv/kutsut/')).map(([, v]) => v);
  const pelaajat = () => [...f.D.entries()].filter(([k]) => /^seurat\/kpv\/pelaajat\/[^/]+$/.test(k)).map(([k, v]) => Object.assign({ id: k.split('/').pop() }, v));
  const linkinPid = (l) => new URL(l).searchParams.get('pelaajaId');
  return { ctx, f, loki, tayta, kutsut, pelaajat, linkinPid };
}

describe('Seura · uusi pelaaja on aina uusi pelaaja (ajettu)', () => {
  it('SISARUS: sama huoltajan sähköposti, kaksi eri lasta → kaksi pelaajadokumenttia, kaksi kutsua eri pelaajaId:llä', async () => {
    const t = seura();
    t.ctx.uusi(); t.tayta('Toppari', 'Testi', 'h@x.fi'); await t.ctx.laheta();
    t.ctx.uusi(); t.tayta('Tiina', 'Testi', 'h@x.fi'); await t.ctx.laheta();
    const p = t.pelaajat();
    expect(p.map((x) => x.etunimi).sort()).toEqual(['Tiina', 'Topias', 'Toppari']);
    const k = t.kutsut();
    expect(k).toHaveLength(2);
    const pidt = k.map((x) => t.linkinPid(x.linkki));
    expect(new Set(pidt).size).toBe(2);
    expect(pidt).not.toContain('m93');
    expect(pidt.sort()).toEqual(p.filter((x) => x.id !== 'm93').map((x) => x.id).sort());
    k.forEach((x) => expect(x.pelaajaId).toBe(t.linkinPid(x.linkki)));
    expect(t.loki.kutsuFn.map(([, d]) => d.pelaajaId).sort()).toEqual(pidt.sort());   // audit saa pelaajaId:n
    expect(t.f.D.get('seurat/kpv/pelaajat/m93')).toEqual(TOPIAS);   // Topias ei muuttunut
    expect(t.loki.confirm).toEqual([]);   // pelkkä sama sähköposti EI varoita
  });
  it('VANHA TILA: pelaajan A "Lähetä uudelleen" ja sitten uusi pelaaja B → B:n linkissä B:n pelaajaId', async () => {
    const t = seura();
    t.ctx.vanha('m93', 'Topias', 'Koskela', 'kpv_u13', 'h@x.fi', '', '', '');
    expect(t.ctx.tila._rekPelaajaId).toBe('m93');
    await t.ctx.laheta();   // Topiaksen uudelleenlähetys → kohdistuu Topiakseen (oikein)
    expect(t.linkinPid(t.kutsut()[0].linkki)).toBe('m93');
    t.ctx.uusi();
    expect(t.ctx.tila._rekPelaajaId).toBe(null);
    t.tayta('Bea', 'Berg', 'toinen@x.fi'); await t.ctx.laheta();
    const b = t.pelaajat().find((x) => x.etunimi === 'Bea');
    expect(b).toBeTruthy();
    expect(t.linkinPid(t.kutsut()[1].linkki)).toBe(b.id);
  });
  it('DUPLIKAATTIVAROITUS: sama nimi → varoitus; "Avaa" avaa olemassa olevan eikä luo uutta', async () => {
    const t = seura();
    t.ctx._confirmVastaus = false;
    t.ctx.uusi(); t.tayta('topias', 'KOSKELA', 'muu@x.fi'); await t.ctx.laheta();
    expect(t.loki.confirm[0]).toMatch(/näyttää olevan jo rekisterissä/);
    expect(t.loki.avattu).toEqual(['m93']);
    expect(t.pelaajat()).toHaveLength(1);
    expect(t.kutsut()).toHaveLength(0);
  });
  it('DUPLIKAATTIVAROITUS: "Luo silti uusi" luo uuden', async () => {
    const t = seura();
    t.ctx.uusi(); t.tayta('Topias', 'Koskela', 'h@x.fi'); await t.ctx.laheta();
    expect(t.loki.confirm).toHaveLength(1);
    expect(t.pelaajat()).toHaveLength(2);
  });
  it('NEGATIIVIKONTROLLI: sama skenaario korjausta EDELTÄVÄLLÄ Seura-sivulla toistaa bugin (kutsu Topiakselle)', async () => {
    const { execSync } = require_('child_process');
    let vanha;
    try { vanha = execSync('git show 0b32b947:TalentMaster_Seura.html', { cwd: ROOT, encoding: 'utf8', maxBuffer: 64 * 1024 * 1024 }); }
    catch (e) { return; }   // commit ei saatavilla (esim. matala klooni CI:ssä) → ohitetaan
    const t = seura(vanha);
    t.ctx.uusi(); t.tayta('Toppari', 'Testi', 'h@x.fi'); await t.ctx.laheta();
    expect(t.pelaajat()).toHaveLength(1);                            // uutta pelaajaa EI syntynyt
    expect(t.linkinPid(t.kutsut()[0].linkki)).toBe('m93');          // kutsu Topiakselle
  });
});

describe('suostumus_tarkistus (puhdas)', () => {
  const P = { etunimi: 'Topias', syntymaaika: { toDate: () => new Date(Date.UTC(2013, 2, 15)) }, syntymaVuosi: 2013, sukupuoli: 'M' };
  it('eri syntymäaika tai eri etunimi → ristiriita', () => {
    expect(T.tarkistaSuostumusKohde(P, { etunimi: 'Topias', syntyma: '2014-05-01' })).toMatchObject({ ristiriita: true, syyt: ['syntymaaika'] });
    expect(T.tarkistaSuostumusKohde(P, { etunimi: 'Toppari', syntyma: '2013-03-15' })).toMatchObject({ ristiriita: true, syyt: ['etunimi'], etunimiTasmasi: false });
  });
  it('sama pelaaja: normalisoitu nimi kelpaa; ei ylikirjoitusta', () => {
    const r = T.tarkistaSuostumusKohde(P, { etunimi: '  topias ', syntyma: '2013-03-15', sukupuoli: 'T' });
    expect(r).toMatchObject({ ristiriita: false, etunimiTasmasi: true, tayttoKentat: {} });
  });
  it('tyhjä tallennettu syntymäaika/sukupuoli → täytetään lomakkeelta; vain vuosi tallennettu → verrataan vuotta', () => {
    const r = T.tarkistaSuostumusKohde({ etunimi: 'Uusi' }, { etunimi: 'Uusi', syntyma: '2014-06-01', sukupuoli: 'P' });
    expect(r.ristiriita).toBe(false);
    expect(r.tayttoKentat.syntymaPaiva.toISOString().slice(0, 10)).toBe('2014-06-01');
    expect(r.tayttoKentat).toMatchObject({ syntymaVuosi: 2014, sukupuoli: 'M' });
    expect(T.tarkistaSuostumusKohde({ syntymaVuosi: 2013 }, { syntyma: '2014-06-01' })).toMatchObject({ ristiriita: true, syyt: ['syntymaaika'] });
    expect(T.tarkistaSuostumusKohde({ syntymaVuosi: 2013 }, { syntyma: '2013-06-01' }).tayttoKentat).toEqual({ syntymaPaiva: new Date(Date.UTC(2013, 5, 1)) });
  });
  it('lomakkeelta puuttuva etunimi → ei tarkistusta (null)', () => {
    expect(T.tarkistaSuostumusKohde(P, { syntyma: '2013-03-15' })).toMatchObject({ ristiriita: false, etunimiTasmasi: null });
  });
});

/* ── vahvistaSuostumus (CF-runko vm:ssä) ── */
class HttpsError extends Error { constructor(c, m, d) { super(m); this.code = c; this.details = d; } }
function vahvista(pelaaja) {
  const CF = lue('functions/index.js');
  const i = CF.indexOf('exports.vahvistaSuostumus = functions');
  const runko = CF.slice(i, CF.indexOf('\n  });', i) + 6);
  const f = fakeDb({ 'seurat/kpv/pelaajat/m93': pelaaja });
  const ketju = { region() { return ketju; }, runWith() { return ketju; }, https: { onCall: (fn) => fn, HttpsError } };
  const ctx = {
    functions: ketju, exports: {}, db: f.db, console: { log() {}, warn() {}, error() {} }, String, Object, Array, JSON, Date, encodeURIComponent,
    admin: { firestore: { FieldValue: { serverTimestamp: () => 'TS' }, Timestamp: { fromDate: (d) => ({ toDate: () => d, iso: d.toISOString() }) } } },
    auth: { generatePasswordResetLink: async () => 'https://reset' },
    haeOrLuoHuoltajaAuth: async () => ({}), lahetaSahkoposti: async () => {}, pohjaSuostumusLinkki: () => '',
    TM_BASE_URL: 'https://tm', suostumusTarkistus: T, pelaajapin: require_(join(ROOT, 'functions', 'pelaajapin.js')),
  };
  vm.createContext(ctx);
  vm.runInContext(runko, ctx);
  const audit = () => [...f.D.entries()].filter(([k]) => k.startsWith('audit/')).map(([, v]) => v);
  return { f, fn: ctx.exports.vahvistaSuostumus, audit };
}
const LOMAKE = (o) => Object.assign({ seuraId: 'kpv', pelaajaId: 'm93', hEmail: 'h@x.fi', antaja: 'Tero Koskela', antajaRooli: 'huoltaja',
  suostumukset: ['perus'], suostumusMap: { perus: true }, aikaleima: 'x' }, o);
const TOPIAS_DOC = () => ({ etunimi: 'Topias', sukunimi: 'Koskela', huoltajaEmail: 'h@x.fi', syntymaaika: { toDate: () => new Date(Date.UTC(2013, 2, 15)) },
  syntymaVuosi: 2013, sukupuoli: 'M', isa_pituus_cm: 180, pin: '591217', suostumusTila: 'odottaa' });

describe('vahvistaSuostumus · ristiriidan tarkistus (ajettu)', () => {
  it('eri syntymäaika → failed-precondition pelaaja_ristiriita, EI kirjoituksia, audit (ei nimiä)', async () => {
    const v = vahvista(TOPIAS_DOC());
    const ennen = JSON.stringify(v.f.D.get('seurat/kpv/pelaajat/m93'));
    await expect(v.fn(LOMAKE({ etunimi: 'Topias', syntyma: '2014-01-01' }), {})).rejects.toMatchObject({ code: 'failed-precondition', message: 'pelaaja_ristiriita' });
    expect(JSON.stringify(v.f.D.get('seurat/kpv/pelaajat/m93'))).toBe(ennen);
    expect(v.audit()).toEqual([expect.objectContaining({ toiminto: 'suostumus_estetty_pelaaja_ristiriita', severity: 'warn', pelaajaId: 'm93', syyt: ['syntymaaika'] })]);
    expect(JSON.stringify(v.audit())).not.toMatch(/Topias|Toppari|Koskela/);
  });
  it('eri etunimi (sisarus samalla linkillä) → sama', async () => {
    const v = vahvista(TOPIAS_DOC());
    await expect(v.fn(LOMAKE({ etunimi: 'Toppari', syntyma: '2013-03-15' }), {})).rejects.toMatchObject({ code: 'failed-precondition' });
    expect(v.f.D.get('seurat/kpv/pelaajat/m93').suostumusTila).toBe('odottaa');
  });
  it('tyhjä syntymäaika pelaajalla → lomakkeen arvo kirjoitetaan', async () => {
    const d = TOPIAS_DOC(); delete d.syntymaaika; delete d.syntymaVuosi; delete d.sukupuoli;
    const v = vahvista(d);
    await v.fn(LOMAKE({ etunimi: 'Topias', syntyma: '2013-03-15', sukupuoli: 'P' }), {});
    const x = v.f.D.get('seurat/kpv/pelaajat/m93');
    expect(x.syntymaaika.iso.slice(0, 10)).toBe('2013-03-15');
    expect(x).toMatchObject({ syntymaVuosi: 2013, sukupuoli: 'M', suostumusTila: 'annettu' });
  });
  it('sama pelaaja + samat tiedot → toimii kuten ennen; olemassa olevaa sukupuolta EI ylikirjoiteta; audit lomakeEtunimi_tasmasi', async () => {
    const v = vahvista(TOPIAS_DOC());
    const r = await v.fn(LOMAKE({ etunimi: 'Topias', syntyma: '2013-03-15', sukupuoli: 'T' }), {});
    expect(r.ok).toBe(true);
    const x = v.f.D.get('seurat/kpv/pelaajat/m93');
    expect(x).toMatchObject({ suostumusTila: 'annettu', sukupuoli: 'M', suostumuksenAntaja: 'Tero Koskela' });
    expect(x.syntymaaika.toDate().toISOString().slice(0, 10)).toBe('2013-03-15');
    expect(v.audit().find((a) => a.toiminto === 'suostumus_annettu')).toMatchObject({ lomakeEtunimi_tasmasi: true });
  });
});

describe('vartijat', () => {
  it('Seura: ei sähköpostihakua rekisteröinnissä; kutsutila nollataan; ei pelkkää sähköpostivaroitusta', () => {
    const S = lue('TalentMaster_Seura.html');
    expect(S).not.toMatch(/where\('huoltajaEmail', '==', tila\._rekHEmail/);
    expect(pura(S, 'function avaaRekisteriModal() {')).toMatch(/tila\._rekPelaajaId\s*=\s*null/);
    expect(S).not.toContain('Sama huoltajaEmail jo pelaajalla');
  });
  it('Suostumussivu: lähettää etunimen ja näyttää ristiriitaviestin ilman pelaajan nimeä', () => {
    const R = lue('TalentMaster_Rekisterointi_Suostumus.html');
    expect(R).toContain("etunimi:         val('i_etu')");
    expect(R).toContain('Tämä kutsulinkki koskee toista pelaajaa. Jos rekisteröit eri lasta, pyydä seuralta hänelle oma kutsu.');
  });
  it('rekisterikutsu_lahetetty-audit sisältää seuraId:n ja pelaajaId:n', () => {
    expect(lue('functions/index.js')).toContain("hEmail, pelaajaNimi, seura: seuraNimi, seuraId, pelaajaId: pelaajaIdKutsu,");
  });
});
