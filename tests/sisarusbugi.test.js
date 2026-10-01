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
const PM = require_(join(dirname(fileURLToPath(import.meta.url)), '..', 'lib', 'tm_paikkamerkki.js'));
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
const TOPIAS = { id: 'm93', etunimi: 'Topias', sukunimi: 'Koskela', huoltajaEmail: 'h@tm-testi.fi', syntymaVuosi: 2013, joukkueet: ['kpv_u13'] };
function seura(SEURA_LAHDE, lisat) {
  const S = SEURA_LAHDE || lue('TalentMaster_Seura.html');
  const alku = { 'seurat/kpv/pelaajat/m93': Object.assign({}, TOPIAS) };
  (lisat || []).forEach((p) => { alku['seurat/kpv/pelaajat/' + p.id] = Object.assign({}, p); });
  const f = fakeDb(alku);
  const el = {};
  const E = (id) => el[id] || (el[id] = { id, value: '', textContent: '', disabled: false, style: {},
    classList: { add() {}, remove() {} }, options: [{ text: 'KPV U13' }], selectedIndex: 0 });
  const loki = { kutsuFn: [], confirm: [], avattu: [] };
  const ctx = {
    document: { getElementById: E, querySelector: () => null },
    window: { _pelaajatKaikki: [Object.assign({}, TOPIAS)].concat((lisat || []).map((p) => Object.assign({}, p))) },
    location: { href: 'https://tm.example/talentmaster/TalentMaster_Seura.html' },
    URL, URLSearchParams, Promise, Object, String, Array, console: { log() {}, warn() {}, error() {} },
    setTimeout: (fn) => fn(),
    tila: { seuraId: 'kpv', seuraNimi: 'KPV', joukkueet: [{ id: 'kpv_u13', nimi: 'KPV U13' }], kayttaja: { uid: 'vp', email: 'vp@tm-testi.fi' } },
    db: f.db,
    firebase: { firestore: { FieldValue: { serverTimestamp: () => 'TS' } } },
    functions: { httpsCallable: (n) => async (d) => { loki.kutsuFn.push([n, d]); return { data: { ok: true } }; } },
    _pinFn: () => async () => ({ data: { pin: '700123' } }),
    _pinVirheTeksti: () => 'x',
    _tmPelaajanKieli: () => ({}),
    tmOnPaikkamerkkiOsoite: PM.tmOnPaikkamerkkiOsoite, PAIKKAMERKKI_SYY: PM.PAIKKAMERKKI_SYY,
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
    t.ctx.uusi(); t.tayta('Toppari', 'Testi', 'h@tm-testi.fi'); await t.ctx.laheta();
    t.ctx.uusi(); t.tayta('Tiina', 'Testi', 'h@tm-testi.fi'); await t.ctx.laheta();
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
    t.ctx.vanha('m93', 'Topias', 'Koskela', 'kpv_u13', 'h@tm-testi.fi', '', '', '');
    expect(t.ctx.tila._rekPelaajaId).toBe('m93');
    await t.ctx.laheta();   // Topiaksen uudelleenlähetys → kohdistuu Topiakseen (oikein)
    expect(t.linkinPid(t.kutsut()[0].linkki)).toBe('m93');
    t.ctx.uusi();
    expect(t.ctx.tila._rekPelaajaId).toBe(null);
    t.tayta('Bea', 'Berg', 'toinen@tm-testi.fi'); await t.ctx.laheta();
    const b = t.pelaajat().find((x) => x.etunimi === 'Bea');
    expect(b).toBeTruthy();
    expect(t.linkinPid(t.kutsut()[1].linkki)).toBe(b.id);
  });
  it('DUPLIKAATTIVAROITUS: sama nimi → varoitus; "Avaa" avaa olemassa olevan eikä luo uutta', async () => {
    const t = seura();
    t.ctx._confirmVastaus = false;
    t.ctx.uusi(); t.tayta('topias', 'KOSKELA', 'muu@tm-testi.fi'); await t.ctx.laheta();
    expect(t.loki.confirm[0]).toMatch(/näyttää olevan jo rekisterissä/);
    expect(t.loki.avattu).toEqual(['m93']);
    expect(t.pelaajat()).toHaveLength(1);
    expect(t.kutsut()).toHaveLength(0);
  });
  it('DUPLIKAATTIVAROITUS: "Luo silti uusi" luo uuden', async () => {
    const t = seura();
    t.ctx.uusi(); t.tayta('Topias', 'Koskela', 'h@tm-testi.fi'); await t.ctx.laheta();
    expect(t.loki.confirm).toHaveLength(1);
    expect(t.pelaajat()).toHaveLength(2);
  });
  it('NEGATIIVIKONTROLLI: sama skenaario korjausta EDELTÄVÄLLÄ Seura-sivulla toistaa bugin (kutsu Topiakselle)', async () => {
    const { execSync } = require_('child_process');
    let vanha;
    try { vanha = execSync('git show 0b32b947:TalentMaster_Seura.html', { cwd: ROOT, encoding: 'utf8', maxBuffer: 64 * 1024 * 1024 }); }
    catch (e) { return; }   // commit ei saatavilla (esim. matala klooni CI:ssä) → ohitetaan
    const t = seura(vanha);
    t.ctx.uusi(); t.tayta('Toppari', 'Testi', 'h@tm-testi.fi'); await t.ctx.laheta();
    expect(t.pelaajat()).toHaveLength(1);                            // uutta pelaajaa EI syntynyt
    expect(t.linkinPid(t.kutsut()[0].linkki)).toBe('m93');          // kutsu Topiakselle
  });
});

