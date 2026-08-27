/* ═══════════════════════════════════════════════════════════════════
   CANONICAL SOURCE — Pelaaja_v7 lataa tämän suoraan GitHub Pagesista.
   src/lib/harjoitelogiikka_v4.js on re-export tänne (ks. A7 Vaihe 0).
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
    //   Syyskuu   (vk 1–4):   vastaanottaminen — Maestro-teema
    //   Lokakuu   (vk 5–8):   dribbelin perusta — Shadowstep-teema
    //   Marraskuu (vk 9–12):  1v1-liikkeet — Shadowstep-teema
    //   Joulukuu  (vk 13–16): syöttäminen — Maestro-teema
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

    // ── SYYSKUU (kuukausi 9): VASTAANOTTAMINEN (Maestro-teema) ──────
    kaka: {   // OBJEKTIAVAIN 'kaka' säilyy (Vaihe 1 -sauma viittaa siihen) — näyttösisältö anonymisoitu (#91)
      teema: 'Vastaanottaminen',
      kuvaus_leikkija: 'Maestro — ensimmäinen kosketus vie pallon menosuuntaan',
      kuvaus_rakentaja: 'Maestro — 1. kosketus ostaa ajan ja tilan',
      kuvaus_showcase: 'Maestro — suuntaava vastaanotto paineessa',

      vk1: { // Taso 1: opitaan liike ilman vastustajaa
        nimi: 'Maestro — Pysäytys sisäterällä',
        ohje_leikkija: '10 kertaa: pomppaa seinään ja pysäytä sisäterällä. Suuntaa pallo sinne mihin haluat juosta seuraavaksi.',
        ohje_rakentaja: '3×10, molemmat jalat. Sisäterä vastaanottaa — 1. kosketus osoittaa seuraavan suunnan ennen kuin puolustaja reagoi.',
        ohje_showcase: '4×10, vaihda jalkaa sarjojen välissä. Automaatti: sisäterä kehon alle, jalkaterä pelattavaan suuntaan ennen pallonkosketusta.',
        kesto: '15 min', xp: 20,
        yt: 'fHbM1v9G6xk',
        cue: 'Maestron sääntö: ensimmäinen kosketus on jo seuraava liike.',
        tarina: 'Eräs nuori huippu nousi akatemiassa kaksi ikäluokkaa muita edellä jo teininä — ei koon takia, vaan koska hänen ensikosketuksensa oli niin varma, että hänelle jäi aina enemmän aikaa kuin muille.',
        viikkotavoite: 'Sisäterävastaanotto — 8/10 lähtee suoraan menosuuntaan',
      },
      vk2: { // Taso 1+: vastaanotto + suunnanvaihto, nopeus kasvaa
        nimi: 'Maestro — Vastaanota ja käännä',
        ohje_leikkija: '12 kertaa: ota pallo seinästä ja käännä se heti uuteen suuntaan sisäterällä. Älä pysäytä paikalleen — pallo lähtee jo eteenpäin.',
        ohje_rakentaja: '3×12, vuorojaloin. Avaa lantio ennen kosketusta — 1. kosketus kääntää pallon pois sieltä mistä se tuli, niin saat aikaa ja tilaa.',
        ohje_showcase: '4×12, käännä molempiin suuntiin. Automaatti: skannaa olkapään yli ennen palloa, sisäterän kosketus avaa suoraan vapaaseen tilaan ilman lisäkosketusta.',
        kesto: '15 min', xp: 20,
        yt: 'fHbM1v9G6xk',
        cue: 'Vastaanotto on jo hyökkäys — käänny sinne missä on tilaa.',
        tarina: 'Eräs huipulle noussut pelaaja harjoitteli jo nuorena kuukausia aikuisten joukkueen mukana — vain seuratakseen läheltä, miten parhaat ottavat ensikosketuksen haltuun ennen kuin paine ehtii päälle.',
        viikkotavoite: 'Vastaanotto + käännös yhdellä kosketuksella 20/24',
      },
      vk3: { // Taso 2: passiivinen vastustaja — suojaus
        nimi: 'Maestro — Suojaa ja avaudu',
        ohje_leikkija: 'Pyydä kaveri viereen (ei ota palloa). Ota pallo sisäterällä niin että kehosi on pallon ja kaverin välissä. 12 kertaa.',
        ohje_rakentaja: '3×12 passiivisen puolustajan kanssa. Vastaanota takajalalla, kallista keho puolustajan ja pallon väliin — 1. kosketus vie pallon turvaan paineesta pois.',
        ohje_showcase: '4×12, vaihda kumpi olkapää suojaa. Automaatti: tunnista paine ennen palloa, suojaa kehollasi ja avaudu sisäterällä vapaaseen tilaan yhdellä kosketuksella.',
        kesto: '20 min', xp: 25,
        yt: 'fHbM1v9G6xk',
        cue: 'Keho pallon ja vastustajan väliin — silloin pallo on aina sinun.',
        tarina: 'Eräs nuori pelaaja tuli vaihdosta kentälle joukkueensa hävitessä, ja vastustaja epäili ääneen mitä noin nuori siellä tekee. Puolessa tunnissa hän käänsi ottelun täysin — rauhallinen ensikosketus antoi hänelle ajan, jota muilla ei ollut.',
        viikkotavoite: 'Suojattu vastaanotto auki paineesta 15/20',
      },
      vk4: { // Taso 3: mittaus + oma arvio
        nimi: 'Maestro — Mittaa ensikosketuksesi',
        ohje_leikkija: 'Tee 20 vastaanottoa. Laske montako kertaa pallo pysähtyy alle metrin päähän jalastasi. Kirjaa ennätys ja yritä päihittää se.',
        ohje_rakentaja: '20 vastaanottoa: laske montako menee suoraan peliasentoon (pallo alle 1 m, keho jo menosuuntaan). Vertaa vk1:n tulokseen — paraniko 1. kosketuksen suunta?',
        ohje_showcase: '20 vastaanottoa paineessa (passiivinen puolustaja): laske montako kääntyy suoraan vapaaseen tilaan ilman lisäkosketusta. Tavoite 16/20 — sillä tasolla 1. kosketus on ase.',
        kesto: '20 min', xp: 30,
        yt: 'fHbM1v9G6xk',
        cue: 'Ilman mittausta et tiedä, paraneeko ensikosketuksesi.',
        tarina: 'Eräs pelaaja nousi seuransa kaikkien aikojen nuorimmaksi pääsarjapelaajaksi vain 16-vuotiaana ja rikkoi ennätyksen joka oli kestänyt vuosikymmeniä — ja hänet valittiin heti ensiottelunsa parhaaksi pelaajaksi.',
        viikkotavoite: 'Suuntaava ensikosketus: montako 20:stä menosuuntaan?',
      },
    },

    // ── LOKAKUU (kuukausi 10): DRIBBELIN PERUSTA (Shadowstep-teema) ─
    affelay: {
      teema: 'Dribbelin perusta',
      kuvaus_leikkija: 'Kuljeta palloa silmät ylhäällä!',
      kuvaus_rakentaja: '4 perustaitoa — pohja kaikelle muulle',
      kuvaus_showcase: 'Shadowstep — dribbeli + liike ilman palloa',

      vk1: {
        nimi: 'Dribbeli — katse ylhäällä',
        ohje_leikkija: 'Kuljeta palloa eteenpäin 20 metriä, katso YLHÄÄLLÄ! Älä katso palloon. Vaihda suuntaa äkillisesti 5 kertaa. Tee 5 kierrosta.',
        ohje_rakentaja: '4 perustaitoa peräkkäin: 1) Kuljeta silmät yli pallon etsien tilaa. 2) Kiihdytä hitaasta täyteen vauhtiin kahdessa askeleessa — pallo ei saa lähteä yli 2 askeleen. 3) Pienet nopeat suunnanvaihdot ilman suuria kaaria. 4) Tarkista: katso eteenpäin. 3 kierrosta.',
        ohje_showcase: null,
        kesto: '15 min', xp: 20,
        yt: 'PKe-qpMbHgg',
        cue: 'Shadowstepin perusta: nämä 4 taitoa ovat pohja, jolle kaikki muu rakennetaan.',
        tarina: 'Moni huippudribbaaja aloitti lähiön kaduilta, palloa joka päivä jalassa. Katupeli opetti katseen noston ja nopeat suunnanvaihdot jo ennen kuin yksikään akatemia ehti mukaan.',
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
        tarina: 'Eräs huippu löydettiin akatemiaan 10-vuotiaana. Hän hioi dribblaustekniikkaansa samassa paikassa kymmenen vuotta, päivä päivältä — eikä kiirehtinyt eteenpäin ennen kuin taito oli valmis.',
        viikkotavoite: '0–15m pallo mukana, alle 3 s',
      },
      vk3: {
        nimi: 'Dribbeli — kaveria vastaan (passiivinen)',
        ohje_leikkija: 'Kaveri seisoo edessä, ei liiku. Ohita hänet vasemmalta tai oikealta! Kiihdytä ohi. 15 kertaa kummastakin suunnasta.',
        ohje_rakentaja: 'Kaveri seisoo passiivisena puolustajana. Tee suunnanmuutos ohi hänestä — käytä lyhyttä liikettä, ei suurta kaarta. Ohituksen jälkeen välitön kiihdytys. 20 toistoa.',
        ohje_showcase: 'Yhdistä dribblaus ja liike: dribblaa lähelle kaveria → vaihda suuntaa → kaveri seuraa passiivisesti. Katso ylös ennen liikettä. 20 min pelimäisesti.',
        kesto: '20 min', xp: 25,
        yt: 'PKe-qpMbHgg',
        cue: 'Hallitse liike ensin yksin, sitten passiivista vastaan, sitten täydessä 1v1:ssä.',
        tarina: 'Teininä eräs pelaaja debytoi aikuisten pääsarjassa ja uskalsi heti kuljettaa kokeneita puolustajia päin. Vuosien hionta näkyi: tekniikka kesti paineen, joten rohkeus oli ansaittua.',
        viikkotavoite: 'Ohita passiivinen puolustaja 15/20 kertaa',
      },
      vk4: {
        nimi: 'Dribbeli-mittaus',
        ohje_leikkija: 'Pujottele 5 kartiota niin nopeasti kuin pystyt — ajanotto! Kirjaa aika. Yritä parantaa 3 kertaa.',
        ohje_rakentaja: 'Ajanotto: pujottelu 5 kartio, 10 m. Tee 5 suoritusta. Laske paras aika. Vertaa: oletko nopeampi kuin lokakuun alussa?',
        ohje_showcase: '4 perustaitoa: mittaa kuinka moni onnistuu täydessä pelissä (pelin jälkeen arvioi). Katso ylös, kiihdytä, suunnanmuutos, rytmi.',
        kesto: '20 min', xp: 30,
        yt: 'PKe-qpMbHgg',
        cue: 'Mittaa kehitystä, älä vain harjoittele — ilman mittausta et tiedä, oletko kehittynyt.',
        tarina: 'Erästä huippudribbaajaa kuvailtiin pelaajaksi joka "nöyryytti puolustajia hämmästyttävillä vedoilla". Se tyyli syntyi katupelistä ja akatemian lukemattomista toistoista — ei yhdessä yössä.',
        viikkotavoite: 'Pujottelu 10 m — paranna lokakuun alun aikaa',
      },
    },

    // ── MARRASKUU (kuukausi 11): 1V1-LIIKKEET (Shadowstep-teema) ────
    ronaldo: {
      teema: '1v1-liikkeet',
      kuvaus_leikkija: 'Opi ohittamaan vastustaja',
      kuvaus_rakentaja: 'Shadowstep-liikesarja — käännös- ja saksiliikkeet',
      kuvaus_showcase: 'Shadowstep — laaja 1v1-repertuaari',

      vk1: {
        nimi: 'U-käännös — opitaan hitaasti',
        ohje_leikkija: 'Jalkapohja pallon päälle, vedä taaksepäin, käänny 180°. Hidas ensin! 15 kertaa oikealla jalalla, 15 vasemmalla. Ei kiire.',
        ohje_rakentaja: 'U-käännös: jalkapohja päälle → vedä taaksepäin → käänny 180° → kiihdytä. Tee 20 kertaa hitaasti ja oikein. Sitten: yliastuminen (saksi pallon yli). 20 kertaa. Ei vastustajaa.',
        ohje_showcase: 'Liikesarja 1–4 hitaasti: U-käännös | yliastuminen | U + yliastuminen yhdistettynä | vetokäännös (jalka pallon yli ja taakse). 10 × kutakin, tekninen laatu ensin.',
        kesto: '20 min', xp: 20,
        yt: 'eoR91TNIWDQ',
        cue: 'Perussääntö: koko sarja täytyy hallita ilman vastustajaa, ennen kuin siirrytään passiivista vastaan.',
        tarina: 'Eräs huippu harjoitteli lapsena yksin seinää vasten, kunnes pimeys pakotti lopettamaan. Kun muut lapset leikkivät, hän toisti samaa liikettä yhä uudelleen.',
        viikkotavoite: 'U-käännös onnistuu 10/10 molemmilla jaloilla',
      },
      vk2: {
        nimi: '1v1-liike — nopeammin',
        ohje_leikkija: 'Nyt nopeammin! U-käännös + heti kiihdytys. Tee liike ja juokse ohi nopeasti. 15 kertaa kummallakin jalalla.',
        ohje_rakentaja: 'Valittu liike täydessä nopeudessa ilman vastustajaa: teeskentely + liike + kiihdytys alle 1 sekunnissa. 25 toistoa. Lisää: saksiliike — vie jalka pallon yli 20 kertaa.',
        ohje_showcase: 'Liikkeet 1–7 täydessä nopeudessa yksin. Mittaa: kuinka nopeasti teet liikkeen + kiihdytys 5 metriin? Tavoite alle 2 s.',
        kesto: '20 min', xp: 20,
        yt: 'eoR91TNIWDQ',
        cue: 'Räjähtävyys: tärkeää ei ole mitä liikettä — vaan kuinka nopeasti kiihdytät sen jälkeen.',
        tarina: 'Eräs nuori pelaaja muutti 12-vuotiaana kauas kotoa akatemiaan ja oli niin koti-ikävissään, että harkitsi lopettamista. Hän purki kaiken harjoitteluun ja jäi aina viimeisenä kentälle.',
        viikkotavoite: 'Liike + 5 m kiihdytys alle 2 sekunnissa',
      },
      vk3: {
        nimi: '1v1 — passiivinen puolustaja',
        ohje_leikkija: 'Kaveri seisoo edessä, ei liiku. Käytä U-käännöstä tai saksea ohittaaksesi hänet! 20 kertaa. Yllätä kaveri.',
        ohje_rakentaja: 'Kaveri passiivisena: tee liike → ohita → kiihdytä. Kaveri voi liikkua hitaasti mutta ei ota palloa. 20 toistoa valitulla liikkeellä + 10 toistoa vapaasti valiten.',
        ohje_showcase: 'Puoli-aktiivinen puolustaja (saa liikkua mutta ei taklata): ohita käyttäen opittuja liikkeitä. 25 toistoa. Mikä liike toimii parhaiten sinulle?',
        kesto: '20 min', xp: 25,
        yt: 'eoR91TNIWDQ',
        cue: 'Taso 2: liikkeen täytyy toimia täydessä nopeudessa, ennen kuin siirrytään täyteen 1v1:een.',
        tarina: 'Eräs teini halusi harjoitella niin kovasti, että hiipi salaa kuntosalille jonka käyttö oli nuorilta kielletty — kunnes valmentajat huomasivat ja lukitsivat oven. Into oli sammumaton.',
        viikkotavoite: 'Ohita passiivinen puolustaja 15/20 kertaa valitulla liikkeellä',
      },
      vk4: {
        nimi: '1v1-mittaus — toimiiko pelissä?',
        ohje_leikkija: 'Pelaa 1v1-peliä kaverin kanssa 10 min. Laske: montako kertaa ohitit? Mitä liikettä käytit parhaiten?',
        ohje_rakentaja: 'Täysi 1v1: 10 min peliä. Laske ohitukset. Arvioi: mikä liike toimi, mikä ei? Harjoittele heikkoa liikettä 10 min lisää.',
        ohje_showcase: 'Täysi 1v1-peli 15 min + itsearvio: opituista liikkeistä mitkä 3 ovat jo omassa repertuaarissa? Mitkä tarvitsevat lisää työtä?',
        kesto: '20 min', xp: 30,
        yt: 'eoR91TNIWDQ',
        cue: 'Pelitesti: toimiiko liike oikeassa pelissä? Jos ei — palaa vk 1:een.',
        tarina: 'Eräs nuori pelaaja esiintyi harjoitusottelussa niin vakuuttavasti — ohitti puolustajan toisensa jälkeen — että vastustajajoukkueen valmentaja ei suostunut lähtemään ilman, että pelaaja saatiin tämän seuraan.',
        viikkotavoite: 'Vähintään 1 onnistunut ohitus per pelitilanne',
      },
    },

    // ── JOULUKUU (kuukausi 12): SYÖTTÄMINEN (Maestro-teema) ─────────
    beckham: {
      teema: 'Syöttäminen ja laukaus',
      kuvaus_leikkija: 'Lähetä pallo tarkasti',
      kuvaus_rakentaja: 'Sisäterä + jalkapöytä — kaikki syöttötavat',
      kuvaus_showcase: 'Maestro — 11 syöttö- ja laukaustekniikkaa',

      vk1: {
        nimi: 'Sisäteräsyöttö — tarkka ja toistettava',
        ohje_leikkija: 'Lähetä pallo seinälle ja yritä osua samaan kohtaan 10 kertaa peräkkäin. Tukijalka pallon viereen — ei taakse! Laske ennätys.',
        ohje_rakentaja: 'Sisäteräsyöttö 20 toistoa: tukijalka pallon viereen | nilkka lukossa | osuma pallon keskikohtaan. Sitten jalkapöytä maassa 20 toistoa: koko jalkapöydän yläpuoli osuu palloon. Mittaa tarkkuus.',
        ohje_showcase: 'Syöttösarja muodot 1–3: sisäterä | jalkapöytä maassa | suora ilmapassi. 15 × kutakin. Mittaa: osumakohta pallossa (pitää olla keskikohta).',
        kesto: '20 min', xp: 20,
        yt: 'yGHMHi9mMOQ',
        cue: 'Maestron sääntö: tukijalka ratkaisee suunnan, jalkapöytä ratkaisee nopeuden.',
        tarina: 'Erään huippusyöttäjän isä ohjasi häntä puistossa myöhään iltoihin asti ja antoi pienen palkinnon jokaisesta osumasta poikkipalkkiin. Poika toisti laukauksia satoja kertoja illassa — tarkkuus syntyi noista toistoista.',
        viikkotavoite: '10 peräkkäistä sisäteräsyöttöä samaan kohtaan',
      },
      vk2: {
        nimi: 'Syöttö — etäisyydet kasvavat',
        ohje_leikkija: 'Syötä 5 metriin, sitten 10 metriin, sitten 15 metriin. Sama liike, pallo seuraa! Kumpi jalka on tarkempi?',
        ohje_rakentaja: 'Syöttöprogressio: 10 m | 15 m | 20 m — sisäterä ja jalkapöytä. Mittaa tarkkuus joka etäisyydellä. Tavoite: 8/10 osuu kohteeseen.',
        ohje_showcase: 'Pitkä syöttö (kaareva/kierteinen, muoto 5) + ulkojalkapassi maassa (muoto 6). 15 toistoa kutakin. Mittaa kaartuma ja tarkkuus.',
        kesto: '20 min', xp: 20,
        yt: 'yGHMHi9mMOQ',
        cue: 'Teknisesti taitavat pelaajat pitävät pallon liikkeessä joka etäisyydellä.',
        tarina: 'Eräs huippusyöttäjä voitti 11-vuotiaana suuren taitokilpailun ja pääsi palkinnoksi ulkomaiselle leirille — siellä hänet huomattiin ja ohjattiin kohti huippuseuraa. Taitokisamenestys avasi oven.',
        viikkotavoite: '20 m sisäteräsyöttö 8/10 osuu kohteeseen',
      },
      vk3: {
        nimi: 'Syöttö kaverin kanssa — liikkuvaan kohteeseen',
        ohje_leikkija: 'Kaveri juoksee — syötä hänelle niin että pallo tulee hänen eteen! Ei perään. 15 kertaa kummallakin jalalla.',
        ohje_rakentaja: 'Kaveri juoksee ristiin — syötä eteen tilaan, ei pelaajalle itselleen. 20 syöttöä. Sitten: lyhyt vaihto (1/2-kombinaatio, muoto 10) — syötä, juokse, saa takaisin.',
        ohje_showcase: 'Läpisyöttö ulkojalalla (muoto 11) + keskitys maaliin päin (muoto 9). 10 × kutakin. Tarkkuus: osuu käytävään?',
        kesto: '20 min', xp: 25,
        yt: 'yGHMHi9mMOQ',
        cue: 'Syöttö on kommunikaatiota — pallo kertoo joukkuekaverille, minne mennä.',
        tarina: 'Teininä eräs pelaaja liittyi huippuseuraan ja harjoitteli lahjakkaan nuorisoryhmän kanssa, josta moni nousi myöhemmin maailman huipulle. He voittivat yhdessä nuorten arvokisan — yhdessä kasvaminen nosti kaikkia.',
        viikkotavoite: 'Syöttö liikkuvaan kohteeseen 12/20 oikein ajoitettu',
      },
      vk4: {
        nimi: 'Syöttö-mittaus',
        ohje_leikkija: 'Laske: montako kertaa lähetät pallon tarkasti 10 metriin? Tee 20 syöttöä ja laske pisteet.',
        ohje_rakentaja: 'Syöttöhaaste: 20 syöttöä, eri etäisyydet (10/15/20 m). Laske pisteet: tarkka osuma = 1 p. Vertaa: oletko parempi kuin joulukuun alussa?',
        ohje_showcase: 'Syöttösarja 11 muotoa — montako hallitset jo? Käy läpi ja arvioi itsesi. Harjoittele 2 heikkointa 10 min.',
        kesto: '20 min', xp: 30,
        yt: 'yGHMHi9mMOQ',
        cue: 'Viidennen viikon periaate — harjoittele sitä, missä tulos jäi heikoimmaksi.',
        tarina: 'Erään huippusyöttäjän valmentaja neuvoi katsomaan, miten parhaat lyövät pallon: sulava liike molemmin jaloin. Hän harjoitteli laukaisua molemmilla jaloilla niin kauan, että oikea ja vasen olivat lopulta yhtä tarkat.',
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
        cue: '"Daily touches" — joka päivä pallo, myös lepopäivinä.',
        tarina: 'Maailman parhaissa akatemioissa jokainen pelaaja koskettaa palloa joka päivä — myös lepopäivinä. Sukupolvi toisensa jälkeen huiput ovat aloittaneet samasta säännöstä: pallo jalkaan joka ikinen päivä.',
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
        ohje_leikkija: 'Hypi narulla tai kuvittele naru 2x15 sekuntia — pysy varpailla! Sitten seiso portaan reunalla: nouse varpaille ylös ja laske kantapäät hitaasti alas. 8 kertaa. Tämä pitää nilkat vahvoina.',
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
        ohje_leikkija: 'Polvistu maahan ja työnnä lantiota eteenpäin — tunnet venytyksen reiden etuosassa. 30 sekuntia per puoli. Sitten kävele isoin askelin 10m: astu pitkälle ja laske polvi lähelle maata. 2 kertaa.',
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
        ohje_leikkija: 'Kädy kyljelleen, polvet koukussa. Avaa päällimmäinen polvi ylös kuin simpukka — lantio paikallaan! 10 kertaa per puoli. Sitten sivulankku: nojaa kyynärpäähän ja nosta lantio ilmaan 15 sekuntia per puoli.',
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
        ohje_leikkija: 'Syötä palloa seinään vuorojaloilla 2x20 kertaa — yhdellä kosketuksella takaisin. Sitten ponnauttele palloa jaloilla 1 minuutti ilman taukoa. Kokeile molempia jalkoja!',
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
        ohje_leikkija: 'Kädy selälleen. Hengitä sisään niin että vatsa ja kyljet pullistuvat — kuin täytät ilmapallon! 5 kertaa. Sitten: nosta käsivarret ja jalat ylös, ojenna vastakkainen käsi ja jalka hitaasti. 8 kertaa per puoli. Selkä pysyy lattiassa!',
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
        ohje_leikkija: 'Syötä palloa seinään 2 minuuttia. ENNEN kuin otat pallon vastaan, katso nopeasti taakse ja nimeä ääneen jokin minkä näeit. Sitten syötä. Toista — yritä katsoa joka kerta!',
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
            cue: 'Ensimmäinen askel ratkaisee — reaktio ei ole synnynnäinen, se harjoitellaan.',
            phv: '3 lähtöä per sarja 70% teholla. Takaketju kasvaa — ei ylikuormiteta.',
            phv_xp: 20,
          },
          {
            stage: [3, 4],
            nimi: 'Reaktiolähtö + pallonhallinta',
            ohje_leikkija: 'Aseta pallo 5m eteesi. Kaveri huutaa "NYT!" ja juokset palloon täysillä, otat haltuun ja kuljetat 15m. 5 toistoa. Vaihda huutajaa! Kuka on nopein?',
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
            ohje_leikkija: 'Pallo edessä, kaveri huutaa — juokse palloon, kuljeta ja laukaise maaliin! 5 toistoa. Tähtää nurkkiin!', ohje_rakentaja: null,
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
            ohje_leikkija: 'Loiki 5 pitkällä loikalla eteenpäin — kuka pääsee pisimmälle? 3 kertaa. Sitten: polvistu ja kaadu hitaasti eteenpäin käsi edessä, palauta itsesi käsillä työntäen. 5 kertaa. Tuntuu takareidessä!',
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
            ohje_leikkija: 'Loiki 5 pitkällä loikalla — mittaa matka! 3 kertaa. Sitten polvistu ja kaadu hitaasti eteenpäin ilman apua, palauta käsillä. 5 kertaa.', ohje_rakentaja: null,
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
            ohje_leikkija: 'Tee T-muotoinen rata (10m eteen, sitten 5m oikealle ja vasemmalle). Kuljeta pallo T:n läpi 4 kertaa — pallo pysyy lähellä jalkaa! Ota aika ja yritä parantaa.',
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
            ohje_leikkija: 'Kuljeta pallo T-radan läpi 3 kertaa täysillä! Sitten pelaa 1 vastaan 1 pienellä alueella — yritä ohittaa kaveri harhautuksella. 2 minuuttia kerrallaan.', ohje_rakentaja: null,
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
            ohje_leikkija: 'Hyppää sivulle yhdellä jalalla ja laskeudu hallitusti — pidä 2 sekuntia paikallaan! Polvi osoittaa suoraan eteenpäin, ei sisäänpäin. 5 kertaa per jalka, 3 kierrosta.',
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
            ohje_leikkija: 'Loiki sivulle ja heti takaisin — nopeasti kuin pingispallo! 8 loikkaa per suunta, 3 kierrosta. Pidä tasapaino!', ohje_rakentaja: null,
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
            ohje_leikkija: 'Lankku: nojaa kyynärpäihisi ja pidä keho suorana 30 sekuntia. Sitten sivulankku 20 sekuntia per puoli. Bird dog: konttausasennossa ojenna vastakkainen käsi ja jalka 8 kertaa per puoli. Lopuksi seiso yhdellä jalalla silmät kiinni 20 sekuntia!',
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
            ohje_leikkija: 'Karhukävely: kävele nelinkontin 10m eteenpäin — lantio ei heiluu! 2 kertaa. Sitten yhden jalan kyykky seinää vasten: laske hitaasti alas ja nouse. 5 kertaa per jalka.', ohje_rakentaja: null,
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
            ohje_leikkija: 'Seiso yhdellä jalalla ja sulje silmät — kokeile kestää 30 sekuntia per jalka! 3 kertaa. Sitten yhden jalan kyykky seinää vasten hitaasti 5 kertaa per jalka.',
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
            ohje_leikkija: 'Seiso yhdellä jalalla tyynyn päällä 30 sekuntia per jalka. Sitten karhukävely 10m (nelinkontin, lantio paikallaan). Lopuksi yhden jalan kyykky seinää vasten 5 kertaa per jalka.', ohje_rakentaja: null,
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
            cue: 'Katse ylös ennen kosketusta — tämä yksi rutiini erottaa hyvän pelaajan erinomaisesta.',
            phv: 'Kognitiiviset harjoitteet PARHAITA PHV:ssä.',
            phv_xp: 30,
          },
          {
            stage: [3, 4],
            nimi: 'Päätöksenteko numeroilla',
            ohje_leikkija: 'Seiso 10m seinästä. Kaveri näyttää sormilla numeron (1-4): 1=vasen, 2=oikea, 3=ylös, 4=alas. Syötä heti sinne minne numero kertoo! 2 minuuttia, sitten vaihto. Kuka reagoi nopeimmin?',
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
            ohje_leikkija: 'Seinäsyöttö — mutta välillä kaveri heittää toisen pallon eri suuntaan! Reagoi heti uuteen palloon. 3 minuuttia kerrallaan, 3 kierrosta. Montako oikeaa reaktiota sait?', ohje_rakentaja: null,
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
            ohje_leikkija: 'Katso 5 minuuttia lempijalkapalloilijan pelivideoita — kiinnitä huomiota mihin hän katsoo ennen kuin saa pallon. Kirjoita 2 havaintoa ylös. Sitten seinäsyöttö 2 minuuttia ja katso aina ylös ennen vastaanottoa!',
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
            ohje_leikkija: 'Syötä palloa seinään yhdellä kosketuksella ja laske samalla ääneen parilliset luvut (2, 4, 6, 8...). Jos menee sekaisin — ei haittaa, jatka! 3 minuuttia, 3 kierrosta.', ohje_rakentaja: null,
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

    // ── SFL — Lähtöketju S-harjoitteet ──────────────────────────────
    // Kytkentä: thomas_testi_p=1, askelkyykky_p=1, sprintti_5m tai sprintti_10m hidas
    // Anatominen perusta: lonkankoukistajat + quadriceps → kiihdytys + 1. askel
    sfl: [
      {
        vk: 'parillinen',
        stage_tasot: [
          {
            stage: [1, 2],
            nimi: 'Hip flexor venytys + askelkyykky-kävely',
            ohje_leikkija: 'Mene polvi maahan, toinen jalka eteen. Kallista lantiota eteen kunnes tunnet venytyksen edessä. Pidä 30 sekuntia! Sitten iso askelkävely 10 askelta eteenpäin.',
            ohje_rakentaja: 'Hip flexor 90/90: polvi maahan, etupolvi 90°. Kallista lantiota eteen 2×30s per puoli. Sitten askelkyykky-kävely 2×10m — iso askel, polvi lähelle lattiaa.',
            ohje_showcase: null,
            kesto: '15 min', xp: 25,
            yt: 'UcGAOOBMYMU',
            cue: 'Lonkankoukistaja on pelaaajan jarru. Kireä lonkankoukistaja = hidas lähtö, pienentynyt askelpituus.',
            phv: 'Normaali — venytykset aina turvallisia. Kyykkyjen laajuutta voidaan rajoittaa.',
            phv_xp: 20,
          },
          {
            stage: [3, 4],
            nimi: 'Hip flexor 90/90 + askelkyykky-kiihdytys',
            ohje_leikkija: 'Polvistu ja työnnä lantiota eteenpäin 30 sekuntia per puoli — tunnet venytyksen reidessä. Sitten kävele isoilla askeleilla 10m (polvi lähelle maata). Lopuksi juokse 4x15m kiihdytys — lähde räjähtävästi!',
            ohje_rakentaja: 'Hip flexor 90/90 2×45s per puoli. Sitten: askelkyykky-kävely 2×10m, ja lopuksi 4×15m kiihdytys — ensimmäinen askel lonkasta, ei polvesta. Laske: kuinka nopeasti olet täydessä vauhdissa?',
            ohje_showcase: 'Hip flexor 90/90 2×45s. Askelkyykky 2×10m. SFL-kiihdytys: 4×15m — arvioi ensimmäisen 5m reaktiivisuus. Lonkka ohjaa, polvi seuraa.',
            kesto: '15 min', xp: 30,
            yt: 'UcGAOOBMYMU',
            cue: 'Huippuakatemian mittaus: ensimmäinen 5 m ennustaa 30 m:tä paremmin pelitilanteiden nopeutta.',
            phv: '2×30s venytys + 3×10m askelkävely. Jätä kiihdytykset pois.',
            phv_xp: 20,
          },
          {
            stage: [5],
            nimi: 'Thomas-venytys + pelispesifi kiihdytyssarjat',
            ohje_leikkija: 'Venytä reiden etuosaa 30 sekuntia per puoli (polvistu, työnnä lantiota). Sitten 4 kertaa: kaveri heittää pallon ja juokset sen kiinni täysillä 10m. Kuka saa pallon ensin?', ohje_rakentaja: null,
            ohje_showcase: 'Thomas-venytys 2×45s per puoli + 90/90 2×45s. Sitten pelispesifi: 6×10m kiihdytys reaktioärsykkeestä (pallo, käsimerki). Mittaa: aikaa ensimmäiseen 5m:iin paranee kauden aikana?',
            kesto: '20 min', xp: 35,
            yt: 'UcGAOOBMYMU',
            cue: 'Stage 5: lonkankoukistajan liikkuvuus + räjähtävä reaktiviteetti pelissä. Molemmat samassa sessiossa.',
            phv: '3×30s venytys + 3 reaktiivista kiihdytystä 70% teholla.',
            phv_xp: 25,
          },
        ],
      },
      {
        vk: 'pariton',
        stage_tasot: [
          {
            stage: [1, 2],
            nimi: 'Pistoolikyykky progressio — yksijalkainen',
            ohje_leikkija: 'Seiso yhdellä jalalla, toinen suorana edessä. Kyykky alas niin pitkälle kuin pystyt — pidä selkä suorana. Nouse takaisin! 8 kertaa per jalka, 2 sarjaa.',
            ohje_rakentaja: 'Pistoolikyykky kehitys: aloita tuettuna (tuoli tai seinä) 2×8 per jalka. Laske: kuinka syvälle pääset ilman kantapään nousua?',
            ohje_showcase: null,
            kesto: '15 min', xp: 25,
            yt: 'DdWA1c0VsMg',
            cue: 'Pistoolikyykky testaa yksijalkaisesta voimaa ja tasapainoa. Pelissä jokainen askel on yksijalkainen.',
            phv: '2×6 per jalka tuettuna. Syvyyttä rajoitetaan — polven etuosa herkkä.',
            phv_xp: 20,
          },
          {
            stage: [3, 4, 5],
            nimi: 'Pistoolikyykky + Nordic curl yhdistelmä',
            ohje_leikkija: 'Yhden jalan kyykky (seinää tukena) 8 kertaa per jalka, 3 kierrosta. Sitten polvistu ja kaadu hitaasti eteenpäin — käsesi ottavat vastaan. 5 kertaa. Tuntuu takareisien töistä!',
            ohje_rakentaja: 'Pistoolikyykky 3×8 per jalka (ilman tukea tai kevyt tuki). Sitten Nordic curl avustettu 3×5: kumppanikäsin kantapäistä, laske hitaasti eteen, palaa käsillä.',
            ohje_showcase: 'Pistoolikyykky 3×8 (täysi liike). Nordic curl eksentrinen 3×5: laske hallitusti, palaa käsillä. SFL-yhdistelmä: etuketjun voima + takareiden suoja = lähtö + jarruttaminen.',
            kesto: '20 min', xp: 30,
            yt: 'DdWA1c0VsMg',
            cue: 'Liikanen 2025: pistoolikyykky + Nordic curl yhdistelmä vähensi hamstring-vammoja 51%. Tämä on se tärkein harjoite.',
            phv: 'Pistoolikyykky 2×6 tuettuna. Nordic curl pois — jänne-luuliitos herkkä.',
            phv_xp: 20,
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
  // ISO 8601: viikko alkaa maanantaista, vk 1 = se viikko jossa vuoden ensimmäinen torstai
  const d = new Date();
  d.setHours(0, 0, 0, 0);
  d.setDate(d.getDate() + 4 - (d.getDay() || 7));
  const yearStart = new Date(d.getFullYear(), 0, 1);
  return Math.ceil((((d - yearStart) / 86400000) + 1) / 7);
}

// Laskee kuukauden sisäisen viikonumeron (1–4) ja mesosyklin
// Käytetään T-harjoitteen Fulham-mallin toteuttamiseen
function _laskeMesosykli() {
  const nyt   = new Date();
  const kk    = nyt.getMonth() + 1; // 1–12

  // Mesosyklikartta — syyskuu→joulukuu = kierros 1, tammi→elokuu = kierros 2
  // Kierros 2 käyttää samoja mesosyklirakenteita mutta PANKKI.T[mesosykli+'_2']
  // jos se löytyy, muuten saman mesosyklin vk4 (vaikeutettu versio)
  const mesosykliKartta = {
    9: 'kaka', 10: 'affelay', 11: 'ronaldo', 12: 'beckham',
    1: 'kaka',  2: 'affelay',  3: 'ronaldo',  4: 'beckham',
    5: 'kaka',  6: 'affelay',  7: 'ronaldo',  8: 'beckham',
  };
  const mesosykli  = mesosykliKartta[kk] || 'perus';
  const kierros    = kk >= 9 ? 1 : 2; // 1 = syksy, 2 = kevät/kesä

  // Viikonumero kuukauden sisällä (1–5, rajoitetaan 4:ään)
  // vk 5 = Fulham "REPEAT INDIVIDUAL NEED" — toistaa heikoiten menneen viikon
  const pvKuussa    = nyt.getDate();
  const jaksoViikko = Math.ceil(pvKuussa / 7); // 1–5

  return { mesosykli, jaksoViikko, kierros, kk };
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
  // sKetju lasketaan _laskeSKetju()-funktiolla testidatan perusteella (alla)
  const tehtavat  = [];

  // ── 1. T-HARJOITE — Fulham/Noordster kuukausimalli ────────────
  // Ikäkohtainen pankki
  const tBank = ika <= 12 ? PANKKI.T.leikkija
              : ika <= 15 ? PANKKI.T.rakentaja
              : PANKKI.T.showcase;

  // Laske mesosykli (kaka/affelay/ronaldo/beckham) ja jaksoviikko (1–5)
  const _meso      = _laskeMesosykli();
  const mesosykli  = _meso.mesosykli;   // esim. 'kaka'
  const jaksoViikko = _meso.jaksoViikko; // 1–4 normaali, 5 = Fulham "repeat"

  // Hae mesosyklin harjoiterakenne
  const tSeries = PANKKI.T[mesosykli] || PANKKI.T.perus;

  // Viikko 5 = "REPEAT INDIVIDUAL NEED" (Fulham-malli)
  // Toistetaan heikoiten mennyt viikko kirjaushistorian perusteella
  // Jos historiaa ei ole, käytetään vk1 (turvallinen default)
  let tViikkoAvain;
  if (jaksoViikko >= 5) {
    // Hae Firestoresta heikoin viikko — jos ei saatavilla, käytä vk1
    const _heikoiViikko = (typeof pelaaja._t_heikoin_viikko !== 'undefined')
      ? Math.max(1, Math.min(4, pelaaja._t_heikoin_viikko))
      : 1;
    tViikkoAvain = 'vk' + _heikoiViikko;
  } else {
    tViikkoAvain = 'vk' + Math.max(1, Math.min(4, jaksoViikko));
  }

  // Hae harjoite — fallback-ketju takaa aina jonkin harjoitteen
  let tHarj = (tSeries && tSeries[tViikkoAvain])
    || (tSeries && tSeries.vk1)
    || (PANKKI.T.perus && PANKKI.T.perus.vk1)
    || null;

  if (!tHarj) {
    // Viimeinen fallback: rakentaja vk1
    const fb = PANKKI.T.rakentaja || PANKKI.T.perus;
    tHarj = fb && (fb.vk1 || fb.perus);
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
      viikkotavoite: tHarj.viikkotavoite || null,
      mesosykli,          // esim. 'kaka' — pelaaja-app voi näyttää teeman
      jaksoViikko,        // 1–5 — näytetään "Viikko X / 4"
      kierros: _meso.kierros,
      isRepeatViikko: jaksoViikko >= 5,
      stage, ityyppi,
    });
  }

  // ── 2. D-HARJOITE — yhtenäinen PANKKI.D-rakenne + ADAR-override ─
  // ADAR-pisteet < 40 → kognitiivinen D-harjoite (diag/pig) riippumatta
  // fyysisestä ketjusta. Tämä on ainoa poikkeus heikoin-ketju-valintaan.
  // Stage ja PHV ovat aina turvakerroksena — ADAR ei koskaan ohita niitä.
  const dKetju = (
    pelaaja.adar_pisteet !== undefined &&
    pelaaja.adar_pisteet !== null &&
    pelaaja.adar_pisteet < 40
  ) ? 'diag' : heikoin;

  const dVaihtoehto = _haeD(dKetju, stage);

  function _haeD(ketju, stg) {
    // Yhtenäinen haku PANKKI.D:stä (stage-pohjainen)
    // Fallback-ketju: jos ketjua ei löydy, käytetään lähintä
    const pool = PANKKI.D[ketju] || PANKKI.D['dfl'] || [];
    return pool.find(h => h.stage && h.stage.some(s => s <= stg + 1 && s >= stg - 1))
        || pool[0]
        || null;
  }

  if (dVaihtoehto) {
    const dOhje = _ohje(dVaihtoehto, ityyppi);
    const dPhv  = phv === 'PH' && dVaihtoehto.phv
      ? dOhje + '\n\n⚠️ ' + dVaihtoehto.phv : dOhje;
    const dOnAdar = dKetju !== heikoin; // ADAR-override aktiivinen
    tehtavat.push({
      id: 'd_aktivointi', tyyppi: 'D',
      label: '🔄 Päivittäinen',
      label_cue: '5–10 min · Myös lepopäivät',
      nimi: dVaihtoehto.nimi,
      ohje: dPhv,
      kesto: dVaihtoehto.kesto, xp: dVaihtoehto.xp,
      cue: dVaihtoehto.cue,
      yt: dVaihtoehto.yt,
      ketju: dKetju,
      ketjuNimi: KETJUT[dKetju]?.nimi,
      adar_override: dOnAdar,  // pelaaja-app voi näyttää selityksen
      stage, ityyppi,
    });
  }

  // ── 3. S-HARJOITE (U13+) — testidataohjattu ketjuvalinta ────────
  // Päätöspuu:
  //   1. testit.loikka_5m alle normin → SBL (räjähtävyys/nopeus)
  //   2. testit.t_testi_s alle normin → LL (ketteryys/suunnanmuutos)
  //   3. testit.sprintti_30m alle normin → SBL (kiihdytys)
  //   4. Ei testidataa → FLEI-heikoin (nykytila, säilyy)
  // Stage ja PHV säilyvät aina turvakerroksena.
  const sKetju = _laskeSKetju(pelaaja, prof, vkParit);

  function _laskeSKetju(p, ketjuProf, vkP) {
    // ADAR-override S:ään: matala ADAR → diag S-harjoite
    if (p.adar_pisteet !== undefined && p.adar_pisteet !== null && p.adar_pisteet < 30) {
      return PANKKI.S['diag'] ? 'diag' : ketjuProf.heikoin;
    }

    // ── KERROS 3: Harjoitettavuuskartoitus → liikeketjukytkentä ──
    // Lähde: Jalkapallon harjoitettavuuskartoitus testimanuaali 2026
    // Harjoitettavuuskartoitus kertoo kuinka valmis keho on harjoittelemaan.
    // Everton Stage (harjoitettavuus_pisteet) = sama tieto KOKO ohjelman tasolla.
    // Yksittäiset testit = tarkennus: MIKÄ ketju tarvitsee kohdennetun S-harjoitteen.
    //
    // Pisteytys: 1=punainen (heikko), 2=keltainen, 3=vihreä
    // Alle 2 (=punainen) = prioriteetti → ohjaa S-harjoitevalintaan
    // Liikeketju-kytkentä:
    //   SBL = hyvää huomenta, lantionnosto, SLR, lonkan ojennus, vauhditon ph, 5-loikka
    //   SFL = askelkyykky, thomas-testi (lonkankoukistajat)
    //   LL  = luistelijan kyykky, sivulankku
    //   DFL = valakyykky, etunoja, lankku, naruhypyt, jalkojennosto, leuanveto
    if (p.testit) {
      const t = p.testit;
      const harjHeikoudet = [];

      // ── Laatu-testit (pisteytys 1–3): punainen=1 → heikko ──────
      // DFL — hallintaketju
      if (t.valakyykky_p      === 1) harjHeikoudet.push({ ketju:'dfl', paino:3, testi:'valakyykky' });
      if (t.etunoja_arvio_p   === 1) harjHeikoudet.push({ ketju:'dfl', paino:2, testi:'etunoja_arvio' });
      if (t.lankku_p          !== undefined && t.lankku_p < 2) harjHeikoudet.push({ ketju:'dfl', paino:3, testi:'lankku' });
      // SBL — takaketju
      if (t.hyvaa_huomenta_p  === 1) harjHeikoudet.push({ ketju:'sbl', paino:4, testi:'hyvaa_huomenta' }); // takaketjun tärkein liike
      if (t.lantionnosto_p    === 1) harjHeikoudet.push({ ketju:'sbl', paino:3, testi:'lantionnosto' });
      if (t.slr_p             === 1) harjHeikoudet.push({ ketju:'sbl', paino:3, testi:'slr' }); // straight leg raise
      if (t.lonkan_ojennus_p  === 1) harjHeikoudet.push({ ketju:'sbl', paino:2, testi:'lonkan_ojennus' });
      // SFL — lähtöketju
      if (t.askelkyykky_p     === 1) harjHeikoudet.push({ ketju:'sfl', paino:3, testi:'askelkyykky' });
      if (t.thomas_testi_p    === 1) harjHeikoudet.push({ ketju:'sfl', paino:4, testi:'thomas_testi' }); // lonkankoukistajat = tärkein SFL
      // LL — sivuketju
      if (t.luistelijakyykky_p === 1) harjHeikoudet.push({ ketju:'ll',  paino:3, testi:'luistelijakyykky' });
      if (t.sivulankku_p      !== undefined && t.sivulankku_p < 2) harjHeikoudet.push({ ketju:'ll', paino:3, testi:'sivulankku' });

      // ── Mitattavat harjoitettavuustestit ───────────────────────
      const ika = p.ika || 13;
      // Naruhypyt 15s: <26=1 → DFL/SBL
      if (t.naruhypyt_tst !== undefined && t.naruhypyt_tst < 26)
        harjHeikoudet.push({ ketju:'dfl', paino:2, testi:'naruhypyt' });
      // Vauhditon pituushyppy: T10-12 <1.75m, P10-12 <1.80m, T13-15 <1.85m jne.
      const phNormi = ika<=12 ? 1.75 : ika<=15 ? 1.90 : ika<=17 ? 2.20 : 2.45;
      if (t.vauhditon_ph_m !== undefined && t.vauhditon_ph_m < phNormi)
        harjHeikoudet.push({ ketju:'sbl', paino:3, testi:'vauhditon_ph' });
      // Leuanveto: U15-19 <8=heikko → DFL
      if (t.leuanveto_tst !== undefined && t.leuanveto_tst < 8)
        harjHeikoudet.push({ ketju:'dfl', paino:2, testi:'leuanveto' });
      // Jalkojennosto riipunnasta: <12=heikko → DFL
      if (t.jalkojennosto_tst !== undefined && t.jalkojennosto_tst < 12)
        harjHeikoudet.push({ ketju:'dfl', paino:2, testi:'jalkojennosto' });
      // YJ päkiänousu: <15=heikko → SBL (pohje)
      if (t.yj_pakianousu_tst !== undefined && t.yj_pakianousu_tst < 15)
        harjHeikoudet.push({ ketju:'sbl', paino:2, testi:'yj_pakianousu' });
      // 5RM voimatestit: suhteellinen voima alle normin → SBL/SFL
      if (t.takakyykky_5rm !== undefined && p.paino_kg) {
        const suhteellinen = t.takakyykky_5rm / p.paino_kg;
        if (suhteellinen < 1.2) harjHeikoudet.push({ ketju:'sbl', paino:3, testi:'takakyykky_5rm' });
      }
      if (t.maastaveto_5rm !== undefined && p.paino_kg) {
        const suhteellinen = t.maastaveto_5rm / p.paino_kg;
        if (suhteellinen < 1.5) harjHeikoudet.push({ ketju:'sbl', paino:3, testi:'maastaveto_5rm' });
      }

      if (harjHeikoudet.length > 0) {
        // Korkein paino voittaa — thomas-testi ja hyvää huomenta ovat prioriteetti
        harjHeikoudet.sort((a, b) => b.paino - a.paino);
        const ketju = harjHeikoudet[0].ketju;
        if (PANKKI.S[ketju]) return ketju;
      }
    }

    // ── KERROS 2: H-H ominaisuustestit + Tekniikkakilpailut ──────
    // Normit (Liikanen & Törmä 2025 + HuHe-testimanuaali 2024)
    // Jokainen testi kytkeytyy liikeketjuun anatomisen logiikan mukaan:
    //   SBL = takaketju:  nopeus, elastisuus, hyppyvoima
    //   SFL = lähtöketju: kiihdytys, 1. askel, etuketju
    //   LL  = sivuketju:  ketteryys, suunnanmuutos
    //   DIAG = diagonaali: pallollinen tekniikka, syöttö, SM-pallo
    //   DFL = hallinta:   kestävyys, aerobinen kapasiteetti
    if (p.testit) {
      const t   = p.testit;
      const ika = p.ika || 13;

      // Iänmukaiset normit (alarajat/ylärajat)
      const normit = {
        // ── KERROS 1: Tekniikkakilpailut (U8–U13) ──────────────────
        // Kaikki DIAG-ketjuun (pallolliset taidot)
        // Isompi = parempi → alle normin = heikko
        ponnauttelu_s:    ika<=10?16:ika<=12?20:25,          // ponnauttelu toistot/30s
        syotto_penkki_s:  ika<=10?7.5:ika<=12?6.5:5.8,      // syöttöpenkki aika (s) — alle=heikko
        kuljetus_laukaus_s:ika<=10?9.5:ika<=12?8.5:7.5,     // kuljetus+laukaus aika (s) — yli=heikko
        pituuspotku_m:    ika<=10?15:ika<=12?22:28,          // pituuspotku (m) — alle=heikko → SBL
        // ── KERROS 2: H-H ominaisuustestit ─────────────────────────
        // SBL — takaketju
        cmj_cm:        ika <= 12 ? 20 : ika <= 14 ? 24 : ika <= 16 ? 28 : 32,
        sjhyppy_cm:    ika <= 12 ? 16 : ika <= 14 ? 20 : ika <= 16 ? 24 : 28,
        loikka_5m:     ika <= 12 ? 6.5: ika <= 14 ? 7.5: ika <= 16 ? 8.5: 9.5,
        sprintti_30m:  ika <= 12 ? 5.5: ika <= 14 ? 4.9: ika <= 16 ? 4.5: 4.2,
        // SFL — lähtöketju
        sprintti_5m:   ika <= 12 ? 1.25:ika <= 14 ? 1.15:ika <= 16 ? 1.05:1.0,
        sprintti_10m:  ika <= 12 ? 2.1: ika <= 14 ? 1.95:ika <= 16 ? 1.85:1.75,
        // LL — sivuketju
        sm_juoksu_s:   ika <= 12 ? 7.8: ika <= 14 ? 7.2: ika <= 16 ? 6.8: 6.4,
        kasirata_s:    ika <= 12 ? 16.5:ika <= 14 ? 15.5:ika <= 16 ? 14.8:14.2,
        t_testi_s:     ika <= 12 ? 12.5:ika <= 14 ? 11.5:ika <= 16 ? 10.8:10.2,
        // DIAG — diagonaaliketju
        sm_pallo_s:    ika <= 12 ? 9.5: ika <= 14 ? 8.8: ika <= 16 ? 8.2: 7.8,
        pujottelu_s:   ika <= 12 ? 9.8: ika <= 14 ? 9.0: ika <= 16 ? 8.4: 8.0,
        syotto_s:      ika <= 12 ? 8.5: ika <= 14 ? 7.8: ika <= 16 ? 7.2: 6.8,
        // DFL — hallintaketju
        mas_ms:        ika <= 12 ? 2.8: ika <= 14 ? 3.0: ika <= 16 ? 3.2: 3.4,
      };

      // Testit ja niiden ketjukytkentä
      // ero = positiivinen luku = heikkous (normalisoidaan vertailukelpoiseksi)
      const heikoudet = [];

      // ── KERROS 1: Tekniikkakilpailut → DIAG / SBL ──────────────
      // Isompi luku = parempi → alle normin = heikko
      if (t.ponnauttelu_s    !== undefined && t.ponnauttelu_s    < normit.ponnauttelu_s)
        heikoudet.push({ ketju:'diag', ero: normit.ponnauttelu_s    - t.ponnauttelu_s,    testi:'ponnauttelu_s' });
      if (t.syotto_penkki_s  !== undefined && t.syotto_penkki_s  < normit.syotto_penkki_s)
        heikoudet.push({ ketju:'diag', ero: normit.syotto_penkki_s  - t.syotto_penkki_s,  testi:'syotto_penkki_s' });
      if (t.pituuspotku_m    !== undefined && t.pituuspotku_m    < normit.pituuspotku_m)
        heikoudet.push({ ketju:'sbl',  ero: normit.pituuspotku_m    - t.pituuspotku_m,    testi:'pituuspotku_m' });
      // Kuljetus+laukaus: isompi aika = heikompi suoritus
      if (t.kuljetus_laukaus_s !== undefined && t.kuljetus_laukaus_s > normit.kuljetus_laukaus_s)
        heikoudet.push({ ketju:'diag', ero: t.kuljetus_laukaus_s - normit.kuljetus_laukaus_s, testi:'kuljetus_laukaus_s' });

      // ── KERROS 2: SBL-testit (isompi = parempi → alle normin = heikko) ──
      if (t.cmj_cm      !== undefined && t.cmj_cm      < normit.cmj_cm)
        heikoudet.push({ ketju:'sbl', ero: normit.cmj_cm      - t.cmj_cm,      testi:'cmj_cm' });
      if (t.sjhyppy_cm  !== undefined && t.sjhyppy_cm  < normit.sjhyppy_cm)
        heikoudet.push({ ketju:'sbl', ero: normit.sjhyppy_cm  - t.sjhyppy_cm,  testi:'sjhyppy_cm' });
      if (t.loikka_5m   !== undefined && t.loikka_5m   < normit.loikka_5m)
        heikoudet.push({ ketju:'sbl', ero: normit.loikka_5m   - t.loikka_5m,   testi:'loikka_5m' });

      // SBL-testit (pienempi tulos = parempi → yli normin = heikko)
      if (t.sprintti_30m !== undefined && t.sprintti_30m > normit.sprintti_30m)
        heikoudet.push({ ketju:'sbl', ero: t.sprintti_30m - normit.sprintti_30m, testi:'sprintti_30m' });

      // SFL-testit
      if (t.sprintti_5m  !== undefined && t.sprintti_5m  > normit.sprintti_5m)
        heikoudet.push({ ketju:'sfl', ero: t.sprintti_5m  - normit.sprintti_5m,  testi:'sprintti_5m' });
      if (t.sprintti_10m !== undefined && t.sprintti_10m > normit.sprintti_10m)
        heikoudet.push({ ketju:'sfl', ero: t.sprintti_10m - normit.sprintti_10m, testi:'sprintti_10m' });

      // LL-testit
      if (t.sm_juoksu_s  !== undefined && t.sm_juoksu_s  > normit.sm_juoksu_s)
        heikoudet.push({ ketju:'ll',  ero: t.sm_juoksu_s  - normit.sm_juoksu_s,  testi:'sm_juoksu_s' });
      if (t.kasirata_s   !== undefined && t.kasirata_s   > normit.kasirata_s)
        heikoudet.push({ ketju:'ll',  ero: t.kasirata_s   - normit.kasirata_s,   testi:'kasirata_s' });
      if (t.t_testi_s    !== undefined && t.t_testi_s    > normit.t_testi_s)
        heikoudet.push({ ketju:'ll',  ero: t.t_testi_s    - normit.t_testi_s,    testi:'t_testi_s' });

      // DIAG-testit
      if (t.sm_pallo_s   !== undefined && t.sm_pallo_s   > normit.sm_pallo_s)
        heikoudet.push({ ketju:'diag',ero: t.sm_pallo_s   - normit.sm_pallo_s,   testi:'sm_pallo_s' });
      if (t.pujottelu_s  !== undefined && t.pujottelu_s  > normit.pujottelu_s)
        heikoudet.push({ ketju:'diag',ero: t.pujottelu_s  - normit.pujottelu_s,  testi:'pujottelu_s' });
      if (t.syotto_s     !== undefined && t.syotto_s     > normit.syotto_s)
        heikoudet.push({ ketju:'diag',ero: t.syotto_s     - normit.syotto_s,     testi:'syotto_s' });

      // DFL-testit (MAS: isompi = parempi → alle normin = heikko)
      if (t.mas_ms       !== undefined && t.mas_ms       < normit.mas_ms)
        heikoudet.push({ ketju:'dfl', ero: normit.mas_ms - t.mas_ms,             testi:'mas_ms' });

      if (heikoudet.length > 0) {
        // Eniten normista poikkeava testi voittaa
        // Normalisoidaan ero suhteessa normiarvoon jotta eri yksiköt ovat vertailukelpoisia
        heikoudet.forEach(h => {
          const normi = normit[h.testi];
          h.ero_norm = normi ? Math.abs(h.ero / normi) : h.ero;
        });
        heikoudet.sort((a, b) => b.ero_norm - a.ero_norm);
        const ketju = heikoudet[0].ketju;
        if (PANKKI.S[ketju]) return ketju;
      }
    }

    // Fallback: FLEI-heikoin + parillinen/pariton rotaatio (backward compat)
    return vkP === 'parillinen'
      ? ketjuProf.heikoin
      : ketjuProf.toiseksiHeikoin;
  }

  if (ika >= 13 && PANKKI.S[sKetju]) {
    const sRyyhma = PANKKI.S[sKetju].find(r => r.vk === vkParit) || PANKKI.S[sKetju][0];
    if (sRyyhma?.stage_tasot) {
      const sHarj  = _valitseStage(sRyyhma.stage_tasot, stage);
      const sOhje  = _ohje(sHarj, ityyppi);
      const sPhv   = phv === 'PH' && sHarj.phv ? sOhje + '\n\n⚠️ ' + sHarj.phv : sOhje;
      const sXp    = phv === 'PH' && sHarj.phv_xp ? sHarj.phv_xp : sHarj.xp;

      // Selvitetään mikä ohjasi valintaa (läpinäkyvyys pelaajalle/valmentajalle)
      const sValintaPeruste = (pelaaja.adar_pisteet < 30) ? 'adar'
        : (pelaaja.testit && Object.keys(pelaaja.testit).length > 0) ? 'testidata'
        : 'flei';

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
        valinta_peruste: sValintaPeruste, // 'testidata'|'adar'|'flei'
        stage,
        stageLabel: `Everton Stage ${stage}`,
        vkKierto: `Viikko ${viikonNro} · ${sValintaPeruste === 'flei' ? (vkParit === 'parillinen' ? 'Heikoin' : 'Toiseksi heikoin') : 'Testidata'} ketju`,
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
        cue: 'Tutkimus (Vaeyens 2007): pre-scanning erottaa eliitit subeliitistä. Huippuakatemioissa tätä harjoitellaan joka päivä — katse ylös ennen kosketusta.',
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
  // Käytä laskeKetjuProfiili():a samoin kuin generoimTehtavat()
  // Tämä varmistaa identtisen FLEI-heikoin-laskennan
  const profV2 = laskeKetjuProfiili(pelaaja);
  const heikoin         = profV2.heikoin;
  const toiseksiHeikoin = profV2.toiseksiHeikoin;

  // Ajastus
  const ikaLuokka  = ika <= 12 ? 'U12' : ika <= 15 ? 'U15' : 'U19';
  const viikonNro  = jaksoViikko || _laskeViikonNro();
  const paivaNro   = new Date().getDay() === 0 ? 6 : new Date().getDay() - 1; // 0=Ma
  const vkParit    = viikonNro % 2 === 0 ? 'parillinen' : 'pariton';
  const sKetju     = vkParit === 'parillinen' ? heikoin : toiseksiHeikoin;
  // P-harjoitteen vaihe: viikot 1-2=valmistava, 3-4=kehittävä, 5-6=huipentava, sitten alkaa alusta
  const jaksoVko   = ((viikonNro - 1) % 6) + 1;
  const pVaiheIdx  = jaksoVko <= 2 ? 0 : jaksoVko <= 4 ? 1 : 2;

  // 1. T-harjoite — Fulham/Noordster kuukausimalli (sama logiikka kuin generoimTehtavat)
  const _mesoV2      = _laskeMesosykli();
  const mesosykliV2  = _mesoV2.mesosykli;
  const jaksoViikkoV2 = _mesoV2.jaksoViikko;
  const tBankV2      = ika <= 12 ? PANKKI.T.leikkija
                     : ika <= 15 ? PANKKI.T.rakentaja
                     : PANKKI.T.showcase;
  const tSeriesV2    = PANKKI.T[mesosykliV2] || PANKKI.T.perus;
  const tVkAvainV2   = jaksoViikkoV2 >= 5
    ? 'vk' + Math.max(1, Math.min(4, pelaaja._t_heikoin_viikko || 1))
    : 'vk' + Math.max(1, Math.min(4, jaksoViikkoV2));
  const tHarjV2 = (tSeriesV2 && tSeriesV2[tVkAvainV2])
    || (tSeriesV2 && tSeriesV2.vk1)
    || (PANKKI.T.perus && PANKKI.T.perus.vk1)
    || (PANKKI.T.rakentaja && PANKKI.T.rakentaja.vk1);
  const tOhjeV2 = _ohje(tHarjV2, ityyppi);
  tehtavat.push({
    id:'t_pallo', tyyppi:'T', label:'⚽ Kultaikkuna',
    label_cue:'Joka päivä — myös lepopäivät · maailman huippuakatemiat',
    nimi:tHarjV2.nimi, ohje:tOhjeV2, kesto:tHarjV2.kesto, xp:tHarjV2.xp,
    cue:tHarjV2.cue, yt:tHarjV2.yt,
    viikkotavoite: tHarjV2.viikkotavoite || null,
    mesosykli: mesosykliV2, jaksoViikko: jaksoViikkoV2,
    isRepeatViikko: jaksoViikkoV2 >= 5,
    ketju:null, stage, ityyppi,
  });

  // 2. D-harjoite — identtinen generoimTehtavat()-logiikka
  // PANKKI.D (stage-pohjainen) korvaa HARJOITEPANKKI.D (viikonpäivä-pohjainen)
  // ADAR-override: adar_pisteet < 40 → diag-ketju
  const dKetjuV2 = (
    pelaaja.adar_pisteet !== undefined &&
    pelaaja.adar_pisteet !== null &&
    pelaaja.adar_pisteet < 40
  ) ? 'diag' : heikoin;

  const dPoolV2 = PANKKI.D[dKetjuV2] || PANKKI.D['dfl'] || [];
  const dHarjV2 = dPoolV2.find(h => h.stage && h.stage.some(s => s <= stage+1 && s >= stage-1))
               || dPoolV2[0] || null;

  if (dHarjV2) {
    const dOhjeV2 = _ohje(dHarjV2, ityyppi);
    const dPhvV2  = phv === 'PH' && dHarjV2.phv
      ? dOhjeV2 + '\n\n⚠️ ' + dHarjV2.phv : dOhjeV2;
    tehtavat.push({
      id:'d_aktivointi', tyyppi:'D', label:'🔄 Päivittäinen',
      label_cue:'5–10 min · Ylläpito · Myös lepopäivät',
      nimi:dHarjV2.nimi, ohje:dPhvV2, kesto:dHarjV2.kesto, xp:dHarjV2.xp,
      cue:dHarjV2.cue, yt:dHarjV2.yt,
      ketju:dKetjuV2, ketjuNimi:KETJUT[dKetjuV2]?.nimi,
      adar_override: dKetjuV2 !== heikoin,
      stage, ityyppi,
    });
  }

  // 3. S-harjoite — identtinen testidataohjattu logiikka
  // Sama _laskeSKetju-logiikka kuin generoimTehtavat():ssa
  const sKetjuV2 = (function() {
    if (pelaaja.adar_pisteet !== undefined && pelaaja.adar_pisteet < 30 && PANKKI.S['diag'])
      return 'diag';
    // Kerros 3: Harjoitettavuuskartoitus
    if (pelaaja.testit) {
      const tv = pelaaja.testit;
      const harjH = [];
      if(tv.valakyykky_p===1)        harjH.push({ketju:'dfl',paino:3});
      if(tv.hyvaa_huomenta_p===1)    harjH.push({ketju:'sbl',paino:4});
      if(tv.lantionnosto_p===1)      harjH.push({ketju:'sbl',paino:3});
      if(tv.slr_p===1)               harjH.push({ketju:'sbl',paino:3});
      if(tv.lonkan_ojennus_p===1)    harjH.push({ketju:'sbl',paino:2});
      if(tv.askelkyykky_p===1)       harjH.push({ketju:'sfl',paino:3});
      if(tv.thomas_testi_p===1)      harjH.push({ketju:'sfl',paino:4});
      if(tv.luistelijakyykky_p===1)  harjH.push({ketju:'ll', paino:3});
      if(tv.etunoja_arvio_p===1)     harjH.push({ketju:'dfl',paino:2});
      if(tv.lankku_p!==undefined&&tv.lankku_p<2)        harjH.push({ketju:'dfl',paino:3});
      if(tv.sivulankku_p!==undefined&&tv.sivulankku_p<2) harjH.push({ketju:'ll',paino:3});
      const phNv = ika<=12?1.75:ika<=15?1.90:ika<=17?2.20:2.45;
      if(tv.naruhypyt_tst!==undefined&&tv.naruhypyt_tst<26)    harjH.push({ketju:'dfl',paino:2});
      if(tv.vauhditon_ph_m!==undefined&&tv.vauhditon_ph_m<phNv) harjH.push({ketju:'sbl',paino:3});
      if(tv.leuanveto_tst!==undefined&&tv.leuanveto_tst<8)      harjH.push({ketju:'dfl',paino:2});
      if(tv.jalkojennosto_tst!==undefined&&tv.jalkojennosto_tst<12) harjH.push({ketju:'dfl',paino:2});
      if(tv.yj_pakianousu_tst!==undefined&&tv.yj_pakianousu_tst<15) harjH.push({ketju:'sbl',paino:2});
      if(tv.takakyykky_5rm!==undefined&&pelaaja.paino_kg&&tv.takakyykky_5rm/pelaaja.paino_kg<1.2) harjH.push({ketju:'sbl',paino:3});
      if(tv.maastaveto_5rm!==undefined&&pelaaja.paino_kg&&tv.maastaveto_5rm/pelaaja.paino_kg<1.5) harjH.push({ketju:'sbl',paino:3});
      if(harjH.length>0){
        harjH.sort((a,b)=>b.paino-a.paino);
        const k=harjH[0].ketju;
        if(PANKKI.S[k]) return k;
      }
    }
    // Kerros 2: H-H testit + tekniikkakilpailut
    if (pelaaja.testit) {
      const t = pelaaja.testit;
      const normit = {
        ponnauttelu_s:    ika<=10?16:ika<=12?20:25,
        syotto_penkki_s:  ika<=10?7.5:ika<=12?6.5:5.8,
        kuljetus_laukaus_s:ika<=10?9.5:ika<=12?8.5:7.5,
        pituuspotku_m:    ika<=10?15:ika<=12?22:28,
        cmj_cm:       ika<=12?20:ika<=14?24:ika<=16?28:32,
        sjhyppy_cm:   ika<=12?16:ika<=14?20:ika<=16?24:28,
        loikka_5m:    ika<=12?6.5:ika<=14?7.5:ika<=16?8.5:9.5,
        sprintti_30m: ika<=12?5.5:ika<=14?4.9:ika<=16?4.5:4.2,
        sprintti_5m:  ika<=12?1.25:ika<=14?1.15:ika<=16?1.05:1.0,
        sprintti_10m: ika<=12?2.1:ika<=14?1.95:ika<=16?1.85:1.75,
        sm_juoksu_s:  ika<=12?7.8:ika<=14?7.2:ika<=16?6.8:6.4,
        kasirata_s:   ika<=12?16.5:ika<=14?15.5:ika<=16?14.8:14.2,
        t_testi_s:    ika<=12?12.5:ika<=14?11.5:ika<=16?10.8:10.2,
        sm_pallo_s:   ika<=12?9.5:ika<=14?8.8:ika<=16?8.2:7.8,
        pujottelu_s:  ika<=12?9.8:ika<=14?9.0:ika<=16?8.4:8.0,
        syotto_s:     ika<=12?8.5:ika<=14?7.8:ika<=16?7.2:6.8,
        mas_ms:       ika<=12?2.8:ika<=14?3.0:ika<=16?3.2:3.4,
      };
      const heikoudet = [];
      // Kerros 1: tekniikkakilpailut
      if(t.ponnauttelu_s    !==undefined&&t.ponnauttelu_s    <normit.ponnauttelu_s)    heikoudet.push({ketju:'diag',ero:normit.ponnauttelu_s-t.ponnauttelu_s,testi:'ponnauttelu_s'});
      if(t.syotto_penkki_s  !==undefined&&t.syotto_penkki_s  <normit.syotto_penkki_s)  heikoudet.push({ketju:'diag',ero:normit.syotto_penkki_s-t.syotto_penkki_s,testi:'syotto_penkki_s'});
      if(t.pituuspotku_m    !==undefined&&t.pituuspotku_m    <normit.pituuspotku_m)    heikoudet.push({ketju:'sbl', ero:normit.pituuspotku_m-t.pituuspotku_m,testi:'pituuspotku_m'});
      if(t.kuljetus_laukaus_s!==undefined&&t.kuljetus_laukaus_s>normit.kuljetus_laukaus_s) heikoudet.push({ketju:'diag',ero:t.kuljetus_laukaus_s-normit.kuljetus_laukaus_s,testi:'kuljetus_laukaus_s'});
      // SBL
      if(t.cmj_cm      !==undefined&&t.cmj_cm      <normit.cmj_cm)      heikoudet.push({ketju:'sbl',ero:normit.cmj_cm-t.cmj_cm,testi:'cmj_cm'});
      if(t.sjhyppy_cm  !==undefined&&t.sjhyppy_cm  <normit.sjhyppy_cm)  heikoudet.push({ketju:'sbl',ero:normit.sjhyppy_cm-t.sjhyppy_cm,testi:'sjhyppy_cm'});
      if(t.loikka_5m   !==undefined&&t.loikka_5m   <normit.loikka_5m)   heikoudet.push({ketju:'sbl',ero:normit.loikka_5m-t.loikka_5m,testi:'loikka_5m'});
      if(t.sprintti_30m!==undefined&&t.sprintti_30m>normit.sprintti_30m) heikoudet.push({ketju:'sbl',ero:t.sprintti_30m-normit.sprintti_30m,testi:'sprintti_30m'});
      // SFL
      if(t.sprintti_5m !==undefined&&t.sprintti_5m >normit.sprintti_5m)  heikoudet.push({ketju:'sfl',ero:t.sprintti_5m-normit.sprintti_5m,testi:'sprintti_5m'});
      if(t.sprintti_10m!==undefined&&t.sprintti_10m>normit.sprintti_10m) heikoudet.push({ketju:'sfl',ero:t.sprintti_10m-normit.sprintti_10m,testi:'sprintti_10m'});
      // LL
      if(t.sm_juoksu_s !==undefined&&t.sm_juoksu_s >normit.sm_juoksu_s)  heikoudet.push({ketju:'ll', ero:t.sm_juoksu_s-normit.sm_juoksu_s,testi:'sm_juoksu_s'});
      if(t.kasirata_s  !==undefined&&t.kasirata_s  >normit.kasirata_s)   heikoudet.push({ketju:'ll', ero:t.kasirata_s-normit.kasirata_s,testi:'kasirata_s'});
      if(t.t_testi_s   !==undefined&&t.t_testi_s   >normit.t_testi_s)    heikoudet.push({ketju:'ll', ero:t.t_testi_s-normit.t_testi_s,testi:'t_testi_s'});
      // DIAG
      if(t.sm_pallo_s  !==undefined&&t.sm_pallo_s  >normit.sm_pallo_s)   heikoudet.push({ketju:'diag',ero:t.sm_pallo_s-normit.sm_pallo_s,testi:'sm_pallo_s'});
      if(t.pujottelu_s !==undefined&&t.pujottelu_s >normit.pujottelu_s)  heikoudet.push({ketju:'diag',ero:t.pujottelu_s-normit.pujottelu_s,testi:'pujottelu_s'});
      if(t.syotto_s    !==undefined&&t.syotto_s    >normit.syotto_s)     heikoudet.push({ketju:'diag',ero:t.syotto_s-normit.syotto_s,testi:'syotto_s'});
      // DFL
      if(t.mas_ms      !==undefined&&t.mas_ms      <normit.mas_ms)       heikoudet.push({ketju:'dfl', ero:normit.mas_ms-t.mas_ms,testi:'mas_ms'});

      if(heikoudet.length>0){
        heikoudet.forEach(h=>{const n=normit[h.testi];h.ero_norm=n?Math.abs(h.ero/n):h.ero;});
        heikoudet.sort((a,b)=>b.ero_norm-a.ero_norm);
        const k=heikoudet[0].ketju;
        if(PANKKI.S[k]) return k;
      }
    }
    return vkParit==='parillinen' ? heikoin : toiseksiHeikoin;
  })();

  if (ika >= 13 && PANKKI.S[sKetjuV2]) {
    const sRyhmaV2 = PANKKI.S[sKetjuV2].find(r => r.vk === vkParit) || PANKKI.S[sKetjuV2][0];
    if (sRyhmaV2?.stage_tasot) {
      const sHarjV2 = _valitseStage(sRyhmaV2.stage_tasot, stage);
      const sOhjeV2 = _ohje(sHarjV2, ityyppi);
      const sPhvV2  = phv === 'PH' && sHarjV2.phv ? sOhjeV2 + '\n\n⚠️ ' + sHarjV2.phv : sOhjeV2;
      const sXpV2   = phv === 'PH' && sHarjV2.phv_xp ? sHarjV2.phv_xp : sHarjV2.xp;
      const sPeruste = (pelaaja.adar_pisteet < 30) ? 'adar'
        : (pelaaja.testit && Object.keys(pelaaja.testit).length > 0) ? 'testidata' : 'flei';
      tehtavat.push({
        id:'s_kohdennettu', tyyppi:'S', label:'🎯 Kohdennettu 30%',
        label_cue:`15–20 min · ${KETJUT[sKetjuV2]?.lyhyt} · Vapaa-/lepopäivä`,
        nimi:sHarjV2.nimi, ohje:sPhvV2, kesto:sHarjV2.kesto, xp:sXpV2,
        cue:sHarjV2.cue, yt:sHarjV2.yt,
        ketju:sKetjuV2, ketjuNimi:KETJUT[sKetjuV2]?.nimi,
        valinta_peruste: sPeruste,
        stage, stageLabel:`Everton Stage ${stage}`,
        vkKierto:`Viikko ${viikonNro} · ${sPeruste === 'flei' ? (vkParit==='parillinen'?'Heikoin':'Toiseksi heikoin') : 'Testidata'} ketju`,
        ityyppi,
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

    // ── D: joka päivä — PANKKI.D (stage-pohjainen, yhtenäinen) ──
    const dPoolVko = PANKKI.D[heikoin] || PANKKI.D['dfl'] || [];
    const dHarj = dPoolVko.find(h => h.stage && h.stage.some(s => s <= stage+1 && s >= stage-1))
               || dPoolVko[0];
    if (dHarj) {
      const dOhjeVko = _ohje(dHarj, ityyppi);
      harjoitteet.push({
        tyyppi: 'D',
        nimi: dHarj.nimi,
        ohje: (phv === 'PH' && dHarj.phv) ? dOhjeVko + ' ⚠️ ' + dHarj.phv : dOhjeVko,
        kesto: dHarj.kesto,
        xp: dHarj.xp,
        cue: dHarj.cue,
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

/* ═══════════════════════════════════════════════════════════════════
   OMATOIMIHARJOITTELU v1 — kehityskohde-prioriteettiketju + Bola Sempre
   (Shea & Morgan 1979: teema pysyy 2–4 vk, harjoite vaihtuu päivittäin)

   Lisätty: laskeTekninenKehityskohde · valitsePaivanHarjoite · generoiMiksiteksti
   PANKKI:n T-harjoitteet eivät olleet kehityskohde-suodatettavissa → mesosyklit
   tagataan (T_MESOSYKLI_KOHDE) + uudet ponnauttelu/nopeus-harjoitteet (T_KOHDE_PANKKI).
   ═══════════════════════════════════════════════════════════════════ */

