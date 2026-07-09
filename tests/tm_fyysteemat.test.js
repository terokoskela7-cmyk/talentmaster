// Vaihe 7 — fyysinen teemaluettelo + D1-fokuslähde + evidenssi (lib/tm_fyysteemat.js).
// Ehdotus-mapping, delta-pvm-vahti (§29), PHV-portti (§28). Spec §8.
import { describe, it, expect } from 'vitest';
const F = require('../lib/tm_fyysteemat.js');

describe('TM_FYYSTEEMAT-katalogi', () => {
  it('5 teemaa, fy_liikehallinta = FLEI-evidenssi', () => {
    expect(F.TM_FYYSTEEMAT.map(t => t.avain)).toEqual(['fy_nopeus', 'fy_rajahtavyys', 'fy_kestavyys', 'fy_ketteryys', 'fy_liikehallinta']);
    expect(F.tmFyysTeema('fy_liikehallinta').flei).toBe(true);
    expect(F.tmFyysTeema('fy_nopeus').testit).toContain('lin30m');
  });
});

describe('tmFyysEhdota — fokusehdotus', () => {
  it('FLEI-pct < 40 → fy_liikehallinta (prioriteetti), numeromuoto', () => {
    const r = F.tmFyysEhdota({ flei_viimeisin: 36 });
    expect(r).toMatchObject({ avain: 'fy_liikehallinta', prioriteetti: true });
    expect(r.peruste).toMatch(/36 < 40/);
  });
  it('FLEI objektimuoto {pct} tuettu', () => {
    expect(F.tmFyysEhdota({ flei_viimeisin: { pct: 38, taso: 'heikko' } }).avain).toBe('fy_liikehallinta');
  });
  it('FLEI ≥ 40 EI laukaise liikehallintaa', () => {
    expect(F.tmFyysEhdota({ flei_viimeisin: 55 })).toBe(null);
  });
  it('heikoin D1-testi (ctx.heikoinD1Testi) → teema', () => {
    const r = F.tmFyysEhdota({ flei_viimeisin: 70 }, { heikoinD1Testi: 'lin30m' });
    expect(r).toMatchObject({ avain: 'fy_nopeus', testi: 'lin30m' });
  });
  it('ctx.osatasot → heikoin testi johdettu → teema', () => {
    const r = F.tmFyysEhdota({}, { osatasot: { lin30m: 4, cmj: 2, mas: 5 } });
    expect(r.avain).toBe('fy_rajahtavyys');   // cmj taso 2 = heikoin → räjähtävyys
  });
  it('ctx.osaindeksit (laskeD1Osaindeksit) → heikoin osaindeksi → teema + taso perusteessa', () => {
    const r = F.tmFyysEhdota({ flei_viimeisin: 70 }, { osaindeksit: { kiihdytys: 4, maksinopeus: 2, voima: 4, aerobinen: 5, ketteryys: 3, suunnanmuutos: 4 } });
    expect(r).toMatchObject({ avain: 'fy_nopeus', taso: 2, osaindeksi: 'maksinopeus' });
    expect(r.peruste).toMatch(/maksiminopeus taso 2/);
  });
  it('D2-testi (pujottelu) EI mäppäydy fyysiseen teemaan', () => {
    expect(F.tmFyysEhdota({}, { heikoinD1Testi: 'pujottelu' })).toBe(null);
    expect(F.tmFyysEhdota({}, { osatasot: { pujottelu: 1, syotto: 1 } })).toBe(null);
  });
  it('ei FLEIta eikä D1-kohdetta → null (silta ei ehdota)', () => {
    expect(F.tmFyysEhdota({})).toBe(null);
    expect(F.tmFyysEhdota(null)).toBe(null);
  });
  it('FLEI-prioriteetti voittaa D1-kohteen', () => {
    expect(F.tmFyysEhdota({ flei_viimeisin: 30 }, { heikoinD1Testi: 'lin30m' }).avain).toBe('fy_liikehallinta');
  });
});

