/**
 * K2 (CODE_BRIEF_K2_APURI_KAAVIO 2.11.2026): valmennusapurin kaavio — selain/lib-puoli.
 *   A) PELIMUOTO "AvB+K" (jokeri): validaattori + editorin katto, vanhat specit ennallaan
 *   B) SIIRTO apurisivu → Master (lib/tm_kaavio_apuri.js): kertaluku, vanheneminen, sama luonnosmuoto kuin "Luo ja muokkaa"
 *   C) RAJAUS pienalueelle: vain nakyma "alue", alue + pelaajat + selitteet mahtuvat
 *   D) MASTER-VASTAANOTTO: oikeus, seura, validointi, SAMA editori (ei uutta kirjoituspolkua → ei Rules-muutosta)
 *   E) KYTKENNÄT: Master + apurisivu lataavat jaetut libit, functions/-kopiot tavu tavulta samat
 */
import { describe, it, expect } from 'vitest';
import { readFileSync } from 'fs';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';
import { createRequire } from 'module';
const require = createRequire(import.meta.url);
const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..');
const lue = (f) => readFileSync(join(ROOT, f), 'utf8');
const V = require('../lib/tm_kaavio_validate.js');
const ED = require('../lib/tm_kaavio_editori.js');
const AP = require('../lib/tm_kaavio_apuri.js');
const R = require('../lib/tm_kaavio_render.js');

const pel = (id, joukkue, x, y) => ({ id, joukkue, rooli: joukkue === 'oma' ? 'tuki' : 'paine', x: x || 50, y: y || 50 });
const SPEC = { avain: 'y_h5', suunta: 'ylos', pelimuoto: '2v2+1', nakyma: 'alue', vyohyke: { x: 39, y: 43, w: 22, h: 14 },
  pelaajat: [pel('A', 'oma', 45, 54), pel('B', 'oma', 55, 46), pel('J', 'oma', 50, 56), pel('V1', 'vastustaja', 47, 51), pel('V2', 'vastustaja', 53, 49)],
  liikkeet: [], selitteet: [{ id: 's1', x: 50, y: 59, t: { fi: 'Jokeri' } }] };

describe('A) pelimuoto AvB+K', () => {
  it('2v2+1: jokeri omana tai vastustajana kelpaa, kokonaismäärä enintään 5', () => {
    expect(V.validoiKaavio(SPEC).E).toEqual([]);
    const vast = { ...SPEC, pelaajat: [pel('A', 'oma'), pel('B', 'oma'), pel('V1', 'vastustaja'), pel('V2', 'vastustaja'), pel('J', 'vastustaja')] };
    expect(V.validoiKaavio(vast).E).toEqual([]);
    const liikaa = { ...SPEC, pelaajat: SPEC.pelaajat.concat([pel('V3', 'vastustaja')]) };
    expect(V.validoiKaavio(liikaa).E.join(' ')).toMatch(/pelaajia 6 > pelimuoto 2v2\+1/);
    expect(V.validoiKaavio({ ...SPEC, pelaajat: SPEC.pelaajat.concat([pel('C', 'oma')]) }).E.join(' ')).toMatch(/omia 4 > pelimuoto 2\+1/);
  });
  it('ilman jokeria ennallaan: 2v2 + kolmas oma → sama virheteksti kuin ennen', () => {
    expect(V.validoiKaavio({ ...SPEC, pelimuoto: '2v2' }).E.join(' ')).toMatch(/^omia 3 > pelimuoto 2$/);
  });
  it('editorin katto seuraa samaa sääntöä (kaksinkertainen portti)', () => {
    expect(ED.kaavioKatto('2v2+1')).toEqual([2, 2, 1]);
    expect(ED.kaavioKatto('8v8')).toEqual([8, 8, 0]);
    const neljä = { ...SPEC, pelaajat: SPEC.pelaajat.slice(0, 4) };      // 3 omaa + 1 vastustaja
    expect(ED.kaavioMahtuu(neljä, 'vastustaja')).toBe(true);
    expect(ED.kaavioMahtuu(neljä, 'oma')).toBe(false);                    // 3 = 2+1
    expect(ED.kaavioMahtuu(SPEC, 'vastustaja')).toBe(false);               // 5 = 2+2+1 täynnä
    expect(ED.kaavioMahtuu({ pelimuoto: '8v8', pelaajat: [pel('A', 'oma')] }, 'oma')).toBe(true);
  });
});

