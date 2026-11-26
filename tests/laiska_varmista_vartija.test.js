/* Vartija (kiireellinen laiska-normit-korjaus, 26.11.2026): Masterin laiskasti ladattujen kirjastojen (data-tm-laiska) globaaleja EI saa käyttää
   typeof-varapolulla tai suoraan ilman, että samassa (tai ympäröivässä) funktiossa on ENNEN käyttöä `varmista(…)`-kutsu.
   Muuten kirjasto voi olla lataamatta ja tulos on hiljainen nolla/tyhjä ("Olet arvioinut harjoittelua 0 kertaa").
   Analyysi: tests/helpers/laiska_analyysi.mjs (eslint-scope: vain ratkaisemattomat globaalit viittaukset; saman ryhmän kirjastot lasketaan yhdessä ladatuiksi).
   Poikkeukset: SALLITTU-lista alla, avain `tiedosto::funktio`, jokaisella perustelukoodi. Lista saa vain PIENENTYÄ (SALLITTU_MAX; vanhentunut rivi kaataa testin → poista se). */
import { describe, it, expect } from 'vitest';
import { readFileSync } from 'fs';
import { analysoi } from './helpers/laiska_analyysi.mjs';
const JUURI = new URL('..', import.meta.url).pathname;

/* Perustelukoodit */
const PORTTI = 'PORTTI: funktiota kutsutaan vain näkymästä/modaalista, jonka avaus kulkee portin läpi (setWs≠koti, openDrill, _mAvaaPelaajaVanha, calEventClick, _avaaD3Arvio) → ryhmä ladattu ennen ensimmäistä renderiä (jäljitetty kutsuketjusta; selaintesti kattaa kylmäavauksen)';
const KOTI = 'KOTI_VARTIOITU: L2-päätös — Koti/boot-render piirretään tarkoituksella ilman kirjastoja; typeof-vartio + tmLaiska.varmista → _paivitaKaikkiNakymat piirtää uudelleen latauksen jälkeen (data näytetään vain latautuneena, ei oletusarvoa joka näyttäisi todelta)';
const TYNKA = 'TYNKA: nimi on data-portit-tynkä (+nimi) → typeof on aina "function"; tynkä lataa ryhmän ja kutsuu oikeaa';
const SEMANTIIKKA = 'SEMANTIIKKA: puuttuva kirjasto = ei tilaa (esim. ei tallentamattomia kaavioita jos editoria ei ole ladattu)';
const LIB_PORTTI = 'LIB_KULUTTAJA: jaettu lib; Masterissa kutsujat ovat vain PORTTI-näkymiä (ks. yllä), VP/Seura/Kehitystyöpöytä lataavat normit eager-skriptinä';

const SALLITTU = {
  'TalentMaster_Master_v16.html::renderKoti': KOTI,
  'TalentMaster_Master_v16.html::renderKotiV2': KOTI,
  'TalentMaster_Master_v16.html::renderSeason': KOTI,
  'TalentMaster_Master_v16.html::_avaaKausiPelaajat': PORTTI,
  'TalentMaster_Master_v16.html::_avaaPikakorttiIframe': TYNKA,
  'TalentMaster_Master_v16.html::_hkLiita': TYNKA,
  'TalentMaster_Master_v16.html::avaa': TYNKA,
  'TalentMaster_Master_v16.html::tallentamattomia': SEMANTIIKKA,
  'TalentMaster_Master_v16.html::calEventClick': 'PORTTI_ITSE: calEventClick on itse portti (data-portit) → ryhmä ladataan ennen funktion suoritusta',
  'TalentMaster_Master_v16.html::_tallennaD3': 'PORTTI: modaali avataan _avaaD3Arvio-portin kautta',
  'TalentMaster_Master_v16.html::_buildHHDetail': PORTTI,
  'TalentMaster_Master_v16.html::_buildTKIDetail': PORTTI,
  'TalentMaster_Master_v16.html::_buildTSIDetail': PORTTI,
  'TalentMaster_Master_v16.html::_mIdpFmtDelta': PORTTI,
  'TalentMaster_Master_v16.html::fmt': PORTTI,
  'TalentMaster_Master_v16.html::_mPpNimi': PORTTI,
  'TalentMaster_Master_v16.html::_mSelInfo': PORTTI,
  'TalentMaster_Master_v16.html::_mTtKys': PORTTI,
  'TalentMaster_Master_v16.html::_msFyysEhdotus': PORTTI,
  'TalentMaster_Master_v16.html::_msRender': PORTTI,
  'TalentMaster_Master_v16.html::_msSiltaKonsepti': PORTTI,
  'TalentMaster_Master_v16.html::_prRaporttiHTML': PORTTI,
  'TalentMaster_Master_v16.html::_renderPinfo': PORTTI,
  'TalentMaster_Master_v16.html::_ttKorttiHTML': PORTTI,
  'lib/tm_harjoitusarviointi.js::_autoIkavaihe': 'PORTTI: lomake avataan vain avaaHarjoitusarviointi:sta, joka varmistaa normit ennen TM_HARJOITUS.avaa-kutsua; VP lataa normit eager',
  'lib/tm_konsepti_resolve.js::_tmKKaanonLista': LIB_PORTTI,
  'lib/tm_naytto_lohkot.js::_ksTasoFn': LIB_PORTTI,
  'lib/tm_naytto_lohkot.js::harj': LIB_PORTTI,
  'lib/tm_naytto_lohkot.js::items': LIB_PORTTI,
  'lib/tm_naytto_lohkot.js::kys': LIB_PORTTI,
  'lib/tm_naytto_lohkot.js::tmNayttoDevIkaSp': LIB_PORTTI,
  'lib/tm_naytto_lohkot.js::tmNayttoMitaOsattavaHTML': LIB_PORTTI,
  'lib/tm_naytto_lohkot.js::tmNayttoNormPositio': LIB_PORTTI,
  'lib/tm_naytto_lohkot.js::tmNayttoOsat': LIB_PORTTI,
  'lib/tm_naytto_lohkot.js::tmNayttoSelBtn': LIB_PORTTI,
  'lib/tm_normisto.js::_kaytto': LIB_PORTTI,
  'lib/tm_piirros.js::tmPositioNormalisoi': LIB_PORTTI
};
const SALLITTU_MAX = 37;   // saa vain pienentyä

