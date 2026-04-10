/* ═══════════════════════════════════════════════════════════════════
   TalentMaster™ — Harjoitelogiikka v4
   
   UUTTA v2:een verrattuna:
   1. Ikäkohtainen kieli — U10 puhutaan eri tavalla kuin U17
   2. Everton-progressio — harjoite vaikeutuu tason mukaan (Stage 1→5)
   3. Videolinkit — YouTube ID per harjoite, haetaan Firestoresta tai fallback
   4. "Taso-pohjainen" valinta — ei pelkkä ikä, myös pelaajan kehitystaso
   5. DIAG-ketju — SL + FL yhdistettynä anatomisen näytön mukaan (Wilke 2016 ⭐⭐⭐)
   6. Pallotekniikka-yhteys — jokainen D/S-harjoite kytkeytyy pelilliseen suoritukseen
   7. "pig" → "diag" ketjukoodi — Peliäly on oma dimensionsa (D4), ei oma liikeketjunsa
   
   Kielitasot:
   - leikkija  (U8–U12):  konkreettinen, hauska, "leiki", "kokeile"
   - rakentaja (U13–U15): asiallinen, "tee näin", perustelu lyhyesti  
   - showcase  (U16–U19): ammattimainen, termit ok, "mittaa", "kirjaa"
   
   Everton Stage-progressio:
   - Stage 1: kehonpaino, hidas, tekniikka
   - Stage 2: lisää toistoja / liikelaajuutta
   - Stage 3: pieni ulkoinen vastus / reaktiivisuus
   - Stage 4: kuorma / nopeampi / kognitiivinen haaste
   - Stage 5: maksimiteho / pelispesifi / itsenäinen arviointi
   ═══════════════════════════════════════════════════════════════════ */

/* ══════════════════════════════════════════════════════════════════
   harjoitelogiikka_v4.js — SIIVOTETTU VERSIO 2026-04-09
   
   Muutokset siivouksessa:
   - Duplikaattifunktiot poistettu (_ikatyyppi, _laskeStage)
   - sl-ketju: backward-compat säilytetty, diag on canonical
   - Rakenne: generoimTehtavat() on pääfunktio
   ══════════════════════════════════════════════════════════════════ */
// ── KETJUMÄÄRITTELY ──────────────────────────────────────────────────────
// ── KETJUMÄÄRITTELY — 5 ketjua (Wilke 2016 + Liikanen 2025) ──────────
// DIAG yhdistää SL (Kiertoketju) + FL (Yhdistelmäketju) anatomisesti
// vahvimmalla näytöllä ⭐⭐⭐. Nämä toimivat aina yhdessä: syöttö,
// SM-pallo ja pujottelu vaativat molempia samanaikaisesti.
// Peliäly (D4) on oma dimensionsa — ei liikeketju, vaan ADAR-taso.
const KETJUT = {
  sbl:  { nimi: '⚡ Vauhtiketju',      lyhyt: 'Vauhtiketju',      cue_leikkija: 'nopeutesi',          cue_showcase: 'SBL ⭐⭐⭐ — takaketjun voima (Wilke 2016)' },
  sfl:  { nimi: '🦵 Lähtöketju',       lyhyt: 'Lähtöketju',       cue_leikkija: 'räjähtäväsi',        cue_showcase: 'SFL — lonkka auki → räjähtävyys ja potku' },
  ll:   { nimi: '↔️ Sivuketju',        lyhyt: 'Sivuketju',        cue_leikkija: 'ketteryytesi',       cue_showcase: 'LL ⭐⭐ — lateraalivakaus, pujottelu +9%' },
  diag: { nimi: '🔄⬡ Diagonaaliketju', lyhyt: 'Diagonaaliketju',  cue_leikkija: 'syöttösi ja kierroksesi', cue_showcase: 'DIAG ⭐⭐⭐ — SL+FL yhdessä: syöttö +13%, SM-pallo +8%' },
  dfl:  { nimi: '🏗️ Hallintaketju',    lyhyt: 'Hallintaketju',    cue_leikkija: 'tasapainosi',        cue_showcase: 'DFL ⭐⭐ — hengitys, asento, pohja kaikelle' },
};
// HUOM: Peliäly (pig/D4) on oma dimensionsa, ei liikeketju.
// ADAR-harjoitteet ovat osa jokaista ketjua — katse ylös ennen kosketusta
// kehittää sekä DIAG:ia (seinäsyöttö) että DFL:ää (asento) samanaikaisesti.

// ── IKÄLUOKKATYYPPI ───────────────────────────────────────────────────────
function _ikatyyppi(ika) {
  if (ika <= 12) return 'leikkija';
  if (ika <= 15) return 'rakentaja';
  return 'showcase';
}

// ── STAGE PELAAJAN TASON MUKAAN ──────────────────────────────────────────
// Perustuu harjoitettavuuspisteisiin ja ikään
// Everton: training age tärkeämpi kuin kronologinen ikä
function _laskeStage(pelaaja) {
  const ika = pelaaja.ika || 13;
  const pisteet = pelaaja.harjoitettavuus_pisteet || null;

  if (pisteet !== null) {
    if (pisteet < 10) return 1;
    if (pisteet < 16) return 2;
    if (pisteet < 22) return 3;
    if (pisteet < 27) return 4;
    return 5;
  }
  // Fallback ikään jos ei testipisteitä
  if (ika <= 10) return 1;
  if (ika <= 12) return 2;
  if (ika <= 14) return 3;
  if (ika <= 16) return 4;
  return 5;
}

/* ═══════════════════════════════════════════════════════════════════
   HARJOITEPANKKI V3 — ikäkohtainen kieli + Stage-progressio
   
   Jokaisella harjoitteella:
   - ohje_leikkija:  U8–U12, hauska ja konkreettinen
   - ohje_rakentaja: U13–U15, asiallinen
   - ohje_showcase:  U16+, ammattimainen
   - stage: Stage 1–5 (Everton-progressio)
   - yt: YouTube video ID (11 merkkiä)
   - yt_haku: hakusana jos ei ID:tä
   ═══════════════════════════════════════════════════════════════════ */

