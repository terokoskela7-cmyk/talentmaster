/**
 * RAPORTOINNIN SYVENNYS · "Taso ≥3 -osuus" -tiili — RENDERÖINTIVARTIJA.
 *
 * LIVE-BUGI (#588 → korjattu): tiili näytti AINA `kertyy kun mittauksia on`,
 * myös kun Taso-dataa oli. Juurisyy ei ollut laskennassa vaan LUKUKOHDASSA:
 * `_rapRenderInfografiikka` luki `taso3.pct`, mutta `laskeTaso3Osuus()` palauttaa
 * arvon nimellä `osuus_pct` → `taso3.pct` oli aina `undefined` → `arvo` aina
 * `null` → honest-empty -haara renderöityi aina. Väärä tyhjä on pahempi kuin
 * puuttuva tiili: se väittää ettei dataa ole, vaikka on.
 *
 * MIKSI VANHA PORTTI EI NAPANNUT: `vp_raportointi_infografiikka.test.js` ajaa
 * `bulletRivi`:n KOVAKOODATUILLA argumenteilla ja greppaa VP:n funktiorunkoa
 * tekstinä. Kumpikaan ei sido `laskeTaso3Osuus`:n TODELLISTA paluuarvoa tiilen
 * TODELLISEEN lukulausekkeeseen — juuri se sauma petti.
 *
 * TÄMÄN PORTIN IDEA: lauseke luetaan VP:n LÄHTEESTÄ (ei kirjoiteta tähän
 * uudelleen) ja evaluoidaan kanonisen `laskeTaso3Osuus`:n tuloksella, minkä
 * jälkeen aito `TM_INFO.bulletRivi` renderöi tiilen. Jos lähde palautetaan
 * muotoon `.pct`, testi punertuu (ks. MUTAATIO-testi alla).
 */
import { describe, it, expect } from 'vitest';
import { readFileSync } from 'fs';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';
import { createRequire } from 'module';

const __dir = dirname(fileURLToPath(import.meta.url));
const juuri = join(__dir, '..');
const VP = readFileSync(join(juuri, 'TalentMaster_VP_v25.html'), 'utf8');
const require = createRequire(import.meta.url);
const TM_INFO = require('../lib/tm_infografiikka.js');
const { laskeTaso3Osuus } = require('../lib/tm_eerikkila_normit.js');

const TYHJA = 'kertyy kun mittauksia on';

/** Taso-tiilen `arvo:`-lauseke VP:n lähteestä (tiilen oma lukukohta). */
function tasoArvoLauseke() {
  const rivi = VP.split('\n').find(
    (l) => l.includes("vpT('Taso ≥3 -osuus')") && l.includes('bulletRivi'),
  );
  expect(rivi, 'Taso ≥3 -osuus -tiiltä ei löydy VP:stä').toBeTruthy();
  const m = /arvo:\s*(\(taso3[^,]*?:\s*null)\s*,/.exec(rivi);
  expect(m, 'tiilen arvo-lausekkeen muoto muuttui — päivitä vartija').toBeTruthy();
  return m[1];
}

/** Renderöi tiili annetulla lausekkeella ja pelaajajoukolla (aito bulletRivi). */
function renderoiTiili(lauseke, pelaajat) {
  const taso3 = laskeTaso3Osuus(pelaajat);
  // eslint-disable-next-line no-new-func
  const arvo = Function('taso3', 'return ' + lauseke + ';')(taso3);
  return TM_INFO.bulletRivi({
    label: 'Taso ≥3 -osuus', alanimi: 'D1/D2/H-H',
    arvo, viite: 60, yksikko: '%', eroYksikko: ' %-yks.',
  });
}

/* 2/3 arvioidusta on tasolla ≥3 → tunnettu osuus 67 %. Neljäs pelaaja on
   ilman yhtään Taso-kenttää → ei mukana nimittäjässä (ei fabrikointia). */
const JOUKKUE = [
  { joukkue: 'SJK P15', d1_taso: 4 },
  { joukkue: 'SJK P15', tki_viimeisin: 65 },
  { joukkue: 'SJK P14', hh_taso: 2 },
  { joukkue: 'SJK P14' },
];
const ILMAN_DATAA = [{ joukkue: 'SJK P14' }, { joukkue: 'SJK P15' }];

describe('Raportoinnin syvennys · Taso ≥3 -osuus -tiili', () => {
  it('EI VACUOUS: kanoninen laskenta antaa tunnetun osuuden ja bulletRivi osaa renderöidä sen', () => {
    expect(laskeTaso3Osuus(JOUKKUE).osuus_pct).toBe(67);
    expect(TM_INFO.bulletRivi({ label: 'x', arvo: 67, viite: 60, yksikko: '%' })).toContain('67');
  });

  it('POSITIIVINEN: tiili näyttää %-arvon kun Taso-dataa on (ei tyhjätekstiä)', () => {
    const h = renderoiTiili(tasoArvoLauseke(), JOUKKUE);
    expect(h, 'tiili renderöi honest-empty vaikka dataa on → väärä kenttänimi?').not.toContain(TYHJA);
    expect(h).toContain('67');
    expect(h).toContain('%');
    expect(h, 'ero viitetasoon (60) puuttuu').toContain('+7');
  });

  it('REHELLINEN TYHJÄ SÄILYY: ilman Taso-kenttiä sama tiili näyttää tyhjätekstin', () => {
    expect(laskeTaso3Osuus(ILMAN_DATAA).osuus_pct).toBeNull();
    const h = renderoiTiili(tasoArvoLauseke(), ILMAN_DATAA);
    expect(h).toContain(TYHJA);
    // Honest-empty EI saa piirtää nollapalkkia joka näyttäisi mitatulta.
    expect(h).not.toContain('width:0%');
  });

  it('MUTAATIO: `.pct`-muotoinen lauseke renderöi tyhjän → vartija ei ole vacuous', () => {
    const rikki = tasoArvoLauseke().replace(/\.osuus_pct/g, '.pct');
    expect(rikki, 'mutaatio ei muuttanut lauseketta').not.toBe(tasoArvoLauseke());
    const h = renderoiTiili(rikki, JOUKKUE);
    expect(h, 'mutatoitu lauseke EI tuottanut tyhjää → testi ei erota bugia').toContain(TYHJA);
    expect(h).not.toContain('67');
  });

  it('LÄHDELUKKO: tiili lukee `osuus_pct`:ää, eikä VP lue `.pct`:tä jakauma-objekteista', () => {
    expect(tasoArvoLauseke()).toContain('osuus_pct');
    expect(tasoArvoLauseke()).not.toMatch(/taso3\.pct\b/);
    // laskeTaso3Osuus ei koskaan palauta `pct`-nimistä kenttää.
    expect(Object.keys(laskeTaso3Osuus(JOUKKUE))).not.toContain('pct');
  });
});
