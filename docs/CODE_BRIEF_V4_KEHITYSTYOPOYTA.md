# CODE_BRIEF_V4_KEHITYSTYOPOYTA — Kehitystyöpöytä V4 (Kenttä)

**Kaista: Tero** (Master_v16, VP_v25, `lib/`; Rules jos kohdan §3 selvitys sitä vaatii). PR-kuvauksen ensimmäinen rivi on "Kaista: Tero".
**Tila:** tarkastettu 7.10.2026 (projektinvetäjä), valmis Codelle
**Design:** noudata 18:aa ja 13:a; raportoi PR:ssä, mitä kohtaa kustakin noudatat. Mockup 18 lataa fontit Google Fontsista (vain design-dokumentti) — toteutus `@fontsource`-paketeista (D11).
**Mockup:** `18_kehitystyopoyta_v4.html` (artefakti 18) · edeltäjä 13 (`13_kehitystyopoyta_kentta.html`)
**Päätökset:** D46–D53 (tämä briiffi), nojaa D23–D25 (13), D38 (16), D30 (15), K3/K4-briiffeihin
**Periaate:** P-taso (ks. §0) — vie 07:ään

---

## §0 Periaate (P-taso, 07:ään)

Järjestelmän tehtävä on opettaa reflektiota ja vastuuta vähitellen: pelaaja ottaa vastuuta ikävaiheen mukaan, valmentaja antaa palautetta, perhe tukee. Tästä seuraa viisi sääntöä, jotka ohjaavat jokaista V4:n valintaa:

1. **Silmukka sulkeutuu ihmisen lauseella**, ei mittarilla. Jakson päätös = valmentajan (tai VP:n) lause pelaajalle.
2. **Opetetaan tekemällä seuraava askel helpoksi, ei muistuttamalla.** Yksi nappi, kolme kysymystä, ≈ 10 s.
3. **Pelaajan odotus menee valmentajan myöhässä olevan katselmuksen edelle** (D48). Pelaaja ei koskaan näe, että valmentaja on "myöhässä".
4. **Oto-valmentajaa ohjataan, ei rangaista** (D50). Kaksi profiilia, sama data.
5. **VP voi aina tehdä kaiken** valmentajan puolesta; teko merkitään VP:n tekemäksi.

---

## §1 Mitä V4 on

Masterin pelaajanäkymä korvataan koko ruudun kehitystyöpöydällä (13: Tänään · Polku · Näyttö). Otsikkorivi kertoo aina missä pelaaja on (jakson tila) ja yksi ensisijainen nappi vie seuraavaan askeleeseen. Sama komponentti VP_v25:ssä roolilla `henkilokunta` (D38). Lippu `TM_LIPUT.tmKenttaLippu(julkiset, seuraDoc)`; ilman lippua kaikki ennallaan.

**Ei tässä briiffissä:** Viikko-välilehti (tulee 14:n kanssa), seuran kooste (17), kausisuunnitelma (15), täyden katselmuksen uudistus (09 §6 pysyy), pelaajasovelluksen muutokset K3/K4:n yli, huoltajan näkymä (K5), ilmoitukset/notifikaatiot.

---

## §2 Osat

### V4a — Näkymä ja tilakone (ensin)

| # | Tehtävä | Päätös |
|---|---|---|
| 1 | Pelaajalistan rivi → koko ruudun näkymä, URL `#pelaaja/{pid}/tanaan` (ei modaali). Edellinen/seuraava listan järjestyksessä. | D46 |
| 2 | Otsikkorivi: ‹ › · nimi · joukkue · ikävaihe · PHV · jakson tila · ensisijainen nappi · ··· valikko · "Pelaajan silmin". Ei vieri pois. | D46 |
| 3 | Näkymä tarkistaa oikeuden itse (oma joukkue / talenttivalmentaja / VP ja johto oma seura / SA) → "Ei oikeutta" -tila. Rules tekee saman. (CLAUDE.md:n "suojatut alaikäiset vain luku" on Clauden/Coden testaussääntö, ei tuotteen ominaisuus.) | D46 |
| 4 | `tm_aloita_jakso.tmJaksoNappi` laajennetaan palauttamaan `{tila, ensisijainen, valikko[], rivitila}` → otsikkorivi, valikko ja J4-listan rivitila yhdestä funktiosta. | D47 |
| 5 | Tilat: `ei_jaksoa` → `kaynnissa` → `paattynyt` (suljettava) → `valittavana` (K3) → `valinta_tehty` → `vahvistettu`. Siirtymät ja napit: ks. mockup §2. **Tilat JOHDETAAN, niitä ei tallenneta:** käynnissä = jaksofokus ilman `tila`-kenttää · päättynyt = päivämääristä (`tm_jakso_malli`) · `valittavana` = ainoa tallennettu tila (K3) · valinta tehty = `valittavana` + `ydinvahvuus_valinta` · vahvistettu = V1:n vahvistus (ei `tila`-kenttää) + `idp_sitoumus_pvm` puuttuu. Dataan ei tule uusia `tila`-arvoja (K3:n pelaajapuoli `tmPelaajanVaihtoehdot` ja V1 nojaavat nykymalliin). | D47 |
| 6 | "Anna pelaajan valita" vain, kun ase on olemassa (ase pakollinen). | D47 |
| 7 | Typografia: sivu Cormorant + DM Sans, kenttäkomponentti Archivo (D37 C). | D51 |

