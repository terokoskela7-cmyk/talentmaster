# Normisto ja seuran linja — kolmen kerroksen malli (PR 3b)

Tila: toteutettu `lib/tm_normisto.js` (+ `tm_joukkuesaanto.js`, `tm_tekniikka.js`, `tm_fyysinen.js`). Pysyvä periaate (Tero 10.10.2026):
**menetelmä lukittu, normisto maakohtainen, seuran linja joustava; logiikka libeihin, ei HTML:ään.**

## 1. Kolme kerrosta

| Kerros | Mitä | Missä | Muutettavissa |
|---|---|---|---|
| **1 · Menetelmä** | §28 kypsyysvahti, §7.22 (ei lukuja/tasoja pelaajalle ja huoltajalle), datan ikä (15 kk, koko patteristo, "päivä tuntematon"), tilat (`kehityskohde`/`ok`/`neutraali`/`vajaa`/`ei_dataa`) | laskentalogiikka `tm_tekniikka.js` / `tm_fyysinen.js`, `tm_koti_luvut.js` (`kypsyysEstetty`) | **ei** (ei normistolla eikä seuralla) |
| **2 · Normisto** (maa/liitto) | testit, normitaulukot (NORMIREKISTERI), tasojen merkitys, mittariketju, oletusrajat | `NORMISTOT` + `NORMIREKISTERI` (`tm_eerikkila_normit.js`) | lisäämällä normisto (DFB, KNVB…) |
| **3 · Seuran linja** | oma normisto-valinta, omat rajat (vain sallitut), mukaan otettavat testit, tavoitetasot ikäluokittain | `seurat/{sid}/konfiguraatio/normit` | **kyllä** (sallituissa rajoissa) |

Suomi: tekniikka = **TKI → SM-tasot**, fyysinen = **H-H** (normisto `eerikkila` = Palloliitto FINAL2024 / Eerikkilä). Oletusrajat: TKI < 40, kahden tason ero (normisto) · lukitut luotettavuusehdot: 1/3 mitatuista, 5 mitattua tai puolet joukkueesta, otos pieni < 8, 15 kk (menetelmä).

## 2. `tmNormistoRatkaise(seuraKonfig)` → yksi asetusobjekti, lähde arvon vieressä

```js
{ normisto:{arvo:'eerikkila', lahde:'tm'|'seura'}, tuntematon:false,
  rajat:{ TKI:{arvo:40, lahde:'normisto'|'seura'}, ERO_TASOA:…, SM_MIN_IKA:…, SM_AIKUINEN_IKA:…, FYS_TASO_RAJA:1, SM_TASO_RAJA:1, MIN_MITATTU:{5,'tm'}, OTOS_PIENI:{8,'tm'}, OSUUS_MITATUSTA:{3,'tm'}, OSUUS_KAIKISTA:{2,'tm'}, VANHA_KK:{15,'tm'} },
  ketju:{arvo:{tekniikka:['tki','sm'], fyysinen:['hh']}, lahde:'normisto'}, testit:{arvo:null|[…], lahde}, tavoitetasot:{arvo:{'14':3}, lahde}, seuranRajat:['TKI'] }
```
Lähteet: `'seura'` = seuran asetus · `'normisto'` = normiston oma arvo · `'tm'` = TalentMasterin oma oletus (kun normisto ei määritä arvoa).

**Laskentafunktiot saavat asetukset parametrina** (`opts.asetukset`; `tmSmTaso`/`tmFyysinenTaso` 5. parametri; `tmJoukkueSaanto(o, asetukset)`). Ilman parametria käytetään TalentMasterin oletusta (Suomi) → nykyinen käyttäytyminen ja nykyiset testit ennallaan. `tm_tekniikka`, `tm_fyysinen` ja `tm_joukkuesaanto` eivät lue normitaulukkoa (`EERIKKILA_NORMIT`) eivätkä omia `RAJAT`-vakioitaan; normihaku kulkee `NORMIREKISTERI`n kautta (`laskeNormitaso`, `testikartta`). Vartija: `tests/tm_normisto.test.js`.

**Tuntematon normisto, ketjuton normisto tai puuttuva rekisteri → tila "ei dataa"** (`eiDataaSyy: 'normisto_tuntematon' | 'ei_ketjua'`), ei virhettä; joukkuetasolla `ei_luokkaa`.

## 3. Seuran konfiguraatio (`seurat/{sid}/konfiguraatio/normit`)

