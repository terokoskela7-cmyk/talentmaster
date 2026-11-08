/* B12 (PM 8.11.2026): käännöserän osio "seura_muodot" — Seurahallinnan tekstit, joita sv-läpiajo ei näe fixture-tiloista (erä 99).
   Kutsutaan: node scripts/i18n_luo_gemini_era.cjs --osio=seura_muodot [--savutesti=<savutestin tulos.json>] --tiedosto=docs/i18n/sv_kaannoserae_N_gemini.json
   Rivit = MUODOT alla: kehitystilanteen ensinäkymä (otsikon, lauseen ja Seuraavaksi-rivin muut muodot, jaksot, suodattimet, tilanimet,
   info- ja tekijäpaneelit, mittarit), Talentit-tason LAAJENNETTU ja Seuran kirjautumissivu. Avain = koodin tuleva reititysavain:
   suomenkielinen teksti, koodin muodostamat arvot paikkamerkkeinä {x}. Jokaisen rivin "neula" (koodin literaali) on löydyttävä lähteestä,
   muuten osio kaatuu (ei keksittyjä rivejä). Rivit, joilla on jo sv kartassa, josta Seura lukee (yhteinen tai henkilöstökartta), jätetään
   pois (vain reititys). --savutesti: tuotannon savutestin Seura-näkymien sv-löydökset (sv.uudet) lisätään samaan osioon.
   Code EI kirjoita ruotsia (CLAUDE.md §0): sv jää tyhjäksi; viite_sv = olemassa oleva käännös samasta tekstistä toisessa kartassa. */
'use strict';
const fs = require('fs');
const path = require('path');
const { viiteKartat } = require('./i18n_era_seura.cjs');

