// Staging-turva (taysi-OOM 20.11.2026): kirjoitus erissä (muisti vakio), vahvistus ennen --aja:ta, --paivita-tki (vain muuttuneet dokumentit), --siivoa-ylimaarat, tarkista_staging (vain luku). Ei Firestorea/Authia (muistissa oleva vale).
import { describe, it, expect, vi } from 'vitest';
vi.setConfig({ testTimeout: 60000 });   // 165 k dokumentin valekirjoitukset: CI-kuormassa yli oletuksen 5 s
import { createRequire } from 'module';
import { readFileSync, mkdtempSync, writeFileSync, utimesSync, rmSync } from 'fs';
import { join } from 'path';
import { tmpdir } from 'os';
const require = createRequire(import.meta.url);
const ROOT = join(__dirname, '..');
const A = require('../scripts/kuorma/aineisto.js');
const G = require('../scripts/kuorma/generoi_aineisto.js');
const TP = require('../scripts/kuorma/tki_paivitys.js');
const TARK = require('../scripts/kuorma/tarkista_staging.js');
const PILOT = ['talentmaster', 'pilot'].join('-');
const P = 'talentmaster-staging';
const PIENI = Object.assign({}, A.PROFIILIT.savu_taysi, { nimi: 'pieni_turva', seurat: [{ koko: 60 }, { koko: 40 }], kirjaukset: 5, viikkokatsaukset: 3, havainnot: 2, toimenpiteita: 12, kausia3: { pelaajia: 5, jaksoHistoriaaKaudessa: 40 } });
A.PROFIILIT.pieni_turva = PIENI;   // tarkista_staging hakee profiilin nimellä

// ── Muistissa oleva Firestore + Auth ─────────────────────────────────────────────────────────────
const POISTA = { poistaKentta: true };   // vale FieldValue.delete()
function vale(alku, tilit, asetukset) {
  const kanta = new Map(alku || []), kirj = [], poistot = [], poistetutTilit = []; let jonossa = 0, maxJonossa = 0, flushit = 0;
  const ref = (p) => ({ polku: p, path: p, id: p.split('/').pop(), get: async () => ({ exists: kanta.has(p), data: () => kanta.get(p) }) });
  const ylin = (k) => [...kanta.keys()].filter((p) => p.split('/').length === 2 && p.split('/')[0] === k);
  const db = {
    doc: ref,
    getAll: async (...refs) => refs.map((r) => ({ exists: kanta.has(r.polku), data: () => kanta.get(r.polku) })),
    collectionGroup: (k) => ({ count: () => ({ get: async () => ({ data: () => ({ count: [...kanta.keys()].filter((p) => { const o = p.split('/'); return o.length % 2 === 0 && o[o.length - 2] === k; }).length }) }) }) }),
    collection: (k) => ({ listDocuments: async () => ylin(k).map(ref), get: async () => ({ docs: ylin(k).map((p) => ({ id: p.split('/')[1], ref: ref(p), data: () => kanta.get(p) })) }) }),
    recursiveDelete: async (r) => { poistot.push(r.id); [...kanta.keys()].forEach((p) => { if (p === r.polku || p.indexOf(r.polku + '/') === 0) kanta.delete(p); }); },
  };
  const bw = {
    set: (r, d, opts) => { kirj.push(r.polku); if (opts && opts.merge) { const nyt = Object.assign({}, kanta.get(r.polku)); Object.keys(d).forEach((k) => { if (d[k] === POISTA) delete nyt[k]; else nyt[k] = d[k]; }); kanta.set(r.polku, nyt); } else kanta.set(r.polku, d); jonossa++; maxJonossa = Math.max(maxJonossa, jonossa); return Promise.resolve(); },
    delete: (r) => { kanta.delete(r.polku); return Promise.resolve(); }, onWriteError: () => {}, flush: async () => { jonossa = 0; flushit++; }, close: async () => { jonossa = 0; },
  };
  const kayttajat = (tilit || []).slice();
  const auth = { listUsers: async () => ({ users: kayttajat, pageToken: undefined }), deleteUsers: async (uids) => { uids.forEach((u) => { poistetutTilit.push(u); const i = kayttajat.findIndex((x) => x.uid === u); if (i >= 0) kayttajat.splice(i, 1); }); } };
  return { kanta, kirj, poistot, poistetutTilit, get maxJonossa() { return maxJonossa; }, get flushit() { return flushit; }, luoDb: async (projekti) => ({ db, auth, projekti, poista: (asetukset && asetukset.eiPoistoa) ? undefined : POISTA, bulkWriter: () => bw }) };
}
async function aja(M, argv, v, lisa) { const ulos = []; const koodi = await M.main(argv, Object.assign({ luoDb: v.luoDb, kirjaa: (r) => ulos.push(r), virhe: (r) => ulos.push('VIRHE ' + r), env: {}, adc: undefined }, lisa || {})); return { koodi, ulos: ulos.join('\n') }; }
const kooste = (profiili, siemen, vanha) => { const m = new Map(); for (const d of TP.parivirta(A, profiili, siemen)) m.set(d.polku, vanha ? d.vanha : d.uusi); return m; };
const tili = (uid, email, luotu) => ({ uid, email, metadata: { creationTime: new Date(luotu).toISOString() } });

