# Code-brief — i18n VAIHE 5 · RAITA B · **B2: Master_v16 — 11 työtilan dynaaminen render sv**

> **Konteksti:** B1 (infra + aina-näkyvä chrome) on mainissa ja **live-verifioitu** — sidebar/nav/ws-tabit/haku
> renderöityvät sv:nä deployatulla sivulla (Hem/Spelare/Observationer/Meddelanden/Verktyg/Idag/Puls/Säsong/Kalender/
> Tester/Belastning & känsla…). `masterT`/`masterLokalisoi` + common toimivat. **Nyt B2 = työtilojen dynaaminen
> render-sisältö**, joka on vielä fi (live-todiste: hero-tervehdys, profiilibadget, Aloita tästä -kortti, signaalit).
> Kartta (`docs/MASTER_SV_KAANNOSMUISTI.json`, 1194) kattaa nämä stringit jo — B2 reitittää ne `masterT`:llä.

## Skooppi — 11 työtilan render-funktiot (`masterT` JS:ssä)
| Työtila | Render-funktio (rivi n.) |
|---|---|
| koti (Hem) | `renderKoti` (4415) + `renderCoachAloitaKortti` (4543) + `hGreet` (4130) + signaalilohko |
| today (Idag) | `renderToday` (4649) |
| inbox (Meddelanden) | `renderInbox` (3636) |
| dev (Utveckling) | `renderDev` (4875) + detail-paneelit (H-H/TKI/TSI) |
| havainnot (Observationer) | `renderHavainnot` (4488) |
| pulse (Puls) | `renderPulse` (3896) |
| season (Säsong) | `renderSeason` (7929) |
| kuorma (Belastning & känsla) | `renderKuorma` (8251) |
| testit (Tester) | `renderTestit` (2814) |
| kalenteri (Kalender) | `renderKalenteri`/`renderCal` (paikanna) |

**Malli (kuten VP V2):** dynaaminen render-output → `masterT(fi)` (template-literaalit `${masterT('...')}`, §7.1). Staattiset
osat B1:ssä jo `data-i18n`. Kielenvaihto re-renderöi aktiivisen ws:n. **Glossaari tulee commonista automaattisesti**
(Kehon valmius→Kroppslig beredskap, Syöttö→Passning, roolit) — älä lisää commonin avaimia master-karttaan (C1-portti).

## Live-todennettu koti-pinta (esimerkki B2-sisällöstä)
Hero: `hGreet` "Hyvää iltaa, {nimi}." + pvm-rivi "Tiistai, 1. syyskuuta · VIIKKO 36" (dynaaminen §6 template) ·
profiilibadget **HAVAINTOA / VIESTIÄ / CPD H** (→ Observationer/Meddelanden/CPD h) · **Aloita tästä -kortti**
("0/5 askelta…", "Katso oman joukkueesi pelaajat", "Tee ensimmäinen pelihavainto", "Avaa Pelaajaraportti + kirjaa tavoite",
"Tee itsearvio", "Lue Viestit", "Piilota opas", "📖 Näin teet TalentMasterilla arjessa") · **"Mitä sinun pitää tehdä"**
+ signaalit ("7 pelaajaa ilman tuoretta havaintoa (30 pv)", "Havainnoi →"). Kaikki kartassa → reititä `masterT`.

## Riskilistan käsittely (`docs/MASTER_SV_RISKILISTA.md`)
- **§6 dynaamiset templatet** (11 riviä + toast-vyöhykkeet 4606/6079/6429/7055/7895): placeholder-template
  `masterT('{x}/{n} kirjasi RPE:n').replace(...)` — sv-suositukset §6-taulukossa. Erit. **hero pvm-rivi** + tervehdys
  (`hGreet`, rivi 4130: `prefix + ', ' + nimi + '.'`) → `prefix` = tervehdys (Hyvää iltaa→God kväll) `masterT`:llä, nimi verbatim.
