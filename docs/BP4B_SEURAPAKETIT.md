# BP4B — Seura- ja akatemiapakettien tuotteistus (v2)

> **Business-suunnittelu, BP4:n jatko.** v2 (2026-07-01): **hallintotaso poistettu.** Perustuu linjaukseen: seuroilla on jo Jopox/MyClub hallintoon → TalentMaster **ei kilpaile hallinnossa**, vaan tuottaa pelaajankehitys-/talenttiarvoa jota ne eivät voi. Jokainen taso johtaa kehitysarvolla; hallinto = integraatio, ei myyntiargumentti.
> Rakentuu: BP1 (WTP), BP4 (ansaintamalli + kansainvälinen hinnoittelu §8). Ominaisuudet: CLAUDE.md §8/§26/§28. **EI sijoitus-/hinnoitteluneuvonta.**

---

## 0. Kategoriapäätös — mikä TalentMaster ON ja EI OLE

**EI OLE seurahallintajärjestelmä.** Ei kilpaile Jopox/MyClub/Spond (kalenteri, jäsenmaksut, viestintä) kanssa — **integroituu niihin** (rosteri/kalenteri sisään). Hallinto on kypsä, ilmainen/halpa, vakiintunut → sillä kentällä pelaaminen on häviävä taistelu ja laimentaa positiointia.

**ON pelaajankehitys- ja talenttijärjestelmä.** Wedge: **testaus/mittaus → kypsyys- ja RAE-tietoinen kehitysanalyysi → suljettu silmukka (valmentaja + pelaaja + perhe) → kannettava urheilijan passi.** Tämä on se mitä MyClub/Jopox *eivät voi tehdä* — ja se on ainoa oikeutus vaihtaa/lisätä työkalu.

**Value metric = kehityssyvyys.** Ei pelaajamäärä, ei hallinto-ominaisuudet. Paketit erottuvat sen mukaan *kuinka syvälle kehitysanalyysi menee ja kuka saa insightin.*

---

## 1. "Mitä sillä saa?" — arvo jota Jopox/MyClub eivät anna

| Kysymys | Jopox / MyClub | TalentMaster |
|---|---|---|
| Milloin treeni on? | ✓ | (integroi) |
| Jäsenmaksut / hallinto | ✓ | (ei tee) |
| **Kehittyykö pelaaja?** | ✗ | ✓ testaus + indeksit + kehitysvauhti |
| **Missä pelaajan taso on vs. ikäluokka (kypsyyskorjattu)?** | ✗ | ✓ bio-ikä + RAE-korjaus |
| **Löydämmekö myöhäiskypsyjät joita muut hukkaavat?** | ✗ | ✓ herkkyysikkuna-signaalit |
| **Näkeekö lapsi oman kehityksensä turvallisesti + motivoituuko?** | ✗ (kalenteri) | ✓ kehityskortti + keräilykortit |
| **Saako lapsi henkilökohtaisen päivittäisen harjoitusohjelman?** | ✗ | ✓ **harjoitegeneraattori**: T-harjoite joka päivä + S-harjoite heikoimpaan osa-alueeseen |
| **Osaako vanhempi tukea ilman painetta?** | ✗ | ✓ "miten tukea" -kerros → vähentää dropoutia |
| **Seuraako kehityshistoria pelaajaa seurasta toiseen?** | ✗ | ✓ urheilijan digitaalinen passi |

**Perhe-appin ydin (vastaus "mitä sillä saa"):** MyClub kertoo *milloin* treeni on; TalentMaster kehittää *pelaajaa*. Lapsi näkee oman kehityksensä (turvallinen kehys §7.22, ei vertailua/rankingia), tekniikkaprofiilin ja keräilykortit → **motivaatio + pysyvyys**; vanhempi saa autonomiaa tukevan "miten tukea" -kerroksen → **vähentää painostusta ja dropoutia** (johtava dropout-syy, BP1 §4). Tämä on seuralle **retentioarvo**, ei kalenteritoisto.

### 🎯 Harjoitegeneraattori — perhe-appin moottori (nostettu erikseen)
Konkreettisin "mitä sillä saa" -vastaus: **jokainen lapsi saa henkilökohtaisen päivittäisen harjoitusohjelman.** `harjoitelogiikka_v4.js` (§A7/§14) tuottaa Tänään-tehtävät:
- **T-harjoite (tekniikka) joka päivä** — myös lepopäivinä (kevyt), rakentaa päivittäisen tavan (habit loop).
- **S-harjoite kohdistuu automaattisesti heikoimpaan FLEI-ketjuun** (kehon valmius) — eli harjoittelu osuu juuri siihen mitä *tämä* lapsi tarvitsee, ei geneeriseen ohjelmaan.
- **§7.22-turvallinen:** ei numeroita/vertailua lapselle; oppaissa selitetään miksi tehtävä näkyy ja miksi kannattaa tehdä.

