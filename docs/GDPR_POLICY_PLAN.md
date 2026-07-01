# GDPR-policy: rekisterinpitäjä-malli + etenemispolku

> Laadittu 2026-06-30. Päätös rekisterinpitäjyydestä + policy-etenemissuunnitelma. Täydentää `GDPR_TEKNIIKKA_SPEC.md`
> (tekninen RTBF/export — TEHTY + verifioitu) ja CLAUDE.md §33 B4. **EI juridinen neuvonta** — vahvistettava juristilta/DPO:lta.

## PÄÄTÖS (2026-06-30): Malli A — TalentMasterID Oy on rekisterinpitäjä
TalentMasterID Oy toimii **rekisterinpitäjänä** (controller); seura saa **käyttöoikeuden** dataan siksi aikaa kun pelaaja
edustaa heitä. (EI Malli B, jossa seura = rekisterinpitäjä + TM = käsittelijä.)

**Strateginen perustelu — "urheilijan digitaalinen passi":**
- Urheilussa lapset vaihtavat seuraa, pitävät välivuosia, vaihtavat lajia. Mallissa B kehityshistoria **pirstaloutuu tai katoaa**
  seuranvaihdossa. Mallissa A **pelaaja + perhe omistaa oman passinsa läpi elämän**; seura saa käyttöoikeuden edustusajaksi.
- Tekee datasta ja yrityksestä pitkällä aikavälillä moninkertaisesti arvokkaamman; mahdollistaa B2C-skaalauksen (Solo) suoraan.
- Linjassa "pelaaja ensin" -filosofian kanssa.

**Mallien ero (tiivis):**
| | A) TM rekisterinpitäjä (VALITTU) | B) Seura rekisterinpitäjä |
|---|---|---|
| Seloste | Yksi, TM:n nimissä | Per seura |
| DPO / DPIA / breach | TM:n vastuulla | Seuran vastuulla |
| DPA-sopimukset seurojen kanssa | EI tarvita | Tarvitaan jokaisen kanssa |
| Tietopyynnöt (RTBF/export) | TM hoitaa | Seura hoitaa |
| Skaalautuvuus | Yksinkertaisempi | Raskaampi per seura |

## ETENEMISPOLKU

### Vaihe 1 — Periaatevalinta ✅ TEHTY
Malli A valittu (yllä).

### Vaihe 2 — Testaa Sibbo-pilotilla (HETI)
Ota yhteys Joakimiin (Sibbo) ja ehdota Malli A:ta: *TalentMasterID toimii rekisterinpitäjänä → seuran ei tarvitse ottaa
juridista vastuuta, tehdä DPIA:ta alaikäisten terveysdatasta eikä pyörittää GDPR-prosesseja; seura saa valmentajille suoran,
valmiiksi jäsennellyn näkymän dataan.* Useimmat seurat huokaisevat helpotuksesta (ei resursseja/osaamista GDPR-prosesseihin).
Sibbon "kyllä" = vihreä valo. (Kytkeytyy #85: Sibbo-sopimuspohja päivitetään Malli A:han ENNEN lähetystä.)

### Vaihe 3 — Juristin vahvistus (maksuton neuvonta)
Suomen Yrittäjien lakipuhelin (jos jäsen) tai Uusyrityskeskuksen kumppanuusjuristi. Kysymys juristille:
*"Kehitämme urheilusovellusta joka laskee alaikäisten biologista ikää. Haluamme olla itse rekisterinpitäjä (Malli A), jotta
palvelu skaalautuu suoraan kuluttajille ja seuroille ilman seuratason DPA-sopimuksia. Mitkä ovat suurimmat juridiset riskimme,
ja riittääkö sovelluksen sisäinen huoltajan suostumusmetodi kattamaan Art. 9 (terveysdata) vaatimukset?"*

### Vaihe 4 — Tekniset seuraukset koodareille (VASTA juristin jälkeen)
**Älä anna koodareille tehtäviä ennen juristin suuntaviivoja.** Malli A:n tekninen kuorma on kevyt:
- **Yksi globaali retention-ajastin** (esim. tili anonymisoidaan/poistetaan jos käyttäjä ei kirjautunut ~2 v) — käyttää valmista
  RTBF-mekanismia (`poistaPelaajaGDPR`), vain ajastin + kynnys päälle.
- **Yksi suostumusikkuna** sovelluksen sisäänkirjautumiseen (TM:n oma suostumus, ei per-seura).
- (Malli B olisi vaatinut per-seura-retention-säännöt tietokantaan → paljon monimutkaisempi. Vältetty.)

## ⚠️ DOKUMENTIT JOTKA PÄIVITETTÄVÄ MALLI A:HAN (Malli B -oletus nyt)
1. **`docs/SIBBO_PILOTTISOPIMUS.md` kohta 8** — sanoo nyt *"Seura toimii rekisterinpitäjänä ja Palveluntarjoaja
   henkilötietojen käsittelijänä + erillinen DPA"*. → Malli A: **TalentMasterID rekisterinpitäjä, ei seuratason DPA:ta**,
   seura saa käyttöoikeuden. **Päivitettävä ENNEN kuin sopimus lähtee Joakimille (#85).**
2. **`docs/GDPR_TEKNIIKKA_SPEC.md` §0** — sanoo *"Seura = rekisterinpitäjä, TM = käsittelijä"*. → päivitä Malli A:han.
3. **Tietosuojaseloste** — laaditaan TM:n nimissä (rekisterinpitäjä), MyE.Way-seloste rakennemallina (oikeusperuste =
   suostumus, profilointi ilmoitettava, EU-only, RTBF/export-oikeudet, säilytysaika). Vaatii juristin tarkistuksen.
4. **TM tarvitsee:** nimetty tietosuojayhteyshenkilö/DPO-harkinta, tietosuojaseloste, DPIA (alaikäiset + Art. 9 bio/terveysdata).

## Status
Periaatevalinta ✅. Seuraavat: Sibbo-keskustelu (Vaihe 2) → juristi (Vaihe 3) → tekninen toteutus (Vaihe 4, queued).
Dokumenttipäivitykset (Sibbo-sopimus + GDPR-spec) tehtävissä heti (eivät vaadi juristia — vain mallin kirjaaminen oikein).
