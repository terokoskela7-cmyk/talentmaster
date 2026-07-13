# TalentMaster™ — Pelikirja valmennuspäällikölle, valmentajalle ja fysiikkavalmentajalle

> Käyttöönotto-opas pilottiseuroille. Tavoite: että data alkaa **elää** ja hyödyttää arjen toimintaa —
> ja että **pelaajan tarina elää**: järjestelmä tietää mitä pelaaja on harjoitellut, millä tavoitteilla ja
> millä vasteella, ja TalentMaster kertoo historian ja trendin niin että asiantuntija tekee parempia päätöksiä.
> Kohde: valmennuspäällikkö (VP) · valmentaja · **fysiikkavalmentaja / fysioterapeutti**. Versio 2026-07-09.
> Sisältö = pohja sekä jaettavalle onboarding-materiaalille että in-app-aloitusoppaalle (Vaihe 2).
>
> **Päivitys 2026-07-09 (verifioitu live):** opas kattaa nyt **kolme roolia** ja **koko kehityssilmukan**:
> jaksofokus (teeman asetus) → arviointi→resepti-silta → **jakson sulku + kehitysvaste (delta)** → seuranta.
> Uutta edelliseen versioon: **Jaksofokus-työkalu** (VP näkee joukkueen fokukset: kattavuus, teemakeskittymä,
> talentit katettu, kuka asetti), **fysiikkajakso** (fyysinen teemasykli PHV-portilla), **Ohjelmakirjasto**
> (fysiikkavalmentaja tallentaa/uudelleenkäyttää/versioi ohjelmat) ja **Bio-banding-työkalu** (Pre/Circa/Post-PHV
> -ryhmittely, kasvutahti-loukkaantumissignaali). Ks. OSA 1.6, OSA 2.3–2.4 ja OSA 3 (fysiikkavalmentaja).
>
> **TILA-huomio (lue ennen jakelua):** tämä pelikirja kuvaa pilotin live-toiminnot. Ominaisuuksien nav-nimet on
> verifioitu live-UI:ta vasten 2026-07-09 (VP + Master + Ohjelmakirjasto + Jaksofokus + Bio-banding). Yksittäiset
> mikrotason painiketekstit voivat silti muuttua — tarkista uusin UI ennen laajaa jakelua.
> **Pelihavainto (ei ADAR):** peliäly/pelihavainto (D4) säilyy käsitteenä ja pelaajaraportin lähteenä.
> Pelihavainto-työkalu on käytössä; vanhaan ADAR-pikakorttiin ei viitata.
> **Termistö:** ei englanninkielisiä lyhenteitä käyttäjäpinnassa — vain suomenkieliset itsensä selittävät nimet.

---

## 0. YDINAJATUS — "Näin data herää ja pelaajan tarina alkaa elää"

TalentMaster ei tuota arvoa tyhjänä järjestelmänä. Arvo syntyy kun **datapolku sulkeutuu** ja alkaa toistua:

> **Rosteri → suostumus → mittaus → pikakentät täyttyvät → dashboard herää → jaksofokus (teema) → harjoittelu → jakson sulku (vaste) → seuraava jakso**

Kaksi tasoa:

1. **Data herää (kertaluontoinen käynnistys).** Ilman pelaajia ei ole mittauksia; ilman mittauksia dashboard
   on tyhjä; ilman dashboardia ei synny toimenpiteitä. **VP omistaa polun alkupään** (rosteri, suostumukset,
   mittausrytmi); **valmentaja tuottaa elävän datan** (testit, havainnot, arvioinnit). Näkymät täyttyvät itsestään
   — pikakentät päivittyvät automaattisesti jokaisesta tallennetusta mittauksesta.

2. **Pelaajan tarina elää (jatkuva silmukka).** Kun data on hereillä, jokainen kehitysjakso on **annos ja vaste**:
   asetetaan **jaksofokus** (mitä kehitetään ja millä tavoitteella) → harjoitellaan (annos) → **suljetaan jakso**
   ja mitataan **kehitysvaste (delta)**. Jokainen suljettu jakso jättää rivin pelaajan historiaan. Näistä riveistä
   TalentMaster piirtää **historian ja trendin** — ei vain "missä pelaaja on nyt" vaan "mihin suuntaan ja millä
   ohjelmalla hän kehittyy". Tämä on se, mikä tekee asiantuntijan päätöksestä paremman.

Tämän oppaan neljä roolia kuvaavat saman silmukan eri näkökulmista: **VP johtaa ja valvoo**, **valmentaja tuottaa
elävän datan ja sulkee silmukan pelaajalle**, ja **fysiikkavalmentaja rakentaa ja seuraa fyysiset ohjelmat**.

---

# OSA 1 — VALMENNUSPÄÄLLIKKÖ: Näin johdat TalentMasterilla

Roolisi on **nähdä kokonaisuus ja ohjata**: et kirjaa yksittäisiä testituloksia, vaan johdat seuraa,
joukkueita, valmentajia, pelaajia ja perheitä datan kautta. Näet **aina kaiken** oman seurasi osalta.

> **VP-näkymän välilehdet:** 🏠 Koti · ⌾ Tilanne · 👥 Valmentajat · 🧑 Pelaajat · 🗓 Kalenteri · 📊 Raportointi ·
> ✓ Reviewit. **Työkalut:** Arvioi harjoitus · Aloita tästä · Pelihavainto · Bio-banding · **Jaksofokus** ·
> **Ohjelmakirjasto** · Asetukset. Pelaajien tuonti ja huoltajakutsut tehdään erillisessä Seurahallinnassa.

