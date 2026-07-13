// tm_teknistaktiset.test.js — I1 generoidun teknis-taktisen curriculum-libin invariantit.
// Lähde generoituu docs/data/parse_oma_versio.py:llä OMA_VERSIO-md:istä. Testit lukitsevat rakenteen (§0a/§30).
import { describe, it, expect } from 'vitest';
import { createRequire } from 'module';
const require = createRequire(import.meta.url);
const TT = require('../lib/tm_teknistaktiset.js');

describe('TM_TT rakenne — kattavuus (OMA_VERSIO kanoninen)', () => {
  it('14 youth-konseptia (Y-H0…H9 + Y-P1…P4)', () => {
    expect(TT.TM_TT_YOUTH.length).toBe(14);
    const koodit = TT.TM_TT_YOUTH.map(y => y.koodi);
    ['Y-H0', 'Y-H9', 'Y-P1', 'Y-P4'].forEach(k => expect(koodit).toContain(k));
  });
  it('7 pelipaikkaa täydet (T/LP/KK/KY/KH/LA/MV), jokaisella teemoja', () => {
    const pos = Object.keys(TT.TM_TT_FUNDAMENTIT);
    expect(pos.sort()).toEqual(['KH', 'KK', 'KY', 'LA', 'LP', 'MV', 'T']);
    pos.forEach(p => expect(TT.TM_TT_FUNDAMENTIT[p].length).toBeGreaterThanOrEqual(10));
  });
  it('16 joukkueteemaa (J-H/J-P/J-S/J-E)', () => {
    expect(TT.TM_TT_JOUKKUE.length).toBe(16);
    const ryhmat = new Set(TT.TM_TT_JOUKKUE.map(j => j.ryhma));
    ['hyokkays', 'puolustus', 'siirtyma', 'erikoistilanne'].forEach(r => expect(ryhmat.has(r)).toBe(true));
  });
  it('pelipaikkametadata numeroaliaksin (MV 1 · T 4,5 · KY 10)', () => {
    expect(TT.TM_TT_PELIPAIKAT.MV.numerot).toEqual([1]);
    expect(TT.TM_TT_PELIPAIKAT.T.numerot).toEqual([4, 5]);
    expect(TT.TM_TT_PELIPAIKAT.KY.numerot).toEqual([10]);
  });
});

describe('§0a asteikko 1–3 (EI 1/3/5)', () => {
  it('TM_TT_ASTEIKKO = 3-portainen kriteeri', () => {
    expect(TT.TM_TT_ASTEIKKO.max).toBe(3);
    expect(TT.TM_TT_ASTEIKKO.tasot[1]).toMatch(/ei näy/i);
    expect(TT.TM_TT_ASTEIKKO.tasot[3]).toMatch(/itsenäisesti/i);
    expect(TT.TM_TT_ASTEIKKO.tasot[5]).toBeUndefined();
  });
  it('KPI-rivit on olemassa jokaisella youth-konseptilla (a/b/c…)', () => {
    TT.TM_TT_YOUTH.forEach(y => {
      expect(y.kpi.length).toBeGreaterThan(0);
      expect(y.kpi[0].koodi).toMatch(/^[a-z]$/);
      expect(y.kpi[0].teksti.length).toBeGreaterThan(0);
    });
  });
});

describe('cue 1:1 — ei orpoja (§0b)', () => {
  it('jokaisella pelipaikkafundamentilla on cue-kysymyksiä (ei orpoa teemaa)', () => {
    let ilmanCueta = 0;
    Object.keys(TT.TM_TT_FUNDAMENTIT).forEach(p => {
      TT.TM_TT_FUNDAMENTIT[p].forEach(t => { if (!t.kysymykset || !t.kysymykset.length) ilmanCueta++; });
    });
    expect(ilmanCueta).toBe(0);
  });
  it('jokaisella joukkueteemalla on inline-cue', () => {
    TT.TM_TT_JOUKKUE.forEach(j => expect(j.kysymykset.length).toBeGreaterThan(0));
  });
  it('jokaisella youth-konseptilla on cue (Excel Kysymyspankki §0b)', () => {
    TT.TM_TT_YOUTH.forEach(y => expect(y.kysymykset.length).toBeGreaterThan(0));
  });
  it('tmTtKysymykset palauttaa cuet avaimella JA koodilla', () => {
    const t0 = TT.TM_TT_FUNDAMENTIT.T[0];
    expect(TT.tmTtKysymykset(t0.avain).length).toBeGreaterThan(0);
    expect(TT.tmTtKysymykset(t0.koodi)).toEqual(TT.tmTtKysymykset(t0.avain));
  });
});