### V4b — Kevyt katselmus, signaali, profiili

| # | Tehtävä | Päätös |
|---|---|---|
| 8 | Kevyt katselmus -sheet: 3 kysymystä (Näkyikö ase? Treenattiinko? Oliko mukana?) + lause pelaajalle (≤ 140 merkkiä, sama validointi kuin K4: `tm_viikkokatsaus.tmVkLauseValmentaja` — KIELLETYT + ei lukuja) + valinnainen K3 "Anna pelaajan valita" (vaihtoehtokohtainen lause ≤ 120, K3) → **yksi tallennus**. | D47 |
| 9 | Tallennus: `jaksofokus_historia[]`-rivi saa `lause` (K4:n paikka, ennallaan) + `lause_lahde:'valmentaja'|'vp'`; tarvittaessa `jaksofokus={tila:'valittavana', vaihtoehdot[]}` (K3-muoto). Kolmen kysymyksen vastaukset (`katselmus:{ase,treeni,mukana}`, arvot SANOINA kuten K4: esim. `ei_viela|ohjatusti|itsenaisesti`, ei numeroita) — paikka selvitetään ennen koodausta, ks. §3 selvitys (a). | D47 |
| 10 | "Syvennä" → täysi katselmus (09 §6) esitäytettynä kolmella vastauksella. | D47 |
| 11 | Sunnuntain pyyntö valmentajalle samaan aikaan kuin pelaajan viikkokatsaus (K4) = **Tänään-signaali ja J4-rivitila, ei ilmoitusta/notifikaatiota** (ei uusia Rules-oikeuksia, kuten K3). Oto-profiilissa "kun ehdit", ei aikaikkunaa. | D47/D50 |
| 12 | Tänään-signaali: yksi signaali + pieni toinen rivi, järjestys: 1 kuorma_tarkista (§25) · 2 valinta tehty (Vahvista) · 3 suljettava · 4 valinta odottaa pelaajaa · 5 viikkokatsaus ei vastattu · 6 havainto · 7 ylläpito · 8 ei tietoa. | D48 |
| 13 | Katselmusikkuna 2 vk (12 D21); sen jälkeen `review_myohassa` porras 1 nostaa signaaliin **vain ammattiprofiilissa**. | D48/D50 |
| 14 | `joukkueet/{jid}.valmentajaprofiili: 'ammatti'|'oto'` (oletus `oto`; myös kun joukkuedokumenttia ei ole, §7.21), VP/johto asettaa. Näkyy valmentajalle, muutettavissa vain VP:n/johdon toimesta. Vaikuttaa vain oletuksiin ja sävyyn: lause pakollinen/toivottu, aloitusehdotukset osista (oto), aikaikkuna signaalissa (ammatti). | D50 |
| 15 | Pelaajalle näkyy aina "Hyvä jakso, X tehty" + valmentajan lause (jos on) + K3-valinta (K3/K4 jo tuotannossa — ei pelaajasovelluksen muutoksia). Ei kolmen kysymyksen vastauksia, ei profiilia, ei viivettä. | D48/§7.22 |
| 16 | Poistolista (D49): vanha pelaajamodaali, "Aseta jaksofokus" -pikanappi listassa, erillinen katselmus-nappi J4:ssä, 13:n väliaikaiset rivit. Poisto koodista **1.12.2026** kaikilta seuroilta (SJK ja muut myöhemmin tulevat seurat saavat suoraan uuden näkymän; Tero 7.10.). Siihen asti lipun takana. Poisto on oma PR. | D49 |

### Pikakorjaus (heti, ei odota V4a:ta)

