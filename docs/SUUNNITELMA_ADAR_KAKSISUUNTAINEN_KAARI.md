# Suunnitelma — ADAR-kaari kaksisuuntaisena: pelaajan peliäly + valmennusosaamisen kehittyminen (kalibraatio VP:n kanssa)

> **Teron laajennus:** ADAR-historia tarvitaan **kahdelle eri henkilölle eri tarkoituksessa:**
> **(1) Pelaajalle** = miten peliäly kehittyy ajassa (D4).
> **(2) Valmentajalle** = miten **valmentajan oma pelihavainto-osaaminen** kehittyy ajassa (valmennusosaamisen kehittäminen, CPD) — ja miten
> se **kalibroituu VP:n näkemyksen kanssa**. Sama Kehityskaari-komponentti, mutta "kehittyvä henkilö" on eri: kerran pelaaja, kerran valmentaja.
> **Perusta on jo olemassa** (varmistettu koodista): `tmAdarKonsensus(havainnot, ikä)` tuottaa monen arvioijan konsensuksen + **`yhtenevyysTaso`**
> (korkea/keskiverto/matala = arvioijien samanmielisyys). D3-kalibraatio (itse×valmentaja×VP) + `renderKalib` olemassa. **Puuttuu vain AIKA-ulottuvuus.**

---

## 0. Yksi oivallus: kaksi kaarta, sama komponentti
| Kaari | Kehittyvä henkilö | "Ominaisuus" ajassa | Kenelle näkyy | Datalähde |
|---|---|---|---|---|
| **A — Peliäly-kaari** | Pelaaja | ADAR-dimensiot A/D/Ac/R konsensuksena | Pelaaja (§7.22 kannustava) + VP/valmentaja (täysi) | pelihavainnot (raakadata, on jo) |
| **B — Valmennusosaamisen kaari** | Valmentaja | (B1) havaintokattavuus · (B2) kalibraatio-poikkeama VP:hen | Valmentaja itse (CPD) + VP (oversight/mentorointi) | samat havainnot + arvioijan rooli |

**ADAR-havainto sisältää jo:** arvioija (uid + `tekija_rooli`), `pisteet {a,d,ac,r}`, `luotu/pvm`, pelaaja. → molemmat kaaret **johdetaan
samasta raakadatasta**, ei uutta kirjausta havaintohetkellä.

---

## 1. TRACK A — Pelaajan peliäly-kaari (D4 ajassa)

- **Johda, älä snapshotoi (V1):** uusi pure-fn `tmAdarKaari(havainnot, ikä)` → aikajärjestetyt konsensuspisteet per dimensio.
  Bucketoi havainnot ajassa (esim. per katselmusjakso / liukuva 30 pv) → kukin bucket `tmAdarKonsensus`:n läpi → **4 dimensiotrendiä** (A/D/Ac/R).
  (Snapshot `adar_historia[]` katselmuksen sulkuhetkellä vasta jos suorituskyky vaatii — ei V1:ssä.)
- **Render:** KISS `tmKehityskaari` `ominaisuus='adar'`. **Päätös (koodin oma TODO):** dimensiot **komponentin sisään** (`data.dimensiot:{a,d,ac,r historiat}`)
  → yksi kortti, 4 mini-trendiä (design-kartan K2). *Suositus: (b) palkit/mini-trendit sisään* — pitää ADARin yhtenä korttina, ei neljää erillistä.
- **Vartijat:** **§28** (U11-kynnys ≠ U16 → vertaa saman ikävaiheen sisällä; konsensus ikäportittaa jo) · **datataso** (≥2 havaintokierrosta → suunta) ·
  **§7.22** (pelaajalle: oma dimensiokohtainen kasvu kannustavasti, EI arvioijien nimiä, EI vertailua muihin, EI konsensuslukua rankingina).
- **Sijoittelu:** Arviointi/Mittaus (VP täysi dimensioittain) + Pelaaja-kortti (§7.22: "Havaintosi pelistä paranee — huomaat tilanteet aiemmin").

## 2. TRACK B — Valmennusosaamisen kaari (valmentaja kehittyvänä)

Valmentaja on **oppija**, jolla on oma kaari. Kaksi mittaria ajassa, per valmentaja:

**B1 — Havaintokattavuus (aktiivisuus):** montako havaintoa · monestako pelaajasta · montako dimensiota · ajassa.
→ kasvava käyrä = valmentaja rakentaa **systemaattisen havainnoinnin tavan**. (CPD-sitoutuminen, ei laatuarvio.)

