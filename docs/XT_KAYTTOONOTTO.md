# Uhka-arvo (xT) TalentMasterissa: käyttöönottosuunnitelma

> Tila 2026-09-24: **Vaihe 0 rakennettu** haarassa `feat/xt-uhka-arvo` (`lib/tm_xt.js`, `lib/tm_xt_kerros.js`,
> editorin xT-valinta, prototyyppi `TalentMaster_xT_Prototyyppi.html`). Tämä doc = suunnitelma vaiheille 1–4 +
> invariantit, jotka on lukittava ennen kuin xT näkyy pelaajakortilla. Päätökset Terolle: §8.

---

## 0. Tiivistelmä

xT kertoo **kuinka paljon teko vie palloa kohti maalintekopaikkaa**. Se täydentää TalentMasterin nykyistä
kuvaa kolmessa kohdassa, joita mikään testi ei nyt näe:

1. **Opetus** — taktiikkataulun kaavio näyttää *miksi* ratkaisu on hyvä (uhkakartta + liikkeen arvo).
2. **Näyttö** — pelihavainto antaa pelaajan pelipaikkakonseptille mitattavan todisteen (D4:n rinnalle, ei tilalle).
3. **Supervoima** — X-Factor / "jalosta vahvuus" -polku saa datan: *mikä tekee pelaajasta vaarallisen* (rekrytointiteesi).

Suurin riski ei ole tekninen vaan **väärä vertailu**: xT palkitsee luonnostaan hyökkääviä pelipaikkoja ja
aliarvioi osan oikeista ratkaisuista. Siksi §2:n invariantit ovat tärkein osa tätä dokumenttia.

---

## 1. Mitä on jo tehty (Vaihe 0)

| Osa | Tiedosto | Huom |
|---|---|---|
| Laskenta (puhdas) | `lib/tm_xt.js` | 12×8-ruudukko (Karun Singh 2018), kaavion koordinaatisto + `suunta`, ΔxT, kaavio- ja havaintoyhteenveto. 20 testiä `tests/xt.test.js`. |
| Näkymäkerros | `lib/tm_xt_kerros.js` | Piirtää drawSpec-SVG:n päälle, **ei kirjoita speciin**. Jaettu renderöijä koskematon. |
| Editori | `lib/tm_kaavio_ui.js` v=6 | "Uhka-arvo (xT)": Pois / Liikkeiden arvot / Uhkakartta. Guardattu. VP_v25 + Master_v16 lataavat libit. |
| Prototyyppi | `TalentMaster_xT_Prototyyppi.html` | Taktiikkataulu + napautuspohjainen pelihavainto. Ei tallenna. |

**Ennen mergeä:** live-tarkistus editorissa kirjautuneena (VP + valmentaja + SA), molemmat teemat, mobiili.

---

## 2. INVARIANTIT — lukitaan ennen kuin xT näkyy pelaajatasolla

1. **EI VERTAILUA PELIPAIKKOJEN YLI.** Sama hyvä teko on eri pelipaikoilla eri kokoluokkaa (laskettu `tm_xt.js`:llä):

   | Teko | Uhkapisteet |
   |---|---|
   | T-H3 toppari: murtava maasyöttö 25 m eteen | +0,5 |
   | KK-H4 kk: kääntö laidalta laidalle | +0,2 |
   | LP-H3 lp: syöttö laidalta hyökkäyskolmannekseen | +1,2 |
   | LA-H4 laituri: 1v1-kuljetus päätyyn | +1,7 |
   | LA-H5 laituri: takaviistoon boksiin | +6,7 |
   | KY-H2 kymppi: taskusta syöttö boksiin | +8,4 |

   → Erinomainen toppari näyttää absoluuttisesti "heikolta" kympin rinnalla. **Vertailu vain: oma historia ·
   sama pelipaikka · sama pelimuoto.** Joukkuetaulukko ei saa lajitella pelaajia xT:n mukaan yli pelipaikkojen
   Prototyypin taulukosta poistettiin tästä syystä pelaajien välinen vertailupalkki.

2. **xT EI OLE KONSEPTIN ARVOSANA.** Osa oikeista ratkaisuista on xT:ssä nolla tai miinus:
   pallon suojaaminen (Y-H5), selkä maalille -peli ja pudotus (KH-H3), turvaava paluusyöttö rakentelussa,
   rakenteen ylläpito (T-H1, KK-H1). Näissä xT näytetään **ei lainkaan**, ei punaisena. Konseptikohtainen
   `xt_mittari` (§3) päättää, missä xT on todiste.

