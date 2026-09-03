# Code-brief — i18n V5 · Master_v16 · **Erä 3: täydennyspassi → Master aidosti 100 % sv + committattu render-gate**

> **Konteksti:** IDP-klusteri Erä 1 + Erä 2 osa 1 ovat mainissa (`?v=15`) ja **live-verifioitu** (11 työtilaa 0 fi-vuotoa
> pääpinnalla). Erä 2:n DoD "100 % Master" paljasti ~150 aitoa reitittämätöntä sv-avainta **skoopin ulkopuolella** —
> Claude:n brief-skoopitusvirhe (kartoitus per pinta aliarvioi joka kierroksella). **Tämä on VIIMEINEN Master-passi:
> reitittää loput 7 pintaa JA committaa render-kielineutraali-gaten joka tekee "100 % sv":stä pakotettavan + regressiosuojatun.**

## 🎯 DoD:n ydin — committattu render-gate (tärkein, tee ENSIN)
Aiemmin ei ollut committattua JS-render-gatea (vain ad-hoc-skanneri) → "100 %" ei ollut pakotettavissa. **Rakenna
`tests/idp_i18n_v5_master_render_dom.test.js`** (jsdom TAI node-DOM): renderöi Master sv-tilassa, kävele näkyvät
tekstisolmut, **failaa jos yksikään on `TM_MASTER_I18N.sv`-avain joka näkyy fi-arvona** (`sv[text] && sv[text]!==text`).
- **Allowlist (tietoiset fi-jäänteet):** demo §3 · §7 lib-curriculum-teksti · enum-**arvot** · tuotetermit (X-Factor/Hidden Gem/Underdog verbatim).
- Tämä gate = **Erä 3:n hyväksyntäkriteeri**: reititä kunnes gate palaa **0**. Se on "valmis"-määritelmä.

## Skooppi — 7 pintaa (reititä masterT/data-i18n; [K]-kartta voittaa; dup-check)
| Pinta | Rivit | Esimerkkejä (näyttö) |
|---|---|---|
| **Fysiikkajakso-engine / ohjelmakirjasto** | 5674–6160 | `Ei suljettavaa jaksoa` · `🏃 Fysiikkajakso ·` · `Kestävyys` · `✓ Aseta fysiikkajakso · 4 vk` · `D1 Fyysinen`/`D2 Tekninen` · rooli-arvio-labelit (`Valmentaja-arvio` ym.) |
| **CPD / Valmentajana-kehittyminen** | 7363–7766 | `Harjoitusarviointi` · `A · Harjoittelun laatu` · `tavoitteen selkeys` · `Koulutukset/kurssit` · `Itsearviosi ja havainnoijan näkemys ovat hyvin linjassa…` · `reflektio-CPD ei korvaa virallista lisenssikirjanpitoa` |
| **D3-arvio (psykologinen)** | 9267–9332 | `Harjoittelee omaehtoisesti, ei vain käskystä` · `Pysyy tehtävässä koko harjoituksen` · `Valitse pelaaja ensin` · `Anna vähintään yksi arvio` · `Tallenna arvio` · `D3-arvio tallennettu ✓` |
| **Navi-valikko** | 9611–9640 | `Kehitys-työtila` · `Näkymä` · `Pelaajat` (komentopaletti-labelit) |
| **Login / auth-toastit** | 2122–2292 | `Istunto vanhentunut tai käyttöoikeudet puuttuvat. Kirjaudu uudelleen sisään` (aina näkyvä) |
| **Testiprotokolla-/ketjunimet** | 2630–2700 | §1 enum/glossaari — **näyttönimet** reititä, id/value fi |
| **Vahvista-osallistujat + misc-toastit** | hajallaan | osallistujavahvistus + sekalaiset toastit — render-gate paljastaa |

