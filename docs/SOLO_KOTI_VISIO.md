# Solo-kotinäkymä — visio + vaiheistus ("terve pelillisyys")

> Laadittu 2026-06-25. Solo Player™ -kotinäkymä = pelaajan päivittäinen koti + retentiomoottori (P2).
> Periaate: **koukuttava mutta TERVE peli** — itsevertailu + sisäinen mestaruus + identiteetin kasvu,
> EI tulostauluja / loss-aversionia / pay-to-winia / vertailua muihin (§7.22 + Sisukas-filosofia).
> Täydentää: KORTTI_VISIO/KATALOGI (§36), SOLO_KAUPALLISTAMINEN (P2), CLAUDE.md §14/§16/§22/§28/§A7.

---

## 0. Filosofia — rajoite on supervoima
Useimmat lasten urheiluapit kopioivat myrkyllisen pelilogiikan (tulostaulut = vertailuahdistus,
loss-aversion-putket, pay-to-win, XP-grindi). §7.22 kieltää nämä → **rakennamme terveen pelin:**
itsevertailu, mestaruus, identiteetti. Markkinointiviesti vanhemmalle: *"jalkapalloapp joka ei ahdista lasta."*
Sekä eettinen valinta että myyntivaltti — kilpailijat eivät tee tätä.

**Ehdottomat invariantit:** ei vertailua muihin · ei percentiiliä/rankingia lapselle · ei XP-palkkia/loss-aversionia
(§22) · liekki ei nollu (lepopäivä himmentää) · AI puhuu vain virstanpylväissä (§21/§7.22) · OVR = oma kasvava luku,
ei vertailu.

---

## 1. Ydinsilmukka (miksi palaa päivittäin)
Avaa app → kortti + **elävä liekki** → tee **päivän 1–2 tehtävää** (tyydyttävä kuittaus + satunnainen yllätys) →
liekki kasvaa → ajoittain **ansaitset merkin/kortin (pack-opening)** → kortti nousee hitaasti → **countdown
seuraavaan mittaukseen** (iso paljastus) → toista. Habit loop (Duhigg) + terve variable reward (Eyal ilman myrkkyä).

---

## 2. Mekaniikat (kaikki §-pohjaisia)

