# P1.5 — Pelihavainto: laaja taksonomia + dimensioreititys (käytettävyys edellä)

> **Laajennus P1:een** (`CODE_BRIEF_PELIHAVAINTO_P1.md`): pelihavainnon "Tarkenna kohde" -dropdown avautuu D4:stä
> **koko havaittavaan taksonomiaan** (48 kohdetta, 5 dimensiota), ja havainto **reititetään dimensionsa mukaan**
> oikeaan TM-konseptiin ja oikeaan arvioinnin dimensioon. **Pelihavainto pysyy kevyenä** (1 tapahtuma + 1 kohde +
> ADAR) — se EI muutu 5D-arviointiruudukoksi (se on Arviointi, §6). Kohde: **Master_v16**. §4 · §26 · §34 · V5/V7 · P1.

## 0. Miksi — ja miksi tämä ei riko käytettävyyttä
P1:n dropdown näyttää vain D4-peliälyn. Mutta ottelu paljastaa muutakin: tekniikan paineessa (D2), asenteen/
johtajuuden (D3), joukkueroolin (D5), fyysisen läsnäolon (D1-havaittava). **Asiantuntijan pitää voida kiinnittää
havainto siihen mitä hän näki** (§1.1 asiantuntijan valta). Käytettävyys säilyy, koska **valmentajan teko on aina
sama ja yksinkertainen** — avaa Pelihavainto, anna ADAR, valitse (halutessaan) kohde — ja **järjestelmä päättää minne
havainto menee**. Valmentaja ei koskaan valitse työkalujen väliltä.

## 1. KÄYTETTÄVYYS — kolme konkreettista skenaariota (lue tämä ensin)

Sama ele joka kerta: *Havainnoi → Tilanne → ADAR 1–5 → (valinnainen) Tarkenna → Tallenna.* Ero on vain minne se virtaa.

**Skenaario A — peliäly (oletus, yleisin).** Valmentaja näkee ottelussa topparin lukevan hyökkäyksen myöhään.
Avaa Pelihavainto → Tilanne **Peli** → Havainnointi **2/5** → Tarkenna jää **"Automaattinen"** → Tallenna.
→ Työkalu ehdottaa **yksilöteemaa** (Kartta A: y_h0 Havainnointi). → Havainto näkyy Arvioinnissa D4-lähteenä.
*Valmentaja teki yhden asian; sai teema-ehdotuksen.*

**Skenaario B — tekniikka (P1.5:n ydin).** Sama pelaaja hukkaa ensikosketuksen paineessa toistuvasti — tämä ei ole
peliälyä vaan tekniikkaa. Avaa Pelihavainto → Tilanne **Peli** → Toteutus **2/5** → Tarkenna → ryhmä **Tekninen** →
**Pallonhallinta** → Tallenna. → Koska kohde on **D2**, työkalu reitittää **V5-siltaan** → ehdottaa teknis-taktista
teemaa. → Havainto syöttyy Arvioinnissa **D2 Pallonhallinta** -lähteeksi (🔵/👁). *Valmentaja ei avannut Arviointia
lainkaan — silti pelaajan D2-kuva rikastui.*

**Skenaario C — henkinen (positiivinen, ei-teema).** Valmentaja näkee poikkeuksellista johtajuutta. Avaa Pelihavainto
→ Tilanne **Peli** → Tarkenna → ryhmä **Henkinen** → **Johtajuus** → vapaa havainto → Tallenna. → **Ei pakotettua
harjoitusteemaa** (johtajuus ei ole y_h*-teema) — havainto **kirjataan** ja näkyy Arvioinnissa D3 Johtajuus -lähteenä.
*Positiivinen/henkinen havainto tallentuu pelaajan 5D-kuvaan, vaikka siitä ei tule harjoitusteemaa.*

**Ydin:** valmentajan teko on kaikissa identtinen ja nopea. Taksonomia-kohde kertoo vain **mihin laatikkoon** havainto
kuuluu; järjestelmä hoitaa reitityksen. Yksi työkalu, yksi ele, älykäs reititys.

## 2. Dropdown — ryhmitelty, koko havaittava taksonomia (48)
- `<optgroup>`-ryhmät dimensioittain, **D4 Peliäly ylimpänä ja oletuksena** (se on peliälyhavainto):
  **Peliäly** (17) · **Tekninen** (14) · **Henkinen** (12) · **Sosiaalinen** (2) · **Fyysinen (havaittava)** (3).
- **Vain havaittavat** (`mitattavissa:false`, 48 kpl). Mitattavat (Nopeus, Voima…) EIVÄT näy — ne tulevat Testauksesta.
  Lista `tm_arviointi_taksonomia.js`:stä (jo suomeksi), suodatin valmiina.
- Oletus **"— Automaattinen (havainnosta) —"** säilyy (johdetaan ADAR:sta kuten P1).

