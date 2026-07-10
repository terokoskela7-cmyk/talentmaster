# Pelihavainto (TM-malli) — kokonaissuunnitelma: talteenotto + tilanne + kolme linkitystä

> **Kokonaisvaltainen suunnitelma peliälyn (D4) talteenotolle ja kytkennälle kehityssilmukkaan.** TalentMasterin
> **oma** pelihavainto (ei Palloliitto-esittelytyökalu): TM:n oma malli (ADAR), **tilanne-konteksti** (peli/harjoitus),
> ja **kolme linkitystä**: (1) yksilön teknis-taktiseen teemaan, (2) +14v pelipaikkafundamentteihin, (3) joukkuetaktiseen
> teemaan (Silta 5.1). Kaikki jaetun **Palloliitto-taksonomian** kautta. Tämä doc on kattoarkkitehtuuri; Silta 5.1
> (`CODE_TASK_SILTA_5_1_PELIALY.md`) on tämän **joukkuelinkki**. Kohde: **Master_v16 (talteenotto + linkit) + VP_v25
> (oversight)**. §4 · §26 · §28 · §29 · §34 · V5/V6/V7.

## 0. Auditointi — mitä on JO olemassa (ei rakenneta uudelleen)

TM:n peliäly-infra on yllättävän valmis; tämä suunnitelma **kytkee palaset**, ei aloita tyhjästä.

- **Talteenotto (tuotanto):** Master **Havainnot** → `seurat/{sid}/pelaajat/{id}/havainnot`, kenttä `pisteet:{A,D,Act,R}`
  = **ADAR** (havainnointi / päätöksenteko / toiminta / reagointi). `paivitaAdarPikakentat()` laskee vahvin/heikoin +
  pikakentät: **`adar_viimeisin={yht,…}`**, `adar_havaintoja`, `adar_pvm`. **TIPS (T/I/P/S) oli VAIN Palloliitto-
  esittelytiedosto** (`TalentMaster_Pelihavainto_Palloliitto.html`) — ei tuotannon malli.
- **Palloliitto-taksonomia + ADAR-linkki (`tm_arviointi_taksonomia.js`):** `ARVIOINTI_TAKSONOMIA` (57 kohdetta,
  D1–D5, asteikko 1–5, havaittavat vs mitattavat). **`ADAR_HAVAITTU_MAP`** kytkee jo ADAR:in taksonomiaan:
  `a → anticipation, vision` · `d → decision_making` · `ac → play_under_pressure` · `r → positioning`. D4 = "Peliäly /
  Football sense". Funktio `tmAdarHavaittu`. **Tämä on valmis jaettu sanasto — käytä sitä.**
- **Yksilön teknis-taktiset teemat:** `TM_TT_YOUTH` (14 kpl, y_h0…) — `tmTtItems({ika,pelipaikka})`.
- **Pelipaikkafundamentit (14+):** `TM_TT_FUNDAMENTIT[pelipaikka]` (MV/LP/T/KK/KY/LA/KH). Esim. toppari **T** = 11 kpl
  (T-P1 Puolustuslinjan johtaminen … T-P3 Selustan ja tilan hallinta … T-P11), kentät `avain/koodi/nimi/faasi/
  pelitilanne/kpi/kysymykset/harjoitteet`. Pelaajalla on `p.pelipaikka`.
- **Joukkuetaktiset teemat:** `TM_TT_JOUKKUE` (16 kpl, j_h/j_p/j_s/j_e).
- **Moottori:** `tm_jaksokooste.js` domeeniagnostinen. V5-silta (`tm_arviointi_silta.js`) D2 → y_h* (yksilö).

## 1. Tavoite + periaate

