# Kortti-katalogi — datavetoinen rekisteri

> Vaihe 1+ keräilykorttien kanoninen rekisteri. Periaate (KORTTI_VISIO §10): **datavetoinen, ei kovakoodattu
> UI:hin** — jokainen kortti = ansaintaehto + lähde-pikakenttä + ikävaihe-sääntö. Ansainta **pikakentistä/teoista**,
> EI vertailusta muihin (§7.22) eikä numeerisesta kynnysgrindistä lapselle näkyvänä (§22).
> Liittyy: KORTTI_VISIO.md (visio/§10), CLAUDE.md §16 (pelaaja-app, ikävaiheet), §22 (streak/XP-säännöt),
> §26 (pikakentät), §28 (kehitysikkunat/Hidden Gem), `naytaFcOverlay` (Pelaaja_v7), `TalentMaster_Kortit.html`.

---

## Läpileikkaavat säännöt
- **Ansainta = oma tekeminen / oma kehitys**, ei sijoitus tai vertailu kavereihin.
- **Ikävaihe (`_laskeStage`):** leikkijä (U12) yksinkertaisin, EI OVR-lukua · rakentaja (U13–15) · showcase (U16+).
  Saavutus-/merkki-/legendakortit toimivat KAIKISSA ikävaiheissa (positiivisia); vain pääkortin OVR-luku on ikägeitattu.
- **Paljastus** = positiivinen pack-opening-hetki (ei gacha/maksu).
- **Tyhjä/lukittu** = "Treeni avaa tämän" / "Tulossa" — ei lapsen puute.
- **Data-tietoinen:** kortti aktivoituu vain kun lähde-pikakenttä on olemassa.

---

## VAIHE 0 — Tasokortti (pääkortti, RAKENNETTU v3 / `naytaFcOverlay`)
| id | nimi | ansaintaehto | lähde | ikävaihe |
|---|---|---|---|---|
| `tier_starter` | ⭐ Starter | <3 mitattua ulottuvuutta (rakentuu) | 5D pikakentät | kaikki; U12 ei OVR-lukua |
| `tier_sharp` | ⭐⭐ Sharp | ≥3 mitattua, OVR < 75 | OVR (RAE+§28-lattia) | rakentaja+ |
| `tier_elite` | ⭐⭐⭐ Elite | 5 mitattua, OVR ≥ 75 | OVR | rakentaja+ |

---

## VAIHE 1 — Matkamerkit (oma matka; tiheät pienet voitot, ratkaisee pitkän odotuksen) — ✅ RAKENNETTU (`rMinaKokoelma`, Pelaaja_v7)

### Saavutuskortit
| id | nimi | ansaintaehto | lähde-pikakenttä/data |
|---|---|---|---|
| `ach_ensitreeni` | Ensimmäinen treeni | 1. omatoiminen kirjaus tehty | `kirjaukset` (≥1) |
| `ach_liekki7` | 7 päivän liekki | streak ≥ 7 pv | `streak` (§22-tila 7–13) |
| `ach_liekki14` | 14 päivän liekki | streak ≥ 14 pv | `streak` (§22-tila 14+) |
| `ach_synttari` | Synttärisankari | syntymäpäivä (on jo §16-konfetti → korttina) | `syntymaaika` |
| `ach_ekamittaus` | Ensimmäinen mittaus | 1. testitulos ilmaantuu | `tki_viimeisin` / `hh_viimeisin` / `flei_viimeisin` |
| `ach_omaennatys` | Oma ennätys | oma tulos parani (PB) | `tk_kokonaistulos_edellinen` vs uusi / `hh_taso_edellinen` |

