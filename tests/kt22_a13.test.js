/**
 * Kehitystyöpöytä 22 · A13 (D100, kevyt muoto) — Merkitse viikkohavainto inline signaalikortin alla (VP_v25).
 * Sama kirjoitus kuin Polun osa-arvio (_vpJfOsaArvioSet), ei uutta polkua; vain muokkausoikeudella; välilehti ei vaihdu.
 */
import { describe, it, expect } from 'vitest';
import { readFileSync } from 'fs';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

const __dir = dirname(fileURLToPath(import.meta.url));
const VP = readFileSync(join(__dir, '..', 'TalentMaster_VP_v25.html'), 'utf8');
function fn(sig) { const i = VP.indexOf(sig); if (i < 0) throw new Error(sig); const j = VP.indexOf('\n}\n', i); return VP.slice(i, j + 3); }

const ITEM = { avain: 'vastaanotto', kpi: [{ koodi: 'a', teksti: 'Katse ylös: katsotaan ympärille' }, { koodi: 'b', teksti: 'Vastaanotto: poispäin paineesta' }, { koodi: 'c', teksti: 'Syöttö: nopea' }] };
function ymp(over = {}) {
  const log = { osaSet: [], toast: [], nayta: 0 };
  const S = { havaintoAuki: null, havaintoOsa: null };
  const p = { id: 'p1', jaksofokus: { konsepti_avain: 'vastaanotto', konsepti_nimi: 'Vastaanotto', osa_arviot: over.osa_arviot } };
  const win = {};
  const code = [fn('function _ktHavaintoHTML(p) {'),
    VP.slice(VP.indexOf('window._ktHavaintoAvaa'), VP.indexOf('window._ktHavaintoTallenna')),
    VP.slice(VP.indexOf('window._ktHavaintoTallenna'), VP.indexOf('\n};', VP.indexOf('window._ktHavaintoTallenna')) + 3),
    'return { html: _ktHavaintoHTML };'].join('\n');
  const api = new Function('window', '_ktS', '_ktPelaaja', '_vpVoiMuokata', 'toast', 'vpT', '_jsvEsc', '_vpJfAktItem', '_vpJfOsaJako', '_ktNayta', '_vpJfOsaArvioSet', '_mvAvaa', code)(
    win, S, () => p, over.voi || (() => true), (t) => log.toast.push(t), (x) => x, (x) => String(x), () => ITEM, (t) => ({ nimi: String(t).split(':')[0], selitys: '' }), () => { log.nayta++; },
    (...a) => log.osaSet.push(a), () => 'mv');
  win._vpJfOsaArvioSet = (...a) => log.osaSet.push(a); win._mvAvaa = (pid) => { log.veo = pid; return true; };
  return { api, win, S, p, log };
}

describe('A13 · paneeli', () => {
  it('suljettuna ei renderöidä; avaus asettaa tilan ja renderöi uudelleen (välilehteä ei vaihdeta)', () => {
    const e = ymp(); expect(e.api.html(e.p)).toBe('');
    expect(e.win._ktHavaintoAvaa('p1')).toBe(true); expect(e.S.havaintoAuki).toBe('p1'); expect(e.log.nayta).toBe(1);
    const h = e.api.html(e.p);
    expect(h).toContain('data-kt-havainto-paneeli'); expect(h).toContain('ei vielä'); expect(h).toContain('ohjatusti'); expect(h).toContain('itsenäisesti');
    expect(h).not.toContain('polku');
  });
  it('oletusosa: ensimmäinen "ei vielä" (1) → muuten arvioimaton → muuten ensimmäinen', () => {
    const e = ymp({ osa_arviot: { vastaanotto: { a: 3, b: 1 } } }); e.S.havaintoAuki = 'p1';
    expect(e.api.html(e.p)).toMatch(/data-kt-havainto-osa="b"[^>]*aria-pressed="true"/);
    const e2 = ymp({ osa_arviot: { vastaanotto: { a: 3 } } }); e2.S.havaintoAuki = 'p1';
    expect(e2.api.html(e2.p)).toMatch(/data-kt-havainto-osa="b"[^>]*aria-pressed="true"/);
  });
  it('tallennus kutsuu Polun osa-arvion kirjoitusta (sama funktio) arvolla 1/2/3 ja sulkee paneelin', () => {
    const e = ymp(); e.S.havaintoAuki = 'p1';
    expect(e.api.html(e.p)).toMatch(/_ktHavaintoTallenna\('p1','vastaanotto','a',2\)/);
    expect(e.win._ktHavaintoTallenna('p1', 'vastaanotto', 'a', 2)).toBe(true);
    expect(e.log.osaSet).toEqual([['p1', 'vastaanotto', 'a', 2]]); expect(e.S.havaintoAuki).toBeNull();
  });
  it('ilman muokkausoikeutta: ei avaudu, ei kirjoita, toast', () => {
    const e = ymp({ voi: () => false });
    expect(e.win._ktHavaintoAvaa('p1')).toBe(false); expect(e.S.havaintoAuki).toBeNull(); expect(e.log.toast.length).toBe(1);
    expect(e.win._ktHavaintoTallenna('p1', 'vastaanotto', 'a', 3)).toBe(false); expect(e.log.osaSet).toEqual([]);
  });
  it('VEO-linkki = olemassa oleva Lisää klippi (_mvAvaa), ei uutta kirjoituspolkua', () => {
    const e = ymp(); e.win._ktHavaintoVeo('p1'); expect(e.log.veo).toBe('p1');
  });
});

describe('A13 · kytkennät', () => {
  it('_ktToimi("havainto") avaa paneelin paikallaan; jatka/avaa_polku/kuorma vievät yhä Polkuun', () => {
    expect(VP).toContain("if (avain === 'havainto') return window._ktHavaintoAvaa(pid);");
    expect(VP).toMatch(/avain === 'jatka' \|\| avain === 'avaa_polku' \|\| avain === 'kuorma'\) return window\._ktValilehti\(pid, 'polku'\)/);
  });
  it('paneeli signaalin alla Tänäänissä; osa-arvion tallennus päivittää V4:n (_ktPaivita); kirjoitus: getIdToken(true) + osa_arviot-polku ennallaan', () => {
    expect(VP).toContain('signaaliHTML: _ktSignaaliHTML(p, tila) + _ktHavaintoHTML(p)');
    const set = fn('window._vpJfOsaArvioSet = function (pid, konseptiAvain, koodi, n) {');
    expect(set).toContain('_ktPaivita()'); expect(set).toContain("'osa_arviot.' + konseptiAvain");
    const kirj = fn('async function _vpJfKirjoita(pid, upd, viesti, paivita) {');
    expect(kirj).toContain('getIdToken(true)');
  });
  it('ei uutta kirjoituspolkua: paneelin koodi ei kosketa Firestorea', () => {
    const koodi = fn('function _ktHavaintoHTML(p) {') + VP.slice(VP.indexOf('window._ktHavaintoAvaa'), VP.indexOf('window._ktHavaintoTallenna') + 400);
    expect(koodi).not.toMatch(/\.update\(|\.set\(|firestore\(|collection\(/);
  });
});
