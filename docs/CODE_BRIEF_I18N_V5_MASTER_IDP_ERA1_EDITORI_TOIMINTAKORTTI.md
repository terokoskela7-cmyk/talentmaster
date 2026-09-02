# Code-brief — i18n V5 · Master_v16 · **IDP-klusteri Erä 1: IDP-editori + toimintakortti + jaksofokus sv**

> **Konteksti:** B2 (11 työtilaa) + live-korjauserä ovat mainissa ja **live-verifioitu** (10/11 työtilaa 0 fi-vuotoa;
> dev-näkymän IDP/toimintakortti-klusteri jäi tietoisesti fi:ksi). **Tämä erä reitittää sen klusterin ensimmäisen puolen.**
> Staattinen-DOM-vartija (`idp_i18n_v5_master_static_dom.test.js`) on jo paikoillaan. **Käännösratkaisu (Teron päätös):
> Code kääntää kanonista wirauksen yhteydessä** — EI Kimi-round-trippiä. Siksi alla on **pakollinen kanoninen sv-sanasto**;
> käytä sitä eksaktisti, älä keksi omia vastineita. Domain-herkkä pinta → sävy ja termit ratkaisevat.

## Skooppi — reititä `masterT()`:llä (dynaaminen render) + `data-i18n` (staattinen runko)
| Alue | Rivit (n.) | Sisältö |
|---|---|---|
| Jaksofokus-pill + Toimintakortti | **~5450–5641** | `📍 Jaksofokus · meso (ei vielä viety treeniin)` · `⚽ Toimintakortti — konsepti → cue → harjoite` · Konsepti/Cue/Harjoite-lohkot · `Jakson kesto` · `＋ Vie jakson treeniin` · `Havainnoi → review` · toastit 5637/5641 |
| `_mIdp*` IDP-editori | **6193–6653** | Kausitavoite · välitavoitteet · kortti · fokusvalinta · **kehityskaari (§29 kaksi deltaa, rivi 6551)** · itsearvio-dotit · pilli · DVI-rivit **6579/6597/6603/6604** |
| `_mMita*` | **6654–6688** | `_mMitaOsattavaHTML` — "osattava"-lista |
| pinfo-card domeeni-osa | 6689–6992 (`_renderPinfoFirestore`) | **VAIN** jaksofokus/domeeni-näyttö (Heikoin D1 — Fysiikkajakso · Kestävyys · Hyökkäys/Puolustus/Havainnointi). Muu pinfo-sisältö on jo sv — älä koske. |

**Malli:** dynaaminen JS-render → `masterT(fi)` (§7.1 EI nested template literaleja: template-literaalissa `${masterT('...')}`,
konkatenaatiossa `' + masterT('...') + '`). Staattinen HTML-runko (jos sellaista tällä alueella) → `data-i18n`. **Aja inline-parse-vahti.**
**0 uutta domain-käännöstä ilman alla olevaa sanastoa.**

## 🔒 PAKOLLINEN kanoninen sv-sanasto (käytä eksaktisti)
| fi | sv (kanoni) | huom |
|---|---|---|
| Kausitavoite | **Säsongsmål** | IDP-hierarkia |
| Välitavoite / Välitavoitteet | **Delmål** | |
| Jaksofokus | **Periodfokus** | `meso` säilyy `meso` |
| Toimintakortti | **Handlingskort** | ⚠️ vahvista Terolta jos epävarma (vaihtoehto Åtgärdskort) |
| Konsepti | **Koncept** | |
| Cue | **Cue** | valmennustermi — säilytä englanniksi |
| Harjoite | **Övning** | |
| Kehityskaari · meso-kaari | **Utvecklingsbåge · meso-båge** | |
| Korjaa heikkous · heikkous | **Åtgärda svaghet · svaghet** | engine path 1 |
| Jalosta supervoima · vahvuus | **Förädla superkraft · styrka** | engine path 2 (§EPPP) |
| Sitoumus · vahvistettu | **Åtagande · bekräftat** | 2-vaihe: pelaaja + VP |
| domeeni · fyysinen · teknis-taktinen | **domän · fysisk · teknisk-taktisk** | |
| Itsearvio | **Självvärdering** | (sama kuin koti) |
| Havainnointi · läpileikkaava | **Observation · genomgående** | |
| Mittari · Lähtö(arvo) · Tavoitearvo · Aikaraami | **Mått · Utgångsvärde · Målvärde · Tidsram** | SMART-kentät |
| Kaksi deltaa (§29) | **Två deltan (§29)** | ks. §29-invariantti alla |
| abs-parannus · lähdöstä | **absolut förbättring · från utgångsvärdet** | |
| vaadittu vuosivauhti | **krävd årstakt** | |
| Ehdota tavoite datasta | **Föreslå mål från data** | |
| Vie jakson treeniin · viety treeniin | **För perioden till träning · förd till träning** | ⚠️ vahvista fraseeraus |
| Aseta fysiikkajakso · 4 vk | **Sätt fysikperiod · 4 v** | `vk`→`v` |
| Heikoin D1 — Fysiikkajakso | **Svagast D1 — Fysikperiod** | |
| Kestävyys | **Uthållighet** | |
| osattava (`_mMita`) | **att bemästra** | ⚠️ vahvista kontekstissa |
| DVI · TKI · H-H · TSI · PHV · D1–D5 | **ennallaan** | lyhenteet verbatim |

