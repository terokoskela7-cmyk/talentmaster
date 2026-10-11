/* PR 3 (korjaus): Mittausaukot YHTEEN korttiin (D150) + taivutus "1 joukkue / N joukkuetta", "1 pelaaja / N pelaajaa" kaikissa uusissa riveissä ja aikajanan "Ei jaksoa" -rivillä. */
import { describe, it, expect } from 'vitest';
import { createRequire } from 'module';
const require = createRequire(import.meta.url);
const TT = require('../lib/tm_vp_tilanne.js'), KK = require('../lib/tm_vp_koti.js'), PU = require('../lib/tm_seuran_pulssi.js'), F = require('./helpers/vp_fixture.cjs');
const NYT = Date.UTC(2026, 9, 10, 12);
const FN = { testijakso: 'te', joukkue: 'jk', auki: 'au', aloitaJaksot: 'aj' };
const teksti = (h) => h.replace(/<[^>]+>/g, ' ').replace(/\s+/g, ' ');
const rakenna = (d, muokkaa, t) => { const s = JSON.parse(JSON.stringify(d.syote)); if (muokkaa) muokkaa(s); s.nytMs = NYT; return TT.tmTilanneHTML(TT.tmTilanneMalli(s), { t: t || ((x) => x), fn: FN }); };
const rivit = (h) => (h.match(/id="tilanne(EiTekniikkaa|EiFyysista|KypsyysMittaamatta)"/g) || []).map((x) => x.slice(11, -1));
const kortti = (h) => { const i = h.indexOf('id="tilanneMittausaukot"'); return i < 0 ? '' : h.slice(i, h.indexOf('id="tilanneEhdotukset"', i)); };

describe('Mittausaukot-kortti: yksi kortti, yksi rivi per aukko, yksi linkki', () => {
  it('pilotti: kolme riviä yhdessä kortissa, linkki vain kerran kortin lopussa; vanhoja erillisiä kortteja ei ole', () => {
    const d = F.lataa('pilotti', NYT), h = rakenna(d), k = kortti(h);
    expect(rivit(h)).toEqual(['EiTekniikkaa', 'EiFyysista', 'KypsyysMittaamatta']);
    expect((h.match(/id="tilanneMittausaukot"/g) || []).length).toBe(1); expect(h).not.toMatch(/tt-tekei|tt-fyyei|tt-kypsyys/);
    expect((k.match(/Suunnittele testijakso/g) || []).length).toBe(1); expect(k.trim().lastIndexOf('Suunnittele testijakso')).toBeGreaterThan(k.lastIndexOf('class="tt-aukko"'));
    expect(teksti(k)).toContain('Mittausaukot');
    for (const id of ['tilanneEiTekniikkaa', 'tilanneEiFyysista', 'tilanneKypsyysMittaamatta']) { const i = k.indexOf('id="' + id + '"'), j = k.indexOf('class="tt-aukko"', i + 10), r = k.slice(i, j > 0 ? j : k.indexOf('class="tt-cta"')); expect((r.match(/class="tt-tg n"/g) || []).length, id).toBeLessThanOrEqual(7); if (/\+\d/.test(r)) expect((r.match(/class="tt-tg n"/g) || []).length).toBe(7); }
  });
  it('vain rivit joissa määrä > 0: nolla-aukot eivät näy; kaikki nollassa → ei korttia; Mittaustilanne-kortin linkki säilyy', () => {
    const d = F.lataa('pilotti', NYT);
    const vainTek = rakenna(d, (s) => { s.fyysinen = s.fyysinen.filter((r) => r.luokka !== 'ei_luokkaa'); s.fyysinenYht = { kypsyysMittaamatta: 0, neutraaleja: 0 }; });
    expect(rivit(vainTek)).toEqual(['EiTekniikkaa']);
    const eiMitaan = rakenna(d, (s) => { s.fyysinen = s.fyysinen.filter((r) => r.luokka !== 'ei_luokkaa'); s.fyysinenYht = { kypsyysMittaamatta: 0, neutraaleja: 0 }; s.tekniikka = s.tekniikka.filter((r) => r.luokka !== 'ei_luokkaa'); });
    expect(eiMitaan).not.toContain('id="tilanneMittausaukot"');
    const mt = eiMitaan.slice(eiMitaan.indexOf('MITTAUSTILANNE') >= 0 ? eiMitaan.indexOf('MITTAUSTILANNE') : eiMitaan.indexOf('Mittaustilanne')); expect(mt).toContain('Suunnittele testijakso');
  });
  it('D150: sama tieto ei toistu — jokainen aukon nimi kortissa kerran, kypsyyslause kerran koko sivulla, ei erillistä "Ei tekniikkadataa" -tekstiä kortin ulkopuolella', () => {
    const h = rakenna(F.lataa('pilotti', NYT)), t = teksti(h);
    for (const nimi of ['Ei tekniikkadataa', 'Ei fyysistä dataa', 'Kypsyys mittaamatta']) expect(t.split(nimi).length - 1, nimi).toBe(1);
    expect(t.split('Fyysisiä tuloksia ei tulkita ennen kypsyyden mittaamista.').length - 1).toBe(1);
    expect(kortti(h)).toContain('Ei tekniikkadataa');
  });
});