// Olemassa olevat mesosyklit → kehityskohde (ei uutta sisältöä, vain tagi)
const T_MESOSYKLI_KOHDE = {
  kaka:    'pallonhallinta',   // Vastaanottaminen / ensikosketus
  perus:   'pallonhallinta',   // Päivittäinen pallokosketus
  affelay: 'koordinaatio',     // Dribbelin perusta
  ronaldo: 'koordinaatio',     // 1v1-liikkeet
  beckham: 'syotto',           // Syöttäminen ja laukaus
};

// Raaka TKI-laji → bank-kehityskohde (Sibbon tki_kehityskohde voi olla mikä tahansa laji)
const TKI_LAJI_KOHDE = {
  syotto: 'syotto', ponnauttelu: 'ponnauttelu',
  pujottelu: 'koordinaatio', kuljetus_laukaus: 'nopeus', pituuspotku: 'syotto',
};

// Uudet T-harjoitteet aukoille (ponnauttelu, nopeus) — täysi 3-ikävaihe-ohjeistus
const T_KOHDE_PANKKI = {
  ponnauttelu: [
    { nimi: 'Pomppulaskuri', kehityskohde: 'ponnauttelu', kesto: '10 min', xp: 20,
      ohje_leikkija: 'Pomputa palloa jalalla — montako kertaa peräkkäin saat ennen kuin se tippuu? Laske ja kirjaa ennätys. Yritä päihittää eilinen!',
      ohje_rakentaja: 'Ponnauttelu vahvalla jalalla, tavoite 30 peräkkäistä. Pidä pallo matalalla (polven alapuolella), nilkka lukossa. Kun 30 onnistuu, vaihda heikkoon jalkaan.',
      ohje_showcase: 'Ponnauttelu molemmin jaloin vuorotellen, pallo polven korkeudella, tavoite 50 peräkkäistä. Lisää reisi- ja olkapääkosketukset sekaan rytmiä rikkomatta.',
      cue: 'Ronaldinho: ponnauttelu opettaa pallon kielen — kuinka se reagoi jokaiseen kosketukseen.',
      viikkotavoite: 'Paranna peräkkäisten ponnautusten ennätystä' },
    { nimi: 'Reisi–jalka-rytmi', kehityskohde: 'ponnauttelu', kesto: '10 min', xp: 20,
      ohje_leikkija: 'Pomputa näin: reisi → jalka → reisi → jalka. Pidä rytmi kuin laulussa. Montako kierrosta jaksat ilman tippumista?',
      ohje_rakentaja: 'Yhdistelmäponnauttelu: reisi–jalka–reisi yhdellä jalalla, sitten vaihto toiseen. 5 kierrosta ilman tippumista. Kontrolli ennen vauhtia.',
      ohje_showcase: 'Vapaa ponnauttelusarja: reisi, sisäterä, ulkojalka, olkapää — vaihtele kosketuspintaa rytmiä menettämättä. 2 min yhtäjaksoisesti.',
      cue: 'Pallo tottelee sitä jolla on tuntuma jokaisesta pinnasta.',
      viikkotavoite: 'Reisi–jalka 5 kierrosta putkeen' },
    { nimi: 'Seinäponnautus', kehityskohde: 'ponnauttelu', kesto: '12 min', xp: 25,
      ohje_leikkija: 'Potkaise pallo seinään ilmaan ja ota se haltuun ilmasta ennen kuin se osuu maahan. 10 onnistunutta!',
      ohje_rakentaja: 'Seinäponnautus: syötä seinään ilmaan, vastaanota ilmasta yhdellä pehmeällä kosketuksella, ponnauta takaisin. 15 kosketusta ilman maahantippumista.',
      ohje_showcase: 'Seinäponnautus vuorojaloin: ensimmäinen kosketus pehmentää, toinen syöttää. 20 toistoa + skannaa: nimeä kohde ennen jokaista syöttöä.',
      cue: 'Ilmapallon hallinta erottaa pelaajan joka pelaa nopeudella.',
      viikkotavoite: 'Seinäponnautus 15 kosketusta ilman maahantippumista' },
  ],
  nopeus: [
    { nimi: 'Kiihdytys pallon kanssa', kehityskohde: 'nopeus', kesto: '12 min', xp: 20,
      ohje_leikkija: 'Kuljeta pallo niin nopeasti kuin pystyt 10 metriä, pysäytä, ja takaisin. Pallo pysyy lähellä! 6 kertaa täysillä, hengähdä välissä.',
      ohje_rakentaja: 'Kiihdytysvedot pallon kanssa: 0–15 m maksimivauhtia, pallo enintään askeleen päässä. 6 toistoa, täysi palautus välissä. Pysyykö pallo hallinnassa täydessä vauhdissa?',
      ohje_showcase: 'Kiihdytys pallolla 20 m, viimeiset 5 m ilman katsetta palloon (skannaa eteen). 8 toistoa. Vertaa: kuljetus ilman palloa vs. pallon kanssa (TSI-erotus).',
      cue: 'Nopeus pallon kanssa on eri taito kuin nopeus ilman — sitä harjoitellaan erikseen.',
      viikkotavoite: 'Pallo hallinnassa 15 m täysvauhdissa' },
    { nimi: 'Suunnanmuutos kartioilla', kehityskohde: 'nopeus', kesto: '12 min', xp: 25,
      ohje_leikkija: '3 merkkiä lattiaan — kivi, reppu tai paita käy — 5 metrin välein. Kuljeta pallo, käänny terävästi jokaisella, kiihdytä. 8 kertaa.',
      ohje_rakentaja: 'Suunnanmuutosrata: kartiot 5 m välein, terävä 90° käännös jokaisella + välitön kiihdytys ulos. Pallo lähellä käännöksessä. 8 läpimenoa, ajanotto.',
      ohje_showcase: 'Suunnanmuutos täydessä vauhdissa: 180° käännös pysäytyksellä + räjähtävä lähtö vastakkaiseen suuntaan, molemmat jalat. 10 toistoa, mittaa palautumisaika.',
      cue: 'Pelin nopeus on suunnanmuutosnopeutta, ei suoraa juoksua.',
      viikkotavoite: 'Terävä käännös ilman pallon karkaamista' },
    { nimi: 'Reaktiolähtö', kehityskohde: 'nopeus', kesto: '10 min', xp: 20,
      ohje_leikkija: 'Kaveri huutaa "NYT!" — lähde silloin pallon kanssa täysillä 5 metriä. Tai heittämäsi pallo pomppaa merkiksi — lähde heti! 8 kertaa.',
      ohje_rakentaja: 'Reaktiolähtö: odota merkkiä (kaverin huuto tai käsimerkki), lähde pallolla räjähtävästi 5–10 m. 8 toistoa. Kuinka nopeasti reagoit ja olet täydessä vauhdissa?',
      ohje_showcase: 'Reaktiolähtö valinnalla: kaveri osoittaa suunnan merkkihetkellä, lähde sinne pallolla. 10 toistoa. Yhdistä havainto + kiihdytys — tämä on pelin lähtö.',
      cue: 'Ensimmäinen askel ratkaisee — reaktio + kiihdytys voittaa metrit.',
      viikkotavoite: 'Lähtö merkistä ilman viivettä' },
  ],
};

