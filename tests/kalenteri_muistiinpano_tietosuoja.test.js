/**
 * P0 TIETOSUOJA (8.10.2026): kalenterin muistiinpano ei saa olla tapahtumadokumentissa (pelaaja lukee koko kalenterin). Uusi paikka seurat/{sid}/kalenteri/{id}/henkilokunta/muistiinpanot.
 * Järjestys: uusi luku/kirjoitus (VP + Master) → migraatio (SA-työkalu) → Rules-kiristys. Rules-testit: tests/rules (v3.48).
 */
import { describe, it, expect } from 'vitest';
import { readFileSync } from 'fs';
import { createRequire } from 'module';
import vm from 'vm';
const require = createRequire(import.meta.url);
const M = require('../lib/tm_kal_muistiinpano.js');
const lue = (f) => readFileSync(new URL('../' + f, import.meta.url), 'utf8');
const VP = lue('TalentMaster_VP_v25.html'), MA = lue('TalentMaster_Master_v16.html'), EX = lue('TalentMaster_Excel_Tuonti.html');
function funktio(src, alku) { const i = src.indexOf(alku); if (i < 0) throw new Error('ei löydy ' + alku); let d = 0; for (let j = src.indexOf('{', i); j < src.length; j++) { if (src[j] === '{') d++; else if (src[j] === '}') { d--; if (d === 0) return src.slice(i, j + 1); } } throw new Error('ei päättynyt'); }

describe('lib/tm_kal_muistiinpano.js', () => {
  it('teksti: trimmaus + ≤500; luku: alikokoelma ensin, vanha kenttä varalla; suunnitelma: tyhjä → poisto', () => {
    expect(M.tmMuistiinpanoTeksti('  a  ')).toBe('a'); expect(M.tmMuistiinpanoTeksti('x'.repeat(600))).toHaveLength(500); for (const v of [null, undefined, 5, '  ']) expect(M.tmMuistiinpanoTeksti(v)).toBe('');
    expect(M.tmMuistiinpanoLuku({ muistiinpanot: 'vanha' }, { teksti: 'uusi' })).toBe('uusi'); expect(M.tmMuistiinpanoLuku({ muistiinpanot: 'vanha' }, null)).toBe('vanha'); expect(M.tmMuistiinpanoLuku({}, null)).toBe('');
    expect(M.tmMuistiinpanoSuunnitelma(' x ', 'u')).toEqual({ tyhja: false, sub: { teksti: 'x', muokkaaja_uid: 'u' } }); expect(M.tmMuistiinpanoSuunnitelma('  ', 'u')).toEqual({ tyhja: true, sub: null });
  });
  it('migraatio: vain ei-tyhjät muistiinpanot; maara; sisältöä ei tarvita raportissa', () => {
    const m = M.tmMuistiinpanoMigraatio([{ id: 'a', muistiinpanot: 'x' }, { id: 'b', muistiinpanot: null }, { id: 'c' }, { id: 'd', muistiinpanot: '  ' }, { id: 'e', muistiinpanot: 'y' }, { muistiinpanot: 'ei id:tä' }]); expect(m.maara).toBe(2); expect(m.siirrettavat.map((x) => x.id)).toEqual(['a', 'e']);
  });
  const io = (o = {}) => { const log = { erat: [], tark: 0 }; return { log, io: { SUB_OLEMASSA: async (id) => (o.sub || []).includes(id), ERA: async (era) => { if (o.kaada && log.erat.length + 1 === o.kaada) throw Object.assign(new Error('x'), { code: 'permission-denied' }); log.erat.push(era); }, SEIS: (e) => { log.tark++; if (o.eiKayttajaa && log.erat.length >= o.eiKayttajaa && !e) return { syy: 'ei_kirjautunut' }; return e && e.code === 'permission-denied' ? { syy: 'permission-denied' } : null; } } }; };
  const lista = (n) => Array.from({ length: n }, (_, i) => ({ id: 'e' + i, teksti: 't' + i }));
  it('siirto erissä: ei ylikirjoita jo olemassa olevaa alikokoelmaa (kirjoitaSub:false, vain kenttä poistetaan); pysähtyy ensimmäiseen oikeusvirheeseen; muu virhe heitetään', async () => {
    const a = io({ sub: ['e1'] }); const t = await M.tmMuistiinpanoSiirra(lista(400), a.io); expect(t).toEqual({ siirretty: 400, ohitettuSub: 1, seis: null }); expect(a.log.erat.map((e) => e.length)).toEqual([150, 150, 100]); expect(a.log.erat[0].find((p) => p.id === 'e1').kirjoitaSub).toBe(false); expect(a.log.erat[0].find((p) => p.id === 'e0').kirjoitaSub).toBe(true);
    const b = io({ kaada: 2 }); expect(await M.tmMuistiinpanoSiirra(lista(400), b.io)).toEqual({ siirretty: 150, ohitettuSub: 0, seis: { syy: 'permission-denied' } }); expect(b.log.erat).toHaveLength(1);
    const c = io({ eiKayttajaa: 1 }); expect((await M.tmMuistiinpanoSiirra(lista(400), c.io)).seis).toEqual({ syy: 'ei_kirjautunut' });
    await expect(M.tmMuistiinpanoSiirra(lista(2), { SUB_OLEMASSA: async () => false, ERA: async () => { throw Object.assign(new Error('verkko'), { code: 'unavailable' }); }, SEIS: () => null })).rejects.toThrow('verkko'); expect(await M.tmMuistiinpanoSiirra([], io().io)).toEqual({ siirretty: 0, ohitettuSub: 0, seis: null });
  });
});

