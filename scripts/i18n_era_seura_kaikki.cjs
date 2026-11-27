/* B12 (PM 8.11.2026): käännöserän osio "seura_kaikki" — Seurahallinnan Kehitystilanne › "Kaikki luvut ›" -näkymä (lib/tm_kehitystilanne.js renderNakyma:
   yläpalkki ja suodattimet, Lohko 1–4, selitteet) sekä erän 99 jäljelle jääneet: Alustava, Ei, Viimeisin testi, Kaikki ikävaiheet, meta- ja tilamerkit (erä 100).
   Kutsutaan: node scripts/i18n_luo_gemini_era.cjs --osio=seura_kaikki --tiedosto=docs/i18n/sv_kaannoserae_N_gemini.json
   Sama koneisto kuin seura_muodot (scripts/i18n_era_seura_muodot.cjs): avain = tuleva reititysavain (fi; koodin arvot paikkamerkkeinä {x}); neulan
   on löydyttävä lähteestä; rivit, joilla on jo sv kartassa, josta Seura lukee, jäävät pois (vain reititys). Tulostettavat raportit (raporttiHTML) EIVÄT
   kuulu tähän erään (PM: oma erä myöhemmin; Palloliitto-raportti pysyy suomeksi). Mallin kehotteet (Lohko 4) ovat mallin tuottamia lauseita.
   Code EI kirjoita ruotsia (CLAUDE.md §0): sv jää tyhjäksi. */
'use strict';
const M = require('./i18n_era_seura_muodot.cjs');