// Miksi-lause2 -matriisi: 5 kehityskohdetta × 3 ikävaihetta
const MIKSI_LAUSE2 = {
  pallonhallinta: {
    leikkija:  'Jokainen kosketus tekee pallosta tutumman.',
    rakentaja: 'Automatisoimalla hallinnan vapautat ajattelun peliin.',
    showcase:  'Tekninen automaatio on se mikä erottaa ammattitason harrastelijatasosta.',
  },
  koordinaatio: {
    leikkija:  'Keho oppii liikkumaan paremmin yhdessä.',
    rakentaja: 'Koordinaatio on pohja kaikelle muulle.',
    showcase:  'Liikehallinta täydessä vauhdissa on se mihin tekniikka nojaa.',
  },
  nopeus: {
    leikkija:  'Nopeat jalat tekevät pelistä hauskempaa.',
    rakentaja: 'Nopeus pallon kanssa on oma taitonsa — sitä voi harjoitella.',
    showcase:  'Neuromuskulaarinen harjoittelu rakentaa räjähtävyyttä.',
  },
  syotto: {
    leikkija:  'Tarkka syöttö pitää pallon kavereilla.',
    rakentaja: 'Syöttö on joukkueen kieli — tarkkuus avaa pelin.',
    showcase:  'Syötön tarkkuus ja painotus ratkaisevat hyökkäyksen tempon.',
  },
  ponnauttelu: {
    leikkija:  'Ponnauttelu opettaa pallon liikkeet.',
    rakentaja: 'Ponnauttelu rakentaa kosketustarkkuuden jokaiseen pintaan.',
    showcase:  'Ilmapallon hallinta on perusta ensimmäiselle kosketukselle paineessa.',
  },
};

