# R3.B — Arviointi v3: D4 Peliäly ADAR-koostumuslohko ("koostumus näkyviin") · Code-brief

> **Miksi:** Kartan (v3, kanoninen) ydin on **"koostumus näkyviin"**: D4 Peliäly EI ole paljas /5-luku vaan **ADAR:n
> neljä osaa** (Havaitse · Päätä · Toimi · Arvioi, 1–3, ikäportitettu). Live-Arviointi näyttää ADAR:n vain per-attribuutti
> 1–3 -lukuna pelihavainto-ryhmässä — v3:n oma **"D4 Peliäly · pelihavainnosta (ADAR) · 1–3" -koostumuslohko** puuttuu.
> R3.A vei jo rail-vapauden + flow'n; tämä lisää viimeisen puuttuvan lohkon → sulkee Arviointi-kartan.
> **Kartta (SSOT):** `docs/idp_design/ARVIOINTI_KISS_design_kartta_v3.html` (`.sub2` "D4 Peliäly · ADAR" · `.adar-row` · `.scale3`).
> **Luonne:** ADDITIIVINEN read-only -lohko `_vpArviointiHTML`:ään — EI uutta dataa (reuse `p.adar_viimeisin`), EI autosavea
> (koostumus on NÄKYMÄ; ADAR-syöttö tapahtuu pelihavainnosta ennallaan). Ei `?v`.

## CODE-SÄÄNNÖT (protokolla)
- Poikkeama = ilmoita ENNEN, älä toteuta eri versiota yksin · reuse yli reimplementoinnin · älä keksi ehtoa/porttia.
- **Älä koske arviointikoneistoon** (havaittu 1–5 autosave · silta · kattavuus-klik · D3-kalibraatio · FA-potentiaali).

---

## RAKENNETTAVA LOHKO (v3 `.sub2` sanatarkasti)

**Sijainti:** attribuuttiryhmien JÄLKEEN, **ennen D3-kalibraatiota** (v3-järjestys: kattavuus → silta → attribuutit →
**D4 ADAR** → D3 kalibraatio → FA-potentiaali). Eli lisää lohko `_vpD3KalibraatioHTML`-kutsun ETEEN.

**Otsikko:** eyebrow "D4 Peliäly · pelihavainnosta (ADAR) · 1–3" + selite (compo-note):
"Mitä 'peliäly'-luvun takana on: neljä osaa, ikäportitettu. U13 → Havaitse · Päätä · Toimi (Arvioi avautuu 16 v).
Ei muunneta 1–5:een — pysyy 1–3."

**Rivit (`.adar-row`) — 4 osaa, data `p.adar_viimeisin` (a/d/ac/r):**
| osa | kenttä | label |
|---|---|---|
| Havaitse | `a` | (näkeekö tilanteen) |
| Päätä | `d` | (valitseeko oikein) |
| Toimi | `ac` | (toteuttaako) |
| Arvioi | `r` | (lukee uudelleen) |

Kukin rivi: nimi + `.scale3` (3 palloa, `on` = arvo, `low`-amber jos arvo alhainen) + arvo-label ("3/3 · itsenäisesti" ·
"2/3 · ohjatusti" · "1/3 · ei vielä"). **Summa-rivi:** "Kokonais X/Y" (`p.adar_viimeisin.yht`).

**IKÄPORTTI (§7 kolmiportainen — reuse olemassa oleva ADAR-tier-logiikka, `_adarTierLbl`/vastaava):**
- U8–U12 → vain **Havaitse** (Päätä/Toimi/Arvioi "avautuu myöhemmin", himmennetty `.locked`).
- U13–U15 → **Havaitse · Päätä · Toimi**; **Arvioi** `.locked` "avautuu 16 v".
- 16+ → kaikki neljä.
Lukitut osat: himmeä (`.locked`, tyhjä scale3) + "avautuu 16 v" -teksti. **ÄLÄ näytä lukittua arvoa.**

**HONEST-EMPTY:** ei ADAR-havaintoja (`p.adar_viimeisin` puuttuu / yht == null) → lohko näyttää osat tyhjinä +
"ei vielä pelihavaintoja — kirjaa pelihavainto". Ei fabrikoida arvoja. `<3` havaintoa → "epävarma (<3)" -merkki (kuten rivi 13792).

**Reuse:** ADAR-data + ikäportti + summa ovat jo koodissa (rivi 7299 `_ek.adar`, rivi 13792 pdc-mini, `tmAdarHavaittu`).
**Poimi jaettu apuri jos kätevää** — älä re-derive ADAR-laskentaa.

---

## INVARIANTIT + DoD
- **§37:** arviointikehys 1–5 ≠ curriculum 1–3; ADAR pysyy **1–3** (ei muunneta 1–5:een). **§7** ikäportti. **§26** pikakentät.
- **Read-only:** ei autosavea tähän lohkoon (näkymä). Arviointikoneisto (havaittu 1–5 · silta · kalibraatio · FA-potent) ennallaan.
- **Brändi §5:** teal `on`-pallo · amber vain alhainen/varoitus · `.scale3` himmeä pohja · `var(--border)` · molemmat teemat.
- **LIVE ennen valmista (protokolla — monta profiilia):**
  - **Täysi ADAR** (a/d/ac/r asetettu, 16+) → 4 osaa palloineen + summa.
  - **U13-pelaaja** → Havaitse·Päätä·Toimi näkyy, **Arvioi lukittu "avautuu 16 v"**.
  - **Ei ADAR-dataa** → honest-empty "ei vielä pelihavaintoja", ei fabrikointia.
  - Sijainti: attribuuttien jälkeen, D3-kalibraation edellä. Molemmat teemat. Vitest + eslint vihreä.

## EI TÄSSÄ
Silta 4. tyyppi (D3-johdettu välitavoite sillassa) = mahdollinen erillinen pieni lisä myöhemmin, jos Tero haluaa. Ei tässä.
