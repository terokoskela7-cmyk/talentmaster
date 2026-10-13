/* K35-5 (TASO-ottelut kalenteriin): vartijat selainlibin ja functions-moduulin välillä + yhdistysskripti. Logiikkatestit: functions/test/kalenteri_taso.test.js. */
const fs = require('fs'), path = require('path');
const FN = require('../functions/kalenteri_taso.js'), IDX = fs.readFileSync(path.join(__dirname, '..', 'functions', 'index.js'), 'utf8'), LIB = fs.readFileSync(path.join(__dirname, '..', 'lib', 'tm_kalenteri_malli.js'), 'utf8');
const Y = require('../scripts/yhdista_taso_joukkueet.js');
describe('yksi sääntö: LAHTEEN_KENTAT', () => {
  it('functions/kalenteri_taso.js LAHTEEN_KENTAT = lib/tm_kalenteri_malli.js:n lista (D181: lähde omistaa vain nämä)', () => {
    const m = /var LAHTEEN_KENTAT = (\[[^\]]*\])/.exec(LIB); expect(m).not.toBeNull(); expect(FN.LAHTEEN_KENTAT).toEqual((0, eval)(m[1]));
  });
  it('index.js: callable ajaa kalenterisynkan, ajastettu kalenteriTasoSynkka luodaan moduulista (ohut rivi); vanha tapahtumat-haku säilyy', () => {
    expect(IDX).toContain("_tasoKal = require('./kalenteri_taso')"); expect(IDX).toContain('_tasoKal.ajaSeura(_tasoDeps, seuraId, Date.now())'); expect(IDX).toContain('Object.assign(exports, _tasoKal.luo(_tasoDeps)'); expect(IDX).toContain('paivitaSeuranOttelut(seuraId, _tasoAvain, seuraData.taso_club_id)');   // avain server-only (turvallisuus-PR)
    expect(Object.keys(FN.luo({ functions: { region: () => ({ pubsub: { schedule: () => ({ timeZone: () => ({ onRun: (f) => f }) }) } }) }, db: {} }))).toEqual(['kalenteriTasoSynkka']);
  });
});
describe('scripts/yhdista_taso_joukkueet.js', () => {
  it('lueArgit: --seura pakollinen; pari taso_id=joukkue_id; --listaa tai --yhdista vaaditaan; --kirjoita oma lippu', () => {
    expect(Y.lueArgit(['--seura', 'kpv', '--listaa'])).toMatchObject({ seura: 'kpv', listaa: true, kirjoita: false }); expect(Y.lueArgit(['--seura', 'kpv', '--yhdista', '1=a,2=b', '--kirjoita'])).toMatchObject({ kartta: { 1: 'a', 2: 'b' }, kirjoita: true });
    expect(() => Y.lueArgit(['--listaa'])).toThrow(/Käyttö/); expect(() => Y.lueArgit(['--seura', 'kpv'])).toThrow(); expect(() => Y.lueArgit(['--seura', 'kpv', '--yhdista', 'rikki'])).toThrow(/Virheellinen/);
  });
  it('aja: kuiva-ajo ei kirjoita; --kirjoita merge; tuntematon joukkue-id keskeyttää; olemassa oleva kartta säilyy', async () => {
    const kirj = []; const doc = (d, ex) => ({ exists: ex !== false, data: () => d });
    const db = { collection: () => ({ doc: () => ({ get: async () => doc({ taso_api_key: 'k', taso_club_id: '1' }), collection: (c) => (c === 'joukkueet' ? { get: async () => ({ forEach: (f) => ['kpv_u13', 'kpv_u14'].forEach((id) => f({ id })) }) } : { doc: () => ({ get: async () => doc({ taso: { joukkueet: { 9: 'kpv_u13' } } }), set: async (d, o) => kirj.push([d, o]) }) }) }) }) };
    const lokit = []; await Y.aja({ db, seura: 'kpv', kartta: { 10: 'kpv_u14' }, kirjoita: false, loki: (x) => lokit.push(x) }); expect(kirj).toEqual([]); expect(lokit.join('')).toContain('"9":"kpv_u13"'); expect(lokit.join('')).toContain('"10":"kpv_u14"');
    await Y.aja({ db, seura: 'kpv', kartta: { 10: 'kpv_u14' }, kirjoita: true, loki: () => {} }); expect(kirj).toEqual([[{ taso: { joukkueet: { 9: 'kpv_u13', 10: 'kpv_u14' } } }, { merge: true }]]);
    await expect(Y.aja({ db, seura: 'kpv', kartta: { 11: 'ei_ole' }, kirjoita: true, loki: () => {} })).rejects.toThrow(/Joukkue-doc puuttuu/);
  });
});
