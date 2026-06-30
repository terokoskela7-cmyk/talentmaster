# VP-näkymän käytettävyys- ja data-audit (2026-06-29)

> Näkökulma: jalkapallodatan ymmärtäjä + selkeys toimenpiteitä varten. Saako VP nopeasti tarvittavan ymmärryksen
> joukkuepulssista ja syvänäkymän välilehdistä (Pelaajat · Tuki · Yhteenveto · Tavoitetaso), ja johtaako se toimenpiteeseen?
> Tarkastettu livenä: Pallo-Iirot P11 (H-H + 3 testitapahtumaa), signaalit, suppilo, kaikki 4 välilehteä. Tukee CLAUDE.md §19/§26/§28/§30/§34.

## 0. VP:n kaksi ydinkysymystä (mittari kaikelle)
1. **"Mikä joukkue tarvitsee huomiotani tällä viikolla?"** (triage)
2. **"Mitä konkreettisesti teen?"** (toimenpide)

Hyvä VP-näkymä vastaa näihin **minimivaivalla**. Arvioin jokaisen pinnan tätä vasten.

---

## 1. Kokonaisarvio

**Vahva toiminta-selkäranka on jo olemassa:** Signaalit (Tilanne) → Tuki-välilehti (valmis harjoitusryhmä) → "Luo harjoitustapahtuma".
VP pääsee "mikä on pielessä" → "tässä on ryhmä jonka treenaat" muutamalla klikkauksella. Tämä on aidosti hyvää
valmennus-ops-suunnittelua, ja kieli on jalkapallolukutaitoista (taso 1–5, taso-3-viite, Eerikkilä-normit, MyEWay-yhteensopiva).

**Suurin ongelma ei ole puute vaan päällekkäisyys + hierarkia:** sama tieto (tasojakauma + taso-3-viite) näkyy
**kahdella välilehdellä** (Yhteenveto ja Tavoitetaso), ja pilottidatalla puolet pinnoista on "tulossa/ei mitattu".
VP joutuu navigoimaan paljon, ja voi olla epävarma mistä katsoa ensin.

**Tiivis verdikti:** sisältö on oikea ja toimenpidekelpoinen; **selkeys kärsii redundanssista, tyhjästä tilasta ja
tasaisesta informaatiohierarkiasta.** Korjaukset ovat enimmäkseen konsolidointia ja priorisointia — ei uutta dataa.

---

## 2. Pinta kerrallaan

### 2.1 Tilanne (sisääntulo / viikkotriage)
**Mitä näkyy:** iso "Aloita tästä" -opas → signaalit → suostumussuppilo (71/0/0) → RAE-placeholder → joukkuepulssi (4 indeksiä).
- ✅ **Signaalit ovat erinomaisia ja toimenpidekelpoisia:** "Tekniikka alle normin (1.1) → tekniikkateema", "Kiihdytys alle normin (1.2) → kiihdytysblokki", "Talenttiydin (top-10) ka 2.2 alle normin → talent-ID-huoli", "0/43 testattu → ei voi arvioida luotettavasti", "2 valmentajaa ilman mentorointia → mentoroi". Jokaisella suora CTA. **Tämä vastaa molempiin ydinkysymyksiin.**
- ⚠️ **Opas vie kärkipaikan.** Kokenut VP joutuu skrollaamaan oppaan ohi päästäkseen triageen. "Piilota opas" on olemassa mutta opas on oletuksena auki.
- ⚠️ **Joukkuepulssin 4 indeksiä** (Kehon valmius/TKI/H-H/pelihavainto) — hyvä dashboard, mutta jää oppaan + signaalien alle; ei "yhdellä silmäyksellä" -asemassa.

### 2.2 Pelaajat-välilehti
**Mitä näkyy:** taulukko H-H | D1 | TEKNINEN (TSI-lähdemerkinnällä) | ADAR | PHV per pelaaja.
- ✅ Selkeä rosterinäkymä; lähdemerkintä (TSI/H-H) on hieno yksityiskohta.
- ⚠️ Vastaa kysymykseen "kuka", ei "mitä teen" — se on hakemisto, ei toimintapinta (ja se on OK, kunhan Tuki kantaa toiminnan).

