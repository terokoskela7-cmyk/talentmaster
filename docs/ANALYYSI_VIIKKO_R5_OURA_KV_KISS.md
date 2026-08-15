# Viikko (R5) — suunnitteluanalyysi · Oura × KV-benchmark × KISS

> **Tarkoitus:** varmistaa että VIIKKO v1 -kartta (ja siitä johdettu R5-toteutus) on linjassa Ouran (rauhallinen, selkeä),
> kansainvälisten benchmarkien ja KISS-periaatteen kanssa **ennen** kuin R5 rakennetaan. Ei vielä Code-brief — tämä on
> arkkitehdin arvio + suositukset + päätöspisteet.
> **Lähteet:** `docs/idp_design/VIIKKO_KISS_design_kartta_v1.html` (SSOT) · live `_vpViikkoHTML` (~9342) · §28 (kehitysikkunat/PHV) ·
> §35 (kalenteri K2) · §7.22 (ei lapselle rankingia).

---

## 1. Nykytila vs. kartta (delta)

**Live tänään** on funktionaalisesti rikas mutta visuaalisesti **tiheä muokkauslista**: 7 riviä (Ma–Su), kullakin fokus-tag (A/B/C) +
`kesto`-number-input + `RPE`-dropdown + läsnäolo-sykli. Alla tavoitejakauma A/B/C, kuorma-sRPE-palkit + ACWR + §28-kuormaehdotus.
Rail näkyvissä (tab 4 ei ole rail-vapaa).

**Kartta (v1)** on **rauhallinen näyttönäkymä**: fokus-header (kannettu Kehityksestä) → **7-päivän morfosykli-korttinauha**
(MD-suhteinen: MD−4/MD−2/MD/MD+1, sRPE-kuormapalkki per kortti) → 3 lähdekorttia → 2×duo (A/B/C-jakauma + ACWR-vyöhyke) →
2×duo (läsnäolo + pelaajan ääni) → katselmus-rivi. Muokkaus "✎ muokkaa" -takana. Yksi 860px sarake, rail-vapaa.

**Ydinjännite:** live = **datansyöttöpinta** (input-raskas, aina auki); kartta = **datan-näyttöpinta** (luettava ensin, muokkaa napista).

| Kartan elementti | Live | Delta |
|---|---|---|
| Rail-vapaa 860px | rail näkyvissä | lisää tab 4 rail-vapautukseen + 860px-katto |
| Fokus-header (Kehityksestä) | eyebrow + "Tämän viikon sessiot" | lisää `.foc`-teal-laatikko: konsepti + "Opittu kun" + ↳ Kehitys-lähde |
| **Morfosykli-korttinauha (MD-suhteinen)** | pystylista, ei MD-ankkurointia | **suurin muutos** — 7 korttia, MD−n-leima ottelupäivästä |
| 3 lähdekorttia | — (kommenteissa) | lisää (tai tapin taakse, ks. Oura) |
| A/B/C-jakauma | on (`_vpViikkoTavoitejakauma`) | säilyy, visuaali kartan mukaan |
| Kuorma + ACWR | on (`_vpViikkoKuorma`, ACWR-arvo) | säilyy; vyöhyke-esitys kartan mukaan |
| Läsnäolo | per-rivi sykli | kartan mukaan koostenäyttö (3 solua) |
| **Pelaajan ääni + cue** | — | lisää (jos data on; muuten honest-empty) |
| Katselmus-rivi | linkki tavoitejakauman alla | nosta omaksi riviksi ("Avaa katselmus →") |
| Empty-state | tekstirivi | kartan `.empty` + CTA "Aseta jaksofokus (Kehitys)" |

---

## 2. KV-benchmark — onko suunniteltu linjassa? (pääosin KYLLÄ, kaksi tarkennusta)

Kartta nojaa oikeisiin eliittikäytäntöihin, ja ne ovat perusteltuja:

- **Morfosykli / MD-suhteinen periodisointi** (taktinen periodisointi — Benfica/Barça): treenipäivän kehystäminen ottelupäivän
  etäisyydellä (MD−4 = kovin, MD−1 = viritys) on huipputason standardi. **Vahva KV-linja.** Kartan varaus *"OTO-joustava, ei pakoteta
  akatemiarakennetta ruohonjuureen"* on juuri oikea KISS/konteksti-suoja.
- **ACWR 0.8–1.3 turvavyöhyke** (Gabbett, loukkaantumistutkimus) + **session-RPE** (Foster, RPE×kesto) — molemmat saavutettavia
  ilman GPS/pukupantaa → toimii ruohonjuuritasolla. **KV + KISS.**
