# R4.1 — Konseptin osa-arviointi: "osaako pelaaja toteuttaa" (1–3, curriculum) · Code-brief

> **Miksi (Teron havainto):** Konseptin osat (a–e, "mitä katsotaan pelissä") näyttävät MITÄ katsoa, mutta **eivät sitä
> osaako pelaaja kutakin osaa toteuttaa**. Jokainen osa näyttää nyt vain honest-empty-vihjeen "arvioi Kehityksessä" —
> koodikommentti (rivi 5828) sanoo suoraan *"per-osa-tila rehellinen tyhjä 'arvioi Kehityksessä' kunnes **R4 kaappaa sen**"*.
> Tämä lohko jäi rakentamatta. Asteikko on jo julki: **1 ei näy · 2 ohjatusti · 3 itsenäisesti** (rivi 5872). Nyt suljetaan
> silmukka: valmentaja arvioi kunkin osan 1–3 Kehityksessä → arvio näkyy Aloituksessa + Kehityksessä.
> **DOMEENI-INVARIANTTI §37 (EHDOTON):** tämä on **curriculum-kerros (OMA teknis-taktinen, 1–3, "mitä harjoitellaan")**,
> EI arviointikehys (Palloliitto 1–5, "mitä osaa"). **Osa-arviota EI johdeta eikä muunneta Arvioinnin 1–5-luvusta** — se on
> valmentajan oma curriculum-havainto (osaa pelissä: ei näy / ohjatusti / itsenäisesti). Kaksi kerrosta, ei yhdistetä.
> **Kartta (SSOT):** `KEHITYS_KISS_design_kartta_v2.html` `.kpi` "Opittu kun" · asteikko-legenda. **Visuaali reuse:** `.jsp-scale3`
> (rivi 1563, 3 palloa teal `on` / amber `low`) — sama kuin ADAR-koostumus (rivi 4578). **Ei uutta laskentaa. Ei `?v`.**

## CODE-SÄÄNNÖT (protokolla)
- **Poikkeama = ilmoita ENNEN.** Reuse yli reimplementoinnin (`.jsp-scale3`, `_vpJfMerge`/`_vpJfTarkenneSync`-tallennuspolku,
  autosave-kuvio). **Älä koske:** Arvioinnin havaittu 1–5 · silta · kalibraatio · jaksofokus-perustallennus (konsepti/kesto/linkit).
- **§37:** osa-arvio = curriculum 1–3, oma kenttä. **EI** lue/kirjoita `arviointi_havaittu`-arvoja (1–5) tähän.

---

## DATAMALLI (uusi, additiivinen — ei riko olemassa olevia jaksofokus-kenttiä)

Osa-arviot tallennetaan **jaksofokukseen**, avainnettuna pääfokus-konseptin osakoodilla (a/b/c/d/e = `kpi.koodi`):
```
jaksofokus.osa_arviot: { "<konsepti_avain>": { "<kpi.koodi>": 1|2|3, ... } }   // esim. { "y_h1": { "a":2, "b":1, "c":3 } }
```
Avaintaso konsepti_avaimella (ei pelkkä koodi) → kestää konseptin vaihdon (vanha konsepti ei sekoita uuteen).
**Editointitila** window-globaaliin `_vpJfOsaArviot[pid]` (peilaa `_vpJfTarkenteet`-kuviota, rivi 7161) → **sulautetaan
jaksofokukseen `_vpJfMerge`:ssä** (rivi ~7264, samaan tapaan kuin `tavoite_tarkenteet`/`linkitetyt`) ENNEN tallennusta.
**Ei uutta Firestore-alikokoelmaa** — osa-arviot ovat osa jaksofokus-objektia (pikakenttä, §26).

## MUUTOS 1 — SYÖTTÖ Kehityksen inline-editorissa (per-osa 1–3)

Teknis-taktinen editori (`_vpTtKorttiHTML`, saavutetaan `_vpJfBodyHTML` → teknis_taktinen) renderöi konseptin osat a–e.
**Lisää kullekin osariville 3-portainen napautuscontrol** (ei näy / ohjatusti / itsenäisesti):
```
<span class="jsp-scale3[ low]"> <i[ on]> ×3 </span>   // reuse; 'low' + amber kun arvo === 1
```
- Klikkaus osan pallo n → asettaa arvon n → `window._vpJfOsaArviot[pid][konsepti_avain][koodi]=n` + **autosave**
  (sama välitön tallennus kuin havaittu 1–5 / `_vpJfTarkenneSync`; kirjoittaa jaksofokukseen `_vpJfMerge`-polun kautta).