**B2 — Kalibraatio-poikkeama VP:hen (ydin):** kullekin valmentajan havainnolle vertaa **VP:n arvio** samasta pelaajasta+dimensiosta+ajankohdasta
→ `|valmentaja − VP|`. Seuraa **keskipoikkeaman kehitystä ajassa** per valmentaja.
→ **kaventuva poikkeama = valmentajan silmä kalibroituu asiantuntijanäkemykseen.** Reuse `yhtenevyys`/`yhtenevyysTaso` (`tmAdarKonsensus`), mutta **pitkittäisenä**.

- **Kalibraatioankkuri (päätös):** vertaa **VP:hen** (oversight-asiantuntija) kun VP:n arvio on; **monen valmentajan konsensukseen** kun VP:tä ei ole.
  *Suositus: VP-ankkuri ensisijainen, konsensus fallback.*
- **Etiikka (tärkeä):** tämä on **aikuisen ammatillista kehittymisdataa** (valmentaja), EI alaikäisen dataa → eri GDPR-asento kuin pelaajalla.
  Kehystä **kehittävästi, ei rankaisevasti:** poikkeama ≠ "valmentaja väärässä" (VP voikin olla väärässä) → se on **kalibraatiokeskustelu**, kuten
  pelaajan "ennallaan ei ole epäonnistuminen". §37 roolit: valmentaja näkee **oman** kaarensa (itse-CPD); VP näkee sen **oversightina** (OPAS 1.3
  "havainnoi, kalibroi, mentoroi").
- **Sijoittelu:**
  - **Valmentajalle:** oma CPD-näkymä (Itsearvio/reflektio/CPD, OPAS 2.1) — "Näin pelihavaintosi kehittyy · kalibraatio VP:hen kaventuu".
  - **VP:lle:** Kalibraatio-cockpit (`renderKalib` / Valmentajien johtaminen) — per-valmentaja kalibraatiotrendi mentoroinnin pohjaksi.

## 3. Yhteinen komponentti
Sama `tmKehityskaari`. Pelaajalle: "ominaisuus" = peliäly-dimensiot. Valmentajalle: "ominaisuus" = kalibraatiopoikkeama (pienempi_parempi=true,
kaventuva = paraneva) + kattavuus. → **valmentaja ON kehittyvä henkilö omalla kaarellaan.** Elegantti yhdistys, ei uutta komponenttia.

---

## 4. Datamalli — mitä tarvitaan
- **Pelihavainto-record (on jo):** `{ arvioija_uid, tekija_rooli, pelaaja_id, pisteet:{a,d,ac,r}, luotu, pvm }`. **Riittää molempiin kaariin.**
  - *Ainoa tarkistettava:* onko `tekija_rooli` (valmentaja/VP) ja `arvioija_uid` tallessa **jokaisessa** havainnossa (B2 vaatii). Jos ei → pieni skeeman täydennys (ilmoitetaan).
- **Ei uutta kirjoitusta havaintohetkellä** (johdetaan). Snapshot vasta jos perf vaatii.

## 5. Avoimet päätökset (sinulle)
1. **Render-tapa ADARille:** dimensiot komponentin sisään (`data.dimensiot`) vai 4 erillistä kutsua? *Suositus: sisään (yksi kortti).*
2. **Kalibraatioankkuri B2:** VP ensisijainen + konsensus fallback? *Suositus: kyllä.*
3. **Valmennusosaamisen näkyvyys:** valmentaja-itse + VP-oversight, kehittävä kehys? *Suositus: kyllä.*
4. **Johda vs snapshot:** V1 johdettu raakadatasta? *Suositus: kyllä (snapshot myöhemmin jos tarve).*

## 6. Briffijako (kun päätökset vahvistettu)
- **K5a — Pelaajan peliäly-kaari:** `tmAdarKaari` (johda konsensuksesta) + ADAR-dim render `tmKehityskaari`:in + §7.22 pelaaja-variantti + §28.
- **K5b — Valmennusosaamisen kaari:** B1 kattavuus + B2 kalibraatiotrendi (VP-ankkuri) + valmentajan CPD-näkymä + VP:n kalibraatio-cockpit (`renderKalib`). Aikuisdata/§37-kehys.
- (Molemmat reuse `tmAdarKonsensus` + `tmKehityskaari`; K5b tarkistaa `tekija_rooli`/`arvioija_uid`-kattavuuden havainnoissa.)