const LAHTEET = ['lib/tm_kehitystilanne.js', 'lib/tm_kehikot.js', 'TalentMaster_Seura.html'];   // + seura/*.js
const KT = 'Kehitystilanne', KTI = 'Kehitystilanne › ⓘ Miten luvut lasketaan', KTP = 'Kehitystilanne › Pelaajat kehittyvät (avattu)', KTM = 'Kehitystilanne › Valmennuksen laatu / Seura ja rakenteet (avattu)';
const KOOTTU = 'Koodi kokoaa lauseen: paikkamerkit {x} korvataan arvoilla (nimet, luvut, päivämäärät). Säilytä paikkamerkit sellaisinaan; järjestyksen saa vaihtaa.';
/* [avain, näkymä, elementti, neula (koodin literaali; oletus = avaimen pisin paikkamerkitön pala), huom?] */
const MUODOT = [
  // Otsikko (h2) — seuran tilanne kolmen tekijän mukaan
  ['Seura on menossa oikeaan suuntaan.', KT, 'otsikko (h2)'],
  ['Kaikilla kolmella alueella on tavoitteita, jotka jäävät vajaaksi.', KT, 'otsikko (h2)'],
  ['{alueet} jää tavoitteesta.', KT, 'otsikko (h2)', "'jää'", 'Yksi alue, esim. "Valmennuksen laatu jää tavoitteesta." ' + KOOTTU],
  ['{alueet} jäävät tavoitteesta.', KT, 'otsikko (h2)', "'jäävät'", 'Useampi alue, esim. "Valmennuksen laatu ja seuran rakenteet jäävät tavoitteesta." ' + KOOTTU],
  ['{hyvat} on raiteilla, {heikot} jää tavoitteesta.', KT, 'otsikko (h2)', "' raiteilla, '", 'Esim. "Pelaajakehitys on raiteilla, seuran rakenteet jää tavoitteesta." ' + KOOTTU],
  ['{hyvat} on raiteilla, {heikot} jäävät tavoitteesta.', KT, 'otsikko (h2)', "' raiteilla, '", KOOTTU],
  ['{hyvat} ovat raiteilla, {heikot} jää tavoitteesta.', KT, 'otsikko (h2)', "' raiteilla, '", KOOTTU],
  ['{hyvat} ovat raiteilla, {heikot} jäävät tavoitteesta.', KT, 'otsikko (h2)', "' raiteilla, '", KOOTTU],
  ['{lista} ja {viim}', KT, 'otsikon luettelo', "' ja '", 'Luettelon liitos: "Valmennuksen laatu, pelaajakehitys ja seuran rakenteet". ' + KOOTTU],
  ['Pelaajakehitys', KT, 'otsikon alueen nimi', null, 'Alueen lyhyt nimi otsikossa (keskellä lausetta pienellä alkukirjaimella).'],
  ['Valmennuksen laatu', KT, 'alueen nimi (kortti ja otsikko)'],
  ['Seura ja rakenteet', KT, 'alueen nimi (kortti)'],
  ['Seuran rakenteet', KT, 'otsikon alueen nimi', null, 'Alueen lyhyt nimi otsikossa (keskellä lausetta pienellä alkukirjaimella).'],
  // Lause ja Seuraavaksi
  ['{p} pelaajista kehittyy fyysisesti, tavoite {t}.', KT, 'tulkintalause', "' pelaajista kehittyy fyysisesti, tavoite '", 'Esim. "62 % pelaajista kehittyy fyysisesti, tavoite 70 %." ' + KOOTTU],
  ['Kirjaa testikierros joukkueelle {joukkue} – fyysisen kehityksen luku tarkentuu.', KT, 'Seuraavaksi', "'Kirjaa testikierros joukkueelle '", 'Yksi joukkue (monikko "joukkueille … ja …" käännettiin erässä 98).'],
  ['Kirjaa omaan tavoitteeseen: {mittari} – ei vielä kirjauksia.', KT, 'Seuraavaksi', "'Kirjaa omaan tavoitteeseen: '", '{mittari} = seuran oman tavoitteen nimi pienellä alkukirjaimella.'],
  ['Kirjaa Kori 3 -tiedot: {mittari} puuttuu (Palloliiton vaatimus).', KT, 'Seuraavaksi', "'Kirjaa Kori 3 -tiedot: '", '{mittari} = mittarin nimi pienellä alkukirjaimella (ks. mittarit alla).'],
  ['Kirjaa Kori 3 -tiedot: {mittari} puuttuu.', KT, 'Seuraavaksi', "'Kirjaa Kori 3 -tiedot: '", '{mittari} = mittarin nimi pienellä alkukirjaimella; ei Palloliiton vaatimusta.'],
  ['{mittari}: {arvo}, tavoite {tavoite} – ennusteella jää vajaaksi.', KT, 'Seuraavaksi ja alueen kortti', "' – ennusteella jää vajaaksi.'", 'Esim. "Harjoitushavainnot: 4, tavoite 12 – ennusteella jää vajaaksi." ' + KOOTTU],
  ['Pidä suunta: kaikki tavoitteet ovat raiteilla.', KT, 'Seuraavaksi'],
  // Yläpalkki ja suodattimet
  ['kevät {v}', KT, 'yläotsikko (jakso)', "'kevät '", '{v} = vuosi. Yläotsikko: "Kehitystilanne · kevät 2026 · päivitetty …".'],
  ['syksy {v}', KT, 'yläotsikko (jakso)', "'syksy '", 'Yläotsikko: "Kehitystilanne · syksy 2026 · päivitetty …" (koko vuosi käännettiin erässä 98).'],
  ['vertailu {kehikko}', KT, 'yläotsikko', "' · vertailu '", '{kehikko} = vertailukehikon nimi (esim. Palloliiton seurakriteerit). Yläotsikon viimeinen osa.'],
  ['Pojat', KT, 'suodatinnappi'],
  ['Tytöt', KT, 'suodatinnappi'],
  ['Koko vuosi {v}', KT, 'Jakso-valikko', "'Koko vuosi '", '{v} = vuosi (valikon vaihtoehto, isolla alkukirjaimella).'],
  ['Kevät {v}', KT, 'Jakso-valikko', "'Kevät '", '{v} = vuosi (valikon vaihtoehto).'],
  ['Syksy {v}', KT, 'Jakso-valikko', "'Syksy '", '{v} = vuosi (valikon vaihtoehto).'],
  ['Lapsuus (U8–U12)', KT, 'Ikävaihe-valikko'],
  ['Nuoruus (U13–U15)', KT, 'Ikävaihe-valikko'],
  ['Erikoistuminen (U16–U19)', KT, 'Ikävaihe-valikko'],
  // Tilat (rengas, kortit, paneelit)
  ['Täyttynyt', KT, 'tilamerkki', null, 'Tavoitteen tila. Ruudunlukijan tekstissä myös pienellä: "2 täyttynyt, 1 riskissä".'],
  ['✓ Täyttynyt', KT, 'tilamerkki'],
  ['Raiteilla', KT, 'tilamerkki'],
  ['Riskissä', KT, 'tilamerkki'],
  ['Puuttuu', KT, 'tilamerkki'],
  // Info-paneeli
  ['ⓘ Miten luvut lasketaan', KT, 'nappi'],
  ['Laskentaperiaatteet', KTI, 'paneelin otsikko'],
  ['Tila lasketaan seuran omaa tavoitetta vasten; {kehikko} -taso näkyy vertailuna. Tekijän tila on sen heikoimman tavoitteen tila.', KTI, 'kappale', '<p>Tila lasketaan seuran omaa tavoitetta vasten; ', '{kehikko} = vertailukehikon nimi tai "Palloliiton" (ks. alla).'],
  ['Palloliiton', KTI, 'kappaleen {kehikko}', "'Palloliiton'", 'Kun vertailukehikkoa ei ole asetettu: "Palloliiton -taso näkyy vertailuna".'],
  ['Fyysiset luvut nojaavat TalentMasterin normeihin: todellinen muutos (SWC = 0,2 × SD normirajoista) ja ikätaso (normi luettuna pelaajan tarkalla iällä). Merkintä "Alustava", kunnes kerroin on vahvistettu. Kasvupyrähdyksessä olevaa ei verrata.', KTI, 'kappale'],
  ['Alle viiden pelaajan ryhmistä ei näytetä prosentteja. Ei arvioitu ei ole nolla. Ei terveystietoa. Ennuste on lineaarinen kalenterivuoden loppuun.', KTI, 'kappale'],
  ['Datan kattavuus', KTI, 'paneelin otsikko'],
  ['Pelaajia, joilla testi alle 12 kk', KTI, 'kattavuusrivi'],
  ['Pelaajia, joilla kypsyysarvio alle 12 kk', KTI, 'kattavuusrivi'],
  ['Joukkueita, joilla havaintoja jaksolla', KTI, 'kattavuusrivi'],
  // Alueiden kortit
  ['Ei vielä dataa: tarvitaan kaksi testikierrosta.', KT, 'alueen kortti (Pelaajat kehittyvät)'],
  ['kehittyy fyysisesti, tavoite {t}.', KT, 'alueen kortti (Pelaajat kehittyvät)', "'kehittyy fyysisesti'", 'Jatkaa isoa prosenttilukua: "62 %" + "kehittyy fyysisesti, tavoite 70 %."'],
  ['kehittyy fyysisesti.', KT, 'alueen kortti (Pelaajat kehittyvät)', "'kehittyy fyysisesti'", 'Jatkaa isoa prosenttilukua ilman tavoitetta.'],
  ['Ikätasoon nähden {p} vähintään vaadittua vauhtia.', KT, 'alueen kortti (Pelaajat kehittyvät)', "' Ikätasoon nähden '", '{p} = prosentti, esim. "Ikätasoon nähden 55 % vähintään vaadittua vauhtia."'],
  ['raiteilla.', KT, 'alueen kortti', "'raiteilla.'", 'Jatkaa lukua "3 / 4": "3 / 4 raiteilla."'],
  ['{mittari} puuttuu, Palloliiton vaatimus.', KT, 'alueen kortti', "', Palloliiton vaatimus.'", KOOTTU],
  ['{mittari} puuttuu.', KT, 'alueen kortti', "' puuttuu'", KOOTTU],
  ['Sulje ‹', KT, 'alueen kortin linkki (auki)'],
  // Pelaajat kehittyvät -paneeli
  ['Pelaajat kehittyvät · fyysinen', KTP, 'paneelin otsikko'],
  ['Oliko muutos todellinen?', KTP, 'otsikko (h3)'],
  ['parani {p} ({n} / {N})', KTP, 'testirivi', "'parani '", 'Esim. "parani 40,0 % (4 / 10)".'],
  ['parani', KTP, 'jakaumapalkin selite', "'parani'", 'Selite + lukumäärä: "parani 4".'],
  ['vaihtelun sisällä', KTP, 'jakaumapalkin selite'],
  ['laski', KTP, 'jakaumapalkin selite', "'laski'"],
  ['ei vertailukelpoinen', KTP, 'jakaumapalkin selite'],
  ['Fyysisiä testejä ei ole kirjattu.', KTP, 'tyhjä tila'],
  ['Kaksi testikierrosta 8 vk – 15 kk välein tuo luvun.', KTP, 'tyhjä tila'],
  ['Kehittyykö vaadittua vauhtia?', KTP, 'otsikko (h3)'],
  ['Kalenteri-ikä', KTP, 'vaihtonappi'],
  ['Kehitysvaihe', KTP, 'vaihtonappi'],
  ['Vähintään vaadittua vauhtia', KTP, 'rivi'],
  ['kehitysvaihe (biologinen ikä, arvio)', KTP, 'selite'],
  ['{n} ilman kypsyysarviota → kalenteri-ikä', KTP, 'selite', "' ilman kypsyysarviota → kalenteri-ikä'", '{n} = pelaajamäärä.'],
  ['kalenteri-ikä mittauspäivänä', KTP, 'selite'],
  ['{n} normitaulukon ulkopuolella (lähin ikäluokka)', KTP, 'selite', "' normitaulukon ulkopuolella (lähin ikäluokka)'", '{n} = pelaajamäärä.'],
  ['nopeammin', KTP, 'jakaumapalkin selite', "'nopeammin'"],
  ['vaaditussa tahdissa', KTP, 'jakaumapalkin selite'],
  ['hitaammin', KTP, 'jakaumapalkin selite', "'hitaammin'"],
  ['Ikätasoa ei voi vielä verrata.', KTP, 'tyhjä tila'],
  ['Tarvitaan kaksi testikierrosta (30 m, CMJ tai MAS).', KTP, 'tyhjä tila'],
  ['Normi luetaan pelaajan biologisella iällä: varhain kypsyvää verrataan vanhempiin, myöhään kypsyvää nuorempiin. Vaatii kypsyysmittauksen.', KTP, 'selitekappale'],
  ['Vaadittu vauhti tulee normeista: normi luetaan pelaajan tarkalla iällä, joten pelkkä ikääntyminen vaatii parannusta (esim. tason 3 pitäminen 30 m:llä noin 0,1 s vuodessa).', KTP, 'selitekappale'],
  ['Parani', KTP, 'taulukon sarake', '<th>Parani</th>'],
  ['Kehityssuunnitelma', KTP, 'taulukon sarake', '<th>Kehityssuunnitelma</th>'],
  ['alle 5', KTP, 'taulukon solu', "'alle 5'", 'Alle viiden pelaajan joukkue: prosenttia ei näytetä.'],
  ['Joukkueesta aukeavat pelaajarivit ja niistä pelaajakortti.', KTP, 'taulukon alaviite'],
  ['Seuran omat tavoitteet', KTP, 'otsikko (h3)'],
  ['Liian pieni ryhmä (N = {n})', KTP, 'testirivi', 'Liian pieni ryhmä (N = ', '{n} = ryhmän koko (alle 5).'],
  // Valmennus / Seura -paneelit ja tavoiterivit
  ['Omat tavoitteet ja Palloliiton taso', KTM, 'paneelin otsikko'],
  ['Rakenteet ja Kori 3 -vaatimukset', KTM, 'paneelin otsikko'],
  ['Tavoitteita ei ole.', KTM, 'tyhjä tila'],
  ['Aseta tavoitteet tai kirjaa Kori 3 -tiedot.', KTM, 'tyhjä tila'],
  ['Ei vielä dataa.', KTM, 'tyhjän tilan alku (lihavoitu)', "'<div class=\"kt-tyhjatila\"><b>Ei vielä dataa.</b> '"],
  ['vaatimus', KTM, 'tavoiterivi', "'vaatimus'", 'Kyllä/ei-tyyppinen vaatimus ilman lukua.'],
  ['tavoite {arvo}', KTM, 'tavoiterivi', "'tavoite '", '{arvo} = tavoitearvo, esim. "tavoite 12" tai "tavoite 80 %".'],
  ['Palloliitto: oma tavoite', KTM, 'tavoiterivi'],
  ['Palloliitto {arvo}', KTM, 'tavoiterivi', "'Palloliitto '", 'Palloliiton taso tälle mittarille, esim. "Palloliitto 12".'],
  ['Kirjaa ›', KTM, 'linkki (oma tavoite)'],
  ['oma tavoite', KTM, 'tavoiterivin lähde', "'oma tavoite'"],
  ['aikaraja {pvm}', KTM, 'tavoiterivin lähde', "' · aikaraja '", '{pvm} = päivämäärä: "oma tavoite · aikaraja 31.12.2026 · 3 kirjausta".'],
  ['{n} kirjaus', KTM, 'tavoiterivin lähde', "'kirjaus'", 'Yksikkö: "1 kirjaus".'],
  ['{n} kirjausta', KTM, 'tavoiterivin lähde', "'kirjausta'", 'Monikko: "3 kirjausta".'],
  ['Kyllä', KTM, 'tavoiterivin arvo', "'Kyllä'"],
  ['Kausikuva tallennettu', KT, 'nappi (ei käytössä)', '>Kausikuva tallennettu</button>'],
  ['Kauden kausikuva on jo tallennettu (muuttumaton)', KT, 'napin title-vihje'],
  ['Piilota kaikki luvut ‹', KT, 'nappi (Kaikki luvut auki)'],
  // Mittarit (lib/tm_kehikot.js): tavoiterivin nimi ja lähde
  ['Harjoitushavainnot', KTM, 'mittarin nimi'],
  ['Valmentajien innostavuus', KTM, 'mittarin nimi'],
  ['Pelaajat liikkeessä', KTM, 'mittarin nimi'],
  ['Havainnot, joissa liikkeessä ≥ 80 %', KTM, 'mittarin nimi'],
  ['Valmentajakohtaamiset', KTM, 'mittarin nimi'],
  ['Ydintaitojen koulutustapahtumat', KTM, 'mittarin nimi'],
  ['Lisenssikoulutussuoritukset', KTM, 'mittarin nimi'],
  ['Roolit ja omavastuu', KTM, 'mittarin nimi'],
  ['Yhteistyöseurat', KTM, 'mittarin nimi'],
  ['T3-ohjelma', KTM, 'mittarin nimi'],
  ['Pelaajista kehittyy fyysisesti', KTP, 'mittarin nimi'],
  ['TalentMasterin normeista (alustava)', KTP, 'mittarin lähde'],
  ['harjoitusarvioinnit, malli Palloliitto', KTM, 'mittarin lähde'],
  ['keskiarvo 0–10', KTM, 'mittarin lähde'],
  ['osuus harjoitusajasta', KTM, 'mittarin lähde'],
  ['osuus havainnoista', KTM, 'mittarin lähde'],
  ['havainnointi, itsereflektio ja mentorointi', KTM, 'mittarin lähde'],
  ['kirjattu käsin', KTM, 'mittarin lähde'],
  ['kpl', KTM, 'mittarin yksikkö', "'kpl'", 'Lukumäärän yksikkö luvun perässä: "12 kpl".'],
  // Talentit
  ['LAAJENNETTU', 'Talentit', 'taulukon taso (isoilla kirjaimilla)', 'taso.toUpperCase()', 'Talenttiohjelman taso "laajennettu" isoilla kirjaimilla (koodi muuttaa isoiksi). Pari: PERUS (erä 98).'],
  // Kirjautumissivu (ennen kirjautumista; kieli = selaimen valinta, seuran kieltä ei vielä tiedetä)
  ['Sähköposti', 'Kirjautuminen', 'kentän otsikko', '>Sähköposti<'],
  ['Salasana', 'Kirjautuminen', 'kentän otsikko', '>Salasana<'],
  ['Unohditko salasanan?', 'Kirjautuminen', 'linkki'],
  ['Jos työsähköposti estää linkin, pyydä valmennuspäällikköä jakamaan se WhatsAppilla.', 'Kirjautuminen', 'ohjeteksti'],
  ['vp@seura.fi', 'Kirjautuminen', 'kentän esimerkkiteksti (placeholder)', 'placeholder="vp@seura.fi"', 'Esimerkkiosoite. Jos ei käännetä, merkitse sv = fi ja huom "ei käännetä".'],
];