- Arvo-label osan vieressä: `3/3 · itsenäisesti` · `2/3 · ohjatusti` · `1/3 · ei näy`.
- **Honest-empty:** ei arviota → pallot tyhjät + "arvioi" (ei fabrikoitua arvoa).
- **§37-note (kompakti):** "Curriculum-arvio (1–3) — miten osa näkyy pelissä. Eri kuin Arvioinnin 1–5."

## MUUTOS 2 — NÄYTTÖ Aloituksen konseptin osissa (read-only, korvaa "arvioi Kehityksessä")

`_vpAloitusKonseptiYdinHTML`, **rivit 5874–5875** (`.idp-kstate` per osa):
- **Kun osa-arvio on** (`jf.osa_arviot[konsepti_avain][koodi]` asetettu): korvaa `<span class="idp-lab">arvioi Kehityksessä</span>`
  → `.jsp-scale3` (3 palloa, `on` = arvo, `low`+amber kun 1) + label (`itsenäisesti`/`ohjatusti`/`ei näy`).
- **Kun ei arviota:** säilytä nykyinen honest-empty `arvioi Kehityksessä` (linkki/vihje Kehitykseen). "Aina esillä, täyttyy datasta."
- **Asteikko-legenda (rivi 5872)** säilyy header-oikealla. **Valinnainen (jos suoraviivainen):** näytä siinä myös jakauma
  arvioiduista osista (esim. "2 · ei näy 1 · ohjatusti 1 · itsenäisesti 1") — jos ei triviaali, jätä pelkkä asteikko-legenda.

## MUUTOS 3 — (valinnainen, jos halpa) Kehitys-statusrivi tunnistaa osa-etenemän
Jos suoraviivaista: `_vpKehStatusHTML` voi lisätä "Osat X/Y itsenäisesti" -kohdan olemassa olevasta `osa_arviot`-datasta
(honest-empty jos ei arvioita). **Ei pakollinen** — vain jos ei vaadi uutta laskentaa.

---

## INVARIANTIT + DoD
- **§37 (curriculum vs arviointikehys):** osa-arvio 1–3 · oma kenttä `jaksofokus.osa_arviot` · **EI** johdeta/muunneta
  Arvioinnin 1–5:stä · **EI** kirjoita `arviointi_havaittu`:un. Curriculum ("mitä harjoitellaan") ≠ arviointikehys ("mitä osaa").
- **Honest-empty:** arvioimaton osa → "arvioi Kehityksessä" (ei katoa, ei fabrikoida). "Aina esillä, täyttyy."
- **Ei datahukkaa:** jaksofokuksen konsepti/kesto/linkit/tavoite_tarkenteet ennallaan; osa_arviot vain lisätään. Autosave.
- **Brändi §5:** teal `on`-pallo · amber vain `low` (arvo 1 = varoitus/kehityskohde) · `.jsp-scale3` reuse · molemmat teemat.
- **LIVE ennen valmista (protokolla — monta profiilia):**
  - **Täysi:** valmentaja napauttaa osan a→2, b→1, c→3 Kehityksessä → autosave → **Aloituksessa** samat pallot + labelit näkyvät.
  - **Osittain:** osa arvioitu, toinen ei → arvioitu näyttää pallot, arvioimaton "arvioi Kehityksessä" (rinnakkain, ei kaadu).
  - **Tyhjä (ei jaksofokusta / ei konseptia):** ei osalistaa, ei kaadu.
  - **Konseptin vaihto:** vaihda konsepti → vanhan konseptin osa-arviot eivät vuoda uuteen (avain konsepti_avaimella).
  - **§37-tarkistus:** Arvioinnin havaittu 1–5 pysyy erillään — osa-arvio ei muuta sitä eikä päinvastoin. Molemmat teemat. Vitest + eslint vihreä.

## EI TÄSSÄ (mahdollinen jatko)
- Osa-arvion **Arviointi-linkitys** (kartan `.mtag 🔗 Arviointi` — osa voisi VALINNAISESTI seurata Arviointi-arvoa): erillinen,
  §37-herkkä lisä myöhemmin jos Tero haluaa. Nyt osa-arvio = valmentajan oma curriculum-havainto.
- Osa-arvion historia/trendi (kehityskaareen). Ei tässä.