**Yksi pelihavainto → koko peliälyn tarina.** Valmentaja tekee yhden havainnon (ADAR + tilanne + vapaa teksti); TM
kääntää sen **jaetun taksonomian** kautta kehitystoimenpiteiksi kolmella tasolla: yksilön teema, pelipaikan fundamentti
(14+), ja joukkueen teema. Ei rakenneta Palloliitto-esittelytyökalua uudelleen; tehdään **TM:n oma "Pelihavainto"-
työkalu** (TM-malli ADAR, TM-brändäys, ei "ADAR"-nimeä UI:ssa; asteikko 1–5 kuten muu arviointi).

### 1.1 YDINPERIAATE — asiantuntijan valta (human-in-the-loop, ehdoton)
**Järjestelmä ehdottaa ja järjestää; valta on aina asiantuntijalla.** Tämä läpäisee koko työkalun eikä ole neuvoteltavissa:
- **Ehdotus ei ole pakko (§4).** Silta antaa top-3, mutta valmentaja voi (a) valita ehdotuksista, (b) **valita koko
  konseptilistasta** ehdotuksen ohi (dropdown → kaikki TM_TT_YOUTH / fundamentit / TM_TT_JOUKKUE), (c) muokata cue/koe,
  (d) olla asettamatta mitään.
- **Ei mitään automaattista.** Järjestelmä ei koskaan aseta jaksofokusta, sulje jaksoa eikä muuta arviota ilman
  asiantuntijan nimenomaista valintaa. Ehdotus on päätöstuki, ei määräys.
- **Läpinäkyvä perustelu.** Jokainen ehdotus näyttää *miksi* (mistä havainnosta/taksonomia-avaimesta se tulee), jotta
  asiantuntija voi arvioida ja ohittaa sen tietoon perustuen.
- **Ihminen voittaa numeron.** Kuten V5:ssä: subjektiivinen asiantuntija-arvio menee laskennallisen ehdotuksen edelle.

Tämä koskee kaikkia kolmea linkkiä (§5/§6/§7) ja capture-UI:ta (§9).

## 2. Datamalli — `havainnot/{id}` laajennettuna (additiivinen, ei migraatiota)

```
havainnot/{id}
  pisteet: { A, D, Act, R },          // ADAR 1–5 (LUKITTU §13); UI-nimet: Havainnointi/Päätöksenteko/Toteutus/Reagointi
  tilanne: 'peli'|'harjoitus'|'turnaus'|'muu',   // §3 (konteksti), pakollinen
  tilanne_pvm, vastustaja?,           // valinnainen konteksti (peli)
  vapaa_havainto,                     // teksti (nyk.)
  taksonomia_valittu?: 'anticipation'|…,   // §13 Q4: valmentajan dropdown-valinta (peliäly-avain), valinnainen tarkennus
  // — linkit (denormalisoitu, valmentajan valinnasta; ei pakollinen) —
  linkki_yksilo?: { teema_avain, teema_nimi },        // §5 TM_TT_YOUTH
  linkki_pelipaikka?: { koodi, nimi, pelipaikka },    // §6 TM_TT_FUNDAMENTIT (14+)
  taksonomia?: [ 'anticipation','positioning', … ],   // §4 tmAdarHavaittu(pisteet) tulos (jaettu sanasto)
  luotu, valmentajaUid, pelaajaId, seuraId
```
**Asteikkomigraatio (§13):** nyk. 1–10-data on harvaa → kertamigraatio `pisteet ÷2` (pyöristä) tai normalisointi
lukuvaiheessa; `paivitaAdarPikakentat` + kynnykset päivitetään 1–5:een. Tehdään ennen kuin 1–5-dataa kertyy.
- Pikakentät säilyvät (`adar_viimeisin={yht,…}`, `adar_havaintoja`, `adar_pvm`); lisää **`adar_tilanne_jakauma`**
  (peli vs harjoitus -lkm) jotta analytiikka/silta voi painottaa (§3). §26: pikakenttä, ei render-kysely.
- **Joukkuelinkki (§7) ei tallennu havaintoon** vaan syntyy jaksofokuksena (Silta 5.1) — havainto on lähde, ei kohde.

