# CODE_OHJE — Valmentajan kirjoitusoikeus joukkuetasolle (permissio-lukko)

**Tyyppi:** firestore.rules -tiukennus (+ mahd. claims) · **Kohde:** `tm_admin/firestore.rules`
(deploy: PR → N4-CI automaattisesti) · **Base:** `main`.

## Tausta / juurisyy

Nyt valmentajan kirjoitusoikeus on **seuratasolla**: `onOmanSeuranValmentaja(seuraId)` =
`onOmaSeura(seuraId) && onValmentajaRooli()`, missä `onOmaSeura` = `request.auth.token.seuraId == seuraId`.
**Joukkuetta ei tarkisteta missään** → kuka tahansa seuran valmentaja voi kirjoittaa ADAR/havainnon/arvioinnin
**kenen tahansa saman seuran pelaajan** dokumenttiin. Vaatimus: valmentaja kirjoittaa **vain oman joukkueensa**
pelaajiin. VP/valmennuspäällikkö (johto) hoitaa kaikkia.

## Malli (jo olemassa — Tilanne A)

- Valmentaja↔joukkue -liitos on jo olemassa: `kayttajat/{uid}.joukkueId` (Seuran henkilöstö -näkymä näyttää sen;
  "Muokkaa" lisää/vaihtaa joukkueen). VP:llä joukkue = tyhjä → hoitaa kaikkia.
- Claims-putki on olemassa (henkilöstö-näkymän CLAIMS "✓ OK"); tokenissa on jo `rooli` + `seuraId`.

## Työ

### 1. Tee valmentajan joukkue sääntökäyttöiseksi
Kaksi vaihtoehtoa — **valitse self-contained (suositus) ellei claims-putki ole helposti käsillä:**
- **(Suositus, self-contained) rules-`get()`:** lue valmentajan oma joukkue säännöissä:
  ```
  function valmentajanJoukkue() {
    return get(/databases/$(database)/documents/kayttajat/$(request.auth.uid)).data.joukkueId;
  }
  ```
  Ei koske claims-putkeen; kaikki `tm_admin/firestore.rules`:issa (joka deployaa N4-CI:llä). Yksi get() per
  kirjoitus (kirjoitukset harvoja → OK).
- **(Optimointi) custom claim:** lisää `joukkueId` (tai `joukkueet[]`) valmentajan claimiin samoin kuin
  `seuraId`. Nopeampi (ei get-lukua), mutta vaatii claims-funktion muokkauksen (etsi missä
  `setCustomUserClaims` asuu — ei näy tässä repossa, mahd. Admin-appi / cloud function).

### 2. Uusi apufunktio (johto ohittaa joukkuerajauksen)
```
function onOmanJoukkueenValmentaja(seuraId, pelaajaId) {
  return onOmanSeuranValmentaja(seuraId)
      && ( onJohtoRooli()                                   // VP/urheilutoimenjohtaja → koko seura
        || pelaajaData(seuraId, pelaajaId).joukkueId == valmentajanJoukkue() );
}
```
- **VAHVISTA pelaajan joukkue-kentän nimi** (`joukkueId` vs `joukkue`) ja täsmää **ID:llä** (ei nimellä).
- **Jos valmentaja voi kuulua useaan joukkueeseen** (Seura "lisää"), käytä listaa: `joukkueet[]` + `in`.

### 3. Kytke tiukennus VALMENTAJA-kirjoituksiin (ei muihin)
Vaihda `onOmanSeuranValmentaja` → `onOmanJoukkueenValmentaja` niissä **pelaajaan sidotuissa
valmentaja-kirjoituksissa** joissa se on nyt käytössä:
- `seurat/{sid}/pelaajat/{pid}/havainnot/{id}` (ADAR/pelihavainto)
- `.../adar/{id}`, `.../arviointi/{kausiId}`, `.../palautteet/{pvm}` (valmentajan arviot)
- pelaajadokumentin **valmentaja-update** (ADAR-pikakentät: `adar_viimeisin` ym.)
- **ÄLÄ** tiukenna: johto/VP-polkuja, SA:ta, pelaajan/huoltajan polkuja, LUKUA (read pysyy ennallaan).
- **Reunat säilytä:** testivastaava / fysiikkavalmentaja / fysioterapeutti nykyisin (eivät joukkuerajattuja
  tässä PR:ssä — erikseen jos tarve). Ei muutosta kalenteriin/tapahtumiin ellei ADAR-relevantti.

## Reunaehdot

- **Vain kirjoitusrajaus valmentajaroolille.** VP/johto + SA = koko seura ennallaan. Luku ei muutu.
- **Täsmää joukkue ID:llä** (stabiili), ei nimellä. Vahvista pelaajan + valmentajan kenttänimet ennen kytkentää.
- **Ei riko oman joukkueen sisäisiä kirjoituksia** (nykyinen normaalitoiminta jatkuu).
- **Deploy:** PR → N4-CI deployaa `tm_admin/firestore.rules` automaattisesti.

## Definition of Done

- **L1:** uusi `onOmanJoukkueenValmentaja` + `valmentajanJoukkue()` (get tai claim), kytketty
  havainnot/adar/arviointi/palautteet/pelaajat-update -valmentajakirjoituksiin. Johto ohittaa.
- **L2 (emulaattori, pakollinen — tämä on turvakorjaus):**
  - (a) valmentaja → OMAN joukkueen pelaaja ADAR-write → **sallittu**.
  - (b) valmentaja → MUUN joukkueen pelaaja ADAR-write → **estetty** (Missing/insufficient permissions).
  - (c) VP/urheilutoimenjohtaja → mikä tahansa seuran pelaaja → **sallittu**.
  - (d) SA → **sallittu**; (e) toisen seuran valmentaja → **estetty** (seura-lukko ennallaan).
  - (f) LUKU (read) kaikilla rooleilla **ennallaan**.
- **L3 (elävä, sanktioitu):** oman joukkueen valmentaja tallentaa ADAR Topiakselle (KPV) → onnistuu.
  (Ristikkäisjoukkue-esto todennetaan L2-emulaattorissa — ei tuotantodatalla.)
- Pieni PR, emulaattoritestit vihreät, verifioi ettei mikään olemassa oleva oman joukkueen kirjoitus rikkoudu.
