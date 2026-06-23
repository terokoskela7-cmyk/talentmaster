# Pelaajan kortti — visio & motivaatioarkkitehtuuri

> Scoping 2026-06-23 (Tero + arkkitehti). Pelaajan FIFA-tyylinen kortti = lapsen **arvokkain, motivoiva
> artefakti**. Tämä doc lukitsee vision, motivaatiomallin ja korttitaksonomian ennen toteutusta.
> Liittyy: CLAUDE.md §16 (pelaajan app) · §22 (XP/streak-kielto-säännöt) · §7.22 (lapsiturva) · §28 (kehitysikkunat/OVR-lattia) · §14 (profiiliarkkityypit) · §25 (PHV) · KOMMUNIKAATIOFLOW (Bola Siempre, Salzburg).
> Nykytoteutus: `TalentMaster_Pelaaja_v7.html` `naytaFcOverlay` + `TalentMaster_Kortti_Demo.html`.

---

## 1. VISIO

**Kortti ei ole arvosana vaan elävä matka, jota pelaaja kerää.** Se on lapsen identiteetti pelaajana —
kasvaa kun lapsi treenaa ja kehittyy, muuttuu kauden ja iän myötä. Ei tulostaulu, ei vertailu muihin.

**Ydinongelma jonka tämä ratkaisee:** jos kortti "avautuu" vasta valmentajan mittauksista (≥3 ulottuvuutta),
se voi jäädä kuukausiksi tyhjäksi/Starter-tilaan → lapsen arvokkain artefakti demotivoi. Mittaustahti ei ole
lapsen hallinnassa. **Ratkaisu: kortti kasvaa ensimmäisestä päivästä lapsen OMISTA teoista — kasvu irrotetaan
mittauksista.** Iso OVR rakentuu hitaasti taustalla, mutta se on vain yksi kortti kokoelmassa.

---

## 2. MOTIVAATIOARKKITEHTUURI (sisäinen motivaatio, ei extrinsic-painostus)

Suunnittelun linssi = **Deci & Ryan SDT** (autonomia · kyvykkyys · yhteenkuuluvuus) + **Dweck** (prosessikehu)
+ **Seligman PERMA** (positiiviset hetket). Salzburg-oppi: päivittäinen pakkosuorittaminen väsyttää → kevyt,
positiivinen, lapsen hallinnassa.

| SDT-tarve | Miten kortti täyttää |
|---|---|
| **Autonomia** | Lapsi valitsee mitä keräilyä tavoittelee; lepo on sallittua (lepopäivä-merkki) |
| **Kyvykkyys** | Tekniikkamerkit + henkilökohtaiset mestaruuspolut (oma ennätys, ei muihin verraten) |
| **Yhteenkuuluvuus** | Joukkuekortit, perhe-badge (vanhemman kehu), jaettava ylpeys |

### Anti-patternit — EI KOSKAAN (kovat kiellot, §22/§7.22)
Tulostaulut/rankingit · "menetit putken" / loss aversion · numeeriset XP-palkit lapselle · vertailu muihin
lapsiin · pakkosuorittaminen · gacha/maksu satunnaispalkinnoista. **XP tallennetaan vain AI-agentille
(§22), ei renderöidä lapselle.** Korttikasvu esitetään kosmeettisesti ja positiivisesti, ei mittarina.

---

## 3. KORTTITAKSONOMIA

**A. Tasokortti (pääkortti)** — Starter ⭐ → Sharp ⭐⭐ → Elite ⭐⭐⭐. Kasvaa datasta (5D), hidas.
Nykyportti: OVR avautuu ≥3 mitattua ulottuvuutta; U12 (leikkijä) ei näytä OVR-lukua (§16).

**B. Saavutuskortit** (tiheät pienet voitot, ansaitaan teoista): 1. treeni · 7pv liekki · syntymäpäivä
(on jo §16) · 1. mittaus · oma ennätys · kausikortti.

