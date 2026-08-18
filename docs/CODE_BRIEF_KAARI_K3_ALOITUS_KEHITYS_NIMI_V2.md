# Kehityskaari K3 (v2) — Aloitus-siru + Kehitys-evidenssi + nimikorjaus (Jaksohistoria) · Code-brief

> **KORVAA aiemman K3-luonnoksen.** Recon (main, K1/K2/K5 jälkeen) tarkensi kaikki kolme kohtaa:
> **(A) Aloitus** (`_vpAloitusTavoiteHTML`/`_vpAloitusJaksofokusHTML`/`_vpAloitusKonseptiYdinHTML`) on narratiivi — **ei sirua vielä**.
> `_sparkline(sarja,w,h)` on libissä (käytössä 72×18) mutta **ei exportattu** → tarvitaan pieni exportattu siru-helper.
> **(B) Kehitys-evidenssi:** jaksofokus `jfBody` (TASO 2, ~5635) — sinne kohdennetun ominaisuuden mini-kaari + jaksosidos-delta.
> Reuse `tmKaariJaksoSidos` + `tmKaariSarja` **kuten K2** (sama domeeni→sarja-mappaus, sama honest-empty ei-mitattaville).
> **(C) Nimitörmäys vahvistettu:** TASO 3 -haitarin label on `'Kehityskaari'` (rivi ~5647) mutta sisältö = **jaksofokus-meso-historia**
> (`_vpKehityskaariHTML` + `_vpMesoKaariHTML`, "Player Journey"). Mitattu kaari (Mittaus, `tmKaariRenderFull`) on eri asia → **label + kommentit → "Jaksohistoria"**.
> **Malli (K1/K2/K5-kuri):** string-helperit, EI DOM-`tmKehityskaari(el)`. Reuse yli reimplementoinnin. **VP_v25 + lib. Ei `?v`.**

## CODE-SÄÄNNÖT (protokolla)
- **Poikkeama = ilmoita ENNEN.** **Älä koske:** `tmKaariRenderFull`/`tmKaariAdarBlokki`/`tmKaariFleiBlokki`/§22-segmentointiin · K2 `_vpSulkuJaksosidosHTML`:iin · TASO 3:n meso-historian **dataan/logiikkaan** (vain label/kommentit) · konsensukseen.
- **§7.22:** Aloitus + Kehitys ovat **VP/valmentaja-näkymiä** → mitatut trendit sallittuja. Pelaajapinta = K4 (ei tässä). **§28/§37** kuten K2.

## MUUTOS A — Aloitus-siru (kompakti kutsu täyteen kaareen)
Uusi **exportattu** siru-helper libiin (reuse `_sparkline` + `tmKaariSarja` + `tmKaariSuunta`, ei uutta sparklinea):
```
tmKaariSiruHTML(p, opts) → kompakti rivi 1–3 avainmittarin minikaarta (arvo + minisparkline + suunta ↑/↓/→).
  Valinta: mitatut avaimet joilla ≥2 pistettä, prioriteetti esim. lin30m · FLEI · TKI (tai vahvin-signaali). Max 3 (Oura: summary ennen tiheyttä).
  <2 pistettä missään → '' (honest-empty). §22-alusta-herkillä: näytä vain saman alustan segmentti (reuse K1b-logiikka tai jätä alusta-merkki pois sirusta).
```
- **Sijoitus:** Aloitus-narratiiviin (esim. `_vpAloitusJaksofokusHTML` loppuun tai oma rivi). **Klikkaus → `_jspVaihda(<Mittaus-välilehden indeksi>)`** (avaa täyden kaaren). Progressiivinen paljastus — ei numeromassaa Aloitukseen.
- **Ilmoita ENNEN:** (1) exportataanko `_sparkline` vai tehdäänkö itsenäinen `tmKaariSiruHTML` (**suositus: jälkimmäinen** — siru-logiikka libissä yhtenä lähteenä). (2) mitkä 1–3 mittaria (suositus: lin30m·FLEI·TKI jos dataa, muuten mitatut ≥2).