describe('TKI-diffi (tki_paivitys)', () => {
  it('savu_taysi: muuttuneita dokumentteja vain pelaajat + tekniikkakilpailu-testitulokset, murto-osa aineistosta; savu (sha1-lukittu) ei muutu lainkaan', () => {
    const m = TP.tkiMuuttuneet(A, A.PROFIILIT.savu_taysi, '1');
    expect(m.length).toBeGreaterThan(100); expect(m.length).toBeLessThan(400);
    m.forEach((d) => expect(d.polku).toMatch(/^seurat\/kuorma_seura_\d\d\/(pelaajat\/[^/]+|pelaajat\/[^/]+\/testitulokset\/\d{4}-\d\d-\d\d_tekniikkakilpailu)$/));
    expect(TP.tkiMuuttuneet(A, A.PROFIILIT.savu, '1').length).toBe(0);
  });
  it('normaali/sama: Timestamp- ja Date-arvot vertailukelpoisia, avainjärjestys ei vaikuta', () => {
    const t = { toDate: () => new Date('2026-01-05T08:00:00Z') };
    expect(TP.sama({ a: 1, b: t }, { b: new Date('2026-01-05T08:00:00Z'), a: 1 })).toBe(true); expect(TP.sama({ a: 1 }, { a: 2 })).toBe(false);
  });
});