**C. Legenda-kortit** (harvinaiset, inspiroivat) — **arkkityyppi-polut, EI oikeita pelaajia** (IP-turvallinen
+ tieteellinen). Kuvaavat lapsen *omaa polkua*, ei vertaa:
- **Myöhäänkukkija** — Q4 / late-bloomer (RAE-tiede inspiraationa: "moni huippu kasvoi myöhään").
- **Maestro · Railgun · Shadowstep · Titan** — profiiliarkkityypit (§14), legendaariset versiot joita kohti kasvetaan.
- **Sisukas** — palasi vaikeasta jaksosta (ks. §5, harvinaisin).

**D. Erikoiskortit:** Piilohelmi (Hidden Gem) · kauden päätöskortti · pelipaikka-taidekortti · "Olin paikalla"
-tapahtumakortit (Tekniikkakisa 2026).

---

## 4. KOLME MOOTTORIA

**1) Putki = liekki joka EI sammu, vaan lepää.** Väliin jäänyt päivä ≠ "menetit putken" vaan **lepopäivä**
(liekki himmenee hiillokseksi, ei nollaudu). Lapsi voi ansaita **lepopäivä-merkin**. Nokkeluus: **lepo on
metodisesti oikein** (kuormanhallinta/PHV-suoja §25) → mekaniikka opettaa palautumista. Paluu juhlitaan
("Hienoa että palasit!"), ei hävetä. Liekki koristaa korttia (7pv hehku · 14pv animoitu reuna). Säilyttää
§22:n 4-tilamallin, poistaa loss aversionin kokonaan.

**2) Osallistuminen = passi + leimat.** Jokainen tekniikkakisa/testipäivä/joukkuetreeni = leima passiin
**tuloksesta riippumatta**. Osallistuminen itsessään on palkinto. "Olin paikalla" -tapahtumakortit.

**3) Tekniikkamerkit = henkilökohtainen mestaruus.** Merkki per taito (kuljetus/syöttö/ponnauttelu),
ansaitaan omista toistoista / omasta ennätyksestä — **ei muihin verraten**. Bola Siempre -merkit
("molemmat jalat", "100 kosketusta"). Pronssi→hopea→kulta omalla matkalla.

---

## 5. KAKSI "WOW"-MEKANIIKKAA

**A) Harvinaisin kortti palkitsee SINNIKKYYDEN, ei lahjakkuuden.** "Sisukas"-legenda on vaikein saada —
ansaitaan palaamalla tauon jälkeen, jatkamalla vaikean jakson yli. Koodaa Dweckin kasvun ajattelutavan
suoraan keräilyyn: arvokkainta on yrittäminen, ei synnynnäinen taso. **Tämä on koko tuotteen filosofia
keräilykorttina.**

**B) "Pack opening" -paljastushetket ilman gachaa.** Uuden ulottuvuuden/merkin avautuminen = pieni
pakettienavaus-hetki (keräilypelin dopamiini), **ansaittu tekemisellä — ei sattumalla/maksulla**. Kortti
herää eloon kosmeettisesti kun lapsi treenaa, jo ennen ensimmäistä mittausta.

---

## 6. PITKÄN ODOTUKSEN RATKAISU (yhteenveto)

Lapsi ei odota "kortin avautumista" — hän kerää matkaa päivästä yksi: **liekki, leimat, merkit, legendat
kertyvät hänen omista teoistaan, eivät mittaustahdista.** Jokainen täyttyvä 5D-ulottuvuus on oma pieni
juhlahetki ("⚡ Voima-osasi heräsi!"). OVR-luku on myöhäinen, toissijainen paljastus (rakentaja 13+) — pieni
lapsi ei odota numeroa, koska sitä ei näytetä hänelle. Pitkä mittausväli ei tuota tyhjää/demotivoivaa korttia.

---

## 7. NYKYTOTEUTUS — v3 on kanoninen visuaalinen pohja

