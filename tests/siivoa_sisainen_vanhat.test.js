/* Vaihe 1 / PR 3 — scripts/siivoa_sisainen_vanhat.js: dry-run oletuksena; poistaa vanhan A-kentän pelaajadokumentista VAIN kun sama arvo on sisainen/tiedot:ssa (oikea seuraId);
   jaetut arvot B-muotoon (signaali, hist → hist_n, biologinenIka_viimeisin); tunnisteet pois; deploy-varmistus (merkit + ensimmäinen 2d-deploy ≥ 24 h) pakollinen kirjoitukselle.
   Ajetaan VAIN fake-Firestorella (oma tynkä: pistepolkupäivitykset kuten oikea update()). */
import { describe, it, expect } from 'vitest';
import { readFileSync } from 'fs';
import { createRequire } from 'module';
const require = createRequire(import.meta.url);
const Z = require('../scripts/siivoa_sisainen_vanhat.js'), S = require('../lib/tm_sisainen.js'), M = require('../scripts/migroi_sisainen_s4.js');
const SRC = readFileSync(new URL('../scripts/siivoa_sisainen_vanhat.js', import.meta.url), 'utf8');
const DELETE = { __poista: true };
const OK = { ok: true, syy: null, merkit: [], deployt: [] };

/* Tynkä: update() tulkitsee pistepolut sisäkkäisiksi (Firestore update -semantiikka); set(merge/mergeFields) migraatiota varten. */
function fake(alku) {
  const D = new Map(Object.entries(JSON.parse(JSON.stringify(alku || {}))));
  const loki = { commits: 0 };
  const paivita = (path, u) => {
    if (!D.has(path)) throw new Error('NOT_FOUND ' + path);
    const v = JSON.parse(JSON.stringify(D.get(path)));
    Object.keys(u).forEach((polku) => { const k = polku.split('.'); let o = v; for (let i = 0; i < k.length - 1; i++) { if (!o[k[i]] || typeof o[k[i]] !== 'object') o[k[i]] = {}; o = o[k[i]]; }
      if (u[polku] && u[polku].__poista) delete o[k[k.length - 1]]; else o[k[k.length - 1]] = JSON.parse(JSON.stringify(u[polku])); });
    D.set(path, v);
  };
  const aseta = (path, d, o) => { const v = Object.assign({}, D.get(path) || {}); const kentat = (o && o.mergeFields) || Object.keys(d); kentat.forEach((f) => { v[f] = d[f]; }); D.set(path, JSON.parse(JSON.stringify(v))); };
  const snap = (path) => ({ id: path.split('/').pop(), exists: D.has(path), data: () => D.get(path), ref: ref(path) });
  function ref(path) { return { _path: path, id: path.split('/').pop(), get: async () => snap(path), collection: (c) => col(path + '/' + c), set: async (d, o) => aseta(path, d, o), update: async (u) => paivita(path, u) }; }
  function col(path) { return { doc: (id) => ref(path + '/' + id), get: async () => { const docs = [...D.keys()].filter((k) => k.startsWith(path + '/') && k.slice(path.length + 1).indexOf('/') < 0).map(snap); return { docs, size: docs.length, empty: !docs.length }; } }; }
  const db = { collection: (c) => col(c), batch: () => { const ops = []; return { update: (r, u) => ops.push(() => paivita(r._path, u)), set: (r, d, o) => ops.push(() => aseta(r._path, d, o)), commit: async () => { loki.commits++; ops.forEach((f) => f()); } }; } };
  return { db, D, loki };
}

