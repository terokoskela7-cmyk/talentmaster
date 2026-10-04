# PHV-tila "AN": mistä Topiaksen arvo tulee?

> **Selvitys 4.10.2026** (PR B, datakatkokset). Pelkkä raportti, dataan ei ole koskettu.
> Sanaston yhtenäistys Mirwaldiin toteutettiin **PR C:ssä** (`fix/phv-sanasto`, ks. §6).
> Rivinumerot viittaavat PR B:n haaraan (`fix/kortit-datakatkokset`). **Tämä dokumentti kuvaa historiallista tilaa**
> — §2.2:n vanha sanasto on poistettu koodista (vartija `tests/phv_sanasto.test.js` ohittaa vain tämän tiedoston).

## 1. Ongelma lyhyesti

Topiaksen (`seurat/kpv/pelaajat/m93GBdOaGCUuenMiCL0I`, 13 v) `phv_tila` on `AN`. Pelaaja_v7 näyttää sen tekstinä
**"Kehittynyt vaihe"**. Sama kahden kirjaimen koodi tarkoittaa koodikannassa **kahta vastakkaista asiaa**:

| Sanasto | AN tarkoittaa | Muut koodit |
|---|---|---|
| **Mirwald** (`lib/tm_bioika.js`, Testaus_v9:n kasvumittaus) | **Jälki-PHV**: kasvupyrähdys yli vuosi sitten (offset > +1,0 v) | PRE, LAH, PH, POST |
| **Vanha lomake- ja tuontisanasto** (Harjoitettavuus_Lomake_v4, Excel_Tuonti, Testituonti_Master) | **Pre-PHV**: "📍 Ennen kasvua" | PH, VA (= post-PHV) |

13-vuotiaalla pojalla jälki-PHV tarkoittaisi, että kasvupyrähdys oli alle 12-vuotiaana. Se on mahdollista mutta harvinaista.
Pre-PHV on 13-vuotiaalle tavallinen tila. Jos arvo on tullut lomakkeelta tai tuonnista, Topias näkee nyt päinvastaisen
vaiheen kuin valmentaja tarkoitti.

## 2. Koodipolut, jotka voivat kirjoittaa AN:n

### 2.1 Mirwald-merkitys (AN = jälki-PHV)

| Tiedosto:rivi | Mitä tapahtuu |
|---|---|
| `lib/tm_bioika.js:154` | `offset > 1.0` → `phv_tila_koodi = 'AN'` ("Jälki-PHV (>1v jälk.)") |
| `TalentMaster_Testaus_v9.html:3188` | Kasvumittaus kirjoittaa samassa batchissa `phv_tila`, `biologinenIka_viimeisin` (:3187) ja `biologinen_ika/{pvm}`-dokumentin |
| `tm_admin/setup_demo_kehitys.js:285` | Demo-/seed-skripti (`phv_tila: viimBio.phv_tila_koodi`). Vain demoseuraan |

**Tunniste:** Mirwald-polku kirjoittaa aina myös `biologinenIka_viimeisin`-kentän ja `biologinen_ika`-alikokoelman dokumentin.

### 2.2 Lomake- ja tuontimerkitys (AN = pre-PHV)

| Tiedosto:rivi | Mitä tapahtuu |
|---|---|
| `TalentMaster_Harjoitettavuus_Lomake_v4.html:1003/1021/1052` | Pudotusvalikko `['AN','PH','VA']` |
| `TalentMaster_Harjoitettavuus_Lomake_v4.html:1997, 3223, 3397` | Selite: "AN = Pre-PHV", "📍 Ennen kasvua" |
| `TalentMaster_Harjoitettavuus_Lomake_v4.html:2335` | `profiiliPaivitys['phv_tila'] = p.tulokset.phv_tila` → pelaajadokumentti. Tulos `testitapahtumat/{id}/tulokset/{docId}` tai `kartoitukset` (`tulokset.phv_tila`) ja `flei_historia`-rivi samaan aikaan |
| `TalentMaster_Excel_Tuonti.html:2318` | Validointi "sallittu: AN, PH, VA" |
| `TalentMaster_Excel_Tuonti.html:3147` | `profiiliUpdate.phv_tila = p.phv_tila` (Excel-sarake) |
| `TalentMaster_Excel_Tuonti.html:3059` | Testitulosdokumenttiin `phv_tila` (historiapohja → `testitulokset`, tapahtumapohja → `testitapahtumat/*/tulokset`) |
| `TalentMaster_Testituonti_Master.html:1100` | Validointi "sallittu: AN, PH, VA" |
| `TalentMaster_Testituonti_Master.html:1395` | `profiiliUpdate.phv_tila = p.phv_tila`. Tulos `testitapahtumat/{id}/tulokset/{tunniste}`, `testit.phv_tila` (:1459) ja `flei_historia`-rivi |

