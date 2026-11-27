# Vaihe 0 -selvitys: reCAPTCHA / App Check -lataus + Masterin ja Seuran listanäkymät (12.11.2026)

Vain selvitys, ei koodia. Jatkaa `docs/VAIHE0_MASTER_JA_SIVUKOKO.md`:tä mittausraportin (`docs/MITTAUSRAPORTTI_STAGING.md`) löydösten pohjalta. PM päättää numeroiduista kohdista (Q1–Q9).

Lähteet: `@firebase/app-check` 0.8.1 -lähdekoodi (= Firebase JS 10.7.1, jota Kehitystyöpöytä käyttää; luettu suoraan paketista), `lib/tm_appcheck.js`, CLAUDE.md §38, repon HTML/JS, `mittaus_tulokset/*.json` (sivut + dokumenttikoot).

---

## A. reCAPTCHA (353 kt kaikilla sivuilla) ja App Check -aktivointi

### A.1 Mitä SDK oikeasti tekee (verifioitu lähdekoodista, ei muistista)

1. **`ReCaptchaEnterpriseProvider.initialize(app)` ajetaan aktivoinnissa ja lataa heti `https://www.google.com/recaptcha/enterprise.js`** (`initializeEnterprise`) — riippumatta siitä, tarvitaanko tokenia. Siis jokaisessa sivulatauksessa, myös kun voimassa oleva token on jo välimuistissa.
2. **`getToken` katsoo ensin muistin, sitten IndexedDB:n** (`state.token` → `cachedTokenPromise`) ja kutsuu providerin `getToken()`:ia (eli reCAPTCHA-attestointia + `exchangeRecaptchaEnterpriseToken`) vain, jos kumpikaan ei sisällä voimassa olevaa tokenia. Tokenin voimassaolo = Console-asetus (App Check → Apps → reCAPTCHA Enterprise → Token TTL; SDK-oletus 1 h; **tarkista nykyarvo**).
3. **`isTokenAutoRefreshEnabled: true`** (meillä `activate(provider, true)`) lisää aktivoinnissa kuuntelijan, joka hakee tokenin heti jos sitä ei ole → attestointi alkaa sivun avauksessa.
4. **`CustomProvider`**: `getToken()` palauttaa `{ token, expireTimeMillis }`; `initialize(app)` vain tallentaa apin. Julkinen, vakaa rajapinta.
5. Staging-mittaus käyttää debug-tokenia, mutta `initialize` lataa reCAPTCHAn silti → 353 kt näkyy mittauksessa myös siellä (ja on siis tuotannossa sama).

### A.2 Kriittinen polku: mikä riippuu mistä

Ensimmäinen Firestore-luku → tarvitsee tokenin → tarvitsee reCAPTCHA-skriptin + attestoinnin (+ `exchange`-kutsun) → ENFORCE päällä (§38) hylkää tokenittoman kutsun **ilman uudelleenyritystä**. Interaktiivisuus (TTI) odottaa ensimmäisiä lukuja. Siis: **kylmällä ensikäynnillä reCAPTCHA on pakollisesti kriittisellä polulla**; sen siirtäminen "ensimmäisen piirron jälkeen" muuttaa FCP:tä (skriptit eivät kilpaile kaistasta) mutta ei TTI:tä, koska tavut pysyvät samoina ja luvut odottavat tokenia. Ainoa tapa pienentää TTI:tä on **olla lataamatta reCAPTCHAa lainkaan** silloin kun voimassa oleva token on jo olemassa.

### A.3 Vaihtoehdot

