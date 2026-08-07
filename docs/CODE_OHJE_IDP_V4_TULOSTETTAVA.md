# CODE — IDP V4: Tulostettava / jaettava IDP + §37-raporttilinkitys

**Tyyppi:** Näyttö (print-kompositio olemassa olevasta datasta) + linkki. **Ei skeema-/laskenta-/Rules-muutosta.** **Pieni PR.**
**Kohde:** `TalentMaster_VP_v25.html` — per-pelaaja IDP-näkymä (`_jspTab*` / `_vpIdpNarratiiviHTML` / `_kehExtra`) +
`@media print`-lohko (~1767) + `_mdtPrint` (~11759). **Design-referenssi:** §22 A4-print-kuvio (Carbon→valkoinen).
**Osa "maailmanluokka"-rimaa V4** (`docs/IDP_KORTTI_MAAILMANLUOKKA.md §6`). Ei aiempaa V4-briiffiä — tämä on se.

## Tausta (statuskatsaus 2026-07-30)
IDP:n P0–P6 + V2 (ehdotusmoottori) + V3 (elinkaari/review) ovat **tehty**. Print-infra on **osittain**: `@media print`
(~1767) pakottaa valkoisen teeman ja rajaa näkyvyyden **vain `#mdtProfiili`:iin** (§37 Pelaajaraportti), ja
`_mdtPrint = window.print()` (~11759) laukaisee sen ("Vie PDF" / "Vie PDF vanhemmalle" -napit). **Puuttuu:**
dedikoitu **koko IDP:n** tulostenäkymä (kausitavoite → välitavoitteet → jaksofokus → review-historia + identiteetti +
5D) ja selkeä **linkki §37 Pelaajaraporttiin**. Nyt tulostus kattaa vain MDT-profiilin, ei IDP-synteesiä.

## Periaate
V4 = **VP/valmentajan tulostettava/jaettava IDP-yhteenveto** yhtenä A4-dokumenttina, koottuna **olemassa olevasta
datasta ja render-paloista** (ei uutta laskentaa). Ei riko nykyistä MDT-printtiä — uusi print-tila on **rinnakkainen**
ja skoupattu omaan juureensa `body`-luokalla.

## Työ

### V4.1 — Print-juuri `#idpPrint` + skoupattu print-tila
- Lisää per-pelaaja-IDP-näkymään **"🖨 Tulosta IDP"** -nappi (VP/valmentaja; sama tyyli kuin nyk. "Vie PDF").
- Nappi: (1) rakentaa/olemassaolevasta täyttää **`#idpPrint`**-säiliön ko. pelaajan IDP-synteesillä, (2) asettaa
  `document.body.classList.add('print-idp')`, (3) `window.print()`, (4) `afterprint`-kuuntelija poistaa luokan.
- **Laajenna `@media print`-lohkoa (~1767) rinnakkaisella säännöllä** — ÄLÄ riko nykyistä `#mdtProfiili`-haaraa:
  ```
  @media print {
    /* nykyinen #mdtProfiili-haara ennallaan */
    body.print-idp * { visibility: hidden !important; }
    body.print-idp #idpPrint, body.print-idp #idpPrint * { visibility: visible !important; }
    body.print-idp #idpPrint { position:absolute; left:0; top:0; width:100%; }
    body.print-idp .mdt-no-print, body.print-idp #idpPrint .no-print { display:none !important; }
  }
  ```
  (Valkoinen teema tulee jo olemassa olevasta `:root`-print-overridesta — säilytä.)

