/* ════════════════════════════════════════════════════════════════════════
   tm_koti_oletus.js — TM:n OLETUSKOTIHARJOITTEET kohteittain (D16: seuran sisältö ensin, TM varalla; V1 jakson aloitus). GENEROITU: node scripts/gen_koti_oletus.js — älä muokkaa käsin.
   Lähde: harjoitelogiikka_v4.js (T_KOHDE_PANKKI + PANKKI.T mesosyklit). Testi tests/koti_oletus.test.js vartioi ajautumisen. Muoto: { kehityskohde: [{nimi, kesto, ohje_leikkija, ohje_rakentaja, ohje_showcase}] }.
   Dual-export: module.exports || window.TM_KOTI_OLETUS.
════════════════════════════════════════════════════════════════════════ */
(function (root) {
  'use strict';
  var DATA = {
 "ponnauttelu": [
  {
   "nimi": "Pomppulaskuri",
   "kesto": "10 min",
   "ohje_leikkija": "Pomputa palloa jalalla — montako kertaa peräkkäin saat ennen kuin se tippuu? Laske ja kirjaa ennätys. Yritä päihittää eilinen!",
   "ohje_rakentaja": "Ponnauttelu vahvalla jalalla, tavoite 30 peräkkäistä. Pidä pallo matalalla (polven alapuolella), nilkka lukossa. Kun 30 onnistuu, vaihda heikkoon jalkaan.",
   "ohje_showcase": "Ponnauttelu molemmin jaloin vuorotellen, pallo polven korkeudella, tavoite 50 peräkkäistä. Lisää reisi- ja olkapääkosketukset sekaan rytmiä rikkomatta."
  },
  {
   "nimi": "Reisi–jalka-rytmi",
   "kesto": "10 min",
   "ohje_leikkija": "Pomputa näin: reisi → jalka → reisi → jalka. Pidä rytmi kuin laulussa. Montako kierrosta jaksat ilman tippumista?",
   "ohje_rakentaja": "Yhdistelmäponnauttelu: reisi–jalka–reisi yhdellä jalalla, sitten vaihto toiseen. 5 kierrosta ilman tippumista. Kontrolli ennen vauhtia.",
   "ohje_showcase": "Vapaa ponnauttelusarja: reisi, sisäterä, ulkojalka, olkapää — vaihtele kosketuspintaa rytmiä menettämättä. 2 min yhtäjaksoisesti."
  },
  {
   "nimi": "Seinäponnautus",
   "kesto": "12 min",
   "ohje_leikkija": "Potkaise pallo seinään ilmaan ja ota se haltuun ilmasta ennen kuin se osuu maahan. 10 onnistunutta!",
   "ohje_rakentaja": "Seinäponnautus: syötä seinään ilmaan, vastaanota ilmasta yhdellä pehmeällä kosketuksella, ponnauta takaisin. 15 kosketusta ilman maahantippumista.",
   "ohje_showcase": "Seinäponnautus vuorojaloin: ensimmäinen kosketus pehmentää, toinen syöttää. 20 toistoa + skannaa: nimeä kohde ennen jokaista syöttöä."
  }
 ],
 "nopeus": [
  {
   "nimi": "Kiihdytys pallon kanssa",
   "kesto": "12 min",
   "ohje_leikkija": "Kuljeta pallo niin nopeasti kuin pystyt 10 metriä, pysäytä, ja takaisin. Pallo pysyy lähellä! 6 kertaa täysillä, hengähdä välissä.",
   "ohje_rakentaja": "Kiihdytysvedot pallon kanssa: 0–15 m maksimivauhtia, pallo enintään askeleen päässä. 6 toistoa, täysi palautus välissä. Pysyykö pallo hallinnassa täydessä vauhdissa?",
   "ohje_showcase": "Kiihdytys pallolla 20 m, viimeiset 5 m ilman katsetta palloon (skannaa eteen). 8 toistoa. Vertaa: kuljetus ilman palloa vs. pallon kanssa (TSI-erotus)."
  },
  {
   "nimi": "Suunnanmuutos kartioilla",
   "kesto": "12 min",
   "ohje_leikkija": "3 merkkiä lattiaan — kivi, reppu tai paita käy — 5 metrin välein. Kuljeta pallo, käänny terävästi jokaisella, kiihdytä. 8 kertaa.",
   "ohje_rakentaja": "Suunnanmuutosrata: kartiot 5 m välein, terävä 90° käännös jokaisella + välitön kiihdytys ulos. Pallo lähellä käännöksessä. 8 läpimenoa, ajanotto.",
   "ohje_showcase": "Suunnanmuutos täydessä vauhdissa: 180° käännös pysäytyksellä + räjähtävä lähtö vastakkaiseen suuntaan, molemmat jalat. 10 toistoa, mittaa palautumisaika."
  },
  {
   "nimi": "Reaktiolähtö",
   "kesto": "10 min",
   "ohje_leikkija": "Kaveri huutaa \"NYT!\" — lähde silloin pallon kanssa täysillä 5 metriä. Tai heittämäsi pallo pomppaa merkiksi — lähde heti! 8 kertaa.",
   "ohje_rakentaja": "Reaktiolähtö: odota merkkiä (kaverin huuto tai käsimerkki), lähde pallolla räjähtävästi 5–10 m. 8 toistoa. Kuinka nopeasti reagoit ja olet täydessä vauhdissa?",
   "ohje_showcase": "Reaktiolähtö valinnalla: kaveri osoittaa suunnan merkkihetkellä, lähde sinne pallolla. 10 toistoa. Yhdistä havainto + kiihdytys — tämä on pelin lähtö."
  }
 ],
 "pallonhallinta": [
  {
   "nimi": "Maestro — Pysäytys sisäterällä",
   "kesto": "15 min",
   "ohje_leikkija": "10 kertaa: pomppaa seinään ja pysäytä sisäterällä. Suuntaa pallo sinne mihin haluat juosta seuraavaksi.",
   "ohje_rakentaja": "3×10, molemmat jalat. Sisäterä vastaanottaa — 1. kosketus osoittaa seuraavan suunnan ennen kuin puolustaja reagoi.",
   "ohje_showcase": "4×10, vaihda jalkaa sarjojen välissä. Automaatti: sisäterä kehon alle, jalkaterä pelattavaan suuntaan ennen pallonkosketusta."
  },
  {
   "nimi": "Maestro — Vastaanota ja käännä",
   "kesto": "15 min",
   "ohje_leikkija": "12 kertaa: ota pallo seinästä ja käännä se heti uuteen suuntaan sisäterällä. Älä pysäytä paikalleen — pallo lähtee jo eteenpäin.",
   "ohje_rakentaja": "3×12, vuorojaloin. Avaa lantio ennen kosketusta — 1. kosketus kääntää pallon pois sieltä mistä se tuli, niin saat aikaa ja tilaa.",
   "ohje_showcase": "4×12, käännä molempiin suuntiin. Automaatti: skannaa olkapään yli ennen palloa, sisäterän kosketus avaa suoraan vapaaseen tilaan ilman lisäkosketusta."
  },
  {
   "nimi": "Maestro — Suojaa ja avaudu",
   "kesto": "20 min",
   "ohje_leikkija": "Pyydä kaveri viereen (ei ota palloa). Ota pallo sisäterällä niin että kehosi on pallon ja kaverin välissä. 12 kertaa.",
   "ohje_rakentaja": "3×12 passiivisen puolustajan kanssa. Vastaanota takajalalla, kallista keho puolustajan ja pallon väliin — 1. kosketus vie pallon turvaan paineesta pois.",
   "ohje_showcase": "4×12, vaihda kumpi olkapää suojaa. Automaatti: tunnista paine ennen palloa, suojaa kehollasi ja avaudu sisäterällä vapaaseen tilaan yhdellä kosketuksella."
  },
  {
   "nimi": "Maestro — Mittaa ensikosketuksesi",
   "kesto": "20 min",
   "ohje_leikkija": "Tee 20 vastaanottoa. Laske montako kertaa pallo pysähtyy alle metrin päähän jalastasi. Kirjaa ennätys ja yritä päihittää se.",
   "ohje_rakentaja": "20 vastaanottoa: laske montako menee suoraan peliasentoon (pallo alle 1 m, keho jo menosuuntaan). Vertaa vk1:n tulokseen — paraniko 1. kosketuksen suunta?",
   "ohje_showcase": "20 vastaanottoa paineessa (passiivinen puolustaja): laske montako kääntyy suoraan vapaaseen tilaan ilman lisäkosketusta. Tavoite 16/20 — sillä tasolla 1. kosketus on ase."
  },
  {
   "nimi": "Palloleikki — tee mitä tykkäät",
   "kesto": "15–20 min",
   "ohje_leikkija": "Ota pallo ja mene ulos. Pompauta seinään, kuljeta, leiki! 15 minuuttia — ei sääntöjä.",
   "ohje_rakentaja": "Valitse yksi: seinäsyöttö 100 × 1 kosketus | pujottelu kartioilla 15 min | ponnauttelu heikolla jalalla 5 min.",
   "ohje_showcase": "Vaativa tekniikka: seinäsyöttö 1-kosketuksella + samalla skannaa ympärillä — nimeä 3 asiaa ennen vastaanottoa. 20 min."
  }
 ],
 "koordinaatio": [
  {
   "nimi": "Dribbeli — katse ylhäällä",
   "kesto": "15 min",
   "ohje_leikkija": "Kuljeta palloa eteenpäin 20 metriä, katso YLHÄÄLLÄ! Älä katso palloon. Vaihda suuntaa äkillisesti 5 kertaa. Tee 5 kierrosta.",
   "ohje_rakentaja": "4 perustaitoa peräkkäin: 1) Kuljeta silmät yli pallon etsien tilaa. 2) Kiihdytä hitaasta täyteen vauhtiin kahdessa askeleessa — pallo ei saa lähteä yli 2 askeleen. 3) Pienet nopeat suunnanvaihdot ilman suuria kaaria. 4) Tarkista: katso eteenpäin. 3 kierrosta."
  },
  {
   "nimi": "Dribbeli — kiihdytys pallon kanssa",
   "kesto": "15 min",
   "ohje_leikkija": "Seiso paikallasi, pallo edessä. Lähtölaukaus — kiihdytä maksimille niin nopeasti kuin pystyt, pallo mukana! 10 kertaa. Palautus kävellen.",
   "ohje_rakentaja": "Kiihdytysladder: 0–5m hidas | 5–10m keskinopeus | 10–15m maksimi — pallo mukana koko ajan. Mittaa: milloin pallo irtoaa liikaa? 8 toistoa.",
   "ohje_showcase": "Kiihdytys + suunnanmuutos 45° ilman palloa pysähtymistä. 6 toistoa kumpaankin suuntaan. Mittaa reaktioaikaa: kuinka nopeasti olet täydessä vauhdissa?"
  },
  {
   "nimi": "Dribbeli — kaveria vastaan (passiivinen)",
   "kesto": "20 min",
   "ohje_leikkija": "Kaveri seisoo edessä, ei liiku. Ohita hänet vasemmalta tai oikealta! Kiihdytä ohi. 15 kertaa kummastakin suunnasta.",
   "ohje_rakentaja": "Kaveri seisoo passiivisena puolustajana. Tee suunnanmuutos ohi hänestä — käytä lyhyttä liikettä, ei suurta kaarta. Ohituksen jälkeen välitön kiihdytys. 20 toistoa.",
   "ohje_showcase": "Yhdistä dribblaus ja liike: dribblaa lähelle kaveria → vaihda suuntaa → kaveri seuraa passiivisesti. Katso ylös ennen liikettä. 20 min pelimäisesti."
  },
  {
   "nimi": "Dribbeli-mittaus",
   "kesto": "20 min",
   "ohje_leikkija": "Pujottele 5 kartiota niin nopeasti kuin pystyt — ajanotto! Kirjaa aika. Yritä parantaa 3 kertaa.",
   "ohje_rakentaja": "Ajanotto: pujottelu 5 kartio, 10 m. Tee 5 suoritusta. Laske paras aika. Vertaa: oletko nopeampi kuin lokakuun alussa?",
   "ohje_showcase": "4 perustaitoa: mittaa kuinka moni onnistuu täydessä pelissä (pelin jälkeen arvioi). Katso ylös, kiihdytä, suunnanmuutos, rytmi."
  },
  {
   "nimi": "U-käännös — opitaan hitaasti",
   "kesto": "20 min",
   "ohje_leikkija": "Jalkapohja pallon päälle, vedä taaksepäin, käänny 180°. Hidas ensin! 15 kertaa oikealla jalalla, 15 vasemmalla. Ei kiire.",
   "ohje_rakentaja": "U-käännös: jalkapohja päälle → vedä taaksepäin → käänny 180° → kiihdytä. Tee 20 kertaa hitaasti ja oikein. Sitten: yliastuminen (saksi pallon yli). 20 kertaa. Ei vastustajaa.",
   "ohje_showcase": "Liikesarja 1–4 hitaasti: U-käännös | yliastuminen | U + yliastuminen yhdistettynä | vetokäännös (jalka pallon yli ja taakse). 10 × kutakin, tekninen laatu ensin."
  },
  {
   "nimi": "1v1-liike — nopeammin",
   "kesto": "20 min",
   "ohje_leikkija": "Nyt nopeammin! U-käännös + heti kiihdytys. Tee liike ja juokse ohi nopeasti. 15 kertaa kummallakin jalalla.",
   "ohje_rakentaja": "Valittu liike täydessä nopeudessa ilman vastustajaa: teeskentely + liike + kiihdytys alle 1 sekunnissa. 25 toistoa. Lisää: saksiliike — vie jalka pallon yli 20 kertaa.",
   "ohje_showcase": "Liikkeet 1–7 täydessä nopeudessa yksin. Mittaa: kuinka nopeasti teet liikkeen + kiihdytys 5 metriin? Tavoite alle 2 s."
  },
  {
   "nimi": "1v1 — passiivinen puolustaja",
   "kesto": "20 min",
   "ohje_leikkija": "Kaveri seisoo edessä, ei liiku. Käytä U-käännöstä tai saksea ohittaaksesi hänet! 20 kertaa. Yllätä kaveri.",
   "ohje_rakentaja": "Kaveri passiivisena: tee liike → ohita → kiihdytä. Kaveri voi liikkua hitaasti mutta ei ota palloa. 20 toistoa valitulla liikkeellä + 10 toistoa vapaasti valiten.",
   "ohje_showcase": "Puoli-aktiivinen puolustaja (saa liikkua mutta ei taklata): ohita käyttäen opittuja liikkeitä. 25 toistoa. Mikä liike toimii parhaiten sinulle?"
  },
  {
   "nimi": "1v1-mittaus — toimiiko pelissä?",
   "kesto": "20 min",
   "ohje_leikkija": "Pelaa 1v1-peliä kaverin kanssa 10 min. Laske: montako kertaa ohitit? Mitä liikettä käytit parhaiten?",
   "ohje_rakentaja": "Täysi 1v1: 10 min peliä. Laske ohitukset. Arvioi: mikä liike toimi, mikä ei? Harjoittele heikkoa liikettä 10 min lisää.",
   "ohje_showcase": "Täysi 1v1-peli 15 min + itsearvio: opituista liikkeistä mitkä 3 ovat jo omassa repertuaarissa? Mitkä tarvitsevat lisää työtä?"
  }
 ],
 "syotto": [
  {
   "nimi": "Sisäteräsyöttö — tarkka ja toistettava",
   "kesto": "20 min",
   "ohje_leikkija": "Lähetä pallo seinälle ja yritä osua samaan kohtaan 10 kertaa peräkkäin. Tukijalka pallon viereen — ei taakse! Laske ennätys.",
   "ohje_rakentaja": "Sisäteräsyöttö 20 toistoa: tukijalka pallon viereen | nilkka lukossa | osuma pallon keskikohtaan. Sitten jalkapöytä maassa 20 toistoa: koko jalkapöydän yläpuoli osuu palloon. Mittaa tarkkuus.",
   "ohje_showcase": "Syöttösarja muodot 1–3: sisäterä | jalkapöytä maassa | suora ilmapassi. 15 × kutakin. Mittaa: osumakohta pallossa (pitää olla keskikohta)."
  },
  {
   "nimi": "Syöttö — etäisyydet kasvavat",
   "kesto": "20 min",
   "ohje_leikkija": "Syötä 5 metriin, sitten 10 metriin, sitten 15 metriin. Sama liike, pallo seuraa! Kumpi jalka on tarkempi?",
   "ohje_rakentaja": "Syöttöprogressio: 10 m | 15 m | 20 m — sisäterä ja jalkapöytä. Mittaa tarkkuus joka etäisyydellä. Tavoite: 8/10 osuu kohteeseen.",
   "ohje_showcase": "Pitkä syöttö (kaareva/kierteinen, muoto 5) + ulkojalkapassi maassa (muoto 6). 15 toistoa kutakin. Mittaa kaartuma ja tarkkuus."
  },
  {
   "nimi": "Syöttö kaverin kanssa — liikkuvaan kohteeseen",
   "kesto": "20 min",
   "ohje_leikkija": "Kaveri juoksee — syötä hänelle niin että pallo tulee hänen eteen! Ei perään. 15 kertaa kummallakin jalalla.",
   "ohje_rakentaja": "Kaveri juoksee ristiin — syötä eteen tilaan, ei pelaajalle itselleen. 20 syöttöä. Sitten: lyhyt vaihto (1/2-kombinaatio, muoto 10) — syötä, juokse, saa takaisin.",
   "ohje_showcase": "Läpisyöttö ulkojalalla (muoto 11) + keskitys maaliin päin (muoto 9). 10 × kutakin. Tarkkuus: osuu käytävään?"
  },
  {
   "nimi": "Syöttö-mittaus",
   "kesto": "20 min",
   "ohje_leikkija": "Laske: montako kertaa lähetät pallon tarkasti 10 metriin? Tee 20 syöttöä ja laske pisteet.",
   "ohje_rakentaja": "Syöttöhaaste: 20 syöttöä, eri etäisyydet (10/15/20 m). Laske pisteet: tarkka osuma = 1 p. Vertaa: oletko parempi kuin edellisellä kerralla?",
   "ohje_showcase": "Syöttösarja 11 muotoa — montako hallitset jo? Käy läpi ja arvioi itsesi. Harjoittele 2 heikkointa 10 min."
  }
 ]
};
  if (typeof module !== 'undefined' && module.exports) module.exports = DATA; else root.TM_KOTI_OLETUS = DATA;
})(typeof window !== 'undefined' ? window : this);