**Kanoniset kortti-mockupit (säilytetty repoon `docs/mockups/`, 2026-06-23):**
- **`fifa_kortti_v3.html`** — pääkortin kanoninen design (tilat + tasot + matka/unelma/tavoite/traits + takakortti). Alla.
- **`TalentMaster_Kortit.html`** — "Keräilykortit"-näkymä (Legenda + Keräily) → **olemassa oleva pohja kokoelmakerrokselle** (§7 "uutta"-osio); katsottava kun rakennetaan korttiseinä/legendat.
- **`TalentMaster_Kortti_Demo.html`** — tasokorttidemo (Starter/Sharp/Elite).

Logiikka tuotannossa: `naytaFcOverlay` (Pelaaja_v7). v3 sisältää JO:
- **3 tasoa täysillä paleteilla:** Starter (sininen) · Sharp (kulta) · Elite (platina) — kehys, hehku, shimmer.
- **Korttitilat:** U13 "Rakentuu" (ei pelipaikkaa → "Monipuolinen", vain D2 mitattu, D1=PHV-kasvu, D3/D5 "Seura avaa") · Sharp U14+ (pelipaikka näkyy) · Elite U16 (täysi 5D) · **Syntymäpäivä** (konfetti/ribbon) · **takakortti** ("Miksi 79?" matka+tuki edellä).
- **MATKA-hero** (start→nyt→seuraava, delta) — *co-equal OVR:n kanssa*.
- **UNELMA/idoli-strippi** (motivaatiomoottori) · **MINUN TAVOITTEENI** (autonomia, SDT).
- **Traits = merkit jo kortilla:** Tekniikkamestari · "8 pv putki" (streak!) · Piilohelmi · Varhaiskehittäjä · Synttärisankari.
- **Paljastusanimaatiot:** stat reveal-flip · tier-up spark burst · synttärikonfetti (= pack-opening-henki jo osin).
- **Kovat säännöt (v3-footer):** ei pelipaikkaa U13 · matka = hero · D3/D5-lukot "seura avaa" (ei lapsen puute) · PHV positiivisesti · **ei XP-palkkia, ei leaderboardia, ei menetyskehystä.**

### Mitä TÄMÄ visio lisää v3:n PÄÄLLE (uutta)
v3 = yksi **elävä kortti**. Tämä visio lisää **kokoelmakerroksen** sen ympärille:
- **Erilliset keräilykortit** (saavutus/legenda/erikois) + **kokoelmanäkymä ("korttiseinä")** — v3:n traits ovat
  merkkejä kortilla; uutta on ne *omina kerättävinä kortteina* + seinä jolla niitä selaa.
- **Liekki-lepo-mekaniikka + lepopäivä-merkki** (putki ei sammu, lepää — §4).
- **Tekniikkamerkkien mestaruuspolut** (pronssi→hopea→kulta per taito, ansaintaehdot).
- **Legenda-arkkityypit** (Myöhäänkukkija/Sisukas) omina kortteina (v3:ssa "Piilohelmi/Varhaiskehittäjä" ovat traits).
- **"Sisukas = harvinaisin = sinnikkyys"** (§5A).

### Avoin päätös — idoli/unelma-nimet
v3:n unelma-strippi käyttää **oikeita pelaajanimiä** (Bellingham, De Bruyne, Modrić). Visio-§3 ehdotti
**arkkityyppi-polkuja** (IP-turvallinen). **Päätettävä:** pidetäänkö oikeat idolinimet (motivoiva, yleinen
lasten sovelluksissa — mutta nimi/IP-/likeness-harkinta) vai siirrytäänkö arkkityyppeihin (Myöhäänkukkija/Maestro).
Suositus: idoli = lapsen *oma valinta* (hän valitsee idolinsa) → ei TalentMasterin attribuoima → pienempi IP-riski;
legenda-KORTIT (ansaitut) = arkkityyppejä. Vahvistettava ennen toteutusta.

---

## 8. VAIHEISTUS (ehdotus)