const BIO = { mittauspaiva: '2026-10-03', phv_tila: 'PRE', phv_tila_koodi: 'PRE', phv_ika: 14.1, ika_mittaushetkella: 12.6, maturity_offset: -1.5, kehitysvaihe_kaista: 'pre', kasvutahti_cm_v: 6.1, mittaukset: { pituus: 152 } };
const JF = { alkoi: '2026-10-01', konsepti_avain: 'k1', lause: 'Syötöt', osa_havainnot: { a: 2 }, tavoite_alue: 'D2' };
function data() {
  return { 'seurat/sjk': {}, 'seurat/kpv': {},
    // a: kaikki A-kentät + jaetut + jaksofokus + tuoja; sisainen sama → kaikki siivotaan, B-muodot jäävät
    'seurat/sjk/pelaajat/a': { etunimi: 'Aatu', talenttiOhjelma: true, tavoitteet: ['x'], vastuuhenkilo: { uid: 'u1', rooli: 'vp' }, maturity_offset: -1.5, talenttiTaso: 'perus', adar_vahvin: 'A',
      signaali: 'xfactor', havainto_porras_ehdotus: { valmis: true, seuraava: 2, hist: [3, 3, 4] }, biologinenIka_viimeisin: BIO, jaksofokus: JF, tuoja: 'uid-tuoja', phv_tila: 'PRE' },
    'seurat/sjk/pelaajat/a/sisainen/tiedot': { seuraId: 'sjk', vastuuhenkilo: { uid: 'u1', rooli: 'vp' }, maturity_offset: -1.5, talenttiTaso: 'perus', adar_vahvin: 'A', signaali: 'xfactor',
      havainto_porras_hist: [3, 3, 4], biologinenIka_viimeisin: BIO, jaksofokus_sisainen: { osa_havainnot: { a: 2 }, tavoite_alue: 'D2', jakso_avain: '2026-10-01_k1' } },
    'seurat/sjk/pelaajat/a/testitulokset/2026-10-03_kasvumittaus': { pituus: 152, tuojaUid: 'x', tallensiUid: 'y', kirjaaja: 'Valm', mittaaja: 'Testaaja' },
    'seurat/sjk/pelaajat/a/biologinen_ika/2026-10-03': { mittauspaiva: '2026-10-03', mittaaja: 'Testaaja' },
    // b: ei A-kenttiä; 'phv'-signaali ja B-muotoinen bioika ja tyhjä ehdotus ilman hist:iä → ei kosketa
    'seurat/sjk/pelaajat/b': { etunimi: 'Bertta', signaali: 'phv', biologinenIka_viimeisin: { mittauspaiva: '2026-10-03', phv_tila_koodi: 'PH' }, havainto_porras_ehdotus: { valmis: false, seuraava: 1, hist_n: 2 } },
    'seurat/sjk/pelaajat/b/testitulokset/t1': { pituus: 150 },
    // c: A-kenttiä, EI sisainen-dokumenttia → jää; tuoja silti pois (tunniste, ei ehtoa)
    'seurat/sjk/pelaajat/c': { etunimi: 'Cecil', tukitarve: { alue: 'D1' }, biologinenIka_viimeisin: BIO, tuoja: 'u' },
    // d: eroaa (tukitarve eri, sisainen menetti kentän) + syvä kenttä yläjoukko (poistetaan) + jaksofokus toiselta jaksolta (jää)
    'seurat/sjk/pelaajat/d': { etunimi: 'Dani', tukitarve: { alue: 'D1', rooli: 'vp', kuvaus: 'pitkä' }, arviointi_havaittu: { d1: 3 }, jaksofokus: JF },
    'seurat/sjk/pelaajat/d/sisainen/tiedot': { seuraId: 'sjk', tukitarve: { alue: 'D1' }, arviointi_havaittu: { d1: 3, d2: 4 }, jaksofokus_sisainen: { osa_havainnot: { a: 9 }, jakso_avain: '2026-09-01_k0' } },
    // e (kpv): sisainen väärällä seuraId:llä → jää; tyhjä hist poistetaan (hist_n 0) ilman sisainen-ehtoa
    'seurat/kpv/pelaajat/e': { etunimi: 'Eero', scout_potentiaali: 4, havainto_porras_ehdotus: { valmis: false, hist: [] } },
    'seurat/kpv/pelaajat/e/sisainen/tiedot': { seuraId: 'sjk', scout_potentiaali: 4 } };
}

