/* Laskutus L1a — kaikki laskutuksen päivät ja kuukaudet Suomen ajassa (PM 2.11.2026, #1170).
   Kuun vaihteen yö: 30.11. klo 23.30 ja 1.12. klo 1.30 Suomen aikaa ovat MOLEMMAT UTC:ssä vielä 30.11.
   Kattaa: kuukauden avain, kuun viimeinen päivä (aktivointi 30.11. = kuukausi 1), laskutus_aktivoitu, laskutustila_muutettu,
   Adminin oletuskuukausi, alkutilaskriptin "tänään", Intl-varapolku (EI UTC) ja ajoympäristön vyöhykkeestä riippumattomuus. */
import { describe, it, expect, vi, afterEach } from 'vitest';
import { createRequire } from 'module';
import { readFileSync } from 'fs';
import { execFileSync } from 'child_process';
import vm from 'vm';
const require = createRequire(import.meta.url);
const L = require('../lib/tm_laskutus.js'), A = require('../lib/tm_laskutus_admin.js'), S = require('../scripts/laskutus_alkutila.js');

const ILTA_30_11 = new Date('2026-11-30T21:30:00Z');   // 30.11. klo 23.30 Suomessa (EET +2)
const YO_1_12 = new Date('2026-11-30T23:30:00Z');      // 1.12. klo 1.30 Suomessa — UTC:ssä vielä 30.11.

afterEach(() => { vi.useRealTimers(); vi.restoreAllMocks(); });

describe('kuun vaihteen yö 30.11. → 1.12. (Suomen aika)', () => {
  it('lähtötilanne: molemmat hetket ovat UTC:ssä 30.11. (vanha toISOString-tapa antaisi väärän päivän yöllä)', () => {
    expect(ILTA_30_11.toISOString().slice(0, 10)).toBe('2026-11-30'); expect(YO_1_12.toISOString().slice(0, 10)).toBe('2026-11-30');
  });
  it('päivä: 30.11. klo 23.30 → 2026-11-30, 1.12. klo 1.30 → 2026-12-01', () => {
    expect(L.tmLaskutusPaiva(ILTA_30_11)).toBe('2026-11-30'); expect(L.tmLaskutusPaiva(YO_1_12)).toBe('2026-12-01');
    expect(A.tmLaskutusPaiva(ILTA_30_11)).toBe('2026-11-30'); expect(A.tmLaskutusPaiva(YO_1_12)).toBe('2026-12-01');   // Admin käyttää samaa
  });
  it('kuukauden avain: 2026-11 / 2026-12 — Date, Timestamp {toDate}, {seconds} ja ISO-aikaleima', () => {
    for (const [d, kk] of [[ILTA_30_11, '2026-11'], [YO_1_12, '2026-12']]) {
      expect(L.tmLaskutusKk(d)).toBe(kk); expect(L.tmLaskutusKk({ toDate: () => d })).toBe(kk);
      expect(L.tmLaskutusKk({ seconds: d.getTime() / 1000 })).toBe(kk); expect(L.tmLaskutusKk(d.toISOString())).toBe(kk);
    }
    expect(L.tmLaskutusPaiva({ seconds: YO_1_12.getTime() / 1000 })).toBe('2026-12-01');
  });
  it('vuodenvaihde: 1.1. klo 1.30 Suomessa (UTC 31.12.) → 2027-01-01 / 2027-01', () => {
    const d = new Date('2026-12-31T23:30:00Z'); expect(L.tmLaskutusPaiva(d)).toBe('2027-01-01'); expect(L.tmLaskutusKk(d)).toBe('2027-01');
  });
});