### 2.3 Kopioijat (eivät ole lähteitä, mutta kuljettavat arvoa)

| Tiedosto:rivi | Mitä tapahtuu |
|---|---|
| `TalentMaster_Testaus_v9.html:2621` | Kenttätuloksen dokumenttiin kopioidaan pelaajadokumentin `phv_tila` (tunnisteena `kirjaaja`/`kirjattu`) |
| `TalentMaster_Master_v16.html:3103` (+ :3130 esitäyttö `p[s.key]`) | Excel-pohjan PHV-tila-sarake esitäytetään pelaajadokumentista. **Mirwald-AN päätyy pohjaan, jonka selite sanoo "AN = Pre-PHV"**, ja palaa tuonnissa samana koodina |

### 2.4 Lukijat ja kumpaa merkitystä ne olettavat

| Lukija | Olettaa |
|---|---|
| `TalentMaster_Pelaaja_v7.html:1474` ("Kehittynyt vaihe") | Mirwald (jälki) |
| `lib/tm_eerikkila_normit.js:440` `hhKehityskohde` (sallii fyysiset kehityskohteet) | Mirwald (jälki) |
| `lib/tm_bioika.js:390`, `lib/tm_kypsyys.js:19,102`, `TalentMaster_VP_v25.html:5445, 7515, 14356, 21004` | Mirwald (jälki) |
| `harjoitelogiikka_v4.js:1036, 1967, 2384` (oletus `'AN'`), selite :2189 "AN (pre-PHV)" | **Lomake (pre)** |
| `lib/tm-profile.js:317` (oletus `'AN'`) | Lomake (pre) |

Sama pelaajadokumentin arvo tulkitaan siis Pelaaja_v7:n Tänään-harjoitteissa (`harjoitelogiikka_v4.js`) pre-PHV:ksi,
mutta MINÄ-näkymän Kehitysvaihe-kortissa ja kehityskohdesuodattimessa jälki-PHV:ksi.

> **Huom (PR B):** PR B:n jälkeen `hhKehityskohde` ajetaan myös Pikakirjauksen, Testaus_v9:n ja Testituonnin kirjoituksessa
> pelaajadokumentin *tallennetulla* `phv_tila`:lla, samoin kuin recalcHH. Lomakeperäinen AN tulkitaan siellä edelleen
> jälki-PHV:ksi ja sallii fyysisen kehityskohteen. Ristiriita ei ole uusi, mutta se näkyy nyt useammalla polulla.
> Korjaus kuuluu PR C:hen.

## 3. Miten alkuperä selvitetään

Kun `phv_tila` on lähtöisin Mirwald-mittauksesta, `biologinenIka_viimeisin.phv_tila_koodi` on sama kuin `phv_tila`, ja mukana on
`mittauspaiva` ja `biologinen_ika`-dokumentti. Jos nämä puuttuvat, arvo on tullut lomakkeelta tai tuonnista. Silloin sama koodi löytyy
yleensä `testitapahtumat/*/tulokset`-, `kartoitukset`- tai `testitulokset`-dokumentista, ja `flei_historia`-rivi on samalta päivältä.

**Lukuskripti** (vain `.get()`, gcloud ADC, ei palvelutilin avainta, tulosteessa ei nimiä):

```
Tero ajaa:  ! node scripts/diag_phv_alkupera.js
(muu pelaaja: --seura=kpv --id=<docId>)
```