## 1.1 Seuran johtaminen — käynnistä datapolku

Tämä on ensimmäinen ja tärkein tehtäväsi. Ilman tätä mikään muu ei herää.

1. **Tuo pelaajat järjestelmään.** Seurahallinnassa (Tuo Excel): lataa seuran joukkuepohja, täytä pelaajat,
   tuo takaisin. Pelaaja saa tilan *pilotti*. Duplikaattisuoja estää tuplakirjaukset.
2. **Kutsu huoltajat (suostumus).** Massakutsu lähettää huoltajille suostumuspyynnön → tila *odottaa* →
   huoltajan hyväksyttyä *annettu* + pelaajan PIN generoituu. **Suostumus on portti:** ilman sitä
   syntymäaika ei täyty, eikä RAE-näkyvyys, biologinen ikä tai perheviestintä aktivoidu.
3. **Seuraa suostumussuppiloa.** Tuotu → kutsuttu → annettu. Tavoite go-liveen on **konversio > 70 %**.
   Jos konversio jää alle, lähetä lempeä muistutus (frekvenssikatto suojaa perheitä turhalta painostukselta).
4. **Seuraa datakypsyyttä.** Montako pelaajaa on testattu / havainnoitu / mitattu (PHV). Tämä kertoo
   onko joukkue valmis siihen että dashboard tuottaa luotettavaa kuvaa.

**Johtamiskysymys:** *"Onko datapolkuni auki?"* — jos suostumuskonversio on matala tai mittauksia ei ole,
kaikki muu odottaa. Aloita tästä.

## 1.2 Joukkueiden johtaminen — lue pulssi, tartu signaaleihin

Kun mittauksia alkaa kertyä, joukkuetason näkymät heräävät:

- **Joukkuepulssi** (neliosainen per joukkue): Kehon valmius · TKI (tekniikka) · H-H-taso (fyysinen) ·
  pelihavainto. Kukin näyttää keskiarvon + kattavuuden (montako mitattu / koko joukkue) + suunnan (↑/→/↓).
  Kattavuus kertoo *kuinka luotettava* luku on — pieni n = ole varovainen tulkinnassa.
- **Signaalit** nostavat esiin sen mihin pitää tarttua: matala indeksi joukkueessa, valmentaja joka ei
  kirjaa, joukkue jota ei havainnoida tarpeeksi.
- **Syntymäkvartaali-rakenne (RAE).** Näet onko joukkue vinoutunut vanhimpiin (Q1 yliedustus = valitaanko
  taitoa vai ikää?) ja jäävätkö nuorimmat (Q4) lupaukset näkymättä. Tämä on TalentMasterin tieteellinen
  erottautuja — *"muut mittaavat, me korjaamme ikäharhan"*. Aktivoituu kun syntymäaika täyttyy.
- **Joukkueen syvänäkymä:** klikkaa pulssikorttia → modaali jossa **neljä välilehteä**, kukin vastaa eri kysymykseen:
  - **Yhteenveto** — *yhden silmäyksen tilannekuva.* KPI (D1 fyysinen / D2 tekninen + suunta), **yksi painopiste**
    (suurin etäisyys tavoitteeseen → suora "Luo tekniikkateema" / "Avaa Tuki"), ja **datapolku-CTA:t**. *Mistä aloitan?*
  - **Tavoitetaso** — *missä olemme vs kansallinen taso 3.* Per ominaisuus tasojakauma 1–5 + "tasolla ≥3: X/N" +
    **per-testi-radar** (joukkueen profiili + taso-3-tavoiterengas). *Mitä kehitämme?*
  - **Tuki** — *valmiit harjoitusryhmät.* Pelaajat ryhmitelty kehityskohteittain + kopioi-leikepöydälle +
    **"Luo harjoitustapahtuma"**. *Miten — kenet treenaan yhdessä?*
  - **Pelaajat** — *hakemisto.* Per-pelaaja-tasot (H-H, D1, tekninen, pelihavainto, PHV). Klikkaa pelaaja →
    per-pelaaja-kortti (5D-profiili + per-testi-detalji). *Kuka?*
- **Kohortti-valitsin:** Paras · Top-5 · Top-10 · **Koko joukkue** — näet talenttiytimen tason ja kehityksen
  erikseen koko joukkueesta.
- **Kehityskohde-merkki:** liputtaa vain aidon huolen — pre-PHV-iässä matala *fyysinen* on biologisesti odotettua
  (neutraali), joten merkki perustuu tekniseen kehityskohteeseen tai kehon valmiuteen. Liputtaa heikoimman ~20 %:n.

**Johtamiskysymys:** *"Mikä joukkue tarvitsee huomiotani tällä viikolla?"* — anna signaalien ohjata.
Periaate: **Tilanne** kertoo *missä* tarttua · **Tavoitetaso** *mitä* kehittää · **Tuki** *miten* · **Pelaajat** *kuka*.

## 1.3 Valmentajien johtaminen — havainnoi, kalibroi, mentoroi

TalentMaster tekee valmentajakehityksestä yhtä mitattavaa kuin pelaajakehityksestä.

- **Harjoitusarviointi — kaksi mallia, sinä täytät molemmat.**
  - **Malli A (Palloliiton harjoituslaatu):** sinä arvioit harjoituksen laadun — QA- ja datankeruutyökalu. Vain VP.
  - **Malli B (valmennustaidot):** sama malli täytetään **kahdesti** — valmentaja tekee **itsearvion**, ja sinä
    teet **havainnoinnin** samasta harjoituksesta.
