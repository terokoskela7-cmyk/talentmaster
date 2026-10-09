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

describe('A13 · kytkennät', () => {
  it('_ktToimi("havainto") avaa paneelin paikallaan; jatka/avaa_polku/kuorma vievät yhä Polkuun', () => {
    expect(VP).toContain("if (avain === 'havainto') return window._ktHavaintoAvaa(pid);");
    expect(VP).toMatch(/avain === 'jatka' \|\| avain === 'avaa_polku' \|\| avain === 'kuorma'\) return window\._ktValilehti\(pid, 'polku'\)/);
  });
  it('VP antaa osaFn/tallennaFn; käsittelijät ja kirjoitus ovat libissä (yksi toteutus VP:n ja Masterin kesken); osa-arvion tallennus päivittää V4:n; kirjoitus: getIdToken(true) + osa_arviot-polku', () => {
    expect(VP).toContain("osaFn: '_ktHavaintoAvaa'"); expect(VP).toContain("tallennaFn: '_ktHavaintoTallenna'"); expect(VP).toContain('tmKtHavaintoKasittelijat({');
    const set = fn('window._vpJfOsaArvioSet = function (pid, konseptiAvain, koodi, n) {');
    expect(set).toContain('_ktPaivita()'); expect(set).toContain('tmKtTallennaOsaArvio({');
    const lib = readFileSync(join(__dir, '..', 'lib', 'tm_kehitystyopoyta.js'), 'utf8'); expect(lib).toContain("'osa_arviot.' + konsepti"); expect(lib).toContain('getIdToken(true)');
  });
  it('ei uutta kirjoituspolkua: VP:n kytkentä ei kosketa Firestorea paneelin kautta', () => {
    const koodi = VP.slice(VP.indexOf('const _ktHk ='), VP.indexOf('function _ktOsio(otsikko)'));
    expect(koodi).not.toMatch(/\.update\(|\.set\(|firestore\(|collection\(/);
  });

});
