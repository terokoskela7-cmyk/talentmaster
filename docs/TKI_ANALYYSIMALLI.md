# TKI-ANALYYSIMALLI — kolme viitekehystä + kehitysvauhti
# Speksi Claude Codelle · 2026-06-10
# Suhde muihin dokumentteihin: täydentää KPI_MASTER_ARCHITECTURE.md §4 (TKI Detail) ja
# CLAUDE.md §23/§31. RISTIRIITARATKAISU: KPI-docin §4 per-laji kulta/hopea/pronssi-kynnykset
# (TK_MERKKIRAJAT[sp][laji][ika]) EIVÄT OLE olemassa — §31 voittaa: mitali jaetaan VAIN
# kokonaisajasta. Per-laji-taso tässä mallissa = VIITETASO loppukilpailudatasta, EI mitali.

---

## 1. KOLME VIITEKEHYSTÄ — sama tulos, kolme vertailua

Sama suoritus (esim. pujottelu 22.5 s) asetetaan kolmeen eri vertailuun, jotka
vastaavat eri kysymyksiin:

| # | Viitekehys | Datalähde | Kysymys | Asteikko |
|---|---|---|---|---|
| A | **Kriteeriviite (mitali)** | `TK_KOKONAISRAJAT[sp][ika]` | "Saavuttaako huipputason kynnyksen?" | 🥇🥈🥉 — VAIN kokonaisajasta |
| B | **Eliittiviite (loppukilpailu)** | valtak. loppukilpailutulokset 2024–25 per laji | "Miten vertautuu maan parhaisiin lajeittain?" | erinomainen / hyvä / kehitettävä |
| C | **Populaatioviite (H-H)** | FINAL2024 3-portainen (`eerikkilaTaso`) | "Miten vertautuu KAIKKIIN ikäisiinsä?" | taso 1–3 (vain pujottelu + syöttö) |

**Linkityksen ydinajatus:** A kertoo TASON, B kertoo KOHTEEN, C kertoo POHJAN.

- A on kokonaisuus → ei kerro mitä harjoitella.
- B hajottaa kokonaisajan lajeihin → kertoo MIKÄ laji jarruttaa ja KUINKA PALJON
  (sekunteina, koska kaikki TK-lajit ovat aikaa ja kokonaistulos = summa).
- C erottaa kaksi eri vajetyyppiä samassa lajissa (ks. §4 triangulaatio).

---

## 2. ANALYYSIKETJU — taso → kohde → määrä → vauhti

Jokainen TK-tulos ajetaan neljän kysymyksen läpi (laskenta lennossa, §26-periaate):

### 2.1 TASO — missä ollaan
`tki_viimeisin` (0–100) + `tki_merkki` kokonaisajasta. Olemassa.

### 2.2 KOHDE — mikä laji jarruttaa
Per-laji vertailu eliittiviitteeseen (B). Nykyinen suhteellinen
vahvuus/kehityskohde (`_laskeVahvuudetJaKehityskohteet`, lajin osuus kokonaisajasta)
säilyy fallbackina, mutta eliittiviite on parempi: se kertoo onko laji heikko
*suhteessa maan parhaisiin*, ei vain suhteessa pelaajan omiin muihin lajeihin.

### 2.3 MÄÄRÄ — sekuntibudjetti seuraavaan mitaliin
Koska mitali = kokonaisaika ja jokainen lajista nipistetty sekunti = sekunti
kokonaisajasta, gap voidaan ilmaista suoraan toimenpiteinä:

```
Hopeaan puuttuu 6.2 s.
  Pujottelu: 5.7 s yli hyvä-viitetason   ← suurin potentiaali
  Syöttö:    1.5 s yli
  Muut:      viitetasolla
→ Resepti: pujotteluharjoittelu, tavoite −4 s tällä kaudella
```

Tämä on mallin tärkein käytännön tuotos: VP, valmentaja ja pelaaja näkevät saman
sekuntibudjetin omalla kielellään (§5).

### 2.4 VAUHTI — liikkuva maali (UUSI)
Merkkirajat kovenevat iän myötä → pelaajan on kehityttävä vähintään rajojen
kovenemisvauhtia, tai suhteellinen taso laskee vaikka absoluuttinen tulos paranee.
Tämä selittää mm. Sibbon TKI-laskut (Morris 35→24: tulos saattoi parantua
absoluuttisesti, mutta vaatimus koveni enemmän). Ks. §3.

---

## 3. KEHITYSVAUHTI — kuinka nopeaa kehityksen pitää olla

### 3.1 Vaadittu vuosiparannus (TK_KOKONAISRAJAT-datasta, pojat / hopea)

