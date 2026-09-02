# Code-brief — i18n V5 · RAITA B · **B2 Pari A: Master_v16 — renderDev (Utveckling) + renderPulse (Puls) sv**

> **Konteksti:** today+inbox on TÄYSIN VALMIS mainissa (PR #441, `?v=6`, suite 1638/1638, verifioitu:
> C1 Master∩common=∅ · C3 drift 0 · vaihe-signaali-gate 0 · ws-view-gate 0). B1 (chrome) live-verifioitu.
> ws-view STAATTINEN runko kaikille 9 näkymälle jo tagattu (edellinen erä). **Nyt B2 jatkuu 6 työtilan
> DYNAAMISELLA renderillä, pareittain.** Tämä = **Pari A: Utveckling + Puls** (kehitysanalytiikka-pari:
> detail-paneelit + joukkuepulssi). Kartta (`docs/MASTER_SV_KAANNOSMUISTI.json`) kattaa suurimman osan;
> lisää vain puuttuvat body-stringit (C1: älä lisää commonin avaimia).

## Skooppi — funktiot (reititä `masterT()`:llä JS:ssä)
| Näkymä | Render-funktio (rivi n.) | Sisältö |
|---|---|---|
| **Utveckling** | `renderDev` (4870) | kehitys-KPI:t (M1 FLEI→H-H · M2 TKI→TSI · M3 D1/D2), tyhjätilat, lataustila |
| Utveckling detail | `_buildHHDetail` (5008) · `_buildTSIDetail` (5129) · `_buildTKIDetail` (5176) | KPI-kortin klikkaus → normivertailu + suositus |
| **Puls** | `renderPulse` (3891) | neliosainen joukkuepulssi (FLEI · TKI · H-H taso · ADAR) + kattavuussignaalit S6–S9 |

**Malli (kuten today/inbox):** dynaaminen render-output → `masterT(fi)`. §7.1 EI nested template literaleja
(template-literaalissa `${masterT('...')}`, konkatenaatiossa `' + masterT('...') + '`). **Bugivahti:**
`_renderTodayFokus` rikkoutui kun `${masterT()}` laitettiin concat-stringiin → tarkista rakentaako funktio
HTML:n `+`-konkatenaatiolla vai template-literaalilla ENNEN kuin valitset muodon. Aja inline-parse-vahti.

## §6 dynaamiset templatet (placeholder + .replace) — tässä parissa
| Rivi | FI (pohja) | SV-suositus (riskilista §6) |
|---|---|---|
| 5145 | `⚠️ Pallo hidastaa {t}s` + `Prioriteetti: pallokuljetus täydessä vauhdissa joka päivä.` | `⚠️ Bollen saktar {t} s` + `Prioritet: bollföring i full fart varje dag.` |
| 5892 | `{n} vaihetta · {x} vk · ajettu {N} pelaajalla` | `{n} faser · {x} v · körd på {N} spelare` |
| 6735 / 6738 | `Pallo hidastaa vain {tsi}s — tekninen vapaus. Tavoite: alle 0.5s.` / `Pallo hidastaa pelaajaa {tsi}s verrattuna pallottomaan nopeuteen. Tavoite: alle 0.5s.` | `Bollen saktar bara {tsi} s — teknisk frihet. Mål: under 0,5 s.` / `Bollen saktar spelaren {tsi} s jämfört med farten utan boll. Mål: under 0,5 s.` |

**Malli:** `masterT('Pallo hidastaa vain {t}s — tekninen vapaus. Tavoite: alle 0.5s.').replace('{t}', tsi)`.
Numero interpoloidaan `.replace`:lla — desimaalipilkku (0,5) tulee sv-arvosta, ei koodista. `t.toFixed(2)` säilyy fi-arvona.

## §1 enum-display-map (EI data-i18n raakaan enumiin) — tässä parissa
- **IDP-status-fallback (rivi 6365):** `(st === 'aktiivinen' ? '● Aktiivinen' : st === 'ehdotettu' ? '○ Ehdotettu' : _mEsc(st))`.
  Tunnetut → kartasta (`● Aktiivinen`→`● Aktiv`, `○ Ehdotettu`→`○ Föreslagen` ovat kartassa); **tuntematon `_mEsc(st)` jää fi:ksi**
  (turvallinen fallback). ÄLÄ normalisoi (§5.1: `'aktiivinen'`-enum pienaakkosin ≠ näyttö-`'Aktiivinen'`).

## ⛔ ÄLÄ reititä (riskilista §2–§3)
Kirjaustyypit `'T'/'D'/'S'/'P'` · testi-id:t (`lin_5m`…`pituuspotku`) · ws-avaimet `setWs(...)` · pelipaikka-/joukkuenimet ·
roolistringit (Custom Claims, pienaakkoset) · demo-pelaajanimet. Tuotetermit **verbatim** (X-Factor/Hidden Gem/Underdog),
indeksilyhenteet (TKI/H-H/TSI/D1–D5/PHV/FLEI). **§7-rajaus:** lib-lähtöinen curriculum/normi-teksti jää fi (ei lib_sv-forkkia).
**Demo-haarat (§3)** — jätä fi (kuten today/inbox-erässä).

## Glossaari tulee commonista automaattisesti
Kehon valmius→Kroppslig beredskap · Syöttö→Passning · Pujottelu→Slalom · roolit (Tränare/Talangtränare/Fystränare) ·
yleisnapit → **kun reitität ne masterT:llä, common voittaa ilman että lisäät mitään.** C1-portti kaataa buildin jos
lisäät commonin avaimen master-karttaan. Vain Pari A -spesifit body-stringit `tm_master_i18n.js`:iin.

## Cache-bust (§27.4)
`tm_master_i18n.js` muuttuu (uudet avaimet) → **`?v=6 → ?v=7`** Master-HTML:ssä. Common ei muutu. version.json auto-bump mainissa.

## DoD (Pari A)
- **Utveckling + Puls sv-tilassa 100 % ruotsiksi:** kehitys-KPI:t + 3 detail-paneelia (H-H/TSI/TKI normivertailuineen) ·
  joukkuepulssi (FLEI/TKI/H-H/ADAR + suunta) + kattavuussignaalit S6–S9. §6-templatet placeholderilla. §1 IDP-status-mappi.
- Glossaari commonista kanonisena. Tuotetermit + indeksilyhenteet verbatim. lib/normi-teksti fi (§7). Demo fi (§3).
- C1 (Master∩common=∅) säilyy. fi-regressio ehjä. Vitest: Pari A -avainkattavuus + fi-fallback + C1. `npm run lint` EXIT 0.

## Verifiointi (Claude — 4-kerrosportti)
1. Kielineutraali gate renderDev/detailit/renderPulse → 0 reitittämätöntä näkyvää (pl. §7 lib + §1 tuntematon-enum + demo §3).
2. Node/jsdom render-proof: §6-templatet resolvoituvat sv:ksi (`{n} faser · {x} v`, `Bollen saktar…`), interpolointi + desimaalipilkku OK.
3. C1 + glossaari-portti (Master∩common=∅, 0 kiellettyä varianttia; Kehon valmius→Kroppslig beredskap commonista).
4. lint 0 · suite vihreä · inline-parse 0.

## Rajaus (EI Pari A:ssa)
Pari B (Säsong + Belastning & känsla) · Pari C (Tester + Kalender) — omat briefinsä. Seura (Raita C). lib-sisällön sv (curriculum, oma vaihe).
