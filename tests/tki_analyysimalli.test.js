/**
 * TalentMaster™ — TKI-analyysimalli VAIHE 1 -yksikkötestit
 * Funktiot: tkLajiViite, tkLajiGapit, tkSekuntibudjetti, tkVaadittuVuosivauhti, tkAbsDelta
 * Speksi: docs/TKI_ANALYYSIMALLI.md · docs/tehtavat_arkisto/TEHTAVA_TKI_VAIHE1.md
 *
 * Ajetaan: npm test
 */
import { describe, it, expect } from 'vitest';
import { createRequire } from 'module';
const require = createRequire(import.meta.url);

const {
  tkLajiViite,
  tkLajiTaso,
  laskeD2Tekninen,
  tkLajiGapit,
  tkSekuntibudjetti,
  tkVaadittuVuosivauhti,
  tkAbsDelta,
  TK_LAJIVIITTEET,
  TK_LAJITASOT,
  TK_KOKONAISRAJAT,
} = require('../docs/testit_indeksit.js');

// ═══════════════════════════════════════════════════════════════════
// tkLajiViite — viitetaso loppukilpailudatasta, EI interpolointia
// ═══════════════════════════════════════════════════════════════════
describe('tkLajiViite', () => {
  it('P12 pujottelu → valtakunnallinen viite + n + lahde', () => {
    expect(tkLajiViite('pujottelu', 12, 'P')).toEqual({ erinomainen: 24.2, hyva: 24.9, n: 12, lahde: 'valtakunnallinen' });
  });
  it('T12 syotto → valtakunnallinen + n=7', () => {
    expect(tkLajiViite('syotto', 12, 'T')).toEqual({ erinomainen: 36.5, hyva: 37.0, n: 7, lahde: 'valtakunnallinen' });
  });
  it('P11 → ALUEELLINEN viite (resync: ei enää null)', () => {
    expect(tkLajiViite('pujottelu', 11, 'P')).toEqual({ erinomainen: 25.7, hyva: 26.4, n: 20, lahde: 'alueellinen' });
  });
  it('P13 → ALUEELLINEN viite (resync: ei enää null)', () => {
    expect(tkLajiViite('pujottelu', 13, 'P')).toEqual({ erinomainen: 24.8, hyva: 25.3, n: 20, lahde: 'alueellinen' });
  });
  it('P8 + T8 + T13 → alueellinen viite löytyy', () => {
    expect(tkLajiViite('syotto', 8, 'P').lahde).toBe('alueellinen');
    expect(tkLajiViite('syotto', 8, 'T').lahde).toBe('alueellinen');
    expect(tkLajiViite('pujottelu', 13, 'T')).toEqual({ erinomainen: 24.6, hyva: 25.6, n: 20, lahde: 'alueellinen' });
  });
  it('ika 14 → null (rajojen 8–13 ulkopuolella, EI interpolointia)', () => {
    expect(tkLajiViite('pujottelu', 14, 'P')).toBeNull();
    expect(tkLajiViite('pujottelu', 7, 'P')).toBeNull();
  });
  it('pituuspotku_bonus ika < 12 (P10) → null (lajia ei ole alle 12)', () => {
    expect(tkLajiViite('pituuspotku_bonus', 10, 'P')).toBeNull();
  });
  it('pituuspotku_bonus P12 → käänteinen viite löytyy', () => {
    expect(tkLajiViite('pituuspotku_bonus', 12, 'P')).toEqual({ erinomainen: 13.2, hyva: 12.4, n: 12, lahde: 'valtakunnallinen' });
  });
  it('tuntematon laji / sp → null', () => {
    expect(tkLajiViite('xxx', 12, 'P')).toBeNull();
    expect(tkLajiViite('pujottelu', 12, 'X')).toBeNull();
  });
});

