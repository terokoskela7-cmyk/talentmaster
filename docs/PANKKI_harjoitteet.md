# TalentMaster — PANKKI: kaikki harjoitteet & idolimäppäys

> Generoitu automaattisesti harjoitelogiikka_v4.js + lib/tm-microcycles.js -lähteistä. Dokumentti kuvaa mitä harjoitteita on suunniteltu, niiden ohjeet (3 ikävaihetta) ja kytkös idoli-/viikkomalliin (Vaihe 0–2).

## Arkkitehtuuri
- **PANKKI** (harjoitelogiikka_v4.js) = harjoitesisältö: T-mesosyklit + D-aktivointi + S-kohdennettu + T_KOHDE_PANKKI.
- **tm-microcycles.js** = toimituskehys (Bola Sempre): 8 viikon idolimakrosykli + 4 päivittäistä mikrosykliä.
- **Vaihe 1 -sauma:** TREENI-mikrosykli hakee harjoitteen PANKISTA viikkoteeman mukaan (`haePaatreeniHarjoite`).

## 8 viikon idolimakrosykli (NIMIKKO_VIIKOT) → PANKKI

| vk | Idoli | Teema | Ketju | Jakso | PANKKI-lähde |
|---|---|---|---|---|---|
| 1 | bellingham | Vastaanotto | DIAG | pohja | kaka (T) + DIAG D/S |
| 2 | pedri | Dribbeli | LL | pohja | affelay (T) + LL D/S |
| 3 | vinicius | 1v1 suora | SBL | pohja | nopeus (T_KOHDE) + SBL D/S |
| 4 | yamal | 1v1 ahtaassa tilassa | LL | kehitys | ronaldo (T) + LL D/S |
| 5 | haaland | Liike ilman palloa | SFL | kehitys | SFL D/S (ei T) |
| 6 | trent | Syöttö | DIAG | kehitys | beckham (T) + DIAG D |
| 7 | kane | Maalinteko | SFL | huipentuma | placeholder — Vaihe 2 |
| 8 | OMA | Oma valinta | — | huipentuma | perus (T) / vapaa |

## 1. T-harjoitteet (mesosyklit → kehityskohde → idoli)


### kaka  ·  Bellingham  ·  Vastaanottaminen  (kehityskohde: pallonhallinta)

- **[vk1] Bellingham — Pysäytys sisäterällä**  ·  kesto 15 min · 20 XP
    - **Leikkijä:** 10 kertaa: pomppaa seinään ja pysäytä sisäterällä. Suuntaa pallo sinne mihin haluat juosta seuraavaksi.
    - **Rakentaja:** 3×10, molemmat jalat. Sisäterä vastaanottaa — 1. kosketus osoittaa seuraavan suunnan ennen kuin puolustaja reagoi.
    - **Showcase:** 4×10, vaihda jalkaa sarjojen välissä. Automaatti: sisäterä kehon alle, jalkaterä pelattavaan suuntaan ennen pallonkosketusta.
    - _Cue:_ Bellingham (Real Madrid): ensimmäinen kosketus on jo seuraava liike.
    - _Viikkotavoite:_ Sisäterävastaanotto — 8/10 lähtee suoraan menosuuntaan

- **[vk2] Bellingham — Vastaanota ja käännä**  ·  kesto 15 min · 20 XP
    - **Leikkijä:** 12 kertaa: ota pallo seinästä ja käännä se heti uuteen suuntaan sisäterällä. Älä pysäytä paikalleen — pallo lähtee jo eteenpäin.
    - **Rakentaja:** 3×12, vuorojaloin. Avaa lantio ennen kosketusta — 1. kosketus kääntää pallon pois sieltä mistä se tuli, niin saat aikaa ja tilaa.
    - **Showcase:** 4×12, käännä molempiin suuntiin. Automaatti: skannaa olkapään yli ennen palloa, sisäterän kosketus avaa suoraan vapaaseen tilaan ilman lisäkosketusta.
    - _Cue:_ Bellingham: vastaanotto on jo hyökkäys — käänny sinne missä on tilaa.
    - _Viikkotavoite:_ Vastaanotto + käännös yhdellä kosketuksella 20/24

- **[vk3] Bellingham — Suojaa ja avaudu**  ·  kesto 20 min · 25 XP
    - **Leikkijä:** Pyydä kaveri viereen (ei ota palloa). Ota pallo sisäterällä niin että kehosi on pallon ja kaverin välissä. 12 kertaa.
    - **Rakentaja:** 3×12 passiivisen puolustajan kanssa. Vastaanota takajalalla, kallista keho puolustajan ja pallon väliin — 1. kosketus vie pallon turvaan paineesta pois.
    - **Showcase:** 4×12, vaihda kumpi olkapää suojaa. Automaatti: tunnista paine ennen palloa, suojaa kehollasi ja avaudu sisäterällä vapaaseen tilaan yhdellä kosketuksella.
    - _Cue:_ Bellingham: keho pallon ja vastustajan väliin — silloin pallo on aina sinun.
    - _Viikkotavoite:_ Suojattu vastaanotto auki paineesta 15/20

- **[vk4] Bellingham — Mittaa ensikosketuksesi**  ·  kesto 20 min · 30 XP
    - **Leikkijä:** Tee 20 vastaanottoa. Laske montako kertaa pallo pysähtyy alle metrin päähän jalastasi. Kirjaa ennätys ja yritä päihittää se.
    - **Rakentaja:** 20 vastaanottoa: laske montako menee suoraan peliasentoon (pallo alle 1 m, keho jo menosuuntaan). Vertaa vk1:n tulokseen — paraniko 1. kosketuksen suunta?
    - **Showcase:** 20 vastaanottoa paineessa (passiivinen puolustaja): laske montako kääntyy suoraan vapaaseen tilaan ilman lisäkosketusta. Tavoite 16/20 — sillä tasolla 1. kosketus on ase.
    - _Cue:_ Bellingham: ilman mittausta et tiedä paraneeko ensikosketuksesi.
    - _Viikkotavoite:_ Suuntaava ensikosketus: montako 20:stä menosuuntaan?


### affelay  ·  Pedri  ·  Dribbelin perusta  (kehityskohde: koordinaatio)

- **[vk1] Dribbeli — katse ylhäällä**  ·  kesto 15 min · 20 XP
    - **Leikkijä:** Kuljeta palloa eteenpäin 20 metriä, katso YLHÄÄLLÄ! Älä katso palloon. Vaihda suuntaa äkillisesti 5 kertaa. Tee 5 kierrosta.
    - **Rakentaja:** 4 perustaitoa peräkkäin: 1) Kuljeta silmät yli pallon etsien tilaa. 2) Kiihdytä hitaasta täyteen vauhtiin kahdessa askeleessa — pallo ei saa lähteä yli 2 askeleen. 3) Pienet nopeat suunnanvaihdot ilman suuria kaaria. 4) Tarkista: katso eteenpäin. 3 kierrosta.
    - _Cue:_ Affelay (PSV/Barcelona): nämä 4 taitoa ovat pohja jolle kaikki muu rakennetaan.
    - _Viikkotavoite:_ Kuljeta 20 m silmät ylhäällä ilman palloa putoamasta