1. **Kokoelmanäkymä + saavutuskortit** (1. treeni, 7pv liekki, synttäri, 1. mittaus) — tiheät pienet voitot heti.
2. **Liekki-lepo-mekaniikka + lepopäivä-merkki** (poistaa loss aversionin, §22-yhteensopiva).
3. **Tekniikkamerkit** (per-taito mestaruuspolku, sidos tekniikkakisaan/Bola Siempre).
4. **Legenda-kortit** (arkkityyppi-polut, Myöhäänkukkija/Sisukas — RAE/Dweck-sidos).
5. **Paljastushetket** (pack-opening-animaatio ulottuvuuden/merkin avautuessa).

**Verifiointi-invariantit (jokaiseen vaiheeseen):** §7.22 (ei lukuja/vertailua/tasoja pelaajalle) ·
§22 (ei XP-palkkeja/loss aversionia; streak positiivinen) · §16 ikävaihe (leikkijä yksinkertaisin, ei OVR-lukua) ·
§28 (PHV-suoja, OVR-lattia) · Carbon §5 · §17.

## 9. IDOLI & LEGENDA-LINJAUS (päätös 2026-06-23)

### Idoli / unelma-strippi = lapsen OMA valinta
Kortin "Unelma"-strippi = lapsen **itse valitsema** idoli (kuratoitu tunnettujen pelaajien lista + "oma"-vaihtoehto).
**TalentMaster EI attribuoi** ("olet kuin X"). Peruste: (1) autonomia (SDT) — lapsen oma sankari motivoi enemmän kuin
annettu; (2) pienempi IP-/likeness-riski — lapsen oma ilmaisu, ei TalentMasterin endorsementti/luonnehdinta.
Display-only, vaihdettavissa, vapaaehtoinen. **Korvaa v3:n auto-attribuoinnin** (Bellingham/De Bruyne/Modrić).
Jos lista → kuratoitu (turva, ei vapaa tekstikenttä alaikäisten sovelluksessa).

### Legenda-kortit = ansaitut arkkityypit (EI oikeita nimiä, IP-turvallinen)
Harvinaisia kerättäviä kortteja jotka kuvaavat lapsen OMAA kehitystarinaa. Kolme luokkaa:

**A. Polku-legendat — MITEN kehityt** (§14-profiilit + RAE):
- **Maestro** (tekniikka) · **Railgun** (räjähtävyys/nopeus) · **Shadowstep** (ketteryys/kuljetus) ·
  **Titan** (fysiikka/voima) · **Myöhäänkukkija** (Q4 / late bloomer, RAE OR 2.80 — "moni huippu kasvoi myöhään").
- Ansainta: oman arkkityypin virstanpylväs (oma ennätys / pikakenttäsignaali, esim. `signaali`, `tki_*`, `d1_taso`),
  **ei vertailu muihin**.

**B. Luonne-legendat — harvinaisimmat, palkitsevat SINNIKKYYDEN** (Dweck/prosessi):
- **Sisukas** (HARVINAISIN, koko tuotteen filosofiakortti) — palasi tauon jälkeen / jatkoi vaikean jakson yli.
- **Piilohelmi** (Hidden Gem -signaali) · **Varhaiskehittäjä** (tekniikkamitali U8–12, `tekninen_varhaiskehitys` §28).
- Ansainta: **prosessista ja sinnikkyydestä, ei tasosta**.

**C. Kausilegenda** — kauden päätöskortti, yksi per kausi (kokoelma kasvaa vuosien myötä → retentio + nostalgia).

**Invariantit:** legendat palkitsevat *prosessin ja matkan*, ei sijoitusta · ansainta pikakentistä/teoista
(`rae_kvartaali`, `tekninen_varhaiskehitys`, `signaali`, streak, aktiivisuus), ei rankingista · paljastus
positiivisena pack-opening-hetkenä · lapsi voi kerätä **useita** (Maestro JA Sisukas) · **arvostetuin = Sisukas**
(sinnikkyys > lahjakkuus) = tuotteen filosofia keräilykorttina. Polku-legendat sidotaan §14-profiiliarkkityyppeihin
(yhtenäinen kieli muun tuotteen kanssa).

> **Status:** visio + idoli/legenda-linjaus lukittu. Toteutus vaiheittain mockup→komento→verify kun työjonoon valitaan.