describe('tilanvaihto Adminissa kuun vaihteen yönä: laskutus_aktivoitu ja laskutustila_muutettu', () => {
  const mockDb = () => {
    const kirj = [], data = { 'seurat/s/joukkueet/a': { nimi: 'A' } };
    const tyhja = { get: async () => ({ exists: false, docs: [] }) };
    return { kirj, collection: (c) => ({ doc: (id) => ({ get: tyhja.get, collection: (c2) => ({ get: async () => ({ docs: c2 === 'joukkueet' ? [{ id: 'a', data: () => data['seurat/s/joukkueet/a'] }] : [] }),
      doc: (jid) => ({ update: async (u) => { kirj.push({ p: c + '/' + id + '/' + c2 + '/' + jid, u }); } }) }) }) }) };
  };
  const env = (db) => ({ db, FieldValue: { serverTimestamp: () => '__ST__' }, alue: (() => { const el = { innerHTML: '', _s: { innerHTML: '' }, querySelector: (q) => (q === '#laskutusSisalto' ? el._s : q === '#laskutusSeura' ? { value: 's' } : q === '#laskutusKk' ? { value: '2026-11' } : null) }; return () => el; })(),
    seurat: () => [{ id: 's', nimi: 'S' }], uid: () => 'sa-uid', tuoreToken: async () => {}, toast: () => {}, vahvista: () => true, lataaTiedosto: () => {} });
  for (const [hetki, pvm] of [[ILTA_30_11, '2026-11-30'], [YO_1_12, '2026-12-01']]) {
    it('klo ' + hetki.toISOString() + ' (UTC) → pvm ' + pvm + ' molemmissa kentissä', async () => {
      vi.useFakeTimers({ toFake: ['Date'] }); vi.setSystemTime(hetki);
      const db = mockDb(), v = A.tmLaskutusAdmin(env(db)); v.render(); await v.tilanneNyt();
      expect(await v.vaihdaTila('s', 'a', 'aktiivinen')).toBe(true);
      expect(db.kirj[0].u.laskutus_aktivoitu).toMatchObject({ pvm, uid: 'sa-uid' }); expect(db.kirj[0].u.laskutustila_muutettu).toMatchObject({ pvm, uid: 'sa-uid' });
    });
  }
});

describe('kuun viimeinen päivä ja välimalli (lista_alkaen_kk_aktivoinnista)', () => {
  const as = L.tmLaskutusAsetukset(null, { laskutettava: true, sopimus_alkaen: '2026-11', laskentaperuste: 'lista', lista_alkaen_kk_aktivoinnista: 1 }).asetukset;
  const kkAkt = (pvm, kk) => L.tmLaskutusPeruste(as, { laskutus_aktivoitu: { pvm } }, kk).kk_aktivoinnista;
  it('aktivointi 30.11. klo 23.30 Suomessa = marraskuu kuukausi 1; 1.12. klo 1.30 = joulukuu kuukausi 1', () => {
    expect(kkAkt(L.tmLaskutusPaiva(ILTA_30_11), '2026-11')).toBe(1); expect(kkAkt(L.tmLaskutusPaiva(ILTA_30_11), '2026-12')).toBe(2);
    expect(kkAkt(L.tmLaskutusPaiva(YO_1_12), '2026-12')).toBe(1);
    expect(kkAkt({ toDate: () => YO_1_12 }, '2026-12')).toBe(1); expect(kkAkt({ toDate: () => ILTA_30_11 }, '2026-12')).toBe(2);   // Timestamp-muotoinen pvm
  });
  it('laskun joukkuerivin laskutus_aktivoitu-kuukausi Suomen ajassa', () => {
    const t = L.tmLaskutusLaske({ kk: '2026-12', seuraId: 's', asetukset: as, joukkueet: [{ id: 'a', laskutustila: 'aktiivinen', laskutus_aktivoitu: { pvm: { toDate: () => YO_1_12 } } }], kayttajat: [], pelaajat: [] });
    expect(t.joukkueet[0]).toMatchObject({ laskutus_aktivoitu: '2026-12', kk_aktivoinnista: 1, peruste: 'suostumus' });
  });
});

