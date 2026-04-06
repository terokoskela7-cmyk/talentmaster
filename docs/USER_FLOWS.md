# TalentMaster™ — Käyttäjäpolkumatriisi
## Päivitetty 2026-04-06

> Ennen kuin rakennetaan uusi ominaisuus, tarkistetaan tästä dokumentista
> miten se vaikuttaa jokaiseen rooliin. Päivitetään aina kun uusi toiminto
> suunnitellaan tai toteutetaan.

---

## Roolien lyhenteet (päivitetty)

| Lyhenne | Rooli | Näkymä |
|---|---|---|
| SA | Super Admin | TalentMaster_Admin.html |
| VP | Valmennuspäällikkö | TalentMaster_VP_v18.html |
| VAL | Valmentaja + kenttäroolit | TalentMaster_Master_v9.html |
| TST | Testaaja / Fysiikkavalmentaja | TalentMaster_Harjoitettavuus_Lomake.html |
| PEL | Pelaaja | TalentMaster_Pelaaja_v1.html |
| VAN | Vanhempi / Huoltaja | TalentMaster_Vanhempi.html |

---

## Toiminto 1 — Pelaajan rekisteröinti

| Rooli | Mitä tekee | Missä | Tila |
|---|---|---|---|
| SA | Luo seura + VP-käyttäjä | Admin.html | OK |
| VP | Luo joukkue, lähettää rekisteröintikutsun vanhemmalle | Seura.html | OK |
| VAL | Näkee uuden pelaajan joukkuelistassaan | Master v9 | OK |
| PEL | Kirjautuu PIN tai salasanalinkillä | Pelaaja_v1.html | OK |
| VAN | Täyttää suostumuslomakkeen, saa salasanalinkin | Rekisterointi.html + Vanhempi.html | OK testattu 2026-04-04 |

Avoin: joukkueNimi tallentuu ID:nä eikä näyttönimenä rekisteröintilomakkeesta.

---

## Toiminto 2 — Testitapahtuman luominen

| Rooli | Mitä tekee | Missä | Tila |
|---|---|---|---|
| SA | Näkee kaikki tapahtumat | Admin.html | EI vielä |
| VP | Luo testitapahtuman kalenteriin | VP_v18 | OK |
| VAL | Luo tapahtuman omalle joukkueelleen | Master v9 Kalenteri | OK |
| TST | Avaa tapahtuman testipäivänä | Harjoitettavuus_Lomake.html | KESKEN tapahtumaId-integraatio |

Avoin: Lomake ei lue tapahtumaId URL:sta — hakee pelaajat joukkueen mukaan.

---

## Toiminto 3 — Harjoitettavuuskartoituksen suorittaminen

| Rooli | Mitä tekee | Missä | Tila |
|---|---|---|---|
| VP | Näkee tapahtuman tilan | VP_v18 | OK |
| TST | Syöttää tulokset protokollan mukaan | Harjoitettavuus_Lomake_v3.html | OK lomake, KESKEN tapahtumaintegraatio |

Testipankki (tm_testipankki.js, GitHubissa Apr 6):
- 64 testiä, 8 protokollaa
- FLEI: 5 ketjua (SBL / SFL / LL / DIAG / DFL)
- hpp_diag = SL + FL yhdistettynä (Wilke 2016)

---

## Toiminto 4 — Tulosten tarkastelu

| Rooli | Mitä näkee | Missä | Tila |
|---|---|---|---|
| SA | Kaikki kartoitukset | Admin.html | EI vielä |
| VP | Joukkueen FLEI, ikäluokittain, trendit | VP_v18 | KESKEN |
| VAL | Tilannekortti + TalentMaster_Valmentaja_Matriisi.html | Master v9 + matriisi | OK matriisi valmis, PENDING GitHub |
| TST | Tallennusvahvistus | Harjoitettavuus_Lomake.html | OK |
| PEL | FLEI-tulos selkokielellä + omatoimiohjelma | Pelaaja_v1.html | KESKEN UI valmis, FLEI-integraatio puuttuu |
| VAN | Lapsen FLEI + kehityssuositukset | Vanhempi.html | KESKEN UI valmis, FLEI-integraatio puuttuu |