Skripti tulostaa seuraavat tiedot: `phv_tila` molemmilla merkityksillä, `biologinenIka_viimeisin` (onko kenttä olemassa, koodi, mittauspäivä, offset), `biologinen_ika`-dokumentit,
ne `testitulokset`-dokumentit, joissa on `phv_tila`, ne `testitapahtumat/*/tulokset/{docId|tunniste|palloID}`-dokumentit, joissa on `phv_tila` (todennäköinen kirjoittaja,
Testaus_v9:n kopiot merkitään erikseen), `kartoitukset` ja `flei_historia`. Lopuksi se tulostaa **PÄÄTELMÄN**, joka on yksi seuraavista:
MITTAUS / LOMAKE/TUONTI / MOLEMMAT / TUNTEMATON.

## 4. Tulos (diag ajettu 4.10.2026)

Topias, `seurat/kpv/pelaajat/m93GBdOaGCUuenMiCL0I`:

- `phv_tila`: `"AN"`
- `biologinenIka_viimeisin`: **EI ole**
- `biologinen_ika`-alikokoelma: **0 dokumenttia**
- lomake- tai tuontilähdettä (`testitulokset`, `testitapahtumat/*/tulokset` lomakkeen/Testituonnin kirjoittamana, `kartoitukset`) **ei löytynyt**
- ainoa muu esiintymä: Testaus_v9:n **kopio** pelaajadokumentista tulosdokumenttiin (`kirjaaja`/`kirjattu`, ks. §2.3) — ei lähde

**PÄÄTELMÄ: TUNTEMATON.** Arvo on kiertänyt ilman lähdettä (kopioijat §2.3). Sitä ei voi tulkita kumpaankaan
suuntaan: Mirwald-mittausta ei ole, eikä lomakemerkintää löydy. 13-vuotiaalle "Kehittynyt vaihe" oli siis perusteeton.

## 5. Johtopäätös ennen ajoa (päätelty koodista)

- Jos Topiaksen Kehitysvaihe-kortissa **ei näkynyt "Mitattu pp.kk"** -riviä, `biologinenIka_viimeisin` puuttuu. Silloin AN on lähes varmasti
  tullut **lomakkeelta tai tuonnista**, ja tarkoitettu merkitys on **pre-PHV**. Kortin teksti "Kehittynyt vaihe" on siis väärä.
- Jos mittaus löytyy ja koodi täsmää, AN on Mirwald-tulos. Silloin kannattaa tarkistaa mittauksen syötteet (pituus, istumapituus, paino ja syntymäaika),
  koska 13-vuotiaan jälki-PHV on epätodennäköinen.
- Dataa ei korjata tässä PR:ssä. Sanaston yhtenäistys (PR C) ratkaisee merkityksen ennen kuin olemassa olevia arvoja muunnetaan.

## 6. Ratkaisu (PR C, `fix/phv-sanasto`, Teron päätökset 4.10.2026)

1. **Kanoninen sanasto = Mirwald PRE/LAH/PH/POST/AN kaikissa lukijoissa.** Ei lähteen mukaista tulkintaa, ei vanhan sanaston
   tukea (`VA`/`huippu`/`PHV` poistettu Pelaaja_v7:stä ja VP_v25:stä). `harjoitelogiikka_v4.js` ja `lib/tm-profile.js`
   (oletus `'AN'` = pre-PHV) korjattu; `src/lib/tm-profile.js` on nyt re-export.
2. **Sääntö 3:** yksi jaettu funktio `lib/tm_phv_tila.js` → `tmPhvTila(pelaajaDoc)`. Tila voimassa vain, jos pelaajadokissa on
   `biologinenIka_viimeisin` (mittaus voittaa), muuten `'tuntematon'`. Näkymät: tuntematon → ei vaihetekstiä
   (Pelaaja_v7:n Kehitysvaihe-kortti piiloon). Kuormarajoitin: tuntematon = varovaisin raja (kuten PH) ilman PH-varoitusta.
3. **Kirjoittajat** kirjoittavat vain kanonisia koodeja (`tmPhvTuontiKoodi`). Käyttäjä valitsee selkokielisesti; **AN-solu
   tuonnissa → varoitus "moniselitteinen", ei tallenneta**. Kierto katkaistu: Testaus_v9 ei kopioi `phv_tila`:a (§2.3, :2621)
   eikä Masterin Excel-pohja esitäytä PHV-saraketta (§2.3, :3103).
4. **Migraatio:** `scripts/migrate_phv_sanasto.js` (dry-run oletus). Topiaksen tapaus = ryhmä (a): ehdotus **poista kenttä**
   (lukijat näkevät jo nyt `'tuntematon'`).
