# CODE — Testit-hub P0: nav "🧪 Testit" + hub-kuori + rikki stubin korjaus

**Tyyppi:** Reititys + IA (uusi nav-kohta + työtilanäkymä, olemassa olevien launchereiden uudelleenkäyttö).
**Ei skeema-/laskenta-/Rules-muutosta, ei uutta dataa.** **Pieni PR.**
**Kohde:** `TalentMaster_VP_v25.html`. **Design-totuus:** design-kartta artefakti `tm-testit-hub-designmap`
(§02 hub + §02b testivalitsin + §04 vaiheistus). **Ohje on itsenäinen** — kartan päätökset tiivistetty tähän.

## Tausta (SJK:n valmennuspäällikön palaute)
VP ei löydä mistä testitulokset tallennetaan — toiminto on hitsattu kalenteriin, VP:n valikossa **ei ole "Testit"-kohtaa**
(Masterilla on "07 Testit"), ja ainoa "Luo testi" -CTA on **rikki stub** (`avaaUusiTestiModaali` ~3246 → `_sigStub`).
P0 antaa testidatalle **oman kodin** ja korjaa stubin. **P0 ei rakenna uutta kirjaus-/tuontilogiikkaa** — se reitittää
olemassa oleviin työkaluihin ja tekee ne löydettäviksi.

## Periaate (design-kartta)
Yksi **🧪 Testit** -työtila, kaksi ryhmää: **Kirjaa nyt** (Kirjaa kentällä · Pikakirjaus) + **Tuo tiedostosta**
(Excel-pohja · Historiatuonti · Palloliiton PDF). "Viimeksi testattu" -lista. Kalenteri jää ennalleen (testitapahtumat
näkyvät siellä yhä) — tämä on **rinnakkainen koti**, ei poista mitään.

## Työ

### P0.1 — Uusi nav-kohta "🧪 Testit"
- Lisää sidebariin **Työtilat**-ryhmään `.sb-item` **Kalenterin yläpuolelle** (~rivi 2011 edelle):
  ```html
  <div class="sb-item" data-ws="testit" onclick="setWs('testit')">
    <span class="sb-icon">🧪</span> Testit
  </div>
  ```
- Lisää sama myös mobiilin `.tabbar`-riviin (~1965–1968) jos se mahtuu (esim. korvaa/lisää `data-ws="testit"` 🧪).
- `setWs(ws)` toggleaa jo `.sb-item.active` + `.ws-view#ws-<ws>.active` `data-ws`:n perusteella → **ei muutosta
  setWs-logiikkaan**, kunhan `id="ws-testit"` on olemassa (P0.2). Varmista että `setWs('testit')` aktivoi sen.

### P0.2 — Hub-näkymä `ws-testit`
- Lisää `.ws-view`-konttien joukkoon (~2085+): `<div class="ws-view" id="ws-testit"></div>`, render funktiolla
  esim. `_vpTestitHTML()` (kutsu setWs:stä tai datan latauduttua). Sisältö:
  - **Header:** eyebrow "🧪 Testit" + otsikko "Kirjaa ja tuo testituloksia" + alaotsikko "Kaikki testidatan
    kirjaaminen samasta paikasta".
  - **Ryhmä "Kirjaa nyt":** kaksi korttia:
    - **Kirjaa kentällä** → avaa Testaus_v9 olemassa olevalla launcher-kuviolla
      (`TalentMaster_Testaus_v9.html?seura=<_seuraId>` — sama kuvio kuin ~6992). Testien valinta tapahtuu
      Testaus_v9:ssä (sillä on jo oma protokolla/`aktiiviset_testit`-valinta — joustava valitsin 02b on P1/P2, EI tässä).
    - **Pikakirjaus** → **soft "tulossa" -tila** (rakennetaan P2). Näytä kortti himmennettynä + pikkubadge
      "tulossa" + klikki antaa lempeän toastin "Pikakirjaus tulossa pian". **ÄLÄ tee tästä `_sigStub`-tyyppistä
      kuollutta nappia joka näyttää toimivalta** — merkitse selkeästi tulevaksi (ei dead-end).
  - **Ryhmä "Tuo tiedostosta":** kolme korttia, kaikki → olemassa oleva `Excel_Tuonti.html`:
    - **Excel-pohja** (lataa→täytä→tuo): avaa Excel_Tuonti (lataus + tuonti). Voit käyttää olemassa olevaa
      `vpLataaPohja()`-kuviota (~2270, `Excel_Tuonti.html?lataa=`) latauspuolelle ja suoraa linkkiä tuontipuolelle.
    - **Historiatuonti** → `Excel_Tuonti.html` (Moodi B / historiapohja — aiempien vuosien tulokset).
    - **Palloliiton PDF** → `Excel_Tuonti.html` (PDF-tab).
    - **Nämä ovat olemassa olevia toimintoja** — P0 tekee ne vain löydettäviksi hubista. Älä rakenna uutta tuontia.
  - **"Viimeksi testattu" -lista:** lue **olemassa olevasta `_tapahtumat`-taulukosta** (ladattu jo `lataaTapahtumat()`
    ~2757, `testitapahtumat`-kokoelmasta) — **ei uutta Firestore-kyselyä**. Näytä 3–5 uusinta (pvm laskevasti):
    joukkueen nimi (`jNimi(t)`) · protokolla/nimi · osallistujamäärä (`t.pelaajatData?.length`) · pvm (`_pvmFiVP`).
    Rivin klikkaus → `avaaTapahtumaV9(t.id)` (olemassa oleva). Jos `_tapahtumat` tyhjä → tyhjätila-CTA
    "Ei vielä testejä — kirjaa ensimmäinen".

