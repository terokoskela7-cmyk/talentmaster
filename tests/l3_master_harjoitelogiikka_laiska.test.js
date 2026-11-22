/* L3 (docs/KYLMA_AVAUS_DIAGNOOSI.md §4, L4-rivi): Master lataa harjoitelogiikka_v4.js (72 kt gz) vasta tarvittaessa (L2:n lib/tm_laiska_kirjastot.js).
   Root on ainoa totuus (CLAUDE.md §7.25) — tiedostoa EI muuteta, vain Masterin latauskäsittely. Staattiset vartijat; selaintesti: l3_master_harjoitelogiikka_laiska_selain.test.js.
   Characterization-testit (harjoitelogiikka.characterization.test.js) = käytös ennallaan. */
import { describe, it, expect } from 'vitest';
import { readFileSync } from 'fs';
const lue = (f) => readFileSync(new URL('../' + f, import.meta.url), 'utf8');
const HTML = lue('TalentMaster_Master_v16.html');
const TAGI = '<script type="text/plain" data-tm-laiska src="harjoitelogiikka_v4.js"></script>';
// harjoitelogiikka_v4:n globaalit, joita Masterin eager-koodi voisi kutsua (kirjastojen omat paikalliset samannimiset eivät lasketa: ne ovat IIFE-sisäisiä)
const GLOBAALIT = ['valitsePaivanHarjoite', 'laskeTekninenKehityskohde', 'generoiMiksiteksti', 'generoimTehtavat', 'generoimTehtavatV2', 'generoimViikoOhjelma', 'valitseSeuranKetjunHarjoite', 'tmKohdeOtsikko',
  'HARJOITE_I18N', 'HARJOITEPANKKI', 'T_KOHDE_PANKKI', 'T_MESOSYKLI_KOHDE', 'TKI_LAJI_KOHDE', 'MIKSI_LAUSE2', 'KOHDE_OTS_FI', 'EVERTON_LISAYKSET'];

describe('L3 · Master: harjoitelogiikka_v4 text/plain, ei eager', () => {
  it('tagi on text/plain + data-tm-laiska (ei <script src>), kerran, L2-kirjastojen jälkeen ja tm-microcycles ennen (alkuperäinen järjestys)', () => {
    expect(HTML).not.toContain('<script src="harjoitelogiikka_v4.js"></script>');
    expect(HTML.split(TAGI).length - 1).toBe(1);
    const i = HTML.indexOf(TAGI);
    expect(HTML.indexOf('data-tm-laiska src="docs/testit_indeksit.js"')).toBeLessThan(i);
    expect(i).toBeLessThan(HTML.indexOf('data-tm-laiska src="lib/tm-microcycles.js"'));
    expect(HTML.indexOf('lib/tm_laiska_kirjastot.js')).toBeLessThan(i);   // loader ennen laiskoja
  });
  it('portit ennallaan (L3 ei lisää eikä poista porttia: sama lataus-trigger kuin L2:lla)', () => {
    const m = /<script src="lib\/tm_laiska_kirjastot\.js" data-portit="([^"]+)"><\/script>/.exec(HTML);
    expect(m[1].split(',')).toEqual(['setWs!koti', 'openDrill', '_mAvaaPelaajaVanha=true', 'calEventClick', '_avaaD3Arvio', '+avaaKaaviopankki@kaavio', '+_kaavioUusiLomake@kaavio', '+tmKaavioLiitaHavaintoon@kaavio', '+tmPhAvaaValinta@kaavio', 'avaaHarjoitusarviointi', 'avaaValmentajaKehitys', 'avaaCoachProfiili']);
  });
  it('YKSI ajonaikainen kuluttaja: eager-skriptit + Master-inline eivät kutsu harjoitelogiikka-globaaleja paitsi tm_naytto_lohkot.js:n typeof-vartioitu Resepti-lohko (kommentit ja kirjastojen omat nimet sallittu)', () => {
    const eager = [...HTML.matchAll(/<script src="((?:lib\/)?[A-Za-z0-9_.-]+\.js)"/g)].map((m) => m[1]).filter((f) => f !== 'harjoitelogiikka_v4.js');
    const osumat = [];
    [['TalentMaster_Master_v16.html', HTML]].concat(eager.map((f) => [f, lue(f)])).forEach(([f, s]) => {
      s.split('\n').forEach((rivi, i) => GLOBAALIT.forEach((n) => { if (new RegExp('\\b' + n + '\\b').test(rivi)) osumat.push(f + ':' + n + ':' + (i + 1)); }));
    });
    const ajonaikaiset = osumat.filter((o) => { const [f, , r] = o.split(':'); const rivi = (f === 'TalentMaster_Master_v16.html' ? HTML : lue(f)).split('\n')[+r - 1].trim();
      return !(/^(\/\/|\/\*|\*)/.test(rivi) || /^Lähde:|^ *- /.test(rivi)); });
    expect(ajonaikaiset.map((o) => o.split(':').slice(0, 2).join(':')).sort()).toEqual(['lib/tm_naytto_lohkot.js:laskeTekninenKehityskohde', 'lib/tm_naytto_lohkot.js:laskeTekninenKehityskohde', 'lib/tm_naytto_lohkot.js:valitsePaivanHarjoite', 'lib/tm_naytto_lohkot.js:valitsePaivanHarjoite']);
    const nl = lue('lib/tm_naytto_lohkot.js');
    expect(nl).toContain("typeof valitsePaivanHarjoite === 'function' && typeof laskeTekninenKehityskohde === 'function'");   // ei ReferenceErroria ennen latausta
  });
  it('harjoitelogiikka_v4.js ei muutu (root = ainoa totuus, §7.25): src/lib on re-export', () => {
    expect(lue('src/lib/harjoitelogiikka_v4.js')).toContain("require('../../harjoitelogiikka_v4.js')");
  });
});
