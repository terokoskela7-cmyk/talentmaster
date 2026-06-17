# RAE-näkyvyys (Sprint 2) — spec

> Scoping 2026-06-17. Tavoite: tehdä strateginen kv-erottautuja (RAE-korjaus) NÄKYVÄKSI VP:lle + valmentajalle.
> Tausta + tiede: `docs/STRATEGIA.md §2` (Morganti 2025: OR 4.38 valinta-bias, OR 2.80 underdog-menestys, "tietoisuus ei riitä → systeeminen korjaus oletuksena").
> Data valmis: `rae_kvartaali`-pikakenttä (tuonti+recalc kirjoittaa) + `RAE_KERROIN {Q1:0.92,Q2:0.96,Q3:1.02,Q4:1.06}` + `raeKvartaali(syntymaaika)`-helper (lib). ℹ️-selite `rae` jo `TM_SELITTEET`:issä.
> Liittyy: §2 (RAE-tiede) · §26 (pikakentät) · §28 (kehitysikkunat) · §30 · IA-spec (toimenpide-ensin).

---

## 1. TAVOITE

VP **näkee** RAE:n ja voi toimia: havaita valmentajan ikäharha, suojata myöhäissyntyneet lahjakkuudet karsiutumiselta, tunnistaa underdogit (piilohelmet). Tämä on TalentMasterin myyntiargumentti ("Catapult mittaa, me korjaamme") tehtynä näkyväksi. **Ei pelkkä luku — toimenpide:** chip + merkki + jakauma + suodatin + raportti, kaikki pikakentistä.

**Mittari:** VP löytää joukkueen BQ-vinouman yhdellä silmäyksellä; Q4-lahjakkuudet eivät jää näkymättä.

---

## 2. SYNTYMÄKVARTAALI (peruste)

Suomalainen ikäluokka = kalenterivuosi (1.1.-katkaisu). `raeKvartaali(syntymaaika)`:
- **Q1** tammi–maalis (ikäluokan VANHIN) · **Q2** huhti–kesä · **Q3** heinä–syys · **Q4** loka–joulu (NUORIN).
- Sama ikäluokka: Q1 voi olla ~11 kk vanhempi kuin Q4 → fyysinen etu, ei taitoetu.

---

## 3. NÄKYVYYSELEMENTIT

### A. Syntymäkvartaali-chip (Q1–Q4)
- VP pelaajarivit + syvänäkymä · Master kehityskortin identiteettinauha (ikä/PHV-chipin vieressä).
- Väri: Q1 amber (vanhin, "ikäetu") · Q2/Q3 neutraali · Q4 teal ("nuorin — potentiaali"). ℹ️ → `TM_SELITTEET.rae`.
- Tyhjä kun `syntymaaika`/`rae_kvartaali` puuttuu (ei arvausta).

### B. Underdog / Piilohelmi -merkki — **LUKITTU: Q4 + taso ≥3**
- **Q4 (loka–joulu, ikäluokan nuorin) JA jokin dimensio (D1/D2/TKI/H-H) ≥3** (ikäluokan keskitason yli) → "⭐ Underdog" -badge.
- "Pärjää vaikka on ikäluokan nuorin → poikkeuksellinen pitkän tähtäimen lupaus" (OR 2.80). Terävä signaali, ei paisu.

### C. Joukkueen RAE-rakenne (VP:n YDINNÄKYMÄ) — koko joukkue, ei vain varoitus
> Tavoite (Tero): VP **ymmärtää ja tunnistaa joukkueen rakenteen + minkälaisia talenttipelaajia valitaan.**
- **Täysi BQ-jakauma** Q1/Q2/Q3/Q4 % + n (VP syvänäkymä Yhteenveto + Koti-signaalikortti + HoT-raportti). Visuaalinen palkki, ei pelkkä luku.
- **Bias-varoitus (§2):** Q1 > 40 % → amber "ikäharha: valitaanko taidon vai iän mukaan?" · Q4 aliedustus → huomio.
- **Talentti × kvartaali -ristiin** (vastaa "minkälaisia talenttipelaajia valitaan"): onko joukkueen KÄRKI (korkein taso / talenttiohjelmassa) painottunut Q1:een (= valitaan kypsyyttä) vai jakautunut tasaisesti (= valitaan taitoa)? Esim. "Kärjestä 70 % Q1 → valintaprofiili nojaa ikäetuun." Tämä on VP:n johtamistyökalu.
- **Toimenpide-CTA:** "Tarkastele Q4-pelaajat" → BQ4-suodatin (D).

### D. BQ4-suodatin
- VP pelaajalista: suodatin "Q4 (nuorimmat)" → näe suojattavat/underdog-lahjakkuudet. (STRATEGIA §2 + VP_v22-backlog #4: "Underdog = Q4 + FLEI/taso ≥ kynnys".)

### E. RAE-jakauma HoT-raporttiin
- `lahetaRaportti` (slice 2:n raportti) saa BQ-jakauma-osion: seuran/joukkueen Q-jakauma + underdog-lista + bias-huomio.

### F. ℹ️-selite
- `rae`-selite jo `TM_SELITTEET`:issä → kytke chip/jakauma näyttämään se (VP `_vpSelTip('rae')`, Master `_mSelInfo`).

---

## 4. RAE-KORJAUS (periaate §2) — VISIBILITY NYT, KORJAUS-LASKENTA ODOTTAA OVR:ää

§2: "RAE-korjatut pisteet ovat OLETUSARVO." **Mutta** korjauskerroin (`RAE_KERROIN`) sovelletaan komposiittiin (OVR/ranking), ja **OVR ei ole vielä aktiivinen** (vaatii ≥3 dimensiota, §30). → Tämä pass = **näkyvyys** (kvartaali + bias + underdog). **Korjaus-laskenta (Q4-pisteen nosto rankingissa) kytketään kun OVR aktivoituu** — `RAE_KERROIN` on valmiina. Älä sovella kerrointa yksittäisiin testitasoihin (vääristäisi normia); se kuuluu komposiittiin.

---

## 5. RAJAUKSET

- **VP + valmentaja (Master).** Pelaajalle (§7.22): EI kvartaali-leimaa suorituksena. Mahdollinen kannustava BQ4-motivaatioviesti (§2) = erillinen, harkittu, EI tässä passissa.
- Vain pikakentät (§26), ei uusia kyselyjä. Mobiili/teema-CSS-muuttujat.

---

## 6. SEKVENSSI

1. Chip + ℹ️ (A, F) — pieni, näkyy heti.
2. Joukkueen BQ-jakauma + bias-varoitus (C) + BQ4-suodatin (D) — VP:n ydinarvo.
3. Underdog-merkki (B) — kun kynnys päätetty.
4. HoT-raportin BQ-osio (E).

Verifiointi: `new Function` 0 virhettä · `npm test` · chip/jakauma pikakentistä · §7.22 (ei pelaajalle) · §6 yksi `@media(768)` · version:bump/cache · push.