- **Kalibraatio = kahden Malli B:n ero.** Järjestelmä laskee kuilun per kriteeri (itsearvio − havainnointi) →
  mentoroinnin lähtökohta, ei tuomio.
- **Roolijako (lukittu):** valmentaja näkee vain oman B-itsearvionsa + kalibraation + saamansa laadullisen
  palautteen. Valmentaja **ei näe omaa Malli A -numeroaan** — A on sinun linssisi.
- **VAI+ (valmentajan aktiivisuusindeksi).** Viisiosainen: havainnot, käynnit, harjoittelu, kontakti, kehitys.
- **Mentorointi-loop.** Lähetä valmentajalle viesti suoraan järjestelmässä → se näkyy hänen Viestit-välilehdellään.
- **Coach-paneeli:** valmentajan profiili (lisenssitaso, CPD-tunnit, koulutukset), VAI+, harjoituslaatu ja
  mentorointihistoria yhdessä näkymässä.
- **IDP: sinä olet vahvistaja, et portinvartija.** Valmentaja omistaa **oman joukkueensa** kehityssuunnitelmat
  (IDP) — hän luo, muokkaa ja **aktivoi** tavoitteet itse, eikä aktivointi odota sinun hyväksyntääsi. Sinä näet
  kaikki tavoitteet, **kalibroit ja kommentoit** näkemyksiä. Kun kommentoit, valmentaja saa ilmoituksen
  *"VP vahvisti näkemyksesi"* tai *"VP ehdottaa kalibrointia"* — ei "hyväksytty/hylätty". Voit itse muokata
  minkä tahansa pelaajan IDP:tä, mutta arki on valmentajan.

**Johtamiskysymys:** *"Kehittyvätkö valmentajani — ja tukevatko he pelaajaa oikein?"*

## 1.4 Pelaajien johtaminen — tunnista lupaus, suojaa herkkyysvaihe

- **IDP-jono ja talentit.** Näet ketkä ovat talenttiohjelmassa ja kenen suunnitelma kaipaa huomiota.
- **Signaalit — biologinen totuus käyttöliittymänä:**
  - **Hidden Gem (piilohelmi):** korkea tekniikka + matala fysiikka → lupaus jonka fysiikka tulee perässä. Älä karsi.
  - **Kultaikkuna:** nuorella tekniikan herkkyysvaihe on auki (~≤12 v) — sama harjoittelu tuottaa moninkertaisen
    vaikutuksen nyt.
  - **Underdog (RAE):** ikäluokan nuorin joka silti pärjää → poikkeuksellinen pitkän tähtäimen lupaus.
- **TKI (tekniikka) ja H-H (fyysinen).** Indeksit kertovat tason; kehitysvauhti (delta) kertoo kehittyykö pelaaja.
  **Periaate:** kehitys mitataan absoluuttisesta parannuksesta, ei pelkästä indeksiluvusta (vaatimus kovenee iän myötä).
- **PHV / biologinen ikä.** Kasvupyrähdyksen vaihe ohittaa kronologisen iän kaikessa tulkinnassa. Ks. Bio-banding (1.6).
- **Arviointi — kolme lähdettä, yksi näkymä.** Pelaajan Arviointi-välilehti jakaa rivit sen mukaan **mistä tieto
  tulee:** 🟢 **Mitattu** (TM-testistä, lukittu) · 🔵 **Havaittu** (oma 1–5-arviosi, tallentuu automaattisesti
  klikatessa) · 👁 **Pelihavainnosta** (kenttähavainnosta johdettu ADAR 1–3; klikkaa 1–5 antaaksesi oman arvion,
  yliajaa johdetun). Coverage-tilastopalkki (D1–D5) näyttää kuinka kattavasti pelaaja on arvioitu.
- **IDP-silta — havainnosta tavoitteeksi yhdellä klikkauksella.** Kun arvioitu arvo on **≤ 2** (havaittu tai
  pelihavainto), rivin viereen tulee oranssi **＋ IDP-tavoite** -pilleri. Klikkaus luo kausitavoite-ehdotuksen
  suoraan havainnosta ja avaa Kehitys-välilehden. Tavoite säilyttää alkuperän — kortissa näkyy lähdesiru
  *"◎ Lähde: pelihavainto · pvm"*, joten näet mistä kehityskohde nousi.

**Johtamiskysymys:** *"Tunnistanko lupaukset oikein — myös ne jotka eivät vielä näytä fyysisesti valmiilta?"*

## 1.5 Perheiden johtaminen — suostumus ja oikea viestintä

- **Suostumusprosessi** on sekä lakisääteinen (alaikäisten data, GDPR) että luottamuksen perusta.
- **Perheviestintä noudattaa lapsen suojaa:** vanhemmalle ei näytetä tasolukuja, percentiilejä eikä vertailua —
  vaan vahvuus ensin, prosessikehu ja konkreettiset tukivinkit. Varmista että valmentajasi viestivät tässä hengessä.

**Johtamiskysymys:** *"Kokeeko perhe TalentMasterin tukena vai arvosteluna?"* — tavoite on tuki.

## 1.6 Kehityssilmukan valvonta — Jaksofokus, Bio-banding, Ohjelmakirjasto

Nämä kolme työkalua ovat VP:n **oversight kehityssilmukkaan**. Et aseta yksittäisiä jaksoja (valmentaja omistaa
kentän), mutta näet yhdellä silmäyksellä toimiiko silmukka.