### Tekniikkamerkit (oma mestaruuspolku per laji — pronssi→hopea→kulta, EI vertailu)
| id | nimi | ansaintaehto | lähde |
|---|---|---|---|
| `merkki_kuljetus` | Kuljetusmerkki | osallistui → pronssi · paransi → hopea · `tkLajiViite` erinomainen → kulta | `tk_lajit_viimeisin.kuljetus_laukaus_s` + `tkLajiViite` |
| `merkki_syotto` | Syöttömerkki | (sama logiikka) | `tk_lajit_viimeisin.syotto_s` + viite |
| `merkki_pujottelu` | Pujottelumerkki | (sama) | `tk_lajit_viimeisin.pujottelu_s` + viite |
| `merkki_ponnauttelu` | Ponnautusmerkki | (sama) | `tk_lajit_viimeisin.ponnauttelu_s` + viite |

> Merkkitaso = **oma suhde lajin viitetasoon (`tkLajiViite`) + oma parannus** — ei naapuriin verraten. §7.22: lapselle
> "kulta/hopea/pronssi omalla matkalla", ei percentiiliä/sijoitusta.

### Liekki-lepo-mekaniikka
| id | nimi | mekaniikka | lähde |
|---|---|---|---|
| `liekki_tila` | Liekki | hiillos→liekki→rovio (§22 4-tila); väliin jäänyt päivä = **lepopäivä**, liekki himmenee, EI nollu | `streak` |
| `merkki_lepopaiva` | Lepopäivä-merkki | ansaittu/käytettävä lepo (kuormanhallinta §25); paluu juhlitaan | `streak`-logiikka |

---

## VAIHE 1.5 — Ennätykset (PB per testi) — "voita oma itsesi" — ✅ RAKENNETTU (pikakenttä `ennatykset`)

**§7.22:n puhtain mekaniikka: nollavertailu muihin, vain oma kehitys.** Jokaisella tehdyllä testillä oma
ennätyskortti, joka syttyy/päivittyy kun pelaaja ylittää OMAN aiemman tuloksensa. Suuri tasoittaja
(hidas+nopea saavat saman dopamiinin) + ratkaisee pitkän odotuksen (jokainen paraneva uusintamittaus = voitto).

| id-malli | nimi | ansaintaehto | lähde |
|---|---|---|---|
| `ennatys_<testi>` | esim. "30 m ennätys", "Kevennyshyppy-ennätys" | uusi PB vs oma aiempi (suunta huomioiden) | `ennatykset.<testi>` |

Kattavuus = 17 raakatestiä (D1: lin5/10/30m, cmj, sj, mas, kasirata, sm_juoksu, sm_pallo · TK-lajit ·
FLEI-ketjut). Vain tehdyt testit näkyvät (data-tietoinen). Ikävaihe-gating (leikkijä harvempi/yksinkertaisempi).

### Reunaehdot (PAKOLLISET — luotettavuus)
1. **Suunta per testi:** pienempi=parempi (juoksu/ketteryys/TK-ajat) vs suurempi=parempi (cmj/mas/pituuspotku).
   Lähde: `TK_LAJIT_META.kaanteinen` + Eerikkilä-suunnat. Väärä suunta → valhe-"ennätys".
2. **Alustaherkkyys (§22 `ALUSTAHERKAT_TESTIT`):** PB-vertailu **vain saman alustan sisällä** (juoksu/ketteryys).
   Tallenna `alusta` PB:hen; eri alusta → ei lasketa ennätykseksi. **Tärkein vartija.**
3. **PHV-neutraalius (§28):** kortti EI KOSKAAN näytä "huononit" — vain juhlii ylityksen, muuten neutraali
   (ei menetyskehystä §22). Kasvupyrähdyksen tilapäinen plateau on normaalia.
4. **Kohina-kynnys:** vaadi mielekäs parannus (mittausvirheen yli) ettei trivial-PB laukea joka kerta.