## 3. Tilanne / konteksti — miksi ja miten

**Missä havainto syntyi muuttaa sen painoarvon.** Ottelu­havainto on korkeamman signaalin taktinen näyttö kuin
harjoitushavainto. Talteenottoon **pakollinen tilanne-valinta**: `peli` · `harjoitus` · `turnaus` · `muu`. Käyttö:

- **Painotus/suodatus:** silta ja per-teema-analytiikka voivat painottaa peli-havaintoja tai suodattaa
  ("vain ottelut"). Kehitysvaste (delta) luotettavampi kun lähtö- ja loppuhavainto samasta tilannetyypistä.
- **Konteksti raportissa:** pelaajaraportin pelihavainto-lähde näyttää "n ottelusta, m harjoituksesta".
- **Linkitys kalenteriin (valinnainen myöhemmin):** tilanne voi hakea kalenteritapahtuman (ottelu/ harjoitus) —
  5.x-jatko, ei tässä.

## 4. Taksonomia-kerros — jaettu sanasto (olemassa, `tmAdarHavaittu`)

Jokainen pelihavainto käännetään Palloliitto-taksonomian **havaittu-avaimiin** `ADAR_HAVAITTU_MAP`-kartalla
(a→anticipation/vision, d→decision_making, ac→play_under_pressure, r→positioning). Tämä on **kaikkien kolmen linkin
yhteinen kieli**: sama taksonomia-avain ohjaa yksilö-, pelipaikka- ja joukkuelinkin. Tallennetaan `taksonomia[]`-kenttään
(denormalisointi, §26). **Ei uutta sanastoa** — laajenna karttaa vain jos Tero haluaa tarkempia D4-avaimia (§13).

## 5. Yksilölinkki — pelihavainto → teknis-taktinen teema (`TM_TT_YOUTH`)

- **Heikoin ADAR-dim** (paivitaAdarPikakentat) → taksonomia-avain (§4) → **yksilön teknis-taktinen teema** (`TM_TT_YOUTH`,
  `tmTtItems`). Esim. heikko A (anticipation/vision) → pelin lukemisen youth-teema; heikko D (decision_making) →
  päätöksenteko-teema. Valmentaja valitsee top-3:sta → asettaa **jaksofokuksen** (`domeeni:'teknis_taktinen'`, sama
  moottori kuin V5/V6). cue/koe konseptista (`tmTtPelaaja`).
- Tämä on **V5-sillan D4-sisar:** V5 = arviointi(D2)→teema; tämä = pelihavainto(D4)→teema. Sama pattern, PURE-lib.
- **Rakennettava kartta (Tero validoi §13):** D4-taksonomia-avain → TM_TT_YOUTH-teema (shortlist).

## 6. Pelipaikkafundamentit (14+) — `TM_TT_FUNDAMENTIT[pelipaikka]`

- **Vain ≥14v JA pelaajalla `pelipaikka`:** yksilöteeman **lisäksi** tarjotaan pelipaikkakohtainen fundamentti
  (`TM_TT_FUNDAMENTIT[p.pelipaikka]`, esim. toppari T-P1…T-P11). Nuoremmilla (<14) EI — perusteema (youth) riittää,
  pelipaikkaerikoistuminen on kehitysvaiheellisesti liian aikaista (§28-henki).
- **Ika-portti:** `ika ≥ 14` (biologinen/kronologinen — Tero validoi kumpi §13). Ilman `pelipaikka`-kenttää → ei tarjota
  (graceful). Fundamentti on **rikkaampi, faasi-tietoinen** (hyökkäys/puolustus) — sopii vanhemmalle pelaajalle.
- Valinta → jaksofokus `domeeni:'pelipaikka'` (uusi tagi, sama moottori). cue/koe fundamentin `kysymykset`/`harjoitteet`.
- **Kartta (Tero validoi §13):** taksonomia-avain × pelipaikka → fundamentti-shortlist.