- **§1 enum-display-mapit** (tila 8520, IDP-status 6365, RSVP 8667–8669): käännä tunnetut tilat kartasta, tuntematon fallback fi.
- **§5.1 case-sensitiivisyys:** resolver eksakti — älä normalisoi ("Kesken"≠`'kesken'`).
- **§5.2 split-tekstit** (rivi 3667 Arkisto): koko lause yhtenä avaimena / `data-i18n-html`.

## Kaksi B1-jäännettä korjattavaksi B2:ssa
1. **ws-tab "Inbox" → yhtenäistä sidebariin.** Sidebar näyttää saman ws:n **"Meddelanden"**, ws-tab "Inbox" (englanti). → **suositus: ws-tab "Meddelanden"** (yhtenäinen sidebarin kanssa). (Vaihtoehto Inkorg, mutta sidebar on jo Meddelanden → älä luo kahta sv-termiä samalle ws:lle.)
2. **tabbar "⋯ Lisää" → "Mer"** (nav-overflow = More, EI Lägg till). Lisää **kontekstiavain** (esim. common `'Lisää (valikko)'`→'Mer' TAI master-kartta-avain) — ei sekoita Kimin `Lisää→Lägg till` (Add) -mappingiin. Jos lisäät commoniin → bumppaa `common ?v=2→3` + kaikki lataavat (VP+Master); jos master-karttaan → vain master ?v.

## ⛔ ÄLÄ reititä (riskilista §2–§3)
Kirjaustyypit `'T'/'D'/'S'/'P'` · cadence/scope/kadenssi **value**-attribuutit · `sukupuoli 'M'/'N'` · `lahde` · testi-id:t ·
ws-avaimet · pelipaikka-/joukkuenimet + roolistringit · demo-pelaajanimet. Tuotetermit **verbatim** (X-Factor/Hidden Gem/Underdog),
indeksilyhenteet (TKI/H-H/TSI/PHV/D1–D5/RAE/FLEI/CPD). **§7-rajaus:** lib-lähtöinen curriculum-teksti jää fi (ei lib_sv-forkkia).

## Cache-bust
`tm_master_i18n.js` muuttuu (jos lisäät avaimia) → **`?v=1→2`**. Common muuttuu vain jos "Mer"/kontekstiavain sinne → silloin `common ?v=2→3` + VP+Master. version.json auto-bump mainissa.

## DoD (B2)
- **11 työtilaa sv-tilassa 100 % ruotsiksi**: koti (hero+badget+Aloita tästä+signaalit) · Idag · Meddelanden · Utveckling
  (+detailit) · Observationer · Puls · Säsong · Belastning & känsla · Tester · Kalender.
- Dynaamiset templatet (§6) + enum-display-mapit (§1) + split-tekstit (§5.2). Inbox→Meddelanden, Lisää→Mer korjattu.
- Glossaari commonista kanonisena. Tuotetermit verbatim. lib-teksti fi (§7). C1 (Master∩common=∅) säilyy.
- fi-regressio ehjä. Vitest: B2-avainkattavuus + fi-fallback + C1. lint EXIT 0.

## Verifiointi (Claude — 4-kerrosportti, live)
1. Kielineutraali gate 11 render-funktiosta → 0 reitittämätöntä (paitsi §7 lib + §1 tuntematon-enum-fallback).
2. **Live fi/sv render-diffi** (Chrome, kirjautunut sessio): klikkaa 11 työtilaa läpi sv:ssä — hero/badget/Aloita tästä/signaalit + jokainen ws sv. (B1:n live-tarkastus osoitti tämän toimivan chromelle → sama sessio kattaa B2:n.)
3. Toast/alert/confirm-audit (dynaamiset templatet §6).
4. C1 + glossaari-portti (Master∩common=∅, 0 varianttia).

## Rajaus (EI B2:ssa)
Raita C Seura (oma wiraus, kartta repossa). lib-sisällön sv (curriculum, oma vaihe). Pelaaja/Vanhempi (jo sv).