const KOHDE_NIMET = { pallonhallinta: 'pallonhallinta', koordinaatio: 'koordinaatio', nopeus: 'nopeus', syotto: 'syöttö', ponnauttelu: 'ponnauttelu' };

// Päivänumero epochista — Date.UTC date-only -stringeille (OSA 3 -invariantti), muuten millis
function _pvmEpochPaiva(x) {
  if (x == null) return null;
  if (typeof x === 'object') {
    if (typeof x.toDate === 'function') return Math.floor(x.toDate().getTime() / 86400000);
    if (typeof x.seconds === 'number')  return Math.floor((x.seconds * 1000) / 86400000);
    if (x instanceof Date)              return Math.floor(x.getTime() / 86400000);
  }
  var s = String(x);
  var m = s.match(/^(\d{4})-(\d{2})-(\d{2})/);
  if (m) return Math.floor(Date.UTC(+m[1], +m[2] - 1, +m[3]) / 86400000);
  var t = Date.parse(s);
  return isNaN(t) ? null : Math.floor(t / 86400000);
}

// Ikävaihe pelaajasta: syntymaVuosi (SJK) tai ikaluokka 'P10'/'T14' (Sibbo) → leikkija/rakentaja/showcase
function _laskeIkavaihe(pelaaja) {
  var ika = null;
  if (pelaaja && pelaaja.syntymaVuosi)      ika = (new Date().getFullYear()) - Number(pelaaja.syntymaVuosi);
  else if (pelaaja && pelaaja.ika != null)  ika = Number(pelaaja.ika);
  else if (pelaaja && pelaaja.ikaluokka)    { var mm = String(pelaaja.ikaluokka).match(/(\d+)/); if (mm) ika = +mm[1]; }
  if (ika == null) return 'rakentaja';   // turvallinen oletus kun ikä tuntematon
  return ika <= 12 ? 'leikkija' : ika <= 15 ? 'rakentaja' : 'showcase';
}

function _ohjeIkavaiheelle(h, iv) {
  // Ensisijainen: oikean ikävaiheen ohje
  var tarkka = h['ohje_' + iv];
  if (tarkka) return tarkka;
  // Fallback: leikkijälle EI rakentajan drilliä (§28 ikätasoisuus)
  // → cue/tarina (ikäneutraali) ennen ylempää tasoa
  if (iv === 'leikkija') return h.cue || h.ohje_leikkija || h.ohje || '';
  // Rakentaja/showcase: normaali fallback-ketju
  return h.ohje_rakentaja || h.ohje_leikkija || h.ohje_showcase || h.ohje || '';
}