describe('kenttäjoukko (yksi lähde: lib/tm_sisainen.js)', () => {
  it('A-kentät = tmSisainenAKentat ilman D3:a ja terveyttä; C-kentät ja jaetut eivät ole listalla', () => {
    const odotus = S.tmSisainenAKentat().filter((k) => S.tmSisainenVainSisaiset().indexOf(k) < 0 && S.tmTerveysKentat().indexOf(k) < 0);
    expect(Z.KENTAT).toEqual(odotus);
    ['vastuuhenkilo', 'tukitarve', 'maturity_offset', 'talenttiTaso', 'adar_vahvin', 'arviointi_havaittu', 'isa_pituus_cm'].forEach((k) => expect(Z.KENTAT, k).toContain(k));
    ['talenttiOhjelma', 'tavoitteet', 'signaali', 'biologinenIka_viimeisin', 'phv_tila', 'phv_tila_koodi', 'd3_taso', 'kaytettavyys', 'jaksofokus_historia'].forEach((k) => expect(Z.KENTAT, k).not.toContain(k));
    expect(Z.JF_A).toEqual(S.RYHMAT.jaksofokus_sisainen.kentat.map((k) => k.slice('jaksofokus.'.length)));
  });
});

describe('suunnittele (pure)', () => {
  it('kaikki sama → poista; B-muodot: signaali pois, hist → hist_n samassa päivityksessä, bioika = tmBioIkaJaa; tuoja pois; C-kentät koskematta', () => {
    const d = data(), pl = Z.suunnittele(d['seurat/sjk/pelaajat/a'], d['seurat/sjk/pelaajat/a/sisainen/tiedot'], 'sjk');
    expect(pl.luokka).toBe('poista');
    expect(pl.paivitys).toEqual({ vastuuhenkilo: 'DELETE', maturity_offset: 'DELETE', talenttiTaso: 'DELETE', adar_vahvin: 'DELETE', 'jaksofokus.osa_havainnot': 'DELETE', 'jaksofokus.tavoite_alue': 'DELETE', signaali: 'DELETE',
      'havainto_porras_ehdotus.hist_n': 3, 'havainto_porras_ehdotus.hist': 'DELETE', biologinenIka_viimeisin: S.tmBioIkaJaa(BIO).pelaaja, tuoja: 'DELETE' });
    expect(pl.paivitys.biologinenIka_viimeisin).toEqual({ mittauspaiva: '2026-10-03', phv_tila: 'PRE', phv_tila_koodi: 'PRE', phv_ika: 14.1, ika_mittaushetkella: 12.6 });
  });
  it('ei A-arvoja → ei_a ("phv"-signaali, B-muotoinen bioika, hist_n-ehdotus eivät ole siivottavia)', () => {
    expect(Z.suunnittele(data()['seurat/sjk/pelaajat/b'], null, 'sjk')).toMatchObject({ luokka: 'ei_a', paivitys: {} });
  });
  it('sisainen puuttuu → jää (paitsi tunniste); eroaa → jää + eroavat; syvä kenttä yläjoukkona → poistetaan; toinen jakso → jää; väärä seuraId → jää; tyhjä hist → hist_n 0', () => {
    const d = data();
    const c = Z.suunnittele(d['seurat/sjk/pelaajat/c'], null, 'sjk'); expect(c).toMatchObject({ luokka: 'osittain', poista: ['tuoja'], jata: { sisainen_puuttuu: ['tukitarve', 'biologinenIka_viimeisin'] } });
    const dd = Z.suunnittele(d['seurat/sjk/pelaajat/d'], d['seurat/sjk/pelaajat/d/sisainen/tiedot'], 'sjk');
    expect(dd).toMatchObject({ luokka: 'osittain', poista: ['arviointi_havaittu'], jata: { eroaa: ['tukitarve'], toinen_jakso: ['jaksofokus.osa_havainnot', 'jaksofokus.tavoite_alue'] } });
    expect(dd.eroavat).toEqual([{ kentta: 'tukitarve', vanha: { alue: 'D1', rooli: 'vp', kuvaus: 'pitkä' }, uusi: { alue: 'D1' } }]);
    expect(Z.suunnittele({ arviointi_havaittu: { d1: 3, d2: 1 } }, { seuraId: 's', arviointi_havaittu: { d1: 3 } }, 's').jata.eroaa).toEqual(['arviointi_havaittu']);   // vanhassa avain, jota sisainen ei kata
    expect(Z.suunnittele({ tukitarve: { alue: 'D1' } }, { seuraId: 's', tukitarve: { alue: 'D1', rooli: 'vp' } }, 's').jata.eroaa).toEqual(['tukitarve']);   // yläjoukko kelpaa VAIN syvälle kentälle
    const e = Z.suunnittele(d['seurat/kpv/pelaajat/e'], d['seurat/kpv/pelaajat/e/sisainen/tiedot'], 'kpv');
    expect(e).toMatchObject({ luokka: 'osittain', jata: { sisainen_puuttuu: ['scout_potentiaali'] }, paivitys: { 'havainto_porras_ehdotus.hist_n': 0, 'havainto_porras_ehdotus.hist': 'DELETE' } });
  });
  it('hist eroaa sisainen-kopiosta / bioika eroaa → jää; null sisainen:ssä ≠ arvo → eroaa (ei poisteta)', () => {
    expect(Z.suunnittele({ havainto_porras_ehdotus: { hist: [1, 2] } }, { seuraId: 's', havainto_porras_hist: [1] }, 's')).toMatchObject({ luokka: 'jatetaan', paivitys: {} });
    expect(Z.suunnittele({ biologinenIka_viimeisin: BIO }, { seuraId: 's', biologinenIka_viimeisin: Object.assign({}, BIO, { maturity_offset: -1 }) }, 's').jata.eroaa).toEqual(['biologinenIka_viimeisin']);
    expect(Z.suunnittele({ vastuuhenkilo: { uid: 'u' } }, { seuraId: 's', vastuuhenkilo: null }, 's').jata.eroaa).toEqual(['vastuuhenkilo']);
  });
  it('tunnisteet: vain nimetyt kentät', () => {
    expect(Z.tunnisteet({ pituus: 1, tuojaUid: 'a', kirjaaja: 'b' })).toEqual(['tuojaUid', 'kirjaaja']); expect(Z.tunnisteet({ pituus: 1 })).toEqual([]);
  });
});

