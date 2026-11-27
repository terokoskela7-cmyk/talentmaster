# Vaihe 0 — Seuran `lista_seura`: suunnitelma (26.11.2026, vain suunnitelma — EI koodia)

Tausta: Seura (`TalentMaster_Seura.html`) lukee avauksessa ~1 048 dokumenttia (mittaus 12.11., 500 pelaajan seura; `docs/VAIHE0_APPCHECK_JA_LISTANAKYMAT.md` B.1). Malli: Masterin `lista_joukkue` (#1283–#1288, Rules v3.83, lippu `lista_yhteenveto` + vanha polku varalla). **Toteutus vasta Teron päätöksen jälkeen** (päätettävät kohdat: luku 8).

Lähteet: `TalentMaster_Seura.html`, `seura/seura_pelaajahallinta.js`, `lib/tm_pelaajat_esilataus.js`, `lib/tm_sisainen.js`, `lib/tm_lista_yhteenveto.js`, `lib/tm_lista_lataus.js`, `functions/lista_yhteenveto.js`, `tm_admin/firestore.rules` (v3.84). Luvut: *mitattu* (12.11.) tai *koodista laskettu* (merkitty). Uutta mittausta ei ajettu.

## 1. Mistä 1 048 tulee ja mitä on jo tehty

Mittaus 12.11. (500 pelaajan seura): `pelaajat` 1 000 (= 2 × 500: KPI-yhteenveto + pelaajalista) + ~48 muuta (`kayttajat`, `kutsut`, `joukkueet`, seuradokumentti). Sen jälkeen **B.6 #1** (`lib/tm_pelaajat_esilataus.js`) jakaa yhden `pelaajat`-luvun KPI:n, listan ja Kehitystilanteen kesken (TTL 10–20 s) → avaus ~550, mutta **koko seuran pelaajaluku jää** (500 dokumenttia vain 5 laskurin takia) ja alla olevat lisäluvut ovat edelleen jäljellä:

| Näkymä | Nykyiset luvut (500 pelaajan seura) | Huomio |
|---|---|---|
| **Yhteenveto** (avaus) | `pelaajat` 500 · `kayttajat` ~henkilöstö · `kutsut` ~n · joukkueet (`onSnapshot`) | pelaajadokumentteja luetaan vain laskureita varten (`lataaYhteenvetoKPIt`: kaikki / annettu / pilotti / odottaa) |
| **Pelaajat** (lista) | `pelaajat` 500 (jaettu) **+ `sisainen/tiedot` 500** (`collectionGroup`, `_seuraYhdista`) **+ `sisainen/terveys` 500** (VP/UTJ: `tmTerveysLukuOpts` → `'seura'`) | *koodista laskettu*: ~1 500 lukua / avaus; **terveystieto (GDPR Art. 9) ladataan koko seuralle pelkän "käytettävyys"-merkin vuoksi** |
| **Talentit** | `pelaajat` (jaettu) + `sisainen` | kentät: nimi, joukkue(et), syntymävuosi, `talenttiTaso`, `talenttiAlku` |
| **Kehitystilanne** | `pelaajat` (jaettu) + `sisainen` + **per pelaaja 3–5 alikokoelmalukua** (`biologinen_ika`, `arviointikerrat`, `idp_kausi`, + lapsuus: `testitulokset`, `kirjaukset`) + 8 seurakokoelmaa | *koodista laskettu*: ≫ 2 500 lukua; **oma, isompi ongelmansa — ei tämän suunnitelman piirissä** (ks. 9) |
| Joukkueet | ei pelaajalukuja | `tila.joukkueet` (jo seuran joukkuelukija) |

**Päälöydös:** Seuran *listanäkymät* (Yhteenveto + Pelaajat + Talentit) tarvitsevat ~12 kenttää/pelaaja; täysi pelaajadokumentti (mediaani 3,3 kt, p95 4,5 kt, max 48,5 kt) tarvitaan vain toimintoihin (ks. 2).

## 2. Mitä kenttiä Seura oikeasti käyttää (koodista: `pelaajaRivi`, `renderPelaajat`, `lataaYhteenvetoKPIt`, `renderTalentit`)

**Listalle (rivi):**

| Kenttä (rivillä) | Lähde pelaajadokumentissa | Käyttö |
|---|---|---|
| `id` | doc-ID | rivin avain, valinta, "Tiedot"-nappi |
| `e`, `s` | `etunimi`, `sukunimi` (`nimi` varana) | nimi, haku, järjestys |
| `jk[]` (+ `jn` näyttönimi) | `joukkueet[]` (+ `joukkue`) | joukkue-sarake, joukkuesuodatin; jäsenyys `tmPelaajanJoukkueet` (§7.18) |
| `sv` | `syntymaVuosi` / `syntymaaika` | ikä-sarake, "syntymävuosi puuttuu" -tarkistus (`tmSeuraPuuttuuVuosi`) |
| `pid` | `palloID`/`palloId`/`tunniste` | PalloID-sarake, "⚠️ Puuttuu" |
| `st` | **johdettu**: suostumuksen tila-koodi — `annettu` / `peruttu` / `pilotti` / `odottaa` / `ei_kutsua` (`_suostumusAnnettu`, `_suostumusPeruttu`, `suostumusTila`, `tuotu`) | tila-badge, suodattimet (Kaikki / Pilotti / Kutsu lähetetty / Rekisteröity), KPI |
| `hk` | **boolean** `!!huoltajaEmail` | "Lähetä kutsu" -nappi näkyy vain jos huoltaja tiedossa (osoitetta EI rivillä) |
| `pin` | **boolean** onko PIN asetettu | "PIN puuttuu" -tarkistus (PIN-arvoa EI rivillä) |
| `tt` | `talenttiOhjelma` (+ `talenttiTaso`, `talenttiAlku`) | ⭐-merkki, Talentit-näkymä |
| `lh` | `lahde` | tuonti/tarkistusnäkymä |
| (`ky`) | käytettävyys-merkki | **AVOIN — ks. 8 Q3 (terveystieto)** |

**Vain täydestä dokumentista (haetaan kun käyttäjä avaa/toimii):** `naytaPelaajaTiedot` (profiili + kutsuhistoria), PIN-kortit / PIN-listan tulostus / QR (`seura_pelaajahallinta.js`: `p.pin` selväkielisenä jakokopiona), huoltajan sähköposti (muokkaus, uudelleenlähetys), `kaytettavyys`-modaali, "Siirrä joukkueeseen" -kirjoitukset, `sisainen/*`, `terveys/*`. → **Ei listalle.** Näille jää nykyinen yksittäisluku (`pelaajat/{pid}` + tarvittaessa `kutsut where pelaajaId`); massatoiminnot, jotka tarvitsevat PIN-kenttää (korttien tulostus), hakevat sen vasta tulostushetkellä seuran koko listalta kerran ("Tulosta PIN-kortit" → nykyinen koko-luku; harvinainen toiminto, ei avaus). *Vaihtoehto jatkoon: PIN-lista palvelimelta callablena — erillinen turvapäätös.*

**KPI-laskurit** (Yhteenveto): kaikki / rekisteröity (annettu) / pilotti / odottaa / suostumus-% → kerrotaan jo rivien `st`-koodeista, mutta avaukseen riittää pelkkä **laskuridokumentti** (ks. 3).

## 3. Dokumenttirakenne

```
seurat/{sid}/lista_seura/_meta      // yksi pieni dokumentti: { versio, laskettu, n, sivuja, laskurit:{ kaikki, annettu, pilotti, odottaa, peruttu, ilman_vuotta, ilman_palloid, ilman_pin } }
seurat/{sid}/lista_seura/s0001      // sivu: { versio, laskettu, sivu, n, rivit:[ {id,e,s,jk,jn,sv,pid,st,hk,pin,tt,lh} … ≤ 250 ] }
seurat/{sid}/lista_seura/s0002 …    // järjestys: sukunimi, etunimi, id (deterministinen → sivu muuttuu vain kun sen rivit muuttuvat)
```

- **Yksi doc vs. sivutus:** 1 MiB:n raja on kaukana (rivi ~150–250 B → 250 riviä ≈ 40–60 kt; 1 000 pelaajaa ≈ 200 kt; 5 000 pelaajaa ≈ 1 MB). **Päätös: ≤ 250 riviä / sivu** (kuten B.4:ssä), jotta yksittäinen dokumentti ei koskaan lähesty rajaa myöskään 1 000+ ja 4 000+ pelaajan seurassa ja koska mikä tahansa kirjoitus uudelleenkirjoittaa vain muuttuneen sivun. Vartija: sivun tavukoko < 400 kt, rivi < 1 200 B (kuten `RIVI_ENINT_TAVUA` Masterilla).
- **`_meta` erikseen:** Yhteenveto lukee **1 dokumentin** (laskurit) ilman rivejä → avaus: `_meta` 1 + `kayttajat` ~henkilöstö + `kutsut` + `joukkueet` ≈ **~70–100 lukua (−93…95 %)** vs. ~1 048 (500 pelaajan seura; *arvio*, `kutsut`-määrä riippuu seurasta). Pelaajat-näkymä: ⌈n/250⌉ sivua (500 pelaajaa = 2 lukua + `_meta`) vs. ~1 500 nyt.
- **Jäsenyys:** `lista_seura` on **uniikit pelaajat** (seuran kokonaisluvut uniikeista, §7.18); `jk[]` kuljettaa usean joukkueen jäsenyyden. (Masterin `lista_joukkue` on joukkueen rivit; `lista_seura` ei korvaa sitä.)
- **Uudelleenkäyttö:** rivin muodostus samasta puhtaasta libistä (`lib/tm_lista_yhteenveto.js`, jaettu `functions/`-kopio) — uusi `tmListaSeuraDokumentit(pelaajat, joukkueet, nytMs)`; **ei** rinnakkaista logiikkaa. Suostumus-koodi `st` johdetaan **samasta funktiosta** kuin Seuran `_suostumusAnnettu`/`_suostumusPeruttu` (siirretään libiin, ei kopioida; vartija: Seuran HTML ei saa laskea tilaa itse). Poissuljetut: `poistettu`/`arkistoitu`/`aktiivinen===false` (kuten `lista_yhteenveto.js _poissa`).

## 4. Päivitystrigger

Sama kolmen tavan malli kuin `lista_joukkue` (valmis `functions/lista_yhteenveto.js`):
(a) **yöajo** (`laskeKaikki`) · (b) **callable "Päivitä nyt"** (30 s jäähy / seura; johto) · (c) **debouncattu**: pelaajadokumentin `onWrite` kirjoittaa pelaajakohtaisen merkin `lista_likainen/{pid}` **vain jos listariviin vaikuttava kenttä muuttui**; minuutin siivooja rakentaa uudelleen kun merkit ovat hiljenneet (30 s) tai vanhin on odottanut 5 min → 500 kirjoituksen massatuonti = yksi uudelleenrakennus.
- **Lisäys:** `lista_likainen`-merkki kattaa jo pelaajan kentät → `laskeSeura` rakentaa jatkossa **sekä** `lista_joukkue` **että** `lista_seura` samalla pelaajaluvulla (yksi `pelaajat.get()` palvelimella, ei kaksi). Riviin vaikuttavien kenttien lista laajenee: `suostumusTila`/`suostumus*`/`tuotu`, `huoltajaEmail` (vain olemassaolo), `pin`-olemassaolo, `palloID`, `lahde`, `talentti*`.
- **PIN-/suostumus-/huoltajamuutokset tapahtuvat palvelimella** (`vahvistaSuostumus`, `asetaPelaajanPin`, §12) → onWrite-trigger näkee ne; listarivi päivittyy ≤ ~1 min. Kirjoittava käyttäjä päivittää oman muistinsa heti (kuten nykyään).
- **Tuoreus:** eventuaalisesti johdonmukainen (sekunteja–minuutteja); näkymässä "päivitetty hh:mm" + "Päivitä nyt". **Erityisriski:** kun sihteeri lähettää kutsun/tuo Excelin, hän odottaa näkevänsä tilan heti → client päivittää oman rivinsä muistissa ja pakottaa tuonnin jälkeen "Päivitä nyt".

## 5. Rules (Teron kaista)

- Uusi `match /lista_seura/{doc}` (§7.15: ei periydy): **luku: SA tai oman seuran johto** (`onOmaSeura(seuraId) && onJohtoRooli()` = vp / urheilutoimenjohtaja / seurasihteeri — sama joukko kuin `SALLITUT_ROOLIT` Seurassa; ei valmentajalle/talenttivalmentajalle, koska heillä on `lista_joukkue`); **kirjoitus: `false`** (Admin SDK ohittaa) → "Rules ennallaan" ei päde: **uusi blokki = uusi Rules-versio** (nykyisessä haarassa uusin v3.84; seuraava vapaa versio varataan PM:ltä ennen PR:ää) + changelog + Rules-testit (johto lukee, valmentaja ei, toinen seura ei, client ei kirjoita, pelaaja/huoltaja ei).
- `lista_likainen/{pid}` ennallaan (`read, write: false`).
- Ei uusia indeksejä (luku dokumenttitunnisteella / koko kokoelma).

## 6. Lippu ja varapolku

- Uusi lippu `liput.lista_seura` (`lib/tm_liput.js`, kuten `lista_yhteenveto`; oletus **pois**), jotta käyttöönotto on seurakohtainen.
- **Lukija** (`tmListaSeuraLataa`, malli `lib/tm_lista_lataus.js`): **kaikki tai ei mitään** — puuttuva `_meta`, vanhaversioinen sivu, sivuluku ≠ `_meta.sivuja` tai `laskettu` liian vanha (> 24 h) → `ok:false` → **vanha polku** (`pelaajat.get()` + `sisainen` kuten nyt). Ei osittaista listaa, ei hiljaista aukkoa.
- Vanha polku säilyy, kunnes tarkistusajo (7) on puhdas kahdella seuralla ≥ 1 viikon; poisto omana PR:nään.
- Rivistä avattava pelaajakortti hydratoi täyden dokumentin yksittäisluvulla (kuten Masterin `tmKtAvaaPelaaja`).

## 7. Tarkistusajo (pariteetti ennen lippua)

1. **Offline-pariteettitesti** (`tests/lista_seura_pariteetti.test.js`): sama pelaajajoukko → vanhan polun tulokset (suodattimet, KPI-laskurit, puuttuva vuosi/PalloID, joukkuejäsenyys) = `lista_seura`-rivien tulokset. Fixture-tilat: kaikki `suostumusTila`-arvot, peruttu, `tuotu`, usea joukkue, syntymaaika Timestamp vs. `syntymaVuosi`, ei PalloID:tä.
2. **Kuiva-ajo-skripti** (`scripts/lista_seura_backfill.js`, malli `lista_yhteenveto_backfill.js`; **Tero ajaa**, ADC): oletus kuiva — seuroittain pelaajia/sivuja/tavuja, ei nimiä. `--kirjoita` kirjoittaa.
3. **Live-vertailu seurakäyttäjällä** (ei SA:lla, §0): johtorooli avaa Seuran lippu päällä/pois; KPI-laskurit ja suodatinlukumäärät identtiset; konsolissa `[lista_seura] ok` ja luettujen dokumenttien määrä (odotus ~70–100 avauksessa).
4. **Vartijat:** rivi ei sisällä kiellettyjä avaimia (`pin`-arvo, `huoltajaEmail`-arvo, `terveys`, `sisainen`, `loukkaantuminen`, `kaytettavyys`-sisältö) → `tmListaRikkomukset` laajennetaan; Seuran HTML ei lue `huoltajaEmail`-arvoa listariviltä.

## 8. Tietosuoja

- **Ei terveystietoa listalle** (`loukkaantuminen_*`, `paluu_arvio`, `kaytettavyys`-sisältö; Art. 9): suositus — jos "käytettävyys"-merkki halutaan listalle, vain **boolean "merkintä olemassa"** ja vain jos Teron päätös Q3 on kyllä; muuten merkki haetaan vasta pelaajaa avattaessa. **Sivuvaikutus:** nykyisen listan koko-seuran `sisainen/terveys`-luku (500 dokumenttia terveystietoa VP/UTJ:n selaimeen) poistuu jos Q3 = ei (tietosuojaparannus).
- **Ei PIN:iä** (vain `pin`-boolean), **ei huoltajan sähköpostia** (vain `hk`-boolean), ei `sisainen/*`, ei reflektioita, ei arvioita. Sama KIELLETYT_AVAIMET-vartija kuin `lista_joukkue`.
- **§7.22:** lapsi/huoltaja eivät lue (Rules 5). Lista on vain johdon työkalu.
- **PIN-kortit:** edelleen vain tulostushetken koko-luku (selväkielinen jakokopio pelaajadokumentissa); rivi ei lisää PIN:in näkyvyyttä.
- **Suostumus-integriteetti (§39):** `st` johdetaan palvelimella pelaajadokumentin `suostumusTila`:sta; ei koskaan `annettu → odottaa`; lista ei ole totuus, vain peili.

## 9. Rajaukset ja jatko

- **Kehitystilanne** (isoin yksittäinen lukija: per pelaaja 3–5 alikokoelmalukua) **ei kuulu tähän**; oma Vaihe 0 -selvitys (`lista_kehitys`/olemassa olevan `kooste` hyödyntäminen) sen jälkeen kun `lista_seura` on tuotannossa. Kehitystilanne käyttää jatkossakin `tmLuePelaajatSnap`-polkua (jaettu esilataus säilyy).
- **VP_v25** lukee `pelaajat` 500 (976 lukua, 12.11.): `lista_seura` palvelisi myös VP:n seurakokonaiskuvaa — **ei nyt**, erillinen päätös (VP:llä on jo kooste/lista_joukkue-polku).
- 1 000+ pelaajan seura: sivutus (250/sivu) kattaa; laskuri `_meta` pysyy yhtenä dokumenttina. 5 000+ pelaajalla `lista_likainen`-siivous ajetaan seurakohtaisesti kuten nyt.

## 10. Avoimet päätökset Terolle (toteutus odottaa)

1. **Q1 — Luku:** vain johto (vp/UTJ/seurasihteeri), kuten Seurassa nyt? (Suositus: kyllä.)
2. **Q2 — Sivukoko:** 250 riviä/sivu (suositus) vai yksi dokumentti, kunnes seura > 1 000 pelaajaa? (Yksi doc yksinkertaisempi, mutta 5 000+ pelaajan seurassa raja uhkaa.)
3. **Q3 — Käytettävyys/loukkaantuminen listalla:** (a) ei listalle, haetaan pelaajakortista (suositus, poistaa koko-seuran terveysluvun), (b) vain boolean "merkintä on", (c) nykyinen koko luku säilyy (ei muutosta, 500 lisälukua jää).
4. **Q4 — PIN-kortit/PIN-lista:** nykyinen koko-luku tulostushetkellä (suositus, ei muutosta) vai callable palvelimelta (turvallisempi, oma työ)?
5. **Q5 — Kehitystilanne:** oma Vaihe 0 heti `lista_seura`:n jälkeen? (Suurin lukuerä Seurassa.)
6. **Q6 — Rules-versio:** varataanko seuraava vapaa versio nyt (tässä haarassa v3.84 on uusin)?
7. **Q7 — sv-tekstit:** uusia käyttäjälle näkyviä tekstejä tulee vain "päivitetty hh:mm" / "Päivitä nyt" / lataus epäonnistui -viesteistä (jälkimmäinen on jo `tmLaiska`-avain `Tietojen lataus ei onnistunut — …`) → sv-avaimet tyhjinä PM:lle (CLAUDE.md §0), ei Coden käännöksiä.
8. **Q8 — Tuoreuden vaatimus:** riittääkö ≤ ~1 min viive muiden muutoksille (suositus) — Excel-tuonnin jälkeen pakotettu "Päivitä nyt".

## 11. Toteutusjärjestys (kun päätös tulee; jokainen oma PR origin/mainista, ei pinottuna)

1. Lib: `tmListaSeuraDokumentit` + `st`-johto siirto libiin + vartijat + pariteettitesti (kaista: auto, `lib/` + `tests/`, kunhan ei näkyvää muutosta).
2. Palvelin: `functions/lista_yhteenveto.js` laajennus + Rules v3.xx + Rules-testit + backfill-skripti (**Teron kaista**: `functions/`, Rules, `scripts/`).
3. Client: `tmListaSeuraLataa` + Seuran Yhteenveto/Pelaajat/Talentit lippu + varapolku (**Teron kaista**: HTML).
4. Tero ajaa backfillin (kuiva → kirjoita), vertailu 7.3, lippu päälle seurakohtaisesti; vanhan polun poisto vasta puhtaan viikon jälkeen.

## 12. Päätetty 27.11.2026 (Tero) ja PR 1:n toteutus

**Päätökset** (korvaavat §10:n avoimet kohdat):

| | Päätös |
|---|---|
| Q1 Luku | Vain johto (vp, urheilutoimenjohtaja, seurasihteeri) + SA. Valmentajat ja talenttivalmentajat eivät lue. |
| Q2 Sivutus | `_meta` (laskurit, päivitetty) + sivut, ≤ 250 riviä/sivu. |
| Q3 Terveystieto | EI listalle: ei `loukkaantuminen_*`, `paluu_arvio`, `kaytettavyys` eikä boolean-merkkiä. Käytettävyys näytetään vasta pelaajakortissa. Seuran nykyinen koko seuran `sisainen/terveys`-luku POISTETAAN listanäkymästä kokonaan, myös varapolulta (PR 2). |
| Q4 PIN-lista/kortit | Ennallaan (luku tulostushetkellä). Palvelinversio backlogiin. |
| Q5 Kehitystilanne | Oma Vaihe 0 heti tämän jälkeen. |
| Q6 Rules | v3.85, oma `match`-blokki, Rules-testi. |
| Q7 sv | Uudet tekstit ("päivitetty hh:mm", "Päivitä nyt") → sv-avaimet tyhjinä erätiedostoon, PM kirjoittaa. PR 1:ssä ei käyttäjälle näkyviä tekstejä. |
| Q8 Tuoreus | ≤ ~1 min viive. Excel-tuonnin jälkeen "Päivitä nyt" pakottaa uudelleenkoosteen. |

**PR 1 (palvelin + Rules, ei käyttäjälle näkyvää muutosta) — toteutus:**
- Lib `lib/tm_lista_yhteenveto.js` (+ jaettu `functions/`-kopio): `tmListaSeuraRivi`, `tmListaSeuraSuostumus`, `tmListaSeuraLaskurit`, `tmListaSeuraDokumentit`, `tmListaSeuraKelpaa`. `KIELLETYT_AVAIMET` laajeni: `kaytettavyys`, `paluu_arvio`, `ky`.
- Rivin avaimet: `id, e, s, nm, jk, jn, sv, nv, pid, st, hk, pa, to, tt, ta, lh`. **Poikkeama §2:n taulukosta:** PIN-boolean on `pa` eikä `pin`, koska `pin` on vartijan kielletty avain (arvon vuotoa ei voi erottaa avaimen nimestä). `nv` = syntymävuosi puuttuu (`tmSeuraPuuttuuVuosi`). `nm` = `p.nimi` vain jos etu- ja sukunimi puuttuvat; sähköpostia ei koskaan käytetä nimen varana (Seuran nykyinen `henkiloNimi` tekee niin, joten client näyttää nimettömälle "Keskeneräinen kutsu").
- `st` = Seuran `pelaajaRivi`-badge-sääntö: `peruttu` voittaa, sitten `annettu` (kanoninen `lib/tm_suostumus.js`), `pilotti`, `odottaa` (odottaa/luotu/tuotu), `ei_kutsua`.
- Palvelin `functions/lista_yhteenveto.js`: `laskeSeura` kirjoittaa `lista_seura` samasta pelaajaluvusta kuin `lista_joukkue` (yksi `pelaajat.get()`). Sivut kirjoitetaan ensin ja `_meta` viimeisenä; kaikilla `kierros`-tunniste, jonka lukija vaatii täsmäämään (kaikki tai ei mitään). `lista_seura`-virhe heitetään vasta `lista_joukkue`-kirjoituksen jälkeen, joten tuotannossa oleva `lista_joukkue` ei kaadu uuteen.
- Debounce: `merkitseListaLikaiseksi` vertaa nyt myös seurarivin kenttiä (suostumus, huoltaja-/PIN-olemassaolo, PalloID, lähde, talentti). Minuuttiajastus ja yöajo rakentavat molemmat listat.
- Callable `paivitaListaSeura({ seuraId })` (europe-west1, App Check, `tarkistaOikeus`): vain johto + SA. 30 s jäähy, MUTTA odottava `lista_likainen`-merkki ohittaa jäähyn ja merkit siivotaan rakennuksen jälkeen (Q8).
- Rules v3.85: `match /lista_seura/{doc}` luku `onSuperAdmin() || (onOmaSeura && onJohtoRooli())`, kirjoitus `false`.
- `scripts/lista_seura_backfill.js`: kuiva-ajo (oletus), `--kirjoita`, `--tarkista` (pariteettivertailu koosteen ja pelaajadokumenttien välillä; vain lukumäärät seuroittain).
- Poissuljetut: `poistettu`/`arkistoitu`/`aktiivinen === false`. Seuran nykyinen lista näyttää myös ne, joten tarkistusajo ja PR 2:n vertailu käyttävät samaa rajausta.
- Tunnettu ero vanhaan: Seuran KPI-banneri ei laske `tuotu`-pelaajaa "kutsu lähetetty" -luokkaan, mutta listan badge ja suodatin laskevat. Kooste noudattaa listan sääntöä.

## 13. PR 2 (Seura-näkymä lipun takana) — toteutus 27.11.2026

**Lippu.** `seurat/{sid}/liput/julkiset.lista_seura` (rekisteröity `lib/tm_liput.js` → SA:n Liput-paneeli ja `asetaSeuranLippu` tuntevat sen; oletus pois). Päällä → Pelaajat-lista ja Yhteenvedon KPI-luvut luetaan koosteesta; pois / kooste puuttuu / vanhaversioinen / eri kierros / luku-virhe → vanha polku (kaikki tai ei mitään, `tmListaSeuraLataa`). Lippu luetaan kerran seuraa kohden (SA:n seurapoimija: välimuisti seuroittain).

**Lukumäärä.** 500 pelaajaa = 3 lukua (2 sivua + `_meta`), 1 048 = 6; KPI = 1 luku (`_meta`). Ei pelaajadokumentteja, ei `collectionGroup`-lukua (testi oikeassa Chromessa deploy-muodossa).

**Q3 toteutettuna.** Koko seuran `sisainen`/`terveys`-luku on pois Pelaajat-listalta MOLEMMISTA poluista (lippu päällä ja varapolku). Käytettävyys-sarake on poistettu listalta; käytettävyys näkyy ja muokataan vain pelaajakortilla (SA, VP, UTJ) ja luetaan vasta kortin avautuessa yhden pelaajan dokumenteista. Sivuhavainto: `_seuraYhdista` luki koko seuran `collectionGroup('sisainen')`-datan myös yhden pelaajan muokkausikkunaa ja käytettävyysmodaalia varten → yhden pelaajan kutsut käyttävät nyt `tmSisainenLataaJaYhdistaYksi`-polkua. Koko seuran luku jää vain Kehitystilanteelle (oma Vaihe 0, Q5).

**Rivi ei kanna PIN:iä eikä sähköpostia.** Toiminnot, jotka tarvitsevat arvon, lukevat pelaajadokumentin tekohetkellä: tulosta kortit, lähetä tunnukset, luo puuttuvat PIN:it (`_taydennaKohde`, Q4 — kuten ennen, vain nyt vasta toiminnon alussa), rivin "Linkki"-nappi (`lahetaPelaajaLinkkiRivilta`), suostumuksen uusintakutsun päivämäärä ja huoltajan sähköpostin vaihdon vertailu (muokkausikkunan lataama dokumentti).

**Poissuljetut pelaajat → "Arkistoidut".** Kooste ei sisällä `poistettu`/`arkistoitu`/`aktiivinen === false` -pelaajia, joten lippu päällä -tilassa listalle tulee "Arkistoidut"-painike. Se hakee ne PYYDETTÄESSÄ kolmella yksikenttäkyselyllä (`where('poistettu','==',true)`, `where('arkistoitu','==',true)`, `where('aktiivinen','==',false)`, kukin `limit(100)`; ei koko seuraa, ei uutta indeksiä: yksikenttäindeksit ovat automaattisia). Rivit yhdistetään id:llä ja syyt näytetään. "Palauta" nollaa vain ne liput, jotka on asetettu (`poistettu→false`, `arkistoitu→false`, `aktiivinen→true`) → pelaajadokumentin muutos merkitsee listan likaiseksi → kooste päivittyy ~1 min; sen jälkeen näytetään "Päivitä nyt" -vihje. Rajaus: yli 100 samaa syytä → ilmoitus "enintään 100 / syy". Huomio: repossa EI ole nykyisin client-koodia, joka asettaisi näitä lippuja (arkistointi tehdään muualla / skriptillä), eikä aiempaa palautuspolkua ollut; tämä on ensimmäinen.

**Päivitetty + Päivitä nyt.** Tilarivi ("päivitetty hh:mm", Europe/Helsinki) + "Päivitä nyt" → `paivitaListaSeura`. Excel-tuonnin (ja Palauta-toiminnon) jälkeen vihje "Pelaajalista päivittyy noin minuutissa" + painike; tuonnin jälkeen painike yrittää enintään 3 × / 4 s, koska tuonnin viimeiset kirjoitukset voivat vielä olla matkalla kun callable ensimmäisen kerran ajetaan (callable palauttaa `tuore: true`, jos merkkejä ei vielä ole).

**Ei muutu tässä PR:ssä (kirjattu jatkoon).** (1) Excel-tuonnin esikatselu lukee edelleen koko pelaajakokoelman duplikaattitarkistukseen — tuonti, ei avaus. (2) Talentit-näkymä käyttää jo rajattua kyselyä (`talenttiOhjelma == true`), ei koosteen riviä. (3) KPI:n `kutsut`-kokoelman luku (`kutsutSnap.size`) on yhä koko kokoelma — ei pelaajalista; erillinen laskuri/aggregaatti jatkoon, jos mittaus näyttää sen merkittäväksi. (4) Seuran Pelaajat-lista ei näytä enää nimenä sähköpostia nimettömälle pelaajalle ("Keskeneräinen kutsu") — koskee vain lippu päällä -tilaa.

**Testit.** `tests/lista_seura_nakyma.test.js` (lukija, lukumäärä, sovitin, HTML-vartijat), `tests/lista_seura_nakyma_selain.test.js` (oikea Chrome, deploy-muoto, synteettinen 500 pelaajan seura, roolit SA/VP/UTJ/seurasihteeri, SA-seurapoimija, varapolku, Arkistoidut). Päivitetyt: `seura_kaytettavyys_muokkaus` (käytettävyys listalta kortille), `seura_pelaajaluku_jako` (rivikatto 7100 → 7300, KPI-ympäristön lippustubi), `d1_liput_hallinta` (uusi lippu). sv-avaimet tyhjinä: `docs/i18n/sv_kaannoserae_107_gemini.json` (Q7).

## 14. PR 3 (rollout + A/B-mittaus, kaista: auto/scripts) — 27.11.2026

**Tila ennen PR 3:a.** Staging-backfill OK (`kuorma_seura_01/02`: 500 riviä, tarkistus 0 eroa). Tuotannon kuiva-ajo OK (7 aktiivista seuraa, 0 virhettä; SJK / GrIFK / HJK / FCL / VIFK / Ylöjärvi tarkoituksella pois käytöstä).

**A/B-mittaus samalla URL:lla, eri seura.** `scripts/kuorma/ab_vuorotellen.js --seura-a=<n> --seura-b=<n>` (molemmat pakollisia yhdessä): sama `--a`/`--b`-URL kelpaa, kun seurat eroavat; jokainen puoli ajaa `mittaa_sivut.js`:n omalla `--seura`-arvollaan (`<n>` = `kuorma_seura_<nn>`). Järjestys vaihtuu kuten ennen (AB / BA …). Ilman valintoja käytös on ennallaan (yhteinen `--seura`). Yhteenveto kirjaa `meta.seura_a/seura_b`, ja uusi mittari **Firestore-luvut (kpl)** (`yht`, kylmä ja lämmin) näkyy raportissa ja `yhteenveto.json`issa — lipun vaikutus näkyy suoraan lukumäärissä (odotus: A ≈ 1 000+, B ≈ 6).

Mittaus (Tero ajaa; A = `kuorma_seura_02` lippu pois, B = `kuorma_seura_01` lippu päällä; seurojen datan on oltava samanlainen — 500 riviä kummassakin):
```
! node scripts/kuorma/lippu_aseta.js --projekti=talentmaster-staging --seura=1 --lippu=lista_seura --arvo=paalle --aja
! node scripts/kuorma/lippu_aseta.js --projekti=talentmaster-staging --seura=2 --lippu=lista_seura --arvo=pois    # varmistus (oletus on pois)
STAGING_APPCHECK_DEBUG_TOKEN=<token> ! node scripts/kuorma/ab_vuorotellen.js \
  --a=<staging-URL> --b=<sama staging-URL> --seura-a=2 --seura-b=1 --sivut=seura --profiilit=tyopoyta --kierrokset=3 --toistot=3
```
`--sivut=seura` käyttää `TalentMaster_Seura.html`-sivua johtotunnuksella (`vp.sNN@kuorma.test`, `mittaa_sivut.js` SIVUT.seura); molemmilla seuroilla on oltava VP-tunnus tunnustiedostossa. Tulkinta: Firestore-luvut A ≫ B kaikilla kierroksilla ja FCP/TTI B ≤ A; `[lista_seura] ok` -konsoliviesti `--erittely`-ajossa vahvistaa, että B lukee koosteesta.

**Lipun asetus.**
- **Staging:** `scripts/kuorma/lippu_aseta.js` — kuiva-ajo oletuksena, `--aja` kirjoittaa. Sama logiikka kuin Admin → Liput (`functions/liput_hallinta.js`: transaktio, `liput/julkiset` + audit-rivi `lippu_muutettu`, tekijä `skripti:kuorma_lippu_aseta`). Projektilukko (`lukko.js`) hyväksyy vain stagingin; vain synteettiset kuorma-seurat.
- **Tuotanto:** Admin-paneelin **Liput**-näkymä tukee seurakohtaista arvoa (seura × lippu, vahvistus, muutosloki) → lippu `lista_seura` asetetaan siellä seura kerrallaan. Skriptiä ei käytetä tuotannossa.

**Rollout-järjestys.**
1. **Staging A/B** (yllä): `kuorma_seura_01` lippu päällä vs. `kuorma_seura_02` pois; tulos kirjataan tähän (luvut, FCP/TTI, suunta).
2. **Tuotanto: KPV (testiseura)** — lippu päälle Admin → Liput; johtorooli (ei SA) avaa Seuran: KPI-laskurit ja suodatinlukumäärät identtiset lippu päällä/pois (§7.3), konsolissa `[lista_seura] ok`.
3. **Tarkistusajo 0 eroa:** `node scripts/lista_seura_backfill.js --tarkista --seura=kpv` (Tero ajaa, ADC) — poistumiskoodi 0.
4. **Muut seurat yksi kerrallaan** (seura → tarkistusajo `--seura=<id>` 0 eroa → lippu päälle → live-vertailu). SJK / GrIFK / HJK / FCL / VIFK / Ylöjärvi vasta, kun ne otetaan muutenkin käyttöön.
5. **Vanhan polun poisto** omana PR:nään, kun tarkistusajo (`--tarkista`, kaikki aktiiviset seurat) on **0 eroa kahtena peräkkäisenä viikkona**.
Peruutus missä tahansa vaiheessa: lippu pois (Admin → Liput) → Seura lukee vanhaa polkua heti; kooste jää paikalleen.
