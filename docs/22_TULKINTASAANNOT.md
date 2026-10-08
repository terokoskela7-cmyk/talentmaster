# 22 · Tulkintasäännöt: syöte → lause · 9.10.2026

Nämä säännöt tuottavat Näytön todistekorttien ja Tänään-välilehden kolmen kysymyksen tekstit **datasta**, eivät kovakoodattuina. Yksi funktio per kortti `lib/`-moduuliin (D106), sama VP:lle ja Masterille. Lauseet ovat henkilökunnalle (luvut sallittu); pelaajalle ei näytetä mitään tästä (§7.22). Sanasto D54: "ydinvahvuus", ei "ase".

## Yhteiset säännöt
- **PHV-tila** luetaan vain `tmPhvTila(p)` → `PRE | LAH | PH | POST | AN | tuntematon`. Luetaan kerran, välitetään korteille.
- **Taso** = Eerikkilä-taso testihetken iästä: `eerikkilaTaso(arvo, testi, normiIka(syntymaVuosi, testipvm), sukupuoli)`. Ei koskaan nykyiästä (§14).
- **Datan ikä** = tänään − pvm. ≤ 3 kk: normaali · 3–6 kk: `age.old` (amber) + "mittaus yli 3 kk vanha" · > 6 kk (`tmOnVanhaMittaus`): amber + "Päivitä mittaus" nousee **ensisijaiseksi** linkiksi; tulkinta, luvut ja toinen linkki säilyvät (vanhakin suunta on oto-valmentajalle arvokas · Gemini 9.10.). Päivä aina muodossa pp.kk.vvvv + "n kk" tai "n vk".
- **Trendi** (kun edellinen on): nousussa / ennallaan / laskussa. Kynnykset: taso ±0,5 · TKI ±3 · FLEI ±5 · ADAR ±0,5. Sparkline piirretään vain, jos pisteitä ≥ 2, ja aina samasta lähteestä (`testitulokset`), ei pikakentän historiasta.
- **Tyhjä tila** = kortti näkyy aina; lause kertoo, kuka tiedon antaa ja mitä se kestää; luvut jäävät pois. **Koonti:** jos ≥ 3 viidestä kortista on tyhjiä, ne yhdistetään yhdeksi "Mittauskierros puuttuu" -kortiksi, joka luettelee puuttuvat ja antaa yhden toiminnon (Suunnittele testitapahtuma). Ei neljää "Ei testejä" peräkkäin.
- **Kielletyt sanat** henkilökunnallekin lauseissa: heikko (pelaajasta), ranking, vertailu toiseen pelaajaan. "Heikoin osa-alue" on sallittu, "heikko pelaaja" ei.

## Profiili · 5D
| Syöte | Lause |
|---|---|
| kaikki D1–D5 tyhjiä | "Viisi ulottuvuutta täyttyvät testeistä (D1, D2), havainnoista (D4, D5) ja itsearviosta (D3). Ensimmäinen testitapahtuma antaa D1:n ja D2:n." |
| ≥ 1 arvo | "Vahvin: {D_max nimi} ({lähde: testeistä/havainnoista/itsearviosta})." + D1-lause PHV:n mukaan: PRE/LAH/tuntematon → "Fyysinen (D1) {taso} ikäisekseen ({pvm}) ja {PHV}: ei kehityskohde (§28)." · PH → "Fyysinen (D1) {taso}, kasvupyrähdyksessä: tulos vaihtelee." · POST/AN → "Fyysinen (D1) {taso} ikäisekseen ({pvm})." + D2-trendi jos edellinen: "Tekninen (D2) {nousussa/laskussa}: TKI {ed} → {nyt}." |
| tutka | akselin luku + pvm aina akselin vieressä; tyhjä = "tulossa", ei 0; katkoviiva = taso 3 (ikäluokan taso), ei toisen pelaajan arvo |