| | Mitä | Hyöty | Riskit |
|---|---|---|---|
| **A1. Laiska provider** | Aktivointi samassa kohdassa kuin nyt (järjestys §38 säilyy: provider rekisteröity ennen ensimmäistä kutsua), mutta `CustomProvider`, jonka `getToken()` lataa reCAPTCHAn ja vaihtaa tokenin vasta kun IndexedDB:ssä ei ole voimassa olevaa tokenia. `isTokenAutoRefreshEnabled: false` + oma ajastettu uusinta idle-ajassa. | **Toistokäynti voimassa olevalla tokenilla: −353 kt, ei reCAPTCHA-badgea eikä iframea.** Kylmä ensikäynti: ei muutosta TTI:hin (FCP paranee). | Vaatii attestoinnin toteutuksen itse (`grecaptcha.enterprise.execute` + `POST …/apps/{appId}:exchangeRecaptchaEnterpriseToken`) — SDK:n throttling/backoff, heartbeat-otsikko ja virhesemantiikka pitää toistaa; vaihtoehtona SDK:n sisäisten metodien (`provider.initialize/getToken`) käyttö on haurasta SDK-päivityksissä (portti `firebase_sdk_versio.test.js` pinnaa versiot, mutta sisäinen rajapinta ei ole sopimus). Uusinta: jos token vanhenee kesken käytön ja uusinta myöhästyy, seuraava pyyntö odottaa attestointia (~1–2 s piikki). Debug-token-polku (staging-mittaus, smoket) pitää säilyttää. |
| **A2. Aktivointi vasta piirron/idle-ajan jälkeen + kutsujen portitus** | `tmAppCheckAktivoi` siirretään `requestIdleCallback`iin; kaikki backend-kutsut odottavat tokenia. | Pieni (kaista vapautuu app-skripteille). | **Ei suositella:** kutsupaikkoja on satoja (VP, Master, Seura…), yksikin portittamaton kutsu = hylätty pyyntö ENFORCE-tilassa (P0-luokan riski, §38 "järjestys on pakottava"). Auth-/Firestore-/Functions-instanssit ottavat App Checkin käyttöön eri tavoin; "liittyy myöhässä" -käytös on verifioitava erikseen jokaiselle. |
| **A3. Pelkkä latausjärjestys** | `activate` kutsutaan heti app-skriptien jälkeen (ei `<head>`issa), ennen ensimmäistä kutsua. | FCP/ensipiirto nopeampi; TTI sama. | Pieni, mutta hyöty pieni; päällekkäinen A1:n kanssa. |
| **A4. Hybridi: attestointi vain kirjautumattomalle pinnalle** | Oikea reCAPTCHA vain kirjautumissivuilla ja ennen kirjautumista kutsuttavissa callableissa (`pelaajaKirjaudu` PIN, kutsut). Kirjautuneille sivuille (VP/Master/Seura/Kehitystyöpöytä) App Check -token annetaan palvelimelta: callable tarkistaa Firebase-ID-tokenin + claimit ja tulostaa `admin.appCheck().createToken(appId)`; `CustomProvider` käyttää sitä. | **Suurin hyöty: 353 kt pois kaikilta kirjautuneilta sivuilta, myös kylmältä ensikäynniltä** (token = yksi pieni callable-kutsu). | **Turvamalli muuttuu:** kirjautuneen käyttäjän tunnuksilla voi minttaa tokenin ilman attestointia → attestointi suojaa enää vain kirjautumatonta pintaa (PIN-väkivaltahyökkäys, kutsut, anonyymi scrape); tunnuksilla tehtävän väärinkäytön torjuu Auth + Rules. Callable ei itse voi vaatia App Checkia (muna–kana) → oma kiintiö/rate limit tarvitaan. Tarvitsee Teron turvakatselmoinnin; CLAUDE.md §38 ("uusi appi → App Check pakollinen") tarkennettava. |
| **A5. Toinen provider** | reCAPTCHA v3 -provider (vanhentunut, sama `recaptcha__fi.js`-paino), DeviceCheck/AppAttest (vain natiivi). | – | Ei kokoetua; v3 vanhentunut. |

### A.4 Suositus

1. **Ensin mittaus:** #1271:n resurssierittely + P8-uudelleenmittaus kertoo, mistä 353 kt koostuu (enterprise.js, `recaptcha__fi.js`, ankkuri-iframe, tyylit) ja paljonko niistä on koodattua vs. puretun kokoa.
2. **A1 + Token TTL pidemmäksi** (Q2): käyttäjä avaa sovelluksen tyypillisesti päivittäin; 1 h TTL tekee käytännössä jokaisesta istunnosta kylmän, joten **ilman TTL-nostoa A1 ei hyödytä oikeaa käyttöä** (vain mittauksen "lämmin"-ajoa). TTL-vaihtoehdot 30 min–7 vrk; 24 h pitää varastetun tokenin hyödyllisyysikkunan kohtuullisena. Q2 on turvapäätös (Tero).
3. **A4** vain jos tavoite on kylmän ensikäynnin TTI (esim. Kehitystyöpöytä puhelimella < 5 s) eikä kevennykset riitä — vaatii erillisen turvakatselmoinnin.
4. **Ei A2:ta.**

---

## B. Masterin ja Seuran listanäkymät: tarvittavat kentät + yhteenvetodokumentti

### B.1 Mittauksen lukemat (500 pelaajan seura, kylmä)

| Sivu | Lukuja | Verkossa (koodattu) | Purettuna | Mistä |
|---|---:|---:|---:|---|
| Master | 2 499 | 2,3 MB | **92,9 MB** (Fetch) | `pelaajat` 500 · `kooste` 1 000 (Pulssi: `pelaajat/{pid}/kooste/kertyma_*` ×500 kahdesti, `lib/tm_harjoituskertyma.js` `tmKertymaLueKooste`) · `kirjaukset` 500 kyselyä (N+1, `_lataaKirjaukset`) · `cg:sisainen` 2 · `kalenteri` 401 · `joukkueet` 75 |
| Seura | 1 048 | 0,5 MB | **14,3 MB** | `pelaajat` **1 000 = 2 × 500**: KPI-yhteenveto (`lataaYhteenvetoKPIt`, vain laskurit) ja pelaajalista (`pelaajaListaAlue`), lisäksi Kehitystilanne-näkymän oma `pelaajat.get()` |
| VP | 976 | 0,6 MB | 16,0 MB | `pelaajat` 500 · `kalenteri` 300 · muut pienet |

**Havainto (vaatii selvitystä, Q8):** dokumenttikoot (`mittaus_tulokset/dokumentit.json`): pelaajadokumentti mediaani 3,3 kt / p95 4,5 kt / max 48,5 kt (`jaksofokus_historia` 48 448 B!); `pelaajan_kooste` mediaani 10,4 kt. Näistä Masterin dokumenttisumma on ~15–20 MB, mutta mitattu purettu Fetch on 93 MB (Seura 14 MB vs. odotettu ~4–5 MB). Ero on 3–6× → joko Listen/WebChannel-kanava toimittaa samoja dokumentteja useaan kertaan (usea kuuntelija/target) tai purettu-luku on striimin kehysmittaus. Ennen mitoitusta pitää mitata **dokumenttitavut kokoelmittain instrumentoinnissa** (JSON-koko `snapshot.docs`), ei vain lukumäärää.

### B.2 Mitä Masterin ja Seuran listanäkymät oikeasti tarvitsevat

Kenttälaskenta koodista (`p.<kenttä>`-käyttö, Master 121 eri kenttää; Seura-sovellus 56; `seura_pelaajahallinta.js` 44):

