# ADAR for Coaches™ — Erillistuotteen scoping (PRD-pohja)

> Scoping-sessio 2026-06-15. Lähtö: STRATEGIA.md §1 BISNESMALLI "ADAR™ (standalone)" -päätösmuistio.
> Tämä dokumentti = tuotteen runko ja päätökset. Tekninen toteutus omiin Code-komentoihin askeleittain.
> Liittyy: CLAUDE.md §15 (Pikakortti), §26 (pikakentät), §28 (D4-kehitysikkunat), §11 (Firestore + Solo-silta),
> `docs/ADAR_JATKOKEHITYS_ANALYYSI.md` (asset-inventaario + Vaihe 0–4).

---

## 1. POSITIO

**ADAR for Coaches™** — standalone peliäly-/havainnointityökalu yksittäiselle valmentajalle ilman koko Club-tuotetta.
Mittaa *havaitse → päätä → toimi → arvioi* -ketjua (D4) — sitä mitä fyysinen testaus (H-H, FLEI, TKI) ei tavoita.
Kasvaa nopeasta kenttähavainnosta täyteen **valmentajan kehitysloopiin** (havainnointi → psykologia → kalibrointi).

Erottuva arvo: ainoa kevyt, mobiili, offline-toimiva D4-instrumentti jossa on **ADAR Vision** (kuva → AI-narratiivi)
ja **ikävaihekohtainen tulkinta** (§28). Ei vaadi seuran hallintoa, lisenssiä tai raskasta käyttöönottoa.

---

## 2. KOHDERYHMÄ

| Prioriteetti | Segmentti | Hankintamalli |
|---|---|---|
| **Kärki** | Yksittäiset valmentajat + valmennuspäälliköt | Self-serve / product-led |
| Sekundääri | Valmentajakoulutus (liitot, koulutusorganisaatiot) | Myyntivetoinen, myöhempi kanava |

Valmennuspäällikkö istuu usein seurassa → tuotteen on **valinnaisesti** voitava linkittyä seuraan myöhemmin
(Solo-tyylinen silta, §6), mutta perusarvo toimii ilman seuraa.

---

## 3. TUOTEMALLI — KAKSI TILAA, YKSI JAKOLINJA

Tuotteen ydinoivallus: **suostumus- ja maksulinja ovat sama viiva.** Tämä ratkaisee aktivointikitkan,
GDPR:n ja monetisoinnin kerralla.

| | **Tila A — Pikahavainto** | **Tila B — Seuranta** |
|---|---|---|
| Mitä | Nopea kenttähuomio, ei pysyvää pelaajaprofiilia ajan yli (valmentajan "muistilappu") | Pelaajakohtainen pitkittäisseuranta — D4-kehitys ajan yli (ADARin varsinainen arvo, §28) |
| Pelaajaidentiteetti | Pseudonyymi / paikallinen, ei sidottu tunnistettavaan lapseen pysyvästi | Pysyvä identiteetti → alaikäisen henkilötieto |
| Suostumus | Ei tarvita | Huoltajan suostumus (kevyt, email-vahvistus) |
| Hinta | **Ilmainen** | **Maksullinen** |

Käyttäjäpolku: valmentaja aloittaa heti Tilassa A (kokeilee, näkee arvon) → "ylentää" pelaajan seurattavaksi
(Tila B) kevyellä huoltajan suostumuksella kun haluaa pitkittäisseurannan tai jakamisen.

---

## 4. INKREMENTAALINEN POLKU (tavoite = täysi loop, askel kerrallaan)

| Askel | Sisältö | Tila / pohja |
|---|---|---|
| **1 (MVP)** | Havainnointi-ydin standalonena: Pikakortti + ADAR Vision + valmentajan oma kirjautuminen + kevyt pelaajamalli (Tila A ilmainen, Tila B suostumus+maksu) | Suurin osa tuotannossa (`ADAR_Pikakortti.html`); puuttuu standalone-identiteetti + suostumusflow + maksu |
| **2** | + D3-psykologia (5 ulottuvuutta → ADAR-vaiheet) | `D3_Kyselylomake.html` proto, `saveToPlayer()` stub (~3–4 h kytkentä) |
| **3** | + CoachProfile + kalibrointiharjoitus + kaksoisvalidointi = täysi valmentajakehitysloop | `ADAR_Master.html` proto (~30 h+), vahva koulutus-/liittokanavalle |

---

## 5. IDENTITEETTI & GDPR-MALLI

**Tila A (ilmainen):** pseudonyymit pelaajakortit — nimikirjaimet/pelinumero + ikä/syntymävuosi, ei nimeä.
Ei pysyvää linkitystä tunnistettavaan lapseen → minimaalinen GDPR-jalanjälki, ei suostumusta.

**Tila B (maksullinen):** nimetty/seurattava pelaaja vaatii **huoltajan suostumuksen** (lainmukainen peruste alaikäisen
datalle). Toteutus voi nojata kevennettyyn Club-suostumusflowhun (`vahvistaSuostumus`-CF, §13) tai Solo-siltaan (§6).

### ⚠️ Avoimet lakikysymykset (EI ratkaistu — vaatii tietosuoja-/lakiasiantuntijan, ei tämän dokumentin)
1. **Rekisterinpitäjä (controller) ilman seuraa:** kuka on controller — valmentaja, hänen seuransa, vai TalentMaster?
   Tämä on määriteltävä ToS:ssa ja DPA:ssa ennen julkaisua.