| Siirtymä | Hopearaja | Vaadittu Δ | Huomio |
|---|---|---|---|
| P8 → P9 | 105 → 100 | **−5 s/v** | |
| P9 → P10 | 100 → 120 | +20 s (löystyy) | **rata/protokolla muuttuu** — abs-vertailu EI validi |
| P10 → P11 | 120 → 110 | **−10 s/v** | |
| P11 → P12 | 110 → 90 | **−20 s/v** | pituuspotkubonus (max −20 s) tulee käyttöön → osa "parannuksesta" tulee uudesta bonuksesta |
| P12 → P13 | 90 → 85 | **−5 s/v** | |

Tytöillä sama muoto, eri arvot (T: −5 / +15 / −10 / −10 / −5). Kulta-rajat kovenevat
samaa luokkaa. **Nyrkkisääntö: ~5–10 s/v aitoa parannusta** pitää saman mitalitason;
P11→P12-siirtymässä lisäksi pituuspotku on opeteltava (bonus on osa vaatimusta).

### 3.2 Kaksi delta-lukua — näytä AINA molemmat

| Mittari | Kaava | Kertoo |
|---|---|---|
| **Absoluuttinen delta** | `kokonaistulos_edellinen − kokonaistulos_uusi` (+ = parani) | kehittyikö suoritus |
| **Suhteellinen delta** | `tki_viimeisin − tki_edellinen` (TKI normalisoi ikärajaa vasten) | riittikö vauhti ikäluokkavaatimukseen |

Tyypillinen ja TÄRKEÄ viesti valmentajalle:
```
Absoluuttinen: parani 6.0 s ✅
Vaatimus koveni: 10 s (P11→P12)
Suhteellinen: TKI −4 → vauhti ei vielä riitä, mutta suunta on oikea
```
Ilman abs-deltaa TKI-lasku näyttää taantumiselta vaikka pelaaja kehittyy — tämä on
väärä ja demotivoiva signaali. **Invariantti: TKI-laskua EI saa näyttää pelaajalle
punaisena jos abs-delta on positiivinen** (§7.22 positiivinen kehystys).

### 3.3 Laskentasäännöt (invariantit)
1. Abs-delta validi VAIN saman ratasisällön sisällä (P10–P13 keskenään; P8–P9
   keskenään; EI yli P9→P10-rajan). Protokollarajan yli → näytä vain TKI-delta.
2. P11→P12: erottele pituuspotkubonuksen osuus abs-deltasta
   (`testitRakenne.pituuspotku.aikabonus_s`) → "aitoa parannusta X s + bonus Y s".
3. Vaadittu vauhti -funktio: `tkVaadittuVuosivauhti(ika, sp, taso)` =
   `TK_KOKONAISRAJAT[sp][ika][taso] − TK_KOKONAISRAJAT[sp][ika+1][taso]`
   (palauttaa null jos ika+1 > 13 tai protokollaraja välissä).
4. Mitali käyttää `<` ei `<=` (§23) — sama gap-laskennassa.

---

## 4. H-H 1–3 LINKITYS — triangulaatio (vain pujottelu + syöttö)

Sama fyysinen rata, kaksi protokollaa, kaksi normia (KPI-doc §5). Yhdistelmä
tuottaa diagnoosin jota kumpikaan ei yksin anna:

| H-H-taso (populaatio) | TK vs eliittiviite | Diagnoosi | Resepti |
|---|---|---|---|
| 1 (heikko) | kaukana | **Perustaidon vaje** | tekniikan perusteet, suuri toistomäärä — prioriteetti 1 |
| 2–3 (ok–hyvä) | kaukana | **Huipputerävyys puuttuu** | laatu + paine/vauhti harjoitteluun (hyvä populaatiossa ≠ eliittitaso) |
| 3 (hyvä) | lähellä/yli | **Vahvuus** | ylläpito, siirto pelitilanteisiin |
| 1 | lähellä | epäjohdonmukainen → tarkista mittaukset (eri päivä/alusta?) | uusintamittaus |

Näytetään rinnakkain eri otsikoilla (periaate 6: sama testi + eri protokolla →
molemmat). Ponnauttelu/kuljetus-laukaus/pituuspotku: ei H-H-vastinetta → vain A+B.

---

## 5. ROOLINÄKYMÄT — sama data, neljä kieltä

### 5.1 VP (VP_v25)
- **TKI-jakauma vs `TK_KANSALLINEN_BENCHMARK`** — olemassa.
- **Kehityskohde-klusterointi** (UUSI): "8/15 pelaajalla syöttö heikoin laji →
  joukkueharjoituksen teema". Lähde: `tki_kehityskohde`-pikakenttä, ei uusia kyselyjä.