const PANKKI = {

  // ══════════════════════════════════════════════════════════════════
  // T-HARJOITTEET — kultaikkuna, joka päivä
  // Progressio: leikkipallo → tekniikkapallo → pelipaikka
  // ══════════════════════════════════════════════════════════════════
  T: {

    // ══════════════════════════════════════════════════════════════════
    // T-HARJOITTEET — päivittäinen pallokosketus
    //
    // Lähteet:
    //   Fulham FC Academy Home Practice (kotitreeniohjelma U9–U11)
    //   v.v. Noordster Basis Techniek Training (8 sarjaa, 3 tasoa)
    //
    // JAKSOTUS (mesosyklit):
    //   Syyskuu  (vk 1–4):  Kaka     — vastaanottaminen
    //   Lokakuu  (vk 5–8):  Affelay  — dribbelin perusta
    //   Marraskuu (vk 9–12): Ronaldo — 1v1-liikkeet
    //   Joulukuu (vk 13–16): Beckham — syöttäminen
    //   Tammi–huhtikuu: sama sykli, isompi vaativuus (kierros 2)
    //
    // VIIKKORAKENNE (mikrosykli):
    //   Vk 1: opitaan → ilman vastustajaa, hidas, oikein
    //   Vk 2: nopeutetaan → sama liike + haaste
    //   Vk 3: passiivinen vastustaja → Noordster Taso 2
    //   Vk 4: mittaus → laske toistot, vertaa edelliseen
    //   Vk 5: REPEAT INDIVIDUAL NEED (Fulham) → heikoin viikko uudelleen
    //
    // OPPIMISTASOT (Noordster):
    //   Taso 1 (vk 1–2): Ilman vastustajaa — oikea liike ensin
    //   Taso 2 (vk 3):   Passiivinen vastustaja — nopeus kasvaa
    //   Taso 3 (vk 4):   Täysi 1v1 tai mittaus — siirtyy peliin
    // ══════════════════════════════════════════════════════════════════

    // ── SYYSKUU (kuukausi 9): KAKA — vastaanottaminen ───────────────
    kaka: {
      teema: 'Vastaanottaminen',
      kuvaus_leikkija: 'Pallo pysähtyy jalkaasi kuin magneetti',
      kuvaus_rakentaja: 'Ensimmäinen kosketus ratkaisee kaiken',
      kuvaus_showcase: 'Kaka-sarja — 13 vastaanottamisen muotoa',

      vk1: { // Taso 1: opitaan liike ilman vastustajaa
        nimi: 'Pysäytys — sisäjalalla',
        ohje_leikkija: 'Heitä pallo seinään ja pysäytä se sisäjalalla niin että se jää kiinni jalkaan. 20 kertaa oikealla, 20 vasemmalla. Laske montako pysyy lähellä!',
        ohje_rakentaja: 'Seinäsyöttö — sisäjalalla pysäytys välittömästi peliasennossa. 20 toistoa per jalka. Tarkista: tukijalka pallon viereen, ei taakse.',
        ohje_showcase: 'Sisäjalka: pysäytys + välittömästi peliasento. Ulkojalka: pysäytys + ohjaus tilaan. 15 × 2 per jalka. Tarkista: pysähtyykö pallo alas vai jatkaako?',
        kesto: '15 min', xp: 20,
        yt: 'fHbM1v9G6xk',
        cue: 'Kaká (AC Milan): "Ensimmäinen kosketus kertoo mitä tapahtuu seuraavaksi."',
        viikkotavoite: 'Sisäjalkavastaanotto — 10/10 pysähtyy lähelle jalkaa',
      },
      vk2: { // Taso 1+: sama liike + nopeus kasvaa
        nimi: 'Pysäytys — molemmat jalat + vaihto',
        ohje_leikkija: 'Nyt nopeammin! Seinästä — pysäytä — lähetä heti takaisin. Ei odottelua. 30 kertaa. Vaihda jalkaa joka toinen kerta.',
        ohje_rakentaja: 'Pysäytys + välitön peliasento + syöttö takaisin yhteen kosketukseen. 30 toistoa molemmin jaloin. Rytmi: pallo tulee → pysäytys → syöttö alle 2 sekunnissa.',
        ohje_showcase: 'Kaikki 4 perusmuotoa: sisäjalka peliasento | sisäjalka tilaan | ulkojalka peliasento | ulkojalka tilaan. 10 toistoa kutakin. Mittaa aikaa.',
        kesto: '15 min', xp: 20,
        yt: 'fHbM1v9G6xk',
        cue: 'Ajax: jokainen kosketus on päätös. Vastaanotto on jo hyökkäys.',
        viikkotavoite: 'Vastaanotto + syöttö alle 2 sekunnissa 20/30 kertaa',
      },
      vk3: { // Taso 2: passiivinen vastustaja
        nimi: 'Vastaanotto — vastustaja lähellä',
        ohje_leikkija: 'Pyydä kaveria seisomaan lähellä (ei ota palloa). Pysäytä niin että pallo menee kaverin ohi. Pallo turvaan! 20 kertaa.',
        ohje_rakentaja: 'Kaveri seisoo vieressä passiivisena. Vastaanota niin että avaat tilan pois hänestä — sisäjalka tai ulkojalka, kumpi toimii paremmin? 25 toistoa.',
        ohje_showcase: 'Vastaanotto tukijalan taakse (Kaka-muoto 6) + avautuminen sisäjalalla (muoto 7) + avautuminen ulkojalalla (muoto 8). 10 × kutakin kaverin kanssa.',
        kesto: '20 min', xp: 25,
        yt: 'fHbM1v9G6xk',
        cue: 'Noordster Taso 2: liike täytyy onnistua täydessä nopeudessa ennen 1v1:tä.',
        viikkotavoite: 'Vastaanotto auki vastustajasta 15/20 toistoa',
      },
      vk4: { // Taso 3: mittaus + oma arvio
        nimi: 'Kaka-viikon mittaus',
        ohje_leikkija: 'Laske: montako kertaa peräkkäin pysäytät pallon niin että se ei vieri yli metrin päähän? Kirjaa ennätys! Yritä päihittää se.',
        ohje_rakentaja: 'Mittaa: tee 20 vastaanottoa ja laske montako menee peliasennossa oikein (alle 1 m, välitön peliasento). Vertaa vk 1:n tasoon — onko kehitystä?',
        ohje_showcase: 'Kaka-sarja kaikki 13 muotoa: käy läpi järjestyksessä. Merkitse ✓ kun onnistuu 8/10. Kuinka moni 13:sta on jo "omistettu"?',
        kesto: '20 min', xp: 30,
        yt: 'fHbM1v9G6xk',
        cue: 'Fulham: mittaa kehitystä — ilman mittausta ei tiedä missä on.',
        viikkotavoite: 'Kaka 13 muodosta: montako hallitset?',
      },
    },

    // ── LOKAKUU (kuukausi 10): AFFELAY — dribbelin perusta ──────────
    affelay: {
      teema: 'Dribbelin perusta',
      kuvaus_leikkija: 'Kuljeta palloa silmät ylhäällä!',
      kuvaus_rakentaja: '4 perustaitoa — pohja kaikelle muulle',
      kuvaus_showcase: 'Affelay + Sneijder — dribbeli + liike ilman palloa',

      vk1: {
        nimi: 'Dribbeli — katse ylhäällä',
        ohje_leikkija: 'Kuljeta palloa eteenpäin 20 metriä, katso YLHÄÄLLÄ! Älä katso palloon. Vaihda suuntaa äkillisesti 5 kertaa. Tee 5 kierrosta.',
        ohje_rakentaja: '4 perustaitoa peräkkäin: 1) Kuljeta silmät yli pallon etsien tilaa. 2) Kiihdytä hitaasta täyteen vauhtiin kahdessa askeleessa — pallo ei saa lähteä yli 2 askeleen. 3) Pienet nopeat suunnanvaihdot ilman suuria kaaria. 4) Tarkista: katso eteenpäin. 3 kierrosta.',
        ohje_showcase: null,
        kesto: '15 min', xp: 20,
        yt: 'PKe-qpMbHgg',
        cue: 'Affelay (PSV/Barcelona): nämä 4 taitoa ovat pohja jolle kaikki muu rakennetaan.',
        viikkotavoite: 'Kuljeta 20 m silmät ylhäällä ilman palloa putoamasta',
      },
      vk2: {
        nimi: 'Dribbeli — kiihdytys pallon kanssa',
        ohje_leikkija: 'Seiso paikallasi, pallo edessä. Lähtölaukaus — kiihdytä maksimille niin nopeasti kuin pystyt, pallo mukana! 10 kertaa. Palautus kävellen.',
        ohje_rakentaja: 'Kiihdytysladder: 0–5m hidas | 5–10m keskinopeus | 10–15m maksimi — pallo mukana koko ajan. Mittaa: milloin pallo irtoaa liikaa? 8 toistoa.',
        ohje_showcase: 'Kiihdytys + suunnanmuutos 45° ilman palloa pysähtymistä. 6 toistoa kumpaankin suuntaan. Mittaa reaktioaikaa: kuinka nopeasti olet täydessä vauhdissa?',
        kesto: '15 min', xp: 20,
        yt: 'PKe-qpMbHgg',
        cue: 'Räjähtävyys: tärkeää ei ole mitä liikettä teet vaan milloin ja kuinka nopeasti kiihdytät sen jälkeen.',
        viikkotavoite: '0–15m pallo mukana, alle 3 s',
      },
      vk3: {
        nimi: 'Dribbeli — kaveria vastaan (passiivinen)',
        ohje_leikkija: 'Kaveri seisoo edessä, ei liiku. Ohita hänet vasemmalta tai oikealta! Kiihdytä ohi. 15 kertaa kummastakin suunnasta.',
        ohje_rakentaja: 'Kaveri seisoo passiivisena puolustajana. Tee suunnanmuutos ohi hänestä — käytä lyhyttä liikettä, ei suurta kaarta. Ohituksen jälkeen välitön kiihdytys. 20 toistoa.',
        ohje_showcase: 'Affelay-Sneijder yhdistettynä: dribbele lähelle kaveria → vaihda suuntaa → kaveri seuraa passiivisesti. Katso ylös ennen liikettä. 20 min pelimäisesti.',
        kesto: '20 min', xp: 25,
        yt: 'PKe-qpMbHgg',
        cue: 'Noordster: hallitse liike ensin yksin, sitten passiivista vastaan, sitten täydessä 1v1:ssä.',
        viikkotavoite: 'Ohita passiivinen puolustaja 15/20 kertaa',
      },
      vk4: {
        nimi: 'Dribbeli-mittaus',
        ohje_leikkija: 'Pujottele 5 kartiota niin nopeasti kuin pystyt — ajanotto! Kirjaa aika. Yritä parantaa 3 kertaa.',
        ohje_rakentaja: 'Ajanotto: pujottelu 5 kartio, 10 m. Tee 5 suoritusta. Laske paras aika. Vertaa: oletko nopeampi kuin lokakuun alussa?',
        ohje_showcase: 'Affelay 4 taitoa: mittaa kuinka moni onnistuu täydessä pelissä (pelin jälkeen arvioi). Katso ylös, kiihdytä, suunnanmuutos, rytmi.',
        kesto: '20 min', xp: 30,
        yt: 'PKe-qpMbHgg',
        cue: 'La Masia: mittaa kehitystä, älä vain harjoittele — ilman mittausta et tiedä oletko kehittynyt.',
        viikkotavoite: 'Pujottelu 10 m — paranna lokakuun alun aikaa',
      },
    },

    // ── MARRASKUU (kuukausi 11): 1V1-LIIKKEET (Ronaldo-sarja) ───────
    ronaldo: {
      teema: '1v1-liikkeet',
      kuvaus_leikkija: 'Opi ohittamaan vastustaja',
      kuvaus_rakentaja: 'Cristiano Ronaldo -sarja — Zidane ja Robben kategoriat',
      kuvaus_showcase: 'Ronaldo + Van Persie -sarjat — laaja 1v1-repertuaari',

      vk1: {
        nimi: 'U-käännös (Zidane) — opitaan hitaasti',
        ohje_leikkija: 'Jalkapohja pallon päälle, vedä taaksepäin, käänny 180°. Hidas ensin! 15 kertaa oikealla jalalla, 15 vasemmalla. Ei kiire.',
        ohje_rakentaja: 'U-draai: jalkapohja päälle → vedä taaksepäin → käänny 180° → kiihdytä. Tee 20 kertaa hitaasti ja oikein. Sitten: yliastuminen (saksi pallon yli). 20 kertaa. Ei vastustajaa.',
        ohje_showcase: 'Ronaldo-sarja liikkeet 1–4 hitaasti: U-käännös | yliastuminen | U+yliastuminen yhdistettynä | Cruyff-käännös. 10 × kutakin, tekninen laatu ensin.',
        kesto: '20 min', xp: 20,
        yt: 'eoR91TNIWDQ',
        cue: 'Noordster-sääntö: "Koko sarja täytyy hallita ilman vastustajaa ennen kuin siirrytään passiiviseen."',
        viikkotavoite: 'U-käännös onnistuu 10/10 molemmilla jaloilla',
      },
      vk2: {
        nimi: '1v1-liike — nopeammin',
        ohje_leikkija: 'Nyt nopeammin! U-käännös + heti kiihdytys. Tee liike ja juokse ohi nopeasti. 15 kertaa kummallakin jalalla.',
        ohje_rakentaja: 'Valittu liike täydessä nopeudessa ilman vastustajaa: teeskentely + liike + kiihdytys alle 1 sekunnissa. 25 toistoa. Lisää: saksi (Robben) — vie jalka pallon yli 20 kertaa.',
        ohje_showcase: 'Liikkeet 1–7 täydessä nopeudessa yksin. Mittaa: kuinka nopeasti teet liikkeen + kiihdytys 5 metriin? Tavoite alle 2 s.',
        kesto: '20 min', xp: 20,
        yt: 'eoR91TNIWDQ',
        cue: 'Räjähtävyys: tärkeää ei ole mitä liikettä — vaan kuinka nopeasti kiihdytät sen jälkeen.',
        viikkotavoite: 'Liike + 5 m kiihdytys alle 2 sekunnissa',
      },
      vk3: {
        nimi: '1v1 — passiivinen puolustaja',
        ohje_leikkija: 'Kaveri seisoo edessä, ei liiku. Käytä U-käännöstä tai saksea ohittaaksesi hänet! 20 kertaa. Yllätä kaveri.',
        ohje_rakentaja: 'Kaveri passiivisena: tee liike → ohita → kiihdytä. Kaveri voi liikkua hitaasti mutta ei ota palloa. 20 toistoa valitulla liikkeellä + 10 toistoa vapaasti valiten.',
        ohje_showcase: 'Puoli-aktiivinen puolustaja (saa liikkua mutta ei taklata): ohita käyttäen Ronaldo-sarjan liikkeitä. 25 toistoa. Mikä liike toimii parhaiten sinulle?',
        kesto: '20 min', xp: 25,
        yt: 'eoR91TNIWDQ',
        cue: 'Noordster Taso 2: liikkeen täytyy toimia täydessä nopeudessa ennen siirtymistä täyteen 1v1:een.',
        viikkotavoite: 'Ohita passiivinen puolustaja 15/20 kertaa valitulla liikkeellä',
      },
      vk4: {
        nimi: '1v1-mittaus — toimiiko pelissä?',
        ohje_leikkija: 'Pelaa 1v1-peliä kaverin kanssa 10 min. Laske: montako kertaa ohitit? Mitä liikettä käytit parhaiten?',
        ohje_rakentaja: 'Täysi 1v1: 10 min peliä. Laske ohitukset. Arvioi: mikä liike toimi, mikä ei? Harjoittele heikkoa liikettä 10 min lisää.',
        ohje_showcase: 'Täysi 1v1-peli 15 min + itsearvio: Ronaldo-sarjan liikkeistä mitkä 3 ovat jo omassa repertuaarissa? Mitkä tarvitsevat lisää työtä?',
        kesto: '20 min', xp: 30,
        yt: 'eoR91TNIWDQ',
        cue: 'Fulham-mittaus: toimiiko liike oikeassa pelissä? Jos ei — palaa vk 1:een.',
        viikkotavoite: 'Vähintään 1 onnistunut ohitus per pelitilanne',
      },
    },

    // ── JOULUKUU (kuukausi 12): BECKHAM — syöttäminen ───────────────
    beckham: {
      teema: 'Syöttäminen ja laukaus',
      kuvaus_leikkija: 'Lähetä pallo tarkasti',
      kuvaus_rakentaja: 'Sisäjalka + wreeffi — kaikki syöttötavat',
      kuvaus_showcase: 'Beckham-sarja — 11 syöttö- ja laukausteknikkaa',

      vk1: {
        nimi: 'Sisäjalkasyöttö — tarkka ja toistettava',
        ohje_leikkija: 'Lähetä pallo seinälle ja yritä osua samaan kohtaan 10 kertaa peräkkäin. Tukijalka pallon viereen — ei taakse! Laske ennätys.',
        ohje_rakentaja: 'Sisäjalkasyöttö 20 toistoa: tukijalka pallon viereen | nilkka lukossa | osuma pallon keskikohtaan. Sitten wreeffi maassa 20 toistoa: koko jalkapöydän yläpuoli osuu palloon. Mittaa tarkkuus.',
        ohje_showcase: 'Beckham-sarja muodot 1–3: sisäjalka | wreeffi maassa | suora ilmapassi. 15 × kutakin. Mittaa: osumakohta pallossa (pitää olla keskikohta).',
        kesto: '20 min', xp: 20,
        yt: 'yGHMHi9mMOQ',
        cue: 'Beckham (ManUtd/Real Madrid): tukijalka ratkaisee suunnan. Wreeffi ratkaisee nopeuden.',
        viikkotavoite: '10 peräkkäistä sisäjalkasyöttöä samaan kohtaan',
      },
      vk2: {
        nimi: 'Syöttö — etäisyydet kasvavat',
        ohje_leikkija: 'Syötä 5 metriin, sitten 10 metriin, sitten 15 metriin. Sama liike, pallo seuraa! Kumpi jalka on tarkempi?',
        ohje_rakentaja: 'Syöttöprogressio: 10 m | 15 m | 20 m — sisäjalka ja wreeffi. Mittaa tarkkuus joka etäisyydellä. Tavoite: 8/10 osuu kohteeseen.',
        ohje_showcase: 'Pitkä syöttö (kaareva/kierteinen, Beckham muoto 5) + ulkojalkapassi maassa (muoto 6). 15 toistoa kutakin. Mittaa kaartuma ja tarkkuus.',
        kesto: '20 min', xp: 20,
        yt: 'yGHMHi9mMOQ',
        cue: 'La Masia: teknisesti taitavat pelaajat pystyvät pitämään pallon liikkeessä joka etäisyydellä.',
        viikkotavoite: '20 m sisäjalkasyöttö 8/10 osuu kohteeseen',
      },
      vk3: {
        nimi: 'Syöttö kaverin kanssa — liikkuvaan kohteeseen',
        ohje_leikkija: 'Kaveri juoksee — syötä hänelle niin että pallo tulee hänen eteen! Ei perään. 15 kertaa kummallakin jalalla.',
        ohje_rakentaja: 'Kaveri juoksee ristiin — syötä eteen tilaan, ei pelaajalle itselleen. 20 syöttöä. Sitten: lyhyt vaihto (1/2 kombinaatio, Beckham muoto 10) — syötä, juokse, saa takaisin.',
        ohje_showcase: 'Läpisyöttö ulkojalalla (muoto 11, Pirlon erikoisuus) + voorzet maaliin päin (muoto 9). 10 × kutakin. Tarkkuus: osuu käytävään?',
        kesto: '20 min', xp: 25,
        yt: 'yGHMHi9mMOQ',
        cue: 'Ajax: syöttö on kommunikaatiota. Pallo kertoo joukkuekaverille minne mennä.',
        viikkotavoite: 'Syöttö liikkuvaan kohteeseen 12/20 oikein ajoitettu',
      },
      vk4: {
        nimi: 'Syöttö-mittaus',
        ohje_leikkija: 'Laske: montako kertaa lähetät pallon tarkasti 10 metriin? Tee 20 syöttöä ja laske pisteet.',
        ohje_rakentaja: 'Syöttöhaaste: 20 syöttöä, eri etäisyydet (10/15/20 m). Laske pisteet: tarkka osuma = 1 p. Vertaa: oletko parempi kuin joulukuun alussa?',
        ohje_showcase: 'Beckham-sarja 11 muotoa — montako hallitset jo? Käy läpi ja arvioi itsesi. Harjoittele 2 heikkointa 10 min.',
        kesto: '20 min', xp: 30,
        yt: 'yGHMHi9mMOQ',
        cue: 'Fulham: viidennen viikon periaate — harjoittele sitä missä tulos jäi heikoimmaksi.',
        viikkotavoite: 'Syöttöhaaste 15/20 pistettä',
      },
    },

    // ── FALLBACK: jos kuukautta ei tunnisteta ────────────────────────
    perus: {
      teema: 'Päivittäinen pallokosketus',
      vk1: {
        nimi: 'Palloleikki — tee mitä tykkäät',
        ohje_leikkija: 'Ota pallo ja mene ulos. Pompauta seinään, kuljeta, leiki! 15 minuuttia — ei sääntöjä.',
        ohje_rakentaja: 'Valitse yksi: seinäsyöttö 100 × 1 kosketus | pujottelu kartioilla 15 min | ponnauttelu heikolla jalalla 5 min.',
        ohje_showcase: 'Vaativa tekniikka: seinäsyöttö 1-kosketuksella + samalla skannaa ympärillä — nimeä 3 asiaa ennen vastaanottoa. 20 min.',
        kesto: '15–20 min', xp: 20,
        yt: 'PKe-qpMbHgg',
        cue: 'Ajax: "daily touches" — joka päivä pallo, myös lepopäivinä.',
        viikkotavoite: 'Tee pallokosketus joka päivä',
      },
    },

  },

  D: {

    sbl: [
      {
        stage: [1, 2], // U10–U12
        nimi: 'Hyppynaru + varpaille nousu',
        ohje_leikkija: 'Hypi narulla 15 sekuntia — varpaat maahan, ei kantapäitä! Sitten nouse varpaille tolpan reunalla ylös-alas 10 kertaa. Tunnet pohkeesi.',
        ohje_rakentaja: 'Naruhypyt 3×15s päkiäkontaktilla. Sitten tolpan reunalla: varpaille ylös → kantapää hitaasti alas reunan yli 3×10. Pehmeästi.',
        ohje_showcase: null,
        kesto: '5 min', xp: 15,
        yt: 'KNO_XZBS5jk',
        cue: 'Pohje ja akillesjänne ovat nopeutesi jousi. Päivittäinen aktivointi pitää ne notkeina.',
        phv: 'Naruhypyt 2×10s kevyesti. Jätä eksentrinen pois.',
      },
      {
        stage: [3, 4, 5], // U13+
        nimi: 'Naruhypyt + pohjeeksentrinen',
        ohje_leikkija: null,
        ohje_rakentaja: 'Naruhypyt 3×15s päkiäkontaktilla (ei kantapää maahan). Tolpan reunalla: varpaille ylös → kantapää hitaasti alas reunan ali. 3×10. Ei kipuun.',
        ohje_showcase: 'Naruhypyt 3×15s — seuraa rytmiä, ei nopeutta. Pohjeeksentrinen tolpan reunalla 3×10 kontrolloidusti. SBL: takaketju aktivoituu jalkapohjasta selkään.',
        kesto: '7 min', xp: 15,
        yt: 'KNO_XZBS5jk',
        cue: 'Takaketju alkaa jalkapohjasta. Päivittäinen aktivointi estää kireydet ennen kuin ne syntyvät.',
        phv: 'Naruhypyt 2×10s kevyesti. Pohjeeksentrinen pois — jänne-luuliitos herkkänä.',
      },
    ],

    sfl: [
      {
        stage: [1, 2],
        nimi: 'Lonkka auki + askelkävelyt',
        ohje_leikkija: 'Laita polvi maahan, toinen jalka eteenpäin. Kallista lantiota eteen kunnes tunnet venytyksen edessä. Pidä 30 sekuntia, vaihda. Sitten iso askelkävely 10 askelta.',
        ohje_rakentaja: 'Hip flexor 90/90: polvi maahan, etujalan polvi 90°. Eteenpäin kunnes venytys lonkassa. 2×30s per puoli. Sitten askelkyykky-kävely 2×10m.',
        ohje_showcase: null,
        kesto: '5 min', xp: 15,
        yt: 'UcGAOOBMYMU',
        cue: 'Lonkka ohjaa ponnistuksen. Jos lonkka ei aukea, räjähtävyys jää puoliksi.',
        phv: 'Pelkkä 90/90-venytys 3×30s. Ei kyykkyä — polven etuosa herkkä.',
      },
      {
        stage: [3, 4, 5],
        nimi: 'Hip flexor + askelkyykky-kävely',
        ohje_leikkija: null,
        ohje_rakentaja: 'Hip flexor 90/90 2×45s per puoli: polvi maahan, eteen kunnes tunnet venytyksen. Sitten askelkyykky-kävely 2×10m — iso askel, polvi lähelle lattiaa.',
        ohje_showcase: 'Hip flexor 90/90 2×45s per puoli. Askelkyykky-kävely 2×10m. SFL: lonkankoukistaja → quadriceps. Potku lähtee lonkasta.',
        kesto: '6 min', xp: 15,
        yt: 'UcGAOOBMYMU',
        cue: 'Lonkka ohjaa ponnistuksen. Jos lonkka ei aukea, lähtö jää puolitiehen — aina.',
        phv: 'Pelkkä 90/90-venytys 3×30s per puoli. Ei kyykkyä.',
      },
    ],

    ll: [
      {
        stage: [1, 2],
        nimi: 'Simpukka + sivulankku',
        ohje_leikkija: 'Makaa kyljelläsi, polvet yhteen. Avaa yläpolvi ylöspäin kuin simpukka — mutta pidä lantio paikallaan! 12 kertaa, sitten vaihda. Sitten sivulankku kyynärpäällä 20 sekuntia per puoli.',
        ohje_rakentaja: 'Clamshell kylkimakuulla 2×12 per puoli: polvet yhteen, avaa yläpolvi ylös (lantio ei saa kaatua). Sitten sivulankku 2×20s per puoli.',
        ohje_showcase: null,
        kesto: '5 min', xp: 15,
        yt: 'p5UANxnGByc',
        cue: 'Nämä lihakset pitävät polvesi suorassa suunnanmuutoksissa. Pieni liike, iso vaikutus.',
        phv: 'Normaali — isometriset harjoitteet turvallisia.',
      },
      {
        stage: [3, 4, 5],
        nimi: 'Clamshell + sivulankku',
        ohje_leikkija: null,
        ohje_rakentaja: 'Clamshell 2×12 per puoli: kylkimakuulla, polvet yhteen, avaa ylös (lantio paikallaan). Sitten sivulankku 2×20s per puoli: keho suorana sivulta.',
        ohje_showcase: 'Clamshell 2×12 gluteus medius -aktivaatiolla. Sivulankku 2×20s. LL: gluteus medius estää valgus-kollapsın suunnanmuutoksissa.',
        kesto: '5 min', xp: 15,
        yt: 'p5UANxnGByc',
        cue: 'Sivuttainen vakaus pitää polven linjassa. Tämä on ACL:n paras ennaltaehkäisy.',
        phv: 'Normaali — isometriset harjoitteet turvallisia.',
      },
    ],

    diag: [
      {
        // DIAG = Diagonaaliketju (SL+FL). Seinäsyöttö on DIAG:n päivittäinen pääharjoite
        // Liikanen 2025: syöttö +13% erotteli ammattilaiset — tämä on se harjoite.
        stage: [1, 2],
        nimi: 'Seinäsyöttö — molemmat jalat',
        ohje_leikkija: 'Lähetä pallo seinälle oikealla jalalla — ota takaisin vasemmalla. Sitten toisinpäin. 20 kertaa per jalka. Pidä pallo lähellä!',
        ohje_rakentaja: 'Seinäsyöttö vuorojaloilla 3×20: oikealla syötät, vasemmalla vastaanotat, takaisin. Pallo pysyy maassa. 1 kosketus per jalka.',
        ohje_showcase: null,
        kesto: '5 min', xp: 15,
        yt: 'FGhd77TRdC4',
        cue: 'Rintakehä ohjaa — jalka seuraa automaattisesti. DIAG: syöttö on kiertoketjun + yhdistelmäketjun harjoite yhtä aikaa.',
        pallo_yhteys: 'Syöttö 🎯 DIAG pääketju — Liikanen 2025: +13% ammattilaisennustaja.',
        phv: 'Normaali — pallolliset tekniikkaharjoitteet aina turvallisia.',
      },
      {
        stage: [3, 4, 5],
        nimi: 'Seinäsyöttö + ponnauttelu — DIAG päivittäin',
        ohje_leikkija: null,
        ohje_rakentaja: 'Seinäsyöttö vuorojaloilla 3×20 (1-kosketus takaisin). Sitten ponnauttelu 3×1 min: molemmat jalat vuorotellen, laske ääneen. Tavoite 20+ per min.',
        ohje_showcase: 'Seinäsyöttö 3×20 vuorojaloilla — 1 kosketus, ei pysähdystä. Ponnauttelu 3×1 min. SL: kiertoketju lähtee rintakehästä. Mittaa ponnauttelu per min.',
        kesto: '6 min', xp: 15,
        yt: 'FGhd77TRdC4',
        cue: 'Forsman 2013: ponnauttelu + syöttö erottelivat lahjakkaita kaikissa ikäluokissa. Molemmat ovat DIAG-harjoitteita.',
        pallo_yhteys: 'Ponnauttelu 🎯 DIAG pääketju (DFL avustava) — päivittäinen integraatioharjoite.',
        phv: 'Normaali — pallolliset harjoitteet aina turvallisia.',
      },
    ],

    dfl: [
      {
        stage: [1, 2],
        nimi: 'Hengitys + kissa-lehmä',
        ohje_leikkija: 'Mene nelinkontin. Hengitä syvään sisään — selkä koukkuun kuin kissa joka sihistää. Hengitä ulos — selkä notkoon kuin lehmä. Tee 8 kertaa rauhallisesti. Sitten lennä: toinen käsi ja vastakkainen jalka suorana 8 kertaa.',
        ohje_rakentaja: 'Cat-cow nelinkontin 3×8: sisään → selkä ylös (cat), ulos → selkä alas (cow). Sitten dead bug 3×5 per puoli: selinmakuulla, alaselkä kiinni lattiassa, laske vastapoinen käsi + jalka hitaasti.',
        ohje_showcase: null,
        kesto: '5 min', xp: 15,
        yt: 'kqnua4rHVIA',
        cue: 'Hengitys on kehon pohja. Kun hengität oikein, selkäsi vahvistuu automaattisesti.',
        phv: 'Erityisen tärkeä PHV:ssä — syvä core tukee kasvavaa selkää.',
      },
      {
        stage: [3, 4, 5],
        nimi: '360° hengitys + dead bug',
        ohje_leikkija: null,
        ohje_rakentaja: '360° palleahengitys 3×5: hengitä sisään niin että vatsa, kyljet JA selkä laajenevat. Dead bug 3×5 per puoli: alaselkä maassa koko ajan, laske vastakkainen käsi + jalka hitaasti.',
        ohje_showcase: '360° palleahengitys 3×5. Dead bug 3×5 per puoli — alaselkä koko ajan maassa. DFL: pallea on ainoa lihas joka toimii sekä hengityslihaksena että lantion stabilaattorina.',
        kesto: '6 min', xp: 15,
        yt: 'kqnua4rHVIA',
        cue: 'DFL:n ydin on pallea. Kolar 2012: syvä core on pohja kaikelle muulle liikkumiselle.',
        phv: 'Erityisen tärkeä PHV:ssä — normaali tai lisää toistoja.',
      },
    ],

    pig: [
      {
        stage: [1, 2],
        nimi: 'Katso ennen — seinäpallo',
        ohje_leikkija: 'Lähetä pallo seinälle. ENNEN kuin pallo tulee takaisin — katso ympärillesi ja nimeä yksi asia jonka näet. Sitten ota pallo. 3 minuuttia. Hauskaa? Kokeile nimetä asioita nopeammin!',
        ohje_rakentaja: 'Seinäsyöttö 3×2 min: syötä, katso ylös ja nimeä 1 asia ennen vastaanottoa. Vaikeudu: 3 asiaa, sitten nimeä väri ja muoto.',
        ohje_showcase: null,
        kesto: '5 min', xp: 15,
        yt: 'eqUBbHHzY1U',
        cue: 'Katse ylös ennen kosketusta — tätä parhaat tekevät automaattisesti. Opitaan nyt.',
        phv: 'Kognitiiviset harjoitteet ovat täsmälleen oikea valinta PHV:ssä.',
      },
      {
        stage: [3, 4, 5],
        nimi: 'Skannausrutiini — katso ensin',
        ohje_leikkija: null,
        ohje_rakentaja: 'Seinäsyöttö 3×2 min: syötä, ENNEN vastaanottoa katso ylös ja nimeä 3 asiaa ympärillä. Kasvata nopeutta progressiivisesti sarjan sisällä.',
        ohje_showcase: 'Seinäsyöttö 3×2 min — pre-scanning: katso ylös ja nimeä 3 asiaa ennen vastaanottoa. Kasvata nopeutta. ADAR: Anticipation-vaihe. Mittaa: kuinka moni kerta katse ylös per 2 min.',
        kesto: '6 min', xp: 15,
        yt: 'eqUBbHHzY1U',
        cue: 'Vaeyens 2007: pre-scanning erottaa eliitit subeliitistä paremmin kuin fysiikka.',
        phv: 'Kognitiiviset harjoitteet ovat PARAS valinta PHV:ssä.',
      },
    ],
  },

  // ══════════════════════════════════════════════════════════════════
  // S-HARJOITTEET — 30% kohdennettu, 15–20 min
  // Jokaisella harjoitteella 3 Stage-tasoa (Everton Stage 1→3→5)
  // ══════════════════════════════════════════════════════════════════
  S: {

    sbl: [
      {
        vk: 'parillinen',
        stage_tasot: [
          {
            stage: [1, 2],
            nimi: 'Reaktiolähtö — pallo maahan',
            ohje_leikkija: 'Heitä pallo maahan — kun se pomppaa, juokse täysillä 15 metriä! Tee 5 kertaa, sitten lepää hetki ja toista 3 kertaa. Kuka on nopein?',
            ohje_rakentaja: 'Heitä pallo lattiaan, lähde HETI kun se koskee maata. 5×3 lähtöä täysvauhtia 15m. Palautus kävellen. Laske lähtöreaktioasi.',
            ohje_showcase: null,
            kesto: '15 min', xp: 30,
            yt: 'oJOefmeDrx8',
            cue: 'Ensimmäinen askel ratkaisee. Ajax: reaktio ei ole synnynnäinen — se harjoitellaan.',
            phv: '3 lähtöä per sarja 70% teholla. Takaketju kasvaa — ei ylikuormiteta.',
            phv_xp: 20,
          },
          {
            stage: [3, 4],
            nimi: 'Reaktiolähtö + pallonhallinta',
            ohje_leikkija: null,
            ohje_rakentaja: 'Pallo 5m eteen — räjähtävä lähtö, vastaanota ja kuljeta 15m. 6 toistoa täydellä palautuksella. Pallo laukaisee lähdön — ei odoteta.',
            ohje_showcase: 'Pallo 5m eteen. Reaktiivinen sprint → vastaanota → kuljeta 15m. 6 toistoa / täysi palautus. Seuraa: reaktioaika paranee vai ei?',
            kesto: '15 min', xp: 30,
            yt: 'oJOefmeDrx8',
            cue: 'Lähtö pelissä alkaa ärsykkeestä — pallo, pelaaja, huuto. Harjoittele juuri sitä.',
            phv: '4 toistoa 70% teholla. Pallo mukana — tekninen osa turvallinen.',
            phv_xp: 20,
          },
          {
            stage: [5],
            nimi: 'Reaktiolähtö + laukaus maaliin',
            ohje_leikkija: null, ohje_rakentaja: null,
            ohje_showcase: 'Pallo 5m eteen → sprint → vastaanota → kuljeta 15m → laukaus maaliin. 6 toistoa. Mittaa: osumakohta maalissa (nurkkailma / nurkkamaa / keski). Laukaustarkkuus kirjataan.',
            kesto: '15 min', xp: 35,
            yt: 'oJOefmeDrx8',
            cue: 'Stage 5: ei vain nopeus vaan tarkkuus paineessa. Tämä on pelitilanne.',
            phv: '4 toistoa 70% teholla.',
            phv_xp: 20,
          },
        ],
      },
      {
        vk: 'pariton',
        stage_tasot: [
          {
            stage: [1, 2],
            nimi: '5-loikka — kuinka kauas?',
            ohje_leikkija: 'Hyppää viisi kertaa peräkkäin niin kauas kuin pääset! Molemmat jalat ponnistaa, molemmat jalkaa maahan. Mittaa kädellä tai katso maasta merkki. Yritä kolme kertaa — paranisiko?',
            ohje_rakentaja: '5-loikka paikaltaan 3 kertaa — mittaa tai arvioi matka. Sitten 3×30m sprintti täydellä palautuksella (2 min). Kirjaa tulokset.',
            ohje_showcase: null,
            kesto: '15 min', xp: 30,
            yt: 'a7UGb10ViSM',
            cue: 'Liikanen & Törmä 2025: 5-loikka erotteli ammattilaisiksi yltäneet. Mittaa missä olet.',
            phv: 'Vain loikat 2×3 kevyesti. Jätä sprintti pois.',
            phv_xp: 15,
          },
          {
            stage: [3, 4],
            nimi: '5-loikka ajalla + Nordic curl',
            ohje_leikkija: null,
            ohje_rakentaja: '5-loikka 3× maksimilla, mittaa matka. Sitten Nordic curl avustettu: kumppaani tai seinä pitää kantapäistä, laske HITAASTI eteen 3×5. Palaa käsillä.',
            ohje_showcase: '5-loikka 3× — mittaa ja vertaa edelliseen kertaan. Nordic curl eksentrinen 3×5: laske hallitusti, palaa käsillä. SBL: hamstring eksentrisenä = loukkaantumissuoja.',
            kesto: '15 min', xp: 30,
            yt: 'a7UGb10ViSM',
            cue: 'Petersen 2011: Nordic hamstring -ohjelma vähensi hamstring-vammoja 51%.',
            phv: 'Vain 5-loikka 2×3 kevyesti. Nordic curl pois.',
            phv_xp: 15,
          },
          {
            stage: [5],
            nimi: '5-loikka + Nordic curl täysi',
            ohje_leikkija: null, ohje_rakentaja: null,
            ohje_showcase: '5-loikka 3× — kirjaa matka, vertaa kauden alkuun. Nordic curl täysi 3×5 (ei käsiapua). SBL eksentrisenä huipputasolla. Seuraa asymmetriaa: oikea vs vasen.',
            kesto: '15 min', xp: 35,
            yt: 'a7UGb10ViSM',
            cue: 'Stage 5: itsenäinen laadun arviointi. Asymmetria > 10% = puoliero korjattava.',
            phv: 'Vain loikat 2×2. Nordic curl pois PHV:ssä.',
            phv_xp: 15,
          },
        ],
      },
    ],

    ll: [
      {
        vk: 'parillinen',
        stage_tasot: [
          {
            stage: [1, 2],
            nimi: 'T-rata — laita aika',
            ohje_leikkija: 'Aseta 4 merkkiä T-kirjaimen muotoon. Juokse eteen, sitten sivuille, sitten takaisin. Ota aika puhelimella! Yritä 4 kertaa. Paraniko aika?',
            ohje_rakentaja: 'T-rata 4 kartiolla: eteen 5m, sivu 2.5m + 2.5m, taakse 5m. Ota aika 4× täydellä palautuksella. Tavoite: parannu 0.1s per viikko.',
            ohje_showcase: null,
            kesto: '15 min', xp: 30,
            yt: 'X9O1XMEpzW4',
            cue: 'Kolme askelta jarrutuksessa — ei yhdellä. Ensimmäinen askel uuteen suuntaan ratkaisee.',
            phv: 'Normaali — T-rata turvallinen. Ei maksiminopeussuunnanmuutoksia kipuun asti.',
            phv_xp: 25,
          },
          {
            stage: [3, 4],
            nimi: 'T-rata pallolla + reaktio',
            ohje_leikkija: null,
            ohje_rakentaja: 'T-rata pallon kanssa — pallo pysyy lähellä käänteissä. 4 toistoa, ota aika. Sitten reaktio-SM: partneri osoittaa suunnan, lähde heti. 6× per puoli.',
            ohje_showcase: 'T-rata pallollinen 4× — ota aika, vertaa pallottomaan. Reaktio-SM 6× per puoli. Pallollinen vs. palloton ero kertoo teknisestä tasosta.',
            kesto: '15 min', xp: 30,
            yt: 'X9O1XMEpzW4',
            cue: 'Forsman 2013: pujottelu + reaktio erottelivat lahjakkaita. Pallo + SM = jalkapallon ydin.',
            phv: 'Normaali — pallollinen tekniikka aina turvallista.',
            phv_xp: 25,
          },
          {
            stage: [5],
            nimi: 'T-rata + 1v1-feinti',
            ohje_leikkija: null, ohje_rakentaja: null,
            ohje_showcase: 'T-rata maksimiteholla 3×. Sitten 1v1-peli pienellä alueella (5×5m): ohita vastustaja feintillä 3×2 min. Peli ratkaisee — ei harjoitusnumero.',
            kesto: '15 min', xp: 35,
            yt: 'X9O1XMEpzW4',
            cue: 'Stage 5: tekniikka paineessa. Pelitilanne on paras opettaja.',
            phv: 'T-rata 70% teholla. 1v1 normaali — pelillinen konteksti aina ok.',
            phv_xp: 22,
          },
        ],
      },
      {
        vk: 'pariton',
        stage_tasot: [
          {
            stage: [1, 2],
            nimi: 'Sivuhyppely + luisteluaskeleet',
            ohje_leikkija: 'Hyppää sivulle yhdellä jalalla 8 kertaa per jalka — kuin luistelija! Sitten liu\'u sivulle kyykyssä 20 metriä. Tunnetko pohkeet ja reidet?',
            ohje_rakentaja: 'Lateraaliloikat 3×8 per puoli: hyppää sivulle, laske hallitusti, stabiloi ennen seuraavaa. Sitten luisteluaskeleet 2×20m: laaja liuku sivulle kyykyssä.',
            ohje_showcase: null,
            kesto: '15 min', xp: 30,
            yt: 'AqvkWRVYaKs',
            cue: '3 askelta jarrutuksessa — sivuliike on jalkapallon eniten aliharjoiteltu ominaisuus.',
            phv: '2×5 per puoli kevyesti.',
            phv_xp: 22,
          },
          {
            stage: [3, 4],
            nimi: 'YJ-laskeutuminen sivulle + pito',
            ohje_leikkija: null,
            ohje_rakentaja: 'Hyppää sivulle yhdellä jalalla → laske hallitusti kyykkyyn → pidä 2s. Polvi suoraan jalkaterän yli — ei sisäänpäin! 5 toistoa per jalka × 3 sarjaa.',
            ohje_showcase: 'Lateraalinen YJ-laskeutuminen 5× per jalka × 3 sarjaa. Pito 2s. Seuraa: polvi sisäänpäin = gluteus medius heikko. Valgus-kollapsi = ACL-riski.',
            kesto: '15 min', xp: 30,
            yt: 'AqvkWRVYaKs',
            cue: 'Valgus-kollapsi laskeutuessa on ACL-vamman mekaaninen momentti. Gluteus medius estää sen.',
            phv: 'Pelkkä sivuaskellasku — ei hyppyä. 3×5 per jalka.',
            phv_xp: 20,
          },
          {
            stage: [5],
            nimi: 'Reaktiivinen YJ-loikka — ei pitoa',
            ohje_leikkija: null, ohje_rakentaja: null,
            ohje_showcase: 'Reaktiivinen sivuloikka ilman pitoa: loiki sivulle → välittömästi takaisin. 3×8 per suunta. Kosketusnopeus tavoite alle 0.3s. Tasapainolauta laskeutuessa (Everton Stage 5).',
            kesto: '15 min', xp: 35,
            yt: 'AqvkWRVYaKs',
            cue: 'Stage 5: reaktiivinen — kosketusnopeus ratkaisee. Tasapainolauta lisää proprioseptiivisen haasteen.',
            phv: 'Hidas rytminen loikka 3×6. Ei maksiminopeutta.',
            phv_xp: 20,
          },
        ],
      },
    ],

    dfl: [
      {
        vk: 'parillinen',
        stage_tasot: [
          {
            stage: [1, 2],
            nimi: 'Lankku + "lentävä koira"',
            ohje_leikkija: 'Lankku kyynärpäillä 20 sekuntia — keho suorana kuin lauta, pakarat alas! Sitten "lentävä koira": nelinkontin, nosta vastapoinen käsi + jalka suorana. 8 kertaa per puoli.',
            ohje_rakentaja: 'Lankku 3×20s + sivulankku 3×15s per puoli. Sitten bird dog 3×8 per puoli: nelinkontin, vastapoinen käsi + jalka hitaasti suorana.',
            ohje_showcase: null,
            kesto: '15 min', xp: 30,
            yt: 'pSHjTRCQxIw',
            cue: 'Keho on ketju — heikko keskiosa tarkoittaa energian hukkaan menemistä joka liikkeessä.',
            phv: 'Normaali — isometriset ovat PHV:n paras harjoitteluryhmä.',
            phv_xp: 30,
          },
          {
            stage: [3, 4],
            nimi: 'Progressiivinen lankku + tasapaino',
            ohje_leikkija: null,
            ohje_rakentaja: 'Lankku 3×30s → kasvaa viikoittain 10s. Sivulankku 3×20s per puoli. Bird dog 3×8. Sitten yhden jalan seisonta silmät kiinni 3×20s.',
            ohje_showcase: 'Lankku 3×35s. Sivulankku 3×25s per puoli. Bird dog 3×10. YJ-seisonta silmät kiinni 3×25s. Seuraa lankun kestoa — tavoite 20s → 60s 6 viikossa.',
            kesto: '15 min', xp: 30,
            yt: 'pSHjTRCQxIw',
            cue: 'McGill 2010: lankku + sivulankku + bird dog = kliinisesti validoitu perusrutiini.',
            phv: 'Normaali tai enemmän toistoja.',
            phv_xp: 30,
          },
          {
            stage: [5],
            nimi: 'Karhukävely + pistoolikyykky',
            ohje_leikkija: null, ohje_rakentaja: null,
            ohje_showcase: 'Karhukävely 2×10m (Everton Stage 1→4: lantio ei heiluu). Sitten pistoolikyykky ilman seinää 3×5 per jalka. Sitten pallolla tasapainoistunta YJ:llä 3×30s. DFL-huipputaso.',
            kesto: '15 min', xp: 35,
            yt: 'pSHjTRCQxIw',
            cue: 'Stage 5: dynaaminen core + unilateraalinen voima + pallollinen tasapaino. Kaikki samassa.',
            phv: 'Karhukävely normaali. Pistoolikyykky → pistoolikyykky seinää vasten.',
            phv_xp: 30,
          },
        ],
      },
      {
        vk: 'pariton',
        stage_tasot: [
          {
            stage: [1, 2],
            nimi: 'Tasapaino + vatsarutistus lennossa',
            ohje_leikkija: 'Seiso yhdellä jalalla niin kauan kuin pystyt! Sitten vaihda. Sitten makaa selinmakuulla: laske toinen jalka hitaasti lattiaa kohti — mutta ei ihan alas! Toista 8 kertaa per jalka.',
            ohje_rakentaja: 'YJ-seisonta 3×30s per jalka. Sitten "leg lowering" 3×8 per jalka: selinmakuulla, laske jalka hitaasti kohti lattiaa (alaselkä pysyy lattiassa).',
            ohje_showcase: null,
            kesto: '15 min', xp: 30,
            yt: 'XUmYcNasrCs',
            cue: 'Tasapaino paranee vain haastamalla tasapainoa. YJ on se taso jota kentällä tarvitaan.',
            phv: 'Normaali — tasapainoharjoitteet turvallisia.',
            phv_xp: 30,
          },
          {
            stage: [3, 4],
            nimi: 'YJ-tasapaino silmät kiinni + pistoolikyykky',
            ohje_leikkija: null,
            ohje_rakentaja: 'YJ-seisonta silmät kiinni 3×30s per jalka. Sitten pistoolikyykky seinää vasten 3×5 per jalka — hidas ja hallittu. Laatu ennen nopeutta.',
            ohje_showcase: 'YJ-seisonta silmät kiinni 3×35s. Pistoolikyykky seinää vasten → tavoite ilman seinää 3×5. DFL: tasapaino + unilateraalinen voima samassa.',
            kesto: '15 min', xp: 30,
            yt: 'XUmYcNasrCs',
            cue: 'Silmät kiinni kaksinkertaistaa haasteen. DFL joutuu töihin — ei voi huijata.',
            phv: 'Normaali.',
            phv_xp: 30,
          },
          {
            stage: [5],
            nimi: 'Tasapainolauta + karhukävely + pistoolikyykky',
            ohje_leikkija: null, ohje_rakentaja: null,
            ohje_showcase: 'YJ tasapainolauta 3×30s. Karhukävely 2×10m (lantio paikallaan). Pistoolikyykky ilman tukea 3×5. DFL Stage 5 — kaikki kolme samassa sessiossa.',
            kesto: '15 min', xp: 35,
            yt: 'XUmYcNasrCs',
            cue: 'Stage 5: autonominen stabiliteetti. Keho korjaa itse ilman tietoista kontrollia.',
            phv: 'Tasapainolauta → kiinteä alusta. Pistoolikyykky seinää vasten.',
            phv_xp: 30,
          },
        ],
      },
    ],

    diag: [
      {
        // DIAG S-harjoitteet: syöttö + SM-pallo paineessa
        // ADAR-elementti integroituna — peliäly kehittyy DIAG-harjoitteissa
        vk: 'parillinen',
        stage_tasot: [
          {
            stage: [1, 2],
            nimi: 'Katso & nimeä — seinäpallo',
            ohje_leikkija: 'Lähetä pallo seinälle. Ennen kuin se tulee takaisin — katso ympärille ja nimeä KOLME asiaa mitä näet. Sitten ota pallo. 5 minuuttia. Hauskaa! Teetkö sen nopeammin kuin kaverisi?',
            ohje_rakentaja: 'Seinäpallo 5 min: syötä, katso ylös ja nimeä 3 asiaa ympärillä ENNEN vastaanottoa. Kasvata nopeutta progressiivisesti.',
            ohje_showcase: null,
            kesto: '15 min', xp: 30,
            yt: 'eqUBbHHzY1U',
            cue: 'Barcelona: katse ylös ennen kosketusta. Tämä yksi rutiini erottaa hyvän pelaajan erinomaisesta.',
            phv: 'Kognitiiviset harjoitteet PARHAITA PHV:ssä.',
            phv_xp: 30,
          },
          {
            stage: [3, 4],
            nimi: 'Päätöksenteko numeroilla',
            ohje_leikkija: null,
            ohje_rakentaja: 'Seiso 10m seinästä. Kädessä paperi (1=vasen 2=oikea 3=ylä 4=ala). Nosta numero → syötä HETI oikeaan suuntaan. 4×2 min. Nopeuta progressiivisesti.',
            ohje_showcase: 'Reaktiivinen päätöksenteko 4×2 min: numero → syöttö alle 0.5s. Seuraa: kuinka monta oikeaa reaktiota per 2 min? Kasvata nopeutta joka sarja.',
            kesto: '15 min', xp: 30,
            yt: 'eqUBbHHzY1U',
            cue: 'Moran 2012: päätöksentekokyky paineessa on opetettavissa. Tämä pakottaa reaktiivisen valinnan.',
            phv: 'Normaali.',
            phv_xp: 30,
          },
          {
            stage: [5],
            nimi: 'ADAR Honey Trap',
            ohje_leikkija: null, ohje_rakentaja: null,
            ohje_showcase: 'Seinäsyöttö — välillä toinen pallo heitetään yllättäen eri suuntaan. Reagoi välittömästi uuteen palloon. 3×3 min. Kirjaa: oikeat reaktiot / 10 tilannetta. ADAR: kaikki 4 vaihetta samaan aikaan.',
            kesto: '15 min', xp: 35,
            yt: 'eqUBbHHzY1U',
            cue: 'Stage 5 ADAR: Anticipation → Decision → Action → Recovery. Pelitilanne täysillä.',
            phv: 'Normaali.',
            phv_xp: 30,
          },
        ],
      },
      {
        vk: 'pariton',
        stage_tasot: [
          {
            stage: [1, 2],
            nimi: 'Virhe-leikki — reagoi heti',
            ohje_leikkija: 'Seinäpallo: yritä TARKOITUKSELLA tehdä huono syöttö — sitten reagoi heti! Älä pysähdy virheen jälkeen. 3 minuuttia. Pelissä tulee virheitä — harjoitellaan reagoimaan niihin!',
            ohje_rakentaja: 'Seinäsyöttö 3×1 min: tee tarkoituksella virheellinen syöttö (liian kova, väärä suunta), reagoi välittömästi. Älä pysähdy virheen jälkeen.',
            ohje_showcase: null,
            kesto: '15 min', xp: 30,
            yt: 'eqUBbHHzY1U',
            cue: 'Moran 2012: kyky sivuuttaa häiritseviä ärsykkeitä on huippupelaajan merkki. Virhe → reagoi → jatka.',
            phv: 'Normaali.',
            phv_xp: 30,
          },
          {
            stage: [3, 4],
            nimi: 'Peliälyvideo + skannaus',
            ohje_leikkija: null,
            ohje_rakentaja: 'Katso 5 min huippupelaajan videota (sama pelipaikka). Kirjaa 2 havaintoa heidän katseen käytöstä. Sitten seinäsyöttö skannauksen kanssa 3×2 min.',
            ohje_showcase: 'Katso 5 min videota (oma peli tai huippu). Kirjaa: kuinka usein pelaaja katsoo ylös per minuutti? Sitten ADAR-skannaus 3×2 min. Vertaa omaa videoon.',
            kesto: '15 min', xp: 30,
            yt: 'eqUBbHHzY1U',
            cue: 'ADAR: Anticipation. Mentaalinen harjoittelu + fyysinen harjoittelu = nopein kehitys.',
            phv: 'Normaali.',
            phv_xp: 30,
          },
          {
            stage: [5],
            nimi: 'Dual-task seinärondo',
            ohje_leikkija: null, ohje_rakentaja: null,
            ohje_showcase: 'Seinärondo + kognitiivinen tehtävä: syötä 1-kosketuksella samalla kun lasket ääneen parillisia lukuja (2,4,6...). 3×3 min. Virhe kognitiivisessa tai teknisessä → jatka silti.',
            kesto: '15 min', xp: 35,
            yt: 'eqUBbHHzY1U',
            cue: 'Dual-task: aivojen pitää jakaa huomio. Tämä on se mitä pelissä tapahtuu koko ajan.',
            phv: 'Normaali.',
            phv_xp: 30,
          },
        ],
      },
    ],
  },
};