```js
{ normisto: 'eerikkila',                       // valinta; tuntematon → "ei dataa"
  rajat: { TKI: 45, FYS_TASO_RAJA: 2, ERO_TASOA: 1 },   // vain SEURA_SALLITUT, kokonaisluvut väleillä; muu ohitetaan
  testit: ['lin30m','cmj','kasirata'],         // mukaan otettavat testit (puuttuu = kaikki normiston testit)
  tavoitetasot: { '12': 2, '14': 3 } }         // ikäluokittain 1–5; ratkaistu ja saatavilla (tmNormistoTavoitetaso), laskenta ei vielä käytä
```
**Lukitut menetelmäkerrokseen (lähde `'tm'`, ei normiston eikä seuran säädettävissä):** `MIN_MITATTU` (5), `OTOS_PIENI` (8), kolmasosan osuus (`OSUUS_MITATUSTA` 3) ja puolen ehto (`OSUUS_KAIKISTA` 2) — ne ovat luotettavuusehtoja, eivät seuran linjaa — sekä `VANHA_KK` (datan ikä 15 kk) ja §28.

**Seuran säädettävät — sallitut rajat (`SEURA_SALLITUT`, kokonaisluku; väli ulkopuolinen tai epäkelpo arvo ohitetaan ja lähteeksi jää `'normisto'`):**

| Asetus | Sallittu väli | Normiston oletus | Merkitys |
|---|---|---|---|
| `TKI` | **25–55** | 40 | tekniikka alle ikätason, kun TKI < raja |
| `FYS_TASO_RAJA` | **1–3** | 1 | fyysinen kehityskohde, kun taso < raja + 1 (taso ≤ raja) |
| `SM_TASO_RAJA` | **1–3** | 1 | sama SM-tasoille (tekniikka) |
| `ERO_TASOA` | **1–3** | 2 | pallo hidastaa, kun SM-pallo ≥ näin monta tasoa SM-juoksua alempana |
| `tavoitetasot` | ikäluokittain **1–5** (avain = ikä) | – | seuran tavoitetaso; ratkaistu ja saatavilla (`tmNormistoTavoitetaso`), laskenta ei vielä käytä |
| `testit` | normiston testien **osajoukko** | kaikki | mukaan otettavat testit; tuntemattomat ja kaksoiskappaleet pois, tyhjä tulos = kaikki (lähde `'normisto'`) |

Raja-arvot testataan (`tests/tm_normisto.test.js`: väli sisällä ja ulkopuolella, epäkelvot arvot, lukitut). Ei seuran säädettävissä: ikärajat (`SM_MIN_IKA`, `SM_AIKUINEN_IKA`; normistoa), edellä listatut lukitut.

Luku: `tmNormistoLataa(lukija)` (lukija palauttaa Promisen dokumentin datasta) → ratkaistu asetusobjekti; virhe tai puuttuva dokumentti → oletus. **VP/Master-kytkentä (dokumentin luku ja `env.asetukset`) on HTML-muutos → erillinen Teron kaistan PR**; `tm_vp_tilanne.js` välittää jo `env.asetukset`:n laskentafunktioille.

## 4. Näkyvyys: "seuran raja"
Kun joukkueen luokituksessa käytetty raja tulee seuralta (`seuranRaja: true` joukkuetuloksessa), Tilanteen huomiorivin meta-riville tulee merkintä **"seuran raja"** (sv-avain tyhjänä, sv-erä 16). Oletusrajoilla merkintää ei ole.

## 5. Rules-tarve (EI tässä PR:ssä — Teron kaista, erillinen PR)
- **Luku:** nykyinen yleinen `match /konfiguraatio/{konfId}` (`tm_admin/firestore.rules` ~1158) sallii jo oman seuran henkilökunnan luvun → luku ei vaadi muutosta.
- **Kirjoitus:** nykyinen blokki sallii `onJohtoRooli()`:n. Tavoite **SA / VP / UTJ** (kuten valmennuslinjan v3.40: `rooli in ['vp','urheilutoimenjohtaja']`) vaatii oman `match /konfiguraatio/normit` -blokin (kirjoitus SA + VP + UTJ, luku oma seura). Kenttävalidointi (rajojen välit) on valinnainen; ratkaisu validoi joka tapauksessa (`SEURA_SALLITUT`).
- Kirjoitusnäkymä (seuran linjan editori) on oma tehtävänsä sen jälkeen.

## 6. Palvelinyhteensopivuus ja suorituskyky
Libit ovat puhtaita (ei `window`/DOM-viittauksia koodissa; dual-export). Testit `tests/tm_normisto_skaalautuvuus.test.js`: (1) ajo puhtaassa Node-prosessissa ilman `window`/`document`, (2) **2 000 pelaajaa × 80 joukkuetta: tekniikka + fyysinen yhteenveto yhteensä ≈ 35 ms kylmänä, ≈ 20 ms lämpimänä (vitestissä ~60 ms; raja < 200 ms)**; seuran asetuksilla sama suuruusluokka. Jäsenyys lasketaan kerran per pelaaja (ei joukkue × pelaaja -silmukkaa) ja normikäyttö välimuistissa asetusobjektia kohti.