// ── 1A: Kehityskohteen prioriteettiketju ──────────────────────────────
// Palauttaa { kohde, lahde, varmuus, rawKohde }
function laskeTekninenKehityskohde(pelaaja) {
  pelaaja = pelaaja || {};
  // P1 — TKI-kehityskohde (Sibbo, varmuus korkea)
  if (pelaaja.tki_kehityskohde) {
    var raw = String(pelaaja.tki_kehityskohde);
    var kohde = TKI_LAJI_KOHDE[raw] || (KOHDE_NIMET[raw] ? raw : 'pallonhallinta');
    return { kohde: kohde, lahde: 'tki', varmuus: 'korkea', rawKohde: raw };
  }
  // P2 — TSI-johdettu (SJK, varmuus kohtalainen)
  if (pelaaja.tsi_viimeisin != null) {
    var tsi = Number(pelaaja.tsi_viimeisin);
    var k2 = tsi > 1.5 ? 'pallonhallinta' : tsi >= 0.8 ? 'koordinaatio' : 'nopeus';
    return { kohde: k2, lahde: 'tsi', varmuus: 'kohtalainen', rawKohde: null };
  }
  // P3 — H-H-taso (varmuus matala)
  if (pelaaja.hh_taso != null) {
    var k3 = Number(pelaaja.hh_taso) < 2.0 ? 'koordinaatio' : 'nopeus';
    return { kohde: k3, lahde: 'hh', varmuus: 'matala', rawKohde: null };
  }
  // P4 — oletus (universaali pohja)
  return { kohde: 'pallonhallinta', lahde: 'ikavaihe', varmuus: 'oletus', rawKohde: null };
}