describe('--paivita-tki', () => {
  const muuttuneet = TP.tkiMuuttuneet(A, PIENI, '1'), polut = new Set(muuttuneet.map((d) => d.polku));
  const alku = () => { const k = kooste(PIENI, '1', true); return [...k]; };   // staging = ennen #1306:ta generoitu
  it('kuiva-ajo lukee ja vertaa mutta ei kirjoita; --aja kirjoittaa täsmälleen muuttuneet (ei muuta), uusi sisältö = generoitu; toinen ajo: jo ajan tasalla', async () => {
    expect(muuttuneet.length).toBeGreaterThan(0);
    const v = vale(alku());
    const k = await aja(G, ['--projekti=' + P, '--profiili=pieni_turva', '--paivita-tki'], v); expect(k.koodi).toBe(0); expect(v.kirj.length).toBe(0); expect(k.ulos).toContain('päivitettävää ' + muuttuneet.length); expect(k.ulos).toContain('Kuiva-ajo valmis');
    const r = await aja(G, ['--projekti=' + P, '--profiili=pieni_turva', '--paivita-tki', '--aja'], v); expect(r.koodi).toBe(0);
    expect(v.kirj.length).toBe(muuttuneet.length); v.kirj.forEach((p) => expect(polut.has(p)).toBe(true));
    const uusi = kooste(PIENI, '1', false); polut.forEach((p) => expect(TP.sama(v.kanta.get(p), uusi.get(p)), p).toBe(true));
    const r2 = await aja(G, ['--projekti=' + P, '--profiili=pieni_turva', '--paivita-tki', '--aja'], v); expect(r2.koodi).toBe(0); expect(r2.ulos).toContain('Kaikki jo ajan tasalla'); expect(v.kirj.length).toBe(muuttuneet.length);
  });
  it('Firestoressa jotain muuta kuin vanha/uusi tai dokumentti puuttuu → exit 1, EI kirjoiteta', async () => {
    const a1 = alku(), ensimmainen = muuttuneet[0].polku, i = a1.findIndex(([p]) => p === ensimmainen); a1[i] = [ensimmainen, { vierasKentta: 1 }];
    const v1 = vale(a1); const r1 = await aja(G, ['--projekti=' + P, '--profiili=pieni_turva', '--paivita-tki', '--aja'], v1); expect(r1.koodi).toBe(1); expect(v1.kirj.length).toBe(0); expect(r1.ulos).toContain('poikkeaa sekä vanhasta että uudesta 1');
    const v2 = vale(alku().filter(([p]) => p !== ensimmainen)); const r2 = await aja(G, ['--projekti=' + P, '--profiili=pieni_turva', '--paivita-tki', '--aja'], v2); expect(r2.koodi).toBe(1); expect(v2.kirj.length).toBe(0); expect(r2.ulos).toContain('puuttuu 1');
  });
  it('--profiili pakollinen; ei yhdisty toisiin toimintoihin; lukko voimassa (väärä projekti → ei yhteyttä)', async () => {
    const v = vale(alku()); let yhteys = 0; const luo = v.luoDb; v.luoDb = async (p) => { yhteys++; return luo(p); };
    expect((await aja(G, ['--projekti=' + P, '--paivita-tki'], v)).koodi).toBe(2);
    expect((await aja(G, ['--projekti=' + P, '--profiili=pieni_turva', '--paivita-tki', '--siivoa-ylimaarat'], v)).koodi).toBe(2);
    expect((await aja(G, ['--projekti=' + PILOT, '--profiili=pieni_turva', '--paivita-tki', '--aja'], v)).koodi).toBe(1); expect(yhteys).toBe(0); expect(v.kirj.length).toBe(0);
  });
  describe('--vain-tki-kentat (käsin/palvelimella muokatut dokumentit)', () => {
    const arg = (...x) => ['--projekti=' + P, '--profiili=pieni_turva', '--paivita-tki'].concat(x);
    const pelaajaD = muuttuneet.find((d) => /\/pelaajat\/[^/]+$/.test(d.polku) && !Object.keys(d.vanha).some((k) => d.uusi[k] === undefined));
    const poistoD = muuttuneet.find((d) => Object.keys(d.vanha).some((k) => d.uusi[k] === undefined));
    const muokkaa = (d, f) => { const k = alku(), i = k.findIndex(([p]) => p === d.polku); k[i] = [d.polku, f(Object.assign({}, k[i][1]))]; return k; };
    const kasin = (x) => Object.assign(x, { viimeisinKirjautuminen: 'SALAINEN-ARVO-1', kauden_tavoite: 'SALAINEN-ARVO-2' });
    it('ilman valintaa: poikkeavan polku + eroavien kenttien NIMET tulostetaan (ei arvoja), ei kirjoiteta, exit 1, vihje valintaan', async () => {
      const v = vale(muokkaa(pelaajaD, kasin)); const r = await aja(G, arg('--aja'), v);
      expect(r.koodi).toBe(1); expect(v.kirj.length).toBe(0); expect(r.ulos).toContain('poikkeava: ' + pelaajaD.polku + ' — muut kentät: kauden_tavoite, viimeisinKirjautuminen · TKI-kentät ristiriidassa: (ei)'); expect(r.ulos).not.toContain('SALAINEN'); expect(r.ulos).toContain('--vain-tki-kentat');
    });
    it('kuiva-ajo + valinta: merge-kelpoinen raportoidaan, ei kirjoiteta', async () => {
      const v = vale(muokkaa(pelaajaD, kasin)); const r = await aja(G, arg('--vain-tki-kentat'), v);
      expect(r.koodi).toBe(0); expect(v.kirj.length).toBe(0); expect(r.ulos).toContain('merge-kelpoisia 1, ohitetaan 0'); expect(r.ulos).toContain('Kirjoita ' + muuttuneet.length + ' dokumenttia (vain TKI-kentät, merge)');
    });
    it('--aja + valinta: muokatun pelaajan TKI-kentät päivittyvät, käsin lisätyt kentät SÄILYVÄT, muut dokumentit = generoitu uusi; ei-TKI-kenttiä ei kosketa', async () => {
      const v = vale(muokkaa(pelaajaD, kasin)); const r = await aja(G, arg('--vain-tki-kentat', '--aja'), v);
      expect(r.koodi, r.ulos).toBe(0); expect(v.kirj.length).toBe(muuttuneet.length);
      const nyt = v.kanta.get(pelaajaD.polku), uusi = kooste(PIENI, '1', false).get(pelaajaD.polku), tkiKentat = TP.eroavatKentat(pelaajaD.vanha, pelaajaD.uusi);
      tkiKentat.forEach((k) => expect(TP.sama(nyt[k], uusi[k]), k).toBe(true)); expect(nyt.viimeisinKirjautuminen).toBe('SALAINEN-ARVO-1'); expect(nyt.kauden_tavoite).toBe('SALAINEN-ARVO-2');
      Object.keys(pelaajaD.vanha).filter((k) => tkiKentat.indexOf(k) < 0).forEach((k) => expect(TP.sama(nyt[k], pelaajaD.vanha[k]), k).toBe(true));
      const uusiKaikki = kooste(PIENI, '1', false); muuttuneet.filter((d) => d !== pelaajaD).forEach((d) => expect(TP.sama(v.kanta.get(d.polku), uusiKaikki.get(d.polku)), d.polku).toBe(true));
    });
    it('kenttä, joka uudesta versiosta puuttuu (merkki / tki_merkki), poistetaan merge-kirjoituksessa (FieldValue.delete)', async () => {
      const poistuvat = Object.keys(poistoD.vanha).filter((k) => poistoD.uusi[k] === undefined), v = vale(muokkaa(poistoD, kasin)); const r = await aja(G, arg('--vain-tki-kentat', '--aja'), v);
      expect(r.koodi, r.ulos).toBe(0); poistuvat.forEach((k) => expect(k in v.kanta.get(poistoD.polku), k).toBe(false)); expect(v.kanta.get(poistoD.polku).viimeisinKirjautuminen).toBe('SALAINEN-ARVO-1');
    });
    it('TKI-kenttä itse muokattu → dokumentti OHITETAAN ja raportoidaan (muut päivittyvät, ohitettu säilyy koskemattomana), exit 1', async () => {
      const tkiK = TP.eroavatKentat(pelaajaD.vanha, pelaajaD.uusi)[0], v = vale(muokkaa(pelaajaD, (x) => Object.assign(x, { [tkiK]: 'KÄSIN-ASETETTU' })));
      const kuiva = await aja(G, arg('--vain-tki-kentat'), v); expect(kuiva.koodi).toBe(0); expect(kuiva.ulos).toContain('ohitetaan 1'); expect(kuiva.ulos).toContain('TKI-kentät ristiriidassa: ' + tkiK);
      const r = await aja(G, arg('--vain-tki-kentat', '--aja'), v); expect(r.koodi).toBe(1); expect(r.ulos).toContain('OHITETTU 1');
      expect(v.kirj.length).toBe(muuttuneet.length - 1); expect(v.kirj).not.toContain(pelaajaD.polku); expect(v.kanta.get(pelaajaD.polku)[tkiK]).toBe('KÄSIN-ASETETTU');
    });
    it('puuttuva dokumentti estää aina; poistotuen puuttuessa kenttää poistava dokumentti ohitetaan (ei undefined-kirjoitusta); valinta vain --paivita-tki:n kanssa', async () => {
      const v1 = vale(alku().filter(([p]) => p !== pelaajaD.polku)); const r1 = await aja(G, arg('--vain-tki-kentat', '--aja'), v1); expect(r1.koodi).toBe(1); expect(v1.kirj.length).toBe(0); expect(r1.ulos).toContain('puuttuu 1');
      const v2 = vale(alku(), undefined, { eiPoistoa: true }); const r2 = await aja(G, arg('--vain-tki-kentat', '--aja'), v2); expect(r2.koodi).toBe(1); expect(r2.ulos).toContain('OHITETTU'); expect(v2.kirj).not.toContain(poistoD.polku);
      v2.kirj.forEach((p) => Object.values(v2.kanta.get(p)).forEach((x) => expect(x).not.toBe(undefined)));
      expect((await aja(G, ['--projekti=' + P, '--profiili=pieni_turva', '--siivoa-ylimaarat', '--vain-tki-kentat'], vale(alku()))).koodi).toBe(2);
    });
  });
});

