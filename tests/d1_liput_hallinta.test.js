/* D1 (QG-3 vaihe 0, Tero 5.11.2026): seuran lippujen hallinta SA:lle + muutosloki.
   lib/tm_liput.js (rekisteri + tmLippuTila) · functions/liput_hallinta.js (asetaSeuranLippu: vain SA, transaktio julkiset + audit) ·
   lib/tm_liput_admin.js (Admin "Liput") · tm_klippi_ryhma lukee liput/julkiset (klippi_oma_video). */
import { describe, it, expect, vi } from 'vitest';
import { readFileSync } from 'fs';
import { createRequire } from 'module';
const require = createRequire(import.meta.url);
const teksti = (f) => readFileSync(new URL('../' + f, import.meta.url), 'utf8');
const L = require('../lib/tm_liput.js'), H = require('../functions/liput_hallinta.js'), A = require('../lib/tm_liput_admin.js'), N = require('../lib/tm_audit_nimet.js'), K = require('../lib/tm_klippi_ryhma.js');

describe('lib/tm_liput — rekisteri ja tehokas arvo', () => {
  it('rekisterissä täsmälleen nykyiset 4 lippua, jokaisella kuvaus', () => {
    expect(L.LIPUT.map((l) => l.avain)).toEqual(['kentta', 'kehitystyopoyta_v2', 'valmentaja_v2', 'klippi_oma_video', 'lista_yhteenveto']);
    for (const l of L.LIPUT) expect(l.kuvaus.length, l.avain).toBeGreaterThan(10);
    expect(L.tmLippuTunnettu('kentta')).toBe(true); expect(L.tmLippuTunnettu('arvo')).toBe(false); expect(L.tmLippuTunnettu('__proto__')).toBe(false);
  });
  it('tmLippuTila: julkiset boolean voittaa → vanha täsmälleen true → oletus pois', () => {
    expect(L.tmLippuTila('kentta', { kentta: false }, { liput: { kentta: true } })).toEqual({ arvo: false, lahde: 'julkiset' });
    expect(L.tmLippuTila('kentta', { kentta: 'true' }, { liput: { kentta: true } })).toEqual({ arvo: true, lahde: 'vanha' });
    for (const v of ['true', 1, false, null]) expect(L.tmLippuTila('kentta', null, { liput: { kentta: v } })).toEqual({ arvo: false, lahde: 'oletus' });
    expect(L.tmLippuTila('valmentaja_v2', undefined, undefined)).toEqual({ arvo: false, lahde: 'oletus' });
  });
  it('sama sääntö kuin olemassa olevat lukijat (kentta, kehitystyopoyta_v2) — ei kahta totuutta', () => {
    const S = require('../lib/tm_kt_sivu.js');
    const tapaukset = [[{ x: true }, null], [{ x: false }, { liput: { x: true } }], [null, { liput: { x: true } }], [{ x: 1 }, { liput: { x: 'true' } }], [null, null]];
    for (const [j, s] of tapaukset) {
      const jk = j && { kentta: j.x }, sk = s && { liput: { kentta: s.liput.x } }; expect(L.tmLippuTila('kentta', jk, sk).arvo).toBe(L.tmKenttaLippu(jk, sk));
      const jv = j && { kehitystyopoyta_v2: j.x }, sv = s && { liput: { kehitystyopoyta_v2: s.liput.x } }; expect(L.tmLippuTila('kehitystyopoyta_v2', jv, sv).arvo).toBe(S.tmKtSivuLippuOn(jv, sv));
      const jo = j && { klippi_oma_video: j.x }, so = s && { liput: { klippi_oma_video: s.liput.x } }; expect(L.tmLippuTila('klippi_oma_video', jo, so).arvo).toBe(K.tmKrLippu(so, jo));
    }
  });
  it('functions/tm_liput.js = lib/tm_liput.js tavu tavulta', () => { expect(teksti('functions/tm_liput.js')).toBe(teksti('lib/tm_liput.js')); });
});

/* Vale-Firestore: transaktio lukee seura- ja julkiset-dokumentin, kirjoitukset kerätään. */
function valeDb({ seura = { nimi: 'S' }, julkiset = null } = {}) {
  const kirj = [], ref = (polku) => ({ polku, collection: (c) => ({ doc: (d) => ref(polku + '/' + c + '/' + (d || 'auto')) }) });
  const db = { kirj, collection: (c) => ({ doc: (d) => ref(c + '/' + (d || 'auto')) }),
    runTransaction: async (f) => f({ get: async (r) => { const d = /\/liput\/julkiset$/.test(r.polku) ? julkiset : seura; return { exists: d != null, data: () => d }; }, set: (r, data, o) => kirj.push({ polku: r.polku, data, o }) }) };
  return db;
}
class E extends Error { constructor(code, m) { super(m); this.code = code; } }
const deps = (db, sa = true) => ({ db, FieldValue: { serverTimestamp: () => 'TS' }, HttpsError: E, onSuperAdminUid: async () => sa, loki: { log() {}, error() {} } });
const ctx = { auth: { uid: 'sa1' } };

