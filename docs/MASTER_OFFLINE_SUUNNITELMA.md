# Master_v16 offline-tuki — suunnitelma

> **Vain suunnitelma.** Ei koodi-, Rules- eikä infra-muutoksia, ei uusia ulkoisia palveluita. Laadittu 3.10.2026; luvut luettu `main`-tilasta.
> Liittyy: CLAUDE.md §7.2 (`getIdToken(true)`), §26 (pikakenttäparit), §27.4 (SW-allowlist), §37 (julkinen kieli), §38 (App Check), §39 (GDPR);
> `docs/FIREBASE_SDK_YHTENAISTYS.md`; mallit: `sw_adar.js`, `sw_pelaaja.js`, `sw_vanhempi.js`, ADAR_Pikakortti (`enablePersistence`).

## TL;DR

- **Tavoite:** valmentaja kirjaa kentällä ilman yhteyttä **läsnäolon, harjoitusarvioinnin, havainnon/viestin ja reflektion (myös äänen)**; kaikki synkkaa yhteyden palatessa eikä mitään katoa hiljaa.
- **Suositus 2a: Firestore `enablePersistence({synchronizeTabs:true})` datalle** (sama ratkaisu kuin ADAR_Pikakortissa tuotannossa) **+ pieni oma "kirjanpito" (ledger)** jonojen näkyvyyteen ja hylkäysten talteenottoon **+ oma IndexedDB-jono vain mediatiedostoille** (Storage ei jonota). Oma täysi kirjoitusjono hylätään.
- **Master ei käytä yhtään callablea** (ei lataa `firebase-functions-compat`ia, eikä ladatuissa `lib/`-tiedostoissa ole `httpsCallable`-kutsuja) → callable-offline-ongelmaa ei ole. Estettävät toiminnot ovat transaktio (`runTransaction`) ja palvelinriippuvaiset näkymät (§5).
- **Toteutus: 5 erää + erä 0 (spike, ei käyttäjävaikutusta)** — yksi PR per erä. SW + asennettava PWA viimeisenä.
- **Riippuvuus SDK-yhtenäistykseen:** tee offline **vasta kun Master on siirretty 10.7.1:een** (SDK-erä 3). `enablePersistence`-API on compatissa sama 9.22.1:ssä ja 10.x:ssä (merkkijonohaku compat-tiedostoista), mutta vältetään kaksi regressiokierrosta samalle riskialueelle (§8).

---

## 0. Nykytila (varmistettu)

| Asia | Tila |
|---|---|
| Tiedosto | `TalentMaster_Master_v16.html`, **10 542 riviä**, compat **9.22.1** (app, app-check, auth, firestore, storage; **ei functions**) |
| Offline | **Ei** `enablePersistence`a, **ei** service workeria, **ei** manifestia, ei `navigator.onLine`-käsittelyä |
| Kirjoituskohdat | **54 grep-osumaa** (`.set/.add/.update/.delete`), joista **~44 oikeaa Firestore-kirjoituskohtaa** (loput `Set.add`/`Map.set`/`classList.add`) **+ ~20 kirjoituskohtaa ladatuissa `lib/`-tiedostoissa** (§1) |
| Callablet | **0** |
| Storage-kirjoitus | vain `lib/tm_aani.js` (`sref.put(blob)`): **reflektion ääni** (`seurat/{sid}/kayttajat/{uid}/reflektiot/`, max ~12 MB). Kuvien lataus Masterista: **ei nykyistä** |
| `getIdToken(true)` | 22 kutsua Masterissa + 5 `lib/`-tiedostoissa (§7.2) |
| Aiempi offline-käsittely | `lib/tm_valmentajaviesti.js`: **idempotentti dokumentti-id** (`tmViestiUusiId`) + `uusiYritys`-tarkistus (ei tuplaa) + aikaraja (`tmViestiAikarajalla`); kommentti: "Master ei käytä Firestoren offline-välimuistia, `add()` voi jäädä roikkumaan" |
| Tunnetut varoitukset | Seura/Admin **poistivat** `enablePersistence`n 2026-03-27 ("IndexedDB-konflikti Auth-sessionin kanssa", ei tarkempaa syytä); Pelaaja_v7 ei käytä persistenceä tarkoituksella (alaikäisten data yhteiskäyttölaitteella). ADAR_Pikakortti käyttää (`synchronizeTabs:true`, 9.22.1) ilman tunnettua ongelmaa |
| Ulkoiset skriptit | Sentry-bundle (CDN), **XLSX (cdnjs, head, synkroninen)**, Chart.js (lazy, cdnjs), Google Fonts CSS — offline: ei saa kaataa sivua (§2b) |

---

## 1. Kirjoitusinventaario

Luokat: **K** = kenttävalmennuksessa tarvitaan offline (kyllä) · **M** = myöhemmin / suunnittelutyö, hyötyy mutta ei kriittinen · **E** = ei offline (vaatii verkon / toimistotyö / ylläpito).
Kaikki Master-kirjoitukset ovat suoria Firestore-kirjoituksia (**ei callablea**). "Rivi" = `TalentMaster_Master_v16.html` ellei toisin mainittu.

### 1.1 Master_v16.html

