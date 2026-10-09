/**
 * Kehitystyöpöytä 22 · A13 jatko 3 — viikkohavainto Masteriin (sama paneeli, käsittelijät ja kirjoitusydin kuin VP:ssä), sävy roolin mukaan, puuttuva konseptiavain.
 * Oikeus = näkymän oikeus (tmPelaajaOikeus): oma joukkue / talenttivalmentaja / johto oma seura / SA — sama sääntö kuin Rules. Kirjoitukset tuotannossa vain nimetyille KPV-testipelaajille (käsitesti).
 */
import { describe, it, expect } from 'vitest';
import { readFileSync } from 'fs';
import { createRequire } from 'module';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

const require = createRequire(import.meta.url);
const KT = require('../lib/tm_kehitystyopoyta.js');
const AJ = require('../lib/tm_aloita_jakso.js');
const TS = require('../lib/tm_tanaan_signaali.js');
const H = require('../lib/tm_hash_reititin.js');
const KS = require('../lib/tm_kehityssilmukka.js');
const __dir = dirname(fileURLToPath(import.meta.url));
const lue = (f) => readFileSync(join(__dir, '..', f), 'utf8');
const VP = lue('TalentMaster_VP_v25.html'), MASTER = lue('TalentMaster_Master_v16.html'), LIB = lue('lib/tm_kehitystyopoyta.js');

const NYT = new Date('2026-10-14T10:00:00+03:00'), PID = 'm93GBdOaGCUuenMiCL0I';
const ESC = (x) => String(x == null ? '' : x).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
const KAANON = () => ({ kpi: [1, 2, 3, 4, 5].map((i) => ({ koodi: 'k' + i, teksti: 'Osa ' + i + ' nimeltään tässä: selitys ' + i + ' pidempi' })) });
const pel = (jf, o) => Object.assign({ id: PID, etunimi: 'Topias', joukkue: 'KPV P13', jaksofokus: Object.assign({ konsepti_avain: 'kons', konsepti_nimi: 'Haltuunotto', alkoi: '2026-10-05T08:00:00', kesto_vk: 6, osa_arviot: { kons: { k1: 3, k2: 2 } } }, jf || {}) }, o || {});
const tila = (p) => AJ.tmJaksoTila(p, { nyt: NYT });
/* Master antaa täsmälleen nämä asetukset (ei pid:tä, ei pvmFn-riippuvuutta) — peilaa Master_v16:n _ktTanaanHTML */
const masterC = (voi, extra) => Object.assign({ esc: ESC, t: (k) => k, pvmFn: (i) => i, toimiFn: '_ktToimi', osaFn: '_ktHavaintoAvaa', tallennaFn: '_ktHavaintoTallenna', veoFn: '_ktHavaintoVeo', peruFn: '_ktHavaintoSulje', paneeli: true, rooli: 'valmentaja', voiKirjoittaa: voi, kentta: '', kaanon: KAANON, tanaan: '2026-10-14',
  sigCtx: { nyt: NYT, profiili: 'oto', askel: { avain: 'havainto', tila: 'toimenpide' }, vkEiVastattu: false, nimi: 'Topias' }, vk: null, havainto: { auki: true, osa: null } }, extra || {});
const nayta = (p, c) => KT.tmKtTanaanKoko(p, tila(p), c);
const onclickit = (h, sel) => [...h.matchAll(new RegExp('<button[^>]*' + sel + '[^>]*onclick="([^"]*)"', 'g'))].map((m) => m[1].replace(/&quot;/g, '"').replace(/&amp;/g, '&'));
const plain = (h) => h.replace(/<[^>]+>/g, ' ').replace(/\s+/g, ' ');

