# TalentMaster™ — Käyttäjäpolkumatriisi

> **Tarkoitus:** Ennen kuin rakennetaan uusi ominaisuus, tarkistetaan tästä
> dokumentista miten se vaikuttaa jokaiseen rooliin. Jos jonkin roolin kohdalle
> jää tyhjää, se on suunnitteluvirhe — ei jälkikäteen lisättävä ominaisuus.
>
> **Päivitetään** aina kun uusi toiminto suunnitellaan tai toteutetaan.
> Tiedosto elää projektin rinnalla SESSION_SUMMARY.md:n tapaan.

---

## Roolien lyhenteet

| Lyhenne | Rooli | Näkymä |
|---|---|---|
| **SA** | Super Admin (TalentMaster) | TalentMaster_Admin.html |
| **VP** | Valmennuspäällikkö | TalentMaster_VP_v17.html |
| **VAL** | Valmentaja | TalentMaster_Master_v8.html |
| **TST** | Testaaja / Fysiikkavalmentaja | TalentMaster_Harjoitettavuus_Lomake.html |
| **PEL** | Pelaaja + Vanhempi | TalentMaster_IDP_Kortti_v3.html (tulossa) |

---

## Toiminto 1 — Pelaajan rekisteröinti

**Kysymys: Miten uusi pelaaja tulee järjestelmään?**

| Rooli | Mitä tekee | Missä | Tila |
|---|---|---|---|
| SA | Luo seura + VP-käyttäjä | Admin.html | ✅ Valmis |
| VP | Luo joukkue, lähettää rekisteröintikutsun vanhemmalle | Seura.html | ✅ Valmis |
| VAL | Näkee uuden pelaajan joukkuelistassaan kun rekisteröinti valmis | Master v8 | ✅ Valmis |
| TST | — | — | — |
| PEL | Vanhempi täyttää suostumuslomakkeen, syöttää PalloID:n | Rekisterointi.html | ✅ Valmis |

**Tunnistetut puutteet:**
- PalloID-puuttuminen näkyy VP:lle varoituksena ✅ (rakennettu tänään)
- Valmentaja ei voi kutsua pelaajia itse — täytyykö tämä lisätä?

---

## Toiminto 2 — Testitapahtuman luominen

**Kysymys: Miten harjoitettavuuskartoitus käynnistyy?**

| Rooli | Mitä tekee | Missä | Tila |
|---|---|---|---|
| SA | Näkee kaikki tapahtumat kaikissa seuroissa | Admin.html | ⬜ Ei vielä |
| VP | Luo testitapahtuman kalenteriin, valitsee joukkueen ja päivämäärän | VP_v17 tab 11 | ✅ Rakennettu |
| VAL | Luo testitapahtuman omalle joukkueelleen kalenterista | Master v8 tab Kalenteri | ✅ Rakennettu |
| TST | Avaa tapahtuman testipäivänä, vahvistaa läsnäolijat, aloittaa testauksen | Harjoitettavuus_Lomake.html | 🔄 Puuttuu: lomake ei vielä lue tapahtumaId:tä URL:sta |
| PEL | — (ei osallistu luomiseen) | — | — |

**Seuraava konkreettinen askel:**
Harjoitettavuuslomake lukee `?tapahtumaId=...&seuraId=...` URL-parametrit
ja hakee pelaajat tapahtumasta joukkueen sijaan.

---

## Toiminto 3 — Harjoitettavuuskartoituksen suorittaminen

**Kysymys: Miten testaus tapahtuu käytännössä kentällä?**

| Rooli | Mitä tekee | Missä | Tila |
|---|---|---|---|
| SA | — | — | — |
| VP | Näkee tapahtuman tilan (suunniteltu → käynnissä → valmis) kalenterissa | VP_v17 tab 11 | ✅ Valmis |
| VAL | — | — | — |
| TST | Avaa lomakkeen tapahtumasta, valitsee testipisteet, syöttää tulokset | Harjoitettavuus_Lomake.html | ✅ Lomake valmis, 🔄 tapahtumaintegraatio kesken |
| PEL | — (ei osallistu) | — | — |

**Tunnistetut puutteet:**
- Testipistemoodi (kiertoharjoittelumalli) ✅ rakennettu
- Automaattinen pisteytys raakamäärästä ✅ rakennettu
- Excel-lataus pohjaksi ✅ rakennettu
- Tapahtumasta pelaajien haku 🔄 seuraava sprint

---

## Toiminto 4 — Tulosten tarkastelu

**Kysymys: Mitä kukin rooli näkee kun testit on tehty?**

| Rooli | Mitä näkee | Missä | Tila |
|---|---|---|---|
| SA | Kaikki kartoitukset kaikista seuroista | Admin.html | ⬜ Ei vielä |
| VP | Joukkueen FLEI-tilanne, ikäluokittain, trendejä | VP_v17 tab 9 Kartoitukset | 🔄 Perustoiminnot OK, kehitettävää |
| VAL | Joukkueen tilannekortti + yksilökortti per pelaaja | Valmentajakortti.html | ✅ Valmis |
| TST | Tallennusvahvistus, mahdollisuus korjata | Harjoitettavuus_Lomake.html | ✅ Valmis |
| PEL | Oma FLEI-tulos selkokielellä, kehityssuositukset | IDP-kortti (tulossa) | ⬜ Ei vielä |

**Tunnistetut puutteet:**
- Pelaajan oma näkymä tuloksistaan puuttuu kokonaan
- Vanhemman näkymä puuttuu
- Bio-ikä (Mirwald) ei vielä integroidu tulkintaan

---

## Toiminto 5 — Biologisen iän mittaus