- **[vk2] Dribbeli — kiihdytys pallon kanssa**  ·  kesto 15 min · 20 XP
    - **Leikkijä:** Seiso paikallasi, pallo edessä. Lähtölaukaus — kiihdytä maksimille niin nopeasti kuin pystyt, pallo mukana! 10 kertaa. Palautus kävellen.
    - **Rakentaja:** Kiihdytysladder: 0–5m hidas | 5–10m keskinopeus | 10–15m maksimi — pallo mukana koko ajan. Mittaa: milloin pallo irtoaa liikaa? 8 toistoa.
    - **Showcase:** Kiihdytys + suunnanmuutos 45° ilman palloa pysähtymistä. 6 toistoa kumpaankin suuntaan. Mittaa reaktioaikaa: kuinka nopeasti olet täydessä vauhdissa?
    - _Cue:_ Räjähtävyys: tärkeää ei ole mitä liikettä teet vaan milloin ja kuinka nopeasti kiihdytät sen jälkeen.
    - _Viikkotavoite:_ 0–15m pallo mukana, alle 3 s

- **[vk3] Dribbeli — kaveria vastaan (passiivinen)**  ·  kesto 20 min · 25 XP
    - **Leikkijä:** Kaveri seisoo edessä, ei liiku. Ohita hänet vasemmalta tai oikealta! Kiihdytä ohi. 15 kertaa kummastakin suunnasta.
    - **Rakentaja:** Kaveri seisoo passiivisena puolustajana. Tee suunnanmuutos ohi hänestä — käytä lyhyttä liikettä, ei suurta kaarta. Ohituksen jälkeen välitön kiihdytys. 20 toistoa.
    - **Showcase:** Affelay-Sneijder yhdistettynä: dribbele lähelle kaveria → vaihda suuntaa → kaveri seuraa passiivisesti. Katso ylös ennen liikettä. 20 min pelimäisesti.
    - _Cue:_ Noordster: hallitse liike ensin yksin, sitten passiivista vastaan, sitten täydessä 1v1:ssä.
    - _Viikkotavoite:_ Ohita passiivinen puolustaja 15/20 kertaa

- **[vk4] Dribbeli-mittaus**  ·  kesto 20 min · 30 XP
    - **Leikkijä:** Pujottele 5 kartiota niin nopeasti kuin pystyt — ajanotto! Kirjaa aika. Yritä parantaa 3 kertaa.
    - **Rakentaja:** Ajanotto: pujottelu 5 kartio, 10 m. Tee 5 suoritusta. Laske paras aika. Vertaa: oletko nopeampi kuin lokakuun alussa?
    - **Showcase:** Affelay 4 taitoa: mittaa kuinka moni onnistuu täydessä pelissä (pelin jälkeen arvioi). Katso ylös, kiihdytä, suunnanmuutos, rytmi.
    - _Cue:_ La Masia: mittaa kehitystä, älä vain harjoittele — ilman mittausta et tiedä oletko kehittynyt.
    - _Viikkotavoite:_ Pujottelu 10 m — paranna lokakuun alun aikaa


### ronaldo  ·  Yamal  ·  1v1-liikkeet  (kehityskohde: koordinaatio)

- **[vk1] U-käännös (Zidane) — opitaan hitaasti**  ·  kesto 20 min · 20 XP
    - **Leikkijä:** Jalkapohja pallon päälle, vedä taaksepäin, käänny 180°. Hidas ensin! 15 kertaa oikealla jalalla, 15 vasemmalla. Ei kiire.
    - **Rakentaja:** U-draai: jalkapohja päälle → vedä taaksepäin → käänny 180° → kiihdytä. Tee 20 kertaa hitaasti ja oikein. Sitten: yliastuminen (saksi pallon yli). 20 kertaa. Ei vastustajaa.
    - **Showcase:** Ronaldo-sarja liikkeet 1–4 hitaasti: U-käännös | yliastuminen | U+yliastuminen yhdistettynä | Cruyff-käännös. 10 × kutakin, tekninen laatu ensin.
    - _Cue:_ Noordster-sääntö: "Koko sarja täytyy hallita ilman vastustajaa ennen kuin siirrytään passiiviseen."
    - _Viikkotavoite:_ U-käännös onnistuu 10/10 molemmilla jaloilla

- **[vk2] 1v1-liike — nopeammin**  ·  kesto 20 min · 20 XP
    - **Leikkijä:** Nyt nopeammin! U-käännös + heti kiihdytys. Tee liike ja juokse ohi nopeasti. 15 kertaa kummallakin jalalla.
    - **Rakentaja:** Valittu liike täydessä nopeudessa ilman vastustajaa: teeskentely + liike + kiihdytys alle 1 sekunnissa. 25 toistoa. Lisää: saksi (Robben) — vie jalka pallon yli 20 kertaa.
    - **Showcase:** Liikkeet 1–7 täydessä nopeudessa yksin. Mittaa: kuinka nopeasti teet liikkeen + kiihdytys 5 metriin? Tavoite alle 2 s.
    - _Cue:_ Räjähtävyys: tärkeää ei ole mitä liikettä — vaan kuinka nopeasti kiihdytät sen jälkeen.
    - _Viikkotavoite:_ Liike + 5 m kiihdytys alle 2 sekunnissa

- **[vk3] 1v1 — passiivinen puolustaja**  ·  kesto 20 min · 25 XP
    - **Leikkijä:** Kaveri seisoo edessä, ei liiku. Käytä U-käännöstä tai saksea ohittaaksesi hänet! 20 kertaa. Yllätä kaveri.
    - **Rakentaja:** Kaveri passiivisena: tee liike → ohita → kiihdytä. Kaveri voi liikkua hitaasti mutta ei ota palloa. 20 toistoa valitulla liikkeellä + 10 toistoa vapaasti valiten.
    - **Showcase:** Puoli-aktiivinen puolustaja (saa liikkua mutta ei taklata): ohita käyttäen Ronaldo-sarjan liikkeitä. 25 toistoa. Mikä liike toimii parhaiten sinulle?
    - _Cue:_ Noordster Taso 2: liikkeen täytyy toimia täydessä nopeudessa ennen siirtymistä täyteen 1v1:een.
    - _Viikkotavoite:_ Ohita passiivinen puolustaja 15/20 kertaa valitulla liikkeellä