- **Vauhtisignaali** (UUSI): joukkueen abs-delta vs vaadittu vauhti → "joukkue
  kehittyy, mutta 5/15 pelaajalla vauhti ei riitä ikäluokkavaatimukseen".
- Delta-badget (toteutettu 2026-06-10).

### 5.2 Valmentaja (Master_v16 TKI-detail, laajennos §29 VAIHE 1:een)
```
Tekniikkaprofiili — Morris, 12v                    TKI 24 · ei mitalia
Laji            Arvo     Eliittiviite*        Gap      H-H
Ponnauttelu     31.8s    hyvä ≤28s            +3.8s    —
Syöttö          25.1s    hyvä ≤23s            +2.1s    ●●○ 2/3
Pujottelu       22.5s    hyvä ≤19s            +3.5s    ●●○ 2/3   ← kehityskohde
Kulj-laukaus    16.0s    erinomainen ≤17s     ★        —
Pituuspotku     bonus −8s (max −20s)          +12s potentiaali

Sekuntibudjetti: pronssiin (105s) puuttuu 9.4s
  → pujottelu 3.5 + ponnauttelu 3.8 + pituuspotku-bonus ≥2 = saavutettavissa

Kehitysvauhti: abs +6.0s/v ✅ · vaadittu −10s/v (P12→P13: −5s/v) ⚠️
🔥 Motorinen kultaikkuna sulkeutumassa (12v) — priorisoi tekniikkatyö nyt
```
*Eliittiviite = `TK_LAJIVIITTEET` (§6), EI mitali — mitali vain kokonaisajasta.

### 5.3 Pelaaja (Pelaaja_v7) — §7.22 positiivinen kehystys, EI vertailua muihin
```
★ Vahvuutesi: Kuljetus-laukaus — maan kärkitasoa!
🎯 Seuraava taso: pujottelu alle 20.0 s (nyt 22.5 s)
   Pieni askel joka treenissä riittää.
📈 Paransit kokonaisaikaasi 6 sekuntia — hieno suunta!
```
- Yksi kehityskohde kerrallaan, konkreettinen sekuntitavoite.
- Abs-delta aina ensin; TKI-laskua ei näytetä punaisena jos abs-delta ≥ 0.
- Ei sijoituksia, ei muiden tuloksia, ei "putoat pronssilta" -kieltä.

### 5.4 Vanhempi (Vanhempi_v2 Kortti-tab) — neljäs kieli: tukemisen kieli (§7.22-perheviestintä)
```
⭐ Vahvuus: Kuljetus-laukaus — tämä on Topiaksen vahvin laji!
🎯 Seuraava askel: Syöttö (nyt 44.1 s → tavoite 41.0 s)
   Pieni parannus joka treenissä riittää.
💛 Miten tukea kotona: Syöttötarkkuus kehittyy leikinomaisella toistolla…
   Tärkeintä: kehu yrittämistä ja harjoittelua, ei tulosta.
```
- **SAMA data ja positiivinen kehys kuin pelaajalla** — ei enempää dataa, vaan enemmän kontekstia.
- Vahvuus ensin · prosessikehu tuloskehun sijaan (Dweck) · autonomiaa tukevat vinkit (Deci & Ryan SDT).
- Vanhemmalle EI KOSKAAN: kohorttitasolukuja (T1–T5)/percentiilejä · TKI-laskua/punaisia deltoja ·
  vertailua muihin · uhka-/kiirekehystä. Painostusmekanismi: lapsi ei ahdistu datasta vaan vanhemman
  paineesta (vanhempien tulosvertailu = nuorisourheilun dropout-tekijä) → tukikieli, ei tuloskieli.
- Lajipalkit: täyttö = hyvyys (sama clamp(100×erinomainen/arvo,10,100) kuin Pelaaja_v7).

---

## 6. DATARAKENNE — uudet vakiot ja pikakentät

### 6.1 `TK_LAJIVIITTEET` (docs/testit_indeksit.js, UUSI)
```javascript
// Per-laji viitetasot valtakunnallisesta loppukilpailudatasta 2024–25.
// erinomainen = finalistien P25 · hyvä = P50. kehitettävä = > hyvä.
// EI mitali — mitali jaetaan vain kokonaisajasta (§31).
const TK_LAJIVIITTEET = {
  P: { 12: { pujottelu: { erinomainen: 16.5, hyva: 19.0 }, /* ... */ } },
  T: { /* ... */ }
};
```
Suunta: kaikki lajit sekunteja, pienempi=parempi (pituuspotku → bonus-sekunnit,
suurempi bonus = parempi → käännetty vertailu).
**Edellytys: loppukilpailujen per-laji-raakadata 2024–25** (PDF-parseri on jo —
ajetaanko loppukilpailu-PDF:t läpi aggregointiskriptillä?).