// ═══════════════════════════════════════════════════════════════════
// tkLajiGapit — gap vs viite, järjestys gap_s laskevasti, käänteinen pituuspotku
// ═══════════════════════════════════════════════════════════════════
describe('tkLajiGapit', () => {
  it('järjestys gap_s laskevasti (suurin potentiaali ensin)', () => {
    // P12: ponnauttelu hyva 16.2 (gap 3.8) · syotto hyva 34.8 (gap 5.2) ·
    //      pujottelu hyva 24.9 (gap 0, erinomainen) · kuljetus_laukaus hyva 14.5 (gap 0)
    const r = tkLajiGapit({ ponnauttelu_s: 20.0, syotto_s: 40.0, pujottelu_s: 24.0, kuljetus_laukaus_s: 14.0 }, 12, 'P');
    expect(r.map(x => x.laji)).toEqual(['syotto', 'ponnauttelu', 'pujottelu', 'kuljetus_laukaus']);
    expect(r[0].gap_s).toBe(5.2);
    expect(r[1].gap_s).toBe(3.8);
    expect(r[2].taso).toBe('erinomainen'); // pujottelu 24.0 <= 24.2
  });
  it('aikalaji taso: erinomainen/hyva/kehitettava', () => {
    const r = tkLajiGapit({ kuljetus_laukaus_s: 16.0 }, 12, 'P'); // hyva 14.5, erinomainen 13.5
    expect(r[0].taso).toBe('kehitettava'); // 16.0 > 14.5
    expect(r[0].gap_s).toBe(1.5);
  });
  it('pituuspotku_bonus KÄÄNTEINEN (suurempi = parempi)', () => {
    const matala = tkLajiGapit({ pituuspotku_bonus_s: 8 }, 12, 'P'); // hyva 12.4 → gap 4.4
    expect(matala[0].gap_s).toBe(4.4);
    expect(matala[0].taso).toBe('kehitettava');
    const korkea = tkLajiGapit({ pituuspotku_bonus_s: 15 }, 12, 'P'); // > erinomainen 13.2 → gap 0
    expect(korkea[0].gap_s).toBe(0);
    expect(korkea[0].taso).toBe('erinomainen');
  });
  it('puuttuvat lajit jätetään pois', () => {
    const r = tkLajiGapit({ pujottelu_s: 24.0 }, 12, 'P');
    expect(r.length).toBe(1);
    expect(r[0].laji).toBe('pujottelu');
  });
  it('ei viitettä (ika 14, rajojen ulkop.) → tyhjä lista', () => {
    expect(tkLajiGapit({ pujottelu_s: 24.0, syotto_s: 40.0 }, 14, 'P')).toEqual([]);
  });
  it('P11 (resync: nyt alueellinen viite) → ei-tyhjä lista', () => {
    expect(tkLajiGapit({ pujottelu_s: 30.0 }, 11, 'P').length).toBe(1);
  });
  it('tyhjä/puuttuva input → tyhjä lista', () => {
    expect(tkLajiGapit(null, 12, 'P')).toEqual([]);
  });
});

// ═══════════════════════════════════════════════════════════════════
// tkSekuntibudjetti — seuraava saavuttamaton mitali, < ei <= (§23)
// ═══════════════════════════════════════════════════════════════════
describe('tkSekuntibudjetti', () => {
  // P12: kulta 80, hopea 90, pronssi 105
  it('tulos < kulta → null (huipulla, ylläpito)', () => {
    expect(tkSekuntibudjetti(70, 12, 'P')).toBeNull();
  });
  it('tasan kultarajalla (80) → EI kultaa (<), tavoite=kulta gap 0', () => {
    expect(tkSekuntibudjetti(80, 12, 'P')).toEqual({ tavoite: 'kulta', gap_s: 0 });
  });
  it('kulta–hopea välissä → tavoite kulta + gap', () => {
    expect(tkSekuntibudjetti(85, 12, 'P')).toEqual({ tavoite: 'kulta', gap_s: 5 });
  });
  it('tasan hopearajalla (90) → tavoite hopea gap 0', () => {
    expect(tkSekuntibudjetti(90, 12, 'P')).toEqual({ tavoite: 'hopea', gap_s: 0 });
  });
  it('pronssin yli → tavoite pronssi + gap (esim 114.4 → 9.4)', () => {
    expect(tkSekuntibudjetti(114.4, 12, 'P')).toEqual({ tavoite: 'pronssi', gap_s: 9.4 });
  });
  it('ika ulkopuolella (7) → null', () => {
    expect(tkSekuntibudjetti(100, 7, 'P')).toBeNull();
  });
  it('T13 pronssi = 135 (resync §8.8): tasan rajalla → tavoite pronssi gap 0', () => {
    expect(TK_KOKONAISRAJAT.T[13].pronssi).toBe(135);
    expect(tkSekuntibudjetti(135, 13, 'T')).toEqual({ tavoite: 'pronssi', gap_s: 0 });
  });
});