// ══════════════════════════════════════════════════════════════════
// i18n — harjoitesisällön käännökset (V4-A). sv nyt; en triviaali lisäys
// samaan karttaan (lisää HARJOITE_I18N.en.* → getterit poimivat sen automaattisesti).
// Avain = KANONINEN fi-merkkijono → käännös. Puuttuva avain / puuttuva kieli → fi
// (Suomi ei rikkoudu). Kielitila luetaan tmNykyinenKieli()-globaalista (fi-fallback).
// ══════════════════════════════════════════════════════════════════
var HARJOITE_I18N = {
  sv: {
    // PANKKI T-sisältö (nimi/ohje/tarina/cue) — pelaajalle näkyvä päivätehtävä
    sisalto: {
      'Maestro — Pysäytys sisäterällä': 'Maestro — Stopp med insidan',
      '10 kertaa: pomppaa seinään ja pysäytä sisäterällä. Suuntaa pallo sinne mihin haluat juosta seuraavaksi.': '10 gånger: studsa mot väggen och stoppa med insidan. Rikta bollen dit du vill springa härnäst.',
      '3×10, molemmat jalat. Sisäterä vastaanottaa — 1. kosketus osoittaa seuraavan suunnan ennen kuin puolustaja reagoi.': '3×10, båda fötterna. Insidan tar emot — första touchen pekar ut nästa riktning innan försvararen hinner reagera.',
      '4×10, vaihda jalkaa sarjojen välissä. Automaatti: sisäterä kehon alle, jalkaterä pelattavaan suuntaan ennen pallonkosketusta.': '4×10, byt fot mellan seten. Automatik: insidan in under kroppen, foten mot spelriktningen redan innan du rör bollen.',
      'Maestron sääntö: ensimmäinen kosketus on jo seuraava liike.': 'Maestros regel: första touchen är redan nästa rörelse.',
      'Eräs nuori huippu nousi akatemiassa kaksi ikäluokkaa muita edellä jo teininä — ei koon takia, vaan koska hänen ensikosketuksensa oli niin varma, että hänelle jäi aina enemmän aikaa kuin muille.': 'En ung talang klev fram i akademin två åldersklasser före de andra redan som tonåring — inte tack vare storleken, utan för att hans första touch var så säker att han alltid hade mer tid än de andra.',
      'Maestro — Vastaanota ja käännä': 'Maestro — Ta emot och vänd',
      '12 kertaa: ota pallo seinästä ja käännä se heti uuteen suuntaan sisäterällä. Älä pysäytä paikalleen — pallo lähtee jo eteenpäin.': '12 gånger: ta bollen från väggen och vänd den direkt i en ny riktning med insidan. Stanna den inte på stället — bollen är redan på väg framåt.',
      '3×12, vuorojaloin. Avaa lantio ennen kosketusta — 1. kosketus kääntää pallon pois sieltä mistä se tuli, niin saat aikaa ja tilaa.': '3×12, växelvis fot. Öppna höften före touchen — första touchen vänder bollen bort från där den kom ifrån, så du får tid och yta.',
      '4×12, käännä molempiin suuntiin. Automaatti: skannaa olkapään yli ennen palloa, sisäterän kosketus avaa suoraan vapaaseen tilaan ilman lisäkosketusta.': '4×12, vänd åt båda hållen. Automatik: skanna över axeln före bollen, insidans touch öppnar direkt mot fri yta utan extra touch.',
      'Vastaanotto on jo hyökkäys — käänny sinne missä on tilaa.': 'Mottagningen är redan en anfallshandling — vänd dit där det finns yta.',
      'Eräs huipulle noussut pelaaja harjoitteli jo nuorena kuukausia aikuisten joukkueen mukana — vain seuratakseen läheltä, miten parhaat ottavat ensikosketuksen haltuun ennen kuin paine ehtii päälle.': 'En spelare som nådde toppen tränade redan som ung i månader med A-laget — bara för att på nära håll få se hur de bästa tar första touchen innan pressen hinner fram.',
      'Maestro — Suojaa ja avaudu': 'Maestro — Skydda och vänd ut',
      'Pyydä kaveri viereen (ei ota palloa). Ota pallo sisäterällä niin että kehosi on pallon ja kaverin välissä. 12 kertaa.': 'Be en kompis stå bredvid (utan att ta bollen). Ta bollen med insidan så att din kropp är mellan bollen och kompisen. 12 gånger.',
      '3×12 passiivisen puolustajan kanssa. Vastaanota takajalalla, kallista keho puolustajan ja pallon väliin — 1. kosketus vie pallon turvaan paineesta pois.': '3×12 med en passiv försvarare. Ta emot med bortre foten, luta kroppen mellan försvararen och bollen — första touchen för bollen i säkerhet bort från pressen.',
      '4×12, vaihda kumpi olkapää suojaa. Automaatti: tunnista paine ennen palloa, suojaa kehollasi ja avaudu sisäterällä vapaaseen tilaan yhdellä kosketuksella.': '4×12, byt vilken axel som skyddar. Automatik: känn av pressen före bollen, skydda med kroppen och vänd ut med insidan mot fri yta i en enda touch.',
      'Keho pallon ja vastustajan väliin — silloin pallo on aina sinun.': 'Kroppen mellan bollen och motståndaren — då är bollen alltid din.',
      'Eräs nuori pelaaja tuli vaihdosta kentälle joukkueensa hävitessä, ja vastustaja epäili ääneen mitä noin nuori siellä tekee. Puolessa tunnissa hän käänsi ottelun täysin — rauhallinen ensikosketus antoi hänelle ajan, jota muilla ei ollut.': 'En ung spelare kom in som avbytare medan hans lag låg under, och motståndarna undrade högt vad en så ung gjorde där. På en halvtimme vände han matchen helt — en lugn första touch gav honom tid som ingen annan hade.',
      'Maestro — Mittaa ensikosketuksesi': 'Maestro — Mät din första touch',
      'Tee 20 vastaanottoa. Laske montako kertaa pallo pysähtyy alle metrin päähän jalastasi. Kirjaa ennätys ja yritä päihittää se.': 'Gör 20 mottagningar. Räkna hur många gånger bollen stannar inom en meter från din fot. Skriv upp ditt rekord och försök slå det.',
      '20 vastaanottoa: laske montako menee suoraan peliasentoon (pallo alle 1 m, keho jo menosuuntaan). Vertaa vk1:n tulokseen — paraniko 1. kosketuksen suunta?': '20 mottagningar: räkna hur många som går direkt till spelläge (bollen inom 1 m, kroppen redan i rörelseriktningen). Jämför med vecka 1 — blev första touchens riktning bättre?',
      '20 vastaanottoa paineessa (passiivinen puolustaja): laske montako kääntyy suoraan vapaaseen tilaan ilman lisäkosketusta. Tavoite 16/20 — sillä tasolla 1. kosketus on ase.': '20 mottagningar under press (passiv försvarare): räkna hur många som vänds direkt mot fri yta utan extra touch. Mål 16/20 — på den nivån är första touchen ett vapen.',
      'Ilman mittausta et tiedä, paraneeko ensikosketuksesi.': 'Utan att mäta vet du inte om din första touch blir bättre.',
      'Eräs pelaaja nousi seuransa kaikkien aikojen nuorimmaksi pääsarjapelaajaksi vain 16-vuotiaana ja rikkoi ennätyksen joka oli kestänyt vuosikymmeniä — ja hänet valittiin heti ensiottelunsa parhaaksi pelaajaksi.': 'En spelare blev sin klubbs yngsta seriespelare någonsin vid bara 16 års ålder och slog ett rekord som stått i årtionden — och han utsågs direkt till bäste spelare i sin första match.',
      'Palloleikki — tee mitä tykkäät': 'Bollek — gör det du gillar',
      'Ota pallo ja mene ulos. Pompauta seinään, kuljeta, leiki! 15 minuuttia — ei sääntöjä.': 'Ta bollen och gå ut. Studsa mot väggen, för bollen, lek! 15 minuter — inga regler.',
      'Valitse yksi: seinäsyöttö 100 × 1 kosketus | pujottelu kartioilla 15 min | ponnauttelu heikolla jalalla 5 min.': 'Välj en: väggpass 100 × 1 touch | slalom mellan koner 15 min | jonglering med svaga foten 5 min.',
      'Vaativa tekniikka: seinäsyöttö 1-kosketuksella + samalla skannaa ympärillä — nimeä 3 asiaa ennen vastaanottoa. 20 min.': 'Krävande teknik: väggpass på 1 touch + skanna omgivningen samtidigt — namnge 3 saker före mottagningen. 20 min.',
      '"Daily touches" — joka päivä pallo, myös lepopäivinä.': '"Daily touches" — bollen varje dag, även på vilodagar.',
      'Maailman parhaissa akatemioissa jokainen pelaaja koskettaa palloa joka päivä — myös lepopäivinä. Sukupolvi toisensa jälkeen huiput ovat aloittaneet samasta säännöstä: pallo jalkaan joka ikinen päivä.': 'I världens bästa akademier rör varje spelare bollen varje dag — även på vilodagar. Generation efter generation har toppspelarna börjat med samma regel: bollen på foten varenda dag.',
      'Dribbeli — katse ylhäällä': 'Dribbling — blicken uppe',
      'Kuljeta palloa eteenpäin 20 metriä, katso YLHÄÄLLÄ! Älä katso palloon. Vaihda suuntaa äkillisesti 5 kertaa. Tee 5 kierrosta.': 'För bollen framåt 20 meter, titta UPP! Titta inte på bollen. Byt riktning tvärt 5 gånger. Gör 5 varv.',
      '4 perustaitoa peräkkäin: 1) Kuljeta silmät yli pallon etsien tilaa. 2) Kiihdytä hitaasta täyteen vauhtiin kahdessa askeleessa — pallo ei saa lähteä yli 2 askeleen. 3) Pienet nopeat suunnanvaihdot ilman suuria kaaria. 4) Tarkista: katso eteenpäin. 3 kierrosta.': '4 grundfärdigheter i rad: 1) För bollen med blicken över den och sök yta. 2) Accelerera från långsamt till full fart på två steg — bollen får inte hamna mer än 2 steg bort. 3) Små snabba riktningsbyten utan stora bågar. 4) Kontrollera: titta framåt. 3 varv.',
      'Shadowstepin perusta: nämä 4 taitoa ovat pohja, jolle kaikki muu rakennetaan.': 'Shadowsteps grund: dessa 4 färdigheter är basen som allt annat byggs på.',
      'Moni huippudribbaaja aloitti lähiön kaduilta, palloa joka päivä jalassa. Katupeli opetti katseen noston ja nopeat suunnanvaihdot jo ennen kuin yksikään akatemia ehti mukaan.': 'Många toppdribblare började på förortens gator, med bollen på foten varje dag. Gatufotbollen lärde dem att lyfta blicken och byta riktning snabbt långt innan någon akademi kom in i bilden.',
      'Dribbeli — kiihdytys pallon kanssa': 'Dribbling — acceleration med bollen',
      'Seiso paikallasi, pallo edessä. Lähtölaukaus — kiihdytä maksimille niin nopeasti kuin pystyt, pallo mukana! 10 kertaa. Palautus kävellen.': 'Stå stilla, bollen framför dig. Startskott — accelerera till max så snabbt du kan, med bollen! 10 gånger. Vila genom att gå tillbaka.',
      'Kiihdytysladder: 0–5m hidas | 5–10m keskinopeus | 10–15m maksimi — pallo mukana koko ajan. Mittaa: milloin pallo irtoaa liikaa? 8 toistoa.': 'Accelerationsstege: 0–5 m långsamt | 5–10 m medelfart | 10–15 m max — bollen med hela tiden. Mät: när tappar du bollen för långt? 8 repetitioner.',
      'Kiihdytys + suunnanmuutos 45° ilman palloa pysähtymistä. 6 toistoa kumpaankin suuntaan. Mittaa reaktioaikaa: kuinka nopeasti olet täydessä vauhdissa?': 'Acceleration + riktningsförändring 45° utan att stanna bollen. 6 repetitioner åt varje håll. Mät reaktionstiden: hur snabbt är du i full fart?',
      'Räjähtävyys: tärkeää ei ole mitä liikettä teet vaan milloin ja kuinka nopeasti kiihdytät sen jälkeen.': 'Explosivitet: det viktiga är inte vilken finta du gör, utan när och hur snabbt du accelererar efteråt.',
      'Eräs huippu löydettiin akatemiaan 10-vuotiaana. Hän hioi dribblaustekniikkaansa samassa paikassa kymmenen vuotta, päivä päivältä — eikä kiirehtinyt eteenpäin ennen kuin taito oli valmis.': 'En toppspelare upptäcktes till akademin som 10-åring. Han slipade sin dribblingsteknik på samma ställe i tio år, dag för dag — och skyndade sig inte vidare förrän färdigheten satt.',
      'Dribbeli — kaveria vastaan (passiivinen)': 'Dribbling — mot en kompis (passiv)',
      'Kaveri seisoo edessä, ei liiku. Ohita hänet vasemmalta tai oikealta! Kiihdytä ohi. 15 kertaa kummastakin suunnasta.': 'Kompisen står framför, rör sig inte. Gå förbi till vänster eller höger! Accelerera förbi. 15 gånger åt varje håll.',
      'Kaveri seisoo passiivisena puolustajana. Tee suunnanmuutos ohi hänestä — käytä lyhyttä liikettä, ei suurta kaarta. Ohituksen jälkeen välitön kiihdytys. 20 toistoa.': 'Kompisen står som passiv försvarare. Gör en riktningsförändring förbi honom — använd en kort finta, inte en stor båge. Direkt acceleration efter passeringen. 20 repetitioner.',
      'Yhdistä dribblaus ja liike: dribblaa lähelle kaveria → vaihda suuntaa → kaveri seuraa passiivisesti. Katso ylös ennen liikettä. 20 min pelimäisesti.': 'Kombinera dribbling och finter: dribbla nära kompisen → byt riktning → kompisen följer passivt. Titta upp före finten. 20 min på ett spellikt sätt.',
      'Hallitse liike ensin yksin, sitten passiivista vastaan, sitten täydessä 1v1:ssä.': 'Behärska finten först ensam, sedan mot passiv, sedan i full 1v1.',
      'Teininä eräs pelaaja debytoi aikuisten pääsarjassa ja uskalsi heti kuljettaa kokeneita puolustajia päin. Vuosien hionta näkyi: tekniikka kesti paineen, joten rohkeus oli ansaittua.': 'Som tonåring debuterade en spelare i högsta serien bland vuxna och vågade genast dribbla mot rutinerade försvarare. Årens slit syntes: tekniken höll under press, så modet var förtjänat.',
      'Dribbeli-mittaus': 'Dribblingsmätning',
      'Pujottele 5 kartiota niin nopeasti kuin pystyt — ajanotto! Kirjaa aika. Yritä parantaa 3 kertaa.': 'Slalom mellan 5 koner så snabbt du kan — ta tid! Skriv upp tiden. Försök förbättra dig 3 gånger.',
      'Ajanotto: pujottelu 5 kartio, 10 m. Tee 5 suoritusta. Laske paras aika. Vertaa: oletko nopeampi kuin lokakuun alussa?': 'Tidtagning: slalom 5 koner, 10 m. Gör 5 försök. Räkna bästa tiden. Jämför: är du snabbare än i början av oktober?',
      '4 perustaitoa: mittaa kuinka moni onnistuu täydessä pelissä (pelin jälkeen arvioi). Katso ylös, kiihdytä, suunnanmuutos, rytmi.': '4 grundfärdigheter: mät hur många som lyckas i full match (utvärdera efter matchen). Titta upp, accelerera, riktningsförändring, rytm.',
      'Mittaa kehitystä, älä vain harjoittele — ilman mittausta et tiedä, oletko kehittynyt.': 'Mät din utveckling, träna inte bara — utan att mäta vet du inte om du blivit bättre.',
      'Erästä huippudribbaajaa kuvailtiin pelaajaksi joka "nöyryytti puolustajia hämmästyttävillä vedoilla". Se tyyli syntyi katupelistä ja akatemian lukemattomista toistoista — ei yhdessä yössä.': 'En toppdribblare beskrevs som en spelare som "förödmjukade försvarare med häpnadsväckande finter". Den stilen föddes ur gatufotbollen och akademins otaliga repetitioner — inte över en natt.',
      'U-käännös — opitaan hitaasti': 'U-vändning — lär in långsamt',
      'Jalkapohja pallon päälle, vedä taaksepäin, käänny 180°. Hidas ensin! 15 kertaa oikealla jalalla, 15 vasemmalla. Ei kiire.': 'Fotsulan på bollen, dra bakåt, vänd 180°. Långsamt först! 15 gånger med höger fot, 15 med vänster. Ingen brådska.',
      'U-käännös: jalkapohja päälle → vedä taaksepäin → käänny 180° → kiihdytä. Tee 20 kertaa hitaasti ja oikein. Sitten: yliastuminen (saksi pallon yli). 20 kertaa. Ei vastustajaa.': 'U-vändning: fotsulan på → dra bakåt → vänd 180° → accelerera. Gör 20 gånger långsamt och rätt. Sedan: översteg (sax över bollen). 20 gånger. Ingen motståndare.',
      'Liikesarja 1–4 hitaasti: U-käännös | yliastuminen | U + yliastuminen yhdistettynä | vetokäännös (jalka pallon yli ja taakse). 10 × kutakin, tekninen laatu ensin.': 'Fintserie 1–4 långsamt: U-vändning | översteg | U + översteg kombinerat | dragvändning (foten över bollen och bakåt). 10 × vardera, teknisk kvalitet först.',
      'Perussääntö: koko sarja täytyy hallita ilman vastustajaa, ennen kuin siirrytään passiivista vastaan.': 'Grundregel: hela serien måste behärskas utan motståndare innan du går vidare till mot passiv.',
      'Eräs huippu harjoitteli lapsena yksin seinää vasten, kunnes pimeys pakotti lopettamaan. Kun muut lapset leikkivät, hän toisti samaa liikettä yhä uudelleen.': 'En toppspelare tränade som barn ensam mot en vägg tills mörkret tvingade honom sluta. När de andra barnen lekte upprepade han samma rörelse om och om igen.',
      '1v1-liike — nopeammin': '1v1-finter — snabbare',
      'Nyt nopeammin! U-käännös + heti kiihdytys. Tee liike ja juokse ohi nopeasti. 15 kertaa kummallakin jalalla.': 'Nu snabbare! U-vändning + acceleration direkt. Gör finten och spring förbi snabbt. 15 gånger med vardera foten.',
      'Valittu liike täydessä nopeudessa ilman vastustajaa: teeskentely + liike + kiihdytys alle 1 sekunnissa. 25 toistoa. Lisää: saksiliike — vie jalka pallon yli 20 kertaa.': 'Vald finta i full fart utan motståndare: låtsasrörelse + finta + acceleration på under 1 sekund. 25 repetitioner. Lägg till: saxfinta — för foten över bollen 20 gånger.',
      'Liikkeet 1–7 täydessä nopeudessa yksin. Mittaa: kuinka nopeasti teet liikkeen + kiihdytys 5 metriin? Tavoite alle 2 s.': 'Finter 1–7 i full fart ensam. Mät: hur snabbt gör du finten + acceleration på 5 meter? Mål under 2 s.',
      'Räjähtävyys: tärkeää ei ole mitä liikettä — vaan kuinka nopeasti kiihdytät sen jälkeen.': 'Explosivitet: det viktiga är inte vilken finta — utan hur snabbt du accelererar efteråt.',
      'Eräs nuori pelaaja muutti 12-vuotiaana kauas kotoa akatemiaan ja oli niin koti-ikävissään, että harkitsi lopettamista. Hän purki kaiken harjoitteluun ja jäi aina viimeisenä kentälle.': 'En ung spelare flyttade som 12-åring långt hemifrån till en akademi och var så hemsjuk att han funderade på att sluta. Han lade all sin längtan i träningen och stannade alltid kvar sist på planen.',
      '1v1 — passiivinen puolustaja': '1v1 — passiv försvarare',
      'Kaveri seisoo edessä, ei liiku. Käytä U-käännöstä tai saksea ohittaaksesi hänet! 20 kertaa. Yllätä kaveri.': 'Kompisen står framför, rör sig inte. Använd U-vändning eller sax för att gå förbi honom! 20 gånger. Överraska kompisen.',
      'Kaveri passiivisena: tee liike → ohita → kiihdytä. Kaveri voi liikkua hitaasti mutta ei ota palloa. 20 toistoa valitulla liikkeellä + 10 toistoa vapaasti valiten.': 'Kompisen passiv: gör finten → gå förbi → accelerera. Kompisen får röra sig långsamt men tar inte bollen. 20 repetitioner med vald finta + 10 repetitioner med fritt val.',
      'Puoli-aktiivinen puolustaja (saa liikkua mutta ei taklata): ohita käyttäen opittuja liikkeitä. 25 toistoa. Mikä liike toimii parhaiten sinulle?': 'Halvaktiv försvarare (får röra sig men inte tackla): gå förbi med hjälp av de inlärda finterna. 25 repetitioner. Vilken finta fungerar bäst för dig?',
      'Taso 2: liikkeen täytyy toimia täydessä nopeudessa, ennen kuin siirrytään täyteen 1v1:een.': 'Nivå 2: finten måste fungera i full fart innan du går vidare till full 1v1.',
      'Eräs teini halusi harjoitella niin kovasti, että hiipi salaa kuntosalille jonka käyttö oli nuorilta kielletty — kunnes valmentajat huomasivat ja lukitsivat oven. Into oli sammumaton.': 'En tonåring ville träna så hårt att han i smyg tog sig in i gymmet som ungdomar inte fick använda — tills tränarna märkte det och låste dörren. Ivern gick inte att släcka.',
      '1v1-mittaus — toimiiko pelissä?': '1v1-mätning — fungerar det i match?',
      'Pelaa 1v1-peliä kaverin kanssa 10 min. Laske: montako kertaa ohitit? Mitä liikettä käytit parhaiten?': 'Spela 1v1 mot en kompis i 10 min. Räkna: hur många gånger gick du förbi? Vilken finta använde du bäst?',
      'Täysi 1v1: 10 min peliä. Laske ohitukset. Arvioi: mikä liike toimi, mikä ei? Harjoittele heikkoa liikettä 10 min lisää.': 'Full 1v1: 10 min spel. Räkna passeringarna. Utvärdera: vilken finta fungerade, vilken inte? Träna den svaga finten 10 min till.',
      'Täysi 1v1-peli 15 min + itsearvio: opituista liikkeistä mitkä 3 ovat jo omassa repertuaarissa? Mitkä tarvitsevat lisää työtä?': 'Full 1v1 15 min + självutvärdering: av de inlärda finterna, vilka 3 finns redan i din repertoar? Vilka behöver mer arbete?',
      'Pelitesti: toimiiko liike oikeassa pelissä? Jos ei — palaa vk 1:een.': 'Speltest: fungerar finten i riktigt spel? Om inte — gå tillbaka till vecka 1.',
      'Eräs nuori pelaaja esiintyi harjoitusottelussa niin vakuuttavasti — ohitti puolustajan toisensa jälkeen — että vastustajajoukkueen valmentaja ei suostunut lähtemään ilman, että pelaaja saatiin tämän seuraan.': 'En ung spelare imponerade så mycket i en träningsmatch — gick förbi den ena försvararen efter den andra — att motståndarlagets tränare vägrade lämna platsen förrän spelaren värvats till hans klubb.',
      'Sisäteräsyöttö — tarkka ja toistettava': 'Insidepassning — precis och repeterbar',
      'Lähetä pallo seinälle ja yritä osua samaan kohtaan 10 kertaa peräkkäin. Tukijalka pallon viereen — ei taakse! Laske ennätys.': 'Skicka bollen mot väggen och försök träffa samma punkt 10 gånger i rad. Stödbenet bredvid bollen — inte bakom! Räkna ditt rekord.',
      'Sisäteräsyöttö 20 toistoa: tukijalka pallon viereen | nilkka lukossa | osuma pallon keskikohtaan. Sitten jalkapöytä maassa 20 toistoa: koko jalkapöydän yläpuoli osuu palloon. Mittaa tarkkuus.': 'Insidepassning 20 repetitioner: stödbenet bredvid bollen | vristen låst | träff mitt på bollen. Sedan vristspark längs marken 20 repetitioner: hela vristens ovansida träffar bollen. Mät precisionen.',
      'Syöttösarja muodot 1–3: sisäterä | jalkapöytä maassa | suora ilmapassi. 15 × kutakin. Mittaa: osumakohta pallossa (pitää olla keskikohta).': 'Passningsserie form 1–3: insida | vristspark längs marken | rak luftpassning. 15 × vardera. Mät: träffpunkten på bollen (ska vara mitten).',
      'Maestron sääntö: tukijalka ratkaisee suunnan, jalkapöytä ratkaisee nopeuden.': 'Maestros regel: stödbenet avgör riktningen, vristen avgör farten.',
      'Erään huippusyöttäjän isä ohjasi häntä puistossa myöhään iltoihin asti ja antoi pienen palkinnon jokaisesta osumasta poikkipalkkiin. Poika toisti laukauksia satoja kertoja illassa — tarkkuus syntyi noista toistoista.': 'En stjärnpassares pappa tränade honom i parken till sent på kvällarna och gav en liten belöning för varje träff i ribban. Pojken upprepade skotten hundratals gånger per kväll — precisionen föddes ur de repetitionerna.',
      'Syöttö — etäisyydet kasvavat': 'Passning — avstånden växer',
      'Syötä 5 metriin, sitten 10 metriin, sitten 15 metriin. Sama liike, pallo seuraa! Kumpi jalka on tarkempi?': 'Passa på 5 meter, sedan 10 meter, sedan 15 meter. Samma rörelse, bollen följer med! Vilken fot är mest precis?',
      'Syöttöprogressio: 10 m | 15 m | 20 m — sisäterä ja jalkapöytä. Mittaa tarkkuus joka etäisyydellä. Tavoite: 8/10 osuu kohteeseen.': 'Passningsprogression: 10 m | 15 m | 20 m — insida och vrist. Mät precisionen på varje avstånd. Mål: 8/10 träffar målet.',
      'Pitkä syöttö (kaareva/kierteinen, muoto 5) + ulkojalkapassi maassa (muoto 6). 15 toistoa kutakin. Mittaa kaartuma ja tarkkuus.': 'Lång passning (skruvad/kurvig, form 5) + utsidepass längs marken (form 6). 15 repetitioner vardera. Mät kurvan och precisionen.',
      'Teknisesti taitavat pelaajat pitävät pallon liikkeessä joka etäisyydellä.': 'Tekniskt skickliga spelare håller bollen i rörelse på alla avstånd.',
      'Eräs huippusyöttäjä voitti 11-vuotiaana suuren taitokilpailun ja pääsi palkinnoksi ulkomaiselle leirille — siellä hänet huomattiin ja ohjattiin kohti huippuseuraa. Taitokisamenestys avasi oven.': 'En stjärnpassare vann en stor tekniktävling som 11-åring och fick som pris åka på ett läger utomlands — där uppmärksammades han och slussades mot en toppklubb. Framgången i tekniktävlingen öppnade dörren.',
      'Syöttö kaverin kanssa — liikkuvaan kohteeseen': 'Passning med en kompis — till ett rörligt mål',
      'Kaveri juoksee — syötä hänelle niin että pallo tulee hänen eteen! Ei perään. 15 kertaa kummallakin jalalla.': 'Kompisen springer — passa så att bollen kommer framför honom! Inte bakom. 15 gånger med vardera foten.',
      'Kaveri juoksee ristiin — syötä eteen tilaan, ei pelaajalle itselleen. 20 syöttöä. Sitten: lyhyt vaihto (1/2-kombinaatio, muoto 10) — syötä, juokse, saa takaisin.': 'Kompisen springer i kryss — passa framför i ytan, inte till spelaren själv. 20 passningar. Sedan: kort växelspel (1/2-kombination, form 10) — passa, spring, få tillbaka.',
      'Läpisyöttö ulkojalalla (muoto 11) + keskitys maaliin päin (muoto 9). 10 × kutakin. Tarkkuus: osuu käytävään?': 'Genomskärare med utsidan (form 11) + inlägg mot mål (form 9). 10 × vardera. Precision: träffar bollen rätt löpyta?',
      'Syöttö on kommunikaatiota — pallo kertoo joukkuekaverille, minne mennä.': 'Passning är kommunikation — bollen talar om för lagkamraten vart han ska gå.',
      'Teininä eräs pelaaja liittyi huippuseuraan ja harjoitteli lahjakkaan nuorisoryhmän kanssa, josta moni nousi myöhemmin maailman huipulle. He voittivat yhdessä nuorten arvokisan — yhdessä kasvaminen nosti kaikkia.': 'Som tonåring gick en spelare med i en toppklubb och tränade med en begåvad ungdomsgrupp där många senare nådde världstoppen. Tillsammans vann de ett ungdomsmästerskap — att växa tillsammans lyfte alla.',
      'Syöttö-mittaus': 'Passningsmätning',
      'Laske: montako kertaa lähetät pallon tarkasti 10 metriin? Tee 20 syöttöä ja laske pisteet.': 'Räkna: hur många gånger skickar du bollen exakt på 10 meter? Gör 20 passningar och räkna poängen.',
      'Syöttöhaaste: 20 syöttöä, eri etäisyydet (10/15/20 m). Laske pisteet: tarkka osuma = 1 p. Vertaa: oletko parempi kuin joulukuun alussa?': 'Passningsutmaning: 20 passningar, olika avstånd (10/15/20 m). Räkna poäng: exakt träff = 1 p. Jämför: är du bättre än i början av december?',
      'Syöttösarja 11 muotoa — montako hallitset jo? Käy läpi ja arvioi itsesi. Harjoittele 2 heikkointa 10 min.': 'Passningsserie 11 former — hur många behärskar du redan? Gå igenom och utvärdera dig själv. Träna de 2 svagaste 10 min.',
      'Viidennen viikon periaate — harjoittele sitä, missä tulos jäi heikoimmaksi.': 'Femte veckans princip — träna det där resultatet blev svagast.',
      'Erään huippusyöttäjän valmentaja neuvoi katsomaan, miten parhaat lyövät pallon: sulava liike molemmin jaloin. Hän harjoitteli laukaisua molemmilla jaloilla niin kauan, että oikea ja vasen olivat lopulta yhtä tarkat.': 'En stjärnpassares tränare rådde honom att se hur de bästa slår bollen: en mjuk rörelse med båda fötterna. Han tränade avslutet med båda fötterna så länge att höger och vänster till slut var lika precisa.',
      'Pomppulaskuri': 'Studsräknare',
      'Pomputa palloa jalalla — montako kertaa peräkkäin saat ennen kuin se tippuu? Laske ja kirjaa ennätys. Yritä päihittää eilinen!': 'Jonglera bollen med foten — hur många gånger i rad klarar du innan den faller? Räkna och skriv upp ditt rekord. Försök slå gårdagens!',
      'Ponnauttelu vahvalla jalalla, tavoite 30 peräkkäistä. Pidä pallo matalalla (polven alapuolella), nilkka lukossa. Kun 30 onnistuu, vaihda heikkoon jalkaan.': 'Jonglering med starka foten, mål 30 i rad. Håll bollen lågt (under knähöjd), vristen låst. När 30 lyckas, byt till svaga foten.',
      'Ponnauttelu molemmin jaloin vuorotellen, pallo polven korkeudella, tavoite 50 peräkkäistä. Lisää reisi- ja olkapääkosketukset sekaan rytmiä rikkomatta.': 'Jonglering växelvis med båda fötterna, bollen i knähöjd, mål 50 i rad. Lägg in lår- och axeltouchar utan att bryta rytmen.',
      'Ronaldinho: ponnauttelu opettaa pallon kielen — kuinka se reagoi jokaiseen kosketukseen.': 'Ronaldinho: jongleringen lär dig bollens språk — hur den reagerar på varje touch.',
      'Reisi–jalka-rytmi': 'Lår–fot-rytm',
      'Pomputa näin: reisi → jalka → reisi → jalka. Pidä rytmi kuin laulussa. Montako kierrosta jaksat ilman tippumista?': 'Jonglera så här: lår → fot → lår → fot. Håll rytmen som i en sång. Hur många varv orkar du utan att tappa bollen?',
      'Yhdistelmäponnauttelu: reisi–jalka–reisi yhdellä jalalla, sitten vaihto toiseen. 5 kierrosta ilman tippumista. Kontrolli ennen vauhtia.': 'Kombinationsjonglering: lår–fot–lår med en fot, sedan byte till den andra. 5 varv utan att tappa bollen. Kontroll före fart.',
      'Vapaa ponnauttelusarja: reisi, sisäterä, ulkojalka, olkapää — vaihtele kosketuspintaa rytmiä menettämättä. 2 min yhtäjaksoisesti.': 'Fri jongleringsserie: lår, insida, utsida, axel — växla träffyta utan att tappa rytmen. 2 min i sträck.',
      'Pallo tottelee sitä jolla on tuntuma jokaisesta pinnasta.': 'Bollen lyder den som har känsla för varje yta.',
      'Seinäponnautus': 'Väggstuds',
      'Potkaise pallo seinään ilmaan ja ota se haltuun ilmasta ennen kuin se osuu maahan. 10 onnistunutta!': 'Sparka upp bollen i luften mot väggen och ta den i luften innan den nuddar marken. 10 lyckade!',
      'Seinäponnautus: syötä seinään ilmaan, vastaanota ilmasta yhdellä pehmeällä kosketuksella, ponnauta takaisin. 15 kosketusta ilman maahantippumista.': 'Väggstuds: passa upp i luften mot väggen, ta emot i luften med en mjuk touch, jonglera tillbaka. 15 touchar utan att bollen faller till marken.',
      'Seinäponnautus vuorojaloin: ensimmäinen kosketus pehmentää, toinen syöttää. 20 toistoa + skannaa: nimeä kohde ennen jokaista syöttöä.': 'Väggstuds växelvis fot: första touchen dämpar, andra passar. 20 repetitioner + skanna: namnge målet före varje passning.',
      'Ilmapallon hallinta erottaa pelaajan joka pelaa nopeudella.': 'Att behärska bollen i luften skiljer ut spelaren som spelar med fart.',
      'Kiihdytys pallon kanssa': 'Acceleration med bollen',
      'Kuljeta pallo niin nopeasti kuin pystyt 10 metriä, pysäytä, ja takaisin. Pallo pysyy lähellä! 6 kertaa täysillä, hengähdä välissä.': 'För bollen så snabbt du kan 10 meter, stanna, och tillbaka. Bollen håller sig nära! 6 gånger för fullt, andas ut emellan.',
      'Kiihdytysvedot pallon kanssa: 0–15 m maksimivauhtia, pallo enintään askeleen päässä. 6 toistoa, täysi palautus välissä. Pysyykö pallo hallinnassa täydessä vauhdissa?': 'Accelerationsryck med bollen: 0–15 m i maxfart, bollen högst ett steg bort. 6 repetitioner, full vila emellan. Håller du bollen under kontroll i full fart?',
      'Kiihdytys pallolla 20 m, viimeiset 5 m ilman katsetta palloon (skannaa eteen). 8 toistoa. Vertaa: kuljetus ilman palloa vs. pallon kanssa (TSI-erotus).': 'Acceleration med bollen 20 m, de sista 5 m utan att titta på bollen (skanna framåt). 8 repetitioner. Jämför: löpning utan boll mot med boll (TSI-skillnaden).',
      'Nopeus pallon kanssa on eri taito kuin nopeus ilman — sitä harjoitellaan erikseen.': 'Fart med bollen är en annan färdighet än fart utan — den tränas separat.',
      'Suunnanmuutos kartioilla': 'Riktningsförändring med koner',
      '3 merkkiä lattiaan — kivi, reppu tai paita käy — 5 metrin välein. Kuljeta pallo, käänny terävästi jokaisella, kiihdytä. 8 kertaa.': '3 markeringar på marken — en sten, en ryggsäck eller en tröja duger — med 5 meters mellanrum. För bollen, vänd skarpt vid varje, accelerera. 8 gånger.',
      'Suunnanmuutosrata: kartiot 5 m välein, terävä 90° käännös jokaisella + välitön kiihdytys ulos. Pallo lähellä käännöksessä. 8 läpimenoa, ajanotto.': 'Riktningsbana: koner med 5 m mellanrum, skarp 90°-vändning vid varje + direkt acceleration ut. Bollen nära i vändningen. 8 genomgångar, tidtagning.',
      'Suunnanmuutos täydessä vauhdissa: 180° käännös pysäytyksellä + räjähtävä lähtö vastakkaiseen suuntaan, molemmat jalat. 10 toistoa, mittaa palautumisaika.': 'Riktningsförändring i full fart: 180°-vändning med stopp + explosiv start i motsatt riktning, båda fötterna. 10 repetitioner, mät återhämtningstiden.',
      'Pelin nopeus on suunnanmuutosnopeutta, ei suoraa juoksua.': 'Spelets fart är fart i riktningsförändringar, inte rak löpning.',
      'Reaktiolähtö': 'Reaktionsstart',
      'Kaveri huutaa "NYT!" — lähde silloin pallon kanssa täysillä 5 metriä. Tai heittämäsi pallo pomppaa merkiksi — lähde heti! 8 kertaa.': 'Kompisen ropar "NU!" — starta då med bollen för fullt 5 meter. Eller en boll du kastar studsar som signal — starta direkt! 8 gånger.',
      'Reaktiolähtö: odota merkkiä (kaverin huuto tai käsimerkki), lähde pallolla räjähtävästi 5–10 m. 8 toistoa. Kuinka nopeasti reagoit ja olet täydessä vauhdissa?': 'Reaktionsstart: vänta på en signal (kompisens rop eller handtecken), starta explosivt med bollen 5–10 m. 8 repetitioner. Hur snabbt reagerar du och är i full fart?',
      'Reaktiolähtö valinnalla: kaveri osoittaa suunnan merkkihetkellä, lähde sinne pallolla. 10 toistoa. Yhdistä havainto + kiihdytys — tämä on pelin lähtö.': 'Reaktionsstart med val: kompisen pekar ut riktningen vid signalen, starta dit med bollen. 10 repetitioner. Kombinera perception + acceleration — det här är spelets start.',
      'Ensimmäinen askel ratkaisee — reaktio + kiihdytys voittaa metrit.': 'Första steget avgör — reaktion + acceleration vinner metrarna.',
    },
    // KOHDE_NIMET (pienellä, interpoloituu miksi_lause1:een)
    kohde_nimet: { pallonhallinta: 'bollkontroll', koordinaatio: 'koordination', nopeus: 'snabbhet', syotto: 'passning', ponnauttelu: 'jonglering' },
    // Kortin yläotsikko (isolla) — tmKohdeOtsikko()
    kohde_otsikko: { pallonhallinta: 'Bollkontroll', koordinaatio: 'Koordination', nopeus: 'Snabbhet', syotto: 'Passning', ponnauttelu: 'Jonglering' },
    // generoiMiksiteksti: lause 2 (kohde × ikävaihe)
    miksi_lause2: {
      pallonhallinta: { leikkija: 'Varje touch gör bollen mer bekant.', rakentaja: 'När du automatiserar kontrollen frigör du tankarna till spelet.', showcase: 'Teknisk automatik är det som skiljer proffsnivå från amatörnivå.' },
      koordinaatio:   { leikkija: 'Kroppen lär sig röra sig bättre tillsammans.', rakentaja: 'Koordination är grunden för allt annat.', showcase: 'Rörelsekontroll i full fart är det som tekniken vilar på.' },
      nopeus:         { leikkija: 'Snabba fötter gör spelet roligare.', rakentaja: 'Fart med bollen är en egen färdighet — den går att träna.', showcase: 'Neuromuskulär träning bygger explosivitet.' },
      syotto:         { leikkija: 'En precis passning håller bollen hos kompisarna.', rakentaja: 'Passningen är lagets språk — precision öppnar spelet.', showcase: 'Passningens precision och vikt avgör anfallets tempo.' },
      ponnauttelu:    { leikkija: 'Jongleringen lär dig bollens rörelser.', rakentaja: 'Jongleringen bygger touch-precision mot varje yta.', showcase: 'Att behärska bollen i luften är grunden för första touchen under press.' },
    },
    // generoiMiksiteksti: lause 1 (mallit; {kohde} ja {s} korvataan)
    miksi_l1: {
      tki: 'Din tekniktävling visade att {kohde} är ett tillväxtområde.',
      tsi: 'Mätningen visar att bollen saktar ner dig {s} sekunder.',
      hh: 'Din fysiska profil visar var utveckling ger mest.',
      leikkija: 'Du är precis i rätt ålder för att lära dig det här.',
      rakentaja: 'Nu är stunden då den här färdigheten fastnar djupast.',
      showcase: 'Det här är det område som skiljer en bra spelare från en utmärkt.',
    },
    // generoiMiksiteksti: lause 3
    miksi_l3: { leikkija: 'Gör det här varje dag så börjar bollen lyda.', muu: 'Gör det här i 14 dagar → testa igen → se skillnaden.' },
    // V4-A2: Pelaaja_v7:n inline S-pankki (HARJOITEPANKKI v5) + why-lauseet (S/D) + S-kortin labelit.
    // Erillinen sisalto-kartasta → V4-A:n orpo-avain-invariantti sailyy; _hT tarkistaa molemmat.
    pelaaja: {
      'Naruhypyt': 'Hopprep',
      'Hyppää hyppynarulla tasajalkaa 15 sekuntia, pidä tauko 15 s ja toista 3 kertaa. Pyri mahdollisimman lyhyeen maakosketukseen — pompi kevyesti päkiöillä.': 'Hoppa hopprep med samlade fötter i 15 sekunder, vila 15 s och upprepa 3 gånger. Sträva efter så kort markkontakt som möjligt — studsa lätt på trampdynorna.',
      'Pohjevenytys seinää vasten': 'Vadstretch mot vägg',
      'Aseta kädet seinälle, vie toinen jalka taakse suoraksi ja paina kantapää maahan. Pidä 30 s, vaihda puolta. Tee 2 kertaa per puoli.': 'Placera händerna mot väggen, för ena benet rakt bakåt och tryck ner hälen i marken. Håll 30 s, byt sida. Gör 2 gånger per sida.',
      'Lantiotaivutus kepillä': 'Höftfällning med käpp',
      'Pidä keppiä (tai harjanvartta) selän takana kiinni hartioissa ja alaselässä. Taivuta lantiosta eteenpäin selkä suorana — kuin kumartaisit kohteliaasti. 3 sarjaa, 10 toistoa. Polvet hieman koukussa.': 'Håll en käpp (eller ett kvastskaft) bakom ryggen mot skuldrorna och ländryggen. Fäll framåt från höften med rak rygg — som en artig bugning. 3 set, 10 repetitioner. Knäna lätt böjda.',
      'Krokotiili-kävely': 'Krokodilgång',
      'Punnerrusasennossa kävele käsillä eteenpäin 10 metriä pitäen lonkat ylhäällä — älä anna vatsan roikkua. Pidä tauko, kävele takaisin. Tee 2 kertaa.': 'I armhävningsläge, gå framåt på händerna 10 meter med höfterna uppe — låt inte magen hänga. Vila, gå tillbaka. Gör 2 gånger.',
      'Naruhypyt + pohjenosto': 'Hopprep + vadpress',
      'Hyppää narulla 15 s (3 sarjaa), sitten nouse yhdellä jalalla varpaille ja laske hitaasti 3 s alas. 3 sarjaa, 10 toistoa per jalka.': 'Hoppa rep 15 s (3 set), res dig sedan på tå på ett ben och sänk långsamt ner på 3 s. 3 set, 10 repetitioner per ben.',
      'Loikkasarjat': 'Hoppserier',
      'Juokse 5 pitkää vauhtiloikkaa peräkkäin — ponnista voimakkaasti ja laskeudu pehmeästi jalkaa vaihtaen. 3 sarjaa, kävele takaisin palautukseksi.': 'Spring 5 långa satshopp i rad — sätt av kraftigt och landa mjukt med benbyte. 3 set, gå tillbaka som vila.',
      'Takareiden hallintalasku': 'Baklårets kontrollerade sänkning',
      'Polvillaan, kaveri pitää nilkoista kiinni. Kaadu hitaasti eteenpäin vartalo suorana — jarruta takareidellä niin pitkälle kuin jaksat, sitten työnnä käsillä ylös. 3 sarjaa, 5 toistoa. Ei kaveria? Kiinnitä nilkat esim. sängyn alle.': 'På knä, en kompis håller fast dina vrister. Fall långsamt framåt med rak kropp — bromsa med baklåren så långt du orkar, tryck sedan upp med händerna. 3 set, 5 repetitioner. Ingen kompis? Fäst vristerna t.ex. under sängen.',
      'Reaktiolähtö pallolla': 'Reaktionsstart med boll',
      'Kaveri heittää pallon 15 m päähän — lähde heti perään täysillä. 6 toistoa, kävele takaisin palautukseksi. Yksin? Potkaise pallo itse ja spurttaa perään.': 'En kompis kastar bollen 15 m bort — starta direkt efter för fullt. 6 repetitioner, gå tillbaka som vila. Ensam? Sparka bollen själv och spurta efter.',
      'Yhden jalan taivutus': 'Enbensfällning',
      'Seiso yhdellä jalalla, taivuta lantiosta eteenpäin selkä suorana ja vie toinen jalka taakse suoraksi — kuin vaaka. 3 sarjaa, 10 toistoa per jalka. Hitaasti ja hallitusti.': 'Stå på ett ben, fäll framåt från höften med rak rygg och för det andra benet rakt bakåt — som en vågbalans. 3 set, 10 repetitioner per ben. Långsamt och kontrollerat.',
      'Naruhypyt yhdellä jalalla': 'Hopprep på ett ben',
      'Hyppää narulla yhdellä jalalla 10 hyppyä, vaihda. 3 sarjaa per jalka. Pidä rytmi nopeana ja kontakti lyhyenä.': 'Hoppa rep på ett ben 10 hopp, byt. 3 set per ben. Håll rytmen snabb och markkontakten kort.',
      'Maksimaalinen kiihdytys': 'Maximal acceleration',
      'Spurttaa 20 m täysillä lähtöviivalta. Kävele takaisin ja hengitä 60–90 s ennen seuraavaa. 4 toistoa. Keskity räjähtävään ensimmäiseen askeleeseen.': 'Spurta 20 m för fullt från startlinjen. Gå tillbaka och andas 60–90 s före nästa. 4 repetitioner. Fokusera på ett explosivt första steg.',
      'Takareiden hallintalasku + yhden jalan taivutus': 'Baklårets kontrollerade sänkning + enbensfällning',
      'Ensin hallintalasku polvilta: 3 sarjaa, 6 toistoa (kaveri pitää nilkoista). Sitten yhden jalan taivutus pienellä lisäpainolla (reppu/vesipullo): 3 sarjaa, 8 toistoa per jalka.': 'Först kontrollerad sänkning från knä: 3 set, 6 repetitioner (en kompis håller vristerna). Sedan enbensfällning med lite extravikt (ryggsäck/vattenflaska): 3 set, 8 repetitioner per ben.',
      'Reaktionopeus + sprintti': 'Reaktionssnabbhet + sprint',
      'Seiso selin maaliin. Kaverin merkistä käänny ja spurttaa 15 m. Tavoite alle 1.8 s. 6 toistoa, palautus 60 s. Yksin? Käytä ajastinta ja äänisignaalia.': 'Stå med ryggen mot mål. På kompisens signal, vänd och spurta 15 m. Mål under 1.8 s. 6 repetitioner, vila 60 s. Ensam? Använd en timer och en ljudsignal.',
      'Lonkankoukistajan avaus': 'Höftböjaröppning',
      'Polvistu yhdelle polvelle, toinen jalka edessä 90 asteen kulmassa. Työnnä lantiota kevyesti eteenpäin kunnes tunnet venytyksen lonkan edessä. Pidä 30 s, vaihda puolta. Tee 2 kertaa per puoli. Hengitä rauhallisesti.': 'Knäböj på ett knä, det andra benet framför i 90 graders vinkel. Skjut höften lätt framåt tills du känner stretchen framtill i höften. Håll 30 s, byt sida. Gör 2 gånger per sida. Andas lugnt.',
      'Askelkyykky-kävely': 'Utfallsgång',
      'Ota pitkä askel eteenpäin ja laskeudu niin, että takapolvi melkein koskettaa maata. Nouse ja astu seuraava. 2 sarjaa, 8 metriä. Pidä yläkroppa pystyssä ja katse eteenpäin.': 'Ta ett långt steg framåt och sänk dig så att det bakre knät nästan nuddar marken. Res dig och ta nästa steg. 2 set, 8 meter. Håll överkroppen upprätt och blicken framåt.',
      'Sammakkohypyt': 'Grodhopp',
      'Kyykisty alas, kädet lattiassa kuin sammakko. Loikkaa eteenpäin ja laskeudu pehmeästi takaisin kyykkyyn. 2 sarjaa, 5 hyppyä. Keskity pehmeään alastuloon.': 'Sätt dig på huk med händerna i marken som en groda. Hoppa framåt och landa mjukt tillbaka i hukläge. 2 set, 5 hopp. Fokusera på en mjuk landning.',
      'Lonkanvenytys polvillaan': 'Höftstretch på knä',
      'Mene toispolviseisontaan (toinen polvi maassa, toinen jalka edessä). Paina lantiota eteenpäin ja alas kunnes venyttää lonkan edessä. 2 sarjaa, 30 s per puoli.': 'Ställ dig på ett knä (ena knät i marken, andra benet framför). Skjut höften framåt och nedåt tills det stretchar framtill i höften. 2 set, 30 s per sida.',
      'Lonkankoukistajan avaus + hengitys': 'Höftböjaröppning + andning',
      'Sama asento kuin perusversio, mutta pidä 45 s per puoli. Hengitä sisään nenän kautta, ulos suun kautta — joka uloshengityksellä rentoudu syvemmälle venytykseen. 3 sarjaa per puoli.': 'Samma läge som grundversionen, men håll 45 s per sida. Andas in genom näsan, ut genom munnen — slappna av djupare in i stretchen vid varje utandning. 3 set per sida.',
      'Askelkyykky-kävely pitkä': 'Utfallsgång lång',
      'Askelkyykky-kävelyä 15 metriä yhteen suuntaan. Pidä lantio vakaana koko matkan — ei keinumista sivulle. 2 sarjaa. Kävele takaisin palautukseksi.': 'Utfallsgång 15 meter åt ett håll. Håll höften stabil hela vägen — ingen vaggning i sidled. 2 set. Gå tillbaka som vila.',
      'Vauhditon pituushyppy': 'Längdhopp utan ansats',
      'Seiso paikallaan, heilauta kädet ja hyppää mahdollisimman pitkälle. Laskeudu pehmeästi molemmille jaloille polvet joustavina. 3 sarjaa, 3 hyppyä. Laatu tärkeämpää kuin matka.': 'Stå stilla, sving med armarna och hoppa så långt som möjligt. Landa mjukt på båda fötterna med fjädrande knän. 3 set, 3 hopp. Kvalitet är viktigare än längd.',
      'Syväkyykky-sarja': 'Djuphukserie',
      'Kyykisty aivan alas (kantapäät maassa) ja pidä asento 30 s — selkä suorana, kädet edessä tasapainoksi. Sitten nouse ylös 5 kertaa hitaasti. 3 sarjaa.': 'Sätt dig helt ner på huk (hälarna i marken) och håll läget 30 s — rak rygg, händerna framför som balans. Res dig sedan upp 5 gånger långsamt. 3 set.',
      'Lonkan pidätys': 'Höfthållning',
      'Seiso yhdellä jalalla, nosta toisen jalan polvi ylös 90 asteeseen ja pidä paikallaan 20 s. Älä nojaa — pidä kroppa suorana. 3 sarjaa per puoli.': 'Stå på ett ben, lyft det andra benets knä upp till 90 grader och håll stilla 20 s. Luta dig inte — håll kroppen rak. 3 set per sida.',
      'Aktiivinen lonkan nostelu': 'Aktiva höftlyft',
      'Selinmakuulla nosta polvi rintaan, ojenna jalka suoraksi ylös ja laske hallitusti. 3 sarjaa, 10 toistoa per jalka. Täysi liikerata, ei vauhtia.': 'Ligg på rygg, lyft knät mot bröstet, sträck benet rakt upp och sänk kontrollerat. 3 set, 10 repetitioner per ben. Full rörelsebana, ingen fart.',
      'Bulgarialainen kyykky': 'Bulgarisk split-knäböj',
      'Aseta takajalka tuolille tai portaalle. Kyykisty etujalalla alas niin, että takapolvi melkein koskettaa maata. 3 sarjaa, 10 toistoa per jalka. Pidä paino etujalalla.': 'Placera det bakre benet på en stol eller trappa. Böj ner på det främre benet så att det bakre knät nästan nuddar marken. 3 set, 10 repetitioner per ben. Håll vikten på det främre benet.',
      'Räjähtävä askelkyykky': 'Explosivt utfall',
      'Tee askelkyykky ja ponnista ylös niin, että vaihdat jalkojen paikkaa ilmassa. 3 sarjaa, 6 toistoa (3 per puoli). Laskeudu pehmeästi.': 'Gör ett utfall och sätt av uppåt så att du byter fötternas plats i luften. 3 set, 6 repetitioner (3 per sida). Landa mjukt.',
      'Yhden jalan portaalle nousu': 'Enbensuppsteg',
      'Seiso portaan tai tuolin edessä. Nouse yhdellä jalalla ylös hallitusti ja laske hitaasti alas. 3 sarjaa, 10 toistoa per jalka. Älä ponnista takajalalla.': 'Stå framför en trappa eller stol. Kliv upp på ett ben kontrollerat och sänk långsamt ner. 3 set, 10 repetitioner per ben. Sätt inte av med det bakre benet.',
      'Simpukka': 'Musslan',
      'Makaa kyljellä, polvet koukussa jalat yhdessä. Avaa ylempi polvi ylös kuin simpukka aukeaa — pidä jalkapohjat yhdessä. 2 sarjaa, 10 toistoa per puoli. Hitaasti, älä käännä lantiota.': 'Ligg på sidan med böjda knän och fötterna ihop. Öppna det övre knät uppåt som en mussla öppnas — håll fotsulorna ihop. 2 set, 10 repetitioner per sida. Långsamt, vrid inte höften.',
      'Sivulankku polvilta': 'Sidoplanka från knä',
      'Makaa kyljellä, nouse kyynärvarren ja polvien varaan. Nosta lantio ylös suoraksi linjaksi ja pidä 15 s. 2 sarjaa per puoli. Älä anna lantion vajota.': 'Ligg på sidan, res dig upp på underarmen och knäna. Lyft höften upp till en rak linje och håll 15 s. 2 set per sida. Låt inte höften sjunka.',
      'Sivuloikat': 'Sidohopp',
      'Seiso yhdellä jalalla ja loikkaa sivulle toiselle jalalle. Laskeudu pehmeästi polvi joustavana ja pidä tasapaino hetki. 2 sarjaa, 6 loikkaa per puoli.': 'Stå på ett ben och hoppa i sidled till det andra benet. Landa mjukt med fjädrande knä och håll balansen en stund. 2 set, 6 hopp per sida.',
      'Leveä kyykky': 'Bred knäböj',
      'Seiso leveässä haara-asennossa, varpaat hieman ulospäin. Kyykisty alas niin pitkälle kuin pääset kantapäät maassa ja selkä suorana. Pidä 30 s. 2 sarjaa. Kädet edessä tasapainoksi.': 'Stå brett med tårna lätt utåt. Böj ner så långt du kommer med hälarna i marken och rak rygg. Håll 30 s. 2 set. Händerna framför som balans.',
      'Simpukka + sivulankku': 'Musslan + sidoplanka',
      'Ensin simpukka 12 toistoa per puoli (3 sarjaa). Sitten sivulankku suorilla jaloilla: nouse kyynärvarren ja jalkaterän varaan, pidä 20 s per puoli (2 sarjaa).': 'Först musslan 12 repetitioner per sida (3 set). Sedan sidoplanka med raka ben: res dig upp på underarmen och foten, håll 20 s per sida (2 set).',
      'Luisteluaskeleet': 'Skridskosteg',
      'Liiku sivuttain pitkillä askeleilla kuin luistelija — työnnä ponnistusjalalla ja laskeudu pehmeästi toiselle. 2 sarjaa, 20 metriä. Pidä asento matalana.': 'Rör dig i sidled med långa steg som en skridskoåkare — skjut ifrån med avstampsbenet och landa mjukt på det andra. 2 set, 20 meter. Håll låg ställning.',
      'Sivuloikat + pysäytys': 'Sidohopp + stopp',
      'Loikkaa sivulle ja laskeudu yhdelle jalalle. Pidä paikallaan 2 s täysin vakaana ennen seuraavaa loikkaa. 3 sarjaa, 8 loikkaa per puoli.': 'Hoppa i sidled och landa på ett ben. Håll stilla helt stabilt i 2 s före nästa hopp. 3 set, 8 hopp per sida.',
      'T-juoksu kartioilla': 'T-löpning med koner',
      'Aseta kartiot T-muotoon (5+5+5 m). Spurttaa eteen, sivuaskella vasemmalle, sivuaskella oikealle, peruuta alkuun. 3 toistoa omalla ajalla. Keskity nopeisiin suunnanmuutoksiin.': 'Placera koner i T-form (5+5+5 m). Spurta framåt, sidosteg åt vänster, sidosteg åt höger, backa till start. 3 repetitioner i egen takt. Fokusera på snabba riktningsförändringar.',
      'Reiden lähentäjien hallintalasku': 'Kontrollerad sänkning för lårets inåtförare',
      'Seiso leveässä haara-asennossa ja liu\'u hitaasti sivulle toiselle jalalle — 3 s lasku. Työnnä takaisin keskelle. 3 sarjaa, 10 toistoa per puoli. Hidas liike on tärkeää.': 'Stå brett och glid långsamt i sidled ner på det ena benet — 3 s sänkning. Tryck tillbaka till mitten. 3 set, 10 repetitioner per sida. Den långsamma rörelsen är viktig.',
      'Yhden jalan kyykky sivulle': 'Enbensknäböj åt sidan',
      'Seiso yhdellä jalalla, kyykisty alas ja vie toinen jalka sivulle suoraksi. Nouse takaisin ylös. 3 sarjaa, 8 toistoa per puoli. Pidä kantapää maassa.': 'Stå på ett ben, böj ner och för det andra benet rakt ut åt sidan. Res dig tillbaka upp. 3 set, 8 repetitioner per sida. Håll hälen i marken.',
      'Luistelijahyppy': 'Skridskohopp',
      'Loikkaa voimakkaasti sivulle ja laskeudu yhdelle jalalle — kuin pikaluistelija. 3 sarjaa, 8 hyppyä per puoli. Räjähtävästi sivulle, pehmeästi alas.': 'Hoppa kraftigt i sidled och landa på ett ben — som en skridskoåkare. 3 set, 8 hopp per sida. Explosivt i sidled, mjukt ner.',
      'T-juoksu täydellä vauhdilla': 'T-löpning i full fart',
      'Sama T-kartiorata kuin aiemmin, mutta nyt täysillä. 5 toistoa, tavoite alle 9.5 s. Palautus 60 s toiston välissä. Keskity teräviin käännöksiin.': 'Samma T-konbana som tidigare, men nu för fullt. 5 repetitioner, mål under 9.5 s. Vila 60 s mellan repetitionerna. Fokusera på skarpa vändningar.',
      'Reiden lähentäjien sivulankku': 'Sidoplanka för lårets inåtförare',
      'Makaa kyljellä, alempi jalka korokkeella (tuoli/penkki). Nosta lantiota ylös alemman jalan reiden lähentäjillä. Kaveri voi tukea ylempää jalkaa, tai pidä se ilmassa. 3 sarjaa, 8 toistoa per puoli.': 'Ligg på sidan med det nedre benet på en förhöjning (stol/bänk). Lyft höften uppåt med det nedre benets inåtförare. En kompis kan stödja det övre benet, eller håll det i luften. 3 set, 8 repetitioner per sida.',
      'Seinäsyöttörutiini': 'Väggpassningsrutin',
      'Seiso 2 m seinästä ja syötä palloa seinään vuorotellen oikealla ja vasemmalla jalalla. Kierrä yläkroppaa jokaisessa syötössä. 3 sarjaa, 20 syöttöä (10 per jalka).': 'Stå 2 m från väggen och passa bollen mot väggen växelvis med höger och vänster fot. Vrid överkroppen vid varje passning. 3 set, 20 passningar (10 per fot).',
      'Ponnauttelu': 'Jonglering',
      'Ponnauttele palloa jalalta toiselle 1 minuutti yhtäjaksoisesti. Pidä pallo lähellä ja kosketus pehmeänä. 2 sarjaa, 1 min taukoa välissä.': 'Jonglera bollen från fot till fot i 1 minut i sträck. Håll bollen nära och touchen mjuk. 2 set, 1 min paus emellan.',
      'Sivupotku seinää vasten': 'Sidospark mot vägg',
      'Seiso sivuttain seinän vieressä. Potkaise palloa seinään kääntämällä yläkroppaa — kierto lähtee kyljistä. 2 sarjaa, 8 toistoa per puoli.': 'Stå sidledes bredvid väggen. Sparka bollen mot väggen genom att vrida överkroppen — vridningen startar från sidorna. 2 set, 8 repetitioner per sida.',
      'Kyykky kierrolla': 'Knäböj med vridning',
      'Kyykisty alas ja noustessa kierrä yläkroppaa vuorotellen vasemmalle ja oikealle. Lantio seuraa kierron suuntaa. 2 sarjaa, 6 toistoa per puoli. Rauhallisesti.': 'Böj ner och vrid överkroppen växelvis åt vänster och höger när du reser dig. Höften följer vridningens riktning. 2 set, 6 repetitioner per sida. Lugnt.',
      'Suunnanmuutos pallolla seinään': 'Riktningsförändring med boll mot vägg',
      'Kuljeta palloa seinää kohti, tee suunnanmuutos ja syötä seinään. Ota haltuun ja toista. 3 sarjaa, 3 min per sarja. Keskity kiertoliikkeen laatuun, ei vauhtiin.': 'För bollen mot väggen, gör en riktningsförändring och passa mot väggen. Ta emot och upprepa. 3 set, 3 min per set. Fokusera på vridrörelsens kvalitet, inte farten.',
      'Seinäsyöttö kierrolla': 'Väggpassning med vridning',
      'Syötä palloa seinään ja käännä koko yläkroppa aktiivisesti jokaisessa kosketuksessa — kuin pelissä. 3 sarjaa, 25 syöttöä.': 'Passa bollen mot väggen och vrid hela överkroppen aktivt vid varje touch — som i match. 3 set, 25 passningar.',
      'Vinolankku kierrolla': 'Roterande planka',
      'Mene lankkuasentoon kämmenten varaan. Nosta toinen käsi kohti kattoa kääntyen sivulankkuun, palaa ja vaihda puolta. 3 sarjaa, 15 s per puoli.': 'Gå till plankläge på handflatorna. Lyft ena handen mot taket och vrid till sidoplanka, återgå och byt sida. 3 set, 15 s per sida.',
      'Pallon heitto kierrolla': 'Bollkast med vridning',
      'Pidä jalkapalloa (tai mitä tahansa palloa) käsissä. Seiso sivuttain seinään ja heitä pallo seinään koko kehon kiertoliikkeellä — voima tulee lantiosta. 3 sarjaa, 8 toistoa per puoli.': 'Håll en fotboll (eller vilken boll som helst) i händerna. Stå sidledes mot väggen och kasta bollen mot väggen med hela kroppens vridrörelse — kraften kommer från höften. 3 set, 8 repetitioner per sida.',
      'Istuen pallokierto': 'Sittande bollvridning',
      'Istu lattialla polvet koukussa, jalat ilmassa. Pidä palloa käsissä ja kierrä yläkroppaa puolelta toiselle koskettaen pallolla lattiaa vuorotellen. 3 sarjaa, 10 toistoa per puoli. Selkä suorana.': 'Sitt på golvet med böjda knän och fötterna i luften. Håll bollen i händerna och vrid överkroppen från sida till sida och nudda golvet med bollen växelvis. 3 set, 10 repetitioner per sida. Rak rygg.',
      'Suunnanmuutos pelivauhdilla': 'Riktningsförändring i spelfart',
      'Kuljeta palloa ja tee suunnanmuutoksia seinäsyöttöjen kanssa täydellä nopeudella. 3 sarjaa, 5 min per sarja. Reagoi nopeasti, älä pysähdy.': 'För bollen och gör riktningsförändringar med väggpassningar i full fart. 3 set, 5 min per set. Reagera snabbt, stanna inte.',
      'Pallon kiertoheitto täysillä': 'Roterande bollkast för fullt',
      'Seiso sivuttain seinään, pallo käsissä. Heitä seinään koko vartalon kierrolla mahdollisimman kovaa. 3 sarjaa, 8 toistoa per puoli. Voima lantiosta asti.': 'Stå sidledes mot väggen med bollen i händerna. Kasta mot väggen med hela kroppens vridning så hårt som möjligt. 3 set, 8 repetitioner per sida. Kraften ända från höften.',
      'Vastustettu kierto': 'Motstånd mot vridning',
      'Kiinnitä kuminauha seinään lantion korkeudelle. Seiso sivuttain ja työnnä kädet suoraksi eteenpäin — kuminauha vetää sivulle, sinä vastustat. Pidä 3 s. 3 sarjaa, 10 toistoa per puoli.': 'Fäst ett gummiband i väggen i höfthöjd. Stå sidledes och skjut armarna rakt framåt — gummibandet drar åt sidan, du håller emot. Håll 3 s. 3 set, 10 repetitioner per sida.',
      'Pallon heitto hyppykierrolla': 'Bollkast med hoppvridning',
      'Sama kiertoheitto seinään kuin aiemmin, mutta hyppää ja kierrä ilmassa ennen heittoa. 3 sarjaa, 6 toistoa per puoli. Räjähtävä kiertovoima.': 'Samma roterande kast mot väggen som tidigare, men hoppa och vrid i luften före kastet. 3 set, 6 repetitioner per sida. Explosiv vridkraft.',
      'Syvähengitys': 'Djupandning',
      'Makaa selälläsi, kädet vatsan päällä. Hengitä nenän kautta sisään 4 s niin, että vatsa, kyljet JA selkä laajenevat. Puhalla suun kautta ulos 6 s. 3 sarjaa, 5 hengitystä.': 'Ligg på rygg med händerna på magen. Andas in genom näsan i 4 s så att mage, sidor OCH rygg vidgas. Blås ut genom munnen i 6 s. 3 set, 5 andetag.',
      'Selkämakuuliike': 'Ryggliggande rörelse',
      'Makaa selälläsi, nosta polvet 90 asteeseen. Ojenna hidas vastakkainen käsi ja jalka suoraksi (oikea käsi + vasen jalka) ja palauta. Pidä alaselkä lattiassa KOKO AJAN. 3 sarjaa, 4 toistoa per puoli.': 'Ligg på rygg, lyft knäna till 90 grader. Sträck långsamt ut motsatt arm och ben rakt (höger arm + vänster ben) och återför. Håll ländryggen mot golvet HELA TIDEN. 3 set, 4 repetitioner per sida.',
      'Kehonhallinnan perusliikkeet': 'Kroppskontrollens grundrörelser',
      'Tee 10 min rutiini: 10× kyykky (selkä suorana) + 10× askelkyykky + 10× hyvää huomenta -taivutus (kädet niskassa, taivuta lantiosta) + 10× punnerrus polvilta. Toista 2 kierrosta.': 'Gör en 10 min-rutin: 10× knäböj (rak rygg) + 10× utfall + 10× good morning-fällning (händerna i nacken, fäll från höften) + 10× armhävning från knä. Upprepa 2 varv.',
      'Lankku polvilta': 'Planka från knä',
      'Käy kyynärvarsien ja polvien varaan. Pidä kroppa suorana linjana korvista polviin — vatsa tiukkana, älä anna lantion roikkua. 3 sarjaa, 20 s. Tauko 15 s välissä.': 'Gå ner på underarmar och knän. Håll kroppen i en rak linje från öronen till knäna — magen spänd, låt inte höften hänga. 3 set, 20 s. Paus 15 s emellan.',
      'Syvähengitys + selkämakuuliike': 'Djupandning + ryggliggande rörelse',
      'Aloita 5 syvähengityksellä (4 s sisään, 6 s ulos). Sitten selkämakuuliike: ojenna vastakkainen käsi + jalka suoraksi, palauta. 3 sarjaa, 6 toistoa per puoli. Alaselkä pysyy lattiassa.': 'Börja med 5 djupandetag (4 s in, 6 s ut). Sedan ryggliggande rörelse: sträck ut motsatt arm + ben rakt, återför. 3 set, 6 repetitioner per sida. Ländryggen stannar mot golvet.',
      'Tasapainoliike konttausasennossa': 'Balansrörelse i fyrfotaläge',
      'Mene nelinkontin. Nosta samanaikaisesti oikea käsi eteen ja vasen jalka taakse suoraksi — pidä 3 s. Vaihda puolta. 3 sarjaa, 8 toistoa per puoli. Älä keinuta lantiota.': 'Ställ dig i fyrfotaläge. Lyft samtidigt höger arm framåt och vänster ben rakt bakåt — håll 3 s. Byt sida. 3 set, 8 repetitioner per sida. Vagga inte höften.',
      'Lankku + sivulankku -rutiini': 'Planka + sidoplanka-rutin',
      'Lankku kyynärvarsilla 30 s (jalat suorana) → heti sivulankku oikealle 20 s → sivulankku vasemmalle 20 s → takaisin lankkuun 15 s. Yksi sarja = kaikki neljä asentoa. Tee 2 kertaa.': 'Planka på underarmarna 30 s (raka ben) → direkt sidoplanka höger 20 s → sidoplanka vänster 20 s → tillbaka till planka 15 s. Ett set = alla fyra lägen. Gör 2 gånger.',
      'Vastustettu työntö': 'Tryck mot motstånd',
      'Kiinnitä kuminauha sivulle (ovi/seinäkoukku). Seiso sivuttain, pidä nauhasta kiinni kädet suorana edessä. Työnnä kädet suoriksi eteenpäin — älä anna nauhan kääntää sinua. 3 sarjaa, 8 toistoa per puoli.': 'Fäst ett gummiband på sidan (dörr/väggkrok). Stå sidledes, håll i bandet med raka armar framför. Skjut armarna rakt framåt — låt inte bandet vrida dig. 3 set, 8 repetitioner per sida.',
      'Kehonhallinnan haasterutiini': 'Kroppskontrollens utmaningsrutin',
      '15 min rutiini: 10× kyykky palloa pidellen edessä + 8× yhden jalan taivutus per puoli (selkä suorana, toinen jalka taakse) + 8× punnerrus + 30 s lankku. 2–3 kierrosta.': '15 min-rutin: 10× knäböj med bollen framför + 8× enbensfällning per sida (rak rygg, andra benet bakåt) + 8× armhävning + 30 s planka. 2–3 varv.',
      'Hengitys liikkeen kanssa': 'Andning med rörelse',
      'Tee selkämakuuliikettä (vastakkainen käsi+jalka) mutta synkronoi: ojenna sisäänhengityksellä, palauta uloshengityksellä. 3 sarjaa, 8 toistoa per puoli. Hidas ja hallittu.': 'Gör den ryggliggande rörelsen (motsatt arm+ben) men synkronisera: sträck ut på inandning, återför på utandning. 3 set, 8 repetitioner per sida. Långsamt och kontrollerat.',
      'Vastustettu kiertovastus': 'Motstånd mot rotation',
      'Kuminauha sivulle kiinnitettynä. Seiso kasvot nauhaan päin ja ota askeleita sivulle samalla pitäen kädet suorina edessä — nauha vetää sivulle, sinä vastustat. 3 sarjaa, 10 askelta per suunta.': 'Med gummibandet fäst på sidan. Stå vänd mot bandet och ta steg i sidled samtidigt som du håller armarna raka framför — bandet drar åt sidan, du håller emot. 3 set, 10 steg per riktning.',
      'Maasta nousu hallitusti': 'Kontrollerad uppresning från marken',
      'Makaa selälläsi, nosta yksi käsi suoraksi kohti kattoa. Nouse seisomaan vaihe vaiheelta pitäen käsi ylhäällä koko ajan: kylki → polvi → seisomaan. Laske sama reittiä takaisin. 3 sarjaa, 3 toistoa per puoli.': 'Ligg på rygg, sträck upp en arm rakt mot taket. Res dig upp steg för steg och håll armen uppe hela tiden: sida → knä → stående. Sänk dig tillbaka samma väg. 3 set, 3 repetitioner per sida.',
      'Yhden jalan taivutus + keskivartalopito': 'Enbensfällning + bålhållning',
      'Seiso yhdellä jalalla, taivuta lantiosta eteenpäin selkä suorana (toinen jalka nousee taakse). Pidä keskivartalo tiukkana, äläkä kierrä lantiota. 3 sarjaa, 8 toistoa per jalka.': 'Stå på ett ben, fäll framåt från höften med rak rygg (andra benet lyfts bakåt). Håll bålen spänd och vrid inte höften. 3 set, 8 repetitioner per ben.',
      'Vahva takapää juoksee pisimpään. Loppupeli on sen aikaa.': 'En stark bakdel springer längst. Slutet av matchen är dess tid.',
      'Heikoin lenkki väsyy ensin. Tämä vahvistaa sitä — ja olet viimeisellä vartilla yhä nopein.': 'Den svagaste länken tröttnar först. Det här stärker den — och i sista kvarten är du fortfarande snabbast.',
      'Kohdennettu vahvistus ketjun heikoimpaan segmenttiin. Loppupeli ratkaistaan siellä missä vastustajan posterior chain antautuu.': 'Riktad förstärkning till kedjans svagaste segment. Slutet av matchen avgörs där motståndarens posteriora kedja ger upp.',
      'Takalihakset herätetään ensin. Sitten ne jaksavat juosta.': 'Baksidans muskler väcks först. Sedan orkar de springa.',
      'Lämmin takaketju tuottaa täyden sprintin. Lämmittely vapauttaa moottorin.': 'En varm bakkedja ger en full sprint. Uppvärmningen frigör motorn.',
      'Aktivoitu takalinja kantaa kovan kuorman. Hamstring kestää 90 minuuttia.': 'En aktiverad baklinje bär en tung belastning. Baklåret håller i 90 minuter.',
      'Vahva etupuoli tekee hypystä korkeamman ja potkusta kovemman.': 'En stark framsida gör hoppet högre och sparken hårdare.',
      'Räjähdysmoottori voittaa puolustajan ensimmäisessä askeleessa. Se on tässä.': 'Explosionsmotorn vinner mot försvararen i första steget. Den sitter här.',
      'Anterior chainin voima = laukauksen vauhti, ponnistuksen korkeus, ensiaskeleen eksplosiivisuus.': 'Den främre kedjans styrka = skottets fart, hoppets höjd, första stegets explosivitet.',
      'Etureidet venyvät. Polvet kiittävät.': 'Framlåren stretchas. Knäna tackar.',
      'Vapaa etureisi pitää polven omalla radallaan. Tämä on kriittistä kasvupyrähdyksessä.': 'Ett fritt framlår håller knät på rätt bana. Det är kritiskt under tillväxtspurten.',
      'Etulinjan liikkuvuus suojaa patellaa PHV-vaiheessa, kun luut kasvavat lihaksia nopeammin.': 'Framlinjens rörlighet skyddar knäskålen under PHV-fasen, när benen växer snabbare än musklerna.',
      'Vahvat kyljet pitävät kiinni hyökkääjässä.': 'Starka sidor håller fast anfallaren.',
      '1v1 on sivuttaisvoimaa. Heikko sivuketju antaa hyökkääjän ohittaa.': '1v1 handlar om sidledsstyrka. En svag sidokedja låter anfallaren gå förbi.',
      'Vahva lateral line = leveämpi puolustettava kaista, tiukempi body-to-body duellissa.': 'En stark lateral linje = ett bredare försvarsområde, tuffare kropp mot kropp i dueller.',
      'Lantio pysyy suorassa juostessa. Polvi kiittää.': 'Höften hålls rak när du springer. Knät tackar.',
      'Vahva lantio pitää polven linjassa. Pelaajan kallein vakuutus.': 'En stark höft håller knät i linje. Spelarens dyraste försäkring.',
      'Pelvic stability vähentää valgus-kuormaa polveen. ACL-riskin vähennys alkaa täältä.': 'Bäckenstabilitet minskar valgusbelastningen på knät. Minskad ACL-risk börjar här.',
      'Kiertovoima tekee laukauksesta kovan.': 'Vridkraften gör skottet hårt.',
      'Laukauksen teho ei tule jalasta vaan vartalon kierrosta. Tämä vahvistaa sen lähteen.': 'Skottets kraft kommer inte från benet utan från kroppens vridning. Det här stärker källan.',
      'Rotational power = laukauksen teho, syötön tarkkuus liikkeessä, vartalosuojaus paineen alla.': 'Rotationskraft = skottets kraft, passningsprecision i rörelse, kroppsskydd under press.',
      'Juostessa keho kiertyy pikkuisen. Se on oikein.': 'När du springer vrider sig kroppen en aning. Det är rätt.',
      'Jalkapallo on kiertojen peli mutta harjoitellaan useimmiten suoraan eteenpäin. Tämä korjaa sen.': 'Fotboll är ett vridningarnas spel men vi tränar oftast rakt framåt. Det här rättar till det.',
      'Jalkapallon yleisin liikesuunta on rotaatio — muttei se mitä harjoituksissa useimmiten tehdään. Kiertoketju yhdistää vastakkaiset puolet.': 'Fotbollens vanligaste rörelseriktning är rotation — men inte det som oftast görs på träningen. Vridkedjan förenar motsatta sidor.',
      'Vahva keskusta = koko peli ilman kipua.': 'En stark bål = hela matchen utan smärta.',
      '90 minuuttia kivutta alkaa keskikehon kestävyydestä. Tämä on vakuutus rasitusvammoja vastaan.': '90 minuter utan smärta börjar med bålens uthållighet. Det här är en försäkring mot belastningsskador.',
      'Core endurance vähentää low back -rasitusvammojen ilmaantuvuutta. Pitkä ura alkaa täältä.': 'Båluthållighet minskar förekomsten av ländryggsbelastningsskador. En lång karriär börjar här.',
      'Syvät lihakset pitävät ryhdin koko päivän.': 'De djupa musklerna håller hållningen hela dagen.',
      'Vahva keskikeho jakaa kuorman tasaisesti. Kaikki muu lihaksisto kiittää.': 'En stark bål fördelar belastningen jämnt. All annan muskulatur tackar.',
      'DFL aktivoi kaiken muun. Kun ydin ei tue, voima vuotaa ennen kuin se saavuttaa jalkaa.': 'DFL aktiverar allt annat. När kärnan inte stödjer läcker kraften ut innan den når foten.',
      'Kohdennettu kehitys': 'Riktad utveckling',
      'Harjoite päivittyy': 'Övningen uppdateras',
    },
  },
  // en: {} — lisää myöhemmin samalla rakenteella (V4-A-en)
};
// Aktiivinen kieli (browser: tmNykyinenKieli-globaali; node/testit: fi ellei asetettu).
function _hKieli() {
  try { return (typeof tmNykyinenKieli === 'function' && tmNykyinenKieli()) || 'fi'; }
  catch (e) { return 'fi'; }
}
// Sisältökäännös KANONISELLA fi-merkkijonoavaimella. Tarkistaa sisalto (harjoitelogiikan
// T-pankki, V4-A) JA pelaaja (Pelaaja_v7:n inline S-pankki + why-lauseet, V4-A2). Puuttuva
// kieli/avain → fi (Suomi ei rikkoudu).
function _hT(fi) {
  if (fi == null) return fi;
  var k = _hKieli();
  if (k === 'fi') return fi;
  var lang = HARJOITE_I18N[k];
  if (!lang) return fi;
  if (lang.sisalto && typeof lang.sisalto[fi] === 'string') return lang.sisalto[fi];
  if (lang.pelaaja && typeof lang.pelaaja[fi] === 'string') return lang.pelaaja[fi];
  return fi;
}
// Kortin yläotsikko (KOHDE_OTS) lokalisoituna — Pelaaja_v7 kutsuu tätä KOHDE_OTS-kartan sijaan.
var KOHDE_OTS_FI = { pallonhallinta: 'Pallonhallinta', koordinaatio: 'Koordinaatio', nopeus: 'Nopeus', syotto: 'Syöttö', ponnauttelu: 'Ponnauttelu' };
function tmKohdeOtsikko(kohde) {
  var k = _hKieli();
  var o = (k !== 'fi' && HARJOITE_I18N[k]) ? HARJOITE_I18N[k].kohde_otsikko : null;
  return (o && o[kohde]) || KOHDE_OTS_FI[kohde] || kohde;
}


