# Datamalli — teknis-taktinen curriculum (`lib/tm_teknistaktiset.js`)

> Lähde: `Master_kokonaisuus.xlsx` (Ekkono-pohjainen talon metodi, yksityinen §ANALYYSI). Tämä on **datamallin suunnitelma** — miten curriculum mallinnetaan dataksi + kytketään `ARVIOINTI_KEHYKSET`-rekisteriin ja §26-pikakenttiin. **Ei koodia vielä.** Noudattaa `tm_arviointi_taksonomia.js`-patternia + §30 (raakadata → indeksit koodissa) + §34 (generoitu lib + parseri, vuosipäivitys).

## 0. Päätökset (2026-07-05) + Excel-status
- **Pelipaikkakoodit = suomalaiset (talon standardi):** `T` (toppari) · `LP` (laitapuolustaja) · `KK` (keskikenttä) · `KY` (kymppi) · `KH` (keskushyökkääjä) · `LA` (laituri) · `MV` (maalivahti). Lib + parseri käyttävät näitä (EI CB/FB/MID/AMID/ST/WI/GK). Koodimuoto: pelipaikka + vaihe(P/H) + numero (+ alakirjain), esim. `LA-H6b`, `T-P4a`.
- **Excelin gap-tarkistus tehty:** nykyinen `Master_kokonaisuus.xlsx` on jo ~rakenteellisesti sääntöjen mukainen (16 välilehteä, sarakkeet, Valitsin 1–5-asteikko selitteineen, YHTEENSÄ + kehityssopimus). **Excel-päivitys LYKÄTTY** (erillinen tehtävä): koodinvaihto CB→T ym. + kaavat (Ero=Valm−Itse, Harjoitesuositus=VLOOKUP kun ≤2) + vaihenimet (Perusvaihe 6–9 / Yhteispelivaihe 10–14 / Pelipaikkavaihe U15→) + termi-/tyylinormalisointi. Ei estä parseria (parseri lukee sisällön, ei kaavoja).
- **Käsitehierarkia (Excelin sääntö → lib):** numerotaso = TEEMA (ei valmenneta), kirjaintaso = KONSEPTI = KPI (opetetaan/arvioidaan). Libissä `alakonseptit[]` = arvioitavat KPI:t; teema = ryhmittelevä otsikko.

## 0b. JAETTU YMMÄRRYS -INVARIANTTI (Teron linjaus — EHDOTON)
**Konseptia ei voi harjoitella eikä kehittää jos sitä ei ymmärrä — ymmärryksen pitää olla sekä valmentajalla että pelaajalla, kummallakin omalla kielellään.** Jokainen KONSEPTI (kirjaintaso) kantaa siksi pakollisen ymmärrys-kerroksen, joka renderöityy kahdesti:
- **Valmentaja (opettaa + arvioi):** `ydinkonsepti` ("mitä tulee ymmärtää") + `perustelu` (miksi, ääneen sanottava periaate) + `kriteerit` (1/3/5) + `kysymykset` (cue) + `harjoitteet`. Täysi opetuskerros.
- **Pelaaja (ymmärtää + omistaa, §7.22):** konsepti omalla kielellä — *mikä tämä on* + *miksi se auttaa pelissä* + yksi cue-kysymys `Kysymyspankista`. **EI kriteeritasoa 1 ("ei näy"), ei arvosanaa, ei vertailua** — pelaaja oivaltaa kysymyksen kautta ("kysymys tekee älykkään, käsky tottelevaisen"). SDT-autonomia + Dweck-prosessi.
Lib-tuki: jokaisella item-objektilla `ydinkonsepti` + `perustelu` + `kysymykset` (jo mallissa); render valitsee kerroksen roolin mukaan. Tyhjä ymmärrys-kenttä = laatupuute (parseri varoittaa).

