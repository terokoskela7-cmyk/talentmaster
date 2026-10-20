#!/usr/bin/env node
/* Gemini-erä 80 (K1d: sanasto — Kehityssuunnitelma · Jakson yhteenveto · Kehityskeskustelu · Pelaajaraportti · Seuran tilannekuva; yhteenvetorytmin ilmoituskortti; ⓘ-selitteet; pelaajan Minä).
   Code EI kirjoita ruotsia (CLAUDE.md §0): sv jää tyhjäksi, Gemini täyttää. Rivit joiden fi MUUTTUI ja joilla on vanha sv: `sv_nyt` = nykyinen (vanhan termin mukainen) käännös, KORVATTAVA — koodissa se säilyy kunnes erä viedään.
   Osiot: (1) lib.* — libien FI-avaimet (uudet + sanastomuutoksen takia muuttuneet) · (2) lib_adar_nimet — ADAR D henkilökunnalle "Päätöksenteko" · (3) vp_kartta / master_kartta / yhteiset_kartta — fi-avaimiset rivit (avain = suomenkielinen teksti).
   fi luetaan suoraan libeistä ja kartoista; muuttuneiden fi-rivien lista: tests/fixtures/k1d_fi_korvaukset.json. Idempotentti: jo täytetty sv säilyy.
   Ajo: node scripts/i18n_luo_gemini_era80.mjs [--tiedosto=docs/i18n/sv_kaannoserae_80_gemini.json] */
import { readFileSync, writeFileSync } from 'fs';
import { createRequire } from 'module';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';
const require = createRequire(import.meta.url);
const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..');
const arg = (n, d) => { const a = process.argv.find((x) => x.startsWith('--' + n + '=')); return a ? a.slice(n.length + 3) : d; };
const OUT = join(ROOT, arg('tiedosto', 'docs/i18n/sv_kaannoserae_80_gemini.json'));
const _log = console.log; console.log = (...a) => { if (!String(a[0]).startsWith('[TM Lang]') && !String(a[0]).startsWith('[tm-')) _log(...a); };
const LIBSV = require('../lib/tm_lib_i18n.js').TM_LIB_I18N.sv, VPSV = require('../lib/tm_vp_i18n.js').TM_VP_I18N.sv, MASV = require('../lib/tm_master_i18n.js').TM_MASTER_I18N.sv, COSV = require('../lib/tm_i18n_common.js').TM_I18N_COMMON.sv;
const KORV = JSON.parse(readFileSync(join(ROOT, 'tests/fixtures/k1d_fi_korvaukset.json'), 'utf8'));