function muisti() { const d = {}; return { d, getItem: (k) => (k in d ? d[k] : null), setItem: (k, v) => { d[k] = String(v); }, removeItem: (k) => { delete d[k]; } }; }

describe('A2) KPI a–g (kaanonissa e–g)', () => {
  const K = require('../lib/tm_kaavio_konsepti.js'), TT = require('../lib/tm_teknistaktiset.js');
  const koodit = (a) => K.kaavioKpiKoodit(TT.TM_TT_YOUTH.find((k) => k.avain === a));
  it('e kelpaa konseptille jolla se on (y_h1), hylätään konseptilla jolla ei ole (y_h8)', () => {
    expect(koodit('y_h1')).toContain('e'); expect(koodit('y_h8')).not.toContain('e');
    expect(V.validoiKaavio({ ...SPEC, avain: 'y_h1', kpi: 'e' }, { kpiKoodit: koodit('y_h1') }).E).toEqual([]);
    const E = V.validoiKaavio({ ...SPEC, avain: 'y_h8', kpi: 'e' }, { kpiKoodit: koodit('y_h8') }).E.join(' ');
    expect(E).toMatch(/kpi "e" ei ole konseptin y_h8 KPI-listalla/); expect(E).not.toMatch(/kpi ei kelpaa/);
  });
  it('g kelpaa y_p1:lle (a–g); h hylätään aina syntaksissa', () => {
    expect(V.validoiKaavio({ ...SPEC, avain: 'y_p1', kpi: 'g' }, { kpiKoodit: koodit('y_p1') }).E).toEqual([]);
    expect(V.validoiKaavio({ ...SPEC, kpi: 'h' }).E.join(' ')).toMatch(/kpi ei kelpaa \(odotettu a–g\): h/);
  });
});

describe('B) siirto apurisivulta Masteriin', () => {
  it('kirjoita → lue kerran (avain poistuu), sisältö säilyy', () => {
    const s = muisti();
    expect(AP.kirjoita(s, SPEC, 'demo', 1000)).toBe(true);
    const p = AP.lue(s, 2000);
    expect(p.spec).toEqual(SPEC); expect(p.seuraId).toBe('demo');
    expect(AP.lue(s, 2000)).toBe(null);
  });
  it('vanhentunut (yli 15 min), rikkinäinen tai ilman seuraa → null ja avain siivotaan', () => {
    const s = muisti();
    AP.kirjoita(s, SPEC, 'demo', 0);
    expect(AP.lue(s, AP.TTL_MS + 1)).toBe(null); expect(s.d[AP.AVAIN]).toBeUndefined();
    s.setItem(AP.AVAIN, '{rikki'); expect(AP.lue(s)).toBe(null); expect(s.d[AP.AVAIN]).toBeUndefined();
    expect(AP.kirjoita(s, SPEC, '', 0)).toBe(false);
  });
  it('uusi muokkaus = taulun "Luo ja muokkaa" -muoto: luonnos, versio 0, yksityinen, kapein näkyvyys', () => {
    const m = AP.muokkaus(SPEC, 'demo', 'demo_u13');
    expect(m).toMatchObject({ id: null, _uusi: true, seuraId: 'demo', review: { status: 'luonnos', versio: 0, yksityinen: true, nakyvyys: 'joukkue', joukkueId: 'demo_u13' } });
    expect(m.spec).not.toBe(SPEC);
    const ui = lue('lib/tm_kaavio_ui.js');   // sama muoto kuin _kaavioLuoJaMuokkaa:ssa
    expect(ui).toMatch(/id: null, _uusi: true, seuraId: _kuiCtx\(\)\.seuraId/);
    expect(ui).toMatch(/\{ status: 'luonnos', nakyvyys: _nakArvo, yksityinen: true, versio: 0 \}/);
  });
});

