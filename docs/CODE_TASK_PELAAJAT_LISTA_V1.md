# Code-tehtävä: V1 — Pelaajat-lista IDP-ohjaavaksi (rikastus, VP_v25)

> Lähde: co-design 2026-07-03 (Claude + Tero). Osa selkärankaa: **docs/VISIO_PELAAJAKEHITYKSEN_SELKARANKA.md** (V1). Rajaus: VP_v25 Pelaajat-välilehti (`renderPelaajatFiltered` ~6112, taulukko-header ~1965, `filterPlayers` ~9857). **Puhdas lukunäkymä — kaikki pikakentistä (§26), EI uutta datamallia, EI ehdotusmoottoria (se on V2).** §5 tokenit, §7.22 ei koske (VP-facing).

## Tausta
Lista on nyt passiivinen tuloslista (sarakkeet Pelaaja/Joukkue/Valmius/Tekninen/H-H/Signaali/PHV). Ohjaava IDP-data on jo pikakentissä mutta piilossa. V1 = rikasta lista → **KUKA kaipaa huomiota + MIKÄ fokus + IDP-elinkaari**, matala riski.

## Muutokset

### 1. Kehitysfokus-sarake (uusi)
Header (~1965): lisää `<th>Kehitysfokus</th>` (Signaalin viereen). Rivi (`renderPelaajatFiltered`): näytä **tarkka** kehityskohde pikakentästä — prioriteetti `tki_kehityskohde` (D2) → `hh_kehityskohde` (D1). Näyttönimi olemassa olevalla mäppäyksellä (`_vpTkLaji` / `TK_LAJI_NIMET`) + dimensio-merkki, esim. "Syöttö · D2", "Nopeus · D1". Tyhjä → "—". Korvaa geneerisen "Kehityskohde"-signaalin (siirtyy tähän tarkkana).

### 2. Signaali-sarake → vain talenttisignaalit
Signaali-solu näyttää nyt **vain** Hidden Gem / X-Factor / Underdog (`signaali`-kenttä + underdog-logiikka jo olemassa). Geneerinen "Kehityskohde"-lappu **pois** (tieto on nyt Kehitysfokus-sarakkeessa). Tyhjä → "—".

### 3. IDP-sarake (uusi) — elinkaari + reititys
Header: lisää `<th>IDP</th>`. Rivi: lue `idp_tila` (+ `idp_jono`) pikakentästä →
- puuttuu / null → nappi **"Ehdota"** (avaa olemassa oleva IDP-flow: pelaajakortti / IDP_Kortti_v4 / idp_kausi-luonti).
- `'ehdotettu'` → nappi **"Hyväksy →"** (amber).
- `'aktiivinen'` → **"Aktiivinen · X/Y"** (teal, tavoitteiden edistymä jos saatavilla, muuten pelkkä "Aktiivinen").
- Hidden Gem -pelaaja ilman IDP:tä → **"Talentti-IDP"**.
**EI ehdotusmoottoria** (datasta johdettu tavoite = V2) — V1 näyttää TILAN ja REITITTÄÄ olemassa oleviin IDP-näkymiin.

### 4. Suodattimet → IDP-elinkaari
`filterPlayers` (~9857) + napit (~1950–1958): olemassa jo `idppuuttuu`, `talenttisuositus`, `underdog`, `erityistuki`(Kehityskohde), `phv`, `siirtopaatos`, `bq1/bq4`. **Lisää:** `idp_ehdotettu` ("Ehdotettu · hyväksy") + `idp_aktiivinen` ("Aktiivinen") jos `idp_tila`-dataa on. (Jos `idp_tila` puuttuu kaikilta → jätä napit pois tai näytä disabloituna — Coden harkinta, dokumentoi.)

### 5. Rivi klikkaus → pelaajakortti
Rivin klikkaus avaa `_avaaPerPelaajaPikakatsaus` (kortti-porautuminen, jo olemassa PR #76:n jälkeen). Toiminto-napit (✏️/→) säilyvät.

## Reuse / rajaus
- ♻️ Kaikki pikakentistä (§26, ei alikokoelmakyselyjä): `tki_kehityskohde`/`hh_kehityskohde`/`signaali`/`idp_tila`/`idp_jono`/`rae_kvartaali`/`phv_tila`. Näyttönimet `_vpTkLaji`/`TK_LAJI_NIMET`.
- 🚫 EI: ehdotusmoottoria (V2), IDP-elinkaaren kirjoitusta (V3), uutta datamallia. Napit reitittävät olemassa oleviin näkymiin.
- §5 app-tokenit. version.json auto-bump mainissa (HTML-only, ei käsin bumppia, ei lib-?v:tä).

## Verify
- Live (SA, SJK+Sibbo): Kehitysfokus näyttää tarkan kohteen ("Syöttö · D2") ei geneeristä; Signaali vain Gem/X-Factor/Underdog; IDP-sarake tilat + napit; suodattimet toimivat; rivi → pelaajakortti aukeaa. Mobiili (§6): taulukko ei riko (harkitse sarakkeiden priorisointia kapealla — Kehitysfokus + IDP tärkeimmät).
- `npm run lint` clean (VP inline-syntaksi).