| Kohta (funktio, rivi) | Kokoelma (`seurat/{sid}/…`) | Kentät / tyyppi | Offline | Huomio |
|---|---|---|---|---|
| **`_calTallennaLasnaolo` 9402–9425** | `kalenteri/{id}/lasnaolijat/{pid}` + `kalenteri/{id}` | batch: `tila`…, `lasnaolo_kooste`, `paivitetty` (serverTimestamp), `muokkaaja_uid` | **K** | Ydintoiminto. Batch toimii offline ja on atomisesti jonossa |
| **`_calTallennaSessioRPE` 8861–8866** | `kalenteri/{id}` | `set` RPE/kesto | **K** | |
| `_calPoistaTapahtuma` 9486–9499 | `kalenteri` | batch soft-delete (`poistettu:true`, `poistettu_pvm`) | M | Poisto kentällä ei kriittinen; ristiriitariski (§3.5) |
| `_calMuokkaaTapahtuma` 9508–9565 | `kalenteri` | batch `set(merge)` | M | Toistuvat sarjat → monta dokumenttia |
| `_calToistEsik` 9758–9871 | `kalenteri` | `add` + batch (toistuvuus) | M | Suunnittelu |
| `_tallennaVahvistus` 3857–3862 · `_suljeTapahtuma` 3921–3929 | `testitapahtumat` | `vahvistetutPelaajat`, `tila:'suljettu'` | M / **E** | Sulkeminen vaatii kokonaiskuvan → verkossa |
| Palaute pelaajalle 3298–3313 | `pelaajat/{pid}/palautteet/{id}` | `set(merge)` teksti, `nakyvyys`, `pvm` (ISO) | **K** (erä 3) | Idempotentti id (`docId`) jo |
| Harjoitusprioriteetti 3347–3360 | `joukkueet/{j}/harjoitusprioriteetti/aktiivinen` | `set(merge)` | M | |
| `_tallennaCoachProfiili` 4782–4789 · `_notifTallennaAsetukset` 8468–8477 · `_cpdTallennaVaatimus` 8338–8343 | `kayttajat/{uid}` · `konfiguraatio/harjoitusarviointi` | profiili / asetukset | **E** | Asetukset verkossa |
| `_notifAvaa` 8437 · `_notifKaikkiLuetuiksi` 8449 | `kayttajat/{uid}/notifikaatiot/{id}` | `luettu:true` | M | Best-effort, ei jonoon käyttäjälle näkyvänä |
| `_tmLaskuri` 3281–3288 | `kayttajat/{uid}` | `*_n` (**increment**), `*_viim` (serverTimestamp) | M | Kommutatiivinen; ei ledgeriin |
| `_ttAsetaPositio` 5912–5941 | `pelaajat/{pid}` | `tt_positio_*` | M | |
| Jaksofokus: `_ehdKons2` 6236, `_msAsetaFyysFokus` 6375, `_ohjKaytaOhjelma` 6528, `_msTallenna` 6758, `_mIdpVtAktivoi` 7011 | `pelaajat/{pid}` | `jaksofokus` (+ `jaksofokus_historia`) | M | Suunnittelu; map-kenttä (§3.5) |
| Ohjelmat: `_ohjArkistoi` 6536 · `_ohjEditTallenna` 6628 | `ohjelmat` | `set`/`add` | **E** | |
| **`_toinenVuosi` 6891–6909** | `idp_kausi` (kausidokumentit) + `pelaajat` | **`runTransaction`** + `set` `idp_*` | **E** | **Transaktio ei toimi offline** → estetään selkeällä viestillä |
| Tavoitteet: `_prPaivitaAktiiviset` 7768 · `_prTallennaTavoite` 7781 · `_prVaihdaTila` 7800 | `pelaajat/{pid}/tavoitteet` + `pelaajat/{pid}` | `add` / `update tila` / `tavoite_aktiivinen_kpl` | M | Pari (tavoite + laskuri) → batchiksi jos jonotetaan |
| D3-itsearvio 9968–9971 | `pelaajat/{pid}` | `d3_viimeisin`, `d3_taso`, `d3_pvm`, `d3_varmuus` (pari, §26) | M | Pvm `new Date().toISOString().slice` → PR 2 (#722-linja) |
| **ADAR-pikakentät `paivitaAdarPikakentat` 10048–10077 · `uusinPvm`-kirjoitus 10116 · `_ehdotaTalentti` 10127** | `pelaajat/{pid}` | `adar_*` aggregaatit, `talentti_ehdotus` | **K** (johdettu) | Aggregaatti lasketaan lukemalla → **deferred** (§3.4) |
| `backfillAdarPikakentat` 10141–10171 · `_migratoiAdar13` 10303–10316 | `pelaajat` | batch/`set` | **E** | Ylläpitotyökalut |
| `_adarTallennus…` (ADAR on oma appinsa: `ADAR_Pikakortti` jo offline-ensin) | — | — | — | Master avaa vain näkymän |

### 1.2 `lib/`-tiedostot, jotka Master lataa

| Tiedosto (rivi) | Kokoelma | Kuvaus | Offline |
|---|---|---|---|
| **`lib/tm_harjoitusarviointi.js` 267** | `harjoitusarvioinnit` | **`add(doc)`** (arviointi; Rules ei vaadi `luotu`/kenttärajausta → paikallinen aikaleima kelpaa) | **K** |
| `lib/tm_harjoitusarviointi.js` 271–281 | `harjoitusarvioinnit` (query) → `kayttajat/{uid}` | **read-modify-write**: lukee valmentajan kaikki arvioinnit, laskee pikakentät, `update(pika)` | **K, deferred** (§3.4) |
| **`lib/tm_valmentajaviesti.js` 73–81** | `pelaajat/{pid}/havainnot/{id}` | havainto/viesti `add`/`set(id)` + idempotentti uusinta | **K** |
| `lib/tm_pikakirjaus.js` 258 + 263 | `pelaajat/{pid}/testitulokset/{pvm}` **ja** `pelaajat/{pid}` | **kaksi erillistä kirjoitusta** (tulos + pikakenttäpari `update(upd)`) | **K** — **muutettava yhdeksi batchiksi** (§26) |
| **`lib/tm_reflektio.js` 112–136** | `kayttajat/{uid}/reflektiot/{id}` + `kayttajat/{uid}` | `set(doc)` (pvm UTC → PR 2) + laskuri `update` + **ääni Storageen** (`tm_aani.js` 149) | **K** (erä 3 teksti, erä 4 ääni) |
| `lib/tm_aktiivisuus.js` 57 | `kayttajat/{uid}` | `viimeisinKirjautuminen` serverTimestamp | M (ohitetaan offline) |
| `lib/tm_havainto_kaavio.js` 59 | `pelaajat/{pid}/havainnot/{id}` | `update` (kaaviolinkki) | M |
| `lib/tm_kaavio_ui.js` (6 kirjoitusta: 682, 699, 752, 874, 1960 …) | `kaaviot`, `kaaviot/{id}/kommentit` | kaavioeditori | **E** |
| `lib/tm_aani.js` 149 | **Storage** `…/reflektiot/` | `put(blob)` | **K** (erä 4, media-jono) |

> **Äänipalaute:** Masterissa on **äänireflektio** (oma, `tm_reflektio` + `tm_aani`). Palautteen *antaminen* toiselle valmentajalle (ääni) tehdään **VP_v25:ssä** (`palaute_jaettu`); Master vain näyttää saadun. Jos kentällä tarvitaan myös VP:n äänipalaute offline, sama media-jono (erä 4) kattaa sen myöhemmin VP:lle.

**Yhteenveto:** K = läsnäolo, RPE, harjoitusarviointi (+ pikakentät deferred), havainto/viesti, palaute pelaajalle, ADAR-pikakentät (johdettu), testikirjaus (pikakirjaus), reflektio (+ääni). **E** sisältää transaktion, kaaviot, ylläpidon ja asetukset.

---

## 2. Kerrokset ja ratkaisut

### 2a. Data — `enablePersistence` vs. oma IndexedDB-jono

| | **A. Firestore `enablePersistence({synchronizeTabs:true})`** | B. Oma IndexedDB-kirjoitusjono |
|---|---|---|
| Kirjoitukset | SDK jonottaa **kaikki** `set/add/update/batch` automaattisesti, myös paikalliset näkymät (read-your-writes: paikalliset kyselyt näkevät odottavat kirjoitukset) | Pitää kirjoittaa uudelleen **~44 + ~20 kohtaan**; UI ei näe jonossa olevaa ilman omaa yhdistelylogiikkaa |
| Lukeminen offline | Välimuistista (`onSnapshot`/`get` → cache), samat kyselyt | Ei — vain kirjoitus; luku vaatisi erillisen välimuistin |
| Atomisuus | `batch`/`set(merge)` atomisia; **`runTransaction` ei toimi offline** | Oma toteutus, oma bugipinta |
| Ristiriidat | Firestoren kenttätason LWW (`set(merge)` / `update` lähettävät vain annetut kentät) | Oma |
| Koodimäärä | **Pieni**: yksi alustusrivi + wrapperit | **Suuri** |
| Tuotantokokemus | **ADAR_Pikakortti** (9.22.1, `synchronizeTabs:true`) | Ei |
| Riskit | (1) **Alaikäisten data jää laitteen IndexedDB:hen** → uloskirjautumisessa tyhjennys (§3.6) · (2) rejected-write -hylkäys ei nouse esiin sivun uudelleenlatauksen jälkeen (§3.7) · (3) Seura/Admin-aikainen "IndexedDB-konflikti" (tuntematon syy) · (4) iOS Safarin IndexedDB-käytännöt (data voi poistua asentamattomalta sivulta; PWA-asennus auttaa — tarkistettava laitteella) | Kaikki kirjoitukset omalla vastuulla |

**Suositus: A + ledger.**
- **A** hoitaa kirjoitus/luku-jonon. `enablePersistence` kutsutaan **heti `initializeApp`in jälkeen, ennen mitään Firestore-kutsua** (ja ennen `tmAppCheckAktivoi()`:n jälkeistä ensimmäistä kyselyä), `try/catch`: `failed-precondition` (toinen välilehti ilman sync) / `unimplemented` → jatka online-tilassa ja näytä merkki "Offline ei käytössä tässä selaimessa".
- **Ledger** (pieni, localStorage/IndexedDB): jokainen jonotettava kirjoitus kirjataan `{id, tyyppi, polku, tiivistelmä, aika, tila:'odottaa'|'synkattu'|'hylatty', virhekoodi}`. Wrapper `tmKirjoita(tyyppi, polku, lupausTehdas)` käynnistää kirjoituksen, **ei odota ack:ia UI:ssa** (ADAR-malli), ja päivittää ledgerin kun `.then`/`.catch` laukeaa. Ledger antaa (i) "odottaa lähetystä (n)" -laskurin, (ii) hylkäysten talteenoton (§3.7), (iii) uloskirjautumisvaroituksen (§3.6). Firestore ei paljasta odottavien kirjoitusten määrää.
- **Oma jono vain medialle** (§2c).
- **Hylätty vaihtoehto B** koko datalle: kaksinkertainen työ ja suurin bugipinta pienellä hyödyllä.
- **Cache-koko:** `settings({cacheSizeBytes})` ennen `enablePersistence`a (oletus 40 MB LRU riittää; Master lukee seuran pelaajat ~satoja dokumentteja) — mitataan spikessä.
- **Lukupolku offline:** Masterin ~270 kokoelmaviitteestä suurin osa on `.get()`. Offline `get()` palauttaa välimuistin, kun SDK tietää olevansa offline; viive voi olla pitkä ensimmäisellä kerralla. Kentän näkymille (kalenteri, joukkue, pelaajalista) käytetään `{source:'cache'}` kun `navigator.onLine===false` tai SDK:n verkko on `disableNetwork`illa pois (§3.2). Muut näkymät lukutilassa (§5).

### 2b. Sovelluskuori — `sw_master.js`

- **Oma `sw_master.js`** juureen (`scope ./`), mallina `sw_adar.js` / `sw_pelaaja.js`. **Allowlist, ei "cache kaikki"** (§27.4): vain
  1. Masterin oma HTML (`./TalentMaster_Master_v16.html`) — **network-first, fallback cache** (SHELL),
  2. Masterin **omat** `lib/*.js?v=…` -tiedostot (versioitu URL → cache-first) — lista **johdetaan Masterin omista `<script src>`-riveistä** ja vartioidaan testillä kuten `tests/pelaaja_offline.test.js` ("JOKAINEN oma `<script src>` osuu allowlistiin"),
  3. versioidut SDK-URLit `gstatic.com/firebasejs/<versio>/…` (+ `app-check-compat`),
  4. fontit (Google Fonts CSS + gstatic-fontit), manifest + ikonit (`assets/pwa/`),
  5. cdnjs XLSX 0.18.5 (versioitu; muuten head-skripti epäonnistuu offline — ei kaada sivua mutta Excel-vienti ei toimi) ja Chart.js 4.4.1 (lazy).
- **Ei cachetettavaa:** muiden appien sivut, `version.json` (verkko; Masterin versiotarkistus `fetch('version.json?cb=…')` epäonnistuu offline hiljaa — OK), Sentry-bundle ja `*.ingest.de.sentry.io` (telemetria), reCAPTCHA (`www.google.com/recaptcha/`, `gstatic.com/recaptcha/`), kaikki Firebase API -hostit (`firestore.googleapis.com` jne.).
- **PRECACHE minimaalinen:** `[SHELL]` vain. `cache.addAll` on atominen: **jokaisen polun on palautettava 200** (§27.4:n 404-löydös: yksi 404 estää SW:n asennuksen). Kaikki muu cachetetaan pyydettäessä allowlistillä.
- **CSP (`firebase.json`) ja rekisteröinti:** `worker-src 'self'`, `manifest`/ikonit samasta originista → OK. SW rekisteröidään vasta erässä 5. Versio-reload (`tm-reload-to`) säilyy: uusi `APP_VERSION` → reload, SW:n shell päivittyy network-firstillä.
- **`CACHE`-nimi** (`tm-master-vN`): vältä turhia nostoja — nosto poistaa vanhan shellin ja SDK:n activate-vaiheessa ja katkaisee offline-käynnistyksen ennen ensimmäistä verkkolatausta (sama päätelmä kuin SDK-suunnitelmassa).

### 2c. Media — ääni (ja mahdolliset kuvat) Storageen

Storage-SDK **ei jonota** latauksia (epäonnistuu `maxUploadRetryTime`n jälkeen). Siksi **oma pieni IndexedDB-jono** (`tm_offline_media`):
1. Tallennushetkellä offline: `blob` (+ mime, kesto, kohdepolku `seurat/{sid}/kayttajat/{uid}/reflektiot/{docId}.{ext}`, `docId`) talletetaan IndexedDB:hen, ja **reflektio-dokumentti kirjoitetaan heti Firestore-jonoon** tilassa `audio_tila:'odottaa'` (teksti/pvm/laskuri säilyvät; `audio_url`/`audio_path` täydentyvät myöhemmin). `docId` luodaan etukäteen (idempotenssi).
2. Yhteyden palatessa (ja App Check -token saatu, §3.3): jonon käsittelijä lataa blobin (`put`), hakee `getDownloadURL`, tekee `update({audio_url, audio_path, audio_kesto_s, audio_tila:'valmis'})`, poistaa blobin vasta onnistuneen `update`n jälkeen.
3. Virheet: kvootti täynnä / Rules-hylkäys / 12 MB ylitys → blob **säilyy** laitteella, ledger-tila `hylatty`, käyttäjälle selvä viesti + "Lataa tiedosto laitteelle" -vaihtoehto (ei hiljaista katoamista). Kesto-/kokorajat pysyvät ennallaan.
4. Uloskirjautuminen: ääni on **henkilödataa** → sama varoitus/tyhjennys kuin dokumenttijonolla (§3.6).
5. **Rules-tarkistus (erä 4, ennen koodia):** vaatiiko `reflektiot`-dokumentin `update` rajattuja kenttiä (`hasOnly`)? Jos kyllä, tarvitaan oma Rules-PR **ennen** mediajonoa (tässä suunnitelmassa ei muuteta Rulesia).
6. Kuvat: Masterissa ei nykyistä kuvalatausta; jos tulee, käyttää samaa jonoa.

---

## 3. Kriittiset riskit

### 3.1 `getIdToken(true)` ennen kirjoitusta (§7.2)
- `getIdToken(true)` vaatii verkon → offline **hylkää** (`auth/network-request-failed`) ja kirjoitus ei edes alkaisi.
- Sääntö on olemassa, koska vanhentunut sessio/claims aiheuttivat `permission-denied`. **Rules ei heikkene**, jos jonotettu kirjoitus lähetetään SDK:n **tuoreella** tokenilla: SDK hakee ID-tokenin refresh-tokenilla lähetyshetkellä (claims päivittyvät silloin).
- **Ratkaisu:** wrapper `tmTuoreToken()`: jos `navigator.onLine` → `getIdToken(true)` **4 s aikarajalla** (epäonnistuminen sallittu, kirjoitus jatkuu); jos offline → ohita ja kirjoita jonoon. Dokumentoidaan §7.2:een poikkeukseksi ("offline: SDK päivittää tokenin synkassa"). Verkossa käytös on **identtinen** nykyiseen.
- Jos käyttäjä **deaktivoidaan** tai roolia muutetaan offline-jakson aikana: synkka hylätään (`permission-denied`) → §3.7. Tämä on oikea käytös.

### 3.2 / 3.3 App Check -token offline ja synkassa
- Token haetaan reCAPTCHA Enterprise -kutsulla → **vaatii verkon**. Offline SDK käyttää välimuistissa olevaa tokenia (voimassaolo rajallinen) ja kirjoitukset jäävät jonoon.
- **Vaara:** jos yhteys palaa mutta uusi token ei ole vielä saatu, SDK voi lähettää jonon **ilman tokenia** → ENFORCE (§38) hylkää → Firestore **pudottaa pysyvästi hylätyt kirjoitukset** (permission-denied/unauthenticated ovat ei-uudelleenyritettäviä). Tämä on suunnitelman **suurin yksittäinen riski**.
- **Ratkaisu (varmistetaan spikessä, erä 0):** pidä Firestore-verkko **pois** (`disableNetwork()`) kun `navigator.onLine===false` ja kytke `enableNetwork()` vasta kun (a) `online`-tapahtuma tuli ja (b) `firebase.appCheck().getToken(true)` onnistui (aikaraja + uusinta). Sama portti mediajonolle. Spike mittaa: lähteekö SDK jonon ilman tokenia, ja miten ENFORCE-virhe näkyy.
- **ENFORCE-aikana** testit tehdään preview-kanavalla debug-tokenilla (§38) ja tuotannossa pienellä pilotilla (§7).

### 3.4 `serverTimestamp` offline, päivämäärät ja pikakenttäparit
- `serverTimestamp()` täyttyy vasta **synkassa** (paikallisessa näkymässä `null`; `snapshotOptions.serverTimestamps:'estimate'` antaa arvion). Kentät, joiden pitää kuvata **kirjaushetkeä** (esim. `pvm`, `kirjattu`), kirjoitetaan **paikallisesta kellosta**: `pvm = tmPaivaIso(new Date())` (#722-linja; ei `toISOString().slice(0,10)`) ja aikaleima `new Date().toISOString()`. `paivitetty`/`luotu` (serverTimestamp) jäävät kuvaamaan **synkkahetkeä**; Rules ei vaadi `luotu==request.time` Masterin kirjoittamissa kokoelmissa (`harjoitusarvioinnit`, `lasnaolijat`; `luotu == request.time` esiintyy `omat_tavoitteet`-säännöissä, joita Master ei kirjoita — tarkistetaan per erä).
- Päiväraja: yöllä (00:00–02:59) kirjattu offline-merkintä saa **paikallisen** päivän kirjaushetkellä (ei synkkapäivää).
- **Pikakenttäparit (§26)** (`x_viimeisin` + `x_pvm`, `adar_*`): kirjoitetaan **atomisesti samasta arvosta** samassa `batch`issa — myös jonosta. Nykyiset **kaksi erillistä kirjoitusta** (`tm_pikakirjaus.js` 258+263) muutetaan yhdeksi batchiksi (erä 3).
- **Johdetut aggregaatit** (harjoitusarvioinnin pikakentät `lib/tm_harjoitusarviointi.js` 271–281): lukee **kaikki** valmentajan arvioinnit → offline välimuisti voi olla vajaa → aggregaatti **väärä**. Siksi: arviointidokumentti (`add`) jonoon heti; **pikakenttäpäivitys deferred**: ledgeriin merkintä `laske_pikakentat`, ajetaan vasta **verkossa synkan jälkeen** (palvelinluku tuoreeksi → laske → `update`). Ei koskaan lasketa vajaasta välimuistista.

### 3.5 Ristiriidat (kaksi valmentajaa muokkaa samaa dokumenttia offline)
- Oletus: **kenttätason LWW** — Masterin kirjoitukset ovat pääosin `set(merge)`/`update`, jotka lähettävät vain annetut kentät; eri kentät eivät ylikirjoita toisiaan. Viimeisenä synkkaava voittaa saman kentän.
- Kohdekohtaisesti: `lasnaolijat/{pid}` — kaksi valmentajaa merkitsee saman pelaajan samaan tapahtumaan → viimeisen synkan `tila` voittaa (hyväksyttävä; `muokkaaja_uid`+`paivitetty` jättävät jäljen); `kalenteri` muokkaus → LWW kentittäin; `increment`-laskurit kommutatiivisia; `harjoitusarvioinnit`/`havainnot` ovat **uusia dokumentteja** (idempotentti id) → ei ristiriitaa; **map/array-kentät** (`jaksofokus`, `vahvistetutPelaajat`) korvautuvat kokonaan → M-luokka, ei jonoon ennen kuin tarve selvä.
- Ei omaa merge-logiikkaa: transaktiopohjainen versiotarkistus ei toimi offline. Mahdollinen myöhempi parannus (palvelinpuolinen tarkistus) on oma tehtävänsä.

### 3.6 Uloskirjautuminen kesken jonon / jaettu laite (GDPR §39)
- Persistence tallentaa **kaiken luetun** (alaikäisten pelaajatiedot) laitteen IndexedDB:hen salaamattomana → **tyhjennys on pakollinen**.
- **Uloskirjautuminen:** (1) ledger/`waitForPendingWrites` kertoo odottavat; jos n>0 → dialogi (§4): "Laitteella on n lähettämätöntä merkintää. Pysy kirjautuneena kunnes ne on lähetetty" / "Poista ne laitteelta ja kirjaudu ulos" (vahvistus). (2) Kun n=0 tai poisto vahvistettu: `await db.terminate(); await db.clearPersistence();` + mediajonon tyhjennys + ledgerin tyhjennys + sivun reload.
- **Käyttäjänvaihto:** tallennetaan `tm_offline_uid`; jos kirjautuva uid ≠ edellinen → tyhjennä välimuisti **ennen** `enablePersistence`a. Odottavat kirjoitukset ovat Firestoressa uid-sidottuja (vanhan käyttäjän jono ei lähde toisen tunnuksella), joten tyhjennys on myös tietosuojasyy.
- **Session vanheneminen/Auth-poisto** kesken jonon: sama dialogi seuraavalla avauksella; dataa ei hävitetä hiljaa.
- Pilotissa offline-tuki on **päällä vain käyttäjille, jotka sen on aktivoineet** (lippu `tm_offline=1` / myöhemmin kayttajat-asetus), jotta yhteiskäyttölaitteet eivät tallenna dataa tietämättään.

### 3.7 Rules hylkää synkatun kirjoituksen — miten valmentaja saa tiedon
- Firestore **pudottaa** pysyvästi hylätyn kirjoituksen. Promise hylkää (`permission-denied`) **vain jos sivu on yhä auki**; sivun uudelleenlatauksen jälkeen hylkäys on **hiljainen** (SDK ei kerro). Siksi ledger:
  - kirjoituksen `.catch` → ledger `hylatty` + virhekoodi → käyttäjälle ilmoitus "Merkintää ei voitu lähettää (syy)" + **sisältö säilyy** ledgerissä (tekstikopio) → "Kopioi teksti" / "Yritä uudelleen" / "Poista";
  - uudelleenlatauksen jälkeen: `odottaa`-tilaiset ledger-rivit → `waitForPendingWrites()` + tarkistus (`get` kohdedokumentista) → joko `synkattu` tai `hylatty (tuntematon syy)`;
  - spike (erä 0) selvittää, mitä `waitForPendingWrites` palauttaa hylätyn kirjoituksen jälkeen.
- Ääni: blob säilyy aina, kunnes `update` onnistuu (§2c).

---

## 4. Käyttöliittymä (§37 julkinen kieli — rauhallinen, ei hälyttävä)

- **Offline-merkki** (yläpalkissa): "● Ei yhteyttä — merkinnät tallentuvat laitteelle" (neutraali/harmaa tai amber, **ei punaista**, ei "virhe"/"varoitus").
- **Laskuri:** "Odottaa lähetystä (3)" kun ledgerissä on `odottaa`-rivejä; klikkaus avaa listan (tyyppi + lyhyt kuvaus, **ei pelaajien nimiä listoissa/ilmoituksissa jos kuva jaetaan** — vain "Läsnäolo U13 2.10.").
- **Kuittaus:** "✓ Lähetetty" (lyhyt, vihreä-teal) kun jono tyhjenee; ei toastia jokaisesta rivistä.
- **Hylätty:** "Yksi merkintä ei mennyt perille (n). Sisältö on tallessa." + toiminnot (§3.7); sävy neutraali, ohje selkeä.
- **Estetyt toiminnot offline** (transaktio, kaaviot, asetukset): "Tämä tarvitsee yhteyden. Yritä uudelleen kun verkko on palannut." (ei virheilmoitusta, nappi harmaana).
- **Pelaajalle/perheelle ei näy mitään** (Master on henkilöstösovellus); §7.22 ei koske.
- Tekstit fi + en; **sv-avaimet tyhjinä Gemini-jonoon** (§0). Merkit käyttävät tilaa `navigator.onLine` + SDK:n verkkotilaa (`onSnapshot` `fromCache`) — `onLine` yksin on epäluotettava (kenttäverkko "yhteydessä mutta ei dataa").

---

## 5. Rajaus — mikä toimii offline

| Näkymä / toiminto | Offline |
|---|---|
| Kalenteri (tänään/viikko), joukkue + pelaajalista | **Lukutila + kirjoitus (läsnäolo, RPE)** — kun data on ladattu verkossa ennen offline-jaksoa |
| Läsnäolo, RPE, harjoitusarviointi, havainto/viesti, palaute pelaajalle, testikirjaus (pikakirjaus), reflektio (+ääni) | **Kirjoitus jonoon** (erät 2–4) |
| Pelaajakortti / profiili | **Vain lukutila** (välimuistissa olevat tiedot, "päivitetty hh:mm" -vihje) |
| Saatu palaute (`palaute_jaettu`), historia | Vain lukutila jos välimuistissa; muuten "Tarvitsee yhteyden" |
| Raportit, kehitystilanne-koosteet, kaavio-/kirjastonäkymät, Excel-vienti | **Eivät toimi** (laskenta vaatii koko datan / ulkoisen XLSX:n) — selkeä viesti |
| **AI-apurit** (Valmennusapuri ym.) | **Eivät toimi** (palvelinpuolinen, Bedrock EU) |
| Transaktiot (`_toinenVuosi`), ohjelmat, kaaviot, asetukset, ylläpito/backfill | **Eivät toimi** (estetään viestillä) |
| Kirjautuminen | **Ei offline-kirjautumista**: sessio säilyy (Auth LOCAL), mutta uusi kirjautuminen vaatii verkon |
| Kutsut/sähköposti/kortit (Seura) | Ei Masterissa |

---

## 6. Toteutus erinä (yksi PR per erä)

| Erä | Sisältö | Käyttäjävaikutus |
|---|---|---|
| **0 — Spike** | Kokeellinen haara/lippu, ei tuotantoon: (1) `enablePersistence` Masterissa + Auth LOCAL rinnakkain (**tarkista vanha "IndexedDB-konflikti"**), (2) App Check -token offline/synkka — lähteekö jono ilman tokenia, miten ENFORCE hylkää (`disableNetwork`/`enableNetwork`-portti), (3) hylätyn kirjoituksen näkyvyys (`waitForPendingWrites`, uudelleenlataus), (4) cache-koko ja offline `get`-viive, (5) iOS Safari / Android Chrome -IndexedDB-käytös. **Ulostulo: tulokset tähän dokumenttiin + go/no-go** | Ei |
| **1 — Perusta** | `enablePersistence` (lippu-ohjattu), ledger, `tmTuoreToken()`, verkkoportti (§3.3), **offline-merkki + laskuri**, **uloskirjautumisdialogi + välimuistin tyhjennys + käyttäjänvaihto**, §7.2-poikkeuksen kirjaus CLAUDE.md:hen. Ei vielä uusia kirjoituspolkuja jonoon | Merkki, uloskirjautumisvaroitus |
| **2 — Läsnäolo + arviointi** | `_calTallennaLasnaolo`, `_calTallennaSessioRPE`, `lib/tm_harjoitusarviointi.js` `add` + **deferred pikakenttälasku**; `{source:'cache'}`-lukupolku kalenteriin/joukkueeseen | Läsnäolo ja arviointi toimivat offline |
| **3 — Havainnot, viesti, testikirjaus, reflektio (teksti)** | `lib/tm_valmentajaviesti.js` (idempotentti id ennallaan), palaute pelaajalle, **`tm_pikakirjaus.js` kaksi kirjoitusta → yksi batch (§26)**, `tm_reflektio.js` (teksti), ADAR-pikakentät (johdetut, deferred) | Havainto/viesti/testit/reflektio offline |
| **4 — Media-jono (ääni)** | `tm_offline_media` (IndexedDB), reflektio `audio_tila`, lataus + `update` synkassa, hylkäys/vienti-vaihtoehto; **Rules-tarkistus ensin** | Äänireflektio offline |
| **5 — `sw_master.js` + PWA** | SW (§2b), `manifest_master.json` + ikonit, asennettava PWA, SW-allowlist-portti (`tests/master_offline.test.js` vrt. `pelaaja_offline`), offline-käynnistys | Master avautuu ilman verkkoa, asennettavissa |

**5 erää + erä 0 (spike) = 6 PR:ää.** Erä 0 voi päättyä "no-go"-päätökseen (esim. jos App Check -jonoportti ei toimi) — silloin etenemistä ei jatketa ennen ratkaisua.

---

## 7. Testisuunnitelma

**Yhteinen:** **seurakäyttäjä (valmentaja/VP KPV:ssä), ei SA** (§0: SA ei todista oikeuksia). **Kirjoitukset vain Topiakselle** (KPV, doc-ID `m93GBdOaGCUuenMiCL0I` — kaksi u:ta); kalenteri-/läsnäolotestit KPV:n testitapahtumassa. Muut alaikäiset: vain luku.

| Testi | Miten |
|---|---|
| **Lentotila puhelimella** | Lataa kalenteri + joukkue verkossa → lentotila → merkitse läsnäolo + RPE + arviointi + havainto (Topias) → merkki + laskuri näkyvät → lentotila pois → jono tyhjenee, kuittaus; tarkista Firestoresta (oikea data, oikea **paikallinen päivä**) |
| **Yhteys katkeaa kesken tallennuksen** | Katkaise verkko napin painalluksen aikana ja heti sen jälkeen; ei duplikaatteja (idempotentit id:t), ei hukattua merkintää |
| **Rules-hylkäys synkassa** | Aiheuta hylkäys (esim. deaktivoi testikäyttäjän rooli/claims offline-jakson aikana tai kirjoita kentällä, jonka Rules estää) → ledger `hylatty`, ilmoitus, sisältö tallessa; uudelleenlataus ennen synkkaa → tila säilyy |
| **Kaksi laitetta ristiin** | A ja B offline, molemmat muokkaavat samaa tapahtuman läsnäoloa / samaa kenttää → synkka → kenttätason LWW, ei tietokatoa muissa kentissä; ei konflikti-virheitä |
| **App Check** | Preview-kanava (debug-token) + tuotantopilotti: offline-jono → yhteys palaa → ei `MISSING_*`-hylkäyksiä (§3.3), `verification_count` ennen/jälkeen |
| **Uloskirjautuminen kesken jonon** | Odottavia n>0 → dialogi; "poista" → IndexedDB + media + ledger tyhjät (tarkista DevToolsissa); käyttäjänvaihto tyhjentää välimuistin |
| **Media** | Äänireflektio offline → synkka → `audio_url` täyttyy; hylkäys (12 MB+) → blob säilyy; uloskirjautuminen poistaa blobin vasta vahvistuksesta |
| **Multi-tab** | Kaksi välilehteä: `synchronizeTabs` toimii; `failed-precondition`-polku näyttää merkin |
| **SW/PWA (erä 5)** | SW asentuu (kaikki PRECACHE-polut 200); offline-käynnistys; SW-päivitys; ei muiden appien sivuja cachessa; asennus kotinäytölle iOS + Android |
| **Sentry/CSP** | Ei CSP-rikkomuksia; testivirhe näkyy `app:master`-tagilla ilman henkilötietoja |
| **Automaattitestit** | Ledger, wrapperit, deferred-laskenta, §26-batch, päivämäärä (`tmPaivaIso`), SW-allowlist-portti; kaikki oikealla sivukoodilla vm:ssä (vrt. `tests/pelaaja_offline.test.js`) |

**Palautus:** lippu pois päältä = nykytila; erä = yksi PR → revert-PR. Offline-päällä oleva laite tyhjentää välimuistin (`clearPersistence`) kun lippu kytketään pois.

---

## 8. Riippuvuus Firebase-yhtenäistykseen — 9.22.1 vai uusi versio?

- **Persistence-API:** compatissa `firebase.firestore().enablePersistence({synchronizeTabs:true})` on **sama 9.22.1:ssä ja 10.x:ssä** (merkkijonohaku `firebase-firestore-compat.js`-tiedostoista: 9.22.1, 10.7.1, 10.14.1, 12.19.0 — `enablePersistence` ja `synchronizeTabs` löytyvät kaikista). **Eroa on modular-API:ssa** (`persistentLocalCache`/`persistentMultipleTabManager`), jota Master ei käytä. Firestoren IndexedDB-formaatti ei muutu 9.22 → 10.x (changelog).
- **Firestore 4.x:n korjaukset** relevantteja offline-käytölle: multi-tab-persistencen korjaukset (4.6.3, 4.7.2 → firebase ≥10.12–10.14) ja "Backend didn't respond within 10 seconds" -virheiden esto (4.6.1). **10.7.1** (yhtenäistyksen kohde, Firestore 4.4.0) ei sisällä niitä.
- **Suositus:**
  1. **Älä rakenna offlinea 9.22.1:lle.** Tee ensin SDK-yhtenäistyksen **erä 3** (Seura + Master → 10.7.1), jotta persistence testataan **kerran** lopullisella versiolla eikä kahta riskialuetta (SDK-vaihto + offline) muuteta samassa Masterissa.
  2. Erä 0 (spike) ajetaan **10.7.1:llä**; jos multi-tab- tai viive-ongelmia ilmenee, harkitaan Masterin nostoa **10.14.1:een** (Firestore 4.7.x) erillisellä päätöksellä.
  3. Jos offline-tarve ajaa SDK-aikataulun edelle: persistence toimii 9.22.1:lläkin (API sama), mutta silloin SDK-erä 3 on regressiotestattava uudelleen offline-paketti päällä (ledger, jono, SW).
- **Aikataulu:** SDK-erät 1–6 alkavat vasta, kun päivämääräkorjauksen PR 2 on mergetty (päätös #727). Offline-erä 0 (spike) voi alkaa heti **erillisellä haaralla/lipulla** ilman tuotantovaikutusta, mutta erä 1 vasta SDK-erän 3 jälkeen.

---

## 9. Päätökset (Tero, 3.10.2026)

1. **Suositus 2a hyväksytty** (`enablePersistence` + ledger + media-jono). Erä 0 -spike go/no-go-portilla (tulokset §10).
2. **Offline-tuki lippukohtaisena:** valmentaja kytkee sen itse päälle. **Ei oletuksena kenellekään.**
3. **Mittarit:** Tero seuraa App Check verified-%:ia ja Sentryä 24 h jokaisen erän jälkeen.
4. **VP:n äänipalaute offline:** ei nyt; myöhemmin erillisenä.
5. **§7.2-poikkeus hyväksytty** sillä ehdolla, että **verkossa käytös on identtinen nykyiseen** (verkossa `getIdToken(true)` kuten ennen; offline-poikkeus vain kun `navigator.onLine===false`; spiken mukaan tuore token pakotetaan joka tapauksessa ennen jonon lähetystä, §10.2).

---

## 10. Erä 0 (spike) — tulokset

> **Spike-haara:** `spike/offline-era0` (EI mergetä, ei PR:ää). Sisältää (a) `spike/offline/` — pieni harness + ajuri, joka ajaa Firebase compat **10.7.1**:tä **Firestore- ja Auth-emulaattoreita** vasten headless Chromella (CDP: offline-emulointi, verkon esto, uudelleenlataus, useita välilehtiä) oikeilla `tm_admin/firestore.rules`-säännöillä ja custom-claimeilla; `results.json` = raakatulokset; ajo: `firebase emulators:exec --only firestore,auth --project demo-tm-spike "node spike/offline/run.mjs"` (Java 21 PATHissa); (b) `TalentMaster_Master_v16.html` nostettuna **paikallisesti 10.7.1:een** + `tmSpike`-apurit (portti, ledger, puhelinpaneeli; päällä vain `localStorage.tm_offline_spike==='1'`). Mainin MIGRAATIOLISTAan ei koskettu.
> **Ympäristö:** Chrome 154 (headless, macOS), Firebase JS SDK compat 10.7.1, emulaattorit (ei tuotantobackendiä, ei Pagesia). Kirjoitukset emulaattoriin; **ei tuotantokirjoituksia, ei SA-tunnusta**; kirjautuminen emulaattorin seurakäyttäjänä (claims `seuraId:kpv, rooli:valmentaja`).
> **Rajaus:** emulaattori **ei pakota App Checkiä** eikä jäljittele iOS/Android-selaimia → niille "Teron testattava" (§10.7).

### 10.1 Kohta 1 — `enablePersistence` + Auth LOCAL rinnakkain (vanha "IndexedDB-konflikti")

| Koe | Tulos |
|---|---|
| Auth `setPersistence(LOCAL)` + `enablePersistence({synchronizeTabs:true})` **heti initin jälkeen** | **OK**: ei virheitä; kirjautuminen **säilyy uudelleenlatauksen yli**; välimuistista luku latauksen jälkeen toimii. IndexedDB: Auth (`firebaseLocalStorageDb`) ja Firestore (`firestore/[DEFAULT]/<projekti>/main`) ovat **erillisiä tietokantoja** — suoraa konfliktia ei ole |
| `enablePersistence` **vasta ensimmäisen Firestore-kutsun jälkeen** | **`failed-precondition`**: *"Firestore has already been started and persistence can no longer be enabled. You can only enable persistence before calling any other method"* → **todennäköinen syy Seuran/Adminin vanhaan "konfliktiin"** (kutsujärjestys, ei Auth-tietokanta). Sovellus jatkaa online-tilassa |
| Kaksi välilehteä `synchronizeTabs:true` | Molemmat **OK**, sama Auth-sessio; toisen välilehden **odottava kirjoitus näkyy toisessa** (`hasPendingWrites:true`) → jono on jaettu |
| Kaksi välilehteä **ilman** sync | 2. välilehti: `failed-precondition` *"Failed to obtain exclusive access to the persistence layer…"* → aina `synchronizeTabs:true` |
| `terminate()` + `clearPersistence()` (uloskirjautuminen) | **OK, ~3 ms**; Firestore-IndexedDB poistuu (Auth-sessio-DB jää; `signOut()` hoitaa). **Odottavat kirjoitukset menetetään** → varoitus ennen tyhjennystä (§3.6) |
| Konsoli | 10.7.1-compat varoittaa: *"enableMultiTabIndexedDbPersistence() will be deprecated … use FirestoreSettings.cache"* — toimii; huomioidaan tulevassa SDK-nostossa |

**Päätelmä:** vanha ongelma on **kutsujärjestys**. Master kutsuu `enablePersistence` **heti `firebase.firestore()`n jälkeen**, `try/catch`, ennen mitään `get/onSnapshot`ia (ml. kirjastot, jotka kysyvät alustuksessa).

### 10.2 Kohta 2 — App Check offline/synkka + `disableNetwork`/`enableNetwork`-portti

**Emulaattorilla mitattu (portin mekaniikka):**
| Koe | Tulos |
|---|---|
| `disableNetwork()` → kirjoitus | Jää jonoon (`pending`), **ei lähde palvelimelle** vaikka yhteys on olemassa; `enableNetwork()` → **lähtee ~0,2 s** (`flush_ms` 205) |
| Portti suljetaan **vasta uudelleenlatauksen jälkeen** | **Vuotaa**: IndexedDB-jono lähti palvelimelle ennen kuin portti ehti kiinni (`g2` palvelimella) |
| Portti suljetaan **heti alustuksessa** (`disableNetwork()` suoraan `enablePersistence`n jälkeen, `gateMs` 0) | **Pitää**: jono ei lähde ennen `enableNetwork()`a (`g3` ei palvelimella kun portti kiinni; palvelimella avauksen jälkeen) |
| `getIdToken(true)` offline | **`auth/network-request-failed`** heti; `getIdToken()` (välimuistitoken) **toimii offline** |
| ID-token yhteyden palatessa | **SDK EI päivitä tokenia itse**: kun claims muuttui palvelimella offline-aikana (rooli → `pelaaja`), jonotettu kirjoitus **meni läpi vanhalla tokenilla** (`resolved`, doc palvelimella). Vasta pakotettu `getIdToken(true)` → uudet claimit → `permission-denied` |

**Päätelmät suunnitelmaan (muutokset §3.1/§3.3):**
1. Portti **kiinni heti alustuksessa** (vain jos offline-lippu päällä), auki vasta kun (a) `online`, (b) **`getIdToken(true)`** onnistui, (c) **`appCheck().getToken(true)`** onnistui. `getIdToken(true)` on tämän takia pakollinen **ennen jonon lähetystä** (tuoreet claimit; muuten poistettu oikeus kelpaa vielä ≤ 1 h) — §7.2:n henki säilyy.
2. §7.2-poikkeus (offline: ei pakotettua tokenia kirjoitushetkellä) on turvallinen: välimuistitoken toimii offline, ja **tuore token pakotetaan portin avauksessa**.
3. **EI testattu emulaattorilla:** palvelimen **ENFORCE**-hylkäys ilman App Check -tokenia ja se, pudottaako Firestore hylätyn kirjoituksen. **→ Teron testattava T1** (§10.7). Suunnitelman oletus (permission-denied/unauthenticated on pysyvä virhe → kirjoitus putoaa) on yhä **olettamus**.

### 10.3 Kohta 3 — hylätyn kirjoituksen näkyvyys

Hylättynä kirjoituksena käytettiin `delete` suojattuun dokumenttiin (luku sallittu, poisto vain SA) sekä `set` toisen seuran polkuun.
| Koe | Tulos |
|---|---|
| Online | Promise hylkää `permission-denied` heti (~45 ms) |
| Offline-jono, **sivu pysyy auki**, yhteys palaa | Sallittu **resolved**, kielletty **rejected (`permission-denied`)**; `waitForPendingWrites()` **resolved** (ei virhettä); palvelimella vain sallittu. Paikallinen kuuntelija näytti poiston (`EI`) ja **palasi** (`on`) hylkäyksessä |
| Offline-jono + **sivun uudelleenlataus**, yhteys palaa | Vanhat promiset **menetetty**. **Ei virhettä, ei konsolilokia** hylkäyksestä; `waitForPendingWrites()` **resolved normaalisti**. Ainoa signaali: **kuuntelija flippaa takaisin** (`EI+cache` → `on`); palvelintila = hylätty pudonnut |

**Päätelmä:** hylkäys uudelleenlatauksen jälkeen on **hiljainen**. Ledger (§3.7) **ei voi luottaa promiseen eikä `waitForPendingWrites`iin**; tarvitaan **tilan verifiointi**: kun jono tyhjenee (`hasPendingWrites=false` kuuntelijassa tai `waitForPendingWrites` resolved), lue kohdedokumentti palvelimelta (`get({source:'server'})`) ja vertaa ledgerin odotukseen; ero → `hylatty (tuntematon syy)` + sisältö ledgerin tekstikopiosta. Tämä oli suunnitelmassa; spike vahvisti sen välttämättömäksi.

### 10.4 Kohta 4 — cache-koko ja offline `get`-viive

Aineisto: 600 pelaajaa (~2,7 kB/doc, 28 kenttää + map), 1200 havaintoa, 300 kalenteritapahtumaa.
| Mittaus | Tulos |
|---|---|
| Online-luku 600 pelaajaa / 300 kalenteria | 342 ms / 136 ms |
| IndexedDB-käyttö luvun jälkeen (900 dokumenttia) | **~2,25 MB** → oletus-LRU 40 MB ≈ 14 000 samankokoista dokumenttia; **riittää** (`cacheSizeBytes` ei tarvitse säätää) |
| Offline `get()` (SDK tietää olevansa offline) | **24–28 ms** (600 dok), `{source:'cache'}` 7–24 ms |
| Offline `onSnapshot` ensimmäinen | 24 ms |
| Yhteys katkeaa **juuri ennen** `get()`iä | 9 ms |
| Uudelleenlataus, **palvelu estetty** (nopea virhe) | `get()` 24 ms, välimuistista |
| **Jumittava yhteys** (latenssi 60 s, kenttäverkon pahin tapaus) | **`get()` oletuksella 10 017 ms** ennen välimuistivastausta; **`{source:'cache'}` 9 ms**; kirjoitus jää `pending`, lähtyi 3 s yhteyden palattua |
| **Ilman persistenceä** (nykytila) offline/uudelleenlatauksen jälkeen | **`get()` palauttaa 0 dokumenttia ilman virhettä** (muistivälimuisti tyhjenee kuuntelijoiden mukana) → UI voi näyttää "ei pelaajia" yhteyden pätkiessä jo **tänään** |

**Päätelmä:** kenttänäkymien luku **cache-first** (`{source:'cache'}` → päivitys taustalla / `onSnapshot`), ei oletus-`get()`ia — muuten jumittava verkko = 10 s viive. Näyttö: "päivitetty hh:mm" -vihje. Nykyisen Masterin hiljainen tyhjä lista (ilman persistenceä) on oma, erillinen havainto (§5).

### 10.5 Kohta 5 — iOS Safari / Android Chrome IndexedDB
**EI testattu** (vaatii oikean laitteen) → **Teron testattava T3** (§10.7). Desktop-Chromessa: kiintiö ~10 GB, ei ongelmaa.

### 10.6 Go / no-go

**Suositus: GO erään 1** seuraavin **pakollisin muutoksin suunnitelmaan** (kaikki mitattu yllä):
1. `enablePersistence({synchronizeTabs:true})` **ensimmäisenä Firestore-kutsuna**; `failed-precondition` → merkki, jatka online.
2. **Portti kiinni heti alustuksessa**, auki vasta `online` + `getIdToken(true)` + `appCheck().getToken(true)`.
3. Ledger + **palvelinverifiointi** hylkäyksille (ei promise/`waitForPendingWrites`).
4. **Cache-first luku** kenttänäkymissä (jumittava verkko).
5. Uloskirjautumisessa `terminate()` + `clearPersistence()` vasta varoituksen jälkeen.

**Ehdollinen:** GO on **ehdollinen T1:lle** (ENFORCE-käytös ilman tokenia). Jos T1 osoittaa, että ENFORCE-hylätty kirjoitus **ei** putoa pysyvästi tai että portti ei estä tokenitonta lähetystä → suunnitelma yksinkertaistuu; jos portti ei toimi tuotannossa → **NO-GO** kunnes ratkaistu. Erä 1 voidaan aloittaa rinnakkain T3:n kanssa (laitetestit eivät estä toteutusta, vain julkaisun).

### 10.7 Teron testattavat

**Valmistelu (T1 + T3):**
1. Deployaa spike-haara **Hosting-preview-kanavalle** (EI tuotantoon, ei Pagesiin): `firebase hosting:channel:deploy spike-offline` haarasta `spike/offline-era0` (Master 10.7.1 + `tmSpike`). Preview-URL: `https://talentmaster-pilot--spike-offline-….web.app/TalentMaster_Master_v16.html`.
2. Rekisteröi **App Check debug-token** (§38): Console → App Check → Apps → Manage debug tokens → lisää keksimäsi UUID (`<UUID>`).
3. Avaa URL **`…/TalentMaster_Master_v16.html?spike=1&dbg=<UUID>`** (liput menevät localStorageen ja siivoutuvat URLista). Kirjaudu **KPV:n seura-valmentajana (ei SA)**. Näytön alalaidassa on **spike-paneeli** (tila, ledger, napit). Kirjoitusnappi kirjoittaa **vain Topiaksen** dokumenttiin (`seurat/kpv/pelaajat/m93GBdOaGCUuenMiCL0I`, kenttä `spike_offline_ts`). Jos Rules hylkää tämän kentän valmentajalta, paneeli näyttää `HYLATTY permission-denied` — sekin on kelvollinen tulos (kerro).
4. Lippu pois: `?spike=0`.

**T1 — App Check ENFORCE ilman tokenia (työpöytä-Chrome, DevTools):**
1. Paneelin pitäisi näyttää: `SDK 10.7.1`, `persistence ok`, kirjautumisen jälkeen `appcheck-token saatu` → `portti AUKI`.
2. DevTools → Network → **Offline**. Paneeli: `offline-tapahtuma` → `portti kiinni`. Paina **Kirjoita (Topias)** → ledgerissä `w1 odottaa`.
3. DevTools → Network → **Request blocking**: lisää `*firebaseappcheck.googleapis.com*` ja `*google.com/recaptcha*`. Poista **Offline**. Paneeli: `online-tapahtuma` → **`appcheck-token-virhe`** → **`portti EI avata (token puuttuu)`**; ledger edelleen `odottaa`. **Network-välilehdellä ei saa näkyä Firestore-kirjoituspyyntöä (`Write`-stream/`commit`).** → **PASS = portti pidätti jonon.**
4. **(Valinnainen, selvittää ENFORCE-käytöksen):** blokkaus yhä päällä, paina **Portti auki** → token ei tule → ei avaudu. Konsolissa: `_db.enableNetwork()` pakottaa lähetyksen **ilman tokenia** → katso paneelista: `kirjoitus HYLATTY permission-denied/unauthenticated`? **Kirjaa tarkka virhekoodi** ja se, **yrittääkö SDK uudelleen** (uusi pyyntö) vai pudottaako se kirjoituksen. (Topiaksen dokumentti, harmiton.)
5. Poista Request blocking, paina **Portti auki** → `appcheck-token saatu`, `idtoken-refresh ok`, `portti AUKI` → ledger **`synkattu`**; tarkista Firestoresta Topiaksen dokumentin `spike_offline_ts`.
6. **App Check -mittari** (Console → App Check → Metrics) kokeen ajalta: näkyykö `MISSING`-pyyntöjä (kohta 4)?

**T3 — iOS Safari ja Android Chrome (puhelin, sama preview-URL kuin yllä):**
- **A. Peruskäytös (kumpikin):** avaa URL (`?spike=1&dbg=<UUID>`), kirjaudu. Paneelin pitää näyttää `persistence ok` (ei `persistence-virhe`). Paina **Tallennustila**: kirjaa `käyttö/kiintiö` ja `persisted=`. Paina **Pyydä persist()**: kirjaa tulos (iOS voi palauttaa `false`/`null`).
- **B. Lentotila + jono:** kun portti on AUKI, laita puhelin **lentotilaan**. Paneeli: `offline-tapahtuma` → portti KIINNI. Paina **Kirjoita (Topias)** 2 kertaa → ledger `w1`,`w2 odottaa`. Paina **Odottavat (FS)** → odotetaan `timeout 3 s (odottavia)`.
- **C. Sovelluksen sulkeminen jonossa:** lentotilassa **sulje välilehti/sovellus kokonaan** (iOS: pyyhkäise Safari pois sovellusvalitsimesta; Android: sulje välilehti). **Lentotila pois**, avaa URL uudelleen (`?spike=1` ei enää tarvita, liput ovat tallessa; sivu avautuu verkossa). Paneeli: `portti KIINNI (alustus)` → kirjautumisen jälkeen portti AUKI → odottavat lähtevät. **Tarkista Firestoresta**, että `spike_offline_ts` on **toisen kirjoituksen aikaleima** (ts. jono selvisi sulkemisesta). Ledger on muistissa (tyhjä uudelleenavauksen jälkeen) — **tämä on odotettua**: lähde on Firestore, ei paneeli.
- **D. iOS-erityinen (tallennuksen säilyvyys):** tee kohta B (jono lentotilassa) ja **jätä puhelin sulkemattomana/sovellus suljettuna ~24 h** (pidempi testi: 7 pv — Safari voi poistaa asentamattoman sivun tallennuksen). Avaa verkossa; selvisikö jono (Firestore) ja onko kirjautuminen voimassa? **Kirjaa kulunut aika ja tulos.**
- **E. Kenttäverkko (valinnainen):** huono 3G/heikko Wi-Fi: paina **Kirjoita**, katso **kuinka kauan** ledger pysyy `odottaa` ja synkkaako se itsestään.

**Kerro minulle:** T1 vaihe 3 ja 4 tulokset (erityisesti virhekoodi ja uudelleenyritys), T3 A–D tulokset per laite (OS-versio + selain). Näiden perusteella päivitän §10.6:n GO-ehdon ja aloitan erän 1.
