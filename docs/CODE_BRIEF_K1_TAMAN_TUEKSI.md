# CODE BRIEF · K1: Tänään kentälle, "Tämän tueksi" ja viikon tavoite (Pelaaja_v7)

**Kaista: Tero** (Pelaaja_v7 + `lib/` + mahdollinen Rules-muutos). PR-kuvauksen 1. rivi "Kaista: Tero".
**Design:**
- `10_pelaaja_v7_kentta_suunnitelma.html` K1 (runko: `rA1Kentta()`, neljä tilaa).
- `09_pelaaja_kentta.html` näkymä 1 (ulkoasu, voittaa 05:n).
- `12_jaksologiikka.html` pelaajan kortti "Tämän tueksi" (sisältö, D19–D21).
- `13_kehitystyopoyta_kentta.html` D24 (pelaajan näkymä ennallaan: ei symboleja laidalla).
- `14_joukkueen_viikko_kentta.html` D32 (viikkotavoite tulee joukkueen jaksosta).

Raportoi PR:ssä, mitä kohtaa kustakin noudatat.

**Edellytykset:** K0 (`lib/tm_kentta.js`), J1, J2, V1 ja J4 on mergetty.
**Lippu:** kaikki uusi vain kun `seurat/{id}.liput.kentta === true` (D13). Ilman lippua Tänään on täsmälleen ennallaan (snapshot-testi kuten V1/J4).

## 1 · Tänään kentälle (10 K1, ennallaan)
Toteuta 10:n K1 sellaisenaan. Ainoa muutos on, että "tukiosa-rivi" korvataan kohdan 2 kortilla.
- `rA1Kentta()`:
  - otsikko "Viikko N"
  - kenttä `koko:'puoli'`
  - jakson osat sanoin
  - päivän treeni -nappi
  - ehdolliset lohkot: seuraava 48 h, valmentajalta uutena, fiilis kuittauksena
- Neljä tilaa:
  - jakso käynnissä
  - ei jaksoa (vahvuus näkyy)
  - ei vahvuutta eikä jaksoa
  - sunnuntai (sisältö tulee K4:ssä)
- Päivän treeni: `harjoitelogiikka_v4` lukee ensin `jaksofokus.osat` / `konsepti_avain`, sitten testit. Characterization-testit ensin (§7.25).
- Taktiikkakaavion kuittaus siirtyy Joukkue-välilehdelle.

## 2 · "Tämän tueksi" -kortti (12)
- **Lähde:** `tmTukitavoitteet(_pelaaja.jaksofokus)` (`lib/tm_tukitavoitteet.js`). Se palauttaa listan ja hoitaa vanhan `tukiosa`-muodon (yhden rivin fallback). Älä lue `tukiosa`a suoraan.
- **Rivi per tukitavoite (0–2):**
  - `kuvaus` isona
  - perustelu yhtenä lauseena
  - tukitavoitteen `harjoitteet` (nimi + kesto) samalla esityksellä kuin nykyiset kotiharjoitteet (`tmKotiharjoitteetHTML`, sama puolustava suodatus: vain `hyvaksytty`, ei `kaytto:'joukkue'`)
- **Perustelu pelaajan kielellä:**
  - Generoitu oletus alkaa "Tukee ydinvahvuutta (X): …". Pelaajalle se näytetään muodossa "Tukee vahvuuttasi (X): …"; henkilökunta sanoo ydinvahvuus, pelaaja vahvuus.
  - Valmentajan oma teksti näytetään sellaisenaan, jos se läpäisee tarkistuksen.
  - **Tarkistus:** jos perustelussa on numeroita tai KIELLETYT-sana (vartija `tm_jakso_malli`), perustelu jätetään pois ja kuvaus näytetään yksin. Tee tästä puhdas funktio `lib/`iin ja testaa se.
- **Ei pelaajalle:**
  - `lahde`, `lahde.tyyppi` tai viite ("testistä", "havainnosta")
  - testiarvoja, tasoja, X/5 tai vertailua
  - alueen teknistä avainta (`fy_*`, ketjunimet)
  - Fyysinen alue näytetään vain nimellä. Kypsyysvahti on jo hoidettu kirjoitettaessa (V1/J4), joten K1 ei päättele PHV:tä uudelleen.
- **Tyhjä lista** (Leikkijä, D18 = 0, tai ei tukitavoitteita): kortti piiloon, ei tyhjää laatikkoa.
- **Kentällä ei symboleja eikä alueita tukitavoitteille** (D24: symbolit vain henkilökunnalle).

