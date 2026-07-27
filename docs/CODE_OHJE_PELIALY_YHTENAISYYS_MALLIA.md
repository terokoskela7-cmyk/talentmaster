# CODE_OHJE — Peliälyn yhtenäisyys + pelaajanäkymä (Malli A)

**Tyyppi:** kanoni + näyttö (3 osaa, yksi PR) · **Kohteet:** `TalentMaster_Master_v16.html`,
`TalentMaster_Pelaaja_v7.html` (+ backfill) · **Base:** `main`.
**Design-referenssi:** design-map `tm_pelialy_pelaaja_malliA.html` (pelaajan peliäly-lohko, molemmat teemat).
**Tausta:** Topias U13 näyttää radar D4 **4.7** mutta arviointi **8/9** — eri lukemat. Juurisyy: näyttö
ikäporittaa ADAR-osat (§4), mutta `yht` ei → Reading (r=3) nostaa yht:ää muttei näy erittelyssä.

## Kanoni (Malli A) — Teron päättämä

ADAR-osat: **a=Havaitse/Awareness · d=Päätä/Decision · ac=Toimi/Action · r=Reading/Reassess** (kukin 1–3).
§4-ikäportitus: **U8–12 = [a] · U13–15 = [a,d,ac] · U16+ = [a,d,ac,r]**.

1. **`yht` (D4-dimensio) lasketaan VAIN ikätason osista.** Ikätason yli menevä osa (esim. U13:n Reading)
   EI kuulu yht:ään. `yht` pysyy 1–3-keskiarvona (max 3) — vain dim-joukko ikäporitetaan.
2. **Kaikki osat säilytetään datassa** (`adar_viimeisin.{a,d,ac,r}` ennallaan). Ikätason yli menevä osa
   **näytetään bonuksena**, ei piiloteta.
3. **Yksi lähde:** kaikki normalisoidut peliäly-luvut (radar D4 `_dimNorm5Adar`, VP-sirut `yht/3`,
   Master §C-kortti, Pelaaja FUT ÄLY `yht/3*99`) lukevat tätä samaa `yht`:ää → yhtenäiset kaikissa näkymissä.

Topias U13 vahvistus: yht = ka(a,d,ac) = (3+2+3)/3 = **2.7** (ei 2.8) → radar D4 **4.5/5** (ei 4.7),
täsmää arvioinnin A·D·Act = 8/9 kanssa. Reading 3 näkyy bonuksena.

## Osa 1 — Lähde: `paivitaAdarPikakentat` ikäporittaa yht:n (`TalentMaster_Master_v16.html` ~rivi 9250)

Nyt:
```js
const dims = [a, d, ac, r].filter(x => x != null);
const yht = dims.length ? Math.round((dims.reduce((s,x)=>s+x,0)/dims.length)*10)/10 : null;
```
Muuta: johda pelaajan **ikä** (pelaajadokumentista — `ika` / `syntymaVuosi`; sama kaava kuin Pelaaja_v7
`_ika`) ja rakenna **ikätason dim-joukko** §4:n mukaan, keskiarvo VAIN niistä:
```js
const _band = (ika == null) ? [a,d,ac,r]        // ikä tuntematon → olemassa olevat (turvaverkko)
            : (ika <= 12) ? [a]
            : (ika <= 15) ? [a,d,ac]
            : [a,d,ac,r];
const dims = _band.filter(x => x != null);
const yht = dims.length ? Math.round((dims.reduce((s,x)=>s+x,0)/dims.length)*10)/10 : null;
```
- `adar_viimeisin` säilyttää `a,d,ac,r` ennallaan (bonus-näyttö lukee ne). Vain `yht` muuttuu.
- **Backfill:** lisää SA-konsolifunktio (malli: `backfillHistoria`/`recalcHH`) joka ajaa `paivitaAdarPikakentat`
  kaikille seuran pelaajille (dry-run ensin, tulostaa `yht` vanha→uusi). **Tero ajaa** (credentialed write).
  Ilman backfilliä olemassa oleva `yht` on vanha kunnes seuraava havainto tallennetaan (self-heal).

## Osa 2 — Valmentaja (Master §C ADAR-lohko ~rivi 6722)

