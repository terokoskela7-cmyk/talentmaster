# Code-brief — §7.22-korjaus · Pelaajalle näkyvä TASO-luku + XP pois (Pelaaja_v7)

> **Konteksti:** Live-tarkastuksessa löytyi että `TalentMaster_Pelaaja_v7.html` renderöi lapselle
> **tasoluvun (1–5) ja XP:n** — molemmat ovat §22/§16/§7.22:n mukaan **kiellettyjä pelaajan pinnassa**.
> XP saa elää vain Firestoressa AI-agenttia varten (§22); TKI-/tasolukuja EI näytetä lapselle (§16).
> **Tehtävä: poista kaikki pelaajalle näkyvät XP- ja tasoluku-renderöinnit.** Logiikka + Firestore-kirjoitus ennallaan.

## Miksi (invariantit)
- **§22:** "XP/progressbar/loss aversion -kieltä EI renderöidä pelaajalle. XP tallennetaan Firestoreen vain AI-agentille."
  Peruste: Deci & Ryan SDT (ulkoinen palkinto syrjäyttää sisäisen motivaation) + Kahneman loss aversion (kerääminen → menetyspelko).
- **§16 / §7.22:** ei tasolukuja (T1–T5 / raaka `hh_taso` 1–5), ei percentiilejä, ei progressbaria, ei vertailua.
  FC-kortti (§28 `naytaFcOverlay`) näyttää tarkoituksella 🌱-tilan / OVR-lattian — raaka tasoluku ohittaa tämän suojan.

## Kaksi (kolme) korjauskohtaa — KAIKKI Pelaaja_v7:ssä

### KOHTA 1 — rPin() hero: "TASO"- ja "XP"-KPI-ruudut (näkyy kirjautumisnäytöllä)
**Rivit ~715–716 (data) + ~765–775 (render, "KPI-RIVIT"-grid):**
```js
const hhTaso = (p && p.hh_taso != null) ? p.hh_taso : '—';   // ← raaka tasoluku lapselle
const xp     = (p && p.xp != null) ? p.xp : '—';             // ← XP lapselle
...
<!-- KPI-RIVIT: kaksi ruutua -->
<div ...>Taso</div><div ...>${hhTaso}</div>   // vasen ruutu
<div ...>XP</div>  <div ...>${xp}</div>        // oikea ruutu
```
**Korjaus:**
- **XP-ruutu:** poista kokonaan (koko oikea `<div>`-ruutu grid-elementteineen).
- **TASO-ruutu:** poista tasoluku. **Kaksi vaihtoehtoa — valitse A (suositus):**
  - **A) Poista koko KPI-rivit-grid** ja korvaa §7.22-turvallisella positiivisella elementillä TAI jätä hero ilman ruutua
    (streak + viikkonauha + idol-kortti jo kantavat heron — KPI-grid ei ole välttämätön). Siistein: poista grid.
  - **B) Jos ruutu halutaan säilyttää:** korvaa tasoluku **sanatilalla** (esim. kehitysvaihe/vahvuus sanana, EI numeroa) —
    mutta tämä vaatii uuden §7.22-turvallisen sisällön; **jos epävarma → valitse A ja ilmoita.**
- **Siivoa myös** `const hhTaso` + `const xp` -muuttujat rPin():stä jos ne jäävät käyttämättömiksi (ei dead-code varoitusta).

### KOHTA 2 — rTDone() treeni-valmis-näyttö: XP-progressbar + "+XP" (KRIITTINEN, EHDOTON)
**Rivit ~2862–2872.** Tämä on **pahempi rike kuin hero-ruudut**: kokonainen **XP-etenemispalkki tasonumeroineen**.
```js
// rivi 2862 — XP-gain-teksti:
<div ...>🔥 ${_streak||0} pv streak · +${tXP} XP</div>
// rivit 2864–2872 — XP-PROGRESSBAR (taso + xp/xpNext + animoitu palkki):
${(()=>{ const xp=_pelaaja?.xp||0; const taso=_pelaaja?.taso||1; const xpNext=taso*1000;
  const pct=...; const newPct=Math.round(((xp+40)/xpNext)*100); return `
  <div ...><span>Taso ${taso}</span><span>${xp} → ${xp+40} / ${xpNext}</span></div>
  <div ...><!-- animoitu etenemispalkki pct% → newPct% --></div>`; })()}
```
**Korjaus:**
- **Poista koko IIFE-progressbar-blokki** (rivit ~2864–2872): `Taso ${taso}`, `${xp} → ${xp+40} / ${xpNext}` ja animoitu palkki.
  Tämä on täsmälleen §22:n kieltämä "XP/progressbar/loss aversion".