/* ═══════════════════════════════════════════════════════════════════
   APUFUNKTIOT — Stage + kieli
   ═══════════════════════════════════════════════════════════════════ */

function _laskeViikonNro() {
  const d = new Date();
  const alku = new Date(d.getFullYear(), 0, 1);
  return Math.ceil(((d - alku) / 86400000 + alku.getDay() + 1) / 7);
}


// Valitsee oikean ohjetekstin kielen mukaan
function _ohje(harj, ityyppi) {
  if (ityyppi === 'leikkija' && harj.ohje_leikkija) return harj.ohje_leikkija;
  if (ityyppi === 'rakentaja' && harj.ohje_rakentaja) return harj.ohje_rakentaja;
  if (ityyppi === 'showcase'  && harj.ohje_showcase)  return harj.ohje_showcase;
  // Fallback: paras saatavilla oleva
  return harj.ohje_showcase || harj.ohje_rakentaja || harj.ohje_leikkija || '';
}

// Valitsee stage-tasoisen harjoitteen
function _valitseStage(stage_tasot, stage) {
  // Etsi täsmälleen oikea stage
  let h = stage_tasot.find(t => t.stage.includes(stage));
  // Fallback: lähin pienempi
  if (!h) h = [...stage_tasot].reverse().find(t => t.stage[t.stage.length - 1] <= stage);
  // Fallback: ensimmäinen
  return h || stage_tasot[0];
}