| # | Tehtävä | Päätös |
|---|---|---|
| 17 | Virhetoast näkyviin: toast on olemassa, mutta jää modaalien alle (`#toast-wrap` z-index 500 vs `.detail-modal` 300, `_mAloitaJaksoModal`/`_mJjModal` 9000, VP 365). Nosta toast kaikkien modaalien yläpuolelle Masterissa ja VP:ssä + virhekoodi (`e.code`) toastiin kaikissa jakson tallennuksissa. Oma pieni PR, Teron kaista. | D53 |

---

## §3 Data ja Rules

| Polku | Muutos | Rules |
|---|---|---|
| `seurat/{sid}/pelaajat/{pid}.jaksofokus` | ennallaan: vain `tila:'valittavana'` + `vaihtoehdot[]` (K3); muut tilat johdetaan (§2 #5) | v3.37 riittää |
| `…pelaajat/{pid}.jaksofokus_historia[]` | rivi: `lause` (≤140, K4) + uusi `lause_lahde` | ennallaan (henkilökunnan allowlist kattaa kentän). Rules ei validoi taulukon rivien sisältöä → validointi clientissä/lib:ssä |
| kolmen kysymyksen vastaukset | selvitys (a): `jaksofokus_historia`-rivi vai olemassa oleva `reviewit/{pvm}` (`tmKirjaaKatselmus`), jossa Rules voi validoida kentät | päätä selvityksen mukaan |
| `…pelaajat/{pid}/viikkokatsaukset/{su-pvm}` | luetaan Tänään-avauksessa (kuluva viikko) | v3.44 (K4) |
| `seurat/{sid}/joukkueet/{jid}.valmentajaprofiili` | uusi, `'ammatti'|'oto'`, vain johto/SA kirjoittaa | v3.37: johdon update on jo sallittu; tarkista ettei valmentajan jaksokenttä-allowlist päästä sitä läpi, lisää enum-validointi (versio v3.46+) |
| `seurat/{sid}/liput/julkiset.kentta` | ennallaan (v3.43), fallback `seurat/{sid}.liput.kentta` K7:ään asti | — |

**Selvitykset ennen koodausta (raportoi ensin):**
- **(a)** Kolmen kysymyksen vastausten paikka: `jaksofokus_historia`-rivi vai `reviewit/{pvm}`? Suositus `reviewit`, jos se on henkilökunnan luettavissa ja Rules-validoitavissa; täysi katselmus (09 §6, "Syvennä") kirjoittaa jo sinne.
- **(b)** "Hylkää valinta" (mockup 18 §2) poistaa pelaajan `ydinvahvuus_valinta`-kentän. Henkilökunnan kirjoitus on rajattu `hasOnly([...jaksofokus, jaksofokus_historia])` → todennäköisesti estetty. Jos näin, Rules-muutos (v3.46+: henkilökunta saa poistaa `ydinvahvuus_valinta`:n, ei kirjoittaa sitä) tai jätä hylkäys pois V4a:sta.
- **(c)** Master_v16:n nykyinen reititys: onko hash-reititystä, ja miten `#pelaaja/{pid}/tanaan` sovitetaan siihen ja Back-nappiin.

**Latausjako (D52):** Tänään avaa 3 dokumenttia (pelaaja · liput · kuluvan viikon viikkokatsaus; joukkueen profiili listan välimuistista). Polku ja Näyttö lataavat vasta avattaessa (historia, testit, havainnot, bioikä).

**Ei health-dataa** Kenttä-komponenttiin: kuorma-signaali lukee vain lipun `kuorma_tarkista` (§25), ei `terveys/`-sisältöä.

---

## §4 Testit (Topias K., KPV U13)

1. Lista → rivi → koko ruudun näkymä, URL vaihtuu, ‹ › kulkee listan järjestyksessä, Back palaa listaan.
2. Jokainen kuudesta tilasta: otsikkorivin nappi, valikko ja J4-rivitila yhtenevät (sama funktio).
3. Kevyt katselmus: 3 vastausta + lause + K3 → **yksi** kirjoitus; `jaksofokus_historia` saa rivin, `jaksofokus.tila='valittavana'`; pelaajasovellus näyttää "Hyvä jakso" + lauseen + valinnan.
4. Kevyt katselmus ilman K3:a → `jaksofokus` tyhjenee/`tila:'paattynyt'`, nappi "Aloita jakso".
5. KIELLETYT-sana lauseessa → ei tallennu, selkeä viesti; 121 merkkiä → ei tallennu.
6. Signaalijärjestys: `kuorma_tarkista` voittaa valinnan; valinta tehty voittaa suljettavan; suljettava voittaa viikkokatsauksen.
7. Oto-profiili: 2 vk ylitys ei näy signaalissa; ammatti: näkyy "odottaa · n pv".
8. VP sulkee jakson → `lause_lahde:'vp'`, valmentaja näkee merkinnän.
9. Toisen joukkueen valmentaja → "Ei oikeutta"; Rules-emulaattori: valmentaja ei kirjoita `valmentajaprofiili`a.
10. Lippu pois → vanha modaali toimii; lippu päälle → modaalia ei avata mistään.
11. Tallennusvirhe (simuloitu) → toast näkyy (D53).
12. 390 px: otsikkorivi + signaali + nappi mahtuvat ensimmäiseen ruutuun ilman vieritystä; ei vaakavieritystä.
13. Lauseen raja: 140 merkkiä hyväksytään, 141 hylätään (sama funktio kuin K4).
14. Nykyinen data: käynnissä oleva jakso ilman `tila`-kenttää näkyy tilana "käynnissä"; K3:n pelaajapuoli toimii ennallaan.
15. Testidata palautetaan. Kirjoitukset vain KPV U13 -testipelaajille.
16. Koko sarja (myös `functions/`) viimeisen main-mergen jälkeen.

---

## §5 Päätökset D46–D53

| # | Päätös | Tila |
|---|---|---|
| D46 | Koko ruudun näkymä (A): URL, ‹ ›, otsikkorivi ei vieri; sama komponentti VP:lle | lukittu 7.10. (Tero) |
| D47 | Jakson tilakone yhdestä funktiosta; kevyt katselmus 3 kysymystä + lause + K3 yhdellä tallennuksella; ase pakollinen ennen "anna pelaajan valita"; sunnuntain pyyntö | lukittu 7.10. |
| D48 | Signaalijärjestys kuorma › valinta tehty › suljettava › odottaa pelaajaa › viikkokatsaus › havainto › ylläpito › ei tietoa; yksi signaali; pelaajan odotus ohittaa myöhässä olevan katselmuksen | lukittu 7.10. |
| D49 | Poistolista, poisto 1.12.2026 kaikilta seuroilta (SJK myöhemmin suoraan uuteen näkymään) — sulkee D39:n | lukittu 7.10. |
| D50 | Kaksi valmentajaprofiilia `ammatti|oto` joukkuetasolla, VP asettaa; VP aina ylin; profiili muuttaa vain sävyä ja oletuksia | lukittu 7.10. |
| D51 | Typografia = D37 C (sivu Cormorant + DM Sans, kenttä Archivo) | ehdotus — sulkee D37:n |
| D52 | Rivitila riittää J4-listassa (ei kenttää listaan); Viikko-välilehti 14:n kanssa; mobiilin ensilataus 3 dokumenttia | ehdotus |
| D53 | Virhetoast pikakorjauksena heti (z-index modaalien yläpuolelle + virhekoodi) | ehdotus |

---

## §6 Avoimet kysymykset toiseen sessioon

1. D51: suositus D37 C (sivu Cormorant + DM Sans, kenttä Archivo) — Tero lukitsee.
2. Katselmuksen kolme kysymystä: asteikot `ei vielä / ohjatusti / itsenäisesti`, `harvoin / joskus / usein`, `vähän / jonkin verran / hyvin` — tallennetaan sanoina (ei 0–2). Linjaus 17:n teemakattavuuteen myöhemmin.
3. Oto-profiilin aloitusehdotukset lauseeseen: generoidaanko osista deterministisesti (ei AI-kutsua) — ehdotus: kyllä, kolme mallilausetta osien nimistä.
4. Pitäisikö `valmentajaprofiili` näkyä valmentajalle itselleen vai vain VP:lle? Ehdotus: näkyy, muutettavissa vain VP:n toimesta.

## Lisäksi (Kieli, versiot)

- Uudet tekstit `masterT`-avaimiksi (fi); ruotsinkieliset jätetään määrittelemättä ja listataan PR:ään Geminin listalle.
- Sanasto: henkilökunnalle "ydinvahvuus" / "ase" (13), pelaajalle "vahvuus" ja "reitti".
- Uudet ja muuttuneet lib-tiedostot saavat `?v`-bumpin: `node scripts/lib_versiot.js --kirjoita` (portti `tests/lib_versiot.test.js`).
- Lippu pois → snapshot-testi: näkymät ennallaan.