- **[vk4] 1v1-mittaus — toimiiko pelissä?**  ·  kesto 20 min · 30 XP
    - **Leikkijä:** Pelaa 1v1-peliä kaverin kanssa 10 min. Laske: montako kertaa ohitit? Mitä liikettä käytit parhaiten?
    - **Rakentaja:** Täysi 1v1: 10 min peliä. Laske ohitukset. Arvioi: mikä liike toimi, mikä ei? Harjoittele heikkoa liikettä 10 min lisää.
    - **Showcase:** Täysi 1v1-peli 15 min + itsearvio: Ronaldo-sarjan liikkeistä mitkä 3 ovat jo omassa repertuaarissa? Mitkä tarvitsevat lisää työtä?
    - _Cue:_ Fulham-mittaus: toimiiko liike oikeassa pelissä? Jos ei — palaa vk 1:een.
    - _Viikkotavoite:_ Vähintään 1 onnistunut ohitus per pelitilanne


### beckham  ·  Trent  ·  Syöttäminen ja laukaus  (kehityskohde: syotto)

- **[vk1] Sisäjalkasyöttö — tarkka ja toistettava**  ·  kesto 20 min · 20 XP
    - **Leikkijä:** Lähetä pallo seinälle ja yritä osua samaan kohtaan 10 kertaa peräkkäin. Tukijalka pallon viereen — ei taakse! Laske ennätys.
    - **Rakentaja:** Sisäjalkasyöttö 20 toistoa: tukijalka pallon viereen | nilkka lukossa | osuma pallon keskikohtaan. Sitten wreeffi maassa 20 toistoa: koko jalkapöydän yläpuoli osuu palloon. Mittaa tarkkuus.
    - **Showcase:** Beckham-sarja muodot 1–3: sisäjalka | wreeffi maassa | suora ilmapassi. 15 × kutakin. Mittaa: osumakohta pallossa (pitää olla keskikohta).
    - _Cue:_ Beckham (ManUtd/Real Madrid): tukijalka ratkaisee suunnan. Wreeffi ratkaisee nopeuden.
    - _Viikkotavoite:_ 10 peräkkäistä sisäjalkasyöttöä samaan kohtaan

- **[vk2] Syöttö — etäisyydet kasvavat**  ·  kesto 20 min · 20 XP
    - **Leikkijä:** Syötä 5 metriin, sitten 10 metriin, sitten 15 metriin. Sama liike, pallo seuraa! Kumpi jalka on tarkempi?
    - **Rakentaja:** Syöttöprogressio: 10 m | 15 m | 20 m — sisäjalka ja wreeffi. Mittaa tarkkuus joka etäisyydellä. Tavoite: 8/10 osuu kohteeseen.
    - **Showcase:** Pitkä syöttö (kaareva/kierteinen, Beckham muoto 5) + ulkojalkapassi maassa (muoto 6). 15 toistoa kutakin. Mittaa kaartuma ja tarkkuus.
    - _Cue:_ La Masia: teknisesti taitavat pelaajat pystyvät pitämään pallon liikkeessä joka etäisyydellä.
    - _Viikkotavoite:_ 20 m sisäjalkasyöttö 8/10 osuu kohteeseen

- **[vk3] Syöttö kaverin kanssa — liikkuvaan kohteeseen**  ·  kesto 20 min · 25 XP
    - **Leikkijä:** Kaveri juoksee — syötä hänelle niin että pallo tulee hänen eteen! Ei perään. 15 kertaa kummallakin jalalla.
    - **Rakentaja:** Kaveri juoksee ristiin — syötä eteen tilaan, ei pelaajalle itselleen. 20 syöttöä. Sitten: lyhyt vaihto (1/2 kombinaatio, Beckham muoto 10) — syötä, juokse, saa takaisin.
    - **Showcase:** Läpisyöttö ulkojalalla (muoto 11, Pirlon erikoisuus) + voorzet maaliin päin (muoto 9). 10 × kutakin. Tarkkuus: osuu käytävään?
    - _Cue:_ Ajax: syöttö on kommunikaatiota. Pallo kertoo joukkuekaverille minne mennä.
    - _Viikkotavoite:_ Syöttö liikkuvaan kohteeseen 12/20 oikein ajoitettu

- **[vk4] Syöttö-mittaus**  ·  kesto 20 min · 30 XP
    - **Leikkijä:** Laske: montako kertaa lähetät pallon tarkasti 10 metriin? Tee 20 syöttöä ja laske pisteet.
    - **Rakentaja:** Syöttöhaaste: 20 syöttöä, eri etäisyydet (10/15/20 m). Laske pisteet: tarkka osuma = 1 p. Vertaa: oletko parempi kuin joulukuun alussa?
    - **Showcase:** Beckham-sarja 11 muotoa — montako hallitset jo? Käy läpi ja arvioi itsesi. Harjoittele 2 heikkointa 10 min.
    - _Cue:_ Fulham: viidennen viikon periaate — harjoittele sitä missä tulos jäi heikoimmaksi.
    - _Viikkotavoite:_ Syöttöhaaste 15/20 pistettä


### perus  ·  OMA/Bellingham  ·  Päivittäinen pallokosketus  (kehityskohde: pallonhallinta)

- **[vk1] Palloleikki — tee mitä tykkäät**  ·  kesto 15–20 min · 20 XP
    - **Leikkijä:** Ota pallo ja mene ulos. Pompauta seinään, kuljeta, leiki! 15 minuuttia — ei sääntöjä.
    - **Rakentaja:** Valitse yksi: seinäsyöttö 100 × 1 kosketus | pujottelu kartioilla 15 min | ponnauttelu heikolla jalalla 5 min.
    - **Showcase:** Vaativa tekniikka: seinäsyöttö 1-kosketuksella + samalla skannaa ympärillä — nimeä 3 asiaa ennen vastaanottoa. 20 min.
    - _Cue:_ Ajax: "daily touches" — joka päivä pallo, myös lepopäivinä.
    - _Viikkotavoite:_ Tee pallokosketus joka päivä


## 2. D-harjoitteet (aktivointi · liikeketju → idoli)


### D · SBL  ·  Vinícius

- **Hyppynaru + varpaille nousu**  ·  stage 1-2 · PHV-huom
    - **Leikkijä:** Hypi narulla 15 sekuntia — varpaat maahan, ei kantapäitä! Sitten nouse varpaille tolpan reunalla ylös-alas 10 kertaa. Tunnet pohkeesi.
    - **Rakentaja:** Naruhypyt 3×15s päkiäkontaktilla. Sitten tolpan reunalla: varpaille ylös → kantapää hitaasti alas reunan yli 3×10. Pehmeästi.
    - _Cue:_ Pohje ja akillesjänne ovat nopeutesi jousi. Päivittäinen aktivointi pitää ne notkeina.

