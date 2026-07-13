# Kokonaisvaltainen analyysi: P1 pelihavainto vs. ADAR-pikakortti

> Päätöksentuki (vaihe C) ennen A/B-valintaa. Auditoitu 2026-07-10: ADAR-pikakortin kaikki 3 tasoa (renderöity),
> P1:n tallennusmalli + libit (koodi), ja Peli-välilehden näyttökerros. **Tärkein löytö: `havainnot`-kokoelmaan
> kirjoittaa kaksi eri pelihavaintomallia (1–3 vs 1–5), ja jopa näyttökerros odottaa pikakorttimallia.**

## 0. Tiivistelmä — mistä on kyse

TalentMasterissa on kaksi pelihavainto-työkalua, jotka molemmat kirjoittavat **samaan `havainnot`-kokoelmaan** samalla
`pisteet:{A,D,Act,R}`-kentällä mutta **eri mallilla**:

- **ADAR-pikakortti** (`TalentMaster_ADAR_Pikakortti.html`, "joskus tehty"): kypsä, tutkimuspohjainen, **ikävaiheistettu**,
  asteikko **1–3**. Sisältää jo kaiken mitä olemme suunnitelleet (ikävaihe-eriytys, pelipaikka, pelivaihe, reflektio).
- **P1 pelihavainto** (Master Havainnot, `malli:'tm_pelihavainto'`): kevyempi, asteikko **1–5**, aina 4 osaa, ikäriippumaton.
  Rakennettu tässä sessiossa. Vahvuus on **downstream-integraatio** (taksonomia → arviointi, yksilölinkki → teema/IDP).

**Konflikti on todellinen:** Peli-välilehden näyttö (VP + Pelaaja) käyttää pikakortin mallia (Assess/Decide/Act/Re-assess,
/12) → P1:n 1–5-data näkyy siellä väärin (Reaction 4/3, kokonais 3/12 — juuri se minkä huomasit).

## 1. ADAR-pikakortti — täydellinen malli (auditoitu)

**Kolmiportainen, ikävaiheistettu, asteikko 1–3** (Kehitettävää / Kehittyvä / Hallitsee):

| Taso | Ikä | ADAR-osat | Max | Erityistä |
|---|---|---|---|---|
| **1 · Havainnoija** | U8–U12 | **Assess** (skannaus) | 3 | Pelaaja ei tiedä olevansa arvioitavana. Vain skannausvaisto. Vänttinen/KIHU 2015. |
| **2 · Arvioija** | U13–U15 | **Assess · Decide · Act** | 9 | Narratiivi pakollinen. Pelivaihe-tagi. Psyk-kytkös (Focus/InnerDrive/EmotionalControl). |
| **3 · Täysi havainto** | U16–U19 | **Assess · Decide · Act · Re-assess** | 12 | Pelipaikkakohtaiset tavoitetasot (CD ≥2p, CAM ≥3p…), pelivaihe, KPI-rivi, **pelaajan reflektio pakollinen**. |

Lisäominaisuudet (tutkimuspohjaiset):
- **Ikävaihe-eriytys** = juuri se mitä kysyit. Ei arvaus — tutkimusperuste: ennakointi kehittyy vasta murrosiästä (KIHU 2015).
- **Pelipaikkakohtaiset tavoitetasot** (Taso 3) = P2-pelipaikkafundamenttien idea sisäänrakennettuna.
- **Pelivaihe-tagi** (hyökkäys/puolustus/siirtymä/erikoistilanne) = P1.5:n idea sisäänrakennettuna.
- **Psyk-kytkös D3:een:** Re-assess ↔ Resilience (Duckworth 2007), Act ↔ Emotional Control, Decide ↔ Coachability. Error Recovery Protocol.
- **Pelaajan reflektio** (Taso 2–3), kuva, valmentajan narratiivi.
- Kirjoittaa `havainnot`-kokoelmaan.

## 2. P1 pelihavainto — mitä rakennettiin (auditoitu)

- Tallennus (Master 8668–): `{ tyyppi:'adar', malli:'tm_pelihavainto', pisteet:{A,D,Act,R} (1–5, aina 4),
  tilanne (Peli/Harjoitus/Turnaus/Muu), vastustaja, vapaa_havainto, taksonomia_valittu, taksonomia:[…] }`.
- **Downstream-vahvuudet (tämä on P1:n oikea arvo):**
  - `tmAdarHavaittu` → syöttää havainnon **arviointiin** (D4-taksonomia-avaimet).
  - `tm_pelialy_yksilo` (Kartta A) → **yksilölinkki** → teknis-taktinen jaksofokus → IDP-ketju.
  - Sisäänrakennettu Master **Havainnot**-välilehteen (ei erillinen työkalu).
- **Heikkoudet:** ikäriippumaton (aina 4 osaa), 1–5 (ei tutkimuspohjaa, rikkoo näyttökerroksen), ei pelipaikka-
  tavoitetasoja, ei pelivaihetta, ei reflektiota, ei psyk-kytköstä.

## 3. Datamalli-konflikti (ydin)

| | Pikakortti | P1 |
|---|---|---|
| Kokoelma | `havainnot` | `havainnot` (sama) |
| Kenttä | `pisteet:{A,D,Act,R}` | `pisteet:{A,D,Act,R}` (sama) |
| **Asteikko** | **1–3** | **1–5** |
| **Osien määrä** | ikävaiheen mukaan 1/3/4 | aina 4 |
| Näyttö (Peli-välilehti /12) | yhteensopiva | **rikkoo** (Reaction 4/3) |