/* Taivutus: avainparit '{n} joukkue' / '{n} joukkuetta' ja '{n} pelaaja' / '{n} pelaajaa' — kielikohtainen sanakirja (fi, sv, en) saa kummankin muodon */
const KIELET = {
  fi: { '{n} joukkue': '{n} joukkue', '{n} joukkuetta': '{n} joukkuetta', '{n} pelaaja': '{n} pelaaja', '{n} pelaajaa': '{n} pelaajaa' },
  sv: { '{n} joukkue': '{n} lag', '{n} joukkuetta': '{n} lag', '{n} pelaaja': '{n} spelare', '{n} pelaajaa': '{n} spelare' },   // testisanakirja, EI tuotannon käännös
  en: { '{n} joukkue': '{n} team', '{n} joukkuetta': '{n} teams', '{n} pelaaja': '{n} player', '{n} pelaajaa': '{n} players' }
};
const kielenT = (k) => (x) => (KIELET[k][x] != null ? KIELET[k][x] : x);
describe('Taivutus: 1 / N kaikilla kolmella kielellä', () => {
  const yksi = (s) => { s.fyysinen = s.fyysinen.filter((r) => r.luokka !== 'ei_luokkaa'); s.tekniikka = s.tekniikka.filter((r) => r.luokka !== 'ei_luokkaa'); const e = JSON.parse(JSON.stringify(s.fyysinen[0])); e.luokka = 'ei_luokkaa'; e.nimi = 'P99 Yksi'; e.kypsyysMittaamatta = 1; e.yht = 3; e.mitattu = 0; e.kehityskohteita = 0; s.fyysinen.push(e);
    const x = JSON.parse(JSON.stringify(s.tekniikka[0])); x.luokka = 'ei_luokkaa'; x.nimi = 'P98 Yksi'; x.yht = 3; x.mitattu = 0; x.kehityskohteita = 0; s.tekniikka.push(x); s.fyysinenYht = { kypsyysMittaamatta: 1, neutraaleja: 1 }; };
  for (const kieli of ['fi', 'sv', 'en']) {
    it(kieli + ': 1 → yksikkö, N → monikko (Mittausaukot-rivit)', () => {
      const d = F.lataa('pilotti', NYT), t = kielenT(kieli), y = teksti(rakenna(d, yksi, t)), n = teksti(rakenna(d, null, t)), L = KIELET[kieli];
      const f = (a, v) => a.replace('{n}', v);
      expect(y).toContain('Ei tekniikkadataa · ' + f(L['{n} joukkue'], 1)); expect(y).toContain('Ei fyysistä dataa · ' + f(L['{n} joukkue'], 1)); expect(y).toContain('Kypsyys mittaamatta · ' + f(L['{n} pelaaja'], 1));
      expect(n).toContain('Ei tekniikkadataa · ' + f(L['{n} joukkuetta'], 10)); expect(n).toContain('Kypsyys mittaamatta · ' + f(L['{n} pelaajaa'], d.fyysinen.kypsyysMittaamatta));
      if (kieli === 'fi') { expect(y).not.toMatch(/1 joukkuetta|1 pelaajaa/); }
    });
    it(kieli + ': aikajanan "Ei jaksoa" -rivi (1 joukkue / N joukkuetta)', () => {
      const kypsa = F.lataa('kypsa', NYT), pilotti = F.lataa('pilotti', NYT), t = kielenT(kieli), L = KIELET[kieli];
      const a = teksti(rakenna(kypsa, null, t)), b = teksti(rakenna(pilotti, null, t));
      expect(a).toContain('Ei jaksoa ' + L['{n} joukkue'].replace('{n}', 1)); expect(a).toContain('Ei jaksoa · ' + L['{n} joukkue'].replace('{n}', 1));
      expect(b).toContain('Ei jaksoa ' + L['{n} joukkuetta'].replace('{n}', 14)); expect(b).toContain('Ei jaksoa · ' + L['{n} joukkuetta'].replace('{n}', 14));
    });
  }
});
