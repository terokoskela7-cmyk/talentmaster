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
