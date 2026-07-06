# Fyysinen / Tekninen — datan syväanalyysi (per-pelaaja) + per-testi-radar

> Lähde: co-design 2026-07-05 (Tero + Claude). Aloitusnäkymä-uudistus (PR #100) teki yleiskuvasta selkeän; nyt **syvä data saa yhtenäisen kodin** Fyysinen/Tekninen-välilehdillä. Kohde: `TalentMaster_VP_v25.html` `_avaaPerPelaajaPikakatsaus` Fyysinen + Tekninen -tabit. §26 · §28 · §29 · §30 · §34 · §5. Mockup: `docs/mockups/fys_syvaanalyysi_mockup.html`.

## 1. Ydin
Nyt per-pelaajan syväanalyysi on hajallaan (Master detail-paneelit §29, VP joukkue-syvänäkymä §19). Tehdään **Fyysinen- ja Tekninen-välilehdistä yksilön datan syväanalyysin koti**: oletuksena summapalkit (selkeä), `▸ Syväanalyysi` paljastaa syvyyden. Sisältää **per-testi-radarin** (Teron pyyntö: näkee tason nopeasti).

## 2. Per-testi-radar (Fyysinen + Tekninen) — UUSI IDP-kortissa
Pelaajalla on jo D1–D5-radar (dimensiot). **Lisää per-testi-radar** joka näyttää yksittäisten testien tason yhdellä silmäyksellä (kuten VP joukkue-syvänäkymän `tavoiteRadarAkselit`, mutta **per-pelaaja**):
- **Fyysinen:** akselit 10m · 30m · CMJ · MAS · kasirata (Eerikkilä-taso 1–5). Tavoiteviiva = **ikäluokan keskitaso (taso 3)**. Pelaajan arvo vs tavoite.
- **Tekninen:** akselit SM-juoksu · SM-pallo · (+ TK-lajit jos dataa) · syöttö · pujottelu. Tavoite = taso 3 / TKI ≥ 60.
- **§28-neutraali:** gated-fyysiset (30m/CMJ/MAS) ilman PHV-dataa → himmennetty akseli ("kypsyysdataa puuttuu"), ei punaista (sama `kypsyysTila`-logiikka kuin palkeissa).
- Reuse: `_tmRadar5D` + `tavoiteRadarAkselit` (VP_v25 §19) — yleistä per-pelaaja-arvoille. Selite: "● pelaaja · – – tavoite (taso 3)".

## 3. Syväanalyysin sisältö (`▸ Syväanalyysi` -takana)
**Fyysinen-välilehti:**
- Per-testi-radar (§2) + per-testi normivertailu (Eerikkilä `eerikkilaNormiarvo` §29, "Normi"-sarake).
- **Sub-indeksit (§30, koodi valmis `docs/testit_indeksit.js`):** EI (CMJ−SJ), FVP (5m/30m-suhde → nopeus/voima), VNE-profiili. Näytä kun data riittää; muuten "vaatii SJ/5m".
- **Kehitysvauhti/DVI (§29):** hh_taso_edellinen → delta + suunta (2. mittauksesta).
- MAS syväanalyysi + harjoitteluvyöhykkeet (jo olemassa, siirtyy tänne "Näytä lisää"-tilalta).

**Tekninen-välilehti:**
- Per-testi-radar (§2, tekniset akselit) + TSI (`sm_pallo − sm_juoksu`, §21-väri).
- **Per-laji-sekuntibudjetti + eliittiviite (§34):** `tkSekuntibudjetti`/`tkLajiViite` — "lähellä merkkiä", gap sekunteina.
- TKI-kehitysvauhti (abs-parannus + normivauhti erikseen, §3.2 — abs+ ei punainen).

## 4. Rakenne / progressiivinen paljastus
Oletus = summapalkit + per-testi-radar (heti näkyvä, koska "näkee tason nopeasti"). `▸ Syväanalyysi` = sub-indeksit + normivertailu + kehitysvauhti + budjetti. Ei kaikkea auki kerralla (§ aloitusnäkymä-periaate).

## 5. Invariantit + verifiointi
§26 (kaikki pikakentistä: `hh_viimeisin`/`tki_*`/`tk_lajit_viimeisin`/`hh_taso_edellinen`; ei alikokoelmakyselyjä) · §28 (per-testi-radar + palkit kypsyysneutraalit — `kypsyysTila`) · §29/§30/§34 (olemassa olevat funktiot, ei uutta laskentaa — EI/FVP/VNE/sekuntibudjetti/normiarvo) · §5 tokenit · §7.22 ei koske (VP-aikuisnäkymä) · ei version.json-bumppia · ei Rules-muutosta. **Ei uutta dataa.** Live-verifio VP_v25 SJK: Fyysinen-välilehti näyttää per-testi-radarin (Vilma: 10m 3 · 30m 3 · CMJ 4 · MAS epävarma · kasirata) + tavoiteviiva; `▸ Syväanalyysi` avaa sub-indeksit; §28 ei punaista. `npm test` + lint.

## 6. Riippuvuus
Rakennetaan **kypsyyskorjauksen (`kypsyysTila`) mergen jälkeen** — per-testi-radar käyttää samaa §28-logiikkaa. Vaiheistus: (A) per-testi-radar Fyysinen+Tekninen (näkyvä arvo heti) → (B) `▸ Syväanalyysi` sub-indeksit/budjetti/normivertailu/kehitysvauhti.
