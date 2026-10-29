/**
 * 0b-jatko (Tero 19.10. tuotantotesti): sisäinen katselmuslause (reviewit/{pvm}.lause_sisainen) näkyy HENKILÖKUNNAN Historiassa pienellä merkillä "sisäinen", ei pelaaja- eikä perhe-apissa;
 * suljetun jakson aikavälin loppu = todellinen sulkemispäivä. Rules (pelaaja/huoltaja eivät lue reviewit): tests/rules "0b · sisäinen katselmuslause".
 */
import { describe, it, expect } from 'vitest';
import { readFileSync } from 'fs';
import { createRequire } from 'module';
const require = createRequire(import.meta.url);
const HL = require('../lib/tm_historia_lause.js'), PK = require('../lib/tm_kt_polku.js'), VK = require('../lib/tm_viikkokatsaus.js');
const lue = (f) => readFileSync(new URL('../' + f, import.meta.url), 'utf8');
const teksti = (h) => h.replace(/<[^>]*>/g, ' ').replace(/\s+/g, ' ');
// Topiaksen jakso: 6.10.–17.11. (suunniteltu), suljettu 19.10.
const SULJETTU = '2026-10-19T12:00:00.000Z';
const RIVI = (o) => Object.assign({ konsepti_avain: 'y_h1', konsepti_nimi: 'Haltuunotto', alkoi: '2026-10-06', paattyi: '2026-11-17', suljettu: SULJETTU, sulkutapa: 'suljettu' }, o || {});
const REVIEWIT = { '2026-10-19': { kevyt: { nakyi: 'ohjatusti', treeni: 'usein', mukana: 'hyvin' }, lause_sisainen: { teksti: 'Käänsi pään ennen kosketusta.', lahde: 'valmentaja', uid: 'u1', tallennettu: SULJETTU } } };
const historia = (rivi, reviewit) => teksti(PK.tmKtPolkuHTML({ id: 'p1', jaksofokus_historia: [rivi] }, { t: (k) => k, tila: null, nyt: new Date(2026, 9, 20), tanaan: '2026-10-20', reviewit: reviewit ? { tila: 'ok', docs: reviewit } : null }));

describe('lib/tm_historia_lause.js', () => {
  it('sulkupäivä paikallisesta suljettu-aikaleimasta; loppupäivä = todellinen sulkemispäivä kun olemassa, muuten suunniteltu', () => {
    expect(HL.tmHlSulkupvm(RIVI())).toBe('2026-10-19'); expect(HL.tmHlLoppupvm(RIVI())).toBe(SULJETTU); expect(HL.tmHlLoppupvm(RIVI({ suljettu: undefined }))).toBe('2026-11-17');
    expect(HL.tmHlAika(RIVI())).toBe('6.10.–19.10.'); expect(HL.tmHlAika(RIVI({ suljettu: undefined }))).toBe('6.10.–17.11.');
  });
  it('lause: näkyvä (historiarivi) ensin, muuten sisäinen reviewit-dokumentista sulkupäivän mukaan; ei kumpaakaan → null', () => {
    expect(HL.tmHlLause(RIVI({ lause: 'Hyvä!', lause_lahde: 'vp' }), REVIEWIT)).toEqual({ teksti: 'Hyvä!', lahde: 'vp', sisainen: false });
    expect(HL.tmHlLause(RIVI(), REVIEWIT)).toEqual({ teksti: 'Käänsi pään ennen kosketusta.', lahde: 'valmentaja', sisainen: true });
    expect(HL.tmHlLause(RIVI(), {})).toBeNull(); expect(HL.tmHlLause(RIVI(), null)).toBeNull(); expect(HL.tmHlLause(RIVI({ suljettu: '2026-10-25T12:00:00.000Z' }), REVIEWIT)).toBeNull();   // eri päivä → ei väärää lausetta
  });
});