2. **Lainmukainen peruste:** riittääkö huoltajan suostumus, ja kuka sen kerää/säilyttää standalone-kontekstissa.
3. **Alaikäisten data + AI Vision:** kuvien (alaikäinen) tallennus + GPT-4o-narratiivi → tietosuojavaikutusten arviointi (DPIA).
4. **Retention + oikeus tulla unohdetuksi:** liittyy CLAUDE.md §33 B4 -työhön.

> Tuotesuunnittelun runko (A/B-jako) on oikea; lainmukaisuus pitää varmentaa erikseen ennen maksullisen Tila B:n julkaisua.

---

## 6. HINNOITTELU (hypoteesi, validoitava)

Malli: **freemium, jossa maksumuuri = suostumus/seuranta-linja.**

| Taso | Sisältö | Hinta (lähtöhypoteesi) |
|---|---|---|
| Ilmainen | Tila A: pikahavainnot, ei suostumusta, ei pitkittäisprofiilia | 0 € |
| Valmentaja | Tila B: suostutut seuratut pelaajat + pitkittäinen D4 + (Askel 2) D3 | ~9–12 €/kk/valmentaja |
| Tiimi / valmennuspäällikkö | Useamman valmentajan seatit / tiimipaketti | seat-hinta tai kiinteä niputus, korkeampi ACV |

Ankkuri: Solo 4,99 €/kk (yksi pelaaja); valmentaja hallitsee montaa pelaajaa → korkeampi arvo. Vuosihinta lisämahdollisuus.
Product-led: ilmainen leviää seuran sisällä, maksu lukitsee arvon.

---

## 7. ARKKITEHTUURI — TEKNINEN RUNKO (luonnos, ei lukittu)

Nykyinen ADAR-data on **seurasidottu**: `seurat/{seuraId}/pelaajat/{pid}/havainnot/` (§11/§15). Standalone-valmentajalla
ei ole seuraa → tarvitaan **valmentajaomisteinen tietomalli**. Kaksi vaihtoehtoa arvioitavaksi toteutusvaiheessa:

- **(a) Valmentajatenant:** `valmentajat/{coachUid}/pelaajat/{pid}/havainnot/` — valmentaja omistaa pelaajakortit.
  Lähinnä nykyistä ADAR-logiikkaa (vain juuripolku vaihtuu); pikakentät (§26) pelaajakorttiin kuten nyt.
- **(b) Solo-tyylinen litteä + silta:** pelaaja `players/{playerId}` (seuraId:null), PlayerCode-silta (§6) → ADAR valuu
  pelaajan profiiliin. Vahvin GDPR-asema (pelaaja omistaa datan), mutta vaatii pelaajan/huoltajan adoption.

Suositus: **Tila A = (a) kevyt valmentajatenant** (nopein MVP, pseudonyymit), **Tila B:n "ylennys" voi linkittää (b)-siltaan**
kun seuranta/jakaminen halutaan. Päätetään Askel 1 -toteutuksen alussa.

Säilyy ennallaan: ADAR Vision (kuva → Storage → aiProxy GPT-4o, §15), pikakenttälogiikka (`paivitaAdarPikakentat`-replika §26),
bundler-rakenne (§15), §28 ikävaihekohtaiset tulkintakynnykset (toimii ilman muuta TM-dataa — ADAR on itsessään
ikävaihe-ankkuroitu, ei tarvitse PHV:tä/fyysistä dataa tulkintaan).

### Mitä standalone-ADAR NÄYTTÄÄ ilman muuta TM-kontekstia
D4-havainnot + ikävaihekohtainen tulkinta (§28) + (Askel 2) D3-psykologiaprofiili. **Ei** RAE-korjattua kokonais-OVR:ää
eikä fyysistä triangulaatiota (ei H-H/FLEI/PHV) — ne ovat Club-tuotteen lisäarvo. Tämä on tietoinen rajaus, ei puute:
ADAR for Coaches myy peliäly-/havainnointikerroksen, ei koko 5D-arviointia.

---

## 8. MITÄ EI TEHDÄ (scope guard)

- Ei korvata `ADAR_Pikakortti.html`:ää — standalone rakentuu sen päälle (eri juuripolku + auth).
- Ei rakenneta maksullista Tila B:tä ennen kuin lakikysymykset (§5) on tarkistettu.
- Ei tuoda fyysistä testausta / RAE-OVR:ää standaloneen (Club-tuotteen erottava arvo).
- Ei aloiteta Askel 3:a (täysi loop, ~30 h) ennen kuin Askel 1 validoi maksuhalukkuuden.

---

## 9. SEURAAVAT ASKELEET

1. **Lakitarkistus (§5)** — controller + lainmukainen peruste + DPIA AI Visionille. Estää maksullisen Tila B:n.
2. **Askel 1 tekninen scope** — valmentajatenant-tietomalli (§7a) + auth/onboarding + Tila A/B-jako. Oma Code-komento.
3. **Hinnoittelun validointi (§6)** — 3–5 pilottivalmentajaa, maksuhalukkuus.
4. STRATEGIA.md §1 -muistio voidaan päivittää viittaamaan tähän dokumenttiin kun runko hyväksytty.