## 🔒 Kanoninen sv-addendum (uudet domain-herkät; [K]-kartta voittaa jos on jo)
```
# D3 psykologinen (§7.22-sävy: neutraali, ei arvostelua)
Harjoittelee omaehtoisesti, ei vain käskystä → Tränar självmant, inte bara på uppmaning
Pysyy tehtävässä koko harjoituksen          → Håller fokus under hela träningen
Valitse pelaaja ensin                        → Välj spelare först
Anna vähintään yksi arvio                    → Ge minst en bedömning
Tallenna arvio                               → Spara bedömning
D3-arvio tallennettu ✓                       → D3-bedömning sparad ✓
D3 Psykologinen                              → D3 Psykologisk

# Rooli-arvio-labelit (roolit sanastosta + -bedömning)
Valmentaja-arvio          → Tränarbedömning
Fysiikkavalmentaja-arvio  → Fystränarbedömning
Talenttivalmentaja-arvio  → Talangtränarbedömning
Fysioterapeutti-arvio     → Fysioterapeutbedömning
VP-arvio                  → UA-bedömning        (LUKITTU: UA = Utvecklingsansvarig)

# CPD / valmentajakehitys
Harjoitusarviointi            → Träningsbedömning
A · Harjoittelun laatu        → A · Träningskvalitet
tavoitteen selkeys            → målets tydlighet
Koulutukset / kurssit         → Utbildningar / kurser
reflektio-CPD ei korvaa virallista lisenssikirjanpitoa
     → reflektions-CPD ersätter inte officiell licensbokföring
Itsearviosi ja havainnoijan näkemys ovat hyvin linjassa — vahva itsetuntemus
     → Din självvärdering och observatörens bild ligger väl i linje — stark självkännedom

# Fysiikkajakso-engine (osa jo Erä 1 -sanastossa)
Ei suljettavaa jaksoa       → Ingen period att stänga
🏃 Fysiikkajakso ·          → 🏃 Fysikperiod ·
Kestävyys                   → Uthållighet
✓ Aseta fysiikkajakso · 4 vk → ✓ Sätt fysikperiod · 4 v
D1 Fyysinen · D2 Tekninen   → D1 Fysisk · D2 Teknisk

# Navi / komentopaletti
Kehitys-työtila → Arbetsytan Utveckling   (⚠ vahvista fraseeraus)
Näkymä          → Vy
Pelaajat        → Spelare

# Login / auth
Istunto vanhentunut tai käyttöoikeudet puuttuvat. Kirjaudu uudelleen sisään
     → Sessionen har gått ut eller så saknas behörigheter. Logga in igen
```

## ⛔ ÄLÄ reititä (kohinasuodatin — heuristiikka nappasi näitä)
Muuttujanimet (`valmentajaUid`·`_msFyysOhjelma`·`ohjelmat`·`pelaajat`·`ref_kehityskohde`) · console.log-tagit
(`[v16 SA]…`·`[Master]…`·`[msAsetaFyysFokus]`) · DOM-id/CSS-fragmentit · **demo §3** (`Fysiikkajakso asetettu (demo)`) ·
enum-**arvot** + testi-id/ketju-**value**t (näyttönimet kyllä) · rooli-**value**t Custom Claimseissa. §7 lib-teksti fi.

## Portit + DoD (Erä 3) → Master 100 % sv
- **Uusi render-gate palaa 0** (allowlist = demo/§7/enum/tuotetermit). Kaikki 7 pintaa sv.
- Uudet avaimet dup-checkillä (`if key in map`) → `?v=15→16`. [K]-kartta voittaa. Kanoninen addendum eksaktisti.
- C1 ∅ · dup 0 · lint 0 · staattinen-DOM-vartija + render-gate + suite vihreä · fi-regressio ehjä · inline-parse 0.
- **Suositus: aja lint-puhtaissa alaerissä pinta kerrallaan** (fysiikkajakso → CPD → D3 → navi/login → testinimet → vahvista/misc) niin ei musta-ruutu-riskiä 9792-rivisessä scriptissä.

## Verifiointi (Claude) → koko Master live 100 % sv
1. Render-gate 0 (committattu) · staattinen-DOM 0 · C1 ∅ · dup 0 · lint · suite.
2. **Live: 11 työtilaa + IDP-editori + Pelaajaraportti + CPD-välilehti + D3-arvio + notif + navi → 0 näkyvää fi-avainta** (pl. allowlist).
3. Domain-tarkastus: D3 §7.22-sävy neutraali · rooli-arvio-labelit kanonissa · §29/§28 ehjät. ⚠-termi (Kehitys-työtila-fraseeraus) live Teron kanssa. (VP→UA lukittu.)

## Rajaus (EI Erä 3:ssa)
§7 lib-curriculum-sv (tm_teknistaktiset/normit — oma vaihe, engine kaksi polkua sielä). Raita C: Seura.html. en-kerros (Vaihe 9).