- **Jaksofokus — joukkueen toiminta.** VP näkee koko joukkueen jaksofokukset:
  - **Kattavuus** (esim. "1/61 — 60 ilman fokusta"): kuinka monella pelaajalla on aktiivinen kehitysjakso. Matala
    kattavuus = silmukka ei pyöri, ohjaa valmentajaa asettamaan fokuksia.
  - **Teemakeskittymä:** mihin joukkueen fokukset painottuvat — *≥3 samaa teemaa → ryhmäharjoite kannattaa*.
  - **Talentit katettu** (esim. "1/40"): ovatko talenttiohjelman pelaajat ohjattu. Talentit ensin.
  - **Kuka asetti** (valmentaja vs VP): näet delegoinnin — omistaako kenttä fokuksensa vai joudutko työntämään.
  - Voit myös **asettaa/muokata** yksittäisen pelaajan jaksofokuksen (konsepti → cue → harjoite) kun talentti on
    ilman fokusta.
- **Bio-banding — kehitysvaihe.** Ryhmittely biologisen kypsyyden (Mirwald-PHV) mukaan, **ei syntymävuoden**:
  **Pre-PHV** (ennen kasvupyrähdystä) · **Circa-PHV** (±1 v huipusta, kasvupyrähdyksessä) · **Post-PHV**.
  Käyttö: treeni-/ottelu-bio-bandingiin ja **kuormasuojaan** — kasvutahti ≥ 7,2 cm/v on loukkaantumisriskisignaali.
  Näet myös montako pelaajaa on **ilman PHV-dataa** ("tee kasvumittaus Testaus-työkalulla") — tämä on suora
  toimenpidekehotus. Poikkeuslupa-merkki näkyy pelaajilla joilla on erikseen myönnetty poikkeus.
- **Ohjelmakirjasto (oversight).** Näet seuran fysiikkaohjelmat, jotka fysiikkavalmentaja rakentaa Master-työkalussa,
  ja **N-laskurin** (kuinka monella pelaajalla kukin ohjelma on ajettu). Tyhjä kirjasto ("Ei ohjelmia vielä") =
  fyysinen ohjelmointi ei ole vielä käynnistynyt. Ks. OSA 3.

**Johtamiskysymys:** *"Pyöriikö kehityssilmukka — asetetaanko fokuksia, suljetaanko jaksot, kertyykö vaste?"*

## 1.7 VP:n ehdotettu rytmi

- **Viikoittain:** lue joukkuepulssit + signaalit + **Jaksofokus-kattavuus** → valitse 1–2 kohdetta. Lähetä
  mentorointiviesti valmentajalle jota kävit katsomassa.
- **Harjoituskäynnillä:** tee harjoitusarviointi (malli A). Pyydä valmentajaa tekemään itsearvio (B) → kalibraatio yhdessä.
- **Kuukausittain:** tarkista suostumuskonversio + datakypsyys + **Bio-banding** (kuka ilman PHV-dataa) +
  **Ohjelmakirjasto** (kertyykö fyysisiä ohjelmia ja niiden vasteita).
- **Kausittain:** IDP-katselmus, talenttiohjelman koostaminen, **kehitysvauhdin koonti** (2. mittausten + suljettujen
  jaksojen delta-rivien myötä).

---

# OSA 2 — VALMENTAJA: Näin teet TalentMasterilla arjessa

Roolisi on **tuottaa elävää dataa ja sulkea silmukka pelaajalle ja perheelle**. Näet oman joukkueesi
pelaajat, teet havainnot ja testit, asetat kehitysjaksot ja viestit eteenpäin. Itsearviosi on **sinun oma
kehityksesi työkalu** — valmennuspäällikkö ei käytä sitä arvosteluun.

> **Valmentajan välilehdet:** 🏠 Koti · 👤 Pelaajat · 👁 Havainnot · ✉️ Viestit · ⋯ Lisää (Tänään, Pulssi,
> Kehitys, Kausi, Kalenteri, Testit, **Kuorma & fiilis**, Itsearvio / Valmentajana kehittyminen). Uudelle
> käyttäjälle on **"Aloita tästä"** -kohta.

## 2.1 Itsearvio + reflektio + CPD — oma kehittymisesi

- **Itsearvio (malli B = valmennustaidot):** arvioi omaa pedagogiikkaasi, palautteen antoa, harjoituksen
  organisointia. Tämä on sinua varten. Et arvioi harjoituksiasi numeerisesti (malli A) — se on VP:n työkalu.
- **Kalibraatio.** Kun VP havainnoi saman harjoituksen (malli B havainnointina), näet **oman itsearviosi ja hänen
  havaintonsa eron** per kriteeri — peili itsetuntemukseen, ei arvostelu.
- **Reflektiopäiväkirja:** kirjoita tai **nauhoita ääneen** ajatuksesi harjoituksen jälkeen (automaattinen
  litterointi). Päiväkirja on **yksityinen**.
- **CPD-todiste:** reflektiot ja arvioinnit kokoavat näytön jatkuvasta ammatillisesta kehittymisestä.

## 2.2 Testaus kentällä — mittaa, ja data herää

- **Testaustyökalu:** suunnittele tapahtuma toimistossa (protokolla + joukkue + osallistujat), testaa kentällä
  korttinäkymällä yksi pelaaja kerrallaan. **Toimii offline** — tulokset synkkaavat kun verkko palaa.
- Indeksit (TKI, kehon valmius, H-H-taso) lasketaan automaattisesti, ja **pikakentät päivittyvät** → VP:n
  joukkuepulssi ja pelaajan oma näkymä heräävät heti.
