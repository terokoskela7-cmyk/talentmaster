# Vaihe 6 — Silmukan sulku: jakson vaikutus → seuraava fokus (meso-sykli)

> Muuttaa lineaarisen putken **pyöriväksi sykliksi.** Kun jaksofokus (4a) umpeutuu, järjestelmä sulkee jakson: *tehtiinkö suunnitelma (teemaharjoitukset + läsnäolo, 4d/K2)* → *valmentajan luku edistymästä (kevyt)* → *silta ehdottaa seuraavan fokuksen (Vaihe 5)*. Rakentaa **meso-kehityskaaren** (jakso→jakso) 3b:n kausikaaren rinnalle. Kohde: **VP_v25 + Master_v16** (joukkuevalmentaja sulkee/arvioi omat pelaajansa — §4/§37). Rakentuu: 4c `tmJfUmpeutunut` · 4d treeniteema+läsnäolo · Vaihe 5 silta · §29 delta · 3b review. §29 (suljettu silmukka) · §28 · §26 · §4 · §7.22-henki. Visuaali: `docs/mockups/vaihe6_silmukan_sulku_mockup.html`.

## 0. Laatuperiaate — PROSESSIREHELLINEN review (EHDOTON)
4 viikon tekniikkajakso **ei yleensä tuota mitattavaa deltaa** (§28: hermoston adaptaatio hidasta; §3.2: vaadittu vuosivauhti ~5–10 s). **ÄLÄ vaadi "onnistui/epäonnistui"-mittaria joka jaksolle** — se loisi valheellista tarkkuutta + painetta.
- **Ensisijainen signaali = PROSESSI:** tehtiinkö suunnitellut teemaharjoitukset + oliko pelaaja läsnä (4d/K2). "3 teemaharjoitusta, läsnä 3/3" = jakso toteutui — se on jo arvokas tieto.
- **Tulos = PEHMEÄ:** valmentaja lukee edistymän (uudelleenarvio havaittu 1–5 TAI kvalitatiivinen huomio). Objektiivinen delta (§29) **näytetään VAIN jos aito uusi mittaus osuu jaksolle** — ei pakoteta.
- **Kehys:** `parani` / `ennallaan — jatka` / `vaihda fokus`. EI "epäonnistui". §28-neutraali (hidas kehitys = normaali, ei moite).

## 1. Laukaisin + data (§26)
- **Laukaisin:** `tmJfUmpeutunut(jaksofokus)` (4c, jo olemassa) → jakso valmis suljettavaksi. 4c-oversight näyttää jo 🟠 umpeutunut → lisää **"Sulje jakso"** -toiminto.
- **Kontekstidata (pikakentistä + 4d):** teemaharjoitukset joilla `treeniteema.avain === jaksofokus.konsepti_avain` jakson `[alkoi, umpeutui]`-välillä + niiden `lasnaolo_kooste` (K2) tälle pelaajalle → "harjoituksia N, läsnä M".
- **Delta (jos on):** `tki_edellinen`/`hh_taso_edellinen` + nykyinen — VAIN jos konsepti mäppäytyy mitattuun testiin JA uusi mittaus on jakson jälkeen.

## 2. Jakson sulku -kortti (VP)
Kun VP klikkaa "Sulje jakso" (umpeutunut jaksofokus):
- **Konteksti:** konsepti + kesto (alkoi→umpeutui) + **prosessi**: "X teemaharjoitusta · läsnä Y/X" (4d/K2). Jos 0 harjoitusta → "Jakso ei toteutunut treeneissä" (rehellinen; älä väitä vaikutusta).
- **Edistymä (kevyt, valmentaja):** uudelleenarvio havaittu 1–5 (esitäytä edellinen arvo) TAI vapaa huomio. Näytä delta jos aito mittaus.
- **Tulos-valinta:** `parani` · `ennallaan — jatka samaa` · `vaihda fokus`.
- **→ Seuraava fokus:** silta (Vaihe 5) ehdottaa seuraavan heikoimman → uusi jaksofokus yhdellä klikillä. `jatka samaa` → sama konsepti uudella jaksolla.