**Miksi tämä on strateginen:** (1) MyClub/Jopox eivät tee mitään tällaista → selkeä erottautuja; (2) **päivittäinen käyttö** = vahvin retentiomoottori (lapsi avaa appin joka päivä, ei vain otteluviikonloppuna); (3) **vahva B2C Solo -koukku** — "henkilökohtainen valmentaja taskussa" myy perheelle suoraan; (4) datamoottori — kirjaukset ruokkivat kehitysseurantaa ja passia. Näkyy **jokaisessa tasossa** (Taso 1 → Enterprise) ja on Solo-tuotteen kärki.

---

## 2. Pakettitasot (B2B) — kehitys on lattia

### Adoptio-kerros (ilmainen / matala kynnys)
- **Solo B2C** (perhe suoraan 4,99 €/kk) — ei seuraa tarvita; **kärki = harjoitegeneraattori** ("henkilökohtainen valmentaja taskussa") + kehityskortti; PlayerCode-silta seuraan.
- **Seuran ilmainen pilotti** (määräaikainen, 1 ikäluokka) — land: seura kokeilee kehitysarvon, konvertoituu maksavaksi.

> **Entry-tason oikeutus (linjaus 2026-07-01):** matala kynnys ON hyvä — kunhan sen arvo on **kehityssitouttaminen** (harjoitegeneraattori + kehityskortti + turvallinen näkymä), EI hallinto. Näin saadaan laaja adoptio *ilman* että kilpaillaan Jopox/MyClubin kanssa hallinnossa.

---

### TASO 1 — **Kehitys** (maksullinen lattia — kehitys, ei hallinto)
*Kohde: kilpa-/kehittävät seurat. Lattia on jo sitä mitä Jopox/MyClub eivät tee.*

**Sisältö:**
- **Täysi kenttätestaus** (Testaus_v9): H-H-patteri, TKI-tekniikkakilpailu, FLEI (kehon valmius), kasvumittaus
- **Kehitysindeksit + pikakentät** (§26) + **kehitysvauhti/delta** (§29) — kehittyykö pelaaja, ei vain missä on
- **Valmentajan suljettu kehityssilmukka** (Master): testi → diagnoosi → resepti → seuranta
- **Pelaaja- + perhe-app + harjoitegeneraattori**: henkilökohtaiset päivittäiset Tänään-tehtävät (T joka päivä + S heikoimpaan ketjuun), kehityskortti, tekniikkaprofiili (turvallinen kehys), keräilykortit, "miten tukea" -kerros vanhemmalle — **päivittäisen käytön retentiomoottori**
- **GDPR rekisterinpitäjänä** — poistaa seuran juridisen taakan alaikäisten terveysdatasta (aito erottautuja vs. itse rakennettu)
- **Integraatio Jopox/MyClub-rosteriin/kalenteriin** (ei korvaa — täydentää)

**Hinta-ankkuri:** perusmaksu **~50–90 €/kk** + **per-player 2,5 €/kk** (Suomi). Perustelu: arvo ylittää selvästi hallintotyökalut (ne eivät tee mitään tästä). Maakerroin §8.

---

### TASO 2 — **Talentti / Akatemia** (premium)
*Kohde: akatemiat, talenttiohjelmat, sertifioidut seurat (EPPP Cat 2–3, NLZ, RJO). Korkein maksukyky (BP4 §8.2).*

**Sisältö = Taso 1 +:**
- **Biologinen ikä (PHV/Mirwald)** + kasvuseuranta + kuormarajoitin (§25)
- **RAE-korjaus** + **herkkyysikkuna-signaalit** (§28): Hidden Gem, X-Factor, kultaikkuna, tekninen varhaiskehitys — *löydä lahjakkuudet joita muut hukkaavat*
- **Syvänäkymä-analytiikka** (VP): TKI-histogrammi, per-laji eliittiviite, TSI, kohortti-valitsin, tavoitetaso
- **ADAR / pelihavainto** -kenttätyökalu (§15)
- **VAI+ valmentaja-analytiikka** + kalibraatiopaja + mentorointi (§19)
- **Head of Talent -raportointi** + Pelaajaraportti (tavoitteet + palaute)
- **Urheilijan digitaalinen passi** täysimääräisenä

**Hinta-ankkuri (premium, BP4 §8.4):** perusmaksu **~150–400 €/kk** + **per-player 4–12 €/kk** (Cat 1 / huippuakatemia yläpää) TAI kiinteä **500–2 000 €/v/joukkue**. ENG/DE/NL/ES akatemiat = yläpää.

---

### ENTERPRISE — **Liitto / Federation / Residenssi**
*Kohde: liitot, moniseura-organisaatiot, residenssiakatemiat.*