**Tarvitaan listalla/kodissa heti (yhteenvetodokumenttiin):**
`id` · `etunimi`, `sukunimi` · `numero` · `pelipaikka`/`positio` (+ `tt_positio_aktiivinen`) · `joukkueet[]` (+ `joukkue` näyttönimi, jäsenyys-invariantti §7.18) · `syntymaVuosi` · **PHV-tila** (johdettu `tmPhvKoodi`:lla, tallennetaan koodina) · **pikakentät** `tki_viimeisin`/`tki_pvm`/`tki_kehityskohde`/`tki_vahvuus`/`tki_merkki`, `hh_viimeisin`/`hh_pvm`/`hh_taso`, `flei_viimeisin`, `sm_*_viimeisin`/taso, `d1_taso`/`d2_taso`/`d3_viimeisin`/`d3_varmuus` · **jakson tila** (`jaksofokus` → vain: konsepti_avain, alkoi, loppu, tila, ohjelma_id — ei historiaa) · `adar_viimeisin`/`adar_pvm`/`adar_havaintoja` · `streak`, `fiilinki` · `signaali` · `vastuuhenkilo` · `suostumusTila` · `idp_tila`/`idp_edistyma`/`idp_fokus`.
Arvio rivin koosta: ~200–300 B → 25 pelaajan joukkue ≈ 5–8 kt; 500 pelaajaa ≈ 100–150 kt (vrt. nyt 1,7–2,2 MB).

**Seuran pelaajalistaan lisäksi:** `sukupuoli`, `palloID`/`tunniste` (näyttöön), `lahde`, `talenttiOhjelma`/`talenttiTaso`/`talenttiAlku`, `pin`-**tila** (onko asetettu; ei PIN-arvoa), `huoltajaEmail`-**tila** (onko; ei osoitetta), loukkaantumis-merkintä (alue/tyyppi/pvm/paluu_arvio — terveystieto: vain jos suostumus, ks. B.5).

**EI listalle (haetaan vasta pelaajaa avattaessa):** `jaksofokus_historia` (jopa 48 kt / pelaaja; 20 käyttöpaikkaa, kaikki analytiikka/yksityiskohta), `kirjaukset`-sisältö, `havainnot`, `idp`-lomakkeen tekstit, `omatTavoitteet`, `kausikuvat`, `sisainen/*`, `terveys/*`, `pin`, `huoltajaEmail`.

### B.3 Miksi laiska lataus ei riitä (PM:n päätös P3 → C ensisijainen)

Firestore Web SDK ei tee kenttäprojektiota: `get()` palauttaa koko dokumentin, joten 500 × 3,3 kt (ja 48 kt:n poikkeamat) tulee aina, vaikka lista tarvitsisi 250 B/rivi. Laiska lataus (B) ja joukkuerajaus (A, P2) pienentävät lukumäärää (Master 2 499 → ~100–300 oman joukkueen valmentajalla), mutta:
- talenttivalmentajan "koko seura suodattimesta" (P2), VP ja **Seura** (500 pelaajan taulukko) tarvitsevat yhä koko seuran listan;
- N+1-kyselyt (`kirjaukset` 500 kyselyä, Pulssin 500 `kooste`-lukua kahdesti) eivät ratkea rajauksella;
- palvelinkooste siirtää työn kerran palvelimelle sen sijaan että jokainen avaus maksaa sen (laskutus: lukuja/avaus × avauksia).

### B.4 Ehdotus: kevyt yhteenvetodokumentti (VP:n viikkokoosteen malli)

Samaa kaavaa kuin `kooste/{vvvv-Www}` + `kooste_joukkue/{jid}_{vvvv-Www}` (`functions/seuran_kooste.js`, `lib/tm_seuran_kooste.js`; palvelin kirjoittaa Admin SDK:lla, client ei kirjoita, Rules rajaa luvun):

```
seurat/{sid}/lista_joukkue/{jid}
  laskettu, versio, n,
  rivit: [ { id, e, s, n, pp, jk[], sv, phv, tki:{v,pvm,kk,vh}, hh:{v,t,pvm}, flei, jf:{k,a,l,t,o}, adar:{v,pvm,n}, st, fi, sg, vh, sut, idp:{t,e} } … ]   // lyhyet avaimet, tiiviit tyypit

seurat/{sid}/lista_seura/{sivu}        // Seuran taulukko: seuran kaikki pelaajat, jaettuna ≤ 250 riviä/dokumentti (1 MiB:n rajan alle ja luvun osittain)
seurat/{sid}/lista_kirjaukset/{jid}    // viimeiset 14 pv / 100 kirjausta (nyt 500 kyselyä × ≤ 7 dokumenttia)
seurat/{sid}/kooste_joukkue/…          // olemassa: lisätään Pulssille läsnäolo-% ja alle 70 % olevien pid:t (ei nimiä; nimet haetaan listasta)
```