- **Naruhypyt + pohjeeksentrinen**  ·  stage 3-4-5 · PHV-huom
    - **Rakentaja:** Naruhypyt 3×15s päkiäkontaktilla (ei kantapää maahan). Tolpan reunalla: varpaille ylös → kantapää hitaasti alas reunan ali. 3×10. Ei kipuun.
    - **Showcase:** Naruhypyt 3×15s — seuraa rytmiä, ei nopeutta. Pohjeeksentrinen tolpan reunalla 3×10 kontrolloidusti. SBL: takaketju aktivoituu jalkapohjasta selkään.
    - _Cue:_ Takaketju alkaa jalkapohjasta. Päivittäinen aktivointi estää kireydet ennen kuin ne syntyvät.


### D · SFL  ·  Haaland

- **Lonkka auki + askelkävelyt**  ·  stage 1-2 · PHV-huom
    - **Leikkijä:** Laita polvi maahan, toinen jalka eteenpäin. Kallista lantiota eteen kunnes tunnet venytyksen edessä. Pidä 30 sekuntia, vaihda. Sitten iso askelkävely 10 askelta.
    - **Rakentaja:** Hip flexor 90/90: polvi maahan, etujalan polvi 90°. Eteenpäin kunnes venytys lonkassa. 2×30s per puoli. Sitten askelkyykky-kävely 2×10m.
    - _Cue:_ Lonkka ohjaa ponnistuksen. Jos lonkka ei aukea, räjähtävyys jää puoliksi.

- **Hip flexor + askelkyykky-kävely**  ·  stage 3-4-5 · PHV-huom
    - **Rakentaja:** Hip flexor 90/90 2×45s per puoli: polvi maahan, eteen kunnes tunnet venytyksen. Sitten askelkyykky-kävely 2×10m — iso askel, polvi lähelle lattiaa.
    - **Showcase:** Hip flexor 90/90 2×45s per puoli. Askelkyykky-kävely 2×10m. SFL: lonkankoukistaja → quadriceps. Potku lähtee lonkasta.
    - _Cue:_ Lonkka ohjaa ponnistuksen. Jos lonkka ei aukea, lähtö jää puolitiehen — aina.


### D · LL  ·  Yamal

- **Simpukka + sivulankku**  ·  stage 1-2 · PHV-huom
    - **Leikkijä:** Makaa kyljelläsi, polvet yhteen. Avaa yläpolvi ylöspäin kuin simpukka — mutta pidä lantio paikallaan! 12 kertaa, sitten vaihda. Sitten sivulankku kyynärpäällä 20 sekuntia per puoli.
    - **Rakentaja:** Clamshell kylkimakuulla 2×12 per puoli: polvet yhteen, avaa yläpolvi ylös (lantio ei saa kaatua). Sitten sivulankku 2×20s per puoli.
    - _Cue:_ Nämä lihakset pitävät polvesi suorassa suunnanmuutoksissa. Pieni liike, iso vaikutus.

- **Clamshell + sivulankku**  ·  stage 3-4-5 · PHV-huom
    - **Rakentaja:** Clamshell 2×12 per puoli: kylkimakuulla, polvet yhteen, avaa ylös (lantio paikallaan). Sitten sivulankku 2×20s per puoli: keho suorana sivulta.
    - **Showcase:** Clamshell 2×12 gluteus medius -aktivaatiolla. Sivulankku 2×20s. LL: gluteus medius estää valgus-kollapsın suunnanmuutoksissa.
    - _Cue:_ Sivuttainen vakaus pitää polven linjassa. Tämä on ACL:n paras ennaltaehkäisy.


### D · DIAG  ·  Bellingham

- **Seinäsyöttö — molemmat jalat**  ·  stage 1-2 · PHV-huom
    - **Leikkijä:** Lähetä pallo seinälle oikealla jalalla — ota takaisin vasemmalla. Sitten toisinpäin. 20 kertaa per jalka. Pidä pallo lähellä!
    - **Rakentaja:** Seinäsyöttö vuorojaloilla 3×20: oikealla syötät, vasemmalla vastaanotat, takaisin. Pallo pysyy maassa. 1 kosketus per jalka.
    - _Cue:_ Rintakehä ohjaa — jalka seuraa automaattisesti. DIAG: syöttö on kiertoketjun + yhdistelmäketjun harjoite yhtä aikaa.

- **Seinäsyöttö + ponnauttelu — DIAG päivittäin**  ·  stage 3-4-5 · PHV-huom
    - **Rakentaja:** Seinäsyöttö vuorojaloilla 3×20 (1-kosketus takaisin). Sitten ponnauttelu 3×1 min: molemmat jalat vuorotellen, laske ääneen. Tavoite 20+ per min.
    - **Showcase:** Seinäsyöttö 3×20 vuorojaloilla — 1 kosketus, ei pysähdystä. Ponnauttelu 3×1 min. SL: kiertoketju lähtee rintakehästä. Mittaa ponnauttelu per min.
    - _Cue:_ Forsman 2013: ponnauttelu + syöttö erottelivat lahjakkaita kaikissa ikäluokissa. Molemmat ovat DIAG-harjoitteita.


### D · DFL  ·  — (perusta)

- **Hengitys + kissa-lehmä**  ·  stage 1-2 · PHV-huom
    - **Leikkijä:** Mene nelinkontin. Hengitä syvään sisään — selkä koukkuun kuin kissa joka sihistää. Hengitä ulos — selkä notkoon kuin lehmä. Tee 8 kertaa rauhallisesti. Sitten lennä: toinen käsi ja vastakkainen jalka suorana 8 kertaa.
    - **Rakentaja:** Cat-cow nelinkontin 3×8: sisään → selkä ylös (cat), ulos → selkä alas (cow). Sitten dead bug 3×5 per puoli: selinmakuulla, alaselkä kiinni lattiassa, laske vastapoinen käsi + jalka hitaasti.
    - _Cue:_ Hengitys on kehon pohja. Kun hengität oikein, selkäsi vahvistuu automaattisesti.

- **360° hengitys + dead bug**  ·  stage 3-4-5 · PHV-huom
    - **Rakentaja:** 360° palleahengitys 3×5: hengitä sisään niin että vatsa, kyljet JA selkä laajenevat. Dead bug 3×5 per puoli: alaselkä maassa koko ajan, laske vastakkainen käsi + jalka hitaasti.
    - **Showcase:** 360° palleahengitys 3×5. Dead bug 3×5 per puoli — alaselkä koko ajan maassa. DFL: pallea on ainoa lihas joka toimii sekä hengityslihaksena että lantion stabilaattorina.
    - _Cue:_ DFL:n ydin on pallea. Kolar 2012: syvä core on pohja kaikelle muulle liikkumiselle.