## 7. Palvelinkooste (EI toteuteta nyt)
Asiakaspuolen laskenta riittää nykyisillä seuroilla. **Palvelinkooste (Cloud Function laskee joukkueluokitukset ja tallentaa kooste-dokumenttiin) otetaan käyttöön, kun seurassa on yli noin 1 000 pelaajaa tai kun Network-taso (usean seuran / liiton näkymä) tulee.** Libit ajautuvat sellaisenaan Nodessa (§6), joten siirto on kuori, ei uudelleenkirjoitus. Rules-/hinta- ja kooste-skeemapäätökset silloin.

## 8. Vartijat
- `tests/lib_vartijat.test.js` · **(1)** yksikään `lib/`-tiedosto ei ylitä ~500 riviä (520); nykyiset isot (mm. `tm_eerikkila_normit.js` 2006, `tm_teknistaktiset.js` 4886) ovat sallitulla listalla kattoon asti — lista saa vain pienentyä. **(2)** tasoihin, rajoihin ja normeihin liittyvää logiikkaa (normitaulu-/normihakuviittaukset, TKI-rajat, tasorajat, TKI/20) ei lisätä `TalentMaster_*.html`-tiedostoihin: esiintymät eivät saa kasvaa (`tests/fixtures/html_logiikka_baseline.json`, `node scripts/html_logiikka_baseline.cjs --kirjoita` kun määrä pienenee).

## 9. Kartoitus: kolme suurinta HTML-logiikkakokonaisuutta, jotka kannattaa siirtää libiin (vain kartoitus, ei siirtoa)
Mitattu funktioiden pituuksilla ja tasosanojen (taso, TKI, d1/d2, kehityskohde, raja…) tiheydellä.
1. **VP · pelaajakortin rakenne** — `_vpKorttiRakenna` (~640 riviä, ~230 tasosanaa; HTML:n suurin funktio). Tason/gapin/tavoitteen johto sekoittuu renderöintiin. Siirto: `lib/tm_pelaajakortti_malli.js` (puhdas malli: tasot, gap, tavoite normiston/seuran linjan mukaan), render jää HTML:ään.
2. **VP · joukkueen syvänäkymä** — `avaaJoukkueSyvanakyma` + `_jsvFyysinenHTML` / `_jsvTavoiteHTML` / `_jsvTukiHTML` (~700 riviä yhteensä; ~220 tasosanaa): joukkuetason tavoite- ja fyysisten lukujen laskenta. Siirto: `lib/tm_joukkue_syvanakyma.js` (malli) → sama funktio palvelinkoosteelle (§7).
3. **Master · Kausi ja H-H/TKI-detail** — `renderSeason` (~250 riviä), `_buildHHDetail` (~120) ja `_buildTKIDetail` (~150), `_mPinfoOsat` (~290; tasoväitteet): D1/D2-histogrammit, komposiitit, tasoväritys ja TKI/H-H-erittelyt. Siirto: `lib/tm_kausi_malli.js` (komposiitti + histogrammit; jatkaa PR 3:n `d2KomposiittiTaso`-linjaa) ja detail-mallit.
Lisämaininta (4.): VP:n signaalilogiikka (`TP_SIGNAALIT`, `renderSignaalit`, `laskeHeroInsight`) — osin jo libissä (tm_tekniikka/tm_fyysinen), loput `tarkista`-funktiot kannattaa siirtää samaan jaettuun muotoon.

## 10. Avoimet (päätös 10.10.2026)
- **Rules (`konfiguraatio/normit`, kirjoitus SA/VP/UTJ + testi, ettei toisen seuran VP voi kirjoittaa) ja `env.asetukset`-luku VP:hen ja Masteriin siirtyvät 1.11. jälkeen** ja tehdään **yhdessä seuran asetusnäkymän kanssa**; näkymä suunnitellaan ensin **mockupina**. Perustelu: ilman näkymää kukaan ei kirjoita asetuksia, joten Rules-muutos ja lukukytkentä eivät tuo nyt mitään; kaikki seurat käyttävät oletuksia, mikä on käyttöönotossa oikein.
- Tavoitetasojen käyttö laskennassa suunnitellaan erikseen (ei tähän sarjaan).
- Seuraava toteutus: PR 4 (K14, harjoitelogiikka) — kohdevalinta samaan määritelmään `tm_tekniikka.js`:n ja `tm_fyysinen.js`:n kautta.