// ═══════════════════════════════════════════════════════════════════
// tkVaadittuVuosivauhti — rajojen koveneminen, 9→10 + ika+1>13 null
// ═══════════════════════════════════════════════════════════════════
describe('tkVaadittuVuosivauhti', () => {
  it('P 9→10 → null (rata muuttuu)', () => {
    expect(tkVaadittuVuosivauhti(9, 'P', 'hopea')).toBeNull();
  });
  it('P 11→12 hopea → 20 (110 − 90)', () => {
    expect(tkVaadittuVuosivauhti(11, 'P', 'hopea')).toBe(20);
  });
  it('P 12→13 hopea → 5 (90 − 85)', () => {
    expect(tkVaadittuVuosivauhti(12, 'P', 'hopea')).toBe(5);
  });
  it('P 8→9 hopea → 5 (105 − 100)', () => {
    expect(tkVaadittuVuosivauhti(8, 'P', 'hopea')).toBe(5);
  });
  it('ika+1 > 13 (P13) → null', () => {
    expect(tkVaadittuVuosivauhti(13, 'P', 'hopea')).toBeNull();
  });
  it('T 11→12 hopea → 10 (125 − 115)', () => {
    expect(tkVaadittuVuosivauhti(11, 'T', 'hopea')).toBe(10);
  });
});

// ═══════════════════════════════════════════════════════════════════
// tkAbsDelta — validius (9→10-raja, ika-rajat) + bonusosuus
// ═══════════════════════════════════════════════════════════════════
describe('tkAbsDelta', () => {
  it('P11→P12: abs +20, validi, bonusosuus 8 (uusi pituuspotkubonus)', () => {
    expect(tkAbsDelta(90, 110, 12, 11, 8, 0)).toEqual({ abs_s: 20, validi: true, bonus_osuus_s: 8 });
  });
  it('P9→P10 ylittää 9→10-rajan → validi false', () => {
    const r = tkAbsDelta(120, 100, 10, 9, 0, 0);
    expect(r.abs_s).toBe(-20);
    expect(r.validi).toBe(false);
  });
  it('ika ulkopuolella (14) → validi false', () => {
    expect(tkAbsDelta(90, 100, 14, 13).validi).toBe(false);
  });
  it('saman rataston sisällä (13→13) → validi, abs +6', () => {
    expect(tkAbsDelta(84, 90, 13, 13)).toEqual({ abs_s: 6, validi: true, bonus_osuus_s: 0 });
  });
  it('puuttuva kokonaistulos → abs_s null', () => {
    expect(tkAbsDelta(null, 90, 12, 12).abs_s).toBeNull();
  });
});

