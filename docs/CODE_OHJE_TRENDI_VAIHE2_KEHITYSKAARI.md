# CODE_OHJE — Trendi Vaihe 2: Yksilötrendi "Kehityskaari" (render)

**Tyyppi:** näyttö (ei uutta dataskeemaa) · **Kohteet:** `TalentMaster_VP_v25.html`,
`TalentMaster_Master_v16.html`, `TalentMaster_Pelaaja_v7.html` · **Base:** `main`.
**Design-referenssit:** `TRENDIT_JA_TASOT_KOLME_TASOA_v2.md` §2/§6/§8 · design-map `tm_trendit_design_map.html`
(yksilö-paneeli). **Riippuvuus:** selkäranka (Vaihe 1a #257 + 1b #260) tuotannossa — `hh_historia[]` /
`tki_historia[]` ovat jo pelaajadokumentissa.

## Tavoite

Täytä pelaajakortin **"Kehityskaari" (Taso 3 · Historia — nyt 'ei vielä historiaa')** mittausaikasarjalla.
Vastaa kysymykseen **"mihin suuntaan mennään"** (taso NYT on jo). Arvokkain käyttö: **sido trendi
jaksofokukseen** ("jakso oli Kiihdytys → 30m 1.84→1.78 ✓") — validoi tehosiko interventio.

**Laajuus: VAIN yksilötaso.** Joukkue (Vaihe 3) + seura (Vaihe 4) ovat eri briiffit — älä tee niitä tässä.

## Kanoniset periaatteet (design-doc §1/§7)

- **Taso + suunta aina pari.** Näytä sekä D-taso että suunta ↑↓→.
- **Suuntaa EI tallenneta** — luetaan renderissä per testi kanonisesta `pienempi_parempi`-lipusta
  (`Testaus_v9` `PROTOKOLLAT`; aikatesti: pienempi = parempi). Historia sisältää raa'at arvot.
- **Kehitysnopeutta EI tallenneta** — lasketaan renderissä **Δ / Δt** päivätyistä pisteistä (siksi jokaisella
  pisteellä on `pvm`). Näytä ⚡ Δ/kausi.
- **Tasot laskettava raaoista** — online-historiapisteet voivat olla ilman tallennettuja tasoja → laske taso
  kunkin pisteen raaka-arvosta + **ikä mittaushetkellä** + Eerikkilä-normit (käytä olemassa olevaa
  taso-laskentaa, esim. `tm_eerikkila_normit.js`). Kehityskaaren taso-trendi on oltava **johdonmukainen
  kortin nykyisen tason kanssa**.
- **Eerikkilä taso 3 = mittatikku** (§29). **§28:** pre-PHV fyysinen näyttää **suunnan, ei rankaisua**
  (ei "heikko" -leimaa ennen kasvupyrähdystä).

## Työ

### 1. Kehityskaari-render (Valmentaja/VP — täysi) — VP_v25 + Master_v16 pelaajakortti
Lue `p.hh_historia[]` (+ `p.tki_historia[]`). Renderöi:
- **Per-testi-sparkline** vain mitatuista avaimista (§26): 30m/10m/CMJ/MAS/ketteryys/suunnanmuutos (H-H) +
  TKI per-laji. Testijoukko-agnostinen — näytä ne avaimet joita historiassa on.
- **Suunta ↑↓→** per testi `pienempi_parempi`-lipusta (aikatesti: arvo laskee = ↑ parempi).
- **⚡ Kehitysnopeus** Δ/kausi (laske uusin − vanhin / Δt vuosina/kausina). Esim. "30m ⚡ −0.42 s/kausi".
- **Per-D taso-trendi** raaoista laskettuna (D1 Fyysinen, D2 Tekninen) — sparkline tai taso-nuoli.
- **Jaksofokus-sidos (tärkein):** overlay `jaksofokus_historia`-jaksot aikajanalle → "Jakso: Kiihdytys
  (helmi–maalis) · 30m 1.84→1.78 ✓". Käytä **olemassa olevaa `jaksofokus_historia`:aa** (arkistoituu jo
  `_vpJfArkistoiVaihdossa`:lla) — ÄLÄ luo `interventio_historia`:aa.