> **⚠️-merkityt (Toimintakortti · "Vie jakson treeniin" · osattava):** käytä ehdotustani, mutta **merkitse ne PR-kuvaukseen** →
> tarkistan livenä + Tero voi hienosäätää. Muut ovat lukittuja.

## Domain-invariantit — SÄILYTÄ MERKITYS (älä pelkkää sanakäännöstä)
- **§29 KAKSI DELTAA (kriittisin):** rivit 6551/6579/6597/6603/6604. `abs-parannus` (absolut förbättring) ja TKI/taso-delta
  näytetään **erikseen**; **"abs+ ei koskaan punainen"** → **"abs+ blir aldrig röd"** — merkitys: pelaajan oma edistys
  ei koskaan punaisena vaikka ikäluokkavaatimus kovenee. Käännä koko lause, säilytä §29-viite verbatim.
- **Engine kaksi polkua:** `Åtgärda svaghet` JA `Förädla superkraft` näkyvät rinnakkain — älä käännä toista pois tai
  yhtenäistä. Vahvuuspolku on rekrytointikriittinen (X-Factor).
- **§28 kypsyyskorjaus:** "Johdetaan heikoimmasta ominaisuudesta (arviointi + §28-kypsyysvahti)" → säilytä §28-kehys.
- **Cue-filosofia:** `"Kysymys tekee älykkään, käsky tottelevaisen."` on sitaatti (Cue = kysymys, ei käsky) →
  käännä idiomaattisesti sv:ksi säilyttäen kysymys-vs-käsky-vastakkainasettelu, pidä lainausmerkit.
- **Jaksofokus/domeeni archive-before-overwrite:** näyttötekstit vain — **älä koske `domeeni`-arvoihin
  (`'fyysinen'`/`'teknis_taktinen'`) koodissa** (Emil-collision-invariantti).

## ⛔ ÄLÄ reititä (enum/logiikka/data)
`tavoiteTyyppi`/`modus` **arvot** (`'heikkous'/'vahvuus'/'pelipaikka'`) · `domeeni`-arvot (`'fyysinen'/'teknis_taktinen'`) ·
`idp_tila`/status-**enumit** koodivertailuissa (`=== 'aktiivinen'` pysyy fi; vain näyttö `● Aktiivinen`→`● Aktiv` reititetään) ·
`konsepti_avain` · mittari-id:t · SMART-kenttien Firestore-arvot · demo-pelaajanimet. **§7-rajaus:** lib-lähtöinen
curriculum/konsepti-teksti (jos tulee `tm_teknistaktiset.js`:stä) jää fi — merkitse, älä kytke lib_sv:hen. Demo-haarat (§3) fi
(esim. toast 5637 `'Jaksofokus asetettu (demo…)'` → demo, jätä fi).

## Portit + DoD (Erä 1)
- IDP-editori + toimintakortti + jaksofokus + `_mMita` sv-tilassa 100 % ruotsiksi (näyttö); §29 kaksi-deltaa merkitys ehjä;
  engine kaksi polkua näkyvissä; enum-vertailut fi.
- Uudet avaimet `tm_master_i18n.js`:iin **dup-checkillä** (`if key in map`) → `?v=13→14`. Kanoninen sanasto käytetty eksaktisti.
- **Staattinen-DOM-vartija + render-JS-kielineutraali vihreät** tälle alueelle (poista Erä 1 -alue allowlistista jos oli).
- C1 Master∩common=∅ · dup 0 · lint 0 · suite vihreä · fi-regressio ehjä · inline-parse 0.

## Verifiointi (Claude)
1. Live: avaa IDP-editori + toimintakortti-paneeli sv-tilassa → DOM-skanni 0 fi-avainta editorialueella.
2. **Domain-tarkastus:** §29 kaksi-deltaa (abs+ blir aldrig röd), engine kaksi polkua (Åtgärda svaghet / Förädla superkraft),
   cue-sitaatti, §28-kehys — merkitys säilynyt, ei pelkkä sanakäännös. ⚠️-termit (Handlingskort ym.) tarkistus.
