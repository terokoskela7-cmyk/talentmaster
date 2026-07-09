# Vaihe 7 — Fysiikkajakso: sama jaksosykli-moottori, D1-fokus + mitattu delta + PHV-portti

> Geneerinen jaksosykli-moottori (Vaihe 6, `domeeni`-tagi) saa **toisen ilmentymänsä: `domeeni:'fyysinen'`.** Ketju: heikoin D1 (H-H/FLEI-pikakentät) → silta ehdottaa fyysisen jaksofokuksen → **fyysinen treeniteema** (4d:n D1-polku, joka jätettiin 4d §5:ssä omaksi polukseen) → toteutuma (prosessi: harjoitukset + läsnäolo, K2) → sulku: **arvio = subjektiivinen TAI mitattu delta jos testattu** (§29) + **§28 PHV-portti** → historia + meso-kaari SAMALLA moottorilla. Kohde: **VP_v25 + Master_v16** (sama kuin V6). EI moottorin uudelleenkirjoitusta — `tm_jaksokooste.js`, sulkukortit, historia ja kaari toimivat jo domeeniagnostisesti; V7 lisää fyysisen **fokuslähteen** ja **vaikutuksen evidenssin**. Visuaali: `docs/mockups/vaihe7_fysiikkajakso_mockup.html`. §28 · §29 · §26 · §4 · §34 · §35 · V6-spec §8.

## 0. Laatuperiaate — evidenssihierarkia + PHV-portti (EHDOTON)
Fyysinen vaikutus **on** objektiivisesti mitattavissa (H-H: lin30m/CMJ/MAS; FLEI) — toisin kuin tekniikka. Mutta:
- **Delta VAIN aidosta mittauksesta (§29):** näytetään vain jos uusi mittaus (`hh_pvm` / `flei_pvm`) osuu jakson sisään tai sen jälkeen. **Testaamista EI pakoteta joka jaksolle** — jos ei mittausta, fysiikkavalmentajan subjektiivinen arvio (1–5) riittää, ja kortti sanoo sen suoraan ("Ei uutta mittausta jaksolla — subjektiivinen arvio riittää").
- **§28 PHV-portti (KRIITTINEN):** pre-PHV (`phv_tila 'PRE'|'LAH'` tai `onNeutraaliPrePHV(p)`) → nopeus/voima-adaptaatio ennen kasvupyrähdystä on biologisesti rajallista → *"ei parantunut 30m"* = **odotettua, EI epäonnistunut jakso.** Delta esitetään kehityskielellä; tulos-kehys sama `parani / ennallaan — jatka / vaihda` (EI "epäonnistui"). Sama älä-syyllistä-kehys kuin V6:ssa, eri biologinen syy (tekniikka = hidas adaptaatio · fysiikka = kypsyysvaihe).
- **V6 §0 prosessirehellisyys pätee:** ensisijainen signaali = tehtiinkö suunnitellut fyysiset teemaharjoitukset + läsnäolo. 0 harjoitusta → "jakso ei toteutunut treeneissä", ei vaikutusväitettä.
- **Datan ikä esitettävä** (CODE_TASK_DATA_TUOREUS-linjaus): delta-lohkossa molempien mittausten pvm **pp.kk.vvvv**.
- **Taso-delta huomioi kasvun automaattisesti:** H-H-taso on ikänormitettu tilannekuva → raaka-ajan paraneminen kasvun tahdissa pitää tason ennallaan; taso-nousu = kehitys YLI ikäkäyrän. Tämä tukee PHV-porttia: pre-PHV "taso ennallaan" on täsmälleen odotettu tulos.
- **METODOLOGIA-INVARIANTTI (CLAUDE.md header):** H-H-taso on tilannekuva testihetken iästä — delta kahden mittauksen välillä on validi vertailu, mutta vanhaa mittausta EI kehystetä nykytilaksi.

