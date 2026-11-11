// Projekti 06 PR 2b jatko — (1) trigger-kuluarvio vs MITATUT luvut (oikeat käsittelijät muistinvaraista Firestorea vasten), (2) kertymien backfill-skriptin pariteetti taytaPelaaja:an + staging-lukko,
// (3) trigger-poiston lukko (ei osu tuotantoon). Ei Firestorea/Firebase CLI:tä.
import { describe, it, expect } from 'vitest';
import { createRequire } from 'module';
const require = createRequire(import.meta.url);
const A = require('../scripts/kuorma/aineisto.js');
const T = require('../scripts/kuorma/trigger_arvio.js');
const P = require('../scripts/kuorma/poista_triggerit.js');
const B = require('../scripts/kuorma/taydenna_kertymat.js');
const K = require('../functions/harjoituskertyma.js');
const MEM = require('./helpers/muistifirestore.js');
const PILOT = ['talentmaster', 'pilot'].join('-');
const SID = 'kuorma_seura_01';
const profiili = (koko) => Object.assign({}, A.PROFIILIT.savu_taysi, { nimi: 'mittaus', seurat: [{ koko }], kirjaukset: 40, viikkokatsaukset: 2, havainnot: 1, kierroksia: [2, 2], toimenpiteita: 0, kausia3: undefined });
function muisti(koko) { const store = new Map(); for (const d of A.generoi(profiili(koko), 1)) store.set(d.polku, d.data); return MEM.luo(store); }
const otos = (a, n) => a.filter((_, i) => i % Math.max(1, Math.floor(a.length / n)) === 0).slice(0, n);