## 1 · Kasvu ja kypsyys
Syöte: `biologinenIka_viimeisin {pvm, phv_ika, offset}`, `kasvutahti_cm_v`, `tmPhvTila`.
| Tila | Lause | Toiminto |
|---|---|---|
| tuntematon | "Kasvua ei ole mitattu. Ilman PHV-tilaa fyysiset tulokset tulkitaan varovaisimmin, eikä fyysistä jaksoa ehdoteta." | Mittaa kasvu → Testaus (5 min) |
| PRE | "Kasvupyrähdys ei ole alkanut (arvio PHV {phv_ika} v). Kasvutahti {x} cm/v. Heikoin 30 m, CMJ tai MAS ei ole nyt kehityskohde (§28)." | Päivitä mittaus · seuraava 3 kk |
| LAH | "Kasvupyrähdys lähestyy (arvio PHV {phv_ika} v, noin {n} kk). Kasvutahti {x} cm/v. Seuraa kasvua 3 kk välein; fyysinen jakso odottaa." | Päivitä mittaus · 3 kk |
| PH | "Kasvupyrähdys käynnissä, kasvutahti {x} cm/v. Kuormaa rajoitetaan (§25): ei hyppy- eikä maksimisarjoja. Tekniikkatulokset voivat heitellä." | Tarkista jakson kuorma (→ signaali 1) |
| POST / AN | "Kasvupyrähdys ohi. Fyysiset tulokset ovat vertailukelpoisia ikänormiin; heikoin osa-alue käy kehityskohteeksi." | Päivitä mittaus · 6 kk |
| lisä: kasvutahti 6,5–7,1 cm/v | + "Kasvu kiihtyy ({x} cm/v): seuraa kuormaa." Ei chippiä. | Päivitä mittaus · 6–8 vk |
| lisä: kasvutahti ≥ 7,2 cm/v (mikä tahansa tila) | + "Kasvutahti {x} cm/v on nopea: loukkaantumisriski, kuorma tarkistetaan (§25)." → chip Huomio. Kynnys on metodologiasta; valmentaja päättää kuorman. | Tarkista jakson kuorma |
Luvut: PHV-tila · bio-ikä (v, 1 des.) · kasvutahti (cm/v) + sparkline, jos ≥ 2 mittausta.

## 2 · Fyysinen · mitattu
Syöte: `hh_viimeisin {lin30m, cmj, mas}`, `hh_pvm`, `hh_taso`, `hh_taso_edellinen`, tasot per testi testihetken iästä, PHV.
| Tila | Lause |
|---|---|
| ei H-H | "Ei H-H-testejä. Ensimmäinen testitapahtuma (30 m, CMJ, MAS) antaa lähtötason." → Avaa Testaus |
| data | "Taso {hh_taso} ikäisekseen testihetkellä ({ikä} v). Vahvin: {testi, taso}, heikoin: {testi, taso}." + trendi, jos edellinen: "{Nousussa/Ennallaan/Laskussa} edellisestä ({pvm})." |
| + PRE / LAH / tuntematon | + "{PHV}: heikoin ei ole kehityskohde, seurataan (§28)." Fysiikkajakso-ehdotusta **ei** näytetä. |
| + PH | + "Kasvupyrähdyksessä tulokset vaihtelevat; ei johtopäätöksiä yhdestä mittauksesta." |
| + POST / AN, ei jaksofokusta | + "Heikoin osa-alue käy fyysisen jakson kohteeksi." → toiminto "Ehdota fysiikkajakso" (D1-silta) |
| ikä > 3 kk | toiminto = "Päivitä mittaus · Testaus", meta "mittaus yli 3 kk vanha" |
Luvut: 30 m (s · t{taso}) · CMJ (cm · t) · MAS (km/h · t), kukin oma sparkline `testitulokset`-sarjasta.

## 3 · Tekninen · mitattu
Syöte: `tki_viimeisin`, `tki_edellinen`, `tki_pvm`, `tk_lajit_viimeisin` (lajitasot), H-H syöttö/pujottelu (1–3), kausitavoitteen konsepti.
| Tila | Lause |
|---|---|
| ei TKI | "Ei tekniikkatestejä. Ensimmäinen tekniikkakilpailu antaa lähtötason." → Avaa Testaus |
| data | "TKI {n} (taso {t} ikäisekseen)" + trendi (±3): "ja nousussa / ennallaan / laskussa." + "Vahvin: {laji}, heikoin: {laji}." |
| heikoin laji kuuluu kausitavoitteen konseptiin | + "Tukee kauden tavoitetta." |
| PH | + "Kasvupyrähdyksessä tekniikka voi notkahtaa tilapäisesti (§25)." (ei §28-porttia: tekniikkaa ei kypsyyskorjata) |
Luvut: TKI (t) + sparkline · pujottelu H-H x/3 · syöttö H-H x/3. Linkki "Lajikohtaiset ajat ja Eerikkilä-normit" avaa "Näytä kaikki".

## 4 · Peli · havaittu
Syöte: `adar_viimeisin {A, D, Act, R, yht, pvm}`, `adar_havaintoja` (kausi), `arviointikerrat` (roolit), `d3_viimeisin` (itse vs valmentaja).
| Tila | Lause |
|---|---|
| ei havaintoja | "Ei pelihavaintoja. Peliäly rakentuu havainnoista: ensimmäinen ADAR-havainto antaa tilannekuvan." → Lisää pelihavainto |
| data | "Peliäly {yht×5/3, 1 des.}/5 ({pvm}). Hallussa: {komponentit ≥ 3}; kehittyvä: {= 2}; harjoittelussa: {≤ 1}." (A = havainnointi, D = päätös, Act = toteutus, R = reagointi) |
| arvioijat | + "Arvioijia tällä kaudella {a}/3" + (a < 3 ? ", puuttuu: {rooli}." : ".") |
| D3 ero ≥ 1,5 | + "Itsearvio ja valmentajan arvio eroavat {ero}: keskustelunaihe." |
| havainto > 8 vk | age amber, meta "uusi havainto seuraavasta ottelusta" |
Luvut: peliäly (/5) + sparkline · havaintoja (kausi) · arvioijat (/3).