describe('KOLMEN LAPSEN sisarustapaus (#689 jatko)', () => {
  const B = { id: 'top2', etunimi: 'Toppari', sukunimi: 'Testi', huoltajaEmail: 'h@tm-testi.fi', syntymaVuosi: 2006, joukkueet: ['kpv_u13'] };
  it('A ja B olemassa, C lisätään samalla sähköpostilla → C:n linkki, esitäyttö ja kutsun sähköposti viittaavat C:hen', async () => {
    const t = seura(undefined, [B]);
    t.ctx.uusi(); t.tayta('Tero', 'Testaaja', 'h@tm-testi.fi'); await t.ctx.laheta();
    const c = t.pelaajat().find((x) => x.etunimi === 'Tero');
    expect(c && c.id).toBeTruthy();
    expect([c.id]).not.toContain('m93');
    const k = t.kutsut();
    expect(k).toHaveLength(1);
    const url = new URL(k[0].linkki);
    expect(url.searchParams.get('pelaajaId')).toBe(c.id);                     // URL
    expect([url.searchParams.get('etunimi'), url.searchParams.get('sukunimi')]).toEqual(['Tero', 'Testaaja']);   // esitäyttö
    expect(k[0].pelaajaId).toBe(c.id);                                         // kutsudokumentti
    const [nimi, data] = t.loki.kutsuFn[0];
    expect(nimi).toBe('lahetaRekisteriKutsu');
    expect(data.pelaajaId).toBe(c.id);                                         // sähköposti/audit
    expect(new URL(data.linkki).searchParams.get('pelaajaId')).toBe(c.id);
    expect(t.f.D.get('seurat/kpv/pelaajat/m93')).toEqual(TOPIAS);              // A ennallaan
    expect(t.f.D.get('seurat/kpv/pelaajat/top2')).toEqual(B);                  // B ennallaan
    expect(t.loki.confirm).toEqual([]);                                        // sama sähköposti ei varoita
  });
  it('vahvistaSuostumus C:n linkillä ja C:n tiedoilla kirjoittaa C:lle (syntymäaika täyttyy tyhjään)', async () => {
    const v = vahvista({ etunimi: 'Tero', sukunimi: 'Testaaja', huoltajaEmail: 'h@tm-testi.fi', suostumusTila: 'odottaa' });
    await v.fn(LOMAKE({ etunimi: 'Tero', syntyma: '2010-04-04' }), {});
    const x = v.f.D.get('seurat/kpv/pelaajat/m93');   // harnessin dokumentti = C
    expect(x).toMatchObject({ suostumusTila: 'annettu', syntymaVuosi: 2010 });
    expect(v.audit().find((a) => a.toiminto === 'suostumus_annettu')).toMatchObject({ lomake_poikkeama: [], severity: 'info' });
  });
  it('VANHA LINKKI: A:n linkki + C:n tiedot (eri nimi, eri vuosi) → pelaaja_ristiriita, ei kirjoituksia, vastauksessa vain syykoodi', async () => {
    const v = vahvista(TOPIAS_DOC());
    const ennen = JSON.stringify(v.f.D.get('seurat/kpv/pelaajat/m93'));
    const e = await v.fn(LOMAKE({ etunimi: 'Tero', syntyma: '2010-04-04' }), {}).catch((x) => x);
    expect(e).toMatchObject({ code: 'failed-precondition', message: 'pelaaja_ristiriita', details: { syy: 'pelaaja_ristiriita' } });
    expect(Object.keys(e.details)).toEqual(['syy']);                            // ei pelaajatietoja selaimelle
    expect(JSON.stringify(v.f.D.get('seurat/kpv/pelaajat/m93'))).toBe(ennen);
    expect(v.audit().map((a) => a.toiminto)).toEqual(['suostumus_estetty_pelaaja_ristiriita']);
  });
});