| # | Mekaniikka | Idea | §-pohja | Faasi |
|---|---|---|---|---|
| 1 | **Tavoitekortti (future-self)** | "Tällainen voit olla" -kortti (potentiaali), jota kuroot umpeen. Itsevertailu, ei muihin. **Erottava ydin.** | §28 kehitysikkunat/RAE | **Pian** (v1 teaser) |
| 2 | **3 kk -mittaus = seremonia** | Countdown → before/after-paljastus mittauspäivänä. Metodologian tärkein hetki pelinä. | §25 kotimittarit | **v1** (countdown) + Pian (seremonia) |
| 3 | **Pack-opening** | Ansaittu merkki/kortti/PB → paljastusanimaatio. Terve variable reward. | §36 Vaihe 4 | **v1** (mikro) + Pian (täysi) |
| 4 | **Arkkityyppi-identiteetti** | "Kuka ammattilainen sinussa on?" Maestro/Railgun/Shadowstep/Titan/**Sisukas**. Tulet joksikin. | §14 profiilit, §36 legendat | Pian |
| 5 | **"Ammattilaisen tapa tänään"** | Päivän tehtävä pro-kehyksessä (anonyymi/arkkityyppi, ei IP). Brändin tagline pelinä. | tagline + §A7 | Pian |
| 6 | **Liekki elävänä** | Taimi/liekki/hahmo jota hoivaat (kasvaa kun palaat), ei "älä menetä". | §22 streak 4-tila | **v1** |
| 7 | **Polut/quests** | Teemajaksot ("Kuljetusmestarin polku" 2 vk → merkki+kortti). Skill-tree-mäinen. | §A7, §36 | Myöhemmin |
| 8 | **Companion/mentori (AI)** | Ystävällinen hahmo, puhuu VAIN virstanpylväissä. Ei nalkuta. | §21 AI-agentti | Myöhemmin |
| 9 | **Kortti elää + kustomointi** | Kehys Starter→Sharp→Elite, valitse idoli/arkkityyppi, avaa värejä. Omistajuus. | §36 | Myöhemmin |
| 10 | **Jaa ylpeydellä** | "Näytä kortti perheelle." Club-bridge → "virallinen kortti" -paljastus. Ei ranking. | club-bridge | Pian (jako) / Myöhemmin (bridge) |

**Tappajakolmikko (suurin erottava arvo):** #1 tavoitekortti · #2 mittausseremonia · #3 pack-opening.

---

## 3. Vaiheistus

### Solo-koti v1 (rakennetaan nyt — korvaa pikakorjauksen Kortti_Demo-landingin)
- Tervehdys + **elävä liekki** (#6, §22 4-tila)
- **Korttihero:** OVR (positiivinen, ei vertailu) + tier + pelipaikka + 3 statia → tap = täysi kortti
- **Tavoitekortti-teaser (#1 v1-lite):** "Potentiaalisi rakentuu — tee tehtäviä ja mittauksia" + himmeä tavoite-OVR
- **Mittaus-countdown (#2 v1):** "X päivää seuraavaan mittaukseen" (`kotiPvm` + 3 kk)
- **Tänään:** 1–2 tehtävää (T tekniikka joka päivä + S kehityskohde; yleinen ennen alkukartoitusta, personoitu jälkeen §A7) + "Tein ✓" → kirjaus
- **Keräily-strip (#3 mikro):** ansaitut merkit/ennätykset + lukitut (§36) + "Katso kaikki"; uusi merkki → pieni paljastus
- **Pikalinkit:** alkukartoitus · kotimittarit (3 kk)
- **Alanavigointi:** Koti · Treeni · Kortti · Profiili

### Pian (v1:n päälle)
- Tavoitekortti täytenä (#1 — RAE/kehitysikkuna-johdettu potentiaali, "matka" kuroutuu)
- 3 kk -seremonia (#2 — countdown-huipennus + before/after-reveal)
- Pack-opening täytenä (#3 — paljastusanimaatio)
- Arkkityyppi-paljastus (#4) + "Ammattilaisen tapa tänään" (#5) + kortin jako (#10)

### Myöhemmin
- Polut/quests (#7) · Companion-AI (#8) · kortin kustomointi (#9) · club-bridge-paljastus (#10)

---

## 4. v1 -tietomalli (§26 pikakentät, olemassa olevasta Solo-mallista)
- `players/{id}`: `kortti_taso`, johdettu OVR + statsit (deterministinen baseline §28-lattia), `streak` (§22),
  `ennatykset` (§36 1.5), `kotiPvm` (countdown), vahvuus/kehityskohde (Tänään-personointi).
- **Tänään-tehtävät:** ennen alkukartoitusta yleiset ikätasoiset (T joka päivä); jälkeen `harjoitelogiikka_v4.js`
  (§A7) heikoimpaan FLEI-ketjuun. Kirjaus → `players/{id}/kirjaukset/{pvm}` (sama kuin klubi).
- **Tavoite-OVR (v1-teaser):** yksinkertainen potentiaali = baseline + ikäpohjainen headroom; täysi RAE/ikkuna-johto Pian.
- Renderöinti pikakentistä (ei alikokoelmakyselyä kotinäkymässä).

## 5. Invariantit (v1+)
- **§7.22:** ei vertailua muihin, ei numeropainetta, ei loss-aversionia. OVR + tavoite-OVR = **oma** matka.
- **§22:** liekki 4-tila positiivinen, ei nollu. Ei XP-palkkia lapselle.
- **§36:** keräily = oma matka, pack-opening = ilo (ei gacha/maksu).
- **§A7:** Tänään-tehtävät generaattorista; lataa `harjoitelogiikka_v4.js` Pagesista (ei inline-kopio).
- **§16:** ikävaihe-sävy (leikkijä yksinkertaisin) — mutta Solo näyttää OVR:n kaikille (B2C-koukku, positiivinen).
- Player™ B2C -brändi: kulta-aksentti (ei klubin teal), tumma Carbon.
