# Code-brief — I2: IDP-silta näkyväksi + Arviointi-selkeytys + valmentajan IDP-omistajuus + opastus

> **Lähde:** `docs/CODE_TASK_PELIHAVAINTO_INTEGROINTI_A.md` §2.4/§8 (I2) + Teron päätökset 2026-07-12.
> Neljä kytkettyä työtä: **(A)** jaa Arviointi-rivit **lähteen mukaan** + selkeytä otsikko; **(B)** tee **IDP-silta näkyväksi**;
> **(C)** anna **valmentajalle täysi IDP-hallinta OMALLE joukkueelleen** (VP vahvistaa, ei portinvartija); **(D)** **opastus**
> (in-app info-napit + oppaan päivitys). Design lukittu: **yhdistelmä** (tumma premium + mittaripalkit + tilastopalkki-coverage +
> segmentoitu 1–5 + oranssi IDP-silta), ref `arviointi_yhdistelma.html`.
> Kohde: **VP_v25** · **Master_v16** · **lib/tm_idp.js** · **docs/OPAS_VP_JA_VALMENTAJA.md** (+ pelikirja-HTML).
> **Ei uutta arviointidatamallia. Ei Firestore-sääntömuutosta** (§C: oikeudet ovat jo olemassa). **Ei I3:a.**
> Rivi­viitteet = lähtötila (main, I1 live), eivät lukittuja.

## 0. Konteksti — auditointilöydöt (miksi)
`_vpArviointiHTML(p)` (VP_v25 ~4090) renderöi Arviointi-välilehden. Ongelmat:
- **Otsikko hämää:** "Palloliitto" (kehysmerkki ~4147) + "Pääteema" (valikon otsikko ~4149) ovat **eri elementtejä** jotka
  CSS-versaalit liimaavat yhdeksi. Valikon "(5)" = **kohdemäärä** (`t.n`, taksonomia ~129). Sirut "D2 8/18" (~4154) = arvioitu/yhteensä.
- **Rivit sekaisin:** sama teema listaa 🟢 mitatut (lukittu), 🔵 havaitut (1–5 napit), 👁 pelihavainto (D4, himmeä) samassa
  listassa. Prioriteetti `_arvo()` (~4126) = mitattu > havaittu > adar.
- **Nimitörmäys:** teemaryhmä "Pallonhallinta" JA kohde "Pallonhallinta" (`ball_control`).
- **IDP-silta piilossa:** pelihavainto ≤2 → IDP-kandidaatti automaattisesti (`idpKeraaKandidaatit`, tm_idp.js ~41–46), mutta ei
  näkyvää tekoa eikä lähdemerkintää (`idpRakennaTavoite` romahduttaa lahteen 'moottori'/'valmentaja', hukkaa pvm:n).
- **Valmentajan IDP-näkymä + oikeudet:** Master_v16:ssa ei ole tavoitekorttia (vain ehdotus + inbox `idp.approved`/`idp.rejected`
  ~3599 + kalenterin "IDP-seuranta" ~7317). **Mutta oikeudet ovat jo olemassa** — ks. §C.1.

## 0.1 Lukittu (Tero 2026-07-12)
- **Ei muuteta tallennuslogiikkaa eikä arviointidatamallia.** `_vpTallennaHavaittu` (~5343) säilyy (autosave `arviointi_havaittu`).
- **Asteikot ennallaan:** havaittu/mitattu 1–5; pelihavainto (ADAR) 1–3 → D4 (I1-kaanon).
- **Design = yhdistelmä** (ref `arviointi_yhdistelma.html`). Tumma → ei teemamuutosta.
- **Valmentaja OMISTAA oman joukkueensa pelaajat** → täysi IDP-hallinta (luo/muokkaa/aktivoi) omalle joukkueelle. Vastuullaan
  kehityskeskustelut. **VP on mukana vahvistamassa** valmentajan näkemyksiä (kalibrointi/valvonta), EI portinvartija.