describe('trigger-arvio vs mittaus', () => {
  for (const koko of [100, 300, 500]) it('seuran koko ' + koko + ': arvioitu lukua/kutsu ±15 % mitatusta', async () => {
    const m = muisti(koko), prof = profiili(koko), l = A.laskeSeuroittain(prof, 1), a = T.arvioiTriggerit(l), keys = [...m.store.keys()];
    const lasn = otos(keys.filter((p) => /\/lasnaolijat\//.test(p)), 60), kirj = otos(keys.filter((p) => /\/kirjaukset\//.test(p)), 60);
    m.tilasto.nollaa(); for (const p of lasn) { const o = p.split('/'); await K.luoLasnaoloKasittelija(m.deps)({}, { params: { sid: o[1], eid: o[3], pid: o[5] } }); } const lasnLuvut = m.tilasto.reads / lasn.length;
    m.tilasto.nollaa(); for (const p of kirj) { const o = p.split('/'); await K.luoKirjausKasittelija(m.deps)({}, { params: { sid: o[1], pid: o[3], pvm: o[5] } }); } const kirjLuvut = m.tilasto.reads / kirj.length;
    const mitattu = (l.m.lasnaolijat * lasnLuvut + l.m.kirjaukset * kirjLuvut) / (l.m.lasnaolijat + l.m.kirjaukset), arvio = a.lukuja / (a.rivit[0].kutsuja + a.rivit[1].kutsuja);
    expect(arvio / mitattu, 'arvio ' + arvio.toFixed(1) + ' vs mitattu ' + mitattu.toFixed(1)).toBeGreaterThan(0.85); expect(arvio / mitattu).toBeLessThan(1.15);
  }, 60000);
  it('notifKalenteriViikko: 0 lukua ilman viikko_era-kenttää (generoiduilla tapahtumilla ei ole)', async () => {
    const m = muisti(100); let h; const KV = require('../functions/kalenteri_viikko.js');
    KV.viikkoTrigger({ functions: { region: () => ({ firestore: { document: () => ({ onCreate: (fn) => { h = fn; return fn; } }) } }) }, admin: {}, db: m.db, roster: async () => [], optOut: () => false });
    m.tilasto.nollaa(); for (const p of otos([...m.store.keys()].filter((q) => /\/kalenteri\/[^/]+$/.test(q)), 20)) await h({ data: () => m.store.get(p) }, { params: { sid: SID } }); expect(m.tilasto.reads).toBe(0);
  });
});

describe('kertymien backfill', () => {
  const NYT = Date.parse('2026-10-19T09:00:00+03:00'), NYT_KEVAT = Date.parse('2026-03-15T09:00:00+02:00');
  it('pariteetti: sama kooste kuin functions/harjoituskertyma.js taytaPelaaja samalla datalla (molemmat kaudet)', async () => {
    const m = muisti(60);
    for (const [nyt, kausi] of [[NYT, '2026-27'], [NYT_KEVAT, '2025-26']]) {
      const sets = new Map(); await B.laskeSeuraKausi(m.deps, { set: (ref, data) => sets.set(ref.polku, data) }, SID, kausi, nyt);
      expect(sets.size).toBeGreaterThan(40);
      for (const pid of ['kuorma_s01_p00001', 'kuorma_s01_p00007', 'kuorma_s01_p00033', 'kuorma_s01_p00060']) {
        const vanha = await K.taytaPelaaja(Object.assign({}, m.deps, { nyt: () => nyt }), SID, pid, nyt, false), uusi = sets.get('seurat/' + SID + '/pelaajat/' + pid + '/kooste/' + K.koosteId(kausi));
        expect(vanha.kausi).toBe(kausi); expect(Object.keys(vanha.korit).length).toBeGreaterThan(0); expect(JSON.parse(JSON.stringify(uusi.viikot)), pid + ' ' + kausi).toEqual(JSON.parse(JSON.stringify(vanha.korit))); expect(uusi.kausi).toBe(kausi);
      }
    }
  }, 60000);
  it('tehokkuus: luvut ≈ dokumenttia kohti, ei pelaajakohtaista tapahtumahakua (tapahtumia luetaan kerran seuraa kohti)', async () => {
    const m = muisti(60); m.tilasto.nollaa(); await B.laskeSeuraKausi(m.deps, null, SID, '2026-27', NYT);
    expect(m.tilasto.perKokoelma['kalenteri:query']).toBeLessThan(1500); expect(m.tilasto.reads).toBeLessThan(m.store.size);   // yksi luku/dokumentti on yläraja
  }, 30000);
  const vale = (store) => { const m = MEM.luo(store), kirj = []; const bw = { set: (ref) => { kirj.push(ref.polku); }, close: async () => {} }; return { m, kirj, luoDb: async (projekti) => ({ db: m.db, projekti, Timestamp: m.deps.Timestamp, FieldPath: m.deps.FieldPath, palvelinAika: () => 'TS', bulkWriter: () => bw }) }; };
  async function aja(argv, v, env, adc) { const ulos = []; const koodi = await B.main(argv, { luoDb: v.luoDb, kirjaa: (r) => ulos.push(r), virhe: (r) => ulos.push('VIRHE ' + r), env: env || {}, adc, nyt: NYT }); return { koodi, ulos: ulos.join('\n') }; }
  it('kuiva-ajo ei kirjoita; --aja kirjoittaa vain synteettisille kuorma_-seuroille (muut seurat eivät kosketa)', async () => {
    const store = new Map(muisti(40).store); store.set('seurat/' + SID, { synteettinen: true, nimi: 'x' }); store.set('seurat/sjk', { nimi: 'oikea' }); store.set('seurat/sjk/pelaajat/p1', { etunimi: 'a' }); store.set('seurat/kuorma_oikea', { nimi: 'ilman lippua' }); store.set('seurat/kuorma_oikea/pelaajat/p1', { etunimi: 'a' });
    const v1 = vale(store), k = await aja(['--projekti=talentmaster-staging'], v1); expect(k.koodi).toBe(0); expect(v1.kirj.length).toBe(0); expect(k.ulos).toContain('KUIVA-AJO'); expect(k.ulos).toMatch(/synteettisiä seuroja: 1/);
    const v2 = vale(store), r = await aja(['--projekti=talentmaster-staging', '--aja'], v2); expect(r.koodi).toBe(0); expect(v2.kirj.length).toBeGreaterThan(30); v2.kirj.forEach((p) => expect(p).toMatch(/^seurat\/kuorma_seura_01\/pelaajat\/[^/]+\/kooste\/kertyma_(2025-26|2026-27)$/));
    expect(r.ulos).not.toMatch(/SYNT-|Testi|kuorma_/);
  }, 60000);
  it('edistyminen: tulostaa seuroittain ja kausittain (läsnäolijat + kirjaukset, %) ja kokonaiskeston — heti, ei vasta lopussa', async () => {
    const store = new Map(muisti(60).store); store.set('seurat/' + SID, { synteettinen: true, nimi: 'x' });
    const ulos = [], kello = (() => { let t = 0; return () => (t += 1000); })();   // keinokello: jokainen kutsu +1 s → väliedistyminen laukeaa
    const koodi = await B.main(['--projekti=talentmaster-staging'], { luoDb: vale(store).luoDb, kirjaa: (r) => ulos.push(r), virhe: (r) => ulos.push('VIRHE ' + r), env: {}, adc: undefined, nyt: NYT, kello, valiMs: 1 });
    const t = ulos.join('\n'); expect(koodi).toBe(0);
    for (const kausi of ['2025-26', '2026-27']) { expect(t).toContain('seura 1/1 ' + kausi + ': pelaajia '); expect(t).toContain('seura 1/1 ' + kausi + ' valmis: '); }
    expect(t).toMatch(/läsnäolijat \(tapahtumia\): \d+\/\d+ \(\d+ %\) · [\d.]+ s/); expect(t).toMatch(/kirjaukset ja korit \(pelaajia\): \d+\/\d+ \(100 %\)/); expect(t).toMatch(/Kokonaiskesto [\d.]+ s\./);
    expect(t).not.toMatch(/SYNT-|Testi|kuorma_/);
  }, 30000);
  it('rinnakkaisuus: rinnan() ajaa kaikki erät, ei yli rajan yhtä aikaa; tulos sama kuin peräkkäin', async () => {
    let nyt = 0, maks = 0; const tehty = []; await B.rinnan(Array.from({ length: 100 }, (_, i) => i), 8, async (x) => { nyt++; maks = Math.max(maks, nyt); await new Promise((r) => setTimeout(r, 2)); tehty.push(x); nyt--; });
    expect(maks).toBeLessThanOrEqual(8); expect(maks).toBeGreaterThan(1); expect(tehty.sort((a, b) => a - b)).toEqual(Array.from({ length: 100 }, (_, i) => i));
  });
  it('nopeus verkkoviiveellä: 400 pelaajaa, 10 ms/kierros → rinnakkain selvästi alle peräkkäisen (≥ 5× nopeammin) ja sama kooste', async () => {
    const m = muisti(200), viive = () => new Promise((r) => setTimeout(r, 10)), oc = m.db.collection.bind(m.db);
    const kaaree = (c) => { const g = c.get, w = c.where, d = c.doc; c.get = async function () { await viive(); return g.apply(this, arguments); }; c.where = function () { return kaaree(w.apply(c, arguments)); }; c.doc = function () { const r = d.apply(c, arguments), rc = r.collection; r.collection = function () { return kaaree(rc.apply(r, arguments)); }; return r; }; return c; };
    m.db.collection = (x) => kaaree(oc(x));
    const a = new Map(), b = new Map(); const t0 = Date.now(); await B.laskeSeuraKausi(m.deps, { set: (r, d) => a.set(r.polku, d) }, SID, '2026-27', NYT, { rinnakkain: 1 }); const peräkkäin = Date.now() - t0;
    const t1 = Date.now(); await B.laskeSeuraKausi(m.deps, { set: (r, d) => b.set(r.polku, d) }, SID, '2026-27', NYT, { rinnakkain: 32 }); const rinnakkain = Date.now() - t1;
    expect(JSON.stringify([...b].sort())).toBe(JSON.stringify([...a].sort())); expect(peräkkäin / rinnakkain, peräkkäin + ' ms vs ' + rinnakkain + ' ms').toBeGreaterThan(5);
  }, 120000);
  it('lukko ennen kaikkea: pilot / emulaattorin ulkopuolinen / ristiriitainen env / ADC → exit 1, ei yhteyttä', async () => {
    for (const [argv, env, adc] of [[['--projekti=' + PILOT, '--aja'], {}, undefined], [['--projekti=talentmaster-staging', '--aja'], { GCLOUD_PROJECT: PILOT }, undefined], [['--projekti=talentmaster-staging', '--aja'], {}, PILOT], [['--aja'], {}, undefined]]) {
      let yhteys = 0; const v = vale(new Map()), luo = v.luoDb; v.luoDb = async (p) => { yhteys++; return luo(p); };
      const r = await aja(argv, v, env, adc); expect(r.koodi, JSON.stringify(argv)).toBe(1); expect(yhteys).toBe(0); expect(r.ulos).toContain('LUKKO');
    }
  });
});

describe('trigger-poisto (poista_triggerit.js)', () => {
  async function aja(argv, env, adc) { const ulos = [], kutsut = []; const koodi = await P.main(argv, { suorita: (c, a) => { kutsut.push([c, a]); return { status: 0 }; }, kirjaa: (r) => ulos.push(r), virhe: (r) => ulos.push('VIRHE ' + r), env: env || {}, adc }); return { koodi, ulos: ulos.join('\n'), kutsut }; }
  it('kuiva-ajo oletus: tulostaa komennon, ei suorita; --aja suorittaa täsmälleen 3 triggeriä + staging-projektin', async () => {
    const k = await aja(['--projekti=talentmaster-staging']); expect(k.koodi).toBe(0); expect(k.kutsut.length).toBe(0); expect(k.ulos).toContain('npx firebase functions:delete kertymaKirjausOnWrite kertymaLasnaolijaOnWrite notifKalenteriViikko --project talentmaster-staging --region europe-west1 --force');
    const r = await aja(['--projekti=talentmaster-staging', '--aja']); expect(r.koodi).toBe(0); expect(r.kutsut.length).toBe(1);
    const args = r.kutsut[0][1]; expect(r.kutsut[0][0]).toBe('npx'); expect(args.slice(0, 5)).toEqual(['firebase', 'functions:delete', ...P.TRIGGERIT.slice(0, 3)]); expect(args[args.indexOf('--project') + 1]).toBe('talentmaster-staging'); expect(args.filter((x) => x === '--project').length).toBe(1);
  });
  it('lukko: pilot, emulaattori, tyhjä, puuttuva, ristiriitainen env/ADC → exit 1 eikä mitään suoriteta (myös --aja)', async () => {
    for (const [argv, env, adc] of [[['--projekti=' + PILOT, '--aja'], {}, undefined], [['--projekti=demo-kuorma', '--aja'], {}, undefined], [['--projekti=', '--aja'], {}, undefined], [['--aja'], {}, undefined], [['--projekti=talentmaster-staging', '--aja'], { GOOGLE_CLOUD_PROJECT: PILOT }, undefined], [['--projekti=talentmaster-staging', '--aja'], { FIREBASE_CONFIG: JSON.stringify({ projectId: PILOT }) }, undefined], [['--projekti=talentmaster-staging', '--aja'], {}, PILOT]]) {
      const r = await aja(argv, env, adc); expect(r.koodi, JSON.stringify(argv)).toBe(1); expect(r.kutsut.length).toBe(0); expect(r.ulos).toContain('LUKKO');
    }
  });
  it('komento() hylkää muun kuin stagingin; funktiolista kiinteä; tuntematon valinta → 2', async () => {
    [PILOT, 'demo-kuorma', '', undefined, 'talentmaster-staging; rm -rf /'].forEach((p) => expect(() => P.komento(p), String(p)).toThrow());
    expect(P.TRIGGERIT).toEqual(['kertymaKirjausOnWrite', 'kertymaLasnaolijaOnWrite', 'notifKalenteriViikko']); expect((await aja(['--projekti=talentmaster-staging', '--kaikki'])).koodi).toBe(2);
  });
  it('epäonnistunut firebase-komento → exit 1', async () => { const virheet = []; const koodi = await P.main(['--projekti=talentmaster-staging', '--aja'], { suorita: () => ({ status: 1 }), kirjaa: () => {}, virhe: (r) => virheet.push(r), env: {}, adc: undefined }); expect(koodi).toBe(1); expect(virheet.join()).toContain('epäonnistui'); });
});
