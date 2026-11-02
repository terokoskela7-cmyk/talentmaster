/* QG-1 · kielivartija: baseline-vartija, muuttujallisten tekstien osat, CI kaataa, fixture-seura ilman tuotantodataa (repo on julkinen). */
import { describe, it, expect } from 'vitest';
import { readFileSync } from 'fs';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';
import { tarkistaBaseline } from '../tools/i18n/sv_baseline_vartija.mjs';
import { tekstinOsat, onkoSuomea } from '../tools/i18n/sv_lapiajo_fi.mjs';
import { dokit, CALLABLET, ROOLIT } from '../tools/i18n/sv_fixtuuri.mjs';

const JUURI = join(dirname(fileURLToPath(import.meta.url)), '..');
const lue = (f) => readFileSync(join(JUURI, f), 'utf8');

describe('QG-1 · baseline saa vain pienentyä', () => {
  const vanha = { tekstit: ['a', 'b', 'c'] };
  it('lisäys ilman [baseline]-merkintää kaatuu, merkinnällä menee läpi', () => {
    const r = tarkistaBaseline(vanha, { tekstit: ['a', 'b', 'c', 'uusi'] }, 'Korjaa kalenterin');
    expect(r.ok).toBe(false); expect(r.lisatyt).toEqual(['uusi']);
    expect(tarkistaBaseline(vanha, { tekstit: ['a', 'b', 'c', 'uusi'] }, 'PM hyväksyi [baseline] 28 tekstiä').ok).toBe(true);
    expect(tarkistaBaseline(vanha, { tekstit: ['a', 'uusi'] }, null).ok).toBe(false);   // poisto ei oikeuta lisäystä
  });
  it('pelkkä poisto on aina sallittu', () => {
    const r = tarkistaBaseline(vanha, { tekstit: ['a'] }, '');
    expect(r.ok).toBe(true); expect(r.poistetut).toEqual(['b', 'c']);
  });
});

describe('QG-1 · muuttujalliset tekstit tunnistetaan osina', () => {
  it('luvut ja erottimet pilkkovat tekstin osiin', () => {
    expect(tekstinOsat('Tällä kaudella: 3 omatoimista')).toEqual(['Tällä kaudella', 'omatoimista']);
    expect(tekstinOsat('Du utvecklar det här: Haltuunotto.')).toEqual(['Du utvecklar det här', 'Haltuunotto']);
    expect(tekstinOsat('D1 · Ei luokkaa · 0/2 mitattu tuoreesti · 1 ilman päivää')).toEqual(['Ei luokkaa', 'mitattu tuoreesti', 'ilman päivää']);
  });
  it('heuristiikka yksin EI tunnista näitä — siksi korpus-osat (ks. sv_lapiajo.mjs OSAT)', () => {
    expect(onkoSuomea('Tällä kaudella: 3 omatoimista').fi).toBe(false);
    expect(onkoSuomea('Haltuunotto').fi).toBe(false);
  });
});

describe('QG-1 · CI kaataa uudesta suomesta', () => {
  const t = lue('.github/workflows/test.yml');
  const sv = t.slice(t.indexOf('  sv-lapiajo:'), t.indexOf('\n  lint:'));
  it('sv-lapiajo: --tarkista --kaada, ei continue-on-erroria, kaksi rinnakkaista osaa, pipefail (tee ei peitä exit-koodia)', () => {
    expect(sv).toContain('--tarkista --kaada');
    expect(sv).not.toMatch(/continue-on-error/);
    expect(sv).toMatch(/osa: \[demo, fixtuuri\]/);
    expect(sv).toContain('--osa=${{ matrix.osa }}');
    expect(sv).toContain('set -o pipefail');
    expect(sv).toContain('timeout-minutes: 10');
  });
  it('baseline-vartija: oma workflow, ajetaan myös kun PR-kuvausta muokataan; kuvaus ympäristömuuttujana (ei injektiota)', () => {
    const b = lue('.github/workflows/sv-baseline.yml');
    expect(b).toMatch(/types: \[opened, synchronize, reopened, edited\]/);
    expect(b).toContain('PR_RUNKO: ${{ github.event.pull_request.body }}');
    expect(b).not.toMatch(/run:.*github\.event\.pull_request\.body/);
    expect(b).toContain('node tools/i18n/sv_baseline_vartija.mjs');
  });
  it('hyväksyntätestit ajetaan chrome-tests-vaiheessa', () => {
    expect(t).toContain('tests/sv_kielivartija_selain.test.js');
  });
});

describe('QG-1 · fixture-seura on synteettinen (repo on julkinen)', () => {
  const D = dokit(), json = JSON.stringify({ D, CALLABLET, R: Object.keys(ROOLIT).map((k) => ROOLIT[k]()) });
  it('vain keksitty seura qgfx, ei pilottiseurojen tunnisteita, ei oikeita henkilöitä eikä sähköposteja', () => {
    expect(Object.keys(D).every((k) => k.startsWith('seurat/qgfx'))).toBe(true);
    for (const kielletty of ['kpv', 'sjk', 'grifk', 'vifk', 'sibbovargarna', 'palloiirot', 'yilves', 'hjk', 'fcl', 'm93GBdOaGCUuenMiCL0I', 'Topias', 'Koskela', 'talentmasterid', '@gmail', '@talentmaster.fi', 'PalloID']) expect(json).not.toContain(kielletty);
    for (const m of json.match(/[\w.+-]+@[\w.-]+/g) || []) expect(m).toMatch(/@example\.test$/);
  });
  it('tila kattaa viikon 44 aukkojen lähteet: jakso osineen, ydinvahvuus, tukiosa, sitoumus q1–q3, ≥2 mittausta, kertymä, kalenteri + tilaus, VP-kooste', () => {
    const a = D['seurat/qgfx/pelaajat/qp1'];
    expect(a.jaksofokus.konsepti_avain).toBeTruthy(); expect(a.jaksofokus.tukiosa.alue).toBeTruthy(); expect(a.ydinvahvuus.alue).toBeTruthy();
    expect(a.hh_historia.length).toBeGreaterThanOrEqual(2); expect(a.tki_historia.length).toBeGreaterThanOrEqual(2);
    expect(Object.keys(D['seurat/qgfx/pelaajat/qp1/idp_kausi/2026'].pelaaja_sitoumus.itsearvio)).toEqual(['q1', 'q2', 'q3']);
    expect(D['seurat/qgfx/pelaajat/qp2/idp_kausi/2026']).toBeUndefined();   // toinen pelaaja: sitoumuslomake tyhjänä
    expect(CALLABLET.haePelaajanKertyma.kertyma).toBeTruthy(); expect(CALLABLET.haePelaajanKalenteri.tapahtumat.length).toBeGreaterThan(0);
    expect(CALLABLET.haeKalenteriTilausTila).toEqual({ aktiivinen: false });
    expect(Object.keys(D).filter((k) => k.startsWith('seurat/qgfx/kooste/')).length).toBe(4);
    expect(D['seurat/qgfx/liput/julkiset']).toEqual({ kentta: true, valmentaja_v2: true, kehitystyopoyta_v2: true });
  });
  it('Firebase-tynkä: ei verkkokutsuja (ei fetch/XHR/websocket), kirjoitukset vain muistiin', () => {
    const s = lue('tools/i18n/sv_fixtuuri_firebase.js');
    expect(s).not.toMatch(/\bfetch\(|XMLHttpRequest|WebSocket|googleapis/);
    const v = lue('tools/i18n/sv_fixtuuri.mjs');
    expect(v).toContain('estetyt.push(u); return r.abort();');   // kaikki muu ulkoverkko estetään
  });
});
