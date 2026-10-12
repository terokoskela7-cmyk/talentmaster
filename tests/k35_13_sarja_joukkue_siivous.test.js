/* K35-13: sarjan joukkue-pakko + doc-id · normalisoiDocId-täsmäys korjausskriptissä · testitapahtumien soft-delete-siivous. */
const fs = require('fs'), path = require('path');
const MAL = require('../lib/tm_kalenteri_malli.js'), R = require('../lib/tm_ryhmat.js'), K = require('../scripts/korjaa_kalenterin_joukkue.js'), S = require('../scripts/siivoa_testitapahtumat.js');
const MASTER = fs.readFileSync(path.join(__dirname, '..', 'TalentMaster_Master_v16.html'), 'utf8');
const PVMT = ['2026-10-20', '2026-10-27', '2026-11-03'], ts = (d) => ({ ms: d.getTime() });
const pohja = (o) => Object.assign({ nimi: 'Treeni', tyyppi: 'harjoitus', joukkue: 'kpv_u13', joukkue_nimi: 'KPV U13', joukkueet: ['kpv_u13'], kohde: { tyyppi: 'joukkue' }, nakyvyys: 'kaikki' }, o || {});
const sarja = (p, o) => MAL.tmSarjaDokit(p, Object.assign({ tyyppi: 'harjoitus', aamu: false, pvmt: PVMT, alkaa: '17:30', paattyy: '19:00', kadenssi: 'viikoittain', paiva: 2, paattyyPvm: '2026-11-03', sarjaId: 's1', ts }, o || {}));