describe('Laiskat kirjastot · varmista-vartija', () => {
  const { loydot, laiskaNimet } = analysoi(JUURI);
  const avaimet = (l) => Array.from(new Set(l.map((x) => x.tiedosto + '::' + x.funktio)));
  const varmistamatta = loydot.filter((x) => !x.varmistettu);

  it('analyysi näkee laiskat kirjastot ja tunnetut kuluttajat (ei tyhjä)', () => {
    expect(laiskaNimet.has('omaKehitysKooste')).toBe(true); expect(laiskaNimet.has('cpdKooste')).toBe(true);
    expect(laiskaNimet.has('laskeValmentajaHarjoitusKooste')).toBe(true); expect(laiskaNimet.has('tmTtItems')).toBe(true);
    expect(loydot.length).toBeGreaterThan(100);
  });
  it('jokainen laiskan kirjaston käyttö ilman edeltävää varmista()-kutsua on sallitulla listalla (muuten: lisää await tmLaiska.varmista() tai perustele)', () => {
    const uudet = avaimet(varmistamatta).filter((k) => !SALLITTU[k]);
    expect(uudet, 'Varmistamaton laiskan kirjaston käyttö (typeof-varapolku tai suora kutsu). Korjaa: await window.tmLaiska.varmista() ennen laskentaa, virheessä näkyvä virhe — älä nollia.').toEqual([]);
  });
  it('sallittu lista ei sisällä vanhentuneita rivejä eikä kasva (saa vain pienentyä)', () => {
    const elossa = new Set(avaimet(varmistamatta));
    expect(Object.keys(SALLITTU).filter((k) => !elossa.has(k)), 'poista korjatut rivit listalta').toEqual([]);
    expect(Object.keys(SALLITTU).length).toBeLessThanOrEqual(SALLITTU_MAX);
  });
  it('korjatut kohdat: avaaValmentajaKehitys + harjoitusarvioinnin tallennus varmistavat normit, ei hiljaisia nollafallbackeja', () => {
    const html = readFileSync(JUURI + 'TalentMaster_Master_v16.html', 'utf8'), ha = readFileSync(JUURI + 'lib/tm_harjoitusarviointi.js', 'utf8');
    expect(avaimet(varmistamatta)).not.toContain('TalentMaster_Master_v16.html::avaaValmentajaKehitys');
    expect(avaimet(varmistamatta)).not.toContain('lib/tm_harjoitusarviointi.js::_haTallenna');
    expect(html).not.toContain("typeof omaKehitysKooste === 'function'"); expect(html).not.toContain("typeof cpdKooste === 'function'");
    expect(html).toContain('varmista: function () { return window.tmLaiska.varmista(); }');
    expect(ha).toContain('_O.varmista');
  });
  it('vartija tunnistaa negatiivitapauksen: typeof-varapolku ilman varmista() → löytö; varmista() ennen → ei löytöä', async () => {
    const { viittaukset } = await import('./helpers/laiska_analyysi.mjs'); const nimet = new Set(['omaKehitysKooste']);
    const huono = viittaukset("function a(x){ return (typeof omaKehitysKooste === 'function') ? omaKehitysKooste(x) : {n_A:0}; }", nimet);
    expect(huono.length).toBe(2); expect(huono.every((x) => !x.varmistettu)).toBe(true);
    const hyva = viittaukset("async function a(x){ await window.tmLaiska.varmista(); return omaKehitysKooste(x); }", nimet);
    expect(hyva.length).toBe(1); expect(hyva[0].varmistettu).toBe(true);
    const paikallinen = viittaukset("function a(omaKehitysKooste){ return omaKehitysKooste(1); }", nimet);
    expect(paikallinen).toEqual([]);   // paikallinen samanniminen muuttuja ei ole globaali viittaus
  });
});