3. **PUOLUSTUS EI NÄY xT:ssä.** Kaikki P-faasin konseptit (38 / 79 pelipaikkakonseptista) ovat
   xT:n ulkopuolella. Ne jäävät ADAR/pelihavainnon (D4) varaan. UI ei saa antaa kuvaa, että puolustava pelaaja
   "ei tuota mitään".

4. **§7.22 PELAAJALLE: EI LUKUJA, EI VERTAILUA.** Pelaaja U16+ voi nähdä **oman uhkakarttansa** ("täältä loit
   eniten uhkaa") positiivisena. Ei uhkapisteitä, ei yritetty/luotu-eroa, ei muiden pelaajien lukuja.
   U8–U15: ei pelaajanäkymää lainkaan. Vanhempi: ei xT:tä (paine-mekanismi §16).

5. **§28 IKÄVAIHE.** Pelaajakohtainen xT vasta **pelipaikkavaiheessa** (`tmTtVaihe` = `pelipaikka`, U14/U15+).
   Nuorempana xT on vain opetusväline (taktiikkataulu) ja joukkuetason kuvaus. Pienkenttäpeleissä
   (<11v11) arvot ovat suuntaa-antavia → `xtPelimuotoHuomio` näkyy aina.

6. **RAAKADATA TALLENTUU, ARVO LASKETAAN LENNOSSA (§30 periaate 1).** Tallennetaan tapahtumien
   koordinaatit + `malli`-versio. Kun ruudukko vaihtuu (Vaihe 4, oma nuorten ruudukko), kaikki historia
   lasketaan uudelleen ilman migraatiota.

7. **EI KENTTÄÄ NIMELTÄ `pisteet` xT-havaintoon.** `paivitaAdarPikakentat` (Master_v16) suodattaa
   havainnot `h.pisteet`-kentällä → xT-dokumentti laskettaisiin ADARiksi ja sotkisi D4-konsensuksen. xT-data
   `xt`-objektiin (§5).

8. **LÄHDE JA LISENSSI.** Ruudukko on julkaistu avoimesti blogissa ilman eksplisiittistä lisenssiä.
   Attribuutio näkyy aina (tehty). Ennen kaupallista laajennusta: Vaihe 4:n oma ruudukko poistaa riippuvuuden.

---

## 3. Linkitys pelipaikkakonsepteihin (`TM_TT_FUNDAMENTIT`, `TM_TT_YOUTH`)

Jokaiselle konseptille yksi **`xt_mittari`**. Neljä tyyppiä:

| Tyyppi | Mitä lasketaan | Lähde |
|---|---|---|
| **A Eteneminen** | onnistuneiden syöttöjen/kuljetusten ΔxT (luotu uhka) | `xtHavaintoYhteenveto` |
| **B Vastaanotto** | onnistuneet vastaanotot alueilla, joiden xT ≥ kynnys (pelaaja tarjoutui uhkaan) | uusi: `xtVastaanotot` |
| **C Juoksu** | pallottomien juoksujen avaama potentiaali (ΔxT > 0) | `juoksuPotentiaali` |
| **—** | ei xT-mittaria (puolustus, rakenne, pallon suojaus, xG-alue) | näkyy "—", ei nollaa |

Ehdotus (Tero validoi, kuten Kartta A §13):

| Pelipaikka | A Eteneminen | B Vastaanotto | C Juoksu | — (ei xT) |
|---|---|---|---|---|
| MV | MV-H1 avaaminen · MV-H3 tilanteenvaihto | | | MV-P1–P5 · MV-H0 · H2 · H4 · H5 |
| LP | LP-H3 syöttöpeli laidalta · LP-H4 edun luominen | LP-H5 mukaan nouseminen | LP-H5 | LP-P1–P6 · LP-H0–H2 |
| T | T-H3 murtavat syötöt · T-H4 edun luominen | | | T-P1–P6 · T-H0–H2 |
| KK | KK-H4 organisointi | KK-H2 muodon sisällä | | KK-P1–P6 · KK-H0 · H1 · H3 |
| KY | KY-H4 viimeinen kolmannes | KY-H2 taskupelaaminen · KY-H5 boksiin | KY-H5 | KY-P1–P5 · KY-H0 · H1 · H3 |
| LA | LA-H4 1v1 · LA-H5 keskittäminen | LA-H2 | LA-H2 vapaat juoksut | LA-P1–P5 · LA-H0 · H1 · H3 · H6 (xG) |
| KH | KH-H5 edun hyödyntäminen | KH-H4 boksipelaaminen | KH-H1 syvyys · KH-H2 | KH-P1–P5 · KH-H0 · **KH-H3** (xT aliarvioi) |
| Youth | Y-H2 · Y-H3 · Y-H4 | Y-H7 · Y-H8 | Y-H7 · Y-H8 | Y-H0 · H1 · **H5** · H6 · H9 (xG) · Y-P* |

**Toteutus:** `xt_mittari` lisätään curriculum-lähteeseen (`docs/data/OMA_VERSIO_*.md`) ja
`parse_oma_versio.py` generoi sen `tm_teknistaktiset.js`:ään — **ei käsin** (tiedosto on generoitu).

**Kaaviot:** kanonisia piirrettyjä on 20 (vain `y_*` ja `j_*`). Pelipaikkakonsepteille ei ole yhtään kaaviota.
Piirretään ensin ne ~20 konseptia, joilla on A/B/C-mittari: xT-kerros tekee niistä heti opetusvälineen, ja
kaavion `avain` = konseptin avain (`la_h4`) → konseptikortti ja jaksofokus näyttävät saman kaavion.

**Jaksofokus:** kun valmentaja asettaa `jaksofokus.konsepti_avain = 'la_h4'`, pelihavainto esitäyttää
seurattavan mittarin (A, kuljetukset) ja jakson lopussa näkyy alku vs. loppu **saman pelaajan** datasta.
SMART-tavoitteen `mittari` voi olla xT-mittari (pehmeä vihje, ei pakko).

---

## 4. Roolinäkymät

| Rooli | Näkee | Ei näe |
|---|---|---|
| **VP** | Joukkuetaso: uhka alueittain/kaistoittain → joukkuekonseptit (J-H*). Talentit: pelaajan xT-profiili pelipaikan sisällä + trendi. X-Factor-näyttö. | Pelipaikkojen yli lajiteltua listaa |
| **Valmentaja** | Omat pelaajat: havainnot, jaksofokuksen mittari alku/loppu, kaaviot xT-kerroksella | — |
| **Talenttivalmentaja** | Kuten VP talenteille | — |
| **Pelaaja U16+** | Oma uhkakartta ("missä olit vaarallisin"), konseptin cue-kysymys | Luvut, yritetty/luotu, vertailu |
| **Pelaaja <U16 · Vanhempi** | Ei xT:tä | Kaikki |

Pelaajakortilla (IDP on kortti) xT on **todiste**, ei uusi dimensio: D4-kerronnan alle "Pelihavainto:
etenee kuljettamalla laidalta, 3 ottelua" + linkki kaavioon. **Ei muutosta 5D-laskentaan ilman Teron lupaa (§14).**

---

## 5. Datamalli

> ⚠ **Korvattu:** kenttätyökalun datamalli ja näyttö → `CODE_TASK_PELIANALYTIIKKA_2026-09.md` §5.6 (kanoninen len/wid, kenttatarkkailu).


Olemassa oleva polku, ei uutta kokoelmaa, ei Rules-muutosta:

```
seurat/{seuraId}/pelaajat/{pelaajaId}/havainnot/{havaintoId}
  tyyppi: 'pelihavainto_xt'
  tila: 'valmis' | 'luonnos'          // pelaaja ei näe: ei narratiivi/teksti → _p6NakyyPelaajalle = false
  valmentajaUid, seuraId, pelaajaId, palloId, luotu (A5-vartija)
  otteluId | kalenteriId               // §35 kalenteri / §20 TASO
  konsepti_avain                       // jaksofokus-linkki, valinnainen
  xt: {
    malli: 'singh_12x8_v1',
    pelimuoto: '11v11', lahde: 'live' | 'video',
    havainto_min: 20,                  // havaintoikkunan pituus → normalisointi /10 min
    tapahtumat: [ { t:'syotto'|'kuljetus'|'laukaus'|'vastaanotto'|'juoksu',
                    a:[x,y], b:[x,y], ok:true, min:23 } ]   // koordinaatit AINA hyökkäys ylös
  }
```

Pikakenttä (§26, **pari-invariantti**: arvo + pvm atomisesti samasta havainnosta):
`xt_viimeisin { luotu_10min, n_tapahtumat, havainto_min, pvm, malli }` · `xt_pvm`.
Joukkuekoonti vain pikakentistä, ei alikokoelmakyselyjä renderissä.

---

## 6. Havaintoprotokolla (luotettavuus)

> ⚠ **Korvattu:** kenttätyökalun datamalli ja näyttö → `CODE_TASK_PELIANALYTIIKKA_2026-09.md` §5.6 (kanoninen len/wid, kenttatarkkailu).


Ilman protokollaa luvut ovat kohinaa. Kolme sääntöä:

1. **Fokuspelaaja + aikaikkuna.** Kirjataan *kaikki* yhden pelaajan pallotapahtumat esim. 2 × 10 min.
   Ei vain mieleen jääneitä tekoja (valikoitumisharha paisuttaa luvut).
2. **Video ensisijainen, live pikatila.** Videolta jälkikäteen tarkka; live-napautus kentän laidalla
   ADAR-pikakorttiin (offline-ensin, iso kosketusala, yksi käsi). Lähde merkitään (`lahde`).
3. **Minimiotos.** Trendi näytetään vasta ≥3 havainnosta. Yksi ottelu = "havainto", ei "taso".
   Kalibrointi: VP ja valmentaja havainnoivat saman jakson ajoittain (sama kuvio kuin harjoitusarvioinnin
   kalibraatio §37 ja ADARin multi-rater-konsensus).

**Suunta:** käyttöliittymä kääntää kentän aina hyökkäys ylös (puoliaikojen vaihto ei vaikuta dataan).

---

## 7. Vaiheistus

| Vaihe | Sisältö | Valmis kun |
|---|---|---|
| **0** ✅ | Laskenta + taktiikkataulun kerros + prototyyppi | live-tarkistus editorissa, merge |
| **1** | `xt_mittari` curriculumiin (parseri) · xT-kerros konseptikorttiin · piirretään ~20 pelipaikkakaaviota A/B/C-konsepteille | Tero validoinut §3-taulukon; kaaviot validaattorin läpi |
| **2** | Pelihavainto-tallennus: ADAR-pikakortin xT-tila + video-tila Master_v16:ssa · `xtVastaanotot` (B) · pikakentät · protokolla UI:hin | 1 pilottiseura, 1 joukkue, 4 viikkoa; kalibrointipari tehty |
| **3** | Pelaajakortti/IDP: todiste D4:n alle · jaksofokuksen alku/loppu · X-Factor-näyttö · VP-joukkuenäkymä (kaistat → J-H) · pelaajan U16+ uhkakartta | §2:n invariantit testeinä (ei pelipaikkojen yli -lajittelua, ei lukuja pelaajalle) |
| **4** | Oma nuorten ruudukko omasta datasta per pelimuoto (5v5/8v8/11v11), kun n riittää | malli `tm_nuoret_*_v1`, historia laskettu uudelleen |

Vaihe 2:n pilotti: seura, jolla on jo PHV- ja H-H-dataa (SJK), jotta xT:tä voi lukea yhdessä D1/D2:n kanssa.

---

## 8. Päätökset Terolle

1. **§3-taulukko** — hyväksy / korjaa konseptien `xt_mittari` (erityisesti rajatapaukset KH-H3, Y-H5, LA-H1).
2. **Pelaajan näkyvyys** — U16+ oma uhkakartta ilman lukuja: kyllä / ei vielä.
3. **Lasketaanko xT-havainto valmentajan havaintoaktiivisuuteen** (VAI+ ADAR 30 %, signaali S9)? Nyt VP_v25
   laskee kaikki `havainnot`-dokumentit valmentajakohtaisesti → xT-havainnot nostaisivat lukua.
4. **Epäonnistunut teko** — nykyinen linjaus: ei vähennä luotua, näkyy yritettynä. Pidetäänkö?
5. **Live vai video ensin** Vaihe 2:ssa.

---

## 9. Mitä xT ei tee (rajaukset)

- Ei korvaa ADARia eikä D4-arviota. Se mittaa pallotapahtuman lopputulosta, ei päätöksentekoa.
- Ei mittaa laukauksia (siihen xG) eikä puolustamista.
- Ei tuo TASOsta mitään: TASO antaa määrät, ei koordinaatteja.
- Ei ole valmis "pelaajaluokitus". Rekrytoinnissa se on yksi näyttö X-Factorin tueksi, aina pelipaikan sisällä.

---

## 10. Toteutettu 24.9.2026: pienkenttäprofiili ja menetysriski (Teron päätös: molemmat mukaan)

### 10.1 Pienkenttäprofiili (5v5, 8v8)
- **Ongelma:** kaavion koordinaatit ovat 0–100 kentän suhteen. 11v11-ruudukko suoraan käytettynä väittäisi 8v8:n
  keskiympyrän olevan yhtä kaukana maalista kuin 11v11:n (52 m), vaikka se on 30 m päässä.
- **Ratkaisu (metrimuunnos):** piste muutetaan metreiksi pienkentällä ja uhka luetaan 11v11-ruudukosta samasta
  metrietäisyydestä maaliin. Maaliuhka nousee pienkentällä aiemmin keskiviivan jälkeen.
- **Kenttäkoot** (`XT_KENTTAKOOT`, Palloliiton/piirien suositus): 5v5 ≈ 30 × 40 m, 8v8 ≈ 40 × 60 m. 3v3: ei profiilia
  → xT ei käytössä (`xtProfiili('3v3') === null`), huomio kertoo sen.
- **Vaikutus keskellä kenttää, 30 % kentän pituudesta vastustajan maalista:** 11v11 2,4 · 8v8 3,5 · 5v5 10,8 uhkapistettä.
- **Malli-id tallennetaan** (`singh_12x8_v1+pienkentta_m_v1`), joten Vaihe 4:n oma nuorten ruudukko korvaa tämän ja
  historia lasketaan uudelleen (§2 invariantti 6).
- **Tunnettu rajoitus:** pienempää maalia (5 × 2 m vs 7,32 × 2,44 m) ei vielä korjata.
- **API:** `xtArvo(x, y, suunta, pelimuoto)` · `xtProfiili(pelimuoto)`. Kaavioanalyysi lukee `spec.pelimuoto`
  automaattisesti, joten kanoniset 8v8-kaaviot käyttävät profiilia ilman muutoksia dataan.

### 10.2 Käänteinen uhka: menetysriski
- **Määritelmä:** menetyksen riski pisteessä P = vastustajan xT samassa pisteessä (sama piste, käänteinen suunta).
  `xtMenetysriski(x, y, suunta, pelimuoto)` → `{raaka, pisteet, taso}`.
- **Vyöhykkeet** (vastustajan uhkapisteinä): **korkea ≥ 5** = oma rangaistusalue ja sen edusta (punainen) ·
  **kohonnut ≥ 2** = oma puolustuskolmannes (amber) · muuten matala (ei piirretä).
- **Menetyspiste:** `menetys:{x,y}` jos kirjattu, muuten `to` (mihin pallo päätyi).
- **Pelihavaintoyhteenveto** lisää per pelaaja: `menetykset`, `riskimenetykset` (korkea), `menetysriski`.
  **Luotu uhka ei muutu** (epäonnistunut ei vähennä, §8 päätös 4 ennallaan).
- **Taktiikkataulu:** editoriin neljäs tila **Riskikartta**. Luonteva opetuskäyttö: J-H1 rakentaminen paineessa,
  KK-P6/LA-P4 vastaprässi (missä menetys on vaarallisin, sinne vastaprässi).
- **Ikävaihe:** riskinäkymä on oletuksena päällä vain **11v11-vaiheessa** (`xtRiskiOletuksena`). Pienkentillä valmentaja
  voi kytkeä sen itse, mutta oletus ei korosta riskejä juuri kun rohkeutta haetaan.
- **Kieli:** kuvaus, ei syyllistys. "Menetys tapahtui punaisella riskivyöhykkeellä omassa päässä" näytetään
  valmentajalle neutraalilla värillä. Pelaajalle ei riskilukuja (§7.22).

### 10.3 Testit
`tests/xt.test.js` 32 testiä, joista 12 uutta: metrimuunnos, pienkentän nousu, 3v3-rajaus, speksin pelimuodon luku,
riskivyöhykkeet, käänteinen suunta, menetysten laskenta ja riskioletus pelimuodoittain.