### D · PIG  ·  Bellingham

- **Katso ennen — seinäpallo**  ·  stage 1-2 · PHV-huom
    - **Leikkijä:** Lähetä pallo seinälle. ENNEN kuin pallo tulee takaisin — katso ympärillesi ja nimeä yksi asia jonka näet. Sitten ota pallo. 3 minuuttia. Hauskaa? Kokeile nimetä asioita nopeammin!
    - **Rakentaja:** Seinäsyöttö 3×2 min: syötä, katso ylös ja nimeä 1 asia ennen vastaanottoa. Vaikeudu: 3 asiaa, sitten nimeä väri ja muoto.
    - _Cue:_ Katse ylös ennen kosketusta — tätä parhaat tekevät automaattisesti. Opitaan nyt.

- **Skannausrutiini — katso ensin**  ·  stage 3-4-5 · PHV-huom
    - **Rakentaja:** Seinäsyöttö 3×2 min: syötä, ENNEN vastaanottoa katso ylös ja nimeä 3 asiaa ympärillä. Kasvata nopeutta progressiivisesti sarjan sisällä.
    - **Showcase:** Seinäsyöttö 3×2 min — pre-scanning: katso ylös ja nimeä 3 asiaa ennen vastaanottoa. Kasvata nopeutta. ADAR: Anticipation-vaihe. Mittaa: kuinka moni kerta katse ylös per 2 min.
    - _Cue:_ Vaeyens 2007: pre-scanning erottaa eliitit subeliitistä paremmin kuin fysiikka.


## 3. S-harjoitteet (kohdennettu · liikeketju → idoli)


### S · SBL  ·  Vinícius

- **Reaktiolähtö — pallo maahan**  ·  vk parillinen · stage 1-2
    - **Leikkijä:** Heitä pallo maahan — kun se pomppaa, juokse täysillä 15 metriä! Tee 5 kertaa, sitten lepää hetki ja toista 3 kertaa. Kuka on nopein?
    - **Rakentaja:** Heitä pallo lattiaan, lähde HETI kun se koskee maata. 5×3 lähtöä täysvauhtia 15m. Palautus kävellen. Laske lähtöreaktioasi.
    - _Cue:_ Ensimmäinen askel ratkaisee. Ajax: reaktio ei ole synnynnäinen — se harjoitellaan.

- **Reaktiolähtö + pallonhallinta**  ·  vk parillinen · stage 3-4
    - **Rakentaja:** Pallo 5m eteen — räjähtävä lähtö, vastaanota ja kuljeta 15m. 6 toistoa täydellä palautuksella. Pallo laukaisee lähdön — ei odoteta.
    - **Showcase:** Pallo 5m eteen. Reaktiivinen sprint → vastaanota → kuljeta 15m. 6 toistoa / täysi palautus. Seuraa: reaktioaika paranee vai ei?
    - _Cue:_ Lähtö pelissä alkaa ärsykkeestä — pallo, pelaaja, huuto. Harjoittele juuri sitä.

- **Reaktiolähtö + laukaus maaliin**  ·  vk parillinen · stage 5
    - **Showcase:** Pallo 5m eteen → sprint → vastaanota → kuljeta 15m → laukaus maaliin. 6 toistoa. Mittaa: osumakohta maalissa (nurkkailma / nurkkamaa / keski). Laukaustarkkuus kirjataan.
    - _Cue:_ Stage 5: ei vain nopeus vaan tarkkuus paineessa. Tämä on pelitilanne.

- **5-loikka — kuinka kauas?**  ·  vk pariton · stage 1-2
    - **Leikkijä:** Hyppää viisi kertaa peräkkäin niin kauas kuin pääset! Molemmat jalat ponnistaa, molemmat jalkaa maahan. Mittaa kädellä tai katso maasta merkki. Yritä kolme kertaa — paranisiko?
    - **Rakentaja:** 5-loikka paikaltaan 3 kertaa — mittaa tai arvioi matka. Sitten 3×30m sprintti täydellä palautuksella (2 min). Kirjaa tulokset.
    - _Cue:_ Liikanen & Törmä 2025: 5-loikka erotteli ammattilaisiksi yltäneet. Mittaa missä olet.

- **5-loikka ajalla + Nordic curl**  ·  vk pariton · stage 3-4
    - **Rakentaja:** 5-loikka 3× maksimilla, mittaa matka. Sitten Nordic curl avustettu: kumppaani tai seinä pitää kantapäistä, laske HITAASTI eteen 3×5. Palaa käsillä.
    - **Showcase:** 5-loikka 3× — mittaa ja vertaa edelliseen kertaan. Nordic curl eksentrinen 3×5: laske hallitusti, palaa käsillä. SBL: hamstring eksentrisenä = loukkaantumissuoja.
    - _Cue:_ Petersen 2011: Nordic hamstring -ohjelma vähensi hamstring-vammoja 51%.

- **5-loikka + Nordic curl täysi**  ·  vk pariton · stage 5
    - **Showcase:** 5-loikka 3× — kirjaa matka, vertaa kauden alkuun. Nordic curl täysi 3×5 (ei käsiapua). SBL eksentrisenä huipputasolla. Seuraa asymmetriaa: oikea vs vasen.
    - _Cue:_ Stage 5: itsenäinen laadun arviointi. Asymmetria > 10% = puoliero korjattava.


### S · LL  ·  Yamal

- **T-rata — laita aika**  ·  vk parillinen · stage 1-2
    - **Leikkijä:** Aseta 4 merkkiä T-kirjaimen muotoon. Juokse eteen, sitten sivuille, sitten takaisin. Ota aika puhelimella! Yritä 4 kertaa. Paraniko aika?
    - **Rakentaja:** T-rata 4 kartiolla: eteen 5m, sivu 2.5m + 2.5m, taakse 5m. Ota aika 4× täydellä palautuksella. Tavoite: parannu 0.1s per viikko.
    - _Cue:_ Kolme askelta jarrutuksessa — ei yhdellä. Ensimmäinen askel uuteen suuntaan ratkaisee.

- **T-rata pallolla + reaktio**  ·  vk parillinen · stage 3-4
    - **Rakentaja:** T-rata pallon kanssa — pallo pysyy lähellä käänteissä. 4 toistoa, ota aika. Sitten reaktio-SM: partneri osoittaa suunnan, lähde heti. 6× per puoli.
    - **Showcase:** T-rata pallollinen 4× — ota aika, vertaa pallottomaan. Reaktio-SM 6× per puoli. Pallollinen vs. palloton ero kertoo teknisestä tasosta.
    - _Cue:_ Forsman 2013: pujottelu + reaktio erottelivat lahjakkaita. Pallo + SM = jalkapallon ydin.

