# Kehitystyöpöytä (Tänään · Polku · Näyttö) · inventaario ja analyysi · 9.10.2026

Lähde: VP_v25 (main fff6d6e), Master_v16, lib/tm_*, design 18/13/01/12, CODE_BRIEF_V4. Luettu, ei muutettu. Rivinumerot viittaavat VP_v25:een ellei toisin mainita.

## 1. Mitä löytyi (tiivistetysti)

**Tänään** on lähes designin 18 mukainen, mutta kolme asiaa vie siltä merkityksen:
- Kenttä on **tarkoituksella tyhjä** (10982: `ase:null, reitti:null, viikot:null, ilmanAluetta:true`, testi lukitsee). Pelaajadokumentissa ei ole alue- eikä reittikenttiä (`ydinvahvuus` = `{kuvaus, havaittu_pvm}`). Ongelma on suunnitelmassa (K3 avoin), ei toteutuksessa.
- Sitoumus lasketaan **kahdella säännöllä**: tilasiru ja signaali vertaavat päivämäärää (`tm_aloita_jakso.js:66`: sitoutunut jos `idp_sitoumus_pvm ≥ alkoi − 1 pv`), kysymys "Onko mukana?" vertaa jaksoleimaa (11082: `idp_sitoumus_vahv_jakso === jaksofokus.alkoi`). VP:n "Vahvista sitoumus" (7427–7438) leimaa nykyisen jakson tarkistamatta, kuuluuko sitoumus siihen → vanha sitoumus 29.9. "vahvistuu" uudelle jaksolle, ja molemmat tekstit ovat yhtä aikaa "totta". Masterissa vahvistuspolkua ei ole lainkaan.
- "Polun tila" -kortti toistaa tilasirun sanasta sanaan (tm_kehitystyopoyta.js:118). "Merkitse viikkohavainto" ei kirjoita mitään, vaan vaihtaa Polku-välilehdelle (11070). "Treenataanko?" on aina "Ei vielä tietoa", koska viikkokatsauksia ei haeta. Kehyksen oma Seuraava askel -kortti on kuollutta koodia (`askel:null`, 10984).

**Polku** poikkeaa designista 13 §2–5 järjestykseltään, koska se kokoaa vanhan modaalin palaset (10986–10993): Klipit → Pelaajan ääni (placeholder, kenttiin ei kirjoita mikään) → Seuraava askel → Kehityssuunnitelma (haitarit) → Viikko. Design sanoi: kortti → jaksot → nykyinen jakso → katselmus/historia.
- "Haltuunotto" näkyy 3–4 kertaa samasta kentästä `jaksofokus.konsepti_nimi` (8096, jaksokortti, 14104, nauhan A-päivät). Viikkolaskuri lasketaan kolmesti.
- "tavoite 2/5" on oletus `taso+1`, kun lähtötasoa ei mitattu (`tm_idp.js:202`); "arvioidaan 1.11." on luontipäivä + 6 vk. Luku ei kerro mitään.
- "Viikon rakenne": `Täytä viikko` ei kirjoita mitään (14487), päivän muokkaus kirjoittaa pelaajan `kirjaukset/{pvm}.sessiot[]`; tallennettuja ei V4:ssä ladata (`_vpViikkoLataa` puuttuu) ja tila nollautuu jokaisessa renderissä → "ladataan tallennettuja kirjauksia" jää ikuisesti.
- Monospace-rivit ovat tarkoituksellista UI-tekstiä (käännetty), mutta sisältävät kehittäjäkieltä ("§35 K2", "EPPP-rytmi §37").
- `_jspVaihda`-napit (Avaa katselmus →, avaa Kehitys →, 🩹) ovat V4:ssä rikki: piilottavat Polun tai Näytön Mittaukset-osion (14635).