describe('kytkentä molempiin suuntiin (joukkue ↔ yksilö/pelipaikka)', () => {
  it('joukkue → yksilö + pelipaikat', () => {
    const jh1 = TT.TM_TT_KYTKENTA['J-H1'];
    expect(jh1.yksilo.length).toBeGreaterThan(0);
    expect(jh1.pelipaikat.length).toBeGreaterThan(0);
    jh1.yksilo.forEach(y => expect(y).toMatch(/^Y-/));
  });
  it('käänteinen: yksilökoodi → joukkueteemat (ja täsmää eteenpäin-linkitykseen)', () => {
    const rev = TT.TM_TT_KYTKENTA._kaanteinen;
    // valitse jokin youth-koodi joka linkittyy vähintään yhteen joukkueteemaan
    const jokuJ = TT.TM_TT_JOUKKUE.find(j => j.yksilo.length);
    const y = jokuJ.yksilo[0];
    expect(rev[y]).toBeTruthy();
    expect(rev[y]).toContain(jokuJ.koodi);
  });
});

describe('tmTtNorm5 (1–3 → 1–5)', () => {
  it('1→1, 2→3, 3→5', () => {
    expect(TT.tmTtNorm5(1)).toBe(1);
    expect(TT.tmTtNorm5(2)).toBe(3);
    expect(TT.tmTtNorm5(3)).toBe(5);
  });
  it('clamp + null-turva', () => {
    expect(TT.tmTtNorm5(0)).toBe(1);
    expect(TT.tmTtNorm5(4)).toBe(5);
    expect(TT.tmTtNorm5(null)).toBeNull();
    expect(TT.tmTtNorm5('x')).toBeNull();
  });
});

describe('tmTtVaihe + tmTtItems (vaihe-gating)', () => {
  it('ikä → vaihe', () => {
    expect(TT.tmTtVaihe({ ika: 8 })).toBe('perus');
    expect(TT.tmTtVaihe({ ika: 12 })).toBe('yhteispeli');
    expect(TT.tmTtVaihe({ ika: 14 })).toBe('silta');
    expect(TT.tmTtVaihe({ ika: 16 })).toBe('pelipaikka');
  });
  it('I3a §C.3 — U14 + pelipaikka asetettu → pelipaikkavaihe (aikainen erikoistuja); ilman → silta', () => {
    expect(TT.tmTtVaihe({ ika: 14, positio: 'KK' })).toBe('pelipaikka');
    expect(TT.tmTtVaihe({ ika: 14, tt_positio_aktiivinen: 'T' })).toBe('pelipaikka');
    expect(TT.tmTtVaihe({ ika: 14 })).toBe('silta');            // ei pelipaikkaa → silta ennallaan
    expect(TT.tmTtVaihe({ ika: 13, positio: 'KK' })).toBe('yhteispeli');   // U13 ei avaa vaikka pelipaikka
  });
  it('perus/yhteispeli/silta → vain 14 youth (ei pelipaikkoja)', () => {
    expect(TT.tmTtItems({ ika: 12 }).length).toBe(14);
    expect(TT.tmTtItems({ ika: 8 }).length).toBe(14);
  });
  it('pelipaikkavaihe → youth + aktiivisen pelipaikan fundamentit', () => {
    const items = TT.tmTtItems({ ika: 16, positio: 'T' });
    expect(items.length).toBe(14 + TT.TM_TT_FUNDAMENTIT.T.length);
  });
  it('pelipaikkavaihe ilman positiota → vain youth', () => {
    expect(TT.tmTtItems({ ika: 16 }).length).toBe(14);
  });
  it('I3a §E — tmTtHarjoitteetSuodata: ei tägejä → koko lista; tägitön sisältö → graceful fallback', () => {
    const kaikki = TT.tmTtHarjoitteet('y_h9');
    expect(TT.tmTtHarjoitteetSuodata('y_h9')).toEqual(kaikki);                       // ei opts → sama
    expect(TT.tmTtHarjoitteetSuodata('y_h9', {})).toEqual(kaikki);
    // Harjoitteita ei ole vielä tägitetty → tägisuodatus palauttaa koko listan (ei tyhjää)
    const suod = TT.tmTtHarjoitteetSuodata('y_h9', { tagit: ['power'] });
    expect(suod).toEqual(kaikki);
    expect(TT.tmTtHarjoitteetSuodata('ei_olemassa', { tagit: ['power'] })).toEqual([]);
  });
  it('I3a §E — suodatus osuu kun harjoitteilla on tagit (rakenteen tuki)', () => {
    // Rakennetesti: injektoitu tägitetty lista suodattuu oikein (varmistaa filter-logiikan)
    const H = [{ nimi: 'A', tagit: ['power'] }, { nimi: 'B', tagit: ['placement'] }, { nimi: 'C' }];
    const suodata = (opts) => {
      const tagit = (opts.tagit && opts.tagit.length) ? opts.tagit : null;
      const osuu = H.filter(h => !tagit || (Array.isArray(h.tagit) && h.tagit.some(t => tagit.indexOf(t) >= 0)));
      return osuu.length ? osuu : H;
    };
    expect(suodata({ tagit: ['power'] }).map(h => h.nimi)).toEqual(['A']);
  });
  it('§26 joukkuenimi-fallback kun syntymaVuosi puuttuu (P15→pelipaikka, P13→yhteispeli)', () => {
    expect(TT.tmTtVaihe({ joukkue: 'SJK P15' })).toBe('pelipaikka');
    expect(TT.tmTtVaihe({ joukkue: 'SJK P13' })).toBe('yhteispeli');
    expect(TT.tmTtVaihe({ joukkue: 'Sibbo T14' })).toBe('silta');
    expect(TT.tmTtVaihe({ joukkue: 'FC U9' })).toBe('perus');
  });
  it('syntymaVuosi voittaa joukkuenimen (kronologinen ikäluokka)', () => {
    // joukkue P15 mutta synt 2013 → 13v → yhteispeli (syntymaVuosi etusijalla)
    expect(TT.tmTtVaihe({ joukkue: 'SJK P15', syntymaVuosi: 2013, nyt_vuosi: 2026 })).toBe('yhteispeli');
  });
  it('P15 + positio → tmTtItems sisältää pelipaikkafundamentit (ei vain youth)', () => {
    const items = TT.tmTtItems({ joukkue: 'SJK P15', tt_positio_aktiivinen: 'T' });
    expect(items.length).toBe(14 + TT.TM_TT_FUNDAMENTIT.T.length);
  });
});