**Kirjoitus:** (a) yöajo + (b) callable "Päivitä nyt" (kuten `paivitaSeuranKooste`) + (c) tapahtumapohjainen päivitys (`onWrite` pelaajaan/pikakenttiin/kirjaukseen) **debouncattuna** Cloud Tasks -jonolla joukkueittain — **yksittäisen dokumentin kirjoitusnopeus on noin 1/s kestävästi**, joten pelkkä `onWrite` → `update(rivit)` hajoaa massatuonnissa (500 kirjoitusta) ja joukkuekohtaisissa mittaussessioissa; siksi yhdistetty uudelleenrakennus (rakenna koko joukkue kerralla, 1 kirjoitus / joukkue / 10–30 s).
**Lukeminen:** Master/VP/Seura lukevat 1 dokumentin / joukkue (Master: 1–3, Seura: 2–3, VP: 25 joukkuetta tai `lista_seura`) → Master ~2 499 → **~10–20 lukua**, 93 MB → ~0,1–0,3 MB.
**Tuoreus:** lista on eventuaalisesti johdonmukainen (sekunteja–minuutteja). Kirjoittava käyttäjä päivittää oman muistinsa heti (kuten nyt `_pelaajatData`), joten oma muutos näkyy välittömästi; muiden muutokset viiveellä. Näkymissä "päivitetty hh:mm" + vaihtoehtoinen "Päivitä nyt".
**Käyttöönotto:** lippu `liput.lista_yhteenveto` (kuten V-KOTI-liput); client lukee yhteenvedon ja **putoaa vanhaan polkuun** jos dokumenttia ei ole tai `versio` on vanhempi → ei kovaa riippuvuutta; backfill-skripti (`scripts/`, Admin SDK, Tero ajaa) rakentaa kaikki seurat; vanhan polun poisto vasta kun yhteenveto on todennettu seuran datalla.

### B.5 Riskit ja rajaukset (Rules, tietosuoja, invariantit)

- **Rules (Teron kaista):** uudet `match`-blokit (§7.15): `lista_*`: luku kuten `pelaajat` (SA/johto/oman seuran henkilökunta; valmentaja vain oman joukkueen dokumentti kuten `kooste_joukkue`); client ei kirjoita; **Rules v3.83** (v3.82 on varattu) + Rules-testit.
- **Ei `sisainen`/`terveys`/PIN/huoltajan sähköpostia yhteenvetoon.** Nämä ovat nykyisin omissa alikokoelmissaan/oman suostumuksensa takana (§12); yhteenveto ei saa kiertää niitä. Loukkaantumismerkintä (Seuran näkymässä) vain jos nykyinen lukuoikeus sallii (terveys-suostumus) — muuten pois tai "ei näytetä".
- **§7.22 lapselle:** yhteenvetoa lukee vain henkilökunta; pelaaja/huoltaja eivät (kuten kooste).
- **Jäsenyys-invariantti (§7.18):** rivit rakennetaan `tmPelaajanJoukkueet`:lla; pelaaja useassa joukkueessa → rivi jokaisessa; `lista_seura` uniikit pelaajat.
- **Yksi totuus näkymissä (§41):** PHV-koodi/ryhmät lasketaan jaetuista libeistä (`tm_phv_tila`, `tm_nakyma_ryhmat`) palvelimella samalla koodilla (Node-kelpoiset libit) — ei toista logiikkaa.
- **Kustannus:** kirjoituksia/seura/vrk ≈ joukkueita × päivityksiä (~25 × ≤ 100); luvut putoavat ~99 % → nettosäästö suuri.
- **Kokoraja:** rivi 250 B × 500 = 125 kt < 1 MiB; jaetaan ≤ 250 riviin/dokumentti, ettei yksi dokumentti kasva rajaan 4 000+ pelaajan seurassa; **CLAUDE.md §41:n "palvelinkooste vasta > ~1 000 pelaajaa" päivitettävä** (PM-päätös tämä tapahtuu aiemmin).

### B.6 Ilman yhteenvetoa heti tehtävät (nopeat, pienet PR:t)

| # | Muutos | Vaikutus |
|---|---|---|
| 1 | **Seura:** KPI + lista + Kehitystilanne jakavat yhden `pelaajat`-luvun (muistissa jaettu lupaus) | 1 000 → 500 lukua, −7 MB purettua |
| 2 | **Master:** `_ohjLaskeN`/`_ohjLataaPelaajatCache` käyttävät `_pelaajatData`a (ei omaa `pelaajat.get()`:iä) ja ajetaan vasta Ohjelmat-näkymässä | −500 lukua tarvittaessa |
| 3 | **Master:** `sisainen`-collectionGroup + terveys vasta pelaajakortissa (B-vaihe, P3) | −500…−1 000 lukua |
| 4 | **Master:** `_lataaKirjaukset` N+1 → yksi collectionGroup(`kirjaukset`) `seuraId`+`paivitetty`-kysely (vaatii kenttä + indeksi + Rules → Teron kaista) tai siirto yhteenvetoon | −500 kyselyä |
| 5 | **Instrumentointi:** tavut kokoelmittain (B.1 -havainto) | mitoitus ja 93 MB -arvoitus |

### B.7 Vaiheistus (ehdotus)

0. Mittaus: dokumenttitavut kokoelmittain + P8-uudelleenmittaus (1–5 yllä, ei yhteenvetoa).
1. Skeema + palvelinkirjoittaja `lista_joukkue` + Rules v3.83 + Rules-testit + backfill-kuiva-ajo (Teron kaista).
2. Master lukee `lista_joukkue` lipulla (vanha polku varalla); verifiointi seurakäyttäjällä (§0), KPV-testipelaajat.
3. Seura (`lista_seura`), Pulssi (`kooste_joukkue`), kirjaussyöte.
4. Vanhan polun purku; §41 päivitys.

---

## C. Päätettävät kohdat (PM)