// ═══════════════════════════════════════════════════════════════════
// tkLajiTaso — populaatiotaso 1–5 (TK_LAJITASOT, STRICT <, §23). P11 pujottelu=[28.0,29.7,31.3,33.7].
// ═══════════════════════════════════════════════════════════════════
describe('tkLajiTaso', () => {
  it('paras 20 % → taso 5 (alle P20-rajan)', () => {
    expect(tkLajiTaso('pujottelu', 26.4, 11, 'P')).toBe(5);   // 26.4 < 28.0
  });
  it('STRICT <: tasan rajalla (28.0) → taso 4, EI 5', () => {
    expect(tkLajiTaso('pujottelu', 28.0, 11, 'P')).toBe(4);
  });
  it('vyöhykkeet 4/3/2/1', () => {
    expect(tkLajiTaso('pujottelu', 29.0, 11, 'P')).toBe(4);   // <29.7
    expect(tkLajiTaso('pujottelu', 30.0, 11, 'P')).toBe(3);   // <31.3
    expect(tkLajiTaso('pujottelu', 32.0, 11, 'P')).toBe(2);   // <33.7
    expect(tkLajiTaso('pujottelu', 35.0, 11, 'P')).toBe(1);   // >= 33.7
  });
  it('cap-saturaatio: ponnauttelu 40.0 (maksimiaika) → taso 1', () => {
    expect(tkLajiTaso('ponnauttelu', 40.0, 11, 'P')).toBe(1);
  });
  it('P11 ponnauttelu -degeneraatio [37.4,40,40,40]: 39 → taso 4 (välitasot 3/2 tyhjiä)', () => {
    expect(tkLajiTaso('ponnauttelu', 39.0, 11, 'P')).toBe(4); // <40 (r[1]); r[2]=r[3]=40 ei laukea
    expect(tkLajiTaso('ponnauttelu', 30.0, 11, 'P')).toBe(5); // <37.4
  });
  it('tuntematon ikäluokka (ika<8 / >13) / laji → null', () => {
    expect(tkLajiTaso('syotto', 30, 7, 'P')).toBeNull();
    expect(tkLajiTaso('pujottelu', 26, 14, 'P')).toBeNull();
    expect(tkLajiTaso('xxx', 26, 11, 'P')).toBeNull();
    expect(tkLajiTaso('pujottelu', null, 11, 'P')).toBeNull();
  });
});

// ═══════════════════════════════════════════════════════════════════
// laskeD2Tekninen — D2-input keskiarvo TK-lajitasoista (≥2 lajia, 1 desimaali, §8.7)
// P11: pujottelu=[28.0,29.7,31.3,33.7], syotto=[42.2,45.9,49.6,56.3], ponnauttelu=[37.4,40,40,40].
// ═══════════════════════════════════════════════════════════════════
describe('laskeD2Tekninen', () => {
  it('2 lajia → keskiarvo (1 desimaali)', () => {
    // pujottelu 26.4 → taso 5 (<28.0); syotto 42.2 → taso 4 (ei <42.2, STRICT) → ka 4.5
    expect(laskeD2Tekninen({ pujottelu_s: 26.4, syotto_s: 42.2 }, 11, 'P')).toBe(4.5);
  });
  it('1 laji → null (yksi laji ei riitä D2-arvioon)', () => {
    expect(laskeD2Tekninen({ pujottelu_s: 28.0 }, 11, 'P')).toBeNull();
  });
  it('null-arvot ohitetaan; ≥2 jäljellä → ka', () => {
    // pujottelu 26.4→5, syotto null→skip, ponnauttelu 30.0→5 (<37.4) → tasot [5,5] → 5.0
    expect(laskeD2Tekninen({ pujottelu_s: 26.4, syotto_s: null, ponnauttelu_s: 30.0 }, 11, 'P')).toBe(5.0);
  });
  it('pituuspotku_bonus EI tuota tasoa → jää 1 laji → null', () => {
    expect(laskeD2Tekninen({ pujottelu_s: 26.4, pituuspotku_bonus_s: 5 }, 11, 'P')).toBeNull();
  });
  it('ika sarjan ulkopuolella (7) → kaikki tasot null → null', () => {
    expect(laskeD2Tekninen({ pujottelu_s: 26.4, syotto_s: 42.2 }, 7, 'P')).toBeNull();
  });
  it('tyhjä/null input → null', () => {
    expect(laskeD2Tekninen(null, 11, 'P')).toBeNull();
    expect(laskeD2Tekninen({}, 11, 'P')).toBeNull();
  });
});
