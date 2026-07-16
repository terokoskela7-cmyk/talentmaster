# CODE — P3: Arviointi — ADAR-ikäportti + D3-kalibraatio Arviointiin (yksinkertainen) + kehys-pluggability

**Tyyppi:** lib-logiikka (ADAR-ikäportti + testi + cache-bump) + UI-relokaatio (D3-kalibraatio) + selkeytys. **Yksi PR.**
**Kohde:** `lib/tm_arviointi_taksonomia.js` (`tmAdarHavaittu`) · `TalentMaster_VP_v25.html` (`_vpArviointiHTML` + Kehitys-`_kehExtra`) · cache `?v=` (VP + Master).
**Design-totuus:** hyväksytty *"Mittaus + Arviointi — lähdesivut"* Arviointi-paneeli. Tiekartta **P3**. Ohje on itsenäinen.

## Periaate

Arviointi = **havaittu-kehys** (D1–D5, 57 kohdetta): jokainen kohta johtaa lähteestään (🟢 mitattu · 🔵 havaittu 1–5 · 👁 ADAR 1–3), heikko ≤2 → IDP-kandidaatti. **Nykyinen `_vpArviointiHTML` on jo sisällöllisesti rikas** (lähderyhmät, kattavuuspalkki, segmentoitu 1–5, ADAR-johdettu, IDP-silta, kehys-valitsin). P3 on **kohdennettu tarkennus** kolmeen Teron linjaukseen — ei uudelleenrakennus:

1. **ADAR = kolme ikäluokkaa** (korjaus): ADAR-johdetut kohdat vain ikävaiheen ulottuvuuksille.
2. **D3-kalibraatio yksinkertaiseksi** (relokaatio): kompakti lohko Arviointiin, yksi koti.
3. **Taksonomia vaihdettavissa seuran identiteettiin + KPI:hin** (säilytys): ei uutta Palloliitto-kovakoodausta; aktiivinen kehys ohjaa kaikkea.

## Mitä tehdään

### 1. ADAR-ikäportti (lib + testi + cache-bump) — Teron linjaus #1
**Ongelma:** `tmAdarHavaittu(adar_viimeisin)` emittoi **kaikki** ADAR-dimensiot (a/d/ac/r) jotka datassa on, ikävaiheesta riippumatta. Mutta ADAR-kaanon (§7 LUKITTU) on **kolmiportainen ikävaiheittain** — sama kuin kortin PELI-välilehti (`f3`, `DIMS_ALL.slice`):
- **U8–12 (Leikkijä):** vain **Assess** (`a`) → Ennakointi + Näkemys.
- **U13–15 (Rakentaja):** **Assess + Decide + Act** (`a`, `d`, `ac`).
- **U16+ (Showcase):** **kaikki** (`a`, `d`, `ac`, `r`).

**Toteutus (`lib/tm_arviointi_taksonomia.js`):**
- Lisää helper `tmAdarIkaTier(ika)` → palauttaa sallitut ADAR-dimit: `ika == null || ika >= 16 → ['a','d','ac','r']` · `ika >= 13 → ['a','d','ac']` · muuten `['a']`. (ika==null → kaikki, ettei tyhjää dataa piiloteta tuntemattomalla iällä.)
- Lisää `tmAdarHavaittu(adarViimeisin, opts)` **valinnainen `opts`**: `opts.ika` (tai `opts.sallitut`-taulukko). **Taaksepäin-yhteensopiva:** ilman `opts`:ia käytös ennallaan (kaikki dimit). Kun `opts.ika` annettu → suodata `['a','d','ac','r']`-silmukka `tmAdarIkaTier(opts.ika)`-joukolla ennen mäppäystä.
- **Aktiivisen kehyksen adarMap:** jos `opts.adarMap` annettu, käytä sitä `ADAR_HAVAITTU_MAP`:n sijaan (kehys-pluggability — seuran oma kehys voi mäpätä ADAR:n eri taksonomia-avaimiin). Oletus = globaali `ADAR_HAVAITTU_MAP`.
- **Panel-kutsu (`_vpArviointiHTML`):** `tmAdarHavaittu(p.adar_viimeisin, { ika: ika, adarMap: kehys.adarMap })` (ika on jo laskettu `_dimIkaSp`:stä; `kehys` on jo haettu `tmKehys`:llä).
- **Ikävaihe-note** paneeliin ADAR-ryhmän otsikkoon: esim. "👁 ADAR · ikävaihe 8–12 → Assess" / "13–15 → Assess·Decide·Act" / "16+ → täysi". Käytä samaa ikävaihe-labelointia kuin muualla (`ika<=12 ? 'Leikkijä (8–12)' : ika<=15 ? 'Rakentaja (13–15)' : 'Showcase (16–19)'`).
- **Yksikkötesti** (`tests/…arviointi…`): `tmAdarHavaittu({a:2,d:3,ac:1,r:2}, {ika:10})` → vain `anticipation`/`vision` (Assess) avaimet; `{ika:14}` → + `decision_making`+`play_under_pressure`, EI `positioning`; `{ika:17}` → kaikki. Ilman opts → kaikki (regressiovahti).
- **Cache-bump:** `lib/tm_arviointi_taksonomia.js?v=5 → ?v=6` **molemmissa** (VP_v25 + Master_v16).