## 7. Joukkuelinkki — Silta 5.1 (`TM_TT_JOUKKUE`, ryhmäaggregointi)

Kuvattu erikseen: `CODE_TASK_SILTA_5_1_PELIALY.md`. Lyhyesti: heikoin ADAR-dim → joukkuetaktinen teema (TM_TT_JOUKKUE) →
jaksofokus `domeeni:'joukkuetaktinen'` → **≥3 samaa = ryhmäharjoite** (VP teemakeskittymä). **Sama lähde (pelihavainto),
eri kohde (joukkue).** Tämä doc on 5.1:n vanhempi — 5.1:n lähdekorjaus (ADAR) pätee tähän.

## 8. Kolme domeenia yhdestä havainnosta — milloin kumpi

Yksi pelihavainto voi tarjota **kaikki kolme** linkkiä; valmentaja valitsee mihin tarttuu (ei pakoteta kaikkia):

| Linkki | Domeeni | Konsepti | Kenelle | Milloin |
|---|---|---|---|---|
| Yksilö | `teknis_taktinen` | TM_TT_YOUTH | kaikki iät | perustaito/lukeminen heikko |
| Pelipaikka | `pelipaikka` | TM_TT_FUNDAMENTIT | **≥14v + pelipaikka** | erikoistuminen, faasi-tietoinen |
| Joukkue | `joukkuetaktinen` | TM_TT_JOUKKUE | kaikki iät | ryhmässä toistuva (≥3) |

**UX-periaate (kriittinen):** talteenoton jälkeen näytä **selkeästi eroteltu** 1–3 ehdotusta domeeneittain (väri/merkki),
ei tukkoa. Valmentaja voi asettaa 0–3 fokusta. §13: pelaajalla voi olla rinnakkain useita domeeneja → näkymä ei saa hukuttaa.

## 9. Talteenoton UI (Master) — TM-malli "Pelihavainto"

- **Otsikko "Pelihavainto"** (ei "ADAR" UI:ssa). Kentät: pelaaja · **tilanne** (peli/harjoitus/turnaus/muu, pakollinen) ·
  ADAR 4 dimensiota (havainnointi/päätöksenteko/toiminta/reagointi, 1–10, TM-nimet) · vapaa havainto.
- **Tallennuksen jälkeen "Ehdotukset":** yksilöteema (top-3) · pelipaikkafundamentti (jos ≥14v+pelipaikka) · joukkueteema
  (Silta 5.1). Kukin → "Aseta jaksofokus". Ehdotukset PURE-libeistä (§5/§6/§7), ei render-Firestore (§26).
- Offline-yhteensopivuus kuten nyk. testaus (jos capture on samassa polussa).

## 10. Roolit + Rules + GDPR

- **Ei uutta kokoelmaa:** `havainnot` (rules olemassa) + `jaksofokus`-kenttä (rules olemassa). Uudet kentät
  (`tilanne`, `linkki_*`, `taksonomia`) ovat `havainnot`-dokin sisällä → varmista ettei write-validointi hylkää niitä.
- **Uudet domeeni-arvot** (`pelipaikka`) jaksofokuksessa: kenttäarvo, ei uutta klausuulia — varmista ettei domeenia
  whitelistata (§13). Rules-testi emulaattorilla (valmentaja kirjoittaa ✓ · toinen seura estetty ✓).
- **GDPR:** pelihavainto on subjektiivinen valmentaja-arvio pelaajan **suorituksesta** — ei terveystietoa. Vapaa havainto
  ei saa sisältää terveys-/vammatietoa (→ `terveys/`). Ei muutosta suostumukseen (video olisi eri asia, §13/5.1-video).

## 11. Vaiheistus — capture-redesign ensin, linkit portitettuna

- **P1 — Pelihavainto TM-malli + tilanne + yksilölinkki.** Oma "Pelihavainto"-työkalu (TM-brändäys), `tilanne`-kenttä,
  taksonomia-kerros (`tmAdarHavaittu`), **yksilölinkki** (§5) → teknis-taktinen jaksofokus. Tuottaa arvon heti (nykyinen
  ADAR-data + selkeä TM-työkalu). Matala riski.