const SANASTO = 'SANASTO (Teron päätös 20.10.2026; yksi sv-termistö kaikkialle): Kehityssuunnitelma = pelaajan kauden tavoite + sen alla etenevät 6 viikon jaksot (ei "IDP" käyttäjälle) · Jakson yhteenveto = jakson lopussa tehtävä yhteenveto: 3 kysymystä + lause + seuraava jakso (toiminto "Tee jakson yhteenveto"; korvaa "katselmus", "jakson arviointi" ja napin "Sulje jakso") · Kehityskeskustelu = laajempi keskustelu pelaajan (ja huoltajan) kanssa, yleensä VP:n kanssa (korvaa "review", "MDT", "Syvennä", "täysi katselmus") · Pelaajaraportti = dokumentti pelaajalle ja perheelle · Seuran tilannekuva = VP:n seuratason koosteet (korvaa "raportointi") · Yhteenvetoikkuna = joukkuejakson jälkeinen aika, jona jakson yhteenvedot tehdään (korvaa "katselmusikkuna"). "Jakson yhteenveto tai kehityskeskustelu" muodostaa yhteenvetorytmin (eräpäivä 42 tai 84 päivän välein). Termistö: docs/i18n/termisto.fi-sv.json.';
const HENK = 'HENKILÖKUNTA (valmentaja ja VP): ';
const OSIOT = {
  'lib.tm_tanaan_signaali': {
    lahde: 'lib/tm_tanaan_signaali.js (FI-avaimet ts_rytmi_*, ts_miksi_*, + muuttuneet ts_suljettava_myohassa, ts_sulje_nappi, ts_askel_review_eraantymassa)', tiedosto: '../lib/tm_tanaan_signaali.js',
    konteksti: HENK + 'Tänään-välilehden "Seuraava askel" -kortti. Yhteenvetorytmi-ilmoitus: otsikko kertoo viimeisen päivän, selitysrivi päivät edellisestä yhteenvedosta tai keskustelusta ja rytmin (42/84 pv ikäryhmän mukaan), jaksorivi jakson päättymispäivän; napit "Tee jakson yhteenveto" ja "Kirjaa kehityskeskustelu". "Miksi näen tämän?" avaa yhden lauseen säännöstä joka nosti askeleen. Sävy: selkeä, ei painostava. ' + SANASTO,
    avaimet: {
      ts_rytmi_otsikko: 'Kortin otsikko. {pvm} = päivämäärä (esim. 3.11.). Säilytä {pvm} täsmälleen.', ts_rytmi_otsikko_myohassa: 'Kortin otsikko kun myöhässä. {n} = päiviä. Säilytä {n}.',
      ts_rytmi_selitys: 'Selitysrivi. {n} = päiviä edellisestä, {ika} = pelaajan ikä vuosina, {vali} = 42 tai 84. Säilytä muuttujat. Esim. "13-vuotiaalle 42 päivän välein".', ts_rytmi_selitys_ilman_ikaa: 'Sama ilman ikää. Säilytä {n} ja {vali}.',
      ts_rytmi_jakso: 'Jaksorivi. {pvm} esiintyy kahdesti, säilytä molemmat.', ts_rytmi_yhteenveto_nappi: 'Täytetty nappi. Toimintokehote, ei pistettä.', ts_rytmi_keskustelu_nappi: 'Toissijainen nappi. Toimintokehote, ei pistettä.',
      ts_miksi_otsikko: 'Avautuvan rivin otsikko (kysymys).', ts_miksi_kuorma_tarkista: 'Yksi lause: miksi kortti on näkyvissä. PHV = kasvupyrähdys.', ts_miksi_review_myohassa: 'Yksi lause. Muuttujat {n}, {ika}, {vali}, {pvm} säilytetään.', ts_miksi_review_eraantymassa: 'Yksi lause. Muuttujat {n}, {ika}, {vali}, {pvm} säilytetään.',
      ts_miksi_valinta_odottaa: 'Yksi lause. {nimi} = pelaajan etunimi, säilytä.', ts_miksi_valinta_pelaajalla: 'Yksi lause.', ts_miksi_ehdotus_odottaa: 'Yksi lause.', ts_miksi_sitoumus: 'Yksi lause. "Sitoumus" = pelaajan sitoumus jaksoon (sama termi kuin muualla).', ts_miksi_sitoumus_odottaa: 'Yksi lause.',
      ts_miksi_jakso_umpeutunut: 'Yksi lause.', ts_miksi_ei_jaksofokusta: 'Yksi lause.', ts_miksi_idp_jumissa: 'Yksi lause. "Kauden tavoite" = kehityssuunnitelman tavoite.', ts_miksi_valitavoite_valmis: 'Yksi lause.', ts_miksi_havainto: 'Yksi lause. {pv} ja {rytmi} = päiviä, säilytä.', ts_miksi_yllapito: 'Yksi lause.', ts_miksi_vk: 'Yksi lause.', ts_miksi_tauko: 'Yksi lause.',
      ts_suljettava_myohassa: 'Kortin lisärivi kun jakson yhteenveto on myöhässä (pieni kirjain, ei pistettä).', ts_sulje_nappi: 'Nappi: "Tee jakson yhteenveto" + " · 3 kysymystä" (säilytä erotin ja kolme kysymystä).', ts_askel_review_eraantymassa: 'Lyhyt tilarivi (varateksti).'
    }
  },
  'lib.tm_kt_polku': {
    lahde: 'lib/tm_kt_polku.js (FI-avaimet ktp_otsikko, ktp_h_yhteenveto, ktp_rytmi_*, + muuttuneet ktp_arviointi, ktp_paattynyt, ktp_sulje_jakso)', tiedosto: '../lib/tm_kt_polku.js',
    konteksti: HENK + 'Kehitystyöpöytä, Polku-välilehti: otsikko "Kehityssuunnitelma", rivi yhteenvetorytmistä Kauden yläpuolella, jaksokortin "Jakson yhteenveto {pvm}" ja Historian "yhteenveto tehty". ' + SANASTO,
    avaimet: {
      ktp_otsikko: 'Polun yläotsikko (versaaleilla CSS:llä), ⓘ-selite perässä. Lyhyt, ei pistettä.', ktp_h_yhteenveto: 'Pieni merkki Historian suljetun jakson rivillä (pieni kirjain, ei pistettä).',
      ktp_rytmi_ajan_tasalla: 'Rivi Kauden yläpuolella. {pvm} = päivä, säilytä.', ktp_rytmi_seuraava: 'Rivi Kauden yläpuolella. {pvm} säilytetään.', ktp_rytmi_myohassa: 'Rivi kun myöhässä. {n} = päiviä, {pvm} = eräpäivä, säilytä molemmat.',
      ktp_arviointi: 'Jaksokortin rivi: jakson päättymispäivä. {pvm} säilytetään. Suomeksi "Jakson yhteenveto 30.11.".', ktp_paattynyt: 'Jakson ikämerkki kun jakso on päättynyt eikä yhteenvetoa ole tehty (pieni kirjain).', ktp_sulje_jakso: 'Nappi, toimintokehote, ei pistettä.'
    }
  },
  'lib.tm_kevyt_katselmus': {
    lahde: 'lib/tm_kevyt_katselmus.js (muuttuneet FI-avaimet kk_otsikko, kk_sulje_laheta, kk_syvenna)', tiedosto: '../lib/tm_kevyt_katselmus.js',
    konteksti: HENK + 'Jakson yhteenveto -ikkuna (aiemmin "Sulje jakso"): ikkunan otsikko, päänappi ja toinen nappi "Kehityskeskustelu" (avaa laajemman lomakkeen). ' + SANASTO,
    avaimet: { kk_otsikko: 'Ikkunan otsikko ja päänappi: "Tee jakson yhteenveto" (perässä koodissa " · {jakson aihe} · {kesto} vk").', kk_sulje_laheta: 'Päänappi kun pelaajalle lähetetään viesti: "Tee jakson yhteenveto ja lähetä".', kk_syvenna: 'Toinen nappi: laajempi keskustelu/lomake. Suomeksi "Kehityskeskustelu".' }
  },
  'lib.tm_kehitystyopoyta': {
    lahde: 'lib/tm_kehitystyopoyta.js (muuttuneet FI-avaimet kt_osat, kt_katselmus, kt_v_blokit)', tiedosto: '../lib/tm_kehitystyopoyta.js',
    konteksti: HENK + 'Kehitystyöpöytä (Master, VP, uusi sivu). kt_osat = jakson ydinasioiden lista -otsikko (aiemmin "Osat", nyt "Ydinasiat"); kt_katselmus = jaksokortin rivi "vk 1/6 · Jakson yhteenveto 30.11."; kt_v_blokit = kehityssuunnitelman osien tilarivi. ' + SANASTO,
    avaimet: { kt_osat: 'Listan yläotsikko (versaaleilla CSS:llä), ei pistettä. "Ydinasiat" = jakson ydinasiat (sama termi kuin Pelaajan "ydinasiat").', kt_katselmus: 'Rivin etuliite jakson päättymispäivän edessä: "Jakson yhteenveto 30.11." (suomeksi isolla alkukirjaimella).', kt_v_blokit: 'Tilarivi: "{n}/{yht} Kehityssuunnitelman osat tehty".' }
  },
  'lib.tm_reitin_valinta': {
    lahde: 'lib/tm_reitin_valinta.js (muuttunut FI-avain k3_sulje_tarjoa)', tiedosto: '../lib/tm_reitin_valinta.js',
    konteksti: HENK + 'Jakson yhteenveto -ikkunan osio "Anna pelaajan valita seuraava reitti": valintalistan nappiteksti. ' + SANASTO,
    avaimet: { k3_sulje_tarjoa: 'Nappi: "Tee jakson yhteenveto ja tarjoa valinta". Toimintokehote, ei pistettä.' }
  },
  'lib.tm_sanasto': {
    lahde: 'lib/tm_sanasto.js (muuttunut FI-avain sn_jakson_arviointi)', tiedosto: '../lib/tm_sanasto.js',
    konteksti: HENK + 'Uuden kehitystyöpöydän arkisanasto. sn_jakson_arviointi = jaksokortin rivin etuliite (aiemmin "Jakson arviointi", nyt "Jakson yhteenveto"). ' + SANASTO,
    avaimet: { sn_jakson_arviointi: 'Etuliite jakson päättymispäivän edessä. Sama käännös kuin ts_rytmi_yhteenveto_nappi:n jakson yhteenveto -termi.' }
  },
  'lib.tm_viikkokatsaus': {
    lahde: 'lib/tm_viikkokatsaus.js (muuttunut FI-avain k4_ohje)', tiedosto: '../lib/tm_viikkokatsaus.js',
    konteksti: 'PELAAJA (U8–U19): Viikkokatsaus-kortin ohjelause pelaajalle. Sävy: rauhallinen, lapsen kieli, ei lukuja, ei vertailua. ' + SANASTO,
    avaimet: { k4_ohje: 'Yksi lause pelaajalle: vastaus näkyy valmentajalle jakson yhteenvedossa. Puhuttelu sinuttelu.' }
  },
  'lib.tm_tanaan_kentta': {
    lahde: 'lib/tm_tanaan_kentta.js (FI-avaimet k1_kauden_tavoite_rivi, k1_nyt_harjoittelet_rivi, k1_nyt_harjoittelet)', tiedosto: '../lib/tm_tanaan_kentta.js',
    konteksti: 'PELAAJA (U8–U19): Minä-sivu, "Sinun matka" -osio jaettu kahteen lohkoon: "Kauden tavoite: {nimi}" ja "Nyt harjoittelet: {nimi}" (jakson aihe + tämän viikon fokus). Sävy: rauhallinen, ei lukuja, ei vertailua; sinuttelu. Sama käsite kuin k1_talla_harjoittelet ("Tällä viikolla harjoittelet: {nimi}").',
    avaimet: { k1_kauden_tavoite_rivi: 'Otsikkorivi. {nimi} = kauden tavoitteen nimi, säilytä täsmälleen. Ei pistettä.', k1_nyt_harjoittelet_rivi: 'Alarivi. {nimi} = jakson aihe, säilytä täsmälleen. Ei pistettä.', k1_nyt_harjoittelet: 'Kortin yläotsikko (versaaleilla CSS:llä): "Nyt harjoittelet". Ei pistettä.' }
  },
  'lib.tm_adar_tekstit': {
    lahde: 'lib/tm_adar_tekstit.js (muuttuneet FI-avaimet adar_partitiivi_r, adar_R_tip2)', tiedosto: '../lib/tm_adar_tekstit.js',
    konteksti: HENK + 'ADAR-pikakortti: R (Reaction) = "Reagointi" (miten pelaaja reagoi tilanteen/virheen jälkeen; ennen "Palautuminen", Teron päätös 20.10.2026). adar_partitiivi_r = R:n partitiivimuoto lauseessa ("… reagointia"), adar_R_tip2 = valmentajan vinkki. Fyysinen palautuminen (lepo, kuntoutus) on eri asia eikä muutu. ' + SANASTO,
    avaimet: { adar_partitiivi_r: 'R:n partitiivi lauseen sisällä, pieni kirjain, ei pistettä ("reagointia").', adar_R_tip2: 'Valmentajan vinkki: sovitaan yhteinen reagointitapa virheen jälkeen (esim. taputus ja seuraava tehtävä). Yksi lause.' }
  },
  'lib.tm_sanasto_info': {
    lahde: 'lib/tm_sanasto_info.js (kaikki FI-avaimet si_*, ke_*)', tiedosto: '../lib/tm_sanasto_info.js',
    konteksti: HENK + 'Sanasto näkyviin: ⓘ-nappi termin vieressä avaa 1–2 lauseen selitteen ("Lue lisää" avaa "Miten kehitys etenee" -ruudun: yksi kaavio + lyhyt teksti kierrosta). si_n_* = termin nimi (käytetään napin aria-labelissa "Mikä on {termi}?"). Sävy: selkeä, ammattimainen, ei jargonia. ' + SANASTO,
    avaimet: {
      si_n_kehityssuunnitelma: 'Termin nimi.', si_n_jakson_yhteenveto: 'Termin nimi.', si_n_kehityskeskustelu: 'Termin nimi.', si_n_pelaajaraportti: 'Termin nimi.', si_n_tilannekuva: 'Termin nimi: "Seuran tilannekuva".',
      si_kehityssuunnitelma: 'Selite, 1 lause.', si_jakson_yhteenveto: 'Selite, 2 lausetta. "Yhteenvetorytmi" = jakson yhteenveto tai kehityskeskustelu viimeistään 42/84 päivän välein.', si_kehityskeskustelu: 'Selite, 1 lause. Yleensä VP:n kanssa.', si_pelaajaraportti: 'Selite, 1 lause ("jonka voit näyttää tai antaa pelaajalle ja perheelle").', si_tilannekuva: 'Selite, 1 lause.',
      si_aria: 'Napin aria-label. {termi} = termin nimi, säilytä. Kysymys.', si_lue_lisaa: 'Linkki, ei pistettä.', si_sulje: 'Sulje-napin aria-label.',
      ke_otsikko: 'Ruudun otsikko.', ke_ingressi: 'Ingressi, 1 lause.', ke_d_suunnitelma: 'Kaavion laatikko: otsikko.', ke_d_suunnitelma_alla: 'Kaavion laatikko: alarivi (pieni kirjain).', ke_d_jakso: 'Kaavion laatikko: otsikko (6 vk = 6 viikkoa).', ke_d_jakso_alla: 'Alarivi: aihe · ydinasiat · viikon fokus (säilytä erottimet · ).', ke_d_yhteenveto: 'Kaavion laatikko.', ke_d_yhteenveto_alla: 'Alarivi.',
      ke_d_seuraava: 'Kaavion laatikko.', ke_d_keskustelu: 'Kaavion laatikko.', ke_d_keskustelu_alla: 'Alarivi.', ke_d_raportti: 'Kaavion laatikko.', ke_d_raportti_alla: 'Alarivi.', ke_d_kaavio: 'Kaavion saavutettavuuskuvaus (aria-label).',
      ke_rytmi: 'Kappale: rytmi 42 päivää (12 vuotta täyttäneet) / 84 päivää (9–11-vuotiaat); yhteenveto ja keskustelu nollaavat rytmin.', ke_jakso: 'Kappale jaksosta (6 viikkoa, yksi aihe, viikon fokus).', ke_raportti: 'Kappale Pelaajaraportista.'
    }
  },
  'lib.tm_idp_pelaaja': {
    lahde: 'lib/tm_idp_pelaaja.js (kaikki FI-avaimet ip_*; ennen kovakoodattua suomea lib/tm_idp.js:ssä)', tiedosto: '../lib/tm_idp_pelaaja.js',
    konteksti: 'PELAAJA (U8–U19): Minä-sivu, kauden tavoitteen matka-aikajana ("Aloitit tästä", "Otit askeleen", "Jatkoit työtä", "Nyt"), "Seuraava askel" ja kehu sekä "mitä tämä on" -kortti. Sävy: kannustava, rauhallinen, lapsen kieli, sinuttelu; ei lukuja, ei vertailua, ei tappiota. {fokus} = kauden tavoitteen nimi, {note} = pelaajan oma sana — säilytä muuttujat täsmälleen. K1d muutti kaksi lausetta: ip_seuraava_teksti ("Muista tavoitteesi joka harjoituksessa: {fokus}.") ja ip_lahto_valmentaja ("Valmentaja asetti tavoitteen.").',
    avaimet: {
      ip_aloitit: 'Aikajanan ensimmäinen otsikko.', ip_lahto_valmentaja: 'Aikajanan ensimmäinen lause kun pelaajalla ei ole omaa sanaa tavoitteesta.', ip_lahto_yhdessa: 'Sama kun pelaajalla on oma sana ("Asetitte tavoitteen yhdessä valmentajan kanssa.").',
      ip_nyt: 'Viimeisen pisteen otsikko.', ip_nyt_note: 'Lause: pelaajan oma sana lainausmerkeissä + kehu. Säilytä {note} ja lainausmerkit ” ”.', ip_nyt_win: 'Kannustus.', ip_nyt_pysyt: 'Kannustus (ei tappiota).',
      ip_askel: 'Pisteen otsikko.', ip_askel_note: 'Pelaajan oma sana lainausmerkeissä + 👏. Säilytä {note} ja emoji.', ip_askel_sujuu: 'Lause. {fokus} säilytetään. Säilytä emoji 👏.', ip_jatkoit: 'Pisteen otsikko.', ip_jatkoit_note: 'Pelaajan oma sana lainausmerkeissä. Säilytä {note}.', ip_jatkoit_pysyit: 'Kannustus.',
      ip_seuraava: 'Kortin otsikko.', ip_seuraava_teksti: 'Muistutus. {fokus} säilytetään täsmälleen.', ip_kehu: 'Kehulause.', ip_tavoitteesi: 'Varasana kun tavoitteen nimeä ei ole ("tavoitteesi", pieni kirjain).',
      ip_mika_oletus: '"Mikä tämä on" -kortin oletuslause. {fokus} säilytetään.', ip_miksi_oletus: 'Oletuslause "miksi se auttaa".', ip_mieti: 'Pohdintakysymys pelaajalle.'
    }
  }
};
const lueFI = (tiedosto) => require(tiedosto).FI;
let nyk = null; try { nyk = JSON.parse(readFileSync(OUT, 'utf8')); } catch (e) { /* uusi */ }
const vanha = (o, k) => { const r = nyk && nyk.osiot && nyk.osiot[o] && nyk.osiot[o].rivit[k]; return r && typeof r.sv === 'string' ? r.sv : ''; };
const osiot = {}, maarat = {}; let yht = 0;
for (const [o, d] of Object.entries(OSIOT)) {
  const FI = lueFI(d.tiedosto), rivit = {};
  for (const [k, huom] of Object.entries(d.avaimet)) {
    if (!(k in FI)) { console.error('puuttuu libistä: ' + o + ' ' + k); process.exit(1); }
    const rivi = { fi: FI[k], huom };
    if (typeof LIBSV[k] === 'string') rivi.sv_nyt = LIBSV[k];   // muuttunut fi, vanha sv KORVATTAVA
    rivi.sv = vanha(o, k); rivit[k] = rivi; yht++;
  }
  maarat[o] = Object.keys(rivit).length; osiot[o] = { _konteksti: d.konteksti, _lahde: d.lahde, rivit };
}
/* (2) ADAR-nimikanoni: henkilökunnalle "Päätöksenteko" (ennen "Päätös") */
osiot.lib_adar_nimet = { _konteksti: HENK + 'ADAR-pelitilannearvion neljä nimeä; D (decide) = "Päätöksenteko" (Teron päätös 20.10.2026; ennen henkilökunnalle "Päätös", pelaajalle jo "Päätöksenteko"). Sama termi kuin termistön rivi "Päätös / Päätöksenteko". ' + SANASTO, _lahde: 'lib/tm_pelialy_yksilo.js TM_ADAR_NIMET.valmentaja.d (lib-avain adar_nimi_valmentaja_d)',
  rivit: { adar_nimi_valmentaja_d: Object.assign({ fi: require('../lib/tm_pelialy_yksilo.js').TM_ADAR_NIMET.valmentaja.d, huom: 'ADAR D henkilökunnan näkymässä. Sama käännös kuin pelaajan nimessä (adar_nimi_pelaaja_d) jos se on jo "Beslutsfattande"-tyyppinen; ei pistettä.' }, typeof LIBSV.adar_nimi_valmentaja_d === 'string' ? { sv_nyt: LIBSV.adar_nimi_valmentaja_d } : {}, { sv: vanha('lib_adar_nimet', 'adar_nimi_valmentaja_d') }) } };
