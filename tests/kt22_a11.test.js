/**
 * Kehitystyöpöytä 22 · A11 (D103, kevyt muoto) — kysymykset lähteineen: Q1/Q2 alarivit, Q2 = viikkokatsaukset, Q3 = rivi signaalin alla (kortti vain sitoutunut-ei-vahvistettu).
 */
import { describe, it, expect } from 'vitest';
import { readFileSync } from 'fs';
import { createRequire } from 'module';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

const require = createRequire(import.meta.url);
const KT = require('../lib/tm_kehitystyopoyta.js');
const PT = require('../lib/tm_polun_tila.js');
const __dir = dirname(fileURLToPath(import.meta.url));
const VP = readFileSync(join(__dir, '..', 'TalentMaster_VP_v25.html'), 'utf8');
const MASTER = readFileSync(join(__dir, '..', 'TalentMaster_Master_v16.html'), 'utf8');
const RULES = readFileSync(join(__dir, '..', 'tm_admin', 'firestore.rules'), 'utf8');

const o = { t: (k) => k, pvmFn: (iso) => iso.split('-').reverse().join('.') };
const plain = (h) => h.replace(/<[^>]+>/g, ' ').replace(/\s+/g, ' ');
const T0 = { kysymykset: [
  { avain: 'nakyyko_fokus', tieto: false, vastaus: 'ei_tietoa' }, { avain: 'treenataanko', tieto: false, vastaus: 'ei_tietoa' },
  { avain: 'onko_mukana', tieto: false, vastaus: 'ei_tietoa' }] };
const JF = { konsepti_avain: 'k', konsepti_nimi: 'K', alkoi: '2026-10-05T08:00:00', kesto_vk: 6, tila: 'aktiivinen' };
const dok = (id) => ({ id, jakso_alkoi: '2026-10-05', vk: 1, vastaukset: [{ osa: 'A', arvo: 'usein' }] });

describe('A11 · Q1 lähde', () => {
  it('ei havaintoa → "ei vielä havaintoa · merkitse viikkohavainto" (linkki toimii kun toimiFn+pid)', () => {
    const h = KT.tmKtKysymyksetHTML(T0, Object.assign({ toimiFn: '_ktToimi', pid: 'p1' }, o));
    expect(plain(h)).toContain('ei vielä havaintoa · merkitse viikkohavainto');
    expect(h).toContain("_ktToimi('p1','havainto')");
  });
  it('havainto olemassa → alarivi "viikkohavainto" on LINKKI joka avaa saman paneelin (merkinnän on voinut tehdä joku muu → ei "-si"; ei päivää)', () => {
    const T = JSON.parse(JSON.stringify(T0)); T.kysymykset[0] = { avain: 'nakyyko_fokus', tieto: true, vastaus: 'osaa_itsenaisesti', n: 1, yht: 3 };
    const h = KT.tmKtKysymyksetHTML(T, Object.assign({ toimiFn: '_ktToimi', pid: 'p1' }, o));
    expect(plain(h)).toContain('1/3 osaa itsenäisesti viikkohavainto'); expect(plain(h)).not.toContain('viikkohavaintosi');
    expect(h).toMatch(/data-kt-havainto-muuta onclick="_ktToimi\('p1','havainto'\)">viikkohavainto<\/button>/);
    expect(plain(KT.tmKtKysymyksetHTML(T, o))).toContain('1/3 osaa itsenäisesti viikkohavainto');   // ilman toimintoa pelkkä teksti
  });
});