## 5 · Kehon valmius
Syöte: `flei_viimeisin` (0–100), ketjut `sbl sfl ll diag dfl` (1–3 → %), `flei_pvm`, `flei_historia`.
| Tila | Lause |
|---|---|
| ei | "Liikehallintaketjuja ei ole mitattu. Lomake vie 10 minuuttia." → Avaa lomake (fysio/fysiikkavalmentaja) |
| data | "{n}/100. Heikoin ketju {ketju} ({p} %): {ketjun harjoite} kuuluu tukiosaan." + trendi (±5) |
| n < 40 | + "Klinikkalippu: alle 40, ohjaus fysioterapeutille." → chip Huomio |
Luvut: valmius (/100) + sparkline · heikoin ketju (%). Julkinen kieli: "kehon valmius", "liikehallintaketju" (ei FLEI/fascia).

## Tänään · kysymykset (D103, täsmennetty 9.10.)
Kaksi kysymyskorttia (Näkyykö ydinvahvuus · Treenattiinko). Sitoumus näkyy rivinä signaalikortin alla ja nousee kortiksi vain, kun se vaatii toimenpiteen ("Sitoutui {pvm} · vahvista"). Viikkohavainto merkitään suoraan signaalikortin kolmesta inline-napista (D100); lause ja VEO-linkki avautuvat vain halutessa.
| Kysymys | Lähde | Arvo | Alarivi |
|---|---|---|---|
| Näkyykö ydinvahvuus pelissä? | ydinvahvuuden osan tuorein tila: viikkohavainto (`osa_arviot`) tai katselmus (`reviewit.kevyt.nakyi`) | Ei vielä / Ohjatusti / Itsenäisesti | "viikkohavaintosi {pvm}" tai "katselmus {pvm}"; ei mitään → arvo tyhjä, alarivi "ei vielä havaintoa · merkitse viikkohavainto" |
| Treenattiinko? | jakson `viikkokatsaukset` (≤ 6 dokumenttia, ladataan Tänään-avauksessa) | "{vastattu joskus/usein} / {kuluneet viikot} viikkoa" | "pelaajan viikkokatsaus su {pvm}"; sunnuntai ja vastaamatta → arvo "Tulee tänään" (amber); ei yhtään → "pelaaja vastaa sunnuntaina" |
| Onko mukana? (rivi; kortti vain kun toimenpide) | D97: `idp_sitoumus_pvm` ≥ alkoi − 1 pv = sitoutunut; + `idp_sitoumus_vahv_jakso === alkoi` = vahvistettu | Mukana / Sitoutui / Odottaa | vahvistettu: "sitoutui {pvm} · vahvistit {pvm}" · sitoutunut: "sitoutui {pvm} · vahvista" (nappi) · ei: "pelaaja sitoutuu sovelluksessa" |
Kysymykset näytetään vain tiloissa käynnissä / vahvistettu / päättynyt; muuten yksi rivi "Näytetään, kun jakso on käynnissä."

## Lukumäärä
Oletusnäkymä: Profiili 5 + kortit 3+3+3+3+2 = ≤ 19 lukua, sunnuntaina +1. Mobiilissa (säiliö < 720 px) Näyttö on haitari: jaksoon liittyvä kortti auki, muut yhden rivin yhteenvetoina (otsikko · ikä · yksi arvo); 5D-tutka piilotetaan, luvut ja lause jäävät. Kaikki muu "Näytä kaikki mittaukset" -näkymässä (D102).

## Testit (vähintään)
1. Sama pelaaja, PHV PRE vs POST → Fyysinen-lause vaihtuu, fysiikkajakso-ehdotus vain POST/AN.
2. `tmPhvTila` = tuntematon → Kasvu-kortti ohjaa mittaamaan, Fyysinen ei ehdota jaksoa.
3. Taso lasketaan testipäivän iästä: 2025-tulos 12-vuotiaana ei muutu, kun pelaaja täyttää 13.
4. Datan ikä > 6 kk → kortin ainoa toiminto on Päivitä mittaus.
5. Kasvutahti ≥ 7,2 → Huomio-chip ja kuormalause riippumatta PHV-tilasta.
6. D97: vanha sitoumus + uusi jakso → "Odottaa", ei "Mukana".
7. Lauseissa ei esiinny kiellettyjä sanoja (KIELLETYT-portti ajetaan lauseille).
