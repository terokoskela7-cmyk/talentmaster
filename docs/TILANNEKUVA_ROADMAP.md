# TalentMaster — Tekninen tilannekuva & roadmap

_Laadittu: heinäkuu 2026 · arkkitehti/reviewer-näkökulma (spec-and-verify). Luvut mitattu koodista._

## 1. Iso kuva (tiivistelmä)

TalentMaster on **terveempi kuin monoliittien koko antaa ymmärtää.** Domain-/engine-ydin on
kypsä ja hyvin testattu: 24 `lib/`-moduulia (~13 000 riviä) + juuren jaetut JS:t (~5 500 riviä),
puhtaalla dual-export-mallilla (`module.exports || window.TM_*`) ja **29 vitest-sviittiä / ~801
testiä**. Tämä on oikea, tietoinen "eristä puhdas ydin, testaa, viittaa HTML:stä" -kuvio.

**Velka keskittyy kahteen paikkaan**, ei koko koodikantaan:
1. **App-kuoret ovat monoliittisia** ja duplikoivat toistensa logiikkaa (kalenteri, kortti/5D,
   RSVP, auth, IDP-tallennus) — nämä ovat myös vähiten testattua koodia.
2. **Jakelu & versiointi on käsityötä** (ei build-vaihetta; `?v=N` käsin) ja **ajautuu** — sama
   jaettu kirjasto pyörii tuotannossa eri versioina eri apeissa.

**Johtopäätös:** ei rewritea. Korkein hyöty tulee **soveltamalla jo olemassa olevaa,
todistettua `lib/`-mallia laajemmin** (vedä duplikoitu logiikka jaettuihin, testattuihin
moduuleihin) + korjaamalla versiointi. Tämä sopii suoraan nykyiseen spec-and-verify-työtapaan:
jokainen ekstraktio = yksi rajattu briiffi + L1/L2/L3.

---

## 2. Arkkitehtuuri lyhyesti

**6 tuotanto-appia** (yksitiedostoiset HTML:t, GitHub Pages, ei bundleria):

| App | Riviä | Koko | Rooli |
|---|---|---|---|
| VP_v25 | 14 525 | 1,07 MB | Valmennuspäällikkö — suurin monoliitti |
| Master_v16 | 9 589 | 645 KB | Valmentaja (arviointi→IDP→ohjelmointi) |
| Seura | 6 100 | 297 KB | Seurahallinta |
| Pelaaja_v7 | 5 757 | 377 KB | Pelaaja (PWA) |
| Admin | 2 858 | 156 KB | Järjestelmä-admin |
| Vanhempi_v2 | 1 853 | 103 KB | Vanhempi (PWA) |

**Jaettu kerros (hyvä osa):** `lib/` 24 moduulia (mm. `tm_teknistaktiset.js` 4 886 r generoitu
Python-parserilla, `tm_eerikkila_normit.js` 1 914 r, `tm_idp.js`, `tm-kortit.js`, `tm-profile.js`,
`tm_kalenteri.js`) + juuri (`harjoitelogiikka_v4.js` 2 805 r, `tm-bus.js` event-bus, `tm_auth.js`,
`tm_ai.js`, `tm_sentry.js`, `config.js`).

**Backend:** `functions/index.js` 2 453 r (monoliitti: SendGrid, AI-secretit), `gdpr_locator.js`,
`authz_paatos.js`; `tm_admin/firestore.rules` **1 000 riviä** (175 emulaattoritestiä).

**CI (.github/workflows):** deploy-pages · bump-version (auto) · deploy-rules · test (unit + lint
+ rules-emulaattori) · seed. Kohtuullinen putki.

---

## 3. Roadmap (ominaisuudet)

### Nyt jonossa (jatkaa juuri tehtyä)
- **Kortin FYS / PSY / SOS -rivit** samalla kehitysteksti-mallilla kuin TEK + ÄLY (FYS:llä H-H/
  "matka pronssiin" -logiikka valmiina). Pieni, matalariski.

### Siivoukset (nopeita, matalariskisiä)
- **Tapahtuman `joukkue`-slugin kanonisointi** (`"KPV U13"` → `kpv_u13`) luonnissa.
- **Savutesti-orpodokumentit** (`_rsvpsmoke_`, `_rsvpsmoke2_`) — poista superadminina.
- **Version-bump kattamaan VP + Seura** (nyt vain 4/6 appia auto-stampataan → ne jäävät jälkeen).

