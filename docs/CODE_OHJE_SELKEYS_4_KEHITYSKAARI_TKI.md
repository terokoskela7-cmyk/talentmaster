# CODE_OHJE — Selkeys 4: Kehityskaari — järjestys + TKI-divergenssin selitys

**Tyyppi:** näyttö (render-ydin) · **Kohde:** `lib/tm_kehityskaari.js` (Trendi Vaihe 2, kutsutaan VP + Master +
Pelaaja). **Base:** `main`. **Pieni PR.** **Design-referenssi:** artefakti `tm-pelaajakortti-selkeys` (periaate 00).
**Erillinen Selkeys 1–3:sta** — koskee Kehityskaari-libiä, ei tekniikkaprofiilia.

## Tausta (Teron havainto, kuva 3)
Kehityskaari sekoittaa **aggregaatit yksittäisiin testeihin**, ja näyttää **TKI:n laskun rinnalla Tekniikka yht:n
nousun** ilman selitystä — mikä näyttää ristiriitaiselta valmentajalle. Esimerkki: Tekniikka yht. 144.3→131 ↑
(raaka-ajat paranivat), mutta TKI 31→20 ↓. Tämä ei ole virhe — se on **§34 §3.2:n "KAKSI DELTAA" -ilmiö**:
raaka-suoritus parani, mutta ikävaatimus koveni enemmän → indeksi laski. **Pitää avata valmentajalle.**

## Kanoni (CLAUDE.md §34 §3.2 — EHDOTON)
> abs-delta (kehittyikö suoritus) JA TKI-delta (riittikö vauhti ikävaatimukseen) näytetään AINA erikseen.
> **TKI-laskua EI saa näyttää punaisena jos abs-delta on positiivinen** (pelaaja kehittyy, vaatimus koveni enemmän).
> **Pelaajalle TKI-laskua ei näytetä lainkaan** (§16/§7.22).

## Työ

### 4.1 — Järjestys: aggregaatit erilleen yksittäisistä testeistä
Nyt `tmKaariRenderFull` listaa avaimet sekaisin (kuva 3: TKI ja "Tekniikka yht." ovat Syötön ja Kuljetus-laukauksen
välissä). Ryhmittele rivit:
1. **Fyysiset** (30 m, ketteryys, …) — `hh`-avaimet.
2. **Tekniikka per laji** (ponnauttelu, syöttö, kuljetus-laukaus, pujottelu) — TK-per-laji-avaimet.
3. **— hiusviiva —**
4. **Aggregaatit** omana lohkonaan: **Tekniikka yht.** (`kokonaistulos`) + **TKI** (`tki`) — nämä ovat koosteita,
   eivät yksittäisiä testejä.
5. Per-D taso-trendi (D1/D2) ennallaan alimpana.

Toteuta järjestämällä `tmKaariMitatutAvaimet`-tulos ryhmiin (fyysinen → tekniikka-laji → aggregaatit) ennen
rivien renderöintiä. `AGGREGAATIT = { kokonaistulos:1, tki:1 }`.

### 4.2 — TKI-divergenssin selitys + ei-punainen (KAKSI DELTAA)
Kun **TKI laskee (`tki` suunta down) MUTTA Tekniikka yht. paranee (`kokonaistulos` suunta up / parani)**:
- **Älä renderöi TKI-riviä punaisella ↓** (§34 §3.2). Käytä neutraalia/amber-sävyä (ei `#C94040`).
- **Lisää selittävä ⓘ-rivi** aggregaattilohkon alle:
  > ⓘ Tekniikka-ajat paranivat, mutta TKI laski — **ikävaatimus kovenee** (~`X` s/v). Kehitys on
  > oikeansuuntaista; pysyäkseen indeksin tahdissa sen pitää olla vielä nopeampaa.
- `X` = `tkVaadittuVuosivauhti(ika, sp, taso)` jos saatavilla (render voi injektoida sen kuten tasoFns; jos ei
  saatavilla, jätä "(~s/v)" pois ja näytä pelkkä selitys ilman lukua).
- Jos TKI ja Tekniikka yht. liikkuvat **samaan suuntaan**, ei selitysriviä (ei ristiriitaa avattavaa).

### 4.3 — Pelaaja (§7.22/§16): TKI-laskua EI näytetä
`tmKaariRenderPelaaja` näyttää jo vain parannukset → TKI:n lasku ei tule mukaan. **Varmista** ettei aggregaatti-
järjestys tai selitysrivi vuoda Pelaaja-versioon: selitys + TKI-rivi ovat **vain `tmKaariRenderFull`** (valmentaja/VP).
Pelaajalle ei TKI-lukua, ei laskua, ei vaatimus-kieltä.

## Reunaehdot
- **Ei laskentamuutosta, ei skeemaa.** Suunnat/nopeudet luetaan jo lasketuista (`tmKaariSuunta`/`PIENEMPI_PAREMPI`).
- **§34 §3.2 säilyy:** TKI-lasku ei punaisena kun raaka parani; pelaajalle ei näytetä.
- **Design-lukko + molemmat teemat.** Hiusviiva aggregaattien erottimeksi, ⓘ-rivi ink3.
- **`?v=`-bump** (`tm_kehityskaari.js` muuttuu → VP + Master + Pelaaja).

## Definition of Done
- **L1:** aggregaatit (Tekniikka yht. + TKI) omassa lohkossaan hiusviivan alla, ei yksittäisten testien seassa;
  TKI-divergenssin ⓘ-selitysrivi kun `tki`↓ & `kokonaistulos`↑; TKI-rivi ei punainen siinä tapauksessa;
  selitys vain `tmKaariRenderFull` (ei Pelaaja).
- **L2 (vitest):** järjestys (aggregaatit viimeisenä); divergenssi-selitys näkyy kun tki↓+kokonaistulos↑ ja
  puuttuu kun samaan suuntaan; `tmKaariRenderPelaaja` ei sisällä TKI-laskua/selitystä. ~876+ vihreä.
- **L3 (elävä, molemmat teemat, esim. Oliver/Sibbo jolla tki+kokonaistulos-historia):** Kehityskaari näyttää
  fyysiset → tekniikka-laji → aggregaatit (Tekniikka yht. + TKI) erillään; TKI↓ + Tekniikka yht↑ → selitysrivi
  näkyy, TKI ei punaisena; Pelaaja-näkymä ei näytä TKI-laskua.
- Pieni PR. Lataa VP/Master/Pelaaja uudelleen deployn jälkeen.