- **Kasvumittaus (PHV):** pituus/paino kirjautuu → biologinen ikä + Bio-banding-vaihe päivittyy. Tärkein yksittäinen
  mittaus fyysisen kehityksen tulkintaan — ilman sitä pelaaja jää Bio-bandingissa "ilman PHV-dataa".
- Jos seuralla on historiallista testidataa, se tuodaan Excel-tuonnilla (myös Palloliiton tekniikkakilpailu-PDF:t).

## 2.3 Kehitysjakso — aseta fokus, sulje silmukka (tekninen/taktinen)

Tämä on se, missä **pelaajan tarina alkaa elää**. Yksittäinen mittaus kertoo tason; **kehitysjakso kertoo mihin
suuntaan ja millä tavoitteella pelaaja kehittyy.**

1. **Aseta jaksofokus.** Valitse pelaajalle kehityskohde: **konsepti → cue → harjoite**. Arviointi→resepti-silta
   ehdottaa fokusta automaattisesti heikoimmasta ominaisuudesta (arvioinnin tai testin pohjalta) — hyväksyt tai
   muutat. Talentit ensin.
2. **Harjoittele jakso (annos).** Pelaaja harjoittelee teemaa jakson ajan; sinä ohjaat ja havainnoit.
3. **Sulje jakso (vaste).** Kun jakso päättyy, suljet sen: paraniko, pysyikö ennallaan, vai vaihdetaanko teemaa?
   Sulku kirjaa **kehitysvasteen (delta)** pelaajan historiaan. **Delta lasketaan vain aidosta uudesta mittauksesta**
   — jos tuoretta mittausta ei ole, sulku on subjektiivinen arvio (merkitään sellaiseksi).
4. **Seuraava jakso** rakentuu edellisen vasteen päälle → peräkkäiset jaksot muodostavat pelaajan kehitystarinan.

> **Miksi sulkeminen on tärkeää:** avoin jakso ei jätä jälkeä. Vasta suljettu jakso tuottaa annos–vaste-rivin,
> josta trendi ja per-ohjelma-oppi syntyvät. Sulje jaksot — se on pieni teko, joka pitää tarinan elossa.

**Kausitavoite (IDP) — sinä omistat oman joukkueesi suunnitelmat.** Pelaajaraportin kausitavoite-kortissa
**luot, muokkaat ja aktivoit** kehitystavoitteet suoraan omille pelaajillesi — aktivointi ei odota VP:n
hyväksyntää. Voit ehdottaa tavoitetta datasta (↻ Ehdota), asettaa fokuksen itse, kuvata tavoitteen pelissä,
kirjata reviewejä ja seurata kehityskaarta. Toisen joukkueen pelaajan kortin näet **vain luku** -muodossa. VP
näkee tavoitteesi ja voi vahvistaa tai kalibroida — te keskustelette näkökulmista, mutta arjen omistat sinä.
> **Jaksofokus (meso) vs kausitavoite (makro):** jaksofokus on 4–6 viikon operatiivinen teema (yllä); kausitavoite
> on koko kauden suunta. Molemmat ovat sinun työkalujasi omalle joukkueellesi.

## 2.4 Fyysinen kehitys ilman fysiikkavalmentajaa — kevyt polku (OTO-valmentaja)

Jos seurassasi **ei ole erillistä fysiikkavalmentajaa**, hoidat myös fyysisen kehityksen — kevennetysti:

- **Fyysinen jaksofokus yhdellä klikkauksella.** Kun asetat pelaajalle fyysisen kehitysjakson, järjestelmä
  **ehdottaa teemaa** (esim. nopeus, liikehallinta, perusvoima) pelaajan profiilin ja heikoimman osa-alueen
  pohjalta, ja tarjoaa **valmiin ohjelmatemplaatin**. Et rakenna ohjelmaa itse — valitset valmiin.
- **PHV-portti suojaa tulkinnan.** Ennen kasvupyrähdystä (pre-PHV) fyysinen kehitys on biologisesti rajallista:
  **"ennallaan ≠ epäonnistuminen".** Järjestelmä normittaa delta-tulkinnan kasvuvaiheen mukaan, joten et syyllistä
  pelaajaa (etkä itseäsi) siitä mihin keho ei vielä kykene.
- **Sulku ja delta toimivat kuin teknisessä jaksossa** (2.3) — kevyt polku käyttää samaa silmukkaa, vain ohjelma
  tulee valmiina templaattina.

> **Milloin siirryt rakentaja-polkuun:** jos seuraan tulee fysiikkavalmentaja tai fysioterapeutti, hän rakentaa
> yksilölliset ohjelmat ja tallentaa ne kirjastoon (OSA 3). Sinun kevyt polkusi säilyy ennallaan.

## 2.5 Havainnot — pelihavainto (peliäly / D4), näe se mitä mittari ei näe

> Master-näkymässä tämä on **Havainnot**-välilehti.

- Mittaus kertoo fysiikan ja tekniikan, mutta **peliälyä (D4) ei mitata kellolla**. Kirjaat pelitilanteesta
  laadullisen havainnon (havainnointi, päätöksenteko, toiminta, reagointi) — se täydentää mittausdataa ja on
  **pelaajaraportin pelihavainto-lähde** (OSA 4).
- Havaintosi näkyvät pelaajan näkymässä **omalla, kannustavalla kielellään** — sinä hyväksyt viestin ennen kuin
  pelaaja näkee sen.