/* ── Adapterit: batchin operaatiot tallennetaan ── */
function batchAla() { const ops = []; return { ops, b: { set: (r, d, o) => ops.push(['set', r.polku, d, o]), update: (r, d) => ops.push(['update', r.polku, d]), delete: (r) => ops.push(['delete', r.polku]) } }; }
const ref = (polku) => ({ polku, collection: (c) => ref(polku + '/' + c), doc: (d) => ref(polku + '/' + d) });
const FV = { serverTimestamp: () => 'TS', delete: () => ({ __delete: true }) };
function sovitin(src, alku, loppu, nimi) { const i = src.indexOf(alku), j = src.indexOf(loppu, i); return src.slice(i, j); }
describe('VP + Master: kirjoitus alikokoelmaan, vanha kenttä poistetaan; luku alikokoelmasta (vanha kenttä varalla)', () => {
  for (const [sov, src, bf, hae] of [['VP', VP, '_vpKalMuistiinpanoBatch', '_vpKalMuistiinpanoHae'], ['Master', MA, '_calMuistiinpanoBatch', '_calMuistiinpanoHae']]) {
    const koodi = funktio(src, 'function ' + bf + '(') + '\n' + funktio(src, 'async function ' + hae + '(t)');
    const ymp = (o = {}) => { const log = { gets: [] }, sb = { window: { TM_KAL_MUISTIINPANO: M }, firebase: { firestore: { FieldValue: FV } }, _isDemoMode: !!o.demo, _demo: !!o.demo, _seuraId: 'sibbo',
      db: { collection: () => ({ doc: () => ({ collection: () => ({ doc: (id) => ({ collection: () => ({ doc: () => ({ get: async () => { log.gets.push(id); if (o.virhe) throw new Error('perm'); return { exists: o.sub != null, data: () => ({ teksti: o.sub }) }; } }) }) }) }) }) }) }, String };
      sb._db = sb.db; vm.createContext(sb); vm.runInContext(koodi + '\nthis.__b=' + bf + ';this.__h=' + hae + ';', sb); return { sb, log }; };
    it(sov + ': teksti → set(alikokoelma {teksti, muokkaaja_uid, paivitetty}); tyhjä → delete(alikokoelma)', () => {
      const e = ymp(), a = batchAla(); e.sb.__b(a.b, ref('seurat/s/kalenteri/e1'), ' Sisäinen ', 'u1'); e.sb.__b(a.b, ref('seurat/s/kalenteri/e2'), '  ', 'u1');
      expect(a.ops).toEqual([['set', 'seurat/s/kalenteri/e1/henkilokunta/muistiinpanot', { teksti: 'Sisäinen', muokkaaja_uid: 'u1', paivitetty: 'TS' }, undefined], ['delete', 'seurat/s/kalenteri/e2/henkilokunta/muistiinpanot']]);
    });
    it(sov + ': luku — alikokoelma voittaa, vanha kenttä varalla; lukuvirhe HEITETÄÄN (kutsuja ei tallenna sokkona); demo ei lue', async () => {
      expect(await ymp({ sub: 'uusi' }).sb.__h({ id: 'e1', muistiinpanot: 'vanha' })).toBe('uusi'); expect(await ymp({}).sb.__h({ id: 'e1', muistiinpanot: 'vanha' })).toBe('vanha'); expect(await ymp({}).sb.__h({ id: 'e1' })).toBe('');
      await expect(ymp({ virhe: true }).sb.__h({ id: 'e1' })).rejects.toThrow('perm'); const d = ymp({ demo: true }); expect(await d.sb.__h({ id: 'e1', muistiinpanot: 'x' })).toBe('x'); expect(d.log.gets).toEqual([]);
    });
  }
  it('VP luonti: tapahtumadokumentissa EI muistiinpanot-kenttää (edes null, Rules v3.52); tapahtuma + alikokoelma samassa batchissa (yksittäinen ja sarja)', () => {
    expect(VP).not.toMatch(/\bmuistiinpanot\s*:\s*null/); expect(VP).not.toMatch(/muistiinpanot: muistInp\.value/);
    expect(VP).toContain("_b.set(_ref, doc); _vpKalMuistiinpanoBatch(_b, _ref, muistInp.value, uid); await _b.commit();"); expect(VP).toContain("const _r2 = _col.doc(); _batch.set(_r2, d2); _vpKalMuistiinpanoBatch(_batch, _r2, muistInp.value, uid);");
  });
  it('muokkaus (VP + Master): kenttä tapahtumadokumentissa poistetaan (FieldValue.delete) + alikokoelma; ei kirjoiteta ennen kuin luku onnistui (muistLadattu) — ei tyhjennä sokkona; yhteiset-kentissä ei muistiinpanoja', () => {
    for (const src of [VP, MA]) { expect(src).toContain('var muistLadattu = false; muistI.disabled = true;'); expect(src).toMatch(/if \(muistLadattu\) \{ upd\.muistiinpanot = firebase\.firestore\.FieldValue\.delete\(\); _(vpKal|cal)MuistiinpanoBatch\(batch, col\.doc\(d\.id\), muistI\.value, muid\); \}/); expect(src).not.toMatch(/muistiinpanot: muistI\.value\.trim\(\)/); }
  });
  it('katselu: ei t.muistiinpanot-suoraa renderöintiä enää — täytetään alikokoelmasta', () => { expect(VP).not.toContain("t.muistiinpanot + '</div>'"); expect(MA).not.toContain('note.textContent = t.muistiinpanot'); expect(VP).toContain('_vpKalMuistiinpanoNayta(t)'); expect(MA).toContain('_calMuistiinpanoHae(t).then(function (s) { if (s) { note.textContent = s;'); });
  it('skripti ladataan Masterissa, VP:ssä ja Excel_Tuonnissa; Pelaaja_v7/Vanhempi_v2 eivät lue muistiinpanoja', () => { for (const s of [VP, MA, EX]) expect(s).toContain('<script src="lib/tm_kal_muistiinpano.js?v=1"></script>'); for (const f of ['TalentMaster_Pelaaja_v7.html', 'TalentMaster_Vanhempi_v2.html']) expect(lue(f).replace(/\/\/[^\n]*|\/\*[\s\S]*?\*\//g, '')).not.toMatch(/\.muistiinpanot|collection\('henkilokunta'\)/); });
});

describe('Excel_Tuonti SA-työkalu "Siirrä kalenterin muistiinpanot" (sivun oikea koodi vm:ssä)', () => {
  function aja({ tapahtumat, vahvista = true, kaada = false, sub = [] }) {
    const kirj = { batch: [], modalit: [], toast: [] }, kalDoc = (id) => ({ polku: 'kal/' + id, collection: (c) => ({ doc: (d) => ({ polku: 'kal/' + id + '/' + c + '/' + d, get: async () => ({ exists: sub.includes(id) }) }) }) });
    const db = { collection: () => ({ doc: () => ({ collection: () => ({ get: async () => ({ size: tapahtumat.length, docs: tapahtumat.map((t) => ({ id: t.id, data: () => ({ muistiinpanot: t.m }) })) }), doc: kalDoc }) }) }), batch: () => { const ops = []; return { set: (r, d) => ops.push(['set', r.polku, d]), update: (r, d) => ops.push(['update', r.polku, d]), commit: async () => { if (kaada) throw Object.assign(new Error('x'), { code: 'permission-denied' }); kirj.batch.push(ops); } }; } };
    let kerta = 0; const sb = { superAdmin: true, seuraId: 'sibbo', seuraNimi: 'Sibbo', db, TM_KAL_MUISTIINPANO: M, TM_ISTUNTO: require('../lib/tm_istunto.js'), firebase: { auth: () => ({ currentUser: { uid: 'sa' } }), firestore: { FieldValue: FV } }, kayttaja: { uid: 'sa-uid' }, document: { getElementById: () => null }, console: { error() {} }, Promise, Object, Array, Math,
      toast: (t, k) => kirj.toast.push([t, k]), _sukupuoliRaporttiModal: async (o, t, n) => { kirj.modalit.push([o, t, n]); kerta++; return kerta === 1 ? vahvista : false; } };
    vm.createContext(sb); vm.runInContext(funktio(EX, 'async function _adminSiirraKalMuistiinpanot()') + '\nthis.__f=_adminSiirraKalMuistiinpanot;', sb); return { sb, kirj };
  }
  const T = [{ id: 'a', m: 'sisäinen 1' }, { id: 'b', m: null }, { id: 'c', m: 'sisäinen 2' }, { id: 'd' }];
  it('KUIVA-AJO näyttää VAIN määrän (ei sisältöä); vahvistus → batch: set alikokoelma + update {muistiinpanot: delete}; raportti', async () => {
    const e = aja({ tapahtumat: T }); await e.sb.__f(); const [o1, t1, n1] = e.kirj.modalit[0]; expect(o1).toContain('KUIVA-AJO'); expect(t1).toContain('Tapahtumia yhteensä: 4'); expect(t1).toContain('(siirrettävät): 2'); expect(t1).not.toContain('sisäinen'); expect(n1).toBe('Siirrä 2 muistiinpanoa');
    expect(e.kirj.batch).toHaveLength(1); expect(e.kirj.batch[0]).toEqual([['set', 'kal/a/henkilokunta/muistiinpanot', { teksti: 'sisäinen 1', muokkaaja_uid: 'sa-uid', paivitetty: 'TS' }], ['update', 'kal/a', { muistiinpanot: { __delete: true } }], ['set', 'kal/c/henkilokunta/muistiinpanot', { teksti: 'sisäinen 2', muokkaaja_uid: 'sa-uid', paivitetty: 'TS' }], ['update', 'kal/c', { muistiinpanot: { __delete: true } }]]);
    expect(e.kirj.modalit[1][1]).toContain('SIIRRETTY: 2'); expect(e.kirj.toast.at(-1)).toEqual(['Muistiinpanot siirretty: 2', 'ok']);
  });
  it('jo olemassa oleva alikokoelma EI ylikirjoitu (vain vanha kenttä poistetaan); Peruuta → ei kirjoitusta; ei siirrettävää → ei nappia; permission-denied → pysähtyy + raportti', async () => {
    const a = aja({ tapahtumat: T, sub: ['a'] }); await a.sb.__f(); expect(a.kirj.batch[0].map((o) => o[0] + ':' + o[1])).toEqual(['update:kal/a', 'set:kal/c/henkilokunta/muistiinpanot', 'update:kal/c']); expect(a.kirj.modalit[1][1]).toContain('alikokoelma oli jo olemassa');
    const p = aja({ tapahtumat: T, vahvista: false }); await p.sb.__f(); expect(p.kirj.batch).toEqual([]); const n = aja({ tapahtumat: [{ id: 'x', m: null }] }); await n.sb.__f(); expect(n.kirj.modalit[0][2]).toBeNull();
    const k = aja({ tapahtumat: T, kaada: true }); await k.sb.__f(); expect(k.kirj.modalit[1][1]).toContain('PYSÄHDYS: permission-denied'); expect(k.kirj.toast.at(-1)[1]).toBe('err');
  });
  it('nappi vain SA:lle (sa-kal-muist) ja funktio tarkistaa superAdminin', () => { expect(EX).toContain("mbtn.id = 'sa-kal-muist'"); expect(EX).toContain('mbtn.onclick = _adminSiirraKalMuistiinpanot;'); expect(funktio(EX, 'async function _adminSiirraKalMuistiinpanot()')).toContain("if (!superAdmin) { toast('Vain Super Admin', 'err'); return; }"); });
});

describe('Rules v3.48 lähdetarkistus', () => {
  it('versio, alikokoelma ja läsnäolijat-luku', () => { const r = lue('tm_admin/firestore.rules'); expect(r).toMatch(/firestore.rules v3.(48|49|50|51|52|53|54)/); expect(r).toContain('match /henkilokunta/{dokId}'); expect(r).toContain("dokId == 'muistiinpanot'"); expect(r).toMatch(/onPelaajaItse\(seuraId, osallistujaId\)\s*\n\s*\|\| onLapsenHuoltaja\(seuraId, osallistujaId\);/); expect(r).not.toMatch(/allow read:[^;]*onPelaajanSeura\(seuraId\);\s*\/\/ P7-c\.1: PIN-pelaaja\/vanhempi näkee läsnäolon/); });
});