describe('C) pienalueen rajaus', () => {
  const r = { PX: R.kaavioPX, PY: R.kaavioPY, VW: R.KAAVIO_VW, VH: R.KAAVIO_VH };
  it('vain nakyma "alue" + vyohyke rajataan; muut koko kenttä', () => {
    expect(AP.rajaus({ ...SPEC, nakyma: 'puolisko' }, r)).toBe(null);
    expect(AP.rajaus({ ...SPEC, vyohyke: undefined }, r)).toBe(null);
  });
  it('alue, pelaajat ja selite mahtuvat rajaukseen; vähintään 150 yksikköä; kentän sisällä', () => {
    const b = AP.rajaus(SPEC, r);
    expect(b.w).toBeGreaterThanOrEqual(150); expect(b.h).toBeGreaterThanOrEqual(150);
    expect(b.x).toBeGreaterThanOrEqual(0); expect(b.y).toBeGreaterThanOrEqual(0);
    expect(b.x + b.w).toBeLessThanOrEqual(r.VW); expect(b.y + b.h).toBeLessThanOrEqual(r.VH);
    const z = SPEC.vyohyke;
    expect(b.x).toBeLessThanOrEqual(r.PX(z.x)); expect(b.x + b.w).toBeGreaterThanOrEqual(r.PX(z.x + z.w));
    SPEC.pelaajat.forEach((p) => { expect(r.PX(p.x)).toBeGreaterThan(b.x); expect(r.PY(p.y)).toBeLessThan(b.y + b.h); });
    expect(b.viewBox).toBe(b.x + ' ' + b.y + ' ' + b.w + ' ' + b.h);
    expect(b.w).toBeLessThan(r.VW * 0.75);   // oikeasti zoomaa (15×15 m ei jää postimerkiksi)
  });
  it('reunalla oleva alue pysyy kentän sisällä', () => {
    const b = AP.rajaus({ ...SPEC, vyohyke: { x: 0, y: 0, w: 20, h: 14 }, pelaajat: [pel('A', 'oma', 2, 2)], selitteet: [] }, r);
    expect(b.x).toBe(0); expect(b.y).toBe(0);
  });
});

