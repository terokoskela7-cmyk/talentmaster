#!/usr/bin/env node
/* Gemini-erä 84 (K4b: Kehityskeskustelu uudelle sivulle — sheet, Polun otsikkonappi, Historian rivi) — lähetystiedosto PM:lle.
   Code EI kirjoita ruotsia (CLAUDE.md §0): sv jää tyhjäksi, Gemini täyttää. fi luetaan suoraan libeistä. Idempotentti: jo täytetty sv säilyy.
   Ajo: node scripts/i18n_luo_gemini_era84.mjs [--tiedosto=docs/i18n/sv_kaannoserae_84_gemini.json] */
import { readFileSync, writeFileSync } from 'fs';
import { createRequire } from 'module';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';
const require = createRequire(import.meta.url);
const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..');
const arg = (n, d) => { const a = process.argv.find((x) => x.startsWith('--' + n + '=')); return a ? a.slice(n.length + 3) : d; };
const OUT = join(ROOT, arg('tiedosto', 'docs/i18n/sv_kaannoserae_84_gemini.json'));
const _log = console.log; console.log = (...a) => { if (!String(a[0]).startsWith('[TM Lang]') && !String(a[0]).startsWith('[tm-')) _log(...a); };
const SANASTO = 'SANASTO (Teron päätös 20.10.2026; yksi sv-termistö kaikkialle): Kehityssuunnitelma = pelaajan kauden tavoite + sen alla etenevät jaksot · Jakson yhteenveto = jakson lopussa tehtävä yhteenveto · Kehityskeskustelu = laajempi keskustelu pelaajan (ja huoltajan) kanssa, yleensä VP:n kanssa (ei "review", ei "MDT") · Pelaajaraportti = dokumentti pelaajalle ja perheelle · Kauden tavoite = kehityssuunnitelman tavoite. Käytä samoja sv-termejä kuin erässä 80.';
const HENK = 'HENKILÖKUNTA (valmentaja ja VP): ';
const OSIOT = {
  'lib.tm_kt_keskustelu': {
    lahde: 'lib/tm_kt_keskustelu.js (kaikki FI-avaimet kes_*)', tiedosto: '../lib/tm_kt_keskustelu.js',
    konteksti: HENK + 'Kehitystyöpöytä (uusi sivu): "Kehityskeskustelu"-ikkuna (pitkä sheet). Valmentaja tai VP kirjaa keskustelun pelaajan kanssa: kauden tavoite ja jaksot lyhyesti, pelaajan oma arvio vs. valmentajien arvio (D3-taulukko, erot nostetaan "Hyvä aihe keskusteluun"), neljä aluetta (Fyysinen, Tekniikka ja pelitaito, Henkinen, Sosiaalinen: tila "nykyinen fokus" / "arvioitu" / "ei arvioitu"), vapaa teksti "Sovitut asiat ja seuraava askel", kauden tavoitteen tarkistus (pysyy / muutetaan). Kirjaus on SISÄINEN: vain henkilökunta näkee sen, pelaaja ja huoltaja eivät. Sävy: selkeä, ammattimainen, ei painostava. Paikanvaraajat {nimi}, {n}, {yht}, {alue} säilytetään täsmälleen. ' + SANASTO,
    avaimet: {
      kes_otsikko: 'Ikkunan otsikko ja Historian/valikon termi. Yksi sana.', kes_tallenna: 'Päänappi. Toimintokehote, ei pistettä.', kes_sulje: 'Sulje-nappi (varalla).', kes_tallennettu: 'Onnistumisilmoitus (toast), loppuu ✓.',
      kes_sisainen: 'Ikkunan ylärivin huomautus: kirjaus on sisäinen. Kaksi lyhyttä lausetta.', kes_ohje_ei_tavoitetta: 'Ohje kun pelaajalle ei ole asetettu kauden tavoitetta (sama merkitys kuin aiemmin: "Kehityskeskustelun voi kirjata, kun pelaajalle on asetettu kauden tavoite"; perässä ei enää "Aseta se Polku-välilehdellä", nappi hoitaa).', kes_aseta_tavoite: 'Nappi, avaa kauden tavoitteen asetuksen. Sama käännös kuin "Aseta kauden tavoite" (ktp_aseta_kausitavoite).',
      kes_ohje_ehdotus: 'Ohje kun kauden tavoite on ehdotus, jota ei ole vielä hyväksytty. Kaksi lausetta.', kes_avaa_tavoite: 'Nappi, avaa kauden tavoitteen (hyväksyntää varten).', kes_lataus_virhe: 'Virheilmoitus kun kauden tavoitteen lataus epäonnistui.', kes_yrita_uudelleen: 'Nappi.',
      kes_s1: 'Osion otsikko.', kes_s1_henkilokunta: 'Pieni selite osion lopussa.', kes_kausi: 'Rivi, {nimi} = kauden tavoitteen nimi. Säilytä {nimi}.', kes_jakso_nyt: 'Rivi, {nimi} = jakson aihe.', kes_jakso_nyt_vk: 'Rivi, {nimi} = jakson aihe, {n}/{yht} = viikko / viikkoja yhteensä ("vk" = viikko).', kes_jakso_ei: 'Rivi kun jaksoa ei ole käynnissä.',
      kes_jaksot_aiemmin: 'Alaotsikko (versaaleilla CSS:llä).', kes_tulos_parani: 'Jakson tulos: pieni kirjain, rivillä "Aihe · pvm · parani".', kes_tulos_ennallaan: 'Jakson tulos: pieni kirjain.', kes_tulos_vaihda: 'Jakson tulos: fokus vaihdettiin (pieni kirjain).', kes_jaksot_ei: 'Rivi kun päätettyjä jaksoja ei ole.',
      kes_s2: 'Osion otsikko.', kes_s2_ei: 'Rivi kun arvioita ei ole.', kes_aihe_otsikko: 'Alaotsikko (versaaleilla CSS:llä): kohdat joissa pelaajan ja valmentajien arviot eroavat.', kes_aihe_rivi: 'Rivi, {alue} = D3-ulottuvuuden nimi (esim. Keskittyminen). Säilytä {alue}.', kes_aihe_ei: 'Rivi kun arviot ovat lähellä toisiaan.', kes_pelihavainnot: 'Rivi, {n} = pelihavaintojen määrä.',
      kes_s3: 'Osion otsikko. "Neljä aluetta" = fyysinen, tekniikka ja pelitaito, henkinen, sosiaalinen.', kes_alue_fyysinen: 'Alueen nimi.', kes_alue_teknis_taktinen: 'Alueen nimi: tekniikka ja pelitaito (teknis-taktinen).', kes_alue_psyykkinen: 'Alueen nimi: henkinen (D3).', kes_alue_sosiaalinen: 'Alueen nimi.',
      kes_alue_cur: 'Alueen tila: tämä on jakson nykyinen fokus. Pieni kirjain.', kes_alue_fresh: 'Alueen tila: alue on käsitelty aiemmilla jaksoilla. Pieni kirjain.', kes_alue_none: 'Alueen tila: aluetta ei ole vielä käsitelty. Pieni kirjain.',
      kes_s4: 'Osion otsikko.', kes_s4_ohje: 'Ohjeteksti tekstikentän yllä. Kaksi lausetta.', kes_s4_virhe_tyhja: 'Virheilmoitus (toast) kun teksti puuttuu.', kes_s4_virhe_pitka: 'Virheilmoitus (toast) kun teksti on liian pitkä.',
      kes_s5: 'Osion otsikko.', kes_pidetaan: 'Valintanappi: kauden tavoite pysyy ennallaan.', kes_muutetaan: 'Valintanappi: kauden tavoitetta muutetaan.', kes_muutetaan_ohje: 'Selite kun "muutetaan" on valittu.',
      kes_raportti: 'Nappi/linkki, loppuu nuoleen ↗ (sama käännös kuin Profiilin "Pelaajaraportti ↗", tc_x_pelaajaraportti).', kes_lataa: 'Latausteksti.', kes_virhe: 'Virheilmoitus (toast): tallennus epäonnistui.', kes_offline: 'Virheilmoitus: ei verkkoyhteyttä. Sama merkitys kuin muissa tallennusvirheissä.'
    }
  },
  'lib.tm_kt_polku': {
    lahde: 'lib/tm_kt_polku.js (uudet FI-avaimet ktp_kirjaa_keskustelu, ktp_h_keskustelu, ktp_h_kk_vp, ktp_h_kk_valm)', tiedosto: '../lib/tm_kt_polku.js',
    konteksti: HENK + 'Kehitystyöpöytä, Polku-välilehti: Kehityssuunnitelma-otsikon viereinen toissijainen nappi ja Historian rivi kirjatusta kehityskeskustelusta ("Kehityskeskustelu 19.10." + sisäinen teksti + tekijän rooli + merkki "sisäinen"). ' + SANASTO,
    avaimet: { ktp_kirjaa_keskustelu: 'Toissijainen nappi. Toimintokehote, ei pistettä (sama käännös kuin ts_rytmi_keskustelu_nappi).', ktp_h_keskustelu: 'Historian rivin otsikko, {pvm} = päivä (esim. 19.10.). Säilytä {pvm}.', ktp_h_kk_vp: 'Tekijän rooli tekstin perässä: "– VP". Lyhyt.', ktp_h_kk_valm: 'Tekijän rooli tekstin perässä: "– valmentaja". Pieni kirjain.' }
  }
};
const lueFI = (tiedosto) => require(tiedosto).FI;
let nyk = null; try { nyk = JSON.parse(readFileSync(OUT, 'utf8')); } catch (e) { /* uusi */ }
const vanha = (o, k) => { const r = nyk && nyk.osiot && nyk.osiot[o] && nyk.osiot[o].rivit[k]; return r && typeof r.sv === 'string' ? r.sv : ''; };
const osiot = {}; let yht = 0;
for (const [o, d] of Object.entries(OSIOT)) {
  const FI = lueFI(d.tiedosto), rivit = {};
  for (const [k, huom] of Object.entries(d.avaimet)) {
    if (!(k in FI)) { console.error('puuttuu libistä: ' + o + ' ' + k); process.exit(1); }
    rivit[k] = { fi: FI[k], huom, sv: vanha(o, k) }; yht++;
  }
  if (o === 'lib.tm_kt_keskustelu') { const puuttuu = Object.keys(FI).filter((k) => !(k in d.avaimet)); if (puuttuu.length) { console.error('selite puuttuu: ' + puuttuu.join(', ')); process.exit(1); } }
  osiot[o] = { _konteksti: d.konteksti, _lahde: d.lahde, rivit };
}
writeFileSync(OUT, JSON.stringify({ _tiedosto: 'TalentMaster — sv-käännöserä 84 (K4b: Kehityskeskustelu uudelle sivulle: sheet, Polun otsikkonappi, Historian rivi; ' + yht + ' riviä; sv tyhjä → Gemini)', _pvm: '2026-10-21', _ohje: 'Täytä vain "sv"-kentät. Muut kentät (huom) ovat apuna — älä käännä äläkä muuta. Paikanvaraajat ({nimi}, {n}, {yht}, {alue}, {pvm}) säilytetään täsmälleen. Sanasto kuten erässä 80.', osiot }, null, 2) + '\n');
console.log(JSON.stringify({ tiedosto: OUT.replace(ROOT + '/', ''), rivit: yht }));
