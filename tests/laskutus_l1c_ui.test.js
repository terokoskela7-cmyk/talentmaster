/* Laskutus L1c (.briefit/CODE_BRIEF_LASKUTUS_L1C.md §4): palvelimen joukkue_passiivinen-esto näkyy Seurassa samalla tekstillä (ei raakaa virhettä).
   Harmaa tila (nappi pois käytöstä ennen kutsua) odottaa PM:n kuittausta sopimusseuratiedon välittämisestä clientille (briiffi §4). */
import { describe, it, expect } from 'vitest';
import fs from 'fs';
import vm from 'vm';

const SEURA = fs.readFileSync('TalentMaster_Seura.html', 'utf8');
const FI = 'Ei käytössä – sovi käyttöönotosta TalentMasterin kanssa';
const SV = 'Inte i bruk – kom överens om ibruktagning med TalentMaster';
const pura = (t) => { const a = SEURA.indexOf(t); if (a < 0) throw new Error(t); let d = 0; for (let j = SEURA.indexOf(') {', a) + 2; j < SEURA.length; j++) { if (SEURA[j] === '{') d++; else if (SEURA[j] === '}') { d--; if (!d) return SEURA.slice(a, j + 1); } } throw new Error(t); };
const ESTO = { code: 'functions/failed-precondition', message: FI, details: { syy: 'joukkue_passiivinen' } };

function aja(vastaa, pelaajat, valitut, tmHT) {
  const loki = { kutsut: [], toast: [], confirm: [] };
  const ctx = {
    window: { _pelaajatKaikki: pelaajat || [], _aktiiviJoukkue: '' },
    document: { querySelectorAll: () => (valitut || []).map((v) => ({ value: v })), getElementById: () => null },
    location: { href: 'https://tm/TalentMaster_Seura.html' }, URL, encodeURIComponent, String, Object, Array, Promise, console: { warn() {}, error() {} },
    tila: { seuraId: 'sibbo', seuraNimi: 'S' }, naytaToast: (t, l) => loki.toast.push([t, l]),
    confirm: (t) => { loki.confirm.push(t); return true; }, renderPelaajat: () => Promise.resolve(), setTimeout: () => {},
    firebase: { app: () => ({ functions: () => ({ httpsCallable: (nimi) => async (d) => { loki.kutsut.push([nimi, d]); return vastaa(nimi, d); } }) }) },
    tmHT: tmHT || ((s) => s),
  };
  vm.createContext(ctx);
  vm.runInContext(SEURA.match(/const PIN_SUOSTUMUS_PUUTTUU = '[^']*';/)[0].replace('const', 'var') + '\n'
    + ['function _laskutusEsto(e) {', 'function _suostumusAnnettu(p) {', 'function _pinFn(nimi) {', 'function _pinVirheTeksti(e) {', 'function _paivitaPinPaikallisesti(pelaajaId, pin) {',
      'function _tunnusKohde() {', 'function _tunnusTila(t) {', 'async function luoPuuttuvatPinit() {', 'async function lahetaTunnuksetHuoltajille() {', 'async function lahetaPelaajaLinkki('].map(pura).join('\n')
    + '\nthis.esto = _laskutusEsto; this.virhe = _pinVirheTeksti; this.luo = luoPuuttuvatPinit; this.laheta = lahetaTunnuksetHuoltajille; this.linkki = lahetaPelaajaLinkki;', ctx);
  return { ctx, loki };
}