**Kysymys: Miten bio-ikämittaus integroituu järjestelmään?**

| Rooli | Mitä tekee | Missä | Tila |
|---|---|---|---|
| SA | — | — | — |
| VP | Näkee pelaajien PHV-tilan tilastollisesti | VP_v17 | ⬜ Ei vielä |
| VAL | Näkee joukkueen PHV-jakauman, kuormitusrajoitukset | Master v8 | ⬜ Ei vielä |
| TST | Mittaa pituuden, painon, istumakorkeuden → järjestelmä laskee Mirwald-PHV | BioIka-lomake (tulossa) | ⬜ Lomake suunniteltu, ei rakennettu |
| PEL | Näkee "olet kasvupyrähdyksen loppuvaiheessa" selkokielellä | IDP-kortti | ⬜ Ei vielä |

**Seuraava konkreettinen askel:**
Bio-ikälomake — rakentuu Excel-pohjan (TalentMaster_BioIka.xlsx) päälle.
Tallentaa `maturity_offset` + `phv_tila` pelaajan Firestore-profiiliin.

---

## Toiminto 6 — IDP (Individual Development Plan)

**Kysymys: Miten pelaajan kehityssuunnitelma syntyy ja näkyy?**

| Rooli | Mitä tekee | Missä | Tila |
|---|---|---|---|
| SA | — | — | — |
| VP | Hyväksyy IDP-aktivoinnin, näkee koko seuran IDP-tilastoinnin | VP_v17 | 🔄 IDP-aktivointilogiikka kesken |
| VAL | Tekee havaintoja, aktivoi IDP:n manuaalisesti tai automaattisignaalista | Master v8 | 🔄 Havainnot kesken |
| TST | FLEI-tulos syötetään automaattisesti IDP:hen | IDP-kortti | 🔄 Kytkentä suunniteltu |
| PEL | Näkee oman kehityskorttinsa: vahvuudet (70%), kehityskohteet (30%), harjoitteet | IDP_Kortti_v3.html | 🔄 Kortti rakennettu, Firebase-integraatio kesken |

---

## Toiminto 7 — ADAR / Game IQ

**Kysymys: Miten kognitiivinen arviointi tapahtuu?**

| Rooli | Mitä tekee | Missä | Tila |
|---|---|---|---|
| SA | — | — | — |
| VP | Näkee joukkueen D4-profiilin | VP_v17 | ⬜ Ei vielä |
| VAL | Täyttää ADAR-arvioinnin pelaajista harjoitusten yhteydessä | Master v7 (ADAR-moduuli) | 🔄 Rakennettu Master v7:ssä, Firebase-integraatio kesken |
| TST | — | — | — |
| PEL | Näkee peliäly-palautteensa selkokielellä | IDP-kortti | ⬜ Ei vielä |

---

## Toiminto 8 — Kalenteri ja tapahtumat

**Kysymys: Miten viikkosykli näkyy eri rooleille?**

| Rooli | Mitä tekee | Missä | Tila |
|---|---|---|---|
| SA | — | — | — |
| VP | Näkee kaikkien joukkueiden tapahtumat kuukausinäkymässä, luo testitapahtumia | VP_v17 tab 11 | ✅ Rakennettu |
| VAL | Näkee oman joukkueensa tapahtumat, luo tapahtumia | Master v8 tab Kalenteri | ✅ Rakennettu |
| TST | Avaa testauslomakkeen suoraan tapahtumasta | Harjoitettavuus_Lomake.html | 🔄 URL-parametri puuttuu |
| PEL | Näkee tulevat testitapahtumat omassa näkymässään | Pelaaja-näkymä (tulossa) | ⬜ Ei vielä |

---

## Kehitysprioriteettijärjestys (tämän dokumentin perusteella)

### Sprint seuraava — "Tapahtuma yhdistää kaiken"
1. Harjoitettavuuslomake lukee `tapahtumaId` URL:sta → pelaajat tapahtumasta
2. Excel-lataus esitäytetty tapahtuman pelaajilla
3. Tapahtuman tila päivittyy automaattisesti kun testit tallennetaan

### Sprint +2 — "Pelaaja ja vanhempi mukaan"
4. Bio-ikälomake → Firestore-integraatio
5. IDP-kortti v3 Firebase-integraatio (pelaaja voi kirjautua ja nähdä oman korttinsa)
6. Pelaajan oma kirjautumisnäkymä

### Sprint +3 — "Tiedolla johtaminen"
7. VP-dashboard: FLEI-trendejä, joukkueiden vertailu yli ajan
8. Valmentajan kenttähavainto → Firestore
9. ADAR Firestore-integraatio

---

## Tarkistuslista uudelle ominaisuudelle

Ennen kuin koodataan mitään, käydään läpi:

- [ ] **SA**: Näkeekö admin tämän? Tarvitaanko hallintanäkymää?
- [ ] **VP**: Miten VP hallinnoi tai seuraa tätä? Onko dashboard-näkymä?
- [ ] **VAL**: Miten valmentaja käyttää tätä arjessa? Toimiiko puhelimella?
- [ ] **TST**: Tarvitaanko testaajalle erillinen näkymä tai lomake?
- [ ] **PEL**: Mitä pelaaja / vanhempi näkee? Onko kieli selkokielinen?
- [ ] **Data**: Mihin Firestoreen tallennetaan? Polku + kentät suunniteltu?
- [ ] **Oikeudet**: Permission matrix tarkistettu — kuka lukee, kuka kirjoittaa?
- [ ] **Mobiili**: Toimiiko puhelimella? (valmentaja + testaaja käyttävät kentällä)