describe('--siivoa-ylimaarat', () => {
  const PR = A.PROFIILIT.savu_taysi, oma = A.tilit(PR)[0];
  const alku = () => [['seurat/kuorma_seura_01', { synteettinen: true }], ['seurat/kuorma_seura_02', { synteettinen: true }], ['seurat/kuorma_seura_03', { synteettinen: true }], ['seurat/kuorma_seura_03/pelaajat/p1', { x: 1 }], ['seurat/kuorma_seura_40', { synteettinen: true }],
    ['seurat/muu_seura', { synteettinen: true }], ['seurat/kuorma_seura_05', { synteettinen: false }],
    ['_pelaajaPin/kuorma_seura_01_kuorma_s01_p00001', { hash: 'x' }], ['_pelaajaPin/kuorma_seura_03_kuorma_s03_p00001', { hash: 'x' }]];
  const tilit = () => [tili(oma.uid, oma.email, 0), tili('kuorma_s03_vp', 's03.vp@kuorma.test', 0), tili('pel_kuorma_seura_01_kuorma_s01_p00001', undefined, 0), tili('pel_kuorma_seura_03_kuorma_s03_p00001', undefined, 0), tili('sa_tero', 'sa.tero@kuorma.test', 0), tili('joku', 'x@example.com', 0)];
  it('kuiva-ajo laskee, ei poista; --aja poistaa VAIN profiilin ulkopuoliset synteettiset (seurat 03/40 + alikokoelmat, Auth 03, PIN 03); oma + vieraat + ei-synteettinen säilyvät', async () => {
    const v = vale(alku(), tilit());
    const k = await aja(G, ['--projekti=' + P, '--profiili=savu_taysi', '--siivoa-ylimaarat'], v); expect(k.koodi).toBe(0); expect(k.ulos).toContain('seuroja: 2'); expect(k.ulos).toContain('Auth-tilejä: 2'); expect(k.ulos).toContain('PIN-hajautuksia: 1'); expect(v.poistot.length + v.poistetutTilit.length).toBe(0); expect(v.kanta.size).toBe(alku().length);
    const r = await aja(G, ['--projekti=' + P, '--profiili=savu_taysi', '--siivoa-ylimaarat', '--aja'], v); expect(r.koodi).toBe(0);
    expect(v.poistot.sort()).toEqual(['kuorma_seura_03', 'kuorma_seura_40']); expect(v.poistetutTilit.sort()).toEqual(['kuorma_s03_vp', 'pel_kuorma_seura_03_kuorma_s03_p00001']);
    const jaljella = [...v.kanta.keys()].sort(); expect(jaljella).toEqual(['_pelaajaPin/kuorma_seura_01_kuorma_s01_p00001', 'seurat/kuorma_seura_01', 'seurat/kuorma_seura_02', 'seurat/kuorma_seura_05', 'seurat/muu_seura']);
    const r2 = await aja(G, ['--projekti=' + P, '--profiili=savu_taysi', '--siivoa-ylimaarat', '--aja'], v); expect(r2.ulos).toContain('Ei siivottavaa');
  });
  it('seuraNro tunnistaa kaikki synteettiset tunnistemuodot', () => {
    expect(G.seuraNro('kuorma_seura_07')).toBe(7); expect(G.seuraNro('kuorma_s12_vp')).toBe(12); expect(G.seuraNro('pel_kuorma_seura_03_kuorma_s03_p1')).toBe(3); expect(G.seuraNro('joku')).toBe(null);
  });
});

