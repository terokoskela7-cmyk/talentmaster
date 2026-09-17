/**
 * TalentMaster™ — VARTIJA: Firebase-UID ei saa koskaan päätyä käyttäjän nimen paikalle.
 *
 * Pilottilöydös (Tero, kuvakaappaus): henkilöstölistan rivi näytti nimenä
 * "pvKJoVywWfTouQQgoxggUmGYDOE2". Syy oli `|| h.id` / `|| p.id` -fallback: seurat/{sid}/
 * kayttajat- ja .../pelaajat-dokumenttien doc-id ON Firebase-UID (§11), joten fallback vuosi
 * teknisen tunnisteen ihmisen nimen paikalle. UID ei ole käyttäjän tietoa vaan järjestelmän
 * avain (§7.22/GDPR) — eikä tyhjäkään kelpaa, koska rivi näyttäisi rikkoutuneelta.
 *
 * Tämä sviitti on LUOKKAVARTIJA, ei yhden rivin korjaus: sama idiomi oli 23 kohdassa kolmessa
 * apissa, ja ilman vartijaa seuraava copy-paste tuo sen takaisin.
 */
import { describe, it, expect } from 'vitest';
import { readFileSync } from 'fs';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';
import vm from 'vm';

const __dir = dirname(fileURLToPath(import.meta.url));
const ROOT = join(__dir, '..');
const APIT = ['TalentMaster_Seura.html', 'TalentMaster_VP_v25.html', 'TalentMaster_Master_v16.html'];
const LUE = (f) => readFileSync(join(ROOT, f), 'utf8');
// Kommentit pois: ne SELITTÄVÄT vanhan idiomin, eivät toteuta sitä.
const koodi = (src) => src.replace(/\/\*[\s\S]*?\*\//g, '').replace(/^\s*\/\/.*$/gm, '');

/* Ainoat sallitut "nimi || id" -kohdat: doc-id on SEURAN tai JOUKKUEEN slug, ei henkilön UID.
   Slug on ihmisluettava ("kpv", "sjk_p14"), joten se on kelpo varanimi. Lisää tähän vain jos
   voit osoittaa ettei kyseinen id ole Firebase-UID. */
const SALLITUT = [
  '.sort((a,b) => (a.nimi || a.id).localeCompare(b.nimi || b.id));'   // Seura.html: seuralista
];

describe('A — henkilön nimi ei putoa doc-id:hen missään apissa', () => {
  const rivit = (f) => koodi(LUE(f)).split('\n').map((l, i) => [i + 1, l]);
  const idFallback = (l) => /\|\|\s*[a-zA-Z_$][\w$]*\.id\b/.test(l);

  // SÄÄNTÖ 1 (yksiselitteinen): jos rivi rakentaa nimen HENKILÖKENTISTÄ ja putoaa doc-id:hen,
  // se vuotaa UID:n. Joukkue-/seurariveillä ei koskaan ole etunimeä.
  for (const f of APIT) {
    it(`${f}: henkilökentistä rakennettu nimi ei putoa doc-id:hen`, () => {
      const osumat = rivit(f).filter(([, l]) => /(etunimi|sukunimi|huoltajaEmail)/.test(l) && idFallback(l));
      expect(osumat.map(([n, l]) => n + ': ' + l.trim()).join('\n')).toBe('');
    });
  }

  // SÄÄNTÖ 2 (kaksitulkintainen `x.nimi || x.id`): tekstistä ei näe onko x henkilö vai joukkue.
  // Sallitaan VAIN joukkue-/seurahaun konventiomuuttujat (j/s/d), joiden doc-id on luettava slug
  // ("kpv", "sjk_p14"). Muu tunniste → pakottaa katsomaan, onko kyseessä henkilö.
  for (const f of APIT) {
    it(`${f}: paljas "nimi || id" vain joukkue-/seurakonteksteissa`, () => {
      const osumat = rivit(f)
        .filter(([, l]) => /\bnimi\b/.test(l) && idFallback(l))
        .filter(([, l]) => !/(etunimi|sukunimi|huoltajaEmail)/.test(l))
        .filter(([, l]) => !/\|\|\s*(j|s|d|a|b)\.id\b/.test(l) && !/\|\|\s*d\.id\b/.test(l));
      expect(osumat.map(([n, l]) => n + ': ' + l.trim()).join('\n')).toBe('');
    });
  }

  it('EI-VACUOUS: vartija nappaisi idiomin jos se palaisi', () => {
    const vale = "const nimi = ((p.etunimi||'') + ' ' + (p.sukunimi||'')).trim() || p.id;";
    expect(/(etunimi|sukunimi|huoltajaEmail)/.test(vale) && idFallback(vale)).toBe(true);
    const vale2 = "nimi: v.nimi || v.id";
    expect(/\bnimi\b/.test(vale2) && idFallback(vale2) && !/\|\|\s*(j|s|d|a|b)\.id\b/.test(vale2)).toBe(true);
  });
});

describe('B — apuri antaa ihmisluettavan tilan, ei UID:ia eikä tyhjää', () => {
  const apuri = (f, nimi) => {
    const src = LUE(f);
    const i = src.indexOf('function ' + nimi + '(');
    expect(i, f + '/' + nimi).toBeGreaterThan(0);
    const sb = { String, Object };
    vm.createContext(sb);
    // Seuran apuri lukee kaksi moduulitason vakiota → ne on ajettava mukana.
    const vakiot = (src.match(/^var HENKILO_[A-Z_]+ = '[^']*';$/gm) || []).join('\n');
    vm.runInContext(vakiot + '\n' + src.slice(i, src.indexOf('\n}', i) + 2) + '\nthis.f = ' + nimi + ';', sb);
    return sb.f;
  };
  for (const [f, nimi] of [['TalentMaster_Seura.html', 'henkiloNimi'],
                           ['TalentMaster_VP_v25.html', '_tmHenkiloNimi'],
                           ['TalentMaster_Master_v16.html', '_tmHenkiloNimi']]) {
    describe(f, () => {
      const g = apuri(f, nimi);
      const UID = 'pvKJoVywWfTouQQgoxggUmGYDOE2';
      it('nimi käytetään kun se on', () => {
        expect(g({ etunimi: 'Topias', sukunimi: 'Koskela', id: UID })).toBe('Topias Koskela');
        expect(g({ nimi: 'Mikko Mäkinen', id: UID })).toBe('Mikko Mäkinen');
      });
      it('nimen puuttuessa SÄHKÖPOSTI, ei UID', () => {
        const ulos = g({ email: 'vp.kpv@example.fi', id: UID });
        expect(ulos).toBe('vp.kpv@example.fi');
        expect(ulos).not.toContain(UID);
      });
      it('KESKENERÄINEN dokumentti → selkeä tila, EI UID eikä tyhjä', () => {
        const ulos = g({ id: UID });
        expect(ulos).not.toContain(UID);
        expect(String(ulos).trim().length).toBeGreaterThan(0);
      });
      it('ei kaadu tyhjään eikä null-arvoon', () => {
        expect(() => g(null)).not.toThrow();
        expect(() => g({})).not.toThrow();
        expect(g({ etunimi: '  ', sukunimi: '  ', id: UID })).not.toContain(UID);
      });
    });
  }
});

describe('C — Seuran henkilöstörivi ei näytä doc-id:tä sähköpostin paikalla', () => {
  const S = LUE('TalentMaster_Seura.html');
  it('sähköpostirivi putoaa placeholderiin, ei h.id:hen', () => {
    expect(S).toContain('${h.email || HENKILO_EI_EMAILIA}');
    expect(koodi(S)).not.toContain('${h.email||h.id}');
  });
  it('nimirivi kulkee apurin läpi', () => {
    expect(S).toContain('${henkiloNimi(h)}');
  });
});