### V4.2 — `#idpPrint`-sisältö: koko IDP olemassa olevista paloista
Kokoa **yhdestä pelaajasta** (`_vpArvPelaaja`/nykyinen valittu IDP-pelaaja), käyttäen olemassa olevia render-funktioita
äläkä kirjoita logiikkaa uudelleen:
1. **Identiteetti-header** — nimi, joukkue, ikä/PHV-tila, pvm (`_pvmFiVP`). (Sama data kuin Aloitus `_vpIdpNarratiiviHTML`.)
2. **5D-yhteenveto** — joko `_tmRadar5D` (jos helppo upottaa print-DOMiin) TAI staattinen taso-lista D1–D5. Radar ei pakollinen jos se hankaloittaa printtiä.
3. **Kausitavoite** — `p._idpTavoite` / `idp_kausi`-dokin täysi tavoite (SMART-lause, fokusdimensio, normigap). Sama minkä Työpöytä (`_kehExtra`) näyttää.
4. **Välitavoitteet** — tavoitteen tarkenteet (`jaksofokus.tavoite_tarkenteet` / välitavoite-kartta, P4b).
5. **Jaksofokus** — `p.jaksofokus` (konsepti + cue + domeeni + ohjelma jos on).
6. **Review-historia** — `review_viimeisin_pvm` + "Seuraava review" (V3). Lyhyt lista/aikaleima riittää.
7. **§37-linkki** — näkyvä viittaus Pelaajaraporttiin: nappi/linkki joka avaa saman pelaajan **`#mdtProfiili`**
   (Pelaajaraportti-segmentti, `_rapSeg('mdt')`). Näytössä linkkinä; printissä tekstiviitteenä ("Täydentävä
   Pelaajaraportti: [nimi]") — ÄLÄ upota koko MDT-profiilia IDP-printtiin (ne ovat eri dokumentit; V4 = IDP, §37 = raportti).

### V4.3 — Reunaehto: jakaminen vanhemmalle = §7.22/§16
Tämä tulostettava IDP on **VP/valmentaja-dokumentti**. Jos se on tarkoitus jakaa **vanhemmalle**, sen on kunnioitettava
§7.22/§16:tta (ei TKI-laskua, ei kovia percentiilejä lapsen/perheen suuntaan) — kuten nyk. "Vie PDF vanhemmalle"
(MDT) jo tekee. **Tässä PR:ssä V4 = VP/valmentaja-versio** (täysi data). **ÄLÄ** rakenna vanhempi-jaettavaa varianttia
tässä — se on oma tehtävä (perhe-suodatettu), ja MDT:n "Vie PDF vanhemmalle" kattaa perhepinnan toistaiseksi.

## Reunaehdot
- **Ei skeema-/laskenta-/Rules-muutosta.** Kaikki data luetaan olemassa olevista kentistä/pikakentistä (§26) ja
  render-funktioista. Read-only kompositio.
- **Älä riko nyk. MDT-printtiä** (`#mdtProfiili`-haara + `_mdtPrint` ennallaan) — uusi print-tila on rinnakkainen `body.print-idp`.
- **Design-lukko (§22 print):** A4, Carbon→valkoinen (olemassa oleva print-override), hiusviivat, Cormorant otsikot,
  DM Sans leipä, DM Mono luvuille. Ei täyttövärejä. `@page { margin:12mm }` ennallaan.
- **Ei `?v=`-bumppia** (VP-HTML-only, ei lib-muutosta; Pages-cache + auto-bump mainissa hoitaa).
- **§7.22:** VP/valmentaja-versio täysi; vanhempi-variantti EI tässä.

## Definition of Done
- **L1:** "🖨 Tulosta IDP" -nappi per-pelaaja-IDP-näkymässä; `#idpPrint` kootaan olemassa olevista paloista
  (identiteetti + 5D + kausitavoite + välitavoitteet + jaksofokus + review + §37-linkki); `@media print`
  `body.print-idp`-haara skouppaa printin `#idpPrint`:iin rikkomatta `#mdtProfiili`-printtiä; `afterprint` siivoaa luokan.
- **L2 (vitest):** jos print-komposition datanpoiminta eristetään pieneen puhtaaseen helperiin (esim.
  `_idpPrintData(p)`), testaa että se palauttaa oikeat kentät (kausitavoite/jaksofokus/review) ja sietää puuttuvan
  datan (ei kaadu kun `p.jaksofokus`/review puuttuu). Jos logiikka on pelkkää DOM-kokoamista, L2 = nyk. suite ennallaan (~893).
- **L3 (elävä, print-preview):** avaa oikean IDP-pelaajan (esim. SJK/Sibbo jolla kausitavoite + jaksofokus asetettu) →
  "🖨 Tulosta IDP" → selaimen print-preview näyttää **yhden siistin A4-IDP:n** (valkoinen tausta, kaikki 6 osiota +
  §37-viite), MDT-profiili EI vuoda mukaan; nyk. "Vie PDF" (MDT) toimii yhä erikseen. Molemmat teemat näytöllä
  (print = valkoinen kummastakin).
- Pieni PR. Ei versiobumppia. Verifioi print-preview ennen mergeä.
