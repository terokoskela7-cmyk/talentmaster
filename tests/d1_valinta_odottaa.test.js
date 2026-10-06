/**
 * D-1 — tmSeuraavaAskel: uusi avain valinta_odottaa heti review_myohassa:n jälkeen. Ehto: ydinvahvuus_valinta + jaksofokus.tila === 'valittavana'.
 * Peruste: pelaajan nimi (+ vastuuhenkilön nimi jos asetettu). Kanoniset libit oikeina.
 */
import { describe, it, expect } from 'vitest';
import { readFileSync } from 'fs';
import { createRequire } from 'module';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';
import vm from 'vm';

const require = createRequire(import.meta.url);
const juuri = join(dirname(fileURLToPath(import.meta.url)), '..');
const L = require('../lib/tm_seuraava_askel.js');
const N = require('../lib/tm_eerikkila_normit.js');
const IDP = require('../lib/tm_idp.js');
const JF = require('../lib/tm_jaksofokus.js');
const PHV = require('../lib/tm_phv_tila.js');
const VP = readFileSync(join(juuri, 'TalentMaster_VP_v25.html'), 'utf8');

const NYT = new Date('2026-10-05T12:00:00Z').getTime(), PV = 86400000, iso = (ms) => new Date(ms).toISOString().slice(0, 10);
const DEPS = { laskeReviewKadenssi: N.laskeReviewKadenssi, idpJumissa: IDP.idpJumissa, jaksoUmpeutunut: JF.tmJfUmpeutunut, phvKuormaTila: PHV.tmPhvKuormaTila, phvKuormaVarovainen: PHV.tmPhvKuormaVarovainen, phvEiMitattu: PHV.tmPhvEiMitattu };
const aja = (p, extra) => L.tmSeuraavaAskel(p, Object.assign({ nyt: NYT, deps: DEPS }, extra || {}));
const jakso = (tila) => Object.assign({ konsepti_nimi: 'Saattaen vaihtaminen', konsepti_avain: 'y_h2', alkoi: iso(NYT - 7 * PV), kesto_vk: 4, domeeni: 'teknis_taktinen' }, tila ? { tila } : {});
const puhdas = (lisa) => Object.assign({ id: 'm93GBdOaGCUuenMiCL0I', etunimi: 'Topias', syntymaVuosi: 2010, sukupuoli: 'M', joukkue: 'KPV U13', review_viimeisin_pvm: iso(NYT - 5 * PV), jaksofokus: jakso(), _idpTavoite: { luotu: iso(NYT - 10 * PV), status: 'aktiivinen' }, idp_sitoumus_pvm: null }, lisa || {});
const VALINTA = { vaihtoehto: 'saattaen vaihtaminen', valittu_pvm: '2026-10-04' };
const ODOTTAA = (lisa) => puhdas(Object.assign({ ydinvahvuus_valinta: VALINTA, jaksofokus: jakso('valittavana') }, lisa || {}));
const MYOHASSA = { review_viimeisin_pvm: iso(NYT - 400 * PV) };
const EHDOTUS = { _idpLuonnos: { status: 'ehdotettu' }, _luonnosTallennettu: true };
const HENKILOT = [{ id: 'u-valm', nimi: 'Veera Valmentaja' }, { uid: 'u-talval', nimi: 'Taneli Talent' }];