Sama kenttä, eri semantiikka → arvo 4 pisteytetään milloin /5 milloin /3. Tämä ei ole korjattavissa "migratoimalla
Peli-välilehti 1–5:een" — se vaatii **yhden kaanonin**.

## 4. Vertailu — kumpi voittaa missä

| Ulottuvuus | Pikakortti | P1 |
|---|---|---|
| Tutkimuspohja | ✅ KIHU/Duckworth | — |
| Ikävaihe-eriytys | ✅ 3 tasoa | ❌ |
| Nopeus kentällä | ✅ Taso 1 = 1 arvio | ~ 4 arviota |
| Pelipaikka-tavoitetasot | ✅ | ❌ (P2 kesken) |
| Pelivaihe-tagi | ✅ | ❌ (P1.5 kesken) |
| Psyk-kytkös (D3/Resilience) | ✅ | ❌ |
| Pelaajan reflektio | ✅ | ❌ |
| Asteikko-yhteensopivuus näyttöön | ✅ 1–3 (/12) | ❌ 1–5 |
| **Sisäänrakennettu Masteriin** | ❌ erillinen | ✅ Havainnot-välilehti |
| **Syöttö arviointiin (taksonomia)** | ❓ epävarma | ✅ tmAdarHavaittu |
| **Yksilölinkki → teema → IDP** | ❌ | ✅ tm_pelialy_yksilo |

**Kuvio:** pikakortti voittaa **havainto- ja pedagogiikkapuolen** (malli, ikävaihe, pelipaikka, pelivaihe, psyk, tutkimus).
P1 voittaa **integraatio-/downstream-puolen** (sisäänrakennettu, arviointi-syöttö, yksilölinkki, IDP-ketju).

## 5. Suositus — hybridi (ei puhdas A eikä B)

**Adoptoi pikakortti kaanoniksi havaintomallille, ja liitä siihen P1:n downstream-putki 1–3-asteikolla.**

Konkreettisesti:
1. **Havaintomalli = pikakortti:** 1–3, ikävaiheistetut tasot (U8–U12 Assess / U13–U15 +Decide+Act / U16–U19 +Re-assess),
   pelipaikka-tavoitetasot, pelivaihe, reflektio. Tämä ratkaisee kysymäsi ikävaihe-eriytyksen tutkimuspohjaisesti, ja
   **P1.5 (pelivaihe) + P2 (pelipaikka) eivät ole enää erillisiä vaiheita — ne ovat jo tässä.**
2. **Yksi sisäänkäynti:** joko pikakortti upotetaan Masterin Havainnot-välilehteen, tai Havainnot-talteenotto rakennetaan
   pikakortin mallilla. Ei kahta kilpailevaa työkalua samaan kokoelmaan.
3. **Säilytä P1:n downstream, sovita 1–3:een:** `tmAdarHavaittu` (→ arviointi) ja `tm_pelialy_yksilo` (→ yksilöteema →
   jaksofokus → IDP) päivitetään lukemaan pikakortin 1–3 + ikävaiheistetut osat. **Tämä on P1:n todellinen arvo, ei sen
   1–5-talteenotto.**
4. **Asteikko → 1–3.** Aiempi 1–5-suositukseni tehtiin tuntematta pikakorttia; 1–3 on tutkimuspohjainen, näyttökerros
   käyttää sitä jo, ja se on nopeampi kenttäkäytössä (linjassa "nopeus ensin" -periaatteen kanssa).
5. **Migraatio:** P1:n 1–5-testidata (Topias) on minimaalista → siivotaan tai skaalataan. Ei estettä.

## 6. Rehellinen huomio

Suosittelin 1–5:tä ja P1:n talteenottomallin tuntematta tätä pikakorttia — se oli virhe kattavuudessa. Pikakortti on
selvästi kypsempi ja tutkimuspohjainen, ja se sisältää jo ne asiat joita olemme erikseen suunnitelleet (ikävaihe,
pelipaikka, pelivaihe). Hyvä uutinen: P1:ssä rakennettu **downstream-putki (arviointi-syöttö + yksilölinkki + IDP-ketju)
ei mene hukkaan** — se on juuri se osa jota pikakortista puuttuu. Yhdistämällä saadaan molempien vahvuudet.

## 7. Päätösvaihtoehdot

- **A) Pikakortti kaanoniksi** (suositus, = §5 hybridi): paras malli + P1:n putki sovitettuna. Isoin työ, oikein tehty.
- **B) P1 kaanoniksi:** menetetään tutkimuspohja + valmis ikävaihe/pelipaikka/pelivaihe; korjataan näyttö 1–5:een. En suosittele.
- **C) Rinnakkaiselo:** ei — kaksi mallia samaan kokoelmaan on juuri nykyinen bugin lähde.

**Suositus: A (hybridi §5).** Seuraava askel jos hyväksyt: kirjoitan reconciliation-suunnitelman (miten pikakortti tulee
kaanoniksi, miten P1:n libit sovitetaan 1–3 + ikävaiheeseen, mikä on yksi sisäänkäynti, migraatio) → sitten briefit.
