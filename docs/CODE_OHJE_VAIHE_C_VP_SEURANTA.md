# CODE_OHJE — Vaihe C: VP-seurantanäkymä (nojaa olemassa olevaan valmentajan korttiin)

**Tyyppi:** näyttö + kevyt data (kuittaus) · **Kohde:** `TalentMaster_VP_v25.html` · **Base:** `main`.
**Design-referenssi:** `tm_vp_seuranta_v2.html` (paneeli 1 · VP-seuranta + hälytykset).
**Riippuvuus:** ei koodiriippuvuutta B:hen; ristiinarvio (#273) ja tämä ovat erillisiä.

## ⚠️ MUISTUTUS — järjestelmässä ON JO valmentajan kortti. ÄLÄ rakenna uutta.

VP_v25:ssä (~rivi 9820, valmentajamodaali, tabit PROFIILI / **VAI+** / HARJOITUSLAATU / MENTOROINTI /
KALIBRAATIO) on jo:
- **VAI+ Aktiivisuusindeksi** `vd.vai` (0–100, painot: `vd.adar` Pelihavainto 30% · `vd.kaynti` Käynnit 20% ·
  `vd.harjoittelu` Harjoittelu 20% · `vd.kontakti` Kontakti 15% · `vd.kehitys` Kehitys 15%).
- **Hälytysliput** `halHtml` (🔴 Ei havaintoja 30pv · 🔴 Ei kirjautunut 30pv · 🟡 Vähän käyntejä) — hiljaisuus-
  hälytyksen **logiikka on jo olemassa**.
- Tilat: `v.viimKirjaus`, `v.harjoituksia`, `v.adar`; Joukkueen kehitys `vd.kehitysInfo`.

**Vaihe C = koostaa nämä VP:n yhteisnäkymäksi + lisää IDP-feed & kuittaus.** Käytä uudelleen `vd.vai`:n ja
`halHtml`:n laskenta (nosta jaettuun apufunktioon jos se on inline modaalissa) — ei uutta aktiivisuusmittaria.

## Työ

### 1. Valmentajaroster (koonti) — uusi VP-seurantanäkymä/-osio
Lista seuran valmentajista: nimi · joukkue · **VAI+ indeksi** (`vd.vai` + väri) · tila-dot (🟢/🟡/⚫ vai:sta) ·
aktiiviset hälytysliput (`halHtml`-logiikasta) · viim. kirjaus. **Rivi → drill-in olemassa olevaan valmentajan
korttiin** (avaa modaali VAI+-tabille). Design map v2 paneeli 1 "Aktiivisuus"-taulu, mutta luvut tulevat
olemassa olevasta VAI+-laskennasta. Lajittele: hälyttävät ensin (⚫/matala vai ylimmäs).

### 2. Hälytykset + VP-kuittaus (uusi — tämä puuttuu järjestelmästä)
- Nosta valmentajien aktiiviset hälytykset (🔴 Ei havaintoja 30pv · 🔴 Ei kirjautunut 30pv · 🟡 Vähän käyntejä)
  seurannan yläosaan omana listana (design v2 "🔔 Hälytykset").
- **Kuittaus:** "Kuittaa"-nappi per hälytys. Kuittaus tallentuu **audit-jälkenä** (EI hard-delete, §-linja) —
  esim. `seurat/{sid}/seuranta_kuittaukset/{id}` tai valmentajadokumentin `hälytys_kuitattu[]`:
  `{ tyyppi, valmentaja_uid, kuittaaja_uid, pvm }`. Kuitattu hälytys **poistuu aktiivilistalta** mutta jää
  audittiin. Kuittaus on **VP/johto-oikeus** (onJohtoRooli); rules-blokki tarvittaessa (ei hard-delete).
- Kuittaus **ei muuta valmentajan toimintaa** — pelkkä "VP tietää ja toimii" -merkintä (ei porttia).

### 3. IDP-aktivoinnit-feed (uusi)
VP näkee kun IDP-kortti aktivoidaan. Lähde: pelaajien IDP-pikakentät (`idp_sitoumus_pvm` / `idp_tila` /
`idp_fokus` / kausitavoite) — poimi viimeisimmät aktivoinnit (esim. 7–14 vrk) → feed: "Valmentaja X aktivoi
IDP · Pelaaja Y (joukkue) · tavoite · aika", tuoreimmat badge "Uusi". Rivi → pelaajakortti (drill-in).
- Jos aktivointihetkeä ei ole suoraan pikakentässä, käytä olemassa olevaa `idp_sitoumus_pvm`:ää /
  kausitavoitteen pvm:ää. Ei uutta raskasta lokia — lue pikakentistä.

### 4. Sijoitus
VP_v25:n olemassa olevaan valmentajien listaan/näkymään (siihen mistä valmentajakortti jo avataan) omana
osiona/tabina "Seuranta". Ei uutta appia. **Read-only oversight** (paitsi kuittaus).

## Reunaehdot

- **Nojaa olemassa olevaan:** VAI+ indeksi + hälytyslogiikka uudelleenkäytetään (`vd.vai`, `halHtml`) — ei
  rinnakkaista mittaria. Jos ne ovat inline modaalissa, refaktoroi pieneen apufunktioon jaettavaksi.
- **Ei porttia** valmentajalle: seuranta + kuittaus on VP:n oversight, ei estä valmentajan työtä (§ "nothing forced").
- **Kuittaus = audit, ei hard-delete** (§-linja). Kuittaus VP/johto-oikeus.
- **Drill-in yhteen määränpäähän:** valmentajarivi → valmentajakortti; IDP-rivi → pelaajakortti.
- **Design-lukko + molemmat teemat** (map v2). §7.22 ei relevantti (VP-näkymä, ei pelaajalle).
- **`?v=`-bump** jos jaettua libiä muutetaan (todennäköisesti vain VP_v25 sisäinen).

## Definition of Done

- **L1:** valmentajaroster (VAI+ indeksi + hälytysliput + tila-dot + drill-in korttiin, uudelleenkäyttäen
  olemassa olevaa laskentaa); hälytyslista + VP-kuittaus (audit, ei hard-delete, johto-oikeus); IDP-aktivoinnit-
  feed (pikakentistä); sijoitus VP_v25:n valmentajanäkymään. EI uutta aktiivisuusmittaria.
- **L2:** vitest kuittaus-/koonti-logiikalle (esim. hälyttävien lajittelu, kuitatun suodatus aktiivilistalta,
  IDP-feedin poiminta pikakentistä). Rules-testi kuittauksen kirjoitusoikeudelle (VP/johto, ei valmentaja,
  ei hard-delete) jos rules-blokki lisätään. ~828+ vihreä.
- **L3 (elävä, VP-sessio):**
  - Seurantanäkymä listaa valmentajat VAI+ indeksillä + hälytyslipuilla; hälyttävät ensin.
  - Hälytyksen "Kuittaa" → poistuu aktiivilistalta, jää audittiin; toinen VP näkee kuittauksen.
  - IDP-aktivoinnit-feed näyttää tuoreet aktivoinnit; rivi avaa pelaajakortin.
  - Valmentajarivi avaa olemassa olevan valmentajakortin (VAI+-tab).
  - Molemmat teemat.
- Verifioi elävänä; lataa VP uudelleen deployn jälkeen.

## Ketjun tila
- A ✅ · B ✅ (L1+L2, L3 Teron live-kuittaus) · **C (tämä)** · sitten **Trendi Vaihe 2** (Kehityskaari).
