# Sibbo-valmius 1.11.2026 — sv-kattavuusraportti (15.10.2026)

Kaista: **Tero** (PR koskee HTML:ää, `scripts/`-kansiota ja `lib/tm_lib_i18n.js`:ää). Mittari: `node tools/i18n/sv_kattavuus.mjs [--md=… --json=…]` (vain luku; testi `tests/sv_kattavuus.test.js`).
Ajonaikainen mittaus: `node tools/i18n/sv_lapiajo.mjs` (demo-data, sv-tila; päivitetty tämän PR:n mukana). Code ei kirjoita ruotsia (§0).

## Tiivistelmä

- **Erät 51 ja 52 vietiin tässä PR:ssä** (palautukset `.sv_palautukset/` → `docs/i18n/`, `scripts/i18n_vie_sv_era51_52.cjs`, 134 riviä `lib/tm_lib_i18n.js`:ään, `?v=6→7` kuudella sivulla). Ne näkyvät raportissa ok:na, ei "odottaa".
- **Erä 53** (`docs/i18n/sv_kaannoserae_53_gemini.json`, 127 riviä, sv tyhjä): Masterin 8 aidosti puuttuvaa riviä · `tm_kt_sivu` 15 + `tm_kt_havainto` 14 (ks. löydös 2) · vientipohjan 33 tekstiä · reitittämättömän suomen sv-varaus (57 riviä, osiot `kovakoodatut.*`).
- **Pelaaja, Vanhempi, ADAR/Pelihavainto, tm_lang: 0 puuttuvaa sv-avainta.** Master 8, VP 0 uutta (37 on jo palautettu, ei viety), Kehitystyöpöytä 29 (lib-rivit, ks. löydös 2).
- **Kaksi kovakoodattua kokonaisuutta jää suomeksi sv-tilassa, vaikka erä 53 palaisi: harjoitusarviointilomake (45) ja suostumuslomakkeen dynaamiset viestit (46).** Reititys on HTML/lib-muutos → **ilmoitus ennen** (alla).

## Taulukko