## 3 · Joukkueen viikon tavoite (D32/D36)
- Näytetään Tänään-sivulla yhtenä rivinä "Joukkueen jakso" -kohdan alla (12:n mockupin mukaan): joukkueen jakson nimi + kuluvan viikon `tavoite`. Jos viikolle ei ole tavoitetta, näytetään vain nimi. Jos joukkueen jaksoa ei ole, rivi piilotetaan.
- Kuluva viikko lasketaan joukkueen jakson alusta `tmPaivaIso()`lla (§7.26). Käytä Masterin Joukkuejakso-kortin funktiota `tmJoukkuejaksoKortti({jaksofokus}, {tanaan})` (`lib/tm_joukkuejakso.js`, palauttaa `viikkotavoite`, `viikko`, `umpeutunut`); älä tee toista laskentaa. Umpeutunut jakso → rivi piiloon.
- **⚠ Pääsy, selvitä ENNEN koodausta:** pelaajan token (`pelaajaSeuraId`) ei avaa `seurat/{sid}/joukkueet/{jid}`ia. Rules v3.37 lukee `onOmaSeura`, joka on vain henkilökunnalle. Vaihtoehdot:
  - **A (suositus): snapshot pelaajan jaksoon.** `jaksofokus.joukkuejakso_viite` laajennetaan muotoon `{jid, alku, kesto_vk, nimi, viikot[]}` (riittää `tmJoukkuejaksoKortti`lle) aina, kun V1 tai J4 kirjoittaa jakson. Kun valmentaja muuttaa joukkueen viikkotavoitteita (J2), päivitys viedään niiden pelaajien jaksoihin, joilla on sama `jid` + `alku`. Kirjoitus tehdään valmentajan oikeuksin, eikä Rules muutu, jos `jaksofokus` on jo valmentajan kirjoitettavissa. Tarkista.
  - **B:** Rules sallii pelaajalle oman joukkueen dokumentin luvun. Tämä käy vain, jos joukkuedokumentissa ei ole henkilökunnan kenttiä, koska Rules ei rajaa luettavia kenttiä.
  - Inventoi joukkuedokumentin kentät ja raportoi valinta perusteluineen ennen toteutusta. Jos valinta on B, Rules-versio on seuraava vapaa. v3.43 on varattu ryhmille (D33), joten tarkista numerointi mainista.
- §7.22: viikkotavoite kulkee KIELLETYT-vartijan läpi jo tallennuksessa (J4). Näytössä se escapetaan.

## Kieli, fontit, tokenit
- Kaikki uudet tekstit `tm_lang`-avaimiksi (fi). sv-avaimet jätetään tyhjiksi ja listataan PR:ään Geminin listalle (§0).
- Archivo (D11) vain pelaaja-appin näyttöteksteihin: viikon numero, vahvuuden nimi, napit. Leipäteksti DM Sans. Fontti omalta palvelimelta `@fontsource`sta, tiedosto SW:n allowlistiin ja `tm-pelaaja-v3` → seuraava cache-versio.
- Vain T1- ja Kenttä-tokenit (`--teal`/`--teal-d`, `--chalk`, `--chalk2`, `--amber-dim`; `.kt`:n sisäiset tokenit vain `.kt`:n sisällä). Ei hex-värejä (brändiportti).
- Vaaleaa teemaa ei toteuteta.

## Testit
- Puhtaat funktiot:
  - tukitavoiterivien muodostus (0/1/2 riviä, vanha `tukiosa`-fallback)
  - perustelun pelaajamuoto ja tarkistus (numerot, KIELLETYT, oletusprefiksi)
  - kuluvan viikon tavoite (ei jaksoa, ei tavoitetta viikolle, viimeinen viikko, jakso päättynyt)
- **§7.22-portti:**
  - Tänään-HTML:ssä ei lukuja muodossa X/5, ei OVR:ää eikä `lahde`-tekstejä ("testistä", "havainnosta", "arviosta")
  - ei `fy_`-avaimia eikä ketjunimiä (SBL/SFL/LL/DIAG/DFL)
- Snapshot: lippu pois → Tänään identtinen nykyisen kanssa.
- Jos A: lib-testi, jossa J2:n viikkotavoitemuutos päivittää vain saman `jid` + `alku` -jakson pelaajat. Rules-emulaattoritestit niille kirjoituksille, joihin muutos koskee. Jos B: Rules-testi, jossa oma joukkue luetaan, toisen joukkueen ja toisen seuran ei.
- Käsin, KPV U13 (lippu päällä, vain testipelaajat):
  - Topias neljässä tilassa
  - jakso, jossa on 1 tukitavoite + harjoitteet
  - jakso ilman tukitavoitteita
  - vanha jakso pelkällä `tukiosa`lla
  - pelaaja toisesta seurasta, jolla lippu on pois (vain luku)
  - mobiili 390 px
- Koko sarja (unit + functions + characterization) viimeisen main-mergen jälkeen, `?v=`-bumpit.

## Ei tässä
- Minä-kenttä ja FIFA-kortin siirto (K2)
- reitin valinta (K3)
- viikkokatsaus (K4)
- Leikkijä ja huoltaja (K5)
- pelaajan viikko Polku-välilehdellä (D23)
- ryhmät (D33)
- kausisuunnitelma (15)
- alue → harjoite (14, D29)