const K = 'Kehitystilanne › Kaikki luvut', Y = K + ' › yläpalkki', L1 = K + ' › Lohko 1 · Seuran tavoitteet', L2 = K + ' › Lohko 2 · Pelaajakehitys', L3 = K + ' › Lohko 3 · Joukkueet', L4 = K + ' › Lohko 4 · Datan kattavuus';
const KOOTTU = 'Koodi kokoaa tekstin: paikkamerkit {x} korvataan arvoilla (nimet, luvut, päivämäärät). Säilytä paikkamerkit sellaisinaan; järjestyksen saa vaihtaa.';
const PALA = 'Osa pidempää riviä: palat erotetaan pisteellä " · ".';
const SAMA = 'Sama avain myös ensinäkymässä (erä 98/99).';
/* [avain, näkymä, elementti, neula (koodin literaali; oletus = avaimen pisin paikkamerkitön pala), huom?] */
const KAIKKI = [
  // Yläpalkki, toiminnot ja suodattimet
  ['Kehitystilanne · seuran omat tavoitteet · vertailu: {kehikko}', Y, 'yläotsikko (eyebrow)', 'Kehitystilanne · seuran omat tavoitteet · vertailu: ', '{kehikko} = vertailukehikon nimi, esim. "Palloliitto Kori 3". ' + KOOTTU],
  ['tukikausi {kausi}', Y, 'yläotsikko (kehikon jatke)', "' · tukikausi '", '{kausi} = vuosi. ' + PALA],
  ['Palloliiton kori ei asetettu', Y, 'yläotsikko (kun kehikkoa ei ole)'],
  ['Saavutammeko tavoitteemme ja kehittyvätkö pelaajat?', Y, 'sivun otsikko (h1)'],
  ['laskettu seuran omasta datasta {pvm}', Y, 'meta-rivi', "' · laskettu seuran omasta datasta '", 'Rivi: "<seura> · laskettu seuran omasta datasta 8.11.2026 · N < 5 -ryhmien prosentit piilotettu · pelaajia 120". ' + PALA],
  ['N < 5 -ryhmien prosentit piilotettu', Y, 'meta-rivi', null, PALA],
  ['pelaajia {n}', Y, 'meta-rivi', "piilotettu · pelaajia '", '{n} = pelaajamäärä (suodatettuna "{n} / kaikki"). ' + PALA],
  ['Vie raportti', Y, 'toimintonappi', '>Vie raportti<', 'Avaa tulostettavan seuran raportin (raportti itse on oma eränsä).'],
  ['Palloliitto-raportti', Y, 'toimintonappi', '>Palloliitto-raportti<', 'Avaa Palloliitolle menevän raportin (raportti pysyy suomeksi).'],
  ['Sukupuoli', Y, 'suodattimen otsikko', "valinta('Sukupuoli'"],
  ['Ikävaihe', Y, 'suodattimen otsikko', "valinta('Ikävaihe'"],
  ['Jakso', Y, 'suodattimen otsikko', "valinta('Jakso'"],
  ['Kaikki ikävaiheet', Y, 'suodattimen valinta'],
  ['Kevät {v} (1.1.–30.6.)', Y, 'suodattimen valinta', "' (1.1.–30.6.)'", '{v} = vuosi. ' + KOOTTU],
  ['Syksy {v} (1.7.–31.12.)', Y, 'suodattimen valinta', "' (1.7.–31.12.)'", '{v} = vuosi. ' + KOOTTU],
  // Lohko 1
  ['Lohko 1 · Seuran tavoitteet {v}', L1, 'kortin otsikko', "Lohko 1 · Seuran tavoitteet ", '{v} = vuosi.'],
  ['{n} täyttynyt', L1, 'kortin laskuri', "lk.tayttynyt + ' täyttynyt", '{n} = lukumäärä. Laskurit: "3 täyttynyt · 2 raiteilla · 1 riskissä · 1 puuttuu". ' + PALA],
  ['{n} raiteilla', L1, 'kortin laskuri', "lk.raiteilla + ' raiteilla", '{n} = lukumäärä. ' + PALA],
  ['{n} riskissä', L1, 'kortin laskuri', "lk.riskissa + ' riskissä", '{n} = lukumäärä. ' + PALA],
  ['{n} puuttuu', L1, 'kortin laskuri', "lk.puuttuu + ' puuttuu'", '{n} = lukumäärä. ' + PALA],
  ['Palloliiton seuraava arviointi {pvm}', L1, 'kortin laskuri', "' · Palloliiton seuraava arviointi '", '{pvm} = päivämäärä. ' + PALA],
  ['Seura ei ole asettanut omia tavoitteita: tavoitteena käytetään Palloliiton tasoja.', L1, 'ohjeteksti'],
  ['Mittari', L1, 'taulukon sarake', '<th>Mittari</th>'],
  ['Toteuma', L1, 'taulukon sarake', '<th>Toteuma</th>'],
  ['Seuran tavoite', L1, 'taulukon sarake', '<th>Seuran tavoite</th>'],
  ['Palloliiton taso', L1, 'taulukon sarake', '<th>Palloliiton taso</th>'],
  ['Ennuste 31.12.', L1, 'taulukon sarake', '<th>Ennuste 31.12.</th>'],
  ['Tila', L1, 'taulukon sarake', '<th>Tila</th>'],
  ['Ei vielä kirjauksia', L1, 'solu (oma tavoite ilman kirjauksia)', '>Ei vielä kirjauksia<'],
  ['Puuttuu — kirjaa Kori 3 -tiedot', L1, 'solu (käsin kirjattava puuttuu)'],
  ['Liian pieni ryhmä', L1, 'solu ja tilamerkki', '>Liian pieni ryhmä<', 'Alle 5 pelaajan ryhmä: prosenttia ei näytetä.'],
  ['(Palloliiton taso)', L1, 'solu (seura ei ole asettanut tavoitetta)'],
  ['Kirjattu {pvm}', L1, 'mittarin meta', "'<span class=\"kt-meta\">Kirjattu'", '{pvm} = päivämäärä (voi puuttua: silloin pelkkä "Kirjattu"). ' + KOOTTU],
  ['Kirjattu', L1, 'mittarin meta', "'<span class=\"kt-meta\">Kirjattu'", 'Ilman päivämäärää.'],
  ['Mitattu', L1, 'mittarin meta', "'Mitattu'", 'Rivi: "N 24 · 3.10.2026 · Mitattu".'],
  ['Alustava', K, 'mittarin meta ja merkintä', "'Alustava'", 'Laskenta nojaa alustaviin normeihin. Näkyy myös ensinäkymässä (" · Alustava").'],
  ['Täyttyy', L1, 'solu (kyllä/ei-tavoite)', "'Täyttyy'"],
  ['Ei', K, 'solu (kyllä/ei-tavoite)', "'Täyttyy' : 'Ei'", 'Vastakohta: "Täyttyy" (Lohko 1) ja "Kyllä" (erä 99). ' + SAMA],
  ['Tila lasketaan seuran tavoitetta vasten; Palloliiton taso näkyy vertailuna (myös sen tila, jos seuran tavoite on matalampi). Ennuste = lineaarinen kalenterivuoden loppuun (omilla tavoitteilla aikarajaan). Kohtaamiset = havainnoinnit, itsereflektiot ja mentorointiviestit; lisenssit, tapahtumat, roolit, yhteistyöseurat ja T3 kirjataan käsin.', L1, 'selite (kortin alla)', 'Tila lasketaan seuran tavoitetta vasten; Palloliiton taso näkyy vertailuna'],
  ['mentorointiviestit eivät näy tälle roolille', L1, 'mittarin huomautus (Valmentajakohtaamiset)'],
  // Lohko 2
  ['Lohko 2 · Pelaajakehitys D1–D5', L2, 'kortin otsikko'],
  ['Kehittyvien pelaajien osuus: {osuus}', L2, 'kortin yhteenveto', 'Kehittyvien pelaajien osuus: ', '{osuus} = prosentti ja "n / N" (tai "Liian pieni ryhmä"). ' + KOOTTU],
  ['D1 Fyysinen · testikohtainen muutos (SWC)', L2, 'alakortin otsikko'],
  ['diagnostiikka', L2, 'testin merkintä', '>diagnostiikka<', 'Testi, joka ei ole avaintesti (vain diagnostinen).'],
  ['viimeisin mittaus {pvm}', L2, 'testin meta', "' · viimeisin mittaus '", 'Rivi: "N 18 · viimeisin mittaus 3.10.2026 · testiväli mediaani 6 kk · Alustava". ' + PALA],
  ['testiväli mediaani {kk}', L2, 'testin meta', "' · testiväli mediaani '", '{kk} = esim. "6 kk". ' + PALA],
  ['{n} kk', L2, 'testin meta', "' kk' : '—'", 'Kuukausia, esim. "6 kk".'],
  ['pitkä testiväli (yli 9 kk): {n}', L2, 'testin meta', "' · pitkä testiväli (yli 9 kk): '", '{n} = pelaajamäärä. ' + PALA],
  ['SWC seuran hajonnasta: {n}', L2, 'testin meta', "' · SWC seuran hajonnasta: '", '{n} = testien määrä. SWC = pienin merkityksellinen muutos. ' + PALA],
  ['Kirjaa kaksi testikierrosta (8 vk – 15 kk välein), niin muutos lasketaan.', L2, 'tyhjä tila (ohje)'],
  ['↑ vahva (≥ SWC) · → vaihtelun sisällä · ↓ heikkeni · – ei vertailukelpoinen (kasvupyrähdys, ei paria, väli < 8 vk tai > 15 kk). SWC = 0,2 × SD, SD johdettu ikäluokan normirajoista (alustava oletus); CV-raja ei vielä käytössä. Kasvupyrähdyksessä olevia ei lasketa heikentyneiksi (§28).', L2, 'selite (D1 Fyysinen)', '↑ vahva (≥ SWC) · → vaihtelun sisällä', 'Nuolet ja lyhenteet (SWC, SD, CV, §28) säilytetään.'],
  ['D1 · Kehittyykö vaadittua vauhtia? ({viite})', L2, 'alakortin otsikko', "'D1 · Kehittyykö vaadittua vauhtia? ('", '{viite} = "kalenteri-ikä" tai "kehitysvaihe, arvio". ' + KOOTTU],
  ['kalenteri-ikä', L2, 'alakortin otsikon viite', "'kalenteri-ikä')", 'Pienellä alkukirjaimella sulkeissa.'],
  ['kehitysvaihe, arvio', L2, 'alakortin otsikon viite', "'kehitysvaihe, arvio'"],
  ['Nopeammin kuin ikätason odotus: {n}', L2, 'jakauma', 'Nopeammin kuin ikätason odotus: ', '{n} = pelaajamäärä. ' + PALA],
  ['Ikätason tahdissa: {n}', L2, 'jakauma', 'Ikätason tahdissa: ', '{n} = pelaajamäärä. ' + PALA],
  ['Hitaammin: {n}', L2, 'jakauma', ' · Hitaammin: ', '{n} = pelaajamäärä. ' + PALA],
  ['Ei vertailukelpoinen: {n}', L2, 'jakauma', ' · Ei vertailukelpoinen: ', '{n} = pelaajamäärä. ' + PALA],
  ['Nopeammin-osuus {osuus}', L2, 'jakauman meta', 'Nopeammin-osuus ', '{osuus} = prosentti ja "n / N". ' + KOOTTU],
  ['H-H-tasoa ei ole kahdelta testikierrokselta.', L2, 'tyhjä tila (syy)', null, 'H-H = Eerikkilän ikätasotaulukko (lyhenne säilytetään).'],
  ['Kahdesta kierroksesta syntyy vertailu.', L2, 'tyhjä tila (ohje)'],
  ['Eri asia kuin SWC: normi luetaan pelaajan tarkalla iällä (interpoloitu), joten tammikuun ikäluokan vaihto ei laske tasoa. Δ ≥ +0,5 tasoa = nopeammin, ±0,5 = vaaditussa tahdissa. Alustava.', L2, 'selite (Kehittyykö vaadittua vauhtia?)', 'Eri asia kuin SWC: normi luetaan pelaajan tarkalla iällä'],
  ['D2–D5 · Arvioiden kehitys (kaksi viimeisintä arviointikertaa)', L2, 'alakortin otsikko'],
  ['D2 Tekninen', L2, 'ulottuvuus', "D2: 'D2 Tekninen'"],
  ['D3 Psyykkinen', L2, 'ulottuvuus', "'D3 Psyykkinen'"],
  ['D4 Peliäly', L2, 'ulottuvuus', "'D4 Peliäly'"],
  ['D5 Sosiaalinen', L2, 'ulottuvuus', "'D5 Sosiaalinen'"],
  ['Ei vielä dataa (tarvitaan kaksi arviointikertaa)', L2, 'tyhjä tila'],
  ['viimeisin {pvm}', L2, 'meta', "'viimeisin ' + esc(pvmFi(d.pvm))", '{pvm} = päivämäärä.'],
  ['Muutos ≥ ±0,5 asteikolla 1–5. Ei arvioitu ei ole nolla.', L2, 'selite (D2–D5)'],
  ['Kypsyys', L2, 'alakortin otsikko', "kortti('Kypsyys'"],
  ['PHV-arvio alle 12 kk', L2, 'rivi'],
  ['Kasvupyrähdyksessä (PH)', L2, 'rivi', null, 'PH = Mirwaldin PHV-vaihe (lyhenne säilytetään).'],
  ['Myöhään kypsyvät (PRE/LAH) talenttiohjelmassa', L2, 'rivi', null, 'PRE/LAH = PHV-vaiheet (lyhenteet säilytetään).'],
  ['… koko pelaajistossa', L2, 'rivi (edellisen jatke)'],
  ['Syntymäkvartaalit (RAE)', L2, 'alakortin otsikko', null, 'RAE = suhteellisen iän vaikutus (lyhenne säilytetään); Q1–Q4 = vuosineljännekset.'],
  ['Ei vielä dataa (syntymäajat puuttuvat)', L2, 'tyhjä tila'],
  ['Kaikki', L2, 'rivi', "<span>Kaikki</span>", SAMA],
  ['Talenttiohjelma', L2, 'rivi', '<span>Talenttiohjelma</span>'],
  ['Kehityssuunnitelma', L2, 'alakortin otsikko', "kortti('Kehityssuunnitelma'", SAMA],
  ['Kehityssuunnitelmien kattavuus (vähintään yksi tavoite)', L2, 'rivi'],
  ['Vahvistetut sitoumukset', L2, 'rivi'],
  ['Pysähtyneet tavoitteet (yli 8 vk ilman edistystä)', L2, 'rivi'],
  ['Talentit', L2, 'alakortin otsikko', "kortti('Talentit'"],
  ['X-tekijä talenttiohjelmassa', L2, 'rivi'],
  ['Ei vielä dataa — X-tekijä-signaalia ei vielä kirjata järjestelmään', L2, 'tyhjä tila'],
  ['Vahvuuden jalostus (kehityssuunnitelman tavoite vahvuuteen)', L2, 'rivi'],
  ['Hidden Gem -tunnistukset', L2, 'rivi', null, 'Hidden Gem = TalentMasterin talenttisignaalin nimi.'],
  ['/ {n} arvioitavaa', L2, 'rivin luku', ' arvioitavaa</span>', 'Esim. "2 / 14 arvioitavaa". ' + KOOTTU],
  ['Liikkuvuuskartoitus (lapsuus, 1–3 p)', L2, 'alakortin otsikko'],
  ['Harjoitettavuuskartoitusta ei ole kirjattu.', L2, 'tyhjä tila (syy)'],
  ['Kartoitus Testaus-työkalulla (protokolla U10–12) tuo luvut.', L2, 'tyhjä tila (ohje)'],
  ['Omatoiminen liikunta (lapsuus, 12 vk)', L2, 'alakortin otsikko'],
  ['Kirjaavia pelaajia', L2, 'rivi'],
  ['Viikkoja kirjauksin (ka)', L2, 'rivi'],
  ['Täysiä viikkoja (7 pv)', L2, 'rivi'],
  ['Palloliiton vertailu: 7 pv × 12 vk · viimeisin {pvm}', L2, 'meta', 'Palloliiton vertailu: 7 pv × 12 vk · viimeisin ', '{pvm} = päivämäärä.'],
  ['Omatoimisia kirjauksia ei ole.', L2, 'tyhjä tila (syy)'],
  ['Pelaajat kirjaavat Pelaaja-sovelluksessa.', L2, 'tyhjä tila (ohje)'],
  ['Lapsuusvaiheen pelaajia {n}', L2, 'tyhjä tila (meta)', "'Lapsuusvaiheen pelaajia '", '{n} = pelaajamäärä.'],
  ['Toteutuneet harjoitustunnit / pelaaja / vk', L2, 'alakortin otsikko'],
  ['{n} vk', L2, 'rivin meta', "' vk</span>", 'Viikkoja, esim. "N 14 · 6 vk".'],
  ['Läsnäoloa ei ole kirjattu valitulla jaksolla.', L2, 'tyhjä tila (syy)'],
  ['Kun valmentaja merkitsee läsnäolon kalenteriin, tunnit lasketaan.', L2, 'tyhjä tila (ohje)'],
  ['Pysyvyys ja eteneminen', L2, 'alakortin otsikko'],
  ['Kahden kauden kausikuvat tallennettu — laskenta tulee versiossa 1.', L2, 'tila'],
  ['Kausikuva tallennettu {pvm} – pysyvyys näkyy kaudesta {kausi}.', L2, 'tyhjä tila', "' – pysyvyys näkyy kaudesta '", '{pvm} = päivämäärä, {kausi} = vuosi. ' + KOOTTU],
  ['Tallenna kausikuva kauden alussa.', L2, 'tyhjä tila (ohje)'],
  ['Kausikuvia: {n} / 2', L2, 'tyhjä tila (meta)', 'Kausikuvia: ', '{n} = 0 tai 1.'],
  ['Ei vielä laskettavissa', L2, 'alakortin otsikko'],
  ['Peliaika näkyy, kun otteluiden kokoonpanot ja minuutit kirjataan.', L2, 'tyhjä tila'],
  ['Peli-KPI:t näkyvät, kun otteluhavainnoinnit alkavat.', L2, 'tyhjä tila'],
  ['Pääluku lasketaan, kun kaksi pilaria on mitattu.', L2, 'tyhjä tila'],
  // Lohko 3
  ['Lohko 3 · Joukkueet', L3, 'kortin otsikko'],
  ['Joukkueen nimestä aukeavat pelaajarivit', L3, 'kortin ohje'],
  ['Joukkue', L3, 'taulukon sarake', '<th>Joukkue</th><th>N (P / T)', SAMA],
  ['N (P / T)', L3, 'taulukon sarake', null, 'P = pojat, T = tytöt.'],
  ['Fyysinen ↑', L3, 'taulukon sarake'],
  ['Kehityssuunnitelmien kattavuus', L3, 'taulukon sarake', '<th>Kehityssuunnitelmien kattavuus</th>'],
  ['Pysähtyneet', L3, 'taulukon sarake', '<th>Pysähtyneet</th>'],
  ['Havainnot', L3, 'taulukon sarake', '<th>Havainnot</th>'],
  ['Viimeisin testi', L3, 'taulukon sarake', '<th>Viimeisin testi</th>', 'Myös ensinäkymän joukkuetaulukossa.'],
  ['liian pieni ryhmä', L3, 'solu', '>liian pieni ryhmä<', 'Alle 5 pelaajan joukkue.'],
  ['Kehityssuunnitelma {n}', L3, 'pelaajarivi', "'Kehityssuunnitelma ' + x.idp", '{n} = tavoitteiden määrä.'],
  ['pysähtynyt', L3, 'pelaajarivi', "'pysähtynyt'"],
  ['Ei pelaajia valitulla suodatuksella.', L3, 'tyhjä tila'],
  // Lohko 4 + alaviite
  ['Lohko 4 · Datan kattavuus', L4, 'kortin otsikko'],
  ['Pelaajia, joilla testi alle 12 kk', L4, 'rivi', '<span>Pelaajia, joilla testi alle 12 kk</span>'],
  ['Harjoitushavainnot joukkueittain (jakso)', L4, 'rivi'],
  ['Mitä kirjaamalla luku paranee', L4, 'väliotsikko'],
  ['Ei puutteita valitulla suodatuksella.', L4, 'tyhjä tila'],
  ['{joukkue}: {n} / {N} pelaajalta puuttuu alle 12 kk vanha testi — testikierros nostaa fyysisen kehityksen kattavuutta.', L4, 'kehote (lista)', "' pelaajalta puuttuu alle 12 kk vanha testi", '{joukkue} = joukkueen nimi, {n} / {N} = pelaajat. ' + KOOTTU],
  ['{joukkue}: ei harjoitushavaintoja valitulla jaksolla.', L4, 'kehote (lista)', "': ei harjoitushavaintoja valitulla jaksolla.'", KOOTTU],
  ['Kasvumittaus puuttuu yli puolelta pelaajista (alle 12 kk): PHV-tila tarkentaa fyysisen kehityksen tulkintaa.', L4, 'kehote (lista)'],
  ['{mittari}: kirjaa Kori 3 -tiedot.', L4, 'kehote (lista)', "': kirjaa Kori 3 -tiedot.'", '{mittari} = mittarin nimi. ' + KOOTTU],
  ['Vertailukehikko {versio}', K, 'alaviite', '>Vertailukehikko ', '{versio} = kehikon versio tai nimi. Rivi: "Vertailukehikko Kori 3 / 2026 · SWC alustava (persentiilioletus) · ei arvioitu ≠ 0 · ei terveystietoa".'],
  ['SWC alustava (persentiilioletus) · ei arvioitu ≠ 0 · ei terveystietoa', K, 'alaviite'],
];

