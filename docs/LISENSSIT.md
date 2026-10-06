# Lisenssit ja sisällön alkuperä

Tämä tiedosto kirjaa ulkopuolisen sisällön käyttöluvat TalentMasterissa ja periaatteet seurojen oman sisällön käsittelylle.

## 1. Ulkopuolinen sisältö TalentMasterin oletusmetodologiassa

| Lähde | Tekijä | Käyttö TalentMasterissa | Lupa | Vahvistettu |
|---|---|---|---|---|
| Nuorten fyysinen harjoittelu jalkapallossa (2014) | Jaakko Nevanlinna | Harjoitemoottorin (`harjoitelogiikka_v4.js`) fysiikkasisältö ja progressiot, ikävaiheiden painopisteet (`lib/tm_ketju_matriisi.js`) | Lupa käyttöön TalentMasterin moottorissa | 6.10.2026 (Tero Koskela) |
| Sama aineisto | Jaakko Nevanlinna | SJK-junioreiden seurasisältönä (`seurat/sjk/…`) | Lupa käyttöön SJK:n seurasisältönä | 6.10.2026 (Tero Koskela) |

Ravitsemusosio (aineiston diat 157–192) ei ole käytössä.

## 2. Lähdemerkintä

- Kaikessa sisällössä (TalentMasterin oletus ja seuran oma) on kenttä `lahde_viite`, esim. `"Nevanlinna 2014, dia 97"`.
- Pelaajalle näkyvässä sisällössä on lisäksi `lahde: 'tm' | 'seura'`.
- Uutta ulkopuolista sisältöä ei lisätä moottoriin ennen kuin lupa on kirjattu tähän tiedostoon.

## 3. Seuran oma sisältö

- Seuran valmennuslinja, harjoitepankki, ohjelmat, teemat ja arviointikehys ovat seuran omaa sisältöä ja tallentuvat vain polkuun `seurat/{seuraId}/…`.
- Muut seurat eivät näe sisältöä. Tämä varmistetaan Rules-eristystesteillä (seuraA/seuraB).
- Seuran sisältö ei koskaan siirry TalentMasterin oletussisältöön.
- Jakaminen toiselle seuralle tehdään vain kopiona, sisällön omistavan seuran luvalla. Kopiossa on kentät `alkupera` (lähdeseura ja dokumentti) ja `lupa_pvm`.