- **Pelihavainto johtaa arviointiin ja tavoitteeseen.** Kenttähavainto (ADAR 1–3) johtaa automaattisesti
  pelaajan peliäly-arvioon (D4, 👁-lähderyhmä). Jos havaittu taso on heikko (≤ 2), Arviointi-rivin **＋ IDP-tavoite**
  -silta luo kehitystavoitteen suoraan siitä havainnosta — tavoite muistaa lähteen ("◎ Lähde: pelihavainto · pvm").

## 2.6 Kuorma & fiilis + viestit — pelaajan oma ääni

- **Kuorma & fiilis:** pelaaja kirjaa oman kuormituksensa ja fiiliksensä → näet joukkueen kuormatilanteen. Yhdessä
  Bio-bandingin kasvutahti-signaalin kanssa tämä auttaa säätämään harjoituskuormaa turvallisesti.
- **Viestit — yksi syöte.** Master-näkymän **Viestit**-välilehti kokoaa: pelaajien omatoimiset kirjaukset (fiilis +
  harjoittelu) + VP:n mentorointiviestit. Reagoi ja viesti perheelle suoraan jokaisesta kortista.
- **Pelaajalle ei koskaan näytetä raakalukuja, vertailua tai pisteitä** — vain kannustava, lapsen kielellä
  kirjoitettu viesti (vahvuus ensin, seuraava askel saavutettavana).
- Avaa pelaajalta **📋 Pelaajaraportti + tavoitteet**: näet raportin ja kirjaat tavoitteita + palautetta.
  Tavoitteet näkyvät myös VP:lle.

## 2.7 Valmentajan ehdotettu rytmi

- **Joka harjoitus:** havainnoi (Pelihavainto), tarvittaessa viesti pelaajalle. Reflektoi lyhyesti jälkeenpäin.
- **Testipäivänä:** Testaustyökalu kentällä, merkitse valmiiksi → data synkkaa. Muista kasvumittaus (PHV).
- **Jakson alussa:** aseta pelaajille jaksofokukset (talentit ensin). **Jakson lopussa: sulje jaksot** → delta kirjautuu.
- **Viikoittain:** lue Viestit + Kuorma & fiilis, tee oma itsearvio jos kävit ohjatun harjoituksen.
- **VP:n käynnin yhteydessä:** tee itsearvio samasta harjoituksesta → kalibraatiokeskustelu.

---

# OSA 3 — FYSIIKKAVALMENTAJA / FYSIOTERAPEUTTI: Näin rakennat ja seuraat fyysiset ohjelmat

Tämä osa koskee seuroja, joissa on **oma fysiikkavalmentaja** (tai fysioterapeutti). Roolisi on **rakentaa
yksilölliset fyysiset ohjelmat, tallentaa ne seuran kirjastoon, käyttää uudelleen ja seurata mikä toimii kenelle.**
Työskentelet Master-näkymässä; VP näkee työsi oversightina (OSA 1.6).

> **Kaksi polkua — sinä olet "rakentaja".** Seurat ilman fysiikkavalmentajaa käyttävät **kevyttä polkua** (valmiit
> templaatit, OSA 2.4). Sinä käytät **rakentaja-polkua:** editori + kirjasto. Molemmat käyttävät samaa
> kehityssilmukkaa (jaksofokus → sulku → delta) — ero on että sinä teet ohjelmat itse ja seuraat niitä aggregaattina.

## 3.1 Ohjelmaeditori — rakenna yksilöllinen ohjelma

- **Luo ohjelma:** nimi · tyyppi (nopeus-voima, perusvoima, kuntoutus, nopeus, liikkuvuus, muu) · kuvaus · kesto ·
  **viikko-ohjelma** (lisää vaihe: nimi, viikkoväli, intensiteetti %, ohje, mittari, harjoitteet).
- **Aloita valmiista:** voit esitäyttää ohjelman valmiista templaatista, Everton-tyylisestä 6 viikon
  plyometrisesta progressiosta tai kuntoutusprotokollasta, ja muokata siitä pelaajalle sopivan.
