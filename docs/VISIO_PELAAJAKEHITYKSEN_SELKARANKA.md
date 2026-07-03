# Visio: VP:n pelaajakehityksen selkäranka — lista → kortti → raportti → pelipaikka/pelidata

> Lähde: co-design 2026-07-03 (Claude + Tero), pelaaja-modaalin redesignin (PR #76) jälkeen. Tämä on **north-star / arkkitehtuurivisio**, ei toteutusbrief — vaihe-briefit johdetaan tästä. Rajaus: VP_v25 (staff-facing → §7.22 ei koske). §26 pikakentät.

## 0. Strateginen konteksti — Palloliiton talenttiohjelma (2026-07-03)
**IDP-kortti on esitelty Palloliiton Head of Talentille, joka piti siitä.** Tavoite: kehittää IDP-kortti osaksi **Palloliiton kansallista talenttiohjelmaa** (Tero = Palloliiton kansallisen ohjelman johtaja, §1). Tämä nostaa IDP-kortin pilottityökalusta **kansalliseksi standardiehdokkaaksi** ja ohjaa suunnittelupäätöksiä:

- **Metodologia-credibiliteetti = ei-neuvoteltava.** IDP nojaa jo Palloliitto-yhteensopivaan pohjaan (MyE.Way PHV-pariteetti §25, Eerikkilä-normit FINAL2024 §26, tekniikkakilpailu/TKI §23, RAE-korjaus §28). **Älä poikkea näistä** — kansallinen uskottavuus rakentuu tälle.
- **Standardointi + skaalautuvuus.** Jos IDP:stä tulee kansallinen, sen on toimittava **kaikilla seuroilla** (ei vain 8 pilottia) yhtenäisellä rakenteella → IDP-tavoiterakenne, fokus-taksonomia ja mittarit standardoituina (ei seurakohtaisia poikkeamia).
- **Palloliitto-tason koonti (§11 `palloliitto/ohjelmat`).** IDP-data koostettavissa kansallisen ohjelman näkyviin (suostumus + GDPR §33 B4, alaikäiset). Rakenne on jo datamallissa.
- **Reiluus kansallisen ohjelman arvona.** RAE (Q1–Q4), underdog, late-developer (§28) — IDP nostaa nämä esiin (suojattavat/myöhäiskehittäjät). Tämä resonoi kansallisen ohjelman tasa-arvotavoitteiden kanssa → **pidä RAE/underdog näkyvinä IDP:ssä.**
- **Rajainvarianti säilyy (§5.5).** "Kenttäharjoitus on valmentajan — TM diagnosoi + ohjaa + seuraa." Kansallinen työkalu ei korvaa valmentajaa vaan yhtenäistää kehityksen kielen ja seurannan.
- **Demo-valmius.** IDP-kortti on **pitch-artefakti** — pidä se esittelykelpoisena (selkeä, metodologisesti perusteltu, ei keskeneräisiä placeholdereita näkyvissä demossa). V4–V5 vahvistavat tarinaa (raportti + pelidata).
- **Pitkä tähtäin — API/MCP (§21).** Palloliitolla on jo MCP-server; TM rakentaa oman. IDP voi olla **kansallisen ohjelman rajapinta** (IDP-data virtaa seura ↔ Palloliitto). Suunnittele IDP-datamalli tämä mielessä (viety/koostettava rakenne, ei UI-lukittu).

> Käytännön ohje briefeille: jokainen IDP-vaihe (V1–V5) tehdään niin että se **kestää kansallisen ohjelman tarkastelun** — metodologia perusteltu, rakenne standardoitu, RAE/reiluus näkyvissä, demo-siisti. Isot päätökset (fokus-taksonomia, IDP-tavoiterakenne) kannattaa validoida Palloliitto-linjaa vasten ennen lukitusta.

## 1. Periaate
Nykyään VP:n Pelaajat-lista on **passiivinen tuloslista** ja per-pelaaja-modaali erillinen. Tavoite: **yksi ohjaava selkäranka**, jossa jokainen kerros porautuu seuraavaan ja **ohjaa toimintaan** (IDP), ei vain näytä lukuja. Data on jo suurelta osin pikakentissä (§26) — sitä ei hyödynnetä.

## 2. Selkäranka (5 kerrosta)
```
① Pelaajat-lista (IDP-työjono)   → KUKA kaipaa huomiota + MIKÄ fokus + IDP-elinkaari
      ↓ rivi auki / avaa kortti
② Pelaajakortti (porautuminen)   → identiteetti + OVR + 5D; ulottuvuus → testi → detalji
      ↓ kytkös
③ Pelaajaraportti (output)       → IDP-tavoitteet + fokus + signaalit muodostavat raportin (§37)
      ↓ kun pelipaikka tiedossa
④ Pelipaikka (gate)              → aktivoi pelipaikkakohtaisen analyysin
      ↓ TASO-tuonti (§20)
⑤ Pelidata / KPI (position-aware)→ ottelu-KPI:t pelipaikan mukaan → syöttävät korttiin + IDP:hen
```

## 3. Kytkökset (uudet, tämän session lisäykset)

### 3.1 Lista/kortti ↔ Pelaajaraportti (§37 MDT_RAPORTTI_SPEC)
IDP-prosessin **ulostulo on raportti**. Kortin/listan IDP-fokus + tavoitteet + signaalit **virtaavat raporttiin** (ei erillistä syöttöä): valmentaja kirjaa tavoitteet (Master), VP näkee read-only (`_renderMDTProfiili`), kortti/lista näyttää saman IDP:n. Yksi IDP-totuus, kolme näkymää. Kortin "Avaa raportti →" ja raportin "IDP-fokus" -osio kytkevät.

### 3.2 Pelipaikka → pelidata → position-aware KPI (§20 TASO)
- **Gate:** pelipaikkakohtainen ottelu-analyysi aktivoituu vasta kun `pelipaikka`/`positio` on asetettu (muuten "aseta pelipaikka → avaa pelidata").
- **Tuonti:** `tasoHaeSeuranOttelut` (deployattu §20) → `pelaajat/{id}/pelidata/{otteluId}` (minuutit, laukaukset, passit, arvosana).
- **Position-KPI:** pelipaikka määrää mitkä KPI:t merkityksellisiä — hyökkääjä: laukaukset/maalit/xG-tyyppinen · keskikenttä: passiprosentti/haltuunotot · puolustaja: kaksinkamppailut/katkot · maalivahti: torjunnat. → pikakentät `pelidata_viimeisin` + position-profiili.
- **Syöttö takaisin:** position-KPI:t → **kortin peli-ulottuvuus (D4 Peliäly / ottelusuoritus)** + **IDP:hen pelipaikkakohtaiset tavoitteet** (esim. laitapuolustaja: "keskitystarkkuus"). Näin IDP ei ole vain testipohjainen vaan myös pelisuorituspohjainen.

## 4. Vaiheistus (matala riski → korkea arvo ensin)
- **V1 — Lista rikastus** (nopea, lue pikakentistä): tarkka kehitysfokus (`hh/tki_kehityskohde`) + signaali + IDP-tila-sarake; suodattimet IDP-elinkaareen. *Ei uutta logiikkaa.*
- **V2 — IDP-ehdotusmoottori:** rivi-expandi → datasta johdettu tavoite (kohde-aika + kesto + perustelu: heikoin osa-alue + normigap + kultaikkuna) + IDP-jonon auto-täyttö.
- **V3 — IDP-elinkaari:** luo/hyväksy/seuraa (`idp_kausi`), kytkös pelaajakorttiin.
- **V4 — Raporttilinkitys (§3.1):** IDP/kortti → Pelaajaraportti; yksi IDP-totuus kolmessa näkymässä.
- **V5 — Pelipaikka-gate + pelidata (§3.2):** pelipaikka aktivoi TASO-tuonnin → position-KPI → kortti/IDP.
- **V6 — Palloliitto-tason koonti (kansallinen):** kansallinen IDP/talentti-aggregaatti (`palloliitto/ohjelmat` §11), suostumus + GDPR §33 B4 (alaikäiset). Aktivoituu kun IDP-kortti on kansallisessa käytössä (§0). Data seura ↔ Palloliitto (API/MCP §21).
- **IDP-KORTTI MAAILMANLUOKKAAN (läpileikkaava laatutavoite):** IDP-kortista tehdään **kansainvälisesti korkealaatuinen** (§0 Palloliitto-ohjelma + kv-vertailukelpoinen). Oma kanoninen doc: **`docs/IDP_KORTTI_MAAILMANLUOKKA.md`** — laatupilarit, kv-benchmark, kortin rakenne, i18n/vienti. Tämä ei ole yksi vaihe vaan **laaturima kaikille IDP-vaiheille** (V2–V6).

## 5. Reuse / invariantit
- ♻️ Pikakentät §26 (kehityskohde/signaali/phv/rae/delta/idp_tila) · FC-kortti §36 · §29-detailit · TASO §20 (`pelidata`) · Pelaajaraportti §37 · kohortti/suodattimet.
- 🆕 Uutta: IDP-ehdotusmoottori (V2) · IDP-elinkaaren kirjoitus (V3) · position-KPI-mäppäys (V5).
- Invariantit: arviointilogiikka ennallaan · §26 ei alikokoelmakyselyjä listalla (position-KPI pikakentäksi) · §5 tokenit · §7.22 EI koske (VP-facing, luvut sallittu) · TASO-tuonti valmentajan käynnistämä (§20).

## 5.5 IDP-kortti (IDP_Kortti_v4) — nykytila + kohtaamispinta (audit 2026-07-03)
Olemassa oleva IDP-kortti on selkärangan **määränpää** (③–⑤ asuvat täällä). Sisältää jo:
- **Kehitys / Harjoite -välilehdet** · **DVI™ — kehitysvauhti** (`dvi`/`dvilvl`, kehitysnopeus) · **Kehitys ↑/↓/→**.
- **Tavoitelause ("Minun kauteni"):** pelaajan oma tavoite (`omaTavoiteInput`, "mitä haluat tällä kaudella parantaa?") — muokattava, tallennettava. → **V2:n ehdotusmoottori esitäyttää tämän** (datasta johdettu tavoite).
- **Pelipaikka-valinta:** CD · FB/WB · CDM · CAM · W · ST (`positio`). → **V5:n gate on jo tässä.**
- **"Pelipaikkakohtainen kehitys" — placeholder "🔜 Tulossa":** teknis-taktinen integraatio peliin, hallintaketjujen siirto pelipaikkakohtaisiin tilanteisiin (esim. laitahyökkääjän 1v1 laidalla). → **V5:n pelidata/position-KPI täyttää juuri tämän placeholderin.**
- **70/30-integraatioperiaate:** 70 % vahvistaa identiteettiä (vahvuudet), 30 % täyttää aukon — ei eristettyä heikkousharjoittelua (neurofysiologinen peruste). → IDP-ehdotus (V2) noudattaa tätä: fokus 30 %, vahvuudet 70 %.
- **Valmentajan palaute** · **Harjoite + "Miksi tämä harjoite" + palautumisaika + Alkurutiini/Aktivointi**.
- **Harjoitettavuuskartoitus-esiehto** ("Tee harjoitettavuuskartoitus ensin").
- Datakentät: `positio`, `dvi/dvilvl`, `flei_viimeisin/pvm`, `d*`-dimensiot, `syntymaaika`, `pituus_cm`, `laji`, joukkue.

**Rajainvarianti (tärkeä):** *"Kenttäharjoitus on täysin valmentajan — TalentMaster ei koske siihen."* TM **diagnosoi + ohjaa + seuraa** (fokus, tavoite, DVI, palaute), valmentaja **omistaa itse kenttäsession**. IDP-ehdotusmoottori (V2) ehdottaa TAVOITTEEN + MITTARIN + PERUSTELUN, ei valmiita kenttäharjoituksia.

**Yhteenveto — vision ja kortin kohtaaminen:**
| Vaihe | Vision | IDP-kortin valmis koukku |
|---|---|---|
| V2 | IDP-ehdotusmoottori | tavoitelause-kenttä (`omaTavoiteInput`) esitäytettäväksi |
| V3 | IDP-elinkaari | tavoite tallennus + DVI-seuranta jo olemassa |
| V4 | Raporttilinkitys | valmentajan palaute + tavoite → §37-raportti |
| V5 | Pelipaikka + pelidata | pelipaikka-valinta + "Pelipaikkakohtainen kehitys 🔜 Tulossa" -placeholder |

→ Vision ei keksi uutta rakennetta: se **täyttää IDP-kortin olemassa olevat placeholderit** oikealla datalla ja kytkee listan/kortin niihin.

## 6. Aloitus
**V1 (lista rikastus)** ensin — matala riski, lista muuttuu ohjaavaksi heti, ei uutta datamallia. Sen brief seuraavaksi. V4–V5 (raportti + pelidata) ovat isompia ja odottavat pelipaikka-datan + TASO-tuonnin kypsyyttä, mutta ovat nyt kirjattu selkärankaan → jokainen vaihe rakentaa samaan suuntaan.