**Näyttö** on vanha pelaajakortti neljän otsikon alla (10997–11004): **32 lohkoa + 6 avattavaa**, noin **150–200 lukua oletusnäkymässä**, 250 avattuna. Design 13 §6 määritteli 8 lohkoa, joissa jokaisessa on tulkinta. 18 §7 sanoi "siirrä vanha kortti", ja se tehtiin kirjaimellisesti.
- Sama data toistuu: D1 kuudesti, PHV/kypsyys ~10 paikassa, TK-kokonaisaika neljästi, testipäivät neljästi, 30 m/CMJ/MAS-sarja kahdesti **eri lähteistä** (`testitulokset` vs `hh_historia`).
- §14 datan ikä: Tuoreus-rivi näyttää vain tuoreimman päivämäärän (15364); hero, rivit, tutka ja Mitattu-ryhmä ovat ilman omaa päivämäärää. tmKypsyys näyttää raa'an ISO-päivän.
- PHV luetaan suoraan `p.phv_tila`:sta 9+ paikassa (CLAUDE.md §14 kieltää) → sama pelaaja voi saada eri kypsyystulkinnan eri lohkoissa.
- Lohko "Mitä testit tarkoittavat suunnitelmalle" on kovakoodattu, sama kaikille, ja väittää pre-PHV-pelaajalle "fyysinen ikkuna → nopeus" (§28-ristiriita).
- Roolit: mittauslista on valmentajalle aina lukutilassa (`_vpVoiMuokata()` ilman pelaajaa, 15031); "Arvioi (VP)" D3 tallentuu ilman roolitarkistusta `pisteet.vp`-kenttään; Poista/Palauta pomppaa Tänään-välilehdelle (15142→11055).
- "Pelaajan silmin" piilottaa vain PHV-sirun (luokka `kt-hk` vain siinä), ei yhtään lukua.
- VP ja Master eivät käytä Näytössä samaa komponenttia (D38): Masterissa 7 osiota, VP:ssä 32.

**Ylätunnisteen napit:** "Merkitse viikkohavainto" = ensisijainen nappi tiloissa kaynnissa/vahvistettu (→ Polku, ei kirjoita). "⋯" = Sulje jakso (kevyt katselmus) · Muokkaa jaksoa · Lisää klippi · Anna pelaajan valita (vain kun ydinvahvuus on) · päättyneessä Jatka 2 vk / Syvennä. "Pelaaja…" = "Pelaajan silmin" -kytkin.

## 2. Inventaariotaulukko (tiivis)