- **Q1.** Hyväksytäänkö A.2:n johtopäätös: reCAPTCHA pysyy kylmän ensikäynnin kriittisellä polulla, tavoite = toistokäynti (A1) — ja kylmään vain A4, jos turvakatselmointi sallii?
- **Q2.** App Check -token TTL (Console): nykyarvo? Ehdotus 24 h (A1 hyödyttää vasta sen kanssa). Turvapäätös (Tero).
- **Q3.** A1: oma `exchangeRecaptchaEnterpriseToken`-toteutus (julkinen API, enemmän koodia) vai SDK:n sisäiset metodit (vähemmän koodia, hauras)? Suositus: oma, testattu.
- **Q4.** A4 (palvelimelta mintattu token kirjautuneille) selvitykseen vai pois?
- **Q5.** Yhteenvetodokumentin skeema B.4 hyväksytään lähtökohdaksi (joukkuekohtainen rivilista + seurataulukko + kirjaussyöte)?
- **Q6.** Tuoreus: hyväksytäänkö sekunteja–minuutteja vanha lista muiden muutoksille (oma muutos heti)?
- **Q7.** Seuran listassa näytetään loukkaantumismerkintä (terveystieto)? Suositus: ei yhteenvetoon; haetaan pelaajaa avattaessa.
- **Q8.** Aloitetaanko B.6:n nopeat korjaukset (1, 2, 5) ennen yhteenvetoa? Suositus: kyllä, pieninä PR:inä; 3–4 Masterin B-vaiheen mukana.
- **Q9.** CLAUDE.md §41 -päivitys (palvelinkooste aiemmin kuin 1 000 pelaajaa) kirjataan päätöksen jälkeen.

---

## D. Kohta 5 — Viikkokoosteen jako seurakohtaisiin tehtäviin (fan-out)

### D.1 Lähtötilanne ja mittaus

Funktiomittaus (staging, 2 seuraa): `laskeSeuranKooste` max **46,6 s**, eli noin **20 s / 500 pelaajan seura**. Valvonta 6 s ja kirjautumisaika 1 s ovat kunnossa.

Syy koodissa (`functions/seuran_kooste.js`): `laskeKaikki` käy seurat **peräkkäin** (`for … await laskeSeura`), ja yksi `laskeSeura` tekee seuran koko työn: joukkueet + pelaajat + `sisainen`-yhdistys, `keraaOma` (2 kyselyä / pelaaja, 25 rinnakkain), viikkokatsausten `getAll`, katselmusten kyselyt, batch-kirjoitukset ja lopuksi toimenpide-ehdotukset (projekti 03). Ajastetut (`ajastettuKasittelija`, su 21 ja ma 06) ajavat kaikki seurat **yhdessä funktiokutsussa**.

| | Nyt | 40 seuraa |
|---|---|---|
| Kokonaisaika | ~20 s / 500 pelaajaa, summautuu | **~600–900 s** (isompia seuroja → enemmän) |
| P11 (270 s) | ok | **ylittyy** |
| Funktion aikaraja (1st gen scheduled, 540 s) | ok | **ylittyy** → ajo katkeaa kesken, loput seurat ilman koostetta, eikä virhettä kirjata seurakohtaisesti |

Aika kasvaa lineaarisesti seurojen määrässä, joten pelkkä muistin/rinnakkaisuuden nosto ei riitä pitkään: ongelma on rakenteellinen (yksi kutsu = kaikki seurat).

### D.2 Ehdotus: dispatcher + yksi tehtävä per seura

```
Cloud Scheduler (su 21, ma 06, ennallaan)
   └─ dispatcher-funktio (lyhyt, ~2–5 s)
        · lukee aktiiviset seurat (yksi seurat.get())
        · laskee kerran: rajat, nytMs, koosteViikko → tunniste (vvvv-Www)
        · jonottaa YHDEN tehtävän / seura, payload { sid, tila, nytMs, vk, arvio:false }
   └─ worker-funktio (laskeSeura per seura, europe-west1)
        · ajaa nykyisen laskeSeura(deps, sid, { rajat(vk), nytMs })  ← sama koodi kuin callablessa
        · epäonnistuu → vain tämä seura yritetään uudelleen
```

**Kuljetus — vertailu:**

| | Cloud Tasks (`functions.tasks.taskQueue`, v1) | Pub/Sub (`pubsub.topic().onPublish`) |
|---|---|---|
| Rinnakkaisuuden rajaus | **Kyllä** (`rateLimits.maxConcurrentDispatches`, `maxDispatchesPerSecond`) | Ei suoraan; rajaus vain `maxInstances`illa |
| Uudelleenyritys | **Konfiguroitava** (`retryConfig`: maxAttempts, minBackoff/maxBackoff, maxDoublings) | Oletus pois; `failurePolicy:true` yrittää **jopa 7 vrk** ellei viesti onnistu → vaarallinen (sotkee viikot) |
| Kaksoistoimitus | Tehtävänimellä dedupe (`id`) | At-least-once, ei dedupea |
| Tehtävän enimmäiskesto | Pidempi kuin scheduled (tarkistettava SDK-versiosta, ennen toteutusta) | 540 s |
| Uusi riippuvuus | Cloud Tasks API + jono (`firebase-admin/functions` `getFunctions().taskQueue(...)`) | Ei (Pub/Sub jo käytössä ajastuksissa) |

**Suositus: Cloud Tasks.** Rinnakkaisuuden rajaus (esim. 8 yhtä aikaa) suojaa Firestorea ja toisia käyttäjiä, uudelleenyritys on hallittu ja tehtävän `id` antaa dedupen. Pub/Sub on varavaihtoehto, jos Cloud Tasks -jonon käyttöönotto (API + IAM `cloudtasks.enqueuer`) ei onnistu CI-deployssa.

