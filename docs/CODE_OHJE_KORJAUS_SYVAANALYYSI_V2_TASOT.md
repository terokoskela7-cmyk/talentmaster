# CODE_OHJE — Syväanalyysi v2: taso-asteikkojen selkeys + layout + §28 per-testi-näyttö

**Tyyppi:** näyttökorjaus (ei dataskeemaa) · **Kohteet:** `TalentMaster_VP_v25.html`
(`_jsvPerLajiHTML`), `TalentMaster_Master_v16.html` (tkLajiGapit-lohko + kutsuu libiä),
`lib/tm_eerikkila_normit.js` (`renderKehityskorttiHTML`). **Base:** `main`. **Pieni PR.**
**Jatko #278:lle** — kolme Teron livehavaintoa jotka #278 jätti kesken tai teki väärin.

Tämä korjaa **väärän selitteen jonka #278 lisäsi** (minun briiffini virhe — pahoittelut),
**layoutin joka on yhä sekava**, ja **§28-päätöksen** (Tero: näytä taso aina harmaa + 🌱).

---

## TAUSTA — kaksi eri taso-asteikkoa, jotka #278 sekoitti

Koodissa on **kaksi eri tekniikka-asteikkoa** (vahvistettu `tm_eerikkila_normit.js`):
- **Eerikkilä-lajitekniikka = 1–3** (`asteikko:3`, rivit 201–222; "taso 3 ≈ valtakunnan kärki").
- **TK-lajitaso = 1–5** = **kilpailukohortti** (`TM_SELITTEET.tk_lajitaso`, rivi 477): *"1–5
  kilpailukohorttia vasten (2023–25, 3 477 pelaajaa): taso 3 = kisaajien keskitaso, taso 5 =
  paras 20 %. Otos = kilpailuihin osallistuneet — **ei väestönormi**."*
- **Fyysinen = 1–5** (Eerikkilä).

Syväanalyysin `T`-merkki on **TK-lajitaso (1–5, kilpailukohortti)** — EI Eerikkilä. #278:n lisäämä
selite *"T = Eerikkilä-taso 1–5"* on **väärä kahdesti**: (1) se ei ole Eerikkilä, (2) Eerikkilän
tekniikka-asteikko on 1–3, joten "Eerikkilä 1–5" on ristiriita. Juuri tämä hämmensi.

---

## OSA A — VP + Master Syväanalyysi: oikea selite + luettava layout

**Kohde:** `VP_v25` `_jsvPerLajiHTML` (~7265) · `Master_v16` tkLajiGapit-lohko (~5140).