## 1. Fyysinen teemaluettelo — uusi PURE-lib `lib/tm_fyysteemat.js` (§34: sisältö libistä)
```
TM_FYYSTEEMAT = [
  { avain:'fy_nopeus',        nimi:'Nopeus',                      testit:['lin5m','lin10m','lin30m'] },
  { avain:'fy_rajahtavyys',   nimi:'Räjähtävyys',                 testit:['cmj','sj'] },
  { avain:'fy_kestavyys',     nimi:'Kestävyys',                   testit:['mas'] },
  { avain:'fy_ketteryys',     nimi:'Ketteryys & suunnanmuutos',   testit:['kasirata','sm_juoksu'] },
  { avain:'fy_liikehallinta', nimi:'Liikehallinta (kehon valmius)', testit:[], flei:true }   // evidenssi = FLEI (Teron päätös 2026-07-09)
]
```
Funktiot (PURE, dual-export `module.exports || window.TM_FYYSTEEMAT_LIB`, Vitest):
- **`tmFyysEhdota(p)`** → `{avain, nimi, peruste} | null` — heikoimman D1:n mäppäys teemaan:
  1. `flei_viimeisin < 40` → `fy_liikehallinta` (klinikkalähete-jatkumo §14, prioriteetti).
  2. `hh_kehityskohde` (pikakenttä §26; arvot lin5m/lin10m/lin30m/cmj/sj/mas/kasirata/sm_juoksu — HUOM syotto/pujottelu ovat D2, EI mäpätä) → testi→teema-mapping.
  3. Fallback: ei kumpaakaan → null (silta ei ehdota; "Ei D1-mittausta" + CTA mittaukseen).
- **`tmFyysDelta(p, alkoi)`** → `{lahde:'hh'|'flei', ennen, jalkeen, muutos, pvm_ennen, pvm_jalkeen} | null` — §29-vahti: palauttaa arvon VAIN jos tuore mittauspvm (`hh_pvm` / `flei_pvm`) `>= alkoi`. hh-teemat: `hh_taso_edellinen → hh_taso` (+ fokus-testin raakadata `hh_viimeisin[testi]` kontekstiksi jos on). `fy_liikehallinta`: `flei_viimeisin` vs edellinen. Ei tuoretta mittausta → null.
- **`tmFyysPHVPortti(p)`** → `{neutraali:bool}` — `phv_tila === 'PRE' || 'LAH'` (kutsuja voi antaa `onNeutraaliPrePHV`-tuloksen fallbackina) → sulkukortti näyttää §28-neutraalin kehyksen.

## 2. Fokuksen asetus — D1-silta (VP + Master)
- Kun pelaajalla **ei ole jaksofokusta** ja `tmFyysEhdota(p)` palauttaa teeman → ehdotuskortti (V5-siltakuvio): *"Heikoin D1: Nopeus — 30m taso 2 (mittaus 12.4.2026)"* → **[Aseta fysiikkajakso · 4 vk]**. Passiivinen kuten V5 (§4b.5): ehdotus ≠ pakko.
- `jaksofokus`-objekti = **sama rakenne**, `domeeni:'fyysinen'`, `konsepti_avain:'fy_*'`, `konsepti_nimi`, `lahde:'silta_d1'`, `alkoi` ISO, `kesto_vk:4`. Sulku perii domeenin uuteen jaksoon (V6 tekee jo).
- **PÄÄTÖS — yksi aktiivinen jaksofokus kerrallaan:** pelaajalla on YKSI `jaksofokus`-pikakenttä; fyysinen ja teknis-taktinen jakso EIVÄT ole rinnakkain. Peruste: meso-filosofian ydin = yksi fokus kerrallaan (4a); moottori (sulku/historia/kaari) lukee yhtä kenttää — rinnakkaisuus vaatisi moottorimuutoksen jota §8 nimenomaan välttää. Jos pilotti osoittaa aidon tarpeen rinnakkaisille (joukkuevalmentajan tt-fokus + fysiikkavalmentajan D1-fokus samaan aikaan) → **7.1: `jaksofokus_fyysinen`-rinnakkaiskenttä** (sulkufunktiot saavat jf:n jo parametrina-tyylisesti tilasta, laajennos additiivinen). UI:ssa: jos aktiivinen tt-jakso on käynnissä, D1-siltakortti näyttää passiivisen vihjeen *"Tekninen jakso käynnissä — fysiikkajakso sen jälkeen"* (ei blokkaavaa virhettä).
- **Kahden sillan yhteiselo (D2 vs D1 — täsmennys 2026-07-09):** V5-silta (heikoin D2 → tt-konsepti) ja D1-silta ehdottavat samaan tyhjään `jaksofokus`-slottiin. Kun fokus puuttuu ja MOLEMMAT kandidaatit ovat olemassa → näytetään **rinnakkain** ja aikuinen valitsee (ei automaattista prioriteettia; poikkeus: FLEI<40 nostetaan ensimmäiseksi). Roolipainotus järjestyksessä: fysiikkavalmentaja-kontekstissa D1 ensin, joukkuevalmentajalla D2 ensin, VP näkee molemmat. Ehdotus ≠ pakko (§4b.5).
- Sulun jälkeen silta ehdottaa seuraavaa SAMAN domeenin sisällä: fyysisen jakson sulku → `tmFyysEhdota` (ei `tmSiltaEhdota`/D2). `_vpSulkuSeuraava`/`_msSeuraava` haarautuvat `jf.domeeni`-tagilla.

