# CODE — P3.1: Arviointi — selkeys (johda arvioinnilla · selitteet ⓘ:n taakse · yksi fonttijärjestelmä)

**Tyyppi:** UI-selkeytys (näyttö/IA, ei uutta dataa). **Yksi PR.**
**Kohde:** `TalentMaster_VP_v25.html` — `_vpArviointiHTML(p)` (Arviointi-taksonomiakortti, `_jspTab5`-sisältö) + Arviointi-välilehden koonti (`_jspTab2` = Peliäly/ADAR `f3` + taksonomia `f5`).
**Design-totuus:** hyväksytty `idp_arviointi_selkea.html`. Tiekartta **P3.1**. Ohje on itsenäinen.

## Miksi

Arvioinnin **sisältö ja rakenne ovat vahvat** (lähderyhmät, kattavuuspalkki, ADAR-ikäportti, D3-kalibraatio, kehys-valitsin — kaikki P3:ssa tehty). Ongelma on **tiheys**: ennen varsinaista arviointia on pino selittävää tekstiä — Palloliitto-brändilohko → attribuutiorivi → kehys-note → kaksi lähdelegenda-riviä → asteikkolegenda → pelihavainnot-rivi → "TalentMaster Analytics — kehityskerros" -vyöhyke. Se on ~6 riviä metaa ennen kuin pääsee arvioimaan (sama "seinä ennen työtä" jonka poistimme Kehityksestä P4a.1:ssä). P3.1 **johtaa arvioinnilla ja kokoaa selitteet yhden katkaisimen taakse.** Ei uutta dataa/logiikkaa — sama sisältö, selkeämpi järjestys.

## Mitä tehdään

### 1. Selitteet yhden "ⓘ Tietoa kehyksestä" -katkaisimen taakse
Kokoa **kaikki selittävä scaffolding** yhteen suljettavaan paneeliin (design-totuuden `.selit`, oletuksena **kiinni**; "ⓘ Tietoa kehyksestä · selitteet" avaa):
- Kehys-vaihdettavissa-note ("🔧 Kehys vaihdettavissa — seuran oma taksonomia + asteikko + KPI + ADAR-mäppäys").
- Brändi-attribuutiorivi ("🔵 Palloliitto: havaittu-arvio · 🟢◆ TalentMaster: mittaus · pelihavainto · kehityssuunnitelma").
- Lähdevärilegenda (🟢 Mitattu · 🔵 Havaittu · 👁 Pelihavainnosta · ＋ IDP-tavoite ≤2).
- Asteikkolegenda ("📏 Asteikko: 1 Kehityskohde … 5 Erinomainen" — aktiivisen kehyksen `kehys.asteikko`:sta, P3).
- Pelihavainnot-erittely ("👁 1 pienpeli · 3 harjoituksesta · 1 ottelusta · §7.22 aikuisten työkalu").
- "TalentMaster Analytics — kehityskerros" -vyöhyke + brändipalaute-CTA (`_vpBrandiPalaute`) → tämän paneelin loppuun (metaa, ei tarvitse olla joka katselukerralla esillä).

### 2. Kompakti otsikko (brändi pieneksi)
Ylin lohko design-totuuden `.ahead`: eyebrow "ARVIOINTI · HAVAINTO-KEHYS" · serif-otsikko "Arviointi" · mono-meta "Palloliitto-kehys · D1–D5 · 57 kohdetta" · alle **ⓘ-katkaisin**. Kaksoisbrändäys (📋 Palloliitto × ◆ TalentMaster) = **pieni oikean reunan tagi**, ei iso lohko. Kehys-valitsin (`<select>`, näkyy kun >1 kehys tai SA) säilyy — sijoita kontrolliriville teeman viereen.

### 3. Mikrolegenda inline (yksi rivi)
Kattavuuspalkin (D1–D5) alle **yhden rivin** muistutus: "🟢 mitattu · 🔵 havaittu · 👁 pelihavainto · asteikko 1–5 → ⓘ". Riittää työn aikana; täysi selitys ⓘ:n takana. Poistaa nykyiset erilliset legend-rivit paneelin rungosta.

### 4. Johda arvioinnilla — järjestys
Arviointi-välilehti avautuu **työhön**, ei metaan:
1. Kompakti otsikko + ⓘ (kohta 2).
2. Kontrollit: **Teema** + **Kehys** -valitsimet (kompakti rivi).
3. **Kattavuuspalkki** D1–D5 (säilyy) + mikrolegenda (kohta 3).
4. **Peliäly · pelihavainto (ADAR)** -lohko (nyk. `f3`) — kompaktina, ikävaihe-note näkyy ("13–15 → Assess · Decide · Act", P3).
5. **Kohteet lähderyhmittäin** (🟢 Mitattu · 🔵 Havaittu · 👁 Pelihavainnosta) — 1–5-segmentit + IDP-tavoite-pilleri (≤2) ennallaan.
6. **Autosave-note** ("✓ Arviot tallentuvat automaattisesti · teema N/M arvioitu").
7. **D3-kalibraatio** (P3-lohko: itse×valm×VP + Aukko⚠ + varmuus + Arvioi(VP)) — säilyy alalaidassa.