describe('Master/VP jaksohistorian kortti (tmHlKorttiLisa, tmHlSlot)', () => {
  it('korttilisä: aikaväli sulkemispäivään + lause; sisäinen → merkki; ei lausetta → vain aika; slotti: tyhjä sisältö → tyhjä (kutsujan tyhjätila säilyy), muuten [data-hl-slot]', () => {
    const sis = HL.tmHlKorttiLisa(RIVI(), REVIEWIT, { t: (k) => k }); expect(sis).toContain('6.10.–19.10.'); expect(sis).toContain('Käänsi pään ennen kosketusta.'); expect(sis).toContain('data-hl-sisainen');
    const nak = HL.tmHlKorttiLisa(RIVI({ lause: 'Hyvä!' }), REVIEWIT); expect(nak).toContain('Hyvä!'); expect(nak).not.toContain('data-hl-sisainen');
    const ei = HL.tmHlKorttiLisa(RIVI(), {}); expect(ei).toContain('6.10.–19.10.'); expect(ei).not.toContain('data-hl-lause');
    expect(HL.tmHlSlot({ id: 'p1' }, () => '', {})).toBe(''); expect(HL.tmHlSlot({ id: 'p1' }, () => '<b>x</b>', {})).toBe('<b>x</b>');   // Node: ei window → ei kääretta
  });
});

describe('Polku · Historia (henkilökunta)', () => {
  it('sisäinen lause + merkki "sisäinen"; aikaväli päättyy sulkemispäivään 19.10. (ei 17.11.)', () => {
    const t = historia(RIVI(), REVIEWIT);
    expect(t).toContain('6.10.–19.10.'); expect(t).not.toContain('17.11.'); expect(t).toContain('”Käänsi pään ennen kosketusta.”'); expect(t).toContain('sisäinen');
  });
  it('pelaajalle näkyvä lause kuten ennen: ei "sisäinen"-merkkiä; ilman reviewit-dataa ei lausetta', () => {
    const t = historia(RIVI({ lause: 'Hyvä jakso.', lause_lahde: 'valmentaja' }), REVIEWIT); expect(t).toContain('”Hyvä jakso.”'); expect(t).not.toContain('sisäinen');
    expect(historia(RIVI(), null)).not.toContain('”');
  });
  it('vanha rivi ilman suljettu-kenttää: loppu = paattyi', () => { expect(historia(RIVI({ suljettu: undefined }), REVIEWIT)).toContain('6.10.–17.11.'); });
});

describe('sisäinen lause EI pelaaja- eikä perhe-apissa', () => {
  it('pelaajan "Hyvä jakso" -kortti lukee vain historiarivin lauseen → sisäinen (ei riville) ei näy; pelaaja- ja perhe-app eivät lataa reviewit-kokoelmaa eivätkä lib/tm_historia_lause.js:ää', () => {
    const p = { id: 'p1', jaksofokus: null, jaksofokus_historia: [RIVI()] };
    const kortti = VK.tmVkPaatos(p, { tanaan: '2026-10-20' }); expect(JSON.stringify(kortti)).not.toContain('Käänsi pään');
    for (const f of ['TalentMaster_Pelaaja_v7.html', 'TalentMaster_Vanhempi_v2.html']) { const s = lue(f); expect(s, f).not.toMatch(/reviewit|lause_sisainen|tm_historia_lause/); }
    expect(lue('lib/tm_viikkokatsaus.js')).not.toMatch(/lause_sisainen|reviewit/);
  });
  it('henkilökunnan sovellukset lataavat libin; sulkupäivä ja lause samassa komponentissa (Polku, Master, VP)', () => {
    for (const f of ['TalentMaster_Kehitystyopoyta.html', 'TalentMaster_Master_v16.html', 'TalentMaster_VP_v25.html']) expect(lue(f), f).toMatch(/<script src="lib\/tm_historia_lause\.js"><\/script>/);
    expect(lue('TalentMaster_Master_v16.html')).toContain('tmHlSlot'); expect(lue('TalentMaster_VP_v25.html')).toContain('tmHlSlot'); expect(lue('TalentMaster_Master_v16.html')).toContain('tmHlKorttiLisa'); expect(lue('TalentMaster_VP_v25.html')).toContain('tmHlKorttiLisa');
  });
});