// Laske ketjujen järjestys — viisi ketjua (DIAG = SL+FL/2 vanhalle datalle)
function laskeKetjuProfiili(pelaaja) {
  // DIAG-pisteet: uusi kenttä suoraan tai lasketaan vanhoista SL+FL-kentistä
  const k = pelaaja.flei_ketjut || pelaaja.ketjut || {};
  const diagArvo = k.DIAG || k.diag
    || (k.SL && k.FL ? Math.round((k.SL + k.FL) / 2)
    : k.SL || k.FL
    || pelaaja.diag || 0);

  const arvot = {
    sbl:  k.SBL  || k.sbl  || pelaaja.sbl  || 0,
    sfl:  k.SFL  || k.sfl  || pelaaja.sfl  || 0,
    ll:   k.LL   || k.ll   || pelaaja.ll   || 0,
    diag: diagArvo,
    dfl:  k.DFL  || k.dfl  || pelaaja.dfl  || 0,
  };

  // Jos ei yhtään dataa, käytetään neutraalia arvoa jottei
  // aina valita samaa ketjua oletuksena
  const onData = Object.values(arvot).some(v => v > 0);
  if (!onData) {
    // Ei testidataa — palataan tasaiseen oletukseen
    Object.keys(arvot).forEach(k => arvot[k] = 50);
  }

  const jarjestys = Object.entries(arvot)
    .sort(([,a],[,b]) => a - b)
    .map(([k]) => k);

  return {
    heikoin:         jarjestys[0],
    toiseksiHeikoin: jarjestys[1],
    vahvin:          jarjestys[jarjestys.length - 1],
    jarjestys,
    arvot,
  };
}

/* ═══════════════════════════════════════════════════════════════════
   PÄÄFUNKTIO — generoimTehtavat(pelaaja)
   ═══════════════════════════════════════════════════════════════════ */
function generoimTehtavat(pelaaja) {
  if (!pelaaja) return [];

  const ika     = pelaaja.ika || 13;
  const phv     = pelaaja.phv_tila || 'AN';
  const ityyppi = _ikatyyppi(ika);
  const stage   = _laskeStage(pelaaja);
  const prof    = laskeKetjuProfiili(pelaaja);
  const heikoin = prof.heikoin;
  const viikonNro = _laskeViikonNro();
  const vkParit   = viikonNro % 2 === 0 ? 'parillinen' : 'pariton';
  const sKetju    = vkParit === 'parillinen' ? heikoin : prof.toiseksiHeikoin;
  const tehtavat  = [];

  // ── 1. T-HARJOITE ──────────────────────────────────────────────
  const tBank = ika <= 12 ? PANKKI.T.leikkija
              : ika <= 15 ? PANKKI.T.rakentaja
              : PANKKI.T.showcase;

  // Viikonpäiväkohtainen fokus (Noordster + Fulham viikkorakenne)
  // 0=Su, 1=Ma, 2=Ti, 3=Ke, 4=To, 5=Pe, 6=La
  const _viikonPaiva = new Date().getDay();
  const _viikonFokus = {
    1: 'kaka',       // Maanantai: vastaanottaminen
    2: 'affelay',    // Tiistai: dribbelin perusta
    3: '1v1',        // Keskiviikko: 1v1-liikkeet
    4: 'sneijder',   // Torstai: pelinkäsittely ilman palloa
    5: 'beckham',    // Perjantai: syöttäminen ja laukaus
  }[_viikonPaiva] || null;

  // Etsi avain viikonpäivän ja stagen mukaan
  let tKey;
  if (stage <= 2) {
    tKey = _viikonFokus === 'kaka' ? 'stage_1_2_vastaanotto' : 'stage_1_2';
  } else if (stage <= 4) {
    tKey = _viikonFokus ? ('stage_3_' + _viikonFokus) : 'stage_3_affelay';
  } else {
    // Showcase: vaihtelee fokuksen mukaan
    tKey = _viikonFokus === 'kaka' ? 'stage_5_kaka'
         : _viikonFokus === 'affelay' ? 'stage_5_affelay_sneijder'
         : 'stage_5';
  }

  // Fallback ketju
  let tHarj = tBank[tKey]
    || tBank['stage_3_affelay']
    || tBank['stage_3']
    || tBank['stage_1_2']
    || tBank['stage_5'];

  if (!tHarj) {
    // Jos showcase-kohdetta ei löydy, käytä rakentaja
    const fallback = PANKKI.T.rakentaja;
    tHarj = fallback[tKey] || fallback['stage_3'] || fallback['stage_1_2'];
  }

  if (tHarj) {
    tehtavat.push({
      id: 't_pallo', tyyppi: 'T',
      label: '⚽ Kultaikkuna',
      label_cue: 'Joka päivä — myös lepopäivät',
      nimi: tHarj.nimi,
      ohje: _ohje(tHarj, ityyppi),
      kesto: tHarj.kesto, xp: tHarj.xp,
      cue: tHarj.cue,
      yt: tHarj.yt,
      stage, ityyppi,
    });
  }

  // ── 2. D-HARJOITE ──────────────────────────────────────────────
  const dVaihtoehto = (PANKKI.D[heikoin] || [])
    .find(h => h.stage.some(s => s <= stage + 1 && s >= stage - 1))
    || (PANKKI.D[heikoin] || [])[0];

  if (dVaihtoehto) {
    const dOhje = _ohje(dVaihtoehto, ityyppi);
    const dPhv  = phv === 'PH' && dVaihtoehto.phv
      ? dOhje + '\n\n⚠️ ' + dVaihtoehto.phv : dOhje;
    tehtavat.push({
      id: 'd_aktivointi', tyyppi: 'D',
      label: '🔄 Päivittäinen',
      label_cue: '5–10 min · Myös lepopäivät',
      nimi: dVaihtoehto.nimi,
      ohje: dPhv,
      kesto: dVaihtoehto.kesto, xp: dVaihtoehto.xp,
      cue: dVaihtoehto.cue,
      yt: dVaihtoehto.yt,
      ketju: heikoin,
      ketjuNimi: KETJUT[heikoin]?.nimi,
      stage, ityyppi,
    });
  }

  // ── 3. S-HARJOITE (U13+) ────────────────────────────────────────
  if (ika >= 13 && PANKKI.S[sKetju]) {
    const sRyyhma = PANKKI.S[sKetju].find(r => r.vk === vkParit) || PANKKI.S[sKetju][0];
    if (sRyyhma?.stage_tasot) {
      const sHarj  = _valitseStage(sRyyhma.stage_tasot, stage);
      const sOhje  = _ohje(sHarj, ityyppi);
      const sPhv   = phv === 'PH' && sHarj.phv ? sOhje + '\n\n⚠️ ' + sHarj.phv : sOhje;
      const sXp    = phv === 'PH' && sHarj.phv_xp ? sHarj.phv_xp : sHarj.xp;

      tehtavat.push({
        id: 's_kohdennettu', tyyppi: 'S',
        label: '🎯 Kohdennettu 30%',
        label_cue: `15–20 min · ${KETJUT[sKetju]?.lyhyt} · Vapaa-/lepopäivä`,
        nimi: sHarj.nimi,
        ohje: sPhv,
        kesto: sHarj.kesto, xp: sXp,
        cue: sHarj.cue,
        yt: sHarj.yt,
        ketju: sKetju,
        ketjuNimi: KETJUT[sKetju]?.nimi,
        stage,
        stageLabel: `Everton Stage ${stage}`,
        vkKierto: `Viikko ${viikonNro} · ${vkParit === 'parillinen' ? 'Heikoin' : 'Toiseksi heikoin'} ketju`,
        ityyppi,
      });
    }
  }

  return tehtavat;
}