describe('vahvistus ja erissä kirjoitus (generointi --aja)', () => {
  const SAVU_YHT = A.laske(A.PROFIILIT.savu, '1').yht;
  it('ennen vahvistusta ei kirjoiteta mitään; kysymys + määrä + kulu näkyvät; ei-KYLLÄ keskeyttää (exit 1, 0 kirjoitusta)', async () => {
    for (const vastaus of ['', 'ei', 'kyl', 'KYLLÄÄ', undefined]) {
      const v = vale(); let kirjoituksiaKysyttaessa = -1;
      const r = await aja(G, ['--projekti=' + P, '--aja'], v, { kysy: async () => { kirjoituksiaKysyttaessa = v.kirj.length; return vastaus; } });
      expect(r.koodi, String(vastaus)).toBe(1); expect(kirjoituksiaKysyttaessa).toBe(0); expect(v.kirj.length).toBe(0); expect(r.ulos).toContain('Keskeytetty');
      expect(r.ulos).toContain('VAHVISTUS: kirjoitetaan ' + SAVU_YHT.toLocaleString('fi-FI').replace(/\s/g, ' ') + ' dokumenttia'); expect(r.ulos).toMatch(/Arvioitu kulu ~\$\d/);
    }
  });
  it('KYLLÄ / kyllä / kylla hyväksytään; erissä: jono ei ylitä ERA_KOKO:a ja flush kutsutaan joka erän jälkeen', async () => {
    for (const vastaus of ['KYLLÄ', ' kyllä ', 'kylla']) {
      const v = vale(); const r = await aja(G, ['--projekti=' + P, '--aja'], v, { kysy: async () => vastaus });
      expect(r.koodi, vastaus).toBe(0); expect(v.kirj.length).toBe(SAVU_YHT); expect(v.maxJonossa).toBeLessThanOrEqual(G.ERA_KOKO); expect(v.flushit).toBe(Math.floor(SAVU_YHT / G.ERA_KOKO));
    }
  });
  it('varoitus, kun stagingissa on eri profiili kuin ajettava (taysi-OOM:n tilanne: staging savu_taysi, ajettiin taysi)', async () => {
    const v = vale([['seurat/kuorma_seura_01', { synteettinen: true, kuorma_profiili: 'savu_taysi' }]]);
    const r = await aja(G, ['--projekti=' + P, '--aja'], v, { kysy: async () => 'ei' }); expect(r.ulos).toContain('VAROITUS: stagingissa on nyt profiili savu_taysi — ajat profiilin savu');
  });
  it('staattinen: kirjoitussilmukka antaa vuoron (await bw.flush ERA_KOKO:n välein), eikä vahvistus ohitu ennen luoDb:tä kirjoituspolulla', () => {
    const src = readFileSync(join(ROOT, 'scripts/kuorma/generoi_aineisto.js'), 'utf8');
    expect(src).toMatch(/% ERA_KOKO === 0\) await bw\.flush\(\)/); expect(src.indexOf("vahvista(d, 'Kirjoita KYLLÄ")).toBeLessThan(src.indexOf('for (const doc of A.generoi(profiili, a.siemen))'));
  });
});