---

## Toiminto 5 — Biologisen iän mittaus

| Rooli | Mitä tekee | Missä | Tila |
|---|---|---|---|
| VP | Näkee PHV-tilan tilastollisesti | VP_v18 | EI vielä |
| VAL | Näkee PHV-jakauman + kuormitusrajoitukset | Master v9 | EI vielä |
| TST | Mittaa pituus/paino/istumapituus, järjestelmä laskee PHV | BioIka-lomake | EI vielä — Excel-pohja valmis |
| PEL | Kasvupyrähdyksen vaiheen näyttö selkokielellä | Pelaaja_v1 | EI vielä |
| VAN | Kuormitusrajoitusvaroitus PHV-huipulla | Vanhempi.html | EI vielä |

TM_LASKE_BIOIKA() valmis testipankissa — tallentaa phv_tila + maturity_offset Firestoreen.

---

## Toiminto 6 — IDP (Individual Development Plan)

| Rooli | Mitä tekee | Missä | Tila |
|---|---|---|---|
| VP | Hyväksyy IDP-aktivoinnin, seuraa tilastoja | VP_v18 | KESKEN aktivointilogiikka |
| VAL | Tekee havaintoja, aktivoi IDP:n (3 reittiä) | Master v9 | KESKEN havainnot |
| TST | FLEI -> IDP automaattisesti | IDP-kortti v3 | KESKEN kytkentä suunniteltu |
| PEL | Kehityskortti: vahvuudet 70%, kehityskohteet 30%, harjoitteet | IDP_Kortti_v3.html + Pelaaja_v1 | KESKEN kortti valmis, Firebase kesken |
| VAN | Lapsen kehityskortti selkokielellä | Vanhempi.html | KESKEN UI valmis |

3 aktivointireittiä: 1) Manuaalinen (VAL/TV/VP), 2) Automaattisignaali (X-Factor/HG), 3) Talenttiohjelma (KORI)

---

## Toiminto 7 — ADAR / Game IQ

| Rooli | Mitä tekee | Missä | Tila |
|---|---|---|---|
| VP | Joukkueen D4-profiili, ADAR-trendit | VP_v18 | EI vielä |
| VAL | Täyttää ADAR-arvioinnin harjoitusten yhteydessä | Master v9 ADAR | KESKEN Firebase-integraatio |
| PEL | Peliäly-palaute ikäluokan mukaan | Pelaaja_v1 / IDP-kortti | EI vielä |

ADAR-ikäluokkakohtaistus:
- U8-U12: Havainnoija (vain Assess) — pelaaja ei tiedä
- U13-U15: Arvioija (A+D+A, max 12p) — narratiivi pakollinen
- U16-U19: Täysi ADAR (A+D+A+R + pelaajan reflektio)

---

## Toiminto 8 — Kalenteri ja tapahtumat

| Rooli | Mitä tekee | Missä | Tila |
|---|---|---|---|
| VP | Näkee kaikkien joukkueiden tapahtumat | VP_v18 | OK |
| VAL | Näkee oman joukkueen tapahtumat | Master v9 Kalenteri | OK |
| TST | Avaa testauslomakkeen tapahtumasta | Harjoitettavuus_Lomake.html | KESKEN URL-parametri puuttuu |
| PEL | Omatoimiharjoitteet viikkonäkymässä | Pelaaja_v1.html | KESKEN UI valmis, Firestore puuttuu |
| VAN | Lapsen harjoituskalenteri + streak | Vanhempi.html | KESKEN UI valmis, Firestore puuttuu |

---

## Toiminto 9 — Omatoimiharjoittelu ja streak (UUSI)