- **Kattavuus:** jos < 2 pistettä → "Kehityskaari täyttyy kun mittauksia on ≥2" (ei tyhjää/harhaanjohtavaa).

### 2. Pelaajanäkymä (Pelaaja_v7) — §7.22 kannustava
Sama data, **kannustava kehystys** (kuten Malli A #267): "📈 Kehityit — 30m nopeutui" · kehityskaista/suunta,
**EI kovia lukuja/normivertailua** pelaajalle. Ei jaksofokus-teknistä analyysiä; pelaajalle "olet kehittynyt
tässä". §28: pre-PHV vain positiivinen suunta.

### 3. Ei kirjoitusta, ei skeemaa
Vaihe 2 on **puhdas render** olemassa olevasta `hh_historia`/`tki_historia`:sta. Ei uusia pikakenttiä, ei
kirjoitusta, ei `interventio_historia`:aa (käytä `jaksofokus_historia`).

## Reunaehdot

- **Vain yksilötaso.** Ei joukkue-/seura-aggregaatteja (Vaihe 3/4).
- **§7.22:** pelaajalle vain kannustava, ei kovia lukuja. **§28:** pre-PHV suunta, ei rankaisu.
- **Testijoukko-agnostinen:** näytä mitatut avaimet (Sibbo: ketteryys+30m · SJK: 10m/30m/CMJ/suunnanmuutos).
- **Suunta + kehitysnopeus renderissä** (`pienempi_parempi`, Δ/Δt) — ei tallenneta. **Tasot raaoista.**
- **Design-lukko + molemmat teemat** (design-map yksilö-paneeli referenssinä). Sparkline hiusviivoin, teal-aksentti.
- **Oikeiden alaikäisten data:** render on **read-only** → L3 voi käyttää oikeaa pelaajaa jolla on historiaa
  (esim. **Aleksi Rajala / Sibbo**, 4 pistettä: 30m 6.18/5.72/5.33/5.38, ketteryys 8.21/7.71/7.60/7.34) — ei
  kirjoituksia, ei GDPR-ongelmaa. Topias/KPV jos hänellä on historiaa.
- **`?v=`-bump** muutettuihin appeihin jos jaettua libiä käytetään.

## Definition of Done

- **L1:** Kehityskaari-render (VP + Master): per-testi-sparkline (mitatut avaimet), suunta `pienempi_parempi`:stä,
  ⚡ kehitysnopeus Δ/kausi, per-D taso-trendi **raaoista laskettuna**, jaksofokus-sidos (`jaksofokus_historia`),
  kattavuus-fallback (<2 pistettä). Pelaaja_v7: §7.22 kannustava versio. Ei kirjoitusta/skeemaa.
- **L2:** vitest render-apufunktioille: suunta `pienempi_parempi`:stä (aikatesti pienempi=parempi),
  kehitysnopeus Δ/Δt päivätyistä pisteistä, taso raaka-arvosta+iästä (johdonmukainen kortin kanssa),
  testijoukko-agnostisuus (vain mitatut avaimet). ~842+ vihreä.
- **L3 (elävä, molemmat teemat):**
  - Aleksi Rajala (Sibbo, read-only): Kehityskaari näyttää 30m-sparklinen (6.18→5.72→5.33→5.38) suunnalla ↑
    (paranee) + kehitysnopeus + ketteryys-sparkline; jaksofokus-sidos näkyy jos jaksoja on.
  - Pelaaja jolla < 2 pistettä → kattavuus-fallback (ei tyhjää).
  - Pelaajanäkymä: kannustava kehystys, ei kovia lukuja (§7.22).
- Verifioi elävänä; pieni PR (render, ei dataa). Lataa näkymät uudelleen deployn jälkeen.

## Jäljellä ketjussa (erilliset briiffit)
- **Vaihe 3 — Joukkuetrendi:** aggregaatti + jakauma-histogrammi + kattavuus (kausi,joukkue)-sidottu.
- **Vaihe 4 — Seuratrendi:** HeadOfTalent/SportDirector — ikäluokka-prosessimittari + north-star-KPI (ei
  valmentaja-rankingia).