### 5. Yksi fonttijärjestelmä
Noudata DS:ää: **otsikot Cormorant** (ei bold) · **leipä/labelit DM Sans** · **meta/numerot/segmentit DM Mono**. Eyebrow'it UPPERCASE 9–10px. DS-tokeneilla (`--font-serif/-sans/-mono`, `--ink/-ink2/-ink3`, lähdevärit teal/blue/pink/amber) — ei kirjavia inline-kokoja/fontteja.

## Reunaehdot
- **Ei uutta dataa/logiikkaa:** sama sisältö + kirjoittajat (`_vpTallennaHavaittu`, `_tallennaVpD3`, ADAR-johdanto `tmAdarHavaittu` P3-ikäportilla, `_vpTeeIdpTavoiteHavainnosta`) ennallaan. **Vain esitysjärjestys + selitteet katkaisimen taakse.** Ei uutta Firestore-kenttää, **ei Rules-muutosta**, ei migraatiota.
- **Ei cache-bumppia:** vain `TalentMaster_VP_v25.html` (ei lib-muutosta; taksonomia-lib ennallaan `?v=6`).
- **Ei regressiota:** teema-vaihto, kehys-vaihto, havaittu-autosave, ADAR-ikäportti, IDP-tavoite-silta, D3-kalibraatio, kattavuuslaskenta toimivat kuten ennen — vain sijoiteltuna selkeämmin. **Mitään toiminnallista ei pudoteta**, vain selittävä teksti kootaan ⓘ:n taakse.
- **P3 säilyy:** ADAR 1–3 + ikäportti (≤12 Assess · ≤15 A/D/Act · 16+ täysi), asteikkolegenda `kehys.asteikko`:sta, kehys-pluggability, D3-kalibraatio Arvioinnissa.
- **Brändi:** design-totuuden `idp_arviointi_selkea.html` mukaan — molemmat teemat, hiusrajat, terävät kulmat, lähdevärit (🟢 teal · 🔵 blue · 👁 pink · 🟠 amber). Kaksoisbrändäys säilyy (pienempänä).
- **Mobiili §6:** kontrollit + kattavuus + kohteet pinoutuvat kapealla; segmentit mahtuvat.
- **Alaikäiset read-only** (Eino·Leo·Emil); kirjoitukset testataan **vain Topiaksella**.

## EI tässä (seuraava)
- **Aloituksen kevyt dedupe** (sama tavoite ei toistu Suunta- ja Kausitavoite-solmuissa) → **P1.1** (oma pieni PR ohjeen jälkeen).

## DoD
1. Selittävä scaffolding (kehys-note · attribuutio · lähdelegenda · asteikkolegenda · pelihavainnot · kehityskerros-vyöhyke + brändipalaute) on **yhden "ⓘ Tietoa kehyksestä" -katkaisimen takana** (oletuksena kiinni).
2. Kompakti otsikko; kaksoisbrändäys pieneksi tagiksi; kehys-valitsin säilyy kontrollirivillä.
3. **Mikrolegenda** yksi rivi kattavuuden alla (🟢/🔵/👁/asteikko 1–5 → ⓘ).
4. Välilehti johtaa arvioinnilla: otsikko → kontrollit → kattavuus → ADAR → kohteet → autosave → D3-kalibraatio.
5. Yksi fonttijärjestelmä (Cormorant/DM Sans/DM Mono, DS-tokenit).
6. **P3 ennallaan:** ADAR-ikäportti, asteikkolegenda kehyksestä, IDP-silta ≤2, D3-kalibraatio, kehys-pluggability, autosave.
7. Ei kenttää/Rules/migraatio/cache-bumppia; ei regressiota (kaikki toiminta + kirjoitukset toimivat).
8. Molemmat teemat + mobiili; 0 konsolivirhettä. **Verifioi live:** Arviointi hengittää (ei legend-seinää), ⓘ avaa/sulkee selitteet, kohteet + ADAR + kalibraatio kärjessä, arviointi tallentuu (Topias). **Verifioi ennen mergeä.**
9. Pieni/keskikokoinen PR; kuvaus linkkaa `idp_arviointi_selkea.html` + tiekartta P3.1.