- **Omistajuus rajattu omaan joukkueeseen:** muiden joukkueiden pelaajat = read-only (jos näkyvät). Rajaus **UI-tasolla** (kuten havainnot).

---

## A · ARVIOINTI-VÄLILEHDEN SELKEYTYS (VP_v25)

### A1. Otsikko + navigointi
- **Kehysmerkki omalle rivilleen:** "Arviointikehys · **Palloliitto**" pillinä. Meta oikealle: "57 kohdetta · 5 dimensiota".
- **Teema-valikko erikseen:** label "Teema" + `<select>`; optioteksti `dim · kategoria` + **"N kohdetta"** (~4149-4150).
- **Coverage = tilastopalkki** (~4154): 5 solua D1–D5, "arvioitu/yhteensä", valittu korostettu. Selite kerran.

### A2. Rivit lähderyhmiin (ydinmuutos)
1. **🟢 MITATTU · TESTEISTÄ** (`mitattavissa:true` & arvo): lukittu numero + 🔒 + testiviite + mittaripalkki. Ei 1–5-nappeja
   (`_mitattu()` ~4105). Testaamaton → hillitty "ei testiä".
2. **🔵 HAVAITTU · ARVIOI 1–5** (`mitattavissa:false`): mittaripalkki + segmentoitu 1–5 + numero. Klik = autosave. N/A hillitty.
3. **👁 PELIHAVAINNOSTA · JOHDETTU ADAR:STA** (D4 + `tmAdarHavaittu`, ~4117): himmeä PELIH. + havainnon pvm/tilanne +
   mittaripalkki (pinkki) + segmentoitu 1–5 yliajoon (klik → `lahde:'silma'`). Näytä vain jos D4-pelihavaintodataa.
- **Nimitörmäys pois:** teeman nimi vain valikossa. **Autosave-indikaattori** paneelin alle.

### A3. Komponentit (yhdistelmä-design)
- **Mittaripalkki** per arvo (väri = lähde). **Segmentoitu 1–5** (valittu = lähteen väri + hehku; `<button>`+`aria-pressed`, ≥30px).
  Sama tallennus, uusi ulkoasu. **Legenda** alas.

---

## B · IDP-SILTA NÄKYVÄKSI (VP_v25 + Master_v16 + lib/tm_idp.js)

### B1. "＋ IDP-tavoite" -silta arviointiriviltä
- **Missä:** rivillä arvo **≤2** (havaittu + pelihavainto). Oranssi pilleri.
- **Teko:** luo tavoite-ehdotus + avaa Kehitys-välilehden. Handler `window._vpTeeIdpTavoiteHavainnosta(pid, avain)` (VP_v25 ~4247);
  Masterissa vastaava valmentajalle. Havaittu-lähde: `idpKohdeKandidaatti(p, avain, opts)` (tm_idp.js ~114, muuta `lahde`
  parametroitavaksi). Pelihavainto-lähde: lue arvo `tmAdarHavaittu(p.adar_viimeisin)`:sta + `lahde:'pelihavainto'` + `lahdePvm`.
  `idpRakennaTavoite(...)` → `p._idpTavoite` → `_vpKausitavoiteReRender()` + `_jspVaihda(4)`.
- **Kirjoitus:** VP:llä kaikki pelaajat; **valmentajalla oman joukkueen pelaajat** (ks. §C) → voi tallentaa + aktivoida suoraan.

### B2. Säilytä alkuperä moottorissa (lahde + pvm)
- `idpKeraaKandidaatit` (~33–51): kanna **`pvm`** kandidaattiin. `idpRakennaTavoite` (~225,234,249): älä romahduta `fokus.lahde`:a;
  lisää `fokus.lahdeTieto = { tyyppi, pvm }`. Lisää `idp_lahde`-pikakenttä (`idpPikakentat` ~365).