describe('#2 toistuvan sarjan luonti: joukkue-pakko + doc-id jokaiseen tapahtumaan', () => {
  it('harjoitus: jokainen sarjan tapahtuma saa joukkue = doc-id (+ joukkueet[], joukkue_nimi), sarja-id ja aikaleimat', () => {
    const r = sarja(pohja()); expect(r.ok).toBe(true); expect(r.docs.length).toBe(3);
    r.docs.forEach((d, i) => { expect(d).toMatchObject({ joukkue: 'kpv_u13', joukkue_nimi: 'KPV U13', joukkueet: ['kpv_u13'], kohde: { tyyppi: 'joukkue' }, toistuvuus_sarja_id: 's1', toistuvuus: { tyyppi: 'viikoittain', paiva: 2, paattyy: '2026-11-03' } }); expect(d.alkaa.ms).toBe(new Date(PVMT[i] + 'T17:30:00').getTime()); expect(d.paattyy.ms).toBe(new Date(PVMT[i] + 'T19:00:00').getTime()); });
  });
  it('ilman joukkuetta (kohde joukkue, joukkue-kenttä puuttuu — KPV:n 21 sarjatapahtumaa): harjoitus ja ottelu estetty, ei yhtään dokumenttia', () => {
    ['harjoitus', 'ottelu'].forEach((ty) => { const r = sarja(pohja({ tyyppi: ty, joukkue: null, joukkue_nimi: null, joukkueet: [] }), { tyyppi: ty }); expect(r).toEqual({ ok: false, syy: 'joukkue', docs: [] }); });
    expect(sarja(pohja({ joukkue: 'KPV U13', joukkueet: [] })).ok).toBe(false);   // nimi ilman id:tä joukkueet[]:ssä ei kelpaa
  });
  it('poikkeukset: aamutreeni (poimitut), muut tyypit ja ryhmä ilman joukkuetta sallittu', () => {
    const ei = { joukkue: null, joukkue_nimi: null, joukkueet: [] };
    expect(sarja(pohja(Object.assign({ kohde: { tyyppi: 'pelaajat' } }, ei)), { aamu: true }).ok).toBe(true); expect(sarja(pohja(Object.assign({ tyyppi: 'kokous' }, ei)), { tyyppi: 'kokous' }).ok).toBe(true);
    expect(sarja(pohja(Object.assign({ kohde: { tyyppi: 'ryhma', ryhma_id: 'g1' } }, ei)), { tyyppi: 'muu' }).ok).toBe(true);
  });
  it('lomake + sarja yhdessä: tmKenelleDoc antaa id:n → sarja kantaa sen; ilman joukkuetta jo lomake estää', () => {
    const kd = R.tmKenelleDoc({ tapa: 'joukkue', joukkue: 'kpv_u13', joukkueNimet: { kpv_u13: 'KPV U13' } }, { tyyppi: 'harjoitus', aamu: false }); expect(kd.ok).toBe(true);
    expect(sarja(Object.assign(pohja(), kd.osa)).docs.every((d) => d.joukkue === 'kpv_u13')).toBe(true); expect(R.tmKenelleDoc({ tapa: 'joukkue', joukkue: '' }, { tyyppi: 'harjoitus', aamu: false }).ok).toBe(false);
  });
  it('Master käyttää libin tmSarjaDokit:ia (ei omaa rakennusta) ja keskeyttää koko erän puutteessa', () => {
    expect(MASTER).toContain('window.TM_KALENTERI_MALLI.tmSarjaDokit(doc,'); expect(MASTER).toContain('_sarjaVirhe = true'); expect(MASTER).toMatch(/if \(_sarjaVirhe\) \{ toast\([\s\S]*?return; \}\n\s*await _batch\.commit\(\);/); expect(MASTER).not.toContain('toistuvuus_sarja_id: _sid');
    expect(MASTER.split('\n').length).toBeLessThanOrEqual(JSON.parse(fs.readFileSync(path.join(__dirname, 'fixtures/kuoret_kasvukatto.json'), 'utf8'))['TalentMaster_Master_v16.html'].katto);
  });
  it('Täytä viikko tallentaa myös joukkue = doc-id (ei nimeä)', () => {
    const VP = require('../lib/tm_viikkopohja.js'), x = VP.tmEhdotusDoc({ pvm: '2026-10-20', alkaa: '17:30', paattyy: '19:00', nimi: 'Treeni' }, { joukkue: 'KPV U13', joukkueId: 'kpv_u13', uid: 'u1', pelaajat: [] });
    expect(x.doc).toMatchObject({ joukkue: 'kpv_u13', joukkue_nimi: 'KPV U13', joukkueet: ['kpv_u13'] });
  });
});

describe('#1 korjaa_kalenterin_joukkue.js: normalisoiDocId(nimi) === doc-id (muut seurat)', () => {
  it('normalisoiDocId: pieniksi, ääkköset perusmerkeiksi, väli/viiva → _', () => { expect(K.normalisoiDocId('KPV U13')).toBe('kpv_u13'); expect(K.normalisoiDocId(' SJK  P14-Musta ')).toBe('sjk_p14_musta'); expect(K.normalisoiDocId('Sibbo Vargarna 2014 Blå')).toBe('sibbo_vargarna_2014_bla'); expect(K.normalisoiDocId('')).toBe(''); expect(K.normalisoiDocId(null)).toBe(''); });
  it('nimi joka ei täsmää docin nimeen mutta normalisoituu doc-id:ksi → id; muuten tunnistamaton (ei arvausta)', () => {
    const docs = [{ id: 'sjk_p14_musta', nimi: 'P14 Musta' }, { id: 'fcl_u12', nimi: 'FCL U12' }], e = (id, j) => ({ id, joukkue: j, joukkueet: [] });
    const r = K.laske([e('a', 'SJK P14 Musta'), e('b', 'FCL U12'), e('c', 'Joku Muu')], docs);
    expect(r.muutokset.map((m) => [m.id, m.data.joukkue])).toEqual([['a', 'sjk_p14_musta'], ['b', 'fcl_u12']]); expect(r.tunnistamattomat).toEqual([{ id: 'c', arvo: 'Joku Muu' }]);
  });
  it('doc-id sellaisenaan ja docin nimi toimivat kuten ennen; joukkueettomat edelleen koskematta', () => {
    const docs = [{ id: 'kpv_u13', nimi: 'KPV U13' }], r = K.laske([{ id: 'a', joukkue: 'kpv_u13', joukkueet: ['kpv_u13'], joukkue_nimi: 'KPV U13' }, { id: 'b', joukkue: 'KPV U13', joukkueet: [] }, { id: 'c', joukkue: '', joukkueet: [] }], docs);
    expect(r.ennallaan).toBe(1); expect(r.muutokset.map((m) => m.id)).toEqual(['b']); expect(r.joukkueettomia).toBe(1);
  });
});

describe('#3 siivoa_testitapahtumat.js: soft-delete, vain annettu tyyppi', () => {
  const tap = [
    { id: 'h1', tyyppi: 'harjoitus', nimi: 'Treeni', pvm: '2026-10-13', joukkue: 'kpv_u13', joukkue_nimi: 'KPV U13', toistuvuus_sarja_id: 's1', luoja_uid: 'tero' },
    { id: 'h2', tyyppi: 'Harjoitus', nimi: 'Treeni', pvm: '2026-10-06', joukkue: '', luoja_uid: 'tero', kohde: { tyyppi: 'joukkue' } },
    { id: 'h3', tyyppi: 'harjoitus', nimi: 'Vanha', pvm: '2026-09-01', poistettu: true },
    { id: 'p1', tyyppi: 'valmentajapalaveri', nimi: 'Palaveri', pvm: '2026-10-14' }, { id: 't1', tyyppi: 'testitapahtuma', nimi: 'Testipäivä', pvm: '2026-10-15' }, { id: 'o1', tyyppi: 'ottelu', nimi: 'Ottelu', pvm: '2026-10-17' }, { id: 'k1', tyyppi: 'muu', nimi: 'Kasvumittaus', pvm: '2026-10-16' }
  ];
  const mkDb = (rows) => { const kirj = [], ref = (id) => ({ id }); const col = { get: async () => { const ds = rows.map((x) => ({ id: x.id, data: () => x })); return { forEach: (f) => ds.forEach(f) }; }, doc: ref };
    return { kirj, db: { collection: () => ({ doc: () => ({ collection: () => col }) }), batch: () => ({ update: (r, d) => kirj.push([r.id, d]), commit: async () => {} }) } }; };
  it('valitse: vain annettu kanoninen tyyppi (isot kirjaimet ok), jo poistetut ja muut tyypit ohitetaan; lista pvm-järjestyksessä', () => {
    const r = S.valitse(tap, 'harjoitus'); expect(r.valitut.map((v) => v.id)).toEqual(['h2', 'h1']); expect(r.ohitettu).toEqual({ poistettu: 1, muuTyyppi: 4 });
    expect(r.valitut[1]).toEqual({ id: 'h1', pvm: '2026-10-13', tyyppi: 'harjoitus', nimi: 'Treeni', joukkue: 'KPV U13', sarja: 's1', luoja: 'tero' });
    expect(S.valitse(tap, 'ottelu').valitut.map((v) => v.id)).toEqual(['o1']);
  });
  it('KUIVA-AJO (oletus) ei kirjoita mitään; listaa pvm · tyyppi · nimi · joukkue · sarja · luoja + yhteismäärä', async () => {
    const { db, kirj } = mkDb(tap), lokit = []; await S.aja({ db, seura: 'kpv', tyyppi: 'harjoitus', kirjoita: false, loki: (x) => lokit.push(x) }); expect(kirj).toEqual([]);
    const l = lokit.join('\n'); expect(l).toContain('KUIVA-AJO'); expect(l).toContain('2026-10-13 · harjoitus · Treeni · KPV U13 · sarja s1 · tero'); expect(l).toContain('(ei joukkuetta)'); expect(l).toMatch(/Yhteensä: 2 tapahtumaa \(kuiva-ajo\)/); expect(l).not.toContain('SEURAAVAKSI');
  });
  it('--kirjoita: SOFT-DELETE vain valituille (poistettu: true, poistettu_syy: testidata, poistettu_pvm); ei hard deleteä; muut tyypit ja jo poistetut koskemattomia; ohje kertymän ajoon', async () => {
    const { db, kirj } = mkDb(tap), lokit = []; await S.aja({ db, deps: { palvelinAika: () => 'TS' }, seura: 'kpv', tyyppi: 'harjoitus', kirjoita: true, loki: (x) => lokit.push(x) });
    expect(kirj).toEqual([['h2', { poistettu: true, poistettu_syy: 'testidata', poistettu_pvm: 'TS' }], ['h1', { poistettu: true, poistettu_syy: 'testidata', poistettu_pvm: 'TS' }]]);
    expect(lokit.join('\n')).toContain('taydenna_harjoituskertyma.js --seura kpv --kirjoita'); expect(JSON.stringify(db).length).toBeGreaterThan(0);
    const db2 = mkDb(tap).db; expect(typeof db2.batch().delete).toBe('undefined');   // mockissa ei delete-metodia: hard delete heittäisi
  });
  it('--tyyppi pakollinen ja tunnettu (ei "kaikki"); lueArgit vaatii --seura; --kirjoita oma lippu', async () => {
    expect(S.lueArgit(['--seura', 'kpv', '--tyyppi', 'harjoitus'])).toEqual({ seura: 'kpv', tyyppi: 'harjoitus', kirjoita: false }); expect(S.lueArgit(['--seura', 'kpv', '--tyyppi', 'harjoitus', '--kirjoita']).kirjoita).toBe(true);
    expect(() => S.lueArgit(['--seura', 'kpv'])).toThrow(/Käyttö/); expect(() => S.lueArgit(['--tyyppi', 'harjoitus'])).toThrow(/Käyttö/); expect(() => S.lueArgit(['--seura', 'kpv', '--tyyppi', '--kirjoita'])).toThrow();
    const { db, kirj } = mkDb(tap); for (const t of ['kaikki', '', 'roskaa']) await expect(S.aja({ db, seura: 'kpv', tyyppi: t, kirjoita: true, loki: () => {} })).rejects.toThrow(/tyyppi/); expect(kirj).toEqual([]);
  });
});