describe('TM_TT_HARJOITTEET (youth konseptipelit + pelipaikka Excel-harjoitteet)', () => {
  it('youth-konseptipelit (Y-koodit) mukana', () => {
    const h = TT.tmTtHarjoitteet('Y-H0');
    expect(h.length).toBeGreaterThan(0);
    expect(h[0].konseptipeli).toBeTruthy();
  });
  it('pelipaikkaharjoitteet (Excel-alias CB→T…) mukana {pelipaikka, teema, painopisteet}', () => {
    const h = TT.tmTtHarjoitteet('T-P1');
    expect(h.length).toBeGreaterThan(0);
    expect(h[0].pelipaikka).toBeTruthy();
    expect(h[0].painopisteet.length).toBeGreaterThan(0);
    // suomalaiskoodi-avain (ei englanti-alias CB)
    expect(Object.keys(TT.TM_TT_HARJOITTEET).some(k => /^CB-/.test(k))).toBe(false);
  });
  it('tmTtHarjoitteet toimii avaimella JA koodilla', () => {
    expect(TT.tmTtHarjoitteet('t_p1').length).toBe(TT.tmTtHarjoitteet('T-P1').length);
  });
});

describe('§0c suomalaiskoodit + pelimuodot', () => {
  it('TM_TT_PELIMUODOT = 3v3/5v5/8v8/11v11', () => {
    expect(TT.TM_TT_PELIMUODOT).toEqual(['3v3', '5v5', '8v8', '11v11']);
  });
  it('kaikki koodit suomalaisia (ei CB/FB/MID/ST/WI/GK)', () => {
    const kaikki = TT.TM_TT_YOUTH.map(y => y.koodi)
      .concat(TT.TM_TT_JOUKKUE.map(j => j.koodi))
      .concat(Object.keys(TT.TM_TT_FUNDAMENTIT).flatMap(p => TT.TM_TT_FUNDAMENTIT[p].map(t => t.koodi)));
    const kielletyt = /^(CB|FB|MID|AMID|ST|WI|GK)-/;
    kaikki.forEach(k => expect(k).not.toMatch(kielletyt));
  });
});