describe('tarkista_staging (vain luku)', () => {
  const tmp = mkdtempSync(join(tmpdir(), 'tark-')), tunn = join(tmp, 't.txt'); writeFileSync(tunn, '# otsikko\na@kuorma.test\tsalasana\tvp\tkuorma_seura_01\n');
  const NYT = Date.parse('2026-11-20T20:00:00Z'), VANHA = new Date('2026-11-12T10:56:00Z'); utimesSync(tunn, VANHA, VANHA);
  const kanta = () => [...kooste(PIENI, '1', false)];
  const tilit = () => A.tilit(PIENI).map((t) => tili(t.uid, t.email, Date.parse('2026-11-12T10:00:00Z')));
  const argv = (...x) => ['--projekti=' + P, '--profiili=pieni_turva', '--otos=100000', '--ei-functions', '--tunnukset=' + tunn].concat(x);
  const tark = (v, lisa) => aja(TARK, argv(), v, Object.assign({ nyt: () => NYT }, lisa || {}));
  it('puhdas staging (vanha TAI uusi TKI-versio) → exit 0, ei muutoksia; ei kirjoita mitään', async () => {
    const v = vale(kanta(), tilit()); const r = await tark(v); expect(r.koodi, r.ulos).toBe(0); expect(r.ulos).toContain('TULOS: staging vastaa profiilia pieni_turva'); expect(r.ulos).toContain('(ei uusia)'); expect(r.ulos).toContain('ei muutosta aikaikkunassa'); expect(v.kirj.length + v.poistot.length + v.poistetutTilit.length).toBe(0);
    const vv = vale([...kooste(PIENI, '1', true)], tilit()); expect((await tark(vv)).koodi).toBe(0);
  });
  it('ylimääräinen seura + uudet Auth-tilit aikaikkunassa + muuttunut tunnustiedosto + ylikirjoitettu sisältö → exit 1, jokainen raportoitu', async () => {
    const k = kanta(); k.push(['seurat/kuorma_seura_03', { synteettinen: true }]);
    const pel = k.findIndex(([p]) => /\/pelaajat\/[^/]+$/.test(p)); k[pel] = [k[pel][0], Object.assign({}, k[pel][1], { joukkue: 'Vieras' })];
    const t = tilit(); t.push(tili('kuorma_s03_vp', 's03.vp@kuorma.test', NYT - 3600e3));
    const v = vale(k, t); const r = await tark(v, { nyt: () => VANHA.getTime() + 3600e3 });
    expect(r.koodi).toBe(1); expect(r.ulos).toContain('ylimääräisiä 1'); expect(r.ulos).toContain('UUSIA tilejä'); expect(r.ulos).toContain('MUUTTUNUT aikaikkunassa'); expect(r.ulos).toContain('profiilin ulkopuolisia synteettisiä seuroja 1'); expect(r.ulos).toContain('SISÄLTÖ POIKKEAA 1'); expect(r.ulos).toMatch(/seurat\s+3 \/\s+2\s+← \+1/);
  });
  it('triggerit: functions:list-tuloste → montako 4:stä on deployattu; epäonnistunut komento ei kaada', async () => {
    const v = vale(kanta(), tilit()), ar = ['--projekti=' + P, '--profiili=pieni_turva', '--otos=10', '--tunnukset=' + tunn];
    const a = await aja(TARK, ar, v, { nyt: () => NYT, suorita: () => ({ status: 0, stdout: 'kertymaKirjausOnWrite  v1  firestore\nnotifKalenteriViikko v1\nmuuFunktio' }) }); expect(a.ulos).toContain('5. Triggerit deployattuna stagingiin: 2/4'); expect(a.ulos).toContain('= kulua');
    const b = await aja(TARK, ar, v, { nyt: () => NYT, suorita: () => ({ status: 1 }) }); expect(b.ulos).toContain('functions:list ei onnistunut'); expect(b.koodi).toBe(0);
  });
  it('lukko ennen Admin SDK:ta; profiili pakollinen; ei salasanoja tulosteessa', async () => {
    const v = vale(kanta(), tilit()); let yhteys = 0; const luo = v.luoDb; v.luoDb = async (p) => { yhteys++; return luo(p); };
    expect((await aja(TARK, ['--projekti=' + PILOT, '--profiili=pieni_turva'], v)).koodi).toBe(1); expect(yhteys).toBe(0);
    expect((await aja(TARK, ['--projekti=' + P], v)).koodi).toBe(2);
    const r = await tark(v); expect(r.ulos).not.toContain('salasana'); rmSync(tmp, { recursive: true, force: true });
  });
});