**Sisältö = Taso 2 +:** moniseura-aggregaatio + kansallinen kehityskuva + benchmark (anonyymi, n≥30) + longitudinaalikoonti (§30) + **API / white-label / integraatiot** (TASO/Catapult/Polar/Wyscout §20) + räätälöity onboarding + SLA.

**Hinta:** custom vuosilisenssi, **per-player-in-programme** (Catapult 180 $, PlayerData ~110 €/pelaaja -ankkurit). Perustajan liittorooli = uskottavuus.

---

## 3. Lisäosat (add-on)
| Lisäosa | Arvo | Hinta-idea |
|---|---|---|
| **ADAR Vision AI** | Automaattinen pelihavaintonarratiivi kuvasta | per-käyttö / kk-lisä |
| **Solo / passi -bundle** | Perheille B2C-taso seuran kautta | 4,99 €/kk (jaettu tulo) |
| **Integraatiot** (TASO, GPS Catapult/Polar) | Pelidata + kuorma yhdistyy | per-integraatio |
| **Kuorma + dropout-erottautuja** (K5: läsnäolo→kuorma) | Ainutlaatuinen retentioarvo | Taso 2 / add-on |

---

## 4. Pakettivertailu (myyntimatriisi)

| Ominaisuus | Kehitys | Talentti/Akatemia | Enterprise |
|---|:--:|:--:|:--:|
| Kenttätestaus (H-H/TKI/FLEI) | ✓ | ✓ | ✓ |
| Kehitysindeksit + kehitysvauhti | ✓ | ✓ | ✓ |
| Valmentajan kehityssilmukka | ✓ | ✓ | ✓ |
| Pelaaja + perhe -app (kehitys) | ✓ | ✓ | ✓ |
| **Harjoitegeneraattori (Tänään-tehtävät)** | ✓ | ✓ | ✓ |
| GDPR rekisterinpitäjänä | ✓ | ✓ | ✓ |
| Jopox/MyClub-integraatio | ✓ | ✓ | ✓ |
| Biologinen ikä (PHV) | — | ✓ | ✓ |
| RAE-korjaus + herkkyysikkunat | — | ✓ | ✓ |
| Syvänäkymä + VAI+ + kalibraatio | — | ✓ | ✓ |
| ADAR / pelihavainto | — | ✓ | ✓ |
| Digitaalinen passi (täysi) | osittain | ✓ | ✓ |
| Moniseura + benchmark + API | — | — | ✓ |
| **Per-player/kk (Suomi)** | 2,5 € | 4–12 € | in-programme |

---

## 5. Miksi tämä toimii (v2:n korjaus)
1. **Ei kilpaile hallinnossa** → ei häviä Jopox/MyClub-taistelua; integroituu, positiointi kirkas.
2. **Jokainen taso tuottaa arvoa jota inkumbentit eivät voi** → "mitä sillä saa" on aina selvä (testaus + kehitys + kypsyys + passi).
3. **Per-player = premium-vipu** (Taso 2 akatemia), ei grassroots-vero → ratkaisee BP4 §5 riskin.
4. **Perhe-app on kehityssilmukan päätepiste** (motivaatio + retentio), ei erillinen kalenteritoisto → vastaa "mitä sillä saa".
5. **Land-and-expand:** ilmainen pilotti → Taso 1 → Taso 2 kun akatemisoituu → laajeneva ARPU.
6. **Kansainvälinen kärki = Taso 2 + Enterprise** (ENG/DE/NL/ES akatemiat, ES-residenssit) — siellä maksukyky; erottaudu ilmaisesta PMA:sta RAE/bio-age/passi-arvolla.

---

## 6. Seuraavat askeleet
- **Validoi Taso 2 -hinta akatemialla** — korkein epävarmuus + tuotto (voin luonnostella akatemian pilottitarjouksen).
- **Päivitä `HINNOITTELU_LASKUTUS.md`** näillä kolmella tasolla (poista hallintotaso, kehitys = lattia).
- **BP5 tulomalli:** eriytä ARPU tasoittain (Kehitys / Talentti / Enterprise).
- **Tuotteessa:** `konfiguraatio/paketti`-kenttä (§11) → feature-gating tason mukaan; **Jopox/MyClub-rosteri-integraatio** = oma roadmap-kohta (rosteri/kalenteri sisään, ei kaksoissyöttöä).

---

### Liittyvät dokumentit
BP4 (ansaintamalli + kansainvälinen hinnoittelu §8) · BP1 (WTP §5–6) · BP5 (Financial Plan — eriytä ARPU tasoittain). Hinnasto: HINNOITTELU_LASKUTUS.md. Ominaisuudet: CLAUDE.md §8, §26, §28, §25.