describe('Adminin oletuskuukausi ja alkutilaskriptin "tänään"', () => {
  it('Admin avautuu 1.12. klo 1.30 Suomessa kuukauteen 2026-12 (vm, tuore tila)', () => {
    const KiinteaDate = class extends Date { constructor(...a) { if (a.length) super(...a); else super(YO_1_12.getTime()); } static now() { return YO_1_12.getTime(); } };
    const w = {}; const ctx = vm.createContext({ window: w, Intl, Date: KiinteaDate, Object, Array, String, Number, Math, JSON, Promise, Error, isNaN });
    for (const f of ['lib/tm_joukkue.js', 'lib/tm_laskutus.js', 'lib/tm_laskutus_admin.js']) vm.runInContext(readFileSync(f, 'utf8'), ctx);
    const el = { innerHTML: '', querySelector: () => null };
    w.TM_LASKUTUS_ADMIN.tmLaskutusAdmin({ alue: () => el, seurat: () => [] }).render();
    expect(el.innerHTML).toContain('type="month" value="2026-12"');
  });
  it('alkutilaskripti: laskutustila_muutettu.pvm = Suomen päivä', () => {
    vi.useFakeTimers({ toFake: ['Date'] }); vi.setSystemTime(YO_1_12); expect(S.tanaanHelsinki()).toBe('2026-12-01');
    vi.setSystemTime(ILTA_30_11); expect(S.tanaanHelsinki()).toBe('2026-11-30');
  });
});

describe('varapolku ja ajoympäristö', () => {
  it('Intl-vyöhyke puuttuu → EU:n kesäaikasääntö, EI UTC: sama tulos kuin Intl joka puolen tunnin välein 2026–2027', () => {
    const odotettu = [];
    for (let t = Date.UTC(2026, 0, 1); t < Date.UTC(2028, 0, 1); t += 30 * 60000) odotettu.push(L.tmLaskutusPaiva(new Date(t)));
    vi.spyOn(Intl, 'DateTimeFormat').mockImplementation(() => { throw new RangeError('Invalid time zone specified: Europe/Helsinki'); });
    let i = 0, erot = [];
    for (let t = Date.UTC(2026, 0, 1); t < Date.UTC(2028, 0, 1); t += 30 * 60000, i++) { const p = L.tmLaskutusPaiva(new Date(t)); if (p !== odotettu[i]) erot.push(new Date(t).toISOString() + ' ' + p + ' ≠ ' + odotettu[i]); }
    expect(erot).toEqual([]); expect(odotettu.length).toBeGreaterThan(35000);
    expect(L.tmLaskutusPaiva(YO_1_12)).toBe('2026-12-01'); expect(L.tmLaskutusKk(YO_1_12)).toBe('2026-12');   // varapolulla
    expect(L.tmLaskutusPaiva(new Date('2026-07-31T21:30:00Z'))).toBe('2026-08-01');   // kesäaika +3
  }, 30000);   // ~35 000 Intl-kutsua: paikallisesti ~1,5 s, CI:n rinnakkaisajossa ylitti oletusrajan 5 s (#1172)
  it('sama tulos ajoympäristön vyöhykkeestä riippumatta (TZ=UTC kuten Cloud Functions, Helsinki, New York)', () => {
    const koodi = "const L=require(" + JSON.stringify(require.resolve('../lib/tm_laskutus.js')) + ");const a=new Date('2026-11-30T21:30:00Z'),b=new Date('2026-11-30T23:30:00Z');"
      + "process.stdout.write([L.tmLaskutusPaiva(a),L.tmLaskutusPaiva(b),L.tmLaskutusKk(a),L.tmLaskutusKk(b)].join(','))";
    for (const TZ of ['UTC', 'Europe/Helsinki', 'America/New_York'])
      expect(execFileSync(process.execPath, ['-e', koodi], { env: Object.assign({}, process.env, { TZ }) }).toString(), TZ).toBe('2026-11-30,2026-12-01,2026-11,2026-12');
  });
  it('functions/-kopio on tavu tavulta sama (palvelin laskee samalla funktiolla)', () => {
    expect(readFileSync('functions/tm_laskutus.js', 'utf8')).toBe(readFileSync('lib/tm_laskutus.js', 'utf8'));
  });
});