describe('D-1 · valinta_odottaa', () => {
  it('sääntö laukeaa: valinta + tila valittavana → toimenpide, avain valinta_odottaa', () => {
    const r = aja(ODOTTAA()); expect(r.avain).toBe('valinta_odottaa'); expect(r.tila).toBe('toimenpide'); expect(r.peruste.pelaaja_nimi).toBe('Topias');
    expect(r.peruste).toMatchObject({ vastuuhenkilo_uid: null, vastuuhenkilo_rooli: null, vastuuhenkilo_nimi: null }); expect(r.rajoite).toBeTruthy();
  });
  it('EI laukea ilman valintaa tai ilman tilaa valittavana (puuttuva/tyhjä valinta, tila aktiivinen/puuttuu/muu, ei jaksofokusta)', () => {
    const e = (p) => expect(aja(p).avain).not.toBe('valinta_odottaa');
    e(puhdas({ jaksofokus: jakso('valittavana') }));                                   // tila mutta ei valintaa
    e(puhdas({ ydinvahvuus_valinta: null, jaksofokus: jakso('valittavana') })); e(puhdas({ ydinvahvuus_valinta: undefined, jaksofokus: jakso('valittavana') }));
    e(puhdas({ ydinvahvuus_valinta: VALINTA }));                                       // valinta mutta jakso ilman tilaa
    ['aktiivinen', 'suljettu', 'Valittavana', ''].forEach((t) => e(puhdas({ ydinvahvuus_valinta: VALINTA, jaksofokus: jakso(t) })));
    e(puhdas({ ydinvahvuus_valinta: VALINTA, jaksofokus: null }));
    expect(aja(puhdas()).avain).toBe('yllapito');                                      // perustapaus ennallaan
  });
  it('JÄRJESTYS: review_myohassa (ja kuorma_tarkista) voittaa; valinta_odottaa voittaa ehdotus_odottaa, sitoumus, jakso_umpeutunut ym.', () => {
    expect(aja(ODOTTAA(MYOHASSA)).avain).toBe('review_myohassa');
    expect(aja(ODOTTAA(EHDOTUS)).avain).toBe('valinta_odottaa'); expect(aja(ODOTTAA({ idp_sitoumus_pvm: iso(NYT - 3 * PV) })).avain).toBe('valinta_odottaa');
    expect(aja(ODOTTAA({ jaksofokus: Object.assign(jakso('valittavana'), { alkoi: iso(NYT - 60 * PV) }) })).avain).toBe('valinta_odottaa');   // umpeutunut + valittavana
    expect(aja(ODOTTAA({ _idpTavoite: { luotu: iso(NYT - 200 * PV), status: 'aktiivinen' } })).avain).toBe('valinta_odottaa');
    expect(aja(puhdas(Object.assign({}, EHDOTUS, MYOHASSA))).avain).toBe('review_myohassa');
  });
  it('vastuuhenkilö: nimi perusteeseen opts.henkilot-listasta (id tai uid); tuntematon uid → nimi null mutta uid mukana; ilman kenttää ei nimeä; ei mutatoi syötettä', () => {
    const vh = { uid: 'u-valm', rooli: 'apuvalmentaja', asetettu_pvm: '2026-10-05' }, p = ODOTTAA({ vastuuhenkilo: vh }), kopio = JSON.parse(JSON.stringify(p));
    expect(aja(p, { henkilot: HENKILOT }).peruste).toMatchObject({ vastuuhenkilo_uid: 'u-valm', vastuuhenkilo_rooli: 'apuvalmentaja', vastuuhenkilo_nimi: 'Veera Valmentaja' });
    expect(aja(ODOTTAA({ vastuuhenkilo: { uid: 'u-talval', rooli: 'talenttivalmentaja' } }), { henkilot: HENKILOT }).peruste.vastuuhenkilo_nimi).toBe('Taneli Talent');
    expect(aja(p, { henkilot: [] }).peruste).toMatchObject({ vastuuhenkilo_uid: 'u-valm', vastuuhenkilo_nimi: null }); expect(aja(p).peruste.vastuuhenkilo_nimi).toBeNull();
    expect(aja(ODOTTAA(), { henkilot: HENKILOT }).peruste.vastuuhenkilo_uid).toBeNull(); expect(p).toEqual(kopio);
  });
  it('VP-kääre: teksti "[nimi] valitsi ydinvahvuutensa, vahvista jakso." + vastuuhenkilö jos asetettu; ei nappia; vanhat avaimet ennallaan', () => {
    const c = { window: { TM_SEURAAVA_ASKEL: { tmSeuraavaAskel: (p, o) => L.tmSeuraavaAskel(p, Object.assign({}, o, { deps: DEPS, henkilot: HENKILOT })) } }, vpT: (x) => x, tmPvmFi: (x) => x };
    vm.createContext(c);
    const i = VP.indexOf('window._pdcPaatos = function'); let d = 0, k = VP.indexOf('{', i); for (; k < VP.length; k++) { if (VP[k] === '{') d++; else if (VP[k] === '}' && !--d) break; }
    vm.runInContext(VP.slice(i, k + 1) + ';', c);
    const f = (p) => c.window._pdcPaatos(p, NYT);
    const a = f(ODOTTAA()); expect(a).toMatchObject({ avain: 'valinta_odottaa', askel: 'valinta_odottaa', tila: 'toimenpide', teksti: 'Topias valitsi ydinvahvuutensa,', korostus: 'vahvista jakso.' }); expect(a.nappi).toBeUndefined();
    expect(f(ODOTTAA({ vastuuhenkilo: { uid: 'u-valm', rooli: 'valmentaja' } })).korostus).toBe('vahvista jakso. Vastuuhenkilö: Veera Valmentaja');
    expect(f(ODOTTAA({ etunimi: undefined })).teksti).toBe('valitsi ydinvahvuutensa,');
    expect(f(ODOTTAA(MYOHASSA)).avain).toBe('review_myohassa'); expect(f(puhdas())).toMatchObject({ avain: 'ei_xfactoria' });
  });
  it('§7.22 / GDPR: perusteen avaimet neutraaleja (ei heikkous/rajoite/kriittinen/ase-segmenttiä); lib ei sisällä käyttäjätekstiä; Pelaaja/Vanhempi eivät käytä libiä', () => {
    const M = require('../lib/tm_jakso_malli.js'); expect(M.tmTarkistaJaksoData(aja(ODOTTAA({ vastuuhenkilo: { uid: 'u-valm', rooli: 'valmentaja' } }), { henkilot: HENKILOT }).peruste)).toEqual([]);
    ['TalentMaster_Pelaaja_v7.html', 'TalentMaster_Vanhempi_v2.html'].forEach((f) => expect(readFileSync(join(juuri, f), 'utf8'), f).not.toMatch(/tm_seuraava_askel|valinta_odottaa/));
  });
});