- **"Less is more" A/B/C** (PDP/ILP): fokus näkyy viikossa (~40 %) mutta ei täytä sitä. Oura-rauhallinen + KISS.
- **EPPP-katselmusrytmi** + **pelaajan ääni/cue** (Deci & Ryan autonomia, §7.22). Perusteltu.

**Tarkennus 1 — ottelupäivä on muuttuja, ei aina lauantai.** MD-suhteinen leima vaatii oikean ottelupäivän. Todelliset viikot
vaihtelevat (0 ottelua / 2 ottelua / turnaus). Paras KV-käytäntö (TrainingPeaks/Metrica) johtaa MD:n **kalenterista** ja degradoituu
siististi. → **R5:n on luettava ottelupäivä §35 K2 -kalenterista**, ei kovakoodattua lauantaita; 0 tai 2 ottelua → ei MD-ankkuria →
näytä paljas viikonpäivä-kuorma (rehellinen). Kartan empty-note jo vihjaa tähän.

**Tarkennus 2 — ACWR on nuorilla toissijainen §28-PHV:hen nähden.** ACWR:ää on kritisoitu metodologisesti (Impellizzeri 2020+), ja se
**vaatii ~4 vk kroonista pohjaa** jota pilottidatassa harvoin on. **Nuorille kasvupyrähdys-kuormituskaanto (§28 PHV/kasvutahti) on
vahvempi ja puolustettavampi signaali.** → Nosta §28-kuormaehdotus ensisijaiseksi, pidä ACWR **suuntaa-antavana sekundäärinä**
(kartta jo sanoo "ei absoluuttinen totuus"). Tämä on sekä KV-puolustettavaa että KISS. Käytännössä pilotissa kuormalohko on usein
honest-empty → viikkonauha + läsnäolo + fokus ovat todellinen päivittäisarvo, kuorma kypsyy myöhemmin.

---

## 3. Oura-linssi — kaksi jännitettä (tässä R5:n rauhallisuus ratkeaa)

Ouran allekirjoitus: **yksi tila/luku per osio · muoto + tila väriä ennen · yksityiskohta tapin takana · vaimea paletti.** Kartta on
suurelta osin tässä, mutta kaksi kohtaa vetävät levottomuuteen:

**Oura-jännite A — päiväkortit koodaavat NELJÄLLÄ värillä.** Kartan viikkonauha: teal (fokus), amber (ottelu), katkoviiva (lepo),
ink3 (muu) + kuormapalkit. Tämä on enemmän värikoodausta kuin Oura käyttäisi. **Sama korjaus kuin Arviointi #371 (väri→muoto):**
- **Päivätyyppi luetaan muodosta/tilasta, ei täytöstä:** MD−n-leima + kortin reunatyyli (kiinteä = treeni · katkoviiva = lepo) +
  ⚽-merkki ottelulle. **Teal = ainoa vahva aksentti**, varattu **fokus-treenille**. Ottelu ei ole amber-täyttö vaan ⚽ + neutraali
  reuna; lepo katkoviivareuna + himmeä. Kuormapalkki himmeä ink, fokuspäivä teal. → Silmäys kertoo *heti* "mitkä 2 päivää palvelevat
  jaksofokusta" ilman neliväristä koodia.

**Oura-jännite B — liikaa aina-näkyviä lohkoja.** Kartassa on nauha + 3 lähdekorttia + 2 duota + katselmus + legenda = paljon pintaa.
Oura piilottaa sekundäärin. **Suositus:**
- **3 lähdekorttia + mokknote → ⓘ-tapin taakse** ("mistä viikko koostuu"), kuten Arvioinnin selittävä scaffolding. Ne ovat
  provenienssi-dokumentaatiota, eivät päivittäistä työtä.
- **Oletusnäkymä = 4 rauhallista kerrosta:** ① fokus-header ② viikkonauha (+kevyt legenda) ③ kuorma/jakauma (tiivis) ④ läsnäolo +
  pelaajan ääni → katselmus. ACWR-vyöhyke: yksi arvo + yksi sana ("linjassa") oletuksena, 4-vyöhykepalkki vasta tapista tai himmeänä.

---

## 4. KISS-linssi — display-first, yksi lähde

