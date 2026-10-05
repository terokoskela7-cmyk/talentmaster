/**
 * R6.2b — lib/tm_seuraava_askel.js: tmSeuraavaAskel (10 porrasta + kuorma_tarkista + PHV-rajoite), tmSeuraavaJakso, tmTeeTastaOsa + kääreet (VP/Master).
 * Kanoniset libit oikeina (laskeReviewKadenssi, idpJumissa, tmJfUmpeutunut, tm_phv_tila, tmSiltaEhdota) — ei tynkiä päätöslogiikalle.
 * §7.22: pelaajan/huoltajan pinnat EIVÄT käytä tätä (henkilökunnan päätös); lib ei sisällä käyttäjätekstiä.
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
const SILTA = require('../lib/tm_arviointi_silta.js');
const lue = (f) => readFileSync(join(juuri, f), 'utf8');
const VP = lue('TalentMaster_VP_v25.html'), MA = lue('TalentMaster_Master_v16.html');

const NYT = new Date('2026-10-05T12:00:00Z').getTime();
const PV = 86400000;
const iso = (ms) => new Date(ms).toISOString().slice(0, 10);
const DEPS = { laskeReviewKadenssi: N.laskeReviewKadenssi, idpJumissa: IDP.idpJumissa, jaksoUmpeutunut: JF.tmJfUmpeutunut, phvKuormaTila: PHV.tmPhvKuormaTila, phvKuormaVarovainen: PHV.tmPhvKuormaVarovainen, phvEiMitattu: PHV.tmPhvEiMitattu, siltaEhdota: SILTA.tmSiltaEhdota };
const aja = (p, extra) => L.tmSeuraavaAskel(p, Object.assign({ nyt: NYT, deps: DEPS }, extra || {}));

// Perustapaus: kaikki kunnossa → yllapito. Ikä 16 (ei PHV-ikkunassa), mittaamaton → rajoite null.
function puhdas(lisa) {
  return Object.assign({
    syntymaVuosi: 2010, sukupuoli: 'M', joukkue: 'KPV U16',
    review_viimeisin_pvm: iso(NYT - 5 * PV),
    jaksofokus: { konsepti_nimi: 'Saattaen vaihtaminen', konsepti_avain: 'y_h2', alkoi: iso(NYT - 7 * PV), kesto_vk: 4, domeeni: 'teknis_taktinen' },
    _idpTavoite: { luotu: iso(NYT - 10 * PV), status: 'aktiivinen' },
    idp_sitoumus_pvm: null,
  }, lisa || {});
}
const MYOHASSA = { review_viimeisin_pvm: iso(NYT - 400 * PV) };
const EHDOTUS = { _idpLuonnos: { status: 'ehdotettu' }, _luonnosTallennettu: true };
const SITOUMUS = { idp_sitoumus_pvm: iso(NYT - 3 * PV) };
const UMPEUTUNUT = { jaksofokus: { konsepti_nimi: 'X', konsepti_avain: 'y_h2', alkoi: iso(NYT - 60 * PV), kesto_vk: 4 } };
const EI_JAKSOA = { jaksofokus: null };
const JUMISSA = { _idpTavoite: { luotu: iso(NYT - 200 * PV), status: 'aktiivinen' } };
const VT_VALMIS = { jaksofokus: { konsepti_nimi: 'X', konsepti_avain: 'y_h2', alkoi: iso(NYT - 7 * PV), kesto_vk: 4, valitavoite_idx: 0 }, _idpTavoite: { luotu: iso(NYT - 10 * PV), status: 'aktiivinen', valitavoitteet: [{ nimi: 'Vaihtotavoite', tila: 'saavutettu' }] } };
const HAVAINTO = { arviointi_havaittu: { ball_control: 2, short_passing: 4 } };
const KUORMA = { syntymaVuosi: 2013, jaksofokus: { konsepti_nimi: 'Voima', konsepti_avain: 'fy_voima', domeeni: 'fyysinen', alkoi: iso(NYT - 7 * PV), kesto_vk: 4, ohjelma: { tyyppi: 'perusvoima' } } };

describe('tmSeuraavaAskel — jokaiselle säännölle oma tapaus (aina {avain, peruste})', () => {
  const TAPAUKSET = [
    ['1 review_myohassa', MYOHASSA, 'review_myohassa'], ['2 ehdotus_odottaa', EHDOTUS, 'ehdotus_odottaa'], ['3 sitoumus', SITOUMUS, 'sitoumus'],
    ['4 jakso_umpeutunut', UMPEUTUNUT, 'jakso_umpeutunut'], ['5 ei_jaksofokusta', EI_JAKSOA, 'ei_jaksofokusta'], ['6 idp_jumissa', JUMISSA, 'idp_jumissa'],
    ['7 valitavoite_valmis', VT_VALMIS, 'valitavoite_valmis'], ['8 review_eraantymassa', { review_viimeisin_pvm: iso(NYT - 38 * PV) }, 'review_eraantymassa'],
    ['9 havainto', HAVAINTO, 'havainto'], ['kuorma_tarkista', KUORMA, 'kuorma_tarkista'],
  ];
  it('EI VACUOUS: perustapaus = 10 yllapito (hiljainen), peruste.signaali null', () => {
    const r = aja(puhdas()); expect(r.avain).toBe('yllapito'); expect(r.tila).toBe('hiljainen'); expect(r.peruste).toEqual({ signaali: null });
    expect(aja(puhdas({ signaali: 'xfactor' })).peruste.signaali).toBe('xfactor');
  });
  TAPAUKSET.forEach(([nimi, lisa, avain]) => it(nimi, () => {
    const r = aja(puhdas(lisa)); expect(r.avain).toBe(avain); expect(r.tila).toBe('toimenpide'); expect(r.peruste).toBeTypeOf('object'); expect(r.rajoite).toBeTypeOf('object');
  }));
  it('perusteet: myöhässä ylimaaraPv, erääntymässä eraantyyPvm, havainto konsepti+arvo, välitavoite nimi, ehdotus nappi', () => {
    expect(aja(puhdas(MYOHASSA)).peruste.ylimaaraPv).toBeGreaterThan(0);
    expect(aja(puhdas({ review_viimeisin_pvm: iso(NYT - 38 * PV) })).peruste.eraantyyPvm).toBeTruthy();
    expect(aja(puhdas(HAVAINTO)).peruste).toMatchObject({ arvo: 2, konsepti_avain: expect.any(String) });
    expect(aja(puhdas(VT_VALMIS)).peruste).toMatchObject({ nimi: 'Vaihtotavoite', valitavoite_idx: 0 });
    expect(aja(puhdas(EHDOTUS)).nappi).toBe('tarkista_ehdotus');
  });
  it('rajat: ehdotus joka ei ole tallennettu / ei ehdotettu → ei toimenpide; vahvistettu sitoumus → ei; havainto 3/5 ei laukaise; havainto = käynnissä oleva jakso ei laukaise; välitavoite avoin → ei', () => {
    expect(aja(puhdas({ _idpLuonnos: { status: 'ehdotettu' }, _luonnosTallennettu: false })).avain).toBe('yllapito');
    expect(aja(puhdas({ _idpLuonnos: { status: 'hyvaksytty' }, _luonnosTallennettu: true })).avain).toBe('yllapito');
    expect(aja(puhdas(Object.assign({}, SITOUMUS, { idp_sitoumus_vahv_jakso: puhdas().jaksofokus.alkoi }))).avain).toBe('yllapito');
    expect(aja(puhdas({ arviointi_havaittu: { ball_control: 3 } })).avain).toBe('yllapito');
    const sama = puhdas(HAVAINTO), h = SILTA.tmSiltaEhdota(sama.arviointi_havaittu, {})[0]; sama.jaksofokus.konsepti_avain = h.konsepti_avain;
    expect(aja(sama).avain).toBe('yllapito');
    expect(aja(puhdas({ jaksofokus: Object.assign({}, VT_VALMIS.jaksofokus), _idpTavoite: { valitavoitteet: [{ nimi: 'x', tila: 'avoin' }] } })).avain).toBe('yllapito');
    ['aktiivinen', 'avoin', undefined].forEach((t) => expect(aja(puhdas({ jaksofokus: Object.assign({}, VT_VALMIS.jaksofokus), _idpTavoite: { valitavoitteet: [{ nimi: 'x', tila: t }] } })).avain, String(t)).toBe('yllapito'));   // vain 'saavutettu' on valmis
    expect(aja(puhdas({ jaksofokus: Object.assign({}, VT_VALMIS.jaksofokus, { valitavoite_idx: 3 }), _idpTavoite: VT_VALMIS._idpTavoite })).avain).toBe('yllapito');   // idx osoittaa olematonta → ei
  });
  it('null-pelaaja → null; deterministinen (nyt injektoitu)', () => { expect(L.tmSeuraavaAskel(null)).toBeNull(); expect(aja(puhdas(MYOHASSA), { nyt: NYT })).toEqual(aja(puhdas(MYOHASSA), { nyt: NYT })); });
});

describe('tmSeuraavaAskel — kun kaksi ehtoa täyttyy yhtä aikaa, JÄRJESTYS ratkaisee', () => {
  // [voittaja, häviäjä]-parit portaiden järjestyksestä: 0 kuorma · 1 myöhässä · 2 ehdotus · 3 sitoumus · 4 umpeutunut · 5 ei jaksoa · 6 jumissa · 7 vt valmis · 8 erääntymässä · 9 havainto
  const ERAANTYMASSA = { review_viimeisin_pvm: iso(NYT - 38 * PV) };
  const PARIT = [
    ['kuorma_tarkista', KUORMA, 'review_myohassa', MYOHASSA], ['review_myohassa', MYOHASSA, 'ehdotus_odottaa', EHDOTUS], ['ehdotus_odottaa', EHDOTUS, 'sitoumus', SITOUMUS],
    ['sitoumus', SITOUMUS, 'jakso_umpeutunut', UMPEUTUNUT], ['jakso_umpeutunut', UMPEUTUNUT, 'idp_jumissa', JUMISSA],
    ['ehdotus_odottaa', EHDOTUS, 'idp_jumissa', JUMISSA], ['sitoumus', SITOUMUS, 'idp_jumissa', JUMISSA],
    ['ei_jaksofokusta', EI_JAKSOA, 'idp_jumissa', JUMISSA], ['idp_jumissa', JUMISSA, 'valitavoite_valmis', { _idpTavoite: Object.assign({}, JUMISSA._idpTavoite, VT_VALMIS._idpTavoite), jaksofokus: VT_VALMIS.jaksofokus }],
    ['valitavoite_valmis', VT_VALMIS, 'review_eraantymassa', ERAANTYMASSA], ['idp_jumissa', JUMISSA, 'review_eraantymassa', ERAANTYMASSA],
    ['review_eraantymassa', ERAANTYMASSA, 'havainto', HAVAINTO], ['havainto', HAVAINTO, 'yllapito', { signaali: 'xfactor' }],
  ];
  PARIT.forEach(([v, a, h, b]) => it(`${v} voittaa: ${h}`, () => {
    const yhdessa = aja(puhdas(Object.assign({}, b, a))); expect(yhdessa.avain).toBe(v);
    expect(aja(puhdas(a)).avain).toBe(v);                 // voittaja yksin
    if (h !== 'yllapito') expect(aja(puhdas(b)).avain).toBe(h);   // häviäjä yksin (ei vacuous: ehto todella toimii itsenäisesti)
  }));
  it('myöhässä voittaa KAIKEN paitsi kuorma_tarkistaa (kaikki ehdot yhtä aikaa)', () => {
    const kaikki = puhdas(Object.assign({}, HAVAINTO, JUMISSA, SITOUMUS, EHDOTUS, MYOHASSA));
    expect(aja(kaikki).avain).toBe('review_myohassa');
    expect(aja(Object.assign({}, kaikki, KUORMA)).avain).toBe('kuorma_tarkista');
  });
  it('umpeutunut jakso EI laukaise kuorma_tarkistaa (kuorma koskee käynnissä olevaa jaksoa) → jakso_umpeutunut', () => {
    const k = Object.assign({}, KUORMA, { jaksofokus: Object.assign({}, KUORMA.jaksofokus, { alkoi: iso(NYT - 90 * PV) }) });
    expect(aja(puhdas(k)).avain).toBe('jakso_umpeutunut');
  });
});

describe('PHV = rajoite (rinnalla), askeleeksi vain kuorma_tarkista', () => {
  it('rajoite palautetaan MINKÄ TAHANSA askeleen rinnalla (kaikki 11 avainta)', () => {
    const PH = { syntymaVuosi: 2013, biologinenIka_viimeisin: { phv_tila_koodi: 'PH', pvm: '2026-09-01' } };
    [{}, MYOHASSA, EHDOTUS, SITOUMUS, UMPEUTUNUT, EI_JAKSOA, JUMISSA, VT_VALMIS, { review_viimeisin_pvm: iso(NYT - 38 * PV) }, HAVAINTO].forEach((lisa) => {
      const r = aja(puhdas(Object.assign({}, PH, lisa)));
      expect(r.rajoite, r.avain).toMatchObject({ phv: 'PH', varovainen: true }); expect(r.avain, 'PH yksin ei ole askel').not.toBe('kuorma_tarkista');
    });
  });
  it('tuntematon (mittaamaton ikäikkunassa) = varovaisin: rajoite varovainen + eiMitattu; ikkunan ulkopuolella null', () => {
    const r = aja(puhdas({ syntymaVuosi: 2013 })); expect(r.rajoite).toEqual({ phv: 'tuntematon', varovainen: true, eiMitattu: true });
    expect(aja(puhdas()).rajoite).toEqual({ phv: null, varovainen: false, eiMitattu: false });
  });
  it('mitattu POST ikkunassa → ei varovainen; raskas ohjelma ei laukaise kuorma_tarkistaa', () => {
    const p = puhdas(Object.assign({}, KUORMA, { biologinenIka_viimeisin: { phv_tila_koodi: 'POST', pvm: '2026-09-01' } }));
    expect(aja(p).rajoite.varovainen).toBe(false); expect(aja(p).avain).not.toBe('kuorma_tarkista');
  });
  it('kuorma_tarkista: raskas ohjelma + (PH TAI tuntematon-ikkunassa); kevyt ohjelma / teknis-taktinen jakso / ei ohjelmaa → ei', () => {
    expect(aja(puhdas(KUORMA)).avain).toBe('kuorma_tarkista');   // tuntematon ikkunassa
    expect(aja(puhdas(Object.assign({}, KUORMA, { biologinenIka_viimeisin: { phv_tila_koodi: 'PH', pvm: '2026-09-01' } }))).avain).toBe('kuorma_tarkista');
    const kevyt = Object.assign({}, KUORMA, { jaksofokus: Object.assign({}, KUORMA.jaksofokus, { ohjelma: { tyyppi: 'liikkuvuus' } }) });
    expect(aja(puhdas(kevyt)).avain).not.toBe('kuorma_tarkista');
    expect(aja(puhdas(Object.assign({}, KUORMA, { jaksofokus: Object.assign({}, KUORMA.jaksofokus, { ohjelma: null }) }))).avain).not.toBe('kuorma_tarkista');
    expect(aja(puhdas(Object.assign({}, KUORMA, { jaksofokus: Object.assign({}, KUORMA.jaksofokus, { domeeni: 'teknis_taktinen' }) }))).avain).not.toBe('kuorma_tarkista');
  });
});

describe('tmSeuraavaJakso + tmTeeTastaOsa', () => {
  const ITEMS = [{ avain: 'y_h2' }, { avain: 'y_h3' }];
  const nimi = { y_h2: 'Vaihtaminen', y_h3: 'Pallonhallinta' };
  const deps = (o) => Object.assign({ fyysTeema: (a) => ({ nimi: 'T ' + a }), fyysEhdotus: () => ({ avain: 'fy_voima', nimi: 'Voima' }), siltaKonsepti: (a) => ({ nimi: nimi[a] || a }), siltaEhdota: SILTA.tmSiltaEhdota, sallitut: () => null }, o || {});
  it('ennallaan → sama (teknis + fyysinen); fyysinen muuten → D1-ehdotus (jatka jos sama); ei arviointia → null', () => {
    expect(L.tmSeuraavaJakso({ jaksofokus: {} }, 'y_h2', 'ennallaan', deps())).toEqual({ konsepti_avain: 'y_h2', konsepti_nimi: 'Vaihtaminen', jatka: true });
    expect(L.tmSeuraavaJakso({ jaksofokus: { domeeni: 'fyysinen' } }, 'fy_nopeus', 'ennallaan', deps())).toEqual({ konsepti_avain: 'fy_nopeus', konsepti_nimi: 'T fy_nopeus', jatka: true, fyysinen: true });
    expect(L.tmSeuraavaJakso({ jaksofokus: { domeeni: 'fyysinen' } }, 'fy_nopeus', 'parani', deps())).toEqual({ konsepti_avain: 'fy_voima', konsepti_nimi: 'Voima', fyysinen: true, jatka: false });
    expect(L.tmSeuraavaJakso({ jaksofokus: { domeeni: 'fyysinen' } }, 'fy_voima', 'parani', deps()).jatka).toBe(true);
    expect(L.tmSeuraavaJakso({ jaksofokus: { domeeni: 'fyysinen' } }, 'x', 'parani', deps({ fyysEhdotus: () => null }))).toBeNull();
    expect(L.tmSeuraavaJakso({ jaksofokus: {} }, 'y_h2', 'parani', deps())).toBeNull();
  });
  it('silta: heikoin havaittu ≠ nykyinen; jos vain nykyinen → sama; sallitut rajaa', () => {
    const p = { jaksofokus: {}, arviointi_havaittu: { ball_control: 1, short_passing: 2 } };
    const kaikki = SILTA.tmSiltaEhdota(p.arviointi_havaittu, {}); expect(kaikki.length).toBeGreaterThan(1);
    const r = L.tmSeuraavaJakso(p, kaikki[0].konsepti_avain, 'vaihda', deps()); expect(r.konsepti_avain).not.toBe(kaikki[0].konsepti_avain);
    const vain = { jaksofokus: {}, arviointi_havaittu: { ball_control: 1 } }, h = SILTA.tmSiltaEhdota(vain.arviointi_havaittu, {})[0];
    expect(L.tmSeuraavaJakso(vain, h.konsepti_avain, 'vaihda', deps()).konsepti_avain).toBe(h.konsepti_avain);
    expect(L.tmSeuraavaJakso(p, 'x', 'vaihda', deps({ sallitut: () => ['olematon'] }))).toBeNull();
  });
  it('tmTeeTastaOsa: ≥2 osaa → osa b (1), 1 osa → a (0), tyhjä/puuttuva → 0', () => {
    expect(L.tmTeeTastaOsa({ kpi: [{}, {}] })).toBe(1); expect(L.tmTeeTastaOsa({ kpi: [{}, {}, {}] })).toBe(1); expect(L.tmTeeTastaOsa({ kpi: [{}] })).toBe(0);
    expect(L.tmTeeTastaOsa({ kpi: [] })).toBe(0); expect(L.tmTeeTastaOsa(null)).toBe(0); expect(L.tmTeeTastaOsa({})).toBe(0);
  });
});

describe('kääreet: VP / Master ajavat SAMAN libin; vanha päättely pois', () => {
  function pura(HTML, tunniste) {
    const i = HTML.indexOf(tunniste); expect(i, tunniste).toBeGreaterThan(-1); let d = 0;
    for (let k = HTML.indexOf('{', i); k < HTML.length; k++) { if (HTML[k] === '{') d++; else if (HTML[k] === '}') { d--; if (!d) return HTML.slice(i, k + 1); } }
    throw new Error('sulkeet');
  }
  const ymp = (HTML, nimi) => {
    const c = { window: { TM_SEURAAVA_ASKEL: L, TM_ARVIOINTI_SILTA: SILTA, TM_FYYSTEEMAT_LIB: { tmFyysTeema: (a) => ({ nimi: 'T ' + a }) } }, _vpSiltaKonsepti: (a) => ({ nimi: 'K ' + a }), _msSiltaKonsepti: (a) => ({ nimi: 'K ' + a }),
      _vpFyysEhdotus: () => ({ avain: 'fy_voima', nimi: 'Voima' }), _msFyysEhdotus: () => ({ avain: 'fy_voima', nimi: 'Voima' }), _dimIkaSp: () => ({ ika: 14 }), _devIkaSp: () => ({ ika: 14 }), _vpTtNormPositio: () => null, _ttNormPositio: () => null,
      _ttItems: () => null, _mTtItems: () => null };
    vm.createContext(c); vm.runInContext(pura(HTML, 'function ' + nimi + '(') + ';', c); return c[nimi];
  };
  it('_vpSulkuSeuraava ≡ _msSeuraava kaikilla syötteillä (yksi ydin)', () => {
    const vp = ymp(VP, '_vpSulkuSeuraava'), ms = ymp(MA, '_msSeuraava');
    const P = [{ jaksofokus: {} }, { jaksofokus: { domeeni: 'fyysinen' } }, { jaksofokus: {}, arviointi_havaittu: { ball_control: 1, short_passing: 2 } }, { jaksofokus: { domeeni: 'fyysinen' }, arviointi_havaittu: { ball_control: 1 } }];
    P.forEach((p) => ['ennallaan', 'parani', 'vaihda'].forEach((t) => expect(vp(p, 'y_h2', t)).toEqual(ms(p, 'y_h2', t))));
    expect(vp(P[2], 'y_h2', 'vaihda')).not.toBeNull();   // ei vacuous
  });
  it('lähde: kääreet kutsuvat libiä; vanha päättely (tmSiltaEhdota/tmFyysEhdota-silmukat, nextIdx-ehto, toim()) poistettu; skriptit ladataan', () => {
    expect(pura(VP, 'function _vpSulkuSeuraava(')).toContain('tmSeuraavaJakso('); expect(pura(MA, 'function _msSeuraava(')).toContain('tmSeuraavaJakso(');
    expect(pura(VP, 'function _vpSulkuSeuraava(')).not.toMatch(/\.filter\(function \(e\)|tmSiltaEhdota\(/); expect(pura(MA, 'function _msSeuraava(')).not.toMatch(/\.filter\(function \(e\)|\.tmSiltaEhdota\(p\./);
    expect(VP).not.toMatch(/item\.kpi\.length >= 2\) \? 1 : 0/); expect(VP).toContain('window.TM_SEURAAVA_ASKEL.tmTeeTastaOsa(item)');
    expect(pura(VP, 'window._pdcPaatos = function')).not.toMatch(/laskeReviewKadenssi\(|idpJumissa\(|_rvcSitoumusOdottaa\(|\.status === 'myohassa'/);
    expect(VP).toContain('lib/tm_seuraava_askel.js?v=1'); expect(MA).toContain('lib/tm_seuraava_askel.js?v=1');
  });
  it('_pdcPaatos-kääre: vanhat avaimet + muoto säilyvät, lisäksi askel/peruste/rajoite; uusille portaille oma teksti', () => {
    const c = { window: { TM_SEURAAVA_ASKEL: { tmSeuraavaAskel: (p, o) => L.tmSeuraavaAskel(p, Object.assign({}, o, { deps: DEPS })) } }, vpT: (x) => x, tmPvmFi: (x) => x, _vpSiltaKonsepti: () => null };
    vm.createContext(c); vm.runInContext(pura(VP, 'window._pdcPaatos = function') + ';', c);
    const f = (lisa) => c.window._pdcPaatos(puhdas(lisa), NYT);
    expect(f(MYOHASSA)).toMatchObject({ avain: 'review_myohassa', askel: 'review_myohassa', tila: 'toimenpide', korostus: expect.stringContaining('pv myöhässä') });
    expect(f(EHDOTUS)).toMatchObject({ avain: 'ehdotus_odottaa', nappi: 'tarkista_ehdotus' });
    expect(f({})).toMatchObject({ avain: 'ei_xfactoria', askel: 'yllapito', tila: 'hiljainen' }); expect(f({ signaali: 'xfactor' })).toMatchObject({ avain: 'xfactor', askel: 'yllapito' });
    ['jakso_umpeutunut', 'valitavoite_valmis', 'havainto', 'kuorma_tarkista'].forEach((a, i) => {
      const d = f([UMPEUTUNUT, VT_VALMIS, HAVAINTO, KUORMA][i]); expect(d.avain).toBe(a); expect(d.teksti).toBeTruthy(); expect(d.tila).toBe('toimenpide'); expect(d.rajoite).toBeTypeOf('object');
    });
  });
});

describe('§7.22 — pelaajan/huoltajan pinnat eivät käytä päätöstä; lib ei sisällä käyttäjätekstiä', () => {
  it('Pelaaja/Vanhempi/Fysio-sovellukset eivät lataa eivätkä kutsu tm_seuraava_askel / tmSeuraavaAskel / _pdcPaatos', () => {
    ['TalentMaster_Pelaaja_v7.html', 'TalentMaster_Vanhempi_v2.html'].forEach((f) => { const h = lue(f); expect(h, f).not.toMatch(/tm_seuraava_askel|TM_SEURAAVA_ASKEL|tmSeuraavaAskel|_pdcPaatos|kuorma_tarkista/); });
    expect(VP).toContain('TM_SEURAAVA_ASKEL');   // ei vacuous
  });
  it('lib: ei suomenkielisiä käyttäjäkirjaimia (ä/ö-tekstiliteraaleja) eikä tasolukuja/vertailusanoja merkkijonoliteraaleissa', () => {
    const src = lue('lib/tm_seuraava_askel.js').split('\n').filter((l) => !/^\s*(\/\/|\/\*|\*)/.test(l)).map((l) => l.replace(/\/\/.*$/, '')).join('\n');
    const literaalit = src.match(/'[^'\n]*'/g) || [];
    literaalit.forEach((s) => { expect(s, s).not.toMatch(/[äöÅÄÖ]|\d\/5|taso \d|heikko|huono/i); });
  });
});