### A.1 — Korjaa selite (T = TK-lajitaso, ei Eerikkilä)
Nykyinen (#278) VP-selite:
```
T = Eerikkilä-taso 1–5 (valtakunnallinen, eri asteikko)   ← VÄÄRIN
```
Korjaa muotoon (käytä `TM_SELITTEET.tk_lajitaso`-sanastoa, älä keksi omaa):
```
+s = ero alueelliseen huipputasoon (★ saavutettu · 🟡 ≤20 % · 🔴 >20 %)
T = TK-lajitaso 1–5 · kilpailukohortti 2023–25 (ei väestönormi; 3 = keskitaso, 5 = paras 20 %)
```
- **Älä** kutsu TK-lajitasoa Eerikkiläksi missään selitteessä.
- Master: sama korjaus Masterin omaan selitteeseen (jos siinä lukee "Eerikkilä 1–5", vaihda
  "TK-lajitaso 1–5 · kilpailukohortti"). `_vpSelTip('tk_lajitaso')`-tooltip on jo oikein — selitteen
  tekstin tulee vastata sitä.

### A.2 — Layout: rivi on yhä sekava ("kaikki tekstit peräkkäin")
Nykyrivi tunkee yhdelle flex-riville: `laji96 + arvo56 + viite84 + palkki + gap48 + T-merkki` →
kapeassa modaalissa (~340–390px) sarakkeet puristuvat kiinni ja luetaan yhteen juoksevana
("Ponnauttelu40shyvä ≤21.1s+18.9s←T1"). #278:n gap-levennys ei riittänyt — **tarvitaan
rakenteellinen kaksirivinen layout**, ei sarakeleveyksien hienosäätöä.

**Käytä samaa wrap-turvallista mallia joka on jo `renderKehityskorttiHTML`:ssa** (badge oikealle
`margin-left:auto`, toissijainen tieto omalle rivilleen `order:3;flex:1 1 100%`). Per laji:

```
  Ponnauttelu            40 s              [T1]      ← rivi 1: laji · arvo (Cormorant/mono) · T-merkki oikealle
  huipputaso ≤21.1s · +18.9s ←                       ← rivi 2: viite + gap (himmeä, pieni), gap-väri + ←-kohdemerkki
```

- **Rivi 1:** lajin nimi (vasen) · raaka-arvo (`.jsv-an-ka`, korostettu, Cormorant tai DM Mono) ·
  **T-merkki oikeaan reunaan** (`margin-left:auto`).
- **Rivi 2:** `huipputaso ≤X · +gap` **yhtenä himmeänä (ink3, 10px) rivinä** badgen alla — gap-luku
  saa värin (🟡/🔴/★) ja `←`-kohdemerkin. Ei kilpaile arvon kanssa.
- **Poista tunkeva inline-palkki** (`.jsv-an-bar`/`.jsv-an-fill`) rivin keskeltä — se on pääsyy
  ahtauteen. (Halutessasi ohut koko rivin alle jäävä hiusviiva-täyttö, mutta ei sarakkeena.)
- Design-lukko: hiusviivat rivien väliin, teal-aksentti, DM Mono luvuille, ei täyttövärejä.
  **Molemmat teemat.** Sama uusi layout sekä VP:hen että Masteriin.

**Rajaus:** laskenta (gap/gapPct/tkTaso) ennallaan — vain selite + asettelu. Pelaaja-appiin ei kosketa.

---

## OSA B — Kehityskortti (`renderKehityskorttiHTML`): §28 per-testi-taso näkyviin

**Kohde:** `lib/tm_eerikkila_normit.js` `renderKehityskorttiHTML` (~1490). Kutsujat: **VP + Master**
(Pelaaja_v7 EI kutsu tätä → §7.22 turvassa, varmistettu).

### Tausta (Teron havainto + aiempi korjaus)
Kortti näyttää nyt pre-PHV-fyysiselle: **"30 m 4.94 s 🌱 ei vielä arvioida"** — taso piilotetaan.
Tämä on ristiriidassa aiemman **KYPSYYS-korjauksen** (`CODE_OHJE_KYPSYYS_LUKU_NAKYVIIN.md`) kanssa,
jossa päätettiin: *"kun pelaajalla on 🌱, tulos/taso näytetään silti valmentajalle — 🌱 jää
kontekstimerkiksi, ei piilota lukua."* Se korjaus vietiin radariin/rosteriin/detaljiruutuihin, mutta
**per-testi-kehityskortti jäi näyttämään "ei vielä arvioida"**.

Nyk. logiikka (`perTestTasot`, rivit 1387–1392) erottaa: PHV puuttuu & **ika ≥ 13 → `oletus`**
(taso + amber "ikäoletus"-tagi — tämä on OK, säilyy); mutta **ika ≤ 12 / mitattu pre-PHV →
`neutraali` → "ei vielä arvioida"** (taso piiloon).

### Teron päätös (§28): näytä taso AINA (harmaa + 🌱)
Yhtenäistä KYPSYYS-korjauksen kanssa. `neutraali`-fyysiselle:
- **Näytä taso-merkki (`N / asteikko`) himmennettynä (ink3-harmaa) + 🌱** — EI enää "ei vielä
  arvioida". 🌱 = "kypsyys huomioitu, ei rankaise".
- **§28 säilyy sisällössä:** taso ei koskaan punainen `neutraali`-tilassa (aina ink3-harmaa), EI
  gap-vihjettä ("→ taso N+1"), EI kehityskohde-leimaa. Vain **luku näkyy** kontekstina.
- Koskee `tasoVari`:a (nyt `neutraali && taso<=3 → teal`; muuta → **ink3**) ja `rivi`:n badge-haaraa
  (nyt `neutraali && taso<=3 → "🌱 ei vielä arvioida"`; muuta → **`🌱 N / asteikko`** ink3-harmaana).
- `oletus`-haara (ika≥13, "ikäoletus"-tagi) **ennallaan** — se on jo "taso + kasvumittaus puuttuu".

### B.2 — Footer-selitteen asteikkoteksti tarkemmaksi
Footer sanoo *"tekniikka 1–3, fyysinen 1–5"*, mutta kortin **TK-lajitaso-rivit näkyvät `/5`:nä**
(esim. "Syöttö TK 2 / 5") → footer on harhaanjohtava. Korjaa footer erottamaan kolme asteikkoa:
```
fyysinen 1–5 · lajitekniikka (Eerikkilä H-H) 1–3 · TK-lajitaso (kilpailukohortti) 1–5
```
Rivit näyttävät jo oikein `N / asteikko` (/3 tai /5) + "TK"-tagin TK-lajitaso-riveille — säilytä.
Footer-teksti vain vastaamaan todellisuutta.

**Päivitä 🌱-footer-teksti:** poista "fyysistä ei vielä arvioida" jos taso nyt näytetään; korvaa
esim. *"🌱 = kypsyys huomioitu (ennen kasvupyrähdystä) — taso viitteellinen, ei kehityskohde."*

---

## Reunaehdot
- **§7.22:** Pelaaja_v7 ei kutsu `renderKehityskorttiHTML`:ää → ei muutu. Ei tasolukuja pelaajalle.
- **§28 säilyy sisällössä:** neutraali-taso aina ink3-harmaa + 🌱, ei punaista, ei gap-vihjettä.
- **Ei laskentamuutosta, ei skeemaa, ei Rules-muutosta.** Vain render + selite + layout.
- **Design-lukko + molemmat teemat.** Hiusviivat, teal-aksentti, DM Mono/Cormorant, ei täyttövärejä.
- **`?v=`-bump:** `tm_eerikkila_normit.js` muuttuu → nosta `?v=` VP + Master (molemmat lataavat sen).
  VP/Master-HTML-only-muutoksille (Osa A) riittää sisäinen; libin bump kattaa.

## Definition of Done
- **L1:**
  - Osa A: selite "T = TK-lajitaso 1–5 · kilpailukohortti (ei väestönormi)" (ei Eerikkilä); rivi
    kaksirivinen/wrap-turvallinen, inline-palkki poistettu, viite+gap omalla himmeällä rivillä.
    VP + Master.
  - Osa B: `renderKehityskorttiHTML` neutraali-fyysinen → `🌱 N / asteikko` ink3 (ei "ei vielä
    arvioida"); tasoVari neutraali → ink3 (ei teal/punainen); ei gap-vihjettä; footer erottaa
    3 asteikkoa; 🌱-selite päivitetty. `oletus`-haara ennallaan.
- **L2:** vitest `renderKehityskorttiHTML`/`perTestTasot`: neutraali-fyysinen palauttaa/renderöi
  tason (ei "ei vielä arvioida"), väri ink3, ei gap-vihjettä; `oletus` ennallaan; tekniikka `/3`
  vs TK `/5` ennallaan. ~864+ vihreä, ei regressiota.
- **L3 (elävä, molemmat teemat):**
  - Syväanalyysi: selite lukee "TK-lajitaso … kilpailukohortti" (ei Eerikkilä); rivit luettavia,
    ei yhteen juoksevaa; pituuspotku ilman väärää 's' (#278 ok).
  - Kehityskortti: pre-PHV-fyysinen (esim. 30 m) näyttää **🌱 taso harmaana** (ei "ei vielä
    arvioida"); ei punaista, ei gap-vihjettä; ika≥13 no-PHV näyttää "ikäoletus"-tagin ennallaan.
  - Pelaaja_v7 ei näytä tasolukuja (§7.22 ehjä).
- Pieni PR. Lataa VP/Master uudelleen deployn jälkeen (`?v=`-bump).

## Huom Codelle
- Selitteen sanamuoto: **käytä `TM_SELITTEET.tk_lajitaso`-tekstiä totuuslähteenä** — älä kirjoita
  omaa määritelmää TK-lajitasolle.
- Jos löydät MUITA pintoja jotka nimeävät TK-lajitason "Eerikkiläksi" tai väittävät tekniikan olevan
  1–5 Eerikkilä-asteikolla, korjaa samalla (sama juurivirhe).