describe('aja', () => {
  it('DRY-RUN (oletus): ei kirjoita; laskee oikein; ei nimiä, ei id:itä, ei arvoja tulosteessa', async () => {
    const { db, D, loki } = fake(data()); const ennen = JSON.stringify([...D.entries()]); const rivit = [];
    const y = await Z.aja({ db, loki: (r) => rivit.push(r) });
    expect(y).toMatchObject({ seuraa: 2, pelaajia: 5, ei_a: 1, poista: 1, osittain: 3, jatetaan: 0, kenttia_poistetaan: 13, jaa_sisainen_puuttuu: 3, jaa_eroaa: 1, jaa_toinen_jakso: 2, alidokumentteja: 2, alikenttia: 5, kirjoitettu: 0 });
    expect(y.kentat['testitulokset/*.mittaaja']).toBe(1); expect(y.kentat['biologinen_ika/*.mittaaja']).toBe(1); expect(y.kentat.tuoja).toBe(2);
    expect(JSON.stringify([...D.entries()])).toBe(ennen); expect(loki.commits).toBe(0);
    expect(rivit.join('\n')).not.toMatch(/Aatu|Bertta|Cecil|Dani|Eero|\/a\b|\/c\b|uid-tuoja|Testaaja|pitkä|2026-1/);
  });
  it('KIRJOITUS: siivoaa vain kelpaavat; B-muodot ja C-kentät jäävät; sisainen ja tulokset koskematta; toinen ajo = 0 (idempotentti)', async () => {
    const { db, D } = fake(data());
    const y = await Z.aja({ db, kirjoita: true, DELETE, deploy: OK }); expect(y.kirjoitettu).toBe(6);   // a, c, d, e + 2 alidokumenttia
    expect(D.get('seurat/sjk/pelaajat/a')).toEqual({ etunimi: 'Aatu', talenttiOhjelma: true, tavoitteet: ['x'], phv_tila: 'PRE', havainto_porras_ehdotus: { valmis: true, seuraava: 2, hist_n: 3 },
      biologinenIka_viimeisin: { mittauspaiva: '2026-10-03', phv_tila: 'PRE', phv_tila_koodi: 'PRE', phv_ika: 14.1, ika_mittaushetkella: 12.6 }, jaksofokus: { alkoi: '2026-10-01', konsepti_avain: 'k1', lause: 'Syötöt' } });
    expect(D.get('seurat/sjk/pelaajat/a/sisainen/tiedot')).toEqual(data()['seurat/sjk/pelaajat/a/sisainen/tiedot']);
    expect(D.get('seurat/sjk/pelaajat/a/testitulokset/2026-10-03_kasvumittaus')).toEqual({ pituus: 152 }); expect(D.get('seurat/sjk/pelaajat/a/biologinen_ika/2026-10-03')).toEqual({ mittauspaiva: '2026-10-03' });
    expect(D.get('seurat/sjk/pelaajat/b')).toEqual(data()['seurat/sjk/pelaajat/b']);
    expect(D.get('seurat/sjk/pelaajat/c')).toEqual({ etunimi: 'Cecil', tukitarve: { alue: 'D1' }, biologinenIka_viimeisin: BIO });
    expect(D.get('seurat/sjk/pelaajat/d')).toEqual({ etunimi: 'Dani', tukitarve: { alue: 'D1', rooli: 'vp', kuvaus: 'pitkä' }, jaksofokus: JF });
    expect(D.get('seurat/kpv/pelaajat/e')).toEqual({ etunimi: 'Eero', scout_potentiaali: 4, havainto_porras_ehdotus: { valmis: false, hist_n: 0 } });
    expect(await Z.aja({ db, kirjoita: true, DELETE, deploy: OK })).toMatchObject({ kenttia_poistetaan: 0, alidokumentteja: 0, kirjoitettu: 0, poista: 0, osittain: 0 });
  });
  it('dual-read henkilökunnalle ennallaan siivouksen jälkeen (tmSisainenYhdista: sama näkymä ennen ja jälkeen)', async () => {
    const { db, D } = fake(data()); const nakyma = (pid) => S.tmSisainenYhdista(D.get('seurat/sjk/pelaajat/' + pid), D.get('seurat/sjk/pelaajat/' + pid + '/sisainen/tiedot') || null);
    const ennen = ['a', 'b', 'c', 'd'].map(nakyma);
    await Z.aja({ db, kirjoita: true, DELETE, deploy: OK });
    const jalkeen = ['a', 'b', 'c', 'd'].map(nakyma);
    const ilmanTunnisteita = (x) => { const o = Object.assign({}, x); delete o.tuoja; if (o.havainto_porras_ehdotus) { o.havainto_porras_ehdotus = Object.assign({}, o.havainto_porras_ehdotus); delete o.havainto_porras_ehdotus.hist_n; } return o; };   // tuoja = tunniste (pois); hist_n = uusi B-kenttä
    expect(jalkeen.map(ilmanTunnisteita)).toEqual(ennen.map(ilmanTunnisteita));
  });
  it('kirjoitus vaatii deploy-varmistuksen ja DELETE-sentinelin; --seura rajaa; BATCH pilkkoo', async () => {
    await expect(Z.aja({ db: fake(data()).db, kirjoita: true, DELETE })).rejects.toThrow(/deploy-varmistus/);
    await expect(Z.aja({ db: fake(data()).db, kirjoita: true, DELETE, deploy: { ok: false, syy: 'vasta 3 h' } })).rejects.toThrow(/vasta 3 h/);
    await expect(Z.aja({ db: fake(data()).db, kirjoita: true, deploy: OK })).rejects.toThrow('DELETE-sentinel');
    expect((await Z.aja({ db: fake(data()).db, seura: 'kpv' })).pelaajia).toBe(1);
    const f = fake(data()); await Z.aja({ db: f.db, kirjoita: true, DELETE, deploy: OK, BATCH: 4 }); expect(f.loki.commits).toBe(2);
  });
  it('--listaa-id: jäljelle jäävät polut + kenttien nimet, ei arvoja; --selita: eroavat arvoineen (vain kun pyydetään)', async () => {
    const rivit = []; await Z.aja({ db: fake(data()).db, listaaId: true, loki: (r) => rivit.push(r) }); const t = rivit.join('\n');
    expect(t).toContain('sjk/c (sisainen_puuttuu:tukitarve,biologinenIka_viimeisin)'); expect(t).toContain('sjk/d (eroaa:tukitarve toinen_jakso:jaksofokus.osa_havainnot,jaksofokus.tavoite_alue)'); expect(t).not.toMatch(/pitkä|D1/);
    const s = []; await Z.aja({ db: fake(data()).db, selita: true, loki: (r) => s.push(r) }); expect(s.join('\n')).toContain('sjk/d tukitarve: vanha {"alue":"D1","rooli":"vp","kuvaus":"pitkä"} → sisainen {"alue":"D1"}');
  });
  it('migraatio (s4) kopioi biologinenIka_viimeisin:n sisainen:iin → siivous voi riisua sen B-muotoon; toinen migraatio ei löydä kopioitavaa', async () => {
    const { db, D } = fake({ 'seurat/s': {}, 'seurat/s/pelaajat/p': { etunimi: 'X', biologinenIka_viimeisin: BIO, maturity_offset: -1.5 } });
    expect(Z.suunnittele(D.get('seurat/s/pelaajat/p'), null, 's').jata.sisainen_puuttuu).toEqual(['maturity_offset', 'biologinenIka_viimeisin']);
    await M.aja({ db, kirjoita: true, nytISO: '2026-11-06T10:00:00.000Z' }); expect(D.get('seurat/s/pelaajat/p/sisainen/tiedot')).toMatchObject({ seuraId: 's', biologinenIka_viimeisin: BIO, maturity_offset: -1.5 });
    expect(await Z.aja({ db, kirjoita: true, DELETE, deploy: OK })).toMatchObject({ poista: 1, kirjoitettu: 1 });
    expect(D.get('seurat/s/pelaajat/p')).toEqual({ etunimi: 'X', biologinenIka_viimeisin: S.tmBioIkaJaa(BIO).pelaaja });
    expect(await M.aja({ db, kirjoita: true })).toMatchObject({ kopioi: 0 });
  });
});