### Keskipitkä
- **Ilmoitukset c.4b (email) / c.4c (push)** — kalenteri-epicin jatko.
- Kortti-mallin viimeistely (kaikki 5D-riviä kehitystekstinä, kokoelma/legenda-kortit).

### Isommat (harkinnassa)
- Build/bundle-vaihe (poistaa `?v=`-käsityön).
- ADAR Vision (kuva→AI-narratiivi, glossaryssa "future").

---

## 4. Tekninen velka (priorisoitu rekisteri)

### 🔴 Korkea

**V1 · Kortti/5D-logiikka duplikoitu 4× ja testaamatta.** `_fcKorttiData`/`_laskeStage`/`_dimTaso5`/
OVR reimplementoitu: Pelaaja, VP (`_dimNorm5Adar`/`laskeD2Taso`/`hhLaskeTaso`), Master, Admin.
`lib/tm-kortit.js` (31 KB) + `lib/tm-profile.js` ovat käytännössä **kuollutta koodia** (ei yhtään
app-viittausta). Riski: sama laskenta ajautuu eri apeissa; 0 käyttäytymistestiä.

**V2 · Kalenteri + RSVP + läsnäolo duplikoitu.** Kuluttaja: Pelaaja `_p7LataaKalenteri/_p7Saatavuus*`
vs Vanhempi `_vanhLataaKalenteri/_vanhSaatavuus*` = copy-paste + uudelleennimeäminen. Henkilökunta:
Master `_calTallennaLasnaolo` vs VP `_vpTallennaLasnaolo` = kaksi eri tallenninta samaan
`lasnaolijat`-dataan. `lib/tm_kalenteri.js` on olemassa mutta kuluttaja-apit **eivät lataa sitä**.
Riski: juuri tässä on eläneet viime bugit (latch, render, RSVP-törmäys).