**KISS-jännite — muokkauslista vs. näyttönauha.** Live näyttää oletuksena 7 riviä number-input + dropdown + sykli = raskas. Kartta
näyttää rauhallisen nauhan ja muokataan "✎"-napista. **Ratkaisu: erota NÄKYMÄ ja MUOKKAUS.**
- **Oletus = rauhallinen morfosykli-nauha (luettava).** Muokkaus (kesto/RPE/läsnäolo/lisää harjoite) avautuu kun valmentaja napauttaa
  päivää tai "✎ muokkaa" — ei 7 riviä kontrolleja etukäteen. Pelaajan omatoimiset (`lahde:'pelaaja'`, 📱) valuvat nauhaan
  automaattisesti (kaksisuuntainen silta). Tämä säilyttää kaiken nykyfunktion mutta tekee oletusnäkymästä Oura-rauhallisen.
- **Yksi totuuslähde:** sessiot = `kirjaukset/{pvm}` + kalenteri (K2, §35). Kartan 3 lähdettä konvergoivat tänne — jo arkkitehtuurissa.
  **Ei uutta kokoelmaa, ei uutta laskentaa.** ACWR/jakauma johdetaan olemassa olevasta sRPE:stä.
- **Ei pakoteta akatemiarakennetta:** MD-nauha on kehys, ei pakko — jos ei ottelua/ei jaksofokusta, näytä mitä on (honest).

---

## 5. Honest-empty / pilottitodellisuus (Oura: älä keksi)

R5:n on kestettävä pilotin ohut data ilman fabrikointia:
- **Ottelupäivä:** kalenterista (K2). Ei ottelua → ei MD-ankkuria (paljas viikko). 2 ottelua → kaksi ankkuria tai näytä molemmat.
- **Kuorma/ACWR:** vaatii ~4 vk → usein tyhjä. Näytä "kertyy ~4 vk mittausten jälkeen", ei nollaa/keksittyä.
- **Läsnäolo:** K2 `lasnaolijat` (on). Toteutunut, ei suunniteltu.
- **Pelaajan ääni:** Pelaaja-appin viikkorefleksio — **tarkista onko datapolku olemassa**; jos ei, honest-empty "ei refleksiota vielä"
  + cue-kysymys silti (ehdotus). ÄLÄ fabrikoi lainausta.
- **§7.22:** kuorma/ACWR = valmentajan/VP:n työkalu, EI pelaajalle rankingina.

---

## 6. Suositeltu R5-skooppi (kartan mukaan, kolme linssiä sisäänrakennettuna)

1. **Rail-vapaa tab 4 + 860px-katto** (kartan `.wrap`; sama kuvio kuin R4).
2. **Fokus-header** `.foc` — konsepti + "Opittu kun" + ↳ Kehitys-lähde (kannettu jaksofokuksesta).
3. **Morfosykli-nauha (Oura-muotokoodaus):** 7 korttia, MD−n kalenterista; **teal = fokus (ainoa aksentti)**, ⚽ ottelu (ei amber-täyttö),
   katkoviiva lepo; himmeä sRPE-kuormapalkki, fokuspäivä teal. Muuttuva/puuttuva ottelupäivä siististi.
4. **Display-first / edit-on-tap:** oletus luettava nauha; kesto/RPE/läsnäolo/lisää-harjoite napautuksella. Pelaajan omatoimiset valuvat sisään.
5. **Kuorma + A/B/C tiivis:** §28-PHV-kuormaehdotus ensisijainen, **ACWR suuntaa-antava sekundääri** (yksi arvo + sana; vyöhyke himmeä/tapista).
6. **Läsnäolo (K2-kooste) + pelaajan ääni + cue** (honest-empty jos ei dataa).
7. **Katselmus-rivi** → Seuranta/Kehitys (EPPP-rytmi).
8. **Lähdekortit + mokknote → ⓘ-tapin taakse** (Oura: sekundääri piiloon).
9. **Empty-state** kartan mukaan + CTA "Aseta jaksofokus (Kehitys)".

**Brändilukko §5 / Oura läpi:** teal ainoa vahva aksentti · ei pinkkiä · amber vain aito varoitus (ACWR koholla / §28-kuorma) ·
muotokoodaus päivätyypille · molemmat teemat.

---

## 7. Päätöspisteet (ennen R5-briefiä)

- **P1 — ACWR-painotus:** nuorille §28-PHV ensisijainen + ACWR sekundäärinen (suositukseni, KV-puolustettava), vai ACWR yhtä näkyvä?
- **P2 — Lähdekortit:** ⓘ-tapin taakse (Oura-rauhallinen, suositukseni), vai näkyviin kuten kartassa?
- **P3 — Muokkaus:** display-first / edit-on-tap (suositukseni), vai säilytä nykyinen aina-auki muokkauslista?
- **P4 — Pelaajan ääni:** onko Pelaaja-appin viikkorefleksion datapolku jo olemassa, vai rakennetaanko honest-empty + cue nyt ja data myöhemmin?
