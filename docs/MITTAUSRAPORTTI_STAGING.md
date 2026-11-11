# Mittausraportti — staging (projekti 06)

> Generoitu `scripts/kuorma/mittaus_raportti.js`:llä mittaustuloksista. **Älä muokkaa käsin** — aja mittaukset ja generoi uudelleen. Rajat: P11 (`.briefit/projektit/06-staging-ja-kuormamittaus/VAIHE0.md`), `scripts/kuorma/mittaus_lib.js` (RAJAT).

**Aineisto:** 1000 pelaajaa · sivumittaus ei ajettu.

## 1. Tulokset vs. P11-rajat

| Mittari | Mitattu | Raja (P11) | Tulos | Huomio |
|---|---:|---:|---|---|
| Aika interaktiiviseksi — Seura (työpöytä) | – | < 2 s | ⏳ ei mitattu |  |
| Aika interaktiiviseksi — VP (työpöytä) | – | < 2 s | ⏳ ei mitattu |  |
| Aika interaktiiviseksi — Master (työpöytä) | – | < 2 s | ⏳ ei mitattu |  |
| Aika interaktiiviseksi — Kehitystyöpöytä (työpöytä) | – | < 2 s | ⏳ ei mitattu |  |
| Aika interaktiiviseksi — Testaus (työpöytä) | – | < 2 s | ⏳ ei mitattu |  |
| Aika interaktiiviseksi — Pelaaja (työpöytä) | – | < 2 s | ⏳ ei mitattu |  · kirjautumaton (vain kirjautumisnäkymä) |
| Aika interaktiiviseksi — Seura (puhelin, Slow 4G) | – | < 5 s | ⏳ ei mitattu |  |
| Aika interaktiiviseksi — VP (puhelin, Slow 4G) | – | < 5 s | ⏳ ei mitattu |  |
| Aika interaktiiviseksi — Master (puhelin, Slow 4G) | – | < 5 s | ⏳ ei mitattu |  |
| Aika interaktiiviseksi — Kehitystyöpöytä (puhelin, Slow 4G) | – | < 5 s | ⏳ ei mitattu |  |
| Aika interaktiiviseksi — Testaus (puhelin, Slow 4G) | – | < 5 s | ⏳ ei mitattu |  |
| Aika interaktiiviseksi — Pelaaja (puhelin, Slow 4G) | – | < 5 s | ⏳ ei mitattu |  · kirjautumaton (vain kirjautumisnäkymä) |
| Firestore-lukuja per avaus — Seura | – | < 2 000 lukua | ⏳ ei mitattu |  |
| Firestore-lukuja per avaus — VP | – | < 2 000 lukua | ⏳ ei mitattu |  |
| Firestore-lukuja per avaus — Master | – | < 2 000 lukua | ⏳ ei mitattu |  |
| Firestore-lukuja per avaus — Kehitystyöpöytä | – | < 2 000 lukua | ⏳ ei mitattu |  |
| Firestore-lukuja per avaus — Testaus | – | < 2 000 lukua | ⏳ ei mitattu |  |
| Firestore-lukuja per avaus — Pelaaja | – | < 2 000 lukua | ⏳ ei mitattu |  |
| Ajastetut funktiot (kesto) | – |  | ⏳ ei mitattu |  |
| Isoin pelaajadokumentti (3 kautta) | 48,5 kt | < 250 kt | 🔶 ennakko (ei staging-mittaus) | suurin kenttä jaksofokus_historia 48448 B · ennakko: generaattorin data + Firestore-laskentakaava; staging-mittaus: mittaa_dokkoot.js --aja |
| Infrakustannus per pelaaja per vuosi | – | < 1 € | ⏳ ei mitattu | tarvitsee sivumittauksen (lukuja/avaus) ja pelaajamäärän |

**Yhteenveto:** 21 mittaria · 0 läpi · 0 ei läpi · 20 ei vielä mitattu · 1 ennakko (offline).

## 2. Ensimmäiseksi pettävä kohta

Ei vielä pätevää mittausta — aja `mittaa_sivut.js`, `mittaa_funktiot.js`, `mittaa_dokkoot.js` (ks. `docs/STAGING_ASENNUS.md` kohta G) ja generoi raportti uudelleen.

_Määritelmä: ensimmäiseksi pettävä = suurin ylitys (mitattu/raja) ei-läpäisseistä; ei aikajärjestys. Korjauksia ei tehdä ennen mittausta (P11) — raportti vain osoittaa kohdan._

## 3. Sivut

_Ei vielä ajettu._

## 4. Ajastetut funktiot

_Ei vielä ajettu._

## 5. Dokumenttikoot

Tila: **offline-ennakko (generaattorin data, savu_taysi)**. Koko = Firestore-tallennuskoon laskentakaava.

| Ryhmä | Dokumentteja | Suurin | Mediaani | p95 |
|---|---:|---:|---:|---:|
| kayttajat | 20 | 0,7 kt | 583 B | 662 B |
| pelaajat | 1000 | 48,5 kt | 3313 B | 4484 B |

Isoimman pelaajadokumentin suurimmat kentät: `jaksofokus_historia` 48448 B, `jaksofokus` 149 B, `tk_lajit_viimeisin` 105 B, `hh_viimeisin` 81 B, `tk_kokonaistulos_edellinen_pvm` 42 B.

## 6. Menetelmä ja rajoitteet

- **Sivut:** Playwright + järjestelmän Chrome, stagingin Hosting-kanava `kuorma`, App Check -debug-token ympäristömuuttujasta. Profiilit: työpöytä (1366×768, ei kuristusta) ja puhelin (390×844 mobiili, Slow 4G 1,6 Mbit/s + 150 ms, CPU 4×). Kylmä = uusi selainkonteksti; lämmin = toinen avaus samassa kontekstissa.
- **Interaktiivinen** = aikaisin hetki FCP:n jälkeen, josta eteenpäin 2 s ajan ei ole pitkiä tehtäviä (> 50 ms) eikä avoimia Firestore-lukuja (Lighthouse-TTI:n lyhyen ikkunan approksimaatio; sivuilla ei ole `tm-ready`-merkkiä).
- **Lukumäärä:** compat-SDK:n `Query.get`/`DocumentReference.get`/`onSnapshot`-kietominen (laskutusta vastaava approksimaatio: kysely = palautetut dokumentit, väh. 1) + Cloud Monitoring `read_count`.
- **Pelaaja-sivu:** mitataan kirjautumattomana (pelaajakirjautuminen = PalloID + PIN; aineistossa ei pelaaja-Auth-tilejä) → lukuja/aika kuvaavat vain kirjautumisnäkymää.
- **Funktiot:** Cloud Schedulerin job käsin (`gcloud scheduler jobs run`), kesto Cloud Loggingista (`Function execution took`), 3 ajoa/funktio. Pienellä aineistolla 40 seuran luku on **lineaarinen ekstrapolaatio pelaajamäärällä** (merkitty); täysi aineisto korvaa sen mittauksella.
- **Kustannus:** arvio P7-profiililla (ks. rivi); hinnat ja kurssi oletuksia.