### P0.3 — Korjaa rikki "Luo testi" -stub
`avaaUusiTestiModaali` (~3246, nyt `_sigStub('Luo testi — avaa Testaus_v9 / Kalenteri')`) → **ohjaa hubiin**:
```js
window.avaaUusiTestiModaali = function(){ setWs('testit'); };
```
Kutsujat (onboarding "Luo testi →" ~2991, ~3013) vievät nyt Testit-hubiin. Ei enää placeholder-signaalia.

## Reunaehdot
- **Reititys, ei uutta logiikkaa.** Kortit vievät olemassa oleviin: Testaus_v9-launch (~6992-kuvio),
  `avaaTapahtumaV9`, Excel_Tuonti (`vpLataaPohja`/suora linkki). **Älä kirjoita uutta kirjaus-/tuonti-/laskentakoodia.**
- **Pikakirjaus = "tulossa" (P2), ei stub.** Selkeä tuleva-tila, ei kuollutta nappia.
- **Testien joustava valitsin (02b) EI ole P0** — se tulee P1/P2:ssa. P0:n "Kirjaa kentällä" käyttää Testaus_v9:n
  omaa valintaa.
- **Kalenteri ennallaan** — testitapahtumat näkyvät siellä yhä; hub on rinnakkainen koti.
- **"Viimeksi testattu" lukee `_tapahtumat`:sta** (jo ladattu) — ei alikokoelmakyselyä renderissä (§26).
- **Design-lukko + molemmat teemat** (talentmaster-design-system: eyebrow, `.card`, teal-aksentti, hiusviivat,
  Cormorant otsikot, DM Sans, terävät kulmat). Kartta = referenssi.
- **Ei `?v=`-bumppia** (VP-HTML-only, ei lib-muutosta; Pages-cache + auto-bump mainissa). **Ei käsin-versiobumppia** (§33 + CI-vartija).

## Definition of Done
- **L1:** sidebarissa (+ tabbar) "🧪 Testit" -kohta joka aktivoi `ws-testit`-näkymän `setWs('testit')`:llä; hub
  näyttää kaksi ryhmää (Kirjaa nyt: Kirjaa kentällä + Pikakirjaus[tulossa]; Tuo tiedostosta: Excel-pohja +
  Historiatuonti + Palloliiton PDF) + "Viimeksi testattu" (`_tapahtumat`:sta); kortit reitittävät olemassa oleviin
  työkaluihin; `avaaUusiTestiModaali` → `setWs('testit')` (ei stubia); Pikakirjaus selkeä "tulossa", ei kuollut nappi.
- **L2 (vitest):** jos "viimeksi testattu" -poiminta/järjestys eristetään pieneen puhtaaseen helperiin, testaa
  järjestys (pvm desc) + tyhjä-tapaus. Muuten pelkkä render → nyk. suite ennallaan (~893).
- **L3 (elävä, molemmat teemat):** VP:n sivupalkissa näkyy "🧪 Testit"; klikkaus avaa hubin; "Kirjaa kentällä" avaa
  Testaus_v9 (?seura=), "Tuo tiedostosta" -kortit avaavat Excel_Tuonnin (lataus/tuonti/PDF), "Viimeksi testattu"
  listaa oikeat testitapahtumat (SJK), rivin klikkaus avaa tapahtuman; onboardingin "Luo testi →" vie hubiin (ei
  placeholder-toastia). Pikakirjaus näkyy "tulossa"-tilassa.
- Pieni PR. Verifioi live molemmissa teemoissa.

## Huom Codelle
- Tämä on **P0** neliosaisesta suunnitelmasta (design-kartta §04): P1 = Tuo-ryhmä + joustava testivalitsin pohjan
  generointiin · P2 = Pikakirjaus (1–N pelaajaa, nojaa kenttätyökalu-Vaihe 1:een) · P3 = Master-pariteetti +
  seuran roster-Excelin uudelleennimeäminen. **Älä toteuta P1–P3:a tässä** — vain koti + reititys + stubin korjaus.