## 2c. Henkilökohtainen fysiikkaohjelma — ohjelma-slot (Teron vaatimus 2026-07-09, TÄRKEÄ)
Pelaaja voi saada **henkilökohtaisen fyysisen ohjelman** (nopeus-voima, perusvoima, kuntoutus, liikkuvuus, ...). Järjestelmän on tallennettava ohjelma niin, että sen **vaikutus näkyy** (ohjelma → toteuma → delta) ja että AI voi myöhemmin analysoida: mitä harjoiteltiin, kuinka paljon, sopiiko ohjelma pelaajan kasvuvaiheeseen. Malli: **ohjelma = annos · jakso = mittausikkuna · delta = vaste.**
- **V7-minimi — `jaksofokus.ohjelma`-objekti (additiivinen, valinnainen):**
```
ohjelma: { tyyppi: 'nopeus_voima'|'perusvoima'|'kuntoutus'|'nopeus'|'liikkuvuus'|'muu',
           nimi, kuvaus,                        // vapaa harjoitussisältö (EI terveysyksityiskohtia, ks. alla)
           laatija_uid, laatija_rooli,          // fysiikkavalmentaja/fysioterapeutti/valmentaja/vp
           phv_tila_alussa,                     // kasvuvaihe-snapshot ohjelman alussa (§28 — AI-analyysin avain)
           lahtotaso: { hh_taso, fokustesti_arvo },   // baseline pikakentistä asetushetkellä
           luotu }                              // ISO
```
  Asetetaan fyysisen jaksofokuksen yhteydessä (D1-siltakortti / manuaalinen). **Sulku kopioi `ohjelma`-objektin historia-entryyn** → jokainen suljettu jakso = yksi annos–vaste-rivi: *(ohjelmatyyppi + toteuma [harjoituksia/läsnäolo, myöh. K5-kuorma] + biologinen tila [phv_tila_alussa]) → (delta_mitattu + arviot)*. Tämä on täsmälleen rakenne jonka AI-analyysi tarvitsee — datasetti alkaa kertyä heti V7:stä.
- **7.2 (EI V7:ssä):** ohjelmakirjasto/editori (`ohjelmat/{id}`-alikokoelma — VARATTU jo §11 pääkokoelmassa: sisältörakenne, viikko-ohjelmat, harjoitteet) + **AI-ohjelma-analyysi** (`aiProxy` CF on jo olemassa §13): "onko ohjelma oikeanlainen tälle pelaajalle tässä kasvuvaiheessa" — lukee historia-entryjen annos–vaste-rivit + phv/bio-ikä. V7:n ohjelma-slot suunnitellaan niin että 7.2 EI vaadi migraatiota (ohjelma_id-viittaus lisättävissä additiivisesti).
- **⚠ GDPR Art. 9 -raja:** tyyppi `'kuntoutus'` on OK neutraalina harjoitusohjelmana, mutta **vamma-/terveysyksityiskohdat EIVÄT kuulu `ohjelma`-kenttään** — ne kuuluvat `terveys/`-alikokoelmaan (oma suostumus, §11). `kuvaus` pidetään harjoitussisältönä (esim. "eksentrinen takareisi 2×/vk"), ei diagnooseina. Kirjaa tämä Code-toteutukseen kommenttina.