const KONTEKSTI = 'HENKILÖKUNTA — Seurahallinta (TalentMaster_Seura.html; VP, seurasihteeri, urheilutoimenjohtaja). Kehitystilanne › "Kaikki luvut ›": '
  + 'ensinäkymän alle avautuva yksityiskohtainen näkymä. Yläpalkki (otsikko, meta-rivi, toiminnot, suodattimet), Lohko 1 Seuran tavoitteet (taulukko + selite), '
  + 'Lohko 2 Pelaajakehitys D1–D5 (alakortit + selitteet), Lohko 3 Joukkueet (taulukko + pelaajarivit), Lohko 4 Datan kattavuus (kehotteet) ja alaviite. '
  + 'Jatkoa erille 98 ja 99: termit kuten niissä (Kehitystilanne, raiteilla, Kori 3, Palloliitto, kausikuva, kehityssuunnitelma). '
  + 'Avain = suomenkielinen teksti; {x} = koodin muodostama arvo (nimi, luku, päivämäärä): säilytä paikkamerkit, järjestyksen saa vaihtaa. '
  + 'Pisteellä " · " erotetut palat kootaan yhdelle riville. Lyhenteet (SWC, SD, CV, PHV, PH, PRE/LAH, RAE, H-H, D1–D5, KPI, T3, §28) säilytetään. '
  + 'nakyma = missä teksti näkyy, elementti = kohta, lahde + lahde_rivi = koodirivi. viite_sv = sama teksti on jo käännetty toisessa kartassa. '
  + 'Tulostettavat raportit eivät kuulu tähän erään (oma erä; Palloliitto-raportti pysyy suomeksi). Sävy: asiallinen hallintokieli. Emojit, nuolet ja välimerkit säilytetään.';

const muotoRivit = (opts) => M.muotoRivit(Object.assign({}, opts, { lista: KAIKKI, savutesti: null }));   // savutesti ei avaa "Kaikki luvut" -näkymää
module.exports = { muotoRivit, MUODOT: KAIKKI, KONTEKSTI };
