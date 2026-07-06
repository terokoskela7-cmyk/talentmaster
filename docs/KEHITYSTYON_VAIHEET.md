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

## Syväanalyysi + aukot — VP/valmentaja-näkymän täydellisyys (kirjattu 2026-07-05)
> Kysymys: "onko syvä data-analyysi riittävää VP:lle ja valmentajalle?" → data-read riittää, mutta *riittävyys* vaatii muutakin kuin lisää dataa. Viisi aukkoa vipuvoiman mukaan:

1. **Toiminnan kerros (SUURIN VIPU — valmentaja).** Data → tulkinta → **konsepti → cue → harjoite**. Nyt diagnoosi ilman reseptiä. = **Vaihe 4** (teknis-taktinen curriculum, datamalli jo suunniteltu `DATAMALLI_TEKNISTAKTINEN.md`). Tekee datasta toimintaa.
2. **Pitkittäistrendi.** Nyt kehitysvauhti = 2 pisteen delta. Talentille monen mittauksen trendi ajassa (testitason kehityskaari, kaudet). Rakennuspalikat §30-longitudinaalikoonti; ei vielä yksilönäkymässä.
3. **5D-tasapaino.** Syväanalyysi D1/D2-painotteinen. **D4 peliäly** (pelihavainto lepotilassa) + **D3 psyyke** (itsearvio, ks. §D3-ilmoitus alla) tarvitsevat saman syvyyden. Muuten kokonaiskuva vino.
4. **Kuorma + kasvu (valmentaja, biologinen).** `kasvutahti ≥7,2 cm/v` = loukkaantumisriski (§25) · kuorma/dropout (§35 K5). §28-kytketty, ei vielä pinnalla.
5. **Talent-signaalit (VP).** Hidden Gem · X-Factor · kultaikkuna (§28/§30) — VP:n päätöksenteon ydin; osin signaalichippeinä, ei syväanalyysiin integroituna.

**Rakennusjärjestys:** (a) **fys/tek syväanalyysi + per-testi-radar** (`CODE_TASK_FYS_TEK_SYVAANALYYSI.md`, selkeä voitto — Code seuraavaksi kypsyyskorjauksen mergen jälkeen) → (b) **D3-itsearvio-ilmoitus** (pieni, korjaa löydetyn aukon: Selina teki D3-itsearvion, valmentaja/VP eivät saa ilmoitusta → VP-signaali + Master-inbox "D3-itsearvio odottaa kalibrointia" kun `d3_varmuus='itsearvio'`, §26-johdettu) → (c) **Vaihe 4** (toiminnan kerros #1). Aukot 2/4/5 kytkeytyvät Vaihe 4/5/6-työhön; pidetään mukana.

## Invariantit (kaikki vaiheet)
Metodologia ennallaan (Eerikkilä/MyE.Way/TKI/PHV) · Palloliitto-taksonomia = standardi (ei omaa) · §7.22 (lapsi/perhe turvallinen; havaittu arvio aikuisten työkalu) · valmentaja omistaa kentän · §26 pikakentät · §5 tokenit · GDPR §33.
