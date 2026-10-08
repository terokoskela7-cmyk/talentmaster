# CODE BRIEF · S1 — Seuran pulssi: kooste-funktio ja data (17, D40–D45)

**Kaista: Tero** (`functions/`, Rules, `lib/`). PR-kuvauksen ensimmäinen rivi on "Kaista: Tero".
**Design:** `docs/design/idp-v2/17_seuran_kooste.html` (D40–D45, lukittu 7.10.2026). Raportoi PR:ssä, mitä kohtaa noudatat.
**Aikataulu:** käyntiin heti. Trendi tarvitsee neljä viikkokoostetta, joten mitä aiemmin ensimmäinen sunnuntai-ajo menee, sitä aiemmin S2 (VP_v25:n etusivu, 1.12.) näyttää trendin eikä tyhjää.
**Rules:** seuraava vapaa versio, eli **v3.53**. Alkuperäinen varaus v3.49 jäi käyttämättä. Tähän samaan versioon tulee myös v3.52:n jälkisiivous (alla).

## Mitä S1 tekee

Viikkokooste lasketaan palvelimella sunnuntai-iltana. Siinä on neljä prosessimittaria joukkueittain:

| Mittari | Laskenta (viikko, joukkue) | Lähde |
|---|---|---|
| Jakso joukkueella | voimassa oleva joukkuejakso kyllä/ei | `joukkueet/{jid}.jaksofokus` |
| Pelaajat jaksolla | jaksolla olevat / joukkueen pelaajat. Alatilat: `valinta_odottaa`, `katselmus` | pelaajan `jaksofokus` + **`tmJaksoTila`** |
| Viikkokatsausten vastausaste | vastanneet / jaksolla olevat (ei Leikkijä) | `pelaajat/{pid}/viikkokatsaukset/{pvm}` |
| Katselmukset ajallaan | päättyneistä jaksoista katselmus tehty 2 viikon ikkunassa (D21) | `jaksofokus_historia`, `reviewit/{pvm}` |

Teemakattavuus, kuorma ja kypsyysvahti tulevat vasta S4:ssä (14 rakennettava ensin). Niiden kentät jätetään koosteesta pois. Älä kirjoita niille nollia.

S1:ssä **ei ole käyttöliittymää**. S2 tuo näkymän VP_v25:een lipun takana. S1:n ainoa näkyvä osa on johdon "Päivitä nyt" -kutsu, joka voi olla pelkkä callable ilman nappia. Nappi tulee S2:ssa.

## Ennen koodausta raportoi

- **(a) Jaettu logiikka palvelimelle.**
  - Jakson tila pitää laskea **samalla `tmJaksoTila`-funktiolla** kuin kehitystyöpöydällä (`lib/tm_aloita_jakso.js`). Muuten pulssi ja työpöytä näyttävät eri lukuja.
  - `functions/` deployataan omana pakettinaan. Kerro, miten `lib/`-logiikka saadaan sinne nyt (kopio buildissa, `functions/`-kopio + vartijatesti samasta lähteestä tms.). Ehdota yksi tapa.
  - Samaa tapaa käytetään R3:ssa ja jatkossa.
- **(b) Viikkokatsausten `seura_id` (D43 kohta 4).**
  - Viikkokatsaukset ovat jo polussa `seurat/{sid}/pelaajat/{pid}/viikkokatsaukset`. Jos funktio lukee seuroittain pelaajien kautta, `seura_id`-kenttää ei tarvita, eikä K4:n `hasOnly`-sääntöä tarvitse avata.
  - Arvioi lukumäärä per ajo: seurat × pelaajat × kuluvan viikon katsaukset.
  - Jos per-pelaaja-luku on kohtuullinen (arvio alle ~5 000 lukua per ajo kaikilla seuroilla), **jätä `seura_id` pois** ja kirjaa poikkeama D43:sta PR:ään. Tero hyväksyy.
- **(c) Viikon rajat.**
  - ISO-viikko Helsingin ajassa (`functions/helsinki_paiva.js`).
  - Dokumentin tunniste `vvvv-Www`.
  - Mikä on "voimassa oleva jakso" viikolla: jakso, joka on käynnissä sunnuntaina klo 21.
- **(d) Leikkijä.** Miten ikävaihe tunnistetaan palvelimella (sama funktio kuin sovelluksessa)? Leikkijän kevyt jakso lasketaan pelaajiin jaksolla, mutta ei vastausasteeseen.

## Data (D43)

```
seurat/{sid}/kooste/{vvvv-Www}                 ← johto + SA lukevat
  { vk, laskettu, versio: 1,
    joukkueet: { [jid]: { nimi, ikavaihe, jakso: bool, jakso_nimi?,
                          n_pelaajat, n_jaksolla, n_valinta_odottaa, n_katselmus,
                          n_vastanneet, n_vastausperusta,
                          n_katselmus_ajallaan, n_katselmus_perusta } } }

seurat/{sid}/kooste_joukkue/{jid}_{vvvv-Www}   ← johto + joukkueen valmentaja + talenttivalmentaja
  { vk, jid, laskettu, versio: 1, mittarit: { …sama kuin yllä… } }
```

