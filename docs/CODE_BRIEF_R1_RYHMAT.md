# CODE BRIEF · R1 — Seuran ryhmät (D33) · Sibbo 1.11.2026

**Kaista: Tero** (Seura/VP_v25/Master_v16/Pelaaja_v7/Vanhempi_v2, `lib/`, Rules). PR-kuvauksen ensimmäinen rivi on "Kaista: Tero".
**Tavoite:** Sibbo-Vargarna käyttää ryhmiä **1.11.2026** alkaen.
**Design:** `docs/design/idp-v2/15_kausisuunnitelma.html` · Ryhmät · D33 (sääntö/lista, jäädytys tapahtumaan). Raportoi PR:ssä, mitä kohtaa noudatat.
**Rules:** v3.47 (ryhmät). Seuran pulssin S1 siirtyy v3.48:aan.

**Ei Kenttä-lippua.** Ryhmät ovat kalenterin ominaisuus, ja Sibbo käyttää nykyisiä näkymiä ilman Kenttä-lippua. Kaikki tässä toimii lipusta riippumatta.

## Sibbon tarpeet (Tero 8.10.2026)

1. Ryhmät: **Maalivahdit** (+ maalivahtivalmentaja) ja **talenttiryhmä**.
2. Ylläpitäjät: VP, maalivahtivalmentaja, talenttivalmentaja, fysiikkavalmentaja, valmentaja.
3. Ryhmään voi kuulua pelaajia **eri joukkueista ja ikäluokista**.
4. Ryhmäharjoituksiin **kirjataan läsnäolo**.
5. Ryhmäharjoitus **näkyy pelaajan ja huoltajan kalenterissa**.

## Päätökset (D33, lukitaan tällä briiffillä)

- **R1 = lista-ryhmät.** Ryhmälle annetaan nimi, ja pelaajat valitaan mistä tahansa seuran joukkueesta. Sääntöryhmät (esim. pelipaikka MV) tulevat myöhemmin, koska pelipaikkatieto ei ole luotettava.
  - Poikkeus: **talenttiryhmä saa olla sääntöryhmä** (`talenttiOhjelma == true`), jos se ei venytä aikataulua. Muuten se tehdään listana.
- **Ei uutta roolia "maalivahtivalmentaja".** Maalivahtivalmentaja on käyttäjä roolilla `valmentaja`, ja hänet merkitään ryhmän valmentajaksi kenttään `ryhma.valmentajat[]`.
  - Ryhmän valmentaja voi luoda ryhmälle tapahtumia ja kirjata niihin läsnäolon kaikille ryhmän pelaajille, joukkueesta riippumatta.
- **Kuka luo ja muokkaa ryhmiä:** SA, johto (VP/UTJ/seurasihteeri), talenttivalmentaja, fysiikkavalmentaja ja `valmentaja`.
  - Valmentaja voi muokata vain ryhmiä, joissa hän on itse kentässä `valmentajat[]`.
  - Kukaan ei voi lukea toisen seuran ryhmiä eikä kirjoittaa niihin.
- **Kalenteri:** tapahtuman "Kenelle" voi olla joukkue, useampi joukkue, ryhmä tai poimitut pelaajat.
  - Kokoonpano lasketaan elävänä siihen asti, kunnes läsnäolo kirjataan tai päivä menee ohi. Silloin se jäädytetään tapahtumaan (`pelaajat_id`-snapshot).
- **Pelaaja ja huoltaja** näkevät oman ryhmätapahtumansa kalenterissa: nimi, aika ja paikka (esim. "Maalivahtiharjoitus"). Ryhmän jäsenlistaa he eivät näe.
- **Läsnäolo** kirjataan samalla tavalla kuin joukkuetapahtumissa (sama malli ja sama kooste).

## Ennen koodausta raportoi

- **(a)** Miten kalenteritapahtuma kohdistetaan nyt? Kerro kentät (joukkue, joukkueet[], poimitut, talenttiryhmä) ja mistä Pelaaja_v7 ja Vanhempi_v2 hakevat oman kalenterinsa. Rules suodattaa vain seuratasolla (`onPelaajanSeura`), ja kyselyt suodattavat sovelluksessa.
- **(b)** Pystyykö pelaaja kyselemään ryhmätapahtumansa ilman uutta indeksiä? Ehdotus: tapahtumaan `pelaajat_id` (array-contains) aina, kun kohde on ryhmä tai poimitut pelaajat.
- **(c)** Läsnäolon kirjoitus: riittävätkö nykyiset kalenterisäännöt valmentajalle, joka ei ole tapahtuman luoja mutta on ryhmän valmentaja (field-level-update)?
- **(d)** Mitkä pelaajadokumentin kirjoitukset ryhmän valmentaja tarvitsisi toisen joukkueen pelaajalle? `onOmanJoukkueenValmentaja` estää ne nyt. **R1:ssä ei laajenneta pelaajadokumentin oikeuksia.** Raportoi vain, mitä jää puuttumaan (esim. havainnot), niin päätetään R2:ssa.

