# Suostumuslomakkeen käännökset (suostumus.*) — fi/sv/en · LUONNOS

> **Käyttö:** Code lisää nämä avaimet `lib/tm_lang.js`:n `suostumus`-kategoriaan (fi+sv+en) ja kytkee lomakkeen
> (`TalentMaster_Rekisterointi_Suostumus.html` rivit ~184–197) `t('suostumus.avain')`-kutsuihin (V0.5-alitaski).
> **⚠ LUONNOS — Tero/juristi vahvistaa sv- ja en-tekstit ennen tuotantoa.** Lähde = olemassa olevat suomalaiset
> (tarkistetut) suostumustekstit; nämä ovat niiden käännöksiä, EI uutta lakitekstiä. GDPR: suostumus annettava
> kielellä jonka huoltaja ymmärtää → ruotsinkieliselle perheelle sv-lomake on olennainen.

## Avaintaulukko

| avain | fi | sv (LUONNOS) | en (LUONNOS) |
|---|---|---|---|
| `suostumus.info_otsikko` | Mitä tämä tarkoittaa käytännössä? | Vad betyder detta i praktiken? | What does this mean in practice? |
| `suostumus.info_teksti` | Seura seuraa lapsesi fyysistä kehitystä kauden aikana. Tulokset tallennetaan TalentMaster-järjestelmään, josta valmentaja ja sinä huoltajana voitte seurata kehitystä. Tiedot ovat luottamuksellisia. | Föreningen följer ditt barns fysiska utveckling under säsongen. Resultaten sparas i TalentMaster-systemet, där tränaren och du som vårdnadshavare kan följa utvecklingen. Uppgifterna är konfidentiella. | The club monitors your child's physical development during the season. Results are stored in the TalentMaster system, where the coach and you as guardian can follow the progress. The information is confidential. |
| `suostumus.ryhma_pakolliset` | Pakolliset | Obligatoriska | Required |
| `suostumus.ryhma_testaus` | Testaaminen ja kehitysseuranta | Testning och utvecklingsuppföljning | Testing and development monitoring |
| `suostumus.ryhma_jakaminen` | Tietojen jakaminen | Delning av uppgifter | Data sharing |
| `suostumus.badge_pakollinen` | PAKOLLINEN | OBLIGATORISK | REQUIRED |
| `suostumus.badge_vapaaehtoinen` | VAPAAEHTOINEN | FRIVILLIG | OPTIONAL |
| `suostumus.c1_otsikko` | Tietojen tallentaminen rekisteriin | Lagring av uppgifter i registret | Storing data in the register |
| `suostumus.c1_teksti` | Lapseni nimi, syntymäaika, seura ja yhteystiedot tallennetaan TalentMaster-kehitysjärjestelmään seuran käyttöön. | Mitt barns namn, födelsedatum, förening och kontaktuppgifter sparas i TalentMaster-utvecklingssystemet för föreningens bruk. | My child's name, date of birth, club and contact details are stored in the TalentMaster development system for the club's use. |
| `suostumus.c2_otsikko` | Tietosuojaseloste luettu | Dataskyddsbeskrivning läst | Privacy policy read |
| `suostumus.c2_teksti_alku` | Olen tutustunut | Jag har tagit del av | I have read the |
| `suostumus.c2_linkki` | TalentMaster-tietosuojaselosteeseen | TalentMasters dataskyddsbeskrivning | TalentMaster privacy policy |
| `suostumus.c2_teksti_loppu` | . Tiedän että minulla on oikeus nähdä, oikaista ja poistaa lapseni tiedot milloin tahansa. | . Jag vet att jag har rätt att se, rätta och radera mitt barns uppgifter när som helst. | . I know that I have the right to view, correct and delete my child's data at any time. |
| `suostumus.c3_otsikko` | Fyysinen testaaminen ja kehitysseuranta | Fysisk testning och utvecklingsuppföljning | Physical testing and development monitoring |
| `suostumus.c3_teksti` | Annan luvan mitata lapseni fyysistä kehitystä ja tallentaa tulokset järjestelmään. | Jag ger tillstånd att mäta mitt barns fysiska utveckling och lagra resultaten i systemet. | I give permission to measure my child's physical development and store the results in the system. |
| `suostumus.c4_otsikko` | Biologisen iän arviointi | Bedömning av biologisk ålder | Biological age assessment |
| `suostumus.c4_teksti` | Annan luvan arvioida lapseni kasvun vaihetta kehomittausten avulla (pituus, paino, istumapituus). Tätä käytetään harjoituskuorman mitoittamiseen turvallisesti. | Jag ger tillstånd att bedöma mitt barns tillväxtfas med hjälp av kroppsmätningar (längd, vikt, sitthöjd). Detta används för att dimensionera träningsbelastningen på ett tryggt sätt. | I give permission to assess my child's growth phase using body measurements (height, weight, sitting height). This is used to size the training load safely. |
| `suostumus.c5_otsikko` | Kehitystiedot seuran valmentajille | Utvecklingsuppgifter till föreningens tränare | Development data to the club's coaches |
| `suostumus.c5_teksti` | Lapseni testitulokset jaetaan seuran muille valmentajille. | Mitt barns testresultat delas med föreningens övriga tränare. | My child's test results are shared with the club's other coaches. |
| `suostumus.c6_otsikko` | Anonymisoitu data palvelun kehittämiseen | Anonymiserad data för utveckling av tjänsten | Anonymised data for service development |
| `suostumus.c6_teksti` | Lapseni tunnisteetonta dataa voidaan käyttää TalentMaster-palvelun kehittämiseen. | Mitt barns avidentifierade data kan användas för att utveckla TalentMaster-tjänsten. | My child's de-identified data may be used to develop the TalentMaster service. |
| `suostumus.nappi_takaisin` | Takaisin | Tillbaka | Back |
| `suostumus.nappi_vahvista` | Vahvista ja lähetä | Bekräfta och skicka | Confirm and send |
| `suostumus.onnistui_otsikko` | Rekisteröinti onnistui! | Registreringen lyckades! | Registration successful! |
| `suostumus.onnistui_teksti` | Tiedot on tallennettu TalentMaster-rekisteriin. | Uppgifterna har sparats i TalentMaster-registret. | The information has been saved to the TalentMaster register. |

## Huomiot Codelle (kytkentä)
- **c2 on jaettu kolmeen** (`_alku` + `_linkki` (nappi) + `_loppu`) koska keskellä on `showPrivacy()`-linkkinappi. Säilytä nappi; korvaa vain tekstit.
- **Badge-luokat** (`req-b`/`opt-b`) ja checkbox-id:t (`c1`–`c7`) **ennallaan** — vain näkyvä teksti `t()`:hen.
- **`chkConsent()`-logiikka koskematon** (pakolliset c1+c2 → nappi aktivoituu). Vain esitys käännetään.
- Nykyiset 7 geneeristä `suostumus.*`-avainta (otsikko/kuvaus/huoltajan_nimi jne.) säilyvät; nämä täydentävät niitä.
- **fi-tekstit yllä = normalisoidut** (ä/ö palautettu; HTML:ssä osa oli ilman diakriittejä esim. "kaytannossa"). Käytä näitä fi-arvoina — korjaa samalla fi-puolen puuttuvat ä/ö:t.
- Fallback sv→en→fi: jos jokin sv puuttuu, fi näkyy — mutta suostumuksessa **sv oltava täydellinen** ennen EIF-live'ä.
