/* Kehitystyöpöytä 22 · A2–A5 (VP_v25): CTA:t V4-välilehtiin · viikon lataus · mittauslistan roolit · D3 VP-kalibraation rooli. */
import { describe, it, expect } from 'vitest';
import { readFileSync } from 'fs';
import vm from 'vm';
const lue = (f) => readFileSync(new URL('../' + f, import.meta.url), 'utf8');
const VP = lue('TalentMaster_VP_v25.html');
const funktio = (alku) => { const i = VP.indexOf(alku); if (i < 0) throw new Error('ei löydy ' + alku); let d = 0, j = VP.indexOf('{', i); for (; j < VP.length; j++) { if (VP[j] === '{') d++; else if (VP[j] === '}') { d--; if (d === 0) break; } } return VP.slice(i, j + 1); };

describe('A2 · _jspVaihda V4:ssä', () => {
  function siirry(v4, pid) {
    const loki = []; const sb = { window: { _ktLippu: v4, _ktValilehti: (p, v) => loki.push(['kt', p, v]), _jspVaihda: (n) => loki.push(['jsp', n]) }, _ktS: { pid }, document: { getElementById: (id) => (id === 'ktNakyma' && v4 ? {} : null) } };
    vm.createContext(sb); vm.runInContext(VP.slice(VP.indexOf('window._vpKtSiirry = function'), VP.indexOf('window._jspVaihda = function(n) {')), sb);
    return { loki, aja: (n) => sb.window._vpKtSiirry(n) };
  }
  it('V4: Kehitys/Viikko → Polku, Mittaus/Arviointi → Näyttö, 0 → Tänään (ei _jspVaihda); vanhassa modaalissa _jspVaihda', () => {
    const v = siirry(true, 'p1'); [3, 4, 1, 2, 0].forEach((n) => v.aja(n));
    expect(v.loki).toEqual([['kt', 'p1', 'polku'], ['kt', 'p1', 'polku'], ['kt', 'p1', 'naytto'], ['kt', 'p1', 'naytto'], ['kt', 'p1', 'tanaan']]);
    const e = siirry(false, null); e.aja(3); expect(e.loki).toEqual([['jsp', 3]]);
    const pid = siirry(true, null); pid.aja(3); expect(pid.loki).toEqual([['jsp', 3]]);   // ei aktiivista V4-pelaajaa → vanha reitti
  });
  it('Polun/Viikon CTA:t (Aloita jakso (Polku) →, avaa Kehitys →, Avaa katselmus →, 🩹) käyttävät _vpKtSiirry:a; lohko 20 on tyhjä V4:ssä', () => {
    for (const teksti of ["vpT('Aloita jakso (Polku) →')", "vpT('avaa Kehitys →')", "vpT('Avaa katselmus →')", "Terveyssyy — katso Terveys/Mittaus-välilehti"]) {
      const i = VP.indexOf(teksti); expect(i, teksti).toBeGreaterThan(0);
      const rivi = VP.slice(VP.lastIndexOf('\n', i) + 1, VP.indexOf('\n', i)); expect(rivi, teksti).toContain('_vpKtSiirry('); expect(rivi, teksti).not.toContain('_jspVaihda(');
    }
    const f = funktio('function _vpMittausNextStepHTML(p)'); const sb = { window: { _ktLippu: true }, vpT: (x) => x }; vm.createContext(sb); vm.runInContext(f + '\nthis.r=_vpMittausNextStepHTML({});', sb); expect(sb.r).toBe('');
    const sb2 = { window: { _ktLippu: false }, vpT: (x) => x }; vm.createContext(sb2); vm.runInContext(f + '\nthis.r=_vpMittausNextStepHTML({});', sb2); expect(sb2.r).toContain('mit-nstep');
  });
});

describe('A3 · Viikko V4:ssä', () => {
  it('_ktNayta käynnistää viikon latauksen Polkua avattaessa (kerran: ladataan-lippu); _vpViikkoHTML ei nollaa samaa pelaajaa+jaksoa V4:ssä', () => {
    const k = funktio('function _ktNayta()'); expect(k).toMatch(/S\.ladattu\.polku && p\.jaksofokus && typeof _vpViikkoLataa/); expect(k).toMatch(/!_vs\.ladattu && !_vs\.ladataan/);
    const h = funktio('function _vpViikkoHTML(p)'); expect(h).toMatch(/window\._ktLippu && _ed && _ed\.pid === p\.id/); expect(h).toMatch(/else _vpViikkoInit\(p\)/);
    expect(h.indexOf('else _vpViikkoInit(p)')).toBeLessThan(h.indexOf('MUUTOS 8'));
  });
  it('tila säilyy uudelleenrenderöinnissä (guard-ehto ajettuna): sama pelaaja + sama jakso → ei init; eri jakso/pelaaja → init', () => {
    const guard = (ed, p, jf, v4) => { let init = 0; const sb = { window: { _ktLippu: v4, _vpViikko: ed }, _vpViikkoInit: () => { init++; }, p, jf }; vm.createContext(sb);
      vm.runInContext("const _ed = window._vpViikko;\nif (window._ktLippu && _ed && _ed.pid === p.id && ((_ed.jf && _ed.jf.alkoi) || null) === ((jf && jf.alkoi) || null)) { _ed.p = p; _ed.jf = jf; } else _vpViikkoInit(p);", sb); return init; };
    const ed = { pid: 'p1', jf: { alkoi: 'A' }, ladattu: true };
    expect(guard(ed, { id: 'p1' }, { alkoi: 'A' }, true)).toBe(0); expect(guard(ed, { id: 'p1' }, { alkoi: 'B' }, true)).toBe(1); expect(guard(ed, { id: 'p2' }, { alkoi: 'A' }, true)).toBe(1); expect(guard(ed, { id: 'p1' }, { alkoi: 'A' }, false)).toBe(1);
  });
});