describe('tmFyysHeikoinTesti', () => {
  it('palauttaa pienimmän tason fy-testin', () => {
    expect(F.tmFyysHeikoinTesti({ lin30m: 3, cmj: 2, mas: 4, kasirata: 3 })).toBe('cmj');
  });
  it('ohittaa D2-testit ja ei-fy-testit', () => {
    expect(F.tmFyysHeikoinTesti({ pujottelu: 1, lin30m: 3 })).toBe('lin30m');
  });
  it('tyhjä → null', () => {
    expect(F.tmFyysHeikoinTesti({})).toBe(null);
    expect(F.tmFyysHeikoinTesti(null)).toBe(null);
  });
});

describe('tmFyysDelta — §29 pvm-vahti', () => {
  const p = { jaksofokus: { konsepti_avain: 'fy_nopeus' }, hh_taso: 3.1, hh_taso_edellinen: 2.7, hh_pvm: '2026-10-12', hh_viimeisin: { lin30m: 5.18 } };
  it('tuore mittaus (hh_pvm >= alkoi) → taso-delta + pvm + raaka', () => {
    const d = F.tmFyysDelta(p, '2026-06-01');
    expect(d).toMatchObject({ lahde: 'hh', ennen: 2.7, jalkeen: 3.1, muutos: 0.4, pvm_jalkeen: '2026-10-12' });
    expect(d.testi).toBe('lin30m'); expect(d.raaka_jalkeen).toBe(5.18);
  });
  it('vanha mittaus (hh_pvm < alkoi) → null (ei väitetä vaikutusta)', () => {
    expect(F.tmFyysDelta({ ...p, hh_pvm: '2026-05-01' }, '2026-06-01')).toBe(null);
  });
  it('puuttuva hh_taso_edellinen → null', () => {
    expect(F.tmFyysDelta({ ...p, hh_taso_edellinen: null }, '2026-06-01')).toBe(null);
  });
  it('fy_liikehallinta → FLEI-delta kun edellinen olemassa', () => {
    const fp = { jaksofokus: { konsepti_avain: 'fy_liikehallinta' }, flei_viimeisin: 52, flei_edellinen: 45, flei_pvm: '2026-10-01' };
    expect(F.tmFyysDelta(fp, '2026-06-01')).toMatchObject({ lahde: 'flei', ennen: 45, jalkeen: 52, muutos: 7 });
  });
  it('fy_liikehallinta ilman edellistä FLEIta → null (subjektiivinen §29)', () => {
    expect(F.tmFyysDelta({ jaksofokus: { konsepti_avain: 'fy_liikehallinta' }, flei_viimeisin: 52, flei_pvm: '2026-10-01' }, '2026-06-01')).toBe(null);
  });
  it('teemaAvain-parametri ohittaa jaksofokuksen', () => {
    expect(F.tmFyysDelta(p, '2026-06-01', 'fy_kestavyys').lahde).toBe('hh');
  });
});

describe('tmFyysPHVPortti — §28', () => {
  it('PRE/LAH → neutraali', () => {
    expect(F.tmFyysPHVPortti({ phv_tila: 'PRE' }).neutraali).toBe(true);
    expect(F.tmFyysPHVPortti({ phv_tila: 'LAH' }).neutraali).toBe(true);
  });
  it('POST/AN → ei neutraali', () => {
    expect(F.tmFyysPHVPortti({ phv_tila: 'POST' }).neutraali).toBe(false);
    expect(F.tmFyysPHVPortti({ phv_tila: 'AN' }).neutraali).toBe(false);
  });
  it('onNeutraaliPrePHV-fallback (kutsujan tulos)', () => {
    expect(F.tmFyysPHVPortti({ phv_tila: null }, true).neutraali).toBe(true);
  });
});

describe('tmOhjelmaTemplaatti — §2c näyttöpohjainen', () => {
  it('tyyppi → oletusannos (viite lähteeseen, ei kopioitu sisältö)', () => {
    expect(F.tmOhjelmaTemplaatti('nopeus_voima')).toMatchObject({ tyyppi: 'nopeus_voima', lahde: 'everton_loikat', kesto_vk: 6 });
    expect(F.tmOhjelmaTemplaatti('kuntoutus').lahde).toBe('hpp_rehab');
  });
  it('tuntematon tyyppi → null', () => {
    expect(F.tmOhjelmaTemplaatti('xyz')).toBe(null);
  });
});