- **T-rata + 1v1-feinti**  ·  vk parillinen · stage 5
    - **Showcase:** T-rata maksimiteholla 3×. Sitten 1v1-peli pienellä alueella (5×5m): ohita vastustaja feintillä 3×2 min. Peli ratkaisee — ei harjoitusnumero.
    - _Cue:_ Stage 5: tekniikka paineessa. Pelitilanne on paras opettaja.

- **Sivuhyppely + luisteluaskeleet**  ·  vk pariton · stage 1-2
    - **Leikkijä:** Hyppää sivulle yhdellä jalalla 8 kertaa per jalka — kuin luistelija! Sitten liu'u sivulle kyykyssä 20 metriä. Tunnetko pohkeet ja reidet?
    - **Rakentaja:** Lateraaliloikat 3×8 per puoli: hyppää sivulle, laske hallitusti, stabiloi ennen seuraavaa. Sitten luisteluaskeleet 2×20m: laaja liuku sivulle kyykyssä.
    - _Cue:_ 3 askelta jarrutuksessa — sivuliike on jalkapallon eniten aliharjoiteltu ominaisuus.

- **YJ-laskeutuminen sivulle + pito**  ·  vk pariton · stage 3-4
    - **Rakentaja:** Hyppää sivulle yhdellä jalalla → laske hallitusti kyykkyyn → pidä 2s. Polvi suoraan jalkaterän yli — ei sisäänpäin! 5 toistoa per jalka × 3 sarjaa.
    - **Showcase:** Lateraalinen YJ-laskeutuminen 5× per jalka × 3 sarjaa. Pito 2s. Seuraa: polvi sisäänpäin = gluteus medius heikko. Valgus-kollapsi = ACL-riski.
    - _Cue:_ Valgus-kollapsi laskeutuessa on ACL-vamman mekaaninen momentti. Gluteus medius estää sen.

- **Reaktiivinen YJ-loikka — ei pitoa**  ·  vk pariton · stage 5
    - **Showcase:** Reaktiivinen sivuloikka ilman pitoa: loiki sivulle → välittömästi takaisin. 3×8 per suunta. Kosketusnopeus tavoite alle 0.3s. Tasapainolauta laskeutuessa (Everton Stage 5).
    - _Cue:_ Stage 5: reaktiivinen — kosketusnopeus ratkaisee. Tasapainolauta lisää proprioseptiivisen haasteen.


### S · DFL  ·  — (perusta)

- **Lankku + "lentävä koira"**  ·  vk parillinen · stage 1-2
    - **Leikkijä:** Lankku kyynärpäillä 20 sekuntia — keho suorana kuin lauta, pakarat alas! Sitten "lentävä koira": nelinkontin, nosta vastapoinen käsi + jalka suorana. 8 kertaa per puoli.
    - **Rakentaja:** Lankku 3×20s + sivulankku 3×15s per puoli. Sitten bird dog 3×8 per puoli: nelinkontin, vastapoinen käsi + jalka hitaasti suorana.
    - _Cue:_ Keho on ketju — heikko keskiosa tarkoittaa energian hukkaan menemistä joka liikkeessä.

- **Progressiivinen lankku + tasapaino**  ·  vk parillinen · stage 3-4
    - **Rakentaja:** Lankku 3×30s → kasvaa viikoittain 10s. Sivulankku 3×20s per puoli. Bird dog 3×8. Sitten yhden jalan seisonta silmät kiinni 3×20s.
    - **Showcase:** Lankku 3×35s. Sivulankku 3×25s per puoli. Bird dog 3×10. YJ-seisonta silmät kiinni 3×25s. Seuraa lankun kestoa — tavoite 20s → 60s 6 viikossa.
    - _Cue:_ McGill 2010: lankku + sivulankku + bird dog = kliinisesti validoitu perusrutiini.

- **Karhukävely + pistoolikyykky**  ·  vk parillinen · stage 5
    - **Showcase:** Karhukävely 2×10m (Everton Stage 1→4: lantio ei heiluu). Sitten pistoolikyykky ilman seinää 3×5 per jalka. Sitten pallolla tasapainoistunta YJ:llä 3×30s. DFL-huipputaso.
    - _Cue:_ Stage 5: dynaaminen core + unilateraalinen voima + pallollinen tasapaino. Kaikki samassa.

- **Tasapaino + vatsarutistus lennossa**  ·  vk pariton · stage 1-2
    - **Leikkijä:** Seiso yhdellä jalalla niin kauan kuin pystyt! Sitten vaihda. Sitten makaa selinmakuulla: laske toinen jalka hitaasti lattiaa kohti — mutta ei ihan alas! Toista 8 kertaa per jalka.
    - **Rakentaja:** YJ-seisonta 3×30s per jalka. Sitten "leg lowering" 3×8 per jalka: selinmakuulla, laske jalka hitaasti kohti lattiaa (alaselkä pysyy lattiassa).
    - _Cue:_ Tasapaino paranee vain haastamalla tasapainoa. YJ on se taso jota kentällä tarvitaan.

- **YJ-tasapaino silmät kiinni + pistoolikyykky**  ·  vk pariton · stage 3-4
    - **Rakentaja:** YJ-seisonta silmät kiinni 3×30s per jalka. Sitten pistoolikyykky seinää vasten 3×5 per jalka — hidas ja hallittu. Laatu ennen nopeutta.
    - **Showcase:** YJ-seisonta silmät kiinni 3×35s. Pistoolikyykky seinää vasten → tavoite ilman seinää 3×5. DFL: tasapaino + unilateraalinen voima samassa.
    - _Cue:_ Silmät kiinni kaksinkertaistaa haasteen. DFL joutuu töihin — ei voi huijata.

- **Tasapainolauta + karhukävely + pistoolikyykky**  ·  vk pariton · stage 5
    - **Showcase:** YJ tasapainolauta 3×30s. Karhukävely 2×10m (lantio paikallaan). Pistoolikyykky ilman tukea 3×5. DFL Stage 5 — kaikki kolme samassa sessiossa.
    - _Cue:_ Stage 5: autonominen stabiliteetti. Keho korjaa itse ilman tietoista kontrollia.


### S · DIAG  ·  Bellingham

- **Katso & nimeä — seinäpallo**  ·  vk parillinen · stage 1-2
    - **Leikkijä:** Lähetä pallo seinälle. Ennen kuin se tulee takaisin — katso ympärille ja nimeä KOLME asiaa mitä näet. Sitten ota pallo. 5 minuuttia. Hauskaa! Teetkö sen nopeammin kuin kaverisi?
    - **Rakentaja:** Seinäpallo 5 min: syötä, katso ylös ja nimeä 3 asiaa ympärillä ENNEN vastaanottoa. Kasvata nopeutta progressiivisesti.
    - _Cue:_ Barcelona: katse ylös ennen kosketusta. Tämä yksi rutiini erottaa hyvän pelaajan erinomaisesta.