Valmentaja näkee raa'an erittelyn (läpinäkyvyys). Muutokset:
- **Merkitse ikätason yli menevä osa bonuksena:** jos osa on kirjattu mutta ei kuulu ikätason `_band`:iin,
  näytä se erikseen "🌟 ikätason yli — ei laske D4:ään" (ei punaista, ei osana pääsummaa).
- **Taso-merkki:** näytä havainnon taso kirjattujen ikätason-osien mukaan (Taso 2 = A·D·Act · Taso 3 = +Reading).
- Otsikkoluku on jo `yht/3` (#265) — pysyy, mutta on nyt ikäporitettu → täsmää radarin kanssa.

## Osa 3 — Pelaaja (Pelaaja_v7 ADAR-näyttö v5 ~rivi 5478) — Malli A

Toteuta design-mapin (`tm_pelialy_pelaaja_malliA.html`) mukainen Rakentaja-lohko:
- **Vahvuus edellä:** aloita `adar_vahvin`-osasta ("💪 Vahvin: Havainnointi — …").
- **Osat laadullisina palkkeina + kannustava kuvaus.** **POISTA punainen** (`#D85A5A`) pelaajalta: alin osa =
  `--amber` "kehittyy", ei punainen. Heikoin (`adar_heikoin`) kehystetään **"🎯 Seuraava askel"**, ei heikkoutena.
- **Ikätason yli menevä osa = bonus** ("🌟 Ikätasosi yli: pelin lukeminen"), ei nosta lukua, ei piiloteta.
- **Kokonaisluku = kehityskaista + tasomerkki, EI murtolukua** ("8/9"/"11/12" pois). Jos numero näytetään,
  se on normalisoitu D4 /5 positiivisesti kehystettynä — sama minkä radar näyttää.
- FUT ÄLY -kortti (`_fcKorttiData`, `yht/3*99`) pysyy — se lukee jo saman yht:n (nyt ikäporitettu → oikea).

## Reunaehdot

- **Design-lukko + molemmat teemat** (design-map on referenssi). Rakentaja-ääni pelaajalle.
- **§7.22:** pelaajalle EI kovia murtolukuja/arvosanoja — kehityskaista + kannustava kuvaus.
- **`yht` säilyy 1–3-keskiarvona** — vain dim-joukko ikäporitetaan. `#265`:n `/3`-nimittäjät pysyvät oikeina.
- **Yksi lähde, monta kehystystä:** sama `yht` → VP normalisoitu vertailu · Valmentaja raaka+taso+bonus ·
  Pelaaja kannustava+kehityskaista. Pohjaluku EI eroa rooleittain.
- **Oikeiden alaikäisten data:** L3 vain Topias Koskelalla (KPV, sanktioitu). Backfill additiivinen
  (rakentaa `havainnot`-lähteestä), Teron ajettava.
- **`?v=`-bump** appeihin joita muutat.

## Definition of Done

- **L1:** `paivitaAdarPikakentat` ikäportitus (§4); Master bonus+Taso-merkki; Pelaaja Malli A (vahvuus edellä,
  ei punaista, ei murtolukua, Reading bonus); SA-backfill-funktio (dry-run). Pienet erilliset commitit
  (lähde / Master / Pelaaja) — mutta **yksi PR** (näyttö olettaa ikäporitetun yht:n; ei saa jäädä transienttia
  ristiriitaa).
- **L2:** ~805 vitest vihreä + **uusi testi**: U13 → yht = ka(a,d,ac), Reading EI mukana; U16+ → kaikki 4;
  U8–12 → vain a.
- **L3 (elävä, Topias/KPV, U13, molemmat teemat):**
  - Radar D4 **4.5/5** (ei 4.7); Master §C PELIÄLY yhtenäinen radarin kanssa; Reading näkyy "🌟 ikätason yli".
  - Pelaaja-lohko = Malli A: vahvuus edellä, kehityskaista (EI "8/9"), amber ei punainen, Reading bonus.
  - Backfill dry-run näyttää Topias `yht` **2.8 → 2.7**.
  - Lataa Master + Pelaaja uudelleen deployn jälkeen (ajonaikainen funktio jää muuten vanhaksi).
- Verifioi elävänä ennen mergeä; nosta PR:ssä jos jokin reunaehto ei toteutunut faktojen valossa.