## 2b. Jakson arviointi-portti — itsearvio + valmentaja/VP + kalibraatio + video (Teron lisäys 2026-07-05)
Jakson sulku = **aito reflektiohetki** vanhan ja uuden jakson välissä (ei pelkkä hallinnollinen close). Kaksi näkökulmaa + kalibraatio (§37-malli) + video-valmius (§15 media[]):
- **Pelaajan itsearvio (§7.22):** "Miten jakso meni?" — pelaaja arvioi **oman edistymänsä** konseptissa lapsen kielellä (ystävällinen 1–5, esim. ⭐/"miten hyvin osaan nyt" — EI percentiiliä/vertailua) + vapaa fiilis. Rakentaa itsetuntemusta (SDT-autonomia, Dweck-prosessi). Tallennetaan `arvio_itse`.
- **Aikuisarvio — roolimallin mukaan (§4/§37, sama kuin jaksofokuksen asetus):** havaittu 1–5.
  - **Joukkuevalmentaja → OMAT joukkueen pelaajansa** (omistaa kentän) — sulkee + arvioi omien pelaajiensa jaksot **Master_v16:ssa**. `arvio_valmentaja`.
  - **Talenttivalmentaja → talenttipelaajat.** `arvio_valmentaja` (rooli talenttivalmentaja).
  - **VP → oversight + talentit + kaikki** (VP_v25). `arvio_vp`.
  > Sama omistajuus kuin ROOLIMALLI-INVARIANTissa: joukkuevalmentaja vaikuttaa omiin pelaajiinsa ilman erillistä hyväksyntää; VP näkee kaikki + voi ohjata. Kuka tahansa näistä voi antaa aikuisarvion oman skooppinsa pelaajalle.
- **Kalibraatio:** `|arvio_itse − arvio_valmentaja|` → itsetuntemussignaali (näkeekö pelaaja itsensä osuvasti — talenttikehityksen ydinmittari). **Kalibraatio on valmentajan/VP-diagnostiikkaa (§7.22):** pelaajalle EI näytetä "arvioit itsesi väärin" -kehystä, vaan positiivinen dialogi ("hyvä että pohdit tätä"). Näkyy VP/valmentaja-puolella `kalibraatio_ero`.
- **Video (tulevaisuus, rakenne valmiina):** `media[]`-array (§15 ADAR-pattern: `{tyyppi:'video', storage_url, download_url, otettu:ISO}`) — jakson taidon näyte (esim. ennen/jälkeen-klippi). **Nyt placeholder "📹 Liitä video (tulossa)"**, rakenne + Storage-polkukonventio valmiina (ei toteuteta latausta vielä). §26: `media[]` historian entryssä.
- **Siirtyminen:** portin läpäisy (itsearvio + valmentaja-arvio annettu tai ohitettu) → silta ehdottaa seuraavan → uusi jakso. Itsearvio/valmentaja-arvio **valinnaisia** (jakso voi sulkeutua ilman — prosessi ensin, §0).

## 3. Datamalli — `jaksofokus_historia[]` (pikakenttä, append)
Sulkiessa: append `jaksofokus_historia[]`:
```
{ domeeni: 'teknis_taktinen',          // §8 geneerinen moottori: 'fyysinen'|'psyykkinen'|... (oletus teknis_taktinen)
  konsepti_avain, konsepti_nimi, alkoi, paattyi,
  harjoituksia, lasnaolo,               // 4d/K2 prosessi
  arvio_ennen, arvio_jalkeen,           // havaittu 1–5 (voi olla null)
  arvio_itse,                           // pelaajan itsearvio 1–5 (§7.22, voi olla null)
  arvio_valmentaja, arvio_vp,           // aikuisarvio 1–5 (§4, kumpi antoi)
  kalibraatio_ero,                      // |arvio_itse − aikuisarvio| tai null
  delta_mitattu,                        // {testi, ennen, jalkeen} tai null
  media: [],                            // §15 video-valmius (tyyppi/storage_url/otettu:ISO); nyt tyhjä
  tulos: 'parani'|'ennallaan'|'vaihda', lahde_seuraava }
```
+ nollaa/korvaa `jaksofokus` (uusi tai tyhjä). **Pikakenttä-array (§26), EI alikokoelmaa** (kevyt; kuten flei_historia). `new Date().toISOString()` (ei serverTimestamp arrayssa, §7-invariantti).

