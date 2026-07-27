# CODE_OHJE — Vaihe B: Ristiinarvio (multi-rater) + riippumattomuus-suojaus

**Tyyppi:** ominaisuus (data + näyttö + UI-gate) · **Kohteet:** ADAR-pikakortti-tallennus,
`TalentMaster_Master_v16.html` (paivitaAdarPikakentat + §C), `TalentMaster_VP_v25.html` (arviointi + entry),
`lib/tm_pelialy_yksilo.js` · **Base:** `main`.
**Design-referenssi:** `tm_vp_seuranta_v2.html` (paneeli 2 · Ristiinarvio).
**Riippuvuus:** Vaihe A (#270, talenttivalmentajan kirjoitusoikeus) mergettynä.
**Benchmark:** ≥2 riippumatonta arvioijaa, käyttäytymisankkurit, riippumaton pisteytys (Frontiers 2018).

## Tavoite

Useampi arvioija (valmentaja + VP + talenttivalmentaja) voi arvioida saman pelaajan pelihavainnon.
Pelaajakortti näyttää arvioijat + yhtenevyyden. Arvioija **ei näe muiden pisteitä ennen omaa tallennusta**
(anti-anchoring). Vahva ristiinarvio = peruste talenttinostolle. **Ei koske pelaajanäkymää (§7.22).**

## Kanoni: mikä on D4 kun arvioijia on monta?

**Konsensus, ei "viimeisin voittaa".** `adar_viimeisin.yht` = **§4-ikäportitettu keskiarvo arvioijien
VIIMEISIMMISTÄ havainnoista** (kukin arvioija painaa kerran, uusin per arvioija). Tämä on ainoa kanoninen
D4-luku (yksi lähde, kuten #267) — nyt vain koostettuna usean silmän yli. *(Tämä on Vaiheen B keskeinen
suunnittelupäätös — VAHVISTA Terolta ellei OK. Kevyempi vaihtoehto: pidä yht = viimeisin yksittäinen havainto
ja näytä arvioijat vain listana — mutta silloin VP:n/talenttivalmentajan arvio ei liikuta D4:ää → heikentää
"useampi silmä → parempi D4" -ideaa. Suositus: konsensus.)*

## Työ

### 1. Arvioijan identiteetti havaintoon (ADAR-pikakortti `saveCard`)
Havainto tallentaa jo `tekija_uid` / `tekija_nimi`. **Lisää `tekija_rooli`** (`valmentaja` | `vp` |
`talenttivalmentaja`) tallennettuun havaintoon (näyttöä + talenttiperustetta varten).

### 2. Koostus per arvioija (`paivitaAdarPikakentat`, Master ~9250)
Nyt: `viim10 = havainnot.slice(0,10)`; `v0 = viim10[0]`; yht v0:sta. **Muuta konsensukseksi:**
- Ryhmittele `havainnot` arvioijan (`tekija_uid`) mukaan → ota **kunkin arvioijan uusin** havainto.
- Uusi pikakenttä `adar_arvioijat`: `[{ uid, nimi, rooli, pisteet:{a,d,ac,r}, pvm }]` (arvioijien uusimmat).
- Per dim (a/d/ac/r): keskiarvo arvioijien yli → `adar_dim_konsensus`.
- `adar_viimeisin.yht` = `tmAdarYht(konsensus-dimit, ika)` (**§4-ikäportitus säilyy**, `lib/tm_pelialy_yksilo.js`).
- `adar_arvioijia` = arvioijien lkm (uniikki uid). `adar_yhtenevyys` = hajonta per dim (esim. max−min tai
  keskihajonta) → "korkea/keskiverto/matala yhtenevyys".
- Säilytä `adar_havaintoja` (kokonaismäärä) + `adar_vahvin`/`adar_heikoin` (nyt konsensuksesta).

### 3. Riippumattomuus-suojaus (anti-anchoring) — ADAR-pikakortti + kortin ristiinarvio-lohko
- Kun arvioija **avaa** pelaajan ADAR-arvion: **piilota muiden arvioijien pisteet + `adar_arvioijat`** kunnes
  nykyinen `uid` on tallentanut OMAN havaintonsa **tälle arviointikierrokselle**.
- **Kierros/ikkuna (VAHVISTA):** suositus = kalenterikuukausi (tai avoin IDP-jakso). "On jo arvioinut tässä
  ikkunassa" → näytä kaikki + yhtenevyys. Ei vielä → näytä lukko: "🔒 Arvioi ensin — näet muiden arviot
  tallennuksen jälkeen."
- Toteuta gate datassa/renderissä (ei pelkkä CSS-piilotus — arvot eivät saa vuotaa DOMiin ennen omaa
  tallennusta).

### 4. Ristiinarvio-lohko kortilla — VAIN Master §C + VP-arviointi (EI pelaaja)
Design-map v2 paneeli 2:n mukaan:
- Arvioijalista: nimi + rooli-merkki + dimit (A/D/Act[/R]). §4-bonus (ikätason yli) säilyy #267:n logiikalla.
- **Yhtenevyys-rivi:** "🤝 Yhtenevyys korkea — Havainnointi yksimielinen, Päätöksenteko hajoaa" (per-dim
  hajonnasta). Design-lukko + molemmat teemat.
- **Talenttinosto-signaali:** kun `adar_arvioijia ≥ 2` + yhtenevyys korkea (+ korkeat pisteet) → näytä
  pehmeä peruste "💎 Vahva ristiinarvio — peruste talenttinostolle" + "Ehdota"-toiminto joka kytkeytyy
  olemassa olevaan talenttiohjelma-/signaalilogiikkaan (`talenttiOhjelma`/talent-signaalit). **Ei uutta
  kovaa promootioporttia** tässä vaiheessa — signaali + ehdotus (VP päättää).

### 5. Entry point VP:lle/talenttivalmentajalle
VP/talenttivalmentaja tarvitsee tavan **avata ADAR-pikakortti** pelaajalle (nyt reitti on Valmentaja-apista).
Lisää "➕ Lisää pelihavainto" -toiminto pelaajanäkymään (VP_v25 pelaajakortti + Master), joka avaa saman
ADAR-pikakortin. Permissio hoituu #270:llä.

## Reunaehdot

- **Pelaaja (§7.22):** pelaaja EI näe arvioijia/ristiinarviota — pelaajan Malli A -näkymä (#267) ennallaan.
  Riippumattomuus-suojaus koskee vain arvioivia rooleja.
- **§4-ikäportitus säilyy** (yht konsensus band-dimeistä). `lib/tm_pelialy_yksilo.js` `tmAdarYht` uudelleen.
- **Ei hard-deletea** havaintoihin (audit; §-linja). Arvioija voi korvata OMAN uusimman (uusi havainto → upsert).
- **Design-lukko + molemmat teemat** (map v2). Ristiinarvio vain valmentaja/VP-näkymissä.
- **Oikeiden alaikäisten data:** L3 vain Topias (KPV, sanktioitu). Ristiinarvio-testi: kaksi eri arvioija-uid:tä
  Topiakselle.
- **`?v=`-bump** muutettuihin appeihin/libiin.

## Definition of Done

- **L1:** `tekija_rooli` tallennukseen; `paivitaAdarPikakentat` konsensuskoostus (per-arvioija-uusin,
  `adar_arvioijat`/`adar_arvioijia`/`adar_yhtenevyys`, yht = §4-konsensus); riippumattomuus-gate pikakortissa;
  ristiinarvio-lohko Master §C + VP-arviointi; talenttinosto-signaali; VP/talenttivalmentaja entry point.
- **L2 (vitest):** konsensuskoostus (per-arvioija-uusin, §4-ikäportitettu keskiarvo, yhtenevyys/hajonta);
  riippumattomuus-gaten logiikka (ennen omaa tallennusta ei muiden dataa). ~811+ vihreä.
- **L3 (elävä, Topias/KPV, molemmat teemat):**
  - Kaksi arvioijaa (valmentaja + VP-testi) arvioivat Topiaksen **itsenäisesti** → ennen VP:n tallennusta VP
    EI näe valmentajan pisteitä (lukko); tallennuksen jälkeen kortti näyttää **2 arvioijaa + yhtenevyyden +
    konsensus-yht**; radar D4 = konsensus (§4).
  - Pelaajanäkymä ennallaan (ei arvioijia, Malli A).
  - Talenttinosto-signaali näkyy kun yhtenevyys korkea.
- Verifioi elävänä ennen mergeä; lataa näkymät uudelleen deployn jälkeen.

## Jäljellä ketjussa
- **Vaihe C — VP-seurantanäkymä** (IDP-aktivoinnit-feed + aktiivisuus + hiljaisuus-hälytys + VP-kuittaus).
- **Trendi Vaihe 2** (Kehityskaari).