## 3. Treeniteema — 4d:n D1-polku auki
- `treeniteema.tyyppi` laajenee: **`'fyysinen'`** (additiivinen; nykyiset `'yksilo_konsepti'|'joukkue_teema'` ennallaan). `avain:'fy_*'`, `nimi`, `lahde:'jaksofokus'|'manuaalinen'`, `pelaajat_id[]` kuten 4d.
- `avaaUusiTapahtuma`-teemavalitsimeen kolmas ryhmä **"Fyysinen"** (sisältö `TM_FYYSTEEMAT`-katalogista, EI kovakoodattu §34). Custom-dropdown §37.
- **Ei moottorimuutosta:** `tmJaksonHarjoitukset` (V6) ja `tmTtKate` (4d) matchaavat `avain`-pohjaisesti → `fy_*`-avaimet toimivat sellaisenaan sulussa ja kattavuudessa. ✓
- Fyysisen fokuksen sulkukortin "Suunnittele teemaharjoitus" -CTA → kalenterin `harjoitus` esitäytettynä (4d §2.0-jaon mukaisesti; mittaus-CTA → Testaus_v9, EI sekoiteta).

## 4. Sulkukortti — domeenitietoinen evidenssi-slot (KORJAA MYÖS V6-AUKON)
V6-sulkukortti (`_vpSulkuRender`/`_msRender`) saa evidenssilohkon `jf.domeeni`-tagilla:
- **`domeeni:'fyysinen'`:**
  - **Delta-lohko:** `tmFyysDelta(p, S.alkoi)` → *"H-H-taso 2.7 → 3.1 · mittaukset 1.4.2026 → 12.10.2026"* (+ fokus-testin raakadata jos on). Ei tuoretta mittausta → *"Ei uutta mittausta jaksolla — subjektiivinen arvio riittää (§29)"* + CTA **"📏 Suunnittele mittaus"** → Testaus_v9.
  - **PHV-portti:** `tmFyysPHVPortti` neutraali → amber-banneri: *"PHV-vaihe: nopeus-/voimakehitys ennen kasvupyrähdystä on rajallista — 'ennallaan' on biologisesti odotettua (§28)."*
  - **`delta_mitattu`-kenttä KYTKETÄÄN:** sulku tallentaa `tmFyysDelta`-tuloksen historia-entryn `delta_mitattu`-kenttään (`tmJaksoDelta`/`tmHistoriaEntry` tukevat jo — V6:ssa jäi kytkemättä UI:hin, todettu PR #128 -katselmoinnissa 2026-07-09).
- **`domeeni:'teknis_taktinen'`:** ennallaan (delta-lohkoa ei näytetä; §0-teksti tekniikan hitaudesta kuten nyt).
- Aikuisarvion label roolin mukaan: fysiikkavalmentaja näkee "Fysiikkavalmentaja-arvio". Historia-entryyn **additiivinen `arvioija_rooli`**-kenttä (`tmHistoriaEntry`-optio; 'vp'|'valmentaja'|'talenttivalmentaja'|'fysiikkavalmentaja'|'fysioterapeutti') — kevyt, auttaa myöhempää analytiikkaa.

## 5. Roolit + Rules (§4/§37)
- **fysiikkavalmentaja:** kuuluu jo `onValmentajaRooli` → kirjoitus toimii ilman rules-muutosta. Sulkee/arvioi omat pelaajansa Master_v16:ssa (kuten joukkuevalmentaja V6:ssa); `arvio_valmentaja` + `arvioija_rooli:'fysiikkavalmentaja'`.
- **fysioterapeutti (Teron päätös 2026-07-09 — lisätään field-level-rulesiin):** uusi klausuuli `seurat/{id}/pelaajat/{pid}` updateen:
  `|| (onOmaSeura(seuraId) && request.auth.token.rooli == 'fysioterapeutti' && request.resource.data.diff(resource.data).affectedKeys().hasOnly(['jaksofokus', 'jaksofokus_historia']))`
  — EI `tt_positio_aktiivinen` (ei kuulu fysioterapeutille). Rules-header bump **v3.11** + **Console-deploy** (§12, manuaalinen — kirjaa verifiointiin).
- **Rules-testit (emulaattorilla — V6-opetus: testit skippautuvat ilman emulaattoria, AJA OIKEASTI ennen "valmista"):** fysioterapeutti kirjoittaa jaksofokus+historia ✓ · fysioterapeutti + kielletty kenttä (esim. flei_viimeisin) → estetty ✓ · fysioterapeutti EI kirjoita tt_positio_aktiivinen ✓ · toisen seuran fysioterapeutti → estetty ✓. (Sihteeri-kuvio ennallaan, PR #130.)
- **Fysioterapeutin UI-pääsy VERIFIOITAVA:** Master_v16:n kirjautumis-/roolisallinta tarkistettava toteutuksessa (oikeus ilman näkymää on kuollut kirjain). TIETOINEN RAJAUS: fysioterapeutti EI kuulu `onValmentajaRooli`-listaan → ei luo kalenteritapahtumia — tämä on OIKEIN (fysioterapeutti arvioi + sulkee; fysiikkavalmentaja suunnittelee treenit). Codelle: ÄLÄ "korjaa" tätä lisäämällä fysioterapeuttia valmentajaroolilistaan.
- VP → `arvio_vp` (oversight + kaikki), kuten V6.

## 6. Meso-kaari — domeeni näkyviin
`_vpMesoKaariHTML`/`_msMesoKaariHTML`: kaarikorttiin domeeni-ikoni (🏃 fyysinen · ⚽ teknis-taktinen; entryn `domeeni`-tagista, oletus tt). Kaari näyttää nyt jaksojen RYTMIN yli domeenien — pelaajan kehitystarina laajenee. Ei muita kaarimuutoksia.

## 7. Rajaus (EI Vaihe 7:ssä)
- **Rinnakkaiset jaksofokukset** (tt + fyysinen yhtä aikaa) → 7.1 vain jos pilotti vaatii (§2 päätös).
- **K5 kuorma/dropout** — eri kerros (4d/K2 tuottaa raakadatan).
- **Fyysisten teemojen harjoitepankki/cue-sisältö** — teemakortti näyttää nimen + testikytköksen; varsinainen harjoitesisältö (vrt. tt-curriculum) omana sisältötyönä.
- **Pelaajan oma itsearvio-portti Pelaaja_v7:ssä** — edelleen 6.1 (valmentaja-proxy riittää).
- **Fysioterapeutin terveys-workflow** (GDPR Art. 9 `terveys/`-alikokoelma) — täysin erillään; V7 antaa vain jaksofokus/historia-kirjoituksen. Ohjelma-slotin Art. 9 -raja ks. §2c.
- **GPS/Catapult/Polar-kuormadata jakson evidenssinä (Teron kirjaus 2026-07-09)** — datamalli tukee jo (`kirjaukset.lahde 'catapult'|'polar'` §11); jakson ulkoinen kuorma (matka, high-speed running, kuormakertymä) = K5-kerroksen prosessi-evidenssi. Tulevaisuudessa historia-entryyn additiivinen `kuorma_kooste`-kenttä (dose ≠ response: kuorma täydentää prosessia, EI korvaa mitattua deltaa). EI V7:ssä.
- **Pelaajan 4b-cue-kerros fyysiselle fokukselle** — 4b on tt-spesifi (`tmTtPelaaja`); pelaaja ei vielä näe fyysistä fokustaan. 4b-laajennos omana vaiheena.
- **Automaattinen mittaus→sulku** — EI; aina ihminen vahvistaa (V6-invariantti).

## 8. Verifiointi
Vitest `tm_fyysteemat.js`: ehdotus-mapping (hh_kehityskohde→teema, FLEI<40-prioriteetti, D2-avaimet ei mäppäydy, null-fallback) · delta-pvm-vahti (vanha mittaus → null; tuore → arvot+pvm:t) · PHV-portti (PRE/LAH → neutraali). **Rules emulaattoriajolla** (§5 — 4 uutta testiä, aja `firebase emulators:exec`). Live VP_v25 + Master_v16: D1-siltakortti → fyysinen fokus → fyysinen teemaharjoitus kalenteriin → sulku (a) tuoreella mittauksella: delta näkyy + `delta_mitattu` tallentuu historiaan, (b) ilman mittausta: subjektiivinen polku + "suunnittele mittaus" -CTA, (c) pre-PHV-pelaajalla: §28-banneri → historia-entry + kaari domeeni-ikonilla → silta ehdottaa seuraavan D1-teeman. Ohjelma-slot: aseta fokus ohjelmalla (tyyppi+phv_tila_alussa+lahtotaso tallentuvat) → sulku kopioi ohjelman historia-entryyn (annos–vaste-rivi). §28-kieli tarkistettu (ei "epäonnistui", ei moitetta). `npm test` + lint + selain-tarkistus deployatusta mainista. Rules v3.11 Console-deploy kirjattu. **Merge vasta kun Tero sanoo "live".**