describe('D) Master-vastaanotto (masterAvaa)', () => {
  const pohja = (o) => {
    const s = muisti(), kutsut = { editori: [], toast: [] };
    AP.kirjoita(s, SPEC, 'demo');
    const env = Object.assign({ storage: s, haku: '?apuriKaavio=1', ctx: () => ({ rooli: 'valmentaja', seuraId: 'demo', joukkueet: ['demo_u13'] }),
      voiLuoda: (c) => c.superAdmin || ['valmentaja', 'vp'].includes(c.rooli), validoi: V.validoiKaavio,
      avaaPankki: async () => {}, avaaEditori: (m) => kutsut.editori.push(m), toast: (t) => kutsut.toast.push(t), t: (x) => x }, o || {});
    return { env, kutsut, s };
  };
  it('ilman ?apuriKaavio=1 ei tehdä mitään eikä siirtoa kuluteta', () => {
    const { env, s } = pohja({ haku: '' });
    expect(AP.masterAvaa(env)).toBe('ei-pyyntoa'); expect(s.d[AP.AVAIN]).toBeTruthy();
  });
  it('valmentaja omassa seurassa → SAMA editori avautuu luonnoksena (kohde: ainoa oma joukkue)', async () => {
    const { env, kutsut } = pohja();
    expect(AP.masterAvaa(env)).toBe('avattu');
    await new Promise((r) => setTimeout(r, 0));
    expect(kutsut.editori).toHaveLength(1);
    expect(kutsut.editori[0]).toMatchObject({ _uusi: true, seuraId: 'demo', review: { status: 'luonnos', versio: 0, joukkueId: 'demo_u13' } });
  });
  it('ei oikeutta / toinen seura / kelvoton spec → ei editoria, toast', () => {
    expect(AP.masterAvaa(pohja({ ctx: () => ({ rooli: 'seurasihteeri', seuraId: 'demo' }) }).env)).toBe('ei-oikeutta');
    expect(AP.masterAvaa(pohja({ ctx: () => ({ rooli: 'valmentaja', seuraId: 'muu' }) }).env)).toBe('eri-seura');
    expect(AP.masterAvaa(pohja({ validoi: () => ({ E: ['x'] }) }).env)).toBe('ei-kelpaa');
    const { env, kutsut } = pohja({ ctx: () => ({ superAdmin: true, seuraId: 'muu' }) });
    expect(AP.masterAvaa(env)).toBe('avattu');   // SA: kaavio tallentuu specin seuraan (m.seuraId)
    expect(kutsut.toast).toEqual([]);
  });
  it('tyhjä siirto → toast, ei editoria', () => {
    const { env, kutsut, s } = pohja(); s.removeItem(AP.AVAIN);
    expect(AP.masterAvaa(env)).toBe('ei-siirtoa'); expect(kutsut.editori).toEqual([]); expect(kutsut.toast).toHaveLength(1);
  });
  it('ei uutta kirjoituspolkua: lib ei kirjoita Firestoreen (tallennus = _kaavioTallenna create-haara → nykyiset Rules)', () => {
    const src = lue('lib/tm_kaavio_apuri.js');
    expect(src).not.toMatch(/\.add\(|\.set\(|\.update\(|firestore|collection\(/);
  });
});

describe('E) kytkennät', () => {
  const M = lue('TalentMaster_Master_v16.html'), S = lue('TalentMaster_Valmennusapuri.html');
  it('Master lataa tm_kaavio_apuri.js jaetun UI-libin jälkeen ja kutsuu masterAvaa samoilla jaetuilla funktioilla', () => {
    expect(M.indexOf('<script src="lib/tm_kaavio_apuri.js">')).toBeGreaterThan(M.indexOf('<script src="lib/tm_kaavio_ui.js">'));
    expect(M).toMatch(/TM_KAAVIO_APURI\.masterAvaa\(\{[^\n]*validoi: validoiKaavio[^\n]*avaaEditori: function \(m\) \{ _kaavioAvaaEditori\(m\); \}/);
  });
  it('apurisivu: jaettu renderöijä + policy + siirtolib; ei omaa piirtoa eikä validointia', () => {
    ['lib/tm_kaavio_render.js', 'lib/tm_kaavio_policy.js', 'lib/tm_kaavio_apuri.js'].forEach((f) => expect(S).toContain('<script src="' + f + '">'));
    expect(S).toMatch(/R\.drawSpec\(spec, kieli\)/);
    expect(S).not.toMatch(/createElementNS/);
    expect(S).toMatch(/avaaTaulussa: 'Öppna i taktiktavlan'/);
  });
  it('apurisivu ei lähetä kaaviota takaisin palvelimelle historiassa', () => {
    expect(S).toMatch(/historia\.map\(function \(v\) \{ return \{ role: v\.role, content: v\.content \}; \}\)/);
  });
  it('functions/-kopiot (validaattori, konsepti, kaanon) tavu tavulta samat kuin lib/', () => {
    ['tm_kaavio_validate.js', 'tm_kaavio_konsepti.js', 'tm_teknistaktiset.js'].forEach((f) => expect(lue('functions/' + f)).toBe(lue('lib/' + f)));
    expect(JSON.parse(lue('functions/jaettu_lib.json')).tiedostot).toEqual(expect.arrayContaining(['tm_kaavio_validate.js', 'tm_kaavio_konsepti.js', 'tm_teknistaktiset.js']));
  });
  it('lippu VALMENNUSAPURI_KAAVIO ei ole pilotin env-tiedostossa (päälle vasta laatutestin jälkeen)', () => {
    let env = ''; try { env = lue('functions/.env.talentmaster-pilot'); } catch (e) { env = ''; }
    expect(env).not.toMatch(/VALMENNUSAPURI_KAAVIO/);
  });
});