**Seinäaika fan-outilla:** 40 seuraa × ~20 s / 8 rinnakkaista ≈ **100–150 s** (isoimman seuran aika + jonotus), alle P11:n 270 s. Yksittäinen seura on tuhansien pelaajien tapaukseen (5 000 pelaajaa ≈ 200 s) yhä alle 540 s; sen yli seura jaettaisiin joukkueittain (`keraaOma` on nyt vakioerissä 25, rinnakkaisuuden nosto ensin).

**Tärkeä yksityiskohta — aikaleima kulkee mukana:** `arvioHetki = min(nytMs, su21Ms)` riippuu ajohetkestä. Dispatcher laskee `nytMs`:n ja viikon tunnisteen **kerran** ja antaa ne tehtävän payloadissa; worker ei kutsu `Date.now()`ia. Muuten uudelleenyritys tuntien päästä laskisi eri arvion ja su 21 / ma 06 -ajot voisivat päätyä eri viikkoon (§7.26: Helsingin päivä `helsinki_paiva.js`).

### D.3 Kustannus

| Erä | Arvio | Huomio |
|---|---|---|
| Firestore-luvut | **ei muutu** (sama työ, jaettuna) | Dominoiva kustannus; ~2–3 k lukua / 500 pelaajan seura × 40 × 2 ajoa/vko ≈ 160–240 k/vko → suuruusluokka **alle 0,2 € / vko** (hinta tarkistettava eur3-hinnastosta; tämä on arvio, ei mittaus) |
| Function-kutsut | 40 seuraa × 2 = **80 worker + 2 dispatcher / vko** | Vapaiden kiintiöiden sisällä |
| Laskenta (GB-s) | sama summa kuin nyt (~800 s × muisti) | Fan-out ei lisää; rinnakkaisuus ei maksa lisää, vain pienentää seinäaikaa |
| Cloud Tasks | ~80 tehtävää / vko | ilmainen taso 1 M / kk |
| Pub/Sub (vaihtoehto) | ~80 viestiä / vko | käytännössä 0 € |
| Cloud Scheduler | 2 jobia (ennallaan) | ei muutosta |

Johtopäätös: kustannus ei ole peruste jättää tekemättä; fan-out ei kasvata laskua mitattavasti. **Seurannassa:** worker-lokiin seura-id + kesto + lukumäärät (ei nimiä/pelaaja-ID:itä), jotta vertailu 20 s -lukuun onnistuu myös tuotannossa.

### D.4 Virheet ja uudelleenyritys

- **Seurakohtainen eristys:** nyt yhden seuran virhe kirjataan ja jatketaan (`laskeKaikki`), mutta aikakatko vie kaikki. Fan-outilla katkaisu osuu vain yhteen seuraan.
- **Idempotenssi on jo olemassa:** koosteet kirjoitetaan `set`illa (sama dokumentti-id = viikon tunniste), ehdotukset `create()`illa deterministisellä id:llä (`ehdotusId`, ALREADY_EXISTS → `ohitettu`). Siksi uudelleenyritys ja kaksoistoimitus ovat turvallisia.
- **Uudelleenyrityspolitiikka (ehdotus):** 4 yritystä, `minBackoff` 60 s, `maxDoublings` 3; **ei yritetä** pysyviä virheitä (`kooste sisältää kiellettyjä kenttiä` = tmKoosteRikkomukset → ohjelmointivirhe, ei uudelleen). Pysyvät virheet palautetaan 2xx + virheloki, tilapäiset (DEADLINE_EXCEEDED, UNAVAILABLE) heitetään → jono yrittää uudelleen.
- **Ei hiljaista epäonnistumista (muistisääntö):** jos kaikki yritykset kuluvat, jää jälki: virheloki (`[seuran kooste] seura <sid> <vk>`) + hälytys (Cloud Monitoring log-based, "viikkokooste epäonnistui"). Lisäksi dispatcheriin "tarkistusajo" (esim. su 23:30 / ma 07:30): puuttuuko `kooste/{vk}` jostakin aktiivisesta seurasta → jonota uudelleen. Ilman tätä seura voi jäädä ilman viikon koostetta eikä kukaan huomaa.
- **Päällekkäinen su 21 ↔ ma 06:** ovat jo nyt turvallisia (sama viikon tunniste, `set` + `create`). Jos su-tehtävä vielä yrittää uudelleen ma 06, kaksi samaa työtä ajaa rinnakkain: tulos sama, vain turha kustannus. Tehtävä-id `kooste_{sid}_{vk}_{tila}` estää saman tehtävän tuplan.

### D.5 "Päivitä nyt" -callable (`paivitaSeuranKooste`)

Nykyinen polku: callable (johto/SA, `tarkistaOikeus`) → 30 s jäähy (`kooste.laskettu`) → **synkroninen** `laskeSeura` yhdelle seuralle → vastaus `{ vk, joukkueita }`. Se on jo seurakohtainen, joten fan-out ei muuta sen perusrakennetta, ja **se käyttää samaa `laskeSeura`a kuin worker** (ei kahta toteutusta).

| Vaihe | Muutos | Perustelu |
|---|---|---|
| 1 | **Ei muutosta**: pysyy synkronisena | 20 s / 500 pelaajaa mahtuu callablen aikarajaan; tuettu skenaario = yksi seura |
| 2 (jos p95 > ~40 s tai isompi seura) | Callable jonottaa **saman workerin** tehtävän (id `paivita_{sid}_{vk}_{30 s -ikkuna}`) ja palauttaa `{ jono: true }`. Klientti kuuntelee `kooste/{vk}.laskettu` (`onSnapshot`) ja näyttää "päivitetty hh:mm" | ei aikarajaa, ei hiljaista katkeamista; jäähy ja tehtävä-id estävät spämmin |