**V3 · IDP-/profiili-tallentimet duplikoitu.** `_vpTallennaIdpDok` vs `_mIdpTallennaDok`;
`tallennaProfiili` vs `_tallennaCoachProfiili`. Sama tietue, eri kirjoittajat → juuri se
"duplikoitu tallennin ajautuu" -luokka (sama kuin Seuran nimivarjostus-bugi, jonka #247 korjasi).

**V4 · Ei data-kerrosta.** 271 inline `db.collection('...')`-kutsua (VP 79, Master 70, Seura 47,
Admin 33, Pelaaja 30, Vanhempi 12) + 156 `.set/.update`-kirjoitusta hajallaan. Ei repository/DAO-
abstraktiota → kirjoituslogiikka toistuu ja ajautuu, ja on testaamatonta.

**V5 · Jaetut kirjastot pinnattu ERI versioihin eri apeissa (ajautuma).** `tm_eerikkila_normit.js`
= v40 (Pelaaja/Admin) · v41 (Master) · **v42 (VP)** — yksi tiedosto levyllä, 3 eri pinniä
tuotannossa. `tm_idp.js` = v2 (Pelaaja) vs v6 (VP/Master). **Appit ajavat eri versioita samasta
koodista.** Korrektisuusriski, ei vain siisteys.

**V6 · Testikate: eniten duplikoitu koodi on vähiten testattua.** 801 testiä kattavat
**vain** ekstraktoidut `lib/`-moduulit + Rules. Yhdelläkään ison HTML-apin inline-render/UI/
tallennus-funktiolla (V1–V4) **ei ole käyttäytymistestiä**. Ainoa HTML:ää koskeva testi tekee
regex-tekstitarkistuksia, ei suoritusta.

### 🟡 Keskitaso

**V7 · Manuaalinen `?v=N`-cache-bust** (56 tagia). Bump-tai-tarjoa-vanhaa käsin → V5:n juurisyy.

**V8 · Backend-monoliitit.** `functions/index.js` 2 453 r · `firestore.rules` 1 000 r.

**V9 · Legacy/compat-kentät.** 43 `legacy|yhteensopivuus|poistetaan`-merkintää; `joukkue` (singular)
elää `joukkueet[]`:n rinnalla migraatiokommentein.

**V10 · Root- ja archive-siivottomuus.** `archive/` 28 tiedostoa / 3,4 MB (16 vanhaa app-versiota);
juuressa ~50 HTML:ää (elävät apit sekaisin legacy-versioiden `VP_v22` + kertakäyttötyökalujen
kanssa). Versiointi tiedostonimellä (`_v25`) arkistoinnin sijaan.

**V11 · Admin lataa authin ulkoisesta URL:sta** (github.io) → tuotanto-auth riippuu Pages-
saatavuudesta ja voi ajautua paikallisesta `tm_auth.js`:stä.

**V12 · MAS-parseri kolmena kopiona** (Excel_Tuonti / tm_testipankki / Testituonti_Master) —
characterization-testi vain pinnaa ajautuman, ei poista sitä.

### 🟢 Matala
**V13 · Auth/PIN inline kaikissa 6 apissa** (`onAuthStateChanged` jokaisessa) — `tm_auth.js` on
mutta epäjohdonmukaisesti käytetty. **V14 · TODO/FIXME** vain 9 kpl (velka on rakenteellista, ei
merkittyä).

---

## 5. Moduulien pilkkominen (dekompositiosuunnitelma)

**Malli on jo olemassa ja todistettu** — ei tarvitse keksiä: puhdas logiikka → `lib/tm_*.js`
(dual-export, ei Firebase/DOM) + vitest-testi + spec-doc. Sovella tätä duplikoituihin huoliin.

**Ekstraktiokohteet (hyöty × riski -järjestyksessä):**

1. **`lib/tm_kortti_5d.js` — kortti/5D-ydin (V1).** Vedä `_fcKorttiData`/`_laskeStage`/`_dimTaso5`/
   OVR/tier + tasomalli yhteen testattuun moduuliin; Pelaaja ensin, sitten VP/Master/Admin. Elvytä
   tai korvaa kuollut `tm-kortit.js`/`tm-profile.js`. **Testit ensin** (kortti on juuri työstetty).
2. **`lib/tm_kalenteri.js` laajennus — kalenteri+lasnaolo-ydin (V2).** Lataus + saatavuus/tila-
   render+save moduuliin; Pelaaja/Vanhempi (kuluttaja) ja Master/VP (henkilökunta) käyttämään.
   Poistaa `_p7`/`_vanh`-copy-pasten + kaksi läsnäolotallenninta. Pienentää bugipinta-alaa.
3. **`lib/tm_data.js` — ohut data-kerros (V3/V4).** Repository hot-poluille (kayttajat, kalenteri,
   lasnaolijat, idp): keskittää kirjoitukset → poistaa "tallennin ajautuu" -luokan.
4. **`tm_auth.js` yhtenäistys (V11/V13).** Yksi auth-lib (anon-kirjautuminen, PIN, onAuthState-
   hook) kaikkiin appeihin; Admin lakkaa lataamasta ulkoisesta URL:sta.
5. **Backend (V8):** pilko `functions/index.js` huolittain (email / AI / GDPR / triggerit).

**Versiointi (V5/V7) — halpa, korkea hyöty:** joko (a) skripti joka synkkaa `?v=` kaikkiin appeihin
+ ottaa VP/Seuran mukaan bumppiin, tai (b) kevyt bundleri (esbuild) joka poistaa `?v=`:n kokonaan
ja pinnaa yhden version. Tämä poistaa V5:n korrektisuusriskin.

**Testaus (V6):** jokainen ekstraktio tuo mukanaan vitest-katteen — ekstraktoi + testaa yhdessä.
Näin duplikaation poisto samalla kasvattaa testikatetta juuri siellä missä sitä ei ole.

---

## 6. Suositeltu etenemisjärjestys (spec-and-verify)

Ei big-bangia. Jokainen kohta = oma briiffi + PR + L1/L2/L3, käyttäytymistä säilyttäen.

1. **Halvat siivoukset ensin:** version-bump VP+Seura mukaan (V5:n osittainen paikkaus), joukkue-
   slug, savutesti-litter. Matala riski, poistaa kitkaa.
2. **Versiointi kuntoon (V5/V7):** synkkaus-skripti tai esbuild-bundleri. **Tämä on korrektisuus-
   korjaus** (apit ajavat eri koodia) — kannattaa ennen isoja ekstraktioita.
3. **Kalenteri-ydin (V2)** ekstraktio testeineen — pienentää eniten tulevaa bugipintaa (siellä
   bugit ovat eläneet), yksi app kerrallaan.
4. **Kortti/5D-ydin (V1)** testeineen — arvokkain, mutta tee vasta kun kortti-featuret ovat
   vakiintuneet (juuri työstetty); testit ensin.
5. **Data-kerros (V3/V4)** kun 2 huolta on jo ekstraktoitu — malli selkiytynyt.
6. **Backend & rules (V8)** oman aikataulunsa mukaan.

**Ohjaava periaate:** ekstraktoi puhdas ydin → testaa → migroi yksi app kerrallaan behavior-
preserving → verifioi. Sama kuri joka on jo tuottanut kypsän `lib/`-kerroksen — laajennettuna
sinne missä velka on.
