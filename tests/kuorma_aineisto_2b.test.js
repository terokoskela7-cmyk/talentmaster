// Projekti 06 PR 2b — täysi synteettinen aineisto: kalenteri + läsnäolijat, henkilökunta + Auth, SA-vaihe, toimenpiteet, 3 kautta, jaksofokus_historia, tyhjennys. Ei Firestorea/Authia (valeDb + valeAuth).
import { describe, it, expect } from 'vitest';
import { createRequire } from 'module';
import { readFileSync, statSync, mkdtempSync, rmSync } from 'fs';
import { join } from 'path';
import { tmpdir } from 'os';
import crypto from 'crypto';
const require = createRequire(import.meta.url);
const A = require('../scripts/kuorma/aineisto.js');
const G = require('../scripts/kuorma/generoi_aineisto.js');
const ROOT = join(__dirname, '..');
const PIENI = Object.assign({}, A.PROFIILIT.savu_taysi, { nimi: 'pieni2b', seurat: [{ koko: 60 }, { koko: 40 }], kirjaukset: 5, viikkokatsaukset: 3, havainnot: 2, toimenpiteita: 12, kausia3: { pelaajia: 5, jaksoHistoriaaKaudessa: 40 } });
const koota = (p, s) => { const m = new Map(); for (const d of A.generoi(p, s)) m.set(d.polku, d.data); return m; };
const M = koota(PIENI, 3);
const PELAAJAT = [...M].filter(([p]) => /^seurat\/[^/]+\/pelaajat\/[^/]+$/.test(p));

describe('2a-yhteensopivuus', () => {
  it('profiili savu tuottaa täsmälleen saman virran kuin 2a (sha1) — staging-savuaineisto ei muutu', () => {
    const c = crypto.createHash('sha1'); let n = 0; for (const d of A.generoi(A.PROFIILIT.savu, 1)) { c.update(JSON.stringify(d)); n++; }
    expect(n).toBe(164814); expect(c.digest('hex')).toBe('5bd9b038ed8d024b34f71f4822c89820fe51224d');
  });
  it('determinismi: sama siemen → sama; laske() täsmää virtaan; savu_taysi/taysi määrät', () => {
    expect(JSON.stringify([...koota(PIENI, 3)])).toBe(JSON.stringify([...M])); expect(A.laske(PIENI, 3).yht).toBe(M.size);
    const s = A.laske(A.PROFIILIT.savu_taysi, 1); expect(s.pelaajat).toBe(1000); expect(s.kayttajat).toBe(20); expect(s.kausikuvat).toBe(2); expect(s.toimenpiteet).toBe(80); expect(s.lasnaolijat).toBeGreaterThan(50000);
    const koot = A.PROFIILIT.taysi.seurat.map((x) => x.koko); expect(koot.length).toBe(40); expect(koot.reduce((a, b) => a + b, 0)).toBe(10000); expect(Math.max(...koot)).toBe(500); expect(koot[0]).toBe(500); expect(Math.min(...koot)).toBeGreaterThanOrEqual(170);
    expect(A.tilit(A.PROFIILIT.taysi).length).toBe(400);
  });
});

describe('trigger-arvio', () => {
  const T = require('../scripts/kuorma/trigger_arvio.js');
  it('kutsut = kirjaukset + läsnäolijat + kalenteri; kulu = osien summa; kasvaa kalenterin myötä', () => {
    const l = A.laskeSeuroittain(PIENI, 3), a = T.arvioiTriggerit(l);
    expect(a.rivit[0].kutsuja).toBe(l.m.kirjaukset); expect(a.rivit[1].kutsuja).toBe(l.m.lasnaolijat); expect(a.rivit[2].kutsuja).toBe(l.m.kalenteri); expect(a.kutsuja).toBe(l.m.kirjaukset + l.m.lasnaolijat + l.m.kalenteri);
    expect(a.kulu.yht).toBeCloseTo(a.kulu.kutsut + a.kulu.laskenta + a.kulu.luvut + a.kulu.kirjoitukset, 10); expect(a.lukuja).toBeGreaterThan(a.kutsuja);
    const savu = T.arvioiTriggerit(A.laskeSeuroittain(A.PROFIILIT.savu, 1)); expect(savu.rivit[1].kutsuja).toBe(0); expect(savu.kulu.yht).toBeLessThan(T.arvioiTriggerit(A.laskeSeuroittain(A.PROFIILIT.savu_taysi, 1)).kulu.yht);
  });
  it('kuiva-ajo tulostaa arvion ennen --aja:ta (kutsumäärät + $-kulu), ilman nimiä/id:itä', async () => {
    const r = await aja(['--projekti=talentmaster-staging', '--profiili=savu_taysi'], valeYhteys(valeAuth()));
    expect(r.koodi).toBe(0); expect(r.ulos).toMatch(/Trigger-arvio/); expect(r.ulos).toMatch(/kertymaLasnaolijaOnWrite\s+79 238 kutsua/); expect(r.ulos).toMatch(/KULU ~\$\d+/); expect(r.ulos).not.toMatch(/SYNT-|Testi|kuorma_/);
  });
});