// ── 1B: Päivittäinen harjoitevalinta (teema pysyy, harjoite vaihtuu) ───
// Palauttaa valitun harjoitteen normalisoituna, TAI null jos kohteelle ei harjoitteita
// (kutsuja tekee tällöin EX-fallbackin ikävaiheella).
function valitsePaivanHarjoite(pelaaja, pankki, pvm) {
  // KORJAUS: käytä mesosykli-PANKKIa (T-haara). Jos kutsuja antoi eri rakenteen — esim.
  // Pelaaja_v7:n ketju-pohjainen window.PANKKI ({SBL,SFL,...} ilman .T:tä) — fallback
  // moduulin omaan PANKKI:in, muuten mesosykli-loop ei löydä mitään ("Ei harjoitteita").
  pankki = (pankki && pankki.T) ? pankki : (typeof PANKKI !== 'undefined' ? PANKKI : null);
  var kk = laskeTekninenKehityskohde(pelaaja);
  var kohde = kk.kohde;
  var iv = _laskeIkavaihe(pelaaja);

  // Kerää kehityskohteen harjoitteet: tagatut mesosyklit + erillispankki
  var harjoitteet = [];
  if (pankki && pankki.T) {
    for (var meso in T_MESOSYKLI_KOHDE) {
      if (T_MESOSYKLI_KOHDE[meso] !== kohde) continue;
      var series = pankki.T[meso];
      if (!series) continue;
      ['vk1', 'vk2', 'vk3', 'vk4'].forEach(function (vk) { if (series[vk]) harjoitteet.push(series[vk]); });
    }
  }
  if (T_KOHDE_PANKKI[kohde]) harjoitteet = harjoitteet.concat(T_KOHDE_PANKKI[kohde]);

  if (!harjoitteet.length) {
    console.warn('[PANKKI] Ei harjoitteita kohteelle:', kohde);
    return null;
  }

  // Deterministinen päiväindeksi
  var pvmPaiva = _pvmEpochPaiva(pvm);
  var aloitusPaiva = _pvmEpochPaiva(pelaaja && (pelaaja.luotu || pelaaja.tuotu));
  var paiviaAktiivinen = (pvmPaiva != null && aloitusPaiva != null) ? (pvmPaiva - aloitusPaiva) : 0;
  if (paiviaAktiivinen < 0) paiviaAktiivinen = 0;

  var indeksi;
  if (paiviaAktiivinen <= 2) indeksi = 0;                                              // 3 ensimmäistä pv: sama
  else if (iv === 'leikkija') indeksi = Math.floor(paiviaAktiivinen / 2) % harjoitteet.length; // hitaampi vaihto
  else indeksi = paiviaAktiivinen % harjoitteet.length;                                // päivittäin

  var h = harjoitteet[indeksi];
  // V4-A: pelaajalle näkyvä sisältö lokalisoidaan (sv nyt, en myöhemmin). Puuttuva → fi.
  return {
    nimi: _hT(h.nimi), ohje: _hT(_ohjeIkavaiheelle(h, iv)),
    kesto: h.kesto || null, xp: h.xp || 20, yt: h.yt || null,
    cue: _hT(h.cue || null), tarina: _hT(h.tarina || null), viikkotavoite: _hT(h.viikkotavoite || null),
    kehityskohde: kohde, tyyppi: 'T', paiviaAktiivinen: paiviaAktiivinen,
  };
}