## 3. Dimensioreititys — havainto → oikea TM-konsepti (§1.1: ehdotus, ei pakko)
Kun `taksonomia_valittu` (tai auto-johdettu) on tiedossa, reititä **dimension** mukaan:
| Dimensio | TM-konsepti-ehdotus | Lib |
|---|---|---|
| **D4 Peliäly** | yksilöteema (Kartta A) · pelipaikka (P2) · joukkue (P3) | `tm_pelialy_yksilo` + P2/P3 |
| **D2 Tekninen** | teknis-taktinen teema | **V5-silta `tmSiltaEhdota`** (jo olemassa!) |
| **D1 (havaittava)** | fyysinen teema (jos relevantti) | V7 `tm_fyysteemat` (harkinnan mukaan) |
| **D3 Henkinen / D5 Sosiaalinen** | **ei pakotettua teemaa** → kirjaus | — (§9 päätös) |
- **Asiantuntijan valta:** aina "Näytä kaikki" → koko konseptilista ehdotuksen ohi. Voi olla asettamatta mitään.

## 4. Syöte Arviointiin — laajenna nykyistä (nyt vain D4)
- P1 syöttää pelihavainnon Arviointiin **vain D4**-lähteenä (`adarHav` → ADAR_HAVAITTU_MAP → D4-avaimet). P1.5:
  **kunnioita `taksonomia_valittu`** → syötä havainto **sen dimension** kohteeseen Arvioinnissa (🔵/👁, yliajettavissa).
- **Arvo-mekaniikka (§9 AVOIN — suositus):** ADAR pysyy ainoana numerosyötteenä. Kiinnitetyn kohteen arvo johdetaan
  ADAR:sta: D4 kuten P1; **D2 → Toteutus-pisteestä** (Act = suoritus paineessa); D1-havaittava → Toteutus/kokonais.
  **D3/D5 → laadullinen kirjaus ilman 1–5** (asenne/johtajuus ei ole ADAR-akselilla). Vaihtoehto: valinnainen yksi
  1–5 kiinnitetylle kohteelle. Tero valitsee §9.

## 5. Datamalli (additiivinen — `taksonomia_valittu` on jo P1:ssä)
- `havainnot/{id}.taksonomia_valittu` (P1:ssä jo) + johda `taksonomia_dimensio` (D1–D5) tallennukseen (helpottaa
  reititystä + arviointi-syötettä). Ei muuta P1:n rakennetta. §26: pikakenttä-yhteenveto ennallaan.

## 6. Raja Arviointiin — miksi ei duplikoidu (kriittinen)
- **Pelihavainto = tapahtuma-anturi:** 1 tilanne, ADAR + 1 kohde, nopea, monta per pelaaja. Kirjaa "mitä näin nyt".
- **Arviointi = kooste-kojelauta:** koko 5D-taksonomia, monta lähdettä (🟢 mitattu > 🔵 havaittu > 👁 pelihavainto),
  → silta → teema. "Mikä on taso, mitä kehitetään."
- **Pelihavainto on yksi Arvioinnin kolmesta lähteestä.** P1.5 EI tuo 5D-ruudukkoa pelihavaintoon — se pysyy yhtenä
  havaintona. Näin valmentaja ei arvioi samaa kahdesti. (Ks. `docs/mockups/ph_vs_arviointi`.)

## 7. Rajaus (EI P1.5:ssä)
- **Koko 5D-arviointiruudukko pelihavaintoon** — EI; se on Arviointi.
- **Mitattavat kohteet dropdowniin** — EI (vain havaittavat).
- **AI / video** — myöhemmin.
- P2 (pelipaikka) ja P3 (joukkue) ovat omat vaiheensa; P1.5 koskee talteenoton kohde-valintaa + reititystä.

## 8. Verifiointi
- **Vitest:** dropdown-lista = havaittavat 48 (ei mitattavia), ryhmitys dimensioittain, D4 oletus · reititys: D4→Kartta A,
  D2→tmSiltaEhdota, D3/D5→kirjaus (ei teemaa) · arviointi-syöte kunnioittaa `taksonomia_valittu`-dimensiota.
- **Live Master:** Skenaario A/B/C läpi (peliäly-auto · D2 Pallonhallinta→V5-teema · D3 Johtajuus→kirjaus) →
  havainto näkyy Arvioinnissa oikeassa dimensiossa (yliajettavissa) → 0 konsolivirhettä.
- `npm test` + lint + selain. **Merge vasta kun Tero sanoo "live".** Branch `feat/pelihavainto-p1_5`.

## 9. Avoimet — TERO VALIDOI
1. **Arvo-mekaniikka ei-D4-kohteelle:** ADAR-johdettu (suositus: D2→Toteutus) vai valinnainen yksi 1–5 kiinnitetylle
   kohteelle? Ja **D3/D5**: laadullinen kirjaus ilman numeroa (suositus) vai valinnainen 1–5?
2. **D1-havaittava** (Tasapaino/Läsnäolo/Rohkeus): reititetäänkö V7-fyysiseen vai vain kirjaus?
3. **Sekvenssi:** P1.5 ennen P2/P3:a, niiden rinnalle, vai jälkeen? (Suositus: P1.5 rinnalla — se rikastaa talteenottoa
   jota P2/P3 muutenkin käyttävät.)