describe('henkilökunta + Auth-tilit', () => {
  const tilit = A.tilit(PIENI);
  it('kayttajat-dokumentit täsmäävät tililistaan; kaikki @kuorma.test + uid kuorma_; sallitut roolit; joukkueet olemassa', () => {
    const kd = [...M].filter(([p]) => /\/kayttajat\//.test(p)); expect(kd.length).toBe(tilit.length); expect(tilit.length).toBe(20);
    const sallitut = ['vp', 'valmentaja', 'talenttivalmentaja', 'urheilutoimenjohtaja', 'seurasihteeri', 'fysiikkavalmentaja'];
    kd.forEach(([p, d]) => { expect(d.email).toMatch(/^[a-z0-9.]+\.s\d\d@kuorma\.test$/); expect(d.uid).toMatch(/^kuorma_s\d\d_/); expect(p.endsWith('/' + d.uid)).toBe(true); expect(sallitut).toContain(d.rooli); expect(d.aktiivinen).toBe(true); expect(d.synteettinen).toBe(true);
      const sid = p.split('/')[1]; d.joukkueet.forEach((id) => expect(M.has('seurat/' + sid + '/joukkueet/' + id)).toBe(true)); });
    expect(new Set(tilit.map((t) => t.email)).size).toBe(tilit.length); expect(tilit.filter((t) => t.email === 'vp.s01@kuorma.test').length).toBe(1);
    expect(M.get('seurat/kuorma_seura_01').vp_uid).toBe('kuorma_s01_vp');
  });
  it('joka joukkueella on valmentaja', () => {
    const j = [...M].filter(([p]) => /^seurat\/kuorma_seura_01\/joukkueet\/[^/]+$/.test(p)).map(([p]) => p.split('/').pop());
    const peitetty = new Set(); tilit.filter((t) => t.seuraId === 'kuorma_seura_01').forEach((t) => t.joukkueet.forEach((x) => peitetty.add(x))); j.forEach((id) => expect(peitetty.has(id)).toBe(true));
  });
});

describe('kalenteri + lasnaolijat', () => {
  it('tapahtumat joukkueille, läsnäolijat viittaavat olemassa oleviin pelaajiin, kooste täsmää', () => {
    const ev = [...M].filter(([p]) => /^seurat\/[^/]+\/kalenteri\/[^/]+$/.test(p)); expect(ev.length).toBeGreaterThan(100);
    const las = new Map(); [...M].filter(([p]) => /\/lasnaolijat\//.test(p)).forEach(([p, d]) => { const e = p.split('/lasnaolijat/')[0]; (las.get(e) || las.set(e, []).get(e)).push([p, d]); });
    ev.slice(0, 60).forEach(([p, d]) => {
      expect(d.alkaa instanceof Date && d.paattyy > d.alkaa).toBe(true); expect(d.joukkueet.length).toBe(1); expect(d.poistettu).toBe(false); expect(d).not.toHaveProperty('muistiinpanot');
      expect(M.has('seurat/' + p.split('/')[1] + '/joukkueet/' + d.joukkue)).toBe(true);
      const rivit = las.get(p) || []; const k = { paikalla: 0, myohassa: 0, poissa: 0 }; rivit.forEach(([lp, l]) => { k[l.tila]++; expect(['paikalla', 'myohassa', 'poissa']).toContain(l.tila); expect(M.has(lp.split('/kalenteri/')[0] + '/pelaajat/' + lp.split('/').pop())).toBe(true); });
      expect(d.lasnaolo_kooste.paikalla).toBe(k.paikalla); expect(d.lasnaolo_kooste.poissa).toBe(k.poissa); expect(d.lasnaolo_kooste.paikalla + d.lasnaolo_kooste.myohassa + d.lasnaolo_kooste.poissa + d.lasnaolo_kooste.merkitsematta).toBe(rivit.length + d.lasnaolo_kooste.merkitsematta);
    });
  });
});

describe('kolme kautta + jaksofokus_historia', () => {
  const k3 = PELAAJAT.filter(([p, d]) => (d.jaksofokus_historia || []).length > 60);
  it('vain suurimman seuran (S01) pelaajia, määrä = kausia3.pelaajia, ikä ≥ 10; muilla 4–8 riviä', () => {
    expect(k3.length).toBe(5); k3.forEach(([p]) => expect(p).toMatch(/^seurat\/kuorma_seura_01\//));
    PELAAJAT.filter(([p, d]) => !k3.includes([p, d]) && (d.jaksofokus_historia || []).length <= 60).forEach(([, d]) => { expect(d.jaksofokus_historia.length).toBeGreaterThanOrEqual(4); expect(d.jaksofokus_historia.length).toBeLessThanOrEqual(8); });
    k3.forEach(([, d]) => { expect(d.jaksofokus_historia.length).toBe(120); expect(2026 - d.syntymaVuosi).toBeGreaterThanOrEqual(10); });
  });
  it('3 kauden pelaajalla kirjauksia/testituloksia vuosilta 2024–2026; pikakenttäparit ehjät; kausikuvat 2024+2025', () => {
    k3.forEach(([p, d]) => {
      const alle = [...M].filter(([q]) => q.startsWith(p + '/'));
      ['2024', '2025', '2026'].forEach((v) => { expect(alle.some(([q]) => q.startsWith(p + '/kirjaukset/' + v)), v).toBe(true); expect(alle.some(([q]) => q.startsWith(p + '/testitulokset/' + v)), v).toBe(true); });
      [['hh_viimeisin', 'hh_pvm'], ['tki_viimeisin', 'tki_pvm']].forEach(([a, b]) => { expect(d[a] != null).toBe(d[b] != null); if (d[b] != null) expect(d[b]).toMatch(a.startsWith('hh') ? /^2026-/ : /^202[4-6]-/); });
      alle.filter(([q]) => /\/testitulokset\/2024/.test(q)).forEach(([, t]) => { expect(t.kausi).toBe('2024'); expect(t.ika).toBeGreaterThanOrEqual(8); });
    });
    expect([...M.keys()].filter((p) => /\/kausikuvat\//.test(p))).toEqual(['seurat/kuorma_seura_01/kausikuvat/2024', 'seurat/kuorma_seura_01/kausikuvat/2025']);
    expect(M.get('seurat/kuorma_seura_01/kausikuvat/2024').pelaajat.length).toBe(5);
  });
  it('historiarivi on kanoninen (tmHistoriaEntry-avaimet) ja havaintojen id:t eri kausilla eivät törmää', () => {
    const rivi = k3[0][1].jaksofokus_historia[0]; ['domeeni', 'konsepti_avain', 'alkoi', 'paattyi', 'sulkutapa', 'suljettu'].forEach((a) => expect(rivi).toHaveProperty(a));
    const hav = [...M.keys()].filter((p) => p.startsWith(k3[0][0] + '/havainnot/')); expect(new Set(hav).size).toBe(hav.length); expect(hav.some((p) => /h2024_/.test(p))).toBe(true);
  });
});

describe('toimenpiteet', () => {
  it('ehdotus-id:t palvelimen muotoa, pulssit kanonisella id:llä/dokilla; kaikki synteettisiä', () => {
    const t = [...M].filter(([p]) => /\/toimenpiteet\//.test(p)); expect(t.length).toBeGreaterThan(20);
    t.forEach(([p, d]) => { const id = p.split('/').pop(); expect(d.synteettinen).toBe(true); if (d.tyyppi === 'automaattinen') { expect(id).toMatch(/^auto_[a-z_]+_kuorma_s\d\d_u\d+_[a-z]_2026-W\d\d_[0-9a-f]{10}$/); expect(['ehdotus', 'kuitattu']).toContain(d.tila); } else { expect(d.tyyppi).toBe('pulssi'); expect(id).toMatch(/^pulssi_/); expect(['kuitattu', 'siirretty']).toContain(d.tila); } });
  });
});

// ── CLI: Auth, tunnukset, tyhjennys, SA ─────────────────────────────────────────────────────────
function valeAuth(alku) {
  const kayttajat = new Map((alku || []).map((u) => [u.uid, u])), claims = {}, poistetut = [];
  return { kayttajat, claims, poistetut,
    getUser: async (uid) => { if (!kayttajat.has(uid)) { const e = new Error('x'); e.code = 'auth/user-not-found'; throw e; } return kayttajat.get(uid); },
    getUserByEmail: async (em) => { const u = [...kayttajat.values()].find((x) => x.email === em); if (!u) { const e = new Error('x'); e.code = 'auth/user-not-found'; throw e; } return u; },
    createUser: async (u) => { kayttajat.set(u.uid, u); return u; }, setCustomUserClaims: async (uid, c) => { claims[uid] = c; },
    listUsers: async () => ({ users: [...kayttajat.values()], pageToken: undefined }), deleteUsers: async (ids) => { ids.forEach((i) => { poistetut.push(i); kayttajat.delete(i); }); } };
}
function valeYhteys(auth, seurat) {
  const kirj = [], poistot = [], admins = [];
  const db = { collection: () => ({ get: async () => ({ docs: (seurat || []).map((s) => ({ id: s.id, ref: { id: s.id }, data: () => s.data })) }) }), doc: (p) => ({ polku: p, set: async (d) => { admins.push([p, d]); } }), recursiveDelete: async (r) => { poistot.push(r.id); } };
  const bw = { set: (r) => { kirj.push(r.polku); return Promise.resolve(); }, onWriteError: () => {}, close: async () => {} };
  return { kirj, poistot, admins, luoDb: async (projekti) => ({ db, auth, projekti, bulkWriter: () => bw }) };
}
async function aja(argv, v) { const ulos = []; const koodi = await G.main(argv, { luoDb: v.luoDb, kirjaa: (r) => ulos.push(r), virhe: (r) => ulos.push('VIRHE ' + r), env: {}, adc: undefined }); return { koodi, ulos: ulos.join('\n') }; }
const TMP = mkdtempSync(join(tmpdir(), 'kuorma2b-'));

describe('CLI 2b', () => {
  it('--aja luo Auth-tilit claimsilla, salasanat vain 0600-tiedostoon (ei tulosteeseen), toinen ajo ei luo uusia', async () => {
    const auth = valeAuth(), v = valeYhteys(auth), f = join(TMP, 'a', 'tunnukset.txt');
    const r = await aja(['--projekti=talentmaster-staging', '--profiili=savu_taysi', '--aja', '--tunnukset=' + f], v);
    expect(r.koodi).toBe(0); expect(auth.kayttajat.size).toBe(20); expect(r.ulos).toContain('Auth-tilit: luotu 20, jo olemassa 0');
    expect(auth.claims.kuorma_s01_vp).toEqual({ rooli: 'vp', seuraId: 'kuorma_seura_01' }); expect(auth.kayttajat.get('kuorma_s01_vp').emailVerified).toBe(true);
    const txt = readFileSync(f, 'utf8'); expect(txt).toContain('vp.s01@kuorma.test'); expect((statSync(f).mode & 0o777).toString(8)).toBe('600');
    auth.kayttajat.forEach((u) => { expect(u.password.length).toBeGreaterThanOrEqual(15); expect(r.ulos).not.toContain(u.password); expect(txt).toContain(u.password); });
    expect(r.ulos).not.toMatch(/SYNT-|Testi|kuorma_|@kuorma/);
    const r2 = await aja(['--projekti=talentmaster-staging', '--profiili=savu_taysi', '--aja', '--tunnukset=' + f], valeYhteys(auth)); expect(r2.ulos).toContain('luotu 0, jo olemassa 20'); expect(readFileSync(f, 'utf8')).toBe(txt);
  });
  it('kuiva-ajo ei luo tilejä eikä kirjoita tiedostoa; näyttää auth-tilien määrän', async () => {
    const auth = valeAuth(), f = join(TMP, 'b', 't.txt'); const r = await aja(['--projekti=talentmaster-staging', '--profiili=savu_taysi', '--tunnukset=' + f], valeYhteys(auth));
    expect(r.koodi).toBe(0); expect(auth.kayttajat.size).toBe(0); expect(r.ulos).toMatch(/auth-tilit\s+20/); expect(() => statSync(f)).toThrow();
  });
  it('--tyhjenna poistaa VAIN @kuorma.test + kuorma_-uid -tilit (ei muita, ei SA:ta); kuiva-ajo ei poista', async () => {
    const mk = () => valeAuth([{ uid: 'kuorma_s01_vp', email: 'vp.s01@kuorma.test' }, { uid: 'kuorma_s02_valmentaja1', email: 'valmentaja1.s02@kuorma.test' }, { uid: 'tero123', email: 'tero@example.com' }, { uid: 'kuorma_x', email: 'x@example.com' }, { uid: 'muu', email: 'a@kuorma.test' }]);
    const a1 = mk(); const k = await aja(['--projekti=talentmaster-staging', '--tyhjenna'], valeYhteys(a1, [])); expect(k.koodi).toBe(0); expect(a1.poistetut.length).toBe(0); expect(k.ulos).toContain('Auth-tilejä (@kuorma.test): 2');
    const a2 = mk(); const r = await aja(['--projekti=talentmaster-staging', '--tyhjenna', '--aja'], valeYhteys(a2, [])); expect(r.koodi).toBe(0); expect(a2.poistetut.sort()).toEqual(['kuorma_s01_vp', 'kuorma_s02_valmentaja1']); expect([...a2.kayttajat.keys()].sort()).toEqual(['kuorma_x', 'muu', 'tero123']);
  });
  it('luoTilit kieltäytyy ei-synteettisestä tilistä', async () => { await expect(G.luoTilit(valeAuth(), [{ uid: 'abc', email: 'x@example.com', etunimi: 'a', sukunimi: 'b', rooli: 'vp', seuraId: 's' }], join(TMP, 'c.txt'))).rejects.toThrow(); });
  it('SA-vaihe: tiliä ei löydy → exit 1 + ohje; kuiva-ajo ei kirjoita; --aja kirjoittaa admins/{uid}; lukko voimassa', async () => {
    const em = 'joku@example.com', ei = valeYhteys(valeAuth()); const r0 = await aja(['--projekti=talentmaster-staging', '--sa-sahkoposti=' + em, '--aja'], ei); expect(r0.koodi).toBe(1); expect(r0.ulos).toContain('Kirjaudu stagingiin'); expect(ei.admins.length).toBe(0);
    const a = valeAuth([{ uid: 'uid_tero', email: em }]);
    const kv = valeYhteys(a); expect((await aja(['--projekti=talentmaster-staging', '--sa-sahkoposti=' + em], kv)).koodi).toBe(0); expect(kv.admins.length).toBe(0);
    const aj = valeYhteys(a); expect((await aja(['--projekti=talentmaster-staging', '--sa-sahkoposti=' + em, '--aja'], aj)).koodi).toBe(0); expect(aj.admins.length).toBe(1); expect(aj.admins[0][0]).toBe('admins/uid_tero'); expect(aj.admins[0][1].superAdmin).toBe(true);
    const lk = valeYhteys(a); expect((await aja(['--projekti=' + ['talentmaster', 'pilot'].join('-'), '--sa-sahkoposti=' + em, '--aja'], lk)).koodi).toBe(1); expect(lk.admins.length).toBe(0);
  });
  it('tunnustiedosto on gitignorattu; staattinen: Auth-kutsut vasta lukon jälkeen', () => {
    expect(readFileSync(join(ROOT, '.gitignore'), 'utf8')).toContain('.briefit/staging_tunnukset.txt');
    const src = readFileSync(join(ROOT, 'scripts/kuorma/generoi_aineisto.js'), 'utf8'); expect(src.indexOf('tarkistaLukko(')).toBeLessThan(src.indexOf('await d.luoDb('));
    rmSync(TMP, { recursive: true, force: true });
  });
});