- **Rivi 2862:** poista `· +${tXP} XP` -osuus. Jätä positiivinen prosessikehu ilman XP:tä: `🔥 ${_streak||0} pv streak`.
- **Säilytä** "Liekki pysyy." + "Päivä X" + "Valmentajalle"-kortti — nämä ovat §7.22-turvallisia (prosessi, ei numero).
- **Korvaa progressbarin paikka VAHVISTETULLA palkintohetkellä** (alla) — ei jätetä tyhjää, vaan tehdään paluusyystä
  vahvempi kuin XP oli, §22-turvallisesti streakin + korttien kautta.

### KOHTA 2b — VAHVISTETTU palkintohetki rTDone:hen (PÄÄTÖS: Tero 2026-08, reitti A)
> **Linjaus:** streak/liekki (+ §36-kortit) = pelaajan paluusyy. XP:n poistuttua treeni-valmis-näytön palkitsevuus
> **vahvistetaan**, ei heikennetä. Käytä **olemassa olevaa** infraa (`_haeStreak`, `_streakViesti`, `KORTTI_KATALOGI`,
> `rMinaKokoelma`) — ÄLÄ rakenna uutta korttijärjestelmää.

**Progressbar-blokin tilalle** (sama paikka rTDone:ssa, ~2864–2872) rakenna §22-turvallinen palkintokortti kolmella tilalla:

1. **Virstanpylväs auennut** — kun `_haeStreak()` osuu saavutuskynnykseen (**=== 7** → `ach_liekki7` · **=== 14** → `ach_liekki14`;
   voit lukea nimen/ikonin suoraan `KORTTI_KATALOGI.saavutukset`-rekisteristä): juhlistava kortti
   **"🔥 Viikon liekki auennut!"** (14 → "🔥 Kahden viikon liekki!") + CTA **"Katso kokoelma →"** joka vie `rMinaKokoelma()`:hen.
   Tämä on se hetki jolloin kotitehtävä palkitaan konkreettisella keräilyaukeamalla.
2. **Matkalla virstanpylvääseen** — muuten näytä streak-tilaviesti `_streakViesti(_haeStreak())`:llä
   (positiivinen, 4 tilaa 0/1–6/7–13/14+). Saa kannustaa eteenpäin ("liekki kasvaa"), mutta **EI menetyskehystä**
   ("menetät liekin", "et saa katkaista") eikä pakkonumeroa ("2 päivää tai putki katkeaa"). Approach, ei loss.
3. **Palannut tauolta** — jos streak nollautui ja alkaa uudelleen: lempeä "Liekki syttyy taas" (lepopäivä ≠ epäonnistuminen, §36).

**§22-vartija palkintohetkeen:** ei numeroa joka toimii rankingina, ei vertailua muihin, ei XP:tä, ei prosenttia, ei progressbaria
jonka voi "menettää". Streak-**päivämäärä** (Päivä 5) OK — se on oma prosessi, ei vertailu. Kortin ansainta AINA `ansainta(p)`-funktiosta
(pikakentät/streak) — ei fabrikoitua tilaa. **§7.1:** rakenna string-concat `+`:lla (ei nested template literaleja).

**Jos epävarma virstanpylväs-tilan sanamuodoista tai CTA-navigoinnista `rMinaKokoelma`:hen → ilmoita ENNEN.**

### KOHTA 3 (VARMISTUS, ei välttämättä muutosta) — muut xp/hh_taso-esiintymät
Grep löysi nämä — **käy läpi, mutta useimmat OK:**
- **Rivit ~4147 / ~4160:** `xp: (_pelaaja.xp||0)+(xp||0)` + `_pelaaja.xp = paivitys.xp` = **Firestore-kirjoitus + muistitila.**
  **JÄTÄ ENNALLEEN** — XP saa tallentua (§22: AI-agenttia varten). Ei renderöi lapselle.