### 2. D3-kalibraatio Arviointiin — yksinkertainen, yksi koti — Teron linjaus #2
D3 (psyykkinen) = kolmiomittaus: **pelaajan itsearvio × valmentaja × VP** + kuilu (Aukko ≥1.5 ⚠) + varmuus-lippu. Nyt lohko renderöityy **Kehitys-välilehdellä** (`_kehExtra`, D3-kalibraatio-osio). Design-totuus + "yksinkertainen ja helppo" → **siirrä Arviointiin, yksi koti.**
- **Lisää Arviointiin** (`_vpArviointiHTML`, D3-teeman alle tai paneelin loppuun, design-totuuden `.kalib`-tyyli): **uudelleenkäytä olemassaolevaa** — `renderD3VertailuHTML(p.d3_viimeisin && p.d3_viimeisin.pisteet)` (itse×valm×VP + ⚠) + `d3VarmuusChip(p.d3_varmuus)` + yksi nappi `_avaaVpD3Arvio(p.id)` ("Arvioi (VP)" / "Päivitä VP-arvio"). Tyhjä → pehmeä "Ei vielä D3-arvioita. VP-arvio aloittaa kalibraation."
- **Pidä yksinkertaisena:** yksi kompakti lohko, ei uusia mekanismeja. Otsikko "🧠 D3-kalibraatio · itse × valmentaja × VP". Lyhyt selite: "Aukko ≥1.5 = keskustelunaihe · varmuus-lippu kertoo luotettavuuden (ei kliininen mittari)."
- **Poista duplikaatti Kehityksestä:** `_kehExtra`:n D3-kalibraatio-lohko (`_jspD3Vertailu` + Arvioi-nappi) pois → **yksi koti Arvioinnissa.** (Jätä halutessa Kehitykseen 1-rivinen linkki "D3-kalibraatio → Arviointi", jos helppo; muuten pelkkä poisto.)
- **Ei uutta kirjoitusta/Rules:** `_avaaVpD3Arvio`/`_tallennaVpD3` (VP-arvio) ja `renderD3VertailuHTML` ovat olemassa ja toimivat — tämä on **relokaatio**, ei uusi kirjoituspolku.

### 3. Kehys-pluggability seuran identiteettiin + KPI:hin — Teron linjaus #3 (säilytä + selkeytä)
Rakenne on **jo auki:** `ARVIOINTI_KEHYKSET` (avain → `{nimi, asteikko, taksonomia, adarMap}`), `ARVIOINTI_KEHYS_OLETUS='palloliitto'`, kehys-valitsin (`<select>`, näkyy kun >1 kehys tai SA). **Älä riko tätä, älä kovakoodaa Palloliittoa uuteen koodiin.**
- **Kaikki uusi lukee aktiivista kehystä:** ADAR-ikäportti käyttää `kehys.adarMap`; asteikko-labelit `kehys.asteikko`. (Panel jo lukee `kehys.taksonomia`/`kehys.asteikko`.)
- **Selkeytä vaihdettavuus:** kehys-valitsimen/otsikon lähelle pieni note design-totuuden hengessä: "Kehys vaihdettavissa — seuran oma taksonomia + asteikko + KPI-mittarit + ADAR-mäppäys." (Ei toteuteta uutta kehystä tässä — rakenne riittää; seurakohtainen kehys = myöhempi datakonfiguraatio.)

### 4. Asteikko-labelit näkyviin (helppokäyttöisyys) — pieni lisä
Nyt 1–5-segmenttien P/A/G/VG/E-labelit ovat vain tooltipeissä. **Näytä aktiivisen kehyksen asteikko legendana** (kompakti rivi): esim. "1 Kehityskohde · 2 Vaatii työtä · 3 Osaa · 4 Vahvuus · 5 Erinomainen" luettuna `kehys.asteikko`:sta (`A[1..5].fi`, tai `.koodi + ' ' + .fi`). Seuran oma asteikko → adaptoituu automaattisesti. (Jos tämä kasvattaa PR:ää liikaa, se voi jäädä P3.1:een — merkitse selvästi.)