3. C1 · dup 0 · lint 0 · suite. Enum-invariantti (sv ei riko `tila===`/`domeeni===`).

## Rajaus (Erä 2, oma brief)
Pelaajaraportti (`_pr*` 6993–) · profiili-paneeli (coach) · notif-render (`_notif*` 7773–). Sama sanasto + malli.

---

## 🔒 B-lista — [—] uudet sv (Claude lukinnut Coden reconin pohjalta 2026-09-02)

> Nämä ovat stringit joita EI ollut kartassa (`_mIdp*`/toimintakortti/jaksofokus). Käytä eksaktisti. `[K]`-stringit
> (jo kartassa) → pelkkä `masterT`-kääre, ei tästä. Fraasit joita ei ollut yllä olevalla FRAASIT-listalla:

```
· review                              → · granskning
· toteuma <b>                         → · utfall <b>
· pelaaja johtaa, kaksisuuntainen     → · spelaren leder, tvåvägs
· ei pelipaikkaa (yksilökonsepti)     → · ingen position (individkoncept)
· pelipaikka asettamatta              → · position ej satt
· ⬆ lataa kausifokukseen              → · ⬆ ladda till säsongsfokus
· läsnä                               → · närvarande
(konsepti) →                          → (koncept) →
edellisestä                           → från föregående
lähdöstä                              → från utgångsvärdet
tavoitteeseen (                       → till målet (
vaihetta ·                            → faser ·
suljettua jaksoa · ka delta           → stängd period · medeldelta
Fysiikkajakso asetettu ✓              → Fysikperiod satt ✓        (demo-haara jää fi §3)
Jakso suljettu ✓                      → Period stängd ✓
Ei uutta mittausta jaksolla —         → Ingen ny mätning under perioden —
PHV-vaihe (§28):                      → PHV-fas (§28):
nopeus-/voimakehitys ennen kasvupyrähdystä on rajallista —
     → snabbhets-/styrkeutveckling före tillväxtspurten är begränsad —
"ennallaan" on biologisesti odotettua → "oförändrad" är biologiskt förväntat
— taidon näyte ennen/jälkeen          → — färdighetsprov före/efter
— voi jäädä tyhjäksi (fiilis-review)  → — kan lämnas tomt (känslogranskning)
subjektiivinen arvio riittää          → subjektiv bedömning räcker
näkyy itsenäisesti                    → visas självständigt
Kirjoita fokus-nimi                   → Skriv fokusnamn
Liitä video                           → Bifoga video
). Asiantuntijan valinta kirjataan.   → ). Expertens val registreras.
✏️ Muokkaa:                           → ✏️ Redigera:
🎯 Fokus:                             → 🎯 Fokus:
🔵 Palloliitto-arvio                  → 🔵 Fotbollförbundets bedömning   (⚠ live-tarkistettava)
🟢 TM-mittaus                         → 🟢 TM-mätning
```

### Kaksi huomiota
1. **🔵 Palloliitto-arvio → Fotbollförbundets bedömning** — yhtenäisyys deployatun sv-kartan kanssa (VP tekniikkakisa-string käyttää jo "Fotbollförbundet"). **⚠ merkitse PR:ään:** Finlanssvenska-seurat (GrIFK/VIFK/Sibbo) voivat suosia "Bollförbundet" / "Finlands Bollförbund" → Tero vahvistaa livenä.
2. **`Valitse kohde…` dedup:** jos JO kartassa ([K]) → käytä olemassa olevaa map-arvoa, ÄLÄ lisää "Välj fokus…":ta; flagaa vain jos [K]-arvo eroaa. Sama `↻ Ehdota (moottori` = [K]-prefiksi, varmista map-arvo "↻ Föreslå (motor ·".

### ⚠ live-tarkistettavat termit (merkitse PR-kuvaukseen rivinumeroilla, Tero hienosäätää)
Handlingskort (Toimintakortti) · ▶ Till period (Jaksoksi) · Välj fokus… (Valitse kohde) · För perioden till träning (Vie jakson treeniin) · att bemästra (osattava) · Fotbollförbundets bedömning (Palloliitto-arvio).

> **Tämä sulkee B-listan → 0 aukkoa.** Etene: haara `i18n/v5-master-b2-idp-era1` → [K] masterT-kääre + [—] avaimet tämän + FRAASIT-listan mukaan (dup-check) → portit → commit (ei merge).