- **P2 — Pelipaikkafundamentit (14+).** §6 ika-portti + `domeeni:'pelipaikka'`. Portti: P1 käytössä.
- **P3 — Joukkuelinkki (Silta 5.1).** §7 aggregointi. Portti: pelihavaintoja kertyy.
- **P4 (myöhemmin) — evidenssi/video + kalenteri-tilanne + AI.** §13 / 5.1-video (raskas GDPR).

## 12. Verifiointi

- **Vitest:** `tmAdarHavaittu` (ADAR→taksonomia oikein), yksilölinkki-lib (heikoin dim → teema-shortlist),
  pelipaikkalinkki (ika<14 → tyhjä; ≥14+pelipaikka → fundamentti; ei pelipaikkaa → tyhjä), tilanne-validointi.
- **Rules emulaattorilla:** uudet kentät + `domeeni:'pelipaikka'` kirjoittuu, toinen seura estetty.
- **Live Master+VP:** tee pelihavainto (tilanne=peli) → ehdotukset 3 domeenissa → aseta yksilöteema → aseta
  pelipaikkafundamentti (14v pelaaja) → aseta joukkueteema → VP Jaksofokus näyttää kaikki domeenit eroteltuina →
  sulku → delta. Nuorella (<14) pelipaikkaa ei tarjota. 0 konsolivirhettä. `npm test` + lint + selain.
- **Merge vasta kun Tero sanoo "live".** Oma branch per vaihe (P1/P2/P3).

## 13. Päätökset — LUKITTU (Tero 2026-07-10)

1. **Asteikko: 1–5** (ei 1–10). Yhdenmukainen taksonomian + D1/D2-tason + H-H-tason kanssa; parempi arvioijaluotettavuus.
   Vanha 1–10-data migratoidaan ÷2 (§2). Kynnykset uudelleen 1–5:een (esim. ≤2/5 laukaisee sillan).
2. **ADAR-malli säilyy, UI vain suomeksi:** Havainnointi (A) · Päätöksenteko (D) · **Toteutus** (Act) · Reagointi (R).
   Työkalun nimi "Pelihavainto" (ei "ADAR"). Datakoodit A/D/Act/R säilyvät koodissa.
3. **Tilanne-arvot:** Peli · Harjoitus · Turnaus · Muu (pakollinen). Peli-havainto painottuu taktisessa analyysissä.
4. **Pelipaikkafundamentti (14+):** yksilöteeman **lisäksi** (molemmat näkyvät, valmentaja valitsee). **Kronologinen**
   ikäportti (≥14 v). <14 v: vain yksilöteema.
5. **Taksonomian tarkkuus:** **dropdown P1:ssä** — valmentaja voi valita tarkemman peliäly-taksonomia-kohteen
   (Ennakointi/Näkemys/Päätöksenteko/Sijoittuminen/Peli paineessa/Ajoitus + puolustus-avaimet). Valinnainen tarkennus
   automaattisen `tmAdarHavaittu`-johdon päälle. Lista tulee taksonomiasta (jo suomeksi).
6. **Kartat A/B/C hyväksytty** (ks. `docs/mockups`/kartat + P1-brief). A = taksonomia→TM_TT_YOUTH, B = taksonomia×
   pelipaikka→TM_TT_FUNDAMENTIT (sääntö + T/KK/KY/LA täytetty; MV/LP/KH samalla säännöllä), C = taksonomia→TM_TT_JOUKKUE.
7. **Asiantuntijan valta (§1.1):** ehdoton — silta ehdottaa, valmentaja valitsee ehdotuksista TAI koko listasta TAI ei
   mitään; ei mitään automaattista. Koskee kaikkia kolmea linkkiä ja capture-UI:ta.