- **⚠ Tietosuoja (kuntoutus):** ohjelman **kuvaus ja harjoitteet ovat harjoitussisältöä** (esim. "eksentrinen
  takareisi 2×/vk") — **ei diagnooseja**. Vamma- ja terveystieto kuuluu erilliseen terveystietoon, ei ohjelmaan.
  Järjestelmä huomauttaa tästä. Tämä on GDPR:n erityisten henkilötietoryhmien suoja.

## 3.2 Ohjelmakirjasto — tallenna, käytä uudelleen, versioi

- **Ohjelma on seuran omaisuus, ei kertakäyttö.** Rakenna kerran → tallenna kirjastoon → liitä monelle pelaajalle.
- **Versiointi:** kun muokkaat tallennettua ohjelmaa, syntyy **uusi versio** (vanhaa ei ylikirjoiteta). Käynnissä
  olevat ja jo suljetut jaksot pitävät sen version, jolla ne ajettiin — historia pysyy eheänä.
- **Arkistointi:** vanhentuneen ohjelman voi arkistoida (pehmeä poisto). Se katoaa oletuslistalta mutta historia,
  joka siihen viittaa, säilyy. Ohjelmia ei poisteta kovalla poistolla.
- **N-laskuri:** jokainen ohjelmakortti näyttää kuinka monella eri pelaajalla ohjelma on ajettu.

## 3.3 Ohjelman liittäminen jaksoon — annos alkaa

- Kun asetat pelaajalle fyysisen jaksofokuksen, valitset **"Kirjastosta"** → tallennettu ohjelma liittyy jaksoon.
  Koko ohjelma kopioituu jaksoon, joten jakso on itsenäinen vaikka muokkaisit kirjasto-ohjelmaa myöhemmin.
- Tästä eteenpäin silmukka toimii kuten muillakin: harjoittelu (annos) → **jakson sulku → kehitysvaste (delta)**.
- **PHV-portti** koskee sinuakin: ennen kasvupyrähdystä fyysinen kehitys on rajallista, ja delta-tulkinta
  normitetaan kasvuvaiheen mukaan. "Ennallaan" pre-PHV-pelaajalla ei ole huono ohjelma — se on biologia.
- **Delta vain aidosta mittauksesta:** ohjelman vaikutus kirjautuu vasta kun jakson aikana on tehty tuore fyysinen
  mittaus. Ilman sitä sulku on subjektiivinen. Siksi **ajoita mittaus jakson loppuun.**

## 3.4 Mitä tämä mahdollistaa — nyt ja tulevaisuudessa

- **Nyt (deterministinen):** näet per ohjelma, monellako pelaajalla se on ajettu, ja jokaisen jakson vasteen.
  Pelaajan tarina kertyy ohjelmittain ryhmiteltynä — pohja sille, että myöhemmin nähdään "mikä ohjelma toimii kenelle".
- **Seuraavat vaiheet (kun dataa on kertynyt):** ohjelmakohtainen analytiikka (keskimääräinen delta, toteuma-%,
  tulosjakauma, kasvuvaihe-erittely) ja myöhemmin tekoälytuki, joka arvioi onko ohjelma pelaajalle oikeanlainen
  tässä kasvuvaiheessa. Nämä avataan portitettuna vasta kun annos–vaste-datasetti riittää — ja aina niin, että
  **asiantuntija tekee päätöksen, järjestelmä vain tukee.**

## 3.5 Fysioterapeutin näkökulma

- Fysioterapeutilla on samat kirjoitusoikeudet ohjelmakirjastoon (kuntoutusohjelmat). Muista tietosuoja (3.1):
  kuntoutusohjelma sisältää harjoitussisällön, ei diagnoosia.
- Rehab-progressiot (esim. vaiheistetut paluuohjelmat) rakennetaan samalla editorilla ja versioidaan samoin.

## 3.6 Fysiikkavalmentajan ehdotettu rytmi

- **Jakson alussa:** rakenna/valitse ohjelma → liitä pelaajalle. Aseta mittari ja ajoita loppumittaus.
- **Jakson aikana:** ohjaa harjoittelu; kirjaa kuorma tarvittaessa (Kuorma & fiilis).
- **Jakson lopussa:** tee tuore mittaus → **sulje jakso** → delta kirjautuu ohjelmalle ja pelaajalle.
- **Kuukausittain:** katso kirjaston N-laskurit — mitkä ohjelmat ovat käytössä, mihin kannattaa panostaa.
- **Yhteistyö:** VP näkee ohjelmasi oversightina; keskustelkaa kehityspalaverissa mitä fyysinen data kertoo.

---

# OSA 4 — Pelaajaraportti ja roolien yhteistyö

Yksittäisen pelaajan kokonaiskuva kootaan **Pelaajaraporttiin** (VP-näkymän **Raportointi**-välilehti).
Se on *esitettävä raportti*, ei selausnäkymä — yksi sivu per pelaaja, vietävissä PDF:ksi. Eri asia kuin
IDP-kortti: **raportti kertoo mitä data sanoo, IDP-kortti mitä tehdään seuraavaksi.**

## 4.1 Mikä pelaajaraportti on

Kolme lähdettä rinnakkain, värikoodattuna — periaate **"data-informed, not data-driven"**:

- **Mittaus (objektiivinen):** fyysinen (H-H / D1), tekninen (TKI), kehon valmius, PHV / bio-ikä. Testidata.
- **Ottelu (pelisuoritus):** TASO-pelidata (minuutit, arvosana). Pilotissa usein vielä tyhjä.
- **Pelihavainto (subjektiivinen):** valmentajan arvio peliälystä (D4). Vähän havaintoja → merkitään epävarmaksi.

Lisäksi: 5D-profiili (D1–D5), talenttisignaalit (Hidden Gem vaiheineen, X-Factor), RAE / kypsyys-reiluus — ja
kun jaksoja on suljettu, **kehitysvaste-historia** (mitä on harjoiteltu, millä ohjelmalla, mikä oli vaste).

**Erimielisyys on arvo, ei virhe.** Kun lähteet eroavat, raportti **nostaa ristiriidan esiin** eikä anna tuomiota.
Se on kehotus: *"vahvista pelitilanteessa."* Suora vastalääke silmämääräiselle talenttivalinnalle.

## 4.2 Kolme skiniä — sama data, eri kieli

**Raportti on VP:n työkalu.** VP vaihtaa skiniä (näkökulmaa) tilanteen mukaan:

- **Johtaja (VP):** kalibraatio (valmentaja / VP / pelaaja + kuilu), RAE-reiluus, talenttisignaali perusteluineen,
  päätöskenttä. VP:n oletusnäkymä.
- **Valmentaja:** vahvuus + kehityskohde per laji, **resepti** (seuraava harjoitusteema), per-testi-detalji.
- **Vanhempi:** lapsiturvallinen laadullinen näkymä (ei tasolukuja / vertailua) — vahvuus ensin, yksi saavutettava
  askel, miten tukea kotona. VP tuottaa tästä vanhemmalle PDF:n.

> **Rooliperiaate:** valmentajalla on oikeus omiin pelaajiinsa (kirjaa tavoitteita ja palautetta, näkee oman
> joukkueensa raportit Valmentaja-skinillä). VP näkee kaikki, tuo kokonaiskuvan ja reiluuden. Fysiikkavalmentaja
> tuo fyysisen ohjelman ja sen vasteen. *Pelaaja ensin, hallinto vahvistaa.*

## 4.3 Näin roolit tekevät yhteistyötä

1. **Kehityspalaveri (4×/kausi):** pelaajaraportti projisoidaan ruudulle. VP katsoo Johtaja-skinillä, valmentaja
   Valmentaja-skinillä, fysiikkavalmentaja tuo fyysisen ohjelman vasteen. Sama pelaaja, monta näkökulmaa →
   yhteinen päätös. Erimielisyyspalkki ohjaa keskustelun oikeaan kohtaan.
2. **Harjoitusarviointi + kalibraatio:** VP havainnoi (malli A), valmentaja tekee itsearvion (malli B) →
   kalibraatio → mentorointi.
3. **Mentorointi-loop:** VP:n viesti → valmentajan Viestit-välilehti. Jatkuva, kontekstissa pysyvä dialogi.
4. **Talenttipäätös:** signaali → VP:n vahvistus. Kenttähavainto + strateginen kuva + fyysinen vaste yhdessä.
5. **Pelaajalle ja perheelle päin:** valmentaja omistaa päivittäisen viestinnän, VP varmistaa lapsiturvallisuuden.

> **Kausitavoite (IDP) — omistajuus vs. vahvistus:** valmentaja **omistaa oman joukkueensa** kausitavoitteet:
> luo, muokkaa ja **aktivoi** ne itse (aktivointi ei jää odottamaan hyväksyntää). VP on **vahvistaja** — näkee
> kaikki tavoitteet, vahvistaa tai ehdottaa kalibrointia (*"VP vahvisti näkemyksesi"* / *"VP ehdottaa
> kalibrointia"*), ei portinvartija. Toisen joukkueen pelaajan IDP näkyy valmentajalle **vain luku** -muodossa.
> Strateginen kausisuunta sovitaan yhdessä kehityspalaverissa; operatiivinen jaksofokus on valmentajan arkea.

---

# OSA 5 — "Näin data herää ja tarina elää" -looppi (yhteinen muistikortti)

| Vaihe | Kuka | Toiminto | Mikä herää |
|---|---|---|---|
| 1. Rosteri | VP | Tuo pelaajat (Excel) | Pelaajalista |
| 2. Suostumus | VP → perhe | Massakutsu → huoltaja hyväksyy | PIN, syntymäaika, RAE, perheviestintä |
| 3. Mittaus | Valmentaja | Testaus + kasvumittaus (PHV) + pelihavainnot | Pikakentät (TKI, valmius, H-H, pelihavainto, bio-ikä) |
| 4. Dashboard | (automaattinen) | Pikakentät täyttyvät | Joukkuepulssi, signaalit, syvänäkymä, Bio-banding |
| 5. Jaksofokus | Valmentaja / fysiikkavalmentaja | Aseta teema (konsepti→cue→harjoite) / liitä ohjelma | Aktiivinen kehitysjakso (annos) |
| 6. Sulku | Valmentaja / fysiikkavalmentaja | Sulje jakso tuoreella mittauksella | **Kehitysvaste (delta)** → pelaajan historia |
| 7. Trendi | (automaattinen) + VP | Peräkkäiset jaksot | **Pelaajan tarina: historia + suunta** |
| 8. Päätös | VP + valmentaja + fysiikkavalmentaja | Kehityspalaveri, IDP, mentorointi | Parempi asiantuntijapäätös |

**Tärkein viesti kaikille rooleille:** dashboard ei ole tyhjä siksi että järjestelmä ei toimi, vaan siksi että
polku ei ole vielä auki. **Avaa polku ja sulje jaksot** — niin näkymät täyttyvät ja pelaajan tarina alkaa elää.

---

# OSA 6 — Vaihe 2: in-app-kerros (suunnitelma, ei vielä rakennettu)

Tämän pelikirjan sisältö viedään järjestelmän sisään muotoon **checklist + selittävä opas yhdessä**:

- **Edistymis-checklist (datavetoinen):** roolikohtainen "Näin pääset alkuun" joka **lukee pikakentät** ja näyttää
  oikean tilan — "Tuo pelaajat ✓ · Kutsu huoltajat (6/61) · Tee 1. testi · Aseta jaksofokus · Sulje jakso".
- **Selittävä opas-paneeli:** OSA 1 / OSA 2 / OSA 3 -sisältö roolin mukaan, avattavissa milloin tahansa.
- **Olemassa olevan hyödyntäminen:** Master-näkymässä on jo "Aloita tästä" -kohta → laajenna sitä.
- **Kontekstuaalinen ℹ️ -selitteet:** jo olemassa — laajennetaan kattavuutta.

**Periaatteet:** pikakentät (ei uusia kyselyitä) · ei pelaajalle raakalukuja · Carbon-teema · roolitietoinen
(VP näkee OSA 1, valmentaja OSA 2, fysiikkavalmentaja OSA 3).

> **Status:** sisältö (OSA 1–5) valmis ja jaettavissa heti onboarding-materiaalina. In-app-kerros (OSA 6) = oma
> rakennusvaihe; mockup → komento → live-verify kun työjonoon valitaan.
