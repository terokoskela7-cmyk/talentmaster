/**
 * Kehitystyöpöytä 22 · A11 (D103) + A13 jatko 2 — kysymyskortit lähteineen: Q1 = viikon osan tila (linkki paneeliin), Q2 = viikkokatsaukset, Q3 = kortti vain kun sitoumus odottaa.
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
const MASTER = readFileSync(join(__dir, '..', 'TalentMaster_Master_v16.html'), 'utf8');
const RULES = readFileSync(join(__dir, '..', 'tm_admin', 'firestore.rules'), 'utf8');

const c = { t: (k) => k, pvmFn: (iso) => iso.split('-').reverse().join('.'), toimiFn: '_ktToimi', pid: 'p1' };
const plain = (h) => h.replace(/<[^>]+>/g, ' ').replace(/\s+/g, ' ');
const OSAT = (...tilat) => tilat.map((t, i) => ({ k: 'abcde'[i], koodi: 'k' + i, nimi: 'Osa ' + 'ABCDE'[i], tila: t }));
const q = (osat, o) => KT.tmKtKysymyksetHTML(Object.assign({ nakyy: true, osat, viikonOsa: KT.tmKtViikonOsa(osat), vk: null, sit: null }, o || {}), c);
const JF = { konsepti_avain: 'k', konsepti_nimi: 'K', alkoi: '2026-10-05T08:00:00', kesto_vk: 6, tila: 'aktiivinen' };
const dok = (id) => ({ id, jakso_alkoi: '2026-10-05', vk: 1, vastaukset: [{ osa: 'A', arvo: 'usein' }] });

describe('Q1 · Näkyykö ydinvahvuus pelissä? = viikon osan tila sanana, alarivi linkki paneeliin', () => {
  it('ei arviota → "Ei vielä havaintoa" + linkki "merkitse viikkohavainto"', () => {
    const h = q(OSAT(null, null)); expect(plain(h)).toContain('Ei vielä havaintoa'); expect(plain(h)).toContain('merkitse viikkohavainto');
    expect(h).toContain("_ktToimi(&quot;p1&quot;,&quot;havainto&quot;)");
  });
  it('arvio olemassa → tila sanana + alarivi "viikkohavainto" on LINKKI (ei "-si", ei päivää)', () => {
    const h = q(OSAT('ohjatusti', null));
    expect(plain(h)).toContain('Ohjatusti'); expect(plain(h)).not.toContain('viikkohavaintosi');
    expect(h).toMatch(/data-kt-havainto-muuta onclick="_ktToimi\(&quot;p1&quot;,&quot;havainto&quot;\)">viikkohavainto<\/button>/);
  });
  it('kaikki osat itsenäisesti → "Itsenäisesti"', () => { expect(plain(q(OSAT('itsenaisesti', 'itsenaisesti')))).toContain('Itsenäisesti'); });
  it('ei otsikkoa "Kolme kysymystä"; ei näy kun jakso ei ole aktiivinen', () => {
    expect(q(OSAT(null))).not.toContain('Kolme kysymystä'); expect(q(OSAT(null), { nakyy: false })).toBe('');
  });
});

describe('Q2 · Treenattiinko? = jakson viikkokatsaukset', () => {
  const rivi = (vk) => plain(q(OSAT(null), { vk }));
  it('n/vk viikkoa + "pelaajan viikkokatsaus su {pvm}"', () => {
    const k = KT.tmKtVkKooste({ jaksofokus: JF }, [dok('2026-10-11'), dok('2026-10-18')], '2026-10-21', 6);   // ke, viikko 3
    expect(k).toMatchObject({ n: 2, vk: 3, viimeisin: '2026-10-18', sunnuntai: false });
    expect(rivi(k)).toContain('2/3 viikkoa'); expect(rivi(k)).toContain('pelaajan viikkokatsaus su 18.10.2026');
  });
  it('sunnuntai & vastaamatta → "Tulee tänään"; ei yhtään (ma–la) → "pelaaja vastaa sunnuntaina"', () => {
    const su = KT.tmKtVkKooste({ jaksofokus: JF }, [], '2026-10-11', 6);   // 11.10.2026 on sunnuntai
    expect(su).toMatchObject({ sunnuntai: true, vastattuTanaan: false }); expect(rivi(su)).toContain('Tulee tänään');
    expect(rivi(KT.tmKtVkKooste({ jaksofokus: JF }, [], '2026-10-14', 6))).toContain('pelaaja vastaa sunnuntaina');
  });
  it('sunnuntai & jo vastattu → vastattuTanaan; toisen jakson dokumentit eivät lasketa', () => {
    const k = KT.tmKtVkKooste({ jaksofokus: JF }, [dok('2026-10-11'), Object.assign(dok('2026-09-27'), { jakso_alkoi: '2026-09-21' })], '2026-10-11', 6);
    expect(k).toMatchObject({ n: 1, vastattuTanaan: true });
  });
  it('6 dokumenttia = raja → "+" jos viikkoja enemmän; ei ladattu (null) → "Ei vielä tietoa"', () => {
    const d6 = ['2026-10-11', '2026-10-18', '2026-10-25', '2026-11-01', '2026-11-08', '2026-11-15'].map(dok);
    const k = KT.tmKtVkKooste({ jaksofokus: Object.assign({}, JF, { kesto_vk: 8 }) }, d6, '2026-11-25', 6);
    expect(k.rajattu).toBe(true); expect(rivi(k)).toContain('6+/8 viikkoa'); expect(rivi(null)).toContain('Ei vielä tietoa');
  });
  it('"tänään" paikallisena päivänä (tmPaivaIso), luku rajattu 6:een ja vain käynnissä olevalle jaksolle', () => {
    for (const src of [VP, MASTER]) {
      expect(src).toContain('tmKtVkKooste(p, c.docs, tmPaivaIso(new Date()), 6)');
      expect(src).toMatch(/\.where\('jakso_alkoi', '==', alkoi\)\.limit\(6\)\.get\(\)/);
      expect(src).toMatch(/tila\.tila !== 'kaynnissa' && tila\.tila !== 'vahvistettu'\)\) return null/);
    }
  });
  it('Rules sallii luvun oman seuran henkilökunnalle (VP + valmentaja)', () => {
    const i = RULES.indexOf('match /viikkokatsaukset/{pvm}');
    expect(RULES.slice(i, i + 400)).toMatch(/allow read:\s+if onSuperAdmin\(\)\s*\|\|\s*\(onKirjautunut\(\) && onOmaSeura\(seuraId\)\)/);
  });
});

describe('Q3 · Onko mukana? — kolmas kortti vain kun sitoumus odottaa vahvistusta', () => {
  const sit = (o) => Object.assign({ sitoutunut: false, vahvistettu: false, annettu_pvm: null, vahvistettu_pvm: null }, o);
  it('ei sitoumusta / vahvistettu → kaksi korttia (ruudukko .two)', () => {
    for (const s of [sit(), sit({ sitoutunut: true, vahvistettu: true, annettu_pvm: '2026-10-03', vahvistettu_pvm: '2026-10-04' })]) {
      const h = q(OSAT(null), { sit: s }); expect((h.match(/data-kt-kysymys="/g) || []).length).toBe(2); expect(h).toContain('kt-q3 two'); expect(h).not.toContain('data-kt-sitoumus');
    }
  });
  it('sitoutunut-ei-vahvistettu → kolme korttia, "Sitoutui {pvm} · vahvista" -linkki → vahvista_sitoumus', () => {
    const h = q(OSAT(null), { sit: sit({ sitoutunut: true, annettu_pvm: '2026-10-08' }) });
    expect((h.match(/data-kt-kysymys="|data-kt-sitoumus="/g) || []).length).toBe(3); expect(h).not.toContain('kt-q3 two');
    expect(plain(h)).toContain('Sitoutui'); expect(plain(h)).toContain('08.10.2026'); expect(h).toContain('vahvista_sitoumus');
  });
  it('Polun tila (A1) tuottaa odottaa-tilan kun sitoumus tehty mutta ei vahvistettu', () => {
    const PT = require('../lib/tm_polun_tila.js');
    expect(PT.tmPolunTila({ jaksofokus: Object.assign({}, JF, { alkoi: '2026-10-05T08:00:00.000Z' }), idp_sitoumus_pvm: '2026-10-06' }, {}).kysymykset[2].vastaus).toBe('sitoumus_odottaa');
  });
});