- **Päätöksenteko numeroilla**  ·  vk parillinen · stage 3-4
    - **Rakentaja:** Seiso 10m seinästä. Kädessä paperi (1=vasen 2=oikea 3=ylä 4=ala). Nosta numero → syötä HETI oikeaan suuntaan. 4×2 min. Nopeuta progressiivisesti.
    - **Showcase:** Reaktiivinen päätöksenteko 4×2 min: numero → syöttö alle 0.5s. Seuraa: kuinka monta oikeaa reaktiota per 2 min? Kasvata nopeutta joka sarja.
    - _Cue:_ Moran 2012: päätöksentekokyky paineessa on opetettavissa. Tämä pakottaa reaktiivisen valinnan.

- **ADAR Honey Trap**  ·  vk parillinen · stage 5
    - **Showcase:** Seinäsyöttö — välillä toinen pallo heitetään yllättäen eri suuntaan. Reagoi välittömästi uuteen palloon. 3×3 min. Kirjaa: oikeat reaktiot / 10 tilannetta. ADAR: kaikki 4 vaihetta samaan aikaan.
    - _Cue:_ Stage 5 ADAR: Anticipation → Decision → Action → Recovery. Pelitilanne täysillä.

- **Virhe-leikki — reagoi heti**  ·  vk pariton · stage 1-2
    - **Leikkijä:** Seinäpallo: yritä TARKOITUKSELLA tehdä huono syöttö — sitten reagoi heti! Älä pysähdy virheen jälkeen. 3 minuuttia. Pelissä tulee virheitä — harjoitellaan reagoimaan niihin!
    - **Rakentaja:** Seinäsyöttö 3×1 min: tee tarkoituksella virheellinen syöttö (liian kova, väärä suunta), reagoi välittömästi. Älä pysähdy virheen jälkeen.
    - _Cue:_ Moran 2012: kyky sivuuttaa häiritseviä ärsykkeitä on huippupelaajan merkki. Virhe → reagoi → jatka.

- **Peliälyvideo + skannaus**  ·  vk pariton · stage 3-4
    - **Rakentaja:** Katso 5 min huippupelaajan videota (sama pelipaikka). Kirjaa 2 havaintoa heidän katseen käytöstä. Sitten seinäsyöttö skannauksen kanssa 3×2 min.
    - **Showcase:** Katso 5 min videota (oma peli tai huippu). Kirjaa: kuinka usein pelaaja katsoo ylös per minuutti? Sitten ADAR-skannaus 3×2 min. Vertaa omaa videoon.
    - _Cue:_ ADAR: Anticipation. Mentaalinen harjoittelu + fyysinen harjoittelu = nopein kehitys.

- **Dual-task seinärondo**  ·  vk pariton · stage 5
    - **Showcase:** Seinärondo + kognitiivinen tehtävä: syötä 1-kosketuksella samalla kun lasket ääneen parillisia lukuja (2,4,6...). 3×3 min. Virhe kognitiivisessa tai teknisessä → jatka silti.
    - _Cue:_ Dual-task: aivojen pitää jakaa huomio. Tämä on se mitä pelissä tapahtuu koko ajan.


### S · SFL  ·  Haaland

- **Hip flexor venytys + askelkyykky-kävely**  ·  vk parillinen · stage 1-2
    - **Leikkijä:** Mene polvi maahan, toinen jalka eteen. Kallista lantiota eteen kunnes tunnet venytyksen edessä. Pidä 30 sekuntia! Sitten iso askelkävely 10 askelta eteenpäin.
    - **Rakentaja:** Hip flexor 90/90: polvi maahan, etupolvi 90°. Kallista lantiota eteen 2×30s per puoli. Sitten askelkyykky-kävely 2×10m — iso askel, polvi lähelle lattiaa.
    - _Cue:_ Lonkankoukistaja on pelaaajan jarru. Kireä lonkankoukistaja = hidas lähtö, pienentynyt askelpituus.

- **Hip flexor 90/90 + askelkyykky-kiihdytys**  ·  vk parillinen · stage 3-4
    - **Rakentaja:** Hip flexor 90/90 2×45s per puoli. Sitten: askelkyykky-kävely 2×10m, ja lopuksi 4×15m kiihdytys — ensimmäinen askel lonkasta, ei polvesta. Laske: kuinka nopeasti olet täydessä vauhdissa?
    - **Showcase:** Hip flexor 90/90 2×45s. Askelkyykky 2×10m. SFL-kiihdytys: 4×15m — arvioi ensimmäisen 5m reaktiivisuus. Lonkka ohjaa, polvi seuraa.
    - _Cue:_ Benfica-akatemian mittaus: ensimmäinen 5m ennustaa 30m:tä paremmin pelitilanteiden nopeutta.

- **Thomas-venytys + pelispesifi kiihdytyssarjat**  ·  vk parillinen · stage 5
    - **Showcase:** Thomas-venytys 2×45s per puoli + 90/90 2×45s. Sitten pelispesifi: 6×10m kiihdytys reaktioärsykkeestä (pallo, käsimerki). Mittaa: aikaa ensimmäiseen 5m:iin paranee kauden aikana?
    - _Cue:_ Stage 5: lonkankoukistajan liikkuvuus + räjähtävä reaktiviteetti pelissä. Molemmat samassa sessiossa.

- **Pistoolikyykky progressio — yksijalkainen**  ·  vk pariton · stage 1-2
    - **Leikkijä:** Seiso yhdellä jalalla, toinen suorana edessä. Kyykky alas niin pitkälle kuin pystyt — pidä selkä suorana. Nouse takaisin! 8 kertaa per jalka, 2 sarjaa.
    - **Rakentaja:** Pistoolikyykky kehitys: aloita tuettuna (tuoli tai seinä) 2×8 per jalka. Laske: kuinka syvälle pääset ilman kantapään nousua?
    - _Cue:_ Pistoolikyykky testaa yksijalkaisesta voimaa ja tasapainoa. Pelissä jokainen askel on yksijalkainen.

- **Pistoolikyykky + Nordic curl yhdistelmä**  ·  vk pariton · stage 3-4-5
    - **Rakentaja:** Pistoolikyykky 3×8 per jalka (ilman tukea tai kevyt tuki). Sitten Nordic curl avustettu 3×5: kumppanikäsin kantapäistä, laske hitaasti eteen, palaa käsillä.
    - **Showcase:** Pistoolikyykky 3×8 (täysi liike). Nordic curl eksentrinen 3×5: laske hallitusti, palaa käsillä. SFL-yhdistelmä: etuketjun voima + takareiden suoja = lähtö + jarruttaminen.
    - _Cue:_ Liikanen 2025: pistoolikyykky + Nordic curl yhdistelmä vähensi hamstring-vammoja 51%. Tämä on se tärkein harjoite.