### 2.3 Tuki-välilehti ⭐ (vahvin)
**Mitä näkyy:** kehityskohderyhmät — "sm_pallo-ryhmä (13)" pelaajat tarvejärjestyksessä + gap (Englund 15.31 +4.78 …), 📋 leikepöytä, "Odottaa kasvumittausta (15)", "Luo harjoitustapahtuma →".
- ✅ **Paras toimenpidepinta koko tuotteessa.** Valmis, priorisoitu harjoitusryhmä + suora tapahtuman luonti. Juuri tätä valmennuspäällikkö tarvitsee.
- 💡 Tämä ansaitsisi näkyvyyttä — moni VP ei ehkä löydä sitä, koska se on 2. välilehti eikä etusivun lupaus.

### 2.4 Yhteenveto-välilehti
**Mitä näkyy:** KPI (D1 1.3 / D2 1.1 / Hidden Gem 0) + 5D-radar (useimmiten "D3/D4/D5 tulossa") + **A1 tasojakauma 1–5** (Fyysinen: taso 1 = 79 %) + **A2 "Profiili testeittäin · taso-3-viite"** (Kiihdytys ka 1.2, 5m 1.2s …).
- ⚠️ **Päällekkäisyys Tavoitetason kanssa** (ks. §3.1) — A1/A2 = tasojakauma + taso-3, sama idea kuin Tavoitetaso-välilehdellä.
- ⚠️ **5D-radar on pilottidatalla lähes tyhjä** (vain D1/D2 mitattu) → vie kärkitilan vähällä arvolla.

### 2.5 Tavoitetaso-välilehti
**Mitä näkyy:** per-ominaisuus jakauma 1–5 + ≥3-osuus + taso-3/TKI≥60 + per-testi-radar + nostot (lähimpänä/potentiaali/Kehityskohde) + RAE/kattavuus/painopiste.
- ✅ Rikkain ja MyEWay-tunnistettavin; nostot + painopiste ohjaavat toimintaan; §28-neutraali kehys.
- ⚠️ Päällekkäisyys Yhteenvedon A1/A2:n kanssa.

---

## 3. Läpileikkaavat löydökset (priorisoitu)

### 3.1 🔴 Redundanssi: Yhteenveto A1/A2 ↔ Tavoitetaso
Sama tasojakauma + taso-3-viite kahdella välilehdellä. VP ei tiedä kumpi on "se oikea". **Toimenpide:** yksi koti
"missä olemme vs taso 3" -tiedolle. Suositus: **Tavoitetaso = se koti** (rikkain: radar + nostot + dual-scale), ja
**Yhteenveto kevennetään** "yhden silmäyksen tilannekuvaksi" (KPI + suunta + 1 painopiste + linkki Tavoitetasoon) —
ei toista tasojakaumaa. Poistaa päällekkäisyyden ja terävöittää molempien roolin.

### 3.2 🟠 Informaatiohierarkia tasainen — johda "yhdellä takeawaylla"
Jokainen pinta esittää paljon samanarvoisesti. **Toimenpide:** jokainen välilehti/kortti alkaa **yhdellä lauseella +
toimenpiteellä** ("Painopiste: tekniikka — luo tekniikkateema"), detalji "näytä lisää" -taakse. Sama kuoritekniikka jota
signaaleissa jo on — laajenna se välilehtiin.

### 3.3 🟠 Kaksi radaria sekoittaa pilottivaiheessa
5D-dimensioradar (mostly "tulossa") + per-testi-radar. **Toimenpide:** kun <3 dimensiota mitattu, **demoa 5D-radar**
(tai piilota) ja nosta per-testi-radar kärkeen — se on se jolla on dataa nyt. Kun D3–D5 kertyvät, 5D-radar palaa arvoonsa.

