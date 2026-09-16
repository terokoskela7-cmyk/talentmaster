/* tm_kaavio_konsepti.js — KAAVION JA KONSEPTIN SIDOS (erä C).
   Kaavio ei omista konseptin tekstiä. `spec` omistaa GEOMETRIAN (pelaajat, liikkeet, selitteet,
   tilanne) ja VIITTAUKSEN konseptiin (`spec.avain` + valinnainen `spec.kpi`); otsikko ja
   KPI-teksti tulevat elävästi kaanon ⊕ seura -resolvoinnista (S1/S2).

   MIKSI: "TalentMasterin totuus ei ole ainoa." Kun seura muokkaa konseptin nimeä S2:lla, muutoksen
   on näyttävä kaavion otsikossa ILMAN että kaaviota kosketaan. Jos nimi kovakoodattaisiin speciin,
   seuran muokkaus ei vuotaisi kuvaan — se rikkoisi kolmikerrosmallin.

   PUHDAS: ei Firestorea, ei DOMia, ei resolvointia, ei kielivalintaa. Kutsuja tekee resolvoinnin
   JA lokalisoinnin omalla mekanismillaan (VP: tmKonseptiResolvoi → _ttKonsepti · Pelaaja: oma
   t()-kerros) ja syöttää valmiin konseptiobjektin tänne. Näin sama sidos palvelee molempia
   pintoja ilman että lib tuntee kumpaakaan — erä D (pelaajapinta) kutsuu näitä samoja funktioita.

   ⚠ KOODIT vs TEKSTIT. `kpiKoodit` luetaan RAA'ASTA resolvoidusta konseptista (koodi on enum,
   sama kaikilla kielillä) ja `kpiTeksti` LOKALISOIDUSTA (teksti on näyttöä). Jos molemmat
   luettaisiin lokalisoidusta, mikään ei rikkoutuisi tänään — mutta validoinnin totuus alkaisi
   riippua kielivalinnasta, mikä on juuri se kytkös jota §32 kieltää. */

function _kaavioKpiLista(konsepti) {
  return (konsepti && Array.isArray(konsepti.kpi)) ? konsepti.kpi : [];
}

/* Konseptin KPI-koodit (enum) → validaattorin ctx.kpiKoodit. Tyhjä lista = konseptilla ei ole
   KPI:itä; se on ERI asia kuin "konseptia ei löytynyt" (null) — kutsujan on erotettava ne,
   muuten puuttuva konsepti näyttäisi siltä että jokainen kpi-tagi on virheellinen. */
function kaavioKpiKoodit(konsepti) {
  return _kaavioKpiLista(konsepti).map(function (x) { return x && x.koodi; })
    .filter(function (k) { return !!k; });
}

/* Näyttötiedot kaaviolle. Palauttaa AINA objektin; puuttuva konsepti → nimi = avain (sama
   fallback-henki kuin aiemmassa spec.nimi-luvussa: mieluummin avain kuin tyhjä otsikko). */
function kaavioKonseptiNaytto(spec, konsepti) {
  var avain = (spec && spec.avain) ? String(spec.avain) : '';
  var kpiKoodi = (spec && spec.kpi) ? String(spec.kpi) : '';
  var lista = _kaavioKpiLista(konsepti);
  var osuma = kpiKoodi ? lista.filter(function (x) { return x && x.koodi === kpiKoodi; })[0] : null;
  return {
    avain: avain,
    nimi: (konsepti && konsepti.nimi) ? konsepti.nimi : avain,
    kpiKoodi: kpiKoodi,
    kpiTeksti: (osuma && osuma.teksti) ? osuma.teksti : '',
    // tosi vain kun kaavio VIITTAA KPI:hin jota konseptilla ei ole — näytöllä tämä on hiljainen
    // (otsikko toimii silti), mutta write-path estää tallennuksen validaattorin kautta.
    kpiTuntematon: !!(kpiKoodi && lista.length && !osuma)
  };
}

var TM_KAAVIO_KONSEPTI = {
  kaavioKpiKoodit: kaavioKpiKoodit,
  kaavioKonseptiNaytto: kaavioKonseptiNaytto
};
if (typeof module !== 'undefined' && module.exports) module.exports = TM_KAAVIO_KONSEPTI;
if (typeof window !== 'undefined') { for (var _kkk in TM_KAAVIO_KONSEPTI) { try { window[_kkk] = TM_KAAVIO_KONSEPTI[_kkk]; } catch (e) {} } }