| Välilehti | Lohko | Datalähde | Toiminto | Kuka · kuinka usein | Tyhjä tila | Ongelma |
|---|---|---|---|---|---|---|
| Otsikko | ‹ › nimi · joukkue · ikävaihe · PHV-siru · tilasiru · nappi · ⋯ · Pelaajan silmin | lista, p, `tmJaksoTila` (jaksofokus, idp_sitoumus_pvm), `p.phv_tila` suoraan | tilakoneen nappi, valikko | kaikki · joka avaus | "Ei jaksoa" | PHV suoraan; sitoumussääntö A |
| Tänään | Seuraava askel (signaali) | `tmTanaanSignaali` ← `tmSeuraavaAskel`, jaksotila, profiili, su: viikkokatsaus | `_ktToimi` → Polku / modaali / katselmus | kaikki · joka avaus | "Ei tietoa — aloita jakso" | nappi vie välilehdelle, ei tee |
| Tänään | Kenttä | **ei dataa** (kovakoodattu tyhjä) | – | – | aina tyhjä | ei alue/reitti-kenttiä |
| Tänään | Polun tila | sama kuin tilasiru | – | – | "Ei jaksoa" | toisto |
| Tänään | Kolme kysymystä | `jaksofokus.osa_arviot`; blokit ei haeta; sitoumus sääntö B | – | kaikki · viikoittain | "Ei vielä tietoa" ×2 | lähde ja päivä puuttuvat; ristiriita |
| Tänään | Osat a/b/c | `jaksofokus.osat` tai kaanon | – | – | "Osat tulevat jakson mukana" | ei tilaa |
| Polku | Klipit | `viestit` (pelaajaId, nakyvyys) | Lisää klippi, ketju, kuittaa | valmentaja · viikoittain | "Ei klippejä vielä" | ensimmäisenä, ei kontekstia |
| Polku | Pelaajan ääni | `miksi_pelaan`, `pelaajatyyppi` | – | – | "VP täydentää" | kukaan ei kirjoita kenttiin |
| Polku | Seuraava askel / Ajan tasalla | `_pdcPaatos` → `tmSeuraavaAskel` | 5 nappia avaimen mukaan | – | "Ajan tasalla" | toisto Tänään-signaalin kanssa |
| Polku | Kehityssuunnitelma: Kauden tavoite | `idp_kausi/{v}.tavoitteet[]` (SMART) | muokkaus, vastuuhenkilö, välitavoitteet, sitoumus ✓ | VP · kausittain | "Ei asetettu" (auki) | 2/5 = oletus |
| Polku | Nyt harjoitellaan (jaksokortti) | `jaksofokus`, teemat, kotiharjoitteet | Muokkaa/Aloita jakso, kotiharjoitteet | valmentaja · jaksoittain | "Ei jaksoa käynnissä" | nimi toistuu |
| Polku | Aiemmat jaksot | `jaksofokus_historia`, `arviot` | – | – | "ei vielä historiaa" | ok |
| Polku | Tämän viikon fokus | `jaksofokus.*` | – | – | "Ei viikkosuunnitelmaa" + rikki CTA | toisto |
| Polku | Viikon rakenne 7 pv + Täytä viikko | muistitila, kalenteri; kirjoitus `kirjaukset/{pvm}.sessiot` | päivän muokkaus, Vie kalenteriin | valmentaja · viikoittain | 7 tyhjää "+ napauta", "ladataan…" ikuisesti | ei lataa, nollautuu, kuuluu joukkueen viikkoon (14) |
| Polku | Tavoitejakauma · Kuorma · Läsnäolo · Refleksio · Katselmus ~n vk · Lähteet | rivit, ACWR, `p.phv_tila`, `viikko_refleksio` | rikki `_jspVaihda` | – | useita tyhjiä | kehittäjäkieli, rikki napit |
| Näyttö | A Perustiedot + 5D (9 lohkoa) | pikakentät, `laskeHiddenGem`, tutka, tmKypsyys | – | – | "tulossa" | ei päivää; PHV suoraan |
| Näyttö | B Kasvu ja kypsyys (3) | phv, kasvutahti, testipäivät, kehityskaari | – | – | "Ei mittausta" | toistaa A:ta ja C:tä |
| Näyttö | C Mittaukset (9) | hh_*, tki_*, tk_*, flei_*, `testitulokset` | Testaus-linkki, Korjaa/Poista, 4 avattavaa | VP · mittausten jälkeen | "Aloita mittaus →" | ikä vain tuoreimmasta; roolibugi |
| Näyttö | D Pelihavainnot ja arviointi (11) | arviointi_havaittu, adar_*, d3_*, scout_* | arviointi 1–5, ADAR, D3, potentiaali (johto) | VP · kausittain | useita | D3 ilman roolia |

## 3. Kaksi listaa

