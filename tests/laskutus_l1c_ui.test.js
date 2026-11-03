/* Laskutus L1c (.briefit/CODE_BRIEF_LASKUTUS_L1C.md §4): palvelimen joukkue_passiivinen-esto näkyy Seurassa samalla tekstillä (ei raakaa virhettä).
   Harmaa tila (PM 3.11.): lib/tm_laskutus_esto.js — seurat/{sid}.laskutus_sopimus === true + joukkueen laskutustila; Seura ja Master vain kytkevät. */
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
    + ['function _laskutusEsto(e) {', 'function _ikaTila(p) {', 'function _ikaTeksti(syy) {', 'function _suostumusAnnettu(p) {', 'function _pinFn(nimi) {', 'function _pinVirheTeksti(e) {', 'function _paivitaPinPaikallisesti(pelaajaId, pin) {',
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

describe('Harmaa tila (PM 3.11.): lib/tm_laskutus_esto.js', async () => {
  const { createRequire } = await import('module');
  const req = createRequire(import.meta.url);
  const E = req('../lib/tm_laskutus_esto.js');
  const JD = [{ id: 'akt', nimi: 'A', laskutustila: 'aktiivinen' }, { id: 'pas', nimi: 'P', laskutustila: 'passiivinen' }, { id: 'puu', nimi: 'U' }, { id: 'demo', nimi: 'D', demo: true }];
  const S = { laskutus_sopimus: true };
  it('sama sääntö kuin palvelimella: vain sopimusseura; puuttuva tila = passiivinen; demo ja yksikin aktiivinen sallii; ei joukkuetta → esto', () => {
    expect(E.tmLaskutusPelaajaEstetty(S, { joukkueet: ['pas'] }, JD)).toBe(true);
    expect(E.tmLaskutusPelaajaEstetty(S, { joukkueet: ['puu'] }, JD)).toBe(true);
    expect(E.tmLaskutusPelaajaEstetty(S, { joukkueet: ['pas', 'akt'] }, JD)).toBe(false);
    expect(E.tmLaskutusPelaajaEstetty(S, { joukkueet: ['demo'] }, JD)).toBe(false);
    expect(E.tmLaskutusPelaajaEstetty(S, {}, JD)).toBe(true);
    expect(E.tmLaskutusPelaajaEstetty(S, { joukkue: 'A' }, JD)).toBe(false);   // legacy-nimi §7.18
    [{}, { laskutus_sopimus: false }, { laskutus_sopimus: 'true' }, null].forEach((x) => {
      expect(E.tmLaskutusPelaajaEstetty(x, { joukkueet: ['pas'] }, JD)).toBe(false);
      expect(E.tmLaskutusJoukkueEstetty(x, JD[1])).toBe(false);
    });
    expect(E.tmLaskutusJoukkueEstetty(S, JD[0])).toBe(false); expect(E.tmLaskutusJoukkueEstetty(S, JD[1])).toBe(true);
    expect(E.tmLaskutusJoukkueEstetty(S, JD[2])).toBe(true); expect(E.tmLaskutusJoukkueEstetty(S, JD[3])).toBe(false);
    expect(E.TEKSTI).toBe(FI); expect(E.tmLaskutusEstoVirhe(ESTO)).toBe(true); expect(E.tmLaskutusEstoVirhe(new Error('x'))).toBe(false);
  });

  function seuraCtx(sopimus) {
    const ctx = { window: { TM_LASKUTUS_ESTO: E }, tila: { laskutusSopimus: sopimus, joukkueet: JD, seuraKieli: 'fi' }, tmHT: (x) => x, String, Object, Array,
      _tkKieli: (avain, kieli, fi) => fi };
    vm.createContext(ctx);
    vm.runInContext(['function _laskutusEsto(e) {', 'function _ikaTila(p) {', 'function _ikaTeksti(syy) {', 'function _lkPelaaja(p) {', 'function _lkJoukkue(j) {', 'function _lkAttr(estetty) {', 'function _pinKortitHtml(kortit) {'].map(pura).join('\n')
      + '\nthis.lkP = _lkPelaaja; this.lkJ = _lkJoukkue; this.attr = _lkAttr; this.kortit = _pinKortitHtml;', ctx);
    return ctx;
  }
  it('Seura: kytkentä ajettuna — harmaa vain sopimusseurassa, napissa disabled + teksti', () => {
    const c = seuraCtx(true);
    expect(c.lkP({ joukkueet: ['pas'] })).toBe(true); expect(c.lkP({ joukkueet: ['akt'] })).toBe(false);
    expect(c.lkJ(JD[1])).toBe(true); expect(c.lkJ(JD[0])).toBe(false);
    expect(c.attr(true)).toContain('disabled'); expect(c.attr(true)).toContain(FI); expect(c.attr(true)).not.toMatch(/\bclass=/);
    expect(c.attr(false)).toBe('');
    const p = seuraCtx(false); expect(p.lkP({ joukkueet: ['pas'] })).toBe(false); expect(p.lkJ(JD[1])).toBe(false);
  });
  it('Seura: estetyn pelaajan tulostettava kortti ilman PIN:iä ja QR:ää (pelaajalinkki), teksti näkyy', () => {
    const html = seuraCtx(true).kortit([{ tyyppi: 'estetty', nimi: 'Testi Pelaaja', joukkue: 'P' }, { tyyppi: 'pelaaja', nimi: 'Toppari Testi', joukkue: 'A', pin: '135792', qr: 'data:qr', palloId: '1' }]);
    const [estetty, normaali] = html.split('<div class="k">').slice(1);
    expect(estetty).toContain('Testi Pelaaja'); expect(estetty).toContain(FI); expect(estetty).not.toMatch(/PIN|<img/);
    expect(normaali).toContain('135792');
  });
  it('Seura: kytkennät lähteessä (lib, sopimustieto, napit, kortit) ja rivikatto 7100', () => {
    expect(SEURA).toContain('<script src="lib/tm_laskutus_esto.js"></script>');
    expect(SEURA).toMatch(/tila\.laskutusSopimus = data\.laskutus_sopimus === true/);
    expect(SEURA).toMatch(/tila\.seuraId = seuraId; tila\.laskutusSopimus = false;/);   // seuranvaihto ei peri edellistä
    expect((SEURA.match(/\$\{_lkAttr\(_lkJoukkue\(j\)\)\}/g) || []).length).toBe(2);
    expect((SEURA.match(/_lkAttr\(_lkPelaaja\(p\)\)/g) || []).length).toBe(3);
    expect(SEURA).toMatch(/const kortit = pelaajat\.map\(\(p\) => \(\(_ikaTila\(p\) !== 'ok' \|\| _lkPelaaja\(p\)\) \? \{ tyyppi: 'estetty'/);   // 8–9 v -esto samaan nimikorttiin
    expect(SEURA.split('\n').length - 1).toBeLessThanOrEqual(7100);
  });
  it('Master: Joukkueen jakso -kortti harmaana (disabled, ei avaaFn-kutsua) + teksti; kytkentä lähteessä', () => {
    const J = req('../lib/tm_joukkuejakso.js');
    const k = J.tmJoukkuejaksoKortti({ nimi: 'P' }, {});
    const harmaa = J.tmJoukkuejaksoKorttiHTML(k, { avaaFn: '_mJjAvaa', estoTeksti: FI });
    expect(harmaa).toContain('disabled'); expect(harmaa).toContain(FI); expect(harmaa).not.toContain('_mJjAvaa()');
    expect(J.tmJoukkuejaksoKorttiHTML(k, { avaaFn: '_mJjAvaa' })).toContain('_mJjAvaa()');
    const M = fs.readFileSync('TalentMaster_Master_v16.html', 'utf8');
    expect(M).toContain('<script src="lib/tm_laskutus_esto.js"></script>');
    expect(M).toMatch(/\(window\._mJjSopimus = window\._mJjSopimus \|\| \{\}\)\[_seuraId\] = !!\(seura && seura\.laskutus_sopimus === true\)/);
    expect(M).toMatch(/estoTeksti: window\.TM_LASKUTUS_ESTO && window\.TM_LASKUTUS_ESTO\.tmLaskutusJoukkueEstetty\(/);
  });
  it('Huoltajakutsu-sivu: uuden linkin pyynnön esto → ei_kaytossa-teksti; tm_lang fi/sv/en (sv = PM:n teksti)', async () => {
    const H = fs.readFileSync('TalentMaster_Huoltajakutsu.html', 'utf8');
    expect(H).toMatch(/e\.details\.syy === 'joukkue_passiivinen'\) nayta\('', T\('ei_kaytossa'\)\)/);
    const L = fs.readFileSync('lib/tm_lang.js', 'utf8');
    expect(L).toContain("ei_kaytossa: '" + FI + "'"); expect(L).toContain("ei_kaytossa: '" + SV + "'"); expect(L).toContain("kortti_ei_kaytossa: '" + SV + "'");
    expect((L.match(/ei_kaytossa: /g) || []).length).toBe(6);
  });
});