## 0c. PELI-LINKITYS -INVARIANTTI (Excelin avainperiaate — EHDOTON)
**Konsepti opetetaan, havainnoidaan ja arvioidaan AINA pelitilanteen kautta joukkuekontekstissa — ei koskaan irrallisena harjoitteena.** Tämä on Excelin Polku-välilehden avainperiaate ja koskee kaikkia vaiheita.
- Jokaisella konseptilla **`pelitilanne`** (mikä pelin tilanne se on, esim. "kuljetanko vai syötänkö", "tiloihin hyökkääminen") + **`pelimuoto`**. **Viralliset pelimuodot: `3v3 · 5v5 · 8v8 · 11v11`** (`TM_TT_PELIMUODOT`), skaalautuu iän mukaan (3v3 nuorimmat → 11v11 U13+).
- **KIELI: vain suomi, selkokieli — ei vieraskielisiä termejä.** Excelin pelitilanteissa on englanninkielisiä sulkeita ("Get the ball", "Attacking spaces", "In charge of my space") → parseri **poistaa englannin**, lib käyttää vain suomea.
- **Näkemyksen laajeneminen — pelimuoto = havaintopiirin koko** (`TM_TT_NAKEMYS`, 4 porrasta, suomeksi):

  | Vaihe | Pelimuoto | Ikä |
  |---|---|---|
  | **Minä ja pallo** | 3v3 | ~6–7 |
  | **Minä ja kaveri/vastustaja** | 5v5 | ~8–9 |
  | **Minä ja ryhmä** | 8v8 | ~10–12 |
  | **Minä ja joukkue** | 11v11 | ~13–14 |

  Lapsi aloittaa itsestään ja pallosta → suhde kaveriin/vastustajaan → ryhmä → koko joukkue. Kaveri-/vastustaja-erottelu + hyökkäys/puolustus tarkentuvat **konsepteissa**, ei vaihetasolla. Pelimuoto ei ole vain kentän koko vaan havaintopiirin koko. **Vain suomi — ei "egosentrinen"/"summatiivinen".**
- **Vahvistaa §7b:tä** (pelaaminen-linkitys) konkreettisella datalla: fokus/tavoite/harjoite viittaavat aina `pelitilanteeseen` + `pelimuotoon`, ei abstraktiin taitoon. UI näyttää konseptin AINA pelitilanteen kautta.
- **Rajaus:** järjestelmä kattaa teknis-taktisen (pelikäsitys + tekniikka pelissä). Fyysis-motorinen ja psyykkinen ovat omat polkunsa (kytkeytyvät 5D-profiiliin erikseen).

## 1. Periaatteet (mihin malli nojaa)
- **SSOT-lib** `lib/tm_teknistaktiset.js`, **generoitu** Excelistä parserilla (kuten `tk_lajiviitteet.js` §34). Ei käsin ylläpidettävä; Excel = lähde, lib = totuus koodissa.
- **Kehys-rekisteri:** curriculum on **oma kehys** `tm_teknistaktinen` `ARVIOINTI_KEHYKSET`:ssä (TM-oletus teknis-taktiselle; korvattavissa per seura — identiteetti-invariantti).
- **Vaihe-gating (§28):** youth-konseptit aktiivisia yksilövaiheessa (kaikille); pelipaikkafundamentit aktivoituvat Master-vaiheessa + kun `positio` asetettu. "Pelipaikka = konteksti, ei uusi sisältö."
- **Skaala:** youth **1–3** ja Master **1–5** säilytetään natiiveina (omat kriteeri-ankkurit); IDP/5D-laskentaan normalisoidaan 1–5:een kaavalla `(t-1)/(max-1)*4+1` (sama idea kuin H-H 3-port→5-port §26).
- **§26:** arvioinnit → pikakentät; ei alikokoelmakyselyjä renderissä.

## 2. Lib-rakenne (`lib/tm_teknistaktiset.js`)

### 2.1 Asteikot + kriteerit
```js
TM_TT_ASTEIKKO = {
  youth:  { max:3, tasot:{ 1:{fi:'Ei näy pelissä'}, 2:{fi:'Näkyy ohjatusti'}, 3:{fi:'Näkyy itsenäisesti'} } },
  master: { max:5, tasot:{ 1:{fi:'Ei näy'}, 3:{fi:'Osaa'}, 5:{fi:'Hallitsee'} } }   // 1/3/5 ankkurit, 2/4 väliin
}
```

### 2.2 Youth-konseptit (14 — yksilövaihe)
```js
TM_TT_YOUTH = [
  { avain:'y_h0', koodi:'Y-H0', nimi:'Havainnointi (tiedon kerääminen)',
    dim:'D4', faasi:'hyokkays', lapileikkaava:true,
    ika:{min:6,max:14},
    pelitilanne:'Kuljetanko vai syötänkö / pelaaminen omalta pelipaikalta',  // PELI-LINKITYS (Sisältö-sarake, vain suomi)
    pelimuoto:['3v3','5v5','8v8','11v11'],   // TM_TT_PELIMUODOT — viralliset muodot, skaalautuu iän mukaan
    alakonseptit:[ { koodi:'Y-H0a', nimi:'Diagonaalinen sijoittuminen', ika:{…} }, … ],
    kriteerit:{ 1:'…', 2:'…', 3:'…' },              // §7 avoin: onko youthilla kriteerit?
    kysymykset:['Mitä näit ennen kuin pallo tuli?', …]   // Kysymyspankista
  }, …  // Y-H0..Y-H9 (10 hyökkäys) + Y-P1..Y-P4 (4 puolustus)
]
```