describe('A11 · Q2 viikkokatsaukset', () => {
  const rivi = (vk) => plain(KT.tmKtKysymyksetHTML(T0, Object.assign({ vk }, o)));
  it('n/vk viikkoa + "pelaajan viikkokatsaus su {pvm}"', () => {
    const k = KT.tmKtVkKooste({ jaksofokus: JF }, [dok('2026-10-11'), dok('2026-10-18')], '2026-10-21', 6);   // ke, viikko 3
    expect(k).toMatchObject({ n: 2, vk: 3, viimeisin: '2026-10-18', sunnuntai: false });
    expect(rivi(k)).toContain('2/3 viikkoa pelaajan viikkokatsaus su 18.10.2026');
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
  it('6 dokumenttia = raja → "+" jos viikkoja enemmän; ei ladattu (null) → ennallaan "Ei vielä tietoa"', () => {
    const d6 = ['2026-10-11', '2026-10-18', '2026-10-25', '2026-11-01', '2026-11-08', '2026-11-15'].map(dok);
    const k = KT.tmKtVkKooste({ jaksofokus: Object.assign({}, JF, { kesto_vk: 8 }) }, d6, '2026-11-25', 6);
    expect(k.rajattu).toBe(true); expect(rivi(k)).toContain('6+/8 viikkoa');
    expect(rivi(null)).toContain('Ei vielä tietoa');
  });
  it('"tänään" lasketaan paikallisena päivänä (tmPaivaIso), ei UTC; luku rajattu 6:een ja vain käynnissä olevalle jaksolle', () => {
    for (const src of [VP, MASTER]) {
      expect(src).toContain('tmKtVkKooste(p, c.docs, tmPaivaIso(new Date()), 6)');
      expect(src).toMatch(/\.where\('jakso_alkoi', '==', alkoi\)\.limit\(6\)\.get\(\)/);
      expect(src).toMatch(/tila\.tila !== 'kaynnissa' && tila\.tila !== 'vahvistettu'\)\) return null/);
    }
  });
  it('Rules sallii luvun oman seuran henkilökunnalle (VP + valmentaja) — A11:n edellytys', () => {
    const i = RULES.indexOf('match /viikkokatsaukset/{pvm}');
    expect(RULES.slice(i, i + 400)).toMatch(/allow read:\s+if onSuperAdmin\(\)\s*\|\|\s*\(onKirjautunut\(\) && onOmaSeura\(seuraId\)\)/);
  });
});

describe('A11 · Q3 sitoumus signaalin alla', () => {
  const Tq = (vastaus, pvm) => ({ kysymykset: [T0.kysymykset[0], T0.kysymykset[1], { avain: 'onko_mukana', tieto: vastaus !== 'ei_tietoa', vastaus, pvm }] });
  const base = Object.assign({ toimiFn: '_ktToimi', pid: 'p1', sit: { annettu_pvm: '2026-10-08' } }, o);
  it('kysymyskortissa vain kaksi riviä (ei Onko mukana?)', () => {
    const h = KT.tmKtKysymyksetHTML(Tq('sitoumus_odottaa'), base);
    expect((h.match(/data-kt-kysymys="/g) || []).length).toBe(2); expect(h).not.toContain('onko_mukana');
  });
  it('sitoutunut-ei-vahvistettu → kortti "Sitoutui {pvm} · vahvista" + nappi', () => {
    const h = KT.tmKtSitoumusHTML(Tq('sitoumus_odottaa'), base);
    expect(h).toContain('data-kt-sitoumus="kortti"'); expect(plain(h)).toContain('Sitoutui 08.10.2026 · vahvista'); expect(h).toContain("_ktToimi('p1','vahvista_sitoumus')");
  });
  it('signaali tarjoaa jo vahvista-napin → rivi, ei toista nappia', () => {
    const h = KT.tmKtSitoumusHTML(Tq('sitoumus_odottaa'), Object.assign({ signaaliVahvista: true }, base));
    expect(h).toContain('data-kt-sitoumus="rivi"'); expect(h).not.toContain('vahvista_sitoumus'); expect(plain(h)).toContain('Sitoutui 08.10.2026');
  });
  it('vahvistettu / ei tietoa → rivi', () => {
    expect(plain(KT.tmKtSitoumusHTML(Tq('sitoumus_vahvistettu', '2026-10-09'), base))).toContain('Sitoumus vahvistettu 09.10.2026');
    const h = KT.tmKtSitoumusHTML(Tq('ei_tietoa'), base); expect(h).toContain('data-kt-sitoumus="rivi"'); expect(plain(h)).toContain('Ei vielä tietoa');
  });
  it('Polun tila -laskenta (A1) tuottaa odottaa-tilan kun sitoumus tehty mutta ei vahvistettu', () => {
    const T = PT.tmPolunTila({ jaksofokus: Object.assign({}, JF, { alkoi: '2026-10-05T08:00:00.000Z' }), idp_sitoumus_pvm: '2026-10-06' }, {});
    expect(T.kysymykset[2].vastaus).toBe('sitoumus_odottaa');
  });
  it('adapterit: signaali + sitoumusrivi samassa slotissa, tunnistaa signaalin oman vahvista-napin', () => {
    for (const src of [VP, MASTER]) {
      expect(src).toContain('_ktSitoumusHTML(p, tila, askel, sig)');
      expect(src).toContain("e.nappi.avain === 'vahvista_sitoumus'");
    }
  });
});
