# D3 kalibraatio — kolmen näkökulman vertailu (spec)

> Scoping 2026-06-17. Päätös (Tero): **malli A** — VP-arvio erillinen kalibraatiokerros, EI sulaudu `d3_taso`-keskiarvoon.
> Jatkaa §C D3:a (pelaaja + valmentaja). Liittyy: §C (D3-kysely) · §19 (VP Kalibraatiopaja/mentorointi) · §2 (bias-tarkistus) · §7.22.
> Edellytys: merkintä+flag-muutos (itsearvio→trianguloitu + valmentaja-flag) tehty ensin.

---

## 1. TAVOITE

**Kolme näkökulmaa samaan pelaajaan → kuilu = signaali.** Pelaaja (itsetuntemus) · valmentaja (päivittäinen havainto) · VP (kokonaiskuva, vähemmän päivittäistä biasia). Arvo ei ole kolmas numero vaan **vertailu**:
- Pelaaja korkea, aikuiset matala → **itsetuntemuskuilu** (kehityskeskustelu pelaajan kanssa).
- Valmentaja korkea, VP matala → **valmentajan kalibraatio** (näkeekö valmentaja realistisesti — sama biaksen tarkistus kuin RAE; VP:n mentorointityökalu).
- Kaikki linjassa → vahva, luotettava D3.

VP:n ydintyö: kalibrointi + valmentajan mentorointi. Tämä on aito tuoteominaisuus, ei lisäkenttä.

---

## 2. MALLI A — VP erillinen kalibraatiokerros

- **`d3_taso` = aikuisarvioiden ka, valmentaja ensisijainen** (kuten §C). **VP-arvio EI sulaudu `d3_taso`:on** — koska VP arvioi **valikoiden** (talenttiohjelma / kalibraationäyte, ei kaikkia 200:aa) → keskiarvoistus vääristäisi vertailtavuuden.
- VP-arvio = **kalibraatiomerkki + vertailunäkymä**, ei talentti-pisteen osa.
- `d3Varmuus(lahteet)` (merkintä+flag-passista, toteutettu lib:issä) — **kolme tilaa:** `'itsearvio'` (vain pelaaja) · `'valmentaja'` (vain valmentaja) · `'trianguloitu'` (pelaaja+valmentaja). VP-arvio lisää kalibraatiosignaalin erikseen, **ei muuta `d3Varmuus`-tasoa eikä `d3_taso`:a** (malli A). (Mahdollinen jatko: oma merkki kun VP mukana, esim. 'kalibroitu' — päätetään komento 2:ssa.)

---

## 3. DATA

```
d3_viimeisin.pisteet[dim] = { pelaaja: N, valmentaja: N, vp: N, avg: M }
  // avg = valmentaja (+pelaaja) ka — VP EI mukana avg:ssa (malli A)
d3_taso = avg-arvojen ka (aikuisvetoinen)
d3_vp_pvm, lahteet[]  // 'pelaaja'|'valmentaja'|'vp'
```
VP:n arvio tallennetaan `pisteet[dim].vp` erikseen. Ei muuta `d3_taso`-laskentaa.

---

## 4. UI

- **VP-arviointilomake** (VP-puoli): sama 5-dim Likert kuin §C, valikoiden (talenttiohjelma / kalibraationäyte). Per pelaaja, VP:n syvänäkymästä/pelaajamodaalista.
- **Kolmen näkökulman vertailunäkymä** (VP + valmentaja Master): per dimensio **pelaaja / valmentaja / VP rinnakkain** + **kuilu korostettuna** (esim. ero >1.5 → ⚠ kalibraatiomerkki). Kytkös VP Kalibraatiopajaan/mentorointiin.
- **Kuilu-signaali Kotiin/raporttiin:** "Valmentajan ja VP:n arvio eroaa N pelaajalla → kalibraatio" (VP) · "Arviosi eroaa VP:n näkemyksestä" (valmentaja, mentorointihenkinen).

---

## 5. RULES + RAJAUS

- **Rules:** VP-roolit (`vp`/`urheilutoimenjohtaja`/`seurasihteeri` + SA) kirjoittavat `pisteet[dim].vp` + `d3_vp_pvm`. Valmentaja/pelaaja-clauset ennallaan.
- **§7.22:** pelaajan näkymä ennallaan — kuilua/aikuisarvioita EI näytetä lapselle paineena. Pelaaja näkee vain oman reflektionsa.
- Pikakentät, teema, §6. Ei gatea (kuka tahansa kolmesta voi arvioida itsenäisesti).

---

## 6. SEKVENSSI

1. **Merkintä+flag** (itsearvio→trianguloitu + valmentaja-flag) — jonossa, tehdään ensin.
2. **Tämä (VP-kalibraatio):** VP-lomake + 3-näkökulman vertailu + kuilu-signaali + Rules. Oma komento.