## 4. T_KOHDE_PANKKI (kehityskohde suoraan → idoli)


### ponnauttelu  ·  Bellingham

- **Pomppulaskuri**  ·  kesto 10 min · 20 XP
    - **Leikkijä:** Pomputa palloa jalalla — montako kertaa peräkkäin saat ennen kuin se tippuu? Laske ja kirjaa ennätys. Yritä päihittää eilinen!
    - **Rakentaja:** Ponnauttelu vahvalla jalalla, tavoite 30 peräkkäistä. Pidä pallo matalalla (polven alapuolella), nilkka lukossa. Kun 30 onnistuu, vaihda heikkoon jalkaan.
    - **Showcase:** Ponnauttelu molemmin jaloin vuorotellen, pallo polven korkeudella, tavoite 50 peräkkäistä. Lisää reisi- ja olkapääkosketukset sekaan rytmiä rikkomatta.
    - _Cue:_ Ronaldinho: ponnauttelu opettaa pallon kielen — kuinka se reagoi jokaiseen kosketukseen.
    - _Viikkotavoite:_ Paranna peräkkäisten ponnautusten ennätystä

- **Reisi–jalka-rytmi**  ·  kesto 10 min · 20 XP
    - **Leikkijä:** Pomputa näin: reisi → jalka → reisi → jalka. Pidä rytmi kuin laulussa. Montako kierrosta jaksat ilman tippumista?
    - **Rakentaja:** Yhdistelmäponnauttelu: reisi–jalka–reisi yhdellä jalalla, sitten vaihto toiseen. 5 kierrosta ilman tippumista. Kontrolli ennen vauhtia.
    - **Showcase:** Vapaa ponnauttelusarja: reisi, sisäjalka, ulkojalka, olkapää — vaihtele kosketuspintaa rytmiä menettämättä. 2 min yhtäjaksoisesti.
    - _Cue:_ Pallo tottelee sitä jolla on tuntuma jokaisesta pinnasta.
    - _Viikkotavoite:_ Reisi–jalka 5 kierrosta putkeen

- **Seinäponnautus**  ·  kesto 12 min · 25 XP
    - **Leikkijä:** Potkaise pallo seinään ilmaan ja ota se haltuun ilmasta ennen kuin se osuu maahan. 10 onnistunutta!
    - **Rakentaja:** Seinäponnautus: syötä seinään ilmaan, vastaanota ilmasta yhdellä pehmeällä kosketuksella, ponnauta takaisin. 15 kosketusta ilman maahantippumista.
    - **Showcase:** Seinäponnautus vuorojaloin: ensimmäinen kosketus pehmentää, toinen syöttää. 20 toistoa + skannaa: nimeä kohde ennen jokaista syöttöä.
    - _Cue:_ Ilmapallon hallinta erottaa pelaajan joka pelaa nopeudella.
    - _Viikkotavoite:_ Seinäponnautus 15 kosketusta ilman maahantippumista


### nopeus  ·  Vinícius

- **Kiihdytys pallon kanssa**  ·  kesto 12 min · 20 XP
    - **Leikkijä:** Kuljeta pallo niin nopeasti kuin pystyt 10 metriä, pysäytä, ja takaisin. Pallo pysyy lähellä! 6 kertaa täysillä, hengähdä välissä.
    - **Rakentaja:** Kiihdytysvedot pallon kanssa: 0–15 m maksimivauhtia, pallo enintään askeleen päässä. 6 toistoa, täysi palautus välissä. Pysyykö pallo hallinnassa täydessä vauhdissa?
    - **Showcase:** Kiihdytys pallolla 20 m, viimeiset 5 m ilman katsetta palloon (skannaa eteen). 8 toistoa. Vertaa: kuljetus ilman palloa vs. pallon kanssa (TSI-erotus).
    - _Cue:_ Mbappé: nopeus pallon kanssa on eri taito kuin nopeus ilman — sitä harjoitellaan erikseen.
    - _Viikkotavoite:_ Pallo hallinnassa 15 m täysvauhdissa

- **Suunnanmuutos kartioilla**  ·  kesto 12 min · 25 XP
    - **Leikkijä:** 3 merkkiä lattiaan — kivi, reppu tai paita käy — 5 metrin välein. Kuljeta pallo, käänny terävästi jokaisella, kiihdytä. 8 kertaa.
    - **Rakentaja:** Suunnanmuutosrata: kartiot 5 m välein, terävä 90° käännös jokaisella + välitön kiihdytys ulos. Pallo lähellä käännöksessä. 8 läpimenoa, ajanotto.
    - **Showcase:** Suunnanmuutos täydessä vauhdissa: 180° käännös pysäytyksellä + räjähtävä lähtö vastakkaiseen suuntaan, molemmat jalat. 10 toistoa, mittaa palautumisaika.
    - _Cue:_ Pelin nopeus on suunnanmuutosnopeutta, ei suoraa juoksua.
    - _Viikkotavoite:_ Terävä käännös ilman pallon karkaamista

- **Reaktiolähtö**  ·  kesto 10 min · 20 XP
    - **Leikkijä:** Kaveri huutaa "NYT!" — lähde silloin pallon kanssa täysillä 5 metriä. Tai heittämäsi pallo pomppaa merkiksi — lähde heti! 8 kertaa.
    - **Rakentaja:** Reaktiolähtö: odota merkkiä (kaverin huuto tai käsimerkki), lähde pallolla räjähtävästi 5–10 m. 8 toistoa. Kuinka nopeasti reagoit ja olet täydessä vauhdissa?
    - **Showcase:** Reaktiolähtö valinnalla: kaveri osoittaa suunnan merkkihetkellä, lähde sinne pallolla. 10 toistoa. Yhdistä havainto + kiihdytys — tämä on pelin lähtö.
    - _Cue:_ Ensimmäinen askel ratkaisee — reaktio + kiihdytys voittaa metrit.
    - _Viikkotavoite:_ Lähtö merkistä ilman viivettä


## Yhteenveto & aukot
- Harjoitteita yhteensä: **64** (17 T-meso + 12 D + 29 S + 6 T_KOHDE).
- **Aukko:** Kane (Maalinteko/SFL) = 0 harjoitetta → luotava Vaiheessa 2.
- **Ei idolia:** DFL (8 kpl, core/ryhti) = ikävaiheriippumaton fyysinen perusta.
- **Vaihe 2 tehty:** kaka → Bellingham (vk1-4 ohjeet valmennuksellisesti päivitetty).

