# Code-brief — Brändijako: Palloliitto Player Development Card × TalentMaster Analytics

> **Lähde:** kokonaiskartta + `brandijako_mockup.html` (Teron hyväksymä suunta) + arvoijan palaute P0.3. Selkeytä
> Arviointi-välilehden brändi: **Palloliitto = arviointikehys** (virallinen kortti), **TalentMaster = älykerros**
> (mittaus, pelihavainto, kehityssuunnitelma). Sama data, selkeä alkuperä → molemmat brändit vahvistuvat. Kohde:
> **VP_v25 + Master_v16** Arviointi-otsikko + lähderyhmien attribuutio. **Ei datamallimuutosta, ei sääntömuutosta.**
> Havaintopsykologinen muutos → **käyttäjäpalaute pilotissa ennen lukitsemista** (Teron ehto).

## 0. Periaate
- **Palloliitto Player Development Card** = arviointikehys: D1–D5-taksonomia + **havaittu 1–5** (kortin oma arviomuoto).
- **TalentMaster Analytics** = älykerros kortin päällä: **mitattu** (TM-testit 🟢), **pelihavainto/ADAR** (👁), IDP-tavoite,
  jaksofokus/konseptit, 5D-radar, kehityspolku. TM:n arvo tehdään näkyväksi; virallinen ei sekoitu TM:n omaan.

## 1. Otsikon kaksois-brändäys (Arviointi-välilehti)
Nykyinen "Arviointikehys · Palloliitto" -pilleri (I2) laajennetaan:
- **Kehysmerkki:** "📋 **Palloliitto Player Development Card**" + alaotsikko "Arviointikehys · D1–D5 · 57 kohdetta".
- **Analytiikkamerkki:** viereen "analytiikka: ◆ **TalentMaster**" -badge (teal).
- **Attribuutio-selite** (kerran): "🔵 Palloliitto: havaittu-arvio 1–5 · 🟢◆ TalentMaster: mittaus · pelihavainto · kehityssuunnitelma".

## 2. Provenance-merkit lähderyhmiin (I2:n lähderyhmien päälle)
Lähderyhmäotsikoihin (I2: 🟢 mitattu / 🔵 havaittu / 👁 pelihavainto) pieni oikean reunan merkki:
- 🔵 **Havaittu · arvioi 1–5** → `PALLOLIITTO-ARVIO` (sininen) — kortin oma arviomuoto.
- 🟢 **Mitattu · testeistä** → `TM ANALYTICS` (teal) — TM-testimoottori.
- 👁 **Pelihavainnosta · ADAR** → `TM ANALYTICS` (teal) — TM:n havaintomalli.

## 3. "TalentMaster Analytics — kehityskerros" -vyöhyke
Arviointi-välilehden alaosaan (tai IDP/konsepti-alueen yhteyteen) hillitty vyöhyke joka merkitsee TM:n oman älyn:
IDP-tavoite (kausifokus) · Jaksofokus + konseptit · 5D-radar · Peliäly/ADAR · Kehityspolku. Tekee näkyväksi mikä on
TM:n analytiikkaa vs. Palloliiton kortti. (Ref-mockup jaottelu.)

## 4. Käyttäjäpalaute-mekanismi (Teron ehto — ei lukita ennen validointia)
- Kevyt **in-app "Palaute" -nappi** brändijako-näkymään (tai lyhyt kysely pilotissa): "onko jako selkeä? vahvistaako se
  luottamusta? sekoittaako se mitään?". Palaute talteen (esim. `seurat/{sid}/palaute/{id}` tai olemassa oleva palautekanava).
- **Pilottilippu suositeltava:** brändijako voi olla lipun takana (`brandijako_kaytossa`), jotta se voidaan ottaa käyttöön
  pilotissa ja kerätä palaute ennen laajaa julkaisua. (Tero päättää lipun tarpeen.)

## 5. Rajaus (EI tässä)
- Ei datamallimuutosta (vain esitys/attribuutio). Ei taksonomian muutosta.
- Ei muiden välilehtien uudelleensuunnittelua. Ei vaaleaa teemaa (tumma säilyy).
- AI / muut kerrokset → ei.

## 6. Verifiointi + DoD
- **Live (VP + Master Arviointi):** otsikko näyttää molemmat brändit erikseen (Palloliitto-kortti + TM-analytiikka),
  provenance-merkit lähderyhmissä oikein (havaittu=Palloliitto, mitattu/pelihavainto=TM), kehityskerros-vyöhyke näkyy.
- **Palaute-nappi** avaa palautekanavan; palaute tallentuu (jos toteutettu) tai ohjaa kyselyyn.
- Ei regressioita I2:n lähderyhmiin. `npm test` + lint + selain. **Rules: ei muutosta** (ellei palautetallennus vaadi —
  jos vaatii uuden kokoelman, se on erillinen sääntöpäätös → raportoi, älä muuta ilman Console-deployta).
- Branch `feat/brandijako`. **Merge vasta kun Tero sanoo "live".**
