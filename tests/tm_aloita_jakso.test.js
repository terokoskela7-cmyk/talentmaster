/**
 * lib/tm_aloita_jakso.js — jaettu "Aloita jakso" -modaali (Master + VP). Fixture: KPV U13 Topias.
 */
import { describe, it, expect } from 'vitest';
import { createRequire } from 'module';
const require = createRequire(import.meta.url);
const AJ = require('../lib/tm_aloita_jakso.js');
const ITEMS = [{ avain: 'y_h2', nimi: 'Saattaen vaihtaminen' }, { avain: 'y_h3', nimi: 'Toinen taito' }];
const CTX = (o) => Object.assign({ items: ITEMS, ika: 13, nimi: 'Topias', vastuuhenkilot: [{ arvo: 'u1|valmentaja', nimi: 'Ville', rooli: 'valmentaja' }] }, o || {});
const T = (s) => s;

describe('tmJaksoNappi', () => {
  it('ei jaksoa → aloita · jakso → muokkaa · valinta odottaa → vahvista', () => {
    expect(AJ.tmJaksoNappi({})).toBe('aloita'); expect(AJ.tmJaksoNappi(null)).toBe('aloita');
    expect(AJ.tmJaksoNappi({ jaksofokus: { konsepti_avain: 'y_h2' } })).toBe('muokkaa');
    expect(AJ.tmJaksoNappi({ jaksofokus: { konsepti_avain: 'y_h2', tila: 'valittavana' }, ydinvahvuus_valinta: { vaihtoehto: 'x' } })).toBe('vahvista');
    expect(AJ.tmJaksoNappi({ jaksofokus: { tila: 'valittavana' } })).toBe('aloita');   // valittavana ilman pelaajan valintaa ≠ vahvista
  });
});
describe('tmAloitaJaksoTiedot', () => {
  it('esivalinta (Arvioinnin "Aloita jakso tästä") voittaa ehdotuksen; ehdotus voittaa listan ensimmäisen; olemassa oleva jakso esitäyttää', () => {
    expect(AJ.tmAloitaJaksoTiedot({}, CTX({ esivalintaAvain: 'y_h3', ehdotusAvain: 'y_h2' })).valittuAvain).toBe('y_h3');
    expect(AJ.tmAloitaJaksoTiedot({}, CTX({ ehdotusAvain: 'y_h3' })).valittuAvain).toBe('y_h3');
    expect(AJ.tmAloitaJaksoTiedot({}, CTX()).valittuAvain).toBe('y_h2');
    const x = AJ.tmAloitaJaksoTiedot({ jaksofokus: { konsepti_avain: 'y_h3', tukiosa: { alue: 'a', perustelu: 'b' }, kesto_vk: 8 } }, CTX());
    expect(x).toMatchObject({ tila: 'muokkaa', valittuAvain: 'y_h3', alue: 'a', perustelu: 'b' }); expect(x.kesto.valittu).toBe(8);
  });
  it('kesto ikävaiheesta (D7): 13 v → 6–8 oletus 6; 10 v → 12; jakson kesto jos sallittu', () => {
    expect(AJ.tmAloitaJaksoTiedot({}, CTX()).kesto).toMatchObject({ vaihtoehdot: [6, 7, 8], valittu: 6 });
    expect(AJ.tmAloitaJaksoTiedot({}, CTX({ ika: 10 })).kesto).toMatchObject({ vaihtoehdot: [12], valittu: 12 });
    expect(AJ.tmAloitaJaksoTiedot({ jaksofokus: { konsepti_avain: 'y_h2', kesto_vk: 4 } }, CTX()).kesto.valittu).toBe(6);   // vanha 4 vk ei ole sallittu → oletus
  });
  it('pelaajan valinta esitäyttää ydinvahvuuden; oma ydinvahvuus voittaa valinnan', () => {
    expect(AJ.tmAloitaJaksoTiedot({ ydinvahvuus_valinta: { vaihtoehto: 'Näkee pelin' } }, CTX()).yv).toBe('Näkee pelin');
    expect(AJ.tmAloitaJaksoTiedot({ ydinvahvuus: { kuvaus: 'Oma' }, ydinvahvuus_valinta: { vaihtoehto: 'Näkee pelin' } }, CTX()).yv).toBe('Oma');
  });
});
describe('tmAloitaJaksoModalHTML', () => {
  const h = (p, o) => AJ.tmAloitaJaksoModalHTML(AJ.tmAloitaJaksoTiedot(p, CTX(o)), { t: T, modalId: 'M', tallennaFn: '_tal', suljeFn: '_sulje', overlayAttrs: 'class="o"' });
  it('otsikko/nappi tilan mukaan; kaikki kuusi kenttää; tallennus kutsuu tallennaFn(pid)', () => {
    const a = h({ id: 'PID' });
    expect(a).toContain('Aloita jakso'); expect(a).not.toContain('Muokkaa jaksoa');
    for (const id of Object.values(AJ.IDS)) expect(a, id).toContain('id="' + id + '"');
    expect(a).toContain("_tal('PID')"); expect(a).toContain('class="o"');
    const m = h({ id: 'PID', jaksofokus: { konsepti_avain: 'y_h2' } }); expect(m).toContain('Muokkaa jaksoa'); expect(m).toContain('Tallenna jakso');
    expect(h({ id: 'PID', jaksofokus: { konsepti_avain: 'y_h2', tila: 'valittavana' }, ydinvahvuus_valinta: { vaihtoehto: 'X' } })).toContain('Vahvista jakso');
  });
  it('vastuuhenkilö-valitsin vain kun vaihtoehdot annettu; escapaa; ei D-koodeja eikä "jaksofokus"-sanaa; ei hex-värejä', () => {
    expect(h({ id: 'P' }, { vastuuhenkilot: null })).not.toContain(AJ.IDS.vh);
    const x = h({ id: 'P', ydinvahvuus_valinta: { vaihtoehto: '<script>' } });
    expect(x).not.toContain('<script>'); expect(x).not.toMatch(/jaksofokus/i); expect(x).not.toMatch(/#[0-9a-f]{3,6}\b/i); expect(x).toContain('Ville');
  });
});
describe('tmAloitaJaksoSyote + tmAloitaJaksoKirjoitus', () => {
  it('syöte luetaan kentistä id:llä', () => {
    const s = AJ.tmAloitaJaksoSyote((id) => ({ _ajTaito: 'y_h2', _ajYv: 'v', _ajAlue: 'a', _ajPer: 'p', _ajKesto: '6', _ajVh: 'u1|vp' })[id]);
    expect(s).toEqual({ konsepti_avain: 'y_h2', ydinvahvuus_kuvaus: 'v', tukiosa_alue: 'a', tukiosa_perustelu: 'p', kesto_vk: '6', vastuuhenkilo_arvo: 'u1|vp' });
  });
  it('YKSI update-olio: jaksofokus + ydinvahvuus (+ vastuuhenkilö, + historia arrayUnionina vain kun rivejä)', () => {
    const v = { jaksofokus: { a: 1 }, historiaLisays: [{ r: 1 }, { r: 2 }] }, tulos = { ydinvahvuus: { kuvaus: 'x' } }, dep = { arrayUnion: (...a) => ({ AU: a }) };
    expect(AJ.tmAloitaJaksoKirjoitus(v, tulos, { uid: 'u1' }, dep)).toEqual({ jaksofokus: { a: 1 }, ydinvahvuus: { kuvaus: 'x' }, vastuuhenkilo: { uid: 'u1' }, jaksofokus_historia: { AU: [{ r: 1 }, { r: 2 }] } });
    expect(Object.keys(AJ.tmAloitaJaksoKirjoitus({ jaksofokus: {}, historiaLisays: [] }, tulos, null, dep))).toEqual(['jaksofokus', 'ydinvahvuus']);
  });
});
