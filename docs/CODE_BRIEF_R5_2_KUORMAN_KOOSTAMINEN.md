# R5.2 — Kuorman koostaminen: kaikki päivän sessiot summautuvat (pelaajan app-rasitus + joukkue + omatoimi) · Code-brief

> **Miksi (Teron havainto, tarkistettu koodista):** Kuormamalli on nyt **yksi sessio per päivä**. `kirjaukset/{pvm}` on yksi
> dokumentti; `_vpViikkoLataa` lukee vain **`sessiot[0]`** (tai litteät `rpe`/`kesto_min`), ja `_vpViikkoTallennaRivi` kirjoittaa
> `sessiot:[sessio]` `set({merge:true})`-setillä → **Firestore korvaa `sessiot`-taulukon** (arrayt eivät merge:llä yhdisty).
> Seuraus: jos samalla päivällä on **joukkueharjoitus + pelaajan oma sessio** (Pelaaja-app kirjoittaa samaan `{pvm}`-dokkiin),
> ne **eivät summaudu** — viimeisin kirjoittaja voittaa → **päivän kokonaiskuorma (sRPE) + ACWR aliarvioi** monisessioisina päivinä.
> **Tavoite:** kaikki päivän sessiot (valmentaja/joukkue · pelaajan app · omatoimi · oma teema) **summautuvat** päivän kokonaiskuormaan,
> ja pelaajan appissa kirjattu rasitus näkyy Viikon/kalenterin kuormassa. **Tämä on §35 K5 -suunta (kuorma→dropout-erottautuja).**
> **Koskee KAHTA tiedostoa:** `TalentMaster_VP_v25.html` (luku + kuorma + valmentajan kirjoitus) + `TalentMaster_Pelaaja_v7.html`
> (pelaajan kirjoitus). **Invariantti säilyy:** sRPE johdetaan (rpe × kesto), EI tallenneta. Ei uutta kokoelmaa. Ei `?v` (VP); Pelaaja-app SW-cache-versio nostettava §27.

## CODE-SÄÄNNÖT (protokolla)
- **Poikkeama = ilmoita ENNEN.** Reuse yli reimplementoinnin. **Älä koske:** morfosykli-nauhan Oura-koodaukseen · MD-ankkurointiin ·
  §28-kuormaehdotukseen · jaksofokus A/B/C -logiikkaan · läsnäolo/ääni/katselmus. **Vain kuorman datamalli (sessiot[]) + luku + summa.**
- **§7.22:** pelaaja näkee **oman rasituksensa/fiiliksensä**, EI ACWR-lukua/kuormarankingia. **GDPR:** terveyssyy ei kirjauksiin. **A5-vartija:** `luotu` säilyy.

---

## KANONINEN PÄIVÄMALLI — `kirjaukset/{pvm}.sessiot[]` = kaikki päivän sessiot (avain-yksilöity)

`sessiot[]` on **kuorman totuuslähde**. Kukin sessio:
```
{ avain: '<stabiili avain>',   // 'pelaaja' (pelaajan oma) · tapahtuma_id (kalenteri/joukkue/oma teema) · 'valmentaja' (valmentajan käsin, ei kalenteria)
  lahde: 'pelaaja'|'valmentaja'|'kalenteri',
  rpe: 1–10|null, kesto_min: n|null, tyyppi: 'treeni'|'lepo',
  tavoite_tag, konsepti_avain, fokus_nimi, tapahtuma_id }
```
**Litteät `rpe`/`kesto_min`** jäävät backward-compat-peiliksi **primäärisessiosta** (näyttö), mutta **kuorma lasketaan `sessiot[]`-summasta.**

## MUUTOS 1 (VP_v25 + Pelaaja_v7) — KIRJOITUS = UPSERT avaimella (ei array-ylikirjoitus)

Molemmat kirjoittajat **lisäävät/päivittävät oman sessionsa** `sessiot[]`:iin avaimella, **eivät korvaa koko taulukkoa**:
1. **Lue** nykyinen `kirjaukset/{pvm}` (`.get()`), ota `sessiot = data.sessiot || []`.
2. **Upsert** oma sessio avaimella: poista sama `avain` jos on, lisää uusi → `sessiot`.
3. **Kirjoita** koko `sessiot`-taulukko takaisin (`set({merge:true})` — nyt taulukko sisältää KAIKKI sessiot).
- **VP_v25 `_vpViikkoTallennaRivi`:** `avain = row.sessioId (tapahtuma_id) || 'valmentaja'`. (Nyt kirjoittaa `sessiot:[sessio]` → **vaihda read-modify-write-upsertiin**.)
- **Pelaaja_v7 `_tallennaKirjaus`:** `avain = 'pelaaja'` (tai `'pelaaja:'+aika` jos useita/pv). **Säilytä litteät kentät** (backward-compat) mutta **upsertaa myös `sessiot[]`:iin** — ei ylikirjoita valmentajan/kalenterin sessioita.
- **Konkurrenssi:** per-pelaaja, matala samanaikaisuus → read-modify-write riittää (ei tarvita transaktiota; jos halutaan tiukempi, käytä `runTransaction` — ilmoita ENNEN jos teet). `luotu`/A5-vartija ennallaan (create-haaralla).