| Rooli | Mitä tekee | Missä | Tila |
|---|---|---|---|
| VP | Streakien poikkeamat dashboardissa | VP_v18 | EI vielä |
| VAL | Halytys kun pelaajan streak katkeaa | Master v9 | EI vielä |
| PEL | Kirjaa T/D/S/P-harjoitteet, näkee streak + XP | Pelaaja_v1.html | KESKEN UI valmis, Firestore TEHDÄÄN SPRINT 4 |
| VAN | Lapsen streak + viimeisin kirjaus | Vanhempi.html | KESKEN UI valmis |

Firestore-rakenne — tehdään oikein ennen AI-agentin rakentamista:
  seurat/{id}/pelaajat/{pelaajaId}/kirjaukset/{pvm}
    tyyppi: T/D/S/P, tehty: bool, kesto_min, rpe: 1-10
    aika: ilta/aamu/paiva, fiilinki: 1-5

---

## Toiminto 10 — Teknis-fyysinen ohjelma (UUSI 2026-04-06)

| Rooli | Mitä tekee | Missä | Tila |
|---|---|---|---|
| VP | FLEI-jakauma — klinikkatrigger alle 40% | VP_v18 | EI vielä |
| VAL | 3+1-malli alkurutiinissa, ketjuprofiili per pelaaja | TalentMaster_Valmentaja_Matriisi.html | OK valmis, PENDING GitHub |
| TST | Kartoitus -> FLEI -> ohjelma generoidaan automaattisesti | Harjoitettavuus_Lomake.html | KESKEN generointi puuttuu |
| PEL | D/S/P-omatoimiohjelma + pallotekniikkacuet | Pelaaja_v1 + IDP-kortti | KESKEN UI valmis, generointi puuttuu |
| VAN | Lapsen omatoimiohjelma selkokielellä | Vanhempi.html | EI vielä |

Logiikka: harjoitelogiikka_v3.js + tm_ketju_matriisi.js -> generoimTehtavat(pelaaja) -> Firestore omatoimi_ohjelmat

---

## Kehitysprioriteettijärjestys (päivitetty 2026-04-06)

Sprint 4 — Kirjaukset oikeaan rakenteeseen:
1. Harjoitekirjauksen Firestore-rakenne oikein (ENNEN AI-agentin rakentamista)
2. Testisyöttölomake Master v9:aan — KRIITTISIN
3. Harjoitettavuuslomake lukee tapahtumaId URL:sta

Sprint 5 — Pelaaja ja vanhempi saavat oikeaa dataa:
4. FLEI -> Pelaaja_v1 + Vanhempi.html
5. IDP-aktivointilogiikka (3 reittiä)
6. Streak Firestoreen (pois localStoragesta)

Sprint 6 — Tiedolla johtaminen:
7. VP: OVR-jakauma, HG-halytykset, ADAR-trendit, streak-poikkeamat
8. Valmentajan kenttähavainto -> Firestore
9. ADAR Firestore-integraatio

Sprint 7-8 — AI-agentti:
10. AI Behavioural Science -agentti (vaatii 2-4 vk dataa)

---

## Tarkistuslista uudelle ominaisuudelle

- SA: Naakeeko admin taman? Tarvitaanko hallintonakymaa?
- VP: Onko dashboard-nakyma? Miten seuraa?
- VAL: Toimiiko puhelimella kentalla?
- TST: Tarvitaanko erillistä lomaketta?
- PEL: Ikakohtainen kieli? (leikkija/rakentaja/showcase)
- VAN: Selkokielinen? Huoltaja ymmartaa?
- Data: Firestore-polku + kentat suunniteltu?
- Oikeudet: Permission matrix tarkistettu?
- Mobiili: Toimiiko puhelimella?
- FLEI: Vaikuttaako FLEI-laskentaan? 5 ketjua, DIAG = SL+FL
- Ikavaihe: PHV-rajoitin huomioitu?