- **Vain lukumääriä** (osoittaja ja nimittäjä erikseen). Prosentit ja liikennevalot lasketaan selaimessa S2:ssa. Silloin pieni joukkue -sääntö (alle 5 → näytetään 3/4) ja seuran omat tavoitteet (S3) eivät vaadi uudelleenlaskentaa.
- **Ei nimiä, pelaaja-ID:itä eikä vapaatekstiä.** Vain joukkueen nimi ja jakson nimi (teema).
- Idempotentti: sama viikko lasketaan uudelleen samaan dokumenttiin (`set`, ei `add`).
- `konfiguraatio/kooste_tavoitteet` **ei kuulu S1:een** (S3). Rules-blokin voi kuitenkin tehdä jo nyt: luku henkilökunta, kirjoitus johto.

## Cloud Function

- **`laskeSeuranKooste`**
  - europe-west1, 1st gen kuten muut ajastetut (`pubsub.schedule`).
  - Ajastus **su 21.00 Europe/Helsinki** (`timeZone`).
  - Käy läpi aktiiviset seurat. Yhden seuran virhe ei kaada muita: loki + Sentry, sitten jatketaan.
- **`paivitaSeuranKooste`** (callable)
  - Oikeus: johto/SA oma seura (`tarkistaOikeus`; pelkkä `context.auth` ei riitä).
  - Laskee kuluvan viikon sen hetkisillä tiedoilla ja merkitsee `laskettu`.
  - App Check vaaditaan kuten muissa callableissa (§38).
- Lukee Admin SDK:lla. Kirjoittaa vain kooste-dokumentit, ei mitään pelaaja- tai joukkuedokumenttiin.
- **Takaisinlaskenta:**
  - Lisää skripti tai callable-parametri, joka laskee edelliset 3 viikkoa *nykytilasta*. Merkitse ne `arvio: true`, koska jakson historiallista tilaa ei voi täysin palauttaa.
  - S2 voi näyttää trendin heti, ja arviot erottuvat.
  - Takaisinlaskennan ajaa **Tero** (tuotantodata), ei Code.

## Rules v3.53

- `kooste/{vk}`: luku SA ja oman seuran johto (VP/UTJ/seurasihteeri). Kirjoitus `false` (vain palvelin).
- `kooste_joukkue/{id}`:
  - luku kuten yllä
  - lisäksi oman joukkueen valmentaja: dokumentin `jid` joukkueen valmentajiin; käytä samaa apufunktiota kuin muissa joukkuerajauksissa
  - lisäksi talenttivalmentaja
  - Kirjoitus `false`.
- `konfiguraatio/kooste_tavoitteet`: luku oman seuran henkilökunta, kirjoitus johto/SA (S3 valmiiksi).
- **Pelaaja ja huoltaja eivät lue mitään näistä** (§7.22).
- **v3.52-jälkisiivous:** kalenterin valmentajan field-level-haara (muiden tapahtumat): poista `'muistiinpanot'` `hasOnly`-listasta ja päivitä kommentti.
- **Testit:**
  - toisen seuran johto ei lue
  - valmentaja lukee oman joukkueen `kooste_joukkue`:n, mutta ei toisen joukkueen eikä seuran `kooste`a
  - pelaaja- ja huoltajatoken eivät lue
  - client ei kirjoita (myös SA)
  - kalenterin field-level-update ennallaan
- Versio ja changelog.

## Testit

- **Puhdas kooste-funktio** (`lib/tm_seuran_kooste.js` tai vastaava, joka tuottaa koosteen syötteestä), fixtuureilla:
  - joukkue ilman jaksoa
  - valinta odottaa
  - katselmusvaihe
  - Leikkijä (ei vastausasteeseen)
  - jakso päättyi viikolla, katselmus ajallaan / myöhässä
  - pelaaja kahdessa joukkueessa (`joukkue` + `joukkueet[]`, §7.18): lasketaan kumpaankin
  - tyhjä seura
- **Viikon rajat:** su 20.59 / 21.00 Helsinki, kesäaika/talviaika (25.10.2026).
- **Vartijatesti:** koosteessa ei ole kenttiä `nimi` (pelaajan), `etunimi`, `sukunimi`, `pelaajaId`, `teksti`.
- **Funktio:** emulaattori- tai mock-testi, jossa yhden seuran virhe ei estä muita.
- Koko sarja, myös `functions/`.

## Käsin (Tero ajaa)

1. Deployn jälkeen johdon "Päivitä nyt" KPV:lle (callable konsolista tai Excel_Tuonnin admin-napista, jos teet sellaisen; ei pakollinen).
2. Tarkista Firestoresta lukumäärät: KPV P13:n luvut täsmäävät kehitystyöpöydän jaksotiloihin.
3. Ensimmäinen ajastettu ajo su 11.10. klo 21.

## Ei tässä

- Näkymä (S2)
- tavoitetasolomake (S3)
- teema, kuorma ja kypsyys (S4)
- aikajana (D44)
- hallitusraportti