/* ═══════════════════════════════════════════════════════════════════
   VIDEO-URL APUFUNKTIO
   Käyttö: const url = ytUrl(tehtava.yt);
   ═══════════════════════════════════════════════════════════════════ */
function ytUrl(id, haku) {
  if (id) return `https://www.youtube.com/embed/${id}?rel=0&modestbranding=1`;
  if (haku) return `https://www.youtube.com/results?search_query=${encodeURIComponent(haku)}`;
  return null;
}

function ytThumbnail(id) {
  if (!id) return null;
  return `https://img.youtube.com/vi/${id}/mqdefault.jpg`;
}

/* ═══════════════════════════════════════════════════════════════════
   HARJOITEPANKKI — täydellinen versio kaikille 6 fascia-linjalle
   
   Tämä on v2:n harjoitepankki joka täydentää v3:n PANKKI-rakennetta.
   
   Käyttö:
   - PANKKI (yllä): T/D/S harjoitteet ikäkohtaisella kielellä + Stage-progressio
   - HARJOITEPANKKI (tässä): D/S/P harjoitteet fascia-linjoille + viikonpäiväkierto
   - EVERTON_LISAYKSET: laskeutuminen + YJ-loikat + karhukävely (ACL-ehkäisy)
   
   generoimTehtavat()   → T + D + S (v3 logiikka, ikäkohtainen kieli)
   generoimTehtavatV2() → T + D + S + P (v2 logiikka, täydellinen pankki)
   generoimViikoOhjelma() → 7 päivän ohjelma
   ═══════════════════════════════════════════════════════════════════ */