### 6.2 Pikakentät (pelaajadokumentti, merge:true)
```
tk_lajit_viimeisin: { ponnauttelu_s, syotto_s, pujottelu_s,
                      kuljetus_laukaus_s, pituuspotku_bonus_s }   ← §31 edellytys
tk_kokonaistulos_viimeisin: number (s)
tk_kokonaistulos_edellinen: number (s)     ← abs-deltaa varten
tk_kokonaistulos_edellinen_pvm: string
```
Kirjoitus: TK-tuonti (Excel + PDF) + recalc. Edellinen vangitaan VAIN aidolla
uudella testillä (pvm-vahti, §29 VAIHE 2 -pattern).

### 6.3 Uudet funktiot (testit_indeksit.js + Vitest-testit)
```javascript
tkVaadittuVuosivauhti(ika, sp, taso)        // → s/v | null (§3.3)
tkSekuntibudjetti(kokonaistulos, ika, sp)   // → {tavoite:'pronssi', gap_s}
tkLajiGapit(tk_lajit, ika, sp)              // → [{laji, gap_s, viitetaso}] järjestettynä
tkAbsDelta(nyt, edellinen, ikaNyt, ikaEd)   // → {abs_s, validi:bool, bonus_osuus_s}
```

---

## 7. TOTEUTUSJÄRJESTYS

1. ✅ VALMIS (2026-06-10): Loppukilpailudata 2023–25 → `TK_LAJIVIITTEET`
2. ✅ VALMIS (commit 3e47a68): pikakentät 4 kirjoituspisteeseen, `_tkLajitPikakentat`-
   helper, `_edellinen` pvm-vahdilla (Excel + recalcIka), recalc nollaa kun ei TK:ta
3. ✅ VALMIS (3e47a68): 5 funktiota + 30 Vitest-testiä (115 vihreää yht.)
4. ✅ VALMIS (3e47a68): Master_v16 `_buildTKIDetail` — per-laji-rivit + sekuntibudjetti
   + vauhtirivi + 3-tason kultaikkuna; fallback vanhaan paneeliin kun ei pikakenttiä
   ⚠️ DATA: `tk_lajit_viimeisin` täyttyy vasta kun "↻ Laske TKI uudelleen" -recalc
   ajetaan Sibbolle + KPV:lle (Excel_Tuonti, SA)
5. ⏳ VAIHE 2: VP kehityskohde-klusterointi + vauhtisignaali (§5.1)
6. ⏳ VAIHE 2: Pelaaja_v7 tekniikkatavoite-kortti (§5.3, §7.22-kehystys)

## 8. AVOIMET KYSYMYKSET — PÄIVITETTY 2026-06-10 (data saatu ja parsittu)
1. ✅ RATKAISTU: Loppukilpailudata 2023+2024+2025 parsittu (84 riviä, summavalidointi
   0 virhettä) → `docs/tk_lajiviitteet.js` (TK_LAJIVIITTEET-vakio, valmis mergeen) +
   raakadata `docs/data/taitokisa_2023_2025.json` + parseri `docs/data/parse_taitokisa.py`.
   n per ryhmä: P9=16 · P10=8 · P12=12 · T9=18 · T10=13 · T11=8 · T12=7.
   **P11 poistettu (n=2, vain 2023)** — ei viitetasoa, EI interpoloida (radat ikäluokkakohtaisia).
2. ✅ RATKAISTU: Radat EIVÄT ole identtisiä ikäluokkien välillä (esim. P9 syöttö ~23 s
   vs P10 ~37 s — eri rata). → Abs-delta-vertailu (§3.3.1) validi vain ikäluokissa joissa
   merkkirajat jatkuvat loogisesti; per-laji abs-vertailu yli ikäluokkarajan EI validi.
   Vauhtilaskenta nojaa ensisijaisesti TKI-deltaan + kokonaisaikaan saman rajaston sisällä.
3. ✅ PÄÄTETTY: P25/P50 (erinomainen/hyvä), pituuspotku_bonus käännettynä P75/P50.
   Percentiilit robusteja outliereille (esim. T12 ponnauttelu max 40.0 s ei vääristä).
4. AUKI: Näytetäänkö vauhtisignaali vanhemmalle (Vanhempi_v2)? Ehdotus: kyllä, samalla
   positiivisella kehystyksellä kuin pelaajalle.
