# Kehitystyön selkeät vaiheet — IDP / pelaajakehityksen selkäranka (konsolidoitu)

> Lähde: co-design 2026-07-03. **Tämä on yksi totuuslähde vaihejärjestykselle** — kokoaa hajanaiset suunnitelmat. Muut docit = syvennykset: `VISIO_PELAAJAKEHITYKSEN_SELKARANKA.md` · `IDP_KORTTI_MAAILMANLUOKKA.md` · `IDP_YDIN_SPEC.md` · `PALLOLIITTO_PELAAJAKORTTI_TAKSONOMIA.md`.

## Periaate (Teron linjaus)
Yksilövaiheessa **ensin arvioidaan ominaisuudet** (mitattu + havaittu, Palloliitto-taksonomia + ADAR) ja **kehitetään yksilön teknis-taktisia ominaisuuksia**. Kausitavoite ja 2–5 v polku ovat perusta. **Pelipaikkakohtaiset pelihavainto-KPI:t (ottelu/TASO) pidetään TAUSTALLA** — ne tulevat myöhemmin kun yksilövaihe on kunnossa.

## Perusta — TEHTY tässä sessiossa ✅
Pelaaja-modaali kaksisarakkeiseksi (PR #76) · radar Fyysinen/Tekninen-toggle + kohortti-vakautus (PR #72) · ketteryys/suunnanmuutos-osaindeksit (PR #74) · datan tuoreus (PR #66).

## Vaihejärjestys (riippuvuudet → tässä järjestyksessä)

### Vaihe 1 — Pelaajalista IDP-ohjaavaksi 🔨 CODE TEKEE NYT
Fokus + signaali + IDP-tila-sarake, elinkaari-suodattimet, rivi → pelaajakortti. Lukee pikakentistä. Brief: `CODE_TASK_PELAAJAT_LISTA_V1.md`.

### Vaihe 2 — Ominaisuusarviointi: Palloliitto-taksonomia (mitattu + havaittu + ADAR) ⭐ SEURAAVA
**Yksilövaiheen ydin: "ensin arvioida ominaisuudet."** Renderöi Palloliiton koko taksonomia (1–5) TM:n 5D-profiiliin:
- **Mitattu** (TM-testit) niissä kohteissa jotka testataan (nopeus, ketteryys, CMJ, MAS, TKI-tekniikka).
- **Havaittu** (VP/valmentaja arvioi 1–5 + **ADAR-pelihavainto**) niissä joita ei testata (peliäly, psyyke, ball control pelissä, puolustustaidot).
- Sama 1–5, lähde merkitään (mitattu/havaittu). Perustietoihin: vahvempi jalka + toissijainen pelipaikka.
Tämä tuottaa täyden 4-corner/5D-profiilin → kaiken muun pohja.

### Vaihe 3 — Kausitavoite (IDP-ydin) — rakentuu Vaihe 2:n päälle
Heikoin ominaisuus (mitattu TAI havaittu) → **strukturoitu tavoite** (kohde+mittari+aikaraami+70/30+pelaajan ääni) + **review-sykli** (pelaaja johtaa, DVI). Spec: `IDP_YDIN_SPEC.md`.

### Vaihe 4 — Yksilön teknis-taktinen kehitys (Palloliitto corner) — "ominaisuuksien kehittäminen"
D2 tekninen + D4 peliäly -corner: Palloliiton teknis-taktiset kohteet → kehitysfokus + harjoitecue (valmentaja omistaa kenttäsession). ADAR-havainnot syöttävät tähän. Tämä on yksilön teknis-taktisen kehittämisen näkymä.

### Vaihe 5 — 2–5 v kypsyyspolku — kausitavoite = askel tässä
Kypsyysankkuroitu (PHV) polku, Palloliiton U13→U15→U17-vaatimusrima taktisena rimana. Kausitavoite sijoittuu nykyvaiheeseen. Kuvattu: `IDP_KORTTI_MAAILMANLUOKKA.md §5.5`.

### Vaihe 6 — Pelipaikkakohtaiset pelihavainto-KPI:t (TASO/pelidata) 🕓 TAUSTALLA (myöhemmin)
Kun yksilövaihe kunnossa + pelipaikka selvä: ottelu-KPI:t (avaussyöttö-% jne., `Pelihavainto_Palloliitto.html`) TASO-tuonnista → position-profiili. **Ei nyt.**

### Vaihe 7 — Potentiaali + maajoukkuepolku + kansallinen koonti 🕓 MYÖHEMMIN
Player Potential (1–5★ liigakatto) + maajoukkuepolku + Palloliitto-tason aggregaatti (`palloliitto/ohjelmat`, GDPR §33 B4).

## Foreground vs. background (selkeys)
- **NYT–SEURAAVAT:** Vaihe 1 (Code) → Vaihe 2 (ominaisuusarviointi) → Vaihe 3 (kausitavoite) → Vaihe 4 (teknis-taktinen kehitys) → Vaihe 5 (2–5 v polku).
- **TAUSTALLA (ei vielä):** Vaihe 6 (pelihavainto-KPI/ottelu), Vaihe 7 (potentiaali/kansallinen).

## Invariantit (kaikki vaiheet)
Metodologia ennallaan (Eerikkilä/MyE.Way/TKI/PHV) · Palloliitto-taksonomia = standardi (ei omaa) · §7.22 (lapsi/perhe turvallinen; havaittu arvio aikuisten työkalu) · valmentaja omistaa kentän · §26 pikakentät · §5 tokenit · GDPR §33.