Muuta: callablen oikeustarkistus (johto/SA oma seura) pysyy callablessa; **worker ei luota payloadiin** vaan tarkistaa, että `sid` kuuluu aktiiviseen seuraan (tehtäväjono ei ole julkinen, mutta puolustus syvyydessä). Dispatcher/worker eivät ole client-kutsuttavia (`taskQueue`-funktiot vaativat palvelutilin).

### D.6 Toimenpide-ehdotukset (projekti 03) mukana

Ehdotukset lasketaan nyt `laskeSeura`n **lopussa** samassa kutsussa (`deps.ehdotukset`, vain `!opts.arvio`), joten ne kulkevat fan-outissa automaattisesti seurakohtaisen tehtävän mukana ja jakavat sen aikarajan (~lisää luku `toimenpiteet.where(tila == 'ehdotus')` ja `create`t).

Havainnot, jotka vaativat päätöksen:
1. **Ehdotusvirhe nielaistaan** (`try/catch` → virheloki, koostetta ei kaadeta). Fan-outissa tämä tarkoittaa, että jono ei koskaan yritä ehdotuksia uudelleen: koosteen onnistuminen peittää ehdotusten epäonnistumisen (= hiljainen virhe). **Ehdotus:** worker saa lipun `ehdotusVirhe` tulokseen ja heittää **vasta koosteen kirjoituksen jälkeen** (kooste on jo tallessa, uudelleenyritys ajaa vain ehdotukset uudelleen; `create` + ALREADY_EXISTS tekee siitä idempotentin). Vaihtoehto: ehdotukset omaksi tehtäväkseen (`ehdotukset_{sid}_{vk}`), jolloin virhe ja kesto näkyvät erikseen — selkeämpi, hieman enemmän koodia.
2. **Viikko-ankkuri** (`rajat.tunniste`) kulkee payloadissa (D.2), joten su 21 ja ma 06 törmäävät edelleen samaan `ehdotusId`-viikkoon; jos tehtävä yrittää uudelleen tuntien päästä, viikko ei vaihdu.
3. **Rinnakkaisuus ja dedup (D134):** `ehdotusEste` lasketaan seurakohtaisesti avoimista (`tila == 'ehdotus'`), joten seurojen rinnakkaisajo ei vuoda yli seurojen. Saman seuran kaksi tehtävää rinnakkain (su-uudelleenyritys + ma) → `create` ALREADY_EXISTS → turvallista.
4. **Callable "Päivitä nyt"** luo ehdotukset samalla tavalla (arvio false). Jos ehdotukset epäonnistuvat, kliennille palautetaan nyt silti onnistuminen → lisätään vastaukseen `ehdotukset: 'virhe'` jotta UI voi näyttää toimintaohjeen (silent-failure-sääntö), ei vain lokiin.
5. **Loki:** `_lokitaEhdotukset` kirjaa vain luvut ja seura-id:n — sopii sellaisenaan workeriin.

### D.7 Vaiheistus ja muutettavat tiedostot (ei toteutettu tässä PR:ssä)

1. **`functions/`** (Teron kaista): `seuran_kooste.js` → `laskeKaikki` korvataan dispatcherilla + exportoidaan worker-käsittelijä (`laskeSeura` ennallaan); `index.js` → uusi taskQueue-funktio + dispatcher kahdelle ajastukselle (su 21 / ma 06 jäävät omiksi jobeikseen, vain sisältö muuttuu); IAM/Cloud Tasks -jono CI-deployssa (`STAGING_ASENNUS.md` päivitettävä).
2. **Testit:** dispatcher jonottaa täsmälleen yhden tehtävän / aktiivinen seura (epäaktiivinen ohitetaan); payload sisältää `nytMs`+`vk`; worker idempotentti (kaksi ajoa → sama lopputulos, ei tuplaehdotuksia); ehdotusvirhe ei kadota koostetta mutta aiheuttaa uudelleenyrityksen.
3. **Mittaus:** `funktiomittaus` mittaa nyt yhden kutsun kestoa; fan-outille mitataan **kokonaisseinäaika** (dispatcher käynnistyksestä viimeisen seuran `kooste.laskettu`-aikaan) ja **max yksittäinen tehtävä**; P11-rajan tulkinta (kokonaisaika vs. yksittäinen) kirjataan raporttiin.
4. **Staging:** ajastukset on pausetettu (PM: "aja Deploy Staging (vain functions)") — fan-out testataan ensin staging-datalla (500 pelaajan seura × 2 + synteettiset 38 seuraa tai jono-ajo samalla seuralla useasti).
5. **Tuotanto:** kuiva-ajo/`arvio:true`-tila säilyy; ensimmäinen su-ajo seurataan lokista (seurojen lukumäärä = tehtävien lukumäärä = `kooste`-dokumentit).

### D.8 Päätettävät kohdat

- **Q10.** Kuljetus: Cloud Tasks (suositus) vai Pub/Sub?
- **Q11.** Rinnakkaisuus ja uudelleenyritys: 8 yhtä aikaa, 4 yritystä, 60 s minBackoff — hyväksytäänkö lähtöarvoiksi?
- **Q12.** Ehdotukset: samassa tehtävässä virheen uudelleenyrityksellä (nopea) vai omana tehtävänään (selkeämpi)?
- **Q13.** "Päivitä nyt": pidetäänkö synkronisena (vaihe 1) ja siirrytään jonoon vasta mittauksen p95 > 40 s?
- **Q14.** Tarkistusajo (puuttuva `kooste/{vk}` → jonotus uudelleen) + hälytys mukaan ensimmäiseen toteutukseen? Suositus: kyllä.
- **Q15.** Tarkistettava ennen toteutusta (ei vielä verifioitu tässä selvityksessä): Cloud Tasks -funktion enimmäiskesto ja `taskQueue`-tuki asennetussa `firebase-functions`-versiossa (`functions/package.json`: ^6.6.0, v1-API) sekä `cloudtasks.enqueuer`-oikeus CI-palvelutilille.

