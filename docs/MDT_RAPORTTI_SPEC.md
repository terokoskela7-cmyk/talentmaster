# MDT-raportti / P0b — Raportit (spec)

> Scoping 2026-06-18 (Tero). Benchmark-pohjainen (VP_BENCHMARK_JA_TOIMENPITEET.md P0b): yhden sivun **MDT-profiili**
> (signs + samples + SEO) + **kolme raporttiskiniä yhdestä datasta** + PDF. Placement = **A: uusi Raportit-alanäkymä**.
> Vaiheistettu: **P0b-1** = MDT-profiili + johtaja- & valmentaja-skinit + PDF. **P0b-2** = vanhempi-skini (§7.22) omana kierroksena.
> Periaate: **"data-informed, not data-driven"** — erimielisyys lähteiden välillä on arvo, ei verdiktiä. Carbon (§5), string concat (§7.1), §17.

---

## 1. SIJAINTI & RAKENNE (A)

Raportit-välilehteen **pelaajavalitsin** → koko ruudun **yhden sivun MDT-profiili**. Erillään syvänäkymästä (selaus) — tämä on
*tuotettava/esitettävä raportti*. Lukee pikakentät (§26), **ei alikokoelmakyselyjä**. Layout (hyväksytty mockup):

```
[ Header: nimi · joukkue · ikä · viim.testi · PHV-chip · RAE-chip · TALENTTI-badge ]
[ Skin-toggle: Johtaja | Valmentaja | (Vanhempi=P0b-2) ]
[ Legenda: signs · samples · SEO ]
[ Signs (objektiivinen) | Samples (TASO ottelu) | SEO (pelihavainto) ]  ← 3-lähdekaista, värikoodattu
[ Erimielisyyspalkki: nostaa ristiriidan → "vahvista pelitilanteessa" ]
[ 5D-profiili (D1–D5 palkit, FA 4-corner -superset) ]
[ Skinikohtainen paneeli ]
[ Vie PDF · MDT-palaveritila ]
```

## 2. KOLME LÄHDETTÄ (data-tietoinen, §29 "näytä mitä on")

- **Signs (objektiivinen, teal):** D1 fyysinen (osaindeksit), D2 tekninen (TKI/H-H), FLEI, PHV/bio-ikä. Pikakentät.
- **Samples (otteludata, amber):** TASO `pelidata` (minuutit, arvosana). Pilotissa usein tyhjä → "Ei otteludataa vielä".
- **SEO (subjektiivinen, purple):** pelihavainto `adar_viimeisin` (D4 + a/d/ac/r), `adar_havaintoja`. <3 hav. → "epävarma".
- **Erimielisyys:** kun ≥2 lähdettä eroaa (esim. signs vahva tekniikka + SEO niukka/ei samplesia) → nosta tekstinä. Ei verdiktiä.

## 3. TALENTTISIGNAALIT (Hidden Gem / X-Factor) — johtajaskini

Olemassa olevista funktioista: `_onTalenttisuositus(p)`, `laskeHiddenGem(p)` (→ dHG/fleiHG), `p.signaali==='xfactor'`,
`_hgBadge(p)`, `tekninen_varhaiskehitys`-pikakenttä (§28).
- **Header-badge:** `✦ X-Factor` / `💎 Hidden Gem (vaihe)` kun talenttisuositus.
- **Johtajaskinin talenttikaista:** X-Factor (mikä testi taso 5) · Hidden Gem **vaiheineen** (ehdokas → vahvistettu (PHV) →
  varhaiskehitys vahvistettu (tekniikkamitali U8–12)) + **§28-perustelu** ("korkea D2 + matala D1 pre-PHV → fysiikka tulee 2–4 v").
  Kytkeytyy erimielisyyskehykseen (Hidden Gem = signs-ristiriita).

## 4. SKINIT (yksi data, kaksi kehystä — P0b-1)

Header + 3-lähdekaista + erimielisyys + 5D **jaettu kaikille**. Vaihtuu vain alapaneeli:
- **Johtaja:** kalibraatio (3 näkökulmaa D3: valmentaja/VP/pelaaja + kuilu) · RAE/kypsyys-reiluus · **talenttisignaali (§3)** · päätös/muistiinpano-kenttä · MDT-palaveritila.
- **Valmentaja:** vahvuus + kehityskohde (per-laji) · **resepti** (seuraava harjoitusteema, `valitsePaivanHarjoite`/`tki_kehityskohde`) · per-testi-detalji.
- **Vanhempi (P0b-2):** §7.22-suojat — ks. §4b.