### 2.3 Pelipaikkafundamentit (Master — 7 pelipaikkaa)
```js
TM_TT_PELIPAIKAT = {
  MV:{nimi:'Maalivahti', numerot:[1]},         LP:{nimi:'Laitapuolustaja', numerot:[2,3]},
  T:{nimi:'Toppari', numerot:[4,5]},           KK:{nimi:'Keskikenttä', numerot:[6,8]},
  KY:{nimi:'Kymppi', numerot:[10]},            LA:{nimi:'Laituri', numerot:[7,11]},
  KH:{nimi:'Keskushyökkääjä', numerot:[9]}
}   // numerot = alias (valmentaja/pelaaja puhuu "kympistä"/"ysistä" → sama pelipaikka)

TM_TT_FUNDAMENTIT = {
  T:[ { avain:'t_p1', koodi:'T-P1', vyohyke:'RA ulkopuolella',
         nimi:'Puolustustasapainon ylläpitäminen', dim:'D4', faasi:'puolustus',
         alakonseptit:[ {koodi:'CB-P1a', nimi:'…'}, … ],
         kriteerit:{ 1:'Linja hajoaa; väärä syvyys', 3:'…', 5:'…' },   // ANKKURIT (laatuloikka)
         ydinkonsepti:'Linja liikkuu yhtenä yksikkönä…',                // Ydinkonseptit-sivu
         harjoitteet:['CB-P1'],                                         // → TM_TT_HARJOITTEET
         kysymykset:[…] }, …8 fundamenttia ],
  FB:[…], MID:[…], AMID:[…], ST:[…], WI:[…], GK:[…]
}
```

### 2.4 Matriisi · Silta · Kausimalli · Harjoitepankki
```js
TM_TT_MATRIISI = { P1:{vyohyke:'RA ulkopuolella', CB:'Puolustustasapaino…', FB:'…', …},
                   … 16 koodia (P1–P8 + H0–H7) × 7 pelipaikkaa }

TM_TT_SILTA = {                                    // per pelipaikka: mitä syvennetään + 1. Master-fundamentit
  CB:{ syvenna:['Y-P1','Y-P2','Y-P3','Y-P4','Y-H2','Y-H0'],
       ensimmaiset:['CB-H0','CB-P2','CB-P3','CB-H3'] }, …
}
TM_TT_KAUSIMALLI = { max_per_kausi:4,
  jarjestys:['H0_ensin','pelipaikan_identiteetti','yleisin_puolustus','rakentelurooli'] }

TM_TT_HARJOITTEET = { 'CB-P1':{ pelipaikka:'CB', teema:'Puolustustasapaino',
                                painopisteet:'Linjapuolustusharjoitteet 4v4–8v8…' }, … 94 }
```

### 2.5 Kehys-rekisteröinti + apurit
```js
// tm_arviointi_taksonomia.js:iin kehys tm_teknistaktinen (taksonomia johdetaan curriculumista)
ARVIOINTI_KEHYKSET['tm_teknistaktinen'] = { avain:'tm_teknistaktinen', nimi:'Teknis-taktinen (talon metodi)',
  asteikko:TM_TT_ASTEIKKO, taksonomia: /* youth + fundamentit itemeiksi */ }

tmTtItems(pelaaja)      // → aktiiviset itemit: youth AINA (pelipaikaton); fundamentit VAIN jos vaihe=pelipaikka & positio → T[…]
tmTtVaihe(pelaaja)      // 'perus'|'yhteispeli'|'silta'|'pelipaikka' iästä/PHV:stä (§28) + Silta-tarkistuslistan tila
tmTtKriteeri(avain, taso)   // rubriikki-ankkuri arvioijalle
tmTtKysymykset(avain)  // cue-kysymykset (§7.22-turvallinen valmentaja/pelaaja)
tmTtNorm5(avain, taso) // youth 1–3 → 1–5 IDP/5D-laskentaan
```