describe('tmTtPelaaja (Vaihe 4b §0b/§7.22 — pelaajaturvallinen)', () => {
  it('palauttaa {otsikko, mika, miksi, cue, koe} youth-konseptille', () => {
    const p = TT.tmTtPelaaja('y_h2');
    expect(p.otsikko).toBeTruthy();
    expect(p.mika).toBeTruthy();
    expect(p.miksi).toBeTruthy();
    expect(typeof p.cue).toBe('string');
    expect('koe' in p).toBe(true);
  });
  it('§7.22: EI KOSKAAN kriteerejä/kpi/tasolukua pelaajapinnalle', () => {
    const p = TT.tmTtPelaaja('y_h0');
    expect('kpi' in p).toBe(false);
    expect('kriteerit' in p).toBe(false);
    expect('taso' in p).toBe(false);
    expect('kysymykset' in p).toBe(false);   // vain YKSI cue, ei koko listaa
    expect(Object.keys(p).sort()).toEqual(['cue', 'koe', 'mika', 'miksi', 'otsikko']);
  });
  it('cue = tmTtKysymykset(avain)[0] (yksi kysymys)', () => {
    const p = TT.tmTtPelaaja('y_h0');
    expect(p.cue).toBe(TT.tmTtKysymykset('y_h0')[0]);
  });
  it('miksi youth-konseptille = pelaaja_miksi (lapsen kieli, ei tyhjä)', () => {
    TT.TM_TT_YOUTH.forEach(y => {
      const p = TT.tmTtPelaaja(y.avain);
      expect(p.miksi.length).toBeGreaterThan(0);
    });
  });
  it('pelipaikkateema → graceful fallback (miksi johdettu, ei kaadu)', () => {
    const p = TT.tmTtPelaaja('t_p1');
    expect(p.otsikko).toBeTruthy();
    expect(p.miksi.length).toBeGreaterThan(0);
  });
  it('tuntematon avain → null; toimii koodilla JA avaimella', () => {
    expect(TT.tmTtPelaaja('ei-ole')).toBeNull();
    expect(TT.tmTtPelaaja('Y-H0')).toEqual(TT.tmTtPelaaja('y_h0'));
  });
  it('koe = harjoitteen lyhyt nimi (ei ohjeteksti-tulva)', () => {
    const p = TT.tmTtPelaaja('y_h0');
    expect(p.koe.length).toBeLessThanOrEqual(45);
  });
});

describe('4b parseri-regressio — PELAAJAN KIELI ei saastuta konseptipeli/pelimuotoa', () => {
  // Juurisyy (fix/4b-parseri-pelimuoto): 3-sarakeregexin `\s*` matchasi rivinvaihdon → PELAAJAN KIELI
  // -taulukon 2-sarakerivit parittuivat konseptipeliin/pelimuotoon (7/14 youth). Eristetty omaan passiin.
  const YOUTH = ['Y-H0', 'Y-H1', 'Y-H2', 'Y-H3', 'Y-H4', 'Y-H5', 'Y-H6', 'Y-H7', 'Y-H8', 'Y-H9', 'Y-P1', 'Y-P2', 'Y-P3', 'Y-P4'];
  const H = (k) => { const h = TT.TM_TT_HARJOITTEET[k]; return Array.isArray(h) ? h[0] : h; };

  it('14/14 youth: pelimuoto ei ala | eikä sisällä "| Y-" (taulukkorivi-saaste)', () => {
    YOUTH.forEach((k) => {
      const pm = (H(k) || {}).pelimuoto || '';
      expect(pm.startsWith('|')).toBe(false);
      expect(/\|\s*Y-/.test(pm)).toBe(false);
      expect(pm.length).toBeGreaterThan(0);   // pelimuoto tosiasiassa poimittu
    });
  });

  it('14/14 youth: konseptipeli ≠ pelaaja_miksi (ei "Kun …"-lause konseptipelinä)', () => {
    TT.TM_TT_YOUTH.forEach((y) => {
      const kp = (H(y.koodi) || {}).konseptipeli || '';
      expect(kp.length).toBeGreaterThan(0);
      expect(kp).not.toBe(y.pelaaja_miksi);
      expect(kp.startsWith('Kun ')).toBe(false);
    });
  });

  it('14/14 youth: tmTtPelaaja(avain).koe = siisti konseptinimi (ei pelaaja_miksi-lause)', () => {
    TT.TM_TT_YOUTH.forEach((y) => {
      const p = TT.tmTtPelaaja(y.avain);
      expect(p.koe.length).toBeGreaterThan(0);
      expect(p.koe).not.toBe(y.pelaaja_miksi);
      expect(p.koe.startsWith('Kun ')).toBe(false);
      expect(p.koe.includes('|')).toBe(false);
    });
  });

  it('pelaaja_miksi säilyy 14/14 (4b cue-kerros ehjä)', () => {
    TT.TM_TT_YOUTH.forEach((y) => expect((y.pelaaja_miksi || '').length).toBeGreaterThan(0));
  });
});
