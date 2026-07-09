// Vaihe 5 — arviointi→resepti-silta PURE-ydin (lib/tm_arviointi_silta.js).
// Heikoin havaittu D2-ominaisuus → ehdotettu OMA-konsepti (top-3, tasapeli→perustaito, vaihe-gating).
import { describe, it, expect } from 'vitest';
const S = require('../lib/tm_arviointi_silta.js');

describe('SILTA_MAP — lukitut D2-parit', () => {
  it('7 lukittua paria, vain y_h*-konseptit (D2)', () => {
    expect(S.SILTA_MAP).toEqual({
      dribbling: 'y_h4', running_with_ball: 'y_h3', ball_control: 'y_h1',
      ball_protection: 'y_h5', short_passing: 'y_h2', link_up: 'y_h6', finishing: 'y_h9'
    });
  });
});

describe('tmSiltaEhdota — heikoin ensin', () => {
  it('heikoin havaittu johtaa listan', () => {
    const r = S.tmSiltaEhdota({ dribbling: 2, short_passing: 3, finishing: 4 });
    expect(r[0]).toMatchObject({ palloliitto_avain: 'dribbling', arvo: 2, konsepti_avain: 'y_h4' });
    expect(r[0].syy).toBe('Heikoin havaittu: Kuljetus ahtaassa (2/5)');
    expect(r.map(x => x.palloliitto_avain)).toEqual(['dribbling', 'short_passing', 'finishing']);
  });

  it('tasapelissä perustaito ensin (ball_control ennen finishing samalla arvolla)', () => {
    const r = S.tmSiltaEhdota({ finishing: 2, ball_control: 2 });
    expect(r[0].palloliitto_avain).toBe('ball_control');   // perustaito voittaa
    expect(r[1].palloliitto_avain).toBe('finishing');
  });

  it('tasapeli: short_passing (perustaito) ennen dribblingiä', () => {
    const r = S.tmSiltaEhdota({ dribbling: 3, short_passing: 3 });
    expect(r[0].palloliitto_avain).toBe('short_passing');
  });

  it('max 3 ehdotusta vaikka useampi heikko', () => {
    const r = S.tmSiltaEhdota({ dribbling: 1, short_passing: 1, finishing: 1, link_up: 1, ball_control: 1 });
    expect(r.length).toBe(3);
  });

  it('vain #1 saa "Heikoin havaittu:" -prefiksin', () => {
    const r = S.tmSiltaEhdota({ dribbling: 2, finishing: 3 });
    expect(r[0].syy.startsWith('Heikoin havaittu:')).toBe(true);
    expect(r[1].syy.startsWith('Havaittu:')).toBe(true);
  });
});

describe('tmSiltaEhdota — N/A + graceful', () => {
  it('N/A (null) ohitetaan', () => {
    const r = S.tmSiltaEhdota({ dribbling: null, short_passing: 3 });
    expect(r.map(x => x.palloliitto_avain)).toEqual(['short_passing']);
  });

  it('ei-numero / rajan ulkopuoli ohitetaan', () => {
    const r = S.tmSiltaEhdota({ dribbling: 'x', short_passing: 0, finishing: 6, link_up: 2 });
    expect(r.map(x => x.palloliitto_avain)).toEqual(['link_up']);
  });

  it('ei D2-arviointia → tyhjä', () => {
    expect(S.tmSiltaEhdota({})).toEqual([]);
    expect(S.tmSiltaEhdota(null)).toEqual([]);
    expect(S.tmSiltaEhdota({ acceleration: 2, tackling: 1 })).toEqual([]);   // D1/D-muut eivät mäppäydy
  });

  it('tuntematon pari (ei SILTA_MAPissa) → ei ehdotusta', () => {
    expect(S.tmSiltaEhdota({ long_passing: 1, heading: 2 })).toEqual([]);
  });
});

describe('tmSiltaEhdota — vaihe-gating (ctx.sallitutKonseptit)', () => {
  it('suodattaa konseptit sallittuun joukkoon (avain-lista)', () => {
    const r = S.tmSiltaEhdota({ dribbling: 2, finishing: 1 }, { sallitutKonseptit: ['y_h4'] });
    expect(r.map(x => x.konsepti_avain)).toEqual(['y_h4']);   // y_h9 (finishing) gattu pois
  });

  it('hyväksyy myös {avain}-objektilistan (tmTtItems-muoto)', () => {
    const r = S.tmSiltaEhdota({ dribbling: 2, short_passing: 3 }, { sallitutKonseptit: [{ avain: 'y_h2' }] });
    expect(r.map(x => x.konsepti_avain)).toEqual(['y_h2']);
  });

  it('ei sallittuja → tyhjä (graceful)', () => {
    expect(S.tmSiltaEhdota({ dribbling: 2 }, { sallitutKonseptit: ['j_h1'] })).toEqual([]);
  });
});

describe('tmSiltaEhdota — konseptiNimi-resolveri', () => {
  it('käyttää ctx.konseptiNimi(avain) → nimi', () => {
    const r = S.tmSiltaEhdota({ dribbling: 2 }, { konseptiNimi: a => ({ y_h4: 'Harhautus' }[a]) });
    expect(r[0].konsepti_nimi).toBe('Harhautus');
  });
  it('oletus = avain kun ei resolveria', () => {
    expect(S.tmSiltaEhdota({ dribbling: 2 })[0].konsepti_nimi).toBe('y_h4');
  });
});