## MUUTOS 2 (VP_v25) — LUKU = summaa kaikki sessiot

`_vpViikkoLataa`: rivin **näyttö** primäärisessiosta (prioriteetti: kalenteri/joukkue → fokus → pelaaja — sama valintajärjestys kuin nyt),
mutta **päivän kuorma summautuu KAIKISTA `sessiot[]`-sessioista**:
```
row.srpe = sessiot.reduce((s, x) => s + ((+x.rpe > 0 && +x.kesto_min > 0) ? x.rpe * x.kesto_min : 0), 0);
row.sessio_lkm = sessiot.filter(x => x.tyyppi !== 'lepo').length;
```
(Jos `sessiot[]` puuttuu vanhoista dokeista → fallback litteään `rpe`×`kesto_min` = 1 sessio. Taaksepäin­yhteensopiva.)

## MUUTOS 3 (VP_v25) — KUORMA + ACWR summasta

`_vpViikkoKuormaHTML`: päivän sRPE-palkki + `viikkoAU` = **Σ `row.srpe`** (kaikki sessiot), EI enää yhden session rpe×kesto.
**ACWR:n krooninen pohja** (`_viikkoKrono4`, missä lasketaankin): **käytä samaa sessiot[]-summaa** historiassa → akuutti:krooninen vertailukelpoinen.
(Jos `_viikkoKrono4` lasketaan eri paikassa vanhalla litteä-logiikalla → päivitä sama summa-logiikka sinne. **Ilmoita ENNEN jos vaatii ison muutoksen.**)

## MUUTOS 4 (VP_v25) — nauhan hienovarainen monisessio-merkki (Oura)

Morfosykli-kortti pysyy **yksi kortti/päivä** (rauhallinen). Kun `row.sessio_lkm > 1`: pieni mono-merkki "· N sessiota" (ink3, ei väriä).
Kuormapalkki heijastaa **summaa** (`row.srpe` / viikon max). Primäärisessio otsikkona kuten ennen. **Teal vain jaksofokukselle** (ennallaan).

---

## INVARIANTIT + DoD
- **Kuorma = kaikki päivän sessiot summattuna:** pelaajan app-rasitus (📱) + joukkueharjoitus + omatoimi + oma teema **summautuvat**
  päivän sRPE:hen → viikkoAU + ACWR eivät enää aliarvioi. sRPE **johdettu, ei tallenneta** (ennallaan).
- **Ei ylikirjoitusta:** upsert avaimella → valmentaja ja pelaaja **eivät clobbaa** toistensa sessioita samana päivänä.
- **Taaksepäin­yhteensopiva:** vanhat litteä-`rpe`-dokit → 1 sessio (ei kaadu). Pelaaja-app litteät kentät säilyvät.
- **§7.22/GDPR/A5:** pelaaja ei näe ACWR:ää/kuormarankingia · terveyssyy ei kirjauksiin · `luotu` ennallaan.
- **LIVE ennen valmista (protokolla — monta profiilia, MOLEMMAT tiedostot):**
  - **Yksi sessio/pv:** kuten ennen (pelaajan RPE 📱 näkyy, kuorma = 1 sessio).
  - **Kaksi sessiota/pv (joukkue + pelaajan oma):** valmentaja kirjaa joukkuesession + pelaaja kirjaa appissa oman → **kuorma = summa**
    (ei last-writer-wins) · nauhassa "· 2 sessiota" · viikkoAU + ACWR heijastaa summaa.
  - **Oma teema (R5.1) + pelaajan oma sama pv:** molemmat mukana summassa.
  - **Regressio:** morfosykli-näyttö · MD · §28 · jaksofokus A/B/C · läsnäolo ennallaan. Molemmat teemat (VP). Pelaaja-app: SW-cache-versio nostettu (§27), rasitus tallentuu upsertina.
  - Vitest + eslint vihreä. VP: ei `?v`. Pelaaja: SW-versio §27.

## EI TÄSSÄ (mahdollinen jatko)
- **K5 kuorma→dropout-erottautuja** täydessä laajuudessa (läsnäolo × kuorma → varhaisvaroitus): tämä brief tuottaa oikean **kuorman summan** sen pohjaksi; erottautuja erikseen (§35 K5).
- Kuorman **viikko-/kausitrendit** (longitudinaali) — kun summattua dataa on kertynyt.
