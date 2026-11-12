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
