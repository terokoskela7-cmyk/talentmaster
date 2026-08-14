# R3.B-korjaus — ADAR-duplikaatin konsolidointi (poista f3, taita sisältö suomalaiseen lohkoon) · Code-brief

> **Miksi:** #365 lisäsi suomenkielisen D4 ADAR-koostumuslohkon, MUTTA Arviointi-tab näyttää jo yläosassa **f3**
> "Peliäly · havainto" (Awareness/Decision/Action — **englanti**, sama ADAR-data) → ADAR **kahdesti** + kielisekaannus.
> (Arkkitehdin speksivirhe R3.B:ssä: ei huomioitu olemassa olevaa f3:a.) Tero: **poista yläosan f3, säilytä suomalainen
> lohko ainoana ADAR:na, taita f3:n arvokkaat osat siihen.** KISS: yksi datapiste, yksi paikka, yksi kieli.
> **Kartta (SSOT):** `ARVIOINTI_KISS_design_kartta_v3.html` — D4 ADAR **kerran**, suomeksi, attribuuttien jälkeen.
> **Luonne:** poisto + fold-in. Ei uutta dataa (reuse). Ei `?v`.

## CODE-SÄÄNNÖT (protokolla)
- Poikkeama = ilmoita ENNEN, älä toteuta eri versiota yksin · reuse yli reimplementoinnin · **älä hukkaa f3:n toiminnallisuutta.**
- Arviointikoneisto (havaittu 1–5 autosave · silta · kalibraatio · FA-potentiaali) ennallaan.

---

## MUUTOS 1 — poista f3 Arviointi-tabista

Tab 2 -kokoonpano (rivi ~10915): poista **`_mSub('Peliäly · havainto') + f3 + _mErot`** kokonaan `_jspTab5`:n edestä.
(f3 = englanninkielinen ADAR-taulu, rivi ~10704–10745 — sen *rakennus* voi jäädä koodiin jos f2/muut tarvitsevat, mutta
sitä EI enää lisätä tab 2:een. Tarkista ettei f3 ole käytössä muualla; jos ei → voi poistaa myös rakennuksen.)

## MUUTOS 2 — taita f3:n arvokkaat osat `_vpArvAdarKoostumusHTML`:ään

Suomenkielinen lohko (#365) jää ainoaksi ADAR:ksi, v3-paikkaan (attribuuttien jälkeen, ennen D3-kalibraatiota). **Lisää siihen
f3:sta säilytettävät:**
1. **Ristiinarvio:** `_vpRistiinarvio(p)` (multi-rater cross-assessment) — lisää koostumusrivien JÄLKEEN. Reuse suoraan (sama funktio).
2. **Sisääntulo:** "➕ Lisää pelihavainto" -linkki (→ `TalentMaster_ADAR_Pikakortti.html?seuraId=…&pelaajaId=…`, uuteen välilehteen)
   — lisää lohkon loppuun (sama markup kuin f3:ssa).
3. **Tyhjä tila (muutos #365:een):** kun `p.adar_viimeisin` puuttuu, lohko EI enää katoa (`return ''`) vaan näyttää
   **f3:n tyhjätila-CTA:n** — "Ei pelihavaintoja vielä" + "➕ Lisää pelihavainto". → ADAR-osio on **aina esillä**
   sisääntulopisteineen (sama periaate kuin tutka: aina esillä, täyttyy datasta). Rehellinen tyhjä = CTA, ei katoaminen.

**Tulos:** ADAR **kerran** Arviointi-tabissa — suomeksi (Havaitse·Päätä·Toimi·Arvioi) · koostumus + ristiinarvio + sisääntulo ·
ikäportti (U13 → Arvioi lukossa) · aina esillä (tyhjä → CTA). Ei englantia, ei duplikaattia.

---

## INVARIANTIT + DoD
- **Ei toiminnallisuushukkaa:** ristiinarvio (`_vpRistiinarvio`) + "Lisää pelihavainto" -sisääntulo säilyvät (nyt suomalaisessa lohkossa).
- **§37** (1–3 ≠ 1–5) · **§7** ikäportti (`tmAdarIkaTier`, ennallaan) · **§26** pikakentät · read-only koostumus (ei autosavea).
- **Brändi §5** · **yksi kieli (suomi)** ADAR:ssa · molemmat teemat.
- **LIVE ennen valmista (protokolla — monta profiilia + poikkitaulukko):**
  - ADAR näkyy **tasan kerran** (ei enää yläosan englanninkielistä f3:a) · suomeksi.
  - **Täysi ADAR** → koostumus + ristiinarvio + "Lisää pelihavainto".
  - **U13** → Havaitse·Päätä·Toimi + Arvioi lukossa "avautuu 16 v".
  - **Ei ADAR-dataa** → "Ei pelihavaintoja vielä" + CTA (EI katoa, EI kaadu).
  - Arviointikoneisto (havaittu 1–5 · silta · kalibraatio) ennallaan. Molemmat teemat. Vitest + eslint vihreä. Ei `?v`.
