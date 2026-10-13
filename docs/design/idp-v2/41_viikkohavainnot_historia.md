# 41 · Viikkohavaintojen historia — säilyykö se nyt? (B2b-selvitys, ei toteutusta)

Tila: ehdotus Teron ja PM:n päätettäväksi **ennen B2c:tä** (jakson arviointi / Sulje jakso). Päivitetty 13.10.2026. Koodia ei muutettu tämän selvityksen vuoksi.

## 1. Nykytila (luettu koodista)

| Mitä | Missä | Säilyykö? |
|---|---|---|
| Valmentajan/VP:n viikkohavainto (yksi napautus) | `jaksofokus.osa_havainnot.<konsepti>.<koodi>.<uid>` = `{arvo, pvm, rooli, lause?}` | **Vain viimeisin per henkilö ja osa.** Jokainen napautus korvaa kentät `arvo`, `pvm`, `rooli` (B2b: lause säilyy). Edellinen viikko katoaa. |
| Voimassa oleva arvio | `jaksofokus.osa_arviot.<konsepti>.<koodi>` | Vain nykyarvo. |
| Pelaajan oma viikkovastaus | `pelaajat/{pid}/viikkokatsaukset/{sunnuntai}` | Kyllä, yksi dokumentti per viikko (K4). |
| Jakson sulku | `jaksofokus_historia` -rivi (`tmSuljeJakso` → `tmHistoriaEntry`) | Rivillä on koosteet (`arvio_ennen`, `arvio_jalkeen`, `arvio_valmentaja`, `harjoituksia`, `lasnaolo` …) mutta **ei viikkohavaintoja**. |
| Uuden jakson aloitus | `tmAsetaJaksofokus` korvaa koko `jaksofokus`-objektin | `osa_havainnot` ja `osa_arviot` **poistuvat** vanhan jakson mukana; historiariville ei kopioida niitä. |

**Vastaus:** viikoittaista havaintohistoriaa ei tallenneta mihinkään. Jakson lopussa jäljellä on vain viimeisin napautus per henkilö ja osa, ja se katoaa seuraavan jakson alkaessa. Tuotannossa dataa on vähän, koska napautus on vasta uuden sivun lipun takana, joten mitään ei ole vielä menetetty.

**Miksi tällä on väliä B2c:lle:** jakson arviointi ("miten osat kehittyivät") ja pelaajan "vk 2 → vk 5" -tarina tarvitsevat viikkosarjan. Ilman sitä arviointi näkee vain loppupisteen.

## 2. Vaihtoehdot

**A · Append-only loki (`pelaajat/{pid}/osa_havainnot_loki/{auto-id}`)** — yksi dokumentti per napautus: `{jakso_alkoi, konsepti, koodi, uid, rooli, arvo, pvm, lause?}`.
+ täydellinen historia, ei kokorajaa; − uusi alikokoelma = Rules-versio + `match`-blokki (§7.15) + Rules-testit, kirjoitus kahteen paikkaan (batch), lukukysely jakson sulussa, Kumoa = poista tai mitätöivä rivi.

**B · ISO-viikkoavain samassa dokumentissa (valittu, Teron muutos 13.10.)** — rinnalle `jaksofokus.osa_havainnot_vk.<konsepti>.<koodi>.<vvvv-Www>.<uid> = {arvo, pvm, rooli}` (esim. `2026-W42`). Viikon merkintä on yksi per henkilö ja osa, ja saman viikon aikana sen päälle kirjoitetaan (idempotentti; Kumoa = palauta tai poista kyseinen viikkoavain). Viikkonumero tulee jaetusta `lib/tm_viikko.js`-libistä (D140, ISO 8601). Lause kirjoitetaan viikkoriville vain jos se kirjoitettiin tuolla napautuksella (sama sääntö kuin B2b:ssä). Jakson arvioinnissa (B2c) `osa_havainnot_vk` kopioidaan jakson historiariville (`tmHistoriaEntry`, valinnainen kenttä `havainnot_vk`); sen jälkeen rivit voi siivota, ettei dokumentti kasva rajatta (uusi jakso korvaa `jaksofokus`-objektin joka tapauksessa).
+ ei uutta kokoelmaa, napautus on yksi `update`, ei lukukyselyä sulussa; − dokumentti kasvaa jakson ajan: 6 viikkoa × noin 5 osaa × 2 roolia = noin 60 riviä, muutama kB.

**C · Viikkoleikkaus palvelimella (Cloud Function sunnuntaisin)** — kopioi viikon tilan arkistoon.
+ ei lisäkirjoitusta selaimelta; − monta napautusta samalla viikolla katoaa, Cloud Functions -työ (Teron kaista), ei auta Kumoaan.

**D · Ei historiaa** — jakson arviointi käyttää vain viimeisintä arvoa. Halvin, mutta B2c:n "kehitys viikoittain" jää pois.

## 3. Suositus

**B (ISO-viikkoavaimella).** Pienin muutos, joka säilyttää viikkosarjan: dot-polut `osa_havainnot` (nykytila) ja `osa_havainnot_vk` (viikkohistoria) samassa `update`ssa. Lause kirjoitetaan päivärivillekin vain jos se kirjoitettiin tuolla napautuksella (sama sääntö kuin B2b:ssä). Kumoa palauttaa molemmat polut (ei aiempaa viikkoriviä → poisto).

**Rules (tarkistettu v3.64:stä):** ei muutosta. `osa_havainnot_vk` on `jaksofokus`-kentän sisällä; Rules rajaa vain `jaksofokus.reitti`n (v3.64) eikä kuvaa `osa_havainnot`-kenttääkään, ja pelaajadokumentin kirjoittavat samat roolit (SA, johto, valmentaja, talenttivalmentaja) kaikkiin jaksofokuksen alikenttiin. Rules-testiä ei tarvita; B2c:n testi todistaa kirjoitusmuodon.

Toteutus B2c:n alussa omana pienenä PR:nä (lib `tmKtTallennaOsaArvio` + `tmSuljeJakso`/`tmHistoriaEntry` + testit; ei HTML-muutoksia vanhoihin näkymiin).

## 4. Päätettävää

1. Hyväksytty: B ISO-viikkoavaimella (Tero 13.10.), toteutus B2c:n alussa omana pienenä vaiheena.
2. Tarvitaanko vanhat jaksot taaksepäin? Ei: dataa ei ole, ja B alkaa kertyä siitä hetkestä kun se otetaan käyttöön.
3. Näkyykö viikkosarja pelaajalle? Ei ennen B3/B4-pelaajanäkymää; lause ei mene pelaajalle ollenkaan ennen sitä (testi `b2b_jakso_sheet_selain.test.js` vartioi, ettei pelaajan tai vanhemman koodi lue `osa_havainnot`-kenttiä).