for (const [k, huom] of [['adar_nimi_valmentaja_r', 'ADAR R henkilökunnan näkymässä: "Reagointi" (Reaction; ennen "Palautuminen"). Pelaajan nimi on sama (adar_nimi_pelaaja_r). Ei pistettä.'], ['adar_nimi_pelaaja_r', 'ADAR R pelaajan näkymässä: "Reagointi" (ennen "Palautuminen"). Lapsen kieli, ei pistettä.']]) {
  osiot.lib_adar_nimet.rivit[k] = Object.assign({ fi: 'Reagointi', huom }, typeof LIBSV[k] === 'string' ? { sv_nyt: LIBSV[k] } : {}, { sv: vanha('lib_adar_nimet', k) });
}
maarat.lib_adar_nimet = 3; yht += 3;
{   /* tm_lang (Pelaaja_v7): pelaaja.adar_nimi_pelaaja_r — fi + en päivitetty, sv KORVATTAVA */
  const TL = require('../lib/tm_lang.js').TM_LANG;
  osiot.tm_lang = { _konteksti: 'PELAAJA (U8–U19): ADAR-pelitilannearvion R-ulottuvuuden nimi pelaajan Minä-sivulla. Lapsen kieli, ei pistettä. ' + SANASTO, _lahde: 'lib/tm_lang.js pelaaja.adar_nimi_pelaaja_r', rivit: { 'pelaaja.adar_nimi_pelaaja_r': { fi: TL.fi.pelaaja.adar_nimi_pelaaja_r, en: TL.en.pelaaja.adar_nimi_pelaaja_r, huom: 'ADAR R (Reaction) = "Reagointi" (ennen "Palautuminen"). Samaa käännöstä käytetään lib-avaimessa adar_nimi_pelaaja_r.', sv_nyt: TL.sv.pelaaja.adar_nimi_pelaaja_r, sv: vanha('tm_lang', 'pelaaja.adar_nimi_pelaaja_r') } } };
  maarat.tm_lang = 1; yht += 1;
}
/* (3) fi-avaimiset kartat: sanastomuutoksen takia nimetyt rivit (avain = uusi fi-teksti) */
const KARTAT = [['vp_kartta', VPSV, 'VP-dashboard (TalentMaster_VP_v25.html)'], ['master_kartta', MASV, 'Valmentajan Master (TalentMaster_Master_v16.html)'], ['yhteiset_kartta', COSV, 'jaettu henkilöstökartta (lib/tm_i18n_common.js: VP + Master)']];
const UUDET_FI = { vp_kartta: ['Kehityskeskustelun voi kirjata, kun pelaajalle on asetettu kauden tavoite. Aseta se Polku-välilehdellä.'], master_kartta: ['Kehityskeskustelun voi kirjata, kun pelaajalle on asetettu kauden tavoite. Aseta se Polku-välilehdellä.'], yhteiset_kartta: [] };
for (const [o, kartta, sovellus] of KARTAT) {
  const rivit = {}, lisaa = (fi, vanhaFi) => {
    if (rivit[fi]) return;
    const rivi = { fi, huom: vanhaFi ? 'Suomenkielinen lähdeteksti muuttui sanastopäätöksen (K1d 20.10.2026) takia. Aiempi fi: "' + vanhaFi + '". Nykyinen sv (sv_nyt) on vanhan termin mukainen ja KORVATAAN. Säilytä muuttujat ja merkit täsmälleen.' : 'Uusi teksti: toimintaohje-toast (kun kehityskeskustelun kirjaus ei ole mahdollinen) Säilytä muodot täsmälleen.' };
    if (typeof kartta[fi] === 'string') rivi.sv_nyt = kartta[fi];
    rivi.sv = vanha(o, fi); rivit[fi] = rivi;
  };
  KORV.forEach((x) => { if (Object.prototype.hasOwnProperty.call(kartta, x.uusi)) lisaa(x.uusi, x.vanha); });
  UUDET_FI[o].forEach((fi) => lisaa(fi, null));
  if (!Object.keys(rivit).length) continue;
  maarat[o] = Object.keys(rivit).length; yht += maarat[o];
  osiot[o] = { _konteksti: 'HENKILÖKUNTA: ' + sovellus + '. Avain = suomenkielinen teksti sellaisenaan. Kehityssuunnitelma/jakson yhteenveto/kehityskeskustelu-sanaston muutokset (aiemmin IDP, katselmus, review, Syvennä, raportointi, MDT). ' + SANASTO, _lahde: 'tests/fixtures/k1d_fi_korvaukset.json (vanha → uusi fi)', rivit };
}
/* (4) Erässä 19 lähetetyt, vielä kääntämättömät rivit joiden fi korvattiin sanastopäätöksellä (esim. "Katselmusikkuna on auki"): uusi fi-teksti samaan osioon (avain = fi-teksti), vanha rivi jää historiaan */
{
  const E19 = JSON.parse(readFileSync(join(ROOT, 'docs/i18n/sv_kaannoserae_19_gemini.json'), 'utf8')).osiot, korv = new Map(KORV.map((x) => [x.vanha, x.uusi]));
  for (const [osio, o] of Object.entries(E19)) for (const [vanhaFi, r] of Object.entries(o.rivit)) {
    const uusiFi = korv.get(vanhaFi); if (!uusiFi) continue;
    if (!osiot[osio]) osiot[osio] = { _konteksti: (o._konteksti || '') + ' · K1d: korvaa erässä 19 lähetetyn rivin uudella sanastolla. ' + SANASTO, _lahde: 'erä 19 → K1d sanastomuutos', rivit: {} };
    if (osiot[osio].rivit[uusiFi]) continue;
    osiot[osio].rivit[uusiFi] = { fi: uusiFi, huom: 'Korvaa erässä 19 lähetetyn rivin (aiempi fi: "' + vanhaFi + '"), jonka sanasto muuttui (K1d 20.10.2026). Säilytä muuttujat täsmälleen.', sv: vanha(osio, uusiFi) };
    maarat[osio] = (maarat[osio] || 0) + 1; yht += 1;
  }
}
const ulos = {
  _tiedosto: 'TalentMaster — sv-käännöserä 80 (K1d: sanasto Kehityssuunnitelma · Jakson yhteenveto · Kehityskeskustelu · Pelaajaraportti · Seuran tilannekuva; yhteenvetorytmin ilmoituskortti; ⓘ-selitteet; pelaajan Minä; ADAR "Päätöksenteko"; ' + yht + ' riviä; sv tyhjä → Gemini)', _pvm: '2026-10-20',
  _ohje: 'Täytä vain "sv"-kentät. Muut kentät (huom, sv_nyt) ovat apuna — älä käännä äläkä muuta. sv_nyt = nykyinen, vanhan termin mukainen käännös, joka KORVATAAN uudella termillä (Kehityssuunnitelma, jakson yhteenveto, kehityskeskustelu, Pelaajaraportti, Seuran tilannekuva, Päätöksenteko). Ohje ja termistö: docs/i18n/GEMINI_OHJE_kooste.md + docs/i18n/termisto.fi-sv.json.', _rivit_yhteensa: yht, _rivit_osioittain: maarat, osiot
};
writeFileSync(OUT, JSON.stringify(ulos, null, 1) + '\n'); console.log('Kirjoitettu ' + yht + ' riviä → ' + OUT.replace(ROOT + '/', ''));