## 4b. VANHEMPI-SKINI (P0b-2) — korvaa rungon, ei pelkkä alapaneeli

**Kriittinen:** vanhempi-skini EI näytä numeerista Signs/Samples/SEO-kaistaa eikä 5D-tasopalkkeja (ne ovat tasolukuja → §7.22-rikkomus).
Se **korvaa koko rungon** laadullisella, lapsiturvallisella näkymällä. Periaate: **positiivinen psykologia JA konkreettiset,
selkeästi vahvistettavat asiat** — ei pelkkää lämmintä kannustusta, vaan aidot kehityskohteet myönteisesti kehystettyinä.

Rakenne (hyväksytty mockup):
- **Vahvaa juuri nyt** (vihreä) — 1–2 konkreettista vahvuutta lapsen/vanhemman kielellä (`tki_vahvuus` / vahvin osaindeksi/dimensio / merkki → fraasi).
- **Seuraava askel** (sininen) — **yksi konkreettinen, nimetty kehityskohde** (esim. nopeus/räjähtävyys tai tietty taito, `tki_kehityskohde`/heikoin osaindeksi)
  **positiivisesti + §28** ("kehittyy kasvun myötä, normaali vaihe"). EI koskaan "heikkous"/tasolukua/punaista deltaa.
- **Miten tukea kotona** — **kehityskohteeseen kytketyt täsmätoimet** + autonomiaa tukevat vinkit (Deci & Ryan SDT): kehu yrittämistä
  (Dweck prosessikehu), ilo ennen suoritusta, "mikä oli kivaa?". Konkreettisia, ei geneerisiä.
- **Prosessikehu** (Dweck) — ahkeruus/kehitys, ei lopputulos (data-tietoinen: vain jos käynti-/kehitysdataa).
- **Vie PDF vanhemmalle.**

**INVARIANTIT (§7.22):** ei tasolukuja/percentiilejä · ei vertailua muihin · ei TKI-laskua/punaisia deltoja · ei PHV/RAE:ta paineena ·
vahvuus ENNEN kehityskohdetta · kehityskohde aina saavutettavissa olevana askeleena.
**Sanasto uusiokäyttää Vanhempi_v2:n `TUKIVINKIT` + `rVanhempiTekniikka` (§16)** — sama lapsiturvallinen kehys, ei uutta kieltä.

## 5. PDF

Selain-print-tyylitiedosto (kuten Master A4): `@media print` → Carbon→valkoinen, yksi sivu/pelaaja, aktiivisen skinin sisältö.
**MDT-palaveritila** = sama profiili koko ruudulla (projisoitava reviewissä 4×/kausi), sitten PDF.

## 6. DATA & RAJAT

Pikakentät: `hh_taso`/`d1_taso`/osaindeksit · `tki_viimeisin`/`d2_taso`/`tki_merkki` · `flei_viimeisin` · `phv_tila`/bio ·
`rae_kvartaali` · `adar_viimeisin`/`adar_havaintoja` · `d3_viimeisin.pisteet` (valmentaja/vp/pelaaja) · `signaali` ·
`tekninen_varhaiskehitys` · TASO `pelidata` (kun on). Ei uusia kyselyjä. Kaikki data-tietoinen (tyhjä → siisti tila).

## 7. VERIFIOINTI

- new Function 0 virhettä · npm test vihreä · §17 @media=1 · ei "ADAR"-tekstiä (pelihavainto).
- RUNTIME + LIVE (?cb=, SA): pelaajavalitsin → profiili; signs täyttyy, samples/SEO tyhjä siististi; talentti-badge kun Hidden Gem/X-Factor;
  skin-toggle vaihtaa alapaneelin; PDF-print yhden sivun. Carbon (§5).

## 8. SEKVENSSI

1. Spec + mockup hyväksytty ✅.
2. **P0b-1:** uusi Raportit-alanäkymä + MDT-profiili + johtaja/valmentaja-skinit + talenttisignaalit + PDF.
3. Live-verify.
4. **P0b-2:** vanhempi-skini (§7.22) erikseen.