const HARJOITEPANKKI = {

  // ════════════════════════════════════════════════════════════
  // ⚡ VAUHTIKETJU (SBL) — Takaketju
  // Jalkapohja → pohje → hamstring → pakarat → selkä → niska
  // Jalkapallosuorituskyky: nopeus, räjähtävyys, kiihdytys
  // Tyypillisin oire: hamstring, akillesjänne, alaselkä, MTSS
  // ════════════════════════════════════════════════════════════
  sbl: {
    D: [
      {
        pv: [0, 2, 4], // Ma, Ke, Pe
        nimi: 'Naruhypyt + pohjeeksentrinen',
        ohje: 'Naruhypyt 3×15s päkiäkontaktilla (ei kantapää maahan). Sitten tolpan reunalla: pohjeeksentrinen 3×10 — nosta varpailla ylös, laske kantapää hitaasti alas tolpan reunan ali.',
        kesto: '7 min',
        xp: 15,
        cue: 'Takaketju alkaa jalkapohjasta. Päivittäinen aktivointi estää kireydet ennen kuin ne syntyvät.',
        fascia_cue: 'SBL: jalkapohja → pohje → hamstring → selkä — koko ketju aktivoituu.',
        phv: 'Naruhypyt 2×10s kevyesti. Pohjeeksentrinen pois — jänne-luuliitos herkkänä kasvupyrähdyksessä.',
      },
      {
        pv: [1, 3, 6], // Ti, To, Su
        nimi: 'Hip hinge kepillä + silta',
        ohje: 'Hip hinge kepillä 3×10: kepi selkärangan suuntaisesti, nojaa eteen lonkasta (ei alaselästä), tunne hamstring. Sitten lantionnosto 3×15: pidä yläasento 2s.',
        kesto: '7 min',
        xp: 15,
        cue: 'Potku ja lähtö tapahtuvat lonkasta — ei polvesta. Hip hinge opettaa sen.',
        fascia_cue: 'SBL: hamstring → pakarat. Silta lisää gluteus mediuksen aktivaation.',
        phv: 'Normaali — isometriset ja hinge-liikkeet turvallisia kasvupyrähdyksessä.',
      },
      {
        pv: [5], // La
        nimi: 'Takaketjun liikkuvuusrutiini',
        ohje: 'Selinmakuulla jalka suoraksi ylös (SLR) 3×30s per jalka. Sitten hyvää huomenta -liike kepillä 3×8. Hidas ja hallittu — ei kipuun asti.',
        kesto: '7 min',
        xp: 15,
        cue: 'Liikkuvuus heikkenee jo muutaman päivän tauon jälkeen. Lauantai on takaketjun hoitopäivä.',
        fascia_cue: 'SBL koko linja: jalkapohja → pohje → hamstring → selkä → niska.',
        phv: 'Venytykset turvallisia. Vältä aggressiivista venytystä — kasvu on käynnissä.',
      },
    ],
    S: [
      {
        vk: 'parillinen',
        nimi: 'Takaketjun kehitys — loikkasarjat',
        ohje: 'Loikkasarjat 3×5 paikaltaan (bilateral): ponnista ylös maksimikorkeuteen, laske pehmeästi. Palautus 90s. Sitten hip hinge kepillä 3×10 lisäten nopeutta.',
        kesto: '20 min',
        xp: 30,
        cue: 'Liikanen & Törmä 2025: loikkavoimaa mittaava 5-loikka erotteli ammattilaisiksi yltäneet tilastollisesti.',
        fascia_cue: 'SBL: elastinen energia syntyy hamstringin ja pohkeen yhteistoiminnasta.',
        phv: 'Loikat 2×3 kevyesti. Hip hinge normaali. Elastiset harjoitteet kevennettyinä PHV-huipulla.',
        phv_xp: 20,
      },
      {
        vk: 'pariton',
        nimi: 'Takaketjun kehitys — Nordic curl progressio',
        ohje: 'Nordic curl avustettu (kumilenkki tai seinä kantapäällä): 3×5 eksentristä — laske HITAASTI eteen, palaa käsillä. Jos ei onnistu: glute bridge yhdellä jalalla 3×12.',
        kesto: '20 min',
        xp: 30,
        cue: 'Petersen 2011: Nordic hamstring -ohjelma vähensi hamstring-vammoja 51%. Pakollinen kaikille jalkapalloilijoille.',
        fascia_cue: 'SBL:n kriittisin harjoite. Hamstring eksentrisenä = loukkaantumissuoja.',
        phv: 'Nordic curl pois — jänne-luuliitos herkkä. Glute bridge yhdellä jalalla 2×10 kevyesti.',
        phv_xp: 15,
      },
    ],
    P: {
      nimi: 'Vauhtiketjun 6 viikon progressio',
      kuvaus: 'Kiihdytysjuoksut → jalkapallospurtit → nopeusharjoittelu (Nevanlinna 2014)',
      vaiheet: [
        {
          vaihe: 'Valmistava', viikot: '1–2', intensiteetti: '60–70%',
          nimi: 'Kiihdytysharjoittelu',
          ohje: '6×30m juoksua / 65% / 60s palautus. Asento: eteen kallistunut 0–10m, pysty sen jälkeen. Ei aikapaineita — tekniikka ensin.',
          mittari: 'Ota aika. Tavoite: kaikki alle oman ennätyksen +0.5s.',
          kesto: '25 min',
          xp: 40,
        },
        {
          vaihe: 'Kehittävä', viikot: '3–4', intensiteetti: '75–85%',
          nimi: 'Jalkapallospurtit',
          ohje: '2×4×15m jalkapallon kanssa: kuljeta 15m täysvauhtia, pysäytä, käänny, toista. Palautus 30s / 3 min sarjojen välillä.',
          mittari: 'Laske virheelliset pysäytykset (pallo karkaa). Tavoite: max 1 per sarja.',
          kesto: '25 min',
          xp: 45,
        },
        {
          vaihe: 'Huipentava', viikot: '5–6', intensiteetti: '90–100%',
          nimi: 'Maksiminopeusharjoittelu',
          ohje: '5×20m maksimivauhtia täydellä palautuksella (3+ min). Sitten reaktiolähtöjä: pallo heitetään, lähde heti kun se koskee maata.',
          mittari: 'Ota 20m aika. Vertaa viikon 1–2 aikoihin.',
          kesto: '25 min',
          xp: 50,
          phv: 'PHV: maksimisprintit pois. Reaktiolähdöt 4×10m 70% teholla.',
        },
      ],
    },
  },

  // ════════════════════════════════════════════════════════════
  // 🦵 LÄHTÖKETJU (SFL) — Etuketju
  // Jalkapöytä → quadriceps → vatsa → kaula
  // Jalkapallosuorituskyky: räjähtävyys, potku, hyppykyky
  // Tyypillisin oire: polven etuosa, Osgood-Schlatter, pubiitis
  // ════════════════════════════════════════════════════════════
  sfl: {
    D: [
      {
        pv: [0, 2, 4],
        nimi: '90/90 hip flexor + askelkyykky-kävely',
        ohje: '90/90 hip flexor: polvi maahan, takajalka suorana, nojaa eteen kunnes tunnet venytyksen lonkan etuosassa. 2×45s per puoli. Sitten askelkyykky-kävely 2×10m.',
        kesto: '6 min',
        xp: 15,
        cue: 'Lonkka ohjaa ponnistuksen. Jos lonkka ei aukea, räjähtävyys jää puoliksi — aina.',
        fascia_cue: 'SFL: lonkankoukistaja → quadriceps. Potku lähtee lonkasta, ei polvesta.',
        phv: 'Pelkkä 90/90-venytys 3×30s per puoli. Ei kyykkyä — polven etuosassa Osgood-Schlatter-riski.',
      },
      {
        pv: [1, 3, 6],
        nimi: 'Valakyykky + kyykkyistunta',
        ohje: 'Valakyykky kepillä 3×8: selkä suorana, kantapäät maassa, polvet varpaiden suuntaan. Sitten kyykkyistunta 2×30s: pidä asento rentona, hengitä rauhallisesti.',
        kesto: '7 min',
        xp: 15,
        cue: 'Valakyykky on koko etuketjun testi ja harjoite samalla. Jos kantapäät nousevat — nilkan liikkuvuus on raja.',
        fascia_cue: 'SFL: jalkaterä → nilkka → polvi → lantio. Koko etuketju auki.',
        phv: 'Valakyykky normaali — liikkeenlaatuun fokus, ei toistomääriin. Osgood: vältä polvi-kipua.',
      },
      {
        pv: [5],
        nimi: 'Etuketjun liikkuvuus',
        ohje: 'Kneeling hip flexor stretch 3×45s per puoli + thomas-asento (makaa sängyn reunalla, vedä toinen polvi rintaan) 3×30s per puoli.',
        kesto: '6 min',
        xp: 15,
        cue: 'SFL kireytyy istumisesta. Lauantai on etuketjun avaamispäivä — vaikka tuntuu ok:lta.',
        fascia_cue: 'SFL: lonkankoukistaja → quadriceps. Thomas-testi on liikeketjun liikkuvuusmittari.',
        phv: 'Erityisen tärkeä kasvupyrähdyksessä — Osgood-Schlatter johtuu usein SFL:n kireyksistä.',
      },
    ],
    S: [
      {
        vk: 'parillinen',
        nimi: 'Lähtöketjun kehitys — sammakkohypyt',
        ohje: 'Sammakkohypyt paikaltaan 3×5: kyykky alas, ponnista ylös ja eteen maksimille. Mittaa matka. Sitten hip hinge -rutiini 3×10 nousevalla nopeudella.',
        kesto: '20 min',
        xp: 30,
        cue: 'Vauhditon pituushyppy ennustaa räjähtävyyttä. Mittaa ja paranna — jokainen sentti kertoo kehityksestä.',
        fascia_cue: 'SFL: räjähtävä ponnistus etuketjusta. Hip hinge aktivoi vastakkeen takaketjusta.',
        phv: 'Sammakkohypyt 2×3 kevyesti. Hip hinge normaali.',
        phv_xp: 20,
      },
      {
        vk: 'pariton',
        nimi: 'Lähtöketjun kehitys — pistoolikyykky progressio',
        ohje: 'Pistoolikyykky seinää vasten 3×5 per jalka: pidä toinen jalka suorana edessä, laske hitaasti yhden jalan kyykkyyn. Jos ei onnistu: step-down tolpalta 3×8 per jalka.',
        kesto: '20 min',
        xp: 30,
        cue: 'Yksi jalka kantaa pelissä painoa koko ajan. Pistoolikyykky on se liike.',
        fascia_cue: 'SFL: yhden jalan kyykky aktivoi koko etuketjun + lateraalilinjan stabilaattorit.',
        phv: 'Step-down tolpalta 3×6 per jalka kevyesti. Polven etuosa herkkä — ei kipuun asti.',
        phv_xp: 20,
      },
    ],
    P: {
      nimi: 'Lähtöketjun 6 viikon progressio',
      kuvaus: 'Vauhditon pituushyppy -progressio + kyykkyistunta-sarjat (Nevanlinna 2014)',
      vaiheet: [
        {
          vaihe: 'Valmistava', viikot: '1–2', intensiteetti: '60–70%',
          nimi: 'Tekniikka + perusvoima',
          ohje: 'Vauhditon pituushyppy 4×3: tekniikka ensin (ponnistusasento, käsien heilautus, pehmeä lasku). Kirjaa paras matka. Kyykkyistunta 2×45s.',
          mittari: 'Kirjaa paras hypyn matka viikon 1 alusta.',
          kesto: '25 min', xp: 40,
        },
        {
          vaihe: 'Kehittävä', viikot: '3–4', intensiteetti: '75–85%',
          nimi: 'Räjähtävyys + reaktio',
          ohje: 'Vauhditon pituushyppy 3×5 maksimiyrityksellä. Sitten kyykkyhypyt 3×5: nopea alas, räjähtävä ylös — elastinen energia. Palautus 90s.',
          mittari: 'Vertaa hypyn matkaa viikon 1–2 tulokseen.',
          kesto: '25 min', xp: 45,
        },
        {
          vaihe: 'Huipentava', viikot: '5–6', intensiteetti: '90–100%',
          nimi: 'Jalkapallospesifi räjähtävyys',
          ohje: '5-loikka 3×kerta: vauhditon 5-loikka paikaltaan, mittaa matka. Sitten pallollinen räjähtävä lähtö: pallo 5m eteen, sprint pallolle, vastaanota, kuljeta.',
          mittari: 'Vertaa 5-loikan matkaa viikon 1 mittaukseen. Liikanen & Törmä 2025: 5-loikka ennusti ammattilaisuutta.',
          kesto: '25 min', xp: 50,
          phv: 'PHV: vain 5-loikka 2×2 kevyesti. Räjähtävät hypyt kevennettyinä.',
        },
      ],
    },
  },

  // ════════════════════════════════════════════════════════════
  // ↔️ SM-KETJU (LL) — Sivuketju
  // Jalkapohja → fibula → IT-band → thorax
  // Jalkapallosuorituskyky: ketteryys, lateraalivakaus, suunnanmuutos
  // Tyypillisin oire: IT-band, nilkan nyrjähdys, polven lateraalivamma
  // ════════════════════════════════════════════════════════════
  ll: {
    D: [
      {
        pv: [0, 2, 4],
        nimi: 'Clamshell + sivulankku',
        ohje: 'Clamshell 2×12 per puoli: kylkimakuulla, polvet yhteen, avaa yläpolvi kuin simpukka (pidä lantio paikallaan). Sitten sivulankku 2×20s per puoli: keho suorana sivulta katsottuna.',
        kesto: '6 min', xp: 15,
        cue: 'Sivuttainen vakaus pitää polven linjassa suunnanmuutoksissa. Clamshell aktivoi gluteus mediuksen — IT-bandin tärkein tukilihas.',
        fascia_cue: 'LL: gluteus medius → TFL → IT-band → fibula → peronéaaliset. Koko sivulinja.',
        phv: 'Normaali — isometriset harjoitteet turvallisia. IT-band tarkkailu tärkeää PHV:ssä.',
      },
      {
        pv: [1, 3, 6],
        nimi: 'Lateraaliloikat + luistelija',
        ohje: 'Lateraaliloikat 3×8 per puoli: hyppää sivulle yhdellä jalalla, laske hallitusti, stabiloi ennen seuraavaa. Sitten luisteluaskeleet 2×20m: laaja liuku sivulle, kyykkyasento.',
        kesto: '7 min', xp: 15,
        cue: '3 askelta jarrutuksessa — ei yhdellä. Ensimmäinen askel uuteen suuntaan ratkaisee.',
        fascia_cue: 'LL: lateraalinen ponnistus ja jarrutus. Luisteluaskel = sivuketjun funktionaalinen liike.',
        phv: '2×5 per puoli kevyesti. Lateraaliset liikkeet turvallisia — vältä maksimisuunnanmuutoksia.',
      },
      {
        pv: [5],
        nimi: 'Sivuketjun liikkuvuus',
        ohje: 'IT-band stretch seisten 3×30s per puoli: ristaa jalat, nojaa sivulle seinää vasten. Sitten lateraaliloikkakävely 2×20m: laajat askeleet sivulle kyykyssä.',
        kesto: '6 min', xp: 15,
        cue: 'IT-bandia ei voi venyttää — se ei ole lihas. Hoidetaan TFL ja gluteus medius jotka sitä jännittävät.',
        fascia_cue: 'LL: TFL → IT-band. Lateraalikävely avaa koko sivulinjan.',
        phv: 'Normaali. IT-band-kipu kasvupyrähdyksessä on varoitusmerkki — ei harjoitella kipuun.',
      },
    ],
    S: [
      {
        vk: 'parillinen',
        nimi: 'SM-ketjun kehitys — T-drill omalla ajalla',
        ohje: 'T-rata kartioilla: 4 kartiota T-muodossa (eteen 5m, sivu 2.5m+2.5m, taakse 5m). Eteen, sivulle, takaisin, sivulle, taakse. Ota aika. 4 toistoa täydellä palautuksella.',
        kesto: '20 min', xp: 30,
        cue: 'Forsman 2013: ketteryys erotteli lahjakkaita kaikissa ikäluokissa. T-drill on kansainvälinen standardi.',
        fascia_cue: 'LL: sivuttainen jarrutus → ponnistus. Jokainen käännös on sivuketjun maksimisuoritus.',
        phv: 'Normaali — T-drill turvallinen. Vältä maksimisuunnanmuutoksia kipuun asti.',
        phv_xp: 25,
      },
      {
        vk: 'pariton',
        nimi: 'SM-ketjun kehitys — pallollinen SM-rata',
        ohje: 'Sama T-rata pallon kanssa. Hidastuu — se on ok. Pallo pysyy lähellä käänteissä. 4 toistoa, ota aika, vertaa pallottomaan.',
        kesto: '20 min', xp: 30,
        cue: 'Forsman 2013: pujottelu erotteli lahjakkaita kaikissa ikäluokissa. Pallo + SM = jalkapallon ydin.',
        fascia_cue: 'LL + SL: sivuttainen liike ja pallonhallinta samaan aikaan. Tämä on pelin vaatima integraatio.',
        phv: 'Normaali — pallollinen tekniikka aina turvallista.',
        phv_xp: 25,
      },
    ],
    P: {
      nimi: 'SM-ketjun 6 viikon progressio',
      kuvaus: 'T-drill kartioilla — tavoite paranee 0.1–0.2s per jakso',
      vaiheet: [
        {
          vaihe: 'Valmistava', viikot: '1–2', intensiteetti: '60–70%',
          nimi: 'Tekniikka + perusliikkuvuus',
          ohje: 'T-drill ilman pallopaineita 4× — fokus tekniikkaan: 3 askelta jarrutuksessa, ensiaskel uuteen suuntaan. Ota aika. Lateraaliloikat 3×6 per puoli.',
          mittari: 'Kirjaa T-drill aika viikon 1 alusta.',
          kesto: '25 min', xp: 40,
        },
        {
          vaihe: 'Kehittävä', viikot: '3–4', intensiteetti: '75–85%',
          nimi: 'Reaktiivisuus + pallo',
          ohje: 'T-drill pallollinen 4×. Sitten reaktio-SM: partneri osoittaa suunnan, lähtö heti. 6×lähtö per puoli.',
          mittari: 'Vertaa pallollista T-drill aikaa pallottomaan. Eron pitäisi pienentyä.',
          kesto: '25 min', xp: 45,
        },
        {
          vaihe: 'Huipentava', viikot: '5–6', intensiteetti: '90–100%',
          nimi: 'Pelispesifi ketteryys',
          ohje: 'T-drill maksimiteholla 3×. Sitten 1v1-ketteryyspeli: pienellä alueella (5×5m) vastustajan ohittaminen feintillä. 3×2 min.',
          mittari: 'Vertaa T-drill aikaa viikon 1 tulokseen. Tavoite: -0.2s.',
          kesto: '25 min', xp: 50,
          phv: 'PHV: T-drill 70% teholla. 1v1 normaali — pelillinen konteksti aina ok.',
        },
      ],
    },
  },

  // ════════════════════════════════════════════════════════════
  // 🔄 KIERTOKETJU (SL) — Spiraalilinja
  // Kallo → ristiin kehon yli → jalkapohja
  // Jalkapallosuorituskyky: rotaatiovoima, käännösnopeus, harhautukset
  // Tyypillisin oire: nivus, IT-band, toistuva nilkka
  // ════════════════════════════════════════════════════════════
  // HUOM: sl-ketju on historiallinen nimi — käytä diag (DIAG = SL+FL, Wilke 2016)
  // sl-harjoitteet on siirretty diag-ketjuun. Tämä osio säilytetään yhteensopivuuden vuoksi.
  sl: {
    D: [
      {
        pv: [0, 2, 4],
        nimi: 'Seinäsyöttö + ponnauttelu — DIAG päivittäin',
        ohje: 'Seinäsyöttö 3×20 vuorojaloilla (1-kosketus takaisin). Sitten ponnauttelu 3×1 min: molemmat jalat vuorotellen, laske ääneen. Rintakehä ohjaa — jalka seuraa.',
        kesto: '7 min', xp: 15,
        cue: 'Forsman 2013: ponnauttelu ja syöttötaito erottelivat lahjakkaita kaikissa ikäluokissa. Tämä harjoite mittaa molempia.',
        fascia_cue: 'SL: diagonaalilinja ristiin kehon yli. Syöttö = kiertoketjun jalkapalloliike.',
        phv: 'Normaali ja suositeltu — pallolliset tekniikkaharjoitteet aina turvallisia PHV:ssä.',
      },
      {
        pv: [1, 3, 6],
        nimi: 'Kiertoaktiviointi — rintakehäkierto',
        ohje: 'Rintakehäkierto nelinkontin 3×10 per puoli: pidä lantio paikallaan, kierrä rintakehä ja kyynärpää ylös. Sitten seinäsyöttö nousevalla nopeudella 2×15.',
        kesto: '6 min', xp: 15,
        cue: 'Rintakehä ohjaa — jalka seuraa. Kiertoketju ei aukea ilman rintakehän liikkuvuutta.',
        fascia_cue: 'SL: rintakehä → lantio → jalka. Diagonaali alkaa ylävartalosta.',
        phv: 'Normaali — rintakehäkierto turvallinen ja erityisen hyödyllinen kasvupyrähdyksessä.',
      },
      {
        pv: [5],
        nimi: 'Kiertoketjun liikkuvuusrutiini',
        ohje: 'Windmill 3×8 per puoli: seiso jalat leveällä, taivuta etuviistoon ja kurkota kädellä kohti vastakkaista varpaata. Katse seuraa yläkättä. Sitten seinäsyöttö hitaasti 2×10.',
        kesto: '6 min', xp: 15,
        cue: 'Diagonaalilinja on usein epätasapainossa — löytyy usein DFL-stabiliteettiongelma yhdistettynä.',
        fascia_cue: 'SL: latissimus → vastakkainen lonkankoukistaja. Windmill avaa koko diagonaalilinjan.',
        phv: 'Normaali venytysintensiteetti. Kiertoliikkeet turvallisia.',
      },
    ],
    S: [
      {
        vk: 'parillinen',
        nimi: 'Kiertoketjun kehitys — SM-pallo seinään',
        ohje: 'SM-pallo seinään 3×3 min: kiertoheitto seinälle molemmilta puolilta. Rintakehä ohjaa — kädet seuraavat. Vauhti kasvaa progressiivisesti sarjan sisällä.',
        kesto: '20 min', xp: 30,
        cue: 'Liikanen & Törmä 2025: SM-pallo-harjoitteet korreloivat teknisen kehityspotentiaalin kanssa.',
        fascia_cue: 'SL: rotaatiovoima diagonaalista. SM-pallo on kiertoketjun jalkapallosovellus.',
        phv: 'Normaali — pallolliset kiertoharjoitteet erittäin turvallisia PHV:ssä.',
        phv_xp: 30,
      },
      {
        vk: 'pariton',
        nimi: 'Kiertoketjun kehitys — laukaus + tarkkuusharjoite',
        ohje: 'Kuljeta 15m + laukaise maaliin / merkkiä kohti 5×per jalka. Kirjaa osumakohta (nurkkailma/nurkkamaa/keski/ohi). Sitten syöttö + liike: syötä, liiku, vastaanota 3×2 min.',
        kesto: '20 min', xp: 30,
        cue: '5 laukausta per päivä = 1825 laukausta vuodessa. Laukaustarkkuus on kiertoketjun pelissä näkyvä mittari.',
        fascia_cue: 'SL: laukaus on kiertoliike jalkapohjasta niskaan. Jokainen tarkka laukaus vahvistaa diagonaalilinjan.',
        phv: 'Normaali.',
        phv_xp: 30,
      },
    ],
    P: {
      nimi: 'Kiertoketjun 6 viikon progressio',
      kuvaus: 'TSI-seuranta: mittaa SM-pallo-aika jakson alussa ja lopussa',
      vaiheet: [
        {
          vaihe: 'Valmistava', viikot: '1–2', intensiteetti: '60–70%',
          nimi: 'Tekniikka + perusrotaatio',
          ohje: 'Seinäsyöttö 1-kosketuksella 4×2 min — fokus tekniikkaan, ei nopeuteen. Kirjaa virheelliset vastaanotot. Rintakehäkierto nelinkontin 3×10.',
          mittari: 'Laske virheelliset vastaanotot per 2 min. Tavoite: alle 3.',
          kesto: '25 min', xp: 40,
        },
        {
          vaihe: 'Kehittävä', viikot: '3–4', intensiteetti: '75–85%',
          nimi: 'Rotaatioteho + peli',
          ohje: 'SM-pallo seinään 3×3 min nousevalla vauhdilla. Sitten rondo 3v1 (tai seinärondo): 1 kosketus, vaihda suuntaa joka syötön jälkeen.',
          mittari: 'Laske seinärondon virheelliset syötöt. Vertaa viikkoon 1.',
          kesto: '25 min', xp: 45,
        },
        {
          vaihe: 'Huipentava', viikot: '5–6', intensiteetti: '90–100%',
          nimi: 'Pelispesifi kiertovoima',
          ohje: 'Laukausharjoite 5×per jalka + kuljetus ennen laukausta. Kirjaa osumakohdat. Sitten 1v1-tilanne: harhautus + laukaus.',
          mittari: 'Vertaa laukaustarkkuutta viikon 1 tulokseen. Osumaprosentin pitää nousta.',
          kesto: '25 min', xp: 50,
          phv: 'Normaali — kiertoharjoitteet turvallisia PHV:ssä.',
        },
      ],
    },
  },

  // ════════════════════════════════════════════════════════════
  // 🏗️ HALLINTAKETJU (DFL) — Syvä etulinja
  // Jalkaterän syvät → lantionpohja → pallea → niska
  // Jalkapallosuorituskyky: elastisuus, asento, hengitys
  // Tyypillisin oire: alaselkä (toistuva), lantion epävakaus, hengityshäiriö
  // HUOM: DFL on pohja kaikelle — hoidetaan ENSIN jos heikoin
  // ════════════════════════════════════════════════════════════
  dfl: {
    D: [
      {
        pv: [0, 2, 4],
        nimi: '360° palleahengitys + dead bug',
        ohje: '360° palleahengitys 3×5: hengitä sisään niin että vatsa, kyljet JA selkä laajenevat (ei vain rintakehä ylös). Sitten dead bug 3×5 per puoli: selällään, alaselkä maassa, laske vastakkainen käsi+jalka hitaasti.',
        kesto: '6 min', xp: 15,
        cue: 'DFL:n ydin on pallea — se on kehon ainoa lihas joka toimii sekä hengityslihaksena että lantion stabilaattorina. Kolar 2012.',
        fascia_cue: 'DFL: lantionpohja → pallea → niska. 360°-hengitys aktivoi koko syvän etusinjan.',
        phv: 'Erityisen tärkeä PHV:ssä — syvä core on paras tuki kasvavalle selälle. Suositeltu normaalia enemmän.',
      },
      {
        pv: [1, 3, 6],
        nimi: 'Lankku + sivulankku',
        ohje: 'Lankku kyynärpäillä 3×20s: keho suorana, pakarat samassa linjassa — ei ylös eikä alas. Hengitä normaalisti. Sivulankku 3×15s per puoli: jalat päällekkäin tai polvet maahan.',
        kesto: '6 min', xp: 15,
        cue: 'McGill Big 3: lankku + sivulankku + bird dog — kliinisesti validoitu perusrutiini (McGill 2010).',
        fascia_cue: 'DFL: syvä core stabiloi kaikki muut ketjut. Ilman tätä muut harjoitteet kuormittavat väärin.',
        phv: 'Normaali ja suositeltu — isometriset harjoitteet täysin turvallisia PHV:ssä.',
      },
      {
        pv: [5],
        nimi: 'DFL-liikkuvuus + aktivointi',
        ohje: 'Cat-cow 3×8: nelinkontin, hengitä sisään = selkä koukkuun (cat), hengitä ulos = selkä notkoon (cow). Sitten bird dog 3×8 per puoli: vastapoinen käsi+jalka suorana ilmaan.',
        kesto: '6 min', xp: 15,
        cue: 'Selkäsi on lopputulos — hengityslihaksesi (DFL) eivät aktivoidu. Ensin opetellaan hengittämään oikein. Kolar 2012.',
        fascia_cue: 'DFL: rintaranka + hengityslihakset + lantionpohja. Cat-cow avaa koko syvän etusinjan.',
        phv: 'Normaali. DFL-harjoitteet ovat PHV:n tärkein harjoitteluryhmä.',
      },
    ],
    S: [
      {
        vk: 'parillinen',
        nimi: 'Hallintaketjun kehitys — progressiivinen core',
        ohje: 'Lankku 3×30s → 40s → 50s (kasva viikoittain). Sivulankku 3×20s per puoli. Bird dog 3×8 per puoli. Kaikki laadulla — ei kiireessä.',
        kesto: '20 min', xp: 30,
        cue: 'Lankun kesto kasvaa 6 viikossa: 20s → 60s. Tämä on hallintaketjun perusprogression merkki.',
        fascia_cue: 'DFL: koko syvä ketju. Isometriset harjoitteet rakentavat syvää voimaa ilman loukkaantumisriskiä.',
        phv: 'Normaali tai lisää toistoja — DFL on PARAS kasvupyrähdyksen harjoitteluryhmä.',
        phv_xp: 30,
      },
      {
        vk: 'pariton',
        nimi: 'Hallintaketjun kehitys — tasapaino + toiminnallisuus',
        ohje: 'Yhden jalan seisonta silmät kiinni 3×30s per jalka. Sitten pistoolikyykky seinää vasten 3×5 per jalka — hidas ja hallittu. Viimeisenä keppijumppa 3×8.',
        kesto: '20 min', xp: 30,
        cue: 'Tasapaino paranee ainoastaan haastamalla tasapainoa. Silmät kiinni kaksinkertaistaa haasteen — DFL joutuu töihin.',
        fascia_cue: 'DFL + LL: tasapaino vaatii sekä syvän coren että lateraalilinjan yhteistoimintaa.',
        phv: 'Normaali — tasapainoharjoitteet ovat PHV:n turvallisimpia.',
        phv_xp: 30,
      },
    ],
    P: {
      nimi: 'Hallintaketjun 6 viikon progressio',
      kuvaus: 'Lankun keston kasvu: 6 viikossa 20s → 60s (McGill 2010 + DNS-protokolla)',
      vaiheet: [
        {
          vaihe: 'Valmistava', viikot: '1–2', intensiteetti: '60–70%',
          nimi: 'Tekniikka + hengitys',
          ohje: 'Lankku 3×20s — fokus hengitykseen: hengitä normaalisti koko ajan. Dead bug 3×5 hitaasti. 360° palleahengitys 3×5. Kirjaa lankun kesto.',
          mittari: 'Kirjaa lankun maksimikesto viikolla 1.',
          kesto: '25 min', xp: 40,
        },
        {
          vaihe: 'Kehittävä', viikot: '3–4', intensiteetti: '75–85%',
          nimi: 'Keston kasvu + toiminnallisuus',
          ohje: 'Lankku 3×35s. Sivulankku 3×25s per puoli. Bird dog 3×10 per puoli. Sitten tasapainoharjoite silmät kiinni 3×20s.',
          mittari: 'Vertaa lankun kestoa viikon 1 tulokseen. Tavoite: +10s.',
          kesto: '25 min', xp: 45,
        },
        {
          vaihe: 'Huipentava', viikot: '5–6', intensiteetti: '90–100%',
          nimi: 'Maksimistabiliteetti + pelispesifi',
          ohje: 'Lankku 3×50s. Pistoolikyykky seinää vasten 3×5 per jalka. Sitten jalkapallopallo tasapainolaudalle tai yhdelle jalalle syöttö partnerille.',
          mittari: 'Lankun tavoite: 60s. Pistoolikyykky ilman seinää jos mahdollista.',
          kesto: '25 min', xp: 50,
          phv: 'Kaikki normaalisti tai enemmän — DFL:n harjoitteet ovat PHV:n parhaat.',
        },
      ],
    },
  },

  // ════════════════════════════════════════════════════════════
  // 🧠 PELIÄLYKETJU (PIQ) — Kognitiivinen ketju
  // ADAR-protokolla: Anticipation, Decision, Action, Recovery
  // Vaeyens 2007: erottaa eliitit subeliitistä paremmin kuin fysiikka
  // ════════════════════════════════════════════════════════════
  pig: {
    D: [
      {
        pv: [0, 2, 4],
        nimi: 'Skannausrutiini — katso ensin',
        ohje: 'Seinäsyöttö 3×2 min: syötä, ENNEN kuin pallo tulee takaisin katso ylös ja nimeä 3 asiaa mitä näet ympärillä. Sitten vastaanota. Älä lunttaa — katso ennen.',
        kesto: '6 min', xp: 15,
        cue: 'Vaeyens 2007: pre-scanning erottaa eliitit subeliitistä. Barcelonassa tätä harjoitellaan joka päivä — katse ylös ennen kosketusta.',
        fascia_cue: 'Peliälyketju: silmä → aivot → jalka. Tieto ennen palloa.',
        phv: 'Kognitiiviset harjoitteet ovat täsmälleen oikea valinta PHV:ssä. Keho lepää — pää kehittyy.',
      },
      {
        pv: [1, 3, 6],
        nimi: 'Virhe-peli — reagoi heti',
        ohje: 'Seinäsyöttö 3×1 min: tee TARKOITUKSELLA virheellinen syöttö (liian kova, väärä suunta), reagoi välittömästi uuteen tilanteeseen. Älä pysähdy virheen jälkeen.',
        kesto: '6 min', xp: 15,
        cue: 'Moran 2012: kyky sivuuttaa häiritseviä ärsykkeitä (virhe) on erotteleva tekijä huippupelaajilla. Tämä harjoittelee juuri sitä.',
        fascia_cue: 'Peliälyketju: Error Recovery -protokolla. Virhe → reagoi → jatka.',
        phv: 'Kognitiiviset harjoitteet suositeltuja PHV:ssä.',
      },
      {
        pv: [5],
        nimi: 'Peliälyvideo-analyysi',
        ohje: 'Katso 5 min oman peliaiheista videota (oma peli, huippupeli tai harjoitus). Kirjaa 1 asia: "Näin pelaajan joka katsoi ylös ennen vastaanottoa" tai "Näin hyökkäyksen jossa ennakoin oikein".',
        kesto: '10 min', xp: 15,
        cue: 'ADAR: Anticipation. Peliäly kehittyy myös mentaalisella harjoittelulla — ei vain kentällä.',
        fascia_cue: 'Peliälyketju: visuaalinen ja kognitiivinen harjoittelu. Katso → analysoi → sovella.',
        phv: 'Erityisen suositeltu PHV:ssä — pelillistetty mentaaliharjoittelu.',
      },
    ],
    S: [
      {
        vk: 'parillinen',
        nimi: 'Peliälyn kehitys — päätöksenteko paineessa',
        ohje: 'Seiso 10m päässä seinästä. Pidä kädessä paperia jossa numerot (1=vasen 2=oikea 3=ylä 4=ala). Nosta numero → syötä heti oikeaan suuntaan. 4×2 min. Nopeuta progressiivisesti.',
        kesto: '20 min', xp: 30,
        cue: 'Moran 2012: päätöksentekokyky paineessa on opetettavissa. Tämä pakottaa reaktiivisen valinnan — kuten pelissä.',
        fascia_cue: 'Peliälyketju: Decision + Action. Ärsyke → päätös → suoritus alle 0.5s.',
        phv: 'Normaali tai lisätään toistoja — kognitiiviset harjoitteet ihanteellisia PHV:ssä.',
        phv_xp: 30,
      },
      {
        vk: 'pariton',
        nimi: 'Peliälyn kehitys — ADAR-peliharjoite',
        ohje: 'Honey Trap -harjoite: seinäsyöttö, välillä seinä "karkottaa" pallon eri suuntaan (heitä toinen pallo kesken). Reagoi välittömästi. 3×3 min. Sitten kirjaa: kuinka monta kertaa reagoit oikein 10 tilanteesta?',
        kesto: '20 min', xp: 30,
        cue: 'ADAR-protokolla: Anticipation → Decision → Action → Recovery. Tämä harjoittelee kaikkia neljää vaiheessa yhtä aikaa.',
        fascia_cue: 'Koko ADAR-ketju: ennakoi → päätä → toimi → palaudu virheestä.',
        phv: 'Normaali.',
        phv_xp: 30,
      },
    ],
    P: {
      nimi: 'Peliälyn 6 viikon progressio',
      kuvaus: 'ADAR-videosessio + skannaustaajuuden mittaaminen',
      vaiheet: [
        {
          vaihe: 'Valmistava', viikot: '1–2', intensiteetti: '60–70%',
          nimi: 'Tietoisuus + skannausharjoittelu',
          ohje: 'Katso 3 klippiä oman seurasi pelistä (tai oma harjoitusvideo). Kirjaa: kuinka moni pelaaja katsoi ylös ennen vastaanottoa? Sitten skannausrutiini 4×2 min.',
          mittari: 'Kirjaa skannaushavainnot viikolla 1. Vertaa viikkoon 6.',
          kesto: '25 min', xp: 40,
        },
        {
          vaihe: 'Kehittävä', viikot: '3–4', intensiteetti: '75–85%',
          nimi: 'Päätöksenteko + peli',
          ohje: 'Päätöksenteko-harjoite (numerot) 4×2 min nousevalla vauhdilla. Sitten seinäsyöttö kahdella pallolla: vaihda palloa satunnaisesti partnerisi käskystä.',
          mittari: 'Laske virheelliset reaktiot. Tavoite: alle 2 per 2 min.',
          kesto: '25 min', xp: 45,
        },
        {
          vaihe: 'Huipentava', viikot: '5–6', intensiteetti: '90–100%',
          nimi: 'Pelispesifi peliäly',
          ohje: 'ADAR Honey Trap 3×3 min. Sitten katso 5 min huippupelaajan videota (sama pelipaikka kuin sinulla). Kirjaa 3 havaintoa heidän skannauksestaan.',
          mittari: 'Vertaa oikeiden reaktioiden määrää viikon 1 tulokseen.',
          kesto: '25 min', xp: 50,
          phv: 'Normaali tai enemmän — peliäly on PHV:n paras kehitysalue.',
        },
      ],
    },
  },
};