## MUUTOS B — Kehitys-evidenssi jaksofokuksen viereen (TASO 2)
`jfBody`:hyn (aktiivinen jaksofokus) **kohdennetun ominaisuuden mini-kaari + jaksosidos-delta** aktiiviselle jaksolle:
- **Jakso** = aktiivinen jaksofokus (`alkoi`→nyt). **Domeeni→sarja** sama kuin K2: `teknis_taktinen`→TKI · `fyysinen`→nopeus/ketteryys · `psyykkinen`/`sosiaalinen`→**honest-empty** ("ei numeraalista kaarta — arvio keskustelussa").
- **Reuse `tmKaariJaksoSidos` + `tmKaariSarja`** (kuten K2 `_vpSulkuJaksosidosHTML`) — **harkitse reuse suoraan `_vpSulkuJaksosidosHTML`:ää** (se ottaa jo p+jakso+opts, tuottaa saman lohkon). **Ilmoita ENNEN** jos se vaatii pienen yleistyksen (esim. otsikko/tiiviys Kehitys-kontekstiin).
- **§28-neutraali** (pre-PHV ei rankaisu) · **§37** ("peruste, ei arvosana"). → valmentaja näkee perusteen fokukselle samassa näkymässä.

## MUUTOS C — nimikorjaus: TASO 3 "Kehityskaari" → "Jaksohistoria"
- Vaihda TASO 3 -haitarin **label** (`row('_accKaari','🗺','TASO 3 · HISTORIA','Kehityskaari', …)` ~5647) → **`'Jaksohistoria'`** (alaotsikko esim. "suljetut jaksofokukset · Player Journey").
- Päivitä **kommentit** jotka kutsuvat meso-historiaa "kehityskaareksi" (~5597, ~6123) → "jaksohistoria".
- **Tarkista jokainen 'Kehityskaari'-label erikseen** (esim. ~5811 R1 suunnitelman kaari): jos se merkitsee **meso-/jaksofokus-historiaa** → "Jaksohistoria"; jos se merkitsee **mitattua trendiä** (Mittaus/tmKaariRenderFull) → **jätä "Kehityskaari"**. Sekaannuksen poisto on koko pointti.
- **VAIN label/eyebrow/kommentti** — `_vpKehityskaariHTML`/`_vpMesoKaariHTML`-datan ja -logiikan **nimet ja toiminta ennallaan** (sisäinen funktionimi voi jäädä; älä rikota kutsupaikkoja).

## INVARIANTIT + DoD
- **Yksi komponentti:** Aloitus-siru + Kehitys-evidenssi molemmat mitatusta kaaresta (reuse `_sparkline`/`tmKaariJaksoSidos`), ei uutta sparklinea. Meso-historia (TASO 3) vain uudelleennimetty — **data/logiikka ennallaan**.
- **Ei sekaannusta:** "Kehityskaari" = mitattu trendi kaikkialla · meso = "Jaksohistoria/Player Journey".
- **Honest-empty:** siru <2 pistettä → tyhjä · Kehitys-evidenssi psyykkinen/sosiaalinen → keskustelu-note, ei kaarta · §28 pre-PHV neutraali.
- **§7.22:** Aloitus/Kehitys VP-näkymiä (ei pelaajapintaa). **Brändi:** teal-aksentti, 0 pinkkiä, molemmat teemat.
- **LIVE ennen valmista (molemmat teemat):**
  - Aloituksessa siru-rivi (≥2 pistettä) → minikaaret + suunta · klikkaus → Mittaus. <2 pistettä → ei sirua.
  - Kehityksessä TASO 2:ssa aktiivisen jaksofokuksen kohdennetun ominaisuuden jaksosidos-kaari; psyykkinen → note.
  - TASO 3 otsikko **"Jaksohistoria"** (sisältö = suljetut jaksofokukset, ennallaan). Mitatun kaaren labelit (Mittaus) yhä "Kehityskaari".
  - Vitest + eslint vihreä. Ei `?v`.

## EI TÄSSÄ (oma briffi)
- **K4** Pelaaja §7.22 -variantti (`tmKaariRenderPelaaja`; K5a lisäsi jo ADAR-pelaajahaaran) — viimeinen pala.
- Alustan normalisointikaava (K1b `_alustaNormi`-stub, kun Tero toimittaa).