describe('deploy-varmistus', () => {
  const NYT = Date.parse('2026-11-06T12:00:00Z');
  const sivu = (teksti, status = 200) => ({ ok: status === 200, status, text: async () => teksti });
  const runit = (lista, status = 200) => ({ ok: status === 200, status, json: async () => ({ workflow_runs: lista }) });
  const RUN = (created, updated, extra) => Object.assign({ head_branch: 'main', conclusion: 'success', created_at: created, updated_at: updated }, extra);
  const MERKKIEN = 'tmBioIkaJaa TM_SISAINEN_PUUTTUU';
  const fetchit = (runs) => async (u) => (u.indexOf('api.github.com') >= 0 ? runit(runs(u)) : sivu(MERKKIEN));
  it('merkit + ensimmäinen 2d-deploy (Pages ja Functions) ≥ 24 h → ok; haku kohdistuu mergen jälkeisiin onnistuneisiin main-ajoihin', async () => {
    const haetut = []; const r = await Z.tarkistaDeploy({ nyt: NYT, fetch: async (u, o) => { haetut.push(u); return fetchit(() => [RUN('2026-11-05T09:00:00Z', '2026-11-05T09:05:00Z'), RUN('2026-11-04T17:27:56Z', '2026-11-05T08:00:00Z')])(u, o); } });
    expect(r).toMatchObject({ ok: true, deployt: [{ workflow: 'deploy-pages.yml', valmis: '2026-11-05T08:00:00.000Z', ikaH: 28 }, { workflow: 'deploy-functions.yml', ikaH: 28 }] });
    const api = haetut.filter((u) => u.indexOf('api.github.com') >= 0); expect(api).toHaveLength(2);
    api.forEach((u) => { expect(u).toContain('branch=main'); expect(u).toContain('status=success'); expect(u).toContain('created=%3E%3D' + Z.MERGE_2D); });
    expect(haetut.filter((u) => u.indexOf('github.io') >= 0).map((u) => u.split('?')[0].split('/talentmaster/')[1])).toEqual(Z.MERKIT.map((m) => m.polku));
  });
  it('ensimmäinen 2d-deploy alle 24 h / ei deployta mergen jälkeen / merkki puuttuu / HTTP- ja verkkovirhe → ei ok', async () => {
    expect((await Z.tarkistaDeploy({ nyt: NYT, fetch: fetchit(() => [RUN('2026-11-05T20:00:00Z', '2026-11-05T20:03:00Z')]) })).syy).toMatch(/deploy-pages\.yml: 2d tuotannossa vasta 15 h/);
    expect((await Z.tarkistaDeploy({ nyt: NYT, fetch: fetchit((u) => (u.indexOf('deploy-functions') >= 0 ? [] : [RUN('2026-11-04T18:00:00Z', '2026-11-04T18:05:00Z')])) })).syy).toMatch(/deploy-functions\.yml: ei onnistunutta deployta/);
    expect((await Z.tarkistaDeploy({ nyt: NYT, fetch: fetchit(() => [RUN('2026-11-04T10:00:00Z', '2026-11-04T10:05:00Z'), RUN('2026-11-04T18:00:00Z', '2026-11-04T18:00:00Z', { head_branch: 'feat' })]) })).syy).toMatch(/ei onnistunutta deployta/);   // ennen mergeä / muu haara ei kelpaa
    expect((await Z.tarkistaDeploy({ nyt: NYT, fetch: async () => sivu('vanha sivu') })).syy).toMatch(/lib\/tm_sisainen\.js: merkki tmBioIkaJaa puuttuu/);
    expect((await Z.tarkistaDeploy({ nyt: NYT, fetch: async (u) => (u.indexOf('api.github.com') >= 0 ? runit([], 403) : sivu(MERKKIEN)) })).syy).toMatch(/GitHub HTTP 403/);
    expect((await Z.tarkistaDeploy({ nyt: NYT, fetch: async () => { throw new Error('offline'); } })).syy).toMatch(/offline/);
  });
  it('merkit ovat repossa tarkistettavissa tiedostoissa (muuten varmistus ei koskaan läpäisisi); merge-aika = #1179', () => {
    Z.MERKIT.forEach((m) => expect(readFileSync(new URL('../' + m.polku, import.meta.url), 'utf8'), m.polku).toContain(m.merkki));
    expect(Z.MERGE_2D).toBe('2026-11-04T17:27:53Z'); expect(Z.WORKFLOWT).toEqual(['deploy-pages.yml', 'deploy-functions.yml']);
  });
});

describe('skriptin turvallisuus', () => {
  it('dry-run oletuksena; --kirjoita + KIRJOITA-vahvistus; deploy-varmistus ennen kirjoitusta; ADC; require ei käynnistä ajoa; vain update (ei set/delete)', () => {
    expect(SRC).toContain("argv.includes('--kirjoita')"); expect(SRC).toContain('Kirjoita KIRJOITA vahvistukseksi'); expect(SRC).toContain('credential.applicationDefault()'); expect(SRC).not.toMatch(/serviceAccount|\.json'\)/);
    expect(SRC).toContain('if (KIRJOITA && !deploy.ok)'); expect(SRC).toContain('if (KIRJOITA && SELITA) throw');
    expect(SRC).toContain('require.main === module'); expect((SRC.match(/b\.update\(/g) || []).length).toBe(1); expect(SRC).not.toMatch(/\.set\(|b\.delete\(|ref\.delete\(/);
  });
});
