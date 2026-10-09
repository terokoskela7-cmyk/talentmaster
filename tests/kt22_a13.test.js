/**
 * Kehitystyöpöytä 22 · A13 (D100) — Merkitse viikkohavainto signaalikortin sisällä (VP). Sama kirjoitus kuin Polun osa-arvio, ei uutta polkua; vain muokkausoikeudella; välilehti ei vaihdu.
 */
import { describe, it, expect } from 'vitest';
import { readFileSync } from 'fs';
import { createRequire } from 'module';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

const require = createRequire(import.meta.url);
const KT = require('../lib/tm_kehitystyopoyta.js');
const __dir = dirname(fileURLToPath(import.meta.url));
const VP = readFileSync(join(__dir, '..', 'TalentMaster_VP_v25.html'), 'utf8');
function fn(sig) { const i = VP.indexOf(sig); if (i < 0) throw new Error(sig); const j = VP.indexOf('\n}\n', i); return VP.slice(i, j + 3); }

const OSAT = [{ k: 'a', koodi: 'ka', nimi: 'Katse ylös', tila: 'itsenaisesti' }, { k: 'b', koodi: 'kb', nimi: 'Vastaanotto poispäin paineesta', tila: 'ohjatusti' }, { k: 'c', koodi: 'kc', nimi: 'Syöttö', tila: null }];
const c = { t: (k) => k, pid: 'p1', tallennaFn: '_ktHavaintoTallenna', veoFn: '_ktHavaintoVeo', peruFn: '_ktHavaintoSulje' };
const pan = (valittu) => KT.tmKtPaneeliHTML({ osat: OSAT, viikonOsa: KT.tmKtViikonOsa(OSAT), valittu, avain: 'kons' }, c);

describe('A13 · paneeli (lib)', () => {
  it('otsikko näyttää valitun osan kirjaimen ja nimen; oletus = viikon osa (b); erillisiä A–E-kirjainnappeja ei ole', () => {
    expect(pan(null)).toContain('Merkitse viikkohavainto · b Vastaanotto poispäin paineesta');
    expect(pan('kc')).toContain('· c Syöttö'); expect(pan(null)).not.toContain('data-kt-havainto-osa');
  });
  it('kolme vaihtoehtoa .btn.q, valittu (nykyinen arvo) täytetty; napautus kutsuu tallennusta avain+koodi+arvo (1/2/3)', () => {
    const h = pan(null); expect((h.match(/data-kt-havainto-arvo=/g) || []).length).toBe(3);
    expect(h).toMatch(/class="kt-btn q" data-kt-havainto-arvo="1"/); expect(h).toMatch(/class="kt-btn" data-kt-havainto-arvo="2"/);   // ohjatusti on nykyinen → täytetty
    expect(h).toContain('_ktHavaintoTallenna(&quot;p1&quot;,&quot;kons&quot;,&quot;kb&quot;,3)');
  });
  it('VEO-linkki ja Peru säilyvät; ei osia → ohjeteksti', () => {
    const h = pan(null); expect(h).toContain('data-kt-havainto-veo'); expect(h).toContain('data-kt-havainto-peru');
    expect(KT.tmKtPaneeliHTML({ osat: [] }, c)).toContain('Osat tulevat näkyviin');
  });
});

function ymp(over = {}) {
  const log = { osaSet: [], toast: [], nayta: 0 };
  const S = { havaintoAuki: null, havaintoOsa: null }, p = { id: 'p1' }, win = {};
  const loppu = VP.indexOf('\n};', VP.indexOf('window._ktHavaintoTallenna')) + 3;
  const code = VP.slice(VP.indexOf('window._ktHavaintoAvaa'), loppu);
  new Function('window', '_ktS', '_ktPelaaja', '_vpVoiMuokata', 'toast', 'vpT', '_ktNayta', code)(win, S, () => p, over.voi || (() => true), (t) => log.toast.push(t), (x) => x, () => { log.nayta++; });
  win._vpJfOsaArvioSet = (...a) => log.osaSet.push(a); win._mvAvaa = (pid) => { log.veo = pid; return true; };
  return { win, S, log };
}
describe('A13 · käsittelijät (VP)', () => {
  it('avaus asettaa tilan (osa valittuna Osat-riviltä) ja renderöi uudelleen; välilehteä ei vaihdeta', () => {
    const e = ymp(); expect(e.win._ktHavaintoAvaa('p1')).toBe(true); expect(e.S).toMatchObject({ havaintoAuki: 'p1', havaintoOsa: null }); expect(e.log.nayta).toBe(1);
    e.win._ktHavaintoAvaa('p1', 'kc'); expect(e.S.havaintoOsa).toBe('kc');
  });
  it('tallennus kutsuu Polun osa-arvion kirjoitusta (sama funktio) ja sulkee paneelin', () => {
    const e = ymp(); e.S.havaintoAuki = 'p1';
    expect(e.win._ktHavaintoTallenna('p1', 'kons', 'kb', 3)).toBe(true); expect(e.log.osaSet).toEqual([['p1', 'kons', 'kb', 3]]); expect(e.S.havaintoAuki).toBeNull();
  });
  it('ilman muokkausoikeutta (valmentaja toisen joukkueen pelaajalla): ei avaudu, ei kirjoita, toast', () => {
    const e = ymp({ voi: () => false });
    expect(e.win._ktHavaintoAvaa('p1')).toBe(false); expect(e.S.havaintoAuki).toBeNull(); expect(e.log.toast.length).toBe(1);
    expect(e.win._ktHavaintoTallenna('p1', 'kons', 'kb', 3)).toBe(false); expect(e.log.osaSet).toEqual([]);
  });
  it('VEO-linkki = olemassa oleva Lisää klippi (_mvAvaa)', () => { const e = ymp(); e.win._ktHavaintoVeo('p1'); expect(e.log.veo).toBe('p1'); });
});

describe('A13 · kytkennät', () => {
  it('_ktToimi("havainto") avaa paneelin paikallaan; jatka/avaa_polku/kuorma vievät yhä Polkuun', () => {
    expect(VP).toContain("if (avain === 'havainto') return window._ktHavaintoAvaa(pid);");
    expect(VP).toMatch(/avain === 'jatka' \|\| avain === 'avaa_polku' \|\| avain === 'kuorma'\) return window\._ktValilehti\(pid, 'polku'\)/);
  });
  it('Osat-rivit ja paneeli: VP antaa osaFn = _ktHavaintoAvaa; osa-arvion tallennus päivittää V4:n (_ktPaivita); kirjoitus: getIdToken(true) + osa_arviot-polku ennallaan', () => {
    expect(VP).toContain("osaFn: '_ktHavaintoAvaa'"); expect(VP).toContain("tallennaFn: '_ktHavaintoTallenna'");
    const set = fn('window._vpJfOsaArvioSet = function (pid, konseptiAvain, koodi, n) {');
    expect(set).toContain('_ktPaivita()'); expect(set).toContain("'osa_arviot.' + konseptiAvain");
    expect(fn('async function _vpJfKirjoita(pid, upd, viesti, paivita) {')).toContain('getIdToken(true)');
  });
  it('ei uutta kirjoituspolkua: käsittelijät eivät kosketa Firestorea', () => {
    const koodi = VP.slice(VP.indexOf('window._ktHavaintoAvaa'), VP.indexOf('window._ktHavaintoTallenna') + 400);
    expect(koodi).not.toMatch(/\.update\(|\.set\(|firestore\(|collection\(/);
  });
});