- **Rivi ~2843:** `_tallennaKirjaus('T', tXP, ...)` — XP:n **tallennus**. JÄTÄ (sama peruste).
- **Rivit ~1656–1657 / ~4667:** `hh_taso` käytetään VAIN **abs-parannuksen** laskentaan (näyttää "📈 parannus" sanana,
  §16-turvallinen prosessikehu, EI tasolukua). **Varmista ettei renderöi `hh_taso`-numeroa lapselle** → jos ei, jätä ennalleen.

## Vartijat
- **§7.1 string-concat `+`** — EI nested template literaleja (Pelaaja_v7 synttäri-bugi). Poistot eivät saa jättää rikkinäistä templatea.
- **Logiikka koskematon:** streak-laskenta, `_tallennaKirjaus`, XP-tallennus Firestoreen, `getIdToken(true)` — ennallaan. **Vain näkyvä renderöinti poistuu.**
- **§5:** 0 kiellettyä väriä; teal `#28B090` säilyy heron muissa elementeissä.
- **SW-cache:** HTML muuttuu → **bumppaa `sw_pelaaja.js` CACHE-versio** (nykyinen `tm-pelaaja-vN` → `vN+1`). tm_lang.js ei muutu → ei `?v`-bumppia.
- **Suomi/ruotsi/englanti:** poistot koskevat kovakoodattua UI:ta (TASO/XP eivät olleet käännettyjä) — ei i18n-vaikutusta, ei regressiota kieliin.

## DoD
- Pelaajan **kirjautumisnäytöllä EI enää** "TASO"- eikä "XP"-ruutua (KOHTA 1).
- Treeni-valmis-näytöllä **EI XP-progressbaria, EI tasonumeroa, EI "+XP"-tekstiä** (KOHTA 2); "Liekki pysyy" + streak-positiivikehys säilyy.
- **Vahvistettu palkintohetki (KOHTA 2b) toimii:** virstanpylväs-aukeama streak-kynnyksellä (7/14) + CTA kokoelmaan,
  muuten `_streakViesti`-tila; ei menetyskehystä, ei numeroa rankingina. Rakennettu olemassa olevalla infralla (ei uutta korttijärjestelmää).
- XP tallentuu yhä Firestoreen (AI-agentti) — vain renderöinti poissa. Ei dead-code/lint-varoitusta.
- Vitest + eslint vihreä. SW-cache bumpattu. §7.1 ehjä (ei rikki templatea).

## Verifiointi (Claude L3)
Live headless, molemmat teemat, fi+sv: (1) kirjautumisnäyttö — 0 "Taso"/"XP"-KPI-ruutua; (2) treeni-valmis-näyttö
(demo-pelaaja tai kirjautunut) — 0 progressbaria, 0 tasonumeroa, 0 "XP"-merkkijonoa pelaajan pinnalla;
(3) `page.content()`-regex-skannaus: ei `\bXP\b` / `Taso \d` / `taso*1000` -renderöintiä pelaajanäkymissä (rPin/rTDone);
(4) fi-regressio: streak + "Liekki pysyy" + Valmentajalle-kortti ehjät; 0 kiellettyä väriä. **Poikkeama = ilmoita ENNEN.**

## Päätöskonteksti (Tero 2026-08)
- **Reitti A valittu:** §22 pysyy tiukkana — XP-pisteet + tasonumerot pois pelaajan pinnasta. Motivaatio ei katoa,
  se nojaa **streakiin/liekkiin + §36-kortteihin** (Teron linjaus: "streak ja liekki ovat hyviä").
- **Kaksi eri "tasoa" tunnistettu:** hero-ruudun `hh_taso` = oikea Eerikkilä-arviointitaso (arviointivuoto, §16/§28) ·
  rTDone:n `_pelaaja.taso` = pelillinen XP-taso (§22). Molemmat poistuvat lapsen pinnasta.
- **Vahvistettu palkintohetki (KOHTA 2b) päätetty** — treeni-valmis-näyttö tehdään palkitsevammaksi kuin XP oli,
  streak-virstanpylväs + korttiaukeama. Tämä on suora vastaus "miksi pelaaja palaa appiin" -kysymykseen, §22-turvallisesti.
- Löydös: hero-ruutujen lisäksi rTDone:n XP-progressbar (rivit 2862–2872) oli pahempi §22-rike — mukana briiffissä (KOHTA 2).