| Näkymä | fi-avaimia | ok | puuttuu sv | odottaa palautusta (lähetetty erä) | palautettu, ei viety koodiin | kovakoodattu (staattinen; sv puuttuu / vain reititys) | kovakoodattu (ajonaik., UI) |
|---|---:|---:|---:|---:|---:|---:|---:|
| Pelaaja_v7 | 718 | 718 | **0** | 0 | 0 | **0** (0 / 0) | 4 (+ data? 3) |
| Vanhempi_v2 | 416 | 416 | **0** | 0 | 0 | **0** (0 / 0) | 7 (+ data? 11) |
| Master_v16 (valmentaja) | 1659 | 1636 | **23** | 0 | 0 | **0** (0 / 0) | 16 (+ data? 16) |
| VP_v25 | 3328 | 3276 | **15** | 0 | 37 | **0** (0 / 0) | 19 (+ data? 9) |
| ADAR_Pikakortti + Pelihavainto_Kentta | 572 | 572 | **0** | 0 | 0 | **0** (0 / 0) | 1 (+ data? 0) |
| Harjoitusarviointi (lib/tm_harjoitusarviointi.js, Master + VP) | 0 | 0 | **0** | 0 | 0 | **45** (23 / 22) | – |
| Suostumus- ja kutsuflow (Rekisterointi_Suostumus, Huoltajakutsu) | 67 | 67 | **0** | 0 | 0 | **46** (26 / 20) | – |
| Toimintakortti + kasvupyrähdys-fysiikka (#1073–1075) | 119 | 119 | **0** | 0 | 0 | **0** (0 / 0) | – |
| Kehitystyöpöytä (Kehitystyopoyta.html) | 155 | 126 | **29** | 0 | 0 | **8** (0 / 8) | – |

_fi-avaimia = tm_lang-ryhmän / lib-FI-karttojen / reititinkartan (masterT, vpT, tmHT, phT) avaimet, jotka näkymä lataa. "odottaa" = rivi on lähetetyssä erässä (ei yhtään: 51 ja 52 vietiin tässä PR:ssä), palautus puuttuu. Sama lib-avain voi näkyä usealla näkymällä._

## Odottaa palautusta (lähetetyt erät: ei yhtään)


## Palautettu Geminiltä, ei viety koodiin

- **VP_v25**: kartta.vp (palautus 19) 37

## Puuttuu sv (ei lähetettynä odottavassa erässä, ei palautettuna) → erä 53

- **Master_v16 (valmentaja)** · lib.tm_kt_sivu: 15 (jo lähetetyssä erässä 43 (sv tyhjä repossa) 15)
- **Master_v16 (valmentaja)** · kartta.master: 8 (ei missään lähetetyssä erässä 8)
- **VP_v25** · lib.tm_kt_sivu: 15 (jo lähetetyssä erässä 43 (sv tyhjä repossa) 15)
- **Kehitystyöpöytä (Kehitystyopoyta.html)** · lib.tm_kt_sivu: 15 (jo lähetetyssä erässä 43 (sv tyhjä repossa) 15)
- **Kehitystyöpöytä (Kehitystyopoyta.html)** · lib.tm_kt_havainto: 14 (jo lähetetyssä erässä 45 (sv tyhjä repossa) 14)

## Kovakoodattu suomi (ei i18n-reittiä) — staattinen, tiedosto:rivi

### Pelaaja_v7 — 0

### Vanhempi_v2 — 0

### Master_v16 (valmentaja) — 0

### VP_v25 — 0

### ADAR_Pikakortti + Pelihavainto_Kentta — 0

### Harjoitusarviointi (lib/tm_harjoitusarviointi.js, Master + VP) — 45
- `lib/tm_harjoitusarviointi.js:29` (KRITEERIT_A) [sv puuttuu] Vuorovaikutus aktiivista ja kannustavaa; palaute oppimista tukevaa; huomioi kaikki pelaajat
- `lib/tm_harjoitusarviointi.js:30` (KRITEERIT_A) [sv puuttuu] Pelaajat ovat harjoitusajasta liikkeessä
- `lib/tm_harjoitusarviointi.js:30` (KRITEERIT_A) [sv puuttuu] Liikkumisen määrä kellolla; aktiivinen lajinomainen liikkuminen, ei turhaa odottelua
- `lib/tm_harjoitusarviointi.js:31` (KRITEERIT_A) [sv puuttuu] Keskim. pallokosketukset/harjoitus. 1 = 100 kosketusta … 10 = 1000
- `lib/tm_harjoitusarviointi.js:33` (KRITEERIT_A) [sv puuttuu] Pelaajien toiminta on täysivauhtista
- `lib/tm_harjoitusarviointi.js:34` (KRITEERIT_A) [sv puuttuu] Maalintekoa mahdollistava harjoittelu
- `lib/tm_harjoitusarviointi.js:34` (KRITEERIT_A) [sv puuttuu] Osuus harjoitteista joissa pelinomaista viimeistelyä. 2/4 harjoitetta = 50 %
- `lib/tm_harjoitusarviointi.js:35` (KRITEERIT_A) [sv puuttuu] Seuran oma tavoite
- `lib/tm_harjoitusarviointi.js:35` (KRITEERIT_A) [sv puuttuu] Seuran oma tavoite (konfiguraatio)
- `lib/tm_harjoitusarviointi.js:36` (KRITEERIT_A) [sv puuttuu] Annetaanko henkilökohtainen palaute valmentajalle / tiimille
- `lib/tm_harjoitusarviointi.js:40` ((ylätaso) KRITEERIT_B) [sv puuttuu] Harjoituksen organisointi & rakenne
- `lib/tm_harjoitusarviointi.js:41` ((ylätaso) KRITEERIT_B) [sv on, vain reititys] Tavoitteen selkeys
- `lib/tm_harjoitusarviointi.js:41` ((ylätaso) KRITEERIT_B) [sv puuttuu] kirkas & kytketty jaksoteemaan / kehityskohteisiin
- `lib/tm_harjoitusarviointi.js:42` ((ylätaso) KRITEERIT_B) [sv puuttuu] vähäistä / harvoille
- `lib/tm_harjoitusarviointi.js:42` ((ylätaso) KRITEERIT_B) [sv puuttuu] runsasta & kattavaa (tavoittaa kaikki)
- `lib/tm_harjoitusarviointi.js:44` ((ylätaso) KRITEERIT_B) [sv puuttuu] pelaajakeskeinen (virheet sallittu, autonomian tuki)
- `lib/tm_harjoitusarviointi.js:45` ((ylätaso) KRITEERIT_B) [sv puuttuu] yksi taso kaikille
- `lib/tm_harjoitusarviointi.js:45` ((ylätaso) KRITEERIT_B) [sv puuttuu] yksilöity (taitotaso + kypsyysvaihe + kuormitus)
- `lib/tm_harjoitusarviointi.js:127` (_render) [sv puuttuu] Seuran oma tavoite
- `lib/tm_harjoitusarviointi.js:129` (_render) [sv on, vain reititys] A · Harjoittelun laatu
- `lib/tm_harjoitusarviointi.js:129` (_render) [sv on, vain reititys] B · Valmennustaidot
- `lib/tm_harjoitusarviointi.js:134` (_render) [sv on, vain reititys] Arvioi harjoitus
- `lib/tm_harjoitusarviointi.js:142` (_render) [sv on, vain reititys] A · Harjoittelun laatu
- `lib/tm_harjoitusarviointi.js:142` (_render) [sv on, vain reititys] B · Valmennustaidot
- `lib/tm_harjoitusarviointi.js:152` (_render) [sv on, vain reititys] Joukkue
- `lib/tm_harjoitusarviointi.js:153` (_render) [sv on, vain reititys] — valitse —
- `lib/tm_harjoitusarviointi.js:157` (_render) [sv on, vain reititys] Joukkue
- `lib/tm_harjoitusarviointi.js:158` (_render) [sv on, vain reititys] Joukkue
- `lib/tm_harjoitusarviointi.js:162` (_render) [sv on, vain reititys] Valmentaja
- `lib/tm_harjoitusarviointi.js:163` (_render) [sv on, vain reititys] — valitse —
- `lib/tm_harjoitusarviointi.js:167` (_render) [sv on, vain reititys] Valmentaja
- `lib/tm_harjoitusarviointi.js:171` (_render) [sv on, vain reititys] Päivämäärä
- `lib/tm_harjoitusarviointi.js:180` (_render) [sv puuttuu] Arviointitapa:
- `lib/tm_harjoitusarviointi.js:180` (_render) [sv on, vain reititys] Itsearvio
- `lib/tm_harjoitusarviointi.js:181` (_render) [sv on, vain reititys] Havainnointi
- `lib/tm_harjoitusarviointi.js:201` (_render) [sv on, vain reititys] Mikä onnistui?
- `lib/tm_harjoitusarviointi.js:202` (_render) [sv on, vain reititys] Mitä tekisin toisin?
- `lib/tm_harjoitusarviointi.js:203` (_render) [sv puuttuu] Oma kehityskohde valmentajana
- `lib/tm_harjoitusarviointi.js:207` (_render) [sv on, vain reititys] Tallenna arviointi
- `lib/tm_harjoitusarviointi.js:228` (_haTallenna) [sv puuttuu] Valitse valmentaja ensin
- `lib/tm_harjoitusarviointi.js:229` (_haTallenna) [sv puuttuu] Anna joukkue ensin
- `lib/tm_harjoitusarviointi.js:230` (_haTallenna) [sv on, vain reititys] Tallennetaan…
- `lib/tm_harjoitusarviointi.js:285` (_haTallenna) [sv puuttuu] ✓ Harjoitusarviointi tallennettu
- `lib/tm_harjoitusarviointi.js:290` (_haTallenna) [sv on, vain reititys] Tallennus epäonnistui:
- `lib/tm_harjoitusarviointi.js:291` (_haTallenna) [sv on, vain reititys] Tallenna arviointi

### Suostumus- ja kutsuflow (Rekisterointi_Suostumus, Huoltajakutsu) — 46
- `TalentMaster_Rekisterointi_Suostumus.html:353` ((ylätaso) textContent) [sv on, vain reititys] Lupa pelaajan tunnuksiin
- `TalentMaster_Rekisterointi_Suostumus.html:356` ((ylätaso) textContent) [sv puuttuu] Seura on esitäyttänyt osan tiedoista puolestasi. Tarkista tiedot ja täydennä puuttuvat kentät.
- `TalentMaster_Rekisterointi_Suostumus.html:357` ((ylätaso) textContent) [sv on, vain reititys] Täytä lapsen tiedot ja oma sähköpostiosoitteesi. Käytä samaa sähköpostia, jonka annoit seuralle.
- `TalentMaster_Rekisterointi_Suostumus.html:404` (_synVirheTeksti) [sv on, vain reititys] Tarkista syntymäaika
- `TalentMaster_Rekisterointi_Suostumus.html:483` (_uusiKutsuViesti) [sv on, vain reititys] Pyydä seuralta uusi kutsu. Tästä linkistä puuttuu pelaajan tunniste, joten lomaketta ei voi lähettää.
- `TalentMaster_Rekisterointi_Suostumus.html:491` (_uusintaSelite) [sv on, vain reititys] Suostumus annettu
- `TalentMaster_Rekisterointi_Suostumus.html:491` (_uusintaSelite) [sv puuttuu] — tällä lomakkeella uusit sen.
- `TalentMaster_Rekisterointi_Suostumus.html:555` (toStep2) [sv puuttuu] Täytä huoltajan etunimi, sukunimi ja sähköposti
- `TalentMaster_Rekisterointi_Suostumus.html:619` (toStep3) [sv puuttuu] Tarkistathan vanhemman pituusmittauksen (epätavallinen arvo) — tallennetaan silti
- `TalentMaster_Rekisterointi_Suostumus.html:634` (toStep3) [sv puuttuu] Täytä huoltajan etunimi ja sukunimi
- `TalentMaster_Rekisterointi_Suostumus.html:638` (toStep3) [sv puuttuu] Suostumuksen antajan nimi puuttuu
- `TalentMaster_Rekisterointi_Suostumus.html:639` (toStep3) [sv puuttuu] Tarkista nimi: enintään 100 merkkiä, ei merkkejä < tai >
- `TalentMaster_Rekisterointi_Suostumus.html:723` (toStep3) [sv on, vain reititys] Nimi
- `TalentMaster_Rekisterointi_Suostumus.html:724` (toStep3) [sv on, vain reititys] Seura
- `TalentMaster_Rekisterointi_Suostumus.html:725` (toStep3) [sv on, vain reititys] Joukkue
- `TalentMaster_Rekisterointi_Suostumus.html:726` (toStep3) [sv puuttuu] Ikä
- `TalentMaster_Rekisterointi_Suostumus.html:727` (toStep3) [sv puuttuu] Raportit lähetetään
- `TalentMaster_Rekisterointi_Suostumus.html:728` (toStep3) [sv puuttuu] kpl hyväksytty
- `TalentMaster_Rekisterointi_Suostumus.html:731` (toStep3) [sv on, vain reititys] Tallennettu
- `TalentMaster_Rekisterointi_Suostumus.html:732` (toStep3) [sv on, vain reititys] Tila
- `TalentMaster_Rekisterointi_Suostumus.html:732` (toStep3) [sv puuttuu] Odottaa synkronointia
- `TalentMaster_Rekisterointi_Suostumus.html:742` (toStep3) [sv puuttuu] L&auml;hetimme salasanalinkin ja pelaajan PIN-koodin
- `TalentMaster_Rekisterointi_Suostumus.html:742` (toStep3) [sv puuttuu] . Avaa viesti ja aseta salasanasi.
- `TalentMaster_Rekisterointi_Suostumus.html:743` (toStep3) [sv puuttuu] Linkki on voimassa 7 p&auml;iv&auml;&auml;
- `TalentMaster_Rekisterointi_Suostumus.html:743` (toStep3) [sv on, vain reititys] Linkki on voimassa 1 tunnin.
- `TalentMaster_Rekisterointi_Suostumus.html:743` (toStep3) [sv puuttuu] Jos se ehtii vanheta, avaa
- `TalentMaster_Rekisterointi_Suostumus.html:743` (toStep3) [sv on, vain reititys] vanhemman sivu
- `TalentMaster_Rekisterointi_Suostumus.html:743` (toStep3) [sv puuttuu] ja valitse &rdquo;Unohdin salasanan&rdquo; &mdash; saat uuden linkin.
- `TalentMaster_Rekisterointi_Suostumus.html:744` (toStep3) [sv puuttuu] Salasanan asetettuasi p&auml;&auml;set vanhemman n&auml;kym&auml;&auml;n &mdash; kirjaudu samalla s&auml;hk&ou
- `TalentMaster_Rekisterointi_Suostumus.html:746` (toStep3) [sv puuttuu] S&auml;hk&ouml;posti ei l&auml;htenyt
- `TalentMaster_Rekisterointi_Suostumus.html:747` (toStep3) [sv puuttuu] Suostumus on tallennettu, mutta tunnusten l&auml;hetys
- `TalentMaster_Rekisterointi_Suostumus.html:748` (toStep3) [sv puuttuu] (seuran hallinta &rarr; pelaaja &rarr; l&auml;het&auml; pelaajasivulinkki).
- `TalentMaster_Rekisterointi_Suostumus.html:764` (toStep3) [sv puuttuu] Tämä kutsulinkki koskee toista pelaajaa. Jos rekisteröit eri lasta, pyydä seuralta hänelle oma kutsu.
- `TalentMaster_Rekisterointi_Suostumus.html:766` (toStep3) [sv on, vain reititys] Vahvista ja lähetä
- `TalentMaster_Rekisterointi_Suostumus.html:772` (toStep3) [sv puuttuu] Tämä kutsulinkki on jo käytetty tai korvattu uudemmalla. Käytä seuran uusinta kutsua tai pyydä seuralta uusi.
- `TalentMaster_Rekisterointi_Suostumus.html:773` (toStep3) [sv puuttuu] Suostumus on jo annettu tälle pelaajalle. Jos haluat muuttaa suostumusta, pyydä seuralta uusi kutsu.
- `TalentMaster_Rekisterointi_Suostumus.html:774` (toStep3) [sv puuttuu] Tämä kutsulinkki koskee toista pelaajaa. Pyydä seuralta oikea kutsu.
- `TalentMaster_Rekisterointi_Suostumus.html:778` (toStep3) [sv on, vain reititys] Sähköposti ei vastaa seuran tietoja. Käytä osoitetta, jonka annoit seuralle, tai ota yhteys joukkueenjohtajaan
- `TalentMaster_Rekisterointi_Suostumus.html:783` (toStep3) [sv on, vain reititys] Vahvista ja lähetä
- `TalentMaster_Rekisterointi_Suostumus.html:789` (toStep3) [sv on, vain reititys] Vahvista ja lähetä
- `TalentMaster_Rekisterointi_Suostumus.html:793` (toStep3) [sv puuttuu] Tarkista huoltajan nimi: enintään 100 merkkiä, ei merkkejä < tai >
- `TalentMaster_Rekisterointi_Suostumus.html:794` (toStep3) [sv on, vain reititys] Vahvista ja lähetä
- `TalentMaster_Rekisterointi_Suostumus.html:799` (toStep3) [sv puuttuu] Täytä huoltajan etunimi ja sukunimi
- `TalentMaster_Rekisterointi_Suostumus.html:800` (toStep3) [sv on, vain reititys] Vahvista ja lähetä
- `TalentMaster_Rekisterointi_Suostumus.html:804` (toStep3) [sv on, vain reititys] Tallennus epäonnistui:
- `TalentMaster_Rekisterointi_Suostumus.html:805` (toStep3) [sv on, vain reititys] Vahvista ja lähetä

### Toimintakortti + kasvupyrähdys-fysiikka (#1073–1075) — 0

### Kehitystyöpöytä (Kehitystyopoyta.html) — 8
- `TalentMaster_Kehitystyopoyta.html:305` (eiOikeutta) [sv on, vain reititys] Ei oikeutta merkitä tämän pelaajan havaintoa.
- `TalentMaster_Kehitystyopoyta.html:306` (kirjoita) [sv on, vain reititys] Osa-arvio tallennettu
- `TalentMaster_Kehitystyopoyta.html:408` (_ktVahvistaSitoumus) [sv on, vain reititys] Sitoumusta ei löytynyt
- `TalentMaster_Kehitystyopoyta.html:409` (_ktVahvistaSitoumus) [sv on, vain reititys] Sitoumus on edelliseltä jaksolta
- `TalentMaster_Kehitystyopoyta.html:412` (_ktVahvistaSitoumus) [sv on, vain reititys] Sitoumus vahvistettu ✓
- `TalentMaster_Kehitystyopoyta.html:413` (_ktVahvistaSitoumus) [sv on, vain reititys] Vahvistus epäonnistui
- `TalentMaster_Kehitystyopoyta.html:473` (_kaynnista) [sv on, vain reititys] Istunto vanhentunut tai käyttöoikeudet puuttuvat. Kirjaudu uudelleen sisään.
- `lib/tm_kehitystyopoyta.js:471` (tmKtIkavaihe) [sv on, vain reititys] Leikkijä

## Kovakoodattu suomi sv-tilassa — ajonaikainen läpiajo (demo-data, 2026-10-15)

### Pelaaja_v7 — UI 4, data? 3, prototyyppinäkymät (ei Sibbo-polkua) 62
- `TalentMaster_Pelaaja_v7.html:2664` [pelaaja/card] [sv on, vain reititys] Joukkueharjoitus
- `TalentMaster_Pelaaja_v7.html:2661` [pelaaja/card] [sv puuttuu] Ottelu vs FC Naapuri
- `TalentMaster_Pelaaja_v7.html:2664` [pelaaja/card] [sv puuttuu] Nopeustestit
- `lib/tm-microcycles.js:20` [pelaaja/pin] [sv on, vain reititys] Maalinteko

### Vanhempi_v2 — UI 7, data? 11
- `lib/tm_master_i18n.js:285` [vanhempi/u19/koti] [sv puuttuu] Live · Joukkue
- `TalentMaster_Vanhempi_v2.html:206` [vanhempi/u19/kortti] [sv on, vain reititys] Joukkue
- `TalentMaster_Vanhempi_v2.html:505` [vanhempi/u19/koti] [sv on, vain reititys] Joukkueharjoitus
- `TalentMaster_Vanhempi_v2.html:505` [vanhempi/u19/koti] [sv puuttuu] Ottelu vs FC Naapuri
- `TalentMaster_Vanhempi_v2.html:505` [vanhempi/u19/koti] [sv puuttuu] Nopeustestit
- `TalentMaster_Vanhempi_v2.html:148` [vanhempi/u19/kortti] [sv on, vain reititys] Pelaaja
- `TalentMaster_Vanhempi_v2.html:101` [vanhempi/u19/kortti] [sv on, vain reititys] Streak

### Master_v16 (valmentaja) — UI 16, data? 16
- `TalentMaster_Master_v16.html:2199` [master/today] [sv on, vain reititys] +1.4 vs. baseline
- `TalentMaster_Master_v16.html:2206` [master/today] [sv puuttuu] "3v2-hetki 67'. Uskalsi vaikean syötön, luki tilanteen oikein. Jatka tätä peliotetta."
- `TalentMaster_Master_v16.html:5621` [master/today] [sv on, vain reititys] ★ X-FACTOR
- `TalentMaster_Master_v16.html:2211` [master/today] [sv puuttuu] "Käännöksen nopeus paranee näkyvästi. Teki kaksi hyvää ohitusta oikealta laidalta."
- `TalentMaster_Master_v16.html:5626` [master/today] [sv on, vain reititys] VIDEO
- `TalentMaster_Master_v16.html:2216` [master/today] [sv puuttuu] "Väsymys näkyi asennossa. Ei jaksanut juosta takaisin puolustamaan viimeisessä viidenneksessä."
- `TalentMaster_Master_v16.html:23` [master/cal] [sv puuttuu] Lisää kalenteriini
- `TalentMaster_Master_v16.html:1805` [master/cal] [sv on, vain reititys] Ottelu
- `TalentMaster_Master_v16.html:1649` [master/cal] [sv on, vain reititys] Harjoitus
- `TalentMaster_Master_v16.html:1780` [master/cal] [sv on, vain reititys] Testitapahtuma
- `lib/tm_kalenteri_tyypit.js:21` [master/cal] [sv on, vain reititys] Valmentajapalaveri
- `TalentMaster_Master_v16.html:11005` [master/cal] [sv puuttuu] Joukkueen vapaa
- `lib/tm_kalenteri_kuukausi.js:47` [master/cal] [sv puuttuu] Ei tapahtumia tässä kuussa.
- `TalentMaster_Master_v16.html:2313` [master/testit] [sv on, vain reititys] Kokkolan jalkapallostadion
- `TalentMaster_Master_v16.html:3075` [master/testit] [sv puuttuu] Harjoitettavuuskartoitus U13–15
- `TalentMaster_Master_v16.html:2320` [master/testit] [sv on, vain reititys] Eteläkenttä

### VP_v25 — UI 19, data? 9
- `TalentMaster_VP_v25.html:4511` [vp/_vpOhjKirjastoModal('','')] [sv puuttuu] ilman suostumusta
- `TalentMaster_VP_v25.html:2689` [vp/_vpOhjKirjastoModal('','')] [sv on, vain reititys] Ilmoitukset
- `lib/tm_eerikkila_normit.js:507` [vp/_vpOhjKirjastoModal('','')] [sv puuttuu] Suhteellinen ikävaikutus — syntymäkvartaali (Q1 alkuvuosi … Q4 loppuvuosi). Saman ikäluokan Q4 on bi
- `TalentMaster_VP_v25.html:5561` [vp/_vpOhjKirjastoModal('','')] [sv on, vain reititys] Pre-PHV
- `TalentMaster_VP_v25.html:5563` [vp/_vpOhjKirjastoModal('','')] [sv on, vain reititys] Post-PHV
- `TalentMaster_VP_v25.html:55` [vp/_vpOhjKirjastoModal('','')] [sv on, vain reititys] Pikakirjaus
- `TalentMaster_VP_v25.html:3093` [vp/_vpOhjKirjastoModal('','')] [sv on, vain reititys] Excel-pohja
- `TalentMaster_VP_v25.html:18593` [vp/_vpOhjKirjastoModal('','')] [sv on, vain reititys] Historiatuonti
- `TalentMaster_VP_v25.html:18593` [vp/_vpOhjKirjastoModal('','')] [sv on, vain reititys] Palloliiton PDF
- `TalentMaster_VP_v25.html:62` [vp/tilanne] [sv on, vain reititys] Mittaus
- `TalentMaster_VP_v25.html:49` [vp/tilanne] [sv on, vain reititys] tilanne
- `TalentMaster_VP_v25.html:4276` [vp/tilanne] [sv on, vain reititys] Top-10
- `TalentMaster_VP_v25.html:4276` [vp/tilanne] [sv on, vain reititys] Top-5
- `TalentMaster_VP_v25.html:22391` [vp/tilanne] [sv puuttuu] Täydennä mittauksia
- `TalentMaster_VP_v25.html:3021` [vp/pelaajat] [sv on, vain reititys] ⭐ Underdog
- `TalentMaster_VP_v25.html:21959` [vp/kalenteri] [sv on, vain reititys] Kevään harjoitettavuus
- `TalentMaster_VP_v25.html:17335` [vp/kalenteri] [sv on, vain reititys] Kesken
- `TalentMaster_VP_v25.html:21960` [vp/kalenteri] [sv on, vain reititys] Tekniikkakilpailu U12
- `TalentMaster_VP_v25.html:11201` [vp/kalenteri] [sv on, vain reititys] Paikka

### ADAR_Pikakortti + Pelihavainto_Kentta — UI 1, data? 0
- `TalentMaster_Pelihavainto_Kentta.html:14` [pelihavainto/kentta] [sv on, vain reititys] Kohdennettu pelihavainto


## Löydökset (ei kuulu brieffin oletuksiin)

1. **Bugi, korjattu tässä PR:ssä:** `TalentMaster_Vanhempi_v2.html` heitti `ReferenceError: _demo is not defined` kahdessa funktiossa (`_vanhTapahtumatHTML`, `_vanhKertymaHTML`). `_demo` on muissa funktioissa paikallinen muuttuja; nämä kaksi viittasivat siihen julistamatta (#1023 / K35-6f, 12.10.). Tuotannossa `_vanhKertymaHTML` kaatuu heti kun lapsi on ladattu, ja `_vanhTapahtumatHTML` aina kun kalenterin tilauspainike on ladattu → **huoltajan etusivu voi rikkoutua myös suomeksi**. Läpiajon "virheitä 6" (vanhempi/*/koti) oli tämä; läpiajo ajettiin uudelleen korjauksen jälkeen: virheitä 0 (docs/i18n/sv_lapiajo_tulos.json päivitetty). Korjaus: paikallinen `var _demo` (kuten sisarfunktioissa); regressiotesti `tests/vanhempi_demo_viittaus.test.js` (kaatuu ilman korjausta). Tarkista live ennen mergeä.
2. **Aiemmat erät, joiden sv puuttuu eikä palautusta ole repossa:** `lib.tm_kt_sivu` 15 avainta (erä 43, B7 Kehitystyöpöytä-sivu) ja `lib.tm_kt_havainto` 14 (erä 45). Erä 51 keräsi "erien 36, 42, 44, 45 jäännökset", mutta nämä eivät päätyneet siihen eikä `tests/i18n_sv_era_lib.test.js` valvo näitä libejä (LIBIT-lista), joten puute ei näkynyt. Sisällytetty erään 53 `huom`-merkinnällä; jos palautus on jo Terolla, poista osiot 53:sta ja vie ne.
3. **Erän 19 palautus (11.10.) on osin viemättä:** VP:n `vp_kartta`-rivejä 37 (esim. "Syntymäkvartaalit", "ilman suostumusta") on palautuksessa sv täytettynä, mutta koodissa ei (osavienti vei vain 7 lib + 17 Master -riviä). Ei mene erään 53. Ehdotus: oma pieni vienti-PR (`i18n_vie_sv_era19_osa`-malli).
4. **Harjoitusarviointilomake (`lib/tm_harjoitusarviointi.js`, Master + VP) on kokonaan kovakoodattua suomea** — staattinen skanneri ja läpiajo eivät nähneet sitä (skanneri lukee vain HTML:n, modaali ei aukea demossa). Kuva `docs/ui-kuvat/sibbo-sv/07-harjoitusarviointi-*` todistaa: sv-tilassa lomake on suomeksi (otsikko, A/B-kriteerit, napit, toastit).

## ILMOITUS ENNEN: reititettävät kovakoodatut (ei tehty tässä PR:ssä)

Brieffin ehto "pieni ja turvallinen" ei täyty, joten reititystä **ei tehty**; Teron päätös:

| Kokonaisuus | Rivejä | Tarvittava muutos | Riski |
|---|---:|---|---|
| Harjoitusarviointilomake (lib) | 45 (23 ilman sv:tä → erä 53, 22 sv olemassa) | opts.t-adapteri libiin (kuten `tm_kt_*`), Master + VP välittävät `masterT`/`vpT`; kriteerien (KRITEERIT_A/B) kielistys vaikuttaa tallennettuihin vastauksiin vain jos avain=teksti → pidä `id` ennallaan | keskisuuri (lib + 2 HTML, `?v`) |
| Suostumus-/kutsulomake (HTML) | 46 (26 ilman sv:tä → erä 53) | uudet `suostumus.*`-avaimet tm_lang:iin (fi+en) + `t()`-kutsut; **jokainen tm_lang-muutos vaatii `?v` + SW-cache-bumpin molemmissa apeissa (§27.4)**; GDPR-teksti → juristin vahvistus (sv jo aiemmin "LUONNOS → juristi") | suuri (GDPR-polku) |
| Kehitystyöpöytä (HTML) | 8 (kaikilla sv jo olemassa → vain reititys) | `masterT`-kutsut 7 kohdassa + `Leikkijä` (lib) | pieni |
| Ajonaikaiset UI-jäänteet (Master 16, VP 19, Vanhempi 7, Pelaaja 4, Pelihavainto 1) | 47 (osa demo-dataa D16) | tapauskohtaisesti, lista alla | pieni–keskisuuri |

Erä 53 sisältää niiden rivien sv-varauksen, joille sv puuttuu (osiot `kovakoodatut.*`, tila "EI REITITETTY"), jotta käännös on valmiina jos reititys päätetään.

## Mitä puuttuu vielä 1.11., jos erä 53 tulee ajallaan (51 ja 52 jo viety)

**Tarvitaan vienti-PR, ei uutta käännöstä:**
- Erä 53 palattua: `master_kartta` 8 → `TM_MASTER_I18N`; `lib.tm_kt_sivu` + `lib.tm_kt_havainto` 29 → `TM_LIB_I18N` (vienti kuten 51/52); `vientipohja` 33 → `node scripts/i18n_vie_sv_vientipohja.cjs` (kaatuu jos yksikin rivi puuttuu tai paikanvaraajat eroavat). Sen jälkeen `node scripts/luo_harjoitepankki_pohja.js --seura-nimi Sibbo-Vargarna --kieli sv`.
- VP:n 37 riviä erästä 19 (löydös 3).

**Ei saada ruotsiksi ennen 1.11. ilman Teron päätöstä + HTML/lib-työtä:**
- Harjoitusarviointilomake (45 riviä) — lomake on sopimuksen mukaan käytössä 1.11.
- Suostumuslomakkeen dynaamiset viestit ja kuitti (46 riviä; staattinen lomake on jo sv). Juristin vahvistus.
- Kehitystyöpöydän 7 toastia ja ajonaikaiset UI-jäänteet (reititys, sv jo olemassa).

**Ei käännetä koskaan (D16, seuran oma data):** harjoitteiden ja tapahtumien nimet, valmentajien vapaa teksti, valmennuslinja, demo-datan nimet.

**Mittaamatta jäi:** palvelimen luomat tekstit (`functions/`: sähköpostipohjat, push), Seura-hallinnan kirjautuneet näkymät oikealla datalla, Pelaajan/Vanhemman näkymät kirjautuneena (läpiajo käyttää demo-dataa). **Excel-vientipohja:** kuittaus-arvot (OK · Muutettu · Poista) pysyvät suomeksi brieffin mukaan; OHJE selittää ne. Jos halutaan `Ändrad`/`Ta bort`-tyyppiset aliakset, tuontiin tarvitaan pieni alias-lisäys (ehdotus, ei tehty).

## Kuvat

`docs/ui-kuvat/sibbo-sv/` (22 WebP-kuvaa, 390 ja 1280; tumma, VP/Master myös vaalea; `index.md`, `jaanteet.json`): `node scripts/ui_kuvat_sibbo_sv.mjs`. Huoltajan näkymän kuva ei ollut ajettavissa ennen löydöksen 1 korjausta. Kuvien suomenkieliset jäänteet ovat pääosin demo-dataa (tapahtumien nimet "Joukkueharjoitus", "Ottelu vs FC Naapuri", "Aleksi"-profiilin tavoite); demo-tilan kehittäjäpalkit (scene-bar, kielivalitsin) on rajattu pois kuten läpiajossa; oikeat UI-jäänteet: harjoitusarviointi (kaikki), suostumuslomake (Pelaajan tiedot, Seuraava, Joukkue, Seura, PalloID-ohje, pituusohje), VP "ilman suostumusta", Pelihavainto "Kohdennettu pelihavainto".
