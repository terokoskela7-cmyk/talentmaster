/* Vaihe 1 / PR 1c-2 — CF:n ja selaimen lippu ovat YKSI ja SAMA: functions/sisainen_luku.js lukee lipun jaetusta kopiosta (functions/tm_sisainen.js = lib/tm_sisainen.js), ei omasta vakiosta.
   Tämä testi kaatuu, jos (a) kopio eroaa libistä, (b) CF:n tulkinta lipusta eroaa selaimen RYHMAT-lipuista, (c) CF:lle ilmestyy oma lippuvakio, tai (d) CF-kutsupaikka puuttuu. */
import { describe, it, expect, afterEach } from 'vitest';
import { readFileSync } from 'fs';
import { createRequire } from 'module';
const require = createRequire(import.meta.url);
const lue = (f) => readFileSync(new URL('../' + f, import.meta.url), 'utf8');
const LIB = require('../lib/tm_sisainen.js'), CF = require('../functions/tm_sisainen.js'), LUKU = require('../functions/sisainen_luku.js');
const liput = (S) => ({ henkilokunta: S.RYHMAT.henkilokunta.kirjoitus, jaksofokus_sisainen: S.RYHMAT.jaksofokus_sisainen.kirjoitus });
const S40 = LIB.RYHMAT.s4.kirjoitus;
afterEach(() => { LIB.RYHMAT.s4.kirjoitus = CF.RYHMAT.s4.kirjoitus = S40; LIB.RYHMAT.henkilokunta.kirjoitus = false; LIB.RYHMAT.jaksofokus_sisainen.kirjoitus = false; CF.RYHMAT.henkilokunta.kirjoitus = false; CF.RYHMAT.jaksofokus_sisainen.kirjoitus = false; });

describe('CF:n lippu = selaimen lippu', () => {
  it('(a) functions/tm_sisainen.js on tavu tavulta lib/tm_sisainen.js (+ d3-riippuvuus) ja kuuluu jaettu_lib-manifestiin → liput ovat samat; molemmat POIS (s4 päällä erikseen)', () => {
    expect(lue('functions/tm_sisainen.js')).toBe(lue('lib/tm_sisainen.js')); expect(lue('functions/tm_d3_itsearvio.js')).toBe(lue('lib/tm_d3_itsearvio.js'));
    const M = JSON.parse(lue('functions/jaettu_lib.json')); expect(M.tiedostot).toEqual(expect.arrayContaining(['tm_sisainen.js', 'tm_d3_itsearvio.js']));
    expect(liput(CF)).toEqual(liput(LIB)); expect(liput(LIB)).toEqual({ henkilokunta: false, jaksofokus_sisainen: false }); expect(LUKU.liputPaalla()).toBe(true);   // s4-lippu (oma testinsä) päällä → CF:n yhteinen liputPaalla tosi
  });
  it('(b) CF:n tulkinta seuraa selaimen RYHMAT-lippuja kummassakin ryhmässä: kun lib-lippu käännetään (kopio rakennetaan samasta lähteestä), CF näkee saman', () => {
    const s4 = LIB.RYHMAT.s4.kirjoitus; LIB.RYHMAT.s4.kirjoitus = CF.RYHMAT.s4.kirjoitus = false;   // eristä hk/js-yhdistelmät s4:stä
    for (const [hk, js] of [[true, false], [false, true], [true, true], [false, false]]) {
      LIB.RYHMAT.henkilokunta.kirjoitus = hk; LIB.RYHMAT.jaksofokus_sisainen.kirjoitus = js;
      const odotettu = hk || js;
      expect(LUKU.liputPaalla(LIB.RYHMAT), 'lib-liput ' + hk + '/' + js).toBe(odotettu);   // CF:n funktio libin lipuilla
      CF.RYHMAT.henkilokunta.kirjoitus = hk; CF.RYHMAT.jaksofokus_sisainen.kirjoitus = js; expect(LUKU.liputPaalla(), 'cf-kopion liput').toBe(odotettu);
    }
  });
  it('(b2) RIKKOUTUMISKOE: jos CF-kopion lippu erotetaan libin lipusta, vertailu havaitsee eron (testi kaatuisi)', () => {
    LIB.RYHMAT.henkilokunta.kirjoitus = true; CF.RYHMAT.henkilokunta.kirjoitus = false; expect(liput(CF)).not.toEqual(liput(LIB));
  });
  it('(c) CF:llä ei ole omaa lippuvakiota: sisainen_luku.js ei määrittele kirjoitus-lippua eikä index.js lue ympäristömuuttujaa/vakiota sisainen-lipulle', () => {
    const l = lue('functions/sisainen_luku.js'); expect(l.replace(/\/\*[\s\S]*?\*\//g, '')).not.toMatch(/\bkirjoitus\s*[:=]\s*(true|false)|process\.env|const\s+\w*LIPPU\w*\s*=|HENKILOKUNTA_KIRJOITUS/i);
    expect(lue('functions/index.js')).not.toMatch(/HENKILOKUNTA_KIRJOITUS|SISAINEN_LIPPU|process\.env\.\w*SISAINEN/);
  });
  it('(e) seuran_kooste yhdistää D3-ryhmän AINA (opts.aina) — D3 ei ole lipun takana; lippu pois ei estä', () => {
    expect(lue('functions/seuran_kooste.js')).toMatch(/yhdistaLista\(db, sid, [^\n]*\{ aina: true \}\)/); expect(lue('functions/sisainen_luku.js')).toMatch(/!o\.aina && !liputPaalla/);
  });
  it('(d) kutsupaikat: notifReviewEraantyy (yhdistaLista) ja notifValintaOdottaa (yhdistaYksi); CF ei kirjoita henkilokunta-kenttiä (ei tm_aloita_jakso.tmAloitaJaksoKirjoitus-kutsua functions/-koodissa)', () => {
    const i = lue('functions/index.js'); expect(i).toMatch(/sisainenLuku\.yhdistaLista\(db, sid,/); expect(i).toMatch(/sisainenLuku\.yhdistaYksi\(db, seuraId, pelaajaId,/);
    const src = ['index.js', 'valinta_viesti.js', 'rytmi_notif.js', 'seuran_kooste.js', 'valmennusapuri.js', 'tm_joukkuejakso.js', 'tm_sitoumus.js'];
    src.forEach((f) => expect(lue('functions/' + f), f).not.toMatch(/tmAloitaJaksoKirjoitus|set\(\{[^}]*(review_viimeisin|vastuuhenkilo|scout_potentiaali|tukitarve)/));
  });
});