### (a) Korjaukset Codelle (ennen 1.11., ei designmuutosta)
1. **Yksi sitoumussääntö** yhteen libiin (`tm_aloita_jakso` tai uusi `tm_sitoumus`): *sitoutunut* = `idp_sitoumus_pvm ≥ alkoi − 1 pv`; *vahvistettu* = sitoutunut **ja** `idp_sitoumus_vahv_jakso === alkoi`. Tilasiru, signaali, "Onko mukana?" ja `tmSeuraavaAskel` lukevat samaa. `_vpVahvistaSitoumus` estää vahvistuksen, jos sitoumus ei kuulu nykyiseen jaksoon. Masteriin sama vahvistuspolku. Testi yhdistelmälle "vanha sitoumus + leima".
2. `_jspVaihda`-kutsut V4:ssä → `_ktValilehti` (Polun CTA:t, 🩹, Näytön lohko 20). Nyt ne piilottavat Polun tai Mittaukset-osion.
3. Viikko: kutsu `_vpViikkoLataa` V4:ssä, älä nollaa tilaa `_ktPaivita`:ssa; poista ikuinen "ladataan…".
4. Mittauslista: `_vpVoiMuokata(p)` (valmentaja omille pelaajille); Poista/Palauta ei saa hypätä Tänään-välilehdelle.
5. D3 "Arvioi (VP)": roolitarkistus; valmentajan arvio ei saa tallentua `pisteet.vp`.
6. `p.phv_tila` → `tmPhvTila/tmPhvKoodi` kaikissa 10+ kohdassa (kehys 11009, viikko 14340, Näyttö 15569/15615/15664/15935/14709/15407/15447/15476/5807).
7. §14: päivämäärä jokaiselle mittausryhmälle (H-H, TKI, FLEI, ADAR, kypsyys), ei vain tuoreimmalle; tmKypsyys pp.kk.vvvv; f4:n TK-päivät muotoiltuina.
8. "Pelaajan silmin": `kt-hk` kaikkiin lukuihin ja signaaliin, Näyttö mukaan lukien.
9. Kuollut koodi pois: kehyksen Seuraava askel (`askel:null`), vanha "5D ja tilanne (siirtyy…)" (8566), lohko 20:n kovakoodatut CTA:t, tmKypsyys-CTA ilman `onCta`.
10. "Treenataanko?": joko haetaan jakson viikkokatsaukset (≤ 6 dokumenttia, 18 §6 sallii Polussa) tai kysymys piilotetaan kunnes data on. Ei "Ei vielä tietoa" ilman selitystä.
11. Kehittäjäkieli pois käyttäjätekstistä: "§35 K2", "EPPP-rytmi §37", "lahde:pelaaja", murupolku `kausi › jakso › eteneminen`.
12. Opas (OPAS_VP_JA_VALMENTAJA.md) ei tunne V4:ää; päivitetään uudistuksen jälkeen.

### (b) Uudistus (suunnitelma 20.10., toteutus R1 joulukuu; osa kevyenä jo 1.11.)
Vastaus Teron kysymykseen "toimiiko kokonaisuutena": ei, koska kolme välilehteä ovat kolme eri sukupolvea (V4-kehys, vanha modaali, vanha kortti). Uudistus tekee niistä yhden mallin: **jokaisella välilehdellä on yksi kysymys, yksi toiminto ja sama kortti-anatomia** (otsikko · yksi tulkintalause · luku + datan ikä · yksi linkki).

**Tänään — "Mitä teen tämän pelaajan kanssa nyt?"**
- Otsikkorivi (D46) ennallaan; tilasiru on ainoa tilateksti → Polun tila -kortti poistuu.
- Yksi *Seuraava askel* -kortti, jonka nappi **tekee toiminnon paikallaan** (sheet: viikkohavainto, kevyt katselmus, vahvista), ei vaihda välilehteä. Toinen signaali pienenä rivinä (D48).
- Kenttä piirtyy datasta: ydinvahvuus alueena, jakso reittinä, viikot merkkeinä, osat a/b/c pisteinä tiloineen. Kun aluetta ei ole: kentän tilalla kompakti jaksokortti + "Aseta ydinvahvuus kentälle → Polku". Ei koskaan tyhjää kenttää.
- Kolme kysymystä **lähteineen ja päivineen**: "Näkyikö ydinvahvuus pelissä? · Ohjatusti · katselmus 28.9." / "Treenattiinko? · 4/5 viikkoa · pelaajan viikkokatsaus su 5.10." / "Onko mukana? · Sitoutui 3.10. · vahvistit 4.10." Kun tietoa ei ole: kuka antaa ja milloin ("pelaaja vastaa sunnuntaina").
- Osat a/b/c tiloineen (hallussa / harjoitellaan / ei aloitettu) samasta `osa_arviot`-datasta kuin kysymys 1.
- "Valmentajalta uusin": viimeisin klippi tai lause.
- Mobiili 390: otsikkorivi + signaali + nappi ensimmäisellä ruudulla (18 §6), arkisin 0 lukua, sunnuntaisin 1.