describe('suostumus_tarkistus (puhdas, salliva täsmäys)', () => {
  const P = { etunimi: 'Onni-Matti', sukunimi: 'Virtanen', syntymaaika: { toDate: () => new Date(Date.UTC(2013, 2, 15)) }, syntymaVuosi: 2013, sukupuoli: 'M' };
  const k = (etunimi, syntyma, p) => T.tarkistaSuostumusKohde(p || P, { etunimi, syntyma });
  it('nimet väärin päin (etunimi = tallennettu sukunimi) → hyväksytään ilman poikkeamaa', () => {
    expect(k('Virtanen', '2013-03-15')).toMatchObject({ ristiriita: false, poikkeama: [], etunimiTasmasi: true });
  });
  it('"Onni Matti" vs "Onni-Matti", "Onni" ↔ "Onni-Matti", "Matti" (osa) → täsmää', () => {
    ['Onni Matti', 'onni-matti', 'Onni', 'Matti', '  ONNI  '].forEach((e) => expect(k(e, '2013-03-15').etunimiTasmasi, e).toBe(true));
    expect(T.etunimiTasmaa({ etunimi: 'Onni' }, 'Onni-Matti')).toBe(true);
  });
  it('sama vuosi, eri päivä → hyväksytään ilman poikkeamaa (vain vuosi verrataan)', () => {
    expect(k('Onni', '2013-12-31')).toMatchObject({ ristiriita: false, poikkeama: [] });
  });
  it('SISARUS: eri nimi JA eri vuosi → hylätään', () => {
    expect(k('Aino', '2015-06-01')).toMatchObject({ ristiriita: true, syyt: ['etunimi', 'vuosi'], poikkeama: [] });
  });
  it('KAKSOSET: eri nimi, sama vuosi → hyväksytään, poikkeama etunimi', () => {
    expect(k('Aino', '2013-03-15')).toMatchObject({ ristiriita: false, poikkeama: ['etunimi'], etunimiTasmasi: false });
  });
  it('sama nimi, eri vuosi → hyväksytään, poikkeama vuosi; tallennettua EI ylikirjoiteta', () => {
    expect(k('Onni', '2014-01-01')).toMatchObject({ ristiriita: false, poikkeama: ['vuosi'], tayttoKentat: {} });
  });
  it('tyhjä tallennettu syntymäaika/sukupuoli → täytetään lomakkeelta; puuttuva lomakkeen etunimi → null', () => {
    const r = T.tarkistaSuostumusKohde({ etunimi: 'Uusi' }, { etunimi: 'Uusi', syntyma: '2014-06-01', sukupuoli: 'P' });
    expect(r.ristiriita).toBe(false);
    expect(r.tayttoKentat.syntymaPaiva.toISOString().slice(0, 10)).toBe('2014-06-01');
    expect(r.tayttoKentat).toMatchObject({ syntymaVuosi: 2014, sukupuoli: 'M' });
    expect(k(undefined, '2015-01-01')).toMatchObject({ ristiriita: false, poikkeama: ['vuosi'], etunimiTasmasi: null });
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
const LOMAKE = (o) => Object.assign({ seuraId: 'kpv', pelaajaId: 'm93', hEmail: 'h@tm-testi.fi', antaja: 'Tero Koskela', antajaRooli: 'huoltaja',
  suostumukset: ['perus'], suostumusMap: { perus: true }, aikaleima: 'x' }, o);
const TOPIAS_DOC = () => ({ etunimi: 'Topias', sukunimi: 'Koskela', huoltajaEmail: 'h@tm-testi.fi', syntymaaika: { toDate: () => new Date(Date.UTC(2013, 2, 15)) },
  syntymaVuosi: 2013, sukupuoli: 'M', isa_pituus_cm: 180, pin: '591217', suostumusTila: 'odottaa' });

describe('vahvistaSuostumus · ristiriidan tarkistus (ajettu)', () => {
  it('SISARUS (eri nimi + eri vuosi) → failed-precondition pelaaja_ristiriita, EI kirjoituksia, audit (ei nimiä)', async () => {
    const v = vahvista(TOPIAS_DOC());
    const ennen = JSON.stringify(v.f.D.get('seurat/kpv/pelaajat/m93'));
    await expect(v.fn(LOMAKE({ etunimi: 'Toppari', syntyma: '2014-01-01' }), {})).rejects.toMatchObject({ code: 'failed-precondition', message: 'pelaaja_ristiriita' });
    expect(JSON.stringify(v.f.D.get('seurat/kpv/pelaajat/m93'))).toBe(ennen);
    expect(v.audit()).toEqual([expect.objectContaining({ toiminto: 'suostumus_estetty_pelaaja_ristiriita', severity: 'warn', pelaajaId: 'm93', syyt: ['etunimi', 'vuosi'] })]);
    expect(JSON.stringify(v.audit())).not.toMatch(/Topias|Toppari|Koskela/);
  });
  it('KAKSOSET (eri nimi, sama vuosi) → hyväksytään, suostumus_annettu warn + lomake_poikkeama [etunimi]', async () => {
    const v = vahvista(TOPIAS_DOC());
    const r = await v.fn(LOMAKE({ etunimi: 'Toppari', syntyma: '2013-07-07' }), {});
    expect(r.ok).toBe(true);
    const a = v.audit().find((x) => x.toiminto === 'suostumus_annettu');
    expect(a).toMatchObject({ severity: 'warn', lomake_poikkeama: ['etunimi'], lomakeEtunimi_tasmasi: false });
    expect(v.f.D.get('seurat/kpv/pelaajat/m93').syntymaaika.toDate().toISOString().slice(0, 10)).toBe('2013-03-15');   // ei ylikirjoitusta
  });
  it('sama nimi, eri vuosi → hyväksytään, poikkeama [vuosi], syntymäaikaa EI ylikirjoiteta', async () => {
    const v = vahvista(TOPIAS_DOC());
    await v.fn(LOMAKE({ etunimi: 'Topias', syntyma: '2014-01-01' }), {});
    expect(v.audit().find((x) => x.toiminto === 'suostumus_annettu')).toMatchObject({ severity: 'warn', lomake_poikkeama: ['vuosi'] });
    const x = v.f.D.get('seurat/kpv/pelaajat/m93');
    expect(x.syntymaVuosi).toBe(2013);
    expect(x.syntymaaika.toDate().toISOString().slice(0, 10)).toBe('2013-03-15');
  });
  it('nimet väärin päin tuonnissa (etunimi = tallennettu sukunimi) → hyväksytään ilman poikkeamaa', async () => {
    const v = vahvista(TOPIAS_DOC());
    await v.fn(LOMAKE({ etunimi: 'Koskela', syntyma: '2013-03-15' }), {});
    expect(v.audit().find((x) => x.toiminto === 'suostumus_annettu')).toMatchObject({ severity: 'info', lomake_poikkeama: [] });
  });
  it('tyhjä syntymäaika pelaajalla → lomakkeen arvo kirjoitetaan', async () => {
    const d = TOPIAS_DOC(); delete d.syntymaaika; delete d.syntymaVuosi; delete d.sukupuoli;
    const v = vahvista(d);
    await v.fn(LOMAKE({ etunimi: 'Topias', syntyma: '2013-03-15', sukupuoli: 'P' }), {});
    const x = v.f.D.get('seurat/kpv/pelaajat/m93');
    expect(x.syntymaaika.iso.slice(0, 10)).toBe('2013-03-15');
    expect(x).toMatchObject({ syntymaVuosi: 2013, sukupuoli: 'M', suostumusTila: 'annettu' });
  });
  it('sama pelaaja + samat tiedot → toimii kuten ennen; sukupuolta EI ylikirjoiteta; audit info', async () => {
    const v = vahvista(TOPIAS_DOC());
    const r = await v.fn(LOMAKE({ etunimi: 'Topias', syntyma: '2013-03-15', sukupuoli: 'T' }), {});
    expect(r.ok).toBe(true);
    expect(v.f.D.get('seurat/kpv/pelaajat/m93')).toMatchObject({ suostumusTila: 'annettu', sukupuoli: 'M', suostumus: expect.objectContaining({ antaja: 'Tero Koskela' }) });
    expect(v.audit().find((a) => a.toiminto === 'suostumus_annettu')).toMatchObject({ severity: 'info', lomakeEtunimi_tasmasi: true, lomake_poikkeama: [] });
  });
});

describe('vahvistaSuostumus · suostumuksen antaja (1.10.2026, ajettu)', () => {
  it.each([[undefined], [''], ['   '], [null]])('antaja %o → invalid-argument antaja_puuttuu, EI kirjoituksia eikä audit-riviä', async (antaja) => {
    const v = vahvista(TOPIAS_DOC());
    const ennen = JSON.stringify(v.f.D.get('seurat/kpv/pelaajat/m93'));
    const e = await v.fn(LOMAKE({ etunimi: 'Topias', syntyma: '2013-03-15', antaja }), {}).catch((x) => x);
    expect(e).toMatchObject({ code: 'invalid-argument', message: 'antaja_puuttuu' });
    expect(JSON.stringify(v.f.D.get('seurat/kpv/pelaajat/m93'))).toBe(ennen);
    expect(v.audit()).toEqual([]);
  });
  it('nimellä → kanoninen suostumus.antaja (normalisoitu); vanhaa suostumuksenAntaja-kenttää EI kirjoiteta; audit antajaNimi_annettu ilman nimeä', async () => {
    const v = vahvista(TOPIAS_DOC());
    await v.fn(LOMAKE({ etunimi: 'Topias', syntyma: '2013-03-15', antaja: '  Tero   Koskela ' }), {});
    const x = v.f.D.get('seurat/kpv/pelaajat/m93');
    expect(x.suostumus).toMatchObject({ antaja: 'Tero Koskela', antajaRooli: 'huoltaja' });
    expect(x).not.toHaveProperty('suostumuksenAntaja');
    const a = v.audit().find((r) => r.toiminto === 'suostumus_annettu');
    expect(a).toMatchObject({ antajaNimi_annettu: true });
    expect(a).not.toHaveProperty('antaja');
    expect(JSON.stringify(a)).not.toContain('Koskela');
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