---

## F. Toteutus: lista_joukkue PR 1 (palvelin) — 12.11.2026

Toteutettu B.7 vaihe 1 (PM 12.11.). Master lukee dokumentin vasta PR 2:ssa (lippu `lista_yhteenveto`).

**Skeema** `seurat/{sid}/lista_joukkue/{jid}`: `{ jid, nimi, versio: 1, n, rivit: [...], laskettu }`. Rivi (lyhyet avaimet, `lib/tm_lista_yhteenveto.js`): `id e s n pp tp jn sv sg phv tki{v,pvm,k,vh,m} hh{v,t,pvm} flei sm{} d1 d2 d3{v,vm} jf{k,a,l,t,o} adar{v,pvm,n} st fi sg2 vh{u,r} sut idp{t,e,f} to tt jk[] d1r d2r`. Tyhjät arvot jätetään pois. Rivikoko tyypillisesti 200–300 B, vartijaraja 1 200 merkkiä.

**Lähde ja rajaukset**
- Luetaan VAIN `joukkueet` + `pelaajat/{pid}` (ei `sisainen/*`, ei `terveys/*`; A-kentät puuttuvat riveiltä, PR 2 käsittelee ne). Ei PIN:iä, huoltajan sähköpostia, loukkaantumismerkintää, `jaksofokus_historia`a.
- Jäsenyys `tmPelaajanJoukkueet` (monen joukkueen pelaaja → rivi jokaisessa), PHV `tmPhvKoodi` (vain mittauslähteestä), D1/D2-ryhmä `tm_nakyma_ryhmat.tmRyhmat` (`d1r`/`d2r`; ei tallennettuja tasokenttiä).
- Vartija `tmListaRikkomukset` ennen jokaista kirjoitusta: kielletty avain missä tahansa syvyydessä, sähköpostin näköinen arvo tai liian iso rivi → seuran rakennus keskeytyy (virhe lokiin), mitään ei kirjoiteta.
- Poistetuille joukkueille jääneet `lista_joukkue`-dokumentit poistetaan samassa ajossa.

**Päivitystavat** (`functions/lista_yhteenveto.js`, kaikki Admin SDK)
| Tapa | Funktio | Huomio |
|---|---|---|
| Yöajo | `laskeListaYhteenvedot` 03:30 Europe/Helsinki | kaikki aktiiviset seurat peräkkäin, virhe ei kaada muita |
| "Päivitä nyt" | callable `paivitaListaYhteenveto({seuraId})` (App Check) | SA, johto, talenttivalmentaja, valmentaja (oma seura, `tarkistaOikeus`); 30 s jäähy → `{tuore:true}` |
| Debouncattu | `merkitseListaLikaiseksi` (pelaajan onWrite) + `siivoaListaLikaiset` (minuutin ajastus) | merkki `lista_likainen/{pid}` vain jos listariviin vaikuttava kenttä muuttui (viimeisinKirjautuminen, PIN, kirjaus- ja historiakentät eivät laukaise). Siivooja rakentaa seuran, kun merkit ovat hiljenneet 30 s tai vanhin on odottanut 5 min. Merkki poistetaan ehdolla `updateTime` → uudempi muutos säilyy |

Debounce on tarkoituksella ilman Cloud Tasksia: merkki on pelaajakohtainen dokumentti (ei "hot-dokumenttia", joten ~1 kirjoitus/s -raja ei tule vastaan 500 pelaajan tuonnissa), eikä jono/IAM-muutoksia tarvita (Q15 on erillinen fan-outin päätös). Hinta: 1 kysely/min (~1 440 lukua/vrk tyhjänä) + 1 funktiokutsu per listariviin vaikuttava pelaajakirjoitus. Siirto Cloud Tasksiin on mahdollinen myöhemmin vaihtamalla vain merkki+siivooja.

**Rules v3.83** (Teron kaista): `lista_joukkue/{jid}` luku SA | oman seuran johto | talenttivalmentaja | oman joukkueen valmentaja (kuten `kooste_joukkue`), kirjoitus `false`; `lista_likainen/{pid}` ei clientille. Testit `tests/rules/v383_lista_yhteenveto.rules.test.js`.

**Backfill** `scripts/lista_yhteenveto_backfill.js` (Tero ajaa; oletus kuiva-ajo, `--kirjoita`, `--seura=`, `--projekti=`). Tulostaa vain lukumäärät ja kilotavut.

**Ei vielä:** `lista_seura`, `lista_kirjaukset`, Pulssin laajennus (B.7 vaihe 3); CLAUDE.md §41 päivitetään PR 2:ssa, kun lukija on käytössä (Q9).

**Käyttöönottojärjestys:** (1) merge → CI deployaa Rules v3.83 + funktiot, (2) Tero ajaa backfillin kuivana ja sitten `--kirjoita` stagingissa (`--projekti=talentmaster-staging`), (3) tarkistetaan dokumenttikoot ja yöajon kesto, (4) PR 2 (Master lukee lipulla).