5. UUSI: PDF:ien merkkirajat täsmäävät TK_KOKONAISRAJAT-koodiin (ainoa poikkeama:
   T10 hopea 2023 = 133, koodi/2024–25 = 135 — ei toimenpidettä, koodi seuraa uusinta).
6. UUSI: Viitetasot päivitetään vuosittain uuden loppukilpailun jälkeen ajamalla
   parseri uudella PDF:llä (`docs/data/parse_taitokisa.py`).
7. ✅ TOTEUTETTU 2026-06-10: **viitetasot ikäluokille joita ei ole valtakunnallisissa
   rakennettu alueellisten kilpailujen parhaista — TÄYSI KATTAVUUS P8–P13 + T8–T13.**
   - **PÄIVITETTY 2026-06-11:** alueviite = **Palloliiton tuloskooste 2023–2025** (CSV).
     ~60 kilpailua / 4 aluetta, **3 477 uniikkia pelaajaa** dedup-validoinnin jälkeen;
     summavalidointi + järkevyyssuodatus; **top-20 kokonaisajalla** per ikä/sp → erinomainen=P25 · hyva=P50.
   - Generaattori: **`docs/data/parse_taitokisa_csv.py`** (korvaa aluelähteenä parse_taitokisa_alue.py:n;
     vuosipäivitys = lisää uusi CSV + aja). Raakadata: `taitokisa_alue_2023.csv`/`_2024.csv`/`_2025.csv`
     + aggregaatti `taitokisa_alue_2023_2025.json`.
   - Alueellisina (kaikki **_n=20**, pooli 139–490/luokka): **P8 · P11 · P13 · T8 · T13.**
     Valtakunnalliset säilyvät 9/10/12-v + T11:lle. Pooli ei enää suuntaa-antava → label "(suuntaa-antava)" pudotettu.
   - Muutokset edelliseen: P8/T8 kiristyivät selvästi (laajempi pooli), P11 ponnauttelu/KL kiristyivät,
     P13 vahvistui (n 7→20), T13 KL 11.0→14.1 (vanha tuli 11 pelaajan otoksesta).
9. PÄÄTÖS 2026-06-11: **koko historia 2013–2022 EI viitteisiin** — taso on noussut, vanha data
   löysentäisi tavoitteita. 2013– data varattu **trendi-/seura-analyysiin** (tuleva).
8. ⚠️ KOODIKORJAUS SUOSITELTU: **TK_KOKONAISRAJAT T13 pronssi = 130 koodissa, mutta
   KAKSI riippumatonta alueellista PDF:ää (Pohjoinen 2024 + Eteläinen 2025) näyttävät
   135.** Suositus: päivitä koodiin 135 (docs/testit_indeksit.js + inline-kopiot) —
   varmista halutessasi SPL:n sääntödokumentista. Muut rajat (P8–P13, T8–T12) täsmäävät.
10. ✅ TOTEUTETTU 2026-06-11: **NELJÄS VERTAILUTASO — `TK_LAJITASOT` (1–5 populaatioviite).**
    Erona eliittiviitteeseen (top-20 → erinomainen/hyvä) tasot lasketaan **KOKO kilpailupoolista**
    (rajat = kohortin P20/P40/P60/P80; `tkLajiTaso` STRICT <). Käyttö: valmentaja/VP-populaatioviite +
    tuleva D2/OVR-input. **Pelaajalle EI tasolukua (§7.22).**
    - **Otosvaraus:** otos = kilpailuihin OSALLISTUNEET (kilpailukohortti) ≠ väestönormi → taso kuvaa
      sijoittumista kisaajien joukossa, ei koko ikäluokassa. Dokumentoitava UI:ssa.
    - **Cap-saturaatio:** keskeyttäneet/maksimiajat (40 s ponnauttelu, 60 s syöttö) → taso 1. Nuorimmissa
      (esim. P10–P12 ponnauttelu) iso osa kohortista maksimiajassa → **välitasot 2–3 degeneroituvat**
      (rajat romahtavat maksimiin); tarkoituksellista — taso erottelee vain kärjen.
    - **Empiirinen FINAL2024-ankkurointi** (todennettu pujottelu+syöttö P10–P13 / T10–T13, desimaalin tarkkuudella):
      H-H **taso 3 = kohortin top 0–6 % ≈ TK-mitalitaso**; H-H **taso 2 = top 15–33 % ≈ TK taso 5 -raja**.
      H-H pujottelu/syöttö arvioidaan silti FINAL2024-normilla, TK-tulos `TK_LAJITASOT`:illa — **EI ristiin (§30).**