/* ═══════════════════════════════════════════════════════════════════
   PÄIVITETTY generoimTehtavat — käyttää HARJOITEPANKKIA
   Lisää P-harjoite U15+ viikon 1-6 rakenteen mukaan
   ═══════════════════════════════════════════════════════════════════ */

function generoimTehtavatV2(pelaaja, jaksoViikko) {
  if (!pelaaja) return [];

  const ika      = pelaaja.ika || 13;
  const phv      = pelaaja.phv_tila || 'AN';
  const stage    = _laskeStage(pelaaja);
  const ityyppi  = _ikatyyppi(ika);
  const tehtavat = [];

  // Ketjujärjestys
  const ketjuArvot = {
    sbl: pelaaja.sbl  || 1.5,
    sfl: pelaaja.sfl  || 1.5,
    ll:  pelaaja.ll   || 1.5,
    sl:  pelaaja.sl   || pelaaja.diag || 1.5, // backward-compat: sl → diag
    dfl: pelaaja.dfl  || 1.5,
    pig: pelaaja.pig  || 1.5,
  };
  const jarjestys = Object.entries(ketjuArvot)
    .sort(([,a],[,b]) => a - b)
    .map(([k]) => k);
  const heikoin         = jarjestys[0];
  const toiseksiHeikoin = jarjestys[1];

  // Ajastus
  const ikaLuokka  = ika <= 12 ? 'U12' : ika <= 15 ? 'U15' : 'U19';
  const viikonNro  = jaksoViikko || _laskeViikonNro();
  const paivaNro   = new Date().getDay() === 0 ? 6 : new Date().getDay() - 1; // 0=Ma
  const vkParit    = viikonNro % 2 === 0 ? 'parillinen' : 'pariton';
  const sKetju     = vkParit === 'parillinen' ? heikoin : toiseksiHeikoin;
  // P-harjoitteen vaihe: viikot 1-2=valmistava, 3-4=kehittävä, 5-6=huipentava, sitten alkaa alusta
  const jaksoVko   = ((viikonNro - 1) % 6) + 1;
  const pVaiheIdx  = jaksoVko <= 2 ? 0 : jaksoVko <= 4 ? 1 : 2;

  // 1. T-harjoite — käytetään v3:n PANKKI:a
  const tBank = ika <= 12 ? PANKKI.T.leikkija : ika <= 15 ? PANKKI.T.rakentaja : PANKKI.T.showcase;
  const tKey  = stage <= 2 ? 'stage_1_2' : stage <= 4 ? 'stage_3' : 'stage_5';
  const tHarjV2 = tBank[tKey] || tBank['stage_3'] || tBank['stage_1_2'] || tBank['stage_5']
    || PANKKI.T.rakentaja['stage_3'];
  const tOhjeV2 = _ohje(tHarjV2, ityyppi);
  tehtavat.push({
    id:'t_pallo', tyyppi:'T', label:'⚽ Kultaikkuna',
    label_cue:'Joka päivä — myös lepopäivät · Ajax/Benfica/La Masia',
    nimi:tHarjV2.nimi, ohje:tOhjeV2, kesto:tHarjV2.kesto, xp:tHarjV2.xp,
    cue:tHarjV2.cue, yt:tHarjV2.yt, ketju:null, stage, ityyppi,
  });

  // 2. D-harjoite pankkista — vaihtelee viikonpäivän mukaan
  const dVaihtoehdot = HARJOITEPANKKI[heikoin]?.D || [];
  const dHarj = dVaihtoehdot.find(h => h.pv && h.pv.includes(paivaNro)) || dVaihtoehdot[0];
  if (dHarj) {
    const dOhje = (phv === 'PH' && dHarj.phv)
      ? dHarj.ohje + '\n\n⚠️ ' + dHarj.phv : dHarj.ohje;
    tehtavat.push({
      id:'d_aktivointi', tyyppi:'D', label:'Päivittäinen',
      label_cue:'5–10 min · Ylläpito · Myös lepopäivät',
      nimi:dHarj.nimi, ohje:dOhje, kesto:dHarj.kesto, xp:dHarj.xp,
      cue:dHarj.cue, ketju:heikoin, ketjuNimi:KETJUT[heikoin]?.nimi,
      fascia_cue: dHarj.fascia_cue,
    });
  }

  // 3. S-harjoite pankkista — U13+
  if (ika >= 13) {
    const sVaihtoehdot = HARJOITEPANKKI[sKetju]?.S || [];
    const sHarj = sVaihtoehdot.find(h => h.vk === vkParit) || sVaihtoehdot[0];
    if (sHarj) {
      const sOhje = (phv === 'PH' && sHarj.phv) ? sHarj.ohje + '\n\n⚠️ ' + sHarj.phv : sHarj.ohje;
      const sXp   = (phv === 'PH' && sHarj.phv_xp) ? sHarj.phv_xp : sHarj.xp;
      tehtavat.push({
        id:'s_kohdennettu', tyyppi:'S', label:'Kohdennettu',
        label_cue:'30% · Heikoin ketju · 15–20 min · Vapaa-/lepopäivä',
        nimi:sHarj.nimi, ohje:sOhje, kesto:sHarj.kesto, xp:sXp,
        cue:sHarj.cue, ketju:sKetju, ketjuNimi:KETJUT[sKetju]?.nimi,
        fascia_cue: sHarj.fascia_cue,
        vkKierto: `Viikko ${viikonNro} · ${vkParit === 'parillinen' ? 'Heikoin' : 'Toiseksi heikoin'} ketju`,
      });
    }
  }

  // 4. P-harjoite pankkista — U15+ (ei alle 15v, ei PHV-huipulla intensiivinen)
  if (ika >= 15) {
    const pData = HARJOITEPANKKI[heikoin]?.P;
    if (pData && pData.vaiheet) {
      const pVaihe = pData.vaiheet[pVaiheIdx];
      const pOhje  = (phv === 'PH' && pVaihe.phv) ? pVaihe.phv : pVaihe.ohje;
      const pXp    = phv === 'PH' ? Math.round(pVaihe.xp * 0.7) : pVaihe.xp;
      tehtavat.push({
        id:'p_progressiivinen', tyyppi:'P', label:'Progressiivinen',
        label_cue:`Jakso: ${pVaihe.vaihe} · Viikot ${pVaihe.viikot} · ${pVaihe.intensiteetti}`,
        nimi:pVaihe.nimi, ohje:pOhje, kesto:pVaihe.kesto, xp:pXp,
        cue:pData.kuvaus, ketju:heikoin, ketjuNimi:KETJUT[heikoin]?.nimi,
        mittari: pVaihe.mittari,
        vaihe: pVaihe.vaihe,
      });
    }
  }

  return tehtavat;
}


/* ═══════════════════════════════════════════════════════════════════
   EVERTON-LISÄYKSET HARJOITEPANKKIIN
   
   Puuttuvat kategoriat Everton-matriisin pohjalta:
   1. Laskeutuminen (ACL-ehkäisy) — liitetään SBL + SFL + LL ketjuihin
   2. YJ-loikat (reaktiivisuus) — liitetään LL + SBL ketjuihin  
   3. Karhukävely (dynaaminen core) — liitetään DFL ketjuun
   
   PHV-kytkentä (tämä on lisäarvo Evertoniin verrattuna):
   - AN (pre-PHV):  tekniikka + kehonpaino, laatu ensin
   - PH (circa-PHV): VAIN tekniikka, ei reaktiivisia kontakteja
   - VA (post-PHV):  täysi progressio, reaktiiviset harjoitteet ok
   
   Ikäporrastus:
   - U12: laskeutumistekniikka kehonpainolla (ei korkeutta)
   - U13–U14: YJ-laskeutuminen + peruslaskeutuminen
   - U15+: reaktiiviset + rotaatiovariantit (Everton Stage 4–5)
   ═══════════════════════════════════════════════════════════════════ */

// Lisätään olemassaolevaan HARJOITEPANKKIIN uudet osa-alueet
// Kutsutaan generoimTehtavatV2:ssa