## Reunaehdot
- **ADAR 1–3 säilyy (§7 LUKITTU):** ei muunnosta 1–5:een. arvo ≤2 = kehityskohde → IDP-silta ennallaan.
- **Aktiivinen kehys ohjaa kaikkea:** ei uutta `'palloliitto'`-kovakoodausta; ADAR-ikäportti + asteikko-legenda lukevat `kehys.adarMap` / `kehys.asteikko`.
- **Ei uutta kirjoituspolkua / Rules-muutosta / kenttää:** havaittu-autosave (`_vpTallennaHavaittu`) + D3-VP-arvio (`_tallennaVpD3`) ovat olemassa; P3 ei lisää kirjoituksia. D3-kalibraatio = relokaatio.
- **Cache:** vain `tm_arviointi_taksonomia.js` muuttuu (ADAR-ikäportti) → **`?v=5 → ?v=6` VP + Master.** `tm_eerikkila_normit.js` EI muutu (renderD3VertailuHTML vain kutsutaan uudesta paikasta) → ei sen bumppia.
- **D3/D5 = kehityskäsitteitä, EIVÄT kliinistä tietoa.**
- **Alaikäiset read-only** (Eino·Leo·Emil): havaittu/D3-arviot ovat valmentajan/VP:n kirjauksia — testaa kirjoitukset **vain Topiaksella**; älä kirjoita oikeiden alaikäisten dokumentteihin verifioinnissa.
- **Brändi:** DS-tokenit, molemmat teemat, kaksoisbrändäys (📋 Palloliitto-kortti × ◆ TalentMaster-analytiikka) ennallaan, hiusviivat, lähdevärit (🟢 teal · 🔵 blue · 👁 pinkki · 🟠 amber).
- **Mobiili §6:** kalibraatio-lohko + legenda pinoutuvat kapealla.

## EI tässä (myöhemmät)
- **Seurakohtaisen kehyksen toteutus** (oma taksonomia + KPI-data) → erillinen datakonfiguraatio; nyt vain rakenne + selkeytys.
- **P/A/G/VG/E-legenda** → jos kasvattaa PR:ää, siirrä **P3.1**:een (merkitse).
- **Kehitys-työpöydän muut osat** (multi-goal jaksofokus, reset, joustavat horisontit) → **P4**.

## DoD
1. Arvioinnin ADAR-johdetut kohdat vain ikävaiheen ulottuvuuksille (≤12 Assess · ≤15 Assess·Decide·Act · 16+ täysi), aktiivisen kehyksen `adarMap`; ikävaihe-note näkyy.
2. `tmAdarHavaittu(adar, opts)` ikäportti + `tmAdarIkaTier(ika)` libissä; **taaksepäin-yhteensopiva** (ei opts → ennallaan); yksikkötesti lukitsee ikäportin; `?v=6` VP + Master.
3. D3-kalibraatio näkyy **Arvioinnissa** (itse×valm×VP + Aukko ⚠ + varmuus-lippu + 1-klik Arvioi), uudelleenkäyttäen `renderD3VertailuHTML`/`_avaaVpD3Arvio`/`d3VarmuusChip`; **Kehityksestä duplikaatti poistettu** (yksi koti).
4. Kehys-valitsin + pluggability säilyy; ei uutta Palloliitto-kovakoodausta; vaihdettavuus-note näkyy.
5. (Jos tehty) aktiivisen kehyksen 1–5-asteikkolabelit näkyvissä legendana; muuten merkitty P3.1:een.
6. ADAR 1–3 + IDP-silta (≤2) ennallaan; havaittu-autosave ennallaan.
7. Vitest vihreä + uusi ADAR-ikäporttitesti; ei Rules-muutosta; ei uutta kenttää.
8. Molemmat teemat + mobiili; 0 konsolivirhettä. **Verifioi live:** nuori (U10-11) vs vanha (U16+) pelaaja → eri määrä ADAR-kohtia; D3-kalibraatio näkyy Arvioinnissa, Kehityksessä ei enää duplikaattia. **Verifioi ennen mergeä.**
9. Pieni/keskikokoinen PR; kuvaus linkkaa Arviointi-lähdesivuun + tiekartta P3.