describe('A4 · Mittauslistan roolit', () => {
  it('_vpVoiMuokata(p): oman joukkueen valmentaja muokkaa omaa pelaajaa, ei toisen joukkueen eikä ilman pelaajaa; johto kaikkia', () => {
    const sb = { window: { _vpSA: false, _vpRooli: 'valmentaja', _vpOmatJoukkueet: { ids: ['kpv_u13'] } }, _vpOmistaaPelaajan: (p, o) => !!(o && (p.joukkueet || []).some((j) => o.ids.indexOf(j) >= 0)) }; vm.createContext(sb);
    vm.runInContext(funktio('function _vpVoiMuokata(pelaaja)') + '\nthis.f=_vpVoiMuokata;', sb);
    expect(sb.f({ joukkueet: ['kpv_u13'] })).toBe(true); expect(sb.f({ joukkueet: ['kpv_u15'] })).toBe(false); expect(sb.f()).toBe(false);
    sb.window._vpRooli = 'vp'; expect(sb.f()).toBe(true);
  });
  it('_vpRenderMittausLista ja Poista/Palauta/Korjaa antavat pelaajan; ei enää argumentitonta _vpVoiMuokata()-kutsua mittauslistassa', () => {
    expect(funktio('function _vpRenderMittausLista(p)')).toContain('_vpVoiMuokata(p)');
    for (const n of ['_vpMittausPoista', '_vpMittausPalauta', '_vpMittausKorjaa']) { const f = funktio('window.' + n + ' = async function'); expect(f, n).toContain('_vpVoiMuokata(p)'); expect(f, n).not.toContain('_vpVoiMuokata()'); expect(f.indexOf('var p = window._vpMittausPelaaja'), n).toBeLessThan(f.indexOf('_vpVoiMuokata(p)')); }
  });
  it('_vpMittausPaivitaNakyma: V4:ssä päivitys paikallaan (_ktPaivita), ei _ktAvaaIdx/pikakatsausta (nykyinen välilehti säilyy)', () => {
    const f = funktio('function _vpMittausPaivitaNakyma(p)'); expect(f.indexOf('_ktPaivita()')).toBeGreaterThan(0); expect(f.indexOf('_ktPaivita()')).toBeLessThan(f.indexOf('_avaaPerPelaajaPikakatsaus'));
    const kirj = []; const sb = { window: { _ktLippu: true, _jsvPelaajat: [] }, _ktS: { pid: 'p1' }, document: { getElementById: () => ({}) }, _ktPaivita: () => kirj.push('paivita'), _avaaPerPelaajaPikakatsaus: () => kirj.push('pikakatsaus'), _jspVaihda: () => kirj.push('jsp'), _vpRenderMittausLista: () => kirj.push('lista') };
    vm.createContext(sb); vm.runInContext(f + '\n_vpMittausPaivitaNakyma({ id: "p1" });', sb); expect(kirj).toEqual(['paivita']);
  });
});

describe('A5 · D3 "Arvioi (VP)" roolitarkistus', () => {
  function aja(johto) {
    const kirj = { set: [], toast: [] };
    const sb = { console: { warn() {} }, JSON, Object, document: { getElementById: () => null }, window: {}, _vpSeurantaOnJohto: () => johto, D3_DIMS: [{ key: 'a' }], _vpD3Vastaukset: { a: 2 }, _seuraId: 'kpv', tmPaivaIso: () => '2026-10-20', vpT: (x) => x,
      _vpD3PelaajaById: () => ({ id: 'p1', d3_viimeisin: { pisteet: { a: { valmentaja: 3, pelaaja: 2 } }, lahteet: ['valmentaja'] } }), toast: (m) => kirj.toast.push(m),
      db: { collection: () => ({ doc: () => ({ collection: () => ({ doc: () => ({ set: async (d) => { kirj.set.push(d); } }) }) }) }) } };
    vm.createContext(sb); vm.runInContext(funktio('window._tallennaVpD3 = async function(pid)') + '\nthis.f = window._tallennaVpD3;', sb);
    return { kirj, aja: () => sb.f('p1') };
  }
  it('valmentaja: ei kirjoitusta (ei pisteet[dim].vp), toast; VP/johto: kirjoittaa vp-arvion ja säilyttää valmentaja/pelaaja', async () => {
    const v = aja(false); await v.aja(); expect(v.kirj.set).toEqual([]); expect(v.kirj.toast.length).toBe(1);
    const j = aja(true); await j.aja(); expect(j.kirj.set.length).toBe(1);
    const d3 = j.kirj.set[0].d3_viimeisin; expect(d3.pisteet.a).toEqual({ valmentaja: 3, pelaaja: 2, vp: 2 }); expect(d3.lahteet).toContain('vp');
  });
  it('"Arvioi (VP)" -nappi näkyy vain johdolle; modaalin avaus on rooliportin takana', () => {
    expect(VP).toMatch(/\(!_vpSeurantaOnJohto\(\) \? '' : '<button onclick="event\.stopPropagation\(\);_avaaVpD3Arvio/);
    expect(funktio('window._avaaVpD3Arvio = function(pid)')).toMatch(/if \(!_vpSeurantaOnJohto\(\)\) return;/);
  });
});