### B3. Lähdemerkintä IDP-kortissa
- `_vpKausitavoiteHTML(p)` (~4340): lähdesiru "◎ Lähde: pelihavainto · ottelu {pvm}" kun `lahdeTieto.tyyppi==='pelihavainto'`.
  Aloitus-yhteenveto (~5258) sama. Sama siru näkyy Masterin kortissa (§C).

---

## C · VALMENTAJAN IDP-OMISTAJUUS OMALLE JOUKKUEELLE (Master_v16)

### C.1 Oikeudet ovat JO olemassa — ei sääntömuutosta
- **Firestore-säännöt** (`tm_admin/firestore.rules` ~537–551): `idp_kausi` **read + create + update** on jo sallittu
  `onOmanSeuranValmentaja(seuraId)`:lle. **Joukkuerajaus tehdään UI-tasolla** (rules-kommentti ~395–396: *"joukkuerajaus
  UI-tasolla kuten havainnot; Rules rajaa oman seuran valmentajaan"*). ⇒ **EI Firebase Console -deployta tarvita.**
- **Poista vanha oletus:** kommentti "Kausitavoite pysyy VP-hyväksyttynä erikseen" (~360) edustaa vanhaa portinvartija­mallia.
  Uusi malli: **valmentaja omistaa oman joukkueensa IDP:t; VP vahvistaa.** (Sääntötekstiä ei tarvitse muuttaa — kyse on
  sovelluslogiikasta. Päivitä koodikommentit vastaamaan.)

### C.2 Täysi IDP-kortti Masteriin, joukkuerajattuna
- **Oman joukkueen pelaaja** (`p.joukkue` ∈ valmentajan joukkueet, ks. Master ~2184–2245 joukkuekonteksti): näytä **täysi
  muokattava** IDP-kortti — sama sisältö + toiminnot kuin VP:n `_vpKausitavoiteHTML` (~4340): luo/muokkaa fokus, tavoitearvo,
  kuvaus, **aktivoi** (`status:'aktiivinen'`), edistymä, kehityskaari. Tallennus `idp_kausi/{vuosi}.tavoitteet[]` + pikakentät
  (`idpPikakentat`). Käytä VP:n korttia **mallina/komponenttina** (jaettu logiikka jos järkevää).
- **Muun joukkueen pelaaja:** **read-only** kortti (näkee sisällön, ei muokkaa). Rajaus UI:ssa (kuten havainnot).
- **Sijoitus:** Masterin pelaajan tarkennus/Pelaajaraportti ('dev'-workspace, ~4439). Lataa aktiivinen tavoite `idp_kausi`:sta
  (kuten Pelaaja_v7 `_p7LataaTavoite` ~1750, mutta valmentaja EI §7.22-rajattu → oikea sisältö).

### C.3 VP:n rooli = vahvistaja (ei portti)
- **Valmentaja aktivoi omat tavoitteensa suoraan** (ei odota VP-hyväksyntää). VP näkee + voi **vahvistaa/kommentoida/kalibroida**.
- **Muokkaa olemassa oleva ilmoitusvirta:** `idp.approved`/`idp.rejected` (Master ~3599, ~3940) → korvaa/täydennä
  "VP vahvisti näkemyksesi" / "VP ehdottaa kalibrointia" -tyyliseksi (ei "hyväksytty/hylätty"-portti). VP:n Kehitys-kortti säilyy
  (VP voi muokata mitä tahansa pelaajaa). **Ei estä valmentajan aktivointia.**
- (Jos VP-vahvistus halutaan näkyviin tavoitteessa: valinnainen `vp_vahvistus` -kenttä tavoite-objektiin — additiivinen, ei pakollinen.)

---

## D · OPASTUS (in-app + opas)
- **In-app info-napit** (`_tmIBtn` / `TM_TESTI_OHJEET`-tyyli, lyhyt suomeksi): (1) Arviointi-lähderyhmät (mitattu/havaittu/pelihavainto
  + miksi jotkut lukittuja); (2) IDP-silta ("＋IDP-tavoite luo tavoitteen havainnosta"); (3) roolit ("Valmentaja omistaa oman
  joukkueensa kehityssuunnitelmat; VP vahvistaa").
- **Opas:** päivitä `docs/OPAS_VP_JA_VALMENTAJA.md` + pelikirja-HTML: uusi Arviointi-rakenne, IDP-silta, ja **päivitetty roolimalli**
  (valmentaja omistaa oman joukkueen IDP:t + kehityskeskustelut · VP vahvistaa/kalibroi · pelaaja näkee oman positiivisen version).

## E · Rajaus (EI tässä)
- **I3** (Kartta A harjoitussisältö) · **pelipaikkafundamenttien** laajennus · **vaalea BI-teema** / muiden välilehtien redesign ·
  uusi arviointidatamalli · **Firestore-sääntömuutokset** (ei tarvita; jos joku luku/kirjoitus yllättäen estyy → raportoi, älä muuta sääntöjä).

## F · Verifiointi + DoD
- **VP Arviointi:** otsikko erottuu, "N kohdetta", tilastopalkki-coverage. Rivit lähderyhmiin (mitattu lukittu+palkki · havaittu
  segmentti+autosave+palkki · pelihavainto himmeä+yliajo). Nimitörmäys poissa. Yhdistelmä-design.
- **IDP-silta:** ≤2-rivillä "＋ IDP-tavoite" → ehdotus Kehitys-välilehdelle. Lähdemerkintä kortissa ("◎ Lähde: pelihavainto · {pvm}");
  moottori säilyttää lahde+pvm.
- **Valmentaja (Master):** **oman joukkueen** pelaajalle täysi muokattava IDP-kortti (luo/muokkaa/**aktivoi** suoraan, tallentuu
  `idp_kausi`:iin) · **muun joukkueen** pelaajalle read-only. VP näkee + vahvistaa; valmentajan aktivointi ei odota VP:tä.
- **Opastus:** info-napit oikeilla teksteillä; `OPAS_VP_JA_VALMENTAJA.md` + pelikirja päivitetty (roolimalli mukana).
- **Testidata:** **Topias Koskela (KPV, testipelaaja)** — kirjoitukset OK. Eino/Leo (oikeat alaikäiset) = vain luku. Testaa
  valmentaja­roolilla oman joukkueen pelaajaa (kirjoitus onnistuu säännöillä sellaisenaan).
- **Ei regressioita:** `npm test` + lint + selain. **Rules: ei muutosta** (oikeus jo olemassa); jos kirjoitus estyy → raportoi.
- **Merge vasta kun Tero sanoo "live".** Branch `feat/arviointi-i2-idp-silta`.

## G · Työjärjestys Codelle
1. **A1** otsikko + tilastopalkki-coverage.
2. **A2/A3** rivit lähderyhmiin + mittaripalkki + segmentoitu 1–5 + legenda + autosave-merkki. Nimitörmäys pois.
3. **B2** moottori: lahde+pvm (`idpKeraaKandidaatit` → `idpRakennaTavoite` `fokus.lahdeTieto` + `idp_lahde`).
4. **B1** silta-handler + "＋ IDP-tavoite" ≤2-riveille (VP + valmentaja).
5. **B3** lähdesiru IDP-korttiin.
6. **C** valmentajan täysi IDP-kortti Masteriin, joukkuerajattuna (oma = muokattava/aktivoitava, muu = read-only); VP-ilmoitusvirta
   "vahvistaja"-malliin; päivitä vanhat "VP-hyväksyntä" -kommentit.
7. **D** info-napit + `OPAS_VP_JA_VALMENTAJA.md` + pelikirja.
8. Verifiointi §F → raportoi git + emulaattori + selain.