## Data

```
seurat/{sid}/ryhmat/{rid}
  nimi            (≤ 60)
  tyyppi          'lista' | 'saanto'
  saanto?         { kentta: 'talenttiOhjelma', arvo: true }   // vain tyyppi 'saanto'
  pelaajat_id[]   (lista-ryhmä; ≤ 200)
  valmentajat[]   (uid, ≤ 10)
  kuvaus?         (≤ 200)
  aktiivinen      bool
  luotu, luoja_uid, muokattu
```

Kalenteritapahtumaan (sovita nykyiseen malliin selvityksen (a) mukaan):

```
kohde:        { tyyppi: 'joukkue' | 'joukkueet' | 'ryhma' | 'pelaajat', ryhma_id?, ryhma_nimi? }
pelaajat_id[]: elävä, kunnes jäädytetään
jaadytetty?:   ISO-aika
```

## Rules v3.47

- **`ryhmat/{rid}`**
  - Luku: oman seuran henkilökunta ja SA. Pelaaja ja huoltaja eivät lue ryhmädokumenttia.
  - Luonti: henkilökunnan roolit (yllä). Luojan uid on pakko olla mukana kentässä `valmentajat[]`, ellei luoja ole johtoa.
  - Päivitys: johto, SA tai ryhmän valmentaja (`request.auth.uid in resource.data.valmentajat`).
  - Poisto: vain johto ja SA. Mieluummin `aktiivinen: false` kuin poisto.
  - Validointi: kenttien `hasOnly`, pituudet, `tyyppi`-enum, listojen koot.
- **Kalenteri:** ryhmän valmentaja saa päivittää ryhmätapahtuman läsnäolon, vaikka ei ole tapahtuman luoja (`get(ryhmat/{rid}).valmentajat`). Raportoi ensin kohta (c).
- **Pakolliset testit:**
  - toisen seuran käyttäjä ei lue eikä kirjoita
  - pelaaja ei lue `ryhmat`-kokoelmaa
  - valmentaja, joka ei kuulu ryhmän valmentajiin, ei päivitä ryhmää
  - Changelog ja versio.

## Näkymät

- **Seura.html** (tai VP_v25, valitse kumpi on Sibbon VP:n pääkäyttö ja raportoi): uusi osio **Ryhmät**.
  - Ryhmälista, jossa jäsenmäärä.
  - Luo/muokkaa: nimi, tyyppi, valmentajat ja pelaajat. Pelaajavalitsimessa haku ja suodatus joukkueittain.
- **Kalenteri** (VP_v25 ja Master_v16, siellä missä tapahtuma luodaan):
  - "Kenelle" -valintaan **Ryhmä**.
  - Läsnäolon kirjaus näyttää ryhmän jäsenet joukkueineen.
- **Masterin valmentaja** näkee omat ryhmänsä ja niiden tapahtumat omassa kalenterissaan.
- **Pelaaja_v7 ja Vanhempi_v2:** ryhmätapahtuma näkyy kalenterissa samalla tavalla kuin joukkuetapahtuma (nimi, aika, paikka). Ei jäsenlistaa.

## Kieli

- **Sibbo on ruotsinkielinen seura.** Uudet tekstit tehdään `tm_lang`-/`masterT`-/`vpT`-avaimiksi (fi). Sv-avaimet jätetään määrittelemättä.
- **Tee Geminin käännöslista PR:ään heti ensimmäisessä PR:ssä**, jotta käännökset ehtivät ennen 1.11:tä.

## Testit

- Puhtaat funktiot:
  - kohdejoukon laskenta (joukkue, ryhmä lista, ryhmä sääntö, poimitut)
  - jäädytys
  - pelaajan oman kalenterin suodatus
- Rules-emulaattori yllä olevien kohtien mukaan.
- Käsin:
  - **Sibbossa ei kirjoiteta oikeille pelaajille testejä.** Testaa KPV:n nimetyillä testipelaajilla (Topias, Toppari Testi, Testi Pelaaja, Testi Test, Tero Testaaja; ks. CLAUDE.md §10).
  - Ryhmä kahdesta joukkueesta → tapahtuma → läsnäolo → näkyy pelaajalla.
  - Toisen joukkueen valmentaja, joka on ryhmän valmentaja, voi kirjata läsnäolon.
- Koko sarja viimeisen main-mergen jälkeen.

## Ei tässä (R2 tai myöhemmin)

- Sääntöryhmät pelipaikasta.
- IDP-ryhmät jakson ydinvahvuudesta (15/14).
- Ryhmän valmentajan oikeudet pelaajadokumenttiin (havainnot ym.).
- Harjoituksen osan kohdistus ryhmälle (14).
- **VEO-linkki:** erillinen päätös. Ks. 04_videokeskustelu_kartta (R6.4); Rulesissa on jo `viestit.video_url` (v3.39).
