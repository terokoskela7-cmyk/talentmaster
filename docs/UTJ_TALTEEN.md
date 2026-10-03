# UTJ_v1 talteen: Seuran DNA ja Kasvattisuppilo

> 3.10.2026 · `TalentMaster_UTJ_v1.html` arkistoitu → `archive/TalentMaster_UTJ_v1.html` (sisältö ennallaan).
> UTJ (urheilutoimenjohtaja) käyttää VP_v25:tä ja Seurahallintaa.
>
> **Tila: Odottaa Kehitystilanteen suunnittelua — ei toteutettu.** DNA:ta ja Kasvattisuppiloa ei siirretty Seuraan
> eikä Kehitystilanteeseen (suunnittelu kesken toisessa sessiossa).

## Seuran DNA

**Mitä UTJ näytti** ("Seuran DNA" -välilehti):
- Viisi sakaraa: Pelifilosofia, Tekninen identiteetti, Psykologinen profiili, Fyysinen tyyli, Yhteisö & kulttuuri.
- Jokaisesta sakarasta näkyivät valinta (`valintaTeksti`) ja painoarvo (1–10, palkki).
- Napit "Muokkaa DNA:ta →" (`tm_dna_builder.html?seura=`) ja "Filosofiakirjasto →".
- Ilman DNA:ta näkyi tyhjä tila ja neljä filosofia-arkkityyppiä.

**Data:** `seurat/{sid}/dna_konfig/{autoId}`. UTJ luki uusimman dokumentin (`orderBy('luotu','desc').limit(1)`).

| Kenttä | Sisältö |
|---|---|
| `sakarat[]` | viisi objektia: `id`, `nimi`, `valinta`, `valintaTeksti`, `painoarvo`, `omaKuvaus` |
| `luotu` | ISO-merkkijono |
| `versio` | `'1.0'` |

**Kirjoittaja: ei ole.**
- `tm_dna_builder.html` (`tallenna()`, r. ~1229–1244) muodostaa saman rakenteen, mutta tallentaa sen **vain selaimen localStorageen** (`tm_dna_konfig`). Koodissa on kommentti "Firestore-integraatio Sprint 5".
- UTJ luki ensin localStoragen ja vasta sitten Firestoren. Käytännössä DNA näkyi siis vain samassa selaimessa, jossa se oli rakennettu.
- `tm_dna_builder.html` ja `tm_dna_opas.html` jäävät juureen ennalleen.

**Koodi:** `archive/TalentMaster_UTJ_v1.html`: `lataaDna()`, `renderDnaKonfig()`, `renderDnaEmpty()` sekä vakiot `DNA_VARIT` ja `DNA_SAKARAT` (r. ~483–500).

## Kasvattisuppilo

**Mitä UTJ näytti** ("Kasvattisuppilo"-välilehti, r. 325–333):
- Neljä lukua:

  | Luku | Kenttä | Laskenta |
  |---|---|---|
  | Kasvattia edustuksessa | `sN` | merkinnät, joissa `edustus` on tosi |
  | VL / Ykkönen | `sVL` | **ei laskettu koskaan**: `lataaS` ei täytä tätä lukua |
  | Minuuttia yhteensä | `sMin` | `minuutit`-summa |
  | Kasvattitehokkuus % | `sT` | edustuksessa olevien osuus merkinnöistä |

- Lisäksi lista 10 uusimmasta merkinnästä: nimi, sarja ja vuosi sekä minuutit.

**Data:** `seurat/{sid}/kasvattisuppilo/{id}`. UTJ luki 20 uusinta (`orderBy('vuosi','desc')`).

| Kenttä | Sisältö |
|---|---|
| `nimi` | pelaajan nimi (henkilötieto) |
| `sarja` | sarja |
| `vuosi` | vuosi |
| `minuutit` | peliminuutit |
| `edustus` | bool |

**Kirjoittaja: ei ole.** Mikään elävä sovellus, `functions/` tai `scripts/` ei kirjoita kokoelmaa. Tyhjän tilan teksti oli "Dataa kertyy kun VP lisää kehityspolkumerkintöjä", mutta VP_v25:ssä ei ole tällaista toimintoa.

**Koodi:** `archive/TalentMaster_UTJ_v1.html`: `lataaS()` (r. ~480).

## Firestore-säännöt (v3.35)

`tm_admin/firestore.rules` **ei sisällä match-blokkia** kokoelmille `dna_konfig` tai `kasvattisuppilo` seuran alla. `/seurat/{seuraId}`-blokissa ei myöskään ole wildcard-alikokoelmaa; ainoa `/{alikokoelma}/{polku=**}` on `players/{playerId}`:n alla. Siksi:
- **Johtoroolit (vp, UTJ, seurasihteeri) eivät voi lukea kumpaakaan kokoelmaa tällä hetkellä.** Sama koskee kaikkia selaimia, myös SA:ta. Vain Admin SDK pääsee niihin käsiksi.
- UTJ_v1:n Firestore-luvut epäonnistuivat aina ja otettiin kiinni (`.catch(()=>null)`). Näkymä näytti tyhjää tilaa, tai DNA:n tapauksessa localStoragen sisällön.

Toteutusvaiheessa tarvitaan siis sääntöjen match-blokit, ja Kasvattisuppiloon myös kirjoittaja.

## Dokumentteja kokoelmissa per pilottiseura (vain luku)

Pelkkä luku (count-aggregaatti), gcloud ADC. Ajo repon juuresta: `node scripts/diag_utj_kokoelmat.cjs`.

| Seura | dna_konfig | kasvattisuppilo |
|---|---|---|
| _(täydennetään ajon jälkeen)_ | | |

## Kun toteutus aloitetaan (Kehitystilanteen suunnittelun jälkeen)

1. **DNA:** `tm_dna_builder.html`:n tallennus Firestoreen (`dna_konfig`). Säännöt: luku johtoroolit, kirjoitus vp/UTJ. Testit.
2. **Kasvattisuppilo:**
   - kirjoittaja (kuka kirjaa nousut ja minuutit, ja mistä: TASO-integraatio §20?)
   - säännöt
   - huomio `nimi`-kenttään: pelaajaId-viite nimen sijaan, jotta GDPR-poisto (`poistaPelaajaGDPR`) kattaa sen
   - `sVL`-luvun laskenta
3. **Päällekkäisyys:** Kehitystilanne v0.1:n omat tavoitteet (`omat_tavoitteet`, esim. "Omat kasvatit edustukseen") kattavat osan Kasvattisuppilosta. Ratkaistaan suunnittelussa.