describe('functions/liput_hallinta — asetaSeuranLippu', () => {
  it('SA: kirjoittaa liput/julkiset (vain boolean-kenttä, merge) + audit samassa transaktiossa', async () => {
    const db = valeDb({ seura: { nimi: 'KPV', liput: { klippi_oma_video: true } } });
    const r = await H.kasittelija(deps(db))({ seuraId: 'kpv', lippu: 'kentta', arvo: true }, ctx);
    expect(r).toEqual({ ok: true, muuttui: true, vanha: false, uusi: true, lahde_vanha: 'oletus' });
    expect(db.kirj).toHaveLength(2);
    expect(db.kirj[0]).toEqual({ polku: 'seurat/kpv/liput/julkiset', data: { kentta: true }, o: { merge: true } });
    expect(db.kirj[1].polku).toMatch(/^audit\//);
    expect(db.kirj[1].data).toEqual({ toiminto: 'lippu_muutettu', severity: 'info', seuraId: 'kpv', lippu: 'kentta', vanha: false, uusi: true, lahde_vanha: 'oletus', tekija_uid: 'sa1', aikaleima: 'TS' });
  });
  it('vanha kenttä päällä → pois: vanha = true, lahde_vanha = vanha (julkiset false voittaa jatkossa)', async () => {
    const db = valeDb({ seura: { liput: { klippi_oma_video: true } } });
    const r = await H.kasittelija(deps(db))({ seuraId: 'kpv', lippu: 'klippi_oma_video', arvo: false }, ctx);
    expect(r).toMatchObject({ muuttui: true, vanha: true, uusi: false, lahde_vanha: 'vanha' }); expect(db.kirj[0].data).toEqual({ klippi_oma_video: false });
  });
  it('sama tehokas arvo → ei kirjoitusta eikä lokiriviä', async () => {
    const db = valeDb({ julkiset: { kentta: true } });
    expect(await H.kasittelija(deps(db))({ seuraId: 'kpv', lippu: 'kentta', arvo: true }, ctx)).toMatchObject({ ok: true, muuttui: false }); expect(db.kirj).toEqual([]);
  });
  it('hylkää: kirjautumaton, ei-SA (VP/valmentaja), tuntematon lippu, ei-boolean arvo, virheellinen seuraId, puuttuva seura', async () => {
    const h = (o, sa, d) => H.kasittelija(deps(d || valeDb(), sa))(o, ctx);
    await expect(H.kasittelija(deps(valeDb()))({ seuraId: 'kpv', lippu: 'kentta', arvo: true }, {})).rejects.toMatchObject({ code: 'unauthenticated' });
    await expect(h({ seuraId: 'kpv', lippu: 'kentta', arvo: true }, false)).rejects.toMatchObject({ code: 'permission-denied' });
    for (const lippu of ['arvo', '', '__proto__', 'liput.kentta']) await expect(h({ seuraId: 'kpv', lippu, arvo: true }, true)).rejects.toMatchObject({ code: 'invalid-argument' });
    for (const arvo of ['true', 1, null, undefined]) await expect(h({ seuraId: 'kpv', lippu: 'kentta', arvo }, true)).rejects.toMatchObject({ code: 'invalid-argument' });
    for (const seuraId of ['', 'a/b', 'x y', undefined]) await expect(h({ seuraId, lippu: 'kentta', arvo: true }, true)).rejects.toMatchObject({ code: 'invalid-argument' });
    const d = valeDb({ seura: null }); await expect(h({ seuraId: 'eiole', lippu: 'kentta', arvo: true }, true, d)).rejects.toMatchObject({ code: 'not-found' }); expect(d.kirj).toEqual([]);
  });
  it('kytkentä: index.js luo callablen yhdellä rivillä (ei uusia rivejä), App Check pakollinen', () => {
    const ix = teksti('functions/index.js'); expect(ix).toContain("require('./liput_hallinta').luo({ functions, db, admin, onSuperAdminUid })");
    expect(teksti('functions/liput_hallinta.js')).toContain("runWith({ enforceAppCheck: true })");
  });
});

describe('Audit-nimi', () => {
  it('lippu_muutettu: nimi + vanha → uusi', () => {
    expect(N.NIMET.lippu_muutettu).toBe('Seuran lippu muutettu');
    expect(N.rivinNimi({ toiminto: 'lippu_muutettu', lippu: 'kentta', vanha: false, uusi: true })).toBe('Seuran lippu muutettu (kentta: pois → päällä)');
  });
});

describe('lib/tm_liput_admin — Admin "Liput"', () => {
  const seurat = [{ id: 'kpv', nimi: 'KPV', liput: { klippi_oma_video: true } }, { id: 'sjk', nimi: 'SJK' }];
  it('rivit: tehokas arvo ja lähde jokaiselle rekisterin lipulle', () => {
    const r = A.tmLiputRivit(seurat, { kpv: { kentta: true }, sjk: null });
    expect(r[0].liput).toEqual([{ avain: 'kentta', arvo: true, lahde: 'julkiset' }, { avain: 'kehitystyopoyta_v2', arvo: false, lahde: 'oletus' }, { avain: 'valmentaja_v2', arvo: false, lahde: 'oletus' }, { avain: 'klippi_oma_video', arvo: true, lahde: 'vanha' }, { avain: 'lista_yhteenveto', arvo: false, lahde: 'oletus' }]);
    const h = A.tmLiputTaulukkoHTML(r); expect(h).toContain('data-seura="kpv" data-lippu="kentta" data-arvo="1"'); expect(h).toContain('(vanha kenttä)'); expect((h.match(/onclick="liputVaihda/g) || []).length).toBe(10);
  });
  it('loki: aika, seura, lippu, vanha → uusi; escape; tyhjä tila', () => {
    expect(A.tmLiputLokiHTML([])).toContain('Ei vielä lippumuutoksia');
    const h = A.tmLiputLokiHTML([{ aikaleima: '2026-11-05T10:00:00Z', seuraId: 'kpv', lippu: 'kentta', vanha: false, uusi: true, lahde_vanha: 'vanha', tekija_uid: '<x>' }], () => 'KPV');
    expect(h).toContain('KPV'); expect(h).toContain('pois → päällä'); expect(h).toContain('oli vanhassa kentässä'); expect(h).toContain('&lt;x&gt;'); expect(h).not.toContain('<x>');
  });
  it('vaihda: peruutus → ei kutsua; onnistuu → ilmoitus + uusi render; virhe näkyy (ei niellä)', async () => {
    const el = { innerHTML: '', querySelector: () => ({ innerHTML: '' }) }, kutsut = [], ilm = [];
    const db = { collection: () => ({ doc: () => ({ collection: () => ({ doc: () => ({ get: async () => ({ exists: false }) }) }) }) }) };
    const tee = (vahvista, vastaus) => A.tmLiputAdmin({ db, alue: () => el, seurat: () => seurat, vahvista, ilmoita: (t, ty) => ilm.push([t, ty]),
      kutsu: (n) => async (d) => { kutsut.push([n, d]); if (n === 'asetaSeuranLippu' && vastaus instanceof Error) throw vastaus; return { data: n === 'haeAuditLoki' ? { rivit: [] } : vastaus }; } });
    expect(await tee(() => false).vaihda('kpv', 'kentta', true)).toBe(false); expect(kutsut).toEqual([]);
    expect(await tee(() => true, { muuttui: true }).vaihda('kpv', 'kentta', true)).toBe(true);
    expect(kutsut[0]).toEqual(['asetaSeuranLippu', { seuraId: 'kpv', lippu: 'kentta', arvo: true }]); expect(kutsut.some(([n, d]) => n === 'haeAuditLoki' && d.toiminto[0] === 'lippu_muutettu')).toBe(true);
    expect(ilm[0]).toEqual(['kentta päällä — kirjattu lokiin', 'ok']);
    expect(await tee(() => true, new Error('permission-denied')).vaihda('kpv', 'kentta', false)).toBe(false); expect(ilm.at(-1)).toEqual(['Lipun tallennus epäonnistui: permission-denied', 'virhe']);
  });
  it('Admin kytkee näkymän: skriptit, navi, case ja liputVaihda-globaali', () => {
    const ad = teksti('TalentMaster_Admin.html');
    expect(ad).toContain('<script src="lib/tm_liput.js"></script><script src="lib/tm_liput_admin.js"></script>');
    expect(ad).toContain("vaihdaNakyma('liput',this)"); expect(ad).toContain("case 'liput':      _liput().render();"); expect(ad).toContain('window.liputVaihda = (s, l, a) => _liput().vaihda(s, l, a);');
  });
});

describe('tm_klippi_ryhma: klippi_oma_video lukee liput/julkiset', () => {
  it('julkiset boolean voittaa vanhan kentän; ilman julkisia vanha ennallaan', () => {
    expect(K.tmKrLippu({ liput: { klippi_oma_video: true } }, { klippi_oma_video: false })).toBe(false);
    expect(K.tmKrLippu(null, { klippi_oma_video: true })).toBe(true); expect(K.tmKrLippu({ liput: { klippi_oma_video: true } })).toBe(true);
  });
  it('tmKrLataa lukee julkiset-dokumentin; luvun virhe → vanha kenttä', async () => {
    const mk = (jul, julVirhe) => ({ collectionGroup: () => ({ where: () => ({ get: async () => ({ forEach() {} }) }) }), collection: () => ({ doc: () => ({ get: async () => ({ exists: true, data: () => ({ liput: { klippi_oma_video: true } }) }),
      collection: (c) => c === 'liput' ? { doc: () => ({ get: async () => { if (julVirhe) throw new Error('pd'); return { exists: !!jul, data: () => jul }; } }) } : { get: async () => ({ docs: [] }) } }) }) });
    expect((await K.tmKrLataa(mk({ klippi_oma_video: false }), 's')).lippu).toBe(false);
    expect((await K.tmKrLataa(mk(null, true), 's')).lippu).toBe(true);
    vi.restoreAllMocks();
  });
});
