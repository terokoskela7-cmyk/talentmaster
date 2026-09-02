# Code-brief — i18n V5 · Master_v16 · **IDP-klusteri Erä 2: Pelaajaraportti + notif sv**

> **Konteksti:** Erä 1 (IDP-editori + toimintakortti + jaksofokus) mergetty ja live-verifioitu. Tämä on klusterin
> jälkimmäinen puoli → **tämän jälkeen Master_v16 on 100 % sv** (koko henkilöstöpinta). Sama malli + **sama pakollinen
> kanoninen sanasto kuin Erä 1:ssä** (Code kääntää kanonista). Staattinen-DOM-vartija + render-kielineutraali jo paikoillaan.

## Skooppi
| Alue | Rivit (n.) | Sisältö |
|---|---|---|
| `_pr*` Pelaajaraportti | **6993–7120** | `_prRaporttiHTML` (7008) · `_prTilaBadge` (7065) · `_prLahde/_prChip/_prRivi` · `_prPaivitaAktiiviset` (7089) — lähde-lohkot, chipit, rivilabelit, tila-badge, aktiiviset tavoitteet |
| `_notif*` | **7773–7800** | `_notifRender` (7795) · `_notifAikaSitten` (7792) · `_notifBadge` — ilmoituslista + aika-sitten-muodot |
| profiili-jäänteet | (guard löytää) | jos Masterissa on coach-profiili-näyttöä (lisenssi/CPD) — aja guard, reititä löytyvät |

**Malli:** dynaaminen render → `masterT(fi)` (§7.1). Aja inline-parse-vahti.

## 🔒 Kanoninen sv-sanasto (Erä 1:n sanasto + nämä)
| fi | sv (kanoni) |
|---|---|
| Pelaajaraportti | **Spelarrapport** (vakiintunut jo koti-kortissa "Öppna Spelarrapport") |
| Lähde (`_prLahde`) | **Källa** |
| Aktiiviset (tavoitteet) | **Aktiva** |
| Kausitavoite · Välitavoite · Jaksofokus | **Säsongsmål · Delmål · Periodfokus** (Erä 1) |
| Havainto · Havainnot | **Observation · Observationer** |
| Mittaus · Testi | **Mätning · Test** |
| Suositus | **Rekommendation** |
| **notif aika-sitten** (`_notifAikaSitten`): | |
| juuri nyt | **just nu** |
| {n} min sitten | **{n} min sedan** |
| {n} t sitten | **{n} tim sedan** |
| {n} pv sitten | **{n} dgr sedan** |
| Ei ilmoituksia | **Inga aviseringar** |
| ilmoitus / ilmoitukset | **avisering / aviseringar** |
| Lisenssi · CPD-tunnit · Koulutukset (jos profiili) | **Licens · CPD-timmar · Utbildningar** |
| Lyhenteet (TKI/H-H/TSI/PHV/D1–D5/CPD/ADAR/RPE) | **ennallaan** |

> **⚠️ aika-sitten-templatet (§6):** interpoloidut → placeholder + `.replace` (`masterT('{n} min sitten').replace('{n}', x)`).
> Yksikkölyhenteet sv: min·**tim**·**dgr** (ei "t"/"pv"). Tarkista `_notifAikaSitten`-haaralogiikka: **kynnysvertailut
> (sekunnit/minuutit numeroina) pysyvät koodissa**, vain näyttömuoto reititetään.

## §1 tila-badge (`_prTilaBadge`, rivi 7065) — näyttö vs enum
Raportin tila-enum (esim. `'luonnos'/'valmis'/'jaettu'`) — **koodivertailu pysyy fi**, vain näyttölabel reititetään
display-mapilla (luonnos→**Utkast** · valmis→**Klar** · jaettu→**Delad**; tuntematon → fi-fallback). ÄLÄ data-i18n:iä raakaan enumiin (§5.1 case-sensitiivisyys).

## ⛔ ÄLÄ reititä
Raportti-tila/lähde-**enumit** koodivertailuissa · `pelaajaId`/id:t · SMART-arvot · demo-nimet · Firestore-arvot.
Tuotetermit + lyhenteet verbatim. §7 lib-teksti fi. Demo (§3) fi.

## Portit + DoD (Erä 2) → Master_v16 100 % sv
- Pelaajaraportti + notif sv-tilassa 100 % ruotsiksi; §6 aika-templatet placeholderilla; §1 tila-badge display-map.
- Uudet avaimet dup-checkillä → `?v` +1. Kanoninen sanasto eksaktisti.
- **Koko Master-guard vihreä ilman allowlist-poikkeuksia** (IDP-klusteri ei enää lykätty → poista allowlist-rajaukset molemmista vartijoista).
- C1 ∅ · dup 0 · lint 0 · suite vihreä · fi-regressio ehjä · inline-parse 0.

## Verifiointi (Claude) → koko Master live 100 % sv
1. Live: avaa Pelaajaraportti + ilmoituskello sv-tilassa → 0 fi-avainta.
2. **Täysi Master-DOM-skanni 11 työtilaa + IDP-editori + Pelaajaraportti + notif → 0 näkyvää fi-avainta (ei enää allowlist-poikkeuksia).**
3. §6 aika-templatet (min/tim/dgr sedan) · §1 tila-badge · C1 · dup 0 · lint · suite.

## Seuraava (Erä 2:n jälkeen)
Master_v16 valmis → **Raita C: Seura.html** sv-wiraus (viimeinen henkilöstösivu; Kimin SEURA-kartta + riskilista repossa) tai **en-kerros (Vaihe 9)**.
