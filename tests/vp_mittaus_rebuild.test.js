/**
 * TalentMaster™ — E2.2: _vpMittausRebuildMerkinnat (TalentMaster_VP_v25.html)
 * Puhdas rebuild-syötteen rakentaja: cache-dokit → primitiivin [{pvm, tulokset}], mitätöidyt karsittuina.
 * Funktio on VP_v25.html:ssä inline → poimitaan lähteestä ja evaluoidaan (ei DOM/Firestore-riippuvuutta).
 * Lisäksi: normalisoidut merkinnät ajetaan oikean rebuild-primitiivin läpi (regressio/poisto-invariantit).
 */
import { describe, it, expect, beforeAll } from 'vitest';
import { readFileSync } from 'fs';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';
import { createRequire } from 'module';

const require = createRequire(import.meta.url);
const __dir = dirname(fileURLToPath(import.meta.url));
const { tmRakennaPikakentatArkistosta } = require('../lib/tm_pikakentat.js');

let _vpMittausRebuildMerkinnat;
beforeAll(() => {
  const html = readFileSync(join(__dir, '..', 'TalentMaster_VP_v25.html'), 'utf8');
  const lines = html.split('\n');
  const s = lines.findIndex(l => l.includes('var _VPM_KEYNORM'));
  const e = lines.findIndex(l => l.includes('window._vpMittausRebuildMerkinnat = _vpMittausRebuildMerkinnat'));
  if (s < 0 || e < 0) throw new Error('_vpMittausRebuildMerkinnat lohkoa ei löytynyt VP_v25.html:stä');
  // eslint-disable-next-line no-eval
  _vpMittausRebuildMerkinnat = eval('(function(){ ' + lines.slice(s, e).join('\n') + '\n return _vpMittausRebuildMerkinnat; })()');
});

describe('_vpMittausRebuildMerkinnat — puhdas rebuild-syöte', () => {
  it('karsii mitätöidyt avaimet, säilyttää muut (per-avain, ei koko dokkia)', () => {
    const cache = [{ __id: 'evt', data: { testauspvm: '2026-03-01', testit: { lin_30m: 4.5, hyppy_cj: 38, syotto: 34.6 }, mitatoidut: { syotto: { kuka: 'u', milloin: 'x' } } } }];
    const m = _vpMittausRebuildMerkinnat(cache);
    expect(m).toEqual([{ pvm: '2026-03-01', tulokset: { lin_30m: 4.5, hyppy_cj: 38 } }]);   // syotto karsittu, muut säilyi
  });

  it('täysin mitätöity dokki → tulokset:{} (ei kontribuoi)', () => {
    const cache = [{ __id: 'a', data: { testauspvm: '2026-05-01', testit: { lin_30m: 5 }, mitatoidut: { lin_30m: { kuka: 'u', milloin: 'x' } } } }];
    expect(_vpMittausRebuildMerkinnat(cache)).toEqual([{ pvm: '2026-05-01', tulokset: {} }]);
  });

  it('normalisoi lin-splitit (tuonti lin30m/lin10m/lin5m → primitiivin lin_30m/lin_10m/lin_5m)', () => {
    const cache = [{ __id: 'imp', data: { testauspvm: '2026-02-01', testit: { lin30m: 4.52, lin10m: 1.9, lin5m: 1.1, hyppy_cj: 40, mas: 15.2, ponnauttelu: 10 } } }];
    const t = _vpMittausRebuildMerkinnat(cache)[0].tulokset;
    expect(t.lin_30m).toBe(4.52);   // normalisoitu
    expect(t.lin_10m).toBe(1.9);
    expect(t.lin_5m).toBe(1.1);
    expect(t.hyppy_cj).toBe(40);    // muut raakana (täsmäävät jo)
    expect(t.mas).toBe(15.2);
    expect(t.ponnauttelu).toBe(10);
    expect(t.lin30m).toBeUndefined();   // vanha avain ei jää
  });

  it('tyhjä / null → []', () => {
    expect(_vpMittausRebuildMerkinnat([])).toEqual([]);
    expect(_vpMittausRebuildMerkinnat(null)).toEqual([]);
  });
});

describe('E2.2 ketju — merkinnät → rebuild-primitiivi (regressio/poisto)', () => {
  const P = { syntymaVuosi: 2013, sukupuoli: 'M', joukkue: 'KPV U13' };

  it('tuonti-lin30m normalisoituna kontribuoi hh_viimeisin.lin30m:ään (ei datahukkaa)', () => {
    const cache = [{ __id: 'b', data: { testauspvm: '2026-03-01', testit: { lin30m: 4.52 } } }];
    const res = tmRakennaPikakentatArkistosta(P, _vpMittausRebuildMerkinnat(cache));
    expect(res.upd.hh_viimeisin.lin30m).toBe(4.52);
    expect(res.upd.hh_pvm).toBe('2026-03-01');
  });

  it('viimeisimmän mittauksen mitätöinti regressoi edelliseen', () => {
    const cache = [
      { __id: 'uus', data: { testauspvm: '2026-06-01', testit: { lin30m: 4.35 }, mitatoidut: { lin30m: { kuka: 'u', milloin: 'x' } } } },
      { __id: 'van', data: { testauspvm: '2026-03-01', testit: { lin30m: 4.52 } } }
    ];
    const res = tmRakennaPikakentatArkistosta(P, _vpMittausRebuildMerkinnat(cache));
    expect(res.upd.hh_viimeisin.lin30m).toBe(4.52);   // regressoi vanhaan
    expect(res.upd.hh_pvm).toBe('2026-03-01');
  });

  it('ainoan mittauksen mitätöinti → kenttä poistettaviin (ei haamuarvoa)', () => {
    const doc = Object.assign({}, P, { hh_viimeisin: { lin30m: 4.52 }, hh_pvm: '2026-03-01', hh_taso: 3, d1_taso: 3 });
    const cache = [{ __id: 'van', data: { testauspvm: '2026-03-01', testit: { lin30m: 4.52 }, mitatoidut: { lin30m: { kuka: 'u', milloin: 'x' } } } }];
    const res = tmRakennaPikakentatArkistosta(doc, _vpMittausRebuildMerkinnat(cache));
    expect(res.upd).toEqual({});
    expect(res.poistetut).toEqual(expect.arrayContaining(['hh_viimeisin', 'hh_pvm', 'hh_taso', 'd1_taso']));
  });

  it('saman dokin toinen testi ei muutu kun yksi mitätöidään', () => {
    const cache = [{ __id: 'evt', data: { testauspvm: '2026-06-01', testit: { lin30m: 4.35, hyppy_cj: 38 }, mitatoidut: { lin30m: { kuka: 'u', milloin: 'x' } } } }];
    const res = tmRakennaPikakentatArkistosta(P, _vpMittausRebuildMerkinnat(cache));
    expect(res.upd.hh_viimeisin).toEqual({ cmj: 38 });   // CMJ säilyi, 30m poissa
  });
});