**Polku — "Missä pelaaja on ja mihin menossa?"**
- Yksi jana ylhäältä alas: **Kausi** (tavoite + pelaajan omin sanoin, lähtötaso vain jos mitattu; ei "2/5"-oletusta) → **Jakso nyt** (ainoa paikka, jossa konseptin nimi on otsikkona; osat, viikkohavainto, klipit tämän jakson kontekstissa, tukitavoite) → **Tämä viikko** (pelaajan viikko lukuna: harjoitukset joukkueen viikosta 14 + omatoimi + viikkokatsaus; ei 7 tyhjää ruutua) → **Historia** (suljetut jaksot haaleina + kevyen katselmuksen lauseet).
- Klipit siirtyvät Jakso nyt -kortin sisään; Pelaajan ääni poistuu, kunnes kirjoituspolku on (kausitavoitteen "omin sanoin" riittää); Seuraava askel ei toistu Polussa.
- Viikon rakenne (7 pv, Täytä viikko, kuorma, läsnäolo) siirtyy **joukkueen viikkoon (14)**, jossa se kuuluu. Pelaajan Polussa näkyy vain tämän pelaajan viikko lukuna ja "Avaa joukkueen viikko".
- Muokkaus sheetteinä (Aloita jakso, Merkitse viikkohavainto, Sulje jakso, Siirrä ydinvahvuutta kentällä) samalla komponentilla VP:lle ja valmentajalle (D4).

**Näyttö — "Mitä todisteita on?"**
- **Viisi todistekorttia** 13 §6:n järjestyksessä: Kasvu ja kypsyys · Fyysinen · Tekninen · Peli (ADAR + arviointi + D3) · Kehon valmius. Jokaisessa: yksi lause ("30 m ja CMJ ikäisekseen tasolla 4, mitattu 5.6.2026, 4 kk sitten · pre-PHV: ei kehityskohde"), luvut datan ikineen, trendi, ja yksi toiminto (Päivitä mittaus / Lisää pelihavainto / Arvioi).
- Perustiedot ja 5D-tutka yhteen "Profiili"-korttiin, kerran. PHV kerran (kortissa 1), ei kymmenesti.
- Raakadata, Eerikkilä-taulukot, syväanalyysit, mittauslista ja mitätöidyt: **"Näytä kaikki mittaukset"** -näkymän taakse (sama sivu, avattava). Oletusnäkymässä ≤ 30 lukua.
- VP ja Master samasta komponentista (D38 tosiasiallisesti).
- "Mitä testit tarkoittavat" lasketaan pelaajasta (§28), ei kovakoodattuna.

## 4. Päätösehdotukset D97→