### 3.4 🟠 Tyhjä tila tuntuu keskeneräiseltä — käännä se datapoluksi
"D3/D4/D5 tulossa", "Suunnanmuutos ei mitattu", RAE "täyttyy rekisteröinnistä", "Hidden Gem 0". §29-rehellistä, mutta
puolityhjä ruutu viestii "tuote kesken" eikä "data keräämättä". **Toimenpide:** kehystä tyhjät tilat **seuraavaksi
kerättäväksi dataksi + CTA** ("Pelihavainnot puuttuvat → avaa ADAR-työkalu", "Suostumukset 0/71 → lähetä kutsut").
Sama datapolku-ajattelu kuin oppaassa, vietynä itse näkymiin.

### 3.5 🟡 Opas vie triagen kärkipaikan
**Toimenpide:** kun 4/5 opas-askelta tehty, opas **oletuksena piilossa** (kuittaus muistiin); pulssi + signaalit kärkeen.

### 3.6 🟢 Säilytettävät vahvuudet (älä riko)
Signaalit + CTA:t · Tuki-välilehden valmiit ryhmät + "Luo harjoitustapahtuma" · §28-neutraali kehys · taso-3/Eerikkilä-kieli ·
TSI-lähdemerkinnät · dual-scale (taso 3 / TKI≥60). Nämä ovat tuotteen ydinarvo.

---

## 4. Suositeltu terävämpi rakenne (VP:n polku)

```
TILANNE  →  "Mikä joukkue tarvitsee minua?"
  • Joukkuepulssi (4 indeksiä, ka+kattavuus+suunta) KÄRKEEN, opas piiloon oletuksena
  • Signaalit + CTA (jo hyvä)

SYVÄNÄKYMÄ (klikkaa joukkue)  →  "Mitä teen?"
  • Yhteenveto  = 1 silmäys: KPI + suunta + 1 painopiste + "näytä lisää"   (EI toista tasojakaumaa)
  • Tavoitetaso = TASO vs taso 3: radar + jakauma + nostot   (se "missä olemme" -koti)
  • Tuki        = TEE: valmiit ryhmät + Luo harjoitustapahtuma   (nosta esiin)
  • Pelaajat    = hakemisto: per-pelaaja-detalji
```

Periaate: **Tilanne kertoo MISSÄ tarttua · Tavoitetaso MITÄ kehittää · Tuki MITEN (ryhmä+tapahtuma) · Pelaajat KUKA.**
Neljä välilehteä, neljä eri kysymystä — ei kaksi vastaamassa samaan.

---

## 5. Toimenpiteet (toteutusjärjestys)

**P0 — selkeys, halpa (ei uutta dataa):**
1. Opas oletuksena piiloon kun 4/5 tehty → pulssi/signaalit kärkeen (§3.5).
2. Poista Yhteenvedon A1/A2 tasojakauma-päällekkäisyys → kevennä Yhteenveto "1 silmäys + linkki Tavoitetasoon" (§3.1).
3. Tyhjät tilat CTA:ksi (§3.4) — "ei mitattu" → "kerää tämä: [työkalu]".

**P1 — hierarkia + radar:**
4. Jokainen välilehti johtaa 1 takeawaylla + toimenpiteellä, detalji "näytä lisää" (§3.2).
5. <3 dim → demoa 5D-radar, nosta per-testi-radar (§3.3).
6. Nosta Tuki-välilehden löydettävyyttä (esim. painopiste-CTA linkittää suoraan Tukeen).

**P2 — myöhemmin (datariippuvainen):**
7. Kehitysvaihe-toggle aktivoituu kun PHV mitattu (Vaihe C, #65).
8. Longitudinaali (kehitysvauhti yli kausien) kun ≥2 mittausta/pelaaja.

**Mittari onnistumiselle:** uusi VP osaa ilman opastusta (a) nimetä viikon prioriteettijoukkueen Tilanteesta ja
(b) luoda sille harjoitustapahtuman 3 klikkauksessa. Jos tämä toteutuu, näkymä on selkeä.