describe('Seura: palvelimen laskutusesto → sama teksti', () => {
  it('_laskutusEsto tunnistaa vain syyn joukkue_passiivinen; muut virheet ennallaan', () => {
    const { ctx } = aja(() => ({}));
    expect(ctx.esto(ESTO)).toBe(FI);
    expect(ctx.esto(true)).toBe(FI);
    expect(ctx.esto({ code: 'functions/failed-precondition', details: { syy: 'suostumus_puuttuu' } })).toBe('');
    expect(ctx.esto(new Error('x'))).toBe('');
    expect(ctx.virhe(ESTO)).toBe(FI);
    expect(ctx.virhe({ code: 'functions/failed-precondition', message: 'x', details: { syy: 'suostumus_puuttuu' } })).toBe('Huoltajan suostumus puuttuu – PIN luodaan suostumuksen jälkeen.');
  });
  it('teksti reititetään tmHT:n kautta (sv = PM:n teksti yhteisessä sanastossa)', async () => {
    const C = (await import('../lib/tm_i18n_common.js')).default || (await import('../lib/tm_i18n_common.js'));
    const { ctx } = aja(() => ({}), [], [], (s) => C.tmI18nResolve ? (C.TM_I18N_COMMON.sv[s] || s) : s);
    expect(ctx.esto(ESTO)).toBe(SV);
    expect(C.TM_I18N_COMMON.sv[FI]).toBe(SV);
  });
  it('luoPinitSeuralle: ohitettuPassiivinen näkyy vahvistuksessa ja yhteenvedossa', async () => {
    const { ctx, loki } = aja((n, d) => ({ data: d.kuivaAjo ? { luotaisiin: 2, ohitettuSuostumus: 0, ohitettuPassiivinen: 3 } : { luotu: 2, ohitettuSuostumus: 0, oliJo: 0, ohitettuPassiivinen: 3 } }));
    await ctx.luo();
    expect(loki.confirm[0]).toContain('3: ' + FI);
    expect(loki.toast.at(-1)[0]).toContain('3: ' + FI);
  });
  it('luoPinitSeuralle: kaikki ohitettu passiivisina → ei väitetä "kaikilla on jo PIN"', async () => {
    const { ctx, loki } = aja(() => ({ data: { luotaisiin: 0, ohitettuSuostumus: 0, ohitettuPassiivinen: 4 } }));
    await ctx.luo();
    expect(loki.toast[0][0]).toContain('4: ' + FI);
    expect(loki.toast[0][0]).not.toContain('on jo PIN');
  });
  it('Lähetä tunnukset: estetyt eritellään, eivät näy "epäonnistui"-lukuna', async () => {
    const P = [{ id: 'a', huoltajaEmail: 'a@tm-testi.fi', pin: '482915', suostumusTila: 'annettu' }, { id: 'b', huoltajaEmail: 'b@tm-testi.fi', pin: '135790', suostumusTila: 'annettu' }];
    const { ctx, loki } = aja((n, d) => { if (d.pelaajaId === 'b') throw ESTO; return { data: { ok: true } }; }, P);
    await ctx.laheta();
    const t = loki.toast.at(-1)[0];
    expect(t).toContain('1: ' + FI);
    expect(t).not.toContain('epäonnistui');
  });
  it('pelaajalinkki: esto → teksti, ei raakaa virhettä', async () => {
    const { ctx, loki } = aja(() => { throw Object.assign(new Error('raaka'), ESTO); });
    await ctx.linkki('p1', 'sibbo', 'E', 'S', 'h@tm-testi.fi', '');
    expect(loki.toast.at(-1)).toEqual([FI, 'virhe']);
  });
  it('lähdevartija: rekisterikutsu, massakutsu ja Excel-kutsu käyttävät samaa apuria', () => {
    expect(SEURA).toContain("naytaToast(_laskutusEsto(fnErr) || ((tmHT('⚠️ Tallennettu mutta sähköposti ei lähtenyt:')");
    expect(SEURA).toContain('estoRivi = _laskutusEsto(mailErr);');
    expect(SEURA).toContain("(estoRivi || tmHT('⚠️ Linkki luotu, sähköposti ei lähtenyt'))");
    expect(SEURA).toContain('${_laskutusEsto(mailErr) || mailErr.message}');
    expect((SEURA.match(/syy === 'joukkue_passiivinen'/g) || []).length).toBe(1);   // yksi tulkintapaikka
  });
});