### Arkkitehtuuri (§26)
Uusi **`ennatykset`-pikakenttä** pelaajadokumenttiin: `{ <testi>: { paras, pvm, alusta } }`. **Päivitetään
kirjoitushetkellä** (Excel_Tuonti / recalc / Testaus_v9 jo laskevat tulokset → sama kohta tunnistaa "uusi PB"
suunta+alusta huomioiden, asettaa `uusi_ennatys`-lipun pack-openia varten). Kokoelmanäkymä renderöi tästä
pikakentästä — **ei alikokoelmakyselyä renderissä.** Täydentää tekniikkamerkkejä: merkki = suhde **viitetasoon**;
ennätys = **puhdas itsevertailu** (ei mitään ulkoista vertailua).

---

## VAIHE 2 — Legendat (harvinaiset, oma matka; arkkityypit, EI oikeita nimiä)
| id | nimi | ansaintaehto | lähde |
|---|---|---|---|
| `leg_maestro` | Maestro | tekniikka-arkkityypin virstanpylväs | `tki_*` / `signaali` / profiili (§14) |
| `leg_railgun` | Railgun | räjähtävyys/nopeus-virstanpylväs (post-PHV) | `d1_taso` / FVP / profiili |
| `leg_shadowstep` | Shadowstep | ketteryys/kuljetus-virstanpylväs | TSI / `tki_*` |
| `leg_titan` | Titan | fysiikka/voima-virstanpylväs (post-PHV) | `d1_taso` / CMJ |
| `leg_myohaankukkija` | Myöhäänkukkija | Q4 + jatkuva tekeminen (RAE OR 2.80) | `rae_kvartaali='Q4'` + aktiivisuus |
| `leg_piilohelmi` | Piilohelmi | Hidden Gem -signaali | `signaali` / `laskeHiddenGem` |
| `leg_varhaiskehittaja` | Varhaiskehittäjä | tekniikkamitali U8–12 | `tekninen_varhaiskehitys` (§28) |
| `leg_sisukas` | **Sisukas (HARVINAISIN)** | palasi tauon jälkeen / jatkoi vaikean jakson yli | streak-comeback / pitkä jatkuvuus |

> **Arvostetuin = Sisukas** (sinnikkyys > lahjakkuus) = tuotteen filosofia keräilykorttina (Dweck).

---

## VAIHE 3 — Tähtikokoelma (aspiraatio; `Kortit.html`-pohja)
| id | nimi | ansaintaehto | huom |
|---|---|---|---|
| `set_maajoukkue_*` | Maajoukkue-teemasetti | **virstanpylväät/tekeminen** (EI paljas numeerinen kynnys) | kortit **arkkityyppejä/rooleja**, ei nimettyjä urheilijoita (IP) |
| `set_kausi_*` | Kauden tähdet -setti | osallistuminen + virstanpylväät | teemasetti |

---

## VAIHE 4 — Paljastus + kausi
| id | nimi | ansaintaehto | lähde |
|---|---|---|---|
| `kausilegenda_<vuosi>` | Kausilegenda | kauden päätös, 1/kausi | kausilogiikka (retentio/nostalgia) |
| (mekaniikka) | Pack-opening-paljastus | uuden kortin/merkin avautuessa animaatio | — |

---

## Toteutusperiaate (Code)
Katalogi = **dataobjekti** (esim. `KORTTI_KATALOGI = [{id, nimi, tyyppi, vaihe, ansainta(p)→bool|taso, lahde, ikavaihe}]`),
jota kokoelmanäkymä renderöi. Ansaintafunktio lukee **pikakentät** (§26) → ei alikokoelmakyselyitä renderissä
(paitsi mahdollinen kerran-luku kuten tavoitteet). Lukittu kortti = siisti "Treeni avaa" -tila. Uusi kortti = pack-open.
**Vaihe 1 toteutetaan ensin** (saavutukset + tekniikkamerkit + liekki/lepo) — loput vaiheittain.

> **Tila 2026-06-24:** ✅ Vaihe 0 (tasokortti) · ✅ Vaihe 1 (matkamerkit) · ✅ Vaihe 1.5 (Ennätykset). **Jäljellä:** Vaihe 2 legendat · Vaihe 3 tähtikokoelma · Vaihe 4 paljastus+kausi.