const norm = (s) => String(s).replace(/\s+/g, ' ').trim();
function tiedostot(juuri) {
  let osat = []; try { osat = fs.readdirSync(path.join(juuri, 'seura')).filter((f) => f.endsWith('.js')).sort().map((f) => 'seura/' + f); } catch (e) { /* ei osia */ }
  return [...LAHTEET, ...osat];
}
/* Neula → ensimmäinen ei-kommenttirivi (kommenttilohkot tyhjiksi, rivinumerot säilyvät). */
function etsi(juuri, neula) {
  for (const f of tiedostot(juuri)) {
    let s; try { s = fs.readFileSync(path.join(juuri, f), 'utf8'); } catch (e) { continue; }
    const tyhjaksi = (m) => m.replace(/[^\n]/g, ' ');
    const hh = s.replace(/\/\*[\s\S]*?\*\//g, tyhjaksi).replace(/<!--[\s\S]*?-->/g, tyhjaksi).split('\n'), rr = s.split('\n');
    for (let i = 0; i < hh.length; i++) { if (/^\s*\/\//.test(hh[i])) continue; const j = hh[i].indexOf(neula); if (j >= 0) return { lahde: f + ':' + (i + 1), lahde_rivi: norm(rr[i].slice(Math.max(0, j - 80), j + neula.length + 80)).slice(0, 240) }; }
  }
  return null;
}
const oletusNeula = (k) => { const p = k.split(/\{\w+\}/).map((x) => x.trim()).filter(Boolean).sort((a, b) => b.length - a.length)[0]; return p; };

/* Palauttaa { rivit, reititettavat (jo kartassa, josta Seura lukee), virheet }. opts: juuri, vanhat, savutesti (tulos-objekti). */
function muotoRivit(opts) {
  opts = opts || {};
  const juuri = opts.juuri || path.join(__dirname, '..'), vanhat = opts.vanhat || {}, virheet = [], reititettavat = [];
  const kartta = (f, n) => { try { return (require(path.join(juuri, f))[n] || {}).sv || {}; } catch (e) { return {}; } };
  const seuranKartat = [kartta('lib/tm_i18n_common.js', 'TM_I18N_COMMON'), kartta('lib/tm_henkilosto_i18n.js', 'TM_HENKILOSTO_I18N')];
  const viitteet = viiteKartat(juuri), rivit = {};
  const lisaa = (fi, nakyma, elementti, L, huom) => {
    if (seuranKartat.some((m) => typeof m[fi] === 'string' && m[fi])) { reititettavat.push(fi); return; }
    if (rivit[fi]) { if (!rivit[fi].nakyma.includes(nakyma)) rivit[fi].nakyma.push(nakyma); return; }
    const r = { fi, nakyma: [nakyma], elementti, lahde: L ? L.lahde : null, lahde_rivi: L ? L.lahde_rivi : null }, h = huom ? [huom] : [];
    const v = viitteet.find((x) => x.fi === fi);
    if (v) { r.viite_sv = { sv: v.sv, lahde: v.lahde }; h.push('Sama teksti on jo käännetty toisessa kartassa (viite_sv). Käytä samaa, ellei Seuran asiayhteys vaadi toista.'); }
    if (h.length) r.huom = h;
    r.sv = (vanhat[fi] && typeof vanhat[fi].sv === 'string') ? vanhat[fi].sv : '';
    rivit[fi] = r;
  };
  for (const [fi, nakyma, elementti, neula, huom] of MUODOT) {
    const L = etsi(juuri, neula || oletusNeula(fi));
    if (!L) { virheet.push(fi + ': neulaa ' + JSON.stringify(neula || oletusNeula(fi)) + ' ei löydy lähteestä (' + tiedostot(juuri).join(', ') + ')'); continue; }
    lisaa(fi, nakyma, elementti, L, huom);
  }
  // Tuotannon savutesti: Seura-näkymien sv-löydökset (kieli sv, sv.uudet) samaan osioon
  for (const n of ((opts.savutesti && opts.savutesti.nakymat) || [])) {
    if (n.kieli !== 'sv' || !/^Seura\b/.test(n.nimi || '')) continue;
    for (const t of ((n.sv && n.sv.uudet) || [])) lisaa(norm(t), n.nimi.replace(/^Seura\s+/, '') + ' (tuotannon savutesti)', null, null, 'Löytyi tuotannon savutestistä (koodi muodostaa tekstin; luvut ja nimet ovat esimerkkidataa).');
  }
  return { rivit, reititettavat, virheet };
}

const KONTEKSTI = 'HENKILÖKUNTA — Seurahallinta (TalentMaster_Seura.html; VP, seurasihteeri, urheilutoimenjohtaja). Jatkoa erälle 98: tekstit, joita mittaus ei nähnyt '
  + 'testiseuran tilasta. Kehitystilanne-näkymän otsikon, tulkintalauseen ja Seuraavaksi-rivin muut muodot, jaksot ja suodattimet, tilanimet, info-paneeli ("ⓘ Miten luvut lasketaan"), '
  + 'avattavat aluepaneelit (Pelaajat kehittyvät, Valmennuksen laatu, Seura ja rakenteet) ja mittareiden nimet; Talentit-taulukon taso LAAJENNETTU; Seuran kirjautumissivu. '
  + 'Avain = suomenkielinen teksti; {x} = koodin muodostama arvo (nimi, luku, päivämäärä): säilytä paikkamerkit, järjestyksen saa vaihtaa. nakyma = missä teksti näkyy, '
  + 'elementti = kohta, lahde + lahde_rivi = koodirivi. viite_sv = sama teksti on jo käännetty toisessa kartassa. Termit kuten erässä 98 '
  + '(Kehitystilanne, raiteilla, Kori 3, Palloliitto: sama käännös kuin palautuksessa 98). Sävy: asiallinen hallintokieli. Emojit ja välimerkit säilytetään.';

module.exports = { muotoRivit, MUODOT, KONTEKSTI, etsi, oletusNeula };
