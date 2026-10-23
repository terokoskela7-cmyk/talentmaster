#!/usr/bin/env node
/* Gemini-erä 89 (K4e: Profiilin Psyykkinen (D3) -kortti + D3-arviomodaali [d3k_*, 23 riviä] ja yhteinen Pelaajaraportti vaihe A [pr_*, 45 riviä]; PR #1125 + #1126, 23.10.2026) — lähetystiedosto PM:lle.
   Code EI kirjoita ruotsia (CLAUDE.md §0): sv jää tyhjäksi, Gemini/PM täyttää. fi luetaan suoraan libeistä. Idempotentti: jo täytetty sv säilyy.
   `sv_viite` = olemassa oleva sv samalle fi-tekstille (VP / Master / yhteiset kartat) — vain apuna johdonmukaisuuteen, EI täytettyä käännöstä.
   Ajo: node scripts/i18n_luo_gemini_era89.mjs [--tiedosto=docs/i18n/sv_kaannoserae_89_gemini.json] */
import { readFileSync, writeFileSync } from 'fs';
import { createRequire } from 'module';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';
const require = createRequire(import.meta.url);
const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..');
const arg = (n, d) => { const a = process.argv.find((x) => x.startsWith('--' + n + '=')); return a ? a.slice(n.length + 3) : d; };
const OUT = arg('tiedosto', 'docs/i18n/sv_kaannoserae_89_gemini.json'), OUT_ABS = OUT.startsWith('/') ? OUT : join(ROOT, OUT);
const _log = console.log; console.log = (...a) => { if (!String(a[0]).startsWith('[TM Lang]') && !String(a[0]).startsWith('[tm-')) _log(...a); };
const HENK = 'HENKILÖKUNTA (valmentaja ja VP): ';
const SANASTO = ' Sanasto: Psyykkinen = Psykisk · Kehityskeskustelu = Utvecklingssamtal · kehityssuunnitelma = utvecklingsplan; käytä samoja sv-termejä kuin Profiilin ja Polun aiemmissa erissä (81, 84, 88). Muuttujat ({nimi}, {aihe}, {pvm}, {n}, {kk}) ja «» -lainausmerkit säilytetään.';
const OSIOT = {
  'lib.tm_d3_kortti': {
    lahde: 'lib/tm_d3_kortti.js (avaimet d3k_*)', tiedosto: '../lib/tm_d3_kortti.js',
    konteksti: HENK + 'Kehitystyöpöytä, Profiili-välilehden kortti "Psyykkinen (D3)" ja sen "Päivitä arvio" -modaali. D3 = psyykkinen ulottuvuus (5 osaa: sisäinen motivaatio, valmennettavuus, sinnikkyys, keskittyminen, tunteiden hallinta, asteikko 1–5). Taulukon sarakkeet PEL / VAL / VP = pelaajan itsearvio / valmentajan arvio / VP:n arvio — lyhenteet ovat taulukon sarakeotsikoita (3 merkkiä, ei saa venyttää). ⚠ merkitsee, että arvioiden ero on vähintään 1,5 pistettä (kalibrointi). Tämä on henkilökunnan näkymä, ei pelaajan.' + SANASTO,
    huom: {
      d3k_nimi: 'Kortin otsikko (pieni yläotsikko, isot kirjaimet CSS:llä). Sulkeissa oleva D3 säilyy.', d3k_ulottuvuus: 'Taulukon ensimmäisen sarakkeen otsikko (psyykkisen ulottuvuuden nimi riveillä).',
      d3k_pel: 'Sarakeotsikko: PELAAJA (itsearvio). Lyhenne, enintään 3–4 merkkiä.', d3k_val: 'Sarakeotsikko: VALMENTAJA. Lyhenne, enintään 3–4 merkkiä.', d3k_vp: 'Sarakeotsikko: VP (urheilujohtaja/seuran johto). Lyhenne.',
      d3k_ero_title: 'Työkaluvihje ⚠-merkin päällä (hiiri/ruudunlukija): ero vähintään 1,5 pistettä → hyvä aihe kalibrointikeskusteluun.', d3k_tyhja: 'Kortin tyhjätila-lause, kun mitään arviota ei ole.',
      d3k_tee_arvio: 'Painike tyhjätilassa (avaa arviomodaalin).', d3k_paivita: 'Painike kun arvio on jo olemassa (avaa arviomodaalin).', d3k_pvm: 'Kortin alarivi, {pvm} = päivämäärä (esim. 12.10.2026).',
      d3k_lause_matalampi: 'Kortin yksi lause (henkilökunnalle): pelaaja arvioi itsensä selvästi matalammaksi kuin valmentajat. {nimi} = pelaajan etunimi, {aihe} = ulottuvuuden nimi (esim. Sinnikkyys). Kaksi virkettä; jälkimmäinen kehote.',
      d3k_lause_korkeampi: 'Kuten edellinen, mutta pelaaja arvioi itsensä selvästi korkeammaksi kuin valmentajat.', d3k_lause_valm_vp: 'Valmentajan ja VP:n arviot eroavat toisistaan (ei pelaajaa). {aihe} = ulottuvuuden nimi. Kehote: sopikaa yhteinen näkemys.',
      d3k_lause_vain_pelaaja: 'Vain pelaajan itsearvio on olemassa; valmentajan arvio puuttuu.', d3k_lause_vain_valmentaja: 'Vain valmentajan arvio on olemassa; pelaaja ei ole tehnyt itsearviota.', d3k_lause_linjassa: 'Arviot ovat samaa suuruusluokkaa (ei merkittävää eroa).',
      d3k_modaali: 'Arviomodaalin otsikko. {nimi} = pelaajan nimi.', d3k_sulje: 'Modaalin sulje-painikkeen saavutettavuusnimi (×).', d3k_ohje: 'Modaalin ohjeteksti: valmentajan arvio asteikolla 1 (harvoin) – 5 (lähes aina); yhdistyy pelaajan itsearvioon keskiarvona.',
      d3k_tallenna: 'Modaalin tallennuspainike.', d3k_tallennettu: 'Onnistumisilmoitus (toast).', d3k_anna_arvio: 'Virheilmoitus (toast): tallennus vaatii vähintään yhden annetun arvion.', d3k_virhe: 'Virheilmoitus (toast), kun tallennus epäonnistui; kehottaa yrittämään uudelleen.'
    }
  },
  'lib.tm_pelaajaraportti': {
    lahde: 'lib/tm_pelaajaraportti.js (avaimet pr_*)', tiedosto: '../lib/tm_pelaajaraportti.js',
    konteksti: HENKILÖKUNTA_RAPORTTI(),
    huom: {
      pr_otsikko: 'Raportin saavutettavuusnimi (dialogin aria-label) ennen pelaajan nimeä.', pr_eyebrow: 'Raportin yläotsikko (pieni, isot kirjaimet) heron yllä; perässä ikävaihe (Leikkijä / Rakentaja / Showcase).', pr_sulje: 'Sulje-painike (raportti suljetaan ja palataan Profiiliin).', pr_pdf: 'Painike: tulostaa raportin / tallentaa PDF:ksi. Olemassa oleva VP:n "Vie PDF" -teksti voi toimia viitteenä.',
      pr_paatos_ei: 'Päätöslause, kun avointa toimenpidettä ei ole (hiljainen tila).', pr_paatos_ots: 'Päätöslauseen saavutettavuusotsikko (aria-label): "Seuraava askel".',
      pr_ks_ots: 'Osion otsikko. Sama käsite kuin Polun "Kehityssuunnitelma" (ktp_otsikko).', pr_ks_tila: 'Rivin nimiö: kehityssuunnitelman tila (arvo oikealla: Aktiivinen / Ehdotettu / …).', pr_ks_ei_tavoitetta: 'Kun kauden tavoitetta ei ole asetettu.', pr_ks_jakso_ei: 'Kun jaksoa ei ole käynnissä (osio "Jakso nyt").',
      pr_idp_aktiivinen: 'Kehityssuunnitelman tila: aktiivinen.', pr_idp_ehdotettu: 'Tila: ehdotettu (odottaa vahvistusta).', pr_idp_odottaa: 'Tila: odottaa.', pr_idp_hyvaksytty: 'Tila: hyväksytty.', pr_idp_hylatty: 'Tila: hylätty.', pr_idp_puuttuu: 'Tila: puuttuu (ei tavoitetta).',
      pr_tav_ots: 'Osion otsikko: valmentajan pelaajalle kirjaamat vapaat tavoitteet (esim. "Vasen jalka pelitilanteessa"). Eri asia kuin kauden tavoite (kehityssuunnitelma).', pr_tav_ladataan: 'Latausteksti.', pr_tav_ei: 'Tyhjätila: ei tavoitteita.', pr_tav_virhe: 'Virheilmoitus, kun tavoitteiden lataus epäonnistui.',
      pr_tav_uusi_ph: 'Tekstikentän paikkamerkki (placeholder) ja saavutettavuusnimi: uusi tavoite pelaajalle.', pr_tav_pvm: 'Päivämääräkentän nimiö: tavoitteen tavoitepäivä.', pr_tav_tallenna: 'Tallennuspainike.', pr_tav_tavoite: 'Tavoitteen rivillä: tavoitepäivämäärä. {pvm} = pp.kk.vvvv.',
      pr_tav_t_kaynnissa: 'Tavoitteen tila: käynnissä.', pr_tav_t_saavutettu: 'Tavoitteen tila: saavutettu.', pr_tav_t_kesken: 'Tavoitteen tila: kesken (keskeytetty/ei edennyt).', pr_tav_kirjoita: 'Virheilmoitus (toast): tavoitteen teksti puuttuu.', pr_tav_tallennettu: 'Onnistumisilmoitus (toast).',
      pr_tav_tallennus_virhe: 'Virheilmoitus (toast), tallennus epäonnistui; kehottaa yrittämään uudelleen.', pr_tav_paivitys_virhe: 'Virheilmoitus (toast), tilan vaihto epäonnistui; kehottaa yrittämään uudelleen.', pr_tav_tila_aria: 'Tilavalitsimen (alasvetovalikko) saavutettavuusnimi.',
      pr_kk_ots: 'Osion otsikko: Kehityskeskustelu (Utvecklingssamtal).', pr_rv_ajantasalla: 'Tilarivi: jakson yhteenveto / kehityskeskustelu on ajan tasalla.', pr_rv_eraantymassa: 'Tilarivi: yhteenveto erääntymässä (lähestyy eräpäivää).', pr_rv_myohassa: 'Tilarivi: yhteenveto myöhässä.', pr_rv_ei: 'Tilarivi: yhteenvetoa ei ole vielä tehty.',
      pr_rv_viim: 'Tilarivin lisä: viimeisin kerta. "viim." = viimeksi. {pvm} = pp.kk.vvvv.', pr_rv_erayty: 'Tilarivin lisä: eräpäivä. {pvm} = pp.kk.vvvv.', pr_rv_yli: 'Tilarivin lisä, kun myöhässä: {n} päivää yli. "pv" = päivää.',
      pr_chip_synt: 'RAE-merkin perässä: "Q4 synt." = syntymäkvartaali (Q1–Q4). "synt." = syntymä-/födelse-. Lyhyt.', pr_chip_underdog: 'Merkki (chip): Underdog — RAE-sanasto; säilytä sama termi kuin Masterin raportissa.', pr_ei_oikeutta: 'Virheilmoitus (toast), kun käyttäjällä ei ole oikeutta katsoa pelaajaa.',
      pr_sub_testi: 'Heron alarivi: viimeisimmän testin päivä. {pvm} = pp.kk.vvvv.', pr_sub_vanha: 'Heron alarivin varoitus: mittaus on vanha. {kk} = kuukautta (luku).'
    }
  }
};
function HENKILÖKUNTA_RAPORTTI() {
  return HENK + 'Kehitystyöpöytä, yhteinen Pelaajaraportti (avautuu Profiilin "Pelaajaraportti"-painikkeesta sekä Masterista ja VP:stä; koko ruudun näkymä + Vie PDF). Osiot: hero (nimi, ikävaihe, pelipaikka · joukkue · ikä · PHV · testattu, chipit), päätöslause, Kehityssuunnitelma (kausitavoite, jakso nyt, tila), Tavoitteet (valmentajan vapaat tavoitteet: lisäys ja tilan vaihto), Psyykkinen (D3-kortti, avaimet d3k_*), Kehityskeskustelu. Raporttia käytetään kehityskeskustelun ja johdon palaverin pohjana; sävy selkeä ja ammattimainen. Kierrätetyt Polun avaimet (ktp_*) eivät kuulu tähän erään (sv jo olemassa). Samat suomitekstit löytyvät osin VP:n ja Masterin vanhoista raporteista — sv_viite näyttää olemassa olevan käännöksen, jos fi-teksti on sellaisenaan avaimena.' + SANASTO;
}
const lueFI = (tiedosto) => require(tiedosto).FI;
const KARTAT = [['VP', () => require('../lib/tm_vp_i18n.js').TM_VP_I18N], ['Master', () => require('../lib/tm_master_i18n.js').TM_MASTER_I18N], ['yhteiset', () => require('../lib/tm_i18n_common.js').TM_I18N_COMMON]].map(([n, f]) => [n, (f().sv || {})]);
const viite = (fi) => { for (const [n, sv] of KARTAT) if (typeof sv[fi] === 'string' && sv[fi]) return n + ': ' + sv[fi]; return ''; };
let nyk = null; try { nyk = JSON.parse(readFileSync(OUT_ABS, 'utf8')); } catch (e) { /* uusi */ }
const vanha = (o, k) => { const r = nyk && nyk.osiot && nyk.osiot[o] && nyk.osiot[o].rivit[k]; return r && typeof r.sv === 'string' ? r.sv : ''; };
const osiot = {}; let yht = 0, viitteita = 0;
for (const [o, d] of Object.entries(OSIOT)) {
  const FI = lueFI(d.tiedosto), rivit = {}, avaimet = Object.keys(FI);
  for (const k of avaimet) { if (!(k in d.huom)) { console.error('huom puuttuu: ' + o + ' ' + k); process.exit(1); } }
  for (const k of Object.keys(d.huom)) { if (!(k in FI)) { console.error('puuttuu libistä: ' + o + ' ' + k); process.exit(1); } }
  for (const k of avaimet) { const v = viite(FI[k]); const r = { fi: FI[k], huom: d.huom[k], sv: vanha(o, k) }; if (v) { r.sv_viite = v; viitteita++; } rivit[k] = r; yht++; }
  osiot[o] = { _konteksti: d.konteksti, _lahde: d.lahde, rivit };
}
writeFileSync(OUT_ABS, JSON.stringify({ _tiedosto: 'TalentMaster — sv-käännöserä 89 (K4e: D3-kortti + D3-modaali d3k_*, Pelaajaraportti vaihe A pr_*; ' + yht + ' riviä; sv tyhjä → PM kirjoittaa)', _pvm: '2026-10-23', _ohje: 'Täytä vain "sv"-kentät. Muut kentät (huom, sv_viite) ovat apuna — älä käännä äläkä muuta. sv_viite = olemassa oleva sv samalle fi-tekstille (VP/Master/yhteiset); käytä johdonmukaisuuteen, mutta ratkaise itse. Code ei kirjoita ruotsia (§0).', osiot }, null, 1) + '\n');
console.log(JSON.stringify({ tiedosto: OUT_ABS.replace(ROOT + '/', ''), rivit: yht, sv_viitteita: viitteita }));