## 4. Meso-kehityskaari (näkymä)
- **Jaksotason timeline** (3b:n kausikaaren rinnalle): Kuljetus → Syöttö → Suojaus … kukin prosessimerkillä (läsnäolo%) + tulos-ikoni. Näyttää **fokusten rytmin** ajan yli = pelaajan elävä kehitystarina.
- Sijainti: pelaajan Aloitus/Reviewit tai 3c-aikajanan jatkeena. Lukee `jaksofokus_historia[]`.
- **§7.22:** valmentaja/VP-näkymä (kaari + prosentit). Pelaajalle mahdollinen positiivinen versio (4b) = erikseen, ei tässä.

## 5. Roolit + invariantit
§4/§37 ROOLIMALLI (sulku + arvio = sama omistajuus kuin jaksofokuksen asetus): **joukkuevalmentaja sulkee/arvioi OMAT joukkueen pelaajansa (Master_v16)** · talenttivalmentaja talentit · VP oversight + kaikki (VP_v25). Ei erillistä hyväksyntää (kenttäomistajuus). Sulkukortti **sekä VP_v25:ssä että Master_v16:ssa** (valmentaja kirjoittaa omilleen). Rules: `jaksofokus`/`jaksofokus_historia` -kirjoitus `onOmaSeura && (onValmentajaRooli()||onJohtoRooli())` (sama field-level kuin PR #115 jaksofokus) · §26 (historia pikakenttä-array, prosessi 4d/K2-pikakentistä, EI alikokoelmakyselyä renderissä) · §28 (hidas kehitys = neutraali, ei moite) · §29 (delta vain aidosta mittauksesta) · §7.22-henki (prosessi > tulos; ei painetta) · §5 · custom-dropdown jos valinta · ei version.json-bumppia · lib `?v`. PURE-apuri esim. `lib/tm_jaksokooste.js` (`tmJaksonHarjoitukset(tapahtumat, konsepti_avain, alkoi, loppu, pelaajaId)` → {harjoituksia, lasnaolo}) + Vitest.

## 6. Rajaus (EI Vaihe 6:ssa)
- **K5 kuorma/dropout** (koko joukkueen kuorma-analytiikka) — eri kerros; Vaihe 6 = per-pelaaja jaksosykli.
- **Pelaajan/perheen jakso-yhteenveto** (4b-family-tyyppinen positiivinen kooste) — erikseen.
- **Automaattinen sulku** (ilman valmentajaa) — EI; aina valmentaja/VP vahvistaa.
- **Kausitason IDP-review** (3b) — pysyy erillään; Vaihe 6 on meso, 3b makro (ne linkittyvät: monta suljettua jaksoa → kausikaari).

## 6b. Itsearvion syöttö — kaksi tapaa (§32)
- **Pelaaja itse (Pelaaja_v7):** kun pelaajan jakso umpeutuu, kevyt "Miten jakso meni?" -portti MINÄ-näkymässä (§7.22, ystävällinen) → kirjoittaa `arvio_itse` pelaajadokkiin (tai historian entryyn). Rakentuu 4b-cue-kerroksen viereen.
- **Valmentaja proxy (VP/Master):** jos pelaaja ei syötä, valmentaja voi kirjata itsearvion dialogissa sulkukortissa. Kumpikin riittää; **itsearvio on valinnainen** (portti läpäistävissä ilman).
> Kevein toteutus: Vaihe 6 rakentaa VP-sulkukortin (valmentaja-proxy + aikuisarvio + kalibraatio) ensin; pelaajan oma itsearvio-portti Pelaaja_v7:ssä voi olla **6.1** jos laajentaa liikaa. Rules: `arvio_itse` pelaajan/anon-kirjoitus omaan dokkiin (kuten 4b-kirjaukset).

## 8. Yleistettävyys — jaksosykli on DOMEENIAGNOSTINEN moottori (Teron havainto 2026-07-05)
Sama sulku/arviointi/kalibraatio/kaari-mekaniikka pätee **fysiikkajaksoon** (ja myöhemmin psyyke/D3, peliäly/D4). Rakennetaan Vaihe 6 **geneeriseksi moottoriksi**, teknis-taktinen ensimmäisenä ilmentymänä — EI teknis-taktinen-only-koodia jota pitää myöhemmin purkaa.
- **Domeeni-tagi:** `jaksofokus.domeeni: 'teknis_taktinen' | 'fyysinen' | 'psyykkinen' | ...` (oletus `'teknis_taktinen'`). Sulkumoottori (`tm_jaksokooste`, historia, kaari, kalibraatio) on domeeniriippumaton; vain **fokuksen lähde** + **vaikutuksen evidenssi** vaihtelevat.
- **Fysiikkajakson ero (opettavainen):** vaikutus on **objektiivisesti mitattavissa** (H-H: lin30m/CMJ/MAS, §29 `hh_taso_edellinen`) — toisin kuin tekniikka (hidas, pehmeä). → fysiikkareview **nojaa mitattuun deltaan**, ei pelkkään pehmeään lukuun. **MUTTA §28 PHV-portti on kriittinen:** pre-PHV nopeus/voima-kasvu on rajallista → *"ei parantunut 30m"* pre-PHV = **biologisesti odotettu, EI epäonnistunut jakso** (kuten teknis-taktisessa "hidas = normaali"). Kaksi eri syytä samaan "älä syyllistä"-kehykseen (§28-invariantti #3).
- **Fysiikkajakson roolit:** `fysiikkavalmentaja` / `fysioterapeutti` (§4 operatiiviset roolit) luontaiset arvioijat, valmentajan/VP:n rinnalla.
- **Fysiikkajakson fokus + silta:** heikoin **D1** (arviointi-taksonomia D1 / H-H-testitaso) → fyysinen treeniteema (4d:n D1-polku, joka jätettiin 4d §5:ssä omaksi poluksi) → sama sulkusykli.
- **Fysiikkajakson sulku-rakenne (Teron täsmennys — sama moottori):** (1) **fyysinen treeniteema** (mitä harjoiteltiin) → (2) **onko toteutunut suunnitelman mukaisesti** (prosessi: harjoituksia + läsnäolo, §1) → (3) **arvio = subjektiivinen TAI mitattu tulos jos testattu**. Tämä on **täsmälleen geneerisen moottorin evidenssi-slot** (§0): näytä mitattu delta (H-H) jos testi osui jaksolle, muuten fysiikkavalmentajan subjektiivinen arvio + PHV-portti. Ei uutta logiikkaa — sama `arvio_*` + `delta_mitattu` -kentät, eri domeeni.

**Rakennusjärjestys:** Vaihe 6 = teknis-taktinen jaksosykli **domeeni-tagilla** (geneerinen moottori). **Vaihe 7 = fysiikkajakso** (sama moottori, D1-fokus + mitattu delta + PHV-portti + fysiikkavalmentaja/fysioterapeutti) — oma spec+mockup myöhemmin, mutta datamalli (`domeeni`) ja moottori valmistellaan nyt niin ettei uudelleenkirjoitusta tarvita.

## 7. Verifiointi
Vitest `tm_jaksokooste.js`: harjoitusten+läsnäolon laskenta (konsepti+jaksoväli+pelaaja), 0-harjoitusta-tapaus, delta vain kun mittaus, `kalibraatio_ero` = |itse−aikuis| (null jos jompikumpi puuttuu). Live VP_v25: umpeutunut jaksofokus → "Sulje jakso" → kortti (prosessi "N harjoitusta, läsnä M" + itsearvio + valmentaja/VP-arvio + kalibraatio + video-placeholder + tulos) → append `jaksofokus_historia` + silta ehdottaa seuraavan → uusi jaksofokus. Meso-kaari näyttää suljetut jaksot. §28-kehys (ei "epäonnistui"), §7.22 (kalibraatio ei pelaajalle syyllistävänä). `npm test` + lint. Chrome-devtools. **Merge vasta kun Tero sanoo "live".**