const EVERTON_LISAYKSET = {

  // ════════════════════════════════════════════════════════════
  // LASKEUTUMINEN — kytketään fascia-linjoihin
  // Everton kategoriat 10 (bilateral) + 11 (unilateral)
  // ACL-epidemia: 29× yleisempää kuin 25v sitten (Sky Sports 2023)
  // ════════════════════════════════════════════════════════════
  laskeutuminen: {

    // SBL-kytkentä: takaketju vastaanottaa impulssin laskeutuessa
    sbl: {
      S: [
        {
          vk: 'parillinen',
          nimi: 'Takaketjun laskeutumistekniikka',
          ohje: 'Astu alas 20–30 cm korokkeelta yhdellä jalalla. Laske hitaasti kyykkyyn — tunne hamstring jarruttamassa. Pidä 2s. 5 toistoa per jalka × 3 sarjaa.',
          kesto: '15 min', xp: 30,
          cue: 'Hamstring suojaa ACL:ää laskeutuessa. Ilman tätä harjoitusta polvi voi "antaa periksi" hypyn jälkeen.',
          fascia_cue: 'SBL: takaketju eksentrisenä. Jalkapohja → pohje → hamstring jarruttaa koko ketjuna.',
          phv: 'PHV: pelkkä askellasku ilman koroketta. Ei ponnistusta — pelkkä hallittu lasku.',
          phv_xp: 20,
          stage: 'Everton Stage 1–2',
        },
        {
          vk: 'pariton',
          nimi: 'Takaketjun reaktiivinen laskeutuminen',
          ohje: 'Syväpudotushyppy 30cm korokkeelta: astu alas, laske välittömästi kyykkyyn ilman pysähdystä. 5 toistoa × 3 sarjaa. Pehmeä laskeutuminen — ei kolahdusta.',
          kesto: '15 min', xp: 35,
          cue: 'GRF (ground reaction force) on 3–5× kehonpaino laskeutuessa. Takaketjun pitää olla valmis. Ei kolahdusta = oikein.',
          fascia_cue: 'SBL eksentrinen + DFL stabiloi. Laskeutuminen on koko ketjun yhteissuoritus.',
          phv: 'PHV: ei pudotushyppyä. Pehmeä laskeutuminen kehonpainolla 3×5 per jalka.',
          phv_xp: 15,
          stage: 'Everton Stage 3',
          min_ika: 13,
        },
      ],
    },

    // SFL-kytkentä: etuketju vastaanottaa hyppyvoiman
    sfl: {
      S: [
        {
          vk: 'parillinen',
          nimi: 'Etuketjun laskeutumistekniikka — kyykkyhyppy',
          ohje: 'Kyykkyhyppy: laske nopeasti puolikyykkyyn → ponnista ylös → laske pehmeästi takaisin puolikyykkyyn. 5 toistoa × 3 sarjaa. Ei pysähdystä — elastinen energia.',
          kesto: '15 min', xp: 30,
          cue: 'Nopea alas = nopea ylös. Elastinen energia säilyy vain jos laskeutuminen on pehmeä — ei jarruteta.',
          fascia_cue: 'SFL: nelipäinen + lantionkoukistaja vastaanottavat impulssin. Elastisuusindeksi paranee tällä.',
          phv: 'PHV: 3 toistoa × 3 sarjaa 60% teholla. Polven etuosa herkkä — ei kipuun asti.',
          phv_xp: 20,
          stage: 'Everton Stage 2–3',
        },
        {
          vk: 'pariton',
          nimi: 'Etuketjun laskeutuminen 90° käännöksellä',
          ohje: 'Hyppää ylös → laskeudu 90° kääntyneenä vasemmalle → seuraavalla oikealle. 5 toistoa per suunta × 3 sarjaa. Polvet pehmeiksi välittömästi laskeutuessa.',
          kesto: '15 min', xp: 35,
          cue: 'ACL on suurimmassa riskissä rotaatiolaskeutumisessa. Tämä harjoite opettaa turvallisen kääntymisenä — automaattiseksi.',
          fascia_cue: 'SFL + SL: rotaatiolaskeutuminen vaatii etuketjun + kiertoketjun yhteistoimintaa.',
          phv: 'PHV: ei rotaatiota. Peruslaskeutuminen suoraan 3×5.',
          phv_xp: 15,
          stage: 'Everton Stage 3–4',
          min_ika: 14,
        },
      ],
    },

    // LL-kytkentä: sivuketju estää valgus-kollapsın
    ll: {
      S: [
        {
          vk: 'parillinen',
          nimi: 'Sivuketjun YJ-laskeutuminen + pito',
          ohje: 'Hyppää sivulle yhdellä jalalla → laske hallitusti kyykkyyn → pidä 2s. Polvi suoraan jalkaterän yli — ei sisäänpäin. 5 toistoa per jalka × 3 sarjaa.',
          kesto: '15 min', xp: 30,
          cue: 'Valgus-kollapsi (polvi sisäänpäin laskeutuessa) on ACL-vamman mekaaninen momentti. Gluteus medius estää sen — tämä harjoittelee juuri sitä.',
          fascia_cue: 'LL: gluteus medius → IT-band → peronéaaliset. Sivulinja estää polven kaatumisen sisäänpäin.',
          phv: 'PHV: pelkkä askellasku sivulle, ei hyppyä. 3×5 per jalka.',
          phv_xp: 20,
          stage: 'Everton Stage 2–3',
        },
        {
          vk: 'pariton',
          nimi: 'Sivuketjun reaktiivinen YJ-laskeutuminen',
          ohje: 'Hyppää sivulle yhdellä jalalla → välittömästi takaisin → toiselle puolelle. Rytmikäs loikka ilman pysähdystä. 3×8 per suunta. Pehmeä kosketusnopeus.',
          kesto: '15 min', xp: 35,
          cue: 'Reaktiivinen sivuttaisliike simuloi pelissä tapahtuvaa suunnanmuutosta. Kosketusnopeus ratkaisee.',
          fascia_cue: 'LL reaktiivisena: sivuketju toimii jousena — kerää energian laskeutuessa, vapauttaa ponnistuksessa.',
          phv: 'PHV: hidas rytminen loikka 3×5 per suunta. Ei maksiminopeutta.',
          phv_xp: 20,
          stage: 'Everton Stage 4',
          min_ika: 14,
        },
      ],
    },
  },

  // ════════════════════════════════════════════════════════════
  // YJ-LOIKAT — kytketään LL + SBL ketjuihin
  // Everton kategoria 13: Loikkaaminen (YJ)
  // ════════════════════════════════════════════════════════════
  loikat: {
    ll: {
      P_lisays: {
        nimi: 'SM-ketjun loikkaprogressio — 6 viikkoa',
        kuvaus: 'YJ-aitaloikka eteenpäin → sivulle → tasapainolauta (Everton Stage 3→5)',
        vaiheet: [
          {
            vaihe: 'Valmistava', viikot: '1–2', intensiteetti: '60–70%',
            nimi: 'YJ-aitaloikka eteenpäin + pito',
            ohje: 'Loiki yhdellä jalalla matalan esteen yli eteenpäin → pysähdy → stabiloi. 5 toistoa per jalka × 2–3 sarjaa. Laskeutuminen pehmeästi — ei kolahdusta.',
            mittari: 'Laske epäpuhtaat laskeutumiset (polvi sisään / kolahdus). Tavoite: 0 per sarja.',
            kesto: '20 min', xp: 40,
            phv: 'PHV: pelkkä sivuaskellasku ilman hyppyä. Tekniikka ensin.',
          },
          {
            vaihe: 'Kehittävä', viikot: '3–4', intensiteetti: '75–85%',
            nimi: 'YJ-aitaloikka sivulle + pito',
            ohje: 'Sama mutta sivuttain. 5 toistoa per jalka per suunta × 3 sarjaa. Pito 2s jokaisen laskeutumisen jälkeen.',
            mittari: 'Vertaa vasenta ja oikeaa — symmetria on tavoite. Iso ero = lateraaliheikkous.',
            kesto: '20 min', xp: 45,
            phv: 'PHV: hidas sivuaskellasku 3×5. Ei hyppyä.',
          },
          {
            vaihe: 'Huipentava', viikot: '5–6', intensiteetti: '90–100%',
            nimi: 'Reaktiivinen YJ-loikka — ei pitoa',
            ohje: 'Loiki sivulle ilman pitoa — välittömästi takaisin. 3×8 per suunta. Kosketusnopeus tavoite alle 0.3s. Everton Stage 4–5.',
            mittari: 'Arvioi rytmin tasaisuus. Epätasainen rytmi = yksi puoli heikompi.',
            kesto: '20 min', xp: 50,
            phv: 'PHV: hidas rytminen 3×6. Ei maksiminopeutta.',
          },
        ],
      },
    },
  },

  // ════════════════════════════════════════════════════════════
  // KARHUKÄVELY + DYNAAMINEN CORE — DFL täydennys
  // Everton kategoria 9: Karhukävely → Hämähäkkikävely → Matokävely
  // Dynaamisempi kuin nykyinen lankku + dead bug
  // ════════════════════════════════════════════════════════════
  dynaaminen_core: {
    dfl: {
      S_lisays: [
        {
          vk: 'parillinen',
          nimi: 'DFL dynaamiset core-ryöminnät',
          ohje: [
            'Karhukävely 2×10m: nelinkontin, polvet 2cm lattiasta. Lantio ei heilun — hidas ja hallittu.',
            'Hämähäkkikävely korkea 2×10m: kädet + jalat samaan suuntaan samanaikaisesti.',
            'Matokävely kyynärpäillä 2×10m: selällään, vedä itsesi eteenpäin kyynärpäillä.',
          ].join(' / '),
          kesto: '20 min', xp: 30,
          cue: 'Everton Stage 1→4: Karhukävely opettaa syviä stabilaattoreita dynaamisessa anti-rotation -vaatimuksessa. Vatsalihakset töissä koko ajan ilman ylikuormitusta.',
          fascia_cue: 'DFL + SBL: ryömintäharjoitteet aktivoivat transversus abdominista, multifidusta ja syvää etuketjua samaan aikaan.',
          phv: 'Normaali — nämä ovat PHV:n turvallisimpia harjoitteita. Lisää toistoja mielellään.',
          phv_xp: 30,
          stage: 'Everton Stage 1–4',
        },
      ],
    },
  },
};

/* ═══════════════════════════════════════════════════════════════════
   VIIKKO-OHJELMOINTI — generoi pelaajan viikko-ohjelma
   
   Yhdistää:
   - Perusharjoitteet (T/D/S/P) päivittäin
   - Everton-lisäykset (laskeutuminen/loikat) 2×/vk
   - PHV-automaatio
   - Joukkuetreeni-tunnistus (ti/pe oletuksena)
   
   Palauttaa 7 päivän ohjelman objektina:
   { ma: [...], ti: [...], ke: [...], to: [...], pe: [...], la: [...], su: [...] }
   ═══════════════════════════════════════════════════════════════════ */


function generoimViikoOhjelma(pelaaja, joukkuePaivat) {
  joukkuePaivat = joukkuePaivat || [1, 4]; // Ti + Pe oletuksena
  const ika    = pelaaja.ika || 13;
  const phv    = pelaaja.phv_tila || 'AN';
  const stage  = _laskeStage(pelaaja);
  const ityyppi = _ikatyyppi(ika);
  const prof   = laskeKetjuProfiili(pelaaja);
  const heikoin = prof.heikoin;
  const viikonNro = _laskeViikonNro();
  const vkParit   = viikonNro % 2 === 0 ? 'parillinen' : 'pariton';
  const ikaLuokka = ika <= 12 ? 'U12' : ika <= 15 ? 'U15' : 'U19';

  // P-harjoitteen vaihe
  const jaksoVko  = ((viikonNro - 1) % 6) + 1;
  const pVaiheIdx = jaksoVko <= 2 ? 0 : jaksoVko <= 4 ? 1 : 2;

  const PAIVAT = ['ma','ti','ke','to','pe','la','su'];
  const viikko = {};

  PAIVAT.forEach((pv, pvIdx) => {
    const harjoitteet = [];
    const onJoukkue = joukkuePaivat.includes(pvIdx);
    const onLepo    = pvIdx === 6; // Su

    // ── T: joka päivä — v3 PANKKI:sta ───────────────────────
    const tBankV = ika <= 12 ? PANKKI.T.leikkija : ika <= 15 ? PANKKI.T.rakentaja : PANKKI.T.showcase;
    const tKeyV  = stage <= 2 ? 'stage_1_2' : stage <= 4 ? 'stage_3' : 'stage_5';
    const tHarjV = tBankV[tKeyV] || tBankV['stage_3'] || tBankV['stage_1_2']
      || PANKKI.T.rakentaja['stage_3'];
    harjoitteet.push({
      tyyppi: 'T', pakollinen: true,
      nimi:  tHarjV.nimi,
      ohje:  _ohje(tHarjV, ityyppi),
      kesto: tHarjV.kesto,
      xp:    tHarjV.xp,
      cue:   tHarjV.cue,
      yt:    tHarjV.yt,
    });

    // ── Joukkuetreeni ────────────────────────────────────────
    if (onJoukkue) {
      harjoitteet.push({
        tyyppi: 'JOUKKUE', pakollinen: false,
        nimi: 'Joukkueharjoitus',
        ohje: 'Valmentajan suunnittelema. TalentMaster ei koske tähän.',
        kesto: '60–90 min', xp: 0,
      });
      viikko[pv] = { harjoitteet, tyyppi: 'joukkue' };
      return;
    }

    // ── D: joka päivä ───────────────────────────────────────
    const dVaihtoehdot = HARJOITEPANKKI[heikoin]?.D || [];
    const dHarj = dVaihtoehdot.find(h => h.pv && h.pv.includes(pvIdx)) || dVaihtoehdot[0];
    if (dHarj) {
      harjoitteet.push({
        tyyppi: 'D',
        nimi: dHarj.nimi,
        ohje: (phv === 'PH' && dHarj.phv) ? dHarj.ohje + ' ⚠️ ' + dHarj.phv : dHarj.ohje,
        kesto: dHarj.kesto,
        xp: dHarj.xp,
        cue: dHarj.cue,
        fascia_cue: dHarj.fascia_cue,
        ketju: heikoin,
      });
    }

    // ── Lepopäivä (su) ───────────────────────────────────────
    if (onLepo) {
      viikko[pv] = { harjoitteet, tyyppi: 'lepo',
        viesti: 'Lepo on harjoittelu. T-harjoite riittää tänään.' };
      return;
    }

    // ── S: vapaa/lepopäivä → la ─────────────────────────────
    if (pvIdx === 5 && ika >= 13) { // La
      const sKetju = vkParit === 'parillinen' ? heikoin : prof.toiseksiHeikoin;
      const sVaihtoehto = HARJOITEPANKKI[sKetju]?.S?.find(h => h.vk === vkParit)
        || HARJOITEPANKKI[sKetju]?.S?.[0];
      if (sVaihtoehto) {
        harjoitteet.push({
          tyyppi: 'S',
          nimi: sVaihtoehto.nimi,
          ohje: (phv === 'PH' && sVaihtoehto.phv) ? sVaihtoehto.ohje + ' ⚠️ ' + sVaihtoehto.phv : sVaihtoehto.ohje,
          kesto: sVaihtoehto.kesto,
          xp: (phv === 'PH' && sVaihtoehto.phv_xp) ? sVaihtoehto.phv_xp : sVaihtoehto.xp,
          cue: sVaihtoehto.cue,
          fascia_cue: sVaihtoehto.fascia_cue,
          ketju: sKetju,
          vkKierto: `Vk ${viikonNro} · ${vkParit === 'parillinen' ? 'Heikoin' : 'Toiseksi heikoin'}`,
        });
      }
    }

    // ── Laskeutuminen: ke + to (2×/vk) ──────────────────────
    // Kytketty heikoimpaan ketjuun jolla on laskeutumisharjoite
    // Laskeutumisharjoite kytkeytyy alaraajan ketjuihin (SBL/SFL/LL)
    // DIAG ja DFL eivät tarvitse omaa laskeutumisharjoitetta
    const laskKetju = ['sbl','sfl','ll'].includes(heikoin) ? heikoin
      : ['sbl','sfl','ll'].find(k => prof.jarjestys.indexOf(k) < 3) || 'sfl';

    if ([2, 3].includes(pvIdx)) { // Ke + To
      const laskS = EVERTON_LISAYKSET.laskeutuminen[laskKetju]?.S;
      if (laskS) {
        const laskHarj = laskS.find(h => h.vk === (pvIdx === 2 ? 'parillinen' : 'pariton'))
          || laskS[0];
        const ikaSopii = !laskHarj.min_ika || ika >= laskHarj.min_ika;
        if (ikaSopii) {
          harjoitteet.push({
            tyyppi: 'LASKU',
            label: `🛬 Laskeutuminen — ${laskHarj.stage || ''}`,
            nimi: laskHarj.nimi,
            ohje: (phv === 'PH' && laskHarj.phv) ? laskHarj.phv : laskHarj.ohje,
            kesto: laskHarj.kesto,
            xp: (phv === 'PH' && laskHarj.phv_xp) ? laskHarj.phv_xp : laskHarj.xp,
            cue: laskHarj.cue,
            fascia_cue: laskHarj.fascia_cue,
            ketju: laskKetju,
            acl_suojaus: true,
          });
        }
      }
    }

    // ── P: U15+ — ma + ke ────────────────────────────────────
    if (ika >= 15 && [0, 2].includes(pvIdx)) {
      const pData = HARJOITEPANKKI[heikoin]?.P;
      if (pData?.vaiheet) {
        const pVaihe = pData.vaiheet[pVaiheIdx];
        harjoitteet.push({
          tyyppi: 'P',
          label: `📈 ${pVaihe.vaihe} · Vk ${pVaihe.viikot} · ${pVaihe.intensiteetti}`,
          nimi: pVaihe.nimi,
          ohje: (phv === 'PH' && pVaihe.phv) ? pVaihe.phv : pVaihe.ohje,
          kesto: pVaihe.kesto,
          xp: phv === 'PH' ? Math.round(pVaihe.xp * 0.7) : pVaihe.xp,
          mittari: pVaihe.mittari,
          ketju: heikoin,
        });
      }
    }

    // ── Karhukävely DFL: to ──────────────────────────────────
    if (pvIdx === 3 && heikoin === 'dfl') {
      const karhu = EVERTON_LISAYKSET.dynaaminen_core.dfl.S_lisays[0];
      harjoitteet.push({
        tyyppi: 'CORE',
        label: '🐻 Dynaaminen core',
        nimi: karhu.nimi,
        ohje: (phv === 'PH' && karhu.phv) ? karhu.ohje : karhu.ohje,
        kesto: karhu.kesto,
        xp: karhu.xp,
        cue: karhu.cue,
        fascia_cue: karhu.fascia_cue,
      });
    }

    // Määritä päivän tyyppi
    const pvTyyppi = onLepo ? 'lepo'
      : harjoitteet.some(h => h.tyyppi === 'P') ? 'kehitys_intensiivinen'
      : harjoitteet.some(h => h.tyyppi === 'LASKU') ? 'kehitys_laskeutuminen'
      : harjoitteet.some(h => h.tyyppi === 'S') ? 'kehitys_kohdistettu'
      : 'perus';

    viikko[pv] = {
      harjoitteet,
      tyyppi: pvTyyppi,
      xp_yhteensa: harjoitteet.reduce((s, h) => s + (h.xp || 0), 0),
    };
  });

  return viikko;
}

/* ═══════════════════════════════════════════════════════════════════
   VIIKKOTESTI — tulostaa koko viikko-ohjelman
   ═══════════════════════════════════════════════════════════════════ */