// ── 1C: Miksi-tekstin generointi (3 lausetta) ─────────────────────────
function generoiMiksiteksti(pelaaja, kehityskohde, ikavaihe) {
  pelaaja = pelaaja || {};
  var kohde = kehityskohde.kohde, lahde = kehityskohde.lahde;
  // V4-A: kielitietoinen. i18 = aktiivisen kielen kartta tai null (→ fi-lähdetekstit).
  var k = _hKieli();
  var i18 = (k !== 'fi' && HARJOITE_I18N[k]) ? HARJOITE_I18N[k] : null;
  var kohdeNimi = (i18 && i18.kohde_nimet && i18.kohde_nimet[kohde]) || KOHDE_NIMET[kohde] || kohde;

  var L1 = i18 && i18.miksi_l1;
  var l1;
  if (lahde === 'tki')      l1 = L1 ? L1.tki.replace('{kohde}', kohdeNimi) : ('Tekniikkakilpailusi näytti että ' + kohdeNimi + ' on kasvun paikka.');
  else if (lahde === 'tsi') { var s = (pelaaja.tsi_viimeisin != null) ? Number(pelaaja.tsi_viimeisin).toFixed(1) : '?'; l1 = L1 ? L1.tsi.replace('{s}', s) : ('Mittaus kertoo että pallo hidastaa sinua ' + s + ' sekuntia.'); }
  else if (lahde === 'hh')  l1 = L1 ? L1.hh : 'Fyysinen profiilisi kertoo missä kehittyminen tuottaa eniten.';
  else if (L1)              l1 = L1[ikavaihe] || L1.rakentaja;
  else l1 = ikavaihe === 'leikkija' ? 'Olet juuri oikeassa iässä oppimaan tämän.'
          : ikavaihe === 'rakentaja' ? 'Nyt on se hetki jolloin tämä taito uppoaa syvimmälle.'
          : 'Tämä on se osa-alue joka erottaa hyvän pelaajan erinomaisesta.';

  var m = (i18 && i18.miksi_lause2 && i18.miksi_lause2[kohde]) || MIKSI_LAUSE2[kohde] || MIKSI_LAUSE2.pallonhallinta;
  var l2 = m[ikavaihe] || m.rakentaja;

  var L3 = i18 && i18.miksi_l3;
  var l3 = ikavaihe === 'leikkija' ? (L3 ? L3.leikkija : 'Tee tämä joka päivä ja pallo alkaa totella.')
                                   : (L3 ? L3.muu : 'Tee tämä 14 päivää → testaat uudelleen → näet eron.');

  return { miksi_lause1: l1, miksi_lause2: l2, miksi_lause3: l3 };
}

// Node-testattavuus (browser: ei module → ei vaikutusta; <script src> käyttää globaaleja)
if (typeof module !== 'undefined' && module.exports) {
  module.exports = {
    PANKKI: (typeof PANKKI !== 'undefined' ? PANKKI : null),
    laskeKetjuProfiili: (typeof laskeKetjuProfiili !== 'undefined' ? laskeKetjuProfiili : null),
    generoimTehtavat: (typeof generoimTehtavat !== 'undefined' ? generoimTehtavat : null),
    laskeTekninenKehityskohde: laskeTekninenKehityskohde,
    valitsePaivanHarjoite: valitsePaivanHarjoite,
    generoiMiksiteksti: generoiMiksiteksti,
    _laskeIkavaihe: _laskeIkavaihe,
    T_MESOSYKLI_KOHDE: T_MESOSYKLI_KOHDE,
    T_KOHDE_PANKKI: T_KOHDE_PANKKI,
    HARJOITE_I18N: HARJOITE_I18N,       // V4-A: harjoitesisällön käännökset (sv; en myöhemmin)
    tmKohdeOtsikko: tmKohdeOtsikko,     // V4-A: lokalisoitu kortin yläotsikko
    _hT: _hT,                          // V4-A: sisältökäännös-getter (testit)
  };
}