describe('1 · sama paneeli Masteriin — valmentajan oikeus', () => {
  const ctx = (rooli, joukkueet) => ({ rooli, sa: false, seuraId: 'kpv', omaJoukkueet: joukkueet });
  it('oikeus = tmPelaajaOikeus: oman joukkueen valmentaja ✓, toisen joukkueen valmentaja ✗, VP kenelle tahansa oman seuran pelaajalle ✓, SA ✓', () => {
    const oma = pel(null, { joukkue: 'KPV P13', seuraId: 'kpv' }), muu = pel(null, { joukkue: 'KPV P14', seuraId: 'kpv' });
    expect(H.tmPelaajaOikeus(oma, ctx('valmentaja', ['KPV P13'])).ok).toBe(true); expect(H.tmPelaajaOikeus(muu, ctx('valmentaja', ['KPV P13'])).ok).toBe(false);
    expect(H.tmPelaajaOikeus(oma, ctx('vp', null)).ok).toBe(true); expect(H.tmPelaajaOikeus(muu, ctx('vp', ['KPV P13'])).ok).toBe(true);
    expect(H.tmPelaajaOikeus(muu, { rooli: 'valmentaja', sa: true, seuraId: 'kpv', omaJoukkueet: ['KPV P13'] }).ok).toBe(true);
  });
  it('voiKirjoittaa ✓: paneeli avautuu signaalikortin sisään, Osat-rivit ovat painikkeita; ✗ (toisen joukkueen pelaaja): rivit eivät ole painikkeita, paneeli ei avaudu', () => {
    const p = pel(); const ok = nayta(p, masterC(true)), ei = nayta(p, masterC(false));
    expect(ok).toContain('data-kt-havainto-paneeli'); expect((ok.match(/<button type="button" class="kt-osa-r/g) || []).length).toBe(5);
    expect(ei).not.toContain('data-kt-havainto-paneeli'); expect(ei).not.toContain('<button type="button" class="kt-osa-r'); expect((ei.match(/<div class="kt-osa-r/g) || []).length).toBe(5);
  });
  it('Master antaa paneelille asetukset jotka OIKEASTI antaa: jokaisen napin onclick alkaa _ktHavaintoTallenna("<pid>", / _ktHavaintoVeo("<pid>"); new Function(onclick) ei heitä yhdessäkään napissa', () => {
    const c = masterC(true); expect('pid' in c).toBe(false);
    const h = nayta(pel(), c), arvot = onclickit(h, 'data-kt-havainto-arvo');
    expect(arvot).toHaveLength(3); for (const o of arvot) expect(o.startsWith('_ktHavaintoTallenna("' + PID + '",')).toBe(true);
    expect(onclickit(h, 'data-kt-havainto-veo')).toEqual(['_ktHavaintoVeo("' + PID + '")']);
    const kaikki = [...h.matchAll(/onclick="([^"]*)"/g)].map((m) => m[1].replace(/&quot;/g, '"').replace(/&amp;/g, '&')); expect(kaikki.length).toBeGreaterThan(9);
    for (const o of kaikki) expect(() => new Function(o), o).not.toThrow();
  });
  it('Masterin kuori kytketty: paneeli, osaFn, tallennaFn, veoFn, peruFn; _ktToimi("havainto") avaa paneelin paikallaan', () => {
    for (const k of ["paneeli: true", "osaFn: '_ktHavaintoAvaa'", "tallennaFn: '_ktHavaintoTallenna'", "veoFn: '_ktHavaintoVeo'", "peruFn: '_ktHavaintoSulje'", 'voiKirjoittaa: _ktVoiKirjoittaa(p)']) expect(MASTER, k).toContain(k);
    expect(MASTER).toContain("if (avain === 'havainto') return window._ktHavaintoAvaa(pid);"); expect(MASTER).toContain('tmPelaajaOikeus(p, _ktOikeusCtx()).ok');
  });
});

describe('käsittelijät (yksi toteutus libissä)', () => {
  function ymp(voi = true) {
    const S = {}, log = { kirj: [], toast: [], nayta: 0, veo: null }, p = { id: PID };
    const h = KT.tmKtHavaintoKasittelijat({ S, pelaaja: () => p, voi: () => voi, toast: (m, t) => log.toast.push([m, t]), eiOikeutta: () => 'ei oikeutta', nayta: () => { log.nayta++; }, kirjoita: (...a) => log.kirj.push(a), veo: (pid) => { log.veo = pid; return true; } });
    return { S, h, log, p };
  }
  it('avaus asettaa tilan (osa valittuna Osat-riviltä) ja renderöi uudelleen; Peru sulkee', () => {
    const e = ymp(); expect(e.h.avaa(PID)).toBe(true); expect(e.S).toMatchObject({ havaintoAuki: PID, havaintoOsa: null }); e.h.avaa(PID, 'k3'); expect(e.S.havaintoOsa).toBe('k3'); e.h.sulje(); expect(e.S.havaintoAuki).toBeNull(); expect(e.log.nayta).toBe(3);
  });
  it('tallennus: sulkee paneelin, kutsuu kirjoitusydintä (p, avain, koodi, arvo) ja päivittää näytön', () => {
    const e = ymp(); e.S.havaintoAuki = PID; expect(e.h.tallenna(PID, 'kons', 'k2', 3)).toBe(true); expect(e.log.kirj).toEqual([[e.p, 'kons', 'k2', 3]]); expect(e.S.havaintoAuki).toBeNull(); expect(e.log.nayta).toBe(1);
  });
  it('ei oikeutta: ei avaudu, ei kirjoita, toast', () => {
    const e = ymp(false); expect(e.h.avaa(PID)).toBe(false); expect(e.S.havaintoAuki).toBeUndefined(); expect(e.log.toast).toEqual([['ei oikeutta', 'err']]); expect(e.h.tallenna(PID, 'kons', 'k2', 3)).toBe(false); expect(e.log.kirj).toEqual([]);
  });
  it('VEO = olemassa oleva Lisää klippi', () => { const e = ymp(); e.h.veo(PID); expect(e.log.veo).toBe(PID); });
});

describe('2 · yksi kirjoitusydin', () => {
  it('PORTTI: VP ja Master kutsuvat samaa tmKtTallennaOsaArvio-funktiota; kumpikaan ei rakenna omaa osa_arviot-kirjoitusta; libissä yksi määrittely', () => {
    expect(VP).toContain('tmKtTallennaOsaArvio({'); expect(MASTER).toContain('tmKtTallennaOsaArvio({');
    for (const [nimi, src] of [['VP', VP], ['Master', MASTER]]) { expect(src, nimi).not.toMatch(/'osa_arviot\.' \+ /); expect(src, nimi).not.toMatch(/tmPaivitaJaksofokus\(p, _osa\)/); }
    expect((LIB.match(/function tmKtTallennaOsaArvio\(/g) || []).length).toBe(1); expect(LIB).toContain("'osa_arviot.' + konsepti");
  });
  function db(log, kaada) { return { collection: (a) => ({ doc: (b) => ({ collection: (c) => ({ doc: (d) => ({ update: async (data) => { log.push(['update', [a, b, c, d].join('/'), data]); if (kaada) throw Object.assign(new Error('permission-denied'), { code: 'permission-denied' }); } }) }) }) }) }; }
  const deps = (log, o) => Object.assign({ db: db(log, o && o.kaada), sid: 'kpv', auth: () => ({ getIdToken: async (f) => { log.push(['token', f]); } }), KS, demo: false, toast: (m, t) => log.push(['toast', m, t]), t: (k) => k, viesti: 'Osa-arvio tallennettu', demoLisa: ' (demo)', paivita: () => log.push(['paivita']) }, o || {});
  it('paikallinen päivitys heti; getIdToken(true) ENNEN update-kutsua; vain dot-polku jaksofokus.osa_arviot.<konsepti> (muu jaksofokus koskematta)', async () => {
    const log = [], p = pel(); const ok = await KT.tmKtTallennaOsaArvio(deps(log), p, 'kons', 'k3', 2);
    expect(ok).toBe(true); expect(p.jaksofokus.osa_arviot.kons).toEqual({ k1: 3, k2: 2, k3: 2 });
    expect(log.map((x) => x[0])).toEqual(['token', 'update', 'toast', 'paivita']); expect(log[0][1]).toBe(true);
    expect(log[1]).toEqual(['update', 'seurat/kpv/pelaajat/' + PID, { 'jaksofokus.osa_arviot.kons': { k1: 3, k2: 2, k3: 2 } }]); expect(log[2][1]).toBe('Osa-arvio tallennettu ✓');
  });
  it('demo: ei kirjoitusta, lokaali päivitys + toast; virhe: toast + false (paikallinen jää, kuten ennen); ei jaksoa / koodia → false ilman kirjoitusta', async () => {
    const l1 = [], p1 = pel(); expect(await KT.tmKtTallennaOsaArvio(deps(l1, { demo: true }), p1, 'kons', 'k3', 1)).toBe(true); expect(l1.some((x) => x[0] === 'update')).toBe(false); expect(p1.jaksofokus.osa_arviot.kons.k3).toBe(1);
    const l2 = []; expect(await KT.tmKtTallennaOsaArvio(deps(l2, { kaada: true, virheTeksti: (t, e) => t + ' [' + e.code + ']' }), pel(), 'kons', 'k3', 1)).toBe(false); expect(l2.find((x) => x[0] === 'toast')).toEqual(['toast', 'Tallennus epäonnistui [permission-denied]', 'error']);
    const l3 = []; expect(await KT.tmKtTallennaOsaArvio(deps(l3), { id: 'x' }, 'kons', 'k1', 1)).toBe(false); expect(await KT.tmKtTallennaOsaArvio(deps(l3), pel(), '', 'k1', 1)).toBe(false); expect(l3).toEqual([]);
  });
});

describe('3 · sävy roolin mukaan (libissä)', () => {
  const p = pel({ alkoi: '2026-09-09T08:00:00', kesto_vk: 4, osa_arviot: undefined });   // jakso päättynyt 7.10. → suljettava, katselmusikkuna auki
  const p2 = pel({ alkoi: '2026-09-01T08:00:00', kesto_vk: 4, osa_arviot: undefined });   // päättynyt 29.9. → katselmus myöhässä
  const sig = (rooli, profiili, pp) => TS.tmTanaanSignaali(pp || p, { nyt: NYT, rooli, profiili: profiili || 'oto', askel: null, tila: tila(pp || p), nimi: 'Topias' }, { t: (k) => k }).ensisijainen;
  it('VP (johto): kiireellisyys näkyy ("odottaa · N pv", myöhässä amber); valmentaja: ilman painetta ("kun ehdit"), ei myöhästymispäiviä, ei amberia', () => {
    const vp = sig('vp'), val = sig('valmentaja', 'ammatti');   // valmentaja ammattijoukkueessa: rooli voittaa profiilin
    expect(vp.teksti).toMatch(/odottaa · \d+ pv/); expect(sig('vp', 'oto', p2).savy).toBe('amber');
    expect(val.teksti).toContain('kun ehdit'); expect(val.teksti).not.toMatch(/\d+ pv|myöhässä/); expect(val.savy).toBe('neutraali');
    expect(sig('vp', 'oto', p2).teksti).toContain('myöhässä'); expect(sig('valmentaja', 'ammatti', p2).teksti).not.toMatch(/myöhässä|\d+ pv/); expect(sig('valmentaja', 'ammatti', p2).teksti).toContain('kun ehdit');   // myöhästymistä ei näytetä valmentajalle
  });
  it('rooli puuttuu → joukkueen profiili kuten ennen; tmSavyAmmatti: johtoroolit ✓, valmentaja/talenttivalmentaja ✗', () => {
    expect(sig(undefined, 'ammatti').teksti).toMatch(/odottaa/); expect(sig(undefined, 'oto').teksti).toContain('kun ehdit');
    for (const r of ['vp', 'urheilutoimenjohtaja', 'seurasihteeri', 'super_admin']) expect(TS.tmSavyAmmatti({ rooli: r })).toBe(true); for (const r of ['valmentaja', 'talenttivalmentaja', 'fysioterapeutti']) expect(TS.tmSavyAmmatti({ rooli: r, profiili: 'ammatti' })).toBe(false);
  });
  it('tmKtTanaanKoko valitsee sävyn opts.rooli:sta; kuoret vain välittävät roolin', () => {
    expect(plain(nayta(p, masterC(true, { rooli: 'vp', havainto: { auki: false } })))).toMatch(/odottaa · \d+ pv/); expect(plain(nayta(p, masterC(true, { rooli: 'valmentaja', havainto: { auki: false } })))).not.toMatch(/odottaa · \d+ pv/);
    expect(VP).toContain("rooli: window._vpSA ? 'super_admin' : window._vpRooli"); expect(MASTER).toContain("rooli: _superAdmin ? 'super_admin' : _rooli");
  });
});

describe('4 · puuttuva konseptiavain', () => {
  const p = pel({ konsepti_avain: undefined, konsepti_nimi: 'Haltuunotto', osat: ['Yksi osa tässä', 'Toinen osa tässä'], osa_arviot: undefined });
  it('paneelin tilalle teksti "Havaintoa ei voi merkitä tälle jaksolle"; signaalin nappi pysyy näkyvissä; ei poikkeusta (VP ja Master)', () => {
    for (const rooli of ['vp', 'valmentaja']) {
      let h; expect(() => { h = nayta(p, masterC(true, { rooli })); }).not.toThrow();
      expect(plain(h)).toContain('Havaintoa ei voi merkitä tälle jaksolle'); expect(h).toContain('data-kt-signaali-nappi="havainto"'); expect(h).not.toContain('onclick="_ktHavaintoTallenna');
    }
  });
  it('paneelin virhe (puuttuva funktio) ei jätä tyhjää tilaa: konsolivirhe + käyttäjälle teksti, nappi näkyvissä', () => {
    const err = console.error; let kirjattu = 0; console.error = () => { kirjattu++; };
    try { const h = nayta(pel(), masterC(true, { tallennaFn: undefined })); expect(kirjattu).toBe(1); expect(plain(h)).toContain('Havaintopaneelia ei voitu avata'); expect(h).toContain('data-kt-signaali-nappi="havainto"'); } finally { console.error = err; }
  });
});

describe('5 · ei vielä tässä (B1): viimeisin merkintä korvaa edellisen', () => {
  it('A:ssa kirjoitetaan vain arvo (osa_arviot.<konsepti>.<koodi>); ei tekijää/pvm-tietuetta eikä uusia kenttiä', () => {
    const p = pel(); const polut = KS.tmPaivitaJaksofokus(p, { 'osa_arviot.kons': { k1: 1 } }).polut;
    expect(Object.keys(polut)).toEqual(['jaksofokus.osa_arviot.kons']); expect(JSON.stringify(polut)).not.toMatch(/tekija|pvm/);
  });
});
