# Korjaus — §28 kypsyysneutraali: kolmas tila "kypsyysdataa puuttuu"

> Lähde: live-verify 2026-07-05 (Claude, SJK). PR #100 toi §28-kypsyysneutraalin, mutta se laukeaa **vain mitatulle PRE/LAH-PHV:lle** (`onNeutraaliPrePHV`). SJK:lla 0 sellaista → **0/61 neutralisoitu, 12 heikko-MAS-pelaajaa yhä punaisella.** Juuri raportoitu ongelma (punainen MAS ilman kypsyysdataa) ei korjaannu. Kohde: `TalentMaster_VP_v25.html` `_avaaPerPelaajaPikakatsaus` (`friv()` + 5D-snapshot/radar). §28 · §26 · §5.

## 1. Ongelma
`friv()`:n `kypsyysNeutraali = (gated && _neutr && taso<3)`, missä `_neutr = onNeutraaliPrePHV(p) || PRE/LAH`. **"Ei PHV-dataa" -tapaus (phv_tila null/puuttuu) EI kuulu `_neutr`:iin** → heikko fyysinen näytetään punaisena vaikka kypsyyttä ei ole varmennettu (= sama ristiriita kuin kausitavoite-osion "kypsyysdataa ei ole — epävarma").

## 2. Korjaus — kolme tilaa gated-fyysisille (30m/CMJ/MAS), kun taso<3
| Kypsyystila | Ehto | Väri + merkki |
|---|---|---|
| **Mitattu pre-PHV** | `phv_tila` PRE/LAH (tai `onNeutraaliPrePHV`) | 🌱 harmaa + "kehittyy PHV:n jälkeen" (nykyinen, säilyy) |
| **Kypsyys tuntematon (UUSI)** | `phv_tila` puuttuu/null | **himmennetty harmaa (`--ov-3`/`--ink3`) + "kypsyysdataa puuttuu — epävarma"** — EI punainen, EI 🌱-lupaus |
| **Mitattu post-PHV** | `phv_tila` PH/POST/AN | normaali väri (`hhTasoVari`) — heikkous on aito signaali (säilyy) |

**Ydin:** ilman kypsyysdataa emme tiedä onko pre- vai post-PHV → **ei hälytysväriä, mutta ei myöskään "kehittyy PHV:n jälkeen" -lupausta** (se väittäisi pre-PHV:tä). Neutraali/epävarma = arvo näkyy, ei väitettä.

## 3. Toteutus (pieni)
`friv()`:iin kolmiportainen tila (ei enää binäärinen `kypsyysNeutraali`):
```
var preP  = onNeutraaliPrePHV(p) || phv_tila==='PRE' || phv_tila==='LAH';
var eiData = !phv_tila;                              // kypsyys tuntematon
var heikko = gated && taso!=null && taso<3;
var tila = heikko ? (preP ? 'kasvu' : eiData ? 'epavarma' : 'normaali') : 'normaali';
// 'kasvu'   → --ov-3 badge, "🌱 kehittyy PHV:n jälkeen"
// 'epavarma'→ --ov-3/--ink3 badge (himmennetty, EI 🌱), "kypsyysdataa puuttuu"
// 'normaali'→ hhTasoVari(taso)
```
Sama kolmiportainen logiikka **5D-snapshotin D1** + radarin D1 -väriin (nyt `_neut` binäärinen → laajenna 'epavarma'-tilaan himmennetyksi ilman 🌱-lupausta).
**(Valinnainen ikävahti):** jos halutaan, älä epävarmuus-muteta selvästi post-PHV-ikäisiä ilman dataa (esim. ikä ≥16 / ikävaihe 'showcase') → heikko = aito. Oletus ilman vahtia: `eiData → epavarma`. Päätä toteutuksessa; SJK on nuoria → epavarma oikea.

## 4. Invariantit + verifiointi
§28 (kolme kypsyystilaa; ei punaista ilman kypsyysvarmennusta, ei 🌱-lupausta ilman pre-PHV-dataa) · §26 (pikakentät) · §5 (vain sallitut tokenit; himmennys `--ov-3`/`--ink3`) · ei version.json-bumppia · ei Rules-muutosta. **Vitest:** kolme tilaa `friv`-tason logiikalle (erota puhtaaseen apuriin esim. `kypsyysTila(phv_tila, taso, gated)` → 'kasvu'|'epavarma'|'normaali', helppo testata): PRE→kasvu · null→epavarma · POST→normaali · ei-gated→normaali · taso≥3→normaali. **Live-verifio SJK:lla:** heikko-MAS-pelaaja (phv_tila puuttuu) → **ei punainen** vaan himmennetty "kypsyysdataa puuttuu"; ei 🌱-lupausta (koska ei pre-PHV-dataa). Ne 12 heikko-MAS-pelaajaa eivät enää näytä punaista. `npm test` + lint.