## 3. Arviointidata per pelaaja (Firestore + pikakentät)
Uudelleenkäytetään olemassa oleva `arviointi/{kausiId}`-mekanismi (Vaihe 2), oma nimiavaruus `tt` ettei törmää attribuutti-havaittuun:
```
seurat/{sid}/pelaajat/{pid}/arviointi/{kausiId}
  kehys:'tm_teknistaktinen'
  tt_havaittu: { <avain>: { valm:1–5, itse:1–5, ero:(valm−itse), arvioija_uid, pvm, huomiot } }
```
**Vaihemalli (pelipaikaton → pelipaikallinen):**
- **Perusvaihe (6–9)** + **Yhteispelivaihe (10–14)** = yksilövaihe, **EI pelipaikkoja** — vain 14 youth-konseptia (ikäpaino ohjaa mitä painotetaan milloinkin, esim. Y-H1 haltuunotto 6–9, Y-H2 syöttäminen 10–13).
- **Silta (U14–15)** = tarkistuslista + ensisijainen + ≥1 toissijainen pelipaikka valitaan (ei vielä lukita).
- **Pelipaikkavaihe (U15→)** = pelipaikkafundamentit aktivoituvat. **Vasta tässä `positio` ohjaa arviointia.**
- U13-pelaajalla `tt_positio_aktiivinen` = null → IDP-fokus + jaksot tulevat youth-konsepteista (+ fyysinen), EI pelipaikasta.

**Pikakentät pelaajadokkiin (§26):**
- `tt_vaihe` ('perus'|'yhteispeli'|'silta'|'pelipaikka') · `tt_positio_aktiivinen` (pelipaikkafundamenttien pelipaikka, null ennen U15)
- `tt_arviointi_pvm` · `tt_kattavuus` (arvioitu/aktiiviset)
- `tt_heikoin` `{avain, nimi, valm, faasi}` → **IDP-fokuskandidaatti** (kytkös 3a)
- `tt_silta_valmis` (bool — 14 youth-konseptia tasolla 3 → erikoistumislupa)

## 4. Kytkökset olemassa oleviin vaiheisiin
- **Vaihe 2 (arviointi):** teknis-taktinen välilehti/osio lukee `tmTtItems(p)` + näyttää **kriteeri-ankkurit** (tmTtKriteeri) → havaittu-arvio (valm) + itsearvio (itse). Sama UI-pattern kuin nykyinen havaittu 1–5.
- **Vaihe 3a (IDP-fokus):** `idpKeraaKandidaatit` lukee `tt_heikoin` (+ tt_havaittu ≤ kynnys) → teknis-taktinen kohde nousee tavoitteeksi. **Pelilähtöinen fokus by design** (§7b) — curriculum on pelitilannelähtöinen.
- **Vaihe 3b (review):** `valm` vs `itse` = kaksisuuntainen (pelaaja arvioi ensin → ero → valmentaja). Excelin Valm/Itse/Ero = 3b:n review-rakenne suoraan.
- **Vaihe 4 (jakso/mesosykli):** kohde → `tmTtKysymykset` (cue) + `tmTtHarjoitteet` (Harjoitepankki) → jakson sisältö + auto-harjoitesuositus.
- **Erikoistuminen (I3):** `tt_silta_valmis` + `positio`/`positio_2` (2d) → aktivoi `TM_TT_SILTA[positio].ensimmaiset` (kausimallin 1. kausi).

## 5. Parseri + versiointi (§34-pattern)
`docs/data/parse_master_kokonaisuus.py` (Excel → `lib/tm_teknistaktiset.js`). Idempotentti, ajetaan kun curriculum päivittyy. Vitest lukitsee: 14 youth-konseptia, 7 pelipaikkaa × N fundamenttia, kriteerit-ankkurit olemassa, Silta-mäppäys, norm5-muunnos. Lib `?v` nostetaan lataajissa.

## 6. Invariantit
§30 (data, ei kovakoodattu UI) · §26 (pikakentät, ei alikokoelmakyselyä) · §7.22 (kriteeri taso 1 = "ei näy" on aikuisten työkalu; pelaajalle pelilähtöinen + Kysymyspankki-cue) · §7b (curriculum on pelitilannelähtöinen) · §28 (vaihe-gating iästä/PHV:stä, ei aikaista lukitusta) · identiteetti-invariantti (kehys korvattavissa) · IP (yksityinen/Ekkono → ei julkista Ekkono-brändiä, ei copyright-materiaalin toistoa).

## 7. Avoimet ennen parseria (§ANALYYSI §7)
Youth-kriteerit (onko 1/2/3-ankkurit auki?) · auto-harjoitesuosituksen logiikka (koodilinkki vs erillinen) · skaalan esitys (natiivi vs normalisoitu) · fundamenttien lopullinen määrä/pelipaikka.