| # | Päätös | Perustelu | Mitä 18/13:sta muuttuu |
|---|---|---|---|
| **D97** | Sitoumus: yksi sääntö, yksi lib, molemmat appit | kaksi sääntöä tuotti ristiriidan | ei muutu (18 §2 tila `vahvistettu` tarkentuu: "V1 vahvistettu, pelaajan sitoumus puuttuu") |
| **D98** | Tänään-Kenttä piirtyy datasta; tarvitaan `ydinvahvuus.alue {x,y,w,h}` (valmentaja asettaa Polussa "Siirrä kentällä") ja `jaksofokus.reitti`; kunnes alue on, Kenttää ei näytetä tyhjänä vaan jaksokortti + CTA | tyhjä kenttä vie 1/3 ruudusta eikä kerro mitään; K1 "ei arvata" pysyy | 13 §1 ja 18 §1 saavat tyhjän tilan säännön; sulkee K3:n alue-osan |
| **D99** | Polun tila -kortti poistuu; tilasiru on ainoa tilateksti; Seuraava askel ei toistu Polussa | toisto | 18 §1 lohko 2 yhdistyy otsikkoriviin |
| **D100** | Toiminnot avautuvat paikallaan (sheet), nappi ei vaihda välilehteä | "Merkitse viikkohavainto" ei nyt tee mitään | 13 §1 "vie Polkuun oikeaan kohtaan" → "avaa sheetin, Polku päivittyy" |
| **D101** | Viikon rakenne (7 pv, Täytä viikko, kuorma, läsnäolo) siirtyy joukkueen viikkoon (14); pelaajan Polku näyttää viikon lukuna | valmentaja suunnittelee viikon joukkueelle, ei 18 pelaajalle erikseen | 18 §7 "viikko → Polku · jakso" täsmentyy: vain luku |
| **D102** | Näyttö = 5 todistekorttia + Profiili + "Näytä kaikki mittaukset"; jokaisessa luvussa päivämäärä; PHV luetaan kerran | 32 lohkoa / 150–200 lukua ilman toimintaohjetta | 13 §6:n 8 lohkoa → 5 + 1; 18 §7 "siirrä" → "siirrä ja tiivistä" |
| **D103** | Kolme kysymystä näytetään aina lähteen ja päivän kanssa; "Ei vielä tietoa" korvataan "kuka · milloin" | käyttäjä ei tiedä, mistä tieto tulee | 13 §1 elementtitaulukko täydentyy |
| **D104** | Kausitavoitteen lukua ei näytetä, jos lähtötaso ei ole mitattu ("tavoite taso 2 · lähtötaso mitataan katselmuksessa") | 2/5 on oletus, ei mittaus | 15/01 täsmennys |
| **D105** | Pelaajan ääni -lohko ja viikkorefleksio poistuvat Polusta, kunnes niille on kirjoituspolku (pelaaja-app) | placeholder lupaa toimintoa, jota ei ole | 13 §2 "kauden ääni" = kausitavoitteen "omin sanoin" |
| **D106** | VP ja Master renderöivät kaikki kolme välilehteä samasta `lib/`-moduulista; kuoret pienenevät (R1) | kasvukatto 437/225 riviä; D38 ei toteudu Näytössä | ei muutu |

Lukittuja päätöksiä ei tarvitse avata. D52 (Polku/Näyttö ladataan vasta avattaessa) pysyy: todistekortit lataavat `testitulokset`-sarjan kerran.

## 5. Toteutusjärjestys

**Korjauskierros ennen 1.11. (Code, kaista Tero):** (a)-lista 1–11 + D99 (Polun tila pois) + D103:n kevyt muoto (lähde ja päivä kysymyksiin nykyisestä datasta) + D104 + D105. Ei uusia kenttiä, ei Rules-muutosta paitsi mahdollinen sitoumuksen validointi.

**R1 joulukuu (VP_v25:n jako):** D98 (alue/reitti-kentät + Rules + "Siirrä kentällä"), D100 (sheetit), D101 (viikko joukkueelle), D102 (todistekortit), D106 (yksi lib, kevyt oma sivu `kehitystyopoyta.html`).

## 6. Avoin Terolle (yksi kysymys)

D98: lisätäänkö ydinvahvuuden **alue** pelaajadokumenttiin nyt (valmentaja asettaa kentällä, ja Kenttä alkaa piirtyä R1:ssä), vai pidetäänkö Kenttä pois henkilökunnan Tänään-välilehdeltä ja näytetään vain pelaajalle? Suositus: lisätään. Kenttä on tuotteen lupaus ("sama kuva kaikille rooleille"), ja ilman aluetta se ei toteudu missään.
